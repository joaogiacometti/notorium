import {
  BookOpenText,
  ChevronDown,
  LogIn,
  LogOut,
  User,
  UserPlus,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { logoutAction } from "@/app/actions/auth";
import { AppSectionNav } from "@/components/navbar/app-section-nav";
import { GlobalSearch } from "@/components/navbar/global-search";
import { LanguageSwitcher } from "@/components/navbar/language-switcher";
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
import { Link } from "@/i18n/routing";
import { getOptionalSession } from "@/lib/auth";

export async function Navbar() {
  const session = await getOptionalSession();
  const accountName =
    session?.user.name?.trim() || session?.user.email || "Account";
  const t = await getTranslations("Navigation");

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 min-w-0 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
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
          <LanguageSwitcher />
          <ModeToggle />
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="account-menu-trigger"
                  className="max-w-32 gap-1 px-1.5 text-muted-foreground hover:text-foreground sm:max-w-36 sm:gap-1.5 sm:px-3 lg:max-w-40"
                >
                  <User className="size-4 shrink-0" />
                  <span className="truncate">{accountName}</span>
                  <ChevronDown className="size-3.5 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="grid gap-0.5">
                  <span className="truncate font-medium">{accountName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {session.user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <form action="/profile">
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <button
                      type="submit"
                      data-testid="account-menu-profile"
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <User className="size-4" />
                      {t("profile")}
                    </button>
                  </DropdownMenuItem>
                </form>
                <form action={logoutAction}>
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer"
                    variant="destructive"
                  >
                    <button
                      type="submit"
                      data-testid="account-menu-logout"
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <LogOut className="size-4" />
                      {t("logout")}
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
                  <span className="hidden sm:inline">{t("login")}</span>
                </Link>
              </Button>
              <Button size="sm" className="gap-1.5" asChild>
                <Link href="/signup">
                  <UserPlus className="size-4" />
                  <span className="hidden sm:inline">{t("signup")}</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
