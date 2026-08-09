'use client';

import { Link } from '@tanstack/react-router';
import { ListTodo, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { DisplayMenu } from '@/components/layout/headers/issues/header-options';
import { IssueInsightsToggle } from '@/components/common/issues/issue-insights-panel';

export function MyWorkHeader({ tab, count }: { tab: 'assigned' | 'activity'; count: number }) {
   return (
      <div className="flex min-h-10 w-full items-center justify-between gap-3 border-b px-4 py-1.5">
         <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <span className="text-sm font-medium">My work</span>
            <span className="rounded-md bg-accent px-1.5 py-1 text-xs">{count}</span>
            <div className="hidden items-center gap-0.5 rounded-md bg-muted/60 p-0.5 sm:flex">
               <Button
                  asChild
                  size="xs"
                  variant={tab === 'assigned' ? 'secondary' : 'ghost'}
                  className="h-6 px-2 text-xs"
               >
                  <Link to="/my-work" search={{ tab: 'assigned' }}>
                     <UserRound className="mr-1 size-3.5" /> Assigned
                  </Link>
               </Button>
               <Button
                  asChild
                  size="xs"
                  variant={tab === 'activity' ? 'secondary' : 'ghost'}
                  className="h-6 px-2 text-xs"
               >
                  <Link to="/my-work" search={{ tab: 'activity' }}>
                     <ListTodo className="mr-1 size-3.5" /> Activity
                  </Link>
               </Button>
            </div>
         </div>
         <div className="flex items-center gap-1">
            <IssueInsightsToggle />
            <DisplayMenu />
         </div>
      </div>
   );
}
