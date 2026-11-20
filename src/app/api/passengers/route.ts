import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { passengerSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 10;

  const where = query
    ? {
        OR: [
          { fullName: { contains: query, mode: "insensitive" as const } },
          { passportNumber: { contains: query, mode: "insensitive" as const } },
          { nationality: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [passengers, total] = await Promise.all([
    prisma.passenger.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.passenger.count({ where }),
  ]);

  return NextResponse.json(
    { passengers, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "operate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = await request.json();
    const cleaned = {
      fullName: (raw.fullName || "").trim(),
      passportNumber: raw.passportNumber ? String(raw.passportNumber).trim() : null,
      nationality: raw.nationality ? String(raw.nationality).trim() : null,
      gender: raw.gender && ["MALE", "FEMALE", "OTHER"].includes(raw.gender) ? raw.gender : null,
      visaType: raw.visaType ? String(raw.visaType).trim() : null,
      iqamaNumber: raw.iqamaNumber ? String(raw.iqamaNumber).trim() : null,
      phone: raw.phone ? String(raw.phone).trim() : null,
      notes: null,
    };
    const data = passengerSchema.parse(cleaned);

    // If a passport number is provided, check if this passenger already exists
    if (data.passportNumber) {
      const existing = await prisma.passenger.findFirst({
        where: { passportNumber: { equals: data.passportNumber, mode: "insensitive" } },
      });
      if (existing) {
        // Return the existing record instead of creating a duplicate
        return NextResponse.json(existing, { status: 200 });
      }
    }

    const passenger = await prisma.passenger.create({ data });
    return NextResponse.json(passenger, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create passenger";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
