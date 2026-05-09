import * as React from 'react';
import { cn } from '@/lib/utils';

export const issueChipClassName =
   'inline-flex h-6 max-w-full shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-zinc-950/45 px-2 text-xs font-semibold leading-none text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors hover:border-white/15 hover:bg-zinc-900/70 hover:text-zinc-50 dark:border-white/10 dark:bg-zinc-950/45';

export const issueChipIconClassName = 'size-3.5 shrink-0 text-zinc-400';

export const issueChipDotClassName = 'size-1.5 shrink-0 rounded-full';

export function IssueChip({ className, children, ...props }: React.ComponentProps<'span'>) {
   return (
      <span className={cn(issueChipClassName, className)} {...props}>
         {children}
      </span>
   );
}
