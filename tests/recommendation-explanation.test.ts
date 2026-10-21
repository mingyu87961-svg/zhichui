import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInput, recommendMeals } from '../lib/meal-engine.ts';
import { explainRecommendation } from '../lib/recommendation-explanation.ts';

test('explains the actual natural-language ingredient parsing and does not blame the user settings', () => {
  const source = ['家里只剩下面粉和鸡蛋了还有几棵青菜', '还有辣椒'];
  const input = normalizeInput({ ingredients: source, servings: 2, minutes: 20, equipment: ['炒锅', '煮锅'], preferences: ['少洗锅'], note: '我想吃少碳水的一餐' });
  const options = recommendMeals(input);
  assert.ok(options.length > 0);
  const message = explainRecommendation(source, input, options);
  assert.match(message, /已把描述整理为/);
  assert.ok(input.ingredients.includes('鸡蛋') && input.ingredients.includes('青菜'));
  assert.doesNotMatch(message, /超过|所选厨具还不满足/);
});

test('distinguishes missing catalog coverage, time, equipment and hard dietary restrictions', () => {
  const cases = [
    { ingredients: ['三文鱼'], minutes: 30, equipment: ['炒锅'], note: '', expected: /暂未收录/ },
    { ingredients: ['鸡肉'], minutes: 10, equipment: ['空气炸锅'], note: '', expected: /至少需要约.*超过/ },
    { ingredients: ['土豆'], minutes: 30, equipment: ['微波炉'], note: '', expected: /所选厨具还不满足/ },
    { ingredients: ['鸡蛋'], minutes: 30, equipment: ['炒锅'], note: '鸡蛋过敏', expected: /保留你的忌口/ },
    { ingredients: ['鸡蛋'], minutes: 30, equipment: [], note: '', expected: /还没有选择厨具/ },
  ];
  for (const item of cases) {
    const input = normalizeInput(item);
    const options = recommendMeals(input);
    assert.equal(options.length, 0);
    assert.match(explainRecommendation(item.ingredients, input, options), item.expected);
  }
});
