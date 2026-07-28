'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { CircleDashed, CircleMinus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProjectIconPicker } from '@/components/common/projects/project-icon-picker';
import type { ProjectIconConfig } from '@/lib/models';
import {
   priorities,
   status as projectStatuses,
   type Priority,
   type Status,
} from '@/lib/ui-catalog';
import { toast } from 'sonner';
import {
   projectPriorityListQuery,
   projectStatusListQuery,
   useProjectCommands,
} from '@/src/data/projects';

interface CreateProjectDialogProps {
   disabled?: boolean;
}

const normalizeProjectKey = (value: string) =>
   value
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 5);

const createProjectKeyFromName = (name: string) => {
   const words = name
      .toUpperCase()
      .trim()
      .split(/[^A-Z0-9]+/)
      .filter(Boolean);
   const acronym = words.map((word) => word[0]).join('');

   const normalizedAcronym = normalizeProjectKey(acronym);

   if (normalizedAcronym.length >= 3) {
      return normalizedAcronym;
   }

   return normalizeProjectKey(name);
};

const projectStatusIconMap: Record<string, Status['icon']> = Object.fromEntries(
   projectStatuses.map((item) => [item.id, item.icon])
);
const projectPriorityIconMap: Record<string, Priority['icon']> = Object.fromEntries(
   priorities.map((item) => [item.id, item.icon])
);
const fallbackStatusIcon =
   projectStatuses.find((item) => item.id === 'backlog')?.icon ?? CircleDashed;
const fallbackPriorityIcon = priorities[0]?.icon ?? CircleMinus;

function StatusOptionIcon({ id }: { id: string }) {
   const Icon = projectStatusIconMap[id] ?? fallbackStatusIcon;
   return <Icon />;
}

function PriorityOptionIcon({ id, color }: { id: string; color?: string }) {
   const Icon = projectPriorityIconMap[id] ?? fallbackPriorityIcon;
   return <Icon className="size-4" style={color ? { color } : undefined} />;
}

