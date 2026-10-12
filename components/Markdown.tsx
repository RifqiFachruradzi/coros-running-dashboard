// Minimal, safe markdown renderer for chat replies: headings, bullet and
// numbered lists, bold, italic, inline code. Builds React elements only.

import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|(?<![\w])_[^_\n]+_(?![\w])|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let i = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`"))
      parts.push(
        <code
          key={key}
          className="rounded px-1 text-[0.9em]"
          style={{ backgroundColor: "var(--gridline)" }}
        >
          {token.slice(1, -1)}
        </code>
      );
    else parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    const n = blocks.length;
    blocks.push(
      <Tag key={`l${n}`} className={`${list.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>
        {list.items.map((item, i) => (
          <li key={i}>{renderInline(item, `li${n}-${i}`)}</li>
        ))}
      </Tag>
    );
    list = null;
  };

  text.split("\n").forEach((raw, index) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flush();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet || numbered)![1]);
      return;
    }
    flush();
    if (!line.trim()) return;
    if (heading) {
      blocks.push(
        <p key={index} className="font-semibold">
          {renderInline(heading[2], `h${index}`)}
        </p>
      );
    } else if (/^-{3,}$/.test(line.trim())) {
      blocks.push(<hr key={index} style={{ borderColor: "var(--border-hairline)" }} />);
    } else {
      blocks.push(<p key={index}>{renderInline(line, `p${index}`)}</p>);
    }
  });
  flush();

  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
}
