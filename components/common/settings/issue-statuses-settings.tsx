'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { issueStatusOptionsQuery, useIssueStatusCommands } from '@/src/data/issue-automations';

export function IssueStatusesSettings() {
   const { data: liveStatuses } = useQuery(issueStatusOptionsQuery());
   const [draggedId, setDraggedId] = useState<string | null>(null);
   const { reorderIssueStatuses } = useIssueStatusCommands();

   const orderedStatuses = useMemo(() => {
      const statuses = liveStatuses ?? [];
      return [...statuses].sort((a, b) => a.position - b.position);
   }, [liveStatuses]);

   const handleReorder = async (activeId: string, overId: string) => {
      if (activeId === overId) {
         return;
      }

      const activeIndex = orderedStatuses.findIndex((item) => item.id === activeId);
      const overIndex = orderedStatuses.findIndex((item) => item.id === overId);

      if (activeIndex < 0 || overIndex < 0) {
         return;
      }

      const nextOptions = [...orderedStatuses];
      const [moved] = nextOptions.splice(activeIndex, 1);
      nextOptions.splice(overIndex, 0, moved);

      try {
         await reorderIssueStatuses({ ids: nextOptions.map((item) => item.id) });
         toast.success('Issue statuses reordered');
      } catch (error) {
         const message =
            error instanceof Error ? error.message : 'Statuses could not be reordered.';
         toast.error(message);
      }
   };

   return (
      <div className="rounded-lg border bg-card p-5 space-y-4">
         <div className="flex items-start justify-between gap-3">
            <div>
               <h3 className="font-medium text-card-foreground">Issue statuses</h3>
               <p className="text-sm text-muted-foreground mt-1">
                  Order of issue groups in lists, boards, filters, and forms.
               </p>
            </div>
         </div>

         <div className="space-y-1.5">
            {orderedStatuses.map((item) => (
               <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedId(item.id)}
                  onDragOver={(event) => {
                     event.preventDefault();
                  }}
                  onDragEnter={(event) => {
                     event.preventDefault();
                  }}
                  onDrop={(event) => {
                     event.preventDefault();
                     event.stopPropagation();

                     if (draggedId) {
                        const activeId = draggedId;
                        setDraggedId(null);
                        void handleReorder(activeId, item.id);
                     }
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  className="group flex items-center justify-between gap-3 rounded-md border px-3 py-2 hover:bg-accent/50"
                  style={{
                     opacity: draggedId === item.id ? 0.5 : 1,
                  }}
               >
                  <div className="flex items-center gap-3 min-w-0">
                     <GripVertical className="size-4 shrink-0 text-muted-foreground/60" />
                     <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                     />
                     <p className="text-sm font-medium truncate">{item.name}</p>
                     <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                  </div>
               </div>
            ))}
            {orderedStatuses.length === 0 && (
               <p className="text-sm text-muted-foreground">No issue statuses yet.</p>
            )}
         </div>
      </div>
   );
}
