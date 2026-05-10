const PRIVATE_LESSON_SUFFIX = "-ozel-ders";

export function toPseoDisciplinePathSlug(disciplineSlug: string): string {
  if (!disciplineSlug) return disciplineSlug;
  return disciplineSlug.endsWith(PRIVATE_LESSON_SUFFIX)
    ? disciplineSlug
    : `${disciplineSlug}${PRIVATE_LESSON_SUFFIX}`;
}

export function toTaxonomyDisciplineSlug(pathSlug: string): string {
  if (!pathSlug) return pathSlug;
  return pathSlug.endsWith(PRIVATE_LESSON_SUFFIX)
    ? pathSlug.slice(0, -PRIVATE_LESSON_SUFFIX.length)
    : pathSlug;
}

