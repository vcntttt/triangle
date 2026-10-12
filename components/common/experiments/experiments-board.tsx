'use client';

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ExperimentDialog } from '@/components/common/experiments/experiment-dialog';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { experimentStatusOptions, type ExperimentItem } from '@/lib/experiments';
import { useExperimentCommands } from '@/src/data/experiments';

// Groups follow the lifecycle order and empty groups are hidden, so the list reads as a pipeline.
export function ExperimentsBoard({ experiments }: { experiments: ExperimentItem[] }) {
   const [editingExperiment, setEditingExperiment] = useState<ExperimentItem | null>(null);
   const [isEditing, setIsEditing] = useState(false);

   if (experiments.length === 0) {
      return (
         <div className="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
            <p className="text-sm font-medium">No experiments yet</p>
            <p className="text-sm text-muted-foreground">
               Capture an idea here to try it later, without creating an issue.
            </p>
         </div>
      );
   }

   const groups = experimentStatusOptions
      .map((option) => ({
         ...option,
         items: experiments.filter((experiment) => experiment.status === option.id),
      }))
      .filter((group) => group.items.length > 0);

   const openEditor = (experiment: ExperimentItem) => {
      setEditingExperiment(experiment);
      setIsEditing(true);
   };

   return (
      <div className="flex flex-col gap-6 p-4">
         {groups.map((group) => (
            <section key={group.id} className="flex flex-col gap-2">
               <h2 className="text-xs font-medium text-muted-foreground uppercase">
                  {group.label} <span className="ml-1">{group.items.length}</span>
               </h2>
               <ul className="divide-y rounded-md border">
                  {group.items.map((experiment) => (
                     <ExperimentRow
                        key={experiment.id}
                        experiment={experiment}
                        dimmed={group.closed}
                        onOpen={() => openEditor(experiment)}
                     />
                  ))}
               </ul>
            </section>
         ))}
         <ExperimentDialog
            open={isEditing}
            onOpenChange={setIsEditing}
            experiment={editingExperiment}
         />
      </div>
   );
}

function ExperimentRow({
   experiment,
   dimmed,
   onOpen,
}: {
   experiment: ExperimentItem;
   dimmed: boolean;
   onOpen: () => void;
}) {
   const router = useRouter();
   const { setExperimentStatus } = useExperimentCommands();

   const changeStatus = async (value: string) => {
      const option = experimentStatusOptions.find((item) => item.id === value);
      if (!option) return;

      try {
         await setExperimentStatus({ experimentId: experiment.id, status: option.id });
         await router.invalidate();
      } catch (caught) {
         toast.error(caught instanceof Error ? caught.message : 'Could not change the status.');
      }
   };

   return (
      <li className={cn('flex items-center gap-3 px-3 py-2', dimmed && 'opacity-60')}>
         <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium">{experiment.title}</span>
            {experiment.description ? (
               <span className="block truncate text-xs text-muted-foreground">
                  {experiment.description}
               </span>
            ) : null}
         </button>
         {experiment.projectName ? (
            <span className="hidden max-w-40 shrink-0 truncate rounded-md bg-accent px-1.5 py-1 text-xs sm:inline">
               {experiment.projectName}
            </span>
         ) : null}
         {experiment.issueIdentifier ? (
            <Link
               to="/issues/$issueIdentifier"
               params={{ issueIdentifier: experiment.issueIdentifier }}
               className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
               {experiment.issueIdentifier}
            </Link>
         ) : null}
         <Select value={experiment.status} onValueChange={changeStatus}>
            <SelectTrigger aria-label="Experiment status" className="h-7 w-32 text-xs">
               <SelectValue />
            </SelectTrigger>
            <SelectContent>
               {experimentStatusOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                     {option.label}
                  </SelectItem>
               ))}
            </SelectContent>
         </Select>
      </li>
   );
}
