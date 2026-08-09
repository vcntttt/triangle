'use client';

import { RiGithubLine } from '@remixicon/react';
import { Settings } from 'lucide-react';

import { HelpButton } from '@/components/layout/sidebar/help-button';
import { NavWorkspace } from '@/components/layout/sidebar/nav-workspace';
import { NavAccount } from '@/components/layout/sidebar/nav-account';
import { NavFeatures } from '@/components/layout/sidebar/nav-features';
import { WorkspaceHeader } from '@/components/layout/sidebar/workspace-header';
import { Button } from '@/components/ui/button';
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
import { NavSavedViews } from '@/components/layout/sidebar/nav-saved-views';
import { CustomizeSidebarDialog } from '@/components/layout/sidebar/customize-sidebar-dialog';
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useViewerPreferences } from '@/src/data/viewer';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
   const [customizeOpen, setCustomizeOpen] = useState(false);
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
                  <>
                     <NavWorkspace />
                     {!hiddenItems.includes('saved-views') ? <NavSavedViews /> : null}
                  </>
               )}
            </SidebarContent>
            <SidebarFooter>
               <div className="w-full flex flex-col gap-2">
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
                  <div className="w-full flex items-center justify-between">
                     <HelpButton />
                     <Button size="icon" variant="ghost" onClick={() => setCustomizeOpen(true)}>
                        <SlidersHorizontal className="size-4" />
                        <span className="sr-only">Customize sidebar</span>
                     </Button>
                     <Button size="icon" variant="secondary" asChild>
                        <a
                           href="https://github.com/vcntttt/circle"
                           target="_blank"
                           rel="noopener noreferrer"
                        >
                           <RiGithubLine className="size-4" />
                        </a>
                     </Button>
                  </div>
               </div>
            </SidebarFooter>
         </Sidebar>
         <CustomizeSidebarDialog open={customizeOpen} onOpenChange={setCustomizeOpen} />
      </>
   );
}
