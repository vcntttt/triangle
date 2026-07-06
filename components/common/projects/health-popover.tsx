'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CircleCheck, CircleX, AlertCircle, HelpCircle, Bell, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { Project, ProjectUpdate } from '@/lib/models';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { health as healthOptions } from '@/lib/ui-catalog';
import { ProjectIconGlyph } from './project-icon';
import { useProjectCommands } from '@/src/data/projects';

function getHealthIcon(healthId: string) {
   switch (healthId) {
      case 'on-track':
         return <CircleCheck className="size-4 text-green-500" />;
      case 'off-track':
         return <CircleX className="size-4 text-red-500" />;
      case 'at-risk':
         return <AlertCircle className="size-4 text-amber-500" />;
      case 'no-update':
      default:
         return <HelpCircle className="size-4 text-muted-foreground" />;
   }
}

interface HealthPopoverProps {
   project: Project;
   onProjectUpdate?: (projectId: string, update: ProjectUpdate) => void;
}

export function HealthPopover({ project, onProjectUpdate }: HealthPopoverProps) {
   const [isComposing, setIsComposing] = useState(false);
   const defaultHealth = project.health.id === 'no-update' ? 'on-track' : project.health.id;
   const [draftHealth, setDraftHealth] = useState<Project['health']['id'] | null>(null);
   const selectedHealth = draftHealth ?? defaultHealth;
   const [body, setBody] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const { createProjectUpdate } = useProjectCommands();
   const isMobile = useIsMobile();

   const latestUpdateDate = project.latestUpdate
      ? new Date(project.latestUpdate.createdAt).toLocaleDateString()
      : new Date(project.startDate).toLocaleDateString();

   const handleCreateUpdate = async () => {
      const trimmedBody = body.trim();

      if (!trimmedBody) {
         toast.error('Project update cannot be empty');
         return;
      }

      setIsSubmitting(true);

      try {
         const update = await createProjectUpdate({
            projectId: project.id,
            health: selectedHealth,
            body: trimmedBody,
         });

         onProjectUpdate?.(project.id, update);
         setBody('');
         setDraftHealth(null);
         setIsComposing(false);
         toast.success('Project update posted');
      } catch (error) {
         console.error('Failed to create project update.', error);
         toast.error('Project update could not be posted');
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <Popover>
         <PopoverTrigger asChild>
            <Button
               className="flex items-center justify-center gap-1 h-7 px-2"
               size="sm"
               variant="ghost"
            >
               {getHealthIcon(project.health.id)}
               <span className="text-xs mt-[1px] ml-0.5 hidden xl:inline">
                  {project.health.name}
               </span>
            </Button>
         </PopoverTrigger>
         <PopoverContent
            side={isMobile ? 'bottom' : 'left'}
            className={cn('p-0 w-[480px]', isMobile ? 'w-full' : '')}
         >
            <div className="flex items-center justify-between border-b p-3">
               <div className="flex items-center gap-2">
                  <ProjectIconGlyph
                     icon={project.iconConfig}
                     className="size-4 shrink-0 text-muted-foreground"
                  />
                  <h4 className="font-medium text-sm">{project.name}</h4>
               </div>
               <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                     Subscribe
                  </Button>
                  <Button
                     variant="outline"
                     size="sm"
                     className="h-7 px-2 text-xs flex items-center gap-1"
                     onClick={() => setIsComposing((value) => !value)}
                  >
                     <Bell className="size-3" />
                     New update
                  </Button>
               </div>
            </div>
            <div className="p-3 space-y-3">
               <div className="flex items-center justify-start gap-3">
                  <div className="flex items-center gap-2">
                     {getHealthIcon(project.health.id)}
                     <span className="text-sm">{project.health.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <Avatar className="size-5">
                        <AvatarImage src={project.lead.avatarUrl} alt={project.lead.name} />
                        <AvatarFallback>{project.lead.name.charAt(0)}</AvatarFallback>
                     </Avatar>
                     <span className="text-xs text-muted-foreground">{project.lead.name}</span>
                     <span className="text-xs text-muted-foreground">·</span>
                     <span className="text-xs text-muted-foreground">{latestUpdateDate}</span>
                  </div>
               </div>

               <div>
                  <p className="text-sm text-muted-foreground">
                     {project.latestUpdate?.body ?? project.health.description}
                  </p>
               </div>

               {isComposing && (
                  <div className="space-y-2 border-t pt-3">
                     <Select
                        value={selectedHealth}
                        onValueChange={(value) => setDraftHealth(value as Project['health']['id'])}
                     >
                        <SelectTrigger className="h-8">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {healthOptions.flatMap((item) =>
                              item.id === 'no-update' ? (
                                 []
                              ) : (
                                 <SelectItem key={item.id} value={item.id}>
                                    <span className="flex items-center gap-2">
                                       {getHealthIcon(item.id)}
                                       {item.name}
                                    </span>
                                 </SelectItem>
                              )
                           )}
                        </SelectContent>
                     </Select>
                     <Textarea
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        placeholder="Write a project update..."
                        className="min-h-24 resize-none text-sm"
                     />
                     <div className="flex justify-end">
                        <Button
                           size="sm"
                           className="h-8 gap-1.5"
                           disabled={isSubmitting}
                           onClick={() => {
                              void handleCreateUpdate();
                           }}
                        >
                           <Send className="size-3.5" />
                           Post update
                        </Button>
                     </div>
                  </div>
               )}
            </div>
         </PopoverContent>
      </Popover>
   );
}
