import { RECIPES } from './recipes.ts';
import { DEFAULT_INPUT } from './types.ts';
import type { KitchenInput, MealOption, MealRecord, Recipe } from './types.ts';
export { RECIPES, getRecipe } from './recipes.ts';

export const EQUIPMENT = ['炒锅', '煮锅', '电饭煲', '微波炉', '空气炸锅'] as const;
const ALIASES: Record<string, string> = {
  西红柿: '番茄', 圣女果: '番茄', 蕃茄: '番茄', 马铃薯: '土豆', 洋芋: '土豆',
  蛋: '鸡蛋', 鸡蛋: '鸡蛋', 鸡胸: '鸡肉', 鸡胸肉: '鸡肉', 鸡腿肉: '鸡肉',
  鸡腿: '鸡肉', 鸡肉: '鸡肉', 香菇: '菌菇', 蘑菇: '菌菇', 口蘑: '菌菇',
  白玉菇: '菌菇', 蟹味菇: '菌菇', 杏鲍菇: '菌菇', 菌菇: '菌菇',
  挂面: '面条', 鲜面条: '面条', 鲜面: '面条', 干面条: '面条', 面: '面条',
  米: '大米', 生米: '大米', 白米: '大米', 大米: '大米', 熟米饭: '米饭', 剩米饭: '米饭', 剩饭: '米饭', 白米饭: '米饭',
  老豆腐: '豆腐', 嫩豆腐: '豆腐', 北豆腐: '豆腐', 南豆腐: '豆腐',
  小白菜: '青菜', 油菜: '青菜', 上海青: '青菜', 小青菜: '青菜',
  大白菜: '白菜', 红萝卜: '胡萝卜', 甜椒: '青椒', 柿子椒: '青椒', 灯笼椒: '青椒',
  油: '食用油', 酱油: '生抽', 醋: '米醋', 食盐: '盐',
};
const EQUIPMENT_ALIASES: Record<string, string> = { 平底锅: '炒锅', 不粘锅: '炒锅', 汤锅: '煮锅', 电饭锅: '电饭煲' };
const UNIT = '(?:千克|公斤|毫升|克|斤|两|个|颗|只|枚|根|棵|条|把|袋|盒|块|片|碗|份|g|kg|ml|l)';
const COUNT = `(?:\\d+(?:\\.\\d+)?\\s*(?:${UNIT})?|[一二两三四五六七八九十半几]+\\s*${UNIT})`;
const leadingAmount = new RegExp(`^${COUNT}\\s*`, 'i');
const trailingAmount = new RegExp(`\\s*${COUNT}$`, 'i');

function normalizeIngredient(value: string): string {
  let text = value.normalize('NFKC').trim().replace(/\s+/g, '');
  text = text.replace(/[（(](?:约|大约)?[\d一二两三四五六七八九十半几.]+(?:千克|公斤|毫升|克|斤|两|个|颗|只|枚|根|棵|条|把|袋|盒|块|片|碗|份|g|kg|ml|l)?[）)]/gi, '');
  text = text.replace(/^(?:约|大约)/, '').replace(leadingAmount, '').replace(trailingAmount, '');
  text = text.replace(/^(?:一些|少许|适量|一点)/, '').replace(/(?:适量|少许|一些)$/, '');
  return ALIASES[text] ?? text;
}

export type IngredientParseResult = { ingredients: string[]; recognized: string[]; unrecognized: string[] };

// Parse explicit ingredient lists and lightweight inventory sentences. A token must
// match a complete known ingredient, so 番茄酱 never becomes 番茄 by substring search.
export function parseIngredients(input: string[] | string): IngredientParseResult {
  const parts = typeof input === 'string' ? [input] : Array.isArray(input) ? input : [];
  const known = new Set([...RECIPES.flatMap((recipe) => recipe.ingredients.map((item) => item.name)),
    ...Object.keys(ALIASES), '面粉', '辣椒']);
  const ingredients: string[] = [];
  const recognized: string[] = [];
  const unrecognized: string[] = [];
  const inventoryPrefix = /^(?:(?:我家|家里|冰箱里|厨房里|家中|手头|现有|现在|目前|今天)(?:的)?|只剩下|只剩|剩下|还剩下|还剩|只有|还有|我有|我只有|我还剩|食材(?:是|有|:)?|有(?!机)|只|就|仅)+/;
  const negativeInventory = /没有|没了|没剩|用完|吃完|耗尽|不剩|不吃|不能吃|不含|不放|不要/;
  const cleanName = (part: string) => negativeInventory.test(part) ? part.trim()
    : normalizeIngredient(part.trim().replace(inventoryPrefix, '').replace(/(?:了|而已|左右|上下|吧|呢)+$/, ''));
  const splitConnections = (part: string): string[] => {
    if (negativeInventory.test(part)) return [part];
    if (known.has(cleanName(part))) return [part];
    for (const match of part.matchAll(/[和跟与及]/g)) {
      const index = match.index!;
      if (index === 0 || index === part.length - 1) continue;
      const left = part.slice(0, index);
      const right = part.slice(index + 1);
      if (known.has(cleanName(left)) || known.has(cleanName(right))) return [...splitConnections(left), ...splitConnections(right)];
    }
    return [part];
  };
  const amountSpaces = new RegExp(`(\\d+(?:\\.\\d+)?|[一二两三四五六七八九十半几]+)\\s+(${UNIT})`, 'gi');
  const chunks = parts.filter((part): part is string => typeof part === 'string').slice(0, 60)
    .flatMap((part) => part.slice(0, 500).normalize('NFKC').replace(amountSpaces, '$1$2')
      .split(/(?:还有|以及|加上)|[，,、；;。！!？?：:\n\r|/+\s]+/))
    .flatMap(splitConnections);
  for (const chunk of chunks) {
    const name = cleanName(chunk);
    if (!name || name.length > 120) continue;
    if (!ingredients.includes(name)) ingredients.push(name);
    const target = known.has(name) ? recognized : unrecognized;
    if (!target.includes(name)) target.push(name);
    if (ingredients.length >= 30) break;
  }
  return { ingredients, recognized, unrecognized };
}

