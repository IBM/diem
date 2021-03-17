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
    plugins: [
        '@typescript-eslint',
        'sonarjs',
        'prettier',
        'import',
        'jsdoc',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:sonarjs/recommended',
        'prettier',
        '../../node_modules/@mydiem/diem-util/eslintrc-base.js',
    ],
};
