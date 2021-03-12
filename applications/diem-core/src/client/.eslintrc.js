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
        '@angular-eslint',
        '@angular-eslint/template',
        'sonarjs',
        'prettier',
        'import',
        'jsdoc',
        'prototype-pollution-security-rules'
    ],
    extends: [
        'plugin:@angular-eslint/recommended',
        '../../src/webpack/eslintrc-base.js',
    ],
    'rules': {
        'no-restricted-syntax': [
            'error',
            {
                'selector': 'CallExpression[callee.object.name="console"][callee.property.name!=/^(warn|error|info|debug|trace)$/]',
                'message': 'Unexpected property on console object was called'
            }
        ],
        /** prototype-pollution-security-rules rules**/
        'prototype-pollution-security-rules/detect-merge': 1,
        'prototype-pollution-security-rules/detect-merge-objects': 1,
        'prototype-pollution-security-rules/detect-merge-options': 1,
        'prototype-pollution-security-rules/detect-deep-extend': 1,

    }
};
