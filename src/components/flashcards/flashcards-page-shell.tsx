import { Layers3 } from "lucide-react";
import type { ReactNode } from "react";
import type { FlashcardsView } from "@/features/flashcards/view";
import { FlashcardsViewSwitch } from "./flashcards-view-switch";

interface FlashcardsPageShellProps {
  children: ReactNode;
  currentView: FlashcardsView;
  description: string;
  headerMeta?: string;
  manageLabel: string;
  reviewLabel: string;
  subjectId?: string;
  title: string;
}

export function FlashcardsPageShell({
  children,
  currentView,
  description,
  headerMeta,
  manageLabel,
  reviewLabel,
  subjectId,
  title,
}: Readonly<FlashcardsPageShellProps>) {
  return (
    <main>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-3 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers3 className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              {description}
            </p>
            {headerMeta ? (
              <p className="mt-2 text-sm font-medium text-foreground">
                {headerMeta}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mb-6">
          <FlashcardsViewSwitch
            currentView={currentView}
            manageLabel={manageLabel}
            reviewLabel={reviewLabel}
            subjectId={subjectId}
          />
        </div>

        {children}
      </div>
    </main>
  );
}
