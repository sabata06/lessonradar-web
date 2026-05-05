/**
 * Cities and districts master data lives on the web side for now —
 * backend stores city as free-text on TeacherProfile.
 */
export interface City {
  slug: string;
  nameTr: string;
  nameEn: string;
  plateCode: number;
  isPriority?: boolean; // Gaziantep & data-rich initial cities
}

export interface District {
  slug: string;
  citySlug: string;
  nameTr: string;
  nameEn: string;
  isPriority?: boolean;
}
