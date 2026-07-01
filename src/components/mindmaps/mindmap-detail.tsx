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
import { editMindmap, splitMindmap } from "@/app/actions/mindmaps";
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
import { useOptionalWindowManager } from "@/components/windows/window-manager-context";
import type { MindmapGraph } from "@/features/mindmaps/types";
import { ensureRootNode, parseMindmapGraph } from "@/features/mindmaps/utils";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
import { useWindowCloseGuard } from "@/lib/editor/use-window-close-guard";
import { useZenMode } from "@/lib/editor/use-zen-mode";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";
import type { MindmapEntity, SubjectOption } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";
import { cn } from "@/lib/utils";

interface MindmapDetailProps {
  aiEnabled: boolean;
  subjects?: SubjectOption[];
  mindmap: MindmapEntity;
  subjectName: string;
  /**
   * The subject's detail-page href, or `null` for general subjects (which have
   * no page). Drives the breadcrumb link and post-delete navigation.
   */
  subjectHref: string | null;
  /** When hosted in a floating window: drop the page top bar and fill height. */
  embedded?: boolean;
  /** True only for the focused floating window instance. */
  focusedInWindow?: boolean;
  /** Called instead of navigating after delete when embedded in a window. */
  onClosed?: () => void;
  /** When embedded: flush a pending autosave before the window closes. */
  registerCloseRequest?: (request: () => void) => () => void;
}

const AUTOSAVE_DELAY_MS = 800;

export function MindmapDetail({
  aiEnabled,
  subjects,
  mindmap,
  subjectName,
  subjectHref,
  embedded = false,
  focusedInWindow = false,
  onClosed,
  registerCloseRequest,
}: Readonly<MindmapDetailProps>) {
  const router = useRouter();
  const focusedWindowId = useOptionalWindowManager()?.focusedWindowId ?? null;
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
  const hasSubjects = subjects ? subjects.length > 0 : true;
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
  const shortcutsEnabled = embedded
    ? focusedInWindow
    : focusedWindowId === null;
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

  const onSplitIntoMindmap = useCallback(
    async (nodeId: string, nextGraph: MindmapGraph) => {
      await save(title, nextGraph);
      const result = await splitMindmap({
        id: mindmap.id,
        nodeId,
        data: JSON.stringify(nextGraph),
      });
      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return false;
      }
      toast.success("Moved branch into a new mindmap");
      window.dispatchEvent(
        new CustomEvent("notorium:subject-documents-changed", {
          detail: { subjectId: result.subjectId },
        }),
      );
      router.refresh();
      return true;
    },
    [mindmap.id, router, save, title],
  );

  useEffect(() => {
    void save(debouncedTitle, debouncedGraph);
  }, [debouncedTitle, debouncedGraph, save]);

  // Mindmaps autosave, so closing the window flushes any pending edit then
  // closes rather than prompting to discard.
  useWindowCloseGuard(registerCloseRequest, async () => {
    if (isDirty) {
      await save(title, graph);
    }
    onClosed?.();
  });

  return (
    <>
      {isZenMode || embedded ? null : (
        <PageTopBar
          breadcrumb={[
            {
              label: subjectName,
              href: subjectHref ?? undefined,
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
            ? "fixed inset-0 z-35 flex h-svh max-w-none flex-col overflow-hidden bg-background py-4"
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
                      disabled={!hasSubjects}
                      title={
                        hasSubjects
                          ? undefined
                          : "Create a subject before generating flashcards."
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
                onSplitIntoMindmap={onSplitIntoMindmap}
                exportRef={exportPngRef}
                shortcutsEnabled={shortcutsEnabled}
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
            startNavTransition(() => router.push(subjectHref ?? "/"));
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
            subjects={subjects}
            mindmapId={mindmap.id}
            open={generateOpen}
            onOpenChange={setGenerateOpen}
          />
        ) : null}
      </AppPageContainer>
    </>
  );
}
