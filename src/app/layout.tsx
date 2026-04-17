import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/navbar/theme-provider";
import { ModeToggle } from "@/components/navbar/theme-switcher";
import { QueryProvider } from "@/components/shared/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { getUserPreferredTheme } from "@/features/user/queries";
import { getOptionalSession } from "@/lib/auth/auth";
import { themeStorageKey } from "@/lib/theme-storage";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notorium",
  description: "Study management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getOptionalSession();
  const userTheme = session
    ? await getUserPreferredTheme(session.user.id)
    : "system";

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme={userTheme}
          enableSystem
          disableTransitionOnChange
          storageKey={themeStorageKey}
          themes={["light", "dark", "halloween", "catppuccin-mocha"]}
        >
          <QueryProvider>
            {children}
            {!session && (
              <ModeToggle variant="floating" persistPreference={false} />
            )}
            <Toaster />
            <SpeedInsights />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
