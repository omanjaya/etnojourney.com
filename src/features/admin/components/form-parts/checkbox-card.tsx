import { cn } from "@/lib/utils";

/** Large checkbox with a title and hint, used for publish/feature flags. */
export function CheckboxCard({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors",
        checked
          ? "border-terracotta bg-terracotta-light/40"
          : "border-line hover:border-sand-300 bg-white",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-terracotta mt-0.5 size-4"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-muted block text-xs">{hint}</span>
      </span>
    </label>
  );
}
