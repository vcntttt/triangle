'use client';

import { useEffect, useState } from 'react';
import { MoreHorizontal, Pencil, Plus, Trash2, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { IssueAutomation, IssueStatusOption, LabelInterface } from '@/lib/models';
import { useIssueAutomationCommands } from '@/src/data/issue-automations';

const anyStatus = '__any__';
const archivedStatus: IssueStatusOption = {
   id: 'archived',
   name: 'Archived',
   color: '#64748b',
   type: 'completed',
   position: Number.MAX_SAFE_INTEGER,
};

interface AutomationsSettingsProps {
   initialAutomations: IssueAutomation[];
   labels: LabelInterface[];
   statuses: IssueStatusOption[];
}

export function AutomationsSettings({
   initialAutomations,
   labels,
   statuses,
}: AutomationsSettingsProps) {
   const [automations, setAutomations] = useState(initialAutomations);
   const [editingAutomation, setEditingAutomation] = useState<IssueAutomation | null>(null);
   const [isCreateOpen, setIsCreateOpen] = useState(false);
   const commands = useIssueAutomationCommands();
   const allStatuses = [...statuses, archivedStatus];
   const statusNames = new Map(allStatuses.map((status) => [status.id, status.name]));
   const labelNames = new Map(labels.map((label) => [label.id, label.name]));

   useEffect(() => setAutomations(initialAutomations), [initialAutomations]);

   const saveAutomation = async (input: AutomationInput, automation?: IssueAutomation) => {
      try {
         if (automation) {
            const updated = await commands.updateAutomation({
               automationId: automation.id,
               ...input,
            });
            setAutomations((current) =>
               current.map((item) => (item.id === updated.id ? updated : item))
            );
            toast.success('Automation updated');
            return;
         }

         const created = await commands.createAutomation(input);
         setAutomations((current) => [...current, created]);
         toast.success('Automation created');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Automation could not be saved.');
         throw error;
      }
   };

   const toggleAutomation = async (automation: IssueAutomation, enabled: boolean) => {
      setAutomations((current) =>
         current.map((item) => (item.id === automation.id ? { ...item, enabled } : item))
      );
      try {
         await commands.setAutomationEnabled({ automationId: automation.id, enabled });
         toast.success(enabled ? 'Automation enabled' : 'Automation disabled');
      } catch (error) {
         setAutomations((current) =>
            current.map((item) =>
               item.id === automation.id ? { ...item, enabled: automation.enabled } : item
            )
         );
         toast.error(error instanceof Error ? error.message : 'Automation could not be updated.');
      }
   };

   const deleteAutomation = async (automation: IssueAutomation) => {
      if (!window.confirm(`Delete "${automation.name}"?`)) return;
      try {
         await commands.deleteAutomation({ automationId: automation.id });
         setAutomations((current) => current.filter((item) => item.id !== automation.id));
         toast.success('Automation deleted');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Automation could not be deleted.');
      }
   };

   return (
      <section className="mb-10" id="automations">
         <div className="mb-4 flex items-start justify-between gap-3">
            <div>
               <h2 className="text-lg font-semibold">Automations</h2>
               <p className="text-sm text-muted-foreground">
                  Run actions whenever an issue changes status.
               </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setIsCreateOpen(true)}>
               <Plus className="size-4" />
               Add
            </Button>
         </div>

         {automations.length > 0 ? (
            <div className="divide-y rounded-lg border">
               {automations.map((automation) => {
                  const removedLabels = automation.actions
                     .map((action) => labelNames.get(action.labelId))
                     .filter(Boolean)
                     .join(', ');
                  return (
                     <div key={automation.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                           <Workflow className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                           <p className="truncate text-sm font-medium">{automation.name}</p>
                           <p className="truncate text-xs text-muted-foreground">
                              {automation.fromStatus
                                 ? statusNames.get(automation.fromStatus)
                                 : 'Any status'}{' '}
                              → {statusNames.get(automation.toStatus) ?? automation.toStatus};
                              remove {removedLabels || 'missing labels'}
                           </p>
                        </div>
                        <Switch
                           checked={automation.enabled}
                           aria-label={`${automation.enabled ? 'Disable' : 'Enable'} ${automation.name}`}
                           onCheckedChange={(enabled) => void toggleAutomation(automation, enabled)}
                        />
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="icon"
                                 className="size-8"
                                 aria-label={`Manage ${automation.name}`}
                              >
                                 <MoreHorizontal className="size-4" />
                              </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingAutomation(automation)}>
                                 <Pencil className="size-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                 className="text-destructive"
                                 onClick={() => void deleteAutomation(automation)}
                              >
                                 <Trash2 className="size-4" /> Delete
                              </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                  );
               })}
            </div>
         ) : (
            <div className="rounded-lg border border-dashed px-5 py-8 text-center">
               <Workflow className="mx-auto mb-2 size-5 text-muted-foreground" />
               <p className="text-sm font-medium">No automations yet</p>
               <p className="mt-1 text-xs text-muted-foreground">
                  Add one to keep issue metadata tidy as work moves forward.
               </p>
            </div>
         )}

         <AutomationDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            labels={labels}
            statuses={allStatuses}
            onSave={saveAutomation}
         />
         <AutomationDialog
            automation={editingAutomation}
            open={Boolean(editingAutomation)}
            onOpenChange={(open) => !open && setEditingAutomation(null)}
            labels={labels}
            statuses={allStatuses}
            onSave={(input) => saveAutomation(input, editingAutomation ?? undefined)}
         />
      </section>
   );
}

