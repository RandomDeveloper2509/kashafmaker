import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { generateKashafForRide } from "@/services/rides";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const documents = await prisma.kashafDocument.findMany({
    where: query
      ? {
          OR: [
            { documentNumber: { contains: query, mode: "insensitive" } },
            { ride: { rideNumber: { contains: query, mode: "insensitive" } } },
            { ride: { driver: { name: { contains: query, mode: "insensitive" } } } },
          ],
        }
      : {},
    select: {
      id: true,
      documentNumber: true,
      createdAt: true,
      status: true,
      passengerCount: true,
      ride: {
        select: {
          rideNumber: true,
          date: true,
          driver: { select: { name: true } },
          vehicle: { select: { plateNumber: true } },
        },
      },
      template: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(documents, {
    headers: {
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
    const document = await generateKashafForRide(body.rideId, body.templateId, session.user.name || undefined);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate document";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
