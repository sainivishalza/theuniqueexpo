"use client";

import { useState } from "react";
import { fieldClasses } from "@/components/ui/FormField";

// A password box with a Show / Hide button, so a mistyped password can be checked by eye.
export default function PasswordInput({
  id, label, value, onChange, autoComplete, showLabel, hideLabel, describedBy,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string;
  showLabel: string; hideLabel: string; describedBy?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          className={`${fieldClasses()} pr-20`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-controls={id}
          className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          {shown ? hideLabel : showLabel}
        </button>
      </div>
    </div>
  );
}
