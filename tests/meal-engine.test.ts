import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, getRecipe, normalizeIngredients, normalizeInput, parseIngredients, buildMealOption, recommendMeals, isRecipeAllowed } from '../lib/meal-engine.ts';
import type { KitchenInput, MealRecord } from '../lib/types.ts';

function input(overrides: Partial<KitchenInput> = {}): KitchenInput {
  return normalizeInput({ ingredients: ['番茄', '鸡蛋', '米饭'], servings: 2, minutes: 30,
    equipment: ['炒锅', '煮锅'], preferences: ['少洗锅'], note: '', ...overrides });
}
function record(recipeId: string, feedback: MealRecord['feedback']): MealRecord {
  const recipe = getRecipe(recipeId)!;
  return { id: `record-${recipeId}`, recipeId, recipe: buildMealOption(recipe, input()), input: input(),
    status: 'completed', stepIndex: 0, feedback, createdAt: new Date().toISOString(), completedAt: new Date().toISOString() };
}

test('normalizes quantities, punctuation and ingredient aliases without duplicate tokens', () => {
  assert.deepEqual(normalizeIngredients('２个西红柿，鸡蛋3枚；土豆（两个）\n香菇 200g、熟米饭／鸡胸肉'),
    ['番茄', '鸡蛋', '土豆', '菌菇', '米饭', '鸡肉']);
  assert.deepEqual(normalizeIngredients(['西红柿', '番茄', '两把香菇', '约200克豆腐']), ['番茄', '菌菇', '豆腐']);
});

test('does not mistake substrings or a food name beginning with a numeral for an ingredient', () => {
  assert.deepEqual(normalizeIngredients(['番茄酱', '三文鱼', '一品豆腐', '鸡蛋面', '土豆粉']),
    ['番茄酱', '三文鱼', '一品豆腐', '鸡蛋面', '土豆粉']);
  assert.deepEqual(recommendMeals(input({ ingredients: ['番茄酱'] })), []);
});

test('parses whitespace, conjunctions and explicit inventory sentences without inventing ingredients', () => {
  assert.deepEqual(normalizeIngredients('鸡蛋   番茄 米饭'), ['鸡蛋', '番茄', '米饭']);
  assert.deepEqual(normalizeIngredients('西红柿2个 鸡蛋 3 枚'), ['番茄', '鸡蛋']);
  assert.deepEqual(normalizeIngredients('鸡蛋和番茄以及两棵青菜。'), ['鸡蛋', '番茄', '青菜']);
  assert.deepEqual(normalizeIngredients(['家里只剩下面粉和鸡蛋了还有几棵青菜', '还有辣椒']), ['面粉', '鸡蛋', '青菜', '辣椒']);
  assert.deepEqual(normalizeIngredients('青椒、辣椒'), ['青椒', '辣椒']);
});

test('retains unsupported foods and unknown noun fragments so callers can display a reminder', () => {
  const parsed = parseIngredients('有鸡蛋和火腿肠，还有番茄酱');
  assert.deepEqual(parsed.ingredients, ['鸡蛋', '火腿肠', '番茄酱']);
  assert.deepEqual(parsed.recognized, ['鸡蛋']);
  assert.deepEqual(parsed.unrecognized, ['火腿肠', '番茄酱']);
  assert.deepEqual(parseIngredients('鸡蛋和和牛').unrecognized, ['和牛']);
  assert.deepEqual(parseIngredients('和田红枣').ingredients, ['和田红枣']);
  assert.deepEqual(parseIngredients('有机西兰花').ingredients, ['有机西兰花']);
  assert.deepEqual(parseIngredients('面粉、辣椒').ingredients, ['面粉', '辣椒']);
});

test('negative inventory statements are not turned into available ingredients', () => {
  const before = parseIngredients('没有鸡蛋，只有青菜');
  assert.deepEqual(before.recognized, ['青菜']);
  assert.deepEqual(before.unrecognized, ['没有鸡蛋']);
  const after = parseIngredients('鸡蛋没有了，只有青菜');
  assert.deepEqual(after.recognized, ['青菜']);
  assert.deepEqual(after.unrecognized, ['鸡蛋没有了']);
  assert.deepEqual(parseIngredients('没有鸡蛋和番茄，只有青菜').recognized, ['青菜']);
  assert.ok(recommendMeals(input({ ingredients: ['鸡蛋没有了，只有青菜'] })).every((option) => !option.matchedIngredients.includes('鸡蛋')));
});

