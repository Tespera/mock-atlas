# MockAtlas

全球测试地址生成器：15 个国家 / 地区的地址、姓名、电话、邮箱，可选身份证件号与银行卡测试数据。
纯前端、零后端，所有数据在浏览器里随机生成，不上传。

## 运行

```bash
pnpm install
pnpm dev        # 开发
pnpm build      # 构建到 dist/（相对路径，可放任意静态托管）
pnpm smoke      # 用本地数据把每个国家 × 多个区域真实生成一遍并校验
```

## 风格

右上角「风格」菜单切换，选择会记住：

- **明亮 / 深色 / 紧凑**（实用清单式）：每个字段一行「标签 + 值 + 复制按钮」，按钮始终可见，点完原地变成「已复制」；值是普通文本，可直接框选。紧凑为单列高密度版。系统字体、无装饰动画。
- **瑞士 / 邮件标签**：偏展示的版式，保留。

另外整页禁用了橡皮筋回弹（`overscroll-behavior: none`）。

## 国家

美国（50 州，免税州 AK / DE / MT / NH / OR 置顶并标记）、加拿大、英国、德国、挪威、澳大利亚、日本、韩国、
中国台湾、中国香港、新加坡、印度、菲律宾、土耳其、尼日利亚。

## 结构

```
public/data/        地址与姓名数据（按国家拆分、按需加载）
src/core/           生成逻辑：legacy.js（9 国，移植自上游）、osm.ts（澳 / 韩 / 菲 / 土 / 挪）、ng.ts、
                    identity.ts（各国证件号）、card.ts（银行卡）、registry.ts（国家注册表）
src/ui/             界面：sheet.ts（清单式）/ labelCard.ts（标签式）、区域图鉴、历史抽屉、i18n（中 / 英）、themes.ts（风格注册表）
scripts/smoke.ts    冒烟测试
```

新增国家：在 `public/data/` 放数据 → `osm.ts` 加一个 spec（或写独立生成器）→ `registry.ts` 注册 →
`identity.ts` 补证件号 → `ui/flags.ts` 补国旗。

## 关于身份与银行卡数据

- 证件号全部随机生成，格式与校验位合规，不对应任何真实身份。
- 美国 SSN 与原站一致：区号按州取 `usData.json` 的 `ssn_area_range`，没有区段数据的州随机取 1–899（排除 666），并避开几个公开示例号；挪威出生号使用税务局规定的合成号段（月份 +80）。
- 银行卡仅通过 Luhn 校验，没有真实发卡行，无法用于支付。

## 部署

纯静态站，`pnpm build` 产物在 `dist/`，使用相对路径，可放在任意子路径。仓库已带 GitHub Actions 工作流（`.github/workflows/deploy.yml`），
推送到 `main` 即自动构建并发布到 GitHub Pages。首次需在仓库 Settings → Pages 把 Source 选为 **GitHub Actions**。

## 数据来源与许可

完整的第三方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。上游移植自提交 `06dc76d`（2026-03-28）。


- 美国 / 加 / 英 / 德 / 日 / 印 / 台 / 港 / 新 / 澳 / 韩 / 菲 / 土 / 尼的地址与姓名数据，以及 9 个国家的生成逻辑，
  来自 [hotbob011/real-random-taxfree-address](https://github.com/hotbob011/real-random-taxfree-address)（MIT）及其站点公开数据。
- 地址数据来自 OpenStreetMap contributors（ODbL）与 OpenAddresses。
- 挪威地址由 Overpass API 按县抽样自 OpenStreetMap（每县 600 条，共 8993 条），姓名库为自编。
- 国旗：[country-flag-icons](https://github.com/catamphetamine/country-flag-icons)（MIT）。
