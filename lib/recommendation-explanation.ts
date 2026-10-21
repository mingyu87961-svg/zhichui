import { EQUIPMENT, RECIPES, isRecipeAllowed, parseIngredients } from './meal-engine.ts';
import type { KitchenInput, MealOption } from './types.ts';

export function explainRecommendation(source: string[], input: KitchenInput, options: MealOption[]): string {
  const messages: string[] = [];
  const raw = source.map(value => value.trim()).filter(Boolean);
  const parsed = parseIngredients(source);
  if (JSON.stringify(raw) !== JSON.stringify(input.ingredients)) {
    messages.push(`已把描述整理为：${input.ingredients.join('、')}。请核对食材名称。`);
  }
  if (parsed.unrecognized.length) {
    messages.push(`还有这些内容暂未匹配上食材名称：${parsed.unrecognized.join('、')}，可以改成单独的食材名后再试。`);
  }
  if (options.length) return messages.join(' ');

  if (!input.equipment.length) {
    messages.push('还没有选择厨具，请勾选手边可以使用的厨具。');
    return messages.join(' ');
  }
  const available = new Set(input.ingredients);
  const matching = RECIPES.filter(recipe => recipe.ingredients.some(item => !item.pantry && available.has(item.name)));
  if (!matching.length) {
    messages.push('当前菜谱库暂未收录使用这些食材的搭配；这不代表它们不能做菜。可以补充其他食材，或稍后再试。');
    return messages.join(' ');
  }
  const compatible = matching.filter(recipe => isRecipeAllowed(recipe, { ...input, minutes: 90, equipment: [...EQUIPMENT] }));
  if (!compatible.length) {
    messages.push('已收录的相关菜谱与当前忌口要求不符，已保留你的忌口，请补充其他食材。');
    return messages.join(' ');
  }
  const withinTime = compatible.filter(recipe => recipe.minutes <= input.minutes);
  if (!withinTime.length) {
    messages.push(`当前相关菜谱至少需要约 ${Math.min(...compatible.map(recipe => recipe.minutes))} 分钟，超过你设置的 ${input.minutes} 分钟。可以增加时间或换些食材。`);
    return messages.join(' ');
  }
  const closest = [...withinTime].sort((a, b) =>
    a.equipment.filter(tool => !input.equipment.includes(tool)).length - b.equipment.filter(tool => !input.equipment.includes(tool)).length
    || a.minutes - b.minutes)[0];
  messages.push(`当前相关菜谱需要${closest.equipment.join('、')}，所选厨具还不满足。请按实际情况补选厨具，或换些食材。`);
  return messages.join(' ');
}
