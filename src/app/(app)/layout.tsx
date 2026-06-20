import { cookies } from "next/headers";
import { AccountSettingsProvider } from "@/components/account/account-settings-provider";
import { AppLayoutClient } from "@/components/shared/app-layout-client";
import { ShortcutsProvider } from "@/components/shortcuts/shortcuts-provider";
import {
  getAllSubjectsWithPathsForUser,
  getSubjectTreeForUser,
} from "@/features/subjects/queries";
import { isAiEnabled } from "@/lib/ai/config";
import { getOptionalSessionAccess } from "@/lib/auth/auth";

export default async function AuthenticatedAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authState = await getOptionalSessionAccess();
  const session = authState?.session ?? null;
  const [tree, subjects] = session
    ? await Promise.all([
        getSubjectTreeForUser(session.user.id),
        getAllSubjectsWithPathsForUser(session.user.id),
      ])
    : [null, []];
  const accountName =
    session?.user.name?.trim() || session?.user.email || "Account";

  const cookieStore = await cookies();
  const initialSidebarCollapsed =
    cookieStore.get("notorium:sidebar-collapsed")?.value === "true";

  return (
    <ShortcutsProvider>
      <AccountSettingsProvider userId={session?.user.id ?? ""}>
        <AppLayoutClient
          tree={tree}
          subjects={subjects}
          accountName={accountName}
          email={session?.user.email ?? ""}
          isAdmin={authState?.account.isAdmin ?? false}
          userId={session?.user.id ?? ""}
          aiEnabled={isAiEnabled()}
          initialSidebarCollapsed={initialSidebarCollapsed}
        >
          {children}
        </AppLayoutClient>
      </AccountSettingsProvider>
    </ShortcutsProvider>
  );
}
