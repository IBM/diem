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
    ],
    extends: [
        'eslint:recommended',
        'plugin:@angular-eslint/recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:sonarjs/recommended',
        'prettier',
        '../../node_modules/@mydiem/diem-util/eslintrc-base.js',
    ],
    'rules': {
        'no-restricted-syntax': [
            'error',
            {
                'selector': 'CallExpression[callee.object.name="console"][callee.property.name!=/^(warn|error|info|debug|trace)$/]',
                'message': 'Unexpected property on console object was called'
            }
        ]
    }
};
