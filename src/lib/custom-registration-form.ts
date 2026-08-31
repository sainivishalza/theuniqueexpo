export type CustomFieldType = "text" | "textarea" | "radio" | "checkbox" | "file";

export interface CustomFormField {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  helpText?: string;
  options?: string[]; // for "radio" (single choice) and "checkbox" (multiple choice)
}

export type CustomFormSchema = CustomFormField[];

export function newFieldId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isChoiceType(type: CustomFieldType): boolean {
  return type === "radio" || type === "checkbox";
}

export function validateCustomAnswers(
  schema: CustomFormSchema,
  answers: Record<string, unknown>
): string | null {
  for (const field of schema) {
    const value = answers[field.id];
    if (!field.required) continue;

    if (field.type === "checkbox") {
      if (!Array.isArray(value) || value.length === 0) {
        return `Please answer: ${field.label}`;
      }
    } else if (value === undefined || value === null || String(value).trim() === "") {
      return `Please answer: ${field.label}`;
    }
  }
  return null;
}
