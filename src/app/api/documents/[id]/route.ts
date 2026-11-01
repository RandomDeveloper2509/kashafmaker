import { NextRequest, NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { readFile, deleteFile } from "@/lib/storage";
import { pdfContentDisposition } from "@/lib/utils";

async function servePdf(id: string, download: boolean) {
  const document = await prisma.kashafDocument.findUnique({
    where: { id },
    include: { template: true },
  });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let buffer: Buffer | null = null;
  if (document.filePath) {
    try {
      buffer = await readFile(document.filePath);
    } catch {
      buffer = null;
    }
  }

  // Self-healing: if PDF is missing on disk (e.g. serverless recycled /tmp), regenerate from snapshot!
  if (!buffer && document.snapshot) {
    try {
      const { generateKashafPdf, buildContextFromSnapshot, isNbisStyleTemplate, getNbisKashafFieldConfig } = await import("@/lib/pdf");
      const { saveFile } = await import("@/lib/storage");
      const context = buildContextFromSnapshot(document.snapshot as Record<string, unknown>);

      // Use template config from snapshot if available (preserves original template), otherwise use current template
      const snap = document.snapshot as Record<string, unknown>;
      const templateSnap = snap.template as Record<string, unknown> | undefined;
      let fieldConfig: unknown;
      let templateFilePath: string;

      if (templateSnap && templateSnap.fieldConfig && templateSnap.filePath) {
        // Use the template configuration from the snapshot (what was used when the document was created)
        fieldConfig = templateSnap.fieldConfig;
        templateFilePath = templateSnap.filePath as string;
      } else if (document.template) {
        // Fallback to current template from database (for backward compatibility with old documents)
        fieldConfig = isNbisStyleTemplate(document.template.pageCount)
          ? getNbisKashafFieldConfig()
          : document.template.fieldConfig;
        templateFilePath = document.template.filePath;
      } else {
        throw new Error("No template available for regeneration");
      }

      const pdfBytes = await generateKashafPdf(templateFilePath, fieldConfig as import("@/lib/pdf").TemplateFieldConfig, context);
      buffer = Buffer.from(pdfBytes);
      try {
        const newPath = await saveFile("documents", buffer, `${document.documentNumber}.pdf`);
        await prisma.kashafDocument.update({
          where: { id },
          data: { filePath: newPath },
        });
      } catch {
        /* ignore cache update failure */
      }
    } catch (regenError) {
      console.error("Failed to regenerate missing PDF:", regenError);
    }
  }

  if (!buffer) {
    return NextResponse.json({ error: "PDF file is missing on disk" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfContentDisposition(document.documentNumber, download),
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const download = request.nextUrl.searchParams.get("download") === "1";
  const pdf = request.nextUrl.searchParams.get("pdf") === "1";

  if (download || pdf) {
    return servePdf(id, download);
  }

  const document = await prisma.kashafDocument.findUnique({
    where: { id },
    include: {
      ride: { include: { driver: true, vehicle: true, passengers: { include: { passenger: true } } } },
      template: true,
    },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(document);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "operate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.kashafDocument.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (document.filePath) {
    await deleteFile(document.filePath);
  }
  await prisma.kashafDocument.delete({ where: { id } });
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
  if (body.action !== "regenerate") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const existing = await prisma.kashafDocument.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { generateKashafForRide } = await import("@/services/rides");
  try {
    // Regenerate using the same templateId to preserve template choice
    const document = await generateKashafForRide(existing.rideId, existing.templateId);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to regenerate";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
