import { recognizeIngredients, AIServiceError, aiStatus } from '@/lib/server/deepseek';
import { apiError, assertSameOrigin, HttpError, json, requireOwner } from '@/lib/server/http';
import { consumeRate } from '@/lib/server/store';

export async function POST(request: Request) {
  try {
    const owner = await requireOwner(request);
    assertSameOrigin(request);
    if (!aiStatus().vision) throw new HttpError(503, '尚未启用图片识别，请先用文字添加食材。');
    await consumeRate(owner.id, 'recognize-minute', 4, 60);
    await consumeRate(owner.id, 'recognize-hour', 25, 3600);
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) throw new HttpError(415, '请选择 PNG、JPG 或 WebP 图片。');
    const max = 5 * 1024 * 1024;
    if (Number(request.headers.get('content-length')) > max + 16384) throw new HttpError(413, '图片请控制在 5 MB 以内。');
    // Count actual streamed bytes instead of trusting Content-Length.
    if (!request.body) throw new HttpError(400, '缺少图片内容。');
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > max + 16384) { await reader.cancel(); throw new HttpError(413, '图片请控制在 5 MB 以内。'); }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
    const all = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
    let form: FormData;
    try { form = await new Response(all, { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData(); }
    catch { throw new HttpError(400, '无法读取这张图片，请重新选择。'); }
    const image = form.get('image');
    if (!(image instanceof File) || !image.size) throw new HttpError(400, '请先选择一张图片。');
    if (image.size > max) throw new HttpError(413, '图片请控制在 5 MB 以内。');
    const bytes = new Uint8Array(await image.arrayBuffer());
    let mime: string;
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) mime = 'image/png';
    else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = 'image/jpeg';
    else if (String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') mime = 'image/webp';
    else throw new HttpError(415, '图片格式不受支持，请使用 PNG、JPG 或 WebP。');
    try {
      const ingredients = await recognizeIngredients(bytes, mime);
      return json({ ingredients, message: ingredients.length ? '这些是照片中识别出的食材，请逐项核对后添加。' : '没有识别到清楚的食材，可以换张照片或手动添加。' });
    } catch (error) {
      if (error instanceof AIServiceError) throw new HttpError(503, error.message);
      throw error;
    }
  } catch (error) { return apiError(error); }
}
