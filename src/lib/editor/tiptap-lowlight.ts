import { common, createLowlight } from "lowlight";

export const tiptapLowlight = createLowlight(common);

tiptapLowlight.registerAlias({
  csharp: ["c#", "C#", "cs", "CSharp"],
  java: ["Java"],
});
