import { Session } from 'next-auth';

interface UserWithRoles {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  role?: string;
  roles?: string[];
}

export function isAdminUser(session: Session | null): boolean {
  if (!session?.user) return false;
  
  const user = session.user as UserWithRoles;
  
  // Check for admin role in various possible locations
  return Boolean(
    user.isAdmin === true ||
    user.role === 'admin' ||
    (user.roles && user.roles.includes('admin'))
  );
} 