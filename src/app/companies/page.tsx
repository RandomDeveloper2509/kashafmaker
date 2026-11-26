"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardContent, LoadingSpinner } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function CompaniesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    commercialRegistration: "",
    vatNumber: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "Saudi Arabia",
    additionalInfo: "",
    logoPath: "",
  });

  useEffect(() => {
    fetch("/api/company")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setForm({
            name: data.name || "",
            nameAr: data.nameAr || "",
            commercialRegistration: data.commercialRegistration || "",
            vatNumber: data.vatNumber || "",
            phone: data.phone || "",
            email: data.email || "",
            address: data.address || "",
            city: data.city || "",
            country: data.country || "Saudi Arabia",
            additionalInfo: data.additionalInfo || "",
            logoPath: data.logoPath || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append(
        "data",
        JSON.stringify({
          name: form.name,
          nameAr: form.nameAr,
          commercialRegistration: form.commercialRegistration,
          vatNumber: form.vatNumber,
          phone: form.phone,
          email: form.email,
          address: form.address,
          city: form.city,
          country: form.country,
          additionalInfo: form.additionalInfo,
        })
      );
      if (logoFile) fd.append("logo", logoFile);

      const res = await fetch("/api/company", { method: "PUT", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast("Company information saved", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Company Profile"
        description="Company information is reused across rides and Kashaf documents"
      />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="Arabic Company Name"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                dir="rtl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Commercial Registration"
                value={form.commercialRegistration}
                onChange={(e) => setForm({ ...form, commercialRegistration: e.target.value })}
              />
              <Input
                label="VAT Number"
                value={form.vatNumber}
                onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                label="Country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <Textarea
              label="Additional Information"
              value={form.additionalInfo}
              onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Logo</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              {form.logoPath && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/api/company/logo" alt="Company logo" className="mt-2 h-16 object-contain" />
              )}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Company"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
