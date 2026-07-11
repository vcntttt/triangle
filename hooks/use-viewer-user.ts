'use client';

import { viewerProfileToUser } from '@/lib/current-user';
import type { User } from '@/lib/models';
import { useViewerProfile } from '@/src/data/viewer';
import { useMemo } from 'react';

export function useViewerUser(): User {
   const profile = useViewerProfile();
   return useMemo(() => viewerProfileToUser(profile), [profile]);
}
