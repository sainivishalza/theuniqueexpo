export type BoothStatus = "available" | "booked" | "held";

export interface Booth {
  id: string;
  row: string;
  col: number;
  size: "standard" | "gold" | "platinum";
  price: number;
  status: BoothStatus;
  exhibitionId: string;
  exhibitorId?: string;
  exhibitorName?: string;
}

export interface BoothBooking {
  id: string;
  boothId: string;
  exhibitionId: string;
  exhibitorId: string;
  exhibitorName: string;
  status: "pending" | "confirmed" | "cancelled";
  amount: number;
  createdAt: string;
}

export interface ExhibitorProfile {
  id: string;
  name: string;
  slug: string;
  industry: string;
  country: string;
  description: string;
  products: string[];
  certifications: string[];
  boothId?: string;
  exhibitionId?: string;
}

// Mock booth grid for each exhibition
const BOOTH_SIZE_MAP: Record<string, Booth["size"]> = {
  A: "platinum",
  B: "gold",
  C: "standard",
  D: "standard",
  E: "standard",
};

const BOOTH_PRICE_MAP: Record<string, number> = {
  platinum: 15000,
  gold: 8000,
  standard: 3500,
};

export function generateBooths(exhibitionId: string): Booth[] {
  const rows = ["A", "B", "C", "D", "E"];
  const cols = 8;
  const booths: Booth[] = [];

  for (const row of rows) {
    for (let col = 1; col <= cols; col++) {
      const size = BOOTH_SIZE_MAP[row];
      booths.push({
        id: `${exhibitionId}-${row}${col}`,
        row,
        col,
        size,
        price: BOOTH_PRICE_MAP[size],
        status: "available",
        exhibitionId,
      });
    }
  }

  return booths;
}

// Mock state store (would be Supabase DB)
let mockBooths: Booth[] = [];
let mockBookings: BoothBooking[] = [];

export function initBooths(exhibitionId: string): Booth[] {
  if (mockBooths.length === 0) {
    mockBooths = generateBooths(exhibitionId);
  }
  return mockBooths.filter((b) => b.exhibitionId === exhibitionId);
}

export function bookBooth(
  boothId: string,
  exhibitorId: string,
  exhibitorName: string
): BoothBooking | null {
  const booth = mockBooths.find((b) => b.id === boothId);
  if (!booth || booth.status !== "available") return null;

  booth.status = "booked";
  booth.exhibitorId = exhibitorId;
  booth.exhibitorName = exhibitorName;

  const booking: BoothBooking = {
    id: `bk-${Date.now()}`,
    boothId,
    exhibitionId: booth.exhibitionId,
    exhibitorId,
    exhibitorName,
    status: "confirmed",
    amount: booth.price,
    createdAt: new Date().toISOString(),
  };

  mockBookings.push(booking);
  return booking;
}

export function getBookingsForExhibitor(exhibitorId: string): BoothBooking[] {
  return mockBookings.filter((b) => b.exhibitorId === exhibitorId);
}

// The directory used to ship four made-up companies. Real exhibitor profiles
// are not built yet, so the list is empty and the directory is hidden from the
// site navigation until they are.
export const mockExhibitorProfiles: ExhibitorProfile[] = [];
