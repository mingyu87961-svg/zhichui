import { buildMealOption, getRecipe, normalizeInput } from '@/lib/meal-engine';
import { HttpError, apiError, json, readJson, requireOwner } from '@/lib/server/http';
import { addShopping, consumeRate, loadShopping } from '@/lib/server/store';

export async function GET(request: Request) {
  try {
    const owner = await requireOwner(request);
    return json({ items: await loadShopping(owner.id) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwner(request);
    const body = await readJson(request);
    await consumeRate(owner.id, 'write', 60, 60);
    if (typeof body.recipeId === 'string') {
      const recipe = getRecipe(body.recipeId);
      if (!recipe) throw new HttpError(400, '这道菜不存在。');
      const input = normalizeInput(body.input);
      const option = buildMealOption(recipe, input);
      return json({ items: await addShopping(owner.id, option.missingIngredients) });
    }
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    if (!name || name.length > 60 || /[\u0000-\u001f\u007f]/.test(name)) throw new HttpError(400, '请填写 1 至 60 字的食材名称。');
    return json({ items: await addShopping(owner.id, [{ name, amount: 1, unit: '项' }]) });
  } catch (error) { return apiError(error); }
}
