var d3 = require('d3')

module.exports = toggle

function toggle(targets, style, initial) {
  d3.selectAll(targets).classed(style, !!initial)

  return function(selection) {
    selection.on('click.' + style, function() {
      d3.selectAll(targets)
        .classed(style, (initial = !initial))
    })
  }
}