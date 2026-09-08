import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: local('./'),
  envDir: false,
  plugins: [
    {
      name: 'heapy-preview-adapters',
      enforce: 'pre',
      resolveId(source) {
        if (/\/dataConnectionApi$/.test(source))
          return local('./mockDataConnection.ts');
        if (/\/pickCheckupFile$/.test(source))
          return local('./pickCheckupFile.ts');
        if (/\/samsungHealth$/.test(source))
          return local('./mockSamsungHealth.ts');
        if (/\/shared\/api\/heapyApi$/.test(source))
          return local('./mockApi.ts');
        if (/\/shared\/api\/client$/.test(source))
          return local('./mockClient.ts');
        if (/\/shared\/storage\/tokenStorage$/.test(source))
          return local('./mockStorage.ts');
      },
      transform(code, id) {
        if (!id.replaceAll('\\', '/').includes('/src/') || !id.endsWith('.tsx'))
          return;
        const imports: string[] = [];
        const transformed = code.replace(
          /require\(['"]([^'"]+\.png)['"]\)/g,
          (_, path) => {
            const name = `previewImage${imports.length}`;
            imports.push(`import ${name} from ${JSON.stringify(path)};`);
            return `{ uri: ${name} }`;
          },
        );
        if (imports.length)
          return { code: `${imports.join('\n')}\n${transformed}`, map: null };
      },
    },
    react(),
  ],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      {
        find: /^react-native-svg$/,
        replacement: local(
          '../node_modules/react-native-svg/lib/module/elements.web.js',
        ),
      },
      {
        find: 'react-native-linear-gradient',
        replacement: local('./LinearGradient.tsx'),
      },
    ],
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.mjs',
      '.js',
      '.ts',
      '.tsx',
      '.json',
    ],
    dedupe: ['react', 'react-dom'],
  },
  define: { __DEV__: true, global: 'globalThis' },
  optimizeDeps: { exclude: ['react-native-safe-area-context'] },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: { allow: [local('../')] },
    headers: {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws://127.0.0.1:5173; frame-src 'self'; object-src 'none'",
    },
  },
  build: { outDir: '../artifacts/preview', emptyOutDir: true },
});
