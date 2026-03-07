import './App.css';
import { useMemo, useRef, useState } from 'react';
import ContextDiagram from './ContextDiagram';
import ContainerDiagramMermaid from './ContainerDiagramMermaid';

const API_BASE_URL =
  window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

const STEP_ORDER = ['analyze', 'srs', 'context', 'container'];

const STEP_LABELS = {
  analyze: 'Extract Requirements',
  srs: 'SRS',
  context: 'C4 Context',
  container: 'C4 Container',
};

const EMPTY_STATUS = {
  analyze: false,
  srs: false,
  context: false,
  container: false,
};

function formatTimestamp(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDateTime(date = new Date()) {
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadHtmlFile(filename, title, bodyHtml) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #222;
            padding: 24px;
            line-height: 1.5;
          }
          h1, h2, h3, h4, h5 {
            margin-top: 0;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: Consolas, Monaco, monospace;
          }
          svg {
            max-width: 100%;
            height: auto;
          }
          .export-block {
            margin-bottom: 24px;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="export-block">${bodyHtml}</div>
      </body>
    </html>
  `.trim();

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printHtmlDocument(title, bodyHtml) {
  const printWindow = window.open('', '_blank', 'width=1200,height=900');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #222;
            padding: 24px;
            line-height: 1.5;
          }
          h1, h2, h3, h4, h5 {
            margin-top: 0;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: Consolas, Monaco, monospace;
          }
          svg {
            max-width: 100%;
            height: auto;
          }
          .export-block {
            margin-bottom: 24px;
          }
          @page {
            size: auto;
            margin: 16mm;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="export-block">${bodyHtml}</div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}

function ExtractPretty({ data }) {
  if (!data) return <p className="empty-state">No extracted requirements yet.</p>;

  const capabilities =
    data.functional_requirements?.map((item) =>
      item.replace(/^The system shall\s+/i, '').replace(/^The system should\s+/i, '')
    ) || [];

  const sections = [
    {
      title: 'System Snapshot',
      items: [data.system_name || 'Not specified'],
    },
    {
      title: 'Detected Roles',
      items: data.actors?.length ? data.actors : ['None identified'],
    },
    {
      title: 'Detected Goals',
      items: data.goals?.length ? data.goals : ['None identified'],
    },
    {
      title: 'Detected Capabilities',
      items: capabilities.length ? capabilities : ['No clear capabilities extracted'],
    },
    {
      title: 'Assumptions Made by the AI',
      items: data.assumptions?.length ? data.assumptions : ['No assumptions identified'],
    },
    {
      title: 'Missing or Ambiguous Information',
      items: data.missing_information?.length
        ? data.missing_information
        : ['No missing information identified'],
    },
  ];

  return (
    <div className="pretty-analysis">
      {sections.map((section) => (
        <section key={section.title} className="pretty-section">
          <h4>{section.title}</h4>
          <ul>
            {section.items.map((item, index) => (
              <li key={`${section.title}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MarkdownPretty({ content }) {
  if (!content) return <p className="empty-state">No formatted content yet.</p>;

  const lines = content.split('\n');
  const elements = [];
  let listBuffer = [];
  let key = 0;

  const flushList = () => {
    if (!listBuffer.length) return;
    elements.push(
      <ul key={`list-${key++}`} className="pretty-list">
        {listBuffer.map((item, index) => (
          <li key={`li-${key}-${index}`}>{item}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h3 key={`h1-${key++}`} className="pretty-heading-1">
          {trimmed.slice(2)}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h4 key={`h2-${key++}`} className="pretty-heading-2">
          {trimmed.slice(3)}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h5 key={`h3-${key++}`} className="pretty-heading-3">
          {trimmed.slice(4)}
        </h5>
      );
      return;
    }

    if (trimmed.startsWith('- ')) {
      const htmlContent = trimmed
        .slice(2)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      listBuffer.push(
        <span
          key={`md-${key++}`}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      );
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${key++}`} className="pretty-paragraph">
        {trimmed}
      </p>
    );
  });

  flushList();

  return <div className="pretty-markdown">{elements}</div>;
}

function RawPanel({ raw }) {
  return <pre className="raw-output">{raw}</pre>;
}

function PrettyPanel({ entry }) {
  switch (entry.step) {
    case 'analyze':
      return <ExtractPretty data={entry.prettyData} />;
    case 'srs':
      return <MarkdownPretty content={entry.raw} />;
    case 'context':
      return <ContextDiagram chart={entry.raw} title="C4 Context Diagram" />;
    case 'container':
      return <ContainerDiagramMermaid chart={entry.raw} title="C4 Container Diagram" />;
    default:
      return <p className="empty-state">No preview available.</p>;
  }
}

function StepHistoryCard({ entry, pipelineName }) {
  const rawRef = useRef(null);
  const prettyRef = useRef(null);

  const safeBase = slugify(`${pipelineName}-${STEP_LABELS[entry.step]}-${entry.timestamp}`);

  const handleDownloadRaw = () => {
    downloadTextFile(`${safeBase}-raw.txt`, entry.raw);
  };

  const handleDownloadPrettyHtml = () => {
    if (!prettyRef.current) return;
    downloadHtmlFile(
      `${safeBase}-pretty.html`,
      `${pipelineName} - ${STEP_LABELS[entry.step]} (Pretty)`,
      prettyRef.current.innerHTML
    );
  };

  const handlePrintRaw = () => {
    if (!rawRef.current) return;
    printHtmlDocument(
      `${pipelineName} - ${STEP_LABELS[entry.step]} (Raw)`,
      `<pre>${rawRef.current.textContent}</pre>`
    );
  };

  const handlePrintPretty = () => {
    if (!prettyRef.current) return;
    printHtmlDocument(
      `${pipelineName} - ${STEP_LABELS[entry.step]} (Pretty)`,
      prettyRef.current.innerHTML
    );
  };

  return (
    <article className="step-history-card">
      <div className="step-card-header">
        <div>
          <h4>{STEP_LABELS[entry.step]}</h4>
          <p className="history-meta">Executed at {entry.timestamp}</p>
        </div>
      </div>

      <div className="step-panels">
        <section className="history-panel">
          <div className="panel-header">
            <div className="panel-title">Output (Raw)</div>
            <div className="panel-actions">
              <button className="mini-button" onClick={handleDownloadRaw}>
                Download .txt
              </button>
              <button className="mini-button" onClick={handlePrintRaw}>
                Print / Save PDF
              </button>
            </div>
          </div>
          <div ref={rawRef}>
            <RawPanel raw={entry.raw} />
          </div>
        </section>

        <section className="history-panel">
          <div className="panel-header">
            <div className="panel-title">Output (Pretty)</div>
            <div className="panel-actions">
              <button className="mini-button" onClick={handleDownloadPrettyHtml}>
                Download .html
              </button>
              <button className="mini-button" onClick={handlePrintPretty}>
                Print / Save PDF
              </button>
            </div>
          </div>
          <div ref={prettyRef}>
            <PrettyPanel entry={entry} />
          </div>
        </section>
      </div>
    </article>
  );
}

function PipelineRunCard({ run }) {
  const wrapperRef = useRef(null);
  const progress = Math.round((run.steps.length / STEP_ORDER.length) * 100);
  const pipelineName = `Pipeline ${run.sequence}`;

  const handleDownloadPipelineJson = () => {
    downloadTextFile(`${slugify(pipelineName)}.json`, JSON.stringify(run, null, 2));
  };

  const handleDownloadPipelineHtml = () => {
    if (!wrapperRef.current) return;
    downloadHtmlFile(`${slugify(pipelineName)}.html`, pipelineName, wrapperRef.current.innerHTML);
  };

  const handlePrintPipeline = () => {
    if (!wrapperRef.current) return;
    printHtmlDocument(pipelineName, wrapperRef.current.innerHTML);
  };

  return (
    <section className="pipeline-card">
      <div className="pipeline-card-header">
        <div>
          <h3>{pipelineName}</h3>
          <p className="pipeline-meta">
            {run.mode === 'pipeline' ? 'Run Pipeline' : 'Manual run'} • Started {run.startedAt}
            {run.finishedAt ? ` • Finished ${run.finishedAt}` : ''}
          </p>
        </div>

        <div className="pipeline-header-actions">
          <button className="mini-button" onClick={handleDownloadPipelineJson}>
            Download JSON
          </button>
          <button className="mini-button" onClick={handleDownloadPipelineHtml}>
            Download HTML
          </button>
          <button className="mini-button" onClick={handlePrintPipeline}>
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="run-progress-row">
        <div className="run-progress-bar">
          <div className="run-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="run-progress-text">{progress}% complete</span>
      </div>

      <div className="run-step-pill-row">
        {STEP_ORDER.map((step) => {
          const done = run.steps.some((entry) => entry.step === step);
          return (
            <span key={step} className={`run-step-pill ${done ? 'done' : ''}`}>
              {STEP_LABELS[step]}
            </span>
          );
        })}
      </div>

      <div ref={wrapperRef}>
        <div className="pipeline-summary-box">
          <div className="summary-label">Input used for this pipeline</div>
          <pre className="pipeline-input-preview">{run.input}</pre>
        </div>

        <div className="pipeline-sequence-label">Step sequence</div>

        <div className="step-history-list">
          {run.steps.map((entry) => (
            <StepHistoryCard key={entry.id} entry={entry} pipelineName={pipelineName} />
          ))}
        </div>
      </div>
    </section>
  );
}

function App() {
  const [text, setText] = useState('');
  const [requirements, setRequirements] = useState(null);
  const [stepStatus, setStepStatus] = useState(EMPTY_STATUS);
  const [activeAction, setActiveAction] = useState('');
  const [pipelineRuns, setPipelineRuns] = useState([]);
  const [pipelineCounter, setPipelineCounter] = useState(0);
  const [currentRunId, setCurrentRunId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(
    'Run the pipeline to generate requirements, SRS, and C4 models.'
  );
  const [isDirty, setIsDirty] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isBusy = Boolean(activeAction);
  const hasText = text.trim().length > 0;

  const doneStepsCount = STEP_ORDER.filter((step) => stepStatus[step]).length;
  const currentProgress = Math.round((doneStepsCount / STEP_ORDER.length) * 100);

  const canAnalyze = hasText && !isBusy;
  const canRunPipeline = hasText && !isBusy;
  const canGenerateSRS = !isBusy && !isDirty && stepStatus.analyze;
  const canGenerateContext = !isBusy && !isDirty && stepStatus.srs;
  const canGenerateContainer = !isBusy && !isDirty && stepStatus.context;

  const orderedRuns = useMemo(() => pipelineRuns, [pipelineRuns]);

  const createRun = (mode) => {
    const sequence = pipelineCounter + 1;

    const run = {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sequence,
      mode,
      input: text,
      startedAt: formatDateTime(),
      finishedAt: null,
      steps: [],
    };

    setPipelineCounter(sequence);
    setPipelineRuns((prev) => [...prev, run]);
    setCurrentRunId(run.id);
    return run.id;
  };

  const appendStepToRun = (runId, entry, markFinished = false) => {
    setPipelineRuns((prev) =>
      prev.map((run) => {
        if (run.id !== runId) return run;

        return {
          ...run,
          steps: [...run.steps, entry],
          finishedAt: markFinished ? formatDateTime() : run.finishedAt,
        };
      })
    );
  };

  const resetPipelineStateForNewInput = () => {
    setRequirements(null);
    setStepStatus(EMPTY_STATUS);
    setCurrentRunId(null);
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    setText(value);
    setIsDirty(true);
    resetPipelineStateForNewInput();
    setStatusMessage('Input changed. Run the pipeline again for a fresh result set.');
  };

  const postJson = async (url, payload) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }

    return data;
  };

  const runAnalyze = async (runId) => {
    const data = await postJson(`${API_BASE_URL}/generate`, { input: text });
    const raw = JSON.stringify(data.output, null, 2);

    const entry = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      step: 'analyze',
      raw,
      prettyData: data.output,
      timestamp: formatTimestamp(),
    };

    setRequirements(data.output);
    setStepStatus({
      analyze: true,
      srs: false,
      context: false,
      container: false,
    });
    setIsDirty(false);
    appendStepToRun(runId, entry);
    setStatusMessage('Requirements extracted. Formal SRS is next.');

    return data.output;
  };

  const runSRS = async (sourceRequirements, runId) => {
    const data = await postJson(`${API_BASE_URL}/generate-srs`, { requirements: sourceRequirements });

    const entry = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      step: 'srs',
      raw: data.output,
      prettyData: null,
      timestamp: formatTimestamp(),
    };

    setStepStatus((prev) => ({
      ...prev,
      srs: true,
      context: false,
      container: false,
    }));
    appendStepToRun(runId, entry);
    setStatusMessage('Formal SRS generated. C4 Context is next.');

    return data.output;
  };

  const runContext = async (sourceRequirements, runId) => {
    const data = await postJson(`${API_BASE_URL}/generate-c4-context`, { requirements: sourceRequirements });

    const entry = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      step: 'context',
      raw: data.output,
      prettyData: null,
      timestamp: formatTimestamp(),
    };

    setStepStatus((prev) => ({
      ...prev,
      context: true,
      container: false,
    }));
    appendStepToRun(runId, entry);
    setStatusMessage('C4 Context generated. C4 Container is next.');

    return data.output;
  };

  const runContainer = async (sourceRequirements, runId) => {
    const data = await postJson(`${API_BASE_URL}/generate-c4-container`, { requirements: sourceRequirements });

    const entry = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      step: 'container',
      raw: data.output,
      prettyData: null,
      timestamp: formatTimestamp(),
    };

    setStepStatus((prev) => ({
      ...prev,
      container: true,
    }));
    appendStepToRun(runId, entry, true);
    setStatusMessage('Pipeline complete. Review the grouped history below.');

    return data.output;
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!canAnalyze) return;

    try {
      setActiveAction('analyze');
      setStatusMessage('Extracting requirements...');
      const runId = createRun('manual');
      await runAnalyze(runId);
    } catch (error) {
      setStatusMessage(error.message || 'Could not extract requirements.');
    } finally {
      setActiveAction('');
    }
  };

  const handleGenerateSRS = async () => {
    if (!canGenerateSRS || !requirements || !currentRunId) return;

    try {
      setActiveAction('srs');
      setStatusMessage('Generating formal SRS...');
      await runSRS(requirements, currentRunId);
    } catch (error) {
      setStatusMessage(error.message || 'Could not generate SRS.');
    } finally {
      setActiveAction('');
    }
  };

  const handleGenerateC4Context = async () => {
    if (!canGenerateContext || !requirements || !currentRunId) return;

    try {
      setActiveAction('context');
      setStatusMessage('Generating C4 Context...');
      await runContext(requirements, currentRunId);
    } catch (error) {
      setStatusMessage(error.message || 'Could not generate C4 Context.');
    } finally {
      setActiveAction('');
    }
  };

  const handleGenerateC4Container = async () => {
    if (!canGenerateContainer || !requirements || !currentRunId) return;

    try {
      setActiveAction('container');
      setStatusMessage('Generating C4 Container...');
      await runContainer(requirements, currentRunId);
    } catch (error) {
      setStatusMessage(error.message || 'Could not generate C4 Container.');
    } finally {
      setActiveAction('');
    }
  };

  const handleRunPipeline = async () => {
    if (!canRunPipeline) return;

    try {
      setActiveAction('runAll');
      setStatusMessage('Running full pipeline...');
      const runId = createRun('pipeline');
      const analyzedRequirements = await runAnalyze(runId);
      await runSRS(analyzedRequirements, runId);
      await runContext(analyzedRequirements, runId);
      await runContainer(analyzedRequirements, runId);
      setStatusMessage('Full pipeline finished successfully.');
    } catch (error) {
      setStatusMessage(error.message || 'Pipeline failed.');
    } finally {
      setActiveAction('');
    }
  };

  return (
    <div className="App">
      <h1>AI-Assisted Requirement Synthesis</h1>

      <p className="instructions">
        Enter a software requirement, user story, or description in plain English. The
        system will transform it into structured requirements, an SRS, and C4 models.
      </p>

      <form className="input-form" onSubmit={handleAnalyze}>
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Type your requirement here..."
          className="text-input"
          rows={6}
        />

        <div className="pipeline-primary-row">
          <button
            type="button"
            className="submit-button secondary-button pipeline-main-button"
            onClick={handleRunPipeline}
            disabled={!canRunPipeline}
          >
            {activeAction === 'runAll' ? 'Running pipeline...' : 'Run Pipeline'}
          </button>

          <button
            type="button"
            className="toggle-advanced-button"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? 'Hide Advanced Controls' : 'Show Advanced Controls'}
          </button>
        </div>

        {showAdvanced ? (
          <div className="action-bar advanced-bar">
            <button type="submit" className="submit-button primary-button" disabled={!canAnalyze}>
              {activeAction === 'analyze' ? 'Extracting...' : 'Extract Requirements'}
            </button>

            <button
              type="button"
              className="submit-button"
              onClick={handleGenerateSRS}
              disabled={!canGenerateSRS}
            >
              {activeAction === 'srs' ? 'Generating SRS...' : 'Generate SRS'}
            </button>

            <button
              type="button"
              className="submit-button"
              onClick={handleGenerateC4Context}
              disabled={!canGenerateContext}
            >
              {activeAction === 'context' ? 'Generating C4 Context...' : 'Generate C4 Context'}
            </button>

            <button
              type="button"
              className="submit-button"
              onClick={handleGenerateC4Container}
              disabled={!canGenerateContainer}
            >
              {activeAction === 'container'
                ? 'Generating C4 Container...'
                : 'Generate C4 Container'}
            </button>
          </div>
        ) : null}
      </form>

      <section className="pipeline-status-card">
        <div className="pipeline-status-header">
          <div>
            <h2>Pipeline Status</h2>
            <p>{statusMessage}</p>
          </div>
          <div className="pipeline-status-percent">{currentProgress}%</div>
        </div>

        <div className="progress-bar-shell">
          <div
            className={`progress-bar-fill ${isBusy ? 'busy' : ''}`}
            style={{ width: `${currentProgress}%` }}
          />
        </div>

        <div className="progress-step-row">
          {STEP_ORDER.map((step) => (
            <div key={step} className={`progress-step ${stepStatus[step] ? 'done' : ''}`}>
              {STEP_LABELS[step]}
            </div>
          ))}
        </div>
      </section>

      <section className="history-wrapper">
        <div className="history-header">
          <h2>Pipeline History</h2>
          <p>
            Each run is grouped as one pipeline. Inside each pipeline, steps stay in order
            and include both raw output and a prettier view.
          </p>
        </div>

        {orderedRuns.length === 0 ? (
          <div className="empty-history">
            No pipeline runs yet. Start with <strong>Run Pipeline</strong>.
          </div>
        ) : (
          orderedRuns.map((run) => (
            <PipelineRunCard key={run.id} run={run} />
          ))
        )}
      </section>
    </div>
  );
}

export default App;