import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

function formatDestination(pickup: string | null | undefined, destination: string | null | undefined): string {
  const p = (pickup || "").trim();
  const d = (destination || "").trim();
  if (p && d) {
    if (d.toLowerCase().startsWith("to ")) {
      return `${p} ${d}`;
    }
    return `${p} To ${d}`;
  }
  return p || d || "-";
}

/** Format date as DD-MM-YY */
function formatDateDDMMYY(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(date.getUTCFullYear()).slice(2);
  return `${dd}-${mm}-${yy}`;
}

/** Extract the 1700+ sequential Kashaf ID from the snapshot ride_number field.
 *  The ride_number stored in snapshot looks like: "SXA - 726620261113001706"
 *  The last 6 digits are the sequence number (1706 → display as 1706).
 *  Falls back to the rideNumber string if no kashaf doc exists. */
function getKashafId(ride: {
  id: string;
  rideNumber: string;
  kashafDocuments?: Array<{ snapshot: unknown }>;
}): string {
  const doc = ride.kashafDocuments?.[0];
  if (doc?.snapshot && typeof doc.snapshot === "object") {
    const s = doc.snapshot as Record<string, any>;
    const rNum = s?.ride?.ride_number;
    if (rNum && typeof rNum === "string") {
      // Pattern: "SXA - 726620261113001706" — last 6 digits are seq
      const m = rNum.match(/(\d{4,6})$/);
      if (m) {
        return String(parseInt(m[1], 10)); // e.g. "1706"
      }
    }
  }
  // No kashaf doc — just return the ride number as-is
  return ride.rideNumber || String(ride.id).slice(-6);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  if (!startDateStr || !endDateStr) {
    return NextResponse.json({ error: "Missing startDate or endDate parameter" }, { status: 400 });
  }

  const startDate = new Date(`${startDateStr}T00:00:00.000Z`);
  const endDate = new Date(`${endDateStr}T23:59:59.999Z`);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  const rides = await prisma.ride.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      driver: { select: { name: true } },
      vehicle: { select: { plateNumber: true, make: true, model: true } },
      kashafDocuments: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { snapshot: true },
      },
    },
    orderBy: [
      { date: "desc" },
      { createdAt: "desc" },
    ],
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Rihal Next";
  workbook.lastModifiedBy = session.user?.name || "Rihal Next";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Rides Report", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { fitToPage: true, orientation: "landscape" },
  });

  worksheet.columns = [
    { header: "ID", key: "id", width: 14 },
    { header: "Date", key: "date", width: 15 },
    { header: "Destination", key: "destination", width: 44 },
    { header: "Driver", key: "driver", width: 32 },
    { header: "Vehicle", key: "vehicle", width: 18 },
    { header: "Fare", key: "fare", width: 16 },
    { header: "Referral", key: "referral", width: 22 },
  ];

  // Header row styling
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FF0F172A" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "medium", color: { argb: "FF64748B" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };

    if (colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 7) {
      cell.alignment = { vertical: "middle", horizontal: "center" };
    } else if (colNumber === 6) {
      cell.alignment = { vertical: "middle", horizontal: "right" };
    } else {
      cell.alignment = { vertical: "middle", horizontal: "left" };
    }
  });

  let totalFare = 0;

  rides.forEach((ride, index) => {
    const kashafId = getKashafId(ride);
    const dateFormatted = ride.date ? formatDateDDMMYY(ride.date) : "";
    const destinationCombined = formatDestination(ride.pickup, ride.destination);
    const driverName = ride.driver?.name || (ride.driverSnapshot as any)?.name || "-";
    const vehiclePlate = ride.vehicle?.plateNumber || (ride.vehicleSnapshot as any)?.plateNumber || "-";
    const fareVal = typeof ride.fare === "number" ? ride.fare : 0;
    const referralVal = ride.referral ? ride.referral.trim() : "-";

    totalFare += fareVal;

    const rowNumber = index + 2;
    const row = worksheet.addRow({
      id: kashafId,
      date: dateFormatted,
      destination: destinationCombined,
      driver: driverName,
      vehicle: vehiclePlate,
      fare: fareVal,
      referral: referralVal,
    });

    row.height = 22;
    const isEven = index % 2 === 1;

    row.eachCell((cell, colNumber) => {
      cell.font = {
        name: "Calibri",
        size: 10,
        color: { argb: "FF1E293B" },
      };
      if (isEven) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 7) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (colNumber === 6) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = "#,##0.00";
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });
  });

  // Bottom Total Row
  const totalRowIndex = rides.length + 2;
  const totalRow = worksheet.addRow({
    id: "",
    date: "",
    destination: "",
    driver: "",
    vehicle: "Total",
    fare: rides.length > 0 ? { formula: `SUM(F2:F${totalRowIndex - 1})`, result: totalFare } : 0,
    referral: "",
  });

  totalRow.height = 25;
  totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FF0F172A" },
    };

    if (colNumber === 5) {
      // "Total" label
      cell.alignment = { vertical: "middle", horizontal: "right" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
    } else if (colNumber === 6) {
      // Sum Formula
      cell.alignment = { vertical: "middle", horizontal: "right" };
      cell.numFmt = "#,##0.00";
      cell.border = {
        top: { style: "thin", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
    } else {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Rihal_Next_Rides_${startDateStr}_to_${endDateStr}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
