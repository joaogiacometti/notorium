export type StatusTone = "success" | "warning" | "danger";

interface StatusToneClasses {
  text: string;
  bg: string;
  border: string;
  fill: string;
}

const STATUS_TONE_CLASSES: Record<StatusTone, StatusToneClasses> = {
  success: {
    text: "text-[color:var(--intent-success-text)]",
    bg: "bg-[color:var(--intent-success-bg)]",
    border: "border-[color:var(--intent-success-border)]",
    fill: "bg-[color:var(--intent-success-fill)]",
  },
  warning: {
    text: "text-[color:var(--intent-warning-text)]",
    bg: "bg-[color:var(--intent-warning-bg)]",
    border: "border-[color:var(--intent-warning-border)]",
    fill: "bg-[color:var(--intent-warning-fill)]",
  },
  danger: {
    text: "text-[color:var(--intent-danger-text)]",
    bg: "bg-[color:var(--intent-danger-bg)]",
    border: "border-[color:var(--intent-danger-border)]",
    fill: "bg-[color:var(--intent-danger-fill)]",
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
