"use client";

import { useEffect, useRef } from "react";
import {
  type PaletteAction,
  type PaletteCommand,
  paletteCommands,
  paletteGroupOrder,
} from "@/components/navbar/command-palette-commands";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface PaletteSearchInputProps {
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * Search box that grabs focus on mount so the palette accepts typing
 * immediately after it opens.
 *
 * @example
 * <PaletteSearchInput placeholder="Type a command..." value={s} onValueChange={setS} />
 */
function PaletteSearchInput({
  placeholder,
  value,
  onValueChange,
}: Readonly<PaletteSearchInputProps>) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <CommandInput
      ref={inputRef}
      placeholder={placeholder}
      value={value}
      onValueChange={onValueChange}
    />
  );
}

interface RootPageProps {
  search: string;
  onSearchChange: (value: string) => void;
  onRun: (action: PaletteAction) => void;
}

/**
 * Renders the top-level command list grouped by palette section.
 *
 * @example
 * <RootPage search="" onSearchChange={setSearch} onRun={runAction} />
 */
export function RootPage({
  search,
  onSearchChange,
  onRun,
}: Readonly<RootPageProps>) {
  return (
    <>
      <PaletteSearchInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={onSearchChange}
      />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        {paletteGroupOrder.map((group) => (
          <CommandGroup key={group} heading={group}>
            {paletteCommands
              .filter((command) => command.group === group)
              .map((command) => (
                <PaletteCommandItem
                  key={command.id}
                  command={command}
                  onRun={onRun}
                />
              ))}
          </CommandGroup>
        ))}
      </CommandList>
    </>
  );
}

interface PaletteCommandItemProps {
  command: PaletteCommand;
  onRun: (action: PaletteAction) => void;
}

function PaletteCommandItem({
  command,
  onRun,
}: Readonly<PaletteCommandItemProps>) {
  const Icon = command.icon;
  return (
    <CommandItem
      value={command.label}
      keywords={command.keywords}
      onSelect={() => onRun(command.action)}
      className="cursor-pointer gap-2"
    >
      <Icon className="size-4! text-muted-foreground" />
      <span>{command.label}</span>
    </CommandItem>
  );
}
