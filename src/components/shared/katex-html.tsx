import { renderLatexToHtml } from "@/lib/math/katex";

interface KatexHtmlProps {
  latex: string;
  display: boolean;
  className?: string;
}

/**
 * Renders LaTeX as KaTeX markup. The single sanctioned HTML injection point for
 * math: `renderLatexToHtml` applies the shared safe options, so every caller
 * gets the same trust and size limits.
 *
 * @example
 * <KatexHtml latex="E = mc^2" display={false} />
 */
export function KatexHtml({
  latex,
  display,
  className,
}: Readonly<KatexHtmlProps>) {
  return (
    <span
      className={className}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX output with trust:false (no links or raw HTML); see MATH_KATEX_OPTIONS.
      dangerouslySetInnerHTML={{ __html: renderLatexToHtml(latex, display) }}
    />
  );
}
