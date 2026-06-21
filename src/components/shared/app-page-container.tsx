import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AppPageContainerMaxWidth = "3xl" | "4xl" | "5xl" | "7xl";

interface AppPageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: AppPageContainerMaxWidth;
}

const maxWidthStyles = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "7xl": "max-w-7xl",
} as const;

export function AppPageContainer({
  children,
  className,
  maxWidth = "5xl",
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
