module.exports = {
    transpileDependencies: [
        'vuetify'
    ],

    productionSourceMap: false,
    publicPath: '',

    pluginOptions: {
      i18n: {
        locale: 'zh',
        fallbackLocale: 'en',
        localeDir: 'locales',
        enableInSFC: true
      }
    }
};
