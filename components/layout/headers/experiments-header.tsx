'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function ExperimentsHeader({ count, onCreate }: { count: number; onCreate: () => void }) {
   return (
      <div className="flex min-h-10 w-full items-center justify-between gap-3 border-b px-4 py-1.5">
         <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <span className="text-sm font-medium">Experiments</span>
            <span className="rounded-md bg-accent px-1.5 py-1 text-xs">{count}</span>
         </div>
         <Button size="xs" onClick={onCreate}>
            <Plus className="mr-1 size-3.5" /> New experiment
         </Button>
      </div>
   );
}
