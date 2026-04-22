import { BookOpenText, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { AccountMenu } from "@/components/navbar/account-menu";
import { AppSectionNav } from "@/components/navbar/app-section-nav";
import { GlobalSearch } from "@/components/navbar/global-search";
import { ModeToggle } from "@/components/navbar/theme-switcher";
import { Button } from "@/components/ui/button";
import { getOptionalSessionAccess } from "@/lib/auth/auth";

export async function Navbar() {
  const authState = await getOptionalSessionAccess();
  const session = authState?.session ?? null;
  const accountName =
    session?.user.name?.trim() || session?.user.email || "Account";
  const logoHref = session ? "/subjects" : "/";
  const isAdmin = authState?.account.isAdmin ?? false;

  return (
    <nav className="sticky top-0 z-50 box-border h-14 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-full min-w-0 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={logoHref}
            className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <BookOpenText className="size-5" />
            <span className="hidden text-lg font-semibold tracking-tight sm:inline">
              Notorium
            </span>
          </Link>
          {session && (
            <>
              <div className="ml-1 hidden h-6 w-px bg-border/60 md:block" />
              <div className="ml-2">
                <AppSectionNav />
              </div>
            </>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {session && <GlobalSearch userId={session.user.id} />}
          {session && <ModeToggle />}
          {session ? (
            <AccountMenu
              accountName={accountName}
              email={session.user.email ?? ""}
              isAdmin={isAdmin}
            />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href="/login">
                  <LogIn className="size-4" />
                  <span className="hidden sm:inline">Log In</span>
                </Link>
              </Button>
              <Button size="sm" className="gap-1.5" asChild>
                <Link href="/signup">
                  <UserPlus className="size-4" />
                  <span className="hidden sm:inline">Sign Up</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
