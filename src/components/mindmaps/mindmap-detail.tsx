"use client";

import { ArrowLeft, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { editMindmap } from "@/app/actions/mindmaps";
import { DocumentsNav } from "@/components/documents/documents-nav";
import { DeleteMindmapDialog } from "@/components/mindmaps/delete-mindmap-dialog";
import { EditMindmapTitleDialog } from "@/components/mindmaps/edit-mindmap-title-dialog";
import { LazyMindmapCanvas } from "@/components/mindmaps/lazy-mindmap-canvas";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { DocumentListItem } from "@/features/documents/types";
import type { MindmapGraph } from "@/features/mindmaps/types";
import { ensureRootNode, parseMindmapGraph } from "@/features/mindmaps/utils";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
import { getSubjectDocumentsHref } from "@/lib/navigation/detail-page-back-link";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";
import type { MindmapEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface MindmapDetailProps {
  backHref: string;
  mindmap: MindmapEntity;
  documents: DocumentListItem[];
}

const AUTOSAVE_DELAY_MS = 800;

export function MindmapDetail({
  backHref,
  mindmap,
  documents,
}: Readonly<MindmapDetailProps>) {
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const initialGraph = useRef(
    ensureRootNode(parseMindmapGraph(mindmap.data), mindmap.title),
  ).current;
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(mindmap.title);
  const [graph, setGraph] = useState<MindmapGraph>(initialGraph);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef(
    JSON.stringify({ title: mindmap.title, data: initialGraph }),
  );
  const saveSequenceRef = useRef(0);

  const debouncedTitle = useDebouncedValue(title, AUTOSAVE_DELAY_MS);
  const debouncedGraph = useDebouncedValue(graph, AUTOSAVE_DELAY_MS);

  const currentSnapshot = JSON.stringify({ title, data: graph });
  const isDirty = currentSnapshot !== lastSavedRef.current;
  useBeforeUnload(isDirty || isSaving);

  const save = useCallback(
    async (nextTitle: string, nextGraph: MindmapGraph) => {
      const snapshot = JSON.stringify({ title: nextTitle, data: nextGraph });
      if (snapshot === lastSavedRef.current || nextTitle.trim().length === 0) {
        return;
      }

      const saveSequence = saveSequenceRef.current + 1;
      saveSequenceRef.current = saveSequence;
      setIsSaving(true);

      const result = await editMindmap({
        id: mindmap.id,
        title: nextTitle,
        data: JSON.stringify(nextGraph),
      });

      if (saveSequence !== saveSequenceRef.current) {
        return;
      }

      setIsSaving(false);

      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }

      lastSavedRef.current = snapshot;
    },
    [mindmap.id],
  );

  useEffect(() => {
    void save(debouncedTitle, debouncedGraph);
  }, [debouncedTitle, debouncedGraph, save]);

  async function saveBeforeNavigation(
    href: string,
    event: MouseEvent<HTMLAnchorElement>,
  ) {
    event.preventDefault();
    await save(title, graph);
    startNavTransition(() => router.push(href));
  }

  const sidebarDocuments = documents.map((item) =>
    item.kind === "mindmap" && item.id === mindmap.id
      ? { ...item, title: title || item.title }
      : item,
  );

  return (
    <AppPageContainer
      maxWidth="7xl"
      className="lg:flex lg:h-[calc(100svh-4rem)] lg:flex-col lg:overflow-hidden lg:pb-6"
    >
      <div className="mb-4 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Back to Subject
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <DocumentsNav
          subjectId={mindmap.subjectId}
          documents={sidebarDocuments}
          activeId={mindmap.id}
          activeKind="mindmap"
          onNavigate={(href, event) => void saveBeforeNavigation(href, event)}
          onEditActive={() => setEditOpen(true)}
          onDeleteActive={() => setDeleteOpen(true)}
        />

        <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
          <div className="mb-4 flex shrink-0 items-center gap-2">
            <Input
              ref={titleInputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label="Mindmap title"
              placeholder="Untitled mindmap"
              className="h-10 min-w-0 flex-1 rounded-md border-0 bg-transparent px-3 text-lg font-semibold tracking-tight shadow-none hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-xl"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0"
                  aria-label="Open mindmap actions"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* React Flow sizes itself with height:100%, which resolves to 0 when
              the parent only has a min-height. Use an explicit height on mobile;
              on lg the flex column chain provides the height. */}
          <div className="h-[60svh] flex-1 overflow-hidden rounded-lg border border-border lg:h-auto lg:min-h-0">
            <LazyMindmapCanvas
              initialGraph={initialGraph}
              title={title}
              onTitleChange={setTitle}
              onGraphChange={setGraph}
            />
          </div>
        </div>
      </div>

      <DeleteMindmapDialog
        mindmapId={mindmap.id}
        mindmapTitle={title || mindmap.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => {
          setDeleteOpen(false);
          startNavTransition(() =>
            router.push(getSubjectDocumentsHref(mindmap.subjectId)),
          );
        }}
      />
      <EditMindmapTitleDialog
        mindmap={{ id: mindmap.id, title }}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={(newTitle) => {
          setTitle(newTitle);
          setEditOpen(false);
        }}
      />
    </AppPageContainer>
  );
}
