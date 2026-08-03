import { ExternalLink, Globe2, House } from 'lucide-react';
import type { ProjectSource } from '@/lib/models';
import { cn } from '@/lib/utils';

const sourceLabels: Record<ProjectSource, string> = {
   internal: 'Local',
   external: 'Externo',
};

export function ProjectSourceBadge({
   source = 'internal',
   className,
}: {
   source?: ProjectSource;
   className?: string;
}) {
   const Icon = source === 'external' ? Globe2 : House;

   return (
      <span
         className={cn(
            'inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1 text-xs text-muted-foreground',
            className
         )}
      >
         <Icon className="size-3.5" />
         <span>{sourceLabels[source]}</span>
      </span>
   );
}

export function ProjectExternalLink({
   url,
   className,
}: {
   url?: string | null;
   className?: string;
}) {
   if (!url) return null;

   return (
      <a
         href={url}
         target="_blank"
         rel="noreferrer"
         className={cn(
            'inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline',
            className
         )}
      >
         <ExternalLink className="size-3.5" />
         Abrir referencia
      </a>
   );
}
