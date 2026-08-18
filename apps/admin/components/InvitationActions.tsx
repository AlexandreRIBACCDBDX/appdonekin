'use client';

import { ConfirmActionButton } from '@/components/ConfirmActionButton';
import { resendInvitation, revokeInvitation } from '@/lib/actions';

export function InvitationActions({ invitationId, status }: { invitationId: string; status: string }) {
  return (
    <div className="flex gap-2">
      {status === 'pending' || status === 'expired' ? (
        <ConfirmActionButton
          label="Renvoyer"
          tone="primary"
          confirmMessage="Générer un nouveau lien pour cette invitation ?"
          onConfirm={() => resendInvitation(invitationId)}
        />
      ) : null}
      {status === 'pending' ? (
        <ConfirmActionButton
          label="Révoquer"
          tone="danger"
          confirmMessage="Révoquer cette invitation ? Le lien ne fonctionnera plus."
          onConfirm={() => revokeInvitation(invitationId)}
        />
      ) : null}
    </div>
  );
}
