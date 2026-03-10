import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppPageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "3xl" | "4xl" | "5xl";
}

const maxWidthStyles = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
} as const;

export function AppPageContainer({
  children,
  className,
  maxWidth = "4xl",
}: Readonly<AppPageContainerProps>) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pt-6 pb-8 sm:px-6 lg:px-8",
        maxWidthStyles[maxWidth],
        className,
      )}
    >
      {children}
    </div>
  );
}
