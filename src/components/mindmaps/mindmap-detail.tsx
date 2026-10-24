"use client";

import { ImageDown, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { editMindmap } from "@/app/actions/mindmaps";
import { AssistantSurfaceHost } from "@/components/assistant/assistant-surface-host";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import {
  buildDocumentContext,
  describeMindmapGraph,
} from "@/components/assistant/study-context-content";
import { useStudyContext } from "@/components/assistant/use-study-context";
import { DocumentAutosaveFeedback } from "@/components/documents/document-autosave-feedback";
import { ZenModeToggle } from "@/components/documents/zen-mode-toggle";
import { DeleteMindmapDialog } from "@/components/mindmaps/delete-mindmap-dialog";
import { EditMindmapTitleDialog } from "@/components/mindmaps/edit-mindmap-title-dialog";
import { LazyMindmapCanvas } from "@/components/mindmaps/lazy-mindmap-canvas";
import type { MindmapExporter } from "@/components/mindmaps/mindmap-canvas";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { PageTopBar } from "@/components/shared/page-top-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { MindmapGraph } from "@/features/mindmaps/types";
import { ensureRootNode, parseMindmapGraph } from "@/features/mindmaps/utils";
import { editMindmapSchema } from "@/features/mindmaps/validation";
import { useDocumentAutosave } from "@/lib/editor/use-document-autosave";
import { useZenMode } from "@/lib/editor/use-zen-mode";
import type { MindmapEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";
import { notifySubjectDocumentsChanged } from "@/lib/trees/subject-documents-events";
import { cn } from "@/lib/utils";

interface MindmapDetailProps {
  mindmap: MindmapEntity;
  subjectName: string;
}

export function MindmapDetail({
  mindmap,
  subjectName,
}: Readonly<MindmapDetailProps>) {
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const initialGraph = useRef(
    ensureRootNode(parseMindmapGraph(mindmap.data), mindmap.title),
  ).current;
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const exportPngRef = useRef<MindmapExporter | null>(null);
  const { isZenMode, toggleZenMode } = useZenMode();
  const assistantWorkspace = useAssistantWorkspace();
  const [title, setTitle] = useState(mindmap.title);
  const [graph, setGraph] = useState<MindmapGraph>(initialGraph);
  useStudyContext(
    buildDocumentContext(
      "mindmap",
      title,
      subjectName,
      describeMindmapGraph(graph),
      mindmap.id,
    ),
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const autosave = useDocumentAutosave({
    documentId: mindmap.id,
    initialValue: { title: mindmap.title, data: JSON.stringify(initialGraph) },
    value: { title, data: JSON.stringify(graph) },
    persist: async (values) => {
      const parsed = editMindmapSchema.safeParse({ id: mindmap.id, ...values });
      if (!parsed.success) return false;
      const result = await editMindmap(parsed.data);
      if (!result.success) toast.error(t(result.errorCode, result.errorParams));
      return result.success === true;
    },
    onError: () => toast.error("Couldn't save the mindmap"),
  });

  return (
    <>
      {isZenMode ? null : (
        <PageTopBar
          breadcrumb={{
            parent: { label: subjectName, icon: "book-open" },
            current: { label: title || mindmap.title || "Untitled" },
          }}
        />
      )}
      <AppPageContainer
        maxWidth="7xl"
        className={cn(
          "lg:flex lg:flex-col lg:overflow-hidden",
          isZenMode && assistantWorkspace?.open && "lg:pr-96",
          isZenMode
            ? "fixed inset-0 z-immersive flex h-svh max-w-none flex-col overflow-hidden bg-background py-4"
            : "lg:h-[calc(100svh-3.5rem)] lg:pb-6",
        )}
      >
        {isZenMode ? <AssistantSurfaceHost /> : null}
        <div
          className={cn(
            "flex flex-col gap-6 lg:min-h-0 lg:flex-1",
            isZenMode ? "min-h-0 flex-1" : null,
          )}
        >
          <div
            className={cn(
              "min-w-0",
              isZenMode
                ? "flex min-h-0 flex-1 flex-col"
                : "lg:flex lg:min-h-0 lg:flex-col lg:flex-1",
            )}
          >
            <div className="mb-4 flex shrink-0 items-center gap-2">
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-label="Mindmap title"
                placeholder="Untitled mindmap"
                className="h-10 min-w-0 flex-1 rounded-md border-0 bg-transparent px-3 text-lg font-semibold tracking-tight shadow-none hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-xl"
              />
              <DocumentAutosaveFeedback {...autosave} />
              <ZenModeToggle
                isZenMode={isZenMode}
                onToggle={toggleZenMode}
                className="size-10"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 shrink-0"
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
                    className="cursor-pointer"
                    onClick={() => void exportPngRef.current?.()}
                  >
                    <ImageDown className="size-4" />
                    Export as PNG
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
            <div
              className={cn(
                "flex-1 overflow-hidden rounded-lg border border-border",
                isZenMode ? "h-auto min-h-0" : "h-[60svh] lg:h-auto lg:min-h-0",
              )}
            >
              <LazyMindmapCanvas
                assistantEditing
                subjectPath={subjectName}
                initialGraph={initialGraph}
                title={title}
                onTitleChange={setTitle}
                onGraphChange={setGraph}
                exportRef={exportPngRef}
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
            notifySubjectDocumentsChanged(mindmap.subjectId);
            startNavTransition(() => router.push("/"));
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
    </>
  );
}
