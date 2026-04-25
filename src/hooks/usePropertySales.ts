import { useEffect, useState, useCallback } from "react";

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

const LISTINGS_KEY = "rentflow.sales.listings.v1";
const SALES_KEY = "rentflow.sales.records.v1";

const SEED_LISTINGS: SaleListing[] = [
  { id: "sl1", name: "Villa F5 Cocody Angré", location: "Cocody Angré", askingPrice: 95_000_000, listedAt: "2026-01-02" },
  { id: "sl2", name: "Appartement F3 Riviera 2", location: "Riviera 2", askingPrice: 48_000_000, listedAt: "2026-01-15" },
  { id: "sl3", name: "Duplex Marcory Zone 4", location: "Marcory Zone 4", askingPrice: 72_000_000, listedAt: "2026-02-20" },
  { id: "sl4", name: "Studio Angré 8ème", location: "Cocody Angré", askingPrice: 18_500_000, listedAt: "2026-03-01" },
  { id: "sl5", name: "Villa F4 Deux-Plateaux", location: "Les Deux-Plateaux", askingPrice: 85_000_000, listedAt: "2026-04-10" },
];

const SEED_SALES: SaleRecord[] = [
  { id: "sr1", name: "Appartement F2 Cocody", location: "Cocody", salePrice: 35_000_000, saleDate: "2026-03-15", buyerName: "Kouassi Amani", commission: 1_750_000 },
  { id: "sr2", name: "Studio Marcory", location: "Marcory", salePrice: 15_000_000, saleDate: "2026-03-28", buyerName: "Traoré Mariam", commission: 750_000 },
  { id: "sr3", name: "Villa F3 Riviera", location: "Riviera 3", salePrice: 62_000_000, saleDate: "2026-04-10", buyerName: "Coulibaly Seydou", commission: 3_100_000 },
];

function load<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return seed;
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("rentflow:sales:updated"));
  } catch {
    // ignore
  }
}

export const SALES_COMMISSION_RATE = 0.05;

export function usePropertySales() {
  const [listings, setListings] = useState<SaleListing[]>(() => load(LISTINGS_KEY, SEED_LISTINGS));
  const [sales, setSales] = useState<SaleRecord[]>(() => load(SALES_KEY, SEED_SALES));

  useEffect(() => {
    const sync = () => {
      setListings(load(LISTINGS_KEY, SEED_LISTINGS));
      setSales(load(SALES_KEY, SEED_SALES));
    };
    window.addEventListener("rentflow:sales:updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("rentflow:sales:updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const addListing = useCallback((data: Omit<SaleListing, "id">) => {
    const next = [{ ...data, id: `sl_${Date.now()}` }, ...listings];
    setListings(next);
    save(LISTINGS_KEY, next);
  }, [listings]);

  const updateListing = useCallback((id: string, data: Partial<Omit<SaleListing, "id">>) => {
    const next = listings.map(l => l.id === id ? { ...l, ...data } : l);
    setListings(next);
    save(LISTINGS_KEY, next);
  }, [listings]);

  const removeListing = useCallback((id: string) => {
    const next = listings.filter(l => l.id !== id);
    setListings(next);
    save(LISTINGS_KEY, next);
  }, [listings]);

  const recordSale = useCallback((listingId: string, data: { salePrice: number; saleDate: string; buyerName: string; commission: number; }) => {
    const listing = listings.find(l => l.id === listingId);
    if (!listing) return;
    const newSale: SaleRecord = {
      id: `sr_${Date.now()}`,
      name: listing.name,
      location: listing.location,
      salePrice: data.salePrice,
      saleDate: data.saleDate,
      buyerName: data.buyerName,
      commission: data.commission,
    };
    const nextSales = [newSale, ...sales];
    const nextListings = listings.filter(l => l.id !== listingId);
    setSales(nextSales);
    setListings(nextListings);
    save(SALES_KEY, nextSales);
    save(LISTINGS_KEY, nextListings);
  }, [listings, sales]);

  return { listings, sales, addListing, updateListing, removeListing, recordSale };
}
