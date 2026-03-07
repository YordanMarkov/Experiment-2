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

Generate a C4 Level 2 Container Diagram using Mermaid C4 syntax.

Rules:
- Use C4Container syntax only
- Return Mermaid code only
- Do not include triple backticks
- Do not include explanations
- The system boundary must use the provided system_name
- Use realistic generic containers only
- Prefer these containers when appropriate:
  - Web Application
  - Backend API
  - Database
- External services such as email or notification service must be outside the system boundary
- Relationship labels must be very short: 1 to 3 words maximum
- Avoid long sentences in relationship labels
- Keep descriptions concise
- Keep the diagram visually simple and readable
- Do not invent unnecessary technologies; generic technology labels are acceptable

Example:

C4Container
title Example System

Person(user, "User")
Person(admin, "Admin")
System_Ext(email, "Email Service")

System_Boundary(system, "Example System") {
  Container(webapp, "Web Application", "Frontend", "User interface")
  Container(api, "Backend API", "Backend Service", "Business logic")
  ContainerDb(db, "Database", "Relational Database", "Stores application data")
}

Rel(user, webapp, "Uses")
Rel(admin, webapp, "Uses")
Rel(webapp, api, "Calls")
Rel(api, db, "Reads/Writes")
Rel(api, email, "Sends emails")
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
    console.error('Generate C4 Container failed:', error);
    return res.status(500).json({ error: 'Failed to generate C4 Container.' });
  }
}