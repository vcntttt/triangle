'use client';

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Link } from '@tanstack/react-router';
import { ThemeToggle } from '../theme-toggle';

export function WorkspaceHeader() {
   return (
      <SidebarMenu>
         <SidebarMenuItem>
            <div className="w-full flex gap-1 items-center pt-2">
               <SidebarMenuButton size="lg" className="h-10 p-1" asChild>
                  <Link to="/projects">
                     <img src="/triangle.png" alt="Triangle" className="size-5 shrink-0" />
                     <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">Triangle</span>
                        <span className="truncate text-xs text-muted-foreground">Personal</span>
                     </div>
                  </Link>
               </SidebarMenuButton>
               <ThemeToggle />
            </div>
         </SidebarMenuItem>
      </SidebarMenu>
   );
}
