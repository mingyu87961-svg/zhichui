import { env } from 'cloudflare:workers';
import { DEFAULT_INPUT, type Feedback, type KitchenInput, type MealOption, type MealRecord, type MealStatus, type ShoppingItem } from '@/lib/types';
import { HttpError } from './http';

type MealRow = {
  id: string; recipe_id: string; snapshot_json: string; input_json: string;
  status: MealStatus; step_index: number; feedback: Feedback | null;
  created_at: string; completed_at: string | null;
};
type ShoppingRow = { id: string; name: string; amount: number; unit: string; checked: number };

export function database(): D1Database {
  if (!env.DB) throw new HttpError(503, '厨房存储暂时不可用，请稍后重试。');
  return env.DB;
}

function toMeal(row: MealRow): MealRecord {
  return {
    id: row.id, recipeId: row.recipe_id,
    recipe: JSON.parse(row.snapshot_json) as MealOption,
    input: JSON.parse(row.input_json) as KitchenInput,
    status: row.status, stepIndex: row.step_index, feedback: row.feedback,
    createdAt: row.created_at, completedAt: row.completed_at,
  };
}
function toShopping(row: ShoppingRow): ShoppingItem {
  return { id: row.id, name: row.name, amount: row.amount, unit: row.unit, checked: Boolean(row.checked) };
}

export async function consumeRate(ownerId: string, scope: string, limit: number, windowSeconds: number): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const result = await database().prepare(`INSERT INTO rate_limits (id, count, reset_at) VALUES (?, 1, ?)
    ON CONFLICT(id) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
    RETURNING count`).bind(`${scope}:${ownerId}`, now + windowSeconds, now, now).first<{ count: number }>();
  if (!result || result.count > limit) throw new HttpError(429, '操作有些频繁，请稍等一会儿再试。');
}

export async function loadSettings(ownerId: string): Promise<KitchenInput> {
  const row = await database().prepare('SELECT input_json FROM kitchen_settings WHERE owner_id = ?').bind(ownerId).first<{ input_json: string }>();
  return row ? JSON.parse(row.input_json) as KitchenInput : structuredClone(DEFAULT_INPUT);
}
export async function saveSettings(ownerId: string, input: KitchenInput): Promise<void> {
  await database().prepare(`INSERT INTO kitchen_settings (owner_id, input_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(owner_id) DO UPDATE SET input_json = excluded.input_json, updated_at = excluded.updated_at`)
    .bind(ownerId, JSON.stringify(input), new Date().toISOString()).run();
}
export async function loadHistory(ownerId: string): Promise<MealRecord[]> {
  const rows = await database().prepare('SELECT * FROM meals WHERE owner_id = ? ORDER BY created_at DESC, id DESC LIMIT 50').bind(ownerId).all<MealRow>();
  return rows.results.map(toMeal);
}
export async function findMeal(ownerId: string, id: string): Promise<MealRecord> {
  const row = await database().prepare('SELECT * FROM meals WHERE id = ? AND owner_id = ?').bind(id, ownerId).first<MealRow>();
  if (!row) throw new HttpError(404, '这份晚餐记录不存在。');
  return toMeal(row);
}
export async function createMeal(ownerId: string, option: MealOption, input: KitchenInput): Promise<MealRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await database().prepare(`INSERT INTO meals
    (id, owner_id, recipe_id, snapshot_json, input_json, status, step_index, feedback, created_at, completed_at)
    VALUES (?, ?, ?, ?, ?, 'planned', 0, NULL, ?, NULL)`)
    .bind(id, ownerId, option.id, JSON.stringify(option), JSON.stringify(input), now).run();
  return findMeal(ownerId, id);
}
export async function updateMeal(ownerId: string, id: string, changes: Record<string, unknown>): Promise<MealRecord> {
  const current = await findMeal(ownerId, id);
  const allowed = new Set(['status', 'stepIndex', 'feedback']);
  if (!Object.keys(changes).length || Object.keys(changes).some((key) => !allowed.has(key))) throw new HttpError(400, '晚餐更新内容不正确。');
  let status = current.status;
  let stepIndex = current.stepIndex;
  let feedback = current.feedback;
  if ('status' in changes) {
    if (typeof changes.status !== 'string' || !['planned', 'cooking', 'completed'].includes(changes.status)) throw new HttpError(400, '晚餐状态不正确。');
    const requested = changes.status as MealStatus;
    if (requested !== current.status && !((current.status === 'planned' && requested === 'cooking') || (current.status === 'cooking' && requested === 'completed'))) {
      throw new HttpError(409, '请按照开始做饭、完成晚餐的顺序操作。');
    }
    status = requested;
  }
  if ('stepIndex' in changes) {
    if (!Number.isInteger(changes.stepIndex) || Number(changes.stepIndex) < 0 || Number(changes.stepIndex) >= current.recipe.steps.length) throw new HttpError(400, '烹饪步骤超出范围。');
    if (status === 'planned' || (current.status === 'completed' && changes.stepIndex !== current.stepIndex)) throw new HttpError(409, '请在做饭过程中更新步骤。');
    stepIndex = Number(changes.stepIndex);
  }
  if ('feedback' in changes) {
    if (status !== 'completed') throw new HttpError(409, '完成晚餐后即可留下反馈。');
    if (changes.feedback !== null && (typeof changes.feedback !== 'string' || !['liked', 'too-hard', 'skip'].includes(changes.feedback))) throw new HttpError(400, '反馈内容不正确。');
    feedback = changes.feedback as Feedback | null;
  }
  if (status === 'completed') stepIndex = current.recipe.steps.length - 1;
  const completedAt = status === 'completed' ? current.completedAt || new Date().toISOString() : null;
  const result = await database().prepare(`UPDATE meals SET status = ?, step_index = ?, feedback = ?, completed_at = ?
    WHERE id = ? AND owner_id = ? AND status = ? AND step_index = ? AND feedback IS ?`)
    .bind(status, stepIndex, feedback, completedAt, id, ownerId, current.status, current.stepIndex, current.feedback).run();
  if (!result.meta.changes) throw new HttpError(409, '记录已在其他页面更新，请刷新后重试。');
  return findMeal(ownerId, id);
}

