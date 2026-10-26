import { useEffect, useEffectEvent } from "react";

/** Cmd/Ctrl+J toggles the assistant, also from editable fields and inside the panel.
 * @example useAssistantToggleShortcut(() => setOpen(!open));
 */
export function useAssistantToggleShortcut(toggle: () => void) {
  const onToggle = useEffectEvent(toggle);
  useEffect(() => {
    // Capture phase: the assistant panel stops keydown propagation.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "j") return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.altKey || event.shiftKey) return;
      event.preventDefault();
      onToggle();
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);
}
