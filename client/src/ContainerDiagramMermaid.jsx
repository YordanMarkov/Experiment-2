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

function ContainerDiagramMermaid({ chart, title = 'C4 Container Diagram' }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || !canvasRef.current) return;

      try {
        setError('');
        canvasRef.current.innerHTML = '';

        const cleanedChart = cleanChart(chart);
        const id = `container-${Date.now()}`;
        const { svg } = await mermaid.render(id, cleanedChart);
        canvasRef.current.innerHTML = svg;
      } catch (err) {
        console.error('Container render error:', err);
        setError('Failed to render container diagram.');
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

export default ContainerDiagramMermaid;