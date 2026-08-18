'use client';

import { ConfirmActionButton } from '@/components/ConfirmActionButton';
import { reactivateCircle, suspendCircle } from '@/lib/actions';

export function CircleActions({ circleId, suspended }: { circleId: string; suspended: boolean }) {
  if (suspended) {
    return (
      <ConfirmActionButton
        label="Réactiver le cercle"
        tone="primary"
        confirmMessage="Réactiver ce cercle ? Ses membres retrouveront l'accès."
        onConfirm={() => reactivateCircle(circleId)}
      />
    );
  }

  return (
    <ConfirmActionButton
      label="Suspendre le cercle"
      tone="danger"
      requireReason
      confirmMessage="Voulez-vous vraiment suspendre ce cercle ? Plus aucun membre ne pourra y accéder."
      onConfirm={(reason) => suspendCircle(circleId, reason)}
    />
  );
}
