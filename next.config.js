const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_SERVER } = require('next/constants');
const warmUpCaches = require('./warmUpCaches');

module.exports = (phase) => {
  // Only when actually serving (not during `next build`): pre-cache the newest
  // set's card data so the first visitor doesn't pay the cold-fetch latency
  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_SERVER) {
    warmUpCaches();
  }

  return {
    webpack5: true,
  };
};
