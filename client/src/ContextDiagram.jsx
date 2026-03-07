import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  suppressErrorRendering: true,
  themeVariables: {
    primaryColor: '#4f8fd6',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#3f79ba',
    lineColor: '#4f5b66',
    fontSize: '13px',
  },
});

function cleanChart(chart) {
  if (!chart) return '';

  let cleaned = chart.trim();

  cleaned = cleaned.replace(/^```mermaid\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```$/i, '');

  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');
  cleaned = cleaned.replace(/\u00A0/g, ' ');
  cleaned = cleaned.replace(/\u200B/g, '');
  cleaned = cleaned.replace(/\u200C/g, '');
  cleaned = cleaned.replace(/\u200D/g, '');
  cleaned = cleaned.replace(/\uFEFF/g, '');
  cleaned = cleaned.replace(/[“”]/g, '"');
  cleaned = cleaned.replace(/[‘’]/g, "'");
  cleaned = cleaned.replace(/\t/g, '  ');

  return cleaned.trim();
}

function enhanceContextLayout(chart) {
  const cleaned = cleanChart(chart);
  if (!cleaned) return '';

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const headerLines = [];
  const personLines = [];
  const externalSystemLines = [];
  const systemLines = [];
  const relLines = [];
  const otherLines = [];

  for (const line of lines) {
    if (line.startsWith('C4Context') || line.startsWith('title ')) {
      headerLines.push(line);
    } else if (/^Person(_Ext)?\(/.test(line)) {
      personLines.push(line);
    } else if (/^System_Ext\(/.test(line)) {
      externalSystemLines.push(line);
    } else if (/^System\(/.test(line)) {
      systemLines.push(line);
    } else if (/^Rel(_[A-Z][a-zA-Z]*)?\(/.test(line)) {
      relLines.push(line);
    } else if (/^Update(LayoutConfig|RelStyle|ElementStyle)\(/.test(line)) {
      // ignore old auto-generated layout/style lines so we control them
    } else {
      otherLines.push(line);
    }
  }

  const mainSystemAlias =
    systemLines[0]?.match(/^System\(([^,]+)/)?.[1]?.trim() || 'system';

  const rewrittenRels = relLines.map((line, index) => {
    const match = line.match(/^Rel(?:_[A-Z][a-zA-Z]*)?\(([^,]+),\s*([^,]+),\s*"([^"]*)"(.*)\)$/);
    if (!match) return line;

    const from = match[1].trim();
    const to = match[2].trim();
    const label = match[3];
    const rest = match[4] || '';

    // If actor/external system points to main system, prefer a downward relation
    if (to === mainSystemAlias) {
      return `Rel_D(${from}, ${to}, "${label}"${rest})`;
    }

    // If main system points out, keep a normal relation
    return `Rel(${from}, ${to}, "${label}"${rest})`;
  });

  const styleLines = [];
  rewrittenRels.forEach((line, index) => {
    const match = line.match(/^Rel(?:_[A-Z][a-zA-Z]*)?\(([^,]+),\s*([^,]+)/);
    if (!match) return;

    const from = match[1].trim();
    const to = match[2].trim();

    // alternate small vertical offsets for labels to reduce collisions
    const offsetY = index % 2 === 0 ? '-18' : '18';
    styleLines.push(
      `UpdateRelStyle(${from}, ${to}, $offsetY="${offsetY}")`
    );
  });

  return [
    ...headerLines,
    'UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")',
    '',
    ...personLines,
    ...externalSystemLines,
    ...systemLines,
    ...otherLines,
    '',
    ...rewrittenRels,
    ...styleLines,
  ].join('\n');
}

function ContextDiagram({ chart, title = 'C4 Context Diagram' }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || !canvasRef.current) return;

      try {
        setError('');
        canvasRef.current.innerHTML = '';

        const improvedChart = enhanceContextLayout(chart);
        const id = `context-${Date.now()}`;
        const { svg } = await mermaid.render(id, improvedChart);
        canvasRef.current.innerHTML = svg;
      } catch (err) {
        console.error('Context render error:', err);
        setError('Failed to render context diagram.');
      }
    };

    renderChart();
  }, [chart]);

  const handleFullscreen = async () => {
    if (!wrapperRef.current) return;
    if (wrapperRef.current.requestFullscreen) {
      await wrapperRef.current.requestFullscreen();
    }
  };

  const handleDownloadSvg = () => {
    const svg = canvasRef.current?.querySelector('svg');
    if (!svg) return;

    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="diagram-shell" ref={wrapperRef}>
      <div className="diagram-toolbar">
        <button className="mini-button" onClick={handleFullscreen}>
          Full Screen
        </button>
        <button className="mini-button" onClick={handleDownloadSvg}>
          Download SVG
        </button>
      </div>

      <div className="diagram-canvas" ref={canvasRef} />

      {error ? (
        <div>
          <p>{error}</p>
          <pre className="raw-output">{chart}</pre>
        </div>
      ) : null}
    </div>
  );
}

export default ContextDiagram;