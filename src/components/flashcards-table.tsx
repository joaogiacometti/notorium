"use client";

import { useTranslations } from "next-intl";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { FlashcardsTableRowActions } from "@/components/flashcards-table-row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FlashcardEntity } from "@/lib/api/contracts";

const PAGE_SIZE = 25;

interface FlashcardsTableProps {
  flashcards: FlashcardEntity[];
  setFlashcards: Dispatch<SetStateAction<FlashcardEntity[]>>;
}

export function FlashcardsTable({
  flashcards,
  setFlashcards,
}: Readonly<FlashcardsTableProps>) {
  const t = useTranslations("FlashcardsList");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredFlashcards =
    normalizedSearch.length === 0
      ? flashcards
      : flashcards.filter((card) => {
          return (
            card.front.toLowerCase().includes(normalizedSearch) ||
            card.back.toLowerCase().includes(normalizedSearch)
          );
        });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFlashcards.length / PAGE_SIZE),
  );
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * PAGE_SIZE;
  const paginatedFlashcards = filteredFlashcards.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function handleUpdate(updated: FlashcardEntity) {
    setFlashcards((current) =>
      current.map((card) =>
        card.id === updated.id ? { ...card, ...updated } : card,
      ),
    );
  }

  function handleDelete(id: string) {
    setFlashcards((current) => current.filter((card) => card.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          id="flashcards-search"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setPage(1);
          }}
          placeholder={t("search_placeholder")}
          className="sm:max-w-sm"
        />
        <p className="text-sm text-muted-foreground">
          {t("results_count", {
            filtered: filteredFlashcards.length,
            total: flashcards.length,
          })}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[55%]">{t("table_front")}</TableHead>
            <TableHead>{t("table_back")}</TableHead>
            <TableHead className="w-22 text-right">
              {t("table_actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedFlashcards.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                {t("no_results")}
              </TableCell>
            </TableRow>
          ) : (
            paginatedFlashcards.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-0">
                  <p className="truncate font-medium">{item.front}</p>
                </TableCell>
                <TableCell className="max-w-0 text-muted-foreground">
                  <p className="truncate">{item.back}</p>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <FlashcardsTableRowActions
                      flashcard={item}
                      onUpdated={handleUpdate}
                      onDeleted={handleDelete}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

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
  );
}
