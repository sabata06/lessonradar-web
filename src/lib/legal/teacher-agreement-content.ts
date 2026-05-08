import type { Locale } from "@/i18n/routing";

export interface TeacherAgreementDraft {
  title: string;
  version: string;
  html: string;
}

/**
 * Teacher Service Agreement — DRAFT (v0.1).
 *
 * NOT FOR PUBLICATION without a licensed Turkish attorney's review.
 * The accompanying <LegalDraftBanner /> communicates this status to readers.
 * The page itself ships with `noindex` and is excluded from the sitemap
 * until the draft flag is cleared.
 *
 * Structure mirrors common Turkish marketplace teacher-agreement patterns
 * (intermediation platform, teacher remains independent service provider,
 * Turkish law + Gaziantep courts as forum). Content is intentionally
 * conservative: no commission percentage is committed (set to 0 % during
 * beta), no payment-rail specifics (Phase 5 will revise), no warranties
 * about lead quality.
 */
export function getTeacherAgreementDraft(locale: Locale): TeacherAgreementDraft {
  return locale === "en" ? EN_DRAFT : TR_DRAFT;
}

const TR_DRAFT: TeacherAgreementDraft = {
  title: "Öğretmen Hizmet Sözleşmesi",
  version: "0.1-taslak",
  html: `
<p>Bu Öğretmen Hizmet Sözleşmesi (“<strong>Sözleşme</strong>”), LessonRadar platformunda profil oluşturan ve öğrenci/veli taleplerine cevap veren öğretmenler ile platformu işleten LessonRadar arasındaki hak ve yükümlülükleri düzenler. Hesabınızı oluşturarak veya profilinizi yayınlayarak bu Sözleşmeyi kabul etmiş sayılırsınız.</p>

<h2>1. Taraflar</h2>
<p>Bu Sözleşmenin bir tarafı, profil oluşturan ve aşağıda “<strong>Öğretmen</strong>” olarak anılan gerçek kişidir. Diğer taraf, LessonRadar platformunu işleten ve aşağıda “<strong>Platform</strong>” olarak anılan tüzel kişiliktir. Platform, eğitim hizmeti veren bir kurum değil; öğrencileri Öğretmenlerle buluşturan dijital aracı bir hizmet sağlayıcıdır.</p>

<h2>2. Tanımlar</h2>
<p><strong>Hizmet:</strong> Öğretmenin doğrudan öğrenci veya veliye sunduğu özel ders hizmetidir. <strong>Talep:</strong> Platform üzerinden Öğretmene iletilen ders ilgisi veya başvurusudur. <strong>İçerik:</strong> Öğretmenin profili kapsamında paylaştığı metin, görsel, video ve eğitim materyalidir.</p>

<h2>3. Hizmetin Tanımı ve Niteliği</h2>
<p>Platform, Öğretmenin profilini öğrencilere ve velilere sunan, aralarında iletişim ve ders talebi akışını mümkün kılan dijital bir aracıdır. Platform, Öğretmen ile öğrenci/veli arasında sözleşme tarafı değildir. Ders hizmeti yalnızca Öğretmen ile öğrenci/veli arasında kurulur ve sürdürülür.</p>
<p>Platform; ders içeriğinin kalitesi, sürelerin tutulması, ödeme tahsilatı veya öğrenme çıktısı konusunda taahhüt vermez. Bu konular yalnızca Öğretmenin sorumluluğundadır.</p>

<h2>4. Öğretmenin Yükümlülükleri</h2>
<p>Öğretmen; profilinde paylaştığı kimlik, eğitim, deneyim ve fiyat bilgilerinin <strong>doğru, güncel ve gerçeğe uygun</strong> olduğunu beyan eder. Platform, doğrulama amacıyla diploma, kimlik veya sertifika belgesi talep edebilir; yanlış veya yanıltıcı bilgi tespit edilmesi halinde profili askıya alma veya kapatma hakkını saklı tutar.</p>
<p>Öğretmen; vergi mükellefiyeti, sigorta yükümlülüğü ve ders gelirinden doğan tüm hukuki/mali sorumlulukların kendisine ait olduğunu kabul eder. Platform, Öğretmenin işvereni veya gelirinin vergi sorumlusu değildir.</p>
<p>Öğretmen; öğrenciden aldığı kişisel verileri yalnızca dersin yürütülmesi amacıyla, Kişisel Verilerin Korunması Kanunu (6698 sayılı KVKK) çerçevesinde işler; üçüncü kişilerle paylaşmaz, ders sona erdiğinde makul süre içinde imha eder.</p>
<p>Öğretmen; ayrımcılık içeren, taciz edici, küçük düşürücü veya yasalara aykırı davranışlardan kaçınır; öğrencinin yaşına uygun olmayan içerik paylaşmaz; reşit olmayan öğrencilerle iletişimde veli onayını gözetir.</p>
<p>Öğretmen; Platform dışına yönlendirme yaparak Platform üzerinden eşleşmiş öğrenciyi sözleşme dışı kanallara çekmemeyi taahhüt eder. Bu yükümlülük, Platform üzerinden ilk eşleşmenin gerçekleşmesinden itibaren on iki (12) ay süreyle geçerlidir.</p>

<h2>5. Platformun Yükümlülükleri</h2>
<p>Platform; Öğretmenin profilini, makul ölçüde sürekli ve teknik altyapı çerçevesinde, hizmet kalitesi politikalarına uygun olarak yayınlar. Platform; öğrenci/veli taleplerini Öğretmene zamanında iletmek, doğrulama süreçlerini öngörülen çerçevede yürütmek ve destek kanallarını makul yanıt sürelerinde işletmek için gayret gösterir.</p>
<p>Platform, mücbir sebepler, üçüncü taraf altyapı kesintileri veya planlı bakım nedeniyle hizmette geçici aksaklıklar yaşanabileceğini saklı tutar; bu hallerde tazminat sorumluluğu doğmaz.</p>

<h2>6. Komisyon ve Ödeme</h2>
<p>Bu Sözleşmenin yayın tarihinde Platform, Öğretmenden komisyon almamaktadır. Beta sürecinin sona ermesi ve ödeme aracılığı modülünün devreye alınması durumunda komisyon oranı, devreye giriş tarihinden en az otuz (30) gün önce Öğretmene yazılı olarak bildirilir; Öğretmen, bildirimin ardından bu süre içinde Sözleşmeyi feshetme hakkına sahiptir.</p>
<p>Ödeme aracılığı yürürlüğe girmediği sürece, ders ücretinin tahsilatı yalnızca Öğretmen ile öğrenci/veli arasında düzenlenir; Platform tahsilattan doğan herhangi bir uyuşmazlığa taraf değildir.</p>

<h2>7. Fikri Mülkiyet</h2>
<p>Öğretmenin profilinde, mesajlarında veya ders kapsamında ürettiği içerik (notlar, sınav soruları, video kayıtları vb.) Öğretmenin fikri mülkiyetidir. Öğretmen; Platforma, profilini ve ilgili içeriği yayınlayabilmesi için sınırlı, dünya çapında, telifsiz ve geri alınabilir bir kullanım lisansı verir. Öğretmen profili kapatıldığında bu lisans sona erer.</p>
<p>Platforma ait marka, logo, arayüz, yazılım ve veri tabanı LessonRadar’a aittir. Öğretmen, Platforma ait varlıkları izinsiz kullanamaz veya çoğaltamaz.</p>

<h2>8. Sorumluluk Sınırlaması</h2>
<p>Platform; Öğretmenin verdiği eğitim hizmetinin sonuçları, ders kalitesi, sınav başarısı veya öğrenci memnuniyeti konusunda taahhüt vermez ve sorumlu tutulamaz. Platform; Öğretmen ile öğrenci/veli arasında ortaya çıkan uyuşmazlıklarda taraf değildir; ancak makul ve şeffaf bir destek tutumuyla yardımcı olmaya çalışır.</p>
<p>Yürürlükteki mevzuatın izin verdiği azami sınırlar dahilinde, Platformun her bir Öğretmene karşı toplam mali sorumluluğu, son on iki ay içinde ilgili Öğretmenden tahsil edilen komisyon tutarını veya elli (50) USD karşılığı Türk Lirasını (hangisi yüksekse) aşamaz.</p>

<h2>9. Fesih</h2>
<p>Taraflardan her biri, otuz (30) gün önceden yazılı bildirimle Sözleşmeyi feshedebilir. Profilini sildiğinde Öğretmen Sözleşmeyi kendiliğinden feshetmiş sayılır.</p>
<p>Platform; (i) sahte/yanıltıcı kimlik veya belge tespiti, (ii) öğrenci güvenliğini tehlikeye atan davranış, (iii) yargı kararı ile tedbir, (iv) tekrarlanan etik ihlali hallerinde Sözleşmeyi derhal feshedebilir ve hesabı askıya alabilir. Bu hallerde Öğretmen; tahakkuk etmiş ancak ödenmemiş tahsilatlarını talep etme hakkını saklı tutar.</p>

<h2>10. Veri Sorumluluğu ve KVKK</h2>
<p>Platform; Öğretmenin Platform üzerinde işlediği kişisel veriler bakımından <strong>veri sorumlusu</strong>dur. Öğretmen; Platform dışında öğrenciden aldığı kişisel veriler bakımından kendi başına <strong>veri sorumlusu</strong> sıfatı taşır ve bu verilere ilişkin aydınlatma yükümlülüklerini, saklama süresini ve güvenlik tedbirlerini bizzat yerine getirir. Veri ihlali şüphesi halinde Öğretmen, Platforma yetmiş iki (72) saat içinde bilgi verir.</p>

<h2>11. Sözleşmede Değişiklik</h2>
<p>Platform, Sözleşmenin Öğretmen lehine olmayan maddelerini değiştirmeden önce Öğretmene en az otuz (30) gün önceden yazılı bildirimde bulunur. Bildirim sonrasında Öğretmen Sözleşmeyi feshetmediği takdirde değişikliği kabul etmiş sayılır.</p>

<h2>12. Uyuşmazlık Çözümü ve Uygulanacak Hukuk</h2>
<p>Bu Sözleşme Türkiye Cumhuriyeti hukukuna tabidir. Sözleşmeden doğan uyuşmazlıklarda Gaziantep Mahkemeleri ve İcra Daireleri yetkilidir.</p>

<h2>13. Yürürlük</h2>
<p>Bu Sözleşme, Öğretmenin platformda hesap oluşturduğu veya profilini yayınladığı anda yürürlüğe girer ve taraflardan biri tarafından yukarıdaki hükümler doğrultusunda feshedilene kadar geçerli kalır.</p>
`,
};

