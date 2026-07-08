import type { ProjectArea } from '@/lib/models';
import { cn } from '@/lib/utils';

export function ProjectAreaBadge({ area, className }: { area: ProjectArea; className?: string }) {
   return (
      <span
         className={cn(
            'inline-flex h-5 max-w-40 shrink-0 items-center gap-1.5 rounded border px-1.5 text-xs text-muted-foreground',
            className
         )}
      >
         <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: area.color }}
            aria-hidden="true"
         />
         <span className="truncate">{area.name}</span>
      </span>
   );
}
