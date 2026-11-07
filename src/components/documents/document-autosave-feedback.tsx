import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";

interface DocumentAutosaveFeedbackProps {
  isSaving: boolean;
  hasError: boolean;
  retry: () => void;
}

export function DocumentAutosaveFeedback({
  isSaving,
  hasError,
  retry,
}: Readonly<DocumentAutosaveFeedbackProps>) {
  if (!isSaving && !hasError) return null;
  return (
    <div role="status" className="text-sm text-muted-foreground">
      {/* h-10 matches the size-10 header actions beside it. */}
      <Button
        type="button"
        variant="outline"
        className="h-10"
        disabled={isSaving}
        onClick={retry}
      >
        <AsyncButtonContent
          pending={isSaving}
          idleLabel="Retry save"
          pendingLabel="Saving…"
        />
      </Button>
    </div>
  );
}
