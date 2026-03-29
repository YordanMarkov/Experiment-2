import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { db } from './db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/generate', async (req, res) => {
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

    res.json({
      output: parsedOutput,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate analysis.' });
  }
});

app.post('/generate-srs', async (req, res) => {
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

    const output = response.choices[0].message.content;

    res.json({
      output,
    });
  } catch (error) {
    console.error('Generate SRS failed:', error);
    res.status(500).json({ error: 'Failed to generate SRS.' });
  }
});

app.post('/generate-c4-context', async (req, res) => {
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

    res.json({
      output: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Generate C4 Context failed:', error);
    res.status(500).json({ error: 'Failed to generate C4 Context.' });
  }
});

app.post('/generate-c4-container', async (req, res) => {
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

    res.json({
      output: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Generate C4 Container failed:', error);
    res.status(500).json({ error: 'Failed to generate C4 Container.' });
  }
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});