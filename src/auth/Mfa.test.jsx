import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Mfa from './Mfa';
import { useAuth } from './AuthContext';
jest.mock('./AuthContext', () => ({ useAuth: jest.fn(), dashboardFor: () => '/recruiter/dashboard' }));
const refresh = jest.fn();
const reply = data => Promise.resolve({ ok: true, json: async () => data, headers: { get: () => 'application/json' } });
const renderPage = () => render(<MemoryRouter initialEntries={['/mfa']}><Routes><Route path="/mfa" element={<Mfa />} /><Route path="/recruiter/dashboard" element={<p>Recruiter dashboard</p>} /></Routes></MemoryRouter>);
beforeEach(() => {
 useAuth.mockReturnValue({ user: { role: 'hiring_manager', mfa: { required: true, verified: false } }, loading: false, refresh, logout: jest.fn() });
 global.fetch = jest.fn();
 refresh.mockReset();
});
afterEach(() => { delete global.fetch; });
test('setup requires an explicit click and verifies before opening the dashboard', async () => {
 fetch.mockImplementationOnce(() => reply({ enrolled: false, verified: false, factors: [] }))
  .mockImplementationOnce(() => reply({ factorId: 'factor', qrCode: 'data:image/svg+xml,%3Csvg/%3E', secret: 'PRIVATE-SETUP-KEY' }))
  .mockImplementationOnce(() => reply({ success: true }));
 refresh.mockResolvedValue({ role: 'hiring_manager', mfa: { verified: true } });
 renderPage();
 fireEvent.click(await screen.findByRole('button', { name: 'Set up authenticator app' }));
 expect(await screen.findByAltText('Scan this QR code with your authenticator app')).toHaveAttribute('src', 'data:image/svg+xml,%3Csvg/%3E');
 const code = screen.getByLabelText('Authenticator code');
 expect(screen.getByRole('button', { name: 'Enable authenticator' })).toBeDisabled();
 fireEvent.change(code, { target: { value: '123456' } });
 fireEvent.submit(code.closest('form'));
 expect(await screen.findByText('Recruiter dashboard')).toBeInTheDocument();
 expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ factorId: 'factor', code: '123456' });
});
test('an enrolled user sees a code challenge and stays blocked after an incorrect code', async () => {
 fetch.mockImplementationOnce(() => reply({ enrolled: true, verified: false, factors: [{ id: 'factor', name: 'My app' }] }))
  .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'The code could not be verified.' }), headers: { get: () => 'application/json' } });
 renderPage();
 const code = await screen.findByLabelText('Authenticator code');
 expect(screen.queryByAltText('Scan this QR code with your authenticator app')).not.toBeInTheDocument();
 fireEvent.change(code, { target: { value: '000000' } });
 fireEvent.submit(code.closest('form'));
 expect(await screen.findByRole('alert')).toHaveTextContent('The code could not be verified.');
 expect(refresh).not.toHaveBeenCalled();
 await waitFor(() => expect(code).toHaveValue(''));
});
