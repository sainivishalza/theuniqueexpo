export interface LocalizedText {
  en: string;
  ru: string;
  zh: string;
}

export interface LocalizedTourData {
  id: string; slug: string;
  type: "business" | "china"; city: string;
  dates: string; startDate: string; endDate: string;
  duration: string;
  title: LocalizedText;
  description: LocalizedText;
  highlights: LocalizedText[];
  itinerary: { day: string; title: LocalizedText; description: LocalizedText }[];
  price: number; currency: string; groupSize: string;
  included: LocalizedText[]; notIncluded: LocalizedText[];
  image: string; exhibitionSlug?: string;
}

// Flat, locale-resolved shape consumed by pages -- same field names the
// pages used before this file gained i18n, so page code only needs to call
// localizeTour() rather than restructure how it reads a tour.
export interface Tour {
  id: string; slug: string; title: string;
  type: "business" | "china"; city: string;
  dates: string; startDate: string; endDate: string;
  duration: string; description: string;
  highlights: string[];
  itinerary: { day: string; title: string; description: string }[];
  price: number; currency: string; groupSize: string;
  included: string[]; notIncluded: string[];
  image: string; exhibitionSlug?: string;
}

export interface TourApplication {
  id: string; tourId: string; userId: string;
  name: string; email: string; phone: string;
  company: string; nationality: string;
  travelers: number; services: string[];
  specialRequests: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

const tourApplications: TourApplication[] = [];
export function getTourApplications() { return tourApplications; }
export function submitTourApplication(app: any): TourApplication {
  const n = {...app, id: "ta-"+Date.now(), status: "pending", createdAt: new Date().toISOString()};
  tourApplications.push(n); return n;
}

function pick(text: LocalizedText, locale: string): string {
  return (text as any)[locale] || text.en;
}

export function localizeTour(tour: LocalizedTourData, locale: string): Tour {
  return {
    id: tour.id, slug: tour.slug, type: tour.type, city: tour.city,
    dates: tour.dates, startDate: tour.startDate, endDate: tour.endDate, duration: tour.duration,
    title: pick(tour.title, locale),
    description: pick(tour.description, locale),
    highlights: tour.highlights.map((h) => pick(h, locale)),
    itinerary: tour.itinerary.map((d) => ({ day: d.day, title: pick(d.title, locale), description: pick(d.description, locale) })),
    price: tour.price, currency: tour.currency, groupSize: tour.groupSize,
    included: tour.included.map((i) => pick(i, locale)),
    notIncluded: tour.notIncluded.map((i) => pick(i, locale)),
    image: tour.image, exhibitionSlug: tour.exhibitionSlug,
  };
}

function lt(en: string, ru: string, zh: string): LocalizedText {
  return { en, ru, zh };
}

export const businessToursData: LocalizedTourData[] = [
  {
    id: "bt-1", slug: "ciftis-beijing-business-tour-2026",
    title: lt("CIFTIS Beijing Business Tour 2026", "Бизнес-тур CIFTIS Пекин 2026", "2026年CIFTIS北京商务考察团"),
    type: "business", city: "Beijing", dates: "September 7-14, 2026", startDate: "2026-09-07", endDate: "2026-09-14", duration: "8 days / 7 nights",
    description: lt(
      "All-inclusive business tour to CIFTIS 2026 in Beijing.",
      "Комплексный бизнес-тур на CIFTIS 2026 в Пекине.",
      "前往2026年北京CIFTIS的全包式商务考察团。"
    ),
    highlights: [
      lt("VIP access to CIFTIS 2026", "VIP-доступ на CIFTIS 2026", "2026年CIFTIS VIP通道"),
      lt("B2B matchmaking", "B2B-подбор партнёров", "B2B配对"),
      lt("Factory visits in Tianjin", "Посещение заводов в Тяньцзине", "天津工厂参观"),
      lt("Zhongguancun tech hub tour", "Экскурсия по технопарку Чжунгуаньцунь", "中关村科技园区参观"),
      lt("Peking duck dinner", "Ужин с пекинской уткой", "北京烤鸭晚宴"),
      lt("Professional interpreter", "Профессиональный переводчик", "专业翻译"),
    ],
    itinerary: [
      { day: "Day 1", title: lt("Arrival", "Прибытие", "抵达"), description: lt("Airport pickup, hotel, welcome dinner", "Встреча в аэропорту, отель, приветственный ужин", "机场接机、入住酒店、欢迎晚宴") },
      { day: "Day 2", title: lt("CIFTIS Opening", "Открытие CIFTIS", "CIFTIS开幕"), description: lt("VIP exhibition access, keynotes", "VIP-доступ на выставку, пленарные доклады", "VIP展会通道、主题演讲") },
      { day: "Day 3", title: lt("B2B Matchmaking", "B2B-мэтчинг", "B2B配对"), description: lt("Guided tours, supplier meetings", "Экскурсии с гидом, встречи с поставщиками", "导览参观、供应商会面") },
      { day: "Day 4", title: lt("Tech Hub", "Технопарк", "科技园区"), description: lt("Zhongguancun Silicon Valley tour", "Экскурсия по Кремниевой долине Чжунгуаньцунь", "中关村硅谷之旅") },
      { day: "Day 5", title: lt("Tianjin Factories", "Заводы Тяньцзиня", "天津工厂"), description: lt("High-speed rail, factory visits", "Высокоскоростная железная дорога, посещение заводов", "高铁出行、工厂参观") },
      { day: "Day 6", title: lt("Seminars", "Семинары", "研讨会"), description: lt("Trade seminars, afternoon free", "Торговые семинары, свободный день после обеда", "贸易研讨会,下午自由活动") },
      { day: "Day 7", title: lt("Great Wall", "Великая Китайская стена", "长城"), description: lt("Great Wall visit, shopping", "Посещение Великой стены, шопинг", "游览长城、购物") },
      { day: "Day 8", title: lt("Departure", "Отъезд", "离境"), description: lt("Airport transfer", "Трансфер в аэропорт", "机场接送") },
    ],
    price: 2800, currency: "USD", groupSize: "15-25 travelers",
    included: [
      lt("7 nights 4-star hotel", "7 ночей в отеле 4 звезды", "7晚四星级酒店"),
      lt("Daily breakfast & 3 dinners", "Завтрак ежедневно и 3 ужина", "每日早餐及3次晚餐"),
      lt("Transport", "Транспорт", "交通"),
      lt("VIP pass", "VIP-пропуск", "VIP通行证"),
      lt("Interpreter", "Переводчик", "翻译"),
      lt("Factory visits", "Посещения заводов", "工厂参观"),
      lt("Airport transfers", "Трансферы из аэропорта", "机场接送"),
    ],
    notIncluded: [
      lt("Flights", "Авиабилеты", "机票"),
      lt("Insurance", "Страховка", "保险"),
      lt("Personal expenses", "Личные расходы", "个人消费"),
      lt("Lunch", "Обед", "午餐"),
    ],
    image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=500&fit=crop&q=80", exhibitionSlug: "ciftis-2026-beijing",
  },
  {
    id: "bt-2", slug: "cioe-shenzhen-business-tour-2026",
    title: lt("CIOE Shenzhen Business Tour 2026", "Бизнес-тур CIOE Шэньчжэнь 2026", "2026年CIOE深圳商务考察团"),
    type: "business", city: "Shenzhen", dates: "September 8-13, 2026", startDate: "2026-09-08", endDate: "2026-09-13", duration: "6 days / 5 nights",
    description: lt(
      "Explore CIOE 2026 in Shenzhen, the world largest optoelectronics exhibition.",
      "Посетите CIOE 2026 в Шэньчжэне — крупнейшую в мире выставку оптоэлектроники.",
      "探索2026年深圳CIOE——全球最大的光电展会。"
    ),
    highlights: [
      lt("Full CIOE 2026 access", "Полный доступ на CIOE 2026", "2026年CIOE全程通道"),
      lt("Optoelectronics hall tours", "Экскурсии по павильонам оптоэлектроники", "光电展馆参观"),
      lt("B2B meetings", "B2B-встречи", "B2B会面"),
      lt("Huaqiangbei market", "Рынок Хуацяньбэй", "华强北市场"),
      lt("Dongguan factory visits", "Посещение заводов в Дунгуане", "东莞工厂参观"),
      lt("English-speaking guide", "Англоговорящий гид", "英语导游"),
    ],
    itinerary: [
      { day: "Day 1", title: lt("Arrival", "Прибытие", "抵达"), description: lt("Airport pickup, hotel check-in", "Встреча в аэропорту, заселение в отель", "机场接机、入住酒店") },
      { day: "Day 2", title: lt("CIOE Day 1", "Первый день CIOE", "CIOE第一天"), description: lt("Exhibition access, networking dinner", "Доступ на выставку, networking-ужин", "展会通道、社交晚宴") },
      { day: "Day 3", title: lt("B2B Day", "День B2B", "B2B日"), description: lt("Matchmaking, supplier meetings", "Мэтчинг, встречи с поставщиками", "配对、供应商会面") },
      { day: "Day 4", title: lt("Electronics Market", "Рынок электроники", "电子市场"), description: lt("Huaqiangbei tour", "Экскурсия по Хуацяньбэй", "华强北参观") },
      { day: "Day 5", title: lt("Factory Visits", "Посещение заводов", "工厂参观"), description: lt("Dongguan manufacturing", "Производство в Дунгуане", "东莞制造业") },
      { day: "Day 6", title: lt("Departure", "Отъезд", "离境"), description: lt("Free time, airport transfer", "Свободное время, трансфер в аэропорт", "自由活动、机场接送") },
    ],
    price: 2200, currency: "USD", groupSize: "10-20 travelers",
    included: [
      lt("5 nights 4-star hotel", "5 ночей в отеле 4 звезды", "5晚四星级酒店"),
      lt("Breakfast & 2 dinners", "Завтрак и 2 ужина", "早餐及2次晚餐"),
      lt("Transport", "Транспорт", "交通"),
      lt("Exhibition pass", "Пропуск на выставку", "展会通行证"),
      lt("Guide", "Гид", "导游"),
      lt("Factory visits", "Посещения заводов", "工厂参观"),
    ],
    notIncluded: [
      lt("Flights", "Авиабилеты", "机票"),
      lt("Insurance", "Страховка", "保险"),
      lt("Personal expenses", "Личные расходы", "个人消费"),
      lt("Lunch", "Обед", "午餐"),
    ],
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=500&fit=crop&q=80", exhibitionSlug: "cioe-2026-shenzhen",
  },
  {
    id: "bt-3", slug: "caexpo-nanning-business-tour-2026",
    title: lt("CAEXPO Nanning Business Tour 2026", "Бизнес-тур CAEXPO Наньнин 2026", "2026年CAEXPO南宁商务考察团"),
    type: "business", city: "Nanning", dates: "September 15-21, 2026", startDate: "2026-09-15", endDate: "2026-09-21", duration: "7 days / 6 nights",
    description: lt(
      "Visit the 23rd China-ASEAN Expo (CAEXPO) in Nanning.",
      "Посетите 23-ю Китайско-АСЕАНскую выставку (CAEXPO) в Наньнине.",
      "参观在南宁举行的第23届中国-东盟博览会(CAEXPO)。"
    ),
    highlights: [
      lt("Full CAEXPO access", "Полный доступ на CAEXPO", "CAEXPO全程通道"),
      lt("ASEAN-China matching", "Мэтчинг Китай-АСЕАН", "中国-东盟配对"),
      lt("Investment forums", "Инвестиционные форумы", "投资论坛"),
      lt("Nanning markets", "Рынки Наньнина", "南宁市场"),
      lt("Guangxi culture", "Культура Гуанси", "广西文化"),
      lt("Professional interpreter", "Профессиональный переводчик", "专业翻译"),
    ],
    itinerary: [
      { day: "Day 1", title: lt("Arrival", "Прибытие", "抵达"), description: lt("Airport pickup, hotel, reception", "Встреча в аэропорту, отель, приём", "机场接机、入住酒店、欢迎会") },
      { day: "Day 2", title: lt("CAEXPO Day 1", "Первый день CAEXPO", "CAEXPO第一天"), description: lt("Opening, exhibition tour", "Открытие, экскурсия по выставке", "开幕式、展会参观") },
      { day: "Day 3", title: lt("B2B Sessions", "B2B-сессии", "B2B会谈"), description: lt("Buyer-supplier meetings", "Встречи покупателей и поставщиков", "买家与供应商会面") },
      { day: "Day 4", title: lt("Investment Forums", "Инвестиционные форумы", "投资论坛"), description: lt("Promotion conferences", "Конференции по продвижению", "推介会议") },
      { day: "Day 5", title: lt("Nanning Markets", "Рынки Наньнина", "南宁市场"), description: lt("Wholesale markets tour", "Экскурсия по оптовым рынкам", "批发市场参观") },
      { day: "Day 6", title: lt("Cultural Day", "Культурный день", "文化日"), description: lt("Minority villages, cuisine", "Деревни национальных меньшинств, кухня", "少数民族村寨、美食") },
      { day: "Day 7", title: lt("Departure", "Отъезд", "离境"), description: lt("Airport transfer", "Трансфер в аэропорт", "机场接送") },
    ],
    price: 2400, currency: "USD", groupSize: "12-20 travelers",
    included: [
      lt("6 nights 4-star hotel", "6 ночей в отеле 4 звезды", "6晚四星级酒店"),
      lt("Breakfast & 3 dinners", "Завтрак и 3 ужина", "早餐及3次晚餐"),
      lt("Transport", "Транспорт", "交通"),
      lt("Exhibition pass", "Пропуск на выставку", "展会通行证"),
      lt("Interpreter", "Переводчик", "翻译"),
      lt("Cultural tours", "Культурные экскурсии", "文化考察"),
    ],
    notIncluded: [
      lt("Flights", "Авиабилеты", "机票"),
      lt("Insurance", "Страховка", "保险"),
      lt("Personal expenses", "Личные расходы", "个人消费"),
      lt("Lunch", "Обед", "午餐"),
    ],
    image: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&h=500&fit=crop&q=80", exhibitionSlug: "caexpo-2026-nanning",
  },
];

export const chinaToursData: LocalizedTourData[] = [
  {
    id: "ct-1", slug: "shanghai-guangzhou-trade-hub-tour",
    title: lt("Shanghai & Guangzhou Trade Hub Tour", "Тур по торговым центрам Шанхая и Гуанчжоу", "上海广州贸易枢纽之旅"),
    type: "china", city: "Shanghai / Guangzhou", dates: "October 10-20, 2026", startDate: "2026-10-10", endDate: "2026-10-20", duration: "11 days / 10 nights",
    description: lt(
      "Comprehensive tour of China two biggest trade hubs.",
      "Комплексный тур по двум крупнейшим торговым центрам Китая.",
      "全面游览中国两大贸易枢纽。"
    ),
    highlights: [
      lt("Shanghai Bund & Yuyuan", "Шанхайский Бунд и сад Юйюань", "上海外滩与豫园"),
      lt("Guangzhou Canton Fair", "Кантонская ярмарка в Гуанчжоу", "广州广交会"),
      lt("Foshan factories", "Заводы Фошаня", "佛山工厂"),
      lt("High-speed rail", "Высокоскоростная железная дорога", "高铁出行"),
      lt("Food tours", "Гастрономические туры", "美食之旅"),
      lt("Wholesale markets", "Оптовые рынки", "批发市场"),
    ],
    itinerary: [
      { day: "Day 1-2", title: lt("Shanghai", "Шанхай", "上海"), description: lt("Bund, Yu Garden, Nanjing Road", "Бунд, сад Юй, Нанкинская дорога", "外滩、豫园、南京路") },
      { day: "Day 3-4", title: lt("Trade Zone", "Торговая зона", "贸易区"), description: lt("Hongqiao NECC, suppliers", "Хунцяо NECC, поставщики", "虹桥国家会展中心、供应商") },
      { day: "Day 5", title: lt("Hangzhou", "Ханчжоу", "杭州"), description: lt("West Lake, tea plantations", "Западное озеро, чайные плантации", "西湖、茶园") },
      { day: "Day 6", title: lt("Fly South", "Перелёт на юг", "南下"), description: lt("Guangzhou arrival, Tower views", "Прибытие в Гуанчжоу, виды с башни", "抵达广州、塔顶观光") },
      { day: "Day 7-8", title: lt("Guangzhou", "Гуанчжоу", "广州"), description: lt("Baiyun markets, wholesale", "Рынки Байюнь, оптовая торговля", "白云市场、批发采购") },
      { day: "Day 9", title: lt("Foshan", "Фошань", "佛山"), description: lt("Factory visits", "Посещение заводов", "工厂参观") },
      { day: "Day 10", title: lt("Free Day", "Свободный день", "自由日"), description: lt("Shopping, farewell dinner", "Шопинг, прощальный ужин", "购物、告别晚宴") },
      { day: "Day 11", title: lt("Departure", "Отъезд", "离境"), description: lt("Airport transfer", "Трансфер в аэропорт", "机场接送") },
    ],
    price: 3200, currency: "USD", groupSize: "10-20 travelers",
    included: [
      lt("10 nights 4-star hotel", "10 ночей в отеле 4 звезды", "10晚四星级酒店"),
      lt("Breakfast & 4 dinners", "Завтрак и 4 ужина", "早餐及4次晚餐"),
      lt("Flights & rail", "Перелёты и поезда", "机票及高铁"),
      lt("Transport", "Транспорт", "交通"),
      lt("Guide", "Гид", "导游"),
      lt("Factories", "Заводы", "工厂参观"),
    ],
    notIncluded: [
      lt("International flights", "Международные авиабилеты", "国际机票"),
      lt("Insurance", "Страховка", "保险"),
      lt("Personal expenses", "Личные расходы", "个人消费"),
      lt("Lunch", "Обед", "午餐"),
    ],
    image: "https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=800&h=500&fit=crop&q=80",
  },
  {
    id: "ct-2", slug: "yiwu-foreign-trade-market-tour",
    title: lt("Yiwu & Foreign Trade Market Tour", "Тур на рынок Иу и внешнеторговые рынки", "义乌外贸市场之旅"),
    type: "china", city: "Yiwu", dates: "November 5-12, 2026", startDate: "2026-11-05", endDate: "2026-11-12", duration: "8 days / 7 nights",
    description: lt(
      "Discover Yiwu, the world largest small commodities market.",
      "Откройте для себя Иу — крупнейший в мире рынок мелких товаров.",
      "探索义乌——全球最大的小商品市场。"
    ),
    highlights: [
      lt("75,000+ booths", "75 000+ торговых точек", "75,000多个摊位"),
      lt("Factory visits", "Посещение заводов", "工厂参观"),
      lt("Sourcing guidance", "Консультации по закупкам", "采购指导"),
      lt("Export zone tour", "Экскурсия по экспортной зоне", "出口区参观"),
      lt("Night market", "Ночной рынок", "夜市"),
      lt("Sourcing agents", "Агенты по закупкам", "采购代理"),
    ],
    itinerary: [
      { day: "Day 1", title: lt("Arrival", "Прибытие", "抵达"), description: lt("Airport pickup, hotel", "Встреча в аэропорту, отель", "机场接机、入住酒店") },
      { day: "Day 2-3", title: lt("Trade City", "Торговый город", "国际商贸城"), description: lt("Districts 1-5 tours", "Экскурсии по районам 1-5", "1-5区参观") },
      { day: "Day 4", title: lt("Factories", "Заводы", "工厂参观"), description: lt("Industrial zone visits", "Посещение промышленной зоны", "工业区参观") },
      { day: "Day 5", title: lt("Workshop", "Мастер-класс", "工作坊"), description: lt("Negotiation, quality inspection", "Переговоры, контроль качества", "谈判、质量检验") },
      { day: "Day 6", title: lt("Markets", "Рынки", "市场"), description: lt("Jinhua, night market", "Цзиньхуа, ночной рынок", "金华、夜市") },
      { day: "Day 7", title: lt("Free Day", "Свободный день", "自由日"), description: lt("Independent sourcing", "Самостоятельные закупки", "自主采购") },
      { day: "Day 8", title: lt("Departure", "Отъезд", "离境"), description: lt("Transfer to Hangzhou", "Трансфер в Ханчжоу", "转往杭州") },
    ],
    price: 2600, currency: "USD", groupSize: "8-15 travelers",
    included: [
      lt("7 nights 3-4 star hotel", "7 ночей в отеле 3-4 звезды", "7晚三至四星级酒店"),
      lt("Breakfast & 3 dinners", "Завтрак и 3 ужина", "早餐及3次晚餐"),
      lt("Transfers", "Трансферы", "接送"),
      lt("Guide", "Гид", "导游"),
      lt("Factories", "Заводы", "工厂参观"),
      lt("Market maps", "Карты рынков", "市场地图"),
    ],
    notIncluded: [
      lt("Flights", "Авиабилеты", "机票"),
      lt("Insurance", "Страховка", "保险"),
      lt("Personal expenses", "Личные расходы", "个人消费"),
      lt("Lunch", "Обед", "午餐"),
    ],
    image: "https://images.unsplash.com/photo-1567449303078-57ad995bd329?w=800&h=500&fit=crop&q=80",
  },
];

export function getAllToursData(): LocalizedTourData[] { return [...businessToursData, ...chinaToursData]; }
export function getTourDataBySlug(slug: string): LocalizedTourData | undefined { return getAllToursData().find(t => t.slug === slug); }
