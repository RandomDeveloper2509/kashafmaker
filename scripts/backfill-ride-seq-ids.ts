import { prisma } from "../src/lib/db/prisma";

async function main() {
  console.log("Setting temporary rideNumbers and clearing rideSeqId to avoid collisions...");
  const allRides = await prisma.ride.findMany({ select: { id: true } });
  for (const r of allRides) {
    await prisma.ride.update({
      where: { id: r.id },
      data: {
        rideSeqId: null,
        rideNumber: `TMP-${r.id}`,
      },
    });
  }

  // Get all rides ordered chronologically by ride date first, then creation time
  const rides = await prisma.ride.findMany({
    select: { id: true, createdAt: true, date: true },
    orderBy: [
      { date: "asc" },
      { createdAt: "asc" },
    ],
  });

  console.log(`Found ${rides.length} rides. Assigning sequential rideSeqId and rideNumber by date ascending (1700+)...`);

  for (let i = 0; i < rides.length; i++) {
    const seqId = 1700 + i;
    const ride = rides[i];
    const d = ride.date || ride.createdAt;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const datePart = `${yyyy}${mm}${dd}`;
    const newRideNumber = `R-${datePart}-${seqId}`;

    await prisma.ride.update({
      where: { id: ride.id },
      data: {
        rideSeqId: seqId,
        rideNumber: newRideNumber,
      },
    });
    console.log(`  [${i + 1}/${rides.length}] ${datePart} → rideSeqId = ${seqId}, rideNumber = ${newRideNumber} (id: ${ride.id})`);
  }

  console.log("Done! All rides now have chronologically sequential rideSeqId and rideNumber.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

