/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        plane: "var(--page-plane)",
        surface: "var(--surface-1)",
        card: "var(--surface-2)",
        "ink-primary": "var(--text-primary)",
        "ink-secondary": "var(--text-secondary)",
        "ink-muted": "var(--text-muted)",
        grid: "var(--gridline)",
        baseline: "var(--baseline)",
        "on-color": "var(--on-color)",
        pink: "var(--pink)",
        yellow: "var(--yellow)",
        blue: "var(--blue)",
      },
      fontFamily: {
        sans: [
          "var(--font-poppins)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
