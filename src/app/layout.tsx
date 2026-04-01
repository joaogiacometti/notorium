import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { getUserThemeServerSide } from "@/app/actions/theme";
import { ThemeProvider } from "@/components/navbar/theme-provider";
import { QueryProvider } from "@/components/shared/query-provider";
import { Toaster } from "@/components/ui/sonner";
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
  const userTheme = await getUserThemeServerSide();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme={userTheme}
          enableSystem
          disableTransitionOnChange
          storageKey="theme"
          themes={[
            "light",
            "dark",
            "tokyo-night",
            "halloween",
            "catppuccin-mocha",
            "catppuccin-latte",
          ]}
        >
          <QueryProvider>
            {children}
            <Toaster />
            <SpeedInsights />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
