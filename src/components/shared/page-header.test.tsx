import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageHeader } from "@/components/shared/page-header";

describe("PageHeader", () => {
  it("renders a string title as the page heading with description and actions", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Admin"
        description="Manage access"
        actions={<button type="button">Act</button>}
      />,
    );

    expect(html).toMatch(/<h1[^>]*>Admin<\/h1>/);
    expect(html).toContain("Manage access");
    expect(html).toContain("<button");
  });

  it("tags the heading with the given test id", () => {
    const html = renderToStaticMarkup(
      <PageHeader title="Home" titleTestId="greeting" />,
    );

    expect(html).toContain('data-testid="greeting"');
  });
});
