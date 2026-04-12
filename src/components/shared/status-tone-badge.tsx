import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { getStatusToneClasses, type StatusTone } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

interface StatusToneBadgeProps {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}

export function StatusToneBadge({
  tone,
  children,
  className,
}: Readonly<StatusToneBadgeProps>) {
  const toneClasses = getStatusToneClasses(tone);

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2 py-0.5 text-xs",
        toneClasses.border,
        toneClasses.bg,
        toneClasses.text,
        className,
      )}
    >
      {children}
    </Badge>
  );
}
