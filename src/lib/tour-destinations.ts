// Curated list of China destinations shown as quick-filter chips on /tours.
// Not derived from the tours DB table -- there's only one tour today
// (Guangzhou -> Lantau Island, Hong Kong), so this is what customers are
// actually asking to browse/express interest in, ahead of the catalog
// catching up. `matchKeywords` are matched case-insensitively against a
// tour's departureCity/destination fields to decide whether it has a real
// tour yet; add more keywords here as tours get added rather than
// renaming the destination itself.
export interface TourDestination {
  id: string;
  name: { en: string; ru: string; zh: string };
  matchKeywords: string[];
}

export const TOUR_DESTINATIONS: TourDestination[] = [
  { id: "guangzhou", name: { en: "Guangzhou", ru: "Гуанчжоу", zh: "广州" }, matchKeywords: ["Guangzhou"] },
  { id: "shenzhen", name: { en: "Shenzhen", ru: "Шэньчжэнь", zh: "深圳" }, matchKeywords: ["Shenzhen"] },
  { id: "yangshuo", name: { en: "Yangshuo", ru: "Яншо", zh: "阳朔" }, matchKeywords: ["Yangshuo"] },
  { id: "silver-beach", name: { en: "Silver Beach", ru: "Серебряный пляж", zh: "银滩" }, matchKeywords: ["Silver Beach", "Beihai"] },
  { id: "hong-kong", name: { en: "Hong Kong", ru: "Гонконг", zh: "香港" }, matchKeywords: ["Hong Kong"] },
  { id: "macau", name: { en: "Macau", ru: "Макао", zh: "澳门" }, matchKeywords: ["Macau", "Macao"] },
  { id: "zhuhai", name: { en: "Zhuhai", ru: "Чжухай", zh: "珠海" }, matchKeywords: ["Zhuhai"] },
  { id: "hangzhou", name: { en: "Hangzhou", ru: "Ханчжоу", zh: "杭州" }, matchKeywords: ["Hangzhou"] },
  { id: "shanghai", name: { en: "Shanghai", ru: "Шанхай", zh: "上海" }, matchKeywords: ["Shanghai"] },
  { id: "beijing", name: { en: "Beijing", ru: "Пекин", zh: "北京" }, matchKeywords: ["Beijing"] },
  { id: "xian", name: { en: "Xi'an", ru: "Сиань", zh: "西安" }, matchKeywords: ["Xi'an", "Xian"] },
  { id: "chengdu", name: { en: "Chengdu", ru: "Чэнду", zh: "成都" }, matchKeywords: ["Chengdu"] },
  { id: "chongqing", name: { en: "Chongqing", ru: "Чунцин", zh: "重庆" }, matchKeywords: ["Chongqing"] },
  { id: "zhangjiajie", name: { en: "Zhangjiajie", ru: "Чжанцзяцзе", zh: "张家界" }, matchKeywords: ["Zhangjiajie"] },
  { id: "shantou-nanao", name: { en: "Shantou / Nan'ao", ru: "Шаньтоу / Наньао", zh: "汕头 / 南澳" }, matchKeywords: ["Shantou", "Nan'ao", "Nanao"] },
];

export function tourMatchesDestination(
  destination: TourDestination,
  tour: { departureCity: string; destination: string }
): boolean {
  const haystack = `${tour.departureCity} ${tour.destination}`.toLowerCase();
  return destination.matchKeywords.some((kw) => haystack.includes(kw.toLowerCase()));
}
