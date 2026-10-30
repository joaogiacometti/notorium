import { describe, expect, it } from "vitest";
import {
  mathTextToRichText,
  plainTextToRichText,
} from "@/lib/ai/plain-text-rich-text";

describe("plainTextToRichText math conversion", () => {
  it("converts inline $...$ into an inline math node", () => {
    expect(plainTextToRichText("The area is $A = \\pi r^2$ exactly")).toBe(
      '<p>The area is <span data-type="inline-math" data-latex="A = \\pi r^2"></span> exactly</p>',
    );
  });

  it("converts a standalone $$...$$ into a block math node", () => {
    expect(plainTextToRichText("$$\\int_0^1 x^2\\,dx = \\tfrac13$$")).toBe(
      '<div data-type="block-math" data-latex="\\int_0^1 x^2\\,dx = \\tfrac13"></div>',
    );
  });

  it("escapes LaTeX special characters into the data-latex attribute", () => {
    expect(plainTextToRichText("Compare $a < b & c$")).toBe(
      '<p>Compare <span data-type="inline-math" data-latex="a &lt; b &amp; c"></span></p>',
    );
  });

  it("supports math inside bullet lines", () => {
    expect(plainTextToRichText("- speed is $v = d/t$")).toBe(
      '<ul><li>speed is <span data-type="inline-math" data-latex="v = d/t"></span></li></ul>',
    );
  });

  it("leaves bare currency amounts untouched", () => {
    expect(plainTextToRichText("It costs $100$ dollars")).toBe(
      "<p>It costs $100$ dollars</p>",
    );
  });

  it("keeps surrounding prose with a block equation", () => {
    expect(
      plainTextToRichText("Newton's second law:\n\n$$F = ma$$\n\nholds"),
    ).toBe(
      '<p>Newton&#39;s second law:</p><div data-type="block-math" data-latex="F = ma"></div><p>holds</p>',
    );
  });

  it("converts fenced code blocks into rich text code blocks", () => {
    expect(
      plainTextToRichText("Example:\n\n```csharp\nclass Person\n{\n}\n```"),
    ).toBe(
      '<p>Example:</p><pre><code class="language-csharp">class Person\n{\n}</code></pre>',
    );
  });

  it.each([
    "What does `functor(filha(ana, bia), Name, Arity)` do?",
    "What does <code>functor(filha(ana, bia), Name, Arity)</code> do?",
  ])("formats inline code without displaying its delimiters: %s", (front) => {
    expect(plainTextToRichText(front)).toBe(
      "<p>What does <code>functor(filha(ana, bia), Name, Arity)</code> do?</p>",
    );
  });

  it("preserves code literally without converting dollars to math", () => {
    expect(plainTextToRichText("Use `$x$`\n\n```sh\necho '$x$'\n```")).toBe(
      '<p>Use <code>$x$</code></p><pre><code class="language-sh">echo &#39;$x$&#39;</code></pre>',
    );
  });

  it("keeps HTML examples literal inside code and escapes unsafe markup", () => {
    expect(
      plainTextToRichText(
        "`<code>x</code>` and <code><img src=x onerror=alert(1)></code>",
      ),
    ).toBe(
      "<p><code>&lt;code&gt;x&lt;/code&gt;</code> and <code>&lt;img src=x onerror=alert(1)&gt;</code></p>",
    );
    expect(plainTextToRichText("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });

  it("supports code in lists alongside math without changing either", () => {
    expect(plainTextToRichText("- `a < b`\n- $a < b$")).toBe(
      '<ul><li><code>a &lt; b</code></li><li><span data-type="inline-math" data-latex="a &lt; b"></span></li></ul>',
    );
  });
});

describe("mathTextToRichText", () => {
  it("preserves whitespace around math and escapes surrounding HTML", () => {
    expect(mathTextToRichText("  $x$ < limit  ")).toBe(
      '  <span data-type="inline-math" data-latex="x"></span> &lt; limit  ',
    );
  });
  it("uses block math nodes and leaves currency untouched", () => {
    expect(mathTextToRichText("$$x^2$$")).toBe(
      '<div data-type="block-math" data-latex="x^2"></div>',
    );
    expect(mathTextToRichText("$100$")).toBe("$100$");
  });
});

describe("plainTextToRichText structure", () => {
  it("converts paragraphs into rich text html", () => {
    const result = plainTextToRichText("Line one\nLine two");

    expect(result).toBe("<p>Line one Line two</p>");
  });

  it("converts short bullet lists into ul markup", () => {
    const result = plainTextToRichText("- ATP\n- NADPH");

    expect(result).toBe("<ul><li>ATP</li><li>NADPH</li></ul>");
  });

  it("converts numbered lists into ol markup", () => {
    const result = plainTextToRichText("1. Write program\n2. Compile");

    expect(result).toBe("<ol><li>Write program</li><li>Compile</li></ol>");
  });

  it("escapes html content", () => {
    const result = plainTextToRichText("<script>alert(1)</script>");

    expect(result).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });
});
