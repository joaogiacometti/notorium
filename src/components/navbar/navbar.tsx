import {
  BookOpenText,
  ChevronDown,
  LogIn,
  LogOut,
  User,
  UserPlus,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { GlobalSearch } from "@/components/navbar/global-search";
import { ModeToggle } from "@/components/navbar/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/auth";

export async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const accountName =
    session?.user.name?.trim() || session?.user.email || "Account";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 min-w-0 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <BookOpenText className="size-5" />
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">
            Notorium
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {session && <GlobalSearch userId={session.user.id} />}
          <ModeToggle />
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 px-1.5 text-muted-foreground hover:text-foreground sm:max-w-40 sm:gap-1.5 sm:px-3"
                >
                  <User className="size-4 shrink-0" />
                  <span className="hidden truncate sm:inline">
                    {accountName}
                  </span>
                  <ChevronDown className="hidden size-3.5 shrink-0 sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {accountName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full">
                      <LogOut className="size-4" />
                      Logout
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
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
