import * as React from "react"
import { cn } from "cn"

interface InputProps extends React.ComponentProps<"input"> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, id, ...props }, ref) => {
    const inputEl = (
      <input
        ref={ref}
        id={id}
        type={type}
        data-slot="input"
        className={cn(
          "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
          className
        )}
        {...props}
      />
    )

    if (!label && !error) return inputEl

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        {inputEl}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 dark:bg-input/30",
            error && "border-red-500",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-popover text-popover-foreground">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Select.displayName = "Select"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 min-h-[80px] dark:bg-input/30",
            error && "border-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Input, Select, Textarea }