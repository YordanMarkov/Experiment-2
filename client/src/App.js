import './App.css';
import { useState } from 'react';

function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim()) return;

    try {
      setLoading(true);
      setResult('Analyzing requirement...');

      const response = await fetch('http://localhost:3001/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult(data.error || 'Something went wrong.');
        return;
      }

      setResult(data.output);
    } catch (error) {
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

      <form className="input-form" onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your requirement here..."
          className="text-input"
          rows={6}
        />
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Requirement'}
        </button>
      </form>

      <div className="output-box">
        <h2>Output</h2>
        <pre>{result || 'No analysis yet.'}</pre>
      </div>
    </div>
  );
}

export default App;