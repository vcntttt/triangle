'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProjectIconConfig } from '@/lib/models';
import { cn } from '@/lib/utils';
import { ProjectIcon, ProjectIconGlyph } from './project-icon';

const lucideProjectIcons = [
   'box',
   'folder-kanban',
   'archive',
   'badge-check',
   'bell',
   'building-2',
   'calculator',
   'camera',
   'car',
   'chart-no-axes-combined',
   'check-circle-2',
   'circle-dot',
   'cloud',
   'coffee',
   'compass',
   'credit-card',
   'crown',
   'rocket',
   'code',
   'database',
   'file-text',
   'flag',
   'flame',
   'gift',
   'graduation-cap',
   'heart',
   'home',
   'key-round',
   'laptop',
   'leaf',
   'lightbulb',
   'mail',
   'map',
   'map-pin',
   'megaphone',
   'message-circle',
   'monitor',
   'music',
   'package',
   'palette',
   'pencil',
   'plane',
   'plug',
   'puzzle',
   'shield',
   'shopping-cart',
   'sparkles',
   'star',
   'target',
   'thumbs-up',
   'trophy',
   'users',
   'wallet-cards',
   'wifi',
   'workflow',
   'bug',
   'terminal',
   'calendar',
   'chart-no-axes-column',
   'settings',
   'lock',
   'zap',
   'globe',
   'briefcase',
   'book-open',
   'clipboard-list',
   'layers',
   'wrench',
] as const;

const emojiProjectIcons = [
   '📦',
   '🚀',
   '💻',
   '🧮',
   '📚',
   '🎨',
   '🐞',
   '🔒',
   '🌎',
   '📈',
   '🧰',
   '🗓️',
   '✅',
   '⚡',
   '🧪',
   '📝',
] as const;

interface ProjectIconPickerProps {
   value: ProjectIconConfig;
   onChange: (value: ProjectIconConfig) => void;
   disabled?: boolean;
   triggerClassName?: string;
   triggerLabel?: string;
}

export function ProjectIconPicker({
   value,
   onChange,
   disabled = false,
   triggerClassName,
   triggerLabel = 'Change project icon',
}: ProjectIconPickerProps) {
   const [open, setOpen] = useState(false);
   const [query, setQuery] = useState('');

   const visibleLucideIcons = useMemo(() => {
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) return lucideProjectIcons;

      return lucideProjectIcons.filter((iconName) => iconName.includes(normalizedQuery));
   }, [query]);

   const selectIcon = (nextIcon: ProjectIconConfig) => {
      onChange(nextIcon);
      setOpen(false);
   };

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button
               type="button"
               variant="ghost"
               className={cn('h-auto p-0 hover:bg-transparent', triggerClassName)}
               disabled={disabled}
               aria-label={triggerLabel}
            >
               <ProjectIcon icon={value} />
            </Button>
         </PopoverTrigger>
         <PopoverContent portal={false} className="w-[310px] p-0" align="start">
            <Tabs defaultValue="icons" className="gap-0">
               <TabsList className="h-9 w-full justify-start rounded-none border-b bg-transparent p-0 px-2">
                  <TabsTrigger value="icons" className="h-8 rounded-none px-3">
                     Icons
                  </TabsTrigger>
                  <TabsTrigger value="emojis" className="h-8 rounded-none px-3">
                     Emojis
                  </TabsTrigger>
               </TabsList>

               <TabsContent value="icons" className="p-3">
                  <div className="relative">
                     <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                     <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search icons..."
                        className="h-8 pl-7"
                     />
                  </div>
                  <div className="mt-3 grid max-h-64 grid-cols-8 gap-1 overflow-y-auto overscroll-contain pr-1">
                     {visibleLucideIcons.map((iconName) => (
                        <button
                           key={iconName}
                           type="button"
                           className={cn(
                              'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground',
                              value.type === 'lucide' &&
                                 value.value === iconName &&
                                 'bg-accent text-foreground'
                           )}
                           onClick={() => selectIcon({ type: 'lucide', value: iconName })}
                           title={iconName}
                        >
                           <ProjectIconGlyph
                              icon={{ type: 'lucide', value: iconName }}
                              className="size-4"
                           />
                        </button>
                     ))}
                  </div>
               </TabsContent>

               <TabsContent value="emojis" className="p-3">
                  <div className="grid grid-cols-8 gap-1">
                     {emojiProjectIcons.map((emoji) => (
                        <button
                           key={emoji}
                           type="button"
                           className={cn(
                              'inline-flex size-8 items-center justify-center rounded-md text-base hover:bg-accent',
                              value.type === 'emoji' &&
                                 value.value === emoji &&
                                 'bg-accent text-foreground'
                           )}
                           onClick={() => selectIcon({ type: 'emoji', value: emoji })}
                           title={emoji}
                        >
                           {emoji}
                        </button>
                     ))}
                  </div>
               </TabsContent>
            </Tabs>
         </PopoverContent>
      </Popover>
   );
}
