import nextTs from 'eslint-config-next/typescript';
import nextVitals from 'eslint-config-next/core-web-vitals';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Build artifacts:
    'server.js',
    'dist/**',
    // Cloudflare build artifacts:
    '.open-next/**',
    '.wrangler/**',
    // Script files (CommonJS):
    'scripts/**/*.js',
  ]),
  {
    rules: {
      // 本项目的列表组件在挂载时加载一次数据（fetch 内部 setState），
      // 这是 React 官方支持的初始数据加载写法，不属于该规则针对的派生状态反模式。
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);

export default eslintConfig;
