import { LottieJSON, LottieLayer, EditableElement } from './lottie-utils';

// 🛡️ 增强版：计算有效像素面积（带自动代理重试）
export const calculateEffectiveArea = (imageSrc: string): Promise<number> => {
  // 如果在服务端运行，直接返回 0
  if (typeof window === 'undefined') return Promise.resolve(0);

  return new Promise((resolve) => {
    const tryLoad = (src: string, isRetry: boolean) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // 尝试请求跨域权限
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          // 极罕见情况：无法创建 Context，降级为矩形面积
          resolve(img.width * img.height);
          return;
        }

        ctx.drawImage(img, 0, 0);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let nonTransparentPixels = 0;
          
          // 遍历像素，统计 Alpha > 10 的点 (忽略极度透明的杂点)
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 10) { 
              nonTransparentPixels++;
            }
          }
          
          console.log(`📊 [像素分析] ${isRetry ? '(代理模式)' : '(直连模式)'} 尺寸:${img.width}x${img.height} 有效占比:${Math.round(nonTransparentPixels/(data.length/4)*100)}%`);
          resolve(nonTransparentPixels);
        } catch (e) {
          // 捕获 SecurityError (跨域限制)
          if (!isRetry && src.startsWith('http')) {
             console.log('🔒 [像素分析] 直连遇跨域限制，自动切换代理重试...');
             tryLoad(`/api/proxy-image?url=${encodeURIComponent(imageSrc)}`, true);
          } else {
             console.warn('⚠️ [像素分析] 即使通过代理也无法读取像素 (可能是图片格式问题):', e);
             // 最后的兜底：返回矩形面积，保证流程不中断
             resolve(img.width * img.height);
          }
        }
      };

      img.onerror = () => {
        if (!isRetry && src.startsWith('http')) {
           console.log('❌ [像素分析] 直连加载失败，自动切换代理重试...');
           tryLoad(`/api/proxy-image?url=${encodeURIComponent(imageSrc)}`, true);
        } else {
           console.error('❌ [像素分析] 图片完全无法加载');
           resolve(0); 
        }
      };

      img.src = src;
    };

    // 启动首次尝试
    tryLoad(imageSrc, false);
  });
};

export function parseLottie(animationData: LottieJSON): EditableElement[] {
  const elements: EditableElement[] = [];
  const processedAssetIds = new Set<string>(); // 用于图片去重：按 Asset ID 聚合

  if (animationData.layers && animationData.assets) {
    animationData.layers.forEach((layer) => {
      // 处理图片图层（ty === 2 表示图片，refId 指向 assets 中的图片）
      if (layer.ty === 2 && layer.refId) {
        // 核心修改：按 Asset ID 去重
        // 如果多个图层引用同一个 Asset，只生成一个可编辑元素，修改它会影响所有引用它的图层
        if (!processedAssetIds.has(layer.refId)) {
          const asset = animationData.assets.find(a => a.id === layer.refId);
          // 确保是图片资源（有 p 属性且没有 layers 属性，排除预合成）
          if (asset && asset.p && !asset.layers) {
            const fullPath = (asset.u || '') + asset.p;
            
            elements.push({
              id: layer.refId,  // 使用 Asset ID 作为唯一标识
              type: 'image',
              name: `${layer.nm || 'Image Asset'} (${layer.refId})`,
              currentValue: fullPath,
              originalValue: fullPath,
              isEditable: false,
              width: asset.w,
              height: asset.h,
              originalWidth: asset.w,
              originalHeight: asset.h,
              // referenceId: layer.refId // 不再需要，id 本身就是 refId
            });
            processedAssetIds.add(layer.refId);
          }
        }
      }
      // 处理文字图层
      else if (layer.ty === 5 && layer.t?.d?.k?.[0]?.s?.t) {
        const layerId = layer.ind?.toString() || `layer_${Math.random()}`;
        
        // 检查是否已经处理过这个 ID（避免重复）
        if (!elements.find(e => e.id === layerId)) {
          elements.push({
            id: layerId,
            type: 'text',
            name: layer.nm || 'Text Layer',
            currentValue: layer.t.d.k[0].s.t,
            originalValue: layer.t.d.k[0].s.t,
            isEditable: false,
          });
        }
      }
    });
  }

  // 4. 日志输出，用于调试
  console.log('🔍 [parseLottie] 解析完成 (按 Asset 聚合):', {
    totalLayers: animationData.layers?.length || 0,
    imageElements: elements.filter(e => e.type === 'image').length,
    textElements: elements.filter(e => e.type === 'text').length,
    totalElements: elements.length
  });

  return elements;
}

// 辅助函数：根据图层名称解析吸附位置
// 例如："装饰A_左上角" -> [0, 0]
// 例如："装饰B_左侧中间" -> [0, 0.5]
// 例如："装饰C_右下角" -> [1, 1]
function parseAdherencePosition(layerName: string | undefined): [number, number] {
  if (!layerName) return [0, 0]; // 默认左上角
  
  const name = layerName.toLowerCase();
  let x = 0; // 水平位置: 0=左, 0.5=中, 1=右
  let y = 0; // 竖直位置: 0=上, 0.5=中, 1=下

  // 解析水平位置
  if (name.includes('左')) {
    x = 0;
  } else if (name.includes('中') || name.includes('中间') || name.includes('中心')) {
    x = 0.5;
  } else if (name.includes('右')) {
    x = 1;
  }

  // 解析竖直位置
  if (name.includes('上') || name.includes('顶')) {
    y = 0;
  } else if (name.includes('中') || name.includes('中间') || name.includes('中心')) {
    y = 0.5;
  } else if (name.includes('下') || name.includes('底')) {
    y = 1;
  }

  return [x, y];
}

