import type { FunctionReturnType } from 'convex/server';
import type { Doc } from '@convex/_generated/dataModel';
import type { api } from '@convex/_generated/api';

export type ExperimentStatus = Doc<'experiments'>['status'];
export type ExperimentItem = FunctionReturnType<typeof api.experiments.page>[number];

// Order is the lifecycle order shown in the list; `closed` marks the terminal states.
export const experimentStatusOptions: {
   id: ExperimentStatus;
   label: string;
   closed: boolean;
}[] = [
   { id: 'idea', label: 'Idea', closed: false },
   { id: 'ready', label: 'Ready', closed: false },
   { id: 'running', label: 'Running', closed: false },
   { id: 'review', label: 'Review', closed: false },
   { id: 'completed', label: 'Completed', closed: true },
   { id: 'discarded', label: 'Discarded', closed: true },
];
