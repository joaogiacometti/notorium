import { cookies } from "next/headers";
import { AccountSettingsProvider } from "@/components/account/account-settings-provider";
import { AppLayoutClient } from "@/components/shared/app-layout-client";
import { QueryProvider } from "@/components/shared/query-provider";
import { ShortcutsProvider } from "@/components/shortcuts/shortcuts-provider";
import { getFolderTreeForUser } from "@/features/folders/tree-queries";
import { getOptionalSessionAccess } from "@/lib/auth/auth";

export default async function AuthenticatedAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authState = await getOptionalSessionAccess();
  const session = authState?.session ?? null;
  const tree = session ? await getFolderTreeForUser(session.user.id) : null;
  const accountName =
    session?.user.name?.trim() || session?.user.email || "Account";

  const cookieStore = await cookies();
  const initialSidebarCollapsed =
    cookieStore.get("notorium:sidebar-collapsed")?.value === "true";

  return (
    <QueryProvider key={session?.user.id ?? "anonymous"}>
      <ShortcutsProvider>
        <AccountSettingsProvider userId={session?.user.id ?? ""}>
          <AppLayoutClient
            tree={tree}
            accountName={accountName}
            email={session?.user.email ?? ""}
            isAdmin={authState?.account.isAdmin ?? false}
            userId={session?.user.id ?? ""}
            initialSidebarCollapsed={initialSidebarCollapsed}
          >
            {children}
          </AppLayoutClient>
        </AccountSettingsProvider>
      </ShortcutsProvider>
    </QueryProvider>
  );
}
