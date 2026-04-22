import { describe, it, expect } from "vitest";
import { buildAdvancePayments } from "@/lib/advancePayments";

describe("buildAdvancePayments", () => {
  const today = new Date(2026, 3, 15); // 15 avril 2026

  it("ne génère AUCUNE échéance pour un bail déjà en cours (lease_start antérieur au mois courant)", () => {
    const rows = buildAdvancePayments({
      tenantId: "t1",
      unitRent: 100000,
      leaseStart: "2026-01-10", // janvier, alors qu'on est en avril
      advanceMonths: 2,
      today,
    });
    expect(rows).toEqual([]);
  });

  it("ne génère aucune échéance même si advanceMonths > 0 quand le bail a démarré le mois précédent", () => {
    const rows = buildAdvancePayments({
      tenantId: "t1",
      unitRent: 100000,
      leaseStart: "2026-03-28",
      advanceMonths: 3,
      today,
    });
    expect(rows).toEqual([]);
  });

  it("génère les mois d'avance comme payés à partir de lease_start pour un nouveau bail (mois courant)", () => {
    const rows = buildAdvancePayments({
      tenantId: "t1",
      unitRent: 150000,
      leaseStart: "2026-04-01",
      advanceMonths: 2,
      today,
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      tenant_id: "t1",
      amount: 150000,
      paid_amount: 150000,
      month: "2026-04",
      due_date: "2026-04-05",
      status: "paid",
    });
    expect(rows[1]).toMatchObject({
      month: "2026-05",
      due_date: "2026-05-05",
      status: "paid",
    });
  });

  it("génère les mois d'avance à partir de lease_start pour un bail qui démarre dans le futur", () => {
    const rows = buildAdvancePayments({
      tenantId: "t2",
      unitRent: 80000,
      leaseStart: "2026-06-15",
      advanceMonths: 3,
      today,
    });
    expect(rows.map(r => r.month)).toEqual(["2026-06", "2026-07", "2026-08"]);
    rows.forEach(r => {
      expect(r.status).toBe("paid");
      expect(r.paid_amount).toBe(80000);
    });
  });

  it("retourne un tableau vide quand advanceMonths = 0", () => {
    const rows = buildAdvancePayments({
      tenantId: "t1",
      unitRent: 100000,
      leaseStart: "2026-04-01",
      advanceMonths: 0,
      today,
    });
    expect(rows).toEqual([]);
  });
});
