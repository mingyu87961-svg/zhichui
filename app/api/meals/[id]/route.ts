import { apiError, json, readJson, requireOwner } from '@/lib/server/http';
import { consumeRate, updateMeal } from '@/lib/server/store';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireOwner(request);
    const changes = await readJson(request);
    await consumeRate(owner.id, 'write', 60, 60);
    const { id } = await context.params;
    return json({ meal: await updateMeal(owner.id, id, changes) });
  } catch (error) { return apiError(error); }
}
