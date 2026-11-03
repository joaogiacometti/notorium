import { getNoteLinkHref } from "@/lib/editor/note-links";
import { NoteLink } from "@/lib/editor/tiptap-note-link";
import type { NoteConnections } from "@/lib/server/api-contracts";

const LINK_CLASS =
  "font-medium text-primary underline-offset-4 hover:underline cursor-pointer";
const MISSING_CLASS = "text-muted-foreground line-through";

/**
 * Current link targets for one editor. Node views subscribe directly because
 * they live outside React.
 *
 * @example const store = createNoteLinkTargetStore();
 */
export function createNoteLinkTargetStore() {
  let targets: NoteConnections | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => targets,
    set(next: NoteConnections | null) {
      targets = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

type NoteLinkTargetStore = ReturnType<typeof createNoteLinkTargetStore>;

interface EditableNoteLinkOptions {
  targets: NoteLinkTargetStore | null;
  navigate: ((href: string) => void) | null;
}

function isPlainLeftClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * The note link node with an interactive view, for editable surfaces. This is
 * a DOM view on purpose: a React node view renders through `flushSync`, which
 * React rejects when an effect dispatches a transaction that touches the node.
 */
export const EditableNoteLink = NoteLink.extend<EditableNoteLinkOptions>({
  addOptions() {
    return { targets: null, navigate: null };
  },

  addNodeView() {
    const { targets, navigate } = this.options;

    return ({ node: initialNode }) => {
      let node = initialNode;
      const dom = document.createElement("a");

      const sync = () => {
        const noteId: string = node.attrs.noteId;
        const current = targets?.get();
        const missing = current?.missingIds.includes(noteId) ?? false;
        const target = current?.outgoing.find((item) => item.id === noteId);

        dom.textContent = target?.title ?? node.attrs.label;
        dom.className = missing ? MISSING_CLASS : LINK_CLASS;
        if (missing) {
          dom.removeAttribute("href");
          dom.title = "This note no longer exists";
        } else {
          dom.href = getNoteLinkHref(noteId);
          dom.removeAttribute("title");
        }
      };

      const onClick = (event: MouseEvent) => {
        const href = dom.getAttribute("href");
        if (!href || !navigate || !isPlainLeftClick(event)) return;
        event.preventDefault();
        navigate(href);
      };

      sync();
      dom.addEventListener("click", onClick);
      const unsubscribe = targets?.subscribe(sync);

      return {
        dom,
        update(nextNode) {
          if (nextNode.type !== node.type) return false;
          node = nextNode;
          sync();
          return true;
        },
        ignoreMutation: () => true,
        destroy() {
          dom.removeEventListener("click", onClick);
          unsubscribe?.();
        },
      };
    };
  },
});
