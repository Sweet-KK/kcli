module.exports = {
  root: true,
  env: {
    node: true,
    es6: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {

  },
  eslintConfig: {
    parser: 'babel-eslint'
  },
  rules: {
    'no-console': 'off'
  }
}
