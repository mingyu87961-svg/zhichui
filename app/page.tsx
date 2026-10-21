"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Camera, Check, CheckCheck, Clock3, CookingPot, ChevronRight, CircleHelp, Flame, Heart, Leaf, LoaderCircle, Minus, Pause, Play, Plus, RefreshCw, ShoppingBag, SlidersHorizontal, Sparkles, TimerReset, Trash2, Users, Utensils, X } from 'lucide-react';
import { DEFAULT_INPUT, type Feedback, type KitchenInput, type KitchenState, type MealOption, type MealRecord, type ShoppingItem } from '@/lib/types';

type View = 'tonight' | 'history' | 'cooking';
type StepTimer = { remaining: number; deadline: number | null; finished: boolean };
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...options, headers: { ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options?.headers } });
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : `暂时无法完成，请稍后重试（${res.status}）`);
  return data as T;
}
function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
function recipeImage(recipe: MealOption) { return recipe.image || '/food/rice.svg'; }
function mergeUnderstoodInput(current: KitchenInput, submitted: KitchenInput, understood: KitchenInput): KitchenInput {
  const unchanged = (key: keyof KitchenInput) => JSON.stringify(current[key]) === JSON.stringify(submitted[key]);
  return {
    ingredients: unchanged('ingredients') ? understood.ingredients : current.ingredients,
    servings: unchanged('servings') ? understood.servings : current.servings,
    minutes: unchanged('minutes') ? understood.minutes : current.minutes,
    equipment: unchanged('equipment') ? understood.equipment : current.equipment,
    preferences: unchanged('preferences') ? understood.preferences : current.preferences,
    note: unchanged('note') ? understood.note : current.note,
  };
}

