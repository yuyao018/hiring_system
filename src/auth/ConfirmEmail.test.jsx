import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import ConfirmEmail from './ConfirmEmail';
const hash = 'a'.repeat(64);
const renderPage = entry => render(<MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ConfirmEmail /></MemoryRouter>);
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { delete global.fetch; });
test('opens the email link without consuming it until the user confirms', async () => {
 fetch.mockResolvedValue({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ success: true }) });
 renderPage('/verify-email#token_hash=' + hash);
 expect(fetch).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button', { name: 'Confirm email address' }));
 expect(await screen.findByRole('heading', { name: 'Email verified' })).toBeInTheDocument();
 expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ tokenHash: hash });
 expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
 expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
test('expired link explains how to recover instead of logging in', async () => {
 fetch.mockResolvedValue({ ok: false, headers: { get: () => 'application/json' }, json: async () => ({ message: 'This link has expired. Contact the administrator.' }) });
 renderPage('/verify-email#token_hash=' + hash);
 fireEvent.click(screen.getByRole('button', { name: 'Confirm email address' }));
 expect(await screen.findByRole('alert')).toHaveTextContent('expired');
 expect(screen.queryByRole('heading', { name: 'Email verified' })).not.toBeInTheDocument();
});
test('missing confirmation link provides administrator guidance', () => {
 renderPage('/verify-email');
 expect(screen.getByRole('alert')).toHaveTextContent('Open the link in your confirmation email');
 expect(screen.queryByRole('button')).not.toBeInTheDocument();
 expect(fetch).not.toHaveBeenCalled();
});
