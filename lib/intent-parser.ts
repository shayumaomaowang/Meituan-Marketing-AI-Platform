export interface RequirementData {
  type: string;
  copywriting: string;
  subTitle?: string;
  mainAsset?: string;
  size: string;
  logo?: string;
  layout: string;
  business: string;
  color: string;
  style?: string;
}

export function parseIntent(prompt: string): Partial<RequirementData> {
  const data: Partial<RequirementData> = {
    type: '大促会场one', // 默认
    size: '750x450',
    layout: '居中构图',
    color: '红色',
    business: '外卖',
    copywriting: '',
    subTitle: ''
  };

  const p = prompt.toLowerCase();
  console.log('🔍 正在解析原始提示词:', prompt);

  // 1. 识别类型 (增强匹配)
  if (p.includes('会员') || (p.includes('分会场') && p.includes('会员'))) {
    data.type = '会员分会场';
  } else if (p.includes('大促') || p.includes('会场') || p.includes('one') || p.includes('分会场')) {
    data.type = '大促会场one';
  }

  // 2. 识别主标题 (增强匹配：支持 文案：xxx, 文案是xxx, 标题：xxx 等)
  const mainCopyMatch = prompt.match(/(?:主标题|标题|文案|内容)(?:是|为)?[:：]\s*([^，。；\n\r]+)/) ||
                        prompt.match(/(?:主标题|标题|文案|内容)(?:是|为)?\s*["'“‘](.+?)["'”’]/);
  
  if (mainCopyMatch) {
    data.copywriting = mainCopyMatch[1].trim();
    console.log('✅ 识别到主标题:', data.copywriting);
  } else {
    // 兜底：尝试抓取引号内容
    const quoteMatch = prompt.match(/["'“‘](.+?)["'”’]/);
    if (quoteMatch) data.copywriting = quoteMatch[1].trim();
  }

  // 3. 识别副标题
  const subCopyMatch = prompt.match(/(?:副标题|小字|副文案)(?:是|为)?[:：]\s*([^刻，。；\n\r]+)/) ||
                       prompt.match(/(?:副标题|小字|副文案)(?:是|为)?\s*["'“‘](.+?)["'”’]/);
  if (subCopyMatch) {
    data.subTitle = subCopyMatch[1].trim();
    console.log('✅ 识别到副标题:', data.subTitle);
  }

  // 4. 识别业务
  const bizMap: Record<string, string> = {
    '外卖': '外卖',
    '医药': '医药',
    '医疗': '医药',
    '美食': '美食',
    '餐饮': '美食',
    '酒店': '酒店',
    '住宿': '酒店',
    '电影': '电影',
    '休闲': '休闲',
    '丽人': '丽人'
  };
  for (const [kw, val] of Object.entries(bizMap)) {
    if (p.includes(kw)) {
      data.business = val;
      console.log('✅ 识别到业务:', val);
      break;
    }
  }

  // 5. 识别颜色
  const colorKeywords = ['红色', '蓝色', '黄色', '绿色', '紫色', '黑色', '白色', '金', '银'];
  for (const kw of colorKeywords) {
    if (p.includes(kw)) {
      data.color = kw;
      console.log('✅ 识别到颜色:', kw);
      break;
    }
  }

  return data;
}