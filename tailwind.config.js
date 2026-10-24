/**
 * Tailwind CSS configuration for CEPRO Modernización V2
 * Extends the institutional color palette as required by the design.
 */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        institutional: "#13594a",
        petroleum: "#004034",
        mint: "#E6F4F1",
        background: "#F6F8FA",
        card: "#FFFFFF",
        textPrimary: "#172B28",
      },
    },
  },
  plugins: [],
};
