export interface FaqItem {
  question: string;
  answer: string;
}

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    question: "What does TheUniqueExpo actually do?",
    answer:
      "We help buyers and exhibitors get more out of China's major trade fairs -- exhibition registration, booth booking, business and city tours, hotel arrangements, visa setup, and relocation support, all from one platform.",
  },
];

function isFaqItem(value: unknown): value is FaqItem {
  const record = value as Record<string, unknown> | null;
  return !!record && typeof record.question === "string" && typeof record.answer === "string";
}

export function normalizeFaqItems(input: unknown): FaqItem[] {
  if (!Array.isArray(input)) return [];
  return input.filter(isFaqItem).map((item) => ({ question: item.question, answer: item.answer }));
}
