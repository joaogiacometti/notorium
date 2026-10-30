"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { PdfReader as PdfReaderType } from "@/components/pdfs/pdf-reader";

type LazyPdfReaderProps = ComponentProps<typeof PdfReaderType>;

// pdf.js needs browser APIs and is large, so it loads only on PDF pages.
export const LazyPdfReader = dynamic<LazyPdfReaderProps>(
  () => import("@/components/pdfs/pdf-reader").then((m) => m.PdfReader),
  { ssr: false },
);
