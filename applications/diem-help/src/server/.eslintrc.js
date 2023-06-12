/*
👋 Hi! This file was autogenerated by tslint-to-eslint-config.
https://github.com/typescript-eslint/tslint-to-eslint-config

It represents the closest reasonable ESLint configuration to this
project's original TSLint configuration.

We recommend eventually switching this configuration to extend from
the recommended rulesets in typescript-eslint.
https://github.com/typescript-eslint/tslint-to-eslint-config/blob/master/docs/FAQs.md

Happy linting! 💖
*/
module.exports = {
    env: {
        browser: true,
        node: true,
        es6: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
        createDefaultProgram: true,
    },
    plugins: ['@typescript-eslint', 'sonarjs', 'prettier', 'import', 'jsdoc'],
    extends: [
        'plugin:@typescript-eslint/recommended',
        '../../src/webpack/eslintrc-base.js',
        'plugin:sonarjs/recommended',
        'prettier',
    ],
    rules: {
        'sonarjs/cognitive-complexity': ['error', 30],
    },
};