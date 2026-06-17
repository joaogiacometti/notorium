import { BookOpen } from "lucide-react";
import Link from "next/link";
import { HomeCreateSubjectButton } from "@/components/home/home-create-subject-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubjectListItem } from "@/lib/server/api-contracts";

interface SubjectsOverviewCardProps {
  subjects: SubjectListItem[];
}

function notesCountLabel(count: number): string {
  return count === 1 ? "1 note" : `${count} notes`;
}

/**
 * Dashboard card with a quick-access grid of the user's most recently updated
 * subjects plus a create-subject action. The full list lives in the sidebar
 * subject tree. Read-only tiles (not the editable SubjectCard) since the
 * dashboard only navigates.
 */
export function SubjectsOverviewCard({
  subjects,
}: Readonly<SubjectsOverviewCardProps>) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Recent subjects</CardTitle>
        <HomeCreateSubjectButton />
      </CardHeader>
      <CardContent>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create your first subject to start organising notes, mindmaps, and
            assessments.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <li key={subject.id}>
                <Link
                  href={`/subjects/${subject.id}`}
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/50 px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-muted/40"
                >
                  <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {subject.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {notesCountLabel(subject.notesCount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
