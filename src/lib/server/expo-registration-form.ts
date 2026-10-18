import { validateExpoRegistration, type ExpoRegistrationInput } from "@/lib/expo-registrations";
import { validateCustomAnswers, type CustomFormSchema } from "@/lib/custom-registration-form";

export type FormSubmission =
  | { kind: "default"; input: ExpoRegistrationInput }
  | { kind: "custom"; answers: Record<string, unknown>; schema: CustomFormSchema };

// Checks a submitted sign-up form against the exhibition's own form (the fixed
// Buyer/Visitor form, or the custom form an admin built). Used both for a new
// registration and for a buyer editing one that is still waiting for review.
export function parseFormSubmission(
  exhibition: { id: string; registrationFormSchema: CustomFormSchema | null },
  customAnswers: Record<string, unknown> | undefined,
  defaultFields: Partial<ExpoRegistrationInput>
): { error: string } | { form: FormSubmission } {
  const schema = exhibition.registrationFormSchema;
  if (schema && schema.length > 0) {
    const error = validateCustomAnswers(schema, customAnswers || {});
    if (error) return { error };
    return { form: { kind: "custom", answers: customAnswers || {}, schema } };
  }
  const error = validateExpoRegistration(defaultFields);
  if (error) return { error };
  return { form: { kind: "default", input: { ...(defaultFields as ExpoRegistrationInput), exhibitionId: Number(exhibition.id) } } };
}
