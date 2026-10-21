import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const vars = parseEnv(readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8'));
try {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vars.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: vars.DEEPSEEK_MODEL || 'deepseek-flash',
      messages: [{ role: 'system', content: '只输出json对象。' }, { role: 'user', content: '返回一个json对象，字段ok的值为布尔true，例如 {"ok":true}。不要其他字段。' }],
      thinking: { type: 'disabled' }, response_format: { type: 'json_object' }, max_tokens: 256 }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json();
  let valid = false;
  try { valid = JSON.parse(data.choices?.[0]?.message?.content || '{}').ok === true; } catch {}
  console.log(JSON.stringify({ httpStatus: response.status, structuredResponse: valid, model: data.model || null,
    finishReason: data.choices?.[0]?.finish_reason,
    ...(valid ? {} : { diagnostic: String(data.choices?.[0]?.message?.content ?? '').slice(0, 150) }) }));
  if (!response.ok || !valid) process.exitCode = 1;
} catch {
  console.log('Provider connectivity test failed without exposing credentials.');
  process.exitCode = 1;
}
