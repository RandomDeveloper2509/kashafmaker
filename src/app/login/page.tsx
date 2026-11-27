"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { InstallAppButton } from "@/components/pwa/install-button";
import { GlassIconReveal } from "@/components/ui/liquid-glass-logo-reveal";

const RING_SIZES = [300, 372, 452, 542, 644, 758, 884, 1000] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);

  /* ── Parallax pointer tracking ── */
  useEffect(() => {
    const portal = portalRef.current;
    if (!portal) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame: number;
    let px = 0, py = 0, tx = 0, ty = 0;

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const tick = () => {
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;
      portal.style.setProperty("--tx", `${px * -14}px`);
      portal.style.setProperty("--ty", `${py * -10}px`);
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove);
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#080810" }}
    >
      {/* ── SVG gradient defs ── */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient
            id="login-arc-gradient"
            gradientUnits="userSpaceOnUse"
            x1="300" y1="300" x2="1700" y2="1700"
          >
            <stop stopColor="#02EEFF" />
            <stop offset=".55" stopColor="#7FA0FF" />
            <stop offset="1" stopColor="#4B64BF" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Portal / rings layer ── */}
      <div
        ref={portalRef}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={
          {
            "--tx": "0px",
            "--ty": "0px",
          } as React.CSSProperties
        }
      >
        {/* Radial glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: 520,
            height: 520,
            background:
              "radial-gradient(circle, rgba(2,238,255,0.13) 0%, rgba(127,160,255,0.08) 45%, transparent 70%)",
            animation: "login-pulse-glow 6s ease-in-out infinite",
            transform: "translate(var(--tx), var(--ty))",
          }}
        />

        {/* Concentric rings SVG */}
        <svg
          viewBox="0 0 2000 2000"
          aria-hidden="true"
          style={{
            width: "min(100vw, 100vh)",
            height: "min(100vw, 100vh)",
            maxWidth: 900,
            maxHeight: 900,
            transform: "translate(var(--tx), var(--ty))",
            overflow: "visible",
          }}
        >
          {/* Wave pulses */}
          <circle
            cx="1000" cy="1000" r="300"
            fill="none"
            stroke="rgba(2,238,255,0.25)"
            strokeWidth="2"
            style={{
              transformOrigin: "1000px 1000px",
              animation: "login-wave 7s ease-out infinite",
            }}
          />
          <circle
            cx="1000" cy="1000" r="300"
            fill="none"
            stroke="rgba(127,160,255,0.2)"
            strokeWidth="2"
            style={{
              transformOrigin: "1000px 1000px",
              animation: "login-wave 7s ease-out 3.5s infinite",
            }}
          />

          {RING_SIZES.map((radius, index) => {
            const arcLen = 9 + (index % 3) * 5;
            const isReverse = index % 2 === 1;
            return (
              <g key={radius}>
                {/* Base track ring */}
                <circle
                  cx="1000" cy="1000" r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.045)"
                  strokeWidth="1"
                />
                {/* Animated arc */}
                <circle
                  cx="1000" cy="1000" r={radius}
                  fill="none"
                  stroke="url(#login-arc-gradient)"
                  strokeWidth={index < 3 ? "2" : index < 6 ? "1.5" : "1"}
                  pathLength="100"
                  strokeDasharray={`${arcLen} ${100 - arcLen}`}
                  strokeLinecap="round"
                  style={{
                    transformOrigin: "1000px 1000px",
                    animation: `${isReverse ? "login-orbit-reverse" : "login-orbit"} ${38 + index * 12}s linear ${-index * 7.3}s infinite`,
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Glass card ── */}
      <div
        className="relative z-10 w-full max-w-sm px-4"
        style={{
          animation: "login-rise 0.7s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        <div
          className="rounded-2xl border p-8"
          style={{
            background: "rgba(255,255,255,0.045)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            borderColor: "rgba(255,255,255,0.1)",
            boxShadow:
              "0 0 0 1px rgba(2,238,255,0.07), 0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Logo + heading */}
          <div
            className="flex flex-col items-center gap-4 mb-8"
            style={{ animation: "login-rise 0.7s 0.08s cubic-bezier(0.16,1,0.3,1) both", opacity: 0 }}
          >
            <div
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white"
              style={{
                boxShadow: "0 0 0 1px rgba(255,255,255,0.35), 0 8px 28px rgba(2,238,255,0.2)",
              }}
            >
              <GlassIconReveal
                logo="/logo.png"
                label="Rihal Next"
                look="light"
                background="#ffffff"
                plateColor="#ffffff"
                originalColors
                iconPlate={false}
                keepPlate={false}
                tileSize={64}
                logoScale={0.78}
                finalScale={0.85}
                hold={3}
                className="h-16 w-16 rounded-2xl"
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Sign in to Rihal Next
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div
              style={{
                animation: "login-rise 0.7s 0.16s cubic-bezier(0.16,1,0.3,1) both",
                opacity: 0,
              }}
            >
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-opacity-40 outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                } as any}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(2,238,255,0.5)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(2,238,255,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.1)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div
              style={{
                animation: "login-rise 0.7s 0.24s cubic-bezier(0.16,1,0.3,1) both",
                opacity: 0,
              }}
            >
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(2,238,255,0.5)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(2,238,255,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-opacity hover:opacity-80"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p
                className="rounded-xl px-4 py-2.5 text-sm"
                style={{
                  background: "rgba(220,38,38,0.12)",
                  border: "1px solid rgba(220,38,38,0.25)",
                  color: "#fca5a5",
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <div
              style={{
                animation: "login-rise 0.7s 0.32s cubic-bezier(0.16,1,0.3,1) both",
                opacity: 0,
              }}
            >
              <button
                type="submit"
                disabled={loading}
                className="relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-70"
                style={{
                  background: "linear-gradient(135deg, #02EEFF 0%, #7FA0FF 55%, #4B64BF 100%)",
                  color: "#080810",
                  boxShadow: "0 4px 20px rgba(2,238,255,0.25)",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 6px 28px rgba(2,238,255,0.4)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 4px 20px rgba(2,238,255,0.25)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          className="mt-6 flex flex-col items-center gap-3"
          style={{ animation: "login-rise 0.7s 0.42s cubic-bezier(0.16,1,0.3,1) both", opacity: 0 }}
        >
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
            Smarter Journeys. Seamless Operations.
          </p>
          <InstallAppButton variant="minimal" />
        </div>
      </div>
    </div>
  );
}
