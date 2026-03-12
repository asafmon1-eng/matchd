import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    define: {
      // מזריק את VITE_GMAPS_API_KEY לתוך process.env בקוד הקליינט.
      // Vite מחליף את הביטוי הזה במחרוזת האמיתית בזמן build.
      // (המפתח כבר מוטמע ישירות ב-PLYRApp_v8.jsx — שורה זו נשמרת כ-fallback)
      "process.env.VITE_GMAPS_API_KEY": JSON.stringify(
        env.VITE_GMAPS_API_KEY || ""
      ),
    },
  };
});
