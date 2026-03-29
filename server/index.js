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

app.post('/pipeline-runs', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const { input_text } = req.body;

    if (!input_text || !input_text.trim()) {
      return res.status(400).json({ error: 'Input text is required.' });
    }

    const [result] = await db.execute(
      'INSERT INTO pipeline_runs (input_text) VALUES (?)',
      [input_text]
    );

    res.status(201).json({
      id: result.insertId,
    });
  } catch (error) {
    console.error('Create pipeline run failed:', error);
    res.status(500).json({ error: 'Failed to create pipeline run.' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/generate', async (req, res) => {
  try {
    const { input, run_id } = req.body;

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

    let insertedId = null;

    if (db) {
      const [result] = await db.execute(
        'INSERT INTO requirements (content, run_id) VALUES (?, ?)',
        [JSON.stringify(parsedOutput), run_id || null]
      );
      insertedId = result.insertId;
    }

    res.json({
      output: parsedOutput,
      saved: Boolean(db),
      id: insertedId,
    });
  } catch (error) {
    console.error('Generate failed:', error);
    res.status(500).json({ error: 'Failed to generate analysis.' });
  }
});

// NEW: SELECT FROM SQL
app.get('/requirements', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, content, created_at FROM requirements ORDER BY id DESC'
    );

    // Optional: parse JSON content before sending
    const parsed = rows.map((row) => ({
      id: row.id,
      content: typeof row.content === 'string'
        ? JSON.parse(row.content)
        : row.content,
      created_at: row.created_at,
    }));

    res.status(200).json({
      data: parsed,
    });
  } catch (error) {
    console.error('Fetch requirements failed:', error);
    res.status(500).json({ error: 'Failed to fetch requirements.' });
  }
});

app.post('/generate-srs', async (req, res) => {
  try {
    const { requirements, run_id } = req.body;

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

    let insertedId = null;

    if (db) {
      const [result] = await db.execute(
        'INSERT INTO srs_documents (content, run_id) VALUES (?, ?)',
        [output, run_id || null]
      );
      insertedId = result.insertId;
    }

    res.json({
      output,
      saved: Boolean(db),
      id: insertedId,
    });
  } catch (error) {
    console.error('Generate SRS failed:', error);
    res.status(500).json({ error: 'Failed to generate SRS.' });
  }
});

// NEW: SELECT FROM SQL
app.get('/srs', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, content, created_at FROM srs_documents ORDER BY id DESC'
    );
    res.status(200).json({ data: rows });
  } catch (error) {
    console.error('Fetch SRS failed:', error);
    res.status(500).json({ error: 'Failed to fetch SRS documents.' });
  }
});

app.post('/generate-c4-context', async (req, res) => {
  try {
    const { requirements, run_id } = req.body;

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
- The main system must be declared using System(...)
- Do NOT use System_Boundary(...)
- Do NOT use Container(...) or ContainerDb(...)
- Relationship labels must be very short: 1 to 3 words maximum
- Avoid long sentences in relationship labels
- Do not create actor-to-actor relationships
- Keep the diagram visually simple and readable

Example:

C4Context
title Example System Context Diagram

Person(user, "User")
Person(admin, "Admin")
System_Ext(email, "Email Service")

System(main_system, "Example System")

Rel(user, main_system, "Uses")
Rel(admin, main_system, "Manages")
Rel(main_system, email, "Sends")
          `.trim(),
        },
        {
          role: 'user',
          content: JSON.stringify(requirements, null, 2),
        },
      ],
    });

    const output = response.choices[0].message.content;

    let insertedId = null;

    if (db) {
      const [result] = await db.execute(
        'INSERT INTO c4_diagrams (diagram_type, content, run_id) VALUES (?, ?, ?)',
        ['context', output, run_id || null]
      );
      insertedId = result.insertId;
    }

    res.json({
      output,
      saved: Boolean(db),
      id: insertedId,
    });
  } catch (error) {
    console.error('Generate C4 Context failed:', error);
    res.status(500).json({ error: 'Failed to generate C4 Context.' });
  }
});

app.post('/generate-c4-container', async (req, res) => {
  try {
    const { requirements, run_id } = req.body;

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
          `.trim(),
        },
        {
          role: 'user',
          content: JSON.stringify(requirements, null, 2),
        },
      ],
    });

    const output = response.choices[0].message.content;

    let insertedId = null;

    if (db) {
      const [result] = await db.execute(
        'INSERT INTO c4_diagrams (diagram_type, content, run_id) VALUES (?, ?, ?)',
        ['container', output, run_id || null]
      );
      insertedId = result.insertId;
    }

    res.json({
      output,
      saved: Boolean(db),
      id: insertedId,
    });
  } catch (error) {
    console.error('Generate C4 Container failed:', error);
    res.status(500).json({ error: 'Failed to generate C4 Container.' });
  }
});

// NEW: SELECT FROM SQL
app.get('/c4-diagrams', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, diagram_type, content, created_at FROM c4_diagrams ORDER BY id DESC'
    );

    res.status(200).json({
      data: rows,
    });
  } catch (error) {
    console.error('Fetch C4 diagrams failed:', error);
    res.status(500).json({ error: 'Failed to fetch C4 diagrams.' });
  }
});

// NEW: Get history
app.get('/history', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [runs] = await db.execute(
      'SELECT id, input_text, created_at FROM pipeline_runs ORDER BY id DESC'
    );

    const history = [];

    for (const run of runs) {
      const [requirementsRows] = await db.execute(
        'SELECT id, content, created_at FROM requirements WHERE run_id = ? ORDER BY id DESC LIMIT 1',
        [run.id]
      );

      const [srsRows] = await db.execute(
        'SELECT id, content, created_at FROM srs_documents WHERE run_id = ? ORDER BY id DESC LIMIT 1',
        [run.id]
      );

      const [contextRows] = await db.execute(
        `SELECT id, content, created_at
         FROM c4_diagrams
         WHERE run_id = ? AND diagram_type = 'context'
         ORDER BY id DESC
         LIMIT 1`,
        [run.id]
      );

      const [containerRows] = await db.execute(
        `SELECT id, content, created_at
         FROM c4_diagrams
         WHERE run_id = ? AND diagram_type = 'container'
         ORDER BY id DESC
         LIMIT 1`,
        [run.id]
      );

      history.push({
        run_id: run.id,
        input_text: run.input_text,
        created_at: run.created_at,
        requirements: requirementsRows[0]
          ? {
              ...requirementsRows[0],
              content:
                typeof requirementsRows[0].content === 'string'
                  ? JSON.parse(requirementsRows[0].content)
                  : requirementsRows[0].content,
            }
          : null,
        srs: srsRows[0] || null,
        context: contextRows[0] || null,
        container: containerRows[0] || null,
      });
    }

    res.status(200).json({ data: history });
  } catch (error) {
    console.error('Fetch history failed:', error);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});