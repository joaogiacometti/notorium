"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { TiptapRenderer as TiptapRendererType } from "@/components/shared/tiptap-renderer";

type LazyTiptapRendererProps = ComponentProps<typeof TiptapRendererType>;

export const LazyTiptapRenderer = dynamic<LazyTiptapRendererProps>(
  () =>
    import("@/components/shared/tiptap-renderer").then((m) => m.TiptapRenderer),
  { ssr: false },
);
