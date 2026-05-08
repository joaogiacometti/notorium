"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { FlashcardOptimizationCard as FlashcardOptimizationCardType } from "@/components/account/flashcard-optimization-card";

type LazyFlashcardOptimizationCardProps = ComponentProps<
  typeof FlashcardOptimizationCardType
>;

export const LazyFlashcardOptimizationCard =
  dynamic<LazyFlashcardOptimizationCardProps>(
    () =>
      import("@/components/account/flashcard-optimization-card").then(
        (m) => m.FlashcardOptimizationCard,
      ),
    { ssr: false },
  );