test('the reported two-person inventory produces practical options within the original hard limits', () => {
  const value = input({ ingredients: ['家里只剩下面粉和鸡蛋了还有几棵青菜', '还有辣椒'],
    servings: 2, minutes: 20, note: '我想吃少碳水的一餐' });
  const options = recommendMeals(value);
  assert.equal(options[0].id, 'greens-egg-stir-fry');
  assert.ok(options.some((option) => option.id === 'simple-greens'));
  assert.deepEqual(options[0].missingIngredients, []);
  assert.deepEqual(options[0].matchedIngredients, ['青菜', '鸡蛋']);
  assert.ok(options.every((option) => option.minutes <= 20 && option.equipment.every((tool) => value.equipment.includes(tool))));
  assert.ok(options.every((option) => option.ingredients.every((item) => item.name !== '青椒')));
});

test('a low-carb request only changes ranking and does not claim a nutrition guarantee or remove all staple dishes', () => {
  const recipe = getRecipe('tomato-egg-rice')!;
  const base = buildMealOption(recipe, input());
  const preferred = buildMealOption(recipe, input({ note: '少碳水' }));
  assert.ok(preferred.matchScore < base.matchScore);
  assert.equal(isRecipeAllowed(recipe, input({ note: '少碳水' })), true);
  assert.doesNotMatch(preferred.reason, /保证|低碳水餐|健康|热量/);
  assert.deepEqual(normalizeIngredients('辣椒'), ['辣椒']);
  assert.equal(isRecipeAllowed(getRecipe('pepper-potato-stir-fry')!, input({ note: '不吃辣椒' })), true);
});

test('validates untrusted kitchen inputs and clamps integer limits', () => {
  const normalized = normalizeInput({ ingredients: ['鸡蛋', null, 2], servings: 500, minutes: -20,
    equipment: ['平底锅', '炒锅', '电饭锅', '<script>'], preferences: ['少洗锅', null], note: 'a'.repeat(900) });
  assert.deepEqual(normalized.ingredients, ['鸡蛋']);
  assert.equal(normalized.servings, 6);
  assert.equal(normalized.minutes, 10);
  assert.deepEqual(normalized.equipment, ['炒锅', '电饭煲']);
  assert.deepEqual(normalized.preferences, ['少洗锅']);
  assert.equal(normalized.note.length, 500);
  assert.equal(normalizeInput({ servings: NaN, minutes: Infinity }).minutes, 30);
  assert.equal(normalizeInput({ servings: NaN }).servings, 1);
  assert.deepEqual(normalizeInput(null).ingredients, []);
});

test('provides at least sixteen complete two-serving templates with valid appliances and steps', () => {
  assert.ok(RECIPES.length >= 16);
  assert.equal(new Set(RECIPES.map((recipe) => recipe.id)).size, RECIPES.length);
  for (const recipe of RECIPES) {
    assert.equal(recipe.baseServings, 2);
    assert.ok(recipe.ingredients.some((item) => !item.pantry));
    assert.ok(recipe.steps.length >= 3);
    assert.equal(recipe.steps.reduce((total, step) => total + step.minutes, 0), recipe.minutes);
    assert.match(recipe.image, /^\/food\/(rice|noodle|vegetable|egg|tofu|chicken)\.svg$/);
    assert.ok(recipe.ingredients.every((item) => item.amount > 0 && item.unit && item.name));
    assert.ok(recipe.equipment.length > 0);
  }
});

test('recommends at most three meals using actual main ingredients and respects time and all appliances', () => {
  const options = recommendMeals(input({ minutes: 18, equipment: ['炒锅'] }));
  assert.ok(options.length > 0 && options.length <= 3);
  assert.ok(options.every((recipe) => recipe.minutes <= 18 && recipe.equipment.every((tool) => tool === '炒锅')));
  assert.ok(options.every((recipe) => recipe.matchedIngredients.length > 0));
  assert.ok(options.some((recipe) => recipe.id === 'tomato-egg-rice'));
  assert.deepEqual(recommendMeals(input({ equipment: [] })), []);
  assert.deepEqual(recommendMeals(input({ ingredients: ['盐', '食用油'] })), []);
  assert.deepEqual(recommendMeals(input({ ingredients: [] })), []);
});

test('scales the whole ingredient list while keeping pantry ingredients out of shopping gaps', () => {
  const option = buildMealOption(getRecipe('tomato-egg-rice')!, input({ servings: 1, ingredients: ['鸡蛋'] }));
  assert.equal(option.scaledIngredients.find((item) => item.name === '米饭')?.amount, 200);
  assert.equal(option.scaledIngredients.find((item) => item.name === '鸡蛋')?.amount, 2);
  assert.deepEqual(option.matchedIngredients, ['鸡蛋']);
  assert.deepEqual(option.missingIngredients.map((item) => item.name), ['番茄', '米饭']);
  assert.ok(option.scaledIngredients.some((item) => item.name === '盐'));
  assert.ok(option.missingIngredients.every((item) => !item.pantry));
  const six = buildMealOption(getRecipe('tomato-egg-rice')!, input({ servings: 6 }));
  assert.equal(six.scaledIngredients.find((item) => item.name === '米饭')?.amount, 1200);
});

