import withNuxt from './.nuxt/eslint.config.mjs'
export default withNuxt({
  ignores: ['.output/**', '.data/**', '.agent/**', 'test-results/**', 'playwright-report/**'],
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/html-self-closing': 'off'
  }
})
