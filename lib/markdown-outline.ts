export interface MarkdownHeading {
   id: string;
   text: string;
   level: number;
}

export function slugifyHeading(value: string) {
   return (
      value
         .toLowerCase()
         .trim()
         .replace(/[`*_~]/g, '')
         .replace(/[^a-z0-9\s-]/g, '')
         .replace(/\s+/g, '-')
         .replace(/-+/g, '-')
         .replace(/^-+|-+$/g, '') || 'section'
   );
}

export function getHeadingId(value: string, occurrences: Map<string, number>) {
   const base = slugifyHeading(value);
   const count = occurrences.get(base) ?? 0;
   occurrences.set(base, count + 1);
   return count === 0 ? base : `${base}-${count + 1}`;
}

export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
   const occurrences = new Map<string, number>();
   const headings: MarkdownHeading[] = [];
   const lines = content.replace(/\r\n?/g, '\n').split('\n');
   let fenceMarker: string | null = null;

   // Mirrors the fence handling in components/common/issues/markdown-content.tsx
   // so the outline only includes headings that exist in the rendered DOM.
   for (const line of lines) {
      if (fenceMarker) {
         const closingFence = line.match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
         if (
            closingFence &&
            closingFence[1][0] === fenceMarker[0] &&
            closingFence[1].length >= fenceMarker.length
         ) {
            fenceMarker = null;
         }
         continue;
      }

      const fencedCode = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (fencedCode) {
         fenceMarker = fencedCode[1];
         continue;
      }

      const heading = line.trim().match(/^(#{1,6})\s+(.+)$/);
      if (!heading) continue;
      headings.push({
         id: getHeadingId(heading[2], occurrences),
         text: heading[2],
         level: heading[1].length,
      });
   }
   return headings;
}
