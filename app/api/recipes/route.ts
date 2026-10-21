import { RECIPES } from '@/lib/meal-engine';
import { apiError, json, requireOwner } from '@/lib/server/http';

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return json({ recipes: RECIPES });
  } catch (error) { return apiError(error); }
}
