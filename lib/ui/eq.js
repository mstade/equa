var f   = require('./format')
  , d3  = require('d3')
  , cm  = require('./unit')
  , $   = require('../fn/defer')
  , _   = require('../fn/sequence')
  , pre = require('./prefix')
  , evt = d3.dispatch('remove')
  , abs = Math.abs

module.exports = eq

eq.on = evt.on.bind(evt)

function eq(list, fns) {
  var fn = list.selectAll('.equa').data(fns, function(d) { return d.id })

  fn.each($(update))

  fn.enter().append('li')
    .classed('equa', true)
    .attr('data-index', function(d, i) { return d.id % 6 })
    .call(parts)
    .each($(update))

  fn.exit().remove()
}

function parts(eq) {
  eq.append('button')
    .classed('del', true)
    .on('click', function(d, i) {
      evt.remove(d, i)
    })

  eq.append('span')
    .classed('fn', true)
    .text('y')

  eq.append('span')
    .classed('fn-body', true)
}

function update(d) {
  var fn

  if (abs(d[0] + d[1]) === Infinity) {
    fn = '\u221e'
  } else if (d[0]) {
    fn = d[1] > 0? '$0x + $1'
       : d[1] < 0? '$0x - $1'
       : '$0x'
  } else {
    fn = d[1] > 0? '$1' : '-$1'
  }

  d3.select(this)
    .select('.fn-body')
    .text(f(fn, [d[0], abs(d[1])]))
}