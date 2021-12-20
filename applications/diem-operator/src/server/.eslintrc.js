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
};
