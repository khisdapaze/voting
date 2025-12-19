import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '../', '');

    return {
        envDir: '../',
        plugins: [react(), tailwindcss()],
        define: {
            'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.API_BASE_URL),
            'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
        },
    };
});
