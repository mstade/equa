var f   = require('./format')
  , d3  = require('d3')
  , cm  = require('./unit')
  , $   = require('../fn/defer')
  , _   = require('../fn/sequence')
  , pre = require('./prefix')
  , evt = d3.dispatch('change')
  , abs = Math.abs

module.exports = plot

plot.on = evt.on.bind(evt)

function plot(graph, fns) {
  var fn = graph.selectAll('.line').data(fns, function(d) { return d.id })

  fn.each($(update))

  fn.enter().append('g')
    .classed('line', true)
    .classed('interactive', true)
    .attr('data-index', function(d, i) { return d.id % 6 })
    .call(parts)
    .each($(update))
    .call(drag)

  fn.exit().remove()
}

function parts(ln) {
  ln.append('rect')
    .classed('hit-area', true)
    .attr('x', '-200%')
    .attr('y', '-5mm')
    .attr('width', '400%')
    .attr('height', '1cm')

  ln.append('line')
    .attr('x1', '-200%')
    .attr('x2',  '200%')

  var ct = ln.append('g').classed('m', true)

  ct.append('circle')
    .attr('r', '3mm')
  
  ct.append('line')
    .attr('x1', '-2mm')
    .attr('x2',  '2mm')

  ct.append('line')
    .attr('y1', '-2mm')
    .attr('y2',  '2mm')
}

function update() {
  d3.select(this)
    .style(pre('transform', function(d) {
      return f('translate3d(0, $1cm, 0) rotate($0rad) scale(1)', [Math.atan(d[0]), d[1]])
    }))
}

function drag(fn) {
  fn.call(
    d3.behavior.drag()
      .on('dragstart', drag(true))
      .on('drag',      _(transform, $(update)))
      .on('dragend',   _(drag(false), transform, $(update)))
  )

  function drag(enabled) {
    return function(d) {
      d3.select(this)
        .classed('dragged', enabled)

      var m = d3.mouse(this).map(function(d) { return d / cm })

      if (enabled) {
        constraint = abs(m[0]) > 0.75? rotate : translate
      } else {
        constraint = snap
      }
    }
  }

  var constraint, prev

  function transform(d, i) {
    var x  = d3.event.x / cm
      , y  = d3.event.y / cm
      , fn = d3.select(this)

    fn.datum(constraint(x, y))
    d = snap()(fn.datum())

    if (String(prev) !== String(d)) {
      prev = d
      evt.change(d, i)
    }
  }

  function translate(x, y) {
    return function translate(d) {
      var i = [d[0], y]
      i.id = d.id
      return i
    }
  }

  function rotate(x, y) {
    return function rotate(d) {
      var i = [(y - d[1]) / x, d[1]]
      i.id = d.id
      return i
    }
  }

  function snap() {
    return function(d) {
      var i = [d3.round(d[0], 1), d3.round(d[1], 1)]
      i.id = d.id
      return i
    }
  }
}