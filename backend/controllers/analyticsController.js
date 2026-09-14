const db = require('../config/db');

exports.getAnalyticsOverview = async (req, res) => {
  try {
    const range = req.query.range || 'Last 6 Months';

    // Fetch from all database tables with individual fallback (excluding archived)
    const [
      aicsRes,
      pwdSeniorRes,
      soloParentRes,
      childWelfareRes,
      livelihoodRes,
      disbRes,
    ] = await Promise.all([
      db.query(`SELECT id, status, created_at, assistance_type FROM aics_applications WHERE (is_archived IS NOT true)`).catch(() => 
        db.query(`SELECT id, status, created_at, assistance_type FROM aics_applications`).catch(() => ({ rows: [] }))
      ),
      db.query(`SELECT id, status, created_at, category, type FROM pwd_senior_applications WHERE (is_archived IS NOT true)`).catch(() => 
        db.query(`SELECT id, status, created_at, category, type FROM pwd_senior_applications`).catch(() => ({ rows: [] }))
      ),
      db.query(`SELECT id, application_status as status, created_at, application_type FROM solo_parent_applications WHERE application_status != 'draft' AND (is_archived IS NOT true)`).catch(() => ({ rows: [] })),
      db.query(`SELECT id, application_status as status, created_at FROM child_welfare_applications WHERE application_status != 'draft' AND (is_archived IS NOT true)`).catch(() => ({ rows: [] })),
      db.query(`SELECT id, application_status as status, created_at FROM livelihood_applications WHERE (is_archived IS NOT true)`).catch(() => ({ rows: [] })),
      db.query(`SELECT id, fixed_amount, assistance_type, status, date_approved, released_date, created_at FROM financial_aid_disbursements WHERE (is_archived IS NOT true)`).catch(() => 
        db.query(`SELECT id, fixed_amount, assistance_type, status, date_approved, released_date, created_at FROM financial_aid_disbursements`).catch(() => ({ rows: [] }))
      ),
    ]);

    const isApproved = (s) => {
      const lower = String(s || '').toLowerCase();
      return lower === 'approved' || lower === 'completed' || lower === 'for_release';
    };
    const isPending = (s) => {
      const lower = String(s || '').toLowerCase();
      return lower === 'pending' || lower === 'under_review' || lower === 'submitted';
    };
    const isRejected = (s) => {
      const lower = String(s || '').toLowerCase();
      return lower === 'rejected' || lower === 'denied';
    };

    const aicsApps = aicsRes.rows || [];
    const pwdSeniorApps = pwdSeniorRes.rows || [];
    const soloWelfareApps = [...(soloParentRes.rows || []), ...(childWelfareRes.rows || [])];
    const livelihoodApps = livelihoodRes.rows || [];
    const disbursements = disbRes.rows || [];

    const stats = [
      {
        module: 'AICS',
        total: aicsApps.length,
        pending: aicsApps.filter((a) => isPending(a.status)).length,
        approved: aicsApps.filter((a) => isApproved(a.status)).length,
        rejected: aicsApps.filter((a) => isRejected(a.status)).length,
      },
      {
        module: 'PWD & Senior Citizen',
        total: pwdSeniorApps.length,
        pending: pwdSeniorApps.filter((a) => isPending(a.status)).length,
        approved: pwdSeniorApps.filter((a) => isApproved(a.status)).length,
        rejected: pwdSeniorApps.filter((a) => isRejected(a.status)).length,
      },
      {
        module: 'Solo Parent & Child Welfare',
        total: soloWelfareApps.length,
        pending: soloWelfareApps.filter((a) => isPending(a.status)).length,
        approved: soloWelfareApps.filter((a) => isApproved(a.status)).length,
        rejected: soloWelfareApps.filter((a) => isRejected(a.status)).length,
      },
      {
        module: 'Livelihood & Training',
        total: livelihoodApps.length,
        pending: livelihoodApps.filter((a) => isPending(a.status)).length,
        approved: livelihoodApps.filter((a) => isApproved(a.status)).length,
        rejected: livelihoodApps.filter((a) => isRejected(a.status)).length,
      },
    ];

    const totalApps = stats.reduce((acc, m) => acc + m.total, 0);
    const totalApproved = stats.reduce((acc, m) => acc + m.approved, 0);
    const totalPending = stats.reduce((acc, m) => acc + m.pending, 0);
    const totalRejected = stats.reduce((acc, m) => acc + m.rejected, 0);
    const totalDecided = totalApproved + totalRejected;
    const approvalRate = totalDecided > 0 ? Math.round((totalApproved / totalDecided) * 100) : 0;

    let aicsDisbursed = 0;
    let pensionDisbursed = 0;
    let educationDisbursed = 0;
    let livelihoodDisbursed = 0;

    for (const d of disbursements) {
      const amt = Number(d.fixed_amount || 0);
      const type = String(d.assistance_type || '').toLowerCase();
      if (type.includes('pension') || type.includes('senior') || type.includes('pwd')) {
        pensionDisbursed += amt;
      } else if (type.includes('education') || type.includes('child') || type.includes('solo')) {
        educationDisbursed += amt;
      } else if (type.includes('livelihood') || type.includes('training') || type.includes('kit')) {
        livelihoodDisbursed += amt;
      } else {
        aicsDisbursed += amt;
      }
    }

    const totalDisbursed = aicsDisbursed + pensionDisbursed + educationDisbursed + livelihoodDisbursed;

    const disbursementSources = [
      { label: 'AICS', amount: aicsDisbursed },
      { label: 'Social pension', amount: pensionDisbursed },
      { label: 'Educational assistance', amount: educationDisbursed },
      { label: 'Livelihood kit funding', amount: livelihoodDisbursed },
    ];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const recentMonths = [];

    let monthsCount = 6;
    if (range === 'This Month') monthsCount = 1;
    else if (range === 'Last 3 Months') monthsCount = 3;
    else if (range === 'Year to Date') monthsCount = now.getMonth() + 1;

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      const label = monthNames[mIdx];

      const isSameMonth = (dateVal) => {
        if (!dateVal) return false;
        const dt = new Date(dateVal);
        return dt.getFullYear() === y && dt.getMonth() === mIdx;
      };

      const monthAppCount =
        aicsApps.filter((a) => isSameMonth(a.created_at)).length +
        pwdSeniorApps.filter((a) => isSameMonth(a.created_at)).length +
        soloWelfareApps.filter((a) => isSameMonth(a.created_at)).length +
        livelihoodApps.filter((a) => isSameMonth(a.created_at)).length;

      const monthDisbursed = disbursements
        .filter((disb) => isSameMonth(disb.released_date || disb.date_approved || disb.created_at))
        .reduce((sum, disb) => sum + Number(disb.fixed_amount || 0), 0);

      recentMonths.push({
        label: `${label}${monthsCount > 6 ? ` ${String(y).slice(2)}` : ''}`,
        year: y,
        month: mIdx,
        applications: monthAppCount,
        disbursed: monthDisbursed,
      });
    }

    res.json({
      success: true,
      data: {
        totals: {
          total: totalApps,
          approved: totalApproved,
          pending: totalPending,
          rejected: totalRejected,
          disbursed: totalDisbursed,
          approvalRate,
        },
        moduleStats: stats,
        disbursementSources,
        recentMonths,
        range,
      },
    });
  } catch (err) {
    console.error('Error computing analytics overview:', err);
    res.status(500).json({ error: 'Failed to compute analytics overview', details: err.message });
  }
};
