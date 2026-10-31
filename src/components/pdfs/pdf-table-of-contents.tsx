"use client";

import { ChevronRight } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useId, useRef, useState } from "react";
import { resolvePdfContentsPage } from "@/components/pdfs/pdf-contents-destination";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PdfContentsItem {
  title: string;
  dest: unknown;
  count?: number;
  items: PdfContentsItem[];
}

type PdfContentsItems = PdfContentsItem[];
type PdfContentsLoad =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; items: PdfContentsItems };

interface PdfTableOfContentsProps {
  pdfDocument: Pick<
    PDFDocumentProxy,
    "numPages" | "getDestination" | "getPageIndex"
  > & {
    getOutline: () => Promise<PdfContentsItems | null>;
  };
  onNavigate: (page: number) => void;
}

export function PdfTableOfContents({
  pdfDocument,
  onNavigate,
}: Readonly<PdfTableOfContentsProps>) {
  const [attempt, setAttempt] = useState(0);
  return (
    <Card
      id="pdf-table-of-contents"
      className="min-h-0 w-full gap-2 overflow-auto p-3"
    >
      <h2 className="text-sm font-medium">Table of contents</h2>
      <PdfContentsBody
        key={attempt}
        pdfDocument={pdfDocument}
        onNavigate={onNavigate}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    </Card>
  );
}

interface PdfContentsBodyProps extends PdfTableOfContentsProps {
  onRetry: () => void;
}

function PdfContentsBody({
  pdfDocument,
  onNavigate,
  onRetry,
}: Readonly<PdfContentsBodyProps>) {
  const [contents, setContents] = useState<PdfContentsLoad>({
    status: "loading",
  });
  const [pendingDestination, setPendingDestination] = useState<unknown>(null);
  const [navigationFailed, setNavigationFailed] = useState(false);
  const requestGenerationRef = useRef<symbol | null>(null);
  const navigating = pendingDestination !== null;

  useEffect(() => {
    const generation = Symbol("pdf-contents-request");
    requestGenerationRef.current = generation;
    setContents({ status: "loading" });
    setPendingDestination(null);
    setNavigationFailed(false);
    pdfDocument.getOutline().then(
      (items) => {
        if (requestGenerationRef.current === generation)
          setContents({ status: "ready", items: items ?? [] });
      },
      () => {
        if (requestGenerationRef.current === generation)
          setContents({ status: "failed" });
      },
    );
    return () => {
      requestGenerationRef.current = null;
    };
  }, [pdfDocument]);

  async function navigateToContents(destination: unknown): Promise<void> {
    const generation = requestGenerationRef.current;
    if (!generation || navigating) return;
    setPendingDestination(destination);
    setNavigationFailed(false);
    try {
      const page = await resolvePdfContentsPage(pdfDocument, destination);
      if (requestGenerationRef.current === generation) onNavigate(page);
    } catch {
      if (requestGenerationRef.current === generation)
        setNavigationFailed(true);
    } finally {
      if (requestGenerationRef.current === generation)
        setPendingDestination(null);
    }
  }

  return (
    <>
      {contents.status === "loading" && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading table of contents…
        </p>
      )}
      {contents.status === "failed" && (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-muted-foreground">
            Couldn't load the table of contents.
          </p>
          <Button variant="ghost" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
      {contents.status === "ready" && contents.items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          This PDF has no embedded table of contents.
        </p>
      )}
      {contents.status === "ready" && contents.items.length > 0 && (
        <nav
          aria-label="Table of contents"
          aria-busy={navigating}
          className="min-h-0 flex-1 overflow-auto"
        >
          <PdfContentsList
            items={contents.items}
            navigating={navigating}
            pendingDestination={pendingDestination}
            onSelect={navigateToContents}
          />
        </nav>
      )}
      {navigationFailed && (
        <p role="alert" className="text-sm text-muted-foreground">
          Couldn't open this section. Try another entry or use the page
          controls.
        </p>
      )}
    </>
  );
}

interface PdfContentsListProps {
  items: PdfContentsItems;
  navigating: boolean;
  pendingDestination: unknown;
  onSelect: (destination: unknown) => Promise<void>;
}

function PdfContentsList({
  items,
  navigating,
  pendingDestination,
  onSelect,
}: Readonly<PdfContentsListProps>) {
  return (
    <ul className="space-y-1">
      {items.map((item, index) => (
        <PdfContentsEntry
          // biome-ignore lint/suspicious/noArrayIndexKey: PDF outline order is immutable; indices disambiguate repeated titles and destinations
          key={`${index}-${item.title}`}
          item={item}
          navigating={navigating}
          pendingDestination={pendingDestination}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

interface PdfContentsEntryProps extends Omit<PdfContentsListProps, "items"> {
  item: PdfContentsItem;
}

function PdfContentsEntry({
  item,
  navigating,
  pendingDestination,
  onSelect,
}: Readonly<PdfContentsEntryProps>) {
  const [expanded, setExpanded] = useState((item.count ?? 0) >= 0);
  const sectionsId = useId();
  const hasSections = item.items.length > 0;
  return (
    <li>
      <div className="flex min-w-0 items-start gap-1">
        {hasSections && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${item.title} sections`}
            aria-expanded={expanded}
            aria-controls={sectionsId}
            onClick={() => setExpanded((open) => !open)}
          >
            <ChevronRight className={cn("size-4", expanded && "rotate-90")} />
          </Button>
        )}
        {item.dest ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto min-h-8 min-w-0 flex-1 justify-start whitespace-normal text-left"
            disabled={navigating}
            onClick={() => void onSelect(item.dest)}
          >
            <span className="min-w-0 wrap-anywhere">
              <AsyncButtonContent
                pending={navigating && pendingDestination === item.dest}
                idleLabel={item.title}
                pendingLabel="Opening section…"
              />
            </span>
          </Button>
        ) : (
          <span className="min-w-0 flex-1 wrap-anywhere px-3 py-1 text-sm text-muted-foreground">
            {item.title}
          </span>
        )}
      </div>
      {hasSections && (
        <div id={sectionsId} hidden={!expanded} className="pl-4">
          <PdfContentsList
            items={item.items}
            navigating={navigating}
            pendingDestination={pendingDestination}
            onSelect={onSelect}
          />
        </div>
      )}
    </li>
  );
}
