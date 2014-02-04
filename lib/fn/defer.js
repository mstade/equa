module.exports = defer

function defer(fn) {
  return function() {
    var self = this

    requestAnimationFrame(fn.bind(this))
  }
}