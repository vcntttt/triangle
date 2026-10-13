'use client';

import { Settings } from 'lucide-react';

import { NavWorkspace } from '@/components/layout/sidebar/nav-workspace';
import { NavAccount } from '@/components/layout/sidebar/nav-account';
import { NavFeatures } from '@/components/layout/sidebar/nav-features';
import { WorkspaceHeader } from '@/components/layout/sidebar/workspace-header';
import {
   Sidebar,
   SidebarContent,
   SidebarFooter,
   SidebarHeader,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Link, useRouterState } from '@tanstack/react-router';
import { BackToApp } from '@/components/layout/sidebar/back-to-app';
import { useViewerPreferences } from '@/src/data/viewer';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
   const preferences = useViewerPreferences();
   const pathname = useRouterState({ select: (state) => state.location.pathname });
   const isSettings = pathname.includes('/settings');
   const hiddenItems = preferences?.sidebar?.hiddenItems ?? [];
   return (
      <>
         <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>{isSettings ? <BackToApp /> : <WorkspaceHeader />}</SidebarHeader>
            <SidebarContent>
               {isSettings ? (
                  <>
                     <NavAccount />
                     <NavFeatures />
                  </>
               ) : (
                  <NavWorkspace />
               )}
            </SidebarContent>
            <SidebarFooter>
               <SidebarMenu>
                  {!hiddenItems.includes('settings') ? (
                     <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                           <Link to="/settings">
                              <Settings className="size-4" />
                              <span>Settings</span>
                           </Link>
                        </SidebarMenuButton>
                     </SidebarMenuItem>
                  ) : null}
               </SidebarMenu>
            </SidebarFooter>
         </Sidebar>
      </>
   );
}
