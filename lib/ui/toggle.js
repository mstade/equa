var d3 = require('d3')

module.exports = toggle

function toggle(targets, style, trigger) {
  return function(selection) {
    selection.on('click.' + style, function() {
      d3.selectAll(targets)
        .each(function() {
          var t = d3.select(this)
          t.classed(style, !t.classed(style))
        })

      trigger && trigger(targets)
    })
  }
}