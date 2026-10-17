// The Joplin-maintained fork of turndown-plugin-gfm ships no type declarations.
declare module "@joplin/turndown-plugin-gfm" {
  import type TurndownService from "turndown";

  export const gfm: TurndownService.Plugin;
}
