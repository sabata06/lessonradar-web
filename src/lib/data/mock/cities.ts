import type { City, District } from "@/lib/types";

/**
 * Turkey 81 cities. Slugs use ASCII transliteration — these are URL-stable
 * and must match canonical pSEO routes.
 */
export const TR_CITIES: City[] = [
  { slug: "adana", nameTr: "Adana", nameEn: "Adana", plateCode: 1 },
  { slug: "adiyaman", nameTr: "Adıyaman", nameEn: "Adıyaman", plateCode: 2 },
  { slug: "afyonkarahisar", nameTr: "Afyonkarahisar", nameEn: "Afyonkarahisar", plateCode: 3 },
  { slug: "agri", nameTr: "Ağrı", nameEn: "Ağrı", plateCode: 4 },
  { slug: "amasya", nameTr: "Amasya", nameEn: "Amasya", plateCode: 5 },
  { slug: "ankara", nameTr: "Ankara", nameEn: "Ankara", plateCode: 6, isPriority: true },
  { slug: "antalya", nameTr: "Antalya", nameEn: "Antalya", plateCode: 7, isPriority: true },
  { slug: "artvin", nameTr: "Artvin", nameEn: "Artvin", plateCode: 8 },
  { slug: "aydin", nameTr: "Aydın", nameEn: "Aydın", plateCode: 9 },
  { slug: "balikesir", nameTr: "Balıkesir", nameEn: "Balıkesir", plateCode: 10 },
  { slug: "bilecik", nameTr: "Bilecik", nameEn: "Bilecik", plateCode: 11 },
  { slug: "bingol", nameTr: "Bingöl", nameEn: "Bingöl", plateCode: 12 },
  { slug: "bitlis", nameTr: "Bitlis", nameEn: "Bitlis", plateCode: 13 },
  { slug: "bolu", nameTr: "Bolu", nameEn: "Bolu", plateCode: 14 },
  { slug: "burdur", nameTr: "Burdur", nameEn: "Burdur", plateCode: 15 },
  { slug: "bursa", nameTr: "Bursa", nameEn: "Bursa", plateCode: 16, isPriority: true },
  { slug: "canakkale", nameTr: "Çanakkale", nameEn: "Çanakkale", plateCode: 17 },
  { slug: "cankiri", nameTr: "Çankırı", nameEn: "Çankırı", plateCode: 18 },
  { slug: "corum", nameTr: "Çorum", nameEn: "Çorum", plateCode: 19 },
  { slug: "denizli", nameTr: "Denizli", nameEn: "Denizli", plateCode: 20 },
  { slug: "diyarbakir", nameTr: "Diyarbakır", nameEn: "Diyarbakır", plateCode: 21 },
  { slug: "edirne", nameTr: "Edirne", nameEn: "Edirne", plateCode: 22 },
  { slug: "elazig", nameTr: "Elazığ", nameEn: "Elazığ", plateCode: 23 },
  { slug: "erzincan", nameTr: "Erzincan", nameEn: "Erzincan", plateCode: 24 },
  { slug: "erzurum", nameTr: "Erzurum", nameEn: "Erzurum", plateCode: 25 },
  { slug: "eskisehir", nameTr: "Eskişehir", nameEn: "Eskişehir", plateCode: 26 },
  { slug: "gaziantep", nameTr: "Gaziantep", nameEn: "Gaziantep", plateCode: 27, isPriority: true },
  { slug: "giresun", nameTr: "Giresun", nameEn: "Giresun", plateCode: 28 },
  { slug: "gumushane", nameTr: "Gümüşhane", nameEn: "Gümüşhane", plateCode: 29 },
  { slug: "hakkari", nameTr: "Hakkari", nameEn: "Hakkari", plateCode: 30 },
  { slug: "hatay", nameTr: "Hatay", nameEn: "Hatay", plateCode: 31 },
  { slug: "isparta", nameTr: "Isparta", nameEn: "Isparta", plateCode: 32 },
  { slug: "mersin", nameTr: "Mersin", nameEn: "Mersin", plateCode: 33 },
  { slug: "istanbul", nameTr: "İstanbul", nameEn: "Istanbul", plateCode: 34, isPriority: true },
  { slug: "izmir", nameTr: "İzmir", nameEn: "İzmir", plateCode: 35, isPriority: true },
  { slug: "kars", nameTr: "Kars", nameEn: "Kars", plateCode: 36 },
  { slug: "kastamonu", nameTr: "Kastamonu", nameEn: "Kastamonu", plateCode: 37 },
  { slug: "kayseri", nameTr: "Kayseri", nameEn: "Kayseri", plateCode: 38 },
  { slug: "kirklareli", nameTr: "Kırklareli", nameEn: "Kırklareli", plateCode: 39 },
  { slug: "kirsehir", nameTr: "Kırşehir", nameEn: "Kırşehir", plateCode: 40 },
  { slug: "kocaeli", nameTr: "Kocaeli", nameEn: "Kocaeli", plateCode: 41 },
  { slug: "konya", nameTr: "Konya", nameEn: "Konya", plateCode: 42 },
  { slug: "kutahya", nameTr: "Kütahya", nameEn: "Kütahya", plateCode: 43 },
  { slug: "malatya", nameTr: "Malatya", nameEn: "Malatya", plateCode: 44 },
  { slug: "manisa", nameTr: "Manisa", nameEn: "Manisa", plateCode: 45 },
  { slug: "kahramanmaras", nameTr: "Kahramanmaraş", nameEn: "Kahramanmaraş", plateCode: 46 },
  { slug: "mardin", nameTr: "Mardin", nameEn: "Mardin", plateCode: 47 },
  { slug: "mugla", nameTr: "Muğla", nameEn: "Muğla", plateCode: 48 },
  { slug: "mus", nameTr: "Muş", nameEn: "Muş", plateCode: 49 },
  { slug: "nevsehir", nameTr: "Nevşehir", nameEn: "Nevşehir", plateCode: 50 },
  { slug: "nigde", nameTr: "Niğde", nameEn: "Niğde", plateCode: 51 },
  { slug: "ordu", nameTr: "Ordu", nameEn: "Ordu", plateCode: 52 },
  { slug: "rize", nameTr: "Rize", nameEn: "Rize", plateCode: 53 },
  { slug: "sakarya", nameTr: "Sakarya", nameEn: "Sakarya", plateCode: 54 },
  { slug: "samsun", nameTr: "Samsun", nameEn: "Samsun", plateCode: 55 },
  { slug: "siirt", nameTr: "Siirt", nameEn: "Siirt", plateCode: 56 },
  { slug: "sinop", nameTr: "Sinop", nameEn: "Sinop", plateCode: 57 },
  { slug: "sivas", nameTr: "Sivas", nameEn: "Sivas", plateCode: 58 },
  { slug: "tekirdag", nameTr: "Tekirdağ", nameEn: "Tekirdağ", plateCode: 59 },
  { slug: "tokat", nameTr: "Tokat", nameEn: "Tokat", plateCode: 60 },
  { slug: "trabzon", nameTr: "Trabzon", nameEn: "Trabzon", plateCode: 61 },
  { slug: "tunceli", nameTr: "Tunceli", nameEn: "Tunceli", plateCode: 62 },
  { slug: "sanliurfa", nameTr: "Şanlıurfa", nameEn: "Şanlıurfa", plateCode: 63 },
  { slug: "usak", nameTr: "Uşak", nameEn: "Uşak", plateCode: 64 },
  { slug: "van", nameTr: "Van", nameEn: "Van", plateCode: 65 },
  { slug: "yozgat", nameTr: "Yozgat", nameEn: "Yozgat", plateCode: 66 },
  { slug: "zonguldak", nameTr: "Zonguldak", nameEn: "Zonguldak", plateCode: 67 },
  { slug: "aksaray", nameTr: "Aksaray", nameEn: "Aksaray", plateCode: 68 },
  { slug: "bayburt", nameTr: "Bayburt", nameEn: "Bayburt", plateCode: 69 },
  { slug: "karaman", nameTr: "Karaman", nameEn: "Karaman", plateCode: 70 },
  { slug: "kirikkale", nameTr: "Kırıkkale", nameEn: "Kırıkkale", plateCode: 71 },
  { slug: "batman", nameTr: "Batman", nameEn: "Batman", plateCode: 72 },
  { slug: "sirnak", nameTr: "Şırnak", nameEn: "Şırnak", plateCode: 73 },
  { slug: "bartin", nameTr: "Bartın", nameEn: "Bartın", plateCode: 74 },
  { slug: "ardahan", nameTr: "Ardahan", nameEn: "Ardahan", plateCode: 75 },
  { slug: "igdir", nameTr: "Iğdır", nameEn: "Iğdır", plateCode: 76 },
  { slug: "yalova", nameTr: "Yalova", nameEn: "Yalova", plateCode: 77 },
  { slug: "karabuk", nameTr: "Karabük", nameEn: "Karabük", plateCode: 78 },
  { slug: "kilis", nameTr: "Kilis", nameEn: "Kilis", plateCode: 79 },
  { slug: "osmaniye", nameTr: "Osmaniye", nameEn: "Osmaniye", plateCode: 80 },
  { slug: "duzce", nameTr: "Düzce", nameEn: "Düzce", plateCode: 81 },
];

