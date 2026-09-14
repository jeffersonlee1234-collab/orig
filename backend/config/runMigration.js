// Run standalone migration script against PostgreSQL database
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
  console.log('🔄 Running Solo Parent PostgreSQL migration...');
  try {
    const sqlPath = path.join(__dirname, 'migrate_solo_parent.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await db.query(sql);
    console.log('✅ Solo Parent PostgreSQL migration executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
