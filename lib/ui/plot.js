var f   = require('./format')
  , d3  = require('d3')
  , cm  = require('./unit')
  , $   = require('../fn/defer')
  , _   = require('../fn/sequence')
  , evt = d3.dispatch('change')

module.exports = plot

plot.on = evt.on.bind(evt)

function plot(graph, fns) {
  var fn = graph.selectAll('.line').data(fns, function(d, i) { return i })

  fn.each($(update))

  fn.enter().append('g')
    .classed('line', true)
    .classed('interactive', true)
    .attr('data-index', function(d, i) { return i % 6 })
    .call(parts)
    .each($(update))
    .call(drag)

  fn.exit().remove()
}

function parts(ln) {
  ln.append('rect')
    .attr('stroke', 'none')
    .attr('fill', 'transparent')
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
    .style('-webkit-transform', function(d) {
      return f('translate3d(0, $1cm, 0) rotate($0rad) scale(1)', [Math.atan(d[0]), d[1]])
    })
}

function drag(fn) {
  fn.call(
    d3.behavior.drag()
      .on('dragstart', drag(true))
      .on('drag',      _(transform, $(update)))
      .on('dragend',   _(drag(false), transform, $(update)))
  )

  function drag(enabled) {
    return function() {
      d3.select(this)
        .classed('dragged', enabled)
      
      constraint = enabled
        ? Math.abs(d3.mouse(this)[0] / cm) > .75
          ? rotate
          : translate
        : snap
    }
  }

  var constraint, prev = fn.datum()

  function transform() {
    var x  = d3.event.x / cm
      , y  = d3.event.y / cm
      , fn = d3.select(this)

    fn.datum(constraint(x, y))

    var d = snap(x, y)(fn.datum())

    if (prev + '' != d + '') {
      prev = d
      evt.change(d)
    }
  }

  function translate(x, y) {
    return function translate(d) {
      return [d[0], y]
    }
  }

  function rotate(x, y) {
    return function rotate(d) {
      var k = (y - d[1]) / x
      return [k, d[1]]
    }
  }

  function snap() {
    return function(d) {
      var k = d3.round(d[0], 1)
        , m = d3.round(d[1], 1)

      return [k, m]
    }
  }
}