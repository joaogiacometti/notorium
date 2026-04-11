"use client";

import { MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
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
import type { ManagedUser } from "@/lib/auth/access-control";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface UserAccessManagementCardProps {
  users: ManagedUser[];
}

const PAGE_SIZE = 25;

export function UserAccessManagementCard({
  users,
}: Readonly<UserAccessManagementCardProps>) {
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
  const statusLabelMap = {
    pending: "Pending",
    approved: "Approved",
    blocked: "Blocked",
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
        toast.error(resolveActionErrorMessage(result));
        setUpdatingUserId(null);
        return;
      }
      toast.success("Access status updated.");
      setUpdatingUserId(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Control</CardTitle>
        <CardDescription>Approve, hold, or block user access.</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other users yet.</p>
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
                  placeholder="Search name or email..."
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
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm whitespace-nowrap text-muted-foreground lg:text-right">
                {filteredUsers.length} of {users.length} users
              </p>
            </div>

            <div className="max-h-112 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 z-10 bg-card sm:w-[38%]">
                      Name
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 hidden bg-card sm:table-cell sm:w-[38%]">
                      Email
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card sm:w-[16%]">
                      Status
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card text-right sm:w-[8%]">
                      Actions
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
                        No users match your current search or filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((managedUser) => {
                      const isUpdating = updatingUserId === managedUser.id;
                      const statusLabel =
                        statusLabelMap[managedUser.accessStatus];
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
                              {statusLabel}
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
                                    aria-label="Open user actions"
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
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    disabled={isPending || isUpdating}
                                    onClick={() =>
                                      updateStatus(managedUser.id, "pending")
                                    }
                                  >
                                    Set Pending
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                    disabled={isPending || isUpdating}
                                    onClick={() =>
                                      updateStatus(managedUser.id, "blocked")
                                    }
                                  >
                                    Block
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
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                Page {clampedPage} of {totalPages}
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
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
