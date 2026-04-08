import { Navbar } from "@/components/navbar/navbar";
import { AppLayoutClient } from "@/components/shared/app-layout-client";
import { ShortcutsProvider } from "@/components/shortcuts/shortcuts-provider";

export default function AuthenticatedAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ShortcutsProvider>
      <AppLayoutClient navbar={<Navbar />}>{children}</AppLayoutClient>
    </ShortcutsProvider>
  );
}
