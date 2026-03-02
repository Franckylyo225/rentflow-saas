import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  sparkData?: number[];
}

const variantStyles = {
  default: {
    icon: "bg-primary/10 text-primary",
    sparkColor: "hsl(160, 84%, 39%)",
  },
  success: {
    icon: "bg-success/10 text-success",
    sparkColor: "hsl(160, 84%, 39%)",
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    sparkColor: "hsl(38, 92%, 50%)",
  },
  destructive: {
    icon: "bg-destructive/10 text-destructive",
    sparkColor: "hsl(0, 72%, 51%)",
  },
  info: {
    icon: "bg-info/10 text-info",
    sparkColor: "hsl(210, 100%, 52%)",
  },
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 64;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} className="flex-shrink-0 opacity-60">
      <defs>
        <linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default", sparkData }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <div className={cn("p-2 rounded-lg", styles.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-card-foreground tracking-tight">{value}</p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
              trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
        {sparkData && <MiniSparkline data={sparkData} color={styles.sparkColor} />}
      </div>
    </div>
  );
}
