'use client';

import {
   BookOpen,
   Box,
   Briefcase,
   Bug,
   Calculator,
   Calendar,
   ChartNoAxesColumn,
   ClipboardList,
   Code,
   Database,
   FolderKanban,
   Globe,
   Layers,
   Lock,
   Palette,
   Rocket,
   Settings,
   Terminal,
   Wrench,
   Zap,
   type LucideIcon,
} from 'lucide-react';
import type { Project, ProjectIconConfig } from '@/lib/models';
import { cn } from '@/lib/utils';

const projectIconMap: Record<string, LucideIcon> = {
   'box': Box,
   'folder-kanban': FolderKanban,
   'calculator': Calculator,
   'rocket': Rocket,
   'code': Code,
   'database': Database,
   'palette': Palette,
   'bug': Bug,
   'terminal': Terminal,
   'calendar': Calendar,
   'chart-no-axes-column': ChartNoAxesColumn,
   'settings': Settings,
   'lock': Lock,
   'zap': Zap,
   'globe': Globe,
   'briefcase': Briefcase,
   'book-open': BookOpen,
   'clipboard-list': ClipboardList,
   'layers': Layers,
   'wrench': Wrench,
};

interface ProjectIconProps {
   project?: Pick<Project, 'iconConfig'>;
   icon?: ProjectIconConfig;
   className?: string;
   iconClassName?: string;
}

export function ProjectIcon({ project, icon, className, iconClassName }: ProjectIconProps) {
   const iconConfig = icon ?? project?.iconConfig ?? { type: 'lucide', value: 'box' };

   return (
      <span
         className={cn(
            'inline-flex size-6 shrink-0 items-center justify-center rounded bg-muted/50 text-muted-foreground',
            className
         )}
      >
         <ProjectIconGlyph icon={iconConfig} className={cn('size-4', iconClassName)} />
      </span>
   );
}

export function ProjectIconGlyph({
   icon,
   className,
}: {
   icon: ProjectIconConfig;
   className?: string;
}) {
   if (icon.type === 'emoji') {
      return (
         <span className={cn('text-sm leading-none', className)} aria-hidden="true">
            {icon.value || '📦'}
         </span>
      );
   }

   const Icon = projectIconMap[icon.value] ?? Box;

   return <Icon className={className} />;
}
