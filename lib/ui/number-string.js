module.exports = numberString

function numberString(num, dec) {
  return parseFloat(num.toFixed(dec))
}