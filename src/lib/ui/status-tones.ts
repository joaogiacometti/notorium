export type StatusTone = "success" | "warning" | "danger";

interface StatusToneClasses {
  text: string;
  bg: string;
  border: string;
  fill: string;
}

const STATUS_TONE_CLASSES: Record<StatusTone, StatusToneClasses> = {
  success: {
    text: "text-[color:var(--status-success-text)]",
    bg: "bg-[color:var(--status-success-bg)]",
    border: "border-[color:var(--status-success-border)]",
    fill: "bg-[color:var(--status-success-fill)]",
  },
  warning: {
    text: "text-[color:var(--status-warning-text)]",
    bg: "bg-[color:var(--status-warning-bg)]",
    border: "border-[color:var(--status-warning-border)]",
    fill: "bg-[color:var(--status-warning-fill)]",
  },
  danger: {
    text: "text-[color:var(--status-danger-text)]",
    bg: "bg-[color:var(--status-danger-bg)]",
    border: "border-[color:var(--status-danger-border)]",
    fill: "bg-[color:var(--status-danger-fill)]",
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
