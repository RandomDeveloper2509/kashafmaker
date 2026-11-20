"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, LoadingSpinner } from "@/components/ui/card";
import { RideForm } from "@/components/rides/ride-form";

export default function EditRidePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ride, setRide] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/rides/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Ride not found");
        return r.json();
      })
      .then(setRide)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (error || !ride || !("rideNumber" in ride)) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-semibold text-slate-900">Ride not found</h2>
          <p className="mt-2 text-slate-500">{error || "The ride you're looking for doesn't exist."}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Go Back
          </button>
        </div>
      </AppLayout>
    );
  }

  const data = ride as {
    date: string;
    pickup: string;
    destination: string;
    intermediateStops: string | null;
    tripType: string | null;
    flightNumber: string | null;
    notes: string | null;
    status: string;
    driverId: string | null;
    vehicleId: string | null;
    fare: number | null;
    referral: string | null;
    passengers: Array<{
      passenger: {
        id: string;
        fullName: string;
        passportNumber: string | null;
        nationality: string | null;
        gender: string | null;
        visaType: string | null;
      };
    }>;
  };

  return (
    <AppLayout>
      <PageHeader title="Edit Ride" description="Update trip details. Driver changes will refresh the default vehicle." />
      <RideForm
        rideId={id}
        initial={{
          date: data.date.slice(0, 10),
          pickup: data.pickup,
          destination: data.destination,
          intermediateStops: data.intermediateStops || "",
          tripType: data.tripType || "",
          flightNumber: data.flightNumber || "",
          notes: data.notes || "",
          status: data.status,
          driverId: data.driverId || "",
          vehicleId: data.vehicleId || "",
          fare: data.fare,
          referral: data.referral || "",
          passengers: data.passengers.map((rp) => rp.passenger),
        }}
      />
    </AppLayout>
  );
}
