"use client";

import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  Car,
  Users,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Loader2,
  SlidersHorizontal,
  Calendar,
  ArrowUpRight,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";
import {
  CheckCircleIcon,
  SpinnerGapIcon,
  StatusWarningIcon,
  ClockIcon as TallieClockIcon,
} from "@/components/watermelon/tallie-dashboard/components/tallie/icons";
import Link from "next/link";

interface DashboardStats {
  totalRides: number;
  completedRides: number;
  upcomingRides: number;
  todayRides: number;
  totalDrivers: number;
  totalVehicles: number;
  totalPassengers: number;
  kashafDocuments: number;
  todayRidesList: Array<{
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
  }>;
}

const tableHeadClassName =
  "h-12.5 bg-zinc-50 text-sm font-medium tracking-tight text-muted-foreground dark:bg-card";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--status-completed)">
          <CheckCircleIcon className="size-3.5" /> Completed
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--status-processing)">
          <SpinnerGapIcon className="size-3.5 animate-spin" /> In Progress
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--status-exception)">
          <StatusWarningIcon className="size-3.5" /> Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
          <TallieClockIcon className="size-3.5" /> Scheduled
        </span>
      );
  }
}

// Mini bar chart using CSS
function MiniBarChart({
  data,
  max,
  color = "bg-foreground",
}: {
  data: { label: string; value: number }[];
  max: number;
  color?: string;
}) {
  return (
    <div className="flex h-20 items-end gap-1">
      {data.map((d, i) => {
        const pct = max > 0 ? Math.round((d.value / max) * 100) : 0;
        return (
          <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
            <div
              className={cn("w-full rounded-t transition-all", color)}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-[9px] text-muted-foreground">{d.label}</span>
            {/* Tooltip */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
              <span className="rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background whitespace-nowrap">
                {d.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Donut chart using SVG
function DonutChart({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-28 items-center justify-center text-xs text-muted-foreground">
        No data yet
      </div>
    );
  }
  const r = 40;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;
  let cumulativePercent = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="size-28 -rotate-90">
        {segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const percent = seg.value / total;
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const strokeDashoffset = -cumulativePercent * circumference;
          cumulativePercent += percent;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
            />
          );
        })}
        {/* Center hole */}
        <circle cx={cx} cy={cy} r="30" fill="var(--color-background, #fff)" />
      </svg>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-semibold text-foreground ml-auto pl-2">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [exporting, setExporting] = useState(false);

  // Date range for Excel export — default: last 30 days
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setStats(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const rides = stats?.todayRidesList ?? [];

  const filteredRides = useMemo(() => {
    if (statusFilter === "ALL") return rides;
    return rides.filter((r) => r.status === statusFilter);
  }, [rides, statusFilter]);

  // Computed analytics
  const completionRate =
    (stats?.totalRides ?? 0) > 0
      ? Math.round(((stats?.completedRides ?? 0) / (stats?.totalRides ?? 1)) * 100)
      : 0;

  const kashafCoverage =
    (stats?.totalRides ?? 0) > 0
      ? Math.round(((stats?.kashafDocuments ?? 0) / (stats?.totalRides ?? 1)) * 100)
      : 0;

  // Status breakdown for donut chart
  const statusSegments = [
    {
      label: "Completed",
      value: stats?.completedRides ?? 0,
      color: "var(--status-completed, #16a34a)",
    },
    {
      label: "Upcoming",
      value: stats?.upcomingRides ?? 0,
      color: "var(--status-processing, #2762ea)",
    },
    {
      label: "Today",
      value: stats?.todayRides ?? 0,
      color: "#f59e0b",
    },
  ];

  // Mini bar: today's rides by status
  const todayStatusCounts = useMemo(() => {
    const c = { SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
    rides.forEach((r) => {
      if (r.status in c) c[r.status as keyof typeof c]++;
    });
    return [
      { label: "Sched.", value: c.SCHEDULED },
      { label: "Active", value: c.IN_PROGRESS },
      { label: "Done", value: c.COMPLETED },
      { label: "Canc.", value: c.CANCELLED },
    ];
  }, [rides]);
  const barMax = Math.max(...todayStatusCounts.map((d) => d.value), 1);

  async function handleExportExcel() {
    if (!startDate || !endDate) return;
    setExporting(true);
    try {
      const url = `/api/rides/export?startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Rihal_Rides_${startDate}_to_${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const activeFilterLabel =
    statusFilter === "ALL"
      ? "All statuses"
      : statusFilter.replace("_", " ").charAt(0) +
        statusFilter.replace("_", " ").slice(1).toLowerCase();

  return (
    <AppLayout>
      <div className="flex flex-col gap-9">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-3xl leading-snug tracking-tight text-foreground">
              Operations Report
            </h1>
            <p className="text-base text-muted-foreground">
              Fleet performance, ride analytics, and Kashaf coverage at a glance
            </p>
          </div>

          {/* Excel Export */}
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                From
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8.5 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                To
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8.5 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50"
              />
            </div>
            <Button
              variant="default"
              className="h-8.5 gap-1.5 rounded-lg px-3.5 shadow-xs self-end"
              disabled={exporting || !startDate || !endDate}
              onClick={handleExportExcel}
            >
              {exporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-3.5" />
              )}
              Export Excel
            </Button>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Rides",
              value: stats?.totalRides ?? 0,
              icon: Car,
              trend: `${stats?.todayRides ?? 0} today`,
              trendUp: (stats?.todayRides ?? 0) > 0,
              href: "/rides",
            },
            {
              label: "Completion Rate",
              value: `${completionRate}%`,
              icon: CheckCircle2,
              trend: `${stats?.completedRides ?? 0} completed`,
              trendUp: completionRate > 70,
              href: "/rides",
            },
            {
              label: "Active Drivers",
              value: stats?.totalDrivers ?? 0,
              icon: Users,
              trend: `${stats?.totalVehicles ?? 0} vehicles`,
              trendUp: (stats?.totalDrivers ?? 0) > 0,
              href: "/drivers",
            },
            {
              label: "Kashaf Coverage",
              value: `${kashafCoverage}%`,
              icon: FileText,
              trend: `${stats?.kashafDocuments ?? 0} generated`,
              trendUp: kashafCoverage > 80,
              href: "/documents",
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Link
                key={metric.label}
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
                <div className="flex flex-col gap-1.5">
                  <p className="text-3xl font-medium leading-none tracking-tight text-foreground">
                    {loading ? (
                      <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" />
                    ) : (
                      metric.value
                    )}
                  </p>
                  <div className="flex items-center gap-1 text-xs">
                    {metric.trendUp ? (
                      <TrendingUp className="size-3.5 text-(--trend)" />
                    ) : (
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    )}
                    <span className="font-medium text-foreground">{metric.trend}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Analytics Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Fleet Summary */}
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-zinc-50 p-5 dark:bg-card">
            <div>
              <h2 className="text-base font-medium tracking-tight text-foreground">Fleet Summary</h2>
              <p className="text-xs text-muted-foreground">Registered resources</p>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: "Drivers", value: stats?.totalDrivers ?? 0, icon: Users, color: "text-(--status-processing)" },
                { label: "Vehicles", value: stats?.totalVehicles ?? 0, icon: Car, color: "text-(--status-completed)" },
                { label: "Passengers", value: stats?.totalPassengers ?? 0, icon: Users, color: "text-amber-600" },
                { label: "Kashaf Docs", value: stats?.kashafDocuments ?? 0, icon: FileText, color: "text-(--source-oracle)" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-4", item.color)} />
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {loading ? "—" : item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ride Status Donut */}
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-zinc-50 p-5 dark:bg-card">
            <div>
              <h2 className="text-base font-medium tracking-tight text-foreground">Ride Breakdown</h2>
              <p className="text-xs text-muted-foreground">Status distribution</p>
            </div>
            {loading ? (
              <div className="flex h-28 items-center justify-center">
                <SpinnerGapIcon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DonutChart segments={statusSegments} />
            )}
          </div>

          {/* Today's Bar Chart */}
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-zinc-50 p-5 dark:bg-card">
            <div>
              <h2 className="text-base font-medium tracking-tight text-foreground">
                Today&apos;s Activity
              </h2>
              <p className="text-xs text-muted-foreground">
                {stats?.todayRides ?? 0} ride{(stats?.todayRides ?? 0) !== 1 ? "s" : ""} today
              </p>
            </div>
            {loading ? (
              <div className="flex h-20 items-end gap-1">
                {[70, 40, 90, 25].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 animate-pulse rounded-t bg-muted"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            ) : (
              <MiniBarChart
                data={todayStatusCounts}
                max={barMax}
                color="bg-foreground/80"
              />
            )}

            <div className="mt-auto rounded-lg border border-border bg-background px-3 py-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Completion rate</span>
                <span className="font-semibold text-foreground">{completionRate}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Today's Rides Table */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium tracking-tight text-foreground">
                  Today&apos;s Rides
                </h2>
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
                  <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                    {["ALL", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((v) => (
                      <DropdownMenuRadioItem key={v} value={v}>
                        {v === "ALL" ? "All statuses" : v.replace("_", " ")}
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
                All rides <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-zinc-50/40 dark:bg-card/40">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(tableHeadClassName, "px-4")}>Ride</TableHead>
                  <TableHead className={cn(tableHeadClassName, "px-3")}>Route</TableHead>
                  <TableHead className={cn(tableHeadClassName, "hidden px-3 md:table-cell")}>Driver</TableHead>
                  <TableHead className={cn(tableHeadClassName, "hidden px-3 lg:table-cell")}>Vehicle</TableHead>
                  <TableHead className={cn(tableHeadClassName, "px-3")}>Status</TableHead>
                  <TableHead className={cn(tableHeadClassName, "px-4 text-right")}>Pax / Kashaf</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="h-28 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <SpinnerGapIcon className="size-6 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading…</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRides.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="h-28 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="size-7 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-foreground">No rides today</p>
                        <Link href="/rides/new" className="text-xs text-muted-foreground underline underline-offset-4">
                          Create a ride
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRides.map((ride) => {
                    const hasKashaf = ride.kashafDocuments.length > 0;
                    const kashafId = ride.kashafDocuments[0]?.id;
                    return (
                      <TableRow
                        key={ride.id}
                        className="h-16 bg-background transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="px-4 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs font-medium text-foreground">
                              {ride.rideNumber}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {ride.time || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <div className="flex max-w-[200px] items-center gap-1 text-xs font-medium text-foreground">
                            <span className="truncate">{ride.pickup}</span>
                            <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                            <span className="truncate">{ride.destination}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden px-3 py-3.5 md:table-cell">
                          <span className="text-xs font-medium text-foreground">
                            {ride.driver?.name ?? (
                              <span className="italic text-muted-foreground">Unassigned</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="hidden px-3 py-3.5 lg:table-cell">
                          <span className="font-mono text-xs text-muted-foreground">
                            {ride.vehicle?.plateNumber ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3.5">
                          <StatusBadge status={ride.status} />
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-flex items-center gap-1 rounded bg-(--source-sharepoint)/15 px-2 py-0.5 text-xs font-medium text-(--source-sharepoint)">
                              {ride._count.passengers} pax
                            </span>
                            {hasKashaf && kashafId ? (
                              <a
                                href={`/api/documents/${kashafId}?download=true`}
                                className={buttonVariants({
                                  variant: "outline",
                                  size: "xs",
                                  className: "h-7 gap-1 rounded-md px-2 text-xs",
                                })}
                              >
                                <Download className="size-3" /> PDF
                              </a>
                            ) : (
                              <span className="text-xs italic text-muted-foreground">No PDF</span>
                            )}
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

        {/* Footer Note */}
        <div className="rounded-xl border border-border bg-zinc-50/60 px-5 py-4 text-sm text-muted-foreground dark:bg-card/40">
          <p>
            <span className="font-medium text-foreground">Note: </span>
            Historical Kashaf documents keep a snapshot of driver, vehicle, company, and passenger
            details at generation time. Later profile changes do not alter previously generated PDFs.
            Use the{" "}
            <span className="font-medium text-foreground">Export Excel</span> button above to
            download a full ride log for any date range.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
