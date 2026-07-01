import Database from 'better-sqlite3';
import path from 'path';

export const db = new Database(path.join(process.cwd(), 'data', 'hemp-os.db'));
