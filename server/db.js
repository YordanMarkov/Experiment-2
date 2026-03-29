import mysql from 'mysql2/promise';

export const db = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin',
  database: 'my-db-name'
});

console.log("✅ Connected to MySQL");