"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import {
  PageHeader, Card, CardContent, Badge, EmptyState, LoadingSpinner, Modal, ConfirmDialog, StatusDot,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  Plus, Search, User, Phone, IdCard, Car, CheckCircle, XCircle, Trash2, ArrowRight,
  Power, PowerOff, Edit,
} from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

interface Driver {
  id: string;
  name: string;
  nameAr?: string | null;
  iqamaNumber?: string | null;
  phone?: string | null;
  nationality?: string | null;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  status: string;
  notes?: string | null;
  assignments: Array<{ vehicle: { id: string; make: string; model: string; plateNumber: string } }>;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
}

const EMPTY_DRIVER_FORM = {
  name: "",
  nameAr: "",
  iqamaNumber: "",
  phone: "",
  nationality: "",
  licenseNumber: "",
  licenseExpiry: "",
  status: "ACTIVE",
  notes: "",
  vehicleId: "",
};

export default function DriversPage() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_DRIVER_FORM);

  // Permanent Delete confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status toggle (Disable / Enable) loading state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);

    Promise.all([
      fetch(`/api/drivers?${params.toString()}`, { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/vehicles?excludeInactive=true", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([d, v]) => {
        setDrivers(Array.isArray(d) ? d : []);
        setVehicles(Array.isArray(v) ? v : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, statusFilter]);

  const openCreateModal = () => {
    setEditId(null);
    setForm(EMPTY_DRIVER_FORM);
    setModalOpen(true);
  };

  const openEditModal = async (driver: Driver) => {
    setEditId(driver.id);
    const assignedVehId = driver.assignments?.[0]?.vehicle?.id || "";
    setForm({
      name: driver.name || "",
      nameAr: driver.nameAr || "",
      iqamaNumber: driver.iqamaNumber || "",
      phone: driver.phone || "",
      nationality: driver.nationality || "",
      licenseNumber: driver.licenseNumber || "",
      licenseExpiry: driver.licenseExpiry ? String(driver.licenseExpiry).slice(0, 10) : "",
      status: driver.status || "ACTIVE",
      notes: driver.notes || "",
      vehicleId: assignedVehId,
    });
    setModalOpen(true);

    // Fetch full driver details in background to ensure all fields are populated
    try {
      const res = await fetch(`/api/drivers/${driver.id}`, { cache: "no-store" });
      if (res.ok) {
        const full = await res.json();
        const activeVeh = (full.assignments || []).find((a: { isActive: boolean }) => a.isActive);
        setForm({
          name: full.name || "",
          nameAr: full.nameAr || "",
          iqamaNumber: full.iqamaNumber || "",
          phone: full.phone || "",
          nationality: full.nationality || "",
          licenseNumber: full.licenseNumber || "",
          licenseExpiry: full.licenseExpiry ? String(full.licenseExpiry).slice(0, 10) : "",
          status: full.status || "ACTIVE",
          notes: full.notes || "",
          vehicleId: activeVeh?.vehicle?.id || "",
        });
      }
    } catch {
      // Keep initial prefill
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const url = editId ? `/api/drivers/${editId}` : "/api/drivers";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const savedDriver = await res.json();
        if (editId) {
          setDrivers((prev) => prev.map((d) => (d.id === editId ? { ...d, ...savedDriver } : d)));
          toast("Driver updated successfully", "success");
        } else {
          setDrivers((prev) => [savedDriver, ...prev]);
          toast("Driver created successfully", "success");
        }
        setModalOpen(false);
        setForm(EMPTY_DRIVER_FORM);
        fetchData();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to save driver", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  // Toggle Driver Active / Inactive (Disable / Enable)
  const toggleDriverStatus = async (driver: Driver) => {
    const newStatus = driver.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const previous = [...drivers];
    setTogglingId(driver.id);

    // Optimistic UI update in 0ms
    setDrivers((prev) =>
      prev.map((d) => (d.id === driver.id ? { ...d, status: newStatus } : d))
    );

    try {
      const res = await fetch(`/api/drivers/${driver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast(
          newStatus === "INACTIVE"
            ? "Driver disabled (will not show in rides)"
            : "Driver enabled (available for rides)",
          "success"
        );
      } else {
        setDrivers(previous);
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to update driver status", "error");
      }
    } catch {
      setDrivers(previous);
      toast("Network error updating driver status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  // Permanent Hard Delete
  const handleConfirmPermanentDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const previous = [...drivers];
    setDeleting(true);

    // Optimistic UI removal in 0ms
    setDrivers((prev) => prev.filter((d) => d.id !== targetId));
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/drivers/${targetId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Driver permanently deleted from database", "success");
      } else {
        setDrivers(previous);
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to delete driver", "error");
      }
    } catch {
      setDrivers(previous);
      toast("Network error deleting driver", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Drivers"
        description="Manage driver profiles, active fleet assignments, and availability"
        action={
          <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Driver
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all"
            placeholder="Search drivers by name, iqama, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All Drivers" },
            { value: "ACTIVE", label: "Active Drivers Only" },
            { value: "INACTIVE", label: "Disabled / Inactive Drivers" },
          ]}
          className="sm:w-60"
        />
      </div>

      <Card className="border border-border shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : drivers.length === 0 ? (
            <EmptyState
              title="No drivers found"
              description={search || statusFilter ? "Try adjusting your search or filters" : "Get started by adding your first driver"}
              icon={<User className="h-12 w-12 text-slate-300" />}
              action={
                <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="h-4 w-4 mr-1.5" /> Add Driver
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50/80">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Iqama No
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                      Nationality
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                      Assigned Vehicle
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {drivers.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            d.status === "ACTIVE"
                              ? "bg-indigo-50 border border-indigo-100 text-indigo-700"
                              : "bg-muted border border-border text-muted-foreground"
                          }`}>
                            {d.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{d.name}</p>
                            {d.nameAr && <p className="text-xs text-muted-foreground">{d.nameAr}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {d.iqamaNumber ? (
                          <span className="font-mono text-xs bg-muted text-foreground px-2.5 py-1 rounded-md font-semibold border border-border">
                            {d.iqamaNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-muted-foreground font-medium">
                        {d.phone || "—"}
                      </td>

                      <td className="px-5 py-4 text-xs text-muted-foreground hidden sm:table-cell">
                        {d.nationality || "—"}
                      </td>

                      <td className="px-5 py-4 hidden md:table-cell">
                        {d.assignments[0]?.vehicle ? (
                          <div className="text-xs">
                            <p className="font-semibold text-foreground">
                              {d.assignments[0].vehicle.make} {d.assignments[0].vehicle.model}
                            </p>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {d.assignments[0].vehicle.plateNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Unassigned</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {d.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            <StatusDot status="success" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                            <StatusDot status="warning" /> Disabled
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Edit Driver Modal Button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(d)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/50 hover:text-indigo-600 transition-colors shadow-sm"
                            title="Edit driver details"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* 2. Toggle Disable / Enable Button */}
                          {d.status === "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() => toggleDriverStatus(d)}
                              disabled={togglingId === d.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
                              title="Disable this driver (will hide from rides without deleting)"
                            >
                              <PowerOff className="h-3.5 w-3.5" />
                              <span>Disable</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleDriverStatus(d)}
                              disabled={togglingId === d.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm"
                              title="Enable this driver (make available for rides)"
                            >
                              <Power className="h-3.5 w-3.5" />
                              <span>Enable</span>
                            </button>
                          )}

                          {/* 3. View Details */}
                          <Link
                            href={`/drivers/${d.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            <span>Open</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>

                          {/* 4. Permanent Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(d)}
                            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition-colors"
                            title="Permanently delete driver from database"
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

      {/* Add / Edit Driver Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editId ? "Edit Driver Details" : "Add New Driver"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="e.g. Tariq Al-Ghamdi"
          />
          <Input
            label="Arabic Name (Optional)"
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            placeholder="طارق الغامدي"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Iqama / National ID"
              value={form.iqamaNumber}
              onChange={(e) => setForm({ ...form, iqamaNumber: e.target.value })}
              placeholder="10-digit number"
            />
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+966 5X XXX XXXX"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nationality"
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              placeholder="e.g. Saudi Arabia, Egypt"
            />
            <Select
              label="Assign Vehicle"
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              options={[
                { value: "", label: "No vehicle assigned" },
                ...vehicles.map((v) => ({
                  value: v.id,
                  label: `${v.make} ${v.model} (${v.plateNumber})`,
                })),
              ]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Driver License Number"
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              placeholder="License ID"
            />
            <Input
              label="License Expiry Date"
              type="date"
              value={form.licenseExpiry}
              onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
            />
          </div>
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Driver notes..."
            rows={2}
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
              {saving ? "Saving…" : editId ? "Save Changes" : "Save Driver"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permanent Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleConfirmPermanentDelete}
        loading={deleting}
        title={`Permanently Delete Driver "${deleteTarget?.name}"?`}
        message={`Are you sure you want to permanently delete this driver from the database? This cannot be undone.\n\nTip: If you only want to temporarily prevent this driver from appearing in rides, click Cancel and choose "Disable" instead.`}
      />
    </AppLayout>
  );
}
