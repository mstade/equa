require('fastclick')(document.body)

var _       = require('./fn/sequence')
  , $       = require('./fn/defer')
  , cm      = require('./ui/unit')
  , d3      = require('d3')
  , toggle  = require('./ui/toggle')
  , plot    = require('./ui/plot')
  , eq      = require('./ui/eq')
  , graph   = d3.select('#graph .plot')
  , math    = d3.select('#math ul')
  , data    = []
  , id      = 0

add()
render()

d3.select('#edit')
  .call(toggle('#math', 'edit'))

d3.select('#add')
  .on('click', _(add, render))

plot.on('change', $(function(d, i) {
  data[i] = d
  eq(math, data)
}))

eq.on('remove', _(del, render))

function add() {
  var l = [~~(Math.random() * 5), ~~(Math.random() * 5)]
  l.id = id++
  data.push(l)
}

function del(d, i) {
  data = data.filter(function(x) {
    return x.id !== d.id
  })
}

function render() {
  plot(graph, data)
  eq(math, data)
}