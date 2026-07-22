import type React from 'react';
import { Activity, Box, Layers, Settings, FolderKanban, UserRound, Zap } from 'lucide-react';
import type { Health, Issue, Priority, SidebarItem, Status } from '@/lib/models';

export type {
   Health,
   Issue,
   LabelInterface,
   Priority,
   Project,
   SidebarItem,
   Status,
   User,
} from '@/lib/models';

export const BacklogIcon: React.FC = () => {
   return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
         <circle
            cx="7"
            cy="7"
            r="6"
            fill="none"
            stroke="#bec2c8"
            strokeWidth="2"
            strokeDasharray="1.4 1.74"
            strokeDashoffset="0.65"
         ></circle>
         <circle
            className="progress"
            cx="7"
            cy="7"
            r="2"
            fill="none"
            stroke="#bec2c8"
            strokeWidth="4"
            strokeDasharray="0 100"
            strokeDashoffset="0"
            transform="rotate(-90 7 7)"
         ></circle>
      </svg>
   );
};

export const PausedIcon: React.FC = () => {
   return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
         <circle
            cx="7"
            cy="7"
            r="6"
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="2"
            strokeDasharray="3.14 0"
            strokeDashoffset="-0.7"
         ></circle>
         <circle
            className="progress"
            cx="7"
            cy="7"
            r="2"
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="4"
            strokeDasharray="6.2517693806436885 100"
            strokeDashoffset="0"
            transform="rotate(-90 7 7)"
         ></circle>
      </svg>
   );
};

export const ToDoIcon: React.FC = () => {
   return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
         <circle
            cx="7"
            cy="7"
            r="6"
            fill="none"
            stroke="#e2e2e2"
            strokeWidth="2"
            strokeDasharray="3.14 0"
            strokeDashoffset="-0.7"
         ></circle>
         <circle
            className="progress"
            cx="7"
            cy="7"
            r="2"
            fill="none"
            stroke="#e2e2e2"
            strokeWidth="4"
            strokeDasharray="0 100"
            strokeDashoffset="0"
            transform="rotate(-90 7 7)"
         ></circle>
      </svg>
   );
};

export const InProgressIcon: React.FC = () => {
   return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
         <circle
            cx="7"
            cy="7"
            r="6"
            fill="none"
            stroke="#facc15"
            strokeWidth="2"
            strokeDasharray="3.14 0"
            strokeDashoffset="-0.7"
         ></circle>
         <circle
            className="progress"
            cx="7"
            cy="7"
            r="2"
            fill="none"
            stroke="#facc15"
            strokeWidth="4"
            strokeDasharray="2.0839231268812295 100"
            strokeDashoffset="0"
            transform="rotate(-90 7 7)"
         ></circle>
      </svg>
   );
};

export const TechnicalReviewIcon: React.FC = () => {
   return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
         <circle
            cx="7"
            cy="7"
            r="6"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeDasharray="3.14 0"
            strokeDashoffset="-0.7"
         ></circle>
         <circle
            className="progress"
            cx="7"
            cy="7"
            r="2"
            fill="none"
            stroke="#22c55e"
            strokeWidth="4"
            strokeDasharray="4.167846253762459 100"
            strokeDashoffset="0"
            transform="rotate(-90 7 7)"
         ></circle>
      </svg>
   );
};

export const CompletedIcon: React.FC = () => {
   return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
         <circle
            cx="7"
            cy="7"
            r="6"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeDasharray="3.14 0"
            strokeDashoffset="-0.7"
         />
         <path
            d="M4.5 7L6.5 9L9.5 5"
            stroke="#8b5cf6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
         />
      </svg>
   );
};

export const ArchivedIcon: React.FC = () => {
   return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
         <rect
            x="2.25"
            y="3.25"
            width="9.5"
            height="7.5"
            rx="1.25"
            stroke="#71717a"
            strokeWidth="1.5"
         />
         <path d="M4.5 6.5H9.5" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
   );
};

export const CanceledIcon: React.FC = () => {
   return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
         <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="2" />
         <path
            d="M4.75 4.75L9.25 9.25M9.25 4.75L4.75 9.25"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeLinecap="round"
         />
      </svg>
   );
};

interface IconProps extends React.SVGProps<SVGSVGElement> {
   className?: string;
}

const NoPriorityIcon = ({ className, ...props }: IconProps) => (
   <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-label="No Priority"
      role="img"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
   >
      <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
      <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
      <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
   </svg>
);

