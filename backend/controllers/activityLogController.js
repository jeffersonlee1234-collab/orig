const db = require('../config/db');


async function logActivity({ actor, actorRole, action, module, referenceNo, subject, detail }) {
  try {
    await db.query(
      `INSERT INTO activity_log (actor, actor_role, action, module, reference_no, subject, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [actor, actorRole, action, module, referenceNo, subject, detail || null]
    );
  } catch (err) {
    console.error('Hindi na-log ang activity:', err);
  }
}

// GET /api/activity-log
// Ibinabalik lang ang mga entries na hindi pa deleted (deleted_at IS NULL)
exports.getActivityLog = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, actor, actor_role, action, module, reference_no, subject, detail, created_at
       FROM activity_log
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    );
    res.json({ activity: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hindi makuha ang activity log.' });
  }
};

// GET /api/activity-log/deleted
// Para sa "Recently Deleted" view — mga entries na may deleted_at
exports.getDeletedActivityLog = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, actor, actor_role, action, module, reference_no, subject, detail, created_at, deleted_at
       FROM activity_log
       WHERE deleted_at IS NOT NULL
       ORDER BY deleted_at DESC`
    );
    res.json({ activity: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hindi makuha ang deleted activity log.' });
  }
};

// PATCH /api/activity-log/:id/soft-delete
// Hindi talaga binubura — nilalagyan lang ng timestamp para maalis sa main list
// pero mapupunta sa "Recently Deleted" (pwede pang i-restore)
exports.softDeleteActivity = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE activity_log
       SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, actor, actor_role, action, module, reference_no, subject, detail, created_at, deleted_at`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Hindi nahanap ang entry o na-delete na ito.' });
    }
    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hindi na-delete ang entry.' });
  }
};

// PATCH /api/activity-log/:id/restore
// Ibinabalik sa main list ang isang soft-deleted entry
exports.restoreActivity = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE activity_log
       SET deleted_at = NULL
       WHERE id = $1 AND deleted_at IS NOT NULL
       RETURNING id, actor, actor_role, action, module, reference_no, subject, detail, created_at`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Hindi nahanap ang entry sa trash.' });
    }
    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hindi na-restore ang entry.' });
  }
};

// DELETE /api/activity-log/:id
// Permanenteng binubura sa database — hindi na mababawi
exports.permanentlyDeleteActivity = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `DELETE FROM activity_log WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Hindi nahanap ang entry.' });
    }
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hindi na-permanently delete ang entry.' });
  }
};

exports.logActivity = logActivity;