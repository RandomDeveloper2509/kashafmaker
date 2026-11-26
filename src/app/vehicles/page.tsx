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
  Plus, Search, Car, User, CheckCircle, XCircle, Trash2, ArrowRight,
  Power, PowerOff, Edit,
} from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

interface Vehicle {
  id: string;
  vehicleType: string;
  make: string;
  model: string;
  plateNumber: string;
  registrationNumber?: string | null;
  vehicleId?: string | null;
  capacity?: number | null;
  status: string;
  color?: string | null;
  year?: number | null;
  notes?: string | null;
  assignments: Array<{
    isActive: boolean;
    driver: { id: string; name: string };
  }>;
}

interface Driver {
  id: string;
  name: string;
}

const EMPTY_VEHICLE_FORM = {
  vehicleType: "Van",
  make: "",
  model: "",
  plateNumber: "",
  registrationNumber: "",
  vehicleId: "",
  year: "",
  color: "",
  capacity: "",
  status: "AVAILABLE",
  notes: "",
  driverId: "",
};

export default function VehiclesPage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_VEHICLE_FORM);

  // Permanent Delete confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status toggle (Disable / Enable) loading state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);

    Promise.all([
      fetch(`/api/vehicles?${params.toString()}`, { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/drivers?status=ACTIVE", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([v, d]) => {
        setVehicles(Array.isArray(v) ? v : []);
        setDrivers(Array.isArray(d) ? d : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, statusFilter]);

  const openCreateModal = () => {
    setEditId(null);
    setForm(EMPTY_VEHICLE_FORM);
    setModalOpen(true);
  };

  const openEditModal = async (vehicle: Vehicle) => {
    setEditId(vehicle.id);
    const assignedDriverId = vehicle.assignments?.[0]?.driver?.id || "";
    setForm({
      vehicleType: vehicle.vehicleType || "Van",
      make: vehicle.make || "",
      model: vehicle.model || "",
      plateNumber: vehicle.plateNumber || "",
      registrationNumber: vehicle.registrationNumber || "",
      vehicleId: vehicle.vehicleId || "",
      year: vehicle.year ? String(vehicle.year) : "",
      color: vehicle.color || "",
      capacity: vehicle.capacity ? String(vehicle.capacity) : "",
      status: vehicle.status || "AVAILABLE",
      notes: vehicle.notes || "",
      driverId: assignedDriverId,
    });
    setModalOpen(true);

    // Fetch full vehicle details in background to ensure all fields are populated
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, { cache: "no-store" });
      if (res.ok) {
        const full = await res.json();
        const activeDriver = (full.assignments || []).find((a: { isActive: boolean }) => a.isActive);
        setForm({
          vehicleType: full.vehicleType || "Van",
          make: full.make || "",
          model: full.model || "",
          plateNumber: full.plateNumber || "",
          registrationNumber: full.registrationNumber || "",
          vehicleId: full.vehicleId || "",
          year: full.year ? String(full.year) : "",
          color: full.color || "",
          capacity: full.capacity ? String(full.capacity) : "",
          status: full.status || "AVAILABLE",
          notes: full.notes || "",
          driverId: activeDriver?.driver?.id || "",
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
      const url = editId ? `/api/vehicles/${editId}` : "/api/vehicles";
      const method = editId ? "PUT" : "POST";
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedVehicle = await res.json();
        if (editId) {
          setVehicles((prev) => prev.map((v) => (v.id === editId ? { ...v, ...savedVehicle } : v)));
          toast("Vehicle updated successfully", "success");
        } else {
          setVehicles((prev) => [savedVehicle, ...prev]);
          toast("Vehicle created successfully", "success");
        }
        setModalOpen(false);
        setForm(EMPTY_VEHICLE_FORM);
        fetchData();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to save vehicle", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  // Toggle Vehicle Active / Inactive (Disable / Enable)
  const toggleVehicleStatus = async (vehicle: Vehicle) => {
    const isCurrentlyInactive = vehicle.status === "INACTIVE";
    const nextStatus = isCurrentlyInactive ? "AVAILABLE" : "INACTIVE";
    const previous = [...vehicles];
    setTogglingId(vehicle.id);

    // Optimistic UI update in 0ms
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicle.id ? { ...v, status: nextStatus } : v))
    );

    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        toast(
          nextStatus === "INACTIVE"
            ? "Vehicle disabled (will not show in rides)"
            : "Vehicle enabled (available for rides)",
          "success"
        );
      } else {
        setVehicles(previous);
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to update vehicle status", "error");
      }
    } catch {
      setVehicles(previous);
      toast("Network error updating vehicle status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  // Permanent Hard Delete
  const handleConfirmPermanentDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const previous = [...vehicles];
    setDeleting(true);

    // Optimistic UI removal in 0ms
    setVehicles((prev) => prev.filter((v) => v.id !== targetId));
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/vehicles/${targetId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Vehicle permanently deleted from database", "success");
      } else {
        setVehicles(previous);
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to delete vehicle", "error");
      }
    } catch {
      setVehicles(previous);
      toast("Network error deleting vehicle", "error");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <StatusDot status="success" /> Available
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <StatusDot status="info" /> Assigned
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            <StatusDot status="warning" /> Maintenance
          </span>
        );
      case "INACTIVE":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            <StatusDot status="warning" /> Disabled
          </span>
        );
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Vehicles"
        description="Manage fleet vehicles, plate numbers, and driver assignments"
        action={
          <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Vehicle
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all"
            placeholder="Search by plate number, make, model, or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All Statuses" },
            { value: "AVAILABLE", label: "Available Only" },
            { value: "ASSIGNED", label: "Assigned to Driver" },
            { value: "MAINTENANCE", label: "In Maintenance" },
            { value: "INACTIVE", label: "Disabled / Inactive" },
          ]}
          className="sm:w-56"
        />
      </div>

      <Card className="border border-border shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : vehicles.length === 0 ? (
            <EmptyState
              title="No vehicles found"
              description={search || statusFilter ? "Try adjusting your search or filters" : "Add your first vehicle to get started"}
              icon={<Car className="h-12 w-12 text-slate-300" />}
              action={
                <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="h-4 w-4 mr-1.5" /> Add Vehicle
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50/80">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Plate Number
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                      Type / Cap
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                      Assigned Driver
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
                  {vehicles.map((v) => {
                    const isInactive = v.status === "INACTIVE";
                    return (
                      <tr key={v.id} className="hover:bg-muted/50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              !isInactive
                                ? "bg-indigo-50 border border-indigo-100 text-indigo-700"
                                : "bg-muted border border-border text-muted-foreground"
                            }`}>
                              <Car className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-sm">
                                {v.make} {v.model}
                              </p>
                              {v.year && <p className="text-xs text-muted-foreground">{v.year}</p>}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-xs bg-muted text-foreground px-2.5 py-1 rounded-md font-semibold border border-border">
                            {v.plateNumber}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs text-muted-foreground hidden sm:table-cell">
                          {v.vehicleType}
                          {v.capacity && <span className="text-muted-foreground"> • {v.capacity} seats</span>}
                        </td>

                        <td className="px-5 py-4 hidden md:table-cell">
                          {v.assignments?.[0]?.driver?.name ? (
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                              <User className="h-3.5 w-3.5 text-indigo-500" />
                              <span>{v.assignments[0].driver.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Unassigned</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {getStatusBadge(v.status)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Edit Vehicle Modal Button */}
                            <button
                              type="button"
                              onClick={() => openEditModal(v)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/50 hover:text-indigo-600 transition-colors shadow-sm"
                              title="Edit vehicle details"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>

                            {/* 2. Toggle Disable / Enable Button */}
                            {!isInactive ? (
                              <button
                                type="button"
                                onClick={() => toggleVehicleStatus(v)}
                                disabled={togglingId === v.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
                                title="Disable this vehicle (will hide from rides without deleting)"
                              >
                                <PowerOff className="h-3.5 w-3.5" />
                                <span>Disable</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleVehicleStatus(v)}
                                disabled={togglingId === v.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm"
                                title="Enable this vehicle (make available for rides)"
                              >
                                <Power className="h-3.5 w-3.5" />
                                <span>Enable</span>
                              </button>
                            )}

                            {/* 3. View Details */}
                            <Link
                              href={`/vehicles/${v.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                            >
                              <span>Open</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>

                            {/* 4. Permanent Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(v)}
                              className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition-colors"
                              title="Permanently delete vehicle from database"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Vehicle Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editId ? "Edit Vehicle Details" : "Add New Vehicle"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Make *"
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
              required
              placeholder="e.g. Toyota, Hyundai"
            />
            <Input
              label="Model *"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              required
              placeholder="e.g. HiAce, Staria, Camry"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Plate Number *"
              value={form.plateNumber}
              onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
              required
              placeholder="e.g. ABC 1234"
            />
            <Select
              label="Vehicle Type"
              value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              options={[
                { value: "Van", label: "Van" },
                { value: "Bus", label: "Bus" },
                { value: "Sedan", label: "Sedan" },
                { value: "SUV", label: "SUV" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Year"
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="e.g. 2024"
            />
            <Input
              label="Color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="e.g. White"
            />
            <Input
              label="Passenger Capacity"
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder="e.g. 14"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assign Driver"
              value={form.driverId}
              onChange={(e) => setForm({ ...form, driverId: e.target.value })}
              options={[
                { value: "", label: "No driver assigned" },
                ...drivers.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: "AVAILABLE", label: "Available" },
                { value: "ASSIGNED", label: "Assigned" },
                { value: "MAINTENANCE", label: "Maintenance" },
                { value: "INACTIVE", label: "Disabled / Inactive" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Registration Number"
              value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              placeholder="Vehicle registration ID"
            />
            <Input
              label="Vehicle Serial / Fleet ID"
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              placeholder="Internal fleet reference"
            />
          </div>

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Vehicle notes, registration info..."
            rows={2}
          />

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
              {saving ? "Saving…" : editId ? "Save Changes" : "Save Vehicle"}
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
        title={`Permanently Delete Vehicle "${deleteTarget?.make} ${deleteTarget?.model} (${deleteTarget?.plateNumber})"?`}
        message={`Are you sure you want to permanently delete this vehicle from the database? This cannot be undone.\n\nTip: If you only want to temporarily prevent this vehicle from appearing in rides, click Cancel and choose "Disable" instead.`}
      />
    </AppLayout>
  );
}
