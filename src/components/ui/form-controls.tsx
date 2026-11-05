import {
  cloneElement,
  isValidElement,
  type AriaAttributes,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

// Invalid controls already have a red border, so focus adds a solid red ring
// that stands out from the unfocused invalid state.
const controlBase =
  "w-full rounded-xl border border-line bg-white px-4 text-sm text-ink transition-colors placeholder:text-muted/70 hover:border-sand-300 focus:border-terracotta focus:ring-4 focus:ring-terracotta/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger aria-invalid:focus:ring-2 aria-invalid:focus:ring-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlBase, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlBase, "min-h-28 py-3", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        controlBase,
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%237a7166%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] h-12 appearance-none bg-[position:right_1rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-ink-soft text-sm font-medium", className)} {...props} />;
}

/** Space-separated id list for `aria-describedby`, without blanks or duplicates. */
export function joinIds(...ids: (string | false | null | undefined)[]): string | undefined {
  const unique = [...new Set(ids.flatMap((id) => (id ? id.split(/\s+/) : [])).filter(Boolean))];
  return unique.length > 0 ? unique.join(" ") : undefined;
}

/**
 * `aria-describedby` for a control inside <Field>: its hint and its error.
 * Field wires its own Input/Select/Textarea child; pass this to custom controls.
 */
export function fieldDescribedBy(
  htmlFor: string,
  { hint, error }: { hint?: string; error?: string },
) {
  return joinIds(hint && `${htmlFor}-hint`, error && `${htmlFor}-error`);
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

type ControlProps = Pick<AriaAttributes, "aria-describedby" | "aria-invalid"> & { id?: string };

const wiredControls: unknown[] = [Input, Select, Textarea];

/**
 * Label + control + hint + error. The label gets the id `${htmlFor}-label`, the
 * hint `${htmlFor}-hint` and the error `${htmlFor}-error`. A single
 * Input/Select/Textarea child with `id={htmlFor}` is wired automatically
 * (aria-describedby to the hint and error, aria-invalid on error); ids it
 * already sets are kept. The hint stays visible next to an error, because it
 * usually explains the rule the error is about.
 */
export function Field({ label, htmlFor, error, hint, children, className }: FieldProps) {
  const describedBy = fieldDescribedBy(htmlFor, { hint, error });
  const control =
    isValidElement<ControlProps>(children) &&
    wiredControls.includes(children.type) &&
    children.props.id === htmlFor
      ? cloneElement(children, {
          "aria-describedby": joinIds(children.props["aria-describedby"], describedBy),
          "aria-invalid": children.props["aria-invalid"] ?? (error ? true : undefined),
        })
      : children;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label id={`${htmlFor}-label`} htmlFor={htmlFor}>
        {label}
      </Label>
      {control}
      {hint && (
        <p id={`${htmlFor}-hint`} className="text-muted text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="text-danger text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
