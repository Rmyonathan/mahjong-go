import type { FormResult } from "@/lib/mock/jade-board"
import { cn } from "@/lib/utils"

export function FormSquares({
  form,
  className,
}: {
  form: FormResult[]
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-1", className)} aria-label="Form">
      {form.map((result, index) => (
        <span
          key={`${result}-${index}`}
          title={result}
          className={cn(
            "size-2.5 border border-jade-ink",
            result === "W" && "bg-jade-accent",
            result === "L" && "bg-jade-red",
            result === "D" && "bg-muted",
          )}
        />
      ))}
    </div>
  )
}
