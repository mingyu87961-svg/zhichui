import { getChatGPTUser } from '@/app/chatgpt-auth';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function isLocalRequest(request: Request): boolean {
  return process.env.NODE_ENV !== 'production'
    && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
}

export async function requireOwner(request: Request): Promise<{ id: string; name: string }> {
  const user = await getChatGPTUser();
  if (user) return { id: user.userId, name: user.fullName || '开饭朋友' };
  if (isLocalRequest(request)) return { id: 'local-kitchen', name: '开饭朋友' };
  throw new HttpError(401, '请先登录，再保存你的厨房记录。');
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin && isLocalRequest(request)) return;
  if (!origin || origin !== new URL(request.url).origin) {
    throw new HttpError(403, '请求来源不受支持，请刷新页面后重试。');
  }
}

export async function readJson(request: Request, maxBytes = 16_384): Promise<Record<string, unknown>> {
  assertSameOrigin(request);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, '请使用 JSON 格式提交。');
  }
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, '提交内容过大。');
  if (!request.body) throw new HttpError(400, '缺少提交内容。');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let content = '';
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw new HttpError(413, '提交内容过大。'); }
      content += decoder.decode(part.value, { stream: true });
    }
    content += decoder.decode();
  } finally { reader.releaseLock(); }
  let data: unknown;
  try { data = JSON.parse(content); } catch { throw new HttpError(400, '提交内容不是有效的 JSON。'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, '提交内容格式不正确。');
  return data as Record<string, unknown>;
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export function apiError(error: unknown): Response {
  if (error instanceof HttpError) {
    const response = json({ error: error.message }, error.status);
    if (error.status === 429) response.headers.set('Retry-After', '60');
    return response;
  }
  return json({ error: '暂时无法完成操作，请稍后重试。' }, 500);
}
