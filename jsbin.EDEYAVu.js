var cm = document.getElementById('#unit').width.baseVal.value

d3.selectAll('.interactive')
  .data([[-2, -2], [2, 2]])
  .each(_(place, recalc, type))
  .call(
    d3.behavior.drag()
      .on('dragstart', drag(true))
      .on('drag',      _(move, recalc, place))
      .on('dragend',   _(snap, recalc, type, drag(false), place))
  )

function drag(enabled) {
  return function() {
    d3.select(this)
      .classed('dragged', enabled)
    
    d3.selectAll('.animated')
      .classed('dragging', enabled)
  }
}

function move() {
  var pt  = d3.select(this)
    , px  = d3.event.x / cm
    , py  = d3.event.y / cm
  
  pt.datum([px, py])
}

function recalc() {
  var vw = window.innerWidth
    , vh = window.innerHeight
    , p1 = d3.select('#p1').datum()
    , p2 = d3.select('#p2').datum()
    , dx = p2[0] - p1[0]
    , dy = p2[1] - p1[1]
    , cx = (p1[0] + p2[0]) / 2
    , cy = (p1[1] + p2[1]) / 2
    , k  = dy / dx
    , m  = p2[1] - k * p2[0]
    , th = Math.atan2(dy, dx)
  
  d3.select('.line')
    .style('-webkit-transform', f('translate($0cm, $1cm) rotate($2rad)', [cx, cy, th]))
  
  d3.select('#m')
    .style('-webkit-transform', f('translate(0, $0cm) rotate($1rad)', [m, th]))
  
  d3.select('.math')
    .datum({ k: k, m: m, p1: p1, p2: p2 })
}

function place() {
  var pt = d3.select(this)
    , co = pt.datum()
    , tm = [1, 0, 0, 1, 0, 0]
  
  if (pt.classed('dragging')) {
    tm[0] = 1.5;
    tm[3] = 1.5;
  }
  
  tm[4] = co[0] * cm;
  tm[5] = co[1] * cm;
  
  pt.style('-webkit-transform', f('matrix($0, $1, $2, $3, $4, $5)', tm))
}

function snap() {
  var pt = d3.select(this)
    , co = pt.datum()

  pt.datum(co.map(Math.round))
}

function type() {
  var d  = d3.select('.math').datum()
    , k  = n(d.k, 2) || ""
    , m  = n(d.m, 2) || ""
  
  d3.selectAll('.math text').text(f('y = $0x$1', [k, m && ' + ' + m]))
  
  d3.selectAll('.interactive.point')
    .each(function(d) {
      var pt = d3.select(this)

      pt.select('.x').text('x: ' + n(d[0], 1))
      pt.select('.y').text('y: ' + n(d[1], 1))
    })
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

function f(str, sub) {
  return str.replace(/\$(\d+)/g, function(m, i) {
    return sub[i]
  })
}

function n(num, dec) {
  return parseFloat(num.toFixed(dec))
}