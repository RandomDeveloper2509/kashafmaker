"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import {
  PageHeader, Card, CardContent, Badge, EmptyState, LoadingSpinner, ConfirmDialog, StatusDot, Modal,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  Plus, Search, MapPin, Users, Car, ArrowRight, FileText, Trash2, Edit, Download, FileSpreadsheet,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

interface Ride {
  id: string;
  rideNumber: string;
  date: string;
  time: string;
  pickup: string;
  destination: string;
  status: string;
  driver: { name: string } | null;
  vehicle: { make: string; model: string; plateNumber: string } | null;
  kashafDocuments: Array<{ id: string }>;
  _count: { passengers: number };
}

const statusVariant = (status: string) => {
  switch (status) {
    case "COMPLETED": return "success" as const;
    case "IN_PROGRESS": return "info" as const;
    case "CANCELLED": return "danger" as const;
    default: return "warning" as const;
  }
};

const statusDot = (status: string): "success" | "info" | "danger" | "warning" => {
  switch (status) {
    case "COMPLETED": return "success";
    case "IN_PROGRESS": return "info";
    case "CANCELLED": return "danger";
    default: return "warning";
  }
};

const PAGE_SIZE = 8;

export default function RidesPage() {
  const { toast } = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  // Confirm dialog state
  const [confirmDelete, setConfirmDelete] = useState<{ type: "ride" | "kashaf"; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Excel Export state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isExporting, setIsExporting] = useState(false);

  const fetchRides = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/rides?${params}`)
      .then((r) => r.json())
      .then((data) => setRides(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);
  useEffect(() => { fetchRides(); }, [debouncedSearch, statusFilter]);

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === "kashaf") {
        const res = await fetch(`/api/documents/${confirmDelete.id}`, { method: "DELETE" });
        if (res.ok) { toast("Kashaf PDF deleted", "success"); fetchRides(); }
      } else {
        const res = await fetch(`/api/rides/${confirmDelete.id}`, { method: "DELETE" });
        if (res.ok) {
          toast("Ride deleted successfully", "success");
          fetchRides();
        } else {
          const err = await res.json();
          toast(err.error || "Failed to delete ride", "error");
        }
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const handleExport = async () => {
    if (!exportStartDate || !exportEndDate) {
      toast("Please select both Start Date and End Date", "error");
      return;
    }
    if (exportStartDate > exportEndDate) {
      toast("Start date cannot be after End date", "error");
      return;
    }
    setIsExporting(true);
    try {
      const res = await fetch(`/api/rides/export?startDate=${exportStartDate}&endDate=${exportEndDate}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to export Excel file");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Rihal_Next_Rides_${exportStartDate}_to_${exportEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast("Excel report exported successfully!", "success");
      setExportModalOpen(false);
    } catch (error: any) {
      toast(error?.message || "Failed to export report", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Rides"
        description="Manage all transport rides and trips"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Export to Excel</span>
            </button>
            <Link href="/rides/new">
              <Button>
                <Plus className="h-4 w-4" /> Create Ride
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            placeholder="Search by ride number, pickup, or destination…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All Statuses" },
            { value: "SCHEDULED", label: "Pending Approval" },
            { value: "IN_PROGRESS", label: "Approved / Active" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
          className="sm:w-44"
        />
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : rides.length === 0 ? (
            <EmptyState
              title="No rides found"
              description={
                search || statusFilter
                  ? "Try adjusting your search or filters"
                  : "Create your first ride to get started"
              }
              icon={<Car className="h-12 w-12" />}
              action={
                <Link href="/rides/new">
                  <Button>
                    <Plus className="h-4 w-4" /> Create Ride
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              {(() => {
                const totalPages = Math.ceil(rides.length / PAGE_SIZE);
                const pageRides = rides.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                return (
                  <>
                    <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap w-32">
                      Ride #
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap w-28">
                      Date
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-64">
                      Route
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell w-48">
                      Driver
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell w-40">
                      Vehicle
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">
                      Pax
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap w-36">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell whitespace-nowrap w-40">
                      Kashaf Document
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide sticky right-0 bg-slate-50/95 backdrop-blur shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.08)] z-10 w-44">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pageRides.map((ride) => {
                    const kashafDoc = ride.kashafDocuments[0];
                    return (
                      <tr key={ride.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs whitespace-nowrap bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md font-semibold border border-slate-200/60 inline-block">
                            {ride.rideNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap font-medium">
                          {formatDate(ride.date)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold text-slate-900 truncate" title={ride.pickup}>{ride.pickup}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate text-slate-600" title={ride.destination}>{ride.destination}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          {ride.driver?.name ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0">
                                {ride.driver.name.charAt(0)}
                              </div>
                              <span className="text-slate-600 truncate" title={ride.driver.name}>
                                {ride.driver.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          {ride.vehicle ? (
                            <div className="text-xs">
                              <p className="font-medium text-slate-800 truncate max-w-[120px]" title={`${ride.vehicle.make} ${ride.vehicle.model}`}>
                                {ride.vehicle.make} {ride.vehicle.model}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400">{ride.vehicle.plateNumber}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Users className="h-3 w-3 text-slate-500" />
                            {ride._count?.passengers ?? 0}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge variant={statusVariant(ride.status)}>
                            <StatusDot status={statusDot(ride.status)} />
                            {ride.status === "SCHEDULED"
                              ? "Pending Approval"
                              : ride.status === "IN_PROGRESS"
                              ? "Approved"
                              : ride.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell whitespace-nowrap">
                          {kashafDoc ? (
                            <div className="flex items-center gap-1.5">
                              <Badge variant="success" className="text-[11px] py-0.5 px-2">
                                <FileText className="h-3 w-3 mr-1" /> Generated
                              </Badge>
                              <a
                                href={`/api/documents/${kashafDoc.id}?download=true`}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Download PDF"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                              <button
                                type="button"
                                className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete Kashaf PDF"
                                onClick={() => setConfirmDelete({ type: "kashaf", id: kashafDoc.id })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <Badge variant="default" className="text-[11px] py-0.5 px-2">Pending</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right sticky right-0 bg-white group-hover:bg-slate-50/90 transition-colors shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.08)] z-10">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <Link
                              href={`/rides/${ride.id}/edit`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 shadow-sm transition-all"
                            >
                              <Edit className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-600" /> Edit
                            </Link>
                            <Link
                              href={`/rides/${ride.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                            >
                              Open <ArrowRight className="h-3 w-3" />
                            </Link>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-500 hover:bg-red-100 transition-colors"
                              onClick={() => setConfirmDelete({ type: "ride", id: ride.id })}
                              title="Delete ride"
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
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-white">
                      <p className="text-xs text-slate-500">
                        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rides.length)} of {rides.length} rides
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={page === 1}
                          onClick={() => setPage((p) => p - 1)}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          ← Prev
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                              p === page
                                ? "border-indigo-500 bg-indigo-600 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
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
                  </>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => !deleting && setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={confirmDelete?.type === "ride" ? "Delete Ride?" : "Delete Kashaf PDF?"}
        message={
          confirmDelete?.type === "ride"
            ? "This will permanently delete the ride and all associated data. This cannot be undone."
            : "This will permanently delete the generated Kashaf PDF. You can regenerate it later."
        }
      />

      {/* Export to Excel Date Range Modal */}
      <Modal
        open={exportModalOpen}
        onClose={() => !isExporting && setExportModalOpen(false)}
        title="Export Rides to Excel"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select the date range of rides to export. The downloaded Excel sheet will include Kashaf ID, Date, Destination, Driver, Vehicle, Fare, and Referral with an automated fare total formula.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-slate-400">Quick:</span>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const d = now.toISOString().slice(0, 10);
                setExportStartDate(d);
                setExportEndDate(d);
              }}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 7);
                setExportStartDate(start.toISOString().slice(0, 10));
                setExportEndDate(end.toISOString().slice(0, 10));
              }}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const first = new Date(now.getFullYear(), now.getMonth(), 1);
                setExportStartDate(first.toISOString().slice(0, 10));
                setExportEndDate(now.toISOString().slice(0, 10));
              }}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const end = new Date(now.getFullYear(), now.getMonth(), 0);
                const start = new Date(end.getFullYear(), end.getMonth(), 1);
                setExportStartDate(start.toISOString().slice(0, 10));
                setExportEndDate(end.toISOString().slice(0, 10));
              }}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
            >
              Last Month
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setExportModalOpen(false)}
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isExporting ? (
                <>
                  <LoadingSpinner />
                  <span>Exporting…</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Export Excel</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
