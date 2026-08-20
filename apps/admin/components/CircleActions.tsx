'use client';

import { ConfirmActionButton } from '@/components/ConfirmActionButton';
import { deleteCircle, reactivateCircle, restoreCircle, suspendCircle } from '@/lib/actions';

export function CircleActions({
  circleId,
  suspended,
  archived,
}: {
  circleId: string;
  suspended: boolean;
  archived: boolean;
}) {
  if (archived) {
    return (
      <ConfirmActionButton
        label="Restaurer le cercle"
        tone="primary"
        confirmMessage="Restaurer ce cercle supprimé ?"
        onConfirm={() => restoreCircle(circleId)}
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {suspended ? (
        <ConfirmActionButton
          label="Réactiver le cercle"
          tone="primary"
          confirmMessage="Réactiver ce cercle ? Ses membres retrouveront l'accès."
          onConfirm={() => reactivateCircle(circleId)}
        />
      ) : (
        <ConfirmActionButton
          label="Suspendre le cercle"
          tone="danger"
          requireReason
          confirmMessage="Voulez-vous vraiment suspendre ce cercle ? Plus aucun membre ne pourra y accéder."
          onConfirm={(reason) => suspendCircle(circleId, reason)}
        />
      )}
      <ConfirmActionButton
        label="Supprimer le cercle"
        tone="danger"
        requireReason
        confirmMessage="Supprimer définitivement ce cercle ? (réservé aux super admins)"
        onConfirm={(reason) => deleteCircle(circleId, reason)}
      />
    </div>
  );
}
