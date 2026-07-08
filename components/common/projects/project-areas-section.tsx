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
import type { ProjectArea } from '@/lib/models';
import { useProjectCommands } from '@/src/data/projects';

const defaultAreaColors = ['#38bdf8', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#eab308'];

interface ProjectAreasSectionProps {
   projectId: string;
   initialAreas: ProjectArea[];
   onAreasChange?: (areas: ProjectArea[]) => void;
}

export function ProjectAreasSection({
   projectId,
   initialAreas,
   onAreasChange,
}: ProjectAreasSectionProps) {
   const [areas, setAreas] = useState(() => initialAreas);
   const [editingArea, setEditingArea] = useState<ProjectArea | null>(null);
   const [isCreateOpen, setIsCreateOpen] = useState(false);
   const { createProjectArea, updateProjectArea, deleteProjectArea } = useProjectCommands();

   const updateAreas = (nextAreas: ProjectArea[]) => {
      const sorted = nextAreas.toSorted(
         (left, right) => left.position - right.position || left.name.localeCompare(right.name)
      );
      setAreas(sorted);
      onAreasChange?.(sorted);
   };

   const handleSave = async (input: { name: string; color: string }, area?: ProjectArea) => {
      try {
         if (area) {
            const updated = await updateProjectArea({ areaId: area.id, ...input });
            updateAreas(areas.map((item) => (item.id === updated.id ? updated : item)));
            toast.success('Area updated');
            return;
         }

         const created = await createProjectArea({ projectId, ...input });
         updateAreas([...areas, created]);
         toast.success('Area created');
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Area could not be saved.';
         toast.error(message);
      }
   };

   const handleDelete = async (area: ProjectArea) => {
      const confirmed = window.confirm(
         `Delete "${area.name}"? Issues using it will keep the project but lose the area.`
      );
      if (!confirmed) return;

      try {
         await deleteProjectArea({ areaId: area.id });
         updateAreas(areas.filter((item) => item.id !== area.id));
         toast.success('Area deleted');
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Area could not be deleted.';
         toast.error(message);
      }
   };

   return (
      <section className="mt-8 border-t pt-5">
         <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">Areas</h2>
            <Button
               type="button"
               size="sm"
               variant="ghost"
               className="h-7 gap-1.5"
               onClick={() => setIsCreateOpen(true)}
            >
               <Plus className="size-3.5" />
               Add
            </Button>
         </div>

         {areas.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
               {areas.map((area) => (
                  <div
                     key={area.id}
                     className="inline-flex h-7 max-w-56 items-center gap-2 rounded-md border bg-background/50 pl-2 pr-1 text-sm"
                  >
                     <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: area.color }}
                        aria-hidden="true"
                     />
                     <span className="truncate">{area.name}</span>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-5 shrink-0"
                              aria-label={`Manage ${area.name}`}
                           >
                              <MoreHorizontal className="size-3.5" />
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => setEditingArea(area)}>
                              <Pencil className="size-4" />
                              Edit
                           </DropdownMenuItem>
                           <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => void handleDelete(area)}
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
            <p className="mt-3 text-sm text-muted-foreground">
               No areas yet. Add areas to classify issues within this project.
            </p>
         )}

         <ProjectAreaDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onSave={(input) => handleSave(input)}
         />
         <ProjectAreaDialog
            area={editingArea}
            open={Boolean(editingArea)}
            onOpenChange={(open) => {
               if (!open) setEditingArea(null);
            }}
            onSave={(input) => handleSave(input, editingArea ?? undefined)}
         />
      </section>
   );
}

function ProjectAreaDialog({
   area,
   open,
   onOpenChange,
   onSave,
}: {
   area?: ProjectArea | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSave: (input: { name: string; color: string }) => Promise<void>;
}) {
   const [name, setName] = useState('');
   const [color, setColor] = useState(defaultAreaColors[0]);
   const [isSaving, setIsSaving] = useState(false);

   useEffect(() => {
      if (!open) return;
      setName(area?.name ?? '');
      setColor(area?.color ?? defaultAreaColors[0]);
   }, [area, open]);

   const handleOpenChange = (nextOpen: boolean) => {
      onOpenChange(nextOpen);
   };

   const handleSubmit = async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
         toast.error('Area name is required');
         return;
      }

      setIsSaving(true);
      await onSave({ name: trimmedName, color });
      setIsSaving(false);
      onOpenChange(false);
   };

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>{area ? 'Edit area' : 'Create area'}</DialogTitle>
               <DialogDescription>Areas are only available inside this project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
               <div className="space-y-2">
                  <Label htmlFor="area-name">Name</Label>
                  <Input
                     id="area-name"
                     value={name}
                     maxLength={80}
                     placeholder="Web app"
                     onChange={(event) => setName(event.target.value)}
                  />
               </div>
               <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                     {defaultAreaColors.map((item) => (
                        <button
                           key={item}
                           type="button"
                           className="size-6 rounded-full border ring-offset-background data-[selected=true]:ring-2 data-[selected=true]:ring-ring data-[selected=true]:ring-offset-2"
                           style={{ backgroundColor: item }}
                           data-selected={color === item}
                           aria-label={`Use color ${item}`}
                           onClick={() => setColor(item)}
                        />
                     ))}
                  </div>
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
               </Button>
               <Button disabled={isSaving} onClick={() => void handleSubmit()}>
                  Save
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
