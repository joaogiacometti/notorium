"use client";

import { useSearchParams } from "next/navigation";
import { FlashcardsHubLoadingContent } from "./flashcards-hub-loading-content";

export function FlashcardsHubLoading() {
  const searchParams = useSearchParams();

  return <FlashcardsHubLoadingContent view={searchParams.get("view")} />;
}
