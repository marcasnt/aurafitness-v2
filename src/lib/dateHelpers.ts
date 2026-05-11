/**
 * Suma exactamente 1 mes a una fecha (YYYY-MM-DD).
 * Si el día no existe en el mes siguiente, usa el último día disponible.
 * Ej: 2024-01-31 → 2024-02-29 (último día de febrero)
 */
export function addOneMonth(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const lastDayOfNextMonth = new Date(nextYear, nextMonth, 0).getDate();
  const nextDay = Math.min(day, lastDayOfNextMonth);
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
}

/**
 * Determina el estado de pago automático basado en la fecha de siguiente pago.
 * - paid:   hoy <= fecha siguiente
 * - pending: fecha siguiente < hoy <= fecha siguiente + 5 días
 * - overdue: hoy > fecha siguiente + 5 días
 */
export function getAutoPaymentStatus(nextPaymentDate: string): 'paid' | 'pending' | 'overdue' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(nextPaymentDate);
  next.setHours(0, 0, 0, 0);

  if (today <= next) return 'paid';

  const overdueDate = new Date(next);
  overdueDate.setDate(overdueDate.getDate() + 5);

  if (today > overdueDate) return 'overdue';
  return 'pending';
}
