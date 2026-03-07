import './App.css';
import { useState } from 'react';
import ContextDiagram from './ContextDiagram';
import ContainerDiagramMermaid from './ContainerDiagramMermaid';

function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [requirements, setRequirements] = useState(null);
  const [loading, setLoading] = useState(false);
  const [outputType, setOutputType] = useState('text');

  const handleAnalyze = async (e) => {
    e.preventDefault();

    if (!text.trim()) return;

    try {
      setLoading(true);
      setResult('Analyzing requirement...');

      const response = await fetch('http://localhost:3001/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOutputType('text');
        setResult(data.error || 'Something went wrong.');
        return;
      }

      setRequirements(data.output);
      setOutputType('json');
      setResult(JSON.stringify(data.output, null, 2));
    } catch (error) {
      setOutputType('text');
      setResult('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSRS = async () => {
    if (!requirements) return;

    try {
      setLoading(true);
      setResult('Generating SRS...');

      const response = await fetch('http://localhost:3001/generate-srs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOutputType('text');
        setResult(data.error || 'Something went wrong.');
        return;
      }

      setOutputType('markdown');
      setResult(data.output);
    } catch (error) {
      setOutputType('text');
      setResult('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateC4Context = async () => {
    if (!requirements) return;

    try {
      setLoading(true);
      setOutputType('text');
      setResult('Generating C4 Context Diagram...');

      const response = await fetch('http://localhost:3001/generate-c4-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOutputType('text');
        setResult(data.error || 'Something went wrong.');
        return;
      }

      setOutputType('context');
      setResult(data.output);
    } catch (error) {
      setOutputType('text');
      setResult('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateC4Container = async () => {
    if (!requirements) return;

    try {
      setLoading(true);
      setOutputType('text');
      setResult('Generating C4 Container Diagram...');

      const response = await fetch('http://localhost:3001/generate-c4-container', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOutputType('text');
        setResult(data.error || 'Something went wrong.');
        return;
      }

      setOutputType('container');
      setResult(data.output);
    } catch (error) {
      setOutputType('text');
      setResult('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>AI-Assisted Requirement Synthesis</h1>
      <p className="instructions">
        Enter a software requirement, user story, or description in plain English. The
        system will attempt to produce a structured specification based on your input.
        This is part of Experiment #2 from the provided document.
      </p>

      <form className="input-form" onSubmit={handleAnalyze}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your requirement here..."
          className="text-input"
          rows={6}
        />
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Loading...' : 'Analyze Requirement'}
        </button>
      </form>

      <div className="button-row">
        <button
          type="button"
          className="submit-button"
          onClick={handleGenerateSRS}
          disabled={!requirements || loading}
        >
          Generate SRS
        </button>

        <button
          type="button"
          className="submit-button"
          onClick={handleGenerateC4Context}
          disabled={!requirements || loading}
        >
          Generate C4 Context
        </button>

        <button
          type="button"
          className="submit-button"
          onClick={handleGenerateC4Container}
          disabled={!requirements || loading}
        >
          Generate C4 Container
        </button>
      </div>

      <div className="output-box">
          <h2>Output</h2>

          {outputType === 'context' ? (
            <ContextDiagram chart={result} />
          ) : outputType === 'container' ? (
            <ContainerDiagramMermaid chart={result} />
          ) : (
            <pre>{result || 'No analysis yet.'}</pre>
          )}
        </div>
      </div>
  );
}

export default App;