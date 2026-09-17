// Suggestion lists for the buyer-profile "combo" fields (native <input list>
// + <datalist> -- a dropdown of common values that still accepts free text
// for anything not listed, so a value missing from the list is never a
// dead end). Kept in English regardless of UI locale so the same value is
// stored consistently no matter which locale the admin or buyer used.

export const JOB_TITLES = [
  "CEO",
  "Owner",
  "Founder",
  "Managing Director",
  "General Manager",
  "Purchasing Manager",
  "Purchasing Officer",
  "Procurement Manager",
  "Sourcing Manager",
  "Import Manager",
  "Export Manager",
  "Sales Manager",
  "Marketing Manager",
  "Merchandiser",
  "Buyer",
  "Product Manager",
  "Operations Manager",
  "Business Development Manager",
  "Trading Manager",
  "Warehouse Manager",
  "Retail Manager",
  "Store Manager",
  "Director",
  "Vice President",
  "Chairman",
  "Partner",
] as const;

export const DEPARTURE_CITIES = [
  "Lagos", "Abuja", "Accra", "Nairobi", "Dar es Salaam", "Addis Ababa", "Cairo",
  "Casablanca", "Algiers", "Tunis", "Khartoum", "Kampala", "Lusaka", "Harare",
  "Johannesburg", "Dakar", "Abidjan", "Niamey", "Bamako", "Ouagadougou",
  "N'Djamena", "Kinshasa", "Luanda", "Maputo",
  "Dubai", "Abu Dhabi", "Doha", "Riyadh", "Jeddah", "Kuwait City", "Muscat",
  "Manama", "Amman", "Beirut", "Tehran", "Baghdad", "Istanbul",
  "Mumbai", "New Delhi", "Karachi", "Lahore", "Dhaka", "Colombo", "Kathmandu",
  "Bangkok", "Kuala Lumpur", "Singapore", "Jakarta", "Manila",
  "Ho Chi Minh City", "Hanoi", "Yangon", "Phnom Penh",
  "Hong Kong", "Guangzhou", "Shenzhen", "Shanghai", "Beijing",
  "London", "Paris", "Frankfurt", "Amsterdam", "Madrid", "Rome", "Moscow",
  "New York", "Los Angeles", "Toronto", "Sao Paulo", "Mexico City", "Sydney",
] as const;

// Chinese visa categories, since these buyers are traveling to a China
// trade fair -- the letter code is what actually appears on the visa/stamp.
export const VISA_TYPES = [
  "L - Tourist",
  "M - Business/Trade",
  "F - Visit/Exchange",
  "Z - Work",
  "X1 - Long-term Study",
  "X2 - Short-term Study",
  "Q1 - Family Reunion (Long)",
  "Q2 - Family Visit (Short)",
  "S1 - Private Visit (Long)",
  "S2 - Private Visit (Short)",
  "C - Crew",
  "G - Transit",
] as const;
