'use client';

import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
   Activity,
   AlertCircle,
   CheckCircle2,
   CircleAlert,
   CircleHelp,
   MoreHorizontal,
   Layers2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { viewerProfileToUser } from '@/lib/current-user';
import type { Health, ProjectTimelineArea, ProjectTimelineUpdate } from '@/lib/models';
import { cn } from '@/lib/utils';
import { useViewerProfile } from '@/src/data/viewer';
import { CreateProjectUpdateButton } from './create-project-update-dialog';
import { ProjectUpdateMentionText } from './project-update-mention-text';
import {
   DropdownMenu,
   DropdownMenuCheckboxItem,
   DropdownMenuContent,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectUpdatesTimelineProps {
   updates: ProjectTimelineUpdate[];
   areas: ProjectTimelineArea[];
   databaseError: string | null;
   isConnected: boolean;
}

type TimelineFilter = 'for-me' | 'popular' | 'recent';

const filterLabels: Record<TimelineFilter, string> = {
   'for-me': 'For me',
   'popular': 'Popular',
   'recent': 'Recent',
};

const healthLabel: Record<Health['id'], string> = {
   'no-update': 'No update',
   'off-track': 'Project off track',
   'on-track': 'Project on track',
   'at-risk': 'Project at risk',
};

const healthClassName: Record<Health['id'], string> = {
   'no-update': 'text-muted-foreground',
   'off-track': 'text-red-500',
   'on-track': 'text-green-500',
   'at-risk': 'text-amber-500',
};

function HealthIcon({ health }: { health: Health['id'] }) {
   const Icon =
      {
         'no-update': CircleHelp,
         'off-track': CircleAlert,
         'on-track': CheckCircle2,
         'at-risk': AlertCircle,
      }[health] ?? CircleHelp;

   return <Icon className={cn('size-4', healthClassName[health])} />;
}

function getRelativeDate(value: string) {
   const timestamp = new Date(value).getTime();
   const diff = Date.now() - timestamp;
   const minute = 60 * 1000;
   const hour = 60 * minute;
   const day = 24 * hour;
   const month = 30 * day;

   if (diff < hour) {
      return `${Math.max(1, Math.floor(diff / minute))}m ago`;
   }

   if (diff < day) {
      return `${Math.floor(diff / hour)}h ago`;
   }

   if (diff < month) {
      return `${Math.floor(diff / day)}d ago`;
   }

   return `${Math.floor(diff / month)} months ago`;
}

export function ProjectUpdatesTimeline({
   updates,
   areas,
   databaseError,
   isConnected,
}: ProjectUpdatesTimelineProps) {
   const viewer = viewerProfileToUser(useViewerProfile());
   const [activeFilter, setActiveFilter] = useState<TimelineFilter>('recent');
   const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
   const selectedAreaIdSet = useMemo(() => new Set(selectedAreaIds), [selectedAreaIds]);
   const availableAreas = useMemo(
      () =>
         areas.toSorted(
            (a, b) => a.projectName.localeCompare(b.projectName) || a.name.localeCompare(b.name)
         ),
      [areas]
   );

   const visibleUpdates = useMemo(() => {
      const filtered =
         selectedAreaIdSet.size === 0
            ? updates
            : updates.filter((update) =>
                 update.areaMentions.some((mention) => selectedAreaIdSet.has(mention.areaId))
              );
      return activeFilter === 'popular'
         ? filtered.toSorted((a, b) => a.project.name.localeCompare(b.project.name))
         : filtered;
   }, [activeFilter, selectedAreaIdSet, updates]);

   if (databaseError) {
      return (
         <div className="w-full p-6">
            <div className="max-w-2xl rounded-lg border bg-container p-6">
               <h2 className="text-sm font-semibold">Database unavailable</h2>
               <p className="mt-2 text-sm text-muted-foreground">{databaseError}</p>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-full w-full bg-container">
         <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-3">
               <h1 className="text-sm font-medium">Pulse</h1>
               <CreateProjectUpdateButton disabled={!isConnected} />
            </div>
         </div>

         <div className="border-b px-1 py-2">
            <div className="flex items-center gap-1">
               {(Object.keys(filterLabels) as TimelineFilter[]).map((filter) => (
                  <Button
                     key={filter}
                     variant={activeFilter === filter ? 'secondary' : 'ghost'}
                     size="sm"
                     className="h-7 rounded-full px-3 text-sm"
                     onClick={() => setActiveFilter(filter)}
                  >
                     {filterLabels[filter]}
                  </Button>
               ))}
               <Activity className="ml-2 size-3.5 text-muted-foreground" />
               {availableAreas.length > 0 ? (
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                           variant={selectedAreaIds.length > 0 ? 'secondary' : 'ghost'}
                           size="sm"
                           className="ml-1 h-7 rounded-full px-3 text-sm"
                        >
                           <Layers2 className="size-3.5" />
                           Areas
                           {selectedAreaIds.length > 0 ? ` ${selectedAreaIds.length}` : null}
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent className="w-64" align="start">
                        {availableAreas.map((area) => {
                           const selected = selectedAreaIdSet.has(area.id);
                           return (
                              <DropdownMenuCheckboxItem
                                 key={area.id}
                                 checked={selected}
                                 onCheckedChange={() =>
                                    setSelectedAreaIds((current) =>
                                       selected
                                          ? current.filter((id) => id !== area.id)
                                          : [...current, area.id]
                                    )
                                 }
                              >
                                 <span
                                    className="size-2.5 rounded-full"
                                    style={{ backgroundColor: area.color }}
                                 />
                                 <span className="min-w-0 flex-1 truncate">{area.name}</span>
                                 <span className="truncate text-xs text-muted-foreground">
                                    {area.projectName}
                                 </span>
                              </DropdownMenuCheckboxItem>
                           );
                        })}
                     </DropdownMenuContent>
                  </DropdownMenu>
               ) : null}
            </div>
         </div>

         {visibleUpdates.length === 0 ? (
            <div className="mx-auto flex min-h-96 max-w-3xl flex-col justify-center px-6">
               <h2 className="text-lg font-semibold">No updates yet</h2>
               <p className="mt-2 text-sm text-muted-foreground">
                  Publish an update from a project health popover and it will appear here.
               </p>
            </div>
         ) : (
            <div className="mx-auto max-w-[920px] px-6 py-10">
               <div className="mb-8 grid grid-cols-[56px_1fr] items-center gap-4">
                  <span className="text-sm text-muted-foreground">Older</span>
                  <div className="h-px bg-border" />
               </div>

               <div className="space-y-12">
                  {visibleUpdates.map((update) => (
                     <article key={update.id} className="group grid grid-cols-[56px_1fr] gap-4">
                        <div />
                        <div className="relative">
                           <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 size-7 text-muted-foreground opacity-70"
                           >
                              <MoreHorizontal className="size-4" />
                           </Button>

                           <Link
                              to="/projects/$projectSlug"
                              params={{ projectSlug: update.project.slug }}
                              className="inline-flex max-w-[calc(100%-36px)] text-xl font-semibold tracking-normal hover:underline"
                           >
                              <span className="truncate">{update.project.name}</span>
                           </Link>

                           <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                              <span
                                 className={cn(
                                    'inline-flex items-center gap-1.5 font-medium',
                                    healthClassName[update.health]
                                 )}
                              >
                                 <HealthIcon health={update.health} />
                                 {healthLabel[update.health]}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                 <Avatar className="size-5">
                                    <AvatarImage src={viewer.avatarUrl} alt={viewer.name} />
                                    <AvatarFallback>{viewer.name.charAt(0)}</AvatarFallback>
                                 </Avatar>
                                 {viewer.name}
                              </span>
                              <span className="text-muted-foreground">
                                 {getRelativeDate(update.createdAt)}
                              </span>
                           </div>

                           <p className="mt-5 max-w-3xl whitespace-pre-wrap text-[15px] leading-6 text-foreground">
                              <ProjectUpdateMentionText
                                 body={update.body}
                                 mentions={update.areaMentions}
                              />
                           </p>
                        </div>
                     </article>
                  ))}
               </div>
            </div>
         )}
      </div>
   );
}
