import { buildMealOption, getRecipe, isRecipeAllowed, normalizeInput } from '@/lib/meal-engine';
import { HttpError, apiError, json, readJson, requireOwner } from '@/lib/server/http';
import { consumeRate, createMeal, loadHistory } from '@/lib/server/store';

export async function POST(request: Request) {
  try {
    const owner = await requireOwner(request);
    const body = await readJson(request);
    await consumeRate(owner.id, 'write', 60, 60);
    const recipe = typeof body.recipeId === 'string' ? getRecipe(body.recipeId) : undefined;
    if (!recipe) throw new HttpError(400, '请选择已有的家常菜方案。');
    const input = normalizeInput(body.input);
    const history = await loadHistory(owner.id);
    const option = buildMealOption(recipe, input, history);
    if (!isRecipeAllowed(recipe, input) || !option.matchedIngredients.length) {
      throw new HttpError(400, '这道菜不符合当前做饭条件，请重新选择方案。');
    }
    const meal = await createMeal(owner.id, option, input);
    return json({ meal }, 201);
  } catch (error) { return apiError(error); }
}
