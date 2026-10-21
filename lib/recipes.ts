import type { Recipe, Ingredient, CookingStep } from './types.ts';

const ingredient = (name: string, amount: number, unit: string, pantry = false): Ingredient =>
  ({ name, amount, unit, ...(pantry ? { pantry: true } : {}) });
const step = (title: string, instruction: string, minutes: number): CookingStep => ({ title, instruction, minutes });
const oil = () => ingredient('食用油', 10, '毫升', true);
const salt = () => ingredient('盐', 2, '克', true);
const soy = () => ingredient('生抽', 10, '毫升', true);
const water = (amount: number) => ingredient('水', amount, '毫升', true);

// Every template lists its ingredients and all required cooking appliances.
// Amounts describe two servings; the meal engine scales them for the chosen household.
export const RECIPES: Recipe[] = [
  {
    id: 'greens-egg-stir-fry', title: '青菜炒鸡蛋', subtitle: '现有青菜和鸡蛋，快手炒成一盘', category: '轻松一盘',
    minutes: 12, baseServings: 2, equipment: ['炒锅'], image: '/food/egg.svg', color: '#CDD5B3', tags: ['少洗锅', '不辣'],
    ingredients: [ingredient('青菜', 300, '克'), ingredient('鸡蛋', 3, '个'), oil(), salt()],
    steps: [step('洗菜打鸡蛋', '青菜洗净沥干，把菜梗和叶片分开切段；鸡蛋打散。', 4), step('先炒鸡蛋', '炒锅放一半油，倒入蛋液，炒至凝固后盛出。', 3), step('炒青菜', '原锅加入剩余油，先放菜梗再放菜叶，翻炒至青菜熟透。', 4), step('合炒调味', '倒回鸡蛋，加盐炒匀，确认鸡蛋全熟后出锅。', 1)],
  },
  {
    id: 'simple-greens', title: '清炒青菜', subtitle: '一盘清爽小菜，可以搭配其他菜', category: '轻松一盘',
    minutes: 10, baseServings: 2, equipment: ['炒锅'], image: '/food/vegetable.svg', color: '#BCD2A5', tags: ['少洗锅', '素食', '不辣'],
    ingredients: [ingredient('青菜', 400, '克'), oil(), salt()],
    steps: [step('洗净切段', '青菜逐片洗净，沥干，把较厚的菜梗和菜叶分开放。', 4), step('先炒菜梗', '炒锅加油，先放菜梗翻炒至开始变软。', 2), step('加入菜叶', '加入菜叶继续翻炒至全熟，加盐炒匀后出锅；这是一道配菜，可按食量搭配其他食物。', 4)],
  },
  {
    id: 'tomato-egg-rice', title: '番茄鸡蛋盖饭', subtitle: '酸甜番茄汁，拌进热米饭里', category: '一锅饭',
    minutes: 18, baseServings: 2, equipment: ['炒锅'], image: '/food/rice.svg', color: '#F5D6BD', tags: ['少洗锅', '家常', '不辣'],
    ingredients: [ingredient('番茄', 2, '个'), ingredient('鸡蛋', 3, '个'), ingredient('米饭', 400, '克'), oil(), salt(), water(40)],
    steps: [step('备好食材', '番茄洗净切块，鸡蛋打散，准备已经煮熟、妥善保存的米饭。', 4), step('先炒鸡蛋', '炒锅放一半油，倒入蛋液，炒至凝固后盛出。', 3), step('炒出番茄汁', '原锅放剩余油，下番茄翻炒，加一半水和盐，煮至番茄变软出汁。', 5), step('热饭装盘', '倒回鸡蛋炒匀至熟透，先把菜盛出。原锅放米饭和剩余水，炒散并加热至中心也热透后盛碗，浇上番茄鸡蛋。', 6)],
  },
  {
    id: 'tomato-egg-noodles', title: '番茄鸡蛋汤面', subtitle: '汤和面在同一口锅里完成', category: '暖心面',
    minutes: 18, baseServings: 2, equipment: ['煮锅'], image: '/food/noodle.svg', color: '#EBC5A6', tags: ['少洗锅', '汤面', '不辣'],
    ingredients: [ingredient('番茄', 2, '个'), ingredient('鸡蛋', 2, '个'), ingredient('面条', 180, '克'), oil(), salt(), water(900)],
    steps: [step('切番茄打鸡蛋', '番茄洗净切块，鸡蛋打入碗中搅散。', 4), step('煮番茄汤', '煮锅加油炒软番茄，再加水煮沸。', 5), step('下面条', '加入面条，按包装时间煮熟，适时搅动防粘；水少时补热水。', 6), step('淋入蛋液', '淋入蛋液，待凝固后轻推，煮至鸡蛋全熟，加盐调味。', 3)],
  },
  {
    id: 'egg-fried-rice', title: '家常蛋炒饭', subtitle: '把现成米饭变成一顿热乎晚饭', category: '一锅饭',
    minutes: 12, baseServings: 2, equipment: ['炒锅'], image: '/food/rice.svg', color: '#E6C577', tags: ['少洗锅', '快手', '不辣'],
    ingredients: [ingredient('米饭', 400, '克'), ingredient('鸡蛋', 3, '个'), oil(), salt(), soy()],
    steps: [step('打散米饭', '准备已经煮熟、妥善冷藏的米饭，打散结块；鸡蛋搅匀。', 3), step('炒鸡蛋', '炒锅加油，倒入蛋液，炒至基本凝固。', 3), step('翻炒米饭', '加入米饭炒散，加生抽和盐，持续翻炒至米饭中心也充分热透，鸡蛋全熟。', 6)],
  },
  {
    id: 'potato-egg-pan', title: '土豆鸡蛋煎饼', subtitle: '一口平底炒锅，煎出金黄边缘', category: '轻松一盘',
    minutes: 22, baseServings: 2, equipment: ['炒锅'], image: '/food/egg.svg', color: '#E8C889', tags: ['少洗锅', '不辣'],
    ingredients: [ingredient('土豆', 2, '个'), ingredient('鸡蛋', 3, '个'), oil(), salt()],
    steps: [step('切细土豆丝', '土豆去皮切成细丝，鸡蛋打散，加盐后与土豆丝拌匀。', 7), step('摊成薄饼', '炒锅加油，均匀铺开土豆蛋液，小火加盖煎至底面定型；锅小就分批煎，并相应增加时间。', 7), step('翻面煎熟', '用铲子分成小块后翻面，继续小火煎；确认土豆软熟、蛋液完全凝固再出锅。', 8)],
  },
  {
    id: 'tofu-mushroom-stew', title: '菌菇豆腐煲', subtitle: '鲜味留在汤里，配饭也合适', category: '暖心煲',
    minutes: 20, baseServings: 2, equipment: ['煮锅'], image: '/food/tofu.svg', color: '#DED2B9', tags: ['少洗锅', '素食', '不辣'],
    ingredients: [ingredient('豆腐', 400, '克'), ingredient('菌菇', 200, '克'), oil(), salt(), soy(), water(350)],
    steps: [step('处理豆腐菌菇', '豆腐切块，菌菇去除不食用部分，洗净切片。', 5), step('炒香菌菇', '煮锅加油，下菌菇翻炒至变软出水。', 4), step('小火炖煮', '加水、生抽和豆腐，煮沸后小火煮至菌菇和豆腐全熟，加盐调味。', 11)],
  },
  {
    id: 'tomato-tofu-soup', title: '番茄豆腐汤', subtitle: '食材简单，酸香清爽', category: '暖心煲',
    minutes: 16, baseServings: 2, equipment: ['煮锅'], image: '/food/tofu.svg', color: '#EBC4B2', tags: ['少洗锅', '素食', '不辣'],
    ingredients: [ingredient('番茄', 2, '个'), ingredient('豆腐', 300, '克'), oil(), salt(), water(600)],
    steps: [step('切好食材', '番茄洗净切块，豆腐切成小方块。', 4), step('炒软番茄', '煮锅加油，下番茄翻炒至变软。', 4), step('煮汤', '倒入水煮沸，放豆腐，小火煮透，加盐后盛出。', 8)],
  },
  {
    id: 'chicken-potato-stew', title: '土豆焖鸡', subtitle: '土豆吸满汤汁，踏实的一锅菜', category: '暖心煲',
    minutes: 35, baseServings: 2, equipment: ['炒锅'], image: '/food/chicken.svg', color: '#CBAC85', tags: ['少洗锅', '不辣'],
    ingredients: [ingredient('鸡肉', 300, '克'), ingredient('土豆', 2, '个'), oil(), salt(), soy(), water(350)],
    steps: [step('分开处理生熟', '土豆去皮切小块；鸡肉切大小相近的小块，处理生肉后清洗手和用具。', 8), step('炒鸡肉', '炒锅加油，下鸡肉翻炒至表面变色，加入生抽。', 5), step('焖煮', '加入土豆和水，煮沸后盖锅小火焖煮，期间翻动并留意水量。', 18), step('检查熟度', '确认鸡肉中心熟透、土豆软熟后加盐，开盖略收汁；仍未熟透则继续煮。', 4)],
  },
  {
    id: 'chicken-mushroom-rice', title: '香菇鸡肉焖饭', subtitle: '把米和菜一起交给电饭煲', category: '一锅饭',
    minutes: 50, baseServings: 2, equipment: ['电饭煲'], image: '/food/rice.svg', color: '#CDB58D', tags: ['少洗锅', '不辣'],
    ingredients: [ingredient('大米', 180, '克'), ingredient('鸡肉', 250, '克'), ingredient('菌菇', 150, '克'), oil(), salt(), soy(), water(250)],
    steps: [step('淘米备料', '大米淘洗放入内胆；菌菇洗净切片，鸡肉切成约 2 厘米的小块，分开处理生肉用具。', 8), step('加入调味', '鸡肉拌生抽、盐和油，铺在米和菌菇上；水量参考所用米和电饭煲刻度调整。', 4), step('启动煮饭', '按电饭煲标准煮饭程序煮至完成，实际时间以设备为准。', 35), step('检查后拌匀', '开盖确认米饭熟透，鸡肉中心也已熟透再拌匀；若未熟透，继续加热至全熟。', 3)],
  },
  {
    id: 'mushroom-noodle-soup', title: '菌菇青菜汤面', subtitle: '一锅清汤，热腾腾地端上桌', category: '暖心面',
    minutes: 18, baseServings: 2, equipment: ['煮锅'], image: '/food/noodle.svg', color: '#BDD0AD', tags: ['少洗锅', '素食', '不辣'],
    ingredients: [ingredient('面条', 180, '克'), ingredient('菌菇', 200, '克'), ingredient('青菜', 200, '克'), oil(), salt(), soy(), water(1000)],
    steps: [step('清洗切配', '青菜洗净，菌菇去除不食用部分后洗净切片。', 5), step('煮菌菇汤', '煮锅加油翻炒菌菇，加水煮沸，再继续煮至菌菇熟透。', 6), step('煮面和青菜', '加入面条按包装时间煮熟，快出锅时加入青菜煮熟，加生抽和盐调味。', 7)],
  },
  {
    id: 'cabbage-tofu-stew', title: '白菜炖豆腐', subtitle: '白菜甜味融进柔软豆腐', category: '暖心煲',
    minutes: 22, baseServings: 2, equipment: ['煮锅'], image: '/food/tofu.svg', color: '#CDD5B3', tags: ['少洗锅', '素食', '不辣'],
    ingredients: [ingredient('白菜', 300, '克'), ingredient('豆腐', 400, '克'), oil(), salt(), soy(), water(350)],
    steps: [step('清洗切块', '白菜洗净，把菜帮和菜叶分开放，豆腐切块。', 5), step('先煮菜帮', '煮锅加油炒菜帮，加入水煮沸。', 5), step('放入豆腐', '加豆腐、生抽和菜叶，小火炖至白菜软、豆腐热透，加盐调味。', 12)],
  },
  {
    id: 'pepper-potato-stir-fry', title: '青椒土豆丝', subtitle: '清脆下饭的一盘家常菜', category: '轻松一盘',
    minutes: 18, baseServings: 2, equipment: ['炒锅'], image: '/food/vegetable.svg', color: '#B7C99A', tags: ['少洗锅', '素食'],
    ingredients: [ingredient('土豆', 2, '个'), ingredient('青椒', 1, '个'), oil(), salt(), ingredient('米醋', 5, '毫升', true)],
    steps: [step('切丝', '土豆去皮切细丝后用水冲去表面淀粉，沥干；青椒去籽切丝。', 7), step('炒土豆', '炒锅加油，下土豆丝翻炒；太干时沿锅边加少量水。', 6), step('加青椒调味', '加入青椒、盐和米醋，炒至土豆与青椒都断生熟透。', 5)],
  },
  {
    id: 'microwave-egg', title: '微波炉嫩蛋羹', subtitle: '不必开火，也能做一碗蒸蛋', category: '轻松一盘',
    minutes: 12, baseServings: 2, equipment: ['微波炉'], image: '/food/egg.svg', color: '#EDDCAC', tags: ['少洗锅', '不辣', '少油'],
    ingredients: [ingredient('鸡蛋', 3, '个'), water(220), salt(), ingredient('生抽', 5, '毫升', true)],
    steps: [step('打散鸡蛋', '鸡蛋去壳打入可用于微波炉的宽口碗，充分搅散，加入水和盐搅匀。', 4), step('分段加热', '盖上可用于微波炉且留有排气口的盖子，中低火分段加热，每隔一段时间检查凝固情况；不放金属或带壳整蛋。', 6), step('确认熟透', '待中心蛋液也完全凝固后静置片刻，小心蒸汽，淋生抽；具体火力与时间按设备调整。', 2)],
  },
  {
    id: 'airfryer-chicken', title: '黑椒烤鸡块', subtitle: '简单调味，交给空气炸锅', category: '轻松一盘',
    minutes: 28, baseServings: 2, equipment: ['空气炸锅'], image: '/food/chicken.svg', color: '#CDA879', tags: ['少洗锅', '不辣'],
    ingredients: [ingredient('鸡肉', 350, '克'), ingredient('食用油', 5, '毫升', true), salt(), ingredient('黑胡椒', 1, '克', true)],
    steps: [step('切块调味', '鸡肉切成大小和厚度相近的小块，拌油、盐和黑胡椒；处理生肉后清洗手和用具。', 6), step('铺开烘烤', '按设备说明预热，将鸡肉单层铺开，参考 180℃ 烤制，中途翻面。', 18), step('检查熟透', '切开较厚的一块检查中心熟度，必要时继续烤至鸡肉完全熟透；时间按大小与设备调整。', 4)],
  },
  {
    id: 'mushroom-egg-pan', title: '菌菇炒鸡蛋', subtitle: '两样主料，炒出一盘鲜香', category: '轻松一盘',
    minutes: 15, baseServings: 2, equipment: ['炒锅'], image: '/food/egg.svg', color: '#D6C1A1', tags: ['少洗锅', '不辣'],
    ingredients: [ingredient('菌菇', 200, '克'), ingredient('鸡蛋', 3, '个'), oil(), salt()],
    steps: [step('处理食材', '菌菇去掉不食用部分，洗净切片；鸡蛋搅散。', 4), step('炒熟菌菇', '锅中放一半油，下菌菇炒软，继续炒至菌菇熟透。', 6), step('合炒鸡蛋', '推开菌菇，加剩余油和蛋液，翻炒至蛋液完全凝固，加盐炒匀。', 5)],
  },
  {
    id: 'tomato-egg-soup', title: '番茄蛋花汤', subtitle: '十几分钟，添一道热汤', category: '暖心煲',
    minutes: 14, baseServings: 2, equipment: ['煮锅'], image: '/food/egg.svg', color: '#E6BAA1', tags: ['少洗锅', '不辣'],
    ingredients: [ingredient('番茄', 2, '个'), ingredient('鸡蛋', 2, '个'), oil(), salt(), water(600)],
    steps: [step('备好番茄蛋液', '番茄洗净切块，鸡蛋充分打散。', 4), step('煮番茄汤', '锅里放油炒软番茄，加水煮沸后继续煮出汤味。', 7), step('加入蛋花', '缓缓淋入蛋液，待蛋花凝固并煮至全熟，加盐即可。', 3)],
  },
  {
    id: 'potato-carrot-rice', title: '土豆胡萝卜焖饭', subtitle: '米饭和蔬菜一起出锅', category: '一锅饭',
    minutes: 50, baseServings: 2, equipment: ['电饭煲'], image: '/food/rice.svg', color: '#DFC193', tags: ['少洗锅', '素食', '不辣'],
    ingredients: [ingredient('大米', 180, '克'), ingredient('土豆', 1, '个'), ingredient('胡萝卜', 1, '根'), oil(), salt(), soy(), water(260)],
    steps: [step('淘米切菜', '大米淘洗放进内胆；土豆和胡萝卜去皮切成小丁。', 8), step('放入内胆', '加入蔬菜、油、生抽和盐，按所用大米及设备刻度调整水量。', 4), step('启动煮饭', '使用电饭煲标准煮饭程序，实际时间以设备为准。', 35), step('检查拌匀', '确认米饭与土豆胡萝卜都熟透，轻轻翻拌后盛出。', 3)],
  },
  {
    id: 'cabbage-stir-fried-noodles', title: '白菜炒面', subtitle: '面条裹上酱汁，白菜留一点脆', category: '暖心面',
    minutes: 22, baseServings: 2, equipment: ['炒锅', '煮锅'], image: '/food/noodle.svg', color: '#D5BF93', tags: ['素食', '不辣'],
    ingredients: [ingredient('面条', 180, '克'), ingredient('白菜', 300, '克'), oil(), salt(), soy(), water(1000)],
    steps: [step('洗菜煮面', '白菜洗净切丝；煮锅烧水，面条按包装说明煮至接近熟，捞出沥干。', 10), step('炒白菜', '炒锅放油，下白菜先炒菜帮再炒菜叶，炒至断生。', 5), step('拌炒面条', '加入面条、生抽和盐翻炒至全熟且热透，太干时加少量煮面水。', 7)],
  },
  {
    id: 'tofu-egg-pan', title: '豆腐抱蛋', subtitle: '软嫩豆腐和鸡蛋，一起煎香', category: '轻松一盘',
    minutes: 18, baseServings: 2, equipment: ['炒锅'], image: '/food/tofu.svg', color: '#E4D1AA', tags: ['少洗锅', '不辣'],
    ingredients: [ingredient('豆腐', 300, '克'), ingredient('鸡蛋', 3, '个'), oil(), soy(), water(30)],
    steps: [step('切豆腐打鸡蛋', '豆腐切小块，沥去表面水分；鸡蛋打散。', 5), step('煎豆腐', '炒锅放油，豆腐单层摆入，中小火煎至表面略上色。', 6), step('倒入蛋液', '倒入蛋液，沿锅边加入水，盖锅小火焖至蛋液中心也完全凝固，淋生抽调味。', 7)],
  },
];

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((recipe) => recipe.id === id);
}
