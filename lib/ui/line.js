var f  = require('./format')
  , d3 = require('d3')
  , cm = require('./unit')

module.exports = line

function line(canvas, data) {
  var ln = canvas.selectAll('.line').data(data)

  ln.call(transform)

  ln.enter().append('g')
    .classed('line', true)
    .classed('interactive', true)
    .attr('data-index', function(d, i) { return i % 6 })
    .call(parts)
    .call(transform)
    .call(drag())

  ln.exit().remove()
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

function transform(ln) {
  ln.style('-webkit-transform', function(d) {
    return f('translate3d(0, $1cm, 0) rotate($0rad)', [Math.atan(d[0]), d[1]])
  })
}

function drag() {
  var constraint

  return d3.behavior.drag()
    .on('dragstart', toggledrag(true))
    .on('dragend',   toggledrag(false))
    .on('drag',      function() {
      d3.select(this)
        .call(constraint)
        .call(transform)
    })

  function toggledrag(enabled) {
    return function() {
      d3.select(this)
        .classed('dragged', enabled)

      if (enabled) {
        var px = Math.abs(d3.mouse(this)[0] / cm)
        constraint = px > 1 ? rotate : move;
      } else {
        constraint = null
      }
    }
  }

  function move(ln) {
    var ds = ln.datum()
      , py = d3.event.y / cm

    ln.datum([ds[0], py])
  }

  function rotate(ln) {
    var ds = ln.datum()
      , px = d3.event.x / cm
      , py = d3.event.y / cm
      , k  = (py - ds[1]) / px

    ln.datum([k, ds[1]])
  }
}