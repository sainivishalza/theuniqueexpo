export type RFQStatus = "draft" | "open" | "quotes_received" | "awarded" | "closed";

export interface RFQ {
  id: string;
  title: string;
  product: string;
  description: string;
  quantity: string;
  targetPrice: string;
  deadline: string;
  category: string;
  buyerId: string;
  buyerName: string;
  status: RFQStatus;
  createdAt: string;
}

export interface Quote {
  id: string;
  rfqId: string;
  exhibitorId: string;
  exhibitorName: string;
  price: string;
  leadTime: string;
  notes: string;
  status: "submitted" | "accepted" | "rejected";
  createdAt: string;
}

// Mock data
const mockRFQs: RFQ[] = [
  {
    id: "rfq-1",
    title: "Stainless Steel Kitchenware Set",
    product: "Kitchenware",
    description:
      "Looking for a complete stainless steel kitchenware set including pots, pans, utensils. 18/10 grade preferred. Need samples before bulk order.",
    quantity: "5,000 sets",
    targetPrice: "$25–35 per set",
    deadline: "2026-06-15",
    category: "Consumer Goods",
    buyerId: "mock-1",
    buyerName: "Jane Smith",
    status: "quotes_received",
    createdAt: "2026-03-15",
  },
  {
    id: "rfq-2",
    title: "IoT Temperature Sensors — Bulk Order",
    product: "Electronics",
    description:
      "Need 10,000 units of WiFi-enabled temperature sensors for cold chain monitoring. Must support MQTT protocol and have IP65 rating.",
    quantity: "10,000 units",
    targetPrice: "$3–5 per unit",
    deadline: "2026-07-01",
    category: "Electronics",
    buyerId: "mock-2",
    buyerName: "John Buyer",
    status: "open",
    createdAt: "2026-04-01",
  },
  {
    id: "rfq-3",
    title: "Custom Metal Valve Assembly",
    product: "Industrial Valves",
    description:
      "Need custom CNC-machined valve assemblies for chemical processing. Material: 316L stainless steel. Pressure rating: 2500 PSI.",
    quantity: "500 units",
    targetPrice: "$80–120 per unit",
    deadline: "2026-08-30",
    category: "Industrial",
    buyerId: "mock-3",
    buyerName: "Mike Industrial",
    status: "open",
    createdAt: "2026-04-10",
  },
];

const mockQuotes: Quote[] = [
  {
    id: "q-1",
    rfqId: "rfq-1",
    exhibitorId: "ex-1",
    exhibitorName: "Shenzhen Tech Co.",
    price: "$28 per set",
    leadTime: "30 days",
    notes: "Premium 18/10 stainless steel. Includes carrying case. MOQ 2,000.",
    status: "submitted",
    createdAt: "2026-03-20",
  },
  {
    id: "q-2",
    rfqId: "rfq-1",
    exhibitorId: "ex-4",
    exhibitorName: "Shanghai Trading Group",
    price: "$32 per set",
    leadTime: "25 days",
    notes: "High-end finish with custom branding available. Free samples.",
    status: "submitted",
    createdAt: "2026-03-22",
  },
];

export function getRFQs(): RFQ[] {
  return mockRFQs;
}

export function getRFQById(id: string): RFQ | undefined {
  return mockRFQs.find((r) => r.id === id);
}

export function getQuotesForRFQ(rfqId: string): Quote[] {
  return mockQuotes.filter((q) => q.rfqId === rfqId);
}

export function createRFQ(rfq: Omit<RFQ, "id" | "status" | "createdAt">): RFQ {
  const newRFQ: RFQ = {
    ...rfq,
    id: `rfq-${Date.now()}`,
    status: "open",
    createdAt: new Date().toISOString().split("T")[0],
  };
  mockRFQs.push(newRFQ);
  return newRFQ;
}

export function createQuote(quote: Omit<Quote, "id" | "status" | "createdAt">): Quote {
  const newQuote: Quote = {
    ...quote,
    id: `q-${Date.now()}`,
    status: "submitted",
    createdAt: new Date().toISOString().split("T")[0],
  };
  mockQuotes.push(newQuote);
  return newQuote;
}
