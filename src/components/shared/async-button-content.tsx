import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

interface AsyncButtonContentProps {
  pending: boolean;
  idleLabel: string;
  pendingLabel: string;
  idleIcon?: ReactNode;
}

export function AsyncButtonContent({
  pending,
  idleLabel,
  pendingLabel,
  idleIcon,
}: Readonly<AsyncButtonContentProps>) {
  return (
    <>
      {pending ? <Loader2 className="size-4 animate-spin" /> : idleIcon}
      {pending ? pendingLabel : idleLabel}
    </>
  );
}
