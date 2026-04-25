import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface StatHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  data: { label: string; value: number }[];
  unit?: string;
  color?: string;
}

export function StatHistoryDrawer({ open, onClose, title, description, data, unit = "FCFA", color = "hsl(var(--primary))" }: StatHistoryDrawerProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const avg = data.length ? Math.round(total / data.length) : 0;
  const max = data.length ? Math.max(...data.map(d => d.value)) : 0;

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-3xl">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total 6 mois</p>
                <p className="text-lg font-bold text-foreground">{total.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{unit}</span></p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Moyenne</p>
                <p className="text-lg font-bold text-foreground">{avg.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{unit}</span></p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Maximum</p>
                <p className="text-lg font-bold text-foreground">{max.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{unit}</span></p>
              </div>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString()} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toLocaleString()} ${unit}`, ""]}
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13, background: "hsl(var(--popover))" }}
                  />
                  <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-medium text-xs uppercase tracking-wider">Mois</th>
                  <th className="text-right py-2 font-medium text-xs uppercase tracking-wider">Montant</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((d, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 capitalize">{d.label}</td>
                    <td className="py-2 text-right font-semibold">{d.value.toLocaleString()} {unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
