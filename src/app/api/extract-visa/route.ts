import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractVisaInformation } from "@/lib/visa/extract";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const ocrOnly = formData.get("ocrOnly") === "true";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const result = await extractVisaInformation({
      buffer,
      mimeType: file.type,
      fileName: file.name,
      ocrOnly,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number(error.status) || 500 : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to extract visa information",
      },
      { status }
    );
  }
}
