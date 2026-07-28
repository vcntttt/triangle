'use client';

import {
   Archive,
   BadgeCheck,
   Bell,
   BookOpen,
   Box,
   Briefcase,
   Building2,
   Bug,
   Calculator,
   Camera,
   Car,
   ChartNoAxesCombined,
   CheckCircle2,
   Calendar,
   ChartNoAxesColumn,
   CircleDot,
   ClipboardList,
   Cloud,
   Code,
   Coffee,
   Compass,
   CreditCard,
   Crown,
   Database,
   FileText,
   Flag,
   Flame,
   FolderKanban,
   Gift,
   Globe,
   GraduationCap,
   Heart,
   Home,
   KeyRound,
   Laptop,
   Layers,
   Leaf,
   Lightbulb,
   Lock,
   Mail,
   Map,
   MapPin,
   Megaphone,
   MessageCircle,
   Monitor,
   Music,
   Package,
   Palette,
   Pencil,
   Plane,
   Plug,
   Puzzle,
   Rocket,
   Settings,
   Shield,
   ShoppingCart,
   Sparkles,
   Star,
   Target,
   Terminal,
   ThumbsUp,
   Trophy,
   Users,
   WalletCards,
   Wifi,
   Wrench,
   Workflow,
   Zap,
   type LucideIcon,
} from 'lucide-react';
import type { Project, ProjectIconConfig } from '@/lib/models';
import { cn } from '@/lib/utils';

const projectIconMap: Record<string, LucideIcon> = {
   'box': Box,
   'folder-kanban': FolderKanban,
   'archive': Archive,
   'badge-check': BadgeCheck,
   'bell': Bell,
   'building-2': Building2,
   'calculator': Calculator,
   'camera': Camera,
   'car': Car,
   'chart-no-axes-combined': ChartNoAxesCombined,
   'check-circle-2': CheckCircle2,
   'circle-dot': CircleDot,
   'cloud': Cloud,
   'coffee': Coffee,
   'compass': Compass,
   'credit-card': CreditCard,
   'crown': Crown,
   'rocket': Rocket,
   'code': Code,
   'database': Database,
   'file-text': FileText,
   'flag': Flag,
   'flame': Flame,
   'gift': Gift,
   'graduation-cap': GraduationCap,
   'heart': Heart,
   'home': Home,
   'key-round': KeyRound,
   'laptop': Laptop,
   'leaf': Leaf,
   'lightbulb': Lightbulb,
   'mail': Mail,
   'map': Map,
   'map-pin': MapPin,
   'megaphone': Megaphone,
   'message-circle': MessageCircle,
   'monitor': Monitor,
   'music': Music,
   'package': Package,
   'palette': Palette,
   'pencil': Pencil,
   'plane': Plane,
   'plug': Plug,
   'puzzle': Puzzle,
   'shield': Shield,
   'shopping-cart': ShoppingCart,
   'sparkles': Sparkles,
   'star': Star,
   'target': Target,
   'thumbs-up': ThumbsUp,
   'trophy': Trophy,
   'users': Users,
   'wallet-cards': WalletCards,
   'wifi': Wifi,
   'workflow': Workflow,
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
