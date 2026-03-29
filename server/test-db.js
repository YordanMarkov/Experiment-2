import { db } from './db.js';

export default async function handler(req, res) {
  try {
    // 1. Create table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message VARCHAR(255)
      )
    `);

    // 2. Insert test data
    await db.execute(
      'INSERT INTO test_table (message) VALUES (?)',
      ['Hello from backend']
    );

    // 3. Read data
    const [rows] = await db.execute('SELECT * FROM test_table');

    res.status(200).json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB test failed' });
  }
}