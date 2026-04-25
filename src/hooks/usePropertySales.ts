import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export interface SaleListing {
  id: string;
  name: string;
  location: string;
  askingPrice: number;
  listedAt: string; // ISO date
}

export interface SaleRecord {
  id: string;
  name: string;
  location: string;
  salePrice: number;
  saleDate: string; // ISO date
  buyerName: string;
  commission: number;
}

export const SALES_COMMISSION_RATE = 0.05;

const CHANGE_EVENT = "rentflow:sales:updated";

function notifyChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function usePropertySales() {
  const { profile } = useProfile();
  const orgId = profile?.organization_id ?? null;

  const [listings, setListings] = useState<SaleListing[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!orgId) {
      setListings([]);
      setSales([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [listingsRes, salesRes] = await Promise.all([
      supabase
        .from("property_listings")
        .select("id, name, location, asking_price, listed_at")
        .eq("organization_id", orgId)
        .order("listed_at", { ascending: false }),
      supabase
        .from("property_sales")
        .select("id, name, location, sale_price, sale_date, buyer_name, commission")
        .eq("organization_id", orgId)
        .order("sale_date", { ascending: false }),
    ]);

    if (!listingsRes.error && listingsRes.data) {
      setListings(
        listingsRes.data.map((l: any) => ({
          id: l.id,
          name: l.name,
          location: l.location ?? "",
          askingPrice: Number(l.asking_price) || 0,
          listedAt: l.listed_at,
        }))
      );
    }
    if (!salesRes.error && salesRes.data) {
      setSales(
        salesRes.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          location: s.location ?? "",
          salePrice: Number(s.sale_price) || 0,
          saleDate: s.sale_date,
          buyerName: s.buyer_name ?? "",
          commission: Number(s.commission) || 0,
        }))
      );
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchAll();
    const sync = () => fetchAll();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [fetchAll]);

  const addListing = useCallback(
    async (data: Omit<SaleListing, "id">) => {
      if (!orgId) return;
      const { error } = await supabase.from("property_listings").insert({
        organization_id: orgId,
        name: data.name,
        location: data.location,
        asking_price: data.askingPrice,
        listed_at: data.listedAt,
      });
      if (!error) {
        await fetchAll();
        notifyChange();
      }
    },
    [orgId, fetchAll]
  );

  const updateListing = useCallback(
    async (id: string, data: Partial<Omit<SaleListing, "id">>) => {
      const payload: Record<string, unknown> = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.location !== undefined) payload.location = data.location;
      if (data.askingPrice !== undefined) payload.asking_price = data.askingPrice;
      if (data.listedAt !== undefined) payload.listed_at = data.listedAt;
      const { error } = await supabase.from("property_listings").update(payload).eq("id", id);
      if (!error) {
        await fetchAll();
        notifyChange();
      }
    },
    [fetchAll]
  );

  const removeListing = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("property_listings").delete().eq("id", id);
      if (!error) {
        await fetchAll();
        notifyChange();
      }
    },
    [fetchAll]
  );

  const recordSale = useCallback(
    async (
      listingId: string,
      data: { salePrice: number; saleDate: string; buyerName: string; commission: number }
    ) => {
      if (!orgId) return;
      const listing = listings.find((l) => l.id === listingId);
      if (!listing) return;

      const { error: insertError } = await supabase.from("property_sales").insert({
        organization_id: orgId,
        name: listing.name,
        location: listing.location,
        sale_price: data.salePrice,
        sale_date: data.saleDate,
        buyer_name: data.buyerName,
        commission: data.commission,
      });
      if (insertError) return;

      await supabase.from("property_listings").delete().eq("id", listingId);
      await fetchAll();
      notifyChange();
    },
    [orgId, listings, fetchAll]
  );

  return { listings, sales, loading, addListing, updateListing, removeListing, recordSale };
}
