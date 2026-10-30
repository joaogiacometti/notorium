"use client";

import { Check, Clock } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface StudyLaterMenuItemProps {
  marked: boolean;
  onSelect: () => void;
}

/**
 * The one Study later toggle shared by the review, manage, and detail menus.
 * A checkable item with a fixed label keeps the menu narrow; the trailing
 * check carries the marked state.
 */
export function StudyLaterMenuItem({
  marked,
  onSelect,
}: Readonly<StudyLaterMenuItemProps>) {
  return (
    <DropdownMenuItem
      role="menuitemcheckbox"
      aria-checked={marked}
      onClick={onSelect}
      className="cursor-pointer"
    >
      <Clock className="size-4" />
      Study later
      {marked ? <Check className="ml-auto size-4" /> : null}
    </DropdownMenuItem>
  );
}
