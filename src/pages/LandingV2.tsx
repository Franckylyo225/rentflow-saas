import { useEffect, useRef, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { toast } from "sonner";
import { Menu, X, Shield, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/* ============================================================
   Couleurs (literals autorisés exceptionnellement pour ce
   layout marketing one-page entièrement statique)
   ============================================================ */
const GREEN = "#22C55E";
const GREEN_DARK = "#16A34A";
const NAVY = "#0F2942";
const BORDER = "#E5E7EB";
const MUTED = "#6B7280";
const MUTED_LIGHT = "#9CA3AF";
const BG_SOFT = "#F9FAFB";

/* ============================================================
   Hook : reveal au scroll
   ============================================================ */
function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const inView = useInView(ref, { once: true, amount: threshold });
  return { ref, inView };
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useReveal<HTMLDivElement>();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   Helpers
   ============================================================ */
const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

/* ============================================================
   Logo
   ============================================================ */
function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          width: size,
          height: size,
          background: GREEN,
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Shield size={size * 0.55} color="white" strokeWidth={2.5} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 500, color: "#111827" }}>
        Rentflow
      </span>
    </div>
  );
}

/* ============================================================
   1. STATUS BAR
   ============================================================ */
function StatusBar({ seats }: { seats: number }) {
  return (
    <div
      style={{
        height: 36,
        background: BG_SOFT,
        borderBottom: `0.5px solid ${BORDER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: MUTED,
        gap: 8,
        padding: "0 16px",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: GREEN,
          display: "inline-block",
          animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        }}
      />
      <span className="hidden sm:inline">Tous les systèmes opérationnels</span>
      <span style={{ opacity: 0.3 }} className="hidden sm:inline">
        ·
      </span>
      <button
        onClick={() => scrollToId("section-pionniers")}
        style={{
          color: GREEN,
          fontWeight: 500,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        {seats > 0
          ? `Offre lancement — ${seats} places restantes →`
          : "Offre lancement — Complet"}
      </button>
    </div>
  );
}

/* ============================================================
   2. NAVBAR
   ============================================================ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Fonctionnalités", id: "section-terminal" },
    { label: "Tarifs", id: "section-tarifs" },
    { label: "Roadmap", id: "section-roadmap" },
    { label: "À propos", id: "section-footer" },
  ];

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "white",
        borderBottom: `0.5px solid ${BORDER}`,
        padding: "12px 24px",
        boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.06)" : "none",
        transition: "box-shadow 0.2s",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <Logo />
        </button>

        <div className="hidden md:flex" style={{ gap: 24 }}>
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollToId(l.id)}
              style={{
                fontSize: 13,
                color: MUTED,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center" style={{ gap: 8 }}>
          <button
            onClick={() => navigate("/auth")}
            style={{
              border: `1px solid #D1D5DB`,
              borderRadius: 7,
              padding: "6px 14px",
              fontSize: 13,
              background: "white",
              cursor: "pointer",
              color: "#111827",
            }}
          >
            Connexion
          </button>
          <button
            onClick={() => navigate("/auth")}
            style={{
              background: GREEN,
              color: "white",
              borderRadius: 7,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Démarrer gratuitement
          </button>
        </div>

        <button
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Menu"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
        >
          <Menu size={22} color="#111827" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            position: "fixed",
            inset: 0,
            background: "white",
            zIndex: 100,
            padding: 24,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 32,
            }}
          >
            <Logo />
            <button
              onClick={() => setMobileOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer" }}
              aria-label="Fermer"
            >
              <X size={24} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {links.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setMobileOpen(false);
                  setTimeout(() => scrollToId(l.id), 200);
                }}
                style={{
                  fontSize: 16,
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#111827",
                  padding: "8px 0",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => navigate("/auth")}
              style={{
                border: `1px solid #D1D5DB`,
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 14,
                background: "white",
                cursor: "pointer",
              }}
            >
              Connexion
            </button>
            <button
              onClick={() => navigate("/auth")}
              style={{
                background: GREEN,
                color: "white",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 14,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              Démarrer gratuitement
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ============================================================
   3. HERO
   ============================================================ */
function Hero() {
  const navigate = useNavigate();
  return (
    <section style={{ padding: "56px 24px 40px", textAlign: "center" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Reveal>
          <button
            onClick={() => scrollToId("section-roadmap")}
            style={{
              border: `0.5px solid #D1D5DB`,
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 12,
              color: MUTED,
              background: "white",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: GREEN,
              }}
            />
            <span
              style={{
                background: "#DCFCE7",
                color: "#166534",
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 4,
                fontWeight: 500,
              }}
            >
              Nouveau
            </span>
            Relances WhatsApp en bêta — Rejoindre →
          </button>
        </Reveal>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl md:text-[38px]"
          style={{
            fontWeight: 500,
            lineHeight: 1.18,
            margin: 0,
            color: "#0F172A",
          }}
        >
          La gestion locative
          <br />
          automatisée pour
          <br />
          <span style={{ color: GREEN }}>l'Afrique.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            fontSize: 15,
            color: MUTED,
            maxWidth: 420,
            margin: "20px auto 26px",
            lineHeight: 1.65,
          }}
        >
          Rentflow automatise vos relances loyers par SMS et email. Centralisez
          vos biens, suivez vos paiements et encaissez plus vite — en FCFA.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row"
          style={{ gap: 10, justifyContent: "center", marginBottom: 28 }}
        >
          <button
            onClick={() => navigate("/auth")}
            style={{
              background: GREEN,
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 26px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Démarrer gratuitement
          </button>
          <button
            onClick={() => scrollToId("section-terminal")}
            style={{
              background: "transparent",
              border: `0.5px solid #D1D5DB`,
              borderRadius: 8,
              padding: "12px 22px",
              fontSize: 14,
              cursor: "pointer",
              color: "#111827",
            }}
          >
            Voir la démo →
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center"
          style={{ gap: 14, fontSize: 12, color: MUTED_LIGHT }}
        >
          {[
            "77 agences actives",
            "Sans carte bancaire",
            "14 jours gratuits",
            "Orange Money accepté",
          ].map((t) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: GREEN,
                  display: "inline-block",
                }}
              />
              {t}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   4. STRIP OPÉRATEURS
   ============================================================ */
function PaymentStrip() {
  const pills: { label: string; bg: string; color: string; border: string }[] = [
    { label: "Orange Money", bg: "#FFF7ED", color: "#9A3412", border: "#FED7AA" },
    { label: "Wave", bg: "#F0F9FF", color: "#0369A1", border: "#BAE6FD" },
    { label: "MTN MoMo", bg: "#FEFCE8", color: "#854D0E", border: "#FDE68A" },
    { label: "Moov Money", bg: "#F5F3FF", color: "#5B21B6", border: "#DDD6FE" },
    { label: "Virement", bg: "white", color: MUTED, border: BORDER },
    { label: "Espèces", bg: "white", color: MUTED, border: BORDER },
  ];
  return (
    <div
      style={{
        background: BG_SOFT,
        borderTop: `0.5px solid ${BORDER}`,
        borderBottom: `0.5px solid ${BORDER}`,
        padding: "14px 24px",
      }}
    >
      <p
        style={{
          textAlign: "center",
          fontSize: 10,
          color: MUTED_LIGHT,
          textTransform: "uppercase",
          letterSpacing: ".05em",
          marginBottom: 10,
        }}
      >
        Moyens de paiement acceptés par vos locataires
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 7 }}>
        {pills.map((p) => (
          <span
            key={p.label}
            style={{
              background: p.bg,
              color: p.color,
              border: `0.5px solid ${p.border}`,
              padding: "4px 12px",
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   5. STATS BAND
   ============================================================ */
function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {n.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}

function StatsBand() {
  const stats = [
    { value: 77, suffix: "", label: "Agences actives" },
    { value: 1243, suffix: "", label: "Biens gérés" },
    { value: 96, suffix: "%", label: "Satisfaction" },
    { value: 4, suffix: "h", label: "Économisées / semaine" },
  ];
  return (
    <div
      style={{
        background: "white",
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
      }}
      className="md:!grid-cols-4"
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            padding: "18px 12px",
            textAlign: "center",
            borderRight: i < stats.length - 1 ? `0.5px solid ${BORDER}` : undefined,
            borderBottom: `0.5px solid ${BORDER}`,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 500, color: GREEN }}>
            <CountUp value={s.value} suffix={s.suffix} />
          </div>
          <div style={{ fontSize: 11, color: MUTED_LIGHT, marginTop: 3 }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   6. PROBLÈME
   ============================================================ */
function ProblemSection() {
  const cards = [
    {
      icon: "📞",
      iconBg: "#FEF2F2",
      title: "Relances interminables",
      desc: "Appels manuels, SMS un par un pour chaque locataire en retard.",
      stat: "~3h / semaine perdues",
      statColor: "#DC2626",
    },
    {
      icon: "📋",
      iconBg: "#FEF3C7",
      title: "Excel éparpillé",
      desc: "Données perdues, erreurs de calcul, aucune visibilité globale.",
      stat: "0 traçabilité",
      statColor: "#DC2626",
    },
    {
      icon: "💸",
      iconBg: "#FEF2F2",
      title: "Impayés accumulés",
      desc: "Sans suivi automatique, les retards deviennent des impayés définitifs.",
      stat: "Avg. 12j de retard",
      statColor: "#D97706",
    },
    {
      icon: "📉",
      iconBg: "#FEF3C7",
      title: "Aucune visibilité CA",
      desc: "Impossible de savoir en temps réel combien vous encaissez ce mois.",
      stat: "Pilotage à l'aveugle",
      statColor: "#D97706",
    },
  ];

  return (
    <section
      id="section-probleme"
      style={{
        background: BG_SOFT,
        borderTop: `0.5px solid ${BORDER}`,
        borderBottom: `0.5px solid ${BORDER}`,
        padding: "44px 24px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: GREEN_DARK,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Le problème
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: "6px 0 4px", color: "#0F172A" }}>
            La gestion manuelle vous coûte cher
          </h2>
          <p style={{ fontSize: 14, color: MUTED, marginBottom: 22 }}>
            Chaque mois, les mêmes tâches. Les mêmes retards. Les mêmes pertes.
          </p>
        </Reveal>

        <div
          className="grid grid-cols-1 md:grid-cols-2"
          style={{ gap: 10 }}
        >
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08}>
              <div
                style={{
                  background: "white",
                  border: `0.5px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    background: c.iconBg,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  {c.icon}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>
                  {c.title}
                </div>
                <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 10px" }}>
                  {c.desc}
                </p>
                <div style={{ fontSize: 16, fontWeight: 500, color: c.statColor }}>
                  {c.stat}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   7. TERMINAL EN ACTION
   ============================================================ */
function TerminalSection() {
  const lines: { ts: string; tag: string; tagColor: string; msg: string; bold?: boolean }[] = [
    {
      ts: "07:00:01",
      tag: "SCAN",
      tagColor: "#60A5FA",
      msg: "Analyse des échéances du jour — 48 baux actifs...",
    },
    {
      ts: "07:00:02",
      tag: "DETECT",
      tagColor: "#F59E0B",
      msg: "Kouassi A. — Villa Angré — 450 000 FCFA — J+8",
    },
    {
      ts: "07:00:02",
      tag: "DETECT",
      tagColor: "#F59E0B",
      msg: "Traoré M. — Appt Riviera 2 — 280 000 FCFA — J+3",
    },
    {
      ts: "07:00:03",
      tag: "SEND",
      tagColor: GREEN,
      msg: "SMS urgence → Kouassi A. (+225 07 ••• •• 12) ✓",
    },
    {
      ts: "07:00:03",
      tag: "SEND",
      tagColor: GREEN,
      msg: "Email rappel → Traoré M. (t.mariam@gmail.com) ✓",
    },
    {
      ts: "07:00:04",
      tag: "DONE",
      tagColor: GREEN,
      msg: "4 relances envoyées · 0 erreur · Prochaine : 14h00",
      bold: true,
    },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, amount: 0.3 });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= lines.length) clearInterval(id);
    }, 300);
    return () => clearInterval(id);
  }, [inView, lines.length]);

  const miniStats = [
    { value: "07:00", color: MUTED, label: "Exécution automatique" },
    { value: "47", color: "#F59E0B", label: "Relances ce mois" },
    { value: "74%", color: GREEN, label: "Taux de réponse" },
    { value: "3,2j", color: GREEN, label: "Délai moyen paiement" },
  ];

  return (
    <section id="section-terminal" style={{ background: "white", padding: "44px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: GREEN_DARK,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            En action
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: "6px 0 4px", color: "#0F172A" }}>
            Regardez Rentflow travailler
          </h2>
          <p style={{ fontSize: 14, color: MUTED, marginBottom: 20 }}>
            Pendant que vous dormez, vos relances partent automatiquement selon
            la séquence configurée.
          </p>
        </Reveal>

        <Reveal>
          <div
            ref={containerRef}
            style={{
              border: `0.5px solid ${BORDER}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {/* Browser bar */}
            <div
              style={{
                background: BG_SOFT,
                borderBottom: `0.5px solid ${BORDER}`,
                padding: "9px 14px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN }} />
              <span
                style={{
                  background: "white",
                  borderRadius: 4,
                  padding: "3px 10px",
                  fontSize: 11,
                  color: MUTED_LIGHT,
                  fontFamily: "monospace",
                  marginLeft: 8,
                }}
              >
                app.rent-flow.net/relances
              </span>
            </div>

            {/* Body */}
            <div
              style={{
                padding: 14,
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 9,
              }}
            >
              {/* Terminal */}
              <div
                style={{
                  background: BG_SOFT,
                  border: `0.5px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: 14,
                  fontFamily: "monospace",
                  fontSize: 11,
                  lineHeight: 1.9,
                }}
              >
                {lines.slice(0, shown).map((l, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <span style={{ color: MUTED_LIGHT }}>[{l.ts}]</span>{" "}
                    <span style={{ color: l.tagColor, fontWeight: 600 }}>{l.tag}</span>{" "}
                    <span style={{ color: "#374151", fontWeight: l.bold ? 500 : 400 }}>
                      {l.msg}
                    </span>
                  </motion.div>
                ))}
                {shown === 0 && (
                  <div style={{ color: MUTED_LIGHT }}>En attente du déclenchement...</div>
                )}
              </div>

              {/* Mini stats */}
              <div
                className="grid grid-cols-2 md:grid-cols-4"
                style={{ gap: 9 }}
              >
                {miniStats.map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: BG_SOFT,
                      border: `0.5px solid ${BORDER}`,
                      borderRadius: 8,
                      padding: 13,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 500, color: s.color }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 11, color: MUTED_LIGHT, marginTop: 3 }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   8. ROADMAP
   ============================================================ */
type RoadmapBadge = "Disponible" | "En cours" | "Bientôt" | "Vote ouvert";
const badgeStyles: Record<RoadmapBadge, { bg: string; color: string }> = {
  Disponible: { bg: "#DCFCE7", color: "#166534" },
  "En cours": { bg: "#EFF6FF", color: "#1E40AF" },
  Bientôt: { bg: "#FEF3C7", color: "#92400E" },
  "Vote ouvert": { bg: "#F5F3FF", color: "#5B21B6" },
};

function RoadmapBadgePill({ kind }: { kind: RoadmapBadge }) {
  const s = badgeStyles[kind];
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 10,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 8,
        display: "inline-flex",
      }}
    >
      {kind}
    </span>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div
      style={{
        background: "#E5E7EB",
        height: 3,
        borderRadius: 2,
        overflow: "hidden",
        margin: "10px 0 6px",
      }}
    >
      <div style={{ width: `${value}%`, height: "100%", background: color }} />
    </div>
  );
}

function RoadmapSection() {
  const [betaJoined, setBetaJoined] = useState(false);
  const [votes, setVotes] = useState({ mobile: 42, portail: 28 });
  const [voted, setVoted] = useState({ mobile: false, portail: false });

  const handleVote = (id: "mobile" | "portail") => {
    if (voted[id]) return;
    setVotes((v) => ({ ...v, [id]: v[id] + 1 }));
    setVoted((v) => ({ ...v, [id]: true }));
    toast.success("Vote enregistré ✓");
  };

  const handleBeta = () => {
    if (betaJoined) return;
    setBetaJoined(true);
    toast.success("Vous rejoignez la bêta WhatsApp ✓");
  };

  const Card = ({ children }: { children: ReactNode }) => (
    <div
      style={{
        background: "white",
        border: `0.5px solid ${BORDER}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      {children}
    </div>
  );

  const cardTitle = (t: string) => (
    <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", margin: "8px 0 4px" }}>{t}</div>
  );
  const cardDesc = (t: string) => (
    <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.55 }}>{t}</p>
  );
  const cardFooter = (t: string) => (
    <div style={{ fontSize: 11, color: MUTED_LIGHT, marginTop: 10 }}>{t}</div>
  );

  const smallBtn = (label: string, onClick: () => void, active = false) => (
    <button
      onClick={onClick}
      disabled={active}
      style={{
        marginLeft: 8,
        border: `0.5px solid ${BORDER}`,
        background: active ? "#DCFCE7" : "white",
        color: active ? "#166534" : "#111827",
        borderRadius: 6,
        padding: "3px 10px",
        fontSize: 11,
        cursor: active ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <section
      id="section-roadmap"
      style={{
        background: BG_SOFT,
        borderTop: `0.5px solid ${BORDER}`,
        borderBottom: `0.5px solid ${BORDER}`,
        padding: "44px 24px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between"
            style={{ gap: 10, marginBottom: 22 }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: GREEN_DARK,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                Roadmap publique
              </div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  margin: "6px 0 0",
                  color: "#0F172A",
                }}
              >
                Construit avec vous, pour vous
              </h2>
            </div>
            <a
              href="#section-roadmap"
              style={{
                color: GREEN_DARK,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Explorer la roadmap →
            </a>
          </div>
        </Reveal>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          style={{ gap: 10 }}
        >
          <Reveal delay={0}>
            <Card>
              <RoadmapBadgePill kind="Disponible" />
              {cardTitle("Relances SMS et email auto")}
              {cardDesc("Séquences J-3, J+1, J+7, J+15 configurables. Déclenchement automatique.")}
              {cardFooter("Inclus dans tous les plans")}
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card>
              <RoadmapBadgePill kind="Disponible" />
              {cardTitle("Dashboard temps réel")}
              {cardDesc("CA, taux d'encaissement, impayés en un coup d'œil.")}
              {cardFooter("Inclus dans tous les plans")}
            </Card>
          </Reveal>

          <Reveal delay={0.16}>
            <Card>
              <RoadmapBadgePill kind="En cours" />
              {cardTitle("Relances WhatsApp")}
              {cardDesc("Canal le plus réactif en Côte d'Ivoire. Actuellement en bêta.")}
              <ProgressBar value={75} color={GREEN} />
              <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: MUTED_LIGHT }}>
                  75% · Sortie Q2 2026
                </span>
                {smallBtn(betaJoined ? "Bêta ✓" : "Rejoindre la bêta", handleBeta, betaJoined)}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.24}>
            <Card>
              <RoadmapBadgePill kind="Bientôt" />
              {cardTitle("Module ventes")}
              {cardDesc("Listez vos biens à vendre et suivez vos transactions.")}
              <ProgressBar value={50} color="#F59E0B" />
              <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: MUTED_LIGHT }}>
                  50% · Sortie Q3 2026
                </span>
                {smallBtn("Voter", () => toast.success("Vote enregistré ✓"))}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.32}>
            <Card>
              <RoadmapBadgePill kind="Vote ouvert" />
              {cardTitle("Application mobile")}
              {cardDesc("Gérez votre portefeuille depuis votre téléphone iOS et Android.")}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 12,
                }}
              >
                <span style={{ fontSize: 12, color: MUTED }}>
                  <span style={{ fontWeight: 500, color: "#0F172A" }}>{votes.mobile}</span> votes
                </span>
                {smallBtn(
                  voted.mobile ? "Voté ✓" : "+ Voter",
                  () => handleVote("mobile"),
                  voted.mobile,
                )}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.4}>
            <Card>
              <RoadmapBadgePill kind="Vote ouvert" />
              {cardTitle("Portail locataire")}
              {cardDesc("Espace dédié : quittances et historique de paiement.")}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 12,
                }}
              >
                <span style={{ fontSize: 12, color: MUTED }}>
                  <span style={{ fontWeight: 500, color: "#0F172A" }}>{votes.portail}</span> votes
                </span>
                {smallBtn(
                  voted.portail ? "Voté ✓" : "+ Voter",
                  () => handleVote("portail"),
                  voted.portail,
                )}
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   9. PIONNIERS
   ============================================================ */
function PionniersSection() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const submit = () => {
    setOpen(false);
    setForm({ name: "", email: "", phone: "" });
    toast.success("Votre place est réservée ! Nous vous contactons sous 24h. ✓");
  };

  const avatars = [
    { i: "KA", bg: "#DCFCE7", color: "#166534" },
    { i: "TS", bg: "#EFF6FF", color: "#1E40AF" },
    { i: "BF", bg: "#FEF3C7", color: "#92400E" },
    { i: "DN", bg: "#F5F3FF", color: "#5B21B6" },
    { i: "MK", bg: "#FEE2E2", color: "#991B1B" },
  ];

  const proPerks = [
    "Biens et locataires illimités",
    "SMS et emails automatiques",
    "Accès bêta fonctionnalités",
    "-50% garanti à vie",
  ];
  const starterPerks = [
    "Tableau de bord complet",
    "10 emails par mois inclus",
    "Gratuit pour toujours",
  ];

  return (
    <section
      id="section-pionniers"
      style={{ background: NAVY, padding: "48px 24px" }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Reveal>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#93C5FD",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Offre de lancement
          </div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: "white",
              margin: "8px 0 6px",
              lineHeight: 1.25,
            }}
          >
            Rejoignez les pionniers de la gestion locative digitale
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 20 }}>
            Accès anticipé · Tarif réduit à vie · 3 mois offerts
          </p>

          <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
            <div style={{ display: "flex" }}>
              {avatars.map((a, idx) => (
                <div
                  key={a.i}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: a.bg,
                    color: a.color,
                    fontSize: 11,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `2px solid ${NAVY}`,
                    marginLeft: idx === 0 ? 0 : -8,
                  }}
                >
                  {a.i}
                </div>
              ))}
            </div>
            <div
              style={{
                marginLeft: 12,
                fontSize: 13,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              <span style={{ color: "white", fontWeight: 500 }}>+72 agences</span>{" "}
              déjà inscrites
            </div>
          </div>
        </Reveal>

        <div
          className="grid grid-cols-1 md:grid-cols-2"
          style={{ gap: 10, marginBottom: 12 }}
        >
          <Reveal>
            <div
              style={{
                background: "rgba(34,197,94,0.10)",
                border: "0.5px solid rgba(34,197,94,0.30)",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  color: "#86EFAC",
                  fontSize: 10,
                  fontWeight: 500,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                Populaire · Recommandé
              </div>
              <div style={{ color: "white", fontSize: 14, fontWeight: 500 }}>
                Plan Pro · Early adopter
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 12,
                  margin: "4px 0 12px",
                }}
              >
                3 mois offerts, puis 7 500 FCFA/mois à vie (prix normal : 15 000)
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {proPerks.map((p) => (
                  <li
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "rgba(255,255,255,0.65)",
                      fontSize: 12,
                      padding: "3px 0",
                    }}
                  >
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: GREEN,
                      }}
                    />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "0.5px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 10,
                  fontWeight: 500,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                Gratuit · Pour démarrer
              </div>
              <div style={{ color: "white", fontSize: 14, fontWeight: 500 }}>
                Plan Starter
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 12,
                  margin: "4px 0 12px",
                }}
              >
                Jusqu'à 3 biens, 5 locataires.
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {starterPerks.map((p) => (
                  <li
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "rgba(255,255,255,0.65)",
                      fontSize: 12,
                      padding: "3px 0",
                    }}
                  >
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: GREEN,
                      }}
                    />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <button
          onClick={() => setOpen(true)}
          style={{
            background: GREEN,
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            fontWeight: 500,
            width: "100%",
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          Réserver ma place Early Adopter
        </button>
        <p
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Rejoindre n'engage à rien · Sans carte bancaire · Annulez à tout moment
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réserver ma place</DialogTitle>
            <DialogDescription>
              Nous vous contactons sous 24h pour activer votre offre Early
              Adopter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Kouassi Amani"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              type="email"
              placeholder="votre@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              placeholder="+225 07 00 00 00 00"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <button
              onClick={submit}
              style={{
                background: GREEN,
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 500,
                width: "100%",
                cursor: "pointer",
              }}
            >
              Confirmer ma réservation
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: MUTED,
                fontSize: 12,
                cursor: "pointer",
                padding: 4,
              }}
            >
              Annuler
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ============================================================
   10. TARIFS
   ============================================================ */
function PricingSection() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);

  const proPrice = annual ? "6 000" : "7 500";

  const Pill = ({ label, active, onClick }: { label: ReactNode; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        background: active ? GREEN : "transparent",
        color: active ? "white" : MUTED,
        border: "none",
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 13,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {label}
    </button>
  );

  const sep = (
    <div
      style={{
        height: 1,
        background: BORDER,
        margin: "12px 0",
        opacity: 0.7,
      }}
    />
  );

  const PerkRow = ({ ok, children }: { ok: boolean; children: ReactNode }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        padding: "4px 0",
        color: ok ? "#374151" : MUTED_LIGHT,
        opacity: ok ? 1 : 0.55,
      }}
    >
      {ok ? (
        <Check size={14} color={GREEN} />
      ) : (
        <X size={14} color={MUTED_LIGHT} />
      )}
      {children}
    </div>
  );

  return (
    <section
      id="section-tarifs"
      style={{
        background: BG_SOFT,
        borderTop: `0.5px solid ${BORDER}`,
        borderBottom: `0.5px solid ${BORDER}`,
        padding: "44px 24px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <h2 style={{ fontSize: 22, fontWeight: 500, color: "#0F172A", margin: "0 0 12px" }}>
              Des tarifs simples, sans surprise
            </h2>
            <div
              style={{
                display: "inline-flex",
                background: "white",
                border: `0.5px solid ${BORDER}`,
                borderRadius: 999,
                padding: 3,
              }}
            >
              <Pill label="Mensuel" active={!annual} onClick={() => setAnnual(false)} />
              <Pill
                label={
                  <>
                    Annuel{" "}
                    <span
                      style={{
                        background: annual ? "rgba(255,255,255,0.2)" : "#DCFCE7",
                        color: annual ? "white" : "#166534",
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontWeight: 500,
                      }}
                    >
                      -20%
                    </span>
                  </>
                }
                active={annual}
                onClick={() => setAnnual(true)}
              />
            </div>
          </div>
        </Reveal>

        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ gap: 10 }}
        >
          {/* Starter */}
          <Reveal>
            <div
              style={{
                border: `0.5px solid ${BORDER}`,
                borderRadius: 12,
                padding: 18,
                background: "white",
              }}
            >
              <div style={{ fontSize: 10, color: MUTED_LIGHT, textTransform: "uppercase", letterSpacing: ".05em" }}>
                Starter
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 500 }}>0</span>{" "}
                <span style={{ fontSize: 12, color: MUTED }}>FCFA · Gratuit pour toujours</span>
              </div>
              {sep}
              <PerkRow ok>3 biens max</PerkRow>
              <PerkRow ok>10 emails par mois</PerkRow>
              <PerkRow ok={false}>SMS automatiques</PerkRow>
              <PerkRow ok={false}>Rapports avancés</PerkRow>
              <button
                onClick={() => navigate("/auth")}
                style={{
                  marginTop: 14,
                  width: "100%",
                  border: `0.5px solid ${BORDER}`,
                  background: "white",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Commencer
              </button>
            </div>
          </Reveal>

          {/* Pro */}
          <Reveal delay={0.08}>
            <div
              className="md:order-none order-first"
              style={{
                border: `2px solid ${GREEN}`,
                borderRadius: 12,
                padding: 18,
                background: "white",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 10, color: MUTED_LIGHT, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  Pro
                </div>
                <span
                  style={{
                    background: "#DCFCE7",
                    color: "#166534",
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontWeight: 500,
                  }}
                >
                  -50% lancement
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                <motion.span
                  key={proPrice}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ fontSize: 24, fontWeight: 500, color: GREEN }}
                >
                  {proPrice}
                </motion.span>
                <span
                  style={{
                    textDecoration: "line-through",
                    opacity: 0.35,
                    fontSize: 13,
                  }}
                >
                  15 000
                </span>
                <span style={{ fontSize: 12, color: MUTED }}>FCFA / mois</span>
              </div>
              {annual && (
                <div style={{ fontSize: 11, color: GREEN_DARK, marginTop: 4 }}>
                  Économisez 18 000 FCFA / an
                </div>
              )}
              {sep}
              <PerkRow ok>Biens et locataires illimités</PerkRow>
              <PerkRow ok>SMS et email automatiques</PerkRow>
              <PerkRow ok>Relances WhatsApp (bêta)</PerkRow>
              <PerkRow ok>Rapports et exports PDF/Excel</PerkRow>
              <PerkRow ok>Module ventes (Q3 2026)</PerkRow>
              <button
                onClick={() => navigate("/auth")}
                style={{
                  marginTop: 14,
                  width: "100%",
                  background: GREEN,
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Essai 14j gratuit
              </button>
              <div
                style={{
                  fontSize: 11,
                  color: MUTED_LIGHT,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Sans CB requis · Annulez à tout moment
              </div>
            </div>
          </Reveal>

          {/* Business */}
          <Reveal delay={0.16}>
            <div
              style={{
                border: `0.5px solid ${BORDER}`,
                borderRadius: 12,
                padding: 18,
                background: "white",
              }}
            >
              <div style={{ fontSize: 10, color: MUTED_LIGHT, textTransform: "uppercase", letterSpacing: ".05em" }}>
                Business
              </div>
              <div style={{ marginTop: 8, fontSize: 18, fontWeight: 500 }}>Sur devis</div>
              <div style={{ fontSize: 11, color: MUTED_LIGHT, marginTop: 2 }}>
                Multi-agences et marque blanche
              </div>
              {sep}
              <PerkRow ok>Tout le plan Pro</PerkRow>
              <PerkRow ok>Multi-utilisateurs et rôles</PerkRow>
              <PerkRow ok>API et webhooks</PerkRow>
              <PerkRow ok>Onboarding personnalisé</PerkRow>
              <PerkRow ok>SLA garanti 99,9%</PerkRow>
              <a
                href="mailto:contact@rent-flow.net"
                style={{
                  marginTop: 14,
                  display: "block",
                  width: "100%",
                  border: `0.5px solid ${BORDER}`,
                  background: "white",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 13,
                  textAlign: "center",
                  textDecoration: "none",
                  color: "#111827",
                }}
              >
                Nous contacter
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   11. CTA + FOOTER
   ============================================================ */
function FinalCta() {
  const navigate = useNavigate();
  return (
    <section
      style={{
        background: "white",
        padding: "52px 24px",
        textAlign: "center",
        borderTop: `0.5px solid ${BORDER}`,
      }}
    >
      <Reveal>
        <h2 style={{ fontSize: 26, fontWeight: 500, margin: "0 0 12px", color: "#0F172A" }}>
          Prêt à encaisser vos loyers sans effort ?
        </h2>
        <p style={{ fontSize: 14, color: MUTED, marginBottom: 22 }}>
          Rejoignez les 77 agences qui ont digitalisé leur gestion locative avec
          Rentflow.
        </p>
        <div className="flex flex-col sm:flex-row" style={{ gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => navigate("/auth")}
            style={{
              background: GREEN,
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 26px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Démarrer gratuitement
          </button>
          <button
            onClick={() => scrollToId("section-terminal")}
            style={{
              background: "transparent",
              border: `0.5px solid #D1D5DB`,
              borderRadius: 8,
              padding: "12px 22px",
              fontSize: 14,
              cursor: "pointer",
              color: "#111827",
            }}
          >
            Voir la démo
          </button>
        </div>
        <p style={{ fontSize: 11, color: MUTED_LIGHT, marginTop: 12 }}>
          Satisfait ou remboursé 30 jours · Sans engagement · Annulez à tout
          moment
        </p>
      </Reveal>
    </section>
  );
}

function Footer() {
  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: "Produit",
      links: [
        { label: "Fonctionnalités", href: "#section-terminal" },
        { label: "Tarifs", href: "#section-tarifs" },
        { label: "Roadmap", href: "#section-roadmap" },
        { label: "Changelog", href: "#section-roadmap" },
      ],
    },
    {
      title: "Ressources",
      links: [
        { label: "Support", href: "/contact" },
        { label: "Statut", href: "#" },
        { label: "Documentation", href: "#" },
      ],
    },
    {
      title: "Légal",
      links: [
        { label: "CGU", href: "/terms" },
        { label: "Confidentialité", href: "/privacy" },
        { label: "Mentions légales", href: "/legal" },
      ],
    },
  ];

  return (
    <footer
      id="section-footer"
      style={{ background: "white", borderTop: `0.5px solid ${BORDER}`, padding: "28px 24px" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          className="flex flex-col md:flex-row md:justify-between"
          style={{ gap: 24, flexWrap: "wrap" }}
        >
          <div style={{ maxWidth: 240 }}>
            <Logo />
            <p style={{ fontSize: 12, color: MUTED_LIGHT, margin: "10px 0 6px", lineHeight: 1.55 }}>
              Logiciel de gestion locative automatisée pour les agences
              immobilières en Afrique.
            </p>
            <div style={{ fontSize: 12, color: MUTED_LIGHT }}>Abidjan, Côte d'Ivoire</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: 28 }}>
            {cols.map((c) => (
              <div key={c.title}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: "#111827" }}>
                  {c.title}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        style={{ fontSize: 12, color: MUTED_LIGHT, textDecoration: "none" }}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            borderTop: `0.5px solid ${BORDER}`,
            paddingTop: 14,
            marginTop: 22,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            fontSize: 11,
            color: MUTED_LIGHT,
          }}
        >
          <span>© 2026 Rentflow · Tous droits réservés</span>
          <span>Abidjan · Côte d'Ivoire</span>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function LandingV2() {
  const [seats, setSeats] = useState(23);

  useEffect(() => {
    if (seats <= 0) return;
    const id = setInterval(() => {
      setSeats((s) => (s > 0 ? s - 1 : 0));
    }, 12000);
    return () => clearInterval(id);
  }, [seats]);

  return (
    <div style={{ background: "white", color: "#0F172A", fontFamily: "Inter, sans-serif" }}>
      <StatusBar seats={seats} />
      <Navbar />
      <Hero />
      <PaymentStrip />
      <StatsBand />
      <ProblemSection />
      <TerminalSection />
      <RoadmapSection />
      <PionniersSection />
      <PricingSection />
      <FinalCta />
      <Footer />
    </div>
  );
}
