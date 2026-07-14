/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 16px 40px rgba(15, 23, 42, 0.08)",
        line: "0 1px 2px rgba(15, 23, 42, 0.06)",
      },
      colors: {
        ink: "#0f172a",
        muted: "#64748b",
        line: "#dbe3ee",
        panel: "#f7f9fc",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace"
        ],
      },
    },
  },
  plugins: [],
};