const EN_DRAFT: TeacherAgreementDraft = {
  title: "Teacher Service Agreement",
  version: "0.1-draft",
  html: `
<p>This Teacher Service Agreement (the “<strong>Agreement</strong>”) governs the rights and obligations between teachers who create a profile on LessonRadar and respond to student or guardian inquiries (each a “<strong>Teacher</strong>”) and the operator of the LessonRadar platform (the “<strong>Platform</strong>”). By creating an account or publishing a profile, you accept this Agreement.</p>

<h2>1. Parties</h2>
<p>One party is the natural person who creates a profile, referred to below as the “<strong>Teacher</strong>”. The other party is the legal entity operating the LessonRadar platform, referred to below as the “<strong>Platform</strong>”. The Platform is not an education provider; it is a digital intermediary that introduces students to Teachers.</p>

<h2>2. Definitions</h2>
<p><strong>Service:</strong> the private tutoring service the Teacher provides directly to the student or guardian. <strong>Inquiry:</strong> a lesson interest or request forwarded to the Teacher through the Platform. <strong>Content:</strong> the text, imagery, video and instructional material published by the Teacher in connection with the profile.</p>

<h2>3. Scope and Nature of the Service</h2>
<p>The Platform is a digital intermediary that publishes the Teacher’s profile to students and guardians and enables a flow of communication and lesson inquiries between them. The Platform is not a party to any contract between the Teacher and the student or guardian. The lesson contract is formed and performed exclusively between the Teacher and the student or guardian.</p>
<p>The Platform makes no warranties as to lesson quality, time-keeping, payment collection or learning outcomes. These are the Teacher’s sole responsibility.</p>

<h2>4. Teacher Obligations</h2>
<p>The Teacher represents that the identity, education, experience and pricing information disclosed in the profile is <strong>accurate, current and truthful</strong>. The Platform may request a diploma, identification or certification document for verification purposes and reserves the right to suspend or close any profile found to contain false or misleading information.</p>
<p>The Teacher accepts that all tax, social-security and legal/financial obligations arising from lesson income are theirs alone. The Platform is neither the Teacher’s employer nor the tax obligor of their income.</p>
<p>The Teacher will process personal data received from students only for the purpose of delivering the lesson, in compliance with the Turkish Personal Data Protection Law (No. 6698) and, where applicable, the GDPR; will not share such data with third parties; and will erase it within a reasonable time after the lesson ends.</p>
<p>The Teacher will refrain from discriminatory, harassing, demeaning or unlawful behaviour; will not share content inappropriate to the student’s age; and will obtain guardian consent when communicating with minors.</p>
<p>The Teacher agrees not to divert students who were first matched through the Platform to off-Platform channels in circumvention of this Agreement, for a period of twelve (12) months following the first match.</p>

<h2>5. Platform Obligations</h2>
<p>The Platform will publish the Teacher’s profile on a reasonably continuous basis within the limits of its technical infrastructure and service-quality policies. The Platform will use commercially reasonable efforts to forward student inquiries promptly, to operate verification within the disclosed framework and to staff support channels with reasonable response times.</p>
<p>The Platform may experience interruptions due to force majeure, third-party infrastructure outages or scheduled maintenance; no liability for damages arises from such interruptions.</p>

<h2>6. Commission and Payment</h2>
<p>As of the publication date of this Agreement, the Platform charges no commission to Teachers. If the beta period ends and a payment-intermediation module is enabled, the Platform will give the Teacher at least thirty (30) days’ written notice of the applicable commission rate before it takes effect; the Teacher may terminate this Agreement during that period.</p>
<p>Until payment intermediation is enabled, lesson fees are collected solely between the Teacher and the student or guardian; the Platform is not a party to any payment dispute arising from such collection.</p>

<h2>7. Intellectual Property</h2>
<p>Content the Teacher creates within the profile, in messages or as part of a lesson (notes, exam questions, video recordings, etc.) is the Teacher’s intellectual property. The Teacher grants the Platform a limited, worldwide, royalty-free and revocable licence to publish the profile and related content. This licence terminates when the profile is closed.</p>
<p>The Platform’s trademarks, logo, interface, software and database belong to LessonRadar. The Teacher may not use or reproduce Platform assets without permission.</p>

<h2>8. Limitation of Liability</h2>
<p>The Platform makes no warranty and assumes no liability for the outcomes of the Teacher’s instruction, lesson quality, exam results or student satisfaction. The Platform is not a party to disputes between the Teacher and the student or guardian, but will assist with reasonable and transparent support.</p>
<p>To the maximum extent permitted by applicable law, the Platform’s aggregate financial liability to any individual Teacher will not exceed the commission collected from that Teacher in the prior twelve (12) months or the Turkish-lira equivalent of fifty US dollars (USD 50), whichever is higher.</p>

<h2>9. Termination</h2>
<p>Either party may terminate this Agreement on thirty (30) days’ written notice. The Teacher is deemed to have terminated by deleting the profile.</p>
<p>The Platform may terminate immediately and suspend the account in cases of: (i) fraudulent or misleading identity or documentation, (ii) conduct that endangers student safety, (iii) a court-ordered measure, or (iv) repeated breaches of ethical conduct. In such cases the Teacher retains the right to claim accrued but unpaid amounts.</p>

<h2>10. Data Responsibility and Privacy</h2>
<p>The Platform is the <strong>data controller</strong> for personal data the Teacher processes on the Platform. The Teacher is the independent <strong>data controller</strong> for personal data they receive from students outside the Platform and is solely responsible for the disclosure obligations, retention periods and security measures associated with such data. In case of a suspected data breach, the Teacher will notify the Platform within seventy-two (72) hours.</p>

<h2>11. Changes to the Agreement</h2>
<p>The Platform will give the Teacher at least thirty (30) days’ written notice before changing any provision unfavourable to the Teacher. If the Teacher does not terminate within that notice period, the change is deemed accepted.</p>

<h2>12. Governing Law and Forum</h2>
<p>This Agreement is governed by the laws of the Republic of Türkiye. The courts and enforcement offices of Gaziantep have exclusive jurisdiction over disputes arising under this Agreement.</p>

<h2>13. Effective Date</h2>
<p>This Agreement takes effect when the Teacher creates an account or publishes a profile on the Platform and remains in force until terminated by either party in accordance with the provisions above.</p>
`,
};
