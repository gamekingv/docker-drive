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
  publicPath: '',

  parallel: false,
  configureWebpack: config => {
    config.module.rules.unshift({
      test: /\.worker\.ts$/,
      use: ['worker-loader'],
      exclude: /node_modules/
    });
  },
};