export function normalizeIngredients(input: string[] | string): string[] {
  return parseIngredients(input).ingredients;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}

export function normalizeInput(value: unknown): KitchenInput {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const equipment = Array.isArray(raw.equipment)
    ? raw.equipment.filter((item): item is string => typeof item === 'string').map((item) => EQUIPMENT_ALIASES[item] ?? item)
      .filter((item) => (EQUIPMENT as readonly string[]).includes(item))
    : DEFAULT_INPUT.equipment;
  return {
    ingredients: normalizeIngredients(typeof raw.ingredients === 'string' || Array.isArray(raw.ingredients) ? raw.ingredients as string[] | string : []),
    servings: boundedNumber(raw.servings, 1, 1, 6),
    minutes: boundedNumber(raw.minutes, 30, 10, 90),
    equipment: [...new Set(equipment)],
    preferences: Array.isArray(raw.preferences) ? [...new Set(raw.preferences.filter((item): item is string => typeof item === 'string')
      .map((item) => item.slice(0, 80).trim()).filter(Boolean))].slice(0, 12) : [...DEFAULT_INPUT.preferences],
    note: typeof raw.note === 'string' ? raw.note.slice(0, 500).trim() : '',
  };
}

type Restrictions = { excluded: Set<string>; avoidRecent: Set<string>; vegetarian: boolean; noSpicy: boolean };
function restrictions(input: KitchenInput): Restrictions {
  const text = [...input.preferences, input.note].join('，').normalize('NFKC');
  const excluded = new Set<string>();
  const avoidRecent = new Set<string>();
  // A plain string can select known constraints; it cannot replace recipes or execution rules.
  const known = new Set(RECIPES.flatMap((recipe) => recipe.ingredients.map((item) => item.name)));
  const groups: Record<string, string[]> = {
    蛋类: ['鸡蛋'], 鸡蛋制品: ['鸡蛋'], 肉: ['鸡肉'], 肉类: ['鸡肉'], 荤菜: ['鸡肉'],
    豆制品: ['豆腐', '生抽'], 大豆: ['豆腐', '生抽'], 黄豆: ['豆腐', '生抽'],
    菌类: ['菌菇'], 蘑菇类: ['菌菇'], 辣: ['辣椒'], 辣椒: ['辣椒'],
  };
  const collect = (target: Set<string>, phrase: string) => {
    phrase.split(/(?:但是|不过|可是|但|因为|所以)/)[0]
      .split(/[、/和及与，,。；;\n]/).forEach((part) => {
      const normalized = normalizeIngredient(part.replace(/(?:过敏|了|都|也|的菜|的|吧)$/g, '').trim());
      if (known.has(normalized)) target.add(normalized);
      groups[normalized]?.forEach((name) => target.add(name));
    });
  };
  for (const match of text.matchAll(/(?:最近|这几天|今天)不想吃\s*([^，,。；;！!\n]+)/g)) collect(avoidRecent, match[1]);
  const hardText = text.replace(/(?:最近|这几天|今天)不想吃\s*[^，,。；;！!\n]+/g, '');
  for (const match of hardText.matchAll(/(?:不吃|不要(?:吃|放|加)?|不能吃|忌口[:：]?|避免吃|不想吃|不放|不加|不含|别(?:放|加|吃))\s*([^，,。；;！!\n]+)/g)) collect(excluded, match[1]);
  for (const match of hardText.matchAll(/([^，,。；;！!\n]{1,20}?)(?:有点|会|也)?过敏/g)) collect(excluded, match[1].replace(/^(?:对|我对)/, ''));
  return { excluded, avoidRecent, vegetarian: /素食|纯素|不吃肉/.test(text), noSpicy: /不(?:要|吃|能吃)(?:太|很)?辣|不辣|清淡/.test(text) };
}

