import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUS_ORDER: { key: string; name: string; color: string }[] = [
  { key: "paid",    name: "Payé",      color: "hsl(var(--success))" },
  { key: "pending", name: "En attente", color: "hsl(var(--warning))" },
  { key: "late",    name: "Impayé",    color: "hsl(var(--destructive))" },
  { key: "vacant",  name: "Vacant",    color: "hsl(220 10% 70%)" },
];

interface Props {
  monthLabel: string;
  payments: { status: string; amount: number; paid_amount: number }[];
  vacantUnits: number;
  vacantPotentialRevenue: number;
}

export function StatusDonut({ monthLabel, payments, vacantUnits, vacantPotentialRevenue }: Props) {
  const navigate = useNavigate();

  const data = useMemo(() => {
    const buckets: Record<string, { count: number; amount: number }> = {
      paid: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      late: { count: 0, amount: 0 },
      vacant: { count: vacantUnits, amount: vacantPotentialRevenue },
    };
    payments.forEach(p => {
      const key = p.status === "partial" ? "pending" : p.status;
      if (buckets[key]) {
        buckets[key].count += 1;
        buckets[key].amount += p.amount;
      }
    });
    return STATUS_ORDER.map(s => ({ ...s, ...buckets[s.key] }));
  }, [payments, vacantUnits, vacantPotentialRevenue]);

  const totalAmount = data.reduce((s, d) => s + d.amount, 0);
  const paidAmount = payments.reduce((s, p) => s + p.paid_amount, 0);
  const expectedAmount = payments.reduce((s, p) => s + p.amount, 0);
  const collectionRate = expectedAmount > 0 ? Math.round((paidAmount / expectedAmount) * 100) : 0;

  const chartData = data.map(d => ({ ...d, value: Math.max(d.count, 0.0001) }));

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          Analyse des statuts
          <span className="text-muted-foreground text-xs font-normal">({monthLabel})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative flex-shrink-0">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d: any = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-md text-xs">
                        <p className="font-semibold text-popover-foreground">{d.name}</p>
                        <p className="text-muted-foreground">{d.count} bien{d.count > 1 ? "s" : ""}</p>
                        <p className="text-muted-foreground">{Math.round(d.amount).toLocaleString()} FCFA</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-card-foreground">{collectionRate}%</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Encaissé</span>
            </div>
          </div>
          <div className="flex-1 space-y-2.5 w-full">
            {data.map(s => {
              const pct = totalAmount > 0 ? Math.round((s.amount / totalAmount) * 100) : 0;
              return (
                <div key={s.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-sm text-card-foreground font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">({s.count})</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 flex-shrink-0">
                      <span className="text-xs font-bold text-card-foreground">{Math.round(s.amount).toLocaleString()} <span className="font-normal text-muted-foreground">FCFA</span></span>
                      <span className="text-[10px] text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border flex justify-end">
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => navigate("/financial-reports")}>
            Voir analyse complète <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
