import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";

/**
 * Returns the shared set of Tiptap table extensions used by both the editor
 * and the read-only renderer.
 * @example extensions: [...buildTableExtensions()]
 */
export function buildTableExtensions() {
  return [
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
  ] as const;
}
