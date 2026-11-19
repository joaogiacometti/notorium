"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTimeZone } from "@/app/actions/account";
import { SettingsCard } from "@/components/account/settings-section";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "@/components/ui/popover";
import { invalidateAccountSettings } from "@/lib/client-cache/invalidation";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

function zoneLabel(zone: string): string {
  return zone.replaceAll("_", " ");
}

function utcOffset(zone: string, at: Date): string {
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(at)
    .find((part) => part.type === "timeZoneName")?.value;
  return offset === "GMT" ? "GMT+0" : (offset ?? "");
}

function localTime(zone: string, at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
}

export function TimeZoneCard({
  timeZone,
  options,
}: Readonly<{ timeZone: string; options: string[] }>) {
  const [open, setOpen] = useState(false);
  const [now] = useState(() => new Date());
  const [saving, startSaving] = useTransition();
  const queryClient = useQueryClient();
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const suggestDevice = deviceZone !== timeZone && options.includes(deviceZone);

  function selectTimeZone(zone: string) {
    setOpen(false);
    if (zone === timeZone) return;

    startSaving(async () => {
      try {
        const result = await updateTimeZone(zone);
        if (!result.success) {
          toast.error(resolveActionErrorMessage(result));
          return;
        }
        await invalidateAccountSettings(queryClient);
        toast.success("Time zone saved.");
      } catch {
        toast.error("Couldn't save your time zone. Try again.");
      }
    });
  }

  return (
    <SettingsCard
      title="Time zone"
      description="Sets when your day starts for review activity, streaks, and dates."
      keywords="timezone region utc clock date"
      control={
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              aria-label={`Time zone: ${timeZone}`}
              disabled={saving}
              className="w-60 justify-between"
            >
              <span className="truncate">
                {saving ? "Saving…" : zoneLabel(timeZone)}
              </span>
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {utcOffset(timeZone, now)}
              </span>
              <ChevronsUpDown aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent align="end">
              <Command label="Time zones">
                <CommandInput placeholder="Search time zones…" />
                <CommandList>
                  <CommandEmpty>No matching time zones.</CommandEmpty>
                  {options.map((zone) => (
                    <CommandItem
                      key={zone}
                      value={zone}
                      keywords={[zoneLabel(zone)]}
                      onSelect={() => selectTimeZone(zone)}
                    >
                      <span className="truncate">{zoneLabel(zone)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {utcOffset(zone, now)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      }
    >
      <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground">
        <p>Your time now: {localTime(timeZone, now)}</p>
        {suggestDevice ? (
          <Button
            type="button"
            variant="link"
            disabled={saving}
            onClick={() => selectTimeZone(deviceZone)}
            className="h-auto p-0"
          >
            Use device time zone ({zoneLabel(deviceZone)})
          </Button>
        ) : null}
      </div>
    </SettingsCard>
  );
}
