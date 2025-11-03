const path = require('path')
const { merge } = require('webpack-merge')
const common = require('./webpack.common.cjs')

module.exports = merge(common, {
  mode: 'production',
  resolve: {
    alias: {
      'config.env': path.resolve(__dirname, 'config.prod.js'),
    },
  },
})