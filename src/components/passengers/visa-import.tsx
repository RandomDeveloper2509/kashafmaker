"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileUp, Loader2, ScanSearch, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { renderPdfPagesToBlobs } from "@/lib/visa/client-render-pdf";
import { isExtractionComplete, mergeExtractions } from "@/lib/visa/parse-fields";
import type { FieldResult, VisaExtractionResult, VisaFieldKey } from "@/lib/visa/types";
import type { PassengerVisaFields } from "@/lib/visa/apply-fields";

const FIELD_META: Array<{ key: VisaFieldKey; label: string }> = [
  { key: "fullName", label: "Full Name" },
  { key: "passportNumber", label: "Passport Number" },
  { key: "nationality", label: "Nationality" },
  { key: "visaType", label: "Visa Type" },
];

const EMPTY_DRAFT: PassengerVisaFields = {
  fullName: "",
  passportNumber: "",
  nationality: "",
  visaType: "",
};

interface ScanState {
  file: File;
  previewUrl: string;
  status: "pending" | "scanning" | "done" | "error";
  result: VisaExtractionResult | null;
  draft: PassengerVisaFields;
  error: string;
  confirmed: boolean;
  abortController?: AbortController;
}

interface VisaImportButtonProps {
  onConfirm: (fields: PassengerVisaFields) => void;
  onConfirmMultiple?: (passengers: PassengerVisaFields[]) => void | Promise<void>;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function VisaImportButton({
  onConfirm,
  onConfirmMultiple,
  disabled,
  label = "Import from Visa",
  className,
}: VisaImportButtonProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [scans, setScans] = useState<ScanState[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => {
      scans.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    scans.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setScans([]);
    setCurrentIdx(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    // Force-cancel any in-progress scans
    setScans((prev) =>
      prev.map((s) => {
        if (s.status === "scanning") {
          s.abortController?.abort();
          return { ...s, status: "error", error: "Cancelled", abortController: undefined };
        }
        return s;
      })
    );
    setOpen(false);
    reset();
  };

  const extractFile = async (selected: File, renderedPage?: Blob, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append(
      "file",
      renderedPage ? new File([renderedPage], "visa-page.png", { type: "image/png" }) : selected
    );
    const res = await fetch("/api/extract-visa", { method: "POST", body: formData, signal });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || "Failed to extract visa information");
    return payload as VisaExtractionResult;
  };

  const scanOne = async (idx: number, file: File) => {
    const controller = new AbortController();
    const signal = controller.signal;

    // Mark as scanning, store controller
    setScans((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, status: "scanning", error: "", abortController: controller } : s
      )
    );

    try {
      let payload = await extractFile(file, undefined, signal);
      const isPdf =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if ((payload.needsPageRender || !isExtractionComplete(payload)) && isPdf) {
        const pages = await renderPdfPagesToBlobs(file, 2);
        for (const page of pages) {
          if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
          const ocrPayload = await extractFile(file, page, signal);
          payload = mergeExtractions(payload, ocrPayload);
          if (isExtractionComplete(payload)) break;
        }
      }
      const draft: PassengerVisaFields = {
        fullName: payload.fullName,
        passportNumber: payload.passportNumber,
        nationality: payload.nationality,
        visaType: payload.visaType,
      };
      setScans((prev) =>
        prev.map((s, i) =>
          i === idx ? { ...s, status: "done", result: payload, draft, abortController: undefined } : s
        )
      );
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // silently cancelled
      setScans((prev) =>
        prev.map((s, i) =>
          i === idx
            ? { ...s, status: "error", error: err instanceof Error ? err.message : "Extraction failed", abortController: undefined }
            : s
        )
      );
    }
  };

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;

    // Revoke previous URLs
    scans.forEach((s) => URL.revokeObjectURL(s.previewUrl));

    const newScans: ScanState[] = files.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: "pending",
      result: null,
      draft: { ...EMPTY_DRAFT },
      error: "",
      confirmed: false,
    }));

    setScans(newScans);
    setCurrentIdx(0);
    setOpen(true);
    if (inputRef.current) inputRef.current.value = "";

    // Sequential queue — max 2 concurrent to avoid rate limits
    const runQueue = async () => {
      const MAX_CONCURRENT = 2;
      let nextIdx = 0;
      const inFlight: Promise<void>[] = [];

      const startNext = async (): Promise<void> => {
        if (nextIdx >= newScans.length) return;
        const i = nextIdx++;
        await scanOne(i, newScans[i].file);
        // When one finishes, start the next
        await startNext();
      };

      for (let slot = 0; slot < Math.min(MAX_CONCURRENT, newScans.length); slot++) {
        inFlight.push(startNext());
      }
      await Promise.all(inFlight);
    };
    void runQueue();
  };

  const retry = (idx: number) => {
    const scan = scans[idx];
    if (!scan || scan.status === "scanning") return;
    void scanOne(idx, scan.file);
  };

  const confirmCurrent = () => {
    const scan = scans[currentIdx];
    if (!scan || scan.status !== "done") return;
    onConfirm({
      fullName: scan.draft.fullName.trim(),
      passportNumber: scan.draft.passportNumber.trim(),
      nationality: scan.draft.nationality.trim(),
      visaType: scan.draft.visaType.trim(),
    });
    toast(
      `Visa fields for "${scan.draft.fullName || "passenger"}" copied into the form.`,
      "success"
    );
    // Mark as confirmed and advance
    setScans((prev) =>
      prev.map((s, i) => (i === currentIdx ? { ...s, confirmed: true } : s))
    );
    // Move to next unconfirmed if possible
    const nextIdx = scans.findIndex((s, i) => i > currentIdx && !s.confirmed);
    if (nextIdx !== -1) setCurrentIdx(nextIdx);
  };

  const confirmAll = async () => {
    const readyScans = scans.filter(
      (s) => s.status === "done" && (s.draft.fullName.trim() || s.draft.passportNumber.trim())
    );
    if (readyScans.length === 0) {
      toast("No completed visa extractions to import", "error");
      return;
    }

    const allDrafts = readyScans.map((s, idx) => ({
      fullName: s.draft.fullName.trim() || `Passenger ${idx + 1} (${s.draft.passportNumber.trim() || "Visa"})`,
      passportNumber: s.draft.passportNumber.trim(),
      nationality: s.draft.nationality.trim(),
      visaType: s.draft.visaType.trim(),
    }));

    if (onConfirmMultiple) {
      await onConfirmMultiple(allDrafts);
    } else {
      for (const draft of allDrafts) {
        onConfirm(draft);
      }
    }

    toast(`Imported ${allDrafts.length} passenger(s) into form`, "success");
    setOpen(false);
    reset();
  };

  const updateDraft = (idx: number, key: VisaFieldKey, value: string) => {
    setScans((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, draft: { ...s.draft, [key]: value } } : s
      )
    );
  };

  const current = scans[currentIdx];
  const totalConfirmed = scans.filter((s) => s.confirmed).length;
  const anyScanning = scans.some((s) => s.status === "scanning");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || anyScanning}
        onClick={() => inputRef.current?.click()}
        className={className}
      >
        <ScanSearch className="h-4 w-4" />
        {label}
        {scans.length > 1 && (
          <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
            {totalConfirmed}/{scans.length}
          </span>
        )}
      </Button>

      {/* Hidden file input — multiple files allowed */}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/tiff,.pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          if (files.length > 0) handleFiles(files);
        }}
      />

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <Modal
            open={open}
            onClose={close}
            title={
              scans.length > 1
                ? `Scan visa ${currentIdx + 1} of ${scans.length}`
                : "Review visa extraction"
            }
            size="xl"
            overlayClassName="z-[80]"
          >
            {/* Multi-file tab strip */}
            {scans.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {scans.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentIdx(i)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      i === currentIdx
                        ? "bg-indigo-600 text-white"
                        : s.confirmed
                        ? "bg-emerald-100 text-emerald-700"
                        : s.status === "error"
                        ? "bg-red-100 text-red-700"
                        : s.status === "scanning"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {s.confirmed ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : s.status === "scanning" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                    Visa {i + 1}
                  </button>
                ))}
              </div>
            )}

            {current && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Preview panel */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <div className="border-b border-slate-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {current.file.name}
                  </div>
                  <div className="flex min-h-[280px] items-center justify-center p-3">
                    {isImageFile(current.file) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={current.previewUrl}
                        alt="Uploaded visa"
                        className="max-h-[420px] w-full object-contain"
                      />
                    ) : (
                      <iframe
                        title="Visa PDF preview"
                        src={current.previewUrl}
                        className="h-[420px] w-full rounded-md bg-white"
                      />
                    )}
                  </div>
                </div>

                {/* Fields panel */}
                <div className="space-y-4">
                  {current.status === "scanning" && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        <span>Analyzing visa with AI Vision…</span>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-indigo-600 underline hover:text-indigo-800"
                        onClick={() => {
                          current.abortController?.abort();
                          setScans((prev) =>
                            prev.map((s, i) =>
                              i === currentIdx
                                ? { ...s, status: "error", error: "Cancelled", abortController: undefined }
                                : s
                            )
                          );
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {current.status === "error" && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {current.error}
                    </div>
                  )}
                  {current.confirmed && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      Added to form — select another visa or close.
                    </div>
                  )}
                  {current.result && !current.confirmed && (
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs">
                      <span className="flex items-center gap-1.5 font-medium">
                        {current.result.method === "ai_vision" ? (
                          <>
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-semibold text-emerald-800">Extracted via AI Vision</span>
                          </>
                        ) : (
                          <>
                            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                            <span className="text-slate-700">Extracted via {methodLabel(current.result.method)}</span>
                          </>
                        )}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Review fields below
                      </span>
                    </div>
                  )}

                  {FIELD_META.map(({ key, label }) => {
                    const meta = current.result?.fields[key];
                    return (
                      <ReviewField
                        key={key}
                        label={label}
                        value={current.draft[key]}
                        meta={meta}
                        disabled={current.status === "scanning" || current.confirmed}
                        onChange={(value) => updateDraft(currentIdx, key, value)}
                      />
                    );
                  })}

                  {/* Navigation + actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
                    <div className="flex gap-2">
                      {scans.length > 1 && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={currentIdx === 0}
                            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={currentIdx === scans.length - 1}
                            onClick={() => setCurrentIdx((i) => Math.min(scans.length - 1, i + 1))}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => retry(currentIdx)}
                        disabled={current.status === "scanning"}
                      >
                        <FileUp className="h-4 w-4" />
                        Retry
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={close}>
                        Cancel
                      </Button>
                      {scans.length > 1 && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={confirmCurrent}
                          disabled={current.status !== "done" || current.confirmed}
                        >
                          {current.confirmed ? "Added Current" : "Add Current Only"}
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={confirmAll}
                        disabled={
                          scans.filter((s) => s.status === "done").length === 0 || anyScanning
                        }
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        {scans.length > 1
                          ? `Confirm & Fill All (${scans.filter((s) => s.status === "done").length}) Passengers`
                          : "Confirm & Fill Passenger"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Modal>,
          document.body
        )}
    </>
  );
}

function ReviewField({
  label,
  value,
  meta,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  meta?: FieldResult;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const status = !value ? "missing" : meta?.status === "ok" && value === meta.value ? "ok" : "needs_review";
  return (
    <div>
      <Input
        label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          status === "missing" && "border-red-300 bg-red-50",
          status === "needs_review" && "border-amber-300 bg-amber-50",
          status === "ok" && "border-emerald-300"
        )}
      />
      <p className="mt-1 text-xs text-slate-500">
        {status === "missing"
          ? "Missing — leave blank unless you can read it from the document."
          : status === "needs_review"
          ? meta?.warning || "Please confirm this value against the document."
          : "Matched from a labeled field. Still confirm before saving."}
      </p>
    </div>
  );
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(file.name);
}

function methodLabel(method: VisaExtractionResult["method"]) {
  if (method === "ai_vision") return "AI Vision";
  if (method === "pdf_text") return "PDF text";
  if (method === "hybrid") return "PDF text plus OCR";
  return "OCR";
}
