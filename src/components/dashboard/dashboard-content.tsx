"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Car,
  Users,
  FileText,
  Plus,
  Calendar,
  MapPin,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Download,
  ScanSearch,
  Pause,
  Play,
  FileUp,
  SlidersHorizontal,
} from "lucide-react";
import {
  CheckCircleIcon,
  SpinnerGapIcon,
  StatusWarningIcon,
  ClockIcon as TallieClockIcon,
} from "@/components/watermelon/tallie-dashboard/components/tallie/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface TodayRide {
  id: string;
  rideNumber: string;
  time: string;
  pickup: string;
  destination: string;
  status: string;
  driver: { name: string } | null;
  vehicle: { make: string; model: string; plateNumber: string } | null;
  kashafDocuments: Array<{ id: string }>;
  _count: { passengers: number };
}

interface DashboardData {
  totalRides: number;
  todayRides: number;
  upcomingRides: number;
  completedRides: number;
  totalDrivers: number;
  totalVehicles: number;
  totalPassengers: number;
  kashafDocuments: number;
  todayRidesList: TodayRide[];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const DEFAULT_DASHBOARD_DATA: DashboardData = {
  totalRides: 0,
  todayRides: 0,
  upcomingRides: 0,
  completedRides: 0,
  totalDrivers: 0,
  totalVehicles: 0,
  totalPassengers: 0,
  kashafDocuments: 0,
  todayRidesList: [],
};

const STATUS_FILTERS = [
  { value: "ALL", label: "All statuses", icon: SlidersHorizontal },
  { value: "SCHEDULED", label: "Scheduled", icon: TallieClockIcon },
  { value: "IN_PROGRESS", label: "In Progress", icon: SpinnerGapIcon },
  { value: "COMPLETED", label: "Completed", icon: CheckCircleIcon },
  { value: "CANCELLED", label: "Cancelled", icon: StatusWarningIcon },
] as const;

function LiveBadge({
  live,
  size = "md",
}: {
  live: boolean;
  size?: "md" | "sm";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium",
        live
          ? "bg-(--live)/10 text-(--live)"
          : "bg-muted text-muted-foreground",
        size === "md" && "gap-1.5 px-3.5 py-2 text-xs leading-4.5",
        size === "sm" &&
          "gap-1 rounded-md px-2 py-1 text-[10px] leading-none"
      )}
    >
      <span
        className={cn(
          "rounded-full",
          live ? "bg-(--live)" : "bg-muted-foreground",
          size === "md" ? "size-2" : "size-1.5",
          live && "live-dot-pulse"
        )}
      />
      {live ? "Live" : "Paused"}
    </span>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        className: "text-(--status-completed)",
        Icon: CheckCircleIcon,
        spinning: false,
      };
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        className: "text-(--status-processing)",
        Icon: SpinnerGapIcon,
        spinning: true,
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        className: "text-(--status-exception)",
        Icon: StatusWarningIcon,
        spinning: false,
      };
    default:
      return {
        label: "Scheduled",
        className: "text-(--status-processing)",
        Icon: SpinnerGapIcon,
        spinning: false,
      };
  }
}

const tableHeadClassName =
  "h-12.5 bg-zinc-50 text-sm font-medium tracking-tight text-muted-foreground dark:bg-card";

