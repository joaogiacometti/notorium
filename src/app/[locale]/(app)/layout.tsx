import { Navbar } from "@/components/navbar/navbar";
import { ShortcutsProvider } from "@/components/shortcuts/shortcuts-provider";

export default function AuthenticatedAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ShortcutsProvider>
      <div className="min-h-svh bg-background">
        <Navbar />
        <div className="min-h-[calc(100svh-3.5rem)]">{children}</div>
      </div>
    </ShortcutsProvider>
  );
}
