export type OpeningGroup = { days: number[]; intervals: { start: string; end: string }[] };
export const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const defaultOpeningGroups = (): OpeningGroup[] => [{ days: [0, 1, 2, 3, 4], intervals: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] }];
export function formatOpeningHours(groups: OpeningGroup[]): string {
  return groups.map(group => `${group.days.length ? [...group.days].sort((a,b) => a-b).map(day => weekDays[day]).join(', ') : 'Dias por selecionar'}: ${group.intervals.map(interval => `${interval.start}–${interval.end}`).join(' / ')}`).join('\n');
}
export function parseOpeningHours(value: string): OpeningGroup[] | null {
  if (!value.trim()) return [];
  const groups: OpeningGroup[] = [];
  for (const line of value.split('\n')) {
    const match = /^(.*?):\s*((?:\d{2}:\d{2}[–-]\d{2}:\d{2})(?:\s*\/\s*\d{2}:\d{2}[–-]\d{2}:\d{2})*)$/.exec(line.trim());
    if (!match) {
      // Recognise the common legacy weekday range without changing its hours.
      const legacy = /^(?:segunda a sexta|seg\.? a sex\.?)\s*[,·]?\s*(\d{2}:\d{2})[–-](\d{2}:\d{2})$/i.exec(line.trim());
      if (!legacy) return null;
      groups.push({ days: [0,1,2,3,4], intervals: [{ start: legacy[1], end: legacy[2] }] }); continue;
    }
    const days = match[1] === 'Dias por selecionar' ? [] : match[1].split(',').map(day => weekDays.indexOf(day.trim()));
    if (days.some(day => day < 0)) return null;
    groups.push({ days, intervals: match[2].split(/\s*\/\s*/).map(interval => { const [start,end] = interval.split(/[–-]/); return { start, end }; }) });
  }
  return groups;
}
export function openingHoursError(value: string): string | undefined {
  const groups = parseOpeningHours(value);
  if (groups === null) return undefined; // Existing unstructured schedules can be kept until explicitly replaced.
  const days = new Set<number>();
  for (const group of groups) {
    if (!group.days.length) return 'Selecione pelo menos um dia para cada horário.';
    for (const day of group.days) { if (days.has(day)) return 'Cada dia só pode ter um horário.'; days.add(day); }
    const intervals = [...group.intervals].sort((a,b) => a.start.localeCompare(b.start));
    for (let index = 0; index < intervals.length; index++) {
      const interval = intervals[index];
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(interval.start) || !/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/.test(interval.end) || interval.end <= interval.start) return 'O fim de cada intervalo deve ser posterior ao início.';
      if (index && interval.start < intervals[index - 1].end) return 'Os intervalos de funcionamento não podem sobrepor-se.';
    }
  }
}
export function numericCompanyInput(key: string, value: string): string {
  if (['nif', 'payment_day'].includes(key)) return value.replace(/\D/g, '');
  if (['monthly_fee', 'support_hours', 'extra_hour_rate'].includes(key)) {
    const cleaned = value.replace(/[^\d.,]/g, ''); const separator = cleaned.search(/[.,]/);
    return separator < 0 ? cleaned : cleaned.slice(0, separator) + cleaned[separator] + cleaned.slice(separator + 1).replace(/[.,]/g, '').slice(0, 2);
  }
  if (['phone', 'mobile'].includes(key)) { const cleaned = value.replace(/[^\d+\s().-]/g, ''); return (cleaned.startsWith('+') ? '+' : '') + cleaned.replace(/\+/g, ''); }
  return value;
}
