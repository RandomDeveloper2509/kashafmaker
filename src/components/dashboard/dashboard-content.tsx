"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Car,
  Users,
  Truck,
  UserCircle,
  FileText,
  Plus,
  Calendar,
  MapPin,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  ScanSearch,
  SlidersHorizontal,
  AlertCircle,
  Loader2,
} from "lucide-react";
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
  { value: "ALL", label: "All statuses" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

function getStatusDisplay(status: string) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        className: "text-(--status-completed)",
        Icon: CheckCircle2,
      };
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        className: "text-(--status-processing)",
        Icon: Loader2,
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        className: "text-(--status-exception)",
        Icon: AlertCircle,
      };
    default:
      return {
        label: status.replace("_", " "),
        className: "text-amber-600",
        Icon: Clock,
      };
  }
}

export function DashboardContent({ initialData }: { initialData?: DashboardData }) {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedRide, setSelectedRide] = useState<TodayRide | null>(null);

  const userName = session?.user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    if (initialData) return;
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((payload) => {
        if (payload && typeof payload.totalRides === "number") {
          setData(payload);
        } else {
          setData(DEFAULT_DASHBOARD_DATA);
        }
      })
      .catch(() => {
        setData(DEFAULT_DASHBOARD_DATA);
      })
      .finally(() => setLoading(false));
  }, [initialData]);

  const current = data || DEFAULT_DASHBOARD_DATA;

  const filteredRides = useMemo(() => {
    if (statusFilter === "ALL") return current.todayRidesList;
    return current.todayRidesList.filter((r) => r.status === statusFilter);
  }, [current.todayRidesList, statusFilter]);

  const activeFilterLabel =
    STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? "All statuses";

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
      trendLabel: "scheduled",
      href: "/rides",
      actionLabel: "View all rides",
    },
    {
      id: "upcoming",
      label: "Upcoming Rides",
      value: current.upcomingRides,
      icon: Clock,
      trendValue: `${current.completedRides}`,
      trendLabel: "completed overall",
      href: "/rides",
      actionLabel: "Open schedule",
    },
    {
      id: "drivers",
      label: "Active Drivers",
      value: current.totalDrivers,
      icon: Users,
      trendValue: `${current.totalPassengers}`,
      trendLabel: "registered passengers",
      href: "/drivers",
      actionLabel: "Manage drivers",
    },
    {
      id: "kashaf",
      label: "Kashaf PDFs",
      value: current.kashafDocuments,
      icon: FileText,
      trendValue: `${current.totalVehicles}`,
      trendLabel: "fleet vehicles",
      href: "/documents",
      actionLabel: "View documents",
    },
  ];

  return (
    <div className="flex flex-col gap-9">
      {/* Tallie Hero Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">{getGreeting()}, {userName}</p>
          <h1 className="font-serif text-3xl leading-snug tracking-tight text-foreground">
            Rihal Next Operations
          </h1>
          <p className="text-base text-muted-foreground">
            Real-time overview of rides, fleet readiness, and Kashaf manifests
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-(--live)/10 px-3.5 py-2 text-xs font-medium text-(--live)">
            <span className="size-2 rounded-full bg-(--live) live-dot-pulse" />
            Live
          </span>

          <Link href="/rides/new">
            <Button variant="default" className="h-9.5 gap-1.5 rounded-lg px-3.5">
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
                  <div className="flex items-center gap-1 text-xs">
                    <ArrowUpRight className="size-3.5 text-(--trend)" />
                    <span className="font-medium text-foreground">{metric.trendValue}</span>
                    <span className="text-muted-foreground">{metric.trendLabel}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Today's Rides Table */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium tracking-tight">Today&apos;s Rides</h2>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {filteredRides.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
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
              <DropdownMenuContent align="end" className="tallie-dashboard w-48">
                <DropdownMenuRadioGroup
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  {STATUS_FILTERS.map((filter) => (
                    <DropdownMenuRadioItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

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

        {filteredRides.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-zinc-50/50 py-14 text-center dark:bg-card/50">
            <Calendar className="mb-3 size-9 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No rides scheduled today</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <Link href="/rides/new" className="font-medium text-foreground underline underline-offset-4">
                Create a ride
              </Link>{" "}
              to get started
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 bg-zinc-50 px-4 text-xs font-medium tracking-tight text-muted-foreground dark:bg-card">
                    Ride
                  </TableHead>
                  <TableHead className="h-11 bg-zinc-50 px-4 text-xs font-medium tracking-tight text-muted-foreground dark:bg-card">
                    Route
                  </TableHead>
                  <TableHead className="hidden h-11 bg-zinc-50 px-4 text-xs font-medium tracking-tight text-muted-foreground md:table-cell dark:bg-card">
                    Driver
                  </TableHead>
                  <TableHead className="hidden h-11 bg-zinc-50 px-4 text-xs font-medium tracking-tight text-muted-foreground lg:table-cell dark:bg-card">
                    Vehicle
                  </TableHead>
                  <TableHead className="h-11 bg-zinc-50 px-4 text-xs font-medium tracking-tight text-muted-foreground dark:bg-card">
                    Status
                  </TableHead>
                  <TableHead className="h-11 bg-zinc-50 px-4 text-right text-xs font-medium tracking-tight text-muted-foreground dark:bg-card">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRides.map((ride) => {
                  const hasKashaf = ride.kashafDocuments.length > 0;
                  const kashafDocId = ride.kashafDocuments[0]?.id;
                  const statusInfo = getStatusDisplay(ride.status);
                  const StatusIcon = statusInfo.Icon;

                  return (
                    <TableRow
                      key={ride.id}
                      onClick={() => setSelectedRide(ride)}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                    >
                      <TableCell className="px-4 py-3.5">
                        <div>
                          <p className="font-mono text-xs font-medium text-foreground">
                            {ride.rideNumber}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {ride._count.passengers} pax • {ride.time || "—"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-foreground">
                          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="max-w-[120px] truncate font-medium">{ride.pickup}</span>
                          <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                          <span className="max-w-[120px] truncate">{ride.destination}</span>
                        </div>
                      </TableCell>

                      <TableCell className="hidden px-4 py-3.5 md:table-cell">
                        {ride.driver?.name ? (
                          <div className="flex items-center gap-2">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                              {ride.driver.name.charAt(0)}
                            </div>
                            <span className="max-w-[120px] truncate text-xs font-medium text-foreground">
                              {ride.driver.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden px-4 py-3.5 lg:table-cell">
                        {ride.vehicle ? (
                          <div className="text-xs">
                            <p className="font-medium text-foreground">
                              {ride.vehicle.make} {ride.vehicle.model}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {ride.vehicle.plateNumber}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3.5">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", statusInfo.className)}>
                          <StatusIcon className={cn("size-3.5", ride.status === "IN_PROGRESS" && "animate-spin")} />
                          {statusInfo.label}
                        </span>
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
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Slide-over Ride Quick-View Sheet (Tallie style) */}
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
