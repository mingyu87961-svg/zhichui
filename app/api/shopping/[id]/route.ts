import { HttpError, apiError, assertSameOrigin, json, readJson, requireOwner } from '@/lib/server/http';
import { checkShopping, consumeRate, deleteShopping } from '@/lib/server/store';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireOwner(request);
    const body = await readJson(request);
    if (typeof body.checked !== 'boolean') throw new HttpError(400, '请选择是否已买齐。');
    await consumeRate(owner.id, 'write', 60, 60);
    const { id } = await context.params;
    return json({ item: await checkShopping(owner.id, id, body.checked) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireOwner(request);
    assertSameOrigin(request);
    await consumeRate(owner.id, 'write', 60, 60);
    const { id } = await context.params;
    await deleteShopping(owner.id, id);
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
