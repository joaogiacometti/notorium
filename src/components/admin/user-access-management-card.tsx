"use client";

import { MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateUserAccessStatus } from "@/app/actions/account";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "@/i18n/routing";
import type { ManagedUser } from "@/lib/auth/access-control";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface UserAccessManagementCardProps {
  users: ManagedUser[];
}

const PAGE_SIZE = 25;

export function UserAccessManagementCard({
  users,
}: Readonly<UserAccessManagementCardProps>) {
  const t = useTranslations("UserAccessManagement");
  const tErrors = useTranslations("ServerActions");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    ManagedUser["accessStatus"] | "all"
  >("pending");
  const [page, setPage] = useState(1);

  const statusToneMap = {
    pending: "secondary",
    approved: "default",
    blocked: "destructive",
  } as const;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const statusFilteredUsers =
    statusFilter === "all"
      ? users
      : users.filter((user) => user.accessStatus === statusFilter);
  const filteredUsers =
    normalizedSearch.length === 0
      ? statusFilteredUsers
      : statusFilteredUsers.filter((user) => {
          return (
            user.name.toLowerCase().includes(normalizedSearch) ||
            user.email.toLowerCase().includes(normalizedSearch)
          );
        });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function updateStatus(
    userId: string,
    accessStatus: ManagedUser["accessStatus"],
  ) {
    setUpdatingUserId(userId);
    startTransition(async () => {
      const result = await updateUserAccessStatus({ userId, accessStatus });
      if (!result.success) {
        toast.error(resolveActionErrorMessage(result, tErrors));
        setUpdatingUserId(null);
        return;
      }
      toast.success(t("updated"));
      setUpdatingUserId(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem] lg:max-w-xl">
                <Input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("search_placeholder")}
                  className="w-full"
                />
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(
                      value as ManagedUser["accessStatus"] | "all",
                    );
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("filter_status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filter_all")}</SelectItem>
                    <SelectItem value="pending">
                      {t("status_pending")}
                    </SelectItem>
                    <SelectItem value="approved">
                      {t("status_approved")}
                    </SelectItem>
                    <SelectItem value="blocked">
                      {t("status_blocked")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm whitespace-nowrap text-muted-foreground lg:text-right">
                {t("results_count", {
                  filtered: filteredUsers.length,
                  total: users.length,
                })}
              </p>
            </div>

            <div className="max-h-[28rem] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 z-10 bg-card sm:w-[38%]">
                      {t("name")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 hidden bg-card sm:table-cell sm:w-[38%]">
                      {t("email")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card sm:w-[16%]">
                      {t("status")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card text-right sm:w-[8%]">
                      {t("actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        {t("no_results")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((managedUser) => {
                      const isUpdating = updatingUserId === managedUser.id;
                      return (
                        <TableRow
                          key={managedUser.id}
                          className={isUpdating ? "opacity-60" : undefined}
                        >
                          <TableCell className="max-w-0">
                            <p className="truncate font-medium">
                              {managedUser.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground sm:hidden">
                              {managedUser.email}
                            </p>
                          </TableCell>
                          <TableCell className="hidden max-w-0 sm:table-cell">
                            <p className="truncate text-muted-foreground">
                              {managedUser.email}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusToneMap[managedUser.accessStatus]}
                            >
                              {t(`status_${managedUser.accessStatus}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-9 rounded-md"
                                    aria-label={t("open_actions")}
                                    disabled={isPending || isUpdating}
                                  >
                                    <MoreVertical className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    disabled={isPending || isUpdating}
                                    onClick={() =>
                                      updateStatus(managedUser.id, "approved")
                                    }
                                  >
                                    {t("approve")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    disabled={isPending || isUpdating}
                                    onClick={() =>
                                      updateStatus(managedUser.id, "pending")
                                    }
                                  >
                                    {t("set_pending")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                    disabled={isPending || isUpdating}
                                    onClick={() =>
                                      updateStatus(managedUser.id, "blocked")
                                    }
                                  >
                                    {t("block")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={clampedPage <= 1}
              >
                {t("prev")}
              </Button>
              <p className="text-sm text-muted-foreground">
                {t("page", { current: clampedPage, total: totalPages })}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={clampedPage >= totalPages}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
