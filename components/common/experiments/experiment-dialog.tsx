'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { Id } from '@convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ExperimentItem } from '@/lib/experiments';
import { useExperimentCommands } from '@/src/data/experiments';
import { projectOptionsQuery } from '@/src/data/projects';

const noProject = 'none';

interface ExperimentDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   experiment?: ExperimentItem | null;
}

// Creates when no experiment is passed and edits otherwise. The form lives inside
// DialogContent, so Radix unmounts it on close and every open starts from fresh values.
export function ExperimentDialog({ open, onOpenChange, experiment = null }: ExperimentDialogProps) {
   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-lg">
            <ExperimentForm experiment={experiment} onDone={() => onOpenChange(false)} />
         </DialogContent>
      </Dialog>
   );
}

function ExperimentForm({
   experiment,
   onDone,
}: {
   experiment: ExperimentItem | null;
   onDone: () => void;
}) {
   const router = useRouter();
   const { createExperiment, updateExperiment, promoteExperimentToIssue } = useExperimentCommands();
   const { data: projects = [] } = useQuery(projectOptionsQuery());
   const [title, setTitle] = useState(experiment?.title ?? '');
   const [description, setDescription] = useState(experiment?.description ?? '');
   const [projectId, setProjectId] = useState(experiment?.projectId ?? noProject);
   const [isSaving, setIsSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const submit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSaving(true);
      setError(null);

      const input = {
         title,
         description,
         projectId: projectId === noProject ? null : (projectId as Id<'projects'>),
      };

      try {
         if (experiment) {
            await updateExperiment({ ...input, experimentId: experiment.id });
            toast.success('Experiment updated');
         } else {
            await createExperiment(input);
            toast.success('Experiment created');
         }
         await router.invalidate();
         onDone();
      } catch (caught) {
         setError(caught instanceof Error ? caught.message : 'Could not save the experiment.');
      } finally {
         setIsSaving(false);
      }
   };

   const promote = async () => {
      if (!experiment) return;

      setIsSaving(true);
      setError(null);
      try {
         const promoted = await promoteExperimentToIssue({
            experimentId: experiment.id,
            title,
            description,
            projectId: projectId === noProject ? null : (projectId as Id<'projects'>),
         });
         toast.success(
            promoted.issueIdentifier ? `Created issue ${promoted.issueIdentifier}` : 'Created issue'
         );
         await router.invalidate();
         onDone();
      } catch (caught) {
         setError(caught instanceof Error ? caught.message : 'Could not promote the experiment.');
      } finally {
         setIsSaving(false);
      }
   };

   return (
      <form onSubmit={submit} className="flex flex-col gap-4">
         <DialogHeader>
            <DialogTitle>{experiment ? 'Edit experiment' : 'New experiment'}</DialogTitle>
            <DialogDescription>
               Experiments are standalone ideas. They are not issues until you promote them.
            </DialogDescription>
         </DialogHeader>

         <div className="flex flex-col gap-2">
            <Label htmlFor="experiment-title">Title</Label>
            <Input
               id="experiment-title"
               value={title}
               onChange={(event) => setTitle(event.target.value)}
               disabled={isSaving}
               required
               autoFocus
            />
         </div>

         <div className="flex flex-col gap-2">
            <Label htmlFor="experiment-description">Description</Label>
            <Textarea
               id="experiment-description"
               value={description}
               onChange={(event) => setDescription(event.target.value)}
               disabled={isSaving}
               rows={5}
            />
         </div>

         <div className="flex flex-col gap-2">
            <Label htmlFor="experiment-project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={isSaving}>
               <SelectTrigger id="experiment-project">
                  <SelectValue />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value={noProject}>No project</SelectItem>
                  {projects.map((project) => (
                     <SelectItem key={project.id} value={project.id}>
                        {project.name}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>

         {error ? <p className="text-sm text-destructive">{error}</p> : null}

         <DialogFooter>
            {experiment && !experiment.issueId && experiment.status !== 'discarded' ? (
               <Button
                  type="button"
                  variant="outline"
                  onClick={promote}
                  disabled={isSaving || !title.trim()}
               >
                  Promote to issue
               </Button>
            ) : null}
            <Button type="submit" disabled={isSaving || !title.trim()}>
               {experiment ? 'Save changes' : 'Create experiment'}
            </Button>
         </DialogFooter>
      </form>
   );
}
