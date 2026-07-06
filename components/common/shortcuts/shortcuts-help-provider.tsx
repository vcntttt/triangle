'use client';

import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { useShortcutsHelpStore } from '@/store/shortcuts-help-store';

const shortcuts = [
   {
      action: 'Create issue',
      keys: 'C',
      context: 'Issues',
   },
   {
      action: 'Open project picker',
      keys: 'Alt + P',
      context: 'New issue modal',
   },
   {
      action: 'Open tag picker',
      keys: 'Alt + L',
      context: 'New issue modal',
   },
   {
      action: 'Search issues',
      keys: '/',
      context: 'Issues',
   },
   {
      action: 'Move down',
      keys: '↓ / J',
      context: 'Issues',
   },
   {
      action: 'Move up',
      keys: '↑ / K',
      context: 'Issues',
   },
   {
      action: 'Toggle issue selection',
      keys: 'X',
      context: 'Issues',
   },
   {
      action: 'Clear issue selection',
      keys: 'Esc',
      context: 'Issues',
   },
   {
      action: 'Set status',
      keys: 'S',
      context: 'Issues',
   },
   {
      action: 'Set labels',
      keys: 'L',
      context: 'Issues',
   },
   {
      action: 'Set priority',
      keys: 'P',
      context: 'Issues',
   },
   {
      action: 'Set project',
      keys: 'Shift + P',
      context: 'Issues',
   },
   {
      action: 'Open shortcuts help',
      keys: '?',
      context: 'Issues',
   },
   {
      action: 'Toggle sidebar',
      keys: 'Cmd/Ctrl + B',
      context: 'Global',
   },
   {
      action: 'Save issue title/description',
      keys: 'Cmd/Ctrl + Enter',
      context: 'Issue detail',
   },
   {
      action: 'Cancel issue editing',
      keys: 'Esc',
      context: 'Issue detail',
   },
];

export function ShortcutsHelpProvider() {
   const { isOpen, close } = useShortcutsHelpStore();

   return (
      <Dialog
         open={isOpen}
         onOpenChange={(value) => {
            if (!value) {
               close();
            }
         }}
      >
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle>Keyboard shortcuts</DialogTitle>
               <DialogDescription>
                  Quick actions currently available in the personal Triangle workspace.
               </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
               {shortcuts.map((shortcut) => (
                  <div
                     key={`${shortcut.action}-${shortcut.keys}`}
                     className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                     <div className="min-w-0">
                        <p className="text-sm font-medium">{shortcut.action}</p>
                        <p className="text-xs text-muted-foreground">{shortcut.context}</p>
                     </div>
                     <KbdGroup>
                        {shortcut.keys.split(' + ').map((part, index, parts) => (
                           <span
                              key={`${shortcut.action}-${part}`}
                              className="flex items-center gap-1"
                           >
                              <Kbd>{part}</Kbd>
                              {index < parts.length - 1 && <span>+</span>}
                           </span>
                        ))}
                     </KbdGroup>
                  </div>
               ))}
            </div>
         </DialogContent>
      </Dialog>
   );
}
