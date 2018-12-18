module.exports = {
  extends: ['prettier'],
  parserOptions: {
    ecmaVersion: 2018,
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    'no-underscore-dangle': 'off',
    'camelcase': 'warn',
  },
};
