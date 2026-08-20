'use client';

import { ConfirmActionButton } from '@/components/ConfirmActionButton';
import { cancelRedemption } from '@/lib/actions';

export function RedemptionActions({ redemptionId, circleId }: { redemptionId: string; circleId: string }) {
  return (
    <ConfirmActionButton
      label="Rembourser / annuler"
      tone="danger"
      requireReason
      confirmMessage="Annuler cette récompense déjà validée et rembourser les points au membre ?"
      onConfirm={(reason) => cancelRedemption(redemptionId, reason, circleId)}
    />
  );
}
