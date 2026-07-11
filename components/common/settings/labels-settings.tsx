'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LabelInterface } from '@/lib/models';
import { useLabelCommands } from '@/src/data/labels';

const defaultLabelColors = [
   '#ef4444',
   '#f97316',
   '#facc15',
   '#22c55e',
   '#38bdf8',
   '#8b5cf6',
   '#ec4899',
   '#94a3b8',
];

interface LabelsSettingsProps {
   initialLabels: LabelInterface[];
}

export function LabelsSettings({ initialLabels }: LabelsSettingsProps) {
   const [labels, setLabels] = useState(() =>
      initialLabels.toSorted((left, right) => left.name.localeCompare(right.name))
   );
   const [editingLabel, setEditingLabel] = useState<LabelInterface | null>(null);
   const [isCreateOpen, setIsCreateOpen] = useState(false);
   const { createLabel, updateLabel, deleteLabel } = useLabelCommands();

   const updateLabels = (nextLabels: LabelInterface[]) => {
      setLabels(nextLabels.toSorted((left, right) => left.name.localeCompare(right.name)));
   };

   const handleSave = async (input: { name: string; color: string }, label?: LabelInterface) => {
      try {
         if (label) {
            const updated = await updateLabel({ labelId: label.id, ...input });
            updateLabels(labels.map((item) => (item.id === updated.id ? updated : item)));
            toast.success('Label updated');
            return;
         }

         const created = await createLabel(input);
         updateLabels([...labels, created]);
         toast.success('Label created');
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Label could not be saved.';
         toast.error(message);
      }
   };

   const handleDelete = async (label: LabelInterface) => {
      const confirmed = window.confirm(
         `Delete "${label.name}"? It will be removed from all issues that use it.`
      );
      if (!confirmed) return;

      try {
         await deleteLabel({ labelId: label.id });
         updateLabels(labels.filter((item) => item.id !== label.id));
         toast.success('Label deleted');
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Label could not be deleted.';
         toast.error(message);
      }
   };

   return (
      <section className="mb-10" id="labels">
         <div className="flex items-start justify-between gap-3 mb-4">
            <div>
               <h2 className="text-lg font-semibold">Labels</h2>
               <p className="text-sm text-muted-foreground">
                  Tags used to classify issues across all projects.
               </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setIsCreateOpen(true)}>
               <Plus className="size-4" />
               Add
            </Button>
         </div>

         {labels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
               {labels.map((label) => (
                  <div
                     key={label.id}
                     className="group inline-flex h-8 max-w-xs items-center gap-2 rounded-md border bg-background/50 pl-2.5 pr-1 text-sm"
                  >
                     <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                        aria-hidden="true"
                     />
                     <span className="truncate">{label.name}</span>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-6 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                              aria-label={`Manage ${label.name}`}
                           >
                              <MoreHorizontal className="size-3.5" />
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => setEditingLabel(label)}>
                              <Pencil className="size-4" />
                              Edit
                           </DropdownMenuItem>
                           <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => void handleDelete(label)}
                           >
                              <Trash2 className="size-4" />
                              Delete
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
               ))}
            </div>
         ) : (
            <p className="text-sm text-muted-foreground">
               No labels yet. Add labels to classify issues.
            </p>
         )}

         <LabelDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onSave={(input) => handleSave(input)}
         />
         <LabelDialog
            label={editingLabel}
            open={Boolean(editingLabel)}
            onOpenChange={(open) => {
               if (!open) setEditingLabel(null);
            }}
            onSave={(input) => handleSave(input, editingLabel ?? undefined)}
         />
      </section>
   );
}

function LabelDialog({
   label,
   open,
   onOpenChange,
   onSave,
}: {
   label?: LabelInterface | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSave: (input: { name: string; color: string }) => Promise<void>;
}) {
   const [name, setName] = useState('');
   const [color, setColor] = useState(defaultLabelColors[7]);
   const [isSaving, setIsSaving] = useState(false);

   useEffect(() => {
      if (!open) return;
      setName(label?.name ?? '');
      setColor(label?.color ?? defaultLabelColors[7]);
   }, [label, open]);

   const handleSubmit = async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
         toast.error('Label name is required');
         return;
      }

      setIsSaving(true);
      await onSave({ name: trimmedName, color });
      setIsSaving(false);
      onOpenChange(false);
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>{label ? 'Edit label' : 'Create label'}</DialogTitle>
               <DialogDescription>Labels are shared across all issues.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
               <div className="space-y-2">
                  <Label htmlFor="label-name">Name</Label>
                  <Input
                     id="label-name"
                     value={name}
                     maxLength={80}
                     placeholder="bug"
                     onChange={(event) => setName(event.target.value)}
                  />
               </div>
               <div className="space-y-3">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                     {defaultLabelColors.map((item) => (
                        <button
                           key={item}
                           type="button"
                           className="size-7 rounded-full border ring-offset-background data-[selected=true]:ring-2 data-[selected=true]:ring-ring data-[selected=true]:ring-offset-2"
                           style={{ backgroundColor: item }}
                           data-selected={color.toLowerCase() === item.toLowerCase()}
                           aria-label={`Use color ${item}`}
                           onClick={() => setColor(item)}
                        />
                     ))}
                  </div>
                  <div className="flex items-center gap-3">
                     <Input
                        type="color"
                        value={color}
                        onChange={(event) => setColor(event.target.value)}
                        className="h-9 w-14 p-1 shrink-0"
                     />
                     <Input
                        value={color}
                        onChange={(event) => setColor(event.target.value)}
                        placeholder="#94a3b8"
                     />
                  </div>
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
               </Button>
               <Button disabled={isSaving} onClick={() => void handleSubmit()}>
                  {isSaving ? 'Saving...' : 'Save'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
