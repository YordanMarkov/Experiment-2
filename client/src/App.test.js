import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./ContextDiagram', () => () => <div>C4 Context Diagram Mock</div>);
jest.mock('./ContainerDiagramMermaid', () => () => <div>C4 Container Diagram Mock</div>);

test('renders app title and run pipeline button', () => {
  render(<App />);

  expect(screen.getByText(/AI-Assisted Requirement Synthesis/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Run Pipeline/i })).toBeInTheDocument();
});