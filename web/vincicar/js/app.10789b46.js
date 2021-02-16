(function(e) {
    function t(t) {
        for (var a, c, s = t[0], o = t[1], u = t[2], d = 0, v = []; d < s.length; d++) c = s[d],
        Object.prototype.hasOwnProperty.call(i, c) && i[c] && v.push(i[c][0]),
        i[c] = 0;
        for (a in o) Object.prototype.hasOwnProperty.call(o, a) && (e[a] = o[a]);
        l && l(t);
        while (v.length) v.shift()();
        return r.push.apply(r, u || []),
        n()
    }
    function n() {
        for (var e, t = 0; t < r.length; t++) {
            for (var n = r[t], a = !0, s = 1; s < n.length; s++) {
                var o = n[s];
                0 !== i[o] && (a = !1)
            }
            a && (r.splice(t--, 1), e = c(c.s = n[0]))
        }
        return e
    }
    var a = {},
    i = {
        app: 0
    },
    r = [];
    function c(t) {
        if (a[t]) return a[t].exports;
        var n = a[t] = {
            i: t,
            l: !1,
            exports: {}
        };
        return e[t].call(n.exports, n, n.exports, c),
        n.l = !0,
        n.exports
    }
    c.m = e,
    c.c = a,
    c.d = function(e, t, n) {
        c.o(e, t) || Object.defineProperty(e, t, {
            enumerable: !0,
            get: n
        })
    },
    c.r = function(e) {
        "undefined" !== typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, {
            value: "Module"
        }),
        Object.defineProperty(e, "__esModule", {
            value: !0
        })
    },
    c.t = function(e, t) {
        if (1 & t && (e = c(e)), 8 & t) return e;
        if (4 & t && "object" === typeof e && e && e.__esModule) return e;
        var n = Object.create(null);
        if (c.r(n), Object.defineProperty(n, "default", {
            enumerable: !0,
            value: e
        }), 2 & t && "string" != typeof e) for (var a in e) c.d(n, a,
        function(t) {
            return e[t]
        }.bind(null, a));
        return n
    },
    c.n = function(e) {
        var t = e && e.__esModule ?
        function() {
            return e["default"]
        }: function() {
            return e
        };
        return c.d(t, "a", t),
        t
    },
    c.o = function(e, t) {
        return Object.prototype.hasOwnProperty.call(e, t)
    },
    c.p = "/";
    var s = window["webpackJsonp"] = window["webpackJsonp"] || [],
    o = s.push.bind(s);
    s.push = t,
    s = s.slice();
    for (var u = 0; u < s.length; u++) t(s[u]);
    var l = o;
    r.push([0, "chunk-vendors"]),
    n()
})({
    0 : function(e, t, n) {
        e.exports = n("56d7")
    },
    2275 : function(e, t, n) {
        e.exports = n.p + "img/vincicarWxPublic.95655b2e.png"
    },
    "56d7": function(e, t, n) {
        "use strict";
        n.r(t);
        n("cadf"),
        n("551c"),
        n("f751"),
        n("097d");
        var a = n("2b0e"),
        i = function() {
            var e = this,
            t = e.$createElement,
            a = e._self._c || t;
            return a("div", {
                class: {
                    dj: "dj" === e.agent,
                    kudu: "kudu" === e.agent,
                    fullscreen: e.fullscreen
                },
                attrs: {
                    id: "app"
                }
            },
            [a("div", {
                staticClass: "darkBg"
            }), "index" == e.step ? a("div", {
                staticClass: "contentBox indexStepBox"
            },
            [a("h1", {
                staticClass: "title"
            },
            [e._v("本田专用车机优化系统")]), a("h2", {
                staticClass: "subTitle"
            },
            [e._v("思域、冠道、皓影、CRV、URV、CDX专用")]), a("div", {
                staticClass: "btn",
                on: {
                    click: e.onStart
                }
            },
            [e._v("开始优化")])]) : e._e(), "wait" == e.step ? a("div", {
                staticClass: "waitBox"
            },
            [a("div", {
                staticClass: "waitContentBox"
            },
            [a("div", {
                staticClass: "left"
            },
            [a("div", {
                staticClass: "leftContent"
            },
            [a("img", {
                staticClass: "loadingGif",
                attrs: {
                    src: n("cf1c")
                }
            }), a("div", [e._v("开始时间：" + e._s(e.startTime))]), a("div", [e._v("此过程不超过5分钟")])])]), "official" === e.agent ? a("div", {
                staticClass: "right"
            },
            [e._m(0)]) : e._e(), a("div", {
                staticClass: "lastTip"
            },
            [e._v("\n        若超过5分钟，请长按屏幕左侧HOME键，结束浏览器后重试\n      ")])])]) : e._e(), a("div", {
                attrs: {
                    id: "hiddenIframeBox"
                }
            })])
        },
        r = [function() {
            var e = this,
            t = e.$createElement,
            a = e._self._c || t;
            return a("div", {
                staticClass: "rightContent"
            },
            [a("img", {
                staticClass: "erCode",
                attrs: {
                    src: n("2275")
                }
            }), a("div", [e._v("问题咨询、技巧交流")]), a("div", [e._v("请关注微信公众号")])])
        }],
        c = (n("a481"), n("5118")),
//         s = "https://a2carf.vincicar.com",
//         o = "https://freetryb.hondavip.cn",
        s = "",
        o = "",
        u = {
            name: "app",
            data: function() {
                return {
                    agent: "official",
                    useBsServer: s,
                    startTime: "",
                    step: "index",
                    fullscreen: !1
                }
            },
            mounted: function() {
                var e = this;
                this.calcAgent(),
                window._hmt = [],
                window.set_crack_server = function(t) {
                    t.realServer && (e.useBsServer = t.realServer)
                },
                function() {
                    var e = document.createElement("script"),
                    t = "https://carw.vincicar.com/vb/car/crack_server_pick?callback=set_crack_server";
                    window.location.href;
                    e.src = t;
                    var n = document.getElementsByTagName("script")[0];
                    n.parentNode.insertBefore(e, n)
                } (),
                Object(c["setTimeout"])((function() {
                    var e = document.getElementById("app");
                    e.style.width = "".concat(document.documentElement.clientWidth, "px"),
                    e.style.height = "".concat(document.documentElement.clientHeight, "px")
                }), 500)
            },
            methods: {
                calcAgent: function() {
                    var e = window.location.hostname,
                    t = "",
                    n = e.replace(".tssss.cn", "");
                    switch (n) {
                    case "v":
                        t = "yzlpy";
                        break;
                    case "888":
                        t = "muliqi";
                        break;
                    case "st007":
                        t = "liu2";
                        break;
                    case "007":
                        t = "liu";
                        break;
                    case "111":
                        t = "guagua";
                        break;
                    case "11":
                        t = "guagua";
                        break;
                    case "zk":
                        t = "wxhonda";
                        break;
                    case "evan":
                        t = "evan";
                        break;
                    case "8":
                        t = "public";
                        break;
                    case "wg":
                        t = "weigu";
                        break;
                    case "mm":
                        t = "mm";
                        break;
                    case "6":
                        t = "a1";
                        break;
                    case "s":
                        t = "cs4s";
                        break;
                    case "ycb":
                        t = "ycb";
                        break;
                    default:
                        t = "official";
                        break
                    }
                    try { - 1 !== window.location.hostname.indexOf("zk.hondavip.cn") ? t = "wxhonda": -1 !== window.location.hostname.indexOf("888.xwlj.net") ? t = "muliqi": -1 !== window.location.hostname.indexOf("dj.hondavip.cn") ? t = "dj": -1 !== window.location.hostname.indexOf("kudu.hondavip.net") && (t = "kudu")
                    } catch(a) {}
                    this.agent = t,
                    this.agentCustom()
                },
                agentCustom: function() {
                    "dj" !== this.agent && "kudu" !== this.agent || (this.fullscreen = !0)
                },
                calcBsServer: function() {
                    try {
                        var e = window.localStorage.getItem("lastServerUrl");
                        null !== e && (this.useBsServer = e === s ? o: s),
                        window.localStorage.setItem("lastServerUrl", this.useBsServer)
                    } catch(t) {}
                },
                onStart: function() {
                    this.step = "wait";
                    var e = "".concat(this.useBsServer, "/go.html?carId=civic&uid=0&token=0&agent=").concat(this.agent),
                    t = '<iframe class="crack-iframe" src="${url}" />'.replace("${url}", e);
                    //alert(t);
                    document.getElementById("hiddenIframeBox").innerHTML = t,
                    window._hmt.push(["_trackEvent", "BsServer", this.useBsServer]);
                    var n = new Date;
                    this.startTime = "".concat(n.getHours(), ":").concat(n.getMinutes() < 10 ? "0": "").concat(n.getMinutes()),
                    window._hmt.push(["_trackPageview", "/startcrack"]),
                    Object(c["setTimeout"])((function() {
                        window._hmt.push(["_trackPageview", "/time_over_1"])
                    }), 6e4),
                    Object(c["setTimeout"])((function() {
                        window._hmt.push(["_trackPageview", "/time_over_2"])
                    }), 12e4),
                    Object(c["setTimeout"])((function() {
                        window._hmt.push(["_trackPageview", "/time_over_3"])
                    }), 18e4),
                    Object(c["setTimeout"])((function() {
                        window._hmt.push(["_trackPageview", "/time_over_4"])
                    }), 24e4),
                    Object(c["setTimeout"])((function() {
                        alert("优化超时，请长按屏幕左侧HOME键结束浏览器后，再重试，多次失败请尝试更换WI-FI热点"),
                        window._hmt.push(["_trackPageview", "/time_over_4_5"])
                    }), 27e4)
                }
            }
        },
        l = u,
        d = (n("7c55"), n("2877")),
        v = Object(d["a"])(l, i, r, !1, null, null, null),
        f = v.exports;
        a["a"].config.productionTip = !1,
        new a["a"]({
            render: function(e) {
                return e(f)
            }
        }).$mount("#app")
    },
    "5c48": function(e, t, n) {},
    "7c55": function(e, t, n) {
        "use strict";
        var a = n("5c48"),
        i = n.n(a);
        i.a
    },
    cf1c: function(e, t, n) {
        e.exports = n.p + "img/loading.c88d94a4.gif"
    }
});
//# sourceMappingURL=app.10789b46.js.map
