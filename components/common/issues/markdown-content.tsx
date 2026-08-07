import type { ElementType, ReactNode } from 'react';

const tableDividerCellPattern = /^:?-{3,}:?$/;

function nextOccurrenceKey(prefix: string, value: string, occurrences: Map<string, number>) {
   const occurrence = occurrences.get(value) ?? 0;
   occurrences.set(value, occurrence + 1);
   return `${prefix}-${value}-${occurrence}`;
}

function renderInline(text: string): ReactNode[] {
   const tokenPattern =
      /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^\s)]+\))/g;
   const tokenOccurrences = new Map<string, number>();
   return text.split(tokenPattern).map((token) => {
      const key = nextOccurrenceKey('inline', token, tokenOccurrences);
      if (token.startsWith('`') && token.endsWith('`')) {
         return (
            <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
               {token.slice(1, -1)}
            </code>
         );
      }
      if (
         (token.startsWith('**') && token.endsWith('**')) ||
         (token.startsWith('__') && token.endsWith('__'))
      ) {
         return <strong key={key}>{token.slice(2, -2)}</strong>;
      }
      if (
         (token.startsWith('*') && token.endsWith('*')) ||
         (token.startsWith('_') && token.endsWith('_'))
      ) {
         return <em key={key}>{token.slice(1, -1)}</em>;
      }
      const link = token.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
      if (link) {
         return (
            <a
               key={key}
               href={link[2]}
               target="_blank"
               rel="noreferrer"
               className="text-primary underline underline-offset-2"
            >
               {link[1]}
            </a>
         );
      }
      return token;
   });
}

function parseTableRow(line: string): string[] {
   const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
   return trimmed.split('|').map((cell) => cell.trim());
}

function isTableDivider(line: string, columnCount: number): boolean {
   const cells = parseTableRow(line);
   return cells.length === columnCount && cells.every((cell) => tableDividerCellPattern.test(cell));
}

function isClosingFence(line: string, openingFence: string): boolean {
   const closingFence = line.match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
   return Boolean(
      closingFence &&
      closingFence[1][0] === openingFence[0] &&
      closingFence[1].length >= openingFence.length
   );
}

