import type { ReactNode } from "react";

// Shared control styling for every lead-gen form's inputs/selects/textareas
// -- sharp theme-token corners, a navy focus ring, and a red variant that
// only appears once a field has actually failed validation.
const FIELD_BASE =
  "w-full rounded-[var(--radius-button)] border bg-white px-4 py-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400";
const FIELD_OK = "border-gray-300 focus:border-emerald-900 focus:ring-emerald-900/10";
const FIELD_ERROR = "border-red-400 focus:border-red-500 focus:ring-red-500/10";

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
