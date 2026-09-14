import type { ReactNode } from "react";

// Shared control styling for every lead-gen form's inputs/selects/textareas
// -- sharp theme-token corners, a navy focus ring, and a red variant that
// only appears once a field has actually failed validation.
const FIELD_BASE =
  "w-full rounded-[var(--radius-button)] border bg-white px-4 py-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400";
// A firmer default border (not pale gray) reads more structured/
// authoritative, matching the rest of the editorial system.
const FIELD_OK = "border-gray-700 focus:border-emerald-900 focus:ring-emerald-900/10";
// Border marks the error in red; the focus ring still uses the site's one
// accent color (amber) rather than red, so "where to fix this" stays
// visually consistent with every other focus state on the page.
const FIELD_ERROR = "border-red-600 focus:border-red-600 focus:ring-gold-500/30";

export function fieldClasses(hasError?: boolean, extra = ""): string {
  return `${FIELD_BASE} ${hasError ? FIELD_ERROR : FIELD_OK} ${extra}`;
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}

// Label + control + inline error, sharing one layout rhythm across every
// form built on top of fieldClasses() rather than each page retyping its
// own label/spacing/error markup.
export default function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
