/**
 * Middleware: Invisible Bot & Automated Script Protection
 * Features:
 * 1. Honeypot Field Verification (Traps scrapers and automated form fillers)
 * 2. Submission Speed / Interaction Velocity Analysis
 * 3. User-Agent & Payload integrity checks
 */
module.exports = function botProtection(req, res, next) {
  try {
    const body = req.body || {};

    // 1. Honeypot Trap Check:
    // Any value in invisible honeypot fields indicates an automated bot
    const honeypotFields = ['website_url_hp', 'bot_trap_field', 'address_confirm_hidden'];
    for (const field of honeypotFields) {
      if (body[field] && String(body[field]).trim().length > 0) {
        console.warn(`[BOT PROTECTION] Blocked automated bot submission. Honeypot field "${field}" was filled.`);
        return res.status(400).json({
          success: false,
          isBotBlocked: true,
          message: 'Automated submission detected. Request rejected.',
        });
      }
    }

    // 2. Submission Speed Velocity (Only checked if interactionTimeMs is provided)
    if (typeof body.interactionTimeMs === 'number' && body.interactionTimeMs > 0) {
      // If a human fills out an entire complex registration in under 150ms, it is a script
      if (body.interactionTimeMs < 150) {
        console.warn(`[BOT PROTECTION] Blocked ultra-fast script submission (${body.interactionTimeMs}ms).`);
        return res.status(400).json({
          success: false,
          isBotBlocked: true,
          message: 'Submission was too fast. Please fill the form manually.',
        });
      }
    }

    // 3. User-Agent Validation: Disallow completely empty or known malicious scraper agents
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const badAgents = ['curl', 'wget', 'python-requests', 'scrapy', 'headlesschrome', 'phantomjs'];
    if (badAgents.some(agent => ua.includes(agent))) {
      console.warn(`[BOT PROTECTION] Blocked suspicious User-Agent: ${ua}`);
      return res.status(403).json({
        success: false,
        isBotBlocked: true,
        message: 'Direct script access is restricted.',
      });
    }

    next();
  } catch (err) {
    console.error('Error in botProtection middleware:', err);
    next();
  }
};
