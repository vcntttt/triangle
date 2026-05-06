'use client';

import { ReactNode } from 'react';
import {
   Database,
   Eye,
   FolderKanban,
   Github,
   KeyRound,
   Layers,
   Palette,
   Server,
   Shield,
   Tag,
   UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { ProjectOptionsSettings } from './project-options-settings';

interface Feature {
   icon: ReactNode;
   title: string;
   description: string;
   actionLabel?: string;
   activated?: boolean;
   meta?: string;
}

interface Integration {
   icon: ReactNode;
   title: string;
   description: string;
   enabled?: boolean;
   actionLabel: string;
}

interface Guide {
   icon: ReactNode;
   title: string;
   description: string;
   actionLabel: string;
}

const features: Feature[] = [
   {
      icon: <FolderKanban size={20} />,
      title: 'Projects',
      description: 'Projects are part of the main product flow and already use PostgreSQL.',
      actionLabel: 'Open projects',
      activated: true,
   },
   {
      icon: <Tag size={20} />,
      title: 'Labels',
      description: 'Labels are now loaded from the database and used by real issue workflows.',
      actionLabel: 'Manage labels',
      activated: true,
   },
   {
      icon: <Palette size={20} />,
      title: 'Appearance',
      description:
         'Keep the original Triangle design system while allowing light local preferences.',
      meta: 'Theme stays local',
   },
   {
      icon: <Shield size={20} />,
      title: 'Privacy',
      description:
         'This fork is being prepared for private self-hosted usage, without reopening team features.',
      meta: 'Personal-only flow',
   },
   {
      icon: <KeyRound size={20} />,
      title: 'Authentication roadmap',
      description:
         'Authentication will come later to protect the self-hosted instance, not to rebuild a workspace model.',
      meta: 'Not implemented yet',
   },
   {
      icon: <Database size={20} />,
      title: 'Database',
      description:
         'Projects, issues and labels already rely on PostgreSQL as the single source of truth.',
      activated: true,
   },
];

const integrations: Integration[] = [
   {
      icon: <Github size={24} />,
      title: 'GitHub repository',
      description:
         'Keep a direct link to the repo while deeper integrations stay out of scope for now.',
      enabled: true,
      actionLabel: 'Enabled',
   },
   {
      icon: <Server size={24} />,
      title: 'PostgreSQL runtime',
      description: 'The app expects a PostgreSQL server configured through DATABASE_URL.',
      enabled: true,
      actionLabel: 'Enabled',
   },
   {
      icon: <UserRound size={24} />,
      title: 'Current user model',
      description:
         'The product still assumes a single personal user and avoids reintroducing teams or orgs.',
      actionLabel: 'Planned',
   },
   {
      icon: <Eye size={24} />,
      title: 'View preferences',
      description:
         'List and board preferences remain local to the browser through lightweight persistence.',
      actionLabel: 'Local only',
   },
];

const guides: Guide[] = [
   {
      icon: <FolderKanban size={20} />,
      title: 'Personal scope',
      description: 'This fork is intentionally focused on projects, issues and labels.',
      actionLabel: 'Keep scope small',
   },
   {
      icon: <Layers size={20} />,
      title: 'Design system',
      description:
         'Preserve the original layout language instead of simplifying pages into generic panels.',
      actionLabel: 'Use original UI as reference',
   },
   {
      icon: <Database size={20} />,
      title: 'Data migration',
      description:
         'Prefer real persistence over adding new product behavior on top of mock-only state.',
      actionLabel: 'Keep moving to Postgres',
   },
   {
      icon: <Shield size={20} />,
      title: 'Future auth',
      description:
         'Authentication should protect the personal deployment without forcing a multi-workspace product model.',
      actionLabel: 'Add later, not now',
   },
];

const FeatureCard = ({ feature }: { feature: Feature }) => {
   return (
      <div className="bg-card rounded-lg border p-5 flex flex-col h-full">
         <div className="flex items-start gap-4 mb-3">
            {feature.icon}
            <div className="flex-1">
               <h3 className="font-medium text-card-foreground">{feature.title}</h3>
               <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
            </div>
         </div>
         <div className="mt-auto flex items-center gap-3">
            {feature.activated && (
               <div className="flex items-center text-xs text-muted-foreground gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Ready</span>
               </div>
            )}
            {feature.meta && <span className="text-xs text-muted-foreground">{feature.meta}</span>}
            {feature.actionLabel && (
               <Button variant="outline" size="sm" className="ml-auto text-sm">
                  {feature.actionLabel}
               </Button>
            )}
         </div>
      </div>
   );
};

const IntegrationCard = ({ integration }: { integration: Integration }) => {
   return (
      <div className="flex items-start gap-4 mb-3">
         <div className="text-card-foreground">{integration.icon}</div>
         <div className="space-y-2 h-full flex flex-col">
            <div className="flex-1">
               <h3 className="font-medium text-card-foreground">{integration.title}</h3>
               <p className="text-sm text-muted-foreground mt-1">{integration.description}</p>
            </div>
            <Button variant="outline" size="sm" className="text-sm w-fit">
               {integration.actionLabel}
            </Button>
         </div>
      </div>
   );
};

const GuideCard = ({ guide }: { guide: Guide }) => {
   return (
      <div className="bg-card rounded-lg border p-5 flex flex-col min-h-36">
         <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">{guide.icon}</div>
            <div className="min-w-0 flex-1">
               <h3 className="font-medium text-sm text-card-foreground leading-5">{guide.title}</h3>
               <p className="text-xs text-muted-foreground mt-1 leading-5 text-balance">
                  {guide.description}
               </p>
            </div>
         </div>
         <div className="mt-auto pt-4">
            <Button variant="ghost" size="sm" className="h-7 px-0 text-xs pointer-events-none">
               {guide.actionLabel}
            </Button>
         </div>
      </div>
   );
};

interface SettingsProps {
   initialProjectStatuses: ProjectOptionLike[];
   initialProjectPriorities: ProjectOptionLike[];
}

export default function Settings({
   initialProjectStatuses,
   initialProjectPriorities,
}: SettingsProps) {
   return (
      <div className="w-full max-w-7xl mx-auto px-8 py-8">
         <div className="mb-10">
            <h1 className="text-2xl font-semibold mb-1">Workspace</h1>
            <p className="text-muted-foreground">
               Personal configuration for this Triangle fork. The goal is to keep the product small,
               usable and visually aligned with the original design system.
            </p>
         </div>

         <div className="mb-10" id="project-workflow">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-semibold">Project workflow</h2>
            </div>
            <ProjectOptionsSettings
               initialStatuses={initialProjectStatuses}
               initialPriorities={initialProjectPriorities}
            />
         </div>

         <div className="mb-10" id="general">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-semibold">Core setup</h2>
               <ThemeToggle />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {features.map((feature, index) => (
                  <FeatureCard key={index} feature={feature} />
               ))}
            </div>
         </div>

         <div className="mb-10" id="integrations">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-semibold">Current integrations</h2>
               <Button variant="outline" size="sm" className="text-sm" disabled>
                  Minimal by design
               </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {integrations.map((integration, index) => (
                  <IntegrationCard key={index} integration={integration} />
               ))}
            </div>
         </div>

         <div className="mb-10" id="database">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-semibold">Guidance</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {guides.map((guide, index) => (
                  <GuideCard key={index} guide={guide} />
               ))}
            </div>
         </div>
      </div>
   );
}
