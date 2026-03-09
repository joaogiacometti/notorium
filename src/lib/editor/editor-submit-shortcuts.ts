interface GetEditorSubmitShortcutActionInput {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export function shouldSubmitEditorOnCtrlEnter({
  key,
  ctrlKey,
  altKey,
  metaKey,
  shiftKey,
}: GetEditorSubmitShortcutActionInput): boolean {
  return key === "Enter" && ctrlKey && !altKey && !metaKey && !shiftKey;
}
