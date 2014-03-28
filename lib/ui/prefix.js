module.exports = prefixed

function prefixed(style, value) {
  return vendors.reduce(function(s, v) {
    s['-' + v + '-' + style] = value
    return s
  }, {})
}

var vendors = ['webkit', 'moz', 'ms', 'o']