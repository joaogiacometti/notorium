"use client";

import dynamic from "next/dynamic";
import type { BookReaderProps } from "@/components/library/book-reader-surface";

// EmbedPDF's pdfium engine is WebAssembly that loads and runs only in the
// browser, so it cannot be server-rendered. Loading the surface with ssr:false
// keeps the engine off the server while the page stays a Server Component.
const BookReaderSurface = dynamic(
  () =>
    import("@/components/library/book-reader-surface").then(
      (module) => module.BookReaderSurface,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-svh items-center justify-center text-sm text-muted-foreground">
        Loading book…
      </div>
    ),
  },
);

export function BookReader(props: Readonly<BookReaderProps>) {
  return <BookReaderSurface {...props} />;
}
