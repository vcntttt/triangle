'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
   AlertDialog,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogHeader,
   AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/models';
import { useProjectCommands } from '@/src/data/projects';

interface DeleteProjectDialogProps {
   project: Project;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onDeleted?: () => void;
}

type DeleteMode = 'unlink' | 'withIssues';

export function DeleteProjectDialog({
   project,
   open,
   onOpenChange,
   onDeleted,
}: DeleteProjectDialogProps) {
   const { deleteProject } = useProjectCommands();
   const [mode, setMode] = useState<DeleteMode | null>(null);
   const [error, setError] = useState<string | null>(null);
   const isPending = mode !== null;

   const handleDelete = async (selectedMode: DeleteMode) => {
      setMode(selectedMode);
      setError(null);

      try {
         await deleteProject({ projectId: project.id, mode: selectedMode });
         onOpenChange(false);
         onDeleted?.();
      } catch (err) {
         setMode(null);
         setError(err instanceof Error ? err.message : 'No se pudo eliminar el proyecto.');
      }
   };

   const handleOpenChange = (nextOpen: boolean) => {
      if (!nextOpen) {
         setMode(null);
         setError(null);
      }
      onOpenChange(nextOpen);
   };

   return (
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
         <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
               <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-5 text-destructive" />
                  Eliminar proyecto
               </AlertDialogTitle>
               <AlertDialogDescription>
                  Estás a punto de eliminar <strong>{project.name}</strong>. Esta acción es
                  peligrosa y no se puede deshacer. Elige cómo quieres continuar.
               </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex flex-col gap-2 pt-2">
               <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
               >
                  Cancelar
               </Button>

               <Button
                  variant="secondary"
                  onClick={() => handleDelete('unlink')}
                  disabled={isPending}
               >
                  {mode === 'unlink' && <Loader2 className="size-4 animate-spin" />}
                  Eliminar desvinculando los issues
               </Button>

               <Button
                  variant="destructive"
                  onClick={() => handleDelete('withIssues')}
                  disabled={isPending}
               >
                  {mode === 'withIssues' && <Loader2 className="size-4 animate-spin" />}
                  Eliminar proyecto y los issues
               </Button>
            </div>

            {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
         </AlertDialogContent>
      </AlertDialog>
   );
}
