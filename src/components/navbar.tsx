import { BookOpenText, LogIn, LogOut, UserPlus } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { GlobalSearch } from "@/components/global-search";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { ModeToggle } from "./theme-switcher";

export async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 container items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <BookOpenText className="size-4" />
          <span className="text-lg font-semibold tracking-tight">Notorium</span>
        </Link>

        <div className="flex items-center gap-2">
          {session && <GlobalSearch />}
          <ModeToggle />
          {session ? (
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
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
                  <span className="hidden sm:inline">Sign In</span>
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
