import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Template content is the product, not tool source; it is verified by the
    // e2e tests of the generated projects instead.
    ignores: ["dist/", "coverage/", "templates/", "demo/"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
