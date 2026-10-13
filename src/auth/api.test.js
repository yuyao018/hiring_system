import { readJson } from './api';
test('reads valid API responses', async () => {
 const response = { headers: { get: () => 'application/json; charset=utf-8' }, json: async () => ({ user: null }) };
 await expect(readJson(response)).resolves.toEqual({ user: null });
});
test('turns plain-text proxy errors into actionable messages', async () => {
 const response = { headers: { get: () => 'text/plain' }, json: jest.fn() };
 await expect(readJson(response)).rejects.toThrow('API server is unavailable');
 expect(response.json).not.toHaveBeenCalled();
});
test('handles malformed JSON without exposing a parsing exception', async () => {
 const response = { headers: { get: () => 'application/json' }, json: async () => { throw new SyntaxError('Unexpected token'); } };
 await expect(readJson(response)).rejects.toThrow('server returned an invalid response');
});
