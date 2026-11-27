"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  ScanEye,
  FileCheck2,
  Car,
  ShieldCheck,
  Zap,
  Check,
  ArrowRight,
  MessageCircle,
  Upload,
  FileText,
  Users,
  Activity,
  Crown,
  ChevronRight,
} from "lucide-react";
import { GlassIconReveal } from "@/components/ui/liquid-glass-logo-reveal";

const WHATSAPP_NUMBER = "923316367976";

function whatsappUrl(plan?: string) {
  const text = plan
    ? `Hello! I want to order the Rihal Next (Kashaf Panel) - ${plan} plan.`
    : "Hello! I am interested in ordering the Rihal Next (Kashaf Panel).";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const RING_SIZES = [360, 480, 620, 780, 960] as const;

type ShowcaseTab = "vision" | "dispatch" | "kashaf";

const PRICING_PLANS = [
  {
    name: "Monthly",
    price: "100",
    currency: "SAR",
    period: "/ month",
    badge: null,
    description: "Flexible month-to-month access for growing transport teams.",
    features: [
      "Full Kashaf Panel & Dashboard",
      "AI Vision Visa & Passport Scanner",
      "Unlimited Rides & Kashaf PDFs",
      "Driver, Vehicle & Company Management",
      "WhatsApp & Priority Support",
    ],
    highlighted: false,
    cta: "Order Monthly",
  },
  {
    name: "Yearly",
    price: "1,000",
    currency: "SAR",
    period: "/ year",
    badge: "Most Popular • Save 200 SAR",
    description: "Best value for active Saudi transport & Umrah fleets.",
    features: [
      "Everything in Monthly Plan",
      "2 Months Free (Save 200 SAR)",
      "Custom PDF Kashaf Templates",
      "Multi-User Roles (Admin / Manager / Operator)",
      "Dedicated Onboarding & Setup",
    ],
    highlighted: true,
    cta: "Order Yearly",
  },
  {
    name: "Lifetime",
    price: "3,000",
    currency: "SAR",
    period: "one-time",
    badge: "Full Ownership",
    description: "Pay once and own your Kashaf Panel license forever.",
    features: [
      "Everything in Yearly Plan",
      "Zero Recurring Monthly Fees",
      "Lifetime Updates & AI Vision Access",
      "Custom Company Branding Included",
      "VIP Direct Technical Support",
    ],
    highlighted: false,
    cta: "Order Lifetime",
  },
] as const;

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("vision");
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame: number;
    let px = 0,
      py = 0,
      tx = 0,
      ty = 0;

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const tick = () => {
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;
      el.style.setProperty("--tx", `${px * -12}px`);
      el.style.setProperty("--ty", `${py * -8}px`);
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove);
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden text-white selection:bg-cyan-400/30 selection:text-cyan-100"
      style={{ backgroundColor: "#07080f" }}
    >
      {/* ── Ambient Portal Background ── */}
      <div
        ref={heroRef}
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ "--tx": "0px", "--ty": "0px" } as React.CSSProperties}
      >
        {/* Top radial glow */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
          style={{
            width: 900,
            height: 600,
            background:
              "radial-gradient(circle, rgba(2,238,255,0.12) 0%, rgba(79,70,229,0.10) 45%, transparent 75%)",
            transform: "translate(var(--tx), var(--ty))",
          }}
        />

        {/* Animated SVG portal rings */}
        <svg
          viewBox="0 0 2000 2000"
          aria-hidden="true"
          className="absolute left-1/2 top-36 -translate-x-1/2 opacity-40"
          style={{
            width: "min(130vw, 1300px)",
            height: "min(130vw, 1300px)",
            transform: "translate(var(--tx), var(--ty))",
          }}
        >
          <defs>
            <linearGradient id="home-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop stopColor="#02EEFF" />
              <stop offset="0.55" stopColor="#7FA0FF" />
              <stop offset="1" stopColor="#4B64BF" />
            </linearGradient>
          </defs>
          {RING_SIZES.map((radius, idx) => {
            const len = 10 + (idx % 3) * 6;
            const rev = idx % 2 === 1;
            return (
              <g key={radius}>
                <circle
                  cx="1000"
                  cy="1000"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.035)"
                  strokeWidth="1"
                />
                <circle
                  cx="1000"
                  cy="1000"
                  r={radius}
                  fill="none"
                  stroke="url(#home-arc-grad)"
                  strokeWidth="1.5"
                  pathLength="100"
                  strokeDasharray={`${len} ${100 - len}`}
                  strokeLinecap="round"
                  style={{
                    transformOrigin: "1000px 1000px",
                    animation: `${rev ? "login-orbit-reverse" : "login-orbit"} ${42 + idx * 14}s linear ${-idx * 6}s infinite`,
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Sticky Glass Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07080f]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/home" className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-xl border border-cyan-400/25 shadow-[0_0_20px_rgba(2,238,255,0.18)]">
              <GlassIconReveal
                logo="/logo.png"
                label="Rihal Next"
                look="dark"
                background="#0c101b"
                plateColor="#0c101b"
                logoColor="#ffffff"
                iconPlate={false}
                keepPlate={false}
                tileSize={36}
                logoScale={0.78}
                finalScale={0.85}
                hold={3}
                className="h-9 w-9 rounded-xl"
              />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white">
                Rihal Next
              </span>
              <span className="ml-2 hidden rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 sm:inline-block">
                Kashaf Panel
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-white/70 md:flex">
            <a href="#showcase" className="transition hover:text-white">
              Panel Showcase
            </a>
            <a href="#features" className="transition hover:text-white">
              AI Vision & Features
            </a>
            <a href="#pricing" className="transition hover:text-white">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/85 transition hover:border-white/30 hover:bg-white/10 sm:text-sm"
            >
              Sign in
            </Link>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-[#07080f] shadow-[0_0_24px_rgba(2,238,255,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(2,238,255,0.5)] sm:text-sm"
              style={{
                background:
                  "linear-gradient(135deg, #02EEFF 0%, #7FA0FF 60%, #4B64BF 100%)",
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Order Now
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        {/* ── Hero Section ── */}
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-medium text-cyan-200 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            Powered by AI Vision Document Extraction
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.08]">
            The Next-Gen{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #02EEFF 0%, #93C5FD 50%, #A78BFA 100%)",
              }}
            >
              Kashaf Panel
            </span>{" "}
            for Smart Fleets
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
            Upload visa PDFs or passport photos and let{" "}
            <span className="font-semibold text-white">AI Vision</span>{" "}
            automatically fetch passengers, build rides, and generate ready-to-print
            Kashaf documents in seconds.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-[#07080f] shadow-[0_8px_32px_rgba(2,238,255,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(2,238,255,0.5)]"
              style={{
                background:
                  "linear-gradient(135deg, #02EEFF 0%, #7FA0FF 55%, #4B64BF 100%)",
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Order via WhatsApp
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>

            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-cyan-400/40 hover:bg-white/10"
            >
              View Pricing
              <ChevronRight className="h-4 w-4 text-white/60" />
            </a>
          </div>
        </section>

        {/* ── Interactive Panel Showcase ── */}
        <section id="showcase" className="mt-14">
          <div
            className="overflow-hidden rounded-3xl border border-white/12 p-4 sm:p-6"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(24px)",
              boxShadow:
                "0 0 0 1px rgba(2,238,255,0.06), 0 32px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Window Topbar + Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-xs font-medium text-white/45">
                  rihalnext.com/dashboard
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/30 p-1">
                {[
                  { id: "vision" as const, label: "AI Vision Scan", icon: ScanEye },
                  { id: "dispatch" as const, label: "Live Dispatch", icon: Activity },
                  { id: "kashaf" as const, label: "Kashaf PDF", icon: FileCheck2 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 text-cyan-200 ring-1 ring-cyan-400/40"
                          : "text-white/55 hover:text-white"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Showcase Content */}
            <div className="mt-5 grid gap-5 lg:grid-cols-12">
              {activeTab === "vision" && (
                <>
                  <div className="flex flex-col justify-between rounded-2xl border border-dashed border-cyan-400/35 bg-cyan-400/[0.04] p-5 lg:col-span-5">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-400/15 px-2.5 py-1 text-xs font-semibold text-cyan-300">
                        <Upload className="h-3.5 w-3.5" />
                        Auto-Extract Visa / Passport
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-white">
                        Drop Any Visa PDF or Photo
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                        Supports Arabic & English documents, multi-page PDFs, and mobile
                        photos. AI Vision reads and maps every field automatically.
                      </p>
                    </div>
                    <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-white/85">
                          <FileText className="h-4 w-4 text-cyan-300" />
                          umrah_visa_group_14.pdf
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          99.4% Match
                        </span>
                      </div>
                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/35 p-5 lg:col-span-7">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                        Fetched Passengers (Auto-Populated)
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300">
                        <Zap className="h-3.5 w-3.5" /> 1.2s Extraction
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        {
                          name: "Muhammad Ahmed Khan",
                          passport: "PK4829103",
                          nat: "Pakistan",
                          visa: "6092817452",
                        },
                        {
                          name: "Fatima Al-Mansoor",
                          passport: "EG9102841",
                          nat: "Egypt",
                          visa: "6092817499",
                        },
                        {
                          name: "Tariq Mahmood",
                          passport: "PK7721049",
                          nat: "Pakistan",
                          visa: "6092817510",
                        },
                      ].map((pax) => (
                        <div
                          key={pax.passport}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-white">{pax.name}</p>
                            <p className="text-white/45">
                              Passport: {pax.passport} • {pax.nat}
                            </p>
                          </div>
                          <span className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] text-emerald-300">
                            Visa #{pax.visa}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "dispatch" && (
                <div className="rounded-2xl border border-white/10 bg-black/35 p-5 lg:col-span-12">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                      <span className="text-sm font-semibold text-white">
                        Live Rides & Fleet Tracking
                      </span>
                    </div>
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60">
                      Auto-sync active
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        ride: "#1728",
                        driver: "Muhammad Farhan",
                        status: "In Progress",
                        route: "Jeddah Airport → Makkah Hotel",
                        pax: "4 Pax",
                        color: "text-cyan-300 bg-cyan-400/15 border-cyan-400/30",
                      },
                      {
                        ride: "#1729",
                        driver: "Ali Raza",
                        status: "Completed",
                        route: "Makkah → Madinah",
                        pax: "7 Pax",
                        color: "text-emerald-300 bg-emerald-400/15 border-emerald-400/30",
                      },
                      {
                        ride: "#1730",
                        driver: "Usman Tariq",
                        status: "Ready",
                        route: "Madinah Hotel → Ziyarat",
                        pax: "3 Pax",
                        color: "text-indigo-300 bg-indigo-400/15 border-indigo-400/30",
                      },
                    ].map((item) => (
                      <div
                        key={item.ride}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-white">
                            Ride {item.ride}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${item.color}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-medium text-white/80">
                          {item.driver}
                        </p>
                        <p className="mt-1 text-xs text-white/50">{item.route}</p>
                        <p className="mt-3 text-[11px] font-semibold text-cyan-300">
                          {item.pax} • Kashaf 100% Ready
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "kashaf" && (
                <div className="grid gap-4 lg:col-span-12 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
                    <h3 className="text-base font-bold text-white">
                      Instant Official Kashaf PDFs
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-white/60">
                      Generate clean, compliant Saudi transport Kashaf PDFs with custom
                      company headers, driver details, plate numbers, and passenger
                      manifests in one click.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                      {[
                        "Custom Company Templates",
                        "Arabic & English Support",
                        "1-Click Direct Download",
                        "Batch Export & Reports",
                      ].map((feat) => (
                        <div
                          key={feat}
                          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white/80"
                        >
                          <Check className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                          {feat}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/10 to-indigo-500/10 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-cyan-200">
                        KASHAF MANIFEST #1728
                      </span>
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-white/80">
                        PDF READY
                      </span>
                    </div>
                    <div className="my-4 space-y-2 text-xs text-white/75">
                      <div className="flex justify-between border-b border-white/10 pb-1.5">
                        <span className="text-white/45">Company</span>
                        <span>Al-Rihal Transport Co.</span>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-1.5">
                        <span className="text-white/45">Driver & Vehicle</span>
                        <span>Hyundai H1 • SXA 7263</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/45">Passengers</span>
                        <span>4 Verified (AI Vision)</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/10 px-3 py-2 text-center text-xs font-semibold text-white">
                      Generated in 0.4s — Zero Manual Typing
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Features Bento Grid ── */}
        <section id="features" className="mt-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ScanEye,
                title: "AI Vision Extraction",
                desc: "Upload visa PDFs or passport images to auto-fetch passenger names, passport numbers, and nationalities.",
                accent: "text-cyan-300 bg-cyan-400/15 border-cyan-400/25",
              },
              {
                icon: FileCheck2,
                title: "1-Click Kashaf PDF",
                desc: "Generate formatted Kashaf documents with your company logo, stamp, and custom template layout.",
                accent: "text-indigo-300 bg-indigo-400/15 border-indigo-400/25",
              },
              {
                icon: Car,
                title: "Fleet & Ride Control",
                desc: "Manage drivers, vehicles, routes, and live ride statuses with instant sorting and search.",
                accent: "text-emerald-300 bg-emerald-400/15 border-emerald-400/25",
              },
              {
                icon: ShieldCheck,
                title: "Roles & Multi-Company",
                desc: "Control Admin, Manager, and Operator permissions across multiple transport companies.",
                accent: "text-violet-300 bg-violet-400/15 border-violet-400/25",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.05]"
                >
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${f.accent}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Pricing Section ── */}
        <section id="pricing" className="mt-16">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-cyan-200">
              <Crown className="h-3.5 w-3.5 text-cyan-300" />
              Simple, Transparent Pricing
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Choose Your Kashaf Panel Plan
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
              Instant activation via WhatsApp. Full AI Vision access included in every plan.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all hover:-translate-y-1 ${
                  plan.highlighted
                    ? "border-cyan-400/50 bg-gradient-to-b from-cyan-400/[0.11] via-indigo-500/[0.07] to-white/[0.02] shadow-[0_0_50px_rgba(2,238,255,0.14)]"
                    : "border-white/12 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    {plan.badge && (
                      <span className="rounded-full border border-cyan-400/35 bg-cyan-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-200">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold tracking-tight text-white">
                      {plan.price}
                    </span>
                    <span className="text-sm font-bold text-cyan-300">
                      {plan.currency}
                    </span>
                    <span className="text-xs text-white/50">{plan.period}</span>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-white/60">
                    {plan.description}
                  </p>

                  <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-xs text-white/80">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={whatsappUrl(`${plan.name} (${plan.price} ${plan.currency})`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    plan.highlighted
                      ? "text-[#07080f] shadow-[0_6px_28px_rgba(2,238,255,0.3)] hover:shadow-[0_8px_36px_rgba(2,238,255,0.5)]"
                      : "border border-white/15 bg-white/8 text-white hover:border-cyan-400/40 hover:bg-white/12"
                  }`}
                  style={
                    plan.highlighted
                      ? {
                          background:
                            "linear-gradient(135deg, #02EEFF 0%, #7FA0FF 60%, #4B64BF 100%)",
                        }
                      : undefined
                  }
                >
                  <MessageCircle className="h-4 w-4" />
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── Compact Footer ── */}
        <footer className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/45 sm:flex-row">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-300" />
            <span>
              <strong className="text-white/80">Rihal Next</strong> — Kashaf & Fleet
              Management Panel
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 transition hover:text-cyan-200"
            >
              WhatsApp: +92 331 6367976
            </a>
            <Link href="/login" className="transition hover:text-white">
              Client Sign In
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