export function CreateProjectDialog({ disabled = false }: CreateProjectDialogProps) {
   const router = useRouter();
   const [open, setOpen] = useState(false);
   const [isCreating, setIsCreating] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [projectKey, setProjectKey] = useState('');
   const [keyTouched, setKeyTouched] = useState(false);
   const [selectedStatusId, setSelectedStatusId] = useState('');
   const [selectedPriorityId, setSelectedPriorityId] = useState('');
   const [iconConfig, setIconConfig] = useState<ProjectIconConfig>({
      type: 'lucide',
      value: 'box',
   });
   const { data: statusOptions = [] } = useQuery(projectStatusListQuery());
   const { data: priorityOptions = [] } = useQuery(projectPriorityListQuery());
   const { createProject: createProjectMutation } = useProjectCommands();
   const formRef = useRef<HTMLFormElement>(null);
   const selectedStatus =
      statusOptions.find((option) => option.id === selectedStatusId) ?? statusOptions[0];
   const selectedPriority =
      priorityOptions.find((option) => option.id === selectedPriorityId) ?? priorityOptions[0];

   const handleOpenChange = (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
         setError(null);
      }
   };

   const projectKeyIsValid = /^[A-Z][A-Z0-9]{1,4}$/.test(projectKey);

   const createProject = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsCreating(true);
      setError(null);

      const formData = new FormData(event.currentTarget);

      try {
         await createProjectMutation({
            name: String(formData.get('name') ?? ''),
            key: projectKey,
            description: String(formData.get('description') ?? ''),
            status: selectedStatus?.id ?? 'backlog',
            priority: selectedPriority?.id ?? 'no-priority',
            iconType: iconConfig.type,
            iconValue: iconConfig.value,
         });

         formRef.current?.reset();
         setProjectKey('');
         setKeyTouched(false);
         setSelectedStatusId('');
         setSelectedPriorityId('');
         setIconConfig({ type: 'lucide', value: 'box' });
         setOpen(false);
         await router.invalidate();
         toast.success('Project created');
      } catch (createError) {
         const message =
            createError instanceof Error ? createError.message : 'Failed to create project.';
         setError(message);
      } finally {
         setIsCreating(false);
      }
   };

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogTrigger asChild>
            <Button className="relative" size="xs" variant="secondary" disabled={disabled}>
               <Plus className="size-4" />
               <span className="hidden sm:inline ml-1">Create project</span>
            </Button>
         </DialogTrigger>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Create project</DialogTitle>
               <DialogDescription>
                  Add a project to Convex so the projects view stays backed by real persisted data.
               </DialogDescription>
            </DialogHeader>

            <form ref={formRef} onSubmit={createProject} className="space-y-4">
               <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <div className="flex items-center gap-2">
                     <ProjectIconPicker value={iconConfig} onChange={setIconConfig} />
                     <Input
                        id="name"
                        name="name"
                        placeholder="Personal tracker MVP"
                        required
                        onChange={(event) => {
                           if (!keyTouched) {
                              setProjectKey(createProjectKeyFromName(event.target.value));
                           }
                        }}
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="key">Key</Label>
                  <Input
                     id="key"
                     name="key"
                     placeholder="APP"
                     value={projectKey}
                     maxLength={5}
                     required
                     onChange={(event) => {
                        setKeyTouched(true);
                        setProjectKey(normalizeProjectKey(event.target.value));
                     }}
                  />
                  <p className="text-xs text-muted-foreground">
                     Use 2-5 uppercase letters or numbers. This prefixes issue IDs like{' '}
                     {projectKeyIsValid ? `${projectKey}-1` : 'APP-1'}.
                  </p>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                     id="description"
                     name="description"
                     placeholder="Short summary of what this project is about."
                     rows={4}
                  />
               </div>

               <div className="space-y-2">
                  <Label htmlFor="status">Initial status</Label>
                  <Select
                     value={selectedStatus?.id}
                     onValueChange={setSelectedStatusId}
                     disabled={isCreating}
                  >
                     <SelectTrigger id="status" aria-label="Initial status">
                        <span className="flex items-center gap-2">
                           <StatusOptionIcon id={selectedStatus?.id ?? 'backlog'} />
                           <span>{selectedStatus?.name ?? 'Select a status'}</span>
                        </span>
                     </SelectTrigger>
                     <SelectContent>
                        {statusOptions.map((statusOption) => (
                           <SelectItem key={statusOption.id} value={statusOption.id}>
                              <span className="flex items-center gap-2">
                                 <StatusOptionIcon id={statusOption.id} />
                                 <span>{statusOption.name}</span>
                              </span>
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                     value={selectedPriority?.id}
                     onValueChange={setSelectedPriorityId}
                     disabled={isCreating}
                  >
                     <SelectTrigger id="priority" aria-label="Priority">
                        <span className="flex items-center gap-2">
                           <PriorityOptionIcon
                              id={selectedPriority?.id ?? 'no-priority'}
                              color={selectedPriority?.color}
                           />
                           <span>{selectedPriority?.name ?? 'Select a priority'}</span>
                        </span>
                     </SelectTrigger>
                     <SelectContent>
                        {priorityOptions.map((priorityOption) => (
                           <SelectItem key={priorityOption.id} value={priorityOption.id}>
                              <span className="flex items-center gap-2">
                                 <PriorityOptionIcon
                                    id={priorityOption.id}
                                    color={priorityOption.color}
                                 />
                                 <span>{priorityOption.name}</span>
                              </span>
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>

               {error && <p className="text-sm text-destructive">{error}</p>}

               <DialogFooter>
                  <Button
                     type="submit"
                     disabled={
                        isCreating ||
                        !projectKeyIsValid ||
                        statusOptions.length === 0 ||
                        priorityOptions.length === 0
                     }
                  >
                     {isCreating ? 'Creating...' : 'Create project'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}
