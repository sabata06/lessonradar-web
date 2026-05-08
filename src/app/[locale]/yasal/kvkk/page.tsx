import { redirect } from "@/i18n/navigation";

/**
 * `/yasal/kvkk` is a legacy / link-friendly URL kept alive so existing
 * inbound links and form-consent links don't 404. KVKK ("Aydınlatma
 * Metni") is — per Turkish convention and our backend's data model —
 * a section inside the Privacy Policy document, not a separate
 * publication. This route 308-redirects to the canonical privacy page,
 * preventing duplicate-content issues with Googlebot.
 */
export default async function KvkkRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/yasal/gizlilik", locale });
}
