const https = require('https');

const GEMINI_API_KEY = (
  process.env.GEMINI_API_KEY ||
  'AIzaSyCr2mu87r0FCIcPKV9Ufevu5HV1mqck09g'
).trim();

// Available and tested models
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
            timeout: 25000,
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
 * Controller: Analyze Citizen Intake for MSWDO Social Assistance Eligibility
 */
exports.analyzeEligibility = async (req, res) => {
  try {
    const {
      language = 'en', // 'en' | 'tl' | 'bis'
      applicantType = 'self',
      incomeLevel = 'low',
      dependentsCount = '3-5',
      employmentStatus = 'daily',
      residencyType = 'owner',
      selectedHardships = {},
      selectedServices = {},
      narrativeText = '',
    } = req.body;

    const combinedHardships = {
      ...selectedServices,
      ...selectedHardships,
    };

    const languageInstruction =
      language === 'tl'
        ? 'Respond entirely in Filipino / Tagalog.'
        : language === 'bis'
        ? 'Respond entirely in Bisaya / Cebuano.'
        : 'Respond in professional English.';

    const systemPrompt = `You are the lead Municipal Social Welfare and Development Officer (MSWDO) AI Eligibility Diagnostic Assessor in the Philippines.
Your mission is to evaluate the citizen's real-life socio-economic baseline, household demographic vulnerabilities, and hardship circumstances to automatically IDENTIFY and DIAGNOSE all municipal social welfare programs they qualify for.

Philippine Statutory & Social Welfare Frameworks to Match Against:
1. AICS Crisis Assistance (DSWD CIU / MSWDO):
   - Medical & Hospitalization Guarantee Letter (₱3,000 - ₱25,000) for hospital confinement, dialysis, chemotherapy, surgery, medicine prescriptions.
   - Funeral & Burial Financial Grant (₱5,000 - ₱10,000) for casket, mortuary services, and burial lot.
   - Emergency Food Relief & Crisis Cash Aid (₱2,000 - ₱5,000) for severe food shortage, sudden loss of livelihood, or calamity distress.
   - Transportation Assistance for stranded individuals/families returning to provinces.
2. Republic Act 11861 (Expanded Solo Parents Welfare Act):
   - Solo Parent Identification Card
   - ₱1,000 monthly cash subsidy for low-income solo parents
   - 10% discount on child milk, food, and medicines
   - 7-day parental leave & educational scholarship prioritization.
3. Republic Act 9994 & RA 11916 (Expanded Senior Citizens Welfare & Social Pension Act):
   - OSCA Senior Citizen ID & 20% discount + VAT exemption
   - ₱1,000/month Social Pension Allowance for indigent seniors without pension
   - Free purchase booklets for prescription medicines and basic grocery supplies.
4. Republic Act 7277 & RA 10754 (Magna Carta for Persons with Disabilities):
   - National PWD ID Card (20% discount + VAT exemption)
   - Free Assistive Devices (Wheelchairs, walkers, canes, hearing aids)
   - Educational & medical subsidies.
5. Child Welfare & Early Childhood Care (ECCD):
   - Free Daycare / Child Development Center admission
   - 120-day Supplemental Milk & Nutrition Feeding program for underweight toddlers.
6. Sustainable Livelihood Program (SLP):
   - ₱5,000 - ₱15,000 micro-enterprise seed capital grant for sari-sari stores, street vending, tailoring, food business
   - Free TESDA-accredited vocational training with starter toolkits.

APPLICANT REAL-LIFE PROFILE & INTAKE:
- Primary Family Representative: ${applicantType}
- Declared Household Monthly Income: ${incomeLevel}
- Number of Dependents: ${dependentsCount}
- Primary Earner Employment: ${employmentStatus}
- Housing / Residency Status: ${residencyType}
- Reported Real-Life Hardships & Difficulties: ${JSON.stringify(combinedHardships)}
- Applicant Narrative in Their Own Words: "${narrativeText || 'None provided'}"

LANGUAGE REQUIREMENT: ${languageInstruction}

IMPORTANT INSTRUCTIONS:
- You are NOT simply repeating what was selected. You are performing an INTELLIGENT SOCIAL WORK DIAGNOSTIC that connects their real-world hardships and income status to the exact municipal aid programs available.
- If a single mother has a hospitalized child and low income, detect and recommend BOTH AICS Medical AND Solo Parent RA 11861 AND Child Welfare/Livelihood!
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
      "estBenefit": "₱3,000 – ₱25,000",
      "desc": "Explanation of the benefit in the target language.",
      "docs": [
        "Medical Abstract / Certificate",
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
    console.error('[AI Eligibility Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to process AI evaluation through Gemini API',
    });
  }
};

/**
 * Controller: Interactive Chat Q&A with Gemini AI MSWDO Social Worker Assistant
 */
exports.assistantChat = async (req, res) => {
  try {
    const { message, history = [], language = 'en', applicantContext = {} } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

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
      reply,
    });
  } catch (error) {
    console.error('[AI Chat Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
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
