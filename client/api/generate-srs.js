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
You are a software requirements engineer.

Convert the provided structured requirements JSON into a formal Software Requirements Specification in Markdown.

The SRS must be clearly more formal and more specification-like than the extraction step.

Use exactly these sections:

# Software Requirements Specification
## 1. System Overview
## 2. Actors
## 3. Functional Requirements
## 4. Non-Functional Requirements
## 5. Assumptions and Constraints
## 6. Open Issues

Rules:
- Return Markdown only
- Do not include explanations outside the document
- Functional requirements must be written as formal items with IDs: FR-1, FR-2, ...
- Non-functional requirements must be written as formal items with IDs: NFR-1, NFR-2, ...
- If no non-functional requirements are explicitly available, infer only strongly implied ones
- Constraints such as platform or technology expectations should appear under Assumptions and Constraints
- Missing or ambiguous details should appear under Open Issues
- Keep the style concise, formal, and implementation-oriented
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
    console.error('Generate SRS failed:', error);
    return res.status(500).json({ error: 'Failed to generate SRS.' });
  }
}