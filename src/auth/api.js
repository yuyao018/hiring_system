export async function readJson(response) {
 if (!response.headers.get('content-type')?.includes('application/json')) {
  throw new Error('The API server is unavailable. Start it with npm run server, then try again.');
 }
 try { return await response.json(); }
 catch { throw new Error('The server returned an invalid response. Please try again.'); }
}
