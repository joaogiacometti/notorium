"use client";

import { useSearchParams } from "next/navigation";

interface AppLayoutClientProps {
  navbar: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayoutClient({
  navbar,
  children,
}: Readonly<AppLayoutClientProps>) {
  const searchParams = useSearchParams();
  const isFocusMode = searchParams.get("focus") === "true";

  if (isFocusMode) {
    return (
      <div className="fixed inset-0 z-100 flex flex-col overflow-hidden bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      {navbar}
      <div className="min-h-[calc(100svh-3.5rem)]">{children}</div>
    </div>
  );
}
