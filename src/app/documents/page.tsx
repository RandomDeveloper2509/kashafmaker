"use client";

import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Search,
  FileText,
  ArrowRight,
  SlidersHorizontal,
  Users,
  Car,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CheckCircleIcon, SpinnerGapIcon } from "@/components/watermelon/tallie-dashboard/components/tallie/icons";

interface DocumentRow {
  id: string;
  documentNumber: string;
  createdAt: string;
  status: string;
  passengerCount: number;
  ride: {
    id: string;
    rideNumber: string;
    date: string;
    driver: { name: string } | null;
    vehicle: { plateNumber: string; make?: string; model?: string } | null;
  };
  template: { name: string };
}

const STATUS_FILTERS = [
  { value: "ALL", label: "All statuses" },
  { value: "GENERATED", label: "Generated" },
  { value: "PENDING", label: "Pending" },
] as const;

const tableHeadClassName =
  "h-12.5 bg-zinc-50 text-sm font-medium tracking-tight text-muted-foreground dark:bg-card";

function StatusPill({ status }: { status: string }) {
  if (status === "GENERATED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--status-completed)">
        <CheckCircleIcon className="size-3.5" />
        Generated
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
      <Clock className="size-3.5" />
      Pending
    </span>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const fetchDocuments = (q = debouncedSearch) => {
    return fetch(`/api/documents?q=${q}`)
      .then((r) => r.json())
      .then((data) => setDocuments(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    setLoading(true);
    fetchDocuments(debouncedSearch).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const filteredDocs = useMemo(() => {
    if (statusFilter === "ALL") return documents;
    return documents.filter((d) => d.status === statusFilter);
  }, [documents, statusFilter]);

  const activeFilterLabel =
    STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? "All statuses";

  async function handleDelete(doc: DocumentRow) {
    if (!window.confirm(`Delete Kashaf ${doc.documentNumber}? This cannot be undone.`)) return;
    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        if (selectedDoc?.id === doc.id) setSelectedDoc(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRegenerate(doc: DocumentRow) {
    setRegeneratingId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      });
      if (res.ok) await fetchDocuments();
    } finally {
      setRegeneratingId(null);
    }
  }

  // Summary stats
  const totalGenerated = documents.filter((d) => d.status === "GENERATED").length;
  const totalPassengers = documents.reduce((sum, d) => sum + d.passengerCount, 0);

  return (
    <AppLayout>
      <div className="flex flex-col gap-9">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-3xl leading-snug tracking-tight text-foreground">
              Kashaf Documents
            </h1>
            <p className="text-base text-muted-foreground">
              Generated passenger manifests, Kashaf PDFs, and document history
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/rides/new"
              className={buttonVariants({
                variant: "outline",
                className: "h-9.5 gap-1.5 rounded-lg px-3.5 shadow-xs",
              })}
            >
              <ArrowRight className="size-4" />
              New Ride
            </Link>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex h-28 flex-col justify-between rounded-xl border border-border bg-zinc-50 p-4 dark:bg-card">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium tracking-tight text-foreground">Total Kashaf</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-3xl font-medium leading-none tracking-tight text-foreground">
                {documents.length}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-(--status-completed)" />
                <span>{totalGenerated} generated</span>
              </div>
            </div>
          </div>

          <div className="flex h-28 flex-col justify-between rounded-xl border border-border bg-zinc-50 p-4 dark:bg-card">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium tracking-tight text-foreground">Total Passengers</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-3xl font-medium leading-none tracking-tight text-foreground">
                {totalPassengers}
              </p>
              <p className="text-xs text-muted-foreground">across all manifests</p>
            </div>
          </div>

          <div className="flex h-28 flex-col justify-between rounded-xl border border-border bg-zinc-50 p-4 dark:bg-card">
            <div className="flex items-center gap-2">
              <Car className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium tracking-tight text-foreground">Unique Rides</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-3xl font-medium leading-none tracking-tight text-foreground">
                {new Set(documents.map((d) => d.ride.rideNumber)).size}
              </p>
              <p className="text-xs text-muted-foreground">rides with Kashaf documents</p>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <section className="flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                className={cn(
                  "h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground",
                  "shadow-xs outline-none transition focus:border-ring focus:ring-[3px] focus:ring-ring/50"
                )}
                placeholder="Search document or ride number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  className={buttonVariants({
                    variant: "outline",
                    className: "h-8.5 gap-1.5 rounded-lg px-3.5 shadow-xs",
                  })}
                >
                  {statusFilter === "ALL" ? "Filter" : activeFilterLabel}
                  <SlidersHorizontal className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="tallie-dashboard w-44">
                  <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                    {STATUS_FILTERS.map((f) => (
                      <DropdownMenuRadioItem key={f.value} value={f.value}>
                        {f.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {filteredDocs.length} {filteredDocs.length === 1 ? "doc" : "docs"}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-zinc-50/40 dark:bg-card/40">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(tableHeadClassName, "px-4")}>Document #</TableHead>
                  <TableHead className={cn(tableHeadClassName, "px-3")}>Ride & Date</TableHead>
                  <TableHead className={cn(tableHeadClassName, "hidden px-3 md:table-cell")}>Driver & Vehicle</TableHead>
                  <TableHead className={cn(tableHeadClassName, "hidden px-3 lg:table-cell")}>Passengers</TableHead>
                  <TableHead className={cn(tableHeadClassName, "hidden px-3 lg:table-cell")}>Template</TableHead>
                  <TableHead className={cn(tableHeadClassName, "px-3")}>Status</TableHead>
                  <TableHead className={cn(tableHeadClassName, "px-4 text-right")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="h-36 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <SpinnerGapIcon className="size-6 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading documents…</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="h-36 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="size-8 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-foreground">
                          {search || statusFilter !== "ALL" ? "No documents match" : "No Kashaf documents yet"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {search || statusFilter !== "ALL"
                            ? "Try adjusting your search or filter"
                            : "Generate a Kashaf from a ride to see it here"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocs.map((doc) => (
                    <TableRow
                      key={doc.id}
                      tabIndex={0}
                      onClick={() => setSelectedDoc(doc)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedDoc(doc);
                        }
                      }}
                      className="h-16 cursor-pointer bg-background transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {doc.documentNumber}
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs font-medium text-foreground">
                            {doc.ride.rideNumber}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(doc.createdAt)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="hidden px-3 py-3.5 md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-foreground">
                            {doc.ride.driver?.name || (
                              <span className="italic text-muted-foreground">Unassigned</span>
                            )}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {doc.ride.vehicle?.plateNumber || "—"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="hidden px-3 py-3.5 lg:table-cell">
                        <span className="inline-flex items-center gap-1 rounded bg-(--source-sharepoint)/15 px-2 py-0.5 text-xs font-medium text-(--source-sharepoint)">
                          <Users className="size-3" />
                          {doc.passengerCount} pax
                        </span>
                      </TableCell>

                      <TableCell className="hidden px-3 py-3.5 lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {doc.template.name}
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-3.5">
                        <StatusPill status={doc.status} />
                      </TableCell>

                      <TableCell
                        className="px-4 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/api/documents/${doc.id}?pdf=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View PDF"
                            className={buttonVariants({
                              variant: "outline",
                              size: "xs",
                              className: "h-7 w-7 rounded-md p-0",
                            })}
                          >
                            <Eye className="size-3.5" />
                          </a>
                          <a
                            href={`/api/documents/${doc.id}?download=1`}
                            title="Download PDF"
                            className={buttonVariants({
                              variant: "outline",
                              size: "xs",
                              className: "h-7 w-7 rounded-md p-0",
                            })}
                          >
                            <Download className="size-3.5" />
                          </a>
                          <Button
                            variant="ghost"
                            size="xs"
                            title="Regenerate"
                            className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:text-foreground"
                            disabled={regeneratingId === doc.id}
                            onClick={() => handleRegenerate(doc)}
                          >
                            <RefreshCw
                              className={cn(
                                "size-3.5",
                                regeneratingId === doc.id && "animate-spin"
                              )}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            title="Delete"
                            className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:text-(--status-exception)"
                            disabled={deletingId === doc.id}
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      {/* Quick-View Sheet */}
      <Sheet open={Boolean(selectedDoc)} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <SheetContent className="tallie-dashboard sm:max-w-md">
          {selectedDoc && (
            <>
              <SheetHeader className="border-b border-border pb-4">
                <SheetTitle className="font-serif text-2xl font-normal">
                  {selectedDoc.documentNumber}
                </SheetTitle>
                <SheetDescription>
                  Ride {selectedDoc.ride.rideNumber} &mdash; {formatDate(selectedDoc.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-5 p-4 text-sm">
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-zinc-50 p-3.5 dark:bg-card">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">
                      <StatusPill status={selectedDoc.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Passengers</p>
                    <p className="mt-0.5 font-medium">{selectedDoc.passengerCount} pax</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Driver</p>
                    <p className="mt-0.5 font-medium">
                      {selectedDoc.ride.driver?.name || "Unassigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="mt-0.5 font-mono text-sm font-medium">
                      {selectedDoc.ride.vehicle?.plateNumber || "—"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Template</p>
                    <p className="mt-0.5 font-medium">{selectedDoc.template.name}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={`/api/documents/${selectedDoc.id}?pdf=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button variant="outline" className="w-full justify-between">
                      View PDF
                      <Eye className="size-4" />
                    </Button>
                  </a>
                  <a
                    href={`/api/documents/${selectedDoc.id}?download=1`}
                    className="w-full"
                  >
                    <Button variant="default" className="w-full justify-between">
                      Download Kashaf PDF
                      <Download className="size-4" />
                    </Button>
                  </a>
                  <Link href={`/rides/${selectedDoc.ride.id}`} className="w-full">
                    <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                      Open Ride Details
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1 gap-1.5"
                      disabled={regeneratingId === selectedDoc.id}
                      onClick={() => handleRegenerate(selectedDoc)}
                    >
                      <RefreshCw
                        className={cn("size-3.5", regeneratingId === selectedDoc.id && "animate-spin")}
                      />
                      Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-1.5 text-(--status-exception) hover:border-(--status-exception)/30 hover:bg-(--status-exception)/5"
                      disabled={deletingId === selectedDoc.id}
                      onClick={() => handleDelete(selectedDoc)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
