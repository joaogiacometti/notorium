"use client";

import { GraduationCap, type LucideIcon, SquarePen } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import {
  Command,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

export type AssistantCommandName = "/new" | "/learn";

interface AssistantCommand {
  name: AssistantCommandName;
  label: string;
  description: string;
  icon: LucideIcon;
}

const ASSISTANT_COMMANDS: readonly AssistantCommand[] = [
  {
    name: "/new",
    label: "New chat",
    description: "Clear this conversation",
    icon: SquarePen,
  },
  {
    name: "/learn",
    label: "Learn a topic",
    description: "Guided lesson with questions along the way",
    icon: GraduationCap,
  },
];

/**
 * Commands offered for a draft that is a single slash-prefixed word, such as
 * `/` or `/le`. Anything after a space is ordinary text, so the menu closes
 * once the user starts typing a topic.
 * @example matchAssistantCommands("/l"); // ["/learn"]
 */
export function matchAssistantCommands(draft: string): AssistantCommandName[] {
  const token = draft.trimStart();
  if (!/^\/\S*$/.test(token)) return [];
  return ASSISTANT_COMMANDS.filter((command) =>
    command.name.startsWith(token),
  ).map((command) => command.name);
}

export interface AssistantCommandMenuIds {
  list: string;
  option: string;
}

interface AssistantCommandMenuProps {
  commands: readonly AssistantCommandName[];
  active: AssistantCommandName;
  onActiveChange: (command: AssistantCommandName) => void;
  onIdsChange: (ids: AssistantCommandMenuIds) => void;
  onSelect: (command: AssistantCommandName) => void;
}

export function AssistantCommandMenu({
  commands,
  active,
  onActiveChange,
  onIdsChange,
  onSelect,
}: Readonly<AssistantCommandMenuProps>) {
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<string, HTMLDivElement>());
  useLayoutEffect(() => {
    const option = optionRefs.current.get(active);
    if (!listRef.current || !option) return;
    onIdsChange({ list: listRef.current.id, option: option.id });
  }, [active, onIdsChange]);

  return (
    <Command
      shouldFilter={false}
      value={active}
      onValueChange={(value) => {
        const match = commands.find((command) => command === value);
        if (match) onActiveChange(match);
      }}
      label="Assistant commands"
      tabIndex={-1}
      className="mb-2 h-auto border"
    >
      <CommandList ref={listRef} label="Assistant commands" className="p-1">
        {ASSISTANT_COMMANDS.filter((command) =>
          commands.includes(command.name),
        ).map(({ name, label, description, icon: Icon }) => (
          <CommandItem
            key={name}
            ref={(node) => {
              if (node) optionRefs.current.set(name, node);
              else optionRefs.current.delete(name);
            }}
            value={name}
            onSelect={() => onSelect(name)}
            onMouseDown={(event) => event.preventDefault()}
            className="cursor-pointer gap-2"
          >
            <Icon className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block">{label}</span>
              <span className="block text-xs text-muted-foreground">
                {description}
              </span>
            </span>
            <CommandShortcut className="font-mono tracking-normal">
              {name}
            </CommandShortcut>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}
