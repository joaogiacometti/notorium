import { Navbar } from "@/components/navbar/navbar";

export default function AuthenticatedAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <div className="min-h-[calc(100svh-3.5rem)]">{children}</div>
    </div>
  );
}
