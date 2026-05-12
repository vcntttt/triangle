import * as React from 'react';
import { cn } from '@/lib/utils';

export const issueChipClassName =
   'inline-flex h-7 max-w-full shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/40 px-2.5 text-[13px] font-medium text-secondary-foreground transition-colors hover:bg-secondary/70';

export const issueChipIconClassName = 'size-3.5 shrink-0 text-muted-foreground';

export const issueChipDotClassName = 'size-2 shrink-0 rounded-full';

export function IssueChip({ className, children, ...props }: React.ComponentProps<'span'>) {
   return (
      <span className={cn(issueChipClassName, className)} {...props}>
         {children}
      </span>
   );
}
