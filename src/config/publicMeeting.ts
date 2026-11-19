export const PUBLIC_MEETING = {
  slug: 'aprimoramento-musical-2026-11-28',
  path: '/confirmar-presenca',
  title: 'Reunião de Aprimoramento Musical',
  date: '2026-11-28',
  time: '09h00',
  venue: 'Central de Itapevi',
};
export function isPublicMeetingPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === PUBLIC_MEETING.path;
}
export function meetingLabel(value: string): string {
  return value
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && ['de', 'da', 'do', 'das', 'dos', 'e'].includes(word)
        ? word
        : word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1)
    )
    .join(' ');
}
export function meetingDate(value: string): string {
  const parts = value.split('-');
  return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : value;
}
