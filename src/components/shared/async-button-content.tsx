import { Check, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

interface AsyncButtonContentProps {
  pending: boolean;
  idleLabel: string;
  pendingLabel: string;
  idleIcon?: ReactNode;
  saved?: boolean;
  savedLabel?: string;
}

export function AsyncButtonContent({
  pending,
  idleLabel,
  pendingLabel,
  idleIcon,
  saved = false,
  savedLabel = "Saved",
}: Readonly<AsyncButtonContentProps>) {
  const icon = pending ? (
    <Loader2 className="size-4 animate-spin" />
  ) : saved ? (
    <Check className="size-4" />
  ) : (
    idleIcon
  );

  const label = pending ? pendingLabel : saved ? savedLabel : idleLabel;

  return (
    <>
      {icon}
      {label}
    </>
  );
}
