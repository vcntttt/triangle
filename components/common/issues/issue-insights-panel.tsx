'use client';

import { BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { Issue } from '@/lib/models';
import {
   issueInsightsValue,
   type IssueInsightsDimension,
   type IssueInsightsFocus,
} from '@/lib/issue-view';
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

interface BreakdownItem {
   value: string | null;
   label: string;
   count: number;
   color?: string;
}

// Clicking a breakdown row narrows the list to that value; clicking it again clears the focus.
export function IssueInsightsPanel({
   issues,
   statuses,
   priorities,
   focus,
   onFocusChange,
}: {
   issues: Issue[];
   statuses: ProjectOptionLike[];
   priorities: ProjectOptionLike[];
   focus: IssueInsightsFocus | null;
   onFocusChange: (focus: IssueInsightsFocus | null) => void;
}) {
   const statusCounts = statuses.map((status) => ({
      ...status,
      count: issues.filter((issue) => issue.status.id === status.id).length,
   }));
   const priorityCounts = priorities
      .map((priority) => ({
         value: priority.id,
         label: priority.name,
         color: priority.color,
         count: issues.filter((issue) => issue.priority.id === priority.id).length,
      }))
      .filter((priority) => priority.count > 0);
   const projectCounts = countBy(issues, 'project', (issue) => issue.project?.name ?? 'No project');
   const areaCounts = countBy(issues, 'area', (issue) => issue.area?.name ?? 'No area');
   const toggleFocus = (dimension: IssueInsightsDimension, value: string | null) =>
      onFocusChange(
         focus?.dimension === dimension && focus.value === value ? null : { dimension, value }
      );
   const rowProps = (dimension: IssueInsightsDimension, value: string | null) => ({
      isActive: focus?.dimension === dimension && focus.value === value,
      isDimmed: focus !== null && !(focus.dimension === dimension && focus.value === value),
      onClick: () => toggleFocus(dimension, value),
   });
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
                        className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
                     >
                        <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                           <div
                              className="w-full max-w-7 rounded-t-sm transition-[height]"
                              style={{
                                 height: `${Math.max((status.count / maxStatusCount) * 100, status.count ? 8 : 2)}%`,
                                 backgroundColor: status.color,
                                 opacity: status.count ? 0.9 : 0.18,
                              }}
                              title={`${status.name}: ${status.count}`}
                           />
                        </div>
                        <span className="max-w-full truncate text-[9px] text-muted-foreground">
                           {status.name}
                        </span>
                     </div>
                  ))}
               </div>
               <div className="mt-3 space-y-0.5">
                  {statusCounts.map((status) => (
                     <BreakdownRow
                        key={status.id}
                        label={status.name}
                        count={status.count}
                        color={status.color}
                        {...rowProps('status', status.id)}
                     />
                  ))}
               </div>
            </section>

            <BreakdownSection
               title="Priority"
               items={priorityCounts}
               rowProps={(value) => rowProps('priority', value)}
            />
            <BreakdownSection
               title="Project"
               items={projectCounts}
               rowProps={(value) => rowProps('project', value)}
            />
            <BreakdownSection
               title="Area"
               items={areaCounts}
               rowProps={(value) => rowProps('area', value)}
            />
         </div>
      </aside>
   );
}

function countBy(
   issues: Issue[],
   dimension: IssueInsightsDimension,
   getLabel: (issue: Issue) => string
): BreakdownItem[] {
   const counts = new Map<string | null, BreakdownItem>();
   issues.forEach((issue) => {
      const value = issueInsightsValue[dimension](issue);
      const item = counts.get(value) ?? { value, label: getLabel(issue), count: 0 };
      counts.set(value, { ...item, count: item.count + 1 });
   });

   return Array.from(counts.values())
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
      .slice(0, 5);
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

interface BreakdownRowState {
   isActive: boolean;
   isDimmed: boolean;
   onClick: () => void;
}

function BreakdownSection({
   title,
   items,
   rowProps,
}: {
   title: string;
   items: BreakdownItem[];
   rowProps: (value: string | null) => BreakdownRowState;
}) {
   if (items.length === 0) return null;

   return (
      <section className="mt-6" aria-label={`${title} breakdown`}>
         <SectionHeading>{title}</SectionHeading>
         <div className="mt-2 space-y-0.5">
            {items.map((item) => (
               <BreakdownRow
                  key={item.value ?? 'none'}
                  label={item.label}
                  count={item.count}
                  color={item.color}
                  {...rowProps(item.value)}
               />
            ))}
         </div>
      </section>
   );
}

function BreakdownRow({
   label,
   count,
   color,
   isActive,
   isDimmed,
   onClick,
}: {
   label: string;
   count: number;
   color?: string;
} & BreakdownRowState) {
   return (
      <button
         type="button"
         aria-pressed={isActive}
         disabled={count === 0 && !isActive}
         onClick={onClick}
         className={cn(
            '-mx-1.5 flex w-[calc(100%+0.75rem)] min-w-0 items-center gap-2 rounded-sm px-1.5 py-1 text-left text-xs transition-[background-color,opacity] hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none',
            isActive && 'bg-muted',
            isDimmed && 'opacity-50 hover:opacity-100'
         )}
      >
         <span
            className={cn('size-2 shrink-0 rounded-full', !color && 'bg-muted-foreground/40')}
            style={color ? { backgroundColor: color } : undefined}
            aria-hidden="true"
         />
         <span
            className={cn(
               'min-w-0 flex-1 truncate',
               isActive ? 'text-foreground' : 'text-muted-foreground'
            )}
         >
            {label}
         </span>
         <span className="tabular-nums text-foreground">{count}</span>
      </button>
   );
}
