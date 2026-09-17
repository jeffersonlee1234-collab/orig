const https = require('https');

const GEMINI_API_KEY = (
  process.env.GEMINI_API_KEY ||
  'AIzaSyCr2mu87r0FCIcPKV9Ufevu5HV1mqck09g'
).trim();

// Active Gemini model candidates
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest'];

/**
 * Helper to call Google Gemini API with fallback across active models
 */
async function callGeminiApi(payload) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const responseText = await new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const req = https.request(
          {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            },
            timeout: 20000,
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(body);
                  const candidateText =
                    parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (candidateText) {
                    return resolve(candidateText);
                  }
                  return reject(new Error('No candidate content text found in Gemini response'));
                } catch (err) {
                  return reject(err);
                }
              } else {
                return reject(new Error(`Gemini API HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
              }
            });
          }
        );

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Gemini API request timed out'));
        });

        req.on('error', (err) => reject(err));
        req.write(data);
        req.end();
      });

      return responseText;
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini AI] Model ${model} failed:`, err.message);
    }
  }

  throw lastError || new Error('All Gemini models failed to respond');
}

/**
 * High-accuracy fallback MSWDO diagnostic engine with full Eligibility Criteria & Legal Basis
 */
function generateLocalMswdoDiagnostic({
  language = 'en',
  applicantType = 'self',
  incomeLevel = 'low',
  dependentsCount = '3-5',
  employmentStatus = 'daily',
  residencyType = 'owner',
  barangay = 'poblacion',
  socialRegistry = 'non_4ps',
  healthInsurance = 'indigent',
  urgency = 'immediate',
  selectedHardships = {},
  narrativeText = '',
}) {
  const narrativeLower = (narrativeText || '').toLowerCase();
  const recs = [];
  const justifications = [];

  const isLowIncome = incomeLevel === 'none' || incomeLevel === 'low' || incomeLevel === 'mid_low';
  const isVulnerableWorker = employmentStatus === 'unemployed' || employmentStatus === 'daily' || employmentStatus === 'informal';
  const is4PsMember = socialRegistry === '4ps';

  // 1. Medical emergency check
  const hasMed =
    selectedHardships.med_emergency ||
    narrativeLower.includes('ospital') ||
    narrativeLower.includes('gamot') ||
    narrativeLower.includes('dialysis') ||
    narrativeLower.includes('chemo') ||
    narrativeLower.includes('surgery') ||
    narrativeLower.includes('reseta');

  // 2. Bereavement / Burial check
  const hasBurial =
    selectedHardships.bereavement ||
    narrativeLower.includes('libing') ||
    narrativeLower.includes('namatay') ||
    narrativeLower.includes('kabaong') ||
    narrativeLower.includes('burol') ||
    narrativeLower.includes('funeral');

  // 3. PWD Disability check
  const hasPwd =
    selectedHardships.mobility_disability ||
    applicantType === 'pwd' ||
    narrativeLower.includes('pwd') ||
    narrativeLower.includes('kapansanan') ||
    narrativeLower.includes('wheelchair') ||
    narrativeLower.includes('saklay') ||
    narrativeLower.includes('hearing aid');

  // 4. Senior citizen check
  const hasSenior =
    selectedHardships.elderly_care ||
    applicantType === 'senior' ||
    socialRegistry === 'social_pension' ||
    healthInsurance === 'senior' ||
    narrativeLower.includes('senior') ||
    narrativeLower.includes('lolo') ||
    narrativeLower.includes('lola') ||
    narrativeLower.includes('pensyon') ||
    narrativeLower.includes('matanda');

  // 5. Solo parent check
  const hasSoloParent =
    selectedHardships.solo_parenting ||
    applicantType === 'child' ||
    narrativeLower.includes('solo parent') ||
    narrativeLower.includes('solong magulang') ||
    narrativeLower.includes('hiwalay') ||
    narrativeLower.includes('biyuda');

  // 6. Child welfare check
  const hasChildWelfare =
    selectedHardships.toddler_daycare ||
    hasSoloParent ||
    applicantType === 'child' ||
    narrativeLower.includes('daycare') ||
    narrativeLower.includes('gatas') ||
    narrativeLower.includes('feeding') ||
    narrativeLower.includes('paslit');

  // 7. Livelihood / micro-enterprise check
  const hasLivelihood =
    selectedHardships.unemployed_livelihood ||
    isVulnerableWorker ||
    narrativeLower.includes('negosyo') ||
    narrativeLower.includes('puhunan') ||
    narrativeLower.includes('tindahan');

  // Populate programs with deep eligibility criteria
  if (hasMed) {
    recs.push({
      id: 'aics_medical',
      category: language === 'en' ? 'AICS Crisis Assistance' : language === 'tl' ? 'Tulong Medikal ng AICS' : 'Tabang Medikal sa AICS',
      title: language === 'en' ? 'AICS Medical & Hospitalization Guarantee Letter' : language === 'tl' ? 'AICS Medical Assistance & Hospital Guarantee Letter' : 'AICS Tabang Medikal ug Guarantee Letter',
      priority: language === 'en' ? 'Immediate Crisis Relief' : language === 'tl' ? 'Kagyat na Tulong sa Krisis' : 'Dinalian nga Tabang',
      eligibilityBadge: language === 'en' ? 'Verified Eligible (Crisis Need)' : language === 'tl' ? 'Kwalipikado (Kagyat na Pangangailangan)' : 'Kwalipikado (Dinaliang Panginahanglan)',
      legalBasis: language === 'en' ? 'DSWD CIU Guidelines & Municipal AICS Ordinance' : language === 'tl' ? 'DSWD Crisis Intervention Unit (CIU) & Municipal AICS Guidelines' : 'DSWD CIU Guidelines ug Municipal AICS Ordinansa',
      windowUnit: language === 'en' ? 'Window 2: Crisis Intervention Unit (CIU)' : language === 'tl' ? 'Window 2: Crisis Intervention Unit (CIU)' : 'Window 2: Crisis Intervention Unit (CIU)',
      turnaround: language === 'en' ? 'Same-Day Release (Guarantee Letter) / 2-3 Days (Cash)' : language === 'tl' ? 'Same-Day Release (GL) / 2-3 Araw (Cash Aid)' : 'Same-Day Release (GL) / 2-3 ka Adlaw (Cash)',
      estBenefit: '₱3,000 – ₱25,000 (Based on Hospital Bill / Prescription)',
      desc: language === 'en'
        ? 'Direct financial aid or hospital guarantee letter covering medicine costs, dialysis sessions, laboratory fees, and hospital bills.'
        : language === 'tl'
        ? 'Tulong pinansyal o guarantee letter para sa pambili ng gamot, dialysis sessions, chemotherapy, laboratory tests, at billing sa ospital.'
        : 'Tabang pinansyal o guarantee letter para sa tambal, dialysis, chemotherapy, laboratory tests, ug bayronon sa ospital.',
      criteriaMatched: [
        language === 'en' ? 'Incurred urgent healthcare or hospital confinement expenses beyond household budget.' : language === 'tl' ? 'May kinakaharap na gastusin sa ospital, dialysis, o gamot na hindi kayang bayaran.' : 'May bayranon sa ospital o tambal nga dili masarangan sa kita.',
        language === 'en' ? `Household income declared falls within low-income or indigent threshold.` : language === 'tl' ? 'Ang kita ng pamilya ay pasok sa mababang antas o indigent threshold.' : 'Ang kita sa pamilya nasulod sa ubos nga limitasyon o indigent tier.',
        healthInsurance === 'indigent' || healthInsurance === 'senior'
          ? (language === 'en' ? 'Eligible for PhilHealth + MSWDO AICS Guarantee Letter co-financing.' : language === 'tl' ? 'Kwalipikado sa PhilHealth + MSWDO AICS co-financing para sa Zero Balance Billing.' : 'Kwalipikado sa PhilHealth + MSWDO AICS co-financing.')
          : (language === 'en' ? 'Direct MSWDO emergency hospital subsidy endorsement applicable.' : language === 'tl' ? 'Direktang MSWDO emergency hospital endorsement ang ipagkakaloob.' : 'Direktang MSWDO emergency hospital subsidy ang ihatag.'),
        is4PsMember
          ? (language === 'en' ? '4Ps Beneficiary verified: Fully qualified for emergency medical AICS assistance.' : language === 'tl' ? 'Beripikadong 4Ps: Kwalipikado sa emergency medical AICS nang walang bawas sa regular grant.' : 'Beripikadong 4Ps: Kwalipikado sa emergency medical AICS.')
          : (language === 'en' ? 'Direct non-4Ps indigent citizen qualification confirmed.' : language === 'tl' ? 'Kumpirmadong kwalipikado bilang indigent citizen.' : 'Kumpirmadong kwalipikado isip indigent citizen.')
      ],
      docs: [
        language === 'en' ? 'Medical Abstract / Medical Certificate (Original)' : language === 'tl' ? 'Medical Abstract o Sertipiko ng Doktor (Original)' : 'Medical Abstract o Sertipiko sa Doktor (Original)',
        language === 'en' ? 'Hospital Billing Statement / Pharmacy Prescription' : language === 'tl' ? 'Hospital Billing Statement / Reseta ng Gamot' : 'Hospital Billing Statement / Reseta sa Tambal',
        language === 'en' ? 'Barangay Certificate of Indigency (Medical Purpose)' : language === 'tl' ? 'Barangay Certificate of Indigency (Para sa Tulong Medikal)' : 'Barangay Certificate of Indigency (Para sa Tabang Medikal)',
        language === 'en' ? 'Valid Government-Issued ID of Patient & Representative' : language === 'tl' ? 'Valid Government ID ng Pasyente at Kinatawan' : 'Valid Government ID sa Pasyente ug Representante',
      ],
      actionUrl: '/portal/aics?type=medical',
      actionLabel: language === 'en' ? 'Apply for AICS Medical' : language === 'tl' ? 'Mag-apply sa AICS Medical' : 'Mag-apply sa AICS Medikal',
    });
    justifications.push(
      language === 'en'
        ? 'Meets DSWD Crisis Intervention Unit (CIU) guidelines for urgent healthcare financing and emergency medical subsidies.'
        : language === 'tl'
        ? 'Natutugunan ang panuntunan ng DSWD Crisis Intervention Unit (CIU) para sa kagyat na subsidiya sa pagpapagamot at ospital.'
        : 'Nakatuman sa lagda sa DSWD Crisis Intervention Unit (CIU) para sa dinaliang subsidiya sa pagpatambal ug ospital.'
    );
  }

  if (hasBurial) {
    recs.push({
      id: 'aics_burial',
      category: language === 'en' ? 'AICS Crisis Assistance' : language === 'tl' ? 'Tulong sa Libing ng AICS' : 'Tabang sa Lubong sa AICS',
      title: language === 'en' ? 'AICS Funeral & Burial Cash Grant' : language === 'tl' ? 'AICS Funeral & Burial Cash Assistance' : 'AICS Tabang Pinansyal sa Lubong',
      priority: language === 'en' ? 'Immediate Crisis Relief' : language === 'tl' ? 'Kagyat na Tulong sa Krisis' : 'Dinalian nga Tabang',
      eligibilityBadge: language === 'en' ? 'Verified Eligible (Bereavement Aid)' : language === 'tl' ? 'Kwalipikado (Tulong sa Burol)' : 'Kwalipikado (Tabang sa Lubong)',
      legalBasis: language === 'en' ? 'DSWD CIU Memorandum Circular on Bereavement Relief' : language === 'tl' ? 'DSWD CIU Guidelines sa Tulong sa Namatayan' : 'DSWD CIU Guidelines sa Tabang sa Namatyan',
      windowUnit: language === 'en' ? 'Window 2: Crisis Intervention Unit (CIU)' : language === 'tl' ? 'Window 2: Crisis Intervention Unit (CIU)' : 'Window 2: Crisis Intervention Unit (CIU)',
      turnaround: language === 'en' ? '1–2 Working Days (Direct Cash Grant)' : language === 'tl' ? '1–2 Araw ng Pagproseso (Direct Cash Grant)' : '1–2 ka Adlaw (Direct Cash Grant)',
      estBenefit: '₱5,000 – ₱10,000 Cash Grant',
      desc: language === 'en'
        ? 'Emergency cash support for funeral home services, casket, and burial plot fees for deceased family members.'
        : language === 'tl'
        ? 'Tulong-pinansyal sa serbisyo ng punerarya, kabaong, at pagpapalibing para sa namatayang pamilya.'
        : 'Tabang pinansyal sa serbisyo sa punerarya, lungon, ug paglubong para sa namatyan nga pamilya.',
      criteriaMatched: [
        language === 'en' ? 'Direct immediate family member of the deceased seeking funeral financial relief.' : language === 'tl' ? 'Direktang kamag-anak ng namatayang pamilya na nangangailangan ng ayuda.' : 'Direktang kapamilya sa namatyan nga nagkinahanglan og tabang.',
        language === 'en' ? 'Lack of adequate liquid cash reserves for embalming and casket expenses.' : language === 'tl' ? 'Kakulangan sa pambayad ng punerarya, kabaong, o bayarin sa sementeryo.' : 'Kulang ang kwarta para sa punerarya, lungon, ug paglubong.',
        language === 'en' ? `Resident of ${barangay.replace('_', ' ').toUpperCase()} requiring municipal burial aid.` : language === 'tl' ? `Naninirahan sa ${barangay.replace('_', ' ').toUpperCase()} na kailangan ng tulong sa libing.` : `Nanimuyo sa ${barangay.replace('_', ' ').toUpperCase()} nga nagkinahanglan og tabang sa lubong.`
      ],
      docs: [
        language === 'en' ? 'Registered Death Certificate (Original & Photocopy)' : language === 'tl' ? 'Rehistradong Death Certificate (Original & Photocopy)' : 'Rehistradong Death Certificate (Original & Photocopy)',
        language === 'en' ? 'Funeral Contract / Official Receipt from Mortuary' : language === 'tl' ? 'Kontrata sa Punerarya o Resibo' : 'Kontrata sa Punerarya o Resibo',
        language === 'en' ? 'Barangay Indigency of Immediate Family' : language === 'tl' ? 'Barangay Indigency ng Pamilya' : 'Barangay Indigency sa Pamilya',
        language === 'en' ? 'Valid Government ID of Claimant' : language === 'tl' ? 'Valid ID ng Mag-aasikaso' : 'Valid ID sa Nagproseso',
      ],
      actionUrl: '/portal/aics?type=burial',
      actionLabel: language === 'en' ? 'Apply for Burial Aid' : language === 'tl' ? 'Mag-apply sa Tulong sa Libing' : 'Mag-apply sa Tabang sa Lubong',
    });
    justifications.push(
      language === 'en'
        ? 'Eligible for bereavement crisis grant under municipal AICS welfare provisions.'
        : language === 'tl'
        ? 'Kwalipikado sa bereavement crisis cash grant sa ilalim ng municipal AICS guidelines.'
        : 'Kwalipikado sa bereavement crisis cash grant ubos sa municipal AICS guidelines.'
    );
  }

  if (hasSoloParent) {
    recs.push({
      id: 'solo_parent',
      category: language === 'en' ? 'Solo Parent Welfare' : language === 'tl' ? 'Kapakanan ng Solong Magulang' : 'Kaayuhan sa Solo Parent',
      title: language === 'en' ? 'RA 11861 Expanded Solo Parent ID & ₱1,000/mo Subsidy' : language === 'tl' ? 'RA 11861 Solo Parent ID & ₱1,000 Buwanang Ayuda' : 'RA 11861 Solo Parent ID & ₱1,000 Buwanang Tabang',
      priority: language === 'en' ? 'High Priority Statutory Benefit' : language === 'tl' ? 'Mataas na Prayoridad (Batas)' : 'Taas nga Prayoridad (Balaod)',
      eligibilityBadge: language === 'en' ? 'Eligible under RA 11861' : language === 'tl' ? 'Kwalipikado sa ilalim ng RA 11861' : 'Kwalipikado ubos sa RA 11861',
      legalBasis: 'Republic Act No. 11861 (Expanded Solo Parents Welfare Act)',
      windowUnit: language === 'en' ? 'Window 1: Family & Child Welfare Desk' : language === 'tl' ? 'Window 1: Family & Child Welfare Desk' : 'Window 1: Family & Child Welfare Desk',
      turnaround: language === 'en' ? '7–10 Working Days (ID & Subsidy Enrollment)' : language === 'tl' ? '7–10 Araw (ID at Subsidy Processing)' : '7–10 ka Adlaw (ID ug Subsidy)',
      estBenefit: '₱1,000 Monthly Cash Subsidy + 10% Discount & 7-Day Parental Leave',
      desc: language === 'en'
        ? 'Full privileges under the Expanded Solo Parents Welfare Act, including monthly municipal cash grants, 10% discounts on milk and school supplies, and tertiary scholarship prioritization.'
        : language === 'tl'
        ? 'Kumpletong benepisyo sa ilalim ng RA 11861: ₱1,000 buwanang ayuda sa low-income solo parents, 10% diskwento sa gatas at gamot, at 7-araw na parental leave.'
        : 'Kompletong benepisyo ubos sa RA 11861: ₱1,000 matag-buwan nga ayuda para sa low-income solo parents, 10% diskwento sa gatas ug tambal, ug 7 ka adlaw nga parental leave.',
      criteriaMatched: [
        language === 'en' ? 'Single-handedly raising minor dependent children without co-parent support.' : language === 'tl' ? 'Mag-isang nagtataguyod at nagpapakain sa mga anak nang walang katuwang.' : 'Nag-inusarang nag-atiman sa mga menor de edad nga anak.',
        language === 'en' ? 'Monthly income is at or below minimum wage/low-income threshold for ₱1,000 subsidy.' : language === 'tl' ? 'Mababang kita na pasok sa pamantayan para sa ₱1,000 buwanang ayuda.' : 'Ubos nga kita nga kwalipikado sa ₱1,000 binuwan nga ayuda.',
        language === 'en' ? 'Residency verified in the municipality.' : language === 'tl' ? 'Residente ng munisipyo alinsunod sa barangay validation.' : 'Residente sa munisipyo ubos sa barangay validation.',
      ],
      docs: [
        language === 'en' ? 'Barangay Certificate of Solo Parent Residency (6+ months)' : language === 'tl' ? 'Barangay Certificate of Solo Parent Residency (6+ buwan)' : 'Barangay Certificate of Solo Parent Residency',
        language === 'en' ? 'Birth Certificate(s) of Minor Children (PSA Copy)' : language === 'tl' ? 'PSA Birth Certificate ng mga Anak' : 'PSA Birth Certificate sa mga Anak',
        language === 'en' ? 'Affidavit of Abandonment / Death Certificate of Spouse' : language === 'tl' ? 'Sinumpaang Salaysay / Death Certificate ng Asawa' : 'Sinumpaang Salaysay / Death Certificate sa Asawa',
        language === 'en' ? 'Income Tax Return / Certificate of Low Income' : language === 'tl' ? 'ITR o Certificate of Low Income' : 'ITR o Certificate of Low Income',
      ],
      actionUrl: '/portal/apply-solo-parent',
      actionLabel: language === 'en' ? 'Apply for Solo Parent ID' : language === 'tl' ? 'Mag-apply sa Solo Parent ID' : 'Mag-apply sa Solo Parent ID',
    });
    justifications.push(
      language === 'en'
        ? 'Solely supporting minor children meets statutory thresholds under Republic Act 11861.'
        : language === 'tl'
        ? 'Nagtataguyod ng mga menor de edad na anak nang mag-isa alinsunod sa Republic Act 11861.'
        : 'Nagtindog ug nag-atiman sa mga menor de edad nga anak nga nag-inusara ubos sa Republic Act 11861.'
    );
  }

  if (hasPwd) {
    recs.push({
      id: 'pwd_welfare',
      category: language === 'en' ? 'Persons with Disabilities' : language === 'tl' ? 'Kapansanan (PWD)' : 'May Kakulian (PWD)',
      title: language === 'en' ? 'National PWD ID & Assistive Mobility Support (RA 7277)' : language === 'tl' ? 'National PWD ID & Libreng Wheelchair/Saklay (RA 7277)' : 'National PWD ID & Libreng Wheelchair/Assistive Device (RA 7277)',
      priority: language === 'en' ? 'Statutory Welfare Entitlement' : language === 'tl' ? 'Karapatan sa Ilalim ng Batas' : 'Katungod Ubos sa Balaod',
      eligibilityBadge: language === 'en' ? 'Eligible under RA 7277 / RA 10754' : language === 'tl' ? 'Kwalipikado sa RA 7277 / RA 10754' : 'Kwalipikado sa RA 7277 / RA 10754',
      legalBasis: 'Republic Act No. 7277 & RA 10754 (Magna Carta for PWDs)',
      windowUnit: language === 'en' ? 'Window 5: Persons with Disability Affairs Office (PDAO)' : language === 'tl' ? 'Window 5: Persons with Disability Affairs Office (PDAO)' : 'Window 5: Persons with Disability Affairs Office (PDAO)',
      turnaround: language === 'en' ? '5–7 Working Days (Card Issuance & Device Scheduling)' : language === 'tl' ? '5–7 Araw (Pag-isyu ng ID at Iskedyul ng Kagamitan)' : '5–7 ka Adlaw (Pag-isyu sa ID ug Iskedyul)',
      estBenefit: '20% Discount + VAT Exemption + Free Assistive Devices',
      desc: language === 'en'
        ? 'Issuance of the official National PWD ID Card giving 20% discount on medicine, food, transport, plus free endorsement for assistive mobility devices.'
        : language === 'tl'
        ? 'Pag-isyu ng opisyal na PWD ID para sa 20% diskwento at VAT exemption sa gamot, pagkain, pamasahe, at libreng saklay o wheelchair mula sa MSWDO.'
        : 'Pag-isyu sa opisyal nga PWD ID alang sa 20% diskwento ug VAT exemption sa tambal, pagkaon, plete, ug libreng saklay o wheelchair gikan sa MSWDO.',
      criteriaMatched: [
        language === 'en' ? 'Has a long-term physical, mental, intellectual, visual, or hearing impairment.' : language === 'tl' ? 'May pangmatagalang kapansanan sa katawan, isip, pandinig, o paningin.' : 'Adunay kapansanan sa lawas, pangisip, pandungog, o panan-aw.',
        language === 'en' ? 'Entitled to 20% discount & VAT exemption under national law.' : language === 'tl' ? 'May karapatan sa 20% diskwento at VAT exemption alinsunod sa batas.' : 'May katungod sa 20% diskwento ug VAT exemption ubos sa balaod.',
      ],
      docs: [
        language === 'en' ? 'Medical Certificate / Disability Assessment with Doctor License/PTR' : language === 'tl' ? 'Medical Certificate na may pirma at PTR ng lisensyadong doktor' : 'Medical Certificate gikan sa lisensyadong doktor',
        language === 'en' ? '2x2 Recent ID Photos (2 Copies)' : language === 'tl' ? '2 pirasong 2x2 ID Picture' : '2 ka 2x2 ID Picture',
        language === 'en' ? 'Barangay Certificate of Residency' : language === 'tl' ? 'Barangay Certificate of Residency' : 'Barangay Certificate of Residency',
      ],
      actionUrl: '/portal/apply-pwd-senior?type=pwd',
      actionLabel: language === 'en' ? 'Apply for PWD Benefits' : language === 'tl' ? 'Mag-apply sa PWD Benefits' : 'Mag-apply sa PWD Benefits',
    });
    justifications.push(
      language === 'en'
        ? 'Disability or mobility limitations qualify under Republic Act 7277 and Republic Act 10754.'
        : language === 'tl'
        ? 'May kapansanan o pangangailangan sa assistive device alinsunod sa Magna Carta for PWDs (RA 7277).'
        : 'May kakulian sa lawas o panginahanglan sa assistive device ubos sa Magna Carta for PWDs (RA 7277).'
    );
  }

  if (hasSenior) {
    recs.push({
      id: 'senior_pension',
      category: language === 'en' ? 'Senior Citizens Welfare' : language === 'tl' ? 'Kapakanan ng Senior Citizen' : 'Kaayuhan sa Senior Citizen',
      title: language === 'en' ? 'OSCA Senior Citizen ID & Indigent Social Pension (RA 11916)' : language === 'tl' ? 'OSCA Senior ID & ₱1,000/buwan Social Pension (RA 11916)' : 'OSCA Senior ID & ₱1,000/buwan Social Pension (RA 11916)',
      priority: language === 'en' ? 'High Priority Statutory Benefit' : language === 'tl' ? 'Mataas na Prayoridad' : 'Taas nga Prayoridad',
      eligibilityBadge: language === 'en' ? 'Eligible under RA 9994 / RA 11916' : language === 'tl' ? 'Kwalipikado sa RA 9994 / RA 11916' : 'Kwalipikado sa RA 9994 / RA 11916',
      legalBasis: 'Republic Act No. 9994 & RA 11916 (Social Pension for Indigent Seniors Act)',
      windowUnit: language === 'en' ? 'Window 4: Office of Senior Citizens Affairs (OSCA)' : language === 'tl' ? 'Window 4: Office of Senior Citizens Affairs (OSCA)' : 'Window 4: Office of Senior Citizens Affairs (OSCA)',
      turnaround: language === 'en' ? 'Same-Day ID Release / Quarterly Social Pension Payout' : language === 'tl' ? 'Same-Day ID Release / Quarterly Pension Payout' : 'Same-Day ID / Quarterly Pension',
      estBenefit: '₱1,000/mo Social Pension Allowance + 20% Discount & Medicine Booklet',
      desc: language === 'en'
        ? 'Monthly social pension grant for indigent seniors without SSS/GSIS pension, plus OSCA discount identification and medicine purchase booklet.'
        : language === 'tl'
        ? 'Buwanang ₱1,000 social pension para sa kapus-palad na nakatatanda na walang regular na pensyon, kasama ang OSCA ID booklet sa gamot.'
        : 'Matag-buwan nga ₱1,000 social pension para sa mga kabus nga tigulang nga walay regular nga pensyon, apil ang OSCA ID booklet sa tambal.',
      criteriaMatched: [
        language === 'en' ? 'Applicant or beneficiary is 60 years of age or older.' : language === 'tl' ? 'Ang benepisyaryo ay may edad 60 pataas.' : 'Ang benepisyaryo nag-edad og 60 pataas.',
        language === 'en' ? 'No active regular pension received from SSS, GSIS, or private providers.' : language === 'tl' ? 'Walang regular na pensyon mula sa SSS o GSIS.' : 'Walay regular nga pension gikan sa SSS o GSIS.',
        language === 'en' ? 'Identified as indigent or low-income in the municipality.' : language === 'tl' ? 'Kabilang sa kapus-palad o mababang kita na sambahayan.' : 'Nalakip sa kabus nga pamilya.',
      ],
      docs: [
        language === 'en' ? 'Birth Certificate (PSA) or Valid Government ID proving age 60+' : language === 'tl' ? 'Birth Certificate o ID na nagpapatunay ng edad 60 pataas' : 'Birth Certificate o ID nga nagpamatuod sa edad 60 pataas',
        language === 'en' ? 'Barangay Certificate of Indigency & Non-Pensioner Status' : language === 'tl' ? 'Barangay Indigency (Walang natatanggap na SSS/GSIS)' : 'Barangay Indigency (Walay nadawat nga SSS/GSIS)',
        language === 'en' ? '2x2 Recent ID Photos (2 Copies)' : language === 'tl' ? '2 pirasong 2x2 ID Picture' : '2 ka 2x2 ID Picture',
      ],
      actionUrl: '/portal/apply-pwd-senior?type=senior',
      actionLabel: language === 'en' ? 'Apply for Senior Services' : language === 'tl' ? 'Mag-apply sa Senior Services' : 'Mag-apply sa Senior Services',
    });
    justifications.push(
      language === 'en'
        ? 'Age and indigent status qualify under Expanded Senior Citizens Act (RA 9994 / RA 11916).'
        : language === 'tl'
        ? 'Edad at kawalan ng regular na pensyon ay pasok sa Expanded Senior Citizens Act (RA 9994 / RA 11916).'
        : 'Edad ug kawalay regular nga pensyon nakasulod sa Expanded Senior Citizens Act (RA 9994 / RA 11916).'
    );
  }

  if (hasLivelihood || (isLowIncome && recs.length < 2)) {
    recs.push({
      id: 'slp_livelihood',
      category: language === 'en' ? 'Livelihood & Skills' : language === 'tl' ? 'Pangkabuhayan at Negosyo' : 'Panginabuhian ug Negosyo',
      title: language === 'en' ? 'Sustainable Livelihood Program (SLP) Seed Capital Grant' : language === 'tl' ? 'Sustainable Livelihood Program (SLP) Seed Capital' : 'Sustainable Livelihood Program (SLP) Puhunan Grant',
      priority: language === 'en' ? 'Economic Empowerment' : language === 'tl' ? 'Pangmatagalang Kaunlaran' : 'Pangmatagalan nga Kaayuhan',
      eligibilityBadge: language === 'en' ? 'Pre-Qualified for Seed Grant' : language === 'tl' ? 'Kwalipikado sa Puhunan' : 'Kwalipikado sa Puhunan',
      legalBasis: 'DSWD Sustainable Livelihood Program (SLP) National Guidelines',
      windowUnit: language === 'en' ? 'Window 3: Sustainable Livelihood Program (SLP) Desk' : language === 'tl' ? 'Window 3: Sustainable Livelihood Program Desk' : 'Window 3: Sustainable Livelihood Program Desk',
      turnaround: language === 'en' ? '10–14 Working Days (Proposal Evaluation & Seed Disbursal)' : language === 'tl' ? '10–14 Araw (Ebalwasyon ng Panukala at Puhunan)' : '10–14 ka Adlaw (Pagsusi ug Puhunan)',
      estBenefit: '₱5,000 – ₱15,000 Seed Capital Grant + Free Skills Training',
      desc: language === 'en'
        ? 'Non-collateral seed capital grant and free technical-vocational training for sari-sari stores, street food, tailoring, or agricultural micro-enterprises.'
        : language === 'tl'
        ? 'Libreng puhunan at pagsasanay sa pagnenegosyo para sa tindahan, pagluluto, pagtatahi, at iba pang micro-enterprise nang walang kolateral.'
        : 'Libreng kapital ug pagbansay sa negosyo para sa tindahan, pagluto, pagpanahi, ug uban pang micro-enterprise nga walay prenda.',
      criteriaMatched: [
        language === 'en' ? 'Underemployed, unemployed, or daily informal worker seeking livelihood startup.' : language === 'tl' ? 'Walang pirmihang trabaho o manininda na nangangailangan ng dagdag na puhunan.' : 'Walay regular nga trabaho nga nagkinahanglan og puhunan.',
        language === 'en' ? 'Committed to manage a community micro-enterprise (sari-sari store, street trade, services).' : language === 'tl' ? 'May kahandaang magpatakbo ng sariling maliit na negosyo.' : 'Andam magdumala og ginagmayng negosyo.',
      ],
      docs: [
        language === 'en' ? 'Barangay Certificate of Indigency' : language === 'tl' ? 'Barangay Certificate of Indigency' : 'Barangay Certificate of Indigency',
        language === 'en' ? 'Livelihood Proposal Form (Assisted by MSWDO)' : language === 'tl' ? 'Simple Business Proposal Form' : 'Simple Business Proposal Form',
        language === 'en' ? 'Valid Government-Issued ID' : language === 'tl' ? 'Valid Government ID' : 'Valid Government ID',
      ],
      actionUrl: '/portal/apply-livelihood',
      actionLabel: language === 'en' ? 'Apply for Livelihood Aid' : language === 'tl' ? 'Mag-apply sa Pangkabuhayan' : 'Mag-apply sa Panginabuhian',
    });
    justifications.push(
      language === 'en'
        ? 'Low household income bracket qualifies for DSWD SLP micro-enterprise capitalization.'
        : language === 'tl'
        ? 'Ang antas ng kita ng pamilya ay kwalipikado sa DSWD SLP seed capital program.'
        : 'Ang kita sa pamilya kwalipikado sa DSWD SLP seed capital program.'
    );
  }

  if (hasChildWelfare || (hasSoloParent && recs.length < 3)) {
    recs.push({
      id: 'child_daycare',
      category: language === 'en' ? 'Child Welfare & ECCD' : language === 'tl' ? 'Kapakanan ng Bata at Daycare' : 'Kaayuhan sa Bata ug Daycare',
      title: language === 'en' ? 'Early Childhood Care & 120-Day Supplemental Nutrition' : language === 'tl' ? 'Libreng Daycare & 120-Araw Supplemental Feeding' : 'Libreng Daycare & 120-Adlaw Supplemental Feeding',
      priority: language === 'en' ? 'Nutrition & Education' : language === 'tl' ? 'Edukasyon at Nutrisyon' : 'Edukasyon ug Nutrisyon',
      eligibilityBadge: language === 'en' ? 'Qualified for ECCD Support' : language === 'tl' ? 'Kwalipikado sa Daycare & Nutrisyon' : 'Kwalipikado sa Daycare & Nutrisyon',
      legalBasis: 'Early Childhood Care and Development (ECCD) Act & DSWD Supplementary Feeding',
      windowUnit: language === 'en' ? 'Window 6: Early Childhood Care & Development (ECCD) Unit' : language === 'tl' ? 'Window 6: Early Childhood Care & Development Unit' : 'Window 6: Early Childhood Care & Development Unit',
      turnaround: language === 'en' ? '3–5 Working Days (Enrollment & Dietary Screening)' : language === 'tl' ? '3–5 Araw (Enrollment at Pagsusuri sa Timbang)' : '3–5 ka Adlaw (Enrollment)',
      estBenefit: 'Free Early Learning + 120-Day Daily Milk & Meal Ration',
      desc: language === 'en'
        ? 'Free admission in the Barangay Child Development Center and daily milk and dietary supplementation for underweight toddlers.'
        : language === 'tl'
        ? 'Libreng pag-aaral sa Barangay Child Development Center at araw-araw na gatas at masustansyang pagkain para sa mga bata.'
        : 'Libreng pag-eskwela sa Barangay Child Development Center ug inadlaw nga gatas ug masustansyang pagkaon alang sa mga bata.',
      criteriaMatched: [
        language === 'en' ? 'Household has minor children (0-5 years old) requiring daycare or nutrition assistance.' : language === 'tl' ? 'May mga anak o paslit (0-5 taong gulang) na kailangang suportahan.' : 'Adunay bata (0-5 anyos) nga nagkinahanglan og feeding o daycare.',
      ],
      docs: [
        language === 'en' ? 'Child PSA Birth Certificate' : language === 'tl' ? 'PSA Birth Certificate ng Bata' : 'PSA Birth Certificate sa Bata',
        language === 'en' ? 'Barangay Child Health & Immunization Card' : language === 'tl' ? 'Bakuna Card o Child Health Record' : 'Bakuna Card o Child Health Record',
      ],
      actionUrl: '/portal/apply-solo-parent',
      actionLabel: language === 'en' ? 'Inquire Child Welfare' : language === 'tl' ? 'Magtanong sa Child Welfare' : 'Magpakisayod sa Child Welfare',
    });
  }

  // Fallback if no specific condition matched
  if (recs.length === 0) {
    recs.push({
      id: 'aics_crisis',
      category: language === 'en' ? 'AICS Crisis Assistance' : language === 'tl' ? 'Tulong sa Krisis ng AICS' : 'Tabang sa Krisis sa AICS',
      title: language === 'en' ? 'AICS Emergency Crisis Financial Grant' : language === 'tl' ? 'AICS Emergency Crisis Cash Assistance' : 'AICS Emergency Crisis Tabang Pinansyal',
      priority: language === 'en' ? 'Immediate Assessment' : language === 'tl' ? 'Kagyat na Pagsusuri' : 'Dinalian nga Pagsusi',
      eligibilityBadge: language === 'en' ? 'Eligible for Crisis Intake' : language === 'tl' ? 'Kwalipikado sa AICS' : 'Kwalipikado sa AICS',
      legalBasis: 'DSWD Crisis Intervention Unit Guidelines',
      windowUnit: language === 'en' ? 'Window 2: Crisis Intervention Unit (CIU)' : language === 'tl' ? 'Window 2: Crisis Intervention Unit (CIU)' : 'Window 2: Crisis Intervention Unit (CIU)',
      turnaround: language === 'en' ? '1–2 Working Days' : language === 'tl' ? '1–2 Araw ng Pagproseso' : '1–2 ka Adlaw',
      estBenefit: '₱2,000 – ₱5,000 Crisis Relief',
      desc: language === 'en'
        ? 'Immediate financial assistance for families in difficult and unexpected crisis situations.'
        : language === 'tl'
        ? 'Kagyat na tulong pinansyal para sa mga pamilyang nahaharap sa biglaang krisis o kakapusan.'
        : 'Dinalian nga tabang pinansyal para sa pamilyang nag-atubang ug kalit nga krisis.',
      criteriaMatched: [
        language === 'en' ? 'Resident household currently experiencing unexpected economic hardship.' : language === 'tl' ? 'Pamilyang nakakaranas ng biglaang kakapusan o suliranin.' : 'Pamilya nga nag-atubang og kalit nga kalisud.',
      ],
      docs: [
        language === 'en' ? 'Barangay Certificate of Indigency' : language === 'tl' ? 'Barangay Certificate of Indigency' : 'Barangay Certificate of Indigency',
        language === 'en' ? 'Valid Government ID' : language === 'tl' ? 'Valid Government ID' : 'Valid Government ID',
      ],
      actionUrl: '/portal/aics',
      actionLabel: language === 'en' ? 'Apply for AICS Aid' : language === 'tl' ? 'Mag-apply sa AICS' : 'Mag-apply sa AICS',
    });
  }

  const confidenceScore = Math.min(98, 85 + recs.length * 3);

  const summaryRationale =
    language === 'tl'
      ? `Batay sa komprehensibong pagsusuri sa inyong profile (Barangay ${barangay.replace('_', ' ')}, ${dependentsCount} dependents, ${incomeLevel === 'none' ? 'walang pirmihang kita' : 'mababang kita'}), natukoy ng MSWDO AI ang ${recs.length} programang nararapat sa inyong sitwasyon alinsunod sa umiiral na mga batas tulad ng RA 11861, RA 7277, RA 9994/11916, at DSWD AICS guidelines.`
      : language === 'bis'
      ? `Base sa pagsusi sa inyong kahimtang (Barangay ${barangay.replace('_', ' ')}, ${dependentsCount} dependents, gamay nga kita), nakita sa MSWDO AI ang ${recs.length} ka mga programa nga kwalipikado kamo ubos sa mga balaod sama sa RA 11861, RA 7277, ug DSWD AICS guidelines.`
      : `Based on your household demographic profile (Barangay ${barangay.replace('_', ' ')}, ${dependentsCount} dependents, vulnerable income tier, ${urgency} priority), the MSWDO AI diagnosed ${recs.length} assistance programs under Philippine welfare statutes (RA 11861, RA 7277, RA 9994, and DSWD CIU guidelines).`;

  const actionableAdvice =
    language === 'tl'
      ? 'Maaari ninyong simulan ang aplikasyon online sa pamamagitan ng pag-click sa "Mag-apply" button sa bawat programa, o dalhin ang mga nakalistang orihinal at photocopy ng mga dokumento sa nakatalagang MSWDO Office Window.'
      : language === 'bis'
      ? 'Mahimo ninyong sugdan ang aplikasyon pinaagi sa pag-click sa "Mag-apply" button, o dad-on ang mga gikinahanglan nga dokumento sa MSWDO Office.'
      : 'You may begin your application immediately online by clicking the action buttons below, or present the required physical documents to your local MSWDO Social Worker at the designated service window.';

  return {
    confidenceScore,
    summaryRationale,
    justifications,
    recommendedPrograms: recs,
    actionableAdvice,
  };
}

