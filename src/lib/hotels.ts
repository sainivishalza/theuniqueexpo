export interface Hotel {
  id: string;
  name: string;
  stars: number;
  address: string;
  city: string;
  exhibitionId: string;
  pricePerNight: number;
  distanceToVenue: string;
  amenities: string[];
  image: string;
}

export interface HotelBookingRequest {
  id: string;
  hotelId: string;
  hotelName: string;
  exhibitionId: string;
  userId: string;
  userName: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

const mockHotels: Hotel[] = [
  {
    id: "h-1",
    name: "Xiamen Hilton Hotel",
    stars: 5,
    address: "100 Hubin South Road, Xiamen",
    city: "Xiamen",
    exhibitionId: "1",
    pricePerNight: 180,
    distanceToVenue: "2.5 km from venue",
    amenities: ["Free WiFi", "Pool", "Gym", "Restaurant", "Airport Shuttle"],
    image: "🏨",
  },
  {
    id: "h-2",
    name: "Xiamen Marriott Hotel",
    stars: 5,
    address: "188 YunDing Road, Siming District, Xiamen",
    city: "Xiamen",
    exhibitionId: "1",
    pricePerNight: 165,
    distanceToVenue: "3.1 km from venue",
    amenities: ["Free WiFi", "Spa", "Restaurant", "Business Center"],
    image: "🏨",
  },
  {
    id: "h-3",
    name: "Chongqing InterContinental",
    stars: 5,
    address: "1 Liujiakaoyuan Road, Yubei District, Chongqing",
    city: "Chongqing",
    exhibitionId: "2",
    pricePerNight: 150,
    distanceToVenue: "1.8 km from venue",
    amenities: ["Free WiFi", "Pool", "Spa", "Restaurant", "Gym"],
    image: "🏨",
  },
  {
    id: "h-4",
    name: "Chongqing Hilton Hotel",
    stars: 5,
    address: "139 Zhongshan San Road, Yuzhong District",
    city: "Chongqing",
    exhibitionId: "2",
    pricePerNight: 135,
    distanceToVenue: "4.2 km from venue",
    amenities: ["Free WiFi", "Restaurant", "Business Center", "Airport Shuttle"],
    image: "🏨",
  },
  {
    id: "h-5",
    name: "Hangzhou InterContinental",
    stars: 5,
    address: "128 West Huancheng Road, Hangzhou",
    city: "Hangzhou",
    exhibitionId: "4",
    pricePerNight: 195,
    distanceToVenue: "3.5 km from venue",
    amenities: ["Free WiFi", "Pool", "Spa", "Restaurant", "Lake View"],
    image: "🏨",
  },
];

const mockBookings: HotelBookingRequest[] = [];

export function getHotelsForExhibition(exhibitionId: string): Hotel[] {
  return mockHotels.filter((h) => h.exhibitionId === exhibitionId);
}

export function getAllHotels(): Hotel[] {
  return mockHotels;
}

export function createHotelBooking(
  booking: Omit<HotelBookingRequest, "id" | "status" | "createdAt">
): HotelBookingRequest {
  const newBooking: HotelBookingRequest = {
    ...booking,
    id: `hb-${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  mockBookings.push(newBooking);
  return newBooking;
}

export function getAllHotelBookings(): HotelBookingRequest[] {
  return mockBookings;
}
