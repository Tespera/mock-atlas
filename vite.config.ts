import { defineConfig } from 'vite';

export default defineConfig({
  // 相对路径：dist 可直接丢到任意静态托管 / 子目录
  base: './',
  build: { target: 'es2022' },
});
