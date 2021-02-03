module.exports = {
  transpileDependencies: [
      'vuetify'
  ],

  productionSourceMap: false,

  pluginOptions: {
    i18n: {
      locale: 'zh',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableInSFC: true
    }
  },

  outputDir: 'extension/dist',
  publicPath: ''
};
