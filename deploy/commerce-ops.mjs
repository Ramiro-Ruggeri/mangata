// Invoked inside the web container via stdin. Never prints environment values.
const action = process.argv[2];
if (!['seed', 'status', 'reconcile'].includes(action)) throw new Error('Unknown action');
const response = await fetch(`http://127.0.0.1:3000/api/internal/commerce?action=${action}`, {
  method: 'POST', headers: { Authorization: `Bearer ${process.env.COMMERCE_OPS_TOKEN}` }, signal: AbortSignal.timeout(180000),
});
const result = await response.json();
console.log(JSON.stringify({ action, status: response.status, result }));
if (!response.ok || (action === 'reconcile' && (result.overdue > 0 || result.reviews > 0))) process.exitCode = 1;