export const TR_DISTRICTS: District[] = [
  // Gaziantep — birincil odak şehri
  { slug: "sahinbey", citySlug: "gaziantep", nameTr: "Şahinbey", nameEn: "Şahinbey", isPriority: true },
  { slug: "sehitkamil", citySlug: "gaziantep", nameTr: "Şehitkamil", nameEn: "Şehitkamil", isPriority: true },
  { slug: "oguzeli", citySlug: "gaziantep", nameTr: "Oğuzeli", nameEn: "Oğuzeli" },
  { slug: "nizip", citySlug: "gaziantep", nameTr: "Nizip", nameEn: "Nizip" },
  { slug: "islahiye", citySlug: "gaziantep", nameTr: "İslahiye", nameEn: "İslahiye" },
  { slug: "nurdagi", citySlug: "gaziantep", nameTr: "Nurdağı", nameEn: "Nurdağı" },
  { slug: "araban", citySlug: "gaziantep", nameTr: "Araban", nameEn: "Araban" },
  { slug: "yavuzeli", citySlug: "gaziantep", nameTr: "Yavuzeli", nameEn: "Yavuzeli" },
  { slug: "karkamis", citySlug: "gaziantep", nameTr: "Karkamış", nameEn: "Karkamış" },
];

export function getCityBySlug(slug: string) {
  return TR_CITIES.find((c) => c.slug === slug);
}

export function getDistrictsByCity(citySlug: string) {
  return TR_DISTRICTS.filter((d) => d.citySlug === citySlug);
}

export function getDistrictBySlug(citySlug: string, districtSlug: string) {
  return TR_DISTRICTS.find((d) => d.citySlug === citySlug && d.slug === districtSlug);
}
