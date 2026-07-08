import {
   ContextMenuContent,
   ContextMenuItem,
   ContextMenuSeparator,
   ContextMenuSub,
   ContextMenuSubContent,
   ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { Check, FolderOpen, Pin, PinOff, Radio, Trash2 } from 'lucide-react';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { priorities, status } from '@/lib/ui-catalog';

interface ProjectContextMenuProps {
   isPinned: boolean;
   statusId: string;
   priorityId: string;
   statusOptions: ProjectOptionLike[];
   priorityOptions: ProjectOptionLike[];
   onOpenIssues: () => void;
   onNewUpdate: () => void;
   onTogglePin: () => void;
   onDelete: () => void;
   onStatusChange: (statusId: string) => void;
   onPriorityChange: (priorityId: string) => void;
}

const statusIconMap = Object.fromEntries(status.map((item) => [item.id, item.icon]));
const priorityIconMap = Object.fromEntries(priorities.map((item) => [item.id, item.icon]));

export function ProjectContextMenu({
   isPinned,
   statusId,
   priorityId,
   statusOptions,
   priorityOptions,
   onOpenIssues,
   onNewUpdate,
   onTogglePin,
   onDelete,
   onStatusChange,
   onPriorityChange,
}: ProjectContextMenuProps) {
   return (
      <ContextMenuContent className="w-64">
         <ContextMenuItem onSelect={onOpenIssues}>
            <FolderOpen className="size-4" /> Open project issues
         </ContextMenuItem>

         <ContextMenuItem onSelect={onNewUpdate}>
            <Radio className="size-4" /> New update
         </ContextMenuItem>

         <ContextMenuItem onSelect={onTogglePin}>
            {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            {isPinned ? 'Unpin project' : 'Pin project'}
         </ContextMenuItem>

         <ContextMenuSeparator />

         <ContextMenuSub>
            <ContextMenuSubTrigger>Status</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56">
               {statusOptions.map((option) => {
                  const Icon = statusIconMap[option.id] ?? status[status.length - 1].icon;

                  return (
                     <ContextMenuItem key={option.id} onSelect={() => onStatusChange(option.id)}>
                        <Icon />
                        <span>{option.name}</span>
                        {statusId === option.id && <Check className="ml-auto size-4" />}
                     </ContextMenuItem>
                  );
               })}
            </ContextMenuSubContent>
         </ContextMenuSub>

         <ContextMenuSub>
            <ContextMenuSubTrigger>Priority</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56">
               {priorityOptions.map((option) => {
                  const Icon = priorityIconMap[option.id] ?? priorities[0].icon;

                  return (
                     <ContextMenuItem key={option.id} onSelect={() => onPriorityChange(option.id)}>
                        <Icon className="size-4" />
                        <span>{option.name}</span>
                        {priorityId === option.id && <Check className="ml-auto size-4" />}
                     </ContextMenuItem>
                  );
               })}
            </ContextMenuSubContent>
         </ContextMenuSub>

         <ContextMenuSeparator />

         <ContextMenuItem onSelect={onDelete} variant="destructive">
            <Trash2 className="size-4" /> Eliminar proyecto…
         </ContextMenuItem>
      </ContextMenuContent>
   );
}
