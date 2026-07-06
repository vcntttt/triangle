'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { statusUserColors } from '@/lib/current-user';
import { useIssuesData } from '@/components/common/issues/issues-data-context';
import { CheckIcon, CircleUserRound, UserIcon } from 'lucide-react';
import { useState } from 'react';
import type { User } from '@/lib/models';
import { useViewerUser } from '@/hooks/use-viewer-user';

interface AssigneeUserProps {
   user: User | null;
   issueId: string;
}

function AssigneeAvatar({ user }: { user: User | null }) {
   if (!user) {
      return (
         <div className="size-6 flex items-center justify-center">
            <CircleUserRound className="size-5 text-zinc-600" />
         </div>
      );
   }

   return (
      <Avatar className="size-6 shrink-0">
         <AvatarImage src={user.avatarUrl} alt={user.name} />
         <AvatarFallback>{user.name[0]}</AvatarFallback>
      </Avatar>
   );
}

export function AssigneeUser({ user, issueId }: AssigneeUserProps) {
   const [open, setOpen] = useState(false);
   const { updateIssueAssignee } = useIssuesData();
   const currentUser = useViewerUser();
   const personalAssigneeOptions = [currentUser];

   return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
         <DropdownMenuTrigger asChild>
            <button type="button" className="relative w-fit focus:outline-none">
               <AssigneeAvatar user={user} />
               {user && (
                  <span
                     className="border-background absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full border-2"
                     style={{ backgroundColor: statusUserColors[user.status] }}
                  >
                     <span className="sr-only">{user.status}</span>
                  </span>
               )}
            </button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="start" className="w-[206px]">
            <DropdownMenuLabel>Assign to…</DropdownMenuLabel>
            <DropdownMenuItem
               onClick={(e) => {
                  e.stopPropagation();
                  updateIssueAssignee(issueId, null);
                  setOpen(false);
               }}
            >
               <div className="flex items-center gap-2">
                  <UserIcon className="size-5" />
                  <span>No assignee</span>
               </div>
               {!user && <CheckIcon className="ml-auto size-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {personalAssigneeOptions.map((assigneeOption) => (
               <DropdownMenuItem
                  key={assigneeOption.id}
                  onClick={(e) => {
                     e.stopPropagation();
                     updateIssueAssignee(issueId, assigneeOption);
                     setOpen(false);
                  }}
               >
                  <div className="flex items-center gap-2">
                     <Avatar className="size-5">
                        <AvatarImage src={assigneeOption.avatarUrl} alt={assigneeOption.name} />
                        <AvatarFallback>{assigneeOption.name[0]}</AvatarFallback>
                     </Avatar>
                     <span>{assigneeOption.name}</span>
                  </div>
                  {user?.id === assigneeOption.id && <CheckIcon className="ml-auto size-4" />}
               </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{currentUser.name}</DropdownMenuLabel>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
