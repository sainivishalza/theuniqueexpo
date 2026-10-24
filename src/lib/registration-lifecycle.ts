// What happens to an exhibition registration after the sign-up form.
// Shared by the API routes (which enforce it) and the screens (which only use
// it to decide which buttons to show), so the two can never disagree.

export type RegistrationStatus =
  | "pending"
  | "approved"
  | "confirmed"
  | "attended"
  | "rejected"
  | "cancelled"
  | "absent";

// "expired" is never stored: an approved registration whose confirm-by date
// has passed simply reads as expired.
export type EffectiveStatus = RegistrationStatus | "expired";

export const REGISTRATION_STATUSES: RegistrationStatus[] = [
  "pending", "approved", "confirmed", "attended", "rejected", "cancelled", "absent",
];

export function isRegistrationStatus(value: unknown): value is RegistrationStatus {
  return typeof value === "string" && (REGISTRATION_STATUSES as string[]).includes(value);
}

export interface RegistrationActions {
  edit: boolean;
  cancel: boolean;
  confirm: boolean;
  feedback: boolean;
}

export function availableActions(input: {
  status: EffectiveStatus;
  checkedIn: boolean;
  feedbackGiven: boolean;
  expoEnded: boolean;
}): RegistrationActions {
  const { status, checkedIn, feedbackGiven, expoEnded } = input;
  return {
    edit: status === "pending",
    cancel: status === "pending" || status === "approved" || (status === "confirmed" && !checkedIn && !expoEnded),
    confirm: status === "approved" && !expoEnded,
    // After the show: people who checked in, and (when the organiser did not
    // run check-in) people who had confirmed.
    feedback: !feedbackGiven && (status === "attended" || (status === "confirmed" && expoEnded)),
  };
}

// A registration the buyer has withdrawn can be submitted again.
export function canRegisterAgain(status: EffectiveStatus): boolean {
  return status === "cancelled";
}

// Printable documents: the visa invitation letter once the registration is approved, the e-ticket / badge once the
// buyer has confirmed attending (an approval whose confirm-by day passed reads as "expired" and gets neither).
export const canGetInvitation = (status: EffectiveStatus): boolean => status === "approved" || status === "confirmed" || status === "attended";
export const canGetTicket = (status: EffectiveStatus): boolean => status === "confirmed" || status === "attended";

export const MAX_ARRIVAL_NOTE_LENGTH = 500;
export const MAX_FEEDBACK_LENGTH = 1000;

export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// The next exhibition of the same series, offered to someone who attended an edition.
export interface NextEdition {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  /** Last day to register, when there is a deadline. */
  closes: string | null;
}

// The buyer-facing view of one registration. No uploaded documents here --
// those are only ever sent to the admin screen and to the owner's own edit form.
export interface MyRegistration {
  id: string;
  /** Pending and waiting for a place (the exhibition has taken all its buyers). */
  waitlisted?: boolean;
  /** The exhibition refunds train tickets bought by the buyer themselves, and the buyer is approved for it. */
  ticketRefund?: boolean;
  /** The buyer's passport / visa on file will not cover this exhibition (see document-expiry). */
  documentWarnings?: ("passport" | "visa")[];
  /** Set on an edition the buyer attended: the next edition of the same series, open for registration. */
  nextEdition?: NextEdition;
  exhibitionId: number;
  exhibitionSlug: string;
  exhibitionTitle: string;
  exhibitionStart: string;
  exhibitionEnd: string;
  status: EffectiveStatus;
  registrationType: string | null;
  usesCustomForm: boolean;
  createdAt: string;
  approvedAt: string | null;
  confirmBy: string | null;
  confirmedAt: string | null;
  arrivalDate: string | null;
  arrivalNote: string | null;
  hasTicket: boolean;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  cancelledAt: string | null;
  feedbackRating: number | null;
  feedbackComment: string | null;
  feedbackAt: string | null;
  actions: RegistrationActions;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

export interface ConfirmAttendanceInput {
  arrivalDate?: string;
  arrivalNote?: string;
  docTicket?: string;
}

export function validateConfirmInput(input: ConfirmAttendanceInput, isValidDocument: (v: unknown) => boolean): string | null {
  if (input.arrivalDate && !isValidDateOnly(input.arrivalDate)) return "Please enter a valid arrival date";
  if (input.arrivalNote && input.arrivalNote.length > MAX_ARRIVAL_NOTE_LENGTH) {
    return `Arrival notes can be at most ${MAX_ARRIVAL_NOTE_LENGTH} characters`;
  }
  if (input.docTicket && !isValidDocument(input.docTicket)) {
    return "Your ticket isn't a valid image or PDF file";
  }
  return null;
}

export function validateFeedback(rating: unknown, comment: unknown): string | null {
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Please choose a rating from 1 to 5";
  }
  if (comment !== undefined && comment !== null && typeof comment !== "string") return "Invalid comment";
  if (typeof comment === "string" && comment.length > MAX_FEEDBACK_LENGTH) {
    return `Comments can be at most ${MAX_FEEDBACK_LENGTH} characters`;
  }
  return null;
}
