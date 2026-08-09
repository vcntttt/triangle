'use client';

import { Activity, CheckCircle2, CircleDot, Layers3 } from 'lucide-react';
import type { IssueListItem } from '@/lib/db/issues';
import type { ProjectArea } from '@/lib/models';
import type { ProjectOptionLike } from '@/lib/projects-presentation';

export function ProjectInsightsPanel({
   project,
   issues,
   statuses,
   areas,
}: {
   project: {
      health?: { name: string } | null;
      attention?: { name: string } | null;
      latestUpdate?: { createdAt: string } | null;
   };
   issues: IssueListItem[];
   statuses: ProjectOptionLike[];
   areas: ProjectArea[];
}) {
   const completedIds = new Set(['completed', 'archived', 'canceled', 'cancelled']);
   const completed = issues.filter((issue) => completedIds.has(issue.status)).length;
   const open = issues.length - completed;
   const statusCounts = statuses
      .map((status) => ({
         ...status,
         count: issues.filter((issue) => issue.status === status.id).length,
      }))
      .filter((status) => status.count > 0);
   const areaCounts = areas
      .map((area) => ({
         ...area,
         count: issues.filter((issue) => issue.area?.id === area.id).length,
      }))
      .filter((area) => area.count > 0);

   return (
      <aside className="space-y-3">
         <section className="rounded-lg border bg-background/50 p-3">
            <div className="mb-3 flex items-center gap-2">
               <Activity className="size-4 text-muted-foreground" />
               <h2 className="text-sm font-medium">Project health</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <Metric icon={<CircleDot className="size-3.5" />} label="Open" value={open} />
               <Metric
                  icon={<CheckCircle2 className="size-3.5" />}
                  label="Closed"
                  value={completed}
               />
            </div>
            <div className="mt-3 space-y-1.5">
               {statusCounts.map((status) => (
                  <div key={status.id} className="flex items-center justify-between text-xs">
                     <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                        <span
                           className="size-2 rounded-full"
                           style={{ backgroundColor: status.color }}
                        />
                        <span className="truncate">{status.name}</span>
                     </span>
                     <span>{status.count}</span>
                  </div>
               ))}
            </div>
         </section>
         <section className="rounded-lg border bg-background/50 p-3">
            <div className="mb-3 flex items-center gap-2">
               <Layers3 className="size-4 text-muted-foreground" />
               <h2 className="text-sm font-medium">Areas</h2>
            </div>
            {areaCounts.length > 0 ? (
               <div className="space-y-1.5">
                  {areaCounts.map((area) => (
                     <div key={area.id} className="flex items-center justify-between text-xs">
                        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                           <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: area.color }}
                           />
                           <span className="truncate">{area.name}</span>
                        </span>
                        <span>{area.count}</span>
                     </div>
                  ))}
               </div>
            ) : (
               <p className="text-xs text-muted-foreground">No areas yet.</p>
            )}
         </section>
         <section className="rounded-lg border bg-background/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{project.health?.name ?? 'No update'}</p>
            <p className="mt-1">{project.attention?.name ?? 'No attention flag'}</p>
            {project.latestUpdate ? (
               <p className="mt-2">
                  Updated {new Date(project.latestUpdate.createdAt).toLocaleDateString()}
               </p>
            ) : null}
         </section>
      </aside>
   );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
   return (
      <div className="rounded-md bg-muted/50 p-2">
         <div className="flex items-center gap-1.5 text-muted-foreground">
            {icon}
            <span className="text-[11px]">{label}</span>
         </div>
         <p className="mt-1 text-lg font-semibold">{value}</p>
      </div>
   );
}
