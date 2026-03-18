"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { logoutAction } from "@/app/actions/auth";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutButton() {
  const t = useTranslations("Navigation");
  const router = useRouter();
  const locale = useLocale();
  const { setTheme } = useTheme();

  const handleLogout = async () => {
    await logoutAction();

    setTheme("system");
    router.push(`/${locale}/login`);
  };

  return (
    <DropdownMenuItem
      asChild
      className="cursor-pointer"
      variant="destructive"
      onClick={handleLogout}
    >
      <button
        type="button"
        data-testid="account-menu-logout"
        className="flex w-full items-center gap-2 text-left"
      >
        <LogOut className="size-4" />
        {t("logout")}
      </button>
    </DropdownMenuItem>
  );
}
