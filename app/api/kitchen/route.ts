import { normalizeInput } from '@/lib/meal-engine';
import { aiStatus } from '@/lib/server/deepseek';
import { apiError, json, requireOwner } from '@/lib/server/http';
import { loadHistory, loadSettings, loadShopping } from '@/lib/server/store';

export async function GET(request: Request) {
  try {
    const owner = await requireOwner(request);
    const [settings, history, shopping] = await Promise.all([
      loadSettings(owner.id), loadHistory(owner.id), loadShopping(owner.id),
    ]);
    return json({ user: { name: owner.name }, settings: normalizeInput(settings), history, shopping, ai: aiStatus() });
  } catch (error) { return apiError(error); }
}
