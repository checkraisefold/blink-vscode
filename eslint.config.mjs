import typescriptEslint from "typescript-eslint";
import eslint from "@eslint/js";

export default typescriptEslint.config(eslint.configs.recommended, ...typescriptEslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            semi: [2, "always"],
            "@typescript-eslint/no-unused-vars": 0,
            "@typescript-eslint/no-explicit-any": 0,
            "@typescript-eslint/explicit-module-boundary-types": 0,
            "@typescript-eslint/no-non-null-assertion": 0,
            "no-throw-literal": 1,
            "no-unused-vars": 1,
            "no-mixed-spaces-and-tabs": 1,
            "no-trailing-spaces": 1,
            "no-multi-spaces": 1,
            "no-multiple-empty-lines": 1,
            "no-irregular-whitespace": 1,
            "no-unexpected-multiline": 1,
            "no-duplicate-case": 1,
            "no-unreachable": 1,
        },
    }
);