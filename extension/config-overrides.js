const { override } = require('customize-cra')

const overrideEntry = (config) => {
  config.entry = {
    main: './src/index',
    popup: './src/popup/index',
    background: './src/service/Background',
    content: './src/service/Content',
    sidepanel: './src/sidepanel/index',
  }

  return config
}

const overrideOutput = (config) => {
  config.output = {
    ...config.output,
    filename: 'static/js/[name].js',
    chunkFilename: 'static/js/[name].js',
  }

  return config
}

module.exports = {
  webpack: (config) => override(overrideEntry, overrideOutput)(config),
}