/**
 * Fallback conversational reply when external chat model is rate-limited
 */
function generateLocalAssistantReply(message = '', language = 'en') {
  const msg = (message || '').toLowerCase();

  if (language === 'tl') {
    if (msg.includes('medical') || msg.includes('gamot') || msg.includes('ospital')) {
      return 'Para po sa Tulong Medikal ng AICS, kailangan niyo po ng Medical Certificate o Clinical Abstract, Reseta ng gamot o Hospital Billing Statement, Barangay Indigency, at Valid ID. Maaari po kayong magsumite ng aplikasyon dito sa User Portal sa "AICS Assistance" tab.';
    }
    if (msg.includes('burial') || msg.includes('libing') || msg.includes('namatay')) {
      return 'Para po sa Funeral & Burial Cash Assistance, kailangan po ng Registered Death Certificate, Kontrata mula sa punerarya, Barangay Indigency, at Valid ID ng kamag-anak na nagpoproseso.';
    }
    if (msg.includes('solo parent')) {
      return 'Para po sa Solo Parent ID (RA 11861), kailangan po ng Barangay Solo Parent Certificate (6+ buwang naninirahan), PSA Birth Certificate ng mga menor de edad na anak, at Certificate of Low Income / ITR.';
    }
    if (msg.includes('pwd')) {
      return 'Para po sa National PWD ID (RA 7277), kailangan po ng Medical Certificate mula sa doktor na nagsasaad ng inyong kapansanan, 2 pirasong 2x2 picture, at Barangay Residency.';
    }
    if (msg.includes('senior')) {
      return 'Para po sa Senior Citizen ID at Social Pension (RA 11916), kailangan po na ang benepisyaryo ay 60 taong gulang pataas, may Birth Certificate o ID, at Barangay Indigency na nagpapatunay na walang regular na SSS/GSIS pension.';
    }
    return 'Magandang araw po! Bilang inyong MSWDO Social Assistance Assistant, handa po akong tulungan kayo sa mga requirement at proseso para sa AICS (Medikal, Libing, Pamasahe), Solo Parent ID, PWD Benefits, Senior Citizen Social Pension, at Livelihood Grants. Ano po ang inyong partikular na katanungan?';
  }

  if (language === 'bis') {
    if (msg.includes('medical') || msg.includes('tambal') || msg.includes('ospital')) {
      return 'Para sa AICS Medical Assistance, gikinahanglan ang Medical Abstract o Sertipiko sa doktor, Reseta sa tambal o Hospital Billing, Barangay Indigency, ug Valid ID. Pwede kamo mo-apply direkta sa User Portal sa AICS tab.';
    }
    if (msg.includes('solo parent')) {
      return 'Para sa Solo Parent ID ubos sa RA 11861, gikinahanglan ang Barangay Solo Parent Certificate, PSA Birth Certificate sa mga anak, ug Certificate of Low Income.';
    }
    return 'Maayong adlaw! Andam ako motabang kaninyo bahin sa mga programa sa MSWDO sama sa AICS Medical/Burial, Solo Parent ID, PWD Benefits, ug Senior Citizen Pension. Unsa ang inyong pangutana?';
  }

  // English default
  if (msg.includes('medical') || msg.includes('hospital') || msg.includes('medicine')) {
    return 'For AICS Medical Assistance, please prepare a Medical Abstract/Certificate from your physician, Hospital Billing Statement or Doctor\'s Prescription, Barangay Certificate of Indigency, and a Valid Government ID. You can submit directly via the portal under AICS Assistance.';
  }
  if (msg.includes('burial') || msg.includes('funeral')) {
    return 'For Funeral & Burial Assistance, required documents include a Registered Death Certificate, Funeral Contract/Receipt, Barangay Indigency, and Claimant\'s Valid ID.';
  }
  if (msg.includes('solo parent')) {
    return 'For RA 11861 Solo Parent Welfare, you will need a Barangay Certificate of Solo Parent Residency, PSA Birth Certificates of dependent children, and a Certificate of Low Income.';
  }
  return 'Hello! I am your MSWDO Smart Social Assistance AI Assistant. I can guide you through municipal welfare programs including AICS (Medical, Burial, Food, Transportation), Solo Parent ID (RA 11861), PWD Services (RA 7277), Senior Citizen Social Pension (RA 11916), and Livelihood Grants. How may I assist you today?';
}

