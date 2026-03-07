import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const { input } = req.body;

    if (!input || !input.trim()) {
      return res.status(400).json({ error: 'Input is required.' });
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `
You are a requirements engineering assistant.

Analyze the stakeholder description and extract structured requirements.

Return JSON with this structure:

{
  "system_name": "",
  "actors": [],
  "goals": [],
  "functional_requirements": [],
  "non_functional_requirements": [],
  "assumptions": [],
  "missing_information": []
}

Rules:
- Do not invent facts
- If information is missing, add it to missing_information
- Actors must be external users or external systems that interact with the system
- Do not include the system itself as an actor
- Functional requirements must describe what the system should do
- Non-functional requirements must describe quality attributes such as performance, security, usability, reliability, or scalability
- Only include non-functional requirements if they are explicitly stated or strongly implied
- Return JSON only
          `.trim(),
        },
        {
          role: 'user',
          content: input,
        },
      ],
    });

    const rawOutput = response.choices[0].message.content;

    let parsedOutput;
    try {
      parsedOutput = JSON.parse(rawOutput);
    } catch {
      return res.status(500).json({
        error: 'Model did not return valid JSON.',
        rawOutput,
      });
    }

    return res.status(200).json({
      output: parsedOutput,
    });
  } catch (error) {
    console.error('Generate failed:', error);
    return res.status(500).json({ error: 'Failed to generate analysis.' });
  }
}