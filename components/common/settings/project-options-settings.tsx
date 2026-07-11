'use client';

import { FormEvent, useMemo, useState } from 'react';
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetFooter,
   SheetHeader,
   SheetTitle,
} from '@/components/ui/sheet';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { useProjectCommands } from '@/src/data/projects';

const defaultColors = [
   '#ef4444',
   '#f97316',
   '#facc15',
   '#22c55e',
   '#38bdf8',
   '#8b5cf6',
   '#ec4899',
   '#94a3b8',
];

type OptionType = 'status' | 'priority';

interface ProjectOptionsSettingsProps {
   initialStatuses: ProjectOptionLike[];
   initialPriorities: ProjectOptionLike[];
}

interface SheetState {
   open: boolean;
   type: OptionType;
   mode: 'create' | 'edit';
   optionId?: string;
   name: string;
   color: string;
}

const initialSheetState: SheetState = {
   open: false,
   type: 'status',
   mode: 'create',
   optionId: undefined,
   name: '',
   color: defaultColors[7],
};

export function ProjectOptionsSettings({
   initialStatuses,
   initialPriorities,
}: ProjectOptionsSettingsProps) {
   const [statuses, setStatuses] = useState(() => initialStatuses);
   const [priorities, setPriorities] = useState(() => initialPriorities);
   const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
   const [draggedStatusId, setDraggedStatusId] = useState<string | null>(null);
   const [isSaving, setIsSaving] = useState(false);
   const [sheetState, setSheetState] = useState<SheetState>(initialSheetState);
   const {
      createProjectPriority,
      createProjectStatus,
      deleteProjectPriority,
      deleteProjectStatus,
      reorderProjectStatuses,
      updateProjectPriority,
      updateProjectStatus,
   } = useProjectCommands();

   const currentItems = sheetState.type === 'status' ? statuses : priorities;
   const orderedStatuses = useMemo(
      () => statuses.toSorted((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      [statuses]
   );

   const openCreateSheet = (type: OptionType) => {
      setSheetState({
         open: true,
         type,
         mode: 'create',
         optionId: undefined,
         name: '',
         color: defaultColors[7],
      });
   };

   const openEditSheet = (type: OptionType, option: ProjectOptionLike) => {
      setSheetState({
         open: true,
         type,
         mode: 'edit',
         optionId: option.id,
         name: option.name,
         color: option.color,
      });
   };

   const closeSheet = () => {
      setSheetState(initialSheetState);
   };

   const handleDelete = async (type: OptionType, id: string) => {
      setPendingDeleteId(id);

      try {
         if (type === 'status') {
            await deleteProjectStatus({ id });
            setStatuses((previous) => previous.filter((item) => item.id !== id));
            toast.success('Status deleted');
         } else {
            await deleteProjectPriority({ id });
            setPriorities((previous) => previous.filter((item) => item.id !== id));
            toast.success('Priority deleted');
         }
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Option could not be deleted.';
         toast.error(message);
      } finally {
         setPendingDeleteId(null);
      }
   };

   const handleStatusReorder = async (activeId: string, overId: string) => {
      if (activeId === overId) {
         return;
      }

      const previousStatuses = statuses;
      const activeIndex = previousStatuses.findIndex((item) => item.id === activeId);
      const overIndex = previousStatuses.findIndex((item) => item.id === overId);

      if (activeIndex < 0 || overIndex < 0) {
         return;
      }

      const nextStatuses = [...previousStatuses];
      const [moved] = nextStatuses.splice(activeIndex, 1);
      nextStatuses.splice(overIndex, 0, moved);
      const normalizedStatuses = nextStatuses.map((item, index) => ({
         ...item,
         position: index,
      }));

      setStatuses(normalizedStatuses);

      try {
         await reorderProjectStatuses({ ids: normalizedStatuses.map((item) => item.id) });
         toast.success('Statuses reordered');
      } catch (error) {
         setStatuses(previousStatuses);
         const message =
            error instanceof Error ? error.message : 'Statuses could not be reordered.';
         toast.error(message);
      }
   };

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!sheetState.name.trim()) {
         toast.error('Name is required');
         return;
      }

      setIsSaving(true);

      try {
         if (sheetState.type === 'status') {
            if (sheetState.mode === 'create') {
               const created = (await createProjectStatus({
                  name: sheetState.name,
                  color: sheetState.color,
               })) as ProjectOptionLike;
               setStatuses((previous) => [...previous, created]);
               toast.success('Status created');
            } else if (sheetState.optionId) {
               const updated = (await updateProjectStatus({
                  id: sheetState.optionId,
                  name: sheetState.name,
                  color: sheetState.color,
               })) as ProjectOptionLike;
               setStatuses((previous) =>
                  previous.map((item) => (item.id === updated.id ? updated : item))
               );
               toast.success('Status updated');
            }
         } else if (sheetState.mode === 'create') {
            const created = (await createProjectPriority({
               name: sheetState.name,
               color: sheetState.color,
            })) as ProjectOptionLike;
            setPriorities((previous) => [...previous, created]);
            toast.success('Priority created');
         } else if (sheetState.optionId) {
            const updated = (await updateProjectPriority({
               id: sheetState.optionId,
               name: sheetState.name,
               color: sheetState.color,
            })) as ProjectOptionLike;
            setPriorities((previous) =>
               previous.map((item) => (item.id === updated.id ? updated : item))
            );
            toast.success('Priority updated');
         }

         closeSheet();
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Option could not be saved.';
         toast.error(message);
      } finally {
         setIsSaving(false);
      }
   };

   return (
      <>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OptionListCard
               title="Project statuses"
               description="Statuses available in the projects view and creation dialog."
               items={orderedStatuses}
               onCreate={() => openCreateSheet('status')}
               onEdit={(option) => openEditSheet('status', option)}
               onDelete={(id) => void handleDelete('status', id)}
               pendingDeleteId={pendingDeleteId}
               draggable
               draggedId={draggedStatusId}
               onDragStart={(id) => setDraggedStatusId(id)}
               onDragEnd={(activeId, overId) => {
                  setDraggedStatusId(null);
                  void handleStatusReorder(activeId, overId);
               }}
            />

            <OptionListCard
               title="Project priorities"
               description="Priorities used in list view and filtering."
               items={priorities}
               onCreate={() => openCreateSheet('priority')}
               onEdit={(option) => openEditSheet('priority', option)}
               onDelete={(id) => void handleDelete('priority', id)}
               pendingDeleteId={pendingDeleteId}
            />
         </div>

         <Sheet open={sheetState.open} onOpenChange={(open) => (!open ? closeSheet() : undefined)}>
            <SheetContent>
               <SheetHeader>
                  <SheetTitle>
                     {sheetState.mode === 'create' ? 'Create' : 'Edit'} {sheetState.type}
                  </SheetTitle>
                  <SheetDescription>
                     Changes apply immediately to project create and edit flows.
                  </SheetDescription>
               </SheetHeader>

               <form onSubmit={handleSubmit} className="px-4 space-y-5">
                  <div className="space-y-2">
                     <Label htmlFor="option-name">Name</Label>
                     <Input
                        id="option-name"
                        value={sheetState.name}
                        onChange={(event) =>
                           setSheetState((state) => ({ ...state, name: event.target.value }))
                        }
                        placeholder={sheetState.type === 'status' ? 'In QA' : 'Critical'}
                        maxLength={80}
                     />
                  </div>

                  <div className="space-y-3">
                     <Label>Color</Label>
                     <div className="flex flex-wrap gap-2">
                        {defaultColors.map((item) => (
                           <button
                              key={item}
                              type="button"
                              className="size-7 rounded-full border ring-offset-background data-[selected=true]:ring-2 data-[selected=true]:ring-ring data-[selected=true]:ring-offset-2"
                              style={{ backgroundColor: item }}
                              data-selected={sheetState.color.toLowerCase() === item.toLowerCase()}
                              aria-label={`Use color ${item}`}
                              onClick={() => setSheetState((state) => ({ ...state, color: item }))}
                           />
                        ))}
                     </div>
                     <div className="flex items-center gap-3">
                        <Input
                           type="color"
                           value={sheetState.color}
                           onChange={(event) =>
                              setSheetState((state) => ({ ...state, color: event.target.value }))
                           }
                           className="h-9 w-14 p-1 shrink-0"
                        />
                        <Input
                           value={sheetState.color}
                           onChange={(event) =>
                              setSheetState((state) => ({ ...state, color: event.target.value }))
                           }
                           placeholder="#94a3b8"
                        />
                     </div>
                  </div>

                  <SheetFooter className="px-0">
                     <Button
                        type="button"
                        variant="outline"
                        onClick={closeSheet}
                        disabled={isSaving}
                     >
                        Cancel
                     </Button>
                     <Button
                        type="submit"
                        disabled={
                           isSaving || (currentItems.length === 0 && sheetState.mode === 'edit')
                        }
                     >
                        {isSaving ? 'Saving...' : 'Save'}
                     </Button>
                  </SheetFooter>
               </form>
            </SheetContent>
         </Sheet>
      </>
   );
}

