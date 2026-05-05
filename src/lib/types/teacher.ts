/**
 * Web-facing teacher view model. Mirrors a denormalized shape of
 * lessonradar.TeacherProfile + MarketplaceSpecialty + ratings aggregate.
 */
export type LessonModality = "in_person" | "online" | "hybrid";

export interface TeacherDisciplineSummary {
  disciplineSlug: string;
  hourlyMin: number;
  hourlyMax: number;
}

export interface TeacherTrustSignals {
  isVerified: boolean;
  identityVerified: boolean;
  diplomaVerified: boolean;
  ratingAverage: number;        // 0..5
  reviewCount: number;
  responseTimeMinutes: number;  // median minutes to first reply
  lastActiveAt: string;         // ISO
  acceptanceRate?: number;      // 0..1
}

export interface TeacherProfile {
  id: string;
  slug: string;
  fullName: string;
  headline: string;             // short pitch e.g. "10 yıllık YKS matematik öğretmeni"
  bio: string;
  avatarUrl: string;
  citySlug: string;
  districtSlug?: string;
  modality: LessonModality;
  yearsOfExperience: number;
  disciplines: TeacherDisciplineSummary[];
  primaryDisciplineSlug: string;
  trust: TeacherTrustSignals;
  isPremium: boolean;
  profileCompleteness: number;  // 0..100, drives quality score
}
