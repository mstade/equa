module.exports = sequence

function sequence() {
  var fns = [].slice.call(arguments)

  return function() {
    var self = this
      , args = [].slice.call(arguments)
   
    fns.forEach(function(fn) {
      fn.apply(self, args)
    })
  }
}