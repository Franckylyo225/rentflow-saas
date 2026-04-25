import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

interface Point {
  month: string;
  label: string;
  paid: number;
  unpaid: number;
}

interface Props {
  data: Point[];
}

type Period = "6m" | "12m" | "year";

const FCFA = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString();

export function MonthlyRevenueChart({ data }: Props) {
  const [period, setPeriod] = useState<Period>("12m");

  const filtered = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
    if (period === "6m") return sorted.slice(-6);
    if (period === "year") {
      const y = new Date().getFullYear().toString();
      return sorted.filter(d => d.month.startsWith(y));
    }
    return sorted.slice(-12);
  }, [data, period]);

  // Trend line: simple moving average (window=3)
  const withTrend = useMemo(() => {
    return filtered.map((d, i, arr) => {
      const w = arr.slice(Math.max(0, i - 1), i + 2);
      const total = w.reduce((s, x) => s + x.paid + x.unpaid, 0);
      return { ...d, trend: w.length ? Math.round(total / w.length) : 0 };
    });
  }, [filtered]);

  const periods: { key: Period; label: string }[] = [
    { key: "6m", label: "6 mois" },
    { key: "12m", label: "12 mois" },
    { key: "year", label: "Cette année" },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Revenus mensuels</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
              {periods.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                    period === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-success" />Payé</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-destructive" />Impayé</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-muted-foreground" style={{ backgroundImage: "repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 6px)" }} />Tendance</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {withTrend.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={withTrend} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={FCFA} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d: any = payload[0]?.payload;
                  const total = (d?.paid || 0) + (d?.unpaid || 0);
                  const rate = total > 0 ? Math.round((d.paid / total) * 100) : 0;
                  return (
                    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-md text-xs space-y-0.5">
                      <p className="font-semibold capitalize text-popover-foreground">{label}</p>
                      <p className="text-success">Payé : {Math.round(d.paid).toLocaleString()} FCFA</p>
                      <p className="text-destructive">Impayé : {Math.round(d.unpaid).toLocaleString()} FCFA</p>
                      <p className="text-muted-foreground">Taux : {rate}%</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="paid" name="Payé" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} animationDuration={500} />
              <Bar dataKey="unpaid" name="Impayé" radius={[6, 6, 0, 0]} animationDuration={500}>
                {withTrend.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill="hsl(var(--destructive))"
                    className={entry.unpaid > 0 ? "animate-pulse" : ""}
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="trend"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                name="Tendance"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
