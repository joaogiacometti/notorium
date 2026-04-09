"use client";

interface AppLayoutClientProps {
  navbar: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayoutClient({
  navbar,
  children,
}: Readonly<AppLayoutClientProps>) {
  return (
    <div className="min-h-svh bg-background">
      {navbar}
      <div className="min-h-[calc(100svh-3.5rem)]">{children}</div>
    </div>
  );
}
