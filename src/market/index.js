// src/market/index.js
const { fetchMarketBrief } = require('./phatthalungPrices');

async function getMarketBrief() {
  try {
    return await fetchMarketBrief();
  } catch (err) {
    return [];
  }
}

module.exports = { getMarketBrief };
