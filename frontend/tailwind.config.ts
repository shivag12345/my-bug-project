import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bugTracking: {
          blue: "#0f62fe",
          green: "#24a148",
          red: "#da1e28",
          ink: "#161616"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
