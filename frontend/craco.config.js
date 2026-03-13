const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  devServer: (devServerConfig) => {
    devServerConfig.historyApiFallback = true;
    return devServerConfig;
  },
};
