import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Disallow console usage except for allowed methods during development
      // In production builds, console calls should be removed or replaced
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Disallow debugger statements
      "no-debugger": "error",
      // Disallow alert/confirm/prompt in production code
      "no-alert": "error",
    },
    // Loosen rules for server-side code (API routes and server libs)
    files: [
      "src/app/api/**/*.js",
      "src/app/api/**/*.jsx",
      "src/app/lib/**/*.js",
      "src/lib/**/*.js",
    ],
    rules: {
      "no-console": "off",
      "@next/next/no-assign-module-variable": "off",
    },
  },
];

export default eslintConfig;
