import { prisma } from "../src/lib/db/prisma";

async function main() {
  // Get all rides ordered by creation time (oldest first)
  const rides = await prisma.ride.findMany({
    select: { id: true, createdAt: true, rideNumber: true, rideSeqId: true, date: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${rides.length} rides. Updating rideSeqId and rideNumber starting from 1700...`);

  for (let i = 0; i < rides.length; i++) {
    const seqId = 1700 + i;
    const ride = rides[i];
    // Keep date part from existing rideNumber if available, e.g. R-20261106-XXXX -> 20261106
    const parts = (ride.rideNumber || "").split("-");
    const datePart = parts.length >= 2 && /^\d{8}$/.test(parts[1])
      ? parts[1]
      : (ride.date || ride.createdAt).toISOString().slice(0, 10).replace(/-/g, "");
    
    const newRideNumber = `R-${datePart}-${seqId}`;

    await prisma.ride.update({
      where: { id: ride.id },
      data: {
        rideSeqId: seqId,
        rideNumber: newRideNumber,
      },
    });
    console.log(`  ${ride.id} → rideSeqId = ${seqId}, rideNumber = ${newRideNumber}`);
  }

  console.log("Done! All rides now have sequential rideSeqId and rideNumber.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

