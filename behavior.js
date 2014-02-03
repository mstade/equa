var cm = document.getElementById('#unit').width.baseVal.value 

d3.selectAll('.interactive.point')
  .data([[-2, -2], [2, 2]])
  .each(_(recalc, place, type()))
  .call(
    d3.behavior.drag()
      .on('dragstart', drag(true))
      .on('drag',      _(move(), d(recalc, place, type())))
      .on('dragend',   _(drag(false), snap, d(recalc, place, type())))
  )

function drag(enabled) {
  return function() {
    d3.select(this)
      .classed('dragged', enabled)
      .attr('data-offset', enabled ? d3.mouse(this) : null)

    d3.select('#' + this.id + '-data')
      .classed('dragged', enabled)

    d3.select('body')
      .classed('dragging', enabled)
  }
}

function move(constraints) {
  constraints || (constraints = 'xy')

  return function() {
    var pt  = d3.select(this)
      , of  = pt.attr('data-offset').split(',')
      , px  = ~constraints.indexOf('x') ? (d3.event.x - of[0]) / cm : 0
      , py  = ~constraints.indexOf('y') ? (d3.event.y - of[1]) / cm : 0
    
    pt.datum([px, py]) 
  }
}

function recalc() {
  var p1 = d3.select('#p1').datum()
    , p2 = d3.select('#p2').datum()
    , dx = p2[0] - p1[0]
    , dy = p2[1] - p1[1]
    , cx = (p1[0] + p2[0]) / 2
    , cy = (p1[1] + p2[1]) / 2
    , k  = dy / dx
    , m  = p2[1] - k * p2[0]
    , th = Math.atan2(dy, dx)
  
  d3.select('#line')
    .style('-webkit-transform', f('translate3d($0cm, $1cm, 0) rotate($2rad)', [cx, cy, th]))
  
  d3.select('#m')
    .style('-webkit-transform', f('translate3d(0, $0cm, 0) rotate($1rad)', [m, th]))
  
  d3.select('.math')
    .datum({ k: k, m: m, p1: p1, p2: p2, cx: cx, cy: cy, th: th })
}

function place() {
  var pt = d3.select(this)
    , co = pt.datum()

  pt.style('-webkit-transform', f('translate($0cm, $1cm)', co))
}

function snap() {
  var pt = d3.select(this)
    , co = pt.datum()

  pt.datum(co.map(Math.round))
}

function type() {
  var ds = d3.select('.math')
    , fn = ds.select('.fn')
    
  return function() {
    var co = ds.select('.coordinates')
      , d  = ds.datum()
      , k  = n(d.k, 1) || ""
      , m  = n(d.m, 1) || ""

    fn.text(f('y = $0x$1', [k, m && (m > 0 ? ' + ' : ' - ') + Math.abs(m)]))

    co.selectAll('p')
      .data([d.p1, d.p2])
      .style('-webkit-transform', function(d, i, j) {
        return f('translate($0cm, $1cm)', [ d[0], -d[1] ])
      })
        .selectAll('.x, .y')
        .data(function(d) { return d })
        .text(function(d) { return d.toFixed(1) })
  }
}

function _() {
  var fns = [].slice.call(arguments)

  return function() {
    var self = this
      , args = [].slice.call(arguments)
   
    fns.forEach(function(fn) {
      fn.apply(self, args)
    })
  }
}

function d() {
  var fns = [].slice.call(arguments)

  return function() {
    var self = this
      , args = [].slice.call(arguments)

    requestAnimationFrame(function() {
      fns.forEach(function(fn) {
        fn.apply(self, args)
      })
    })
  }
}

function f(str, sub) {
  return str.replace(/\$(\d+)/g, function(m, i) {
    return sub[i]
  })
}

function n(num, dec) {
  return parseFloat(num.toFixed(dec))
}