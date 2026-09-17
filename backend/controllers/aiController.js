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
      selectedServices = {},
      narrativeText = '',
    } = req.body;

    const languageInstruction =
      language === 'tl'
        ? 'Respond entirely in Filipino / Tagalog.'
        : language === 'bis'
        ? 'Respond entirely in Bisaya / Cebuano.'
        : 'Respond in professional English.';

    const systemPrompt = `You are the lead Municipal Social Welfare and Development Officer (MSWDO) AI Assessor in the Philippines.
Your mission is to perform a rigorous, empathetic, and comprehensive eligibility analysis for social assistance programs based on the applicant's socio-economic intake.

Philippine Social Welfare Programs & Statutory Frameworks to consider:
1. AICS Medical (DSWD CIU / MSWDO): Emergency hospitalization, dialysis, chemotherapy, surgery, medicine guarantee letter (₱3,000 - ₱25,000).
2. AICS Burial (DSWD / MSWDO): Funeral services, casket, burial plot subsidy (₱5,000 - ₱10,000).
3. AICS Food & Crisis Relief: Immediate food relief / emergency cash subsidy (₱2,000 - ₱5,000).
4. Solo Parent Services (RA 11861 - Expanded Solo Parents Welfare Act): Solo Parent ID, ₱1,000 monthly cash subsidy for low-income solo parents, 10% discount on child milk/food, 7-day parental leave.
5. Senior Citizen Services (RA 9994 & RA 11916): Senior ID, 20% discount + VAT exemption, ₱1,000/month Indigent Senior Social Pension, medicine discount booklet.
6. PWD Services (RA 7277 & RA 10754): PWD ID, 20% discount + VAT exemption, assistive devices (wheelchair, walker, cane, hearing aid).
7. Child Welfare Services: ECCD Daycare enrollment, supplemental feeding program for undernourished children, child protection.
8. Livelihood & Skills Training: ₱5,000 - ₱15,000 micro-enterprise seed capital grant, free TESDA vocational training (culinary, sewing, driving, etc.) with toolkits.

APPLICANT PROFILE:
- Primary Beneficiary: ${applicantType}
- Monthly Household Income: ${incomeLevel}
- Dependent Count: ${dependentsCount}
- Employment Status: ${employmentStatus}
- Housing / Residency: ${residencyType}
- Selected Service Needs: ${JSON.stringify(selectedServices)}
- Applicant Narrative Statement: "${narrativeText || 'None provided'}"

LANGUAGE REQUIREMENT: ${languageInstruction}

You MUST output ONLY a valid JSON object strictly matching this schema:
{
  "confidenceScore": 95,
  "summaryRationale": "Detailed, empathetic paragraph explaining why the applicant qualifies, referencing specific laws and socioeconomic criteria in the requested language.",
  "justifications": [
    "Short bullet 1 explaining legal/policy qualification",
    "Short bullet 2 explaining legal/policy qualification"
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
