"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import {
  PageHeader, Card, CardContent, EmptyState, LoadingSpinner, Modal, ConfirmDialog, Badge,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  Plus, Search, UserCircle, Globe, Trash2, ArrowRight, Edit, ScanSearch, Check,
} from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { VisaImportButton } from "@/components/passengers/visa-import";
import { applyVisaFieldsToPassengerForm } from "@/lib/visa/apply-fields";

interface Passenger {
  id: string;
  fullName: string;
  passportNumber?: string | null;
  nationality?: string | null;
  gender?: string | null;
  visaType?: string | null;
  phone?: string | null;
  iqamaNumber?: string | null;
}

const EMPTY_FORM = {
  fullName: "",
  passportNumber: "",
  nationality: "",
  gender: "",
  visaType: "",
  iqamaNumber: "",
  phone: "",
};

export default function PassengersPage() {
  const { toast } = useToast();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Edit / Add modal state
  const [editId, setEditId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch(`/api/passengers?q=${debouncedSearch}&page=${page}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.passengers)) {
          setPassengers(data.passengers);
          setTotalPages(data.totalPages || 1);
          setTotal(data.total || 0);
        } else {
          setPassengers([]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [debouncedSearch]);
  useEffect(() => { fetchData(); }, [debouncedSearch, page]);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: Passenger) => {
    setEditId(p.id);
    setForm({
      fullName: p.fullName || "",
      passportNumber: p.passportNumber || "",
      nationality: p.nationality || "",
      gender: p.gender || "",
      visaType: p.visaType || "",
      iqamaNumber: p.iqamaNumber || "",
      phone: p.phone || "",
    });
    setModalOpen(true);
  };

  const handleImportMultiple = async (
    items: import("@/lib/visa/apply-fields").PassengerVisaFields[]
  ) => {
    try {
      const promises = items.map(async (data, idx) => {
        const res = await fetch("/api/passengers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName:
              data.fullName.trim() ||
              `Passenger ${idx + 1} (${data.passportNumber.trim() || "Visa"})`,
            passportNumber: data.passportNumber.trim() || undefined,
            nationality: data.nationality.trim() || undefined,
            visaType: data.visaType.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err.error || `Failed to create ${data.fullName || `Passenger ${idx + 1}`}`
          );
        }
        return res.json();
      });
      await Promise.all(promises);
      fetchData();
      toast(`Imported ${items.length} passenger(s)!`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to import passengers", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const url = editId ? `/api/passengers/${editId}` : "/api/passengers";
      const method = editId ? "PUT" : "POST";
      const payload = {
        fullName: form.fullName.trim(),
        passportNumber: form.passportNumber.trim() || undefined,
        nationality: form.nationality.trim() || undefined,
        gender: form.gender || undefined,
        visaType: form.visaType.trim() || undefined,
        iqamaNumber: form.iqamaNumber.trim() || undefined,
        phone: form.phone.trim() || undefined,
      };

      // Optimistic update for edit
      if (editId) {
        setPassengers((prev) =>
          prev.map((p) =>
            p.id === editId
              ? {
                  ...p,
                  fullName: form.fullName.trim(),
                  passportNumber: form.passportNumber.trim() || null,
                  nationality: form.nationality.trim() || null,
                  gender: form.gender || null,
                  visaType: form.visaType.trim() || null,
                  iqamaNumber: form.iqamaNumber.trim() || null,
                  phone: form.phone.trim() || null,
                }
              : p
          )
        );
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast(editId ? "Passenger updated successfully" : "Passenger added successfully", "success");
        setModalOpen(false);
        fetchData(); // refresh current page
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to save passenger", "error");
        fetchData();
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Network error", "error");
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget;
    const previous = [...passengers];

    // Optimistic removal: instantly disappears from table (0ms delay)
    setPassengers((prev) => prev.filter((p) => p.id !== targetId));
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/passengers/${targetId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Passenger deleted", "success");
      } else {
        // Rollback on failure
        setPassengers(previous);
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to delete", "error");
      }
    } catch {
      setPassengers(previous);
      toast("Network error deleting passenger", "error");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Passengers"
        description="Manage passenger profiles, passport information, and visa details"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <VisaImportButton
              onConfirm={(fields) => {
                setForm((cur) => applyVisaFieldsToPassengerForm(cur, fields));
                setEditId(null);
                setModalOpen(true);
              }}
              onConfirmMultiple={handleImportMultiple}
              label="Scan Visa"
            />
            <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4" /> Add Passenger
            </Button>
          </div>
        }
      />

      {/* Search Filter Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all"
          placeholder="Search by name, passport number, or nationality…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : passengers.length === 0 ? (
            <EmptyState
              title="No passengers found"
              description={
                search
                  ? "Try a different search term"
                  : "Add your first passenger manually or scan a visa to import automatically."
              }
              icon={<UserCircle className="h-12 w-12 text-slate-300" />}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <VisaImportButton
                    onConfirm={(fields) => {
                      setForm((cur) => applyVisaFieldsToPassengerForm(cur, fields));
                      setEditId(null);
                      setModalOpen(true);
                    }}
                    onConfirmMultiple={handleImportMultiple}
                  />
                  <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="h-4 w-4" /> Add Passenger
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Passenger Name
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Passport No
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                      Nationality
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Visa Type
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Phone / Iqama
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {passengers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {p.fullName ? p.fullName.charAt(0).toUpperCase() : "P"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{p.fullName}</p>
                            {p.gender && (
                              <p className="text-[11px] text-slate-400 capitalize">{p.gender.toLowerCase()}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {p.passportNumber ? (
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium border border-slate-200">
                            {p.passportNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Not provided</span>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        {p.nationality ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                            <Globe className="h-3.5 w-3.5 text-slate-400" />
                            {p.nationality}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        {p.visaType ? (
                          <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                            {p.visaType}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-xs text-slate-700 font-medium">{p.phone || "—"}</p>
                        {p.iqamaNumber && (
                          <p className="text-[11px] font-mono text-slate-400">IQ: {p.iqamaNumber}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                            title="Edit passenger"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <Link
                            href={`/passengers/${p.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            <span>Open</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p.id)}
                            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition-colors"
                            title="Delete passenger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, total)} of {total} passengers
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) {
                p = i + 1;
              } else if (page <= 4) {
                p = i + 1;
              } else if (page >= totalPages - 3) {
                p = totalPages - 6 + i;
              } else {
                p = page - 3 + i;
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    p === page
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Passenger Modal (Clean, No Notes) */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editId ? "Edit Passenger Details" : "Add New Passenger"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editId && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <ScanSearch className="h-4 w-4 text-indigo-600" /> Have a visa PDF or photo?
              </p>
              <VisaImportButton
                disabled={saving}
                onConfirm={(fields) => {
                  setForm((cur) => applyVisaFieldsToPassengerForm(cur, fields));
                }}
                onConfirmMultiple={async (imported) => {
                  await handleImportMultiple(imported);
                  setModalOpen(false);
                }}
              />
              <p className="mt-2 text-xs text-indigo-700">
                AI Vision automatically fills name, passport number, nationality, and visa type.
              </p>
            </div>
          )}

          <Input
            label="Full Name *"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
            placeholder="e.g. MOHAMMED KHALID AL-HARBI"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Passport Number"
              value={form.passportNumber}
              onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
              placeholder="e.g. A12345678"
            />
            <Input
              label="Nationality"
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              placeholder="e.g. Saudi Arabia, Pakistan"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              options={[
                { value: "", label: "Select gender..." },
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" },
              ]}
            />
            <Input
              label="Visa Type"
              value={form.visaType}
              onChange={(e) => setForm({ ...form, visaType: e.target.value })}
              placeholder="e.g. Umrah, Tourism Visit"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Iqama Number"
              value={form.iqamaNumber}
              onChange={(e) => setForm({ ...form, iqamaNumber: e.target.value })}
              placeholder="10-digit Saudi residence ID"
            />
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+966 5X XXX XXXX"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
            >
              {saving ? "Saving…" : editId ? "Save Changes" : "Save Passenger"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Passenger?"
        message="This will permanently delete this passenger record. This action cannot be undone."
      />
    </AppLayout>
  );
}