interface AutomationInput {
   name: string;
   enabled: boolean;
   fromStatus?: string;
   toStatus: string;
   actions: Array<{ type: 'removeLabel'; labelId: string }>;
}

function AutomationDialog({
   automation,
   open,
   onOpenChange,
   labels,
   statuses,
   onSave,
}: {
   automation?: IssueAutomation | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   labels: LabelInterface[];
   statuses: IssueStatusOption[];
   onSave: (input: AutomationInput) => Promise<void>;
}) {
   const [name, setName] = useState('');
   const [fromStatus, setFromStatus] = useState(anyStatus);
   const [toStatus, setToStatus] = useState('completed');
   const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
   const [isSaving, setIsSaving] = useState(false);

   useEffect(() => {
      if (!open) return;
      setName(automation?.name ?? 'Remove labels after status change');
      setFromStatus(automation?.fromStatus ?? anyStatus);
      setToStatus(automation?.toStatus ?? 'completed');
      setSelectedLabelIds(automation?.actions.map((action) => action.labelId) ?? []);
   }, [automation, open]);

   const handleSubmit = async () => {
      if (!name.trim()) return toast.error('Automation name is required');
      if (selectedLabelIds.length === 0) return toast.error('Select at least one label');
      if (fromStatus === toStatus) return toast.error('Source and destination must be different');
      setIsSaving(true);
      try {
         await onSave({
            name: name.trim(),
            enabled: automation?.enabled ?? true,
            fromStatus: fromStatus === anyStatus ? undefined : fromStatus,
            toStatus,
            actions: selectedLabelIds.map((labelId) => ({ type: 'removeLabel', labelId })),
         });
         onOpenChange(false);
      } finally {
         setIsSaving(false);
      }
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>{automation ? 'Edit automation' : 'Create automation'}</DialogTitle>
               <DialogDescription>
                  Remove selected labels when an issue enters a status.
               </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
               <div className="space-y-2">
                  <Label htmlFor="automation-name">Name</Label>
                  <Input
                     id="automation-name"
                     value={name}
                     maxLength={100}
                     onChange={(event) => setName(event.target.value)}
                  />
               </div>
               <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <div className="space-y-2">
                     <Label>From</Label>
                     <Select value={fromStatus} onValueChange={setFromStatus}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value={anyStatus}>Any status</SelectItem>
                           {statuses.map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                 {status.name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <span className="pb-2 text-muted-foreground" aria-hidden="true">
                     →
                  </span>
                  <div className="space-y-2">
                     <Label>To</Label>
                     <Select value={toStatus} onValueChange={setToStatus}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {statuses.map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                 {status.name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
               </div>
               <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Remove labels</legend>
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
                     {labels.map((label) => {
                        const checked = selectedLabelIds.includes(label.id);
                        return (
                           <label
                              key={label.id}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60"
                           >
                              <Checkbox
                                 checked={checked}
                                 onCheckedChange={(next) =>
                                    setSelectedLabelIds((current) =>
                                       next
                                          ? [...current, label.id]
                                          : current.filter((id) => id !== label.id)
                                    )
                                 }
                              />
                              <span
                                 className="size-2.5 rounded-full"
                                 style={{ backgroundColor: label.color }}
                                 aria-hidden="true"
                              />
                              <span className="truncate">{label.name}</span>
                           </label>
                        );
                     })}
                     {labels.length === 0 && (
                        <p className="px-2 py-3 text-xs text-muted-foreground">
                           Create a label before adding an automation.
                        </p>
                     )}
                  </div>
               </fieldset>
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
               </Button>
               <Button
                  disabled={isSaving || labels.length === 0}
                  onClick={() => void handleSubmit()}
               >
                  {isSaving ? 'Saving…' : 'Save automation'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