export function MarkdownContent({ content }: { content: string }) {
   const lines = content.replace(/\r\n?/g, '\n').split('\n');
   const blocks: ReactNode[] = [];
   let paragraph: string[] = [];
   let list: { ordered: boolean; items: string[] } | null = null;

   const flushParagraph = () => {
      if (!paragraph.length) return;
      blocks.push(
         <p key={`paragraph-${blocks.length}`} className="leading-6">
            {renderInline(paragraph.join(' '))}
         </p>
      );
      paragraph = [];
   };
   const flushList = () => {
      if (!list) return;
      const List = list.ordered ? 'ol' : 'ul';
      const itemOccurrences = new Map<string, number>();
      blocks.push(
         <List key={`list-${blocks.length}`} className="space-y-1.5 pl-5">
            {list.items.map((item) => {
               const key = nextOccurrenceKey('item', item, itemOccurrences);
               const checked = /^\[[ xX]\]\s+/.test(item);
               const itemText = checked ? item.replace(/^\[[ xX]\]\s+/, '') : item;
               return (
                  <li
                     key={key}
                     className={checked ? 'list-none -ml-5 flex items-start gap-2' : undefined}
                  >
                     {checked && (
                        <span
                           aria-hidden="true"
                           className="mt-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-muted-foreground/50 text-[10px]"
                        >
                           {item.startsWith('[x]') || item.startsWith('[X]') ? '✓' : ''}
                        </span>
                     )}
                     <span>{renderInline(itemText)}</span>
                  </li>
               );
            })}
         </List>
      );
      list = null;
   };

   for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      const trimmed = line.trim();
      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      const blockquote = trimmed.match(/^>\s?(.*)$/);
      const fencedCode = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
      const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
      const tableHeader = parseTableRow(trimmed);
      const hasTable =
         trimmed.includes('|') &&
         lineIndex + 1 < lines.length &&
         isTableDivider(lines[lineIndex + 1], tableHeader.length);

      if (!trimmed) {
         flushParagraph();
         flushList();
      } else if (fencedCode) {
         flushParagraph();
         flushList();

         const codeLines: string[] = [];
         const openingFence = fencedCode[1];
         const language = fencedCode[2].trim() || undefined;
         lineIndex += 1;
         while (lineIndex < lines.length && !isClosingFence(lines[lineIndex], openingFence)) {
            codeLines.push(lines[lineIndex]);
            lineIndex += 1;
         }

         blocks.push(
            <pre
               key={`code-${blocks.length}`}
               className="overflow-x-auto rounded-md border border-border bg-muted/50 p-3 text-xs leading-5"
            >
               <code className="font-mono" data-language={language}>
                  {codeLines.join('\n')}
               </code>
            </pre>
         );
      } else if (hasTable) {
         flushParagraph();
         flushList();

         const rows: string[][] = [];
         lineIndex += 2;
         while (lineIndex < lines.length && lines[lineIndex].trim().includes('|')) {
            const row = parseTableRow(lines[lineIndex]);
            if (row.length !== tableHeader.length) break;
            rows.push(row);
            lineIndex += 1;
         }
         lineIndex -= 1;

         const headerCellOccurrences = new Map<string, number>();
         const rowOccurrences = new Map<string, number>();

         blocks.push(
            <div key={`table-${blocks.length}`} className="overflow-x-auto">
               <table className="w-full border-collapse text-left text-sm">
                  <thead>
                     <tr className="border-b border-border">
                        {tableHeader.map((cell) => (
                           <th
                              key={nextOccurrenceKey('header-cell', cell, headerCellOccurrences)}
                              className="px-3 py-2 font-semibold first:pl-0"
                           >
                              {renderInline(cell)}
                           </th>
                        ))}
                     </tr>
                  </thead>
                  <tbody>
                     {rows.map((row) => {
                        const rowKey = nextOccurrenceKey('row', row.join('\u0000'), rowOccurrences);
                        const cellOccurrences = new Map<string, number>();
                        return (
                           <tr key={rowKey} className="border-b border-border/60 last:border-0">
                              {row.map((cell) => (
                                 <td
                                    key={nextOccurrenceKey('cell', cell, cellOccurrences)}
                                    className="px-3 py-2 align-top first:pl-0"
                                 >
                                    {renderInline(cell)}
                                 </td>
                              ))}
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         );
      } else if (heading) {
         flushParagraph();
         flushList();
         const Tag = `h${Math.min(heading[1].length + 1, 6)}` as ElementType;
         blocks.push(
            <Tag key={`heading-${blocks.length}`} className="font-semibold tracking-tight">
               {renderInline(heading[2])}
            </Tag>
         );
      } else if (blockquote) {
         flushParagraph();
         flushList();

         const quoteLines = [blockquote[1]];
         while (lineIndex + 1 < lines.length) {
            const nextQuote = lines[lineIndex + 1].match(/^\s{0,3}>\s?(.*)$/);
            if (!nextQuote) break;
            quoteLines.push(nextQuote[1]);
            lineIndex += 1;
         }

         blocks.push(
            <blockquote
               key={`blockquote-${blocks.length}`}
               className="border-l-2 border-muted-foreground/40 pl-4 text-muted-foreground"
            >
               <MarkdownContent content={quoteLines.join('\n')} />
            </blockquote>
         );
      } else if (unordered || ordered) {
         flushParagraph();
         const isOrdered = Boolean(ordered);
         if (!list || list.ordered !== isOrdered) {
            flushList();
            list = { ordered: isOrdered, items: [] };
         }
         list.items.push((unordered ?? ordered)![1]);
      } else if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
         flushParagraph();
         flushList();
         blocks.push(<hr key={`separator-${blocks.length}`} className="border-border" />);
      } else {
         flushList();
         paragraph.push(trimmed);
      }
   }

   flushParagraph();
   flushList();

   return <div className="space-y-4 text-sm text-foreground/90">{blocks}</div>;
}
