"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { clearPersistedThemePreference } from "@/lib/theme-storage";

export function LogoutButton() {
  const handleLogout = async () => {
    const result = await logoutAction();
    if (!result.success) {
      return;
    }

    clearPersistedThemePreference();
    window.location.assign("/login");
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
        Log Out
      </button>
    </DropdownMenuItem>
  );
}
