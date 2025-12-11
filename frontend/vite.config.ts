import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        open: true,
    },
    optimizeDeps: {
        include: ['jspdf', 'html2canvas', 'pdfjs-dist', 'framer-motion']
    },
    build: {
        commonjsOptions: {
            include: [/jspdf/, /html2canvas/, /pdfjs-dist/, /framer-motion/, /node_modules/]
        },
        rollupOptions: {
            output: {
                manualChunks: undefined
            }
        }
    },
    ssr: {
        noExternal: ['framer-motion', 'motion-utils']
    }
});
