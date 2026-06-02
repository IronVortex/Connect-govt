const { composePlugins, withNx } = require("@nx/next");

const nextConfig = {
  nx: {},
};

module.exports = composePlugins(withNx)(nextConfig);