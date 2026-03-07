import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  suppressErrorRendering: true,
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

function ContextDiagram({ chart }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || !containerRef.current) return;

      try {
        setError('');
        containerRef.current.innerHTML = '';

        const cleanedChart = cleanChart(chart);
        console.log('CONTEXT MERMAID:', cleanedChart);

        const id = `context-${Date.now()}`;
        const { svg } = await mermaid.render(id, cleanedChart);
        containerRef.current.innerHTML = svg;
      } catch (err) {
        console.error('Context render error:', err);
        setError('Failed to render context diagram.');
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div>
        <p>{error}</p>
        <pre>{chart}</pre>
      </div>
    );
  }

  return <div ref={containerRef} />;
}

export default ContextDiagram;