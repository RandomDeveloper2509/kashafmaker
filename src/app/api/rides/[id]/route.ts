import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { updateRide, generateKashafForRide } from "@/services/rides";
import { rideSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ride = await prisma.ride.findUnique({
    where: { id },
    include: {
      driver: true,
      vehicle: true,
      passengers: { include: { passenger: true }, orderBy: { sortOrder: "asc" } },
      kashafDocuments: { include: { template: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!ride) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ride, {
    headers: {
      "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "operate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const data = rideSchema.parse(body);
    const ride = await updateRide(id, data);
    return NextResponse.json(ride);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update ride";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.ride.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "operate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action;

  if (action === "generate-kashaf") {
    try {
      const document = await generateKashafForRide(id, body.templateId);
      return NextResponse.json(document, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate Kashaf";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (action === "status") {
    const status = body.status as "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    const ride = await prisma.ride.update({ where: { id }, data: { status } });
    return NextResponse.json(ride);
  }

  if (action === "duplicate") {
    const ride = await prisma.ride.findUnique({
      where: { id },
      include: { passengers: true },
    });
    if (!ride) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { generateRideNumber } = await import("@/lib/utils");
    const maxSeq = await prisma.ride.aggregate({ _max: { rideSeqId: true } });
    const nextSeqId = (maxSeq._max.rideSeqId ?? 1699) + 1;
    const newRide = await prisma.ride.create({
      data: {
        rideNumber: generateRideNumber(nextSeqId, ride.date),
        rideSeqId: nextSeqId,
        date: ride.date,
        time: "00:00", // Default time since time field is removed
        pickup: ride.pickup,
        destination: ride.destination,
        intermediateStops: ride.intermediateStops,
        tripType: ride.tripType,
        notes: ride.notes,
        status: "SCHEDULED",
        driverId: ride.driverId,
        vehicleId: ride.vehicleId,
        driverSnapshot: ride.driverSnapshot ?? undefined,
        vehicleSnapshot: ride.vehicleSnapshot ?? undefined,
        passengers: {
          create: ride.passengers.map((p) => ({
            passengerId: p.passengerId,
            sortOrder: p.sortOrder,
            passengerSnapshot: p.passengerSnapshot ?? undefined,
          })),
        },
      },
    });
    return NextResponse.json(newRide, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
