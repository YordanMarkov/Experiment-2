import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

function MermaidDiagram({ chart }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || !containerRef.current) return;

      try {
        setError('');
        containerRef.current.innerHTML = '';

        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, chart);
        containerRef.current.innerHTML = svg;
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Failed to render diagram.');
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return <pre>{error}</pre>;
  }

  return <div ref={containerRef} />;
}

export default MermaidDiagram;