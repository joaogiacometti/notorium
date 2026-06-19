"use client";

import {
  ImageDown,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { editMindmap } from "@/app/actions/mindmaps";
import { ZenModeToggle } from "@/components/documents/zen-mode-toggle";
import { DeleteMindmapDialog } from "@/components/mindmaps/delete-mindmap-dialog";
import { EditMindmapTitleDialog } from "@/components/mindmaps/edit-mindmap-title-dialog";
import { GenerateMindmapFlashcardsDialog } from "@/components/mindmaps/generate-mindmap-flashcards-dialog";
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
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
import { useZenMode } from "@/lib/editor/use-zen-mode";

import { useDebouncedValue } from "@/lib/react/use-debounced-value";
import type { DeckOption, MindmapEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";
import { cn } from "@/lib/utils";

interface MindmapDetailProps {
  aiEnabled: boolean;
  decks: DeckOption[];
  mindmap: MindmapEntity;
  subjectName: string;
  /** When hosted in a floating window: drop the page top bar and fill height. */
  embedded?: boolean;
  /** Called instead of navigating after delete when embedded in a window. */
  onClosed?: () => void;
}

const AUTOSAVE_DELAY_MS = 800;

export function MindmapDetail({
  aiEnabled,
  decks,
  mindmap,
  subjectName,
  embedded = false,
  onClosed,
}: Readonly<MindmapDetailProps>) {
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const initialGraph = useRef(
    ensureRootNode(parseMindmapGraph(mindmap.data), mindmap.title),
  ).current;
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const exportPngRef = useRef<MindmapExporter | null>(null);
  const { isZenMode, toggleZenMode } = useZenMode();
  const [title, setTitle] = useState(mindmap.title);
  const [graph, setGraph] = useState<MindmapGraph>(initialGraph);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasDecks = decks.length > 0;
  const lastSavedRef = useRef(
    JSON.stringify({ title: mindmap.title, data: initialGraph }),
  );
  const saveSequenceRef = useRef(0);

  const debouncedTitle = useDebouncedValue(title, AUTOSAVE_DELAY_MS);
  const debouncedGraph = useDebouncedValue(graph, AUTOSAVE_DELAY_MS);

  // Serialize only when title or graph actually changes, not on every render.
  const currentSnapshot = useMemo(
    () => JSON.stringify({ title, data: graph }),
    [title, graph],
  );
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

      try {
        const result = await editMindmap({
          id: mindmap.id,
          title: nextTitle,
          data: JSON.stringify(nextGraph),
        });

        // A newer save superseded this one; let it own the saving state.
        if (saveSequence !== saveSequenceRef.current) {
          return;
        }

        if (!result.success) {
          toast.error(t(result.errorCode, result.errorParams));
          return;
        }

        lastSavedRef.current = snapshot;
      } catch {
        // A rejected action (network/serialization failure) must not leave the
        // editor stuck in the saving state, which would warn on every unload.
        if (saveSequence === saveSequenceRef.current) {
          toast.error("Couldn't save the mindmap");
        }
      } finally {
        if (saveSequence === saveSequenceRef.current) {
          setIsSaving(false);
        }
      }
    },
    [mindmap.id],
  );

  useEffect(() => {
    void save(debouncedTitle, debouncedGraph);
  }, [debouncedTitle, debouncedGraph, save]);

  return (
    <>
      {isZenMode || embedded ? null : (
        <PageTopBar
          breadcrumb={[
            {
              label: subjectName,
              href: `/subjects/${mindmap.subjectId}`,
              icon: "book-open",
            },
            { label: title || mindmap.title || "Untitled" },
          ]}
        />
      )}
      <AppPageContainer
        maxWidth="7xl"
        className={cn(
          "lg:flex lg:flex-col lg:overflow-hidden",
          isZenMode
            ? "fixed inset-0 z-50 flex h-svh max-w-none flex-col overflow-hidden bg-background py-4"
            : embedded
              ? "flex h-full min-h-0 max-w-none flex-col overflow-hidden p-3"
              : "lg:h-[calc(100svh-3.5rem)] lg:pb-6",
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-6 lg:min-h-0 lg:flex-1",
            isZenMode || embedded ? "min-h-0 flex-1" : null,
          )}
        >
          <div
            className={cn(
              "min-w-0",
              isZenMode || embedded
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
              <ZenModeToggle
                isZenMode={isZenMode}
                onToggle={toggleZenMode}
                className="size-9"
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
                  {aiEnabled ? (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setGenerateOpen(true)}
                      disabled={!hasDecks}
                      title={
                        hasDecks
                          ? undefined
                          : "Create a deck before generating flashcards."
                      }
                    >
                      <Sparkles className="size-4" />
                      Generate flashcards
                    </DropdownMenuItem>
                  ) : null}
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
                isZenMode || embedded
                  ? "h-auto min-h-0"
                  : "h-[60svh] lg:h-auto lg:min-h-0",
              )}
            >
              <LazyMindmapCanvas
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
            if (embedded) {
              onClosed?.();
              return;
            }
            startNavTransition(() =>
              router.push(`/subjects/${mindmap.subjectId}`),
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
        {aiEnabled ? (
          <GenerateMindmapFlashcardsDialog
            decks={decks}
            mindmapId={mindmap.id}
            open={generateOpen}
            onOpenChange={setGenerateOpen}
          />
        ) : null}
      </AppPageContainer>
    </>
  );
}