function OptionListCard({
   title,
   description,
   items,
   onCreate,
   onEdit,
   onDelete,
   pendingDeleteId,
   draggable = false,
   draggedId,
   onDragStart,
   onDragEnd,
}: {
   title: string;
   description: string;
   items: ProjectOptionLike[];
   onCreate: () => void;
   onEdit: (option: ProjectOptionLike) => void;
   onDelete: (id: string) => void;
   pendingDeleteId: string | null;
   draggable?: boolean;
   draggedId?: string | null;
   onDragStart?: (id: string) => void;
   onDragEnd?: (activeId: string, overId: string) => void;
}) {
   return (
      <div className="rounded-lg border bg-card p-5 space-y-4">
         <div className="flex items-start justify-between gap-3">
            <div>
               <h3 className="font-medium text-card-foreground">{title}</h3>
               <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={onCreate}>
               <Plus className="size-4" />
               Add
            </Button>
         </div>

         <div className="space-y-1.5">
            {items.map((item) => (
               <div
                  key={item.id}
                  draggable={draggable}
                  onDragStart={() => onDragStart?.(item.id)}
                  onDragOver={(event) => {
                     if (draggable) {
                        event.preventDefault();
                     }
                  }}
                  onDrop={() => {
                     if (draggable && draggedId) {
                        onDragEnd?.(draggedId, item.id);
                     }
                  }}
                  className="group flex items-center justify-between gap-3 rounded-md border px-3 py-2 hover:bg-accent/50"
                  style={{
                     opacity: draggable && draggedId === item.id ? 0.5 : 1,
                  }}
               >
                  <div className="flex items-center gap-3 min-w-0">
                     {draggable ? (
                        <GripVertical className="size-4 shrink-0 text-muted-foreground/60" />
                     ) : null}
                     <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                     />
                     <p className="text-sm font-medium truncate">{item.name}</p>
                  </div>

                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                           size="icon"
                           variant="ghost"
                           className="size-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                           disabled={pendingDeleteId === item.id}
                           aria-label={`Manage ${item.name}`}
                        >
                           <MoreHorizontal className="size-4" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                           <Pencil className="size-4" />
                           Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           className="text-destructive"
                           onClick={() => onDelete(item.id)}
                        >
                           <Trash2 className="size-4" />
                           Delete
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>
            ))}
         </div>
      </div>
   );
}
