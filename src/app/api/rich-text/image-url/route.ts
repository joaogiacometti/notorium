import { NextResponse } from "next/server";
import {
  isSupportedSharedImageUrl,
  resolveEmbeddableImageUrl,
} from "@/lib/editor/tiptap-image-url";

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractMetaImageUrl(html: string): string | null {
  const metaTagPattern = /<meta\s+[^>]*>/gi;
  const propertyPattern =
    /\b(?:property|name)\s*=\s*["'](?:og:image|twitter:image)["']/i;
  const contentPattern = /\bcontent\s*=\s*["']([^"']+)["']/i;

  for (const tag of html.match(metaTagPattern) ?? []) {
    if (!propertyPattern.test(tag)) {
      continue;
    }

    const contentMatch = new RegExp(contentPattern).exec(tag);
    if (!contentMatch) {
      continue;
    }

    const content = decodeHtmlEntities(contentMatch[1]);
    return resolveEmbeddableImageUrl(content);
  }

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url") ?? "";

  if (!isSupportedSharedImageUrl(targetUrl)) {
    return NextResponse.json({ src: null }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "user-agent": "Notorium/1.0",
      },
      next: {
        revalidate: 3600,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ src: null }, { status: 502 });
    }

    const html = await response.text();
    const src = extractMetaImageUrl(html);

    return NextResponse.json({ src });
  } catch {
    return NextResponse.json({ src: null }, { status: 502 });
  }
}
