"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Badge, LoadingSpinner, ConfirmDialog, StatusDot,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import {
  FileText, Download, Copy, CheckCircle, XCircle, Edit, Printer, Trash2,
  MapPin, Calendar, Users, Car, User, ArrowRight, ShieldCheck, Clock, AlertCircle, Sparkles
} from "lucide-react";

interface RideDetail {
  id: string;
  rideNumber: string;
  date: string;
  time: string;
  pickup: string;
  destination: string;
  intermediateStops: string | null;
  tripType: string | null;
  notes: string | null;
  status: string;
  driverSnapshot: { name?: string; phone?: string } | null;
  vehicleSnapshot: { make?: string; model?: string; plateNumber?: string; vehicleType?: string } | null;
  driver: { id: string; name: string; phone: string | null } | null;
  vehicle: { make: string; model: string; plateNumber: string; vehicleType: string } | null;
  passengers: Array<{
    sortOrder: number;
    passengerSnapshot: { fullName?: string; passportNumber?: string; nationality?: string; gender?: string; visaType?: string } | null;
    passenger: { id: string; fullName: string; passportNumber: string | null; nationality: string | null; gender: string | null; visaType: string | null };
  }>;
  kashafDocuments: Array<{ id: string; documentNumber: string; createdAt: string; status: string }>;
}

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Confirm delete Kashaf dialog
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);

  // Confirm cancel ride dialog
  const [cancelRideConfirm, setCancelRideConfirm] = useState(false);

  const fetchRide = () => {
    fetch(`/api/rides/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && "id" in data) setRide(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRide();
  }, [id]);

  const isApproved = ride ? ride.status !== "SCHEDULED" && ride.status !== "CANCELLED" : false;
  const isPendingApproval = ride ? ride.status === "SCHEDULED" : false;

  const handleApproveRide = async () => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/rides/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status: "IN_PROGRESS" }),
      });
      if (res.ok) {
        toast("Ride approved! You can now generate the Kashaf document.", "success");
        fetchRide();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to approve ride", "error");
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/rides/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status }),
      });
      if (res.ok) {
        toast(`Ride marked as ${status.toLowerCase().replace("_", " ")}`, "success");
        fetchRide();
      }
    } finally {
      setUpdatingStatus(false);
      setCancelRideConfirm(false);
    }
  };

  const generateKashaf = async () => {
    if (!isApproved) {
      toast("Please approve this ride first before generating Kashaf", "error");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/rides/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-kashaf" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate Kashaf");
      }
      toast("Kashaf document generated successfully!", "success");
      fetchRide();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to generate Kashaf", "error");
    } finally {
      setGenerating(false);
    }
  };

  const deleteKashaf = async () => {
    if (!deleteDocId) return;
    setDeletingDoc(true);
    try {
      const res = await fetch(`/api/documents/${deleteDocId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast("Kashaf PDF deleted", "success");
      fetchRide();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to delete Kashaf", "error");
    } finally {
      setDeletingDoc(false);
      setDeleteDocId(null);
    }
  };

  const duplicateRide = async () => {
    try {
      const res = await fetch(`/api/rides/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      if (res.ok) {
        const newRide = await res.json();
        toast("Ride duplicated successfully", "success");
        router.push(`/rides/${newRide.id}`);
      }
    } catch {
      toast("Failed to duplicate ride", "error");
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

  if (!ride) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <p className="text-slate-500 mb-4">Ride not found</p>
          <Button href="/rides" variant="outline">Back to Rides</Button>
        </div>
      </AppLayout>
    );
  }

  const latestDoc = ride.kashafDocuments[0];

  return (
    <AppLayout>
      {/* PAGE HEADER */}
      <PageHeader
        title={`Ride ${ride.rideNumber}`}
        description={`${formatDate(ride.date)} • ${ride.pickup} → ${ride.destination}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/rides/${ride.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Edit className="h-4 w-4" /> Edit Ride
            </Link>

            {/* If ride is pending approval: show Approve Ride button */}
            {isPendingApproval && (
              <Button
                onClick={handleApproveRide}
                disabled={updatingStatus}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                {updatingStatus ? "Approving…" : "Approve Ride"}
              </Button>
            )}

            {/* If approved: show Generate Kashaf button */}
            {isApproved && (
              <Button
                onClick={generateKashaf}
                disabled={generating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                {generating ? "Generating Kashaf…" : latestDoc ? "Regenerate Kashaf" : "Generate Kashaf"}
              </Button>
            )}

            {/* If Kashaf exists, quick view/print */}
            {latestDoc && (
              <Button
                variant="outline"
                href={`/api/documents/${latestDoc.id}?pdf=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <Printer className="h-4 w-4 mr-1.5" /> View / Print PDF
              </Button>
            )}

            <Button
              variant="outline"
              onClick={duplicateRide}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Copy className="h-4 w-4 mr-1.5" /> Duplicate
            </Button>
          </div>
        }
      />

      {/* APPROVAL STATUS BANNER */}
      {isPendingApproval ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-950 text-sm sm:text-base">
                Ride Pending Approval
              </h4>
              <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                Review passenger information and route details. Click <strong>&quot;Approve Ride&quot;</strong> to authorize this trip and unlock Kashaf PDF generation.
              </p>
            </div>
          </div>
          <Button
            onClick={handleApproveRide}
            disabled={updatingStatus}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 shadow-sm whitespace-nowrap self-start sm:self-auto"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {updatingStatus ? "Approving…" : "Approve Ride Now"}
          </Button>
        </div>
      ) : ride.status === "CANCELLED" ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 font-medium">
            This ride has been cancelled. Kashaf document generation is disabled.
          </p>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-emerald-950 text-sm">
                Ride Approved &amp; Authorized
              </p>
              <p className="text-xs text-emerald-700">
                Official Kashaf document can be generated, downloaded, or printed anytime.
              </p>
            </div>
          </div>
          {!latestDoc && (
            <Button
              onClick={generateKashaf}
              disabled={generating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {generating ? "Generating…" : "Generate Kashaf Now"}
            </Button>
          )}
        </div>
      )}

      {/* STATUS BADGES BAR */}
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        {isPendingApproval ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
            <StatusDot status="warning" /> Pending Approval
          </span>
        ) : ride.status === "CANCELLED" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-800">
            <StatusDot status="danger" /> Cancelled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
            <StatusDot status="success" /> Approved ({ride.status.replace("_", " ")})
          </span>
        )}

        {latestDoc ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">
            <FileText className="h-3.5 w-3.5 text-indigo-600" />
            Kashaf Generated: {latestDoc.documentNumber}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
            Kashaf Pending
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: Route Details & Passengers Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Details Card */}
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 py-5 px-6">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-600" /> Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-xl border border-indigo-100/80 shadow-sm">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Pickup Location</p>
                  <p className="font-bold text-slate-900 text-base">{ride.pickup}</p>
                </div>
                <div className="hidden sm:flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-md border border-slate-200 text-indigo-500">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div className="flex-1 sm:text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Destination</p>
                  <p className="font-bold text-slate-900 text-base">{ride.destination}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Trip Type</p>
                  <p className="font-semibold text-slate-800 text-base">{ride.tripType || "Standard Transfer"}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Intermediate Stops</p>
                  <p className="font-semibold text-slate-800 text-base">{ride.intermediateStops || "None (Direct Route)"}</p>
                </div>
              </div>

              {ride.notes && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Notes / Instructions</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{ride.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Passengers Table Card */}
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 py-5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" /> Passengers ({ride.passengers.length})
              </CardTitle>
              <Link
                href={`/rides/${ride.id}/edit`}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                + Add / Manage Passengers
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {ride.passengers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>No passengers assigned to this ride.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Passport No</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nationality</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Visa Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {ride.passengers.map((rp, idx) => {
                        const snap = rp.passengerSnapshot;
                        const fullName = snap?.fullName || rp.passenger.fullName;
                        const passport = snap?.passportNumber || rp.passenger.passportNumber;
                        const nationality = snap?.nationality || rp.passenger.nationality;
                        const visaType = snap?.visaType || rp.passenger.visaType;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                  {fullName.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-slate-900 text-base">{fullName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {passport ? (
                                <span className="font-mono text-sm bg-slate-100 text-slate-800 px-3 py-1.5 rounded-md font-semibold border border-slate-200">
                                  {passport}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-sm italic">Not provided</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700">
                              {nationality || "—"}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700 hidden sm:table-cell">
                              {visaType ? (
                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 border border-indigo-100">
                                  {visaType}
                                </span>
                              ) : (
                                "—"
                              )}
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

          {/* KASHAF DOCUMENTS SECTION */}
          {ride.kashafDocuments.length > 0 && (
            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 py-5 px-6">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" /> Generated Kashaf Documents ({ride.kashafDocuments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {ride.kashafDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold font-mono text-slate-900 text-base">{doc.documentNumber}</p>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Ready
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        Generated on {new Date(doc.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Button
                        size="sm"
                        href={`/api/documents/${doc.id}?pdf=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2 shadow-sm"
                      >
                        <Printer className="h-4 w-4 mr-1.5" /> View / Print
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        href={`/api/documents/${doc.id}?download=1`}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 text-sm px-4 py-2"
                      >
                        <Download className="h-4 w-4 mr-1.5" /> Download
                      </Button>
                      <button
                        type="button"
                        onClick={() => setDeleteDocId(doc.id)}
                        className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        title="Delete Kashaf PDF"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Driver, Vehicle, & Quick Actions */}
        <div className="space-y-6">
          {/* Driver Card */}
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 py-4 px-5">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" /> Assigned Driver
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {ride.driverSnapshot?.name || ride.driver ? (
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                    {(ride.driverSnapshot?.name || ride.driver?.name || "D").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-base">
                      {ride.driverSnapshot?.name || ride.driver?.name}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {ride.driverSnapshot?.phone || ride.driver?.phone || "No phone registered"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No driver assigned to this ride</p>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Card */}
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 py-4 px-5">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Car className="h-4 w-4 text-indigo-600" /> Assigned Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {ride.vehicleSnapshot?.plateNumber || ride.vehicle ? (
                <div className="space-y-3">
                  <p className="font-bold text-slate-900 text-base">
                    {ride.vehicleSnapshot?.make || ride.vehicle?.make} {ride.vehicleSnapshot?.model || ride.vehicle?.model}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-slate-100 px-3 py-1.5 rounded font-bold border border-slate-200 text-slate-800">
                      {ride.vehicleSnapshot?.plateNumber || ride.vehicle?.plateNumber}
                    </span>
                    {(ride.vehicleSnapshot?.vehicleType || ride.vehicle?.vehicleType) && (
                      <span className="text-sm text-slate-500">
                        {ride.vehicleSnapshot?.vehicleType || ride.vehicle?.vehicleType}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No vehicle assigned to this ride</p>
              )}
            </CardContent>
          </Card>

          {/* Ride Workflow Actions */}
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 py-4 px-5">
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Ride Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {isPendingApproval ? (
                <Button
                  onClick={handleApproveRide}
                  disabled={updatingStatus}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3"
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Approve Ride
                </Button>
              ) : (
                <>
                  {ride.status !== "COMPLETED" && ride.status !== "CANCELLED" && (
                    <Button
                      variant="outline"
                      className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 py-3"
                      onClick={() => handleStatusChange("COMPLETED")}
                      disabled={updatingStatus}
                    >
                      <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" /> Mark as Completed
                    </Button>
                  )}
                </>
              )}

              {ride.status !== "CANCELLED" && (
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 py-3"
                  onClick={() => setCancelRideConfirm(true)}
                  disabled={updatingStatus}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Cancel Ride
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Kashaf Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteDocId}
        onClose={() => !deletingDoc && setDeleteDocId(null)}
        onConfirm={deleteKashaf}
        loading={deletingDoc}
        title="Delete Kashaf PDF?"
        message="This will delete this generated Kashaf document. You can generate a new one anytime."
      />

      {/* Cancel Ride Confirm Dialog */}
      <ConfirmDialog
        open={cancelRideConfirm}
        onClose={() => setCancelRideConfirm(false)}
        onConfirm={() => handleStatusChange("CANCELLED")}
        loading={updatingStatus}
        title="Cancel This Ride?"
        message="Are you sure you want to cancel this ride? The status will be updated to CANCELLED."
      />
    </AppLayout>
  );
}
