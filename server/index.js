import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/generate', async (req, res) => {
  try {
    const { input } = req.body;

    if (!input || !input.trim()) {
      return res.status(400).json({ error: 'Input is required.' });
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a requirements engineering assistant. Analyze the user input and return a short structured summary with actors, goals, assumptions, and missing information.',
        },
        {
          role: 'user',
          content: input,
        },
      ],
    });

    res.json({
      output: response.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate analysis.' });
  }
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});