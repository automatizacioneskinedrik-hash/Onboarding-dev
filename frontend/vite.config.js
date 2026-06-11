import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },
    test: {
        environment: 'jsdom',
        globals: false,
        include: [
            'test/**/*.test.js',
            'test/**/*.test.jsx',
            'test/**/*.test.ts',
            'test/**/*.test.tsx',
            'test/**/*.spec.js',
            'test/**/*.spec.jsx',
            'test/**/*.spec.ts',
            'test/**/*.spec.tsx',
        ],
        setupFiles: './vitest.setup.js',
    },
});
