'use client';

import { BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { Issue } from '@/lib/models';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { cn } from '@/lib/utils';
import { useIssueInsightsStore } from '@/store/issue-insights-store';

export function IssueInsightsToggle() {
   const isOpen = useIssueInsightsStore((state) => state.isOpen);
   const toggle = useIssueInsightsStore((state) => state.toggle);

   return (
      <Button
         type="button"
         size="xs"
         variant={isOpen ? 'secondary' : 'ghost'}
         className="hidden h-7 gap-1.5 px-2 text-xs md:inline-flex"
         aria-pressed={isOpen}
         onClick={toggle}
      >
         <BarChart3 className="size-3.5" />
         Insights
      </Button>
   );
}

export function IssueInsightsPanel({
   issues,
   statuses,
   priorities,
}: {
   issues: Issue[];
   statuses: ProjectOptionLike[];
   priorities: ProjectOptionLike[];
}) {
   const statusCounts = statuses.map((status) => ({
      ...status,
      count: issues.filter((issue) => issue.status.id === status.id).length,
   }));
   const priorityCounts = priorities
      .map((priority) => ({
         label: priority.name,
         color: priority.color,
         count: issues.filter((issue) => issue.priority.id === priority.id).length,
      }))
      .filter((priority) => priority.count > 0);
   const projectCounts = countBy(issues, (issue) => issue.project?.name ?? 'No project').slice(
      0,
      5
   );
   const areaCounts = countBy(issues, (issue) => issue.area?.name ?? 'No area').slice(0, 5);
   const openCount = issues.filter((issue) => issue.status.id !== 'completed').length;
   const completedCount = issues.length - openCount;
   const maxStatusCount = Math.max(...statusCounts.map((status) => status.count), 1);

   return (
      <aside className="flex h-full min-w-0 flex-col border-l border-border/60 bg-background">
         <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div>
               <p className="text-sm font-medium">Insights</p>
               <p className="text-[11px] text-muted-foreground">Current issue scope</p>
            </div>
            <span className="text-xs text-muted-foreground">{issues.length} total</span>
         </div>

         <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-2">
               <MetricCard label="Open" value={openCount} />
               <MetricCard label="Closed" value={completedCount} />
            </div>

            <section className="mt-6" aria-labelledby="issue-insights-status-heading">
               <SectionHeading id="issue-insights-status-heading">Status</SectionHeading>
               <div
                  className="mt-3 flex h-28 items-end gap-1 border-b border-border/70 px-1"
                  aria-label="Issue count by status"
               >
                  {statusCounts.map((status) => (
                     <div
                        key={status.id}
                        className="flex min-w-0 flex-1 flex-col items-center gap-1"
                     >
                        <div
                           className="w-full max-w-7 rounded-t-sm transition-[height]"
                           style={{
                              height: `${Math.max((status.count / maxStatusCount) * 100, status.count ? 8 : 2)}%`,
                              backgroundColor: status.color,
                              opacity: status.count ? 0.9 : 0.18,
                           }}
                           title={`${status.name}: ${status.count}`}
                        />
                        <span className="max-w-full truncate text-[9px] text-muted-foreground">
                           {status.name}
                        </span>
                     </div>
                  ))}
               </div>
               <div className="mt-3 space-y-1.5">
                  {statusCounts.map((status) => (
                     <BreakdownRow
                        key={status.id}
                        label={status.name}
                        count={status.count}
                        color={status.color}
                     />
                  ))}
               </div>
            </section>

            <BreakdownSection title="Priority" items={priorityCounts} />
            <BreakdownSection title="Project" items={projectCounts} />
            <BreakdownSection title="Area" items={areaCounts} />
         </div>
      </aside>
   );
}

function countBy(issues: Issue[], getKey: (issue: Issue) => string) {
   const counts = new Map<string, number>();
   issues.forEach((issue) => {
      const key = getKey(issue);
      counts.set(key, (counts.get(key) ?? 0) + 1);
   });

   return Array.from(counts, ([label, count]) => ({ label, count })).sort(
      (left, right) => right.count - left.count || left.label.localeCompare(right.label)
   );
}

function MetricCard({ label, value }: { label: string; value: number }) {
   return (
      <div className="rounded-md bg-muted/40 px-3 py-2">
         <p className="text-[11px] text-muted-foreground">{label}</p>
         <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      </div>
   );
}

function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
   return (
      <h2 id={id} className="text-xs font-medium text-muted-foreground">
         {children}
      </h2>
   );
}

function BreakdownSection({
   title,
   items,
}: {
   title: string;
   items: Array<{ label: string; count: number; color?: string }>;
}) {
   if (items.length === 0) return null;

   return (
      <section className="mt-6" aria-label={`${title} breakdown`}>
         <SectionHeading>{title}</SectionHeading>
         <div className="mt-2 space-y-1.5">
            {items.map((item) => (
               <BreakdownRow key={item.label} {...item} />
            ))}
         </div>
      </section>
   );
}

function BreakdownRow({ label, count, color }: { label: string; count: number; color?: string }) {
   return (
      <div className="flex min-w-0 items-center gap-2 text-xs">
         <span
            className={cn('size-2 shrink-0 rounded-full', !color && 'bg-muted-foreground/40')}
            style={color ? { backgroundColor: color } : undefined}
            aria-hidden="true"
         />
         <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
         <span className="tabular-nums text-foreground">{count}</span>
      </div>
   );
}
