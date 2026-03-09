# sessionStorage 优化方案说明

## 问题根源
在模板列表页点击"注入素材并制作"时，原代码在 `sessionStorage` 中存储了完整的 `injectedElements` 数组。当包含大量图片素材（特别是转换后的 Base64 编码数据）时，会导致 `QuotaExceededError`。

### 存储大小对比

**旧方案（存储完整元素对象数组）**
```
injectedElements = [
  {
    id: 'elem-1',
    name: 'Product Image',
    type: 'image',
    isEditable: true,
    cozeField: 'product',
    currentValue: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...', // ~2-5MB
    originalValue: 'https://...',
    layerName: 'Image Layer',
    assetId: 'asset-1',
    ...其他属性...
  },
  {
    id: 'elem-2',
    name: 'Background',
    type: 'image',
    isEditable: true,
    cozeField: 'background',
    currentValue: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...', // ~2-5MB
    ...其他属性...
  },
  ...更多元素...
]

总大小: 10+ MB（远超 5MB 存储限制）
```

**新方案（仅存储 ID -> 值映射）**
```
injectionMetadata = {
  'elem-1': 'https://example.com/image1.jpg', // 仅存储 URL（几十字节）
  'elem-2': 'https://example.com/image2.jpg',
  'elem-3': '动效文案文字',
  ...
}

总大小: 1-10 KB（远小于 5MB 限制）
```

## 工作流程

### 1. 模板列表页（app/lottie-templates/page.tsx）

```
① 点击"注入素材并制作"
  ↓
② 检测到 isFromGenerator = true
  ↓
③ 从 sessionStorage 读取 pendingAssets
  ↓
④ 执行素材匹配（getAiAsset）
  ↓
⑤ 构建 injectionMetadata: Record<string, string>
   └─ 仅包含 ID -> (URL | 文字) 的映射
  ↓
⑥ try-catch 保存到 sessionStorage
   └─ 若遇到 QuotaExceededError
      ├─ 清理所有旧的 temp_elements_* 键
      └─ 重试（若仍失败则忽略，直接导航）
  ↓
⑦ 导航至编辑器页面
```

### 2. 编辑器页面（app/lottie-templates/[id]/page.tsx）

```
① 加载编辑器页面
  ↓
② 检查 sessionStorage 中是否有 temp_elements_{id}
  ↓
③ 若存在：
   ├─ 尝试解析 JSON
   ├─ 检测格式（新格式: Object | 旧格式: Array）
   ├─ 新格式: 根据 injectionMetadata 重新组装完整元素对象
   │  ├─ initialElements = data.elements.map(el => {
   │  │   if (injectionMetadata[el.id]) {
   │  │     return {...el, currentValue: injectionMetadata[el.id]}
   │  │   }
   │  │   return el
   │  │ })
   │  └─ 标记 isTemporaryEdit = true
   ├─ 旧格式: 直接使用（向后兼容）
   └─ 删除 sessionStorage 中的该键
  ↓
④ 若不存在但 isFromGenerator：
   ├─ 从 pendingAssets 进行素材注入
   └─ 标记 isTemporaryEdit = true
  ↓
⑤ 若都不存在：
   ├─ 使用原始保存的模板配置
   └─ 标记 isTemporaryEdit = false（编辑模式）
  ↓
⑥ 根据 isTemporaryEdit 决定是否执行 Base64 转换
   ├─ true: 执行 Base64 转换（仅转换 HTTP URL -> data:image/...）
   └─ false: 直接使用（编辑模式下使用保存的配置）
  ↓
⑦ 设置 elements 状态，渲染编辑器
```

## 优化效果

- **存储大小**: 从 10+ MB → 1-10 KB（减小 1000 倍）
- **可靠性**: 即使遇到 QuotaExceededError，也能自动清理、重试或降级
- **兼容性**: 保留旧格式的反向兼容（检测 Array | Object）
- **功能**: 生成模式和编辑模式完全分离

## 故障排查

### 现象 1：点击"注入素材并制作"无响应
- 检查浏览器控制台是否有 `QuotaExceededError`
- 若有：清理 sessionStorage (`sessionStorage.clear()`)，或清理旧的 `temp_elements_*` 键
- 若无：检查 `pendingAssets` 是否存在

### 现象 2：编辑器页面不显示注入的素材
- 检查控制台日志中是否有 `[编辑器] 使用 sessionStorage 中的临时元素配置`
- 若无：检查 `pendingAssets` 是否存在，以及 `from=generator` 参数
- 检查格式检测日志（`[编辑器] 检测到新格式的注入元数据` 或 `[编辑器] 检测到旧格式的注入数据`）

### 现象 3：图层显示错误或重复
- 检查 `cozeFieldMap` 日志中是否有多个元素使用相同的 `cozeField`
- 这是正常现象，多个元素会被同步更新为同一素材

## 后续改进方向

1. **渐进式加载**: Base64 转换可以异步进行，避免阻塞 UI
2. **智能缓存**: 已转换的 Base64 可缓存在 localStorage（图片文件级别）
3. **压缩算法**: 对大型图片进行压缩后再存储
4. **IndexedDB**: 对于超大数据量，考虑迁移到 IndexedDB（无大小限制）