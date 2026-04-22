/**
 * Logique de génération des échéances d'avance lors de la création d'un locataire.
 *
 * Règles métier :
 * - NOUVEAU bail (lease_start dans le mois courant ou un mois futur) :
 *   on enregistre les `advanceMonths` mois d'avance comme déjà payés,
 *   à partir du mois de `lease_start`.
 * - Bail DÉJÀ EN COURS (lease_start avant le mois courant) :
 *   on suppose que les avances ont été encaissées hors plateforme,
 *   on ne crée AUCUNE échéance passée.
 */

export interface AdvancePaymentInput {
  tenantId: string;
  unitRent: number;
  leaseStart: string | Date; // ISO date ou Date
  advanceMonths: number;
  /** Date de référence pour le "mois courant" — injectable pour tests. */
  today?: Date;
}

export interface AdvancePaymentRow {
  tenant_id: string;
  amount: number;
  paid_amount: number;
  due_date: string; // YYYY-MM-DD
  month: string;    // YYYY-MM
  status: "paid";
}

export function buildAdvancePayments(input: AdvancePaymentInput): AdvancePaymentRow[] {
  const { tenantId, unitRent, advanceMonths } = input;
  if (!advanceMonths || advanceMonths <= 0) return [];

  const today = input.today ?? new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const leaseStartDate = input.leaseStart instanceof Date
    ? input.leaseStart
    : new Date(input.leaseStart);
  const leaseStartMonth = new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth(), 1);

  const isNewLease = leaseStartMonth.getTime() >= currentMonthStart.getTime();
  if (!isNewLease) return [];

  const rows: AdvancePaymentRow[] = [];
  for (let i = 0; i < advanceMonths; i++) {
    const paymentDate = new Date(leaseStartMonth.getFullYear(), leaseStartMonth.getMonth() + i, 1);
    const dueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 5);
    const monthISO = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;
    rows.push({
      tenant_id: tenantId,
      amount: unitRent,
      paid_amount: unitRent,
      due_date: dueDate.toISOString().split("T")[0],
      month: monthISO,
      status: "paid",
    });
  }
  return rows;
}
