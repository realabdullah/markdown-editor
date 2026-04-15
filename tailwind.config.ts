import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default <Partial<Config>>{
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["InterVariable", "Inter", "Geist", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 20px 60px -40px rgba(0, 0, 0, 0.75)",
      },
    },
  },
  plugins: [typography],
};
