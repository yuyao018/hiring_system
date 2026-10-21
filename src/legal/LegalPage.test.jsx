import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import LegalPage from './LegalPage';
test('privacy notice explains external AI processing and actual deletion limits', () => {
 render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><LegalPage type="privacy" /></MemoryRouter>);
 expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy Notice');
 expect(screen.getByText(/first 1,000 characters/)).toHaveTextContent('Hugging Face');
 expect(screen.getByText(/No automatic permanent-deletion/)).toHaveTextContent('deactivates');
});
test('terms explain content ownership and do not promise hiring outcomes', () => {
 render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><LegalPage type="terms" /></MemoryRouter>);
 expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Terms & Conditions');
 expect(screen.getByText(/retain ownership/)).toBeInTheDocument();
 expect(screen.getByText(/do not guarantee/)).toBeInTheDocument();
});