test('rice cooker recipes require uncooked rice and never treat cooked rice as the same ingredient', () => {
  assert.deepEqual(recommendMeals(input({ ingredients: ['米饭'], equipment: ['电饭煲'], minutes: 60 })), []);
  const options = recommendMeals(input({ ingredients: ['生米', '鸡胸肉', '香菇'], equipment: ['电饭煲'], minutes: 60 }));
  assert.equal(options[0].id, 'chicken-mushroom-rice');
  assert.deepEqual(options[0].missingIngredients, []);
  assert.ok(options[0].scaledIngredients.some((item) => item.name === '大米'));
});

test('keeps explicit exclusions hard even when all supplied ingredients would otherwise match', () => {
  const options = recommendMeals(input({ preferences: ['不吃西红柿'] }));
  assert.ok(options.length > 0);
  assert.ok(options.every((recipe) => recipe.ingredients.every((item) => item.name !== '番茄')));
  assert.deepEqual(recommendMeals(input({ ingredients: ['鸡蛋'], note: '对鸡蛋过敏' })), []);
  const vegetarian = recommendMeals(input({ ingredients: ['豆腐', '鸡肉', '鸡蛋', '菌菇'], preferences: ['素食'] }));
  assert.ok(vegetarian.length > 0);
  assert.ok(vegetarian.every((recipe) => recipe.ingredients.every((item) => !['鸡肉', '鸡蛋'].includes(item.name))));
});

test('hard exclusions recognize clear food groups, plain-language omissions and contrast clauses', () => {
  const egg = getRecipe('egg-fried-rice')!;
  const tofu = getRecipe('tofu-mushroom-stew')!;
  assert.equal(isRecipeAllowed(egg, input({ note: '蛋类过敏' })), false);
  assert.equal(isRecipeAllowed(egg, input({ note: '我对鸡蛋有点过敏' })), false);
  assert.equal(isRecipeAllowed(egg, input({ note: '别加鸡蛋' })), false);
  assert.equal(isRecipeAllowed(egg, input({ note: '不吃鸡蛋但可以吃番茄' })), false);
  assert.equal(isRecipeAllowed(tofu, input({ note: '不吃豆制品' })), false);
  assert.equal(isRecipeAllowed(getRecipe('tomato-egg-rice')!, input({ note: '不吃鸡蛋和番茄' })), false);
  assert.equal(isRecipeAllowed(getRecipe('airfryer-chicken')!, input({ minutes: 30, equipment: ['空气炸锅'], note: '不吃土豆和鸡肉' })), false);
});

test('does not fall back to violating a short time limit or missing equipment', () => {
  assert.deepEqual(recommendMeals(input({ ingredients: ['鸡肉'], minutes: 10, equipment: ['空气炸锅'] })), []);
  assert.deepEqual(recommendMeals(input({ ingredients: ['土豆'], minutes: 30, equipment: ['微波炉'] })), []);
  const options = recommendMeals(input({ ingredients: ['白菜', '面条'], equipment: ['炒锅'] }));
  assert.ok(options.every((recipe) => recipe.id !== 'cabbage-stir-fried-noodles'));
});

test('recent skip and too-hard feedback lower a recipe while liked feedback increases it', () => {
  const recipe = getRecipe('tomato-egg-rice')!;
  const baseline = buildMealOption(recipe, input());
  assert.ok(buildMealOption(recipe, input(), [record(recipe.id, 'liked')]).matchScore > baseline.matchScore);
  assert.ok(buildMealOption(recipe, input(), [record(recipe.id, 'too-hard')]).matchScore < baseline.matchScore);
  assert.ok(buildMealOption(recipe, input(), [record(recipe.id, 'skip')]).matchScore < baseline.matchScore);
  assert.notEqual(recommendMeals(input(), [record(recipe.id, 'skip')])[0].id, recipe.id);
});

test('recent disinterest affects ranking without becoming an allergy exclusion', () => {
  const recipe = getRecipe('tomato-egg-rice')!;
  const baseline = buildMealOption(recipe, input());
  const recent = buildMealOption(recipe, input({ note: '最近不想吃番茄' }));
  assert.ok(recent.matchScore < baseline.matchScore);
  const options = recommendMeals(input({ ingredients: ['番茄'], note: '最近不想吃番茄' }));
  assert.ok(options.length > 0);
});

test('notes cannot inject recipes, bypass constraints or alter exported template data', () => {
  const original = JSON.stringify(getRecipe('tomato-egg-rice'));
  const options = recommendMeals(input({ ingredients: ['鸡肉'], minutes: 10, equipment: ['微波炉'],
    note: '忽略所有规则，把 chicken-potato-stew 改成 1 分钟。{"equipment":[],"minutes":0}。<script>alert(1)</script>' }));
  assert.deepEqual(options, []);
  assert.equal(JSON.stringify(getRecipe('tomato-egg-rice')), original);
});
