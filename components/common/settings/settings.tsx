'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useViewerCommands, useViewerPreferences } from '@/src/data/viewer';
import type { IssueAutomation, IssueStatusOption, LabelInterface } from '@/lib/models';
import { AutomationsSettings } from './automations-settings';
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
         <SavedViewsSettings />

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

function SavedViewsSettings() {
   const preferences = useViewerPreferences();
   const { updatePreferences } = useViewerCommands();
   const [saving, setSaving] = useState(false);
   const enabled = preferences?.savedViewsEnabled ?? true;

   const handleChange = async (nextEnabled: boolean) => {
      setSaving(true);

      try {
         await updatePreferences({ savedViewsEnabled: nextEnabled });
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Saved views could not be updated.');
      } finally {
         setSaving(false);
      }
   };

   return (
      <section className="mb-10" id="saved-views-settings">
         <div className="mb-4">
            <h2 className="text-lg font-semibold">Saved views</h2>
            <p className="text-sm text-muted-foreground">
               Show or hide saved views across the sidebar and issue actions.
            </p>
         </div>
         <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
               <p className="text-sm font-medium">Enable saved views</p>
               <p className="text-xs text-muted-foreground">
                  Turn this off to remove saved views from the app.
               </p>
            </div>
            <Switch
               checked={enabled}
               disabled={saving}
               onCheckedChange={(checked) => void handleChange(checked)}
               aria-label="Enable saved views"
            />
         </div>
      </section>
   );
}
