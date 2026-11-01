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

export function generateRideNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `R-${datePart}-${random}`;
}

export function generateDocumentNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `K-${datePart}-${random}`;
}

/** Kashaf download/display name: كشف الركاب {Arabic company} {dd-mm-yyyy} - {plate} */
export function generateKashafFileName(input: {
  companyNameAr?: string | null;
  companyName?: string | null;
  date?: Date | string | null;
  plateNumber?: string | null;
}): string {
  const company =
    (input.companyNameAr && input.companyNameAr.trim()) ||
    (input.companyName && input.companyName.trim()) ||
    "نور بصيرتى للنقليات";

  let datePart = "";
  if (input.date instanceof Date && !Number.isNaN(input.date.getTime())) {
    const dd = String(input.date.getDate()).padStart(2, "0");
    const mm = String(input.date.getMonth() + 1).padStart(2, "0");
    datePart = `${dd}-${mm}-${input.date.getFullYear()}`;
  } else if (typeof input.date === "string" && input.date.trim()) {
    const raw = input.date.trim();
    const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dmy) {
      datePart = `${dmy[1].padStart(2, "0")}-${dmy[2].padStart(2, "0")}-${dmy[3]}`;
    } else if (iso) {
      datePart = `${iso[3]}-${iso[2]}-${iso[1]}`;
    } else {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        datePart = `${String(parsed.getDate()).padStart(2, "0")}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${parsed.getFullYear()}`;
      }
    }
  }
  if (!datePart) {
    const now = new Date();
    datePart = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
  }

  const plate = (input.plateNumber && input.plateNumber.trim()) || "----";
  return `كشف الركاب ${company} ${datePart} - ${plate}`.replace(/[<>:"/\\|?*]/g, " ").replace(/\s+/g, " ").trim();
}

export function pdfContentDisposition(filename: string, download: boolean): string {
  const withExt = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
  const type = download ? "attachment" : "inline";
  const fallback =
    withExt.replace(/[^\x20-\x7E]/g, "").replace(/["\\]/g, "").trim() || "kashaf.pdf";
  const encoded = encodeURIComponent(withExt).replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
