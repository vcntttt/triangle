import type { User } from '@/lib/models';

export const statusUserColors = {
   online: '#00cc66',
   offline: '#969696',
   away: '#ffcc00',
};

export const currentUser: User = {
   id: 'me',
   name: 'vcntttt',
   avatarUrl: 'https://i.pinimg.com/736x/bd/1f/b6/bd1fb6cf9d218514d9ed9a8022153dd2.jpg',
   email: 'local@triangle.dev',
   status: 'online',
   role: 'Admin',
   joinedDate: '2026-01-01',
   teamIds: [],
};

export type ViewerProfileLike = Omit<User, 'teamIds'> & {
   teamIds?: string[];
};

export function viewerProfileToUser(profile: ViewerProfileLike | null | undefined): User {
   if (!profile) {
      return currentUser;
   }

   return {
      id: profile.id,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      email: profile.email,
      status: profile.status,
      role: profile.role,
      joinedDate: profile.joinedDate,
      teamIds: profile.teamIds ?? [],
   };
}

export function resolveCurrentAssignee(
   assigneeId: string | null | undefined,
   viewer: User = currentUser
): User | null {
   if (!assigneeId) {
      return null;
   }

   return viewer;
}
