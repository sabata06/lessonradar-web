/**
 * Cities and districts master data lives on the web side for now —
 * backend stores city as free-text on TeacherProfile.
 */
export interface City {
  slug: string;
  nameTr: string;
  nameEn: string;
  /** Vehicle plate code (Turkish provinces 1–81). Optional — backend
   * cities list doesn't ship it, mock data does. Currently unused
   * downstream; kept for legacy compatibility. */
  plateCode?: number;
  isPriority?: boolean; // Gaziantep & data-rich initial cities
}

export interface District {
  slug: string;
  citySlug: string;
  nameTr: string;
  nameEn: string;
  isPriority?: boolean;
}