function isAllowed(recipe: Recipe, input: KitchenInput, rules: Restrictions): boolean {
  if (recipe.minutes > input.minutes || !recipe.equipment.every((item) => input.equipment.includes(item))) return false;
  if (recipe.ingredients.some((item) => rules.excluded.has(item.name))) return false;
  if (rules.vegetarian && recipe.ingredients.some((item) => ['鸡肉', '鸡蛋'].includes(item.name))) return false;
  if (rules.noSpicy && (recipe.tags.includes('辣') || recipe.ingredients.some((item) => item.name === '辣椒'))) return false;
  return true;
}

export function isRecipeAllowed(recipe: Recipe, rawInput: KitchenInput): boolean {
  const input = normalizeInput(rawInput);
  return isAllowed(recipe, input, restrictions(input));
}

export function buildMealOption(recipe: Recipe, rawInput: KitchenInput, history: MealRecord[] = []): MealOption {
  const input = normalizeInput(rawInput);
  const available = new Set(input.ingredients);
  const factor = input.servings / recipe.baseServings;
  const countableUnits = new Set(['个', '根', '瓣', '片', '枚', '只', '颗']);
  const scaledIngredients = recipe.ingredients.map((item) => ({ ...item,
    amount: countableUnits.has(item.unit) ? Math.max(1, Math.round(item.amount * factor)) : Math.round(item.amount * factor * 100) / 100,
  }));
  const main = scaledIngredients.filter((item) => !item.pantry);
  const matchedIngredients = main.filter((item) => available.has(item.name)).map((item) => item.name);
  const missingIngredients = main.filter((item) => !available.has(item.name));
  const rules = restrictions(input);
  const recentHistory = [...history].filter((item) => item && typeof item.recipeId === 'string')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 8);
  const related = recentHistory.filter((item) => item.recipeId === recipe.id);
  const wantsOnePot = input.preferences.some((item) => /少洗锅|一口锅|一锅/.test(item)) || /少洗锅|一口锅/.test(input.note);
  const wantsLessOil = input.preferences.some((item) => /少油/.test(item)) || /少油/.test(input.note);
  const wantsLessStaple = /少碳水|低碳水|低碳|少吃主食|少主食/.test([...input.preferences, input.note].join('，'));
  const hasStarchyMain = main.some((item) => ['大米', '米饭', '面条', '面粉', '土豆'].includes(item.name));
  let matchScore = matchedIngredients.length / Math.max(main.length, 1) * 100 + matchedIngredients.length * 2 - missingIngredients.length * 14;
  if (matchedIngredients.length === 0) matchScore -= 30;
  if (wantsOnePot) matchScore += recipe.equipment.length === 1 ? 12 : -12;
  if (wantsLessOil && recipe.tags.includes('少油')) matchScore += 10;
  if (wantsLessStaple) matchScore += hasStarchyMain ? -35 : 10;
  matchScore += Math.max(0, input.minutes - recipe.minutes) / 10;
  if (recipe.ingredients.some((item) => rules.avoidRecent.has(item.name))) matchScore -= 80;
  if (related.some((item) => item.feedback === 'liked')) matchScore += 15;
  if (related.some((item) => item.feedback === 'too-hard')) matchScore -= 35;
  if (related.some((item) => item.feedback === 'skip')) matchScore -= 100;
  if (related.some((item) => item.status === 'completed')) matchScore -= 12;
  const reasons = [missingIngredients.length === 0 ? '现有主料就能做' : `用上 ${matchedIngredients.length} 样现有主料，还缺 ${missingIngredients.length} 样`];
  if (wantsOnePot && recipe.equipment.length === 1) reasons.push('只用一件烹饪厨具');
  if (wantsLessStaple && !hasStarchyMain) reasons.push('按你的少主食偏好优先排序');
  if (related.some((item) => item.feedback === 'liked')) reasons.push('你之前喜欢这道菜');
  if (related.some((item) => item.feedback === 'too-hard')) reasons.push('你曾觉得这道菜较费事');
  if (related.some((item) => item.feedback === 'skip')) reasons.push('已按你的暂不推荐反馈降低排序');
  return { ...recipe, matchedIngredients, missingIngredients, scaledIngredients, matchScore: Math.round(matchScore * 10) / 10, reason: reasons.join(' · ') };
}

export function recommendMeals(rawInput: KitchenInput, history: MealRecord[] = []): MealOption[] {
  const input = normalizeInput(rawInput);
  if (input.ingredients.length === 0) return [];
  const rules = restrictions(input);
  return RECIPES.filter((recipe) => isAllowed(recipe, input, rules))
    .map((recipe) => buildMealOption(recipe, input, history))
    // A recipe must use at least one supplied main ingredient; pantry seasonings alone are not a meal match.
    .filter((option) => option.matchedIngredients.length > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.minutes - b.minutes || a.id.localeCompare(b.id))
    .slice(0, 3);
}
