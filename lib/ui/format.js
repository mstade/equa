module.exports = format

function format(str, sub) {
  return str.replace(/\$(\d+)/g, function(m, i) {
    return sub[i]
  })
}