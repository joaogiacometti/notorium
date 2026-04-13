"use client";

import { useSearchParams } from "next/navigation";
import { FlashcardsHubLoadingContent } from "@/components/flashcards/shared/flashcards-hub-loading-content";

export function FlashcardsHubLoading() {
  const searchParams = useSearchParams();

  return <FlashcardsHubLoadingContent view={searchParams.get("view")} />;
}
