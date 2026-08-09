'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useViewerCommands, useViewerPreferences } from '@/src/data/viewer';

const sidebarItems = [
   { id: 'issues', name: 'Issues' },
   { id: 'my-work', name: 'My work' },
   { id: 'projects', name: 'Projects' },
   { id: 'pulse', name: 'Pulse' },
   { id: 'saved-views', name: 'Saved views' },
   { id: 'settings', name: 'Settings' },
] as const;

const sectionNames = [
   { id: 'workspace', name: 'Workspace' },
   { id: 'saved-views', name: 'Saved views' },
] as const;

const defaultOrder = sidebarItems.map((item) => item.id);

export function CustomizeSidebarDialog({
   open,
   onOpenChange,
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}) {
   const preferences = useViewerPreferences();
   const { updatePreferences } = useViewerCommands();
   const sidebar = preferences?.sidebar;
   const order = useMemo(() => {
      const configured = sidebar?.itemOrder ?? [];
      return [...defaultOrder].sort((left, right) => {
         const leftPosition = configured.indexOf(left);
         const rightPosition = configured.indexOf(right);
         return (
            (leftPosition === -1 ? defaultOrder.length : leftPosition) -
            (rightPosition === -1 ? defaultOrder.length : rightPosition)
         );
      });
   }, [sidebar?.itemOrder]);
   const hiddenItems = sidebar?.hiddenItems ?? [];
   const collapsedSections = sidebar?.collapsedSections ?? [];
   const showBadges = sidebar?.showBadges ?? true;
   const [saving, setSaving] = useState(false);

   const patchSidebar = async (patch: Record<string, unknown>) => {
      setSaving(true);
      try {
         await updatePreferences({ sidebar: patch });
      } finally {
         setSaving(false);
      }
   };

   const toggleItem = (id: string) => {
      const next = hiddenItems.includes(id)
         ? hiddenItems.filter((item) => item !== id)
         : [...hiddenItems, id];
      void patchSidebar({ hiddenItems: next });
   };

   const moveItem = (id: string, direction: -1 | 1) => {
      const index = order.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
      const next = order.slice();
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      void patchSidebar({ itemOrder: next });
   };

   const toggleSection = (id: string) => {
      const next = collapsedSections.includes(id)
         ? collapsedSections.filter((item) => item !== id)
         : [...collapsedSections, id];
      void patchSidebar({ collapsedSections: next });
   };

   const toggleBadges = () => {
      void patchSidebar({ showBadges: !showBadges });
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="max-h-[80svh] overflow-y-auto">
            <DialogHeader>
               <DialogTitle>Customize sidebar</DialogTitle>
               <DialogDescription>
                  Choose what appears in your personal navigation.
               </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
               <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                     Entries
                  </h3>
                  {order.map((id, index) => {
                     const item = sidebarItems.find((candidate) => candidate.id === id)!;
                     const visible = !hiddenItems.includes(id);
                     return (
                        <div
                           key={id}
                           className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                        >
                           <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              disabled={index === 0 || saving}
                              onClick={() => moveItem(id, -1)}
                           >
                              <ArrowUp className="size-3.5" />
                           </Button>
                           <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              disabled={index === order.length - 1 || saving}
                              onClick={() => moveItem(id, 1)}
                           >
                              <ArrowDown className="size-3.5" />
                           </Button>
                           <span className="flex-1 text-sm">{item.name}</span>
                           <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              disabled={saving}
                              onClick={() => toggleItem(id)}
                           >
                              {visible ? (
                                 <Eye className="size-3.5" />
                              ) : (
                                 <EyeOff className="size-3.5" />
                              )}
                              <span className="sr-only">
                                 {visible ? 'Hide' : 'Show'} {item.name}
                              </span>
                           </Button>
                        </div>
                     );
                  })}
               </section>
               <section className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                     Sections
                  </h3>
                  {sectionNames.map((section) => {
                     const collapsed = collapsedSections.includes(section.id);
                     return (
                        <div
                           key={section.id}
                           className="flex items-center gap-2 rounded-md border px-3 py-2"
                        >
                           <span className="flex-1 text-sm">{section.name}</span>
                           <Switch
                              checked={!collapsed}
                              onCheckedChange={() => toggleSection(section.id)}
                              disabled={saving}
                              aria-label={`${section.name} section`}
                           />
                        </div>
                     );
                  })}
               </section>
               <section className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                     <h3 className="text-sm font-medium">Show badges</h3>
                     <p className="text-xs text-muted-foreground">Display counts in navigation.</p>
                  </div>
                  <Switch
                     checked={showBadges}
                     onCheckedChange={toggleBadges}
                     disabled={saving}
                     aria-label="Show navigation badges"
                  />
               </section>
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="size-3.5" /> Changes save automatically.
               </div>
            </div>
         </DialogContent>
      </Dialog>
   );
}
