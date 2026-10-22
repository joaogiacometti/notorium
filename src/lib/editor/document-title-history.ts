import { Extension } from "@tiptap/core";

/** Keep the note title in editor history without serializing it into HTML.
 * @example extensions: [DocumentTitleHistory];
 */
export const DocumentTitleHistory = Extension.create({
  name: "documentTitleHistory",
  addGlobalAttributes() {
    return [
      {
        types: ["doc"],
        attributes: { documentTitle: { default: null, rendered: false } },
      },
    ];
  },
});
