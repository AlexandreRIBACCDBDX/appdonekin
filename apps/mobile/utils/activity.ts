import type { ActivityEvent, CircleMember } from '@/types/database';

function nameFor(memberId: string | null, members: CircleMember[]): string {
  if (!memberId) return 'Quelqu\'un';
  return members.find((m) => m.id === memberId)?.first_name ?? 'Quelqu\'un';
}

export function describeActivityEvent(event: ActivityEvent, members: CircleMember[]): string {
  const subject = nameFor(event.subject_member_id, members);
  const title = typeof event.metadata?.title === 'string' ? event.metadata.title : undefined;
  const name = typeof event.metadata?.name === 'string' ? event.metadata.name : undefined;

  switch (event.type) {
    case 'task_completed':
      return `🎉 ${subject} a terminé "${title ?? 'une tâche'}"${event.points ? ` +${event.points} pts` : ''}`;
    case 'validation_requested':
      return `⏳ ${subject} attend une validation pour "${title ?? 'une tâche'}"`;
    case 'reward_redeemed':
      return `🎁 ${subject} a utilisé ${event.points ? Math.abs(event.points) : ''} points pour "${name ?? 'une récompense'}"`;
    case 'points_transferred':
      return `💛 ${subject} a reçu ${event.points ?? ''} points`;
    case 'bonus':
      return `⭐ ${subject} a reçu un bonus de ${event.points ?? ''} points`;
    case 'member_joined':
      return `👋 ${subject} a rejoint le cercle`;
    case 'late_penalty':
      return `⏰ ${subject} a une pénalité de retard de ${event.points ? Math.abs(event.points) : ''} Dones pour "${title ?? 'une tâche'}"`;
    default:
      return `${subject} — ${event.type}`;
  }
}
