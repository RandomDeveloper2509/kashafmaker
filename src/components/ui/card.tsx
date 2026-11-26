import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, X, AlertTriangle } from "lucide-react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("border-b border-border px-6 py-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return <h3 className={cn("text-base font-semibold text-foreground", className)}>{children}</h3>;
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
  href,
  actionLabel,
  color = "indigo",
}: {
  title: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: string;
  className?: string;
  href?: string;
  actionLabel?: string;
  color?: "indigo" | "emerald" | "amber" | "blue" | "violet";
}) {
  const colorMap = {
    indigo: { icon: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400", dot: "bg-indigo-600" },
    emerald: { icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400", dot: "bg-emerald-600" },
    amber: { icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400", dot: "bg-amber-600" },
    blue: { icon: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400", dot: "bg-blue-600" },
    violet: { icon: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400", dot: "bg-violet-600" },
  };
  const c = colorMap[color];

  const cardContent = (
    <Card
      className={cn(
        "transition-all duration-200",
        href && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer group",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            <p className="mt-1.5 text-3xl font-bold text-foreground tracking-tight">{value}</p>
            {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
          </div>
          {Icon && (
            <div className={cn("rounded-xl p-2.5 shrink-0", c.icon)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        {href && (
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
            <span>{actionLabel || "View all"}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href} className="block">{cardContent}</Link>;
  return cardContent;
}

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
    warning: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
    danger: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60",
    info: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60",
    purple: "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/60",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ status }: { status: "success" | "warning" | "danger" | "info" | "default" }) {
  const colors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
    default: "bg-muted-foreground",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", colors[status])} />;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {icon && <div className="mb-4 text-muted-foreground/50">{icon}</div>}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-7 w-7 animate-spin rounded-full border-[3px] border-border border-t-indigo-600 dark:border-t-indigo-400",
        className
      )}
    />
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  overlayClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  overlayClassName?: string;
}) {
  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center", overlayClassName)}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl animate-slide-up",
          sizes[size],
          "mx-4 max-h-[90vh] overflow-y-auto"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 w-full sm:max-w-sm mx-4 rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl animate-slide-up">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end px-6 pb-5 border-t border-border pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}