export default function Home() {
  const [kitchen, setKitchen] = useState<KitchenState | null>(null);
  const [input, setInput] = useState<KitchenInput>({ ...DEFAULT_INPUT });
  const [ingredientText, setIngredientText] = useState('');
  const [options, setOptions] = useState<MealOption[] | null>(null);
  const [recommendationInput, setRecommendationInput] = useState<KitchenInput>({ ...DEFAULT_INPUT });
  const [mode, setMode] = useState<'deepseek' | 'template'>('template');
  const [recommendMessage, setRecommendMessage] = useState('');
  const [view, setView] = useState<View>('tonight');
  const [activeMeal, setActiveMeal] = useState<MealRecord | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [shoppingText, setShoppingText] = useState('');
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recognized, setRecognized] = useState<string[] | null>(null);
  const [recognizeMessage, setRecognizeMessage] = useState('');
  const [timers, setTimers] = useState<Record<string, StepTimer>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current = true;
    request<KitchenState>('/api/kitchen').then(data => { if (current) { setKitchen(data); setInput(data.settings); } }).catch(err => { if (current) setError(err.message); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timeout); }, [notice]);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(previous => {
        let changed = false; const next = { ...previous };
        for (const [key, timer] of Object.entries(previous)) {
          if (!timer.deadline) continue;
          const remaining = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000));
          if (remaining !== timer.remaining) { changed = true; next[key] = { remaining, deadline: remaining ? timer.deadline : null, finished: remaining === 0 }; }
        }
        return changed ? next : previous;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!shoppingOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShoppingOpen(false);
      if (event.key === 'Tab') {
        const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
        const first = focusable?.[0]; const last = focusable?.[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', close); const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = oldOverflow; previousFocus?.focus(); };
  }, [shoppingOpen]);

  function addIngredients(value: string) {
    const names = value.split(/[,，、\n;；]+/).map(v => v.trim()).filter(Boolean);
    if (!names.length) return;
    setInput(previous => ({ ...previous, ingredients: [...new Set([...previous.ingredients, ...names])].slice(0, 30) })); setIngredientText('');
  }
  function toggleValue(key: 'equipment' | 'preferences', value: string) { setInput(previous => ({ ...previous, [key]: previous[key].includes(value) ? previous[key].filter(item => item !== value) : [...previous[key], value] })); }
  function updateMeal(meal: MealRecord) {
    setKitchen(previous => previous ? { ...previous, history: [meal, ...previous.history.filter(item => item.id !== meal.id)] } : previous);
    if (activeMeal?.id === meal.id) setActiveMeal(meal);
  }
  async function recommend(event: FormEvent) {
    event.preventDefault();
    const pending = ingredientText.split(/[,，、\n;；]+/).map(v => v.trim()).filter(Boolean);
    const submitted = { ...input, ingredients: [...new Set([...input.ingredients, ...pending])].slice(0, 30) };
    if (!submitted.ingredients.length) { setError('先告诉我家里有什么食材吧。'); return; }
    if (!submitted.equipment.length) { setError('先选择手边至少一件厨具，才能找到能实际做出的方案。'); return; }
    setInput(submitted); setIngredientText(''); setError(''); setRecommending(true); setView('tonight');
    try {
      const data = await request<{ options: MealOption[]; mode: 'deepseek' | 'template'; message?: string; input?: KitchenInput }>('/api/recommend', { method: 'POST', body: JSON.stringify(submitted) });
      const understood = data.input || submitted;
      setOptions(data.options); setRecommendationInput(understood); setInput(current => mergeUnderstoodInput(current, submitted, understood)); setMode(data.mode); setRecommendMessage(data.message || '');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) { setError((err as Error).message); } finally { setRecommending(false); }
  }
  async function chooseRecipe(recipe: MealOption) {
    setBusy(recipe.id); setError('');
    try {
      const data = await request<{ meal: MealRecord }>('/api/meals', { method: 'POST', body: JSON.stringify({ recipeId: recipe.id, input: recommendationInput }) });
      updateMeal(data.meal); setActiveMeal(data.meal); setView('cooking'); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError((err as Error).message); } finally { setBusy(''); }
  }
  async function changeStep(stepIndex: number) {
    if (!activeMeal) return; setBusy('step'); setError('');
    try { const data = await request<{ meal: MealRecord }>(`/api/meals/${activeMeal.id}`, { method: 'PATCH', body: JSON.stringify({ stepIndex, status: 'cooking' }) }); updateMeal(data.meal); }
    catch (err) { setError((err as Error).message); } finally { setBusy(''); }
  }
  async function completeMeal() {
    if (!activeMeal) return; setBusy('complete'); setError('');
    try { const data = await request<{ meal: MealRecord }>(`/api/meals/${activeMeal.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }); updateMeal(data.meal); setTimers(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => !key.startsWith(`${data.meal.id}-`)))); setNotice('这顿饭已记好，趁热享用吧。'); setView('history'); }
    catch (err) { setError((err as Error).message); } finally { setBusy(''); }
  }
  async function feedback(meal: MealRecord, value: Feedback) {
    setBusy(`feedback-${meal.id}`); setError('');
    try { const data = await request<{ meal: MealRecord }>(`/api/meals/${meal.id}`, { method: 'PATCH', body: JSON.stringify({ feedback: meal.feedback === value ? null : value }) }); updateMeal(data.meal); setNotice('记住你的口味了，下次安排时会参考。'); }
    catch (err) { setError((err as Error).message); } finally { setBusy(''); }
  }
  async function addShopping(recipe?: MealOption) {
    if (!recipe && !shoppingText.trim()) return; setBusy(recipe ? `shopping-${recipe.id}` : 'shopping-add'); setError('');
    try {
      const data = await request<{ items: ShoppingItem[] }>('/api/shopping', { method: 'POST', body: JSON.stringify(recipe ? { recipeId: recipe.id, input: recommendationInput } : { name: shoppingText.trim() }) });
      setKitchen(previous => previous ? { ...previous, shopping: data.items } : previous); setShoppingText(''); setNotice(recipe ? '缺少的食材已加入购物清单。' : '已加入购物清单。');
    } catch (err) { setError((err as Error).message); } finally { setBusy(''); }
  }
  async function editShopping(item: ShoppingItem, remove = false) {
    setBusy(`item-${item.id}`); setError('');
    try {
      if (remove) { await request(`/api/shopping/${item.id}`, { method: 'DELETE' }); setKitchen(previous => previous ? { ...previous, shopping: previous.shopping.filter(i => i.id !== item.id) } : previous); }
      else { const data = await request<{ item: ShoppingItem }>(`/api/shopping/${item.id}`, { method: 'PATCH', body: JSON.stringify({ checked: !item.checked }) }); setKitchen(previous => previous ? { ...previous, shopping: previous.shopping.map(i => i.id === item.id ? data.item : i) } : previous); }
    } catch (err) { setError((err as Error).message); } finally { setBusy(''); }
  }
  async function savePreferences() {
    setBusy('settings'); setError('');
    try { await request('/api/settings', { method: 'PATCH', body: JSON.stringify(input) }); setNotice('已记住，下次打开就按你的习惯来。'); }
    catch (err) { setError((err as Error).message); } finally { setBusy(''); }
  }
  async function recognizeImage(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('图片有些大，请选择 5 MB 以内的照片。'); return; }
    setBusy('photo'); setError(''); setRecognized(null); const body = new FormData(); body.append('image', file);
    try { const data = await request<{ ingredients: string[]; message: string }>('/api/ingredients/recognize', { method: 'POST', body }); setRecognized(data.ingredients); setRecognizeMessage(data.message); }
    catch (err) { setError((err as Error).message); } finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  }
  function toggleTimer(key: string, minutes: number) {
    setTimers(previous => {
      const timer = previous[key];
      if (timer?.deadline) return { ...previous, [key]: { ...timer, remaining: Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000)), deadline: null } };
      const seconds = timer && !timer.finished && timer.remaining > 0 ? timer.remaining : minutes * 60;
      return { ...previous, [key]: { remaining: seconds, deadline: Date.now() + seconds * 1000, finished: false } };
    });
  }

  const history = kitchen?.history || []; const shopping = kitchen?.shopping || [];
  const shoppingCount = shopping.filter(item => !item.checked).length;
  const completeCount = history.filter(meal => meal.status === 'completed').length;
  const runningTimers = Object.values(timers).filter(timer => timer.deadline).length;
  const finishedTimers = Object.entries(timers).filter(([, timer]) => timer.finished);
  const currentStep = activeMeal?.recipe.steps[activeMeal.stepIndex];
  const timerKey = activeMeal ? `${activeMeal.id}-${activeMeal.stepIndex}` : ''; const activeTimer = timers[timerKey];

  return <div className="dinner-app">
    <header className="site-header"><div className="header-inner">
      <button className="brand" onClick={() => setView('tonight')} aria-label="知炊首页"><span className="brand-icon"><CookingPot size={24} strokeWidth={1.8} /></span><span>知炊<span className="brand-dot">.</span></span></button>
      <nav aria-label="主导航"><button className={view === 'tonight' || view === 'cooking' ? 'active' : ''} onClick={() => setView('tonight')}>今晚吃什么</button><button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>开饭记录{completeCount > 0 && <span className="nav-count">{completeCount}</span>}</button></nav>
      <button className="shopping-trigger" aria-label={`购物清单${shoppingCount ? `，${shoppingCount} 项待购买` : ''}`} onClick={() => setShoppingOpen(true)}><ShoppingBag size={18} /><span>购物清单</span>{shoppingCount > 0 && <b>{shoppingCount}</b>}</button>
    </div></header>
    <main className="main-shell">
      {error && <div className={`alert error ${shoppingOpen ? 'modal-error' : ''}`} role="alert"><CircleHelp size={19} /><span>{error}</span><button onClick={() => setError('')} aria-label="关闭错误提示"><X size={17} /></button></div>}
      {finishedTimers.length > 0 && <div className="alert timer-alert" role="status"><Clock3 size={19} /><span>有 {finishedTimers.length} 个步骤计时结束了，记得看一眼锅里。</span><button onClick={() => setTimers(previous => Object.fromEntries(Object.entries(previous).filter(([, timer]) => !timer.finished)))}>知道了</button></div>}
      {view === 'tonight' && <>
        <section className="page-intro"><div className="eyebrow"><span /> A LITTLE LESS EFFORT, A LITTLE BETTER DINNER</div><h1>今晚吃好一点<span>。</span></h1><p>懂手边食材，知今晚吃什么。</p><span className="intro-note"><Leaf size={16} /> 少买一点 · 少忙一点 · 好好吃饭</span></section>
        <div className="kitchen-layout">
          <form className="kitchen-panel" onSubmit={recommend}>
            <div className="section-heading"><div><span className="section-kicker">YOUR LITTLE KITCHEN</span><h2>家里有什么？</h2></div><span className="small-illustration"><Utensils size={24} strokeWidth={1.4} /></span></div>
            <p className="field-hint">可以写食材名，也可以说说家里有什么。<br />输入后直接安排，就会帮你整理成食材。</p>
            <div className="ingredient-box"><div className="ingredient-chips">{input.ingredients.map(item => <span className="ingredient-chip" key={item}>{item}<button type="button" aria-label={`移除${item}`} onClick={() => setInput(previous => ({ ...previous, ingredients: previous.ingredients.filter(i => i !== item) }))}><X size={13} /></button></span>)}</div><div className="ingredient-entry"><input aria-label="添加食材" placeholder={input.ingredients.length ? '还有什么？' : '例如：鸡蛋、番茄、米饭'} value={ingredientText} maxLength={180} onChange={event => setIngredientText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addIngredients(ingredientText); } }} /><button type="button" aria-label="添加食材到列表" disabled={!ingredientText.trim()} onClick={() => addIngredients(ingredientText)}><Plus size={20} /></button></div></div>
            <div className="ingredient-tools"><button type="button" className="text-button example-button" onClick={() => { setInput(previous => ({ ...previous, ingredients: ['鸡蛋', '番茄', '米饭'] })); setIngredientText(''); }}><Sparkles size={14} /> 试试这组食材</button><button type="button" className="text-button" disabled={!kitchen?.ai.vision || busy === 'photo'} onClick={() => fileRef.current?.click()}>{busy === 'photo' ? <LoaderCircle size={14} className="spin" /> : <Camera size={14} />} 拍照添加</button><input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="上传食材照片" onChange={event => void recognizeImage(event.target.files?.[0])} /></div>
            {kitchen && !kitchen.ai.vision && <p className="photo-help">拍照识别尚未开启，先用文字添加食材。</p>}
            {recognized !== null && <div className="recognition-review"><strong>先核对一下识别到的食材</strong><p>{recognizeMessage || '可以移除不准确的项目，再确认添加。'}</p><div className="ingredient-chips">{recognized.map((name, index) => <span className="ingredient-chip" key={`${name}-${index}`}>{name}<button type="button" aria-label={`移除识别结果${name}`} onClick={() => setRecognized(previous => previous?.filter((_, i) => i !== index) || [])}><X size={13} /></button></span>)}</div><div className="recognition-actions"><button type="button" className="small-primary" disabled={!recognized.length} onClick={() => { addIngredients(recognized.join('、')); setRecognized(null); }}>确认添加</button><button type="button" className="text-button" onClick={() => setRecognized(null)}>取消</button></div></div>}
            <div className="panel-divider" />
            <div className="two-fields"><div><label className="field-label"><Users size={15} /> 几个人吃</label><div className="stepper"><button type="button" aria-label="减少人数" disabled={input.servings <= 1} onClick={() => setInput(previous => ({ ...previous, servings: previous.servings - 1 }))}><Minus size={15} /></button><span>{input.servings}<small>人</small></span><button type="button" aria-label="增加人数" disabled={input.servings >= 6} onClick={() => setInput(previous => ({ ...previous, servings: previous.servings + 1 }))}><Plus size={15} /></button></div></div><div><label className="field-label" htmlFor="minutes"><Clock3 size={15} /> 多少时间</label><div className="select-wrap"><select id="minutes" value={input.minutes} onChange={event => setInput(previous => ({ ...previous, minutes: Number(event.target.value) }))}>{[...new Set([15, 20, 30, 45, 60, input.minutes])].sort((a, b) => a - b).map(value => <option key={value} value={value}>{value} 分钟内</option>)}</select><ChevronRight size={14} /></div></div></div>
            <fieldset><legend className="field-label"><CookingPot size={15} /> 手边的厨具</legend><div className="option-chips">{['炒锅', '煮锅', '电饭煲', '微波炉', '空气炸锅'].map(item => <button type="button" key={item} aria-pressed={input.equipment.includes(item)} className={input.equipment.includes(item) ? 'selected' : ''} onClick={() => toggleValue('equipment', item)}>{input.equipment.includes(item) && <Check size={12} />}{item}</button>)}</div></fieldset>
            <fieldset><legend className="field-label"><SlidersHorizontal size={15} /> 今天想要</legend><div className="option-chips preferences">{['少洗锅', '不要辣', '素食', '少油'].map(item => <button type="button" key={item} aria-pressed={input.preferences.includes(item)} className={input.preferences.includes(item) ? 'selected' : ''} onClick={() => toggleValue('preferences', item)}>{item === '素食' && <Leaf size={13} />}{item}</button>)}</div></fieldset>
            {input.preferences.some(item => !['少洗锅', '不要辣', '素食', '少油'].includes(item)) && <div className="understood-preferences"><span>还会考虑这些要求</span><div className="ingredient-chips">{input.preferences.filter(item => !['少洗锅', '不要辣', '素食', '少油'].includes(item)).map(item => <span className="ingredient-chip" key={item}>{item}<button type="button" aria-label={`移除偏好${item}`} onClick={() => toggleValue('preferences', item)}><X size={12} /></button></span>)}</div></div>}
            <label className="field-label" htmlFor="dinner-note">再说两句 <span className="optional">可选</span></label><textarea id="dinner-note" value={input.note} maxLength={500} onChange={event => setInput(previous => ({ ...previous, note: event.target.value }))} placeholder="比如：最近吃腻了面条，今天想吃清淡一点" rows={2} />
            <button type="submit" className="primary-button recommend-button" disabled={loading || recommending || !!busy || !kitchen}>{recommending ? <><LoaderCircle className="spin" size={18} /> 正在想今晚的好主意…</> : <><Sparkles size={18} /> 帮我安排今晚这顿 <ArrowRight size={18} /></>}</button>
            <button type="button" className="save-preferences" disabled={!!busy || !kitchen} onClick={() => void savePreferences()}>{busy === 'settings' ? '正在保存…' : '记住这些做饭偏好'}<Heart size={13} /></button>
            {!loading && !kitchen && <button type="button" className="text-button retry-button" onClick={() => window.location.reload()}><RefreshCw size={14} /> 重新连接我的厨房</button>}
          </form>
          <section className="ideas-panel" ref={resultsRef} aria-live="polite">
            {recommending ? <div className="recommend-loading"><span className="loading-bowl"><CookingPot size={42} strokeWidth={1.3} /></span><h2>把现有的，变成好吃的。</h2><p>正在匹配食材、时间和你的口味…</p><div className="loading-dots"><i /><i /><i /></div></div> : options === null ? <>
              <div className="welcome-board"><div className="board-topline"><span><span className="sun-dot" /> 一顿饭的小确幸</span><span>DINNER IN SEASON</span></div><div className="hero-food"><div className="food-orbit orbit-one" /><div className="food-orbit orbit-two" /><img src="/food/rice.svg" alt="一碗热气腾腾的家常饭插画" /><span className="food-note note-left"><span>✦</span> 家常，也可以很好吃</span><span className="food-note note-right"><Clock3 size={14} /> 今晚，留点时间给自己</span></div><div className="board-caption"><span className="caption-line" /><p>不必满冰箱，<br /><strong>也能好好吃一顿。</strong></p><span className="caption-number">01 / DAILY DINNER</span></div></div>
              <div className="how-it-works"><div><span>01</span><p>放入现有食材<small>从手边的几样开始</small></p></div><ArrowRight size={15} /><div><span>02</span><p>挑一个好主意<small>少买配料，少些纠结</small></p></div><ArrowRight size={15} /><div><span>03</span><p>跟着步骤开饭<small>今晚也照顾好自己</small></p></div></div><div className="kitchen-tip"><Leaf size={21} strokeWidth={1.5} /><div><strong>冰箱里的最后一点，也值得好好安排。</strong><p>系统会优先匹配现有食材，缺少的材料会单独列出。</p></div></div>
            </> : <>
              <div className="results-heading"><div><span className="section-kicker">A FEW GOOD IDEAS</span><h2>今晚，可以这样吃<span> {options.length ? `${options.length} 个好主意` : ''}</span></h2></div><span className={`mode-badge ${mode === 'deepseek' ? 'ai-mode' : ''}`}><Sparkles size={12} />{mode === 'deepseek' ? 'DeepSeek 帮你安排' : '家常菜模板推荐'}</span></div>
              {recommendMessage && <p className="results-message">{recommendMessage}</p>}
              {!options.length ? <div className="empty-state"><CookingPot size={38} strokeWidth={1.3} /><h3>还没找到能直接照做的搭配</h3><p>目前的家常菜模板还没覆盖所有食材组合，<br />也可能受到做饭时间、厨具或忌口限制。<br />你的忌口会保留，可以调整食材或其他条件再试。</p><button className="secondary-button" onClick={() => document.querySelector<HTMLInputElement>('.ingredient-entry input')?.focus()}>调整一下食材 <ArrowLeft size={15} /></button></div> : <div className="recipe-list">{options.map((recipe, index) => <article className="recipe-card" key={recipe.id}><div className="recipe-art" style={{ backgroundColor: recipe.color || '#f5e9d8' }}><img src={recipeImage(recipe)} alt={`${recipe.title}示意插画`} /><span className="recipe-rank">{index === 0 ? <><Sparkles size={11} /> 今晚首选</> : `好主意 0${index + 1}`}</span></div><div className="recipe-content"><div className="recipe-title-row"><h3>{recipe.title}</h3><span className="recipe-time"><Clock3 size={13} />{recipe.minutes} 分钟</span></div><p className="recipe-subtitle">{recipe.subtitle}</p><div className="recipe-tags">{recipe.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div><p className="recipe-reason">{recipe.reason}</p><div className="ingredient-summary"><span><Check size={13} /> 用上 {recipe.matchedIngredients.length} 样现有食材</span>{recipe.missingIngredients.length ? <span className="missing">还缺 {recipe.missingIngredients.map(item => item.name).join('、')}</span> : <span>主要食材都齐了</span>}</div><div className="recipe-actions"><button className="primary-button small" disabled={!!busy} onClick={() => void chooseRecipe(recipe)}>{busy === recipe.id ? <LoaderCircle size={15} className="spin" /> : <Utensils size={15} />}就做这个<ArrowRight size={15} /></button>{recipe.missingIngredients.length > 0 && <button className="text-button" disabled={!!busy} onClick={() => void addShopping(recipe)}><ShoppingBag size={14} />补进购物清单</button>}</div></div></article>)}</div>}
              <p className="results-footnote"><CircleHelp size={13} />做饭前请核对食材、过敏原和用量，按实际情况调整。</p>
            </>}
          </section>
        </div>
      </>}
      {view === 'cooking' && activeMeal && currentStep && <section className="cooking-page"><button className="back-button" onClick={() => setView('tonight')}><ArrowLeft size={16} /> 回到今晚的安排</button><div className="cooking-header"><div><span className="section-kicker">LET’S MAKE SOMETHING GOOD</span><h1>{activeMeal.recipe.title}</h1><p><Clock3 size={16} />约 {activeMeal.recipe.minutes} 分钟<span>·</span><Users size={16} />{activeMeal.input.servings} 人份<span>·</span>{activeMeal.recipe.equipment.join(' / ')}</p></div><img src={recipeImage(activeMeal.recipe)} alt={`${activeMeal.recipe.title}示意插画`} /></div><div className="cooking-layout"><aside className="ingredients-card"><h2><ShoppingBag size={18} /> 先把食材备好</h2><ul>{activeMeal.recipe.scaledIngredients.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}{item.pantry && <small>常备调料</small>}</span><strong>{item.amount > 0 ? item.amount : ''}{item.unit}</strong></li>)}</ul><p>用量按 {activeMeal.input.servings} 人份估算，可按食量调整。</p><div className="steps-outline">{activeMeal.recipe.steps.map((step, index) => <button className={index === activeMeal.stepIndex ? 'current' : ''} key={`${step.title}-${index}`} disabled={!!busy} onClick={() => void changeStep(index)}><span>{index < activeMeal.stepIndex ? <Check size={12} /> : index + 1}</span>{step.title}</button>)}</div></aside><div className="cooking-step-card"><div className="step-progress"><span>STEP {String(activeMeal.stepIndex + 1).padStart(2, '0')} <small>/ {String(activeMeal.recipe.steps.length).padStart(2, '0')}</small></span><span>{currentStep.minutes} 分钟左右</span></div><div className="step-progress-track"><i style={{ width: `${((activeMeal.stepIndex + 1) / activeMeal.recipe.steps.length) * 100}%` }} /></div><h2>{currentStep.title}</h2><p className="step-instruction">{currentStep.instruction}</p>{currentStep.minutes > 0 && <div className={`cooking-timer ${activeTimer?.finished ? 'finished' : ''}`}><div><Clock3 size={20} /><strong>{formatTime(activeTimer?.remaining ?? currentStep.minutes * 60)}</strong><span>{activeTimer?.finished ? '时间到，看看火候' : activeTimer?.deadline ? '正在计时' : '步骤小计时'}</span></div><div><button aria-label={activeTimer?.deadline ? '暂停计时' : '开始计时'} onClick={() => toggleTimer(timerKey, currentStep.minutes)}>{activeTimer?.deadline ? <Pause size={18} /> : <Play size={18} />}</button><button aria-label="重置计时" onClick={() => setTimers(previous => ({ ...previous, [timerKey]: { remaining: currentStep.minutes * 60, deadline: null, finished: false } }))}><TimerReset size={18} /></button></div></div>}<p className="timer-help">计时提醒仅在本页面打开时显示，请留意火候。{runningTimers > 1 ? ` 另有 ${runningTimers - (activeTimer?.deadline ? 1 : 0)} 个步骤正在计时。` : ''}</p><div className="step-navigation"><button className="secondary-button" disabled={activeMeal.stepIndex === 0 || !!busy} onClick={() => void changeStep(activeMeal.stepIndex - 1)}><ArrowLeft size={16} /> 上一步</button>{activeMeal.stepIndex < activeMeal.recipe.steps.length - 1 ? <button className="primary-button" disabled={!!busy} onClick={() => void changeStep(activeMeal.stepIndex + 1)}>下一步 <ArrowRight size={16} /></button> : <button className="primary-button" disabled={!!busy} onClick={() => void completeMeal()}>{busy === 'complete' ? <LoaderCircle size={16} className="spin" /> : <CheckCheck size={17} />} 做好了，开饭！</button>}</div></div></div></section>}
      {view === 'history' && <section className="history-page"><div className="page-intro"><div className="eyebrow"><span /> YOUR EVERYDAY GOOD THINGS</div><h1>好好吃饭的日子<span>。</span></h1><p>记下每一顿，下次更懂你的胃。</p></div>{history.length ? <div className="history-grid">{history.map(meal => <article className="history-card" key={meal.id}><div className="history-image" style={{ backgroundColor: meal.recipe.color || '#f4ecde' }}><img src={recipeImage(meal.recipe)} alt={`${meal.recipe.title}示意插画`} /><span>{meal.status === 'completed' ? '已开饭' : meal.status === 'cooking' ? '正在做' : '已安排'}</span></div><div className="history-content"><time>{new Date(meal.createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} · {meal.input.servings} 人份</time><h2>{meal.recipe.title}</h2><p>{meal.recipe.minutes} 分钟 · {meal.recipe.equipment.join(' / ')}</p>{meal.status === 'completed' ? <div className="feedback-row"><span>这顿怎么样？</span><div>{([{ value: 'liked', label: '喜欢', icon: <Heart size={13} /> }, { value: 'too-hard', label: '太麻烦', icon: <Flame size={13} /> }, { value: 'skip', label: '暂时不想吃', icon: <Pause size={12} /> }] as const).map(item => <button key={item.value} disabled={!!busy} aria-pressed={meal.feedback === item.value} className={meal.feedback === item.value ? 'selected' : ''} onClick={() => void feedback(meal, item.value)}>{item.icon}{item.label}</button>)}</div></div> : <button className="text-button continue-button" onClick={() => { setActiveMeal(meal); setView('cooking'); }}>继续做这道菜 <ArrowRight size={14} /></button>}</div></article>)}</div> : <div className="empty-state history-empty"><span className="empty-icon"><BookOpen size={34} strokeWidth={1.4} /></span><h2>第一顿好饭，值得记下来。</h2><p>选一道菜跟着做，完成后就会出现在这里。</p><button className="primary-button" onClick={() => setView('tonight')}>去安排今晚这顿 <ArrowRight size={16} /></button></div>}</section>}
      <footer className="site-footer"><span><CookingPot size={16} /> 知炊<span className="brand-dot">.</span></span><p>一顿简单的饭，也是认真生活。</p><span>MADE FOR EVERYDAY DINNERS</span></footer>
    </main>
    {notice && <div className="toast" role="status"><span><Check size={15} /></span>{notice}</div>}
    {shoppingOpen && <div className="drawer-overlay" onClick={event => { if (event.target === event.currentTarget) setShoppingOpen(false); }}><section ref={drawerRef} className="shopping-drawer" role="dialog" aria-modal="true" aria-label="购物清单"><div className="drawer-header"><div><span className="section-kicker">JUST WHAT YOU NEED</span><h2>顺路买一点<span>。</span></h2></div><button className="icon-button" onClick={() => setShoppingOpen(false)} aria-label="关闭购物清单"><X size={22} /></button></div><p className="drawer-description">缺的才买，买到的随手勾掉。</p><form className="shopping-add" onSubmit={event => { event.preventDefault(); void addShopping(); }}><input aria-label="添加购物清单项目" maxLength={60} placeholder="还需要买什么？" value={shoppingText} onChange={event => setShoppingText(event.target.value)} /><button aria-label="添加购物项目" disabled={!shoppingText.trim() || !!busy}><Plus size={19} /></button></form>{shopping.length ? <><div className="shopping-summary">还有 {shoppingCount} 项待买<span>{shopping.length - shoppingCount} 项已买到</span></div><ul className="shopping-list">{shopping.map(item => <li key={item.id} className={item.checked ? 'checked' : ''}><button className="check-box" aria-label={`${item.checked ? '标记未买' : '标记已买'}${item.name}`} aria-pressed={item.checked} disabled={!!busy} onClick={() => void editShopping(item)}>{item.checked && <Check size={14} />}</button><span>{item.name}<small>{item.amount > 0 ? `${item.amount}${item.unit}` : item.unit}</small></span><button className="delete-item" aria-label={`删除购物项目${item.name}`} disabled={!!busy} onClick={() => void editShopping(item, true)}><Trash2 size={15} /></button></li>)}</ul></> : <div className="empty-state shopping-empty"><ShoppingBag size={36} strokeWidth={1.3} /><h3>清单还是空的</h3><p>推荐中缺少的食材可以一键加入，<br />也可以在上方随手添加。</p></div>}<div className="drawer-note"><Leaf size={18} /><p>先看看家里还有没有，少买一点刚刚好。</p></div></section></div>}
  </div>;
}
