import type { Config } from "tailwindcss";

// Design tokens for CSCMS. Palette draws deliberately from the Cameroon
// flag (green / red / gold) rather than a generic SaaS accent - used as a
// thin identity mark (top stripe on cards) and for semantic status colors,
// not as decoration everywhere.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F7F8FA",
        surface: "#FFFFFF",
        ink: "#1A2332",
        muted: "#5B6472",
        border: "#E2E5EA",
        primary: {
          DEFAULT: "#0B6E4F",
          dark: "#085A40",
          light: "#E6F2ED"
        },
        gold: {
          DEFAULT: "#D4A017",
          light: "#FBF3DD"
        },
        danger: {
          DEFAULT: "#C1272D",
          light: "#FBEAEA"
        }
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px"
      }
    }
  },
  plugins: []
};

export default config;