export async function loadShopping(ownerId: string): Promise<ShoppingItem[]> {
  const rows = await database().prepare('SELECT id, name, amount, unit, checked FROM shopping_items WHERE owner_id = ? ORDER BY checked ASC, created_at DESC, id DESC').bind(ownerId).all<ShoppingRow>();
  return rows.results.map(toShopping);
}
export async function addShopping(ownerId: string, items: { name: string; amount: number; unit: string }[]): Promise<ShoppingItem[]> {
  const existing = await loadShopping(ownerId);
  const newKeys = new Set(items.map((item) => `${item.name}\u0000${item.unit}`).filter((key) => !existing.some((item) => `${item.name}\u0000${item.unit}` === key)));
  if (existing.length + newKeys.size > 200) throw new HttpError(400, '购物清单最多保存 200 项，请先清理一些。');
  if (items.length) {
    const now = new Date().toISOString();
    await database().batch(items.map((item) => database().prepare(`INSERT INTO shopping_items (id, owner_id, name, amount, unit, checked, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?) ON CONFLICT(owner_id, name, unit)
      DO UPDATE SET amount = MAX(shopping_items.amount, excluded.amount), checked = 0`)
      .bind(crypto.randomUUID(), ownerId, item.name, item.amount, item.unit, now)));
  }
  return loadShopping(ownerId);
}
export async function checkShopping(ownerId: string, id: string, checked: boolean): Promise<ShoppingItem> {
  const row = await database().prepare('UPDATE shopping_items SET checked = ? WHERE id = ? AND owner_id = ? RETURNING id, name, amount, unit, checked')
    .bind(checked ? 1 : 0, id, ownerId).first<ShoppingRow>();
  if (!row) throw new HttpError(404, '这项购物记录不存在。');
  return toShopping(row);
}
export async function deleteShopping(ownerId: string, id: string): Promise<void> {
  const result = await database().prepare('DELETE FROM shopping_items WHERE id = ? AND owner_id = ?').bind(id, ownerId).run();
  if (!result.meta.changes) throw new HttpError(404, '这项购物记录不存在。');
}
