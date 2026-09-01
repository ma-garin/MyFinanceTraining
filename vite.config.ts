import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Android アプリは capacitor が https://localhost/ 直下から配信するため、
// GitHub Pages 用のサブパス base を付けるとアセットを取り違える。
const IS_CAPACITOR = process.env.BUILD_TARGET === 'capacitor';

export default defineConfig({
  plugins: [react()],
  base: IS_CAPACITOR ? '/' : '/MyFinanceTraining/',
  define: {
    __IS_CAPACITOR__: JSON.stringify(IS_CAPACITOR),
  },
});
