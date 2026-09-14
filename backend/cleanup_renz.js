const db = require('./config/db');

async function cleanup() {
  console.log('Starting full database cleanup for user Renz Mahinay Millares / QCID 110000572516915...');

  const term = '%renz%';
  const refTerm = '%110000572516915%';
  const millaresTerm = '%millares%';

  try {
    // 1. Delete appointments for Renz
    try {
      const apptRes = await db.query(
        `DELETE FROM appointments 
         WHERE applicant_name ILIKE $1 
            OR reference_no ILIKE $2 
            OR applicant_name ILIKE $3`,
        [term, refTerm, millaresTerm]
      );
      console.log(`Deleted ${apptRes.rowCount} appointments.`);
    } catch (e) {
      console.log('appointments cleanup error:', e.message);
    }

    // 2. Delete financial aid disbursements
    try {
      const disbRes = await db.query(
        `DELETE FROM financial_aid_disbursements 
         WHERE applicant_name ILIKE $1 
            OR application_ref ILIKE $2 
            OR applicant_name ILIKE $3`,
        [term, refTerm, millaresTerm]
      );
      console.log(`Deleted ${disbRes.rowCount} financial aid disbursements.`);
    } catch (e) {
      console.log('financial_aid_disbursements cleanup error:', e.message);
    }

    // 3. Delete AICS applications & documents
    try {
      const aicsApps = await db.query(
        `SELECT id FROM aics_applications 
         WHERE first_name ILIKE $1 
            OR last_name ILIKE $3 
            OR reference_no ILIKE $2 
            OR qc_id ILIKE $2`,
        [term, refTerm, millaresTerm]
      );
      
      if (aicsApps.rows.length > 0) {
        const ids = aicsApps.rows.map(r => r.id);
        await db.query(`DELETE FROM aics_documents WHERE application_id = ANY($1::int[])`, [ids]).catch(() => {});
        const delAics = await db.query(`DELETE FROM aics_applications WHERE id = ANY($1::int[])`, [ids]);
        console.log(`Deleted ${delAics.rowCount} AICS applications.`);
      } else {
        console.log('Deleted 0 AICS applications.');
      }
    } catch (e) {
      console.log('aics_applications cleanup error:', e.message);
    }

    // 4. Delete PWD / Senior applications
    try {
      const pwdSeniorRes = await db.query(
        `DELETE FROM pwd_senior_applications 
         WHERE first_name ILIKE $1 
            OR last_name ILIKE $3 
            OR reference_number ILIKE $2`,
        [term, refTerm, millaresTerm]
      );
      console.log(`Deleted ${pwdSeniorRes.rowCount} PWD/Senior applications.`);
    } catch (e) {
      console.log('pwd_senior_applications cleanup error:', e.message);
    }

    // 5. Delete Solo Parent applications
    try {
      const spRes = await db.query(
        `DELETE FROM solo_parent_applications 
         WHERE first_name ILIKE $1 
            OR last_name ILIKE $3 
            OR reference_number ILIKE $2 
            OR qcid_number ILIKE $2`,
        [term, refTerm, millaresTerm]
      );
      console.log(`Deleted ${spRes.rowCount} Solo Parent applications.`);
    } catch (e) {
      console.log('solo_parent_applications cleanup error:', e.message);
    }

    // 6. Delete Child Welfare applications
    try {
      const cwRes = await db.query(
        `DELETE FROM child_welfare_applications 
         WHERE guardian_first_name ILIKE $1 
            OR guardian_last_name ILIKE $3 
            OR reference_number ILIKE $2 
            OR child_name ILIKE $1`,
        [term, refTerm, millaresTerm]
      );
      console.log(`Deleted ${cwRes.rowCount} Child Welfare applications.`);
    } catch (e) {
      console.log('child_welfare_applications cleanup error:', e.message);
    }

    // 7. Delete Livelihood applications
    try {
      const lhApps = await db.query(
        `SELECT id FROM livelihood_applications 
         WHERE first_name ILIKE $1 
            OR last_name ILIKE $3 
            OR reference_number ILIKE $2 
            OR qcid ILIKE $2`,
        [term, refTerm, millaresTerm]
      );
      if (lhApps.rows.length > 0) {
        const ids = lhApps.rows.map(r => r.id);
        await db.query(`DELETE FROM livelihood_monitoring WHERE application_id = ANY($1::int[])`, [ids]).catch(() => {});
        await db.query(`DELETE FROM livelihood_assistance WHERE application_id = ANY($1::int[])`, [ids]).catch(() => {});
        const delLh = await db.query(`DELETE FROM livelihood_applications WHERE id = ANY($1::int[])`, [ids]);
        console.log(`Deleted ${delLh.rowCount} Livelihood applications.`);
      } else {
        console.log('Deleted 0 Livelihood applications.');
      }
    } catch (e) {
      console.log('livelihood_applications cleanup error:', e.message);
    }

    // 8. Delete User Notifications
    try {
      const notifRes = await db.query(
        `DELETE FROM user_notifications 
         WHERE user_id ILIKE $2 OR application_ref ILIKE $2`,
        [refTerm]
      );
      console.log(`Deleted ${notifRes.rowCount} user notifications.`);
    } catch (e) {
      console.log('user_notifications cleanup error:', e.message);
    }

    // 9. Delete Activity Logs for Renz
    try {
      const actRes = await db.query(
        `DELETE FROM activity_log 
         WHERE actor ILIKE $1 OR reference_no ILIKE $2 OR subject ILIKE $1`,
        [term, refTerm]
      );
      console.log(`Deleted ${actRes.rowCount} activity logs.`);
    } catch (e) {
      console.log('activity_log cleanup error:', e.message);
    }

    console.log('✅ PostgreSQL database cleanup completed successfully!');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    process.exit(0);
  }
}

cleanup();
