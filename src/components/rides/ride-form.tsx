"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, Modal } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  Plus, Trash2, Edit, Check, Globe, MapPin, Calendar, Car, User,
  Search, Users, ScanSearch, CheckCircle2, X
} from "lucide-react";
import { VisaImportButton } from "@/components/passengers/visa-import";
import { applyVisaFieldsToPassengerForm } from "@/lib/visa/apply-fields";

const LOCATION_SUGGESTIONS = [
  "Makkah Hotel",
  "Medinah Hotel",
  "Medinah Airport",
  "Jeddah Airport",
];

function LocationInput({
  label,
  placeholder,
  value,
  onChange,
  required,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const filtered = LOCATION_SUGGESTIONS.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  );
  const showDropdown = open && (value.length === 0 || filtered.length > 0);

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        required={required}
        placeholder={placeholder}
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
      />
      {showDropdown && (
        <ul className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {(value.length === 0 ? LOCATION_SUGGESTIONS : filtered).map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => { onChange(s); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
              >
                <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Driver {
  id: string;
  name: string;
  status: string;
  assignments: Array<{ vehicle: { id: string; make: string; model: string; plateNumber: string; status?: string } }>;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
  status: string;
  assignments?: Array<{ driver: { id: string; name: string; status?: string } }>;
}

interface Passenger {
  id: string;
  fullName: string;
  passportNumber: string | null;
  nationality: string | null;
  gender: string | null;
  visaType: string | null;
  iqamaNumber?: string | null;
  phone?: string | null;
}

interface RideFormProps {
  rideId?: string;
  initial?: {
    date: string;
    pickup: string;
    destination: string;
    intermediateStops: string;
    tripType: string;
    flightNumber?: string;
    notes: string;
    status: string;
    driverId: string;
    vehicleId: string;
    fare?: number | null;
    referral?: string | null;
    passengers: Passenger[];
  };
}

const EMPTY_PASSENGER_FORM = {
  id: "",
  fullName: "",
  passportNumber: "",
  nationality: "",
  gender: "",
  visaType: "",
  iqamaNumber: "",
  phone: "",
};

export function RideForm({ rideId, initial }: RideFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allPassengers, setAllPassengers] = useState<Passenger[]>([]);
  const [selectedPassengers, setSelectedPassengers] = useState<Passenger[]>(initial?.passengers || []);
  const [passengerSearch, setPassengerSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Passenger Modal state (for both Add and Edit)
  const [passengerModalOpen, setPassengerModalOpen] = useState(false);
  const [editingPassengerId, setEditingPassengerId] = useState<string | null>(null);
  const [passengerForm, setPassengerForm] = useState(EMPTY_PASSENGER_FORM);
  const [savingPassenger, setSavingPassenger] = useState(false);

  const skipAutoVehicle = useRef(Boolean(initial?.vehicleId));

  const [form, setForm] = useState({
    date: initial?.date || new Date().toISOString().slice(0, 10),
    pickup: initial?.pickup || "",
    destination: initial?.destination || "",
    intermediateStops: initial?.intermediateStops || "",
    tripType: initial?.tripType || "",
    flightNumber: initial?.flightNumber || "",
    notes: initial?.notes || "",
    status: initial?.status || "SCHEDULED",
    driverId: initial?.driverId || "",
    vehicleId: initial?.vehicleId || "",
    fare: initial?.fare != null ? String(initial.fare) : "",
    referral: initial?.referral || "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/drivers?status=ACTIVE", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/vehicles?excludeInactive=true", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/passengers", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([d, v, p]) => {
      // Strictly exclude any inactive drivers or vehicles
      const activeDrivers = (Array.isArray(d) ? d : []).filter((driver: Driver) => driver.status === "ACTIVE");
      const activeVehicles = (Array.isArray(v) ? v : []).filter((veh: Vehicle) => veh.status !== "INACTIVE");
      setDrivers(activeDrivers);
      setVehicles(activeVehicles);
      setAllPassengers(Array.isArray(p) ? p : []);
    });
  }, []);

  const assignedVehicle = drivers.find((d) => d.id === form.driverId)?.assignments?.[0]?.vehicle;
  const assignedDriver = vehicles.find((v) => v.id === form.vehicleId)?.assignments?.[0]?.driver;

  useEffect(() => {
    if (skipAutoVehicle.current) {
      skipAutoVehicle.current = false;
      return;
    }
    if (assignedVehicle && !form.vehicleId && vehicles.some((v) => v.id === assignedVehicle.id)) {
      setForm((f) => ({ ...f, vehicleId: assignedVehicle.id }));
    }
  }, [form.driverId, assignedVehicle?.id, vehicles]);

  // Two-way automated sync: Selecting Driver auto-selects their assigned Vehicle
  const handleDriverChange = (newDriverId: string) => {
    setForm((prev) => {
      const next = { ...prev, driverId: newDriverId };
      if (newDriverId) {
        const selDriver = drivers.find((d) => d.id === newDriverId);
        const matchVehicle = selDriver?.assignments?.[0]?.vehicle;
        if (matchVehicle && vehicles.some((v) => v.id === matchVehicle.id)) {
          next.vehicleId = matchVehicle.id;
        }
      }
      return next;
    });
  };

  // Two-way automated sync: Selecting Vehicle auto-selects its assigned Driver
  const handleVehicleChange = (newVehicleId: string) => {
    setForm((prev) => {
      const next = { ...prev, vehicleId: newVehicleId };
      if (newVehicleId) {
        const selVehicle = vehicles.find((v) => v.id === newVehicleId);
        const matchDriver = selVehicle?.assignments?.[0]?.driver;
        if (matchDriver && drivers.some((d) => d.id === matchDriver.id)) {
          next.driverId = matchDriver.id;
        }
      }
      return next;
    });
  };

  // Open modal to add a brand new passenger
  const handleOpenAddPassenger = () => {
    setEditingPassengerId(null);
    setPassengerForm(EMPTY_PASSENGER_FORM);
    setPassengerModalOpen(true);
  };

  // Open modal to edit an existing passenger on the ride
  const handleOpenEditPassenger = (p: Passenger) => {
    setEditingPassengerId(p.id);
    setPassengerForm({
      id: p.id,
      fullName: p.fullName || "",
      passportNumber: p.passportNumber || "",
      nationality: p.nationality || "",
      gender: p.gender || "",
      visaType: p.visaType || "",
      iqamaNumber: p.iqamaNumber || "",
      phone: p.phone || "",
    });
    setPassengerModalOpen(true);
  };

  // Save (Create or Update) passenger from modal
  const handleSavePassenger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerForm.fullName.trim() || savingPassenger) return;

    setSavingPassenger(true);
    try {
      const url = editingPassengerId ? `/api/passengers/${editingPassengerId}` : "/api/passengers";
      const method = editingPassengerId ? "PUT" : "POST";
      const payload: Record<string, string | undefined> = {
        fullName: passengerForm.fullName.trim(),
        passportNumber: passengerForm.passportNumber.trim() || undefined,
        nationality: passengerForm.nationality.trim() || undefined,
        visaType: passengerForm.visaType.trim() || undefined,
      };

      if (editingPassengerId) {
        if (passengerForm.gender) payload.gender = passengerForm.gender;
        if (passengerForm.iqamaNumber) payload.iqamaNumber = passengerForm.iqamaNumber;
        if (passengerForm.phone) payload.phone = passengerForm.phone;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save passenger");
      }

      const savedPassenger: Passenger = await res.json();

      if (editingPassengerId) {
        // Update in selected list
        setSelectedPassengers((prev) =>
          prev.map((p) => (p.id === editingPassengerId ? { ...p, ...savedPassenger } : p))
        );
        // Update in all passengers list
        setAllPassengers((prev) =>
          prev.map((p) => (p.id === editingPassengerId ? { ...p, ...savedPassenger } : p))
        );
        toast("Passenger updated successfully", "success");
      } else {
        // Add to selected list and all list
        setSelectedPassengers((prev) => {
          const exists = prev.some((p) => p.id === savedPassenger.id);
          return exists ? prev.map((p) => (p.id === savedPassenger.id ? savedPassenger : p)) : [...prev, savedPassenger];
        });
        setAllPassengers((prev) => {
          const exists = prev.some((p) => p.id === savedPassenger.id);
          return exists ? prev.map((p) => (p.id === savedPassenger.id ? savedPassenger : p)) : [...prev, savedPassenger];
        });
        toast("Passenger added to ride", "success");
      }

      setPassengerModalOpen(false);
      setPassengerForm(EMPTY_PASSENGER_FORM);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error saving passenger", "error");
    } finally {
      setSavingPassenger(false);
    }
  };

  const addPassenger = (passenger: Passenger) => {
    setSelectedPassengers((prev) =>
      prev.find((p) => p.id === passenger.id) ? prev : [...prev, passenger]
    );
    setPassengerSearch("");
  };

  const removePassenger = (id: string) => {
    setSelectedPassengers((prev) => prev.filter((p) => p.id !== id));
  };

  // Bulk visa import callback
  const handleImportMultipleVisas = async (
    items: import("@/lib/visa/apply-fields").PassengerVisaFields[]
  ) => {
    try {
      const promises = items.map(async (data, idx) => {
        const res = await fetch("/api/passengers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: data.fullName.trim() || `Passenger ${idx + 1} (${data.passportNumber.trim() || "Visa"})`,
            passportNumber: data.passportNumber.trim() || undefined,
            nationality: data.nationality.trim() || undefined,
            visaType: data.visaType.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error(`Failed to save ${data.fullName || `Passenger ${idx + 1}`}`);
        return res.json();
      });

      const created: Passenger[] = await Promise.all(promises);
      setAllPassengers((prev) => [...prev, ...created]);
      setSelectedPassengers((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newOnes = created.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newOnes];
      });
      toast(`Successfully scanned and attached ${created.length} passenger(s) to ride!`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to import visas", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(rideId ? `/api/rides/${rideId}` : "/api/rides", {
        method: rideId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fare: form.fare ? parseFloat(form.fare) : null,
          referral: form.referral || null,
          passengerIds: selectedPassengers.map((p) => p.id),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save ride");
      }
      const ride = await res.json();
      toast(rideId ? "Ride updated successfully" : "Ride created and queued for approval", "success");
      router.push(`/rides/${ride.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to save ride", "error");
    } finally {
      setLoading(false);
    }
  };

  const searchResults = allPassengers.filter(
    (p) =>
      !selectedPassengers.find((sp) => sp.id === p.id) &&
      passengerSearch.trim().length > 0 &&
      (p.fullName.toLowerCase().includes(passengerSearch.toLowerCase()) ||
        (p.passportNumber && p.passportNumber.toLowerCase().includes(passengerSearch.toLowerCase())))
  );

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. RIDE DETAILS CARD */}
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" />
            Ride Details
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Set pickup and destination locations, schedule date, and assign driver and vehicle
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          {/* Pickup & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LocationInput
              label="From Location (Pickup) *"
              placeholder="e.g. King Abdulaziz Airport Terminal 1, Jeddah"
              value={form.pickup}
              onChange={(val) => setForm({ ...form, pickup: val })}
              required
            />
            <LocationInput
              label="To Location (Destination) *"
              placeholder="e.g. Makkah Clock Tower Hotel, Makkah"
              value={form.destination}
              onChange={(val) => setForm({ ...form, destination: val })}
              required
            />
          </div>

          {/* Date, Visa Type, Flight Number, Intermediate Stops */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label="Trip Date *"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <Input
              label="Visa Type"
              placeholder="e.g. Umrah, Tourism"
              value={form.tripType}
              onChange={(e) => setForm({ ...form, tripType: e.target.value })}
            />
            <Input
              label="Flight Number (Optional)"
              placeholder="e.g. SV-738, PK-741"
              value={form.flightNumber}
              onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
            />
            <Input
              label="Intermediate Stops (Optional)"
              placeholder="e.g. Madinah Ziyarat, Miqat"
              value={form.intermediateStops}
              onChange={(e) => setForm({ ...form, intermediateStops: e.target.value })}
            />
          </div>

          {/* Driver & Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <Select
                label="Assign Driver"
                value={form.driverId}
                onChange={(e) => handleDriverChange(e.target.value)}
                options={[
                  { value: "", label: "Select active driver..." },
                  ...drivers.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
              {assignedVehicle && form.vehicleId === assignedVehicle.id && (
                <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  ✓ Vehicle auto-selected from driver assignment
                </p>
              )}
            </div>

            <div>
              <Select
                label="Assign Vehicle"
                value={form.vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                options={[
                  { value: "", label: "Select available vehicle..." },
                  ...vehicles.map((v) => ({
                    value: v.id,
                    label: `${v.make} ${v.model} (${v.plateNumber})`,
                  })),
                ]}
              />
              {assignedDriver && form.driverId === assignedDriver.id && (
                <p className="mt-1 text-xs text-indigo-600 font-medium flex items-center gap-1">
                  ✓ Driver auto-selected from vehicle assignment
                </p>
              )}
            </div>
          </div>

          {/* Fare & Referral (Private / Saved on Ride, not on Kashaf) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <Input
                label="Fare / Price (SAR)"
                type="number"
                step="0.01"
                placeholder="e.g. 500"
                value={form.fare}
                onChange={(e) => setForm({ ...form, fare: e.target.value })}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Ride price in SAR (saved with ride and used in Excel export; not shown on Kashaf PDF)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Referral
              </label>
              <select
                value={form.referral}
                onChange={(e) => setForm({ ...form, referral: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              >
                <option value="">Select referral source...</option>
                <optgroup label="System Referral Channels">
                  <option value="NBT-ONLINE">NBT-ONLINE</option>
                  <option value="NBT-Abdullah">NBT-Abdullah</option>
                  <option value="NBT-QariSahab">NBT-QariSahab</option>
                  <option value="NBT-AliNoor">NBT-AliNoor</option>
                  <option value="NBT-RTG">NBT-RTG</option>
                  <option value="NBT-PanjKash">NBT-PanjKash</option>
                  <option value="HarmainGo">HarmainGo</option>
                  <option value="NBT-NoorUlHaram">NBT-NoorUlHaram</option>
                </optgroup>
                <optgroup label="Driver Referrals">
                  {drivers.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                Referral channel or driver who referred this ride
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="pt-2">
            <Textarea
              label="Ride Notes / Special Instructions"
              placeholder="Add flight numbers, group leaders, or driver coordination notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. PASSENGERS CARD (Full Width, Matches User Mockup) */}
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Passengers
              <span className="ml-1 inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {selectedPassengers.length}
              </span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Add and review passengers included in this ride and its Kashaf document
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <VisaImportButton
              label="Scan Visas"
              onConfirm={(fields) => {
                setEditingPassengerId(null);
                setPassengerForm((cur) => applyVisaFieldsToPassengerForm(cur, fields));
                setPassengerModalOpen(true);
              }}
              onConfirmMultiple={handleImportMultipleVisas}
            />
            <Button
              type="button"
              onClick={handleOpenAddPassenger}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Passenger
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* Quick Search & Attach from Existing Database */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search existing passengers by name or passport to attach to ride..."
              value={passengerSearch}
              onChange={(e) => setPassengerSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addPassenger(p)}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-indigo-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {p.fullName ? p.fullName.charAt(0).toUpperCase() : "P"}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{p.fullName}</p>
                        <p className="text-xs text-slate-400">
                          {p.passportNumber ? `Passport: ${p.passportNumber}` : "No passport"} • {p.nationality || "No nationality"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                      + Add to Ride
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Passenger Table (Clean Mockup Layout) */}
          {selectedPassengers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center bg-slate-50/50">
              <Users className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No passengers assigned to this ride yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Click &quot;+ Add Passenger&quot; to enter details manually, search existing profiles above, or &quot;Scan Visas&quot; to extract passport info automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Passport No
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Nationality
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {selectedPassengers.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name Column */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {p.fullName ? p.fullName.charAt(0).toUpperCase() : idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{p.fullName}</p>
                          </div>
                        </div>
                      </td>

                      {/* Passport No Column */}
                      <td className="px-5 py-3.5">
                        {p.passportNumber ? (
                          <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md font-semibold border border-slate-200">
                            {p.passportNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Not provided</span>
                        )}
                      </td>

                      {/* Nationality Column */}
                      <td className="px-5 py-3.5">
                        {p.nationality ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                            <Globe className="h-3.5 w-3.5 text-slate-400" />
                            {p.nationality}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions Column (Edit & Trash) */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPassenger(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-sm transition-colors"
                            title="Edit passenger details"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removePassenger(p.id)}
                            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition-colors"
                            title="Remove from ride"
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

      {/* 3. BOTTOM FORM ACTIONS */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-500">
          💡 Ride will be saved in <strong>Pending Approval</strong> state. Once approved, the Kashaf document can be generated.
        </p>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
            className="border-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px] font-semibold shadow-sm"
          >
            {loading ? (
              "Saving…"
            ) : (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                {rideId ? "Update Ride" : "Save Ride"}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>

    {/* Add / Edit Passenger Modal */}
    <Modal
      open={passengerModalOpen}
      onClose={() => !savingPassenger && setPassengerModalOpen(false)}
      title={editingPassengerId ? "Edit Passenger Details" : "Add Passenger to Ride"}
      size="lg"
    >
      <form onSubmit={handleSavePassenger} className="space-y-4">
        <Input
          label="Full Name *"
          value={passengerForm.fullName}
          onChange={(e) => setPassengerForm({ ...passengerForm, fullName: e.target.value })}
          required
          placeholder="e.g. MOHAMMED KHALID AL-HARBI"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Passport Number"
            value={passengerForm.passportNumber}
            onChange={(e) => setPassengerForm({ ...passengerForm, passportNumber: e.target.value })}
            placeholder="e.g. A12345678"
          />
          <Input
            label="Nationality"
            value={passengerForm.nationality}
            onChange={(e) => setPassengerForm({ ...passengerForm, nationality: e.target.value })}
            placeholder="e.g. Saudi Arabia, Pakistan"
          />
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPassengerModalOpen(false)}
            disabled={savingPassenger}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={savingPassenger}
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
          >
            {savingPassenger ? "Saving…" : editingPassengerId ? "Save Changes" : "Add to Ride"}
          </Button>
        </div>
      </form>
    </Modal>
  </>
  );
}
