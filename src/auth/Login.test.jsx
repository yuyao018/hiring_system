import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
jest.mock('./AuthContext', () => ({
 useAuth: () => ({ user: null, loading: false, refresh: jest.fn() }),
 dashboardFor: () => '/applicant/dashboard'
}));
function registration() {
 render(<MemoryRouter><Login /></MemoryRouter>);
 fireEvent.click(screen.getByRole('button', { name: 'New applicant? Create an account' }));
 return screen.getByLabelText('Password');
}
test('shows only missing password rules and clears them when corrected', async () => {
 const password = registration();
 fireEvent.change(password, { target: { value: 'Abcdefghij12' } });
 fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form'));
 const error = await screen.findByRole('alert');
 expect(error).toHaveTextContent('Your password is missing:');
 expect(screen.queryByRole('heading', { name: 'Password requirements' })).not.toBeInTheDocument();
 expect(password).toHaveAttribute('aria-describedby', 'password-error');
 expect(error).toHaveTextContent('A special character');
 expect(error).not.toHaveTextContent('An uppercase letter');
 expect(password).toHaveAttribute('aria-invalid', 'true');
 fireEvent.change(password, { target: { value: 'Abcdefghij12!' } });
 expect(screen.queryByRole('alert')).not.toBeInTheDocument();
 expect(password).not.toHaveAttribute('aria-invalid');
 expect(screen.getByRole('heading', { name: 'Password requirements' })).toBeInTheDocument();
 expect(password).toHaveAttribute('aria-describedby', 'password-requirements');
});
test('native invalid password event displays actionable length feedback', () => {
 const password = registration();
 fireEvent.change(password, { target: { value: 'Ab1!' } });
 fireEvent.invalid(password);
 expect(screen.getByRole('alert')).toHaveTextContent('At least 12 characters');
 expect(screen.getByRole('alert').querySelectorAll('li')).toHaveLength(1);
});

test('registration prompts email confirmation and clears the password', async () => {
 global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ needsConfirmation: true, message: 'Check your inbox and spam folder.' }) });
 const password = registration();
 fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Test applicant' } });
 fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
 fireEvent.change(password, { target: { value: 'StrongPass12!' } });
 fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form'));
 expect(await screen.findByRole('status')).toHaveTextContent('Check your inbox');
 expect(screen.getByLabelText('Password')).toHaveValue('');
 delete global.fetch;
});
