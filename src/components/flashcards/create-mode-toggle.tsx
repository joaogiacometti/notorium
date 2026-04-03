"use client";

import { Button } from "@/components/ui/button";

interface CreateModeToggleProps {
  mode: "single" | "ai";
  onModeChange: (mode: "single" | "ai") => void;
  disabled?: boolean;
}

export function CreateModeToggle({
  mode,
  onModeChange,
  disabled,
}: Readonly<CreateModeToggleProps>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Type</span>
      <div className="flex w-fit rounded-lg border p-0.5">
        <Button
          type="button"
          variant={mode === "single" ? "secondary" : "ghost"}
          size="sm"
          className="rounded-md px-3"
          onClick={() => onModeChange("single")}
          disabled={disabled}
        >
          Single
        </Button>
        <Button
          type="button"
          variant={mode === "ai" ? "secondary" : "ghost"}
          size="sm"
          className="rounded-md px-3"
          onClick={() => onModeChange("ai")}
          disabled={disabled}
        >
          Multiple
        </Button>
      </div>
    </div>
  );
}
