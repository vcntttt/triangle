'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IssueAutomation, IssueStatusOption, LabelInterface } from '@/lib/models';
import { AutomationsSettings } from './automations-settings';
import { IssueStatusesSettings } from './issue-statuses-settings';
import { LabelsSettings } from './labels-settings';
import { ProjectOptionsSettings } from './project-options-settings';
import { CustomizeSidebarDialog } from '@/components/layout/sidebar/customize-sidebar-dialog';

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

         <SidebarSettings />

         <section className="mb-10" id="issue-workflow">
            <div className="mb-6">
               <h2 className="text-lg font-semibold">Issue workflow</h2>
               <p className="text-sm text-muted-foreground">
                  Statuses used to group issues in lists, boards, filters, and forms.
               </p>
            </div>
            <IssueStatusesSettings />
         </section>

         <section className="mb-10" id="project-workflow">
            <div className="mb-6">
               <h2 className="text-lg font-semibold">Project workflow</h2>
               <p className="text-sm text-muted-foreground">
                  Statuses and priorities available across projects. These do not change issue
                  groups; use the issue workflow above for that.
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

function SidebarSettings() {
   const [open, setOpen] = useState(false);

   return (
      <section className="mb-10" id="sidebar-settings">
         <div className="mb-4">
            <h2 className="text-lg font-semibold">Sidebar</h2>
            <p className="text-sm text-muted-foreground">
               Choose which navigation entries appear and how they are ordered.
            </p>
         </div>
         <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
               <p className="text-sm font-medium">Navigation preferences</p>
               <p className="text-xs text-muted-foreground">
                  Manage entries, sections, and badges from one place.
               </p>
            </div>
            <Button variant="outline" onClick={() => setOpen(true)}>
               <SlidersHorizontal className="mr-2 size-4" />
               Configure sidebar
            </Button>
         </div>
         <CustomizeSidebarDialog open={open} onOpenChange={setOpen} />
      </section>
   );
}
