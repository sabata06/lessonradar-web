import type { TeacherProfile } from "@/lib/types";

export const MOCK_TEACHERS: TeacherProfile[] = [
  {
    id: "t-001",
    slug: "ayse-yilmaz-matematik",
    fullName: "Ayşe Yılmaz",
    headline: "10 yıllık YKS matematik öğretmeni",
    bio:
      "Üniversite hazırlık ve lise matematik üzerine 10 yıllık deneyim. " +
      "Soru çözüm pratiği ağırlıklı, öğrenciye özel program.",
    avatarUrl: "https://i.pravatar.cc/300?img=47",
    citySlug: "gaziantep",
    districtSlug: "sehitkamil",
    modality: "hybrid",
    yearsOfExperience: 10,
    primaryDisciplineSlug: "yks-matematik",
    disciplines: [
      { disciplineSlug: "yks-matematik", hourlyMin: 450, hourlyMax: 650 },
      { disciplineSlug: "matematik-ozel-ders", hourlyMin: 350, hourlyMax: 500 },
    ],
    trust: {
      isVerified: true,
      identityVerified: true,
      diplomaVerified: true,
      ratingAverage: 4.9,
      reviewCount: 64,
      responseTimeMinutes: 18,
      lastActiveAt: "2026-05-04T20:11:00.000Z",
      acceptanceRate: 0.82,
    },
    isPremium: true,
    profileCompleteness: 96,
  },
  {
    id: "t-002",
    slug: "mehmet-kaya-fizik",
    fullName: "Mehmet Kaya",
    headline: "Fizik öğretmeni · YKS & lise hazırlık",
    bio:
      "Boğaziçi Üniversitesi mezunu. AYT fizik ve 11. sınıf konuları " +
      "üzerine özelleşmiş, çevrimiçi ders verebilen öğretmen.",
    avatarUrl: "https://i.pravatar.cc/300?img=12",
    citySlug: "gaziantep",
    districtSlug: "sahinbey",
    modality: "online",
    yearsOfExperience: 6,
    primaryDisciplineSlug: "fizik-ozel-ders",
    disciplines: [
      { disciplineSlug: "fizik-ozel-ders", hourlyMin: 400, hourlyMax: 550 },
    ],
    trust: {
      isVerified: true,
      identityVerified: true,
      diplomaVerified: false,
      ratingAverage: 4.7,
      reviewCount: 28,
      responseTimeMinutes: 42,
      lastActiveAt: "2026-05-05T08:45:00.000Z",
      acceptanceRate: 0.71,
    },
    isPremium: false,
    profileCompleteness: 88,
  },
  {
    id: "t-003",
    slug: "elif-demir-ingilizce",
    fullName: "Elif Demir",
    headline: "İngilizce öğretmeni · YDS & genel İngilizce",
    bio:
      "İngiliz Dili ve Edebiyatı mezunu, 8 yıllık deneyim. " +
      "Konuşma odaklı dersler ve sınav hazırlık.",
    avatarUrl: "https://i.pravatar.cc/300?img=32",
    citySlug: "gaziantep",
    districtSlug: "sehitkamil",
    modality: "in_person",
    yearsOfExperience: 8,
    primaryDisciplineSlug: "ingilizce-ozel-ders",
    disciplines: [
      { disciplineSlug: "ingilizce-ozel-ders", hourlyMin: 350, hourlyMax: 500 },
    ],
    trust: {
      isVerified: true,
      identityVerified: true,
      diplomaVerified: true,
      ratingAverage: 4.8,
      reviewCount: 41,
      responseTimeMinutes: 25,
      lastActiveAt: "2026-05-05T11:02:00.000Z",
      acceptanceRate: 0.78,
    },
    isPremium: true,
    profileCompleteness: 92,
  },
  {
    id: "t-004",
    slug: "okan-sezer-matematik",
    fullName: "Okan Sezer",
    headline: "Ortaokul & lise matematik öğretmeni",
    bio:
      "LGS ve 9-10. sınıf öğrencileri için kavramsal anlatım odaklı. " +
      "Hafta içi akşam ve hafta sonu uygun.",
    avatarUrl: "https://i.pravatar.cc/300?img=15",
    citySlug: "gaziantep",
    districtSlug: "sahinbey",
    modality: "in_person",
    yearsOfExperience: 4,
    primaryDisciplineSlug: "matematik-ozel-ders",
    disciplines: [
      { disciplineSlug: "matematik-ozel-ders", hourlyMin: 300, hourlyMax: 400 },
    ],
    trust: {
      isVerified: false,
      identityVerified: true,
      diplomaVerified: false,
      ratingAverage: 4.5,
      reviewCount: 9,
      responseTimeMinutes: 75,
      lastActiveAt: "2026-05-04T16:20:00.000Z",
      acceptanceRate: 0.6,
    },
    isPremium: false,
    profileCompleteness: 72,
  },
  {
    id: "t-005",
    slug: "deniz-aslan-piyano",
    fullName: "Deniz Aslan",
    headline: "Piyano eğitmeni · klasik & popüler",
    bio:
      "Konservatuvar mezunu, 5 yaş ve üzerine piyano eğitimi. " +
      "Ev ziyareti veya stüdyoda ders.",
    avatarUrl: "https://i.pravatar.cc/300?img=49",
    citySlug: "gaziantep",
    districtSlug: "sehitkamil",
    modality: "in_person",
    yearsOfExperience: 7,
    primaryDisciplineSlug: "piyano-dersi",
    disciplines: [
      { disciplineSlug: "piyano-dersi", hourlyMin: 400, hourlyMax: 600 },
    ],
    trust: {
      isVerified: true,
      identityVerified: true,
      diplomaVerified: true,
      ratingAverage: 5.0,
      reviewCount: 22,
      responseTimeMinutes: 60,
      lastActiveAt: "2026-05-03T19:00:00.000Z",
      acceptanceRate: 0.9,
    },
    isPremium: false,
    profileCompleteness: 84,
  },
];

export function getTeachersByCityAndDiscipline(
  citySlug: string,
  disciplineSlug: string,
  districtSlug?: string
): TeacherProfile[] {
  return MOCK_TEACHERS.filter((t) => {
    if (t.citySlug !== citySlug) return false;
    if (districtSlug && t.districtSlug !== districtSlug) return false;
    return t.disciplines.some((d) => d.disciplineSlug === disciplineSlug);
  });
}

export function getTeacherBySlug(slug: string): TeacherProfile | undefined {
  return MOCK_TEACHERS.find((t) => t.slug === slug);
}
