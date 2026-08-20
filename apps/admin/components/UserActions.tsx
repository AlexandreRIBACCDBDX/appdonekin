'use client';

import { ConfirmActionButton } from '@/components/ConfirmActionButton';
import { deleteUser, reactivateUser, suspendUser } from '@/lib/actions';
import type { ProfileStatus } from '@/types/database';

export function UserActions({ userId, status }: { userId: string; status: ProfileStatus }) {
  if (status === 'suspended' || status === 'deleted') {
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
    <div className="flex flex-wrap gap-2">
      <ConfirmActionButton
        label="Suspendre le compte"
        tone="danger"
        requireReason
        confirmMessage="Voulez-vous vraiment suspendre ce compte ? Cette personne ne pourra plus accéder à DoneKin."
        onConfirm={(reason) => suspendUser(userId, reason)}
      />
      <ConfirmActionButton
        label="Supprimer le compte"
        tone="danger"
        requireReason
        confirmMessage="Supprimer définitivement ce compte ? (réservé aux super admins)"
        onConfirm={(reason) => deleteUser(userId, reason)}
      />
    </div>
  );
}
