export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusToneClasses {
  text: string;
  bg: string;
  border: string;
  fill: string;
  /** SVG stroke, for marks such as chart arcs. */
  stroke: string;
  /** Hover feedback for controls tinted with this tone. */
  hover: string;
}

const STATUS_TONE_CLASSES: Record<StatusTone, StatusToneClasses> = {
  success: {
    text: "text-[color:var(--intent-success-text)]",
    bg: "bg-[color:var(--intent-success-bg)]",
    border: "border-[color:var(--intent-success-border)]",
    fill: "bg-[color:var(--intent-success-fill)]",
    stroke: "stroke-[color:var(--intent-success-fill)]",
    hover:
      "hover:border-[color:var(--intent-success-border-hover)] hover:bg-[color:var(--intent-success-bg-hover)]",
  },
  warning: {
    text: "text-[color:var(--intent-warning-text)]",
    bg: "bg-[color:var(--intent-warning-bg)]",
    border: "border-[color:var(--intent-warning-border)]",
    fill: "bg-[color:var(--intent-warning-fill)]",
    stroke: "stroke-[color:var(--intent-warning-fill)]",
    hover:
      "hover:border-[color:var(--intent-warning-border-hover)] hover:bg-[color:var(--intent-warning-bg-hover)]",
  },
  danger: {
    text: "text-[color:var(--intent-danger-text)]",
    bg: "bg-[color:var(--intent-danger-bg)]",
    border: "border-[color:var(--intent-danger-border)]",
    fill: "bg-[color:var(--intent-danger-fill)]",
    stroke: "stroke-[color:var(--intent-danger-fill)]",
    hover:
      "hover:border-[color:var(--intent-danger-border-hover)] hover:bg-[color:var(--intent-danger-bg-hover)]",
  },
  info: {
    text: "text-[color:var(--intent-info-text)]",
    bg: "bg-[color:var(--intent-info-bg)]",
    border: "border-[color:var(--intent-info-border)]",
    fill: "bg-[color:var(--intent-info-fill)]",
    stroke: "stroke-[color:var(--intent-info-fill)]",
    hover:
      "hover:border-[color:var(--intent-info-border-hover)] hover:bg-[color:var(--intent-info-bg-hover)]",
  },
  neutral: {
    text: "text-muted-foreground",
    bg: "bg-background/70",
    border: "border-border",
    fill: "bg-muted-foreground/45",
    stroke: "stroke-muted-foreground/45",
    hover: "hover:bg-muted/50",
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
