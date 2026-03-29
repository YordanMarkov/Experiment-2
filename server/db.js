import mysql from 'mysql2/promise';

let db = null;

try {
  db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'admin',
    database: 'my-db-name',
  });

  console.log('✅ Connected to MySQL');
} catch (error) {
  console.log('⚠️ MySQL not available, continuing without DB');
}

export { db };