// 辅助函数：根据原文本的行数，自动将新文本切分为多行
function adaptTextLines(original: string, current: string): string {
  // 如果新文本已经包含换行，直接返回（尊重用户/AI的决定）
  if (current.includes('\r') || current.includes('\n')) return current;
  
  // 检测原文本的换行模式
  // Lottie 通常使用 \r，但也可能解析出 \n
  const lines = original.split(/\r|\n/);
  if (lines.length <= 1) return current;
  
  // 原文本有多行，尝试将新文本切分为相同行数
  const targetLines = lines.length;
  const totalLength = current.length;
  
  // 如果新文本太短，不足以切分，就不切分
  if (totalLength < targetLines) return current;

  const charsPerLine = Math.ceil(totalLength / targetLines);
  
  let result = '';
  for (let i = 0; i < targetLines; i++) {
    const start = i * charsPerLine;
    // 确保最后一行包含剩余所有字符
    const end = (i === targetLines - 1) ? totalLength : start + charsPerLine;
    
    // 防止越界
    if (start >= totalLength) break;
    
    const segment = current.substring(start, end);
    
    if (i > 0) result += '\r';
    result += segment;
  }
  
  return result;
}

export function updateLottieData(
  originalData: LottieJSON, 
  elements: EditableElement[]
): LottieJSON {
  console.log('🔍 [updateLottie] 开始处理 elements:', elements.map(e => `${e.name}(${e.id})`));
  const newData = JSON.parse(JSON.stringify(originalData));

  // 辅助函数：更新 Asset 内容
  const updateAssetContent = (asset: any, el: EditableElement) => {
    const isBase64 = el.currentValue.startsWith('data:image');
    
    if (isBase64) {
      // 对于 Base64 图片，需要分解为路径和 URL
      // Lottie 格式: asset.p = base64 数据, asset.u = '', asset.e = 0
      asset.p = el.currentValue;
      asset.u = '';
      asset.e = 0;
      console.log(`✅ [updateAssetContent] Base64 图片已更新: ${el.id}, 大小: ${(el.currentValue.length / 1024).toFixed(2)} KB`);
    } else {
      // 对于 URL，分解为路径和文件夹
      asset.p = el.currentValue;
      asset.u = '';
      asset.e = 1;
      console.log(`✅ [updateAssetContent] URL 图片已更新: ${el.id}, ${el.currentValue.substring(0, 50)}...`);
    }
    
    // 核心修改：支持新素材尺寸适配
    // 1. 新素材图层完全继承对应原图层的锚点（a）和位置（p），不做任何修改（Lottie默认行为）
    // 2. 每个新素材按原图层尺寸做等比缩放
    // 3. 仅修改 Lottie 图层的缩放属性（sc），其余属性保持不变
    
    if (el.width && el.height && el.originalWidth && el.originalHeight) {
      // 只有当尺寸发生变化时才执行缩放逻辑
      if (el.width !== el.originalWidth || el.height !== el.originalHeight) {
        console.log(`📐 [updateLottie] 检测到图片尺寸变化: ${el.id}`, {
          original: `${el.originalWidth}x${el.originalHeight}`,
          new: `${el.width}x${el.height}`,
          originalEffectiveArea: el.originalEffectiveArea,
          newEffectiveArea: el.effectiveArea
        });

        // 更新 Asset 尺寸为新图片尺寸
        asset.w = el.width;
        asset.h = el.height;

        // 计算缩放比例
        let scaleFactor = 1;

        // 策略：基于有效像素面积匹配 (Visual Area Matching)
        // 如果有有效面积数据，优先使用面积匹配
        if (el.originalEffectiveArea && el.effectiveArea && el.originalEffectiveArea > 0 && el.effectiveArea > 0) {
           // 目标：新面积 * scale^2 = 原面积
           // scale = sqrt(原面积 / 新面积)
           scaleFactor = Math.sqrt(el.originalEffectiveArea / el.effectiveArea);
           console.log(`   🚀 启用智能面积匹配: 原面积${el.originalEffectiveArea} / 新面积${el.effectiveArea} -> 缩放${scaleFactor.toFixed(2)}`);
        } 
        // 降级策略：如果没有面积数据，回退到基于主轴的匹配
        else {
            // 竖版素材用「原图层高度 / 新素材高度」算缩放比，横版用宽度比
            const isVertical = el.originalHeight > el.originalWidth;
            if (isVertical) {
              scaleFactor = el.originalHeight / el.height;
            } else {
              scaleFactor = el.originalWidth / el.width;
            }
            console.warn(`⚠️ [${el.id}] 无法获取有效面积数据 (原:${el.originalEffectiveArea}, 新:${el.effectiveArea})，已回退到主轴匹配模式。这可能导致宽高比差异巨大的素材显示比例失调。`);
            console.log(`   ⚠️ 无面积数据，回退到主轴匹配: ${scaleFactor.toFixed(2)} (${isVertical ? '竖版' : '横版'})`);
        }

        // 叠加用户手动设置的缩放比例
        if (el.scale) {
          scaleFactor *= el.scale;
        }

          // 🛡️ 限制最大高度：防止细长物体（如酒瓶）为了补足面积而超出画布
          // 策略：不再依赖复杂的图层层级预测，而是直接基于“原图在画面中是合适的”这一假设
          // 如果新物体的高度（经过缩放后）显著超过了原物体的高度，就强制缩小
          
          // 1. 计算新物体相对于原物体的“视觉高度比”
          // visualHeightRatio = (新高度 * 缩放因子) / 原高度
          const visualHeightRatio = (el.height * scaleFactor) / el.originalHeight;
          
          // 2. 设定允许的最大高度膨胀系数
          // 统一规则：所有物体最多允许比原图高 10% (1.1x)
          // 这是一个硬性上限，防止物体顶出画布
          const maxAllowedHeightRatio = 1.1;
          
          console.log(`   📏 [高度检查] 原高:${el.originalHeight}, 新高:${el.height}, 当前缩放:${scaleFactor.toFixed(3)} -> 视觉高度比:${visualHeightRatio.toFixed(2)} (上限:${maxAllowedHeightRatio})`);

          if (visualHeightRatio > maxAllowedHeightRatio) {
            // 需要缩小的比例
            const reductionRatio = maxAllowedHeightRatio / visualHeightRatio;
            console.log(`   ⚠️ [尺寸限制] 高度膨胀过多! 强制缩小: ${scaleFactor.toFixed(2)} -> ${(scaleFactor * reductionRatio).toFixed(2)} (缩减比: ${reductionRatio.toFixed(4)})`);
            scaleFactor *= reductionRatio;
          }

        console.log(`   最终缩放因子: ${scaleFactor.toFixed(4)} (手动缩放: ${el.scale || 1})`);

        // 计算 Asset 尺寸变化比例（用于调整锚点）
        const assetScaleX = el.width / el.originalWidth;
        const assetScaleY = el.height / el.originalHeight;

        // 查找所有引用此 Asset 的图层，并更新其缩放属性和锚点
        const layers = newData.layers.filter((l: LottieLayer) => l.refId === asset.id);
        layers.forEach((layer: LottieLayer) => {
          if (layer.ks) {
            // 🔑 关键：在更新 Scale 之前，先记录原始值
            let originalParentScale = [100, 100, 100];
            if (layer.ks.s && Array.isArray(layer.ks.s.k)) {
              if (typeof layer.ks.s.k[0] === 'number') {
                originalParentScale = [layer.ks.s.k[0], layer.ks.s.k[1], layer.ks.s.k[2]];
              } else if (layer.ks.s.k[0] && layer.ks.s.k[0].s) {
                originalParentScale = [...layer.ks.s.k[0].s];
              }
            }

            // 1. 更新缩放 (Scale)
            if (layer.ks.s) {
              const scaleProp = layer.ks.s;
              
              // 辅助函数：缩放数组 [x, y, z]
              const scaleArray = (arr: number[]) => {
                return [
                  arr[0] * scaleFactor,
                  arr[1] * scaleFactor,
                  arr[2] // Z轴通常保持不变
                ];
              };

              if (Array.isArray(scaleProp.k)) {
                // 检查是静态值还是关键帧
                if (typeof scaleProp.k[0] === 'number') {
                  // 静态值: [100, 100, 100]
                  scaleProp.k = scaleArray(scaleProp.k);
                } else {
                  // 关键帧数组
                  scaleProp.k.forEach((kf: any) => {
                    if (kf.s && Array.isArray(kf.s)) kf.s = scaleArray(kf.s);
                    if (kf.e && Array.isArray(kf.e)) kf.e = scaleArray(kf.e);
                  });
                }
              }
            }

            // 2. 更新锚点 (Anchor Point) -> 强制居中
            // 用户需求：新素材的锚点要定在中心的位置
            if (layer.ks.a) {
              const anchorProp = layer.ks.a;
              const newAnchorX = el.width / 2;
              const newAnchorY = el.height / 2;

              // 为了防止锚点改变导致图片位置跳变，我们需要补偿位置 (Position)
              // 原理：P_new = P_old + (A_new - A_old_projected) * Scale
              // (假设旋转为0，这是一个简化的补偿策略，能满足大多数静态展示需求)

              // 2.1 获取旧锚点数值（用于计算偏移）
              let oldAnchorX = 0;
              let oldAnchorY = 0;
              
              // 尝试获取静态值或第一帧作为参考
              if (Array.isArray(anchorProp.k)) {
                if (typeof anchorProp.k[0] === 'number') {
                  oldAnchorX = anchorProp.k[0];
                  oldAnchorY = anchorProp.k[1];
                } else if (anchorProp.k[0] && anchorProp.k[0].s) {
                  oldAnchorX = anchorProp.k[0].s[0];
                  oldAnchorY = anchorProp.k[0].s[1];
                }
              }

              // 2.2 计算旧锚点在新图尺寸下的投影位置 (按原比例)
              const projectedOldAnchorX = oldAnchorX * assetScaleX;
              const projectedOldAnchorY = oldAnchorY * assetScaleY;

              // 2.3 计算锚点偏移量
              const diffX = newAnchorX - projectedOldAnchorX;
              const diffY = newAnchorY - projectedOldAnchorY;

              // 2.4 更新锚点为中心
              if (Array.isArray(anchorProp.k)) {
                if (typeof anchorProp.k[0] === 'number') {
                  // 静态值
                  anchorProp.k = [newAnchorX, newAnchorY, anchorProp.k[2]];
                } else {
                  // 关键帧
                  anchorProp.k.forEach((kf: any) => {
                    if (kf.s && Array.isArray(kf.s)) kf.s = [newAnchorX, newAnchorY, kf.s[2]];
                    if (kf.e && Array.isArray(kf.e)) kf.e = [newAnchorX, newAnchorY, kf.e[2]];
                  });
                }
              }

              // 3. 补偿位置 (Position)
              // 获取当前图层的缩放比例 (Scale) - 注意：layer.ks.s 已经被上面的代码更新过了
              let currentScaleX = 1;
              let currentScaleY = 1;

              if (layer.ks.s && Array.isArray(layer.ks.s.k)) {
                if (typeof layer.ks.s.k[0] === 'number') {
                  currentScaleX = layer.ks.s.k[0] / 100;
                  currentScaleY = layer.ks.s.k[1] / 100;
                } else if (layer.ks.s.k[0] && layer.ks.s.k[0].s) {
                  currentScaleX = layer.ks.s.k[0].s[0] / 100;
                  currentScaleY = layer.ks.s.k[0].s[1] / 100;
                }
              }

              const moveX = diffX * currentScaleX;
              const moveY = diffY * currentScaleY;

              if (layer.ks.p) {
                const posProp = layer.ks.p;
                if (Array.isArray(posProp.k)) {
                  if (typeof posProp.k[0] === 'number') {
                    // 静态值
                    posProp.k[0] += moveX;
                    posProp.k[1] += moveY;
                  } else {
                    // 关键帧
                    posProp.k.forEach((kf: any) => {
                      if (kf.s && Array.isArray(kf.s)) {
                        kf.s[0] += moveX;
                        kf.s[1] += moveY;
                      }
                      if (kf.e && Array.isArray(kf.e)) {
                        kf.e[0] += moveX;
                        kf.e[1] += moveY;
                      }
                    });
                  }
                }
              }
              
              console.log(`   ⚓️ [锚点重置] 强制居中: (${newAnchorX.toFixed(1)}, ${newAnchorY.toFixed(1)}), 位置补偿: (${moveX.toFixed(1)}, ${moveY.toFixed(1)})`);

              // 4. 装饰物缩放补偿逻辑 (Scale Compensation) 和位置吸附
              // 查找所有以当前图层为父级的子图层 (装饰物)
              const childLayers = newData.layers.filter((l: LottieLayer) => l.parent === layer.ind);

              childLayers.forEach((child: LottieLayer) => {
                if (child.ks && child.ks.s) {
                   // 🔑 核心逻辑：基于真实的原始父层 Scale 进行补偿
                   // 不再假设原始父层是 100%，而是读取真实的原始值

                   // 获取父层（主体）的新缩放值
                   let newParentScale = [100, 100, 100];
                   if (layer.ks.s && Array.isArray(layer.ks.s.k)) {
                      if (typeof layer.ks.s.k[0] === 'number') {
                         newParentScale = [layer.ks.s.k[0], layer.ks.s.k[1], layer.ks.s.k[2]];
                      } else if (layer.ks.s.k[0] && layer.ks.s.k[0].s) {
                         newParentScale = [...layer.ks.s.k[0].s];
                      }
                   }

                   // 使用之前保存的原始父层 Scale
                   // originalParentScale 是在更新主体 Scale 之前保存的值

                   // 计算父层缩放的变化倍数（X 轴）
                   // 修复：直接使用 scaleFactor，避免因 originalParentScale 为 0 导致 NaN
                   const scaleRatio = scaleFactor;

                   // 补偿因子 = 1 / scaleRatio
                   // 这样：父层缩放 × 补偿因子 ≈ 原始父层缩放
                   // 增加安全检查，防止 scaleRatio 为 0
                   const compensationFactor = (scaleRatio && scaleRatio !== 0) ? (1 / scaleRatio) : 1;

                   // 应用补偿到装饰物的缩放属性
                   if (child.ks.s && Array.isArray(child.ks.s.k)) {
                      const applyScaleCompensation = (scaleValue: number[]) => {
                         return [
                            scaleValue[0] * compensationFactor,
                            scaleValue[1] * compensationFactor,
                            scaleValue[2] // Z 轴保持不变
                         ];
                      };

                      if (typeof child.ks.s.k[0] === 'number') {
                         // 静态缩放值
                         child.ks.s.k = applyScaleCompensation(child.ks.s.k);
                      } else {
                         // 关键帧缩放动画 - 为每一帧应用补偿
                         child.ks.s.k.forEach((kf: any) => {
                            if (kf.s && Array.isArray(kf.s)) {
                               kf.s = applyScaleCompensation(kf.s);
                            }
                            if (kf.e && Array.isArray(kf.e)) {
                               kf.e = applyScaleCompensation(kf.e);
                            }
                         });
                      }
                   }

                   console.log(`   🔗 [装饰缩放补偿] 子图层 ${child.nm || 'Unknown'} (Parent:${layer.ind}) 原始:${originalParentScale[0]}%→新:${newParentScale[0]}%，变化比:${scaleRatio.toFixed(2)}x，补偿因子:${compensationFactor.toFixed(4)}`);
                }

                // 🎨 新增：根据图层名称智能吸附位置
                if (child.ks && child.ks.p) {
                   // 根据图层名称解析目标位置（0-1 的相对坐标）
                   const [posX, posY] = parseAdherencePosition(child.nm);
                   
                   // 将相对坐标转换为绝对坐标
                   // 关键修改：使用 Math.max(新宽度, 原宽度) 作为布局参考宽度
                   // 理由：如果新物体（如酒瓶）特别窄，直接用它的宽度会导致装饰物向中间塌陷
                   // 使用原宽度作为保底，可以确保装饰物至少保持原来的开张度
                   const referenceWidth = Math.max(el.width || 0, el.originalWidth || 0);
                   const referenceHeight = el.height || 100; // 高度还是跟随新物体，因为要吸附在物体上下
                   
                   // 计算装饰物的锚点位置
                   let childAnchorX = (child.ks.a && Array.isArray(child.ks.a.k)) ? child.ks.a.k[0] : 0;
                   let childAnchorY = (child.ks.a && Array.isArray(child.ks.a.k)) ? child.ks.a.k[1] : 0;
                   
                   // ↔️ 针对瘦高物体的特殊处理：装饰物向外扩散
                   // 理由：瘦高物体左右两边会很空，装饰需要往外走一点，平衡视觉
                   let spreadFactor = 1.0;
                   const aspectRatio = el.height / el.width;
                   if (aspectRatio > 1.5) {
                       spreadFactor = 1.2; // 向外扩散 20%
                       console.log(`   ↔️ [装饰布局] 检测到瘦高物体 (AR:${aspectRatio.toFixed(2)})，装饰物 ${child.nm} 向外扩散 20%`);
                   }

                   // 计算目标位置
                   // 逻辑：基于中心点向外扩散
                   // 注意：中心点依然是新物体的中心 (el.width / 2)，但扩散距离基于 referenceWidth
                   const centerX = (el.width || 100) / 2;
                   const distFromCenter = (posX - 0.5) * referenceWidth; // 使用参考宽度计算距离
                   const newDistFromCenter = distFromCenter * spreadFactor;
                   
                   const targetPosX = (centerX + newDistFromCenter) - childAnchorX;
                   const targetPosY = (posY * referenceHeight) - childAnchorY;
                   const targetPos = [targetPosX, targetPosY, 0];

                   // 应用位置吸附
                   if (Array.isArray(child.ks.p.k)) {
                      if (typeof child.ks.p.k[0] === 'number') {
                         // 静态值
                         child.ks.p.k = targetPos;
                      } else {
                         // 关键帧 - 移除位移动画，强制固定
                         child.ks.p.k.forEach((kf: any) => {
                            if (kf.s && Array.isArray(kf.s)) kf.s = targetPos;
                            if (kf.e && Array.isArray(kf.e)) kf.e = targetPos;
                         });
                      }
                   }

                   const positionName = child.nm && child.nm.includes('_') ? child.nm.split('_')[1] : '默认(左上角)';
                   console.log(`   📍 [装饰吸附] 子图层 ${child.nm || 'Unknown'} (Parent:${layer.ind}) 已吸附至: ${positionName} 位置 [${targetPosX.toFixed(1)}, ${targetPosY.toFixed(1)}]`);
                }
              });
            }
          }
        });
      }
    }
  };

  // 🔍 记录处理前的 assets 数量（用于调试）
  const originalAssetsCount = newData.assets?.length || 0;
  console.log(`📊 [updateLottie] 处理前 assets 数量: ${originalAssetsCount}`);

  // 1. 处理图片替换
  elements.forEach((el) => {
    if (el.type === 'image') {
      // 必须检查 currentValue 是否存在且不同于原始值
      if (!el.currentValue) {
        console.warn(`⚠️ [updateLottie] 图片元素 ${el.id} 没有 currentValue，跳过`);
        return;
      }
      
      // 策略 A (新模式)：如果 ID 是 Asset ID，直接更新 Asset
      // 这意味着所有引用该 Asset 的图层都会被更新（解决了"只替换一帧"的问题）
      // 添加更宽松的匹配：同时尝试字符串和数字类型
      let directAsset = newData.assets.find((a: any) => a.id === el.id || a.id === Number(el.id));
      
      // 如果还没找到，打印日志用于调试
      if (!directAsset) {
        console.log(`🔍 [updateLottie] 未找到 Asset，el.id: "${el.id}", 类型: ${typeof el.id}, 可用 assets:`, newData.assets?.map((a: any) => `${a.id}(${typeof a.id})`));
      }
      
      if (directAsset) {
        updateAssetContent(directAsset, el);
        console.log(`🔧 [updateLottie] 更新 Asset: ${el.id}, currentValue: ${el.currentValue?.substring(0, 50)}...`);
      } 
      // 策略 B (兼容模式)：如果 ID 是 Layer Index (旧模版数据)
      else {
        // 尝试通过 Layer 查找
        const layer = newData.layers.find((l: LottieLayer) => l.ind?.toString() === el.id);
        
        if (layer && layer.refId) {
          // 检查是否有其他 Layer 也引用这个 Asset
          const refCount = newData.layers.filter((l: LottieLayer) => l.refId === layer.refId).length;
          
          // 如果有多个引用，为了保持旧行为（独立控制），我们需要创建副本
          // 注意：这是为了兼容旧模版。新模版不会走到这里。
          if (refCount > 1) {
            const originalAsset = newData.assets.find((a: any) => a.id === layer.refId);
            if (originalAsset) {
              const newAssetId = `${layer.refId}_layer_${el.id}`;
              // 检查是否已经创建过副本（防止重复创建）
              let newAsset = newData.assets.find((a: any) => a.id === newAssetId);
              
              if (!newAsset) {
                newAsset = {
                  ...JSON.parse(JSON.stringify(originalAsset)),
                  id: newAssetId
                };
                newData.assets.push(newAsset);
                layer.refId = newAssetId; // 让当前 Layer 指向新副本
                console.log(`🔧 [updateLottie] (兼容模式) 为图层 ${el.id} 创建独立资产副本: ${newAssetId}`);
              }
              
              updateAssetContent(newAsset, el);
            }
          } else {
            // 只有一个引用，直接更新原 Asset
            const asset = newData.assets.find((a: any) => a.id === layer.refId);
            if (asset) {
              updateAssetContent(asset, el);
            }
          }
        }
      }
    }
  });

  console.log(`📊 [updateLottie] 处理后 assets 数量: ${newData.assets?.length}, 变化: ${(newData.assets?.length || 0) - originalAssetsCount}`);

  // 2. 智能文字替换逻辑
  const mainTextLayers = elements.filter(el => el.cozeField === 'main_text');
  const mainTextElement = mainTextLayers[0];
  
  // 处理所有文字图层（包括非 main_text 的手动修改）
  elements.forEach((el) => {
    if (el.type === 'text' && el.cozeField !== 'main_text') {
      const layer = newData.layers.find((l: LottieLayer) => l.ind?.toString() === el.id);
      if (layer && layer.t?.d?.k?.[0]?.s) {
        const rawOriginal = el.originalValue || "";
        let newValue = el.currentValue;
        
        // 核心逻辑：强制保留原有的空格占位
        const trailingSpaces = rawOriginal.match(/\s+$/);
        const leadingSpaces = rawOriginal.match(/^\s+/);
        
        // 先去掉用户可能误输入的空格，再补回模板必需的空格
        // 注意：这里不再 trim()，而是直接使用 newValue，以保留用户输入的换行符
        // 如果用户输入了换行符，我们希望它能生效
        let processedValue = newValue;
        
        // 只有当用户没有手动输入换行符时，才尝试保留原有的空格逻辑
        if (!newValue.includes('\n') && !newValue.includes('\r')) {
            processedValue = newValue.trim();
            if (leadingSpaces) processedValue = leadingSpaces[0] + processedValue;
            if (trailingSpaces) processedValue = processedValue + trailingSpaces[0];
            
            // 🆕 新增：尝试自动适配原文本的换行结构
            processedValue = adaptTextLines(rawOriginal, processedValue);
        }
        
        // 关键修复：将 \n 转换为 \r，因为 Lottie 文本通常使用 \r 作为换行符
        layer.t.d.k[0].s.t = processedValue.replace(/\n/g, '\r');

        // 🎨 新增：更新文字颜色 (支持全局颜色和富文本局部颜色)
        applyRichTextToLayer(layer, el, newData, processedValue);
      }
    }
  });

  if (mainTextElement && mainTextElement.currentValue) {
    const uniqueValues = new Set(mainTextLayers.map(el => el.currentValue));
    const isReplacementMode = uniqueValues.size === 1;

    const textLayers = newData.layers.filter((l: LottieLayer) => {
      const originalEl = elements.find(e => e.id === l.ind?.toString());
      return originalEl?.cozeField === 'main_text';
    });

    if (textLayers.length > 0) {
      const originalSequence = originalData.originalTextSequence || newData.originalTextSequence;
      const newText = mainTextElement.currentValue;

            if (isReplacementMode && originalSequence && originalSequence.length > 0) 
{
        console.log('🎯 执行精准坑位替换:', newText);
        console.log('📊 原始分段数:', originalSequence.length);
        console.log('📊 原始分段:', originalSequence.map((seg, i) => `[${i}]="${seg}"(${seg.length}字)`).join(' '));
        console.log('📊 文本图层数:', textLayers.length);
        textLayers.forEach((l: any, idx: number) => {
          console.log(`   图层${idx}: nm="${l.nm}" content="${l.t?.d?.k?.[0]?.s?.t || 'EMPTY'}"`);
        });
        
        // 预先计算每个标注块对应的新文字段
        let currentPos = 0;
        const totalOrigLen = originalSequence.join('').length;
        
        const newTextSegments = originalSequence.map((origSeg, idx) => {
          // 根据原块长度占比，决定取新文案的几个字
          const ratio = origSeg.length / totalOrigLen;
          // 修复：确保最后一段包含所有剩余字符
          let numChars;
          if (idx === originalSequence.length - 1) {
            // 最后一段：取剩余的所有字符
            numChars = newText.length - currentPos;
          } else {
            numChars = Math.max(1, Math.round(ratio * newText.length));
          }
          const segment = newText.substring(currentPos, currentPos + numChars);
          console.log(`   段${idx}: 比例=${ratio.toFixed(2)} 原长=${origSeg.length} 新长=${numChars} 内容="${segment}"`);
          currentPos += numChars;
          return segment;
        });

        textLayers.forEach((l: LottieLayer) => {
          const rawContent = l.t?.d?.k?.[0]?.s?.t || "";
          const currentContent = rawContent.trim();
          if (!currentContent) {
            console.log(`   ⚠️ 图层 ${l.nm} 无文字内容，跳过`);
            return;
          }

          const segmentIdx = originalSequence.findIndex(seg => (seg || "").trim() === currentContent);
          console.log(`   🔍 匹配图层: ${l.nm}, 内容="${currentContent}", 匹配结果: ${segmentIdx >= 0 ? `段${segmentIdx}` : '❌未找到'}`);
          
          if (segmentIdx !== -1 && l.t?.d?.k?.[0]?.s) {
            console.log(`   ✅ 用新分段替换: "${newTextSegments[segmentIdx]}"`);
            let replacement = newTextSegments[segmentIdx] || "";
            
            // 保留空格
            const trailingSpaces = rawContent.match(/\s+$/);
            if (trailingSpaces) replacement += trailingSpaces[0];
            const leadingSpaces = rawContent.match(/^\s+/);
            if (leadingSpaces) replacement = leadingSpaces[0] + replacement;
            
            // 🆕 新增：即使是拆分后的片段，如果原片段内部有换行，也尝试适配
            replacement = adaptTextLines(rawContent, replacement);

            l.t.d.k[0].s.t = replacement.replace(/\n/g, '\r');

            // 🎨 新增：更新文字颜色 (main_text)
            // 注意：精准替换模式下，文本被切碎，暂不支持局部变色，只支持全局颜色
            if (mainTextElement.color) {
              const hexToRgb = (hex: string) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? [
                  parseInt(result[1], 16) / 255,
                  parseInt(result[2], 16) / 255,
                  parseInt(result[3], 16) / 255
                ] : null;
              };
              
              const rgbColor = hexToRgb(mainTextElement.color);
              if (rgbColor) {
                l.t.d.k[0].s.fc = rgbColor;
              }
            }
          }
        });
      } else {
        // 预览模式或无语序标注：直接填入
        mainTextLayers.forEach(el => {
          const layer = newData.layers.find((l: LottieLayer) => l.ind?.toString() === el.id);
          if (layer && layer.t?.d?.k?.[0]?.s) {
            // 🆕 新增：自动适配换行
            const rawOriginal = el.originalValue || "";
            let processedValue = el.currentValue;
            if (!processedValue.includes('\n') && !processedValue.includes('\r')) {
               processedValue = adaptTextLines(rawOriginal, processedValue);
            }
            layer.t.d.k[0].s.t = processedValue.replace(/\n/g, '\r');

            // 🎨 新增：更新文字颜色 (main_text fallback)
            // 这里可以支持局部变色，因为是完整文本填入
            applyRichTextToLayer(layer, el, newData, processedValue);
          }
        });
      }
    }
  }

  // 🔍 最终检查：确保 assets 没有被意外扩展
  const finalAssetsCount = newData.assets?.length || 0;
  if (finalAssetsCount > originalAssetsCount + 5) { // 允许最多增加 5 个 assets（兼容模式可能创建副本）
    console.warn(`⚠️ [updateLottie] Assets 数量异常增长: ${originalAssetsCount} -> ${finalAssetsCount}, 增长了 ${finalAssetsCount - originalAssetsCount} 个`);
    console.warn(`📋 新增的 assets:`, newData.assets?.slice(originalAssetsCount).map((a: any) => ({ id: a.id, p: a.p?.substring(0, 30) || 'EMPTY' })));
  } else {
    console.log(`✅ [updateLottie] Assets 数量正常: ${originalAssetsCount} -> ${finalAssetsCount}`);
  }

  // 🔍 最终验证：确保 assets 中的 Base64 数据完整无损
  console.log('📋 [updateLottie] 最终 assets 验证:');
  newData.assets?.forEach((asset: any, idx: number) => {
    if (asset.p?.startsWith('data:image')) {
      const dataLen = asset.p.length;
      const isComplete = dataLen > 100; // Base64 图片数据通常很大
      console.log(`   [${idx}] ${asset.id}: ${isComplete ? '✅' : '⚠️'} ${dataLen} 字符`);
    }
  });

  return newData;
}

