(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
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
},{"./fn/defer":1,"./fn/sequence":2,"./ui/eq":4,"./ui/plot":6,"./ui/toggle":8,"./ui/unit":9,"d3":10,"fastclick":11}],4:[function(require,module,exports){
var f   = require('./format')
  , d3  = require('d3')
  , cm  = require('./unit')
  , $   = require('../fn/defer')
  , _   = require('../fn/sequence')
  , pre = require('./prefix')
  , evt = d3.dispatch('remove')
  , abs = Math.abs

module.exports = eq

eq.on = evt.on.bind(evt)

function eq(list, fns) {
  var fn = list.selectAll('.equa').data(fns, function(d) { return d.id })

  fn.each($(update))

  fn.enter().append('li')
    .classed('equa', true)
    .attr('data-index', function(d, i) { return d.id % 6 })
    .call(parts)
    .each($(update))

  fn.exit().remove()
}

function parts(eq) {
  eq.append('button')
    .classed('del', true)
    .on('click', function(d, i) {
      evt.remove(d, i)
    })

  eq.append('span')
    .classed('fn', true)
    .text('y')

  eq.append('span')
    .classed('fn-body', true)
}

function update(d) {
  var fn

  if (abs(d[0] + d[1]) === Infinity) {
    fn = '\u221e'
  } else if (d[0]) {
    fn = d[1] > 0? '$0x + $1'
       : d[1] < 0? '$0x - $1'
       : '$0x'
  } else {
    fn = d[1] > 0? '$1' : '-$1'
  }

  d3.select(this)
    .select('.fn-body')
    .text(f(fn, [d[0], abs(d[1])]))
}
},{"../fn/defer":1,"../fn/sequence":2,"./format":5,"./prefix":7,"./unit":9,"d3":10}],5:[function(require,module,exports){
module.exports = format

function format(str, sub) {
  return str.replace(/\$(\d+)/g, function(m, i) {
    return sub[i]
  })
}
},{}],6:[function(require,module,exports){
var f   = require('./format')
  , d3  = require('d3')
  , cm  = require('./unit')
  , $   = require('../fn/defer')
  , _   = require('../fn/sequence')
  , pre = require('./prefix')
  , evt = d3.dispatch('change')
  , abs = Math.abs

module.exports = plot

plot.on = evt.on.bind(evt)

function plot(graph, fns) {
  var fn = graph.selectAll('.line').data(fns, function(d) { return d.id })

  fn.each($(update))

  fn.enter().append('g')
    .classed('line', true)
    .classed('interactive', true)
    .attr('data-index', function(d, i) { return d.id % 6 })
    .call(parts)
    .each($(update))
    .call(drag)

  fn.exit().remove()
}

function parts(ln) {
  ln.append('rect')
    .classed('hit-area', true)
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
    .style(pre('transform', function(d) {
      return f('translate3d(0, $1cm, 0) rotate($0rad) scale(1)', [Math.atan(d[0]), d[1]])
    }))
}

function drag(fn) {
  fn.call(
    d3.behavior.drag()
      .on('dragstart', drag(true))
      .on('drag',      _(transform, $(update)))
      .on('dragend',   _(drag(false), transform, $(update)))
  )

  function drag(enabled) {
    return function(d) {
      d3.select(this)
        .classed('dragged', enabled)

      var m = d3.mouse(this).map(function(d) { return d / cm })

      if (enabled) {
        constraint = abs(m[0]) > 0.75? rotate : translate
      } else {
        constraint = snap
      }
    }
  }

  var constraint, prev

  function transform(d, i) {
    var x  = d3.event.x / cm
      , y  = d3.event.y / cm
      , fn = d3.select(this)

    fn.datum(constraint(x, y))
    d = snap()(fn.datum())

    if (String(prev) !== String(d)) {
      prev = d
      evt.change(d, i)
    }
  }

  function translate(x, y) {
    return function translate(d) {
      var i = [d[0], y]
      i.id = d.id
      return i
    }
  }

  function rotate(x, y) {
    return function rotate(d) {
      var i = [(y - d[1]) / x, d[1]]
      i.id = d.id
      return i
    }
  }

  function snap() {
    return function(d) {
      var i = [d3.round(d[0], 1), d3.round(d[1], 1)]
      i.id = d.id
      return i
    }
  }
}
},{"../fn/defer":1,"../fn/sequence":2,"./format":5,"./prefix":7,"./unit":9,"d3":10}],7:[function(require,module,exports){
module.exports = prefixed

function prefixed(style, value) {
  return vendors.reduce(function(s, v) {
    s['-' + v + '-' + style] = value
    return s
  }, {})
}

var vendors = ['webkit', 'moz', 'ms', 'o']
},{}],8:[function(require,module,exports){
var d3 = require('d3')

module.exports = toggle

function toggle(targets, style, trigger) {
  return function(selection) {
    selection.on('click.' + style, function() {
      d3.selectAll(targets)
        .each(function() {
          var t = d3.select(this)
          t.classed(style, !t.classed(style))
        })

      trigger && trigger(targets)
    })
  }
}
},{"d3":10}],9:[function(require,module,exports){
module.exports = document.getElementById('unit').width.baseVal.value
},{}],10:[function(require,module,exports){
!function() {
  var d3 = {
    version: "3.4.1"
  };
  if (!Date.now) Date.now = function() {
    return +new Date();
  };
  var d3_arraySlice = [].slice, d3_array = function(list) {
    return d3_arraySlice.call(list);
  };
  var d3_document = document, d3_documentElement = d3_document.documentElement, d3_window = window;
  try {
    d3_array(d3_documentElement.childNodes)[0].nodeType;
  } catch (e) {
    d3_array = function(list) {
      var i = list.length, array = new Array(i);
      while (i--) array[i] = list[i];
      return array;
    };
  }
  try {
    d3_document.createElement("div").style.setProperty("opacity", 0, "");
  } catch (error) {
    var d3_element_prototype = d3_window.Element.prototype, d3_element_setAttribute = d3_element_prototype.setAttribute, d3_element_setAttributeNS = d3_element_prototype.setAttributeNS, d3_style_prototype = d3_window.CSSStyleDeclaration.prototype, d3_style_setProperty = d3_style_prototype.setProperty;
    d3_element_prototype.setAttribute = function(name, value) {
      d3_element_setAttribute.call(this, name, value + "");
    };
    d3_element_prototype.setAttributeNS = function(space, local, value) {
      d3_element_setAttributeNS.call(this, space, local, value + "");
    };
    d3_style_prototype.setProperty = function(name, value, priority) {
      d3_style_setProperty.call(this, name, value + "", priority);
    };
  }
  d3.ascending = function(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  };
  d3.descending = function(a, b) {
    return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
  };
  d3.min = function(array, f) {
    var i = -1, n = array.length, a, b;
    if (arguments.length === 1) {
      while (++i < n && !((a = array[i]) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = array[i]) != null && a > b) a = b;
    } else {
      while (++i < n && !((a = f.call(array, array[i], i)) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = f.call(array, array[i], i)) != null && a > b) a = b;
    }
    return a;
  };
  d3.max = function(array, f) {
    var i = -1, n = array.length, a, b;
    if (arguments.length === 1) {
      while (++i < n && !((a = array[i]) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = array[i]) != null && b > a) a = b;
    } else {
      while (++i < n && !((a = f.call(array, array[i], i)) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = f.call(array, array[i], i)) != null && b > a) a = b;
    }
    return a;
  };
  d3.extent = function(array, f) {
    var i = -1, n = array.length, a, b, c;
    if (arguments.length === 1) {
      while (++i < n && !((a = c = array[i]) != null && a <= a)) a = c = undefined;
      while (++i < n) if ((b = array[i]) != null) {
        if (a > b) a = b;
        if (c < b) c = b;
      }
    } else {
      while (++i < n && !((a = c = f.call(array, array[i], i)) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = f.call(array, array[i], i)) != null) {
        if (a > b) a = b;
        if (c < b) c = b;
      }
    }
    return [ a, c ];
  };
  d3.sum = function(array, f) {
    var s = 0, n = array.length, a, i = -1;
    if (arguments.length === 1) {
      while (++i < n) if (!isNaN(a = +array[i])) s += a;
    } else {
      while (++i < n) if (!isNaN(a = +f.call(array, array[i], i))) s += a;
    }
    return s;
  };
  function d3_number(x) {
    return x != null && !isNaN(x);
  }
  d3.mean = function(array, f) {
    var n = array.length, a, m = 0, i = -1, j = 0;
    if (arguments.length === 1) {
      while (++i < n) if (d3_number(a = array[i])) m += (a - m) / ++j;
    } else {
      while (++i < n) if (d3_number(a = f.call(array, array[i], i))) m += (a - m) / ++j;
    }
    return j ? m : undefined;
  };
  d3.quantile = function(values, p) {
    var H = (values.length - 1) * p + 1, h = Math.floor(H), v = +values[h - 1], e = H - h;
    return e ? v + e * (values[h] - v) : v;
  };
  d3.median = function(array, f) {
    if (arguments.length > 1) array = array.map(f);
    array = array.filter(d3_number);
    return array.length ? d3.quantile(array.sort(d3.ascending), .5) : undefined;
  };
  d3.bisector = function(f) {
    return {
      left: function(a, x, lo, hi) {
        if (arguments.length < 3) lo = 0;
        if (arguments.length < 4) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (f.call(a, a[mid], mid) < x) lo = mid + 1; else hi = mid;
        }
        return lo;
      },
      right: function(a, x, lo, hi) {
        if (arguments.length < 3) lo = 0;
        if (arguments.length < 4) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (x < f.call(a, a[mid], mid)) hi = mid; else lo = mid + 1;
        }
        return lo;
      }
    };
  };
  var d3_bisector = d3.bisector(function(d) {
    return d;
  });
  d3.bisectLeft = d3_bisector.left;
  d3.bisect = d3.bisectRight = d3_bisector.right;
  d3.shuffle = function(array) {
    var m = array.length, t, i;
    while (m) {
      i = Math.random() * m-- | 0;
      t = array[m], array[m] = array[i], array[i] = t;
    }
    return array;
  };
  d3.permute = function(array, indexes) {
    var i = indexes.length, permutes = new Array(i);
    while (i--) permutes[i] = array[indexes[i]];
    return permutes;
  };
  d3.pairs = function(array) {
    var i = 0, n = array.length - 1, p0, p1 = array[0], pairs = new Array(n < 0 ? 0 : n);
    while (i < n) pairs[i] = [ p0 = p1, p1 = array[++i] ];
    return pairs;
  };
  d3.zip = function() {
    if (!(n = arguments.length)) return [];
    for (var i = -1, m = d3.min(arguments, d3_zipLength), zips = new Array(m); ++i < m; ) {
      for (var j = -1, n, zip = zips[i] = new Array(n); ++j < n; ) {
        zip[j] = arguments[j][i];
      }
    }
    return zips;
  };
  function d3_zipLength(d) {
    return d.length;
  }
  d3.transpose = function(matrix) {
    return d3.zip.apply(d3, matrix);
  };
  d3.keys = function(map) {
    var keys = [];
    for (var key in map) keys.push(key);
    return keys;
  };
  d3.values = function(map) {
    var values = [];
    for (var key in map) values.push(map[key]);
    return values;
  };
  d3.entries = function(map) {
    var entries = [];
    for (var key in map) entries.push({
      key: key,
      value: map[key]
    });
    return entries;
  };
  d3.merge = function(arrays) {
    var n = arrays.length, m, i = -1, j = 0, merged, array;
    while (++i < n) j += arrays[i].length;
    merged = new Array(j);
    while (--n >= 0) {
      array = arrays[n];
      m = array.length;
      while (--m >= 0) {
        merged[--j] = array[m];
      }
    }
    return merged;
  };
  var abs = Math.abs;
  d3.range = function(start, stop, step) {
    if (arguments.length < 3) {
      step = 1;
      if (arguments.length < 2) {
        stop = start;
        start = 0;
      }
    }
    if ((stop - start) / step === Infinity) throw new Error("infinite range");
    var range = [], k = d3_range_integerScale(abs(step)), i = -1, j;
    start *= k, stop *= k, step *= k;
    if (step < 0) while ((j = start + step * ++i) > stop) range.push(j / k); else while ((j = start + step * ++i) < stop) range.push(j / k);
    return range;
  };
  function d3_range_integerScale(x) {
    var k = 1;
    while (x * k % 1) k *= 10;
    return k;
  }
  function d3_class(ctor, properties) {
    try {
      for (var key in properties) {
        Object.defineProperty(ctor.prototype, key, {
          value: properties[key],
          enumerable: false
        });
      }
    } catch (e) {
      ctor.prototype = properties;
    }
  }
  d3.map = function(object) {
    var map = new d3_Map();
    if (object instanceof d3_Map) object.forEach(function(key, value) {
      map.set(key, value);
    }); else for (var key in object) map.set(key, object[key]);
    return map;
  };
  function d3_Map() {}
  d3_class(d3_Map, {
    has: d3_map_has,
    get: function(key) {
      return this[d3_map_prefix + key];
    },
    set: function(key, value) {
      return this[d3_map_prefix + key] = value;
    },
    remove: d3_map_remove,
    keys: d3_map_keys,
    values: function() {
      var values = [];
      this.forEach(function(key, value) {
        values.push(value);
      });
      return values;
    },
    entries: function() {
      var entries = [];
      this.forEach(function(key, value) {
        entries.push({
          key: key,
          value: value
        });
      });
      return entries;
    },
    size: d3_map_size,
    empty: d3_map_empty,
    forEach: function(f) {
      for (var key in this) if (key.charCodeAt(0) === d3_map_prefixCode) f.call(this, key.substring(1), this[key]);
    }
  });
  var d3_map_prefix = "\x00", d3_map_prefixCode = d3_map_prefix.charCodeAt(0);
  function d3_map_has(key) {
    return d3_map_prefix + key in this;
  }
  function d3_map_remove(key) {
    key = d3_map_prefix + key;
    return key in this && delete this[key];
  }
  function d3_map_keys() {
    var keys = [];
    this.forEach(function(key) {
      keys.push(key);
    });
    return keys;
  }
  function d3_map_size() {
    var size = 0;
    for (var key in this) if (key.charCodeAt(0) === d3_map_prefixCode) ++size;
    return size;
  }
  function d3_map_empty() {
    for (var key in this) if (key.charCodeAt(0) === d3_map_prefixCode) return false;
    return true;
  }
  d3.nest = function() {
    var nest = {}, keys = [], sortKeys = [], sortValues, rollup;
    function map(mapType, array, depth) {
      if (depth >= keys.length) return rollup ? rollup.call(nest, array) : sortValues ? array.sort(sortValues) : array;
      var i = -1, n = array.length, key = keys[depth++], keyValue, object, setter, valuesByKey = new d3_Map(), values;
      while (++i < n) {
        if (values = valuesByKey.get(keyValue = key(object = array[i]))) {
          values.push(object);
        } else {
          valuesByKey.set(keyValue, [ object ]);
        }
      }
      if (mapType) {
        object = mapType();
        setter = function(keyValue, values) {
          object.set(keyValue, map(mapType, values, depth));
        };
      } else {
        object = {};
        setter = function(keyValue, values) {
          object[keyValue] = map(mapType, values, depth);
        };
      }
      valuesByKey.forEach(setter);
      return object;
    }
    function entries(map, depth) {
      if (depth >= keys.length) return map;
      var array = [], sortKey = sortKeys[depth++];
      map.forEach(function(key, keyMap) {
        array.push({
          key: key,
          values: entries(keyMap, depth)
        });
      });
      return sortKey ? array.sort(function(a, b) {
        return sortKey(a.key, b.key);
      }) : array;
    }
    nest.map = function(array, mapType) {
      return map(mapType, array, 0);
    };
    nest.entries = function(array) {
      return entries(map(d3.map, array, 0), 0);
    };
    nest.key = function(d) {
      keys.push(d);
      return nest;
    };
    nest.sortKeys = function(order) {
      sortKeys[keys.length - 1] = order;
      return nest;
    };
    nest.sortValues = function(order) {
      sortValues = order;
      return nest;
    };
    nest.rollup = function(f) {
      rollup = f;
      return nest;
    };
    return nest;
  };
  d3.set = function(array) {
    var set = new d3_Set();
    if (array) for (var i = 0, n = array.length; i < n; ++i) set.add(array[i]);
    return set;
  };
  function d3_Set() {}
  d3_class(d3_Set, {
    has: d3_map_has,
    add: function(value) {
      this[d3_map_prefix + value] = true;
      return value;
    },
    remove: function(value) {
      value = d3_map_prefix + value;
      return value in this && delete this[value];
    },
    values: d3_map_keys,
    size: d3_map_size,
    empty: d3_map_empty,
    forEach: function(f) {
      for (var value in this) if (value.charCodeAt(0) === d3_map_prefixCode) f.call(this, value.substring(1));
    }
  });
  d3.behavior = {};
  d3.rebind = function(target, source) {
    var i = 1, n = arguments.length, method;
    while (++i < n) target[method = arguments[i]] = d3_rebind(target, source, source[method]);
    return target;
  };
  function d3_rebind(target, source, method) {
    return function() {
      var value = method.apply(source, arguments);
      return value === source ? target : value;
    };
  }
  function d3_vendorSymbol(object, name) {
    if (name in object) return name;
    name = name.charAt(0).toUpperCase() + name.substring(1);
    for (var i = 0, n = d3_vendorPrefixes.length; i < n; ++i) {
      var prefixName = d3_vendorPrefixes[i] + name;
      if (prefixName in object) return prefixName;
    }
  }
  var d3_vendorPrefixes = [ "webkit", "ms", "moz", "Moz", "o", "O" ];
  function d3_noop() {}
  d3.dispatch = function() {
    var dispatch = new d3_dispatch(), i = -1, n = arguments.length;
    while (++i < n) dispatch[arguments[i]] = d3_dispatch_event(dispatch);
    return dispatch;
  };
  function d3_dispatch() {}
  d3_dispatch.prototype.on = function(type, listener) {
    var i = type.indexOf("."), name = "";
    if (i >= 0) {
      name = type.substring(i + 1);
      type = type.substring(0, i);
    }
    if (type) return arguments.length < 2 ? this[type].on(name) : this[type].on(name, listener);
    if (arguments.length === 2) {
      if (listener == null) for (type in this) {
        if (this.hasOwnProperty(type)) this[type].on(name, null);
      }
      return this;
    }
  };
  function d3_dispatch_event(dispatch) {
    var listeners = [], listenerByName = new d3_Map();
    function event() {
      var z = listeners, i = -1, n = z.length, l;
      while (++i < n) if (l = z[i].on) l.apply(this, arguments);
      return dispatch;
    }
    event.on = function(name, listener) {
      var l = listenerByName.get(name), i;
      if (arguments.length < 2) return l && l.on;
      if (l) {
        l.on = null;
        listeners = listeners.slice(0, i = listeners.indexOf(l)).concat(listeners.slice(i + 1));
        listenerByName.remove(name);
      }
      if (listener) listeners.push(listenerByName.set(name, {
        on: listener
      }));
      return dispatch;
    };
    return event;
  }
  d3.event = null;
  function d3_eventPreventDefault() {
    d3.event.preventDefault();
  }
  function d3_eventSource() {
    var e = d3.event, s;
    while (s = e.sourceEvent) e = s;
    return e;
  }
  function d3_eventDispatch(target) {
    var dispatch = new d3_dispatch(), i = 0, n = arguments.length;
    while (++i < n) dispatch[arguments[i]] = d3_dispatch_event(dispatch);
    dispatch.of = function(thiz, argumentz) {
      return function(e1) {
        try {
          var e0 = e1.sourceEvent = d3.event;
          e1.target = target;
          d3.event = e1;
          dispatch[e1.type].apply(thiz, argumentz);
        } finally {
          d3.event = e0;
        }
      };
    };
    return dispatch;
  }
  d3.requote = function(s) {
    return s.replace(d3_requote_re, "\\$&");
  };
  var d3_requote_re = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;
  var d3_subclass = {}.__proto__ ? function(object, prototype) {
    object.__proto__ = prototype;
  } : function(object, prototype) {
    for (var property in prototype) object[property] = prototype[property];
  };
  function d3_selection(groups) {
    d3_subclass(groups, d3_selectionPrototype);
    return groups;
  }
  var d3_select = function(s, n) {
    return n.querySelector(s);
  }, d3_selectAll = function(s, n) {
    return n.querySelectorAll(s);
  }, d3_selectMatcher = d3_documentElement[d3_vendorSymbol(d3_documentElement, "matchesSelector")], d3_selectMatches = function(n, s) {
    return d3_selectMatcher.call(n, s);
  };
  if (typeof Sizzle === "function") {
    d3_select = function(s, n) {
      return Sizzle(s, n)[0] || null;
    };
    d3_selectAll = function(s, n) {
      return Sizzle.uniqueSort(Sizzle(s, n));
    };
    d3_selectMatches = Sizzle.matchesSelector;
  }
  d3.selection = function() {
    return d3_selectionRoot;
  };
  var d3_selectionPrototype = d3.selection.prototype = [];
  d3_selectionPrototype.select = function(selector) {
    var subgroups = [], subgroup, subnode, group, node;
    selector = d3_selection_selector(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      subgroup.parentNode = (group = this[j]).parentNode;
      for (var i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroup.push(subnode = selector.call(node, node.__data__, i, j));
          if (subnode && "__data__" in node) subnode.__data__ = node.__data__;
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_selector(selector) {
    return typeof selector === "function" ? selector : function() {
      return d3_select(selector, this);
    };
  }
  d3_selectionPrototype.selectAll = function(selector) {
    var subgroups = [], subgroup, node;
    selector = d3_selection_selectorAll(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroups.push(subgroup = d3_array(selector.call(node, node.__data__, i, j)));
          subgroup.parentNode = node;
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_selectorAll(selector) {
    return typeof selector === "function" ? selector : function() {
      return d3_selectAll(selector, this);
    };
  }
  var d3_nsPrefix = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: "http://www.w3.org/1999/xhtml",
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };
  d3.ns = {
    prefix: d3_nsPrefix,
    qualify: function(name) {
      var i = name.indexOf(":"), prefix = name;
      if (i >= 0) {
        prefix = name.substring(0, i);
        name = name.substring(i + 1);
      }
      return d3_nsPrefix.hasOwnProperty(prefix) ? {
        space: d3_nsPrefix[prefix],
        local: name
      } : name;
    }
  };
  d3_selectionPrototype.attr = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") {
        var node = this.node();
        name = d3.ns.qualify(name);
        return name.local ? node.getAttributeNS(name.space, name.local) : node.getAttribute(name);
      }
      for (value in name) this.each(d3_selection_attr(value, name[value]));
      return this;
    }
    return this.each(d3_selection_attr(name, value));
  };
  function d3_selection_attr(name, value) {
    name = d3.ns.qualify(name);
    function attrNull() {
      this.removeAttribute(name);
    }
    function attrNullNS() {
      this.removeAttributeNS(name.space, name.local);
    }
    function attrConstant() {
      this.setAttribute(name, value);
    }
    function attrConstantNS() {
      this.setAttributeNS(name.space, name.local, value);
    }
    function attrFunction() {
      var x = value.apply(this, arguments);
      if (x == null) this.removeAttribute(name); else this.setAttribute(name, x);
    }
    function attrFunctionNS() {
      var x = value.apply(this, arguments);
      if (x == null) this.removeAttributeNS(name.space, name.local); else this.setAttributeNS(name.space, name.local, x);
    }
    return value == null ? name.local ? attrNullNS : attrNull : typeof value === "function" ? name.local ? attrFunctionNS : attrFunction : name.local ? attrConstantNS : attrConstant;
  }
  function d3_collapse(s) {
    return s.trim().replace(/\s+/g, " ");
  }
  d3_selectionPrototype.classed = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") {
        var node = this.node(), n = (name = d3_selection_classes(name)).length, i = -1;
        if (value = node.classList) {
          while (++i < n) if (!value.contains(name[i])) return false;
        } else {
          value = node.getAttribute("class");
          while (++i < n) if (!d3_selection_classedRe(name[i]).test(value)) return false;
        }
        return true;
      }
      for (value in name) this.each(d3_selection_classed(value, name[value]));
      return this;
    }
    return this.each(d3_selection_classed(name, value));
  };
  function d3_selection_classedRe(name) {
    return new RegExp("(?:^|\\s+)" + d3.requote(name) + "(?:\\s+|$)", "g");
  }
  function d3_selection_classes(name) {
    return name.trim().split(/^|\s+/);
  }
  function d3_selection_classed(name, value) {
    name = d3_selection_classes(name).map(d3_selection_classedName);
    var n = name.length;
    function classedConstant() {
      var i = -1;
      while (++i < n) name[i](this, value);
    }
    function classedFunction() {
      var i = -1, x = value.apply(this, arguments);
      while (++i < n) name[i](this, x);
    }
    return typeof value === "function" ? classedFunction : classedConstant;
  }
  function d3_selection_classedName(name) {
    var re = d3_selection_classedRe(name);
    return function(node, value) {
      if (c = node.classList) return value ? c.add(name) : c.remove(name);
      var c = node.getAttribute("class") || "";
      if (value) {
        re.lastIndex = 0;
        if (!re.test(c)) node.setAttribute("class", d3_collapse(c + " " + name));
      } else {
        node.setAttribute("class", d3_collapse(c.replace(re, " ")));
      }
    };
  }
  d3_selectionPrototype.style = function(name, value, priority) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof name !== "string") {
        if (n < 2) value = "";
        for (priority in name) this.each(d3_selection_style(priority, name[priority], value));
        return this;
      }
      if (n < 2) return d3_window.getComputedStyle(this.node(), null).getPropertyValue(name);
      priority = "";
    }
    return this.each(d3_selection_style(name, value, priority));
  };
  function d3_selection_style(name, value, priority) {
    function styleNull() {
      this.style.removeProperty(name);
    }
    function styleConstant() {
      this.style.setProperty(name, value, priority);
    }
    function styleFunction() {
      var x = value.apply(this, arguments);
      if (x == null) this.style.removeProperty(name); else this.style.setProperty(name, x, priority);
    }
    return value == null ? styleNull : typeof value === "function" ? styleFunction : styleConstant;
  }
  d3_selectionPrototype.property = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") return this.node()[name];
      for (value in name) this.each(d3_selection_property(value, name[value]));
      return this;
    }
    return this.each(d3_selection_property(name, value));
  };
  function d3_selection_property(name, value) {
    function propertyNull() {
      delete this[name];
    }
    function propertyConstant() {
      this[name] = value;
    }
    function propertyFunction() {
      var x = value.apply(this, arguments);
      if (x == null) delete this[name]; else this[name] = x;
    }
    return value == null ? propertyNull : typeof value === "function" ? propertyFunction : propertyConstant;
  }
  d3_selectionPrototype.text = function(value) {
    return arguments.length ? this.each(typeof value === "function" ? function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    } : value == null ? function() {
      this.textContent = "";
    } : function() {
      this.textContent = value;
    }) : this.node().textContent;
  };
  d3_selectionPrototype.html = function(value) {
    return arguments.length ? this.each(typeof value === "function" ? function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    } : value == null ? function() {
      this.innerHTML = "";
    } : function() {
      this.innerHTML = value;
    }) : this.node().innerHTML;
  };
  d3_selectionPrototype.append = function(name) {
    name = d3_selection_creator(name);
    return this.select(function() {
      return this.appendChild(name.apply(this, arguments));
    });
  };
  function d3_selection_creator(name) {
    return typeof name === "function" ? name : (name = d3.ns.qualify(name)).local ? function() {
      return this.ownerDocument.createElementNS(name.space, name.local);
    } : function() {
      return this.ownerDocument.createElementNS(this.namespaceURI, name);
    };
  }
  d3_selectionPrototype.insert = function(name, before) {
    name = d3_selection_creator(name);
    before = d3_selection_selector(before);
    return this.select(function() {
      return this.insertBefore(name.apply(this, arguments), before.apply(this, arguments) || null);
    });
  };
  d3_selectionPrototype.remove = function() {
    return this.each(function() {
      var parent = this.parentNode;
      if (parent) parent.removeChild(this);
    });
  };
  d3_selectionPrototype.data = function(value, key) {
    var i = -1, n = this.length, group, node;
    if (!arguments.length) {
      value = new Array(n = (group = this[0]).length);
      while (++i < n) {
        if (node = group[i]) {
          value[i] = node.__data__;
        }
      }
      return value;
    }
    function bind(group, groupData) {
      var i, n = group.length, m = groupData.length, n0 = Math.min(n, m), updateNodes = new Array(m), enterNodes = new Array(m), exitNodes = new Array(n), node, nodeData;
      if (key) {
        var nodeByKeyValue = new d3_Map(), dataByKeyValue = new d3_Map(), keyValues = [], keyValue;
        for (i = -1; ++i < n; ) {
          keyValue = key.call(node = group[i], node.__data__, i);
          if (nodeByKeyValue.has(keyValue)) {
            exitNodes[i] = node;
          } else {
            nodeByKeyValue.set(keyValue, node);
          }
          keyValues.push(keyValue);
        }
        for (i = -1; ++i < m; ) {
          keyValue = key.call(groupData, nodeData = groupData[i], i);
          if (node = nodeByKeyValue.get(keyValue)) {
            updateNodes[i] = node;
            node.__data__ = nodeData;
          } else if (!dataByKeyValue.has(keyValue)) {
            enterNodes[i] = d3_selection_dataNode(nodeData);
          }
          dataByKeyValue.set(keyValue, nodeData);
          nodeByKeyValue.remove(keyValue);
        }
        for (i = -1; ++i < n; ) {
          if (nodeByKeyValue.has(keyValues[i])) {
            exitNodes[i] = group[i];
          }
        }
      } else {
        for (i = -1; ++i < n0; ) {
          node = group[i];
          nodeData = groupData[i];
          if (node) {
            node.__data__ = nodeData;
            updateNodes[i] = node;
          } else {
            enterNodes[i] = d3_selection_dataNode(nodeData);
          }
        }
        for (;i < m; ++i) {
          enterNodes[i] = d3_selection_dataNode(groupData[i]);
        }
        for (;i < n; ++i) {
          exitNodes[i] = group[i];
        }
      }
      enterNodes.update = updateNodes;
      enterNodes.parentNode = updateNodes.parentNode = exitNodes.parentNode = group.parentNode;
      enter.push(enterNodes);
      update.push(updateNodes);
      exit.push(exitNodes);
    }
    var enter = d3_selection_enter([]), update = d3_selection([]), exit = d3_selection([]);
    if (typeof value === "function") {
      while (++i < n) {
        bind(group = this[i], value.call(group, group.parentNode.__data__, i));
      }
    } else {
      while (++i < n) {
        bind(group = this[i], value);
      }
    }
    update.enter = function() {
      return enter;
    };
    update.exit = function() {
      return exit;
    };
    return update;
  };
  function d3_selection_dataNode(data) {
    return {
      __data__: data
    };
  }
  d3_selectionPrototype.datum = function(value) {
    return arguments.length ? this.property("__data__", value) : this.property("__data__");
  };
  d3_selectionPrototype.filter = function(filter) {
    var subgroups = [], subgroup, group, node;
    if (typeof filter !== "function") filter = d3_selection_filter(filter);
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      subgroup.parentNode = (group = this[j]).parentNode;
      for (var i = 0, n = group.length; i < n; i++) {
        if ((node = group[i]) && filter.call(node, node.__data__, i, j)) {
          subgroup.push(node);
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_filter(selector) {
    return function() {
      return d3_selectMatches(this, selector);
    };
  }
  d3_selectionPrototype.order = function() {
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
        if (node = group[i]) {
          if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }
    return this;
  };
  d3_selectionPrototype.sort = function(comparator) {
    comparator = d3_selection_sortComparator.apply(this, arguments);
    for (var j = -1, m = this.length; ++j < m; ) this[j].sort(comparator);
    return this.order();
  };
  function d3_selection_sortComparator(comparator) {
    if (!arguments.length) comparator = d3.ascending;
    return function(a, b) {
      return a && b ? comparator(a.__data__, b.__data__) : !a - !b;
    };
  }
  d3_selectionPrototype.each = function(callback) {
    return d3_selection_each(this, function(node, i, j) {
      callback.call(node, node.__data__, i, j);
    });
  };
  function d3_selection_each(groups, callback) {
    for (var j = 0, m = groups.length; j < m; j++) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; i++) {
        if (node = group[i]) callback(node, i, j);
      }
    }
    return groups;
  }
  d3_selectionPrototype.call = function(callback) {
    var args = d3_array(arguments);
    callback.apply(args[0] = this, args);
    return this;
  };
  d3_selectionPrototype.empty = function() {
    return !this.node();
  };
  d3_selectionPrototype.node = function() {
    for (var j = 0, m = this.length; j < m; j++) {
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        var node = group[i];
        if (node) return node;
      }
    }
    return null;
  };
  d3_selectionPrototype.size = function() {
    var n = 0;
    this.each(function() {
      ++n;
    });
    return n;
  };
  function d3_selection_enter(selection) {
    d3_subclass(selection, d3_selection_enterPrototype);
    return selection;
  }
  var d3_selection_enterPrototype = [];
  d3.selection.enter = d3_selection_enter;
  d3.selection.enter.prototype = d3_selection_enterPrototype;
  d3_selection_enterPrototype.append = d3_selectionPrototype.append;
  d3_selection_enterPrototype.empty = d3_selectionPrototype.empty;
  d3_selection_enterPrototype.node = d3_selectionPrototype.node;
  d3_selection_enterPrototype.call = d3_selectionPrototype.call;
  d3_selection_enterPrototype.size = d3_selectionPrototype.size;
  d3_selection_enterPrototype.select = function(selector) {
    var subgroups = [], subgroup, subnode, upgroup, group, node;
    for (var j = -1, m = this.length; ++j < m; ) {
      upgroup = (group = this[j]).update;
      subgroups.push(subgroup = []);
      subgroup.parentNode = group.parentNode;
      for (var i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroup.push(upgroup[i] = subnode = selector.call(group.parentNode, node.__data__, i, j));
          subnode.__data__ = node.__data__;
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_selection(subgroups);
  };
  d3_selection_enterPrototype.insert = function(name, before) {
    if (arguments.length < 2) before = d3_selection_enterInsertBefore(this);
    return d3_selectionPrototype.insert.call(this, name, before);
  };
  function d3_selection_enterInsertBefore(enter) {
    var i0, j0;
    return function(d, i, j) {
      var group = enter[j].update, n = group.length, node;
      if (j != j0) j0 = j, i0 = 0;
      if (i >= i0) i0 = i + 1;
      while (!(node = group[i0]) && ++i0 < n) ;
      return node;
    };
  }
  d3_selectionPrototype.transition = function() {
    var id = d3_transitionInheritId || ++d3_transitionId, subgroups = [], subgroup, node, transition = d3_transitionInherit || {
      time: Date.now(),
      ease: d3_ease_cubicInOut,
      delay: 0,
      duration: 250
    };
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) d3_transitionNode(node, i, id, transition);
        subgroup.push(node);
      }
    }
    return d3_transition(subgroups, id);
  };
  d3_selectionPrototype.interrupt = function() {
    return this.each(d3_selection_interrupt);
  };
  function d3_selection_interrupt() {
    var lock = this.__transition__;
    if (lock) ++lock.active;
  }
  d3.select = function(node) {
    var group = [ typeof node === "string" ? d3_select(node, d3_document) : node ];
    group.parentNode = d3_documentElement;
    return d3_selection([ group ]);
  };
  d3.selectAll = function(nodes) {
    var group = d3_array(typeof nodes === "string" ? d3_selectAll(nodes, d3_document) : nodes);
    group.parentNode = d3_documentElement;
    return d3_selection([ group ]);
  };
  var d3_selectionRoot = d3.select(d3_documentElement);
  d3_selectionPrototype.on = function(type, listener, capture) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof type !== "string") {
        if (n < 2) listener = false;
        for (capture in type) this.each(d3_selection_on(capture, type[capture], listener));
        return this;
      }
      if (n < 2) return (n = this.node()["__on" + type]) && n._;
      capture = false;
    }
    return this.each(d3_selection_on(type, listener, capture));
  };
  function d3_selection_on(type, listener, capture) {
    var name = "__on" + type, i = type.indexOf("."), wrap = d3_selection_onListener;
    if (i > 0) type = type.substring(0, i);
    var filter = d3_selection_onFilters.get(type);
    if (filter) type = filter, wrap = d3_selection_onFilter;
    function onRemove() {
      var l = this[name];
      if (l) {
        this.removeEventListener(type, l, l.$);
        delete this[name];
      }
    }
    function onAdd() {
      var l = wrap(listener, d3_array(arguments));
      onRemove.call(this);
      this.addEventListener(type, this[name] = l, l.$ = capture);
      l._ = listener;
    }
    function removeAll() {
      var re = new RegExp("^__on([^.]+)" + d3.requote(type) + "$"), match;
      for (var name in this) {
        if (match = name.match(re)) {
          var l = this[name];
          this.removeEventListener(match[1], l, l.$);
          delete this[name];
        }
      }
    }
    return i ? listener ? onAdd : onRemove : listener ? d3_noop : removeAll;
  }
  var d3_selection_onFilters = d3.map({
    mouseenter: "mouseover",
    mouseleave: "mouseout"
  });
  d3_selection_onFilters.forEach(function(k) {
    if ("on" + k in d3_document) d3_selection_onFilters.remove(k);
  });
  function d3_selection_onListener(listener, argumentz) {
    return function(e) {
      var o = d3.event;
      d3.event = e;
      argumentz[0] = this.__data__;
      try {
        listener.apply(this, argumentz);
      } finally {
        d3.event = o;
      }
    };
  }
  function d3_selection_onFilter(listener, argumentz) {
    var l = d3_selection_onListener(listener, argumentz);
    return function(e) {
      var target = this, related = e.relatedTarget;
      if (!related || related !== target && !(related.compareDocumentPosition(target) & 8)) {
        l.call(target, e);
      }
    };
  }
  var d3_event_dragSelect = "onselectstart" in d3_document ? null : d3_vendorSymbol(d3_documentElement.style, "userSelect"), d3_event_dragId = 0;
  function d3_event_dragSuppress() {
    var name = ".dragsuppress-" + ++d3_event_dragId, click = "click" + name, w = d3.select(d3_window).on("touchmove" + name, d3_eventPreventDefault).on("dragstart" + name, d3_eventPreventDefault).on("selectstart" + name, d3_eventPreventDefault);
    if (d3_event_dragSelect) {
      var style = d3_documentElement.style, select = style[d3_event_dragSelect];
      style[d3_event_dragSelect] = "none";
    }
    return function(suppressClick) {
      w.on(name, null);
      if (d3_event_dragSelect) style[d3_event_dragSelect] = select;
      if (suppressClick) {
        function off() {
          w.on(click, null);
        }
        w.on(click, function() {
          d3_eventPreventDefault();
          off();
        }, true);
        setTimeout(off, 0);
      }
    };
  }
  d3.mouse = function(container) {
    return d3_mousePoint(container, d3_eventSource());
  };
  var d3_mouse_bug44083 = /WebKit/.test(d3_window.navigator.userAgent) ? -1 : 0;
  function d3_mousePoint(container, e) {
    if (e.changedTouches) e = e.changedTouches[0];
    var svg = container.ownerSVGElement || container;
    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      if (d3_mouse_bug44083 < 0 && (d3_window.scrollX || d3_window.scrollY)) {
        svg = d3.select("body").append("svg").style({
          position: "absolute",
          top: 0,
          left: 0,
          margin: 0,
          padding: 0,
          border: "none"
        }, "important");
        var ctm = svg[0][0].getScreenCTM();
        d3_mouse_bug44083 = !(ctm.f || ctm.e);
        svg.remove();
      }
      if (d3_mouse_bug44083) point.x = e.pageX, point.y = e.pageY; else point.x = e.clientX, 
      point.y = e.clientY;
      point = point.matrixTransform(container.getScreenCTM().inverse());
      return [ point.x, point.y ];
    }
    var rect = container.getBoundingClientRect();
    return [ e.clientX - rect.left - container.clientLeft, e.clientY - rect.top - container.clientTop ];
  }
  d3.touches = function(container, touches) {
    if (arguments.length < 2) touches = d3_eventSource().touches;
    return touches ? d3_array(touches).map(function(touch) {
      var point = d3_mousePoint(container, touch);
      point.identifier = touch.identifier;
      return point;
    }) : [];
  };
  d3.behavior.drag = function() {
    var event = d3_eventDispatch(drag, "drag", "dragstart", "dragend"), origin = null, mousedown = dragstart(d3_noop, d3.mouse, "mousemove", "mouseup"), touchstart = dragstart(touchid, touchposition, "touchmove", "touchend");
    function drag() {
      this.on("mousedown.drag", mousedown).on("touchstart.drag", touchstart);
    }
    function touchid() {
      return d3.event.changedTouches[0].identifier;
    }
    function touchposition(parent, id) {
      return d3.touches(parent).filter(function(p) {
        return p.identifier === id;
      })[0];
    }
    function dragstart(id, position, move, end) {
      return function() {
        var target = this, parent = target.parentNode, event_ = event.of(target, arguments), eventTarget = d3.event.target, eventId = id(), drag = eventId == null ? "drag" : "drag-" + eventId, origin_ = position(parent, eventId), dragged = 0, offset, w = d3.select(d3_window).on(move + "." + drag, moved).on(end + "." + drag, ended), dragRestore = d3_event_dragSuppress();
        if (origin) {
          offset = origin.apply(target, arguments);
          offset = [ offset.x - origin_[0], offset.y - origin_[1] ];
        } else {
          offset = [ 0, 0 ];
        }
        event_({
          type: "dragstart"
        });
        function moved() {
          var p = position(parent, eventId), dx = p[0] - origin_[0], dy = p[1] - origin_[1];
          dragged |= dx | dy;
          origin_ = p;
          event_({
            type: "drag",
            x: p[0] + offset[0],
            y: p[1] + offset[1],
            dx: dx,
            dy: dy
          });
        }
        function ended() {
          w.on(move + "." + drag, null).on(end + "." + drag, null);
          dragRestore(dragged && d3.event.target === eventTarget);
          event_({
            type: "dragend"
          });
        }
      };
    }
    drag.origin = function(x) {
      if (!arguments.length) return origin;
      origin = x;
      return drag;
    };
    return d3.rebind(drag, event, "on");
  };
  var π = Math.PI, τ = 2 * π, halfπ = π / 2, ε = 1e-6, ε2 = ε * ε, d3_radians = π / 180, d3_degrees = 180 / π;
  function d3_sgn(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  }
  function d3_cross2d(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  }
  function d3_acos(x) {
    return x > 1 ? 0 : x < -1 ? π : Math.acos(x);
  }
  function d3_asin(x) {
    return x > 1 ? halfπ : x < -1 ? -halfπ : Math.asin(x);
  }
  function d3_sinh(x) {
    return ((x = Math.exp(x)) - 1 / x) / 2;
  }
  function d3_cosh(x) {
    return ((x = Math.exp(x)) + 1 / x) / 2;
  }
  function d3_tanh(x) {
    return ((x = Math.exp(2 * x)) - 1) / (x + 1);
  }
  function d3_haversin(x) {
    return (x = Math.sin(x / 2)) * x;
  }
  var ρ = Math.SQRT2, ρ2 = 2, ρ4 = 4;
  d3.interpolateZoom = function(p0, p1) {
    var ux0 = p0[0], uy0 = p0[1], w0 = p0[2], ux1 = p1[0], uy1 = p1[1], w1 = p1[2];
    var dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy, d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + ρ4 * d2) / (2 * w0 * ρ2 * d1), b1 = (w1 * w1 - w0 * w0 - ρ4 * d2) / (2 * w1 * ρ2 * d1), r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1), dr = r1 - r0, S = (dr || Math.log(w1 / w0)) / ρ;
    function interpolate(t) {
      var s = t * S;
      if (dr) {
        var coshr0 = d3_cosh(r0), u = w0 / (ρ2 * d1) * (coshr0 * d3_tanh(ρ * s + r0) - d3_sinh(r0));
        return [ ux0 + u * dx, uy0 + u * dy, w0 * coshr0 / d3_cosh(ρ * s + r0) ];
      }
      return [ ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(ρ * s) ];
    }
    interpolate.duration = S * 1e3;
    return interpolate;
  };
  d3.behavior.zoom = function() {
    var view = {
      x: 0,
      y: 0,
      k: 1
    }, translate0, center, size = [ 960, 500 ], scaleExtent = d3_behavior_zoomInfinity, mousedown = "mousedown.zoom", mousemove = "mousemove.zoom", mouseup = "mouseup.zoom", mousewheelTimer, touchstart = "touchstart.zoom", touchtime, event = d3_eventDispatch(zoom, "zoomstart", "zoom", "zoomend"), x0, x1, y0, y1;
    function zoom(g) {
      g.on(mousedown, mousedowned).on(d3_behavior_zoomWheel + ".zoom", mousewheeled).on(mousemove, mousewheelreset).on("dblclick.zoom", dblclicked).on(touchstart, touchstarted);
    }
    zoom.event = function(g) {
      g.each(function() {
        var event_ = event.of(this, arguments), view1 = view;
        if (d3_transitionInheritId) {
          d3.select(this).transition().each("start.zoom", function() {
            view = this.__chart__ || {
              x: 0,
              y: 0,
              k: 1
            };
            zoomstarted(event_);
          }).tween("zoom:zoom", function() {
            var dx = size[0], dy = size[1], cx = dx / 2, cy = dy / 2, i = d3.interpolateZoom([ (cx - view.x) / view.k, (cy - view.y) / view.k, dx / view.k ], [ (cx - view1.x) / view1.k, (cy - view1.y) / view1.k, dx / view1.k ]);
            return function(t) {
              var l = i(t), k = dx / l[2];
              this.__chart__ = view = {
                x: cx - l[0] * k,
                y: cy - l[1] * k,
                k: k
              };
              zoomed(event_);
            };
          }).each("end.zoom", function() {
            zoomended(event_);
          });
        } else {
          this.__chart__ = view;
          zoomstarted(event_);
          zoomed(event_);
          zoomended(event_);
        }
      });
    };
    zoom.translate = function(_) {
      if (!arguments.length) return [ view.x, view.y ];
      view = {
        x: +_[0],
        y: +_[1],
        k: view.k
      };
      rescale();
      return zoom;
    };
    zoom.scale = function(_) {
      if (!arguments.length) return view.k;
      view = {
        x: view.x,
        y: view.y,
        k: +_
      };
      rescale();
      return zoom;
    };
    zoom.scaleExtent = function(_) {
      if (!arguments.length) return scaleExtent;
      scaleExtent = _ == null ? d3_behavior_zoomInfinity : [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.center = function(_) {
      if (!arguments.length) return center;
      center = _ && [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.size = function(_) {
      if (!arguments.length) return size;
      size = _ && [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.x = function(z) {
      if (!arguments.length) return x1;
      x1 = z;
      x0 = z.copy();
      view = {
        x: 0,
        y: 0,
        k: 1
      };
      return zoom;
    };
    zoom.y = function(z) {
      if (!arguments.length) return y1;
      y1 = z;
      y0 = z.copy();
      view = {
        x: 0,
        y: 0,
        k: 1
      };
      return zoom;
    };
    function location(p) {
      return [ (p[0] - view.x) / view.k, (p[1] - view.y) / view.k ];
    }
    function point(l) {
      return [ l[0] * view.k + view.x, l[1] * view.k + view.y ];
    }
    function scaleTo(s) {
      view.k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], s));
    }
    function translateTo(p, l) {
      l = point(l);
      view.x += p[0] - l[0];
      view.y += p[1] - l[1];
    }
    function rescale() {
      if (x1) x1.domain(x0.range().map(function(x) {
        return (x - view.x) / view.k;
      }).map(x0.invert));
      if (y1) y1.domain(y0.range().map(function(y) {
        return (y - view.y) / view.k;
      }).map(y0.invert));
    }
    function zoomstarted(event) {
      event({
        type: "zoomstart"
      });
    }
    function zoomed(event) {
      rescale();
      event({
        type: "zoom",
        scale: view.k,
        translate: [ view.x, view.y ]
      });
    }
    function zoomended(event) {
      event({
        type: "zoomend"
      });
    }
    function mousedowned() {
      var target = this, event_ = event.of(target, arguments), eventTarget = d3.event.target, dragged = 0, w = d3.select(d3_window).on(mousemove, moved).on(mouseup, ended), l = location(d3.mouse(target)), dragRestore = d3_event_dragSuppress();
      d3_selection_interrupt.call(target);
      zoomstarted(event_);
      function moved() {
        dragged = 1;
        translateTo(d3.mouse(target), l);
        zoomed(event_);
      }
      function ended() {
        w.on(mousemove, d3_window === target ? mousewheelreset : null).on(mouseup, null);
        dragRestore(dragged && d3.event.target === eventTarget);
        zoomended(event_);
      }
    }
    function touchstarted() {
      var target = this, event_ = event.of(target, arguments), locations0 = {}, distance0 = 0, scale0, eventId = d3.event.changedTouches[0].identifier, touchmove = "touchmove.zoom-" + eventId, touchend = "touchend.zoom-" + eventId, w = d3.select(d3_window).on(touchmove, moved).on(touchend, ended), t = d3.select(target).on(mousedown, null).on(touchstart, started), dragRestore = d3_event_dragSuppress();
      d3_selection_interrupt.call(target);
      started();
      zoomstarted(event_);
      function relocate() {
        var touches = d3.touches(target);
        scale0 = view.k;
        touches.forEach(function(t) {
          if (t.identifier in locations0) locations0[t.identifier] = location(t);
        });
        return touches;
      }
      function started() {
        var changed = d3.event.changedTouches;
        for (var i = 0, n = changed.length; i < n; ++i) {
          locations0[changed[i].identifier] = null;
        }
        var touches = relocate(), now = Date.now();
        if (touches.length === 1) {
          if (now - touchtime < 500) {
            var p = touches[0], l = locations0[p.identifier];
            scaleTo(view.k * 2);
            translateTo(p, l);
            d3_eventPreventDefault();
            zoomed(event_);
          }
          touchtime = now;
        } else if (touches.length > 1) {
          var p = touches[0], q = touches[1], dx = p[0] - q[0], dy = p[1] - q[1];
          distance0 = dx * dx + dy * dy;
        }
      }
      function moved() {
        var touches = d3.touches(target), p0, l0, p1, l1;
        for (var i = 0, n = touches.length; i < n; ++i, l1 = null) {
          p1 = touches[i];
          if (l1 = locations0[p1.identifier]) {
            if (l0) break;
            p0 = p1, l0 = l1;
          }
        }
        if (l1) {
          var distance1 = (distance1 = p1[0] - p0[0]) * distance1 + (distance1 = p1[1] - p0[1]) * distance1, scale1 = distance0 && Math.sqrt(distance1 / distance0);
          p0 = [ (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 ];
          l0 = [ (l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2 ];
          scaleTo(scale1 * scale0);
        }
        touchtime = null;
        translateTo(p0, l0);
        zoomed(event_);
      }
      function ended() {
        if (d3.event.touches.length) {
          var changed = d3.event.changedTouches;
          for (var i = 0, n = changed.length; i < n; ++i) {
            delete locations0[changed[i].identifier];
          }
          for (var identifier in locations0) {
            return void relocate();
          }
        }
        w.on(touchmove, null).on(touchend, null);
        t.on(mousedown, mousedowned).on(touchstart, touchstarted);
        dragRestore();
        zoomended(event_);
      }
    }
    function mousewheeled() {
      var event_ = event.of(this, arguments);
      if (mousewheelTimer) clearTimeout(mousewheelTimer); else d3_selection_interrupt.call(this), 
      zoomstarted(event_);
      mousewheelTimer = setTimeout(function() {
        mousewheelTimer = null;
        zoomended(event_);
      }, 50);
      d3_eventPreventDefault();
      var point = center || d3.mouse(this);
      if (!translate0) translate0 = location(point);
      scaleTo(Math.pow(2, d3_behavior_zoomDelta() * .002) * view.k);
      translateTo(point, translate0);
      zoomed(event_);
    }
    function mousewheelreset() {
      translate0 = null;
    }
    function dblclicked() {
      var event_ = event.of(this, arguments), p = d3.mouse(this), l = location(p), k = Math.log(view.k) / Math.LN2;
      zoomstarted(event_);
      scaleTo(Math.pow(2, d3.event.shiftKey ? Math.ceil(k) - 1 : Math.floor(k) + 1));
      translateTo(p, l);
      zoomed(event_);
      zoomended(event_);
    }
    return d3.rebind(zoom, event, "on");
  };
  var d3_behavior_zoomInfinity = [ 0, Infinity ];
  var d3_behavior_zoomDelta, d3_behavior_zoomWheel = "onwheel" in d3_document ? (d3_behavior_zoomDelta = function() {
    return -d3.event.deltaY * (d3.event.deltaMode ? 120 : 1);
  }, "wheel") : "onmousewheel" in d3_document ? (d3_behavior_zoomDelta = function() {
    return d3.event.wheelDelta;
  }, "mousewheel") : (d3_behavior_zoomDelta = function() {
    return -d3.event.detail;
  }, "MozMousePixelScroll");
  function d3_Color() {}
  d3_Color.prototype.toString = function() {
    return this.rgb() + "";
  };
  d3.hsl = function(h, s, l) {
    return arguments.length === 1 ? h instanceof d3_Hsl ? d3_hsl(h.h, h.s, h.l) : d3_rgb_parse("" + h, d3_rgb_hsl, d3_hsl) : d3_hsl(+h, +s, +l);
  };
  function d3_hsl(h, s, l) {
    return new d3_Hsl(h, s, l);
  }
  function d3_Hsl(h, s, l) {
    this.h = h;
    this.s = s;
    this.l = l;
  }
  var d3_hslPrototype = d3_Hsl.prototype = new d3_Color();
  d3_hslPrototype.brighter = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return d3_hsl(this.h, this.s, this.l / k);
  };
  d3_hslPrototype.darker = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return d3_hsl(this.h, this.s, k * this.l);
  };
  d3_hslPrototype.rgb = function() {
    return d3_hsl_rgb(this.h, this.s, this.l);
  };
  function d3_hsl_rgb(h, s, l) {
    var m1, m2;
    h = isNaN(h) ? 0 : (h %= 360) < 0 ? h + 360 : h;
    s = isNaN(s) ? 0 : s < 0 ? 0 : s > 1 ? 1 : s;
    l = l < 0 ? 0 : l > 1 ? 1 : l;
    m2 = l <= .5 ? l * (1 + s) : l + s - l * s;
    m1 = 2 * l - m2;
    function v(h) {
      if (h > 360) h -= 360; else if (h < 0) h += 360;
      if (h < 60) return m1 + (m2 - m1) * h / 60;
      if (h < 180) return m2;
      if (h < 240) return m1 + (m2 - m1) * (240 - h) / 60;
      return m1;
    }
    function vv(h) {
      return Math.round(v(h) * 255);
    }
    return d3_rgb(vv(h + 120), vv(h), vv(h - 120));
  }
  d3.hcl = function(h, c, l) {
    return arguments.length === 1 ? h instanceof d3_Hcl ? d3_hcl(h.h, h.c, h.l) : h instanceof d3_Lab ? d3_lab_hcl(h.l, h.a, h.b) : d3_lab_hcl((h = d3_rgb_lab((h = d3.rgb(h)).r, h.g, h.b)).l, h.a, h.b) : d3_hcl(+h, +c, +l);
  };
  function d3_hcl(h, c, l) {
    return new d3_Hcl(h, c, l);
  }
  function d3_Hcl(h, c, l) {
    this.h = h;
    this.c = c;
    this.l = l;
  }
  var d3_hclPrototype = d3_Hcl.prototype = new d3_Color();
  d3_hclPrototype.brighter = function(k) {
    return d3_hcl(this.h, this.c, Math.min(100, this.l + d3_lab_K * (arguments.length ? k : 1)));
  };
  d3_hclPrototype.darker = function(k) {
    return d3_hcl(this.h, this.c, Math.max(0, this.l - d3_lab_K * (arguments.length ? k : 1)));
  };
  d3_hclPrototype.rgb = function() {
    return d3_hcl_lab(this.h, this.c, this.l).rgb();
  };
  function d3_hcl_lab(h, c, l) {
    if (isNaN(h)) h = 0;
    if (isNaN(c)) c = 0;
    return d3_lab(l, Math.cos(h *= d3_radians) * c, Math.sin(h) * c);
  }
  d3.lab = function(l, a, b) {
    return arguments.length === 1 ? l instanceof d3_Lab ? d3_lab(l.l, l.a, l.b) : l instanceof d3_Hcl ? d3_hcl_lab(l.l, l.c, l.h) : d3_rgb_lab((l = d3.rgb(l)).r, l.g, l.b) : d3_lab(+l, +a, +b);
  };
  function d3_lab(l, a, b) {
    return new d3_Lab(l, a, b);
  }
  function d3_Lab(l, a, b) {
    this.l = l;
    this.a = a;
    this.b = b;
  }
  var d3_lab_K = 18;
  var d3_lab_X = .95047, d3_lab_Y = 1, d3_lab_Z = 1.08883;
  var d3_labPrototype = d3_Lab.prototype = new d3_Color();
  d3_labPrototype.brighter = function(k) {
    return d3_lab(Math.min(100, this.l + d3_lab_K * (arguments.length ? k : 1)), this.a, this.b);
  };
  d3_labPrototype.darker = function(k) {
    return d3_lab(Math.max(0, this.l - d3_lab_K * (arguments.length ? k : 1)), this.a, this.b);
  };
  d3_labPrototype.rgb = function() {
    return d3_lab_rgb(this.l, this.a, this.b);
  };
  function d3_lab_rgb(l, a, b) {
    var y = (l + 16) / 116, x = y + a / 500, z = y - b / 200;
    x = d3_lab_xyz(x) * d3_lab_X;
    y = d3_lab_xyz(y) * d3_lab_Y;
    z = d3_lab_xyz(z) * d3_lab_Z;
    return d3_rgb(d3_xyz_rgb(3.2404542 * x - 1.5371385 * y - .4985314 * z), d3_xyz_rgb(-.969266 * x + 1.8760108 * y + .041556 * z), d3_xyz_rgb(.0556434 * x - .2040259 * y + 1.0572252 * z));
  }
  function d3_lab_hcl(l, a, b) {
    return l > 0 ? d3_hcl(Math.atan2(b, a) * d3_degrees, Math.sqrt(a * a + b * b), l) : d3_hcl(NaN, NaN, l);
  }
  function d3_lab_xyz(x) {
    return x > .206893034 ? x * x * x : (x - 4 / 29) / 7.787037;
  }
  function d3_xyz_lab(x) {
    return x > .008856 ? Math.pow(x, 1 / 3) : 7.787037 * x + 4 / 29;
  }
  function d3_xyz_rgb(r) {
    return Math.round(255 * (r <= .00304 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - .055));
  }
  d3.rgb = function(r, g, b) {
    return arguments.length === 1 ? r instanceof d3_Rgb ? d3_rgb(r.r, r.g, r.b) : d3_rgb_parse("" + r, d3_rgb, d3_hsl_rgb) : d3_rgb(~~r, ~~g, ~~b);
  };
  function d3_rgbNumber(value) {
    return d3_rgb(value >> 16, value >> 8 & 255, value & 255);
  }
  function d3_rgbString(value) {
    return d3_rgbNumber(value) + "";
  }
  function d3_rgb(r, g, b) {
    return new d3_Rgb(r, g, b);
  }
  function d3_Rgb(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
  var d3_rgbPrototype = d3_Rgb.prototype = new d3_Color();
  d3_rgbPrototype.brighter = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    var r = this.r, g = this.g, b = this.b, i = 30;
    if (!r && !g && !b) return d3_rgb(i, i, i);
    if (r && r < i) r = i;
    if (g && g < i) g = i;
    if (b && b < i) b = i;
    return d3_rgb(Math.min(255, ~~(r / k)), Math.min(255, ~~(g / k)), Math.min(255, ~~(b / k)));
  };
  d3_rgbPrototype.darker = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return d3_rgb(~~(k * this.r), ~~(k * this.g), ~~(k * this.b));
  };
  d3_rgbPrototype.hsl = function() {
    return d3_rgb_hsl(this.r, this.g, this.b);
  };
  d3_rgbPrototype.toString = function() {
    return "#" + d3_rgb_hex(this.r) + d3_rgb_hex(this.g) + d3_rgb_hex(this.b);
  };
  function d3_rgb_hex(v) {
    return v < 16 ? "0" + Math.max(0, v).toString(16) : Math.min(255, v).toString(16);
  }
  function d3_rgb_parse(format, rgb, hsl) {
    var r = 0, g = 0, b = 0, m1, m2, name;
    m1 = /([a-z]+)\((.*)\)/i.exec(format);
    if (m1) {
      m2 = m1[2].split(",");
      switch (m1[1]) {
       case "hsl":
        {
          return hsl(parseFloat(m2[0]), parseFloat(m2[1]) / 100, parseFloat(m2[2]) / 100);
        }

       case "rgb":
        {
          return rgb(d3_rgb_parseNumber(m2[0]), d3_rgb_parseNumber(m2[1]), d3_rgb_parseNumber(m2[2]));
        }
      }
    }
    if (name = d3_rgb_names.get(format)) return rgb(name.r, name.g, name.b);
    if (format != null && format.charAt(0) === "#") {
      if (format.length === 4) {
        r = format.charAt(1);
        r += r;
        g = format.charAt(2);
        g += g;
        b = format.charAt(3);
        b += b;
      } else if (format.length === 7) {
        r = format.substring(1, 3);
        g = format.substring(3, 5);
        b = format.substring(5, 7);
      }
      r = parseInt(r, 16);
      g = parseInt(g, 16);
      b = parseInt(b, 16);
    }
    return rgb(r, g, b);
  }
  function d3_rgb_hsl(r, g, b) {
    var min = Math.min(r /= 255, g /= 255, b /= 255), max = Math.max(r, g, b), d = max - min, h, s, l = (max + min) / 2;
    if (d) {
      s = l < .5 ? d / (max + min) : d / (2 - max - min);
      if (r == max) h = (g - b) / d + (g < b ? 6 : 0); else if (g == max) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60;
    } else {
      h = NaN;
      s = l > 0 && l < 1 ? 0 : h;
    }
    return d3_hsl(h, s, l);
  }
  function d3_rgb_lab(r, g, b) {
    r = d3_rgb_xyz(r);
    g = d3_rgb_xyz(g);
    b = d3_rgb_xyz(b);
    var x = d3_xyz_lab((.4124564 * r + .3575761 * g + .1804375 * b) / d3_lab_X), y = d3_xyz_lab((.2126729 * r + .7151522 * g + .072175 * b) / d3_lab_Y), z = d3_xyz_lab((.0193339 * r + .119192 * g + .9503041 * b) / d3_lab_Z);
    return d3_lab(116 * y - 16, 500 * (x - y), 200 * (y - z));
  }
  function d3_rgb_xyz(r) {
    return (r /= 255) <= .04045 ? r / 12.92 : Math.pow((r + .055) / 1.055, 2.4);
  }
  function d3_rgb_parseNumber(c) {
    var f = parseFloat(c);
    return c.charAt(c.length - 1) === "%" ? Math.round(f * 2.55) : f;
  }
  var d3_rgb_names = d3.map({
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  });
  d3_rgb_names.forEach(function(key, value) {
    d3_rgb_names.set(key, d3_rgbNumber(value));
  });
  function d3_functor(v) {
    return typeof v === "function" ? v : function() {
      return v;
    };
  }
  d3.functor = d3_functor;
  function d3_identity(d) {
    return d;
  }
  d3.xhr = d3_xhrType(d3_identity);
  function d3_xhrType(response) {
    return function(url, mimeType, callback) {
      if (arguments.length === 2 && typeof mimeType === "function") callback = mimeType, 
      mimeType = null;
      return d3_xhr(url, mimeType, response, callback);
    };
  }
  function d3_xhr(url, mimeType, response, callback) {
    var xhr = {}, dispatch = d3.dispatch("beforesend", "progress", "load", "error"), headers = {}, request = new XMLHttpRequest(), responseType = null;
    if (d3_window.XDomainRequest && !("withCredentials" in request) && /^(http(s)?:)?\/\//.test(url)) request = new XDomainRequest();
    "onload" in request ? request.onload = request.onerror = respond : request.onreadystatechange = function() {
      request.readyState > 3 && respond();
    };
    function respond() {
      var status = request.status, result;
      if (!status && request.responseText || status >= 200 && status < 300 || status === 304) {
        try {
          result = response.call(xhr, request);
        } catch (e) {
          dispatch.error.call(xhr, e);
          return;
        }
        dispatch.load.call(xhr, result);
      } else {
        dispatch.error.call(xhr, request);
      }
    }
    request.onprogress = function(event) {
      var o = d3.event;
      d3.event = event;
      try {
        dispatch.progress.call(xhr, request);
      } finally {
        d3.event = o;
      }
    };
    xhr.header = function(name, value) {
      name = (name + "").toLowerCase();
      if (arguments.length < 2) return headers[name];
      if (value == null) delete headers[name]; else headers[name] = value + "";
      return xhr;
    };
    xhr.mimeType = function(value) {
      if (!arguments.length) return mimeType;
      mimeType = value == null ? null : value + "";
      return xhr;
    };
    xhr.responseType = function(value) {
      if (!arguments.length) return responseType;
      responseType = value;
      return xhr;
    };
    xhr.response = function(value) {
      response = value;
      return xhr;
    };
    [ "get", "post" ].forEach(function(method) {
      xhr[method] = function() {
        return xhr.send.apply(xhr, [ method ].concat(d3_array(arguments)));
      };
    });
    xhr.send = function(method, data, callback) {
      if (arguments.length === 2 && typeof data === "function") callback = data, data = null;
      request.open(method, url, true);
      if (mimeType != null && !("accept" in headers)) headers["accept"] = mimeType + ",*/*";
      if (request.setRequestHeader) for (var name in headers) request.setRequestHeader(name, headers[name]);
      if (mimeType != null && request.overrideMimeType) request.overrideMimeType(mimeType);
      if (responseType != null) request.responseType = responseType;
      if (callback != null) xhr.on("error", callback).on("load", function(request) {
        callback(null, request);
      });
      dispatch.beforesend.call(xhr, request);
      request.send(data == null ? null : data);
      return xhr;
    };
    xhr.abort = function() {
      request.abort();
      return xhr;
    };
    d3.rebind(xhr, dispatch, "on");
    return callback == null ? xhr : xhr.get(d3_xhr_fixCallback(callback));
  }
  function d3_xhr_fixCallback(callback) {
    return callback.length === 1 ? function(error, request) {
      callback(error == null ? request : null);
    } : callback;
  }
  d3.dsv = function(delimiter, mimeType) {
    var reFormat = new RegExp('["' + delimiter + "\n]"), delimiterCode = delimiter.charCodeAt(0);
    function dsv(url, row, callback) {
      if (arguments.length < 3) callback = row, row = null;
      var xhr = d3_xhr(url, mimeType, row == null ? response : typedResponse(row), callback);
      xhr.row = function(_) {
        return arguments.length ? xhr.response((row = _) == null ? response : typedResponse(_)) : row;
      };
      return xhr;
    }
    function response(request) {
      return dsv.parse(request.responseText);
    }
    function typedResponse(f) {
      return function(request) {
        return dsv.parse(request.responseText, f);
      };
    }
    dsv.parse = function(text, f) {
      var o;
      return dsv.parseRows(text, function(row, i) {
        if (o) return o(row, i - 1);
        var a = new Function("d", "return {" + row.map(function(name, i) {
          return JSON.stringify(name) + ": d[" + i + "]";
        }).join(",") + "}");
        o = f ? function(row, i) {
          return f(a(row), i);
        } : a;
      });
    };
    dsv.parseRows = function(text, f) {
      var EOL = {}, EOF = {}, rows = [], N = text.length, I = 0, n = 0, t, eol;
      function token() {
        if (I >= N) return EOF;
        if (eol) return eol = false, EOL;
        var j = I;
        if (text.charCodeAt(j) === 34) {
          var i = j;
          while (i++ < N) {
            if (text.charCodeAt(i) === 34) {
              if (text.charCodeAt(i + 1) !== 34) break;
              ++i;
            }
          }
          I = i + 2;
          var c = text.charCodeAt(i + 1);
          if (c === 13) {
            eol = true;
            if (text.charCodeAt(i + 2) === 10) ++I;
          } else if (c === 10) {
            eol = true;
          }
          return text.substring(j + 1, i).replace(/""/g, '"');
        }
        while (I < N) {
          var c = text.charCodeAt(I++), k = 1;
          if (c === 10) eol = true; else if (c === 13) {
            eol = true;
            if (text.charCodeAt(I) === 10) ++I, ++k;
          } else if (c !== delimiterCode) continue;
          return text.substring(j, I - k);
        }
        return text.substring(j);
      }
      while ((t = token()) !== EOF) {
        var a = [];
        while (t !== EOL && t !== EOF) {
          a.push(t);
          t = token();
        }
        if (f && !(a = f(a, n++))) continue;
        rows.push(a);
      }
      return rows;
    };
    dsv.format = function(rows) {
      if (Array.isArray(rows[0])) return dsv.formatRows(rows);
      var fieldSet = new d3_Set(), fields = [];
      rows.forEach(function(row) {
        for (var field in row) {
          if (!fieldSet.has(field)) {
            fields.push(fieldSet.add(field));
          }
        }
      });
      return [ fields.map(formatValue).join(delimiter) ].concat(rows.map(function(row) {
        return fields.map(function(field) {
          return formatValue(row[field]);
        }).join(delimiter);
      })).join("\n");
    };
    dsv.formatRows = function(rows) {
      return rows.map(formatRow).join("\n");
    };
    function formatRow(row) {
      return row.map(formatValue).join(delimiter);
    }
    function formatValue(text) {
      return reFormat.test(text) ? '"' + text.replace(/\"/g, '""') + '"' : text;
    }
    return dsv;
  };
  d3.csv = d3.dsv(",", "text/csv");
  d3.tsv = d3.dsv("	", "text/tab-separated-values");
  var d3_timer_queueHead, d3_timer_queueTail, d3_timer_interval, d3_timer_timeout, d3_timer_active, d3_timer_frame = d3_window[d3_vendorSymbol(d3_window, "requestAnimationFrame")] || function(callback) {
    setTimeout(callback, 17);
  };
  d3.timer = function(callback, delay, then) {
    var n = arguments.length;
    if (n < 2) delay = 0;
    if (n < 3) then = Date.now();
    var time = then + delay, timer = {
      c: callback,
      t: time,
      f: false,
      n: null
    };
    if (d3_timer_queueTail) d3_timer_queueTail.n = timer; else d3_timer_queueHead = timer;
    d3_timer_queueTail = timer;
    if (!d3_timer_interval) {
      d3_timer_timeout = clearTimeout(d3_timer_timeout);
      d3_timer_interval = 1;
      d3_timer_frame(d3_timer_step);
    }
  };
  function d3_timer_step() {
    var now = d3_timer_mark(), delay = d3_timer_sweep() - now;
    if (delay > 24) {
      if (isFinite(delay)) {
        clearTimeout(d3_timer_timeout);
        d3_timer_timeout = setTimeout(d3_timer_step, delay);
      }
      d3_timer_interval = 0;
    } else {
      d3_timer_interval = 1;
      d3_timer_frame(d3_timer_step);
    }
  }
  d3.timer.flush = function() {
    d3_timer_mark();
    d3_timer_sweep();
  };
  function d3_timer_mark() {
    var now = Date.now();
    d3_timer_active = d3_timer_queueHead;
    while (d3_timer_active) {
      if (now >= d3_timer_active.t) d3_timer_active.f = d3_timer_active.c(now - d3_timer_active.t);
      d3_timer_active = d3_timer_active.n;
    }
    return now;
  }
  function d3_timer_sweep() {
    var t0, t1 = d3_timer_queueHead, time = Infinity;
    while (t1) {
      if (t1.f) {
        t1 = t0 ? t0.n = t1.n : d3_timer_queueHead = t1.n;
      } else {
        if (t1.t < time) time = t1.t;
        t1 = (t0 = t1).n;
      }
    }
    d3_timer_queueTail = t0;
    return time;
  }
  function d3_format_precision(x, p) {
    return p - (x ? Math.ceil(Math.log(x) / Math.LN10) : 1);
  }
  d3.round = function(x, n) {
    return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x);
  };
  var d3_formatPrefixes = [ "y", "z", "a", "f", "p", "n", "µ", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y" ].map(d3_formatPrefix);
  d3.formatPrefix = function(value, precision) {
    var i = 0;
    if (value) {
      if (value < 0) value *= -1;
      if (precision) value = d3.round(value, d3_format_precision(value, precision));
      i = 1 + Math.floor(1e-12 + Math.log(value) / Math.LN10);
      i = Math.max(-24, Math.min(24, Math.floor((i <= 0 ? i + 1 : i - 1) / 3) * 3));
    }
    return d3_formatPrefixes[8 + i / 3];
  };
  function d3_formatPrefix(d, i) {
    var k = Math.pow(10, abs(8 - i) * 3);
    return {
      scale: i > 8 ? function(d) {
        return d / k;
      } : function(d) {
        return d * k;
      },
      symbol: d
    };
  }
  function d3_locale_numberFormat(locale) {
    var locale_decimal = locale.decimal, locale_thousands = locale.thousands, locale_grouping = locale.grouping, locale_currency = locale.currency, formatGroup = locale_grouping ? function(value) {
      var i = value.length, t = [], j = 0, g = locale_grouping[0];
      while (i > 0 && g > 0) {
        t.push(value.substring(i -= g, i + g));
        g = locale_grouping[j = (j + 1) % locale_grouping.length];
      }
      return t.reverse().join(locale_thousands);
    } : d3_identity;
    return function(specifier) {
      var match = d3_format_re.exec(specifier), fill = match[1] || " ", align = match[2] || ">", sign = match[3] || "", symbol = match[4] || "", zfill = match[5], width = +match[6], comma = match[7], precision = match[8], type = match[9], scale = 1, prefix = "", suffix = "", integer = false;
      if (precision) precision = +precision.substring(1);
      if (zfill || fill === "0" && align === "=") {
        zfill = fill = "0";
        align = "=";
        if (comma) width -= Math.floor((width - 1) / 4);
      }
      switch (type) {
       case "n":
        comma = true;
        type = "g";
        break;

       case "%":
        scale = 100;
        suffix = "%";
        type = "f";
        break;

       case "p":
        scale = 100;
        suffix = "%";
        type = "r";
        break;

       case "b":
       case "o":
       case "x":
       case "X":
        if (symbol === "#") prefix = "0" + type.toLowerCase();

       case "c":
       case "d":
        integer = true;
        precision = 0;
        break;

       case "s":
        scale = -1;
        type = "r";
        break;
      }
      if (symbol === "$") prefix = locale_currency[0], suffix = locale_currency[1];
      if (type == "r" && !precision) type = "g";
      if (precision != null) {
        if (type == "g") precision = Math.max(1, Math.min(21, precision)); else if (type == "e" || type == "f") precision = Math.max(0, Math.min(20, precision));
      }
      type = d3_format_types.get(type) || d3_format_typeDefault;
      var zcomma = zfill && comma;
      return function(value) {
        if (integer && value % 1) return "";
        var negative = value < 0 || value === 0 && 1 / value < 0 ? (value = -value, "-") : sign;
        if (scale < 0) {
          var unit = d3.formatPrefix(value, precision);
          value = unit.scale(value);
          suffix = unit.symbol;
        } else {
          value *= scale;
        }
        value = type(value, precision);
        var i = value.lastIndexOf("."), before = i < 0 ? value : value.substring(0, i), after = i < 0 ? "" : locale_decimal + value.substring(i + 1);
        if (!zfill && comma) before = formatGroup(before);
        var length = prefix.length + before.length + after.length + (zcomma ? 0 : negative.length), padding = length < width ? new Array(length = width - length + 1).join(fill) : "";
        if (zcomma) before = formatGroup(padding + before);
        negative += prefix;
        value = before + after;
        return (align === "<" ? negative + value + padding : align === ">" ? padding + negative + value : align === "^" ? padding.substring(0, length >>= 1) + negative + value + padding.substring(length) : negative + (zcomma ? value : padding + value)) + suffix;
      };
    };
  }
  var d3_format_re = /(?:([^{])?([<>=^]))?([+\- ])?([$#])?(0)?(\d+)?(,)?(\.-?\d+)?([a-z%])?/i;
  var d3_format_types = d3.map({
    b: function(x) {
      return x.toString(2);
    },
    c: function(x) {
      return String.fromCharCode(x);
    },
    o: function(x) {
      return x.toString(8);
    },
    x: function(x) {
      return x.toString(16);
    },
    X: function(x) {
      return x.toString(16).toUpperCase();
    },
    g: function(x, p) {
      return x.toPrecision(p);
    },
    e: function(x, p) {
      return x.toExponential(p);
    },
    f: function(x, p) {
      return x.toFixed(p);
    },
    r: function(x, p) {
      return (x = d3.round(x, d3_format_precision(x, p))).toFixed(Math.max(0, Math.min(20, d3_format_precision(x * (1 + 1e-15), p))));
    }
  });
  function d3_format_typeDefault(x) {
    return x + "";
  }
  var d3_time = d3.time = {}, d3_date = Date;
  function d3_date_utc() {
    this._ = new Date(arguments.length > 1 ? Date.UTC.apply(this, arguments) : arguments[0]);
  }
  d3_date_utc.prototype = {
    getDate: function() {
      return this._.getUTCDate();
    },
    getDay: function() {
      return this._.getUTCDay();
    },
    getFullYear: function() {
      return this._.getUTCFullYear();
    },
    getHours: function() {
      return this._.getUTCHours();
    },
    getMilliseconds: function() {
      return this._.getUTCMilliseconds();
    },
    getMinutes: function() {
      return this._.getUTCMinutes();
    },
    getMonth: function() {
      return this._.getUTCMonth();
    },
    getSeconds: function() {
      return this._.getUTCSeconds();
    },
    getTime: function() {
      return this._.getTime();
    },
    getTimezoneOffset: function() {
      return 0;
    },
    valueOf: function() {
      return this._.valueOf();
    },
    setDate: function() {
      d3_time_prototype.setUTCDate.apply(this._, arguments);
    },
    setDay: function() {
      d3_time_prototype.setUTCDay.apply(this._, arguments);
    },
    setFullYear: function() {
      d3_time_prototype.setUTCFullYear.apply(this._, arguments);
    },
    setHours: function() {
      d3_time_prototype.setUTCHours.apply(this._, arguments);
    },
    setMilliseconds: function() {
      d3_time_prototype.setUTCMilliseconds.apply(this._, arguments);
    },
    setMinutes: function() {
      d3_time_prototype.setUTCMinutes.apply(this._, arguments);
    },
    setMonth: function() {
      d3_time_prototype.setUTCMonth.apply(this._, arguments);
    },
    setSeconds: function() {
      d3_time_prototype.setUTCSeconds.apply(this._, arguments);
    },
    setTime: function() {
      d3_time_prototype.setTime.apply(this._, arguments);
    }
  };
  var d3_time_prototype = Date.prototype;
  function d3_time_interval(local, step, number) {
    function round(date) {
      var d0 = local(date), d1 = offset(d0, 1);
      return date - d0 < d1 - date ? d0 : d1;
    }
    function ceil(date) {
      step(date = local(new d3_date(date - 1)), 1);
      return date;
    }
    function offset(date, k) {
      step(date = new d3_date(+date), k);
      return date;
    }
    function range(t0, t1, dt) {
      var time = ceil(t0), times = [];
      if (dt > 1) {
        while (time < t1) {
          if (!(number(time) % dt)) times.push(new Date(+time));
          step(time, 1);
        }
      } else {
        while (time < t1) times.push(new Date(+time)), step(time, 1);
      }
      return times;
    }
    function range_utc(t0, t1, dt) {
      try {
        d3_date = d3_date_utc;
        var utc = new d3_date_utc();
        utc._ = t0;
        return range(utc, t1, dt);
      } finally {
        d3_date = Date;
      }
    }
    local.floor = local;
    local.round = round;
    local.ceil = ceil;
    local.offset = offset;
    local.range = range;
    var utc = local.utc = d3_time_interval_utc(local);
    utc.floor = utc;
    utc.round = d3_time_interval_utc(round);
    utc.ceil = d3_time_interval_utc(ceil);
    utc.offset = d3_time_interval_utc(offset);
    utc.range = range_utc;
    return local;
  }
  function d3_time_interval_utc(method) {
    return function(date, k) {
      try {
        d3_date = d3_date_utc;
        var utc = new d3_date_utc();
        utc._ = date;
        return method(utc, k)._;
      } finally {
        d3_date = Date;
      }
    };
  }
  d3_time.year = d3_time_interval(function(date) {
    date = d3_time.day(date);
    date.setMonth(0, 1);
    return date;
  }, function(date, offset) {
    date.setFullYear(date.getFullYear() + offset);
  }, function(date) {
    return date.getFullYear();
  });
  d3_time.years = d3_time.year.range;
  d3_time.years.utc = d3_time.year.utc.range;
  d3_time.day = d3_time_interval(function(date) {
    var day = new d3_date(2e3, 0);
    day.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    return day;
  }, function(date, offset) {
    date.setDate(date.getDate() + offset);
  }, function(date) {
    return date.getDate() - 1;
  });
  d3_time.days = d3_time.day.range;
  d3_time.days.utc = d3_time.day.utc.range;
  d3_time.dayOfYear = function(date) {
    var year = d3_time.year(date);
    return Math.floor((date - year - (date.getTimezoneOffset() - year.getTimezoneOffset()) * 6e4) / 864e5);
  };
  [ "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday" ].forEach(function(day, i) {
    i = 7 - i;
    var interval = d3_time[day] = d3_time_interval(function(date) {
      (date = d3_time.day(date)).setDate(date.getDate() - (date.getDay() + i) % 7);
      return date;
    }, function(date, offset) {
      date.setDate(date.getDate() + Math.floor(offset) * 7);
    }, function(date) {
      var day = d3_time.year(date).getDay();
      return Math.floor((d3_time.dayOfYear(date) + (day + i) % 7) / 7) - (day !== i);
    });
    d3_time[day + "s"] = interval.range;
    d3_time[day + "s"].utc = interval.utc.range;
    d3_time[day + "OfYear"] = function(date) {
      var day = d3_time.year(date).getDay();
      return Math.floor((d3_time.dayOfYear(date) + (day + i) % 7) / 7);
    };
  });
  d3_time.week = d3_time.sunday;
  d3_time.weeks = d3_time.sunday.range;
  d3_time.weeks.utc = d3_time.sunday.utc.range;
  d3_time.weekOfYear = d3_time.sundayOfYear;
  function d3_locale_timeFormat(locale) {
    var locale_dateTime = locale.dateTime, locale_date = locale.date, locale_time = locale.time, locale_periods = locale.periods, locale_days = locale.days, locale_shortDays = locale.shortDays, locale_months = locale.months, locale_shortMonths = locale.shortMonths;
    function d3_time_format(template) {
      var n = template.length;
      function format(date) {
        var string = [], i = -1, j = 0, c, p, f;
        while (++i < n) {
          if (template.charCodeAt(i) === 37) {
            string.push(template.substring(j, i));
            if ((p = d3_time_formatPads[c = template.charAt(++i)]) != null) c = template.charAt(++i);
            if (f = d3_time_formats[c]) c = f(date, p == null ? c === "e" ? " " : "0" : p);
            string.push(c);
            j = i + 1;
          }
        }
        string.push(template.substring(j, i));
        return string.join("");
      }
      format.parse = function(string) {
        var d = {
          y: 1900,
          m: 0,
          d: 1,
          H: 0,
          M: 0,
          S: 0,
          L: 0,
          Z: null
        }, i = d3_time_parse(d, template, string, 0);
        if (i != string.length) return null;
        if ("p" in d) d.H = d.H % 12 + d.p * 12;
        var localZ = d.Z != null && d3_date !== d3_date_utc, date = new (localZ ? d3_date_utc : d3_date)();
        if ("j" in d) date.setFullYear(d.y, 0, d.j); else if ("w" in d && ("W" in d || "U" in d)) {
          date.setFullYear(d.y, 0, 1);
          date.setFullYear(d.y, 0, "W" in d ? (d.w + 6) % 7 + d.W * 7 - (date.getDay() + 5) % 7 : d.w + d.U * 7 - (date.getDay() + 6) % 7);
        } else date.setFullYear(d.y, d.m, d.d);
        date.setHours(d.H + Math.floor(d.Z / 100), d.M + d.Z % 100, d.S, d.L);
        return localZ ? date._ : date;
      };
      format.toString = function() {
        return template;
      };
      return format;
    }
    function d3_time_parse(date, template, string, j) {
      var c, p, t, i = 0, n = template.length, m = string.length;
      while (i < n) {
        if (j >= m) return -1;
        c = template.charCodeAt(i++);
        if (c === 37) {
          t = template.charAt(i++);
          p = d3_time_parsers[t in d3_time_formatPads ? template.charAt(i++) : t];
          if (!p || (j = p(date, string, j)) < 0) return -1;
        } else if (c != string.charCodeAt(j++)) {
          return -1;
        }
      }
      return j;
    }
    d3_time_format.utc = function(template) {
      var local = d3_time_format(template);
      function format(date) {
        try {
          d3_date = d3_date_utc;
          var utc = new d3_date();
          utc._ = date;
          return local(utc);
        } finally {
          d3_date = Date;
        }
      }
      format.parse = function(string) {
        try {
          d3_date = d3_date_utc;
          var date = local.parse(string);
          return date && date._;
        } finally {
          d3_date = Date;
        }
      };
      format.toString = local.toString;
      return format;
    };
    d3_time_format.multi = d3_time_format.utc.multi = d3_time_formatMulti;
    var d3_time_periodLookup = d3.map(), d3_time_dayRe = d3_time_formatRe(locale_days), d3_time_dayLookup = d3_time_formatLookup(locale_days), d3_time_dayAbbrevRe = d3_time_formatRe(locale_shortDays), d3_time_dayAbbrevLookup = d3_time_formatLookup(locale_shortDays), d3_time_monthRe = d3_time_formatRe(locale_months), d3_time_monthLookup = d3_time_formatLookup(locale_months), d3_time_monthAbbrevRe = d3_time_formatRe(locale_shortMonths), d3_time_monthAbbrevLookup = d3_time_formatLookup(locale_shortMonths);
    locale_periods.forEach(function(p, i) {
      d3_time_periodLookup.set(p.toLowerCase(), i);
    });
    var d3_time_formats = {
      a: function(d) {
        return locale_shortDays[d.getDay()];
      },
      A: function(d) {
        return locale_days[d.getDay()];
      },
      b: function(d) {
        return locale_shortMonths[d.getMonth()];
      },
      B: function(d) {
        return locale_months[d.getMonth()];
      },
      c: d3_time_format(locale_dateTime),
      d: function(d, p) {
        return d3_time_formatPad(d.getDate(), p, 2);
      },
      e: function(d, p) {
        return d3_time_formatPad(d.getDate(), p, 2);
      },
      H: function(d, p) {
        return d3_time_formatPad(d.getHours(), p, 2);
      },
      I: function(d, p) {
        return d3_time_formatPad(d.getHours() % 12 || 12, p, 2);
      },
      j: function(d, p) {
        return d3_time_formatPad(1 + d3_time.dayOfYear(d), p, 3);
      },
      L: function(d, p) {
        return d3_time_formatPad(d.getMilliseconds(), p, 3);
      },
      m: function(d, p) {
        return d3_time_formatPad(d.getMonth() + 1, p, 2);
      },
      M: function(d, p) {
        return d3_time_formatPad(d.getMinutes(), p, 2);
      },
      p: function(d) {
        return locale_periods[+(d.getHours() >= 12)];
      },
      S: function(d, p) {
        return d3_time_formatPad(d.getSeconds(), p, 2);
      },
      U: function(d, p) {
        return d3_time_formatPad(d3_time.sundayOfYear(d), p, 2);
      },
      w: function(d) {
        return d.getDay();
      },
      W: function(d, p) {
        return d3_time_formatPad(d3_time.mondayOfYear(d), p, 2);
      },
      x: d3_time_format(locale_date),
      X: d3_time_format(locale_time),
      y: function(d, p) {
        return d3_time_formatPad(d.getFullYear() % 100, p, 2);
      },
      Y: function(d, p) {
        return d3_time_formatPad(d.getFullYear() % 1e4, p, 4);
      },
      Z: d3_time_zone,
      "%": function() {
        return "%";
      }
    };
    var d3_time_parsers = {
      a: d3_time_parseWeekdayAbbrev,
      A: d3_time_parseWeekday,
      b: d3_time_parseMonthAbbrev,
      B: d3_time_parseMonth,
      c: d3_time_parseLocaleFull,
      d: d3_time_parseDay,
      e: d3_time_parseDay,
      H: d3_time_parseHour24,
      I: d3_time_parseHour24,
      j: d3_time_parseDayOfYear,
      L: d3_time_parseMilliseconds,
      m: d3_time_parseMonthNumber,
      M: d3_time_parseMinutes,
      p: d3_time_parseAmPm,
      S: d3_time_parseSeconds,
      U: d3_time_parseWeekNumberSunday,
      w: d3_time_parseWeekdayNumber,
      W: d3_time_parseWeekNumberMonday,
      x: d3_time_parseLocaleDate,
      X: d3_time_parseLocaleTime,
      y: d3_time_parseYear,
      Y: d3_time_parseFullYear,
      Z: d3_time_parseZone,
      "%": d3_time_parseLiteralPercent
    };
    function d3_time_parseWeekdayAbbrev(date, string, i) {
      d3_time_dayAbbrevRe.lastIndex = 0;
      var n = d3_time_dayAbbrevRe.exec(string.substring(i));
      return n ? (date.w = d3_time_dayAbbrevLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseWeekday(date, string, i) {
      d3_time_dayRe.lastIndex = 0;
      var n = d3_time_dayRe.exec(string.substring(i));
      return n ? (date.w = d3_time_dayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseMonthAbbrev(date, string, i) {
      d3_time_monthAbbrevRe.lastIndex = 0;
      var n = d3_time_monthAbbrevRe.exec(string.substring(i));
      return n ? (date.m = d3_time_monthAbbrevLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseMonth(date, string, i) {
      d3_time_monthRe.lastIndex = 0;
      var n = d3_time_monthRe.exec(string.substring(i));
      return n ? (date.m = d3_time_monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
    }
    function d3_time_parseLocaleFull(date, string, i) {
      return d3_time_parse(date, d3_time_formats.c.toString(), string, i);
    }
    function d3_time_parseLocaleDate(date, string, i) {
      return d3_time_parse(date, d3_time_formats.x.toString(), string, i);
    }
    function d3_time_parseLocaleTime(date, string, i) {
      return d3_time_parse(date, d3_time_formats.X.toString(), string, i);
    }
    function d3_time_parseAmPm(date, string, i) {
      var n = d3_time_periodLookup.get(string.substring(i, i += 2).toLowerCase());
      return n == null ? -1 : (date.p = n, i);
    }
    return d3_time_format;
  }
  var d3_time_formatPads = {
    "-": "",
    _: " ",
    "0": "0"
  }, d3_time_numberRe = /^\s*\d+/, d3_time_percentRe = /^%/;
  function d3_time_formatPad(value, fill, width) {
    var sign = value < 0 ? "-" : "", string = (sign ? -value : value) + "", length = string.length;
    return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
  }
  function d3_time_formatRe(names) {
    return new RegExp("^(?:" + names.map(d3.requote).join("|") + ")", "i");
  }
  function d3_time_formatLookup(names) {
    var map = new d3_Map(), i = -1, n = names.length;
    while (++i < n) map.set(names[i].toLowerCase(), i);
    return map;
  }
  function d3_time_parseWeekdayNumber(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 1));
    return n ? (date.w = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseWeekNumberSunday(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i));
    return n ? (date.U = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseWeekNumberMonday(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i));
    return n ? (date.W = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseFullYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 4));
    return n ? (date.y = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.y = d3_time_expandYear(+n[0]), i + n[0].length) : -1;
  }
  function d3_time_parseZone(date, string, i) {
    return /^[+-]\d{4}$/.test(string = string.substring(i, i + 5)) ? (date.Z = +string, 
    i + 5) : -1;
  }
  function d3_time_expandYear(d) {
    return d + (d > 68 ? 1900 : 2e3);
  }
  function d3_time_parseMonthNumber(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.m = n[0] - 1, i + n[0].length) : -1;
  }
  function d3_time_parseDay(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.d = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseDayOfYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 3));
    return n ? (date.j = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseHour24(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.H = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseMinutes(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.M = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseSeconds(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.S = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseMilliseconds(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 3));
    return n ? (date.L = +n[0], i + n[0].length) : -1;
  }
  function d3_time_zone(d) {
    var z = d.getTimezoneOffset(), zs = z > 0 ? "-" : "+", zh = ~~(abs(z) / 60), zm = abs(z) % 60;
    return zs + d3_time_formatPad(zh, "0", 2) + d3_time_formatPad(zm, "0", 2);
  }
  function d3_time_parseLiteralPercent(date, string, i) {
    d3_time_percentRe.lastIndex = 0;
    var n = d3_time_percentRe.exec(string.substring(i, i + 1));
    return n ? i + n[0].length : -1;
  }
  function d3_time_formatMulti(formats) {
    var n = formats.length, i = -1;
    while (++i < n) formats[i][0] = this(formats[i][0]);
    return function(date) {
      var i = 0, f = formats[i];
      while (!f[1](date)) f = formats[++i];
      return f[0](date);
    };
  }
  d3.locale = function(locale) {
    return {
      numberFormat: d3_locale_numberFormat(locale),
      timeFormat: d3_locale_timeFormat(locale)
    };
  };
  var d3_locale_enUS = d3.locale({
    decimal: ".",
    thousands: ",",
    grouping: [ 3 ],
    currency: [ "$", "" ],
    dateTime: "%a %b %e %X %Y",
    date: "%m/%d/%Y",
    time: "%H:%M:%S",
    periods: [ "AM", "PM" ],
    days: [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
    shortDays: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ],
    months: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],
    shortMonths: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ]
  });
  d3.format = d3_locale_enUS.numberFormat;
  d3.geo = {};
  function d3_adder() {}
  d3_adder.prototype = {
    s: 0,
    t: 0,
    add: function(y) {
      d3_adderSum(y, this.t, d3_adderTemp);
      d3_adderSum(d3_adderTemp.s, this.s, this);
      if (this.s) this.t += d3_adderTemp.t; else this.s = d3_adderTemp.t;
    },
    reset: function() {
      this.s = this.t = 0;
    },
    valueOf: function() {
      return this.s;
    }
  };
  var d3_adderTemp = new d3_adder();
  function d3_adderSum(a, b, o) {
    var x = o.s = a + b, bv = x - a, av = x - bv;
    o.t = a - av + (b - bv);
  }
  d3.geo.stream = function(object, listener) {
    if (object && d3_geo_streamObjectType.hasOwnProperty(object.type)) {
      d3_geo_streamObjectType[object.type](object, listener);
    } else {
      d3_geo_streamGeometry(object, listener);
    }
  };
  function d3_geo_streamGeometry(geometry, listener) {
    if (geometry && d3_geo_streamGeometryType.hasOwnProperty(geometry.type)) {
      d3_geo_streamGeometryType[geometry.type](geometry, listener);
    }
  }
  var d3_geo_streamObjectType = {
    Feature: function(feature, listener) {
      d3_geo_streamGeometry(feature.geometry, listener);
    },
    FeatureCollection: function(object, listener) {
      var features = object.features, i = -1, n = features.length;
      while (++i < n) d3_geo_streamGeometry(features[i].geometry, listener);
    }
  };
  var d3_geo_streamGeometryType = {
    Sphere: function(object, listener) {
      listener.sphere();
    },
    Point: function(object, listener) {
      object = object.coordinates;
      listener.point(object[0], object[1], object[2]);
    },
    MultiPoint: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) object = coordinates[i], listener.point(object[0], object[1], object[2]);
    },
    LineString: function(object, listener) {
      d3_geo_streamLine(object.coordinates, listener, 0);
    },
    MultiLineString: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) d3_geo_streamLine(coordinates[i], listener, 0);
    },
    Polygon: function(object, listener) {
      d3_geo_streamPolygon(object.coordinates, listener);
    },
    MultiPolygon: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) d3_geo_streamPolygon(coordinates[i], listener);
    },
    GeometryCollection: function(object, listener) {
      var geometries = object.geometries, i = -1, n = geometries.length;
      while (++i < n) d3_geo_streamGeometry(geometries[i], listener);
    }
  };
  function d3_geo_streamLine(coordinates, listener, closed) {
    var i = -1, n = coordinates.length - closed, coordinate;
    listener.lineStart();
    while (++i < n) coordinate = coordinates[i], listener.point(coordinate[0], coordinate[1], coordinate[2]);
    listener.lineEnd();
  }
  function d3_geo_streamPolygon(coordinates, listener) {
    var i = -1, n = coordinates.length;
    listener.polygonStart();
    while (++i < n) d3_geo_streamLine(coordinates[i], listener, 1);
    listener.polygonEnd();
  }
  d3.geo.area = function(object) {
    d3_geo_areaSum = 0;
    d3.geo.stream(object, d3_geo_area);
    return d3_geo_areaSum;
  };
  var d3_geo_areaSum, d3_geo_areaRingSum = new d3_adder();
  var d3_geo_area = {
    sphere: function() {
      d3_geo_areaSum += 4 * π;
    },
    point: d3_noop,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: function() {
      d3_geo_areaRingSum.reset();
      d3_geo_area.lineStart = d3_geo_areaRingStart;
    },
    polygonEnd: function() {
      var area = 2 * d3_geo_areaRingSum;
      d3_geo_areaSum += area < 0 ? 4 * π + area : area;
      d3_geo_area.lineStart = d3_geo_area.lineEnd = d3_geo_area.point = d3_noop;
    }
  };
  function d3_geo_areaRingStart() {
    var λ00, φ00, λ0, cosφ0, sinφ0;
    d3_geo_area.point = function(λ, φ) {
      d3_geo_area.point = nextPoint;
      λ0 = (λ00 = λ) * d3_radians, cosφ0 = Math.cos(φ = (φ00 = φ) * d3_radians / 2 + π / 4), 
      sinφ0 = Math.sin(φ);
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      φ = φ * d3_radians / 2 + π / 4;
      var dλ = λ - λ0, cosφ = Math.cos(φ), sinφ = Math.sin(φ), k = sinφ0 * sinφ, u = cosφ0 * cosφ + k * Math.cos(dλ), v = k * Math.sin(dλ);
      d3_geo_areaRingSum.add(Math.atan2(v, u));
      λ0 = λ, cosφ0 = cosφ, sinφ0 = sinφ;
    }
    d3_geo_area.lineEnd = function() {
      nextPoint(λ00, φ00);
    };
  }
  function d3_geo_cartesian(spherical) {
    var λ = spherical[0], φ = spherical[1], cosφ = Math.cos(φ);
    return [ cosφ * Math.cos(λ), cosφ * Math.sin(λ), Math.sin(φ) ];
  }
  function d3_geo_cartesianDot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function d3_geo_cartesianCross(a, b) {
    return [ a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0] ];
  }
  function d3_geo_cartesianAdd(a, b) {
    a[0] += b[0];
    a[1] += b[1];
    a[2] += b[2];
  }
  function d3_geo_cartesianScale(vector, k) {
    return [ vector[0] * k, vector[1] * k, vector[2] * k ];
  }
  function d3_geo_cartesianNormalize(d) {
    var l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
    d[0] /= l;
    d[1] /= l;
    d[2] /= l;
  }
  function d3_geo_spherical(cartesian) {
    return [ Math.atan2(cartesian[1], cartesian[0]), d3_asin(cartesian[2]) ];
  }
  function d3_geo_sphericalEqual(a, b) {
    return abs(a[0] - b[0]) < ε && abs(a[1] - b[1]) < ε;
  }
  d3.geo.bounds = function() {
    var λ0, φ0, λ1, φ1, λ_, λ__, φ__, p0, dλSum, ranges, range;
    var bound = {
      point: point,
      lineStart: lineStart,
      lineEnd: lineEnd,
      polygonStart: function() {
        bound.point = ringPoint;
        bound.lineStart = ringStart;
        bound.lineEnd = ringEnd;
        dλSum = 0;
        d3_geo_area.polygonStart();
      },
      polygonEnd: function() {
        d3_geo_area.polygonEnd();
        bound.point = point;
        bound.lineStart = lineStart;
        bound.lineEnd = lineEnd;
        if (d3_geo_areaRingSum < 0) λ0 = -(λ1 = 180), φ0 = -(φ1 = 90); else if (dλSum > ε) φ1 = 90; else if (dλSum < -ε) φ0 = -90;
        range[0] = λ0, range[1] = λ1;
      }
    };
    function point(λ, φ) {
      ranges.push(range = [ λ0 = λ, λ1 = λ ]);
      if (φ < φ0) φ0 = φ;
      if (φ > φ1) φ1 = φ;
    }
    function linePoint(λ, φ) {
      var p = d3_geo_cartesian([ λ * d3_radians, φ * d3_radians ]);
      if (p0) {
        var normal = d3_geo_cartesianCross(p0, p), equatorial = [ normal[1], -normal[0], 0 ], inflection = d3_geo_cartesianCross(equatorial, normal);
        d3_geo_cartesianNormalize(inflection);
        inflection = d3_geo_spherical(inflection);
        var dλ = λ - λ_, s = dλ > 0 ? 1 : -1, λi = inflection[0] * d3_degrees * s, antimeridian = abs(dλ) > 180;
        if (antimeridian ^ (s * λ_ < λi && λi < s * λ)) {
          var φi = inflection[1] * d3_degrees;
          if (φi > φ1) φ1 = φi;
        } else if (λi = (λi + 360) % 360 - 180, antimeridian ^ (s * λ_ < λi && λi < s * λ)) {
          var φi = -inflection[1] * d3_degrees;
          if (φi < φ0) φ0 = φi;
        } else {
          if (φ < φ0) φ0 = φ;
          if (φ > φ1) φ1 = φ;
        }
        if (antimeridian) {
          if (λ < λ_) {
            if (angle(λ0, λ) > angle(λ0, λ1)) λ1 = λ;
          } else {
            if (angle(λ, λ1) > angle(λ0, λ1)) λ0 = λ;
          }
        } else {
          if (λ1 >= λ0) {
            if (λ < λ0) λ0 = λ;
            if (λ > λ1) λ1 = λ;
          } else {
            if (λ > λ_) {
              if (angle(λ0, λ) > angle(λ0, λ1)) λ1 = λ;
            } else {
              if (angle(λ, λ1) > angle(λ0, λ1)) λ0 = λ;
            }
          }
        }
      } else {
        point(λ, φ);
      }
      p0 = p, λ_ = λ;
    }
    function lineStart() {
      bound.point = linePoint;
    }
    function lineEnd() {
      range[0] = λ0, range[1] = λ1;
      bound.point = point;
      p0 = null;
    }
    function ringPoint(λ, φ) {
      if (p0) {
        var dλ = λ - λ_;
        dλSum += abs(dλ) > 180 ? dλ + (dλ > 0 ? 360 : -360) : dλ;
      } else λ__ = λ, φ__ = φ;
      d3_geo_area.point(λ, φ);
      linePoint(λ, φ);
    }
    function ringStart() {
      d3_geo_area.lineStart();
    }
    function ringEnd() {
      ringPoint(λ__, φ__);
      d3_geo_area.lineEnd();
      if (abs(dλSum) > ε) λ0 = -(λ1 = 180);
      range[0] = λ0, range[1] = λ1;
      p0 = null;
    }
    function angle(λ0, λ1) {
      return (λ1 -= λ0) < 0 ? λ1 + 360 : λ1;
    }
    function compareRanges(a, b) {
      return a[0] - b[0];
    }
    function withinRange(x, range) {
      return range[0] <= range[1] ? range[0] <= x && x <= range[1] : x < range[0] || range[1] < x;
    }
    return function(feature) {
      φ1 = λ1 = -(λ0 = φ0 = Infinity);
      ranges = [];
      d3.geo.stream(feature, bound);
      var n = ranges.length;
      if (n) {
        ranges.sort(compareRanges);
        for (var i = 1, a = ranges[0], b, merged = [ a ]; i < n; ++i) {
          b = ranges[i];
          if (withinRange(b[0], a) || withinRange(b[1], a)) {
            if (angle(a[0], b[1]) > angle(a[0], a[1])) a[1] = b[1];
            if (angle(b[0], a[1]) > angle(a[0], a[1])) a[0] = b[0];
          } else {
            merged.push(a = b);
          }
        }
        var best = -Infinity, dλ;
        for (var n = merged.length - 1, i = 0, a = merged[n], b; i <= n; a = b, ++i) {
          b = merged[i];
          if ((dλ = angle(a[1], b[0])) > best) best = dλ, λ0 = b[0], λ1 = a[1];
        }
      }
      ranges = range = null;
      return λ0 === Infinity || φ0 === Infinity ? [ [ NaN, NaN ], [ NaN, NaN ] ] : [ [ λ0, φ0 ], [ λ1, φ1 ] ];
    };
  }();
  d3.geo.centroid = function(object) {
    d3_geo_centroidW0 = d3_geo_centroidW1 = d3_geo_centroidX0 = d3_geo_centroidY0 = d3_geo_centroidZ0 = d3_geo_centroidX1 = d3_geo_centroidY1 = d3_geo_centroidZ1 = d3_geo_centroidX2 = d3_geo_centroidY2 = d3_geo_centroidZ2 = 0;
    d3.geo.stream(object, d3_geo_centroid);
    var x = d3_geo_centroidX2, y = d3_geo_centroidY2, z = d3_geo_centroidZ2, m = x * x + y * y + z * z;
    if (m < ε2) {
      x = d3_geo_centroidX1, y = d3_geo_centroidY1, z = d3_geo_centroidZ1;
      if (d3_geo_centroidW1 < ε) x = d3_geo_centroidX0, y = d3_geo_centroidY0, z = d3_geo_centroidZ0;
      m = x * x + y * y + z * z;
      if (m < ε2) return [ NaN, NaN ];
    }
    return [ Math.atan2(y, x) * d3_degrees, d3_asin(z / Math.sqrt(m)) * d3_degrees ];
  };
  var d3_geo_centroidW0, d3_geo_centroidW1, d3_geo_centroidX0, d3_geo_centroidY0, d3_geo_centroidZ0, d3_geo_centroidX1, d3_geo_centroidY1, d3_geo_centroidZ1, d3_geo_centroidX2, d3_geo_centroidY2, d3_geo_centroidZ2;
  var d3_geo_centroid = {
    sphere: d3_noop,
    point: d3_geo_centroidPoint,
    lineStart: d3_geo_centroidLineStart,
    lineEnd: d3_geo_centroidLineEnd,
    polygonStart: function() {
      d3_geo_centroid.lineStart = d3_geo_centroidRingStart;
    },
    polygonEnd: function() {
      d3_geo_centroid.lineStart = d3_geo_centroidLineStart;
    }
  };
  function d3_geo_centroidPoint(λ, φ) {
    λ *= d3_radians;
    var cosφ = Math.cos(φ *= d3_radians);
    d3_geo_centroidPointXYZ(cosφ * Math.cos(λ), cosφ * Math.sin(λ), Math.sin(φ));
  }
  function d3_geo_centroidPointXYZ(x, y, z) {
    ++d3_geo_centroidW0;
    d3_geo_centroidX0 += (x - d3_geo_centroidX0) / d3_geo_centroidW0;
    d3_geo_centroidY0 += (y - d3_geo_centroidY0) / d3_geo_centroidW0;
    d3_geo_centroidZ0 += (z - d3_geo_centroidZ0) / d3_geo_centroidW0;
  }
  function d3_geo_centroidLineStart() {
    var x0, y0, z0;
    d3_geo_centroid.point = function(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians);
      x0 = cosφ * Math.cos(λ);
      y0 = cosφ * Math.sin(λ);
      z0 = Math.sin(φ);
      d3_geo_centroid.point = nextPoint;
      d3_geo_centroidPointXYZ(x0, y0, z0);
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians), x = cosφ * Math.cos(λ), y = cosφ * Math.sin(λ), z = Math.sin(φ), w = Math.atan2(Math.sqrt((w = y0 * z - z0 * y) * w + (w = z0 * x - x0 * z) * w + (w = x0 * y - y0 * x) * w), x0 * x + y0 * y + z0 * z);
      d3_geo_centroidW1 += w;
      d3_geo_centroidX1 += w * (x0 + (x0 = x));
      d3_geo_centroidY1 += w * (y0 + (y0 = y));
      d3_geo_centroidZ1 += w * (z0 + (z0 = z));
      d3_geo_centroidPointXYZ(x0, y0, z0);
    }
  }
  function d3_geo_centroidLineEnd() {
    d3_geo_centroid.point = d3_geo_centroidPoint;
  }
  function d3_geo_centroidRingStart() {
    var λ00, φ00, x0, y0, z0;
    d3_geo_centroid.point = function(λ, φ) {
      λ00 = λ, φ00 = φ;
      d3_geo_centroid.point = nextPoint;
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians);
      x0 = cosφ * Math.cos(λ);
      y0 = cosφ * Math.sin(λ);
      z0 = Math.sin(φ);
      d3_geo_centroidPointXYZ(x0, y0, z0);
    };
    d3_geo_centroid.lineEnd = function() {
      nextPoint(λ00, φ00);
      d3_geo_centroid.lineEnd = d3_geo_centroidLineEnd;
      d3_geo_centroid.point = d3_geo_centroidPoint;
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians), x = cosφ * Math.cos(λ), y = cosφ * Math.sin(λ), z = Math.sin(φ), cx = y0 * z - z0 * y, cy = z0 * x - x0 * z, cz = x0 * y - y0 * x, m = Math.sqrt(cx * cx + cy * cy + cz * cz), u = x0 * x + y0 * y + z0 * z, v = m && -d3_acos(u) / m, w = Math.atan2(m, u);
      d3_geo_centroidX2 += v * cx;
      d3_geo_centroidY2 += v * cy;
      d3_geo_centroidZ2 += v * cz;
      d3_geo_centroidW1 += w;
      d3_geo_centroidX1 += w * (x0 + (x0 = x));
      d3_geo_centroidY1 += w * (y0 + (y0 = y));
      d3_geo_centroidZ1 += w * (z0 + (z0 = z));
      d3_geo_centroidPointXYZ(x0, y0, z0);
    }
  }
  function d3_true() {
    return true;
  }
  function d3_geo_clipPolygon(segments, compare, clipStartInside, interpolate, listener) {
    var subject = [], clip = [];
    segments.forEach(function(segment) {
      if ((n = segment.length - 1) <= 0) return;
      var n, p0 = segment[0], p1 = segment[n];
      if (d3_geo_sphericalEqual(p0, p1)) {
        listener.lineStart();
        for (var i = 0; i < n; ++i) listener.point((p0 = segment[i])[0], p0[1]);
        listener.lineEnd();
        return;
      }
      var a = new d3_geo_clipPolygonIntersection(p0, segment, null, true), b = new d3_geo_clipPolygonIntersection(p0, null, a, false);
      a.o = b;
      subject.push(a);
      clip.push(b);
      a = new d3_geo_clipPolygonIntersection(p1, segment, null, false);
      b = new d3_geo_clipPolygonIntersection(p1, null, a, true);
      a.o = b;
      subject.push(a);
      clip.push(b);
    });
    clip.sort(compare);
    d3_geo_clipPolygonLinkCircular(subject);
    d3_geo_clipPolygonLinkCircular(clip);
    if (!subject.length) return;
    for (var i = 0, entry = clipStartInside, n = clip.length; i < n; ++i) {
      clip[i].e = entry = !entry;
    }
    var start = subject[0], points, point;
    while (1) {
      var current = start, isSubject = true;
      while (current.v) if ((current = current.n) === start) return;
      points = current.z;
      listener.lineStart();
      do {
        current.v = current.o.v = true;
        if (current.e) {
          if (isSubject) {
            for (var i = 0, n = points.length; i < n; ++i) listener.point((point = points[i])[0], point[1]);
          } else {
            interpolate(current.x, current.n.x, 1, listener);
          }
          current = current.n;
        } else {
          if (isSubject) {
            points = current.p.z;
            for (var i = points.length - 1; i >= 0; --i) listener.point((point = points[i])[0], point[1]);
          } else {
            interpolate(current.x, current.p.x, -1, listener);
          }
          current = current.p;
        }
        current = current.o;
        points = current.z;
        isSubject = !isSubject;
      } while (!current.v);
      listener.lineEnd();
    }
  }
  function d3_geo_clipPolygonLinkCircular(array) {
    if (!(n = array.length)) return;
    var n, i = 0, a = array[0], b;
    while (++i < n) {
      a.n = b = array[i];
      b.p = a;
      a = b;
    }
    a.n = b = array[0];
    b.p = a;
  }
  function d3_geo_clipPolygonIntersection(point, points, other, entry) {
    this.x = point;
    this.z = points;
    this.o = other;
    this.e = entry;
    this.v = false;
    this.n = this.p = null;
  }
  function d3_geo_clip(pointVisible, clipLine, interpolate, clipStart) {
    return function(rotate, listener) {
      var line = clipLine(listener), rotatedClipStart = rotate.invert(clipStart[0], clipStart[1]);
      var clip = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          clip.point = pointRing;
          clip.lineStart = ringStart;
          clip.lineEnd = ringEnd;
          segments = [];
          polygon = [];
          listener.polygonStart();
        },
        polygonEnd: function() {
          clip.point = point;
          clip.lineStart = lineStart;
          clip.lineEnd = lineEnd;
          segments = d3.merge(segments);
          var clipStartInside = d3_geo_pointInPolygon(rotatedClipStart, polygon);
          if (segments.length) {
            d3_geo_clipPolygon(segments, d3_geo_clipSort, clipStartInside, interpolate, listener);
          } else if (clipStartInside) {
            listener.lineStart();
            interpolate(null, null, 1, listener);
            listener.lineEnd();
          }
          listener.polygonEnd();
          segments = polygon = null;
        },
        sphere: function() {
          listener.polygonStart();
          listener.lineStart();
          interpolate(null, null, 1, listener);
          listener.lineEnd();
          listener.polygonEnd();
        }
      };
      function point(λ, φ) {
        var point = rotate(λ, φ);
        if (pointVisible(λ = point[0], φ = point[1])) listener.point(λ, φ);
      }
      function pointLine(λ, φ) {
        var point = rotate(λ, φ);
        line.point(point[0], point[1]);
      }
      function lineStart() {
        clip.point = pointLine;
        line.lineStart();
      }
      function lineEnd() {
        clip.point = point;
        line.lineEnd();
      }
      var segments;
      var buffer = d3_geo_clipBufferListener(), ringListener = clipLine(buffer), polygon, ring;
      function pointRing(λ, φ) {
        ring.push([ λ, φ ]);
        var point = rotate(λ, φ);
        ringListener.point(point[0], point[1]);
      }
      function ringStart() {
        ringListener.lineStart();
        ring = [];
      }
      function ringEnd() {
        pointRing(ring[0][0], ring[0][1]);
        ringListener.lineEnd();
        var clean = ringListener.clean(), ringSegments = buffer.buffer(), segment, n = ringSegments.length;
        ring.pop();
        polygon.push(ring);
        ring = null;
        if (!n) return;
        if (clean & 1) {
          segment = ringSegments[0];
          var n = segment.length - 1, i = -1, point;
          listener.lineStart();
          while (++i < n) listener.point((point = segment[i])[0], point[1]);
          listener.lineEnd();
          return;
        }
        if (n > 1 && clean & 2) ringSegments.push(ringSegments.pop().concat(ringSegments.shift()));
        segments.push(ringSegments.filter(d3_geo_clipSegmentLength1));
      }
      return clip;
    };
  }
  function d3_geo_clipSegmentLength1(segment) {
    return segment.length > 1;
  }
  function d3_geo_clipBufferListener() {
    var lines = [], line;
    return {
      lineStart: function() {
        lines.push(line = []);
      },
      point: function(λ, φ) {
        line.push([ λ, φ ]);
      },
      lineEnd: d3_noop,
      buffer: function() {
        var buffer = lines;
        lines = [];
        line = null;
        return buffer;
      },
      rejoin: function() {
        if (lines.length > 1) lines.push(lines.pop().concat(lines.shift()));
      }
    };
  }
  function d3_geo_clipSort(a, b) {
    return ((a = a.x)[0] < 0 ? a[1] - halfπ - ε : halfπ - a[1]) - ((b = b.x)[0] < 0 ? b[1] - halfπ - ε : halfπ - b[1]);
  }
  function d3_geo_pointInPolygon(point, polygon) {
    var meridian = point[0], parallel = point[1], meridianNormal = [ Math.sin(meridian), -Math.cos(meridian), 0 ], polarAngle = 0, winding = 0;
    d3_geo_areaRingSum.reset();
    for (var i = 0, n = polygon.length; i < n; ++i) {
      var ring = polygon[i], m = ring.length;
      if (!m) continue;
      var point0 = ring[0], λ0 = point0[0], φ0 = point0[1] / 2 + π / 4, sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0), j = 1;
      while (true) {
        if (j === m) j = 0;
        point = ring[j];
        var λ = point[0], φ = point[1] / 2 + π / 4, sinφ = Math.sin(φ), cosφ = Math.cos(φ), dλ = λ - λ0, antimeridian = abs(dλ) > π, k = sinφ0 * sinφ;
        d3_geo_areaRingSum.add(Math.atan2(k * Math.sin(dλ), cosφ0 * cosφ + k * Math.cos(dλ)));
        polarAngle += antimeridian ? dλ + (dλ >= 0 ? τ : -τ) : dλ;
        if (antimeridian ^ λ0 >= meridian ^ λ >= meridian) {
          var arc = d3_geo_cartesianCross(d3_geo_cartesian(point0), d3_geo_cartesian(point));
          d3_geo_cartesianNormalize(arc);
          var intersection = d3_geo_cartesianCross(meridianNormal, arc);
          d3_geo_cartesianNormalize(intersection);
          var φarc = (antimeridian ^ dλ >= 0 ? -1 : 1) * d3_asin(intersection[2]);
          if (parallel > φarc || parallel === φarc && (arc[0] || arc[1])) {
            winding += antimeridian ^ dλ >= 0 ? 1 : -1;
          }
        }
        if (!j++) break;
        λ0 = λ, sinφ0 = sinφ, cosφ0 = cosφ, point0 = point;
      }
    }
    return (polarAngle < -ε || polarAngle < ε && d3_geo_areaRingSum < 0) ^ winding & 1;
  }
  var d3_geo_clipAntimeridian = d3_geo_clip(d3_true, d3_geo_clipAntimeridianLine, d3_geo_clipAntimeridianInterpolate, [ -π, -π / 2 ]);
  function d3_geo_clipAntimeridianLine(listener) {
    var λ0 = NaN, φ0 = NaN, sλ0 = NaN, clean;
    return {
      lineStart: function() {
        listener.lineStart();
        clean = 1;
      },
      point: function(λ1, φ1) {
        var sλ1 = λ1 > 0 ? π : -π, dλ = abs(λ1 - λ0);
        if (abs(dλ - π) < ε) {
          listener.point(λ0, φ0 = (φ0 + φ1) / 2 > 0 ? halfπ : -halfπ);
          listener.point(sλ0, φ0);
          listener.lineEnd();
          listener.lineStart();
          listener.point(sλ1, φ0);
          listener.point(λ1, φ0);
          clean = 0;
        } else if (sλ0 !== sλ1 && dλ >= π) {
          if (abs(λ0 - sλ0) < ε) λ0 -= sλ0 * ε;
          if (abs(λ1 - sλ1) < ε) λ1 -= sλ1 * ε;
          φ0 = d3_geo_clipAntimeridianIntersect(λ0, φ0, λ1, φ1);
          listener.point(sλ0, φ0);
          listener.lineEnd();
          listener.lineStart();
          listener.point(sλ1, φ0);
          clean = 0;
        }
        listener.point(λ0 = λ1, φ0 = φ1);
        sλ0 = sλ1;
      },
      lineEnd: function() {
        listener.lineEnd();
        λ0 = φ0 = NaN;
      },
      clean: function() {
        return 2 - clean;
      }
    };
  }
  function d3_geo_clipAntimeridianIntersect(λ0, φ0, λ1, φ1) {
    var cosφ0, cosφ1, sinλ0_λ1 = Math.sin(λ0 - λ1);
    return abs(sinλ0_λ1) > ε ? Math.atan((Math.sin(φ0) * (cosφ1 = Math.cos(φ1)) * Math.sin(λ1) - Math.sin(φ1) * (cosφ0 = Math.cos(φ0)) * Math.sin(λ0)) / (cosφ0 * cosφ1 * sinλ0_λ1)) : (φ0 + φ1) / 2;
  }
  function d3_geo_clipAntimeridianInterpolate(from, to, direction, listener) {
    var φ;
    if (from == null) {
      φ = direction * halfπ;
      listener.point(-π, φ);
      listener.point(0, φ);
      listener.point(π, φ);
      listener.point(π, 0);
      listener.point(π, -φ);
      listener.point(0, -φ);
      listener.point(-π, -φ);
      listener.point(-π, 0);
      listener.point(-π, φ);
    } else if (abs(from[0] - to[0]) > ε) {
      var s = from[0] < to[0] ? π : -π;
      φ = direction * s / 2;
      listener.point(-s, φ);
      listener.point(0, φ);
      listener.point(s, φ);
    } else {
      listener.point(to[0], to[1]);
    }
  }
  function d3_geo_clipCircle(radius) {
    var cr = Math.cos(radius), smallRadius = cr > 0, notHemisphere = abs(cr) > ε, interpolate = d3_geo_circleInterpolate(radius, 6 * d3_radians);
    return d3_geo_clip(visible, clipLine, interpolate, smallRadius ? [ 0, -radius ] : [ -π, radius - π ]);
    function visible(λ, φ) {
      return Math.cos(λ) * Math.cos(φ) > cr;
    }
    function clipLine(listener) {
      var point0, c0, v0, v00, clean;
      return {
        lineStart: function() {
          v00 = v0 = false;
          clean = 1;
        },
        point: function(λ, φ) {
          var point1 = [ λ, φ ], point2, v = visible(λ, φ), c = smallRadius ? v ? 0 : code(λ, φ) : v ? code(λ + (λ < 0 ? π : -π), φ) : 0;
          if (!point0 && (v00 = v0 = v)) listener.lineStart();
          if (v !== v0) {
            point2 = intersect(point0, point1);
            if (d3_geo_sphericalEqual(point0, point2) || d3_geo_sphericalEqual(point1, point2)) {
              point1[0] += ε;
              point1[1] += ε;
              v = visible(point1[0], point1[1]);
            }
          }
          if (v !== v0) {
            clean = 0;
            if (v) {
              listener.lineStart();
              point2 = intersect(point1, point0);
              listener.point(point2[0], point2[1]);
            } else {
              point2 = intersect(point0, point1);
              listener.point(point2[0], point2[1]);
              listener.lineEnd();
            }
            point0 = point2;
          } else if (notHemisphere && point0 && smallRadius ^ v) {
            var t;
            if (!(c & c0) && (t = intersect(point1, point0, true))) {
              clean = 0;
              if (smallRadius) {
                listener.lineStart();
                listener.point(t[0][0], t[0][1]);
                listener.point(t[1][0], t[1][1]);
                listener.lineEnd();
              } else {
                listener.point(t[1][0], t[1][1]);
                listener.lineEnd();
                listener.lineStart();
                listener.point(t[0][0], t[0][1]);
              }
            }
          }
          if (v && (!point0 || !d3_geo_sphericalEqual(point0, point1))) {
            listener.point(point1[0], point1[1]);
          }
          point0 = point1, v0 = v, c0 = c;
        },
        lineEnd: function() {
          if (v0) listener.lineEnd();
          point0 = null;
        },
        clean: function() {
          return clean | (v00 && v0) << 1;
        }
      };
    }
    function intersect(a, b, two) {
      var pa = d3_geo_cartesian(a), pb = d3_geo_cartesian(b);
      var n1 = [ 1, 0, 0 ], n2 = d3_geo_cartesianCross(pa, pb), n2n2 = d3_geo_cartesianDot(n2, n2), n1n2 = n2[0], determinant = n2n2 - n1n2 * n1n2;
      if (!determinant) return !two && a;
      var c1 = cr * n2n2 / determinant, c2 = -cr * n1n2 / determinant, n1xn2 = d3_geo_cartesianCross(n1, n2), A = d3_geo_cartesianScale(n1, c1), B = d3_geo_cartesianScale(n2, c2);
      d3_geo_cartesianAdd(A, B);
      var u = n1xn2, w = d3_geo_cartesianDot(A, u), uu = d3_geo_cartesianDot(u, u), t2 = w * w - uu * (d3_geo_cartesianDot(A, A) - 1);
      if (t2 < 0) return;
      var t = Math.sqrt(t2), q = d3_geo_cartesianScale(u, (-w - t) / uu);
      d3_geo_cartesianAdd(q, A);
      q = d3_geo_spherical(q);
      if (!two) return q;
      var λ0 = a[0], λ1 = b[0], φ0 = a[1], φ1 = b[1], z;
      if (λ1 < λ0) z = λ0, λ0 = λ1, λ1 = z;
      var δλ = λ1 - λ0, polar = abs(δλ - π) < ε, meridian = polar || δλ < ε;
      if (!polar && φ1 < φ0) z = φ0, φ0 = φ1, φ1 = z;
      if (meridian ? polar ? φ0 + φ1 > 0 ^ q[1] < (abs(q[0] - λ0) < ε ? φ0 : φ1) : φ0 <= q[1] && q[1] <= φ1 : δλ > π ^ (λ0 <= q[0] && q[0] <= λ1)) {
        var q1 = d3_geo_cartesianScale(u, (-w + t) / uu);
        d3_geo_cartesianAdd(q1, A);
        return [ q, d3_geo_spherical(q1) ];
      }
    }
    function code(λ, φ) {
      var r = smallRadius ? radius : π - radius, code = 0;
      if (λ < -r) code |= 1; else if (λ > r) code |= 2;
      if (φ < -r) code |= 4; else if (φ > r) code |= 8;
      return code;
    }
  }
  function d3_geom_clipLine(x0, y0, x1, y1) {
    return function(line) {
      var a = line.a, b = line.b, ax = a.x, ay = a.y, bx = b.x, by = b.y, t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay, r;
      r = x0 - ax;
      if (!dx && r > 0) return;
      r /= dx;
      if (dx < 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      } else if (dx > 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      }
      r = x1 - ax;
      if (!dx && r < 0) return;
      r /= dx;
      if (dx < 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      } else if (dx > 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      }
      r = y0 - ay;
      if (!dy && r > 0) return;
      r /= dy;
      if (dy < 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      } else if (dy > 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      }
      r = y1 - ay;
      if (!dy && r < 0) return;
      r /= dy;
      if (dy < 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      } else if (dy > 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      }
      if (t0 > 0) line.a = {
        x: ax + t0 * dx,
        y: ay + t0 * dy
      };
      if (t1 < 1) line.b = {
        x: ax + t1 * dx,
        y: ay + t1 * dy
      };
      return line;
    };
  }
  var d3_geo_clipExtentMAX = 1e9;
  d3.geo.clipExtent = function() {
    var x0, y0, x1, y1, stream, clip, clipExtent = {
      stream: function(output) {
        if (stream) stream.valid = false;
        stream = clip(output);
        stream.valid = true;
        return stream;
      },
      extent: function(_) {
        if (!arguments.length) return [ [ x0, y0 ], [ x1, y1 ] ];
        clip = d3_geo_clipExtent(x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1]);
        if (stream) stream.valid = false, stream = null;
        return clipExtent;
      }
    };
    return clipExtent.extent([ [ 0, 0 ], [ 960, 500 ] ]);
  };
  function d3_geo_clipExtent(x0, y0, x1, y1) {
    return function(listener) {
      var listener_ = listener, bufferListener = d3_geo_clipBufferListener(), clipLine = d3_geom_clipLine(x0, y0, x1, y1), segments, polygon, ring;
      var clip = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          listener = bufferListener;
          segments = [];
          polygon = [];
          clean = true;
        },
        polygonEnd: function() {
          listener = listener_;
          segments = d3.merge(segments);
          var clipStartInside = insidePolygon([ x0, y1 ]), inside = clean && clipStartInside, visible = segments.length;
          if (inside || visible) {
            listener.polygonStart();
            if (inside) {
              listener.lineStart();
              interpolate(null, null, 1, listener);
              listener.lineEnd();
            }
            if (visible) {
              d3_geo_clipPolygon(segments, compare, clipStartInside, interpolate, listener);
            }
            listener.polygonEnd();
          }
          segments = polygon = ring = null;
        }
      };
      function insidePolygon(p) {
        var wn = 0, n = polygon.length, y = p[1];
        for (var i = 0; i < n; ++i) {
          for (var j = 1, v = polygon[i], m = v.length, a = v[0], b; j < m; ++j) {
            b = v[j];
            if (a[1] <= y) {
              if (b[1] > y && d3_cross2d(a, b, p) > 0) ++wn;
            } else {
              if (b[1] <= y && d3_cross2d(a, b, p) < 0) --wn;
            }
            a = b;
          }
        }
        return wn !== 0;
      }
      function interpolate(from, to, direction, listener) {
        var a = 0, a1 = 0;
        if (from == null || (a = corner(from, direction)) !== (a1 = corner(to, direction)) || comparePoints(from, to) < 0 ^ direction > 0) {
          do {
            listener.point(a === 0 || a === 3 ? x0 : x1, a > 1 ? y1 : y0);
          } while ((a = (a + direction + 4) % 4) !== a1);
        } else {
          listener.point(to[0], to[1]);
        }
      }
      function pointVisible(x, y) {
        return x0 <= x && x <= x1 && y0 <= y && y <= y1;
      }
      function point(x, y) {
        if (pointVisible(x, y)) listener.point(x, y);
      }
      var x__, y__, v__, x_, y_, v_, first, clean;
      function lineStart() {
        clip.point = linePoint;
        if (polygon) polygon.push(ring = []);
        first = true;
        v_ = false;
        x_ = y_ = NaN;
      }
      function lineEnd() {
        if (segments) {
          linePoint(x__, y__);
          if (v__ && v_) bufferListener.rejoin();
          segments.push(bufferListener.buffer());
        }
        clip.point = point;
        if (v_) listener.lineEnd();
      }
      function linePoint(x, y) {
        x = Math.max(-d3_geo_clipExtentMAX, Math.min(d3_geo_clipExtentMAX, x));
        y = Math.max(-d3_geo_clipExtentMAX, Math.min(d3_geo_clipExtentMAX, y));
        var v = pointVisible(x, y);
        if (polygon) ring.push([ x, y ]);
        if (first) {
          x__ = x, y__ = y, v__ = v;
          first = false;
          if (v) {
            listener.lineStart();
            listener.point(x, y);
          }
        } else {
          if (v && v_) listener.point(x, y); else {
            var l = {
              a: {
                x: x_,
                y: y_
              },
              b: {
                x: x,
                y: y
              }
            };
            if (clipLine(l)) {
              if (!v_) {
                listener.lineStart();
                listener.point(l.a.x, l.a.y);
              }
              listener.point(l.b.x, l.b.y);
              if (!v) listener.lineEnd();
              clean = false;
            } else if (v) {
              listener.lineStart();
              listener.point(x, y);
              clean = false;
            }
          }
        }
        x_ = x, y_ = y, v_ = v;
      }
      return clip;
    };
    function corner(p, direction) {
      return abs(p[0] - x0) < ε ? direction > 0 ? 0 : 3 : abs(p[0] - x1) < ε ? direction > 0 ? 2 : 1 : abs(p[1] - y0) < ε ? direction > 0 ? 1 : 0 : direction > 0 ? 3 : 2;
    }
    function compare(a, b) {
      return comparePoints(a.x, b.x);
    }
    function comparePoints(a, b) {
      var ca = corner(a, 1), cb = corner(b, 1);
      return ca !== cb ? ca - cb : ca === 0 ? b[1] - a[1] : ca === 1 ? a[0] - b[0] : ca === 2 ? a[1] - b[1] : b[0] - a[0];
    }
  }
  function d3_geo_compose(a, b) {
    function compose(x, y) {
      return x = a(x, y), b(x[0], x[1]);
    }
    if (a.invert && b.invert) compose.invert = function(x, y) {
      return x = b.invert(x, y), x && a.invert(x[0], x[1]);
    };
    return compose;
  }
  function d3_geo_conic(projectAt) {
    var φ0 = 0, φ1 = π / 3, m = d3_geo_projectionMutator(projectAt), p = m(φ0, φ1);
    p.parallels = function(_) {
      if (!arguments.length) return [ φ0 / π * 180, φ1 / π * 180 ];
      return m(φ0 = _[0] * π / 180, φ1 = _[1] * π / 180);
    };
    return p;
  }
  function d3_geo_conicEqualArea(φ0, φ1) {
    var sinφ0 = Math.sin(φ0), n = (sinφ0 + Math.sin(φ1)) / 2, C = 1 + sinφ0 * (2 * n - sinφ0), ρ0 = Math.sqrt(C) / n;
    function forward(λ, φ) {
      var ρ = Math.sqrt(C - 2 * n * Math.sin(φ)) / n;
      return [ ρ * Math.sin(λ *= n), ρ0 - ρ * Math.cos(λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = ρ0 - y;
      return [ Math.atan2(x, ρ0_y) / n, d3_asin((C - (x * x + ρ0_y * ρ0_y) * n * n) / (2 * n)) ];
    };
    return forward;
  }
  (d3.geo.conicEqualArea = function() {
    return d3_geo_conic(d3_geo_conicEqualArea);
  }).raw = d3_geo_conicEqualArea;
  d3.geo.albers = function() {
    return d3.geo.conicEqualArea().rotate([ 96, 0 ]).center([ -.6, 38.7 ]).parallels([ 29.5, 45.5 ]).scale(1070);
  };
  d3.geo.albersUsa = function() {
    var lower48 = d3.geo.albers();
    var alaska = d3.geo.conicEqualArea().rotate([ 154, 0 ]).center([ -2, 58.5 ]).parallels([ 55, 65 ]);
    var hawaii = d3.geo.conicEqualArea().rotate([ 157, 0 ]).center([ -3, 19.9 ]).parallels([ 8, 18 ]);
    var point, pointStream = {
      point: function(x, y) {
        point = [ x, y ];
      }
    }, lower48Point, alaskaPoint, hawaiiPoint;
    function albersUsa(coordinates) {
      var x = coordinates[0], y = coordinates[1];
      point = null;
      (lower48Point(x, y), point) || (alaskaPoint(x, y), point) || hawaiiPoint(x, y);
      return point;
    }
    albersUsa.invert = function(coordinates) {
      var k = lower48.scale(), t = lower48.translate(), x = (coordinates[0] - t[0]) / k, y = (coordinates[1] - t[1]) / k;
      return (y >= .12 && y < .234 && x >= -.425 && x < -.214 ? alaska : y >= .166 && y < .234 && x >= -.214 && x < -.115 ? hawaii : lower48).invert(coordinates);
    };
    albersUsa.stream = function(stream) {
      var lower48Stream = lower48.stream(stream), alaskaStream = alaska.stream(stream), hawaiiStream = hawaii.stream(stream);
      return {
        point: function(x, y) {
          lower48Stream.point(x, y);
          alaskaStream.point(x, y);
          hawaiiStream.point(x, y);
        },
        sphere: function() {
          lower48Stream.sphere();
          alaskaStream.sphere();
          hawaiiStream.sphere();
        },
        lineStart: function() {
          lower48Stream.lineStart();
          alaskaStream.lineStart();
          hawaiiStream.lineStart();
        },
        lineEnd: function() {
          lower48Stream.lineEnd();
          alaskaStream.lineEnd();
          hawaiiStream.lineEnd();
        },
        polygonStart: function() {
          lower48Stream.polygonStart();
          alaskaStream.polygonStart();
          hawaiiStream.polygonStart();
        },
        polygonEnd: function() {
          lower48Stream.polygonEnd();
          alaskaStream.polygonEnd();
          hawaiiStream.polygonEnd();
        }
      };
    };
    albersUsa.precision = function(_) {
      if (!arguments.length) return lower48.precision();
      lower48.precision(_);
      alaska.precision(_);
      hawaii.precision(_);
      return albersUsa;
    };
    albersUsa.scale = function(_) {
      if (!arguments.length) return lower48.scale();
      lower48.scale(_);
      alaska.scale(_ * .35);
      hawaii.scale(_);
      return albersUsa.translate(lower48.translate());
    };
    albersUsa.translate = function(_) {
      if (!arguments.length) return lower48.translate();
      var k = lower48.scale(), x = +_[0], y = +_[1];
      lower48Point = lower48.translate(_).clipExtent([ [ x - .455 * k, y - .238 * k ], [ x + .455 * k, y + .238 * k ] ]).stream(pointStream).point;
      alaskaPoint = alaska.translate([ x - .307 * k, y + .201 * k ]).clipExtent([ [ x - .425 * k + ε, y + .12 * k + ε ], [ x - .214 * k - ε, y + .234 * k - ε ] ]).stream(pointStream).point;
      hawaiiPoint = hawaii.translate([ x - .205 * k, y + .212 * k ]).clipExtent([ [ x - .214 * k + ε, y + .166 * k + ε ], [ x - .115 * k - ε, y + .234 * k - ε ] ]).stream(pointStream).point;
      return albersUsa;
    };
    return albersUsa.scale(1070);
  };
  var d3_geo_pathAreaSum, d3_geo_pathAreaPolygon, d3_geo_pathArea = {
    point: d3_noop,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: function() {
      d3_geo_pathAreaPolygon = 0;
      d3_geo_pathArea.lineStart = d3_geo_pathAreaRingStart;
    },
    polygonEnd: function() {
      d3_geo_pathArea.lineStart = d3_geo_pathArea.lineEnd = d3_geo_pathArea.point = d3_noop;
      d3_geo_pathAreaSum += abs(d3_geo_pathAreaPolygon / 2);
    }
  };
  function d3_geo_pathAreaRingStart() {
    var x00, y00, x0, y0;
    d3_geo_pathArea.point = function(x, y) {
      d3_geo_pathArea.point = nextPoint;
      x00 = x0 = x, y00 = y0 = y;
    };
    function nextPoint(x, y) {
      d3_geo_pathAreaPolygon += y0 * x - x0 * y;
      x0 = x, y0 = y;
    }
    d3_geo_pathArea.lineEnd = function() {
      nextPoint(x00, y00);
    };
  }
  var d3_geo_pathBoundsX0, d3_geo_pathBoundsY0, d3_geo_pathBoundsX1, d3_geo_pathBoundsY1;
  var d3_geo_pathBounds = {
    point: d3_geo_pathBoundsPoint,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: d3_noop,
    polygonEnd: d3_noop
  };
  function d3_geo_pathBoundsPoint(x, y) {
    if (x < d3_geo_pathBoundsX0) d3_geo_pathBoundsX0 = x;
    if (x > d3_geo_pathBoundsX1) d3_geo_pathBoundsX1 = x;
    if (y < d3_geo_pathBoundsY0) d3_geo_pathBoundsY0 = y;
    if (y > d3_geo_pathBoundsY1) d3_geo_pathBoundsY1 = y;
  }
  function d3_geo_pathBuffer() {
    var pointCircle = d3_geo_pathBufferCircle(4.5), buffer = [];
    var stream = {
      point: point,
      lineStart: function() {
        stream.point = pointLineStart;
      },
      lineEnd: lineEnd,
      polygonStart: function() {
        stream.lineEnd = lineEndPolygon;
      },
      polygonEnd: function() {
        stream.lineEnd = lineEnd;
        stream.point = point;
      },
      pointRadius: function(_) {
        pointCircle = d3_geo_pathBufferCircle(_);
        return stream;
      },
      result: function() {
        if (buffer.length) {
          var result = buffer.join("");
          buffer = [];
          return result;
        }
      }
    };
    function point(x, y) {
      buffer.push("M", x, ",", y, pointCircle);
    }
    function pointLineStart(x, y) {
      buffer.push("M", x, ",", y);
      stream.point = pointLine;
    }
    function pointLine(x, y) {
      buffer.push("L", x, ",", y);
    }
    function lineEnd() {
      stream.point = point;
    }
    function lineEndPolygon() {
      buffer.push("Z");
    }
    return stream;
  }
  function d3_geo_pathBufferCircle(radius) {
    return "m0," + radius + "a" + radius + "," + radius + " 0 1,1 0," + -2 * radius + "a" + radius + "," + radius + " 0 1,1 0," + 2 * radius + "z";
  }
  var d3_geo_pathCentroid = {
    point: d3_geo_pathCentroidPoint,
    lineStart: d3_geo_pathCentroidLineStart,
    lineEnd: d3_geo_pathCentroidLineEnd,
    polygonStart: function() {
      d3_geo_pathCentroid.lineStart = d3_geo_pathCentroidRingStart;
    },
    polygonEnd: function() {
      d3_geo_pathCentroid.point = d3_geo_pathCentroidPoint;
      d3_geo_pathCentroid.lineStart = d3_geo_pathCentroidLineStart;
      d3_geo_pathCentroid.lineEnd = d3_geo_pathCentroidLineEnd;
    }
  };
  function d3_geo_pathCentroidPoint(x, y) {
    d3_geo_centroidX0 += x;
    d3_geo_centroidY0 += y;
    ++d3_geo_centroidZ0;
  }
  function d3_geo_pathCentroidLineStart() {
    var x0, y0;
    d3_geo_pathCentroid.point = function(x, y) {
      d3_geo_pathCentroid.point = nextPoint;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    };
    function nextPoint(x, y) {
      var dx = x - x0, dy = y - y0, z = Math.sqrt(dx * dx + dy * dy);
      d3_geo_centroidX1 += z * (x0 + x) / 2;
      d3_geo_centroidY1 += z * (y0 + y) / 2;
      d3_geo_centroidZ1 += z;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    }
  }
  function d3_geo_pathCentroidLineEnd() {
    d3_geo_pathCentroid.point = d3_geo_pathCentroidPoint;
  }
  function d3_geo_pathCentroidRingStart() {
    var x00, y00, x0, y0;
    d3_geo_pathCentroid.point = function(x, y) {
      d3_geo_pathCentroid.point = nextPoint;
      d3_geo_pathCentroidPoint(x00 = x0 = x, y00 = y0 = y);
    };
    function nextPoint(x, y) {
      var dx = x - x0, dy = y - y0, z = Math.sqrt(dx * dx + dy * dy);
      d3_geo_centroidX1 += z * (x0 + x) / 2;
      d3_geo_centroidY1 += z * (y0 + y) / 2;
      d3_geo_centroidZ1 += z;
      z = y0 * x - x0 * y;
      d3_geo_centroidX2 += z * (x0 + x);
      d3_geo_centroidY2 += z * (y0 + y);
      d3_geo_centroidZ2 += z * 3;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    }
    d3_geo_pathCentroid.lineEnd = function() {
      nextPoint(x00, y00);
    };
  }
  function d3_geo_pathContext(context) {
    var pointRadius = 4.5;
    var stream = {
      point: point,
      lineStart: function() {
        stream.point = pointLineStart;
      },
      lineEnd: lineEnd,
      polygonStart: function() {
        stream.lineEnd = lineEndPolygon;
      },
      polygonEnd: function() {
        stream.lineEnd = lineEnd;
        stream.point = point;
      },
      pointRadius: function(_) {
        pointRadius = _;
        return stream;
      },
      result: d3_noop
    };
    function point(x, y) {
      context.moveTo(x, y);
      context.arc(x, y, pointRadius, 0, τ);
    }
    function pointLineStart(x, y) {
      context.moveTo(x, y);
      stream.point = pointLine;
    }
    function pointLine(x, y) {
      context.lineTo(x, y);
    }
    function lineEnd() {
      stream.point = point;
    }
    function lineEndPolygon() {
      context.closePath();
    }
    return stream;
  }
  function d3_geo_resample(project) {
    var δ2 = .5, cosMinDistance = Math.cos(30 * d3_radians), maxDepth = 16;
    function resample(stream) {
      return (maxDepth ? resampleRecursive : resampleNone)(stream);
    }
    function resampleNone(stream) {
      return d3_geo_transformPoint(stream, function(x, y) {
        x = project(x, y);
        stream.point(x[0], x[1]);
      });
    }
    function resampleRecursive(stream) {
      var λ00, φ00, x00, y00, a00, b00, c00, λ0, x0, y0, a0, b0, c0;
      var resample = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          stream.polygonStart();
          resample.lineStart = ringStart;
        },
        polygonEnd: function() {
          stream.polygonEnd();
          resample.lineStart = lineStart;
        }
      };
      function point(x, y) {
        x = project(x, y);
        stream.point(x[0], x[1]);
      }
      function lineStart() {
        x0 = NaN;
        resample.point = linePoint;
        stream.lineStart();
      }
      function linePoint(λ, φ) {
        var c = d3_geo_cartesian([ λ, φ ]), p = project(λ, φ);
        resampleLineTo(x0, y0, λ0, a0, b0, c0, x0 = p[0], y0 = p[1], λ0 = λ, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
        stream.point(x0, y0);
      }
      function lineEnd() {
        resample.point = point;
        stream.lineEnd();
      }
      function ringStart() {
        lineStart();
        resample.point = ringPoint;
        resample.lineEnd = ringEnd;
      }
      function ringPoint(λ, φ) {
        linePoint(λ00 = λ, φ00 = φ), x00 = x0, y00 = y0, a00 = a0, b00 = b0, c00 = c0;
        resample.point = linePoint;
      }
      function ringEnd() {
        resampleLineTo(x0, y0, λ0, a0, b0, c0, x00, y00, λ00, a00, b00, c00, maxDepth, stream);
        resample.lineEnd = lineEnd;
        lineEnd();
      }
      return resample;
    }
    function resampleLineTo(x0, y0, λ0, a0, b0, c0, x1, y1, λ1, a1, b1, c1, depth, stream) {
      var dx = x1 - x0, dy = y1 - y0, d2 = dx * dx + dy * dy;
      if (d2 > 4 * δ2 && depth--) {
        var a = a0 + a1, b = b0 + b1, c = c0 + c1, m = Math.sqrt(a * a + b * b + c * c), φ2 = Math.asin(c /= m), λ2 = abs(abs(c) - 1) < ε || abs(λ0 - λ1) < ε ? (λ0 + λ1) / 2 : Math.atan2(b, a), p = project(λ2, φ2), x2 = p[0], y2 = p[1], dx2 = x2 - x0, dy2 = y2 - y0, dz = dy * dx2 - dx * dy2;
        if (dz * dz / d2 > δ2 || abs((dx * dx2 + dy * dy2) / d2 - .5) > .3 || a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) {
          resampleLineTo(x0, y0, λ0, a0, b0, c0, x2, y2, λ2, a /= m, b /= m, c, depth, stream);
          stream.point(x2, y2);
          resampleLineTo(x2, y2, λ2, a, b, c, x1, y1, λ1, a1, b1, c1, depth, stream);
        }
      }
    }
    resample.precision = function(_) {
      if (!arguments.length) return Math.sqrt(δ2);
      maxDepth = (δ2 = _ * _) > 0 && 16;
      return resample;
    };
    return resample;
  }
  d3.geo.path = function() {
    var pointRadius = 4.5, projection, context, projectStream, contextStream, cacheStream;
    function path(object) {
      if (object) {
        if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
        if (!cacheStream || !cacheStream.valid) cacheStream = projectStream(contextStream);
        d3.geo.stream(object, cacheStream);
      }
      return contextStream.result();
    }
    path.area = function(object) {
      d3_geo_pathAreaSum = 0;
      d3.geo.stream(object, projectStream(d3_geo_pathArea));
      return d3_geo_pathAreaSum;
    };
    path.centroid = function(object) {
      d3_geo_centroidX0 = d3_geo_centroidY0 = d3_geo_centroidZ0 = d3_geo_centroidX1 = d3_geo_centroidY1 = d3_geo_centroidZ1 = d3_geo_centroidX2 = d3_geo_centroidY2 = d3_geo_centroidZ2 = 0;
      d3.geo.stream(object, projectStream(d3_geo_pathCentroid));
      return d3_geo_centroidZ2 ? [ d3_geo_centroidX2 / d3_geo_centroidZ2, d3_geo_centroidY2 / d3_geo_centroidZ2 ] : d3_geo_centroidZ1 ? [ d3_geo_centroidX1 / d3_geo_centroidZ1, d3_geo_centroidY1 / d3_geo_centroidZ1 ] : d3_geo_centroidZ0 ? [ d3_geo_centroidX0 / d3_geo_centroidZ0, d3_geo_centroidY0 / d3_geo_centroidZ0 ] : [ NaN, NaN ];
    };
    path.bounds = function(object) {
      d3_geo_pathBoundsX1 = d3_geo_pathBoundsY1 = -(d3_geo_pathBoundsX0 = d3_geo_pathBoundsY0 = Infinity);
      d3.geo.stream(object, projectStream(d3_geo_pathBounds));
      return [ [ d3_geo_pathBoundsX0, d3_geo_pathBoundsY0 ], [ d3_geo_pathBoundsX1, d3_geo_pathBoundsY1 ] ];
    };
    path.projection = function(_) {
      if (!arguments.length) return projection;
      projectStream = (projection = _) ? _.stream || d3_geo_pathProjectStream(_) : d3_identity;
      return reset();
    };
    path.context = function(_) {
      if (!arguments.length) return context;
      contextStream = (context = _) == null ? new d3_geo_pathBuffer() : new d3_geo_pathContext(_);
      if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
      return reset();
    };
    path.pointRadius = function(_) {
      if (!arguments.length) return pointRadius;
      pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
      return path;
    };
    function reset() {
      cacheStream = null;
      return path;
    }
    return path.projection(d3.geo.albersUsa()).context(null);
  };
  function d3_geo_pathProjectStream(project) {
    var resample = d3_geo_resample(function(x, y) {
      return project([ x * d3_degrees, y * d3_degrees ]);
    });
    return function(stream) {
      return d3_geo_projectionRadians(resample(stream));
    };
  }
  d3.geo.transform = function(methods) {
    return {
      stream: function(stream) {
        var transform = new d3_geo_transform(stream);
        for (var k in methods) transform[k] = methods[k];
        return transform;
      }
    };
  };
  function d3_geo_transform(stream) {
    this.stream = stream;
  }
  d3_geo_transform.prototype = {
    point: function(x, y) {
      this.stream.point(x, y);
    },
    sphere: function() {
      this.stream.sphere();
    },
    lineStart: function() {
      this.stream.lineStart();
    },
    lineEnd: function() {
      this.stream.lineEnd();
    },
    polygonStart: function() {
      this.stream.polygonStart();
    },
    polygonEnd: function() {
      this.stream.polygonEnd();
    }
  };
  function d3_geo_transformPoint(stream, point) {
    return {
      point: point,
      sphere: function() {
        stream.sphere();
      },
      lineStart: function() {
        stream.lineStart();
      },
      lineEnd: function() {
        stream.lineEnd();
      },
      polygonStart: function() {
        stream.polygonStart();
      },
      polygonEnd: function() {
        stream.polygonEnd();
      }
    };
  }
  d3.geo.projection = d3_geo_projection;
  d3.geo.projectionMutator = d3_geo_projectionMutator;
  function d3_geo_projection(project) {
    return d3_geo_projectionMutator(function() {
      return project;
    })();
  }
  function d3_geo_projectionMutator(projectAt) {
    var project, rotate, projectRotate, projectResample = d3_geo_resample(function(x, y) {
      x = project(x, y);
      return [ x[0] * k + δx, δy - x[1] * k ];
    }), k = 150, x = 480, y = 250, λ = 0, φ = 0, δλ = 0, δφ = 0, δγ = 0, δx, δy, preclip = d3_geo_clipAntimeridian, postclip = d3_identity, clipAngle = null, clipExtent = null, stream;
    function projection(point) {
      point = projectRotate(point[0] * d3_radians, point[1] * d3_radians);
      return [ point[0] * k + δx, δy - point[1] * k ];
    }
    function invert(point) {
      point = projectRotate.invert((point[0] - δx) / k, (δy - point[1]) / k);
      return point && [ point[0] * d3_degrees, point[1] * d3_degrees ];
    }
    projection.stream = function(output) {
      if (stream) stream.valid = false;
      stream = d3_geo_projectionRadians(preclip(rotate, projectResample(postclip(output))));
      stream.valid = true;
      return stream;
    };
    projection.clipAngle = function(_) {
      if (!arguments.length) return clipAngle;
      preclip = _ == null ? (clipAngle = _, d3_geo_clipAntimeridian) : d3_geo_clipCircle((clipAngle = +_) * d3_radians);
      return invalidate();
    };
    projection.clipExtent = function(_) {
      if (!arguments.length) return clipExtent;
      clipExtent = _;
      postclip = _ ? d3_geo_clipExtent(_[0][0], _[0][1], _[1][0], _[1][1]) : d3_identity;
      return invalidate();
    };
    projection.scale = function(_) {
      if (!arguments.length) return k;
      k = +_;
      return reset();
    };
    projection.translate = function(_) {
      if (!arguments.length) return [ x, y ];
      x = +_[0];
      y = +_[1];
      return reset();
    };
    projection.center = function(_) {
      if (!arguments.length) return [ λ * d3_degrees, φ * d3_degrees ];
      λ = _[0] % 360 * d3_radians;
      φ = _[1] % 360 * d3_radians;
      return reset();
    };
    projection.rotate = function(_) {
      if (!arguments.length) return [ δλ * d3_degrees, δφ * d3_degrees, δγ * d3_degrees ];
      δλ = _[0] % 360 * d3_radians;
      δφ = _[1] % 360 * d3_radians;
      δγ = _.length > 2 ? _[2] % 360 * d3_radians : 0;
      return reset();
    };
    d3.rebind(projection, projectResample, "precision");
    function reset() {
      projectRotate = d3_geo_compose(rotate = d3_geo_rotation(δλ, δφ, δγ), project);
      var center = project(λ, φ);
      δx = x - center[0] * k;
      δy = y + center[1] * k;
      return invalidate();
    }
    function invalidate() {
      if (stream) stream.valid = false, stream = null;
      return projection;
    }
    return function() {
      project = projectAt.apply(this, arguments);
      projection.invert = project.invert && invert;
      return reset();
    };
  }
  function d3_geo_projectionRadians(stream) {
    return d3_geo_transformPoint(stream, function(x, y) {
      stream.point(x * d3_radians, y * d3_radians);
    });
  }
  function d3_geo_equirectangular(λ, φ) {
    return [ λ, φ ];
  }
  (d3.geo.equirectangular = function() {
    return d3_geo_projection(d3_geo_equirectangular);
  }).raw = d3_geo_equirectangular.invert = d3_geo_equirectangular;
  d3.geo.rotation = function(rotate) {
    rotate = d3_geo_rotation(rotate[0] % 360 * d3_radians, rotate[1] * d3_radians, rotate.length > 2 ? rotate[2] * d3_radians : 0);
    function forward(coordinates) {
      coordinates = rotate(coordinates[0] * d3_radians, coordinates[1] * d3_radians);
      return coordinates[0] *= d3_degrees, coordinates[1] *= d3_degrees, coordinates;
    }
    forward.invert = function(coordinates) {
      coordinates = rotate.invert(coordinates[0] * d3_radians, coordinates[1] * d3_radians);
      return coordinates[0] *= d3_degrees, coordinates[1] *= d3_degrees, coordinates;
    };
    return forward;
  };
  function d3_geo_identityRotation(λ, φ) {
    return [ λ > π ? λ - τ : λ < -π ? λ + τ : λ, φ ];
  }
  d3_geo_identityRotation.invert = d3_geo_equirectangular;
  function d3_geo_rotation(δλ, δφ, δγ) {
    return δλ ? δφ || δγ ? d3_geo_compose(d3_geo_rotationλ(δλ), d3_geo_rotationφγ(δφ, δγ)) : d3_geo_rotationλ(δλ) : δφ || δγ ? d3_geo_rotationφγ(δφ, δγ) : d3_geo_identityRotation;
  }
  function d3_geo_forwardRotationλ(δλ) {
    return function(λ, φ) {
      return λ += δλ, [ λ > π ? λ - τ : λ < -π ? λ + τ : λ, φ ];
    };
  }
  function d3_geo_rotationλ(δλ) {
    var rotation = d3_geo_forwardRotationλ(δλ);
    rotation.invert = d3_geo_forwardRotationλ(-δλ);
    return rotation;
  }
  function d3_geo_rotationφγ(δφ, δγ) {
    var cosδφ = Math.cos(δφ), sinδφ = Math.sin(δφ), cosδγ = Math.cos(δγ), sinδγ = Math.sin(δγ);
    function rotation(λ, φ) {
      var cosφ = Math.cos(φ), x = Math.cos(λ) * cosφ, y = Math.sin(λ) * cosφ, z = Math.sin(φ), k = z * cosδφ + x * sinδφ;
      return [ Math.atan2(y * cosδγ - k * sinδγ, x * cosδφ - z * sinδφ), d3_asin(k * cosδγ + y * sinδγ) ];
    }
    rotation.invert = function(λ, φ) {
      var cosφ = Math.cos(φ), x = Math.cos(λ) * cosφ, y = Math.sin(λ) * cosφ, z = Math.sin(φ), k = z * cosδγ - y * sinδγ;
      return [ Math.atan2(y * cosδγ + z * sinδγ, x * cosδφ + k * sinδφ), d3_asin(k * cosδφ - x * sinδφ) ];
    };
    return rotation;
  }
  d3.geo.circle = function() {
    var origin = [ 0, 0 ], angle, precision = 6, interpolate;
    function circle() {
      var center = typeof origin === "function" ? origin.apply(this, arguments) : origin, rotate = d3_geo_rotation(-center[0] * d3_radians, -center[1] * d3_radians, 0).invert, ring = [];
      interpolate(null, null, 1, {
        point: function(x, y) {
          ring.push(x = rotate(x, y));
          x[0] *= d3_degrees, x[1] *= d3_degrees;
        }
      });
      return {
        type: "Polygon",
        coordinates: [ ring ]
      };
    }
    circle.origin = function(x) {
      if (!arguments.length) return origin;
      origin = x;
      return circle;
    };
    circle.angle = function(x) {
      if (!arguments.length) return angle;
      interpolate = d3_geo_circleInterpolate((angle = +x) * d3_radians, precision * d3_radians);
      return circle;
    };
    circle.precision = function(_) {
      if (!arguments.length) return precision;
      interpolate = d3_geo_circleInterpolate(angle * d3_radians, (precision = +_) * d3_radians);
      return circle;
    };
    return circle.angle(90);
  };
  function d3_geo_circleInterpolate(radius, precision) {
    var cr = Math.cos(radius), sr = Math.sin(radius);
    return function(from, to, direction, listener) {
      var step = direction * precision;
      if (from != null) {
        from = d3_geo_circleAngle(cr, from);
        to = d3_geo_circleAngle(cr, to);
        if (direction > 0 ? from < to : from > to) from += direction * τ;
      } else {
        from = radius + direction * τ;
        to = radius - .5 * step;
      }
      for (var point, t = from; direction > 0 ? t > to : t < to; t -= step) {
        listener.point((point = d3_geo_spherical([ cr, -sr * Math.cos(t), -sr * Math.sin(t) ]))[0], point[1]);
      }
    };
  }
  function d3_geo_circleAngle(cr, point) {
    var a = d3_geo_cartesian(point);
    a[0] -= cr;
    d3_geo_cartesianNormalize(a);
    var angle = d3_acos(-a[1]);
    return ((-a[2] < 0 ? -angle : angle) + 2 * Math.PI - ε) % (2 * Math.PI);
  }
  d3.geo.distance = function(a, b) {
    var Δλ = (b[0] - a[0]) * d3_radians, φ0 = a[1] * d3_radians, φ1 = b[1] * d3_radians, sinΔλ = Math.sin(Δλ), cosΔλ = Math.cos(Δλ), sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0), sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1), t;
    return Math.atan2(Math.sqrt((t = cosφ1 * sinΔλ) * t + (t = cosφ0 * sinφ1 - sinφ0 * cosφ1 * cosΔλ) * t), sinφ0 * sinφ1 + cosφ0 * cosφ1 * cosΔλ);
  };
  d3.geo.graticule = function() {
    var x1, x0, X1, X0, y1, y0, Y1, Y0, dx = 10, dy = dx, DX = 90, DY = 360, x, y, X, Y, precision = 2.5;
    function graticule() {
      return {
        type: "MultiLineString",
        coordinates: lines()
      };
    }
    function lines() {
      return d3.range(Math.ceil(X0 / DX) * DX, X1, DX).map(X).concat(d3.range(Math.ceil(Y0 / DY) * DY, Y1, DY).map(Y)).concat(d3.range(Math.ceil(x0 / dx) * dx, x1, dx).filter(function(x) {
        return abs(x % DX) > ε;
      }).map(x)).concat(d3.range(Math.ceil(y0 / dy) * dy, y1, dy).filter(function(y) {
        return abs(y % DY) > ε;
      }).map(y));
    }
    graticule.lines = function() {
      return lines().map(function(coordinates) {
        return {
          type: "LineString",
          coordinates: coordinates
        };
      });
    };
    graticule.outline = function() {
      return {
        type: "Polygon",
        coordinates: [ X(X0).concat(Y(Y1).slice(1), X(X1).reverse().slice(1), Y(Y0).reverse().slice(1)) ]
      };
    };
    graticule.extent = function(_) {
      if (!arguments.length) return graticule.minorExtent();
      return graticule.majorExtent(_).minorExtent(_);
    };
    graticule.majorExtent = function(_) {
      if (!arguments.length) return [ [ X0, Y0 ], [ X1, Y1 ] ];
      X0 = +_[0][0], X1 = +_[1][0];
      Y0 = +_[0][1], Y1 = +_[1][1];
      if (X0 > X1) _ = X0, X0 = X1, X1 = _;
      if (Y0 > Y1) _ = Y0, Y0 = Y1, Y1 = _;
      return graticule.precision(precision);
    };
    graticule.minorExtent = function(_) {
      if (!arguments.length) return [ [ x0, y0 ], [ x1, y1 ] ];
      x0 = +_[0][0], x1 = +_[1][0];
      y0 = +_[0][1], y1 = +_[1][1];
      if (x0 > x1) _ = x0, x0 = x1, x1 = _;
      if (y0 > y1) _ = y0, y0 = y1, y1 = _;
      return graticule.precision(precision);
    };
    graticule.step = function(_) {
      if (!arguments.length) return graticule.minorStep();
      return graticule.majorStep(_).minorStep(_);
    };
    graticule.majorStep = function(_) {
      if (!arguments.length) return [ DX, DY ];
      DX = +_[0], DY = +_[1];
      return graticule;
    };
    graticule.minorStep = function(_) {
      if (!arguments.length) return [ dx, dy ];
      dx = +_[0], dy = +_[1];
      return graticule;
    };
    graticule.precision = function(_) {
      if (!arguments.length) return precision;
      precision = +_;
      x = d3_geo_graticuleX(y0, y1, 90);
      y = d3_geo_graticuleY(x0, x1, precision);
      X = d3_geo_graticuleX(Y0, Y1, 90);
      Y = d3_geo_graticuleY(X0, X1, precision);
      return graticule;
    };
    return graticule.majorExtent([ [ -180, -90 + ε ], [ 180, 90 - ε ] ]).minorExtent([ [ -180, -80 - ε ], [ 180, 80 + ε ] ]);
  };
  function d3_geo_graticuleX(y0, y1, dy) {
    var y = d3.range(y0, y1 - ε, dy).concat(y1);
    return function(x) {
      return y.map(function(y) {
        return [ x, y ];
      });
    };
  }
  function d3_geo_graticuleY(x0, x1, dx) {
    var x = d3.range(x0, x1 - ε, dx).concat(x1);
    return function(y) {
      return x.map(function(x) {
        return [ x, y ];
      });
    };
  }
  function d3_source(d) {
    return d.source;
  }
  function d3_target(d) {
    return d.target;
  }
  d3.geo.greatArc = function() {
    var source = d3_source, source_, target = d3_target, target_;
    function greatArc() {
      return {
        type: "LineString",
        coordinates: [ source_ || source.apply(this, arguments), target_ || target.apply(this, arguments) ]
      };
    }
    greatArc.distance = function() {
      return d3.geo.distance(source_ || source.apply(this, arguments), target_ || target.apply(this, arguments));
    };
    greatArc.source = function(_) {
      if (!arguments.length) return source;
      source = _, source_ = typeof _ === "function" ? null : _;
      return greatArc;
    };
    greatArc.target = function(_) {
      if (!arguments.length) return target;
      target = _, target_ = typeof _ === "function" ? null : _;
      return greatArc;
    };
    greatArc.precision = function() {
      return arguments.length ? greatArc : 0;
    };
    return greatArc;
  };
  d3.geo.interpolate = function(source, target) {
    return d3_geo_interpolate(source[0] * d3_radians, source[1] * d3_radians, target[0] * d3_radians, target[1] * d3_radians);
  };
  function d3_geo_interpolate(x0, y0, x1, y1) {
    var cy0 = Math.cos(y0), sy0 = Math.sin(y0), cy1 = Math.cos(y1), sy1 = Math.sin(y1), kx0 = cy0 * Math.cos(x0), ky0 = cy0 * Math.sin(x0), kx1 = cy1 * Math.cos(x1), ky1 = cy1 * Math.sin(x1), d = 2 * Math.asin(Math.sqrt(d3_haversin(y1 - y0) + cy0 * cy1 * d3_haversin(x1 - x0))), k = 1 / Math.sin(d);
    var interpolate = d ? function(t) {
      var B = Math.sin(t *= d) * k, A = Math.sin(d - t) * k, x = A * kx0 + B * kx1, y = A * ky0 + B * ky1, z = A * sy0 + B * sy1;
      return [ Math.atan2(y, x) * d3_degrees, Math.atan2(z, Math.sqrt(x * x + y * y)) * d3_degrees ];
    } : function() {
      return [ x0 * d3_degrees, y0 * d3_degrees ];
    };
    interpolate.distance = d;
    return interpolate;
  }
  d3.geo.length = function(object) {
    d3_geo_lengthSum = 0;
    d3.geo.stream(object, d3_geo_length);
    return d3_geo_lengthSum;
  };
  var d3_geo_lengthSum;
  var d3_geo_length = {
    sphere: d3_noop,
    point: d3_noop,
    lineStart: d3_geo_lengthLineStart,
    lineEnd: d3_noop,
    polygonStart: d3_noop,
    polygonEnd: d3_noop
  };
  function d3_geo_lengthLineStart() {
    var λ0, sinφ0, cosφ0;
    d3_geo_length.point = function(λ, φ) {
      λ0 = λ * d3_radians, sinφ0 = Math.sin(φ *= d3_radians), cosφ0 = Math.cos(φ);
      d3_geo_length.point = nextPoint;
    };
    d3_geo_length.lineEnd = function() {
      d3_geo_length.point = d3_geo_length.lineEnd = d3_noop;
    };
    function nextPoint(λ, φ) {
      var sinφ = Math.sin(φ *= d3_radians), cosφ = Math.cos(φ), t = abs((λ *= d3_radians) - λ0), cosΔλ = Math.cos(t);
      d3_geo_lengthSum += Math.atan2(Math.sqrt((t = cosφ * Math.sin(t)) * t + (t = cosφ0 * sinφ - sinφ0 * cosφ * cosΔλ) * t), sinφ0 * sinφ + cosφ0 * cosφ * cosΔλ);
      λ0 = λ, sinφ0 = sinφ, cosφ0 = cosφ;
    }
  }
  function d3_geo_azimuthal(scale, angle) {
    function azimuthal(λ, φ) {
      var cosλ = Math.cos(λ), cosφ = Math.cos(φ), k = scale(cosλ * cosφ);
      return [ k * cosφ * Math.sin(λ), k * Math.sin(φ) ];
    }
    azimuthal.invert = function(x, y) {
      var ρ = Math.sqrt(x * x + y * y), c = angle(ρ), sinc = Math.sin(c), cosc = Math.cos(c);
      return [ Math.atan2(x * sinc, ρ * cosc), Math.asin(ρ && y * sinc / ρ) ];
    };
    return azimuthal;
  }
  var d3_geo_azimuthalEqualArea = d3_geo_azimuthal(function(cosλcosφ) {
    return Math.sqrt(2 / (1 + cosλcosφ));
  }, function(ρ) {
    return 2 * Math.asin(ρ / 2);
  });
  (d3.geo.azimuthalEqualArea = function() {
    return d3_geo_projection(d3_geo_azimuthalEqualArea);
  }).raw = d3_geo_azimuthalEqualArea;
  var d3_geo_azimuthalEquidistant = d3_geo_azimuthal(function(cosλcosφ) {
    var c = Math.acos(cosλcosφ);
    return c && c / Math.sin(c);
  }, d3_identity);
  (d3.geo.azimuthalEquidistant = function() {
    return d3_geo_projection(d3_geo_azimuthalEquidistant);
  }).raw = d3_geo_azimuthalEquidistant;
  function d3_geo_conicConformal(φ0, φ1) {
    var cosφ0 = Math.cos(φ0), t = function(φ) {
      return Math.tan(π / 4 + φ / 2);
    }, n = φ0 === φ1 ? Math.sin(φ0) : Math.log(cosφ0 / Math.cos(φ1)) / Math.log(t(φ1) / t(φ0)), F = cosφ0 * Math.pow(t(φ0), n) / n;
    if (!n) return d3_geo_mercator;
    function forward(λ, φ) {
      var ρ = abs(abs(φ) - halfπ) < ε ? 0 : F / Math.pow(t(φ), n);
      return [ ρ * Math.sin(n * λ), F - ρ * Math.cos(n * λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = F - y, ρ = d3_sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y);
      return [ Math.atan2(x, ρ0_y) / n, 2 * Math.atan(Math.pow(F / ρ, 1 / n)) - halfπ ];
    };
    return forward;
  }
  (d3.geo.conicConformal = function() {
    return d3_geo_conic(d3_geo_conicConformal);
  }).raw = d3_geo_conicConformal;
  function d3_geo_conicEquidistant(φ0, φ1) {
    var cosφ0 = Math.cos(φ0), n = φ0 === φ1 ? Math.sin(φ0) : (cosφ0 - Math.cos(φ1)) / (φ1 - φ0), G = cosφ0 / n + φ0;
    if (abs(n) < ε) return d3_geo_equirectangular;
    function forward(λ, φ) {
      var ρ = G - φ;
      return [ ρ * Math.sin(n * λ), G - ρ * Math.cos(n * λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = G - y;
      return [ Math.atan2(x, ρ0_y) / n, G - d3_sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y) ];
    };
    return forward;
  }
  (d3.geo.conicEquidistant = function() {
    return d3_geo_conic(d3_geo_conicEquidistant);
  }).raw = d3_geo_conicEquidistant;
  var d3_geo_gnomonic = d3_geo_azimuthal(function(cosλcosφ) {
    return 1 / cosλcosφ;
  }, Math.atan);
  (d3.geo.gnomonic = function() {
    return d3_geo_projection(d3_geo_gnomonic);
  }).raw = d3_geo_gnomonic;
  function d3_geo_mercator(λ, φ) {
    return [ λ, Math.log(Math.tan(π / 4 + φ / 2)) ];
  }
  d3_geo_mercator.invert = function(x, y) {
    return [ x, 2 * Math.atan(Math.exp(y)) - halfπ ];
  };
  function d3_geo_mercatorProjection(project) {
    var m = d3_geo_projection(project), scale = m.scale, translate = m.translate, clipExtent = m.clipExtent, clipAuto;
    m.scale = function() {
      var v = scale.apply(m, arguments);
      return v === m ? clipAuto ? m.clipExtent(null) : m : v;
    };
    m.translate = function() {
      var v = translate.apply(m, arguments);
      return v === m ? clipAuto ? m.clipExtent(null) : m : v;
    };
    m.clipExtent = function(_) {
      var v = clipExtent.apply(m, arguments);
      if (v === m) {
        if (clipAuto = _ == null) {
          var k = π * scale(), t = translate();
          clipExtent([ [ t[0] - k, t[1] - k ], [ t[0] + k, t[1] + k ] ]);
        }
      } else if (clipAuto) {
        v = null;
      }
      return v;
    };
    return m.clipExtent(null);
  }
  (d3.geo.mercator = function() {
    return d3_geo_mercatorProjection(d3_geo_mercator);
  }).raw = d3_geo_mercator;
  var d3_geo_orthographic = d3_geo_azimuthal(function() {
    return 1;
  }, Math.asin);
  (d3.geo.orthographic = function() {
    return d3_geo_projection(d3_geo_orthographic);
  }).raw = d3_geo_orthographic;
  var d3_geo_stereographic = d3_geo_azimuthal(function(cosλcosφ) {
    return 1 / (1 + cosλcosφ);
  }, function(ρ) {
    return 2 * Math.atan(ρ);
  });
  (d3.geo.stereographic = function() {
    return d3_geo_projection(d3_geo_stereographic);
  }).raw = d3_geo_stereographic;
  function d3_geo_transverseMercator(λ, φ) {
    return [ Math.log(Math.tan(π / 4 + φ / 2)), -λ ];
  }
  d3_geo_transverseMercator.invert = function(x, y) {
    return [ -y, 2 * Math.atan(Math.exp(x)) - halfπ ];
  };
  (d3.geo.transverseMercator = function() {
    var projection = d3_geo_mercatorProjection(d3_geo_transverseMercator), center = projection.center, rotate = projection.rotate;
    projection.center = function(_) {
      return _ ? center([ -_[1], _[0] ]) : (_ = center(), [ -_[1], _[0] ]);
    };
    projection.rotate = function(_) {
      return _ ? rotate([ _[0], _[1], _.length > 2 ? _[2] + 90 : 90 ]) : (_ = rotate(), 
      [ _[0], _[1], _[2] - 90 ]);
    };
    return projection.rotate([ 0, 0 ]);
  }).raw = d3_geo_transverseMercator;
  d3.geom = {};
  function d3_geom_pointX(d) {
    return d[0];
  }
  function d3_geom_pointY(d) {
    return d[1];
  }
  d3.geom.hull = function(vertices) {
    var x = d3_geom_pointX, y = d3_geom_pointY;
    if (arguments.length) return hull(vertices);
    function hull(data) {
      if (data.length < 3) return [];
      var fx = d3_functor(x), fy = d3_functor(y), i, n = data.length, points = [], flippedPoints = [];
      for (i = 0; i < n; i++) {
        points.push([ +fx.call(this, data[i], i), +fy.call(this, data[i], i), i ]);
      }
      points.sort(d3_geom_hullOrder);
      for (i = 0; i < n; i++) flippedPoints.push([ points[i][0], -points[i][1] ]);
      var upper = d3_geom_hullUpper(points), lower = d3_geom_hullUpper(flippedPoints);
      var skipLeft = lower[0] === upper[0], skipRight = lower[lower.length - 1] === upper[upper.length - 1], polygon = [];
      for (i = upper.length - 1; i >= 0; --i) polygon.push(data[points[upper[i]][2]]);
      for (i = +skipLeft; i < lower.length - skipRight; ++i) polygon.push(data[points[lower[i]][2]]);
      return polygon;
    }
    hull.x = function(_) {
      return arguments.length ? (x = _, hull) : x;
    };
    hull.y = function(_) {
      return arguments.length ? (y = _, hull) : y;
    };
    return hull;
  };
  function d3_geom_hullUpper(points) {
    var n = points.length, hull = [ 0, 1 ], hs = 2;
    for (var i = 2; i < n; i++) {
      while (hs > 1 && d3_cross2d(points[hull[hs - 2]], points[hull[hs - 1]], points[i]) <= 0) --hs;
      hull[hs++] = i;
    }
    return hull.slice(0, hs);
  }
  function d3_geom_hullOrder(a, b) {
    return a[0] - b[0] || a[1] - b[1];
  }
  d3.geom.polygon = function(coordinates) {
    d3_subclass(coordinates, d3_geom_polygonPrototype);
    return coordinates;
  };
  var d3_geom_polygonPrototype = d3.geom.polygon.prototype = [];
  d3_geom_polygonPrototype.area = function() {
    var i = -1, n = this.length, a, b = this[n - 1], area = 0;
    while (++i < n) {
      a = b;
      b = this[i];
      area += a[1] * b[0] - a[0] * b[1];
    }
    return area * .5;
  };
  d3_geom_polygonPrototype.centroid = function(k) {
    var i = -1, n = this.length, x = 0, y = 0, a, b = this[n - 1], c;
    if (!arguments.length) k = -1 / (6 * this.area());
    while (++i < n) {
      a = b;
      b = this[i];
      c = a[0] * b[1] - b[0] * a[1];
      x += (a[0] + b[0]) * c;
      y += (a[1] + b[1]) * c;
    }
    return [ x * k, y * k ];
  };
  d3_geom_polygonPrototype.clip = function(subject) {
    var input, closed = d3_geom_polygonClosed(subject), i = -1, n = this.length - d3_geom_polygonClosed(this), j, m, a = this[n - 1], b, c, d;
    while (++i < n) {
      input = subject.slice();
      subject.length = 0;
      b = this[i];
      c = input[(m = input.length - closed) - 1];
      j = -1;
      while (++j < m) {
        d = input[j];
        if (d3_geom_polygonInside(d, a, b)) {
          if (!d3_geom_polygonInside(c, a, b)) {
            subject.push(d3_geom_polygonIntersect(c, d, a, b));
          }
          subject.push(d);
        } else if (d3_geom_polygonInside(c, a, b)) {
          subject.push(d3_geom_polygonIntersect(c, d, a, b));
        }
        c = d;
      }
      if (closed) subject.push(subject[0]);
      a = b;
    }
    return subject;
  };
  function d3_geom_polygonInside(p, a, b) {
    return (b[0] - a[0]) * (p[1] - a[1]) < (b[1] - a[1]) * (p[0] - a[0]);
  }
  function d3_geom_polygonIntersect(c, d, a, b) {
    var x1 = c[0], x3 = a[0], x21 = d[0] - x1, x43 = b[0] - x3, y1 = c[1], y3 = a[1], y21 = d[1] - y1, y43 = b[1] - y3, ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
    return [ x1 + ua * x21, y1 + ua * y21 ];
  }
  function d3_geom_polygonClosed(coordinates) {
    var a = coordinates[0], b = coordinates[coordinates.length - 1];
    return !(a[0] - b[0] || a[1] - b[1]);
  }
  var d3_geom_voronoiEdges, d3_geom_voronoiCells, d3_geom_voronoiBeaches, d3_geom_voronoiBeachPool = [], d3_geom_voronoiFirstCircle, d3_geom_voronoiCircles, d3_geom_voronoiCirclePool = [];
  function d3_geom_voronoiBeach() {
    d3_geom_voronoiRedBlackNode(this);
    this.edge = this.site = this.circle = null;
  }
  function d3_geom_voronoiCreateBeach(site) {
    var beach = d3_geom_voronoiBeachPool.pop() || new d3_geom_voronoiBeach();
    beach.site = site;
    return beach;
  }
  function d3_geom_voronoiDetachBeach(beach) {
    d3_geom_voronoiDetachCircle(beach);
    d3_geom_voronoiBeaches.remove(beach);
    d3_geom_voronoiBeachPool.push(beach);
    d3_geom_voronoiRedBlackNode(beach);
  }
  function d3_geom_voronoiRemoveBeach(beach) {
    var circle = beach.circle, x = circle.x, y = circle.cy, vertex = {
      x: x,
      y: y
    }, previous = beach.P, next = beach.N, disappearing = [ beach ];
    d3_geom_voronoiDetachBeach(beach);
    var lArc = previous;
    while (lArc.circle && abs(x - lArc.circle.x) < ε && abs(y - lArc.circle.cy) < ε) {
      previous = lArc.P;
      disappearing.unshift(lArc);
      d3_geom_voronoiDetachBeach(lArc);
      lArc = previous;
    }
    disappearing.unshift(lArc);
    d3_geom_voronoiDetachCircle(lArc);
    var rArc = next;
    while (rArc.circle && abs(x - rArc.circle.x) < ε && abs(y - rArc.circle.cy) < ε) {
      next = rArc.N;
      disappearing.push(rArc);
      d3_geom_voronoiDetachBeach(rArc);
      rArc = next;
    }
    disappearing.push(rArc);
    d3_geom_voronoiDetachCircle(rArc);
    var nArcs = disappearing.length, iArc;
    for (iArc = 1; iArc < nArcs; ++iArc) {
      rArc = disappearing[iArc];
      lArc = disappearing[iArc - 1];
      d3_geom_voronoiSetEdgeEnd(rArc.edge, lArc.site, rArc.site, vertex);
    }
    lArc = disappearing[0];
    rArc = disappearing[nArcs - 1];
    rArc.edge = d3_geom_voronoiCreateEdge(lArc.site, rArc.site, null, vertex);
    d3_geom_voronoiAttachCircle(lArc);
    d3_geom_voronoiAttachCircle(rArc);
  }
  function d3_geom_voronoiAddBeach(site) {
    var x = site.x, directrix = site.y, lArc, rArc, dxl, dxr, node = d3_geom_voronoiBeaches._;
    while (node) {
      dxl = d3_geom_voronoiLeftBreakPoint(node, directrix) - x;
      if (dxl > ε) node = node.L; else {
        dxr = x - d3_geom_voronoiRightBreakPoint(node, directrix);
        if (dxr > ε) {
          if (!node.R) {
            lArc = node;
            break;
          }
          node = node.R;
        } else {
          if (dxl > -ε) {
            lArc = node.P;
            rArc = node;
          } else if (dxr > -ε) {
            lArc = node;
            rArc = node.N;
          } else {
            lArc = rArc = node;
          }
          break;
        }
      }
    }
    var newArc = d3_geom_voronoiCreateBeach(site);
    d3_geom_voronoiBeaches.insert(lArc, newArc);
    if (!lArc && !rArc) return;
    if (lArc === rArc) {
      d3_geom_voronoiDetachCircle(lArc);
      rArc = d3_geom_voronoiCreateBeach(lArc.site);
      d3_geom_voronoiBeaches.insert(newArc, rArc);
      newArc.edge = rArc.edge = d3_geom_voronoiCreateEdge(lArc.site, newArc.site);
      d3_geom_voronoiAttachCircle(lArc);
      d3_geom_voronoiAttachCircle(rArc);
      return;
    }
    if (!rArc) {
      newArc.edge = d3_geom_voronoiCreateEdge(lArc.site, newArc.site);
      return;
    }
    d3_geom_voronoiDetachCircle(lArc);
    d3_geom_voronoiDetachCircle(rArc);
    var lSite = lArc.site, ax = lSite.x, ay = lSite.y, bx = site.x - ax, by = site.y - ay, rSite = rArc.site, cx = rSite.x - ax, cy = rSite.y - ay, d = 2 * (bx * cy - by * cx), hb = bx * bx + by * by, hc = cx * cx + cy * cy, vertex = {
      x: (cy * hb - by * hc) / d + ax,
      y: (bx * hc - cx * hb) / d + ay
    };
    d3_geom_voronoiSetEdgeEnd(rArc.edge, lSite, rSite, vertex);
    newArc.edge = d3_geom_voronoiCreateEdge(lSite, site, null, vertex);
    rArc.edge = d3_geom_voronoiCreateEdge(site, rSite, null, vertex);
    d3_geom_voronoiAttachCircle(lArc);
    d3_geom_voronoiAttachCircle(rArc);
  }
  function d3_geom_voronoiLeftBreakPoint(arc, directrix) {
    var site = arc.site, rfocx = site.x, rfocy = site.y, pby2 = rfocy - directrix;
    if (!pby2) return rfocx;
    var lArc = arc.P;
    if (!lArc) return -Infinity;
    site = lArc.site;
    var lfocx = site.x, lfocy = site.y, plby2 = lfocy - directrix;
    if (!plby2) return lfocx;
    var hl = lfocx - rfocx, aby2 = 1 / pby2 - 1 / plby2, b = hl / plby2;
    if (aby2) return (-b + Math.sqrt(b * b - 2 * aby2 * (hl * hl / (-2 * plby2) - lfocy + plby2 / 2 + rfocy - pby2 / 2))) / aby2 + rfocx;
    return (rfocx + lfocx) / 2;
  }
  function d3_geom_voronoiRightBreakPoint(arc, directrix) {
    var rArc = arc.N;
    if (rArc) return d3_geom_voronoiLeftBreakPoint(rArc, directrix);
    var site = arc.site;
    return site.y === directrix ? site.x : Infinity;
  }
  function d3_geom_voronoiCell(site) {
    this.site = site;
    this.edges = [];
  }
  d3_geom_voronoiCell.prototype.prepare = function() {
    var halfEdges = this.edges, iHalfEdge = halfEdges.length, edge;
    while (iHalfEdge--) {
      edge = halfEdges[iHalfEdge].edge;
      if (!edge.b || !edge.a) halfEdges.splice(iHalfEdge, 1);
    }
    halfEdges.sort(d3_geom_voronoiHalfEdgeOrder);
    return halfEdges.length;
  };
  function d3_geom_voronoiCloseCells(extent) {
    var x0 = extent[0][0], x1 = extent[1][0], y0 = extent[0][1], y1 = extent[1][1], x2, y2, x3, y3, cells = d3_geom_voronoiCells, iCell = cells.length, cell, iHalfEdge, halfEdges, nHalfEdges, start, end;
    while (iCell--) {
      cell = cells[iCell];
      if (!cell || !cell.prepare()) continue;
      halfEdges = cell.edges;
      nHalfEdges = halfEdges.length;
      iHalfEdge = 0;
      while (iHalfEdge < nHalfEdges) {
        end = halfEdges[iHalfEdge].end(), x3 = end.x, y3 = end.y;
        start = halfEdges[++iHalfEdge % nHalfEdges].start(), x2 = start.x, y2 = start.y;
        if (abs(x3 - x2) > ε || abs(y3 - y2) > ε) {
          halfEdges.splice(iHalfEdge, 0, new d3_geom_voronoiHalfEdge(d3_geom_voronoiCreateBorderEdge(cell.site, end, abs(x3 - x0) < ε && y1 - y3 > ε ? {
            x: x0,
            y: abs(x2 - x0) < ε ? y2 : y1
          } : abs(y3 - y1) < ε && x1 - x3 > ε ? {
            x: abs(y2 - y1) < ε ? x2 : x1,
            y: y1
          } : abs(x3 - x1) < ε && y3 - y0 > ε ? {
            x: x1,
            y: abs(x2 - x1) < ε ? y2 : y0
          } : abs(y3 - y0) < ε && x3 - x0 > ε ? {
            x: abs(y2 - y0) < ε ? x2 : x0,
            y: y0
          } : null), cell.site, null));
          ++nHalfEdges;
        }
      }
    }
  }
  function d3_geom_voronoiHalfEdgeOrder(a, b) {
    return b.angle - a.angle;
  }
  function d3_geom_voronoiCircle() {
    d3_geom_voronoiRedBlackNode(this);
    this.x = this.y = this.arc = this.site = this.cy = null;
  }
  function d3_geom_voronoiAttachCircle(arc) {
    var lArc = arc.P, rArc = arc.N;
    if (!lArc || !rArc) return;
    var lSite = lArc.site, cSite = arc.site, rSite = rArc.site;
    if (lSite === rSite) return;
    var bx = cSite.x, by = cSite.y, ax = lSite.x - bx, ay = lSite.y - by, cx = rSite.x - bx, cy = rSite.y - by;
    var d = 2 * (ax * cy - ay * cx);
    if (d >= -ε2) return;
    var ha = ax * ax + ay * ay, hc = cx * cx + cy * cy, x = (cy * ha - ay * hc) / d, y = (ax * hc - cx * ha) / d, cy = y + by;
    var circle = d3_geom_voronoiCirclePool.pop() || new d3_geom_voronoiCircle();
    circle.arc = arc;
    circle.site = cSite;
    circle.x = x + bx;
    circle.y = cy + Math.sqrt(x * x + y * y);
    circle.cy = cy;
    arc.circle = circle;
    var before = null, node = d3_geom_voronoiCircles._;
    while (node) {
      if (circle.y < node.y || circle.y === node.y && circle.x <= node.x) {
        if (node.L) node = node.L; else {
          before = node.P;
          break;
        }
      } else {
        if (node.R) node = node.R; else {
          before = node;
          break;
        }
      }
    }
    d3_geom_voronoiCircles.insert(before, circle);
    if (!before) d3_geom_voronoiFirstCircle = circle;
  }
  function d3_geom_voronoiDetachCircle(arc) {
    var circle = arc.circle;
    if (circle) {
      if (!circle.P) d3_geom_voronoiFirstCircle = circle.N;
      d3_geom_voronoiCircles.remove(circle);
      d3_geom_voronoiCirclePool.push(circle);
      d3_geom_voronoiRedBlackNode(circle);
      arc.circle = null;
    }
  }
  function d3_geom_voronoiClipEdges(extent) {
    var edges = d3_geom_voronoiEdges, clip = d3_geom_clipLine(extent[0][0], extent[0][1], extent[1][0], extent[1][1]), i = edges.length, e;
    while (i--) {
      e = edges[i];
      if (!d3_geom_voronoiConnectEdge(e, extent) || !clip(e) || abs(e.a.x - e.b.x) < ε && abs(e.a.y - e.b.y) < ε) {
        e.a = e.b = null;
        edges.splice(i, 1);
      }
    }
  }
  function d3_geom_voronoiConnectEdge(edge, extent) {
    var vb = edge.b;
    if (vb) return true;
    var va = edge.a, x0 = extent[0][0], x1 = extent[1][0], y0 = extent[0][1], y1 = extent[1][1], lSite = edge.l, rSite = edge.r, lx = lSite.x, ly = lSite.y, rx = rSite.x, ry = rSite.y, fx = (lx + rx) / 2, fy = (ly + ry) / 2, fm, fb;
    if (ry === ly) {
      if (fx < x0 || fx >= x1) return;
      if (lx > rx) {
        if (!va) va = {
          x: fx,
          y: y0
        }; else if (va.y >= y1) return;
        vb = {
          x: fx,
          y: y1
        };
      } else {
        if (!va) va = {
          x: fx,
          y: y1
        }; else if (va.y < y0) return;
        vb = {
          x: fx,
          y: y0
        };
      }
    } else {
      fm = (lx - rx) / (ry - ly);
      fb = fy - fm * fx;
      if (fm < -1 || fm > 1) {
        if (lx > rx) {
          if (!va) va = {
            x: (y0 - fb) / fm,
            y: y0
          }; else if (va.y >= y1) return;
          vb = {
            x: (y1 - fb) / fm,
            y: y1
          };
        } else {
          if (!va) va = {
            x: (y1 - fb) / fm,
            y: y1
          }; else if (va.y < y0) return;
          vb = {
            x: (y0 - fb) / fm,
            y: y0
          };
        }
      } else {
        if (ly < ry) {
          if (!va) va = {
            x: x0,
            y: fm * x0 + fb
          }; else if (va.x >= x1) return;
          vb = {
            x: x1,
            y: fm * x1 + fb
          };
        } else {
          if (!va) va = {
            x: x1,
            y: fm * x1 + fb
          }; else if (va.x < x0) return;
          vb = {
            x: x0,
            y: fm * x0 + fb
          };
        }
      }
    }
    edge.a = va;
    edge.b = vb;
    return true;
  }
  function d3_geom_voronoiEdge(lSite, rSite) {
    this.l = lSite;
    this.r = rSite;
    this.a = this.b = null;
  }
  function d3_geom_voronoiCreateEdge(lSite, rSite, va, vb) {
    var edge = new d3_geom_voronoiEdge(lSite, rSite);
    d3_geom_voronoiEdges.push(edge);
    if (va) d3_geom_voronoiSetEdgeEnd(edge, lSite, rSite, va);
    if (vb) d3_geom_voronoiSetEdgeEnd(edge, rSite, lSite, vb);
    d3_geom_voronoiCells[lSite.i].edges.push(new d3_geom_voronoiHalfEdge(edge, lSite, rSite));
    d3_geom_voronoiCells[rSite.i].edges.push(new d3_geom_voronoiHalfEdge(edge, rSite, lSite));
    return edge;
  }
  function d3_geom_voronoiCreateBorderEdge(lSite, va, vb) {
    var edge = new d3_geom_voronoiEdge(lSite, null);
    edge.a = va;
    edge.b = vb;
    d3_geom_voronoiEdges.push(edge);
    return edge;
  }
  function d3_geom_voronoiSetEdgeEnd(edge, lSite, rSite, vertex) {
    if (!edge.a && !edge.b) {
      edge.a = vertex;
      edge.l = lSite;
      edge.r = rSite;
    } else if (edge.l === rSite) {
      edge.b = vertex;
    } else {
      edge.a = vertex;
    }
  }
  function d3_geom_voronoiHalfEdge(edge, lSite, rSite) {
    var va = edge.a, vb = edge.b;
    this.edge = edge;
    this.site = lSite;
    this.angle = rSite ? Math.atan2(rSite.y - lSite.y, rSite.x - lSite.x) : edge.l === lSite ? Math.atan2(vb.x - va.x, va.y - vb.y) : Math.atan2(va.x - vb.x, vb.y - va.y);
  }
  d3_geom_voronoiHalfEdge.prototype = {
    start: function() {
      return this.edge.l === this.site ? this.edge.a : this.edge.b;
    },
    end: function() {
      return this.edge.l === this.site ? this.edge.b : this.edge.a;
    }
  };
  function d3_geom_voronoiRedBlackTree() {
    this._ = null;
  }
  function d3_geom_voronoiRedBlackNode(node) {
    node.U = node.C = node.L = node.R = node.P = node.N = null;
  }
  d3_geom_voronoiRedBlackTree.prototype = {
    insert: function(after, node) {
      var parent, grandpa, uncle;
      if (after) {
        node.P = after;
        node.N = after.N;
        if (after.N) after.N.P = node;
        after.N = node;
        if (after.R) {
          after = after.R;
          while (after.L) after = after.L;
          after.L = node;
        } else {
          after.R = node;
        }
        parent = after;
      } else if (this._) {
        after = d3_geom_voronoiRedBlackFirst(this._);
        node.P = null;
        node.N = after;
        after.P = after.L = node;
        parent = after;
      } else {
        node.P = node.N = null;
        this._ = node;
        parent = null;
      }
      node.L = node.R = null;
      node.U = parent;
      node.C = true;
      after = node;
      while (parent && parent.C) {
        grandpa = parent.U;
        if (parent === grandpa.L) {
          uncle = grandpa.R;
          if (uncle && uncle.C) {
            parent.C = uncle.C = false;
            grandpa.C = true;
            after = grandpa;
          } else {
            if (after === parent.R) {
              d3_geom_voronoiRedBlackRotateLeft(this, parent);
              after = parent;
              parent = after.U;
            }
            parent.C = false;
            grandpa.C = true;
            d3_geom_voronoiRedBlackRotateRight(this, grandpa);
          }
        } else {
          uncle = grandpa.L;
          if (uncle && uncle.C) {
            parent.C = uncle.C = false;
            grandpa.C = true;
            after = grandpa;
          } else {
            if (after === parent.L) {
              d3_geom_voronoiRedBlackRotateRight(this, parent);
              after = parent;
              parent = after.U;
            }
            parent.C = false;
            grandpa.C = true;
            d3_geom_voronoiRedBlackRotateLeft(this, grandpa);
          }
        }
        parent = after.U;
      }
      this._.C = false;
    },
    remove: function(node) {
      if (node.N) node.N.P = node.P;
      if (node.P) node.P.N = node.N;
      node.N = node.P = null;
      var parent = node.U, sibling, left = node.L, right = node.R, next, red;
      if (!left) next = right; else if (!right) next = left; else next = d3_geom_voronoiRedBlackFirst(right);
      if (parent) {
        if (parent.L === node) parent.L = next; else parent.R = next;
      } else {
        this._ = next;
      }
      if (left && right) {
        red = next.C;
        next.C = node.C;
        next.L = left;
        left.U = next;
        if (next !== right) {
          parent = next.U;
          next.U = node.U;
          node = next.R;
          parent.L = node;
          next.R = right;
          right.U = next;
        } else {
          next.U = parent;
          parent = next;
          node = next.R;
        }
      } else {
        red = node.C;
        node = next;
      }
      if (node) node.U = parent;
      if (red) return;
      if (node && node.C) {
        node.C = false;
        return;
      }
      do {
        if (node === this._) break;
        if (node === parent.L) {
          sibling = parent.R;
          if (sibling.C) {
            sibling.C = false;
            parent.C = true;
            d3_geom_voronoiRedBlackRotateLeft(this, parent);
            sibling = parent.R;
          }
          if (sibling.L && sibling.L.C || sibling.R && sibling.R.C) {
            if (!sibling.R || !sibling.R.C) {
              sibling.L.C = false;
              sibling.C = true;
              d3_geom_voronoiRedBlackRotateRight(this, sibling);
              sibling = parent.R;
            }
            sibling.C = parent.C;
            parent.C = sibling.R.C = false;
            d3_geom_voronoiRedBlackRotateLeft(this, parent);
            node = this._;
            break;
          }
        } else {
          sibling = parent.L;
          if (sibling.C) {
            sibling.C = false;
            parent.C = true;
            d3_geom_voronoiRedBlackRotateRight(this, parent);
            sibling = parent.L;
          }
          if (sibling.L && sibling.L.C || sibling.R && sibling.R.C) {
            if (!sibling.L || !sibling.L.C) {
              sibling.R.C = false;
              sibling.C = true;
              d3_geom_voronoiRedBlackRotateLeft(this, sibling);
              sibling = parent.L;
            }
            sibling.C = parent.C;
            parent.C = sibling.L.C = false;
            d3_geom_voronoiRedBlackRotateRight(this, parent);
            node = this._;
            break;
          }
        }
        sibling.C = true;
        node = parent;
        parent = parent.U;
      } while (!node.C);
      if (node) node.C = false;
    }
  };
  function d3_geom_voronoiRedBlackRotateLeft(tree, node) {
    var p = node, q = node.R, parent = p.U;
    if (parent) {
      if (parent.L === p) parent.L = q; else parent.R = q;
    } else {
      tree._ = q;
    }
    q.U = parent;
    p.U = q;
    p.R = q.L;
    if (p.R) p.R.U = p;
    q.L = p;
  }
  function d3_geom_voronoiRedBlackRotateRight(tree, node) {
    var p = node, q = node.L, parent = p.U;
    if (parent) {
      if (parent.L === p) parent.L = q; else parent.R = q;
    } else {
      tree._ = q;
    }
    q.U = parent;
    p.U = q;
    p.L = q.R;
    if (p.L) p.L.U = p;
    q.R = p;
  }
  function d3_geom_voronoiRedBlackFirst(node) {
    while (node.L) node = node.L;
    return node;
  }
  function d3_geom_voronoi(sites, bbox) {
    var site = sites.sort(d3_geom_voronoiVertexOrder).pop(), x0, y0, circle;
    d3_geom_voronoiEdges = [];
    d3_geom_voronoiCells = new Array(sites.length);
    d3_geom_voronoiBeaches = new d3_geom_voronoiRedBlackTree();
    d3_geom_voronoiCircles = new d3_geom_voronoiRedBlackTree();
    while (true) {
      circle = d3_geom_voronoiFirstCircle;
      if (site && (!circle || site.y < circle.y || site.y === circle.y && site.x < circle.x)) {
        if (site.x !== x0 || site.y !== y0) {
          d3_geom_voronoiCells[site.i] = new d3_geom_voronoiCell(site);
          d3_geom_voronoiAddBeach(site);
          x0 = site.x, y0 = site.y;
        }
        site = sites.pop();
      } else if (circle) {
        d3_geom_voronoiRemoveBeach(circle.arc);
      } else {
        break;
      }
    }
    if (bbox) d3_geom_voronoiClipEdges(bbox), d3_geom_voronoiCloseCells(bbox);
    var diagram = {
      cells: d3_geom_voronoiCells,
      edges: d3_geom_voronoiEdges
    };
    d3_geom_voronoiBeaches = d3_geom_voronoiCircles = d3_geom_voronoiEdges = d3_geom_voronoiCells = null;
    return diagram;
  }
  function d3_geom_voronoiVertexOrder(a, b) {
    return b.y - a.y || b.x - a.x;
  }
  d3.geom.voronoi = function(points) {
    var x = d3_geom_pointX, y = d3_geom_pointY, fx = x, fy = y, clipExtent = d3_geom_voronoiClipExtent;
    if (points) return voronoi(points);
    function voronoi(data) {
      var polygons = new Array(data.length), x0 = clipExtent[0][0], y0 = clipExtent[0][1], x1 = clipExtent[1][0], y1 = clipExtent[1][1];
      d3_geom_voronoi(sites(data), clipExtent).cells.forEach(function(cell, i) {
        var edges = cell.edges, site = cell.site, polygon = polygons[i] = edges.length ? edges.map(function(e) {
          var s = e.start();
          return [ s.x, s.y ];
        }) : site.x >= x0 && site.x <= x1 && site.y >= y0 && site.y <= y1 ? [ [ x0, y1 ], [ x1, y1 ], [ x1, y0 ], [ x0, y0 ] ] : [];
        polygon.point = data[i];
      });
      return polygons;
    }
    function sites(data) {
      return data.map(function(d, i) {
        return {
          x: Math.round(fx(d, i) / ε) * ε,
          y: Math.round(fy(d, i) / ε) * ε,
          i: i
        };
      });
    }
    voronoi.links = function(data) {
      return d3_geom_voronoi(sites(data)).edges.filter(function(edge) {
        return edge.l && edge.r;
      }).map(function(edge) {
        return {
          source: data[edge.l.i],
          target: data[edge.r.i]
        };
      });
    };
    voronoi.triangles = function(data) {
      var triangles = [];
      d3_geom_voronoi(sites(data)).cells.forEach(function(cell, i) {
        var site = cell.site, edges = cell.edges.sort(d3_geom_voronoiHalfEdgeOrder), j = -1, m = edges.length, e0, s0, e1 = edges[m - 1].edge, s1 = e1.l === site ? e1.r : e1.l;
        while (++j < m) {
          e0 = e1;
          s0 = s1;
          e1 = edges[j].edge;
          s1 = e1.l === site ? e1.r : e1.l;
          if (i < s0.i && i < s1.i && d3_geom_voronoiTriangleArea(site, s0, s1) < 0) {
            triangles.push([ data[i], data[s0.i], data[s1.i] ]);
          }
        }
      });
      return triangles;
    };
    voronoi.x = function(_) {
      return arguments.length ? (fx = d3_functor(x = _), voronoi) : x;
    };
    voronoi.y = function(_) {
      return arguments.length ? (fy = d3_functor(y = _), voronoi) : y;
    };
    voronoi.clipExtent = function(_) {
      if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent;
      clipExtent = _ == null ? d3_geom_voronoiClipExtent : _;
      return voronoi;
    };
    voronoi.size = function(_) {
      if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent && clipExtent[1];
      return voronoi.clipExtent(_ && [ [ 0, 0 ], _ ]);
    };
    return voronoi;
  };
  var d3_geom_voronoiClipExtent = [ [ -1e6, -1e6 ], [ 1e6, 1e6 ] ];
  function d3_geom_voronoiTriangleArea(a, b, c) {
    return (a.x - c.x) * (b.y - a.y) - (a.x - b.x) * (c.y - a.y);
  }
  d3.geom.delaunay = function(vertices) {
    return d3.geom.voronoi().triangles(vertices);
  };
  d3.geom.quadtree = function(points, x1, y1, x2, y2) {
    var x = d3_geom_pointX, y = d3_geom_pointY, compat;
    if (compat = arguments.length) {
      x = d3_geom_quadtreeCompatX;
      y = d3_geom_quadtreeCompatY;
      if (compat === 3) {
        y2 = y1;
        x2 = x1;
        y1 = x1 = 0;
      }
      return quadtree(points);
    }
    function quadtree(data) {
      var d, fx = d3_functor(x), fy = d3_functor(y), xs, ys, i, n, x1_, y1_, x2_, y2_;
      if (x1 != null) {
        x1_ = x1, y1_ = y1, x2_ = x2, y2_ = y2;
      } else {
        x2_ = y2_ = -(x1_ = y1_ = Infinity);
        xs = [], ys = [];
        n = data.length;
        if (compat) for (i = 0; i < n; ++i) {
          d = data[i];
          if (d.x < x1_) x1_ = d.x;
          if (d.y < y1_) y1_ = d.y;
          if (d.x > x2_) x2_ = d.x;
          if (d.y > y2_) y2_ = d.y;
          xs.push(d.x);
          ys.push(d.y);
        } else for (i = 0; i < n; ++i) {
          var x_ = +fx(d = data[i], i), y_ = +fy(d, i);
          if (x_ < x1_) x1_ = x_;
          if (y_ < y1_) y1_ = y_;
          if (x_ > x2_) x2_ = x_;
          if (y_ > y2_) y2_ = y_;
          xs.push(x_);
          ys.push(y_);
        }
      }
      var dx = x2_ - x1_, dy = y2_ - y1_;
      if (dx > dy) y2_ = y1_ + dx; else x2_ = x1_ + dy;
      function insert(n, d, x, y, x1, y1, x2, y2) {
        if (isNaN(x) || isNaN(y)) return;
        if (n.leaf) {
          var nx = n.x, ny = n.y;
          if (nx != null) {
            if (abs(nx - x) + abs(ny - y) < .01) {
              insertChild(n, d, x, y, x1, y1, x2, y2);
            } else {
              var nPoint = n.point;
              n.x = n.y = n.point = null;
              insertChild(n, nPoint, nx, ny, x1, y1, x2, y2);
              insertChild(n, d, x, y, x1, y1, x2, y2);
            }
          } else {
            n.x = x, n.y = y, n.point = d;
          }
        } else {
          insertChild(n, d, x, y, x1, y1, x2, y2);
        }
      }
      function insertChild(n, d, x, y, x1, y1, x2, y2) {
        var sx = (x1 + x2) * .5, sy = (y1 + y2) * .5, right = x >= sx, bottom = y >= sy, i = (bottom << 1) + right;
        n.leaf = false;
        n = n.nodes[i] || (n.nodes[i] = d3_geom_quadtreeNode());
        if (right) x1 = sx; else x2 = sx;
        if (bottom) y1 = sy; else y2 = sy;
        insert(n, d, x, y, x1, y1, x2, y2);
      }
      var root = d3_geom_quadtreeNode();
      root.add = function(d) {
        insert(root, d, +fx(d, ++i), +fy(d, i), x1_, y1_, x2_, y2_);
      };
      root.visit = function(f) {
        d3_geom_quadtreeVisit(f, root, x1_, y1_, x2_, y2_);
      };
      i = -1;
      if (x1 == null) {
        while (++i < n) {
          insert(root, data[i], xs[i], ys[i], x1_, y1_, x2_, y2_);
        }
        --i;
      } else data.forEach(root.add);
      xs = ys = data = d = null;
      return root;
    }
    quadtree.x = function(_) {
      return arguments.length ? (x = _, quadtree) : x;
    };
    quadtree.y = function(_) {
      return arguments.length ? (y = _, quadtree) : y;
    };
    quadtree.extent = function(_) {
      if (!arguments.length) return x1 == null ? null : [ [ x1, y1 ], [ x2, y2 ] ];
      if (_ == null) x1 = y1 = x2 = y2 = null; else x1 = +_[0][0], y1 = +_[0][1], x2 = +_[1][0], 
      y2 = +_[1][1];
      return quadtree;
    };
    quadtree.size = function(_) {
      if (!arguments.length) return x1 == null ? null : [ x2 - x1, y2 - y1 ];
      if (_ == null) x1 = y1 = x2 = y2 = null; else x1 = y1 = 0, x2 = +_[0], y2 = +_[1];
      return quadtree;
    };
    return quadtree;
  };
  function d3_geom_quadtreeCompatX(d) {
    return d.x;
  }
  function d3_geom_quadtreeCompatY(d) {
    return d.y;
  }
  function d3_geom_quadtreeNode() {
    return {
      leaf: true,
      nodes: [],
      point: null,
      x: null,
      y: null
    };
  }
  function d3_geom_quadtreeVisit(f, node, x1, y1, x2, y2) {
    if (!f(node, x1, y1, x2, y2)) {
      var sx = (x1 + x2) * .5, sy = (y1 + y2) * .5, children = node.nodes;
      if (children[0]) d3_geom_quadtreeVisit(f, children[0], x1, y1, sx, sy);
      if (children[1]) d3_geom_quadtreeVisit(f, children[1], sx, y1, x2, sy);
      if (children[2]) d3_geom_quadtreeVisit(f, children[2], x1, sy, sx, y2);
      if (children[3]) d3_geom_quadtreeVisit(f, children[3], sx, sy, x2, y2);
    }
  }
  d3.interpolateRgb = d3_interpolateRgb;
  function d3_interpolateRgb(a, b) {
    a = d3.rgb(a);
    b = d3.rgb(b);
    var ar = a.r, ag = a.g, ab = a.b, br = b.r - ar, bg = b.g - ag, bb = b.b - ab;
    return function(t) {
      return "#" + d3_rgb_hex(Math.round(ar + br * t)) + d3_rgb_hex(Math.round(ag + bg * t)) + d3_rgb_hex(Math.round(ab + bb * t));
    };
  }
  d3.interpolateObject = d3_interpolateObject;
  function d3_interpolateObject(a, b) {
    var i = {}, c = {}, k;
    for (k in a) {
      if (k in b) {
        i[k] = d3_interpolate(a[k], b[k]);
      } else {
        c[k] = a[k];
      }
    }
    for (k in b) {
      if (!(k in a)) {
        c[k] = b[k];
      }
    }
    return function(t) {
      for (k in i) c[k] = i[k](t);
      return c;
    };
  }
  d3.interpolateNumber = d3_interpolateNumber;
  function d3_interpolateNumber(a, b) {
    b -= a = +a;
    return function(t) {
      return a + b * t;
    };
  }
  d3.interpolateString = d3_interpolateString;
  function d3_interpolateString(a, b) {
    var m, i, j, s0 = 0, s1 = 0, s = [], q = [], n, o;
    a = a + "", b = b + "";
    d3_interpolate_number.lastIndex = 0;
    for (i = 0; m = d3_interpolate_number.exec(b); ++i) {
      if (m.index) s.push(b.substring(s0, s1 = m.index));
      q.push({
        i: s.length,
        x: m[0]
      });
      s.push(null);
      s0 = d3_interpolate_number.lastIndex;
    }
    if (s0 < b.length) s.push(b.substring(s0));
    for (i = 0, n = q.length; (m = d3_interpolate_number.exec(a)) && i < n; ++i) {
      o = q[i];
      if (o.x == m[0]) {
        if (o.i) {
          if (s[o.i + 1] == null) {
            s[o.i - 1] += o.x;
            s.splice(o.i, 1);
            for (j = i + 1; j < n; ++j) q[j].i--;
          } else {
            s[o.i - 1] += o.x + s[o.i + 1];
            s.splice(o.i, 2);
            for (j = i + 1; j < n; ++j) q[j].i -= 2;
          }
        } else {
          if (s[o.i + 1] == null) {
            s[o.i] = o.x;
          } else {
            s[o.i] = o.x + s[o.i + 1];
            s.splice(o.i + 1, 1);
            for (j = i + 1; j < n; ++j) q[j].i--;
          }
        }
        q.splice(i, 1);
        n--;
        i--;
      } else {
        o.x = d3_interpolateNumber(parseFloat(m[0]), parseFloat(o.x));
      }
    }
    while (i < n) {
      o = q.pop();
      if (s[o.i + 1] == null) {
        s[o.i] = o.x;
      } else {
        s[o.i] = o.x + s[o.i + 1];
        s.splice(o.i + 1, 1);
      }
      n--;
    }
    if (s.length === 1) {
      return s[0] == null ? (o = q[0].x, function(t) {
        return o(t) + "";
      }) : function() {
        return b;
      };
    }
    return function(t) {
      for (i = 0; i < n; ++i) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  }
  var d3_interpolate_number = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
  d3.interpolate = d3_interpolate;
  function d3_interpolate(a, b) {
    var i = d3.interpolators.length, f;
    while (--i >= 0 && !(f = d3.interpolators[i](a, b))) ;
    return f;
  }
  d3.interpolators = [ function(a, b) {
    var t = typeof b;
    return (t === "string" ? d3_rgb_names.has(b) || /^(#|rgb\(|hsl\()/.test(b) ? d3_interpolateRgb : d3_interpolateString : b instanceof d3_Color ? d3_interpolateRgb : t === "object" ? Array.isArray(b) ? d3_interpolateArray : d3_interpolateObject : d3_interpolateNumber)(a, b);
  } ];
  d3.interpolateArray = d3_interpolateArray;
  function d3_interpolateArray(a, b) {
    var x = [], c = [], na = a.length, nb = b.length, n0 = Math.min(a.length, b.length), i;
    for (i = 0; i < n0; ++i) x.push(d3_interpolate(a[i], b[i]));
    for (;i < na; ++i) c[i] = a[i];
    for (;i < nb; ++i) c[i] = b[i];
    return function(t) {
      for (i = 0; i < n0; ++i) c[i] = x[i](t);
      return c;
    };
  }
  var d3_ease_default = function() {
    return d3_identity;
  };
  var d3_ease = d3.map({
    linear: d3_ease_default,
    poly: d3_ease_poly,
    quad: function() {
      return d3_ease_quad;
    },
    cubic: function() {
      return d3_ease_cubic;
    },
    sin: function() {
      return d3_ease_sin;
    },
    exp: function() {
      return d3_ease_exp;
    },
    circle: function() {
      return d3_ease_circle;
    },
    elastic: d3_ease_elastic,
    back: d3_ease_back,
    bounce: function() {
      return d3_ease_bounce;
    }
  });
  var d3_ease_mode = d3.map({
    "in": d3_identity,
    out: d3_ease_reverse,
    "in-out": d3_ease_reflect,
    "out-in": function(f) {
      return d3_ease_reflect(d3_ease_reverse(f));
    }
  });
  d3.ease = function(name) {
    var i = name.indexOf("-"), t = i >= 0 ? name.substring(0, i) : name, m = i >= 0 ? name.substring(i + 1) : "in";
    t = d3_ease.get(t) || d3_ease_default;
    m = d3_ease_mode.get(m) || d3_identity;
    return d3_ease_clamp(m(t.apply(null, d3_arraySlice.call(arguments, 1))));
  };
  function d3_ease_clamp(f) {
    return function(t) {
      return t <= 0 ? 0 : t >= 1 ? 1 : f(t);
    };
  }
  function d3_ease_reverse(f) {
    return function(t) {
      return 1 - f(1 - t);
    };
  }
  function d3_ease_reflect(f) {
    return function(t) {
      return .5 * (t < .5 ? f(2 * t) : 2 - f(2 - 2 * t));
    };
  }
  function d3_ease_quad(t) {
    return t * t;
  }
  function d3_ease_cubic(t) {
    return t * t * t;
  }
  function d3_ease_cubicInOut(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    var t2 = t * t, t3 = t2 * t;
    return 4 * (t < .5 ? t3 : 3 * (t - t2) + t3 - .75);
  }
  function d3_ease_poly(e) {
    return function(t) {
      return Math.pow(t, e);
    };
  }
  function d3_ease_sin(t) {
    return 1 - Math.cos(t * halfπ);
  }
  function d3_ease_exp(t) {
    return Math.pow(2, 10 * (t - 1));
  }
  function d3_ease_circle(t) {
    return 1 - Math.sqrt(1 - t * t);
  }
  function d3_ease_elastic(a, p) {
    var s;
    if (arguments.length < 2) p = .45;
    if (arguments.length) s = p / τ * Math.asin(1 / a); else a = 1, s = p / 4;
    return function(t) {
      return 1 + a * Math.pow(2, -10 * t) * Math.sin((t - s) * τ / p);
    };
  }
  function d3_ease_back(s) {
    if (!s) s = 1.70158;
    return function(t) {
      return t * t * ((s + 1) * t - s);
    };
  }
  function d3_ease_bounce(t) {
    return t < 1 / 2.75 ? 7.5625 * t * t : t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + .75 : t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + .9375 : 7.5625 * (t -= 2.625 / 2.75) * t + .984375;
  }
  d3.interpolateHcl = d3_interpolateHcl;
  function d3_interpolateHcl(a, b) {
    a = d3.hcl(a);
    b = d3.hcl(b);
    var ah = a.h, ac = a.c, al = a.l, bh = b.h - ah, bc = b.c - ac, bl = b.l - al;
    if (isNaN(bc)) bc = 0, ac = isNaN(ac) ? b.c : ac;
    if (isNaN(bh)) bh = 0, ah = isNaN(ah) ? b.h : ah; else if (bh > 180) bh -= 360; else if (bh < -180) bh += 360;
    return function(t) {
      return d3_hcl_lab(ah + bh * t, ac + bc * t, al + bl * t) + "";
    };
  }
  d3.interpolateHsl = d3_interpolateHsl;
  function d3_interpolateHsl(a, b) {
    a = d3.hsl(a);
    b = d3.hsl(b);
    var ah = a.h, as = a.s, al = a.l, bh = b.h - ah, bs = b.s - as, bl = b.l - al;
    if (isNaN(bs)) bs = 0, as = isNaN(as) ? b.s : as;
    if (isNaN(bh)) bh = 0, ah = isNaN(ah) ? b.h : ah; else if (bh > 180) bh -= 360; else if (bh < -180) bh += 360;
    return function(t) {
      return d3_hsl_rgb(ah + bh * t, as + bs * t, al + bl * t) + "";
    };
  }
  d3.interpolateLab = d3_interpolateLab;
  function d3_interpolateLab(a, b) {
    a = d3.lab(a);
    b = d3.lab(b);
    var al = a.l, aa = a.a, ab = a.b, bl = b.l - al, ba = b.a - aa, bb = b.b - ab;
    return function(t) {
      return d3_lab_rgb(al + bl * t, aa + ba * t, ab + bb * t) + "";
    };
  }
  d3.interpolateRound = d3_interpolateRound;
  function d3_interpolateRound(a, b) {
    b -= a;
    return function(t) {
      return Math.round(a + b * t);
    };
  }
  d3.transform = function(string) {
    var g = d3_document.createElementNS(d3.ns.prefix.svg, "g");
    return (d3.transform = function(string) {
      if (string != null) {
        g.setAttribute("transform", string);
        var t = g.transform.baseVal.consolidate();
      }
      return new d3_transform(t ? t.matrix : d3_transformIdentity);
    })(string);
  };
  function d3_transform(m) {
    var r0 = [ m.a, m.b ], r1 = [ m.c, m.d ], kx = d3_transformNormalize(r0), kz = d3_transformDot(r0, r1), ky = d3_transformNormalize(d3_transformCombine(r1, r0, -kz)) || 0;
    if (r0[0] * r1[1] < r1[0] * r0[1]) {
      r0[0] *= -1;
      r0[1] *= -1;
      kx *= -1;
      kz *= -1;
    }
    this.rotate = (kx ? Math.atan2(r0[1], r0[0]) : Math.atan2(-r1[0], r1[1])) * d3_degrees;
    this.translate = [ m.e, m.f ];
    this.scale = [ kx, ky ];
    this.skew = ky ? Math.atan2(kz, ky) * d3_degrees : 0;
  }
  d3_transform.prototype.toString = function() {
    return "translate(" + this.translate + ")rotate(" + this.rotate + ")skewX(" + this.skew + ")scale(" + this.scale + ")";
  };
  function d3_transformDot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
  }
  function d3_transformNormalize(a) {
    var k = Math.sqrt(d3_transformDot(a, a));
    if (k) {
      a[0] /= k;
      a[1] /= k;
    }
    return k;
  }
  function d3_transformCombine(a, b, k) {
    a[0] += k * b[0];
    a[1] += k * b[1];
    return a;
  }
  var d3_transformIdentity = {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0
  };
  d3.interpolateTransform = d3_interpolateTransform;
  function d3_interpolateTransform(a, b) {
    var s = [], q = [], n, A = d3.transform(a), B = d3.transform(b), ta = A.translate, tb = B.translate, ra = A.rotate, rb = B.rotate, wa = A.skew, wb = B.skew, ka = A.scale, kb = B.scale;
    if (ta[0] != tb[0] || ta[1] != tb[1]) {
      s.push("translate(", null, ",", null, ")");
      q.push({
        i: 1,
        x: d3_interpolateNumber(ta[0], tb[0])
      }, {
        i: 3,
        x: d3_interpolateNumber(ta[1], tb[1])
      });
    } else if (tb[0] || tb[1]) {
      s.push("translate(" + tb + ")");
    } else {
      s.push("");
    }
    if (ra != rb) {
      if (ra - rb > 180) rb += 360; else if (rb - ra > 180) ra += 360;
      q.push({
        i: s.push(s.pop() + "rotate(", null, ")") - 2,
        x: d3_interpolateNumber(ra, rb)
      });
    } else if (rb) {
      s.push(s.pop() + "rotate(" + rb + ")");
    }
    if (wa != wb) {
      q.push({
        i: s.push(s.pop() + "skewX(", null, ")") - 2,
        x: d3_interpolateNumber(wa, wb)
      });
    } else if (wb) {
      s.push(s.pop() + "skewX(" + wb + ")");
    }
    if (ka[0] != kb[0] || ka[1] != kb[1]) {
      n = s.push(s.pop() + "scale(", null, ",", null, ")");
      q.push({
        i: n - 4,
        x: d3_interpolateNumber(ka[0], kb[0])
      }, {
        i: n - 2,
        x: d3_interpolateNumber(ka[1], kb[1])
      });
    } else if (kb[0] != 1 || kb[1] != 1) {
      s.push(s.pop() + "scale(" + kb + ")");
    }
    n = q.length;
    return function(t) {
      var i = -1, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  }
  function d3_uninterpolateNumber(a, b) {
    b = b - (a = +a) ? 1 / (b - a) : 0;
    return function(x) {
      return (x - a) * b;
    };
  }
  function d3_uninterpolateClamp(a, b) {
    b = b - (a = +a) ? 1 / (b - a) : 0;
    return function(x) {
      return Math.max(0, Math.min(1, (x - a) * b));
    };
  }
  d3.layout = {};
  d3.layout.bundle = function() {
    return function(links) {
      var paths = [], i = -1, n = links.length;
      while (++i < n) paths.push(d3_layout_bundlePath(links[i]));
      return paths;
    };
  };
  function d3_layout_bundlePath(link) {
    var start = link.source, end = link.target, lca = d3_layout_bundleLeastCommonAncestor(start, end), points = [ start ];
    while (start !== lca) {
      start = start.parent;
      points.push(start);
    }
    var k = points.length;
    while (end !== lca) {
      points.splice(k, 0, end);
      end = end.parent;
    }
    return points;
  }
  function d3_layout_bundleAncestors(node) {
    var ancestors = [], parent = node.parent;
    while (parent != null) {
      ancestors.push(node);
      node = parent;
      parent = parent.parent;
    }
    ancestors.push(node);
    return ancestors;
  }
  function d3_layout_bundleLeastCommonAncestor(a, b) {
    if (a === b) return a;
    var aNodes = d3_layout_bundleAncestors(a), bNodes = d3_layout_bundleAncestors(b), aNode = aNodes.pop(), bNode = bNodes.pop(), sharedNode = null;
    while (aNode === bNode) {
      sharedNode = aNode;
      aNode = aNodes.pop();
      bNode = bNodes.pop();
    }
    return sharedNode;
  }
  d3.layout.chord = function() {
    var chord = {}, chords, groups, matrix, n, padding = 0, sortGroups, sortSubgroups, sortChords;
    function relayout() {
      var subgroups = {}, groupSums = [], groupIndex = d3.range(n), subgroupIndex = [], k, x, x0, i, j;
      chords = [];
      groups = [];
      k = 0, i = -1;
      while (++i < n) {
        x = 0, j = -1;
        while (++j < n) {
          x += matrix[i][j];
        }
        groupSums.push(x);
        subgroupIndex.push(d3.range(n));
        k += x;
      }
      if (sortGroups) {
        groupIndex.sort(function(a, b) {
          return sortGroups(groupSums[a], groupSums[b]);
        });
      }
      if (sortSubgroups) {
        subgroupIndex.forEach(function(d, i) {
          d.sort(function(a, b) {
            return sortSubgroups(matrix[i][a], matrix[i][b]);
          });
        });
      }
      k = (τ - padding * n) / k;
      x = 0, i = -1;
      while (++i < n) {
        x0 = x, j = -1;
        while (++j < n) {
          var di = groupIndex[i], dj = subgroupIndex[di][j], v = matrix[di][dj], a0 = x, a1 = x += v * k;
          subgroups[di + "-" + dj] = {
            index: di,
            subindex: dj,
            startAngle: a0,
            endAngle: a1,
            value: v
          };
        }
        groups[di] = {
          index: di,
          startAngle: x0,
          endAngle: x,
          value: (x - x0) / k
        };
        x += padding;
      }
      i = -1;
      while (++i < n) {
        j = i - 1;
        while (++j < n) {
          var source = subgroups[i + "-" + j], target = subgroups[j + "-" + i];
          if (source.value || target.value) {
            chords.push(source.value < target.value ? {
              source: target,
              target: source
            } : {
              source: source,
              target: target
            });
          }
        }
      }
      if (sortChords) resort();
    }
    function resort() {
      chords.sort(function(a, b) {
        return sortChords((a.source.value + a.target.value) / 2, (b.source.value + b.target.value) / 2);
      });
    }
    chord.matrix = function(x) {
      if (!arguments.length) return matrix;
      n = (matrix = x) && matrix.length;
      chords = groups = null;
      return chord;
    };
    chord.padding = function(x) {
      if (!arguments.length) return padding;
      padding = x;
      chords = groups = null;
      return chord;
    };
    chord.sortGroups = function(x) {
      if (!arguments.length) return sortGroups;
      sortGroups = x;
      chords = groups = null;
      return chord;
    };
    chord.sortSubgroups = function(x) {
      if (!arguments.length) return sortSubgroups;
      sortSubgroups = x;
      chords = null;
      return chord;
    };
    chord.sortChords = function(x) {
      if (!arguments.length) return sortChords;
      sortChords = x;
      if (chords) resort();
      return chord;
    };
    chord.chords = function() {
      if (!chords) relayout();
      return chords;
    };
    chord.groups = function() {
      if (!groups) relayout();
      return groups;
    };
    return chord;
  };
  d3.layout.force = function() {
    var force = {}, event = d3.dispatch("start", "tick", "end"), size = [ 1, 1 ], drag, alpha, friction = .9, linkDistance = d3_layout_forceLinkDistance, linkStrength = d3_layout_forceLinkStrength, charge = -30, chargeDistance2 = d3_layout_forceChargeDistance2, gravity = .1, theta2 = .64, nodes = [], links = [], distances, strengths, charges;
    function repulse(node) {
      return function(quad, x1, _, x2) {
        if (quad.point !== node) {
          var dx = quad.cx - node.x, dy = quad.cy - node.y, dw = x2 - x1, dn = dx * dx + dy * dy;
          if (dw * dw / theta2 < dn) {
            if (dn < chargeDistance2) {
              var k = quad.charge / dn;
              node.px -= dx * k;
              node.py -= dy * k;
            }
            return true;
          }
          if (quad.point && dn && dn < chargeDistance2) {
            var k = quad.pointCharge / dn;
            node.px -= dx * k;
            node.py -= dy * k;
          }
        }
        return !quad.charge;
      };
    }
    force.tick = function() {
      if ((alpha *= .99) < .005) {
        event.end({
          type: "end",
          alpha: alpha = 0
        });
        return true;
      }
      var n = nodes.length, m = links.length, q, i, o, s, t, l, k, x, y;
      for (i = 0; i < m; ++i) {
        o = links[i];
        s = o.source;
        t = o.target;
        x = t.x - s.x;
        y = t.y - s.y;
        if (l = x * x + y * y) {
          l = alpha * strengths[i] * ((l = Math.sqrt(l)) - distances[i]) / l;
          x *= l;
          y *= l;
          t.x -= x * (k = s.weight / (t.weight + s.weight));
          t.y -= y * k;
          s.x += x * (k = 1 - k);
          s.y += y * k;
        }
      }
      if (k = alpha * gravity) {
        x = size[0] / 2;
        y = size[1] / 2;
        i = -1;
        if (k) while (++i < n) {
          o = nodes[i];
          o.x += (x - o.x) * k;
          o.y += (y - o.y) * k;
        }
      }
      if (charge) {
        d3_layout_forceAccumulate(q = d3.geom.quadtree(nodes), alpha, charges);
        i = -1;
        while (++i < n) {
          if (!(o = nodes[i]).fixed) {
            q.visit(repulse(o));
          }
        }
      }
      i = -1;
      while (++i < n) {
        o = nodes[i];
        if (o.fixed) {
          o.x = o.px;
          o.y = o.py;
        } else {
          o.x -= (o.px - (o.px = o.x)) * friction;
          o.y -= (o.py - (o.py = o.y)) * friction;
        }
      }
      event.tick({
        type: "tick",
        alpha: alpha
      });
    };
    force.nodes = function(x) {
      if (!arguments.length) return nodes;
      nodes = x;
      return force;
    };
    force.links = function(x) {
      if (!arguments.length) return links;
      links = x;
      return force;
    };
    force.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return force;
    };
    force.linkDistance = function(x) {
      if (!arguments.length) return linkDistance;
      linkDistance = typeof x === "function" ? x : +x;
      return force;
    };
    force.distance = force.linkDistance;
    force.linkStrength = function(x) {
      if (!arguments.length) return linkStrength;
      linkStrength = typeof x === "function" ? x : +x;
      return force;
    };
    force.friction = function(x) {
      if (!arguments.length) return friction;
      friction = +x;
      return force;
    };
    force.charge = function(x) {
      if (!arguments.length) return charge;
      charge = typeof x === "function" ? x : +x;
      return force;
    };
    force.chargeDistance = function(x) {
      if (!arguments.length) return Math.sqrt(chargeDistance2);
      chargeDistance2 = x * x;
      return force;
    };
    force.gravity = function(x) {
      if (!arguments.length) return gravity;
      gravity = +x;
      return force;
    };
    force.theta = function(x) {
      if (!arguments.length) return Math.sqrt(theta2);
      theta2 = x * x;
      return force;
    };
    force.alpha = function(x) {
      if (!arguments.length) return alpha;
      x = +x;
      if (alpha) {
        if (x > 0) alpha = x; else alpha = 0;
      } else if (x > 0) {
        event.start({
          type: "start",
          alpha: alpha = x
        });
        d3.timer(force.tick);
      }
      return force;
    };
    force.start = function() {
      var i, n = nodes.length, m = links.length, w = size[0], h = size[1], neighbors, o;
      for (i = 0; i < n; ++i) {
        (o = nodes[i]).index = i;
        o.weight = 0;
      }
      for (i = 0; i < m; ++i) {
        o = links[i];
        if (typeof o.source == "number") o.source = nodes[o.source];
        if (typeof o.target == "number") o.target = nodes[o.target];
        ++o.source.weight;
        ++o.target.weight;
      }
      for (i = 0; i < n; ++i) {
        o = nodes[i];
        if (isNaN(o.x)) o.x = position("x", w);
        if (isNaN(o.y)) o.y = position("y", h);
        if (isNaN(o.px)) o.px = o.x;
        if (isNaN(o.py)) o.py = o.y;
      }
      distances = [];
      if (typeof linkDistance === "function") for (i = 0; i < m; ++i) distances[i] = +linkDistance.call(this, links[i], i); else for (i = 0; i < m; ++i) distances[i] = linkDistance;
      strengths = [];
      if (typeof linkStrength === "function") for (i = 0; i < m; ++i) strengths[i] = +linkStrength.call(this, links[i], i); else for (i = 0; i < m; ++i) strengths[i] = linkStrength;
      charges = [];
      if (typeof charge === "function") for (i = 0; i < n; ++i) charges[i] = +charge.call(this, nodes[i], i); else for (i = 0; i < n; ++i) charges[i] = charge;
      function position(dimension, size) {
        if (!neighbors) {
          neighbors = new Array(n);
          for (j = 0; j < n; ++j) {
            neighbors[j] = [];
          }
          for (j = 0; j < m; ++j) {
            var o = links[j];
            neighbors[o.source.index].push(o.target);
            neighbors[o.target.index].push(o.source);
          }
        }
        var candidates = neighbors[i], j = -1, m = candidates.length, x;
        while (++j < m) if (!isNaN(x = candidates[j][dimension])) return x;
        return Math.random() * size;
      }
      return force.resume();
    };
    force.resume = function() {
      return force.alpha(.1);
    };
    force.stop = function() {
      return force.alpha(0);
    };
    force.drag = function() {
      if (!drag) drag = d3.behavior.drag().origin(d3_identity).on("dragstart.force", d3_layout_forceDragstart).on("drag.force", dragmove).on("dragend.force", d3_layout_forceDragend);
      if (!arguments.length) return drag;
      this.on("mouseover.force", d3_layout_forceMouseover).on("mouseout.force", d3_layout_forceMouseout).call(drag);
    };
    function dragmove(d) {
      d.px = d3.event.x, d.py = d3.event.y;
      force.resume();
    }
    return d3.rebind(force, event, "on");
  };
  function d3_layout_forceDragstart(d) {
    d.fixed |= 2;
  }
  function d3_layout_forceDragend(d) {
    d.fixed &= ~6;
  }
  function d3_layout_forceMouseover(d) {
    d.fixed |= 4;
    d.px = d.x, d.py = d.y;
  }
  function d3_layout_forceMouseout(d) {
    d.fixed &= ~4;
  }
  function d3_layout_forceAccumulate(quad, alpha, charges) {
    var cx = 0, cy = 0;
    quad.charge = 0;
    if (!quad.leaf) {
      var nodes = quad.nodes, n = nodes.length, i = -1, c;
      while (++i < n) {
        c = nodes[i];
        if (c == null) continue;
        d3_layout_forceAccumulate(c, alpha, charges);
        quad.charge += c.charge;
        cx += c.charge * c.cx;
        cy += c.charge * c.cy;
      }
    }
    if (quad.point) {
      if (!quad.leaf) {
        quad.point.x += Math.random() - .5;
        quad.point.y += Math.random() - .5;
      }
      var k = alpha * charges[quad.point.index];
      quad.charge += quad.pointCharge = k;
      cx += k * quad.point.x;
      cy += k * quad.point.y;
    }
    quad.cx = cx / quad.charge;
    quad.cy = cy / quad.charge;
  }
  var d3_layout_forceLinkDistance = 20, d3_layout_forceLinkStrength = 1, d3_layout_forceChargeDistance2 = Infinity;
  d3.layout.hierarchy = function() {
    var sort = d3_layout_hierarchySort, children = d3_layout_hierarchyChildren, value = d3_layout_hierarchyValue;
    function recurse(node, depth, nodes) {
      var childs = children.call(hierarchy, node, depth);
      node.depth = depth;
      nodes.push(node);
      if (childs && (n = childs.length)) {
        var i = -1, n, c = node.children = new Array(n), v = 0, j = depth + 1, d;
        while (++i < n) {
          d = c[i] = recurse(childs[i], j, nodes);
          d.parent = node;
          v += d.value;
        }
        if (sort) c.sort(sort);
        if (value) node.value = v;
      } else {
        delete node.children;
        if (value) {
          node.value = +value.call(hierarchy, node, depth) || 0;
        }
      }
      return node;
    }
    function revalue(node, depth) {
      var children = node.children, v = 0;
      if (children && (n = children.length)) {
        var i = -1, n, j = depth + 1;
        while (++i < n) v += revalue(children[i], j);
      } else if (value) {
        v = +value.call(hierarchy, node, depth) || 0;
      }
      if (value) node.value = v;
      return v;
    }
    function hierarchy(d) {
      var nodes = [];
      recurse(d, 0, nodes);
      return nodes;
    }
    hierarchy.sort = function(x) {
      if (!arguments.length) return sort;
      sort = x;
      return hierarchy;
    };
    hierarchy.children = function(x) {
      if (!arguments.length) return children;
      children = x;
      return hierarchy;
    };
    hierarchy.value = function(x) {
      if (!arguments.length) return value;
      value = x;
      return hierarchy;
    };
    hierarchy.revalue = function(root) {
      revalue(root, 0);
      return root;
    };
    return hierarchy;
  };
  function d3_layout_hierarchyRebind(object, hierarchy) {
    d3.rebind(object, hierarchy, "sort", "children", "value");
    object.nodes = object;
    object.links = d3_layout_hierarchyLinks;
    return object;
  }
  function d3_layout_hierarchyChildren(d) {
    return d.children;
  }
  function d3_layout_hierarchyValue(d) {
    return d.value;
  }
  function d3_layout_hierarchySort(a, b) {
    return b.value - a.value;
  }
  function d3_layout_hierarchyLinks(nodes) {
    return d3.merge(nodes.map(function(parent) {
      return (parent.children || []).map(function(child) {
        return {
          source: parent,
          target: child
        };
      });
    }));
  }
  d3.layout.partition = function() {
    var hierarchy = d3.layout.hierarchy(), size = [ 1, 1 ];
    function position(node, x, dx, dy) {
      var children = node.children;
      node.x = x;
      node.y = node.depth * dy;
      node.dx = dx;
      node.dy = dy;
      if (children && (n = children.length)) {
        var i = -1, n, c, d;
        dx = node.value ? dx / node.value : 0;
        while (++i < n) {
          position(c = children[i], x, d = c.value * dx, dy);
          x += d;
        }
      }
    }
    function depth(node) {
      var children = node.children, d = 0;
      if (children && (n = children.length)) {
        var i = -1, n;
        while (++i < n) d = Math.max(d, depth(children[i]));
      }
      return 1 + d;
    }
    function partition(d, i) {
      var nodes = hierarchy.call(this, d, i);
      position(nodes[0], 0, size[0], size[1] / depth(nodes[0]));
      return nodes;
    }
    partition.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return partition;
    };
    return d3_layout_hierarchyRebind(partition, hierarchy);
  };
  d3.layout.pie = function() {
    var value = Number, sort = d3_layout_pieSortByValue, startAngle = 0, endAngle = τ;
    function pie(data) {
      var values = data.map(function(d, i) {
        return +value.call(pie, d, i);
      });
      var a = +(typeof startAngle === "function" ? startAngle.apply(this, arguments) : startAngle);
      var k = ((typeof endAngle === "function" ? endAngle.apply(this, arguments) : endAngle) - a) / d3.sum(values);
      var index = d3.range(data.length);
      if (sort != null) index.sort(sort === d3_layout_pieSortByValue ? function(i, j) {
        return values[j] - values[i];
      } : function(i, j) {
        return sort(data[i], data[j]);
      });
      var arcs = [];
      index.forEach(function(i) {
        var d;
        arcs[i] = {
          data: data[i],
          value: d = values[i],
          startAngle: a,
          endAngle: a += d * k
        };
      });
      return arcs;
    }
    pie.value = function(x) {
      if (!arguments.length) return value;
      value = x;
      return pie;
    };
    pie.sort = function(x) {
      if (!arguments.length) return sort;
      sort = x;
      return pie;
    };
    pie.startAngle = function(x) {
      if (!arguments.length) return startAngle;
      startAngle = x;
      return pie;
    };
    pie.endAngle = function(x) {
      if (!arguments.length) return endAngle;
      endAngle = x;
      return pie;
    };
    return pie;
  };
  var d3_layout_pieSortByValue = {};
  d3.layout.stack = function() {
    var values = d3_identity, order = d3_layout_stackOrderDefault, offset = d3_layout_stackOffsetZero, out = d3_layout_stackOut, x = d3_layout_stackX, y = d3_layout_stackY;
    function stack(data, index) {
      var series = data.map(function(d, i) {
        return values.call(stack, d, i);
      });
      var points = series.map(function(d) {
        return d.map(function(v, i) {
          return [ x.call(stack, v, i), y.call(stack, v, i) ];
        });
      });
      var orders = order.call(stack, points, index);
      series = d3.permute(series, orders);
      points = d3.permute(points, orders);
      var offsets = offset.call(stack, points, index);
      var n = series.length, m = series[0].length, i, j, o;
      for (j = 0; j < m; ++j) {
        out.call(stack, series[0][j], o = offsets[j], points[0][j][1]);
        for (i = 1; i < n; ++i) {
          out.call(stack, series[i][j], o += points[i - 1][j][1], points[i][j][1]);
        }
      }
      return data;
    }
    stack.values = function(x) {
      if (!arguments.length) return values;
      values = x;
      return stack;
    };
    stack.order = function(x) {
      if (!arguments.length) return order;
      order = typeof x === "function" ? x : d3_layout_stackOrders.get(x) || d3_layout_stackOrderDefault;
      return stack;
    };
    stack.offset = function(x) {
      if (!arguments.length) return offset;
      offset = typeof x === "function" ? x : d3_layout_stackOffsets.get(x) || d3_layout_stackOffsetZero;
      return stack;
    };
    stack.x = function(z) {
      if (!arguments.length) return x;
      x = z;
      return stack;
    };
    stack.y = function(z) {
      if (!arguments.length) return y;
      y = z;
      return stack;
    };
    stack.out = function(z) {
      if (!arguments.length) return out;
      out = z;
      return stack;
    };
    return stack;
  };
  function d3_layout_stackX(d) {
    return d.x;
  }
  function d3_layout_stackY(d) {
    return d.y;
  }
  function d3_layout_stackOut(d, y0, y) {
    d.y0 = y0;
    d.y = y;
  }
  var d3_layout_stackOrders = d3.map({
    "inside-out": function(data) {
      var n = data.length, i, j, max = data.map(d3_layout_stackMaxIndex), sums = data.map(d3_layout_stackReduceSum), index = d3.range(n).sort(function(a, b) {
        return max[a] - max[b];
      }), top = 0, bottom = 0, tops = [], bottoms = [];
      for (i = 0; i < n; ++i) {
        j = index[i];
        if (top < bottom) {
          top += sums[j];
          tops.push(j);
        } else {
          bottom += sums[j];
          bottoms.push(j);
        }
      }
      return bottoms.reverse().concat(tops);
    },
    reverse: function(data) {
      return d3.range(data.length).reverse();
    },
    "default": d3_layout_stackOrderDefault
  });
  var d3_layout_stackOffsets = d3.map({
    silhouette: function(data) {
      var n = data.length, m = data[0].length, sums = [], max = 0, i, j, o, y0 = [];
      for (j = 0; j < m; ++j) {
        for (i = 0, o = 0; i < n; i++) o += data[i][j][1];
        if (o > max) max = o;
        sums.push(o);
      }
      for (j = 0; j < m; ++j) {
        y0[j] = (max - sums[j]) / 2;
      }
      return y0;
    },
    wiggle: function(data) {
      var n = data.length, x = data[0], m = x.length, i, j, k, s1, s2, s3, dx, o, o0, y0 = [];
      y0[0] = o = o0 = 0;
      for (j = 1; j < m; ++j) {
        for (i = 0, s1 = 0; i < n; ++i) s1 += data[i][j][1];
        for (i = 0, s2 = 0, dx = x[j][0] - x[j - 1][0]; i < n; ++i) {
          for (k = 0, s3 = (data[i][j][1] - data[i][j - 1][1]) / (2 * dx); k < i; ++k) {
            s3 += (data[k][j][1] - data[k][j - 1][1]) / dx;
          }
          s2 += s3 * data[i][j][1];
        }
        y0[j] = o -= s1 ? s2 / s1 * dx : 0;
        if (o < o0) o0 = o;
      }
      for (j = 0; j < m; ++j) y0[j] -= o0;
      return y0;
    },
    expand: function(data) {
      var n = data.length, m = data[0].length, k = 1 / n, i, j, o, y0 = [];
      for (j = 0; j < m; ++j) {
        for (i = 0, o = 0; i < n; i++) o += data[i][j][1];
        if (o) for (i = 0; i < n; i++) data[i][j][1] /= o; else for (i = 0; i < n; i++) data[i][j][1] = k;
      }
      for (j = 0; j < m; ++j) y0[j] = 0;
      return y0;
    },
    zero: d3_layout_stackOffsetZero
  });
  function d3_layout_stackOrderDefault(data) {
    return d3.range(data.length);
  }
  function d3_layout_stackOffsetZero(data) {
    var j = -1, m = data[0].length, y0 = [];
    while (++j < m) y0[j] = 0;
    return y0;
  }
  function d3_layout_stackMaxIndex(array) {
    var i = 1, j = 0, v = array[0][1], k, n = array.length;
    for (;i < n; ++i) {
      if ((k = array[i][1]) > v) {
        j = i;
        v = k;
      }
    }
    return j;
  }
  function d3_layout_stackReduceSum(d) {
    return d.reduce(d3_layout_stackSum, 0);
  }
  function d3_layout_stackSum(p, d) {
    return p + d[1];
  }
  d3.layout.histogram = function() {
    var frequency = true, valuer = Number, ranger = d3_layout_histogramRange, binner = d3_layout_histogramBinSturges;
    function histogram(data, i) {
      var bins = [], values = data.map(valuer, this), range = ranger.call(this, values, i), thresholds = binner.call(this, range, values, i), bin, i = -1, n = values.length, m = thresholds.length - 1, k = frequency ? 1 : 1 / n, x;
      while (++i < m) {
        bin = bins[i] = [];
        bin.dx = thresholds[i + 1] - (bin.x = thresholds[i]);
        bin.y = 0;
      }
      if (m > 0) {
        i = -1;
        while (++i < n) {
          x = values[i];
          if (x >= range[0] && x <= range[1]) {
            bin = bins[d3.bisect(thresholds, x, 1, m) - 1];
            bin.y += k;
            bin.push(data[i]);
          }
        }
      }
      return bins;
    }
    histogram.value = function(x) {
      if (!arguments.length) return valuer;
      valuer = x;
      return histogram;
    };
    histogram.range = function(x) {
      if (!arguments.length) return ranger;
      ranger = d3_functor(x);
      return histogram;
    };
    histogram.bins = function(x) {
      if (!arguments.length) return binner;
      binner = typeof x === "number" ? function(range) {
        return d3_layout_histogramBinFixed(range, x);
      } : d3_functor(x);
      return histogram;
    };
    histogram.frequency = function(x) {
      if (!arguments.length) return frequency;
      frequency = !!x;
      return histogram;
    };
    return histogram;
  };
  function d3_layout_histogramBinSturges(range, values) {
    return d3_layout_histogramBinFixed(range, Math.ceil(Math.log(values.length) / Math.LN2 + 1));
  }
  function d3_layout_histogramBinFixed(range, n) {
    var x = -1, b = +range[0], m = (range[1] - b) / n, f = [];
    while (++x <= n) f[x] = m * x + b;
    return f;
  }
  function d3_layout_histogramRange(values) {
    return [ d3.min(values), d3.max(values) ];
  }
  d3.layout.tree = function() {
    var hierarchy = d3.layout.hierarchy().sort(null).value(null), separation = d3_layout_treeSeparation, size = [ 1, 1 ], nodeSize = false;
    function tree(d, i) {
      var nodes = hierarchy.call(this, d, i), root = nodes[0];
      function firstWalk(node, previousSibling) {
        var children = node.children, layout = node._tree;
        if (children && (n = children.length)) {
          var n, firstChild = children[0], previousChild, ancestor = firstChild, child, i = -1;
          while (++i < n) {
            child = children[i];
            firstWalk(child, previousChild);
            ancestor = apportion(child, previousChild, ancestor);
            previousChild = child;
          }
          d3_layout_treeShift(node);
          var midpoint = .5 * (firstChild._tree.prelim + child._tree.prelim);
          if (previousSibling) {
            layout.prelim = previousSibling._tree.prelim + separation(node, previousSibling);
            layout.mod = layout.prelim - midpoint;
          } else {
            layout.prelim = midpoint;
          }
        } else {
          if (previousSibling) {
            layout.prelim = previousSibling._tree.prelim + separation(node, previousSibling);
          }
        }
      }
      function secondWalk(node, x) {
        node.x = node._tree.prelim + x;
        var children = node.children;
        if (children && (n = children.length)) {
          var i = -1, n;
          x += node._tree.mod;
          while (++i < n) {
            secondWalk(children[i], x);
          }
        }
      }
      function apportion(node, previousSibling, ancestor) {
        if (previousSibling) {
          var vip = node, vop = node, vim = previousSibling, vom = node.parent.children[0], sip = vip._tree.mod, sop = vop._tree.mod, sim = vim._tree.mod, som = vom._tree.mod, shift;
          while (vim = d3_layout_treeRight(vim), vip = d3_layout_treeLeft(vip), vim && vip) {
            vom = d3_layout_treeLeft(vom);
            vop = d3_layout_treeRight(vop);
            vop._tree.ancestor = node;
            shift = vim._tree.prelim + sim - vip._tree.prelim - sip + separation(vim, vip);
            if (shift > 0) {
              d3_layout_treeMove(d3_layout_treeAncestor(vim, node, ancestor), node, shift);
              sip += shift;
              sop += shift;
            }
            sim += vim._tree.mod;
            sip += vip._tree.mod;
            som += vom._tree.mod;
            sop += vop._tree.mod;
          }
          if (vim && !d3_layout_treeRight(vop)) {
            vop._tree.thread = vim;
            vop._tree.mod += sim - sop;
          }
          if (vip && !d3_layout_treeLeft(vom)) {
            vom._tree.thread = vip;
            vom._tree.mod += sip - som;
            ancestor = node;
          }
        }
        return ancestor;
      }
      d3_layout_treeVisitAfter(root, function(node, previousSibling) {
        node._tree = {
          ancestor: node,
          prelim: 0,
          mod: 0,
          change: 0,
          shift: 0,
          number: previousSibling ? previousSibling._tree.number + 1 : 0
        };
      });
      firstWalk(root);
      secondWalk(root, -root._tree.prelim);
      var left = d3_layout_treeSearch(root, d3_layout_treeLeftmost), right = d3_layout_treeSearch(root, d3_layout_treeRightmost), deep = d3_layout_treeSearch(root, d3_layout_treeDeepest), x0 = left.x - separation(left, right) / 2, x1 = right.x + separation(right, left) / 2, y1 = deep.depth || 1;
      d3_layout_treeVisitAfter(root, nodeSize ? function(node) {
        node.x *= size[0];
        node.y = node.depth * size[1];
        delete node._tree;
      } : function(node) {
        node.x = (node.x - x0) / (x1 - x0) * size[0];
        node.y = node.depth / y1 * size[1];
        delete node._tree;
      });
      return nodes;
    }
    tree.separation = function(x) {
      if (!arguments.length) return separation;
      separation = x;
      return tree;
    };
    tree.size = function(x) {
      if (!arguments.length) return nodeSize ? null : size;
      nodeSize = (size = x) == null;
      return tree;
    };
    tree.nodeSize = function(x) {
      if (!arguments.length) return nodeSize ? size : null;
      nodeSize = (size = x) != null;
      return tree;
    };
    return d3_layout_hierarchyRebind(tree, hierarchy);
  };
  function d3_layout_treeSeparation(a, b) {
    return a.parent == b.parent ? 1 : 2;
  }
  function d3_layout_treeLeft(node) {
    var children = node.children;
    return children && children.length ? children[0] : node._tree.thread;
  }
  function d3_layout_treeRight(node) {
    var children = node.children, n;
    return children && (n = children.length) ? children[n - 1] : node._tree.thread;
  }
  function d3_layout_treeSearch(node, compare) {
    var children = node.children;
    if (children && (n = children.length)) {
      var child, n, i = -1;
      while (++i < n) {
        if (compare(child = d3_layout_treeSearch(children[i], compare), node) > 0) {
          node = child;
        }
      }
    }
    return node;
  }
  function d3_layout_treeRightmost(a, b) {
    return a.x - b.x;
  }
  function d3_layout_treeLeftmost(a, b) {
    return b.x - a.x;
  }
  function d3_layout_treeDeepest(a, b) {
    return a.depth - b.depth;
  }
  function d3_layout_treeVisitAfter(node, callback) {
    function visit(node, previousSibling) {
      var children = node.children;
      if (children && (n = children.length)) {
        var child, previousChild = null, i = -1, n;
        while (++i < n) {
          child = children[i];
          visit(child, previousChild);
          previousChild = child;
        }
      }
      callback(node, previousSibling);
    }
    visit(node, null);
  }
  function d3_layout_treeShift(node) {
    var shift = 0, change = 0, children = node.children, i = children.length, child;
    while (--i >= 0) {
      child = children[i]._tree;
      child.prelim += shift;
      child.mod += shift;
      shift += child.shift + (change += child.change);
    }
  }
  function d3_layout_treeMove(ancestor, node, shift) {
    ancestor = ancestor._tree;
    node = node._tree;
    var change = shift / (node.number - ancestor.number);
    ancestor.change += change;
    node.change -= change;
    node.shift += shift;
    node.prelim += shift;
    node.mod += shift;
  }
  function d3_layout_treeAncestor(vim, node, ancestor) {
    return vim._tree.ancestor.parent == node.parent ? vim._tree.ancestor : ancestor;
  }
  d3.layout.pack = function() {
    var hierarchy = d3.layout.hierarchy().sort(d3_layout_packSort), padding = 0, size = [ 1, 1 ], radius;
    function pack(d, i) {
      var nodes = hierarchy.call(this, d, i), root = nodes[0], w = size[0], h = size[1], r = radius == null ? Math.sqrt : typeof radius === "function" ? radius : function() {
        return radius;
      };
      root.x = root.y = 0;
      d3_layout_treeVisitAfter(root, function(d) {
        d.r = +r(d.value);
      });
      d3_layout_treeVisitAfter(root, d3_layout_packSiblings);
      if (padding) {
        var dr = padding * (radius ? 1 : Math.max(2 * root.r / w, 2 * root.r / h)) / 2;
        d3_layout_treeVisitAfter(root, function(d) {
          d.r += dr;
        });
        d3_layout_treeVisitAfter(root, d3_layout_packSiblings);
        d3_layout_treeVisitAfter(root, function(d) {
          d.r -= dr;
        });
      }
      d3_layout_packTransform(root, w / 2, h / 2, radius ? 1 : 1 / Math.max(2 * root.r / w, 2 * root.r / h));
      return nodes;
    }
    pack.size = function(_) {
      if (!arguments.length) return size;
      size = _;
      return pack;
    };
    pack.radius = function(_) {
      if (!arguments.length) return radius;
      radius = _ == null || typeof _ === "function" ? _ : +_;
      return pack;
    };
    pack.padding = function(_) {
      if (!arguments.length) return padding;
      padding = +_;
      return pack;
    };
    return d3_layout_hierarchyRebind(pack, hierarchy);
  };
  function d3_layout_packSort(a, b) {
    return a.value - b.value;
  }
  function d3_layout_packInsert(a, b) {
    var c = a._pack_next;
    a._pack_next = b;
    b._pack_prev = a;
    b._pack_next = c;
    c._pack_prev = b;
  }
  function d3_layout_packSplice(a, b) {
    a._pack_next = b;
    b._pack_prev = a;
  }
  function d3_layout_packIntersects(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, dr = a.r + b.r;
    return .999 * dr * dr > dx * dx + dy * dy;
  }
  function d3_layout_packSiblings(node) {
    if (!(nodes = node.children) || !(n = nodes.length)) return;
    var nodes, xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, a, b, c, i, j, k, n;
    function bound(node) {
      xMin = Math.min(node.x - node.r, xMin);
      xMax = Math.max(node.x + node.r, xMax);
      yMin = Math.min(node.y - node.r, yMin);
      yMax = Math.max(node.y + node.r, yMax);
    }
    nodes.forEach(d3_layout_packLink);
    a = nodes[0];
    a.x = -a.r;
    a.y = 0;
    bound(a);
    if (n > 1) {
      b = nodes[1];
      b.x = b.r;
      b.y = 0;
      bound(b);
      if (n > 2) {
        c = nodes[2];
        d3_layout_packPlace(a, b, c);
        bound(c);
        d3_layout_packInsert(a, c);
        a._pack_prev = c;
        d3_layout_packInsert(c, b);
        b = a._pack_next;
        for (i = 3; i < n; i++) {
          d3_layout_packPlace(a, b, c = nodes[i]);
          var isect = 0, s1 = 1, s2 = 1;
          for (j = b._pack_next; j !== b; j = j._pack_next, s1++) {
            if (d3_layout_packIntersects(j, c)) {
              isect = 1;
              break;
            }
          }
          if (isect == 1) {
            for (k = a._pack_prev; k !== j._pack_prev; k = k._pack_prev, s2++) {
              if (d3_layout_packIntersects(k, c)) {
                break;
              }
            }
          }
          if (isect) {
            if (s1 < s2 || s1 == s2 && b.r < a.r) d3_layout_packSplice(a, b = j); else d3_layout_packSplice(a = k, b);
            i--;
          } else {
            d3_layout_packInsert(a, c);
            b = c;
            bound(c);
          }
        }
      }
    }
    var cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2, cr = 0;
    for (i = 0; i < n; i++) {
      c = nodes[i];
      c.x -= cx;
      c.y -= cy;
      cr = Math.max(cr, c.r + Math.sqrt(c.x * c.x + c.y * c.y));
    }
    node.r = cr;
    nodes.forEach(d3_layout_packUnlink);
  }
  function d3_layout_packLink(node) {
    node._pack_next = node._pack_prev = node;
  }
  function d3_layout_packUnlink(node) {
    delete node._pack_next;
    delete node._pack_prev;
  }
  function d3_layout_packTransform(node, x, y, k) {
    var children = node.children;
    node.x = x += k * node.x;
    node.y = y += k * node.y;
    node.r *= k;
    if (children) {
      var i = -1, n = children.length;
      while (++i < n) d3_layout_packTransform(children[i], x, y, k);
    }
  }
  function d3_layout_packPlace(a, b, c) {
    var db = a.r + c.r, dx = b.x - a.x, dy = b.y - a.y;
    if (db && (dx || dy)) {
      var da = b.r + c.r, dc = dx * dx + dy * dy;
      da *= da;
      db *= db;
      var x = .5 + (db - da) / (2 * dc), y = Math.sqrt(Math.max(0, 2 * da * (db + dc) - (db -= dc) * db - da * da)) / (2 * dc);
      c.x = a.x + x * dx + y * dy;
      c.y = a.y + x * dy - y * dx;
    } else {
      c.x = a.x + db;
      c.y = a.y;
    }
  }
  d3.layout.cluster = function() {
    var hierarchy = d3.layout.hierarchy().sort(null).value(null), separation = d3_layout_treeSeparation, size = [ 1, 1 ], nodeSize = false;
    function cluster(d, i) {
      var nodes = hierarchy.call(this, d, i), root = nodes[0], previousNode, x = 0;
      d3_layout_treeVisitAfter(root, function(node) {
        var children = node.children;
        if (children && children.length) {
          node.x = d3_layout_clusterX(children);
          node.y = d3_layout_clusterY(children);
        } else {
          node.x = previousNode ? x += separation(node, previousNode) : 0;
          node.y = 0;
          previousNode = node;
        }
      });
      var left = d3_layout_clusterLeft(root), right = d3_layout_clusterRight(root), x0 = left.x - separation(left, right) / 2, x1 = right.x + separation(right, left) / 2;
      d3_layout_treeVisitAfter(root, nodeSize ? function(node) {
        node.x = (node.x - root.x) * size[0];
        node.y = (root.y - node.y) * size[1];
      } : function(node) {
        node.x = (node.x - x0) / (x1 - x0) * size[0];
        node.y = (1 - (root.y ? node.y / root.y : 1)) * size[1];
      });
      return nodes;
    }
    cluster.separation = function(x) {
      if (!arguments.length) return separation;
      separation = x;
      return cluster;
    };
    cluster.size = function(x) {
      if (!arguments.length) return nodeSize ? null : size;
      nodeSize = (size = x) == null;
      return cluster;
    };
    cluster.nodeSize = function(x) {
      if (!arguments.length) return nodeSize ? size : null;
      nodeSize = (size = x) != null;
      return cluster;
    };
    return d3_layout_hierarchyRebind(cluster, hierarchy);
  };
  function d3_layout_clusterY(children) {
    return 1 + d3.max(children, function(child) {
      return child.y;
    });
  }
  function d3_layout_clusterX(children) {
    return children.reduce(function(x, child) {
      return x + child.x;
    }, 0) / children.length;
  }
  function d3_layout_clusterLeft(node) {
    var children = node.children;
    return children && children.length ? d3_layout_clusterLeft(children[0]) : node;
  }
  function d3_layout_clusterRight(node) {
    var children = node.children, n;
    return children && (n = children.length) ? d3_layout_clusterRight(children[n - 1]) : node;
  }
  d3.layout.treemap = function() {
    var hierarchy = d3.layout.hierarchy(), round = Math.round, size = [ 1, 1 ], padding = null, pad = d3_layout_treemapPadNull, sticky = false, stickies, mode = "squarify", ratio = .5 * (1 + Math.sqrt(5));
    function scale(children, k) {
      var i = -1, n = children.length, child, area;
      while (++i < n) {
        area = (child = children[i]).value * (k < 0 ? 0 : k);
        child.area = isNaN(area) || area <= 0 ? 0 : area;
      }
    }
    function squarify(node) {
      var children = node.children;
      if (children && children.length) {
        var rect = pad(node), row = [], remaining = children.slice(), child, best = Infinity, score, u = mode === "slice" ? rect.dx : mode === "dice" ? rect.dy : mode === "slice-dice" ? node.depth & 1 ? rect.dy : rect.dx : Math.min(rect.dx, rect.dy), n;
        scale(remaining, rect.dx * rect.dy / node.value);
        row.area = 0;
        while ((n = remaining.length) > 0) {
          row.push(child = remaining[n - 1]);
          row.area += child.area;
          if (mode !== "squarify" || (score = worst(row, u)) <= best) {
            remaining.pop();
            best = score;
          } else {
            row.area -= row.pop().area;
            position(row, u, rect, false);
            u = Math.min(rect.dx, rect.dy);
            row.length = row.area = 0;
            best = Infinity;
          }
        }
        if (row.length) {
          position(row, u, rect, true);
          row.length = row.area = 0;
        }
        children.forEach(squarify);
      }
    }
    function stickify(node) {
      var children = node.children;
      if (children && children.length) {
        var rect = pad(node), remaining = children.slice(), child, row = [];
        scale(remaining, rect.dx * rect.dy / node.value);
        row.area = 0;
        while (child = remaining.pop()) {
          row.push(child);
          row.area += child.area;
          if (child.z != null) {
            position(row, child.z ? rect.dx : rect.dy, rect, !remaining.length);
            row.length = row.area = 0;
          }
        }
        children.forEach(stickify);
      }
    }
    function worst(row, u) {
      var s = row.area, r, rmax = 0, rmin = Infinity, i = -1, n = row.length;
      while (++i < n) {
        if (!(r = row[i].area)) continue;
        if (r < rmin) rmin = r;
        if (r > rmax) rmax = r;
      }
      s *= s;
      u *= u;
      return s ? Math.max(u * rmax * ratio / s, s / (u * rmin * ratio)) : Infinity;
    }
    function position(row, u, rect, flush) {
      var i = -1, n = row.length, x = rect.x, y = rect.y, v = u ? round(row.area / u) : 0, o;
      if (u == rect.dx) {
        if (flush || v > rect.dy) v = rect.dy;
        while (++i < n) {
          o = row[i];
          o.x = x;
          o.y = y;
          o.dy = v;
          x += o.dx = Math.min(rect.x + rect.dx - x, v ? round(o.area / v) : 0);
        }
        o.z = true;
        o.dx += rect.x + rect.dx - x;
        rect.y += v;
        rect.dy -= v;
      } else {
        if (flush || v > rect.dx) v = rect.dx;
        while (++i < n) {
          o = row[i];
          o.x = x;
          o.y = y;
          o.dx = v;
          y += o.dy = Math.min(rect.y + rect.dy - y, v ? round(o.area / v) : 0);
        }
        o.z = false;
        o.dy += rect.y + rect.dy - y;
        rect.x += v;
        rect.dx -= v;
      }
    }
    function treemap(d) {
      var nodes = stickies || hierarchy(d), root = nodes[0];
      root.x = 0;
      root.y = 0;
      root.dx = size[0];
      root.dy = size[1];
      if (stickies) hierarchy.revalue(root);
      scale([ root ], root.dx * root.dy / root.value);
      (stickies ? stickify : squarify)(root);
      if (sticky) stickies = nodes;
      return nodes;
    }
    treemap.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return treemap;
    };
    treemap.padding = function(x) {
      if (!arguments.length) return padding;
      function padFunction(node) {
        var p = x.call(treemap, node, node.depth);
        return p == null ? d3_layout_treemapPadNull(node) : d3_layout_treemapPad(node, typeof p === "number" ? [ p, p, p, p ] : p);
      }
      function padConstant(node) {
        return d3_layout_treemapPad(node, x);
      }
      var type;
      pad = (padding = x) == null ? d3_layout_treemapPadNull : (type = typeof x) === "function" ? padFunction : type === "number" ? (x = [ x, x, x, x ], 
      padConstant) : padConstant;
      return treemap;
    };
    treemap.round = function(x) {
      if (!arguments.length) return round != Number;
      round = x ? Math.round : Number;
      return treemap;
    };
    treemap.sticky = function(x) {
      if (!arguments.length) return sticky;
      sticky = x;
      stickies = null;
      return treemap;
    };
    treemap.ratio = function(x) {
      if (!arguments.length) return ratio;
      ratio = x;
      return treemap;
    };
    treemap.mode = function(x) {
      if (!arguments.length) return mode;
      mode = x + "";
      return treemap;
    };
    return d3_layout_hierarchyRebind(treemap, hierarchy);
  };
  function d3_layout_treemapPadNull(node) {
    return {
      x: node.x,
      y: node.y,
      dx: node.dx,
      dy: node.dy
    };
  }
  function d3_layout_treemapPad(node, padding) {
    var x = node.x + padding[3], y = node.y + padding[0], dx = node.dx - padding[1] - padding[3], dy = node.dy - padding[0] - padding[2];
    if (dx < 0) {
      x += dx / 2;
      dx = 0;
    }
    if (dy < 0) {
      y += dy / 2;
      dy = 0;
    }
    return {
      x: x,
      y: y,
      dx: dx,
      dy: dy
    };
  }
  d3.random = {
    normal: function(µ, σ) {
      var n = arguments.length;
      if (n < 2) σ = 1;
      if (n < 1) µ = 0;
      return function() {
        var x, y, r;
        do {
          x = Math.random() * 2 - 1;
          y = Math.random() * 2 - 1;
          r = x * x + y * y;
        } while (!r || r > 1);
        return µ + σ * x * Math.sqrt(-2 * Math.log(r) / r);
      };
    },
    logNormal: function() {
      var random = d3.random.normal.apply(d3, arguments);
      return function() {
        return Math.exp(random());
      };
    },
    bates: function(m) {
      var random = d3.random.irwinHall(m);
      return function() {
        return random() / m;
      };
    },
    irwinHall: function(m) {
      return function() {
        for (var s = 0, j = 0; j < m; j++) s += Math.random();
        return s;
      };
    }
  };
  d3.scale = {};
  function d3_scaleExtent(domain) {
    var start = domain[0], stop = domain[domain.length - 1];
    return start < stop ? [ start, stop ] : [ stop, start ];
  }
  function d3_scaleRange(scale) {
    return scale.rangeExtent ? scale.rangeExtent() : d3_scaleExtent(scale.range());
  }
  function d3_scale_bilinear(domain, range, uninterpolate, interpolate) {
    var u = uninterpolate(domain[0], domain[1]), i = interpolate(range[0], range[1]);
    return function(x) {
      return i(u(x));
    };
  }
  function d3_scale_nice(domain, nice) {
    var i0 = 0, i1 = domain.length - 1, x0 = domain[i0], x1 = domain[i1], dx;
    if (x1 < x0) {
      dx = i0, i0 = i1, i1 = dx;
      dx = x0, x0 = x1, x1 = dx;
    }
    domain[i0] = nice.floor(x0);
    domain[i1] = nice.ceil(x1);
    return domain;
  }
  function d3_scale_niceStep(step) {
    return step ? {
      floor: function(x) {
        return Math.floor(x / step) * step;
      },
      ceil: function(x) {
        return Math.ceil(x / step) * step;
      }
    } : d3_scale_niceIdentity;
  }
  var d3_scale_niceIdentity = {
    floor: d3_identity,
    ceil: d3_identity
  };
  function d3_scale_polylinear(domain, range, uninterpolate, interpolate) {
    var u = [], i = [], j = 0, k = Math.min(domain.length, range.length) - 1;
    if (domain[k] < domain[0]) {
      domain = domain.slice().reverse();
      range = range.slice().reverse();
    }
    while (++j <= k) {
      u.push(uninterpolate(domain[j - 1], domain[j]));
      i.push(interpolate(range[j - 1], range[j]));
    }
    return function(x) {
      var j = d3.bisect(domain, x, 1, k) - 1;
      return i[j](u[j](x));
    };
  }
  d3.scale.linear = function() {
    return d3_scale_linear([ 0, 1 ], [ 0, 1 ], d3_interpolate, false);
  };
  function d3_scale_linear(domain, range, interpolate, clamp) {
    var output, input;
    function rescale() {
      var linear = Math.min(domain.length, range.length) > 2 ? d3_scale_polylinear : d3_scale_bilinear, uninterpolate = clamp ? d3_uninterpolateClamp : d3_uninterpolateNumber;
      output = linear(domain, range, uninterpolate, interpolate);
      input = linear(range, domain, uninterpolate, d3_interpolate);
      return scale;
    }
    function scale(x) {
      return output(x);
    }
    scale.invert = function(y) {
      return input(y);
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = x.map(Number);
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.rangeRound = function(x) {
      return scale.range(x).interpolate(d3_interpolateRound);
    };
    scale.clamp = function(x) {
      if (!arguments.length) return clamp;
      clamp = x;
      return rescale();
    };
    scale.interpolate = function(x) {
      if (!arguments.length) return interpolate;
      interpolate = x;
      return rescale();
    };
    scale.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    scale.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    scale.nice = function(m) {
      d3_scale_linearNice(domain, m);
      return rescale();
    };
    scale.copy = function() {
      return d3_scale_linear(domain, range, interpolate, clamp);
    };
    return rescale();
  }
  function d3_scale_linearRebind(scale, linear) {
    return d3.rebind(scale, linear, "range", "rangeRound", "interpolate", "clamp");
  }
  function d3_scale_linearNice(domain, m) {
    return d3_scale_nice(domain, d3_scale_niceStep(d3_scale_linearTickRange(domain, m)[2]));
  }
  function d3_scale_linearTickRange(domain, m) {
    if (m == null) m = 10;
    var extent = d3_scaleExtent(domain), span = extent[1] - extent[0], step = Math.pow(10, Math.floor(Math.log(span / m) / Math.LN10)), err = m / span * step;
    if (err <= .15) step *= 10; else if (err <= .35) step *= 5; else if (err <= .75) step *= 2;
    extent[0] = Math.ceil(extent[0] / step) * step;
    extent[1] = Math.floor(extent[1] / step) * step + step * .5;
    extent[2] = step;
    return extent;
  }
  function d3_scale_linearTicks(domain, m) {
    return d3.range.apply(d3, d3_scale_linearTickRange(domain, m));
  }
  function d3_scale_linearTickFormat(domain, m, format) {
    var range = d3_scale_linearTickRange(domain, m);
    return d3.format(format ? format.replace(d3_format_re, function(a, b, c, d, e, f, g, h, i, j) {
      return [ b, c, d, e, f, g, h, i || "." + d3_scale_linearFormatPrecision(j, range), j ].join("");
    }) : ",." + d3_scale_linearPrecision(range[2]) + "f");
  }
  var d3_scale_linearFormatSignificant = {
    s: 1,
    g: 1,
    p: 1,
    r: 1,
    e: 1
  };
  function d3_scale_linearPrecision(value) {
    return -Math.floor(Math.log(value) / Math.LN10 + .01);
  }
  function d3_scale_linearFormatPrecision(type, range) {
    var p = d3_scale_linearPrecision(range[2]);
    return type in d3_scale_linearFormatSignificant ? Math.abs(p - d3_scale_linearPrecision(Math.max(Math.abs(range[0]), Math.abs(range[1])))) + +(type !== "e") : p - (type === "%") * 2;
  }
  d3.scale.log = function() {
    return d3_scale_log(d3.scale.linear().domain([ 0, 1 ]), 10, true, [ 1, 10 ]);
  };
  function d3_scale_log(linear, base, positive, domain) {
    function log(x) {
      return (positive ? Math.log(x < 0 ? 0 : x) : -Math.log(x > 0 ? 0 : -x)) / Math.log(base);
    }
    function pow(x) {
      return positive ? Math.pow(base, x) : -Math.pow(base, -x);
    }
    function scale(x) {
      return linear(log(x));
    }
    scale.invert = function(x) {
      return pow(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      positive = x[0] >= 0;
      linear.domain((domain = x.map(Number)).map(log));
      return scale;
    };
    scale.base = function(_) {
      if (!arguments.length) return base;
      base = +_;
      linear.domain(domain.map(log));
      return scale;
    };
    scale.nice = function() {
      var niced = d3_scale_nice(domain.map(log), positive ? Math : d3_scale_logNiceNegative);
      linear.domain(niced);
      domain = niced.map(pow);
      return scale;
    };
    scale.ticks = function() {
      var extent = d3_scaleExtent(domain), ticks = [], u = extent[0], v = extent[1], i = Math.floor(log(u)), j = Math.ceil(log(v)), n = base % 1 ? 2 : base;
      if (isFinite(j - i)) {
        if (positive) {
          for (;i < j; i++) for (var k = 1; k < n; k++) ticks.push(pow(i) * k);
          ticks.push(pow(i));
        } else {
          ticks.push(pow(i));
          for (;i++ < j; ) for (var k = n - 1; k > 0; k--) ticks.push(pow(i) * k);
        }
        for (i = 0; ticks[i] < u; i++) {}
        for (j = ticks.length; ticks[j - 1] > v; j--) {}
        ticks = ticks.slice(i, j);
      }
      return ticks;
    };
    scale.tickFormat = function(n, format) {
      if (!arguments.length) return d3_scale_logFormat;
      if (arguments.length < 2) format = d3_scale_logFormat; else if (typeof format !== "function") format = d3.format(format);
      var k = Math.max(.1, n / scale.ticks().length), f = positive ? (e = 1e-12, Math.ceil) : (e = -1e-12, 
      Math.floor), e;
      return function(d) {
        return d / pow(f(log(d) + e)) <= k ? format(d) : "";
      };
    };
    scale.copy = function() {
      return d3_scale_log(linear.copy(), base, positive, domain);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  var d3_scale_logFormat = d3.format(".0e"), d3_scale_logNiceNegative = {
    floor: function(x) {
      return -Math.ceil(-x);
    },
    ceil: function(x) {
      return -Math.floor(-x);
    }
  };
  d3.scale.pow = function() {
    return d3_scale_pow(d3.scale.linear(), 1, [ 0, 1 ]);
  };
  function d3_scale_pow(linear, exponent, domain) {
    var powp = d3_scale_powPow(exponent), powb = d3_scale_powPow(1 / exponent);
    function scale(x) {
      return linear(powp(x));
    }
    scale.invert = function(x) {
      return powb(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      linear.domain((domain = x.map(Number)).map(powp));
      return scale;
    };
    scale.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    scale.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    scale.nice = function(m) {
      return scale.domain(d3_scale_linearNice(domain, m));
    };
    scale.exponent = function(x) {
      if (!arguments.length) return exponent;
      powp = d3_scale_powPow(exponent = x);
      powb = d3_scale_powPow(1 / exponent);
      linear.domain(domain.map(powp));
      return scale;
    };
    scale.copy = function() {
      return d3_scale_pow(linear.copy(), exponent, domain);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  function d3_scale_powPow(e) {
    return function(x) {
      return x < 0 ? -Math.pow(-x, e) : Math.pow(x, e);
    };
  }
  d3.scale.sqrt = function() {
    return d3.scale.pow().exponent(.5);
  };
  d3.scale.ordinal = function() {
    return d3_scale_ordinal([], {
      t: "range",
      a: [ [] ]
    });
  };
  function d3_scale_ordinal(domain, ranger) {
    var index, range, rangeBand;
    function scale(x) {
      return range[((index.get(x) || ranger.t === "range" && index.set(x, domain.push(x))) - 1) % range.length];
    }
    function steps(start, step) {
      return d3.range(domain.length).map(function(i) {
        return start + step * i;
      });
    }
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = [];
      index = new d3_Map();
      var i = -1, n = x.length, xi;
      while (++i < n) if (!index.has(xi = x[i])) index.set(xi, domain.push(xi));
      return scale[ranger.t].apply(scale, ranger.a);
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      rangeBand = 0;
      ranger = {
        t: "range",
        a: arguments
      };
      return scale;
    };
    scale.rangePoints = function(x, padding) {
      if (arguments.length < 2) padding = 0;
      var start = x[0], stop = x[1], step = (stop - start) / (Math.max(1, domain.length - 1) + padding);
      range = steps(domain.length < 2 ? (start + stop) / 2 : start + step * padding / 2, step);
      rangeBand = 0;
      ranger = {
        t: "rangePoints",
        a: arguments
      };
      return scale;
    };
    scale.rangeBands = function(x, padding, outerPadding) {
      if (arguments.length < 2) padding = 0;
      if (arguments.length < 3) outerPadding = padding;
      var reverse = x[1] < x[0], start = x[reverse - 0], stop = x[1 - reverse], step = (stop - start) / (domain.length - padding + 2 * outerPadding);
      range = steps(start + step * outerPadding, step);
      if (reverse) range.reverse();
      rangeBand = step * (1 - padding);
      ranger = {
        t: "rangeBands",
        a: arguments
      };
      return scale;
    };
    scale.rangeRoundBands = function(x, padding, outerPadding) {
      if (arguments.length < 2) padding = 0;
      if (arguments.length < 3) outerPadding = padding;
      var reverse = x[1] < x[0], start = x[reverse - 0], stop = x[1 - reverse], step = Math.floor((stop - start) / (domain.length - padding + 2 * outerPadding)), error = stop - start - (domain.length - padding) * step;
      range = steps(start + Math.round(error / 2), step);
      if (reverse) range.reverse();
      rangeBand = Math.round(step * (1 - padding));
      ranger = {
        t: "rangeRoundBands",
        a: arguments
      };
      return scale;
    };
    scale.rangeBand = function() {
      return rangeBand;
    };
    scale.rangeExtent = function() {
      return d3_scaleExtent(ranger.a[0]);
    };
    scale.copy = function() {
      return d3_scale_ordinal(domain, ranger);
    };
    return scale.domain(domain);
  }
  d3.scale.category10 = function() {
    return d3.scale.ordinal().range(d3_category10);
  };
  d3.scale.category20 = function() {
    return d3.scale.ordinal().range(d3_category20);
  };
  d3.scale.category20b = function() {
    return d3.scale.ordinal().range(d3_category20b);
  };
  d3.scale.category20c = function() {
    return d3.scale.ordinal().range(d3_category20c);
  };
  var d3_category10 = [ 2062260, 16744206, 2924588, 14034728, 9725885, 9197131, 14907330, 8355711, 12369186, 1556175 ].map(d3_rgbString);
  var d3_category20 = [ 2062260, 11454440, 16744206, 16759672, 2924588, 10018698, 14034728, 16750742, 9725885, 12955861, 9197131, 12885140, 14907330, 16234194, 8355711, 13092807, 12369186, 14408589, 1556175, 10410725 ].map(d3_rgbString);
  var d3_category20b = [ 3750777, 5395619, 7040719, 10264286, 6519097, 9216594, 11915115, 13556636, 9202993, 12426809, 15186514, 15190932, 8666169, 11356490, 14049643, 15177372, 8077683, 10834324, 13528509, 14589654 ].map(d3_rgbString);
  var d3_category20c = [ 3244733, 7057110, 10406625, 13032431, 15095053, 16616764, 16625259, 16634018, 3253076, 7652470, 10607003, 13101504, 7695281, 10394312, 12369372, 14342891, 6513507, 9868950, 12434877, 14277081 ].map(d3_rgbString);
  d3.scale.quantile = function() {
    return d3_scale_quantile([], []);
  };
  function d3_scale_quantile(domain, range) {
    var thresholds;
    function rescale() {
      var k = 0, q = range.length;
      thresholds = [];
      while (++k < q) thresholds[k - 1] = d3.quantile(domain, k / q);
      return scale;
    }
    function scale(x) {
      if (!isNaN(x = +x)) return range[d3.bisect(thresholds, x)];
    }
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = x.filter(function(d) {
        return !isNaN(d);
      }).sort(d3.ascending);
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.quantiles = function() {
      return thresholds;
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      return y < 0 ? [ NaN, NaN ] : [ y > 0 ? thresholds[y - 1] : domain[0], y < thresholds.length ? thresholds[y] : domain[domain.length - 1] ];
    };
    scale.copy = function() {
      return d3_scale_quantile(domain, range);
    };
    return rescale();
  }
  d3.scale.quantize = function() {
    return d3_scale_quantize(0, 1, [ 0, 1 ]);
  };
  function d3_scale_quantize(x0, x1, range) {
    var kx, i;
    function scale(x) {
      return range[Math.max(0, Math.min(i, Math.floor(kx * (x - x0))))];
    }
    function rescale() {
      kx = range.length / (x1 - x0);
      i = range.length - 1;
      return scale;
    }
    scale.domain = function(x) {
      if (!arguments.length) return [ x0, x1 ];
      x0 = +x[0];
      x1 = +x[x.length - 1];
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      y = y < 0 ? NaN : y / kx + x0;
      return [ y, y + 1 / kx ];
    };
    scale.copy = function() {
      return d3_scale_quantize(x0, x1, range);
    };
    return rescale();
  }
  d3.scale.threshold = function() {
    return d3_scale_threshold([ .5 ], [ 0, 1 ]);
  };
  function d3_scale_threshold(domain, range) {
    function scale(x) {
      if (x <= x) return range[d3.bisect(domain, x)];
    }
    scale.domain = function(_) {
      if (!arguments.length) return domain;
      domain = _;
      return scale;
    };
    scale.range = function(_) {
      if (!arguments.length) return range;
      range = _;
      return scale;
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      return [ domain[y - 1], domain[y] ];
    };
    scale.copy = function() {
      return d3_scale_threshold(domain, range);
    };
    return scale;
  }
  d3.scale.identity = function() {
    return d3_scale_identity([ 0, 1 ]);
  };
  function d3_scale_identity(domain) {
    function identity(x) {
      return +x;
    }
    identity.invert = identity;
    identity.domain = identity.range = function(x) {
      if (!arguments.length) return domain;
      domain = x.map(identity);
      return identity;
    };
    identity.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    identity.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    identity.copy = function() {
      return d3_scale_identity(domain);
    };
    return identity;
  }
  d3.svg = {};
  d3.svg.arc = function() {
    var innerRadius = d3_svg_arcInnerRadius, outerRadius = d3_svg_arcOuterRadius, startAngle = d3_svg_arcStartAngle, endAngle = d3_svg_arcEndAngle;
    function arc() {
      var r0 = innerRadius.apply(this, arguments), r1 = outerRadius.apply(this, arguments), a0 = startAngle.apply(this, arguments) + d3_svg_arcOffset, a1 = endAngle.apply(this, arguments) + d3_svg_arcOffset, da = (a1 < a0 && (da = a0, 
      a0 = a1, a1 = da), a1 - a0), df = da < π ? "0" : "1", c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      return da >= d3_svg_arcMax ? r0 ? "M0," + r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + -r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + r1 + "M0," + r0 + "A" + r0 + "," + r0 + " 0 1,0 0," + -r0 + "A" + r0 + "," + r0 + " 0 1,0 0," + r0 + "Z" : "M0," + r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + -r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + r1 + "Z" : r0 ? "M" + r1 * c0 + "," + r1 * s0 + "A" + r1 + "," + r1 + " 0 " + df + ",1 " + r1 * c1 + "," + r1 * s1 + "L" + r0 * c1 + "," + r0 * s1 + "A" + r0 + "," + r0 + " 0 " + df + ",0 " + r0 * c0 + "," + r0 * s0 + "Z" : "M" + r1 * c0 + "," + r1 * s0 + "A" + r1 + "," + r1 + " 0 " + df + ",1 " + r1 * c1 + "," + r1 * s1 + "L0,0" + "Z";
    }
    arc.innerRadius = function(v) {
      if (!arguments.length) return innerRadius;
      innerRadius = d3_functor(v);
      return arc;
    };
    arc.outerRadius = function(v) {
      if (!arguments.length) return outerRadius;
      outerRadius = d3_functor(v);
      return arc;
    };
    arc.startAngle = function(v) {
      if (!arguments.length) return startAngle;
      startAngle = d3_functor(v);
      return arc;
    };
    arc.endAngle = function(v) {
      if (!arguments.length) return endAngle;
      endAngle = d3_functor(v);
      return arc;
    };
    arc.centroid = function() {
      var r = (innerRadius.apply(this, arguments) + outerRadius.apply(this, arguments)) / 2, a = (startAngle.apply(this, arguments) + endAngle.apply(this, arguments)) / 2 + d3_svg_arcOffset;
      return [ Math.cos(a) * r, Math.sin(a) * r ];
    };
    return arc;
  };
  var d3_svg_arcOffset = -halfπ, d3_svg_arcMax = τ - ε;
  function d3_svg_arcInnerRadius(d) {
    return d.innerRadius;
  }
  function d3_svg_arcOuterRadius(d) {
    return d.outerRadius;
  }
  function d3_svg_arcStartAngle(d) {
    return d.startAngle;
  }
  function d3_svg_arcEndAngle(d) {
    return d.endAngle;
  }
  function d3_svg_line(projection) {
    var x = d3_geom_pointX, y = d3_geom_pointY, defined = d3_true, interpolate = d3_svg_lineLinear, interpolateKey = interpolate.key, tension = .7;
    function line(data) {
      var segments = [], points = [], i = -1, n = data.length, d, fx = d3_functor(x), fy = d3_functor(y);
      function segment() {
        segments.push("M", interpolate(projection(points), tension));
      }
      while (++i < n) {
        if (defined.call(this, d = data[i], i)) {
          points.push([ +fx.call(this, d, i), +fy.call(this, d, i) ]);
        } else if (points.length) {
          segment();
          points = [];
        }
      }
      if (points.length) segment();
      return segments.length ? segments.join("") : null;
    }
    line.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      return line;
    };
    line.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return line;
    };
    line.defined = function(_) {
      if (!arguments.length) return defined;
      defined = _;
      return line;
    };
    line.interpolate = function(_) {
      if (!arguments.length) return interpolateKey;
      if (typeof _ === "function") interpolateKey = interpolate = _; else interpolateKey = (interpolate = d3_svg_lineInterpolators.get(_) || d3_svg_lineLinear).key;
      return line;
    };
    line.tension = function(_) {
      if (!arguments.length) return tension;
      tension = _;
      return line;
    };
    return line;
  }
  d3.svg.line = function() {
    return d3_svg_line(d3_identity);
  };
  var d3_svg_lineInterpolators = d3.map({
    linear: d3_svg_lineLinear,
    "linear-closed": d3_svg_lineLinearClosed,
    step: d3_svg_lineStep,
    "step-before": d3_svg_lineStepBefore,
    "step-after": d3_svg_lineStepAfter,
    basis: d3_svg_lineBasis,
    "basis-open": d3_svg_lineBasisOpen,
    "basis-closed": d3_svg_lineBasisClosed,
    bundle: d3_svg_lineBundle,
    cardinal: d3_svg_lineCardinal,
    "cardinal-open": d3_svg_lineCardinalOpen,
    "cardinal-closed": d3_svg_lineCardinalClosed,
    monotone: d3_svg_lineMonotone
  });
  d3_svg_lineInterpolators.forEach(function(key, value) {
    value.key = key;
    value.closed = /-closed$/.test(key);
  });
  function d3_svg_lineLinear(points) {
    return points.join("L");
  }
  function d3_svg_lineLinearClosed(points) {
    return d3_svg_lineLinear(points) + "Z";
  }
  function d3_svg_lineStep(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("H", (p[0] + (p = points[i])[0]) / 2, "V", p[1]);
    if (n > 1) path.push("H", p[0]);
    return path.join("");
  }
  function d3_svg_lineStepBefore(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("V", (p = points[i])[1], "H", p[0]);
    return path.join("");
  }
  function d3_svg_lineStepAfter(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("H", (p = points[i])[0], "V", p[1]);
    return path.join("");
  }
  function d3_svg_lineCardinalOpen(points, tension) {
    return points.length < 4 ? d3_svg_lineLinear(points) : points[1] + d3_svg_lineHermite(points.slice(1, points.length - 1), d3_svg_lineCardinalTangents(points, tension));
  }
  function d3_svg_lineCardinalClosed(points, tension) {
    return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite((points.push(points[0]), 
    points), d3_svg_lineCardinalTangents([ points[points.length - 2] ].concat(points, [ points[1] ]), tension));
  }
  function d3_svg_lineCardinal(points, tension) {
    return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite(points, d3_svg_lineCardinalTangents(points, tension));
  }
  function d3_svg_lineHermite(points, tangents) {
    if (tangents.length < 1 || points.length != tangents.length && points.length != tangents.length + 2) {
      return d3_svg_lineLinear(points);
    }
    var quad = points.length != tangents.length, path = "", p0 = points[0], p = points[1], t0 = tangents[0], t = t0, pi = 1;
    if (quad) {
      path += "Q" + (p[0] - t0[0] * 2 / 3) + "," + (p[1] - t0[1] * 2 / 3) + "," + p[0] + "," + p[1];
      p0 = points[1];
      pi = 2;
    }
    if (tangents.length > 1) {
      t = tangents[1];
      p = points[pi];
      pi++;
      path += "C" + (p0[0] + t0[0]) + "," + (p0[1] + t0[1]) + "," + (p[0] - t[0]) + "," + (p[1] - t[1]) + "," + p[0] + "," + p[1];
      for (var i = 2; i < tangents.length; i++, pi++) {
        p = points[pi];
        t = tangents[i];
        path += "S" + (p[0] - t[0]) + "," + (p[1] - t[1]) + "," + p[0] + "," + p[1];
      }
    }
    if (quad) {
      var lp = points[pi];
      path += "Q" + (p[0] + t[0] * 2 / 3) + "," + (p[1] + t[1] * 2 / 3) + "," + lp[0] + "," + lp[1];
    }
    return path;
  }
  function d3_svg_lineCardinalTangents(points, tension) {
    var tangents = [], a = (1 - tension) / 2, p0, p1 = points[0], p2 = points[1], i = 1, n = points.length;
    while (++i < n) {
      p0 = p1;
      p1 = p2;
      p2 = points[i];
      tangents.push([ a * (p2[0] - p0[0]), a * (p2[1] - p0[1]) ]);
    }
    return tangents;
  }
  function d3_svg_lineBasis(points) {
    if (points.length < 3) return d3_svg_lineLinear(points);
    var i = 1, n = points.length, pi = points[0], x0 = pi[0], y0 = pi[1], px = [ x0, x0, x0, (pi = points[1])[0] ], py = [ y0, y0, y0, pi[1] ], path = [ x0, ",", y0, "L", d3_svg_lineDot4(d3_svg_lineBasisBezier3, px), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, py) ];
    points.push(points[n - 1]);
    while (++i <= n) {
      pi = points[i];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    points.pop();
    path.push("L", pi);
    return path.join("");
  }
  function d3_svg_lineBasisOpen(points) {
    if (points.length < 4) return d3_svg_lineLinear(points);
    var path = [], i = -1, n = points.length, pi, px = [ 0 ], py = [ 0 ];
    while (++i < 3) {
      pi = points[i];
      px.push(pi[0]);
      py.push(pi[1]);
    }
    path.push(d3_svg_lineDot4(d3_svg_lineBasisBezier3, px) + "," + d3_svg_lineDot4(d3_svg_lineBasisBezier3, py));
    --i;
    while (++i < n) {
      pi = points[i];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    return path.join("");
  }
  function d3_svg_lineBasisClosed(points) {
    var path, i = -1, n = points.length, m = n + 4, pi, px = [], py = [];
    while (++i < 4) {
      pi = points[i % n];
      px.push(pi[0]);
      py.push(pi[1]);
    }
    path = [ d3_svg_lineDot4(d3_svg_lineBasisBezier3, px), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, py) ];
    --i;
    while (++i < m) {
      pi = points[i % n];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    return path.join("");
  }
  function d3_svg_lineBundle(points, tension) {
    var n = points.length - 1;
    if (n) {
      var x0 = points[0][0], y0 = points[0][1], dx = points[n][0] - x0, dy = points[n][1] - y0, i = -1, p, t;
      while (++i <= n) {
        p = points[i];
        t = i / n;
        p[0] = tension * p[0] + (1 - tension) * (x0 + t * dx);
        p[1] = tension * p[1] + (1 - tension) * (y0 + t * dy);
      }
    }
    return d3_svg_lineBasis(points);
  }
  function d3_svg_lineDot4(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }
  var d3_svg_lineBasisBezier1 = [ 0, 2 / 3, 1 / 3, 0 ], d3_svg_lineBasisBezier2 = [ 0, 1 / 3, 2 / 3, 0 ], d3_svg_lineBasisBezier3 = [ 0, 1 / 6, 2 / 3, 1 / 6 ];
  function d3_svg_lineBasisBezier(path, x, y) {
    path.push("C", d3_svg_lineDot4(d3_svg_lineBasisBezier1, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier1, y), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier2, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier2, y), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, y));
  }
  function d3_svg_lineSlope(p0, p1) {
    return (p1[1] - p0[1]) / (p1[0] - p0[0]);
  }
  function d3_svg_lineFiniteDifferences(points) {
    var i = 0, j = points.length - 1, m = [], p0 = points[0], p1 = points[1], d = m[0] = d3_svg_lineSlope(p0, p1);
    while (++i < j) {
      m[i] = (d + (d = d3_svg_lineSlope(p0 = p1, p1 = points[i + 1]))) / 2;
    }
    m[i] = d;
    return m;
  }
  function d3_svg_lineMonotoneTangents(points) {
    var tangents = [], d, a, b, s, m = d3_svg_lineFiniteDifferences(points), i = -1, j = points.length - 1;
    while (++i < j) {
      d = d3_svg_lineSlope(points[i], points[i + 1]);
      if (abs(d) < ε) {
        m[i] = m[i + 1] = 0;
      } else {
        a = m[i] / d;
        b = m[i + 1] / d;
        s = a * a + b * b;
        if (s > 9) {
          s = d * 3 / Math.sqrt(s);
          m[i] = s * a;
          m[i + 1] = s * b;
        }
      }
    }
    i = -1;
    while (++i <= j) {
      s = (points[Math.min(j, i + 1)][0] - points[Math.max(0, i - 1)][0]) / (6 * (1 + m[i] * m[i]));
      tangents.push([ s || 0, m[i] * s || 0 ]);
    }
    return tangents;
  }
  function d3_svg_lineMonotone(points) {
    return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite(points, d3_svg_lineMonotoneTangents(points));
  }
  d3.svg.line.radial = function() {
    var line = d3_svg_line(d3_svg_lineRadial);
    line.radius = line.x, delete line.x;
    line.angle = line.y, delete line.y;
    return line;
  };
  function d3_svg_lineRadial(points) {
    var point, i = -1, n = points.length, r, a;
    while (++i < n) {
      point = points[i];
      r = point[0];
      a = point[1] + d3_svg_arcOffset;
      point[0] = r * Math.cos(a);
      point[1] = r * Math.sin(a);
    }
    return points;
  }
  function d3_svg_area(projection) {
    var x0 = d3_geom_pointX, x1 = d3_geom_pointX, y0 = 0, y1 = d3_geom_pointY, defined = d3_true, interpolate = d3_svg_lineLinear, interpolateKey = interpolate.key, interpolateReverse = interpolate, L = "L", tension = .7;
    function area(data) {
      var segments = [], points0 = [], points1 = [], i = -1, n = data.length, d, fx0 = d3_functor(x0), fy0 = d3_functor(y0), fx1 = x0 === x1 ? function() {
        return x;
      } : d3_functor(x1), fy1 = y0 === y1 ? function() {
        return y;
      } : d3_functor(y1), x, y;
      function segment() {
        segments.push("M", interpolate(projection(points1), tension), L, interpolateReverse(projection(points0.reverse()), tension), "Z");
      }
      while (++i < n) {
        if (defined.call(this, d = data[i], i)) {
          points0.push([ x = +fx0.call(this, d, i), y = +fy0.call(this, d, i) ]);
          points1.push([ +fx1.call(this, d, i), +fy1.call(this, d, i) ]);
        } else if (points0.length) {
          segment();
          points0 = [];
          points1 = [];
        }
      }
      if (points0.length) segment();
      return segments.length ? segments.join("") : null;
    }
    area.x = function(_) {
      if (!arguments.length) return x1;
      x0 = x1 = _;
      return area;
    };
    area.x0 = function(_) {
      if (!arguments.length) return x0;
      x0 = _;
      return area;
    };
    area.x1 = function(_) {
      if (!arguments.length) return x1;
      x1 = _;
      return area;
    };
    area.y = function(_) {
      if (!arguments.length) return y1;
      y0 = y1 = _;
      return area;
    };
    area.y0 = function(_) {
      if (!arguments.length) return y0;
      y0 = _;
      return area;
    };
    area.y1 = function(_) {
      if (!arguments.length) return y1;
      y1 = _;
      return area;
    };
    area.defined = function(_) {
      if (!arguments.length) return defined;
      defined = _;
      return area;
    };
    area.interpolate = function(_) {
      if (!arguments.length) return interpolateKey;
      if (typeof _ === "function") interpolateKey = interpolate = _; else interpolateKey = (interpolate = d3_svg_lineInterpolators.get(_) || d3_svg_lineLinear).key;
      interpolateReverse = interpolate.reverse || interpolate;
      L = interpolate.closed ? "M" : "L";
      return area;
    };
    area.tension = function(_) {
      if (!arguments.length) return tension;
      tension = _;
      return area;
    };
    return area;
  }
  d3_svg_lineStepBefore.reverse = d3_svg_lineStepAfter;
  d3_svg_lineStepAfter.reverse = d3_svg_lineStepBefore;
  d3.svg.area = function() {
    return d3_svg_area(d3_identity);
  };
  d3.svg.area.radial = function() {
    var area = d3_svg_area(d3_svg_lineRadial);
    area.radius = area.x, delete area.x;
    area.innerRadius = area.x0, delete area.x0;
    area.outerRadius = area.x1, delete area.x1;
    area.angle = area.y, delete area.y;
    area.startAngle = area.y0, delete area.y0;
    area.endAngle = area.y1, delete area.y1;
    return area;
  };
  d3.svg.chord = function() {
    var source = d3_source, target = d3_target, radius = d3_svg_chordRadius, startAngle = d3_svg_arcStartAngle, endAngle = d3_svg_arcEndAngle;
    function chord(d, i) {
      var s = subgroup(this, source, d, i), t = subgroup(this, target, d, i);
      return "M" + s.p0 + arc(s.r, s.p1, s.a1 - s.a0) + (equals(s, t) ? curve(s.r, s.p1, s.r, s.p0) : curve(s.r, s.p1, t.r, t.p0) + arc(t.r, t.p1, t.a1 - t.a0) + curve(t.r, t.p1, s.r, s.p0)) + "Z";
    }
    function subgroup(self, f, d, i) {
      var subgroup = f.call(self, d, i), r = radius.call(self, subgroup, i), a0 = startAngle.call(self, subgroup, i) + d3_svg_arcOffset, a1 = endAngle.call(self, subgroup, i) + d3_svg_arcOffset;
      return {
        r: r,
        a0: a0,
        a1: a1,
        p0: [ r * Math.cos(a0), r * Math.sin(a0) ],
        p1: [ r * Math.cos(a1), r * Math.sin(a1) ]
      };
    }
    function equals(a, b) {
      return a.a0 == b.a0 && a.a1 == b.a1;
    }
    function arc(r, p, a) {
      return "A" + r + "," + r + " 0 " + +(a > π) + ",1 " + p;
    }
    function curve(r0, p0, r1, p1) {
      return "Q 0,0 " + p1;
    }
    chord.radius = function(v) {
      if (!arguments.length) return radius;
      radius = d3_functor(v);
      return chord;
    };
    chord.source = function(v) {
      if (!arguments.length) return source;
      source = d3_functor(v);
      return chord;
    };
    chord.target = function(v) {
      if (!arguments.length) return target;
      target = d3_functor(v);
      return chord;
    };
    chord.startAngle = function(v) {
      if (!arguments.length) return startAngle;
      startAngle = d3_functor(v);
      return chord;
    };
    chord.endAngle = function(v) {
      if (!arguments.length) return endAngle;
      endAngle = d3_functor(v);
      return chord;
    };
    return chord;
  };
  function d3_svg_chordRadius(d) {
    return d.radius;
  }
  d3.svg.diagonal = function() {
    var source = d3_source, target = d3_target, projection = d3_svg_diagonalProjection;
    function diagonal(d, i) {
      var p0 = source.call(this, d, i), p3 = target.call(this, d, i), m = (p0.y + p3.y) / 2, p = [ p0, {
        x: p0.x,
        y: m
      }, {
        x: p3.x,
        y: m
      }, p3 ];
      p = p.map(projection);
      return "M" + p[0] + "C" + p[1] + " " + p[2] + " " + p[3];
    }
    diagonal.source = function(x) {
      if (!arguments.length) return source;
      source = d3_functor(x);
      return diagonal;
    };
    diagonal.target = function(x) {
      if (!arguments.length) return target;
      target = d3_functor(x);
      return diagonal;
    };
    diagonal.projection = function(x) {
      if (!arguments.length) return projection;
      projection = x;
      return diagonal;
    };
    return diagonal;
  };
  function d3_svg_diagonalProjection(d) {
    return [ d.x, d.y ];
  }
  d3.svg.diagonal.radial = function() {
    var diagonal = d3.svg.diagonal(), projection = d3_svg_diagonalProjection, projection_ = diagonal.projection;
    diagonal.projection = function(x) {
      return arguments.length ? projection_(d3_svg_diagonalRadialProjection(projection = x)) : projection;
    };
    return diagonal;
  };
  function d3_svg_diagonalRadialProjection(projection) {
    return function() {
      var d = projection.apply(this, arguments), r = d[0], a = d[1] + d3_svg_arcOffset;
      return [ r * Math.cos(a), r * Math.sin(a) ];
    };
  }
  d3.svg.symbol = function() {
    var type = d3_svg_symbolType, size = d3_svg_symbolSize;
    function symbol(d, i) {
      return (d3_svg_symbols.get(type.call(this, d, i)) || d3_svg_symbolCircle)(size.call(this, d, i));
    }
    symbol.type = function(x) {
      if (!arguments.length) return type;
      type = d3_functor(x);
      return symbol;
    };
    symbol.size = function(x) {
      if (!arguments.length) return size;
      size = d3_functor(x);
      return symbol;
    };
    return symbol;
  };
  function d3_svg_symbolSize() {
    return 64;
  }
  function d3_svg_symbolType() {
    return "circle";
  }
  function d3_svg_symbolCircle(size) {
    var r = Math.sqrt(size / π);
    return "M0," + r + "A" + r + "," + r + " 0 1,1 0," + -r + "A" + r + "," + r + " 0 1,1 0," + r + "Z";
  }
  var d3_svg_symbols = d3.map({
    circle: d3_svg_symbolCircle,
    cross: function(size) {
      var r = Math.sqrt(size / 5) / 2;
      return "M" + -3 * r + "," + -r + "H" + -r + "V" + -3 * r + "H" + r + "V" + -r + "H" + 3 * r + "V" + r + "H" + r + "V" + 3 * r + "H" + -r + "V" + r + "H" + -3 * r + "Z";
    },
    diamond: function(size) {
      var ry = Math.sqrt(size / (2 * d3_svg_symbolTan30)), rx = ry * d3_svg_symbolTan30;
      return "M0," + -ry + "L" + rx + ",0" + " 0," + ry + " " + -rx + ",0" + "Z";
    },
    square: function(size) {
      var r = Math.sqrt(size) / 2;
      return "M" + -r + "," + -r + "L" + r + "," + -r + " " + r + "," + r + " " + -r + "," + r + "Z";
    },
    "triangle-down": function(size) {
      var rx = Math.sqrt(size / d3_svg_symbolSqrt3), ry = rx * d3_svg_symbolSqrt3 / 2;
      return "M0," + ry + "L" + rx + "," + -ry + " " + -rx + "," + -ry + "Z";
    },
    "triangle-up": function(size) {
      var rx = Math.sqrt(size / d3_svg_symbolSqrt3), ry = rx * d3_svg_symbolSqrt3 / 2;
      return "M0," + -ry + "L" + rx + "," + ry + " " + -rx + "," + ry + "Z";
    }
  });
  d3.svg.symbolTypes = d3_svg_symbols.keys();
  var d3_svg_symbolSqrt3 = Math.sqrt(3), d3_svg_symbolTan30 = Math.tan(30 * d3_radians);
  function d3_transition(groups, id) {
    d3_subclass(groups, d3_transitionPrototype);
    groups.id = id;
    return groups;
  }
  var d3_transitionPrototype = [], d3_transitionId = 0, d3_transitionInheritId, d3_transitionInherit;
  d3_transitionPrototype.call = d3_selectionPrototype.call;
  d3_transitionPrototype.empty = d3_selectionPrototype.empty;
  d3_transitionPrototype.node = d3_selectionPrototype.node;
  d3_transitionPrototype.size = d3_selectionPrototype.size;
  d3.transition = function(selection) {
    return arguments.length ? d3_transitionInheritId ? selection.transition() : selection : d3_selectionRoot.transition();
  };
  d3.transition.prototype = d3_transitionPrototype;
  d3_transitionPrototype.select = function(selector) {
    var id = this.id, subgroups = [], subgroup, subnode, node;
    selector = d3_selection_selector(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if ((node = group[i]) && (subnode = selector.call(node, node.__data__, i, j))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          d3_transitionNode(subnode, i, id, node.__transition__[id]);
          subgroup.push(subnode);
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_transition(subgroups, id);
  };
  d3_transitionPrototype.selectAll = function(selector) {
    var id = this.id, subgroups = [], subgroup, subnodes, node, subnode, transition;
    selector = d3_selection_selectorAll(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          transition = node.__transition__[id];
          subnodes = selector.call(node, node.__data__, i, j);
          subgroups.push(subgroup = []);
          for (var k = -1, o = subnodes.length; ++k < o; ) {
            if (subnode = subnodes[k]) d3_transitionNode(subnode, k, id, transition);
            subgroup.push(subnode);
          }
        }
      }
    }
    return d3_transition(subgroups, id);
  };
  d3_transitionPrototype.filter = function(filter) {
    var subgroups = [], subgroup, group, node;
    if (typeof filter !== "function") filter = d3_selection_filter(filter);
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        if ((node = group[i]) && filter.call(node, node.__data__, i, j)) {
          subgroup.push(node);
        }
      }
    }
    return d3_transition(subgroups, this.id);
  };
  d3_transitionPrototype.tween = function(name, tween) {
    var id = this.id;
    if (arguments.length < 2) return this.node().__transition__[id].tween.get(name);
    return d3_selection_each(this, tween == null ? function(node) {
      node.__transition__[id].tween.remove(name);
    } : function(node) {
      node.__transition__[id].tween.set(name, tween);
    });
  };
  function d3_transition_tween(groups, name, value, tween) {
    var id = groups.id;
    return d3_selection_each(groups, typeof value === "function" ? function(node, i, j) {
      node.__transition__[id].tween.set(name, tween(value.call(node, node.__data__, i, j)));
    } : (value = tween(value), function(node) {
      node.__transition__[id].tween.set(name, value);
    }));
  }
  d3_transitionPrototype.attr = function(nameNS, value) {
    if (arguments.length < 2) {
      for (value in nameNS) this.attr(value, nameNS[value]);
      return this;
    }
    var interpolate = nameNS == "transform" ? d3_interpolateTransform : d3_interpolate, name = d3.ns.qualify(nameNS);
    function attrNull() {
      this.removeAttribute(name);
    }
    function attrNullNS() {
      this.removeAttributeNS(name.space, name.local);
    }
    function attrTween(b) {
      return b == null ? attrNull : (b += "", function() {
        var a = this.getAttribute(name), i;
        return a !== b && (i = interpolate(a, b), function(t) {
          this.setAttribute(name, i(t));
        });
      });
    }
    function attrTweenNS(b) {
      return b == null ? attrNullNS : (b += "", function() {
        var a = this.getAttributeNS(name.space, name.local), i;
        return a !== b && (i = interpolate(a, b), function(t) {
          this.setAttributeNS(name.space, name.local, i(t));
        });
      });
    }
    return d3_transition_tween(this, "attr." + nameNS, value, name.local ? attrTweenNS : attrTween);
  };
  d3_transitionPrototype.attrTween = function(nameNS, tween) {
    var name = d3.ns.qualify(nameNS);
    function attrTween(d, i) {
      var f = tween.call(this, d, i, this.getAttribute(name));
      return f && function(t) {
        this.setAttribute(name, f(t));
      };
    }
    function attrTweenNS(d, i) {
      var f = tween.call(this, d, i, this.getAttributeNS(name.space, name.local));
      return f && function(t) {
        this.setAttributeNS(name.space, name.local, f(t));
      };
    }
    return this.tween("attr." + nameNS, name.local ? attrTweenNS : attrTween);
  };
  d3_transitionPrototype.style = function(name, value, priority) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof name !== "string") {
        if (n < 2) value = "";
        for (priority in name) this.style(priority, name[priority], value);
        return this;
      }
      priority = "";
    }
    function styleNull() {
      this.style.removeProperty(name);
    }
    function styleString(b) {
      return b == null ? styleNull : (b += "", function() {
        var a = d3_window.getComputedStyle(this, null).getPropertyValue(name), i;
        return a !== b && (i = d3_interpolate(a, b), function(t) {
          this.style.setProperty(name, i(t), priority);
        });
      });
    }
    return d3_transition_tween(this, "style." + name, value, styleString);
  };
  d3_transitionPrototype.styleTween = function(name, tween, priority) {
    if (arguments.length < 3) priority = "";
    function styleTween(d, i) {
      var f = tween.call(this, d, i, d3_window.getComputedStyle(this, null).getPropertyValue(name));
      return f && function(t) {
        this.style.setProperty(name, f(t), priority);
      };
    }
    return this.tween("style." + name, styleTween);
  };
  d3_transitionPrototype.text = function(value) {
    return d3_transition_tween(this, "text", value, d3_transition_text);
  };
  function d3_transition_text(b) {
    if (b == null) b = "";
    return function() {
      this.textContent = b;
    };
  }
  d3_transitionPrototype.remove = function() {
    return this.each("end.transition", function() {
      var p;
      if (this.__transition__.count < 2 && (p = this.parentNode)) p.removeChild(this);
    });
  };
  d3_transitionPrototype.ease = function(value) {
    var id = this.id;
    if (arguments.length < 1) return this.node().__transition__[id].ease;
    if (typeof value !== "function") value = d3.ease.apply(d3, arguments);
    return d3_selection_each(this, function(node) {
      node.__transition__[id].ease = value;
    });
  };
  d3_transitionPrototype.delay = function(value) {
    var id = this.id;
    return d3_selection_each(this, typeof value === "function" ? function(node, i, j) {
      node.__transition__[id].delay = +value.call(node, node.__data__, i, j);
    } : (value = +value, function(node) {
      node.__transition__[id].delay = value;
    }));
  };
  d3_transitionPrototype.duration = function(value) {
    var id = this.id;
    return d3_selection_each(this, typeof value === "function" ? function(node, i, j) {
      node.__transition__[id].duration = Math.max(1, value.call(node, node.__data__, i, j));
    } : (value = Math.max(1, value), function(node) {
      node.__transition__[id].duration = value;
    }));
  };
  d3_transitionPrototype.each = function(type, listener) {
    var id = this.id;
    if (arguments.length < 2) {
      var inherit = d3_transitionInherit, inheritId = d3_transitionInheritId;
      d3_transitionInheritId = id;
      d3_selection_each(this, function(node, i, j) {
        d3_transitionInherit = node.__transition__[id];
        type.call(node, node.__data__, i, j);
      });
      d3_transitionInherit = inherit;
      d3_transitionInheritId = inheritId;
    } else {
      d3_selection_each(this, function(node) {
        var transition = node.__transition__[id];
        (transition.event || (transition.event = d3.dispatch("start", "end"))).on(type, listener);
      });
    }
    return this;
  };
  d3_transitionPrototype.transition = function() {
    var id0 = this.id, id1 = ++d3_transitionId, subgroups = [], subgroup, group, node, transition;
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        if (node = group[i]) {
          transition = Object.create(node.__transition__[id0]);
          transition.delay += transition.duration;
          d3_transitionNode(node, i, id1, transition);
        }
        subgroup.push(node);
      }
    }
    return d3_transition(subgroups, id1);
  };
  function d3_transitionNode(node, i, id, inherit) {
    var lock = node.__transition__ || (node.__transition__ = {
      active: 0,
      count: 0
    }), transition = lock[id];
    if (!transition) {
      var time = inherit.time;
      transition = lock[id] = {
        tween: new d3_Map(),
        time: time,
        ease: inherit.ease,
        delay: inherit.delay,
        duration: inherit.duration
      };
      ++lock.count;
      d3.timer(function(elapsed) {
        var d = node.__data__, ease = transition.ease, delay = transition.delay, duration = transition.duration, timer = d3_timer_active, tweened = [];
        timer.t = delay + time;
        if (delay <= elapsed) return start(elapsed - delay);
        timer.c = start;
        function start(elapsed) {
          if (lock.active > id) return stop();
          lock.active = id;
          transition.event && transition.event.start.call(node, d, i);
          transition.tween.forEach(function(key, value) {
            if (value = value.call(node, d, i)) {
              tweened.push(value);
            }
          });
          d3.timer(function() {
            timer.c = tick(elapsed || 1) ? d3_true : tick;
            return 1;
          }, 0, time);
        }
        function tick(elapsed) {
          if (lock.active !== id) return stop();
          var t = elapsed / duration, e = ease(t), n = tweened.length;
          while (n > 0) {
            tweened[--n].call(node, e);
          }
          if (t >= 1) {
            transition.event && transition.event.end.call(node, d, i);
            return stop();
          }
        }
        function stop() {
          if (--lock.count) delete lock[id]; else delete node.__transition__;
          return 1;
        }
      }, 0, time);
    }
  }
  d3.svg.axis = function() {
    var scale = d3.scale.linear(), orient = d3_svg_axisDefaultOrient, innerTickSize = 6, outerTickSize = 6, tickPadding = 3, tickArguments_ = [ 10 ], tickValues = null, tickFormat_;
    function axis(g) {
      g.each(function() {
        var g = d3.select(this);
        var scale0 = this.__chart__ || scale, scale1 = this.__chart__ = scale.copy();
        var ticks = tickValues == null ? scale1.ticks ? scale1.ticks.apply(scale1, tickArguments_) : scale1.domain() : tickValues, tickFormat = tickFormat_ == null ? scale1.tickFormat ? scale1.tickFormat.apply(scale1, tickArguments_) : d3_identity : tickFormat_, tick = g.selectAll(".tick").data(ticks, scale1), tickEnter = tick.enter().insert("g", ".domain").attr("class", "tick").style("opacity", ε), tickExit = d3.transition(tick.exit()).style("opacity", ε).remove(), tickUpdate = d3.transition(tick).style("opacity", 1), tickTransform;
        var range = d3_scaleRange(scale1), path = g.selectAll(".domain").data([ 0 ]), pathUpdate = (path.enter().append("path").attr("class", "domain"), 
        d3.transition(path));
        tickEnter.append("line");
        tickEnter.append("text");
        var lineEnter = tickEnter.select("line"), lineUpdate = tickUpdate.select("line"), text = tick.select("text").text(tickFormat), textEnter = tickEnter.select("text"), textUpdate = tickUpdate.select("text");
        switch (orient) {
         case "bottom":
          {
            tickTransform = d3_svg_axisX;
            lineEnter.attr("y2", innerTickSize);
            textEnter.attr("y", Math.max(innerTickSize, 0) + tickPadding);
            lineUpdate.attr("x2", 0).attr("y2", innerTickSize);
            textUpdate.attr("x", 0).attr("y", Math.max(innerTickSize, 0) + tickPadding);
            text.attr("dy", ".71em").style("text-anchor", "middle");
            pathUpdate.attr("d", "M" + range[0] + "," + outerTickSize + "V0H" + range[1] + "V" + outerTickSize);
            break;
          }

         case "top":
          {
            tickTransform = d3_svg_axisX;
            lineEnter.attr("y2", -innerTickSize);
            textEnter.attr("y", -(Math.max(innerTickSize, 0) + tickPadding));
            lineUpdate.attr("x2", 0).attr("y2", -innerTickSize);
            textUpdate.attr("x", 0).attr("y", -(Math.max(innerTickSize, 0) + tickPadding));
            text.attr("dy", "0em").style("text-anchor", "middle");
            pathUpdate.attr("d", "M" + range[0] + "," + -outerTickSize + "V0H" + range[1] + "V" + -outerTickSize);
            break;
          }

         case "left":
          {
            tickTransform = d3_svg_axisY;
            lineEnter.attr("x2", -innerTickSize);
            textEnter.attr("x", -(Math.max(innerTickSize, 0) + tickPadding));
            lineUpdate.attr("x2", -innerTickSize).attr("y2", 0);
            textUpdate.attr("x", -(Math.max(innerTickSize, 0) + tickPadding)).attr("y", 0);
            text.attr("dy", ".32em").style("text-anchor", "end");
            pathUpdate.attr("d", "M" + -outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + -outerTickSize);
            break;
          }

         case "right":
          {
            tickTransform = d3_svg_axisY;
            lineEnter.attr("x2", innerTickSize);
            textEnter.attr("x", Math.max(innerTickSize, 0) + tickPadding);
            lineUpdate.attr("x2", innerTickSize).attr("y2", 0);
            textUpdate.attr("x", Math.max(innerTickSize, 0) + tickPadding).attr("y", 0);
            text.attr("dy", ".32em").style("text-anchor", "start");
            pathUpdate.attr("d", "M" + outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + outerTickSize);
            break;
          }
        }
        if (scale1.rangeBand) {
          var x = scale1, dx = x.rangeBand() / 2;
          scale0 = scale1 = function(d) {
            return x(d) + dx;
          };
        } else if (scale0.rangeBand) {
          scale0 = scale1;
        } else {
          tickExit.call(tickTransform, scale1);
        }
        tickEnter.call(tickTransform, scale0);
        tickUpdate.call(tickTransform, scale1);
      });
    }
    axis.scale = function(x) {
      if (!arguments.length) return scale;
      scale = x;
      return axis;
    };
    axis.orient = function(x) {
      if (!arguments.length) return orient;
      orient = x in d3_svg_axisOrients ? x + "" : d3_svg_axisDefaultOrient;
      return axis;
    };
    axis.ticks = function() {
      if (!arguments.length) return tickArguments_;
      tickArguments_ = arguments;
      return axis;
    };
    axis.tickValues = function(x) {
      if (!arguments.length) return tickValues;
      tickValues = x;
      return axis;
    };
    axis.tickFormat = function(x) {
      if (!arguments.length) return tickFormat_;
      tickFormat_ = x;
      return axis;
    };
    axis.tickSize = function(x) {
      var n = arguments.length;
      if (!n) return innerTickSize;
      innerTickSize = +x;
      outerTickSize = +arguments[n - 1];
      return axis;
    };
    axis.innerTickSize = function(x) {
      if (!arguments.length) return innerTickSize;
      innerTickSize = +x;
      return axis;
    };
    axis.outerTickSize = function(x) {
      if (!arguments.length) return outerTickSize;
      outerTickSize = +x;
      return axis;
    };
    axis.tickPadding = function(x) {
      if (!arguments.length) return tickPadding;
      tickPadding = +x;
      return axis;
    };
    axis.tickSubdivide = function() {
      return arguments.length && axis;
    };
    return axis;
  };
  var d3_svg_axisDefaultOrient = "bottom", d3_svg_axisOrients = {
    top: 1,
    right: 1,
    bottom: 1,
    left: 1
  };
  function d3_svg_axisX(selection, x) {
    selection.attr("transform", function(d) {
      return "translate(" + x(d) + ",0)";
    });
  }
  function d3_svg_axisY(selection, y) {
    selection.attr("transform", function(d) {
      return "translate(0," + y(d) + ")";
    });
  }
  d3.svg.brush = function() {
    var event = d3_eventDispatch(brush, "brushstart", "brush", "brushend"), x = null, y = null, xExtent = [ 0, 0 ], yExtent = [ 0, 0 ], xExtentDomain, yExtentDomain, xClamp = true, yClamp = true, resizes = d3_svg_brushResizes[0];
    function brush(g) {
      g.each(function() {
        var g = d3.select(this).style("pointer-events", "all").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)").on("mousedown.brush", brushstart).on("touchstart.brush", brushstart);
        var background = g.selectAll(".background").data([ 0 ]);
        background.enter().append("rect").attr("class", "background").style("visibility", "hidden").style("cursor", "crosshair");
        g.selectAll(".extent").data([ 0 ]).enter().append("rect").attr("class", "extent").style("cursor", "move");
        var resize = g.selectAll(".resize").data(resizes, d3_identity);
        resize.exit().remove();
        resize.enter().append("g").attr("class", function(d) {
          return "resize " + d;
        }).style("cursor", function(d) {
          return d3_svg_brushCursor[d];
        }).append("rect").attr("x", function(d) {
          return /[ew]$/.test(d) ? -3 : null;
        }).attr("y", function(d) {
          return /^[ns]/.test(d) ? -3 : null;
        }).attr("width", 6).attr("height", 6).style("visibility", "hidden");
        resize.style("display", brush.empty() ? "none" : null);
        var gUpdate = d3.transition(g), backgroundUpdate = d3.transition(background), range;
        if (x) {
          range = d3_scaleRange(x);
          backgroundUpdate.attr("x", range[0]).attr("width", range[1] - range[0]);
          redrawX(gUpdate);
        }
        if (y) {
          range = d3_scaleRange(y);
          backgroundUpdate.attr("y", range[0]).attr("height", range[1] - range[0]);
          redrawY(gUpdate);
        }
        redraw(gUpdate);
      });
    }
    brush.event = function(g) {
      g.each(function() {
        var event_ = event.of(this, arguments), extent1 = {
          x: xExtent,
          y: yExtent,
          i: xExtentDomain,
          j: yExtentDomain
        }, extent0 = this.__chart__ || extent1;
        this.__chart__ = extent1;
        if (d3_transitionInheritId) {
          d3.select(this).transition().each("start.brush", function() {
            xExtentDomain = extent0.i;
            yExtentDomain = extent0.j;
            xExtent = extent0.x;
            yExtent = extent0.y;
            event_({
              type: "brushstart"
            });
          }).tween("brush:brush", function() {
            var xi = d3_interpolateArray(xExtent, extent1.x), yi = d3_interpolateArray(yExtent, extent1.y);
            xExtentDomain = yExtentDomain = null;
            return function(t) {
              xExtent = extent1.x = xi(t);
              yExtent = extent1.y = yi(t);
              event_({
                type: "brush",
                mode: "resize"
              });
            };
          }).each("end.brush", function() {
            xExtentDomain = extent1.i;
            yExtentDomain = extent1.j;
            event_({
              type: "brush",
              mode: "resize"
            });
            event_({
              type: "brushend"
            });
          });
        } else {
          event_({
            type: "brushstart"
          });
          event_({
            type: "brush",
            mode: "resize"
          });
          event_({
            type: "brushend"
          });
        }
      });
    };
    function redraw(g) {
      g.selectAll(".resize").attr("transform", function(d) {
        return "translate(" + xExtent[+/e$/.test(d)] + "," + yExtent[+/^s/.test(d)] + ")";
      });
    }
    function redrawX(g) {
      g.select(".extent").attr("x", xExtent[0]);
      g.selectAll(".extent,.n>rect,.s>rect").attr("width", xExtent[1] - xExtent[0]);
    }
    function redrawY(g) {
      g.select(".extent").attr("y", yExtent[0]);
      g.selectAll(".extent,.e>rect,.w>rect").attr("height", yExtent[1] - yExtent[0]);
    }
    function brushstart() {
      var target = this, eventTarget = d3.select(d3.event.target), event_ = event.of(target, arguments), g = d3.select(target), resizing = eventTarget.datum(), resizingX = !/^(n|s)$/.test(resizing) && x, resizingY = !/^(e|w)$/.test(resizing) && y, dragging = eventTarget.classed("extent"), dragRestore = d3_event_dragSuppress(), center, origin = d3.mouse(target), offset;
      var w = d3.select(d3_window).on("keydown.brush", keydown).on("keyup.brush", keyup);
      if (d3.event.changedTouches) {
        w.on("touchmove.brush", brushmove).on("touchend.brush", brushend);
      } else {
        w.on("mousemove.brush", brushmove).on("mouseup.brush", brushend);
      }
      g.interrupt().selectAll("*").interrupt();
      if (dragging) {
        origin[0] = xExtent[0] - origin[0];
        origin[1] = yExtent[0] - origin[1];
      } else if (resizing) {
        var ex = +/w$/.test(resizing), ey = +/^n/.test(resizing);
        offset = [ xExtent[1 - ex] - origin[0], yExtent[1 - ey] - origin[1] ];
        origin[0] = xExtent[ex];
        origin[1] = yExtent[ey];
      } else if (d3.event.altKey) center = origin.slice();
      g.style("pointer-events", "none").selectAll(".resize").style("display", null);
      d3.select("body").style("cursor", eventTarget.style("cursor"));
      event_({
        type: "brushstart"
      });
      brushmove();
      function keydown() {
        if (d3.event.keyCode == 32) {
          if (!dragging) {
            center = null;
            origin[0] -= xExtent[1];
            origin[1] -= yExtent[1];
            dragging = 2;
          }
          d3_eventPreventDefault();
        }
      }
      function keyup() {
        if (d3.event.keyCode == 32 && dragging == 2) {
          origin[0] += xExtent[1];
          origin[1] += yExtent[1];
          dragging = 0;
          d3_eventPreventDefault();
        }
      }
      function brushmove() {
        var point = d3.mouse(target), moved = false;
        if (offset) {
          point[0] += offset[0];
          point[1] += offset[1];
        }
        if (!dragging) {
          if (d3.event.altKey) {
            if (!center) center = [ (xExtent[0] + xExtent[1]) / 2, (yExtent[0] + yExtent[1]) / 2 ];
            origin[0] = xExtent[+(point[0] < center[0])];
            origin[1] = yExtent[+(point[1] < center[1])];
          } else center = null;
        }
        if (resizingX && move1(point, x, 0)) {
          redrawX(g);
          moved = true;
        }
        if (resizingY && move1(point, y, 1)) {
          redrawY(g);
          moved = true;
        }
        if (moved) {
          redraw(g);
          event_({
            type: "brush",
            mode: dragging ? "move" : "resize"
          });
        }
      }
      function move1(point, scale, i) {
        var range = d3_scaleRange(scale), r0 = range[0], r1 = range[1], position = origin[i], extent = i ? yExtent : xExtent, size = extent[1] - extent[0], min, max;
        if (dragging) {
          r0 -= position;
          r1 -= size + position;
        }
        min = (i ? yClamp : xClamp) ? Math.max(r0, Math.min(r1, point[i])) : point[i];
        if (dragging) {
          max = (min += position) + size;
        } else {
          if (center) position = Math.max(r0, Math.min(r1, 2 * center[i] - min));
          if (position < min) {
            max = min;
            min = position;
          } else {
            max = position;
          }
        }
        if (extent[0] != min || extent[1] != max) {
          if (i) yExtentDomain = null; else xExtentDomain = null;
          extent[0] = min;
          extent[1] = max;
          return true;
        }
      }
      function brushend() {
        brushmove();
        g.style("pointer-events", "all").selectAll(".resize").style("display", brush.empty() ? "none" : null);
        d3.select("body").style("cursor", null);
        w.on("mousemove.brush", null).on("mouseup.brush", null).on("touchmove.brush", null).on("touchend.brush", null).on("keydown.brush", null).on("keyup.brush", null);
        dragRestore();
        event_({
          type: "brushend"
        });
      }
    }
    brush.x = function(z) {
      if (!arguments.length) return x;
      x = z;
      resizes = d3_svg_brushResizes[!x << 1 | !y];
      return brush;
    };
    brush.y = function(z) {
      if (!arguments.length) return y;
      y = z;
      resizes = d3_svg_brushResizes[!x << 1 | !y];
      return brush;
    };
    brush.clamp = function(z) {
      if (!arguments.length) return x && y ? [ xClamp, yClamp ] : x ? xClamp : y ? yClamp : null;
      if (x && y) xClamp = !!z[0], yClamp = !!z[1]; else if (x) xClamp = !!z; else if (y) yClamp = !!z;
      return brush;
    };
    brush.extent = function(z) {
      var x0, x1, y0, y1, t;
      if (!arguments.length) {
        if (x) {
          if (xExtentDomain) {
            x0 = xExtentDomain[0], x1 = xExtentDomain[1];
          } else {
            x0 = xExtent[0], x1 = xExtent[1];
            if (x.invert) x0 = x.invert(x0), x1 = x.invert(x1);
            if (x1 < x0) t = x0, x0 = x1, x1 = t;
          }
        }
        if (y) {
          if (yExtentDomain) {
            y0 = yExtentDomain[0], y1 = yExtentDomain[1];
          } else {
            y0 = yExtent[0], y1 = yExtent[1];
            if (y.invert) y0 = y.invert(y0), y1 = y.invert(y1);
            if (y1 < y0) t = y0, y0 = y1, y1 = t;
          }
        }
        return x && y ? [ [ x0, y0 ], [ x1, y1 ] ] : x ? [ x0, x1 ] : y && [ y0, y1 ];
      }
      if (x) {
        x0 = z[0], x1 = z[1];
        if (y) x0 = x0[0], x1 = x1[0];
        xExtentDomain = [ x0, x1 ];
        if (x.invert) x0 = x(x0), x1 = x(x1);
        if (x1 < x0) t = x0, x0 = x1, x1 = t;
        if (x0 != xExtent[0] || x1 != xExtent[1]) xExtent = [ x0, x1 ];
      }
      if (y) {
        y0 = z[0], y1 = z[1];
        if (x) y0 = y0[1], y1 = y1[1];
        yExtentDomain = [ y0, y1 ];
        if (y.invert) y0 = y(y0), y1 = y(y1);
        if (y1 < y0) t = y0, y0 = y1, y1 = t;
        if (y0 != yExtent[0] || y1 != yExtent[1]) yExtent = [ y0, y1 ];
      }
      return brush;
    };
    brush.clear = function() {
      if (!brush.empty()) {
        xExtent = [ 0, 0 ], yExtent = [ 0, 0 ];
        xExtentDomain = yExtentDomain = null;
      }
      return brush;
    };
    brush.empty = function() {
      return !!x && xExtent[0] == xExtent[1] || !!y && yExtent[0] == yExtent[1];
    };
    return d3.rebind(brush, event, "on");
  };
  var d3_svg_brushCursor = {
    n: "ns-resize",
    e: "ew-resize",
    s: "ns-resize",
    w: "ew-resize",
    nw: "nwse-resize",
    ne: "nesw-resize",
    se: "nwse-resize",
    sw: "nesw-resize"
  };
  var d3_svg_brushResizes = [ [ "n", "e", "s", "w", "nw", "ne", "se", "sw" ], [ "e", "w" ], [ "n", "s" ], [] ];
  var d3_time_format = d3_time.format = d3_locale_enUS.timeFormat;
  var d3_time_formatUtc = d3_time_format.utc;
  var d3_time_formatIso = d3_time_formatUtc("%Y-%m-%dT%H:%M:%S.%LZ");
  d3_time_format.iso = Date.prototype.toISOString && +new Date("2000-01-01T00:00:00.000Z") ? d3_time_formatIsoNative : d3_time_formatIso;
  function d3_time_formatIsoNative(date) {
    return date.toISOString();
  }
  d3_time_formatIsoNative.parse = function(string) {
    var date = new Date(string);
    return isNaN(date) ? null : date;
  };
  d3_time_formatIsoNative.toString = d3_time_formatIso.toString;
  d3_time.second = d3_time_interval(function(date) {
    return new d3_date(Math.floor(date / 1e3) * 1e3);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 1e3);
  }, function(date) {
    return date.getSeconds();
  });
  d3_time.seconds = d3_time.second.range;
  d3_time.seconds.utc = d3_time.second.utc.range;
  d3_time.minute = d3_time_interval(function(date) {
    return new d3_date(Math.floor(date / 6e4) * 6e4);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 6e4);
  }, function(date) {
    return date.getMinutes();
  });
  d3_time.minutes = d3_time.minute.range;
  d3_time.minutes.utc = d3_time.minute.utc.range;
  d3_time.hour = d3_time_interval(function(date) {
    var timezone = date.getTimezoneOffset() / 60;
    return new d3_date((Math.floor(date / 36e5 - timezone) + timezone) * 36e5);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 36e5);
  }, function(date) {
    return date.getHours();
  });
  d3_time.hours = d3_time.hour.range;
  d3_time.hours.utc = d3_time.hour.utc.range;
  d3_time.month = d3_time_interval(function(date) {
    date = d3_time.day(date);
    date.setDate(1);
    return date;
  }, function(date, offset) {
    date.setMonth(date.getMonth() + offset);
  }, function(date) {
    return date.getMonth();
  });
  d3_time.months = d3_time.month.range;
  d3_time.months.utc = d3_time.month.utc.range;
  function d3_time_scale(linear, methods, format) {
    function scale(x) {
      return linear(x);
    }
    scale.invert = function(x) {
      return d3_time_scaleDate(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return linear.domain().map(d3_time_scaleDate);
      linear.domain(x);
      return scale;
    };
    function tickMethod(extent, count) {
      var span = extent[1] - extent[0], target = span / count, i = d3.bisect(d3_time_scaleSteps, target);
      return i == d3_time_scaleSteps.length ? [ methods.year, d3_scale_linearTickRange(extent.map(function(d) {
        return d / 31536e6;
      }), count)[2] ] : !i ? [ d3_time_scaleMilliseconds, d3_scale_linearTickRange(extent, count)[2] ] : methods[target / d3_time_scaleSteps[i - 1] < d3_time_scaleSteps[i] / target ? i - 1 : i];
    }
    scale.nice = function(interval, skip) {
      var domain = scale.domain(), extent = d3_scaleExtent(domain), method = interval == null ? tickMethod(extent, 10) : typeof interval === "number" && tickMethod(extent, interval);
      if (method) interval = method[0], skip = method[1];
      function skipped(date) {
        return !isNaN(date) && !interval.range(date, d3_time_scaleDate(+date + 1), skip).length;
      }
      return scale.domain(d3_scale_nice(domain, skip > 1 ? {
        floor: function(date) {
          while (skipped(date = interval.floor(date))) date = d3_time_scaleDate(date - 1);
          return date;
        },
        ceil: function(date) {
          while (skipped(date = interval.ceil(date))) date = d3_time_scaleDate(+date + 1);
          return date;
        }
      } : interval));
    };
    scale.ticks = function(interval, skip) {
      var extent = d3_scaleExtent(scale.domain()), method = interval == null ? tickMethod(extent, 10) : typeof interval === "number" ? tickMethod(extent, interval) : !interval.range && [ {
        range: interval
      }, skip ];
      if (method) interval = method[0], skip = method[1];
      return interval.range(extent[0], d3_time_scaleDate(+extent[1] + 1), skip < 1 ? 1 : skip);
    };
    scale.tickFormat = function() {
      return format;
    };
    scale.copy = function() {
      return d3_time_scale(linear.copy(), methods, format);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  function d3_time_scaleDate(t) {
    return new Date(t);
  }
  var d3_time_scaleSteps = [ 1e3, 5e3, 15e3, 3e4, 6e4, 3e5, 9e5, 18e5, 36e5, 108e5, 216e5, 432e5, 864e5, 1728e5, 6048e5, 2592e6, 7776e6, 31536e6 ];
  var d3_time_scaleLocalMethods = [ [ d3_time.second, 1 ], [ d3_time.second, 5 ], [ d3_time.second, 15 ], [ d3_time.second, 30 ], [ d3_time.minute, 1 ], [ d3_time.minute, 5 ], [ d3_time.minute, 15 ], [ d3_time.minute, 30 ], [ d3_time.hour, 1 ], [ d3_time.hour, 3 ], [ d3_time.hour, 6 ], [ d3_time.hour, 12 ], [ d3_time.day, 1 ], [ d3_time.day, 2 ], [ d3_time.week, 1 ], [ d3_time.month, 1 ], [ d3_time.month, 3 ], [ d3_time.year, 1 ] ];
  var d3_time_scaleLocalFormat = d3_time_format.multi([ [ ".%L", function(d) {
    return d.getMilliseconds();
  } ], [ ":%S", function(d) {
    return d.getSeconds();
  } ], [ "%I:%M", function(d) {
    return d.getMinutes();
  } ], [ "%I %p", function(d) {
    return d.getHours();
  } ], [ "%a %d", function(d) {
    return d.getDay() && d.getDate() != 1;
  } ], [ "%b %d", function(d) {
    return d.getDate() != 1;
  } ], [ "%B", function(d) {
    return d.getMonth();
  } ], [ "%Y", d3_true ] ]);
  var d3_time_scaleMilliseconds = {
    range: function(start, stop, step) {
      return d3.range(+start, +stop, step).map(d3_time_scaleDate);
    },
    floor: d3_identity,
    ceil: d3_identity
  };
  d3_time_scaleLocalMethods.year = d3_time.year;
  d3_time.scale = function() {
    return d3_time_scale(d3.scale.linear(), d3_time_scaleLocalMethods, d3_time_scaleLocalFormat);
  };
  var d3_time_scaleUtcMethods = d3_time_scaleLocalMethods.map(function(m) {
    return [ m[0].utc, m[1] ];
  });
  var d3_time_scaleUtcFormat = d3_time_formatUtc.multi([ [ ".%L", function(d) {
    return d.getUTCMilliseconds();
  } ], [ ":%S", function(d) {
    return d.getUTCSeconds();
  } ], [ "%I:%M", function(d) {
    return d.getUTCMinutes();
  } ], [ "%I %p", function(d) {
    return d.getUTCHours();
  } ], [ "%a %d", function(d) {
    return d.getUTCDay() && d.getUTCDate() != 1;
  } ], [ "%b %d", function(d) {
    return d.getUTCDate() != 1;
  } ], [ "%B", function(d) {
    return d.getUTCMonth();
  } ], [ "%Y", d3_true ] ]);
  d3_time_scaleUtcMethods.year = d3_time.year.utc;
  d3_time.scale.utc = function() {
    return d3_time_scale(d3.scale.linear(), d3_time_scaleUtcMethods, d3_time_scaleUtcFormat);
  };
  d3.text = d3_xhrType(function(request) {
    return request.responseText;
  });
  d3.json = function(url, callback) {
    return d3_xhr(url, "application/json", d3_json, callback);
  };
  function d3_json(request) {
    return JSON.parse(request.responseText);
  }
  d3.html = function(url, callback) {
    return d3_xhr(url, "text/html", d3_html, callback);
  };
  function d3_html(request) {
    var range = d3_document.createRange();
    range.selectNode(d3_document.body);
    return range.createContextualFragment(request.responseText);
  }
  d3.xml = d3_xhrType(function(request) {
    return request.responseXML;
  });
  if (typeof define === "function" && define.amd) {
    define(d3);
  } else if (typeof module === "object" && module.exports) {
    module.exports = d3;
  } else {
    this.d3 = d3;
  }
}();
},{}],11:[function(require,module,exports){
/**
 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
 *
 * @version 1.0.0
 * @codingstandard ftlabs-jsv2
 * @copyright The Financial Times Limited [All Rights Reserved]
 * @license MIT License (see LICENSE.txt)
 */

/*jslint browser:true, node:true*/
/*global define, Event, Node*/


/**
 * Instantiate fast-clicking listeners on the specificed layer.
 *
 * @constructor
 * @param {Element} layer The layer to listen on
 */
function FastClick(layer) {
	'use strict';
	var oldOnClick;


	/**
	 * Whether a click is currently being tracked.
	 *
	 * @type boolean
	 */
	this.trackingClick = false;


	/**
	 * Timestamp for when when click tracking started.
	 *
	 * @type number
	 */
	this.trackingClickStart = 0;


	/**
	 * The element being tracked for a click.
	 *
	 * @type EventTarget
	 */
	this.targetElement = null;


	/**
	 * X-coordinate of touch start event.
	 *
	 * @type number
	 */
	this.touchStartX = 0;


	/**
	 * Y-coordinate of touch start event.
	 *
	 * @type number
	 */
	this.touchStartY = 0;


	/**
	 * ID of the last touch, retrieved from Touch.identifier.
	 *
	 * @type number
	 */
	this.lastTouchIdentifier = 0;


	/**
	 * Touchmove boundary, beyond which a click will be cancelled.
	 *
	 * @type number
	 */
	this.touchBoundary = 10;


	/**
	 * The FastClick layer.
	 *
	 * @type Element
	 */
	this.layer = layer;

	if (FastClick.notNeeded(layer)) {
		return;
	}

	// Some old versions of Android don't have Function.prototype.bind
	function bind(method, context) {
		return function() { return method.apply(context, arguments); };
	}

	// Set up event handlers as required
	if (deviceIsAndroid) {
		layer.addEventListener('mouseover', bind(this.onMouse, this), true);
		layer.addEventListener('mousedown', bind(this.onMouse, this), true);
		layer.addEventListener('mouseup', bind(this.onMouse, this), true);
	}

	layer.addEventListener('click', bind(this.onClick, this), true);
	layer.addEventListener('touchstart', bind(this.onTouchStart, this), false);
	layer.addEventListener('touchmove', bind(this.onTouchMove, this), false);
	layer.addEventListener('touchend', bind(this.onTouchEnd, this), false);
	layer.addEventListener('touchcancel', bind(this.onTouchCancel, this), false);

	// Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
	// which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
	// layer when they are cancelled.
	if (!Event.prototype.stopImmediatePropagation) {
		layer.removeEventListener = function(type, callback, capture) {
			var rmv = Node.prototype.removeEventListener;
			if (type === 'click') {
				rmv.call(layer, type, callback.hijacked || callback, capture);
			} else {
				rmv.call(layer, type, callback, capture);
			}
		};

		layer.addEventListener = function(type, callback, capture) {
			var adv = Node.prototype.addEventListener;
			if (type === 'click') {
				adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
					if (!event.propagationStopped) {
						callback(event);
					}
				}), capture);
			} else {
				adv.call(layer, type, callback, capture);
			}
		};
	}

	// If a handler is already declared in the element's onclick attribute, it will be fired before
	// FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
	// adding it as listener.
	if (typeof layer.onclick === 'function') {

		// Android browser on at least 3.2 requires a new reference to the function in layer.onclick
		// - the old one won't work if passed to addEventListener directly.
		oldOnClick = layer.onclick;
		layer.addEventListener('click', function(event) {
			oldOnClick(event);
		}, false);
		layer.onclick = null;
	}
}


/**
 * Android requires exceptions.
 *
 * @type boolean
 */
var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0;


/**
 * iOS requires exceptions.
 *
 * @type boolean
 */
var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent);


/**
 * iOS 4 requires an exception for select elements.
 *
 * @type boolean
 */
var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


/**
 * iOS 6.0(+?) requires the target element to be manually derived
 *
 * @type boolean
 */
var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS ([6-9]|\d{2})_\d/).test(navigator.userAgent);


/**
 * Determine whether a given element requires a native click.
 *
 * @param {EventTarget|Element} target Target DOM element
 * @returns {boolean} Returns true if the element needs a native click
 */
FastClick.prototype.needsClick = function(target) {
	'use strict';
	switch (target.nodeName.toLowerCase()) {

	// Don't send a synthetic click to disabled inputs (issue #62)
	case 'button':
	case 'select':
	case 'textarea':
		if (target.disabled) {
			return true;
		}

		break;
	case 'input':

		// File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
		if ((deviceIsIOS && target.type === 'file') || target.disabled) {
			return true;
		}

		break;
	case 'label':
	case 'video':
		return true;
	}

	return (/\bneedsclick\b/).test(target.className);
};


/**
 * Determine whether a given element requires a call to focus to simulate click into element.
 *
 * @param {EventTarget|Element} target Target DOM element
 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
 */
FastClick.prototype.needsFocus = function(target) {
	'use strict';
	switch (target.nodeName.toLowerCase()) {
	case 'textarea':
		return true;
	case 'select':
		return !deviceIsAndroid;
	case 'input':
		switch (target.type) {
		case 'button':
		case 'checkbox':
		case 'file':
		case 'image':
		case 'radio':
		case 'submit':
			return false;
		}

		// No point in attempting to focus disabled inputs
		return !target.disabled && !target.readOnly;
	default:
		return (/\bneedsfocus\b/).test(target.className);
	}
};


/**
 * Send a click event to the specified element.
 *
 * @param {EventTarget|Element} targetElement
 * @param {Event} event
 */
FastClick.prototype.sendClick = function(targetElement, event) {
	'use strict';
	var clickEvent, touch;

	// On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
	if (document.activeElement && document.activeElement !== targetElement) {
		document.activeElement.blur();
	}

	touch = event.changedTouches[0];

	// Synthesise a click event, with an extra attribute so it can be tracked
	clickEvent = document.createEvent('MouseEvents');
	clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
	clickEvent.forwardedTouchEvent = true;
	targetElement.dispatchEvent(clickEvent);
};

FastClick.prototype.determineEventType = function(targetElement) {
	'use strict';

	//Issue #159: Android Chrome Select Box does not open with a synthetic click event
	if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
		return 'mousedown';
	}

	return 'click';
};


/**
 * @param {EventTarget|Element} targetElement
 */
FastClick.prototype.focus = function(targetElement) {
	'use strict';
	var length;

	// Issue #160: on iOS 7, some input elements (e.g. date datetime) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
	if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time') {
		length = targetElement.value.length;
		targetElement.setSelectionRange(length, length);
	} else {
		targetElement.focus();
	}
};


/**
 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
 *
 * @param {EventTarget|Element} targetElement
 */
FastClick.prototype.updateScrollParent = function(targetElement) {
	'use strict';
	var scrollParent, parentElement;

	scrollParent = targetElement.fastClickScrollParent;

	// Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
	// target element was moved to another parent.
	if (!scrollParent || !scrollParent.contains(targetElement)) {
		parentElement = targetElement;
		do {
			if (parentElement.scrollHeight > parentElement.offsetHeight) {
				scrollParent = parentElement;
				targetElement.fastClickScrollParent = parentElement;
				break;
			}

			parentElement = parentElement.parentElement;
		} while (parentElement);
	}

	// Always update the scroll top tracker if possible.
	if (scrollParent) {
		scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
	}
};


/**
 * @param {EventTarget} targetElement
 * @returns {Element|EventTarget}
 */
FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {
	'use strict';

	// On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
	if (eventTarget.nodeType === Node.TEXT_NODE) {
		return eventTarget.parentNode;
	}

	return eventTarget;
};


/**
 * On touch start, record the position and scroll offset.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchStart = function(event) {
	'use strict';
	var targetElement, touch, selection;

	// Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
	if (event.targetTouches.length > 1) {
		return true;
	}

	targetElement = this.getTargetElementFromEventTarget(event.target);
	touch = event.targetTouches[0];

	if (deviceIsIOS) {

		// Only trusted events will deselect text on iOS (issue #49)
		selection = window.getSelection();
		if (selection.rangeCount && !selection.isCollapsed) {
			return true;
		}

		if (!deviceIsIOS4) {

			// Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
			// when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
			// with the same identifier as the touch event that previously triggered the click that triggered the alert.
			// Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
			// immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
			if (touch.identifier === this.lastTouchIdentifier) {
				event.preventDefault();
				return false;
			}

			this.lastTouchIdentifier = touch.identifier;

			// If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
			// 1) the user does a fling scroll on the scrollable layer
			// 2) the user stops the fling scroll with another tap
			// then the event.target of the last 'touchend' event will be the element that was under the user's finger
			// when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
			// is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
			this.updateScrollParent(targetElement);
		}
	}

	this.trackingClick = true;
	this.trackingClickStart = event.timeStamp;
	this.targetElement = targetElement;

	this.touchStartX = touch.pageX;
	this.touchStartY = touch.pageY;

	// Prevent phantom clicks on fast double-tap (issue #36)
	if ((event.timeStamp - this.lastClickTime) < 200) {
		event.preventDefault();
	}

	return true;
};


/**
 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.touchHasMoved = function(event) {
	'use strict';
	var touch = event.changedTouches[0], boundary = this.touchBoundary;

	if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
		return true;
	}

	return false;
};


/**
 * Update the last position.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchMove = function(event) {
	'use strict';
	if (!this.trackingClick) {
		return true;
	}

	// If the touch has moved, cancel the click tracking
	if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
		this.trackingClick = false;
		this.targetElement = null;
	}

	return true;
};


/**
 * Attempt to find the labelled control for the given label element.
 *
 * @param {EventTarget|HTMLLabelElement} labelElement
 * @returns {Element|null}
 */
FastClick.prototype.findControl = function(labelElement) {
	'use strict';

	// Fast path for newer browsers supporting the HTML5 control attribute
	if (labelElement.control !== undefined) {
		return labelElement.control;
	}

	// All browsers under test that support touch events also support the HTML5 htmlFor attribute
	if (labelElement.htmlFor) {
		return document.getElementById(labelElement.htmlFor);
	}

	// If no for attribute exists, attempt to retrieve the first labellable descendant element
	// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
	return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
};


/**
 * On touch end, determine whether to send a click event at once.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchEnd = function(event) {
	'use strict';
	var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

	if (!this.trackingClick) {
		return true;
	}

	// Prevent phantom clicks on fast double-tap (issue #36)
	if ((event.timeStamp - this.lastClickTime) < 200) {
		this.cancelNextClick = true;
		return true;
	}

	// Reset to prevent wrong click cancel on input (issue #156).
	this.cancelNextClick = false;

	this.lastClickTime = event.timeStamp;

	trackingClickStart = this.trackingClickStart;
	this.trackingClick = false;
	this.trackingClickStart = 0;

	// On some iOS devices, the targetElement supplied with the event is invalid if the layer
	// is performing a transition or scroll, and has to be re-detected manually. Note that
	// for this to function correctly, it must be called *after* the event target is checked!
	// See issue #57; also filed as rdar://13048589 .
	if (deviceIsIOSWithBadTarget) {
		touch = event.changedTouches[0];

		// In certain cases arguments of elementFromPoint can be negative, so prevent setting targetElement to null
		targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
		targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
	}

	targetTagName = targetElement.tagName.toLowerCase();
	if (targetTagName === 'label') {
		forElement = this.findControl(targetElement);
		if (forElement) {
			this.focus(targetElement);
			if (deviceIsAndroid) {
				return false;
			}

			targetElement = forElement;
		}
	} else if (this.needsFocus(targetElement)) {

		// Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
		// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
		if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
			this.targetElement = null;
			return false;
		}

		this.focus(targetElement);
		this.sendClick(targetElement, event);

		// Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
		if (!deviceIsIOS4 || targetTagName !== 'select') {
			this.targetElement = null;
			event.preventDefault();
		}

		return false;
	}

	if (deviceIsIOS && !deviceIsIOS4) {

		// Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
		// and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
		scrollParent = targetElement.fastClickScrollParent;
		if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
			return true;
		}
	}

	// Prevent the actual click from going though - unless the target node is marked as requiring
	// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
	if (!this.needsClick(targetElement)) {
		event.preventDefault();
		this.sendClick(targetElement, event);
	}

	return false;
};


/**
 * On touch cancel, stop tracking the click.
 *
 * @returns {void}
 */
FastClick.prototype.onTouchCancel = function() {
	'use strict';
	this.trackingClick = false;
	this.targetElement = null;
};


/**
 * Determine mouse events which should be permitted.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onMouse = function(event) {
	'use strict';

	// If a target element was never set (because a touch event was never fired) allow the event
	if (!this.targetElement) {
		return true;
	}

	if (event.forwardedTouchEvent) {
		return true;
	}

	// Programmatically generated events targeting a specific element should be permitted
	if (!event.cancelable) {
		return true;
	}

	// Derive and check the target element to see whether the mouse event needs to be permitted;
	// unless explicitly enabled, prevent non-touch click events from triggering actions,
	// to prevent ghost/doubleclicks.
	if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

		// Prevent any user-added listeners declared on FastClick element from being fired.
		if (event.stopImmediatePropagation) {
			event.stopImmediatePropagation();
		} else {

			// Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
			event.propagationStopped = true;
		}

		// Cancel the event
		event.stopPropagation();
		event.preventDefault();

		return false;
	}

	// If the mouse event is permitted, return true for the action to go through.
	return true;
};


/**
 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
 * an actual click which should be permitted.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onClick = function(event) {
	'use strict';
	var permitted;

	// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
	if (this.trackingClick) {
		this.targetElement = null;
		this.trackingClick = false;
		return true;
	}

	// Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
	if (event.target.type === 'submit' && event.detail === 0) {
		return true;
	}

	permitted = this.onMouse(event);

	// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
	if (!permitted) {
		this.targetElement = null;
	}

	// If clicks are permitted, return true for the action to go through.
	return permitted;
};


/**
 * Remove all FastClick's event listeners.
 *
 * @returns {void}
 */
FastClick.prototype.destroy = function() {
	'use strict';
	var layer = this.layer;

	if (deviceIsAndroid) {
		layer.removeEventListener('mouseover', this.onMouse, true);
		layer.removeEventListener('mousedown', this.onMouse, true);
		layer.removeEventListener('mouseup', this.onMouse, true);
	}

	layer.removeEventListener('click', this.onClick, true);
	layer.removeEventListener('touchstart', this.onTouchStart, false);
	layer.removeEventListener('touchmove', this.onTouchMove, false);
	layer.removeEventListener('touchend', this.onTouchEnd, false);
	layer.removeEventListener('touchcancel', this.onTouchCancel, false);
};


/**
 * Check whether FastClick is needed.
 *
 * @param {Element} layer The layer to listen on
 */
FastClick.notNeeded = function(layer) {
	'use strict';
	var metaViewport;
	var chromeVersion;

	// Devices that don't support touch don't need FastClick
	if (typeof window.ontouchstart === 'undefined') {
		return true;
	}

	// Chrome version - zero for other browsers
	chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

	if (chromeVersion) {

		if (deviceIsAndroid) {
			metaViewport = document.querySelector('meta[name=viewport]');

			if (metaViewport) {
				// Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
				if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
					return true;
				}
				// Chrome 32 and above with width=device-width or less don't need FastClick
				if (chromeVersion > 31 && window.innerWidth <= window.screen.width) {
					return true;
				}
			}

		// Chrome desktop doesn't need FastClick (issue #15)
		} else {
			return true;
		}
	}

	// IE10 with -ms-touch-action: none, which disables double-tap-to-zoom (issue #97)
	if (layer.style.msTouchAction === 'none') {
		return true;
	}

	return false;
};


/**
 * Factory method for creating a FastClick object
 *
 * @param {Element} layer The layer to listen on
 */
FastClick.attach = function(layer) {
	'use strict';
	return new FastClick(layer);
};


if (typeof define !== 'undefined' && define.amd) {

	// AMD. Register as an anonymous module.
	define(function() {
		'use strict';
		return FastClick;
	});
} else if (typeof module !== 'undefined' && module.exports) {
	module.exports = FastClick.attach;
	module.exports.FastClick = FastClick;
} else {
	window.FastClick = FastClick;
}

},{}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbXN0YWRlL0Ryb3Bib3gvZGV2L2VxdWEvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbXN0YWRlL0Ryb3Bib3gvZGV2L2VxdWEvbGliL2ZuL2RlZmVyLmpzIiwiL1VzZXJzL21zdGFkZS9Ecm9wYm94L2Rldi9lcXVhL2xpYi9mbi9zZXF1ZW5jZS5qcyIsIi9Vc2Vycy9tc3RhZGUvRHJvcGJveC9kZXYvZXF1YS9saWIvbWFpbi5qcyIsIi9Vc2Vycy9tc3RhZGUvRHJvcGJveC9kZXYvZXF1YS9saWIvdWkvZXEuanMiLCIvVXNlcnMvbXN0YWRlL0Ryb3Bib3gvZGV2L2VxdWEvbGliL3VpL2Zvcm1hdC5qcyIsIi9Vc2Vycy9tc3RhZGUvRHJvcGJveC9kZXYvZXF1YS9saWIvdWkvcGxvdC5qcyIsIi9Vc2Vycy9tc3RhZGUvRHJvcGJveC9kZXYvZXF1YS9saWIvdWkvcHJlZml4LmpzIiwiL1VzZXJzL21zdGFkZS9Ecm9wYm94L2Rldi9lcXVhL2xpYi91aS90b2dnbGUuanMiLCIvVXNlcnMvbXN0YWRlL0Ryb3Bib3gvZGV2L2VxdWEvbGliL3VpL3VuaXQuanMiLCIvVXNlcnMvbXN0YWRlL0Ryb3Bib3gvZGV2L2VxdWEvbm9kZV9tb2R1bGVzL2QzL2QzLmpzIiwiL1VzZXJzL21zdGFkZS9Ecm9wYm94L2Rldi9lcXVhL25vZGVfbW9kdWxlcy9mYXN0Y2xpY2svbGliL2Zhc3RjbGljay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6alNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZGVmZXJcblxuZnVuY3Rpb24gZGVmZXIoZm4pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgLCBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgICBmbi5hcHBseShzZWxmLCBhcmdzKVxuICAgIH0pXG4gIH1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHNlcXVlbmNlXG5cbmZ1bmN0aW9uIHNlcXVlbmNlKCkge1xuICB2YXIgZm5zID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgLCBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICBcbiAgICBmbnMuZm9yRWFjaChmdW5jdGlvbihmbikge1xuICAgICAgZm4uYXBwbHkoc2VsZiwgYXJncylcbiAgICB9KVxuICB9XG59IiwicmVxdWlyZSgnZmFzdGNsaWNrJykoZG9jdW1lbnQuYm9keSlcblxudmFyIF8gICAgICAgPSByZXF1aXJlKCcuL2ZuL3NlcXVlbmNlJylcbiAgLCAkICAgICAgID0gcmVxdWlyZSgnLi9mbi9kZWZlcicpXG4gICwgY20gICAgICA9IHJlcXVpcmUoJy4vdWkvdW5pdCcpXG4gICwgZDMgICAgICA9IHJlcXVpcmUoJ2QzJylcbiAgLCB0b2dnbGUgID0gcmVxdWlyZSgnLi91aS90b2dnbGUnKVxuICAsIHBsb3QgICAgPSByZXF1aXJlKCcuL3VpL3Bsb3QnKVxuICAsIGVxICAgICAgPSByZXF1aXJlKCcuL3VpL2VxJylcbiAgLCBncmFwaCAgID0gZDMuc2VsZWN0KCcjZ3JhcGggLnBsb3QnKVxuICAsIG1hdGggICAgPSBkMy5zZWxlY3QoJyNtYXRoIHVsJylcbiAgLCBkYXRhICAgID0gW11cbiAgLCBpZCAgICAgID0gMFxuXG5hZGQoKVxucmVuZGVyKClcblxuZDMuc2VsZWN0KCcjZWRpdCcpXG4gIC5jYWxsKHRvZ2dsZSgnI21hdGgnLCAnZWRpdCcpKVxuXG5kMy5zZWxlY3QoJyNhZGQnKVxuICAub24oJ2NsaWNrJywgXyhhZGQsIHJlbmRlcikpXG5cbnBsb3Qub24oJ2NoYW5nZScsICQoZnVuY3Rpb24oZCwgaSkge1xuICBkYXRhW2ldID0gZFxuICBlcShtYXRoLCBkYXRhKVxufSkpXG5cbmVxLm9uKCdyZW1vdmUnLCBfKGRlbCwgcmVuZGVyKSlcblxuZnVuY3Rpb24gYWRkKCkge1xuICB2YXIgbCA9IFt+fihNYXRoLnJhbmRvbSgpICogNSksIH5+KE1hdGgucmFuZG9tKCkgKiA1KV1cbiAgbC5pZCA9IGlkKytcbiAgZGF0YS5wdXNoKGwpXG59XG5cbmZ1bmN0aW9uIGRlbChkLCBpKSB7XG4gIGRhdGEgPSBkYXRhLmZpbHRlcihmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHguaWQgIT09IGQuaWRcbiAgfSlcbn1cblxuZnVuY3Rpb24gcmVuZGVyKCkge1xuICBwbG90KGdyYXBoLCBkYXRhKVxuICBlcShtYXRoLCBkYXRhKVxufSIsInZhciBmICAgPSByZXF1aXJlKCcuL2Zvcm1hdCcpXG4gICwgZDMgID0gcmVxdWlyZSgnZDMnKVxuICAsIGNtICA9IHJlcXVpcmUoJy4vdW5pdCcpXG4gICwgJCAgID0gcmVxdWlyZSgnLi4vZm4vZGVmZXInKVxuICAsIF8gICA9IHJlcXVpcmUoJy4uL2ZuL3NlcXVlbmNlJylcbiAgLCBwcmUgPSByZXF1aXJlKCcuL3ByZWZpeCcpXG4gICwgZXZ0ID0gZDMuZGlzcGF0Y2goJ3JlbW92ZScpXG4gICwgYWJzID0gTWF0aC5hYnNcblxubW9kdWxlLmV4cG9ydHMgPSBlcVxuXG5lcS5vbiA9IGV2dC5vbi5iaW5kKGV2dClcblxuZnVuY3Rpb24gZXEobGlzdCwgZm5zKSB7XG4gIHZhciBmbiA9IGxpc3Quc2VsZWN0QWxsKCcuZXF1YScpLmRhdGEoZm5zLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmlkIH0pXG5cbiAgZm4uZWFjaCgkKHVwZGF0ZSkpXG5cbiAgZm4uZW50ZXIoKS5hcHBlbmQoJ2xpJylcbiAgICAuY2xhc3NlZCgnZXF1YScsIHRydWUpXG4gICAgLmF0dHIoJ2RhdGEtaW5kZXgnLCBmdW5jdGlvbihkLCBpKSB7IHJldHVybiBkLmlkICUgNiB9KVxuICAgIC5jYWxsKHBhcnRzKVxuICAgIC5lYWNoKCQodXBkYXRlKSlcblxuICBmbi5leGl0KCkucmVtb3ZlKClcbn1cblxuZnVuY3Rpb24gcGFydHMoZXEpIHtcbiAgZXEuYXBwZW5kKCdidXR0b24nKVxuICAgIC5jbGFzc2VkKCdkZWwnLCB0cnVlKVxuICAgIC5vbignY2xpY2snLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICBldnQucmVtb3ZlKGQsIGkpXG4gICAgfSlcblxuICBlcS5hcHBlbmQoJ3NwYW4nKVxuICAgIC5jbGFzc2VkKCdmbicsIHRydWUpXG4gICAgLnRleHQoJ3knKVxuXG4gIGVxLmFwcGVuZCgnc3BhbicpXG4gICAgLmNsYXNzZWQoJ2ZuLWJvZHknLCB0cnVlKVxufVxuXG5mdW5jdGlvbiB1cGRhdGUoZCkge1xuICB2YXIgZm5cblxuICBpZiAoYWJzKGRbMF0gKyBkWzFdKSA9PT0gSW5maW5pdHkpIHtcbiAgICBmbiA9ICdcXHUyMjFlJ1xuICB9IGVsc2UgaWYgKGRbMF0pIHtcbiAgICBmbiA9IGRbMV0gPiAwPyAnJDB4ICsgJDEnXG4gICAgICAgOiBkWzFdIDwgMD8gJyQweCAtICQxJ1xuICAgICAgIDogJyQweCdcbiAgfSBlbHNlIHtcbiAgICBmbiA9IGRbMV0gPiAwPyAnJDEnIDogJy0kMSdcbiAgfVxuXG4gIGQzLnNlbGVjdCh0aGlzKVxuICAgIC5zZWxlY3QoJy5mbi1ib2R5JylcbiAgICAudGV4dChmKGZuLCBbZFswXSwgYWJzKGRbMV0pXSkpXG59IiwibW9kdWxlLmV4cG9ydHMgPSBmb3JtYXRcblxuZnVuY3Rpb24gZm9ybWF0KHN0ciwgc3ViKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvXFwkKFxcZCspL2csIGZ1bmN0aW9uKG0sIGkpIHtcbiAgICByZXR1cm4gc3ViW2ldXG4gIH0pXG59IiwidmFyIGYgICA9IHJlcXVpcmUoJy4vZm9ybWF0JylcbiAgLCBkMyAgPSByZXF1aXJlKCdkMycpXG4gICwgY20gID0gcmVxdWlyZSgnLi91bml0JylcbiAgLCAkICAgPSByZXF1aXJlKCcuLi9mbi9kZWZlcicpXG4gICwgXyAgID0gcmVxdWlyZSgnLi4vZm4vc2VxdWVuY2UnKVxuICAsIHByZSA9IHJlcXVpcmUoJy4vcHJlZml4JylcbiAgLCBldnQgPSBkMy5kaXNwYXRjaCgnY2hhbmdlJylcbiAgLCBhYnMgPSBNYXRoLmFic1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBsb3RcblxucGxvdC5vbiA9IGV2dC5vbi5iaW5kKGV2dClcblxuZnVuY3Rpb24gcGxvdChncmFwaCwgZm5zKSB7XG4gIHZhciBmbiA9IGdyYXBoLnNlbGVjdEFsbCgnLmxpbmUnKS5kYXRhKGZucywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5pZCB9KVxuXG4gIGZuLmVhY2goJCh1cGRhdGUpKVxuXG4gIGZuLmVudGVyKCkuYXBwZW5kKCdnJylcbiAgICAuY2xhc3NlZCgnbGluZScsIHRydWUpXG4gICAgLmNsYXNzZWQoJ2ludGVyYWN0aXZlJywgdHJ1ZSlcbiAgICAuYXR0cignZGF0YS1pbmRleCcsIGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIGQuaWQgJSA2IH0pXG4gICAgLmNhbGwocGFydHMpXG4gICAgLmVhY2goJCh1cGRhdGUpKVxuICAgIC5jYWxsKGRyYWcpXG5cbiAgZm4uZXhpdCgpLnJlbW92ZSgpXG59XG5cbmZ1bmN0aW9uIHBhcnRzKGxuKSB7XG4gIGxuLmFwcGVuZCgncmVjdCcpXG4gICAgLmNsYXNzZWQoJ2hpdC1hcmVhJywgdHJ1ZSlcbiAgICAuYXR0cigneCcsICctMjAwJScpXG4gICAgLmF0dHIoJ3knLCAnLTVtbScpXG4gICAgLmF0dHIoJ3dpZHRoJywgJzQwMCUnKVxuICAgIC5hdHRyKCdoZWlnaHQnLCAnMWNtJylcblxuICBsbi5hcHBlbmQoJ2xpbmUnKVxuICAgIC5hdHRyKCd4MScsICctMjAwJScpXG4gICAgLmF0dHIoJ3gyJywgICcyMDAlJylcblxuICB2YXIgY3QgPSBsbi5hcHBlbmQoJ2cnKS5jbGFzc2VkKCdtJywgdHJ1ZSlcblxuICBjdC5hcHBlbmQoJ2NpcmNsZScpXG4gICAgLmF0dHIoJ3InLCAnM21tJylcbiAgXG4gIGN0LmFwcGVuZCgnbGluZScpXG4gICAgLmF0dHIoJ3gxJywgJy0ybW0nKVxuICAgIC5hdHRyKCd4MicsICAnMm1tJylcblxuICBjdC5hcHBlbmQoJ2xpbmUnKVxuICAgIC5hdHRyKCd5MScsICctMm1tJylcbiAgICAuYXR0cigneTInLCAgJzJtbScpXG59XG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgZDMuc2VsZWN0KHRoaXMpXG4gICAgLnN0eWxlKHByZSgndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xuICAgICAgcmV0dXJuIGYoJ3RyYW5zbGF0ZTNkKDAsICQxY20sIDApIHJvdGF0ZSgkMHJhZCkgc2NhbGUoMSknLCBbTWF0aC5hdGFuKGRbMF0pLCBkWzFdXSlcbiAgICB9KSlcbn1cblxuZnVuY3Rpb24gZHJhZyhmbikge1xuICBmbi5jYWxsKFxuICAgIGQzLmJlaGF2aW9yLmRyYWcoKVxuICAgICAgLm9uKCdkcmFnc3RhcnQnLCBkcmFnKHRydWUpKVxuICAgICAgLm9uKCdkcmFnJywgICAgICBfKHRyYW5zZm9ybSwgJCh1cGRhdGUpKSlcbiAgICAgIC5vbignZHJhZ2VuZCcsICAgXyhkcmFnKGZhbHNlKSwgdHJhbnNmb3JtLCAkKHVwZGF0ZSkpKVxuICApXG5cbiAgZnVuY3Rpb24gZHJhZyhlbmFibGVkKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGQpIHtcbiAgICAgIGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAuY2xhc3NlZCgnZHJhZ2dlZCcsIGVuYWJsZWQpXG5cbiAgICAgIHZhciBtID0gZDMubW91c2UodGhpcykubWFwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQgLyBjbSB9KVxuXG4gICAgICBpZiAoZW5hYmxlZCkge1xuICAgICAgICBjb25zdHJhaW50ID0gYWJzKG1bMF0pID4gMC43NT8gcm90YXRlIDogdHJhbnNsYXRlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdHJhaW50ID0gc25hcFxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZhciBjb25zdHJhaW50LCBwcmV2XG5cbiAgZnVuY3Rpb24gdHJhbnNmb3JtKGQsIGkpIHtcbiAgICB2YXIgeCAgPSBkMy5ldmVudC54IC8gY21cbiAgICAgICwgeSAgPSBkMy5ldmVudC55IC8gY21cbiAgICAgICwgZm4gPSBkMy5zZWxlY3QodGhpcylcblxuICAgIGZuLmRhdHVtKGNvbnN0cmFpbnQoeCwgeSkpXG4gICAgZCA9IHNuYXAoKShmbi5kYXR1bSgpKVxuXG4gICAgaWYgKFN0cmluZyhwcmV2KSAhPT0gU3RyaW5nKGQpKSB7XG4gICAgICBwcmV2ID0gZFxuICAgICAgZXZ0LmNoYW5nZShkLCBpKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zbGF0ZSh4LCB5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHRyYW5zbGF0ZShkKSB7XG4gICAgICB2YXIgaSA9IFtkWzBdLCB5XVxuICAgICAgaS5pZCA9IGQuaWRcbiAgICAgIHJldHVybiBpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcm90YXRlKHgsIHkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gcm90YXRlKGQpIHtcbiAgICAgIHZhciBpID0gWyh5IC0gZFsxXSkgLyB4LCBkWzFdXVxuICAgICAgaS5pZCA9IGQuaWRcbiAgICAgIHJldHVybiBpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc25hcCgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZCkge1xuICAgICAgdmFyIGkgPSBbZDMucm91bmQoZFswXSwgMSksIGQzLnJvdW5kKGRbMV0sIDEpXVxuICAgICAgaS5pZCA9IGQuaWRcbiAgICAgIHJldHVybiBpXG4gICAgfVxuICB9XG59IiwibW9kdWxlLmV4cG9ydHMgPSBwcmVmaXhlZFxuXG5mdW5jdGlvbiBwcmVmaXhlZChzdHlsZSwgdmFsdWUpIHtcbiAgcmV0dXJuIHZlbmRvcnMucmVkdWNlKGZ1bmN0aW9uKHMsIHYpIHtcbiAgICBzWyctJyArIHYgKyAnLScgKyBzdHlsZV0gPSB2YWx1ZVxuICAgIHJldHVybiBzXG4gIH0sIHt9KVxufVxuXG52YXIgdmVuZG9ycyA9IFsnd2Via2l0JywgJ21veicsICdtcycsICdvJ10iLCJ2YXIgZDMgPSByZXF1aXJlKCdkMycpXG5cbm1vZHVsZS5leHBvcnRzID0gdG9nZ2xlXG5cbmZ1bmN0aW9uIHRvZ2dsZSh0YXJnZXRzLCBzdHlsZSwgdHJpZ2dlcikge1xuICByZXR1cm4gZnVuY3Rpb24oc2VsZWN0aW9uKSB7XG4gICAgc2VsZWN0aW9uLm9uKCdjbGljay4nICsgc3R5bGUsIGZ1bmN0aW9uKCkge1xuICAgICAgZDMuc2VsZWN0QWxsKHRhcmdldHMpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciB0ID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgdC5jbGFzc2VkKHN0eWxlLCAhdC5jbGFzc2VkKHN0eWxlKSlcbiAgICAgICAgfSlcblxuICAgICAgdHJpZ2dlciAmJiB0cmlnZ2VyKHRhcmdldHMpXG4gICAgfSlcbiAgfVxufSIsIm1vZHVsZS5leHBvcnRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VuaXQnKS53aWR0aC5iYXNlVmFsLnZhbHVlIiwiIWZ1bmN0aW9uKCkge1xuICB2YXIgZDMgPSB7XG4gICAgdmVyc2lvbjogXCIzLjQuMVwiXG4gIH07XG4gIGlmICghRGF0ZS5ub3cpIERhdGUubm93ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICtuZXcgRGF0ZSgpO1xuICB9O1xuICB2YXIgZDNfYXJyYXlTbGljZSA9IFtdLnNsaWNlLCBkM19hcnJheSA9IGZ1bmN0aW9uKGxpc3QpIHtcbiAgICByZXR1cm4gZDNfYXJyYXlTbGljZS5jYWxsKGxpc3QpO1xuICB9O1xuICB2YXIgZDNfZG9jdW1lbnQgPSBkb2N1bWVudCwgZDNfZG9jdW1lbnRFbGVtZW50ID0gZDNfZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCBkM193aW5kb3cgPSB3aW5kb3c7XG4gIHRyeSB7XG4gICAgZDNfYXJyYXkoZDNfZG9jdW1lbnRFbGVtZW50LmNoaWxkTm9kZXMpWzBdLm5vZGVUeXBlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgZDNfYXJyYXkgPSBmdW5jdGlvbihsaXN0KSB7XG4gICAgICB2YXIgaSA9IGxpc3QubGVuZ3RoLCBhcnJheSA9IG5ldyBBcnJheShpKTtcbiAgICAgIHdoaWxlIChpLS0pIGFycmF5W2ldID0gbGlzdFtpXTtcbiAgICAgIHJldHVybiBhcnJheTtcbiAgICB9O1xuICB9XG4gIHRyeSB7XG4gICAgZDNfZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKS5zdHlsZS5zZXRQcm9wZXJ0eShcIm9wYWNpdHlcIiwgMCwgXCJcIik7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdmFyIGQzX2VsZW1lbnRfcHJvdG90eXBlID0gZDNfd2luZG93LkVsZW1lbnQucHJvdG90eXBlLCBkM19lbGVtZW50X3NldEF0dHJpYnV0ZSA9IGQzX2VsZW1lbnRfcHJvdG90eXBlLnNldEF0dHJpYnV0ZSwgZDNfZWxlbWVudF9zZXRBdHRyaWJ1dGVOUyA9IGQzX2VsZW1lbnRfcHJvdG90eXBlLnNldEF0dHJpYnV0ZU5TLCBkM19zdHlsZV9wcm90b3R5cGUgPSBkM193aW5kb3cuQ1NTU3R5bGVEZWNsYXJhdGlvbi5wcm90b3R5cGUsIGQzX3N0eWxlX3NldFByb3BlcnR5ID0gZDNfc3R5bGVfcHJvdG90eXBlLnNldFByb3BlcnR5O1xuICAgIGQzX2VsZW1lbnRfcHJvdG90eXBlLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgICBkM19lbGVtZW50X3NldEF0dHJpYnV0ZS5jYWxsKHRoaXMsIG5hbWUsIHZhbHVlICsgXCJcIik7XG4gICAgfTtcbiAgICBkM19lbGVtZW50X3Byb3RvdHlwZS5zZXRBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKHNwYWNlLCBsb2NhbCwgdmFsdWUpIHtcbiAgICAgIGQzX2VsZW1lbnRfc2V0QXR0cmlidXRlTlMuY2FsbCh0aGlzLCBzcGFjZSwgbG9jYWwsIHZhbHVlICsgXCJcIik7XG4gICAgfTtcbiAgICBkM19zdHlsZV9wcm90b3R5cGUuc2V0UHJvcGVydHkgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgICAgIGQzX3N0eWxlX3NldFByb3BlcnR5LmNhbGwodGhpcywgbmFtZSwgdmFsdWUgKyBcIlwiLCBwcmlvcml0eSk7XG4gICAgfTtcbiAgfVxuICBkMy5hc2NlbmRpbmcgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiBhID49IGIgPyAwIDogTmFOO1xuICB9O1xuICBkMy5kZXNjZW5kaW5nID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBiIDwgYSA/IC0xIDogYiA+IGEgPyAxIDogYiA+PSBhID8gMCA6IE5hTjtcbiAgfTtcbiAgZDMubWluID0gZnVuY3Rpb24oYXJyYXksIGYpIHtcbiAgICB2YXIgaSA9IC0xLCBuID0gYXJyYXkubGVuZ3RoLCBhLCBiO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICB3aGlsZSAoKytpIDwgbiAmJiAhKChhID0gYXJyYXlbaV0pICE9IG51bGwgJiYgYSA8PSBhKSkgYSA9IHVuZGVmaW5lZDtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoKGIgPSBhcnJheVtpXSkgIT0gbnVsbCAmJiBhID4gYikgYSA9IGI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuICYmICEoKGEgPSBmLmNhbGwoYXJyYXksIGFycmF5W2ldLCBpKSkgIT0gbnVsbCAmJiBhIDw9IGEpKSBhID0gdW5kZWZpbmVkO1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgoYiA9IGYuY2FsbChhcnJheSwgYXJyYXlbaV0sIGkpKSAhPSBudWxsICYmIGEgPiBiKSBhID0gYjtcbiAgICB9XG4gICAgcmV0dXJuIGE7XG4gIH07XG4gIGQzLm1heCA9IGZ1bmN0aW9uKGFycmF5LCBmKSB7XG4gICAgdmFyIGkgPSAtMSwgbiA9IGFycmF5Lmxlbmd0aCwgYSwgYjtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgd2hpbGUgKCsraSA8IG4gJiYgISgoYSA9IGFycmF5W2ldKSAhPSBudWxsICYmIGEgPD0gYSkpIGEgPSB1bmRlZmluZWQ7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKChiID0gYXJyYXlbaV0pICE9IG51bGwgJiYgYiA+IGEpIGEgPSBiO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aGlsZSAoKytpIDwgbiAmJiAhKChhID0gZi5jYWxsKGFycmF5LCBhcnJheVtpXSwgaSkpICE9IG51bGwgJiYgYSA8PSBhKSkgYSA9IHVuZGVmaW5lZDtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoKGIgPSBmLmNhbGwoYXJyYXksIGFycmF5W2ldLCBpKSkgIT0gbnVsbCAmJiBiID4gYSkgYSA9IGI7XG4gICAgfVxuICAgIHJldHVybiBhO1xuICB9O1xuICBkMy5leHRlbnQgPSBmdW5jdGlvbihhcnJheSwgZikge1xuICAgIHZhciBpID0gLTEsIG4gPSBhcnJheS5sZW5ndGgsIGEsIGIsIGM7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuICYmICEoKGEgPSBjID0gYXJyYXlbaV0pICE9IG51bGwgJiYgYSA8PSBhKSkgYSA9IGMgPSB1bmRlZmluZWQ7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKChiID0gYXJyYXlbaV0pICE9IG51bGwpIHtcbiAgICAgICAgaWYgKGEgPiBiKSBhID0gYjtcbiAgICAgICAgaWYgKGMgPCBiKSBjID0gYjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgd2hpbGUgKCsraSA8IG4gJiYgISgoYSA9IGMgPSBmLmNhbGwoYXJyYXksIGFycmF5W2ldLCBpKSkgIT0gbnVsbCAmJiBhIDw9IGEpKSBhID0gdW5kZWZpbmVkO1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgoYiA9IGYuY2FsbChhcnJheSwgYXJyYXlbaV0sIGkpKSAhPSBudWxsKSB7XG4gICAgICAgIGlmIChhID4gYikgYSA9IGI7XG4gICAgICAgIGlmIChjIDwgYikgYyA9IGI7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbIGEsIGMgXTtcbiAgfTtcbiAgZDMuc3VtID0gZnVuY3Rpb24oYXJyYXksIGYpIHtcbiAgICB2YXIgcyA9IDAsIG4gPSBhcnJheS5sZW5ndGgsIGEsIGkgPSAtMTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICghaXNOYU4oYSA9ICthcnJheVtpXSkpIHMgKz0gYTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICghaXNOYU4oYSA9ICtmLmNhbGwoYXJyYXksIGFycmF5W2ldLCBpKSkpIHMgKz0gYTtcbiAgICB9XG4gICAgcmV0dXJuIHM7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX251bWJlcih4KSB7XG4gICAgcmV0dXJuIHggIT0gbnVsbCAmJiAhaXNOYU4oeCk7XG4gIH1cbiAgZDMubWVhbiA9IGZ1bmN0aW9uKGFycmF5LCBmKSB7XG4gICAgdmFyIG4gPSBhcnJheS5sZW5ndGgsIGEsIG0gPSAwLCBpID0gLTEsIGogPSAwO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKGQzX251bWJlcihhID0gYXJyYXlbaV0pKSBtICs9IChhIC0gbSkgLyArK2o7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoZDNfbnVtYmVyKGEgPSBmLmNhbGwoYXJyYXksIGFycmF5W2ldLCBpKSkpIG0gKz0gKGEgLSBtKSAvICsrajtcbiAgICB9XG4gICAgcmV0dXJuIGogPyBtIDogdW5kZWZpbmVkO1xuICB9O1xuICBkMy5xdWFudGlsZSA9IGZ1bmN0aW9uKHZhbHVlcywgcCkge1xuICAgIHZhciBIID0gKHZhbHVlcy5sZW5ndGggLSAxKSAqIHAgKyAxLCBoID0gTWF0aC5mbG9vcihIKSwgdiA9ICt2YWx1ZXNbaCAtIDFdLCBlID0gSCAtIGg7XG4gICAgcmV0dXJuIGUgPyB2ICsgZSAqICh2YWx1ZXNbaF0gLSB2KSA6IHY7XG4gIH07XG4gIGQzLm1lZGlhbiA9IGZ1bmN0aW9uKGFycmF5LCBmKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSBhcnJheSA9IGFycmF5Lm1hcChmKTtcbiAgICBhcnJheSA9IGFycmF5LmZpbHRlcihkM19udW1iZXIpO1xuICAgIHJldHVybiBhcnJheS5sZW5ndGggPyBkMy5xdWFudGlsZShhcnJheS5zb3J0KGQzLmFzY2VuZGluZyksIC41KSA6IHVuZGVmaW5lZDtcbiAgfTtcbiAgZDMuYmlzZWN0b3IgPSBmdW5jdGlvbihmKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxlZnQ6IGZ1bmN0aW9uKGEsIHgsIGxvLCBoaSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIGxvID0gMDtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCA0KSBoaSA9IGEubGVuZ3RoO1xuICAgICAgICB3aGlsZSAobG8gPCBoaSkge1xuICAgICAgICAgIHZhciBtaWQgPSBsbyArIGhpID4+PiAxO1xuICAgICAgICAgIGlmIChmLmNhbGwoYSwgYVttaWRdLCBtaWQpIDwgeCkgbG8gPSBtaWQgKyAxOyBlbHNlIGhpID0gbWlkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsbztcbiAgICAgIH0sXG4gICAgICByaWdodDogZnVuY3Rpb24oYSwgeCwgbG8sIGhpKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykgbG8gPSAwO1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDQpIGhpID0gYS5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChsbyA8IGhpKSB7XG4gICAgICAgICAgdmFyIG1pZCA9IGxvICsgaGkgPj4+IDE7XG4gICAgICAgICAgaWYgKHggPCBmLmNhbGwoYSwgYVttaWRdLCBtaWQpKSBoaSA9IG1pZDsgZWxzZSBsbyA9IG1pZCArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxvO1xuICAgICAgfVxuICAgIH07XG4gIH07XG4gIHZhciBkM19iaXNlY3RvciA9IGQzLmJpc2VjdG9yKGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gZDtcbiAgfSk7XG4gIGQzLmJpc2VjdExlZnQgPSBkM19iaXNlY3Rvci5sZWZ0O1xuICBkMy5iaXNlY3QgPSBkMy5iaXNlY3RSaWdodCA9IGQzX2Jpc2VjdG9yLnJpZ2h0O1xuICBkMy5zaHVmZmxlID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgbSA9IGFycmF5Lmxlbmd0aCwgdCwgaTtcbiAgICB3aGlsZSAobSkge1xuICAgICAgaSA9IE1hdGgucmFuZG9tKCkgKiBtLS0gfCAwO1xuICAgICAgdCA9IGFycmF5W21dLCBhcnJheVttXSA9IGFycmF5W2ldLCBhcnJheVtpXSA9IHQ7XG4gICAgfVxuICAgIHJldHVybiBhcnJheTtcbiAgfTtcbiAgZDMucGVybXV0ZSA9IGZ1bmN0aW9uKGFycmF5LCBpbmRleGVzKSB7XG4gICAgdmFyIGkgPSBpbmRleGVzLmxlbmd0aCwgcGVybXV0ZXMgPSBuZXcgQXJyYXkoaSk7XG4gICAgd2hpbGUgKGktLSkgcGVybXV0ZXNbaV0gPSBhcnJheVtpbmRleGVzW2ldXTtcbiAgICByZXR1cm4gcGVybXV0ZXM7XG4gIH07XG4gIGQzLnBhaXJzID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgaSA9IDAsIG4gPSBhcnJheS5sZW5ndGggLSAxLCBwMCwgcDEgPSBhcnJheVswXSwgcGFpcnMgPSBuZXcgQXJyYXkobiA8IDAgPyAwIDogbik7XG4gICAgd2hpbGUgKGkgPCBuKSBwYWlyc1tpXSA9IFsgcDAgPSBwMSwgcDEgPSBhcnJheVsrK2ldIF07XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuICBkMy56aXAgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIShuID0gYXJndW1lbnRzLmxlbmd0aCkpIHJldHVybiBbXTtcbiAgICBmb3IgKHZhciBpID0gLTEsIG0gPSBkMy5taW4oYXJndW1lbnRzLCBkM196aXBMZW5ndGgpLCB6aXBzID0gbmV3IEFycmF5KG0pOyArK2kgPCBtOyApIHtcbiAgICAgIGZvciAodmFyIGogPSAtMSwgbiwgemlwID0gemlwc1tpXSA9IG5ldyBBcnJheShuKTsgKytqIDwgbjsgKSB7XG4gICAgICAgIHppcFtqXSA9IGFyZ3VtZW50c1tqXVtpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHppcHM7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3ppcExlbmd0aChkKSB7XG4gICAgcmV0dXJuIGQubGVuZ3RoO1xuICB9XG4gIGQzLnRyYW5zcG9zZSA9IGZ1bmN0aW9uKG1hdHJpeCkge1xuICAgIHJldHVybiBkMy56aXAuYXBwbHkoZDMsIG1hdHJpeCk7XG4gIH07XG4gIGQzLmtleXMgPSBmdW5jdGlvbihtYXApIHtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBtYXApIGtleXMucHVzaChrZXkpO1xuICAgIHJldHVybiBrZXlzO1xuICB9O1xuICBkMy52YWx1ZXMgPSBmdW5jdGlvbihtYXApIHtcbiAgICB2YXIgdmFsdWVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG1hcCkgdmFsdWVzLnB1c2gobWFwW2tleV0pO1xuICAgIHJldHVybiB2YWx1ZXM7XG4gIH07XG4gIGQzLmVudHJpZXMgPSBmdW5jdGlvbihtYXApIHtcbiAgICB2YXIgZW50cmllcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBtYXApIGVudHJpZXMucHVzaCh7XG4gICAgICBrZXk6IGtleSxcbiAgICAgIHZhbHVlOiBtYXBba2V5XVxuICAgIH0pO1xuICAgIHJldHVybiBlbnRyaWVzO1xuICB9O1xuICBkMy5tZXJnZSA9IGZ1bmN0aW9uKGFycmF5cykge1xuICAgIHZhciBuID0gYXJyYXlzLmxlbmd0aCwgbSwgaSA9IC0xLCBqID0gMCwgbWVyZ2VkLCBhcnJheTtcbiAgICB3aGlsZSAoKytpIDwgbikgaiArPSBhcnJheXNbaV0ubGVuZ3RoO1xuICAgIG1lcmdlZCA9IG5ldyBBcnJheShqKTtcbiAgICB3aGlsZSAoLS1uID49IDApIHtcbiAgICAgIGFycmF5ID0gYXJyYXlzW25dO1xuICAgICAgbSA9IGFycmF5Lmxlbmd0aDtcbiAgICAgIHdoaWxlICgtLW0gPj0gMCkge1xuICAgICAgICBtZXJnZWRbLS1qXSA9IGFycmF5W21dO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWVyZ2VkO1xuICB9O1xuICB2YXIgYWJzID0gTWF0aC5hYnM7XG4gIGQzLnJhbmdlID0gZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgIHN0ZXAgPSAxO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAgIHN0b3AgPSBzdGFydDtcbiAgICAgICAgc3RhcnQgPSAwO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoKHN0b3AgLSBzdGFydCkgLyBzdGVwID09PSBJbmZpbml0eSkgdGhyb3cgbmV3IEVycm9yKFwiaW5maW5pdGUgcmFuZ2VcIik7XG4gICAgdmFyIHJhbmdlID0gW10sIGsgPSBkM19yYW5nZV9pbnRlZ2VyU2NhbGUoYWJzKHN0ZXApKSwgaSA9IC0xLCBqO1xuICAgIHN0YXJ0ICo9IGssIHN0b3AgKj0gaywgc3RlcCAqPSBrO1xuICAgIGlmIChzdGVwIDwgMCkgd2hpbGUgKChqID0gc3RhcnQgKyBzdGVwICogKytpKSA+IHN0b3ApIHJhbmdlLnB1c2goaiAvIGspOyBlbHNlIHdoaWxlICgoaiA9IHN0YXJ0ICsgc3RlcCAqICsraSkgPCBzdG9wKSByYW5nZS5wdXNoKGogLyBrKTtcbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3JhbmdlX2ludGVnZXJTY2FsZSh4KSB7XG4gICAgdmFyIGsgPSAxO1xuICAgIHdoaWxlICh4ICogayAlIDEpIGsgKj0gMTA7XG4gICAgcmV0dXJuIGs7XG4gIH1cbiAgZnVuY3Rpb24gZDNfY2xhc3MoY3RvciwgcHJvcGVydGllcykge1xuICAgIHRyeSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gcHJvcGVydGllcykge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY3Rvci5wcm90b3R5cGUsIGtleSwge1xuICAgICAgICAgIHZhbHVlOiBwcm9wZXJ0aWVzW2tleV0sXG4gICAgICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBwcm9wZXJ0aWVzO1xuICAgIH1cbiAgfVxuICBkMy5tYXAgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgICB2YXIgbWFwID0gbmV3IGQzX01hcCgpO1xuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBkM19NYXApIG9iamVjdC5mb3JFYWNoKGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIG1hcC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfSk7IGVsc2UgZm9yICh2YXIga2V5IGluIG9iamVjdCkgbWFwLnNldChrZXksIG9iamVjdFtrZXldKTtcbiAgICByZXR1cm4gbWFwO1xuICB9O1xuICBmdW5jdGlvbiBkM19NYXAoKSB7fVxuICBkM19jbGFzcyhkM19NYXAsIHtcbiAgICBoYXM6IGQzX21hcF9oYXMsXG4gICAgZ2V0OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiB0aGlzW2QzX21hcF9wcmVmaXggKyBrZXldO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpc1tkM19tYXBfcHJlZml4ICsga2V5XSA9IHZhbHVlO1xuICAgIH0sXG4gICAgcmVtb3ZlOiBkM19tYXBfcmVtb3ZlLFxuICAgIGtleXM6IGQzX21hcF9rZXlzLFxuICAgIHZhbHVlczogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdmFsdWVzID0gW107XG4gICAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YWx1ZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfSxcbiAgICBlbnRyaWVzOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBlbnRyaWVzID0gW107XG4gICAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGVudHJpZXM7XG4gICAgfSxcbiAgICBzaXplOiBkM19tYXBfc2l6ZSxcbiAgICBlbXB0eTogZDNfbWFwX2VtcHR5LFxuICAgIGZvckVhY2g6IGZ1bmN0aW9uKGYpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzKSBpZiAoa2V5LmNoYXJDb2RlQXQoMCkgPT09IGQzX21hcF9wcmVmaXhDb2RlKSBmLmNhbGwodGhpcywga2V5LnN1YnN0cmluZygxKSwgdGhpc1trZXldKTtcbiAgICB9XG4gIH0pO1xuICB2YXIgZDNfbWFwX3ByZWZpeCA9IFwiXFx4MDBcIiwgZDNfbWFwX3ByZWZpeENvZGUgPSBkM19tYXBfcHJlZml4LmNoYXJDb2RlQXQoMCk7XG4gIGZ1bmN0aW9uIGQzX21hcF9oYXMoa2V5KSB7XG4gICAgcmV0dXJuIGQzX21hcF9wcmVmaXggKyBrZXkgaW4gdGhpcztcbiAgfVxuICBmdW5jdGlvbiBkM19tYXBfcmVtb3ZlKGtleSkge1xuICAgIGtleSA9IGQzX21hcF9wcmVmaXggKyBrZXk7XG4gICAgcmV0dXJuIGtleSBpbiB0aGlzICYmIGRlbGV0ZSB0aGlzW2tleV07XG4gIH1cbiAgZnVuY3Rpb24gZDNfbWFwX2tleXMoKSB7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICB9KTtcbiAgICByZXR1cm4ga2V5cztcbiAgfVxuICBmdW5jdGlvbiBkM19tYXBfc2l6ZSgpIHtcbiAgICB2YXIgc2l6ZSA9IDA7XG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMpIGlmIChrZXkuY2hhckNvZGVBdCgwKSA9PT0gZDNfbWFwX3ByZWZpeENvZGUpICsrc2l6ZTtcbiAgICByZXR1cm4gc2l6ZTtcbiAgfVxuICBmdW5jdGlvbiBkM19tYXBfZW1wdHkoKSB7XG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMpIGlmIChrZXkuY2hhckNvZGVBdCgwKSA9PT0gZDNfbWFwX3ByZWZpeENvZGUpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBkMy5uZXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5lc3QgPSB7fSwga2V5cyA9IFtdLCBzb3J0S2V5cyA9IFtdLCBzb3J0VmFsdWVzLCByb2xsdXA7XG4gICAgZnVuY3Rpb24gbWFwKG1hcFR5cGUsIGFycmF5LCBkZXB0aCkge1xuICAgICAgaWYgKGRlcHRoID49IGtleXMubGVuZ3RoKSByZXR1cm4gcm9sbHVwID8gcm9sbHVwLmNhbGwobmVzdCwgYXJyYXkpIDogc29ydFZhbHVlcyA/IGFycmF5LnNvcnQoc29ydFZhbHVlcykgOiBhcnJheTtcbiAgICAgIHZhciBpID0gLTEsIG4gPSBhcnJheS5sZW5ndGgsIGtleSA9IGtleXNbZGVwdGgrK10sIGtleVZhbHVlLCBvYmplY3QsIHNldHRlciwgdmFsdWVzQnlLZXkgPSBuZXcgZDNfTWFwKCksIHZhbHVlcztcbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIGlmICh2YWx1ZXMgPSB2YWx1ZXNCeUtleS5nZXQoa2V5VmFsdWUgPSBrZXkob2JqZWN0ID0gYXJyYXlbaV0pKSkge1xuICAgICAgICAgIHZhbHVlcy5wdXNoKG9iamVjdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWVzQnlLZXkuc2V0KGtleVZhbHVlLCBbIG9iamVjdCBdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG1hcFR5cGUpIHtcbiAgICAgICAgb2JqZWN0ID0gbWFwVHlwZSgpO1xuICAgICAgICBzZXR0ZXIgPSBmdW5jdGlvbihrZXlWYWx1ZSwgdmFsdWVzKSB7XG4gICAgICAgICAgb2JqZWN0LnNldChrZXlWYWx1ZSwgbWFwKG1hcFR5cGUsIHZhbHVlcywgZGVwdGgpKTtcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iamVjdCA9IHt9O1xuICAgICAgICBzZXR0ZXIgPSBmdW5jdGlvbihrZXlWYWx1ZSwgdmFsdWVzKSB7XG4gICAgICAgICAgb2JqZWN0W2tleVZhbHVlXSA9IG1hcChtYXBUeXBlLCB2YWx1ZXMsIGRlcHRoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHZhbHVlc0J5S2V5LmZvckVhY2goc2V0dGVyKTtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGVudHJpZXMobWFwLCBkZXB0aCkge1xuICAgICAgaWYgKGRlcHRoID49IGtleXMubGVuZ3RoKSByZXR1cm4gbWFwO1xuICAgICAgdmFyIGFycmF5ID0gW10sIHNvcnRLZXkgPSBzb3J0S2V5c1tkZXB0aCsrXTtcbiAgICAgIG1hcC5mb3JFYWNoKGZ1bmN0aW9uKGtleSwga2V5TWFwKSB7XG4gICAgICAgIGFycmF5LnB1c2goe1xuICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgIHZhbHVlczogZW50cmllcyhrZXlNYXAsIGRlcHRoKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHNvcnRLZXkgPyBhcnJheS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIHNvcnRLZXkoYS5rZXksIGIua2V5KTtcbiAgICAgIH0pIDogYXJyYXk7XG4gICAgfVxuICAgIG5lc3QubWFwID0gZnVuY3Rpb24oYXJyYXksIG1hcFR5cGUpIHtcbiAgICAgIHJldHVybiBtYXAobWFwVHlwZSwgYXJyYXksIDApO1xuICAgIH07XG4gICAgbmVzdC5lbnRyaWVzID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICAgIHJldHVybiBlbnRyaWVzKG1hcChkMy5tYXAsIGFycmF5LCAwKSwgMCk7XG4gICAgfTtcbiAgICBuZXN0LmtleSA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgIGtleXMucHVzaChkKTtcbiAgICAgIHJldHVybiBuZXN0O1xuICAgIH07XG4gICAgbmVzdC5zb3J0S2V5cyA9IGZ1bmN0aW9uKG9yZGVyKSB7XG4gICAgICBzb3J0S2V5c1trZXlzLmxlbmd0aCAtIDFdID0gb3JkZXI7XG4gICAgICByZXR1cm4gbmVzdDtcbiAgICB9O1xuICAgIG5lc3Quc29ydFZhbHVlcyA9IGZ1bmN0aW9uKG9yZGVyKSB7XG4gICAgICBzb3J0VmFsdWVzID0gb3JkZXI7XG4gICAgICByZXR1cm4gbmVzdDtcbiAgICB9O1xuICAgIG5lc3Qucm9sbHVwID0gZnVuY3Rpb24oZikge1xuICAgICAgcm9sbHVwID0gZjtcbiAgICAgIHJldHVybiBuZXN0O1xuICAgIH07XG4gICAgcmV0dXJuIG5lc3Q7XG4gIH07XG4gIGQzLnNldCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHNldCA9IG5ldyBkM19TZXQoKTtcbiAgICBpZiAoYXJyYXkpIGZvciAodmFyIGkgPSAwLCBuID0gYXJyYXkubGVuZ3RoOyBpIDwgbjsgKytpKSBzZXQuYWRkKGFycmF5W2ldKTtcbiAgICByZXR1cm4gc2V0O1xuICB9O1xuICBmdW5jdGlvbiBkM19TZXQoKSB7fVxuICBkM19jbGFzcyhkM19TZXQsIHtcbiAgICBoYXM6IGQzX21hcF9oYXMsXG4gICAgYWRkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpc1tkM19tYXBfcHJlZml4ICsgdmFsdWVdID0gdHJ1ZTtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhbHVlID0gZDNfbWFwX3ByZWZpeCArIHZhbHVlO1xuICAgICAgcmV0dXJuIHZhbHVlIGluIHRoaXMgJiYgZGVsZXRlIHRoaXNbdmFsdWVdO1xuICAgIH0sXG4gICAgdmFsdWVzOiBkM19tYXBfa2V5cyxcbiAgICBzaXplOiBkM19tYXBfc2l6ZSxcbiAgICBlbXB0eTogZDNfbWFwX2VtcHR5LFxuICAgIGZvckVhY2g6IGZ1bmN0aW9uKGYpIHtcbiAgICAgIGZvciAodmFyIHZhbHVlIGluIHRoaXMpIGlmICh2YWx1ZS5jaGFyQ29kZUF0KDApID09PSBkM19tYXBfcHJlZml4Q29kZSkgZi5jYWxsKHRoaXMsIHZhbHVlLnN1YnN0cmluZygxKSk7XG4gICAgfVxuICB9KTtcbiAgZDMuYmVoYXZpb3IgPSB7fTtcbiAgZDMucmViaW5kID0gZnVuY3Rpb24odGFyZ2V0LCBzb3VyY2UpIHtcbiAgICB2YXIgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoLCBtZXRob2Q7XG4gICAgd2hpbGUgKCsraSA8IG4pIHRhcmdldFttZXRob2QgPSBhcmd1bWVudHNbaV1dID0gZDNfcmViaW5kKHRhcmdldCwgc291cmNlLCBzb3VyY2VbbWV0aG9kXSk7XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfcmViaW5kKHRhcmdldCwgc291cmNlLCBtZXRob2QpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdmFsdWUgPSBtZXRob2QuYXBwbHkoc291cmNlLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHZhbHVlID09PSBzb3VyY2UgPyB0YXJnZXQgOiB2YWx1ZTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGQzX3ZlbmRvclN5bWJvbChvYmplY3QsIG5hbWUpIHtcbiAgICBpZiAobmFtZSBpbiBvYmplY3QpIHJldHVybiBuYW1lO1xuICAgIG5hbWUgPSBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBkM192ZW5kb3JQcmVmaXhlcy5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIHZhciBwcmVmaXhOYW1lID0gZDNfdmVuZG9yUHJlZml4ZXNbaV0gKyBuYW1lO1xuICAgICAgaWYgKHByZWZpeE5hbWUgaW4gb2JqZWN0KSByZXR1cm4gcHJlZml4TmFtZTtcbiAgICB9XG4gIH1cbiAgdmFyIGQzX3ZlbmRvclByZWZpeGVzID0gWyBcIndlYmtpdFwiLCBcIm1zXCIsIFwibW96XCIsIFwiTW96XCIsIFwib1wiLCBcIk9cIiBdO1xuICBmdW5jdGlvbiBkM19ub29wKCkge31cbiAgZDMuZGlzcGF0Y2ggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGlzcGF0Y2ggPSBuZXcgZDNfZGlzcGF0Y2goKSwgaSA9IC0xLCBuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB3aGlsZSAoKytpIDwgbikgZGlzcGF0Y2hbYXJndW1lbnRzW2ldXSA9IGQzX2Rpc3BhdGNoX2V2ZW50KGRpc3BhdGNoKTtcbiAgICByZXR1cm4gZGlzcGF0Y2g7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2Rpc3BhdGNoKCkge31cbiAgZDNfZGlzcGF0Y2gucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICB2YXIgaSA9IHR5cGUuaW5kZXhPZihcIi5cIiksIG5hbWUgPSBcIlwiO1xuICAgIGlmIChpID49IDApIHtcbiAgICAgIG5hbWUgPSB0eXBlLnN1YnN0cmluZyhpICsgMSk7XG4gICAgICB0eXBlID0gdHlwZS5zdWJzdHJpbmcoMCwgaSk7XG4gICAgfVxuICAgIGlmICh0eXBlKSByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA8IDIgPyB0aGlzW3R5cGVdLm9uKG5hbWUpIDogdGhpc1t0eXBlXS5vbihuYW1lLCBsaXN0ZW5lcik7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgIGlmIChsaXN0ZW5lciA9PSBudWxsKSBmb3IgKHR5cGUgaW4gdGhpcykge1xuICAgICAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eSh0eXBlKSkgdGhpc1t0eXBlXS5vbihuYW1lLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gZDNfZGlzcGF0Y2hfZXZlbnQoZGlzcGF0Y2gpIHtcbiAgICB2YXIgbGlzdGVuZXJzID0gW10sIGxpc3RlbmVyQnlOYW1lID0gbmV3IGQzX01hcCgpO1xuICAgIGZ1bmN0aW9uIGV2ZW50KCkge1xuICAgICAgdmFyIHogPSBsaXN0ZW5lcnMsIGkgPSAtMSwgbiA9IHoubGVuZ3RoLCBsO1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmIChsID0geltpXS5vbikgbC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIGRpc3BhdGNoO1xuICAgIH1cbiAgICBldmVudC5vbiA9IGZ1bmN0aW9uKG5hbWUsIGxpc3RlbmVyKSB7XG4gICAgICB2YXIgbCA9IGxpc3RlbmVyQnlOYW1lLmdldChuYW1lKSwgaTtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikgcmV0dXJuIGwgJiYgbC5vbjtcbiAgICAgIGlmIChsKSB7XG4gICAgICAgIGwub24gPSBudWxsO1xuICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuc2xpY2UoMCwgaSA9IGxpc3RlbmVycy5pbmRleE9mKGwpKS5jb25jYXQobGlzdGVuZXJzLnNsaWNlKGkgKyAxKSk7XG4gICAgICAgIGxpc3RlbmVyQnlOYW1lLnJlbW92ZShuYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmIChsaXN0ZW5lcikgbGlzdGVuZXJzLnB1c2gobGlzdGVuZXJCeU5hbWUuc2V0KG5hbWUsIHtcbiAgICAgICAgb246IGxpc3RlbmVyXG4gICAgICB9KSk7XG4gICAgICByZXR1cm4gZGlzcGF0Y2g7XG4gICAgfTtcbiAgICByZXR1cm4gZXZlbnQ7XG4gIH1cbiAgZDMuZXZlbnQgPSBudWxsO1xuICBmdW5jdGlvbiBkM19ldmVudFByZXZlbnREZWZhdWx0KCkge1xuICAgIGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIH1cbiAgZnVuY3Rpb24gZDNfZXZlbnRTb3VyY2UoKSB7XG4gICAgdmFyIGUgPSBkMy5ldmVudCwgcztcbiAgICB3aGlsZSAocyA9IGUuc291cmNlRXZlbnQpIGUgPSBzO1xuICAgIHJldHVybiBlO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2V2ZW50RGlzcGF0Y2godGFyZ2V0KSB7XG4gICAgdmFyIGRpc3BhdGNoID0gbmV3IGQzX2Rpc3BhdGNoKCksIGkgPSAwLCBuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB3aGlsZSAoKytpIDwgbikgZGlzcGF0Y2hbYXJndW1lbnRzW2ldXSA9IGQzX2Rpc3BhdGNoX2V2ZW50KGRpc3BhdGNoKTtcbiAgICBkaXNwYXRjaC5vZiA9IGZ1bmN0aW9uKHRoaXosIGFyZ3VtZW50eikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKGUxKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmFyIGUwID0gZTEuc291cmNlRXZlbnQgPSBkMy5ldmVudDtcbiAgICAgICAgICBlMS50YXJnZXQgPSB0YXJnZXQ7XG4gICAgICAgICAgZDMuZXZlbnQgPSBlMTtcbiAgICAgICAgICBkaXNwYXRjaFtlMS50eXBlXS5hcHBseSh0aGl6LCBhcmd1bWVudHopO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIGQzLmV2ZW50ID0gZTA7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcbiAgICByZXR1cm4gZGlzcGF0Y2g7XG4gIH1cbiAgZDMucmVxdW90ZSA9IGZ1bmN0aW9uKHMpIHtcbiAgICByZXR1cm4gcy5yZXBsYWNlKGQzX3JlcXVvdGVfcmUsIFwiXFxcXCQmXCIpO1xuICB9O1xuICB2YXIgZDNfcmVxdW90ZV9yZSA9IC9bXFxcXFxcXlxcJFxcKlxcK1xcP1xcfFxcW1xcXVxcKFxcKVxcLlxce1xcfV0vZztcbiAgdmFyIGQzX3N1YmNsYXNzID0ge30uX19wcm90b19fID8gZnVuY3Rpb24ob2JqZWN0LCBwcm90b3R5cGUpIHtcbiAgICBvYmplY3QuX19wcm90b19fID0gcHJvdG90eXBlO1xuICB9IDogZnVuY3Rpb24ob2JqZWN0LCBwcm90b3R5cGUpIHtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBwcm90b3R5cGUpIG9iamVjdFtwcm9wZXJ0eV0gPSBwcm90b3R5cGVbcHJvcGVydHldO1xuICB9O1xuICBmdW5jdGlvbiBkM19zZWxlY3Rpb24oZ3JvdXBzKSB7XG4gICAgZDNfc3ViY2xhc3MoZ3JvdXBzLCBkM19zZWxlY3Rpb25Qcm90b3R5cGUpO1xuICAgIHJldHVybiBncm91cHM7XG4gIH1cbiAgdmFyIGQzX3NlbGVjdCA9IGZ1bmN0aW9uKHMsIG4pIHtcbiAgICByZXR1cm4gbi5xdWVyeVNlbGVjdG9yKHMpO1xuICB9LCBkM19zZWxlY3RBbGwgPSBmdW5jdGlvbihzLCBuKSB7XG4gICAgcmV0dXJuIG4ucXVlcnlTZWxlY3RvckFsbChzKTtcbiAgfSwgZDNfc2VsZWN0TWF0Y2hlciA9IGQzX2RvY3VtZW50RWxlbWVudFtkM192ZW5kb3JTeW1ib2woZDNfZG9jdW1lbnRFbGVtZW50LCBcIm1hdGNoZXNTZWxlY3RvclwiKV0sIGQzX3NlbGVjdE1hdGNoZXMgPSBmdW5jdGlvbihuLCBzKSB7XG4gICAgcmV0dXJuIGQzX3NlbGVjdE1hdGNoZXIuY2FsbChuLCBzKTtcbiAgfTtcbiAgaWYgKHR5cGVvZiBTaXp6bGUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGQzX3NlbGVjdCA9IGZ1bmN0aW9uKHMsIG4pIHtcbiAgICAgIHJldHVybiBTaXp6bGUocywgbilbMF0gfHwgbnVsbDtcbiAgICB9O1xuICAgIGQzX3NlbGVjdEFsbCA9IGZ1bmN0aW9uKHMsIG4pIHtcbiAgICAgIHJldHVybiBTaXp6bGUudW5pcXVlU29ydChTaXp6bGUocywgbikpO1xuICAgIH07XG4gICAgZDNfc2VsZWN0TWF0Y2hlcyA9IFNpenpsZS5tYXRjaGVzU2VsZWN0b3I7XG4gIH1cbiAgZDMuc2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX3NlbGVjdGlvblJvb3Q7XG4gIH07XG4gIHZhciBkM19zZWxlY3Rpb25Qcm90b3R5cGUgPSBkMy5zZWxlY3Rpb24ucHJvdG90eXBlID0gW107XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS5zZWxlY3QgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgIHZhciBzdWJncm91cHMgPSBbXSwgc3ViZ3JvdXAsIHN1Ym5vZGUsIGdyb3VwLCBub2RlO1xuICAgIHNlbGVjdG9yID0gZDNfc2VsZWN0aW9uX3NlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBmb3IgKHZhciBqID0gLTEsIG0gPSB0aGlzLmxlbmd0aDsgKytqIDwgbTsgKSB7XG4gICAgICBzdWJncm91cHMucHVzaChzdWJncm91cCA9IFtdKTtcbiAgICAgIHN1Ymdyb3VwLnBhcmVudE5vZGUgPSAoZ3JvdXAgPSB0aGlzW2pdKS5wYXJlbnROb2RlO1xuICAgICAgZm9yICh2YXIgaSA9IC0xLCBuID0gZ3JvdXAubGVuZ3RoOyArK2kgPCBuOyApIHtcbiAgICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgICAgIHN1Ymdyb3VwLnB1c2goc3Vibm9kZSA9IHNlbGVjdG9yLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgaikpO1xuICAgICAgICAgIGlmIChzdWJub2RlICYmIFwiX19kYXRhX19cIiBpbiBub2RlKSBzdWJub2RlLl9fZGF0YV9fID0gbm9kZS5fX2RhdGFfXztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWJncm91cC5wdXNoKG51bGwpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkM19zZWxlY3Rpb24oc3ViZ3JvdXBzKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfc2VsZWN0aW9uX3NlbGVjdG9yKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBzZWxlY3RvciA9PT0gXCJmdW5jdGlvblwiID8gc2VsZWN0b3IgOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBkM19zZWxlY3Qoc2VsZWN0b3IsIHRoaXMpO1xuICAgIH07XG4gIH1cbiAgZDNfc2VsZWN0aW9uUHJvdG90eXBlLnNlbGVjdEFsbCA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgdmFyIHN1Ymdyb3VwcyA9IFtdLCBzdWJncm91cCwgbm9kZTtcbiAgICBzZWxlY3RvciA9IGQzX3NlbGVjdGlvbl9zZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgZm9yICh2YXIgaiA9IC0xLCBtID0gdGhpcy5sZW5ndGg7ICsraiA8IG07ICkge1xuICAgICAgZm9yICh2YXIgZ3JvdXAgPSB0aGlzW2pdLCBpID0gLTEsIG4gPSBncm91cC5sZW5ndGg7ICsraSA8IG47ICkge1xuICAgICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgICAgc3ViZ3JvdXBzLnB1c2goc3ViZ3JvdXAgPSBkM19hcnJheShzZWxlY3Rvci5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGopKSk7XG4gICAgICAgICAgc3ViZ3JvdXAucGFyZW50Tm9kZSA9IG5vZGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGQzX3NlbGVjdGlvbihzdWJncm91cHMpO1xuICB9O1xuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25fc2VsZWN0b3JBbGwoc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gdHlwZW9mIHNlbGVjdG9yID09PSBcImZ1bmN0aW9uXCIgPyBzZWxlY3RvciA6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGQzX3NlbGVjdEFsbChzZWxlY3RvciwgdGhpcyk7XG4gICAgfTtcbiAgfVxuICB2YXIgZDNfbnNQcmVmaXggPSB7XG4gICAgc3ZnOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsXG4gICAgeGh0bWw6IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLFxuICAgIHhsaW5rOiBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIixcbiAgICB4bWw6IFwiaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlXCIsXG4gICAgeG1sbnM6IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC94bWxucy9cIlxuICB9O1xuICBkMy5ucyA9IHtcbiAgICBwcmVmaXg6IGQzX25zUHJlZml4LFxuICAgIHF1YWxpZnk6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBpID0gbmFtZS5pbmRleE9mKFwiOlwiKSwgcHJlZml4ID0gbmFtZTtcbiAgICAgIGlmIChpID49IDApIHtcbiAgICAgICAgcHJlZml4ID0gbmFtZS5zdWJzdHJpbmcoMCwgaSk7XG4gICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZyhpICsgMSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZDNfbnNQcmVmaXguaGFzT3duUHJvcGVydHkocHJlZml4KSA/IHtcbiAgICAgICAgc3BhY2U6IGQzX25zUHJlZml4W3ByZWZpeF0sXG4gICAgICAgIGxvY2FsOiBuYW1lXG4gICAgICB9IDogbmFtZTtcbiAgICB9XG4gIH07XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS5hdHRyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXMubm9kZSgpO1xuICAgICAgICBuYW1lID0gZDMubnMucXVhbGlmeShuYW1lKTtcbiAgICAgICAgcmV0dXJuIG5hbWUubG9jYWwgPyBub2RlLmdldEF0dHJpYnV0ZU5TKG5hbWUuc3BhY2UsIG5hbWUubG9jYWwpIDogbm9kZS5nZXRBdHRyaWJ1dGUobmFtZSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhbHVlIGluIG5hbWUpIHRoaXMuZWFjaChkM19zZWxlY3Rpb25fYXR0cih2YWx1ZSwgbmFtZVt2YWx1ZV0pKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lYWNoKGQzX3NlbGVjdGlvbl9hdHRyKG5hbWUsIHZhbHVlKSk7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3NlbGVjdGlvbl9hdHRyKG5hbWUsIHZhbHVlKSB7XG4gICAgbmFtZSA9IGQzLm5zLnF1YWxpZnkobmFtZSk7XG4gICAgZnVuY3Rpb24gYXR0ck51bGwoKSB7XG4gICAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gYXR0ck51bGxOUygpIHtcbiAgICAgIHRoaXMucmVtb3ZlQXR0cmlidXRlTlMobmFtZS5zcGFjZSwgbmFtZS5sb2NhbCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGF0dHJDb25zdGFudCgpIHtcbiAgICAgIHRoaXMuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gYXR0ckNvbnN0YW50TlMoKSB7XG4gICAgICB0aGlzLnNldEF0dHJpYnV0ZU5TKG5hbWUuc3BhY2UsIG5hbWUubG9jYWwsIHZhbHVlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gYXR0ckZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHggPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKHggPT0gbnVsbCkgdGhpcy5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7IGVsc2UgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgeCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGF0dHJGdW5jdGlvbk5TKCkge1xuICAgICAgdmFyIHggPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKHggPT0gbnVsbCkgdGhpcy5yZW1vdmVBdHRyaWJ1dGVOUyhuYW1lLnNwYWNlLCBuYW1lLmxvY2FsKTsgZWxzZSB0aGlzLnNldEF0dHJpYnV0ZU5TKG5hbWUuc3BhY2UsIG5hbWUubG9jYWwsIHgpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWUgPT0gbnVsbCA/IG5hbWUubG9jYWwgPyBhdHRyTnVsbE5TIDogYXR0ck51bGwgOiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIiA/IG5hbWUubG9jYWwgPyBhdHRyRnVuY3Rpb25OUyA6IGF0dHJGdW5jdGlvbiA6IG5hbWUubG9jYWwgPyBhdHRyQ29uc3RhbnROUyA6IGF0dHJDb25zdGFudDtcbiAgfVxuICBmdW5jdGlvbiBkM19jb2xsYXBzZShzKSB7XG4gICAgcmV0dXJuIHMudHJpbSgpLnJlcGxhY2UoL1xccysvZywgXCIgXCIpO1xuICB9XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS5jbGFzc2VkID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXMubm9kZSgpLCBuID0gKG5hbWUgPSBkM19zZWxlY3Rpb25fY2xhc3NlcyhuYW1lKSkubGVuZ3RoLCBpID0gLTE7XG4gICAgICAgIGlmICh2YWx1ZSA9IG5vZGUuY2xhc3NMaXN0KSB7XG4gICAgICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICghdmFsdWUuY29udGFpbnMobmFtZVtpXSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IG5vZGUuZ2V0QXR0cmlidXRlKFwiY2xhc3NcIik7XG4gICAgICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICghZDNfc2VsZWN0aW9uX2NsYXNzZWRSZShuYW1lW2ldKS50ZXN0KHZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgZm9yICh2YWx1ZSBpbiBuYW1lKSB0aGlzLmVhY2goZDNfc2VsZWN0aW9uX2NsYXNzZWQodmFsdWUsIG5hbWVbdmFsdWVdKSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZWFjaChkM19zZWxlY3Rpb25fY2xhc3NlZChuYW1lLCB2YWx1ZSkpO1xuICB9O1xuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25fY2xhc3NlZFJlKG5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFJlZ0V4cChcIig/Ol58XFxcXHMrKVwiICsgZDMucmVxdW90ZShuYW1lKSArIFwiKD86XFxcXHMrfCQpXCIsIFwiZ1wiKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25fY2xhc3NlcyhuYW1lKSB7XG4gICAgcmV0dXJuIG5hbWUudHJpbSgpLnNwbGl0KC9efFxccysvKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25fY2xhc3NlZChuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBkM19zZWxlY3Rpb25fY2xhc3NlcyhuYW1lKS5tYXAoZDNfc2VsZWN0aW9uX2NsYXNzZWROYW1lKTtcbiAgICB2YXIgbiA9IG5hbWUubGVuZ3RoO1xuICAgIGZ1bmN0aW9uIGNsYXNzZWRDb25zdGFudCgpIHtcbiAgICAgIHZhciBpID0gLTE7XG4gICAgICB3aGlsZSAoKytpIDwgbikgbmFtZVtpXSh0aGlzLCB2YWx1ZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNsYXNzZWRGdW5jdGlvbigpIHtcbiAgICAgIHZhciBpID0gLTEsIHggPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgd2hpbGUgKCsraSA8IG4pIG5hbWVbaV0odGhpcywgeCk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIiA/IGNsYXNzZWRGdW5jdGlvbiA6IGNsYXNzZWRDb25zdGFudDtcbiAgfVxuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25fY2xhc3NlZE5hbWUobmFtZSkge1xuICAgIHZhciByZSA9IGQzX3NlbGVjdGlvbl9jbGFzc2VkUmUobmFtZSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG5vZGUsIHZhbHVlKSB7XG4gICAgICBpZiAoYyA9IG5vZGUuY2xhc3NMaXN0KSByZXR1cm4gdmFsdWUgPyBjLmFkZChuYW1lKSA6IGMucmVtb3ZlKG5hbWUpO1xuICAgICAgdmFyIGMgPSBub2RlLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpIHx8IFwiXCI7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgcmUubGFzdEluZGV4ID0gMDtcbiAgICAgICAgaWYgKCFyZS50ZXN0KGMpKSBub2RlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGQzX2NvbGxhcHNlKGMgKyBcIiBcIiArIG5hbWUpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgZDNfY29sbGFwc2UoYy5yZXBsYWNlKHJlLCBcIiBcIikpKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS5zdHlsZSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICAgIHZhciBuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBpZiAobiA8IDMpIHtcbiAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICBpZiAobiA8IDIpIHZhbHVlID0gXCJcIjtcbiAgICAgICAgZm9yIChwcmlvcml0eSBpbiBuYW1lKSB0aGlzLmVhY2goZDNfc2VsZWN0aW9uX3N0eWxlKHByaW9yaXR5LCBuYW1lW3ByaW9yaXR5XSwgdmFsdWUpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBpZiAobiA8IDIpIHJldHVybiBkM193aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLm5vZGUoKSwgbnVsbCkuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKTtcbiAgICAgIHByaW9yaXR5ID0gXCJcIjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZWFjaChkM19zZWxlY3Rpb25fc3R5bGUobmFtZSwgdmFsdWUsIHByaW9yaXR5KSk7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3NlbGVjdGlvbl9zdHlsZShuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgICBmdW5jdGlvbiBzdHlsZU51bGwoKSB7XG4gICAgICB0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzdHlsZUNvbnN0YW50KCkge1xuICAgICAgdGhpcy5zdHlsZS5zZXRQcm9wZXJ0eShuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzdHlsZUZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHggPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKHggPT0gbnVsbCkgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTsgZWxzZSB0aGlzLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIHgsIHByaW9yaXR5KTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlID09IG51bGwgPyBzdHlsZU51bGwgOiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIiA/IHN0eWxlRnVuY3Rpb24gOiBzdHlsZUNvbnN0YW50O1xuICB9XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS5wcm9wZXJ0eSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3RyaW5nXCIpIHJldHVybiB0aGlzLm5vZGUoKVtuYW1lXTtcbiAgICAgIGZvciAodmFsdWUgaW4gbmFtZSkgdGhpcy5lYWNoKGQzX3NlbGVjdGlvbl9wcm9wZXJ0eSh2YWx1ZSwgbmFtZVt2YWx1ZV0pKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lYWNoKGQzX3NlbGVjdGlvbl9wcm9wZXJ0eShuYW1lLCB2YWx1ZSkpO1xuICB9O1xuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25fcHJvcGVydHkobmFtZSwgdmFsdWUpIHtcbiAgICBmdW5jdGlvbiBwcm9wZXJ0eU51bGwoKSB7XG4gICAgICBkZWxldGUgdGhpc1tuYW1lXTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcHJvcGVydHlDb25zdGFudCgpIHtcbiAgICAgIHRoaXNbbmFtZV0gPSB2YWx1ZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcHJvcGVydHlGdW5jdGlvbigpIHtcbiAgICAgIHZhciB4ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGlmICh4ID09IG51bGwpIGRlbGV0ZSB0aGlzW25hbWVdOyBlbHNlIHRoaXNbbmFtZV0gPSB4O1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWUgPT0gbnVsbCA/IHByb3BlcnR5TnVsbCA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiID8gcHJvcGVydHlGdW5jdGlvbiA6IHByb3BlcnR5Q29uc3RhbnQ7XG4gIH1cbiAgZDNfc2VsZWN0aW9uUHJvdG90eXBlLnRleHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gdGhpcy5lYWNoKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiID8gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB0aGlzLnRleHRDb250ZW50ID0gdiA9PSBudWxsID8gXCJcIiA6IHY7XG4gICAgfSA6IHZhbHVlID09IG51bGwgPyBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudGV4dENvbnRlbnQgPSBcIlwiO1xuICAgIH0gOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgICB9KSA6IHRoaXMubm9kZSgpLnRleHRDb250ZW50O1xuICB9O1xuICBkM19zZWxlY3Rpb25Qcm90b3R5cGUuaHRtbCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyB0aGlzLmVhY2godHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIgPyBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHRoaXMuaW5uZXJIVE1MID0gdiA9PSBudWxsID8gXCJcIiA6IHY7XG4gICAgfSA6IHZhbHVlID09IG51bGwgPyBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuaW5uZXJIVE1MID0gXCJcIjtcbiAgICB9IDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmlubmVySFRNTCA9IHZhbHVlO1xuICAgIH0pIDogdGhpcy5ub2RlKCkuaW5uZXJIVE1MO1xuICB9O1xuICBkM19zZWxlY3Rpb25Qcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBkM19zZWxlY3Rpb25fY3JlYXRvcihuYW1lKTtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3QoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5hcHBlbmRDaGlsZChuYW1lLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgIH0pO1xuICB9O1xuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25fY3JlYXRvcihuYW1lKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBuYW1lID09PSBcImZ1bmN0aW9uXCIgPyBuYW1lIDogKG5hbWUgPSBkMy5ucy5xdWFsaWZ5KG5hbWUpKS5sb2NhbCA/IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMub3duZXJEb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobmFtZS5zcGFjZSwgbmFtZS5sb2NhbCk7XG4gICAgfSA6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMub3duZXJEb2N1bWVudC5jcmVhdGVFbGVtZW50TlModGhpcy5uYW1lc3BhY2VVUkksIG5hbWUpO1xuICAgIH07XG4gIH1cbiAgZDNfc2VsZWN0aW9uUHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uKG5hbWUsIGJlZm9yZSkge1xuICAgIG5hbWUgPSBkM19zZWxlY3Rpb25fY3JlYXRvcihuYW1lKTtcbiAgICBiZWZvcmUgPSBkM19zZWxlY3Rpb25fc2VsZWN0b3IoYmVmb3JlKTtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3QoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5pbnNlcnRCZWZvcmUobmFtZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpLCBiZWZvcmUuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCBudWxsKTtcbiAgICB9KTtcbiAgfTtcbiAgZDNfc2VsZWN0aW9uUHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnROb2RlO1xuICAgICAgaWYgKHBhcmVudCkgcGFyZW50LnJlbW92ZUNoaWxkKHRoaXMpO1xuICAgIH0pO1xuICB9O1xuICBkM19zZWxlY3Rpb25Qcm90b3R5cGUuZGF0YSA9IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICB2YXIgaSA9IC0xLCBuID0gdGhpcy5sZW5ndGgsIGdyb3VwLCBub2RlO1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgdmFsdWUgPSBuZXcgQXJyYXkobiA9IChncm91cCA9IHRoaXNbMF0pLmxlbmd0aCk7XG4gICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgICAgdmFsdWVbaV0gPSBub2RlLl9fZGF0YV9fO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGJpbmQoZ3JvdXAsIGdyb3VwRGF0YSkge1xuICAgICAgdmFyIGksIG4gPSBncm91cC5sZW5ndGgsIG0gPSBncm91cERhdGEubGVuZ3RoLCBuMCA9IE1hdGgubWluKG4sIG0pLCB1cGRhdGVOb2RlcyA9IG5ldyBBcnJheShtKSwgZW50ZXJOb2RlcyA9IG5ldyBBcnJheShtKSwgZXhpdE5vZGVzID0gbmV3IEFycmF5KG4pLCBub2RlLCBub2RlRGF0YTtcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgdmFyIG5vZGVCeUtleVZhbHVlID0gbmV3IGQzX01hcCgpLCBkYXRhQnlLZXlWYWx1ZSA9IG5ldyBkM19NYXAoKSwga2V5VmFsdWVzID0gW10sIGtleVZhbHVlO1xuICAgICAgICBmb3IgKGkgPSAtMTsgKytpIDwgbjsgKSB7XG4gICAgICAgICAga2V5VmFsdWUgPSBrZXkuY2FsbChub2RlID0gZ3JvdXBbaV0sIG5vZGUuX19kYXRhX18sIGkpO1xuICAgICAgICAgIGlmIChub2RlQnlLZXlWYWx1ZS5oYXMoa2V5VmFsdWUpKSB7XG4gICAgICAgICAgICBleGl0Tm9kZXNbaV0gPSBub2RlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBub2RlQnlLZXlWYWx1ZS5zZXQoa2V5VmFsdWUsIG5vZGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBrZXlWYWx1ZXMucHVzaChrZXlWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gLTE7ICsraSA8IG07ICkge1xuICAgICAgICAgIGtleVZhbHVlID0ga2V5LmNhbGwoZ3JvdXBEYXRhLCBub2RlRGF0YSA9IGdyb3VwRGF0YVtpXSwgaSk7XG4gICAgICAgICAgaWYgKG5vZGUgPSBub2RlQnlLZXlWYWx1ZS5nZXQoa2V5VmFsdWUpKSB7XG4gICAgICAgICAgICB1cGRhdGVOb2Rlc1tpXSA9IG5vZGU7XG4gICAgICAgICAgICBub2RlLl9fZGF0YV9fID0gbm9kZURhdGE7XG4gICAgICAgICAgfSBlbHNlIGlmICghZGF0YUJ5S2V5VmFsdWUuaGFzKGtleVZhbHVlKSkge1xuICAgICAgICAgICAgZW50ZXJOb2Rlc1tpXSA9IGQzX3NlbGVjdGlvbl9kYXRhTm9kZShub2RlRGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRhdGFCeUtleVZhbHVlLnNldChrZXlWYWx1ZSwgbm9kZURhdGEpO1xuICAgICAgICAgIG5vZGVCeUtleVZhbHVlLnJlbW92ZShrZXlWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gLTE7ICsraSA8IG47ICkge1xuICAgICAgICAgIGlmIChub2RlQnlLZXlWYWx1ZS5oYXMoa2V5VmFsdWVzW2ldKSkge1xuICAgICAgICAgICAgZXhpdE5vZGVzW2ldID0gZ3JvdXBbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGkgPSAtMTsgKytpIDwgbjA7ICkge1xuICAgICAgICAgIG5vZGUgPSBncm91cFtpXTtcbiAgICAgICAgICBub2RlRGF0YSA9IGdyb3VwRGF0YVtpXTtcbiAgICAgICAgICBpZiAobm9kZSkge1xuICAgICAgICAgICAgbm9kZS5fX2RhdGFfXyA9IG5vZGVEYXRhO1xuICAgICAgICAgICAgdXBkYXRlTm9kZXNbaV0gPSBub2RlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbnRlck5vZGVzW2ldID0gZDNfc2VsZWN0aW9uX2RhdGFOb2RlKG5vZGVEYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yICg7aSA8IG07ICsraSkge1xuICAgICAgICAgIGVudGVyTm9kZXNbaV0gPSBkM19zZWxlY3Rpb25fZGF0YU5vZGUoZ3JvdXBEYXRhW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKDtpIDwgbjsgKytpKSB7XG4gICAgICAgICAgZXhpdE5vZGVzW2ldID0gZ3JvdXBbaV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVudGVyTm9kZXMudXBkYXRlID0gdXBkYXRlTm9kZXM7XG4gICAgICBlbnRlck5vZGVzLnBhcmVudE5vZGUgPSB1cGRhdGVOb2Rlcy5wYXJlbnROb2RlID0gZXhpdE5vZGVzLnBhcmVudE5vZGUgPSBncm91cC5wYXJlbnROb2RlO1xuICAgICAgZW50ZXIucHVzaChlbnRlck5vZGVzKTtcbiAgICAgIHVwZGF0ZS5wdXNoKHVwZGF0ZU5vZGVzKTtcbiAgICAgIGV4aXQucHVzaChleGl0Tm9kZXMpO1xuICAgIH1cbiAgICB2YXIgZW50ZXIgPSBkM19zZWxlY3Rpb25fZW50ZXIoW10pLCB1cGRhdGUgPSBkM19zZWxlY3Rpb24oW10pLCBleGl0ID0gZDNfc2VsZWN0aW9uKFtdKTtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIGJpbmQoZ3JvdXAgPSB0aGlzW2ldLCB2YWx1ZS5jYWxsKGdyb3VwLCBncm91cC5wYXJlbnROb2RlLl9fZGF0YV9fLCBpKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIGJpbmQoZ3JvdXAgPSB0aGlzW2ldLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHVwZGF0ZS5lbnRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGVudGVyO1xuICAgIH07XG4gICAgdXBkYXRlLmV4aXQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleGl0O1xuICAgIH07XG4gICAgcmV0dXJuIHVwZGF0ZTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfc2VsZWN0aW9uX2RhdGFOb2RlKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgX19kYXRhX186IGRhdGFcbiAgICB9O1xuICB9XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS5kYXR1bSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyB0aGlzLnByb3BlcnR5KFwiX19kYXRhX19cIiwgdmFsdWUpIDogdGhpcy5wcm9wZXJ0eShcIl9fZGF0YV9fXCIpO1xuICB9O1xuICBkM19zZWxlY3Rpb25Qcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgdmFyIHN1Ymdyb3VwcyA9IFtdLCBzdWJncm91cCwgZ3JvdXAsIG5vZGU7XG4gICAgaWYgKHR5cGVvZiBmaWx0ZXIgIT09IFwiZnVuY3Rpb25cIikgZmlsdGVyID0gZDNfc2VsZWN0aW9uX2ZpbHRlcihmaWx0ZXIpO1xuICAgIGZvciAodmFyIGogPSAwLCBtID0gdGhpcy5sZW5ndGg7IGogPCBtOyBqKyspIHtcbiAgICAgIHN1Ymdyb3Vwcy5wdXNoKHN1Ymdyb3VwID0gW10pO1xuICAgICAgc3ViZ3JvdXAucGFyZW50Tm9kZSA9IChncm91cCA9IHRoaXNbal0pLnBhcmVudE5vZGU7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGdyb3VwLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgZmlsdGVyLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgaikpIHtcbiAgICAgICAgICBzdWJncm91cC5wdXNoKG5vZGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkM19zZWxlY3Rpb24oc3ViZ3JvdXBzKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfc2VsZWN0aW9uX2ZpbHRlcihzZWxlY3Rvcikge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBkM19zZWxlY3RNYXRjaGVzKHRoaXMsIHNlbGVjdG9yKTtcbiAgICB9O1xuICB9XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS5vcmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGogPSAtMSwgbSA9IHRoaXMubGVuZ3RoOyArK2ogPCBtOyApIHtcbiAgICAgIGZvciAodmFyIGdyb3VwID0gdGhpc1tqXSwgaSA9IGdyb3VwLmxlbmd0aCAtIDEsIG5leHQgPSBncm91cFtpXSwgbm9kZTsgLS1pID49IDA7ICkge1xuICAgICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgICAgaWYgKG5leHQgJiYgbmV4dCAhPT0gbm9kZS5uZXh0U2libGluZykgbmV4dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBuZXh0KTtcbiAgICAgICAgICBuZXh0ID0gbm9kZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbiAgZDNfc2VsZWN0aW9uUHJvdG90eXBlLnNvcnQgPSBmdW5jdGlvbihjb21wYXJhdG9yKSB7XG4gICAgY29tcGFyYXRvciA9IGQzX3NlbGVjdGlvbl9zb3J0Q29tcGFyYXRvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGZvciAodmFyIGogPSAtMSwgbSA9IHRoaXMubGVuZ3RoOyArK2ogPCBtOyApIHRoaXNbal0uc29ydChjb21wYXJhdG9yKTtcbiAgICByZXR1cm4gdGhpcy5vcmRlcigpO1xuICB9O1xuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25fc29ydENvbXBhcmF0b3IoY29tcGFyYXRvcikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgY29tcGFyYXRvciA9IGQzLmFzY2VuZGluZztcbiAgICByZXR1cm4gZnVuY3Rpb24oYSwgYikge1xuICAgICAgcmV0dXJuIGEgJiYgYiA/IGNvbXBhcmF0b3IoYS5fX2RhdGFfXywgYi5fX2RhdGFfXykgOiAhYSAtICFiO1xuICAgIH07XG4gIH1cbiAgZDNfc2VsZWN0aW9uUHJvdG90eXBlLmVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHJldHVybiBkM19zZWxlY3Rpb25fZWFjaCh0aGlzLCBmdW5jdGlvbihub2RlLCBpLCBqKSB7XG4gICAgICBjYWxsYmFjay5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGopO1xuICAgIH0pO1xuICB9O1xuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25fZWFjaChncm91cHMsIGNhbGxiYWNrKSB7XG4gICAgZm9yICh2YXIgaiA9IDAsIG0gPSBncm91cHMubGVuZ3RoOyBqIDwgbTsgaisrKSB7XG4gICAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgaSA9IDAsIG4gPSBncm91cC5sZW5ndGgsIG5vZGU7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkgY2FsbGJhY2sobm9kZSwgaSwgaik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBncm91cHM7XG4gIH1cbiAgZDNfc2VsZWN0aW9uUHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciBhcmdzID0gZDNfYXJyYXkoYXJndW1lbnRzKTtcbiAgICBjYWxsYmFjay5hcHBseShhcmdzWzBdID0gdGhpcywgYXJncyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS5lbXB0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAhdGhpcy5ub2RlKCk7XG4gIH07XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS5ub2RlID0gZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaiA9IDAsIG0gPSB0aGlzLmxlbmd0aDsgaiA8IG07IGorKykge1xuICAgICAgZm9yICh2YXIgZ3JvdXAgPSB0aGlzW2pdLCBpID0gMCwgbiA9IGdyb3VwLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICB2YXIgbm9kZSA9IGdyb3VwW2ldO1xuICAgICAgICBpZiAobm9kZSkgcmV0dXJuIG5vZGU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9O1xuICBkM19zZWxlY3Rpb25Qcm90b3R5cGUuc2l6ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBuID0gMDtcbiAgICB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICArK247XG4gICAgfSk7XG4gICAgcmV0dXJuIG47XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3NlbGVjdGlvbl9lbnRlcihzZWxlY3Rpb24pIHtcbiAgICBkM19zdWJjbGFzcyhzZWxlY3Rpb24sIGQzX3NlbGVjdGlvbl9lbnRlclByb3RvdHlwZSk7XG4gICAgcmV0dXJuIHNlbGVjdGlvbjtcbiAgfVxuICB2YXIgZDNfc2VsZWN0aW9uX2VudGVyUHJvdG90eXBlID0gW107XG4gIGQzLnNlbGVjdGlvbi5lbnRlciA9IGQzX3NlbGVjdGlvbl9lbnRlcjtcbiAgZDMuc2VsZWN0aW9uLmVudGVyLnByb3RvdHlwZSA9IGQzX3NlbGVjdGlvbl9lbnRlclByb3RvdHlwZTtcbiAgZDNfc2VsZWN0aW9uX2VudGVyUHJvdG90eXBlLmFwcGVuZCA9IGQzX3NlbGVjdGlvblByb3RvdHlwZS5hcHBlbmQ7XG4gIGQzX3NlbGVjdGlvbl9lbnRlclByb3RvdHlwZS5lbXB0eSA9IGQzX3NlbGVjdGlvblByb3RvdHlwZS5lbXB0eTtcbiAgZDNfc2VsZWN0aW9uX2VudGVyUHJvdG90eXBlLm5vZGUgPSBkM19zZWxlY3Rpb25Qcm90b3R5cGUubm9kZTtcbiAgZDNfc2VsZWN0aW9uX2VudGVyUHJvdG90eXBlLmNhbGwgPSBkM19zZWxlY3Rpb25Qcm90b3R5cGUuY2FsbDtcbiAgZDNfc2VsZWN0aW9uX2VudGVyUHJvdG90eXBlLnNpemUgPSBkM19zZWxlY3Rpb25Qcm90b3R5cGUuc2l6ZTtcbiAgZDNfc2VsZWN0aW9uX2VudGVyUHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgdmFyIHN1Ymdyb3VwcyA9IFtdLCBzdWJncm91cCwgc3Vibm9kZSwgdXBncm91cCwgZ3JvdXAsIG5vZGU7XG4gICAgZm9yICh2YXIgaiA9IC0xLCBtID0gdGhpcy5sZW5ndGg7ICsraiA8IG07ICkge1xuICAgICAgdXBncm91cCA9IChncm91cCA9IHRoaXNbal0pLnVwZGF0ZTtcbiAgICAgIHN1Ymdyb3Vwcy5wdXNoKHN1Ymdyb3VwID0gW10pO1xuICAgICAgc3ViZ3JvdXAucGFyZW50Tm9kZSA9IGdyb3VwLnBhcmVudE5vZGU7XG4gICAgICBmb3IgKHZhciBpID0gLTEsIG4gPSBncm91cC5sZW5ndGg7ICsraSA8IG47ICkge1xuICAgICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgICAgc3ViZ3JvdXAucHVzaCh1cGdyb3VwW2ldID0gc3Vibm9kZSA9IHNlbGVjdG9yLmNhbGwoZ3JvdXAucGFyZW50Tm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgaikpO1xuICAgICAgICAgIHN1Ym5vZGUuX19kYXRhX18gPSBub2RlLl9fZGF0YV9fO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1Ymdyb3VwLnB1c2gobnVsbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGQzX3NlbGVjdGlvbihzdWJncm91cHMpO1xuICB9O1xuICBkM19zZWxlY3Rpb25fZW50ZXJQcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24obmFtZSwgYmVmb3JlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSBiZWZvcmUgPSBkM19zZWxlY3Rpb25fZW50ZXJJbnNlcnRCZWZvcmUodGhpcyk7XG4gICAgcmV0dXJuIGQzX3NlbGVjdGlvblByb3RvdHlwZS5pbnNlcnQuY2FsbCh0aGlzLCBuYW1lLCBiZWZvcmUpO1xuICB9O1xuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25fZW50ZXJJbnNlcnRCZWZvcmUoZW50ZXIpIHtcbiAgICB2YXIgaTAsIGowO1xuICAgIHJldHVybiBmdW5jdGlvbihkLCBpLCBqKSB7XG4gICAgICB2YXIgZ3JvdXAgPSBlbnRlcltqXS51cGRhdGUsIG4gPSBncm91cC5sZW5ndGgsIG5vZGU7XG4gICAgICBpZiAoaiAhPSBqMCkgajAgPSBqLCBpMCA9IDA7XG4gICAgICBpZiAoaSA+PSBpMCkgaTAgPSBpICsgMTtcbiAgICAgIHdoaWxlICghKG5vZGUgPSBncm91cFtpMF0pICYmICsraTAgPCBuKSA7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9O1xuICB9XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS50cmFuc2l0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGlkID0gZDNfdHJhbnNpdGlvbkluaGVyaXRJZCB8fCArK2QzX3RyYW5zaXRpb25JZCwgc3ViZ3JvdXBzID0gW10sIHN1Ymdyb3VwLCBub2RlLCB0cmFuc2l0aW9uID0gZDNfdHJhbnNpdGlvbkluaGVyaXQgfHwge1xuICAgICAgdGltZTogRGF0ZS5ub3coKSxcbiAgICAgIGVhc2U6IGQzX2Vhc2VfY3ViaWNJbk91dCxcbiAgICAgIGRlbGF5OiAwLFxuICAgICAgZHVyYXRpb246IDI1MFxuICAgIH07XG4gICAgZm9yICh2YXIgaiA9IC0xLCBtID0gdGhpcy5sZW5ndGg7ICsraiA8IG07ICkge1xuICAgICAgc3ViZ3JvdXBzLnB1c2goc3ViZ3JvdXAgPSBbXSk7XG4gICAgICBmb3IgKHZhciBncm91cCA9IHRoaXNbal0sIGkgPSAtMSwgbiA9IGdyb3VwLmxlbmd0aDsgKytpIDwgbjsgKSB7XG4gICAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIGQzX3RyYW5zaXRpb25Ob2RlKG5vZGUsIGksIGlkLCB0cmFuc2l0aW9uKTtcbiAgICAgICAgc3ViZ3JvdXAucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGQzX3RyYW5zaXRpb24oc3ViZ3JvdXBzLCBpZCk7XG4gIH07XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS5pbnRlcnJ1cHQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5lYWNoKGQzX3NlbGVjdGlvbl9pbnRlcnJ1cHQpO1xuICB9O1xuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25faW50ZXJydXB0KCkge1xuICAgIHZhciBsb2NrID0gdGhpcy5fX3RyYW5zaXRpb25fXztcbiAgICBpZiAobG9jaykgKytsb2NrLmFjdGl2ZTtcbiAgfVxuICBkMy5zZWxlY3QgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIGdyb3VwID0gWyB0eXBlb2Ygbm9kZSA9PT0gXCJzdHJpbmdcIiA/IGQzX3NlbGVjdChub2RlLCBkM19kb2N1bWVudCkgOiBub2RlIF07XG4gICAgZ3JvdXAucGFyZW50Tm9kZSA9IGQzX2RvY3VtZW50RWxlbWVudDtcbiAgICByZXR1cm4gZDNfc2VsZWN0aW9uKFsgZ3JvdXAgXSk7XG4gIH07XG4gIGQzLnNlbGVjdEFsbCA9IGZ1bmN0aW9uKG5vZGVzKSB7XG4gICAgdmFyIGdyb3VwID0gZDNfYXJyYXkodHlwZW9mIG5vZGVzID09PSBcInN0cmluZ1wiID8gZDNfc2VsZWN0QWxsKG5vZGVzLCBkM19kb2N1bWVudCkgOiBub2Rlcyk7XG4gICAgZ3JvdXAucGFyZW50Tm9kZSA9IGQzX2RvY3VtZW50RWxlbWVudDtcbiAgICByZXR1cm4gZDNfc2VsZWN0aW9uKFsgZ3JvdXAgXSk7XG4gIH07XG4gIHZhciBkM19zZWxlY3Rpb25Sb290ID0gZDMuc2VsZWN0KGQzX2RvY3VtZW50RWxlbWVudCk7XG4gIGQzX3NlbGVjdGlvblByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyLCBjYXB0dXJlKSB7XG4gICAgdmFyIG4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGlmIChuIDwgMykge1xuICAgICAgaWYgKHR5cGVvZiB0eXBlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGlmIChuIDwgMikgbGlzdGVuZXIgPSBmYWxzZTtcbiAgICAgICAgZm9yIChjYXB0dXJlIGluIHR5cGUpIHRoaXMuZWFjaChkM19zZWxlY3Rpb25fb24oY2FwdHVyZSwgdHlwZVtjYXB0dXJlXSwgbGlzdGVuZXIpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBpZiAobiA8IDIpIHJldHVybiAobiA9IHRoaXMubm9kZSgpW1wiX19vblwiICsgdHlwZV0pICYmIG4uXztcbiAgICAgIGNhcHR1cmUgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZWFjaChkM19zZWxlY3Rpb25fb24odHlwZSwgbGlzdGVuZXIsIGNhcHR1cmUpKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfc2VsZWN0aW9uX29uKHR5cGUsIGxpc3RlbmVyLCBjYXB0dXJlKSB7XG4gICAgdmFyIG5hbWUgPSBcIl9fb25cIiArIHR5cGUsIGkgPSB0eXBlLmluZGV4T2YoXCIuXCIpLCB3cmFwID0gZDNfc2VsZWN0aW9uX29uTGlzdGVuZXI7XG4gICAgaWYgKGkgPiAwKSB0eXBlID0gdHlwZS5zdWJzdHJpbmcoMCwgaSk7XG4gICAgdmFyIGZpbHRlciA9IGQzX3NlbGVjdGlvbl9vbkZpbHRlcnMuZ2V0KHR5cGUpO1xuICAgIGlmIChmaWx0ZXIpIHR5cGUgPSBmaWx0ZXIsIHdyYXAgPSBkM19zZWxlY3Rpb25fb25GaWx0ZXI7XG4gICAgZnVuY3Rpb24gb25SZW1vdmUoKSB7XG4gICAgICB2YXIgbCA9IHRoaXNbbmFtZV07XG4gICAgICBpZiAobCkge1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbCwgbC4kKTtcbiAgICAgICAgZGVsZXRlIHRoaXNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIG9uQWRkKCkge1xuICAgICAgdmFyIGwgPSB3cmFwKGxpc3RlbmVyLCBkM19hcnJheShhcmd1bWVudHMpKTtcbiAgICAgIG9uUmVtb3ZlLmNhbGwodGhpcyk7XG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgdGhpc1tuYW1lXSA9IGwsIGwuJCA9IGNhcHR1cmUpO1xuICAgICAgbC5fID0gbGlzdGVuZXI7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbW92ZUFsbCgpIHtcbiAgICAgIHZhciByZSA9IG5ldyBSZWdFeHAoXCJeX19vbihbXi5dKylcIiArIGQzLnJlcXVvdGUodHlwZSkgKyBcIiRcIiksIG1hdGNoO1xuICAgICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzKSB7XG4gICAgICAgIGlmIChtYXRjaCA9IG5hbWUubWF0Y2gocmUpKSB7XG4gICAgICAgICAgdmFyIGwgPSB0aGlzW25hbWVdO1xuICAgICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihtYXRjaFsxXSwgbCwgbC4kKTtcbiAgICAgICAgICBkZWxldGUgdGhpc1tuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaSA/IGxpc3RlbmVyID8gb25BZGQgOiBvblJlbW92ZSA6IGxpc3RlbmVyID8gZDNfbm9vcCA6IHJlbW92ZUFsbDtcbiAgfVxuICB2YXIgZDNfc2VsZWN0aW9uX29uRmlsdGVycyA9IGQzLm1hcCh7XG4gICAgbW91c2VlbnRlcjogXCJtb3VzZW92ZXJcIixcbiAgICBtb3VzZWxlYXZlOiBcIm1vdXNlb3V0XCJcbiAgfSk7XG4gIGQzX3NlbGVjdGlvbl9vbkZpbHRlcnMuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgaWYgKFwib25cIiArIGsgaW4gZDNfZG9jdW1lbnQpIGQzX3NlbGVjdGlvbl9vbkZpbHRlcnMucmVtb3ZlKGspO1xuICB9KTtcbiAgZnVuY3Rpb24gZDNfc2VsZWN0aW9uX29uTGlzdGVuZXIobGlzdGVuZXIsIGFyZ3VtZW50eikge1xuICAgIHJldHVybiBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgbyA9IGQzLmV2ZW50O1xuICAgICAgZDMuZXZlbnQgPSBlO1xuICAgICAgYXJndW1lbnR6WzBdID0gdGhpcy5fX2RhdGFfXztcbiAgICAgIHRyeSB7XG4gICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50eik7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBkMy5ldmVudCA9IG87XG4gICAgICB9XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBkM19zZWxlY3Rpb25fb25GaWx0ZXIobGlzdGVuZXIsIGFyZ3VtZW50eikge1xuICAgIHZhciBsID0gZDNfc2VsZWN0aW9uX29uTGlzdGVuZXIobGlzdGVuZXIsIGFyZ3VtZW50eik7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciB0YXJnZXQgPSB0aGlzLCByZWxhdGVkID0gZS5yZWxhdGVkVGFyZ2V0O1xuICAgICAgaWYgKCFyZWxhdGVkIHx8IHJlbGF0ZWQgIT09IHRhcmdldCAmJiAhKHJlbGF0ZWQuY29tcGFyZURvY3VtZW50UG9zaXRpb24odGFyZ2V0KSAmIDgpKSB7XG4gICAgICAgIGwuY2FsbCh0YXJnZXQsIGUpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbiAgdmFyIGQzX2V2ZW50X2RyYWdTZWxlY3QgPSBcIm9uc2VsZWN0c3RhcnRcIiBpbiBkM19kb2N1bWVudCA/IG51bGwgOiBkM192ZW5kb3JTeW1ib2woZDNfZG9jdW1lbnRFbGVtZW50LnN0eWxlLCBcInVzZXJTZWxlY3RcIiksIGQzX2V2ZW50X2RyYWdJZCA9IDA7XG4gIGZ1bmN0aW9uIGQzX2V2ZW50X2RyYWdTdXBwcmVzcygpIHtcbiAgICB2YXIgbmFtZSA9IFwiLmRyYWdzdXBwcmVzcy1cIiArICsrZDNfZXZlbnRfZHJhZ0lkLCBjbGljayA9IFwiY2xpY2tcIiArIG5hbWUsIHcgPSBkMy5zZWxlY3QoZDNfd2luZG93KS5vbihcInRvdWNobW92ZVwiICsgbmFtZSwgZDNfZXZlbnRQcmV2ZW50RGVmYXVsdCkub24oXCJkcmFnc3RhcnRcIiArIG5hbWUsIGQzX2V2ZW50UHJldmVudERlZmF1bHQpLm9uKFwic2VsZWN0c3RhcnRcIiArIG5hbWUsIGQzX2V2ZW50UHJldmVudERlZmF1bHQpO1xuICAgIGlmIChkM19ldmVudF9kcmFnU2VsZWN0KSB7XG4gICAgICB2YXIgc3R5bGUgPSBkM19kb2N1bWVudEVsZW1lbnQuc3R5bGUsIHNlbGVjdCA9IHN0eWxlW2QzX2V2ZW50X2RyYWdTZWxlY3RdO1xuICAgICAgc3R5bGVbZDNfZXZlbnRfZHJhZ1NlbGVjdF0gPSBcIm5vbmVcIjtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHN1cHByZXNzQ2xpY2spIHtcbiAgICAgIHcub24obmFtZSwgbnVsbCk7XG4gICAgICBpZiAoZDNfZXZlbnRfZHJhZ1NlbGVjdCkgc3R5bGVbZDNfZXZlbnRfZHJhZ1NlbGVjdF0gPSBzZWxlY3Q7XG4gICAgICBpZiAoc3VwcHJlc3NDbGljaykge1xuICAgICAgICBmdW5jdGlvbiBvZmYoKSB7XG4gICAgICAgICAgdy5vbihjbGljaywgbnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgdy5vbihjbGljaywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZDNfZXZlbnRQcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIG9mZigpO1xuICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgc2V0VGltZW91dChvZmYsIDApO1xuICAgICAgfVxuICAgIH07XG4gIH1cbiAgZDMubW91c2UgPSBmdW5jdGlvbihjb250YWluZXIpIHtcbiAgICByZXR1cm4gZDNfbW91c2VQb2ludChjb250YWluZXIsIGQzX2V2ZW50U291cmNlKCkpO1xuICB9O1xuICB2YXIgZDNfbW91c2VfYnVnNDQwODMgPSAvV2ViS2l0Ly50ZXN0KGQzX3dpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KSA/IC0xIDogMDtcbiAgZnVuY3Rpb24gZDNfbW91c2VQb2ludChjb250YWluZXIsIGUpIHtcbiAgICBpZiAoZS5jaGFuZ2VkVG91Y2hlcykgZSA9IGUuY2hhbmdlZFRvdWNoZXNbMF07XG4gICAgdmFyIHN2ZyA9IGNvbnRhaW5lci5vd25lclNWR0VsZW1lbnQgfHwgY29udGFpbmVyO1xuICAgIGlmIChzdmcuY3JlYXRlU1ZHUG9pbnQpIHtcbiAgICAgIHZhciBwb2ludCA9IHN2Zy5jcmVhdGVTVkdQb2ludCgpO1xuICAgICAgaWYgKGQzX21vdXNlX2J1ZzQ0MDgzIDwgMCAmJiAoZDNfd2luZG93LnNjcm9sbFggfHwgZDNfd2luZG93LnNjcm9sbFkpKSB7XG4gICAgICAgIHN2ZyA9IGQzLnNlbGVjdChcImJvZHlcIikuYXBwZW5kKFwic3ZnXCIpLnN0eWxlKHtcbiAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICBsZWZ0OiAwLFxuICAgICAgICAgIG1hcmdpbjogMCxcbiAgICAgICAgICBwYWRkaW5nOiAwLFxuICAgICAgICAgIGJvcmRlcjogXCJub25lXCJcbiAgICAgICAgfSwgXCJpbXBvcnRhbnRcIik7XG4gICAgICAgIHZhciBjdG0gPSBzdmdbMF1bMF0uZ2V0U2NyZWVuQ1RNKCk7XG4gICAgICAgIGQzX21vdXNlX2J1ZzQ0MDgzID0gIShjdG0uZiB8fCBjdG0uZSk7XG4gICAgICAgIHN2Zy5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICAgIGlmIChkM19tb3VzZV9idWc0NDA4MykgcG9pbnQueCA9IGUucGFnZVgsIHBvaW50LnkgPSBlLnBhZ2VZOyBlbHNlIHBvaW50LnggPSBlLmNsaWVudFgsIFxuICAgICAgcG9pbnQueSA9IGUuY2xpZW50WTtcbiAgICAgIHBvaW50ID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKGNvbnRhaW5lci5nZXRTY3JlZW5DVE0oKS5pbnZlcnNlKCkpO1xuICAgICAgcmV0dXJuIFsgcG9pbnQueCwgcG9pbnQueSBdO1xuICAgIH1cbiAgICB2YXIgcmVjdCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZXR1cm4gWyBlLmNsaWVudFggLSByZWN0LmxlZnQgLSBjb250YWluZXIuY2xpZW50TGVmdCwgZS5jbGllbnRZIC0gcmVjdC50b3AgLSBjb250YWluZXIuY2xpZW50VG9wIF07XG4gIH1cbiAgZDMudG91Y2hlcyA9IGZ1bmN0aW9uKGNvbnRhaW5lciwgdG91Y2hlcykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikgdG91Y2hlcyA9IGQzX2V2ZW50U291cmNlKCkudG91Y2hlcztcbiAgICByZXR1cm4gdG91Y2hlcyA/IGQzX2FycmF5KHRvdWNoZXMpLm1hcChmdW5jdGlvbih0b3VjaCkge1xuICAgICAgdmFyIHBvaW50ID0gZDNfbW91c2VQb2ludChjb250YWluZXIsIHRvdWNoKTtcbiAgICAgIHBvaW50LmlkZW50aWZpZXIgPSB0b3VjaC5pZGVudGlmaWVyO1xuICAgICAgcmV0dXJuIHBvaW50O1xuICAgIH0pIDogW107XG4gIH07XG4gIGQzLmJlaGF2aW9yLmRyYWcgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZXZlbnQgPSBkM19ldmVudERpc3BhdGNoKGRyYWcsIFwiZHJhZ1wiLCBcImRyYWdzdGFydFwiLCBcImRyYWdlbmRcIiksIG9yaWdpbiA9IG51bGwsIG1vdXNlZG93biA9IGRyYWdzdGFydChkM19ub29wLCBkMy5tb3VzZSwgXCJtb3VzZW1vdmVcIiwgXCJtb3VzZXVwXCIpLCB0b3VjaHN0YXJ0ID0gZHJhZ3N0YXJ0KHRvdWNoaWQsIHRvdWNocG9zaXRpb24sIFwidG91Y2htb3ZlXCIsIFwidG91Y2hlbmRcIik7XG4gICAgZnVuY3Rpb24gZHJhZygpIHtcbiAgICAgIHRoaXMub24oXCJtb3VzZWRvd24uZHJhZ1wiLCBtb3VzZWRvd24pLm9uKFwidG91Y2hzdGFydC5kcmFnXCIsIHRvdWNoc3RhcnQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiB0b3VjaGlkKCkge1xuICAgICAgcmV0dXJuIGQzLmV2ZW50LmNoYW5nZWRUb3VjaGVzWzBdLmlkZW50aWZpZXI7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHRvdWNocG9zaXRpb24ocGFyZW50LCBpZCkge1xuICAgICAgcmV0dXJuIGQzLnRvdWNoZXMocGFyZW50KS5maWx0ZXIoZnVuY3Rpb24ocCkge1xuICAgICAgICByZXR1cm4gcC5pZGVudGlmaWVyID09PSBpZDtcbiAgICAgIH0pWzBdO1xuICAgIH1cbiAgICBmdW5jdGlvbiBkcmFnc3RhcnQoaWQsIHBvc2l0aW9uLCBtb3ZlLCBlbmQpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IHRoaXMsIHBhcmVudCA9IHRhcmdldC5wYXJlbnROb2RlLCBldmVudF8gPSBldmVudC5vZih0YXJnZXQsIGFyZ3VtZW50cyksIGV2ZW50VGFyZ2V0ID0gZDMuZXZlbnQudGFyZ2V0LCBldmVudElkID0gaWQoKSwgZHJhZyA9IGV2ZW50SWQgPT0gbnVsbCA/IFwiZHJhZ1wiIDogXCJkcmFnLVwiICsgZXZlbnRJZCwgb3JpZ2luXyA9IHBvc2l0aW9uKHBhcmVudCwgZXZlbnRJZCksIGRyYWdnZWQgPSAwLCBvZmZzZXQsIHcgPSBkMy5zZWxlY3QoZDNfd2luZG93KS5vbihtb3ZlICsgXCIuXCIgKyBkcmFnLCBtb3ZlZCkub24oZW5kICsgXCIuXCIgKyBkcmFnLCBlbmRlZCksIGRyYWdSZXN0b3JlID0gZDNfZXZlbnRfZHJhZ1N1cHByZXNzKCk7XG4gICAgICAgIGlmIChvcmlnaW4pIHtcbiAgICAgICAgICBvZmZzZXQgPSBvcmlnaW4uYXBwbHkodGFyZ2V0LCBhcmd1bWVudHMpO1xuICAgICAgICAgIG9mZnNldCA9IFsgb2Zmc2V0LnggLSBvcmlnaW5fWzBdLCBvZmZzZXQueSAtIG9yaWdpbl9bMV0gXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvZmZzZXQgPSBbIDAsIDAgXTtcbiAgICAgICAgfVxuICAgICAgICBldmVudF8oe1xuICAgICAgICAgIHR5cGU6IFwiZHJhZ3N0YXJ0XCJcbiAgICAgICAgfSk7XG4gICAgICAgIGZ1bmN0aW9uIG1vdmVkKCkge1xuICAgICAgICAgIHZhciBwID0gcG9zaXRpb24ocGFyZW50LCBldmVudElkKSwgZHggPSBwWzBdIC0gb3JpZ2luX1swXSwgZHkgPSBwWzFdIC0gb3JpZ2luX1sxXTtcbiAgICAgICAgICBkcmFnZ2VkIHw9IGR4IHwgZHk7XG4gICAgICAgICAgb3JpZ2luXyA9IHA7XG4gICAgICAgICAgZXZlbnRfKHtcbiAgICAgICAgICAgIHR5cGU6IFwiZHJhZ1wiLFxuICAgICAgICAgICAgeDogcFswXSArIG9mZnNldFswXSxcbiAgICAgICAgICAgIHk6IHBbMV0gKyBvZmZzZXRbMV0sXG4gICAgICAgICAgICBkeDogZHgsXG4gICAgICAgICAgICBkeTogZHlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBlbmRlZCgpIHtcbiAgICAgICAgICB3Lm9uKG1vdmUgKyBcIi5cIiArIGRyYWcsIG51bGwpLm9uKGVuZCArIFwiLlwiICsgZHJhZywgbnVsbCk7XG4gICAgICAgICAgZHJhZ1Jlc3RvcmUoZHJhZ2dlZCAmJiBkMy5ldmVudC50YXJnZXQgPT09IGV2ZW50VGFyZ2V0KTtcbiAgICAgICAgICBldmVudF8oe1xuICAgICAgICAgICAgdHlwZTogXCJkcmFnZW5kXCJcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gICAgZHJhZy5vcmlnaW4gPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBvcmlnaW47XG4gICAgICBvcmlnaW4gPSB4O1xuICAgICAgcmV0dXJuIGRyYWc7XG4gICAgfTtcbiAgICByZXR1cm4gZDMucmViaW5kKGRyYWcsIGV2ZW50LCBcIm9uXCIpO1xuICB9O1xuICB2YXIgz4AgPSBNYXRoLlBJLCDPhCA9IDIgKiDPgCwgaGFsZs+AID0gz4AgLyAyLCDOtSA9IDFlLTYsIM61MiA9IM61ICogzrUsIGQzX3JhZGlhbnMgPSDPgCAvIDE4MCwgZDNfZGVncmVlcyA9IDE4MCAvIM+AO1xuICBmdW5jdGlvbiBkM19zZ24oeCkge1xuICAgIHJldHVybiB4ID4gMCA/IDEgOiB4IDwgMCA/IC0xIDogMDtcbiAgfVxuICBmdW5jdGlvbiBkM19jcm9zczJkKGEsIGIsIGMpIHtcbiAgICByZXR1cm4gKGJbMF0gLSBhWzBdKSAqIChjWzFdIC0gYVsxXSkgLSAoYlsxXSAtIGFbMV0pICogKGNbMF0gLSBhWzBdKTtcbiAgfVxuICBmdW5jdGlvbiBkM19hY29zKHgpIHtcbiAgICByZXR1cm4geCA+IDEgPyAwIDogeCA8IC0xID8gz4AgOiBNYXRoLmFjb3MoeCk7XG4gIH1cbiAgZnVuY3Rpb24gZDNfYXNpbih4KSB7XG4gICAgcmV0dXJuIHggPiAxID8gaGFsZs+AIDogeCA8IC0xID8gLWhhbGbPgCA6IE1hdGguYXNpbih4KTtcbiAgfVxuICBmdW5jdGlvbiBkM19zaW5oKHgpIHtcbiAgICByZXR1cm4gKCh4ID0gTWF0aC5leHAoeCkpIC0gMSAvIHgpIC8gMjtcbiAgfVxuICBmdW5jdGlvbiBkM19jb3NoKHgpIHtcbiAgICByZXR1cm4gKCh4ID0gTWF0aC5leHAoeCkpICsgMSAvIHgpIC8gMjtcbiAgfVxuICBmdW5jdGlvbiBkM190YW5oKHgpIHtcbiAgICByZXR1cm4gKCh4ID0gTWF0aC5leHAoMiAqIHgpKSAtIDEpIC8gKHggKyAxKTtcbiAgfVxuICBmdW5jdGlvbiBkM19oYXZlcnNpbih4KSB7XG4gICAgcmV0dXJuICh4ID0gTWF0aC5zaW4oeCAvIDIpKSAqIHg7XG4gIH1cbiAgdmFyIM+BID0gTWF0aC5TUVJUMiwgz4EyID0gMiwgz4E0ID0gNDtcbiAgZDMuaW50ZXJwb2xhdGVab29tID0gZnVuY3Rpb24ocDAsIHAxKSB7XG4gICAgdmFyIHV4MCA9IHAwWzBdLCB1eTAgPSBwMFsxXSwgdzAgPSBwMFsyXSwgdXgxID0gcDFbMF0sIHV5MSA9IHAxWzFdLCB3MSA9IHAxWzJdO1xuICAgIHZhciBkeCA9IHV4MSAtIHV4MCwgZHkgPSB1eTEgLSB1eTAsIGQyID0gZHggKiBkeCArIGR5ICogZHksIGQxID0gTWF0aC5zcXJ0KGQyKSwgYjAgPSAodzEgKiB3MSAtIHcwICogdzAgKyDPgTQgKiBkMikgLyAoMiAqIHcwICogz4EyICogZDEpLCBiMSA9ICh3MSAqIHcxIC0gdzAgKiB3MCAtIM+BNCAqIGQyKSAvICgyICogdzEgKiDPgTIgKiBkMSksIHIwID0gTWF0aC5sb2coTWF0aC5zcXJ0KGIwICogYjAgKyAxKSAtIGIwKSwgcjEgPSBNYXRoLmxvZyhNYXRoLnNxcnQoYjEgKiBiMSArIDEpIC0gYjEpLCBkciA9IHIxIC0gcjAsIFMgPSAoZHIgfHwgTWF0aC5sb2codzEgLyB3MCkpIC8gz4E7XG4gICAgZnVuY3Rpb24gaW50ZXJwb2xhdGUodCkge1xuICAgICAgdmFyIHMgPSB0ICogUztcbiAgICAgIGlmIChkcikge1xuICAgICAgICB2YXIgY29zaHIwID0gZDNfY29zaChyMCksIHUgPSB3MCAvICjPgTIgKiBkMSkgKiAoY29zaHIwICogZDNfdGFuaCjPgSAqIHMgKyByMCkgLSBkM19zaW5oKHIwKSk7XG4gICAgICAgIHJldHVybiBbIHV4MCArIHUgKiBkeCwgdXkwICsgdSAqIGR5LCB3MCAqIGNvc2hyMCAvIGQzX2Nvc2goz4EgKiBzICsgcjApIF07XG4gICAgICB9XG4gICAgICByZXR1cm4gWyB1eDAgKyB0ICogZHgsIHV5MCArIHQgKiBkeSwgdzAgKiBNYXRoLmV4cCjPgSAqIHMpIF07XG4gICAgfVxuICAgIGludGVycG9sYXRlLmR1cmF0aW9uID0gUyAqIDFlMztcbiAgICByZXR1cm4gaW50ZXJwb2xhdGU7XG4gIH07XG4gIGQzLmJlaGF2aW9yLnpvb20gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmlldyA9IHtcbiAgICAgIHg6IDAsXG4gICAgICB5OiAwLFxuICAgICAgazogMVxuICAgIH0sIHRyYW5zbGF0ZTAsIGNlbnRlciwgc2l6ZSA9IFsgOTYwLCA1MDAgXSwgc2NhbGVFeHRlbnQgPSBkM19iZWhhdmlvcl96b29tSW5maW5pdHksIG1vdXNlZG93biA9IFwibW91c2Vkb3duLnpvb21cIiwgbW91c2Vtb3ZlID0gXCJtb3VzZW1vdmUuem9vbVwiLCBtb3VzZXVwID0gXCJtb3VzZXVwLnpvb21cIiwgbW91c2V3aGVlbFRpbWVyLCB0b3VjaHN0YXJ0ID0gXCJ0b3VjaHN0YXJ0Lnpvb21cIiwgdG91Y2h0aW1lLCBldmVudCA9IGQzX2V2ZW50RGlzcGF0Y2goem9vbSwgXCJ6b29tc3RhcnRcIiwgXCJ6b29tXCIsIFwiem9vbWVuZFwiKSwgeDAsIHgxLCB5MCwgeTE7XG4gICAgZnVuY3Rpb24gem9vbShnKSB7XG4gICAgICBnLm9uKG1vdXNlZG93biwgbW91c2Vkb3duZWQpLm9uKGQzX2JlaGF2aW9yX3pvb21XaGVlbCArIFwiLnpvb21cIiwgbW91c2V3aGVlbGVkKS5vbihtb3VzZW1vdmUsIG1vdXNld2hlZWxyZXNldCkub24oXCJkYmxjbGljay56b29tXCIsIGRibGNsaWNrZWQpLm9uKHRvdWNoc3RhcnQsIHRvdWNoc3RhcnRlZCk7XG4gICAgfVxuICAgIHpvb20uZXZlbnQgPSBmdW5jdGlvbihnKSB7XG4gICAgICBnLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBldmVudF8gPSBldmVudC5vZih0aGlzLCBhcmd1bWVudHMpLCB2aWV3MSA9IHZpZXc7XG4gICAgICAgIGlmIChkM190cmFuc2l0aW9uSW5oZXJpdElkKSB7XG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnRyYW5zaXRpb24oKS5lYWNoKFwic3RhcnQuem9vbVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZpZXcgPSB0aGlzLl9fY2hhcnRfXyB8fCB7XG4gICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICAgIGs6IDFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB6b29tc3RhcnRlZChldmVudF8pO1xuICAgICAgICAgIH0pLnR3ZWVuKFwiem9vbTp6b29tXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGR4ID0gc2l6ZVswXSwgZHkgPSBzaXplWzFdLCBjeCA9IGR4IC8gMiwgY3kgPSBkeSAvIDIsIGkgPSBkMy5pbnRlcnBvbGF0ZVpvb20oWyAoY3ggLSB2aWV3LngpIC8gdmlldy5rLCAoY3kgLSB2aWV3LnkpIC8gdmlldy5rLCBkeCAvIHZpZXcuayBdLCBbIChjeCAtIHZpZXcxLngpIC8gdmlldzEuaywgKGN5IC0gdmlldzEueSkgLyB2aWV3MS5rLCBkeCAvIHZpZXcxLmsgXSk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgICAgICAgICB2YXIgbCA9IGkodCksIGsgPSBkeCAvIGxbMl07XG4gICAgICAgICAgICAgIHRoaXMuX19jaGFydF9fID0gdmlldyA9IHtcbiAgICAgICAgICAgICAgICB4OiBjeCAtIGxbMF0gKiBrLFxuICAgICAgICAgICAgICAgIHk6IGN5IC0gbFsxXSAqIGssXG4gICAgICAgICAgICAgICAgazoga1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB6b29tZWQoZXZlbnRfKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSkuZWFjaChcImVuZC56b29tXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgem9vbWVuZGVkKGV2ZW50Xyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fX2NoYXJ0X18gPSB2aWV3O1xuICAgICAgICAgIHpvb21zdGFydGVkKGV2ZW50Xyk7XG4gICAgICAgICAgem9vbWVkKGV2ZW50Xyk7XG4gICAgICAgICAgem9vbWVuZGVkKGV2ZW50Xyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG4gICAgem9vbS50cmFuc2xhdGUgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBbIHZpZXcueCwgdmlldy55IF07XG4gICAgICB2aWV3ID0ge1xuICAgICAgICB4OiArX1swXSxcbiAgICAgICAgeTogK19bMV0sXG4gICAgICAgIGs6IHZpZXcua1xuICAgICAgfTtcbiAgICAgIHJlc2NhbGUoKTtcbiAgICAgIHJldHVybiB6b29tO1xuICAgIH07XG4gICAgem9vbS5zY2FsZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHZpZXcuaztcbiAgICAgIHZpZXcgPSB7XG4gICAgICAgIHg6IHZpZXcueCxcbiAgICAgICAgeTogdmlldy55LFxuICAgICAgICBrOiArX1xuICAgICAgfTtcbiAgICAgIHJlc2NhbGUoKTtcbiAgICAgIHJldHVybiB6b29tO1xuICAgIH07XG4gICAgem9vbS5zY2FsZUV4dGVudCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHNjYWxlRXh0ZW50O1xuICAgICAgc2NhbGVFeHRlbnQgPSBfID09IG51bGwgPyBkM19iZWhhdmlvcl96b29tSW5maW5pdHkgOiBbICtfWzBdLCArX1sxXSBdO1xuICAgICAgcmV0dXJuIHpvb207XG4gICAgfTtcbiAgICB6b29tLmNlbnRlciA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGNlbnRlcjtcbiAgICAgIGNlbnRlciA9IF8gJiYgWyArX1swXSwgK19bMV0gXTtcbiAgICAgIHJldHVybiB6b29tO1xuICAgIH07XG4gICAgem9vbS5zaXplID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gc2l6ZTtcbiAgICAgIHNpemUgPSBfICYmIFsgK19bMF0sICtfWzFdIF07XG4gICAgICByZXR1cm4gem9vbTtcbiAgICB9O1xuICAgIHpvb20ueCA9IGZ1bmN0aW9uKHopIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHgxO1xuICAgICAgeDEgPSB6O1xuICAgICAgeDAgPSB6LmNvcHkoKTtcbiAgICAgIHZpZXcgPSB7XG4gICAgICAgIHg6IDAsXG4gICAgICAgIHk6IDAsXG4gICAgICAgIGs6IDFcbiAgICAgIH07XG4gICAgICByZXR1cm4gem9vbTtcbiAgICB9O1xuICAgIHpvb20ueSA9IGZ1bmN0aW9uKHopIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHkxO1xuICAgICAgeTEgPSB6O1xuICAgICAgeTAgPSB6LmNvcHkoKTtcbiAgICAgIHZpZXcgPSB7XG4gICAgICAgIHg6IDAsXG4gICAgICAgIHk6IDAsXG4gICAgICAgIGs6IDFcbiAgICAgIH07XG4gICAgICByZXR1cm4gem9vbTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIGxvY2F0aW9uKHApIHtcbiAgICAgIHJldHVybiBbIChwWzBdIC0gdmlldy54KSAvIHZpZXcuaywgKHBbMV0gLSB2aWV3LnkpIC8gdmlldy5rIF07XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBvaW50KGwpIHtcbiAgICAgIHJldHVybiBbIGxbMF0gKiB2aWV3LmsgKyB2aWV3LngsIGxbMV0gKiB2aWV3LmsgKyB2aWV3LnkgXTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc2NhbGVUbyhzKSB7XG4gICAgICB2aWV3LmsgPSBNYXRoLm1heChzY2FsZUV4dGVudFswXSwgTWF0aC5taW4oc2NhbGVFeHRlbnRbMV0sIHMpKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdHJhbnNsYXRlVG8ocCwgbCkge1xuICAgICAgbCA9IHBvaW50KGwpO1xuICAgICAgdmlldy54ICs9IHBbMF0gLSBsWzBdO1xuICAgICAgdmlldy55ICs9IHBbMV0gLSBsWzFdO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZXNjYWxlKCkge1xuICAgICAgaWYgKHgxKSB4MS5kb21haW4oeDAucmFuZ2UoKS5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICByZXR1cm4gKHggLSB2aWV3LngpIC8gdmlldy5rO1xuICAgICAgfSkubWFwKHgwLmludmVydCkpO1xuICAgICAgaWYgKHkxKSB5MS5kb21haW4oeTAucmFuZ2UoKS5tYXAoZnVuY3Rpb24oeSkge1xuICAgICAgICByZXR1cm4gKHkgLSB2aWV3LnkpIC8gdmlldy5rO1xuICAgICAgfSkubWFwKHkwLmludmVydCkpO1xuICAgIH1cbiAgICBmdW5jdGlvbiB6b29tc3RhcnRlZChldmVudCkge1xuICAgICAgZXZlbnQoe1xuICAgICAgICB0eXBlOiBcInpvb21zdGFydFwiXG4gICAgICB9KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gem9vbWVkKGV2ZW50KSB7XG4gICAgICByZXNjYWxlKCk7XG4gICAgICBldmVudCh7XG4gICAgICAgIHR5cGU6IFwiem9vbVwiLFxuICAgICAgICBzY2FsZTogdmlldy5rLFxuICAgICAgICB0cmFuc2xhdGU6IFsgdmlldy54LCB2aWV3LnkgXVxuICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHpvb21lbmRlZChldmVudCkge1xuICAgICAgZXZlbnQoe1xuICAgICAgICB0eXBlOiBcInpvb21lbmRcIlxuICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIG1vdXNlZG93bmVkKCkge1xuICAgICAgdmFyIHRhcmdldCA9IHRoaXMsIGV2ZW50XyA9IGV2ZW50Lm9mKHRhcmdldCwgYXJndW1lbnRzKSwgZXZlbnRUYXJnZXQgPSBkMy5ldmVudC50YXJnZXQsIGRyYWdnZWQgPSAwLCB3ID0gZDMuc2VsZWN0KGQzX3dpbmRvdykub24obW91c2Vtb3ZlLCBtb3ZlZCkub24obW91c2V1cCwgZW5kZWQpLCBsID0gbG9jYXRpb24oZDMubW91c2UodGFyZ2V0KSksIGRyYWdSZXN0b3JlID0gZDNfZXZlbnRfZHJhZ1N1cHByZXNzKCk7XG4gICAgICBkM19zZWxlY3Rpb25faW50ZXJydXB0LmNhbGwodGFyZ2V0KTtcbiAgICAgIHpvb21zdGFydGVkKGV2ZW50Xyk7XG4gICAgICBmdW5jdGlvbiBtb3ZlZCgpIHtcbiAgICAgICAgZHJhZ2dlZCA9IDE7XG4gICAgICAgIHRyYW5zbGF0ZVRvKGQzLm1vdXNlKHRhcmdldCksIGwpO1xuICAgICAgICB6b29tZWQoZXZlbnRfKTtcbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIGVuZGVkKCkge1xuICAgICAgICB3Lm9uKG1vdXNlbW92ZSwgZDNfd2luZG93ID09PSB0YXJnZXQgPyBtb3VzZXdoZWVscmVzZXQgOiBudWxsKS5vbihtb3VzZXVwLCBudWxsKTtcbiAgICAgICAgZHJhZ1Jlc3RvcmUoZHJhZ2dlZCAmJiBkMy5ldmVudC50YXJnZXQgPT09IGV2ZW50VGFyZ2V0KTtcbiAgICAgICAgem9vbWVuZGVkKGV2ZW50Xyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHRvdWNoc3RhcnRlZCgpIHtcbiAgICAgIHZhciB0YXJnZXQgPSB0aGlzLCBldmVudF8gPSBldmVudC5vZih0YXJnZXQsIGFyZ3VtZW50cyksIGxvY2F0aW9uczAgPSB7fSwgZGlzdGFuY2UwID0gMCwgc2NhbGUwLCBldmVudElkID0gZDMuZXZlbnQuY2hhbmdlZFRvdWNoZXNbMF0uaWRlbnRpZmllciwgdG91Y2htb3ZlID0gXCJ0b3VjaG1vdmUuem9vbS1cIiArIGV2ZW50SWQsIHRvdWNoZW5kID0gXCJ0b3VjaGVuZC56b29tLVwiICsgZXZlbnRJZCwgdyA9IGQzLnNlbGVjdChkM193aW5kb3cpLm9uKHRvdWNobW92ZSwgbW92ZWQpLm9uKHRvdWNoZW5kLCBlbmRlZCksIHQgPSBkMy5zZWxlY3QodGFyZ2V0KS5vbihtb3VzZWRvd24sIG51bGwpLm9uKHRvdWNoc3RhcnQsIHN0YXJ0ZWQpLCBkcmFnUmVzdG9yZSA9IGQzX2V2ZW50X2RyYWdTdXBwcmVzcygpO1xuICAgICAgZDNfc2VsZWN0aW9uX2ludGVycnVwdC5jYWxsKHRhcmdldCk7XG4gICAgICBzdGFydGVkKCk7XG4gICAgICB6b29tc3RhcnRlZChldmVudF8pO1xuICAgICAgZnVuY3Rpb24gcmVsb2NhdGUoKSB7XG4gICAgICAgIHZhciB0b3VjaGVzID0gZDMudG91Y2hlcyh0YXJnZXQpO1xuICAgICAgICBzY2FsZTAgPSB2aWV3Lms7XG4gICAgICAgIHRvdWNoZXMuZm9yRWFjaChmdW5jdGlvbih0KSB7XG4gICAgICAgICAgaWYgKHQuaWRlbnRpZmllciBpbiBsb2NhdGlvbnMwKSBsb2NhdGlvbnMwW3QuaWRlbnRpZmllcl0gPSBsb2NhdGlvbih0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0b3VjaGVzO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gc3RhcnRlZCgpIHtcbiAgICAgICAgdmFyIGNoYW5nZWQgPSBkMy5ldmVudC5jaGFuZ2VkVG91Y2hlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSBjaGFuZ2VkLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgICAgIGxvY2F0aW9uczBbY2hhbmdlZFtpXS5pZGVudGlmaWVyXSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRvdWNoZXMgPSByZWxvY2F0ZSgpLCBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICBpZiAodG91Y2hlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICBpZiAobm93IC0gdG91Y2h0aW1lIDwgNTAwKSB7XG4gICAgICAgICAgICB2YXIgcCA9IHRvdWNoZXNbMF0sIGwgPSBsb2NhdGlvbnMwW3AuaWRlbnRpZmllcl07XG4gICAgICAgICAgICBzY2FsZVRvKHZpZXcuayAqIDIpO1xuICAgICAgICAgICAgdHJhbnNsYXRlVG8ocCwgbCk7XG4gICAgICAgICAgICBkM19ldmVudFByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB6b29tZWQoZXZlbnRfKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdG91Y2h0aW1lID0gbm93O1xuICAgICAgICB9IGVsc2UgaWYgKHRvdWNoZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHZhciBwID0gdG91Y2hlc1swXSwgcSA9IHRvdWNoZXNbMV0sIGR4ID0gcFswXSAtIHFbMF0sIGR5ID0gcFsxXSAtIHFbMV07XG4gICAgICAgICAgZGlzdGFuY2UwID0gZHggKiBkeCArIGR5ICogZHk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIG1vdmVkKCkge1xuICAgICAgICB2YXIgdG91Y2hlcyA9IGQzLnRvdWNoZXModGFyZ2V0KSwgcDAsIGwwLCBwMSwgbDE7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdG91Y2hlcy5sZW5ndGg7IGkgPCBuOyArK2ksIGwxID0gbnVsbCkge1xuICAgICAgICAgIHAxID0gdG91Y2hlc1tpXTtcbiAgICAgICAgICBpZiAobDEgPSBsb2NhdGlvbnMwW3AxLmlkZW50aWZpZXJdKSB7XG4gICAgICAgICAgICBpZiAobDApIGJyZWFrO1xuICAgICAgICAgICAgcDAgPSBwMSwgbDAgPSBsMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGwxKSB7XG4gICAgICAgICAgdmFyIGRpc3RhbmNlMSA9IChkaXN0YW5jZTEgPSBwMVswXSAtIHAwWzBdKSAqIGRpc3RhbmNlMSArIChkaXN0YW5jZTEgPSBwMVsxXSAtIHAwWzFdKSAqIGRpc3RhbmNlMSwgc2NhbGUxID0gZGlzdGFuY2UwICYmIE1hdGguc3FydChkaXN0YW5jZTEgLyBkaXN0YW5jZTApO1xuICAgICAgICAgIHAwID0gWyAocDBbMF0gKyBwMVswXSkgLyAyLCAocDBbMV0gKyBwMVsxXSkgLyAyIF07XG4gICAgICAgICAgbDAgPSBbIChsMFswXSArIGwxWzBdKSAvIDIsIChsMFsxXSArIGwxWzFdKSAvIDIgXTtcbiAgICAgICAgICBzY2FsZVRvKHNjYWxlMSAqIHNjYWxlMCk7XG4gICAgICAgIH1cbiAgICAgICAgdG91Y2h0aW1lID0gbnVsbDtcbiAgICAgICAgdHJhbnNsYXRlVG8ocDAsIGwwKTtcbiAgICAgICAgem9vbWVkKGV2ZW50Xyk7XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBlbmRlZCgpIHtcbiAgICAgICAgaWYgKGQzLmV2ZW50LnRvdWNoZXMubGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIGNoYW5nZWQgPSBkMy5ldmVudC5jaGFuZ2VkVG91Y2hlcztcbiAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGNoYW5nZWQubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICAgICAgICBkZWxldGUgbG9jYXRpb25zMFtjaGFuZ2VkW2ldLmlkZW50aWZpZXJdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmb3IgKHZhciBpZGVudGlmaWVyIGluIGxvY2F0aW9uczApIHtcbiAgICAgICAgICAgIHJldHVybiB2b2lkIHJlbG9jYXRlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHcub24odG91Y2htb3ZlLCBudWxsKS5vbih0b3VjaGVuZCwgbnVsbCk7XG4gICAgICAgIHQub24obW91c2Vkb3duLCBtb3VzZWRvd25lZCkub24odG91Y2hzdGFydCwgdG91Y2hzdGFydGVkKTtcbiAgICAgICAgZHJhZ1Jlc3RvcmUoKTtcbiAgICAgICAgem9vbWVuZGVkKGV2ZW50Xyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIG1vdXNld2hlZWxlZCgpIHtcbiAgICAgIHZhciBldmVudF8gPSBldmVudC5vZih0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKG1vdXNld2hlZWxUaW1lcikgY2xlYXJUaW1lb3V0KG1vdXNld2hlZWxUaW1lcik7IGVsc2UgZDNfc2VsZWN0aW9uX2ludGVycnVwdC5jYWxsKHRoaXMpLCBcbiAgICAgIHpvb21zdGFydGVkKGV2ZW50Xyk7XG4gICAgICBtb3VzZXdoZWVsVGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBtb3VzZXdoZWVsVGltZXIgPSBudWxsO1xuICAgICAgICB6b29tZW5kZWQoZXZlbnRfKTtcbiAgICAgIH0sIDUwKTtcbiAgICAgIGQzX2V2ZW50UHJldmVudERlZmF1bHQoKTtcbiAgICAgIHZhciBwb2ludCA9IGNlbnRlciB8fCBkMy5tb3VzZSh0aGlzKTtcbiAgICAgIGlmICghdHJhbnNsYXRlMCkgdHJhbnNsYXRlMCA9IGxvY2F0aW9uKHBvaW50KTtcbiAgICAgIHNjYWxlVG8oTWF0aC5wb3coMiwgZDNfYmVoYXZpb3Jfem9vbURlbHRhKCkgKiAuMDAyKSAqIHZpZXcuayk7XG4gICAgICB0cmFuc2xhdGVUbyhwb2ludCwgdHJhbnNsYXRlMCk7XG4gICAgICB6b29tZWQoZXZlbnRfKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gbW91c2V3aGVlbHJlc2V0KCkge1xuICAgICAgdHJhbnNsYXRlMCA9IG51bGw7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRibGNsaWNrZWQoKSB7XG4gICAgICB2YXIgZXZlbnRfID0gZXZlbnQub2YodGhpcywgYXJndW1lbnRzKSwgcCA9IGQzLm1vdXNlKHRoaXMpLCBsID0gbG9jYXRpb24ocCksIGsgPSBNYXRoLmxvZyh2aWV3LmspIC8gTWF0aC5MTjI7XG4gICAgICB6b29tc3RhcnRlZChldmVudF8pO1xuICAgICAgc2NhbGVUbyhNYXRoLnBvdygyLCBkMy5ldmVudC5zaGlmdEtleSA/IE1hdGguY2VpbChrKSAtIDEgOiBNYXRoLmZsb29yKGspICsgMSkpO1xuICAgICAgdHJhbnNsYXRlVG8ocCwgbCk7XG4gICAgICB6b29tZWQoZXZlbnRfKTtcbiAgICAgIHpvb21lbmRlZChldmVudF8pO1xuICAgIH1cbiAgICByZXR1cm4gZDMucmViaW5kKHpvb20sIGV2ZW50LCBcIm9uXCIpO1xuICB9O1xuICB2YXIgZDNfYmVoYXZpb3Jfem9vbUluZmluaXR5ID0gWyAwLCBJbmZpbml0eSBdO1xuICB2YXIgZDNfYmVoYXZpb3Jfem9vbURlbHRhLCBkM19iZWhhdmlvcl96b29tV2hlZWwgPSBcIm9ud2hlZWxcIiBpbiBkM19kb2N1bWVudCA/IChkM19iZWhhdmlvcl96b29tRGVsdGEgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gLWQzLmV2ZW50LmRlbHRhWSAqIChkMy5ldmVudC5kZWx0YU1vZGUgPyAxMjAgOiAxKTtcbiAgfSwgXCJ3aGVlbFwiKSA6IFwib25tb3VzZXdoZWVsXCIgaW4gZDNfZG9jdW1lbnQgPyAoZDNfYmVoYXZpb3Jfem9vbURlbHRhID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzLmV2ZW50LndoZWVsRGVsdGE7XG4gIH0sIFwibW91c2V3aGVlbFwiKSA6IChkM19iZWhhdmlvcl96b29tRGVsdGEgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gLWQzLmV2ZW50LmRldGFpbDtcbiAgfSwgXCJNb3pNb3VzZVBpeGVsU2Nyb2xsXCIpO1xuICBmdW5jdGlvbiBkM19Db2xvcigpIHt9XG4gIGQzX0NvbG9yLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnJnYigpICsgXCJcIjtcbiAgfTtcbiAgZDMuaHNsID0gZnVuY3Rpb24oaCwgcywgbCkge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gaCBpbnN0YW5jZW9mIGQzX0hzbCA/IGQzX2hzbChoLmgsIGgucywgaC5sKSA6IGQzX3JnYl9wYXJzZShcIlwiICsgaCwgZDNfcmdiX2hzbCwgZDNfaHNsKSA6IGQzX2hzbCgraCwgK3MsICtsKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfaHNsKGgsIHMsIGwpIHtcbiAgICByZXR1cm4gbmV3IGQzX0hzbChoLCBzLCBsKTtcbiAgfVxuICBmdW5jdGlvbiBkM19Ic2woaCwgcywgbCkge1xuICAgIHRoaXMuaCA9IGg7XG4gICAgdGhpcy5zID0gcztcbiAgICB0aGlzLmwgPSBsO1xuICB9XG4gIHZhciBkM19oc2xQcm90b3R5cGUgPSBkM19Ic2wucHJvdG90eXBlID0gbmV3IGQzX0NvbG9yKCk7XG4gIGQzX2hzbFByb3RvdHlwZS5icmlnaHRlciA9IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gTWF0aC5wb3coLjcsIGFyZ3VtZW50cy5sZW5ndGggPyBrIDogMSk7XG4gICAgcmV0dXJuIGQzX2hzbCh0aGlzLmgsIHRoaXMucywgdGhpcy5sIC8gayk7XG4gIH07XG4gIGQzX2hzbFByb3RvdHlwZS5kYXJrZXIgPSBmdW5jdGlvbihrKSB7XG4gICAgayA9IE1hdGgucG93KC43LCBhcmd1bWVudHMubGVuZ3RoID8gayA6IDEpO1xuICAgIHJldHVybiBkM19oc2wodGhpcy5oLCB0aGlzLnMsIGsgKiB0aGlzLmwpO1xuICB9O1xuICBkM19oc2xQcm90b3R5cGUucmdiID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX2hzbF9yZ2IodGhpcy5oLCB0aGlzLnMsIHRoaXMubCk7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2hzbF9yZ2IoaCwgcywgbCkge1xuICAgIHZhciBtMSwgbTI7XG4gICAgaCA9IGlzTmFOKGgpID8gMCA6IChoICU9IDM2MCkgPCAwID8gaCArIDM2MCA6IGg7XG4gICAgcyA9IGlzTmFOKHMpID8gMCA6IHMgPCAwID8gMCA6IHMgPiAxID8gMSA6IHM7XG4gICAgbCA9IGwgPCAwID8gMCA6IGwgPiAxID8gMSA6IGw7XG4gICAgbTIgPSBsIDw9IC41ID8gbCAqICgxICsgcykgOiBsICsgcyAtIGwgKiBzO1xuICAgIG0xID0gMiAqIGwgLSBtMjtcbiAgICBmdW5jdGlvbiB2KGgpIHtcbiAgICAgIGlmIChoID4gMzYwKSBoIC09IDM2MDsgZWxzZSBpZiAoaCA8IDApIGggKz0gMzYwO1xuICAgICAgaWYgKGggPCA2MCkgcmV0dXJuIG0xICsgKG0yIC0gbTEpICogaCAvIDYwO1xuICAgICAgaWYgKGggPCAxODApIHJldHVybiBtMjtcbiAgICAgIGlmIChoIDwgMjQwKSByZXR1cm4gbTEgKyAobTIgLSBtMSkgKiAoMjQwIC0gaCkgLyA2MDtcbiAgICAgIHJldHVybiBtMTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdnYoaCkge1xuICAgICAgcmV0dXJuIE1hdGgucm91bmQodihoKSAqIDI1NSk7XG4gICAgfVxuICAgIHJldHVybiBkM19yZ2IodnYoaCArIDEyMCksIHZ2KGgpLCB2dihoIC0gMTIwKSk7XG4gIH1cbiAgZDMuaGNsID0gZnVuY3Rpb24oaCwgYywgbCkge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gaCBpbnN0YW5jZW9mIGQzX0hjbCA/IGQzX2hjbChoLmgsIGguYywgaC5sKSA6IGggaW5zdGFuY2VvZiBkM19MYWIgPyBkM19sYWJfaGNsKGgubCwgaC5hLCBoLmIpIDogZDNfbGFiX2hjbCgoaCA9IGQzX3JnYl9sYWIoKGggPSBkMy5yZ2IoaCkpLnIsIGguZywgaC5iKSkubCwgaC5hLCBoLmIpIDogZDNfaGNsKCtoLCArYywgK2wpO1xuICB9O1xuICBmdW5jdGlvbiBkM19oY2woaCwgYywgbCkge1xuICAgIHJldHVybiBuZXcgZDNfSGNsKGgsIGMsIGwpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX0hjbChoLCBjLCBsKSB7XG4gICAgdGhpcy5oID0gaDtcbiAgICB0aGlzLmMgPSBjO1xuICAgIHRoaXMubCA9IGw7XG4gIH1cbiAgdmFyIGQzX2hjbFByb3RvdHlwZSA9IGQzX0hjbC5wcm90b3R5cGUgPSBuZXcgZDNfQ29sb3IoKTtcbiAgZDNfaGNsUHJvdG90eXBlLmJyaWdodGVyID0gZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBkM19oY2wodGhpcy5oLCB0aGlzLmMsIE1hdGgubWluKDEwMCwgdGhpcy5sICsgZDNfbGFiX0sgKiAoYXJndW1lbnRzLmxlbmd0aCA/IGsgOiAxKSkpO1xuICB9O1xuICBkM19oY2xQcm90b3R5cGUuZGFya2VyID0gZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBkM19oY2wodGhpcy5oLCB0aGlzLmMsIE1hdGgubWF4KDAsIHRoaXMubCAtIGQzX2xhYl9LICogKGFyZ3VtZW50cy5sZW5ndGggPyBrIDogMSkpKTtcbiAgfTtcbiAgZDNfaGNsUHJvdG90eXBlLnJnYiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkM19oY2xfbGFiKHRoaXMuaCwgdGhpcy5jLCB0aGlzLmwpLnJnYigpO1xuICB9O1xuICBmdW5jdGlvbiBkM19oY2xfbGFiKGgsIGMsIGwpIHtcbiAgICBpZiAoaXNOYU4oaCkpIGggPSAwO1xuICAgIGlmIChpc05hTihjKSkgYyA9IDA7XG4gICAgcmV0dXJuIGQzX2xhYihsLCBNYXRoLmNvcyhoICo9IGQzX3JhZGlhbnMpICogYywgTWF0aC5zaW4oaCkgKiBjKTtcbiAgfVxuICBkMy5sYWIgPSBmdW5jdGlvbihsLCBhLCBiKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBsIGluc3RhbmNlb2YgZDNfTGFiID8gZDNfbGFiKGwubCwgbC5hLCBsLmIpIDogbCBpbnN0YW5jZW9mIGQzX0hjbCA/IGQzX2hjbF9sYWIobC5sLCBsLmMsIGwuaCkgOiBkM19yZ2JfbGFiKChsID0gZDMucmdiKGwpKS5yLCBsLmcsIGwuYikgOiBkM19sYWIoK2wsICthLCArYik7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2xhYihsLCBhLCBiKSB7XG4gICAgcmV0dXJuIG5ldyBkM19MYWIobCwgYSwgYik7XG4gIH1cbiAgZnVuY3Rpb24gZDNfTGFiKGwsIGEsIGIpIHtcbiAgICB0aGlzLmwgPSBsO1xuICAgIHRoaXMuYSA9IGE7XG4gICAgdGhpcy5iID0gYjtcbiAgfVxuICB2YXIgZDNfbGFiX0sgPSAxODtcbiAgdmFyIGQzX2xhYl9YID0gLjk1MDQ3LCBkM19sYWJfWSA9IDEsIGQzX2xhYl9aID0gMS4wODg4MztcbiAgdmFyIGQzX2xhYlByb3RvdHlwZSA9IGQzX0xhYi5wcm90b3R5cGUgPSBuZXcgZDNfQ29sb3IoKTtcbiAgZDNfbGFiUHJvdG90eXBlLmJyaWdodGVyID0gZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBkM19sYWIoTWF0aC5taW4oMTAwLCB0aGlzLmwgKyBkM19sYWJfSyAqIChhcmd1bWVudHMubGVuZ3RoID8gayA6IDEpKSwgdGhpcy5hLCB0aGlzLmIpO1xuICB9O1xuICBkM19sYWJQcm90b3R5cGUuZGFya2VyID0gZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBkM19sYWIoTWF0aC5tYXgoMCwgdGhpcy5sIC0gZDNfbGFiX0sgKiAoYXJndW1lbnRzLmxlbmd0aCA/IGsgOiAxKSksIHRoaXMuYSwgdGhpcy5iKTtcbiAgfTtcbiAgZDNfbGFiUHJvdG90eXBlLnJnYiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkM19sYWJfcmdiKHRoaXMubCwgdGhpcy5hLCB0aGlzLmIpO1xuICB9O1xuICBmdW5jdGlvbiBkM19sYWJfcmdiKGwsIGEsIGIpIHtcbiAgICB2YXIgeSA9IChsICsgMTYpIC8gMTE2LCB4ID0geSArIGEgLyA1MDAsIHogPSB5IC0gYiAvIDIwMDtcbiAgICB4ID0gZDNfbGFiX3h5eih4KSAqIGQzX2xhYl9YO1xuICAgIHkgPSBkM19sYWJfeHl6KHkpICogZDNfbGFiX1k7XG4gICAgeiA9IGQzX2xhYl94eXooeikgKiBkM19sYWJfWjtcbiAgICByZXR1cm4gZDNfcmdiKGQzX3h5el9yZ2IoMy4yNDA0NTQyICogeCAtIDEuNTM3MTM4NSAqIHkgLSAuNDk4NTMxNCAqIHopLCBkM194eXpfcmdiKC0uOTY5MjY2ICogeCArIDEuODc2MDEwOCAqIHkgKyAuMDQxNTU2ICogeiksIGQzX3h5el9yZ2IoLjA1NTY0MzQgKiB4IC0gLjIwNDAyNTkgKiB5ICsgMS4wNTcyMjUyICogeikpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xhYl9oY2wobCwgYSwgYikge1xuICAgIHJldHVybiBsID4gMCA/IGQzX2hjbChNYXRoLmF0YW4yKGIsIGEpICogZDNfZGVncmVlcywgTWF0aC5zcXJ0KGEgKiBhICsgYiAqIGIpLCBsKSA6IGQzX2hjbChOYU4sIE5hTiwgbCk7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGFiX3h5eih4KSB7XG4gICAgcmV0dXJuIHggPiAuMjA2ODkzMDM0ID8geCAqIHggKiB4IDogKHggLSA0IC8gMjkpIC8gNy43ODcwMzc7XG4gIH1cbiAgZnVuY3Rpb24gZDNfeHl6X2xhYih4KSB7XG4gICAgcmV0dXJuIHggPiAuMDA4ODU2ID8gTWF0aC5wb3coeCwgMSAvIDMpIDogNy43ODcwMzcgKiB4ICsgNCAvIDI5O1xuICB9XG4gIGZ1bmN0aW9uIGQzX3h5el9yZ2Iocikge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKDI1NSAqIChyIDw9IC4wMDMwNCA/IDEyLjkyICogciA6IDEuMDU1ICogTWF0aC5wb3cociwgMSAvIDIuNCkgLSAuMDU1KSk7XG4gIH1cbiAgZDMucmdiID0gZnVuY3Rpb24ociwgZywgYikge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gciBpbnN0YW5jZW9mIGQzX1JnYiA/IGQzX3JnYihyLnIsIHIuZywgci5iKSA6IGQzX3JnYl9wYXJzZShcIlwiICsgciwgZDNfcmdiLCBkM19oc2xfcmdiKSA6IGQzX3JnYih+fnIsIH5+Zywgfn5iKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfcmdiTnVtYmVyKHZhbHVlKSB7XG4gICAgcmV0dXJuIGQzX3JnYih2YWx1ZSA+PiAxNiwgdmFsdWUgPj4gOCAmIDI1NSwgdmFsdWUgJiAyNTUpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3JnYlN0cmluZyh2YWx1ZSkge1xuICAgIHJldHVybiBkM19yZ2JOdW1iZXIodmFsdWUpICsgXCJcIjtcbiAgfVxuICBmdW5jdGlvbiBkM19yZ2IociwgZywgYikge1xuICAgIHJldHVybiBuZXcgZDNfUmdiKHIsIGcsIGIpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX1JnYihyLCBnLCBiKSB7XG4gICAgdGhpcy5yID0gcjtcbiAgICB0aGlzLmcgPSBnO1xuICAgIHRoaXMuYiA9IGI7XG4gIH1cbiAgdmFyIGQzX3JnYlByb3RvdHlwZSA9IGQzX1JnYi5wcm90b3R5cGUgPSBuZXcgZDNfQ29sb3IoKTtcbiAgZDNfcmdiUHJvdG90eXBlLmJyaWdodGVyID0gZnVuY3Rpb24oaykge1xuICAgIGsgPSBNYXRoLnBvdyguNywgYXJndW1lbnRzLmxlbmd0aCA/IGsgOiAxKTtcbiAgICB2YXIgciA9IHRoaXMuciwgZyA9IHRoaXMuZywgYiA9IHRoaXMuYiwgaSA9IDMwO1xuICAgIGlmICghciAmJiAhZyAmJiAhYikgcmV0dXJuIGQzX3JnYihpLCBpLCBpKTtcbiAgICBpZiAociAmJiByIDwgaSkgciA9IGk7XG4gICAgaWYgKGcgJiYgZyA8IGkpIGcgPSBpO1xuICAgIGlmIChiICYmIGIgPCBpKSBiID0gaTtcbiAgICByZXR1cm4gZDNfcmdiKE1hdGgubWluKDI1NSwgfn4ociAvIGspKSwgTWF0aC5taW4oMjU1LCB+fihnIC8gaykpLCBNYXRoLm1pbigyNTUsIH5+KGIgLyBrKSkpO1xuICB9O1xuICBkM19yZ2JQcm90b3R5cGUuZGFya2VyID0gZnVuY3Rpb24oaykge1xuICAgIGsgPSBNYXRoLnBvdyguNywgYXJndW1lbnRzLmxlbmd0aCA/IGsgOiAxKTtcbiAgICByZXR1cm4gZDNfcmdiKH5+KGsgKiB0aGlzLnIpLCB+fihrICogdGhpcy5nKSwgfn4oayAqIHRoaXMuYikpO1xuICB9O1xuICBkM19yZ2JQcm90b3R5cGUuaHNsID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX3JnYl9oc2wodGhpcy5yLCB0aGlzLmcsIHRoaXMuYik7XG4gIH07XG4gIGQzX3JnYlByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBcIiNcIiArIGQzX3JnYl9oZXgodGhpcy5yKSArIGQzX3JnYl9oZXgodGhpcy5nKSArIGQzX3JnYl9oZXgodGhpcy5iKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfcmdiX2hleCh2KSB7XG4gICAgcmV0dXJuIHYgPCAxNiA/IFwiMFwiICsgTWF0aC5tYXgoMCwgdikudG9TdHJpbmcoMTYpIDogTWF0aC5taW4oMjU1LCB2KS50b1N0cmluZygxNik7XG4gIH1cbiAgZnVuY3Rpb24gZDNfcmdiX3BhcnNlKGZvcm1hdCwgcmdiLCBoc2wpIHtcbiAgICB2YXIgciA9IDAsIGcgPSAwLCBiID0gMCwgbTEsIG0yLCBuYW1lO1xuICAgIG0xID0gLyhbYS16XSspXFwoKC4qKVxcKS9pLmV4ZWMoZm9ybWF0KTtcbiAgICBpZiAobTEpIHtcbiAgICAgIG0yID0gbTFbMl0uc3BsaXQoXCIsXCIpO1xuICAgICAgc3dpdGNoIChtMVsxXSkge1xuICAgICAgIGNhc2UgXCJoc2xcIjpcbiAgICAgICAge1xuICAgICAgICAgIHJldHVybiBoc2wocGFyc2VGbG9hdChtMlswXSksIHBhcnNlRmxvYXQobTJbMV0pIC8gMTAwLCBwYXJzZUZsb2F0KG0yWzJdKSAvIDEwMCk7XG4gICAgICAgIH1cblxuICAgICAgIGNhc2UgXCJyZ2JcIjpcbiAgICAgICAge1xuICAgICAgICAgIHJldHVybiByZ2IoZDNfcmdiX3BhcnNlTnVtYmVyKG0yWzBdKSwgZDNfcmdiX3BhcnNlTnVtYmVyKG0yWzFdKSwgZDNfcmdiX3BhcnNlTnVtYmVyKG0yWzJdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5hbWUgPSBkM19yZ2JfbmFtZXMuZ2V0KGZvcm1hdCkpIHJldHVybiByZ2IobmFtZS5yLCBuYW1lLmcsIG5hbWUuYik7XG4gICAgaWYgKGZvcm1hdCAhPSBudWxsICYmIGZvcm1hdC5jaGFyQXQoMCkgPT09IFwiI1wiKSB7XG4gICAgICBpZiAoZm9ybWF0Lmxlbmd0aCA9PT0gNCkge1xuICAgICAgICByID0gZm9ybWF0LmNoYXJBdCgxKTtcbiAgICAgICAgciArPSByO1xuICAgICAgICBnID0gZm9ybWF0LmNoYXJBdCgyKTtcbiAgICAgICAgZyArPSBnO1xuICAgICAgICBiID0gZm9ybWF0LmNoYXJBdCgzKTtcbiAgICAgICAgYiArPSBiO1xuICAgICAgfSBlbHNlIGlmIChmb3JtYXQubGVuZ3RoID09PSA3KSB7XG4gICAgICAgIHIgPSBmb3JtYXQuc3Vic3RyaW5nKDEsIDMpO1xuICAgICAgICBnID0gZm9ybWF0LnN1YnN0cmluZygzLCA1KTtcbiAgICAgICAgYiA9IGZvcm1hdC5zdWJzdHJpbmcoNSwgNyk7XG4gICAgICB9XG4gICAgICByID0gcGFyc2VJbnQociwgMTYpO1xuICAgICAgZyA9IHBhcnNlSW50KGcsIDE2KTtcbiAgICAgIGIgPSBwYXJzZUludChiLCAxNik7XG4gICAgfVxuICAgIHJldHVybiByZ2IociwgZywgYik7XG4gIH1cbiAgZnVuY3Rpb24gZDNfcmdiX2hzbChyLCBnLCBiKSB7XG4gICAgdmFyIG1pbiA9IE1hdGgubWluKHIgLz0gMjU1LCBnIC89IDI1NSwgYiAvPSAyNTUpLCBtYXggPSBNYXRoLm1heChyLCBnLCBiKSwgZCA9IG1heCAtIG1pbiwgaCwgcywgbCA9IChtYXggKyBtaW4pIC8gMjtcbiAgICBpZiAoZCkge1xuICAgICAgcyA9IGwgPCAuNSA/IGQgLyAobWF4ICsgbWluKSA6IGQgLyAoMiAtIG1heCAtIG1pbik7XG4gICAgICBpZiAociA9PSBtYXgpIGggPSAoZyAtIGIpIC8gZCArIChnIDwgYiA/IDYgOiAwKTsgZWxzZSBpZiAoZyA9PSBtYXgpIGggPSAoYiAtIHIpIC8gZCArIDI7IGVsc2UgaCA9IChyIC0gZykgLyBkICsgNDtcbiAgICAgIGggKj0gNjA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGggPSBOYU47XG4gICAgICBzID0gbCA+IDAgJiYgbCA8IDEgPyAwIDogaDtcbiAgICB9XG4gICAgcmV0dXJuIGQzX2hzbChoLCBzLCBsKTtcbiAgfVxuICBmdW5jdGlvbiBkM19yZ2JfbGFiKHIsIGcsIGIpIHtcbiAgICByID0gZDNfcmdiX3h5eihyKTtcbiAgICBnID0gZDNfcmdiX3h5eihnKTtcbiAgICBiID0gZDNfcmdiX3h5eihiKTtcbiAgICB2YXIgeCA9IGQzX3h5el9sYWIoKC40MTI0NTY0ICogciArIC4zNTc1NzYxICogZyArIC4xODA0Mzc1ICogYikgLyBkM19sYWJfWCksIHkgPSBkM194eXpfbGFiKCguMjEyNjcyOSAqIHIgKyAuNzE1MTUyMiAqIGcgKyAuMDcyMTc1ICogYikgLyBkM19sYWJfWSksIHogPSBkM194eXpfbGFiKCguMDE5MzMzOSAqIHIgKyAuMTE5MTkyICogZyArIC45NTAzMDQxICogYikgLyBkM19sYWJfWik7XG4gICAgcmV0dXJuIGQzX2xhYigxMTYgKiB5IC0gMTYsIDUwMCAqICh4IC0geSksIDIwMCAqICh5IC0geikpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3JnYl94eXoocikge1xuICAgIHJldHVybiAociAvPSAyNTUpIDw9IC4wNDA0NSA/IHIgLyAxMi45MiA6IE1hdGgucG93KChyICsgLjA1NSkgLyAxLjA1NSwgMi40KTtcbiAgfVxuICBmdW5jdGlvbiBkM19yZ2JfcGFyc2VOdW1iZXIoYykge1xuICAgIHZhciBmID0gcGFyc2VGbG9hdChjKTtcbiAgICByZXR1cm4gYy5jaGFyQXQoYy5sZW5ndGggLSAxKSA9PT0gXCIlXCIgPyBNYXRoLnJvdW5kKGYgKiAyLjU1KSA6IGY7XG4gIH1cbiAgdmFyIGQzX3JnYl9uYW1lcyA9IGQzLm1hcCh7XG4gICAgYWxpY2VibHVlOiAxNTc5MjM4MyxcbiAgICBhbnRpcXVld2hpdGU6IDE2NDQ0Mzc1LFxuICAgIGFxdWE6IDY1NTM1LFxuICAgIGFxdWFtYXJpbmU6IDgzODg1NjQsXG4gICAgYXp1cmU6IDE1Nzk0MTc1LFxuICAgIGJlaWdlOiAxNjExOTI2MCxcbiAgICBiaXNxdWU6IDE2NzcwMjQ0LFxuICAgIGJsYWNrOiAwLFxuICAgIGJsYW5jaGVkYWxtb25kOiAxNjc3MjA0NSxcbiAgICBibHVlOiAyNTUsXG4gICAgYmx1ZXZpb2xldDogOTA1NTIwMixcbiAgICBicm93bjogMTA4MjQyMzQsXG4gICAgYnVybHl3b29kOiAxNDU5NjIzMSxcbiAgICBjYWRldGJsdWU6IDYyNjY1MjgsXG4gICAgY2hhcnRyZXVzZTogODM4ODM1MixcbiAgICBjaG9jb2xhdGU6IDEzNzg5NDcwLFxuICAgIGNvcmFsOiAxNjc0NDI3MixcbiAgICBjb3JuZmxvd2VyYmx1ZTogNjU5MTk4MSxcbiAgICBjb3Juc2lsazogMTY3NzUzODgsXG4gICAgY3JpbXNvbjogMTQ0MjMxMDAsXG4gICAgY3lhbjogNjU1MzUsXG4gICAgZGFya2JsdWU6IDEzOSxcbiAgICBkYXJrY3lhbjogMzU3MjMsXG4gICAgZGFya2dvbGRlbnJvZDogMTIwOTI5MzksXG4gICAgZGFya2dyYXk6IDExMTE5MDE3LFxuICAgIGRhcmtncmVlbjogMjU2MDAsXG4gICAgZGFya2dyZXk6IDExMTE5MDE3LFxuICAgIGRhcmtraGFraTogMTI0MzMyNTksXG4gICAgZGFya21hZ2VudGE6IDkxMDk2NDMsXG4gICAgZGFya29saXZlZ3JlZW46IDU1OTc5OTksXG4gICAgZGFya29yYW5nZTogMTY3NDc1MjAsXG4gICAgZGFya29yY2hpZDogMTAwNDAwMTIsXG4gICAgZGFya3JlZDogOTEwOTUwNCxcbiAgICBkYXJrc2FsbW9uOiAxNTMwODQxMCxcbiAgICBkYXJrc2VhZ3JlZW46IDk0MTk5MTksXG4gICAgZGFya3NsYXRlYmx1ZTogNDczNDM0NyxcbiAgICBkYXJrc2xhdGVncmF5OiAzMTAwNDk1LFxuICAgIGRhcmtzbGF0ZWdyZXk6IDMxMDA0OTUsXG4gICAgZGFya3R1cnF1b2lzZTogNTI5NDUsXG4gICAgZGFya3Zpb2xldDogOTY5OTUzOSxcbiAgICBkZWVwcGluazogMTY3MTY5NDcsXG4gICAgZGVlcHNreWJsdWU6IDQ5MTUxLFxuICAgIGRpbWdyYXk6IDY5MDgyNjUsXG4gICAgZGltZ3JleTogNjkwODI2NSxcbiAgICBkb2RnZXJibHVlOiAyMDAzMTk5LFxuICAgIGZpcmVicmljazogMTE2NzQxNDYsXG4gICAgZmxvcmFsd2hpdGU6IDE2Nzc1OTIwLFxuICAgIGZvcmVzdGdyZWVuOiAyMjYzODQyLFxuICAgIGZ1Y2hzaWE6IDE2NzExOTM1LFxuICAgIGdhaW5zYm9ybzogMTQ0NzQ0NjAsXG4gICAgZ2hvc3R3aGl0ZTogMTYzMTY2NzEsXG4gICAgZ29sZDogMTY3NjY3MjAsXG4gICAgZ29sZGVucm9kOiAxNDMyOTEyMCxcbiAgICBncmF5OiA4NDIxNTA0LFxuICAgIGdyZWVuOiAzMjc2OCxcbiAgICBncmVlbnllbGxvdzogMTE0MDMwNTUsXG4gICAgZ3JleTogODQyMTUwNCxcbiAgICBob25leWRldzogMTU3OTQxNjAsXG4gICAgaG90cGluazogMTY3Mzg3NDAsXG4gICAgaW5kaWFucmVkOiAxMzQ1ODUyNCxcbiAgICBpbmRpZ286IDQ5MTUzMzAsXG4gICAgaXZvcnk6IDE2Nzc3MjAwLFxuICAgIGtoYWtpOiAxNTc4NzY2MCxcbiAgICBsYXZlbmRlcjogMTUxMzI0MTAsXG4gICAgbGF2ZW5kZXJibHVzaDogMTY3NzMzNjUsXG4gICAgbGF3bmdyZWVuOiA4MTkwOTc2LFxuICAgIGxlbW9uY2hpZmZvbjogMTY3NzU4ODUsXG4gICAgbGlnaHRibHVlOiAxMTM5MzI1NCxcbiAgICBsaWdodGNvcmFsOiAxNTc2MTUzNixcbiAgICBsaWdodGN5YW46IDE0NzQ1NTk5LFxuICAgIGxpZ2h0Z29sZGVucm9keWVsbG93OiAxNjQ0ODIxMCxcbiAgICBsaWdodGdyYXk6IDEzODgyMzIzLFxuICAgIGxpZ2h0Z3JlZW46IDk0OTgyNTYsXG4gICAgbGlnaHRncmV5OiAxMzg4MjMyMyxcbiAgICBsaWdodHBpbms6IDE2NzU4NDY1LFxuICAgIGxpZ2h0c2FsbW9uOiAxNjc1Mjc2MixcbiAgICBsaWdodHNlYWdyZWVuOiAyMTQyODkwLFxuICAgIGxpZ2h0c2t5Ymx1ZTogODkwMDM0NixcbiAgICBsaWdodHNsYXRlZ3JheTogNzgzMzc1MyxcbiAgICBsaWdodHNsYXRlZ3JleTogNzgzMzc1MyxcbiAgICBsaWdodHN0ZWVsYmx1ZTogMTE1ODQ3MzQsXG4gICAgbGlnaHR5ZWxsb3c6IDE2Nzc3MTg0LFxuICAgIGxpbWU6IDY1MjgwLFxuICAgIGxpbWVncmVlbjogMzMyOTMzMCxcbiAgICBsaW5lbjogMTY0NDU2NzAsXG4gICAgbWFnZW50YTogMTY3MTE5MzUsXG4gICAgbWFyb29uOiA4Mzg4NjA4LFxuICAgIG1lZGl1bWFxdWFtYXJpbmU6IDY3MzczMjIsXG4gICAgbWVkaXVtYmx1ZTogMjA1LFxuICAgIG1lZGl1bW9yY2hpZDogMTIyMTE2NjcsXG4gICAgbWVkaXVtcHVycGxlOiA5NjYyNjgzLFxuICAgIG1lZGl1bXNlYWdyZWVuOiAzOTc4MDk3LFxuICAgIG1lZGl1bXNsYXRlYmx1ZTogODA4Nzc5MCxcbiAgICBtZWRpdW1zcHJpbmdncmVlbjogNjQxNTQsXG4gICAgbWVkaXVtdHVycXVvaXNlOiA0NzcyMzAwLFxuICAgIG1lZGl1bXZpb2xldHJlZDogMTMwNDcxNzMsXG4gICAgbWlkbmlnaHRibHVlOiAxNjQ0OTEyLFxuICAgIG1pbnRjcmVhbTogMTYxMjE4NTAsXG4gICAgbWlzdHlyb3NlOiAxNjc3MDI3MyxcbiAgICBtb2NjYXNpbjogMTY3NzAyMjksXG4gICAgbmF2YWpvd2hpdGU6IDE2NzY4Njg1LFxuICAgIG5hdnk6IDEyOCxcbiAgICBvbGRsYWNlOiAxNjY0MzU1OCxcbiAgICBvbGl2ZTogODQyMTM3NixcbiAgICBvbGl2ZWRyYWI6IDcwNDg3MzksXG4gICAgb3JhbmdlOiAxNjc1MzkyMCxcbiAgICBvcmFuZ2VyZWQ6IDE2NzI5MzQ0LFxuICAgIG9yY2hpZDogMTQzMTU3MzQsXG4gICAgcGFsZWdvbGRlbnJvZDogMTU2NTcxMzAsXG4gICAgcGFsZWdyZWVuOiAxMDAyNTg4MCxcbiAgICBwYWxldHVycXVvaXNlOiAxMTUyOTk2NixcbiAgICBwYWxldmlvbGV0cmVkOiAxNDM4MTIwMyxcbiAgICBwYXBheWF3aGlwOiAxNjc3MzA3NyxcbiAgICBwZWFjaHB1ZmY6IDE2NzY3NjczLFxuICAgIHBlcnU6IDEzNDY4OTkxLFxuICAgIHBpbms6IDE2NzYxMDM1LFxuICAgIHBsdW06IDE0NTI0NjM3LFxuICAgIHBvd2RlcmJsdWU6IDExNTkxOTEwLFxuICAgIHB1cnBsZTogODM4ODczNixcbiAgICByZWQ6IDE2NzExNjgwLFxuICAgIHJvc3licm93bjogMTIzNTc1MTksXG4gICAgcm95YWxibHVlOiA0Mjg2OTQ1LFxuICAgIHNhZGRsZWJyb3duOiA5MTI3MTg3LFxuICAgIHNhbG1vbjogMTY0MTY4ODIsXG4gICAgc2FuZHlicm93bjogMTYwMzI4NjQsXG4gICAgc2VhZ3JlZW46IDMwNTAzMjcsXG4gICAgc2Vhc2hlbGw6IDE2Nzc0NjM4LFxuICAgIHNpZW5uYTogMTA1MDY3OTcsXG4gICAgc2lsdmVyOiAxMjYzMjI1NixcbiAgICBza3libHVlOiA4OTAwMzMxLFxuICAgIHNsYXRlYmx1ZTogNjk3MDA2MSxcbiAgICBzbGF0ZWdyYXk6IDczNzI5NDQsXG4gICAgc2xhdGVncmV5OiA3MzcyOTQ0LFxuICAgIHNub3c6IDE2Nzc1OTMwLFxuICAgIHNwcmluZ2dyZWVuOiA2NTQwNyxcbiAgICBzdGVlbGJsdWU6IDQ2MjA5ODAsXG4gICAgdGFuOiAxMzgwODc4MCxcbiAgICB0ZWFsOiAzMjg5NixcbiAgICB0aGlzdGxlOiAxNDIwNDg4OCxcbiAgICB0b21hdG86IDE2NzM3MDk1LFxuICAgIHR1cnF1b2lzZTogNDI1MTg1NixcbiAgICB2aW9sZXQ6IDE1NjMxMDg2LFxuICAgIHdoZWF0OiAxNjExMzMzMSxcbiAgICB3aGl0ZTogMTY3NzcyMTUsXG4gICAgd2hpdGVzbW9rZTogMTYxMTkyODUsXG4gICAgeWVsbG93OiAxNjc3Njk2MCxcbiAgICB5ZWxsb3dncmVlbjogMTAxNDUwNzRcbiAgfSk7XG4gIGQzX3JnYl9uYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICBkM19yZ2JfbmFtZXMuc2V0KGtleSwgZDNfcmdiTnVtYmVyKHZhbHVlKSk7XG4gIH0pO1xuICBmdW5jdGlvbiBkM19mdW5jdG9yKHYpIHtcbiAgICByZXR1cm4gdHlwZW9mIHYgPT09IFwiZnVuY3Rpb25cIiA/IHYgOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2O1xuICAgIH07XG4gIH1cbiAgZDMuZnVuY3RvciA9IGQzX2Z1bmN0b3I7XG4gIGZ1bmN0aW9uIGQzX2lkZW50aXR5KGQpIHtcbiAgICByZXR1cm4gZDtcbiAgfVxuICBkMy54aHIgPSBkM194aHJUeXBlKGQzX2lkZW50aXR5KTtcbiAgZnVuY3Rpb24gZDNfeGhyVHlwZShyZXNwb25zZSkge1xuICAgIHJldHVybiBmdW5jdGlvbih1cmwsIG1pbWVUeXBlLCBjYWxsYmFjaykge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgdHlwZW9mIG1pbWVUeXBlID09PSBcImZ1bmN0aW9uXCIpIGNhbGxiYWNrID0gbWltZVR5cGUsIFxuICAgICAgbWltZVR5cGUgPSBudWxsO1xuICAgICAgcmV0dXJuIGQzX3hocih1cmwsIG1pbWVUeXBlLCByZXNwb25zZSwgY2FsbGJhY2spO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gZDNfeGhyKHVybCwgbWltZVR5cGUsIHJlc3BvbnNlLCBjYWxsYmFjaykge1xuICAgIHZhciB4aHIgPSB7fSwgZGlzcGF0Y2ggPSBkMy5kaXNwYXRjaChcImJlZm9yZXNlbmRcIiwgXCJwcm9ncmVzc1wiLCBcImxvYWRcIiwgXCJlcnJvclwiKSwgaGVhZGVycyA9IHt9LCByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCksIHJlc3BvbnNlVHlwZSA9IG51bGw7XG4gICAgaWYgKGQzX3dpbmRvdy5YRG9tYWluUmVxdWVzdCAmJiAhKFwid2l0aENyZWRlbnRpYWxzXCIgaW4gcmVxdWVzdCkgJiYgL14oaHR0cChzKT86KT9cXC9cXC8vLnRlc3QodXJsKSkgcmVxdWVzdCA9IG5ldyBYRG9tYWluUmVxdWVzdCgpO1xuICAgIFwib25sb2FkXCIgaW4gcmVxdWVzdCA/IHJlcXVlc3Qub25sb2FkID0gcmVxdWVzdC5vbmVycm9yID0gcmVzcG9uZCA6IHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXF1ZXN0LnJlYWR5U3RhdGUgPiAzICYmIHJlc3BvbmQoKTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIHJlc3BvbmQoKSB7XG4gICAgICB2YXIgc3RhdHVzID0gcmVxdWVzdC5zdGF0dXMsIHJlc3VsdDtcbiAgICAgIGlmICghc3RhdHVzICYmIHJlcXVlc3QucmVzcG9uc2VUZXh0IHx8IHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgMzAwIHx8IHN0YXR1cyA9PT0gMzA0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzdWx0ID0gcmVzcG9uc2UuY2FsbCh4aHIsIHJlcXVlc3QpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgZGlzcGF0Y2guZXJyb3IuY2FsbCh4aHIsIGUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBkaXNwYXRjaC5sb2FkLmNhbGwoeGhyLCByZXN1bHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGlzcGF0Y2guZXJyb3IuY2FsbCh4aHIsIHJlcXVlc3QpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXF1ZXN0Lm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgdmFyIG8gPSBkMy5ldmVudDtcbiAgICAgIGQzLmV2ZW50ID0gZXZlbnQ7XG4gICAgICB0cnkge1xuICAgICAgICBkaXNwYXRjaC5wcm9ncmVzcy5jYWxsKHhociwgcmVxdWVzdCk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBkMy5ldmVudCA9IG87XG4gICAgICB9XG4gICAgfTtcbiAgICB4aHIuaGVhZGVyID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgIG5hbWUgPSAobmFtZSArIFwiXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHJldHVybiBoZWFkZXJzW25hbWVdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIGRlbGV0ZSBoZWFkZXJzW25hbWVdOyBlbHNlIGhlYWRlcnNbbmFtZV0gPSB2YWx1ZSArIFwiXCI7XG4gICAgICByZXR1cm4geGhyO1xuICAgIH07XG4gICAgeGhyLm1pbWVUeXBlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG1pbWVUeXBlO1xuICAgICAgbWltZVR5cGUgPSB2YWx1ZSA9PSBudWxsID8gbnVsbCA6IHZhbHVlICsgXCJcIjtcbiAgICAgIHJldHVybiB4aHI7XG4gICAgfTtcbiAgICB4aHIucmVzcG9uc2VUeXBlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHJlc3BvbnNlVHlwZTtcbiAgICAgIHJlc3BvbnNlVHlwZSA9IHZhbHVlO1xuICAgICAgcmV0dXJuIHhocjtcbiAgICB9O1xuICAgIHhoci5yZXNwb25zZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXNwb25zZSA9IHZhbHVlO1xuICAgICAgcmV0dXJuIHhocjtcbiAgICB9O1xuICAgIFsgXCJnZXRcIiwgXCJwb3N0XCIgXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgICAgeGhyW21ldGhvZF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHhoci5zZW5kLmFwcGx5KHhociwgWyBtZXRob2QgXS5jb25jYXQoZDNfYXJyYXkoYXJndW1lbnRzKSkpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgICB4aHIuc2VuZCA9IGZ1bmN0aW9uKG1ldGhvZCwgZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyICYmIHR5cGVvZiBkYXRhID09PSBcImZ1bmN0aW9uXCIpIGNhbGxiYWNrID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gICAgICByZXF1ZXN0Lm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuICAgICAgaWYgKG1pbWVUeXBlICE9IG51bGwgJiYgIShcImFjY2VwdFwiIGluIGhlYWRlcnMpKSBoZWFkZXJzW1wiYWNjZXB0XCJdID0gbWltZVR5cGUgKyBcIiwqLypcIjtcbiAgICAgIGlmIChyZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIpIGZvciAodmFyIG5hbWUgaW4gaGVhZGVycykgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKG5hbWUsIGhlYWRlcnNbbmFtZV0pO1xuICAgICAgaWYgKG1pbWVUeXBlICE9IG51bGwgJiYgcmVxdWVzdC5vdmVycmlkZU1pbWVUeXBlKSByZXF1ZXN0Lm92ZXJyaWRlTWltZVR5cGUobWltZVR5cGUpO1xuICAgICAgaWYgKHJlc3BvbnNlVHlwZSAhPSBudWxsKSByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9IHJlc3BvbnNlVHlwZTtcbiAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSB4aHIub24oXCJlcnJvclwiLCBjYWxsYmFjaykub24oXCJsb2FkXCIsIGZ1bmN0aW9uKHJlcXVlc3QpIHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVxdWVzdCk7XG4gICAgICB9KTtcbiAgICAgIGRpc3BhdGNoLmJlZm9yZXNlbmQuY2FsbCh4aHIsIHJlcXVlc3QpO1xuICAgICAgcmVxdWVzdC5zZW5kKGRhdGEgPT0gbnVsbCA/IG51bGwgOiBkYXRhKTtcbiAgICAgIHJldHVybiB4aHI7XG4gICAgfTtcbiAgICB4aHIuYWJvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJlcXVlc3QuYWJvcnQoKTtcbiAgICAgIHJldHVybiB4aHI7XG4gICAgfTtcbiAgICBkMy5yZWJpbmQoeGhyLCBkaXNwYXRjaCwgXCJvblwiKTtcbiAgICByZXR1cm4gY2FsbGJhY2sgPT0gbnVsbCA/IHhociA6IHhoci5nZXQoZDNfeGhyX2ZpeENhbGxiYWNrKGNhbGxiYWNrKSk7XG4gIH1cbiAgZnVuY3Rpb24gZDNfeGhyX2ZpeENhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrLmxlbmd0aCA9PT0gMSA/IGZ1bmN0aW9uKGVycm9yLCByZXF1ZXN0KSB7XG4gICAgICBjYWxsYmFjayhlcnJvciA9PSBudWxsID8gcmVxdWVzdCA6IG51bGwpO1xuICAgIH0gOiBjYWxsYmFjaztcbiAgfVxuICBkMy5kc3YgPSBmdW5jdGlvbihkZWxpbWl0ZXIsIG1pbWVUeXBlKSB7XG4gICAgdmFyIHJlRm9ybWF0ID0gbmV3IFJlZ0V4cCgnW1wiJyArIGRlbGltaXRlciArIFwiXFxuXVwiKSwgZGVsaW1pdGVyQ29kZSA9IGRlbGltaXRlci5jaGFyQ29kZUF0KDApO1xuICAgIGZ1bmN0aW9uIGRzdih1cmwsIHJvdywgY2FsbGJhY2spIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykgY2FsbGJhY2sgPSByb3csIHJvdyA9IG51bGw7XG4gICAgICB2YXIgeGhyID0gZDNfeGhyKHVybCwgbWltZVR5cGUsIHJvdyA9PSBudWxsID8gcmVzcG9uc2UgOiB0eXBlZFJlc3BvbnNlKHJvdyksIGNhbGxiYWNrKTtcbiAgICAgIHhoci5yb3cgPSBmdW5jdGlvbihfKSB7XG4gICAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8geGhyLnJlc3BvbnNlKChyb3cgPSBfKSA9PSBudWxsID8gcmVzcG9uc2UgOiB0eXBlZFJlc3BvbnNlKF8pKSA6IHJvdztcbiAgICAgIH07XG4gICAgICByZXR1cm4geGhyO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZXNwb25zZShyZXF1ZXN0KSB7XG4gICAgICByZXR1cm4gZHN2LnBhcnNlKHJlcXVlc3QucmVzcG9uc2VUZXh0KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdHlwZWRSZXNwb25zZShmKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24ocmVxdWVzdCkge1xuICAgICAgICByZXR1cm4gZHN2LnBhcnNlKHJlcXVlc3QucmVzcG9uc2VUZXh0LCBmKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGRzdi5wYXJzZSA9IGZ1bmN0aW9uKHRleHQsIGYpIHtcbiAgICAgIHZhciBvO1xuICAgICAgcmV0dXJuIGRzdi5wYXJzZVJvd3ModGV4dCwgZnVuY3Rpb24ocm93LCBpKSB7XG4gICAgICAgIGlmIChvKSByZXR1cm4gbyhyb3csIGkgLSAxKTtcbiAgICAgICAgdmFyIGEgPSBuZXcgRnVuY3Rpb24oXCJkXCIsIFwicmV0dXJuIHtcIiArIHJvdy5tYXAoZnVuY3Rpb24obmFtZSwgaSkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShuYW1lKSArIFwiOiBkW1wiICsgaSArIFwiXVwiO1xuICAgICAgICB9KS5qb2luKFwiLFwiKSArIFwifVwiKTtcbiAgICAgICAgbyA9IGYgPyBmdW5jdGlvbihyb3csIGkpIHtcbiAgICAgICAgICByZXR1cm4gZihhKHJvdyksIGkpO1xuICAgICAgICB9IDogYTtcbiAgICAgIH0pO1xuICAgIH07XG4gICAgZHN2LnBhcnNlUm93cyA9IGZ1bmN0aW9uKHRleHQsIGYpIHtcbiAgICAgIHZhciBFT0wgPSB7fSwgRU9GID0ge30sIHJvd3MgPSBbXSwgTiA9IHRleHQubGVuZ3RoLCBJID0gMCwgbiA9IDAsIHQsIGVvbDtcbiAgICAgIGZ1bmN0aW9uIHRva2VuKCkge1xuICAgICAgICBpZiAoSSA+PSBOKSByZXR1cm4gRU9GO1xuICAgICAgICBpZiAoZW9sKSByZXR1cm4gZW9sID0gZmFsc2UsIEVPTDtcbiAgICAgICAgdmFyIGogPSBJO1xuICAgICAgICBpZiAodGV4dC5jaGFyQ29kZUF0KGopID09PSAzNCkge1xuICAgICAgICAgIHZhciBpID0gajtcbiAgICAgICAgICB3aGlsZSAoaSsrIDwgTikge1xuICAgICAgICAgICAgaWYgKHRleHQuY2hhckNvZGVBdChpKSA9PT0gMzQpIHtcbiAgICAgICAgICAgICAgaWYgKHRleHQuY2hhckNvZGVBdChpICsgMSkgIT09IDM0KSBicmVhaztcbiAgICAgICAgICAgICAgKytpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBJID0gaSArIDI7XG4gICAgICAgICAgdmFyIGMgPSB0ZXh0LmNoYXJDb2RlQXQoaSArIDEpO1xuICAgICAgICAgIGlmIChjID09PSAxMykge1xuICAgICAgICAgICAgZW9sID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQoaSArIDIpID09PSAxMCkgKytJO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gMTApIHtcbiAgICAgICAgICAgIGVvbCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0ZXh0LnN1YnN0cmluZyhqICsgMSwgaSkucmVwbGFjZSgvXCJcIi9nLCAnXCInKTtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoSSA8IE4pIHtcbiAgICAgICAgICB2YXIgYyA9IHRleHQuY2hhckNvZGVBdChJKyspLCBrID0gMTtcbiAgICAgICAgICBpZiAoYyA9PT0gMTApIGVvbCA9IHRydWU7IGVsc2UgaWYgKGMgPT09IDEzKSB7XG4gICAgICAgICAgICBlb2wgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gMTApICsrSSwgKytrO1xuICAgICAgICAgIH0gZWxzZSBpZiAoYyAhPT0gZGVsaW1pdGVyQ29kZSkgY29udGludWU7XG4gICAgICAgICAgcmV0dXJuIHRleHQuc3Vic3RyaW5nKGosIEkgLSBrKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGV4dC5zdWJzdHJpbmcoaik7XG4gICAgICB9XG4gICAgICB3aGlsZSAoKHQgPSB0b2tlbigpKSAhPT0gRU9GKSB7XG4gICAgICAgIHZhciBhID0gW107XG4gICAgICAgIHdoaWxlICh0ICE9PSBFT0wgJiYgdCAhPT0gRU9GKSB7XG4gICAgICAgICAgYS5wdXNoKHQpO1xuICAgICAgICAgIHQgPSB0b2tlbigpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmICYmICEoYSA9IGYoYSwgbisrKSkpIGNvbnRpbnVlO1xuICAgICAgICByb3dzLnB1c2goYSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcm93cztcbiAgICB9O1xuICAgIGRzdi5mb3JtYXQgPSBmdW5jdGlvbihyb3dzKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyb3dzWzBdKSkgcmV0dXJuIGRzdi5mb3JtYXRSb3dzKHJvd3MpO1xuICAgICAgdmFyIGZpZWxkU2V0ID0gbmV3IGQzX1NldCgpLCBmaWVsZHMgPSBbXTtcbiAgICAgIHJvd3MuZm9yRWFjaChmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgZm9yICh2YXIgZmllbGQgaW4gcm93KSB7XG4gICAgICAgICAgaWYgKCFmaWVsZFNldC5oYXMoZmllbGQpKSB7XG4gICAgICAgICAgICBmaWVsZHMucHVzaChmaWVsZFNldC5hZGQoZmllbGQpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIFsgZmllbGRzLm1hcChmb3JtYXRWYWx1ZSkuam9pbihkZWxpbWl0ZXIpIF0uY29uY2F0KHJvd3MubWFwKGZ1bmN0aW9uKHJvdykge1xuICAgICAgICByZXR1cm4gZmllbGRzLm1hcChmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICAgIHJldHVybiBmb3JtYXRWYWx1ZShyb3dbZmllbGRdKTtcbiAgICAgICAgfSkuam9pbihkZWxpbWl0ZXIpO1xuICAgICAgfSkpLmpvaW4oXCJcXG5cIik7XG4gICAgfTtcbiAgICBkc3YuZm9ybWF0Um93cyA9IGZ1bmN0aW9uKHJvd3MpIHtcbiAgICAgIHJldHVybiByb3dzLm1hcChmb3JtYXRSb3cpLmpvaW4oXCJcXG5cIik7XG4gICAgfTtcbiAgICBmdW5jdGlvbiBmb3JtYXRSb3cocm93KSB7XG4gICAgICByZXR1cm4gcm93Lm1hcChmb3JtYXRWYWx1ZSkuam9pbihkZWxpbWl0ZXIpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBmb3JtYXRWYWx1ZSh0ZXh0KSB7XG4gICAgICByZXR1cm4gcmVGb3JtYXQudGVzdCh0ZXh0KSA/ICdcIicgKyB0ZXh0LnJlcGxhY2UoL1xcXCIvZywgJ1wiXCInKSArICdcIicgOiB0ZXh0O1xuICAgIH1cbiAgICByZXR1cm4gZHN2O1xuICB9O1xuICBkMy5jc3YgPSBkMy5kc3YoXCIsXCIsIFwidGV4dC9jc3ZcIik7XG4gIGQzLnRzdiA9IGQzLmRzdihcIlx0XCIsIFwidGV4dC90YWItc2VwYXJhdGVkLXZhbHVlc1wiKTtcbiAgdmFyIGQzX3RpbWVyX3F1ZXVlSGVhZCwgZDNfdGltZXJfcXVldWVUYWlsLCBkM190aW1lcl9pbnRlcnZhbCwgZDNfdGltZXJfdGltZW91dCwgZDNfdGltZXJfYWN0aXZlLCBkM190aW1lcl9mcmFtZSA9IGQzX3dpbmRvd1tkM192ZW5kb3JTeW1ib2woZDNfd2luZG93LCBcInJlcXVlc3RBbmltYXRpb25GcmFtZVwiKV0gfHwgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxNyk7XG4gIH07XG4gIGQzLnRpbWVyID0gZnVuY3Rpb24oY2FsbGJhY2ssIGRlbGF5LCB0aGVuKSB7XG4gICAgdmFyIG4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGlmIChuIDwgMikgZGVsYXkgPSAwO1xuICAgIGlmIChuIDwgMykgdGhlbiA9IERhdGUubm93KCk7XG4gICAgdmFyIHRpbWUgPSB0aGVuICsgZGVsYXksIHRpbWVyID0ge1xuICAgICAgYzogY2FsbGJhY2ssXG4gICAgICB0OiB0aW1lLFxuICAgICAgZjogZmFsc2UsXG4gICAgICBuOiBudWxsXG4gICAgfTtcbiAgICBpZiAoZDNfdGltZXJfcXVldWVUYWlsKSBkM190aW1lcl9xdWV1ZVRhaWwubiA9IHRpbWVyOyBlbHNlIGQzX3RpbWVyX3F1ZXVlSGVhZCA9IHRpbWVyO1xuICAgIGQzX3RpbWVyX3F1ZXVlVGFpbCA9IHRpbWVyO1xuICAgIGlmICghZDNfdGltZXJfaW50ZXJ2YWwpIHtcbiAgICAgIGQzX3RpbWVyX3RpbWVvdXQgPSBjbGVhclRpbWVvdXQoZDNfdGltZXJfdGltZW91dCk7XG4gICAgICBkM190aW1lcl9pbnRlcnZhbCA9IDE7XG4gICAgICBkM190aW1lcl9mcmFtZShkM190aW1lcl9zdGVwKTtcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3RpbWVyX3N0ZXAoKSB7XG4gICAgdmFyIG5vdyA9IGQzX3RpbWVyX21hcmsoKSwgZGVsYXkgPSBkM190aW1lcl9zd2VlcCgpIC0gbm93O1xuICAgIGlmIChkZWxheSA+IDI0KSB7XG4gICAgICBpZiAoaXNGaW5pdGUoZGVsYXkpKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChkM190aW1lcl90aW1lb3V0KTtcbiAgICAgICAgZDNfdGltZXJfdGltZW91dCA9IHNldFRpbWVvdXQoZDNfdGltZXJfc3RlcCwgZGVsYXkpO1xuICAgICAgfVxuICAgICAgZDNfdGltZXJfaW50ZXJ2YWwgPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICBkM190aW1lcl9pbnRlcnZhbCA9IDE7XG4gICAgICBkM190aW1lcl9mcmFtZShkM190aW1lcl9zdGVwKTtcbiAgICB9XG4gIH1cbiAgZDMudGltZXIuZmx1c2ggPSBmdW5jdGlvbigpIHtcbiAgICBkM190aW1lcl9tYXJrKCk7XG4gICAgZDNfdGltZXJfc3dlZXAoKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfdGltZXJfbWFyaygpIHtcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICBkM190aW1lcl9hY3RpdmUgPSBkM190aW1lcl9xdWV1ZUhlYWQ7XG4gICAgd2hpbGUgKGQzX3RpbWVyX2FjdGl2ZSkge1xuICAgICAgaWYgKG5vdyA+PSBkM190aW1lcl9hY3RpdmUudCkgZDNfdGltZXJfYWN0aXZlLmYgPSBkM190aW1lcl9hY3RpdmUuYyhub3cgLSBkM190aW1lcl9hY3RpdmUudCk7XG4gICAgICBkM190aW1lcl9hY3RpdmUgPSBkM190aW1lcl9hY3RpdmUubjtcbiAgICB9XG4gICAgcmV0dXJuIG5vdztcbiAgfVxuICBmdW5jdGlvbiBkM190aW1lcl9zd2VlcCgpIHtcbiAgICB2YXIgdDAsIHQxID0gZDNfdGltZXJfcXVldWVIZWFkLCB0aW1lID0gSW5maW5pdHk7XG4gICAgd2hpbGUgKHQxKSB7XG4gICAgICBpZiAodDEuZikge1xuICAgICAgICB0MSA9IHQwID8gdDAubiA9IHQxLm4gOiBkM190aW1lcl9xdWV1ZUhlYWQgPSB0MS5uO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHQxLnQgPCB0aW1lKSB0aW1lID0gdDEudDtcbiAgICAgICAgdDEgPSAodDAgPSB0MSkubjtcbiAgICAgIH1cbiAgICB9XG4gICAgZDNfdGltZXJfcXVldWVUYWlsID0gdDA7XG4gICAgcmV0dXJuIHRpbWU7XG4gIH1cbiAgZnVuY3Rpb24gZDNfZm9ybWF0X3ByZWNpc2lvbih4LCBwKSB7XG4gICAgcmV0dXJuIHAgLSAoeCA/IE1hdGguY2VpbChNYXRoLmxvZyh4KSAvIE1hdGguTE4xMCkgOiAxKTtcbiAgfVxuICBkMy5yb3VuZCA9IGZ1bmN0aW9uKHgsIG4pIHtcbiAgICByZXR1cm4gbiA/IE1hdGgucm91bmQoeCAqIChuID0gTWF0aC5wb3coMTAsIG4pKSkgLyBuIDogTWF0aC5yb3VuZCh4KTtcbiAgfTtcbiAgdmFyIGQzX2Zvcm1hdFByZWZpeGVzID0gWyBcInlcIiwgXCJ6XCIsIFwiYVwiLCBcImZcIiwgXCJwXCIsIFwiblwiLCBcIsK1XCIsIFwibVwiLCBcIlwiLCBcImtcIiwgXCJNXCIsIFwiR1wiLCBcIlRcIiwgXCJQXCIsIFwiRVwiLCBcIlpcIiwgXCJZXCIgXS5tYXAoZDNfZm9ybWF0UHJlZml4KTtcbiAgZDMuZm9ybWF0UHJlZml4ID0gZnVuY3Rpb24odmFsdWUsIHByZWNpc2lvbikge1xuICAgIHZhciBpID0gMDtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIGlmICh2YWx1ZSA8IDApIHZhbHVlICo9IC0xO1xuICAgICAgaWYgKHByZWNpc2lvbikgdmFsdWUgPSBkMy5yb3VuZCh2YWx1ZSwgZDNfZm9ybWF0X3ByZWNpc2lvbih2YWx1ZSwgcHJlY2lzaW9uKSk7XG4gICAgICBpID0gMSArIE1hdGguZmxvb3IoMWUtMTIgKyBNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMTApO1xuICAgICAgaSA9IE1hdGgubWF4KC0yNCwgTWF0aC5taW4oMjQsIE1hdGguZmxvb3IoKGkgPD0gMCA/IGkgKyAxIDogaSAtIDEpIC8gMykgKiAzKSk7XG4gICAgfVxuICAgIHJldHVybiBkM19mb3JtYXRQcmVmaXhlc1s4ICsgaSAvIDNdO1xuICB9O1xuICBmdW5jdGlvbiBkM19mb3JtYXRQcmVmaXgoZCwgaSkge1xuICAgIHZhciBrID0gTWF0aC5wb3coMTAsIGFicyg4IC0gaSkgKiAzKTtcbiAgICByZXR1cm4ge1xuICAgICAgc2NhbGU6IGkgPiA4ID8gZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gZCAvIGs7XG4gICAgICB9IDogZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gZCAqIGs7XG4gICAgICB9LFxuICAgICAgc3ltYm9sOiBkXG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBkM19sb2NhbGVfbnVtYmVyRm9ybWF0KGxvY2FsZSkge1xuICAgIHZhciBsb2NhbGVfZGVjaW1hbCA9IGxvY2FsZS5kZWNpbWFsLCBsb2NhbGVfdGhvdXNhbmRzID0gbG9jYWxlLnRob3VzYW5kcywgbG9jYWxlX2dyb3VwaW5nID0gbG9jYWxlLmdyb3VwaW5nLCBsb2NhbGVfY3VycmVuY3kgPSBsb2NhbGUuY3VycmVuY3ksIGZvcm1hdEdyb3VwID0gbG9jYWxlX2dyb3VwaW5nID8gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhciBpID0gdmFsdWUubGVuZ3RoLCB0ID0gW10sIGogPSAwLCBnID0gbG9jYWxlX2dyb3VwaW5nWzBdO1xuICAgICAgd2hpbGUgKGkgPiAwICYmIGcgPiAwKSB7XG4gICAgICAgIHQucHVzaCh2YWx1ZS5zdWJzdHJpbmcoaSAtPSBnLCBpICsgZykpO1xuICAgICAgICBnID0gbG9jYWxlX2dyb3VwaW5nW2ogPSAoaiArIDEpICUgbG9jYWxlX2dyb3VwaW5nLmxlbmd0aF07XG4gICAgICB9XG4gICAgICByZXR1cm4gdC5yZXZlcnNlKCkuam9pbihsb2NhbGVfdGhvdXNhbmRzKTtcbiAgICB9IDogZDNfaWRlbnRpdHk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIG1hdGNoID0gZDNfZm9ybWF0X3JlLmV4ZWMoc3BlY2lmaWVyKSwgZmlsbCA9IG1hdGNoWzFdIHx8IFwiIFwiLCBhbGlnbiA9IG1hdGNoWzJdIHx8IFwiPlwiLCBzaWduID0gbWF0Y2hbM10gfHwgXCJcIiwgc3ltYm9sID0gbWF0Y2hbNF0gfHwgXCJcIiwgemZpbGwgPSBtYXRjaFs1XSwgd2lkdGggPSArbWF0Y2hbNl0sIGNvbW1hID0gbWF0Y2hbN10sIHByZWNpc2lvbiA9IG1hdGNoWzhdLCB0eXBlID0gbWF0Y2hbOV0sIHNjYWxlID0gMSwgcHJlZml4ID0gXCJcIiwgc3VmZml4ID0gXCJcIiwgaW50ZWdlciA9IGZhbHNlO1xuICAgICAgaWYgKHByZWNpc2lvbikgcHJlY2lzaW9uID0gK3ByZWNpc2lvbi5zdWJzdHJpbmcoMSk7XG4gICAgICBpZiAoemZpbGwgfHwgZmlsbCA9PT0gXCIwXCIgJiYgYWxpZ24gPT09IFwiPVwiKSB7XG4gICAgICAgIHpmaWxsID0gZmlsbCA9IFwiMFwiO1xuICAgICAgICBhbGlnbiA9IFwiPVwiO1xuICAgICAgICBpZiAoY29tbWEpIHdpZHRoIC09IE1hdGguZmxvb3IoKHdpZHRoIC0gMSkgLyA0KTtcbiAgICAgIH1cbiAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgIGNhc2UgXCJuXCI6XG4gICAgICAgIGNvbW1hID0gdHJ1ZTtcbiAgICAgICAgdHlwZSA9IFwiZ1wiO1xuICAgICAgICBicmVhaztcblxuICAgICAgIGNhc2UgXCIlXCI6XG4gICAgICAgIHNjYWxlID0gMTAwO1xuICAgICAgICBzdWZmaXggPSBcIiVcIjtcbiAgICAgICAgdHlwZSA9IFwiZlwiO1xuICAgICAgICBicmVhaztcblxuICAgICAgIGNhc2UgXCJwXCI6XG4gICAgICAgIHNjYWxlID0gMTAwO1xuICAgICAgICBzdWZmaXggPSBcIiVcIjtcbiAgICAgICAgdHlwZSA9IFwiclwiO1xuICAgICAgICBicmVhaztcblxuICAgICAgIGNhc2UgXCJiXCI6XG4gICAgICAgY2FzZSBcIm9cIjpcbiAgICAgICBjYXNlIFwieFwiOlxuICAgICAgIGNhc2UgXCJYXCI6XG4gICAgICAgIGlmIChzeW1ib2wgPT09IFwiI1wiKSBwcmVmaXggPSBcIjBcIiArIHR5cGUudG9Mb3dlckNhc2UoKTtcblxuICAgICAgIGNhc2UgXCJjXCI6XG4gICAgICAgY2FzZSBcImRcIjpcbiAgICAgICAgaW50ZWdlciA9IHRydWU7XG4gICAgICAgIHByZWNpc2lvbiA9IDA7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAgY2FzZSBcInNcIjpcbiAgICAgICAgc2NhbGUgPSAtMTtcbiAgICAgICAgdHlwZSA9IFwiclwiO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChzeW1ib2wgPT09IFwiJFwiKSBwcmVmaXggPSBsb2NhbGVfY3VycmVuY3lbMF0sIHN1ZmZpeCA9IGxvY2FsZV9jdXJyZW5jeVsxXTtcbiAgICAgIGlmICh0eXBlID09IFwiclwiICYmICFwcmVjaXNpb24pIHR5cGUgPSBcImdcIjtcbiAgICAgIGlmIChwcmVjaXNpb24gIT0gbnVsbCkge1xuICAgICAgICBpZiAodHlwZSA9PSBcImdcIikgcHJlY2lzaW9uID0gTWF0aC5tYXgoMSwgTWF0aC5taW4oMjEsIHByZWNpc2lvbikpOyBlbHNlIGlmICh0eXBlID09IFwiZVwiIHx8IHR5cGUgPT0gXCJmXCIpIHByZWNpc2lvbiA9IE1hdGgubWF4KDAsIE1hdGgubWluKDIwLCBwcmVjaXNpb24pKTtcbiAgICAgIH1cbiAgICAgIHR5cGUgPSBkM19mb3JtYXRfdHlwZXMuZ2V0KHR5cGUpIHx8IGQzX2Zvcm1hdF90eXBlRGVmYXVsdDtcbiAgICAgIHZhciB6Y29tbWEgPSB6ZmlsbCAmJiBjb21tYTtcbiAgICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZiAoaW50ZWdlciAmJiB2YWx1ZSAlIDEpIHJldHVybiBcIlwiO1xuICAgICAgICB2YXIgbmVnYXRpdmUgPSB2YWx1ZSA8IDAgfHwgdmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCA/ICh2YWx1ZSA9IC12YWx1ZSwgXCItXCIpIDogc2lnbjtcbiAgICAgICAgaWYgKHNjYWxlIDwgMCkge1xuICAgICAgICAgIHZhciB1bml0ID0gZDMuZm9ybWF0UHJlZml4KHZhbHVlLCBwcmVjaXNpb24pO1xuICAgICAgICAgIHZhbHVlID0gdW5pdC5zY2FsZSh2YWx1ZSk7XG4gICAgICAgICAgc3VmZml4ID0gdW5pdC5zeW1ib2w7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgKj0gc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0eXBlKHZhbHVlLCBwcmVjaXNpb24pO1xuICAgICAgICB2YXIgaSA9IHZhbHVlLmxhc3RJbmRleE9mKFwiLlwiKSwgYmVmb3JlID0gaSA8IDAgPyB2YWx1ZSA6IHZhbHVlLnN1YnN0cmluZygwLCBpKSwgYWZ0ZXIgPSBpIDwgMCA/IFwiXCIgOiBsb2NhbGVfZGVjaW1hbCArIHZhbHVlLnN1YnN0cmluZyhpICsgMSk7XG4gICAgICAgIGlmICghemZpbGwgJiYgY29tbWEpIGJlZm9yZSA9IGZvcm1hdEdyb3VwKGJlZm9yZSk7XG4gICAgICAgIHZhciBsZW5ndGggPSBwcmVmaXgubGVuZ3RoICsgYmVmb3JlLmxlbmd0aCArIGFmdGVyLmxlbmd0aCArICh6Y29tbWEgPyAwIDogbmVnYXRpdmUubGVuZ3RoKSwgcGFkZGluZyA9IGxlbmd0aCA8IHdpZHRoID8gbmV3IEFycmF5KGxlbmd0aCA9IHdpZHRoIC0gbGVuZ3RoICsgMSkuam9pbihmaWxsKSA6IFwiXCI7XG4gICAgICAgIGlmICh6Y29tbWEpIGJlZm9yZSA9IGZvcm1hdEdyb3VwKHBhZGRpbmcgKyBiZWZvcmUpO1xuICAgICAgICBuZWdhdGl2ZSArPSBwcmVmaXg7XG4gICAgICAgIHZhbHVlID0gYmVmb3JlICsgYWZ0ZXI7XG4gICAgICAgIHJldHVybiAoYWxpZ24gPT09IFwiPFwiID8gbmVnYXRpdmUgKyB2YWx1ZSArIHBhZGRpbmcgOiBhbGlnbiA9PT0gXCI+XCIgPyBwYWRkaW5nICsgbmVnYXRpdmUgKyB2YWx1ZSA6IGFsaWduID09PSBcIl5cIiA/IHBhZGRpbmcuc3Vic3RyaW5nKDAsIGxlbmd0aCA+Pj0gMSkgKyBuZWdhdGl2ZSArIHZhbHVlICsgcGFkZGluZy5zdWJzdHJpbmcobGVuZ3RoKSA6IG5lZ2F0aXZlICsgKHpjb21tYSA/IHZhbHVlIDogcGFkZGluZyArIHZhbHVlKSkgKyBzdWZmaXg7XG4gICAgICB9O1xuICAgIH07XG4gIH1cbiAgdmFyIGQzX2Zvcm1hdF9yZSA9IC8oPzooW157XSk/KFs8Pj1eXSkpPyhbK1xcLSBdKT8oWyQjXSk/KDApPyhcXGQrKT8oLCk/KFxcLi0/XFxkKyk/KFthLXolXSk/L2k7XG4gIHZhciBkM19mb3JtYXRfdHlwZXMgPSBkMy5tYXAoe1xuICAgIGI6IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB4LnRvU3RyaW5nKDIpO1xuICAgIH0sXG4gICAgYzogZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoeCk7XG4gICAgfSxcbiAgICBvOiBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4geC50b1N0cmluZyg4KTtcbiAgICB9LFxuICAgIHg6IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB4LnRvU3RyaW5nKDE2KTtcbiAgICB9LFxuICAgIFg6IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB4LnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuICAgIH0sXG4gICAgZzogZnVuY3Rpb24oeCwgcCkge1xuICAgICAgcmV0dXJuIHgudG9QcmVjaXNpb24ocCk7XG4gICAgfSxcbiAgICBlOiBmdW5jdGlvbih4LCBwKSB7XG4gICAgICByZXR1cm4geC50b0V4cG9uZW50aWFsKHApO1xuICAgIH0sXG4gICAgZjogZnVuY3Rpb24oeCwgcCkge1xuICAgICAgcmV0dXJuIHgudG9GaXhlZChwKTtcbiAgICB9LFxuICAgIHI6IGZ1bmN0aW9uKHgsIHApIHtcbiAgICAgIHJldHVybiAoeCA9IGQzLnJvdW5kKHgsIGQzX2Zvcm1hdF9wcmVjaXNpb24oeCwgcCkpKS50b0ZpeGVkKE1hdGgubWF4KDAsIE1hdGgubWluKDIwLCBkM19mb3JtYXRfcHJlY2lzaW9uKHggKiAoMSArIDFlLTE1KSwgcCkpKSk7XG4gICAgfVxuICB9KTtcbiAgZnVuY3Rpb24gZDNfZm9ybWF0X3R5cGVEZWZhdWx0KHgpIHtcbiAgICByZXR1cm4geCArIFwiXCI7XG4gIH1cbiAgdmFyIGQzX3RpbWUgPSBkMy50aW1lID0ge30sIGQzX2RhdGUgPSBEYXRlO1xuICBmdW5jdGlvbiBkM19kYXRlX3V0YygpIHtcbiAgICB0aGlzLl8gPSBuZXcgRGF0ZShhcmd1bWVudHMubGVuZ3RoID4gMSA/IERhdGUuVVRDLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBhcmd1bWVudHNbMF0pO1xuICB9XG4gIGQzX2RhdGVfdXRjLnByb3RvdHlwZSA9IHtcbiAgICBnZXREYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl8uZ2V0VVRDRGF0ZSgpO1xuICAgIH0sXG4gICAgZ2V0RGF5OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl8uZ2V0VVRDRGF5KCk7XG4gICAgfSxcbiAgICBnZXRGdWxsWWVhcjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fLmdldFVUQ0Z1bGxZZWFyKCk7XG4gICAgfSxcbiAgICBnZXRIb3VyczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fLmdldFVUQ0hvdXJzKCk7XG4gICAgfSxcbiAgICBnZXRNaWxsaXNlY29uZHM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuXy5nZXRVVENNaWxsaXNlY29uZHMoKTtcbiAgICB9LFxuICAgIGdldE1pbnV0ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuXy5nZXRVVENNaW51dGVzKCk7XG4gICAgfSxcbiAgICBnZXRNb250aDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fLmdldFVUQ01vbnRoKCk7XG4gICAgfSxcbiAgICBnZXRTZWNvbmRzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl8uZ2V0VVRDU2Vjb25kcygpO1xuICAgIH0sXG4gICAgZ2V0VGltZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fLmdldFRpbWUoKTtcbiAgICB9LFxuICAgIGdldFRpbWV6b25lT2Zmc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH0sXG4gICAgdmFsdWVPZjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fLnZhbHVlT2YoKTtcbiAgICB9LFxuICAgIHNldERhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgZDNfdGltZV9wcm90b3R5cGUuc2V0VVRDRGF0ZS5hcHBseSh0aGlzLl8sIGFyZ3VtZW50cyk7XG4gICAgfSxcbiAgICBzZXREYXk6IGZ1bmN0aW9uKCkge1xuICAgICAgZDNfdGltZV9wcm90b3R5cGUuc2V0VVRDRGF5LmFwcGx5KHRoaXMuXywgYXJndW1lbnRzKTtcbiAgICB9LFxuICAgIHNldEZ1bGxZZWFyOiBmdW5jdGlvbigpIHtcbiAgICAgIGQzX3RpbWVfcHJvdG90eXBlLnNldFVUQ0Z1bGxZZWFyLmFwcGx5KHRoaXMuXywgYXJndW1lbnRzKTtcbiAgICB9LFxuICAgIHNldEhvdXJzOiBmdW5jdGlvbigpIHtcbiAgICAgIGQzX3RpbWVfcHJvdG90eXBlLnNldFVUQ0hvdXJzLmFwcGx5KHRoaXMuXywgYXJndW1lbnRzKTtcbiAgICB9LFxuICAgIHNldE1pbGxpc2Vjb25kczogZnVuY3Rpb24oKSB7XG4gICAgICBkM190aW1lX3Byb3RvdHlwZS5zZXRVVENNaWxsaXNlY29uZHMuYXBwbHkodGhpcy5fLCBhcmd1bWVudHMpO1xuICAgIH0sXG4gICAgc2V0TWludXRlczogZnVuY3Rpb24oKSB7XG4gICAgICBkM190aW1lX3Byb3RvdHlwZS5zZXRVVENNaW51dGVzLmFwcGx5KHRoaXMuXywgYXJndW1lbnRzKTtcbiAgICB9LFxuICAgIHNldE1vbnRoOiBmdW5jdGlvbigpIHtcbiAgICAgIGQzX3RpbWVfcHJvdG90eXBlLnNldFVUQ01vbnRoLmFwcGx5KHRoaXMuXywgYXJndW1lbnRzKTtcbiAgICB9LFxuICAgIHNldFNlY29uZHM6IGZ1bmN0aW9uKCkge1xuICAgICAgZDNfdGltZV9wcm90b3R5cGUuc2V0VVRDU2Vjb25kcy5hcHBseSh0aGlzLl8sIGFyZ3VtZW50cyk7XG4gICAgfSxcbiAgICBzZXRUaW1lOiBmdW5jdGlvbigpIHtcbiAgICAgIGQzX3RpbWVfcHJvdG90eXBlLnNldFRpbWUuYXBwbHkodGhpcy5fLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfTtcbiAgdmFyIGQzX3RpbWVfcHJvdG90eXBlID0gRGF0ZS5wcm90b3R5cGU7XG4gIGZ1bmN0aW9uIGQzX3RpbWVfaW50ZXJ2YWwobG9jYWwsIHN0ZXAsIG51bWJlcikge1xuICAgIGZ1bmN0aW9uIHJvdW5kKGRhdGUpIHtcbiAgICAgIHZhciBkMCA9IGxvY2FsKGRhdGUpLCBkMSA9IG9mZnNldChkMCwgMSk7XG4gICAgICByZXR1cm4gZGF0ZSAtIGQwIDwgZDEgLSBkYXRlID8gZDAgOiBkMTtcbiAgICB9XG4gICAgZnVuY3Rpb24gY2VpbChkYXRlKSB7XG4gICAgICBzdGVwKGRhdGUgPSBsb2NhbChuZXcgZDNfZGF0ZShkYXRlIC0gMSkpLCAxKTtcbiAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cbiAgICBmdW5jdGlvbiBvZmZzZXQoZGF0ZSwgaykge1xuICAgICAgc3RlcChkYXRlID0gbmV3IGQzX2RhdGUoK2RhdGUpLCBrKTtcbiAgICAgIHJldHVybiBkYXRlO1xuICAgIH1cbiAgICBmdW5jdGlvbiByYW5nZSh0MCwgdDEsIGR0KSB7XG4gICAgICB2YXIgdGltZSA9IGNlaWwodDApLCB0aW1lcyA9IFtdO1xuICAgICAgaWYgKGR0ID4gMSkge1xuICAgICAgICB3aGlsZSAodGltZSA8IHQxKSB7XG4gICAgICAgICAgaWYgKCEobnVtYmVyKHRpbWUpICUgZHQpKSB0aW1lcy5wdXNoKG5ldyBEYXRlKCt0aW1lKSk7XG4gICAgICAgICAgc3RlcCh0aW1lLCAxKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2hpbGUgKHRpbWUgPCB0MSkgdGltZXMucHVzaChuZXcgRGF0ZSgrdGltZSkpLCBzdGVwKHRpbWUsIDEpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRpbWVzO1xuICAgIH1cbiAgICBmdW5jdGlvbiByYW5nZV91dGModDAsIHQxLCBkdCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZDNfZGF0ZSA9IGQzX2RhdGVfdXRjO1xuICAgICAgICB2YXIgdXRjID0gbmV3IGQzX2RhdGVfdXRjKCk7XG4gICAgICAgIHV0Yy5fID0gdDA7XG4gICAgICAgIHJldHVybiByYW5nZSh1dGMsIHQxLCBkdCk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBkM19kYXRlID0gRGF0ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgbG9jYWwuZmxvb3IgPSBsb2NhbDtcbiAgICBsb2NhbC5yb3VuZCA9IHJvdW5kO1xuICAgIGxvY2FsLmNlaWwgPSBjZWlsO1xuICAgIGxvY2FsLm9mZnNldCA9IG9mZnNldDtcbiAgICBsb2NhbC5yYW5nZSA9IHJhbmdlO1xuICAgIHZhciB1dGMgPSBsb2NhbC51dGMgPSBkM190aW1lX2ludGVydmFsX3V0Yyhsb2NhbCk7XG4gICAgdXRjLmZsb29yID0gdXRjO1xuICAgIHV0Yy5yb3VuZCA9IGQzX3RpbWVfaW50ZXJ2YWxfdXRjKHJvdW5kKTtcbiAgICB1dGMuY2VpbCA9IGQzX3RpbWVfaW50ZXJ2YWxfdXRjKGNlaWwpO1xuICAgIHV0Yy5vZmZzZXQgPSBkM190aW1lX2ludGVydmFsX3V0YyhvZmZzZXQpO1xuICAgIHV0Yy5yYW5nZSA9IHJhbmdlX3V0YztcbiAgICByZXR1cm4gbG9jYWw7XG4gIH1cbiAgZnVuY3Rpb24gZDNfdGltZV9pbnRlcnZhbF91dGMobWV0aG9kKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGUsIGspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGQzX2RhdGUgPSBkM19kYXRlX3V0YztcbiAgICAgICAgdmFyIHV0YyA9IG5ldyBkM19kYXRlX3V0YygpO1xuICAgICAgICB1dGMuXyA9IGRhdGU7XG4gICAgICAgIHJldHVybiBtZXRob2QodXRjLCBrKS5fO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZDNfZGF0ZSA9IERhdGU7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuICBkM190aW1lLnllYXIgPSBkM190aW1lX2ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBkYXRlID0gZDNfdGltZS5kYXkoZGF0ZSk7XG4gICAgZGF0ZS5zZXRNb250aCgwLCAxKTtcbiAgICByZXR1cm4gZGF0ZTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgb2Zmc2V0KSB7XG4gICAgZGF0ZS5zZXRGdWxsWWVhcihkYXRlLmdldEZ1bGxZZWFyKCkgKyBvZmZzZXQpO1xuICB9LCBmdW5jdGlvbihkYXRlKSB7XG4gICAgcmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKTtcbiAgfSk7XG4gIGQzX3RpbWUueWVhcnMgPSBkM190aW1lLnllYXIucmFuZ2U7XG4gIGQzX3RpbWUueWVhcnMudXRjID0gZDNfdGltZS55ZWFyLnV0Yy5yYW5nZTtcbiAgZDNfdGltZS5kYXkgPSBkM190aW1lX2ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICB2YXIgZGF5ID0gbmV3IGQzX2RhdGUoMmUzLCAwKTtcbiAgICBkYXkuc2V0RnVsbFllYXIoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpKTtcbiAgICByZXR1cm4gZGF5O1xuICB9LCBmdW5jdGlvbihkYXRlLCBvZmZzZXQpIHtcbiAgICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgKyBvZmZzZXQpO1xuICB9LCBmdW5jdGlvbihkYXRlKSB7XG4gICAgcmV0dXJuIGRhdGUuZ2V0RGF0ZSgpIC0gMTtcbiAgfSk7XG4gIGQzX3RpbWUuZGF5cyA9IGQzX3RpbWUuZGF5LnJhbmdlO1xuICBkM190aW1lLmRheXMudXRjID0gZDNfdGltZS5kYXkudXRjLnJhbmdlO1xuICBkM190aW1lLmRheU9mWWVhciA9IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICB2YXIgeWVhciA9IGQzX3RpbWUueWVhcihkYXRlKTtcbiAgICByZXR1cm4gTWF0aC5mbG9vcigoZGF0ZSAtIHllYXIgLSAoZGF0ZS5nZXRUaW1lem9uZU9mZnNldCgpIC0geWVhci5nZXRUaW1lem9uZU9mZnNldCgpKSAqIDZlNCkgLyA4NjRlNSk7XG4gIH07XG4gIFsgXCJzdW5kYXlcIiwgXCJtb25kYXlcIiwgXCJ0dWVzZGF5XCIsIFwid2VkbmVzZGF5XCIsIFwidGh1cnNkYXlcIiwgXCJmcmlkYXlcIiwgXCJzYXR1cmRheVwiIF0uZm9yRWFjaChmdW5jdGlvbihkYXksIGkpIHtcbiAgICBpID0gNyAtIGk7XG4gICAgdmFyIGludGVydmFsID0gZDNfdGltZVtkYXldID0gZDNfdGltZV9pbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgICAoZGF0ZSA9IGQzX3RpbWUuZGF5KGRhdGUpKS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gKGRhdGUuZ2V0RGF5KCkgKyBpKSAlIDcpO1xuICAgICAgcmV0dXJuIGRhdGU7XG4gICAgfSwgZnVuY3Rpb24oZGF0ZSwgb2Zmc2V0KSB7XG4gICAgICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgKyBNYXRoLmZsb29yKG9mZnNldCkgKiA3KTtcbiAgICB9LCBmdW5jdGlvbihkYXRlKSB7XG4gICAgICB2YXIgZGF5ID0gZDNfdGltZS55ZWFyKGRhdGUpLmdldERheSgpO1xuICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKGQzX3RpbWUuZGF5T2ZZZWFyKGRhdGUpICsgKGRheSArIGkpICUgNykgLyA3KSAtIChkYXkgIT09IGkpO1xuICAgIH0pO1xuICAgIGQzX3RpbWVbZGF5ICsgXCJzXCJdID0gaW50ZXJ2YWwucmFuZ2U7XG4gICAgZDNfdGltZVtkYXkgKyBcInNcIl0udXRjID0gaW50ZXJ2YWwudXRjLnJhbmdlO1xuICAgIGQzX3RpbWVbZGF5ICsgXCJPZlllYXJcIl0gPSBmdW5jdGlvbihkYXRlKSB7XG4gICAgICB2YXIgZGF5ID0gZDNfdGltZS55ZWFyKGRhdGUpLmdldERheSgpO1xuICAgICAgcmV0dXJuIE1hdGguZmxvb3IoKGQzX3RpbWUuZGF5T2ZZZWFyKGRhdGUpICsgKGRheSArIGkpICUgNykgLyA3KTtcbiAgICB9O1xuICB9KTtcbiAgZDNfdGltZS53ZWVrID0gZDNfdGltZS5zdW5kYXk7XG4gIGQzX3RpbWUud2Vla3MgPSBkM190aW1lLnN1bmRheS5yYW5nZTtcbiAgZDNfdGltZS53ZWVrcy51dGMgPSBkM190aW1lLnN1bmRheS51dGMucmFuZ2U7XG4gIGQzX3RpbWUud2Vla09mWWVhciA9IGQzX3RpbWUuc3VuZGF5T2ZZZWFyO1xuICBmdW5jdGlvbiBkM19sb2NhbGVfdGltZUZvcm1hdChsb2NhbGUpIHtcbiAgICB2YXIgbG9jYWxlX2RhdGVUaW1lID0gbG9jYWxlLmRhdGVUaW1lLCBsb2NhbGVfZGF0ZSA9IGxvY2FsZS5kYXRlLCBsb2NhbGVfdGltZSA9IGxvY2FsZS50aW1lLCBsb2NhbGVfcGVyaW9kcyA9IGxvY2FsZS5wZXJpb2RzLCBsb2NhbGVfZGF5cyA9IGxvY2FsZS5kYXlzLCBsb2NhbGVfc2hvcnREYXlzID0gbG9jYWxlLnNob3J0RGF5cywgbG9jYWxlX21vbnRocyA9IGxvY2FsZS5tb250aHMsIGxvY2FsZV9zaG9ydE1vbnRocyA9IGxvY2FsZS5zaG9ydE1vbnRocztcbiAgICBmdW5jdGlvbiBkM190aW1lX2Zvcm1hdCh0ZW1wbGF0ZSkge1xuICAgICAgdmFyIG4gPSB0ZW1wbGF0ZS5sZW5ndGg7XG4gICAgICBmdW5jdGlvbiBmb3JtYXQoZGF0ZSkge1xuICAgICAgICB2YXIgc3RyaW5nID0gW10sIGkgPSAtMSwgaiA9IDAsIGMsIHAsIGY7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgICAgaWYgKHRlbXBsYXRlLmNoYXJDb2RlQXQoaSkgPT09IDM3KSB7XG4gICAgICAgICAgICBzdHJpbmcucHVzaCh0ZW1wbGF0ZS5zdWJzdHJpbmcoaiwgaSkpO1xuICAgICAgICAgICAgaWYgKChwID0gZDNfdGltZV9mb3JtYXRQYWRzW2MgPSB0ZW1wbGF0ZS5jaGFyQXQoKytpKV0pICE9IG51bGwpIGMgPSB0ZW1wbGF0ZS5jaGFyQXQoKytpKTtcbiAgICAgICAgICAgIGlmIChmID0gZDNfdGltZV9mb3JtYXRzW2NdKSBjID0gZihkYXRlLCBwID09IG51bGwgPyBjID09PSBcImVcIiA/IFwiIFwiIDogXCIwXCIgOiBwKTtcbiAgICAgICAgICAgIHN0cmluZy5wdXNoKGMpO1xuICAgICAgICAgICAgaiA9IGkgKyAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdHJpbmcucHVzaCh0ZW1wbGF0ZS5zdWJzdHJpbmcoaiwgaSkpO1xuICAgICAgICByZXR1cm4gc3RyaW5nLmpvaW4oXCJcIik7XG4gICAgICB9XG4gICAgICBmb3JtYXQucGFyc2UgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgICAgdmFyIGQgPSB7XG4gICAgICAgICAgeTogMTkwMCxcbiAgICAgICAgICBtOiAwLFxuICAgICAgICAgIGQ6IDEsXG4gICAgICAgICAgSDogMCxcbiAgICAgICAgICBNOiAwLFxuICAgICAgICAgIFM6IDAsXG4gICAgICAgICAgTDogMCxcbiAgICAgICAgICBaOiBudWxsXG4gICAgICAgIH0sIGkgPSBkM190aW1lX3BhcnNlKGQsIHRlbXBsYXRlLCBzdHJpbmcsIDApO1xuICAgICAgICBpZiAoaSAhPSBzdHJpbmcubGVuZ3RoKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKFwicFwiIGluIGQpIGQuSCA9IGQuSCAlIDEyICsgZC5wICogMTI7XG4gICAgICAgIHZhciBsb2NhbFogPSBkLlogIT0gbnVsbCAmJiBkM19kYXRlICE9PSBkM19kYXRlX3V0YywgZGF0ZSA9IG5ldyAobG9jYWxaID8gZDNfZGF0ZV91dGMgOiBkM19kYXRlKSgpO1xuICAgICAgICBpZiAoXCJqXCIgaW4gZCkgZGF0ZS5zZXRGdWxsWWVhcihkLnksIDAsIGQuaik7IGVsc2UgaWYgKFwid1wiIGluIGQgJiYgKFwiV1wiIGluIGQgfHwgXCJVXCIgaW4gZCkpIHtcbiAgICAgICAgICBkYXRlLnNldEZ1bGxZZWFyKGQueSwgMCwgMSk7XG4gICAgICAgICAgZGF0ZS5zZXRGdWxsWWVhcihkLnksIDAsIFwiV1wiIGluIGQgPyAoZC53ICsgNikgJSA3ICsgZC5XICogNyAtIChkYXRlLmdldERheSgpICsgNSkgJSA3IDogZC53ICsgZC5VICogNyAtIChkYXRlLmdldERheSgpICsgNikgJSA3KTtcbiAgICAgICAgfSBlbHNlIGRhdGUuc2V0RnVsbFllYXIoZC55LCBkLm0sIGQuZCk7XG4gICAgICAgIGRhdGUuc2V0SG91cnMoZC5IICsgTWF0aC5mbG9vcihkLlogLyAxMDApLCBkLk0gKyBkLlogJSAxMDAsIGQuUywgZC5MKTtcbiAgICAgICAgcmV0dXJuIGxvY2FsWiA/IGRhdGUuXyA6IGRhdGU7XG4gICAgICB9O1xuICAgICAgZm9ybWF0LnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICAgIH07XG4gICAgICByZXR1cm4gZm9ybWF0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBkM190aW1lX3BhcnNlKGRhdGUsIHRlbXBsYXRlLCBzdHJpbmcsIGopIHtcbiAgICAgIHZhciBjLCBwLCB0LCBpID0gMCwgbiA9IHRlbXBsYXRlLmxlbmd0aCwgbSA9IHN0cmluZy5sZW5ndGg7XG4gICAgICB3aGlsZSAoaSA8IG4pIHtcbiAgICAgICAgaWYgKGogPj0gbSkgcmV0dXJuIC0xO1xuICAgICAgICBjID0gdGVtcGxhdGUuY2hhckNvZGVBdChpKyspO1xuICAgICAgICBpZiAoYyA9PT0gMzcpIHtcbiAgICAgICAgICB0ID0gdGVtcGxhdGUuY2hhckF0KGkrKyk7XG4gICAgICAgICAgcCA9IGQzX3RpbWVfcGFyc2Vyc1t0IGluIGQzX3RpbWVfZm9ybWF0UGFkcyA/IHRlbXBsYXRlLmNoYXJBdChpKyspIDogdF07XG4gICAgICAgICAgaWYgKCFwIHx8IChqID0gcChkYXRlLCBzdHJpbmcsIGopKSA8IDApIHJldHVybiAtMTtcbiAgICAgICAgfSBlbHNlIGlmIChjICE9IHN0cmluZy5jaGFyQ29kZUF0KGorKykpIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBqO1xuICAgIH1cbiAgICBkM190aW1lX2Zvcm1hdC51dGMgPSBmdW5jdGlvbih0ZW1wbGF0ZSkge1xuICAgICAgdmFyIGxvY2FsID0gZDNfdGltZV9mb3JtYXQodGVtcGxhdGUpO1xuICAgICAgZnVuY3Rpb24gZm9ybWF0KGRhdGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBkM19kYXRlID0gZDNfZGF0ZV91dGM7XG4gICAgICAgICAgdmFyIHV0YyA9IG5ldyBkM19kYXRlKCk7XG4gICAgICAgICAgdXRjLl8gPSBkYXRlO1xuICAgICAgICAgIHJldHVybiBsb2NhbCh1dGMpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIGQzX2RhdGUgPSBEYXRlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3JtYXQucGFyc2UgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBkM19kYXRlID0gZDNfZGF0ZV91dGM7XG4gICAgICAgICAgdmFyIGRhdGUgPSBsb2NhbC5wYXJzZShzdHJpbmcpO1xuICAgICAgICAgIHJldHVybiBkYXRlICYmIGRhdGUuXztcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICBkM19kYXRlID0gRGF0ZTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGZvcm1hdC50b1N0cmluZyA9IGxvY2FsLnRvU3RyaW5nO1xuICAgICAgcmV0dXJuIGZvcm1hdDtcbiAgICB9O1xuICAgIGQzX3RpbWVfZm9ybWF0Lm11bHRpID0gZDNfdGltZV9mb3JtYXQudXRjLm11bHRpID0gZDNfdGltZV9mb3JtYXRNdWx0aTtcbiAgICB2YXIgZDNfdGltZV9wZXJpb2RMb29rdXAgPSBkMy5tYXAoKSwgZDNfdGltZV9kYXlSZSA9IGQzX3RpbWVfZm9ybWF0UmUobG9jYWxlX2RheXMpLCBkM190aW1lX2RheUxvb2t1cCA9IGQzX3RpbWVfZm9ybWF0TG9va3VwKGxvY2FsZV9kYXlzKSwgZDNfdGltZV9kYXlBYmJyZXZSZSA9IGQzX3RpbWVfZm9ybWF0UmUobG9jYWxlX3Nob3J0RGF5cyksIGQzX3RpbWVfZGF5QWJicmV2TG9va3VwID0gZDNfdGltZV9mb3JtYXRMb29rdXAobG9jYWxlX3Nob3J0RGF5cyksIGQzX3RpbWVfbW9udGhSZSA9IGQzX3RpbWVfZm9ybWF0UmUobG9jYWxlX21vbnRocyksIGQzX3RpbWVfbW9udGhMb29rdXAgPSBkM190aW1lX2Zvcm1hdExvb2t1cChsb2NhbGVfbW9udGhzKSwgZDNfdGltZV9tb250aEFiYnJldlJlID0gZDNfdGltZV9mb3JtYXRSZShsb2NhbGVfc2hvcnRNb250aHMpLCBkM190aW1lX21vbnRoQWJicmV2TG9va3VwID0gZDNfdGltZV9mb3JtYXRMb29rdXAobG9jYWxlX3Nob3J0TW9udGhzKTtcbiAgICBsb2NhbGVfcGVyaW9kcy5mb3JFYWNoKGZ1bmN0aW9uKHAsIGkpIHtcbiAgICAgIGQzX3RpbWVfcGVyaW9kTG9va3VwLnNldChwLnRvTG93ZXJDYXNlKCksIGkpO1xuICAgIH0pO1xuICAgIHZhciBkM190aW1lX2Zvcm1hdHMgPSB7XG4gICAgICBhOiBmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBsb2NhbGVfc2hvcnREYXlzW2QuZ2V0RGF5KCldO1xuICAgICAgfSxcbiAgICAgIEE6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIGxvY2FsZV9kYXlzW2QuZ2V0RGF5KCldO1xuICAgICAgfSxcbiAgICAgIGI6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIGxvY2FsZV9zaG9ydE1vbnRoc1tkLmdldE1vbnRoKCldO1xuICAgICAgfSxcbiAgICAgIEI6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIGxvY2FsZV9tb250aHNbZC5nZXRNb250aCgpXTtcbiAgICAgIH0sXG4gICAgICBjOiBkM190aW1lX2Zvcm1hdChsb2NhbGVfZGF0ZVRpbWUpLFxuICAgICAgZDogZnVuY3Rpb24oZCwgcCkge1xuICAgICAgICByZXR1cm4gZDNfdGltZV9mb3JtYXRQYWQoZC5nZXREYXRlKCksIHAsIDIpO1xuICAgICAgfSxcbiAgICAgIGU6IGZ1bmN0aW9uKGQsIHApIHtcbiAgICAgICAgcmV0dXJuIGQzX3RpbWVfZm9ybWF0UGFkKGQuZ2V0RGF0ZSgpLCBwLCAyKTtcbiAgICAgIH0sXG4gICAgICBIOiBmdW5jdGlvbihkLCBwKSB7XG4gICAgICAgIHJldHVybiBkM190aW1lX2Zvcm1hdFBhZChkLmdldEhvdXJzKCksIHAsIDIpO1xuICAgICAgfSxcbiAgICAgIEk6IGZ1bmN0aW9uKGQsIHApIHtcbiAgICAgICAgcmV0dXJuIGQzX3RpbWVfZm9ybWF0UGFkKGQuZ2V0SG91cnMoKSAlIDEyIHx8IDEyLCBwLCAyKTtcbiAgICAgIH0sXG4gICAgICBqOiBmdW5jdGlvbihkLCBwKSB7XG4gICAgICAgIHJldHVybiBkM190aW1lX2Zvcm1hdFBhZCgxICsgZDNfdGltZS5kYXlPZlllYXIoZCksIHAsIDMpO1xuICAgICAgfSxcbiAgICAgIEw6IGZ1bmN0aW9uKGQsIHApIHtcbiAgICAgICAgcmV0dXJuIGQzX3RpbWVfZm9ybWF0UGFkKGQuZ2V0TWlsbGlzZWNvbmRzKCksIHAsIDMpO1xuICAgICAgfSxcbiAgICAgIG06IGZ1bmN0aW9uKGQsIHApIHtcbiAgICAgICAgcmV0dXJuIGQzX3RpbWVfZm9ybWF0UGFkKGQuZ2V0TW9udGgoKSArIDEsIHAsIDIpO1xuICAgICAgfSxcbiAgICAgIE06IGZ1bmN0aW9uKGQsIHApIHtcbiAgICAgICAgcmV0dXJuIGQzX3RpbWVfZm9ybWF0UGFkKGQuZ2V0TWludXRlcygpLCBwLCAyKTtcbiAgICAgIH0sXG4gICAgICBwOiBmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBsb2NhbGVfcGVyaW9kc1srKGQuZ2V0SG91cnMoKSA+PSAxMildO1xuICAgICAgfSxcbiAgICAgIFM6IGZ1bmN0aW9uKGQsIHApIHtcbiAgICAgICAgcmV0dXJuIGQzX3RpbWVfZm9ybWF0UGFkKGQuZ2V0U2Vjb25kcygpLCBwLCAyKTtcbiAgICAgIH0sXG4gICAgICBVOiBmdW5jdGlvbihkLCBwKSB7XG4gICAgICAgIHJldHVybiBkM190aW1lX2Zvcm1hdFBhZChkM190aW1lLnN1bmRheU9mWWVhcihkKSwgcCwgMik7XG4gICAgICB9LFxuICAgICAgdzogZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gZC5nZXREYXkoKTtcbiAgICAgIH0sXG4gICAgICBXOiBmdW5jdGlvbihkLCBwKSB7XG4gICAgICAgIHJldHVybiBkM190aW1lX2Zvcm1hdFBhZChkM190aW1lLm1vbmRheU9mWWVhcihkKSwgcCwgMik7XG4gICAgICB9LFxuICAgICAgeDogZDNfdGltZV9mb3JtYXQobG9jYWxlX2RhdGUpLFxuICAgICAgWDogZDNfdGltZV9mb3JtYXQobG9jYWxlX3RpbWUpLFxuICAgICAgeTogZnVuY3Rpb24oZCwgcCkge1xuICAgICAgICByZXR1cm4gZDNfdGltZV9mb3JtYXRQYWQoZC5nZXRGdWxsWWVhcigpICUgMTAwLCBwLCAyKTtcbiAgICAgIH0sXG4gICAgICBZOiBmdW5jdGlvbihkLCBwKSB7XG4gICAgICAgIHJldHVybiBkM190aW1lX2Zvcm1hdFBhZChkLmdldEZ1bGxZZWFyKCkgJSAxZTQsIHAsIDQpO1xuICAgICAgfSxcbiAgICAgIFo6IGQzX3RpbWVfem9uZSxcbiAgICAgIFwiJVwiOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFwiJVwiO1xuICAgICAgfVxuICAgIH07XG4gICAgdmFyIGQzX3RpbWVfcGFyc2VycyA9IHtcbiAgICAgIGE6IGQzX3RpbWVfcGFyc2VXZWVrZGF5QWJicmV2LFxuICAgICAgQTogZDNfdGltZV9wYXJzZVdlZWtkYXksXG4gICAgICBiOiBkM190aW1lX3BhcnNlTW9udGhBYmJyZXYsXG4gICAgICBCOiBkM190aW1lX3BhcnNlTW9udGgsXG4gICAgICBjOiBkM190aW1lX3BhcnNlTG9jYWxlRnVsbCxcbiAgICAgIGQ6IGQzX3RpbWVfcGFyc2VEYXksXG4gICAgICBlOiBkM190aW1lX3BhcnNlRGF5LFxuICAgICAgSDogZDNfdGltZV9wYXJzZUhvdXIyNCxcbiAgICAgIEk6IGQzX3RpbWVfcGFyc2VIb3VyMjQsXG4gICAgICBqOiBkM190aW1lX3BhcnNlRGF5T2ZZZWFyLFxuICAgICAgTDogZDNfdGltZV9wYXJzZU1pbGxpc2Vjb25kcyxcbiAgICAgIG06IGQzX3RpbWVfcGFyc2VNb250aE51bWJlcixcbiAgICAgIE06IGQzX3RpbWVfcGFyc2VNaW51dGVzLFxuICAgICAgcDogZDNfdGltZV9wYXJzZUFtUG0sXG4gICAgICBTOiBkM190aW1lX3BhcnNlU2Vjb25kcyxcbiAgICAgIFU6IGQzX3RpbWVfcGFyc2VXZWVrTnVtYmVyU3VuZGF5LFxuICAgICAgdzogZDNfdGltZV9wYXJzZVdlZWtkYXlOdW1iZXIsXG4gICAgICBXOiBkM190aW1lX3BhcnNlV2Vla051bWJlck1vbmRheSxcbiAgICAgIHg6IGQzX3RpbWVfcGFyc2VMb2NhbGVEYXRlLFxuICAgICAgWDogZDNfdGltZV9wYXJzZUxvY2FsZVRpbWUsXG4gICAgICB5OiBkM190aW1lX3BhcnNlWWVhcixcbiAgICAgIFk6IGQzX3RpbWVfcGFyc2VGdWxsWWVhcixcbiAgICAgIFo6IGQzX3RpbWVfcGFyc2Vab25lLFxuICAgICAgXCIlXCI6IGQzX3RpbWVfcGFyc2VMaXRlcmFsUGVyY2VudFxuICAgIH07XG4gICAgZnVuY3Rpb24gZDNfdGltZV9wYXJzZVdlZWtkYXlBYmJyZXYoZGF0ZSwgc3RyaW5nLCBpKSB7XG4gICAgICBkM190aW1lX2RheUFiYnJldlJlLmxhc3RJbmRleCA9IDA7XG4gICAgICB2YXIgbiA9IGQzX3RpbWVfZGF5QWJicmV2UmUuZXhlYyhzdHJpbmcuc3Vic3RyaW5nKGkpKTtcbiAgICAgIHJldHVybiBuID8gKGRhdGUudyA9IGQzX3RpbWVfZGF5QWJicmV2TG9va3VwLmdldChuWzBdLnRvTG93ZXJDYXNlKCkpLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGQzX3RpbWVfcGFyc2VXZWVrZGF5KGRhdGUsIHN0cmluZywgaSkge1xuICAgICAgZDNfdGltZV9kYXlSZS5sYXN0SW5kZXggPSAwO1xuICAgICAgdmFyIG4gPSBkM190aW1lX2RheVJlLmV4ZWMoc3RyaW5nLnN1YnN0cmluZyhpKSk7XG4gICAgICByZXR1cm4gbiA/IChkYXRlLncgPSBkM190aW1lX2RheUxvb2t1cC5nZXQoblswXS50b0xvd2VyQ2FzZSgpKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICAgIH1cbiAgICBmdW5jdGlvbiBkM190aW1lX3BhcnNlTW9udGhBYmJyZXYoZGF0ZSwgc3RyaW5nLCBpKSB7XG4gICAgICBkM190aW1lX21vbnRoQWJicmV2UmUubGFzdEluZGV4ID0gMDtcbiAgICAgIHZhciBuID0gZDNfdGltZV9tb250aEFiYnJldlJlLmV4ZWMoc3RyaW5nLnN1YnN0cmluZyhpKSk7XG4gICAgICByZXR1cm4gbiA/IChkYXRlLm0gPSBkM190aW1lX21vbnRoQWJicmV2TG9va3VwLmdldChuWzBdLnRvTG93ZXJDYXNlKCkpLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGQzX3RpbWVfcGFyc2VNb250aChkYXRlLCBzdHJpbmcsIGkpIHtcbiAgICAgIGQzX3RpbWVfbW9udGhSZS5sYXN0SW5kZXggPSAwO1xuICAgICAgdmFyIG4gPSBkM190aW1lX21vbnRoUmUuZXhlYyhzdHJpbmcuc3Vic3RyaW5nKGkpKTtcbiAgICAgIHJldHVybiBuID8gKGRhdGUubSA9IGQzX3RpbWVfbW9udGhMb29rdXAuZ2V0KG5bMF0udG9Mb3dlckNhc2UoKSksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZDNfdGltZV9wYXJzZUxvY2FsZUZ1bGwoZGF0ZSwgc3RyaW5nLCBpKSB7XG4gICAgICByZXR1cm4gZDNfdGltZV9wYXJzZShkYXRlLCBkM190aW1lX2Zvcm1hdHMuYy50b1N0cmluZygpLCBzdHJpbmcsIGkpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBkM190aW1lX3BhcnNlTG9jYWxlRGF0ZShkYXRlLCBzdHJpbmcsIGkpIHtcbiAgICAgIHJldHVybiBkM190aW1lX3BhcnNlKGRhdGUsIGQzX3RpbWVfZm9ybWF0cy54LnRvU3RyaW5nKCksIHN0cmluZywgaSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGQzX3RpbWVfcGFyc2VMb2NhbGVUaW1lKGRhdGUsIHN0cmluZywgaSkge1xuICAgICAgcmV0dXJuIGQzX3RpbWVfcGFyc2UoZGF0ZSwgZDNfdGltZV9mb3JtYXRzLlgudG9TdHJpbmcoKSwgc3RyaW5nLCBpKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZDNfdGltZV9wYXJzZUFtUG0oZGF0ZSwgc3RyaW5nLCBpKSB7XG4gICAgICB2YXIgbiA9IGQzX3RpbWVfcGVyaW9kTG9va3VwLmdldChzdHJpbmcuc3Vic3RyaW5nKGksIGkgKz0gMikudG9Mb3dlckNhc2UoKSk7XG4gICAgICByZXR1cm4gbiA9PSBudWxsID8gLTEgOiAoZGF0ZS5wID0gbiwgaSk7XG4gICAgfVxuICAgIHJldHVybiBkM190aW1lX2Zvcm1hdDtcbiAgfVxuICB2YXIgZDNfdGltZV9mb3JtYXRQYWRzID0ge1xuICAgIFwiLVwiOiBcIlwiLFxuICAgIF86IFwiIFwiLFxuICAgIFwiMFwiOiBcIjBcIlxuICB9LCBkM190aW1lX251bWJlclJlID0gL15cXHMqXFxkKy8sIGQzX3RpbWVfcGVyY2VudFJlID0gL14lLztcbiAgZnVuY3Rpb24gZDNfdGltZV9mb3JtYXRQYWQodmFsdWUsIGZpbGwsIHdpZHRoKSB7XG4gICAgdmFyIHNpZ24gPSB2YWx1ZSA8IDAgPyBcIi1cIiA6IFwiXCIsIHN0cmluZyA9IChzaWduID8gLXZhbHVlIDogdmFsdWUpICsgXCJcIiwgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcbiAgICByZXR1cm4gc2lnbiArIChsZW5ndGggPCB3aWR0aCA/IG5ldyBBcnJheSh3aWR0aCAtIGxlbmd0aCArIDEpLmpvaW4oZmlsbCkgKyBzdHJpbmcgOiBzdHJpbmcpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3RpbWVfZm9ybWF0UmUobmFtZXMpIHtcbiAgICByZXR1cm4gbmV3IFJlZ0V4cChcIl4oPzpcIiArIG5hbWVzLm1hcChkMy5yZXF1b3RlKS5qb2luKFwifFwiKSArIFwiKVwiLCBcImlcIik7XG4gIH1cbiAgZnVuY3Rpb24gZDNfdGltZV9mb3JtYXRMb29rdXAobmFtZXMpIHtcbiAgICB2YXIgbWFwID0gbmV3IGQzX01hcCgpLCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IG4pIG1hcC5zZXQobmFtZXNbaV0udG9Mb3dlckNhc2UoKSwgaSk7XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuICBmdW5jdGlvbiBkM190aW1lX3BhcnNlV2Vla2RheU51bWJlcihkYXRlLCBzdHJpbmcsIGkpIHtcbiAgICBkM190aW1lX251bWJlclJlLmxhc3RJbmRleCA9IDA7XG4gICAgdmFyIG4gPSBkM190aW1lX251bWJlclJlLmV4ZWMoc3RyaW5nLnN1YnN0cmluZyhpLCBpICsgMSkpO1xuICAgIHJldHVybiBuID8gKGRhdGUudyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cbiAgZnVuY3Rpb24gZDNfdGltZV9wYXJzZVdlZWtOdW1iZXJTdW5kYXkoZGF0ZSwgc3RyaW5nLCBpKSB7XG4gICAgZDNfdGltZV9udW1iZXJSZS5sYXN0SW5kZXggPSAwO1xuICAgIHZhciBuID0gZDNfdGltZV9udW1iZXJSZS5leGVjKHN0cmluZy5zdWJzdHJpbmcoaSkpO1xuICAgIHJldHVybiBuID8gKGRhdGUuVSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cbiAgZnVuY3Rpb24gZDNfdGltZV9wYXJzZVdlZWtOdW1iZXJNb25kYXkoZGF0ZSwgc3RyaW5nLCBpKSB7XG4gICAgZDNfdGltZV9udW1iZXJSZS5sYXN0SW5kZXggPSAwO1xuICAgIHZhciBuID0gZDNfdGltZV9udW1iZXJSZS5leGVjKHN0cmluZy5zdWJzdHJpbmcoaSkpO1xuICAgIHJldHVybiBuID8gKGRhdGUuVyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cbiAgZnVuY3Rpb24gZDNfdGltZV9wYXJzZUZ1bGxZZWFyKGRhdGUsIHN0cmluZywgaSkge1xuICAgIGQzX3RpbWVfbnVtYmVyUmUubGFzdEluZGV4ID0gMDtcbiAgICB2YXIgbiA9IGQzX3RpbWVfbnVtYmVyUmUuZXhlYyhzdHJpbmcuc3Vic3RyaW5nKGksIGkgKyA0KSk7XG4gICAgcmV0dXJuIG4gPyAoZGF0ZS55ID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuICBmdW5jdGlvbiBkM190aW1lX3BhcnNlWWVhcihkYXRlLCBzdHJpbmcsIGkpIHtcbiAgICBkM190aW1lX251bWJlclJlLmxhc3RJbmRleCA9IDA7XG4gICAgdmFyIG4gPSBkM190aW1lX251bWJlclJlLmV4ZWMoc3RyaW5nLnN1YnN0cmluZyhpLCBpICsgMikpO1xuICAgIHJldHVybiBuID8gKGRhdGUueSA9IGQzX3RpbWVfZXhwYW5kWWVhcigrblswXSksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuICBmdW5jdGlvbiBkM190aW1lX3BhcnNlWm9uZShkYXRlLCBzdHJpbmcsIGkpIHtcbiAgICByZXR1cm4gL15bKy1dXFxkezR9JC8udGVzdChzdHJpbmcgPSBzdHJpbmcuc3Vic3RyaW5nKGksIGkgKyA1KSkgPyAoZGF0ZS5aID0gK3N0cmluZywgXG4gICAgaSArIDUpIDogLTE7XG4gIH1cbiAgZnVuY3Rpb24gZDNfdGltZV9leHBhbmRZZWFyKGQpIHtcbiAgICByZXR1cm4gZCArIChkID4gNjggPyAxOTAwIDogMmUzKTtcbiAgfVxuICBmdW5jdGlvbiBkM190aW1lX3BhcnNlTW9udGhOdW1iZXIoZGF0ZSwgc3RyaW5nLCBpKSB7XG4gICAgZDNfdGltZV9udW1iZXJSZS5sYXN0SW5kZXggPSAwO1xuICAgIHZhciBuID0gZDNfdGltZV9udW1iZXJSZS5leGVjKHN0cmluZy5zdWJzdHJpbmcoaSwgaSArIDIpKTtcbiAgICByZXR1cm4gbiA/IChkYXRlLm0gPSBuWzBdIC0gMSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3RpbWVfcGFyc2VEYXkoZGF0ZSwgc3RyaW5nLCBpKSB7XG4gICAgZDNfdGltZV9udW1iZXJSZS5sYXN0SW5kZXggPSAwO1xuICAgIHZhciBuID0gZDNfdGltZV9udW1iZXJSZS5leGVjKHN0cmluZy5zdWJzdHJpbmcoaSwgaSArIDIpKTtcbiAgICByZXR1cm4gbiA/IChkYXRlLmQgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3RpbWVfcGFyc2VEYXlPZlllYXIoZGF0ZSwgc3RyaW5nLCBpKSB7XG4gICAgZDNfdGltZV9udW1iZXJSZS5sYXN0SW5kZXggPSAwO1xuICAgIHZhciBuID0gZDNfdGltZV9udW1iZXJSZS5leGVjKHN0cmluZy5zdWJzdHJpbmcoaSwgaSArIDMpKTtcbiAgICByZXR1cm4gbiA/IChkYXRlLmogPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3RpbWVfcGFyc2VIb3VyMjQoZGF0ZSwgc3RyaW5nLCBpKSB7XG4gICAgZDNfdGltZV9udW1iZXJSZS5sYXN0SW5kZXggPSAwO1xuICAgIHZhciBuID0gZDNfdGltZV9udW1iZXJSZS5leGVjKHN0cmluZy5zdWJzdHJpbmcoaSwgaSArIDIpKTtcbiAgICByZXR1cm4gbiA/IChkYXRlLkggPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3RpbWVfcGFyc2VNaW51dGVzKGRhdGUsIHN0cmluZywgaSkge1xuICAgIGQzX3RpbWVfbnVtYmVyUmUubGFzdEluZGV4ID0gMDtcbiAgICB2YXIgbiA9IGQzX3RpbWVfbnVtYmVyUmUuZXhlYyhzdHJpbmcuc3Vic3RyaW5nKGksIGkgKyAyKSk7XG4gICAgcmV0dXJuIG4gPyAoZGF0ZS5NID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuICBmdW5jdGlvbiBkM190aW1lX3BhcnNlU2Vjb25kcyhkYXRlLCBzdHJpbmcsIGkpIHtcbiAgICBkM190aW1lX251bWJlclJlLmxhc3RJbmRleCA9IDA7XG4gICAgdmFyIG4gPSBkM190aW1lX251bWJlclJlLmV4ZWMoc3RyaW5nLnN1YnN0cmluZyhpLCBpICsgMikpO1xuICAgIHJldHVybiBuID8gKGRhdGUuUyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cbiAgZnVuY3Rpb24gZDNfdGltZV9wYXJzZU1pbGxpc2Vjb25kcyhkYXRlLCBzdHJpbmcsIGkpIHtcbiAgICBkM190aW1lX251bWJlclJlLmxhc3RJbmRleCA9IDA7XG4gICAgdmFyIG4gPSBkM190aW1lX251bWJlclJlLmV4ZWMoc3RyaW5nLnN1YnN0cmluZyhpLCBpICsgMykpO1xuICAgIHJldHVybiBuID8gKGRhdGUuTCA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cbiAgZnVuY3Rpb24gZDNfdGltZV96b25lKGQpIHtcbiAgICB2YXIgeiA9IGQuZ2V0VGltZXpvbmVPZmZzZXQoKSwgenMgPSB6ID4gMCA/IFwiLVwiIDogXCIrXCIsIHpoID0gfn4oYWJzKHopIC8gNjApLCB6bSA9IGFicyh6KSAlIDYwO1xuICAgIHJldHVybiB6cyArIGQzX3RpbWVfZm9ybWF0UGFkKHpoLCBcIjBcIiwgMikgKyBkM190aW1lX2Zvcm1hdFBhZCh6bSwgXCIwXCIsIDIpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3RpbWVfcGFyc2VMaXRlcmFsUGVyY2VudChkYXRlLCBzdHJpbmcsIGkpIHtcbiAgICBkM190aW1lX3BlcmNlbnRSZS5sYXN0SW5kZXggPSAwO1xuICAgIHZhciBuID0gZDNfdGltZV9wZXJjZW50UmUuZXhlYyhzdHJpbmcuc3Vic3RyaW5nKGksIGkgKyAxKSk7XG4gICAgcmV0dXJuIG4gPyBpICsgblswXS5sZW5ndGggOiAtMTtcbiAgfVxuICBmdW5jdGlvbiBkM190aW1lX2Zvcm1hdE11bHRpKGZvcm1hdHMpIHtcbiAgICB2YXIgbiA9IGZvcm1hdHMubGVuZ3RoLCBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IG4pIGZvcm1hdHNbaV1bMF0gPSB0aGlzKGZvcm1hdHNbaV1bMF0pO1xuICAgIHJldHVybiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICB2YXIgaSA9IDAsIGYgPSBmb3JtYXRzW2ldO1xuICAgICAgd2hpbGUgKCFmWzFdKGRhdGUpKSBmID0gZm9ybWF0c1srK2ldO1xuICAgICAgcmV0dXJuIGZbMF0oZGF0ZSk7XG4gICAgfTtcbiAgfVxuICBkMy5sb2NhbGUgPSBmdW5jdGlvbihsb2NhbGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbnVtYmVyRm9ybWF0OiBkM19sb2NhbGVfbnVtYmVyRm9ybWF0KGxvY2FsZSksXG4gICAgICB0aW1lRm9ybWF0OiBkM19sb2NhbGVfdGltZUZvcm1hdChsb2NhbGUpXG4gICAgfTtcbiAgfTtcbiAgdmFyIGQzX2xvY2FsZV9lblVTID0gZDMubG9jYWxlKHtcbiAgICBkZWNpbWFsOiBcIi5cIixcbiAgICB0aG91c2FuZHM6IFwiLFwiLFxuICAgIGdyb3VwaW5nOiBbIDMgXSxcbiAgICBjdXJyZW5jeTogWyBcIiRcIiwgXCJcIiBdLFxuICAgIGRhdGVUaW1lOiBcIiVhICViICVlICVYICVZXCIsXG4gICAgZGF0ZTogXCIlbS8lZC8lWVwiLFxuICAgIHRpbWU6IFwiJUg6JU06JVNcIixcbiAgICBwZXJpb2RzOiBbIFwiQU1cIiwgXCJQTVwiIF0sXG4gICAgZGF5czogWyBcIlN1bmRheVwiLCBcIk1vbmRheVwiLCBcIlR1ZXNkYXlcIiwgXCJXZWRuZXNkYXlcIiwgXCJUaHVyc2RheVwiLCBcIkZyaWRheVwiLCBcIlNhdHVyZGF5XCIgXSxcbiAgICBzaG9ydERheXM6IFsgXCJTdW5cIiwgXCJNb25cIiwgXCJUdWVcIiwgXCJXZWRcIiwgXCJUaHVcIiwgXCJGcmlcIiwgXCJTYXRcIiBdLFxuICAgIG1vbnRoczogWyBcIkphbnVhcnlcIiwgXCJGZWJydWFyeVwiLCBcIk1hcmNoXCIsIFwiQXByaWxcIiwgXCJNYXlcIiwgXCJKdW5lXCIsIFwiSnVseVwiLCBcIkF1Z3VzdFwiLCBcIlNlcHRlbWJlclwiLCBcIk9jdG9iZXJcIiwgXCJOb3ZlbWJlclwiLCBcIkRlY2VtYmVyXCIgXSxcbiAgICBzaG9ydE1vbnRoczogWyBcIkphblwiLCBcIkZlYlwiLCBcIk1hclwiLCBcIkFwclwiLCBcIk1heVwiLCBcIkp1blwiLCBcIkp1bFwiLCBcIkF1Z1wiLCBcIlNlcFwiLCBcIk9jdFwiLCBcIk5vdlwiLCBcIkRlY1wiIF1cbiAgfSk7XG4gIGQzLmZvcm1hdCA9IGQzX2xvY2FsZV9lblVTLm51bWJlckZvcm1hdDtcbiAgZDMuZ2VvID0ge307XG4gIGZ1bmN0aW9uIGQzX2FkZGVyKCkge31cbiAgZDNfYWRkZXIucHJvdG90eXBlID0ge1xuICAgIHM6IDAsXG4gICAgdDogMCxcbiAgICBhZGQ6IGZ1bmN0aW9uKHkpIHtcbiAgICAgIGQzX2FkZGVyU3VtKHksIHRoaXMudCwgZDNfYWRkZXJUZW1wKTtcbiAgICAgIGQzX2FkZGVyU3VtKGQzX2FkZGVyVGVtcC5zLCB0aGlzLnMsIHRoaXMpO1xuICAgICAgaWYgKHRoaXMucykgdGhpcy50ICs9IGQzX2FkZGVyVGVtcC50OyBlbHNlIHRoaXMucyA9IGQzX2FkZGVyVGVtcC50O1xuICAgIH0sXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zID0gdGhpcy50ID0gMDtcbiAgICB9LFxuICAgIHZhbHVlT2Y6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMucztcbiAgICB9XG4gIH07XG4gIHZhciBkM19hZGRlclRlbXAgPSBuZXcgZDNfYWRkZXIoKTtcbiAgZnVuY3Rpb24gZDNfYWRkZXJTdW0oYSwgYiwgbykge1xuICAgIHZhciB4ID0gby5zID0gYSArIGIsIGJ2ID0geCAtIGEsIGF2ID0geCAtIGJ2O1xuICAgIG8udCA9IGEgLSBhdiArIChiIC0gYnYpO1xuICB9XG4gIGQzLmdlby5zdHJlYW0gPSBmdW5jdGlvbihvYmplY3QsIGxpc3RlbmVyKSB7XG4gICAgaWYgKG9iamVjdCAmJiBkM19nZW9fc3RyZWFtT2JqZWN0VHlwZS5oYXNPd25Qcm9wZXJ0eShvYmplY3QudHlwZSkpIHtcbiAgICAgIGQzX2dlb19zdHJlYW1PYmplY3RUeXBlW29iamVjdC50eXBlXShvYmplY3QsIGxpc3RlbmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZDNfZ2VvX3N0cmVhbUdlb21ldHJ5KG9iamVjdCwgbGlzdGVuZXIpO1xuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gZDNfZ2VvX3N0cmVhbUdlb21ldHJ5KGdlb21ldHJ5LCBsaXN0ZW5lcikge1xuICAgIGlmIChnZW9tZXRyeSAmJiBkM19nZW9fc3RyZWFtR2VvbWV0cnlUeXBlLmhhc093blByb3BlcnR5KGdlb21ldHJ5LnR5cGUpKSB7XG4gICAgICBkM19nZW9fc3RyZWFtR2VvbWV0cnlUeXBlW2dlb21ldHJ5LnR5cGVdKGdlb21ldHJ5LCBsaXN0ZW5lcik7XG4gICAgfVxuICB9XG4gIHZhciBkM19nZW9fc3RyZWFtT2JqZWN0VHlwZSA9IHtcbiAgICBGZWF0dXJlOiBmdW5jdGlvbihmZWF0dXJlLCBsaXN0ZW5lcikge1xuICAgICAgZDNfZ2VvX3N0cmVhbUdlb21ldHJ5KGZlYXR1cmUuZ2VvbWV0cnksIGxpc3RlbmVyKTtcbiAgICB9LFxuICAgIEZlYXR1cmVDb2xsZWN0aW9uOiBmdW5jdGlvbihvYmplY3QsIGxpc3RlbmVyKSB7XG4gICAgICB2YXIgZmVhdHVyZXMgPSBvYmplY3QuZmVhdHVyZXMsIGkgPSAtMSwgbiA9IGZlYXR1cmVzLmxlbmd0aDtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBkM19nZW9fc3RyZWFtR2VvbWV0cnkoZmVhdHVyZXNbaV0uZ2VvbWV0cnksIGxpc3RlbmVyKTtcbiAgICB9XG4gIH07XG4gIHZhciBkM19nZW9fc3RyZWFtR2VvbWV0cnlUeXBlID0ge1xuICAgIFNwaGVyZTogZnVuY3Rpb24ob2JqZWN0LCBsaXN0ZW5lcikge1xuICAgICAgbGlzdGVuZXIuc3BoZXJlKCk7XG4gICAgfSxcbiAgICBQb2ludDogZnVuY3Rpb24ob2JqZWN0LCBsaXN0ZW5lcikge1xuICAgICAgb2JqZWN0ID0gb2JqZWN0LmNvb3JkaW5hdGVzO1xuICAgICAgbGlzdGVuZXIucG9pbnQob2JqZWN0WzBdLCBvYmplY3RbMV0sIG9iamVjdFsyXSk7XG4gICAgfSxcbiAgICBNdWx0aVBvaW50OiBmdW5jdGlvbihvYmplY3QsIGxpc3RlbmVyKSB7XG4gICAgICB2YXIgY29vcmRpbmF0ZXMgPSBvYmplY3QuY29vcmRpbmF0ZXMsIGkgPSAtMSwgbiA9IGNvb3JkaW5hdGVzLmxlbmd0aDtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBvYmplY3QgPSBjb29yZGluYXRlc1tpXSwgbGlzdGVuZXIucG9pbnQob2JqZWN0WzBdLCBvYmplY3RbMV0sIG9iamVjdFsyXSk7XG4gICAgfSxcbiAgICBMaW5lU3RyaW5nOiBmdW5jdGlvbihvYmplY3QsIGxpc3RlbmVyKSB7XG4gICAgICBkM19nZW9fc3RyZWFtTGluZShvYmplY3QuY29vcmRpbmF0ZXMsIGxpc3RlbmVyLCAwKTtcbiAgICB9LFxuICAgIE11bHRpTGluZVN0cmluZzogZnVuY3Rpb24ob2JqZWN0LCBsaXN0ZW5lcikge1xuICAgICAgdmFyIGNvb3JkaW5hdGVzID0gb2JqZWN0LmNvb3JkaW5hdGVzLCBpID0gLTEsIG4gPSBjb29yZGluYXRlcy5sZW5ndGg7XG4gICAgICB3aGlsZSAoKytpIDwgbikgZDNfZ2VvX3N0cmVhbUxpbmUoY29vcmRpbmF0ZXNbaV0sIGxpc3RlbmVyLCAwKTtcbiAgICB9LFxuICAgIFBvbHlnb246IGZ1bmN0aW9uKG9iamVjdCwgbGlzdGVuZXIpIHtcbiAgICAgIGQzX2dlb19zdHJlYW1Qb2x5Z29uKG9iamVjdC5jb29yZGluYXRlcywgbGlzdGVuZXIpO1xuICAgIH0sXG4gICAgTXVsdGlQb2x5Z29uOiBmdW5jdGlvbihvYmplY3QsIGxpc3RlbmVyKSB7XG4gICAgICB2YXIgY29vcmRpbmF0ZXMgPSBvYmplY3QuY29vcmRpbmF0ZXMsIGkgPSAtMSwgbiA9IGNvb3JkaW5hdGVzLmxlbmd0aDtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBkM19nZW9fc3RyZWFtUG9seWdvbihjb29yZGluYXRlc1tpXSwgbGlzdGVuZXIpO1xuICAgIH0sXG4gICAgR2VvbWV0cnlDb2xsZWN0aW9uOiBmdW5jdGlvbihvYmplY3QsIGxpc3RlbmVyKSB7XG4gICAgICB2YXIgZ2VvbWV0cmllcyA9IG9iamVjdC5nZW9tZXRyaWVzLCBpID0gLTEsIG4gPSBnZW9tZXRyaWVzLmxlbmd0aDtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBkM19nZW9fc3RyZWFtR2VvbWV0cnkoZ2VvbWV0cmllc1tpXSwgbGlzdGVuZXIpO1xuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gZDNfZ2VvX3N0cmVhbUxpbmUoY29vcmRpbmF0ZXMsIGxpc3RlbmVyLCBjbG9zZWQpIHtcbiAgICB2YXIgaSA9IC0xLCBuID0gY29vcmRpbmF0ZXMubGVuZ3RoIC0gY2xvc2VkLCBjb29yZGluYXRlO1xuICAgIGxpc3RlbmVyLmxpbmVTdGFydCgpO1xuICAgIHdoaWxlICgrK2kgPCBuKSBjb29yZGluYXRlID0gY29vcmRpbmF0ZXNbaV0sIGxpc3RlbmVyLnBvaW50KGNvb3JkaW5hdGVbMF0sIGNvb3JkaW5hdGVbMV0sIGNvb3JkaW5hdGVbMl0pO1xuICAgIGxpc3RlbmVyLmxpbmVFbmQoKTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fc3RyZWFtUG9seWdvbihjb29yZGluYXRlcywgbGlzdGVuZXIpIHtcbiAgICB2YXIgaSA9IC0xLCBuID0gY29vcmRpbmF0ZXMubGVuZ3RoO1xuICAgIGxpc3RlbmVyLnBvbHlnb25TdGFydCgpO1xuICAgIHdoaWxlICgrK2kgPCBuKSBkM19nZW9fc3RyZWFtTGluZShjb29yZGluYXRlc1tpXSwgbGlzdGVuZXIsIDEpO1xuICAgIGxpc3RlbmVyLnBvbHlnb25FbmQoKTtcbiAgfVxuICBkMy5nZW8uYXJlYSA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIGQzX2dlb19hcmVhU3VtID0gMDtcbiAgICBkMy5nZW8uc3RyZWFtKG9iamVjdCwgZDNfZ2VvX2FyZWEpO1xuICAgIHJldHVybiBkM19nZW9fYXJlYVN1bTtcbiAgfTtcbiAgdmFyIGQzX2dlb19hcmVhU3VtLCBkM19nZW9fYXJlYVJpbmdTdW0gPSBuZXcgZDNfYWRkZXIoKTtcbiAgdmFyIGQzX2dlb19hcmVhID0ge1xuICAgIHNwaGVyZTogZnVuY3Rpb24oKSB7XG4gICAgICBkM19nZW9fYXJlYVN1bSArPSA0ICogz4A7XG4gICAgfSxcbiAgICBwb2ludDogZDNfbm9vcCxcbiAgICBsaW5lU3RhcnQ6IGQzX25vb3AsXG4gICAgbGluZUVuZDogZDNfbm9vcCxcbiAgICBwb2x5Z29uU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgZDNfZ2VvX2FyZWFSaW5nU3VtLnJlc2V0KCk7XG4gICAgICBkM19nZW9fYXJlYS5saW5lU3RhcnQgPSBkM19nZW9fYXJlYVJpbmdTdGFydDtcbiAgICB9LFxuICAgIHBvbHlnb25FbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZWEgPSAyICogZDNfZ2VvX2FyZWFSaW5nU3VtO1xuICAgICAgZDNfZ2VvX2FyZWFTdW0gKz0gYXJlYSA8IDAgPyA0ICogz4AgKyBhcmVhIDogYXJlYTtcbiAgICAgIGQzX2dlb19hcmVhLmxpbmVTdGFydCA9IGQzX2dlb19hcmVhLmxpbmVFbmQgPSBkM19nZW9fYXJlYS5wb2ludCA9IGQzX25vb3A7XG4gICAgfVxuICB9O1xuICBmdW5jdGlvbiBkM19nZW9fYXJlYVJpbmdTdGFydCgpIHtcbiAgICB2YXIgzrswMCwgz4YwMCwgzrswLCBjb3PPhjAsIHNpbs+GMDtcbiAgICBkM19nZW9fYXJlYS5wb2ludCA9IGZ1bmN0aW9uKM67LCDPhikge1xuICAgICAgZDNfZ2VvX2FyZWEucG9pbnQgPSBuZXh0UG9pbnQ7XG4gICAgICDOuzAgPSAozrswMCA9IM67KSAqIGQzX3JhZGlhbnMsIGNvc8+GMCA9IE1hdGguY29zKM+GID0gKM+GMDAgPSDPhikgKiBkM19yYWRpYW5zIC8gMiArIM+AIC8gNCksIFxuICAgICAgc2luz4YwID0gTWF0aC5zaW4oz4YpO1xuICAgIH07XG4gICAgZnVuY3Rpb24gbmV4dFBvaW50KM67LCDPhikge1xuICAgICAgzrsgKj0gZDNfcmFkaWFucztcbiAgICAgIM+GID0gz4YgKiBkM19yYWRpYW5zIC8gMiArIM+AIC8gNDtcbiAgICAgIHZhciBkzrsgPSDOuyAtIM67MCwgY29zz4YgPSBNYXRoLmNvcyjPhiksIHNpbs+GID0gTWF0aC5zaW4oz4YpLCBrID0gc2luz4YwICogc2luz4YsIHUgPSBjb3PPhjAgKiBjb3PPhiArIGsgKiBNYXRoLmNvcyhkzrspLCB2ID0gayAqIE1hdGguc2luKGTOuyk7XG4gICAgICBkM19nZW9fYXJlYVJpbmdTdW0uYWRkKE1hdGguYXRhbjIodiwgdSkpO1xuICAgICAgzrswID0gzrssIGNvc8+GMCA9IGNvc8+GLCBzaW7PhjAgPSBzaW7PhjtcbiAgICB9XG4gICAgZDNfZ2VvX2FyZWEubGluZUVuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgbmV4dFBvaW50KM67MDAsIM+GMDApO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvX2NhcnRlc2lhbihzcGhlcmljYWwpIHtcbiAgICB2YXIgzrsgPSBzcGhlcmljYWxbMF0sIM+GID0gc3BoZXJpY2FsWzFdLCBjb3PPhiA9IE1hdGguY29zKM+GKTtcbiAgICByZXR1cm4gWyBjb3PPhiAqIE1hdGguY29zKM67KSwgY29zz4YgKiBNYXRoLnNpbijOuyksIE1hdGguc2luKM+GKSBdO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19jYXJ0ZXNpYW5Eb3QoYSwgYikge1xuICAgIHJldHVybiBhWzBdICogYlswXSArIGFbMV0gKiBiWzFdICsgYVsyXSAqIGJbMl07XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvX2NhcnRlc2lhbkNyb3NzKGEsIGIpIHtcbiAgICByZXR1cm4gWyBhWzFdICogYlsyXSAtIGFbMl0gKiBiWzFdLCBhWzJdICogYlswXSAtIGFbMF0gKiBiWzJdLCBhWzBdICogYlsxXSAtIGFbMV0gKiBiWzBdIF07XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvX2NhcnRlc2lhbkFkZChhLCBiKSB7XG4gICAgYVswXSArPSBiWzBdO1xuICAgIGFbMV0gKz0gYlsxXTtcbiAgICBhWzJdICs9IGJbMl07XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvX2NhcnRlc2lhblNjYWxlKHZlY3Rvciwgaykge1xuICAgIHJldHVybiBbIHZlY3RvclswXSAqIGssIHZlY3RvclsxXSAqIGssIHZlY3RvclsyXSAqIGsgXTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fY2FydGVzaWFuTm9ybWFsaXplKGQpIHtcbiAgICB2YXIgbCA9IE1hdGguc3FydChkWzBdICogZFswXSArIGRbMV0gKiBkWzFdICsgZFsyXSAqIGRbMl0pO1xuICAgIGRbMF0gLz0gbDtcbiAgICBkWzFdIC89IGw7XG4gICAgZFsyXSAvPSBsO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19zcGhlcmljYWwoY2FydGVzaWFuKSB7XG4gICAgcmV0dXJuIFsgTWF0aC5hdGFuMihjYXJ0ZXNpYW5bMV0sIGNhcnRlc2lhblswXSksIGQzX2FzaW4oY2FydGVzaWFuWzJdKSBdO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19zcGhlcmljYWxFcXVhbChhLCBiKSB7XG4gICAgcmV0dXJuIGFicyhhWzBdIC0gYlswXSkgPCDOtSAmJiBhYnMoYVsxXSAtIGJbMV0pIDwgzrU7XG4gIH1cbiAgZDMuZ2VvLmJvdW5kcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciDOuzAsIM+GMCwgzrsxLCDPhjEsIM67XywgzrtfXywgz4ZfXywgcDAsIGTOu1N1bSwgcmFuZ2VzLCByYW5nZTtcbiAgICB2YXIgYm91bmQgPSB7XG4gICAgICBwb2ludDogcG9pbnQsXG4gICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgIGxpbmVFbmQ6IGxpbmVFbmQsXG4gICAgICBwb2x5Z29uU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBib3VuZC5wb2ludCA9IHJpbmdQb2ludDtcbiAgICAgICAgYm91bmQubGluZVN0YXJ0ID0gcmluZ1N0YXJ0O1xuICAgICAgICBib3VuZC5saW5lRW5kID0gcmluZ0VuZDtcbiAgICAgICAgZM67U3VtID0gMDtcbiAgICAgICAgZDNfZ2VvX2FyZWEucG9seWdvblN0YXJ0KCk7XG4gICAgICB9LFxuICAgICAgcG9seWdvbkVuZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGQzX2dlb19hcmVhLnBvbHlnb25FbmQoKTtcbiAgICAgICAgYm91bmQucG9pbnQgPSBwb2ludDtcbiAgICAgICAgYm91bmQubGluZVN0YXJ0ID0gbGluZVN0YXJ0O1xuICAgICAgICBib3VuZC5saW5lRW5kID0gbGluZUVuZDtcbiAgICAgICAgaWYgKGQzX2dlb19hcmVhUmluZ1N1bSA8IDApIM67MCA9IC0ozrsxID0gMTgwKSwgz4YwID0gLSjPhjEgPSA5MCk7IGVsc2UgaWYgKGTOu1N1bSA+IM61KSDPhjEgPSA5MDsgZWxzZSBpZiAoZM67U3VtIDwgLc61KSDPhjAgPSAtOTA7XG4gICAgICAgIHJhbmdlWzBdID0gzrswLCByYW5nZVsxXSA9IM67MTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGZ1bmN0aW9uIHBvaW50KM67LCDPhikge1xuICAgICAgcmFuZ2VzLnB1c2gocmFuZ2UgPSBbIM67MCA9IM67LCDOuzEgPSDOuyBdKTtcbiAgICAgIGlmICjPhiA8IM+GMCkgz4YwID0gz4Y7XG4gICAgICBpZiAoz4YgPiDPhjEpIM+GMSA9IM+GO1xuICAgIH1cbiAgICBmdW5jdGlvbiBsaW5lUG9pbnQozrssIM+GKSB7XG4gICAgICB2YXIgcCA9IGQzX2dlb19jYXJ0ZXNpYW4oWyDOuyAqIGQzX3JhZGlhbnMsIM+GICogZDNfcmFkaWFucyBdKTtcbiAgICAgIGlmIChwMCkge1xuICAgICAgICB2YXIgbm9ybWFsID0gZDNfZ2VvX2NhcnRlc2lhbkNyb3NzKHAwLCBwKSwgZXF1YXRvcmlhbCA9IFsgbm9ybWFsWzFdLCAtbm9ybWFsWzBdLCAwIF0sIGluZmxlY3Rpb24gPSBkM19nZW9fY2FydGVzaWFuQ3Jvc3MoZXF1YXRvcmlhbCwgbm9ybWFsKTtcbiAgICAgICAgZDNfZ2VvX2NhcnRlc2lhbk5vcm1hbGl6ZShpbmZsZWN0aW9uKTtcbiAgICAgICAgaW5mbGVjdGlvbiA9IGQzX2dlb19zcGhlcmljYWwoaW5mbGVjdGlvbik7XG4gICAgICAgIHZhciBkzrsgPSDOuyAtIM67XywgcyA9IGTOuyA+IDAgPyAxIDogLTEsIM67aSA9IGluZmxlY3Rpb25bMF0gKiBkM19kZWdyZWVzICogcywgYW50aW1lcmlkaWFuID0gYWJzKGTOuykgPiAxODA7XG4gICAgICAgIGlmIChhbnRpbWVyaWRpYW4gXiAocyAqIM67XyA8IM67aSAmJiDOu2kgPCBzICogzrspKSB7XG4gICAgICAgICAgdmFyIM+GaSA9IGluZmxlY3Rpb25bMV0gKiBkM19kZWdyZWVzO1xuICAgICAgICAgIGlmICjPhmkgPiDPhjEpIM+GMSA9IM+GaTtcbiAgICAgICAgfSBlbHNlIGlmICjOu2kgPSAozrtpICsgMzYwKSAlIDM2MCAtIDE4MCwgYW50aW1lcmlkaWFuIF4gKHMgKiDOu18gPCDOu2kgJiYgzrtpIDwgcyAqIM67KSkge1xuICAgICAgICAgIHZhciDPhmkgPSAtaW5mbGVjdGlvblsxXSAqIGQzX2RlZ3JlZXM7XG4gICAgICAgICAgaWYgKM+GaSA8IM+GMCkgz4YwID0gz4ZpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICjPhiA8IM+GMCkgz4YwID0gz4Y7XG4gICAgICAgICAgaWYgKM+GID4gz4YxKSDPhjEgPSDPhjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYW50aW1lcmlkaWFuKSB7XG4gICAgICAgICAgaWYgKM67IDwgzrtfKSB7XG4gICAgICAgICAgICBpZiAoYW5nbGUozrswLCDOuykgPiBhbmdsZSjOuzAsIM67MSkpIM67MSA9IM67O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoYW5nbGUozrssIM67MSkgPiBhbmdsZSjOuzAsIM67MSkpIM67MCA9IM67O1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAozrsxID49IM67MCkge1xuICAgICAgICAgICAgaWYgKM67IDwgzrswKSDOuzAgPSDOuztcbiAgICAgICAgICAgIGlmICjOuyA+IM67MSkgzrsxID0gzrs7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICjOuyA+IM67Xykge1xuICAgICAgICAgICAgICBpZiAoYW5nbGUozrswLCDOuykgPiBhbmdsZSjOuzAsIM67MSkpIM67MSA9IM67O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKGFuZ2xlKM67LCDOuzEpID4gYW5nbGUozrswLCDOuzEpKSDOuzAgPSDOuztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBvaW50KM67LCDPhik7XG4gICAgICB9XG4gICAgICBwMCA9IHAsIM67XyA9IM67O1xuICAgIH1cbiAgICBmdW5jdGlvbiBsaW5lU3RhcnQoKSB7XG4gICAgICBib3VuZC5wb2ludCA9IGxpbmVQb2ludDtcbiAgICB9XG4gICAgZnVuY3Rpb24gbGluZUVuZCgpIHtcbiAgICAgIHJhbmdlWzBdID0gzrswLCByYW5nZVsxXSA9IM67MTtcbiAgICAgIGJvdW5kLnBvaW50ID0gcG9pbnQ7XG4gICAgICBwMCA9IG51bGw7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJpbmdQb2ludCjOuywgz4YpIHtcbiAgICAgIGlmIChwMCkge1xuICAgICAgICB2YXIgZM67ID0gzrsgLSDOu187XG4gICAgICAgIGTOu1N1bSArPSBhYnMoZM67KSA+IDE4MCA/IGTOuyArIChkzrsgPiAwID8gMzYwIDogLTM2MCkgOiBkzrs7XG4gICAgICB9IGVsc2UgzrtfXyA9IM67LCDPhl9fID0gz4Y7XG4gICAgICBkM19nZW9fYXJlYS5wb2ludCjOuywgz4YpO1xuICAgICAgbGluZVBvaW50KM67LCDPhik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJpbmdTdGFydCgpIHtcbiAgICAgIGQzX2dlb19hcmVhLmxpbmVTdGFydCgpO1xuICAgIH1cbiAgICBmdW5jdGlvbiByaW5nRW5kKCkge1xuICAgICAgcmluZ1BvaW50KM67X18sIM+GX18pO1xuICAgICAgZDNfZ2VvX2FyZWEubGluZUVuZCgpO1xuICAgICAgaWYgKGFicyhkzrtTdW0pID4gzrUpIM67MCA9IC0ozrsxID0gMTgwKTtcbiAgICAgIHJhbmdlWzBdID0gzrswLCByYW5nZVsxXSA9IM67MTtcbiAgICAgIHAwID0gbnVsbDtcbiAgICB9XG4gICAgZnVuY3Rpb24gYW5nbGUozrswLCDOuzEpIHtcbiAgICAgIHJldHVybiAozrsxIC09IM67MCkgPCAwID8gzrsxICsgMzYwIDogzrsxO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjb21wYXJlUmFuZ2VzKGEsIGIpIHtcbiAgICAgIHJldHVybiBhWzBdIC0gYlswXTtcbiAgICB9XG4gICAgZnVuY3Rpb24gd2l0aGluUmFuZ2UoeCwgcmFuZ2UpIHtcbiAgICAgIHJldHVybiByYW5nZVswXSA8PSByYW5nZVsxXSA/IHJhbmdlWzBdIDw9IHggJiYgeCA8PSByYW5nZVsxXSA6IHggPCByYW5nZVswXSB8fCByYW5nZVsxXSA8IHg7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgICDPhjEgPSDOuzEgPSAtKM67MCA9IM+GMCA9IEluZmluaXR5KTtcbiAgICAgIHJhbmdlcyA9IFtdO1xuICAgICAgZDMuZ2VvLnN0cmVhbShmZWF0dXJlLCBib3VuZCk7XG4gICAgICB2YXIgbiA9IHJhbmdlcy5sZW5ndGg7XG4gICAgICBpZiAobikge1xuICAgICAgICByYW5nZXMuc29ydChjb21wYXJlUmFuZ2VzKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDEsIGEgPSByYW5nZXNbMF0sIGIsIG1lcmdlZCA9IFsgYSBdOyBpIDwgbjsgKytpKSB7XG4gICAgICAgICAgYiA9IHJhbmdlc1tpXTtcbiAgICAgICAgICBpZiAod2l0aGluUmFuZ2UoYlswXSwgYSkgfHwgd2l0aGluUmFuZ2UoYlsxXSwgYSkpIHtcbiAgICAgICAgICAgIGlmIChhbmdsZShhWzBdLCBiWzFdKSA+IGFuZ2xlKGFbMF0sIGFbMV0pKSBhWzFdID0gYlsxXTtcbiAgICAgICAgICAgIGlmIChhbmdsZShiWzBdLCBhWzFdKSA+IGFuZ2xlKGFbMF0sIGFbMV0pKSBhWzBdID0gYlswXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWVyZ2VkLnB1c2goYSA9IGIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgYmVzdCA9IC1JbmZpbml0eSwgZM67O1xuICAgICAgICBmb3IgKHZhciBuID0gbWVyZ2VkLmxlbmd0aCAtIDEsIGkgPSAwLCBhID0gbWVyZ2VkW25dLCBiOyBpIDw9IG47IGEgPSBiLCArK2kpIHtcbiAgICAgICAgICBiID0gbWVyZ2VkW2ldO1xuICAgICAgICAgIGlmICgoZM67ID0gYW5nbGUoYVsxXSwgYlswXSkpID4gYmVzdCkgYmVzdCA9IGTOuywgzrswID0gYlswXSwgzrsxID0gYVsxXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmFuZ2VzID0gcmFuZ2UgPSBudWxsO1xuICAgICAgcmV0dXJuIM67MCA9PT0gSW5maW5pdHkgfHwgz4YwID09PSBJbmZpbml0eSA/IFsgWyBOYU4sIE5hTiBdLCBbIE5hTiwgTmFOIF0gXSA6IFsgWyDOuzAsIM+GMCBdLCBbIM67MSwgz4YxIF0gXTtcbiAgICB9O1xuICB9KCk7XG4gIGQzLmdlby5jZW50cm9pZCA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIGQzX2dlb19jZW50cm9pZFcwID0gZDNfZ2VvX2NlbnRyb2lkVzEgPSBkM19nZW9fY2VudHJvaWRYMCA9IGQzX2dlb19jZW50cm9pZFkwID0gZDNfZ2VvX2NlbnRyb2lkWjAgPSBkM19nZW9fY2VudHJvaWRYMSA9IGQzX2dlb19jZW50cm9pZFkxID0gZDNfZ2VvX2NlbnRyb2lkWjEgPSBkM19nZW9fY2VudHJvaWRYMiA9IGQzX2dlb19jZW50cm9pZFkyID0gZDNfZ2VvX2NlbnRyb2lkWjIgPSAwO1xuICAgIGQzLmdlby5zdHJlYW0ob2JqZWN0LCBkM19nZW9fY2VudHJvaWQpO1xuICAgIHZhciB4ID0gZDNfZ2VvX2NlbnRyb2lkWDIsIHkgPSBkM19nZW9fY2VudHJvaWRZMiwgeiA9IGQzX2dlb19jZW50cm9pZFoyLCBtID0geCAqIHggKyB5ICogeSArIHogKiB6O1xuICAgIGlmIChtIDwgzrUyKSB7XG4gICAgICB4ID0gZDNfZ2VvX2NlbnRyb2lkWDEsIHkgPSBkM19nZW9fY2VudHJvaWRZMSwgeiA9IGQzX2dlb19jZW50cm9pZFoxO1xuICAgICAgaWYgKGQzX2dlb19jZW50cm9pZFcxIDwgzrUpIHggPSBkM19nZW9fY2VudHJvaWRYMCwgeSA9IGQzX2dlb19jZW50cm9pZFkwLCB6ID0gZDNfZ2VvX2NlbnRyb2lkWjA7XG4gICAgICBtID0geCAqIHggKyB5ICogeSArIHogKiB6O1xuICAgICAgaWYgKG0gPCDOtTIpIHJldHVybiBbIE5hTiwgTmFOIF07XG4gICAgfVxuICAgIHJldHVybiBbIE1hdGguYXRhbjIoeSwgeCkgKiBkM19kZWdyZWVzLCBkM19hc2luKHogLyBNYXRoLnNxcnQobSkpICogZDNfZGVncmVlcyBdO1xuICB9O1xuICB2YXIgZDNfZ2VvX2NlbnRyb2lkVzAsIGQzX2dlb19jZW50cm9pZFcxLCBkM19nZW9fY2VudHJvaWRYMCwgZDNfZ2VvX2NlbnRyb2lkWTAsIGQzX2dlb19jZW50cm9pZFowLCBkM19nZW9fY2VudHJvaWRYMSwgZDNfZ2VvX2NlbnRyb2lkWTEsIGQzX2dlb19jZW50cm9pZFoxLCBkM19nZW9fY2VudHJvaWRYMiwgZDNfZ2VvX2NlbnRyb2lkWTIsIGQzX2dlb19jZW50cm9pZFoyO1xuICB2YXIgZDNfZ2VvX2NlbnRyb2lkID0ge1xuICAgIHNwaGVyZTogZDNfbm9vcCxcbiAgICBwb2ludDogZDNfZ2VvX2NlbnRyb2lkUG9pbnQsXG4gICAgbGluZVN0YXJ0OiBkM19nZW9fY2VudHJvaWRMaW5lU3RhcnQsXG4gICAgbGluZUVuZDogZDNfZ2VvX2NlbnRyb2lkTGluZUVuZCxcbiAgICBwb2x5Z29uU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkLmxpbmVTdGFydCA9IGQzX2dlb19jZW50cm9pZFJpbmdTdGFydDtcbiAgICB9LFxuICAgIHBvbHlnb25FbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkLmxpbmVTdGFydCA9IGQzX2dlb19jZW50cm9pZExpbmVTdGFydDtcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2dlb19jZW50cm9pZFBvaW50KM67LCDPhikge1xuICAgIM67ICo9IGQzX3JhZGlhbnM7XG4gICAgdmFyIGNvc8+GID0gTWF0aC5jb3Moz4YgKj0gZDNfcmFkaWFucyk7XG4gICAgZDNfZ2VvX2NlbnRyb2lkUG9pbnRYWVooY29zz4YgKiBNYXRoLmNvcyjOuyksIGNvc8+GICogTWF0aC5zaW4ozrspLCBNYXRoLnNpbijPhikpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19jZW50cm9pZFBvaW50WFlaKHgsIHksIHopIHtcbiAgICArK2QzX2dlb19jZW50cm9pZFcwO1xuICAgIGQzX2dlb19jZW50cm9pZFgwICs9ICh4IC0gZDNfZ2VvX2NlbnRyb2lkWDApIC8gZDNfZ2VvX2NlbnRyb2lkVzA7XG4gICAgZDNfZ2VvX2NlbnRyb2lkWTAgKz0gKHkgLSBkM19nZW9fY2VudHJvaWRZMCkgLyBkM19nZW9fY2VudHJvaWRXMDtcbiAgICBkM19nZW9fY2VudHJvaWRaMCArPSAoeiAtIGQzX2dlb19jZW50cm9pZFowKSAvIGQzX2dlb19jZW50cm9pZFcwO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19jZW50cm9pZExpbmVTdGFydCgpIHtcbiAgICB2YXIgeDAsIHkwLCB6MDtcbiAgICBkM19nZW9fY2VudHJvaWQucG9pbnQgPSBmdW5jdGlvbijOuywgz4YpIHtcbiAgICAgIM67ICo9IGQzX3JhZGlhbnM7XG4gICAgICB2YXIgY29zz4YgPSBNYXRoLmNvcyjPhiAqPSBkM19yYWRpYW5zKTtcbiAgICAgIHgwID0gY29zz4YgKiBNYXRoLmNvcyjOuyk7XG4gICAgICB5MCA9IGNvc8+GICogTWF0aC5zaW4ozrspO1xuICAgICAgejAgPSBNYXRoLnNpbijPhik7XG4gICAgICBkM19nZW9fY2VudHJvaWQucG9pbnQgPSBuZXh0UG9pbnQ7XG4gICAgICBkM19nZW9fY2VudHJvaWRQb2ludFhZWih4MCwgeTAsIHowKTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIG5leHRQb2ludCjOuywgz4YpIHtcbiAgICAgIM67ICo9IGQzX3JhZGlhbnM7XG4gICAgICB2YXIgY29zz4YgPSBNYXRoLmNvcyjPhiAqPSBkM19yYWRpYW5zKSwgeCA9IGNvc8+GICogTWF0aC5jb3MozrspLCB5ID0gY29zz4YgKiBNYXRoLnNpbijOuyksIHogPSBNYXRoLnNpbijPhiksIHcgPSBNYXRoLmF0YW4yKE1hdGguc3FydCgodyA9IHkwICogeiAtIHowICogeSkgKiB3ICsgKHcgPSB6MCAqIHggLSB4MCAqIHopICogdyArICh3ID0geDAgKiB5IC0geTAgKiB4KSAqIHcpLCB4MCAqIHggKyB5MCAqIHkgKyB6MCAqIHopO1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkVzEgKz0gdztcbiAgICAgIGQzX2dlb19jZW50cm9pZFgxICs9IHcgKiAoeDAgKyAoeDAgPSB4KSk7XG4gICAgICBkM19nZW9fY2VudHJvaWRZMSArPSB3ICogKHkwICsgKHkwID0geSkpO1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkWjEgKz0gdyAqICh6MCArICh6MCA9IHopKTtcbiAgICAgIGQzX2dlb19jZW50cm9pZFBvaW50WFlaKHgwLCB5MCwgejApO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fY2VudHJvaWRMaW5lRW5kKCkge1xuICAgIGQzX2dlb19jZW50cm9pZC5wb2ludCA9IGQzX2dlb19jZW50cm9pZFBvaW50O1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19jZW50cm9pZFJpbmdTdGFydCgpIHtcbiAgICB2YXIgzrswMCwgz4YwMCwgeDAsIHkwLCB6MDtcbiAgICBkM19nZW9fY2VudHJvaWQucG9pbnQgPSBmdW5jdGlvbijOuywgz4YpIHtcbiAgICAgIM67MDAgPSDOuywgz4YwMCA9IM+GO1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkLnBvaW50ID0gbmV4dFBvaW50O1xuICAgICAgzrsgKj0gZDNfcmFkaWFucztcbiAgICAgIHZhciBjb3PPhiA9IE1hdGguY29zKM+GICo9IGQzX3JhZGlhbnMpO1xuICAgICAgeDAgPSBjb3PPhiAqIE1hdGguY29zKM67KTtcbiAgICAgIHkwID0gY29zz4YgKiBNYXRoLnNpbijOuyk7XG4gICAgICB6MCA9IE1hdGguc2luKM+GKTtcbiAgICAgIGQzX2dlb19jZW50cm9pZFBvaW50WFlaKHgwLCB5MCwgejApO1xuICAgIH07XG4gICAgZDNfZ2VvX2NlbnRyb2lkLmxpbmVFbmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIG5leHRQb2ludCjOuzAwLCDPhjAwKTtcbiAgICAgIGQzX2dlb19jZW50cm9pZC5saW5lRW5kID0gZDNfZ2VvX2NlbnRyb2lkTGluZUVuZDtcbiAgICAgIGQzX2dlb19jZW50cm9pZC5wb2ludCA9IGQzX2dlb19jZW50cm9pZFBvaW50O1xuICAgIH07XG4gICAgZnVuY3Rpb24gbmV4dFBvaW50KM67LCDPhikge1xuICAgICAgzrsgKj0gZDNfcmFkaWFucztcbiAgICAgIHZhciBjb3PPhiA9IE1hdGguY29zKM+GICo9IGQzX3JhZGlhbnMpLCB4ID0gY29zz4YgKiBNYXRoLmNvcyjOuyksIHkgPSBjb3PPhiAqIE1hdGguc2luKM67KSwgeiA9IE1hdGguc2luKM+GKSwgY3ggPSB5MCAqIHogLSB6MCAqIHksIGN5ID0gejAgKiB4IC0geDAgKiB6LCBjeiA9IHgwICogeSAtIHkwICogeCwgbSA9IE1hdGguc3FydChjeCAqIGN4ICsgY3kgKiBjeSArIGN6ICogY3opLCB1ID0geDAgKiB4ICsgeTAgKiB5ICsgejAgKiB6LCB2ID0gbSAmJiAtZDNfYWNvcyh1KSAvIG0sIHcgPSBNYXRoLmF0YW4yKG0sIHUpO1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkWDIgKz0gdiAqIGN4O1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkWTIgKz0gdiAqIGN5O1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkWjIgKz0gdiAqIGN6O1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkVzEgKz0gdztcbiAgICAgIGQzX2dlb19jZW50cm9pZFgxICs9IHcgKiAoeDAgKyAoeDAgPSB4KSk7XG4gICAgICBkM19nZW9fY2VudHJvaWRZMSArPSB3ICogKHkwICsgKHkwID0geSkpO1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkWjEgKz0gdyAqICh6MCArICh6MCA9IHopKTtcbiAgICAgIGQzX2dlb19jZW50cm9pZFBvaW50WFlaKHgwLCB5MCwgejApO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBkM190cnVlKCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19jbGlwUG9seWdvbihzZWdtZW50cywgY29tcGFyZSwgY2xpcFN0YXJ0SW5zaWRlLCBpbnRlcnBvbGF0ZSwgbGlzdGVuZXIpIHtcbiAgICB2YXIgc3ViamVjdCA9IFtdLCBjbGlwID0gW107XG4gICAgc2VnbWVudHMuZm9yRWFjaChmdW5jdGlvbihzZWdtZW50KSB7XG4gICAgICBpZiAoKG4gPSBzZWdtZW50Lmxlbmd0aCAtIDEpIDw9IDApIHJldHVybjtcbiAgICAgIHZhciBuLCBwMCA9IHNlZ21lbnRbMF0sIHAxID0gc2VnbWVudFtuXTtcbiAgICAgIGlmIChkM19nZW9fc3BoZXJpY2FsRXF1YWwocDAsIHAxKSkge1xuICAgICAgICBsaXN0ZW5lci5saW5lU3RhcnQoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyArK2kpIGxpc3RlbmVyLnBvaW50KChwMCA9IHNlZ21lbnRbaV0pWzBdLCBwMFsxXSk7XG4gICAgICAgIGxpc3RlbmVyLmxpbmVFbmQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGEgPSBuZXcgZDNfZ2VvX2NsaXBQb2x5Z29uSW50ZXJzZWN0aW9uKHAwLCBzZWdtZW50LCBudWxsLCB0cnVlKSwgYiA9IG5ldyBkM19nZW9fY2xpcFBvbHlnb25JbnRlcnNlY3Rpb24ocDAsIG51bGwsIGEsIGZhbHNlKTtcbiAgICAgIGEubyA9IGI7XG4gICAgICBzdWJqZWN0LnB1c2goYSk7XG4gICAgICBjbGlwLnB1c2goYik7XG4gICAgICBhID0gbmV3IGQzX2dlb19jbGlwUG9seWdvbkludGVyc2VjdGlvbihwMSwgc2VnbWVudCwgbnVsbCwgZmFsc2UpO1xuICAgICAgYiA9IG5ldyBkM19nZW9fY2xpcFBvbHlnb25JbnRlcnNlY3Rpb24ocDEsIG51bGwsIGEsIHRydWUpO1xuICAgICAgYS5vID0gYjtcbiAgICAgIHN1YmplY3QucHVzaChhKTtcbiAgICAgIGNsaXAucHVzaChiKTtcbiAgICB9KTtcbiAgICBjbGlwLnNvcnQoY29tcGFyZSk7XG4gICAgZDNfZ2VvX2NsaXBQb2x5Z29uTGlua0NpcmN1bGFyKHN1YmplY3QpO1xuICAgIGQzX2dlb19jbGlwUG9seWdvbkxpbmtDaXJjdWxhcihjbGlwKTtcbiAgICBpZiAoIXN1YmplY3QubGVuZ3RoKSByZXR1cm47XG4gICAgZm9yICh2YXIgaSA9IDAsIGVudHJ5ID0gY2xpcFN0YXJ0SW5zaWRlLCBuID0gY2xpcC5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIGNsaXBbaV0uZSA9IGVudHJ5ID0gIWVudHJ5O1xuICAgIH1cbiAgICB2YXIgc3RhcnQgPSBzdWJqZWN0WzBdLCBwb2ludHMsIHBvaW50O1xuICAgIHdoaWxlICgxKSB7XG4gICAgICB2YXIgY3VycmVudCA9IHN0YXJ0LCBpc1N1YmplY3QgPSB0cnVlO1xuICAgICAgd2hpbGUgKGN1cnJlbnQudikgaWYgKChjdXJyZW50ID0gY3VycmVudC5uKSA9PT0gc3RhcnQpIHJldHVybjtcbiAgICAgIHBvaW50cyA9IGN1cnJlbnQuejtcbiAgICAgIGxpc3RlbmVyLmxpbmVTdGFydCgpO1xuICAgICAgZG8ge1xuICAgICAgICBjdXJyZW50LnYgPSBjdXJyZW50Lm8udiA9IHRydWU7XG4gICAgICAgIGlmIChjdXJyZW50LmUpIHtcbiAgICAgICAgICBpZiAoaXNTdWJqZWN0KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHBvaW50cy5sZW5ndGg7IGkgPCBuOyArK2kpIGxpc3RlbmVyLnBvaW50KChwb2ludCA9IHBvaW50c1tpXSlbMF0sIHBvaW50WzFdKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW50ZXJwb2xhdGUoY3VycmVudC54LCBjdXJyZW50Lm4ueCwgMSwgbGlzdGVuZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5uO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChpc1N1YmplY3QpIHtcbiAgICAgICAgICAgIHBvaW50cyA9IGN1cnJlbnQucC56O1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IHBvaW50cy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkgbGlzdGVuZXIucG9pbnQoKHBvaW50ID0gcG9pbnRzW2ldKVswXSwgcG9pbnRbMV0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnRlcnBvbGF0ZShjdXJyZW50LngsIGN1cnJlbnQucC54LCAtMSwgbGlzdGVuZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5wO1xuICAgICAgICB9XG4gICAgICAgIGN1cnJlbnQgPSBjdXJyZW50Lm87XG4gICAgICAgIHBvaW50cyA9IGN1cnJlbnQuejtcbiAgICAgICAgaXNTdWJqZWN0ID0gIWlzU3ViamVjdDtcbiAgICAgIH0gd2hpbGUgKCFjdXJyZW50LnYpO1xuICAgICAgbGlzdGVuZXIubGluZUVuZCgpO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fY2xpcFBvbHlnb25MaW5rQ2lyY3VsYXIoYXJyYXkpIHtcbiAgICBpZiAoIShuID0gYXJyYXkubGVuZ3RoKSkgcmV0dXJuO1xuICAgIHZhciBuLCBpID0gMCwgYSA9IGFycmF5WzBdLCBiO1xuICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICBhLm4gPSBiID0gYXJyYXlbaV07XG4gICAgICBiLnAgPSBhO1xuICAgICAgYSA9IGI7XG4gICAgfVxuICAgIGEubiA9IGIgPSBhcnJheVswXTtcbiAgICBiLnAgPSBhO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19jbGlwUG9seWdvbkludGVyc2VjdGlvbihwb2ludCwgcG9pbnRzLCBvdGhlciwgZW50cnkpIHtcbiAgICB0aGlzLnggPSBwb2ludDtcbiAgICB0aGlzLnogPSBwb2ludHM7XG4gICAgdGhpcy5vID0gb3RoZXI7XG4gICAgdGhpcy5lID0gZW50cnk7XG4gICAgdGhpcy52ID0gZmFsc2U7XG4gICAgdGhpcy5uID0gdGhpcy5wID0gbnVsbDtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fY2xpcChwb2ludFZpc2libGUsIGNsaXBMaW5lLCBpbnRlcnBvbGF0ZSwgY2xpcFN0YXJ0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHJvdGF0ZSwgbGlzdGVuZXIpIHtcbiAgICAgIHZhciBsaW5lID0gY2xpcExpbmUobGlzdGVuZXIpLCByb3RhdGVkQ2xpcFN0YXJ0ID0gcm90YXRlLmludmVydChjbGlwU3RhcnRbMF0sIGNsaXBTdGFydFsxXSk7XG4gICAgICB2YXIgY2xpcCA9IHtcbiAgICAgICAgcG9pbnQ6IHBvaW50LFxuICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgbGluZUVuZDogbGluZUVuZCxcbiAgICAgICAgcG9seWdvblN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjbGlwLnBvaW50ID0gcG9pbnRSaW5nO1xuICAgICAgICAgIGNsaXAubGluZVN0YXJ0ID0gcmluZ1N0YXJ0O1xuICAgICAgICAgIGNsaXAubGluZUVuZCA9IHJpbmdFbmQ7XG4gICAgICAgICAgc2VnbWVudHMgPSBbXTtcbiAgICAgICAgICBwb2x5Z29uID0gW107XG4gICAgICAgICAgbGlzdGVuZXIucG9seWdvblN0YXJ0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIHBvbHlnb25FbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNsaXAucG9pbnQgPSBwb2ludDtcbiAgICAgICAgICBjbGlwLmxpbmVTdGFydCA9IGxpbmVTdGFydDtcbiAgICAgICAgICBjbGlwLmxpbmVFbmQgPSBsaW5lRW5kO1xuICAgICAgICAgIHNlZ21lbnRzID0gZDMubWVyZ2Uoc2VnbWVudHMpO1xuICAgICAgICAgIHZhciBjbGlwU3RhcnRJbnNpZGUgPSBkM19nZW9fcG9pbnRJblBvbHlnb24ocm90YXRlZENsaXBTdGFydCwgcG9seWdvbik7XG4gICAgICAgICAgaWYgKHNlZ21lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgZDNfZ2VvX2NsaXBQb2x5Z29uKHNlZ21lbnRzLCBkM19nZW9fY2xpcFNvcnQsIGNsaXBTdGFydEluc2lkZSwgaW50ZXJwb2xhdGUsIGxpc3RlbmVyKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsaXBTdGFydEluc2lkZSkge1xuICAgICAgICAgICAgbGlzdGVuZXIubGluZVN0YXJ0KCk7XG4gICAgICAgICAgICBpbnRlcnBvbGF0ZShudWxsLCBudWxsLCAxLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICBsaXN0ZW5lci5saW5lRW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxpc3RlbmVyLnBvbHlnb25FbmQoKTtcbiAgICAgICAgICBzZWdtZW50cyA9IHBvbHlnb24gPSBudWxsO1xuICAgICAgICB9LFxuICAgICAgICBzcGhlcmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGxpc3RlbmVyLnBvbHlnb25TdGFydCgpO1xuICAgICAgICAgIGxpc3RlbmVyLmxpbmVTdGFydCgpO1xuICAgICAgICAgIGludGVycG9sYXRlKG51bGwsIG51bGwsIDEsIGxpc3RlbmVyKTtcbiAgICAgICAgICBsaXN0ZW5lci5saW5lRW5kKCk7XG4gICAgICAgICAgbGlzdGVuZXIucG9seWdvbkVuZCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgZnVuY3Rpb24gcG9pbnQozrssIM+GKSB7XG4gICAgICAgIHZhciBwb2ludCA9IHJvdGF0ZSjOuywgz4YpO1xuICAgICAgICBpZiAocG9pbnRWaXNpYmxlKM67ID0gcG9pbnRbMF0sIM+GID0gcG9pbnRbMV0pKSBsaXN0ZW5lci5wb2ludCjOuywgz4YpO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gcG9pbnRMaW5lKM67LCDPhikge1xuICAgICAgICB2YXIgcG9pbnQgPSByb3RhdGUozrssIM+GKTtcbiAgICAgICAgbGluZS5wb2ludChwb2ludFswXSwgcG9pbnRbMV0pO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gbGluZVN0YXJ0KCkge1xuICAgICAgICBjbGlwLnBvaW50ID0gcG9pbnRMaW5lO1xuICAgICAgICBsaW5lLmxpbmVTdGFydCgpO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gbGluZUVuZCgpIHtcbiAgICAgICAgY2xpcC5wb2ludCA9IHBvaW50O1xuICAgICAgICBsaW5lLmxpbmVFbmQoKTtcbiAgICAgIH1cbiAgICAgIHZhciBzZWdtZW50cztcbiAgICAgIHZhciBidWZmZXIgPSBkM19nZW9fY2xpcEJ1ZmZlckxpc3RlbmVyKCksIHJpbmdMaXN0ZW5lciA9IGNsaXBMaW5lKGJ1ZmZlciksIHBvbHlnb24sIHJpbmc7XG4gICAgICBmdW5jdGlvbiBwb2ludFJpbmcozrssIM+GKSB7XG4gICAgICAgIHJpbmcucHVzaChbIM67LCDPhiBdKTtcbiAgICAgICAgdmFyIHBvaW50ID0gcm90YXRlKM67LCDPhik7XG4gICAgICAgIHJpbmdMaXN0ZW5lci5wb2ludChwb2ludFswXSwgcG9pbnRbMV0pO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gcmluZ1N0YXJ0KCkge1xuICAgICAgICByaW5nTGlzdGVuZXIubGluZVN0YXJ0KCk7XG4gICAgICAgIHJpbmcgPSBbXTtcbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIHJpbmdFbmQoKSB7XG4gICAgICAgIHBvaW50UmluZyhyaW5nWzBdWzBdLCByaW5nWzBdWzFdKTtcbiAgICAgICAgcmluZ0xpc3RlbmVyLmxpbmVFbmQoKTtcbiAgICAgICAgdmFyIGNsZWFuID0gcmluZ0xpc3RlbmVyLmNsZWFuKCksIHJpbmdTZWdtZW50cyA9IGJ1ZmZlci5idWZmZXIoKSwgc2VnbWVudCwgbiA9IHJpbmdTZWdtZW50cy5sZW5ndGg7XG4gICAgICAgIHJpbmcucG9wKCk7XG4gICAgICAgIHBvbHlnb24ucHVzaChyaW5nKTtcbiAgICAgICAgcmluZyA9IG51bGw7XG4gICAgICAgIGlmICghbikgcmV0dXJuO1xuICAgICAgICBpZiAoY2xlYW4gJiAxKSB7XG4gICAgICAgICAgc2VnbWVudCA9IHJpbmdTZWdtZW50c1swXTtcbiAgICAgICAgICB2YXIgbiA9IHNlZ21lbnQubGVuZ3RoIC0gMSwgaSA9IC0xLCBwb2ludDtcbiAgICAgICAgICBsaXN0ZW5lci5saW5lU3RhcnQoKTtcbiAgICAgICAgICB3aGlsZSAoKytpIDwgbikgbGlzdGVuZXIucG9pbnQoKHBvaW50ID0gc2VnbWVudFtpXSlbMF0sIHBvaW50WzFdKTtcbiAgICAgICAgICBsaXN0ZW5lci5saW5lRW5kKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuID4gMSAmJiBjbGVhbiAmIDIpIHJpbmdTZWdtZW50cy5wdXNoKHJpbmdTZWdtZW50cy5wb3AoKS5jb25jYXQocmluZ1NlZ21lbnRzLnNoaWZ0KCkpKTtcbiAgICAgICAgc2VnbWVudHMucHVzaChyaW5nU2VnbWVudHMuZmlsdGVyKGQzX2dlb19jbGlwU2VnbWVudExlbmd0aDEpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjbGlwO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvX2NsaXBTZWdtZW50TGVuZ3RoMShzZWdtZW50KSB7XG4gICAgcmV0dXJuIHNlZ21lbnQubGVuZ3RoID4gMTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fY2xpcEJ1ZmZlckxpc3RlbmVyKCkge1xuICAgIHZhciBsaW5lcyA9IFtdLCBsaW5lO1xuICAgIHJldHVybiB7XG4gICAgICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBsaW5lcy5wdXNoKGxpbmUgPSBbXSk7XG4gICAgICB9LFxuICAgICAgcG9pbnQ6IGZ1bmN0aW9uKM67LCDPhikge1xuICAgICAgICBsaW5lLnB1c2goWyDOuywgz4YgXSk7XG4gICAgICB9LFxuICAgICAgbGluZUVuZDogZDNfbm9vcCxcbiAgICAgIGJ1ZmZlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBidWZmZXIgPSBsaW5lcztcbiAgICAgICAgbGluZXMgPSBbXTtcbiAgICAgICAgbGluZSA9IG51bGw7XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgICB9LFxuICAgICAgcmVqb2luOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA+IDEpIGxpbmVzLnB1c2gobGluZXMucG9wKCkuY29uY2F0KGxpbmVzLnNoaWZ0KCkpKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19jbGlwU29ydChhLCBiKSB7XG4gICAgcmV0dXJuICgoYSA9IGEueClbMF0gPCAwID8gYVsxXSAtIGhhbGbPgCAtIM61IDogaGFsZs+AIC0gYVsxXSkgLSAoKGIgPSBiLngpWzBdIDwgMCA/IGJbMV0gLSBoYWxmz4AgLSDOtSA6IGhhbGbPgCAtIGJbMV0pO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19wb2ludEluUG9seWdvbihwb2ludCwgcG9seWdvbikge1xuICAgIHZhciBtZXJpZGlhbiA9IHBvaW50WzBdLCBwYXJhbGxlbCA9IHBvaW50WzFdLCBtZXJpZGlhbk5vcm1hbCA9IFsgTWF0aC5zaW4obWVyaWRpYW4pLCAtTWF0aC5jb3MobWVyaWRpYW4pLCAwIF0sIHBvbGFyQW5nbGUgPSAwLCB3aW5kaW5nID0gMDtcbiAgICBkM19nZW9fYXJlYVJpbmdTdW0ucmVzZXQoKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IHBvbHlnb24ubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICB2YXIgcmluZyA9IHBvbHlnb25baV0sIG0gPSByaW5nLmxlbmd0aDtcbiAgICAgIGlmICghbSkgY29udGludWU7XG4gICAgICB2YXIgcG9pbnQwID0gcmluZ1swXSwgzrswID0gcG9pbnQwWzBdLCDPhjAgPSBwb2ludDBbMV0gLyAyICsgz4AgLyA0LCBzaW7PhjAgPSBNYXRoLnNpbijPhjApLCBjb3PPhjAgPSBNYXRoLmNvcyjPhjApLCBqID0gMTtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGlmIChqID09PSBtKSBqID0gMDtcbiAgICAgICAgcG9pbnQgPSByaW5nW2pdO1xuICAgICAgICB2YXIgzrsgPSBwb2ludFswXSwgz4YgPSBwb2ludFsxXSAvIDIgKyDPgCAvIDQsIHNpbs+GID0gTWF0aC5zaW4oz4YpLCBjb3PPhiA9IE1hdGguY29zKM+GKSwgZM67ID0gzrsgLSDOuzAsIGFudGltZXJpZGlhbiA9IGFicyhkzrspID4gz4AsIGsgPSBzaW7PhjAgKiBzaW7PhjtcbiAgICAgICAgZDNfZ2VvX2FyZWFSaW5nU3VtLmFkZChNYXRoLmF0YW4yKGsgKiBNYXRoLnNpbihkzrspLCBjb3PPhjAgKiBjb3PPhiArIGsgKiBNYXRoLmNvcyhkzrspKSk7XG4gICAgICAgIHBvbGFyQW5nbGUgKz0gYW50aW1lcmlkaWFuID8gZM67ICsgKGTOuyA+PSAwID8gz4QgOiAtz4QpIDogZM67O1xuICAgICAgICBpZiAoYW50aW1lcmlkaWFuIF4gzrswID49IG1lcmlkaWFuIF4gzrsgPj0gbWVyaWRpYW4pIHtcbiAgICAgICAgICB2YXIgYXJjID0gZDNfZ2VvX2NhcnRlc2lhbkNyb3NzKGQzX2dlb19jYXJ0ZXNpYW4ocG9pbnQwKSwgZDNfZ2VvX2NhcnRlc2lhbihwb2ludCkpO1xuICAgICAgICAgIGQzX2dlb19jYXJ0ZXNpYW5Ob3JtYWxpemUoYXJjKTtcbiAgICAgICAgICB2YXIgaW50ZXJzZWN0aW9uID0gZDNfZ2VvX2NhcnRlc2lhbkNyb3NzKG1lcmlkaWFuTm9ybWFsLCBhcmMpO1xuICAgICAgICAgIGQzX2dlb19jYXJ0ZXNpYW5Ob3JtYWxpemUoaW50ZXJzZWN0aW9uKTtcbiAgICAgICAgICB2YXIgz4ZhcmMgPSAoYW50aW1lcmlkaWFuIF4gZM67ID49IDAgPyAtMSA6IDEpICogZDNfYXNpbihpbnRlcnNlY3Rpb25bMl0pO1xuICAgICAgICAgIGlmIChwYXJhbGxlbCA+IM+GYXJjIHx8IHBhcmFsbGVsID09PSDPhmFyYyAmJiAoYXJjWzBdIHx8IGFyY1sxXSkpIHtcbiAgICAgICAgICAgIHdpbmRpbmcgKz0gYW50aW1lcmlkaWFuIF4gZM67ID49IDAgPyAxIDogLTE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghaisrKSBicmVhaztcbiAgICAgICAgzrswID0gzrssIHNpbs+GMCA9IHNpbs+GLCBjb3PPhjAgPSBjb3PPhiwgcG9pbnQwID0gcG9pbnQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAocG9sYXJBbmdsZSA8IC3OtSB8fCBwb2xhckFuZ2xlIDwgzrUgJiYgZDNfZ2VvX2FyZWFSaW5nU3VtIDwgMCkgXiB3aW5kaW5nICYgMTtcbiAgfVxuICB2YXIgZDNfZ2VvX2NsaXBBbnRpbWVyaWRpYW4gPSBkM19nZW9fY2xpcChkM190cnVlLCBkM19nZW9fY2xpcEFudGltZXJpZGlhbkxpbmUsIGQzX2dlb19jbGlwQW50aW1lcmlkaWFuSW50ZXJwb2xhdGUsIFsgLc+ALCAtz4AgLyAyIF0pO1xuICBmdW5jdGlvbiBkM19nZW9fY2xpcEFudGltZXJpZGlhbkxpbmUobGlzdGVuZXIpIHtcbiAgICB2YXIgzrswID0gTmFOLCDPhjAgPSBOYU4sIHPOuzAgPSBOYU4sIGNsZWFuO1xuICAgIHJldHVybiB7XG4gICAgICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBsaXN0ZW5lci5saW5lU3RhcnQoKTtcbiAgICAgICAgY2xlYW4gPSAxO1xuICAgICAgfSxcbiAgICAgIHBvaW50OiBmdW5jdGlvbijOuzEsIM+GMSkge1xuICAgICAgICB2YXIgc867MSA9IM67MSA+IDAgPyDPgCA6IC3PgCwgZM67ID0gYWJzKM67MSAtIM67MCk7XG4gICAgICAgIGlmIChhYnMoZM67IC0gz4ApIDwgzrUpIHtcbiAgICAgICAgICBsaXN0ZW5lci5wb2ludCjOuzAsIM+GMCA9ICjPhjAgKyDPhjEpIC8gMiA+IDAgPyBoYWxmz4AgOiAtaGFsZs+AKTtcbiAgICAgICAgICBsaXN0ZW5lci5wb2ludChzzrswLCDPhjApO1xuICAgICAgICAgIGxpc3RlbmVyLmxpbmVFbmQoKTtcbiAgICAgICAgICBsaXN0ZW5lci5saW5lU3RhcnQoKTtcbiAgICAgICAgICBsaXN0ZW5lci5wb2ludChzzrsxLCDPhjApO1xuICAgICAgICAgIGxpc3RlbmVyLnBvaW50KM67MSwgz4YwKTtcbiAgICAgICAgICBjbGVhbiA9IDA7XG4gICAgICAgIH0gZWxzZSBpZiAoc867MCAhPT0gc867MSAmJiBkzrsgPj0gz4ApIHtcbiAgICAgICAgICBpZiAoYWJzKM67MCAtIHPOuzApIDwgzrUpIM67MCAtPSBzzrswICogzrU7XG4gICAgICAgICAgaWYgKGFicyjOuzEgLSBzzrsxKSA8IM61KSDOuzEgLT0gc867MSAqIM61O1xuICAgICAgICAgIM+GMCA9IGQzX2dlb19jbGlwQW50aW1lcmlkaWFuSW50ZXJzZWN0KM67MCwgz4YwLCDOuzEsIM+GMSk7XG4gICAgICAgICAgbGlzdGVuZXIucG9pbnQoc867MCwgz4YwKTtcbiAgICAgICAgICBsaXN0ZW5lci5saW5lRW5kKCk7XG4gICAgICAgICAgbGlzdGVuZXIubGluZVN0YXJ0KCk7XG4gICAgICAgICAgbGlzdGVuZXIucG9pbnQoc867MSwgz4YwKTtcbiAgICAgICAgICBjbGVhbiA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdGVuZXIucG9pbnQozrswID0gzrsxLCDPhjAgPSDPhjEpO1xuICAgICAgICBzzrswID0gc867MTtcbiAgICAgIH0sXG4gICAgICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbGlzdGVuZXIubGluZUVuZCgpO1xuICAgICAgICDOuzAgPSDPhjAgPSBOYU47XG4gICAgICB9LFxuICAgICAgY2xlYW46IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gMiAtIGNsZWFuO1xuICAgICAgfVxuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvX2NsaXBBbnRpbWVyaWRpYW5JbnRlcnNlY3QozrswLCDPhjAsIM67MSwgz4YxKSB7XG4gICAgdmFyIGNvc8+GMCwgY29zz4YxLCBzaW7OuzBfzrsxID0gTWF0aC5zaW4ozrswIC0gzrsxKTtcbiAgICByZXR1cm4gYWJzKHNpbs67MF/OuzEpID4gzrUgPyBNYXRoLmF0YW4oKE1hdGguc2luKM+GMCkgKiAoY29zz4YxID0gTWF0aC5jb3Moz4YxKSkgKiBNYXRoLnNpbijOuzEpIC0gTWF0aC5zaW4oz4YxKSAqIChjb3PPhjAgPSBNYXRoLmNvcyjPhjApKSAqIE1hdGguc2luKM67MCkpIC8gKGNvc8+GMCAqIGNvc8+GMSAqIHNpbs67MF/OuzEpKSA6ICjPhjAgKyDPhjEpIC8gMjtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fY2xpcEFudGltZXJpZGlhbkludGVycG9sYXRlKGZyb20sIHRvLCBkaXJlY3Rpb24sIGxpc3RlbmVyKSB7XG4gICAgdmFyIM+GO1xuICAgIGlmIChmcm9tID09IG51bGwpIHtcbiAgICAgIM+GID0gZGlyZWN0aW9uICogaGFsZs+AO1xuICAgICAgbGlzdGVuZXIucG9pbnQoLc+ALCDPhik7XG4gICAgICBsaXN0ZW5lci5wb2ludCgwLCDPhik7XG4gICAgICBsaXN0ZW5lci5wb2ludCjPgCwgz4YpO1xuICAgICAgbGlzdGVuZXIucG9pbnQoz4AsIDApO1xuICAgICAgbGlzdGVuZXIucG9pbnQoz4AsIC3Phik7XG4gICAgICBsaXN0ZW5lci5wb2ludCgwLCAtz4YpO1xuICAgICAgbGlzdGVuZXIucG9pbnQoLc+ALCAtz4YpO1xuICAgICAgbGlzdGVuZXIucG9pbnQoLc+ALCAwKTtcbiAgICAgIGxpc3RlbmVyLnBvaW50KC3PgCwgz4YpO1xuICAgIH0gZWxzZSBpZiAoYWJzKGZyb21bMF0gLSB0b1swXSkgPiDOtSkge1xuICAgICAgdmFyIHMgPSBmcm9tWzBdIDwgdG9bMF0gPyDPgCA6IC3PgDtcbiAgICAgIM+GID0gZGlyZWN0aW9uICogcyAvIDI7XG4gICAgICBsaXN0ZW5lci5wb2ludCgtcywgz4YpO1xuICAgICAgbGlzdGVuZXIucG9pbnQoMCwgz4YpO1xuICAgICAgbGlzdGVuZXIucG9pbnQocywgz4YpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0ZW5lci5wb2ludCh0b1swXSwgdG9bMV0pO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fY2xpcENpcmNsZShyYWRpdXMpIHtcbiAgICB2YXIgY3IgPSBNYXRoLmNvcyhyYWRpdXMpLCBzbWFsbFJhZGl1cyA9IGNyID4gMCwgbm90SGVtaXNwaGVyZSA9IGFicyhjcikgPiDOtSwgaW50ZXJwb2xhdGUgPSBkM19nZW9fY2lyY2xlSW50ZXJwb2xhdGUocmFkaXVzLCA2ICogZDNfcmFkaWFucyk7XG4gICAgcmV0dXJuIGQzX2dlb19jbGlwKHZpc2libGUsIGNsaXBMaW5lLCBpbnRlcnBvbGF0ZSwgc21hbGxSYWRpdXMgPyBbIDAsIC1yYWRpdXMgXSA6IFsgLc+ALCByYWRpdXMgLSDPgCBdKTtcbiAgICBmdW5jdGlvbiB2aXNpYmxlKM67LCDPhikge1xuICAgICAgcmV0dXJuIE1hdGguY29zKM67KSAqIE1hdGguY29zKM+GKSA+IGNyO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjbGlwTGluZShsaXN0ZW5lcikge1xuICAgICAgdmFyIHBvaW50MCwgYzAsIHYwLCB2MDAsIGNsZWFuO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2MDAgPSB2MCA9IGZhbHNlO1xuICAgICAgICAgIGNsZWFuID0gMTtcbiAgICAgICAgfSxcbiAgICAgICAgcG9pbnQ6IGZ1bmN0aW9uKM67LCDPhikge1xuICAgICAgICAgIHZhciBwb2ludDEgPSBbIM67LCDPhiBdLCBwb2ludDIsIHYgPSB2aXNpYmxlKM67LCDPhiksIGMgPSBzbWFsbFJhZGl1cyA/IHYgPyAwIDogY29kZSjOuywgz4YpIDogdiA/IGNvZGUozrsgKyAozrsgPCAwID8gz4AgOiAtz4ApLCDPhikgOiAwO1xuICAgICAgICAgIGlmICghcG9pbnQwICYmICh2MDAgPSB2MCA9IHYpKSBsaXN0ZW5lci5saW5lU3RhcnQoKTtcbiAgICAgICAgICBpZiAodiAhPT0gdjApIHtcbiAgICAgICAgICAgIHBvaW50MiA9IGludGVyc2VjdChwb2ludDAsIHBvaW50MSk7XG4gICAgICAgICAgICBpZiAoZDNfZ2VvX3NwaGVyaWNhbEVxdWFsKHBvaW50MCwgcG9pbnQyKSB8fCBkM19nZW9fc3BoZXJpY2FsRXF1YWwocG9pbnQxLCBwb2ludDIpKSB7XG4gICAgICAgICAgICAgIHBvaW50MVswXSArPSDOtTtcbiAgICAgICAgICAgICAgcG9pbnQxWzFdICs9IM61O1xuICAgICAgICAgICAgICB2ID0gdmlzaWJsZShwb2ludDFbMF0sIHBvaW50MVsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2ICE9PSB2MCkge1xuICAgICAgICAgICAgY2xlYW4gPSAwO1xuICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgbGlzdGVuZXIubGluZVN0YXJ0KCk7XG4gICAgICAgICAgICAgIHBvaW50MiA9IGludGVyc2VjdChwb2ludDEsIHBvaW50MCk7XG4gICAgICAgICAgICAgIGxpc3RlbmVyLnBvaW50KHBvaW50MlswXSwgcG9pbnQyWzFdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBvaW50MiA9IGludGVyc2VjdChwb2ludDAsIHBvaW50MSk7XG4gICAgICAgICAgICAgIGxpc3RlbmVyLnBvaW50KHBvaW50MlswXSwgcG9pbnQyWzFdKTtcbiAgICAgICAgICAgICAgbGlzdGVuZXIubGluZUVuZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcG9pbnQwID0gcG9pbnQyO1xuICAgICAgICAgIH0gZWxzZSBpZiAobm90SGVtaXNwaGVyZSAmJiBwb2ludDAgJiYgc21hbGxSYWRpdXMgXiB2KSB7XG4gICAgICAgICAgICB2YXIgdDtcbiAgICAgICAgICAgIGlmICghKGMgJiBjMCkgJiYgKHQgPSBpbnRlcnNlY3QocG9pbnQxLCBwb2ludDAsIHRydWUpKSkge1xuICAgICAgICAgICAgICBjbGVhbiA9IDA7XG4gICAgICAgICAgICAgIGlmIChzbWFsbFJhZGl1cykge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmxpbmVTdGFydCgpO1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLnBvaW50KHRbMF1bMF0sIHRbMF1bMV0pO1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLnBvaW50KHRbMV1bMF0sIHRbMV1bMV0pO1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmxpbmVFbmQoKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lci5wb2ludCh0WzFdWzBdLCB0WzFdWzFdKTtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lci5saW5lRW5kKCk7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIubGluZVN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIucG9pbnQodFswXVswXSwgdFswXVsxXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHYgJiYgKCFwb2ludDAgfHwgIWQzX2dlb19zcGhlcmljYWxFcXVhbChwb2ludDAsIHBvaW50MSkpKSB7XG4gICAgICAgICAgICBsaXN0ZW5lci5wb2ludChwb2ludDFbMF0sIHBvaW50MVsxXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBvaW50MCA9IHBvaW50MSwgdjAgPSB2LCBjMCA9IGM7XG4gICAgICAgIH0sXG4gICAgICAgIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICh2MCkgbGlzdGVuZXIubGluZUVuZCgpO1xuICAgICAgICAgIHBvaW50MCA9IG51bGw7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gY2xlYW4gfCAodjAwICYmIHYwKSA8PCAxO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbnRlcnNlY3QoYSwgYiwgdHdvKSB7XG4gICAgICB2YXIgcGEgPSBkM19nZW9fY2FydGVzaWFuKGEpLCBwYiA9IGQzX2dlb19jYXJ0ZXNpYW4oYik7XG4gICAgICB2YXIgbjEgPSBbIDEsIDAsIDAgXSwgbjIgPSBkM19nZW9fY2FydGVzaWFuQ3Jvc3MocGEsIHBiKSwgbjJuMiA9IGQzX2dlb19jYXJ0ZXNpYW5Eb3QobjIsIG4yKSwgbjFuMiA9IG4yWzBdLCBkZXRlcm1pbmFudCA9IG4ybjIgLSBuMW4yICogbjFuMjtcbiAgICAgIGlmICghZGV0ZXJtaW5hbnQpIHJldHVybiAhdHdvICYmIGE7XG4gICAgICB2YXIgYzEgPSBjciAqIG4ybjIgLyBkZXRlcm1pbmFudCwgYzIgPSAtY3IgKiBuMW4yIC8gZGV0ZXJtaW5hbnQsIG4xeG4yID0gZDNfZ2VvX2NhcnRlc2lhbkNyb3NzKG4xLCBuMiksIEEgPSBkM19nZW9fY2FydGVzaWFuU2NhbGUobjEsIGMxKSwgQiA9IGQzX2dlb19jYXJ0ZXNpYW5TY2FsZShuMiwgYzIpO1xuICAgICAgZDNfZ2VvX2NhcnRlc2lhbkFkZChBLCBCKTtcbiAgICAgIHZhciB1ID0gbjF4bjIsIHcgPSBkM19nZW9fY2FydGVzaWFuRG90KEEsIHUpLCB1dSA9IGQzX2dlb19jYXJ0ZXNpYW5Eb3QodSwgdSksIHQyID0gdyAqIHcgLSB1dSAqIChkM19nZW9fY2FydGVzaWFuRG90KEEsIEEpIC0gMSk7XG4gICAgICBpZiAodDIgPCAwKSByZXR1cm47XG4gICAgICB2YXIgdCA9IE1hdGguc3FydCh0MiksIHEgPSBkM19nZW9fY2FydGVzaWFuU2NhbGUodSwgKC13IC0gdCkgLyB1dSk7XG4gICAgICBkM19nZW9fY2FydGVzaWFuQWRkKHEsIEEpO1xuICAgICAgcSA9IGQzX2dlb19zcGhlcmljYWwocSk7XG4gICAgICBpZiAoIXR3bykgcmV0dXJuIHE7XG4gICAgICB2YXIgzrswID0gYVswXSwgzrsxID0gYlswXSwgz4YwID0gYVsxXSwgz4YxID0gYlsxXSwgejtcbiAgICAgIGlmICjOuzEgPCDOuzApIHogPSDOuzAsIM67MCA9IM67MSwgzrsxID0gejtcbiAgICAgIHZhciDOtM67ID0gzrsxIC0gzrswLCBwb2xhciA9IGFicyjOtM67IC0gz4ApIDwgzrUsIG1lcmlkaWFuID0gcG9sYXIgfHwgzrTOuyA8IM61O1xuICAgICAgaWYgKCFwb2xhciAmJiDPhjEgPCDPhjApIHogPSDPhjAsIM+GMCA9IM+GMSwgz4YxID0gejtcbiAgICAgIGlmIChtZXJpZGlhbiA/IHBvbGFyID8gz4YwICsgz4YxID4gMCBeIHFbMV0gPCAoYWJzKHFbMF0gLSDOuzApIDwgzrUgPyDPhjAgOiDPhjEpIDogz4YwIDw9IHFbMV0gJiYgcVsxXSA8PSDPhjEgOiDOtM67ID4gz4AgXiAozrswIDw9IHFbMF0gJiYgcVswXSA8PSDOuzEpKSB7XG4gICAgICAgIHZhciBxMSA9IGQzX2dlb19jYXJ0ZXNpYW5TY2FsZSh1LCAoLXcgKyB0KSAvIHV1KTtcbiAgICAgICAgZDNfZ2VvX2NhcnRlc2lhbkFkZChxMSwgQSk7XG4gICAgICAgIHJldHVybiBbIHEsIGQzX2dlb19zcGhlcmljYWwocTEpIF07XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNvZGUozrssIM+GKSB7XG4gICAgICB2YXIgciA9IHNtYWxsUmFkaXVzID8gcmFkaXVzIDogz4AgLSByYWRpdXMsIGNvZGUgPSAwO1xuICAgICAgaWYgKM67IDwgLXIpIGNvZGUgfD0gMTsgZWxzZSBpZiAozrsgPiByKSBjb2RlIHw9IDI7XG4gICAgICBpZiAoz4YgPCAtcikgY29kZSB8PSA0OyBlbHNlIGlmICjPhiA+IHIpIGNvZGUgfD0gODtcbiAgICAgIHJldHVybiBjb2RlO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX2NsaXBMaW5lKHgwLCB5MCwgeDEsIHkxKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBhID0gbGluZS5hLCBiID0gbGluZS5iLCBheCA9IGEueCwgYXkgPSBhLnksIGJ4ID0gYi54LCBieSA9IGIueSwgdDAgPSAwLCB0MSA9IDEsIGR4ID0gYnggLSBheCwgZHkgPSBieSAtIGF5LCByO1xuICAgICAgciA9IHgwIC0gYXg7XG4gICAgICBpZiAoIWR4ICYmIHIgPiAwKSByZXR1cm47XG4gICAgICByIC89IGR4O1xuICAgICAgaWYgKGR4IDwgMCkge1xuICAgICAgICBpZiAociA8IHQwKSByZXR1cm47XG4gICAgICAgIGlmIChyIDwgdDEpIHQxID0gcjtcbiAgICAgIH0gZWxzZSBpZiAoZHggPiAwKSB7XG4gICAgICAgIGlmIChyID4gdDEpIHJldHVybjtcbiAgICAgICAgaWYgKHIgPiB0MCkgdDAgPSByO1xuICAgICAgfVxuICAgICAgciA9IHgxIC0gYXg7XG4gICAgICBpZiAoIWR4ICYmIHIgPCAwKSByZXR1cm47XG4gICAgICByIC89IGR4O1xuICAgICAgaWYgKGR4IDwgMCkge1xuICAgICAgICBpZiAociA+IHQxKSByZXR1cm47XG4gICAgICAgIGlmIChyID4gdDApIHQwID0gcjtcbiAgICAgIH0gZWxzZSBpZiAoZHggPiAwKSB7XG4gICAgICAgIGlmIChyIDwgdDApIHJldHVybjtcbiAgICAgICAgaWYgKHIgPCB0MSkgdDEgPSByO1xuICAgICAgfVxuICAgICAgciA9IHkwIC0gYXk7XG4gICAgICBpZiAoIWR5ICYmIHIgPiAwKSByZXR1cm47XG4gICAgICByIC89IGR5O1xuICAgICAgaWYgKGR5IDwgMCkge1xuICAgICAgICBpZiAociA8IHQwKSByZXR1cm47XG4gICAgICAgIGlmIChyIDwgdDEpIHQxID0gcjtcbiAgICAgIH0gZWxzZSBpZiAoZHkgPiAwKSB7XG4gICAgICAgIGlmIChyID4gdDEpIHJldHVybjtcbiAgICAgICAgaWYgKHIgPiB0MCkgdDAgPSByO1xuICAgICAgfVxuICAgICAgciA9IHkxIC0gYXk7XG4gICAgICBpZiAoIWR5ICYmIHIgPCAwKSByZXR1cm47XG4gICAgICByIC89IGR5O1xuICAgICAgaWYgKGR5IDwgMCkge1xuICAgICAgICBpZiAociA+IHQxKSByZXR1cm47XG4gICAgICAgIGlmIChyID4gdDApIHQwID0gcjtcbiAgICAgIH0gZWxzZSBpZiAoZHkgPiAwKSB7XG4gICAgICAgIGlmIChyIDwgdDApIHJldHVybjtcbiAgICAgICAgaWYgKHIgPCB0MSkgdDEgPSByO1xuICAgICAgfVxuICAgICAgaWYgKHQwID4gMCkgbGluZS5hID0ge1xuICAgICAgICB4OiBheCArIHQwICogZHgsXG4gICAgICAgIHk6IGF5ICsgdDAgKiBkeVxuICAgICAgfTtcbiAgICAgIGlmICh0MSA8IDEpIGxpbmUuYiA9IHtcbiAgICAgICAgeDogYXggKyB0MSAqIGR4LFxuICAgICAgICB5OiBheSArIHQxICogZHlcbiAgICAgIH07XG4gICAgICByZXR1cm4gbGluZTtcbiAgICB9O1xuICB9XG4gIHZhciBkM19nZW9fY2xpcEV4dGVudE1BWCA9IDFlOTtcbiAgZDMuZ2VvLmNsaXBFeHRlbnQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgeDAsIHkwLCB4MSwgeTEsIHN0cmVhbSwgY2xpcCwgY2xpcEV4dGVudCA9IHtcbiAgICAgIHN0cmVhbTogZnVuY3Rpb24ob3V0cHV0KSB7XG4gICAgICAgIGlmIChzdHJlYW0pIHN0cmVhbS52YWxpZCA9IGZhbHNlO1xuICAgICAgICBzdHJlYW0gPSBjbGlwKG91dHB1dCk7XG4gICAgICAgIHN0cmVhbS52YWxpZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBzdHJlYW07XG4gICAgICB9LFxuICAgICAgZXh0ZW50OiBmdW5jdGlvbihfKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIFsgWyB4MCwgeTAgXSwgWyB4MSwgeTEgXSBdO1xuICAgICAgICBjbGlwID0gZDNfZ2VvX2NsaXBFeHRlbnQoeDAgPSArX1swXVswXSwgeTAgPSArX1swXVsxXSwgeDEgPSArX1sxXVswXSwgeTEgPSArX1sxXVsxXSk7XG4gICAgICAgIGlmIChzdHJlYW0pIHN0cmVhbS52YWxpZCA9IGZhbHNlLCBzdHJlYW0gPSBudWxsO1xuICAgICAgICByZXR1cm4gY2xpcEV4dGVudDtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBjbGlwRXh0ZW50LmV4dGVudChbIFsgMCwgMCBdLCBbIDk2MCwgNTAwIF0gXSk7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2dlb19jbGlwRXh0ZW50KHgwLCB5MCwgeDEsIHkxKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgICB2YXIgbGlzdGVuZXJfID0gbGlzdGVuZXIsIGJ1ZmZlckxpc3RlbmVyID0gZDNfZ2VvX2NsaXBCdWZmZXJMaXN0ZW5lcigpLCBjbGlwTGluZSA9IGQzX2dlb21fY2xpcExpbmUoeDAsIHkwLCB4MSwgeTEpLCBzZWdtZW50cywgcG9seWdvbiwgcmluZztcbiAgICAgIHZhciBjbGlwID0ge1xuICAgICAgICBwb2ludDogcG9pbnQsXG4gICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICBsaW5lRW5kOiBsaW5lRW5kLFxuICAgICAgICBwb2x5Z29uU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGxpc3RlbmVyID0gYnVmZmVyTGlzdGVuZXI7XG4gICAgICAgICAgc2VnbWVudHMgPSBbXTtcbiAgICAgICAgICBwb2x5Z29uID0gW107XG4gICAgICAgICAgY2xlYW4gPSB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBwb2x5Z29uRW5kOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBsaXN0ZW5lciA9IGxpc3RlbmVyXztcbiAgICAgICAgICBzZWdtZW50cyA9IGQzLm1lcmdlKHNlZ21lbnRzKTtcbiAgICAgICAgICB2YXIgY2xpcFN0YXJ0SW5zaWRlID0gaW5zaWRlUG9seWdvbihbIHgwLCB5MSBdKSwgaW5zaWRlID0gY2xlYW4gJiYgY2xpcFN0YXJ0SW5zaWRlLCB2aXNpYmxlID0gc2VnbWVudHMubGVuZ3RoO1xuICAgICAgICAgIGlmIChpbnNpZGUgfHwgdmlzaWJsZSkge1xuICAgICAgICAgICAgbGlzdGVuZXIucG9seWdvblN0YXJ0KCk7XG4gICAgICAgICAgICBpZiAoaW5zaWRlKSB7XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpbmVTdGFydCgpO1xuICAgICAgICAgICAgICBpbnRlcnBvbGF0ZShudWxsLCBudWxsLCAxLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpbmVFbmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICAgICAgICAgIGQzX2dlb19jbGlwUG9seWdvbihzZWdtZW50cywgY29tcGFyZSwgY2xpcFN0YXJ0SW5zaWRlLCBpbnRlcnBvbGF0ZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGlzdGVuZXIucG9seWdvbkVuZCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZWdtZW50cyA9IHBvbHlnb24gPSByaW5nID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGZ1bmN0aW9uIGluc2lkZVBvbHlnb24ocCkge1xuICAgICAgICB2YXIgd24gPSAwLCBuID0gcG9seWdvbi5sZW5ndGgsIHkgPSBwWzFdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgICAgIGZvciAodmFyIGogPSAxLCB2ID0gcG9seWdvbltpXSwgbSA9IHYubGVuZ3RoLCBhID0gdlswXSwgYjsgaiA8IG07ICsraikge1xuICAgICAgICAgICAgYiA9IHZbal07XG4gICAgICAgICAgICBpZiAoYVsxXSA8PSB5KSB7XG4gICAgICAgICAgICAgIGlmIChiWzFdID4geSAmJiBkM19jcm9zczJkKGEsIGIsIHApID4gMCkgKyt3bjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmIChiWzFdIDw9IHkgJiYgZDNfY3Jvc3MyZChhLCBiLCBwKSA8IDApIC0td247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhID0gYjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHduICE9PSAwO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gaW50ZXJwb2xhdGUoZnJvbSwgdG8sIGRpcmVjdGlvbiwgbGlzdGVuZXIpIHtcbiAgICAgICAgdmFyIGEgPSAwLCBhMSA9IDA7XG4gICAgICAgIGlmIChmcm9tID09IG51bGwgfHwgKGEgPSBjb3JuZXIoZnJvbSwgZGlyZWN0aW9uKSkgIT09IChhMSA9IGNvcm5lcih0bywgZGlyZWN0aW9uKSkgfHwgY29tcGFyZVBvaW50cyhmcm9tLCB0bykgPCAwIF4gZGlyZWN0aW9uID4gMCkge1xuICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgIGxpc3RlbmVyLnBvaW50KGEgPT09IDAgfHwgYSA9PT0gMyA/IHgwIDogeDEsIGEgPiAxID8geTEgOiB5MCk7XG4gICAgICAgICAgfSB3aGlsZSAoKGEgPSAoYSArIGRpcmVjdGlvbiArIDQpICUgNCkgIT09IGExKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaXN0ZW5lci5wb2ludCh0b1swXSwgdG9bMV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBwb2ludFZpc2libGUoeCwgeSkge1xuICAgICAgICByZXR1cm4geDAgPD0geCAmJiB4IDw9IHgxICYmIHkwIDw9IHkgJiYgeSA8PSB5MTtcbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIHBvaW50KHgsIHkpIHtcbiAgICAgICAgaWYgKHBvaW50VmlzaWJsZSh4LCB5KSkgbGlzdGVuZXIucG9pbnQoeCwgeSk7XG4gICAgICB9XG4gICAgICB2YXIgeF9fLCB5X18sIHZfXywgeF8sIHlfLCB2XywgZmlyc3QsIGNsZWFuO1xuICAgICAgZnVuY3Rpb24gbGluZVN0YXJ0KCkge1xuICAgICAgICBjbGlwLnBvaW50ID0gbGluZVBvaW50O1xuICAgICAgICBpZiAocG9seWdvbikgcG9seWdvbi5wdXNoKHJpbmcgPSBbXSk7XG4gICAgICAgIGZpcnN0ID0gdHJ1ZTtcbiAgICAgICAgdl8gPSBmYWxzZTtcbiAgICAgICAgeF8gPSB5XyA9IE5hTjtcbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIGxpbmVFbmQoKSB7XG4gICAgICAgIGlmIChzZWdtZW50cykge1xuICAgICAgICAgIGxpbmVQb2ludCh4X18sIHlfXyk7XG4gICAgICAgICAgaWYgKHZfXyAmJiB2XykgYnVmZmVyTGlzdGVuZXIucmVqb2luKCk7XG4gICAgICAgICAgc2VnbWVudHMucHVzaChidWZmZXJMaXN0ZW5lci5idWZmZXIoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2xpcC5wb2ludCA9IHBvaW50O1xuICAgICAgICBpZiAodl8pIGxpc3RlbmVyLmxpbmVFbmQoKTtcbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIGxpbmVQb2ludCh4LCB5KSB7XG4gICAgICAgIHggPSBNYXRoLm1heCgtZDNfZ2VvX2NsaXBFeHRlbnRNQVgsIE1hdGgubWluKGQzX2dlb19jbGlwRXh0ZW50TUFYLCB4KSk7XG4gICAgICAgIHkgPSBNYXRoLm1heCgtZDNfZ2VvX2NsaXBFeHRlbnRNQVgsIE1hdGgubWluKGQzX2dlb19jbGlwRXh0ZW50TUFYLCB5KSk7XG4gICAgICAgIHZhciB2ID0gcG9pbnRWaXNpYmxlKHgsIHkpO1xuICAgICAgICBpZiAocG9seWdvbikgcmluZy5wdXNoKFsgeCwgeSBdKTtcbiAgICAgICAgaWYgKGZpcnN0KSB7XG4gICAgICAgICAgeF9fID0geCwgeV9fID0geSwgdl9fID0gdjtcbiAgICAgICAgICBmaXJzdCA9IGZhbHNlO1xuICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICBsaXN0ZW5lci5saW5lU3RhcnQoKTtcbiAgICAgICAgICAgIGxpc3RlbmVyLnBvaW50KHgsIHkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodiAmJiB2XykgbGlzdGVuZXIucG9pbnQoeCwgeSk7IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGwgPSB7XG4gICAgICAgICAgICAgIGE6IHtcbiAgICAgICAgICAgICAgICB4OiB4XyxcbiAgICAgICAgICAgICAgICB5OiB5X1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBiOiB7XG4gICAgICAgICAgICAgICAgeDogeCxcbiAgICAgICAgICAgICAgICB5OiB5XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoY2xpcExpbmUobCkpIHtcbiAgICAgICAgICAgICAgaWYgKCF2Xykge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmxpbmVTdGFydCgpO1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLnBvaW50KGwuYS54LCBsLmEueSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGlzdGVuZXIucG9pbnQobC5iLngsIGwuYi55KTtcbiAgICAgICAgICAgICAgaWYgKCF2KSBsaXN0ZW5lci5saW5lRW5kKCk7XG4gICAgICAgICAgICAgIGNsZWFuID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYpIHtcbiAgICAgICAgICAgICAgbGlzdGVuZXIubGluZVN0YXJ0KCk7XG4gICAgICAgICAgICAgIGxpc3RlbmVyLnBvaW50KHgsIHkpO1xuICAgICAgICAgICAgICBjbGVhbiA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB4XyA9IHgsIHlfID0geSwgdl8gPSB2O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNsaXA7XG4gICAgfTtcbiAgICBmdW5jdGlvbiBjb3JuZXIocCwgZGlyZWN0aW9uKSB7XG4gICAgICByZXR1cm4gYWJzKHBbMF0gLSB4MCkgPCDOtSA/IGRpcmVjdGlvbiA+IDAgPyAwIDogMyA6IGFicyhwWzBdIC0geDEpIDwgzrUgPyBkaXJlY3Rpb24gPiAwID8gMiA6IDEgOiBhYnMocFsxXSAtIHkwKSA8IM61ID8gZGlyZWN0aW9uID4gMCA/IDEgOiAwIDogZGlyZWN0aW9uID4gMCA/IDMgOiAyO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjb21wYXJlKGEsIGIpIHtcbiAgICAgIHJldHVybiBjb21wYXJlUG9pbnRzKGEueCwgYi54KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gY29tcGFyZVBvaW50cyhhLCBiKSB7XG4gICAgICB2YXIgY2EgPSBjb3JuZXIoYSwgMSksIGNiID0gY29ybmVyKGIsIDEpO1xuICAgICAgcmV0dXJuIGNhICE9PSBjYiA/IGNhIC0gY2IgOiBjYSA9PT0gMCA/IGJbMV0gLSBhWzFdIDogY2EgPT09IDEgPyBhWzBdIC0gYlswXSA6IGNhID09PSAyID8gYVsxXSAtIGJbMV0gOiBiWzBdIC0gYVswXTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvX2NvbXBvc2UoYSwgYikge1xuICAgIGZ1bmN0aW9uIGNvbXBvc2UoeCwgeSkge1xuICAgICAgcmV0dXJuIHggPSBhKHgsIHkpLCBiKHhbMF0sIHhbMV0pO1xuICAgIH1cbiAgICBpZiAoYS5pbnZlcnQgJiYgYi5pbnZlcnQpIGNvbXBvc2UuaW52ZXJ0ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgICAgcmV0dXJuIHggPSBiLmludmVydCh4LCB5KSwgeCAmJiBhLmludmVydCh4WzBdLCB4WzFdKTtcbiAgICB9O1xuICAgIHJldHVybiBjb21wb3NlO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19jb25pYyhwcm9qZWN0QXQpIHtcbiAgICB2YXIgz4YwID0gMCwgz4YxID0gz4AgLyAzLCBtID0gZDNfZ2VvX3Byb2plY3Rpb25NdXRhdG9yKHByb2plY3RBdCksIHAgPSBtKM+GMCwgz4YxKTtcbiAgICBwLnBhcmFsbGVscyA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIFsgz4YwIC8gz4AgKiAxODAsIM+GMSAvIM+AICogMTgwIF07XG4gICAgICByZXR1cm4gbSjPhjAgPSBfWzBdICogz4AgLyAxODAsIM+GMSA9IF9bMV0gKiDPgCAvIDE4MCk7XG4gICAgfTtcbiAgICByZXR1cm4gcDtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fY29uaWNFcXVhbEFyZWEoz4YwLCDPhjEpIHtcbiAgICB2YXIgc2luz4YwID0gTWF0aC5zaW4oz4YwKSwgbiA9IChzaW7PhjAgKyBNYXRoLnNpbijPhjEpKSAvIDIsIEMgPSAxICsgc2luz4YwICogKDIgKiBuIC0gc2luz4YwKSwgz4EwID0gTWF0aC5zcXJ0KEMpIC8gbjtcbiAgICBmdW5jdGlvbiBmb3J3YXJkKM67LCDPhikge1xuICAgICAgdmFyIM+BID0gTWF0aC5zcXJ0KEMgLSAyICogbiAqIE1hdGguc2luKM+GKSkgLyBuO1xuICAgICAgcmV0dXJuIFsgz4EgKiBNYXRoLnNpbijOuyAqPSBuKSwgz4EwIC0gz4EgKiBNYXRoLmNvcyjOuykgXTtcbiAgICB9XG4gICAgZm9yd2FyZC5pbnZlcnQgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICB2YXIgz4EwX3kgPSDPgTAgLSB5O1xuICAgICAgcmV0dXJuIFsgTWF0aC5hdGFuMih4LCDPgTBfeSkgLyBuLCBkM19hc2luKChDIC0gKHggKiB4ICsgz4EwX3kgKiDPgTBfeSkgKiBuICogbikgLyAoMiAqIG4pKSBdO1xuICAgIH07XG4gICAgcmV0dXJuIGZvcndhcmQ7XG4gIH1cbiAgKGQzLmdlby5jb25pY0VxdWFsQXJlYSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkM19nZW9fY29uaWMoZDNfZ2VvX2NvbmljRXF1YWxBcmVhKTtcbiAgfSkucmF3ID0gZDNfZ2VvX2NvbmljRXF1YWxBcmVhO1xuICBkMy5nZW8uYWxiZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzLmdlby5jb25pY0VxdWFsQXJlYSgpLnJvdGF0ZShbIDk2LCAwIF0pLmNlbnRlcihbIC0uNiwgMzguNyBdKS5wYXJhbGxlbHMoWyAyOS41LCA0NS41IF0pLnNjYWxlKDEwNzApO1xuICB9O1xuICBkMy5nZW8uYWxiZXJzVXNhID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxvd2VyNDggPSBkMy5nZW8uYWxiZXJzKCk7XG4gICAgdmFyIGFsYXNrYSA9IGQzLmdlby5jb25pY0VxdWFsQXJlYSgpLnJvdGF0ZShbIDE1NCwgMCBdKS5jZW50ZXIoWyAtMiwgNTguNSBdKS5wYXJhbGxlbHMoWyA1NSwgNjUgXSk7XG4gICAgdmFyIGhhd2FpaSA9IGQzLmdlby5jb25pY0VxdWFsQXJlYSgpLnJvdGF0ZShbIDE1NywgMCBdKS5jZW50ZXIoWyAtMywgMTkuOSBdKS5wYXJhbGxlbHMoWyA4LCAxOCBdKTtcbiAgICB2YXIgcG9pbnQsIHBvaW50U3RyZWFtID0ge1xuICAgICAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgcG9pbnQgPSBbIHgsIHkgXTtcbiAgICAgIH1cbiAgICB9LCBsb3dlcjQ4UG9pbnQsIGFsYXNrYVBvaW50LCBoYXdhaWlQb2ludDtcbiAgICBmdW5jdGlvbiBhbGJlcnNVc2EoY29vcmRpbmF0ZXMpIHtcbiAgICAgIHZhciB4ID0gY29vcmRpbmF0ZXNbMF0sIHkgPSBjb29yZGluYXRlc1sxXTtcbiAgICAgIHBvaW50ID0gbnVsbDtcbiAgICAgIChsb3dlcjQ4UG9pbnQoeCwgeSksIHBvaW50KSB8fCAoYWxhc2thUG9pbnQoeCwgeSksIHBvaW50KSB8fCBoYXdhaWlQb2ludCh4LCB5KTtcbiAgICAgIHJldHVybiBwb2ludDtcbiAgICB9XG4gICAgYWxiZXJzVXNhLmludmVydCA9IGZ1bmN0aW9uKGNvb3JkaW5hdGVzKSB7XG4gICAgICB2YXIgayA9IGxvd2VyNDguc2NhbGUoKSwgdCA9IGxvd2VyNDgudHJhbnNsYXRlKCksIHggPSAoY29vcmRpbmF0ZXNbMF0gLSB0WzBdKSAvIGssIHkgPSAoY29vcmRpbmF0ZXNbMV0gLSB0WzFdKSAvIGs7XG4gICAgICByZXR1cm4gKHkgPj0gLjEyICYmIHkgPCAuMjM0ICYmIHggPj0gLS40MjUgJiYgeCA8IC0uMjE0ID8gYWxhc2thIDogeSA+PSAuMTY2ICYmIHkgPCAuMjM0ICYmIHggPj0gLS4yMTQgJiYgeCA8IC0uMTE1ID8gaGF3YWlpIDogbG93ZXI0OCkuaW52ZXJ0KGNvb3JkaW5hdGVzKTtcbiAgICB9O1xuICAgIGFsYmVyc1VzYS5zdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHZhciBsb3dlcjQ4U3RyZWFtID0gbG93ZXI0OC5zdHJlYW0oc3RyZWFtKSwgYWxhc2thU3RyZWFtID0gYWxhc2thLnN0cmVhbShzdHJlYW0pLCBoYXdhaWlTdHJlYW0gPSBoYXdhaWkuc3RyZWFtKHN0cmVhbSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgICAgICAgIGxvd2VyNDhTdHJlYW0ucG9pbnQoeCwgeSk7XG4gICAgICAgICAgYWxhc2thU3RyZWFtLnBvaW50KHgsIHkpO1xuICAgICAgICAgIGhhd2FpaVN0cmVhbS5wb2ludCh4LCB5KTtcbiAgICAgICAgfSxcbiAgICAgICAgc3BoZXJlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBsb3dlcjQ4U3RyZWFtLnNwaGVyZSgpO1xuICAgICAgICAgIGFsYXNrYVN0cmVhbS5zcGhlcmUoKTtcbiAgICAgICAgICBoYXdhaWlTdHJlYW0uc3BoZXJlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbG93ZXI0OFN0cmVhbS5saW5lU3RhcnQoKTtcbiAgICAgICAgICBhbGFza2FTdHJlYW0ubGluZVN0YXJ0KCk7XG4gICAgICAgICAgaGF3YWlpU3RyZWFtLmxpbmVTdGFydCgpO1xuICAgICAgICB9LFxuICAgICAgICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBsb3dlcjQ4U3RyZWFtLmxpbmVFbmQoKTtcbiAgICAgICAgICBhbGFza2FTdHJlYW0ubGluZUVuZCgpO1xuICAgICAgICAgIGhhd2FpaVN0cmVhbS5saW5lRW5kKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHBvbHlnb25TdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbG93ZXI0OFN0cmVhbS5wb2x5Z29uU3RhcnQoKTtcbiAgICAgICAgICBhbGFza2FTdHJlYW0ucG9seWdvblN0YXJ0KCk7XG4gICAgICAgICAgaGF3YWlpU3RyZWFtLnBvbHlnb25TdGFydCgpO1xuICAgICAgICB9LFxuICAgICAgICBwb2x5Z29uRW5kOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBsb3dlcjQ4U3RyZWFtLnBvbHlnb25FbmQoKTtcbiAgICAgICAgICBhbGFza2FTdHJlYW0ucG9seWdvbkVuZCgpO1xuICAgICAgICAgIGhhd2FpaVN0cmVhbS5wb2x5Z29uRW5kKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcbiAgICBhbGJlcnNVc2EucHJlY2lzaW9uID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbG93ZXI0OC5wcmVjaXNpb24oKTtcbiAgICAgIGxvd2VyNDgucHJlY2lzaW9uKF8pO1xuICAgICAgYWxhc2thLnByZWNpc2lvbihfKTtcbiAgICAgIGhhd2FpaS5wcmVjaXNpb24oXyk7XG4gICAgICByZXR1cm4gYWxiZXJzVXNhO1xuICAgIH07XG4gICAgYWxiZXJzVXNhLnNjYWxlID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbG93ZXI0OC5zY2FsZSgpO1xuICAgICAgbG93ZXI0OC5zY2FsZShfKTtcbiAgICAgIGFsYXNrYS5zY2FsZShfICogLjM1KTtcbiAgICAgIGhhd2FpaS5zY2FsZShfKTtcbiAgICAgIHJldHVybiBhbGJlcnNVc2EudHJhbnNsYXRlKGxvd2VyNDgudHJhbnNsYXRlKCkpO1xuICAgIH07XG4gICAgYWxiZXJzVXNhLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGxvd2VyNDgudHJhbnNsYXRlKCk7XG4gICAgICB2YXIgayA9IGxvd2VyNDguc2NhbGUoKSwgeCA9ICtfWzBdLCB5ID0gK19bMV07XG4gICAgICBsb3dlcjQ4UG9pbnQgPSBsb3dlcjQ4LnRyYW5zbGF0ZShfKS5jbGlwRXh0ZW50KFsgWyB4IC0gLjQ1NSAqIGssIHkgLSAuMjM4ICogayBdLCBbIHggKyAuNDU1ICogaywgeSArIC4yMzggKiBrIF0gXSkuc3RyZWFtKHBvaW50U3RyZWFtKS5wb2ludDtcbiAgICAgIGFsYXNrYVBvaW50ID0gYWxhc2thLnRyYW5zbGF0ZShbIHggLSAuMzA3ICogaywgeSArIC4yMDEgKiBrIF0pLmNsaXBFeHRlbnQoWyBbIHggLSAuNDI1ICogayArIM61LCB5ICsgLjEyICogayArIM61IF0sIFsgeCAtIC4yMTQgKiBrIC0gzrUsIHkgKyAuMjM0ICogayAtIM61IF0gXSkuc3RyZWFtKHBvaW50U3RyZWFtKS5wb2ludDtcbiAgICAgIGhhd2FpaVBvaW50ID0gaGF3YWlpLnRyYW5zbGF0ZShbIHggLSAuMjA1ICogaywgeSArIC4yMTIgKiBrIF0pLmNsaXBFeHRlbnQoWyBbIHggLSAuMjE0ICogayArIM61LCB5ICsgLjE2NiAqIGsgKyDOtSBdLCBbIHggLSAuMTE1ICogayAtIM61LCB5ICsgLjIzNCAqIGsgLSDOtSBdIF0pLnN0cmVhbShwb2ludFN0cmVhbSkucG9pbnQ7XG4gICAgICByZXR1cm4gYWxiZXJzVXNhO1xuICAgIH07XG4gICAgcmV0dXJuIGFsYmVyc1VzYS5zY2FsZSgxMDcwKTtcbiAgfTtcbiAgdmFyIGQzX2dlb19wYXRoQXJlYVN1bSwgZDNfZ2VvX3BhdGhBcmVhUG9seWdvbiwgZDNfZ2VvX3BhdGhBcmVhID0ge1xuICAgIHBvaW50OiBkM19ub29wLFxuICAgIGxpbmVTdGFydDogZDNfbm9vcCxcbiAgICBsaW5lRW5kOiBkM19ub29wLFxuICAgIHBvbHlnb25TdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICBkM19nZW9fcGF0aEFyZWFQb2x5Z29uID0gMDtcbiAgICAgIGQzX2dlb19wYXRoQXJlYS5saW5lU3RhcnQgPSBkM19nZW9fcGF0aEFyZWFSaW5nU3RhcnQ7XG4gICAgfSxcbiAgICBwb2x5Z29uRW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGQzX2dlb19wYXRoQXJlYS5saW5lU3RhcnQgPSBkM19nZW9fcGF0aEFyZWEubGluZUVuZCA9IGQzX2dlb19wYXRoQXJlYS5wb2ludCA9IGQzX25vb3A7XG4gICAgICBkM19nZW9fcGF0aEFyZWFTdW0gKz0gYWJzKGQzX2dlb19wYXRoQXJlYVBvbHlnb24gLyAyKTtcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2dlb19wYXRoQXJlYVJpbmdTdGFydCgpIHtcbiAgICB2YXIgeDAwLCB5MDAsIHgwLCB5MDtcbiAgICBkM19nZW9fcGF0aEFyZWEucG9pbnQgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICBkM19nZW9fcGF0aEFyZWEucG9pbnQgPSBuZXh0UG9pbnQ7XG4gICAgICB4MDAgPSB4MCA9IHgsIHkwMCA9IHkwID0geTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIG5leHRQb2ludCh4LCB5KSB7XG4gICAgICBkM19nZW9fcGF0aEFyZWFQb2x5Z29uICs9IHkwICogeCAtIHgwICogeTtcbiAgICAgIHgwID0geCwgeTAgPSB5O1xuICAgIH1cbiAgICBkM19nZW9fcGF0aEFyZWEubGluZUVuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgbmV4dFBvaW50KHgwMCwgeTAwKTtcbiAgICB9O1xuICB9XG4gIHZhciBkM19nZW9fcGF0aEJvdW5kc1gwLCBkM19nZW9fcGF0aEJvdW5kc1kwLCBkM19nZW9fcGF0aEJvdW5kc1gxLCBkM19nZW9fcGF0aEJvdW5kc1kxO1xuICB2YXIgZDNfZ2VvX3BhdGhCb3VuZHMgPSB7XG4gICAgcG9pbnQ6IGQzX2dlb19wYXRoQm91bmRzUG9pbnQsXG4gICAgbGluZVN0YXJ0OiBkM19ub29wLFxuICAgIGxpbmVFbmQ6IGQzX25vb3AsXG4gICAgcG9seWdvblN0YXJ0OiBkM19ub29wLFxuICAgIHBvbHlnb25FbmQ6IGQzX25vb3BcbiAgfTtcbiAgZnVuY3Rpb24gZDNfZ2VvX3BhdGhCb3VuZHNQb2ludCh4LCB5KSB7XG4gICAgaWYgKHggPCBkM19nZW9fcGF0aEJvdW5kc1gwKSBkM19nZW9fcGF0aEJvdW5kc1gwID0geDtcbiAgICBpZiAoeCA+IGQzX2dlb19wYXRoQm91bmRzWDEpIGQzX2dlb19wYXRoQm91bmRzWDEgPSB4O1xuICAgIGlmICh5IDwgZDNfZ2VvX3BhdGhCb3VuZHNZMCkgZDNfZ2VvX3BhdGhCb3VuZHNZMCA9IHk7XG4gICAgaWYgKHkgPiBkM19nZW9fcGF0aEJvdW5kc1kxKSBkM19nZW9fcGF0aEJvdW5kc1kxID0geTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fcGF0aEJ1ZmZlcigpIHtcbiAgICB2YXIgcG9pbnRDaXJjbGUgPSBkM19nZW9fcGF0aEJ1ZmZlckNpcmNsZSg0LjUpLCBidWZmZXIgPSBbXTtcbiAgICB2YXIgc3RyZWFtID0ge1xuICAgICAgcG9pbnQ6IHBvaW50LFxuICAgICAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RyZWFtLnBvaW50ID0gcG9pbnRMaW5lU3RhcnQ7XG4gICAgICB9LFxuICAgICAgbGluZUVuZDogbGluZUVuZCxcbiAgICAgIHBvbHlnb25TdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0cmVhbS5saW5lRW5kID0gbGluZUVuZFBvbHlnb247XG4gICAgICB9LFxuICAgICAgcG9seWdvbkVuZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0cmVhbS5saW5lRW5kID0gbGluZUVuZDtcbiAgICAgICAgc3RyZWFtLnBvaW50ID0gcG9pbnQ7XG4gICAgICB9LFxuICAgICAgcG9pbnRSYWRpdXM6IGZ1bmN0aW9uKF8pIHtcbiAgICAgICAgcG9pbnRDaXJjbGUgPSBkM19nZW9fcGF0aEJ1ZmZlckNpcmNsZShfKTtcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcbiAgICAgIH0sXG4gICAgICByZXN1bHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoYnVmZmVyLmxlbmd0aCkge1xuICAgICAgICAgIHZhciByZXN1bHQgPSBidWZmZXIuam9pbihcIlwiKTtcbiAgICAgICAgICBidWZmZXIgPSBbXTtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICBmdW5jdGlvbiBwb2ludCh4LCB5KSB7XG4gICAgICBidWZmZXIucHVzaChcIk1cIiwgeCwgXCIsXCIsIHksIHBvaW50Q2lyY2xlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcG9pbnRMaW5lU3RhcnQoeCwgeSkge1xuICAgICAgYnVmZmVyLnB1c2goXCJNXCIsIHgsIFwiLFwiLCB5KTtcbiAgICAgIHN0cmVhbS5wb2ludCA9IHBvaW50TGluZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcG9pbnRMaW5lKHgsIHkpIHtcbiAgICAgIGJ1ZmZlci5wdXNoKFwiTFwiLCB4LCBcIixcIiwgeSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGxpbmVFbmQoKSB7XG4gICAgICBzdHJlYW0ucG9pbnQgPSBwb2ludDtcbiAgICB9XG4gICAgZnVuY3Rpb24gbGluZUVuZFBvbHlnb24oKSB7XG4gICAgICBidWZmZXIucHVzaChcIlpcIik7XG4gICAgfVxuICAgIHJldHVybiBzdHJlYW07XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvX3BhdGhCdWZmZXJDaXJjbGUocmFkaXVzKSB7XG4gICAgcmV0dXJuIFwibTAsXCIgKyByYWRpdXMgKyBcImFcIiArIHJhZGl1cyArIFwiLFwiICsgcmFkaXVzICsgXCIgMCAxLDEgMCxcIiArIC0yICogcmFkaXVzICsgXCJhXCIgKyByYWRpdXMgKyBcIixcIiArIHJhZGl1cyArIFwiIDAgMSwxIDAsXCIgKyAyICogcmFkaXVzICsgXCJ6XCI7XG4gIH1cbiAgdmFyIGQzX2dlb19wYXRoQ2VudHJvaWQgPSB7XG4gICAgcG9pbnQ6IGQzX2dlb19wYXRoQ2VudHJvaWRQb2ludCxcbiAgICBsaW5lU3RhcnQ6IGQzX2dlb19wYXRoQ2VudHJvaWRMaW5lU3RhcnQsXG4gICAgbGluZUVuZDogZDNfZ2VvX3BhdGhDZW50cm9pZExpbmVFbmQsXG4gICAgcG9seWdvblN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIGQzX2dlb19wYXRoQ2VudHJvaWQubGluZVN0YXJ0ID0gZDNfZ2VvX3BhdGhDZW50cm9pZFJpbmdTdGFydDtcbiAgICB9LFxuICAgIHBvbHlnb25FbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgZDNfZ2VvX3BhdGhDZW50cm9pZC5wb2ludCA9IGQzX2dlb19wYXRoQ2VudHJvaWRQb2ludDtcbiAgICAgIGQzX2dlb19wYXRoQ2VudHJvaWQubGluZVN0YXJ0ID0gZDNfZ2VvX3BhdGhDZW50cm9pZExpbmVTdGFydDtcbiAgICAgIGQzX2dlb19wYXRoQ2VudHJvaWQubGluZUVuZCA9IGQzX2dlb19wYXRoQ2VudHJvaWRMaW5lRW5kO1xuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gZDNfZ2VvX3BhdGhDZW50cm9pZFBvaW50KHgsIHkpIHtcbiAgICBkM19nZW9fY2VudHJvaWRYMCArPSB4O1xuICAgIGQzX2dlb19jZW50cm9pZFkwICs9IHk7XG4gICAgKytkM19nZW9fY2VudHJvaWRaMDtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fcGF0aENlbnRyb2lkTGluZVN0YXJ0KCkge1xuICAgIHZhciB4MCwgeTA7XG4gICAgZDNfZ2VvX3BhdGhDZW50cm9pZC5wb2ludCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgIGQzX2dlb19wYXRoQ2VudHJvaWQucG9pbnQgPSBuZXh0UG9pbnQ7XG4gICAgICBkM19nZW9fcGF0aENlbnRyb2lkUG9pbnQoeDAgPSB4LCB5MCA9IHkpO1xuICAgIH07XG4gICAgZnVuY3Rpb24gbmV4dFBvaW50KHgsIHkpIHtcbiAgICAgIHZhciBkeCA9IHggLSB4MCwgZHkgPSB5IC0geTAsIHogPSBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkWDEgKz0geiAqICh4MCArIHgpIC8gMjtcbiAgICAgIGQzX2dlb19jZW50cm9pZFkxICs9IHogKiAoeTAgKyB5KSAvIDI7XG4gICAgICBkM19nZW9fY2VudHJvaWRaMSArPSB6O1xuICAgICAgZDNfZ2VvX3BhdGhDZW50cm9pZFBvaW50KHgwID0geCwgeTAgPSB5KTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvX3BhdGhDZW50cm9pZExpbmVFbmQoKSB7XG4gICAgZDNfZ2VvX3BhdGhDZW50cm9pZC5wb2ludCA9IGQzX2dlb19wYXRoQ2VudHJvaWRQb2ludDtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fcGF0aENlbnRyb2lkUmluZ1N0YXJ0KCkge1xuICAgIHZhciB4MDAsIHkwMCwgeDAsIHkwO1xuICAgIGQzX2dlb19wYXRoQ2VudHJvaWQucG9pbnQgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICBkM19nZW9fcGF0aENlbnRyb2lkLnBvaW50ID0gbmV4dFBvaW50O1xuICAgICAgZDNfZ2VvX3BhdGhDZW50cm9pZFBvaW50KHgwMCA9IHgwID0geCwgeTAwID0geTAgPSB5KTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIG5leHRQb2ludCh4LCB5KSB7XG4gICAgICB2YXIgZHggPSB4IC0geDAsIGR5ID0geSAtIHkwLCB6ID0gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5KTtcbiAgICAgIGQzX2dlb19jZW50cm9pZFgxICs9IHogKiAoeDAgKyB4KSAvIDI7XG4gICAgICBkM19nZW9fY2VudHJvaWRZMSArPSB6ICogKHkwICsgeSkgLyAyO1xuICAgICAgZDNfZ2VvX2NlbnRyb2lkWjEgKz0gejtcbiAgICAgIHogPSB5MCAqIHggLSB4MCAqIHk7XG4gICAgICBkM19nZW9fY2VudHJvaWRYMiArPSB6ICogKHgwICsgeCk7XG4gICAgICBkM19nZW9fY2VudHJvaWRZMiArPSB6ICogKHkwICsgeSk7XG4gICAgICBkM19nZW9fY2VudHJvaWRaMiArPSB6ICogMztcbiAgICAgIGQzX2dlb19wYXRoQ2VudHJvaWRQb2ludCh4MCA9IHgsIHkwID0geSk7XG4gICAgfVxuICAgIGQzX2dlb19wYXRoQ2VudHJvaWQubGluZUVuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgbmV4dFBvaW50KHgwMCwgeTAwKTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19wYXRoQ29udGV4dChjb250ZXh0KSB7XG4gICAgdmFyIHBvaW50UmFkaXVzID0gNC41O1xuICAgIHZhciBzdHJlYW0gPSB7XG4gICAgICBwb2ludDogcG9pbnQsXG4gICAgICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBzdHJlYW0ucG9pbnQgPSBwb2ludExpbmVTdGFydDtcbiAgICAgIH0sXG4gICAgICBsaW5lRW5kOiBsaW5lRW5kLFxuICAgICAgcG9seWdvblN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RyZWFtLmxpbmVFbmQgPSBsaW5lRW5kUG9seWdvbjtcbiAgICAgIH0sXG4gICAgICBwb2x5Z29uRW5kOiBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RyZWFtLmxpbmVFbmQgPSBsaW5lRW5kO1xuICAgICAgICBzdHJlYW0ucG9pbnQgPSBwb2ludDtcbiAgICAgIH0sXG4gICAgICBwb2ludFJhZGl1czogZnVuY3Rpb24oXykge1xuICAgICAgICBwb2ludFJhZGl1cyA9IF87XG4gICAgICAgIHJldHVybiBzdHJlYW07XG4gICAgICB9LFxuICAgICAgcmVzdWx0OiBkM19ub29wXG4gICAgfTtcbiAgICBmdW5jdGlvbiBwb2ludCh4LCB5KSB7XG4gICAgICBjb250ZXh0Lm1vdmVUbyh4LCB5KTtcbiAgICAgIGNvbnRleHQuYXJjKHgsIHksIHBvaW50UmFkaXVzLCAwLCDPhCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBvaW50TGluZVN0YXJ0KHgsIHkpIHtcbiAgICAgIGNvbnRleHQubW92ZVRvKHgsIHkpO1xuICAgICAgc3RyZWFtLnBvaW50ID0gcG9pbnRMaW5lO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwb2ludExpbmUoeCwgeSkge1xuICAgICAgY29udGV4dC5saW5lVG8oeCwgeSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGxpbmVFbmQoKSB7XG4gICAgICBzdHJlYW0ucG9pbnQgPSBwb2ludDtcbiAgICB9XG4gICAgZnVuY3Rpb24gbGluZUVuZFBvbHlnb24oKSB7XG4gICAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIH1cbiAgICByZXR1cm4gc3RyZWFtO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19yZXNhbXBsZShwcm9qZWN0KSB7XG4gICAgdmFyIM60MiA9IC41LCBjb3NNaW5EaXN0YW5jZSA9IE1hdGguY29zKDMwICogZDNfcmFkaWFucyksIG1heERlcHRoID0gMTY7XG4gICAgZnVuY3Rpb24gcmVzYW1wbGUoc3RyZWFtKSB7XG4gICAgICByZXR1cm4gKG1heERlcHRoID8gcmVzYW1wbGVSZWN1cnNpdmUgOiByZXNhbXBsZU5vbmUpKHN0cmVhbSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlc2FtcGxlTm9uZShzdHJlYW0pIHtcbiAgICAgIHJldHVybiBkM19nZW9fdHJhbnNmb3JtUG9pbnQoc3RyZWFtLCBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIHggPSBwcm9qZWN0KHgsIHkpO1xuICAgICAgICBzdHJlYW0ucG9pbnQoeFswXSwgeFsxXSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVzYW1wbGVSZWN1cnNpdmUoc3RyZWFtKSB7XG4gICAgICB2YXIgzrswMCwgz4YwMCwgeDAwLCB5MDAsIGEwMCwgYjAwLCBjMDAsIM67MCwgeDAsIHkwLCBhMCwgYjAsIGMwO1xuICAgICAgdmFyIHJlc2FtcGxlID0ge1xuICAgICAgICBwb2ludDogcG9pbnQsXG4gICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICBsaW5lRW5kOiBsaW5lRW5kLFxuICAgICAgICBwb2x5Z29uU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHN0cmVhbS5wb2x5Z29uU3RhcnQoKTtcbiAgICAgICAgICByZXNhbXBsZS5saW5lU3RhcnQgPSByaW5nU3RhcnQ7XG4gICAgICAgIH0sXG4gICAgICAgIHBvbHlnb25FbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHN0cmVhbS5wb2x5Z29uRW5kKCk7XG4gICAgICAgICAgcmVzYW1wbGUubGluZVN0YXJ0ID0gbGluZVN0YXJ0O1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgZnVuY3Rpb24gcG9pbnQoeCwgeSkge1xuICAgICAgICB4ID0gcHJvamVjdCh4LCB5KTtcbiAgICAgICAgc3RyZWFtLnBvaW50KHhbMF0sIHhbMV0pO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gbGluZVN0YXJ0KCkge1xuICAgICAgICB4MCA9IE5hTjtcbiAgICAgICAgcmVzYW1wbGUucG9pbnQgPSBsaW5lUG9pbnQ7XG4gICAgICAgIHN0cmVhbS5saW5lU3RhcnQoKTtcbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIGxpbmVQb2ludCjOuywgz4YpIHtcbiAgICAgICAgdmFyIGMgPSBkM19nZW9fY2FydGVzaWFuKFsgzrssIM+GIF0pLCBwID0gcHJvamVjdCjOuywgz4YpO1xuICAgICAgICByZXNhbXBsZUxpbmVUbyh4MCwgeTAsIM67MCwgYTAsIGIwLCBjMCwgeDAgPSBwWzBdLCB5MCA9IHBbMV0sIM67MCA9IM67LCBhMCA9IGNbMF0sIGIwID0gY1sxXSwgYzAgPSBjWzJdLCBtYXhEZXB0aCwgc3RyZWFtKTtcbiAgICAgICAgc3RyZWFtLnBvaW50KHgwLCB5MCk7XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBsaW5lRW5kKCkge1xuICAgICAgICByZXNhbXBsZS5wb2ludCA9IHBvaW50O1xuICAgICAgICBzdHJlYW0ubGluZUVuZCgpO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gcmluZ1N0YXJ0KCkge1xuICAgICAgICBsaW5lU3RhcnQoKTtcbiAgICAgICAgcmVzYW1wbGUucG9pbnQgPSByaW5nUG9pbnQ7XG4gICAgICAgIHJlc2FtcGxlLmxpbmVFbmQgPSByaW5nRW5kO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gcmluZ1BvaW50KM67LCDPhikge1xuICAgICAgICBsaW5lUG9pbnQozrswMCA9IM67LCDPhjAwID0gz4YpLCB4MDAgPSB4MCwgeTAwID0geTAsIGEwMCA9IGEwLCBiMDAgPSBiMCwgYzAwID0gYzA7XG4gICAgICAgIHJlc2FtcGxlLnBvaW50ID0gbGluZVBvaW50O1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gcmluZ0VuZCgpIHtcbiAgICAgICAgcmVzYW1wbGVMaW5lVG8oeDAsIHkwLCDOuzAsIGEwLCBiMCwgYzAsIHgwMCwgeTAwLCDOuzAwLCBhMDAsIGIwMCwgYzAwLCBtYXhEZXB0aCwgc3RyZWFtKTtcbiAgICAgICAgcmVzYW1wbGUubGluZUVuZCA9IGxpbmVFbmQ7XG4gICAgICAgIGxpbmVFbmQoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNhbXBsZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVzYW1wbGVMaW5lVG8oeDAsIHkwLCDOuzAsIGEwLCBiMCwgYzAsIHgxLCB5MSwgzrsxLCBhMSwgYjEsIGMxLCBkZXB0aCwgc3RyZWFtKSB7XG4gICAgICB2YXIgZHggPSB4MSAtIHgwLCBkeSA9IHkxIC0geTAsIGQyID0gZHggKiBkeCArIGR5ICogZHk7XG4gICAgICBpZiAoZDIgPiA0ICogzrQyICYmIGRlcHRoLS0pIHtcbiAgICAgICAgdmFyIGEgPSBhMCArIGExLCBiID0gYjAgKyBiMSwgYyA9IGMwICsgYzEsIG0gPSBNYXRoLnNxcnQoYSAqIGEgKyBiICogYiArIGMgKiBjKSwgz4YyID0gTWF0aC5hc2luKGMgLz0gbSksIM67MiA9IGFicyhhYnMoYykgLSAxKSA8IM61IHx8IGFicyjOuzAgLSDOuzEpIDwgzrUgPyAozrswICsgzrsxKSAvIDIgOiBNYXRoLmF0YW4yKGIsIGEpLCBwID0gcHJvamVjdCjOuzIsIM+GMiksIHgyID0gcFswXSwgeTIgPSBwWzFdLCBkeDIgPSB4MiAtIHgwLCBkeTIgPSB5MiAtIHkwLCBkeiA9IGR5ICogZHgyIC0gZHggKiBkeTI7XG4gICAgICAgIGlmIChkeiAqIGR6IC8gZDIgPiDOtDIgfHwgYWJzKChkeCAqIGR4MiArIGR5ICogZHkyKSAvIGQyIC0gLjUpID4gLjMgfHwgYTAgKiBhMSArIGIwICogYjEgKyBjMCAqIGMxIDwgY29zTWluRGlzdGFuY2UpIHtcbiAgICAgICAgICByZXNhbXBsZUxpbmVUbyh4MCwgeTAsIM67MCwgYTAsIGIwLCBjMCwgeDIsIHkyLCDOuzIsIGEgLz0gbSwgYiAvPSBtLCBjLCBkZXB0aCwgc3RyZWFtKTtcbiAgICAgICAgICBzdHJlYW0ucG9pbnQoeDIsIHkyKTtcbiAgICAgICAgICByZXNhbXBsZUxpbmVUbyh4MiwgeTIsIM67MiwgYSwgYiwgYywgeDEsIHkxLCDOuzEsIGExLCBiMSwgYzEsIGRlcHRoLCBzdHJlYW0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJlc2FtcGxlLnByZWNpc2lvbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIE1hdGguc3FydCjOtDIpO1xuICAgICAgbWF4RGVwdGggPSAozrQyID0gXyAqIF8pID4gMCAmJiAxNjtcbiAgICAgIHJldHVybiByZXNhbXBsZTtcbiAgICB9O1xuICAgIHJldHVybiByZXNhbXBsZTtcbiAgfVxuICBkMy5nZW8ucGF0aCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwb2ludFJhZGl1cyA9IDQuNSwgcHJvamVjdGlvbiwgY29udGV4dCwgcHJvamVjdFN0cmVhbSwgY29udGV4dFN0cmVhbSwgY2FjaGVTdHJlYW07XG4gICAgZnVuY3Rpb24gcGF0aChvYmplY3QpIHtcbiAgICAgIGlmIChvYmplY3QpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwb2ludFJhZGl1cyA9PT0gXCJmdW5jdGlvblwiKSBjb250ZXh0U3RyZWFtLnBvaW50UmFkaXVzKCtwb2ludFJhZGl1cy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICAgICAgaWYgKCFjYWNoZVN0cmVhbSB8fCAhY2FjaGVTdHJlYW0udmFsaWQpIGNhY2hlU3RyZWFtID0gcHJvamVjdFN0cmVhbShjb250ZXh0U3RyZWFtKTtcbiAgICAgICAgZDMuZ2VvLnN0cmVhbShvYmplY3QsIGNhY2hlU3RyZWFtKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb250ZXh0U3RyZWFtLnJlc3VsdCgpO1xuICAgIH1cbiAgICBwYXRoLmFyZWEgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgIGQzX2dlb19wYXRoQXJlYVN1bSA9IDA7XG4gICAgICBkMy5nZW8uc3RyZWFtKG9iamVjdCwgcHJvamVjdFN0cmVhbShkM19nZW9fcGF0aEFyZWEpKTtcbiAgICAgIHJldHVybiBkM19nZW9fcGF0aEFyZWFTdW07XG4gICAgfTtcbiAgICBwYXRoLmNlbnRyb2lkID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICBkM19nZW9fY2VudHJvaWRYMCA9IGQzX2dlb19jZW50cm9pZFkwID0gZDNfZ2VvX2NlbnRyb2lkWjAgPSBkM19nZW9fY2VudHJvaWRYMSA9IGQzX2dlb19jZW50cm9pZFkxID0gZDNfZ2VvX2NlbnRyb2lkWjEgPSBkM19nZW9fY2VudHJvaWRYMiA9IGQzX2dlb19jZW50cm9pZFkyID0gZDNfZ2VvX2NlbnRyb2lkWjIgPSAwO1xuICAgICAgZDMuZ2VvLnN0cmVhbShvYmplY3QsIHByb2plY3RTdHJlYW0oZDNfZ2VvX3BhdGhDZW50cm9pZCkpO1xuICAgICAgcmV0dXJuIGQzX2dlb19jZW50cm9pZFoyID8gWyBkM19nZW9fY2VudHJvaWRYMiAvIGQzX2dlb19jZW50cm9pZFoyLCBkM19nZW9fY2VudHJvaWRZMiAvIGQzX2dlb19jZW50cm9pZFoyIF0gOiBkM19nZW9fY2VudHJvaWRaMSA/IFsgZDNfZ2VvX2NlbnRyb2lkWDEgLyBkM19nZW9fY2VudHJvaWRaMSwgZDNfZ2VvX2NlbnRyb2lkWTEgLyBkM19nZW9fY2VudHJvaWRaMSBdIDogZDNfZ2VvX2NlbnRyb2lkWjAgPyBbIGQzX2dlb19jZW50cm9pZFgwIC8gZDNfZ2VvX2NlbnRyb2lkWjAsIGQzX2dlb19jZW50cm9pZFkwIC8gZDNfZ2VvX2NlbnRyb2lkWjAgXSA6IFsgTmFOLCBOYU4gXTtcbiAgICB9O1xuICAgIHBhdGguYm91bmRzID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICBkM19nZW9fcGF0aEJvdW5kc1gxID0gZDNfZ2VvX3BhdGhCb3VuZHNZMSA9IC0oZDNfZ2VvX3BhdGhCb3VuZHNYMCA9IGQzX2dlb19wYXRoQm91bmRzWTAgPSBJbmZpbml0eSk7XG4gICAgICBkMy5nZW8uc3RyZWFtKG9iamVjdCwgcHJvamVjdFN0cmVhbShkM19nZW9fcGF0aEJvdW5kcykpO1xuICAgICAgcmV0dXJuIFsgWyBkM19nZW9fcGF0aEJvdW5kc1gwLCBkM19nZW9fcGF0aEJvdW5kc1kwIF0sIFsgZDNfZ2VvX3BhdGhCb3VuZHNYMSwgZDNfZ2VvX3BhdGhCb3VuZHNZMSBdIF07XG4gICAgfTtcbiAgICBwYXRoLnByb2plY3Rpb24gPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBwcm9qZWN0aW9uO1xuICAgICAgcHJvamVjdFN0cmVhbSA9IChwcm9qZWN0aW9uID0gXykgPyBfLnN0cmVhbSB8fCBkM19nZW9fcGF0aFByb2plY3RTdHJlYW0oXykgOiBkM19pZGVudGl0eTtcbiAgICAgIHJldHVybiByZXNldCgpO1xuICAgIH07XG4gICAgcGF0aC5jb250ZXh0ID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gY29udGV4dDtcbiAgICAgIGNvbnRleHRTdHJlYW0gPSAoY29udGV4dCA9IF8pID09IG51bGwgPyBuZXcgZDNfZ2VvX3BhdGhCdWZmZXIoKSA6IG5ldyBkM19nZW9fcGF0aENvbnRleHQoXyk7XG4gICAgICBpZiAodHlwZW9mIHBvaW50UmFkaXVzICE9PSBcImZ1bmN0aW9uXCIpIGNvbnRleHRTdHJlYW0ucG9pbnRSYWRpdXMocG9pbnRSYWRpdXMpO1xuICAgICAgcmV0dXJuIHJlc2V0KCk7XG4gICAgfTtcbiAgICBwYXRoLnBvaW50UmFkaXVzID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gcG9pbnRSYWRpdXM7XG4gICAgICBwb2ludFJhZGl1cyA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogKGNvbnRleHRTdHJlYW0ucG9pbnRSYWRpdXMoK18pLCArXyk7XG4gICAgICByZXR1cm4gcGF0aDtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgY2FjaGVTdHJlYW0gPSBudWxsO1xuICAgICAgcmV0dXJuIHBhdGg7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnByb2plY3Rpb24oZDMuZ2VvLmFsYmVyc1VzYSgpKS5jb250ZXh0KG51bGwpO1xuICB9O1xuICBmdW5jdGlvbiBkM19nZW9fcGF0aFByb2plY3RTdHJlYW0ocHJvamVjdCkge1xuICAgIHZhciByZXNhbXBsZSA9IGQzX2dlb19yZXNhbXBsZShmdW5jdGlvbih4LCB5KSB7XG4gICAgICByZXR1cm4gcHJvamVjdChbIHggKiBkM19kZWdyZWVzLCB5ICogZDNfZGVncmVlcyBdKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICByZXR1cm4gZDNfZ2VvX3Byb2plY3Rpb25SYWRpYW5zKHJlc2FtcGxlKHN0cmVhbSkpO1xuICAgIH07XG4gIH1cbiAgZDMuZ2VvLnRyYW5zZm9ybSA9IGZ1bmN0aW9uKG1ldGhvZHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3RyZWFtOiBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IG5ldyBkM19nZW9fdHJhbnNmb3JtKHN0cmVhbSk7XG4gICAgICAgIGZvciAodmFyIGsgaW4gbWV0aG9kcykgdHJhbnNmb3JtW2tdID0gbWV0aG9kc1trXTtcbiAgICAgICAgcmV0dXJuIHRyYW5zZm9ybTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuICBmdW5jdGlvbiBkM19nZW9fdHJhbnNmb3JtKHN0cmVhbSkge1xuICAgIHRoaXMuc3RyZWFtID0gc3RyZWFtO1xuICB9XG4gIGQzX2dlb190cmFuc2Zvcm0ucHJvdG90eXBlID0ge1xuICAgIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgICB0aGlzLnN0cmVhbS5wb2ludCh4LCB5KTtcbiAgICB9LFxuICAgIHNwaGVyZTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnN0cmVhbS5zcGhlcmUoKTtcbiAgICB9LFxuICAgIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnN0cmVhbS5saW5lU3RhcnQoKTtcbiAgICB9LFxuICAgIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zdHJlYW0ubGluZUVuZCgpO1xuICAgIH0sXG4gICAgcG9seWdvblN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc3RyZWFtLnBvbHlnb25TdGFydCgpO1xuICAgIH0sXG4gICAgcG9seWdvbkVuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnN0cmVhbS5wb2x5Z29uRW5kKCk7XG4gICAgfVxuICB9O1xuICBmdW5jdGlvbiBkM19nZW9fdHJhbnNmb3JtUG9pbnQoc3RyZWFtLCBwb2ludCkge1xuICAgIHJldHVybiB7XG4gICAgICBwb2ludDogcG9pbnQsXG4gICAgICBzcGhlcmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICBzdHJlYW0uc3BoZXJlKCk7XG4gICAgICB9LFxuICAgICAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RyZWFtLmxpbmVTdGFydCgpO1xuICAgICAgfSxcbiAgICAgIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBzdHJlYW0ubGluZUVuZCgpO1xuICAgICAgfSxcbiAgICAgIHBvbHlnb25TdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0cmVhbS5wb2x5Z29uU3RhcnQoKTtcbiAgICAgIH0sXG4gICAgICBwb2x5Z29uRW5kOiBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RyZWFtLnBvbHlnb25FbmQoKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGQzLmdlby5wcm9qZWN0aW9uID0gZDNfZ2VvX3Byb2plY3Rpb247XG4gIGQzLmdlby5wcm9qZWN0aW9uTXV0YXRvciA9IGQzX2dlb19wcm9qZWN0aW9uTXV0YXRvcjtcbiAgZnVuY3Rpb24gZDNfZ2VvX3Byb2plY3Rpb24ocHJvamVjdCkge1xuICAgIHJldHVybiBkM19nZW9fcHJvamVjdGlvbk11dGF0b3IoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcHJvamVjdDtcbiAgICB9KSgpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19wcm9qZWN0aW9uTXV0YXRvcihwcm9qZWN0QXQpIHtcbiAgICB2YXIgcHJvamVjdCwgcm90YXRlLCBwcm9qZWN0Um90YXRlLCBwcm9qZWN0UmVzYW1wbGUgPSBkM19nZW9fcmVzYW1wbGUoZnVuY3Rpb24oeCwgeSkge1xuICAgICAgeCA9IHByb2plY3QoeCwgeSk7XG4gICAgICByZXR1cm4gWyB4WzBdICogayArIM60eCwgzrR5IC0geFsxXSAqIGsgXTtcbiAgICB9KSwgayA9IDE1MCwgeCA9IDQ4MCwgeSA9IDI1MCwgzrsgPSAwLCDPhiA9IDAsIM60zrsgPSAwLCDOtM+GID0gMCwgzrTOsyA9IDAsIM60eCwgzrR5LCBwcmVjbGlwID0gZDNfZ2VvX2NsaXBBbnRpbWVyaWRpYW4sIHBvc3RjbGlwID0gZDNfaWRlbnRpdHksIGNsaXBBbmdsZSA9IG51bGwsIGNsaXBFeHRlbnQgPSBudWxsLCBzdHJlYW07XG4gICAgZnVuY3Rpb24gcHJvamVjdGlvbihwb2ludCkge1xuICAgICAgcG9pbnQgPSBwcm9qZWN0Um90YXRlKHBvaW50WzBdICogZDNfcmFkaWFucywgcG9pbnRbMV0gKiBkM19yYWRpYW5zKTtcbiAgICAgIHJldHVybiBbIHBvaW50WzBdICogayArIM60eCwgzrR5IC0gcG9pbnRbMV0gKiBrIF07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGludmVydChwb2ludCkge1xuICAgICAgcG9pbnQgPSBwcm9qZWN0Um90YXRlLmludmVydCgocG9pbnRbMF0gLSDOtHgpIC8gaywgKM60eSAtIHBvaW50WzFdKSAvIGspO1xuICAgICAgcmV0dXJuIHBvaW50ICYmIFsgcG9pbnRbMF0gKiBkM19kZWdyZWVzLCBwb2ludFsxXSAqIGQzX2RlZ3JlZXMgXTtcbiAgICB9XG4gICAgcHJvamVjdGlvbi5zdHJlYW0gPSBmdW5jdGlvbihvdXRwdXQpIHtcbiAgICAgIGlmIChzdHJlYW0pIHN0cmVhbS52YWxpZCA9IGZhbHNlO1xuICAgICAgc3RyZWFtID0gZDNfZ2VvX3Byb2plY3Rpb25SYWRpYW5zKHByZWNsaXAocm90YXRlLCBwcm9qZWN0UmVzYW1wbGUocG9zdGNsaXAob3V0cHV0KSkpKTtcbiAgICAgIHN0cmVhbS52YWxpZCA9IHRydWU7XG4gICAgICByZXR1cm4gc3RyZWFtO1xuICAgIH07XG4gICAgcHJvamVjdGlvbi5jbGlwQW5nbGUgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBjbGlwQW5nbGU7XG4gICAgICBwcmVjbGlwID0gXyA9PSBudWxsID8gKGNsaXBBbmdsZSA9IF8sIGQzX2dlb19jbGlwQW50aW1lcmlkaWFuKSA6IGQzX2dlb19jbGlwQ2lyY2xlKChjbGlwQW5nbGUgPSArXykgKiBkM19yYWRpYW5zKTtcbiAgICAgIHJldHVybiBpbnZhbGlkYXRlKCk7XG4gICAgfTtcbiAgICBwcm9qZWN0aW9uLmNsaXBFeHRlbnQgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBjbGlwRXh0ZW50O1xuICAgICAgY2xpcEV4dGVudCA9IF87XG4gICAgICBwb3N0Y2xpcCA9IF8gPyBkM19nZW9fY2xpcEV4dGVudChfWzBdWzBdLCBfWzBdWzFdLCBfWzFdWzBdLCBfWzFdWzFdKSA6IGQzX2lkZW50aXR5O1xuICAgICAgcmV0dXJuIGludmFsaWRhdGUoKTtcbiAgICB9O1xuICAgIHByb2plY3Rpb24uc2NhbGUgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBrO1xuICAgICAgayA9ICtfO1xuICAgICAgcmV0dXJuIHJlc2V0KCk7XG4gICAgfTtcbiAgICBwcm9qZWN0aW9uLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIFsgeCwgeSBdO1xuICAgICAgeCA9ICtfWzBdO1xuICAgICAgeSA9ICtfWzFdO1xuICAgICAgcmV0dXJuIHJlc2V0KCk7XG4gICAgfTtcbiAgICBwcm9qZWN0aW9uLmNlbnRlciA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIFsgzrsgKiBkM19kZWdyZWVzLCDPhiAqIGQzX2RlZ3JlZXMgXTtcbiAgICAgIM67ID0gX1swXSAlIDM2MCAqIGQzX3JhZGlhbnM7XG4gICAgICDPhiA9IF9bMV0gJSAzNjAgKiBkM19yYWRpYW5zO1xuICAgICAgcmV0dXJuIHJlc2V0KCk7XG4gICAgfTtcbiAgICBwcm9qZWN0aW9uLnJvdGF0ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIFsgzrTOuyAqIGQzX2RlZ3JlZXMsIM60z4YgKiBkM19kZWdyZWVzLCDOtM6zICogZDNfZGVncmVlcyBdO1xuICAgICAgzrTOuyA9IF9bMF0gJSAzNjAgKiBkM19yYWRpYW5zO1xuICAgICAgzrTPhiA9IF9bMV0gJSAzNjAgKiBkM19yYWRpYW5zO1xuICAgICAgzrTOsyA9IF8ubGVuZ3RoID4gMiA/IF9bMl0gJSAzNjAgKiBkM19yYWRpYW5zIDogMDtcbiAgICAgIHJldHVybiByZXNldCgpO1xuICAgIH07XG4gICAgZDMucmViaW5kKHByb2plY3Rpb24sIHByb2plY3RSZXNhbXBsZSwgXCJwcmVjaXNpb25cIik7XG4gICAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICBwcm9qZWN0Um90YXRlID0gZDNfZ2VvX2NvbXBvc2Uocm90YXRlID0gZDNfZ2VvX3JvdGF0aW9uKM60zrssIM60z4YsIM60zrMpLCBwcm9qZWN0KTtcbiAgICAgIHZhciBjZW50ZXIgPSBwcm9qZWN0KM67LCDPhik7XG4gICAgICDOtHggPSB4IC0gY2VudGVyWzBdICogaztcbiAgICAgIM60eSA9IHkgKyBjZW50ZXJbMV0gKiBrO1xuICAgICAgcmV0dXJuIGludmFsaWRhdGUoKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW52YWxpZGF0ZSgpIHtcbiAgICAgIGlmIChzdHJlYW0pIHN0cmVhbS52YWxpZCA9IGZhbHNlLCBzdHJlYW0gPSBudWxsO1xuICAgICAgcmV0dXJuIHByb2plY3Rpb247XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHByb2plY3QgPSBwcm9qZWN0QXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHByb2plY3Rpb24uaW52ZXJ0ID0gcHJvamVjdC5pbnZlcnQgJiYgaW52ZXJ0O1xuICAgICAgcmV0dXJuIHJlc2V0KCk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fcHJvamVjdGlvblJhZGlhbnMoc3RyZWFtKSB7XG4gICAgcmV0dXJuIGQzX2dlb190cmFuc2Zvcm1Qb2ludChzdHJlYW0sIGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgIHN0cmVhbS5wb2ludCh4ICogZDNfcmFkaWFucywgeSAqIGQzX3JhZGlhbnMpO1xuICAgIH0pO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19lcXVpcmVjdGFuZ3VsYXIozrssIM+GKSB7XG4gICAgcmV0dXJuIFsgzrssIM+GIF07XG4gIH1cbiAgKGQzLmdlby5lcXVpcmVjdGFuZ3VsYXIgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZDNfZ2VvX3Byb2plY3Rpb24oZDNfZ2VvX2VxdWlyZWN0YW5ndWxhcik7XG4gIH0pLnJhdyA9IGQzX2dlb19lcXVpcmVjdGFuZ3VsYXIuaW52ZXJ0ID0gZDNfZ2VvX2VxdWlyZWN0YW5ndWxhcjtcbiAgZDMuZ2VvLnJvdGF0aW9uID0gZnVuY3Rpb24ocm90YXRlKSB7XG4gICAgcm90YXRlID0gZDNfZ2VvX3JvdGF0aW9uKHJvdGF0ZVswXSAlIDM2MCAqIGQzX3JhZGlhbnMsIHJvdGF0ZVsxXSAqIGQzX3JhZGlhbnMsIHJvdGF0ZS5sZW5ndGggPiAyID8gcm90YXRlWzJdICogZDNfcmFkaWFucyA6IDApO1xuICAgIGZ1bmN0aW9uIGZvcndhcmQoY29vcmRpbmF0ZXMpIHtcbiAgICAgIGNvb3JkaW5hdGVzID0gcm90YXRlKGNvb3JkaW5hdGVzWzBdICogZDNfcmFkaWFucywgY29vcmRpbmF0ZXNbMV0gKiBkM19yYWRpYW5zKTtcbiAgICAgIHJldHVybiBjb29yZGluYXRlc1swXSAqPSBkM19kZWdyZWVzLCBjb29yZGluYXRlc1sxXSAqPSBkM19kZWdyZWVzLCBjb29yZGluYXRlcztcbiAgICB9XG4gICAgZm9yd2FyZC5pbnZlcnQgPSBmdW5jdGlvbihjb29yZGluYXRlcykge1xuICAgICAgY29vcmRpbmF0ZXMgPSByb3RhdGUuaW52ZXJ0KGNvb3JkaW5hdGVzWzBdICogZDNfcmFkaWFucywgY29vcmRpbmF0ZXNbMV0gKiBkM19yYWRpYW5zKTtcbiAgICAgIHJldHVybiBjb29yZGluYXRlc1swXSAqPSBkM19kZWdyZWVzLCBjb29yZGluYXRlc1sxXSAqPSBkM19kZWdyZWVzLCBjb29yZGluYXRlcztcbiAgICB9O1xuICAgIHJldHVybiBmb3J3YXJkO1xuICB9O1xuICBmdW5jdGlvbiBkM19nZW9faWRlbnRpdHlSb3RhdGlvbijOuywgz4YpIHtcbiAgICByZXR1cm4gWyDOuyA+IM+AID8gzrsgLSDPhCA6IM67IDwgLc+AID8gzrsgKyDPhCA6IM67LCDPhiBdO1xuICB9XG4gIGQzX2dlb19pZGVudGl0eVJvdGF0aW9uLmludmVydCA9IGQzX2dlb19lcXVpcmVjdGFuZ3VsYXI7XG4gIGZ1bmN0aW9uIGQzX2dlb19yb3RhdGlvbijOtM67LCDOtM+GLCDOtM6zKSB7XG4gICAgcmV0dXJuIM60zrsgPyDOtM+GIHx8IM60zrMgPyBkM19nZW9fY29tcG9zZShkM19nZW9fcm90YXRpb27OuyjOtM67KSwgZDNfZ2VvX3JvdGF0aW9uz4bOsyjOtM+GLCDOtM6zKSkgOiBkM19nZW9fcm90YXRpb27OuyjOtM67KSA6IM60z4YgfHwgzrTOsyA/IGQzX2dlb19yb3RhdGlvbs+GzrMozrTPhiwgzrTOsykgOiBkM19nZW9faWRlbnRpdHlSb3RhdGlvbjtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fZm9yd2FyZFJvdGF0aW9uzrsozrTOuykge1xuICAgIHJldHVybiBmdW5jdGlvbijOuywgz4YpIHtcbiAgICAgIHJldHVybiDOuyArPSDOtM67LCBbIM67ID4gz4AgPyDOuyAtIM+EIDogzrsgPCAtz4AgPyDOuyArIM+EIDogzrssIM+GIF07XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fcm90YXRpb27OuyjOtM67KSB7XG4gICAgdmFyIHJvdGF0aW9uID0gZDNfZ2VvX2ZvcndhcmRSb3RhdGlvbs67KM60zrspO1xuICAgIHJvdGF0aW9uLmludmVydCA9IGQzX2dlb19mb3J3YXJkUm90YXRpb27OuygtzrTOuyk7XG4gICAgcmV0dXJuIHJvdGF0aW9uO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb19yb3RhdGlvbs+GzrMozrTPhiwgzrTOsykge1xuICAgIHZhciBjb3POtM+GID0gTWF0aC5jb3MozrTPhiksIHNpbs60z4YgPSBNYXRoLnNpbijOtM+GKSwgY29zzrTOsyA9IE1hdGguY29zKM60zrMpLCBzaW7OtM6zID0gTWF0aC5zaW4ozrTOsyk7XG4gICAgZnVuY3Rpb24gcm90YXRpb24ozrssIM+GKSB7XG4gICAgICB2YXIgY29zz4YgPSBNYXRoLmNvcyjPhiksIHggPSBNYXRoLmNvcyjOuykgKiBjb3PPhiwgeSA9IE1hdGguc2luKM67KSAqIGNvc8+GLCB6ID0gTWF0aC5zaW4oz4YpLCBrID0geiAqIGNvc860z4YgKyB4ICogc2luzrTPhjtcbiAgICAgIHJldHVybiBbIE1hdGguYXRhbjIoeSAqIGNvc860zrMgLSBrICogc2luzrTOsywgeCAqIGNvc860z4YgLSB6ICogc2luzrTPhiksIGQzX2FzaW4oayAqIGNvc860zrMgKyB5ICogc2luzrTOsykgXTtcbiAgICB9XG4gICAgcm90YXRpb24uaW52ZXJ0ID0gZnVuY3Rpb24ozrssIM+GKSB7XG4gICAgICB2YXIgY29zz4YgPSBNYXRoLmNvcyjPhiksIHggPSBNYXRoLmNvcyjOuykgKiBjb3PPhiwgeSA9IE1hdGguc2luKM67KSAqIGNvc8+GLCB6ID0gTWF0aC5zaW4oz4YpLCBrID0geiAqIGNvc860zrMgLSB5ICogc2luzrTOsztcbiAgICAgIHJldHVybiBbIE1hdGguYXRhbjIoeSAqIGNvc860zrMgKyB6ICogc2luzrTOsywgeCAqIGNvc860z4YgKyBrICogc2luzrTPhiksIGQzX2FzaW4oayAqIGNvc860z4YgLSB4ICogc2luzrTPhikgXTtcbiAgICB9O1xuICAgIHJldHVybiByb3RhdGlvbjtcbiAgfVxuICBkMy5nZW8uY2lyY2xlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9yaWdpbiA9IFsgMCwgMCBdLCBhbmdsZSwgcHJlY2lzaW9uID0gNiwgaW50ZXJwb2xhdGU7XG4gICAgZnVuY3Rpb24gY2lyY2xlKCkge1xuICAgICAgdmFyIGNlbnRlciA9IHR5cGVvZiBvcmlnaW4gPT09IFwiZnVuY3Rpb25cIiA/IG9yaWdpbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDogb3JpZ2luLCByb3RhdGUgPSBkM19nZW9fcm90YXRpb24oLWNlbnRlclswXSAqIGQzX3JhZGlhbnMsIC1jZW50ZXJbMV0gKiBkM19yYWRpYW5zLCAwKS5pbnZlcnQsIHJpbmcgPSBbXTtcbiAgICAgIGludGVycG9sYXRlKG51bGwsIG51bGwsIDEsIHtcbiAgICAgICAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgICByaW5nLnB1c2goeCA9IHJvdGF0ZSh4LCB5KSk7XG4gICAgICAgICAgeFswXSAqPSBkM19kZWdyZWVzLCB4WzFdICo9IGQzX2RlZ3JlZXM7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJQb2x5Z29uXCIsXG4gICAgICAgIGNvb3JkaW5hdGVzOiBbIHJpbmcgXVxuICAgICAgfTtcbiAgICB9XG4gICAgY2lyY2xlLm9yaWdpbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG9yaWdpbjtcbiAgICAgIG9yaWdpbiA9IHg7XG4gICAgICByZXR1cm4gY2lyY2xlO1xuICAgIH07XG4gICAgY2lyY2xlLmFuZ2xlID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gYW5nbGU7XG4gICAgICBpbnRlcnBvbGF0ZSA9IGQzX2dlb19jaXJjbGVJbnRlcnBvbGF0ZSgoYW5nbGUgPSAreCkgKiBkM19yYWRpYW5zLCBwcmVjaXNpb24gKiBkM19yYWRpYW5zKTtcbiAgICAgIHJldHVybiBjaXJjbGU7XG4gICAgfTtcbiAgICBjaXJjbGUucHJlY2lzaW9uID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gcHJlY2lzaW9uO1xuICAgICAgaW50ZXJwb2xhdGUgPSBkM19nZW9fY2lyY2xlSW50ZXJwb2xhdGUoYW5nbGUgKiBkM19yYWRpYW5zLCAocHJlY2lzaW9uID0gK18pICogZDNfcmFkaWFucyk7XG4gICAgICByZXR1cm4gY2lyY2xlO1xuICAgIH07XG4gICAgcmV0dXJuIGNpcmNsZS5hbmdsZSg5MCk7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2dlb19jaXJjbGVJbnRlcnBvbGF0ZShyYWRpdXMsIHByZWNpc2lvbikge1xuICAgIHZhciBjciA9IE1hdGguY29zKHJhZGl1cyksIHNyID0gTWF0aC5zaW4ocmFkaXVzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oZnJvbSwgdG8sIGRpcmVjdGlvbiwgbGlzdGVuZXIpIHtcbiAgICAgIHZhciBzdGVwID0gZGlyZWN0aW9uICogcHJlY2lzaW9uO1xuICAgICAgaWYgKGZyb20gIT0gbnVsbCkge1xuICAgICAgICBmcm9tID0gZDNfZ2VvX2NpcmNsZUFuZ2xlKGNyLCBmcm9tKTtcbiAgICAgICAgdG8gPSBkM19nZW9fY2lyY2xlQW5nbGUoY3IsIHRvKTtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA+IDAgPyBmcm9tIDwgdG8gOiBmcm9tID4gdG8pIGZyb20gKz0gZGlyZWN0aW9uICogz4Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmcm9tID0gcmFkaXVzICsgZGlyZWN0aW9uICogz4Q7XG4gICAgICAgIHRvID0gcmFkaXVzIC0gLjUgKiBzdGVwO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgcG9pbnQsIHQgPSBmcm9tOyBkaXJlY3Rpb24gPiAwID8gdCA+IHRvIDogdCA8IHRvOyB0IC09IHN0ZXApIHtcbiAgICAgICAgbGlzdGVuZXIucG9pbnQoKHBvaW50ID0gZDNfZ2VvX3NwaGVyaWNhbChbIGNyLCAtc3IgKiBNYXRoLmNvcyh0KSwgLXNyICogTWF0aC5zaW4odCkgXSkpWzBdLCBwb2ludFsxXSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9fY2lyY2xlQW5nbGUoY3IsIHBvaW50KSB7XG4gICAgdmFyIGEgPSBkM19nZW9fY2FydGVzaWFuKHBvaW50KTtcbiAgICBhWzBdIC09IGNyO1xuICAgIGQzX2dlb19jYXJ0ZXNpYW5Ob3JtYWxpemUoYSk7XG4gICAgdmFyIGFuZ2xlID0gZDNfYWNvcygtYVsxXSk7XG4gICAgcmV0dXJuICgoLWFbMl0gPCAwID8gLWFuZ2xlIDogYW5nbGUpICsgMiAqIE1hdGguUEkgLSDOtSkgJSAoMiAqIE1hdGguUEkpO1xuICB9XG4gIGQzLmdlby5kaXN0YW5jZSA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICB2YXIgzpTOuyA9IChiWzBdIC0gYVswXSkgKiBkM19yYWRpYW5zLCDPhjAgPSBhWzFdICogZDNfcmFkaWFucywgz4YxID0gYlsxXSAqIGQzX3JhZGlhbnMsIHNpbs6UzrsgPSBNYXRoLnNpbijOlM67KSwgY29zzpTOuyA9IE1hdGguY29zKM6UzrspLCBzaW7PhjAgPSBNYXRoLnNpbijPhjApLCBjb3PPhjAgPSBNYXRoLmNvcyjPhjApLCBzaW7PhjEgPSBNYXRoLnNpbijPhjEpLCBjb3PPhjEgPSBNYXRoLmNvcyjPhjEpLCB0O1xuICAgIHJldHVybiBNYXRoLmF0YW4yKE1hdGguc3FydCgodCA9IGNvc8+GMSAqIHNpbs6UzrspICogdCArICh0ID0gY29zz4YwICogc2luz4YxIC0gc2luz4YwICogY29zz4YxICogY29zzpTOuykgKiB0KSwgc2luz4YwICogc2luz4YxICsgY29zz4YwICogY29zz4YxICogY29zzpTOuyk7XG4gIH07XG4gIGQzLmdlby5ncmF0aWN1bGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgeDEsIHgwLCBYMSwgWDAsIHkxLCB5MCwgWTEsIFkwLCBkeCA9IDEwLCBkeSA9IGR4LCBEWCA9IDkwLCBEWSA9IDM2MCwgeCwgeSwgWCwgWSwgcHJlY2lzaW9uID0gMi41O1xuICAgIGZ1bmN0aW9uIGdyYXRpY3VsZSgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwiTXVsdGlMaW5lU3RyaW5nXCIsXG4gICAgICAgIGNvb3JkaW5hdGVzOiBsaW5lcygpXG4gICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBsaW5lcygpIHtcbiAgICAgIHJldHVybiBkMy5yYW5nZShNYXRoLmNlaWwoWDAgLyBEWCkgKiBEWCwgWDEsIERYKS5tYXAoWCkuY29uY2F0KGQzLnJhbmdlKE1hdGguY2VpbChZMCAvIERZKSAqIERZLCBZMSwgRFkpLm1hcChZKSkuY29uY2F0KGQzLnJhbmdlKE1hdGguY2VpbCh4MCAvIGR4KSAqIGR4LCB4MSwgZHgpLmZpbHRlcihmdW5jdGlvbih4KSB7XG4gICAgICAgIHJldHVybiBhYnMoeCAlIERYKSA+IM61O1xuICAgICAgfSkubWFwKHgpKS5jb25jYXQoZDMucmFuZ2UoTWF0aC5jZWlsKHkwIC8gZHkpICogZHksIHkxLCBkeSkuZmlsdGVyKGZ1bmN0aW9uKHkpIHtcbiAgICAgICAgcmV0dXJuIGFicyh5ICUgRFkpID4gzrU7XG4gICAgICB9KS5tYXAoeSkpO1xuICAgIH1cbiAgICBncmF0aWN1bGUubGluZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBsaW5lcygpLm1hcChmdW5jdGlvbihjb29yZGluYXRlcykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHR5cGU6IFwiTGluZVN0cmluZ1wiLFxuICAgICAgICAgIGNvb3JkaW5hdGVzOiBjb29yZGluYXRlc1xuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfTtcbiAgICBncmF0aWN1bGUub3V0bGluZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJQb2x5Z29uXCIsXG4gICAgICAgIGNvb3JkaW5hdGVzOiBbIFgoWDApLmNvbmNhdChZKFkxKS5zbGljZSgxKSwgWChYMSkucmV2ZXJzZSgpLnNsaWNlKDEpLCBZKFkwKS5yZXZlcnNlKCkuc2xpY2UoMSkpIF1cbiAgICAgIH07XG4gICAgfTtcbiAgICBncmF0aWN1bGUuZXh0ZW50ID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZ3JhdGljdWxlLm1pbm9yRXh0ZW50KCk7XG4gICAgICByZXR1cm4gZ3JhdGljdWxlLm1ham9yRXh0ZW50KF8pLm1pbm9yRXh0ZW50KF8pO1xuICAgIH07XG4gICAgZ3JhdGljdWxlLm1ham9yRXh0ZW50ID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gWyBbIFgwLCBZMCBdLCBbIFgxLCBZMSBdIF07XG4gICAgICBYMCA9ICtfWzBdWzBdLCBYMSA9ICtfWzFdWzBdO1xuICAgICAgWTAgPSArX1swXVsxXSwgWTEgPSArX1sxXVsxXTtcbiAgICAgIGlmIChYMCA+IFgxKSBfID0gWDAsIFgwID0gWDEsIFgxID0gXztcbiAgICAgIGlmIChZMCA+IFkxKSBfID0gWTAsIFkwID0gWTEsIFkxID0gXztcbiAgICAgIHJldHVybiBncmF0aWN1bGUucHJlY2lzaW9uKHByZWNpc2lvbik7XG4gICAgfTtcbiAgICBncmF0aWN1bGUubWlub3JFeHRlbnQgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBbIFsgeDAsIHkwIF0sIFsgeDEsIHkxIF0gXTtcbiAgICAgIHgwID0gK19bMF1bMF0sIHgxID0gK19bMV1bMF07XG4gICAgICB5MCA9ICtfWzBdWzFdLCB5MSA9ICtfWzFdWzFdO1xuICAgICAgaWYgKHgwID4geDEpIF8gPSB4MCwgeDAgPSB4MSwgeDEgPSBfO1xuICAgICAgaWYgKHkwID4geTEpIF8gPSB5MCwgeTAgPSB5MSwgeTEgPSBfO1xuICAgICAgcmV0dXJuIGdyYXRpY3VsZS5wcmVjaXNpb24ocHJlY2lzaW9uKTtcbiAgICB9O1xuICAgIGdyYXRpY3VsZS5zdGVwID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZ3JhdGljdWxlLm1pbm9yU3RlcCgpO1xuICAgICAgcmV0dXJuIGdyYXRpY3VsZS5tYWpvclN0ZXAoXykubWlub3JTdGVwKF8pO1xuICAgIH07XG4gICAgZ3JhdGljdWxlLm1ham9yU3RlcCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIFsgRFgsIERZIF07XG4gICAgICBEWCA9ICtfWzBdLCBEWSA9ICtfWzFdO1xuICAgICAgcmV0dXJuIGdyYXRpY3VsZTtcbiAgICB9O1xuICAgIGdyYXRpY3VsZS5taW5vclN0ZXAgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBbIGR4LCBkeSBdO1xuICAgICAgZHggPSArX1swXSwgZHkgPSArX1sxXTtcbiAgICAgIHJldHVybiBncmF0aWN1bGU7XG4gICAgfTtcbiAgICBncmF0aWN1bGUucHJlY2lzaW9uID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gcHJlY2lzaW9uO1xuICAgICAgcHJlY2lzaW9uID0gK187XG4gICAgICB4ID0gZDNfZ2VvX2dyYXRpY3VsZVgoeTAsIHkxLCA5MCk7XG4gICAgICB5ID0gZDNfZ2VvX2dyYXRpY3VsZVkoeDAsIHgxLCBwcmVjaXNpb24pO1xuICAgICAgWCA9IGQzX2dlb19ncmF0aWN1bGVYKFkwLCBZMSwgOTApO1xuICAgICAgWSA9IGQzX2dlb19ncmF0aWN1bGVZKFgwLCBYMSwgcHJlY2lzaW9uKTtcbiAgICAgIHJldHVybiBncmF0aWN1bGU7XG4gICAgfTtcbiAgICByZXR1cm4gZ3JhdGljdWxlLm1ham9yRXh0ZW50KFsgWyAtMTgwLCAtOTAgKyDOtSBdLCBbIDE4MCwgOTAgLSDOtSBdIF0pLm1pbm9yRXh0ZW50KFsgWyAtMTgwLCAtODAgLSDOtSBdLCBbIDE4MCwgODAgKyDOtSBdIF0pO1xuICB9O1xuICBmdW5jdGlvbiBkM19nZW9fZ3JhdGljdWxlWCh5MCwgeTEsIGR5KSB7XG4gICAgdmFyIHkgPSBkMy5yYW5nZSh5MCwgeTEgLSDOtSwgZHkpLmNvbmNhdCh5MSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB5Lm1hcChmdW5jdGlvbih5KSB7XG4gICAgICAgIHJldHVybiBbIHgsIHkgXTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvX2dyYXRpY3VsZVkoeDAsIHgxLCBkeCkge1xuICAgIHZhciB4ID0gZDMucmFuZ2UoeDAsIHgxIC0gzrUsIGR4KS5jb25jYXQoeDEpO1xuICAgIHJldHVybiBmdW5jdGlvbih5KSB7XG4gICAgICByZXR1cm4geC5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICByZXR1cm4gWyB4LCB5IF07XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGQzX3NvdXJjZShkKSB7XG4gICAgcmV0dXJuIGQuc291cmNlO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3RhcmdldChkKSB7XG4gICAgcmV0dXJuIGQudGFyZ2V0O1xuICB9XG4gIGQzLmdlby5ncmVhdEFyYyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzb3VyY2UgPSBkM19zb3VyY2UsIHNvdXJjZV8sIHRhcmdldCA9IGQzX3RhcmdldCwgdGFyZ2V0XztcbiAgICBmdW5jdGlvbiBncmVhdEFyYygpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwiTGluZVN0cmluZ1wiLFxuICAgICAgICBjb29yZGluYXRlczogWyBzb3VyY2VfIHx8IHNvdXJjZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpLCB0YXJnZXRfIHx8IHRhcmdldC5hcHBseSh0aGlzLCBhcmd1bWVudHMpIF1cbiAgICAgIH07XG4gICAgfVxuICAgIGdyZWF0QXJjLmRpc3RhbmNlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZDMuZ2VvLmRpc3RhbmNlKHNvdXJjZV8gfHwgc291cmNlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksIHRhcmdldF8gfHwgdGFyZ2V0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gICAgZ3JlYXRBcmMuc291cmNlID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gc291cmNlO1xuICAgICAgc291cmNlID0gXywgc291cmNlXyA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBudWxsIDogXztcbiAgICAgIHJldHVybiBncmVhdEFyYztcbiAgICB9O1xuICAgIGdyZWF0QXJjLnRhcmdldCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRhcmdldDtcbiAgICAgIHRhcmdldCA9IF8sIHRhcmdldF8gPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gbnVsbCA6IF87XG4gICAgICByZXR1cm4gZ3JlYXRBcmM7XG4gICAgfTtcbiAgICBncmVhdEFyYy5wcmVjaXNpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gZ3JlYXRBcmMgOiAwO1xuICAgIH07XG4gICAgcmV0dXJuIGdyZWF0QXJjO1xuICB9O1xuICBkMy5nZW8uaW50ZXJwb2xhdGUgPSBmdW5jdGlvbihzb3VyY2UsIHRhcmdldCkge1xuICAgIHJldHVybiBkM19nZW9faW50ZXJwb2xhdGUoc291cmNlWzBdICogZDNfcmFkaWFucywgc291cmNlWzFdICogZDNfcmFkaWFucywgdGFyZ2V0WzBdICogZDNfcmFkaWFucywgdGFyZ2V0WzFdICogZDNfcmFkaWFucyk7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2dlb19pbnRlcnBvbGF0ZSh4MCwgeTAsIHgxLCB5MSkge1xuICAgIHZhciBjeTAgPSBNYXRoLmNvcyh5MCksIHN5MCA9IE1hdGguc2luKHkwKSwgY3kxID0gTWF0aC5jb3MoeTEpLCBzeTEgPSBNYXRoLnNpbih5MSksIGt4MCA9IGN5MCAqIE1hdGguY29zKHgwKSwga3kwID0gY3kwICogTWF0aC5zaW4oeDApLCBreDEgPSBjeTEgKiBNYXRoLmNvcyh4MSksIGt5MSA9IGN5MSAqIE1hdGguc2luKHgxKSwgZCA9IDIgKiBNYXRoLmFzaW4oTWF0aC5zcXJ0KGQzX2hhdmVyc2luKHkxIC0geTApICsgY3kwICogY3kxICogZDNfaGF2ZXJzaW4oeDEgLSB4MCkpKSwgayA9IDEgLyBNYXRoLnNpbihkKTtcbiAgICB2YXIgaW50ZXJwb2xhdGUgPSBkID8gZnVuY3Rpb24odCkge1xuICAgICAgdmFyIEIgPSBNYXRoLnNpbih0ICo9IGQpICogaywgQSA9IE1hdGguc2luKGQgLSB0KSAqIGssIHggPSBBICoga3gwICsgQiAqIGt4MSwgeSA9IEEgKiBreTAgKyBCICoga3kxLCB6ID0gQSAqIHN5MCArIEIgKiBzeTE7XG4gICAgICByZXR1cm4gWyBNYXRoLmF0YW4yKHksIHgpICogZDNfZGVncmVlcywgTWF0aC5hdGFuMih6LCBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSkpICogZDNfZGVncmVlcyBdO1xuICAgIH0gOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBbIHgwICogZDNfZGVncmVlcywgeTAgKiBkM19kZWdyZWVzIF07XG4gICAgfTtcbiAgICBpbnRlcnBvbGF0ZS5kaXN0YW5jZSA9IGQ7XG4gICAgcmV0dXJuIGludGVycG9sYXRlO1xuICB9XG4gIGQzLmdlby5sZW5ndGggPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgICBkM19nZW9fbGVuZ3RoU3VtID0gMDtcbiAgICBkMy5nZW8uc3RyZWFtKG9iamVjdCwgZDNfZ2VvX2xlbmd0aCk7XG4gICAgcmV0dXJuIGQzX2dlb19sZW5ndGhTdW07XG4gIH07XG4gIHZhciBkM19nZW9fbGVuZ3RoU3VtO1xuICB2YXIgZDNfZ2VvX2xlbmd0aCA9IHtcbiAgICBzcGhlcmU6IGQzX25vb3AsXG4gICAgcG9pbnQ6IGQzX25vb3AsXG4gICAgbGluZVN0YXJ0OiBkM19nZW9fbGVuZ3RoTGluZVN0YXJ0LFxuICAgIGxpbmVFbmQ6IGQzX25vb3AsXG4gICAgcG9seWdvblN0YXJ0OiBkM19ub29wLFxuICAgIHBvbHlnb25FbmQ6IGQzX25vb3BcbiAgfTtcbiAgZnVuY3Rpb24gZDNfZ2VvX2xlbmd0aExpbmVTdGFydCgpIHtcbiAgICB2YXIgzrswLCBzaW7PhjAsIGNvc8+GMDtcbiAgICBkM19nZW9fbGVuZ3RoLnBvaW50ID0gZnVuY3Rpb24ozrssIM+GKSB7XG4gICAgICDOuzAgPSDOuyAqIGQzX3JhZGlhbnMsIHNpbs+GMCA9IE1hdGguc2luKM+GICo9IGQzX3JhZGlhbnMpLCBjb3PPhjAgPSBNYXRoLmNvcyjPhik7XG4gICAgICBkM19nZW9fbGVuZ3RoLnBvaW50ID0gbmV4dFBvaW50O1xuICAgIH07XG4gICAgZDNfZ2VvX2xlbmd0aC5saW5lRW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICBkM19nZW9fbGVuZ3RoLnBvaW50ID0gZDNfZ2VvX2xlbmd0aC5saW5lRW5kID0gZDNfbm9vcDtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIG5leHRQb2ludCjOuywgz4YpIHtcbiAgICAgIHZhciBzaW7PhiA9IE1hdGguc2luKM+GICo9IGQzX3JhZGlhbnMpLCBjb3PPhiA9IE1hdGguY29zKM+GKSwgdCA9IGFicygozrsgKj0gZDNfcmFkaWFucykgLSDOuzApLCBjb3POlM67ID0gTWF0aC5jb3ModCk7XG4gICAgICBkM19nZW9fbGVuZ3RoU3VtICs9IE1hdGguYXRhbjIoTWF0aC5zcXJ0KCh0ID0gY29zz4YgKiBNYXRoLnNpbih0KSkgKiB0ICsgKHQgPSBjb3PPhjAgKiBzaW7PhiAtIHNpbs+GMCAqIGNvc8+GICogY29zzpTOuykgKiB0KSwgc2luz4YwICogc2luz4YgKyBjb3PPhjAgKiBjb3PPhiAqIGNvc86UzrspO1xuICAgICAgzrswID0gzrssIHNpbs+GMCA9IHNpbs+GLCBjb3PPhjAgPSBjb3PPhjtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvX2F6aW11dGhhbChzY2FsZSwgYW5nbGUpIHtcbiAgICBmdW5jdGlvbiBhemltdXRoYWwozrssIM+GKSB7XG4gICAgICB2YXIgY29zzrsgPSBNYXRoLmNvcyjOuyksIGNvc8+GID0gTWF0aC5jb3Moz4YpLCBrID0gc2NhbGUoY29zzrsgKiBjb3PPhik7XG4gICAgICByZXR1cm4gWyBrICogY29zz4YgKiBNYXRoLnNpbijOuyksIGsgKiBNYXRoLnNpbijPhikgXTtcbiAgICB9XG4gICAgYXppbXV0aGFsLmludmVydCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgIHZhciDPgSA9IE1hdGguc3FydCh4ICogeCArIHkgKiB5KSwgYyA9IGFuZ2xlKM+BKSwgc2luYyA9IE1hdGguc2luKGMpLCBjb3NjID0gTWF0aC5jb3MoYyk7XG4gICAgICByZXR1cm4gWyBNYXRoLmF0YW4yKHggKiBzaW5jLCDPgSAqIGNvc2MpLCBNYXRoLmFzaW4oz4EgJiYgeSAqIHNpbmMgLyDPgSkgXTtcbiAgICB9O1xuICAgIHJldHVybiBhemltdXRoYWw7XG4gIH1cbiAgdmFyIGQzX2dlb19hemltdXRoYWxFcXVhbEFyZWEgPSBkM19nZW9fYXppbXV0aGFsKGZ1bmN0aW9uKGNvc867Y29zz4YpIHtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KDIgLyAoMSArIGNvc867Y29zz4YpKTtcbiAgfSwgZnVuY3Rpb24oz4EpIHtcbiAgICByZXR1cm4gMiAqIE1hdGguYXNpbijPgSAvIDIpO1xuICB9KTtcbiAgKGQzLmdlby5hemltdXRoYWxFcXVhbEFyZWEgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZDNfZ2VvX3Byb2plY3Rpb24oZDNfZ2VvX2F6aW11dGhhbEVxdWFsQXJlYSk7XG4gIH0pLnJhdyA9IGQzX2dlb19hemltdXRoYWxFcXVhbEFyZWE7XG4gIHZhciBkM19nZW9fYXppbXV0aGFsRXF1aWRpc3RhbnQgPSBkM19nZW9fYXppbXV0aGFsKGZ1bmN0aW9uKGNvc867Y29zz4YpIHtcbiAgICB2YXIgYyA9IE1hdGguYWNvcyhjb3POu2Nvc8+GKTtcbiAgICByZXR1cm4gYyAmJiBjIC8gTWF0aC5zaW4oYyk7XG4gIH0sIGQzX2lkZW50aXR5KTtcbiAgKGQzLmdlby5hemltdXRoYWxFcXVpZGlzdGFudCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkM19nZW9fcHJvamVjdGlvbihkM19nZW9fYXppbXV0aGFsRXF1aWRpc3RhbnQpO1xuICB9KS5yYXcgPSBkM19nZW9fYXppbXV0aGFsRXF1aWRpc3RhbnQ7XG4gIGZ1bmN0aW9uIGQzX2dlb19jb25pY0NvbmZvcm1hbCjPhjAsIM+GMSkge1xuICAgIHZhciBjb3PPhjAgPSBNYXRoLmNvcyjPhjApLCB0ID0gZnVuY3Rpb24oz4YpIHtcbiAgICAgIHJldHVybiBNYXRoLnRhbijPgCAvIDQgKyDPhiAvIDIpO1xuICAgIH0sIG4gPSDPhjAgPT09IM+GMSA/IE1hdGguc2luKM+GMCkgOiBNYXRoLmxvZyhjb3PPhjAgLyBNYXRoLmNvcyjPhjEpKSAvIE1hdGgubG9nKHQoz4YxKSAvIHQoz4YwKSksIEYgPSBjb3PPhjAgKiBNYXRoLnBvdyh0KM+GMCksIG4pIC8gbjtcbiAgICBpZiAoIW4pIHJldHVybiBkM19nZW9fbWVyY2F0b3I7XG4gICAgZnVuY3Rpb24gZm9yd2FyZCjOuywgz4YpIHtcbiAgICAgIHZhciDPgSA9IGFicyhhYnMoz4YpIC0gaGFsZs+AKSA8IM61ID8gMCA6IEYgLyBNYXRoLnBvdyh0KM+GKSwgbik7XG4gICAgICByZXR1cm4gWyDPgSAqIE1hdGguc2luKG4gKiDOuyksIEYgLSDPgSAqIE1hdGguY29zKG4gKiDOuykgXTtcbiAgICB9XG4gICAgZm9yd2FyZC5pbnZlcnQgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICB2YXIgz4EwX3kgPSBGIC0geSwgz4EgPSBkM19zZ24obikgKiBNYXRoLnNxcnQoeCAqIHggKyDPgTBfeSAqIM+BMF95KTtcbiAgICAgIHJldHVybiBbIE1hdGguYXRhbjIoeCwgz4EwX3kpIC8gbiwgMiAqIE1hdGguYXRhbihNYXRoLnBvdyhGIC8gz4EsIDEgLyBuKSkgLSBoYWxmz4AgXTtcbiAgICB9O1xuICAgIHJldHVybiBmb3J3YXJkO1xuICB9XG4gIChkMy5nZW8uY29uaWNDb25mb3JtYWwgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZDNfZ2VvX2NvbmljKGQzX2dlb19jb25pY0NvbmZvcm1hbCk7XG4gIH0pLnJhdyA9IGQzX2dlb19jb25pY0NvbmZvcm1hbDtcbiAgZnVuY3Rpb24gZDNfZ2VvX2NvbmljRXF1aWRpc3RhbnQoz4YwLCDPhjEpIHtcbiAgICB2YXIgY29zz4YwID0gTWF0aC5jb3Moz4YwKSwgbiA9IM+GMCA9PT0gz4YxID8gTWF0aC5zaW4oz4YwKSA6IChjb3PPhjAgLSBNYXRoLmNvcyjPhjEpKSAvICjPhjEgLSDPhjApLCBHID0gY29zz4YwIC8gbiArIM+GMDtcbiAgICBpZiAoYWJzKG4pIDwgzrUpIHJldHVybiBkM19nZW9fZXF1aXJlY3Rhbmd1bGFyO1xuICAgIGZ1bmN0aW9uIGZvcndhcmQozrssIM+GKSB7XG4gICAgICB2YXIgz4EgPSBHIC0gz4Y7XG4gICAgICByZXR1cm4gWyDPgSAqIE1hdGguc2luKG4gKiDOuyksIEcgLSDPgSAqIE1hdGguY29zKG4gKiDOuykgXTtcbiAgICB9XG4gICAgZm9yd2FyZC5pbnZlcnQgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICB2YXIgz4EwX3kgPSBHIC0geTtcbiAgICAgIHJldHVybiBbIE1hdGguYXRhbjIoeCwgz4EwX3kpIC8gbiwgRyAtIGQzX3NnbihuKSAqIE1hdGguc3FydCh4ICogeCArIM+BMF95ICogz4EwX3kpIF07XG4gICAgfTtcbiAgICByZXR1cm4gZm9yd2FyZDtcbiAgfVxuICAoZDMuZ2VvLmNvbmljRXF1aWRpc3RhbnQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZDNfZ2VvX2NvbmljKGQzX2dlb19jb25pY0VxdWlkaXN0YW50KTtcbiAgfSkucmF3ID0gZDNfZ2VvX2NvbmljRXF1aWRpc3RhbnQ7XG4gIHZhciBkM19nZW9fZ25vbW9uaWMgPSBkM19nZW9fYXppbXV0aGFsKGZ1bmN0aW9uKGNvc867Y29zz4YpIHtcbiAgICByZXR1cm4gMSAvIGNvc867Y29zz4Y7XG4gIH0sIE1hdGguYXRhbik7XG4gIChkMy5nZW8uZ25vbW9uaWMgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZDNfZ2VvX3Byb2plY3Rpb24oZDNfZ2VvX2dub21vbmljKTtcbiAgfSkucmF3ID0gZDNfZ2VvX2dub21vbmljO1xuICBmdW5jdGlvbiBkM19nZW9fbWVyY2F0b3IozrssIM+GKSB7XG4gICAgcmV0dXJuIFsgzrssIE1hdGgubG9nKE1hdGgudGFuKM+AIC8gNCArIM+GIC8gMikpIF07XG4gIH1cbiAgZDNfZ2VvX21lcmNhdG9yLmludmVydCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICByZXR1cm4gWyB4LCAyICogTWF0aC5hdGFuKE1hdGguZXhwKHkpKSAtIGhhbGbPgCBdO1xuICB9O1xuICBmdW5jdGlvbiBkM19nZW9fbWVyY2F0b3JQcm9qZWN0aW9uKHByb2plY3QpIHtcbiAgICB2YXIgbSA9IGQzX2dlb19wcm9qZWN0aW9uKHByb2plY3QpLCBzY2FsZSA9IG0uc2NhbGUsIHRyYW5zbGF0ZSA9IG0udHJhbnNsYXRlLCBjbGlwRXh0ZW50ID0gbS5jbGlwRXh0ZW50LCBjbGlwQXV0bztcbiAgICBtLnNjYWxlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdiA9IHNjYWxlLmFwcGx5KG0sIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gdiA9PT0gbSA/IGNsaXBBdXRvID8gbS5jbGlwRXh0ZW50KG51bGwpIDogbSA6IHY7XG4gICAgfTtcbiAgICBtLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHYgPSB0cmFuc2xhdGUuYXBwbHkobSwgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiB2ID09PSBtID8gY2xpcEF1dG8gPyBtLmNsaXBFeHRlbnQobnVsbCkgOiBtIDogdjtcbiAgICB9O1xuICAgIG0uY2xpcEV4dGVudCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHZhciB2ID0gY2xpcEV4dGVudC5hcHBseShtLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKHYgPT09IG0pIHtcbiAgICAgICAgaWYgKGNsaXBBdXRvID0gXyA9PSBudWxsKSB7XG4gICAgICAgICAgdmFyIGsgPSDPgCAqIHNjYWxlKCksIHQgPSB0cmFuc2xhdGUoKTtcbiAgICAgICAgICBjbGlwRXh0ZW50KFsgWyB0WzBdIC0gaywgdFsxXSAtIGsgXSwgWyB0WzBdICsgaywgdFsxXSArIGsgXSBdKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjbGlwQXV0bykge1xuICAgICAgICB2ID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2O1xuICAgIH07XG4gICAgcmV0dXJuIG0uY2xpcEV4dGVudChudWxsKTtcbiAgfVxuICAoZDMuZ2VvLm1lcmNhdG9yID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX2dlb19tZXJjYXRvclByb2plY3Rpb24oZDNfZ2VvX21lcmNhdG9yKTtcbiAgfSkucmF3ID0gZDNfZ2VvX21lcmNhdG9yO1xuICB2YXIgZDNfZ2VvX29ydGhvZ3JhcGhpYyA9IGQzX2dlb19hemltdXRoYWwoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIDE7XG4gIH0sIE1hdGguYXNpbik7XG4gIChkMy5nZW8ub3J0aG9ncmFwaGljID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX2dlb19wcm9qZWN0aW9uKGQzX2dlb19vcnRob2dyYXBoaWMpO1xuICB9KS5yYXcgPSBkM19nZW9fb3J0aG9ncmFwaGljO1xuICB2YXIgZDNfZ2VvX3N0ZXJlb2dyYXBoaWMgPSBkM19nZW9fYXppbXV0aGFsKGZ1bmN0aW9uKGNvc867Y29zz4YpIHtcbiAgICByZXR1cm4gMSAvICgxICsgY29zzrtjb3PPhik7XG4gIH0sIGZ1bmN0aW9uKM+BKSB7XG4gICAgcmV0dXJuIDIgKiBNYXRoLmF0YW4oz4EpO1xuICB9KTtcbiAgKGQzLmdlby5zdGVyZW9ncmFwaGljID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX2dlb19wcm9qZWN0aW9uKGQzX2dlb19zdGVyZW9ncmFwaGljKTtcbiAgfSkucmF3ID0gZDNfZ2VvX3N0ZXJlb2dyYXBoaWM7XG4gIGZ1bmN0aW9uIGQzX2dlb190cmFuc3ZlcnNlTWVyY2F0b3IozrssIM+GKSB7XG4gICAgcmV0dXJuIFsgTWF0aC5sb2coTWF0aC50YW4oz4AgLyA0ICsgz4YgLyAyKSksIC3OuyBdO1xuICB9XG4gIGQzX2dlb190cmFuc3ZlcnNlTWVyY2F0b3IuaW52ZXJ0ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiBbIC15LCAyICogTWF0aC5hdGFuKE1hdGguZXhwKHgpKSAtIGhhbGbPgCBdO1xuICB9O1xuICAoZDMuZ2VvLnRyYW5zdmVyc2VNZXJjYXRvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwcm9qZWN0aW9uID0gZDNfZ2VvX21lcmNhdG9yUHJvamVjdGlvbihkM19nZW9fdHJhbnN2ZXJzZU1lcmNhdG9yKSwgY2VudGVyID0gcHJvamVjdGlvbi5jZW50ZXIsIHJvdGF0ZSA9IHByb2plY3Rpb24ucm90YXRlO1xuICAgIHByb2plY3Rpb24uY2VudGVyID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIF8gPyBjZW50ZXIoWyAtX1sxXSwgX1swXSBdKSA6IChfID0gY2VudGVyKCksIFsgLV9bMV0sIF9bMF0gXSk7XG4gICAgfTtcbiAgICBwcm9qZWN0aW9uLnJvdGF0ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBfID8gcm90YXRlKFsgX1swXSwgX1sxXSwgXy5sZW5ndGggPiAyID8gX1syXSArIDkwIDogOTAgXSkgOiAoXyA9IHJvdGF0ZSgpLCBcbiAgICAgIFsgX1swXSwgX1sxXSwgX1syXSAtIDkwIF0pO1xuICAgIH07XG4gICAgcmV0dXJuIHByb2plY3Rpb24ucm90YXRlKFsgMCwgMCBdKTtcbiAgfSkucmF3ID0gZDNfZ2VvX3RyYW5zdmVyc2VNZXJjYXRvcjtcbiAgZDMuZ2VvbSA9IHt9O1xuICBmdW5jdGlvbiBkM19nZW9tX3BvaW50WChkKSB7XG4gICAgcmV0dXJuIGRbMF07XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvbV9wb2ludFkoZCkge1xuICAgIHJldHVybiBkWzFdO1xuICB9XG4gIGQzLmdlb20uaHVsbCA9IGZ1bmN0aW9uKHZlcnRpY2VzKSB7XG4gICAgdmFyIHggPSBkM19nZW9tX3BvaW50WCwgeSA9IGQzX2dlb21fcG9pbnRZO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaHVsbCh2ZXJ0aWNlcyk7XG4gICAgZnVuY3Rpb24gaHVsbChkYXRhKSB7XG4gICAgICBpZiAoZGF0YS5sZW5ndGggPCAzKSByZXR1cm4gW107XG4gICAgICB2YXIgZnggPSBkM19mdW5jdG9yKHgpLCBmeSA9IGQzX2Z1bmN0b3IoeSksIGksIG4gPSBkYXRhLmxlbmd0aCwgcG9pbnRzID0gW10sIGZsaXBwZWRQb2ludHMgPSBbXTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgcG9pbnRzLnB1c2goWyArZnguY2FsbCh0aGlzLCBkYXRhW2ldLCBpKSwgK2Z5LmNhbGwodGhpcywgZGF0YVtpXSwgaSksIGkgXSk7XG4gICAgICB9XG4gICAgICBwb2ludHMuc29ydChkM19nZW9tX2h1bGxPcmRlcik7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbjsgaSsrKSBmbGlwcGVkUG9pbnRzLnB1c2goWyBwb2ludHNbaV1bMF0sIC1wb2ludHNbaV1bMV0gXSk7XG4gICAgICB2YXIgdXBwZXIgPSBkM19nZW9tX2h1bGxVcHBlcihwb2ludHMpLCBsb3dlciA9IGQzX2dlb21faHVsbFVwcGVyKGZsaXBwZWRQb2ludHMpO1xuICAgICAgdmFyIHNraXBMZWZ0ID0gbG93ZXJbMF0gPT09IHVwcGVyWzBdLCBza2lwUmlnaHQgPSBsb3dlcltsb3dlci5sZW5ndGggLSAxXSA9PT0gdXBwZXJbdXBwZXIubGVuZ3RoIC0gMV0sIHBvbHlnb24gPSBbXTtcbiAgICAgIGZvciAoaSA9IHVwcGVyLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSBwb2x5Z29uLnB1c2goZGF0YVtwb2ludHNbdXBwZXJbaV1dWzJdXSk7XG4gICAgICBmb3IgKGkgPSArc2tpcExlZnQ7IGkgPCBsb3dlci5sZW5ndGggLSBza2lwUmlnaHQ7ICsraSkgcG9seWdvbi5wdXNoKGRhdGFbcG9pbnRzW2xvd2VyW2ldXVsyXV0pO1xuICAgICAgcmV0dXJuIHBvbHlnb247XG4gICAgfVxuICAgIGh1bGwueCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHggPSBfLCBodWxsKSA6IHg7XG4gICAgfTtcbiAgICBodWxsLnkgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh5ID0gXywgaHVsbCkgOiB5O1xuICAgIH07XG4gICAgcmV0dXJuIGh1bGw7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2dlb21faHVsbFVwcGVyKHBvaW50cykge1xuICAgIHZhciBuID0gcG9pbnRzLmxlbmd0aCwgaHVsbCA9IFsgMCwgMSBdLCBocyA9IDI7XG4gICAgZm9yICh2YXIgaSA9IDI7IGkgPCBuOyBpKyspIHtcbiAgICAgIHdoaWxlIChocyA+IDEgJiYgZDNfY3Jvc3MyZChwb2ludHNbaHVsbFtocyAtIDJdXSwgcG9pbnRzW2h1bGxbaHMgLSAxXV0sIHBvaW50c1tpXSkgPD0gMCkgLS1ocztcbiAgICAgIGh1bGxbaHMrK10gPSBpO1xuICAgIH1cbiAgICByZXR1cm4gaHVsbC5zbGljZSgwLCBocyk7XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvbV9odWxsT3JkZXIoYSwgYikge1xuICAgIHJldHVybiBhWzBdIC0gYlswXSB8fCBhWzFdIC0gYlsxXTtcbiAgfVxuICBkMy5nZW9tLnBvbHlnb24gPSBmdW5jdGlvbihjb29yZGluYXRlcykge1xuICAgIGQzX3N1YmNsYXNzKGNvb3JkaW5hdGVzLCBkM19nZW9tX3BvbHlnb25Qcm90b3R5cGUpO1xuICAgIHJldHVybiBjb29yZGluYXRlcztcbiAgfTtcbiAgdmFyIGQzX2dlb21fcG9seWdvblByb3RvdHlwZSA9IGQzLmdlb20ucG9seWdvbi5wcm90b3R5cGUgPSBbXTtcbiAgZDNfZ2VvbV9wb2x5Z29uUHJvdG90eXBlLmFyZWEgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaSA9IC0xLCBuID0gdGhpcy5sZW5ndGgsIGEsIGIgPSB0aGlzW24gLSAxXSwgYXJlYSA9IDA7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGEgPSBiO1xuICAgICAgYiA9IHRoaXNbaV07XG4gICAgICBhcmVhICs9IGFbMV0gKiBiWzBdIC0gYVswXSAqIGJbMV07XG4gICAgfVxuICAgIHJldHVybiBhcmVhICogLjU7XG4gIH07XG4gIGQzX2dlb21fcG9seWdvblByb3RvdHlwZS5jZW50cm9pZCA9IGZ1bmN0aW9uKGspIHtcbiAgICB2YXIgaSA9IC0xLCBuID0gdGhpcy5sZW5ndGgsIHggPSAwLCB5ID0gMCwgYSwgYiA9IHRoaXNbbiAtIDFdLCBjO1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgayA9IC0xIC8gKDYgKiB0aGlzLmFyZWEoKSk7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGEgPSBiO1xuICAgICAgYiA9IHRoaXNbaV07XG4gICAgICBjID0gYVswXSAqIGJbMV0gLSBiWzBdICogYVsxXTtcbiAgICAgIHggKz0gKGFbMF0gKyBiWzBdKSAqIGM7XG4gICAgICB5ICs9IChhWzFdICsgYlsxXSkgKiBjO1xuICAgIH1cbiAgICByZXR1cm4gWyB4ICogaywgeSAqIGsgXTtcbiAgfTtcbiAgZDNfZ2VvbV9wb2x5Z29uUHJvdG90eXBlLmNsaXAgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gICAgdmFyIGlucHV0LCBjbG9zZWQgPSBkM19nZW9tX3BvbHlnb25DbG9zZWQoc3ViamVjdCksIGkgPSAtMSwgbiA9IHRoaXMubGVuZ3RoIC0gZDNfZ2VvbV9wb2x5Z29uQ2xvc2VkKHRoaXMpLCBqLCBtLCBhID0gdGhpc1tuIC0gMV0sIGIsIGMsIGQ7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGlucHV0ID0gc3ViamVjdC5zbGljZSgpO1xuICAgICAgc3ViamVjdC5sZW5ndGggPSAwO1xuICAgICAgYiA9IHRoaXNbaV07XG4gICAgICBjID0gaW5wdXRbKG0gPSBpbnB1dC5sZW5ndGggLSBjbG9zZWQpIC0gMV07XG4gICAgICBqID0gLTE7XG4gICAgICB3aGlsZSAoKytqIDwgbSkge1xuICAgICAgICBkID0gaW5wdXRbal07XG4gICAgICAgIGlmIChkM19nZW9tX3BvbHlnb25JbnNpZGUoZCwgYSwgYikpIHtcbiAgICAgICAgICBpZiAoIWQzX2dlb21fcG9seWdvbkluc2lkZShjLCBhLCBiKSkge1xuICAgICAgICAgICAgc3ViamVjdC5wdXNoKGQzX2dlb21fcG9seWdvbkludGVyc2VjdChjLCBkLCBhLCBiKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN1YmplY3QucHVzaChkKTtcbiAgICAgICAgfSBlbHNlIGlmIChkM19nZW9tX3BvbHlnb25JbnNpZGUoYywgYSwgYikpIHtcbiAgICAgICAgICBzdWJqZWN0LnB1c2goZDNfZ2VvbV9wb2x5Z29uSW50ZXJzZWN0KGMsIGQsIGEsIGIpKTtcbiAgICAgICAgfVxuICAgICAgICBjID0gZDtcbiAgICAgIH1cbiAgICAgIGlmIChjbG9zZWQpIHN1YmplY3QucHVzaChzdWJqZWN0WzBdKTtcbiAgICAgIGEgPSBiO1xuICAgIH1cbiAgICByZXR1cm4gc3ViamVjdDtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfZ2VvbV9wb2x5Z29uSW5zaWRlKHAsIGEsIGIpIHtcbiAgICByZXR1cm4gKGJbMF0gLSBhWzBdKSAqIChwWzFdIC0gYVsxXSkgPCAoYlsxXSAtIGFbMV0pICogKHBbMF0gLSBhWzBdKTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3BvbHlnb25JbnRlcnNlY3QoYywgZCwgYSwgYikge1xuICAgIHZhciB4MSA9IGNbMF0sIHgzID0gYVswXSwgeDIxID0gZFswXSAtIHgxLCB4NDMgPSBiWzBdIC0geDMsIHkxID0gY1sxXSwgeTMgPSBhWzFdLCB5MjEgPSBkWzFdIC0geTEsIHk0MyA9IGJbMV0gLSB5MywgdWEgPSAoeDQzICogKHkxIC0geTMpIC0geTQzICogKHgxIC0geDMpKSAvICh5NDMgKiB4MjEgLSB4NDMgKiB5MjEpO1xuICAgIHJldHVybiBbIHgxICsgdWEgKiB4MjEsIHkxICsgdWEgKiB5MjEgXTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3BvbHlnb25DbG9zZWQoY29vcmRpbmF0ZXMpIHtcbiAgICB2YXIgYSA9IGNvb3JkaW5hdGVzWzBdLCBiID0gY29vcmRpbmF0ZXNbY29vcmRpbmF0ZXMubGVuZ3RoIC0gMV07XG4gICAgcmV0dXJuICEoYVswXSAtIGJbMF0gfHwgYVsxXSAtIGJbMV0pO1xuICB9XG4gIHZhciBkM19nZW9tX3Zvcm9ub2lFZGdlcywgZDNfZ2VvbV92b3Jvbm9pQ2VsbHMsIGQzX2dlb21fdm9yb25vaUJlYWNoZXMsIGQzX2dlb21fdm9yb25vaUJlYWNoUG9vbCA9IFtdLCBkM19nZW9tX3Zvcm9ub2lGaXJzdENpcmNsZSwgZDNfZ2VvbV92b3Jvbm9pQ2lyY2xlcywgZDNfZ2VvbV92b3Jvbm9pQ2lyY2xlUG9vbCA9IFtdO1xuICBmdW5jdGlvbiBkM19nZW9tX3Zvcm9ub2lCZWFjaCgpIHtcbiAgICBkM19nZW9tX3Zvcm9ub2lSZWRCbGFja05vZGUodGhpcyk7XG4gICAgdGhpcy5lZGdlID0gdGhpcy5zaXRlID0gdGhpcy5jaXJjbGUgPSBudWxsO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb21fdm9yb25vaUNyZWF0ZUJlYWNoKHNpdGUpIHtcbiAgICB2YXIgYmVhY2ggPSBkM19nZW9tX3Zvcm9ub2lCZWFjaFBvb2wucG9wKCkgfHwgbmV3IGQzX2dlb21fdm9yb25vaUJlYWNoKCk7XG4gICAgYmVhY2guc2l0ZSA9IHNpdGU7XG4gICAgcmV0dXJuIGJlYWNoO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb21fdm9yb25vaURldGFjaEJlYWNoKGJlYWNoKSB7XG4gICAgZDNfZ2VvbV92b3Jvbm9pRGV0YWNoQ2lyY2xlKGJlYWNoKTtcbiAgICBkM19nZW9tX3Zvcm9ub2lCZWFjaGVzLnJlbW92ZShiZWFjaCk7XG4gICAgZDNfZ2VvbV92b3Jvbm9pQmVhY2hQb29sLnB1c2goYmVhY2gpO1xuICAgIGQzX2dlb21fdm9yb25vaVJlZEJsYWNrTm9kZShiZWFjaCk7XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvbV92b3Jvbm9pUmVtb3ZlQmVhY2goYmVhY2gpIHtcbiAgICB2YXIgY2lyY2xlID0gYmVhY2guY2lyY2xlLCB4ID0gY2lyY2xlLngsIHkgPSBjaXJjbGUuY3ksIHZlcnRleCA9IHtcbiAgICAgIHg6IHgsXG4gICAgICB5OiB5XG4gICAgfSwgcHJldmlvdXMgPSBiZWFjaC5QLCBuZXh0ID0gYmVhY2guTiwgZGlzYXBwZWFyaW5nID0gWyBiZWFjaCBdO1xuICAgIGQzX2dlb21fdm9yb25vaURldGFjaEJlYWNoKGJlYWNoKTtcbiAgICB2YXIgbEFyYyA9IHByZXZpb3VzO1xuICAgIHdoaWxlIChsQXJjLmNpcmNsZSAmJiBhYnMoeCAtIGxBcmMuY2lyY2xlLngpIDwgzrUgJiYgYWJzKHkgLSBsQXJjLmNpcmNsZS5jeSkgPCDOtSkge1xuICAgICAgcHJldmlvdXMgPSBsQXJjLlA7XG4gICAgICBkaXNhcHBlYXJpbmcudW5zaGlmdChsQXJjKTtcbiAgICAgIGQzX2dlb21fdm9yb25vaURldGFjaEJlYWNoKGxBcmMpO1xuICAgICAgbEFyYyA9IHByZXZpb3VzO1xuICAgIH1cbiAgICBkaXNhcHBlYXJpbmcudW5zaGlmdChsQXJjKTtcbiAgICBkM19nZW9tX3Zvcm9ub2lEZXRhY2hDaXJjbGUobEFyYyk7XG4gICAgdmFyIHJBcmMgPSBuZXh0O1xuICAgIHdoaWxlIChyQXJjLmNpcmNsZSAmJiBhYnMoeCAtIHJBcmMuY2lyY2xlLngpIDwgzrUgJiYgYWJzKHkgLSByQXJjLmNpcmNsZS5jeSkgPCDOtSkge1xuICAgICAgbmV4dCA9IHJBcmMuTjtcbiAgICAgIGRpc2FwcGVhcmluZy5wdXNoKHJBcmMpO1xuICAgICAgZDNfZ2VvbV92b3Jvbm9pRGV0YWNoQmVhY2gockFyYyk7XG4gICAgICByQXJjID0gbmV4dDtcbiAgICB9XG4gICAgZGlzYXBwZWFyaW5nLnB1c2gockFyYyk7XG4gICAgZDNfZ2VvbV92b3Jvbm9pRGV0YWNoQ2lyY2xlKHJBcmMpO1xuICAgIHZhciBuQXJjcyA9IGRpc2FwcGVhcmluZy5sZW5ndGgsIGlBcmM7XG4gICAgZm9yIChpQXJjID0gMTsgaUFyYyA8IG5BcmNzOyArK2lBcmMpIHtcbiAgICAgIHJBcmMgPSBkaXNhcHBlYXJpbmdbaUFyY107XG4gICAgICBsQXJjID0gZGlzYXBwZWFyaW5nW2lBcmMgLSAxXTtcbiAgICAgIGQzX2dlb21fdm9yb25vaVNldEVkZ2VFbmQockFyYy5lZGdlLCBsQXJjLnNpdGUsIHJBcmMuc2l0ZSwgdmVydGV4KTtcbiAgICB9XG4gICAgbEFyYyA9IGRpc2FwcGVhcmluZ1swXTtcbiAgICByQXJjID0gZGlzYXBwZWFyaW5nW25BcmNzIC0gMV07XG4gICAgckFyYy5lZGdlID0gZDNfZ2VvbV92b3Jvbm9pQ3JlYXRlRWRnZShsQXJjLnNpdGUsIHJBcmMuc2l0ZSwgbnVsbCwgdmVydGV4KTtcbiAgICBkM19nZW9tX3Zvcm9ub2lBdHRhY2hDaXJjbGUobEFyYyk7XG4gICAgZDNfZ2VvbV92b3Jvbm9pQXR0YWNoQ2lyY2xlKHJBcmMpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb21fdm9yb25vaUFkZEJlYWNoKHNpdGUpIHtcbiAgICB2YXIgeCA9IHNpdGUueCwgZGlyZWN0cml4ID0gc2l0ZS55LCBsQXJjLCByQXJjLCBkeGwsIGR4ciwgbm9kZSA9IGQzX2dlb21fdm9yb25vaUJlYWNoZXMuXztcbiAgICB3aGlsZSAobm9kZSkge1xuICAgICAgZHhsID0gZDNfZ2VvbV92b3Jvbm9pTGVmdEJyZWFrUG9pbnQobm9kZSwgZGlyZWN0cml4KSAtIHg7XG4gICAgICBpZiAoZHhsID4gzrUpIG5vZGUgPSBub2RlLkw7IGVsc2Uge1xuICAgICAgICBkeHIgPSB4IC0gZDNfZ2VvbV92b3Jvbm9pUmlnaHRCcmVha1BvaW50KG5vZGUsIGRpcmVjdHJpeCk7XG4gICAgICAgIGlmIChkeHIgPiDOtSkge1xuICAgICAgICAgIGlmICghbm9kZS5SKSB7XG4gICAgICAgICAgICBsQXJjID0gbm9kZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBub2RlID0gbm9kZS5SO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChkeGwgPiAtzrUpIHtcbiAgICAgICAgICAgIGxBcmMgPSBub2RlLlA7XG4gICAgICAgICAgICByQXJjID0gbm9kZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGR4ciA+IC3OtSkge1xuICAgICAgICAgICAgbEFyYyA9IG5vZGU7XG4gICAgICAgICAgICByQXJjID0gbm9kZS5OO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsQXJjID0gckFyYyA9IG5vZGU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBuZXdBcmMgPSBkM19nZW9tX3Zvcm9ub2lDcmVhdGVCZWFjaChzaXRlKTtcbiAgICBkM19nZW9tX3Zvcm9ub2lCZWFjaGVzLmluc2VydChsQXJjLCBuZXdBcmMpO1xuICAgIGlmICghbEFyYyAmJiAhckFyYykgcmV0dXJuO1xuICAgIGlmIChsQXJjID09PSByQXJjKSB7XG4gICAgICBkM19nZW9tX3Zvcm9ub2lEZXRhY2hDaXJjbGUobEFyYyk7XG4gICAgICByQXJjID0gZDNfZ2VvbV92b3Jvbm9pQ3JlYXRlQmVhY2gobEFyYy5zaXRlKTtcbiAgICAgIGQzX2dlb21fdm9yb25vaUJlYWNoZXMuaW5zZXJ0KG5ld0FyYywgckFyYyk7XG4gICAgICBuZXdBcmMuZWRnZSA9IHJBcmMuZWRnZSA9IGQzX2dlb21fdm9yb25vaUNyZWF0ZUVkZ2UobEFyYy5zaXRlLCBuZXdBcmMuc2l0ZSk7XG4gICAgICBkM19nZW9tX3Zvcm9ub2lBdHRhY2hDaXJjbGUobEFyYyk7XG4gICAgICBkM19nZW9tX3Zvcm9ub2lBdHRhY2hDaXJjbGUockFyYyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghckFyYykge1xuICAgICAgbmV3QXJjLmVkZ2UgPSBkM19nZW9tX3Zvcm9ub2lDcmVhdGVFZGdlKGxBcmMuc2l0ZSwgbmV3QXJjLnNpdGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkM19nZW9tX3Zvcm9ub2lEZXRhY2hDaXJjbGUobEFyYyk7XG4gICAgZDNfZ2VvbV92b3Jvbm9pRGV0YWNoQ2lyY2xlKHJBcmMpO1xuICAgIHZhciBsU2l0ZSA9IGxBcmMuc2l0ZSwgYXggPSBsU2l0ZS54LCBheSA9IGxTaXRlLnksIGJ4ID0gc2l0ZS54IC0gYXgsIGJ5ID0gc2l0ZS55IC0gYXksIHJTaXRlID0gckFyYy5zaXRlLCBjeCA9IHJTaXRlLnggLSBheCwgY3kgPSByU2l0ZS55IC0gYXksIGQgPSAyICogKGJ4ICogY3kgLSBieSAqIGN4KSwgaGIgPSBieCAqIGJ4ICsgYnkgKiBieSwgaGMgPSBjeCAqIGN4ICsgY3kgKiBjeSwgdmVydGV4ID0ge1xuICAgICAgeDogKGN5ICogaGIgLSBieSAqIGhjKSAvIGQgKyBheCxcbiAgICAgIHk6IChieCAqIGhjIC0gY3ggKiBoYikgLyBkICsgYXlcbiAgICB9O1xuICAgIGQzX2dlb21fdm9yb25vaVNldEVkZ2VFbmQockFyYy5lZGdlLCBsU2l0ZSwgclNpdGUsIHZlcnRleCk7XG4gICAgbmV3QXJjLmVkZ2UgPSBkM19nZW9tX3Zvcm9ub2lDcmVhdGVFZGdlKGxTaXRlLCBzaXRlLCBudWxsLCB2ZXJ0ZXgpO1xuICAgIHJBcmMuZWRnZSA9IGQzX2dlb21fdm9yb25vaUNyZWF0ZUVkZ2Uoc2l0ZSwgclNpdGUsIG51bGwsIHZlcnRleCk7XG4gICAgZDNfZ2VvbV92b3Jvbm9pQXR0YWNoQ2lyY2xlKGxBcmMpO1xuICAgIGQzX2dlb21fdm9yb25vaUF0dGFjaENpcmNsZShyQXJjKTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3Zvcm9ub2lMZWZ0QnJlYWtQb2ludChhcmMsIGRpcmVjdHJpeCkge1xuICAgIHZhciBzaXRlID0gYXJjLnNpdGUsIHJmb2N4ID0gc2l0ZS54LCByZm9jeSA9IHNpdGUueSwgcGJ5MiA9IHJmb2N5IC0gZGlyZWN0cml4O1xuICAgIGlmICghcGJ5MikgcmV0dXJuIHJmb2N4O1xuICAgIHZhciBsQXJjID0gYXJjLlA7XG4gICAgaWYgKCFsQXJjKSByZXR1cm4gLUluZmluaXR5O1xuICAgIHNpdGUgPSBsQXJjLnNpdGU7XG4gICAgdmFyIGxmb2N4ID0gc2l0ZS54LCBsZm9jeSA9IHNpdGUueSwgcGxieTIgPSBsZm9jeSAtIGRpcmVjdHJpeDtcbiAgICBpZiAoIXBsYnkyKSByZXR1cm4gbGZvY3g7XG4gICAgdmFyIGhsID0gbGZvY3ggLSByZm9jeCwgYWJ5MiA9IDEgLyBwYnkyIC0gMSAvIHBsYnkyLCBiID0gaGwgLyBwbGJ5MjtcbiAgICBpZiAoYWJ5MikgcmV0dXJuICgtYiArIE1hdGguc3FydChiICogYiAtIDIgKiBhYnkyICogKGhsICogaGwgLyAoLTIgKiBwbGJ5MikgLSBsZm9jeSArIHBsYnkyIC8gMiArIHJmb2N5IC0gcGJ5MiAvIDIpKSkgLyBhYnkyICsgcmZvY3g7XG4gICAgcmV0dXJuIChyZm9jeCArIGxmb2N4KSAvIDI7XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvbV92b3Jvbm9pUmlnaHRCcmVha1BvaW50KGFyYywgZGlyZWN0cml4KSB7XG4gICAgdmFyIHJBcmMgPSBhcmMuTjtcbiAgICBpZiAockFyYykgcmV0dXJuIGQzX2dlb21fdm9yb25vaUxlZnRCcmVha1BvaW50KHJBcmMsIGRpcmVjdHJpeCk7XG4gICAgdmFyIHNpdGUgPSBhcmMuc2l0ZTtcbiAgICByZXR1cm4gc2l0ZS55ID09PSBkaXJlY3RyaXggPyBzaXRlLnggOiBJbmZpbml0eTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3Zvcm9ub2lDZWxsKHNpdGUpIHtcbiAgICB0aGlzLnNpdGUgPSBzaXRlO1xuICAgIHRoaXMuZWRnZXMgPSBbXTtcbiAgfVxuICBkM19nZW9tX3Zvcm9ub2lDZWxsLnByb3RvdHlwZS5wcmVwYXJlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGhhbGZFZGdlcyA9IHRoaXMuZWRnZXMsIGlIYWxmRWRnZSA9IGhhbGZFZGdlcy5sZW5ndGgsIGVkZ2U7XG4gICAgd2hpbGUgKGlIYWxmRWRnZS0tKSB7XG4gICAgICBlZGdlID0gaGFsZkVkZ2VzW2lIYWxmRWRnZV0uZWRnZTtcbiAgICAgIGlmICghZWRnZS5iIHx8ICFlZGdlLmEpIGhhbGZFZGdlcy5zcGxpY2UoaUhhbGZFZGdlLCAxKTtcbiAgICB9XG4gICAgaGFsZkVkZ2VzLnNvcnQoZDNfZ2VvbV92b3Jvbm9pSGFsZkVkZ2VPcmRlcik7XG4gICAgcmV0dXJuIGhhbGZFZGdlcy5sZW5ndGg7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2dlb21fdm9yb25vaUNsb3NlQ2VsbHMoZXh0ZW50KSB7XG4gICAgdmFyIHgwID0gZXh0ZW50WzBdWzBdLCB4MSA9IGV4dGVudFsxXVswXSwgeTAgPSBleHRlbnRbMF1bMV0sIHkxID0gZXh0ZW50WzFdWzFdLCB4MiwgeTIsIHgzLCB5MywgY2VsbHMgPSBkM19nZW9tX3Zvcm9ub2lDZWxscywgaUNlbGwgPSBjZWxscy5sZW5ndGgsIGNlbGwsIGlIYWxmRWRnZSwgaGFsZkVkZ2VzLCBuSGFsZkVkZ2VzLCBzdGFydCwgZW5kO1xuICAgIHdoaWxlIChpQ2VsbC0tKSB7XG4gICAgICBjZWxsID0gY2VsbHNbaUNlbGxdO1xuICAgICAgaWYgKCFjZWxsIHx8ICFjZWxsLnByZXBhcmUoKSkgY29udGludWU7XG4gICAgICBoYWxmRWRnZXMgPSBjZWxsLmVkZ2VzO1xuICAgICAgbkhhbGZFZGdlcyA9IGhhbGZFZGdlcy5sZW5ndGg7XG4gICAgICBpSGFsZkVkZ2UgPSAwO1xuICAgICAgd2hpbGUgKGlIYWxmRWRnZSA8IG5IYWxmRWRnZXMpIHtcbiAgICAgICAgZW5kID0gaGFsZkVkZ2VzW2lIYWxmRWRnZV0uZW5kKCksIHgzID0gZW5kLngsIHkzID0gZW5kLnk7XG4gICAgICAgIHN0YXJ0ID0gaGFsZkVkZ2VzWysraUhhbGZFZGdlICUgbkhhbGZFZGdlc10uc3RhcnQoKSwgeDIgPSBzdGFydC54LCB5MiA9IHN0YXJ0Lnk7XG4gICAgICAgIGlmIChhYnMoeDMgLSB4MikgPiDOtSB8fCBhYnMoeTMgLSB5MikgPiDOtSkge1xuICAgICAgICAgIGhhbGZFZGdlcy5zcGxpY2UoaUhhbGZFZGdlLCAwLCBuZXcgZDNfZ2VvbV92b3Jvbm9pSGFsZkVkZ2UoZDNfZ2VvbV92b3Jvbm9pQ3JlYXRlQm9yZGVyRWRnZShjZWxsLnNpdGUsIGVuZCwgYWJzKHgzIC0geDApIDwgzrUgJiYgeTEgLSB5MyA+IM61ID8ge1xuICAgICAgICAgICAgeDogeDAsXG4gICAgICAgICAgICB5OiBhYnMoeDIgLSB4MCkgPCDOtSA/IHkyIDogeTFcbiAgICAgICAgICB9IDogYWJzKHkzIC0geTEpIDwgzrUgJiYgeDEgLSB4MyA+IM61ID8ge1xuICAgICAgICAgICAgeDogYWJzKHkyIC0geTEpIDwgzrUgPyB4MiA6IHgxLFxuICAgICAgICAgICAgeTogeTFcbiAgICAgICAgICB9IDogYWJzKHgzIC0geDEpIDwgzrUgJiYgeTMgLSB5MCA+IM61ID8ge1xuICAgICAgICAgICAgeDogeDEsXG4gICAgICAgICAgICB5OiBhYnMoeDIgLSB4MSkgPCDOtSA/IHkyIDogeTBcbiAgICAgICAgICB9IDogYWJzKHkzIC0geTApIDwgzrUgJiYgeDMgLSB4MCA+IM61ID8ge1xuICAgICAgICAgICAgeDogYWJzKHkyIC0geTApIDwgzrUgPyB4MiA6IHgwLFxuICAgICAgICAgICAgeTogeTBcbiAgICAgICAgICB9IDogbnVsbCksIGNlbGwuc2l0ZSwgbnVsbCkpO1xuICAgICAgICAgICsrbkhhbGZFZGdlcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3Zvcm9ub2lIYWxmRWRnZU9yZGVyKGEsIGIpIHtcbiAgICByZXR1cm4gYi5hbmdsZSAtIGEuYW5nbGU7XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvbV92b3Jvbm9pQ2lyY2xlKCkge1xuICAgIGQzX2dlb21fdm9yb25vaVJlZEJsYWNrTm9kZSh0aGlzKTtcbiAgICB0aGlzLnggPSB0aGlzLnkgPSB0aGlzLmFyYyA9IHRoaXMuc2l0ZSA9IHRoaXMuY3kgPSBudWxsO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb21fdm9yb25vaUF0dGFjaENpcmNsZShhcmMpIHtcbiAgICB2YXIgbEFyYyA9IGFyYy5QLCByQXJjID0gYXJjLk47XG4gICAgaWYgKCFsQXJjIHx8ICFyQXJjKSByZXR1cm47XG4gICAgdmFyIGxTaXRlID0gbEFyYy5zaXRlLCBjU2l0ZSA9IGFyYy5zaXRlLCByU2l0ZSA9IHJBcmMuc2l0ZTtcbiAgICBpZiAobFNpdGUgPT09IHJTaXRlKSByZXR1cm47XG4gICAgdmFyIGJ4ID0gY1NpdGUueCwgYnkgPSBjU2l0ZS55LCBheCA9IGxTaXRlLnggLSBieCwgYXkgPSBsU2l0ZS55IC0gYnksIGN4ID0gclNpdGUueCAtIGJ4LCBjeSA9IHJTaXRlLnkgLSBieTtcbiAgICB2YXIgZCA9IDIgKiAoYXggKiBjeSAtIGF5ICogY3gpO1xuICAgIGlmIChkID49IC3OtTIpIHJldHVybjtcbiAgICB2YXIgaGEgPSBheCAqIGF4ICsgYXkgKiBheSwgaGMgPSBjeCAqIGN4ICsgY3kgKiBjeSwgeCA9IChjeSAqIGhhIC0gYXkgKiBoYykgLyBkLCB5ID0gKGF4ICogaGMgLSBjeCAqIGhhKSAvIGQsIGN5ID0geSArIGJ5O1xuICAgIHZhciBjaXJjbGUgPSBkM19nZW9tX3Zvcm9ub2lDaXJjbGVQb29sLnBvcCgpIHx8IG5ldyBkM19nZW9tX3Zvcm9ub2lDaXJjbGUoKTtcbiAgICBjaXJjbGUuYXJjID0gYXJjO1xuICAgIGNpcmNsZS5zaXRlID0gY1NpdGU7XG4gICAgY2lyY2xlLnggPSB4ICsgYng7XG4gICAgY2lyY2xlLnkgPSBjeSArIE1hdGguc3FydCh4ICogeCArIHkgKiB5KTtcbiAgICBjaXJjbGUuY3kgPSBjeTtcbiAgICBhcmMuY2lyY2xlID0gY2lyY2xlO1xuICAgIHZhciBiZWZvcmUgPSBudWxsLCBub2RlID0gZDNfZ2VvbV92b3Jvbm9pQ2lyY2xlcy5fO1xuICAgIHdoaWxlIChub2RlKSB7XG4gICAgICBpZiAoY2lyY2xlLnkgPCBub2RlLnkgfHwgY2lyY2xlLnkgPT09IG5vZGUueSAmJiBjaXJjbGUueCA8PSBub2RlLngpIHtcbiAgICAgICAgaWYgKG5vZGUuTCkgbm9kZSA9IG5vZGUuTDsgZWxzZSB7XG4gICAgICAgICAgYmVmb3JlID0gbm9kZS5QO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobm9kZS5SKSBub2RlID0gbm9kZS5SOyBlbHNlIHtcbiAgICAgICAgICBiZWZvcmUgPSBub2RlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGQzX2dlb21fdm9yb25vaUNpcmNsZXMuaW5zZXJ0KGJlZm9yZSwgY2lyY2xlKTtcbiAgICBpZiAoIWJlZm9yZSkgZDNfZ2VvbV92b3Jvbm9pRmlyc3RDaXJjbGUgPSBjaXJjbGU7XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvbV92b3Jvbm9pRGV0YWNoQ2lyY2xlKGFyYykge1xuICAgIHZhciBjaXJjbGUgPSBhcmMuY2lyY2xlO1xuICAgIGlmIChjaXJjbGUpIHtcbiAgICAgIGlmICghY2lyY2xlLlApIGQzX2dlb21fdm9yb25vaUZpcnN0Q2lyY2xlID0gY2lyY2xlLk47XG4gICAgICBkM19nZW9tX3Zvcm9ub2lDaXJjbGVzLnJlbW92ZShjaXJjbGUpO1xuICAgICAgZDNfZ2VvbV92b3Jvbm9pQ2lyY2xlUG9vbC5wdXNoKGNpcmNsZSk7XG4gICAgICBkM19nZW9tX3Zvcm9ub2lSZWRCbGFja05vZGUoY2lyY2xlKTtcbiAgICAgIGFyYy5jaXJjbGUgPSBudWxsO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3Zvcm9ub2lDbGlwRWRnZXMoZXh0ZW50KSB7XG4gICAgdmFyIGVkZ2VzID0gZDNfZ2VvbV92b3Jvbm9pRWRnZXMsIGNsaXAgPSBkM19nZW9tX2NsaXBMaW5lKGV4dGVudFswXVswXSwgZXh0ZW50WzBdWzFdLCBleHRlbnRbMV1bMF0sIGV4dGVudFsxXVsxXSksIGkgPSBlZGdlcy5sZW5ndGgsIGU7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgZSA9IGVkZ2VzW2ldO1xuICAgICAgaWYgKCFkM19nZW9tX3Zvcm9ub2lDb25uZWN0RWRnZShlLCBleHRlbnQpIHx8ICFjbGlwKGUpIHx8IGFicyhlLmEueCAtIGUuYi54KSA8IM61ICYmIGFicyhlLmEueSAtIGUuYi55KSA8IM61KSB7XG4gICAgICAgIGUuYSA9IGUuYiA9IG51bGw7XG4gICAgICAgIGVkZ2VzLnNwbGljZShpLCAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvbV92b3Jvbm9pQ29ubmVjdEVkZ2UoZWRnZSwgZXh0ZW50KSB7XG4gICAgdmFyIHZiID0gZWRnZS5iO1xuICAgIGlmICh2YikgcmV0dXJuIHRydWU7XG4gICAgdmFyIHZhID0gZWRnZS5hLCB4MCA9IGV4dGVudFswXVswXSwgeDEgPSBleHRlbnRbMV1bMF0sIHkwID0gZXh0ZW50WzBdWzFdLCB5MSA9IGV4dGVudFsxXVsxXSwgbFNpdGUgPSBlZGdlLmwsIHJTaXRlID0gZWRnZS5yLCBseCA9IGxTaXRlLngsIGx5ID0gbFNpdGUueSwgcnggPSByU2l0ZS54LCByeSA9IHJTaXRlLnksIGZ4ID0gKGx4ICsgcngpIC8gMiwgZnkgPSAobHkgKyByeSkgLyAyLCBmbSwgZmI7XG4gICAgaWYgKHJ5ID09PSBseSkge1xuICAgICAgaWYgKGZ4IDwgeDAgfHwgZnggPj0geDEpIHJldHVybjtcbiAgICAgIGlmIChseCA+IHJ4KSB7XG4gICAgICAgIGlmICghdmEpIHZhID0ge1xuICAgICAgICAgIHg6IGZ4LFxuICAgICAgICAgIHk6IHkwXG4gICAgICAgIH07IGVsc2UgaWYgKHZhLnkgPj0geTEpIHJldHVybjtcbiAgICAgICAgdmIgPSB7XG4gICAgICAgICAgeDogZngsXG4gICAgICAgICAgeTogeTFcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghdmEpIHZhID0ge1xuICAgICAgICAgIHg6IGZ4LFxuICAgICAgICAgIHk6IHkxXG4gICAgICAgIH07IGVsc2UgaWYgKHZhLnkgPCB5MCkgcmV0dXJuO1xuICAgICAgICB2YiA9IHtcbiAgICAgICAgICB4OiBmeCxcbiAgICAgICAgICB5OiB5MFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmbSA9IChseCAtIHJ4KSAvIChyeSAtIGx5KTtcbiAgICAgIGZiID0gZnkgLSBmbSAqIGZ4O1xuICAgICAgaWYgKGZtIDwgLTEgfHwgZm0gPiAxKSB7XG4gICAgICAgIGlmIChseCA+IHJ4KSB7XG4gICAgICAgICAgaWYgKCF2YSkgdmEgPSB7XG4gICAgICAgICAgICB4OiAoeTAgLSBmYikgLyBmbSxcbiAgICAgICAgICAgIHk6IHkwXG4gICAgICAgICAgfTsgZWxzZSBpZiAodmEueSA+PSB5MSkgcmV0dXJuO1xuICAgICAgICAgIHZiID0ge1xuICAgICAgICAgICAgeDogKHkxIC0gZmIpIC8gZm0sXG4gICAgICAgICAgICB5OiB5MVxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKCF2YSkgdmEgPSB7XG4gICAgICAgICAgICB4OiAoeTEgLSBmYikgLyBmbSxcbiAgICAgICAgICAgIHk6IHkxXG4gICAgICAgICAgfTsgZWxzZSBpZiAodmEueSA8IHkwKSByZXR1cm47XG4gICAgICAgICAgdmIgPSB7XG4gICAgICAgICAgICB4OiAoeTAgLSBmYikgLyBmbSxcbiAgICAgICAgICAgIHk6IHkwXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGx5IDwgcnkpIHtcbiAgICAgICAgICBpZiAoIXZhKSB2YSA9IHtcbiAgICAgICAgICAgIHg6IHgwLFxuICAgICAgICAgICAgeTogZm0gKiB4MCArIGZiXG4gICAgICAgICAgfTsgZWxzZSBpZiAodmEueCA+PSB4MSkgcmV0dXJuO1xuICAgICAgICAgIHZiID0ge1xuICAgICAgICAgICAgeDogeDEsXG4gICAgICAgICAgICB5OiBmbSAqIHgxICsgZmJcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghdmEpIHZhID0ge1xuICAgICAgICAgICAgeDogeDEsXG4gICAgICAgICAgICB5OiBmbSAqIHgxICsgZmJcbiAgICAgICAgICB9OyBlbHNlIGlmICh2YS54IDwgeDApIHJldHVybjtcbiAgICAgICAgICB2YiA9IHtcbiAgICAgICAgICAgIHg6IHgwLFxuICAgICAgICAgICAgeTogZm0gKiB4MCArIGZiXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBlZGdlLmEgPSB2YTtcbiAgICBlZGdlLmIgPSB2YjtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3Zvcm9ub2lFZGdlKGxTaXRlLCByU2l0ZSkge1xuICAgIHRoaXMubCA9IGxTaXRlO1xuICAgIHRoaXMuciA9IHJTaXRlO1xuICAgIHRoaXMuYSA9IHRoaXMuYiA9IG51bGw7XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvbV92b3Jvbm9pQ3JlYXRlRWRnZShsU2l0ZSwgclNpdGUsIHZhLCB2Yikge1xuICAgIHZhciBlZGdlID0gbmV3IGQzX2dlb21fdm9yb25vaUVkZ2UobFNpdGUsIHJTaXRlKTtcbiAgICBkM19nZW9tX3Zvcm9ub2lFZGdlcy5wdXNoKGVkZ2UpO1xuICAgIGlmICh2YSkgZDNfZ2VvbV92b3Jvbm9pU2V0RWRnZUVuZChlZGdlLCBsU2l0ZSwgclNpdGUsIHZhKTtcbiAgICBpZiAodmIpIGQzX2dlb21fdm9yb25vaVNldEVkZ2VFbmQoZWRnZSwgclNpdGUsIGxTaXRlLCB2Yik7XG4gICAgZDNfZ2VvbV92b3Jvbm9pQ2VsbHNbbFNpdGUuaV0uZWRnZXMucHVzaChuZXcgZDNfZ2VvbV92b3Jvbm9pSGFsZkVkZ2UoZWRnZSwgbFNpdGUsIHJTaXRlKSk7XG4gICAgZDNfZ2VvbV92b3Jvbm9pQ2VsbHNbclNpdGUuaV0uZWRnZXMucHVzaChuZXcgZDNfZ2VvbV92b3Jvbm9pSGFsZkVkZ2UoZWRnZSwgclNpdGUsIGxTaXRlKSk7XG4gICAgcmV0dXJuIGVkZ2U7XG4gIH1cbiAgZnVuY3Rpb24gZDNfZ2VvbV92b3Jvbm9pQ3JlYXRlQm9yZGVyRWRnZShsU2l0ZSwgdmEsIHZiKSB7XG4gICAgdmFyIGVkZ2UgPSBuZXcgZDNfZ2VvbV92b3Jvbm9pRWRnZShsU2l0ZSwgbnVsbCk7XG4gICAgZWRnZS5hID0gdmE7XG4gICAgZWRnZS5iID0gdmI7XG4gICAgZDNfZ2VvbV92b3Jvbm9pRWRnZXMucHVzaChlZGdlKTtcbiAgICByZXR1cm4gZWRnZTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3Zvcm9ub2lTZXRFZGdlRW5kKGVkZ2UsIGxTaXRlLCByU2l0ZSwgdmVydGV4KSB7XG4gICAgaWYgKCFlZGdlLmEgJiYgIWVkZ2UuYikge1xuICAgICAgZWRnZS5hID0gdmVydGV4O1xuICAgICAgZWRnZS5sID0gbFNpdGU7XG4gICAgICBlZGdlLnIgPSByU2l0ZTtcbiAgICB9IGVsc2UgaWYgKGVkZ2UubCA9PT0gclNpdGUpIHtcbiAgICAgIGVkZ2UuYiA9IHZlcnRleDtcbiAgICB9IGVsc2Uge1xuICAgICAgZWRnZS5hID0gdmVydGV4O1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3Zvcm9ub2lIYWxmRWRnZShlZGdlLCBsU2l0ZSwgclNpdGUpIHtcbiAgICB2YXIgdmEgPSBlZGdlLmEsIHZiID0gZWRnZS5iO1xuICAgIHRoaXMuZWRnZSA9IGVkZ2U7XG4gICAgdGhpcy5zaXRlID0gbFNpdGU7XG4gICAgdGhpcy5hbmdsZSA9IHJTaXRlID8gTWF0aC5hdGFuMihyU2l0ZS55IC0gbFNpdGUueSwgclNpdGUueCAtIGxTaXRlLngpIDogZWRnZS5sID09PSBsU2l0ZSA/IE1hdGguYXRhbjIodmIueCAtIHZhLngsIHZhLnkgLSB2Yi55KSA6IE1hdGguYXRhbjIodmEueCAtIHZiLngsIHZiLnkgLSB2YS55KTtcbiAgfVxuICBkM19nZW9tX3Zvcm9ub2lIYWxmRWRnZS5wcm90b3R5cGUgPSB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZWRnZS5sID09PSB0aGlzLnNpdGUgPyB0aGlzLmVkZ2UuYSA6IHRoaXMuZWRnZS5iO1xuICAgIH0sXG4gICAgZW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmVkZ2UubCA9PT0gdGhpcy5zaXRlID8gdGhpcy5lZGdlLmIgOiB0aGlzLmVkZ2UuYTtcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2dlb21fdm9yb25vaVJlZEJsYWNrVHJlZSgpIHtcbiAgICB0aGlzLl8gPSBudWxsO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb21fdm9yb25vaVJlZEJsYWNrTm9kZShub2RlKSB7XG4gICAgbm9kZS5VID0gbm9kZS5DID0gbm9kZS5MID0gbm9kZS5SID0gbm9kZS5QID0gbm9kZS5OID0gbnVsbDtcbiAgfVxuICBkM19nZW9tX3Zvcm9ub2lSZWRCbGFja1RyZWUucHJvdG90eXBlID0ge1xuICAgIGluc2VydDogZnVuY3Rpb24oYWZ0ZXIsIG5vZGUpIHtcbiAgICAgIHZhciBwYXJlbnQsIGdyYW5kcGEsIHVuY2xlO1xuICAgICAgaWYgKGFmdGVyKSB7XG4gICAgICAgIG5vZGUuUCA9IGFmdGVyO1xuICAgICAgICBub2RlLk4gPSBhZnRlci5OO1xuICAgICAgICBpZiAoYWZ0ZXIuTikgYWZ0ZXIuTi5QID0gbm9kZTtcbiAgICAgICAgYWZ0ZXIuTiA9IG5vZGU7XG4gICAgICAgIGlmIChhZnRlci5SKSB7XG4gICAgICAgICAgYWZ0ZXIgPSBhZnRlci5SO1xuICAgICAgICAgIHdoaWxlIChhZnRlci5MKSBhZnRlciA9IGFmdGVyLkw7XG4gICAgICAgICAgYWZ0ZXIuTCA9IG5vZGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWZ0ZXIuUiA9IG5vZGU7XG4gICAgICAgIH1cbiAgICAgICAgcGFyZW50ID0gYWZ0ZXI7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuXykge1xuICAgICAgICBhZnRlciA9IGQzX2dlb21fdm9yb25vaVJlZEJsYWNrRmlyc3QodGhpcy5fKTtcbiAgICAgICAgbm9kZS5QID0gbnVsbDtcbiAgICAgICAgbm9kZS5OID0gYWZ0ZXI7XG4gICAgICAgIGFmdGVyLlAgPSBhZnRlci5MID0gbm9kZTtcbiAgICAgICAgcGFyZW50ID0gYWZ0ZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlLlAgPSBub2RlLk4gPSBudWxsO1xuICAgICAgICB0aGlzLl8gPSBub2RlO1xuICAgICAgICBwYXJlbnQgPSBudWxsO1xuICAgICAgfVxuICAgICAgbm9kZS5MID0gbm9kZS5SID0gbnVsbDtcbiAgICAgIG5vZGUuVSA9IHBhcmVudDtcbiAgICAgIG5vZGUuQyA9IHRydWU7XG4gICAgICBhZnRlciA9IG5vZGU7XG4gICAgICB3aGlsZSAocGFyZW50ICYmIHBhcmVudC5DKSB7XG4gICAgICAgIGdyYW5kcGEgPSBwYXJlbnQuVTtcbiAgICAgICAgaWYgKHBhcmVudCA9PT0gZ3JhbmRwYS5MKSB7XG4gICAgICAgICAgdW5jbGUgPSBncmFuZHBhLlI7XG4gICAgICAgICAgaWYgKHVuY2xlICYmIHVuY2xlLkMpIHtcbiAgICAgICAgICAgIHBhcmVudC5DID0gdW5jbGUuQyA9IGZhbHNlO1xuICAgICAgICAgICAgZ3JhbmRwYS5DID0gdHJ1ZTtcbiAgICAgICAgICAgIGFmdGVyID0gZ3JhbmRwYTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGFmdGVyID09PSBwYXJlbnQuUikge1xuICAgICAgICAgICAgICBkM19nZW9tX3Zvcm9ub2lSZWRCbGFja1JvdGF0ZUxlZnQodGhpcywgcGFyZW50KTtcbiAgICAgICAgICAgICAgYWZ0ZXIgPSBwYXJlbnQ7XG4gICAgICAgICAgICAgIHBhcmVudCA9IGFmdGVyLlU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXJlbnQuQyA9IGZhbHNlO1xuICAgICAgICAgICAgZ3JhbmRwYS5DID0gdHJ1ZTtcbiAgICAgICAgICAgIGQzX2dlb21fdm9yb25vaVJlZEJsYWNrUm90YXRlUmlnaHQodGhpcywgZ3JhbmRwYSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHVuY2xlID0gZ3JhbmRwYS5MO1xuICAgICAgICAgIGlmICh1bmNsZSAmJiB1bmNsZS5DKSB7XG4gICAgICAgICAgICBwYXJlbnQuQyA9IHVuY2xlLkMgPSBmYWxzZTtcbiAgICAgICAgICAgIGdyYW5kcGEuQyA9IHRydWU7XG4gICAgICAgICAgICBhZnRlciA9IGdyYW5kcGE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChhZnRlciA9PT0gcGFyZW50LkwpIHtcbiAgICAgICAgICAgICAgZDNfZ2VvbV92b3Jvbm9pUmVkQmxhY2tSb3RhdGVSaWdodCh0aGlzLCBwYXJlbnQpO1xuICAgICAgICAgICAgICBhZnRlciA9IHBhcmVudDtcbiAgICAgICAgICAgICAgcGFyZW50ID0gYWZ0ZXIuVTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhcmVudC5DID0gZmFsc2U7XG4gICAgICAgICAgICBncmFuZHBhLkMgPSB0cnVlO1xuICAgICAgICAgICAgZDNfZ2VvbV92b3Jvbm9pUmVkQmxhY2tSb3RhdGVMZWZ0KHRoaXMsIGdyYW5kcGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQgPSBhZnRlci5VO1xuICAgICAgfVxuICAgICAgdGhpcy5fLkMgPSBmYWxzZTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24obm9kZSkge1xuICAgICAgaWYgKG5vZGUuTikgbm9kZS5OLlAgPSBub2RlLlA7XG4gICAgICBpZiAobm9kZS5QKSBub2RlLlAuTiA9IG5vZGUuTjtcbiAgICAgIG5vZGUuTiA9IG5vZGUuUCA9IG51bGw7XG4gICAgICB2YXIgcGFyZW50ID0gbm9kZS5VLCBzaWJsaW5nLCBsZWZ0ID0gbm9kZS5MLCByaWdodCA9IG5vZGUuUiwgbmV4dCwgcmVkO1xuICAgICAgaWYgKCFsZWZ0KSBuZXh0ID0gcmlnaHQ7IGVsc2UgaWYgKCFyaWdodCkgbmV4dCA9IGxlZnQ7IGVsc2UgbmV4dCA9IGQzX2dlb21fdm9yb25vaVJlZEJsYWNrRmlyc3QocmlnaHQpO1xuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBpZiAocGFyZW50LkwgPT09IG5vZGUpIHBhcmVudC5MID0gbmV4dDsgZWxzZSBwYXJlbnQuUiA9IG5leHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl8gPSBuZXh0O1xuICAgICAgfVxuICAgICAgaWYgKGxlZnQgJiYgcmlnaHQpIHtcbiAgICAgICAgcmVkID0gbmV4dC5DO1xuICAgICAgICBuZXh0LkMgPSBub2RlLkM7XG4gICAgICAgIG5leHQuTCA9IGxlZnQ7XG4gICAgICAgIGxlZnQuVSA9IG5leHQ7XG4gICAgICAgIGlmIChuZXh0ICE9PSByaWdodCkge1xuICAgICAgICAgIHBhcmVudCA9IG5leHQuVTtcbiAgICAgICAgICBuZXh0LlUgPSBub2RlLlU7XG4gICAgICAgICAgbm9kZSA9IG5leHQuUjtcbiAgICAgICAgICBwYXJlbnQuTCA9IG5vZGU7XG4gICAgICAgICAgbmV4dC5SID0gcmlnaHQ7XG4gICAgICAgICAgcmlnaHQuVSA9IG5leHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV4dC5VID0gcGFyZW50O1xuICAgICAgICAgIHBhcmVudCA9IG5leHQ7XG4gICAgICAgICAgbm9kZSA9IG5leHQuUjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVkID0gbm9kZS5DO1xuICAgICAgICBub2RlID0gbmV4dDtcbiAgICAgIH1cbiAgICAgIGlmIChub2RlKSBub2RlLlUgPSBwYXJlbnQ7XG4gICAgICBpZiAocmVkKSByZXR1cm47XG4gICAgICBpZiAobm9kZSAmJiBub2RlLkMpIHtcbiAgICAgICAgbm9kZS5DID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGRvIHtcbiAgICAgICAgaWYgKG5vZGUgPT09IHRoaXMuXykgYnJlYWs7XG4gICAgICAgIGlmIChub2RlID09PSBwYXJlbnQuTCkge1xuICAgICAgICAgIHNpYmxpbmcgPSBwYXJlbnQuUjtcbiAgICAgICAgICBpZiAoc2libGluZy5DKSB7XG4gICAgICAgICAgICBzaWJsaW5nLkMgPSBmYWxzZTtcbiAgICAgICAgICAgIHBhcmVudC5DID0gdHJ1ZTtcbiAgICAgICAgICAgIGQzX2dlb21fdm9yb25vaVJlZEJsYWNrUm90YXRlTGVmdCh0aGlzLCBwYXJlbnQpO1xuICAgICAgICAgICAgc2libGluZyA9IHBhcmVudC5SO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc2libGluZy5MICYmIHNpYmxpbmcuTC5DIHx8IHNpYmxpbmcuUiAmJiBzaWJsaW5nLlIuQykge1xuICAgICAgICAgICAgaWYgKCFzaWJsaW5nLlIgfHwgIXNpYmxpbmcuUi5DKSB7XG4gICAgICAgICAgICAgIHNpYmxpbmcuTC5DID0gZmFsc2U7XG4gICAgICAgICAgICAgIHNpYmxpbmcuQyA9IHRydWU7XG4gICAgICAgICAgICAgIGQzX2dlb21fdm9yb25vaVJlZEJsYWNrUm90YXRlUmlnaHQodGhpcywgc2libGluZyk7XG4gICAgICAgICAgICAgIHNpYmxpbmcgPSBwYXJlbnQuUjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNpYmxpbmcuQyA9IHBhcmVudC5DO1xuICAgICAgICAgICAgcGFyZW50LkMgPSBzaWJsaW5nLlIuQyA9IGZhbHNlO1xuICAgICAgICAgICAgZDNfZ2VvbV92b3Jvbm9pUmVkQmxhY2tSb3RhdGVMZWZ0KHRoaXMsIHBhcmVudCk7XG4gICAgICAgICAgICBub2RlID0gdGhpcy5fO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNpYmxpbmcgPSBwYXJlbnQuTDtcbiAgICAgICAgICBpZiAoc2libGluZy5DKSB7XG4gICAgICAgICAgICBzaWJsaW5nLkMgPSBmYWxzZTtcbiAgICAgICAgICAgIHBhcmVudC5DID0gdHJ1ZTtcbiAgICAgICAgICAgIGQzX2dlb21fdm9yb25vaVJlZEJsYWNrUm90YXRlUmlnaHQodGhpcywgcGFyZW50KTtcbiAgICAgICAgICAgIHNpYmxpbmcgPSBwYXJlbnQuTDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHNpYmxpbmcuTCAmJiBzaWJsaW5nLkwuQyB8fCBzaWJsaW5nLlIgJiYgc2libGluZy5SLkMpIHtcbiAgICAgICAgICAgIGlmICghc2libGluZy5MIHx8ICFzaWJsaW5nLkwuQykge1xuICAgICAgICAgICAgICBzaWJsaW5nLlIuQyA9IGZhbHNlO1xuICAgICAgICAgICAgICBzaWJsaW5nLkMgPSB0cnVlO1xuICAgICAgICAgICAgICBkM19nZW9tX3Zvcm9ub2lSZWRCbGFja1JvdGF0ZUxlZnQodGhpcywgc2libGluZyk7XG4gICAgICAgICAgICAgIHNpYmxpbmcgPSBwYXJlbnQuTDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNpYmxpbmcuQyA9IHBhcmVudC5DO1xuICAgICAgICAgICAgcGFyZW50LkMgPSBzaWJsaW5nLkwuQyA9IGZhbHNlO1xuICAgICAgICAgICAgZDNfZ2VvbV92b3Jvbm9pUmVkQmxhY2tSb3RhdGVSaWdodCh0aGlzLCBwYXJlbnQpO1xuICAgICAgICAgICAgbm9kZSA9IHRoaXMuXztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzaWJsaW5nLkMgPSB0cnVlO1xuICAgICAgICBub2RlID0gcGFyZW50O1xuICAgICAgICBwYXJlbnQgPSBwYXJlbnQuVTtcbiAgICAgIH0gd2hpbGUgKCFub2RlLkMpO1xuICAgICAgaWYgKG5vZGUpIG5vZGUuQyA9IGZhbHNlO1xuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gZDNfZ2VvbV92b3Jvbm9pUmVkQmxhY2tSb3RhdGVMZWZ0KHRyZWUsIG5vZGUpIHtcbiAgICB2YXIgcCA9IG5vZGUsIHEgPSBub2RlLlIsIHBhcmVudCA9IHAuVTtcbiAgICBpZiAocGFyZW50KSB7XG4gICAgICBpZiAocGFyZW50LkwgPT09IHApIHBhcmVudC5MID0gcTsgZWxzZSBwYXJlbnQuUiA9IHE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyZWUuXyA9IHE7XG4gICAgfVxuICAgIHEuVSA9IHBhcmVudDtcbiAgICBwLlUgPSBxO1xuICAgIHAuUiA9IHEuTDtcbiAgICBpZiAocC5SKSBwLlIuVSA9IHA7XG4gICAgcS5MID0gcDtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3Zvcm9ub2lSZWRCbGFja1JvdGF0ZVJpZ2h0KHRyZWUsIG5vZGUpIHtcbiAgICB2YXIgcCA9IG5vZGUsIHEgPSBub2RlLkwsIHBhcmVudCA9IHAuVTtcbiAgICBpZiAocGFyZW50KSB7XG4gICAgICBpZiAocGFyZW50LkwgPT09IHApIHBhcmVudC5MID0gcTsgZWxzZSBwYXJlbnQuUiA9IHE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyZWUuXyA9IHE7XG4gICAgfVxuICAgIHEuVSA9IHBhcmVudDtcbiAgICBwLlUgPSBxO1xuICAgIHAuTCA9IHEuUjtcbiAgICBpZiAocC5MKSBwLkwuVSA9IHA7XG4gICAgcS5SID0gcDtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3Zvcm9ub2lSZWRCbGFja0ZpcnN0KG5vZGUpIHtcbiAgICB3aGlsZSAobm9kZS5MKSBub2RlID0gbm9kZS5MO1xuICAgIHJldHVybiBub2RlO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb21fdm9yb25vaShzaXRlcywgYmJveCkge1xuICAgIHZhciBzaXRlID0gc2l0ZXMuc29ydChkM19nZW9tX3Zvcm9ub2lWZXJ0ZXhPcmRlcikucG9wKCksIHgwLCB5MCwgY2lyY2xlO1xuICAgIGQzX2dlb21fdm9yb25vaUVkZ2VzID0gW107XG4gICAgZDNfZ2VvbV92b3Jvbm9pQ2VsbHMgPSBuZXcgQXJyYXkoc2l0ZXMubGVuZ3RoKTtcbiAgICBkM19nZW9tX3Zvcm9ub2lCZWFjaGVzID0gbmV3IGQzX2dlb21fdm9yb25vaVJlZEJsYWNrVHJlZSgpO1xuICAgIGQzX2dlb21fdm9yb25vaUNpcmNsZXMgPSBuZXcgZDNfZ2VvbV92b3Jvbm9pUmVkQmxhY2tUcmVlKCk7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNpcmNsZSA9IGQzX2dlb21fdm9yb25vaUZpcnN0Q2lyY2xlO1xuICAgICAgaWYgKHNpdGUgJiYgKCFjaXJjbGUgfHwgc2l0ZS55IDwgY2lyY2xlLnkgfHwgc2l0ZS55ID09PSBjaXJjbGUueSAmJiBzaXRlLnggPCBjaXJjbGUueCkpIHtcbiAgICAgICAgaWYgKHNpdGUueCAhPT0geDAgfHwgc2l0ZS55ICE9PSB5MCkge1xuICAgICAgICAgIGQzX2dlb21fdm9yb25vaUNlbGxzW3NpdGUuaV0gPSBuZXcgZDNfZ2VvbV92b3Jvbm9pQ2VsbChzaXRlKTtcbiAgICAgICAgICBkM19nZW9tX3Zvcm9ub2lBZGRCZWFjaChzaXRlKTtcbiAgICAgICAgICB4MCA9IHNpdGUueCwgeTAgPSBzaXRlLnk7XG4gICAgICAgIH1cbiAgICAgICAgc2l0ZSA9IHNpdGVzLnBvcCgpO1xuICAgICAgfSBlbHNlIGlmIChjaXJjbGUpIHtcbiAgICAgICAgZDNfZ2VvbV92b3Jvbm9pUmVtb3ZlQmVhY2goY2lyY2xlLmFyYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGJib3gpIGQzX2dlb21fdm9yb25vaUNsaXBFZGdlcyhiYm94KSwgZDNfZ2VvbV92b3Jvbm9pQ2xvc2VDZWxscyhiYm94KTtcbiAgICB2YXIgZGlhZ3JhbSA9IHtcbiAgICAgIGNlbGxzOiBkM19nZW9tX3Zvcm9ub2lDZWxscyxcbiAgICAgIGVkZ2VzOiBkM19nZW9tX3Zvcm9ub2lFZGdlc1xuICAgIH07XG4gICAgZDNfZ2VvbV92b3Jvbm9pQmVhY2hlcyA9IGQzX2dlb21fdm9yb25vaUNpcmNsZXMgPSBkM19nZW9tX3Zvcm9ub2lFZGdlcyA9IGQzX2dlb21fdm9yb25vaUNlbGxzID0gbnVsbDtcbiAgICByZXR1cm4gZGlhZ3JhbTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3Zvcm9ub2lWZXJ0ZXhPcmRlcihhLCBiKSB7XG4gICAgcmV0dXJuIGIueSAtIGEueSB8fCBiLnggLSBhLng7XG4gIH1cbiAgZDMuZ2VvbS52b3Jvbm9pID0gZnVuY3Rpb24ocG9pbnRzKSB7XG4gICAgdmFyIHggPSBkM19nZW9tX3BvaW50WCwgeSA9IGQzX2dlb21fcG9pbnRZLCBmeCA9IHgsIGZ5ID0geSwgY2xpcEV4dGVudCA9IGQzX2dlb21fdm9yb25vaUNsaXBFeHRlbnQ7XG4gICAgaWYgKHBvaW50cykgcmV0dXJuIHZvcm9ub2kocG9pbnRzKTtcbiAgICBmdW5jdGlvbiB2b3Jvbm9pKGRhdGEpIHtcbiAgICAgIHZhciBwb2x5Z29ucyA9IG5ldyBBcnJheShkYXRhLmxlbmd0aCksIHgwID0gY2xpcEV4dGVudFswXVswXSwgeTAgPSBjbGlwRXh0ZW50WzBdWzFdLCB4MSA9IGNsaXBFeHRlbnRbMV1bMF0sIHkxID0gY2xpcEV4dGVudFsxXVsxXTtcbiAgICAgIGQzX2dlb21fdm9yb25vaShzaXRlcyhkYXRhKSwgY2xpcEV4dGVudCkuY2VsbHMuZm9yRWFjaChmdW5jdGlvbihjZWxsLCBpKSB7XG4gICAgICAgIHZhciBlZGdlcyA9IGNlbGwuZWRnZXMsIHNpdGUgPSBjZWxsLnNpdGUsIHBvbHlnb24gPSBwb2x5Z29uc1tpXSA9IGVkZ2VzLmxlbmd0aCA/IGVkZ2VzLm1hcChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgdmFyIHMgPSBlLnN0YXJ0KCk7XG4gICAgICAgICAgcmV0dXJuIFsgcy54LCBzLnkgXTtcbiAgICAgICAgfSkgOiBzaXRlLnggPj0geDAgJiYgc2l0ZS54IDw9IHgxICYmIHNpdGUueSA+PSB5MCAmJiBzaXRlLnkgPD0geTEgPyBbIFsgeDAsIHkxIF0sIFsgeDEsIHkxIF0sIFsgeDEsIHkwIF0sIFsgeDAsIHkwIF0gXSA6IFtdO1xuICAgICAgICBwb2x5Z29uLnBvaW50ID0gZGF0YVtpXTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHBvbHlnb25zO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzaXRlcyhkYXRhKSB7XG4gICAgICByZXR1cm4gZGF0YS5tYXAoZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHg6IE1hdGgucm91bmQoZngoZCwgaSkgLyDOtSkgKiDOtSxcbiAgICAgICAgICB5OiBNYXRoLnJvdW5kKGZ5KGQsIGkpIC8gzrUpICogzrUsXG4gICAgICAgICAgaTogaVxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfVxuICAgIHZvcm9ub2kubGlua3MgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gZDNfZ2VvbV92b3Jvbm9pKHNpdGVzKGRhdGEpKS5lZGdlcy5maWx0ZXIoZnVuY3Rpb24oZWRnZSkge1xuICAgICAgICByZXR1cm4gZWRnZS5sICYmIGVkZ2UucjtcbiAgICAgIH0pLm1hcChmdW5jdGlvbihlZGdlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlOiBkYXRhW2VkZ2UubC5pXSxcbiAgICAgICAgICB0YXJnZXQ6IGRhdGFbZWRnZS5yLmldXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9O1xuICAgIHZvcm9ub2kudHJpYW5nbGVzID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIHRyaWFuZ2xlcyA9IFtdO1xuICAgICAgZDNfZ2VvbV92b3Jvbm9pKHNpdGVzKGRhdGEpKS5jZWxscy5mb3JFYWNoKGZ1bmN0aW9uKGNlbGwsIGkpIHtcbiAgICAgICAgdmFyIHNpdGUgPSBjZWxsLnNpdGUsIGVkZ2VzID0gY2VsbC5lZGdlcy5zb3J0KGQzX2dlb21fdm9yb25vaUhhbGZFZGdlT3JkZXIpLCBqID0gLTEsIG0gPSBlZGdlcy5sZW5ndGgsIGUwLCBzMCwgZTEgPSBlZGdlc1ttIC0gMV0uZWRnZSwgczEgPSBlMS5sID09PSBzaXRlID8gZTEuciA6IGUxLmw7XG4gICAgICAgIHdoaWxlICgrK2ogPCBtKSB7XG4gICAgICAgICAgZTAgPSBlMTtcbiAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgIGUxID0gZWRnZXNbal0uZWRnZTtcbiAgICAgICAgICBzMSA9IGUxLmwgPT09IHNpdGUgPyBlMS5yIDogZTEubDtcbiAgICAgICAgICBpZiAoaSA8IHMwLmkgJiYgaSA8IHMxLmkgJiYgZDNfZ2VvbV92b3Jvbm9pVHJpYW5nbGVBcmVhKHNpdGUsIHMwLCBzMSkgPCAwKSB7XG4gICAgICAgICAgICB0cmlhbmdsZXMucHVzaChbIGRhdGFbaV0sIGRhdGFbczAuaV0sIGRhdGFbczEuaV0gXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0cmlhbmdsZXM7XG4gICAgfTtcbiAgICB2b3Jvbm9pLnggPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChmeCA9IGQzX2Z1bmN0b3IoeCA9IF8pLCB2b3Jvbm9pKSA6IHg7XG4gICAgfTtcbiAgICB2b3Jvbm9pLnkgPSBmdW5jdGlvbihfKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChmeSA9IGQzX2Z1bmN0b3IoeSA9IF8pLCB2b3Jvbm9pKSA6IHk7XG4gICAgfTtcbiAgICB2b3Jvbm9pLmNsaXBFeHRlbnQgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBjbGlwRXh0ZW50ID09PSBkM19nZW9tX3Zvcm9ub2lDbGlwRXh0ZW50ID8gbnVsbCA6IGNsaXBFeHRlbnQ7XG4gICAgICBjbGlwRXh0ZW50ID0gXyA9PSBudWxsID8gZDNfZ2VvbV92b3Jvbm9pQ2xpcEV4dGVudCA6IF87XG4gICAgICByZXR1cm4gdm9yb25vaTtcbiAgICB9O1xuICAgIHZvcm9ub2kuc2l6ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGNsaXBFeHRlbnQgPT09IGQzX2dlb21fdm9yb25vaUNsaXBFeHRlbnQgPyBudWxsIDogY2xpcEV4dGVudCAmJiBjbGlwRXh0ZW50WzFdO1xuICAgICAgcmV0dXJuIHZvcm9ub2kuY2xpcEV4dGVudChfICYmIFsgWyAwLCAwIF0sIF8gXSk7XG4gICAgfTtcbiAgICByZXR1cm4gdm9yb25vaTtcbiAgfTtcbiAgdmFyIGQzX2dlb21fdm9yb25vaUNsaXBFeHRlbnQgPSBbIFsgLTFlNiwgLTFlNiBdLCBbIDFlNiwgMWU2IF0gXTtcbiAgZnVuY3Rpb24gZDNfZ2VvbV92b3Jvbm9pVHJpYW5nbGVBcmVhKGEsIGIsIGMpIHtcbiAgICByZXR1cm4gKGEueCAtIGMueCkgKiAoYi55IC0gYS55KSAtIChhLnggLSBiLngpICogKGMueSAtIGEueSk7XG4gIH1cbiAgZDMuZ2VvbS5kZWxhdW5heSA9IGZ1bmN0aW9uKHZlcnRpY2VzKSB7XG4gICAgcmV0dXJuIGQzLmdlb20udm9yb25vaSgpLnRyaWFuZ2xlcyh2ZXJ0aWNlcyk7XG4gIH07XG4gIGQzLmdlb20ucXVhZHRyZWUgPSBmdW5jdGlvbihwb2ludHMsIHgxLCB5MSwgeDIsIHkyKSB7XG4gICAgdmFyIHggPSBkM19nZW9tX3BvaW50WCwgeSA9IGQzX2dlb21fcG9pbnRZLCBjb21wYXQ7XG4gICAgaWYgKGNvbXBhdCA9IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHggPSBkM19nZW9tX3F1YWR0cmVlQ29tcGF0WDtcbiAgICAgIHkgPSBkM19nZW9tX3F1YWR0cmVlQ29tcGF0WTtcbiAgICAgIGlmIChjb21wYXQgPT09IDMpIHtcbiAgICAgICAgeTIgPSB5MTtcbiAgICAgICAgeDIgPSB4MTtcbiAgICAgICAgeTEgPSB4MSA9IDA7XG4gICAgICB9XG4gICAgICByZXR1cm4gcXVhZHRyZWUocG9pbnRzKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcXVhZHRyZWUoZGF0YSkge1xuICAgICAgdmFyIGQsIGZ4ID0gZDNfZnVuY3Rvcih4KSwgZnkgPSBkM19mdW5jdG9yKHkpLCB4cywgeXMsIGksIG4sIHgxXywgeTFfLCB4Ml8sIHkyXztcbiAgICAgIGlmICh4MSAhPSBudWxsKSB7XG4gICAgICAgIHgxXyA9IHgxLCB5MV8gPSB5MSwgeDJfID0geDIsIHkyXyA9IHkyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgeDJfID0geTJfID0gLSh4MV8gPSB5MV8gPSBJbmZpbml0eSk7XG4gICAgICAgIHhzID0gW10sIHlzID0gW107XG4gICAgICAgIG4gPSBkYXRhLmxlbmd0aDtcbiAgICAgICAgaWYgKGNvbXBhdCkgZm9yIChpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgICAgIGQgPSBkYXRhW2ldO1xuICAgICAgICAgIGlmIChkLnggPCB4MV8pIHgxXyA9IGQueDtcbiAgICAgICAgICBpZiAoZC55IDwgeTFfKSB5MV8gPSBkLnk7XG4gICAgICAgICAgaWYgKGQueCA+IHgyXykgeDJfID0gZC54O1xuICAgICAgICAgIGlmIChkLnkgPiB5Ml8pIHkyXyA9IGQueTtcbiAgICAgICAgICB4cy5wdXNoKGQueCk7XG4gICAgICAgICAgeXMucHVzaChkLnkpO1xuICAgICAgICB9IGVsc2UgZm9yIChpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgICAgIHZhciB4XyA9ICtmeChkID0gZGF0YVtpXSwgaSksIHlfID0gK2Z5KGQsIGkpO1xuICAgICAgICAgIGlmICh4XyA8IHgxXykgeDFfID0geF87XG4gICAgICAgICAgaWYgKHlfIDwgeTFfKSB5MV8gPSB5XztcbiAgICAgICAgICBpZiAoeF8gPiB4Ml8pIHgyXyA9IHhfO1xuICAgICAgICAgIGlmICh5XyA+IHkyXykgeTJfID0geV87XG4gICAgICAgICAgeHMucHVzaCh4Xyk7XG4gICAgICAgICAgeXMucHVzaCh5Xyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBkeCA9IHgyXyAtIHgxXywgZHkgPSB5Ml8gLSB5MV87XG4gICAgICBpZiAoZHggPiBkeSkgeTJfID0geTFfICsgZHg7IGVsc2UgeDJfID0geDFfICsgZHk7XG4gICAgICBmdW5jdGlvbiBpbnNlcnQobiwgZCwgeCwgeSwgeDEsIHkxLCB4MiwgeTIpIHtcbiAgICAgICAgaWYgKGlzTmFOKHgpIHx8IGlzTmFOKHkpKSByZXR1cm47XG4gICAgICAgIGlmIChuLmxlYWYpIHtcbiAgICAgICAgICB2YXIgbnggPSBuLngsIG55ID0gbi55O1xuICAgICAgICAgIGlmIChueCAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoYWJzKG54IC0geCkgKyBhYnMobnkgLSB5KSA8IC4wMSkge1xuICAgICAgICAgICAgICBpbnNlcnRDaGlsZChuLCBkLCB4LCB5LCB4MSwgeTEsIHgyLCB5Mik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgblBvaW50ID0gbi5wb2ludDtcbiAgICAgICAgICAgICAgbi54ID0gbi55ID0gbi5wb2ludCA9IG51bGw7XG4gICAgICAgICAgICAgIGluc2VydENoaWxkKG4sIG5Qb2ludCwgbngsIG55LCB4MSwgeTEsIHgyLCB5Mik7XG4gICAgICAgICAgICAgIGluc2VydENoaWxkKG4sIGQsIHgsIHksIHgxLCB5MSwgeDIsIHkyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbi54ID0geCwgbi55ID0geSwgbi5wb2ludCA9IGQ7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGluc2VydENoaWxkKG4sIGQsIHgsIHksIHgxLCB5MSwgeDIsIHkyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZnVuY3Rpb24gaW5zZXJ0Q2hpbGQobiwgZCwgeCwgeSwgeDEsIHkxLCB4MiwgeTIpIHtcbiAgICAgICAgdmFyIHN4ID0gKHgxICsgeDIpICogLjUsIHN5ID0gKHkxICsgeTIpICogLjUsIHJpZ2h0ID0geCA+PSBzeCwgYm90dG9tID0geSA+PSBzeSwgaSA9IChib3R0b20gPDwgMSkgKyByaWdodDtcbiAgICAgICAgbi5sZWFmID0gZmFsc2U7XG4gICAgICAgIG4gPSBuLm5vZGVzW2ldIHx8IChuLm5vZGVzW2ldID0gZDNfZ2VvbV9xdWFkdHJlZU5vZGUoKSk7XG4gICAgICAgIGlmIChyaWdodCkgeDEgPSBzeDsgZWxzZSB4MiA9IHN4O1xuICAgICAgICBpZiAoYm90dG9tKSB5MSA9IHN5OyBlbHNlIHkyID0gc3k7XG4gICAgICAgIGluc2VydChuLCBkLCB4LCB5LCB4MSwgeTEsIHgyLCB5Mik7XG4gICAgICB9XG4gICAgICB2YXIgcm9vdCA9IGQzX2dlb21fcXVhZHRyZWVOb2RlKCk7XG4gICAgICByb290LmFkZCA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgaW5zZXJ0KHJvb3QsIGQsICtmeChkLCArK2kpLCArZnkoZCwgaSksIHgxXywgeTFfLCB4Ml8sIHkyXyk7XG4gICAgICB9O1xuICAgICAgcm9vdC52aXNpdCA9IGZ1bmN0aW9uKGYpIHtcbiAgICAgICAgZDNfZ2VvbV9xdWFkdHJlZVZpc2l0KGYsIHJvb3QsIHgxXywgeTFfLCB4Ml8sIHkyXyk7XG4gICAgICB9O1xuICAgICAgaSA9IC0xO1xuICAgICAgaWYgKHgxID09IG51bGwpIHtcbiAgICAgICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgICBpbnNlcnQocm9vdCwgZGF0YVtpXSwgeHNbaV0sIHlzW2ldLCB4MV8sIHkxXywgeDJfLCB5Ml8pO1xuICAgICAgICB9XG4gICAgICAgIC0taTtcbiAgICAgIH0gZWxzZSBkYXRhLmZvckVhY2gocm9vdC5hZGQpO1xuICAgICAgeHMgPSB5cyA9IGRhdGEgPSBkID0gbnVsbDtcbiAgICAgIHJldHVybiByb290O1xuICAgIH1cbiAgICBxdWFkdHJlZS54ID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeCA9IF8sIHF1YWR0cmVlKSA6IHg7XG4gICAgfTtcbiAgICBxdWFkdHJlZS55ID0gZnVuY3Rpb24oXykge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeSA9IF8sIHF1YWR0cmVlKSA6IHk7XG4gICAgfTtcbiAgICBxdWFkdHJlZS5leHRlbnQgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB4MSA9PSBudWxsID8gbnVsbCA6IFsgWyB4MSwgeTEgXSwgWyB4MiwgeTIgXSBdO1xuICAgICAgaWYgKF8gPT0gbnVsbCkgeDEgPSB5MSA9IHgyID0geTIgPSBudWxsOyBlbHNlIHgxID0gK19bMF1bMF0sIHkxID0gK19bMF1bMV0sIHgyID0gK19bMV1bMF0sIFxuICAgICAgeTIgPSArX1sxXVsxXTtcbiAgICAgIHJldHVybiBxdWFkdHJlZTtcbiAgICB9O1xuICAgIHF1YWR0cmVlLnNpemUgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB4MSA9PSBudWxsID8gbnVsbCA6IFsgeDIgLSB4MSwgeTIgLSB5MSBdO1xuICAgICAgaWYgKF8gPT0gbnVsbCkgeDEgPSB5MSA9IHgyID0geTIgPSBudWxsOyBlbHNlIHgxID0geTEgPSAwLCB4MiA9ICtfWzBdLCB5MiA9ICtfWzFdO1xuICAgICAgcmV0dXJuIHF1YWR0cmVlO1xuICAgIH07XG4gICAgcmV0dXJuIHF1YWR0cmVlO1xuICB9O1xuICBmdW5jdGlvbiBkM19nZW9tX3F1YWR0cmVlQ29tcGF0WChkKSB7XG4gICAgcmV0dXJuIGQueDtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3F1YWR0cmVlQ29tcGF0WShkKSB7XG4gICAgcmV0dXJuIGQueTtcbiAgfVxuICBmdW5jdGlvbiBkM19nZW9tX3F1YWR0cmVlTm9kZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGVhZjogdHJ1ZSxcbiAgICAgIG5vZGVzOiBbXSxcbiAgICAgIHBvaW50OiBudWxsLFxuICAgICAgeDogbnVsbCxcbiAgICAgIHk6IG51bGxcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGQzX2dlb21fcXVhZHRyZWVWaXNpdChmLCBub2RlLCB4MSwgeTEsIHgyLCB5Mikge1xuICAgIGlmICghZihub2RlLCB4MSwgeTEsIHgyLCB5MikpIHtcbiAgICAgIHZhciBzeCA9ICh4MSArIHgyKSAqIC41LCBzeSA9ICh5MSArIHkyKSAqIC41LCBjaGlsZHJlbiA9IG5vZGUubm9kZXM7XG4gICAgICBpZiAoY2hpbGRyZW5bMF0pIGQzX2dlb21fcXVhZHRyZWVWaXNpdChmLCBjaGlsZHJlblswXSwgeDEsIHkxLCBzeCwgc3kpO1xuICAgICAgaWYgKGNoaWxkcmVuWzFdKSBkM19nZW9tX3F1YWR0cmVlVmlzaXQoZiwgY2hpbGRyZW5bMV0sIHN4LCB5MSwgeDIsIHN5KTtcbiAgICAgIGlmIChjaGlsZHJlblsyXSkgZDNfZ2VvbV9xdWFkdHJlZVZpc2l0KGYsIGNoaWxkcmVuWzJdLCB4MSwgc3ksIHN4LCB5Mik7XG4gICAgICBpZiAoY2hpbGRyZW5bM10pIGQzX2dlb21fcXVhZHRyZWVWaXNpdChmLCBjaGlsZHJlblszXSwgc3gsIHN5LCB4MiwgeTIpO1xuICAgIH1cbiAgfVxuICBkMy5pbnRlcnBvbGF0ZVJnYiA9IGQzX2ludGVycG9sYXRlUmdiO1xuICBmdW5jdGlvbiBkM19pbnRlcnBvbGF0ZVJnYihhLCBiKSB7XG4gICAgYSA9IGQzLnJnYihhKTtcbiAgICBiID0gZDMucmdiKGIpO1xuICAgIHZhciBhciA9IGEuciwgYWcgPSBhLmcsIGFiID0gYS5iLCBiciA9IGIuciAtIGFyLCBiZyA9IGIuZyAtIGFnLCBiYiA9IGIuYiAtIGFiO1xuICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICByZXR1cm4gXCIjXCIgKyBkM19yZ2JfaGV4KE1hdGgucm91bmQoYXIgKyBiciAqIHQpKSArIGQzX3JnYl9oZXgoTWF0aC5yb3VuZChhZyArIGJnICogdCkpICsgZDNfcmdiX2hleChNYXRoLnJvdW5kKGFiICsgYmIgKiB0KSk7XG4gICAgfTtcbiAgfVxuICBkMy5pbnRlcnBvbGF0ZU9iamVjdCA9IGQzX2ludGVycG9sYXRlT2JqZWN0O1xuICBmdW5jdGlvbiBkM19pbnRlcnBvbGF0ZU9iamVjdChhLCBiKSB7XG4gICAgdmFyIGkgPSB7fSwgYyA9IHt9LCBrO1xuICAgIGZvciAoayBpbiBhKSB7XG4gICAgICBpZiAoayBpbiBiKSB7XG4gICAgICAgIGlba10gPSBkM19pbnRlcnBvbGF0ZShhW2tdLCBiW2tdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNba10gPSBhW2tdO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGsgaW4gYikge1xuICAgICAgaWYgKCEoayBpbiBhKSkge1xuICAgICAgICBjW2tdID0gYltrXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIGZvciAoayBpbiBpKSBjW2tdID0gaVtrXSh0KTtcbiAgICAgIHJldHVybiBjO1xuICAgIH07XG4gIH1cbiAgZDMuaW50ZXJwb2xhdGVOdW1iZXIgPSBkM19pbnRlcnBvbGF0ZU51bWJlcjtcbiAgZnVuY3Rpb24gZDNfaW50ZXJwb2xhdGVOdW1iZXIoYSwgYikge1xuICAgIGIgLT0gYSA9ICthO1xuICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICByZXR1cm4gYSArIGIgKiB0O1xuICAgIH07XG4gIH1cbiAgZDMuaW50ZXJwb2xhdGVTdHJpbmcgPSBkM19pbnRlcnBvbGF0ZVN0cmluZztcbiAgZnVuY3Rpb24gZDNfaW50ZXJwb2xhdGVTdHJpbmcoYSwgYikge1xuICAgIHZhciBtLCBpLCBqLCBzMCA9IDAsIHMxID0gMCwgcyA9IFtdLCBxID0gW10sIG4sIG87XG4gICAgYSA9IGEgKyBcIlwiLCBiID0gYiArIFwiXCI7XG4gICAgZDNfaW50ZXJwb2xhdGVfbnVtYmVyLmxhc3RJbmRleCA9IDA7XG4gICAgZm9yIChpID0gMDsgbSA9IGQzX2ludGVycG9sYXRlX251bWJlci5leGVjKGIpOyArK2kpIHtcbiAgICAgIGlmIChtLmluZGV4KSBzLnB1c2goYi5zdWJzdHJpbmcoczAsIHMxID0gbS5pbmRleCkpO1xuICAgICAgcS5wdXNoKHtcbiAgICAgICAgaTogcy5sZW5ndGgsXG4gICAgICAgIHg6IG1bMF1cbiAgICAgIH0pO1xuICAgICAgcy5wdXNoKG51bGwpO1xuICAgICAgczAgPSBkM19pbnRlcnBvbGF0ZV9udW1iZXIubGFzdEluZGV4O1xuICAgIH1cbiAgICBpZiAoczAgPCBiLmxlbmd0aCkgcy5wdXNoKGIuc3Vic3RyaW5nKHMwKSk7XG4gICAgZm9yIChpID0gMCwgbiA9IHEubGVuZ3RoOyAobSA9IGQzX2ludGVycG9sYXRlX251bWJlci5leGVjKGEpKSAmJiBpIDwgbjsgKytpKSB7XG4gICAgICBvID0gcVtpXTtcbiAgICAgIGlmIChvLnggPT0gbVswXSkge1xuICAgICAgICBpZiAoby5pKSB7XG4gICAgICAgICAgaWYgKHNbby5pICsgMV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgc1tvLmkgLSAxXSArPSBvLng7XG4gICAgICAgICAgICBzLnNwbGljZShvLmksIDEpO1xuICAgICAgICAgICAgZm9yIChqID0gaSArIDE7IGogPCBuOyArK2opIHFbal0uaS0tO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzW28uaSAtIDFdICs9IG8ueCArIHNbby5pICsgMV07XG4gICAgICAgICAgICBzLnNwbGljZShvLmksIDIpO1xuICAgICAgICAgICAgZm9yIChqID0gaSArIDE7IGogPCBuOyArK2opIHFbal0uaSAtPSAyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoc1tvLmkgKyAxXSA9PSBudWxsKSB7XG4gICAgICAgICAgICBzW28uaV0gPSBvLng7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNbby5pXSA9IG8ueCArIHNbby5pICsgMV07XG4gICAgICAgICAgICBzLnNwbGljZShvLmkgKyAxLCAxKTtcbiAgICAgICAgICAgIGZvciAoaiA9IGkgKyAxOyBqIDwgbjsgKytqKSBxW2pdLmktLTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcS5zcGxpY2UoaSwgMSk7XG4gICAgICAgIG4tLTtcbiAgICAgICAgaS0tO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgby54ID0gZDNfaW50ZXJwb2xhdGVOdW1iZXIocGFyc2VGbG9hdChtWzBdKSwgcGFyc2VGbG9hdChvLngpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgd2hpbGUgKGkgPCBuKSB7XG4gICAgICBvID0gcS5wb3AoKTtcbiAgICAgIGlmIChzW28uaSArIDFdID09IG51bGwpIHtcbiAgICAgICAgc1tvLmldID0gby54O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc1tvLmldID0gby54ICsgc1tvLmkgKyAxXTtcbiAgICAgICAgcy5zcGxpY2Uoby5pICsgMSwgMSk7XG4gICAgICB9XG4gICAgICBuLS07XG4gICAgfVxuICAgIGlmIChzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgcmV0dXJuIHNbMF0gPT0gbnVsbCA/IChvID0gcVswXS54LCBmdW5jdGlvbih0KSB7XG4gICAgICAgIHJldHVybiBvKHQpICsgXCJcIjtcbiAgICAgIH0pIDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBiO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHNbKG8gPSBxW2ldKS5pXSA9IG8ueCh0KTtcbiAgICAgIHJldHVybiBzLmpvaW4oXCJcIik7XG4gICAgfTtcbiAgfVxuICB2YXIgZDNfaW50ZXJwb2xhdGVfbnVtYmVyID0gL1stK10/KD86XFxkK1xcLj9cXGQqfFxcLj9cXGQrKSg/OltlRV1bLStdP1xcZCspPy9nO1xuICBkMy5pbnRlcnBvbGF0ZSA9IGQzX2ludGVycG9sYXRlO1xuICBmdW5jdGlvbiBkM19pbnRlcnBvbGF0ZShhLCBiKSB7XG4gICAgdmFyIGkgPSBkMy5pbnRlcnBvbGF0b3JzLmxlbmd0aCwgZjtcbiAgICB3aGlsZSAoLS1pID49IDAgJiYgIShmID0gZDMuaW50ZXJwb2xhdG9yc1tpXShhLCBiKSkpIDtcbiAgICByZXR1cm4gZjtcbiAgfVxuICBkMy5pbnRlcnBvbGF0b3JzID0gWyBmdW5jdGlvbihhLCBiKSB7XG4gICAgdmFyIHQgPSB0eXBlb2YgYjtcbiAgICByZXR1cm4gKHQgPT09IFwic3RyaW5nXCIgPyBkM19yZ2JfbmFtZXMuaGFzKGIpIHx8IC9eKCN8cmdiXFwofGhzbFxcKCkvLnRlc3QoYikgPyBkM19pbnRlcnBvbGF0ZVJnYiA6IGQzX2ludGVycG9sYXRlU3RyaW5nIDogYiBpbnN0YW5jZW9mIGQzX0NvbG9yID8gZDNfaW50ZXJwb2xhdGVSZ2IgOiB0ID09PSBcIm9iamVjdFwiID8gQXJyYXkuaXNBcnJheShiKSA/IGQzX2ludGVycG9sYXRlQXJyYXkgOiBkM19pbnRlcnBvbGF0ZU9iamVjdCA6IGQzX2ludGVycG9sYXRlTnVtYmVyKShhLCBiKTtcbiAgfSBdO1xuICBkMy5pbnRlcnBvbGF0ZUFycmF5ID0gZDNfaW50ZXJwb2xhdGVBcnJheTtcbiAgZnVuY3Rpb24gZDNfaW50ZXJwb2xhdGVBcnJheShhLCBiKSB7XG4gICAgdmFyIHggPSBbXSwgYyA9IFtdLCBuYSA9IGEubGVuZ3RoLCBuYiA9IGIubGVuZ3RoLCBuMCA9IE1hdGgubWluKGEubGVuZ3RoLCBiLmxlbmd0aCksIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IG4wOyArK2kpIHgucHVzaChkM19pbnRlcnBvbGF0ZShhW2ldLCBiW2ldKSk7XG4gICAgZm9yICg7aSA8IG5hOyArK2kpIGNbaV0gPSBhW2ldO1xuICAgIGZvciAoO2kgPCBuYjsgKytpKSBjW2ldID0gYltpXTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgZm9yIChpID0gMDsgaSA8IG4wOyArK2kpIGNbaV0gPSB4W2ldKHQpO1xuICAgICAgcmV0dXJuIGM7XG4gICAgfTtcbiAgfVxuICB2YXIgZDNfZWFzZV9kZWZhdWx0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX2lkZW50aXR5O1xuICB9O1xuICB2YXIgZDNfZWFzZSA9IGQzLm1hcCh7XG4gICAgbGluZWFyOiBkM19lYXNlX2RlZmF1bHQsXG4gICAgcG9seTogZDNfZWFzZV9wb2x5LFxuICAgIHF1YWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGQzX2Vhc2VfcXVhZDtcbiAgICB9LFxuICAgIGN1YmljOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBkM19lYXNlX2N1YmljO1xuICAgIH0sXG4gICAgc2luOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBkM19lYXNlX3NpbjtcbiAgICB9LFxuICAgIGV4cDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZDNfZWFzZV9leHA7XG4gICAgfSxcbiAgICBjaXJjbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGQzX2Vhc2VfY2lyY2xlO1xuICAgIH0sXG4gICAgZWxhc3RpYzogZDNfZWFzZV9lbGFzdGljLFxuICAgIGJhY2s6IGQzX2Vhc2VfYmFjayxcbiAgICBib3VuY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGQzX2Vhc2VfYm91bmNlO1xuICAgIH1cbiAgfSk7XG4gIHZhciBkM19lYXNlX21vZGUgPSBkMy5tYXAoe1xuICAgIFwiaW5cIjogZDNfaWRlbnRpdHksXG4gICAgb3V0OiBkM19lYXNlX3JldmVyc2UsXG4gICAgXCJpbi1vdXRcIjogZDNfZWFzZV9yZWZsZWN0LFxuICAgIFwib3V0LWluXCI6IGZ1bmN0aW9uKGYpIHtcbiAgICAgIHJldHVybiBkM19lYXNlX3JlZmxlY3QoZDNfZWFzZV9yZXZlcnNlKGYpKTtcbiAgICB9XG4gIH0pO1xuICBkMy5lYXNlID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBpID0gbmFtZS5pbmRleE9mKFwiLVwiKSwgdCA9IGkgPj0gMCA/IG5hbWUuc3Vic3RyaW5nKDAsIGkpIDogbmFtZSwgbSA9IGkgPj0gMCA/IG5hbWUuc3Vic3RyaW5nKGkgKyAxKSA6IFwiaW5cIjtcbiAgICB0ID0gZDNfZWFzZS5nZXQodCkgfHwgZDNfZWFzZV9kZWZhdWx0O1xuICAgIG0gPSBkM19lYXNlX21vZGUuZ2V0KG0pIHx8IGQzX2lkZW50aXR5O1xuICAgIHJldHVybiBkM19lYXNlX2NsYW1wKG0odC5hcHBseShudWxsLCBkM19hcnJheVNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfZWFzZV9jbGFtcChmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiB0IDw9IDAgPyAwIDogdCA+PSAxID8gMSA6IGYodCk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBkM19lYXNlX3JldmVyc2UoZikge1xuICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICByZXR1cm4gMSAtIGYoMSAtIHQpO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gZDNfZWFzZV9yZWZsZWN0KGYpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgcmV0dXJuIC41ICogKHQgPCAuNSA/IGYoMiAqIHQpIDogMiAtIGYoMiAtIDIgKiB0KSk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBkM19lYXNlX3F1YWQodCkge1xuICAgIHJldHVybiB0ICogdDtcbiAgfVxuICBmdW5jdGlvbiBkM19lYXNlX2N1YmljKHQpIHtcbiAgICByZXR1cm4gdCAqIHQgKiB0O1xuICB9XG4gIGZ1bmN0aW9uIGQzX2Vhc2VfY3ViaWNJbk91dCh0KSB7XG4gICAgaWYgKHQgPD0gMCkgcmV0dXJuIDA7XG4gICAgaWYgKHQgPj0gMSkgcmV0dXJuIDE7XG4gICAgdmFyIHQyID0gdCAqIHQsIHQzID0gdDIgKiB0O1xuICAgIHJldHVybiA0ICogKHQgPCAuNSA/IHQzIDogMyAqICh0IC0gdDIpICsgdDMgLSAuNzUpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2Vhc2VfcG9seShlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiBNYXRoLnBvdyh0LCBlKTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGQzX2Vhc2Vfc2luKHQpIHtcbiAgICByZXR1cm4gMSAtIE1hdGguY29zKHQgKiBoYWxmz4ApO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2Vhc2VfZXhwKHQpIHtcbiAgICByZXR1cm4gTWF0aC5wb3coMiwgMTAgKiAodCAtIDEpKTtcbiAgfVxuICBmdW5jdGlvbiBkM19lYXNlX2NpcmNsZSh0KSB7XG4gICAgcmV0dXJuIDEgLSBNYXRoLnNxcnQoMSAtIHQgKiB0KTtcbiAgfVxuICBmdW5jdGlvbiBkM19lYXNlX2VsYXN0aWMoYSwgcCkge1xuICAgIHZhciBzO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikgcCA9IC40NTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCkgcyA9IHAgLyDPhCAqIE1hdGguYXNpbigxIC8gYSk7IGVsc2UgYSA9IDEsIHMgPSBwIC8gNDtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgcmV0dXJuIDEgKyBhICogTWF0aC5wb3coMiwgLTEwICogdCkgKiBNYXRoLnNpbigodCAtIHMpICogz4QgLyBwKTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGQzX2Vhc2VfYmFjayhzKSB7XG4gICAgaWYgKCFzKSBzID0gMS43MDE1ODtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgcmV0dXJuIHQgKiB0ICogKChzICsgMSkgKiB0IC0gcyk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBkM19lYXNlX2JvdW5jZSh0KSB7XG4gICAgcmV0dXJuIHQgPCAxIC8gMi43NSA/IDcuNTYyNSAqIHQgKiB0IDogdCA8IDIgLyAyLjc1ID8gNy41NjI1ICogKHQgLT0gMS41IC8gMi43NSkgKiB0ICsgLjc1IDogdCA8IDIuNSAvIDIuNzUgPyA3LjU2MjUgKiAodCAtPSAyLjI1IC8gMi43NSkgKiB0ICsgLjkzNzUgOiA3LjU2MjUgKiAodCAtPSAyLjYyNSAvIDIuNzUpICogdCArIC45ODQzNzU7XG4gIH1cbiAgZDMuaW50ZXJwb2xhdGVIY2wgPSBkM19pbnRlcnBvbGF0ZUhjbDtcbiAgZnVuY3Rpb24gZDNfaW50ZXJwb2xhdGVIY2woYSwgYikge1xuICAgIGEgPSBkMy5oY2woYSk7XG4gICAgYiA9IGQzLmhjbChiKTtcbiAgICB2YXIgYWggPSBhLmgsIGFjID0gYS5jLCBhbCA9IGEubCwgYmggPSBiLmggLSBhaCwgYmMgPSBiLmMgLSBhYywgYmwgPSBiLmwgLSBhbDtcbiAgICBpZiAoaXNOYU4oYmMpKSBiYyA9IDAsIGFjID0gaXNOYU4oYWMpID8gYi5jIDogYWM7XG4gICAgaWYgKGlzTmFOKGJoKSkgYmggPSAwLCBhaCA9IGlzTmFOKGFoKSA/IGIuaCA6IGFoOyBlbHNlIGlmIChiaCA+IDE4MCkgYmggLT0gMzYwOyBlbHNlIGlmIChiaCA8IC0xODApIGJoICs9IDM2MDtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgcmV0dXJuIGQzX2hjbF9sYWIoYWggKyBiaCAqIHQsIGFjICsgYmMgKiB0LCBhbCArIGJsICogdCkgKyBcIlwiO1xuICAgIH07XG4gIH1cbiAgZDMuaW50ZXJwb2xhdGVIc2wgPSBkM19pbnRlcnBvbGF0ZUhzbDtcbiAgZnVuY3Rpb24gZDNfaW50ZXJwb2xhdGVIc2woYSwgYikge1xuICAgIGEgPSBkMy5oc2woYSk7XG4gICAgYiA9IGQzLmhzbChiKTtcbiAgICB2YXIgYWggPSBhLmgsIGFzID0gYS5zLCBhbCA9IGEubCwgYmggPSBiLmggLSBhaCwgYnMgPSBiLnMgLSBhcywgYmwgPSBiLmwgLSBhbDtcbiAgICBpZiAoaXNOYU4oYnMpKSBicyA9IDAsIGFzID0gaXNOYU4oYXMpID8gYi5zIDogYXM7XG4gICAgaWYgKGlzTmFOKGJoKSkgYmggPSAwLCBhaCA9IGlzTmFOKGFoKSA/IGIuaCA6IGFoOyBlbHNlIGlmIChiaCA+IDE4MCkgYmggLT0gMzYwOyBlbHNlIGlmIChiaCA8IC0xODApIGJoICs9IDM2MDtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgcmV0dXJuIGQzX2hzbF9yZ2IoYWggKyBiaCAqIHQsIGFzICsgYnMgKiB0LCBhbCArIGJsICogdCkgKyBcIlwiO1xuICAgIH07XG4gIH1cbiAgZDMuaW50ZXJwb2xhdGVMYWIgPSBkM19pbnRlcnBvbGF0ZUxhYjtcbiAgZnVuY3Rpb24gZDNfaW50ZXJwb2xhdGVMYWIoYSwgYikge1xuICAgIGEgPSBkMy5sYWIoYSk7XG4gICAgYiA9IGQzLmxhYihiKTtcbiAgICB2YXIgYWwgPSBhLmwsIGFhID0gYS5hLCBhYiA9IGEuYiwgYmwgPSBiLmwgLSBhbCwgYmEgPSBiLmEgLSBhYSwgYmIgPSBiLmIgLSBhYjtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgcmV0dXJuIGQzX2xhYl9yZ2IoYWwgKyBibCAqIHQsIGFhICsgYmEgKiB0LCBhYiArIGJiICogdCkgKyBcIlwiO1xuICAgIH07XG4gIH1cbiAgZDMuaW50ZXJwb2xhdGVSb3VuZCA9IGQzX2ludGVycG9sYXRlUm91bmQ7XG4gIGZ1bmN0aW9uIGQzX2ludGVycG9sYXRlUm91bmQoYSwgYikge1xuICAgIGIgLT0gYTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgcmV0dXJuIE1hdGgucm91bmQoYSArIGIgKiB0KTtcbiAgICB9O1xuICB9XG4gIGQzLnRyYW5zZm9ybSA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHZhciBnID0gZDNfZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKGQzLm5zLnByZWZpeC5zdmcsIFwiZ1wiKTtcbiAgICByZXR1cm4gKGQzLnRyYW5zZm9ybSA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgaWYgKHN0cmluZyAhPSBudWxsKSB7XG4gICAgICAgIGcuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIHN0cmluZyk7XG4gICAgICAgIHZhciB0ID0gZy50cmFuc2Zvcm0uYmFzZVZhbC5jb25zb2xpZGF0ZSgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBkM190cmFuc2Zvcm0odCA/IHQubWF0cml4IDogZDNfdHJhbnNmb3JtSWRlbnRpdHkpO1xuICAgIH0pKHN0cmluZyk7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3RyYW5zZm9ybShtKSB7XG4gICAgdmFyIHIwID0gWyBtLmEsIG0uYiBdLCByMSA9IFsgbS5jLCBtLmQgXSwga3ggPSBkM190cmFuc2Zvcm1Ob3JtYWxpemUocjApLCBreiA9IGQzX3RyYW5zZm9ybURvdChyMCwgcjEpLCBreSA9IGQzX3RyYW5zZm9ybU5vcm1hbGl6ZShkM190cmFuc2Zvcm1Db21iaW5lKHIxLCByMCwgLWt6KSkgfHwgMDtcbiAgICBpZiAocjBbMF0gKiByMVsxXSA8IHIxWzBdICogcjBbMV0pIHtcbiAgICAgIHIwWzBdICo9IC0xO1xuICAgICAgcjBbMV0gKj0gLTE7XG4gICAgICBreCAqPSAtMTtcbiAgICAgIGt6ICo9IC0xO1xuICAgIH1cbiAgICB0aGlzLnJvdGF0ZSA9IChreCA/IE1hdGguYXRhbjIocjBbMV0sIHIwWzBdKSA6IE1hdGguYXRhbjIoLXIxWzBdLCByMVsxXSkpICogZDNfZGVncmVlcztcbiAgICB0aGlzLnRyYW5zbGF0ZSA9IFsgbS5lLCBtLmYgXTtcbiAgICB0aGlzLnNjYWxlID0gWyBreCwga3kgXTtcbiAgICB0aGlzLnNrZXcgPSBreSA/IE1hdGguYXRhbjIoa3osIGt5KSAqIGQzX2RlZ3JlZXMgOiAwO1xuICB9XG4gIGQzX3RyYW5zZm9ybS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyB0aGlzLnRyYW5zbGF0ZSArIFwiKXJvdGF0ZShcIiArIHRoaXMucm90YXRlICsgXCIpc2tld1goXCIgKyB0aGlzLnNrZXcgKyBcIilzY2FsZShcIiArIHRoaXMuc2NhbGUgKyBcIilcIjtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfdHJhbnNmb3JtRG90KGEsIGIpIHtcbiAgICByZXR1cm4gYVswXSAqIGJbMF0gKyBhWzFdICogYlsxXTtcbiAgfVxuICBmdW5jdGlvbiBkM190cmFuc2Zvcm1Ob3JtYWxpemUoYSkge1xuICAgIHZhciBrID0gTWF0aC5zcXJ0KGQzX3RyYW5zZm9ybURvdChhLCBhKSk7XG4gICAgaWYgKGspIHtcbiAgICAgIGFbMF0gLz0gaztcbiAgICAgIGFbMV0gLz0gaztcbiAgICB9XG4gICAgcmV0dXJuIGs7XG4gIH1cbiAgZnVuY3Rpb24gZDNfdHJhbnNmb3JtQ29tYmluZShhLCBiLCBrKSB7XG4gICAgYVswXSArPSBrICogYlswXTtcbiAgICBhWzFdICs9IGsgKiBiWzFdO1xuICAgIHJldHVybiBhO1xuICB9XG4gIHZhciBkM190cmFuc2Zvcm1JZGVudGl0eSA9IHtcbiAgICBhOiAxLFxuICAgIGI6IDAsXG4gICAgYzogMCxcbiAgICBkOiAxLFxuICAgIGU6IDAsXG4gICAgZjogMFxuICB9O1xuICBkMy5pbnRlcnBvbGF0ZVRyYW5zZm9ybSA9IGQzX2ludGVycG9sYXRlVHJhbnNmb3JtO1xuICBmdW5jdGlvbiBkM19pbnRlcnBvbGF0ZVRyYW5zZm9ybShhLCBiKSB7XG4gICAgdmFyIHMgPSBbXSwgcSA9IFtdLCBuLCBBID0gZDMudHJhbnNmb3JtKGEpLCBCID0gZDMudHJhbnNmb3JtKGIpLCB0YSA9IEEudHJhbnNsYXRlLCB0YiA9IEIudHJhbnNsYXRlLCByYSA9IEEucm90YXRlLCByYiA9IEIucm90YXRlLCB3YSA9IEEuc2tldywgd2IgPSBCLnNrZXcsIGthID0gQS5zY2FsZSwga2IgPSBCLnNjYWxlO1xuICAgIGlmICh0YVswXSAhPSB0YlswXSB8fCB0YVsxXSAhPSB0YlsxXSkge1xuICAgICAgcy5wdXNoKFwidHJhbnNsYXRlKFwiLCBudWxsLCBcIixcIiwgbnVsbCwgXCIpXCIpO1xuICAgICAgcS5wdXNoKHtcbiAgICAgICAgaTogMSxcbiAgICAgICAgeDogZDNfaW50ZXJwb2xhdGVOdW1iZXIodGFbMF0sIHRiWzBdKVxuICAgICAgfSwge1xuICAgICAgICBpOiAzLFxuICAgICAgICB4OiBkM19pbnRlcnBvbGF0ZU51bWJlcih0YVsxXSwgdGJbMV0pXG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHRiWzBdIHx8IHRiWzFdKSB7XG4gICAgICBzLnB1c2goXCJ0cmFuc2xhdGUoXCIgKyB0YiArIFwiKVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcy5wdXNoKFwiXCIpO1xuICAgIH1cbiAgICBpZiAocmEgIT0gcmIpIHtcbiAgICAgIGlmIChyYSAtIHJiID4gMTgwKSByYiArPSAzNjA7IGVsc2UgaWYgKHJiIC0gcmEgPiAxODApIHJhICs9IDM2MDtcbiAgICAgIHEucHVzaCh7XG4gICAgICAgIGk6IHMucHVzaChzLnBvcCgpICsgXCJyb3RhdGUoXCIsIG51bGwsIFwiKVwiKSAtIDIsXG4gICAgICAgIHg6IGQzX2ludGVycG9sYXRlTnVtYmVyKHJhLCByYilcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAocmIpIHtcbiAgICAgIHMucHVzaChzLnBvcCgpICsgXCJyb3RhdGUoXCIgKyByYiArIFwiKVwiKTtcbiAgICB9XG4gICAgaWYgKHdhICE9IHdiKSB7XG4gICAgICBxLnB1c2goe1xuICAgICAgICBpOiBzLnB1c2gocy5wb3AoKSArIFwic2tld1goXCIsIG51bGwsIFwiKVwiKSAtIDIsXG4gICAgICAgIHg6IGQzX2ludGVycG9sYXRlTnVtYmVyKHdhLCB3YilcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAod2IpIHtcbiAgICAgIHMucHVzaChzLnBvcCgpICsgXCJza2V3WChcIiArIHdiICsgXCIpXCIpO1xuICAgIH1cbiAgICBpZiAoa2FbMF0gIT0ga2JbMF0gfHwga2FbMV0gIT0ga2JbMV0pIHtcbiAgICAgIG4gPSBzLnB1c2gocy5wb3AoKSArIFwic2NhbGUoXCIsIG51bGwsIFwiLFwiLCBudWxsLCBcIilcIik7XG4gICAgICBxLnB1c2goe1xuICAgICAgICBpOiBuIC0gNCxcbiAgICAgICAgeDogZDNfaW50ZXJwb2xhdGVOdW1iZXIoa2FbMF0sIGtiWzBdKVxuICAgICAgfSwge1xuICAgICAgICBpOiBuIC0gMixcbiAgICAgICAgeDogZDNfaW50ZXJwb2xhdGVOdW1iZXIoa2FbMV0sIGtiWzFdKVxuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChrYlswXSAhPSAxIHx8IGtiWzFdICE9IDEpIHtcbiAgICAgIHMucHVzaChzLnBvcCgpICsgXCJzY2FsZShcIiArIGtiICsgXCIpXCIpO1xuICAgIH1cbiAgICBuID0gcS5sZW5ndGg7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIHZhciBpID0gLTEsIG87XG4gICAgICB3aGlsZSAoKytpIDwgbikgc1sobyA9IHFbaV0pLmldID0gby54KHQpO1xuICAgICAgcmV0dXJuIHMuam9pbihcIlwiKTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGQzX3VuaW50ZXJwb2xhdGVOdW1iZXIoYSwgYikge1xuICAgIGIgPSBiIC0gKGEgPSArYSkgPyAxIC8gKGIgLSBhKSA6IDA7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAoeCAtIGEpICogYjtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGQzX3VuaW50ZXJwb2xhdGVDbGFtcChhLCBiKSB7XG4gICAgYiA9IGIgLSAoYSA9ICthKSA/IDEgLyAoYiAtIGEpIDogMDtcbiAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWluKDEsICh4IC0gYSkgKiBiKSk7XG4gICAgfTtcbiAgfVxuICBkMy5sYXlvdXQgPSB7fTtcbiAgZDMubGF5b3V0LmJ1bmRsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmdW5jdGlvbihsaW5rcykge1xuICAgICAgdmFyIHBhdGhzID0gW10sIGkgPSAtMSwgbiA9IGxpbmtzLmxlbmd0aDtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBwYXRocy5wdXNoKGQzX2xheW91dF9idW5kbGVQYXRoKGxpbmtzW2ldKSk7XG4gICAgICByZXR1cm4gcGF0aHM7XG4gICAgfTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfbGF5b3V0X2J1bmRsZVBhdGgobGluaykge1xuICAgIHZhciBzdGFydCA9IGxpbmsuc291cmNlLCBlbmQgPSBsaW5rLnRhcmdldCwgbGNhID0gZDNfbGF5b3V0X2J1bmRsZUxlYXN0Q29tbW9uQW5jZXN0b3Ioc3RhcnQsIGVuZCksIHBvaW50cyA9IFsgc3RhcnQgXTtcbiAgICB3aGlsZSAoc3RhcnQgIT09IGxjYSkge1xuICAgICAgc3RhcnQgPSBzdGFydC5wYXJlbnQ7XG4gICAgICBwb2ludHMucHVzaChzdGFydCk7XG4gICAgfVxuICAgIHZhciBrID0gcG9pbnRzLmxlbmd0aDtcbiAgICB3aGlsZSAoZW5kICE9PSBsY2EpIHtcbiAgICAgIHBvaW50cy5zcGxpY2UoaywgMCwgZW5kKTtcbiAgICAgIGVuZCA9IGVuZC5wYXJlbnQ7XG4gICAgfVxuICAgIHJldHVybiBwb2ludHM7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X2J1bmRsZUFuY2VzdG9ycyhub2RlKSB7XG4gICAgdmFyIGFuY2VzdG9ycyA9IFtdLCBwYXJlbnQgPSBub2RlLnBhcmVudDtcbiAgICB3aGlsZSAocGFyZW50ICE9IG51bGwpIHtcbiAgICAgIGFuY2VzdG9ycy5wdXNoKG5vZGUpO1xuICAgICAgbm9kZSA9IHBhcmVudDtcbiAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQ7XG4gICAgfVxuICAgIGFuY2VzdG9ycy5wdXNoKG5vZGUpO1xuICAgIHJldHVybiBhbmNlc3RvcnM7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X2J1bmRsZUxlYXN0Q29tbW9uQW5jZXN0b3IoYSwgYikge1xuICAgIGlmIChhID09PSBiKSByZXR1cm4gYTtcbiAgICB2YXIgYU5vZGVzID0gZDNfbGF5b3V0X2J1bmRsZUFuY2VzdG9ycyhhKSwgYk5vZGVzID0gZDNfbGF5b3V0X2J1bmRsZUFuY2VzdG9ycyhiKSwgYU5vZGUgPSBhTm9kZXMucG9wKCksIGJOb2RlID0gYk5vZGVzLnBvcCgpLCBzaGFyZWROb2RlID0gbnVsbDtcbiAgICB3aGlsZSAoYU5vZGUgPT09IGJOb2RlKSB7XG4gICAgICBzaGFyZWROb2RlID0gYU5vZGU7XG4gICAgICBhTm9kZSA9IGFOb2Rlcy5wb3AoKTtcbiAgICAgIGJOb2RlID0gYk5vZGVzLnBvcCgpO1xuICAgIH1cbiAgICByZXR1cm4gc2hhcmVkTm9kZTtcbiAgfVxuICBkMy5sYXlvdXQuY2hvcmQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY2hvcmQgPSB7fSwgY2hvcmRzLCBncm91cHMsIG1hdHJpeCwgbiwgcGFkZGluZyA9IDAsIHNvcnRHcm91cHMsIHNvcnRTdWJncm91cHMsIHNvcnRDaG9yZHM7XG4gICAgZnVuY3Rpb24gcmVsYXlvdXQoKSB7XG4gICAgICB2YXIgc3ViZ3JvdXBzID0ge30sIGdyb3VwU3VtcyA9IFtdLCBncm91cEluZGV4ID0gZDMucmFuZ2UobiksIHN1Ymdyb3VwSW5kZXggPSBbXSwgaywgeCwgeDAsIGksIGo7XG4gICAgICBjaG9yZHMgPSBbXTtcbiAgICAgIGdyb3VwcyA9IFtdO1xuICAgICAgayA9IDAsIGkgPSAtMTtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIHggPSAwLCBqID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2ogPCBuKSB7XG4gICAgICAgICAgeCArPSBtYXRyaXhbaV1bal07XG4gICAgICAgIH1cbiAgICAgICAgZ3JvdXBTdW1zLnB1c2goeCk7XG4gICAgICAgIHN1Ymdyb3VwSW5kZXgucHVzaChkMy5yYW5nZShuKSk7XG4gICAgICAgIGsgKz0geDtcbiAgICAgIH1cbiAgICAgIGlmIChzb3J0R3JvdXBzKSB7XG4gICAgICAgIGdyb3VwSW5kZXguc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgcmV0dXJuIHNvcnRHcm91cHMoZ3JvdXBTdW1zW2FdLCBncm91cFN1bXNbYl0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChzb3J0U3ViZ3JvdXBzKSB7XG4gICAgICAgIHN1Ymdyb3VwSW5kZXguZm9yRWFjaChmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgZC5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBzb3J0U3ViZ3JvdXBzKG1hdHJpeFtpXVthXSwgbWF0cml4W2ldW2JdKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBrID0gKM+EIC0gcGFkZGluZyAqIG4pIC8gaztcbiAgICAgIHggPSAwLCBpID0gLTE7XG4gICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICB4MCA9IHgsIGogPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraiA8IG4pIHtcbiAgICAgICAgICB2YXIgZGkgPSBncm91cEluZGV4W2ldLCBkaiA9IHN1Ymdyb3VwSW5kZXhbZGldW2pdLCB2ID0gbWF0cml4W2RpXVtkal0sIGEwID0geCwgYTEgPSB4ICs9IHYgKiBrO1xuICAgICAgICAgIHN1Ymdyb3Vwc1tkaSArIFwiLVwiICsgZGpdID0ge1xuICAgICAgICAgICAgaW5kZXg6IGRpLFxuICAgICAgICAgICAgc3ViaW5kZXg6IGRqLFxuICAgICAgICAgICAgc3RhcnRBbmdsZTogYTAsXG4gICAgICAgICAgICBlbmRBbmdsZTogYTEsXG4gICAgICAgICAgICB2YWx1ZTogdlxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZ3JvdXBzW2RpXSA9IHtcbiAgICAgICAgICBpbmRleDogZGksXG4gICAgICAgICAgc3RhcnRBbmdsZTogeDAsXG4gICAgICAgICAgZW5kQW5nbGU6IHgsXG4gICAgICAgICAgdmFsdWU6ICh4IC0geDApIC8ga1xuICAgICAgICB9O1xuICAgICAgICB4ICs9IHBhZGRpbmc7XG4gICAgICB9XG4gICAgICBpID0gLTE7XG4gICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICBqID0gaSAtIDE7XG4gICAgICAgIHdoaWxlICgrK2ogPCBuKSB7XG4gICAgICAgICAgdmFyIHNvdXJjZSA9IHN1Ymdyb3Vwc1tpICsgXCItXCIgKyBqXSwgdGFyZ2V0ID0gc3ViZ3JvdXBzW2ogKyBcIi1cIiArIGldO1xuICAgICAgICAgIGlmIChzb3VyY2UudmFsdWUgfHwgdGFyZ2V0LnZhbHVlKSB7XG4gICAgICAgICAgICBjaG9yZHMucHVzaChzb3VyY2UudmFsdWUgPCB0YXJnZXQudmFsdWUgPyB7XG4gICAgICAgICAgICAgIHNvdXJjZTogdGFyZ2V0LFxuICAgICAgICAgICAgICB0YXJnZXQ6IHNvdXJjZVxuICAgICAgICAgICAgfSA6IHtcbiAgICAgICAgICAgICAgc291cmNlOiBzb3VyY2UsXG4gICAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzb3J0Q2hvcmRzKSByZXNvcnQoKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVzb3J0KCkge1xuICAgICAgY2hvcmRzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gc29ydENob3JkcygoYS5zb3VyY2UudmFsdWUgKyBhLnRhcmdldC52YWx1ZSkgLyAyLCAoYi5zb3VyY2UudmFsdWUgKyBiLnRhcmdldC52YWx1ZSkgLyAyKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjaG9yZC5tYXRyaXggPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBtYXRyaXg7XG4gICAgICBuID0gKG1hdHJpeCA9IHgpICYmIG1hdHJpeC5sZW5ndGg7XG4gICAgICBjaG9yZHMgPSBncm91cHMgPSBudWxsO1xuICAgICAgcmV0dXJuIGNob3JkO1xuICAgIH07XG4gICAgY2hvcmQucGFkZGluZyA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHBhZGRpbmc7XG4gICAgICBwYWRkaW5nID0geDtcbiAgICAgIGNob3JkcyA9IGdyb3VwcyA9IG51bGw7XG4gICAgICByZXR1cm4gY2hvcmQ7XG4gICAgfTtcbiAgICBjaG9yZC5zb3J0R3JvdXBzID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gc29ydEdyb3VwcztcbiAgICAgIHNvcnRHcm91cHMgPSB4O1xuICAgICAgY2hvcmRzID0gZ3JvdXBzID0gbnVsbDtcbiAgICAgIHJldHVybiBjaG9yZDtcbiAgICB9O1xuICAgIGNob3JkLnNvcnRTdWJncm91cHMgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBzb3J0U3ViZ3JvdXBzO1xuICAgICAgc29ydFN1Ymdyb3VwcyA9IHg7XG4gICAgICBjaG9yZHMgPSBudWxsO1xuICAgICAgcmV0dXJuIGNob3JkO1xuICAgIH07XG4gICAgY2hvcmQuc29ydENob3JkcyA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHNvcnRDaG9yZHM7XG4gICAgICBzb3J0Q2hvcmRzID0geDtcbiAgICAgIGlmIChjaG9yZHMpIHJlc29ydCgpO1xuICAgICAgcmV0dXJuIGNob3JkO1xuICAgIH07XG4gICAgY2hvcmQuY2hvcmRzID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIWNob3JkcykgcmVsYXlvdXQoKTtcbiAgICAgIHJldHVybiBjaG9yZHM7XG4gICAgfTtcbiAgICBjaG9yZC5ncm91cHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghZ3JvdXBzKSByZWxheW91dCgpO1xuICAgICAgcmV0dXJuIGdyb3VwcztcbiAgICB9O1xuICAgIHJldHVybiBjaG9yZDtcbiAgfTtcbiAgZDMubGF5b3V0LmZvcmNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZvcmNlID0ge30sIGV2ZW50ID0gZDMuZGlzcGF0Y2goXCJzdGFydFwiLCBcInRpY2tcIiwgXCJlbmRcIiksIHNpemUgPSBbIDEsIDEgXSwgZHJhZywgYWxwaGEsIGZyaWN0aW9uID0gLjksIGxpbmtEaXN0YW5jZSA9IGQzX2xheW91dF9mb3JjZUxpbmtEaXN0YW5jZSwgbGlua1N0cmVuZ3RoID0gZDNfbGF5b3V0X2ZvcmNlTGlua1N0cmVuZ3RoLCBjaGFyZ2UgPSAtMzAsIGNoYXJnZURpc3RhbmNlMiA9IGQzX2xheW91dF9mb3JjZUNoYXJnZURpc3RhbmNlMiwgZ3Jhdml0eSA9IC4xLCB0aGV0YTIgPSAuNjQsIG5vZGVzID0gW10sIGxpbmtzID0gW10sIGRpc3RhbmNlcywgc3RyZW5ndGhzLCBjaGFyZ2VzO1xuICAgIGZ1bmN0aW9uIHJlcHVsc2Uobm9kZSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHF1YWQsIHgxLCBfLCB4Mikge1xuICAgICAgICBpZiAocXVhZC5wb2ludCAhPT0gbm9kZSkge1xuICAgICAgICAgIHZhciBkeCA9IHF1YWQuY3ggLSBub2RlLngsIGR5ID0gcXVhZC5jeSAtIG5vZGUueSwgZHcgPSB4MiAtIHgxLCBkbiA9IGR4ICogZHggKyBkeSAqIGR5O1xuICAgICAgICAgIGlmIChkdyAqIGR3IC8gdGhldGEyIDwgZG4pIHtcbiAgICAgICAgICAgIGlmIChkbiA8IGNoYXJnZURpc3RhbmNlMikge1xuICAgICAgICAgICAgICB2YXIgayA9IHF1YWQuY2hhcmdlIC8gZG47XG4gICAgICAgICAgICAgIG5vZGUucHggLT0gZHggKiBrO1xuICAgICAgICAgICAgICBub2RlLnB5IC09IGR5ICogaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocXVhZC5wb2ludCAmJiBkbiAmJiBkbiA8IGNoYXJnZURpc3RhbmNlMikge1xuICAgICAgICAgICAgdmFyIGsgPSBxdWFkLnBvaW50Q2hhcmdlIC8gZG47XG4gICAgICAgICAgICBub2RlLnB4IC09IGR4ICogaztcbiAgICAgICAgICAgIG5vZGUucHkgLT0gZHkgKiBrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gIXF1YWQuY2hhcmdlO1xuICAgICAgfTtcbiAgICB9XG4gICAgZm9yY2UudGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKChhbHBoYSAqPSAuOTkpIDwgLjAwNSkge1xuICAgICAgICBldmVudC5lbmQoe1xuICAgICAgICAgIHR5cGU6IFwiZW5kXCIsXG4gICAgICAgICAgYWxwaGE6IGFscGhhID0gMFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICB2YXIgbiA9IG5vZGVzLmxlbmd0aCwgbSA9IGxpbmtzLmxlbmd0aCwgcSwgaSwgbywgcywgdCwgbCwgaywgeCwgeTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBtOyArK2kpIHtcbiAgICAgICAgbyA9IGxpbmtzW2ldO1xuICAgICAgICBzID0gby5zb3VyY2U7XG4gICAgICAgIHQgPSBvLnRhcmdldDtcbiAgICAgICAgeCA9IHQueCAtIHMueDtcbiAgICAgICAgeSA9IHQueSAtIHMueTtcbiAgICAgICAgaWYgKGwgPSB4ICogeCArIHkgKiB5KSB7XG4gICAgICAgICAgbCA9IGFscGhhICogc3RyZW5ndGhzW2ldICogKChsID0gTWF0aC5zcXJ0KGwpKSAtIGRpc3RhbmNlc1tpXSkgLyBsO1xuICAgICAgICAgIHggKj0gbDtcbiAgICAgICAgICB5ICo9IGw7XG4gICAgICAgICAgdC54IC09IHggKiAoayA9IHMud2VpZ2h0IC8gKHQud2VpZ2h0ICsgcy53ZWlnaHQpKTtcbiAgICAgICAgICB0LnkgLT0geSAqIGs7XG4gICAgICAgICAgcy54ICs9IHggKiAoayA9IDEgLSBrKTtcbiAgICAgICAgICBzLnkgKz0geSAqIGs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChrID0gYWxwaGEgKiBncmF2aXR5KSB7XG4gICAgICAgIHggPSBzaXplWzBdIC8gMjtcbiAgICAgICAgeSA9IHNpemVbMV0gLyAyO1xuICAgICAgICBpID0gLTE7XG4gICAgICAgIGlmIChrKSB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICAgIG8gPSBub2Rlc1tpXTtcbiAgICAgICAgICBvLnggKz0gKHggLSBvLngpICogaztcbiAgICAgICAgICBvLnkgKz0gKHkgLSBvLnkpICogaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGNoYXJnZSkge1xuICAgICAgICBkM19sYXlvdXRfZm9yY2VBY2N1bXVsYXRlKHEgPSBkMy5nZW9tLnF1YWR0cmVlKG5vZGVzKSwgYWxwaGEsIGNoYXJnZXMpO1xuICAgICAgICBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgICAgaWYgKCEobyA9IG5vZGVzW2ldKS5maXhlZCkge1xuICAgICAgICAgICAgcS52aXNpdChyZXB1bHNlKG8pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGkgPSAtMTtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIG8gPSBub2Rlc1tpXTtcbiAgICAgICAgaWYgKG8uZml4ZWQpIHtcbiAgICAgICAgICBvLnggPSBvLnB4O1xuICAgICAgICAgIG8ueSA9IG8ucHk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgby54IC09IChvLnB4IC0gKG8ucHggPSBvLngpKSAqIGZyaWN0aW9uO1xuICAgICAgICAgIG8ueSAtPSAoby5weSAtIChvLnB5ID0gby55KSkgKiBmcmljdGlvbjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZXZlbnQudGljayh7XG4gICAgICAgIHR5cGU6IFwidGlja1wiLFxuICAgICAgICBhbHBoYTogYWxwaGFcbiAgICAgIH0pO1xuICAgIH07XG4gICAgZm9yY2Uubm9kZXMgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBub2RlcztcbiAgICAgIG5vZGVzID0geDtcbiAgICAgIHJldHVybiBmb3JjZTtcbiAgICB9O1xuICAgIGZvcmNlLmxpbmtzID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbGlua3M7XG4gICAgICBsaW5rcyA9IHg7XG4gICAgICByZXR1cm4gZm9yY2U7XG4gICAgfTtcbiAgICBmb3JjZS5zaXplID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gc2l6ZTtcbiAgICAgIHNpemUgPSB4O1xuICAgICAgcmV0dXJuIGZvcmNlO1xuICAgIH07XG4gICAgZm9yY2UubGlua0Rpc3RhbmNlID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbGlua0Rpc3RhbmNlO1xuICAgICAgbGlua0Rpc3RhbmNlID0gdHlwZW9mIHggPT09IFwiZnVuY3Rpb25cIiA/IHggOiAreDtcbiAgICAgIHJldHVybiBmb3JjZTtcbiAgICB9O1xuICAgIGZvcmNlLmRpc3RhbmNlID0gZm9yY2UubGlua0Rpc3RhbmNlO1xuICAgIGZvcmNlLmxpbmtTdHJlbmd0aCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGxpbmtTdHJlbmd0aDtcbiAgICAgIGxpbmtTdHJlbmd0aCA9IHR5cGVvZiB4ID09PSBcImZ1bmN0aW9uXCIgPyB4IDogK3g7XG4gICAgICByZXR1cm4gZm9yY2U7XG4gICAgfTtcbiAgICBmb3JjZS5mcmljdGlvbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGZyaWN0aW9uO1xuICAgICAgZnJpY3Rpb24gPSAreDtcbiAgICAgIHJldHVybiBmb3JjZTtcbiAgICB9O1xuICAgIGZvcmNlLmNoYXJnZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGNoYXJnZTtcbiAgICAgIGNoYXJnZSA9IHR5cGVvZiB4ID09PSBcImZ1bmN0aW9uXCIgPyB4IDogK3g7XG4gICAgICByZXR1cm4gZm9yY2U7XG4gICAgfTtcbiAgICBmb3JjZS5jaGFyZ2VEaXN0YW5jZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIE1hdGguc3FydChjaGFyZ2VEaXN0YW5jZTIpO1xuICAgICAgY2hhcmdlRGlzdGFuY2UyID0geCAqIHg7XG4gICAgICByZXR1cm4gZm9yY2U7XG4gICAgfTtcbiAgICBmb3JjZS5ncmF2aXR5ID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZ3Jhdml0eTtcbiAgICAgIGdyYXZpdHkgPSAreDtcbiAgICAgIHJldHVybiBmb3JjZTtcbiAgICB9O1xuICAgIGZvcmNlLnRoZXRhID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gTWF0aC5zcXJ0KHRoZXRhMik7XG4gICAgICB0aGV0YTIgPSB4ICogeDtcbiAgICAgIHJldHVybiBmb3JjZTtcbiAgICB9O1xuICAgIGZvcmNlLmFscGhhID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gYWxwaGE7XG4gICAgICB4ID0gK3g7XG4gICAgICBpZiAoYWxwaGEpIHtcbiAgICAgICAgaWYgKHggPiAwKSBhbHBoYSA9IHg7IGVsc2UgYWxwaGEgPSAwO1xuICAgICAgfSBlbHNlIGlmICh4ID4gMCkge1xuICAgICAgICBldmVudC5zdGFydCh7XG4gICAgICAgICAgdHlwZTogXCJzdGFydFwiLFxuICAgICAgICAgIGFscGhhOiBhbHBoYSA9IHhcbiAgICAgICAgfSk7XG4gICAgICAgIGQzLnRpbWVyKGZvcmNlLnRpY2spO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZvcmNlO1xuICAgIH07XG4gICAgZm9yY2Uuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpLCBuID0gbm9kZXMubGVuZ3RoLCBtID0gbGlua3MubGVuZ3RoLCB3ID0gc2l6ZVswXSwgaCA9IHNpemVbMV0sIG5laWdoYm9ycywgbztcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgICAgKG8gPSBub2Rlc1tpXSkuaW5kZXggPSBpO1xuICAgICAgICBvLndlaWdodCA9IDA7XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbTsgKytpKSB7XG4gICAgICAgIG8gPSBsaW5rc1tpXTtcbiAgICAgICAgaWYgKHR5cGVvZiBvLnNvdXJjZSA9PSBcIm51bWJlclwiKSBvLnNvdXJjZSA9IG5vZGVzW28uc291cmNlXTtcbiAgICAgICAgaWYgKHR5cGVvZiBvLnRhcmdldCA9PSBcIm51bWJlclwiKSBvLnRhcmdldCA9IG5vZGVzW28udGFyZ2V0XTtcbiAgICAgICAgKytvLnNvdXJjZS53ZWlnaHQ7XG4gICAgICAgICsrby50YXJnZXQud2VpZ2h0O1xuICAgICAgfVxuICAgICAgZm9yIChpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgICBvID0gbm9kZXNbaV07XG4gICAgICAgIGlmIChpc05hTihvLngpKSBvLnggPSBwb3NpdGlvbihcInhcIiwgdyk7XG4gICAgICAgIGlmIChpc05hTihvLnkpKSBvLnkgPSBwb3NpdGlvbihcInlcIiwgaCk7XG4gICAgICAgIGlmIChpc05hTihvLnB4KSkgby5weCA9IG8ueDtcbiAgICAgICAgaWYgKGlzTmFOKG8ucHkpKSBvLnB5ID0gby55O1xuICAgICAgfVxuICAgICAgZGlzdGFuY2VzID0gW107XG4gICAgICBpZiAodHlwZW9mIGxpbmtEaXN0YW5jZSA9PT0gXCJmdW5jdGlvblwiKSBmb3IgKGkgPSAwOyBpIDwgbTsgKytpKSBkaXN0YW5jZXNbaV0gPSArbGlua0Rpc3RhbmNlLmNhbGwodGhpcywgbGlua3NbaV0sIGkpOyBlbHNlIGZvciAoaSA9IDA7IGkgPCBtOyArK2kpIGRpc3RhbmNlc1tpXSA9IGxpbmtEaXN0YW5jZTtcbiAgICAgIHN0cmVuZ3RocyA9IFtdO1xuICAgICAgaWYgKHR5cGVvZiBsaW5rU3RyZW5ndGggPT09IFwiZnVuY3Rpb25cIikgZm9yIChpID0gMDsgaSA8IG07ICsraSkgc3RyZW5ndGhzW2ldID0gK2xpbmtTdHJlbmd0aC5jYWxsKHRoaXMsIGxpbmtzW2ldLCBpKTsgZWxzZSBmb3IgKGkgPSAwOyBpIDwgbTsgKytpKSBzdHJlbmd0aHNbaV0gPSBsaW5rU3RyZW5ndGg7XG4gICAgICBjaGFyZ2VzID0gW107XG4gICAgICBpZiAodHlwZW9mIGNoYXJnZSA9PT0gXCJmdW5jdGlvblwiKSBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSBjaGFyZ2VzW2ldID0gK2NoYXJnZS5jYWxsKHRoaXMsIG5vZGVzW2ldLCBpKTsgZWxzZSBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSBjaGFyZ2VzW2ldID0gY2hhcmdlO1xuICAgICAgZnVuY3Rpb24gcG9zaXRpb24oZGltZW5zaW9uLCBzaXplKSB7XG4gICAgICAgIGlmICghbmVpZ2hib3JzKSB7XG4gICAgICAgICAgbmVpZ2hib3JzID0gbmV3IEFycmF5KG4pO1xuICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBuOyArK2opIHtcbiAgICAgICAgICAgIG5laWdoYm9yc1tqXSA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgICAgICAgICB2YXIgbyA9IGxpbmtzW2pdO1xuICAgICAgICAgICAgbmVpZ2hib3JzW28uc291cmNlLmluZGV4XS5wdXNoKG8udGFyZ2V0KTtcbiAgICAgICAgICAgIG5laWdoYm9yc1tvLnRhcmdldC5pbmRleF0ucHVzaChvLnNvdXJjZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBjYW5kaWRhdGVzID0gbmVpZ2hib3JzW2ldLCBqID0gLTEsIG0gPSBjYW5kaWRhdGVzLmxlbmd0aCwgeDtcbiAgICAgICAgd2hpbGUgKCsraiA8IG0pIGlmICghaXNOYU4oeCA9IGNhbmRpZGF0ZXNbal1bZGltZW5zaW9uXSkpIHJldHVybiB4O1xuICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIHNpemU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZm9yY2UucmVzdW1lKCk7XG4gICAgfTtcbiAgICBmb3JjZS5yZXN1bWUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmb3JjZS5hbHBoYSguMSk7XG4gICAgfTtcbiAgICBmb3JjZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZm9yY2UuYWxwaGEoMCk7XG4gICAgfTtcbiAgICBmb3JjZS5kcmFnID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIWRyYWcpIGRyYWcgPSBkMy5iZWhhdmlvci5kcmFnKCkub3JpZ2luKGQzX2lkZW50aXR5KS5vbihcImRyYWdzdGFydC5mb3JjZVwiLCBkM19sYXlvdXRfZm9yY2VEcmFnc3RhcnQpLm9uKFwiZHJhZy5mb3JjZVwiLCBkcmFnbW92ZSkub24oXCJkcmFnZW5kLmZvcmNlXCIsIGQzX2xheW91dF9mb3JjZURyYWdlbmQpO1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZHJhZztcbiAgICAgIHRoaXMub24oXCJtb3VzZW92ZXIuZm9yY2VcIiwgZDNfbGF5b3V0X2ZvcmNlTW91c2VvdmVyKS5vbihcIm1vdXNlb3V0LmZvcmNlXCIsIGQzX2xheW91dF9mb3JjZU1vdXNlb3V0KS5jYWxsKGRyYWcpO1xuICAgIH07XG4gICAgZnVuY3Rpb24gZHJhZ21vdmUoZCkge1xuICAgICAgZC5weCA9IGQzLmV2ZW50LngsIGQucHkgPSBkMy5ldmVudC55O1xuICAgICAgZm9yY2UucmVzdW1lKCk7XG4gICAgfVxuICAgIHJldHVybiBkMy5yZWJpbmQoZm9yY2UsIGV2ZW50LCBcIm9uXCIpO1xuICB9O1xuICBmdW5jdGlvbiBkM19sYXlvdXRfZm9yY2VEcmFnc3RhcnQoZCkge1xuICAgIGQuZml4ZWQgfD0gMjtcbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfZm9yY2VEcmFnZW5kKGQpIHtcbiAgICBkLmZpeGVkICY9IH42O1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9mb3JjZU1vdXNlb3ZlcihkKSB7XG4gICAgZC5maXhlZCB8PSA0O1xuICAgIGQucHggPSBkLngsIGQucHkgPSBkLnk7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X2ZvcmNlTW91c2VvdXQoZCkge1xuICAgIGQuZml4ZWQgJj0gfjQ7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X2ZvcmNlQWNjdW11bGF0ZShxdWFkLCBhbHBoYSwgY2hhcmdlcykge1xuICAgIHZhciBjeCA9IDAsIGN5ID0gMDtcbiAgICBxdWFkLmNoYXJnZSA9IDA7XG4gICAgaWYgKCFxdWFkLmxlYWYpIHtcbiAgICAgIHZhciBub2RlcyA9IHF1YWQubm9kZXMsIG4gPSBub2Rlcy5sZW5ndGgsIGkgPSAtMSwgYztcbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIGMgPSBub2Rlc1tpXTtcbiAgICAgICAgaWYgKGMgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIGQzX2xheW91dF9mb3JjZUFjY3VtdWxhdGUoYywgYWxwaGEsIGNoYXJnZXMpO1xuICAgICAgICBxdWFkLmNoYXJnZSArPSBjLmNoYXJnZTtcbiAgICAgICAgY3ggKz0gYy5jaGFyZ2UgKiBjLmN4O1xuICAgICAgICBjeSArPSBjLmNoYXJnZSAqIGMuY3k7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChxdWFkLnBvaW50KSB7XG4gICAgICBpZiAoIXF1YWQubGVhZikge1xuICAgICAgICBxdWFkLnBvaW50LnggKz0gTWF0aC5yYW5kb20oKSAtIC41O1xuICAgICAgICBxdWFkLnBvaW50LnkgKz0gTWF0aC5yYW5kb20oKSAtIC41O1xuICAgICAgfVxuICAgICAgdmFyIGsgPSBhbHBoYSAqIGNoYXJnZXNbcXVhZC5wb2ludC5pbmRleF07XG4gICAgICBxdWFkLmNoYXJnZSArPSBxdWFkLnBvaW50Q2hhcmdlID0gaztcbiAgICAgIGN4ICs9IGsgKiBxdWFkLnBvaW50Lng7XG4gICAgICBjeSArPSBrICogcXVhZC5wb2ludC55O1xuICAgIH1cbiAgICBxdWFkLmN4ID0gY3ggLyBxdWFkLmNoYXJnZTtcbiAgICBxdWFkLmN5ID0gY3kgLyBxdWFkLmNoYXJnZTtcbiAgfVxuICB2YXIgZDNfbGF5b3V0X2ZvcmNlTGlua0Rpc3RhbmNlID0gMjAsIGQzX2xheW91dF9mb3JjZUxpbmtTdHJlbmd0aCA9IDEsIGQzX2xheW91dF9mb3JjZUNoYXJnZURpc3RhbmNlMiA9IEluZmluaXR5O1xuICBkMy5sYXlvdXQuaGllcmFyY2h5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNvcnQgPSBkM19sYXlvdXRfaGllcmFyY2h5U29ydCwgY2hpbGRyZW4gPSBkM19sYXlvdXRfaGllcmFyY2h5Q2hpbGRyZW4sIHZhbHVlID0gZDNfbGF5b3V0X2hpZXJhcmNoeVZhbHVlO1xuICAgIGZ1bmN0aW9uIHJlY3Vyc2Uobm9kZSwgZGVwdGgsIG5vZGVzKSB7XG4gICAgICB2YXIgY2hpbGRzID0gY2hpbGRyZW4uY2FsbChoaWVyYXJjaHksIG5vZGUsIGRlcHRoKTtcbiAgICAgIG5vZGUuZGVwdGggPSBkZXB0aDtcbiAgICAgIG5vZGVzLnB1c2gobm9kZSk7XG4gICAgICBpZiAoY2hpbGRzICYmIChuID0gY2hpbGRzLmxlbmd0aCkpIHtcbiAgICAgICAgdmFyIGkgPSAtMSwgbiwgYyA9IG5vZGUuY2hpbGRyZW4gPSBuZXcgQXJyYXkobiksIHYgPSAwLCBqID0gZGVwdGggKyAxLCBkO1xuICAgICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICAgIGQgPSBjW2ldID0gcmVjdXJzZShjaGlsZHNbaV0sIGosIG5vZGVzKTtcbiAgICAgICAgICBkLnBhcmVudCA9IG5vZGU7XG4gICAgICAgICAgdiArPSBkLnZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzb3J0KSBjLnNvcnQoc29ydCk7XG4gICAgICAgIGlmICh2YWx1ZSkgbm9kZS52YWx1ZSA9IHY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgbm9kZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgbm9kZS52YWx1ZSA9ICt2YWx1ZS5jYWxsKGhpZXJhcmNoeSwgbm9kZSwgZGVwdGgpIHx8IDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZXZhbHVlKG5vZGUsIGRlcHRoKSB7XG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLCB2ID0gMDtcbiAgICAgIGlmIChjaGlsZHJlbiAmJiAobiA9IGNoaWxkcmVuLmxlbmd0aCkpIHtcbiAgICAgICAgdmFyIGkgPSAtMSwgbiwgaiA9IGRlcHRoICsgMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IG4pIHYgKz0gcmV2YWx1ZShjaGlsZHJlbltpXSwgaik7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlKSB7XG4gICAgICAgIHYgPSArdmFsdWUuY2FsbChoaWVyYXJjaHksIG5vZGUsIGRlcHRoKSB8fCAwO1xuICAgICAgfVxuICAgICAgaWYgKHZhbHVlKSBub2RlLnZhbHVlID0gdjtcbiAgICAgIHJldHVybiB2O1xuICAgIH1cbiAgICBmdW5jdGlvbiBoaWVyYXJjaHkoZCkge1xuICAgICAgdmFyIG5vZGVzID0gW107XG4gICAgICByZWN1cnNlKGQsIDAsIG5vZGVzKTtcbiAgICAgIHJldHVybiBub2RlcztcbiAgICB9XG4gICAgaGllcmFyY2h5LnNvcnQgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBzb3J0O1xuICAgICAgc29ydCA9IHg7XG4gICAgICByZXR1cm4gaGllcmFyY2h5O1xuICAgIH07XG4gICAgaGllcmFyY2h5LmNoaWxkcmVuID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gY2hpbGRyZW47XG4gICAgICBjaGlsZHJlbiA9IHg7XG4gICAgICByZXR1cm4gaGllcmFyY2h5O1xuICAgIH07XG4gICAgaGllcmFyY2h5LnZhbHVlID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdmFsdWU7XG4gICAgICB2YWx1ZSA9IHg7XG4gICAgICByZXR1cm4gaGllcmFyY2h5O1xuICAgIH07XG4gICAgaGllcmFyY2h5LnJldmFsdWUgPSBmdW5jdGlvbihyb290KSB7XG4gICAgICByZXZhbHVlKHJvb3QsIDApO1xuICAgICAgcmV0dXJuIHJvb3Q7XG4gICAgfTtcbiAgICByZXR1cm4gaGllcmFyY2h5O1xuICB9O1xuICBmdW5jdGlvbiBkM19sYXlvdXRfaGllcmFyY2h5UmViaW5kKG9iamVjdCwgaGllcmFyY2h5KSB7XG4gICAgZDMucmViaW5kKG9iamVjdCwgaGllcmFyY2h5LCBcInNvcnRcIiwgXCJjaGlsZHJlblwiLCBcInZhbHVlXCIpO1xuICAgIG9iamVjdC5ub2RlcyA9IG9iamVjdDtcbiAgICBvYmplY3QubGlua3MgPSBkM19sYXlvdXRfaGllcmFyY2h5TGlua3M7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfaGllcmFyY2h5Q2hpbGRyZW4oZCkge1xuICAgIHJldHVybiBkLmNoaWxkcmVuO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9oaWVyYXJjaHlWYWx1ZShkKSB7XG4gICAgcmV0dXJuIGQudmFsdWU7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X2hpZXJhcmNoeVNvcnQoYSwgYikge1xuICAgIHJldHVybiBiLnZhbHVlIC0gYS52YWx1ZTtcbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfaGllcmFyY2h5TGlua3Mobm9kZXMpIHtcbiAgICByZXR1cm4gZDMubWVyZ2Uobm9kZXMubWFwKGZ1bmN0aW9uKHBhcmVudCkge1xuICAgICAgcmV0dXJuIChwYXJlbnQuY2hpbGRyZW4gfHwgW10pLm1hcChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNvdXJjZTogcGFyZW50LFxuICAgICAgICAgIHRhcmdldDogY2hpbGRcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgIH0pKTtcbiAgfVxuICBkMy5sYXlvdXQucGFydGl0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGhpZXJhcmNoeSA9IGQzLmxheW91dC5oaWVyYXJjaHkoKSwgc2l6ZSA9IFsgMSwgMSBdO1xuICAgIGZ1bmN0aW9uIHBvc2l0aW9uKG5vZGUsIHgsIGR4LCBkeSkge1xuICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbjtcbiAgICAgIG5vZGUueCA9IHg7XG4gICAgICBub2RlLnkgPSBub2RlLmRlcHRoICogZHk7XG4gICAgICBub2RlLmR4ID0gZHg7XG4gICAgICBub2RlLmR5ID0gZHk7XG4gICAgICBpZiAoY2hpbGRyZW4gJiYgKG4gPSBjaGlsZHJlbi5sZW5ndGgpKSB7XG4gICAgICAgIHZhciBpID0gLTEsIG4sIGMsIGQ7XG4gICAgICAgIGR4ID0gbm9kZS52YWx1ZSA/IGR4IC8gbm9kZS52YWx1ZSA6IDA7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgICAgcG9zaXRpb24oYyA9IGNoaWxkcmVuW2ldLCB4LCBkID0gYy52YWx1ZSAqIGR4LCBkeSk7XG4gICAgICAgICAgeCArPSBkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRlcHRoKG5vZGUpIHtcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4sIGQgPSAwO1xuICAgICAgaWYgKGNoaWxkcmVuICYmIChuID0gY2hpbGRyZW4ubGVuZ3RoKSkge1xuICAgICAgICB2YXIgaSA9IC0xLCBuO1xuICAgICAgICB3aGlsZSAoKytpIDwgbikgZCA9IE1hdGgubWF4KGQsIGRlcHRoKGNoaWxkcmVuW2ldKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gMSArIGQ7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBhcnRpdGlvbihkLCBpKSB7XG4gICAgICB2YXIgbm9kZXMgPSBoaWVyYXJjaHkuY2FsbCh0aGlzLCBkLCBpKTtcbiAgICAgIHBvc2l0aW9uKG5vZGVzWzBdLCAwLCBzaXplWzBdLCBzaXplWzFdIC8gZGVwdGgobm9kZXNbMF0pKTtcbiAgICAgIHJldHVybiBub2RlcztcbiAgICB9XG4gICAgcGFydGl0aW9uLnNpemUgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBzaXplO1xuICAgICAgc2l6ZSA9IHg7XG4gICAgICByZXR1cm4gcGFydGl0aW9uO1xuICAgIH07XG4gICAgcmV0dXJuIGQzX2xheW91dF9oaWVyYXJjaHlSZWJpbmQocGFydGl0aW9uLCBoaWVyYXJjaHkpO1xuICB9O1xuICBkMy5sYXlvdXQucGllID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlID0gTnVtYmVyLCBzb3J0ID0gZDNfbGF5b3V0X3BpZVNvcnRCeVZhbHVlLCBzdGFydEFuZ2xlID0gMCwgZW5kQW5nbGUgPSDPhDtcbiAgICBmdW5jdGlvbiBwaWUoZGF0YSkge1xuICAgICAgdmFyIHZhbHVlcyA9IGRhdGEubWFwKGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgcmV0dXJuICt2YWx1ZS5jYWxsKHBpZSwgZCwgaSk7XG4gICAgICB9KTtcbiAgICAgIHZhciBhID0gKyh0eXBlb2Ygc3RhcnRBbmdsZSA9PT0gXCJmdW5jdGlvblwiID8gc3RhcnRBbmdsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDogc3RhcnRBbmdsZSk7XG4gICAgICB2YXIgayA9ICgodHlwZW9mIGVuZEFuZ2xlID09PSBcImZ1bmN0aW9uXCIgPyBlbmRBbmdsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDogZW5kQW5nbGUpIC0gYSkgLyBkMy5zdW0odmFsdWVzKTtcbiAgICAgIHZhciBpbmRleCA9IGQzLnJhbmdlKGRhdGEubGVuZ3RoKTtcbiAgICAgIGlmIChzb3J0ICE9IG51bGwpIGluZGV4LnNvcnQoc29ydCA9PT0gZDNfbGF5b3V0X3BpZVNvcnRCeVZhbHVlID8gZnVuY3Rpb24oaSwgaikge1xuICAgICAgICByZXR1cm4gdmFsdWVzW2pdIC0gdmFsdWVzW2ldO1xuICAgICAgfSA6IGZ1bmN0aW9uKGksIGopIHtcbiAgICAgICAgcmV0dXJuIHNvcnQoZGF0YVtpXSwgZGF0YVtqXSk7XG4gICAgICB9KTtcbiAgICAgIHZhciBhcmNzID0gW107XG4gICAgICBpbmRleC5mb3JFYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgdmFyIGQ7XG4gICAgICAgIGFyY3NbaV0gPSB7XG4gICAgICAgICAgZGF0YTogZGF0YVtpXSxcbiAgICAgICAgICB2YWx1ZTogZCA9IHZhbHVlc1tpXSxcbiAgICAgICAgICBzdGFydEFuZ2xlOiBhLFxuICAgICAgICAgIGVuZEFuZ2xlOiBhICs9IGQgKiBrXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBhcmNzO1xuICAgIH1cbiAgICBwaWUudmFsdWUgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB2YWx1ZTtcbiAgICAgIHZhbHVlID0geDtcbiAgICAgIHJldHVybiBwaWU7XG4gICAgfTtcbiAgICBwaWUuc29ydCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHNvcnQ7XG4gICAgICBzb3J0ID0geDtcbiAgICAgIHJldHVybiBwaWU7XG4gICAgfTtcbiAgICBwaWUuc3RhcnRBbmdsZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHN0YXJ0QW5nbGU7XG4gICAgICBzdGFydEFuZ2xlID0geDtcbiAgICAgIHJldHVybiBwaWU7XG4gICAgfTtcbiAgICBwaWUuZW5kQW5nbGUgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBlbmRBbmdsZTtcbiAgICAgIGVuZEFuZ2xlID0geDtcbiAgICAgIHJldHVybiBwaWU7XG4gICAgfTtcbiAgICByZXR1cm4gcGllO1xuICB9O1xuICB2YXIgZDNfbGF5b3V0X3BpZVNvcnRCeVZhbHVlID0ge307XG4gIGQzLmxheW91dC5zdGFjayA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZXMgPSBkM19pZGVudGl0eSwgb3JkZXIgPSBkM19sYXlvdXRfc3RhY2tPcmRlckRlZmF1bHQsIG9mZnNldCA9IGQzX2xheW91dF9zdGFja09mZnNldFplcm8sIG91dCA9IGQzX2xheW91dF9zdGFja091dCwgeCA9IGQzX2xheW91dF9zdGFja1gsIHkgPSBkM19sYXlvdXRfc3RhY2tZO1xuICAgIGZ1bmN0aW9uIHN0YWNrKGRhdGEsIGluZGV4KSB7XG4gICAgICB2YXIgc2VyaWVzID0gZGF0YS5tYXAoZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICByZXR1cm4gdmFsdWVzLmNhbGwoc3RhY2ssIGQsIGkpO1xuICAgICAgfSk7XG4gICAgICB2YXIgcG9pbnRzID0gc2VyaWVzLm1hcChmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBkLm1hcChmdW5jdGlvbih2LCBpKSB7XG4gICAgICAgICAgcmV0dXJuIFsgeC5jYWxsKHN0YWNrLCB2LCBpKSwgeS5jYWxsKHN0YWNrLCB2LCBpKSBdO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgdmFyIG9yZGVycyA9IG9yZGVyLmNhbGwoc3RhY2ssIHBvaW50cywgaW5kZXgpO1xuICAgICAgc2VyaWVzID0gZDMucGVybXV0ZShzZXJpZXMsIG9yZGVycyk7XG4gICAgICBwb2ludHMgPSBkMy5wZXJtdXRlKHBvaW50cywgb3JkZXJzKTtcbiAgICAgIHZhciBvZmZzZXRzID0gb2Zmc2V0LmNhbGwoc3RhY2ssIHBvaW50cywgaW5kZXgpO1xuICAgICAgdmFyIG4gPSBzZXJpZXMubGVuZ3RoLCBtID0gc2VyaWVzWzBdLmxlbmd0aCwgaSwgaiwgbztcbiAgICAgIGZvciAoaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICAgICAgb3V0LmNhbGwoc3RhY2ssIHNlcmllc1swXVtqXSwgbyA9IG9mZnNldHNbal0sIHBvaW50c1swXVtqXVsxXSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBuOyArK2kpIHtcbiAgICAgICAgICBvdXQuY2FsbChzdGFjaywgc2VyaWVzW2ldW2pdLCBvICs9IHBvaW50c1tpIC0gMV1bal1bMV0sIHBvaW50c1tpXVtqXVsxXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbiAgICBzdGFjay52YWx1ZXMgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB2YWx1ZXM7XG4gICAgICB2YWx1ZXMgPSB4O1xuICAgICAgcmV0dXJuIHN0YWNrO1xuICAgIH07XG4gICAgc3RhY2sub3JkZXIgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBvcmRlcjtcbiAgICAgIG9yZGVyID0gdHlwZW9mIHggPT09IFwiZnVuY3Rpb25cIiA/IHggOiBkM19sYXlvdXRfc3RhY2tPcmRlcnMuZ2V0KHgpIHx8IGQzX2xheW91dF9zdGFja09yZGVyRGVmYXVsdDtcbiAgICAgIHJldHVybiBzdGFjaztcbiAgICB9O1xuICAgIHN0YWNrLm9mZnNldCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG9mZnNldDtcbiAgICAgIG9mZnNldCA9IHR5cGVvZiB4ID09PSBcImZ1bmN0aW9uXCIgPyB4IDogZDNfbGF5b3V0X3N0YWNrT2Zmc2V0cy5nZXQoeCkgfHwgZDNfbGF5b3V0X3N0YWNrT2Zmc2V0WmVybztcbiAgICAgIHJldHVybiBzdGFjaztcbiAgICB9O1xuICAgIHN0YWNrLnggPSBmdW5jdGlvbih6KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB4O1xuICAgICAgeCA9IHo7XG4gICAgICByZXR1cm4gc3RhY2s7XG4gICAgfTtcbiAgICBzdGFjay55ID0gZnVuY3Rpb24oeikge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geTtcbiAgICAgIHkgPSB6O1xuICAgICAgcmV0dXJuIHN0YWNrO1xuICAgIH07XG4gICAgc3RhY2sub3V0ID0gZnVuY3Rpb24oeikge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gb3V0O1xuICAgICAgb3V0ID0gejtcbiAgICAgIHJldHVybiBzdGFjaztcbiAgICB9O1xuICAgIHJldHVybiBzdGFjaztcbiAgfTtcbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3N0YWNrWChkKSB7XG4gICAgcmV0dXJuIGQueDtcbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfc3RhY2tZKGQpIHtcbiAgICByZXR1cm4gZC55O1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9zdGFja091dChkLCB5MCwgeSkge1xuICAgIGQueTAgPSB5MDtcbiAgICBkLnkgPSB5O1xuICB9XG4gIHZhciBkM19sYXlvdXRfc3RhY2tPcmRlcnMgPSBkMy5tYXAoe1xuICAgIFwiaW5zaWRlLW91dFwiOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICB2YXIgbiA9IGRhdGEubGVuZ3RoLCBpLCBqLCBtYXggPSBkYXRhLm1hcChkM19sYXlvdXRfc3RhY2tNYXhJbmRleCksIHN1bXMgPSBkYXRhLm1hcChkM19sYXlvdXRfc3RhY2tSZWR1Y2VTdW0pLCBpbmRleCA9IGQzLnJhbmdlKG4pLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gbWF4W2FdIC0gbWF4W2JdO1xuICAgICAgfSksIHRvcCA9IDAsIGJvdHRvbSA9IDAsIHRvcHMgPSBbXSwgYm90dG9tcyA9IFtdO1xuICAgICAgZm9yIChpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgICBqID0gaW5kZXhbaV07XG4gICAgICAgIGlmICh0b3AgPCBib3R0b20pIHtcbiAgICAgICAgICB0b3AgKz0gc3Vtc1tqXTtcbiAgICAgICAgICB0b3BzLnB1c2goaik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYm90dG9tICs9IHN1bXNbal07XG4gICAgICAgICAgYm90dG9tcy5wdXNoKGopO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gYm90dG9tcy5yZXZlcnNlKCkuY29uY2F0KHRvcHMpO1xuICAgIH0sXG4gICAgcmV2ZXJzZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIGQzLnJhbmdlKGRhdGEubGVuZ3RoKS5yZXZlcnNlKCk7XG4gICAgfSxcbiAgICBcImRlZmF1bHRcIjogZDNfbGF5b3V0X3N0YWNrT3JkZXJEZWZhdWx0XG4gIH0pO1xuICB2YXIgZDNfbGF5b3V0X3N0YWNrT2Zmc2V0cyA9IGQzLm1hcCh7XG4gICAgc2lsaG91ZXR0ZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIG4gPSBkYXRhLmxlbmd0aCwgbSA9IGRhdGFbMF0ubGVuZ3RoLCBzdW1zID0gW10sIG1heCA9IDAsIGksIGosIG8sIHkwID0gW107XG4gICAgICBmb3IgKGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgICAgIGZvciAoaSA9IDAsIG8gPSAwOyBpIDwgbjsgaSsrKSBvICs9IGRhdGFbaV1bal1bMV07XG4gICAgICAgIGlmIChvID4gbWF4KSBtYXggPSBvO1xuICAgICAgICBzdW1zLnB1c2gobyk7XG4gICAgICB9XG4gICAgICBmb3IgKGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgICAgIHkwW2pdID0gKG1heCAtIHN1bXNbal0pIC8gMjtcbiAgICAgIH1cbiAgICAgIHJldHVybiB5MDtcbiAgICB9LFxuICAgIHdpZ2dsZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIG4gPSBkYXRhLmxlbmd0aCwgeCA9IGRhdGFbMF0sIG0gPSB4Lmxlbmd0aCwgaSwgaiwgaywgczEsIHMyLCBzMywgZHgsIG8sIG8wLCB5MCA9IFtdO1xuICAgICAgeTBbMF0gPSBvID0gbzAgPSAwO1xuICAgICAgZm9yIChqID0gMTsgaiA8IG07ICsraikge1xuICAgICAgICBmb3IgKGkgPSAwLCBzMSA9IDA7IGkgPCBuOyArK2kpIHMxICs9IGRhdGFbaV1bal1bMV07XG4gICAgICAgIGZvciAoaSA9IDAsIHMyID0gMCwgZHggPSB4W2pdWzBdIC0geFtqIC0gMV1bMF07IGkgPCBuOyArK2kpIHtcbiAgICAgICAgICBmb3IgKGsgPSAwLCBzMyA9IChkYXRhW2ldW2pdWzFdIC0gZGF0YVtpXVtqIC0gMV1bMV0pIC8gKDIgKiBkeCk7IGsgPCBpOyArK2spIHtcbiAgICAgICAgICAgIHMzICs9IChkYXRhW2tdW2pdWzFdIC0gZGF0YVtrXVtqIC0gMV1bMV0pIC8gZHg7XG4gICAgICAgICAgfVxuICAgICAgICAgIHMyICs9IHMzICogZGF0YVtpXVtqXVsxXTtcbiAgICAgICAgfVxuICAgICAgICB5MFtqXSA9IG8gLT0gczEgPyBzMiAvIHMxICogZHggOiAwO1xuICAgICAgICBpZiAobyA8IG8wKSBvMCA9IG87XG4gICAgICB9XG4gICAgICBmb3IgKGogPSAwOyBqIDwgbTsgKytqKSB5MFtqXSAtPSBvMDtcbiAgICAgIHJldHVybiB5MDtcbiAgICB9LFxuICAgIGV4cGFuZDogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIG4gPSBkYXRhLmxlbmd0aCwgbSA9IGRhdGFbMF0ubGVuZ3RoLCBrID0gMSAvIG4sIGksIGosIG8sIHkwID0gW107XG4gICAgICBmb3IgKGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgICAgIGZvciAoaSA9IDAsIG8gPSAwOyBpIDwgbjsgaSsrKSBvICs9IGRhdGFbaV1bal1bMV07XG4gICAgICAgIGlmIChvKSBmb3IgKGkgPSAwOyBpIDwgbjsgaSsrKSBkYXRhW2ldW2pdWzFdIC89IG87IGVsc2UgZm9yIChpID0gMDsgaSA8IG47IGkrKykgZGF0YVtpXVtqXVsxXSA9IGs7XG4gICAgICB9XG4gICAgICBmb3IgKGogPSAwOyBqIDwgbTsgKytqKSB5MFtqXSA9IDA7XG4gICAgICByZXR1cm4geTA7XG4gICAgfSxcbiAgICB6ZXJvOiBkM19sYXlvdXRfc3RhY2tPZmZzZXRaZXJvXG4gIH0pO1xuICBmdW5jdGlvbiBkM19sYXlvdXRfc3RhY2tPcmRlckRlZmF1bHQoZGF0YSkge1xuICAgIHJldHVybiBkMy5yYW5nZShkYXRhLmxlbmd0aCk7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3N0YWNrT2Zmc2V0WmVybyhkYXRhKSB7XG4gICAgdmFyIGogPSAtMSwgbSA9IGRhdGFbMF0ubGVuZ3RoLCB5MCA9IFtdO1xuICAgIHdoaWxlICgrK2ogPCBtKSB5MFtqXSA9IDA7XG4gICAgcmV0dXJuIHkwO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9zdGFja01heEluZGV4KGFycmF5KSB7XG4gICAgdmFyIGkgPSAxLCBqID0gMCwgdiA9IGFycmF5WzBdWzFdLCBrLCBuID0gYXJyYXkubGVuZ3RoO1xuICAgIGZvciAoO2kgPCBuOyArK2kpIHtcbiAgICAgIGlmICgoayA9IGFycmF5W2ldWzFdKSA+IHYpIHtcbiAgICAgICAgaiA9IGk7XG4gICAgICAgIHYgPSBrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gajtcbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfc3RhY2tSZWR1Y2VTdW0oZCkge1xuICAgIHJldHVybiBkLnJlZHVjZShkM19sYXlvdXRfc3RhY2tTdW0sIDApO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9zdGFja1N1bShwLCBkKSB7XG4gICAgcmV0dXJuIHAgKyBkWzFdO1xuICB9XG4gIGQzLmxheW91dC5oaXN0b2dyYW0gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnJlcXVlbmN5ID0gdHJ1ZSwgdmFsdWVyID0gTnVtYmVyLCByYW5nZXIgPSBkM19sYXlvdXRfaGlzdG9ncmFtUmFuZ2UsIGJpbm5lciA9IGQzX2xheW91dF9oaXN0b2dyYW1CaW5TdHVyZ2VzO1xuICAgIGZ1bmN0aW9uIGhpc3RvZ3JhbShkYXRhLCBpKSB7XG4gICAgICB2YXIgYmlucyA9IFtdLCB2YWx1ZXMgPSBkYXRhLm1hcCh2YWx1ZXIsIHRoaXMpLCByYW5nZSA9IHJhbmdlci5jYWxsKHRoaXMsIHZhbHVlcywgaSksIHRocmVzaG9sZHMgPSBiaW5uZXIuY2FsbCh0aGlzLCByYW5nZSwgdmFsdWVzLCBpKSwgYmluLCBpID0gLTEsIG4gPSB2YWx1ZXMubGVuZ3RoLCBtID0gdGhyZXNob2xkcy5sZW5ndGggLSAxLCBrID0gZnJlcXVlbmN5ID8gMSA6IDEgLyBuLCB4O1xuICAgICAgd2hpbGUgKCsraSA8IG0pIHtcbiAgICAgICAgYmluID0gYmluc1tpXSA9IFtdO1xuICAgICAgICBiaW4uZHggPSB0aHJlc2hvbGRzW2kgKyAxXSAtIChiaW4ueCA9IHRocmVzaG9sZHNbaV0pO1xuICAgICAgICBiaW4ueSA9IDA7XG4gICAgICB9XG4gICAgICBpZiAobSA+IDApIHtcbiAgICAgICAgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICAgIHggPSB2YWx1ZXNbaV07XG4gICAgICAgICAgaWYgKHggPj0gcmFuZ2VbMF0gJiYgeCA8PSByYW5nZVsxXSkge1xuICAgICAgICAgICAgYmluID0gYmluc1tkMy5iaXNlY3QodGhyZXNob2xkcywgeCwgMSwgbSkgLSAxXTtcbiAgICAgICAgICAgIGJpbi55ICs9IGs7XG4gICAgICAgICAgICBiaW4ucHVzaChkYXRhW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBiaW5zO1xuICAgIH1cbiAgICBoaXN0b2dyYW0udmFsdWUgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB2YWx1ZXI7XG4gICAgICB2YWx1ZXIgPSB4O1xuICAgICAgcmV0dXJuIGhpc3RvZ3JhbTtcbiAgICB9O1xuICAgIGhpc3RvZ3JhbS5yYW5nZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHJhbmdlcjtcbiAgICAgIHJhbmdlciA9IGQzX2Z1bmN0b3IoeCk7XG4gICAgICByZXR1cm4gaGlzdG9ncmFtO1xuICAgIH07XG4gICAgaGlzdG9ncmFtLmJpbnMgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBiaW5uZXI7XG4gICAgICBiaW5uZXIgPSB0eXBlb2YgeCA9PT0gXCJudW1iZXJcIiA/IGZ1bmN0aW9uKHJhbmdlKSB7XG4gICAgICAgIHJldHVybiBkM19sYXlvdXRfaGlzdG9ncmFtQmluRml4ZWQocmFuZ2UsIHgpO1xuICAgICAgfSA6IGQzX2Z1bmN0b3IoeCk7XG4gICAgICByZXR1cm4gaGlzdG9ncmFtO1xuICAgIH07XG4gICAgaGlzdG9ncmFtLmZyZXF1ZW5jeSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGZyZXF1ZW5jeTtcbiAgICAgIGZyZXF1ZW5jeSA9ICEheDtcbiAgICAgIHJldHVybiBoaXN0b2dyYW07XG4gICAgfTtcbiAgICByZXR1cm4gaGlzdG9ncmFtO1xuICB9O1xuICBmdW5jdGlvbiBkM19sYXlvdXRfaGlzdG9ncmFtQmluU3R1cmdlcyhyYW5nZSwgdmFsdWVzKSB7XG4gICAgcmV0dXJuIGQzX2xheW91dF9oaXN0b2dyYW1CaW5GaXhlZChyYW5nZSwgTWF0aC5jZWlsKE1hdGgubG9nKHZhbHVlcy5sZW5ndGgpIC8gTWF0aC5MTjIgKyAxKSk7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X2hpc3RvZ3JhbUJpbkZpeGVkKHJhbmdlLCBuKSB7XG4gICAgdmFyIHggPSAtMSwgYiA9ICtyYW5nZVswXSwgbSA9IChyYW5nZVsxXSAtIGIpIC8gbiwgZiA9IFtdO1xuICAgIHdoaWxlICgrK3ggPD0gbikgZlt4XSA9IG0gKiB4ICsgYjtcbiAgICByZXR1cm4gZjtcbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfaGlzdG9ncmFtUmFuZ2UodmFsdWVzKSB7XG4gICAgcmV0dXJuIFsgZDMubWluKHZhbHVlcyksIGQzLm1heCh2YWx1ZXMpIF07XG4gIH1cbiAgZDMubGF5b3V0LnRyZWUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaGllcmFyY2h5ID0gZDMubGF5b3V0LmhpZXJhcmNoeSgpLnNvcnQobnVsbCkudmFsdWUobnVsbCksIHNlcGFyYXRpb24gPSBkM19sYXlvdXRfdHJlZVNlcGFyYXRpb24sIHNpemUgPSBbIDEsIDEgXSwgbm9kZVNpemUgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiB0cmVlKGQsIGkpIHtcbiAgICAgIHZhciBub2RlcyA9IGhpZXJhcmNoeS5jYWxsKHRoaXMsIGQsIGkpLCByb290ID0gbm9kZXNbMF07XG4gICAgICBmdW5jdGlvbiBmaXJzdFdhbGsobm9kZSwgcHJldmlvdXNTaWJsaW5nKSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4sIGxheW91dCA9IG5vZGUuX3RyZWU7XG4gICAgICAgIGlmIChjaGlsZHJlbiAmJiAobiA9IGNoaWxkcmVuLmxlbmd0aCkpIHtcbiAgICAgICAgICB2YXIgbiwgZmlyc3RDaGlsZCA9IGNoaWxkcmVuWzBdLCBwcmV2aW91c0NoaWxkLCBhbmNlc3RvciA9IGZpcnN0Q2hpbGQsIGNoaWxkLCBpID0gLTE7XG4gICAgICAgICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgICAgIGNoaWxkID0gY2hpbGRyZW5baV07XG4gICAgICAgICAgICBmaXJzdFdhbGsoY2hpbGQsIHByZXZpb3VzQ2hpbGQpO1xuICAgICAgICAgICAgYW5jZXN0b3IgPSBhcHBvcnRpb24oY2hpbGQsIHByZXZpb3VzQ2hpbGQsIGFuY2VzdG9yKTtcbiAgICAgICAgICAgIHByZXZpb3VzQ2hpbGQgPSBjaGlsZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZDNfbGF5b3V0X3RyZWVTaGlmdChub2RlKTtcbiAgICAgICAgICB2YXIgbWlkcG9pbnQgPSAuNSAqIChmaXJzdENoaWxkLl90cmVlLnByZWxpbSArIGNoaWxkLl90cmVlLnByZWxpbSk7XG4gICAgICAgICAgaWYgKHByZXZpb3VzU2libGluZykge1xuICAgICAgICAgICAgbGF5b3V0LnByZWxpbSA9IHByZXZpb3VzU2libGluZy5fdHJlZS5wcmVsaW0gKyBzZXBhcmF0aW9uKG5vZGUsIHByZXZpb3VzU2libGluZyk7XG4gICAgICAgICAgICBsYXlvdXQubW9kID0gbGF5b3V0LnByZWxpbSAtIG1pZHBvaW50O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsYXlvdXQucHJlbGltID0gbWlkcG9pbnQ7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChwcmV2aW91c1NpYmxpbmcpIHtcbiAgICAgICAgICAgIGxheW91dC5wcmVsaW0gPSBwcmV2aW91c1NpYmxpbmcuX3RyZWUucHJlbGltICsgc2VwYXJhdGlvbihub2RlLCBwcmV2aW91c1NpYmxpbmcpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZnVuY3Rpb24gc2Vjb25kV2Fsayhub2RlLCB4KSB7XG4gICAgICAgIG5vZGUueCA9IG5vZGUuX3RyZWUucHJlbGltICsgeDtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKGNoaWxkcmVuICYmIChuID0gY2hpbGRyZW4ubGVuZ3RoKSkge1xuICAgICAgICAgIHZhciBpID0gLTEsIG47XG4gICAgICAgICAgeCArPSBub2RlLl90cmVlLm1vZDtcbiAgICAgICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICAgICAgc2Vjb25kV2FsayhjaGlsZHJlbltpXSwgeCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBhcHBvcnRpb24obm9kZSwgcHJldmlvdXNTaWJsaW5nLCBhbmNlc3Rvcikge1xuICAgICAgICBpZiAocHJldmlvdXNTaWJsaW5nKSB7XG4gICAgICAgICAgdmFyIHZpcCA9IG5vZGUsIHZvcCA9IG5vZGUsIHZpbSA9IHByZXZpb3VzU2libGluZywgdm9tID0gbm9kZS5wYXJlbnQuY2hpbGRyZW5bMF0sIHNpcCA9IHZpcC5fdHJlZS5tb2QsIHNvcCA9IHZvcC5fdHJlZS5tb2QsIHNpbSA9IHZpbS5fdHJlZS5tb2QsIHNvbSA9IHZvbS5fdHJlZS5tb2QsIHNoaWZ0O1xuICAgICAgICAgIHdoaWxlICh2aW0gPSBkM19sYXlvdXRfdHJlZVJpZ2h0KHZpbSksIHZpcCA9IGQzX2xheW91dF90cmVlTGVmdCh2aXApLCB2aW0gJiYgdmlwKSB7XG4gICAgICAgICAgICB2b20gPSBkM19sYXlvdXRfdHJlZUxlZnQodm9tKTtcbiAgICAgICAgICAgIHZvcCA9IGQzX2xheW91dF90cmVlUmlnaHQodm9wKTtcbiAgICAgICAgICAgIHZvcC5fdHJlZS5hbmNlc3RvciA9IG5vZGU7XG4gICAgICAgICAgICBzaGlmdCA9IHZpbS5fdHJlZS5wcmVsaW0gKyBzaW0gLSB2aXAuX3RyZWUucHJlbGltIC0gc2lwICsgc2VwYXJhdGlvbih2aW0sIHZpcCk7XG4gICAgICAgICAgICBpZiAoc2hpZnQgPiAwKSB7XG4gICAgICAgICAgICAgIGQzX2xheW91dF90cmVlTW92ZShkM19sYXlvdXRfdHJlZUFuY2VzdG9yKHZpbSwgbm9kZSwgYW5jZXN0b3IpLCBub2RlLCBzaGlmdCk7XG4gICAgICAgICAgICAgIHNpcCArPSBzaGlmdDtcbiAgICAgICAgICAgICAgc29wICs9IHNoaWZ0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2ltICs9IHZpbS5fdHJlZS5tb2Q7XG4gICAgICAgICAgICBzaXAgKz0gdmlwLl90cmVlLm1vZDtcbiAgICAgICAgICAgIHNvbSArPSB2b20uX3RyZWUubW9kO1xuICAgICAgICAgICAgc29wICs9IHZvcC5fdHJlZS5tb2Q7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2aW0gJiYgIWQzX2xheW91dF90cmVlUmlnaHQodm9wKSkge1xuICAgICAgICAgICAgdm9wLl90cmVlLnRocmVhZCA9IHZpbTtcbiAgICAgICAgICAgIHZvcC5fdHJlZS5tb2QgKz0gc2ltIC0gc29wO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodmlwICYmICFkM19sYXlvdXRfdHJlZUxlZnQodm9tKSkge1xuICAgICAgICAgICAgdm9tLl90cmVlLnRocmVhZCA9IHZpcDtcbiAgICAgICAgICAgIHZvbS5fdHJlZS5tb2QgKz0gc2lwIC0gc29tO1xuICAgICAgICAgICAgYW5jZXN0b3IgPSBub2RlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYW5jZXN0b3I7XG4gICAgICB9XG4gICAgICBkM19sYXlvdXRfdHJlZVZpc2l0QWZ0ZXIocm9vdCwgZnVuY3Rpb24obm9kZSwgcHJldmlvdXNTaWJsaW5nKSB7XG4gICAgICAgIG5vZGUuX3RyZWUgPSB7XG4gICAgICAgICAgYW5jZXN0b3I6IG5vZGUsXG4gICAgICAgICAgcHJlbGltOiAwLFxuICAgICAgICAgIG1vZDogMCxcbiAgICAgICAgICBjaGFuZ2U6IDAsXG4gICAgICAgICAgc2hpZnQ6IDAsXG4gICAgICAgICAgbnVtYmVyOiBwcmV2aW91c1NpYmxpbmcgPyBwcmV2aW91c1NpYmxpbmcuX3RyZWUubnVtYmVyICsgMSA6IDBcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgICAgZmlyc3RXYWxrKHJvb3QpO1xuICAgICAgc2Vjb25kV2Fsayhyb290LCAtcm9vdC5fdHJlZS5wcmVsaW0pO1xuICAgICAgdmFyIGxlZnQgPSBkM19sYXlvdXRfdHJlZVNlYXJjaChyb290LCBkM19sYXlvdXRfdHJlZUxlZnRtb3N0KSwgcmlnaHQgPSBkM19sYXlvdXRfdHJlZVNlYXJjaChyb290LCBkM19sYXlvdXRfdHJlZVJpZ2h0bW9zdCksIGRlZXAgPSBkM19sYXlvdXRfdHJlZVNlYXJjaChyb290LCBkM19sYXlvdXRfdHJlZURlZXBlc3QpLCB4MCA9IGxlZnQueCAtIHNlcGFyYXRpb24obGVmdCwgcmlnaHQpIC8gMiwgeDEgPSByaWdodC54ICsgc2VwYXJhdGlvbihyaWdodCwgbGVmdCkgLyAyLCB5MSA9IGRlZXAuZGVwdGggfHwgMTtcbiAgICAgIGQzX2xheW91dF90cmVlVmlzaXRBZnRlcihyb290LCBub2RlU2l6ZSA/IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgbm9kZS54ICo9IHNpemVbMF07XG4gICAgICAgIG5vZGUueSA9IG5vZGUuZGVwdGggKiBzaXplWzFdO1xuICAgICAgICBkZWxldGUgbm9kZS5fdHJlZTtcbiAgICAgIH0gOiBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIG5vZGUueCA9IChub2RlLnggLSB4MCkgLyAoeDEgLSB4MCkgKiBzaXplWzBdO1xuICAgICAgICBub2RlLnkgPSBub2RlLmRlcHRoIC8geTEgKiBzaXplWzFdO1xuICAgICAgICBkZWxldGUgbm9kZS5fdHJlZTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5vZGVzO1xuICAgIH1cbiAgICB0cmVlLnNlcGFyYXRpb24gPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBzZXBhcmF0aW9uO1xuICAgICAgc2VwYXJhdGlvbiA9IHg7XG4gICAgICByZXR1cm4gdHJlZTtcbiAgICB9O1xuICAgIHRyZWUuc2l6ZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5vZGVTaXplID8gbnVsbCA6IHNpemU7XG4gICAgICBub2RlU2l6ZSA9IChzaXplID0geCkgPT0gbnVsbDtcbiAgICAgIHJldHVybiB0cmVlO1xuICAgIH07XG4gICAgdHJlZS5ub2RlU2l6ZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5vZGVTaXplID8gc2l6ZSA6IG51bGw7XG4gICAgICBub2RlU2l6ZSA9IChzaXplID0geCkgIT0gbnVsbDtcbiAgICAgIHJldHVybiB0cmVlO1xuICAgIH07XG4gICAgcmV0dXJuIGQzX2xheW91dF9oaWVyYXJjaHlSZWJpbmQodHJlZSwgaGllcmFyY2h5KTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3RyZWVTZXBhcmF0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYS5wYXJlbnQgPT0gYi5wYXJlbnQgPyAxIDogMjtcbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfdHJlZUxlZnQobm9kZSkge1xuICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW47XG4gICAgcmV0dXJuIGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCA/IGNoaWxkcmVuWzBdIDogbm9kZS5fdHJlZS50aHJlYWQ7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3RyZWVSaWdodChub2RlKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbiwgbjtcbiAgICByZXR1cm4gY2hpbGRyZW4gJiYgKG4gPSBjaGlsZHJlbi5sZW5ndGgpID8gY2hpbGRyZW5bbiAtIDFdIDogbm9kZS5fdHJlZS50aHJlYWQ7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3RyZWVTZWFyY2gobm9kZSwgY29tcGFyZSkge1xuICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW47XG4gICAgaWYgKGNoaWxkcmVuICYmIChuID0gY2hpbGRyZW4ubGVuZ3RoKSkge1xuICAgICAgdmFyIGNoaWxkLCBuLCBpID0gLTE7XG4gICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICBpZiAoY29tcGFyZShjaGlsZCA9IGQzX2xheW91dF90cmVlU2VhcmNoKGNoaWxkcmVuW2ldLCBjb21wYXJlKSwgbm9kZSkgPiAwKSB7XG4gICAgICAgICAgbm9kZSA9IGNoaWxkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF90cmVlUmlnaHRtb3N0KGEsIGIpIHtcbiAgICByZXR1cm4gYS54IC0gYi54O1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF90cmVlTGVmdG1vc3QoYSwgYikge1xuICAgIHJldHVybiBiLnggLSBhLng7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3RyZWVEZWVwZXN0KGEsIGIpIHtcbiAgICByZXR1cm4gYS5kZXB0aCAtIGIuZGVwdGg7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3RyZWVWaXNpdEFmdGVyKG5vZGUsIGNhbGxiYWNrKSB7XG4gICAgZnVuY3Rpb24gdmlzaXQobm9kZSwgcHJldmlvdXNTaWJsaW5nKSB7XG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuO1xuICAgICAgaWYgKGNoaWxkcmVuICYmIChuID0gY2hpbGRyZW4ubGVuZ3RoKSkge1xuICAgICAgICB2YXIgY2hpbGQsIHByZXZpb3VzQ2hpbGQgPSBudWxsLCBpID0gLTEsIG47XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgICAgY2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICAgICAgICB2aXNpdChjaGlsZCwgcHJldmlvdXNDaGlsZCk7XG4gICAgICAgICAgcHJldmlvdXNDaGlsZCA9IGNoaWxkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhub2RlLCBwcmV2aW91c1NpYmxpbmcpO1xuICAgIH1cbiAgICB2aXNpdChub2RlLCBudWxsKTtcbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfdHJlZVNoaWZ0KG5vZGUpIHtcbiAgICB2YXIgc2hpZnQgPSAwLCBjaGFuZ2UgPSAwLCBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4sIGkgPSBjaGlsZHJlbi5sZW5ndGgsIGNoaWxkO1xuICAgIHdoaWxlICgtLWkgPj0gMCkge1xuICAgICAgY2hpbGQgPSBjaGlsZHJlbltpXS5fdHJlZTtcbiAgICAgIGNoaWxkLnByZWxpbSArPSBzaGlmdDtcbiAgICAgIGNoaWxkLm1vZCArPSBzaGlmdDtcbiAgICAgIHNoaWZ0ICs9IGNoaWxkLnNoaWZ0ICsgKGNoYW5nZSArPSBjaGlsZC5jaGFuZ2UpO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfdHJlZU1vdmUoYW5jZXN0b3IsIG5vZGUsIHNoaWZ0KSB7XG4gICAgYW5jZXN0b3IgPSBhbmNlc3Rvci5fdHJlZTtcbiAgICBub2RlID0gbm9kZS5fdHJlZTtcbiAgICB2YXIgY2hhbmdlID0gc2hpZnQgLyAobm9kZS5udW1iZXIgLSBhbmNlc3Rvci5udW1iZXIpO1xuICAgIGFuY2VzdG9yLmNoYW5nZSArPSBjaGFuZ2U7XG4gICAgbm9kZS5jaGFuZ2UgLT0gY2hhbmdlO1xuICAgIG5vZGUuc2hpZnQgKz0gc2hpZnQ7XG4gICAgbm9kZS5wcmVsaW0gKz0gc2hpZnQ7XG4gICAgbm9kZS5tb2QgKz0gc2hpZnQ7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3RyZWVBbmNlc3Rvcih2aW0sIG5vZGUsIGFuY2VzdG9yKSB7XG4gICAgcmV0dXJuIHZpbS5fdHJlZS5hbmNlc3Rvci5wYXJlbnQgPT0gbm9kZS5wYXJlbnQgPyB2aW0uX3RyZWUuYW5jZXN0b3IgOiBhbmNlc3RvcjtcbiAgfVxuICBkMy5sYXlvdXQucGFjayA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBoaWVyYXJjaHkgPSBkMy5sYXlvdXQuaGllcmFyY2h5KCkuc29ydChkM19sYXlvdXRfcGFja1NvcnQpLCBwYWRkaW5nID0gMCwgc2l6ZSA9IFsgMSwgMSBdLCByYWRpdXM7XG4gICAgZnVuY3Rpb24gcGFjayhkLCBpKSB7XG4gICAgICB2YXIgbm9kZXMgPSBoaWVyYXJjaHkuY2FsbCh0aGlzLCBkLCBpKSwgcm9vdCA9IG5vZGVzWzBdLCB3ID0gc2l6ZVswXSwgaCA9IHNpemVbMV0sIHIgPSByYWRpdXMgPT0gbnVsbCA/IE1hdGguc3FydCA6IHR5cGVvZiByYWRpdXMgPT09IFwiZnVuY3Rpb25cIiA/IHJhZGl1cyA6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcmFkaXVzO1xuICAgICAgfTtcbiAgICAgIHJvb3QueCA9IHJvb3QueSA9IDA7XG4gICAgICBkM19sYXlvdXRfdHJlZVZpc2l0QWZ0ZXIocm9vdCwgZnVuY3Rpb24oZCkge1xuICAgICAgICBkLnIgPSArcihkLnZhbHVlKTtcbiAgICAgIH0pO1xuICAgICAgZDNfbGF5b3V0X3RyZWVWaXNpdEFmdGVyKHJvb3QsIGQzX2xheW91dF9wYWNrU2libGluZ3MpO1xuICAgICAgaWYgKHBhZGRpbmcpIHtcbiAgICAgICAgdmFyIGRyID0gcGFkZGluZyAqIChyYWRpdXMgPyAxIDogTWF0aC5tYXgoMiAqIHJvb3QuciAvIHcsIDIgKiByb290LnIgLyBoKSkgLyAyO1xuICAgICAgICBkM19sYXlvdXRfdHJlZVZpc2l0QWZ0ZXIocm9vdCwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIGQuciArPSBkcjtcbiAgICAgICAgfSk7XG4gICAgICAgIGQzX2xheW91dF90cmVlVmlzaXRBZnRlcihyb290LCBkM19sYXlvdXRfcGFja1NpYmxpbmdzKTtcbiAgICAgICAgZDNfbGF5b3V0X3RyZWVWaXNpdEFmdGVyKHJvb3QsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICBkLnIgLT0gZHI7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgZDNfbGF5b3V0X3BhY2tUcmFuc2Zvcm0ocm9vdCwgdyAvIDIsIGggLyAyLCByYWRpdXMgPyAxIDogMSAvIE1hdGgubWF4KDIgKiByb290LnIgLyB3LCAyICogcm9vdC5yIC8gaCkpO1xuICAgICAgcmV0dXJuIG5vZGVzO1xuICAgIH1cbiAgICBwYWNrLnNpemUgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBzaXplO1xuICAgICAgc2l6ZSA9IF87XG4gICAgICByZXR1cm4gcGFjaztcbiAgICB9O1xuICAgIHBhY2sucmFkaXVzID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gcmFkaXVzO1xuICAgICAgcmFkaXVzID0gXyA9PSBudWxsIHx8IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogK187XG4gICAgICByZXR1cm4gcGFjaztcbiAgICB9O1xuICAgIHBhY2sucGFkZGluZyA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHBhZGRpbmc7XG4gICAgICBwYWRkaW5nID0gK187XG4gICAgICByZXR1cm4gcGFjaztcbiAgICB9O1xuICAgIHJldHVybiBkM19sYXlvdXRfaGllcmFyY2h5UmViaW5kKHBhY2ssIGhpZXJhcmNoeSk7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9wYWNrU29ydChhLCBiKSB7XG4gICAgcmV0dXJuIGEudmFsdWUgLSBiLnZhbHVlO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9wYWNrSW5zZXJ0KGEsIGIpIHtcbiAgICB2YXIgYyA9IGEuX3BhY2tfbmV4dDtcbiAgICBhLl9wYWNrX25leHQgPSBiO1xuICAgIGIuX3BhY2tfcHJldiA9IGE7XG4gICAgYi5fcGFja19uZXh0ID0gYztcbiAgICBjLl9wYWNrX3ByZXYgPSBiO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9wYWNrU3BsaWNlKGEsIGIpIHtcbiAgICBhLl9wYWNrX25leHQgPSBiO1xuICAgIGIuX3BhY2tfcHJldiA9IGE7XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3BhY2tJbnRlcnNlY3RzKGEsIGIpIHtcbiAgICB2YXIgZHggPSBiLnggLSBhLngsIGR5ID0gYi55IC0gYS55LCBkciA9IGEuciArIGIucjtcbiAgICByZXR1cm4gLjk5OSAqIGRyICogZHIgPiBkeCAqIGR4ICsgZHkgKiBkeTtcbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfcGFja1NpYmxpbmdzKG5vZGUpIHtcbiAgICBpZiAoIShub2RlcyA9IG5vZGUuY2hpbGRyZW4pIHx8ICEobiA9IG5vZGVzLmxlbmd0aCkpIHJldHVybjtcbiAgICB2YXIgbm9kZXMsIHhNaW4gPSBJbmZpbml0eSwgeE1heCA9IC1JbmZpbml0eSwgeU1pbiA9IEluZmluaXR5LCB5TWF4ID0gLUluZmluaXR5LCBhLCBiLCBjLCBpLCBqLCBrLCBuO1xuICAgIGZ1bmN0aW9uIGJvdW5kKG5vZGUpIHtcbiAgICAgIHhNaW4gPSBNYXRoLm1pbihub2RlLnggLSBub2RlLnIsIHhNaW4pO1xuICAgICAgeE1heCA9IE1hdGgubWF4KG5vZGUueCArIG5vZGUuciwgeE1heCk7XG4gICAgICB5TWluID0gTWF0aC5taW4obm9kZS55IC0gbm9kZS5yLCB5TWluKTtcbiAgICAgIHlNYXggPSBNYXRoLm1heChub2RlLnkgKyBub2RlLnIsIHlNYXgpO1xuICAgIH1cbiAgICBub2Rlcy5mb3JFYWNoKGQzX2xheW91dF9wYWNrTGluayk7XG4gICAgYSA9IG5vZGVzWzBdO1xuICAgIGEueCA9IC1hLnI7XG4gICAgYS55ID0gMDtcbiAgICBib3VuZChhKTtcbiAgICBpZiAobiA+IDEpIHtcbiAgICAgIGIgPSBub2Rlc1sxXTtcbiAgICAgIGIueCA9IGIucjtcbiAgICAgIGIueSA9IDA7XG4gICAgICBib3VuZChiKTtcbiAgICAgIGlmIChuID4gMikge1xuICAgICAgICBjID0gbm9kZXNbMl07XG4gICAgICAgIGQzX2xheW91dF9wYWNrUGxhY2UoYSwgYiwgYyk7XG4gICAgICAgIGJvdW5kKGMpO1xuICAgICAgICBkM19sYXlvdXRfcGFja0luc2VydChhLCBjKTtcbiAgICAgICAgYS5fcGFja19wcmV2ID0gYztcbiAgICAgICAgZDNfbGF5b3V0X3BhY2tJbnNlcnQoYywgYik7XG4gICAgICAgIGIgPSBhLl9wYWNrX25leHQ7XG4gICAgICAgIGZvciAoaSA9IDM7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICBkM19sYXlvdXRfcGFja1BsYWNlKGEsIGIsIGMgPSBub2Rlc1tpXSk7XG4gICAgICAgICAgdmFyIGlzZWN0ID0gMCwgczEgPSAxLCBzMiA9IDE7XG4gICAgICAgICAgZm9yIChqID0gYi5fcGFja19uZXh0OyBqICE9PSBiOyBqID0gai5fcGFja19uZXh0LCBzMSsrKSB7XG4gICAgICAgICAgICBpZiAoZDNfbGF5b3V0X3BhY2tJbnRlcnNlY3RzKGosIGMpKSB7XG4gICAgICAgICAgICAgIGlzZWN0ID0gMTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpc2VjdCA9PSAxKSB7XG4gICAgICAgICAgICBmb3IgKGsgPSBhLl9wYWNrX3ByZXY7IGsgIT09IGouX3BhY2tfcHJldjsgayA9IGsuX3BhY2tfcHJldiwgczIrKykge1xuICAgICAgICAgICAgICBpZiAoZDNfbGF5b3V0X3BhY2tJbnRlcnNlY3RzKGssIGMpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlzZWN0KSB7XG4gICAgICAgICAgICBpZiAoczEgPCBzMiB8fCBzMSA9PSBzMiAmJiBiLnIgPCBhLnIpIGQzX2xheW91dF9wYWNrU3BsaWNlKGEsIGIgPSBqKTsgZWxzZSBkM19sYXlvdXRfcGFja1NwbGljZShhID0gaywgYik7XG4gICAgICAgICAgICBpLS07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGQzX2xheW91dF9wYWNrSW5zZXJ0KGEsIGMpO1xuICAgICAgICAgICAgYiA9IGM7XG4gICAgICAgICAgICBib3VuZChjKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGN4ID0gKHhNaW4gKyB4TWF4KSAvIDIsIGN5ID0gKHlNaW4gKyB5TWF4KSAvIDIsIGNyID0gMDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICBjID0gbm9kZXNbaV07XG4gICAgICBjLnggLT0gY3g7XG4gICAgICBjLnkgLT0gY3k7XG4gICAgICBjciA9IE1hdGgubWF4KGNyLCBjLnIgKyBNYXRoLnNxcnQoYy54ICogYy54ICsgYy55ICogYy55KSk7XG4gICAgfVxuICAgIG5vZGUuciA9IGNyO1xuICAgIG5vZGVzLmZvckVhY2goZDNfbGF5b3V0X3BhY2tVbmxpbmspO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9wYWNrTGluayhub2RlKSB7XG4gICAgbm9kZS5fcGFja19uZXh0ID0gbm9kZS5fcGFja19wcmV2ID0gbm9kZTtcbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfcGFja1VubGluayhub2RlKSB7XG4gICAgZGVsZXRlIG5vZGUuX3BhY2tfbmV4dDtcbiAgICBkZWxldGUgbm9kZS5fcGFja19wcmV2O1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9wYWNrVHJhbnNmb3JtKG5vZGUsIHgsIHksIGspIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuO1xuICAgIG5vZGUueCA9IHggKz0gayAqIG5vZGUueDtcbiAgICBub2RlLnkgPSB5ICs9IGsgKiBub2RlLnk7XG4gICAgbm9kZS5yICo9IGs7XG4gICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICB2YXIgaSA9IC0xLCBuID0gY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGQzX2xheW91dF9wYWNrVHJhbnNmb3JtKGNoaWxkcmVuW2ldLCB4LCB5LCBrKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3BhY2tQbGFjZShhLCBiLCBjKSB7XG4gICAgdmFyIGRiID0gYS5yICsgYy5yLCBkeCA9IGIueCAtIGEueCwgZHkgPSBiLnkgLSBhLnk7XG4gICAgaWYgKGRiICYmIChkeCB8fCBkeSkpIHtcbiAgICAgIHZhciBkYSA9IGIuciArIGMuciwgZGMgPSBkeCAqIGR4ICsgZHkgKiBkeTtcbiAgICAgIGRhICo9IGRhO1xuICAgICAgZGIgKj0gZGI7XG4gICAgICB2YXIgeCA9IC41ICsgKGRiIC0gZGEpIC8gKDIgKiBkYyksIHkgPSBNYXRoLnNxcnQoTWF0aC5tYXgoMCwgMiAqIGRhICogKGRiICsgZGMpIC0gKGRiIC09IGRjKSAqIGRiIC0gZGEgKiBkYSkpIC8gKDIgKiBkYyk7XG4gICAgICBjLnggPSBhLnggKyB4ICogZHggKyB5ICogZHk7XG4gICAgICBjLnkgPSBhLnkgKyB4ICogZHkgLSB5ICogZHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIGMueCA9IGEueCArIGRiO1xuICAgICAgYy55ID0gYS55O1xuICAgIH1cbiAgfVxuICBkMy5sYXlvdXQuY2x1c3RlciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBoaWVyYXJjaHkgPSBkMy5sYXlvdXQuaGllcmFyY2h5KCkuc29ydChudWxsKS52YWx1ZShudWxsKSwgc2VwYXJhdGlvbiA9IGQzX2xheW91dF90cmVlU2VwYXJhdGlvbiwgc2l6ZSA9IFsgMSwgMSBdLCBub2RlU2l6ZSA9IGZhbHNlO1xuICAgIGZ1bmN0aW9uIGNsdXN0ZXIoZCwgaSkge1xuICAgICAgdmFyIG5vZGVzID0gaGllcmFyY2h5LmNhbGwodGhpcywgZCwgaSksIHJvb3QgPSBub2Rlc1swXSwgcHJldmlvdXNOb2RlLCB4ID0gMDtcbiAgICAgIGQzX2xheW91dF90cmVlVmlzaXRBZnRlcihyb290LCBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW47XG4gICAgICAgIGlmIChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgICBub2RlLnggPSBkM19sYXlvdXRfY2x1c3RlclgoY2hpbGRyZW4pO1xuICAgICAgICAgIG5vZGUueSA9IGQzX2xheW91dF9jbHVzdGVyWShjaGlsZHJlbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbm9kZS54ID0gcHJldmlvdXNOb2RlID8geCArPSBzZXBhcmF0aW9uKG5vZGUsIHByZXZpb3VzTm9kZSkgOiAwO1xuICAgICAgICAgIG5vZGUueSA9IDA7XG4gICAgICAgICAgcHJldmlvdXNOb2RlID0gbm9kZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgbGVmdCA9IGQzX2xheW91dF9jbHVzdGVyTGVmdChyb290KSwgcmlnaHQgPSBkM19sYXlvdXRfY2x1c3RlclJpZ2h0KHJvb3QpLCB4MCA9IGxlZnQueCAtIHNlcGFyYXRpb24obGVmdCwgcmlnaHQpIC8gMiwgeDEgPSByaWdodC54ICsgc2VwYXJhdGlvbihyaWdodCwgbGVmdCkgLyAyO1xuICAgICAgZDNfbGF5b3V0X3RyZWVWaXNpdEFmdGVyKHJvb3QsIG5vZGVTaXplID8gZnVuY3Rpb24obm9kZSkge1xuICAgICAgICBub2RlLnggPSAobm9kZS54IC0gcm9vdC54KSAqIHNpemVbMF07XG4gICAgICAgIG5vZGUueSA9IChyb290LnkgLSBub2RlLnkpICogc2l6ZVsxXTtcbiAgICAgIH0gOiBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIG5vZGUueCA9IChub2RlLnggLSB4MCkgLyAoeDEgLSB4MCkgKiBzaXplWzBdO1xuICAgICAgICBub2RlLnkgPSAoMSAtIChyb290LnkgPyBub2RlLnkgLyByb290LnkgOiAxKSkgKiBzaXplWzFdO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gbm9kZXM7XG4gICAgfVxuICAgIGNsdXN0ZXIuc2VwYXJhdGlvbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHNlcGFyYXRpb247XG4gICAgICBzZXBhcmF0aW9uID0geDtcbiAgICAgIHJldHVybiBjbHVzdGVyO1xuICAgIH07XG4gICAgY2x1c3Rlci5zaXplID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbm9kZVNpemUgPyBudWxsIDogc2l6ZTtcbiAgICAgIG5vZGVTaXplID0gKHNpemUgPSB4KSA9PSBudWxsO1xuICAgICAgcmV0dXJuIGNsdXN0ZXI7XG4gICAgfTtcbiAgICBjbHVzdGVyLm5vZGVTaXplID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbm9kZVNpemUgPyBzaXplIDogbnVsbDtcbiAgICAgIG5vZGVTaXplID0gKHNpemUgPSB4KSAhPSBudWxsO1xuICAgICAgcmV0dXJuIGNsdXN0ZXI7XG4gICAgfTtcbiAgICByZXR1cm4gZDNfbGF5b3V0X2hpZXJhcmNoeVJlYmluZChjbHVzdGVyLCBoaWVyYXJjaHkpO1xuICB9O1xuICBmdW5jdGlvbiBkM19sYXlvdXRfY2x1c3RlclkoY2hpbGRyZW4pIHtcbiAgICByZXR1cm4gMSArIGQzLm1heChjaGlsZHJlbiwgZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC55O1xuICAgIH0pO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9jbHVzdGVyWChjaGlsZHJlbikge1xuICAgIHJldHVybiBjaGlsZHJlbi5yZWR1Y2UoZnVuY3Rpb24oeCwgY2hpbGQpIHtcbiAgICAgIHJldHVybiB4ICsgY2hpbGQueDtcbiAgICB9LCAwKSAvIGNoaWxkcmVuLmxlbmd0aDtcbiAgfVxuICBmdW5jdGlvbiBkM19sYXlvdXRfY2x1c3RlckxlZnQobm9kZSkge1xuICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW47XG4gICAgcmV0dXJuIGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCA/IGQzX2xheW91dF9jbHVzdGVyTGVmdChjaGlsZHJlblswXSkgOiBub2RlO1xuICB9XG4gIGZ1bmN0aW9uIGQzX2xheW91dF9jbHVzdGVyUmlnaHQobm9kZSkge1xuICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4sIG47XG4gICAgcmV0dXJuIGNoaWxkcmVuICYmIChuID0gY2hpbGRyZW4ubGVuZ3RoKSA/IGQzX2xheW91dF9jbHVzdGVyUmlnaHQoY2hpbGRyZW5bbiAtIDFdKSA6IG5vZGU7XG4gIH1cbiAgZDMubGF5b3V0LnRyZWVtYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaGllcmFyY2h5ID0gZDMubGF5b3V0LmhpZXJhcmNoeSgpLCByb3VuZCA9IE1hdGgucm91bmQsIHNpemUgPSBbIDEsIDEgXSwgcGFkZGluZyA9IG51bGwsIHBhZCA9IGQzX2xheW91dF90cmVlbWFwUGFkTnVsbCwgc3RpY2t5ID0gZmFsc2UsIHN0aWNraWVzLCBtb2RlID0gXCJzcXVhcmlmeVwiLCByYXRpbyA9IC41ICogKDEgKyBNYXRoLnNxcnQoNSkpO1xuICAgIGZ1bmN0aW9uIHNjYWxlKGNoaWxkcmVuLCBrKSB7XG4gICAgICB2YXIgaSA9IC0xLCBuID0gY2hpbGRyZW4ubGVuZ3RoLCBjaGlsZCwgYXJlYTtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIGFyZWEgPSAoY2hpbGQgPSBjaGlsZHJlbltpXSkudmFsdWUgKiAoayA8IDAgPyAwIDogayk7XG4gICAgICAgIGNoaWxkLmFyZWEgPSBpc05hTihhcmVhKSB8fCBhcmVhIDw9IDAgPyAwIDogYXJlYTtcbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gc3F1YXJpZnkobm9kZSkge1xuICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbjtcbiAgICAgIGlmIChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHJlY3QgPSBwYWQobm9kZSksIHJvdyA9IFtdLCByZW1haW5pbmcgPSBjaGlsZHJlbi5zbGljZSgpLCBjaGlsZCwgYmVzdCA9IEluZmluaXR5LCBzY29yZSwgdSA9IG1vZGUgPT09IFwic2xpY2VcIiA/IHJlY3QuZHggOiBtb2RlID09PSBcImRpY2VcIiA/IHJlY3QuZHkgOiBtb2RlID09PSBcInNsaWNlLWRpY2VcIiA/IG5vZGUuZGVwdGggJiAxID8gcmVjdC5keSA6IHJlY3QuZHggOiBNYXRoLm1pbihyZWN0LmR4LCByZWN0LmR5KSwgbjtcbiAgICAgICAgc2NhbGUocmVtYWluaW5nLCByZWN0LmR4ICogcmVjdC5keSAvIG5vZGUudmFsdWUpO1xuICAgICAgICByb3cuYXJlYSA9IDA7XG4gICAgICAgIHdoaWxlICgobiA9IHJlbWFpbmluZy5sZW5ndGgpID4gMCkge1xuICAgICAgICAgIHJvdy5wdXNoKGNoaWxkID0gcmVtYWluaW5nW24gLSAxXSk7XG4gICAgICAgICAgcm93LmFyZWEgKz0gY2hpbGQuYXJlYTtcbiAgICAgICAgICBpZiAobW9kZSAhPT0gXCJzcXVhcmlmeVwiIHx8IChzY29yZSA9IHdvcnN0KHJvdywgdSkpIDw9IGJlc3QpIHtcbiAgICAgICAgICAgIHJlbWFpbmluZy5wb3AoKTtcbiAgICAgICAgICAgIGJlc3QgPSBzY29yZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm93LmFyZWEgLT0gcm93LnBvcCgpLmFyZWE7XG4gICAgICAgICAgICBwb3NpdGlvbihyb3csIHUsIHJlY3QsIGZhbHNlKTtcbiAgICAgICAgICAgIHUgPSBNYXRoLm1pbihyZWN0LmR4LCByZWN0LmR5KTtcbiAgICAgICAgICAgIHJvdy5sZW5ndGggPSByb3cuYXJlYSA9IDA7XG4gICAgICAgICAgICBiZXN0ID0gSW5maW5pdHk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyb3cubGVuZ3RoKSB7XG4gICAgICAgICAgcG9zaXRpb24ocm93LCB1LCByZWN0LCB0cnVlKTtcbiAgICAgICAgICByb3cubGVuZ3RoID0gcm93LmFyZWEgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goc3F1YXJpZnkpO1xuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBzdGlja2lmeShub2RlKSB7XG4gICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuO1xuICAgICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICB2YXIgcmVjdCA9IHBhZChub2RlKSwgcmVtYWluaW5nID0gY2hpbGRyZW4uc2xpY2UoKSwgY2hpbGQsIHJvdyA9IFtdO1xuICAgICAgICBzY2FsZShyZW1haW5pbmcsIHJlY3QuZHggKiByZWN0LmR5IC8gbm9kZS52YWx1ZSk7XG4gICAgICAgIHJvdy5hcmVhID0gMDtcbiAgICAgICAgd2hpbGUgKGNoaWxkID0gcmVtYWluaW5nLnBvcCgpKSB7XG4gICAgICAgICAgcm93LnB1c2goY2hpbGQpO1xuICAgICAgICAgIHJvdy5hcmVhICs9IGNoaWxkLmFyZWE7XG4gICAgICAgICAgaWYgKGNoaWxkLnogIT0gbnVsbCkge1xuICAgICAgICAgICAgcG9zaXRpb24ocm93LCBjaGlsZC56ID8gcmVjdC5keCA6IHJlY3QuZHksIHJlY3QsICFyZW1haW5pbmcubGVuZ3RoKTtcbiAgICAgICAgICAgIHJvdy5sZW5ndGggPSByb3cuYXJlYSA9IDA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNoaWxkcmVuLmZvckVhY2goc3RpY2tpZnkpO1xuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiB3b3JzdChyb3csIHUpIHtcbiAgICAgIHZhciBzID0gcm93LmFyZWEsIHIsIHJtYXggPSAwLCBybWluID0gSW5maW5pdHksIGkgPSAtMSwgbiA9IHJvdy5sZW5ndGg7XG4gICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICBpZiAoIShyID0gcm93W2ldLmFyZWEpKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHIgPCBybWluKSBybWluID0gcjtcbiAgICAgICAgaWYgKHIgPiBybWF4KSBybWF4ID0gcjtcbiAgICAgIH1cbiAgICAgIHMgKj0gcztcbiAgICAgIHUgKj0gdTtcbiAgICAgIHJldHVybiBzID8gTWF0aC5tYXgodSAqIHJtYXggKiByYXRpbyAvIHMsIHMgLyAodSAqIHJtaW4gKiByYXRpbykpIDogSW5maW5pdHk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBvc2l0aW9uKHJvdywgdSwgcmVjdCwgZmx1c2gpIHtcbiAgICAgIHZhciBpID0gLTEsIG4gPSByb3cubGVuZ3RoLCB4ID0gcmVjdC54LCB5ID0gcmVjdC55LCB2ID0gdSA/IHJvdW5kKHJvdy5hcmVhIC8gdSkgOiAwLCBvO1xuICAgICAgaWYgKHUgPT0gcmVjdC5keCkge1xuICAgICAgICBpZiAoZmx1c2ggfHwgdiA+IHJlY3QuZHkpIHYgPSByZWN0LmR5O1xuICAgICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICAgIG8gPSByb3dbaV07XG4gICAgICAgICAgby54ID0geDtcbiAgICAgICAgICBvLnkgPSB5O1xuICAgICAgICAgIG8uZHkgPSB2O1xuICAgICAgICAgIHggKz0gby5keCA9IE1hdGgubWluKHJlY3QueCArIHJlY3QuZHggLSB4LCB2ID8gcm91bmQoby5hcmVhIC8gdikgOiAwKTtcbiAgICAgICAgfVxuICAgICAgICBvLnogPSB0cnVlO1xuICAgICAgICBvLmR4ICs9IHJlY3QueCArIHJlY3QuZHggLSB4O1xuICAgICAgICByZWN0LnkgKz0gdjtcbiAgICAgICAgcmVjdC5keSAtPSB2O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZsdXNoIHx8IHYgPiByZWN0LmR4KSB2ID0gcmVjdC5keDtcbiAgICAgICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgICBvID0gcm93W2ldO1xuICAgICAgICAgIG8ueCA9IHg7XG4gICAgICAgICAgby55ID0geTtcbiAgICAgICAgICBvLmR4ID0gdjtcbiAgICAgICAgICB5ICs9IG8uZHkgPSBNYXRoLm1pbihyZWN0LnkgKyByZWN0LmR5IC0geSwgdiA/IHJvdW5kKG8uYXJlYSAvIHYpIDogMCk7XG4gICAgICAgIH1cbiAgICAgICAgby56ID0gZmFsc2U7XG4gICAgICAgIG8uZHkgKz0gcmVjdC55ICsgcmVjdC5keSAtIHk7XG4gICAgICAgIHJlY3QueCArPSB2O1xuICAgICAgICByZWN0LmR4IC09IHY7XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHRyZWVtYXAoZCkge1xuICAgICAgdmFyIG5vZGVzID0gc3RpY2tpZXMgfHwgaGllcmFyY2h5KGQpLCByb290ID0gbm9kZXNbMF07XG4gICAgICByb290LnggPSAwO1xuICAgICAgcm9vdC55ID0gMDtcbiAgICAgIHJvb3QuZHggPSBzaXplWzBdO1xuICAgICAgcm9vdC5keSA9IHNpemVbMV07XG4gICAgICBpZiAoc3RpY2tpZXMpIGhpZXJhcmNoeS5yZXZhbHVlKHJvb3QpO1xuICAgICAgc2NhbGUoWyByb290IF0sIHJvb3QuZHggKiByb290LmR5IC8gcm9vdC52YWx1ZSk7XG4gICAgICAoc3RpY2tpZXMgPyBzdGlja2lmeSA6IHNxdWFyaWZ5KShyb290KTtcbiAgICAgIGlmIChzdGlja3kpIHN0aWNraWVzID0gbm9kZXM7XG4gICAgICByZXR1cm4gbm9kZXM7XG4gICAgfVxuICAgIHRyZWVtYXAuc2l6ZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHNpemU7XG4gICAgICBzaXplID0geDtcbiAgICAgIHJldHVybiB0cmVlbWFwO1xuICAgIH07XG4gICAgdHJlZW1hcC5wYWRkaW5nID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gcGFkZGluZztcbiAgICAgIGZ1bmN0aW9uIHBhZEZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgdmFyIHAgPSB4LmNhbGwodHJlZW1hcCwgbm9kZSwgbm9kZS5kZXB0aCk7XG4gICAgICAgIHJldHVybiBwID09IG51bGwgPyBkM19sYXlvdXRfdHJlZW1hcFBhZE51bGwobm9kZSkgOiBkM19sYXlvdXRfdHJlZW1hcFBhZChub2RlLCB0eXBlb2YgcCA9PT0gXCJudW1iZXJcIiA/IFsgcCwgcCwgcCwgcCBdIDogcCk7XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBwYWRDb25zdGFudChub2RlKSB7XG4gICAgICAgIHJldHVybiBkM19sYXlvdXRfdHJlZW1hcFBhZChub2RlLCB4KTtcbiAgICAgIH1cbiAgICAgIHZhciB0eXBlO1xuICAgICAgcGFkID0gKHBhZGRpbmcgPSB4KSA9PSBudWxsID8gZDNfbGF5b3V0X3RyZWVtYXBQYWROdWxsIDogKHR5cGUgPSB0eXBlb2YgeCkgPT09IFwiZnVuY3Rpb25cIiA/IHBhZEZ1bmN0aW9uIDogdHlwZSA9PT0gXCJudW1iZXJcIiA/ICh4ID0gWyB4LCB4LCB4LCB4IF0sIFxuICAgICAgcGFkQ29uc3RhbnQpIDogcGFkQ29uc3RhbnQ7XG4gICAgICByZXR1cm4gdHJlZW1hcDtcbiAgICB9O1xuICAgIHRyZWVtYXAucm91bmQgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiByb3VuZCAhPSBOdW1iZXI7XG4gICAgICByb3VuZCA9IHggPyBNYXRoLnJvdW5kIDogTnVtYmVyO1xuICAgICAgcmV0dXJuIHRyZWVtYXA7XG4gICAgfTtcbiAgICB0cmVlbWFwLnN0aWNreSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHN0aWNreTtcbiAgICAgIHN0aWNreSA9IHg7XG4gICAgICBzdGlja2llcyA9IG51bGw7XG4gICAgICByZXR1cm4gdHJlZW1hcDtcbiAgICB9O1xuICAgIHRyZWVtYXAucmF0aW8gPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiByYXRpbztcbiAgICAgIHJhdGlvID0geDtcbiAgICAgIHJldHVybiB0cmVlbWFwO1xuICAgIH07XG4gICAgdHJlZW1hcC5tb2RlID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbW9kZTtcbiAgICAgIG1vZGUgPSB4ICsgXCJcIjtcbiAgICAgIHJldHVybiB0cmVlbWFwO1xuICAgIH07XG4gICAgcmV0dXJuIGQzX2xheW91dF9oaWVyYXJjaHlSZWJpbmQodHJlZW1hcCwgaGllcmFyY2h5KTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3RyZWVtYXBQYWROdWxsKG5vZGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgeDogbm9kZS54LFxuICAgICAgeTogbm9kZS55LFxuICAgICAgZHg6IG5vZGUuZHgsXG4gICAgICBkeTogbm9kZS5keVxuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gZDNfbGF5b3V0X3RyZWVtYXBQYWQobm9kZSwgcGFkZGluZykge1xuICAgIHZhciB4ID0gbm9kZS54ICsgcGFkZGluZ1szXSwgeSA9IG5vZGUueSArIHBhZGRpbmdbMF0sIGR4ID0gbm9kZS5keCAtIHBhZGRpbmdbMV0gLSBwYWRkaW5nWzNdLCBkeSA9IG5vZGUuZHkgLSBwYWRkaW5nWzBdIC0gcGFkZGluZ1syXTtcbiAgICBpZiAoZHggPCAwKSB7XG4gICAgICB4ICs9IGR4IC8gMjtcbiAgICAgIGR4ID0gMDtcbiAgICB9XG4gICAgaWYgKGR5IDwgMCkge1xuICAgICAgeSArPSBkeSAvIDI7XG4gICAgICBkeSA9IDA7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB4OiB4LFxuICAgICAgeTogeSxcbiAgICAgIGR4OiBkeCxcbiAgICAgIGR5OiBkeVxuICAgIH07XG4gIH1cbiAgZDMucmFuZG9tID0ge1xuICAgIG5vcm1hbDogZnVuY3Rpb24owrUsIM+DKSB7XG4gICAgICB2YXIgbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICBpZiAobiA8IDIpIM+DID0gMTtcbiAgICAgIGlmIChuIDwgMSkgwrUgPSAwO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgeCwgeSwgcjtcbiAgICAgICAgZG8ge1xuICAgICAgICAgIHggPSBNYXRoLnJhbmRvbSgpICogMiAtIDE7XG4gICAgICAgICAgeSA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTtcbiAgICAgICAgICByID0geCAqIHggKyB5ICogeTtcbiAgICAgICAgfSB3aGlsZSAoIXIgfHwgciA+IDEpO1xuICAgICAgICByZXR1cm4gwrUgKyDPgyAqIHggKiBNYXRoLnNxcnQoLTIgKiBNYXRoLmxvZyhyKSAvIHIpO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGxvZ05vcm1hbDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmFuZG9tID0gZDMucmFuZG9tLm5vcm1hbC5hcHBseShkMywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZXhwKHJhbmRvbSgpKTtcbiAgICAgIH07XG4gICAgfSxcbiAgICBiYXRlczogZnVuY3Rpb24obSkge1xuICAgICAgdmFyIHJhbmRvbSA9IGQzLnJhbmRvbS5pcndpbkhhbGwobSk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiByYW5kb20oKSAvIG07XG4gICAgICB9O1xuICAgIH0sXG4gICAgaXJ3aW5IYWxsOiBmdW5jdGlvbihtKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIGZvciAodmFyIHMgPSAwLCBqID0gMDsgaiA8IG07IGorKykgcyArPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgICByZXR1cm4gcztcbiAgICAgIH07XG4gICAgfVxuICB9O1xuICBkMy5zY2FsZSA9IHt9O1xuICBmdW5jdGlvbiBkM19zY2FsZUV4dGVudChkb21haW4pIHtcbiAgICB2YXIgc3RhcnQgPSBkb21haW5bMF0sIHN0b3AgPSBkb21haW5bZG9tYWluLmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBzdGFydCA8IHN0b3AgPyBbIHN0YXJ0LCBzdG9wIF0gOiBbIHN0b3AsIHN0YXJ0IF07XG4gIH1cbiAgZnVuY3Rpb24gZDNfc2NhbGVSYW5nZShzY2FsZSkge1xuICAgIHJldHVybiBzY2FsZS5yYW5nZUV4dGVudCA/IHNjYWxlLnJhbmdlRXh0ZW50KCkgOiBkM19zY2FsZUV4dGVudChzY2FsZS5yYW5nZSgpKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zY2FsZV9iaWxpbmVhcihkb21haW4sIHJhbmdlLCB1bmludGVycG9sYXRlLCBpbnRlcnBvbGF0ZSkge1xuICAgIHZhciB1ID0gdW5pbnRlcnBvbGF0ZShkb21haW5bMF0sIGRvbWFpblsxXSksIGkgPSBpbnRlcnBvbGF0ZShyYW5nZVswXSwgcmFuZ2VbMV0pO1xuICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gaSh1KHgpKTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGQzX3NjYWxlX25pY2UoZG9tYWluLCBuaWNlKSB7XG4gICAgdmFyIGkwID0gMCwgaTEgPSBkb21haW4ubGVuZ3RoIC0gMSwgeDAgPSBkb21haW5baTBdLCB4MSA9IGRvbWFpbltpMV0sIGR4O1xuICAgIGlmICh4MSA8IHgwKSB7XG4gICAgICBkeCA9IGkwLCBpMCA9IGkxLCBpMSA9IGR4O1xuICAgICAgZHggPSB4MCwgeDAgPSB4MSwgeDEgPSBkeDtcbiAgICB9XG4gICAgZG9tYWluW2kwXSA9IG5pY2UuZmxvb3IoeDApO1xuICAgIGRvbWFpbltpMV0gPSBuaWNlLmNlaWwoeDEpO1xuICAgIHJldHVybiBkb21haW47XG4gIH1cbiAgZnVuY3Rpb24gZDNfc2NhbGVfbmljZVN0ZXAoc3RlcCkge1xuICAgIHJldHVybiBzdGVwID8ge1xuICAgICAgZmxvb3I6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoeCAvIHN0ZXApICogc3RlcDtcbiAgICAgIH0sXG4gICAgICBjZWlsOiBmdW5jdGlvbih4KSB7XG4gICAgICAgIHJldHVybiBNYXRoLmNlaWwoeCAvIHN0ZXApICogc3RlcDtcbiAgICAgIH1cbiAgICB9IDogZDNfc2NhbGVfbmljZUlkZW50aXR5O1xuICB9XG4gIHZhciBkM19zY2FsZV9uaWNlSWRlbnRpdHkgPSB7XG4gICAgZmxvb3I6IGQzX2lkZW50aXR5LFxuICAgIGNlaWw6IGQzX2lkZW50aXR5XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3NjYWxlX3BvbHlsaW5lYXIoZG9tYWluLCByYW5nZSwgdW5pbnRlcnBvbGF0ZSwgaW50ZXJwb2xhdGUpIHtcbiAgICB2YXIgdSA9IFtdLCBpID0gW10sIGogPSAwLCBrID0gTWF0aC5taW4oZG9tYWluLmxlbmd0aCwgcmFuZ2UubGVuZ3RoKSAtIDE7XG4gICAgaWYgKGRvbWFpbltrXSA8IGRvbWFpblswXSkge1xuICAgICAgZG9tYWluID0gZG9tYWluLnNsaWNlKCkucmV2ZXJzZSgpO1xuICAgICAgcmFuZ2UgPSByYW5nZS5zbGljZSgpLnJldmVyc2UoKTtcbiAgICB9XG4gICAgd2hpbGUgKCsraiA8PSBrKSB7XG4gICAgICB1LnB1c2godW5pbnRlcnBvbGF0ZShkb21haW5baiAtIDFdLCBkb21haW5bal0pKTtcbiAgICAgIGkucHVzaChpbnRlcnBvbGF0ZShyYW5nZVtqIC0gMV0sIHJhbmdlW2pdKSk7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgICB2YXIgaiA9IGQzLmJpc2VjdChkb21haW4sIHgsIDEsIGspIC0gMTtcbiAgICAgIHJldHVybiBpW2pdKHVbal0oeCkpO1xuICAgIH07XG4gIH1cbiAgZDMuc2NhbGUubGluZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX3NjYWxlX2xpbmVhcihbIDAsIDEgXSwgWyAwLCAxIF0sIGQzX2ludGVycG9sYXRlLCBmYWxzZSk7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3NjYWxlX2xpbmVhcihkb21haW4sIHJhbmdlLCBpbnRlcnBvbGF0ZSwgY2xhbXApIHtcbiAgICB2YXIgb3V0cHV0LCBpbnB1dDtcbiAgICBmdW5jdGlvbiByZXNjYWxlKCkge1xuICAgICAgdmFyIGxpbmVhciA9IE1hdGgubWluKGRvbWFpbi5sZW5ndGgsIHJhbmdlLmxlbmd0aCkgPiAyID8gZDNfc2NhbGVfcG9seWxpbmVhciA6IGQzX3NjYWxlX2JpbGluZWFyLCB1bmludGVycG9sYXRlID0gY2xhbXAgPyBkM191bmludGVycG9sYXRlQ2xhbXAgOiBkM191bmludGVycG9sYXRlTnVtYmVyO1xuICAgICAgb3V0cHV0ID0gbGluZWFyKGRvbWFpbiwgcmFuZ2UsIHVuaW50ZXJwb2xhdGUsIGludGVycG9sYXRlKTtcbiAgICAgIGlucHV0ID0gbGluZWFyKHJhbmdlLCBkb21haW4sIHVuaW50ZXJwb2xhdGUsIGQzX2ludGVycG9sYXRlKTtcbiAgICAgIHJldHVybiBzY2FsZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc2NhbGUoeCkge1xuICAgICAgcmV0dXJuIG91dHB1dCh4KTtcbiAgICB9XG4gICAgc2NhbGUuaW52ZXJ0ID0gZnVuY3Rpb24oeSkge1xuICAgICAgcmV0dXJuIGlucHV0KHkpO1xuICAgIH07XG4gICAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZG9tYWluO1xuICAgICAgZG9tYWluID0geC5tYXAoTnVtYmVyKTtcbiAgICAgIHJldHVybiByZXNjYWxlKCk7XG4gICAgfTtcbiAgICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHJhbmdlO1xuICAgICAgcmFuZ2UgPSB4O1xuICAgICAgcmV0dXJuIHJlc2NhbGUoKTtcbiAgICB9O1xuICAgIHNjYWxlLnJhbmdlUm91bmQgPSBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gc2NhbGUucmFuZ2UoeCkuaW50ZXJwb2xhdGUoZDNfaW50ZXJwb2xhdGVSb3VuZCk7XG4gICAgfTtcbiAgICBzY2FsZS5jbGFtcCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGNsYW1wO1xuICAgICAgY2xhbXAgPSB4O1xuICAgICAgcmV0dXJuIHJlc2NhbGUoKTtcbiAgICB9O1xuICAgIHNjYWxlLmludGVycG9sYXRlID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaW50ZXJwb2xhdGU7XG4gICAgICBpbnRlcnBvbGF0ZSA9IHg7XG4gICAgICByZXR1cm4gcmVzY2FsZSgpO1xuICAgIH07XG4gICAgc2NhbGUudGlja3MgPSBmdW5jdGlvbihtKSB7XG4gICAgICByZXR1cm4gZDNfc2NhbGVfbGluZWFyVGlja3MoZG9tYWluLCBtKTtcbiAgICB9O1xuICAgIHNjYWxlLnRpY2tGb3JtYXQgPSBmdW5jdGlvbihtLCBmb3JtYXQpIHtcbiAgICAgIHJldHVybiBkM19zY2FsZV9saW5lYXJUaWNrRm9ybWF0KGRvbWFpbiwgbSwgZm9ybWF0KTtcbiAgICB9O1xuICAgIHNjYWxlLm5pY2UgPSBmdW5jdGlvbihtKSB7XG4gICAgICBkM19zY2FsZV9saW5lYXJOaWNlKGRvbWFpbiwgbSk7XG4gICAgICByZXR1cm4gcmVzY2FsZSgpO1xuICAgIH07XG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGQzX3NjYWxlX2xpbmVhcihkb21haW4sIHJhbmdlLCBpbnRlcnBvbGF0ZSwgY2xhbXApO1xuICAgIH07XG4gICAgcmV0dXJuIHJlc2NhbGUoKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zY2FsZV9saW5lYXJSZWJpbmQoc2NhbGUsIGxpbmVhcikge1xuICAgIHJldHVybiBkMy5yZWJpbmQoc2NhbGUsIGxpbmVhciwgXCJyYW5nZVwiLCBcInJhbmdlUm91bmRcIiwgXCJpbnRlcnBvbGF0ZVwiLCBcImNsYW1wXCIpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3NjYWxlX2xpbmVhck5pY2UoZG9tYWluLCBtKSB7XG4gICAgcmV0dXJuIGQzX3NjYWxlX25pY2UoZG9tYWluLCBkM19zY2FsZV9uaWNlU3RlcChkM19zY2FsZV9saW5lYXJUaWNrUmFuZ2UoZG9tYWluLCBtKVsyXSkpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3NjYWxlX2xpbmVhclRpY2tSYW5nZShkb21haW4sIG0pIHtcbiAgICBpZiAobSA9PSBudWxsKSBtID0gMTA7XG4gICAgdmFyIGV4dGVudCA9IGQzX3NjYWxlRXh0ZW50KGRvbWFpbiksIHNwYW4gPSBleHRlbnRbMV0gLSBleHRlbnRbMF0sIHN0ZXAgPSBNYXRoLnBvdygxMCwgTWF0aC5mbG9vcihNYXRoLmxvZyhzcGFuIC8gbSkgLyBNYXRoLkxOMTApKSwgZXJyID0gbSAvIHNwYW4gKiBzdGVwO1xuICAgIGlmIChlcnIgPD0gLjE1KSBzdGVwICo9IDEwOyBlbHNlIGlmIChlcnIgPD0gLjM1KSBzdGVwICo9IDU7IGVsc2UgaWYgKGVyciA8PSAuNzUpIHN0ZXAgKj0gMjtcbiAgICBleHRlbnRbMF0gPSBNYXRoLmNlaWwoZXh0ZW50WzBdIC8gc3RlcCkgKiBzdGVwO1xuICAgIGV4dGVudFsxXSA9IE1hdGguZmxvb3IoZXh0ZW50WzFdIC8gc3RlcCkgKiBzdGVwICsgc3RlcCAqIC41O1xuICAgIGV4dGVudFsyXSA9IHN0ZXA7XG4gICAgcmV0dXJuIGV4dGVudDtcbiAgfVxuICBmdW5jdGlvbiBkM19zY2FsZV9saW5lYXJUaWNrcyhkb21haW4sIG0pIHtcbiAgICByZXR1cm4gZDMucmFuZ2UuYXBwbHkoZDMsIGQzX3NjYWxlX2xpbmVhclRpY2tSYW5nZShkb21haW4sIG0pKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zY2FsZV9saW5lYXJUaWNrRm9ybWF0KGRvbWFpbiwgbSwgZm9ybWF0KSB7XG4gICAgdmFyIHJhbmdlID0gZDNfc2NhbGVfbGluZWFyVGlja1JhbmdlKGRvbWFpbiwgbSk7XG4gICAgcmV0dXJuIGQzLmZvcm1hdChmb3JtYXQgPyBmb3JtYXQucmVwbGFjZShkM19mb3JtYXRfcmUsIGZ1bmN0aW9uKGEsIGIsIGMsIGQsIGUsIGYsIGcsIGgsIGksIGopIHtcbiAgICAgIHJldHVybiBbIGIsIGMsIGQsIGUsIGYsIGcsIGgsIGkgfHwgXCIuXCIgKyBkM19zY2FsZV9saW5lYXJGb3JtYXRQcmVjaXNpb24oaiwgcmFuZ2UpLCBqIF0uam9pbihcIlwiKTtcbiAgICB9KSA6IFwiLC5cIiArIGQzX3NjYWxlX2xpbmVhclByZWNpc2lvbihyYW5nZVsyXSkgKyBcImZcIik7XG4gIH1cbiAgdmFyIGQzX3NjYWxlX2xpbmVhckZvcm1hdFNpZ25pZmljYW50ID0ge1xuICAgIHM6IDEsXG4gICAgZzogMSxcbiAgICBwOiAxLFxuICAgIHI6IDEsXG4gICAgZTogMVxuICB9O1xuICBmdW5jdGlvbiBkM19zY2FsZV9saW5lYXJQcmVjaXNpb24odmFsdWUpIHtcbiAgICByZXR1cm4gLU1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjEwICsgLjAxKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zY2FsZV9saW5lYXJGb3JtYXRQcmVjaXNpb24odHlwZSwgcmFuZ2UpIHtcbiAgICB2YXIgcCA9IGQzX3NjYWxlX2xpbmVhclByZWNpc2lvbihyYW5nZVsyXSk7XG4gICAgcmV0dXJuIHR5cGUgaW4gZDNfc2NhbGVfbGluZWFyRm9ybWF0U2lnbmlmaWNhbnQgPyBNYXRoLmFicyhwIC0gZDNfc2NhbGVfbGluZWFyUHJlY2lzaW9uKE1hdGgubWF4KE1hdGguYWJzKHJhbmdlWzBdKSwgTWF0aC5hYnMocmFuZ2VbMV0pKSkpICsgKyh0eXBlICE9PSBcImVcIikgOiBwIC0gKHR5cGUgPT09IFwiJVwiKSAqIDI7XG4gIH1cbiAgZDMuc2NhbGUubG9nID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX3NjYWxlX2xvZyhkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oWyAwLCAxIF0pLCAxMCwgdHJ1ZSwgWyAxLCAxMCBdKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfc2NhbGVfbG9nKGxpbmVhciwgYmFzZSwgcG9zaXRpdmUsIGRvbWFpbikge1xuICAgIGZ1bmN0aW9uIGxvZyh4KSB7XG4gICAgICByZXR1cm4gKHBvc2l0aXZlID8gTWF0aC5sb2coeCA8IDAgPyAwIDogeCkgOiAtTWF0aC5sb2coeCA+IDAgPyAwIDogLXgpKSAvIE1hdGgubG9nKGJhc2UpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwb3coeCkge1xuICAgICAgcmV0dXJuIHBvc2l0aXZlID8gTWF0aC5wb3coYmFzZSwgeCkgOiAtTWF0aC5wb3coYmFzZSwgLXgpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzY2FsZSh4KSB7XG4gICAgICByZXR1cm4gbGluZWFyKGxvZyh4KSk7XG4gICAgfVxuICAgIHNjYWxlLmludmVydCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiBwb3cobGluZWFyLmludmVydCh4KSk7XG4gICAgfTtcbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkb21haW47XG4gICAgICBwb3NpdGl2ZSA9IHhbMF0gPj0gMDtcbiAgICAgIGxpbmVhci5kb21haW4oKGRvbWFpbiA9IHgubWFwKE51bWJlcikpLm1hcChsb2cpKTtcbiAgICAgIHJldHVybiBzY2FsZTtcbiAgICB9O1xuICAgIHNjYWxlLmJhc2UgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBiYXNlO1xuICAgICAgYmFzZSA9ICtfO1xuICAgICAgbGluZWFyLmRvbWFpbihkb21haW4ubWFwKGxvZykpO1xuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH07XG4gICAgc2NhbGUubmljZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5pY2VkID0gZDNfc2NhbGVfbmljZShkb21haW4ubWFwKGxvZyksIHBvc2l0aXZlID8gTWF0aCA6IGQzX3NjYWxlX2xvZ05pY2VOZWdhdGl2ZSk7XG4gICAgICBsaW5lYXIuZG9tYWluKG5pY2VkKTtcbiAgICAgIGRvbWFpbiA9IG5pY2VkLm1hcChwb3cpO1xuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH07XG4gICAgc2NhbGUudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBleHRlbnQgPSBkM19zY2FsZUV4dGVudChkb21haW4pLCB0aWNrcyA9IFtdLCB1ID0gZXh0ZW50WzBdLCB2ID0gZXh0ZW50WzFdLCBpID0gTWF0aC5mbG9vcihsb2codSkpLCBqID0gTWF0aC5jZWlsKGxvZyh2KSksIG4gPSBiYXNlICUgMSA/IDIgOiBiYXNlO1xuICAgICAgaWYgKGlzRmluaXRlKGogLSBpKSkge1xuICAgICAgICBpZiAocG9zaXRpdmUpIHtcbiAgICAgICAgICBmb3IgKDtpIDwgajsgaSsrKSBmb3IgKHZhciBrID0gMTsgayA8IG47IGsrKykgdGlja3MucHVzaChwb3coaSkgKiBrKTtcbiAgICAgICAgICB0aWNrcy5wdXNoKHBvdyhpKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGlja3MucHVzaChwb3coaSkpO1xuICAgICAgICAgIGZvciAoO2krKyA8IGo7ICkgZm9yICh2YXIgayA9IG4gLSAxOyBrID4gMDsgay0tKSB0aWNrcy5wdXNoKHBvdyhpKSAqIGspO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IHRpY2tzW2ldIDwgdTsgaSsrKSB7fVxuICAgICAgICBmb3IgKGogPSB0aWNrcy5sZW5ndGg7IHRpY2tzW2ogLSAxXSA+IHY7IGotLSkge31cbiAgICAgICAgdGlja3MgPSB0aWNrcy5zbGljZShpLCBqKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aWNrcztcbiAgICB9O1xuICAgIHNjYWxlLnRpY2tGb3JtYXQgPSBmdW5jdGlvbihuLCBmb3JtYXQpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGQzX3NjYWxlX2xvZ0Zvcm1hdDtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikgZm9ybWF0ID0gZDNfc2NhbGVfbG9nRm9ybWF0OyBlbHNlIGlmICh0eXBlb2YgZm9ybWF0ICE9PSBcImZ1bmN0aW9uXCIpIGZvcm1hdCA9IGQzLmZvcm1hdChmb3JtYXQpO1xuICAgICAgdmFyIGsgPSBNYXRoLm1heCguMSwgbiAvIHNjYWxlLnRpY2tzKCkubGVuZ3RoKSwgZiA9IHBvc2l0aXZlID8gKGUgPSAxZS0xMiwgTWF0aC5jZWlsKSA6IChlID0gLTFlLTEyLCBcbiAgICAgIE1hdGguZmxvb3IpLCBlO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIGQgLyBwb3coZihsb2coZCkgKyBlKSkgPD0gayA/IGZvcm1hdChkKSA6IFwiXCI7XG4gICAgICB9O1xuICAgIH07XG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGQzX3NjYWxlX2xvZyhsaW5lYXIuY29weSgpLCBiYXNlLCBwb3NpdGl2ZSwgZG9tYWluKTtcbiAgICB9O1xuICAgIHJldHVybiBkM19zY2FsZV9saW5lYXJSZWJpbmQoc2NhbGUsIGxpbmVhcik7XG4gIH1cbiAgdmFyIGQzX3NjYWxlX2xvZ0Zvcm1hdCA9IGQzLmZvcm1hdChcIi4wZVwiKSwgZDNfc2NhbGVfbG9nTmljZU5lZ2F0aXZlID0ge1xuICAgIGZsb29yOiBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gLU1hdGguY2VpbCgteCk7XG4gICAgfSxcbiAgICBjZWlsOiBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gLU1hdGguZmxvb3IoLXgpO1xuICAgIH1cbiAgfTtcbiAgZDMuc2NhbGUucG93ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX3NjYWxlX3BvdyhkMy5zY2FsZS5saW5lYXIoKSwgMSwgWyAwLCAxIF0pO1xuICB9O1xuICBmdW5jdGlvbiBkM19zY2FsZV9wb3cobGluZWFyLCBleHBvbmVudCwgZG9tYWluKSB7XG4gICAgdmFyIHBvd3AgPSBkM19zY2FsZV9wb3dQb3coZXhwb25lbnQpLCBwb3diID0gZDNfc2NhbGVfcG93UG93KDEgLyBleHBvbmVudCk7XG4gICAgZnVuY3Rpb24gc2NhbGUoeCkge1xuICAgICAgcmV0dXJuIGxpbmVhcihwb3dwKHgpKTtcbiAgICB9XG4gICAgc2NhbGUuaW52ZXJ0ID0gZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHBvd2IobGluZWFyLmludmVydCh4KSk7XG4gICAgfTtcbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkb21haW47XG4gICAgICBsaW5lYXIuZG9tYWluKChkb21haW4gPSB4Lm1hcChOdW1iZXIpKS5tYXAocG93cCkpO1xuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH07XG4gICAgc2NhbGUudGlja3MgPSBmdW5jdGlvbihtKSB7XG4gICAgICByZXR1cm4gZDNfc2NhbGVfbGluZWFyVGlja3MoZG9tYWluLCBtKTtcbiAgICB9O1xuICAgIHNjYWxlLnRpY2tGb3JtYXQgPSBmdW5jdGlvbihtLCBmb3JtYXQpIHtcbiAgICAgIHJldHVybiBkM19zY2FsZV9saW5lYXJUaWNrRm9ybWF0KGRvbWFpbiwgbSwgZm9ybWF0KTtcbiAgICB9O1xuICAgIHNjYWxlLm5pY2UgPSBmdW5jdGlvbihtKSB7XG4gICAgICByZXR1cm4gc2NhbGUuZG9tYWluKGQzX3NjYWxlX2xpbmVhck5pY2UoZG9tYWluLCBtKSk7XG4gICAgfTtcbiAgICBzY2FsZS5leHBvbmVudCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGV4cG9uZW50O1xuICAgICAgcG93cCA9IGQzX3NjYWxlX3Bvd1BvdyhleHBvbmVudCA9IHgpO1xuICAgICAgcG93YiA9IGQzX3NjYWxlX3Bvd1BvdygxIC8gZXhwb25lbnQpO1xuICAgICAgbGluZWFyLmRvbWFpbihkb21haW4ubWFwKHBvd3ApKTtcbiAgICAgIHJldHVybiBzY2FsZTtcbiAgICB9O1xuICAgIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBkM19zY2FsZV9wb3cobGluZWFyLmNvcHkoKSwgZXhwb25lbnQsIGRvbWFpbik7XG4gICAgfTtcbiAgICByZXR1cm4gZDNfc2NhbGVfbGluZWFyUmViaW5kKHNjYWxlLCBsaW5lYXIpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3NjYWxlX3Bvd1BvdyhlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB4IDwgMCA/IC1NYXRoLnBvdygteCwgZSkgOiBNYXRoLnBvdyh4LCBlKTtcbiAgICB9O1xuICB9XG4gIGQzLnNjYWxlLnNxcnQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZDMuc2NhbGUucG93KCkuZXhwb25lbnQoLjUpO1xuICB9O1xuICBkMy5zY2FsZS5vcmRpbmFsID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX3NjYWxlX29yZGluYWwoW10sIHtcbiAgICAgIHQ6IFwicmFuZ2VcIixcbiAgICAgIGE6IFsgW10gXVxuICAgIH0pO1xuICB9O1xuICBmdW5jdGlvbiBkM19zY2FsZV9vcmRpbmFsKGRvbWFpbiwgcmFuZ2VyKSB7XG4gICAgdmFyIGluZGV4LCByYW5nZSwgcmFuZ2VCYW5kO1xuICAgIGZ1bmN0aW9uIHNjYWxlKHgpIHtcbiAgICAgIHJldHVybiByYW5nZVsoKGluZGV4LmdldCh4KSB8fCByYW5nZXIudCA9PT0gXCJyYW5nZVwiICYmIGluZGV4LnNldCh4LCBkb21haW4ucHVzaCh4KSkpIC0gMSkgJSByYW5nZS5sZW5ndGhdO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzdGVwcyhzdGFydCwgc3RlcCkge1xuICAgICAgcmV0dXJuIGQzLnJhbmdlKGRvbWFpbi5sZW5ndGgpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgICAgIHJldHVybiBzdGFydCArIHN0ZXAgKiBpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRvbWFpbjtcbiAgICAgIGRvbWFpbiA9IFtdO1xuICAgICAgaW5kZXggPSBuZXcgZDNfTWFwKCk7XG4gICAgICB2YXIgaSA9IC0xLCBuID0geC5sZW5ndGgsIHhpO1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICghaW5kZXguaGFzKHhpID0geFtpXSkpIGluZGV4LnNldCh4aSwgZG9tYWluLnB1c2goeGkpKTtcbiAgICAgIHJldHVybiBzY2FsZVtyYW5nZXIudF0uYXBwbHkoc2NhbGUsIHJhbmdlci5hKTtcbiAgICB9O1xuICAgIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gcmFuZ2U7XG4gICAgICByYW5nZSA9IHg7XG4gICAgICByYW5nZUJhbmQgPSAwO1xuICAgICAgcmFuZ2VyID0ge1xuICAgICAgICB0OiBcInJhbmdlXCIsXG4gICAgICAgIGE6IGFyZ3VtZW50c1xuICAgICAgfTtcbiAgICAgIHJldHVybiBzY2FsZTtcbiAgICB9O1xuICAgIHNjYWxlLnJhbmdlUG9pbnRzID0gZnVuY3Rpb24oeCwgcGFkZGluZykge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSBwYWRkaW5nID0gMDtcbiAgICAgIHZhciBzdGFydCA9IHhbMF0sIHN0b3AgPSB4WzFdLCBzdGVwID0gKHN0b3AgLSBzdGFydCkgLyAoTWF0aC5tYXgoMSwgZG9tYWluLmxlbmd0aCAtIDEpICsgcGFkZGluZyk7XG4gICAgICByYW5nZSA9IHN0ZXBzKGRvbWFpbi5sZW5ndGggPCAyID8gKHN0YXJ0ICsgc3RvcCkgLyAyIDogc3RhcnQgKyBzdGVwICogcGFkZGluZyAvIDIsIHN0ZXApO1xuICAgICAgcmFuZ2VCYW5kID0gMDtcbiAgICAgIHJhbmdlciA9IHtcbiAgICAgICAgdDogXCJyYW5nZVBvaW50c1wiLFxuICAgICAgICBhOiBhcmd1bWVudHNcbiAgICAgIH07XG4gICAgICByZXR1cm4gc2NhbGU7XG4gICAgfTtcbiAgICBzY2FsZS5yYW5nZUJhbmRzID0gZnVuY3Rpb24oeCwgcGFkZGluZywgb3V0ZXJQYWRkaW5nKSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHBhZGRpbmcgPSAwO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSBvdXRlclBhZGRpbmcgPSBwYWRkaW5nO1xuICAgICAgdmFyIHJldmVyc2UgPSB4WzFdIDwgeFswXSwgc3RhcnQgPSB4W3JldmVyc2UgLSAwXSwgc3RvcCA9IHhbMSAtIHJldmVyc2VdLCBzdGVwID0gKHN0b3AgLSBzdGFydCkgLyAoZG9tYWluLmxlbmd0aCAtIHBhZGRpbmcgKyAyICogb3V0ZXJQYWRkaW5nKTtcbiAgICAgIHJhbmdlID0gc3RlcHMoc3RhcnQgKyBzdGVwICogb3V0ZXJQYWRkaW5nLCBzdGVwKTtcbiAgICAgIGlmIChyZXZlcnNlKSByYW5nZS5yZXZlcnNlKCk7XG4gICAgICByYW5nZUJhbmQgPSBzdGVwICogKDEgLSBwYWRkaW5nKTtcbiAgICAgIHJhbmdlciA9IHtcbiAgICAgICAgdDogXCJyYW5nZUJhbmRzXCIsXG4gICAgICAgIGE6IGFyZ3VtZW50c1xuICAgICAgfTtcbiAgICAgIHJldHVybiBzY2FsZTtcbiAgICB9O1xuICAgIHNjYWxlLnJhbmdlUm91bmRCYW5kcyA9IGZ1bmN0aW9uKHgsIHBhZGRpbmcsIG91dGVyUGFkZGluZykge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSBwYWRkaW5nID0gMDtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykgb3V0ZXJQYWRkaW5nID0gcGFkZGluZztcbiAgICAgIHZhciByZXZlcnNlID0geFsxXSA8IHhbMF0sIHN0YXJ0ID0geFtyZXZlcnNlIC0gMF0sIHN0b3AgPSB4WzEgLSByZXZlcnNlXSwgc3RlcCA9IE1hdGguZmxvb3IoKHN0b3AgLSBzdGFydCkgLyAoZG9tYWluLmxlbmd0aCAtIHBhZGRpbmcgKyAyICogb3V0ZXJQYWRkaW5nKSksIGVycm9yID0gc3RvcCAtIHN0YXJ0IC0gKGRvbWFpbi5sZW5ndGggLSBwYWRkaW5nKSAqIHN0ZXA7XG4gICAgICByYW5nZSA9IHN0ZXBzKHN0YXJ0ICsgTWF0aC5yb3VuZChlcnJvciAvIDIpLCBzdGVwKTtcbiAgICAgIGlmIChyZXZlcnNlKSByYW5nZS5yZXZlcnNlKCk7XG4gICAgICByYW5nZUJhbmQgPSBNYXRoLnJvdW5kKHN0ZXAgKiAoMSAtIHBhZGRpbmcpKTtcbiAgICAgIHJhbmdlciA9IHtcbiAgICAgICAgdDogXCJyYW5nZVJvdW5kQmFuZHNcIixcbiAgICAgICAgYTogYXJndW1lbnRzXG4gICAgICB9O1xuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH07XG4gICAgc2NhbGUucmFuZ2VCYW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmFuZ2VCYW5kO1xuICAgIH07XG4gICAgc2NhbGUucmFuZ2VFeHRlbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBkM19zY2FsZUV4dGVudChyYW5nZXIuYVswXSk7XG4gICAgfTtcbiAgICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZDNfc2NhbGVfb3JkaW5hbChkb21haW4sIHJhbmdlcik7XG4gICAgfTtcbiAgICByZXR1cm4gc2NhbGUuZG9tYWluKGRvbWFpbik7XG4gIH1cbiAgZDMuc2NhbGUuY2F0ZWdvcnkxMCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkMy5zY2FsZS5vcmRpbmFsKCkucmFuZ2UoZDNfY2F0ZWdvcnkxMCk7XG4gIH07XG4gIGQzLnNjYWxlLmNhdGVnb3J5MjAgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZDMuc2NhbGUub3JkaW5hbCgpLnJhbmdlKGQzX2NhdGVnb3J5MjApO1xuICB9O1xuICBkMy5zY2FsZS5jYXRlZ29yeTIwYiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkMy5zY2FsZS5vcmRpbmFsKCkucmFuZ2UoZDNfY2F0ZWdvcnkyMGIpO1xuICB9O1xuICBkMy5zY2FsZS5jYXRlZ29yeTIwYyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkMy5zY2FsZS5vcmRpbmFsKCkucmFuZ2UoZDNfY2F0ZWdvcnkyMGMpO1xuICB9O1xuICB2YXIgZDNfY2F0ZWdvcnkxMCA9IFsgMjA2MjI2MCwgMTY3NDQyMDYsIDI5MjQ1ODgsIDE0MDM0NzI4LCA5NzI1ODg1LCA5MTk3MTMxLCAxNDkwNzMzMCwgODM1NTcxMSwgMTIzNjkxODYsIDE1NTYxNzUgXS5tYXAoZDNfcmdiU3RyaW5nKTtcbiAgdmFyIGQzX2NhdGVnb3J5MjAgPSBbIDIwNjIyNjAsIDExNDU0NDQwLCAxNjc0NDIwNiwgMTY3NTk2NzIsIDI5MjQ1ODgsIDEwMDE4Njk4LCAxNDAzNDcyOCwgMTY3NTA3NDIsIDk3MjU4ODUsIDEyOTU1ODYxLCA5MTk3MTMxLCAxMjg4NTE0MCwgMTQ5MDczMzAsIDE2MjM0MTk0LCA4MzU1NzExLCAxMzA5MjgwNywgMTIzNjkxODYsIDE0NDA4NTg5LCAxNTU2MTc1LCAxMDQxMDcyNSBdLm1hcChkM19yZ2JTdHJpbmcpO1xuICB2YXIgZDNfY2F0ZWdvcnkyMGIgPSBbIDM3NTA3NzcsIDUzOTU2MTksIDcwNDA3MTksIDEwMjY0Mjg2LCA2NTE5MDk3LCA5MjE2NTk0LCAxMTkxNTExNSwgMTM1NTY2MzYsIDkyMDI5OTMsIDEyNDI2ODA5LCAxNTE4NjUxNCwgMTUxOTA5MzIsIDg2NjYxNjksIDExMzU2NDkwLCAxNDA0OTY0MywgMTUxNzczNzIsIDgwNzc2ODMsIDEwODM0MzI0LCAxMzUyODUwOSwgMTQ1ODk2NTQgXS5tYXAoZDNfcmdiU3RyaW5nKTtcbiAgdmFyIGQzX2NhdGVnb3J5MjBjID0gWyAzMjQ0NzMzLCA3MDU3MTEwLCAxMDQwNjYyNSwgMTMwMzI0MzEsIDE1MDk1MDUzLCAxNjYxNjc2NCwgMTY2MjUyNTksIDE2NjM0MDE4LCAzMjUzMDc2LCA3NjUyNDcwLCAxMDYwNzAwMywgMTMxMDE1MDQsIDc2OTUyODEsIDEwMzk0MzEyLCAxMjM2OTM3MiwgMTQzNDI4OTEsIDY1MTM1MDcsIDk4Njg5NTAsIDEyNDM0ODc3LCAxNDI3NzA4MSBdLm1hcChkM19yZ2JTdHJpbmcpO1xuICBkMy5zY2FsZS5xdWFudGlsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkM19zY2FsZV9xdWFudGlsZShbXSwgW10pO1xuICB9O1xuICBmdW5jdGlvbiBkM19zY2FsZV9xdWFudGlsZShkb21haW4sIHJhbmdlKSB7XG4gICAgdmFyIHRocmVzaG9sZHM7XG4gICAgZnVuY3Rpb24gcmVzY2FsZSgpIHtcbiAgICAgIHZhciBrID0gMCwgcSA9IHJhbmdlLmxlbmd0aDtcbiAgICAgIHRocmVzaG9sZHMgPSBbXTtcbiAgICAgIHdoaWxlICgrK2sgPCBxKSB0aHJlc2hvbGRzW2sgLSAxXSA9IGQzLnF1YW50aWxlKGRvbWFpbiwgayAvIHEpO1xuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzY2FsZSh4KSB7XG4gICAgICBpZiAoIWlzTmFOKHggPSAreCkpIHJldHVybiByYW5nZVtkMy5iaXNlY3QodGhyZXNob2xkcywgeCldO1xuICAgIH1cbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkb21haW47XG4gICAgICBkb21haW4gPSB4LmZpbHRlcihmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiAhaXNOYU4oZCk7XG4gICAgICB9KS5zb3J0KGQzLmFzY2VuZGluZyk7XG4gICAgICByZXR1cm4gcmVzY2FsZSgpO1xuICAgIH07XG4gICAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiByYW5nZTtcbiAgICAgIHJhbmdlID0geDtcbiAgICAgIHJldHVybiByZXNjYWxlKCk7XG4gICAgfTtcbiAgICBzY2FsZS5xdWFudGlsZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aHJlc2hvbGRzO1xuICAgIH07XG4gICAgc2NhbGUuaW52ZXJ0RXh0ZW50ID0gZnVuY3Rpb24oeSkge1xuICAgICAgeSA9IHJhbmdlLmluZGV4T2YoeSk7XG4gICAgICByZXR1cm4geSA8IDAgPyBbIE5hTiwgTmFOIF0gOiBbIHkgPiAwID8gdGhyZXNob2xkc1t5IC0gMV0gOiBkb21haW5bMF0sIHkgPCB0aHJlc2hvbGRzLmxlbmd0aCA/IHRocmVzaG9sZHNbeV0gOiBkb21haW5bZG9tYWluLmxlbmd0aCAtIDFdIF07XG4gICAgfTtcbiAgICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZDNfc2NhbGVfcXVhbnRpbGUoZG9tYWluLCByYW5nZSk7XG4gICAgfTtcbiAgICByZXR1cm4gcmVzY2FsZSgpO1xuICB9XG4gIGQzLnNjYWxlLnF1YW50aXplID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX3NjYWxlX3F1YW50aXplKDAsIDEsIFsgMCwgMSBdKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfc2NhbGVfcXVhbnRpemUoeDAsIHgxLCByYW5nZSkge1xuICAgIHZhciBreCwgaTtcbiAgICBmdW5jdGlvbiBzY2FsZSh4KSB7XG4gICAgICByZXR1cm4gcmFuZ2VbTWF0aC5tYXgoMCwgTWF0aC5taW4oaSwgTWF0aC5mbG9vcihreCAqICh4IC0geDApKSkpXTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVzY2FsZSgpIHtcbiAgICAgIGt4ID0gcmFuZ2UubGVuZ3RoIC8gKHgxIC0geDApO1xuICAgICAgaSA9IHJhbmdlLmxlbmd0aCAtIDE7XG4gICAgICByZXR1cm4gc2NhbGU7XG4gICAgfVxuICAgIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIFsgeDAsIHgxIF07XG4gICAgICB4MCA9ICt4WzBdO1xuICAgICAgeDEgPSAreFt4Lmxlbmd0aCAtIDFdO1xuICAgICAgcmV0dXJuIHJlc2NhbGUoKTtcbiAgICB9O1xuICAgIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gcmFuZ2U7XG4gICAgICByYW5nZSA9IHg7XG4gICAgICByZXR1cm4gcmVzY2FsZSgpO1xuICAgIH07XG4gICAgc2NhbGUuaW52ZXJ0RXh0ZW50ID0gZnVuY3Rpb24oeSkge1xuICAgICAgeSA9IHJhbmdlLmluZGV4T2YoeSk7XG4gICAgICB5ID0geSA8IDAgPyBOYU4gOiB5IC8ga3ggKyB4MDtcbiAgICAgIHJldHVybiBbIHksIHkgKyAxIC8ga3ggXTtcbiAgICB9O1xuICAgIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBkM19zY2FsZV9xdWFudGl6ZSh4MCwgeDEsIHJhbmdlKTtcbiAgICB9O1xuICAgIHJldHVybiByZXNjYWxlKCk7XG4gIH1cbiAgZDMuc2NhbGUudGhyZXNob2xkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX3NjYWxlX3RocmVzaG9sZChbIC41IF0sIFsgMCwgMSBdKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfc2NhbGVfdGhyZXNob2xkKGRvbWFpbiwgcmFuZ2UpIHtcbiAgICBmdW5jdGlvbiBzY2FsZSh4KSB7XG4gICAgICBpZiAoeCA8PSB4KSByZXR1cm4gcmFuZ2VbZDMuYmlzZWN0KGRvbWFpbiwgeCldO1xuICAgIH1cbiAgICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkb21haW47XG4gICAgICBkb21haW4gPSBfO1xuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH07XG4gICAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiByYW5nZTtcbiAgICAgIHJhbmdlID0gXztcbiAgICAgIHJldHVybiBzY2FsZTtcbiAgICB9O1xuICAgIHNjYWxlLmludmVydEV4dGVudCA9IGZ1bmN0aW9uKHkpIHtcbiAgICAgIHkgPSByYW5nZS5pbmRleE9mKHkpO1xuICAgICAgcmV0dXJuIFsgZG9tYWluW3kgLSAxXSwgZG9tYWluW3ldIF07XG4gICAgfTtcbiAgICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZDNfc2NhbGVfdGhyZXNob2xkKGRvbWFpbiwgcmFuZ2UpO1xuICAgIH07XG4gICAgcmV0dXJuIHNjYWxlO1xuICB9XG4gIGQzLnNjYWxlLmlkZW50aXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX3NjYWxlX2lkZW50aXR5KFsgMCwgMSBdKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfc2NhbGVfaWRlbnRpdHkoZG9tYWluKSB7XG4gICAgZnVuY3Rpb24gaWRlbnRpdHkoeCkge1xuICAgICAgcmV0dXJuICt4O1xuICAgIH1cbiAgICBpZGVudGl0eS5pbnZlcnQgPSBpZGVudGl0eTtcbiAgICBpZGVudGl0eS5kb21haW4gPSBpZGVudGl0eS5yYW5nZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRvbWFpbjtcbiAgICAgIGRvbWFpbiA9IHgubWFwKGlkZW50aXR5KTtcbiAgICAgIHJldHVybiBpZGVudGl0eTtcbiAgICB9O1xuICAgIGlkZW50aXR5LnRpY2tzID0gZnVuY3Rpb24obSkge1xuICAgICAgcmV0dXJuIGQzX3NjYWxlX2xpbmVhclRpY2tzKGRvbWFpbiwgbSk7XG4gICAgfTtcbiAgICBpZGVudGl0eS50aWNrRm9ybWF0ID0gZnVuY3Rpb24obSwgZm9ybWF0KSB7XG4gICAgICByZXR1cm4gZDNfc2NhbGVfbGluZWFyVGlja0Zvcm1hdChkb21haW4sIG0sIGZvcm1hdCk7XG4gICAgfTtcbiAgICBpZGVudGl0eS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZDNfc2NhbGVfaWRlbnRpdHkoZG9tYWluKTtcbiAgICB9O1xuICAgIHJldHVybiBpZGVudGl0eTtcbiAgfVxuICBkMy5zdmcgPSB7fTtcbiAgZDMuc3ZnLmFyYyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbm5lclJhZGl1cyA9IGQzX3N2Z19hcmNJbm5lclJhZGl1cywgb3V0ZXJSYWRpdXMgPSBkM19zdmdfYXJjT3V0ZXJSYWRpdXMsIHN0YXJ0QW5nbGUgPSBkM19zdmdfYXJjU3RhcnRBbmdsZSwgZW5kQW5nbGUgPSBkM19zdmdfYXJjRW5kQW5nbGU7XG4gICAgZnVuY3Rpb24gYXJjKCkge1xuICAgICAgdmFyIHIwID0gaW5uZXJSYWRpdXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSwgcjEgPSBvdXRlclJhZGl1cy5hcHBseSh0aGlzLCBhcmd1bWVudHMpLCBhMCA9IHN0YXJ0QW5nbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSArIGQzX3N2Z19hcmNPZmZzZXQsIGExID0gZW5kQW5nbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSArIGQzX3N2Z19hcmNPZmZzZXQsIGRhID0gKGExIDwgYTAgJiYgKGRhID0gYTAsIFxuICAgICAgYTAgPSBhMSwgYTEgPSBkYSksIGExIC0gYTApLCBkZiA9IGRhIDwgz4AgPyBcIjBcIiA6IFwiMVwiLCBjMCA9IE1hdGguY29zKGEwKSwgczAgPSBNYXRoLnNpbihhMCksIGMxID0gTWF0aC5jb3MoYTEpLCBzMSA9IE1hdGguc2luKGExKTtcbiAgICAgIHJldHVybiBkYSA+PSBkM19zdmdfYXJjTWF4ID8gcjAgPyBcIk0wLFwiICsgcjEgKyBcIkFcIiArIHIxICsgXCIsXCIgKyByMSArIFwiIDAgMSwxIDAsXCIgKyAtcjEgKyBcIkFcIiArIHIxICsgXCIsXCIgKyByMSArIFwiIDAgMSwxIDAsXCIgKyByMSArIFwiTTAsXCIgKyByMCArIFwiQVwiICsgcjAgKyBcIixcIiArIHIwICsgXCIgMCAxLDAgMCxcIiArIC1yMCArIFwiQVwiICsgcjAgKyBcIixcIiArIHIwICsgXCIgMCAxLDAgMCxcIiArIHIwICsgXCJaXCIgOiBcIk0wLFwiICsgcjEgKyBcIkFcIiArIHIxICsgXCIsXCIgKyByMSArIFwiIDAgMSwxIDAsXCIgKyAtcjEgKyBcIkFcIiArIHIxICsgXCIsXCIgKyByMSArIFwiIDAgMSwxIDAsXCIgKyByMSArIFwiWlwiIDogcjAgPyBcIk1cIiArIHIxICogYzAgKyBcIixcIiArIHIxICogczAgKyBcIkFcIiArIHIxICsgXCIsXCIgKyByMSArIFwiIDAgXCIgKyBkZiArIFwiLDEgXCIgKyByMSAqIGMxICsgXCIsXCIgKyByMSAqIHMxICsgXCJMXCIgKyByMCAqIGMxICsgXCIsXCIgKyByMCAqIHMxICsgXCJBXCIgKyByMCArIFwiLFwiICsgcjAgKyBcIiAwIFwiICsgZGYgKyBcIiwwIFwiICsgcjAgKiBjMCArIFwiLFwiICsgcjAgKiBzMCArIFwiWlwiIDogXCJNXCIgKyByMSAqIGMwICsgXCIsXCIgKyByMSAqIHMwICsgXCJBXCIgKyByMSArIFwiLFwiICsgcjEgKyBcIiAwIFwiICsgZGYgKyBcIiwxIFwiICsgcjEgKiBjMSArIFwiLFwiICsgcjEgKiBzMSArIFwiTDAsMFwiICsgXCJaXCI7XG4gICAgfVxuICAgIGFyYy5pbm5lclJhZGl1cyA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGlubmVyUmFkaXVzO1xuICAgICAgaW5uZXJSYWRpdXMgPSBkM19mdW5jdG9yKHYpO1xuICAgICAgcmV0dXJuIGFyYztcbiAgICB9O1xuICAgIGFyYy5vdXRlclJhZGl1cyA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG91dGVyUmFkaXVzO1xuICAgICAgb3V0ZXJSYWRpdXMgPSBkM19mdW5jdG9yKHYpO1xuICAgICAgcmV0dXJuIGFyYztcbiAgICB9O1xuICAgIGFyYy5zdGFydEFuZ2xlID0gZnVuY3Rpb24odikge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gc3RhcnRBbmdsZTtcbiAgICAgIHN0YXJ0QW5nbGUgPSBkM19mdW5jdG9yKHYpO1xuICAgICAgcmV0dXJuIGFyYztcbiAgICB9O1xuICAgIGFyYy5lbmRBbmdsZSA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGVuZEFuZ2xlO1xuICAgICAgZW5kQW5nbGUgPSBkM19mdW5jdG9yKHYpO1xuICAgICAgcmV0dXJuIGFyYztcbiAgICB9O1xuICAgIGFyYy5jZW50cm9pZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHIgPSAoaW5uZXJSYWRpdXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSArIG91dGVyUmFkaXVzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpIC8gMiwgYSA9IChzdGFydEFuZ2xlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgKyBlbmRBbmdsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKSAvIDIgKyBkM19zdmdfYXJjT2Zmc2V0O1xuICAgICAgcmV0dXJuIFsgTWF0aC5jb3MoYSkgKiByLCBNYXRoLnNpbihhKSAqIHIgXTtcbiAgICB9O1xuICAgIHJldHVybiBhcmM7XG4gIH07XG4gIHZhciBkM19zdmdfYXJjT2Zmc2V0ID0gLWhhbGbPgCwgZDNfc3ZnX2FyY01heCA9IM+EIC0gzrU7XG4gIGZ1bmN0aW9uIGQzX3N2Z19hcmNJbm5lclJhZGl1cyhkKSB7XG4gICAgcmV0dXJuIGQuaW5uZXJSYWRpdXM7XG4gIH1cbiAgZnVuY3Rpb24gZDNfc3ZnX2FyY091dGVyUmFkaXVzKGQpIHtcbiAgICByZXR1cm4gZC5vdXRlclJhZGl1cztcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfYXJjU3RhcnRBbmdsZShkKSB7XG4gICAgcmV0dXJuIGQuc3RhcnRBbmdsZTtcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfYXJjRW5kQW5nbGUoZCkge1xuICAgIHJldHVybiBkLmVuZEFuZ2xlO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3N2Z19saW5lKHByb2plY3Rpb24pIHtcbiAgICB2YXIgeCA9IGQzX2dlb21fcG9pbnRYLCB5ID0gZDNfZ2VvbV9wb2ludFksIGRlZmluZWQgPSBkM190cnVlLCBpbnRlcnBvbGF0ZSA9IGQzX3N2Z19saW5lTGluZWFyLCBpbnRlcnBvbGF0ZUtleSA9IGludGVycG9sYXRlLmtleSwgdGVuc2lvbiA9IC43O1xuICAgIGZ1bmN0aW9uIGxpbmUoZGF0YSkge1xuICAgICAgdmFyIHNlZ21lbnRzID0gW10sIHBvaW50cyA9IFtdLCBpID0gLTEsIG4gPSBkYXRhLmxlbmd0aCwgZCwgZnggPSBkM19mdW5jdG9yKHgpLCBmeSA9IGQzX2Z1bmN0b3IoeSk7XG4gICAgICBmdW5jdGlvbiBzZWdtZW50KCkge1xuICAgICAgICBzZWdtZW50cy5wdXNoKFwiTVwiLCBpbnRlcnBvbGF0ZShwcm9qZWN0aW9uKHBvaW50cyksIHRlbnNpb24pKTtcbiAgICAgIH1cbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIGlmIChkZWZpbmVkLmNhbGwodGhpcywgZCA9IGRhdGFbaV0sIGkpKSB7XG4gICAgICAgICAgcG9pbnRzLnB1c2goWyArZnguY2FsbCh0aGlzLCBkLCBpKSwgK2Z5LmNhbGwodGhpcywgZCwgaSkgXSk7XG4gICAgICAgIH0gZWxzZSBpZiAocG9pbnRzLmxlbmd0aCkge1xuICAgICAgICAgIHNlZ21lbnQoKTtcbiAgICAgICAgICBwb2ludHMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHBvaW50cy5sZW5ndGgpIHNlZ21lbnQoKTtcbiAgICAgIHJldHVybiBzZWdtZW50cy5sZW5ndGggPyBzZWdtZW50cy5qb2luKFwiXCIpIDogbnVsbDtcbiAgICB9XG4gICAgbGluZS54ID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geDtcbiAgICAgIHggPSBfO1xuICAgICAgcmV0dXJuIGxpbmU7XG4gICAgfTtcbiAgICBsaW5lLnkgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB5O1xuICAgICAgeSA9IF87XG4gICAgICByZXR1cm4gbGluZTtcbiAgICB9O1xuICAgIGxpbmUuZGVmaW5lZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRlZmluZWQ7XG4gICAgICBkZWZpbmVkID0gXztcbiAgICAgIHJldHVybiBsaW5lO1xuICAgIH07XG4gICAgbGluZS5pbnRlcnBvbGF0ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGludGVycG9sYXRlS2V5O1xuICAgICAgaWYgKHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIpIGludGVycG9sYXRlS2V5ID0gaW50ZXJwb2xhdGUgPSBfOyBlbHNlIGludGVycG9sYXRlS2V5ID0gKGludGVycG9sYXRlID0gZDNfc3ZnX2xpbmVJbnRlcnBvbGF0b3JzLmdldChfKSB8fCBkM19zdmdfbGluZUxpbmVhcikua2V5O1xuICAgICAgcmV0dXJuIGxpbmU7XG4gICAgfTtcbiAgICBsaW5lLnRlbnNpb24gPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0ZW5zaW9uO1xuICAgICAgdGVuc2lvbiA9IF87XG4gICAgICByZXR1cm4gbGluZTtcbiAgICB9O1xuICAgIHJldHVybiBsaW5lO1xuICB9XG4gIGQzLnN2Zy5saW5lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX3N2Z19saW5lKGQzX2lkZW50aXR5KTtcbiAgfTtcbiAgdmFyIGQzX3N2Z19saW5lSW50ZXJwb2xhdG9ycyA9IGQzLm1hcCh7XG4gICAgbGluZWFyOiBkM19zdmdfbGluZUxpbmVhcixcbiAgICBcImxpbmVhci1jbG9zZWRcIjogZDNfc3ZnX2xpbmVMaW5lYXJDbG9zZWQsXG4gICAgc3RlcDogZDNfc3ZnX2xpbmVTdGVwLFxuICAgIFwic3RlcC1iZWZvcmVcIjogZDNfc3ZnX2xpbmVTdGVwQmVmb3JlLFxuICAgIFwic3RlcC1hZnRlclwiOiBkM19zdmdfbGluZVN0ZXBBZnRlcixcbiAgICBiYXNpczogZDNfc3ZnX2xpbmVCYXNpcyxcbiAgICBcImJhc2lzLW9wZW5cIjogZDNfc3ZnX2xpbmVCYXNpc09wZW4sXG4gICAgXCJiYXNpcy1jbG9zZWRcIjogZDNfc3ZnX2xpbmVCYXNpc0Nsb3NlZCxcbiAgICBidW5kbGU6IGQzX3N2Z19saW5lQnVuZGxlLFxuICAgIGNhcmRpbmFsOiBkM19zdmdfbGluZUNhcmRpbmFsLFxuICAgIFwiY2FyZGluYWwtb3BlblwiOiBkM19zdmdfbGluZUNhcmRpbmFsT3BlbixcbiAgICBcImNhcmRpbmFsLWNsb3NlZFwiOiBkM19zdmdfbGluZUNhcmRpbmFsQ2xvc2VkLFxuICAgIG1vbm90b25lOiBkM19zdmdfbGluZU1vbm90b25lXG4gIH0pO1xuICBkM19zdmdfbGluZUludGVycG9sYXRvcnMuZm9yRWFjaChmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgdmFsdWUua2V5ID0ga2V5O1xuICAgIHZhbHVlLmNsb3NlZCA9IC8tY2xvc2VkJC8udGVzdChrZXkpO1xuICB9KTtcbiAgZnVuY3Rpb24gZDNfc3ZnX2xpbmVMaW5lYXIocG9pbnRzKSB7XG4gICAgcmV0dXJuIHBvaW50cy5qb2luKFwiTFwiKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfbGluZUxpbmVhckNsb3NlZChwb2ludHMpIHtcbiAgICByZXR1cm4gZDNfc3ZnX2xpbmVMaW5lYXIocG9pbnRzKSArIFwiWlwiO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3N2Z19saW5lU3RlcChwb2ludHMpIHtcbiAgICB2YXIgaSA9IDAsIG4gPSBwb2ludHMubGVuZ3RoLCBwID0gcG9pbnRzWzBdLCBwYXRoID0gWyBwWzBdLCBcIixcIiwgcFsxXSBdO1xuICAgIHdoaWxlICgrK2kgPCBuKSBwYXRoLnB1c2goXCJIXCIsIChwWzBdICsgKHAgPSBwb2ludHNbaV0pWzBdKSAvIDIsIFwiVlwiLCBwWzFdKTtcbiAgICBpZiAobiA+IDEpIHBhdGgucHVzaChcIkhcIiwgcFswXSk7XG4gICAgcmV0dXJuIHBhdGguam9pbihcIlwiKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfbGluZVN0ZXBCZWZvcmUocG9pbnRzKSB7XG4gICAgdmFyIGkgPSAwLCBuID0gcG9pbnRzLmxlbmd0aCwgcCA9IHBvaW50c1swXSwgcGF0aCA9IFsgcFswXSwgXCIsXCIsIHBbMV0gXTtcbiAgICB3aGlsZSAoKytpIDwgbikgcGF0aC5wdXNoKFwiVlwiLCAocCA9IHBvaW50c1tpXSlbMV0sIFwiSFwiLCBwWzBdKTtcbiAgICByZXR1cm4gcGF0aC5qb2luKFwiXCIpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3N2Z19saW5lU3RlcEFmdGVyKHBvaW50cykge1xuICAgIHZhciBpID0gMCwgbiA9IHBvaW50cy5sZW5ndGgsIHAgPSBwb2ludHNbMF0sIHBhdGggPSBbIHBbMF0sIFwiLFwiLCBwWzFdIF07XG4gICAgd2hpbGUgKCsraSA8IG4pIHBhdGgucHVzaChcIkhcIiwgKHAgPSBwb2ludHNbaV0pWzBdLCBcIlZcIiwgcFsxXSk7XG4gICAgcmV0dXJuIHBhdGguam9pbihcIlwiKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfbGluZUNhcmRpbmFsT3Blbihwb2ludHMsIHRlbnNpb24pIHtcbiAgICByZXR1cm4gcG9pbnRzLmxlbmd0aCA8IDQgPyBkM19zdmdfbGluZUxpbmVhcihwb2ludHMpIDogcG9pbnRzWzFdICsgZDNfc3ZnX2xpbmVIZXJtaXRlKHBvaW50cy5zbGljZSgxLCBwb2ludHMubGVuZ3RoIC0gMSksIGQzX3N2Z19saW5lQ2FyZGluYWxUYW5nZW50cyhwb2ludHMsIHRlbnNpb24pKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfbGluZUNhcmRpbmFsQ2xvc2VkKHBvaW50cywgdGVuc2lvbikge1xuICAgIHJldHVybiBwb2ludHMubGVuZ3RoIDwgMyA/IGQzX3N2Z19saW5lTGluZWFyKHBvaW50cykgOiBwb2ludHNbMF0gKyBkM19zdmdfbGluZUhlcm1pdGUoKHBvaW50cy5wdXNoKHBvaW50c1swXSksIFxuICAgIHBvaW50cyksIGQzX3N2Z19saW5lQ2FyZGluYWxUYW5nZW50cyhbIHBvaW50c1twb2ludHMubGVuZ3RoIC0gMl0gXS5jb25jYXQocG9pbnRzLCBbIHBvaW50c1sxXSBdKSwgdGVuc2lvbikpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3N2Z19saW5lQ2FyZGluYWwocG9pbnRzLCB0ZW5zaW9uKSB7XG4gICAgcmV0dXJuIHBvaW50cy5sZW5ndGggPCAzID8gZDNfc3ZnX2xpbmVMaW5lYXIocG9pbnRzKSA6IHBvaW50c1swXSArIGQzX3N2Z19saW5lSGVybWl0ZShwb2ludHMsIGQzX3N2Z19saW5lQ2FyZGluYWxUYW5nZW50cyhwb2ludHMsIHRlbnNpb24pKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfbGluZUhlcm1pdGUocG9pbnRzLCB0YW5nZW50cykge1xuICAgIGlmICh0YW5nZW50cy5sZW5ndGggPCAxIHx8IHBvaW50cy5sZW5ndGggIT0gdGFuZ2VudHMubGVuZ3RoICYmIHBvaW50cy5sZW5ndGggIT0gdGFuZ2VudHMubGVuZ3RoICsgMikge1xuICAgICAgcmV0dXJuIGQzX3N2Z19saW5lTGluZWFyKHBvaW50cyk7XG4gICAgfVxuICAgIHZhciBxdWFkID0gcG9pbnRzLmxlbmd0aCAhPSB0YW5nZW50cy5sZW5ndGgsIHBhdGggPSBcIlwiLCBwMCA9IHBvaW50c1swXSwgcCA9IHBvaW50c1sxXSwgdDAgPSB0YW5nZW50c1swXSwgdCA9IHQwLCBwaSA9IDE7XG4gICAgaWYgKHF1YWQpIHtcbiAgICAgIHBhdGggKz0gXCJRXCIgKyAocFswXSAtIHQwWzBdICogMiAvIDMpICsgXCIsXCIgKyAocFsxXSAtIHQwWzFdICogMiAvIDMpICsgXCIsXCIgKyBwWzBdICsgXCIsXCIgKyBwWzFdO1xuICAgICAgcDAgPSBwb2ludHNbMV07XG4gICAgICBwaSA9IDI7XG4gICAgfVxuICAgIGlmICh0YW5nZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICB0ID0gdGFuZ2VudHNbMV07XG4gICAgICBwID0gcG9pbnRzW3BpXTtcbiAgICAgIHBpKys7XG4gICAgICBwYXRoICs9IFwiQ1wiICsgKHAwWzBdICsgdDBbMF0pICsgXCIsXCIgKyAocDBbMV0gKyB0MFsxXSkgKyBcIixcIiArIChwWzBdIC0gdFswXSkgKyBcIixcIiArIChwWzFdIC0gdFsxXSkgKyBcIixcIiArIHBbMF0gKyBcIixcIiArIHBbMV07XG4gICAgICBmb3IgKHZhciBpID0gMjsgaSA8IHRhbmdlbnRzLmxlbmd0aDsgaSsrLCBwaSsrKSB7XG4gICAgICAgIHAgPSBwb2ludHNbcGldO1xuICAgICAgICB0ID0gdGFuZ2VudHNbaV07XG4gICAgICAgIHBhdGggKz0gXCJTXCIgKyAocFswXSAtIHRbMF0pICsgXCIsXCIgKyAocFsxXSAtIHRbMV0pICsgXCIsXCIgKyBwWzBdICsgXCIsXCIgKyBwWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocXVhZCkge1xuICAgICAgdmFyIGxwID0gcG9pbnRzW3BpXTtcbiAgICAgIHBhdGggKz0gXCJRXCIgKyAocFswXSArIHRbMF0gKiAyIC8gMykgKyBcIixcIiArIChwWzFdICsgdFsxXSAqIDIgLyAzKSArIFwiLFwiICsgbHBbMF0gKyBcIixcIiArIGxwWzFdO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfbGluZUNhcmRpbmFsVGFuZ2VudHMocG9pbnRzLCB0ZW5zaW9uKSB7XG4gICAgdmFyIHRhbmdlbnRzID0gW10sIGEgPSAoMSAtIHRlbnNpb24pIC8gMiwgcDAsIHAxID0gcG9pbnRzWzBdLCBwMiA9IHBvaW50c1sxXSwgaSA9IDEsIG4gPSBwb2ludHMubGVuZ3RoO1xuICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICBwMCA9IHAxO1xuICAgICAgcDEgPSBwMjtcbiAgICAgIHAyID0gcG9pbnRzW2ldO1xuICAgICAgdGFuZ2VudHMucHVzaChbIGEgKiAocDJbMF0gLSBwMFswXSksIGEgKiAocDJbMV0gLSBwMFsxXSkgXSk7XG4gICAgfVxuICAgIHJldHVybiB0YW5nZW50cztcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfbGluZUJhc2lzKHBvaW50cykge1xuICAgIGlmIChwb2ludHMubGVuZ3RoIDwgMykgcmV0dXJuIGQzX3N2Z19saW5lTGluZWFyKHBvaW50cyk7XG4gICAgdmFyIGkgPSAxLCBuID0gcG9pbnRzLmxlbmd0aCwgcGkgPSBwb2ludHNbMF0sIHgwID0gcGlbMF0sIHkwID0gcGlbMV0sIHB4ID0gWyB4MCwgeDAsIHgwLCAocGkgPSBwb2ludHNbMV0pWzBdIF0sIHB5ID0gWyB5MCwgeTAsIHkwLCBwaVsxXSBdLCBwYXRoID0gWyB4MCwgXCIsXCIsIHkwLCBcIkxcIiwgZDNfc3ZnX2xpbmVEb3Q0KGQzX3N2Z19saW5lQmFzaXNCZXppZXIzLCBweCksIFwiLFwiLCBkM19zdmdfbGluZURvdDQoZDNfc3ZnX2xpbmVCYXNpc0JlemllcjMsIHB5KSBdO1xuICAgIHBvaW50cy5wdXNoKHBvaW50c1tuIC0gMV0pO1xuICAgIHdoaWxlICgrK2kgPD0gbikge1xuICAgICAgcGkgPSBwb2ludHNbaV07XG4gICAgICBweC5zaGlmdCgpO1xuICAgICAgcHgucHVzaChwaVswXSk7XG4gICAgICBweS5zaGlmdCgpO1xuICAgICAgcHkucHVzaChwaVsxXSk7XG4gICAgICBkM19zdmdfbGluZUJhc2lzQmV6aWVyKHBhdGgsIHB4LCBweSk7XG4gICAgfVxuICAgIHBvaW50cy5wb3AoKTtcbiAgICBwYXRoLnB1c2goXCJMXCIsIHBpKTtcbiAgICByZXR1cm4gcGF0aC5qb2luKFwiXCIpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3N2Z19saW5lQmFzaXNPcGVuKHBvaW50cykge1xuICAgIGlmIChwb2ludHMubGVuZ3RoIDwgNCkgcmV0dXJuIGQzX3N2Z19saW5lTGluZWFyKHBvaW50cyk7XG4gICAgdmFyIHBhdGggPSBbXSwgaSA9IC0xLCBuID0gcG9pbnRzLmxlbmd0aCwgcGksIHB4ID0gWyAwIF0sIHB5ID0gWyAwIF07XG4gICAgd2hpbGUgKCsraSA8IDMpIHtcbiAgICAgIHBpID0gcG9pbnRzW2ldO1xuICAgICAgcHgucHVzaChwaVswXSk7XG4gICAgICBweS5wdXNoKHBpWzFdKTtcbiAgICB9XG4gICAgcGF0aC5wdXNoKGQzX3N2Z19saW5lRG90NChkM19zdmdfbGluZUJhc2lzQmV6aWVyMywgcHgpICsgXCIsXCIgKyBkM19zdmdfbGluZURvdDQoZDNfc3ZnX2xpbmVCYXNpc0JlemllcjMsIHB5KSk7XG4gICAgLS1pO1xuICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICBwaSA9IHBvaW50c1tpXTtcbiAgICAgIHB4LnNoaWZ0KCk7XG4gICAgICBweC5wdXNoKHBpWzBdKTtcbiAgICAgIHB5LnNoaWZ0KCk7XG4gICAgICBweS5wdXNoKHBpWzFdKTtcbiAgICAgIGQzX3N2Z19saW5lQmFzaXNCZXppZXIocGF0aCwgcHgsIHB5KTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGguam9pbihcIlwiKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfbGluZUJhc2lzQ2xvc2VkKHBvaW50cykge1xuICAgIHZhciBwYXRoLCBpID0gLTEsIG4gPSBwb2ludHMubGVuZ3RoLCBtID0gbiArIDQsIHBpLCBweCA9IFtdLCBweSA9IFtdO1xuICAgIHdoaWxlICgrK2kgPCA0KSB7XG4gICAgICBwaSA9IHBvaW50c1tpICUgbl07XG4gICAgICBweC5wdXNoKHBpWzBdKTtcbiAgICAgIHB5LnB1c2gocGlbMV0pO1xuICAgIH1cbiAgICBwYXRoID0gWyBkM19zdmdfbGluZURvdDQoZDNfc3ZnX2xpbmVCYXNpc0JlemllcjMsIHB4KSwgXCIsXCIsIGQzX3N2Z19saW5lRG90NChkM19zdmdfbGluZUJhc2lzQmV6aWVyMywgcHkpIF07XG4gICAgLS1pO1xuICAgIHdoaWxlICgrK2kgPCBtKSB7XG4gICAgICBwaSA9IHBvaW50c1tpICUgbl07XG4gICAgICBweC5zaGlmdCgpO1xuICAgICAgcHgucHVzaChwaVswXSk7XG4gICAgICBweS5zaGlmdCgpO1xuICAgICAgcHkucHVzaChwaVsxXSk7XG4gICAgICBkM19zdmdfbGluZUJhc2lzQmV6aWVyKHBhdGgsIHB4LCBweSk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLmpvaW4oXCJcIik7XG4gIH1cbiAgZnVuY3Rpb24gZDNfc3ZnX2xpbmVCdW5kbGUocG9pbnRzLCB0ZW5zaW9uKSB7XG4gICAgdmFyIG4gPSBwb2ludHMubGVuZ3RoIC0gMTtcbiAgICBpZiAobikge1xuICAgICAgdmFyIHgwID0gcG9pbnRzWzBdWzBdLCB5MCA9IHBvaW50c1swXVsxXSwgZHggPSBwb2ludHNbbl1bMF0gLSB4MCwgZHkgPSBwb2ludHNbbl1bMV0gLSB5MCwgaSA9IC0xLCBwLCB0O1xuICAgICAgd2hpbGUgKCsraSA8PSBuKSB7XG4gICAgICAgIHAgPSBwb2ludHNbaV07XG4gICAgICAgIHQgPSBpIC8gbjtcbiAgICAgICAgcFswXSA9IHRlbnNpb24gKiBwWzBdICsgKDEgLSB0ZW5zaW9uKSAqICh4MCArIHQgKiBkeCk7XG4gICAgICAgIHBbMV0gPSB0ZW5zaW9uICogcFsxXSArICgxIC0gdGVuc2lvbikgKiAoeTAgKyB0ICogZHkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZDNfc3ZnX2xpbmVCYXNpcyhwb2ludHMpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3N2Z19saW5lRG90NChhLCBiKSB7XG4gICAgcmV0dXJuIGFbMF0gKiBiWzBdICsgYVsxXSAqIGJbMV0gKyBhWzJdICogYlsyXSArIGFbM10gKiBiWzNdO1xuICB9XG4gIHZhciBkM19zdmdfbGluZUJhc2lzQmV6aWVyMSA9IFsgMCwgMiAvIDMsIDEgLyAzLCAwIF0sIGQzX3N2Z19saW5lQmFzaXNCZXppZXIyID0gWyAwLCAxIC8gMywgMiAvIDMsIDAgXSwgZDNfc3ZnX2xpbmVCYXNpc0JlemllcjMgPSBbIDAsIDEgLyA2LCAyIC8gMywgMSAvIDYgXTtcbiAgZnVuY3Rpb24gZDNfc3ZnX2xpbmVCYXNpc0JlemllcihwYXRoLCB4LCB5KSB7XG4gICAgcGF0aC5wdXNoKFwiQ1wiLCBkM19zdmdfbGluZURvdDQoZDNfc3ZnX2xpbmVCYXNpc0JlemllcjEsIHgpLCBcIixcIiwgZDNfc3ZnX2xpbmVEb3Q0KGQzX3N2Z19saW5lQmFzaXNCZXppZXIxLCB5KSwgXCIsXCIsIGQzX3N2Z19saW5lRG90NChkM19zdmdfbGluZUJhc2lzQmV6aWVyMiwgeCksIFwiLFwiLCBkM19zdmdfbGluZURvdDQoZDNfc3ZnX2xpbmVCYXNpc0JlemllcjIsIHkpLCBcIixcIiwgZDNfc3ZnX2xpbmVEb3Q0KGQzX3N2Z19saW5lQmFzaXNCZXppZXIzLCB4KSwgXCIsXCIsIGQzX3N2Z19saW5lRG90NChkM19zdmdfbGluZUJhc2lzQmV6aWVyMywgeSkpO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3N2Z19saW5lU2xvcGUocDAsIHAxKSB7XG4gICAgcmV0dXJuIChwMVsxXSAtIHAwWzFdKSAvIChwMVswXSAtIHAwWzBdKTtcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfbGluZUZpbml0ZURpZmZlcmVuY2VzKHBvaW50cykge1xuICAgIHZhciBpID0gMCwgaiA9IHBvaW50cy5sZW5ndGggLSAxLCBtID0gW10sIHAwID0gcG9pbnRzWzBdLCBwMSA9IHBvaW50c1sxXSwgZCA9IG1bMF0gPSBkM19zdmdfbGluZVNsb3BlKHAwLCBwMSk7XG4gICAgd2hpbGUgKCsraSA8IGopIHtcbiAgICAgIG1baV0gPSAoZCArIChkID0gZDNfc3ZnX2xpbmVTbG9wZShwMCA9IHAxLCBwMSA9IHBvaW50c1tpICsgMV0pKSkgLyAyO1xuICAgIH1cbiAgICBtW2ldID0gZDtcbiAgICByZXR1cm4gbTtcbiAgfVxuICBmdW5jdGlvbiBkM19zdmdfbGluZU1vbm90b25lVGFuZ2VudHMocG9pbnRzKSB7XG4gICAgdmFyIHRhbmdlbnRzID0gW10sIGQsIGEsIGIsIHMsIG0gPSBkM19zdmdfbGluZUZpbml0ZURpZmZlcmVuY2VzKHBvaW50cyksIGkgPSAtMSwgaiA9IHBvaW50cy5sZW5ndGggLSAxO1xuICAgIHdoaWxlICgrK2kgPCBqKSB7XG4gICAgICBkID0gZDNfc3ZnX2xpbmVTbG9wZShwb2ludHNbaV0sIHBvaW50c1tpICsgMV0pO1xuICAgICAgaWYgKGFicyhkKSA8IM61KSB7XG4gICAgICAgIG1baV0gPSBtW2kgKyAxXSA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhID0gbVtpXSAvIGQ7XG4gICAgICAgIGIgPSBtW2kgKyAxXSAvIGQ7XG4gICAgICAgIHMgPSBhICogYSArIGIgKiBiO1xuICAgICAgICBpZiAocyA+IDkpIHtcbiAgICAgICAgICBzID0gZCAqIDMgLyBNYXRoLnNxcnQocyk7XG4gICAgICAgICAgbVtpXSA9IHMgKiBhO1xuICAgICAgICAgIG1baSArIDFdID0gcyAqIGI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaSA9IC0xO1xuICAgIHdoaWxlICgrK2kgPD0gaikge1xuICAgICAgcyA9IChwb2ludHNbTWF0aC5taW4oaiwgaSArIDEpXVswXSAtIHBvaW50c1tNYXRoLm1heCgwLCBpIC0gMSldWzBdKSAvICg2ICogKDEgKyBtW2ldICogbVtpXSkpO1xuICAgICAgdGFuZ2VudHMucHVzaChbIHMgfHwgMCwgbVtpXSAqIHMgfHwgMCBdKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhbmdlbnRzO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3N2Z19saW5lTW9ub3RvbmUocG9pbnRzKSB7XG4gICAgcmV0dXJuIHBvaW50cy5sZW5ndGggPCAzID8gZDNfc3ZnX2xpbmVMaW5lYXIocG9pbnRzKSA6IHBvaW50c1swXSArIGQzX3N2Z19saW5lSGVybWl0ZShwb2ludHMsIGQzX3N2Z19saW5lTW9ub3RvbmVUYW5nZW50cyhwb2ludHMpKTtcbiAgfVxuICBkMy5zdmcubGluZS5yYWRpYWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGluZSA9IGQzX3N2Z19saW5lKGQzX3N2Z19saW5lUmFkaWFsKTtcbiAgICBsaW5lLnJhZGl1cyA9IGxpbmUueCwgZGVsZXRlIGxpbmUueDtcbiAgICBsaW5lLmFuZ2xlID0gbGluZS55LCBkZWxldGUgbGluZS55O1xuICAgIHJldHVybiBsaW5lO1xuICB9O1xuICBmdW5jdGlvbiBkM19zdmdfbGluZVJhZGlhbChwb2ludHMpIHtcbiAgICB2YXIgcG9pbnQsIGkgPSAtMSwgbiA9IHBvaW50cy5sZW5ndGgsIHIsIGE7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIHBvaW50ID0gcG9pbnRzW2ldO1xuICAgICAgciA9IHBvaW50WzBdO1xuICAgICAgYSA9IHBvaW50WzFdICsgZDNfc3ZnX2FyY09mZnNldDtcbiAgICAgIHBvaW50WzBdID0gciAqIE1hdGguY29zKGEpO1xuICAgICAgcG9pbnRbMV0gPSByICogTWF0aC5zaW4oYSk7XG4gICAgfVxuICAgIHJldHVybiBwb2ludHM7XG4gIH1cbiAgZnVuY3Rpb24gZDNfc3ZnX2FyZWEocHJvamVjdGlvbikge1xuICAgIHZhciB4MCA9IGQzX2dlb21fcG9pbnRYLCB4MSA9IGQzX2dlb21fcG9pbnRYLCB5MCA9IDAsIHkxID0gZDNfZ2VvbV9wb2ludFksIGRlZmluZWQgPSBkM190cnVlLCBpbnRlcnBvbGF0ZSA9IGQzX3N2Z19saW5lTGluZWFyLCBpbnRlcnBvbGF0ZUtleSA9IGludGVycG9sYXRlLmtleSwgaW50ZXJwb2xhdGVSZXZlcnNlID0gaW50ZXJwb2xhdGUsIEwgPSBcIkxcIiwgdGVuc2lvbiA9IC43O1xuICAgIGZ1bmN0aW9uIGFyZWEoZGF0YSkge1xuICAgICAgdmFyIHNlZ21lbnRzID0gW10sIHBvaW50czAgPSBbXSwgcG9pbnRzMSA9IFtdLCBpID0gLTEsIG4gPSBkYXRhLmxlbmd0aCwgZCwgZngwID0gZDNfZnVuY3Rvcih4MCksIGZ5MCA9IGQzX2Z1bmN0b3IoeTApLCBmeDEgPSB4MCA9PT0geDEgPyBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgICB9IDogZDNfZnVuY3Rvcih4MSksIGZ5MSA9IHkwID09PSB5MSA/IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4geTtcbiAgICAgIH0gOiBkM19mdW5jdG9yKHkxKSwgeCwgeTtcbiAgICAgIGZ1bmN0aW9uIHNlZ21lbnQoKSB7XG4gICAgICAgIHNlZ21lbnRzLnB1c2goXCJNXCIsIGludGVycG9sYXRlKHByb2plY3Rpb24ocG9pbnRzMSksIHRlbnNpb24pLCBMLCBpbnRlcnBvbGF0ZVJldmVyc2UocHJvamVjdGlvbihwb2ludHMwLnJldmVyc2UoKSksIHRlbnNpb24pLCBcIlpcIik7XG4gICAgICB9XG4gICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICBpZiAoZGVmaW5lZC5jYWxsKHRoaXMsIGQgPSBkYXRhW2ldLCBpKSkge1xuICAgICAgICAgIHBvaW50czAucHVzaChbIHggPSArZngwLmNhbGwodGhpcywgZCwgaSksIHkgPSArZnkwLmNhbGwodGhpcywgZCwgaSkgXSk7XG4gICAgICAgICAgcG9pbnRzMS5wdXNoKFsgK2Z4MS5jYWxsKHRoaXMsIGQsIGkpLCArZnkxLmNhbGwodGhpcywgZCwgaSkgXSk7XG4gICAgICAgIH0gZWxzZSBpZiAocG9pbnRzMC5sZW5ndGgpIHtcbiAgICAgICAgICBzZWdtZW50KCk7XG4gICAgICAgICAgcG9pbnRzMCA9IFtdO1xuICAgICAgICAgIHBvaW50czEgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHBvaW50czAubGVuZ3RoKSBzZWdtZW50KCk7XG4gICAgICByZXR1cm4gc2VnbWVudHMubGVuZ3RoID8gc2VnbWVudHMuam9pbihcIlwiKSA6IG51bGw7XG4gICAgfVxuICAgIGFyZWEueCA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHgxO1xuICAgICAgeDAgPSB4MSA9IF87XG4gICAgICByZXR1cm4gYXJlYTtcbiAgICB9O1xuICAgIGFyZWEueDAgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB4MDtcbiAgICAgIHgwID0gXztcbiAgICAgIHJldHVybiBhcmVhO1xuICAgIH07XG4gICAgYXJlYS54MSA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHgxO1xuICAgICAgeDEgPSBfO1xuICAgICAgcmV0dXJuIGFyZWE7XG4gICAgfTtcbiAgICBhcmVhLnkgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB5MTtcbiAgICAgIHkwID0geTEgPSBfO1xuICAgICAgcmV0dXJuIGFyZWE7XG4gICAgfTtcbiAgICBhcmVhLnkwID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geTA7XG4gICAgICB5MCA9IF87XG4gICAgICByZXR1cm4gYXJlYTtcbiAgICB9O1xuICAgIGFyZWEueTEgPSBmdW5jdGlvbihfKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB5MTtcbiAgICAgIHkxID0gXztcbiAgICAgIHJldHVybiBhcmVhO1xuICAgIH07XG4gICAgYXJlYS5kZWZpbmVkID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZGVmaW5lZDtcbiAgICAgIGRlZmluZWQgPSBfO1xuICAgICAgcmV0dXJuIGFyZWE7XG4gICAgfTtcbiAgICBhcmVhLmludGVycG9sYXRlID0gZnVuY3Rpb24oXykge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaW50ZXJwb2xhdGVLZXk7XG4gICAgICBpZiAodHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIikgaW50ZXJwb2xhdGVLZXkgPSBpbnRlcnBvbGF0ZSA9IF87IGVsc2UgaW50ZXJwb2xhdGVLZXkgPSAoaW50ZXJwb2xhdGUgPSBkM19zdmdfbGluZUludGVycG9sYXRvcnMuZ2V0KF8pIHx8IGQzX3N2Z19saW5lTGluZWFyKS5rZXk7XG4gICAgICBpbnRlcnBvbGF0ZVJldmVyc2UgPSBpbnRlcnBvbGF0ZS5yZXZlcnNlIHx8IGludGVycG9sYXRlO1xuICAgICAgTCA9IGludGVycG9sYXRlLmNsb3NlZCA/IFwiTVwiIDogXCJMXCI7XG4gICAgICByZXR1cm4gYXJlYTtcbiAgICB9O1xuICAgIGFyZWEudGVuc2lvbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRlbnNpb247XG4gICAgICB0ZW5zaW9uID0gXztcbiAgICAgIHJldHVybiBhcmVhO1xuICAgIH07XG4gICAgcmV0dXJuIGFyZWE7XG4gIH1cbiAgZDNfc3ZnX2xpbmVTdGVwQmVmb3JlLnJldmVyc2UgPSBkM19zdmdfbGluZVN0ZXBBZnRlcjtcbiAgZDNfc3ZnX2xpbmVTdGVwQWZ0ZXIucmV2ZXJzZSA9IGQzX3N2Z19saW5lU3RlcEJlZm9yZTtcbiAgZDMuc3ZnLmFyZWEgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZDNfc3ZnX2FyZWEoZDNfaWRlbnRpdHkpO1xuICB9O1xuICBkMy5zdmcuYXJlYS5yYWRpYWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJlYSA9IGQzX3N2Z19hcmVhKGQzX3N2Z19saW5lUmFkaWFsKTtcbiAgICBhcmVhLnJhZGl1cyA9IGFyZWEueCwgZGVsZXRlIGFyZWEueDtcbiAgICBhcmVhLmlubmVyUmFkaXVzID0gYXJlYS54MCwgZGVsZXRlIGFyZWEueDA7XG4gICAgYXJlYS5vdXRlclJhZGl1cyA9IGFyZWEueDEsIGRlbGV0ZSBhcmVhLngxO1xuICAgIGFyZWEuYW5nbGUgPSBhcmVhLnksIGRlbGV0ZSBhcmVhLnk7XG4gICAgYXJlYS5zdGFydEFuZ2xlID0gYXJlYS55MCwgZGVsZXRlIGFyZWEueTA7XG4gICAgYXJlYS5lbmRBbmdsZSA9IGFyZWEueTEsIGRlbGV0ZSBhcmVhLnkxO1xuICAgIHJldHVybiBhcmVhO1xuICB9O1xuICBkMy5zdmcuY2hvcmQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc291cmNlID0gZDNfc291cmNlLCB0YXJnZXQgPSBkM190YXJnZXQsIHJhZGl1cyA9IGQzX3N2Z19jaG9yZFJhZGl1cywgc3RhcnRBbmdsZSA9IGQzX3N2Z19hcmNTdGFydEFuZ2xlLCBlbmRBbmdsZSA9IGQzX3N2Z19hcmNFbmRBbmdsZTtcbiAgICBmdW5jdGlvbiBjaG9yZChkLCBpKSB7XG4gICAgICB2YXIgcyA9IHN1Ymdyb3VwKHRoaXMsIHNvdXJjZSwgZCwgaSksIHQgPSBzdWJncm91cCh0aGlzLCB0YXJnZXQsIGQsIGkpO1xuICAgICAgcmV0dXJuIFwiTVwiICsgcy5wMCArIGFyYyhzLnIsIHMucDEsIHMuYTEgLSBzLmEwKSArIChlcXVhbHMocywgdCkgPyBjdXJ2ZShzLnIsIHMucDEsIHMuciwgcy5wMCkgOiBjdXJ2ZShzLnIsIHMucDEsIHQuciwgdC5wMCkgKyBhcmModC5yLCB0LnAxLCB0LmExIC0gdC5hMCkgKyBjdXJ2ZSh0LnIsIHQucDEsIHMuciwgcy5wMCkpICsgXCJaXCI7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHN1Ymdyb3VwKHNlbGYsIGYsIGQsIGkpIHtcbiAgICAgIHZhciBzdWJncm91cCA9IGYuY2FsbChzZWxmLCBkLCBpKSwgciA9IHJhZGl1cy5jYWxsKHNlbGYsIHN1Ymdyb3VwLCBpKSwgYTAgPSBzdGFydEFuZ2xlLmNhbGwoc2VsZiwgc3ViZ3JvdXAsIGkpICsgZDNfc3ZnX2FyY09mZnNldCwgYTEgPSBlbmRBbmdsZS5jYWxsKHNlbGYsIHN1Ymdyb3VwLCBpKSArIGQzX3N2Z19hcmNPZmZzZXQ7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByOiByLFxuICAgICAgICBhMDogYTAsXG4gICAgICAgIGExOiBhMSxcbiAgICAgICAgcDA6IFsgciAqIE1hdGguY29zKGEwKSwgciAqIE1hdGguc2luKGEwKSBdLFxuICAgICAgICBwMTogWyByICogTWF0aC5jb3MoYTEpLCByICogTWF0aC5zaW4oYTEpIF1cbiAgICAgIH07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGVxdWFscyhhLCBiKSB7XG4gICAgICByZXR1cm4gYS5hMCA9PSBiLmEwICYmIGEuYTEgPT0gYi5hMTtcbiAgICB9XG4gICAgZnVuY3Rpb24gYXJjKHIsIHAsIGEpIHtcbiAgICAgIHJldHVybiBcIkFcIiArIHIgKyBcIixcIiArIHIgKyBcIiAwIFwiICsgKyhhID4gz4ApICsgXCIsMSBcIiArIHA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGN1cnZlKHIwLCBwMCwgcjEsIHAxKSB7XG4gICAgICByZXR1cm4gXCJRIDAsMCBcIiArIHAxO1xuICAgIH1cbiAgICBjaG9yZC5yYWRpdXMgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiByYWRpdXM7XG4gICAgICByYWRpdXMgPSBkM19mdW5jdG9yKHYpO1xuICAgICAgcmV0dXJuIGNob3JkO1xuICAgIH07XG4gICAgY2hvcmQuc291cmNlID0gZnVuY3Rpb24odikge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gc291cmNlO1xuICAgICAgc291cmNlID0gZDNfZnVuY3Rvcih2KTtcbiAgICAgIHJldHVybiBjaG9yZDtcbiAgICB9O1xuICAgIGNob3JkLnRhcmdldCA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRhcmdldDtcbiAgICAgIHRhcmdldCA9IGQzX2Z1bmN0b3Iodik7XG4gICAgICByZXR1cm4gY2hvcmQ7XG4gICAgfTtcbiAgICBjaG9yZC5zdGFydEFuZ2xlID0gZnVuY3Rpb24odikge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gc3RhcnRBbmdsZTtcbiAgICAgIHN0YXJ0QW5nbGUgPSBkM19mdW5jdG9yKHYpO1xuICAgICAgcmV0dXJuIGNob3JkO1xuICAgIH07XG4gICAgY2hvcmQuZW5kQW5nbGUgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBlbmRBbmdsZTtcbiAgICAgIGVuZEFuZ2xlID0gZDNfZnVuY3Rvcih2KTtcbiAgICAgIHJldHVybiBjaG9yZDtcbiAgICB9O1xuICAgIHJldHVybiBjaG9yZDtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfc3ZnX2Nob3JkUmFkaXVzKGQpIHtcbiAgICByZXR1cm4gZC5yYWRpdXM7XG4gIH1cbiAgZDMuc3ZnLmRpYWdvbmFsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNvdXJjZSA9IGQzX3NvdXJjZSwgdGFyZ2V0ID0gZDNfdGFyZ2V0LCBwcm9qZWN0aW9uID0gZDNfc3ZnX2RpYWdvbmFsUHJvamVjdGlvbjtcbiAgICBmdW5jdGlvbiBkaWFnb25hbChkLCBpKSB7XG4gICAgICB2YXIgcDAgPSBzb3VyY2UuY2FsbCh0aGlzLCBkLCBpKSwgcDMgPSB0YXJnZXQuY2FsbCh0aGlzLCBkLCBpKSwgbSA9IChwMC55ICsgcDMueSkgLyAyLCBwID0gWyBwMCwge1xuICAgICAgICB4OiBwMC54LFxuICAgICAgICB5OiBtXG4gICAgICB9LCB7XG4gICAgICAgIHg6IHAzLngsXG4gICAgICAgIHk6IG1cbiAgICAgIH0sIHAzIF07XG4gICAgICBwID0gcC5tYXAocHJvamVjdGlvbik7XG4gICAgICByZXR1cm4gXCJNXCIgKyBwWzBdICsgXCJDXCIgKyBwWzFdICsgXCIgXCIgKyBwWzJdICsgXCIgXCIgKyBwWzNdO1xuICAgIH1cbiAgICBkaWFnb25hbC5zb3VyY2UgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBzb3VyY2U7XG4gICAgICBzb3VyY2UgPSBkM19mdW5jdG9yKHgpO1xuICAgICAgcmV0dXJuIGRpYWdvbmFsO1xuICAgIH07XG4gICAgZGlhZ29uYWwudGFyZ2V0ID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGFyZ2V0O1xuICAgICAgdGFyZ2V0ID0gZDNfZnVuY3Rvcih4KTtcbiAgICAgIHJldHVybiBkaWFnb25hbDtcbiAgICB9O1xuICAgIGRpYWdvbmFsLnByb2plY3Rpb24gPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBwcm9qZWN0aW9uO1xuICAgICAgcHJvamVjdGlvbiA9IHg7XG4gICAgICByZXR1cm4gZGlhZ29uYWw7XG4gICAgfTtcbiAgICByZXR1cm4gZGlhZ29uYWw7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3N2Z19kaWFnb25hbFByb2plY3Rpb24oZCkge1xuICAgIHJldHVybiBbIGQueCwgZC55IF07XG4gIH1cbiAgZDMuc3ZnLmRpYWdvbmFsLnJhZGlhbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBkaWFnb25hbCA9IGQzLnN2Zy5kaWFnb25hbCgpLCBwcm9qZWN0aW9uID0gZDNfc3ZnX2RpYWdvbmFsUHJvamVjdGlvbiwgcHJvamVjdGlvbl8gPSBkaWFnb25hbC5wcm9qZWN0aW9uO1xuICAgIGRpYWdvbmFsLnByb2plY3Rpb24gPSBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IHByb2plY3Rpb25fKGQzX3N2Z19kaWFnb25hbFJhZGlhbFByb2plY3Rpb24ocHJvamVjdGlvbiA9IHgpKSA6IHByb2plY3Rpb247XG4gICAgfTtcbiAgICByZXR1cm4gZGlhZ29uYWw7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3N2Z19kaWFnb25hbFJhZGlhbFByb2plY3Rpb24ocHJvamVjdGlvbikge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBkID0gcHJvamVjdGlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpLCByID0gZFswXSwgYSA9IGRbMV0gKyBkM19zdmdfYXJjT2Zmc2V0O1xuICAgICAgcmV0dXJuIFsgciAqIE1hdGguY29zKGEpLCByICogTWF0aC5zaW4oYSkgXTtcbiAgICB9O1xuICB9XG4gIGQzLnN2Zy5zeW1ib2wgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdHlwZSA9IGQzX3N2Z19zeW1ib2xUeXBlLCBzaXplID0gZDNfc3ZnX3N5bWJvbFNpemU7XG4gICAgZnVuY3Rpb24gc3ltYm9sKGQsIGkpIHtcbiAgICAgIHJldHVybiAoZDNfc3ZnX3N5bWJvbHMuZ2V0KHR5cGUuY2FsbCh0aGlzLCBkLCBpKSkgfHwgZDNfc3ZnX3N5bWJvbENpcmNsZSkoc2l6ZS5jYWxsKHRoaXMsIGQsIGkpKTtcbiAgICB9XG4gICAgc3ltYm9sLnR5cGUgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0eXBlO1xuICAgICAgdHlwZSA9IGQzX2Z1bmN0b3IoeCk7XG4gICAgICByZXR1cm4gc3ltYm9sO1xuICAgIH07XG4gICAgc3ltYm9sLnNpemUgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBzaXplO1xuICAgICAgc2l6ZSA9IGQzX2Z1bmN0b3IoeCk7XG4gICAgICByZXR1cm4gc3ltYm9sO1xuICAgIH07XG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfc3ZnX3N5bWJvbFNpemUoKSB7XG4gICAgcmV0dXJuIDY0O1xuICB9XG4gIGZ1bmN0aW9uIGQzX3N2Z19zeW1ib2xUeXBlKCkge1xuICAgIHJldHVybiBcImNpcmNsZVwiO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3N2Z19zeW1ib2xDaXJjbGUoc2l6ZSkge1xuICAgIHZhciByID0gTWF0aC5zcXJ0KHNpemUgLyDPgCk7XG4gICAgcmV0dXJuIFwiTTAsXCIgKyByICsgXCJBXCIgKyByICsgXCIsXCIgKyByICsgXCIgMCAxLDEgMCxcIiArIC1yICsgXCJBXCIgKyByICsgXCIsXCIgKyByICsgXCIgMCAxLDEgMCxcIiArIHIgKyBcIlpcIjtcbiAgfVxuICB2YXIgZDNfc3ZnX3N5bWJvbHMgPSBkMy5tYXAoe1xuICAgIGNpcmNsZTogZDNfc3ZnX3N5bWJvbENpcmNsZSxcbiAgICBjcm9zczogZnVuY3Rpb24oc2l6ZSkge1xuICAgICAgdmFyIHIgPSBNYXRoLnNxcnQoc2l6ZSAvIDUpIC8gMjtcbiAgICAgIHJldHVybiBcIk1cIiArIC0zICogciArIFwiLFwiICsgLXIgKyBcIkhcIiArIC1yICsgXCJWXCIgKyAtMyAqIHIgKyBcIkhcIiArIHIgKyBcIlZcIiArIC1yICsgXCJIXCIgKyAzICogciArIFwiVlwiICsgciArIFwiSFwiICsgciArIFwiVlwiICsgMyAqIHIgKyBcIkhcIiArIC1yICsgXCJWXCIgKyByICsgXCJIXCIgKyAtMyAqIHIgKyBcIlpcIjtcbiAgICB9LFxuICAgIGRpYW1vbmQ6IGZ1bmN0aW9uKHNpemUpIHtcbiAgICAgIHZhciByeSA9IE1hdGguc3FydChzaXplIC8gKDIgKiBkM19zdmdfc3ltYm9sVGFuMzApKSwgcnggPSByeSAqIGQzX3N2Z19zeW1ib2xUYW4zMDtcbiAgICAgIHJldHVybiBcIk0wLFwiICsgLXJ5ICsgXCJMXCIgKyByeCArIFwiLDBcIiArIFwiIDAsXCIgKyByeSArIFwiIFwiICsgLXJ4ICsgXCIsMFwiICsgXCJaXCI7XG4gICAgfSxcbiAgICBzcXVhcmU6IGZ1bmN0aW9uKHNpemUpIHtcbiAgICAgIHZhciByID0gTWF0aC5zcXJ0KHNpemUpIC8gMjtcbiAgICAgIHJldHVybiBcIk1cIiArIC1yICsgXCIsXCIgKyAtciArIFwiTFwiICsgciArIFwiLFwiICsgLXIgKyBcIiBcIiArIHIgKyBcIixcIiArIHIgKyBcIiBcIiArIC1yICsgXCIsXCIgKyByICsgXCJaXCI7XG4gICAgfSxcbiAgICBcInRyaWFuZ2xlLWRvd25cIjogZnVuY3Rpb24oc2l6ZSkge1xuICAgICAgdmFyIHJ4ID0gTWF0aC5zcXJ0KHNpemUgLyBkM19zdmdfc3ltYm9sU3FydDMpLCByeSA9IHJ4ICogZDNfc3ZnX3N5bWJvbFNxcnQzIC8gMjtcbiAgICAgIHJldHVybiBcIk0wLFwiICsgcnkgKyBcIkxcIiArIHJ4ICsgXCIsXCIgKyAtcnkgKyBcIiBcIiArIC1yeCArIFwiLFwiICsgLXJ5ICsgXCJaXCI7XG4gICAgfSxcbiAgICBcInRyaWFuZ2xlLXVwXCI6IGZ1bmN0aW9uKHNpemUpIHtcbiAgICAgIHZhciByeCA9IE1hdGguc3FydChzaXplIC8gZDNfc3ZnX3N5bWJvbFNxcnQzKSwgcnkgPSByeCAqIGQzX3N2Z19zeW1ib2xTcXJ0MyAvIDI7XG4gICAgICByZXR1cm4gXCJNMCxcIiArIC1yeSArIFwiTFwiICsgcnggKyBcIixcIiArIHJ5ICsgXCIgXCIgKyAtcnggKyBcIixcIiArIHJ5ICsgXCJaXCI7XG4gICAgfVxuICB9KTtcbiAgZDMuc3ZnLnN5bWJvbFR5cGVzID0gZDNfc3ZnX3N5bWJvbHMua2V5cygpO1xuICB2YXIgZDNfc3ZnX3N5bWJvbFNxcnQzID0gTWF0aC5zcXJ0KDMpLCBkM19zdmdfc3ltYm9sVGFuMzAgPSBNYXRoLnRhbigzMCAqIGQzX3JhZGlhbnMpO1xuICBmdW5jdGlvbiBkM190cmFuc2l0aW9uKGdyb3VwcywgaWQpIHtcbiAgICBkM19zdWJjbGFzcyhncm91cHMsIGQzX3RyYW5zaXRpb25Qcm90b3R5cGUpO1xuICAgIGdyb3Vwcy5pZCA9IGlkO1xuICAgIHJldHVybiBncm91cHM7XG4gIH1cbiAgdmFyIGQzX3RyYW5zaXRpb25Qcm90b3R5cGUgPSBbXSwgZDNfdHJhbnNpdGlvbklkID0gMCwgZDNfdHJhbnNpdGlvbkluaGVyaXRJZCwgZDNfdHJhbnNpdGlvbkluaGVyaXQ7XG4gIGQzX3RyYW5zaXRpb25Qcm90b3R5cGUuY2FsbCA9IGQzX3NlbGVjdGlvblByb3RvdHlwZS5jYWxsO1xuICBkM190cmFuc2l0aW9uUHJvdG90eXBlLmVtcHR5ID0gZDNfc2VsZWN0aW9uUHJvdG90eXBlLmVtcHR5O1xuICBkM190cmFuc2l0aW9uUHJvdG90eXBlLm5vZGUgPSBkM19zZWxlY3Rpb25Qcm90b3R5cGUubm9kZTtcbiAgZDNfdHJhbnNpdGlvblByb3RvdHlwZS5zaXplID0gZDNfc2VsZWN0aW9uUHJvdG90eXBlLnNpemU7XG4gIGQzLnRyYW5zaXRpb24gPSBmdW5jdGlvbihzZWxlY3Rpb24pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IGQzX3RyYW5zaXRpb25Jbmhlcml0SWQgPyBzZWxlY3Rpb24udHJhbnNpdGlvbigpIDogc2VsZWN0aW9uIDogZDNfc2VsZWN0aW9uUm9vdC50cmFuc2l0aW9uKCk7XG4gIH07XG4gIGQzLnRyYW5zaXRpb24ucHJvdG90eXBlID0gZDNfdHJhbnNpdGlvblByb3RvdHlwZTtcbiAgZDNfdHJhbnNpdGlvblByb3RvdHlwZS5zZWxlY3QgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgIHZhciBpZCA9IHRoaXMuaWQsIHN1Ymdyb3VwcyA9IFtdLCBzdWJncm91cCwgc3Vibm9kZSwgbm9kZTtcbiAgICBzZWxlY3RvciA9IGQzX3NlbGVjdGlvbl9zZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgZm9yICh2YXIgaiA9IC0xLCBtID0gdGhpcy5sZW5ndGg7ICsraiA8IG07ICkge1xuICAgICAgc3ViZ3JvdXBzLnB1c2goc3ViZ3JvdXAgPSBbXSk7XG4gICAgICBmb3IgKHZhciBncm91cCA9IHRoaXNbal0sIGkgPSAtMSwgbiA9IGdyb3VwLmxlbmd0aDsgKytpIDwgbjsgKSB7XG4gICAgICAgIGlmICgobm9kZSA9IGdyb3VwW2ldKSAmJiAoc3Vibm9kZSA9IHNlbGVjdG9yLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgaikpKSB7XG4gICAgICAgICAgaWYgKFwiX19kYXRhX19cIiBpbiBub2RlKSBzdWJub2RlLl9fZGF0YV9fID0gbm9kZS5fX2RhdGFfXztcbiAgICAgICAgICBkM190cmFuc2l0aW9uTm9kZShzdWJub2RlLCBpLCBpZCwgbm9kZS5fX3RyYW5zaXRpb25fX1tpZF0pO1xuICAgICAgICAgIHN1Ymdyb3VwLnB1c2goc3Vibm9kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3ViZ3JvdXAucHVzaChudWxsKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZDNfdHJhbnNpdGlvbihzdWJncm91cHMsIGlkKTtcbiAgfTtcbiAgZDNfdHJhbnNpdGlvblByb3RvdHlwZS5zZWxlY3RBbGwgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgIHZhciBpZCA9IHRoaXMuaWQsIHN1Ymdyb3VwcyA9IFtdLCBzdWJncm91cCwgc3Vibm9kZXMsIG5vZGUsIHN1Ym5vZGUsIHRyYW5zaXRpb247XG4gICAgc2VsZWN0b3IgPSBkM19zZWxlY3Rpb25fc2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgIGZvciAodmFyIGogPSAtMSwgbSA9IHRoaXMubGVuZ3RoOyArK2ogPCBtOyApIHtcbiAgICAgIGZvciAodmFyIGdyb3VwID0gdGhpc1tqXSwgaSA9IC0xLCBuID0gZ3JvdXAubGVuZ3RoOyArK2kgPCBuOyApIHtcbiAgICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgICAgIHRyYW5zaXRpb24gPSBub2RlLl9fdHJhbnNpdGlvbl9fW2lkXTtcbiAgICAgICAgICBzdWJub2RlcyA9IHNlbGVjdG9yLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgaik7XG4gICAgICAgICAgc3ViZ3JvdXBzLnB1c2goc3ViZ3JvdXAgPSBbXSk7XG4gICAgICAgICAgZm9yICh2YXIgayA9IC0xLCBvID0gc3Vibm9kZXMubGVuZ3RoOyArK2sgPCBvOyApIHtcbiAgICAgICAgICAgIGlmIChzdWJub2RlID0gc3Vibm9kZXNba10pIGQzX3RyYW5zaXRpb25Ob2RlKHN1Ym5vZGUsIGssIGlkLCB0cmFuc2l0aW9uKTtcbiAgICAgICAgICAgIHN1Ymdyb3VwLnB1c2goc3Vibm9kZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkM190cmFuc2l0aW9uKHN1Ymdyb3VwcywgaWQpO1xuICB9O1xuICBkM190cmFuc2l0aW9uUHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgIHZhciBzdWJncm91cHMgPSBbXSwgc3ViZ3JvdXAsIGdyb3VwLCBub2RlO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyICE9PSBcImZ1bmN0aW9uXCIpIGZpbHRlciA9IGQzX3NlbGVjdGlvbl9maWx0ZXIoZmlsdGVyKTtcbiAgICBmb3IgKHZhciBqID0gMCwgbSA9IHRoaXMubGVuZ3RoOyBqIDwgbTsgaisrKSB7XG4gICAgICBzdWJncm91cHMucHVzaChzdWJncm91cCA9IFtdKTtcbiAgICAgIGZvciAodmFyIGdyb3VwID0gdGhpc1tqXSwgaSA9IDAsIG4gPSBncm91cC5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIGZpbHRlci5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGopKSB7XG4gICAgICAgICAgc3ViZ3JvdXAucHVzaChub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZDNfdHJhbnNpdGlvbihzdWJncm91cHMsIHRoaXMuaWQpO1xuICB9O1xuICBkM190cmFuc2l0aW9uUHJvdG90eXBlLnR3ZWVuID0gZnVuY3Rpb24obmFtZSwgdHdlZW4pIHtcbiAgICB2YXIgaWQgPSB0aGlzLmlkO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikgcmV0dXJuIHRoaXMubm9kZSgpLl9fdHJhbnNpdGlvbl9fW2lkXS50d2Vlbi5nZXQobmFtZSk7XG4gICAgcmV0dXJuIGQzX3NlbGVjdGlvbl9lYWNoKHRoaXMsIHR3ZWVuID09IG51bGwgPyBmdW5jdGlvbihub2RlKSB7XG4gICAgICBub2RlLl9fdHJhbnNpdGlvbl9fW2lkXS50d2Vlbi5yZW1vdmUobmFtZSk7XG4gICAgfSA6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIG5vZGUuX190cmFuc2l0aW9uX19baWRdLnR3ZWVuLnNldChuYW1lLCB0d2Vlbik7XG4gICAgfSk7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3RyYW5zaXRpb25fdHdlZW4oZ3JvdXBzLCBuYW1lLCB2YWx1ZSwgdHdlZW4pIHtcbiAgICB2YXIgaWQgPSBncm91cHMuaWQ7XG4gICAgcmV0dXJuIGQzX3NlbGVjdGlvbl9lYWNoKGdyb3VwcywgdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIgPyBmdW5jdGlvbihub2RlLCBpLCBqKSB7XG4gICAgICBub2RlLl9fdHJhbnNpdGlvbl9fW2lkXS50d2Vlbi5zZXQobmFtZSwgdHdlZW4odmFsdWUuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBqKSkpO1xuICAgIH0gOiAodmFsdWUgPSB0d2Vlbih2YWx1ZSksIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIG5vZGUuX190cmFuc2l0aW9uX19baWRdLnR3ZWVuLnNldChuYW1lLCB2YWx1ZSk7XG4gICAgfSkpO1xuICB9XG4gIGQzX3RyYW5zaXRpb25Qcm90b3R5cGUuYXR0ciA9IGZ1bmN0aW9uKG5hbWVOUywgdmFsdWUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIGZvciAodmFsdWUgaW4gbmFtZU5TKSB0aGlzLmF0dHIodmFsdWUsIG5hbWVOU1t2YWx1ZV0pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHZhciBpbnRlcnBvbGF0ZSA9IG5hbWVOUyA9PSBcInRyYW5zZm9ybVwiID8gZDNfaW50ZXJwb2xhdGVUcmFuc2Zvcm0gOiBkM19pbnRlcnBvbGF0ZSwgbmFtZSA9IGQzLm5zLnF1YWxpZnkobmFtZU5TKTtcbiAgICBmdW5jdGlvbiBhdHRyTnVsbCgpIHtcbiAgICAgIHRoaXMucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBhdHRyTnVsbE5TKCkge1xuICAgICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGVOUyhuYW1lLnNwYWNlLCBuYW1lLmxvY2FsKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gYXR0clR3ZWVuKGIpIHtcbiAgICAgIHJldHVybiBiID09IG51bGwgPyBhdHRyTnVsbCA6IChiICs9IFwiXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYSA9IHRoaXMuZ2V0QXR0cmlidXRlKG5hbWUpLCBpO1xuICAgICAgICByZXR1cm4gYSAhPT0gYiAmJiAoaSA9IGludGVycG9sYXRlKGEsIGIpLCBmdW5jdGlvbih0KSB7XG4gICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgaSh0KSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGF0dHJUd2Vlbk5TKGIpIHtcbiAgICAgIHJldHVybiBiID09IG51bGwgPyBhdHRyTnVsbE5TIDogKGIgKz0gXCJcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhID0gdGhpcy5nZXRBdHRyaWJ1dGVOUyhuYW1lLnNwYWNlLCBuYW1lLmxvY2FsKSwgaTtcbiAgICAgICAgcmV0dXJuIGEgIT09IGIgJiYgKGkgPSBpbnRlcnBvbGF0ZShhLCBiKSwgZnVuY3Rpb24odCkge1xuICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlTlMobmFtZS5zcGFjZSwgbmFtZS5sb2NhbCwgaSh0KSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBkM190cmFuc2l0aW9uX3R3ZWVuKHRoaXMsIFwiYXR0ci5cIiArIG5hbWVOUywgdmFsdWUsIG5hbWUubG9jYWwgPyBhdHRyVHdlZW5OUyA6IGF0dHJUd2Vlbik7XG4gIH07XG4gIGQzX3RyYW5zaXRpb25Qcm90b3R5cGUuYXR0clR3ZWVuID0gZnVuY3Rpb24obmFtZU5TLCB0d2Vlbikge1xuICAgIHZhciBuYW1lID0gZDMubnMucXVhbGlmeShuYW1lTlMpO1xuICAgIGZ1bmN0aW9uIGF0dHJUd2VlbihkLCBpKSB7XG4gICAgICB2YXIgZiA9IHR3ZWVuLmNhbGwodGhpcywgZCwgaSwgdGhpcy5nZXRBdHRyaWJ1dGUobmFtZSkpO1xuICAgICAgcmV0dXJuIGYgJiYgZnVuY3Rpb24odCkge1xuICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZShuYW1lLCBmKHQpKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGF0dHJUd2Vlbk5TKGQsIGkpIHtcbiAgICAgIHZhciBmID0gdHdlZW4uY2FsbCh0aGlzLCBkLCBpLCB0aGlzLmdldEF0dHJpYnV0ZU5TKG5hbWUuc3BhY2UsIG5hbWUubG9jYWwpKTtcbiAgICAgIHJldHVybiBmICYmIGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVOUyhuYW1lLnNwYWNlLCBuYW1lLmxvY2FsLCBmKHQpKTtcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnR3ZWVuKFwiYXR0ci5cIiArIG5hbWVOUywgbmFtZS5sb2NhbCA/IGF0dHJUd2Vlbk5TIDogYXR0clR3ZWVuKTtcbiAgfTtcbiAgZDNfdHJhbnNpdGlvblByb3RvdHlwZS5zdHlsZSA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICAgIHZhciBuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBpZiAobiA8IDMpIHtcbiAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICBpZiAobiA8IDIpIHZhbHVlID0gXCJcIjtcbiAgICAgICAgZm9yIChwcmlvcml0eSBpbiBuYW1lKSB0aGlzLnN0eWxlKHByaW9yaXR5LCBuYW1lW3ByaW9yaXR5XSwgdmFsdWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHByaW9yaXR5ID0gXCJcIjtcbiAgICB9XG4gICAgZnVuY3Rpb24gc3R5bGVOdWxsKCkge1xuICAgICAgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc3R5bGVTdHJpbmcoYikge1xuICAgICAgcmV0dXJuIGIgPT0gbnVsbCA/IHN0eWxlTnVsbCA6IChiICs9IFwiXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYSA9IGQzX3dpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMsIG51bGwpLmdldFByb3BlcnR5VmFsdWUobmFtZSksIGk7XG4gICAgICAgIHJldHVybiBhICE9PSBiICYmIChpID0gZDNfaW50ZXJwb2xhdGUoYSwgYiksIGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICB0aGlzLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIGkodCksIHByaW9yaXR5KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGQzX3RyYW5zaXRpb25fdHdlZW4odGhpcywgXCJzdHlsZS5cIiArIG5hbWUsIHZhbHVlLCBzdHlsZVN0cmluZyk7XG4gIH07XG4gIGQzX3RyYW5zaXRpb25Qcm90b3R5cGUuc3R5bGVUd2VlbiA9IGZ1bmN0aW9uKG5hbWUsIHR3ZWVuLCBwcmlvcml0eSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykgcHJpb3JpdHkgPSBcIlwiO1xuICAgIGZ1bmN0aW9uIHN0eWxlVHdlZW4oZCwgaSkge1xuICAgICAgdmFyIGYgPSB0d2Vlbi5jYWxsKHRoaXMsIGQsIGksIGQzX3dpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMsIG51bGwpLmdldFByb3BlcnR5VmFsdWUobmFtZSkpO1xuICAgICAgcmV0dXJuIGYgJiYgZnVuY3Rpb24odCkge1xuICAgICAgICB0aGlzLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIGYodCksIHByaW9yaXR5KTtcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnR3ZWVuKFwic3R5bGUuXCIgKyBuYW1lLCBzdHlsZVR3ZWVuKTtcbiAgfTtcbiAgZDNfdHJhbnNpdGlvblByb3RvdHlwZS50ZXh0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZDNfdHJhbnNpdGlvbl90d2Vlbih0aGlzLCBcInRleHRcIiwgdmFsdWUsIGQzX3RyYW5zaXRpb25fdGV4dCk7XG4gIH07XG4gIGZ1bmN0aW9uIGQzX3RyYW5zaXRpb25fdGV4dChiKSB7XG4gICAgaWYgKGIgPT0gbnVsbCkgYiA9IFwiXCI7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50ZXh0Q29udGVudCA9IGI7XG4gICAgfTtcbiAgfVxuICBkM190cmFuc2l0aW9uUHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmVhY2goXCJlbmQudHJhbnNpdGlvblwiLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwO1xuICAgICAgaWYgKHRoaXMuX190cmFuc2l0aW9uX18uY291bnQgPCAyICYmIChwID0gdGhpcy5wYXJlbnROb2RlKSkgcC5yZW1vdmVDaGlsZCh0aGlzKTtcbiAgICB9KTtcbiAgfTtcbiAgZDNfdHJhbnNpdGlvblByb3RvdHlwZS5lYXNlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgaWQgPSB0aGlzLmlkO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMSkgcmV0dXJuIHRoaXMubm9kZSgpLl9fdHJhbnNpdGlvbl9fW2lkXS5lYXNlO1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdmFsdWUgPSBkMy5lYXNlLmFwcGx5KGQzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiBkM19zZWxlY3Rpb25fZWFjaCh0aGlzLCBmdW5jdGlvbihub2RlKSB7XG4gICAgICBub2RlLl9fdHJhbnNpdGlvbl9fW2lkXS5lYXNlID0gdmFsdWU7XG4gICAgfSk7XG4gIH07XG4gIGQzX3RyYW5zaXRpb25Qcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBpZCA9IHRoaXMuaWQ7XG4gICAgcmV0dXJuIGQzX3NlbGVjdGlvbl9lYWNoKHRoaXMsIHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiID8gZnVuY3Rpb24obm9kZSwgaSwgaikge1xuICAgICAgbm9kZS5fX3RyYW5zaXRpb25fX1tpZF0uZGVsYXkgPSArdmFsdWUuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBqKTtcbiAgICB9IDogKHZhbHVlID0gK3ZhbHVlLCBmdW5jdGlvbihub2RlKSB7XG4gICAgICBub2RlLl9fdHJhbnNpdGlvbl9fW2lkXS5kZWxheSA9IHZhbHVlO1xuICAgIH0pKTtcbiAgfTtcbiAgZDNfdHJhbnNpdGlvblByb3RvdHlwZS5kdXJhdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIGlkID0gdGhpcy5pZDtcbiAgICByZXR1cm4gZDNfc2VsZWN0aW9uX2VhY2godGhpcywgdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIgPyBmdW5jdGlvbihub2RlLCBpLCBqKSB7XG4gICAgICBub2RlLl9fdHJhbnNpdGlvbl9fW2lkXS5kdXJhdGlvbiA9IE1hdGgubWF4KDEsIHZhbHVlLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgaikpO1xuICAgIH0gOiAodmFsdWUgPSBNYXRoLm1heCgxLCB2YWx1ZSksIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIG5vZGUuX190cmFuc2l0aW9uX19baWRdLmR1cmF0aW9uID0gdmFsdWU7XG4gICAgfSkpO1xuICB9O1xuICBkM190cmFuc2l0aW9uUHJvdG90eXBlLmVhY2ggPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHZhciBpZCA9IHRoaXMuaWQ7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICB2YXIgaW5oZXJpdCA9IGQzX3RyYW5zaXRpb25Jbmhlcml0LCBpbmhlcml0SWQgPSBkM190cmFuc2l0aW9uSW5oZXJpdElkO1xuICAgICAgZDNfdHJhbnNpdGlvbkluaGVyaXRJZCA9IGlkO1xuICAgICAgZDNfc2VsZWN0aW9uX2VhY2godGhpcywgZnVuY3Rpb24obm9kZSwgaSwgaikge1xuICAgICAgICBkM190cmFuc2l0aW9uSW5oZXJpdCA9IG5vZGUuX190cmFuc2l0aW9uX19baWRdO1xuICAgICAgICB0eXBlLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgaik7XG4gICAgICB9KTtcbiAgICAgIGQzX3RyYW5zaXRpb25Jbmhlcml0ID0gaW5oZXJpdDtcbiAgICAgIGQzX3RyYW5zaXRpb25Jbmhlcml0SWQgPSBpbmhlcml0SWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGQzX3NlbGVjdGlvbl9lYWNoKHRoaXMsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgdmFyIHRyYW5zaXRpb24gPSBub2RlLl9fdHJhbnNpdGlvbl9fW2lkXTtcbiAgICAgICAgKHRyYW5zaXRpb24uZXZlbnQgfHwgKHRyYW5zaXRpb24uZXZlbnQgPSBkMy5kaXNwYXRjaChcInN0YXJ0XCIsIFwiZW5kXCIpKSkub24odHlwZSwgbGlzdGVuZXIpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuICBkM190cmFuc2l0aW9uUHJvdG90eXBlLnRyYW5zaXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaWQwID0gdGhpcy5pZCwgaWQxID0gKytkM190cmFuc2l0aW9uSWQsIHN1Ymdyb3VwcyA9IFtdLCBzdWJncm91cCwgZ3JvdXAsIG5vZGUsIHRyYW5zaXRpb247XG4gICAgZm9yICh2YXIgaiA9IDAsIG0gPSB0aGlzLmxlbmd0aDsgaiA8IG07IGorKykge1xuICAgICAgc3ViZ3JvdXBzLnB1c2goc3ViZ3JvdXAgPSBbXSk7XG4gICAgICBmb3IgKHZhciBncm91cCA9IHRoaXNbal0sIGkgPSAwLCBuID0gZ3JvdXAubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgICAgICB0cmFuc2l0aW9uID0gT2JqZWN0LmNyZWF0ZShub2RlLl9fdHJhbnNpdGlvbl9fW2lkMF0pO1xuICAgICAgICAgIHRyYW5zaXRpb24uZGVsYXkgKz0gdHJhbnNpdGlvbi5kdXJhdGlvbjtcbiAgICAgICAgICBkM190cmFuc2l0aW9uTm9kZShub2RlLCBpLCBpZDEsIHRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgICAgIHN1Ymdyb3VwLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkM190cmFuc2l0aW9uKHN1Ymdyb3VwcywgaWQxKTtcbiAgfTtcbiAgZnVuY3Rpb24gZDNfdHJhbnNpdGlvbk5vZGUobm9kZSwgaSwgaWQsIGluaGVyaXQpIHtcbiAgICB2YXIgbG9jayA9IG5vZGUuX190cmFuc2l0aW9uX18gfHwgKG5vZGUuX190cmFuc2l0aW9uX18gPSB7XG4gICAgICBhY3RpdmU6IDAsXG4gICAgICBjb3VudDogMFxuICAgIH0pLCB0cmFuc2l0aW9uID0gbG9ja1tpZF07XG4gICAgaWYgKCF0cmFuc2l0aW9uKSB7XG4gICAgICB2YXIgdGltZSA9IGluaGVyaXQudGltZTtcbiAgICAgIHRyYW5zaXRpb24gPSBsb2NrW2lkXSA9IHtcbiAgICAgICAgdHdlZW46IG5ldyBkM19NYXAoKSxcbiAgICAgICAgdGltZTogdGltZSxcbiAgICAgICAgZWFzZTogaW5oZXJpdC5lYXNlLFxuICAgICAgICBkZWxheTogaW5oZXJpdC5kZWxheSxcbiAgICAgICAgZHVyYXRpb246IGluaGVyaXQuZHVyYXRpb25cbiAgICAgIH07XG4gICAgICArK2xvY2suY291bnQ7XG4gICAgICBkMy50aW1lcihmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgICAgIHZhciBkID0gbm9kZS5fX2RhdGFfXywgZWFzZSA9IHRyYW5zaXRpb24uZWFzZSwgZGVsYXkgPSB0cmFuc2l0aW9uLmRlbGF5LCBkdXJhdGlvbiA9IHRyYW5zaXRpb24uZHVyYXRpb24sIHRpbWVyID0gZDNfdGltZXJfYWN0aXZlLCB0d2VlbmVkID0gW107XG4gICAgICAgIHRpbWVyLnQgPSBkZWxheSArIHRpbWU7XG4gICAgICAgIGlmIChkZWxheSA8PSBlbGFwc2VkKSByZXR1cm4gc3RhcnQoZWxhcHNlZCAtIGRlbGF5KTtcbiAgICAgICAgdGltZXIuYyA9IHN0YXJ0O1xuICAgICAgICBmdW5jdGlvbiBzdGFydChlbGFwc2VkKSB7XG4gICAgICAgICAgaWYgKGxvY2suYWN0aXZlID4gaWQpIHJldHVybiBzdG9wKCk7XG4gICAgICAgICAgbG9jay5hY3RpdmUgPSBpZDtcbiAgICAgICAgICB0cmFuc2l0aW9uLmV2ZW50ICYmIHRyYW5zaXRpb24uZXZlbnQuc3RhcnQuY2FsbChub2RlLCBkLCBpKTtcbiAgICAgICAgICB0cmFuc2l0aW9uLnR3ZWVuLmZvckVhY2goZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlID0gdmFsdWUuY2FsbChub2RlLCBkLCBpKSkge1xuICAgICAgICAgICAgICB0d2VlbmVkLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGQzLnRpbWVyKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGltZXIuYyA9IHRpY2soZWxhcHNlZCB8fCAxKSA/IGQzX3RydWUgOiB0aWNrO1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgfSwgMCwgdGltZSk7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gdGljayhlbGFwc2VkKSB7XG4gICAgICAgICAgaWYgKGxvY2suYWN0aXZlICE9PSBpZCkgcmV0dXJuIHN0b3AoKTtcbiAgICAgICAgICB2YXIgdCA9IGVsYXBzZWQgLyBkdXJhdGlvbiwgZSA9IGVhc2UodCksIG4gPSB0d2VlbmVkLmxlbmd0aDtcbiAgICAgICAgICB3aGlsZSAobiA+IDApIHtcbiAgICAgICAgICAgIHR3ZWVuZWRbLS1uXS5jYWxsKG5vZGUsIGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodCA+PSAxKSB7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLmV2ZW50ICYmIHRyYW5zaXRpb24uZXZlbnQuZW5kLmNhbGwobm9kZSwgZCwgaSk7XG4gICAgICAgICAgICByZXR1cm4gc3RvcCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBzdG9wKCkge1xuICAgICAgICAgIGlmICgtLWxvY2suY291bnQpIGRlbGV0ZSBsb2NrW2lkXTsgZWxzZSBkZWxldGUgbm9kZS5fX3RyYW5zaXRpb25fXztcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfSwgMCwgdGltZSk7XG4gICAgfVxuICB9XG4gIGQzLnN2Zy5heGlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjYWxlID0gZDMuc2NhbGUubGluZWFyKCksIG9yaWVudCA9IGQzX3N2Z19heGlzRGVmYXVsdE9yaWVudCwgaW5uZXJUaWNrU2l6ZSA9IDYsIG91dGVyVGlja1NpemUgPSA2LCB0aWNrUGFkZGluZyA9IDMsIHRpY2tBcmd1bWVudHNfID0gWyAxMCBdLCB0aWNrVmFsdWVzID0gbnVsbCwgdGlja0Zvcm1hdF87XG4gICAgZnVuY3Rpb24gYXhpcyhnKSB7XG4gICAgICBnLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBnID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgICB2YXIgc2NhbGUwID0gdGhpcy5fX2NoYXJ0X18gfHwgc2NhbGUsIHNjYWxlMSA9IHRoaXMuX19jaGFydF9fID0gc2NhbGUuY29weSgpO1xuICAgICAgICB2YXIgdGlja3MgPSB0aWNrVmFsdWVzID09IG51bGwgPyBzY2FsZTEudGlja3MgPyBzY2FsZTEudGlja3MuYXBwbHkoc2NhbGUxLCB0aWNrQXJndW1lbnRzXykgOiBzY2FsZTEuZG9tYWluKCkgOiB0aWNrVmFsdWVzLCB0aWNrRm9ybWF0ID0gdGlja0Zvcm1hdF8gPT0gbnVsbCA/IHNjYWxlMS50aWNrRm9ybWF0ID8gc2NhbGUxLnRpY2tGb3JtYXQuYXBwbHkoc2NhbGUxLCB0aWNrQXJndW1lbnRzXykgOiBkM19pZGVudGl0eSA6IHRpY2tGb3JtYXRfLCB0aWNrID0gZy5zZWxlY3RBbGwoXCIudGlja1wiKS5kYXRhKHRpY2tzLCBzY2FsZTEpLCB0aWNrRW50ZXIgPSB0aWNrLmVudGVyKCkuaW5zZXJ0KFwiZ1wiLCBcIi5kb21haW5cIikuYXR0cihcImNsYXNzXCIsIFwidGlja1wiKS5zdHlsZShcIm9wYWNpdHlcIiwgzrUpLCB0aWNrRXhpdCA9IGQzLnRyYW5zaXRpb24odGljay5leGl0KCkpLnN0eWxlKFwib3BhY2l0eVwiLCDOtSkucmVtb3ZlKCksIHRpY2tVcGRhdGUgPSBkMy50cmFuc2l0aW9uKHRpY2spLnN0eWxlKFwib3BhY2l0eVwiLCAxKSwgdGlja1RyYW5zZm9ybTtcbiAgICAgICAgdmFyIHJhbmdlID0gZDNfc2NhbGVSYW5nZShzY2FsZTEpLCBwYXRoID0gZy5zZWxlY3RBbGwoXCIuZG9tYWluXCIpLmRhdGEoWyAwIF0pLCBwYXRoVXBkYXRlID0gKHBhdGguZW50ZXIoKS5hcHBlbmQoXCJwYXRoXCIpLmF0dHIoXCJjbGFzc1wiLCBcImRvbWFpblwiKSwgXG4gICAgICAgIGQzLnRyYW5zaXRpb24ocGF0aCkpO1xuICAgICAgICB0aWNrRW50ZXIuYXBwZW5kKFwibGluZVwiKTtcbiAgICAgICAgdGlja0VudGVyLmFwcGVuZChcInRleHRcIik7XG4gICAgICAgIHZhciBsaW5lRW50ZXIgPSB0aWNrRW50ZXIuc2VsZWN0KFwibGluZVwiKSwgbGluZVVwZGF0ZSA9IHRpY2tVcGRhdGUuc2VsZWN0KFwibGluZVwiKSwgdGV4dCA9IHRpY2suc2VsZWN0KFwidGV4dFwiKS50ZXh0KHRpY2tGb3JtYXQpLCB0ZXh0RW50ZXIgPSB0aWNrRW50ZXIuc2VsZWN0KFwidGV4dFwiKSwgdGV4dFVwZGF0ZSA9IHRpY2tVcGRhdGUuc2VsZWN0KFwidGV4dFwiKTtcbiAgICAgICAgc3dpdGNoIChvcmllbnQpIHtcbiAgICAgICAgIGNhc2UgXCJib3R0b21cIjpcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aWNrVHJhbnNmb3JtID0gZDNfc3ZnX2F4aXNYO1xuICAgICAgICAgICAgbGluZUVudGVyLmF0dHIoXCJ5MlwiLCBpbm5lclRpY2tTaXplKTtcbiAgICAgICAgICAgIHRleHRFbnRlci5hdHRyKFwieVwiLCBNYXRoLm1heChpbm5lclRpY2tTaXplLCAwKSArIHRpY2tQYWRkaW5nKTtcbiAgICAgICAgICAgIGxpbmVVcGRhdGUuYXR0cihcIngyXCIsIDApLmF0dHIoXCJ5MlwiLCBpbm5lclRpY2tTaXplKTtcbiAgICAgICAgICAgIHRleHRVcGRhdGUuYXR0cihcInhcIiwgMCkuYXR0cihcInlcIiwgTWF0aC5tYXgoaW5uZXJUaWNrU2l6ZSwgMCkgKyB0aWNrUGFkZGluZyk7XG4gICAgICAgICAgICB0ZXh0LmF0dHIoXCJkeVwiLCBcIi43MWVtXCIpLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIik7XG4gICAgICAgICAgICBwYXRoVXBkYXRlLmF0dHIoXCJkXCIsIFwiTVwiICsgcmFuZ2VbMF0gKyBcIixcIiArIG91dGVyVGlja1NpemUgKyBcIlYwSFwiICsgcmFuZ2VbMV0gKyBcIlZcIiArIG91dGVyVGlja1NpemUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICBjYXNlIFwidG9wXCI6XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGlja1RyYW5zZm9ybSA9IGQzX3N2Z19heGlzWDtcbiAgICAgICAgICAgIGxpbmVFbnRlci5hdHRyKFwieTJcIiwgLWlubmVyVGlja1NpemUpO1xuICAgICAgICAgICAgdGV4dEVudGVyLmF0dHIoXCJ5XCIsIC0oTWF0aC5tYXgoaW5uZXJUaWNrU2l6ZSwgMCkgKyB0aWNrUGFkZGluZykpO1xuICAgICAgICAgICAgbGluZVVwZGF0ZS5hdHRyKFwieDJcIiwgMCkuYXR0cihcInkyXCIsIC1pbm5lclRpY2tTaXplKTtcbiAgICAgICAgICAgIHRleHRVcGRhdGUuYXR0cihcInhcIiwgMCkuYXR0cihcInlcIiwgLShNYXRoLm1heChpbm5lclRpY2tTaXplLCAwKSArIHRpY2tQYWRkaW5nKSk7XG4gICAgICAgICAgICB0ZXh0LmF0dHIoXCJkeVwiLCBcIjBlbVwiKS5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpO1xuICAgICAgICAgICAgcGF0aFVwZGF0ZS5hdHRyKFwiZFwiLCBcIk1cIiArIHJhbmdlWzBdICsgXCIsXCIgKyAtb3V0ZXJUaWNrU2l6ZSArIFwiVjBIXCIgKyByYW5nZVsxXSArIFwiVlwiICsgLW91dGVyVGlja1NpemUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICBjYXNlIFwibGVmdFwiOlxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpY2tUcmFuc2Zvcm0gPSBkM19zdmdfYXhpc1k7XG4gICAgICAgICAgICBsaW5lRW50ZXIuYXR0cihcIngyXCIsIC1pbm5lclRpY2tTaXplKTtcbiAgICAgICAgICAgIHRleHRFbnRlci5hdHRyKFwieFwiLCAtKE1hdGgubWF4KGlubmVyVGlja1NpemUsIDApICsgdGlja1BhZGRpbmcpKTtcbiAgICAgICAgICAgIGxpbmVVcGRhdGUuYXR0cihcIngyXCIsIC1pbm5lclRpY2tTaXplKS5hdHRyKFwieTJcIiwgMCk7XG4gICAgICAgICAgICB0ZXh0VXBkYXRlLmF0dHIoXCJ4XCIsIC0oTWF0aC5tYXgoaW5uZXJUaWNrU2l6ZSwgMCkgKyB0aWNrUGFkZGluZykpLmF0dHIoXCJ5XCIsIDApO1xuICAgICAgICAgICAgdGV4dC5hdHRyKFwiZHlcIiwgXCIuMzJlbVwiKS5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwiZW5kXCIpO1xuICAgICAgICAgICAgcGF0aFVwZGF0ZS5hdHRyKFwiZFwiLCBcIk1cIiArIC1vdXRlclRpY2tTaXplICsgXCIsXCIgKyByYW5nZVswXSArIFwiSDBWXCIgKyByYW5nZVsxXSArIFwiSFwiICsgLW91dGVyVGlja1NpemUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICBjYXNlIFwicmlnaHRcIjpcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aWNrVHJhbnNmb3JtID0gZDNfc3ZnX2F4aXNZO1xuICAgICAgICAgICAgbGluZUVudGVyLmF0dHIoXCJ4MlwiLCBpbm5lclRpY2tTaXplKTtcbiAgICAgICAgICAgIHRleHRFbnRlci5hdHRyKFwieFwiLCBNYXRoLm1heChpbm5lclRpY2tTaXplLCAwKSArIHRpY2tQYWRkaW5nKTtcbiAgICAgICAgICAgIGxpbmVVcGRhdGUuYXR0cihcIngyXCIsIGlubmVyVGlja1NpemUpLmF0dHIoXCJ5MlwiLCAwKTtcbiAgICAgICAgICAgIHRleHRVcGRhdGUuYXR0cihcInhcIiwgTWF0aC5tYXgoaW5uZXJUaWNrU2l6ZSwgMCkgKyB0aWNrUGFkZGluZykuYXR0cihcInlcIiwgMCk7XG4gICAgICAgICAgICB0ZXh0LmF0dHIoXCJkeVwiLCBcIi4zMmVtXCIpLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJzdGFydFwiKTtcbiAgICAgICAgICAgIHBhdGhVcGRhdGUuYXR0cihcImRcIiwgXCJNXCIgKyBvdXRlclRpY2tTaXplICsgXCIsXCIgKyByYW5nZVswXSArIFwiSDBWXCIgKyByYW5nZVsxXSArIFwiSFwiICsgb3V0ZXJUaWNrU2l6ZSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNjYWxlMS5yYW5nZUJhbmQpIHtcbiAgICAgICAgICB2YXIgeCA9IHNjYWxlMSwgZHggPSB4LnJhbmdlQmFuZCgpIC8gMjtcbiAgICAgICAgICBzY2FsZTAgPSBzY2FsZTEgPSBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4geChkKSArIGR4O1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoc2NhbGUwLnJhbmdlQmFuZCkge1xuICAgICAgICAgIHNjYWxlMCA9IHNjYWxlMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aWNrRXhpdC5jYWxsKHRpY2tUcmFuc2Zvcm0sIHNjYWxlMSk7XG4gICAgICAgIH1cbiAgICAgICAgdGlja0VudGVyLmNhbGwodGlja1RyYW5zZm9ybSwgc2NhbGUwKTtcbiAgICAgICAgdGlja1VwZGF0ZS5jYWxsKHRpY2tUcmFuc2Zvcm0sIHNjYWxlMSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgYXhpcy5zY2FsZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHNjYWxlO1xuICAgICAgc2NhbGUgPSB4O1xuICAgICAgcmV0dXJuIGF4aXM7XG4gICAgfTtcbiAgICBheGlzLm9yaWVudCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG9yaWVudDtcbiAgICAgIG9yaWVudCA9IHggaW4gZDNfc3ZnX2F4aXNPcmllbnRzID8geCArIFwiXCIgOiBkM19zdmdfYXhpc0RlZmF1bHRPcmllbnQ7XG4gICAgICByZXR1cm4gYXhpcztcbiAgICB9O1xuICAgIGF4aXMudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRpY2tBcmd1bWVudHNfO1xuICAgICAgdGlja0FyZ3VtZW50c18gPSBhcmd1bWVudHM7XG4gICAgICByZXR1cm4gYXhpcztcbiAgICB9O1xuICAgIGF4aXMudGlja1ZhbHVlcyA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRpY2tWYWx1ZXM7XG4gICAgICB0aWNrVmFsdWVzID0geDtcbiAgICAgIHJldHVybiBheGlzO1xuICAgIH07XG4gICAgYXhpcy50aWNrRm9ybWF0ID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGlja0Zvcm1hdF87XG4gICAgICB0aWNrRm9ybWF0XyA9IHg7XG4gICAgICByZXR1cm4gYXhpcztcbiAgICB9O1xuICAgIGF4aXMudGlja1NpemUgPSBmdW5jdGlvbih4KSB7XG4gICAgICB2YXIgbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICBpZiAoIW4pIHJldHVybiBpbm5lclRpY2tTaXplO1xuICAgICAgaW5uZXJUaWNrU2l6ZSA9ICt4O1xuICAgICAgb3V0ZXJUaWNrU2l6ZSA9ICthcmd1bWVudHNbbiAtIDFdO1xuICAgICAgcmV0dXJuIGF4aXM7XG4gICAgfTtcbiAgICBheGlzLmlubmVyVGlja1NpemUgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBpbm5lclRpY2tTaXplO1xuICAgICAgaW5uZXJUaWNrU2l6ZSA9ICt4O1xuICAgICAgcmV0dXJuIGF4aXM7XG4gICAgfTtcbiAgICBheGlzLm91dGVyVGlja1NpemUgPSBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBvdXRlclRpY2tTaXplO1xuICAgICAgb3V0ZXJUaWNrU2l6ZSA9ICt4O1xuICAgICAgcmV0dXJuIGF4aXM7XG4gICAgfTtcbiAgICBheGlzLnRpY2tQYWRkaW5nID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGlja1BhZGRpbmc7XG4gICAgICB0aWNrUGFkZGluZyA9ICt4O1xuICAgICAgcmV0dXJuIGF4aXM7XG4gICAgfTtcbiAgICBheGlzLnRpY2tTdWJkaXZpZGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoICYmIGF4aXM7XG4gICAgfTtcbiAgICByZXR1cm4gYXhpcztcbiAgfTtcbiAgdmFyIGQzX3N2Z19heGlzRGVmYXVsdE9yaWVudCA9IFwiYm90dG9tXCIsIGQzX3N2Z19heGlzT3JpZW50cyA9IHtcbiAgICB0b3A6IDEsXG4gICAgcmlnaHQ6IDEsXG4gICAgYm90dG9tOiAxLFxuICAgIGxlZnQ6IDFcbiAgfTtcbiAgZnVuY3Rpb24gZDNfc3ZnX2F4aXNYKHNlbGVjdGlvbiwgeCkge1xuICAgIHNlbGVjdGlvbi5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIHgoZCkgKyBcIiwwKVwiO1xuICAgIH0pO1xuICB9XG4gIGZ1bmN0aW9uIGQzX3N2Z19heGlzWShzZWxlY3Rpb24sIHkpIHtcbiAgICBzZWxlY3Rpb24uYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoMCxcIiArIHkoZCkgKyBcIilcIjtcbiAgICB9KTtcbiAgfVxuICBkMy5zdmcuYnJ1c2ggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZXZlbnQgPSBkM19ldmVudERpc3BhdGNoKGJydXNoLCBcImJydXNoc3RhcnRcIiwgXCJicnVzaFwiLCBcImJydXNoZW5kXCIpLCB4ID0gbnVsbCwgeSA9IG51bGwsIHhFeHRlbnQgPSBbIDAsIDAgXSwgeUV4dGVudCA9IFsgMCwgMCBdLCB4RXh0ZW50RG9tYWluLCB5RXh0ZW50RG9tYWluLCB4Q2xhbXAgPSB0cnVlLCB5Q2xhbXAgPSB0cnVlLCByZXNpemVzID0gZDNfc3ZnX2JydXNoUmVzaXplc1swXTtcbiAgICBmdW5jdGlvbiBicnVzaChnKSB7XG4gICAgICBnLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBnID0gZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwicG9pbnRlci1ldmVudHNcIiwgXCJhbGxcIikuc3R5bGUoXCItd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3JcIiwgXCJyZ2JhKDAsMCwwLDApXCIpLm9uKFwibW91c2Vkb3duLmJydXNoXCIsIGJydXNoc3RhcnQpLm9uKFwidG91Y2hzdGFydC5icnVzaFwiLCBicnVzaHN0YXJ0KTtcbiAgICAgICAgdmFyIGJhY2tncm91bmQgPSBnLnNlbGVjdEFsbChcIi5iYWNrZ3JvdW5kXCIpLmRhdGEoWyAwIF0pO1xuICAgICAgICBiYWNrZ3JvdW5kLmVudGVyKCkuYXBwZW5kKFwicmVjdFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJiYWNrZ3JvdW5kXCIpLnN0eWxlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKS5zdHlsZShcImN1cnNvclwiLCBcImNyb3NzaGFpclwiKTtcbiAgICAgICAgZy5zZWxlY3RBbGwoXCIuZXh0ZW50XCIpLmRhdGEoWyAwIF0pLmVudGVyKCkuYXBwZW5kKFwicmVjdFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJleHRlbnRcIikuc3R5bGUoXCJjdXJzb3JcIiwgXCJtb3ZlXCIpO1xuICAgICAgICB2YXIgcmVzaXplID0gZy5zZWxlY3RBbGwoXCIucmVzaXplXCIpLmRhdGEocmVzaXplcywgZDNfaWRlbnRpdHkpO1xuICAgICAgICByZXNpemUuZXhpdCgpLnJlbW92ZSgpO1xuICAgICAgICByZXNpemUuZW50ZXIoKS5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIFwicmVzaXplIFwiICsgZDtcbiAgICAgICAgfSkuc3R5bGUoXCJjdXJzb3JcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkM19zdmdfYnJ1c2hDdXJzb3JbZF07XG4gICAgICAgIH0pLmFwcGVuZChcInJlY3RcIikuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiAvW2V3XSQvLnRlc3QoZCkgPyAtMyA6IG51bGw7XG4gICAgICAgIH0pLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gL15bbnNdLy50ZXN0KGQpID8gLTMgOiBudWxsO1xuICAgICAgICB9KS5hdHRyKFwid2lkdGhcIiwgNikuYXR0cihcImhlaWdodFwiLCA2KS5zdHlsZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gICAgICAgIHJlc2l6ZS5zdHlsZShcImRpc3BsYXlcIiwgYnJ1c2guZW1wdHkoKSA/IFwibm9uZVwiIDogbnVsbCk7XG4gICAgICAgIHZhciBnVXBkYXRlID0gZDMudHJhbnNpdGlvbihnKSwgYmFja2dyb3VuZFVwZGF0ZSA9IGQzLnRyYW5zaXRpb24oYmFja2dyb3VuZCksIHJhbmdlO1xuICAgICAgICBpZiAoeCkge1xuICAgICAgICAgIHJhbmdlID0gZDNfc2NhbGVSYW5nZSh4KTtcbiAgICAgICAgICBiYWNrZ3JvdW5kVXBkYXRlLmF0dHIoXCJ4XCIsIHJhbmdlWzBdKS5hdHRyKFwid2lkdGhcIiwgcmFuZ2VbMV0gLSByYW5nZVswXSk7XG4gICAgICAgICAgcmVkcmF3WChnVXBkYXRlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoeSkge1xuICAgICAgICAgIHJhbmdlID0gZDNfc2NhbGVSYW5nZSh5KTtcbiAgICAgICAgICBiYWNrZ3JvdW5kVXBkYXRlLmF0dHIoXCJ5XCIsIHJhbmdlWzBdKS5hdHRyKFwiaGVpZ2h0XCIsIHJhbmdlWzFdIC0gcmFuZ2VbMF0pO1xuICAgICAgICAgIHJlZHJhd1koZ1VwZGF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVkcmF3KGdVcGRhdGUpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGJydXNoLmV2ZW50ID0gZnVuY3Rpb24oZykge1xuICAgICAgZy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZXZlbnRfID0gZXZlbnQub2YodGhpcywgYXJndW1lbnRzKSwgZXh0ZW50MSA9IHtcbiAgICAgICAgICB4OiB4RXh0ZW50LFxuICAgICAgICAgIHk6IHlFeHRlbnQsXG4gICAgICAgICAgaTogeEV4dGVudERvbWFpbixcbiAgICAgICAgICBqOiB5RXh0ZW50RG9tYWluXG4gICAgICAgIH0sIGV4dGVudDAgPSB0aGlzLl9fY2hhcnRfXyB8fCBleHRlbnQxO1xuICAgICAgICB0aGlzLl9fY2hhcnRfXyA9IGV4dGVudDE7XG4gICAgICAgIGlmIChkM190cmFuc2l0aW9uSW5oZXJpdElkKSB7XG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnRyYW5zaXRpb24oKS5lYWNoKFwic3RhcnQuYnJ1c2hcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB4RXh0ZW50RG9tYWluID0gZXh0ZW50MC5pO1xuICAgICAgICAgICAgeUV4dGVudERvbWFpbiA9IGV4dGVudDAuajtcbiAgICAgICAgICAgIHhFeHRlbnQgPSBleHRlbnQwLng7XG4gICAgICAgICAgICB5RXh0ZW50ID0gZXh0ZW50MC55O1xuICAgICAgICAgICAgZXZlbnRfKHtcbiAgICAgICAgICAgICAgdHlwZTogXCJicnVzaHN0YXJ0XCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pLnR3ZWVuKFwiYnJ1c2g6YnJ1c2hcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgeGkgPSBkM19pbnRlcnBvbGF0ZUFycmF5KHhFeHRlbnQsIGV4dGVudDEueCksIHlpID0gZDNfaW50ZXJwb2xhdGVBcnJheSh5RXh0ZW50LCBleHRlbnQxLnkpO1xuICAgICAgICAgICAgeEV4dGVudERvbWFpbiA9IHlFeHRlbnREb21haW4gPSBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgICAgeEV4dGVudCA9IGV4dGVudDEueCA9IHhpKHQpO1xuICAgICAgICAgICAgICB5RXh0ZW50ID0gZXh0ZW50MS55ID0geWkodCk7XG4gICAgICAgICAgICAgIGV2ZW50Xyh7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJicnVzaFwiLFxuICAgICAgICAgICAgICAgIG1vZGU6IFwicmVzaXplXCJcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0pLmVhY2goXCJlbmQuYnJ1c2hcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB4RXh0ZW50RG9tYWluID0gZXh0ZW50MS5pO1xuICAgICAgICAgICAgeUV4dGVudERvbWFpbiA9IGV4dGVudDEuajtcbiAgICAgICAgICAgIGV2ZW50Xyh7XG4gICAgICAgICAgICAgIHR5cGU6IFwiYnJ1c2hcIixcbiAgICAgICAgICAgICAgbW9kZTogXCJyZXNpemVcIlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBldmVudF8oe1xuICAgICAgICAgICAgICB0eXBlOiBcImJydXNoZW5kXCJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGV2ZW50Xyh7XG4gICAgICAgICAgICB0eXBlOiBcImJydXNoc3RhcnRcIlxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGV2ZW50Xyh7XG4gICAgICAgICAgICB0eXBlOiBcImJydXNoXCIsXG4gICAgICAgICAgICBtb2RlOiBcInJlc2l6ZVwiXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgZXZlbnRfKHtcbiAgICAgICAgICAgIHR5cGU6IFwiYnJ1c2hlbmRcIlxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIHJlZHJhdyhnKSB7XG4gICAgICBnLnNlbGVjdEFsbChcIi5yZXNpemVcIikuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIHhFeHRlbnRbKy9lJC8udGVzdChkKV0gKyBcIixcIiArIHlFeHRlbnRbKy9ecy8udGVzdChkKV0gKyBcIilcIjtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZWRyYXdYKGcpIHtcbiAgICAgIGcuc2VsZWN0KFwiLmV4dGVudFwiKS5hdHRyKFwieFwiLCB4RXh0ZW50WzBdKTtcbiAgICAgIGcuc2VsZWN0QWxsKFwiLmV4dGVudCwubj5yZWN0LC5zPnJlY3RcIikuYXR0cihcIndpZHRoXCIsIHhFeHRlbnRbMV0gLSB4RXh0ZW50WzBdKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVkcmF3WShnKSB7XG4gICAgICBnLnNlbGVjdChcIi5leHRlbnRcIikuYXR0cihcInlcIiwgeUV4dGVudFswXSk7XG4gICAgICBnLnNlbGVjdEFsbChcIi5leHRlbnQsLmU+cmVjdCwudz5yZWN0XCIpLmF0dHIoXCJoZWlnaHRcIiwgeUV4dGVudFsxXSAtIHlFeHRlbnRbMF0pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBicnVzaHN0YXJ0KCkge1xuICAgICAgdmFyIHRhcmdldCA9IHRoaXMsIGV2ZW50VGFyZ2V0ID0gZDMuc2VsZWN0KGQzLmV2ZW50LnRhcmdldCksIGV2ZW50XyA9IGV2ZW50Lm9mKHRhcmdldCwgYXJndW1lbnRzKSwgZyA9IGQzLnNlbGVjdCh0YXJnZXQpLCByZXNpemluZyA9IGV2ZW50VGFyZ2V0LmRhdHVtKCksIHJlc2l6aW5nWCA9ICEvXihufHMpJC8udGVzdChyZXNpemluZykgJiYgeCwgcmVzaXppbmdZID0gIS9eKGV8dykkLy50ZXN0KHJlc2l6aW5nKSAmJiB5LCBkcmFnZ2luZyA9IGV2ZW50VGFyZ2V0LmNsYXNzZWQoXCJleHRlbnRcIiksIGRyYWdSZXN0b3JlID0gZDNfZXZlbnRfZHJhZ1N1cHByZXNzKCksIGNlbnRlciwgb3JpZ2luID0gZDMubW91c2UodGFyZ2V0KSwgb2Zmc2V0O1xuICAgICAgdmFyIHcgPSBkMy5zZWxlY3QoZDNfd2luZG93KS5vbihcImtleWRvd24uYnJ1c2hcIiwga2V5ZG93bikub24oXCJrZXl1cC5icnVzaFwiLCBrZXl1cCk7XG4gICAgICBpZiAoZDMuZXZlbnQuY2hhbmdlZFRvdWNoZXMpIHtcbiAgICAgICAgdy5vbihcInRvdWNobW92ZS5icnVzaFwiLCBicnVzaG1vdmUpLm9uKFwidG91Y2hlbmQuYnJ1c2hcIiwgYnJ1c2hlbmQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdy5vbihcIm1vdXNlbW92ZS5icnVzaFwiLCBicnVzaG1vdmUpLm9uKFwibW91c2V1cC5icnVzaFwiLCBicnVzaGVuZCk7XG4gICAgICB9XG4gICAgICBnLmludGVycnVwdCgpLnNlbGVjdEFsbChcIipcIikuaW50ZXJydXB0KCk7XG4gICAgICBpZiAoZHJhZ2dpbmcpIHtcbiAgICAgICAgb3JpZ2luWzBdID0geEV4dGVudFswXSAtIG9yaWdpblswXTtcbiAgICAgICAgb3JpZ2luWzFdID0geUV4dGVudFswXSAtIG9yaWdpblsxXTtcbiAgICAgIH0gZWxzZSBpZiAocmVzaXppbmcpIHtcbiAgICAgICAgdmFyIGV4ID0gKy93JC8udGVzdChyZXNpemluZyksIGV5ID0gKy9ebi8udGVzdChyZXNpemluZyk7XG4gICAgICAgIG9mZnNldCA9IFsgeEV4dGVudFsxIC0gZXhdIC0gb3JpZ2luWzBdLCB5RXh0ZW50WzEgLSBleV0gLSBvcmlnaW5bMV0gXTtcbiAgICAgICAgb3JpZ2luWzBdID0geEV4dGVudFtleF07XG4gICAgICAgIG9yaWdpblsxXSA9IHlFeHRlbnRbZXldO1xuICAgICAgfSBlbHNlIGlmIChkMy5ldmVudC5hbHRLZXkpIGNlbnRlciA9IG9yaWdpbi5zbGljZSgpO1xuICAgICAgZy5zdHlsZShcInBvaW50ZXItZXZlbnRzXCIsIFwibm9uZVwiKS5zZWxlY3RBbGwoXCIucmVzaXplXCIpLnN0eWxlKFwiZGlzcGxheVwiLCBudWxsKTtcbiAgICAgIGQzLnNlbGVjdChcImJvZHlcIikuc3R5bGUoXCJjdXJzb3JcIiwgZXZlbnRUYXJnZXQuc3R5bGUoXCJjdXJzb3JcIikpO1xuICAgICAgZXZlbnRfKHtcbiAgICAgICAgdHlwZTogXCJicnVzaHN0YXJ0XCJcbiAgICAgIH0pO1xuICAgICAgYnJ1c2htb3ZlKCk7XG4gICAgICBmdW5jdGlvbiBrZXlkb3duKCkge1xuICAgICAgICBpZiAoZDMuZXZlbnQua2V5Q29kZSA9PSAzMikge1xuICAgICAgICAgIGlmICghZHJhZ2dpbmcpIHtcbiAgICAgICAgICAgIGNlbnRlciA9IG51bGw7XG4gICAgICAgICAgICBvcmlnaW5bMF0gLT0geEV4dGVudFsxXTtcbiAgICAgICAgICAgIG9yaWdpblsxXSAtPSB5RXh0ZW50WzFdO1xuICAgICAgICAgICAgZHJhZ2dpbmcgPSAyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkM19ldmVudFByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIGtleXVwKCkge1xuICAgICAgICBpZiAoZDMuZXZlbnQua2V5Q29kZSA9PSAzMiAmJiBkcmFnZ2luZyA9PSAyKSB7XG4gICAgICAgICAgb3JpZ2luWzBdICs9IHhFeHRlbnRbMV07XG4gICAgICAgICAgb3JpZ2luWzFdICs9IHlFeHRlbnRbMV07XG4gICAgICAgICAgZHJhZ2dpbmcgPSAwO1xuICAgICAgICAgIGQzX2V2ZW50UHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZnVuY3Rpb24gYnJ1c2htb3ZlKCkge1xuICAgICAgICB2YXIgcG9pbnQgPSBkMy5tb3VzZSh0YXJnZXQpLCBtb3ZlZCA9IGZhbHNlO1xuICAgICAgICBpZiAob2Zmc2V0KSB7XG4gICAgICAgICAgcG9pbnRbMF0gKz0gb2Zmc2V0WzBdO1xuICAgICAgICAgIHBvaW50WzFdICs9IG9mZnNldFsxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRyYWdnaW5nKSB7XG4gICAgICAgICAgaWYgKGQzLmV2ZW50LmFsdEtleSkge1xuICAgICAgICAgICAgaWYgKCFjZW50ZXIpIGNlbnRlciA9IFsgKHhFeHRlbnRbMF0gKyB4RXh0ZW50WzFdKSAvIDIsICh5RXh0ZW50WzBdICsgeUV4dGVudFsxXSkgLyAyIF07XG4gICAgICAgICAgICBvcmlnaW5bMF0gPSB4RXh0ZW50WysocG9pbnRbMF0gPCBjZW50ZXJbMF0pXTtcbiAgICAgICAgICAgIG9yaWdpblsxXSA9IHlFeHRlbnRbKyhwb2ludFsxXSA8IGNlbnRlclsxXSldO1xuICAgICAgICAgIH0gZWxzZSBjZW50ZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXNpemluZ1ggJiYgbW92ZTEocG9pbnQsIHgsIDApKSB7XG4gICAgICAgICAgcmVkcmF3WChnKTtcbiAgICAgICAgICBtb3ZlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc2l6aW5nWSAmJiBtb3ZlMShwb2ludCwgeSwgMSkpIHtcbiAgICAgICAgICByZWRyYXdZKGcpO1xuICAgICAgICAgIG1vdmVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW92ZWQpIHtcbiAgICAgICAgICByZWRyYXcoZyk7XG4gICAgICAgICAgZXZlbnRfKHtcbiAgICAgICAgICAgIHR5cGU6IFwiYnJ1c2hcIixcbiAgICAgICAgICAgIG1vZGU6IGRyYWdnaW5nID8gXCJtb3ZlXCIgOiBcInJlc2l6ZVwiXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIG1vdmUxKHBvaW50LCBzY2FsZSwgaSkge1xuICAgICAgICB2YXIgcmFuZ2UgPSBkM19zY2FsZVJhbmdlKHNjYWxlKSwgcjAgPSByYW5nZVswXSwgcjEgPSByYW5nZVsxXSwgcG9zaXRpb24gPSBvcmlnaW5baV0sIGV4dGVudCA9IGkgPyB5RXh0ZW50IDogeEV4dGVudCwgc2l6ZSA9IGV4dGVudFsxXSAtIGV4dGVudFswXSwgbWluLCBtYXg7XG4gICAgICAgIGlmIChkcmFnZ2luZykge1xuICAgICAgICAgIHIwIC09IHBvc2l0aW9uO1xuICAgICAgICAgIHIxIC09IHNpemUgKyBwb3NpdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBtaW4gPSAoaSA/IHlDbGFtcCA6IHhDbGFtcCkgPyBNYXRoLm1heChyMCwgTWF0aC5taW4ocjEsIHBvaW50W2ldKSkgOiBwb2ludFtpXTtcbiAgICAgICAgaWYgKGRyYWdnaW5nKSB7XG4gICAgICAgICAgbWF4ID0gKG1pbiArPSBwb3NpdGlvbikgKyBzaXplO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChjZW50ZXIpIHBvc2l0aW9uID0gTWF0aC5tYXgocjAsIE1hdGgubWluKHIxLCAyICogY2VudGVyW2ldIC0gbWluKSk7XG4gICAgICAgICAgaWYgKHBvc2l0aW9uIDwgbWluKSB7XG4gICAgICAgICAgICBtYXggPSBtaW47XG4gICAgICAgICAgICBtaW4gPSBwb3NpdGlvbjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWF4ID0gcG9zaXRpb247XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChleHRlbnRbMF0gIT0gbWluIHx8IGV4dGVudFsxXSAhPSBtYXgpIHtcbiAgICAgICAgICBpZiAoaSkgeUV4dGVudERvbWFpbiA9IG51bGw7IGVsc2UgeEV4dGVudERvbWFpbiA9IG51bGw7XG4gICAgICAgICAgZXh0ZW50WzBdID0gbWluO1xuICAgICAgICAgIGV4dGVudFsxXSA9IG1heDtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZnVuY3Rpb24gYnJ1c2hlbmQoKSB7XG4gICAgICAgIGJydXNobW92ZSgpO1xuICAgICAgICBnLnN0eWxlKFwicG9pbnRlci1ldmVudHNcIiwgXCJhbGxcIikuc2VsZWN0QWxsKFwiLnJlc2l6ZVwiKS5zdHlsZShcImRpc3BsYXlcIiwgYnJ1c2guZW1wdHkoKSA/IFwibm9uZVwiIDogbnVsbCk7XG4gICAgICAgIGQzLnNlbGVjdChcImJvZHlcIikuc3R5bGUoXCJjdXJzb3JcIiwgbnVsbCk7XG4gICAgICAgIHcub24oXCJtb3VzZW1vdmUuYnJ1c2hcIiwgbnVsbCkub24oXCJtb3VzZXVwLmJydXNoXCIsIG51bGwpLm9uKFwidG91Y2htb3ZlLmJydXNoXCIsIG51bGwpLm9uKFwidG91Y2hlbmQuYnJ1c2hcIiwgbnVsbCkub24oXCJrZXlkb3duLmJydXNoXCIsIG51bGwpLm9uKFwia2V5dXAuYnJ1c2hcIiwgbnVsbCk7XG4gICAgICAgIGRyYWdSZXN0b3JlKCk7XG4gICAgICAgIGV2ZW50Xyh7XG4gICAgICAgICAgdHlwZTogXCJicnVzaGVuZFwiXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBicnVzaC54ID0gZnVuY3Rpb24oeikge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geDtcbiAgICAgIHggPSB6O1xuICAgICAgcmVzaXplcyA9IGQzX3N2Z19icnVzaFJlc2l6ZXNbIXggPDwgMSB8ICF5XTtcbiAgICAgIHJldHVybiBicnVzaDtcbiAgICB9O1xuICAgIGJydXNoLnkgPSBmdW5jdGlvbih6KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB5O1xuICAgICAgeSA9IHo7XG4gICAgICByZXNpemVzID0gZDNfc3ZnX2JydXNoUmVzaXplc1sheCA8PCAxIHwgIXldO1xuICAgICAgcmV0dXJuIGJydXNoO1xuICAgIH07XG4gICAgYnJ1c2guY2xhbXAgPSBmdW5jdGlvbih6KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB4ICYmIHkgPyBbIHhDbGFtcCwgeUNsYW1wIF0gOiB4ID8geENsYW1wIDogeSA/IHlDbGFtcCA6IG51bGw7XG4gICAgICBpZiAoeCAmJiB5KSB4Q2xhbXAgPSAhIXpbMF0sIHlDbGFtcCA9ICEhelsxXTsgZWxzZSBpZiAoeCkgeENsYW1wID0gISF6OyBlbHNlIGlmICh5KSB5Q2xhbXAgPSAhIXo7XG4gICAgICByZXR1cm4gYnJ1c2g7XG4gICAgfTtcbiAgICBicnVzaC5leHRlbnQgPSBmdW5jdGlvbih6KSB7XG4gICAgICB2YXIgeDAsIHgxLCB5MCwgeTEsIHQ7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKHgpIHtcbiAgICAgICAgICBpZiAoeEV4dGVudERvbWFpbikge1xuICAgICAgICAgICAgeDAgPSB4RXh0ZW50RG9tYWluWzBdLCB4MSA9IHhFeHRlbnREb21haW5bMV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHgwID0geEV4dGVudFswXSwgeDEgPSB4RXh0ZW50WzFdO1xuICAgICAgICAgICAgaWYgKHguaW52ZXJ0KSB4MCA9IHguaW52ZXJ0KHgwKSwgeDEgPSB4LmludmVydCh4MSk7XG4gICAgICAgICAgICBpZiAoeDEgPCB4MCkgdCA9IHgwLCB4MCA9IHgxLCB4MSA9IHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh5KSB7XG4gICAgICAgICAgaWYgKHlFeHRlbnREb21haW4pIHtcbiAgICAgICAgICAgIHkwID0geUV4dGVudERvbWFpblswXSwgeTEgPSB5RXh0ZW50RG9tYWluWzFdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB5MCA9IHlFeHRlbnRbMF0sIHkxID0geUV4dGVudFsxXTtcbiAgICAgICAgICAgIGlmICh5LmludmVydCkgeTAgPSB5LmludmVydCh5MCksIHkxID0geS5pbnZlcnQoeTEpO1xuICAgICAgICAgICAgaWYgKHkxIDwgeTApIHQgPSB5MCwgeTAgPSB5MSwgeTEgPSB0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geCAmJiB5ID8gWyBbIHgwLCB5MCBdLCBbIHgxLCB5MSBdIF0gOiB4ID8gWyB4MCwgeDEgXSA6IHkgJiYgWyB5MCwgeTEgXTtcbiAgICAgIH1cbiAgICAgIGlmICh4KSB7XG4gICAgICAgIHgwID0gelswXSwgeDEgPSB6WzFdO1xuICAgICAgICBpZiAoeSkgeDAgPSB4MFswXSwgeDEgPSB4MVswXTtcbiAgICAgICAgeEV4dGVudERvbWFpbiA9IFsgeDAsIHgxIF07XG4gICAgICAgIGlmICh4LmludmVydCkgeDAgPSB4KHgwKSwgeDEgPSB4KHgxKTtcbiAgICAgICAgaWYgKHgxIDwgeDApIHQgPSB4MCwgeDAgPSB4MSwgeDEgPSB0O1xuICAgICAgICBpZiAoeDAgIT0geEV4dGVudFswXSB8fCB4MSAhPSB4RXh0ZW50WzFdKSB4RXh0ZW50ID0gWyB4MCwgeDEgXTtcbiAgICAgIH1cbiAgICAgIGlmICh5KSB7XG4gICAgICAgIHkwID0gelswXSwgeTEgPSB6WzFdO1xuICAgICAgICBpZiAoeCkgeTAgPSB5MFsxXSwgeTEgPSB5MVsxXTtcbiAgICAgICAgeUV4dGVudERvbWFpbiA9IFsgeTAsIHkxIF07XG4gICAgICAgIGlmICh5LmludmVydCkgeTAgPSB5KHkwKSwgeTEgPSB5KHkxKTtcbiAgICAgICAgaWYgKHkxIDwgeTApIHQgPSB5MCwgeTAgPSB5MSwgeTEgPSB0O1xuICAgICAgICBpZiAoeTAgIT0geUV4dGVudFswXSB8fCB5MSAhPSB5RXh0ZW50WzFdKSB5RXh0ZW50ID0gWyB5MCwgeTEgXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBicnVzaDtcbiAgICB9O1xuICAgIGJydXNoLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIWJydXNoLmVtcHR5KCkpIHtcbiAgICAgICAgeEV4dGVudCA9IFsgMCwgMCBdLCB5RXh0ZW50ID0gWyAwLCAwIF07XG4gICAgICAgIHhFeHRlbnREb21haW4gPSB5RXh0ZW50RG9tYWluID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBicnVzaDtcbiAgICB9O1xuICAgIGJydXNoLmVtcHR5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF4ICYmIHhFeHRlbnRbMF0gPT0geEV4dGVudFsxXSB8fCAhIXkgJiYgeUV4dGVudFswXSA9PSB5RXh0ZW50WzFdO1xuICAgIH07XG4gICAgcmV0dXJuIGQzLnJlYmluZChicnVzaCwgZXZlbnQsIFwib25cIik7XG4gIH07XG4gIHZhciBkM19zdmdfYnJ1c2hDdXJzb3IgPSB7XG4gICAgbjogXCJucy1yZXNpemVcIixcbiAgICBlOiBcImV3LXJlc2l6ZVwiLFxuICAgIHM6IFwibnMtcmVzaXplXCIsXG4gICAgdzogXCJldy1yZXNpemVcIixcbiAgICBudzogXCJud3NlLXJlc2l6ZVwiLFxuICAgIG5lOiBcIm5lc3ctcmVzaXplXCIsXG4gICAgc2U6IFwibndzZS1yZXNpemVcIixcbiAgICBzdzogXCJuZXN3LXJlc2l6ZVwiXG4gIH07XG4gIHZhciBkM19zdmdfYnJ1c2hSZXNpemVzID0gWyBbIFwiblwiLCBcImVcIiwgXCJzXCIsIFwid1wiLCBcIm53XCIsIFwibmVcIiwgXCJzZVwiLCBcInN3XCIgXSwgWyBcImVcIiwgXCJ3XCIgXSwgWyBcIm5cIiwgXCJzXCIgXSwgW10gXTtcbiAgdmFyIGQzX3RpbWVfZm9ybWF0ID0gZDNfdGltZS5mb3JtYXQgPSBkM19sb2NhbGVfZW5VUy50aW1lRm9ybWF0O1xuICB2YXIgZDNfdGltZV9mb3JtYXRVdGMgPSBkM190aW1lX2Zvcm1hdC51dGM7XG4gIHZhciBkM190aW1lX2Zvcm1hdElzbyA9IGQzX3RpbWVfZm9ybWF0VXRjKFwiJVktJW0tJWRUJUg6JU06JVMuJUxaXCIpO1xuICBkM190aW1lX2Zvcm1hdC5pc28gPSBEYXRlLnByb3RvdHlwZS50b0lTT1N0cmluZyAmJiArbmV3IERhdGUoXCIyMDAwLTAxLTAxVDAwOjAwOjAwLjAwMFpcIikgPyBkM190aW1lX2Zvcm1hdElzb05hdGl2ZSA6IGQzX3RpbWVfZm9ybWF0SXNvO1xuICBmdW5jdGlvbiBkM190aW1lX2Zvcm1hdElzb05hdGl2ZShkYXRlKSB7XG4gICAgcmV0dXJuIGRhdGUudG9JU09TdHJpbmcoKTtcbiAgfVxuICBkM190aW1lX2Zvcm1hdElzb05hdGl2ZS5wYXJzZSA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoc3RyaW5nKTtcbiAgICByZXR1cm4gaXNOYU4oZGF0ZSkgPyBudWxsIDogZGF0ZTtcbiAgfTtcbiAgZDNfdGltZV9mb3JtYXRJc29OYXRpdmUudG9TdHJpbmcgPSBkM190aW1lX2Zvcm1hdElzby50b1N0cmluZztcbiAgZDNfdGltZS5zZWNvbmQgPSBkM190aW1lX2ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICByZXR1cm4gbmV3IGQzX2RhdGUoTWF0aC5mbG9vcihkYXRlIC8gMWUzKSAqIDFlMyk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIG9mZnNldCkge1xuICAgIGRhdGUuc2V0VGltZShkYXRlLmdldFRpbWUoKSArIE1hdGguZmxvb3Iob2Zmc2V0KSAqIDFlMyk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICByZXR1cm4gZGF0ZS5nZXRTZWNvbmRzKCk7XG4gIH0pO1xuICBkM190aW1lLnNlY29uZHMgPSBkM190aW1lLnNlY29uZC5yYW5nZTtcbiAgZDNfdGltZS5zZWNvbmRzLnV0YyA9IGQzX3RpbWUuc2Vjb25kLnV0Yy5yYW5nZTtcbiAgZDNfdGltZS5taW51dGUgPSBkM190aW1lX2ludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICByZXR1cm4gbmV3IGQzX2RhdGUoTWF0aC5mbG9vcihkYXRlIC8gNmU0KSAqIDZlNCk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIG9mZnNldCkge1xuICAgIGRhdGUuc2V0VGltZShkYXRlLmdldFRpbWUoKSArIE1hdGguZmxvb3Iob2Zmc2V0KSAqIDZlNCk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICByZXR1cm4gZGF0ZS5nZXRNaW51dGVzKCk7XG4gIH0pO1xuICBkM190aW1lLm1pbnV0ZXMgPSBkM190aW1lLm1pbnV0ZS5yYW5nZTtcbiAgZDNfdGltZS5taW51dGVzLnV0YyA9IGQzX3RpbWUubWludXRlLnV0Yy5yYW5nZTtcbiAgZDNfdGltZS5ob3VyID0gZDNfdGltZV9pbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgdmFyIHRpbWV6b25lID0gZGF0ZS5nZXRUaW1lem9uZU9mZnNldCgpIC8gNjA7XG4gICAgcmV0dXJuIG5ldyBkM19kYXRlKChNYXRoLmZsb29yKGRhdGUgLyAzNmU1IC0gdGltZXpvbmUpICsgdGltZXpvbmUpICogMzZlNSk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIG9mZnNldCkge1xuICAgIGRhdGUuc2V0VGltZShkYXRlLmdldFRpbWUoKSArIE1hdGguZmxvb3Iob2Zmc2V0KSAqIDM2ZTUpO1xuICB9LCBmdW5jdGlvbihkYXRlKSB7XG4gICAgcmV0dXJuIGRhdGUuZ2V0SG91cnMoKTtcbiAgfSk7XG4gIGQzX3RpbWUuaG91cnMgPSBkM190aW1lLmhvdXIucmFuZ2U7XG4gIGQzX3RpbWUuaG91cnMudXRjID0gZDNfdGltZS5ob3VyLnV0Yy5yYW5nZTtcbiAgZDNfdGltZS5tb250aCA9IGQzX3RpbWVfaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUgPSBkM190aW1lLmRheShkYXRlKTtcbiAgICBkYXRlLnNldERhdGUoMSk7XG4gICAgcmV0dXJuIGRhdGU7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIG9mZnNldCkge1xuICAgIGRhdGUuc2V0TW9udGgoZGF0ZS5nZXRNb250aCgpICsgb2Zmc2V0KTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSkge1xuICAgIHJldHVybiBkYXRlLmdldE1vbnRoKCk7XG4gIH0pO1xuICBkM190aW1lLm1vbnRocyA9IGQzX3RpbWUubW9udGgucmFuZ2U7XG4gIGQzX3RpbWUubW9udGhzLnV0YyA9IGQzX3RpbWUubW9udGgudXRjLnJhbmdlO1xuICBmdW5jdGlvbiBkM190aW1lX3NjYWxlKGxpbmVhciwgbWV0aG9kcywgZm9ybWF0KSB7XG4gICAgZnVuY3Rpb24gc2NhbGUoeCkge1xuICAgICAgcmV0dXJuIGxpbmVhcih4KTtcbiAgICB9XG4gICAgc2NhbGUuaW52ZXJ0ID0gZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIGQzX3RpbWVfc2NhbGVEYXRlKGxpbmVhci5pbnZlcnQoeCkpO1xuICAgIH07XG4gICAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbGluZWFyLmRvbWFpbigpLm1hcChkM190aW1lX3NjYWxlRGF0ZSk7XG4gICAgICBsaW5lYXIuZG9tYWluKHgpO1xuICAgICAgcmV0dXJuIHNjYWxlO1xuICAgIH07XG4gICAgZnVuY3Rpb24gdGlja01ldGhvZChleHRlbnQsIGNvdW50KSB7XG4gICAgICB2YXIgc3BhbiA9IGV4dGVudFsxXSAtIGV4dGVudFswXSwgdGFyZ2V0ID0gc3BhbiAvIGNvdW50LCBpID0gZDMuYmlzZWN0KGQzX3RpbWVfc2NhbGVTdGVwcywgdGFyZ2V0KTtcbiAgICAgIHJldHVybiBpID09IGQzX3RpbWVfc2NhbGVTdGVwcy5sZW5ndGggPyBbIG1ldGhvZHMueWVhciwgZDNfc2NhbGVfbGluZWFyVGlja1JhbmdlKGV4dGVudC5tYXAoZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gZCAvIDMxNTM2ZTY7XG4gICAgICB9KSwgY291bnQpWzJdIF0gOiAhaSA/IFsgZDNfdGltZV9zY2FsZU1pbGxpc2Vjb25kcywgZDNfc2NhbGVfbGluZWFyVGlja1JhbmdlKGV4dGVudCwgY291bnQpWzJdIF0gOiBtZXRob2RzW3RhcmdldCAvIGQzX3RpbWVfc2NhbGVTdGVwc1tpIC0gMV0gPCBkM190aW1lX3NjYWxlU3RlcHNbaV0gLyB0YXJnZXQgPyBpIC0gMSA6IGldO1xuICAgIH1cbiAgICBzY2FsZS5uaWNlID0gZnVuY3Rpb24oaW50ZXJ2YWwsIHNraXApIHtcbiAgICAgIHZhciBkb21haW4gPSBzY2FsZS5kb21haW4oKSwgZXh0ZW50ID0gZDNfc2NhbGVFeHRlbnQoZG9tYWluKSwgbWV0aG9kID0gaW50ZXJ2YWwgPT0gbnVsbCA/IHRpY2tNZXRob2QoZXh0ZW50LCAxMCkgOiB0eXBlb2YgaW50ZXJ2YWwgPT09IFwibnVtYmVyXCIgJiYgdGlja01ldGhvZChleHRlbnQsIGludGVydmFsKTtcbiAgICAgIGlmIChtZXRob2QpIGludGVydmFsID0gbWV0aG9kWzBdLCBza2lwID0gbWV0aG9kWzFdO1xuICAgICAgZnVuY3Rpb24gc2tpcHBlZChkYXRlKSB7XG4gICAgICAgIHJldHVybiAhaXNOYU4oZGF0ZSkgJiYgIWludGVydmFsLnJhbmdlKGRhdGUsIGQzX3RpbWVfc2NhbGVEYXRlKCtkYXRlICsgMSksIHNraXApLmxlbmd0aDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzY2FsZS5kb21haW4oZDNfc2NhbGVfbmljZShkb21haW4sIHNraXAgPiAxID8ge1xuICAgICAgICBmbG9vcjogZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgICAgIHdoaWxlIChza2lwcGVkKGRhdGUgPSBpbnRlcnZhbC5mbG9vcihkYXRlKSkpIGRhdGUgPSBkM190aW1lX3NjYWxlRGF0ZShkYXRlIC0gMSk7XG4gICAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIGNlaWw6IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgICAgICB3aGlsZSAoc2tpcHBlZChkYXRlID0gaW50ZXJ2YWwuY2VpbChkYXRlKSkpIGRhdGUgPSBkM190aW1lX3NjYWxlRGF0ZSgrZGF0ZSArIDEpO1xuICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICB9XG4gICAgICB9IDogaW50ZXJ2YWwpKTtcbiAgICB9O1xuICAgIHNjYWxlLnRpY2tzID0gZnVuY3Rpb24oaW50ZXJ2YWwsIHNraXApIHtcbiAgICAgIHZhciBleHRlbnQgPSBkM19zY2FsZUV4dGVudChzY2FsZS5kb21haW4oKSksIG1ldGhvZCA9IGludGVydmFsID09IG51bGwgPyB0aWNrTWV0aG9kKGV4dGVudCwgMTApIDogdHlwZW9mIGludGVydmFsID09PSBcIm51bWJlclwiID8gdGlja01ldGhvZChleHRlbnQsIGludGVydmFsKSA6ICFpbnRlcnZhbC5yYW5nZSAmJiBbIHtcbiAgICAgICAgcmFuZ2U6IGludGVydmFsXG4gICAgICB9LCBza2lwIF07XG4gICAgICBpZiAobWV0aG9kKSBpbnRlcnZhbCA9IG1ldGhvZFswXSwgc2tpcCA9IG1ldGhvZFsxXTtcbiAgICAgIHJldHVybiBpbnRlcnZhbC5yYW5nZShleHRlbnRbMF0sIGQzX3RpbWVfc2NhbGVEYXRlKCtleHRlbnRbMV0gKyAxKSwgc2tpcCA8IDEgPyAxIDogc2tpcCk7XG4gICAgfTtcbiAgICBzY2FsZS50aWNrRm9ybWF0ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZm9ybWF0O1xuICAgIH07XG4gICAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGQzX3RpbWVfc2NhbGUobGluZWFyLmNvcHkoKSwgbWV0aG9kcywgZm9ybWF0KTtcbiAgICB9O1xuICAgIHJldHVybiBkM19zY2FsZV9saW5lYXJSZWJpbmQoc2NhbGUsIGxpbmVhcik7XG4gIH1cbiAgZnVuY3Rpb24gZDNfdGltZV9zY2FsZURhdGUodCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSh0KTtcbiAgfVxuICB2YXIgZDNfdGltZV9zY2FsZVN0ZXBzID0gWyAxZTMsIDVlMywgMTVlMywgM2U0LCA2ZTQsIDNlNSwgOWU1LCAxOGU1LCAzNmU1LCAxMDhlNSwgMjE2ZTUsIDQzMmU1LCA4NjRlNSwgMTcyOGU1LCA2MDQ4ZTUsIDI1OTJlNiwgNzc3NmU2LCAzMTUzNmU2IF07XG4gIHZhciBkM190aW1lX3NjYWxlTG9jYWxNZXRob2RzID0gWyBbIGQzX3RpbWUuc2Vjb25kLCAxIF0sIFsgZDNfdGltZS5zZWNvbmQsIDUgXSwgWyBkM190aW1lLnNlY29uZCwgMTUgXSwgWyBkM190aW1lLnNlY29uZCwgMzAgXSwgWyBkM190aW1lLm1pbnV0ZSwgMSBdLCBbIGQzX3RpbWUubWludXRlLCA1IF0sIFsgZDNfdGltZS5taW51dGUsIDE1IF0sIFsgZDNfdGltZS5taW51dGUsIDMwIF0sIFsgZDNfdGltZS5ob3VyLCAxIF0sIFsgZDNfdGltZS5ob3VyLCAzIF0sIFsgZDNfdGltZS5ob3VyLCA2IF0sIFsgZDNfdGltZS5ob3VyLCAxMiBdLCBbIGQzX3RpbWUuZGF5LCAxIF0sIFsgZDNfdGltZS5kYXksIDIgXSwgWyBkM190aW1lLndlZWssIDEgXSwgWyBkM190aW1lLm1vbnRoLCAxIF0sIFsgZDNfdGltZS5tb250aCwgMyBdLCBbIGQzX3RpbWUueWVhciwgMSBdIF07XG4gIHZhciBkM190aW1lX3NjYWxlTG9jYWxGb3JtYXQgPSBkM190aW1lX2Zvcm1hdC5tdWx0aShbIFsgXCIuJUxcIiwgZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiBkLmdldE1pbGxpc2Vjb25kcygpO1xuICB9IF0sIFsgXCI6JVNcIiwgZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiBkLmdldFNlY29uZHMoKTtcbiAgfSBdLCBbIFwiJUk6JU1cIiwgZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiBkLmdldE1pbnV0ZXMoKTtcbiAgfSBdLCBbIFwiJUkgJXBcIiwgZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiBkLmdldEhvdXJzKCk7XG4gIH0gXSwgWyBcIiVhICVkXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gZC5nZXREYXkoKSAmJiBkLmdldERhdGUoKSAhPSAxO1xuICB9IF0sIFsgXCIlYiAlZFwiLCBmdW5jdGlvbihkKSB7XG4gICAgcmV0dXJuIGQuZ2V0RGF0ZSgpICE9IDE7XG4gIH0gXSwgWyBcIiVCXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gZC5nZXRNb250aCgpO1xuICB9IF0sIFsgXCIlWVwiLCBkM190cnVlIF0gXSk7XG4gIHZhciBkM190aW1lX3NjYWxlTWlsbGlzZWNvbmRzID0ge1xuICAgIHJhbmdlOiBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgICAgcmV0dXJuIGQzLnJhbmdlKCtzdGFydCwgK3N0b3AsIHN0ZXApLm1hcChkM190aW1lX3NjYWxlRGF0ZSk7XG4gICAgfSxcbiAgICBmbG9vcjogZDNfaWRlbnRpdHksXG4gICAgY2VpbDogZDNfaWRlbnRpdHlcbiAgfTtcbiAgZDNfdGltZV9zY2FsZUxvY2FsTWV0aG9kcy55ZWFyID0gZDNfdGltZS55ZWFyO1xuICBkM190aW1lLnNjYWxlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGQzX3RpbWVfc2NhbGUoZDMuc2NhbGUubGluZWFyKCksIGQzX3RpbWVfc2NhbGVMb2NhbE1ldGhvZHMsIGQzX3RpbWVfc2NhbGVMb2NhbEZvcm1hdCk7XG4gIH07XG4gIHZhciBkM190aW1lX3NjYWxlVXRjTWV0aG9kcyA9IGQzX3RpbWVfc2NhbGVMb2NhbE1ldGhvZHMubWFwKGZ1bmN0aW9uKG0pIHtcbiAgICByZXR1cm4gWyBtWzBdLnV0YywgbVsxXSBdO1xuICB9KTtcbiAgdmFyIGQzX3RpbWVfc2NhbGVVdGNGb3JtYXQgPSBkM190aW1lX2Zvcm1hdFV0Yy5tdWx0aShbIFsgXCIuJUxcIiwgZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiBkLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuICB9IF0sIFsgXCI6JVNcIiwgZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiBkLmdldFVUQ1NlY29uZHMoKTtcbiAgfSBdLCBbIFwiJUk6JU1cIiwgZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiBkLmdldFVUQ01pbnV0ZXMoKTtcbiAgfSBdLCBbIFwiJUkgJXBcIiwgZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiBkLmdldFVUQ0hvdXJzKCk7XG4gIH0gXSwgWyBcIiVhICVkXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gZC5nZXRVVENEYXkoKSAmJiBkLmdldFVUQ0RhdGUoKSAhPSAxO1xuICB9IF0sIFsgXCIlYiAlZFwiLCBmdW5jdGlvbihkKSB7XG4gICAgcmV0dXJuIGQuZ2V0VVRDRGF0ZSgpICE9IDE7XG4gIH0gXSwgWyBcIiVCXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gZC5nZXRVVENNb250aCgpO1xuICB9IF0sIFsgXCIlWVwiLCBkM190cnVlIF0gXSk7XG4gIGQzX3RpbWVfc2NhbGVVdGNNZXRob2RzLnllYXIgPSBkM190aW1lLnllYXIudXRjO1xuICBkM190aW1lLnNjYWxlLnV0YyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkM190aW1lX3NjYWxlKGQzLnNjYWxlLmxpbmVhcigpLCBkM190aW1lX3NjYWxlVXRjTWV0aG9kcywgZDNfdGltZV9zY2FsZVV0Y0Zvcm1hdCk7XG4gIH07XG4gIGQzLnRleHQgPSBkM194aHJUeXBlKGZ1bmN0aW9uKHJlcXVlc3QpIHtcbiAgICByZXR1cm4gcmVxdWVzdC5yZXNwb25zZVRleHQ7XG4gIH0pO1xuICBkMy5qc29uID0gZnVuY3Rpb24odXJsLCBjYWxsYmFjaykge1xuICAgIHJldHVybiBkM194aHIodXJsLCBcImFwcGxpY2F0aW9uL2pzb25cIiwgZDNfanNvbiwgY2FsbGJhY2spO1xuICB9O1xuICBmdW5jdGlvbiBkM19qc29uKHJlcXVlc3QpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlVGV4dCk7XG4gIH1cbiAgZDMuaHRtbCA9IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gZDNfeGhyKHVybCwgXCJ0ZXh0L2h0bWxcIiwgZDNfaHRtbCwgY2FsbGJhY2spO1xuICB9O1xuICBmdW5jdGlvbiBkM19odG1sKHJlcXVlc3QpIHtcbiAgICB2YXIgcmFuZ2UgPSBkM19kb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgIHJhbmdlLnNlbGVjdE5vZGUoZDNfZG9jdW1lbnQuYm9keSk7XG4gICAgcmV0dXJuIHJhbmdlLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudChyZXF1ZXN0LnJlc3BvbnNlVGV4dCk7XG4gIH1cbiAgZDMueG1sID0gZDNfeGhyVHlwZShmdW5jdGlvbihyZXF1ZXN0KSB7XG4gICAgcmV0dXJuIHJlcXVlc3QucmVzcG9uc2VYTUw7XG4gIH0pO1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoZDMpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09IFwib2JqZWN0XCIgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGQzO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZDMgPSBkMztcbiAgfVxufSgpOyIsIi8qKlxuICogQHByZXNlcnZlIEZhc3RDbGljazogcG9seWZpbGwgdG8gcmVtb3ZlIGNsaWNrIGRlbGF5cyBvbiBicm93c2VycyB3aXRoIHRvdWNoIFVJcy5cbiAqXG4gKiBAdmVyc2lvbiAxLjAuMFxuICogQGNvZGluZ3N0YW5kYXJkIGZ0bGFicy1qc3YyXG4gKiBAY29weXJpZ2h0IFRoZSBGaW5hbmNpYWwgVGltZXMgTGltaXRlZCBbQWxsIFJpZ2h0cyBSZXNlcnZlZF1cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChzZWUgTElDRU5TRS50eHQpXG4gKi9cblxuLypqc2xpbnQgYnJvd3Nlcjp0cnVlLCBub2RlOnRydWUqL1xuLypnbG9iYWwgZGVmaW5lLCBFdmVudCwgTm9kZSovXG5cblxuLyoqXG4gKiBJbnN0YW50aWF0ZSBmYXN0LWNsaWNraW5nIGxpc3RlbmVycyBvbiB0aGUgc3BlY2lmaWNlZCBsYXllci5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7RWxlbWVudH0gbGF5ZXIgVGhlIGxheWVyIHRvIGxpc3RlbiBvblxuICovXG5mdW5jdGlvbiBGYXN0Q2xpY2sobGF5ZXIpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXIgb2xkT25DbGljaztcblxuXG5cdC8qKlxuXHQgKiBXaGV0aGVyIGEgY2xpY2sgaXMgY3VycmVudGx5IGJlaW5nIHRyYWNrZWQuXG5cdCAqXG5cdCAqIEB0eXBlIGJvb2xlYW5cblx0ICovXG5cdHRoaXMudHJhY2tpbmdDbGljayA9IGZhbHNlO1xuXG5cblx0LyoqXG5cdCAqIFRpbWVzdGFtcCBmb3Igd2hlbiB3aGVuIGNsaWNrIHRyYWNraW5nIHN0YXJ0ZWQuXG5cdCAqXG5cdCAqIEB0eXBlIG51bWJlclxuXHQgKi9cblx0dGhpcy50cmFja2luZ0NsaWNrU3RhcnQgPSAwO1xuXG5cblx0LyoqXG5cdCAqIFRoZSBlbGVtZW50IGJlaW5nIHRyYWNrZWQgZm9yIGEgY2xpY2suXG5cdCAqXG5cdCAqIEB0eXBlIEV2ZW50VGFyZ2V0XG5cdCAqL1xuXHR0aGlzLnRhcmdldEVsZW1lbnQgPSBudWxsO1xuXG5cblx0LyoqXG5cdCAqIFgtY29vcmRpbmF0ZSBvZiB0b3VjaCBzdGFydCBldmVudC5cblx0ICpcblx0ICogQHR5cGUgbnVtYmVyXG5cdCAqL1xuXHR0aGlzLnRvdWNoU3RhcnRYID0gMDtcblxuXG5cdC8qKlxuXHQgKiBZLWNvb3JkaW5hdGUgb2YgdG91Y2ggc3RhcnQgZXZlbnQuXG5cdCAqXG5cdCAqIEB0eXBlIG51bWJlclxuXHQgKi9cblx0dGhpcy50b3VjaFN0YXJ0WSA9IDA7XG5cblxuXHQvKipcblx0ICogSUQgb2YgdGhlIGxhc3QgdG91Y2gsIHJldHJpZXZlZCBmcm9tIFRvdWNoLmlkZW50aWZpZXIuXG5cdCAqXG5cdCAqIEB0eXBlIG51bWJlclxuXHQgKi9cblx0dGhpcy5sYXN0VG91Y2hJZGVudGlmaWVyID0gMDtcblxuXG5cdC8qKlxuXHQgKiBUb3VjaG1vdmUgYm91bmRhcnksIGJleW9uZCB3aGljaCBhIGNsaWNrIHdpbGwgYmUgY2FuY2VsbGVkLlxuXHQgKlxuXHQgKiBAdHlwZSBudW1iZXJcblx0ICovXG5cdHRoaXMudG91Y2hCb3VuZGFyeSA9IDEwO1xuXG5cblx0LyoqXG5cdCAqIFRoZSBGYXN0Q2xpY2sgbGF5ZXIuXG5cdCAqXG5cdCAqIEB0eXBlIEVsZW1lbnRcblx0ICovXG5cdHRoaXMubGF5ZXIgPSBsYXllcjtcblxuXHRpZiAoRmFzdENsaWNrLm5vdE5lZWRlZChsYXllcikpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHQvLyBTb21lIG9sZCB2ZXJzaW9ucyBvZiBBbmRyb2lkIGRvbid0IGhhdmUgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmRcblx0ZnVuY3Rpb24gYmluZChtZXRob2QsIGNvbnRleHQpIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiBtZXRob2QuYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTsgfTtcblx0fVxuXG5cdC8vIFNldCB1cCBldmVudCBoYW5kbGVycyBhcyByZXF1aXJlZFxuXHRpZiAoZGV2aWNlSXNBbmRyb2lkKSB7XG5cdFx0bGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdmVyJywgYmluZCh0aGlzLm9uTW91c2UsIHRoaXMpLCB0cnVlKTtcblx0XHRsYXllci5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBiaW5kKHRoaXMub25Nb3VzZSwgdGhpcyksIHRydWUpO1xuXHRcdGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBiaW5kKHRoaXMub25Nb3VzZSwgdGhpcyksIHRydWUpO1xuXHR9XG5cblx0bGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBiaW5kKHRoaXMub25DbGljaywgdGhpcyksIHRydWUpO1xuXHRsYXllci5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgYmluZCh0aGlzLm9uVG91Y2hTdGFydCwgdGhpcyksIGZhbHNlKTtcblx0bGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgYmluZCh0aGlzLm9uVG91Y2hNb3ZlLCB0aGlzKSwgZmFsc2UpO1xuXHRsYXllci5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIGJpbmQodGhpcy5vblRvdWNoRW5kLCB0aGlzKSwgZmFsc2UpO1xuXHRsYXllci5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGNhbmNlbCcsIGJpbmQodGhpcy5vblRvdWNoQ2FuY2VsLCB0aGlzKSwgZmFsc2UpO1xuXG5cdC8vIEhhY2sgaXMgcmVxdWlyZWQgZm9yIGJyb3dzZXJzIHRoYXQgZG9uJ3Qgc3VwcG9ydCBFdmVudCNzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24gKGUuZy4gQW5kcm9pZCAyKVxuXHQvLyB3aGljaCBpcyBob3cgRmFzdENsaWNrIG5vcm1hbGx5IHN0b3BzIGNsaWNrIGV2ZW50cyBidWJibGluZyB0byBjYWxsYmFja3MgcmVnaXN0ZXJlZCBvbiB0aGUgRmFzdENsaWNrXG5cdC8vIGxheWVyIHdoZW4gdGhleSBhcmUgY2FuY2VsbGVkLlxuXHRpZiAoIUV2ZW50LnByb3RvdHlwZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24pIHtcblx0XHRsYXllci5yZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgY2FsbGJhY2ssIGNhcHR1cmUpIHtcblx0XHRcdHZhciBybXYgPSBOb2RlLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyO1xuXHRcdFx0aWYgKHR5cGUgPT09ICdjbGljaycpIHtcblx0XHRcdFx0cm12LmNhbGwobGF5ZXIsIHR5cGUsIGNhbGxiYWNrLmhpamFja2VkIHx8IGNhbGxiYWNrLCBjYXB0dXJlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJtdi5jYWxsKGxheWVyLCB0eXBlLCBjYWxsYmFjaywgY2FwdHVyZSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGxheWVyLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBjYWxsYmFjaywgY2FwdHVyZSkge1xuXHRcdFx0dmFyIGFkdiA9IE5vZGUucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXI7XG5cdFx0XHRpZiAodHlwZSA9PT0gJ2NsaWNrJykge1xuXHRcdFx0XHRhZHYuY2FsbChsYXllciwgdHlwZSwgY2FsbGJhY2suaGlqYWNrZWQgfHwgKGNhbGxiYWNrLmhpamFja2VkID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0XHRpZiAoIWV2ZW50LnByb3BhZ2F0aW9uU3RvcHBlZCkge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2soZXZlbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksIGNhcHR1cmUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YWR2LmNhbGwobGF5ZXIsIHR5cGUsIGNhbGxiYWNrLCBjYXB0dXJlKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cblx0Ly8gSWYgYSBoYW5kbGVyIGlzIGFscmVhZHkgZGVjbGFyZWQgaW4gdGhlIGVsZW1lbnQncyBvbmNsaWNrIGF0dHJpYnV0ZSwgaXQgd2lsbCBiZSBmaXJlZCBiZWZvcmVcblx0Ly8gRmFzdENsaWNrJ3Mgb25DbGljayBoYW5kbGVyLiBGaXggdGhpcyBieSBwdWxsaW5nIG91dCB0aGUgdXNlci1kZWZpbmVkIGhhbmRsZXIgZnVuY3Rpb24gYW5kXG5cdC8vIGFkZGluZyBpdCBhcyBsaXN0ZW5lci5cblx0aWYgKHR5cGVvZiBsYXllci5vbmNsaWNrID09PSAnZnVuY3Rpb24nKSB7XG5cblx0XHQvLyBBbmRyb2lkIGJyb3dzZXIgb24gYXQgbGVhc3QgMy4yIHJlcXVpcmVzIGEgbmV3IHJlZmVyZW5jZSB0byB0aGUgZnVuY3Rpb24gaW4gbGF5ZXIub25jbGlja1xuXHRcdC8vIC0gdGhlIG9sZCBvbmUgd29uJ3Qgd29yayBpZiBwYXNzZWQgdG8gYWRkRXZlbnRMaXN0ZW5lciBkaXJlY3RseS5cblx0XHRvbGRPbkNsaWNrID0gbGF5ZXIub25jbGljaztcblx0XHRsYXllci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRvbGRPbkNsaWNrKGV2ZW50KTtcblx0XHR9LCBmYWxzZSk7XG5cdFx0bGF5ZXIub25jbGljayA9IG51bGw7XG5cdH1cbn1cblxuXG4vKipcbiAqIEFuZHJvaWQgcmVxdWlyZXMgZXhjZXB0aW9ucy5cbiAqXG4gKiBAdHlwZSBib29sZWFuXG4gKi9cbnZhciBkZXZpY2VJc0FuZHJvaWQgPSBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ0FuZHJvaWQnKSA+IDA7XG5cblxuLyoqXG4gKiBpT1MgcmVxdWlyZXMgZXhjZXB0aW9ucy5cbiAqXG4gKiBAdHlwZSBib29sZWFuXG4gKi9cbnZhciBkZXZpY2VJc0lPUyA9IC9pUChhZHxob25lfG9kKS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcblxuXG4vKipcbiAqIGlPUyA0IHJlcXVpcmVzIGFuIGV4Y2VwdGlvbiBmb3Igc2VsZWN0IGVsZW1lbnRzLlxuICpcbiAqIEB0eXBlIGJvb2xlYW5cbiAqL1xudmFyIGRldmljZUlzSU9TNCA9IGRldmljZUlzSU9TICYmICgvT1MgNF9cXGQoX1xcZCk/LykudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcblxuXG4vKipcbiAqIGlPUyA2LjAoKz8pIHJlcXVpcmVzIHRoZSB0YXJnZXQgZWxlbWVudCB0byBiZSBtYW51YWxseSBkZXJpdmVkXG4gKlxuICogQHR5cGUgYm9vbGVhblxuICovXG52YXIgZGV2aWNlSXNJT1NXaXRoQmFkVGFyZ2V0ID0gZGV2aWNlSXNJT1MgJiYgKC9PUyAoWzYtOV18XFxkezJ9KV9cXGQvKS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xuXG5cbi8qKlxuICogRGV0ZXJtaW5lIHdoZXRoZXIgYSBnaXZlbiBlbGVtZW50IHJlcXVpcmVzIGEgbmF0aXZlIGNsaWNrLlxuICpcbiAqIEBwYXJhbSB7RXZlbnRUYXJnZXR8RWxlbWVudH0gdGFyZ2V0IFRhcmdldCBET00gZWxlbWVudFxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiB0aGUgZWxlbWVudCBuZWVkcyBhIG5hdGl2ZSBjbGlja1xuICovXG5GYXN0Q2xpY2sucHJvdG90eXBlLm5lZWRzQ2xpY2sgPSBmdW5jdGlvbih0YXJnZXQpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRzd2l0Y2ggKHRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG5cblx0Ly8gRG9uJ3Qgc2VuZCBhIHN5bnRoZXRpYyBjbGljayB0byBkaXNhYmxlZCBpbnB1dHMgKGlzc3VlICM2Milcblx0Y2FzZSAnYnV0dG9uJzpcblx0Y2FzZSAnc2VsZWN0Jzpcblx0Y2FzZSAndGV4dGFyZWEnOlxuXHRcdGlmICh0YXJnZXQuZGlzYWJsZWQpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdGJyZWFrO1xuXHRjYXNlICdpbnB1dCc6XG5cblx0XHQvLyBGaWxlIGlucHV0cyBuZWVkIHJlYWwgY2xpY2tzIG9uIGlPUyA2IGR1ZSB0byBhIGJyb3dzZXIgYnVnIChpc3N1ZSAjNjgpXG5cdFx0aWYgKChkZXZpY2VJc0lPUyAmJiB0YXJnZXQudHlwZSA9PT0gJ2ZpbGUnKSB8fCB0YXJnZXQuZGlzYWJsZWQpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdGJyZWFrO1xuXHRjYXNlICdsYWJlbCc6XG5cdGNhc2UgJ3ZpZGVvJzpcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHJldHVybiAoL1xcYm5lZWRzY2xpY2tcXGIvKS50ZXN0KHRhcmdldC5jbGFzc05hbWUpO1xufTtcblxuXG4vKipcbiAqIERldGVybWluZSB3aGV0aGVyIGEgZ2l2ZW4gZWxlbWVudCByZXF1aXJlcyBhIGNhbGwgdG8gZm9jdXMgdG8gc2ltdWxhdGUgY2xpY2sgaW50byBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7RXZlbnRUYXJnZXR8RWxlbWVudH0gdGFyZ2V0IFRhcmdldCBET00gZWxlbWVudFxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiB0aGUgZWxlbWVudCByZXF1aXJlcyBhIGNhbGwgdG8gZm9jdXMgdG8gc2ltdWxhdGUgbmF0aXZlIGNsaWNrLlxuICovXG5GYXN0Q2xpY2sucHJvdG90eXBlLm5lZWRzRm9jdXMgPSBmdW5jdGlvbih0YXJnZXQpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRzd2l0Y2ggKHRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG5cdGNhc2UgJ3RleHRhcmVhJzpcblx0XHRyZXR1cm4gdHJ1ZTtcblx0Y2FzZSAnc2VsZWN0Jzpcblx0XHRyZXR1cm4gIWRldmljZUlzQW5kcm9pZDtcblx0Y2FzZSAnaW5wdXQnOlxuXHRcdHN3aXRjaCAodGFyZ2V0LnR5cGUpIHtcblx0XHRjYXNlICdidXR0b24nOlxuXHRcdGNhc2UgJ2NoZWNrYm94Jzpcblx0XHRjYXNlICdmaWxlJzpcblx0XHRjYXNlICdpbWFnZSc6XG5cdFx0Y2FzZSAncmFkaW8nOlxuXHRcdGNhc2UgJ3N1Ym1pdCc6XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gTm8gcG9pbnQgaW4gYXR0ZW1wdGluZyB0byBmb2N1cyBkaXNhYmxlZCBpbnB1dHNcblx0XHRyZXR1cm4gIXRhcmdldC5kaXNhYmxlZCAmJiAhdGFyZ2V0LnJlYWRPbmx5O1xuXHRkZWZhdWx0OlxuXHRcdHJldHVybiAoL1xcYm5lZWRzZm9jdXNcXGIvKS50ZXN0KHRhcmdldC5jbGFzc05hbWUpO1xuXHR9XG59O1xuXG5cbi8qKlxuICogU2VuZCBhIGNsaWNrIGV2ZW50IHRvIHRoZSBzcGVjaWZpZWQgZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge0V2ZW50VGFyZ2V0fEVsZW1lbnR9IHRhcmdldEVsZW1lbnRcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50XG4gKi9cbkZhc3RDbGljay5wcm90b3R5cGUuc2VuZENsaWNrID0gZnVuY3Rpb24odGFyZ2V0RWxlbWVudCwgZXZlbnQpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXIgY2xpY2tFdmVudCwgdG91Y2g7XG5cblx0Ly8gT24gc29tZSBBbmRyb2lkIGRldmljZXMgYWN0aXZlRWxlbWVudCBuZWVkcyB0byBiZSBibHVycmVkIG90aGVyd2lzZSB0aGUgc3ludGhldGljIGNsaWNrIHdpbGwgaGF2ZSBubyBlZmZlY3QgKCMyNClcblx0aWYgKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgJiYgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAhPT0gdGFyZ2V0RWxlbWVudCkge1xuXHRcdGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQuYmx1cigpO1xuXHR9XG5cblx0dG91Y2ggPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXTtcblxuXHQvLyBTeW50aGVzaXNlIGEgY2xpY2sgZXZlbnQsIHdpdGggYW4gZXh0cmEgYXR0cmlidXRlIHNvIGl0IGNhbiBiZSB0cmFja2VkXG5cdGNsaWNrRXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnTW91c2VFdmVudHMnKTtcblx0Y2xpY2tFdmVudC5pbml0TW91c2VFdmVudCh0aGlzLmRldGVybWluZUV2ZW50VHlwZSh0YXJnZXRFbGVtZW50KSwgdHJ1ZSwgdHJ1ZSwgd2luZG93LCAxLCB0b3VjaC5zY3JlZW5YLCB0b3VjaC5zY3JlZW5ZLCB0b3VjaC5jbGllbnRYLCB0b3VjaC5jbGllbnRZLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMCwgbnVsbCk7XG5cdGNsaWNrRXZlbnQuZm9yd2FyZGVkVG91Y2hFdmVudCA9IHRydWU7XG5cdHRhcmdldEVsZW1lbnQuZGlzcGF0Y2hFdmVudChjbGlja0V2ZW50KTtcbn07XG5cbkZhc3RDbGljay5wcm90b3R5cGUuZGV0ZXJtaW5lRXZlbnRUeXBlID0gZnVuY3Rpb24odGFyZ2V0RWxlbWVudCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0Ly9Jc3N1ZSAjMTU5OiBBbmRyb2lkIENocm9tZSBTZWxlY3QgQm94IGRvZXMgbm90IG9wZW4gd2l0aCBhIHN5bnRoZXRpYyBjbGljayBldmVudFxuXHRpZiAoZGV2aWNlSXNBbmRyb2lkICYmIHRhcmdldEVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc2VsZWN0Jykge1xuXHRcdHJldHVybiAnbW91c2Vkb3duJztcblx0fVxuXG5cdHJldHVybiAnY2xpY2snO1xufTtcblxuXG4vKipcbiAqIEBwYXJhbSB7RXZlbnRUYXJnZXR8RWxlbWVudH0gdGFyZ2V0RWxlbWVudFxuICovXG5GYXN0Q2xpY2sucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24odGFyZ2V0RWxlbWVudCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHZhciBsZW5ndGg7XG5cblx0Ly8gSXNzdWUgIzE2MDogb24gaU9TIDcsIHNvbWUgaW5wdXQgZWxlbWVudHMgKGUuZy4gZGF0ZSBkYXRldGltZSkgdGhyb3cgYSB2YWd1ZSBUeXBlRXJyb3Igb24gc2V0U2VsZWN0aW9uUmFuZ2UuIFRoZXNlIGVsZW1lbnRzIGRvbid0IGhhdmUgYW4gaW50ZWdlciB2YWx1ZSBmb3IgdGhlIHNlbGVjdGlvblN0YXJ0IGFuZCBzZWxlY3Rpb25FbmQgcHJvcGVydGllcywgYnV0IHVuZm9ydHVuYXRlbHkgdGhhdCBjYW4ndCBiZSB1c2VkIGZvciBkZXRlY3Rpb24gYmVjYXVzZSBhY2Nlc3NpbmcgdGhlIHByb3BlcnRpZXMgYWxzbyB0aHJvd3MgYSBUeXBlRXJyb3IuIEp1c3QgY2hlY2sgdGhlIHR5cGUgaW5zdGVhZC4gRmlsZWQgYXMgQXBwbGUgYnVnICMxNTEyMjcyNC5cblx0aWYgKGRldmljZUlzSU9TICYmIHRhcmdldEVsZW1lbnQuc2V0U2VsZWN0aW9uUmFuZ2UgJiYgdGFyZ2V0RWxlbWVudC50eXBlLmluZGV4T2YoJ2RhdGUnKSAhPT0gMCAmJiB0YXJnZXRFbGVtZW50LnR5cGUgIT09ICd0aW1lJykge1xuXHRcdGxlbmd0aCA9IHRhcmdldEVsZW1lbnQudmFsdWUubGVuZ3RoO1xuXHRcdHRhcmdldEVsZW1lbnQuc2V0U2VsZWN0aW9uUmFuZ2UobGVuZ3RoLCBsZW5ndGgpO1xuXHR9IGVsc2Uge1xuXHRcdHRhcmdldEVsZW1lbnQuZm9jdXMoKTtcblx0fVxufTtcblxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIHRhcmdldCBlbGVtZW50IGlzIGEgY2hpbGQgb2YgYSBzY3JvbGxhYmxlIGxheWVyIGFuZCBpZiBzbywgc2V0IGEgZmxhZyBvbiBpdC5cbiAqXG4gKiBAcGFyYW0ge0V2ZW50VGFyZ2V0fEVsZW1lbnR9IHRhcmdldEVsZW1lbnRcbiAqL1xuRmFzdENsaWNrLnByb3RvdHlwZS51cGRhdGVTY3JvbGxQYXJlbnQgPSBmdW5jdGlvbih0YXJnZXRFbGVtZW50KSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0dmFyIHNjcm9sbFBhcmVudCwgcGFyZW50RWxlbWVudDtcblxuXHRzY3JvbGxQYXJlbnQgPSB0YXJnZXRFbGVtZW50LmZhc3RDbGlja1Njcm9sbFBhcmVudDtcblxuXHQvLyBBdHRlbXB0IHRvIGRpc2NvdmVyIHdoZXRoZXIgdGhlIHRhcmdldCBlbGVtZW50IGlzIGNvbnRhaW5lZCB3aXRoaW4gYSBzY3JvbGxhYmxlIGxheWVyLiBSZS1jaGVjayBpZiB0aGVcblx0Ly8gdGFyZ2V0IGVsZW1lbnQgd2FzIG1vdmVkIHRvIGFub3RoZXIgcGFyZW50LlxuXHRpZiAoIXNjcm9sbFBhcmVudCB8fCAhc2Nyb2xsUGFyZW50LmNvbnRhaW5zKHRhcmdldEVsZW1lbnQpKSB7XG5cdFx0cGFyZW50RWxlbWVudCA9IHRhcmdldEVsZW1lbnQ7XG5cdFx0ZG8ge1xuXHRcdFx0aWYgKHBhcmVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0ID4gcGFyZW50RWxlbWVudC5vZmZzZXRIZWlnaHQpIHtcblx0XHRcdFx0c2Nyb2xsUGFyZW50ID0gcGFyZW50RWxlbWVudDtcblx0XHRcdFx0dGFyZ2V0RWxlbWVudC5mYXN0Q2xpY2tTY3JvbGxQYXJlbnQgPSBwYXJlbnRFbGVtZW50O1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0cGFyZW50RWxlbWVudCA9IHBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudDtcblx0XHR9IHdoaWxlIChwYXJlbnRFbGVtZW50KTtcblx0fVxuXG5cdC8vIEFsd2F5cyB1cGRhdGUgdGhlIHNjcm9sbCB0b3AgdHJhY2tlciBpZiBwb3NzaWJsZS5cblx0aWYgKHNjcm9sbFBhcmVudCkge1xuXHRcdHNjcm9sbFBhcmVudC5mYXN0Q2xpY2tMYXN0U2Nyb2xsVG9wID0gc2Nyb2xsUGFyZW50LnNjcm9sbFRvcDtcblx0fVxufTtcblxuXG4vKipcbiAqIEBwYXJhbSB7RXZlbnRUYXJnZXR9IHRhcmdldEVsZW1lbnRcbiAqIEByZXR1cm5zIHtFbGVtZW50fEV2ZW50VGFyZ2V0fVxuICovXG5GYXN0Q2xpY2sucHJvdG90eXBlLmdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQgPSBmdW5jdGlvbihldmVudFRhcmdldCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0Ly8gT24gc29tZSBvbGRlciBicm93c2VycyAobm90YWJseSBTYWZhcmkgb24gaU9TIDQuMSAtIHNlZSBpc3N1ZSAjNTYpIHRoZSBldmVudCB0YXJnZXQgbWF5IGJlIGEgdGV4dCBub2RlLlxuXHRpZiAoZXZlbnRUYXJnZXQubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG5cdFx0cmV0dXJuIGV2ZW50VGFyZ2V0LnBhcmVudE5vZGU7XG5cdH1cblxuXHRyZXR1cm4gZXZlbnRUYXJnZXQ7XG59O1xuXG5cbi8qKlxuICogT24gdG91Y2ggc3RhcnQsIHJlY29yZCB0aGUgcG9zaXRpb24gYW5kIHNjcm9sbCBvZmZzZXQuXG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5GYXN0Q2xpY2sucHJvdG90eXBlLm9uVG91Y2hTdGFydCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0dmFyIHRhcmdldEVsZW1lbnQsIHRvdWNoLCBzZWxlY3Rpb247XG5cblx0Ly8gSWdub3JlIG11bHRpcGxlIHRvdWNoZXMsIG90aGVyd2lzZSBwaW5jaC10by16b29tIGlzIHByZXZlbnRlZCBpZiBib3RoIGZpbmdlcnMgYXJlIG9uIHRoZSBGYXN0Q2xpY2sgZWxlbWVudCAoaXNzdWUgIzExMSkuXG5cdGlmIChldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCA+IDEpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHRhcmdldEVsZW1lbnQgPSB0aGlzLmdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXZlbnQudGFyZ2V0KTtcblx0dG91Y2ggPSBldmVudC50YXJnZXRUb3VjaGVzWzBdO1xuXG5cdGlmIChkZXZpY2VJc0lPUykge1xuXG5cdFx0Ly8gT25seSB0cnVzdGVkIGV2ZW50cyB3aWxsIGRlc2VsZWN0IHRleHQgb24gaU9TIChpc3N1ZSAjNDkpXG5cdFx0c2VsZWN0aW9uID0gd2luZG93LmdldFNlbGVjdGlvbigpO1xuXHRcdGlmIChzZWxlY3Rpb24ucmFuZ2VDb3VudCAmJiAhc2VsZWN0aW9uLmlzQ29sbGFwc2VkKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoIWRldmljZUlzSU9TNCkge1xuXG5cdFx0XHQvLyBXZWlyZCB0aGluZ3MgaGFwcGVuIG9uIGlPUyB3aGVuIGFuIGFsZXJ0IG9yIGNvbmZpcm0gZGlhbG9nIGlzIG9wZW5lZCBmcm9tIGEgY2xpY2sgZXZlbnQgY2FsbGJhY2sgKGlzc3VlICMyMyk6XG5cdFx0XHQvLyB3aGVuIHRoZSB1c2VyIG5leHQgdGFwcyBhbnl3aGVyZSBlbHNlIG9uIHRoZSBwYWdlLCBuZXcgdG91Y2hzdGFydCBhbmQgdG91Y2hlbmQgZXZlbnRzIGFyZSBkaXNwYXRjaGVkXG5cdFx0XHQvLyB3aXRoIHRoZSBzYW1lIGlkZW50aWZpZXIgYXMgdGhlIHRvdWNoIGV2ZW50IHRoYXQgcHJldmlvdXNseSB0cmlnZ2VyZWQgdGhlIGNsaWNrIHRoYXQgdHJpZ2dlcmVkIHRoZSBhbGVydC5cblx0XHRcdC8vIFNhZGx5LCB0aGVyZSBpcyBhbiBpc3N1ZSBvbiBpT1MgNCB0aGF0IGNhdXNlcyBzb21lIG5vcm1hbCB0b3VjaCBldmVudHMgdG8gaGF2ZSB0aGUgc2FtZSBpZGVudGlmaWVyIGFzIGFuXG5cdFx0XHQvLyBpbW1lZGlhdGVseSBwcmVjZWVkaW5nIHRvdWNoIGV2ZW50IChpc3N1ZSAjNTIpLCBzbyB0aGlzIGZpeCBpcyB1bmF2YWlsYWJsZSBvbiB0aGF0IHBsYXRmb3JtLlxuXHRcdFx0aWYgKHRvdWNoLmlkZW50aWZpZXIgPT09IHRoaXMubGFzdFRvdWNoSWRlbnRpZmllcikge1xuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMubGFzdFRvdWNoSWRlbnRpZmllciA9IHRvdWNoLmlkZW50aWZpZXI7XG5cblx0XHRcdC8vIElmIHRoZSB0YXJnZXQgZWxlbWVudCBpcyBhIGNoaWxkIG9mIGEgc2Nyb2xsYWJsZSBsYXllciAodXNpbmcgLXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6IHRvdWNoKSBhbmQ6XG5cdFx0XHQvLyAxKSB0aGUgdXNlciBkb2VzIGEgZmxpbmcgc2Nyb2xsIG9uIHRoZSBzY3JvbGxhYmxlIGxheWVyXG5cdFx0XHQvLyAyKSB0aGUgdXNlciBzdG9wcyB0aGUgZmxpbmcgc2Nyb2xsIHdpdGggYW5vdGhlciB0YXBcblx0XHRcdC8vIHRoZW4gdGhlIGV2ZW50LnRhcmdldCBvZiB0aGUgbGFzdCAndG91Y2hlbmQnIGV2ZW50IHdpbGwgYmUgdGhlIGVsZW1lbnQgdGhhdCB3YXMgdW5kZXIgdGhlIHVzZXIncyBmaW5nZXJcblx0XHRcdC8vIHdoZW4gdGhlIGZsaW5nIHNjcm9sbCB3YXMgc3RhcnRlZCwgY2F1c2luZyBGYXN0Q2xpY2sgdG8gc2VuZCBhIGNsaWNrIGV2ZW50IHRvIHRoYXQgbGF5ZXIgLSB1bmxlc3MgYSBjaGVja1xuXHRcdFx0Ly8gaXMgbWFkZSB0byBlbnN1cmUgdGhhdCBhIHBhcmVudCBsYXllciB3YXMgbm90IHNjcm9sbGVkIGJlZm9yZSBzZW5kaW5nIGEgc3ludGhldGljIGNsaWNrIChpc3N1ZSAjNDIpLlxuXHRcdFx0dGhpcy51cGRhdGVTY3JvbGxQYXJlbnQodGFyZ2V0RWxlbWVudCk7XG5cdFx0fVxuXHR9XG5cblx0dGhpcy50cmFja2luZ0NsaWNrID0gdHJ1ZTtcblx0dGhpcy50cmFja2luZ0NsaWNrU3RhcnQgPSBldmVudC50aW1lU3RhbXA7XG5cdHRoaXMudGFyZ2V0RWxlbWVudCA9IHRhcmdldEVsZW1lbnQ7XG5cblx0dGhpcy50b3VjaFN0YXJ0WCA9IHRvdWNoLnBhZ2VYO1xuXHR0aGlzLnRvdWNoU3RhcnRZID0gdG91Y2gucGFnZVk7XG5cblx0Ly8gUHJldmVudCBwaGFudG9tIGNsaWNrcyBvbiBmYXN0IGRvdWJsZS10YXAgKGlzc3VlICMzNilcblx0aWYgKChldmVudC50aW1lU3RhbXAgLSB0aGlzLmxhc3RDbGlja1RpbWUpIDwgMjAwKSB7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0fVxuXG5cdHJldHVybiB0cnVlO1xufTtcblxuXG4vKipcbiAqIEJhc2VkIG9uIGEgdG91Y2htb3ZlIGV2ZW50IG9iamVjdCwgY2hlY2sgd2hldGhlciB0aGUgdG91Y2ggaGFzIG1vdmVkIHBhc3QgYSBib3VuZGFyeSBzaW5jZSBpdCBzdGFydGVkLlxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuRmFzdENsaWNrLnByb3RvdHlwZS50b3VjaEhhc01vdmVkID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXIgdG91Y2ggPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXSwgYm91bmRhcnkgPSB0aGlzLnRvdWNoQm91bmRhcnk7XG5cblx0aWYgKE1hdGguYWJzKHRvdWNoLnBhZ2VYIC0gdGhpcy50b3VjaFN0YXJ0WCkgPiBib3VuZGFyeSB8fCBNYXRoLmFicyh0b3VjaC5wYWdlWSAtIHRoaXMudG91Y2hTdGFydFkpID4gYm91bmRhcnkpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHJldHVybiBmYWxzZTtcbn07XG5cblxuLyoqXG4gKiBVcGRhdGUgdGhlIGxhc3QgcG9zaXRpb24uXG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5GYXN0Q2xpY2sucHJvdG90eXBlLm9uVG91Y2hNb3ZlID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHRpZiAoIXRoaXMudHJhY2tpbmdDbGljaykge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0Ly8gSWYgdGhlIHRvdWNoIGhhcyBtb3ZlZCwgY2FuY2VsIHRoZSBjbGljayB0cmFja2luZ1xuXHRpZiAodGhpcy50YXJnZXRFbGVtZW50ICE9PSB0aGlzLmdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXZlbnQudGFyZ2V0KSB8fCB0aGlzLnRvdWNoSGFzTW92ZWQoZXZlbnQpKSB7XG5cdFx0dGhpcy50cmFja2luZ0NsaWNrID0gZmFsc2U7XG5cdFx0dGhpcy50YXJnZXRFbGVtZW50ID0gbnVsbDtcblx0fVxuXG5cdHJldHVybiB0cnVlO1xufTtcblxuXG4vKipcbiAqIEF0dGVtcHQgdG8gZmluZCB0aGUgbGFiZWxsZWQgY29udHJvbCBmb3IgdGhlIGdpdmVuIGxhYmVsIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtFdmVudFRhcmdldHxIVE1MTGFiZWxFbGVtZW50fSBsYWJlbEVsZW1lbnRcbiAqIEByZXR1cm5zIHtFbGVtZW50fG51bGx9XG4gKi9cbkZhc3RDbGljay5wcm90b3R5cGUuZmluZENvbnRyb2wgPSBmdW5jdGlvbihsYWJlbEVsZW1lbnQpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdC8vIEZhc3QgcGF0aCBmb3IgbmV3ZXIgYnJvd3NlcnMgc3VwcG9ydGluZyB0aGUgSFRNTDUgY29udHJvbCBhdHRyaWJ1dGVcblx0aWYgKGxhYmVsRWxlbWVudC5jb250cm9sICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gbGFiZWxFbGVtZW50LmNvbnRyb2w7XG5cdH1cblxuXHQvLyBBbGwgYnJvd3NlcnMgdW5kZXIgdGVzdCB0aGF0IHN1cHBvcnQgdG91Y2ggZXZlbnRzIGFsc28gc3VwcG9ydCB0aGUgSFRNTDUgaHRtbEZvciBhdHRyaWJ1dGVcblx0aWYgKGxhYmVsRWxlbWVudC5odG1sRm9yKSB7XG5cdFx0cmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGxhYmVsRWxlbWVudC5odG1sRm9yKTtcblx0fVxuXG5cdC8vIElmIG5vIGZvciBhdHRyaWJ1dGUgZXhpc3RzLCBhdHRlbXB0IHRvIHJldHJpZXZlIHRoZSBmaXJzdCBsYWJlbGxhYmxlIGRlc2NlbmRhbnQgZWxlbWVudFxuXHQvLyB0aGUgbGlzdCBvZiB3aGljaCBpcyBkZWZpbmVkIGhlcmU6IGh0dHA6Ly93d3cudzMub3JnL1RSL2h0bWw1L2Zvcm1zLmh0bWwjY2F0ZWdvcnktbGFiZWxcblx0cmV0dXJuIGxhYmVsRWxlbWVudC5xdWVyeVNlbGVjdG9yKCdidXR0b24sIGlucHV0Om5vdChbdHlwZT1oaWRkZW5dKSwga2V5Z2VuLCBtZXRlciwgb3V0cHV0LCBwcm9ncmVzcywgc2VsZWN0LCB0ZXh0YXJlYScpO1xufTtcblxuXG4vKipcbiAqIE9uIHRvdWNoIGVuZCwgZGV0ZXJtaW5lIHdoZXRoZXIgdG8gc2VuZCBhIGNsaWNrIGV2ZW50IGF0IG9uY2UuXG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5GYXN0Q2xpY2sucHJvdG90eXBlLm9uVG91Y2hFbmQgPSBmdW5jdGlvbihldmVudCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHZhciBmb3JFbGVtZW50LCB0cmFja2luZ0NsaWNrU3RhcnQsIHRhcmdldFRhZ05hbWUsIHNjcm9sbFBhcmVudCwgdG91Y2gsIHRhcmdldEVsZW1lbnQgPSB0aGlzLnRhcmdldEVsZW1lbnQ7XG5cblx0aWYgKCF0aGlzLnRyYWNraW5nQ2xpY2spIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdC8vIFByZXZlbnQgcGhhbnRvbSBjbGlja3Mgb24gZmFzdCBkb3VibGUtdGFwIChpc3N1ZSAjMzYpXG5cdGlmICgoZXZlbnQudGltZVN0YW1wIC0gdGhpcy5sYXN0Q2xpY2tUaW1lKSA8IDIwMCkge1xuXHRcdHRoaXMuY2FuY2VsTmV4dENsaWNrID0gdHJ1ZTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdC8vIFJlc2V0IHRvIHByZXZlbnQgd3JvbmcgY2xpY2sgY2FuY2VsIG9uIGlucHV0IChpc3N1ZSAjMTU2KS5cblx0dGhpcy5jYW5jZWxOZXh0Q2xpY2sgPSBmYWxzZTtcblxuXHR0aGlzLmxhc3RDbGlja1RpbWUgPSBldmVudC50aW1lU3RhbXA7XG5cblx0dHJhY2tpbmdDbGlja1N0YXJ0ID0gdGhpcy50cmFja2luZ0NsaWNrU3RhcnQ7XG5cdHRoaXMudHJhY2tpbmdDbGljayA9IGZhbHNlO1xuXHR0aGlzLnRyYWNraW5nQ2xpY2tTdGFydCA9IDA7XG5cblx0Ly8gT24gc29tZSBpT1MgZGV2aWNlcywgdGhlIHRhcmdldEVsZW1lbnQgc3VwcGxpZWQgd2l0aCB0aGUgZXZlbnQgaXMgaW52YWxpZCBpZiB0aGUgbGF5ZXJcblx0Ly8gaXMgcGVyZm9ybWluZyBhIHRyYW5zaXRpb24gb3Igc2Nyb2xsLCBhbmQgaGFzIHRvIGJlIHJlLWRldGVjdGVkIG1hbnVhbGx5LiBOb3RlIHRoYXRcblx0Ly8gZm9yIHRoaXMgdG8gZnVuY3Rpb24gY29ycmVjdGx5LCBpdCBtdXN0IGJlIGNhbGxlZCAqYWZ0ZXIqIHRoZSBldmVudCB0YXJnZXQgaXMgY2hlY2tlZCFcblx0Ly8gU2VlIGlzc3VlICM1NzsgYWxzbyBmaWxlZCBhcyByZGFyOi8vMTMwNDg1ODkgLlxuXHRpZiAoZGV2aWNlSXNJT1NXaXRoQmFkVGFyZ2V0KSB7XG5cdFx0dG91Y2ggPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXTtcblxuXHRcdC8vIEluIGNlcnRhaW4gY2FzZXMgYXJndW1lbnRzIG9mIGVsZW1lbnRGcm9tUG9pbnQgY2FuIGJlIG5lZ2F0aXZlLCBzbyBwcmV2ZW50IHNldHRpbmcgdGFyZ2V0RWxlbWVudCB0byBudWxsXG5cdFx0dGFyZ2V0RWxlbWVudCA9IGRvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnQodG91Y2gucGFnZVggLSB3aW5kb3cucGFnZVhPZmZzZXQsIHRvdWNoLnBhZ2VZIC0gd2luZG93LnBhZ2VZT2Zmc2V0KSB8fCB0YXJnZXRFbGVtZW50O1xuXHRcdHRhcmdldEVsZW1lbnQuZmFzdENsaWNrU2Nyb2xsUGFyZW50ID0gdGhpcy50YXJnZXRFbGVtZW50LmZhc3RDbGlja1Njcm9sbFBhcmVudDtcblx0fVxuXG5cdHRhcmdldFRhZ05hbWUgPSB0YXJnZXRFbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcblx0aWYgKHRhcmdldFRhZ05hbWUgPT09ICdsYWJlbCcpIHtcblx0XHRmb3JFbGVtZW50ID0gdGhpcy5maW5kQ29udHJvbCh0YXJnZXRFbGVtZW50KTtcblx0XHRpZiAoZm9yRWxlbWVudCkge1xuXHRcdFx0dGhpcy5mb2N1cyh0YXJnZXRFbGVtZW50KTtcblx0XHRcdGlmIChkZXZpY2VJc0FuZHJvaWQpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHR0YXJnZXRFbGVtZW50ID0gZm9yRWxlbWVudDtcblx0XHR9XG5cdH0gZWxzZSBpZiAodGhpcy5uZWVkc0ZvY3VzKHRhcmdldEVsZW1lbnQpKSB7XG5cblx0XHQvLyBDYXNlIDE6IElmIHRoZSB0b3VjaCBzdGFydGVkIGEgd2hpbGUgYWdvIChiZXN0IGd1ZXNzIGlzIDEwMG1zIGJhc2VkIG9uIHRlc3RzIGZvciBpc3N1ZSAjMzYpIHRoZW4gZm9jdXMgd2lsbCBiZSB0cmlnZ2VyZWQgYW55d2F5LiBSZXR1cm4gZWFybHkgYW5kIHVuc2V0IHRoZSB0YXJnZXQgZWxlbWVudCByZWZlcmVuY2Ugc28gdGhhdCB0aGUgc3Vic2VxdWVudCBjbGljayB3aWxsIGJlIGFsbG93ZWQgdGhyb3VnaC5cblx0XHQvLyBDYXNlIDI6IFdpdGhvdXQgdGhpcyBleGNlcHRpb24gZm9yIGlucHV0IGVsZW1lbnRzIHRhcHBlZCB3aGVuIHRoZSBkb2N1bWVudCBpcyBjb250YWluZWQgaW4gYW4gaWZyYW1lLCB0aGVuIGFueSBpbnB1dHRlZCB0ZXh0IHdvbid0IGJlIHZpc2libGUgZXZlbiB0aG91Z2ggdGhlIHZhbHVlIGF0dHJpYnV0ZSBpcyB1cGRhdGVkIGFzIHRoZSB1c2VyIHR5cGVzIChpc3N1ZSAjMzcpLlxuXHRcdGlmICgoZXZlbnQudGltZVN0YW1wIC0gdHJhY2tpbmdDbGlja1N0YXJ0KSA+IDEwMCB8fCAoZGV2aWNlSXNJT1MgJiYgd2luZG93LnRvcCAhPT0gd2luZG93ICYmIHRhcmdldFRhZ05hbWUgPT09ICdpbnB1dCcpKSB7XG5cdFx0XHR0aGlzLnRhcmdldEVsZW1lbnQgPSBudWxsO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHRoaXMuZm9jdXModGFyZ2V0RWxlbWVudCk7XG5cdFx0dGhpcy5zZW5kQ2xpY2sodGFyZ2V0RWxlbWVudCwgZXZlbnQpO1xuXG5cdFx0Ly8gU2VsZWN0IGVsZW1lbnRzIG5lZWQgdGhlIGV2ZW50IHRvIGdvIHRocm91Z2ggb24gaU9TIDQsIG90aGVyd2lzZSB0aGUgc2VsZWN0b3IgbWVudSB3b24ndCBvcGVuLlxuXHRcdGlmICghZGV2aWNlSXNJT1M0IHx8IHRhcmdldFRhZ05hbWUgIT09ICdzZWxlY3QnKSB7XG5cdFx0XHR0aGlzLnRhcmdldEVsZW1lbnQgPSBudWxsO1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRpZiAoZGV2aWNlSXNJT1MgJiYgIWRldmljZUlzSU9TNCkge1xuXG5cdFx0Ly8gRG9uJ3Qgc2VuZCBhIHN5bnRoZXRpYyBjbGljayBldmVudCBpZiB0aGUgdGFyZ2V0IGVsZW1lbnQgaXMgY29udGFpbmVkIHdpdGhpbiBhIHBhcmVudCBsYXllciB0aGF0IHdhcyBzY3JvbGxlZFxuXHRcdC8vIGFuZCB0aGlzIHRhcCBpcyBiZWluZyB1c2VkIHRvIHN0b3AgdGhlIHNjcm9sbGluZyAodXN1YWxseSBpbml0aWF0ZWQgYnkgYSBmbGluZyAtIGlzc3VlICM0MikuXG5cdFx0c2Nyb2xsUGFyZW50ID0gdGFyZ2V0RWxlbWVudC5mYXN0Q2xpY2tTY3JvbGxQYXJlbnQ7XG5cdFx0aWYgKHNjcm9sbFBhcmVudCAmJiBzY3JvbGxQYXJlbnQuZmFzdENsaWNrTGFzdFNjcm9sbFRvcCAhPT0gc2Nyb2xsUGFyZW50LnNjcm9sbFRvcCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHR9XG5cblx0Ly8gUHJldmVudCB0aGUgYWN0dWFsIGNsaWNrIGZyb20gZ29pbmcgdGhvdWdoIC0gdW5sZXNzIHRoZSB0YXJnZXQgbm9kZSBpcyBtYXJrZWQgYXMgcmVxdWlyaW5nXG5cdC8vIHJlYWwgY2xpY2tzIG9yIGlmIGl0IGlzIGluIHRoZSB3aGl0ZWxpc3QgaW4gd2hpY2ggY2FzZSBvbmx5IG5vbi1wcm9ncmFtbWF0aWMgY2xpY2tzIGFyZSBwZXJtaXR0ZWQuXG5cdGlmICghdGhpcy5uZWVkc0NsaWNrKHRhcmdldEVsZW1lbnQpKSB7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHR0aGlzLnNlbmRDbGljayh0YXJnZXRFbGVtZW50LCBldmVudCk7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59O1xuXG5cbi8qKlxuICogT24gdG91Y2ggY2FuY2VsLCBzdG9wIHRyYWNraW5nIHRoZSBjbGljay5cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuRmFzdENsaWNrLnByb3RvdHlwZS5vblRvdWNoQ2FuY2VsID0gZnVuY3Rpb24oKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0dGhpcy50cmFja2luZ0NsaWNrID0gZmFsc2U7XG5cdHRoaXMudGFyZ2V0RWxlbWVudCA9IG51bGw7XG59O1xuXG5cbi8qKlxuICogRGV0ZXJtaW5lIG1vdXNlIGV2ZW50cyB3aGljaCBzaG91bGQgYmUgcGVybWl0dGVkLlxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuRmFzdENsaWNrLnByb3RvdHlwZS5vbk1vdXNlID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdC8vIElmIGEgdGFyZ2V0IGVsZW1lbnQgd2FzIG5ldmVyIHNldCAoYmVjYXVzZSBhIHRvdWNoIGV2ZW50IHdhcyBuZXZlciBmaXJlZCkgYWxsb3cgdGhlIGV2ZW50XG5cdGlmICghdGhpcy50YXJnZXRFbGVtZW50KSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRpZiAoZXZlbnQuZm9yd2FyZGVkVG91Y2hFdmVudCkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0Ly8gUHJvZ3JhbW1hdGljYWxseSBnZW5lcmF0ZWQgZXZlbnRzIHRhcmdldGluZyBhIHNwZWNpZmljIGVsZW1lbnQgc2hvdWxkIGJlIHBlcm1pdHRlZFxuXHRpZiAoIWV2ZW50LmNhbmNlbGFibGUpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdC8vIERlcml2ZSBhbmQgY2hlY2sgdGhlIHRhcmdldCBlbGVtZW50IHRvIHNlZSB3aGV0aGVyIHRoZSBtb3VzZSBldmVudCBuZWVkcyB0byBiZSBwZXJtaXR0ZWQ7XG5cdC8vIHVubGVzcyBleHBsaWNpdGx5IGVuYWJsZWQsIHByZXZlbnQgbm9uLXRvdWNoIGNsaWNrIGV2ZW50cyBmcm9tIHRyaWdnZXJpbmcgYWN0aW9ucyxcblx0Ly8gdG8gcHJldmVudCBnaG9zdC9kb3VibGVjbGlja3MuXG5cdGlmICghdGhpcy5uZWVkc0NsaWNrKHRoaXMudGFyZ2V0RWxlbWVudCkgfHwgdGhpcy5jYW5jZWxOZXh0Q2xpY2spIHtcblxuXHRcdC8vIFByZXZlbnQgYW55IHVzZXItYWRkZWQgbGlzdGVuZXJzIGRlY2xhcmVkIG9uIEZhc3RDbGljayBlbGVtZW50IGZyb20gYmVpbmcgZmlyZWQuXG5cdFx0aWYgKGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbikge1xuXHRcdFx0ZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0Ly8gUGFydCBvZiB0aGUgaGFjayBmb3IgYnJvd3NlcnMgdGhhdCBkb24ndCBzdXBwb3J0IEV2ZW50I3N0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiAoZS5nLiBBbmRyb2lkIDIpXG5cdFx0XHRldmVudC5wcm9wYWdhdGlvblN0b3BwZWQgPSB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIENhbmNlbCB0aGUgZXZlbnRcblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gSWYgdGhlIG1vdXNlIGV2ZW50IGlzIHBlcm1pdHRlZCwgcmV0dXJuIHRydWUgZm9yIHRoZSBhY3Rpb24gdG8gZ28gdGhyb3VnaC5cblx0cmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogT24gYWN0dWFsIGNsaWNrcywgZGV0ZXJtaW5lIHdoZXRoZXIgdGhpcyBpcyBhIHRvdWNoLWdlbmVyYXRlZCBjbGljaywgYSBjbGljayBhY3Rpb24gb2NjdXJyaW5nXG4gKiBuYXR1cmFsbHkgYWZ0ZXIgYSBkZWxheSBhZnRlciBhIHRvdWNoICh3aGljaCBuZWVkcyB0byBiZSBjYW5jZWxsZWQgdG8gYXZvaWQgZHVwbGljYXRpb24pLCBvclxuICogYW4gYWN0dWFsIGNsaWNrIHdoaWNoIHNob3VsZCBiZSBwZXJtaXR0ZWQuXG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5GYXN0Q2xpY2sucHJvdG90eXBlLm9uQ2xpY2sgPSBmdW5jdGlvbihldmVudCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHZhciBwZXJtaXR0ZWQ7XG5cblx0Ly8gSXQncyBwb3NzaWJsZSBmb3IgYW5vdGhlciBGYXN0Q2xpY2stbGlrZSBsaWJyYXJ5IGRlbGl2ZXJlZCB3aXRoIHRoaXJkLXBhcnR5IGNvZGUgdG8gZmlyZSBhIGNsaWNrIGV2ZW50IGJlZm9yZSBGYXN0Q2xpY2sgZG9lcyAoaXNzdWUgIzQ0KS4gSW4gdGhhdCBjYXNlLCBzZXQgdGhlIGNsaWNrLXRyYWNraW5nIGZsYWcgYmFjayB0byBmYWxzZSBhbmQgcmV0dXJuIGVhcmx5LiBUaGlzIHdpbGwgY2F1c2Ugb25Ub3VjaEVuZCB0byByZXR1cm4gZWFybHkuXG5cdGlmICh0aGlzLnRyYWNraW5nQ2xpY2spIHtcblx0XHR0aGlzLnRhcmdldEVsZW1lbnQgPSBudWxsO1xuXHRcdHRoaXMudHJhY2tpbmdDbGljayA9IGZhbHNlO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0Ly8gVmVyeSBvZGQgYmVoYXZpb3VyIG9uIGlPUyAoaXNzdWUgIzE4KTogaWYgYSBzdWJtaXQgZWxlbWVudCBpcyBwcmVzZW50IGluc2lkZSBhIGZvcm0gYW5kIHRoZSB1c2VyIGhpdHMgZW50ZXIgaW4gdGhlIGlPUyBzaW11bGF0b3Igb3IgY2xpY2tzIHRoZSBHbyBidXR0b24gb24gdGhlIHBvcC11cCBPUyBrZXlib2FyZCB0aGUgYSBraW5kIG9mICdmYWtlJyBjbGljayBldmVudCB3aWxsIGJlIHRyaWdnZXJlZCB3aXRoIHRoZSBzdWJtaXQtdHlwZSBpbnB1dCBlbGVtZW50IGFzIHRoZSB0YXJnZXQuXG5cdGlmIChldmVudC50YXJnZXQudHlwZSA9PT0gJ3N1Ym1pdCcgJiYgZXZlbnQuZGV0YWlsID09PSAwKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRwZXJtaXR0ZWQgPSB0aGlzLm9uTW91c2UoZXZlbnQpO1xuXG5cdC8vIE9ubHkgdW5zZXQgdGFyZ2V0RWxlbWVudCBpZiB0aGUgY2xpY2sgaXMgbm90IHBlcm1pdHRlZC4gVGhpcyB3aWxsIGVuc3VyZSB0aGF0IHRoZSBjaGVjayBmb3IgIXRhcmdldEVsZW1lbnQgaW4gb25Nb3VzZSBmYWlscyBhbmQgdGhlIGJyb3dzZXIncyBjbGljayBkb2Vzbid0IGdvIHRocm91Z2guXG5cdGlmICghcGVybWl0dGVkKSB7XG5cdFx0dGhpcy50YXJnZXRFbGVtZW50ID0gbnVsbDtcblx0fVxuXG5cdC8vIElmIGNsaWNrcyBhcmUgcGVybWl0dGVkLCByZXR1cm4gdHJ1ZSBmb3IgdGhlIGFjdGlvbiB0byBnbyB0aHJvdWdoLlxuXHRyZXR1cm4gcGVybWl0dGVkO1xufTtcblxuXG4vKipcbiAqIFJlbW92ZSBhbGwgRmFzdENsaWNrJ3MgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5GYXN0Q2xpY2sucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXIgbGF5ZXIgPSB0aGlzLmxheWVyO1xuXG5cdGlmIChkZXZpY2VJc0FuZHJvaWQpIHtcblx0XHRsYXllci5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW92ZXInLCB0aGlzLm9uTW91c2UsIHRydWUpO1xuXHRcdGxheWVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMub25Nb3VzZSwgdHJ1ZSk7XG5cdFx0bGF5ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMub25Nb3VzZSwgdHJ1ZSk7XG5cdH1cblxuXHRsYXllci5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMub25DbGljaywgdHJ1ZSk7XG5cdGxheWVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB0aGlzLm9uVG91Y2hTdGFydCwgZmFsc2UpO1xuXHRsYXllci5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCB0aGlzLm9uVG91Y2hNb3ZlLCBmYWxzZSk7XG5cdGxheWVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgdGhpcy5vblRvdWNoRW5kLCBmYWxzZSk7XG5cdGxheWVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoY2FuY2VsJywgdGhpcy5vblRvdWNoQ2FuY2VsLCBmYWxzZSk7XG59O1xuXG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBGYXN0Q2xpY2sgaXMgbmVlZGVkLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gbGF5ZXIgVGhlIGxheWVyIHRvIGxpc3RlbiBvblxuICovXG5GYXN0Q2xpY2subm90TmVlZGVkID0gZnVuY3Rpb24obGF5ZXIpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXIgbWV0YVZpZXdwb3J0O1xuXHR2YXIgY2hyb21lVmVyc2lvbjtcblxuXHQvLyBEZXZpY2VzIHRoYXQgZG9uJ3Qgc3VwcG9ydCB0b3VjaCBkb24ndCBuZWVkIEZhc3RDbGlja1xuXHRpZiAodHlwZW9mIHdpbmRvdy5vbnRvdWNoc3RhcnQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHQvLyBDaHJvbWUgdmVyc2lvbiAtIHplcm8gZm9yIG90aGVyIGJyb3dzZXJzXG5cdGNocm9tZVZlcnNpb24gPSArKC9DaHJvbWVcXC8oWzAtOV0rKS8uZXhlYyhuYXZpZ2F0b3IudXNlckFnZW50KSB8fCBbLDBdKVsxXTtcblxuXHRpZiAoY2hyb21lVmVyc2lvbikge1xuXG5cdFx0aWYgKGRldmljZUlzQW5kcm9pZCkge1xuXHRcdFx0bWV0YVZpZXdwb3J0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignbWV0YVtuYW1lPXZpZXdwb3J0XScpO1xuXG5cdFx0XHRpZiAobWV0YVZpZXdwb3J0KSB7XG5cdFx0XHRcdC8vIENocm9tZSBvbiBBbmRyb2lkIHdpdGggdXNlci1zY2FsYWJsZT1cIm5vXCIgZG9lc24ndCBuZWVkIEZhc3RDbGljayAoaXNzdWUgIzg5KVxuXHRcdFx0XHRpZiAobWV0YVZpZXdwb3J0LmNvbnRlbnQuaW5kZXhPZigndXNlci1zY2FsYWJsZT1ubycpICE9PSAtMSkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIENocm9tZSAzMiBhbmQgYWJvdmUgd2l0aCB3aWR0aD1kZXZpY2Utd2lkdGggb3IgbGVzcyBkb24ndCBuZWVkIEZhc3RDbGlja1xuXHRcdFx0XHRpZiAoY2hyb21lVmVyc2lvbiA+IDMxICYmIHdpbmRvdy5pbm5lcldpZHRoIDw9IHdpbmRvdy5zY3JlZW4ud2lkdGgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0Ly8gQ2hyb21lIGRlc2t0b3AgZG9lc24ndCBuZWVkIEZhc3RDbGljayAoaXNzdWUgIzE1KVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH1cblxuXHQvLyBJRTEwIHdpdGggLW1zLXRvdWNoLWFjdGlvbjogbm9uZSwgd2hpY2ggZGlzYWJsZXMgZG91YmxlLXRhcC10by16b29tIChpc3N1ZSAjOTcpXG5cdGlmIChsYXllci5zdHlsZS5tc1RvdWNoQWN0aW9uID09PSAnbm9uZScpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHJldHVybiBmYWxzZTtcbn07XG5cblxuLyoqXG4gKiBGYWN0b3J5IG1ldGhvZCBmb3IgY3JlYXRpbmcgYSBGYXN0Q2xpY2sgb2JqZWN0XG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBsYXllciBUaGUgbGF5ZXIgdG8gbGlzdGVuIG9uXG4gKi9cbkZhc3RDbGljay5hdHRhY2ggPSBmdW5jdGlvbihsYXllcikge1xuXHQndXNlIHN0cmljdCc7XG5cdHJldHVybiBuZXcgRmFzdENsaWNrKGxheWVyKTtcbn07XG5cblxuaWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQpIHtcblxuXHQvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG5cdGRlZmluZShmdW5jdGlvbigpIHtcblx0XHQndXNlIHN0cmljdCc7XG5cdFx0cmV0dXJuIEZhc3RDbGljaztcblx0fSk7XG59IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdG1vZHVsZS5leHBvcnRzID0gRmFzdENsaWNrLmF0dGFjaDtcblx0bW9kdWxlLmV4cG9ydHMuRmFzdENsaWNrID0gRmFzdENsaWNrO1xufSBlbHNlIHtcblx0d2luZG93LkZhc3RDbGljayA9IEZhc3RDbGljaztcbn1cbiJdfQ==
