// A tiny, dependency-free Markdown-subset renderer for admin-authored blog
// content (headings, bold/italic, links, lists, paragraphs). All input is
// HTML-escaped before any tag is generated, so the output is safe to render
// with dangerouslySetInnerHTML even though this is a plain textarea, not a
// sanitized rich-text editor -- there's no path for raw HTML to reach the page.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-600 hover:underline">$1</a>');
}

export function renderMarkdown(source: string): string {
  const lines = escapeHtml(source || "").split("\n");
  const htmlParts: string[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length) {
      htmlParts.push(`<ul class="list-disc pl-5 space-y-1 my-3">${listBuffer.join("")}</ul>`);
      listBuffer = [];
    }
  }

  function flushParagraph() {
    if (paragraphBuffer.length) {
      htmlParts.push(`<p class="mb-4 leading-relaxed">${paragraphBuffer.join(" ")}</p>`);
      paragraphBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length + 2; // # -> h3, ## -> h4, ### -> h5
      htmlParts.push(`<h${level} class="font-bold text-gray-900 mt-6 mb-2">${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const listItem = /^[-*]\s+(.*)$/.exec(line);
    if (listItem) {
      flushParagraph();
      listBuffer.push(`<li>${renderInline(listItem[1])}</li>`);
      continue;
    }

    flushList();
    paragraphBuffer.push(renderInline(line));
  }
  flushParagraph();
  flushList();
  return htmlParts.join("\n");
}
