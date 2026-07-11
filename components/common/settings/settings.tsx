'use client';

import type { LabelInterface } from '@/lib/models';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { LabelsSettings } from './labels-settings';
import { ProjectOptionsSettings } from './project-options-settings';

interface SettingsProps {
   initialProjectStatuses: ProjectOptionLike[];
   initialProjectPriorities: ProjectOptionLike[];
   initialLabels: LabelInterface[];
}

export default function Settings({
   initialProjectStatuses,
   initialProjectPriorities,
   initialLabels,
}: SettingsProps) {
   return (
      <div className="w-full max-w-5xl mx-auto p-8">
         <div className="mb-10">
            <h1 className="text-2xl font-semibold">Settings</h1>
         </div>

         <section className="mb-10" id="project-workflow">
            <div className="mb-6">
               <h2 className="text-lg font-semibold">Project workflow</h2>
               <p className="text-sm text-muted-foreground">
                  Statuses and priorities available across projects.
               </p>
            </div>
            <ProjectOptionsSettings
               initialStatuses={initialProjectStatuses}
               initialPriorities={initialProjectPriorities}
            />
         </section>

         <LabelsSettings initialLabels={initialLabels} />
      </div>
   );
}
