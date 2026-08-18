'use client';

import { ConfirmActionButton } from '@/components/ConfirmActionButton';
import { reactivateUser, suspendUser } from '@/lib/actions';
import type { ProfileStatus } from '@/types/database';

export function UserActions({ userId, status }: { userId: string; status: ProfileStatus }) {
  if (status === 'suspended') {
    return (
      <ConfirmActionButton
        label="Réactiver le compte"
        tone="primary"
        confirmMessage="Réactiver ce compte ? La personne retrouvera l'accès à DoneKin."
        onConfirm={() => reactivateUser(userId)}
      />
    );
  }

  return (
    <ConfirmActionButton
      label="Suspendre le compte"
      tone="danger"
      requireReason
      confirmMessage="Voulez-vous vraiment suspendre ce compte ? Cette personne ne pourra plus accéder à DoneKin."
      onConfirm={(reason) => suspendUser(userId, reason)}
    />
  );
}
