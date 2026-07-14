'use client';

import type { IssueAutomation, IssueStatusOption, LabelInterface } from '@/lib/models';
import { AutomationsSettings } from './automations-settings';
import { LabelsSettings } from './labels-settings';
import { ProjectOptionsSettings } from './project-options-settings';

interface SettingsProps {
   initialLabels: LabelInterface[];
   initialAutomations: IssueAutomation[];
   issueStatuses: IssueStatusOption[];
}

export default function Settings({
   initialLabels,
   initialAutomations,
   issueStatuses,
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
            <ProjectOptionsSettings />
         </section>

         <AutomationsSettings
            initialAutomations={initialAutomations}
            labels={initialLabels}
            statuses={issueStatuses}
         />

         <LabelsSettings initialLabels={initialLabels} />
      </div>
   );
}
