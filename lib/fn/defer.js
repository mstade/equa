module.exports = defer

function defer(fn) {
  return function() {
    var self = this
      , args = [].slice.call(arguments)

    requestAnimationFrame(function() {
      fn.apply(self, args)
    })
  }
}