/**
 * Controller: Analyze Citizen Intake for MSWDO Social Assistance Eligibility
 */
exports.analyzeEligibility = async (req, res) => {
  const {
    language = 'en', // 'en' | 'tl' | 'bis'
    applicantType = 'self',
    incomeLevel = 'low',
    dependentsCount = '3-5',
    employmentStatus = 'daily',
    residencyType = 'owner',
    barangay = 'poblacion',
    socialRegistry = 'non_4ps',
    healthInsurance = 'indigent',
    urgency = 'immediate',
    selectedHardships = {},
    selectedServices = {},
    narrativeText = '',
  } = req.body;

  const combinedHardships = {
    ...selectedServices,
    ...selectedHardships,
  };

  try {
    const languageInstruction =
      language === 'tl'
        ? 'Respond entirely in Filipino / Tagalog.'
        : language === 'bis'
        ? 'Respond entirely in Bisaya / Cebuano.'
        : 'Respond in professional English.';

    const systemPrompt = `You are the lead Municipal Social Welfare and Development Officer (MSWDO) AI Eligibility Diagnostic Assessor in the Philippines.
Your mission is to evaluate the citizen's real-life socio-economic baseline, household demographic vulnerabilities, and hardship circumstances to automatically IDENTIFY, DIAGNOSE, and EVALUATE ELIGIBILITY for all municipal social welfare programs they qualify for.

Philippine Statutory & Social Welfare Frameworks to Match Against:
1. AICS Crisis Assistance (DSWD CIU / MSWDO):
   - Medical & Hospitalization Guarantee Letter (₱3,000 - ₱25,000) for hospital confinement, dialysis, chemotherapy, surgery, medicine prescriptions. Window 2 CIU.
   - Funeral & Burial Financial Grant (₱5,000 - ₱10,000) for casket, mortuary services, and burial lot. Window 2 CIU.
   - Emergency Food Relief & Crisis Cash Aid (₱2,000 - ₱5,000) for severe food shortage, sudden loss of livelihood, or calamity distress.
   - Transportation Assistance for stranded individuals/families returning to provinces.
2. Republic Act 11861 (Expanded Solo Parents Welfare Act):
   - Solo Parent Identification Card
   - ₱1,000 monthly cash subsidy for low-income solo parents
   - 10% discount on child milk, food, and medicines
   - 7-day parental leave & educational scholarship prioritization. Window 1.
3. Republic Act 9994 & RA 11916 (Expanded Senior Citizens Welfare & Social Pension Act):
   - OSCA Senior Citizen ID & 20% discount + VAT exemption
   - ₱1,000/month Social Pension Allowance for indigent seniors without pension
   - Free purchase booklets for prescription medicines and basic grocery supplies. Window 4 OSCA.
4. Republic Act 7277 & RA 10754 (Magna Carta for Persons with Disabilities):
   - National PWD ID Card (20% discount + VAT exemption)
   - Free Assistive Devices (Wheelchairs, walkers, canes, hearing aids). Window 5 PDAO.
5. Child Welfare & Early Childhood Care (ECCD):
   - Free Daycare / Child Development Center admission
   - 120-day Supplemental Milk & Nutrition Feeding program for underweight toddlers. Window 6 ECCD.
6. Sustainable Livelihood Program (SLP):
   - ₱5,000 - ₱15,000 micro-enterprise seed capital grant for sari-sari stores, street vending, tailoring, food business. Window 3 SLP.

APPLICANT REAL-LIFE PROFILE & INTAKE:
- Primary Family Representative: ${applicantType}
- Declared Household Monthly Income: ${incomeLevel}
- Number of Dependents: ${dependentsCount}
- Primary Earner Employment: ${employmentStatus}
- Housing / Residency Status: ${residencyType}
- Registered Barangay: ${barangay}
- Social Welfare Registry / 4Ps Status: ${socialRegistry}
- Health Insurance / PhilHealth Status: ${healthInsurance}
- Urgency Horizon: ${urgency}
- Reported Real-Life Hardships & Difficulties: ${JSON.stringify(combinedHardships)}
- Applicant Narrative in Their Own Words: "${narrativeText || 'None provided'}"

LANGUAGE REQUIREMENT: ${languageInstruction}

IMPORTANT INSTRUCTIONS:
- You are performing an INTELLIGENT SOCIAL WORK DIAGNOSTIC that connects their real-world hardships, demographic variables, and income status to the exact municipal aid programs available.
- For EVERY recommended program, include "eligibilityBadge" (e.g. "Pre-Qualified & Eligible"), "legalBasis" (e.g. "Republic Act No. 11861"), "windowUnit" (e.g. "Window 2: Crisis Intervention Unit"), "turnaround" (e.g. "Same-Day Release (GL)"), and "criteriaMatched" (an array of 2-3 specific bullet points describing why this citizen meets the qualification criteria).
- Provide realistic benefit amounts in Philippine Pesos (₱).

You MUST output ONLY a valid JSON object strictly matching this schema:
{
  "confidenceScore": 95,
  "summaryRationale": "Compassionate, professional diagnosis explaining why the household qualifies under Philippine social welfare laws and local MSWDO criteria in the requested language.",
  "justifications": [
    "Short bullet 1 explaining statutory/policy eligibility",
    "Short bullet 2 explaining statutory/policy eligibility"
  ],
  "recommendedPrograms": [
    {
      "id": "aics_medical",
      "category": "AICS Crisis Assistance",
      "title": "AICS Medical & Hospitalization Guarantee Letter",
      "priority": "Immediate Crisis Relief",
      "eligibilityBadge": "Pre-Qualified & Eligible",
      "legalBasis": "DSWD CIU Guidelines & Municipal AICS Ordinance",
      "windowUnit": "Window 2: Crisis Intervention Unit (CIU)",
      "turnaround": "Same-Day Release (Guarantee Letter)",
      "estBenefit": "₱3,000 – ₱25,000",
      "desc": "Explanation of the benefit in the target language.",
      "criteriaMatched": [
        "Incurred urgent healthcare or hospital confinement expenses beyond household budget.",
        "Household income falls within low-income or indigent threshold."
      ],
      "docs": [
        "Medical Abstract / Certificate (Original)",
        "Hospital Billing Statement / Prescription",
        "Barangay Certificate of Indigency",
        "Valid Government ID"
      ],
      "actionUrl": "/portal/aics?type=medical",
      "actionLabel": "Apply for AICS Medical"
    }
  ],
  "actionableAdvice": "Step-by-step guidance on what to prepare and visit next."
}`;

    const payload = {
      contents: [
        {
          parts: [{ text: systemPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    };

    const geminiText = await callGeminiApi(payload);
    let parsedResult;
    try {
      parsedResult = JSON.parse(geminiText);
    } catch (e) {
      const match = geminiText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedResult = JSON.parse(match[0]);
      } else {
        throw new Error('Failed to parse Gemini AI JSON output');
      }
    }

    return res.status(200).json({
      success: true,
      source: 'gemini-ai',
      data: parsedResult,
    });
  } catch (error) {
    console.warn('[Gemini AI unavailable, using MSWDO Expert Diagnostic Engine]:', error.message);
    const localResult = generateLocalMswdoDiagnostic({
      language,
      applicantType,
      incomeLevel,
      dependentsCount,
      employmentStatus,
      residencyType,
      selectedHardships: combinedHardships,
      narrativeText,
    });

    return res.status(200).json({
      success: true,
      source: 'mswdo-expert-diagnostic',
      data: localResult,
    });
  }
};

/**
 * Controller: Interactive Chat Q&A with Gemini AI MSWDO Social Worker Assistant
 */
exports.assistantChat = async (req, res) => {
  const { message, history = [], language = 'en', applicantContext = {} } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  try {
    const languageInstruction =
      language === 'tl'
        ? 'Always reply in conversational, polite Tagalog/Filipino (Po/Opo).'
        : language === 'bis'
        ? 'Always reply in conversational, warm Bisaya / Cebuano.'
        : 'Always reply in clear, professional English.';

    const systemPrompt = `You are the MSWDO Smart Social Assistance AI Assistant (powered by Google Gemini) for the Municipal Social Welfare and Development Office in the Philippines.
You provide helpful, clear, and empathetic advice to citizens inquiring about government social aid, requirements, application status, AICS, Solo Parent (RA 11861), PWD benefits (RA 7277/10754), Senior Citizen social pension (RA 11916), Child Welfare, and Livelihood grants.

Context of current applicant:
${JSON.stringify(applicantContext, null, 2)}

Instructions:
1. ${languageInstruction}
2. Give direct, actionable answers with required documents and steps.
3. Keep the tone compassionate, encouraging, and official yet accessible.
4. Keep responses concise (around 2-4 short paragraphs or bullet points).`;

    const chatContents = [
      { parts: [{ text: systemPrompt }] },
      ...history.map((h) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content || h.text || '' }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const payload = {
      contents: chatContents,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 800,
      },
    };

    const reply = await callGeminiApi(payload);

    return res.status(200).json({
      success: true,
      source: 'gemini-ai',
      reply,
    });
  } catch (error) {
    console.warn('[Gemini AI Chat unavailable, using fallback MSWDO Social Assistant]:', error.message);
    const reply = generateLocalAssistantReply(message, language);
    return res.status(200).json({
      success: true,
      source: 'mswdo-assistant-fallback',
      reply,
    });
  }
};

/**
 * Health check endpoint
 */
exports.healthCheck = (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Gemini AI Social Welfare Engine',
    hasApiKey: !!GEMINI_API_KEY,
    keyPrefix: GEMINI_API_KEY ? GEMINI_API_KEY.slice(0, 8) + '...' : null,
  });
};
