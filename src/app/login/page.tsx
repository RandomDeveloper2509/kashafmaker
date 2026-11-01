"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Car } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@kashafmake.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-indigo-600 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Car className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Kashafmaker</h1>
            <p className="text-indigo-200">Transport Management System</p>
          </div>
        </div>
        <h2 className="text-4xl font-bold text-white leading-tight">
          Manage rides, drivers &amp; generate Kashaf documents
        </h2>
        <p className="mt-4 text-lg text-indigo-200">
          Complete transport management with integrated PDF Kashaf generation for Saudi Arabian transport companies.
        </p>
      </div>

      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
              <Car className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Kashafmaker</h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Enter your credentials to access the dashboard</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-xs text-slate-400 text-center">
            Demo: admin@kashafmake.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
