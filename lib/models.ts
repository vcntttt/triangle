import type { ComponentType, FC, SVGProps } from 'react';

export type ProjectIconType = 'lucide' | 'emoji';

export interface ProjectIconConfig {
   type: ProjectIconType;
   value: string;
}

export interface LabelInterface {
   id: string;
   name: string;
   color: string;
}

export interface IssueAutomation {
   id: string;
   name: string;
   enabled: boolean;
   fromStatus: string | null;
   toStatus: string;
   actions: Array<{ type: 'removeLabel'; labelId: string }>;
   createdAt: number;
   updatedAt: number;
}

export interface IssueStatusOption {
   id: string;
   name: string;
   color: string;
   type: 'unstarted' | 'started' | 'completed';
   position: number;
}

export interface ProjectArea {
   id: string;
   projectId: string;
   name: string;
   color: string;
   position: number;
}

export interface User {
   id: string;
   name: string;
   avatarUrl: string;
   email: string;
   status: 'online' | 'offline' | 'away';
   role: 'Member' | 'Admin' | 'Guest';
   joinedDate: string;
   teamIds: string[];
}

export interface Status {
   id: string;
   name: string;
   color: string;
   icon: FC;
}

export interface Priority {
   id: string;
   name: string;
   icon: FC<SVGProps<SVGSVGElement>>;
   position?: number;
}

export interface Health {
   id: 'no-update' | 'off-track' | 'on-track' | 'at-risk';
   name: string;
   color: string;
   description: string;
}

export interface Project {
   id: string;
   name: string;
   slug?: string;
   key?: string;
   description?: string | null;
   status: Status;
   iconConfig: ProjectIconConfig;
   percentComplete: number;
   startDate: string;
   lead: User;
   priority: Priority;
   health: Health;
   latestUpdate: ProjectUpdate | null;
}

export interface ProjectUpdate {
   id: string;
   projectId: string;
   health: Health['id'];
   body: string;
   areaMentions: ProjectUpdateAreaMention[];
   createdAt: string;
   updatedAt: string;
}

export interface ProjectUpdateAreaMention {
   areaId: string;
   start: number;
   end: number;
   name: string;
   color: string;
}

export interface ProjectTimelineUpdate extends ProjectUpdate {
   project: {
      id: string;
      name: string;
      slug: string;
   };
}

export interface ProjectTimelineArea extends ProjectArea {
   projectName: string;
}

export interface Issue {
   id: string;
   identifier: string;
   title: string;
   description: string;
   status: Status;
   assignee: User | null;
   priority: Priority;
   labels: LabelInterface[];
   createdAt: string;
   cycleId: string;
   project?: Project;
   area?: ProjectArea | null;
   parentIssueId?: string | null;
   parent?: {
      id: string;
      identifier: string;
      title: string;
   } | null;
   subissues: Array<{
      id: string;
      identifier: string;
      title: string;
      status: Status;
      priority: Priority;
      assignee: User | null;
      parentIssueId?: string | null;
   }>;
   blockedBy: Array<{ id: string; identifier: string; title: string; status: string }>;
   blocks: Array<{ id: string; identifier: string; title: string; status: string }>;
   rank: string;
   dueDate?: string;
   estimatedHours?: number;
}

export type IssueCommentKind = 'comment' | 'triage-note';

export interface IssueComment {
   id: string;
   body: string;
   kind: IssueCommentKind;
   authorId: string;
   createdAt: string;
   updatedAt: string;
}

export interface SidebarItem {
   name: string;
   url: string;
   icon: ComponentType<{ className?: string; size?: string | number }>;
}
