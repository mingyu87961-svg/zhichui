import { normalizeInput } from '@/lib/meal-engine';
import { apiError, json, readJson, requireOwner } from '@/lib/server/http';
import { consumeRate, saveSettings } from '@/lib/server/store';

export async function PATCH(request: Request) {
  try {
    const owner = await requireOwner(request);
    const body = await readJson(request);
    await consumeRate(owner.id, 'write', 60, 60);
    const settings = normalizeInput(body.settings ?? body);
    await saveSettings(owner.id, settings);
    return json({ settings });
  } catch (error) { return apiError(error); }
}
