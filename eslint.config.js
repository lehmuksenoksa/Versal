// The lint step (spec/groundwork.md, section 8): catches the slips a test
// may not reach (a name used but never declared, one declared and never
// used, one declared twice), in the game, the tests and the tools.
// `npm run lint`; on every push too (.github/workflows/test.yml). A
// development tool only: the game itself needs nothing installed.
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "mockups/", "tests/browser/shots/"] },
  js.configs.recommended,
  {
    files: ["js/**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.browser } },
  },
  {
    files: ["js/rules/**/*.js"],
    // (The rules run headless too: no browser in them; btoa and atob are in
    // Node as in the browser.)
    languageOptions: { globals: { btoa: "readonly", atob: "readonly", Path2D: "readonly" } },
  },
  {
    files: ["tests/**/*.js", "tests/**/*.mjs", "tools/**/*.mjs", "tools/**/*.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none", ignoreRestSiblings: true }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
