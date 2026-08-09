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
   return content
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .flatMap((line) => {
         const heading = line.trim().match(/^(#{1,6})\s+(.+)$/);
         if (!heading) return [];
         return [
            {
               id: getHeadingId(heading[2], occurrences),
               text: heading[2],
               level: heading[1].length,
            },
         ];
      });
}
