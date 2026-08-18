const TONES = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-indigo-100 text-indigo-700',
} as const;

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: keyof typeof TONES }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {label}
    </span>
  );
}

export function statusTone(status: string): keyof typeof TONES {
  switch (status) {
    case 'active':
    case 'approved':
    case 'accepted':
      return 'success';
    case 'suspended':
    case 'disabled':
    case 'deleted':
    case 'revoked':
    case 'rejected':
      return 'danger';
    case 'pending':
    case 'pending_validation':
      return 'warning';
    default:
      return 'neutral';
  }
}
