import { GraduationCap } from "lucide-react";

export function ExamBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      <GraduationCap className="size-3.5" />
      <span>Exam</span>
    </div>
  );
}
