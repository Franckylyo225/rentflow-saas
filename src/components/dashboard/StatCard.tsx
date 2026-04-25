import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  sparkData?: number[];
  /** Tooltip explaining how the metric is calculated */
  helpText?: string;
  /** When provided, the sparkline becomes clickable */
  onSparkClick?: () => void;
  /** Optional content rendered below the value (e.g. progress bar, quick link) */
  children?: React.ReactNode;
}

const variantStyles = {
  default: {
    icon: "bg-primary/10 text-primary",
    sparkColor: "hsl(var(--primary))",
  },
  success: {
    icon: "bg-success/10 text-success",
    sparkColor: "hsl(var(--success))",
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    sparkColor: "hsl(var(--warning))",
  },
  destructive: {
    icon: "bg-destructive/10 text-destructive",
    sparkColor: "hsl(var(--destructive))",
  },
  info: {
    icon: "bg-info/10 text-info",
    sparkColor: "hsl(var(--info))",
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
  const gradId = `spark-${Math.abs(color.split("").reduce((a, c) => a + c.charCodeAt(0), 0))}`;

  return (
    <svg width={w} height={h} className="flex-shrink-0 opacity-70 transition-opacity">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default", sparkData, helpText, onSparkClick, children }: StatCardProps) {
  const styles = variantStyles[variant];

  const titleNode = helpText ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-help underline decoration-dotted decoration-muted-foreground/30 underline-offset-4">
          {title}
        </p>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs">
        {helpText}
      </TooltipContent>
    </Tooltip>
  ) : (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
  );

  const sparkline = sparkData ? <MiniSparkline data={sparkData} color={styles.sparkColor} /> : null;
  const sparkNode = sparkline && onSparkClick ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onSparkClick}
          aria-label="Voir le détail sur 6 mois"
          className="rounded-md hover:bg-muted/60 transition-colors p-0.5 -m-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {sparkline}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">Voir le détail sur 6 mois</TooltipContent>
    </Tooltip>
  ) : sparkline;

  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        {titleNode}
        <div className={cn("p-2 rounded-lg", styles.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-card-foreground tracking-tight">{value}</p>
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
              trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground truncate">{subtitle}</span>}
        </div>
        {sparkNode}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
