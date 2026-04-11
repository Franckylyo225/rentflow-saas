import { useEffect, useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Announcement {
  id: string;
  message: string;
  link_url: string | null;
  link_label: string | null;
  bg_color: string;
  text_color: string;
}

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("announcements")
        .select("id, message, link_url, link_label, bg_color, text_color")
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) setAnnouncement(data);
    };
    fetchAnnouncement();
  }, []);

  useEffect(() => {
    setDismissed(sessionStorage.getItem("dismissed_announcement"));
  }, []);

  if (!announcement || dismissed === announcement.id) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("dismissed_announcement", announcement.id);
    setDismissed(announcement.id);
  };

  return (
    <div
      className="relative flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium sticky top-0 z-50"
      style={{ backgroundColor: announcement.bg_color, color: announcement.text_color }}
    >
      <span className="text-center">{announcement.message}</span>
      {announcement.link_url && (
        <Link
          to={announcement.link_url}
          className="inline-flex items-center gap-1 underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity"
          style={{ color: announcement.text_color }}
        >
          {announcement.link_label || "En savoir plus"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Fermer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
