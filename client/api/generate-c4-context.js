import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const { requirements } = req.body;

    if (!requirements) {
      return res.status(400).json({ error: 'Requirements JSON is required.' });
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `
You are a software architect.

Generate a C4 Level 1 Context Diagram using Mermaid C4 syntax.

Rules:
- Use C4Context syntax only
- Return Mermaid code only
- Do not include triple backticks
- Do not include explanations
- Include only external users and external systems
- Use the provided system_name as the main system
- Relationship labels must be very short: 1 to 3 words maximum
- Avoid long sentences in relationship labels
- Do not create actor-to-actor relationships
- Keep the diagram visually simple and readable

Example:

C4Context
title Example System

Person(user, "User")
Person(admin, "Admin")
System_Ext(email, "Email Service")

System(system, "Example System")

Rel(user, system, "Uses")
Rel(admin, system, "Manages")
Rel(system, email, "Sends emails")
          `.trim(),
        },
        {
          role: 'user',
          content: JSON.stringify(requirements, null, 2),
        },
      ],
    });

    return res.status(200).json({
      output: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Generate C4 Context failed:', error);
    return res.status(500).json({ error: 'Failed to generate C4 Context.' });
  }
}