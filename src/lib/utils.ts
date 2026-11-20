import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Formats a date as "13 November 2026" (no dashes, full month name) */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateRideNumber(seqId?: number, date?: Date): string {
  const d = date || new Date();
  const datePart = d.toISOString().slice(0, 10).replace(/-/g, "");
  const seqPart =
    seqId !== undefined
      ? String(seqId)
      : Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0");
  return `R-${datePart}-${seqPart}`;
}

export function generateDocumentNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `K-${datePart}-${random}`;
}

/**
 * Generates a Kashaf document ID in the format: SXA - {plateDigits}{YYYYMMDD}{seq6}
 * e.g. "SXA - 726420261113001685"
 * plate = plate number (letters prefix kept, digits stripped for body)
 * seq = sequential counter padded to 6 digits (starting at 1700 to leave room for 10k+ docs)
 */
export function generateKashafId(options: {
  plateNumber?: string | null;
  date: Date;
  seq: number;
}): string {
  const plate = (options.plateNumber || "").trim();
  // Extract alpha prefix (e.g. "SXA") and numeric digits (e.g. "7264")
  const alphaPrefix = plate.replace(/[^A-Za-z]/g, "").toUpperCase() || "SXA";
  const plateDigits = plate.replace(/[^0-9]/g, "");
  const d = options.date;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const datePart = `${yyyy}${mm}${dd}`;
  const seqPart = String(options.seq).padStart(6, "0");
  return `${alphaPrefix} - ${plateDigits}${datePart}${seqPart}`;
}

/** Kashaf download/display name: كشف الركاب {Arabic company} {YYYY-MM-DD} - {plate} {pickup to destination} */
export function generateKashafFileName(input: {
  companyNameAr?: string | null;
  companyName?: string | null;
  date?: Date | string | null;
  plateNumber?: string | null;
  pickup?: string | null;
  destination?: string | null;
}): string {
  let company =
    (input.companyNameAr && input.companyNameAr.trim()) ||
    (input.companyName && input.companyName.trim()) ||
    "نور بصيرتي للنقل";

  const prefix = company.startsWith("كشف الركاب") ? company : `كشف الركاب ${company}`;

  let datePart = "";
  if (input.date instanceof Date && !Number.isNaN(input.date.getTime())) {
    const yyyy = input.date.getFullYear();
    const mm = String(input.date.getMonth() + 1).padStart(2, "0");
    const dd = String(input.date.getDate()).padStart(2, "0");
    datePart = `${yyyy}-${mm}-${dd}`;
  } else if (typeof input.date === "string" && input.date.trim()) {
    const raw = input.date.trim();
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if (iso) {
      datePart = `${iso[1]}-${iso[2]}-${iso[3]}`;
    } else if (dmy) {
      datePart = `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    } else {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, "0");
        const dd = String(parsed.getDate()).padStart(2, "0");
        datePart = `${yyyy}-${mm}-${dd}`;
      }
    }
  }
  if (!datePart) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    datePart = `${yyyy}-${mm}-${dd}`;
  }

  const plate = (input.plateNumber && input.plateNumber.trim()) || "----";
  const p = (input.pickup || "").trim();
  const d = (input.destination || "").trim();
  let route = "";
  if (p && d) {
    route = d.toLowerCase().startsWith("to ") ? `${p} ${d}` : `${p} to ${d}`;
  } else {
    route = p || d || "";
  }

  const base = `${prefix} ${datePart} - ${plate}`;
  return (route ? `${base} ${route}` : base)
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function pdfContentDisposition(filename: string, download: boolean): string {
  const withExt = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
  const type = download ? "attachment" : "inline";
  const fallback =
    withExt.replace(/[^\x20-\x7E]/g, "").replace(/["\\]/g, "").trim() || "kashaf.pdf";
  const encoded = encodeURIComponent(withExt).replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
