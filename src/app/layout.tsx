import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/navbar/theme-provider";
import { ModeToggle } from "@/components/navbar/theme-switcher";
import { QueryProvider } from "@/components/shared/query-provider";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";
import { Toaster } from "@/components/ui/sonner";
import { getUserPreferredTheme } from "@/features/user/queries";
import { getOptionalSession } from "@/lib/auth/auth";
import { themeStorageKey } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notorium",
  description: "Study management system",
  applicationName: "Notorium",
  manifest: "/manifest.webmanifest",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  appleWebApp: {
    capable: true,
    title: "Notorium",
    statusBarStyle: "default",
  },
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
              <ModeToggle variant="floating" syncWithServer={false} />
            )}
            <Toaster />
            <SpeedInsights />
            <ServiceWorkerRegister />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