export function applyRichTextToLayer(
  layer: LottieLayer, 
  el: EditableElement, 
  newData: LottieJSON, 
  processedValue: string
) {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : null;
  };

  // 1. 优先处理富文本样式 (局部颜色)
  if (el.richText && el.richText.styles.length > 0) {
     console.log(`🎨 [Lottie] 检测到富文本样式，正在执行图层拆分: ${layer.nm} (${el.id})`);
     
      // 不再进行清理，保持原始图层不变
     
     // 1. 隐藏原图层
     if (layer.ks) {
       if (!layer.ks.o) layer.ks.o = { k: 100 };
       layer.ks.o.k = 0; // 透明度设为 0
     }
     
     // 2. 准备基础文本
     const fullText = processedValue;
     
     // 3. 为每个样式段生成一个新图层
     const charStyles = new Array(fullText.length).fill(el.color || '#000000');
     el.richText.styles.forEach(style => {
       for (let i = style.start; i < style.end && i < fullText.length; i++) {
         if (style.color) charStyles[i] = style.color;
       }
     });
     
     const segments: { text: string; color: string; start: number }[] = [];
     if (fullText.length > 0) {
       let currentSegment = { text: fullText[0], color: charStyles[0], start: 0 };
       
       for (let i = 1; i < fullText.length; i++) {
         if (charStyles[i] === currentSegment.color) {
           currentSegment.text += fullText[i];
         } else {
           segments.push(currentSegment);
           currentSegment = { text: fullText[i], color: charStyles[i], start: i };
         }
       }
       segments.push(currentSegment);
     }
     
     // 4. 生成新图层
     segments.forEach((seg, index) => {
       // 创建图层副本
       const newLayer = JSON.parse(JSON.stringify(layer));
       
       // 恢复可见性
       delete newLayer.sc;
       if (newLayer.ks) {
         if (!newLayer.ks.o) newLayer.ks.o = { k: 0 };
         newLayer.ks.o.k = 100;
       }
       
       // 生成唯一 ID
       const maxInd = Math.max(...newData.layers.map((l: any) => l.ind || 0));
       newLayer.ind = maxInd + 1 + index; 
       newLayer.nm = `${layer.nm}_seg_${index}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
       
       let displayText = '';
       for (let i = 0; i < fullText.length; i++) {
         const char = fullText[i];
         if (i >= seg.start && i < seg.start + seg.text.length) {
           displayText += char;
         } else {
           if (char === '\r' || char === '\n') {
             displayText += char;
           } else {
             const charCode = fullText.charCodeAt(i);
             if (charCode > 255) {
               displayText += '\u3000'; 
             } else {
               displayText += ' '; 
             }
           }
         }
       }
       
       console.log(`   🧩 [分色片段 ${index}] 内容: "${displayText.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}" 颜色: ${seg.color}`);

       if (newLayer.t?.d?.k?.[0]?.s) {
         newLayer.t.d.k[0].s.t = displayText.replace(/\n/g, '\r');
         const rgbColor = hexToRgb(seg.color);
         if (rgbColor) {
           newLayer.t.d.k[0].s.fc = rgbColor;
         }
       }
       
       // 将新图层插入到原图层上方
       const insertIndex = newData.layers.findIndex((l: any) => l.ind === layer.ind);
       newData.layers.splice(insertIndex, 0, newLayer);
     });
     
     console.log(`   ✅ 已生成 ${segments.length} 个分色图层`);
  } 
  // 2. 否则应用全局颜色
  else if (el.color) {
    const rgbColor = hexToRgb(el.color);
    if (rgbColor) {
      layer.t.d.k[0].s.fc = rgbColor;
    }
  }
}

// 🎨 增强版：增加图片饱和度（用于 Coze 返回的图片）
export const adjustImageSaturation = (imageSrc: string, saturationIncrease: number = 30): Promise<string> => {
  // 如果在服务端运行，直接返回原图
  if (typeof window === 'undefined') return Promise.resolve(imageSrc);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.warn('⚠️ [饱和度调整] Canvas Context 获取失败，返回原图');
          resolve(imageSrc);
          return;
        }

        // 1. 绘制原始图片到 Canvas
        ctx.drawImage(img, 0, 0);
        
        // 2. 获取像素数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 3. 逐像素调整饱和度
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];     // Red
          const g = data[i + 1]; // Green
          const b = data[i + 2]; // Blue
          const a = data[i + 3]; // Alpha
          
          // 转换 RGB 到 HSL
          const max = Math.max(r, g, b) / 255;
          const min = Math.min(r, g, b) / 255;
          const l = (max + min) / 2;
          
          let h, s;
          if (max === min) {
            h = s = 0; // achromatic (灰色)
          } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
              case r / 255:
                h = (g - b) / 255 / d + (g < b ? 6 : 0);
                break;
              case g / 255:
                h = (b - r) / 255 / d + 2;
                break;
              case b / 255:
                h = (r - g) / 255 / d + 4;
                break;
              default:
                h = 0;
            }
            h /= 6;
          }
          
          // 增加饱和度
          s = Math.min(1, s + saturationIncrease / 100);
          
          // 转换 HSL 回到 RGB
          let rOut, gOut, bOut;
          
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };
          
          if (s === 0) {
            rOut = gOut = bOut = l; // achromatic
          } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            rOut = hue2rgb(p, q, h + 1 / 3);
            gOut = hue2rgb(p, q, h);
            bOut = hue2rgb(p, q, h - 1 / 3);
          }
          
          data[i] = Math.round(rOut * 255);
          data[i + 1] = Math.round(gOut * 255);
          data[i + 2] = Math.round(bOut * 255);
          data[i + 3] = a; // Alpha 保持不变
        }
        
        // 4. 将修改后的像素放回 Canvas
        ctx.putImageData(imageData, 0, 0);
        
        // 5. 转换为 Data URL
        const resultDataUrl = canvas.toDataURL('image/png');
        console.log(`🎨 [饱和度调整] 图片饱和度已提升 +${saturationIncrease}%`);
        resolve(resultDataUrl);
      } catch (e) {
        console.error('❌ [饱和度调整] 处理失败，返回原图:', e);
        resolve(imageSrc);
      }
    };
    
    img.onerror = () => {
      console.error('❌ [饱和度调整] 图片加载失败，返回原图');
      resolve(imageSrc);
    };
    
    img.src = imageSrc;
  });
};