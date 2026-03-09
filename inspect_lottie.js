const fs = require('fs');
const path = require('path');

try {
  const dataPath = path.join(process.cwd(), 'data/templates.json');
  if (!fs.existsSync(dataPath)) {
    console.log('找不到 data/templates.json 文件');
    process.exit(0);
  }
  
  const data = fs.readFileSync(dataPath, 'utf8');
  const templates = JSON.parse(data);

  // 为了避免输出太多，只取第一个模板，或者最近的一个
  // 通常用户是在操作最近的一个
  const template = templates[templates.length - 1]; 

  if (!template) {
    console.log('没有找到模板数据');
    process.exit(0);
  }

  console.log(`=== 模板: ${template.name} (ID: ${template.id}) ===`);
  const lottie = template.originalData;
  if (!lottie || !lottie.layers) {
    console.log('  无 Lottie 数据或图层');
    process.exit(0);
  }

  console.log('  图层信息 (按层级顺序):');
  // Lottie layers 数组通常是渲染顺序，index 越大越在上面（或者反过来，取决于导出设置，通常 ind 是 AE 里的图层编号）
  // 我们按 ind 排序显示，这样更符合 AE 的逻辑
  const sortedLayers = [...lottie.layers].sort((a, b) => (a.ind || 0) - (b.ind || 0));

  sortedLayers.forEach(layer => {
    // ty: 2=Image, 5=Text
    if (layer.ty === 2 || layer.ty === 5) {
      const type = layer.ty === 2 ? '图片' : '文字';
      const name = layer.nm || '未命名图层';
      const index = layer.ind;
      const refId = layer.refId || 'N/A';
      
      // 提取锚点 (Anchor Point)
      let anchor = '未定义';
      if (layer.ks && layer.ks.a) {
        if (typeof layer.ks.a.k[0] === 'number') {
            anchor = `[${layer.ks.a.k.map(n => Math.round(n)).join(', ')}]`;
        } else {
            anchor = '关键帧动画';
        }
      }

      // 提取位置 (Position)
      let position = '未定义';
      if (layer.ks && layer.ks.p) {
        // 位置可能是关键帧，也可能是静态值
        const p = layer.ks.p.k;
        if (Array.isArray(p) && typeof p[0] === 'number') {
           position = `[${p.map(n => Math.round(n)).join(', ')}]`;
        } else {
           position = '关键帧动画';
        }
      }
      
      // 提取缩放 (Scale)
      let scale = '未定义';
      if (layer.ks && layer.ks.s) {
         const s = layer.ks.s.k;
         if (Array.isArray(s) && typeof s[0] === 'number') {
            scale = `[${s.map(n => Math.round(n)).join(', ')}]`;
         } else {
            scale = '关键帧动画';
         }
      }

      console.log(`  图层 ${index}: ${name} (${type})`);
      console.log(`    RefID: ${refId}`);
      console.log(`    锚点 (A): ${anchor}`);
      console.log(`    位置 (P): ${position}`);
      console.log(`    缩放 (S): ${scale}`);
      console.log('---');
    }
  });

} catch (err) {
  console.error('读取或解析失败:', err.message);
}