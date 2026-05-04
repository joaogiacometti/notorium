"use client";

import { ChevronDown, Shield, User } from "lucide-react";
import Link from "next/link";
import { type ComponentProps, useEffect, useState } from "react";
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

interface AccountMenuProps {
  accountName: string;
  email: string;
  isAdmin: boolean;
}

const triggerClassName =
  "size-9 justify-center px-0 text-muted-foreground hover:text-foreground sm:h-9 sm:w-auto sm:max-w-36 sm:gap-1.5 sm:px-3 lg:max-w-40";

function AccountMenuTrigger({
  accountName,
  disabled = false,
  ...rest
}: Readonly<{ accountName: string; disabled?: boolean }> &
  ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      data-testid="account-menu-trigger"
      className={triggerClassName}
      disabled={disabled}
      {...rest}
    >
      <User className="size-4 shrink-0" />
      <span className="hidden truncate sm:inline">{accountName}</span>
      <ChevronDown className="hidden size-3.5 shrink-0 sm:block" />
    </Button>
  );
}

export function AccountMenu({
  accountName,
  email,
  isAdmin,
}: Readonly<AccountMenuProps>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <AccountMenuTrigger accountName={accountName} disabled />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AccountMenuTrigger accountName={accountName} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate font-medium">{accountName}</span>
          <span className="truncate text-xs text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link
            href="/account"
            data-testid="account-menu-account"
            className="flex w-full items-center gap-2 text-left"
          >
            <User className="size-4" />
            Account
          </Link>
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
