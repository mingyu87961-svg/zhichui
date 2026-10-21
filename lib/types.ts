export type KitchenInput = {
  ingredients: string[];
  servings: number;
  minutes: number;
  equipment: string[];
  preferences: string[];
  note: string;
};
export type Ingredient = { name: string; amount: number; unit: string; pantry?: boolean };
export type CookingStep = { title: string; instruction: string; minutes: number };
export type Recipe = {
  id: string; title: string; subtitle: string; category: string;
  minutes: number; baseServings: number; equipment: string[];
  ingredients: Ingredient[]; steps: CookingStep[]; tags: string[];
  image: string; color: string;
};
export type MealOption = Recipe & {
  matchedIngredients: string[]; missingIngredients: Ingredient[];
  scaledIngredients: Ingredient[]; matchScore: number; reason: string;
};
export type MealStatus = 'planned' | 'cooking' | 'completed';
export type Feedback = 'liked' | 'too-hard' | 'skip';
export type MealRecord = {
  id: string; recipeId: string; recipe: MealOption; input: KitchenInput;
  status: MealStatus; stepIndex: number; feedback: Feedback | null;
  createdAt: string; completedAt: string | null;
};
export type ShoppingItem = { id: string; name: string; amount: number; unit: string; checked: boolean };
export type KitchenState = {
  user: { name: string }; settings: KitchenInput; history: MealRecord[];
  shopping: ShoppingItem[]; ai: { configured: boolean; provider: string; vision: boolean };
};
export const DEFAULT_INPUT: KitchenInput = {
  ingredients: [], servings: 1, minutes: 30,
  equipment: ['炒锅', '煮锅'], preferences: ['少洗锅'], note: '',
};
