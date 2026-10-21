import { normalizeInput, recommendMeals } from '@/lib/meal-engine';
import { explainRecommendation } from '@/lib/recommendation-explanation';
import { aiStatus, understandRequest } from '@/lib/server/deepseek';
import { HttpError, apiError, json, readJson, requireOwner } from '@/lib/server/http';
import { consumeRate, loadHistory, saveSettings } from '@/lib/server/store';

export async function POST(request: Request) {
  try {
    const owner = await requireOwner(request);
    const body = await readJson(request);
    const raw = body.input && typeof body.input === 'object' && !Array.isArray(body.input)
      ? body.input as Record<string, unknown> : body;
    const source = typeof raw.ingredients === 'string' ? [raw.ingredients]
      : Array.isArray(raw.ingredients) ? raw.ingredients.filter((value): value is string => typeof value === 'string') : [];
    const input = normalizeInput(raw);
    if (!input.ingredients.length) throw new HttpError(400, '请先添加至少一种现有食材。');
    await consumeRate(owner.id, 'recommend-minute', 10, 60);
    await consumeRate(owner.id, 'recommend-hour', 80, 3600);
    const history = await loadHistory(owner.id);
    const candidates = recommendMeals(input, history);
    if (!aiStatus().configured) {
      await saveSettings(owner.id, input);
      return json({ options: candidates, mode: 'template', input, message: [explainRecommendation(source, input, candidates), '当前使用家常菜模板匹配；配置模型服务后，可理解更自由的做饭要求。'].filter(Boolean).join(' ') });
    }
    let finalInput = input;
    let options = candidates;
    let mode: 'template' | 'deepseek' = 'template';
    let message: string | undefined;
    try {
      const understood = await understandRequest(input, candidates);
      const parsed = normalizeInput(understood.input);
      const interpreted = normalizeInput({
        ...parsed,
        ingredients: input.ingredients,
        equipment: input.equipment,
        servings: input.servings,
        minutes: Math.min(input.minutes, parsed.minutes),
        preferences: [...new Set([...input.preferences, ...parsed.preferences])],
        note: input.note,
      });
      // Only the server's recipe catalog supplies ingredients and cooking steps.
      // Reapply all hard constraints after language understanding.
      options = recommendMeals(interpreted, history).map((option) => ({
        ...option,
        reason: typeof understood.reasons[option.id] === 'string'
          ? understood.reasons[option.id].slice(0, 220) : option.reason,
      }));
      finalInput = interpreted;
      mode = 'deepseek';
    } catch {
      message = '模型服务暂时不可用，已用家常菜模板继续匹配。';
    }
    await saveSettings(owner.id, finalInput);
    const explanation = [explainRecommendation(source, finalInput, options), message].filter(Boolean).join(' ');
    return json({ options, mode, input: finalInput, ...(explanation ? { message: explanation } : {}) });
  } catch (error) { return apiError(error); }
}
