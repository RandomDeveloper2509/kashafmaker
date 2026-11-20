import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { createRide } from "@/services/rides";
import { rideSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const driverId = searchParams.get("driverId") || "";

  const rides = await prisma.ride.findMany({
    where: {
      ...(status ? { status: status as "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" } : {}),
      ...(driverId ? { driverId } : {}),
      ...(query
        ? {
            OR: [
              { rideNumber: { contains: query, mode: "insensitive" } },
              { pickup: { contains: query, mode: "insensitive" } },
              { destination: { contains: query, mode: "insensitive" } },
              { driver: { name: { contains: query, mode: "insensitive" } } },
              { vehicle: { plateNumber: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      rideNumber: true,
      rideSeqId: true,
      date: true,
      time: true,
      pickup: true,
      destination: true,
      status: true,
      driver: { select: { name: true } },
      vehicle: { select: { make: true, model: true, plateNumber: true } },
      kashafDocuments: { take: 1, orderBy: { createdAt: "desc" }, select: { id: true } },
      _count: { select: { passengers: true } },
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  return NextResponse.json(rides, {
    headers: {
      // 10s fresh, then serve stale for up to 30s while revalidating in bg
      "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "operate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = rideSchema.parse(body);
    const ride = await createRide(data);
    return NextResponse.json(ride, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create ride";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
