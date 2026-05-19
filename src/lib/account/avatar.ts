/**
 * Resolve which URL to render as the user's avatar.
 *
 * Precedence (matches the mobile `Avatar` component):
 *   1. The image the user uploaded through /ayarlar/profil (stored on
 *      CustomerProfile.profile_image or TeacherProfile.profile_image and
 *      surfaced as `profile_image_url`).
 *   2. The OAuth provider avatar (Google / Apple, surfaced as `avatar_url`
 *      on `CustomUser`).
 *   3. `null` — callers should fall back to initials.
 *
 * Why this order: a user who explicitly uploads a photo expects it to win
 * everywhere — Header, teacher card, message thread, profile page. The
 * legacy ordering (`oauthUrl ?? uploadedUrl`) silently hid the uploaded
 * image whenever a Google-linked user kept their provider avatar populated.
 *
 * Empty strings are treated as `null` because Django serializers sometimes
 * emit `""` for missing image fields and `?? ""` would otherwise mask the
 * fallback chain.
 */
export function resolveAvatarSrc(input: {
  uploadedUrl?: string | null | undefined;
  oauthUrl?: string | null | undefined;
}): string | null {
  const uploaded = input.uploadedUrl?.trim();
  if (uploaded) return uploaded;
  const oauth = input.oauthUrl?.trim();
  if (oauth) return oauth;
  return null;
}
