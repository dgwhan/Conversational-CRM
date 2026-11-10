export interface ManagedStaffItem {
  id: string;
  email: string;
  phoneNumber?: string | null;
  fullName: string;
  role: string;
  status: 'ACTIVE' | 'LOCKED';
  ownerId: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

