module.exports = {
  transpileDependencies: [
    'vuetify'
  ],

  pages: {
    index: {
      entry: 'src/main.ts',
      title: 'Docker Drive'
    },
    background: {
      entry: 'src/background.ts',
      title: 'Background Page'
    }
  },

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
