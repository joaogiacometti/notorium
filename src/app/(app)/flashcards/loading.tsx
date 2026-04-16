"use client";

import { useSearchParams } from "next/navigation";
import { FlashcardsHubLoadingContent } from "@/components/flashcards/shared/flashcards-hub-loading-content";

export default function FlashcardsLoading() {
  const searchParams = useSearchParams();

  return <FlashcardsHubLoadingContent view={searchParams.get("view")} />;
}
