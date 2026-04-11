"use client";

import { Archive, BookOpen, Lock, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSubjects } from "@/app/actions/subjects";
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog";
import { DeleteSubjectDialog } from "@/components/subjects/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/subjects/edit-subject-dialog";
import { SubjectCard } from "@/components/subjects/subject-card";
import { Button } from "@/components/ui/button";
import { getTotalSubjectCount } from "@/features/subjects/subjects-count";
import { LIMITS } from "@/lib/config/limits";
import type { SubjectEditDto, SubjectEntity } from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface SubjectsListProps {
  subjects: SubjectEntity[];
  archivedCount: number;
}

type SubjectActionTarget =
  | { action: "edit"; subject: SubjectEditDto }
  | { action: "archive"; subject: { id: string; name: string } }
  | { action: "delete"; subject: { id: string; name: string } };

export function SubjectsList({
  subjects,
  archivedCount,
}: Readonly<SubjectsListProps>) {
  const [subjectItems, setSubjectItems] = useState(subjects);
  const [archivedItemsCount, setArchivedItemsCount] = useState(archivedCount);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<SubjectActionTarget | null>(
    null,
  );
  const warningTone = getStatusToneClasses("warning");

  useEffect(() => {
    setSubjectItems(subjects);
  }, [subjects]);

  useEffect(() => {
    setArchivedItemsCount(archivedCount);
  }, [archivedCount]);

  const totalSubjects = getTotalSubjectCount(
    subjectItems.length,
    archivedItemsCount,
  );
  const isAtLimit = totalSubjects >= LIMITS.maxSubjects;

  async function refreshSubjectsList() {
    const latestSubjects = await getSubjects();
    setSubjectItems(latestSubjects);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          <Button variant="outline" className="gap-1.5" asChild>
            <Link href="/subjects/archived">
              <Archive className="size-4" />
              Archived
              {archivedItemsCount > 0 ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {archivedItemsCount}
                </span>
              ) : null}
            </Link>
          </Button>
          <CreateSubjectDialog
            trigger={
              <Button
                className="gap-1.5"
                id="btn-create-subject"
                disabled={isAtLimit}
                title={
                  isAtLimit ? "You cannot create more subjects" : undefined
                }
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">New Subject</span>
              </Button>
            }
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={() => {
              void refreshSubjectsList();
            }}
          />
        </div>
      </div>

      {isAtLimit && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${warningTone.border} ${warningTone.bg}`}
        >
          <Lock className={`size-4 shrink-0 ${warningTone.text}`} />
          <p className={warningTone.text}>
            {`You've reached the system limit of ${LIMITS.maxSubjects} subjects. Please archive or delete subjects to create more.`}
          </p>
        </div>
      )}

      {subjectItems.length === 0 && archivedItemsCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-20">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="size-6 text-primary" />
          </div>
          <h2 className="mb-1 text-lg font-semibold">No subjects yet</h2>
          <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
            Create your first subject to start organizing your notes and
            tracking your academic progress.
          </p>
          <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create Subject
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjectItems.map((subj) => (
            <SubjectCard
              key={subj.id}
              subject={subj}
              onEditRequested={() =>
                setActiveAction({
                  action: "edit",
                  subject: {
                    id: subj.id,
                    name: subj.name,
                    description: subj.description,
                  },
                })
              }
              onArchiveRequested={() =>
                setActiveAction({
                  action: "archive",
                  subject: { id: subj.id, name: subj.name },
                })
              }
              onDeleteRequested={() =>
                setActiveAction({
                  action: "delete",
                  subject: { id: subj.id, name: subj.name },
                })
              }
            />
          ))}
        </div>
      )}

      {activeAction?.action === "edit" && (
        <EditSubjectDialog
          subject={activeAction.subject}
          open
          onSaved={(updatedSubject) => {
            setSubjectItems((currentSubjects) =>
              currentSubjects.map((currentSubject) =>
                currentSubject.id === updatedSubject.id
                  ? {
                      ...currentSubject,
                      name: updatedSubject.name,
                      description: updatedSubject.description,
                    }
                  : currentSubject,
              ),
            );
          }}
          onOpenChange={(open) => {
            if (!open) setActiveAction(null);
          }}
        />
      )}
      {activeAction?.action === "archive" && (
        <DeleteSubjectDialog
          subjectId={activeAction.subject.id}
          subjectName={activeAction.subject.name}
          open
          onOpenChange={(open) => {
            if (!open) setActiveAction(null);
          }}
          mode="archive"
          onSuccess={() => {
            const archivedSubjectId = activeAction.subject.id;
            setSubjectItems((currentSubjects) =>
              currentSubjects.filter(
                (currentSubject) => currentSubject.id !== archivedSubjectId,
              ),
            );
            setArchivedItemsCount((currentCount) => currentCount + 1);
            setActiveAction(null);
          }}
        />
      )}
      {activeAction?.action === "delete" && (
        <DeleteSubjectDialog
          subjectId={activeAction.subject.id}
          subjectName={activeAction.subject.name}
          open
          onOpenChange={(open) => {
            if (!open) setActiveAction(null);
          }}
          mode="delete"
          onSuccess={() => {
            const deletedSubjectId = activeAction.subject.id;
            setSubjectItems((currentSubjects) =>
              currentSubjects.filter(
                (currentSubject) => currentSubject.id !== deletedSubjectId,
              ),
            );
            setActiveAction(null);
          }}
        />
      )}
    </div>
  );
}
