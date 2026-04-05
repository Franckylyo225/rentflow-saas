import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Tag, X, Check } from "lucide-react";

interface PromoResult {
  success: boolean;
  error?: string;
  discount?: number;
  discount_type?: string;
  discount_value?: number;
  final_price?: number;
}

interface PromoCodeInputProps {
  organizationId: string;
  planSlug: string;
  planPrice: number;
  onApplied: (result: PromoResult) => void;
  onRemoved: () => void;
  disabled?: boolean;
}

export function PromoCodeInput({
  organizationId,
  planSlug,
  planPrice,
  onApplied,
  onRemoved,
  disabled,
}: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [applied, setApplied] = useState<PromoResult | null>(null);
  const [error, setError] = useState("");

  const handleApply = async () => {
    if (!code.trim()) return;
    setChecking(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("apply_promo_code", {
      _code: code.trim(),
      _organization_id: organizationId,
      _plan_slug: planSlug,
      _plan_price: planPrice,
    });

    if (rpcError) {
      setError("Erreur lors de la vérification");
      setChecking(false);
      return;
    }

    const result = data as unknown as PromoResult;
    if (result.success) {
      setApplied(result);
      onApplied(result);
    } else {
      setError(result.error || "Code invalide");
    }
    setChecking(false);
  };

  const handleRemove = () => {
    setApplied(null);
    setCode("");
    setError("");
    onRemoved();
  };

  if (applied) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
        <Check className="h-4 w-4 text-green-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Code <span className="font-mono">{code}</span> appliqué
          </p>
          <p className="text-xs text-muted-foreground">
            {applied.discount_type === "percentage"
              ? `-${applied.discount_value}%`
              : `-${Number(applied.discount).toLocaleString("fr-FR")} FCFA`}
            {" — "}Prix final : {Number(applied.final_price).toLocaleString("fr-FR")} FCFA
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRemove} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
            placeholder="Code promo"
            className="pl-9 font-mono uppercase"
            disabled={disabled || checking}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleApply}
          disabled={!code.trim() || checking || disabled}
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
