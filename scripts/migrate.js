import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, closePool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');

    // Read the schema.sql file
    const schemaPath = path.join(__dirname, '../src/database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split by statements and execute
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      await query(statement);
      console.log('✅ Executed migration:', statement.substring(0, 50) + '...');
    }

    console.log('✨ All migrations completed successfully!');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await closePool();
    process.exit(1);
  }
}

runMigrations();
