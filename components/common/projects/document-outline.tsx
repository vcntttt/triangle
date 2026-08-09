'use client';

import type { MarkdownHeading } from '@/lib/markdown-outline';
import { cn } from '@/lib/utils';

export function DocumentOutline({ headings }: { headings: MarkdownHeading[] }) {
   if (headings.length === 0) return null;

   return (
      <nav
         aria-label="Document outline"
         className="space-y-2 rounded-lg border bg-background/50 p-3"
      >
         <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            On this page
         </p>
         <div className="space-y-1">
            {headings.map((heading) => (
               <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={cn(
                     'block truncate text-xs text-muted-foreground transition-colors hover:text-foreground',
                     heading.level === 1 && 'font-medium text-foreground',
                     heading.level > 1 && 'pl-3'
                  )}
               >
                  {heading.text}
               </a>
            ))}
         </div>
      </nav>
   );
}
