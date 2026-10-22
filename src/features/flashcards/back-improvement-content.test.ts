import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeBackImprovement {
  output = "";
  prompts: string[] = [];
  generate = async (options: {
    prompt: string;
  }): Promise<{ backText: string }> => {
    this.prompts.push(options.prompt);
    return { backText: this.output };
  };
}
const generator = vi.hoisted(() => ({
  current: null as FakeBackImprovement | null,
}));
vi.mock("@/lib/ai/generate-structured", () => ({
  generateStructuredOutput: (options: { prompt: string }) =>
    generator.current?.generate(options),
}));
const settings = {
  apiKey: "test",
  model: "test",
  reasoningEffort: "none" as const,
};

describe("back improvement content", () => {
  beforeEach(() => {
    generator.current = new FakeBackImprovement();
  });
  it("accepts an already concise answer unchanged", async () => {
    if (!generator.current) throw new Error("Expected fake generator");
    generator.current.output = "Absorve luz.";
    const { improveFlashcardBackContent } = await import(
      "@/features/flashcards/ai"
    );
    const back = await improveFlashcardBackContent({
      settings,
      front: "<p>Clorofila?</p>",
      currentBack: "<p>Absorve luz.</p>",
    });
    expect(back).toBe("<p>Absorve luz.</p>");
  });
  it("renders supported math and code and restores images without exposing their locations", async () => {
    if (!generator.current) throw new Error("Expected fake generator");
    generator.current.output =
      "- Use $x^2$.\n- Keep `a - b` literal.\n\n{{IMAGE_0}}";
    const { improveFlashcardBackContent } = await import(
      "@/features/flashcards/ai"
    );
    const image =
      '<img src="/api/attachments/blob?pathname=test/image.webp" alt="Graph">';
    const back = await improveFlashcardBackContent({
      settings,
      front: "<p>Cue</p>",
      currentBack: `<p>Answer</p>${image}`,
    });
    expect(back).toContain('data-type="inline-math"');
    expect(back).toContain('data-latex="x^2"');
    expect(back).toContain("<code>a - b</code>");
    expect(back).toContain(image);
    expect(generator.current.prompts[0]).toContain("{{IMAGE_0}}");
    expect(generator.current.prompts[0]).not.toContain("test/image.webp");
  });
});
