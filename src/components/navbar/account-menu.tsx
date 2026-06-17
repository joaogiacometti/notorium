"use client";

import { ChevronDown, Settings, Shield, User } from "lucide-react";
import Link from "next/link";
import { type ComponentProps, useEffect, useState } from "react";
import { useOpenAccountSettings } from "@/components/account/account-settings-provider";
import { LogoutButton } from "@/components/navbar/logout-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AccountMenuVariant = "navbar" | "sidebar";

interface AccountMenuProps {
  accountName: string;
  email: string;
  isAdmin: boolean;
  variant?: AccountMenuVariant;
}

const triggerClassNameByVariant: Record<AccountMenuVariant, string> = {
  navbar:
    "size-9 justify-center px-0 text-muted-foreground hover:text-foreground sm:h-9 sm:w-auto sm:max-w-36 sm:gap-1.5 sm:px-3 lg:max-w-40",
  sidebar:
    "h-9 min-w-0 flex-1 justify-start gap-2 px-2 text-muted-foreground hover:text-foreground",
};

function AccountMenuTrigger({
  accountName,
  variant = "navbar",
  disabled = false,
  ...rest
}: Readonly<{
  accountName: string;
  variant?: AccountMenuVariant;
  disabled?: boolean;
}> &
  Omit<ComponentProps<typeof Button>, "variant">) {
  const isSidebar = variant === "sidebar";
  return (
    <Button
      variant="ghost"
      size="sm"
      data-testid="account-menu-trigger"
      className={triggerClassNameByVariant[variant]}
      disabled={disabled}
      {...rest}
    >
      <User className="size-4 shrink-0" />
      <span
        className={cn(
          "truncate",
          isSidebar ? "flex-1 text-left" : "hidden sm:inline",
        )}
      >
        {accountName}
      </span>
      <ChevronDown
        className={cn(
          "size-3.5 shrink-0",
          isSidebar ? "block" : "hidden sm:block",
        )}
      />
    </Button>
  );
}

export function AccountMenu({
  accountName,
  email,
  isAdmin,
  variant = "navbar",
}: Readonly<AccountMenuProps>) {
  const [mounted, setMounted] = useState(false);
  const openAccountSettings = useOpenAccountSettings();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <AccountMenuTrigger
        accountName={accountName}
        variant={variant}
        disabled
      />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AccountMenuTrigger accountName={accountName} variant={variant} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "sidebar" ? "start" : "end"}
        className="w-56"
      >
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate font-medium">{accountName}</span>
          <span className="truncate text-xs text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="account-menu-settings"
          className="cursor-pointer"
          onSelect={() => openAccountSettings()}
        >
          <Settings className="size-4" />
          Settings
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link
              href="/admin"
              data-testid="account-menu-admin"
              className="flex w-full items-center gap-2 text-left"
            >
              <Shield className="size-4" />
              Admin Panel
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <LogoutButton />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
