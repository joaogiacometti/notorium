"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { TiptapEditor as TiptapEditorType } from "@/components/shared/tiptap-editor";

type LazyTiptapEditorProps = ComponentProps<typeof TiptapEditorType>;

export const LazyTiptapEditor = dynamic<LazyTiptapEditorProps>(
  () => import("@/components/shared/tiptap-editor").then((m) => m.TiptapEditor),
  { ssr: false },
);
