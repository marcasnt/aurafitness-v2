import type { RoutineDay, Weekday } from '../types/fitness';

export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

export const weekdayLabel = (weekday: Weekday | null): string =>
  WEEKDAYS.find(day => day.value === weekday)?.label ?? 'Sin día asignado';

export const sortRoutinesByWeekday = (routines: RoutineDay[]): RoutineDay[] =>
  [...routines].sort((a, b) => (a.weekday ?? 8) - (b.weekday ?? 8) || a.name.localeCompare(b.name));
