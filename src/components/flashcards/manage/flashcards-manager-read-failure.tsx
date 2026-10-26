import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";

interface FlashcardsManagerReadFailureProps {
  message: string;
  retrying: boolean;
  onRetry: () => void;
  onDismiss?: () => void;
}

export function FlashcardsManagerReadFailure({
  message,
  retrying,
  onRetry,
  onDismiss,
}: Readonly<FlashcardsManagerReadFailureProps>) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-(--intent-danger-border) bg-(--intent-danger-bg) px-4 py-3 text-sm text-(--intent-danger-text)"
    >
      <p className="min-w-0 flex-1">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={retrying}
        onClick={onRetry}
      >
        <AsyncButtonContent
          pending={retrying}
          idleLabel="Retry"
          pendingLabel="Retrying..."
        />
      </Button>
      {onDismiss ? (
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      ) : null}
    </div>
  );
}