export function DashboardContent({ initialData }: { initialData?: DashboardData }) {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [isLive, setIsLive] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedRide, setSelectedRide] = useState<TodayRide | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const userName = session?.user?.name?.split(" ")[0] || "there";

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const payload = await res.json();
      if (payload && typeof payload.totalRides === "number") {
        setData(payload);
        setLastSynced(new Date());
      } else if (!data) {
        setData(DEFAULT_DASHBOARD_DATA);
      }
    } catch {
      if (!data) setData(DEFAULT_DASHBOARD_DATA);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (!initialData) {
      fetchDashboard();
    } else {
      setLastSynced(new Date());
    }
  }, [initialData, fetchDashboard]);

  // Live auto-refresh every 10 seconds when Live mode is active
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => {
      fetchDashboard();
    }, 10000);
    return () => clearInterval(timer);
  }, [isLive, fetchDashboard]);

  const current = data || DEFAULT_DASHBOARD_DATA;

  const filteredRides = useMemo(() => {
    if (statusFilter === "ALL") return current.todayRidesList;
    return current.todayRidesList.filter((r) => r.status === statusFilter);
  }, [current.todayRidesList, statusFilter]);

  const activeFilterLabel =
    STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? "All statuses";

  function handleExportCsv() {
    const header = [
      "Status",
      "Ride Number",
      "Time",
      "Pickup",
      "Destination",
      "Driver",
      "Vehicle",
      "Passengers",
      "Kashaf PDF",
    ];
    const rows = filteredRides.map((r) => [
      r.status,
      r.rideNumber,
      r.time || "",
      r.pickup,
      r.destination,
      r.driver?.name || "Unassigned",
      r.vehicle ? `${r.vehicle.make} ${r.vehicle.model} (${r.vehicle.plateNumber})` : "Unassigned",
      String(r._count.passengers),
      r.kashafDocuments.length > 0 ? "Ready" : "Pending",
    ]);
    const csv = [header, ...rows]
      .map((cells) => cells.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rihal-rides-${statusFilter.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-8 animate-pulse">
        <div className="h-12 w-64 rounded-lg bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-xl border bg-card" />
          ))}
        </div>
        <div className="h-72 rounded-xl border bg-card" />
      </div>
    );
  }

  const primaryMetrics = [
    {
      id: "total-rides",
      label: "Total Rides",
      value: current.totalRides,
      icon: Car,
      trendValue: `${current.todayRides} today`,
      trendLabel: "in live feed",
      href: "/rides",
      isLiveMetric: true,
    },
    {
      id: "upcoming",
      label: "Upcoming Rides",
      value: current.upcomingRides,
      icon: Clock,
      trendValue: `${current.completedRides}`,
      trendLabel: "completed overall",
      href: "/rides",
      isLiveMetric: false,
    },
    {
      id: "drivers",
      label: "Active Drivers",
      value: current.totalDrivers,
      icon: Users,
      trendValue: `${current.totalPassengers}`,
      trendLabel: "registered passengers",
      href: "/drivers",
      isLiveMetric: false,
    },
    {
      id: "kashaf",
      label: "Kashaf PDFs",
      value: current.kashafDocuments,
      icon: FileText,
      trendValue: `${current.totalVehicles}`,
      trendLabel: "fleet vehicles",
      href: "/documents",
      isLiveMetric: false,
    },
  ];

  return (
    <div className="flex flex-col gap-9">
      {/* Tallie Hero Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">
            {getGreeting()}, {userName}
          </p>
          <h1 className="font-serif text-3xl leading-snug tracking-tight text-foreground">
            Rihal Next Operations
          </h1>
          <p className="text-base text-muted-foreground">
            Real-time overview of rides, fleet readiness, and Kashaf manifests
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <LiveBadge live={isLive} />

          <Button
            variant="default"
            className="h-9.5 gap-1.5 rounded-lg px-3.5"
            disabled={isLive}
            onClick={() => {
              setIsLive(true);
              fetchDashboard();
            }}
          >
            Live Sync
            <Play className="size-3.5" />
          </Button>

          <Button
            variant="outline"
            className="h-9.5 gap-1.5 rounded-lg px-3.5 shadow-xs"
            disabled={!isLive}
            onClick={() => setIsLive(false)}
          >
            Pause
            <Pause className="size-3.5" />
          </Button>

          <Link href="/rides/new">
            <Button variant="outline" className="h-9.5 gap-1.5 rounded-lg px-3.5 shadow-xs">
              <Plus className="size-4" />
              New Ride
            </Button>
          </Link>

          <Link href="/passengers">
            <Button variant="outline" className="h-9.5 gap-1.5 rounded-lg px-3.5 shadow-xs">
              <ScanSearch className="size-4" />
              Scan Visa
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight">Metrics</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/passengers"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add Passenger
            </Link>
            <span className="text-border">•</span>
            <Link
              href="/drivers"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add Driver
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {primaryMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Link
                key={metric.id}
                href={metric.href}
                className="group flex h-36 flex-col justify-between rounded-xl border border-border bg-zinc-50 p-4 transition-colors hover:bg-muted/60 dark:bg-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4.5 text-muted-foreground" />
                    <span className="text-sm font-medium tracking-tight text-foreground">
                      {metric.label}
                    </span>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-3xl leading-none font-medium tracking-tight text-foreground">
                    {metric.value}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs">
                    {metric.isLiveMetric ? (
                      <SpinnerGapIcon
                        className={cn(
                          "size-3.5 text-(--status-processing)",
                          isLive && "animate-spin"
                        )}
                      />
                    ) : (
                      <ArrowUpRight className="size-3.5 text-(--trend)" />
                    )}
                    <span className="font-medium text-foreground">
                      {metric.isLiveMetric && !isLive ? "Paused" : metric.trendValue}
                    </span>
                    <span className="text-muted-foreground">{metric.trendLabel}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Tallie Live Ride Feed Table */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-medium tracking-tight">Current Live Rides</h2>
              <LiveBadge live={isLive} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isLive
                ? `Live ride tracking with auto-refresh${
                    lastSynced
                      ? ` • Updated ${lastSynced.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}`
                      : ""
                  }`
                : "Live tracking paused — click Live Sync to resume"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              <DropdownMenuContent align="end" className="tallie-dashboard w-48">
                <DropdownMenuRadioGroup
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  {STATUS_FILTERS.map((filter) => {
                    const FilterIcon = filter.icon;
                    return (
                      <DropdownMenuRadioItem
                        key={filter.value}
                        value={filter.value}
                        className="gap-2 text-muted-foreground data-[state=checked]:font-medium data-[state=checked]:text-foreground"
                      >
                        <FilterIcon
                          className={cn(
                            "size-4",
                            filter.value === "IN_PROGRESS" && "text-(--status-processing)!",
                            filter.value === "COMPLETED" && "text-(--status-completed)!",
                            filter.value === "CANCELLED" && "text-(--status-exception)!"
                          )}
                        />
                        {filter.label}
                      </DropdownMenuRadioItem>
                    );
                  })}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              className="h-8.5 gap-1.5 rounded-lg px-3.5 shadow-xs"
              onClick={handleExportCsv}
              disabled={filteredRides.length === 0}
            >
              Export
              <FileUp className="size-3.5" />
            </Button>

            <Link
              href="/rides"
              className={buttonVariants({
                variant: "outline",
                className: "h-8.5 gap-1.5 rounded-lg px-3.5 shadow-xs",
              })}
            >
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-zinc-50/40 dark:bg-card/40">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(tableHeadClassName, "min-w-36 px-4")}>
                  Status
                </TableHead>
                <TableHead className={cn(tableHeadClassName, "min-w-40 px-3")}>
                  Ride ID
                </TableHead>
                <TableHead className={cn(tableHeadClassName, "min-w-48 px-3")}>
                  Route
                </TableHead>
                <TableHead className={cn(tableHeadClassName, "hidden min-w-44 px-3 md:table-cell")}>
                  Driver & Vehicle
                </TableHead>
                <TableHead className={cn(tableHeadClassName, "hidden min-w-48 px-3 lg:table-cell")}>
                  Manifest & Tags
                </TableHead>
                <TableHead className={cn(tableHeadClassName, "px-4 text-right")}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRides.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-36 px-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Calendar className="mb-2 size-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-foreground">
                        No rides match this filter today
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <Link
                          href="/rides/new"
                          className="font-medium text-foreground underline underline-offset-4"
                        >
                          Create a ride
                        </Link>{" "}
                        or switch the status filter
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRides.map((ride) => {
                  const hasKashaf = ride.kashafDocuments.length > 0;
                  const kashafDocId = ride.kashafDocuments[0]?.id;
                  const status = getStatusConfig(ride.status);
                  const StatusIcon = status.Icon;

                  return (
                    <TableRow
                      key={ride.id}
                      tabIndex={0}
                      onClick={() => setSelectedRide(ride)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedRide(ride);
                        }
                      }}
                      className="h-18 cursor-pointer bg-background transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="px-4 py-3.5">
                        <div
                          className={cn(
                            "inline-flex items-center gap-2 text-sm font-medium",
                            status.className
                          )}
                        >
                          <StatusIcon
                            className={cn(
                              "size-4 shrink-0",
                              status.spinning && isLive && "animate-spin"
                            )}
                          />
                          {status.label}
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-sm font-medium tracking-tight text-foreground">
                            {ride.rideNumber}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Time: {ride.time || "—"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm font-medium tracking-tight text-foreground">
                          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="max-w-[115px] truncate">{ride.pickup}</span>
                          <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                          <span className="max-w-[115px] truncate">{ride.destination}</span>
                        </div>
                      </TableCell>

                      <TableCell className="hidden px-3 py-3.5 md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium tracking-tight text-foreground">
                            {ride.driver?.name || (
                              <span className="italic text-muted-foreground">Unassigned</span>
                            )}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {ride.vehicle
                              ? `${ride.vehicle.make} • ${ride.vehicle.plateNumber}`
                              : "No vehicle"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="hidden px-3 py-3.5 lg:table-cell">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 text-xs font-medium tracking-tight",
                              hasKashaf
                                ? "bg-(--source-oracle)/15 text-(--source-oracle)"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {hasKashaf ? "Kashaf Ready" : "No Kashaf"}
                          </span>
                          <span className="rounded bg-(--source-sharepoint)/15 px-2 py-0.5 text-xs tracking-tight text-(--source-sharepoint)">
                            {ride._count.passengers} Pax
                          </span>
                          {ride.driver && (
                            <span className="rounded bg-(--source-concur)/15 px-2 py-0.5 text-xs tracking-tight text-(--source-concur)">
                              Assigned
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell
                        className="px-4 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {hasKashaf && kashafDocId && (
                            <a
                              href={`/api/documents/${kashafDocId}?download=true`}
                              className={buttonVariants({
                                variant: "outline",
                                size: "xs",
                                className: "h-7 gap-1 rounded-md px-2.5 text-xs",
                              })}
                            >
                              <Download className="size-3" /> PDF
                            </a>
                          )}
                          <Link
                            href={`/rides/${ride.id}`}
                            className={buttonVariants({
                              variant: "secondary",
                              size: "xs",
                              className: "h-7 gap-1 rounded-md px-2.5 text-xs",
                            })}
                          >
                            Open <ArrowRight className="size-3" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Slide-over Ride Quick-View Sheet */}
      <Sheet open={Boolean(selectedRide)} onOpenChange={(open) => !open && setSelectedRide(null)}>
        <SheetContent className="tallie-dashboard sm:max-w-md">
          {selectedRide && (
            <>
              <SheetHeader className="border-b border-border pb-4">
                <SheetTitle className="font-serif text-2xl font-normal">
                  Ride {selectedRide.rideNumber}
                </SheetTitle>
                <SheetDescription>
                  {selectedRide.pickup} → {selectedRide.destination}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-5 p-4 text-sm">
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-zinc-50 p-3.5 dark:bg-card">
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="mt-0.5 font-medium">{selectedRide.time || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Passengers</p>
                    <p className="mt-0.5 font-medium">{selectedRide._count.passengers} pax</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Driver</p>
                    <p className="mt-0.5 font-medium">
                      {selectedRide.driver?.name || "Unassigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="mt-0.5 font-medium">
                      {selectedRide.vehicle
                        ? `${selectedRide.vehicle.make} (${selectedRide.vehicle.plateNumber})`
                        : "Unassigned"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link href={`/rides/${selectedRide.id}`} className="w-full">
                    <Button variant="default" className="w-full justify-between">
                      Open Full Ride Details
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  {selectedRide.kashafDocuments[0]?.id && (
                    <a
                      href={`/api/documents/${selectedRide.kashafDocuments[0].id}?download=true`}
                      className="w-full"
                    >
                      <Button variant="outline" className="w-full justify-between">
                        Download Kashaf PDF
                        <Download className="size-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
