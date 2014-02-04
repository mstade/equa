var s       = require('./fn/sequence')
  , d       = require('./fn/defer')
  , f       = require('./ui/format')
  , n       = require('./ui/number-string')
  , cm      = require('./ui/unit')
  , d3      = require('d3')
  , toggle  = require('./ui/toggle')
  , line    = require('./ui/line')

d3.select('#toggle-math, #line')
  .call(toggle('#math', 'hide'))
  .call(toggle('#graph', 'expand'))

update([[1, 0]])

d3.select('#add')
  .on('click', function() {
    var data = d3.selectAll('.line').data()
    data.push([~~(Math.random() * 5), ~~(Math.random() * 5)])
    update(data)
  })

function update(data) {
  d3.select('#graph .canvas')
    .call(line, data)
}