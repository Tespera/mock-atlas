# 第三方声明

本项目使用了以下第三方代码与数据。

## real-random-taxfree-address（MIT）

- 来源：https://github.com/hotbob011/real-random-taxfree-address （移植时的提交：`06dc76d`，2026-03-28）
- 用途：`src/core/legacy.js` 中美国 / 香港 / 英国 / 加拿大 / 日本 / 印度 / 台湾 / 新加坡 / 德国的地址生成逻辑，
  以及 `public/data/` 下这些国家与澳大利亚 / 韩国 / 菲律宾 / 土耳其 / 尼日利亚的地址与姓名数据。

```
MIT License

Copyright (c) 2026 MockAddress

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## OpenStreetMap 数据（ODbL 1.0）

澳大利亚、韩国、菲律宾、土耳其、挪威、尼日利亚的地址来自 © OpenStreetMap contributors，
遵循 Open Database License：https://www.openstreetmap.org/copyright
美国部分地址来自 OpenAddresses：https://openaddresses.io

## 依赖

| 包 | 许可证 |
|---|---|
| country-flag-icons（国旗 SVG） | MIT |
| @fontsource-variable/fraunces、hanken-grotesk、martian-mono、bricolage-grotesque（字体） | SIL OFL 1.1 |
| vite、typescript、tsx（构建与开发） | MIT / Apache-2.0 |
