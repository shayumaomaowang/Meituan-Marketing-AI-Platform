/**
 * 在浏览器控制台运行此脚本，诊断 sessionStorage 使用情况
 * 
 * 使用方法：
 * 1. 打开浏览器控制台 (F12)
 * 2. 复制此脚本全部内容
 * 3. 粘贴到控制台并按 Enter
 * 4. 查看诊断结果
 */

console.clear();
console.log('%c🔍 sessionStorage 诊断工具 v1.0', 'font-size:16px;font-weight:bold;color:#00ff00;');
console.log('%c=' * 60, 'font-size:12px;color:#666;');

// 1. 显示所有 sessionStorage 键
console.group('📊 所有 sessionStorage 键:');
const keys = Object.keys(sessionStorage);
console.table(keys.map(key => ({
  '键名': key,
  '大小': `${(sessionStorage.getItem(key)?.length || 0) / 1024}KB`
})));
console.groupEnd();

// 2. 检查 pendingAssets
console.group('📦 pendingAssets (临时仓库):');
const pendingAssetsStr = sessionStorage.getItem('pendingAssets');
if (pendingAssetsStr) {
  try {
    const assets = JSON.parse(pendingAssetsStr);
    console.table(Object.entries(assets).map(([key, value]) => ({
      'Coze字段': key,
      '类型': typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image')) ? '图片' : '文字',
      '内容': typeof value === 'string' ? value.substring(0, 60) + (value.length > 60 ? '...' : '') : String(value),
      '大小(KB)': (JSON.stringify(value).length / 1024).toFixed(2)
    })));
    console.log(`✅ 素材库总大小: ${(pendingAssetsStr.length / 1024).toFixed(2)} KB`);
  } catch (err) {
    console.error('❌ 解析失败:', err);
  }
} else {
  console.log('❌ pendingAssets 不存在（非生成模式）');
}
console.groupEnd();

// 3. 检查所有 temp_elements_* 键
console.group('💾 临时注入元数据 (temp_elements_*):');
const tempKeys = keys.filter(k => k.startsWith('temp_elements_'));
if (tempKeys.length > 0) {
  const tempData = tempKeys.map(key => {
    try {
      const data = JSON.parse(sessionStorage.getItem(key));
      const isNewFormat = !Array.isArray(data) && typeof data === 'object';
      const dataSize = sessionStorage.getItem(key).length / 1024;
      
      return {
        '模板ID': key.replace('temp_elements_', ''),
        '格式': isNewFormat ? '新格式(Map)' : '旧格式(Array)',
        '元素数': isNewFormat ? Object.keys(data).length : data.length,
        '大小(KB)': dataSize.toFixed(2),
        '状态': dataSize > 100 ? '⚠️ 较大' : '✅ 正常'
      };
    } catch (err) {
      return {
        '模板ID': key.replace('temp_elements_', ''),
        '格式': '❌ 解析失败',
        '元素数': 'N/A',
        '大小(KB)': (sessionStorage.getItem(key).length / 1024).toFixed(2),
        '状态': '❌ 错误'
      };
    }
  });
  
  console.table(tempData);
  const totalTempSize = tempData.reduce((sum, row) => {
    const kb = parseFloat(row['大小(KB)']) || 0;
    return sum + kb;
  }, 0);
  console.log(`📊 所有临时数据总大小: ${totalTempSize.toFixed(2)} KB`);
} else {
  console.log('ℹ️ 暂无临时注入数据（未进行生成动效）');
}
console.groupEnd();

// 4. 总存储容量分析
console.group('💽 存储容量分析:');
let totalSize = 0;
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  totalSize += sessionStorage.getItem(key)?.length || 0;
}
const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
const percentUsed = ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1);

console.table({
  '总使用容量': `${totalSizeMB} MB`,
  '浏览器限制': '5-10 MB (通常)',
  '使用百分比': `${percentUsed}%`,
  '状态': percentUsed > 80 ? '⚠️ 已接近上限' : (percentUsed > 50 ? '⚠️ 已使用过半' : '✅ 容量充足')
});
console.groupEnd();

// 5. 快速清理工具
console.group('🛠️ 快速清理工具:');
console.log('%c清理旧的 temp_elements_* 键:', 'color:#ff9800;font-weight:bold;');
console.log('运行此命令: sessionStorage.setItem("__cleanup_flag", "1"); Object.keys(sessionStorage).filter(k => k.startsWith("temp_elements_")).forEach(k => sessionStorage.removeItem(k)); console.log("✅ 清理完成");');

console.log('%c完全清空 sessionStorage:', 'color:#f44336;font-weight:bold;');
console.log('运行此命令: sessionStorage.clear(); console.log("✅ 已清空");');
console.groupEnd();

// 6. 模式检测
console.group('🎯 当前运行模式:');
const urlParams = new URLSearchParams(window.location.search);
const isFromGenerator = urlParams.get('from') === 'generator';
console.table({
  '当前页面': window.location.pathname,
  '是否从生成器导航': isFromGenerator ? '✅ 是' : '❌ 否',
  'URL 参数 (from)': urlParams.get('from') || 'N/A',
  '有效 pendingAssets': pendingAssetsStr ? '✅ 是' : '❌ 否'
});

if (isFromGenerator && !pendingAssetsStr) {
  console.warn('%c⚠️ 检测到异常: from=generator 但无 pendingAssets', 'color:#ff9800;');
}
console.groupEnd();

console.log('%c=' * 60, 'font-size:12px;color:#666;');
console.log('%c✅ 诊断完成！请查看上述结果。', 'font-size:14px;color:#4caf50;font-weight:bold;');