export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

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
  info: {
    text: "text-[color:var(--intent-info-text)]",
    bg: "bg-[color:var(--intent-info-bg)]",
    border: "border-[color:var(--intent-info-border)]",
    fill: "bg-[color:var(--intent-info-fill)]",
  },
  neutral: {
    text: "text-muted-foreground",
    bg: "bg-background/70",
    border: "border-border/70",
    fill: "bg-muted-foreground/45",
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
