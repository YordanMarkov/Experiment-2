import { db } from './db.js';

export default async function handler(req, res) {
  app.get('/test-db', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message VARCHAR(255)
      )
    `);

    await db.execute(
      'INSERT INTO test_table (message) VALUES (?)',
      ['Hello from backend']
    );

    const [rows] = await db.execute('SELECT * FROM test_table');

    res.status(200).json({
      success: true,
      data: rows,
    });
    } catch (error) {
        console.error('DB test failed:', error);
        res.status(500).json({ error: 'DB test failed' });
    }
    });
}