const UrgentPriorityIcon = ({ className, ...props }: IconProps) => (
   <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-label="Urgent Priority"
      role="img"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
   >
      <path d="M3 1C1.9 1 1 1.9 1 3v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2H3Zm4 3h2l-.2 5H7.3L7 4Zm2 7c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1Z"></path>
   </svg>
);

const HighPriorityIcon = ({ className, ...props }: IconProps) => (
   <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-label="High Priority"
      role="img"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
   >
      <rect x="1.5" y="8" width="3" height="6" rx="1"></rect>
      <rect x="6.5" y="5" width="3" height="9" rx="1"></rect>
      <rect x="11.5" y="2" width="3" height="12" rx="1"></rect>
   </svg>
);

const MediumPriorityIcon = ({ className, ...props }: IconProps) => (
   <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-label="Medium Priority"
      role="img"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
   >
      <rect x="1.5" y="8" width="3" height="6" rx="1"></rect>
      <rect x="6.5" y="5" width="3" height="9" rx="1"></rect>
      <rect x="11.5" y="2" width="3" height="12" rx="1" fillOpacity="0.4"></rect>
   </svg>
);

const LowPriorityIcon = ({ className, ...props }: IconProps) => (
   <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-label="Low Priority"
      role="img"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
   >
      <rect x="1.5" y="8" width="3" height="6" rx="1"></rect>
      <rect x="6.5" y="5" width="3" height="9" rx="1" fillOpacity="0.4"></rect>
      <rect x="11.5" y="2" width="3" height="12" rx="1" fillOpacity="0.4"></rect>
   </svg>
);

export const status: Status[] = [
   { id: 'in-progress', name: 'In Progress', color: '#facc15', icon: InProgressIcon },
   {
      id: 'technical-review',
      name: 'Technical Review',
      color: '#22c55e',
      icon: TechnicalReviewIcon,
   },
   { id: 'paused', name: 'Paused', color: '#0ea5e9', icon: PausedIcon },
   { id: 'to-do', name: 'Todo', color: '#f97316', icon: ToDoIcon },
   { id: 'backlog', name: 'Backlog', color: '#ec4899', icon: BacklogIcon },
   { id: 'completed', name: 'Completed', color: '#8b5cf6', icon: CompletedIcon },
];

export const archivedStatus: Status = {
   id: 'archived',
   name: 'Archived',
   color: '#71717a',
   icon: ArchivedIcon,
};

export const priorities: Priority[] = [
   { id: 'no-priority', name: 'No priority', icon: NoPriorityIcon },
   { id: 'urgent', name: 'Urgent', icon: UrgentPriorityIcon },
   { id: 'high', name: 'High', icon: HighPriorityIcon },
   { id: 'medium', name: 'Medium', icon: MediumPriorityIcon },
   { id: 'low', name: 'Low', icon: LowPriorityIcon },
];

export const health: Health[] = [
   {
      id: 'no-update',
      name: 'No Update',
      color: '#94a3b8',
      description: 'No hay una actualizacion reciente para este proyecto.',
   },
   {
      id: 'off-track',
      name: 'Off Track',
      color: '#ef4444',
      description: 'El proyecto esta desalineado y necesita atencion.',
   },
   {
      id: 'on-track',
      name: 'On Track',
      color: '#22c55e',
      description: 'El proyecto avanza segun lo esperado.',
   },
   {
      id: 'at-risk',
      name: 'At Risk',
      color: '#f59e0b',
      description: 'El proyecto muestra riesgo y requiere seguimiento.',
   },
];

export const workspaceItems: SidebarItem[] = [
   { name: 'Issues', url: '/issues', icon: FolderKanban },
   { name: 'Projects', url: '/projects', icon: Box },
   { name: 'Pulse', url: '/pulse', icon: Activity },
];

export const accountItems: SidebarItem[] = [
   { name: 'General', url: '/settings#general', icon: UserRound },
   { name: 'Core setup', url: '/settings#general', icon: Settings },
   { name: 'Integrations', url: '/settings#integrations', icon: Zap },
];

export const featuresItems: SidebarItem[] = [
   { name: 'Projects', url: '/settings#general', icon: Box },
   { name: 'Database', url: '/settings#database', icon: Layers },
   { name: 'Integrations', url: '/settings#integrations', icon: Zap },
];

export function sortIssuesByPriority(issues: Issue[]): Issue[] {
   const priorityOrder: Record<string, number> = {
      'urgent': 0,
      'high': 1,
      'medium': 2,
      'low': 3,
      'no-priority': 4,
   };

   return issues
      .slice()
      .sort(
         (a, b) =>
            priorityOrder[a.priority.id as keyof typeof priorityOrder] -
            priorityOrder[b.priority.id as keyof typeof priorityOrder]
      );
}
