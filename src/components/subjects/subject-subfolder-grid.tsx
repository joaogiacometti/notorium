import { ChevronRight, Folder } from "lucide-react";
import Link from "next/link";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";

interface SubjectSubfolderGridProps {
  childSubjects: SubjectTreeNode[];
}

/**
 * Browsable grid of a subject's direct subfolders. The tree sidebar navigates
 * one level at a time; this gives the center pane a spatial way to dive into
 * children, with the same rolled-up counts the sidebar shows.
 *
 * @example
 * <SubjectSubfolderGrid childSubjects={node.children} />
 */
export function SubjectSubfolderGrid({
  childSubjects,
}: Readonly<SubjectSubfolderGridProps>) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">Subfolders</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {childSubjects.map((child) => (
          <SubfolderCard key={child.id} subfolder={child} />
        ))}
      </div>
    </div>
  );
}

interface SubfolderCardProps {
  subfolder: SubjectTreeNode;
}

function SubfolderCard({ subfolder }: Readonly<SubfolderCardProps>) {
  return (
    <Link
      href={`/subjects/${subfolder.id}`}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-border hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Folder className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-sm font-medium"
          title={subfolder.path}
        >
          {subfolder.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {formatSubfolderMeta(subfolder)}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/**
 * Builds the muted meta line for a subfolder card, e.g. "3 documents · 1
 * subfolder". Counts are rolled up across the subtree (matching the sidebar).
 * Returns "Empty" when the subfolder holds nothing.
 */
function formatSubfolderMeta(subfolder: SubjectTreeNode): string {
  const segments: string[] = [];
  const documentCount = subfolder.documentCount;
  const subfolderCount = subfolder.children.length;

  if (documentCount > 0) {
    segments.push(`${documentCount} ${pluralize(documentCount, "document")}`);
  }
  if (subfolderCount > 0) {
    segments.push(
      `${subfolderCount} ${pluralize(subfolderCount, "subfolder")}`,
    );
  }

  return segments.length > 0 ? segments.join(" · ") : "Empty";
}

function pluralize(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
