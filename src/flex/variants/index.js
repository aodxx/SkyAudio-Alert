const variants = Object.freeze({
  normal: require('./normal'),
  watch: require('./watch'),
  affected: require('./affected'),
  critical: require('./critical'),
  unknown: require('./unknown'),
});

function getVariant(severity) {
  return variants[Object.hasOwn(variants, severity) ? severity : 'unknown'];
}

module.exports = { variants, getVariant };
