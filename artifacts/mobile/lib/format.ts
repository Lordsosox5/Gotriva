import { t } from '@/lib/i18n';

export function arabicNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG-u-nu-arab').format(value);
}

export function formatDate(value: string | null): string {
  if (!value) return t.common.unknown;
  return new Intl.DateTimeFormat('ar-EG-u-nu-arab', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

export function daysUntil(value: string | null): number {
  if (!value) return 0;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

export function initials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed.slice(0, 1) : t.common.unknownInitial;
}
