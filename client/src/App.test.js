import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title and run pipeline button', () => {
  render(<App />);

  expect(screen.getByText(/AI-Assisted Requirement Synthesis/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Run Pipeline/i })).toBeInTheDocument();
});