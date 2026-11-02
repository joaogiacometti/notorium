"use client";

import { SquarePen } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import {
  Command,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

export interface AssistantCommandMenuIds {
  list: string;
  option: string;
}

interface AssistantCommandMenuProps {
  onIdsChange: (ids: AssistantCommandMenuIds) => void;
  onNewChat: () => void;
}

export function AssistantCommandMenu({
  onIdsChange,
  onNewChat,
}: Readonly<AssistantCommandMenuProps>) {
  const listRef = useRef<HTMLDivElement>(null);
  const optionRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!listRef.current || !optionRef.current) return;
    onIdsChange({ list: listRef.current.id, option: optionRef.current.id });
  }, [onIdsChange]);

  return (
    <Command
      shouldFilter={false}
      value="/new"
      label="Assistant commands"
      tabIndex={-1}
      className="mb-2 h-auto border"
    >
      <CommandList ref={listRef} label="Assistant commands" className="p-1">
        <CommandItem
          ref={optionRef}
          value="/new"
          onSelect={onNewChat}
          onMouseDown={(event) => event.preventDefault()}
          className="cursor-pointer gap-2"
        >
          <SquarePen className="size-4 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block">New chat</span>
            <span className="block text-xs text-muted-foreground">
              Clear this conversation
            </span>
          </span>
          <CommandShortcut className="font-mono tracking-normal">
            /new
          </CommandShortcut>
        </CommandItem>
      </CommandList>
    </Command>
  );
}
