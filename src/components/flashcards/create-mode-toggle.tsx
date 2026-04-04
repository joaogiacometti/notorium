"use client";

import { Button } from "@/components/ui/button";

interface ModeOption<T extends string> {
  value: T;
  label: string;
}

interface CreateModeToggleProps<T extends string> {
  mode: T;
  onModeChange: (mode: T) => void;
  disabled?: boolean;
  options?: ModeOption<T>[];
}

export function CreateModeToggle<T extends string>({
  mode,
  onModeChange,
  disabled,
  options = [
    { value: "single" as T, label: "Single" },
    { value: "ai" as T, label: "Multiple" },
  ],
}: Readonly<CreateModeToggleProps<T>>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Type</span>
      <div className="flex w-fit rounded-lg border p-0.5">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={mode === option.value ? "secondary" : "ghost"}
            size="sm"
            className="rounded-md px-3"
            onClick={() => onModeChange(option.value)}
            disabled={disabled}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
