'use client';

import { Moon, Sun, Laptop, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
   const { theme, setTheme } = useTheme();
   const mounted = useSyncExternalStore(
      () => () => {},
      () => true,
      () => false
   );
   const displayTheme = mounted ? theme : 'system';

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button
               variant="ghost"
               size="icon"
               className="size-8 shrink-0"
               suppressHydrationWarning
            >
               {displayTheme === 'light' || displayTheme === 'pure-light' ? (
                  <Sun className="size-4" />
               ) : displayTheme === 'dark' || displayTheme === 'classic-dark' ? (
                  <Moon className="size-4" />
               ) : (
                  <Laptop className="size-4" />
               )}
               <span className="sr-only">Toggle theme</span>
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
               <Sun className="mr-2 size-4" />
               <span>Light</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
               <Moon className="mr-2 size-4" />
               <span>Dark</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
               <Laptop className="mr-2 size-4" />
               <span>System</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('pure-light')}>
               <Sparkles className="mr-2 size-4" />
               <span>Pure Light</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('classic-dark')}>
               <Moon className="mr-2 size-4" />
               <span>Classic Dark</span>
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
