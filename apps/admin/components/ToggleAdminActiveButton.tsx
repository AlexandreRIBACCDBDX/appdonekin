'use client';

import { ConfirmActionButton } from '@/components/ConfirmActionButton';
import { setPlatformRole } from '@/lib/actions';
import type { PlatformRole } from '@/types/database';

export function ToggleAdminActiveButton({
  email,
  role,
  isActive,
}: {
  email: string;
  role: PlatformRole;
  isActive: boolean;
}) {
  return (
    <ConfirmActionButton
      label={isActive ? 'Désactiver' : 'Réactiver'}
      tone={isActive ? 'danger' : 'primary'}
      confirmMessage={
        isActive
          ? `Retirer l'accès back office à ${email} ?`
          : `Redonner l'accès back office à ${email} avec le rôle ${role} ?`
      }
      onConfirm={() => setPlatformRole(email, role, !isActive)}
    />
  );
}
