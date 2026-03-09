export type StatusTone = "success" | "warning" | "danger";

interface StatusToneClasses {
  text: string;
  bg: string;
  border: string;
  fill: string;
}

const STATUS_TONE_CLASSES: Record<StatusTone, StatusToneClasses> = {
  success: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    fill: "bg-emerald-500",
  },
  warning: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    fill: "bg-amber-500",
  },
  danger: {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    fill: "bg-red-500",
  },
};

export function getStatusToneClasses(tone: StatusTone): StatusToneClasses {
  return STATUS_TONE_CLASSES[tone];
}

export function getScoreTone(score: number): StatusTone {
  if (score >= 70) {
    return "success";
  }
  if (score >= 50) {
    return "warning";
  }
  return "danger";
}
