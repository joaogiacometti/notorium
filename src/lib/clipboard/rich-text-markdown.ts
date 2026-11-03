import type { JSONContent } from "@tiptap/core";
import type { RichTextDocument } from "@/lib/editor/document";
import { getNoteLinkHref } from "@/lib/editor/note-links";

/** Export native document nodes directly; attachment URLs never leave the app. */
export function richTextToMarkdown(document: RichTextDocument): string {
  return blocks(document.content).trim();
}

function blocks(nodes: JSONContent[]): string {
  return nodes.map(render).filter(Boolean).join("\n\n");
}

function fence(text: string, minimum: number): string {
  const longest = Math.max(
    0,
    ...(text.match(/`+/g) ?? []).map((run) => run.length),
  );
  return "`".repeat(Math.max(minimum, longest + 1));
}

function marked(node: JSONContent): string {
  let result = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "code") {
      const delimiter = fence(result, 1);
      result = `${delimiter}${result}${delimiter}`;
    } else if (mark.type === "link") {
      result = `[${result}](${mark.attrs?.href ?? ""})`;
    } else {
      const marker = { bold: "**", italic: "*", strike: "~~" }[mark.type];
      if (marker)
        result = result.replace(
          /^(\s*)([\s\S]*?)(\s*)$/,
          (_, before, text, after) =>
            `${before}${marker}${text}${marker}${after}`,
        );
    }
  }
  return result;
}

function list(node: JSONContent): string {
  return (node.content ?? [])
    .map((item, index) => {
      const prefix =
        node.type === "orderedList"
          ? `${(node.attrs?.start ?? 1) + index}.`.padEnd(4)
          : "-   ";
      const children = item.content ?? [];
      const loose =
        children.filter((child) => child.type === "paragraph").length > 1;
      const body = children.map(render).join(loose ? "\n\n" : "\n");
      const checkbox =
        item.type === "taskItem" ? `[${item.attrs?.checked ? "x" : " "}] ` : "";
      return prefix + (checkbox + body).replaceAll("\n", "\n    ");
    })
    .join("\n");
}

function table(node: JSONContent): string {
  const rows = node.content ?? [];
  if (
    rows.some((row) =>
      row.content?.some((cell) =>
        cell.content?.some((child) => child.type === "table"),
      ),
    )
  ) {
    function flatten(value: JSONContent): string {
      if (
        ["table", "tableRow", "tableCell", "tableHeader"].includes(
          value.type ?? "",
        )
      )
        return (value.content ?? []).map(flatten).join("\n\n");
      return render(value);
    }
    return flatten(node);
  }
  const lines = rows.map(
    (row) =>
      `| ${(row.content ?? [])
        .map((cell) =>
          blocks(cell.content ?? [])
            .replaceAll("|", "\\|")
            .replaceAll("\n", " "),
        )
        .join(" | ")} |`,
  );
  if (!lines.length) return "";
  lines.splice(
    1,
    0,
    `| ${(rows[0].content ?? []).map(() => "---").join(" | ")} |`,
  );
  return lines.join("\n");
}

function render(node: JSONContent): string {
  const inline = () => (node.content ?? []).map(render).join("");
  switch (node.type) {
    case "text":
      return marked(node);
    case "paragraph":
      return inline();
    case "heading":
      return `${"#".repeat(node.attrs?.level ?? 1)} ${inline()}`;
    case "hardBreak":
      return "  \n";
    case "horizontalRule":
      return "---";
    case "inlineMath":
      return `$${node.attrs?.latex ?? ""}$`;
    case "blockMath":
      return `$$${node.attrs?.latex ?? ""}$$`;
    case "noteLink":
      return `[${node.attrs?.label ?? ""}](${getNoteLinkHref(node.attrs?.noteId)})`;
    case "image":
      return /^https?:\/\//i.test(node.attrs?.src ?? "")
        ? `![${node.attrs?.alt ?? ""}](${node.attrs?.src})`
        : "[Image]";
    case "codeBlock": {
      const code = inline().replace(/\n$/, "");
      const delimiter = fence(code, 3);
      return `${delimiter}${node.attrs?.language === "plaintext" ? "" : (node.attrs?.language ?? "")}\n${code}\n${delimiter}`;
    }
    case "blockquote":
      return blocks(node.content ?? [])
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "bulletList":
    case "orderedList":
    case "taskList":
      return list(node);
    case "table":
      return table(node);
    default:
      return blocks(node.content ?? []);
  }
}
