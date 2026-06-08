import React from "react";

/** Simple markdown → JSX renderer (bold, italic, code, lists, newlines) */
export default function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  let inList = false;

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Unordered list
    if (/^[-*•]\s/.test(trimmed)) {
      const content = parseInline(trimmed.replace(/^[-*•]\s*/, ""));
      elements.push(
        <li key={i} className="ml-4 mb-0.5 list-disc text-sm leading-relaxed">
          {content}
        </li>
      );
      inList = true;
      return;
    }

    // Close list if needed
    if (inList) { inList = false; }

    // Empty line
    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />);
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm leading-relaxed mb-1 last:mb-0">
        {parseInline(trimmed)}
      </p>
    );
  });

  return <>{elements}</>;
}

/** Parse inline markdown: **bold**, *italic*, `code` */
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Combined regex: **bold** | `code` | *italic*
  const re = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\*(.+?)\*)/g;

  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    // Text before match
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[1]) {
      // **bold**
      parts.push(<strong key={match.index} className="font-bold">{match[2]}</strong>);
    } else if (match[3]) {
      // `code`
      parts.push(
        <code key={match.index} className="bg-[#E8ECF0] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-300 px-1 py-0.5 rounded text-xs font-mono">
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      // *italic*
      parts.push(<em key={match.index} className="italic">{match[6]}</em>);
    }
    last = match.index + match[0].length;
  }

  // Remaining text
  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length > 0 ? parts : [text];
}
