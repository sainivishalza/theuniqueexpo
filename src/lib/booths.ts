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

  // Pre-book some booths for realism
  const prebooked = [
    { row: "A", col: 3, name: "Shenzhen Tech Co." },
    { row: "B", col: 5, name: "Guangzhou Imports Ltd." },
    { row: "C", col: 2, name: "Beijing Manufacturing" },
    { row: "D", col: 7, name: "Shanghai Trading Group" },
  ];

  for (const pb of prebooked) {
    const booth = booths.find((b) => b.row === pb.row && b.col === pb.col);
    if (booth) {
      booth.status = "booked";
      booth.exhibitorName = pb.name;
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

export const mockExhibitorProfiles: ExhibitorProfile[] = [
  {
    id: "ex-1",
    name: "Shenzhen Tech Co.",
    slug: "shenzhen-tech-co",
    industry: "Electronics",
    country: "China",
    description:
      "Leading manufacturer of consumer electronics, smart home devices, and IoT solutions. Serving global markets since 2010.",
    products: ["Smart Speakers", "IoT Sensors", "LED Displays", "USB-C Hubs"],
    certifications: ["ISO 9001", "CE", "FCC", "RoHS"],
  },
  {
    id: "ex-2",
    name: "Guangzhou Imports Ltd.",
    slug: "guangzhou-imports-ltd",
    industry: "Trading",
    country: "China",
    description:
      "Full-service import/export company specializing in home goods, kitchenware, and seasonal decorations for international retail.",
    products: ["Kitchenware", "Home Decor", "Seasonal Items", "Gift Sets"],
    certifications: ["ISO 14001", "BSCI", "SEDEX"],
  },
  {
    id: "ex-3",
    name: "Beijing Manufacturing",
    slug: "beijing-manufacturing",
    industry: "Industrial",
    country: "China",
    description:
      "Precision CNC machining and metal fabrication for automotive, aerospace, and heavy industry applications.",
    products: ["CNC Parts", "Metal Fabrication", "Industrial Valves", "Pipe Fittings"],
    certifications: ["ISO 9001", "IATF 16949", "AS9100"],
  },
  {
    id: "ex-4",
    name: "Shanghai Trading Group",
    slug: "shanghai-trading-group",
    industry: "Consumer Goods",
    country: "China",
    description:
      "One-stop sourcing partner for fashion accessories, personal care products, and packaging solutions.",
    products: ["Fashion Accessories", "Personal Care", "Packaging", "Cosmetics"],
    certifications: ["ISO 22716", "GMPC", "BRC"],
  },
];
