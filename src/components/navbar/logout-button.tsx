"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutButton() {
  const router = useRouter();
  const [, startNavTransition] = useTransition();

  const handleLogout = async () => {
    await logoutAction();
    startNavTransition(() => router.push("/login"));
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
