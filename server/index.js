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

    console.log('RAW OUTPUT:', rawOutput);
    console.log('PARSED OUTPUT:', parsedOutput);

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
    console.log('Received /generate-srs request');
    const { requirements } = req.body;
    console.log('Requirements:', requirements);

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

Convert the provided structured requirements JSON into a concise Software Requirements Specification in Markdown.

Use exactly these sections:

# Software Requirements Specification
## System Name
## Actors
## Goals
## Functional Requirements
## Non-Functional Requirements
## Assumptions
## Missing Information

Rules:
- Return Markdown only
- Do not invent missing details
- Preserve uncertainty under "Missing Information"
          `.trim(),
        },
        {
          role: 'user',
          content: JSON.stringify(requirements, null, 2),
        },
      ],
    });

    const output = response.choices[0].message.content;
    console.log('SRS OUTPUT:', output);

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
- Include external users and external systems only
- Use the provided system_name as the main system
- Use concise relationship labels

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
- External services such as email must be outside the system boundary
- Use concise relationship labels
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