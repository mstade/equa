var s       = require('./fn/sequence')
  , $       = require('./fn/defer')
  , f       = require('./ui/format')
  , cm      = require('./ui/unit')
  , d3      = require('d3')
  , toggle  = require('./ui/toggle')
  , plot    = require('./ui/plot')
  , graph   = d3.select('#graph .plot')
  , data    = [[1, 0]]

d3.select('#edit')
  .call(toggle('.graph-part, #math', 'edit'))

plot(graph, data)

d3.select('#add')
  .on('click', function() {
    data = d3.selectAll('.line').data()
    data.push([~~(Math.random() * 5), ~~(Math.random() * 5)])

    plot(graph, data)
  })

plot.on('change', $(function(d) {
  var fn = d[0] + d[1] == Infinity
    ? '\u221e'
    : d[1] > 0
      ? 'y = $0x + $1'
      : d[1] < 0
        ? 'y = $0x - $1'
        : 'y = $0x'

  d3.select('#math .fn').text(f(fn, [d[0], Math.abs(d[1])]))
}))