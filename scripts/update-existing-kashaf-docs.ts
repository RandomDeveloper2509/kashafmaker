import { prisma } from "../src/lib/db/prisma";
import { generateKashafPdf, buildKashafContext, getNbisKashafFieldConfig, isNbisStyleTemplate, createDriverSnapshot, createVehicleSnapshot } from "../src/lib/pdf";
import { generateKashafId, generateKashafFileName } from "../src/lib/utils";
import { saveFile } from "../src/lib/storage";

async function main() {
  const docs = await prisma.kashafDocument.findMany({
    include: {
      ride: {
        include: {
          driver: true,
          vehicle: true,
          passengers: { include: { passenger: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      template: true,
    },
  });

  console.log(`Found ${docs.length} existing documents to check/update.`);

  for (const doc of docs) {
    const ride = doc.ride;
    if (!ride) continue;

    const seq = ride.rideSeqId;
    if (!seq) {
      console.log(`Ride ${ride.id} has no rideSeqId, skipping.`);
      continue;
    }

    const template = doc.template || await prisma.kashafTemplate.findFirst({ where: { isDefault: true } });
    if (!template) {
      console.log(`No template found for doc ${doc.id}, skipping.`);
      continue;
    }

    let company = await prisma.company.findFirst({ where: { isDefault: true } });
    if (!company) {
      company = await prisma.company.findFirst();
    }
    if (!company) {
      console.log("No company found, skipping.");
      continue;
    }

    const driverSnap = (ride.driverSnapshot as Record<string, unknown> | null) ||
      (ride.driver ? (createDriverSnapshot(ride.driver) as Record<string, unknown>) : null);
    const vehicleSnap = (ride.vehicleSnapshot as Record<string, unknown> | null) ||
      (ride.vehicle ? (createVehicleSnapshot(ride.vehicle) as Record<string, unknown>) : null);

    const passengers = ride.passengers.map((rp) => {
      const snap = (rp.passengerSnapshot as Record<string, unknown> | null) || {};
      const hasSnap = Boolean(snap.fullName);
      return {
        fullName: (hasSnap ? (snap.fullName as string) : rp.passenger.fullName) || "",
        passportNumber: hasSnap ? (snap.passportNumber as string) : rp.passenger.passportNumber,
        nationality: hasSnap ? (snap.nationality as string) : rp.passenger.nationality,
        gender: hasSnap ? (snap.gender as string) : rp.passenger.gender,
        visaType: hasSnap ? (snap.visaType as string) : rp.passenger.visaType,
      };
    });

    const context = buildKashafContext(
      company,
      ride,
      driverSnap as any,
      vehicleSnap as any,
      passengers
    );

    const kashafId = generateKashafId({
      plateNumber: vehicleSnap?.plateNumber as string | undefined,
      date: ride.date,
      seq,
    });

    context.ride.ride_number = kashafId;

    const fieldConfig = isNbisStyleTemplate(template.pageCount)
      ? getNbisKashafFieldConfig()
      : (template.fieldConfig as any);

    const pdfBytes = await generateKashafPdf(template.filePath, fieldConfig, context);

    const snapshot = {
      company: context.company,
      ride: context.ride,
      driver: context.driver,
      vehicle: context.vehicle,
      passengers: context.passengers,
      template: {
        fieldConfig: template.fieldConfig,
        filePath: template.filePath,
        pageCount: template.pageCount,
      },
      generatedAt: new Date().toISOString(),
    };

    if (doc.filePath) {
      await saveFile("documents", Buffer.from(pdfBytes), doc.filePath.replace(/^documents[\\/]/, ""));
    }

    await prisma.kashafDocument.update({
      where: { id: doc.id },
      data: {
        snapshot: snapshot as any,
        pdfData: Buffer.from(pdfBytes).toString("base64"),
      },
    });

    console.log(`Doc ${doc.id} (Ride #${seq}) updated with kashafId = ${kashafId}`);
  }

  console.log("All existing Kashaf documents updated successfully.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
