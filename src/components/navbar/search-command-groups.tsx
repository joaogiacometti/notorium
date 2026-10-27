"use client";

import {
  type SearchCommand,
  type SearchCommandAction,
  searchCommandGroupOrder,
} from "@/components/navbar/search-commands";
import { CommandGroup, CommandItem } from "@/components/ui/command";

interface SearchCommandGroupsProps {
  commands: SearchCommand[];
  onRun: (action: SearchCommandAction) => void;
}

/**
 * Renders commands grouped by command section, skipping empty groups.
 *
 * @example
 * <SearchCommandGroups commands={filterSearchCommands(query)} onRun={runAction} />
 */
export function SearchCommandGroups({
  commands,
  onRun,
}: Readonly<SearchCommandGroupsProps>) {
  return searchCommandGroupOrder.map((group) => {
    const groupCommands = commands.filter((command) => command.group === group);
    if (groupCommands.length === 0) {
      return null;
    }
    return (
      <CommandGroup key={group} heading={group}>
        {groupCommands.map((command) => (
          <SearchCommandItem key={command.id} command={command} onRun={onRun} />
        ))}
      </CommandGroup>
    );
  });
}

interface SearchCommandItemProps {
  command: SearchCommand;
  onRun: (action: SearchCommandAction) => void;
}

function SearchCommandItem({
  command,
  onRun,
}: Readonly<SearchCommandItemProps>) {
  const Icon = command.icon;
  return (
    <CommandItem
      value={`command:${command.id}`}
      onSelect={() => onRun(command.action)}
      className="cursor-pointer gap-2"
    >
      <Icon className="size-4! text-muted-foreground" />
      <span>{command.label}</span>
    </CommandItem>
  );
}
