var RawDataQuery = (function (exports) {
'use strict';

var EOL = {};
var EOF = {};
var QUOTE = 34;
var NEWLINE = 10;
var RETURN = 13;

function objectConverter(columns) {
  return new Function("d", "return {" + columns.map(function(name, i) {
    return JSON.stringify(name) + ": d[" + i + "]";
  }).join(",") + "}");
}

function customConverter(columns, f) {
  var object = objectConverter(columns);
  return function(row, i) {
    return f(object(row), i, columns);
  };
}

// Compute unique columns in order of discovery.
function inferColumns(rows) {
  var columnSet = Object.create(null),
      columns = [];

  rows.forEach(function(row) {
    for (var column in row) {
      if (!(column in columnSet)) {
        columns.push(columnSet[column] = column);
      }
    }
  });

  return columns;
}

var dsv$1 = function(delimiter) {
  var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
      DELIMITER = delimiter.charCodeAt(0);

  function parse(text, f) {
    var convert, columns, rows = parseRows(text, function(row, i) {
      if (convert) return convert(row, i - 1);
      columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
    });
    rows.columns = columns || [];
    return rows;
  }

  function parseRows(text, f) {
    var rows = [], // output rows
        N = text.length,
        I = 0, // current character index
        n = 0, // current line number
        t, // current token
        eof = N <= 0, // current token followed by EOF?
        eol = false; // current token followed by EOL?

    // Strip the trailing newline.
    if (text.charCodeAt(N - 1) === NEWLINE) --N;
    if (text.charCodeAt(N - 1) === RETURN) --N;

    function token() {
      if (eof) return EOF;
      if (eol) return eol = false, EOL;

      // Unescape quotes.
      var i, j = I, c;
      if (text.charCodeAt(j) === QUOTE) {
        while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
        if ((i = I) >= N) eof = true;
        else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
        return text.slice(j + 1, i - 1).replace(/""/g, "\"");
      }

      // Find next delimiter or newline.
      while (I < N) {
        if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
        else if (c !== DELIMITER) continue;
        return text.slice(j, i);
      }

      // Return last token before EOF.
      return eof = true, text.slice(j, N);
    }

    while ((t = token()) !== EOF) {
      var row = [];
      while (t !== EOL && t !== EOF) row.push(t), t = token();
      if (f && (row = f(row, n++)) == null) continue;
      rows.push(row);
    }

    return rows;
  }

  function format(rows, columns) {
    if (columns == null) columns = inferColumns(rows);
    return [columns.map(formatValue).join(delimiter)].concat(rows.map(function(row) {
      return columns.map(function(column) {
        return formatValue(row[column]);
      }).join(delimiter);
    })).join("\n");
  }

  function formatRows(rows) {
    return rows.map(formatRow).join("\n");
  }

  function formatRow(row) {
    return row.map(formatValue).join(delimiter);
  }

  function formatValue(text) {
    return text == null ? ""
        : reFormat.test(text += "") ? "\"" + text.replace(/"/g, "\"\"") + "\""
        : text;
  }

  return {
    parse: parse,
    parseRows: parseRows,
    format: format,
    formatRows: formatRows
  };
};

var csv$1 = dsv$1(",");

var csvParse = csv$1.parse;

var tsv$1 = dsv$1("\t");

var tsvParse = tsv$1.parse;

function responseText(response) {
  if (!response.ok) throw new Error(response.status + " " + response.statusText);
  return response.text();
}

var text = function(input, init) {
  return fetch(input, init).then(responseText);
};

function dsvParse(parse) {
  return function(input, init, row) {
    if (arguments.length === 2 && typeof init === "function") row = init, init = undefined;
    return text(input, init).then(function(response) {
      return parse(response, row);
    });
  };
}

var csv = dsvParse(csvParse);
var tsv = dsvParse(tsvParse);

function responseJson(response) {
  if (!response.ok) throw new Error(response.status + " " + response.statusText);
  return response.json();
}

var json = function(input, init) {
  return fetch(input, init).then(responseJson);
};

var xhtml = "http://www.w3.org/1999/xhtml";

var namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

var namespace = function(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
};

function creatorInherit(name) {
  return function() {
    var document = this.ownerDocument,
        uri = this.namespaceURI;
    return uri === xhtml && document.documentElement.namespaceURI === xhtml
        ? document.createElement(name)
        : document.createElementNS(uri, name);
  };
}

function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}

var creator = function(name) {
  var fullname = namespace(name);
  return (fullname.local
      ? creatorFixed
      : creatorInherit)(fullname);
};

function none() {}

var selector = function(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
};

var selection_select = function(select) {
  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }

  return new Selection(subgroups, this._parents);
};

function empty() {
  return [];
}

var selectorAll = function(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
};

var selection_selectAll = function(select) {
  if (typeof select !== "function") select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }

  return new Selection(subgroups, parents);
};

var matcher = function(selector) {
  return function() {
    return this.matches(selector);
  };
};

if (typeof document !== "undefined") {
  var element = document.documentElement;
  if (!element.matches) {
    var vendorMatches = element.webkitMatchesSelector
        || element.msMatchesSelector
        || element.mozMatchesSelector
        || element.oMatchesSelector;
    matcher = function(selector) {
      return function() {
        return vendorMatches.call(this, selector);
      };
    };
  }
}

var matcher$1 = matcher;

var selection_filter = function(match) {
  if (typeof match !== "function") match = matcher$1(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Selection(subgroups, this._parents);
};

var sparse = function(update) {
  return new Array(update.length);
};

var selection_enter = function() {
  return new Selection(this._enter || this._groups.map(sparse), this._parents);
};

function EnterNode(parent, datum) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum;
}

EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
  querySelector: function(selector) { return this._parent.querySelector(selector); },
  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
};

var constant = function(x) {
  return function() {
    return x;
  };
};

var keyPrefix = "$"; // Protect against keys like “__proto__”.

function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0,
      node,
      groupLength = group.length,
      dataLength = data.length;

  // Put any non-null nodes that fit into update.
  // Put any null nodes into enter.
  // Put any remaining data into enter.
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Put any non-null nodes that don’t fit into exit.
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}

function bindKey(parent, group, enter, update, exit, data, key) {
  var i,
      node,
      nodeByKeyValue = {},
      groupLength = group.length,
      dataLength = data.length,
      keyValues = new Array(groupLength),
      keyValue;

  // Compute the key for each node.
  // If multiple nodes have the same key, the duplicates are added to exit.
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
      if (keyValue in nodeByKeyValue) {
        exit[i] = node;
      } else {
        nodeByKeyValue[keyValue] = node;
      }
    }
  }

  // Compute the key for each datum.
  // If there a node associated with this key, join and add it to update.
  // If there is not (or the key is a duplicate), add it to enter.
  for (i = 0; i < dataLength; ++i) {
    keyValue = keyPrefix + key.call(parent, data[i], i, data);
    if (node = nodeByKeyValue[keyValue]) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue[keyValue] = null;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Add any remaining nodes that were not bound to data to exit.
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
      exit[i] = node;
    }
  }
}

var selection_data = function(value, key) {
  if (!value) {
    data = new Array(this.size()), j = -1;
    this.each(function(d) { data[++j] = d; });
    return data;
  }

  var bind = key ? bindKey : bindIndex,
      parents = this._parents,
      groups = this._groups;

  if (typeof value !== "function") value = constant(value);

  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j],
        group = groups[j],
        groupLength = group.length,
        data = value.call(parent, parent && parent.__data__, j, parents),
        dataLength = data.length,
        enterGroup = enter[j] = new Array(dataLength),
        updateGroup = update[j] = new Array(dataLength),
        exitGroup = exit[j] = new Array(groupLength);

    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

    // Now connect the enter nodes to their following update node, such that
    // appendChild can insert the materialized enter node before this node,
    // rather than at the end of the parent node.
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
        previous._next = next || null;
      }
    }
  }

  update = new Selection(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
};

var selection_exit = function() {
  return new Selection(this._exit || this._groups.map(sparse), this._parents);
};

var selection_merge = function(selection$$1) {

  for (var groups0 = this._groups, groups1 = selection$$1._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Selection(merges, this._parents);
};

var selection_order = function() {

  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
      if (node = group[i]) {
        if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }

  return this;
};

var selection_sort = function(compare) {
  if (!compare) compare = ascending;

  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }

  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }

  return new Selection(sortgroups, this._parents).order();
};

function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

var selection_call = function() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
};

var selection_nodes = function() {
  var nodes = new Array(this.size()), i = -1;
  this.each(function() { nodes[++i] = this; });
  return nodes;
};

var selection_node = function() {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }

  return null;
};

var selection_size = function() {
  var size = 0;
  this.each(function() { ++size; });
  return size;
};

var selection_empty = function() {
  return !this.node();
};

var selection_each = function(callback) {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }

  return this;
};

function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}

function attrConstantNS(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}

function attrFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}

function attrFunctionNS(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}

var selection_attr = function(name, value) {
  var fullname = namespace(name);

  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local
        ? node.getAttributeNS(fullname.space, fullname.local)
        : node.getAttribute(fullname);
  }

  return this.each((value == null
      ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
      ? (fullname.local ? attrFunctionNS : attrFunction)
      : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
};

var defaultView = function(node) {
  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
      || (node.document && node) // node is a Window
      || node.defaultView; // node is a Document
};

function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}

function styleFunction(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}

var selection_style = function(name, value, priority) {
  return arguments.length > 1
      ? this.each((value == null
            ? styleRemove : typeof value === "function"
            ? styleFunction
            : styleConstant)(name, value, priority == null ? "" : priority))
      : styleValue(this.node(), name);
};

function styleValue(node, name) {
  return node.style.getPropertyValue(name)
      || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
}

function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}

function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}

function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}

var selection_property = function(name, value) {
  return arguments.length > 1
      ? this.each((value == null
          ? propertyRemove : typeof value === "function"
          ? propertyFunction
          : propertyConstant)(name, value))
      : this.node()[name];
};

function classArray(string) {
  return string.trim().split(/^|\s+/);
}

function classList(node) {
  return node.classList || new ClassList(node);
}

function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}

ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};

function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}

function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}

function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}

function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}

function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}

var selection_classed = function(name, value) {
  var names = classArray(name + "");

  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }

  return this.each((typeof value === "function"
      ? classedFunction : value
      ? classedTrue
      : classedFalse)(names, value));
};

function textRemove() {
  this.textContent = "";
}

function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}

var selection_text = function(value) {
  return arguments.length
      ? this.each(value == null
          ? textRemove : (typeof value === "function"
          ? textFunction
          : textConstant)(value))
      : this.node().textContent;
};

function htmlRemove() {
  this.innerHTML = "";
}

function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}

function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}

var selection_html = function(value) {
  return arguments.length
      ? this.each(value == null
          ? htmlRemove : (typeof value === "function"
          ? htmlFunction
          : htmlConstant)(value))
      : this.node().innerHTML;
};

function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}

var selection_raise = function() {
  return this.each(raise);
};

function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}

var selection_lower = function() {
  return this.each(lower);
};

var selection_append = function(name) {
  var create = typeof name === "function" ? name : creator(name);
  return this.select(function() {
    return this.appendChild(create.apply(this, arguments));
  });
};

function constantNull() {
  return null;
}

var selection_insert = function(name, before) {
  var create = typeof name === "function" ? name : creator(name),
      select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
  return this.select(function() {
    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
  });
};

function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}

var selection_remove = function() {
  return this.each(remove);
};

function selection_cloneShallow() {
  return this.parentNode.insertBefore(this.cloneNode(false), this.nextSibling);
}

function selection_cloneDeep() {
  return this.parentNode.insertBefore(this.cloneNode(true), this.nextSibling);
}

var selection_clone = function(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
};

var selection_datum = function(value) {
  return arguments.length
      ? this.property("__data__", value)
      : this.node().__data__;
};

var filterEvents = {};



if (typeof document !== "undefined") {
  var element$1 = document.documentElement;
  if (!("onmouseenter" in element$1)) {
    filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
  }
}

function filterContextListener(listener, index, group) {
  listener = contextListener(listener, index, group);
  return function(event) {
    var related = event.relatedTarget;
    if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
      listener.call(this, event);
    }
  };
}

function contextListener(listener, index, group) {
  return function(event1) {
    try {
      listener.call(this, this.__data__, index, group);
    } finally {
      
    }
  };
}

function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return {type: t, name: name};
  });
}

function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.capture);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}

function onAdd(typename, value, capture) {
  var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
  return function(d, i, group) {
    var on = this.__on, o, listener = wrap(value, i, group);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.capture);
        this.addEventListener(o.type, o.listener = listener, o.capture = capture);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, capture);
    o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
    if (!on) this.__on = [o];
    else on.push(o);
  };
}

var selection_on = function(typename, value, capture) {
  var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }

  on = value ? onAdd : onRemove;
  if (capture == null) capture = false;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
  return this;
};

function dispatchEvent(node, type, params) {
  var window = defaultView(node),
      event = window.CustomEvent;

  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }

  node.dispatchEvent(event);
}

function dispatchConstant(type, params) {
  return function() {
    return dispatchEvent(this, type, params);
  };
}

function dispatchFunction(type, params) {
  return function() {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}

var selection_dispatch = function(type, params) {
  return this.each((typeof params === "function"
      ? dispatchFunction
      : dispatchConstant)(type, params));
};

var root = [null];

function Selection(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}

function selection() {
  return new Selection([[document.documentElement]], root);
}

Selection.prototype = selection.prototype = {
  constructor: Selection,
  select: selection_select,
  selectAll: selection_selectAll,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  merge: selection_merge,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch
};

var select = function(selector) {
  return typeof selector === "string"
      ? new Selection([[document.querySelector(selector)]], [document.documentElement])
      : new Selection([[selector]], root);
};

"use strict";
function getGtexUrls(){
    const host = 'https://gtexportal.org/rest/v1/'; // NOTE: top expressed genes are not yet in production
    return {
        dyneqtl: host + 'association/dyneqtl',

        exonExp: host + 'expression/medianExonExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',

        geneId: host + 'reference/geneId?format=json&release=v7&geneId=',
        geneExp: host + 'expression/geneExpression?datasetId=gtex_v7&gencodeId=',
        geneModel: host + 'reference/collapsedGeneModel?unfiltered=false&release=v7&geneId=',
        geneModelUnfiltered: host + 'reference/collapsedGeneModel?unfiltered=true&release=v7&geneId=',

        isoform: host + 'reference/transcript?release=v7&gencode_id=',
        isoformExp: host + 'expression/isoformExpression?datasetId=gtex_v7&boxplotDetail=median&gencodeId=',

        junctionExp: host + 'expression/medianJunctionExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',

        medGeneExp: host + 'expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&page_size=10000',

        // sample: 'data/gtex.Sample.csv',
        sample: 'tmpSummaryData/gtex.Sample.csv',
        snp: host + 'reference/snp?reference=current&format=json&snpId=',

        tissue:  host + 'dataset/tissueInfo',
        tissueSites: host + 'dataset/tissueSiteDetail?format=json',

        topInTissueFiltered: host + 'expression/topExpressedGenes?datasetId=gtex_v7&filterMtGene=true&sort_by=median&sortDirection=desc&page_size=50&tissueId=',
        topInTissue: host + 'expression/topExpressedGenes?datasetId=gtex_v7&sort_by=median&sortDirection=desc&page_size=50&tissueId=',

        variantId: host + 'reference/snp?format=json&reference=current&release=v7&variantId=',

        // local static files
        rnaseqCram: 'tmpSummaryData/rnaseq_cram_files_v7_dbGaP_011516.txt',
        wgsCram: 'tmpSummaryData/wgs_cram_files_v7_hg38_dbGaP_011516.txt',

    }
}

/**
 * Parse the genes from GTEx web service
 * @param data {Json}
 * @returns {List} of genes
 */


/**
 * Parse the tissues
 * @param data {Json}
 * @returns {List} of tissues
 */
function parseTissues(data){
    const attr = 'tissueInfo';
    if(!data.hasOwnProperty(attr)) throw 'Fatal Error: parseTissues input error.';
    const tissues = data[attr];

    // sanity check
    ['tissueId', 'tissueName', 'colorHex'].forEach((d)=>{
        if (!tissues[0].hasOwnProperty(d)) throw 'Fatal Error: parseTissue attr not found: ' + d;
    });

    return tissues;
}

/**
 * Parse the tissue groups
 * @param data {Json}
 * @param forEqtl {Boolean}
 * @returns {Dictionary} of lists of tissues indexed by the tissue group name
 */


/**
 * parse the exons
 * @param data {Json}
 * @returns {List} of exons
 */


/**
 * parse the junctions
 * @param data
 * @returns {List} of junctions
 * // we do not store junction structure annotations in Mongo
    // so here we use the junction expression web service to retrieve the junction genomic locations
    // assuming that each tissue has the same junctions,
    // to grab all the known junctions of a gene, we only need to look at one tissue
    // here we arbitrarily pick Liver.
 */


/**
 * parse transcript isoforms from the GTEx web service: 'reference/transcript?release=v7&gencode_id='
 * @param data {Json}
 * returns a dictionary of transcript exon object lists indexed by ENST IDs
 */


/**
 * parse transcript isoforms
 * @param data {Json} from GTEx web service 'reference/transcript?release=v7&gencode_id='
 * returns a list of isoform objects
 */


/**
 * parse final (masked) gene model exon expression
 * expression is normalized to reads per kb
 * @param data {JSON} of exon expression web service
 * @param exons {List} of exons with positions
 * @param useLog {boolean} use log2 transformation
 * @param adjust {Number} default 0.01
 * @returns {List} of exon objects
 */


/**
 * Parse junction median read count data
 * @param data {JSON} of the junction expression web service
 * @param useLog {Boolean} perform log transformation
 * @param adjust {Number} for handling 0's when useLog is true
 * @returns {List} of junction objects
 */


/**
 * parse isoform expression
 * @param data
 * @param useLog
 * @param adjust
 * @returns {*}
 */




/**
 * parse median gene expression
 * @param data {Json} with attr medianGeneExpression
 * @param useLog {Boolean} performs log10 transformation
 * @returns {*}
 */


/**
 * parse the gene expression
 * @param gencodeId {String}
 * @param data {Json} with attr: tissueId, geneSymbol
 * @returns {{exp: {}, geneSymbol: string}}
 */
// function parseGeneExpression(gencodeId, data){
//     let lookupTable = {
//         exp: {}, // indexed by tissueId
//         geneSymbol: ''
//     };
//     if(!data.hasOwnProperty(attr)) throw ('parseGeneExpression input error.');
//     data[attr].forEach((d)=>{
//         if (d.gencodeId == gencodeId) {
//             // if the gencode ID matches the query gencodeId,
//             // add the expression data to the lookup table
//             lookupTable.exp[d.tissueId] = d.data;
//             if ('' == lookupTable.geneSymbol) lookupTable.geneSymbol = d.geneSymbol
//         }
//     });
//     return lookupTable
// }

/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 */

/**
 * Creates an SVG
 * @param id {String} a DOM element ID that starts with a "#"
 * @param width {Numeric}
 * @param height {Numeric}
 * @param margin {Object} with two attributes: width and height
 * @return {Selection} the d3 selection object of the SVG
 */

/**
 *
 * @param id {String} the parent dom ID
 * @param width {Numeric}
 * @param height {Numeric}
 * @param margin {Object} with attr: left, top
 * @param svgId {String}
 * @returns {*}
 */


/**
 *
 * @param svgObj
 * @param downloadFileName {String}
 * @param tempDownloadDivId {String}
 */

/**
 * A function for parsing the CSS style sheet and including the style properties in the downloadable SVG.
 * @param dom
 * @returns {Element}
 */
function parseCssStyles (dom) {
    var used = "";
    var sheets = document.styleSheets;

    for (var i = 0; i < sheets.length; i++) { // TODO: walk through this block of code

        try {
            if (sheets[i].cssRules == null) continue;
            var rules = sheets[i].cssRules;

            for (var j = 0; j < rules.length; j++) {
                var rule = rules[j];
                if (typeof(rule.style) != "undefined") {
                    var elems;
                    //Some selectors won't work, and most of these don't matter.
                    try {
                        elems = $(dom).find(rule.selectorText);
                    } catch (e) {
                        elems = [];
                    }

                    if (elems.length > 0) {
                        used += rule.selectorText + " { " + rule.style.cssText + " }\n";
                    }
                }
            }
        } catch (e) {
            // In Firefox, if stylesheet originates from a diff domain,
            // trying to access the cssRules will throw a SecurityError.
            // Hence, we must use a try/catch to handle this in Firefox
            if (e.name !== 'SecurityError') throw e;
            continue;
        }
    }

    var s = document.createElement('style');
    s.setAttribute('type', 'text/css');
    s.innerHTML = "<![CDATA[\n" + used + "\n]]>";

    return s;
}

/**
 * Create a toolbar
 * This class uses a lot of jQuery for dom element manipulation
 */

class Toolbar {
    constructor(domId, tooltip=undefined, vertical=false){
        $(`#${domId}`).show(); // if hidden

        // add a new bargroup div to domID with bootstrap button classes
        const btnClasses = vertical?'btn-group-vertical btn-group-sm': 'btn-group btn-group-sm';
        this.bar = $('<div/>').addClass(btnClasses).appendTo(`#${domId}`);
        this.buttons = {};
        this.tooltip = tooltip;
    }

    /**
     * Create a download button for SVG
     * @param id {String} the button dom ID
     * @param svgId {String} the SVG dom ID to grab and download
     * @param outfileName {String} the download file name
     * @param cloneId {String} the cloned SVG dom ID
     * @param icon {String} a fontawesome's icon class name
     */
    createDownloadSvgButton(id, svgId, outfileName, cloneId, icon='fa-download'){
        const $button = this.createButton(id, icon);
        select(`#${id}`)
            .on('click', ()=>{
                this.downloadSvg(svgId, outfileName, cloneId);
            })
            .on('mouseover', ()=>{
                this.tooltip.show("Download");
            })
            .on('mouseout', ()=>{
                this.tooltip.hide();
            });
    }

    createResetButton(id, callback, icon='fa-expand-arrows-alt'){
        const $button = this.createButton(id, icon);
        select(`#${id}`)
            .on('click', callback)
            .on('mouseover', ()=>{
                this.tooltip.show("Reset the scales");
            })
            .on('mouseout', ()=>{
                this.tooltip.hide();
            });
    }

    /**
     * create a button to the toolbar
     * @param id {String} the button's id
     * @param icon {String} a fontawesome icon class
     * Dependencies: Bootstrap, jQuery, Fontawesome
     */
    createButton(id, icon='fa-download'){
        const $button = $('<a/>').attr('id', id)
            .addClass('btn btn-default').appendTo(this.bar);
        $('<i/>').addClass(`fa ${icon}`).appendTo($button);
        this.buttons[id] = $button;
        return $button;
    }

    /**
     * attach a tooltip dom with the toolbar
     * @param tooltip {Tooltip}
     */
    attachTooltip(tooltip){
        this.tooltip = tooltip;
    }

    /**
     * Download SVG obj
     * @param svgId {String} the SVG dom ID
     * @param fileName {String} the output file name
     * @param cloneId {String} the temporary dom ID to copy the SVG to
     * Dependencies: FileSaver
     */
    downloadSvg(svgId, fileName, cloneId){
        // let svgObj = $($($(`${"#" +svgId} svg`))[0]); // complicated jQuery to get to the SVG object
        let svgObj = $($($(`${"#" +svgId}`))[0]);
        let $svgCopy = svgObj.clone()
        .attr("version", "1.1")
        .attr("xmlns", "http://www.w3.org/2000/svg");

        // parse and add all the CSS styling used by the SVG
        let styles = parseCssStyles(svgObj.get());
        $svgCopy.prepend(styles);

        $("#" + cloneId).html('').hide(); // make sure the copyID is invisible
        let svgHtml = $(`#${cloneId}`).append($svgCopy).html();

        let svgBlob = new Blob([svgHtml], {type: "image/svg+xml"});
        saveAs(svgBlob, fileName); // this is a FileSaver function....

        // clear the temp download div
        $(`#${cloneId}`).html('').hide();
    }
}

'use strict';
/*
TODO:
first build a data matrix with the following structure
{
    col: tissues
    row: data types
    data: [ objects with col and row and value ]
}
 */
/**
 * build the data matrix table
 * @param tableId {String}
 * @param datasetId {String}
 * @param urls
 */

function launch(tableId, datasetId='gtex_v7', urls=getGtexUrls()){
    const promises = [
        // TODO: urls for other datasets
        json(urls.tissue),
        tsv(urls.rnaseqCram),
        tsv(urls.wgsCram),
        tsv(urls.sample),
    ];

    Promise.all(promises)
        .then(function(args){
            let tissues = parseTissues(args[0]);
            const cram = {
                rnaseq: args[1].reduce((a, d)=>{a[d.sample_id]=d; return a;}, {}),
                wgs: args[2].reduce((a, d)=>{a[d.sample_id]=d; return a;}, {})
            };
            let samples = args[3]
                .filter((s)=>s.datasetId==datasetId)
                .map((s)=>{
                    switch (s.dataType){
                        case "WGS": {
                            s.cramFile = cram.wgs[s.sampleId];
                            break;
                        }
                        case "RNASEQ": {
                            s.cramFile = cram.rnaseq[s.sampleId];
                            break;
                        }
                        default:
                            // do nothing
                    }

                    return s;
                });
            const theMatrix = _buildMatrix(datasetId, samples, tissues);

            _renderMatrixTable(tableId, theMatrix);
            _addFilters(tableId, theMatrix, samples, tissues);

        })
        .catch(function(err){console.error(err);});
}

function _addFilters(tableId, mat, samples, tissues){
    const __filter = ()=>{
        const sex = select('input[name="sex"]:checked').node().value;
        const age = select('input[name="age"]:checked').node().value;
        if (sex == 'both' && age == 'all'){
            _renderMatrixTable(tableId, _buildMatrix(mat.datasetId, samples, tissues));
        } else {
            let filteredMat = undefined;
            if (sex == 'both') filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.ageBracket==age), tissues);
            else if (age == 'all') filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex), tissues);
            else filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex && s.ageBracket==age), tissues);
            _renderMatrixTable(tableId, filteredMat);
        }
    };
    select('#filter-menu').selectAll('input[name="sex"]').on('change', __filter);
    select('#filter-menu').selectAll('input[name="age"]').on('change', __filter);
}

function _buildMatrix(datasetId, samples, tissues){
    const __buildHash = function(dataType){
        return samples.filter((s)=>s.dataType==dataType).reduce((a, d)=>{
            if(a[d.tissueId]===undefined) a[d.tissueId] = 0;
            a[d.tissueId]= a[d.tissueId]+1;
            return a;
        }, {});
    };
    const columns = [
        {
            label: 'RNA-Seq',
            id: 'RNASEQ',
            data: __buildHash('RNASEQ')
        },
        {
            label: 'WES',
            id: 'WES',
            data: __buildHash('WES')
        },
        {
            label: 'WGS',
            id: 'WGS',
            data: __buildHash('WGS')
        }
    ];
    const rows = tissues.map((t)=>{
        t.id = t.tissueId;
        t.label = t.tissueName;
        columns.forEach((col)=>{
            t[col.id] = col.data[t.id] || undefined;
        });
        return t;
    });

    return {
        datasetId: datasetId,
        X: rows,
        Y: columns,
        data: samples
    };
}


/**
 * Render the matrix in an HTML table format
 * @param tableId {String} the DOM ID of the table
 * @param mat {Object} of attr: datasetId, X--a list of x objects, Y--a list of y objects
 * @private
 */
function _renderMatrixTable(tableId, mat){
    const dataset = {
        'gtex_v7': {
            label:'GTEX V7',
            bgcolor: '#2a718b'
        }
    };
    // rendering the column labels
    const theTable = select(`#${tableId}`);
    theTable.select('thead').selectAll('th')
        .data([{label:"", id:""}].concat(mat.Y))
        .enter()
        .append('th')
        .attr('scope', 'col')
        .attr('class', (d, i)=>d.id==""?'':`y${i-1}`)
        .text((d)=>d.label);

    theTable.select('.table-label').selectAll('*').remove();
    theTable.select('.table-label').append('th')
        .attr('colspan', mat.Y.length + 1)
        .text(dataset[mat.datasetId].label)
        .style('background-color',dataset[mat.datasetId].bgcolor);

    _renderCounts(theTable.select('tbody'), mat);
    _addClickEvents(tableId);
    _addToolbar(tableId, mat);
}

function _renderCounts(tbody, mat){
    tbody.selectAll('.data-row').remove();
    const theRows = tbody.selectAll('.data-row')
        .data(mat.X)
        .enter()
        .append('tr')
        .classed('data-row', true);

    // rendering the row label
    theRows.append('th')
        .attr('scope', 'row')
        .attr('class', (d, i)=>`x${i}`)
        .text((d)=>d.label);

    mat.Y.forEach((y, j)=>{
        theRows.append('td')
            .attr('class', (d, i)=>{
                return d[y.id]===undefined?'':`x${i} y${j}`;
            })
            .text((d)=>d[y.id]||'');
    });

}

/**
 * Add customized column, row and cell click events
 * @param tableId {String} the dom ID of the table
 * @private
 */
function _addClickEvents(tableId){
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');

    // column labels
    select(`#${tableId}`).select('thead').selectAll('th')
        .style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selection
           const theColumn = select(this).attr('class');
           if (select(this).attr('scope') == 'col') {
               select(this).attr('scope', 'selected');
               theCells.filter(`.${theColumn}`).classed('selected', true);
           } else {
               select(this).attr('scope', 'col');
               theCells.filter(`.${theColumn}`).classed('selected', false);
           }
           // console.log(theColumn);
        });

    // row labels
    select(`#${tableId}`).select('tbody').selectAll('th')
        .style('cursor', 'pointer')
        .on('click', function(){
           const theRow = select(this).attr('class');
           if (select(this).attr('scope') == 'row') {
               select(this).attr('scope', 'selected');
               theCells.filter(`.${theRow}`).classed('selected', true);
           } else {
               select(this).attr('scope', 'row');
               theCells.filter(`.${theRow}`).classed('selected', false);
           }
           // console.log(theRow);
        });


    // data cells
    theCells.style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selected class assignment
            select(this).classed('selected', !select(this).classed('selected'));
        });
}

/**
 *
 * @param tableId
 * @param mat
 * @private
 * Reference: https://github.com/eligrey/FileSaver.js/
 * Dependencies: googleUser.js
 */
function _addToolbar(tableId, mat){
    // TODO: get rid of hard-coded dom IDs
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');
    select('#matrix-table-toolbar').selectAll('*').remove();
    const toolbar = new Toolbar('matrix-table-toolbar', undefined, true);
    toolbar.createButton('sample-download');
    toolbar.createButton('send-to-firecloud', 'fa-cloud-upload-alt');

    select('#sample-download')
        .style('cursor', 'pointer')
        .on('click', function(){
            let cells = theCells.filter(`.selected`);
            if (cells.empty()) alert('You have not selected any samples to download.');
            else {
                let downloadContent = [
                        'Sample ID',
                        'Tissue Name',
                        'Data Type',
                        'CRAM File GCP',
                        'CRAM File AWS',
                        'CRAM File MD5',
                        'CRAM File Size',
                        'CRAM Index GCP',
                        'CRAM Index AWS'
                    ].join("\t") + '\n';
                cells.each(function(d){
                    const marker = select(this).attr('class').split(' ').filter((c)=>{return c!='selected'});
                    const x = mat.X[parseInt(marker[0].replace('x', ''))].id;
                    const y = mat.Y[parseInt(marker[1].replace('y', ''))].id;
                    console.log('Download ' + x + ' : '+ y);

                    const selectedSamples = mat.data.filter((s)=>s.dataType==y&&s.tissueId==x&&s.dataType!='WES')
                        /**** WARNING: no WES cram files available ATM ****/
                        .map((s)=>{
                            console.log(s);
                            let cram = [
                                'cram_file',
                                'cram_file_aws',
                                'cram_file_md5',
                                'cram_file_size',
                                'cram_index',
                                'cram_index_aws'
                            ].map((d)=>s.cramFile[d]);
                            let columns = [s.sampleId, s.tissueName, s.dataType].concat(cram);
                            return columns.join("\t");
                        });
                    console.log(selectedSamples);
                    downloadContent += selectedSamples.join("\n");
                });
                let file = new Blob([downloadContent], {type: 'text/plain;charset=utf-8'});
                saveAs(file, 'GTEx.cram.txt', true); // saveAs() is a FileSaver file, disable auto BOM

            }

        });

    select('#send-to-firecloud')
        .style('cursor', 'pointer')
        .on('click', function(){
             if (!checkSignedIn()){
                 alert("You need to sign in first");
             }

            _reportBillingProjects(getUser());
            _reportWorkspaces(getUser());

            let cells = theCells.filter(`.selected`);
            if (cells.empty()) alert('You have not selected any samples to download.');
            else {
                select('#fire-cloud-form').style("display", "block");
            }
        });

    select('#submit-to-firecloud-btn')
        .on('click', function(){
            let cells = theCells.filter(`.selected`);
            let allSelectedSamples = [];
            cells.each(function(d) {
                const marker = select(this).attr('class').split(' ').filter((c) => {
                    return c != 'selected'
                });
                const x = mat.X[parseInt(marker[0].replace('x', ''))].id;
                const y = mat.Y[parseInt(marker[1].replace('y', ''))].id;
                console.log('Download ' + x + ' : ' + y);
                const selected = mat.data.filter((s)=>s.dataType==y&&s.tissueId==x&&s.dataType!='WES').map(d=> {
                    let temp = d.sampleId.split('-');
                    d.donorId = temp[0] + '-' + temp[1];
                    return d;
                }); // NOTE: currently we don't have WES CRAM file paths
                allSelectedSamples = allSelectedSamples.concat(selected);
            });

            _submitToFireCloud(getUser(), allSelectedSamples);
            select('#fire-cloud-form').style("display", "none");
        });

    select('#cancel-firecloud-btn')
        .on('click', function(){
            select('#fire-cloud-form').style("display", "none");
            alert('Canceled!');
        });
}

/***** FireCloud API *****/
// reference: use this URL, https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=MyAccessToken, to check the access token info
// reference: https://developers.google.com/identity/sign-in/web/build-button
// dependencies: jQuery
function _reportBillingProjects(googleUser, domId="billing-project-list") {

    // let profile = googleUser.getBasicProfile();
    // console.log('ID: ' + profile.getId());
    // console.log('Name: ' + profile.getName());
    // console.log('Email: ' + profile.getEmail());
    // get the user's access token
    let token = googleUser.getAuthResponse(true).access_token;
    $.ajax({
        url: 'https://api.firecloud.org/api/profile/billing',
        type: 'GET',
        xhrFields: {
            withCredentials: false
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        contentType: 'application/json; charset=utf-8',
        success: function(response){
            // Can't figure out how to generate this form using D3... so here I'm using jQuery syntax
            $(`#${domId}`).empty();
            response.forEach((d)=>{
                $('<label>' +
                    `<input type="radio" name="billing-project" value="${d.projectName}"> ` +
                    d.projectName +
                   '</label><br/>'
                ).appendTo($(`#${domId}`));
            });

            console.log(response[0]);
        }
    });
}

function _reportWorkspaces(googleUser){
    let token = googleUser.getAuthResponse(true).access_token;
     // list User's workspaces
    $.ajax({
        url: 'https://api.firecloud.org/api/workspaces',
        type: 'GET',
        xhrFields: {
            withCredentials: false
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        },

        success: function(response){
            const workspaces = response.filter((d)=>!d.public);
            console.log(workspaces);
        },
        error: function(error){
            console.error(error);
        }
    });
}

function _submitToFireCloud(googleUser, samples){
    const token = googleUser.getAuthResponse(true).access_token;
    const namespace = $('input[name="billing-project"]').val();
    const workspace = $('input[name="workspace"]').val();
    console.log(workspace);
    console.log(samples);

    // create the workspace
    $.ajax({
        url: 'https://api.firecloud.org/api/workspaces',
        type: 'POST',
        xhrFields: {
            withCredentials: false
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({
            "namespace": namespace,
            "name": workspace,
            "attributes": {},
            "authorizationDomain": []
        }),
        success: function(response){ // callback function after workspace is created
            console.log("finished creating workspace...");
            const donors = samples.map(d=>{
                if (!d.hasOwnProperty('donorId')) throw 'Sample does not contain attr donorId.';
                return d.donorId;
            });
            const donorEntityString = `entities=entity:participant_id\n${donors.join('\n')}\n`;
            const donorEntityUrlEncode = encodeURI(donorEntityString);

            // submitting participant IDs
            $.ajax({
                url: `https://api.firecloud.org/api/workspaces/${namespace}/${workspace}/importEntities`,
                type: 'POST',
                xhrFields: {
                    withCredentials: false
                },
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                },
                contentType: 'application/x-www-form-urlencoded',
                dataType: 'text',
                data: donorEntityUrlEncode,
                success: function(response){
                    // finally, submitting samples
                    // prepare the sampleEntityString for FireCloud API
                    console.log("finished importing participant IDs...");
                    let sampleEntity = [['entity:sample_id', 'participant_id', 'sample_type', 'bam_file', 'bam_index'].join('\t')];
                    sampleEntity = sampleEntity.concat(samples.map(d=>{
                        return [d.sampleId, d.donorId, d.dataType, d.cramFile.cram_file, d.cramFile.cram_index].join('\t');
                    }));
                    const sampleEntityString = `entities=${sampleEntity.join('\n')}\n`;
                    const sampleEntityUrlEncode = encodeURI(sampleEntityString);
                    console.log(sampleEntityString);

                    $.ajax({
                        url: `https://api.firecloud.org/api/workspaces/${namespace}/${workspace}/importEntities`,
                        type: 'POST',
                        xhrFields: {
                            withCredentials: false
                        },
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                        },
                        contentType: 'application/x-www-form-urlencoded',
                        dataType: 'text',
                        data: sampleEntityUrlEncode,
                        success: function(response){
                            console.log("finished importing samples...");
                            const fcURL = `https://portal.firecloud.org/#workspaces/${namespace}/${workspace}/data`;
                            $('#fire-cloud-status').html(`Submitted! <br/> Go to your <br/> <a target="_blank" href="${fcURL}">FireCloud workspace</a>`);
                        },
                        error: function(error){console.error(error);}
                    });
                },
                error: function(error){console.error(error);}
            });
        },
        error: function(error){console.error(error);}
    });
}

exports.launch = launch;

return exports;

}({}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3LWRhdGEtcXVlcnkuYnVuZGxlLmRldi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvZHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvY3N2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvdHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZldGNoL3NyYy90ZXh0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZldGNoL3NyYy9kc3YuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZmV0Y2gvc3JjL2pzb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9uYW1lc3BhY2VzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbmFtZXNwYWNlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvY3JlYXRvci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdG9yLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NlbGVjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdG9yQWxsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NlbGVjdEFsbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL21hdGNoZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZmlsdGVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NwYXJzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lbnRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL2NvbnN0YW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2RhdGEuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZXhpdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9tZXJnZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9vcmRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zb3J0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2NhbGwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbm9kZXMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbm9kZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zaXplLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2VtcHR5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2VhY2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vYXR0ci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3dpbmRvdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zdHlsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9wcm9wZXJ0eS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jbGFzc2VkLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3RleHQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaHRtbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9yYWlzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9sb3dlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9hcHBlbmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaW5zZXJ0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3JlbW92ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jbG9uZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kYXR1bS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9vbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kaXNwYXRjaC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdC5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL21vZHVsZXMvZ3RleERhdGFQYXJzZXIuanMiLCIuLi8uLi9zcmMvc2NyaXB0cy9tb2R1bGVzL3V0aWxzLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy9Ub29sYmFyLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvUmF3RGF0YVF1ZXJ5LmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBFT0wgPSB7fSxcbiAgICBFT0YgPSB7fSxcbiAgICBRVU9URSA9IDM0LFxuICAgIE5FV0xJTkUgPSAxMCxcbiAgICBSRVRVUk4gPSAxMztcblxuZnVuY3Rpb24gb2JqZWN0Q29udmVydGVyKGNvbHVtbnMpIHtcbiAgcmV0dXJuIG5ldyBGdW5jdGlvbihcImRcIiwgXCJyZXR1cm4ge1wiICsgY29sdW1ucy5tYXAoZnVuY3Rpb24obmFtZSwgaSkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShuYW1lKSArIFwiOiBkW1wiICsgaSArIFwiXVwiO1xuICB9KS5qb2luKFwiLFwiKSArIFwifVwiKTtcbn1cblxuZnVuY3Rpb24gY3VzdG9tQ29udmVydGVyKGNvbHVtbnMsIGYpIHtcbiAgdmFyIG9iamVjdCA9IG9iamVjdENvbnZlcnRlcihjb2x1bW5zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHJvdywgaSkge1xuICAgIHJldHVybiBmKG9iamVjdChyb3cpLCBpLCBjb2x1bW5zKTtcbiAgfTtcbn1cblxuLy8gQ29tcHV0ZSB1bmlxdWUgY29sdW1ucyBpbiBvcmRlciBvZiBkaXNjb3ZlcnkuXG5mdW5jdGlvbiBpbmZlckNvbHVtbnMocm93cykge1xuICB2YXIgY29sdW1uU2V0ID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIGNvbHVtbnMgPSBbXTtcblxuICByb3dzLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgZm9yICh2YXIgY29sdW1uIGluIHJvdykge1xuICAgICAgaWYgKCEoY29sdW1uIGluIGNvbHVtblNldCkpIHtcbiAgICAgICAgY29sdW1ucy5wdXNoKGNvbHVtblNldFtjb2x1bW5dID0gY29sdW1uKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBjb2x1bW5zO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihkZWxpbWl0ZXIpIHtcbiAgdmFyIHJlRm9ybWF0ID0gbmV3IFJlZ0V4cChcIltcXFwiXCIgKyBkZWxpbWl0ZXIgKyBcIlxcblxccl1cIiksXG4gICAgICBERUxJTUlURVIgPSBkZWxpbWl0ZXIuY2hhckNvZGVBdCgwKTtcblxuICBmdW5jdGlvbiBwYXJzZSh0ZXh0LCBmKSB7XG4gICAgdmFyIGNvbnZlcnQsIGNvbHVtbnMsIHJvd3MgPSBwYXJzZVJvd3ModGV4dCwgZnVuY3Rpb24ocm93LCBpKSB7XG4gICAgICBpZiAoY29udmVydCkgcmV0dXJuIGNvbnZlcnQocm93LCBpIC0gMSk7XG4gICAgICBjb2x1bW5zID0gcm93LCBjb252ZXJ0ID0gZiA/IGN1c3RvbUNvbnZlcnRlcihyb3csIGYpIDogb2JqZWN0Q29udmVydGVyKHJvdyk7XG4gICAgfSk7XG4gICAgcm93cy5jb2x1bW5zID0gY29sdW1ucyB8fCBbXTtcbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlUm93cyh0ZXh0LCBmKSB7XG4gICAgdmFyIHJvd3MgPSBbXSwgLy8gb3V0cHV0IHJvd3NcbiAgICAgICAgTiA9IHRleHQubGVuZ3RoLFxuICAgICAgICBJID0gMCwgLy8gY3VycmVudCBjaGFyYWN0ZXIgaW5kZXhcbiAgICAgICAgbiA9IDAsIC8vIGN1cnJlbnQgbGluZSBudW1iZXJcbiAgICAgICAgdCwgLy8gY3VycmVudCB0b2tlblxuICAgICAgICBlb2YgPSBOIDw9IDAsIC8vIGN1cnJlbnQgdG9rZW4gZm9sbG93ZWQgYnkgRU9GP1xuICAgICAgICBlb2wgPSBmYWxzZTsgLy8gY3VycmVudCB0b2tlbiBmb2xsb3dlZCBieSBFT0w/XG5cbiAgICAvLyBTdHJpcCB0aGUgdHJhaWxpbmcgbmV3bGluZS5cbiAgICBpZiAodGV4dC5jaGFyQ29kZUF0KE4gLSAxKSA9PT0gTkVXTElORSkgLS1OO1xuICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQoTiAtIDEpID09PSBSRVRVUk4pIC0tTjtcblxuICAgIGZ1bmN0aW9uIHRva2VuKCkge1xuICAgICAgaWYgKGVvZikgcmV0dXJuIEVPRjtcbiAgICAgIGlmIChlb2wpIHJldHVybiBlb2wgPSBmYWxzZSwgRU9MO1xuXG4gICAgICAvLyBVbmVzY2FwZSBxdW90ZXMuXG4gICAgICB2YXIgaSwgaiA9IEksIGM7XG4gICAgICBpZiAodGV4dC5jaGFyQ29kZUF0KGopID09PSBRVU9URSkge1xuICAgICAgICB3aGlsZSAoSSsrIDwgTiAmJiB0ZXh0LmNoYXJDb2RlQXQoSSkgIT09IFFVT1RFIHx8IHRleHQuY2hhckNvZGVBdCgrK0kpID09PSBRVU9URSk7XG4gICAgICAgIGlmICgoaSA9IEkpID49IE4pIGVvZiA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKChjID0gdGV4dC5jaGFyQ29kZUF0KEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGogKyAxLCBpIC0gMSkucmVwbGFjZSgvXCJcIi9nLCBcIlxcXCJcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpbmQgbmV4dCBkZWxpbWl0ZXIgb3IgbmV3bGluZS5cbiAgICAgIHdoaWxlIChJIDwgTikge1xuICAgICAgICBpZiAoKGMgPSB0ZXh0LmNoYXJDb2RlQXQoaSA9IEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIGVsc2UgaWYgKGMgIT09IERFTElNSVRFUikgY29udGludWU7XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGosIGkpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXR1cm4gbGFzdCB0b2tlbiBiZWZvcmUgRU9GLlxuICAgICAgcmV0dXJuIGVvZiA9IHRydWUsIHRleHQuc2xpY2UoaiwgTik7XG4gICAgfVxuXG4gICAgd2hpbGUgKCh0ID0gdG9rZW4oKSkgIT09IEVPRikge1xuICAgICAgdmFyIHJvdyA9IFtdO1xuICAgICAgd2hpbGUgKHQgIT09IEVPTCAmJiB0ICE9PSBFT0YpIHJvdy5wdXNoKHQpLCB0ID0gdG9rZW4oKTtcbiAgICAgIGlmIChmICYmIChyb3cgPSBmKHJvdywgbisrKSkgPT0gbnVsbCkgY29udGludWU7XG4gICAgICByb3dzLnB1c2gocm93KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdChyb3dzLCBjb2x1bW5zKSB7XG4gICAgaWYgKGNvbHVtbnMgPT0gbnVsbCkgY29sdW1ucyA9IGluZmVyQ29sdW1ucyhyb3dzKTtcbiAgICByZXR1cm4gW2NvbHVtbnMubWFwKGZvcm1hdFZhbHVlKS5qb2luKGRlbGltaXRlcildLmNvbmNhdChyb3dzLm1hcChmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJldHVybiBjb2x1bW5zLm1hcChmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdFZhbHVlKHJvd1tjb2x1bW5dKTtcbiAgICAgIH0pLmpvaW4oZGVsaW1pdGVyKTtcbiAgICB9KSkuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFJvd3Mocm93cykge1xuICAgIHJldHVybiByb3dzLm1hcChmb3JtYXRSb3cpLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRSb3cocm93KSB7XG4gICAgcmV0dXJuIHJvdy5tYXAoZm9ybWF0VmFsdWUpLmpvaW4oZGVsaW1pdGVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFZhbHVlKHRleHQpIHtcbiAgICByZXR1cm4gdGV4dCA9PSBudWxsID8gXCJcIlxuICAgICAgICA6IHJlRm9ybWF0LnRlc3QodGV4dCArPSBcIlwiKSA/IFwiXFxcIlwiICsgdGV4dC5yZXBsYWNlKC9cIi9nLCBcIlxcXCJcXFwiXCIpICsgXCJcXFwiXCJcbiAgICAgICAgOiB0ZXh0O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwYXJzZTogcGFyc2UsXG4gICAgcGFyc2VSb3dzOiBwYXJzZVJvd3MsXG4gICAgZm9ybWF0OiBmb3JtYXQsXG4gICAgZm9ybWF0Um93czogZm9ybWF0Um93c1xuICB9O1xufVxuIiwiaW1wb3J0IGRzdiBmcm9tIFwiLi9kc3ZcIjtcblxudmFyIGNzdiA9IGRzdihcIixcIik7XG5cbmV4cG9ydCB2YXIgY3N2UGFyc2UgPSBjc3YucGFyc2U7XG5leHBvcnQgdmFyIGNzdlBhcnNlUm93cyA9IGNzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIGNzdkZvcm1hdCA9IGNzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIGNzdkZvcm1hdFJvd3MgPSBjc3YuZm9ybWF0Um93cztcbiIsImltcG9ydCBkc3YgZnJvbSBcIi4vZHN2XCI7XG5cbnZhciB0c3YgPSBkc3YoXCJcXHRcIik7XG5cbmV4cG9ydCB2YXIgdHN2UGFyc2UgPSB0c3YucGFyc2U7XG5leHBvcnQgdmFyIHRzdlBhcnNlUm93cyA9IHRzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIHRzdkZvcm1hdCA9IHRzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIHRzdkZvcm1hdFJvd3MgPSB0c3YuZm9ybWF0Um93cztcbiIsImZ1bmN0aW9uIHJlc3BvbnNlVGV4dChyZXNwb25zZSkge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzICsgXCIgXCIgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgcmV0dXJuIHJlc3BvbnNlLnRleHQoKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgcmV0dXJuIGZldGNoKGlucHV0LCBpbml0KS50aGVuKHJlc3BvbnNlVGV4dCk7XG59XG4iLCJpbXBvcnQge2NzdlBhcnNlLCBkc3ZGb3JtYXQsIHRzdlBhcnNlfSBmcm9tIFwiZDMtZHN2XCI7XG5pbXBvcnQgdGV4dCBmcm9tIFwiLi90ZXh0XCI7XG5cbmZ1bmN0aW9uIGRzdlBhcnNlKHBhcnNlKSB7XG4gIHJldHVybiBmdW5jdGlvbihpbnB1dCwgaW5pdCwgcm93KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgdHlwZW9mIGluaXQgPT09IFwiZnVuY3Rpb25cIikgcm93ID0gaW5pdCwgaW5pdCA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGV4dChpbnB1dCwgaW5pdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHBhcnNlKHJlc3BvbnNlLCByb3cpO1xuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkc3YoZGVsaW1pdGVyLCBpbnB1dCwgaW5pdCwgcm93KSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzICYmIHR5cGVvZiBpbml0ID09PSBcImZ1bmN0aW9uXCIpIHJvdyA9IGluaXQsIGluaXQgPSB1bmRlZmluZWQ7XG4gIHZhciBmb3JtYXQgPSBkc3ZGb3JtYXQoZGVsaW1pdGVyKTtcbiAgcmV0dXJuIHRleHQoaW5wdXQsIGluaXQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICByZXR1cm4gZm9ybWF0LnBhcnNlKHJlc3BvbnNlLCByb3cpO1xuICB9KTtcbn1cblxuZXhwb3J0IHZhciBjc3YgPSBkc3ZQYXJzZShjc3ZQYXJzZSk7XG5leHBvcnQgdmFyIHRzdiA9IGRzdlBhcnNlKHRzdlBhcnNlKTtcbiIsImZ1bmN0aW9uIHJlc3BvbnNlSnNvbihyZXNwb25zZSkge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzICsgXCIgXCIgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgcmV0dXJuIGZldGNoKGlucHV0LCBpbml0KS50aGVuKHJlc3BvbnNlSnNvbik7XG59XG4iLCJleHBvcnQgdmFyIHhodG1sID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCI7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgc3ZnOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsXG4gIHhodG1sOiB4aHRtbCxcbiAgeGxpbms6IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLFxuICB4bWw6IFwiaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlXCIsXG4gIHhtbG5zOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAveG1sbnMvXCJcbn07XG4iLCJpbXBvcnQgbmFtZXNwYWNlcyBmcm9tIFwiLi9uYW1lc3BhY2VzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHByZWZpeCA9IG5hbWUgKz0gXCJcIiwgaSA9IHByZWZpeC5pbmRleE9mKFwiOlwiKTtcbiAgaWYgKGkgPj0gMCAmJiAocHJlZml4ID0gbmFtZS5zbGljZSgwLCBpKSkgIT09IFwieG1sbnNcIikgbmFtZSA9IG5hbWUuc2xpY2UoaSArIDEpO1xuICByZXR1cm4gbmFtZXNwYWNlcy5oYXNPd25Qcm9wZXJ0eShwcmVmaXgpID8ge3NwYWNlOiBuYW1lc3BhY2VzW3ByZWZpeF0sIGxvY2FsOiBuYW1lfSA6IG5hbWU7XG59XG4iLCJpbXBvcnQgbmFtZXNwYWNlIGZyb20gXCIuL25hbWVzcGFjZVwiO1xuaW1wb3J0IHt4aHRtbH0gZnJvbSBcIi4vbmFtZXNwYWNlc1wiO1xuXG5mdW5jdGlvbiBjcmVhdG9ySW5oZXJpdChuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLm93bmVyRG9jdW1lbnQsXG4gICAgICAgIHVyaSA9IHRoaXMubmFtZXNwYWNlVVJJO1xuICAgIHJldHVybiB1cmkgPT09IHhodG1sICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5uYW1lc3BhY2VVUkkgPT09IHhodG1sXG4gICAgICAgID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKVxuICAgICAgICA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyh1cmksIG5hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdG9yRml4ZWQoZnVsbG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpO1xuICByZXR1cm4gKGZ1bGxuYW1lLmxvY2FsXG4gICAgICA/IGNyZWF0b3JGaXhlZFxuICAgICAgOiBjcmVhdG9ySW5oZXJpdCkoZnVsbG5hbWUpO1xufVxuIiwiZnVuY3Rpb24gbm9uZSgpIHt9XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiBzZWxlY3RvciA9PSBudWxsID8gbm9uZSA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgc2VsZWN0b3IgZnJvbSBcIi4uL3NlbGVjdG9yXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdCkge1xuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvcihzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc3ViZ3JvdXAgPSBzdWJncm91cHNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIHN1Ym5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgKHN1Ym5vZGUgPSBzZWxlY3QuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpKSB7XG4gICAgICAgIGlmIChcIl9fZGF0YV9fXCIgaW4gbm9kZSkgc3Vibm9kZS5fX2RhdGFfXyA9IG5vZGUuX19kYXRhX187XG4gICAgICAgIHN1Ymdyb3VwW2ldID0gc3Vibm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZnVuY3Rpb24gZW1wdHkoKSB7XG4gIHJldHVybiBbXTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIHNlbGVjdG9yID09IG51bGwgPyBlbXB0eSA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgc2VsZWN0b3JBbGwgZnJvbSBcIi4uL3NlbGVjdG9yQWxsXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdCkge1xuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvckFsbChzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IFtdLCBwYXJlbnRzID0gW10sIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHN1Ymdyb3Vwcy5wdXNoKHNlbGVjdC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSk7XG4gICAgICAgIHBhcmVudHMucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHBhcmVudHMpO1xufVxuIiwidmFyIG1hdGNoZXIgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2hlcyhzZWxlY3Rvcik7XG4gIH07XG59O1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICBpZiAoIWVsZW1lbnQubWF0Y2hlcykge1xuICAgIHZhciB2ZW5kb3JNYXRjaGVzID0gZWxlbWVudC53ZWJraXRNYXRjaGVzU2VsZWN0b3JcbiAgICAgICAgfHwgZWxlbWVudC5tc01hdGNoZXNTZWxlY3RvclxuICAgICAgICB8fCBlbGVtZW50Lm1vek1hdGNoZXNTZWxlY3RvclxuICAgICAgICB8fCBlbGVtZW50Lm9NYXRjaGVzU2VsZWN0b3I7XG4gICAgbWF0Y2hlciA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB2ZW5kb3JNYXRjaGVzLmNhbGwodGhpcywgc2VsZWN0b3IpO1xuICAgICAgfTtcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1hdGNoZXI7XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCBtYXRjaGVyIGZyb20gXCIuLi9tYXRjaGVyXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG1hdGNoKSB7XG4gIGlmICh0eXBlb2YgbWF0Y2ggIT09IFwiZnVuY3Rpb25cIikgbWF0Y2ggPSBtYXRjaGVyKG1hdGNoKTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHN1Ymdyb3VwID0gc3ViZ3JvdXBzW2pdID0gW10sIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgbWF0Y2guY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpIHtcbiAgICAgICAgc3ViZ3JvdXAucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odXBkYXRlKSB7XG4gIHJldHVybiBuZXcgQXJyYXkodXBkYXRlLmxlbmd0aCk7XG59XG4iLCJpbXBvcnQgc3BhcnNlIGZyb20gXCIuL3NwYXJzZVwiO1xuaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLl9lbnRlciB8fCB0aGlzLl9ncm91cHMubWFwKHNwYXJzZSksIHRoaXMuX3BhcmVudHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gRW50ZXJOb2RlKHBhcmVudCwgZGF0dW0pIHtcbiAgdGhpcy5vd25lckRvY3VtZW50ID0gcGFyZW50Lm93bmVyRG9jdW1lbnQ7XG4gIHRoaXMubmFtZXNwYWNlVVJJID0gcGFyZW50Lm5hbWVzcGFjZVVSSTtcbiAgdGhpcy5fbmV4dCA9IG51bGw7XG4gIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5fX2RhdGFfXyA9IGRhdHVtO1xufVxuXG5FbnRlck5vZGUucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogRW50ZXJOb2RlLFxuICBhcHBlbmRDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5pbnNlcnRCZWZvcmUoY2hpbGQsIHRoaXMuX25leHQpOyB9LFxuICBpbnNlcnRCZWZvcmU6IGZ1bmN0aW9uKGNoaWxkLCBuZXh0KSB7IHJldHVybiB0aGlzLl9wYXJlbnQuaW5zZXJ0QmVmb3JlKGNoaWxkLCBuZXh0KTsgfSxcbiAgcXVlcnlTZWxlY3RvcjogZnVuY3Rpb24oc2VsZWN0b3IpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTsgfSxcbiAgcXVlcnlTZWxlY3RvckFsbDogZnVuY3Rpb24oc2VsZWN0b3IpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTsgfVxufTtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB4O1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQge0VudGVyTm9kZX0gZnJvbSBcIi4vZW50ZXJcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi4vY29uc3RhbnRcIjtcblxudmFyIGtleVByZWZpeCA9IFwiJFwiOyAvLyBQcm90ZWN0IGFnYWluc3Qga2V5cyBsaWtlIOKAnF9fcHJvdG9fX+KAnS5cblxuZnVuY3Rpb24gYmluZEluZGV4KHBhcmVudCwgZ3JvdXAsIGVudGVyLCB1cGRhdGUsIGV4aXQsIGRhdGEpIHtcbiAgdmFyIGkgPSAwLFxuICAgICAgbm9kZSxcbiAgICAgIGdyb3VwTGVuZ3RoID0gZ3JvdXAubGVuZ3RoLFxuICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuXG4gIC8vIFB1dCBhbnkgbm9uLW51bGwgbm9kZXMgdGhhdCBmaXQgaW50byB1cGRhdGUuXG4gIC8vIFB1dCBhbnkgbnVsbCBub2RlcyBpbnRvIGVudGVyLlxuICAvLyBQdXQgYW55IHJlbWFpbmluZyBkYXRhIGludG8gZW50ZXIuXG4gIGZvciAoOyBpIDwgZGF0YUxlbmd0aDsgKytpKSB7XG4gICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgbm9kZS5fX2RhdGFfXyA9IGRhdGFbaV07XG4gICAgICB1cGRhdGVbaV0gPSBub2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbnRlcltpXSA9IG5ldyBFbnRlck5vZGUocGFyZW50LCBkYXRhW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBQdXQgYW55IG5vbi1udWxsIG5vZGVzIHRoYXQgZG9u4oCZdCBmaXQgaW50byBleGl0LlxuICBmb3IgKDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICBleGl0W2ldID0gbm9kZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYmluZEtleShwYXJlbnQsIGdyb3VwLCBlbnRlciwgdXBkYXRlLCBleGl0LCBkYXRhLCBrZXkpIHtcbiAgdmFyIGksXG4gICAgICBub2RlLFxuICAgICAgbm9kZUJ5S2V5VmFsdWUgPSB7fSxcbiAgICAgIGdyb3VwTGVuZ3RoID0gZ3JvdXAubGVuZ3RoLFxuICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoLFxuICAgICAga2V5VmFsdWVzID0gbmV3IEFycmF5KGdyb3VwTGVuZ3RoKSxcbiAgICAgIGtleVZhbHVlO1xuXG4gIC8vIENvbXB1dGUgdGhlIGtleSBmb3IgZWFjaCBub2RlLlxuICAvLyBJZiBtdWx0aXBsZSBub2RlcyBoYXZlIHRoZSBzYW1lIGtleSwgdGhlIGR1cGxpY2F0ZXMgYXJlIGFkZGVkIHRvIGV4aXQuXG4gIGZvciAoaSA9IDA7IGkgPCBncm91cExlbmd0aDsgKytpKSB7XG4gICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAga2V5VmFsdWVzW2ldID0ga2V5VmFsdWUgPSBrZXlQcmVmaXggKyBrZXkuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCk7XG4gICAgICBpZiAoa2V5VmFsdWUgaW4gbm9kZUJ5S2V5VmFsdWUpIHtcbiAgICAgICAgZXhpdFtpXSA9IG5vZGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlQnlLZXlWYWx1ZVtrZXlWYWx1ZV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENvbXB1dGUgdGhlIGtleSBmb3IgZWFjaCBkYXR1bS5cbiAgLy8gSWYgdGhlcmUgYSBub2RlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGtleSwgam9pbiBhbmQgYWRkIGl0IHRvIHVwZGF0ZS5cbiAgLy8gSWYgdGhlcmUgaXMgbm90IChvciB0aGUga2V5IGlzIGEgZHVwbGljYXRlKSwgYWRkIGl0IHRvIGVudGVyLlxuICBmb3IgKGkgPSAwOyBpIDwgZGF0YUxlbmd0aDsgKytpKSB7XG4gICAga2V5VmFsdWUgPSBrZXlQcmVmaXggKyBrZXkuY2FsbChwYXJlbnQsIGRhdGFbaV0sIGksIGRhdGEpO1xuICAgIGlmIChub2RlID0gbm9kZUJ5S2V5VmFsdWVba2V5VmFsdWVdKSB7XG4gICAgICB1cGRhdGVbaV0gPSBub2RlO1xuICAgICAgbm9kZS5fX2RhdGFfXyA9IGRhdGFbaV07XG4gICAgICBub2RlQnlLZXlWYWx1ZVtrZXlWYWx1ZV0gPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbnRlcltpXSA9IG5ldyBFbnRlck5vZGUocGFyZW50LCBkYXRhW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgYW55IHJlbWFpbmluZyBub2RlcyB0aGF0IHdlcmUgbm90IGJvdW5kIHRvIGRhdGEgdG8gZXhpdC5cbiAgZm9yIChpID0gMDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgKG5vZGVCeUtleVZhbHVlW2tleVZhbHVlc1tpXV0gPT09IG5vZGUpKSB7XG4gICAgICBleGl0W2ldID0gbm9kZTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgZGF0YSA9IG5ldyBBcnJheSh0aGlzLnNpemUoKSksIGogPSAtMTtcbiAgICB0aGlzLmVhY2goZnVuY3Rpb24oZCkgeyBkYXRhWysral0gPSBkOyB9KTtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciBiaW5kID0ga2V5ID8gYmluZEtleSA6IGJpbmRJbmRleCxcbiAgICAgIHBhcmVudHMgPSB0aGlzLl9wYXJlbnRzLFxuICAgICAgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzO1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdmFsdWUgPSBjb25zdGFudCh2YWx1ZSk7XG5cbiAgZm9yICh2YXIgbSA9IGdyb3Vwcy5sZW5ndGgsIHVwZGF0ZSA9IG5ldyBBcnJheShtKSwgZW50ZXIgPSBuZXcgQXJyYXkobSksIGV4aXQgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgdmFyIHBhcmVudCA9IHBhcmVudHNbal0sXG4gICAgICAgIGdyb3VwID0gZ3JvdXBzW2pdLFxuICAgICAgICBncm91cExlbmd0aCA9IGdyb3VwLmxlbmd0aCxcbiAgICAgICAgZGF0YSA9IHZhbHVlLmNhbGwocGFyZW50LCBwYXJlbnQgJiYgcGFyZW50Ll9fZGF0YV9fLCBqLCBwYXJlbnRzKSxcbiAgICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoLFxuICAgICAgICBlbnRlckdyb3VwID0gZW50ZXJbal0gPSBuZXcgQXJyYXkoZGF0YUxlbmd0aCksXG4gICAgICAgIHVwZGF0ZUdyb3VwID0gdXBkYXRlW2pdID0gbmV3IEFycmF5KGRhdGFMZW5ndGgpLFxuICAgICAgICBleGl0R3JvdXAgPSBleGl0W2pdID0gbmV3IEFycmF5KGdyb3VwTGVuZ3RoKTtcblxuICAgIGJpbmQocGFyZW50LCBncm91cCwgZW50ZXJHcm91cCwgdXBkYXRlR3JvdXAsIGV4aXRHcm91cCwgZGF0YSwga2V5KTtcblxuICAgIC8vIE5vdyBjb25uZWN0IHRoZSBlbnRlciBub2RlcyB0byB0aGVpciBmb2xsb3dpbmcgdXBkYXRlIG5vZGUsIHN1Y2ggdGhhdFxuICAgIC8vIGFwcGVuZENoaWxkIGNhbiBpbnNlcnQgdGhlIG1hdGVyaWFsaXplZCBlbnRlciBub2RlIGJlZm9yZSB0aGlzIG5vZGUsXG4gICAgLy8gcmF0aGVyIHRoYW4gYXQgdGhlIGVuZCBvZiB0aGUgcGFyZW50IG5vZGUuXG4gICAgZm9yICh2YXIgaTAgPSAwLCBpMSA9IDAsIHByZXZpb3VzLCBuZXh0OyBpMCA8IGRhdGFMZW5ndGg7ICsraTApIHtcbiAgICAgIGlmIChwcmV2aW91cyA9IGVudGVyR3JvdXBbaTBdKSB7XG4gICAgICAgIGlmIChpMCA+PSBpMSkgaTEgPSBpMCArIDE7XG4gICAgICAgIHdoaWxlICghKG5leHQgPSB1cGRhdGVHcm91cFtpMV0pICYmICsraTEgPCBkYXRhTGVuZ3RoKTtcbiAgICAgICAgcHJldmlvdXMuX25leHQgPSBuZXh0IHx8IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlID0gbmV3IFNlbGVjdGlvbih1cGRhdGUsIHBhcmVudHMpO1xuICB1cGRhdGUuX2VudGVyID0gZW50ZXI7XG4gIHVwZGF0ZS5fZXhpdCA9IGV4aXQ7XG4gIHJldHVybiB1cGRhdGU7XG59XG4iLCJpbXBvcnQgc3BhcnNlIGZyb20gXCIuL3NwYXJzZVwiO1xuaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLl9leGl0IHx8IHRoaXMuX2dyb3Vwcy5tYXAoc3BhcnNlKSwgdGhpcy5fcGFyZW50cyk7XG59XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0aW9uKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzMCA9IHRoaXMuX2dyb3VwcywgZ3JvdXBzMSA9IHNlbGVjdGlvbi5fZ3JvdXBzLCBtMCA9IGdyb3VwczAubGVuZ3RoLCBtMSA9IGdyb3VwczEubGVuZ3RoLCBtID0gTWF0aC5taW4obTAsIG0xKSwgbWVyZ2VzID0gbmV3IEFycmF5KG0wKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cDAgPSBncm91cHMwW2pdLCBncm91cDEgPSBncm91cHMxW2pdLCBuID0gZ3JvdXAwLmxlbmd0aCwgbWVyZ2UgPSBtZXJnZXNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwMFtpXSB8fCBncm91cDFbaV0pIHtcbiAgICAgICAgbWVyZ2VbaV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBqIDwgbTA7ICsraikge1xuICAgIG1lcmdlc1tqXSA9IGdyb3VwczBbal07XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihtZXJnZXMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBqID0gLTEsIG0gPSBncm91cHMubGVuZ3RoOyArK2ogPCBtOykge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gZ3JvdXAubGVuZ3RoIC0gMSwgbmV4dCA9IGdyb3VwW2ldLCBub2RlOyAtLWkgPj0gMDspIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgICAgaWYgKG5leHQgJiYgbmV4dCAhPT0gbm9kZS5uZXh0U2libGluZykgbmV4dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBuZXh0KTtcbiAgICAgICAgbmV4dCA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29tcGFyZSkge1xuICBpZiAoIWNvbXBhcmUpIGNvbXBhcmUgPSBhc2NlbmRpbmc7XG5cbiAgZnVuY3Rpb24gY29tcGFyZU5vZGUoYSwgYikge1xuICAgIHJldHVybiBhICYmIGIgPyBjb21wYXJlKGEuX19kYXRhX18sIGIuX19kYXRhX18pIDogIWEgLSAhYjtcbiAgfVxuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHNvcnRncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHNvcnRncm91cCA9IHNvcnRncm91cHNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHNvcnRncm91cFtpXSA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICAgIHNvcnRncm91cC5zb3J0KGNvbXBhcmVOb2RlKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHNvcnRncm91cHMsIHRoaXMuX3BhcmVudHMpLm9yZGVyKCk7XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZyhhLCBiKSB7XG4gIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogYSA+PSBiID8gMCA6IE5hTjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbMF07XG4gIGFyZ3VtZW50c1swXSA9IHRoaXM7XG4gIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gIHJldHVybiB0aGlzO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlcyA9IG5ldyBBcnJheSh0aGlzLnNpemUoKSksIGkgPSAtMTtcbiAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkgeyBub2Rlc1srK2ldID0gdGhpczsgfSk7XG4gIHJldHVybiBub2Rlcztcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgaiA9IDAsIG0gPSBncm91cHMubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIGkgPSAwLCBuID0gZ3JvdXAubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICB2YXIgbm9kZSA9IGdyb3VwW2ldO1xuICAgICAgaWYgKG5vZGUpIHJldHVybiBub2RlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBzaXplID0gMDtcbiAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkgeyArK3NpemU7IH0pO1xuICByZXR1cm4gc2l6ZTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMubm9kZSgpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIGogPSAwLCBtID0gZ3JvdXBzLmxlbmd0aDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gMCwgbiA9IGdyb3VwLmxlbmd0aCwgbm9kZTsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkgY2FsbGJhY2suY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59XG4iLCJpbXBvcnQgbmFtZXNwYWNlIGZyb20gXCIuLi9uYW1lc3BhY2VcIjtcblxuZnVuY3Rpb24gYXR0clJlbW92ZShuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0clJlbW92ZU5TKGZ1bGxuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJDb25zdGFudChuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyQ29uc3RhbnROUyhmdWxsbmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsLCB2YWx1ZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIGVsc2UgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgdik7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbk5TKGZ1bGxuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMucmVtb3ZlQXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgICBlbHNlIHRoaXMuc2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsLCB2KTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHZhciBub2RlID0gdGhpcy5ub2RlKCk7XG4gICAgcmV0dXJuIGZ1bGxuYW1lLmxvY2FsXG4gICAgICAgID8gbm9kZS5nZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpXG4gICAgICAgIDogbm9kZS5nZXRBdHRyaWJ1dGUoZnVsbG5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbFxuICAgICAgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyUmVtb3ZlTlMgOiBhdHRyUmVtb3ZlKSA6ICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyRnVuY3Rpb25OUyA6IGF0dHJGdW5jdGlvbilcbiAgICAgIDogKGZ1bGxuYW1lLmxvY2FsID8gYXR0ckNvbnN0YW50TlMgOiBhdHRyQ29uc3RhbnQpKSkoZnVsbG5hbWUsIHZhbHVlKSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihub2RlKSB7XG4gIHJldHVybiAobm9kZS5vd25lckRvY3VtZW50ICYmIG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldykgLy8gbm9kZSBpcyBhIE5vZGVcbiAgICAgIHx8IChub2RlLmRvY3VtZW50ICYmIG5vZGUpIC8vIG5vZGUgaXMgYSBXaW5kb3dcbiAgICAgIHx8IG5vZGUuZGVmYXVsdFZpZXc7IC8vIG5vZGUgaXMgYSBEb2N1bWVudFxufVxuIiwiaW1wb3J0IGRlZmF1bHRWaWV3IGZyb20gXCIuLi93aW5kb3dcIjtcblxuZnVuY3Rpb24gc3R5bGVSZW1vdmUobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVDb25zdGFudChuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdmFsdWUsIHByaW9yaXR5KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVGdW5jdGlvbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSB0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpO1xuICAgIGVsc2UgdGhpcy5zdHlsZS5zZXRQcm9wZXJ0eShuYW1lLCB2LCBwcmlvcml0eSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDFcbiAgICAgID8gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgICA/IHN0eWxlUmVtb3ZlIDogdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICAgID8gc3R5bGVGdW5jdGlvblxuICAgICAgICAgICAgOiBzdHlsZUNvbnN0YW50KShuYW1lLCB2YWx1ZSwgcHJpb3JpdHkgPT0gbnVsbCA/IFwiXCIgOiBwcmlvcml0eSkpXG4gICAgICA6IHN0eWxlVmFsdWUodGhpcy5ub2RlKCksIG5hbWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3R5bGVWYWx1ZShub2RlLCBuYW1lKSB7XG4gIHJldHVybiBub2RlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUobmFtZSlcbiAgICAgIHx8IGRlZmF1bHRWaWV3KG5vZGUpLmdldENvbXB1dGVkU3R5bGUobm9kZSwgbnVsbCkuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKTtcbn1cbiIsImZ1bmN0aW9uIHByb3BlcnR5UmVtb3ZlKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGRlbGV0ZSB0aGlzW25hbWVdO1xuICB9O1xufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eUNvbnN0YW50KG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzW25hbWVdID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5RnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSBkZWxldGUgdGhpc1tuYW1lXTtcbiAgICBlbHNlIHRoaXNbbmFtZV0gPSB2O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDFcbiAgICAgID8gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyBwcm9wZXJ0eVJlbW92ZSA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBwcm9wZXJ0eUZ1bmN0aW9uXG4gICAgICAgICAgOiBwcm9wZXJ0eUNvbnN0YW50KShuYW1lLCB2YWx1ZSkpXG4gICAgICA6IHRoaXMubm9kZSgpW25hbWVdO1xufVxuIiwiZnVuY3Rpb24gY2xhc3NBcnJheShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZy50cmltKCkuc3BsaXQoL158XFxzKy8pO1xufVxuXG5mdW5jdGlvbiBjbGFzc0xpc3Qobm9kZSkge1xuICByZXR1cm4gbm9kZS5jbGFzc0xpc3QgfHwgbmV3IENsYXNzTGlzdChub2RlKTtcbn1cblxuZnVuY3Rpb24gQ2xhc3NMaXN0KG5vZGUpIHtcbiAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gIHRoaXMuX25hbWVzID0gY2xhc3NBcnJheShub2RlLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpIHx8IFwiXCIpO1xufVxuXG5DbGFzc0xpc3QucHJvdG90eXBlID0ge1xuICBhZGQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaSA9IHRoaXMuX25hbWVzLmluZGV4T2YobmFtZSk7XG4gICAgaWYgKGkgPCAwKSB7XG4gICAgICB0aGlzLl9uYW1lcy5wdXNoKG5hbWUpO1xuICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0aGlzLl9uYW1lcy5qb2luKFwiIFwiKSk7XG4gICAgfVxuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaSA9IHRoaXMuX25hbWVzLmluZGV4T2YobmFtZSk7XG4gICAgaWYgKGkgPj0gMCkge1xuICAgICAgdGhpcy5fbmFtZXMuc3BsaWNlKGksIDEpO1xuICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0aGlzLl9uYW1lcy5qb2luKFwiIFwiKSk7XG4gICAgfVxuICB9LFxuICBjb250YWluczogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9uYW1lcy5pbmRleE9mKG5hbWUpID49IDA7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNsYXNzZWRBZGQobm9kZSwgbmFtZXMpIHtcbiAgdmFyIGxpc3QgPSBjbGFzc0xpc3Qobm9kZSksIGkgPSAtMSwgbiA9IG5hbWVzLmxlbmd0aDtcbiAgd2hpbGUgKCsraSA8IG4pIGxpc3QuYWRkKG5hbWVzW2ldKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NlZFJlbW92ZShub2RlLCBuYW1lcykge1xuICB2YXIgbGlzdCA9IGNsYXNzTGlzdChub2RlKSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICB3aGlsZSAoKytpIDwgbikgbGlzdC5yZW1vdmUobmFtZXNbaV0pO1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkVHJ1ZShuYW1lcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2xhc3NlZEFkZCh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRGYWxzZShuYW1lcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2xhc3NlZFJlbW92ZSh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRGdW5jdGlvbihuYW1lcywgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICh2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpID8gY2xhc3NlZEFkZCA6IGNsYXNzZWRSZW1vdmUpKHRoaXMsIG5hbWVzKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIG5hbWVzID0gY2xhc3NBcnJheShuYW1lICsgXCJcIik7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgdmFyIGxpc3QgPSBjbGFzc0xpc3QodGhpcy5ub2RlKCkpLCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IG4pIGlmICghbGlzdC5jb250YWlucyhuYW1lc1tpXSkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmVhY2goKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IGNsYXNzZWRGdW5jdGlvbiA6IHZhbHVlXG4gICAgICA/IGNsYXNzZWRUcnVlXG4gICAgICA6IGNsYXNzZWRGYWxzZSkobmFtZXMsIHZhbHVlKSk7XG59XG4iLCJmdW5jdGlvbiB0ZXh0UmVtb3ZlKCkge1xuICB0aGlzLnRleHRDb250ZW50ID0gXCJcIjtcbn1cblxuZnVuY3Rpb24gdGV4dENvbnN0YW50KHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRleHRGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMudGV4dENvbnRlbnQgPSB2ID09IG51bGwgPyBcIlwiIDogdjtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5lYWNoKHZhbHVlID09IG51bGxcbiAgICAgICAgICA/IHRleHRSZW1vdmUgOiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IHRleHRGdW5jdGlvblxuICAgICAgICAgIDogdGV4dENvbnN0YW50KSh2YWx1ZSkpXG4gICAgICA6IHRoaXMubm9kZSgpLnRleHRDb250ZW50O1xufVxuIiwiZnVuY3Rpb24gaHRtbFJlbW92ZSgpIHtcbiAgdGhpcy5pbm5lckhUTUwgPSBcIlwiO1xufVxuXG5mdW5jdGlvbiBodG1sQ29uc3RhbnQodmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW5uZXJIVE1MID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGh0bWxGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMuaW5uZXJIVE1MID0gdiA9PSBudWxsID8gXCJcIiA6IHY7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyBodG1sUmVtb3ZlIDogKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBodG1sRnVuY3Rpb25cbiAgICAgICAgICA6IGh0bWxDb25zdGFudCkodmFsdWUpKVxuICAgICAgOiB0aGlzLm5vZGUoKS5pbm5lckhUTUw7XG59XG4iLCJmdW5jdGlvbiByYWlzZSgpIHtcbiAgaWYgKHRoaXMubmV4dFNpYmxpbmcpIHRoaXMucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVhY2gocmFpc2UpO1xufVxuIiwiZnVuY3Rpb24gbG93ZXIoKSB7XG4gIGlmICh0aGlzLnByZXZpb3VzU2libGluZykgdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLCB0aGlzLnBhcmVudE5vZGUuZmlyc3RDaGlsZCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lYWNoKGxvd2VyKTtcbn1cbiIsImltcG9ydCBjcmVhdG9yIGZyb20gXCIuLi9jcmVhdG9yXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGNyZWF0ZSA9IHR5cGVvZiBuYW1lID09PSBcImZ1bmN0aW9uXCIgPyBuYW1lIDogY3JlYXRvcihuYW1lKTtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmFwcGVuZENoaWxkKGNyZWF0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgfSk7XG59XG4iLCJpbXBvcnQgY3JlYXRvciBmcm9tIFwiLi4vY3JlYXRvclwiO1xuaW1wb3J0IHNlbGVjdG9yIGZyb20gXCIuLi9zZWxlY3RvclwiO1xuXG5mdW5jdGlvbiBjb25zdGFudE51bGwoKSB7XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCBiZWZvcmUpIHtcbiAgdmFyIGNyZWF0ZSA9IHR5cGVvZiBuYW1lID09PSBcImZ1bmN0aW9uXCIgPyBuYW1lIDogY3JlYXRvcihuYW1lKSxcbiAgICAgIHNlbGVjdCA9IGJlZm9yZSA9PSBudWxsID8gY29uc3RhbnROdWxsIDogdHlwZW9mIGJlZm9yZSA9PT0gXCJmdW5jdGlvblwiID8gYmVmb3JlIDogc2VsZWN0b3IoYmVmb3JlKTtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmluc2VydEJlZm9yZShjcmVhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSwgc2VsZWN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgbnVsbCk7XG4gIH0pO1xufVxuIiwiZnVuY3Rpb24gcmVtb3ZlKCkge1xuICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnROb2RlO1xuICBpZiAocGFyZW50KSBwYXJlbnQucmVtb3ZlQ2hpbGQodGhpcyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lYWNoKHJlbW92ZSk7XG59XG4iLCJmdW5jdGlvbiBzZWxlY3Rpb25fY2xvbmVTaGFsbG93KCkge1xuICByZXR1cm4gdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmNsb25lTm9kZShmYWxzZSksIHRoaXMubmV4dFNpYmxpbmcpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3Rpb25fY2xvbmVEZWVwKCkge1xuICByZXR1cm4gdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmNsb25lTm9kZSh0cnVlKSwgdGhpcy5uZXh0U2libGluZyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGRlZXApIHtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGRlZXAgPyBzZWxlY3Rpb25fY2xvbmVEZWVwIDogc2VsZWN0aW9uX2Nsb25lU2hhbGxvdyk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLnByb3BlcnR5KFwiX19kYXRhX19cIiwgdmFsdWUpXG4gICAgICA6IHRoaXMubm9kZSgpLl9fZGF0YV9fO1xufVxuIiwidmFyIGZpbHRlckV2ZW50cyA9IHt9O1xuXG5leHBvcnQgdmFyIGV2ZW50ID0gbnVsbDtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgaWYgKCEoXCJvbm1vdXNlZW50ZXJcIiBpbiBlbGVtZW50KSkge1xuICAgIGZpbHRlckV2ZW50cyA9IHttb3VzZWVudGVyOiBcIm1vdXNlb3ZlclwiLCBtb3VzZWxlYXZlOiBcIm1vdXNlb3V0XCJ9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbHRlckNvbnRleHRMaXN0ZW5lcihsaXN0ZW5lciwgaW5kZXgsIGdyb3VwKSB7XG4gIGxpc3RlbmVyID0gY29udGV4dExpc3RlbmVyKGxpc3RlbmVyLCBpbmRleCwgZ3JvdXApO1xuICByZXR1cm4gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgcmVsYXRlZCA9IGV2ZW50LnJlbGF0ZWRUYXJnZXQ7XG4gICAgaWYgKCFyZWxhdGVkIHx8IChyZWxhdGVkICE9PSB0aGlzICYmICEocmVsYXRlZC5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbih0aGlzKSAmIDgpKSkge1xuICAgICAgbGlzdGVuZXIuY2FsbCh0aGlzLCBldmVudCk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBjb250ZXh0TGlzdGVuZXIobGlzdGVuZXIsIGluZGV4LCBncm91cCkge1xuICByZXR1cm4gZnVuY3Rpb24oZXZlbnQxKSB7XG4gICAgdmFyIGV2ZW50MCA9IGV2ZW50OyAvLyBFdmVudHMgY2FuIGJlIHJlZW50cmFudCAoZS5nLiwgZm9jdXMpLlxuICAgIGV2ZW50ID0gZXZlbnQxO1xuICAgIHRyeSB7XG4gICAgICBsaXN0ZW5lci5jYWxsKHRoaXMsIHRoaXMuX19kYXRhX18sIGluZGV4LCBncm91cCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGV2ZW50ID0gZXZlbnQwO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VUeXBlbmFtZXModHlwZW5hbWVzKSB7XG4gIHJldHVybiB0eXBlbmFtZXMudHJpbSgpLnNwbGl0KC9efFxccysvKS5tYXAoZnVuY3Rpb24odCkge1xuICAgIHZhciBuYW1lID0gXCJcIiwgaSA9IHQuaW5kZXhPZihcIi5cIik7XG4gICAgaWYgKGkgPj0gMCkgbmFtZSA9IHQuc2xpY2UoaSArIDEpLCB0ID0gdC5zbGljZSgwLCBpKTtcbiAgICByZXR1cm4ge3R5cGU6IHQsIG5hbWU6IG5hbWV9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gb25SZW1vdmUodHlwZW5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBvbiA9IHRoaXMuX19vbjtcbiAgICBpZiAoIW9uKSByZXR1cm47XG4gICAgZm9yICh2YXIgaiA9IDAsIGkgPSAtMSwgbSA9IG9uLmxlbmd0aCwgbzsgaiA8IG07ICsraikge1xuICAgICAgaWYgKG8gPSBvbltqXSwgKCF0eXBlbmFtZS50eXBlIHx8IG8udHlwZSA9PT0gdHlwZW5hbWUudHlwZSkgJiYgby5uYW1lID09PSB0eXBlbmFtZS5uYW1lKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihvLnR5cGUsIG8ubGlzdGVuZXIsIG8uY2FwdHVyZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvblsrK2ldID0gbztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCsraSkgb24ubGVuZ3RoID0gaTtcbiAgICBlbHNlIGRlbGV0ZSB0aGlzLl9fb247XG4gIH07XG59XG5cbmZ1bmN0aW9uIG9uQWRkKHR5cGVuYW1lLCB2YWx1ZSwgY2FwdHVyZSkge1xuICB2YXIgd3JhcCA9IGZpbHRlckV2ZW50cy5oYXNPd25Qcm9wZXJ0eSh0eXBlbmFtZS50eXBlKSA/IGZpbHRlckNvbnRleHRMaXN0ZW5lciA6IGNvbnRleHRMaXN0ZW5lcjtcbiAgcmV0dXJuIGZ1bmN0aW9uKGQsIGksIGdyb3VwKSB7XG4gICAgdmFyIG9uID0gdGhpcy5fX29uLCBvLCBsaXN0ZW5lciA9IHdyYXAodmFsdWUsIGksIGdyb3VwKTtcbiAgICBpZiAob24pIGZvciAodmFyIGogPSAwLCBtID0gb24ubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgICBpZiAoKG8gPSBvbltqXSkudHlwZSA9PT0gdHlwZW5hbWUudHlwZSAmJiBvLm5hbWUgPT09IHR5cGVuYW1lLm5hbWUpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciwgby5jYXB0dXJlKTtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciA9IGxpc3RlbmVyLCBvLmNhcHR1cmUgPSBjYXB0dXJlKTtcbiAgICAgICAgby52YWx1ZSA9IHZhbHVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcih0eXBlbmFtZS50eXBlLCBsaXN0ZW5lciwgY2FwdHVyZSk7XG4gICAgbyA9IHt0eXBlOiB0eXBlbmFtZS50eXBlLCBuYW1lOiB0eXBlbmFtZS5uYW1lLCB2YWx1ZTogdmFsdWUsIGxpc3RlbmVyOiBsaXN0ZW5lciwgY2FwdHVyZTogY2FwdHVyZX07XG4gICAgaWYgKCFvbikgdGhpcy5fX29uID0gW29dO1xuICAgIGVsc2Ugb24ucHVzaChvKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odHlwZW5hbWUsIHZhbHVlLCBjYXB0dXJlKSB7XG4gIHZhciB0eXBlbmFtZXMgPSBwYXJzZVR5cGVuYW1lcyh0eXBlbmFtZSArIFwiXCIpLCBpLCBuID0gdHlwZW5hbWVzLmxlbmd0aCwgdDtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICB2YXIgb24gPSB0aGlzLm5vZGUoKS5fX29uO1xuICAgIGlmIChvbikgZm9yICh2YXIgaiA9IDAsIG0gPSBvbi5sZW5ndGgsIG87IGogPCBtOyArK2opIHtcbiAgICAgIGZvciAoaSA9IDAsIG8gPSBvbltqXTsgaSA8IG47ICsraSkge1xuICAgICAgICBpZiAoKHQgPSB0eXBlbmFtZXNbaV0pLnR5cGUgPT09IG8udHlwZSAmJiB0Lm5hbWUgPT09IG8ubmFtZSkge1xuICAgICAgICAgIHJldHVybiBvLnZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIG9uID0gdmFsdWUgPyBvbkFkZCA6IG9uUmVtb3ZlO1xuICBpZiAoY2FwdHVyZSA9PSBudWxsKSBjYXB0dXJlID0gZmFsc2U7XG4gIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHRoaXMuZWFjaChvbih0eXBlbmFtZXNbaV0sIHZhbHVlLCBjYXB0dXJlKSk7XG4gIHJldHVybiB0aGlzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3VzdG9tRXZlbnQoZXZlbnQxLCBsaXN0ZW5lciwgdGhhdCwgYXJncykge1xuICB2YXIgZXZlbnQwID0gZXZlbnQ7XG4gIGV2ZW50MS5zb3VyY2VFdmVudCA9IGV2ZW50O1xuICBldmVudCA9IGV2ZW50MTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gbGlzdGVuZXIuYXBwbHkodGhhdCwgYXJncyk7XG4gIH0gZmluYWxseSB7XG4gICAgZXZlbnQgPSBldmVudDA7XG4gIH1cbn1cbiIsImltcG9ydCBkZWZhdWx0VmlldyBmcm9tIFwiLi4vd2luZG93XCI7XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRXZlbnQobm9kZSwgdHlwZSwgcGFyYW1zKSB7XG4gIHZhciB3aW5kb3cgPSBkZWZhdWx0Vmlldyhub2RlKSxcbiAgICAgIGV2ZW50ID0gd2luZG93LkN1c3RvbUV2ZW50O1xuXG4gIGlmICh0eXBlb2YgZXZlbnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGV2ZW50ID0gbmV3IGV2ZW50KHR5cGUsIHBhcmFtcyk7XG4gIH0gZWxzZSB7XG4gICAgZXZlbnQgPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJFdmVudFwiKTtcbiAgICBpZiAocGFyYW1zKSBldmVudC5pbml0RXZlbnQodHlwZSwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlKSwgZXZlbnQuZGV0YWlsID0gcGFyYW1zLmRldGFpbDtcbiAgICBlbHNlIGV2ZW50LmluaXRFdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UpO1xuICB9XG5cbiAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuZnVuY3Rpb24gZGlzcGF0Y2hDb25zdGFudCh0eXBlLCBwYXJhbXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkaXNwYXRjaEV2ZW50KHRoaXMsIHR5cGUsIHBhcmFtcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRnVuY3Rpb24odHlwZSwgcGFyYW1zKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGlzcGF0Y2hFdmVudCh0aGlzLCB0eXBlLCBwYXJhbXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHR5cGUsIHBhcmFtcykge1xuICByZXR1cm4gdGhpcy5lYWNoKCh0eXBlb2YgcGFyYW1zID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gZGlzcGF0Y2hGdW5jdGlvblxuICAgICAgOiBkaXNwYXRjaENvbnN0YW50KSh0eXBlLCBwYXJhbXMpKTtcbn1cbiIsImltcG9ydCBzZWxlY3Rpb25fc2VsZWN0IGZyb20gXCIuL3NlbGVjdFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zZWxlY3RBbGwgZnJvbSBcIi4vc2VsZWN0QWxsXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2ZpbHRlciBmcm9tIFwiLi9maWx0ZXJcIjtcbmltcG9ydCBzZWxlY3Rpb25fZGF0YSBmcm9tIFwiLi9kYXRhXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2VudGVyIGZyb20gXCIuL2VudGVyXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2V4aXQgZnJvbSBcIi4vZXhpdFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9tZXJnZSBmcm9tIFwiLi9tZXJnZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9vcmRlciBmcm9tIFwiLi9vcmRlclwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zb3J0IGZyb20gXCIuL3NvcnRcIjtcbmltcG9ydCBzZWxlY3Rpb25fY2FsbCBmcm9tIFwiLi9jYWxsXCI7XG5pbXBvcnQgc2VsZWN0aW9uX25vZGVzIGZyb20gXCIuL25vZGVzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX25vZGUgZnJvbSBcIi4vbm9kZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zaXplIGZyb20gXCIuL3NpemVcIjtcbmltcG9ydCBzZWxlY3Rpb25fZW1wdHkgZnJvbSBcIi4vZW1wdHlcIjtcbmltcG9ydCBzZWxlY3Rpb25fZWFjaCBmcm9tIFwiLi9lYWNoXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2F0dHIgZnJvbSBcIi4vYXR0clwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zdHlsZSBmcm9tIFwiLi9zdHlsZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9wcm9wZXJ0eSBmcm9tIFwiLi9wcm9wZXJ0eVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9jbGFzc2VkIGZyb20gXCIuL2NsYXNzZWRcIjtcbmltcG9ydCBzZWxlY3Rpb25fdGV4dCBmcm9tIFwiLi90ZXh0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX2h0bWwgZnJvbSBcIi4vaHRtbFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9yYWlzZSBmcm9tIFwiLi9yYWlzZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9sb3dlciBmcm9tIFwiLi9sb3dlclwiO1xuaW1wb3J0IHNlbGVjdGlvbl9hcHBlbmQgZnJvbSBcIi4vYXBwZW5kXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2luc2VydCBmcm9tIFwiLi9pbnNlcnRcIjtcbmltcG9ydCBzZWxlY3Rpb25fcmVtb3ZlIGZyb20gXCIuL3JlbW92ZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9jbG9uZSBmcm9tIFwiLi9jbG9uZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9kYXR1bSBmcm9tIFwiLi9kYXR1bVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9vbiBmcm9tIFwiLi9vblwiO1xuaW1wb3J0IHNlbGVjdGlvbl9kaXNwYXRjaCBmcm9tIFwiLi9kaXNwYXRjaFwiO1xuXG5leHBvcnQgdmFyIHJvb3QgPSBbbnVsbF07XG5cbmV4cG9ydCBmdW5jdGlvbiBTZWxlY3Rpb24oZ3JvdXBzLCBwYXJlbnRzKSB7XG4gIHRoaXMuX2dyb3VwcyA9IGdyb3VwcztcbiAgdGhpcy5fcGFyZW50cyA9IHBhcmVudHM7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oW1tkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRdXSwgcm9vdCk7XG59XG5cblNlbGVjdGlvbi5wcm90b3R5cGUgPSBzZWxlY3Rpb24ucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogU2VsZWN0aW9uLFxuICBzZWxlY3Q6IHNlbGVjdGlvbl9zZWxlY3QsXG4gIHNlbGVjdEFsbDogc2VsZWN0aW9uX3NlbGVjdEFsbCxcbiAgZmlsdGVyOiBzZWxlY3Rpb25fZmlsdGVyLFxuICBkYXRhOiBzZWxlY3Rpb25fZGF0YSxcbiAgZW50ZXI6IHNlbGVjdGlvbl9lbnRlcixcbiAgZXhpdDogc2VsZWN0aW9uX2V4aXQsXG4gIG1lcmdlOiBzZWxlY3Rpb25fbWVyZ2UsXG4gIG9yZGVyOiBzZWxlY3Rpb25fb3JkZXIsXG4gIHNvcnQ6IHNlbGVjdGlvbl9zb3J0LFxuICBjYWxsOiBzZWxlY3Rpb25fY2FsbCxcbiAgbm9kZXM6IHNlbGVjdGlvbl9ub2RlcyxcbiAgbm9kZTogc2VsZWN0aW9uX25vZGUsXG4gIHNpemU6IHNlbGVjdGlvbl9zaXplLFxuICBlbXB0eTogc2VsZWN0aW9uX2VtcHR5LFxuICBlYWNoOiBzZWxlY3Rpb25fZWFjaCxcbiAgYXR0cjogc2VsZWN0aW9uX2F0dHIsXG4gIHN0eWxlOiBzZWxlY3Rpb25fc3R5bGUsXG4gIHByb3BlcnR5OiBzZWxlY3Rpb25fcHJvcGVydHksXG4gIGNsYXNzZWQ6IHNlbGVjdGlvbl9jbGFzc2VkLFxuICB0ZXh0OiBzZWxlY3Rpb25fdGV4dCxcbiAgaHRtbDogc2VsZWN0aW9uX2h0bWwsXG4gIHJhaXNlOiBzZWxlY3Rpb25fcmFpc2UsXG4gIGxvd2VyOiBzZWxlY3Rpb25fbG93ZXIsXG4gIGFwcGVuZDogc2VsZWN0aW9uX2FwcGVuZCxcbiAgaW5zZXJ0OiBzZWxlY3Rpb25faW5zZXJ0LFxuICByZW1vdmU6IHNlbGVjdGlvbl9yZW1vdmUsXG4gIGNsb25lOiBzZWxlY3Rpb25fY2xvbmUsXG4gIGRhdHVtOiBzZWxlY3Rpb25fZGF0dW0sXG4gIG9uOiBzZWxlY3Rpb25fb24sXG4gIGRpc3BhdGNoOiBzZWxlY3Rpb25fZGlzcGF0Y2hcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHNlbGVjdGlvbjtcbiIsImltcG9ydCB7U2VsZWN0aW9uLCByb290fSBmcm9tIFwiLi9zZWxlY3Rpb24vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyBuZXcgU2VsZWN0aW9uKFtbZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcildXSwgW2RvY3VtZW50LmRvY3VtZW50RWxlbWVudF0pXG4gICAgICA6IG5ldyBTZWxlY3Rpb24oW1tzZWxlY3Rvcl1dLCByb290KTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuZXhwb3J0IGZ1bmN0aW9uIGdldEd0ZXhVcmxzKCl7XG4gICAgY29uc3QgaG9zdCA9ICdodHRwczovL2d0ZXhwb3J0YWwub3JnL3Jlc3QvdjEvJzsgLy8gTk9URTogdG9wIGV4cHJlc3NlZCBnZW5lcyBhcmUgbm90IHlldCBpbiBwcm9kdWN0aW9uXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZHluZXF0bDogaG9zdCArICdhc3NvY2lhdGlvbi9keW5lcXRsJyxcblxuICAgICAgICBleG9uRXhwOiBob3N0ICsgJ2V4cHJlc3Npb24vbWVkaWFuRXhvbkV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmaGNsdXN0ZXI9dHJ1ZSZnZW5jb2RlSWQ9JyxcblxuICAgICAgICBnZW5lSWQ6IGhvc3QgKyAncmVmZXJlbmNlL2dlbmVJZD9mb3JtYXQ9anNvbiZyZWxlYXNlPXY3JmdlbmVJZD0nLFxuICAgICAgICBnZW5lRXhwOiBob3N0ICsgJ2V4cHJlc3Npb24vZ2VuZUV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmZ2VuY29kZUlkPScsXG4gICAgICAgIGdlbmVNb2RlbDogaG9zdCArICdyZWZlcmVuY2UvY29sbGFwc2VkR2VuZU1vZGVsP3VuZmlsdGVyZWQ9ZmFsc2UmcmVsZWFzZT12NyZnZW5lSWQ9JyxcbiAgICAgICAgZ2VuZU1vZGVsVW5maWx0ZXJlZDogaG9zdCArICdyZWZlcmVuY2UvY29sbGFwc2VkR2VuZU1vZGVsP3VuZmlsdGVyZWQ9dHJ1ZSZyZWxlYXNlPXY3JmdlbmVJZD0nLFxuXG4gICAgICAgIGlzb2Zvcm06IGhvc3QgKyAncmVmZXJlbmNlL3RyYW5zY3JpcHQ/cmVsZWFzZT12NyZnZW5jb2RlX2lkPScsXG4gICAgICAgIGlzb2Zvcm1FeHA6IGhvc3QgKyAnZXhwcmVzc2lvbi9pc29mb3JtRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZib3hwbG90RGV0YWlsPW1lZGlhbiZnZW5jb2RlSWQ9JyxcblxuICAgICAgICBqdW5jdGlvbkV4cDogaG9zdCArICdleHByZXNzaW9uL21lZGlhbkp1bmN0aW9uRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZoY2x1c3Rlcj10cnVlJmdlbmNvZGVJZD0nLFxuXG4gICAgICAgIG1lZEdlbmVFeHA6IGhvc3QgKyAnZXhwcmVzc2lvbi9tZWRpYW5HZW5lRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZoY2x1c3Rlcj10cnVlJnBhZ2Vfc2l6ZT0xMDAwMCcsXG5cbiAgICAgICAgLy8gc2FtcGxlOiAnZGF0YS9ndGV4LlNhbXBsZS5jc3YnLFxuICAgICAgICBzYW1wbGU6ICd0bXBTdW1tYXJ5RGF0YS9ndGV4LlNhbXBsZS5jc3YnLFxuICAgICAgICBzbnA6IGhvc3QgKyAncmVmZXJlbmNlL3NucD9yZWZlcmVuY2U9Y3VycmVudCZmb3JtYXQ9anNvbiZzbnBJZD0nLFxuXG4gICAgICAgIHRpc3N1ZTogIGhvc3QgKyAnZGF0YXNldC90aXNzdWVJbmZvJyxcbiAgICAgICAgdGlzc3VlU2l0ZXM6IGhvc3QgKyAnZGF0YXNldC90aXNzdWVTaXRlRGV0YWlsP2Zvcm1hdD1qc29uJyxcblxuICAgICAgICB0b3BJblRpc3N1ZUZpbHRlcmVkOiBob3N0ICsgJ2V4cHJlc3Npb24vdG9wRXhwcmVzc2VkR2VuZXM/ZGF0YXNldElkPWd0ZXhfdjcmZmlsdGVyTXRHZW5lPXRydWUmc29ydF9ieT1tZWRpYW4mc29ydERpcmVjdGlvbj1kZXNjJnBhZ2Vfc2l6ZT01MCZ0aXNzdWVJZD0nLFxuICAgICAgICB0b3BJblRpc3N1ZTogaG9zdCArICdleHByZXNzaW9uL3RvcEV4cHJlc3NlZEdlbmVzP2RhdGFzZXRJZD1ndGV4X3Y3JnNvcnRfYnk9bWVkaWFuJnNvcnREaXJlY3Rpb249ZGVzYyZwYWdlX3NpemU9NTAmdGlzc3VlSWQ9JyxcblxuICAgICAgICB2YXJpYW50SWQ6IGhvc3QgKyAncmVmZXJlbmNlL3NucD9mb3JtYXQ9anNvbiZyZWZlcmVuY2U9Y3VycmVudCZyZWxlYXNlPXY3JnZhcmlhbnRJZD0nLFxuXG4gICAgICAgIC8vIGxvY2FsIHN0YXRpYyBmaWxlc1xuICAgICAgICBybmFzZXFDcmFtOiAndG1wU3VtbWFyeURhdGEvcm5hc2VxX2NyYW1fZmlsZXNfdjdfZGJHYVBfMDExNTE2LnR4dCcsXG4gICAgICAgIHdnc0NyYW06ICd0bXBTdW1tYXJ5RGF0YS93Z3NfY3JhbV9maWxlc192N19oZzM4X2RiR2FQXzAxMTUxNi50eHQnLFxuXG4gICAgfVxufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBnZW5lcyBmcm9tIEdURXggd2ViIHNlcnZpY2VcbiAqIEBwYXJhbSBkYXRhIHtKc29ufVxuICogQHJldHVybnMge0xpc3R9IG9mIGdlbmVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUdlbmVzKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSAnZ2VuZUlkJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ0dlbmUgd2ViIHNlcnZpY2UgcGFyc2luZyBlcnJvcic7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl07XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIHRpc3N1ZXNcbiAqIEBwYXJhbSBkYXRhIHtKc29ufVxuICogQHJldHVybnMge0xpc3R9IG9mIHRpc3N1ZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGlzc3VlcyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gJ3Rpc3N1ZUluZm8nO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAnRmF0YWwgRXJyb3I6IHBhcnNlVGlzc3VlcyBpbnB1dCBlcnJvci4nO1xuICAgIGNvbnN0IHRpc3N1ZXMgPSBkYXRhW2F0dHJdO1xuXG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgWyd0aXNzdWVJZCcsICd0aXNzdWVOYW1lJywgJ2NvbG9ySGV4J10uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCF0aXNzdWVzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyAnRmF0YWwgRXJyb3I6IHBhcnNlVGlzc3VlIGF0dHIgbm90IGZvdW5kOiAnICsgZDtcbiAgICB9KTtcblxuICAgIHJldHVybiB0aXNzdWVzO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSB0aXNzdWUgZ3JvdXBzXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEBwYXJhbSBmb3JFcXRsIHtCb29sZWFufVxuICogQHJldHVybnMge0RpY3Rpb25hcnl9IG9mIGxpc3RzIG9mIHRpc3N1ZXMgaW5kZXhlZCBieSB0aGUgdGlzc3VlIGdyb3VwIG5hbWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGlzc3VlU2l0ZXMoZGF0YSwgZm9yRXF0bD1mYWxzZSl7XG4gICAgLy8gdGhlIGxpc3Qgb2YgaW52YWxpZGUgZXF0bCB0aXNzdWVzIGR1ZSB0byBzYW1wbGUgc2l6ZSA8IDcwXG4gICAgLy8gYSBoYXJkLWNvZGVkIGxpc3QgYmVjYXVzZSB0aGUgc2FtcGxlIHNpemUgaXMgbm90IGVhc3kgdG8gcmV0cmlldmVcbiAgICBjb25zdCBpbnZhbGlkVGlzc3VlcyA9IFsnQmxhZGRlcicsICdDZXJ2aXhfRWN0b2NlcnZpeCcsICdDZXJ2aXhfRW5kb2NlcnZpeCcsICdGYWxsb3BpYW5fVHViZScsICdLaWRuZXlfQ29ydGV4J107XG5cbiAgICBjb25zdCBhdHRyID0gJ3Rpc3N1ZVNpdGVEZXRhaWwnO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAnRmF0YWwgRXJyb3I6IHBhcnNlVGlzc3VlU2l0ZXMgaW5wdXQgZXJyb3IuJztcbiAgICBjb25zdCB0aXNzdWVzID0gZm9yRXF0bD09ZmFsc2U/ZGF0YVthdHRyXTpkYXRhW2F0dHJdLmZpbHRlcigoZCk9PntyZXR1cm4gIWludmFsaWRUaXNzdWVzLmluY2x1ZGVzKGQudGlzc3VlX3NpdGVfZGV0YWlsX2lkKX0pOyAvLyBhbiBhcnJheSBvZiB0aXNzdWVfc2l0ZV9kZXRhaWwgb2JqZWN0c1xuXG4gICAgLy8gYnVpbGQgdGhlIHRpc3N1ZUdyb3VwcyBsb29rdXAgZGljdGlvbmFyeSBpbmRleGVkIGJ5IHRoZSB0aXNzdWUgZ3JvdXAgbmFtZSAoaS5lLiB0aGUgdGlzc3VlIG1haW4gc2l0ZSBuYW1lKVxuICAgIFsndGlzc3VlX3NpdGUnLCAndGlzc3VlX3NpdGVfZGV0YWlsX2lkJywgJ3Rpc3N1ZV9zaXRlX2RldGFpbCddLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICghdGlzc3Vlc1swXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgYHBhcnNlVGlzc3VlU2l0ZXMgYXR0ciBlcnJvci4gJHtkfSBpcyBub3QgZm91bmRgO1xuICAgIH0pO1xuICAgIGxldCB0aXNzdWVHcm91cHMgPSB0aXNzdWVzLnJlZHVjZSgoYXJyLCBkKT0+e1xuICAgICAgICBsZXQgZ3JvdXBOYW1lID0gZC50aXNzdWVfc2l0ZTtcbiAgICAgICAgbGV0IHNpdGUgPSB7XG4gICAgICAgICAgICBpZDogZC50aXNzdWVfc2l0ZV9kZXRhaWxfaWQsXG4gICAgICAgICAgICBuYW1lOiBkLnRpc3N1ZV9zaXRlX2RldGFpbFxuICAgICAgICB9O1xuICAgICAgICBpZiAoIWFyci5oYXNPd25Qcm9wZXJ0eShncm91cE5hbWUpKSBhcnJbZ3JvdXBOYW1lXSA9IFtdOyAvLyBpbml0aWF0ZSBhbiBhcnJheVxuICAgICAgICBhcnJbZ3JvdXBOYW1lXS5wdXNoKHNpdGUpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sIHt9KTtcblxuICAgIC8vIG1vZGlmeSB0aGUgdGlzc3VlIGdyb3VwcyB0aGF0IGhhdmUgb25seSBhIHNpbmdsZSBzaXRlXG4gICAgLy8gYnkgcmVwbGFjaW5nIHRoZSBncm91cCdzIG5hbWUgd2l0aCB0aGUgc2luZ2xlIHNpdGUncyBuYW1lIC0tIGZvciBhIGJldHRlciBBbHBoYWJldGljYWwgb3JkZXIgb2YgdGhlIHRpc3N1ZSBncm91cHNcblxuICAgIE9iamVjdC5rZXlzKHRpc3N1ZUdyb3VwcykuZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKHRpc3N1ZUdyb3Vwc1tkXS5sZW5ndGggPT0gMSl7IC8vIGEgc2luZ2xlLXNpdGUgZ3JvdXBcbiAgICAgICAgICAgIGxldCBzaXRlID0gdGlzc3VlR3JvdXBzW2RdWzBdOyAvLyB0aGUgc2luZ2xlIHNpdGVcbiAgICAgICAgICAgIGRlbGV0ZSB0aXNzdWVHcm91cHNbZF07IC8vIHJlbW92ZSB0aGUgb2xkIGdyb3VwIGluIHRoZSBkaWN0aW9uYXJ5XG4gICAgICAgICAgICB0aXNzdWVHcm91cHNbc2l0ZS5uYW1lXSA9IFtzaXRlXTsgLy8gY3JlYXRlIGEgbmV3IGdyb3VwIHdpdGggdGhlIHNpdGUncyBuYW1lXG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB0aXNzdWVHcm91cHM7XG5cbn1cblxuLyoqXG4gKiBwYXJzZSB0aGUgZXhvbnNcbiAqIEBwYXJhbSBkYXRhIHtKc29ufVxuICogQHJldHVybnMge0xpc3R9IG9mIGV4b25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV4b25zKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSAnY29sbGFwc2VkR2VuZU1vZGVsJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZUV4b25zIGlucHV0IGVycm9yLicgKyBkYXRhO1xuICAgIC8vIHNhbml0eSBjaGVja1xuICAgIFsnZmVhdHVyZVR5cGUnLCAnc3RhcnQnLCAnZW5kJ10uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCFkYXRhW2F0dHJdWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyAnRmF0YWwgRXJyb3I6IHBhcnNlRXhvbnMgYXR0ciBub3QgZm91bmQ6ICcgKyBkO1xuICAgIH0pO1xuICAgIHJldHVybiBkYXRhW2F0dHJdLmZpbHRlcigoZCk9PmQuZmVhdHVyZVR5cGUgPT0gJ2V4b24nKS5tYXAoKGQpPT57XG4gICAgICAgIGQuY2hyb21TdGFydCA9IGQuc3RhcnQ7XG4gICAgICAgIGQuY2hyb21FbmQgPSBkLmVuZDtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgfSk7XG59XG5cbi8qKlxuICogcGFyc2UgdGhlIGp1bmN0aW9uc1xuICogQHBhcmFtIGRhdGFcbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBqdW5jdGlvbnNcbiAqIC8vIHdlIGRvIG5vdCBzdG9yZSBqdW5jdGlvbiBzdHJ1Y3R1cmUgYW5ub3RhdGlvbnMgaW4gTW9uZ29cbiAgICAvLyBzbyBoZXJlIHdlIHVzZSB0aGUganVuY3Rpb24gZXhwcmVzc2lvbiB3ZWIgc2VydmljZSB0byByZXRyaWV2ZSB0aGUganVuY3Rpb24gZ2Vub21pYyBsb2NhdGlvbnNcbiAgICAvLyBhc3N1bWluZyB0aGF0IGVhY2ggdGlzc3VlIGhhcyB0aGUgc2FtZSBqdW5jdGlvbnMsXG4gICAgLy8gdG8gZ3JhYiBhbGwgdGhlIGtub3duIGp1bmN0aW9ucyBvZiBhIGdlbmUsIHdlIG9ubHkgbmVlZCB0byBsb29rIGF0IG9uZSB0aXNzdWVcbiAgICAvLyBoZXJlIHdlIGFyYml0cmFyaWx5IHBpY2sgTGl2ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUp1bmN0aW9ucyhkYXRhKXtcblxuICAgIGNvbnN0IGF0dHIgPSAnbWVkaWFuSnVuY3Rpb25FeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZUp1bmN0aW9ucyBpbnB1dCBlcnJvci4gJyArIGRhdGE7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl0uZmlsdGVyKChkKT0+ZC50aXNzdWVJZD09J0xpdmVyJylcbiAgICAgICAgICAgICAgICAgICAgLm1hcCgoZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvcyA9IGQuanVuY3Rpb25JZC5zcGxpdCgnXycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbTogcG9zWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNocm9tU3RhcnQ6IHBvc1sxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbUVuZDogcG9zWzJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGp1bmN0aW9uSWQ6IGQuanVuY3Rpb25JZFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSB0cmFuc2NyaXB0IGlzb2Zvcm1zIGZyb20gdGhlIEdURXggd2ViIHNlcnZpY2U6ICdyZWZlcmVuY2UvdHJhbnNjcmlwdD9yZWxlYXNlPXY3JmdlbmNvZGVfaWQ9J1xuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiByZXR1cm5zIGEgZGljdGlvbmFyeSBvZiB0cmFuc2NyaXB0IGV4b24gb2JqZWN0IGxpc3RzIGluZGV4ZWQgYnkgRU5TVCBJRHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4b25zKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSAndHJhbnNjcmlwdCc7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdwYXJzZUlzb2Zvcm1zIGlucHV0IGVycm9yICcgKyBkYXRhO1xuICAgIHJldHVybiBkYXRhW2F0dHJdLmZpbHRlcigoZCk9PntyZXR1cm4gJ2V4b24nID09IGQuZmVhdHVyZVR5cGV9KVxuICAgICAgICAucmVkdWNlKChhLCBkKT0+e1xuICAgICAgICBpZiAoYVtkLnRyYW5zY3JpcHRJZF0gPT09IHVuZGVmaW5lZCkgYVtkLnRyYW5zY3JpcHRJZF0gPSBbXTtcbiAgICAgICAgYVtkLnRyYW5zY3JpcHRJZF0ucHVzaChkKTtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfSwge30pO1xufVxuXG4vKipcbiAqIHBhcnNlIHRyYW5zY3JpcHQgaXNvZm9ybXNcbiAqIEBwYXJhbSBkYXRhIHtKc29ufSBmcm9tIEdURXggd2ViIHNlcnZpY2UgJ3JlZmVyZW5jZS90cmFuc2NyaXB0P3JlbGVhc2U9djcmZ2VuY29kZV9pZD0nXG4gKiByZXR1cm5zIGEgbGlzdCBvZiBpc29mb3JtIG9iamVjdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybXMoZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9ICd0cmFuc2NyaXB0JztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coJ3BhcnNlSXNvZm9ybXMgaW5wdXQgZXJyb3InKTtcbiAgICByZXR1cm4gZGF0YVthdHRyXS5maWx0ZXIoKGQpPT57cmV0dXJuICd0cmFuc2NyaXB0JyA9PSBkLmZlYXR1cmVUeXBlfSkuc29ydCgoYSwgYik9PntcbiAgICAgICAgY29uc3QgbDEgPSBNYXRoLmFicyhhLmNocm9tRW5kIC0gYS5jaHJvbVN0YXJ0KSArIDE7XG4gICAgICAgIGNvbnN0IGwyID0gTWF0aC5hYnMoYi5jaHJvbUVuZCAtIGIuY2hyb21TdGFydCkgKyAxO1xuICAgICAgICByZXR1cm4gLShsMS1sMik7IC8vIHNvcnQgYnkgaXNvZm9ybSBsZW5ndGggaW4gZGVzY2VuZGluZyBvcmRlclxuICAgIH0pO1xufVxuXG4vKipcbiAqIHBhcnNlIGZpbmFsIChtYXNrZWQpIGdlbmUgbW9kZWwgZXhvbiBleHByZXNzaW9uXG4gKiBleHByZXNzaW9uIGlzIG5vcm1hbGl6ZWQgdG8gcmVhZHMgcGVyIGtiXG4gKiBAcGFyYW0gZGF0YSB7SlNPTn0gb2YgZXhvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gZXhvbnMge0xpc3R9IG9mIGV4b25zIHdpdGggcG9zaXRpb25zXG4gKiBAcGFyYW0gdXNlTG9nIHtib29sZWFufSB1c2UgbG9nMiB0cmFuc2Zvcm1hdGlvblxuICogQHBhcmFtIGFkanVzdCB7TnVtYmVyfSBkZWZhdWx0IDAuMDFcbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBleG9uIG9iamVjdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRXhvbkV4cHJlc3Npb24oZGF0YSwgZXhvbnMsIHVzZUxvZz10cnVlLCBhZGp1c3Q9MSl7XG4gICAgY29uc3QgZXhvbkRpY3QgPSBleG9ucy5yZWR1Y2UoKGEsIGQpPT57YVtkLmV4b25JZF0gPSBkOyByZXR1cm4gYTt9LCB7fSk7XG4gICAgY29uc3QgYXR0ciA9ICdtZWRpYW5FeG9uRXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KCdwYXJzZUV4b25FeHByZXNzaW9uIGlucHV0IGVycm9yJyk7XG5cbiAgICBjb25zdCBleG9uT2JqZWN0cyA9IGRhdGFbYXR0cl07XG4gICAgLy8gZXJyb3ItY2hlY2tpbmdcbiAgICBbJ2RhdGEnLCAnZXhvbklkJywgJ3Rpc3N1ZUlkJ10uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCFleG9uT2JqZWN0c1swXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZUV4b25FeHByZXNzaW9uIGF0dHIgbm90IGZvdW5kOiAnICsgZDtcbiAgICB9KTtcbiAgICAvLyBwYXJzZSBHVEV4IG1lZGlhbiBleG9uIGNvdW50c1xuICAgIGV4b25PYmplY3RzLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgY29uc3QgZXhvbiA9IGV4b25EaWN0W2QuZXhvbklkXTsgLy8gZm9yIHJldHJpZXZpbmcgZXhvbiBwb3NpdGlvbnNcbiAgICAgICAgLy8gZXJyb3ItY2hlY2tpbmdcbiAgICAgICAgWydlbmQnLCAnc3RhcnQnXS5mb3JFYWNoKChwKT0+e1xuICAgICAgICAgICAgaWYgKCFleG9uLmhhc093blByb3BlcnR5KHApKSB0aHJvdyAnRmF0YWwgRXJyb3I6IHBhcnNlRXhvbkV4cHJlc3Npb24gYXR0ciBub3QgZm91bmQ6ICcgKyBwO1xuICAgICAgICB9KTtcbiAgICAgICAgZC5sID0gZXhvbi5lbmQgLSBleG9uLnN0YXJ0ICsgMTtcbiAgICAgICAgZC52YWx1ZSA9IE51bWJlcihkLmRhdGEpL2QubDtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSkvZC5sO1xuICAgICAgICBpZiAodXNlTG9nKSBkLnZhbHVlID0gTWF0aC5sb2cyKGQudmFsdWUgKyAxKTtcbiAgICAgICAgZC54ID0gZC5leG9uSWQ7XG4gICAgICAgIGQueSA9IGQudGlzc3VlSWQ7XG4gICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZDtcbiAgICAgICAgZC5jaHJvbVN0YXJ0ID0gZXhvbi5zdGFydDtcbiAgICAgICAgZC5jaHJvbUVuZCA9IGV4b24uZW5kO1xuICAgICAgICBkLnVuaXQgPSBkLnVuaXQgKyAnIHBlciBiYXNlJztcbiAgICB9KTtcbiAgICByZXR1cm4gZXhvbk9iamVjdHMuc29ydCgoYSxiKT0+e1xuICAgICAgICBpZiAoYS5jaHJvbVN0YXJ0PGIuY2hyb21TdGFydCkgcmV0dXJuIC0xO1xuICAgICAgICBpZiAoYS5jaHJvbVN0YXJ0PmIuY2hyb21TdGFydCkgcmV0dXJuIDE7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0pOyAvLyBzb3J0IGJ5IGdlbm9taWMgbG9jYXRpb24gaW4gYXNjZW5kaW5nIG9yZGVyXG59XG5cbi8qKlxuICogUGFyc2UganVuY3Rpb24gbWVkaWFuIHJlYWQgY291bnQgZGF0YVxuICogQHBhcmFtIGRhdGEge0pTT059IG9mIHRoZSBqdW5jdGlvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufSBwZXJmb3JtIGxvZyB0cmFuc2Zvcm1hdGlvblxuICogQHBhcmFtIGFkanVzdCB7TnVtYmVyfSBmb3IgaGFuZGxpbmcgMCdzIHdoZW4gdXNlTG9nIGlzIHRydWVcbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBqdW5jdGlvbiBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUp1bmN0aW9uRXhwcmVzc2lvbihkYXRhLCB1c2VMb2c9dHJ1ZSwgYWRqdXN0PTEpe1xuICAgIGNvbnN0IGF0dHIgPSAnbWVkaWFuSnVuY3Rpb25FeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coJ3BhcnNlSnVuY3Rpb25FeHByZXNzaW9uIGlucHV0IGVycm9yJyk7XG5cbiAgICBjb25zdCBqdW5jdGlvbnMgPSBkYXRhW2F0dHJdO1xuXG4gICAgLy8gZXJyb3ItY2hlY2tpbmdcbiAgICBbJ3Rpc3N1ZUlkJywgJ2p1bmN0aW9uSWQnLCAnZGF0YScsICdnZW5jb2RlSWQnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWp1bmN0aW9uc1swXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZUp1bmN0aW9uRXhwcmVzc2lvbiBhdHRyIG5vdCBmb3VuZDogJyArIGQ7XG4gICAgfSk7XG5cbiAgICAvLyBwYXJzZSBHVEV4IG1lZGlhbiBqdW5jdGlvbiByZWFkIGNvdW50c1xuICAgIGp1bmN0aW9ucy5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMChOdW1iZXIoZC5kYXRhICsgYWRqdXN0KSk6TnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQueCA9IGQuanVuY3Rpb25JZDtcbiAgICAgICAgZC55ID0gZC50aXNzdWVJZDtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZFxuICAgIH0pO1xuXG4gICAgLy8gc29ydCBieSBnZW5vbWljIGxvY2F0aW9uIGluIGFzY2VuZGluZyBvcmRlclxuICAgIHJldHVybiBqdW5jdGlvbnMuc29ydCgoYSxiKT0+e1xuICAgICAgICBpZiAoYS5qdW5jdGlvbklkPmIuanVuY3Rpb25JZCkgcmV0dXJuIDE7XG4gICAgICAgIGVsc2UgaWYgKGEuanVuY3Rpb25JZDxiLmp1bmN0aW9uSWQpIHJldHVybiAtMTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSk7XG59XG5cbi8qKlxuICogcGFyc2UgaXNvZm9ybSBleHByZXNzaW9uXG4gKiBAcGFyYW0gZGF0YVxuICogQHBhcmFtIHVzZUxvZ1xuICogQHBhcmFtIGFkanVzdFxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUlzb2Zvcm1FeHByZXNzaW9uKGRhdGEsIHVzZUxvZz10cnVlLCBhZGp1c3Q9MSl7XG4gICAgY29uc3QgYXR0ciA9ICdpc29mb3JtRXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KCdwYXJzZUlzb2Zvcm1FeHByZXNzaW9uIGlucHV0IGVycm9yJyk7XG4gICAgLy8gcGFyc2UgR1RFeCBpc29mb3JtIG1lZGlhbiBUUE1cbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQueCA9IGQudHJhbnNjcmlwdElkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4cHJlc3Npb25UcmFuc3Bvc2UoZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gJ2lzb2Zvcm1FeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coJ3BhcnNlSXNvZm9ybUV4cHJlc3Npb24gaW5wdXQgZXJyb3InKTtcbiAgICAvLyBwYXJzZSBHVEV4IGlzb2Zvcm0gbWVkaWFuIFRQTVxuICAgIGRhdGFbYXR0cl0uZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICBkLnZhbHVlID0gdXNlTG9nP01hdGgubG9nMTAoTnVtYmVyKGQuZGF0YSArIGFkanVzdCkpOk51bWJlcihkLmRhdGEpO1xuICAgICAgICBkLm9yaWdpbmFsVmFsdWUgPSBOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC55ID0gZC50cmFuc2NyaXB0SWQ7XG4gICAgICAgIGQueCA9IGQudGlzc3VlSWQ7XG4gICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZDtcbiAgICB9KTtcblxuICAgIHJldHVybiBkYXRhW2F0dHJdO1xufVxuXG4vKipcbiAqIHBhcnNlIG1lZGlhbiBnZW5lIGV4cHJlc3Npb25cbiAqIEBwYXJhbSBkYXRhIHtKc29ufSB3aXRoIGF0dHIgbWVkaWFuR2VuZUV4cHJlc3Npb25cbiAqIEBwYXJhbSB1c2VMb2cge0Jvb2xlYW59IHBlcmZvcm1zIGxvZzEwIHRyYW5zZm9ybWF0aW9uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTWVkaWFuRXhwcmVzc2lvbihkYXRhLCB1c2VMb2c9dHJ1ZSl7XG4gICAgY29uc3QgYXR0ciA9ICdtZWRpYW5HZW5lRXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdwYXJzZU1lZGlhbkV4cHJlc3Npb24gaW5wdXQgZXJyb3IuJztcbiAgICBjb25zdCBhZGp1c3QgPSAxO1xuICAgIC8vIHBhcnNlIEdURXggbWVkaWFuIGdlbmUgZXhwcmVzc2lvblxuICAgIC8vIGVycm9yLWNoZWNraW5nIHRoZSByZXF1aXJlZCBhdHRyaWJ1dGVzOlxuICAgIGlmIChkYXRhW2F0dHJdLmxlbmd0aCA9PSAwKSB0aHJvdyAncGFyc2VNZWRpYW5FeHByZXNzaW9uIGZpbmRzIG5vIGRhdGEuJztcbiAgICBbJ21lZGlhbicsICd0aXNzdWVJZCcsICdnZW5jb2RlSWQnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWRhdGFbYXR0cl1bMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93IGBwYXJzZU1lZGlhbkV4cHJlc3Npb24gYXR0ciBlcnJvci4gJHtkfSBpcyBub3QgZm91bmRgO1xuICAgIH0pO1xuICAgIGxldCByZXN1bHRzID0gZGF0YVthdHRyXTtcbiAgICByZXN1bHRzLmZvckVhY2goZnVuY3Rpb24oZCl7XG4gICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMChOdW1iZXIoZC5tZWRpYW4pICsgYWRqdXN0KTpOdW1iZXIoZC5tZWRpYW4pO1xuICAgICAgICBkLnggPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLnkgPSBkLmdlbmNvZGVJZDtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQubWVkaWFuKTtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbi8qKlxuICogcGFyc2UgdGhlIGdlbmUgZXhwcmVzc2lvblxuICogQHBhcmFtIGdlbmNvZGVJZCB7U3RyaW5nfVxuICogQHBhcmFtIGRhdGEge0pzb259IHdpdGggYXR0cjogdGlzc3VlSWQsIGdlbmVTeW1ib2xcbiAqIEByZXR1cm5zIHt7ZXhwOiB7fSwgZ2VuZVN5bWJvbDogc3RyaW5nfX1cbiAqL1xuLy8gZnVuY3Rpb24gcGFyc2VHZW5lRXhwcmVzc2lvbihnZW5jb2RlSWQsIGRhdGEpe1xuLy8gICAgIGxldCBsb29rdXBUYWJsZSA9IHtcbi8vICAgICAgICAgZXhwOiB7fSwgLy8gaW5kZXhlZCBieSB0aXNzdWVJZFxuLy8gICAgICAgICBnZW5lU3ltYm9sOiAnJ1xuLy8gICAgIH07XG4vLyAgICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICgncGFyc2VHZW5lRXhwcmVzc2lvbiBpbnB1dCBlcnJvci4nKTtcbi8vICAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpPT57XG4vLyAgICAgICAgIGlmIChkLmdlbmNvZGVJZCA9PSBnZW5jb2RlSWQpIHtcbi8vICAgICAgICAgICAgIC8vIGlmIHRoZSBnZW5jb2RlIElEIG1hdGNoZXMgdGhlIHF1ZXJ5IGdlbmNvZGVJZCxcbi8vICAgICAgICAgICAgIC8vIGFkZCB0aGUgZXhwcmVzc2lvbiBkYXRhIHRvIHRoZSBsb29rdXAgdGFibGVcbi8vICAgICAgICAgICAgIGxvb2t1cFRhYmxlLmV4cFtkLnRpc3N1ZUlkXSA9IGQuZGF0YTtcbi8vICAgICAgICAgICAgIGlmICgnJyA9PSBsb29rdXBUYWJsZS5nZW5lU3ltYm9sKSBsb29rdXBUYWJsZS5nZW5lU3ltYm9sID0gZC5nZW5lU3ltYm9sXG4vLyAgICAgICAgIH1cbi8vICAgICB9KTtcbi8vICAgICByZXR1cm4gbG9va3VwVGFibGVcbi8vIH1cblxuLyoqXG4gKiBwYXJzZSB0aGUgZXhwcmVzc2lvbiBkYXRhIG9mIGEgZ2VuZSBmb3IgYSBncm91cGVkIHZpb2xpbiBwbG90XG4gKiBAcGFyYW0gZGF0YSB7SlNPTn0gZnJvbSBHVEV4IGdlbmUgZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIGNvbG9ycyB7RGljdGlvbmFyeX0gdGhlIHZpb2xpbiBjb2xvciBmb3IgZ2VuZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlR2VuZUV4cHJlc3Npb25Gb3JWaW9saW4oZGF0YSwgdXNlTG9nPXRydWUsIGNvbG9ycz11bmRlZmluZWQpe1xuICAgIGNvbnN0IGF0dHIgPSAnZ2VuZUV4cHJlc3Npb24nO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAncGFyc2VHZW5lRXhwcmVzc2lvbkZvclZpb2xpbiBpbnB1dCBlcnJvci4nO1xuICAgIGRhdGFbYXR0cl0uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgZC52YWx1ZXMgPSB1c2VMb2c/ZC5kYXRhLm1hcCgoZGQpPT57cmV0dXJuIE1hdGgubG9nMTAoK2RkKzEpfSk6ZC5kYXRhO1xuICAgICAgICBkLmdyb3VwID0gZC50aXNzdWVJZDtcbiAgICAgICAgZC5sYWJlbCA9IGQuZ2VuZVN5bWJvbDtcbiAgICAgICAgZC5jb2xvciA9IGNvbG9ycz09PXVuZGVmaW5lZD8nIzkwYzFjMSc6Y29sb3JzW2QuZ2VuY29kZUlkXTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cbiIsIi8qKlxuICogQ3JlYXRlcyBhbiBTVkdcbiAqIEBwYXJhbSBpZCB7U3RyaW5nfSBhIERPTSBlbGVtZW50IElEIHRoYXQgc3RhcnRzIHdpdGggYSBcIiNcIlxuICogQHBhcmFtIHdpZHRoIHtOdW1lcmljfVxuICogQHBhcmFtIGhlaWdodCB7TnVtZXJpY31cbiAqIEBwYXJhbSBtYXJnaW4ge09iamVjdH0gd2l0aCB0d28gYXR0cmlidXRlczogd2lkdGggYW5kIGhlaWdodFxuICogQHJldHVybiB7U2VsZWN0aW9ufSB0aGUgZDMgc2VsZWN0aW9uIG9iamVjdCBvZiB0aGUgU1ZHXG4gKi9cblxuaW1wb3J0IHtzZWxlY3R9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcblxuLyoqXG4gKlxuICogQHBhcmFtIGlkIHtTdHJpbmd9IHRoZSBwYXJlbnQgZG9tIElEXG4gKiBAcGFyYW0gd2lkdGgge051bWVyaWN9XG4gKiBAcGFyYW0gaGVpZ2h0IHtOdW1lcmljfVxuICogQHBhcmFtIG1hcmdpbiB7T2JqZWN0fSB3aXRoIGF0dHI6IGxlZnQsIHRvcFxuICogQHBhcmFtIHN2Z0lkIHtTdHJpbmd9XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVN2ZyhpZCwgd2lkdGgsIGhlaWdodCwgbWFyZ2luLCBzdmdJZD11bmRlZmluZWQpe1xuICAgIGlmIChzdmdJZD09PXVuZGVmaW5lZCkgc3ZnSWQ9YCR7aWR9LXN2Z2A7XG4gICAgcmV0dXJuIHNlbGVjdChcIiNcIitpZCkuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICAgICAgLmF0dHIoXCJpZFwiLCBzdmdJZClcbiAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgke21hcmdpbi5sZWZ0fSwgJHttYXJnaW4udG9wfSlgKVxufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gc3ZnT2JqXG4gKiBAcGFyYW0gZG93bmxvYWRGaWxlTmFtZSB7U3RyaW5nfVxuICogQHBhcmFtIHRlbXBEb3dubG9hZERpdklkIHtTdHJpbmd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkb3dubG9hZFN2ZyhzdmdPYmosIGRvd25sb2FkRmlsZU5hbWUsIHRlbXBEb3dubG9hZERpdklkKXtcbiAgICBjb25zb2xlLmxvZyhzdmdPYmopO1xuICAgIHZhciAkc3ZnQ29weSA9IHN2Z09iai5jbG9uZSgpXG4gICAgLmF0dHIoXCJ2ZXJzaW9uXCIsIFwiMS4xXCIpXG4gICAgLmF0dHIoXCJ4bWxuc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpO1xuXG4gICAgLy8gcGFyc2UgYW5kIGFkZCB0aGUgQ1NTIHN0eWxpbmcgdXNlZCBieSB0aGUgU1ZHXG4gICAgdmFyIHN0eWxlcyA9IHBhcnNlQ3NzU3R5bGVzKHN2Z09iai5nZXQoKSk7XG4gICAgJHN2Z0NvcHkucHJlcGVuZChzdHlsZXMpO1xuXG4gICAgJChcIiNcIiArIHRlbXBEb3dubG9hZERpdklkKS5odG1sKCcnKS5oaWRlKCk7XG4gICAgdmFyIHN2Z0h0bWwgPSAkKFwiI1wiICsgdGVtcERvd25sb2FkRGl2SWQpLmFwcGVuZCgkc3ZnQ29weSkuaHRtbCgpO1xuXG4gICAgdmFyIHN2Z0Jsb2IgPSBuZXcgQmxvYihbc3ZnSHRtbF0sIHt0eXBlOiBcImltYWdlL3N2Zyt4bWxcIn0pO1xuICAgIHNhdmVBcyhzdmdCbG9iLCBkb3dubG9hZEZpbGVOYW1lKTtcblxuICAgIC8vIGNsZWFyIHRoZSB0ZW1wIGRvd25sb2FkIGRpdlxuICAgICQoXCIjXCIgKyB0ZW1wRG93bmxvYWREaXZJZCkuaHRtbCgnJykuaGlkZSgpO1xufVxuLyoqXG4gKiBBIGZ1bmN0aW9uIGZvciBwYXJzaW5nIHRoZSBDU1Mgc3R5bGUgc2hlZXQgYW5kIGluY2x1ZGluZyB0aGUgc3R5bGUgcHJvcGVydGllcyBpbiB0aGUgZG93bmxvYWRhYmxlIFNWRy5cbiAqIEBwYXJhbSBkb21cbiAqIEByZXR1cm5zIHtFbGVtZW50fVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDc3NTdHlsZXMgKGRvbSkge1xuICAgIHZhciB1c2VkID0gXCJcIjtcbiAgICB2YXIgc2hlZXRzID0gZG9jdW1lbnQuc3R5bGVTaGVldHM7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNoZWV0cy5sZW5ndGg7IGkrKykgeyAvLyBUT0RPOiB3YWxrIHRocm91Z2ggdGhpcyBibG9jayBvZiBjb2RlXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChzaGVldHNbaV0uY3NzUnVsZXMgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgICAgICB2YXIgcnVsZXMgPSBzaGVldHNbaV0uY3NzUnVsZXM7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcnVsZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcnVsZSA9IHJ1bGVzW2pdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YocnVsZS5zdHlsZSkgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZWxlbXM7XG4gICAgICAgICAgICAgICAgICAgIC8vU29tZSBzZWxlY3RvcnMgd29uJ3Qgd29yaywgYW5kIG1vc3Qgb2YgdGhlc2UgZG9uJ3QgbWF0dGVyLlxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbXMgPSAkKGRvbSkuZmluZChydWxlLnNlbGVjdG9yVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1zID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXNlZCArPSBydWxlLnNlbGVjdG9yVGV4dCArIFwiIHsgXCIgKyBydWxlLnN0eWxlLmNzc1RleHQgKyBcIiB9XFxuXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIEluIEZpcmVmb3gsIGlmIHN0eWxlc2hlZXQgb3JpZ2luYXRlcyBmcm9tIGEgZGlmZiBkb21haW4sXG4gICAgICAgICAgICAvLyB0cnlpbmcgdG8gYWNjZXNzIHRoZSBjc3NSdWxlcyB3aWxsIHRocm93IGEgU2VjdXJpdHlFcnJvci5cbiAgICAgICAgICAgIC8vIEhlbmNlLCB3ZSBtdXN0IHVzZSBhIHRyeS9jYXRjaCB0byBoYW5kbGUgdGhpcyBpbiBGaXJlZm94XG4gICAgICAgICAgICBpZiAoZS5uYW1lICE9PSAnU2VjdXJpdHlFcnJvcicpIHRocm93IGU7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBzLnNldEF0dHJpYnV0ZSgndHlwZScsICd0ZXh0L2NzcycpO1xuICAgIHMuaW5uZXJIVE1MID0gXCI8IVtDREFUQVtcXG5cIiArIHVzZWQgKyBcIlxcbl1dPlwiO1xuXG4gICAgcmV0dXJuIHM7XG59XG4iLCIvKipcbiAqIENyZWF0ZSBhIHRvb2xiYXJcbiAqIFRoaXMgY2xhc3MgdXNlcyBhIGxvdCBvZiBqUXVlcnkgZm9yIGRvbSBlbGVtZW50IG1hbmlwdWxhdGlvblxuICovXG5cbmltcG9ydCB7c2VsZWN0fSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQge3BhcnNlQ3NzU3R5bGVzfSBmcm9tIFwiLi91dGlsc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUb29sYmFyIHtcbiAgICBjb25zdHJ1Y3Rvcihkb21JZCwgdG9vbHRpcD11bmRlZmluZWQsIHZlcnRpY2FsPWZhbHNlKXtcbiAgICAgICAgJChgIyR7ZG9tSWR9YCkuc2hvdygpOyAvLyBpZiBoaWRkZW5cblxuICAgICAgICAvLyBhZGQgYSBuZXcgYmFyZ3JvdXAgZGl2IHRvIGRvbUlEIHdpdGggYm9vdHN0cmFwIGJ1dHRvbiBjbGFzc2VzXG4gICAgICAgIGNvbnN0IGJ0bkNsYXNzZXMgPSB2ZXJ0aWNhbD8nYnRuLWdyb3VwLXZlcnRpY2FsIGJ0bi1ncm91cC1zbSc6ICdidG4tZ3JvdXAgYnRuLWdyb3VwLXNtJztcbiAgICAgICAgdGhpcy5iYXIgPSAkKCc8ZGl2Lz4nKS5hZGRDbGFzcyhidG5DbGFzc2VzKS5hcHBlbmRUbyhgIyR7ZG9tSWR9YCk7XG4gICAgICAgIHRoaXMuYnV0dG9ucyA9IHt9O1xuICAgICAgICB0aGlzLnRvb2x0aXAgPSB0b29sdGlwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIGRvd25sb2FkIGJ1dHRvbiBmb3IgU1ZHXG4gICAgICogQHBhcmFtIGlkIHtTdHJpbmd9IHRoZSBidXR0b24gZG9tIElEXG4gICAgICogQHBhcmFtIHN2Z0lkIHtTdHJpbmd9IHRoZSBTVkcgZG9tIElEIHRvIGdyYWIgYW5kIGRvd25sb2FkXG4gICAgICogQHBhcmFtIG91dGZpbGVOYW1lIHtTdHJpbmd9IHRoZSBkb3dubG9hZCBmaWxlIG5hbWVcbiAgICAgKiBAcGFyYW0gY2xvbmVJZCB7U3RyaW5nfSB0aGUgY2xvbmVkIFNWRyBkb20gSURcbiAgICAgKiBAcGFyYW0gaWNvbiB7U3RyaW5nfSBhIGZvbnRhd2Vzb21lJ3MgaWNvbiBjbGFzcyBuYW1lXG4gICAgICovXG4gICAgY3JlYXRlRG93bmxvYWRTdmdCdXR0b24oaWQsIHN2Z0lkLCBvdXRmaWxlTmFtZSwgY2xvbmVJZCwgaWNvbj0nZmEtZG93bmxvYWQnKXtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9IHRoaXMuY3JlYXRlQnV0dG9uKGlkLCBpY29uKTtcbiAgICAgICAgc2VsZWN0KGAjJHtpZH1gKVxuICAgICAgICAgICAgLm9uKCdjbGljaycsICgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZFN2ZyhzdmdJZCwgb3V0ZmlsZU5hbWUsIGNsb25lSWQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdmVyJywgKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2x0aXAuc2hvdyhcIkRvd25sb2FkXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdXQnLCAoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbHRpcC5oaWRlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjcmVhdGVSZXNldEJ1dHRvbihpZCwgY2FsbGJhY2ssIGljb249J2ZhLWV4cGFuZC1hcnJvd3MtYWx0Jyl7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSB0aGlzLmNyZWF0ZUJ1dHRvbihpZCwgaWNvbik7XG4gICAgICAgIHNlbGVjdChgIyR7aWR9YClcbiAgICAgICAgICAgIC5vbignY2xpY2snLCBjYWxsYmFjaylcbiAgICAgICAgICAgIC5vbignbW91c2VvdmVyJywgKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2x0aXAuc2hvdyhcIlJlc2V0IHRoZSBzY2FsZXNcIik7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdtb3VzZW91dCcsICgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy50b29sdGlwLmhpZGUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNyZWF0ZSBhIGJ1dHRvbiB0byB0aGUgdG9vbGJhclxuICAgICAqIEBwYXJhbSBpZCB7U3RyaW5nfSB0aGUgYnV0dG9uJ3MgaWRcbiAgICAgKiBAcGFyYW0gaWNvbiB7U3RyaW5nfSBhIGZvbnRhd2Vzb21lIGljb24gY2xhc3NcbiAgICAgKiBEZXBlbmRlbmNpZXM6IEJvb3RzdHJhcCwgalF1ZXJ5LCBGb250YXdlc29tZVxuICAgICAqL1xuICAgIGNyZWF0ZUJ1dHRvbihpZCwgaWNvbj0nZmEtZG93bmxvYWQnKXtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJzxhLz4nKS5hdHRyKCdpZCcsIGlkKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdidG4gYnRuLWRlZmF1bHQnKS5hcHBlbmRUbyh0aGlzLmJhcik7XG4gICAgICAgICQoJzxpLz4nKS5hZGRDbGFzcyhgZmEgJHtpY29ufWApLmFwcGVuZFRvKCRidXR0b24pO1xuICAgICAgICB0aGlzLmJ1dHRvbnNbaWRdID0gJGJ1dHRvbjtcbiAgICAgICAgcmV0dXJuICRidXR0b247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogYXR0YWNoIGEgdG9vbHRpcCBkb20gd2l0aCB0aGUgdG9vbGJhclxuICAgICAqIEBwYXJhbSB0b29sdGlwIHtUb29sdGlwfVxuICAgICAqL1xuICAgIGF0dGFjaFRvb2x0aXAodG9vbHRpcCl7XG4gICAgICAgIHRoaXMudG9vbHRpcCA9IHRvb2x0aXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWQgU1ZHIG9ialxuICAgICAqIEBwYXJhbSBzdmdJZCB7U3RyaW5nfSB0aGUgU1ZHIGRvbSBJRFxuICAgICAqIEBwYXJhbSBmaWxlTmFtZSB7U3RyaW5nfSB0aGUgb3V0cHV0IGZpbGUgbmFtZVxuICAgICAqIEBwYXJhbSBjbG9uZUlkIHtTdHJpbmd9IHRoZSB0ZW1wb3JhcnkgZG9tIElEIHRvIGNvcHkgdGhlIFNWRyB0b1xuICAgICAqIERlcGVuZGVuY2llczogRmlsZVNhdmVyXG4gICAgICovXG4gICAgZG93bmxvYWRTdmcoc3ZnSWQsIGZpbGVOYW1lLCBjbG9uZUlkKXtcbiAgICAgICAgLy8gbGV0IHN2Z09iaiA9ICQoJCgkKGAke1wiI1wiICtzdmdJZH0gc3ZnYCkpWzBdKTsgLy8gY29tcGxpY2F0ZWQgalF1ZXJ5IHRvIGdldCB0byB0aGUgU1ZHIG9iamVjdFxuICAgICAgICBsZXQgc3ZnT2JqID0gJCgkKCQoYCR7XCIjXCIgK3N2Z0lkfWApKVswXSk7XG4gICAgICAgIGxldCAkc3ZnQ29weSA9IHN2Z09iai5jbG9uZSgpXG4gICAgICAgIC5hdHRyKFwidmVyc2lvblwiLCBcIjEuMVwiKVxuICAgICAgICAuYXR0cihcInhtbG5zXCIsIFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIik7XG5cbiAgICAgICAgLy8gcGFyc2UgYW5kIGFkZCBhbGwgdGhlIENTUyBzdHlsaW5nIHVzZWQgYnkgdGhlIFNWR1xuICAgICAgICBsZXQgc3R5bGVzID0gcGFyc2VDc3NTdHlsZXMoc3ZnT2JqLmdldCgpKTtcbiAgICAgICAgJHN2Z0NvcHkucHJlcGVuZChzdHlsZXMpO1xuXG4gICAgICAgICQoXCIjXCIgKyBjbG9uZUlkKS5odG1sKCcnKS5oaWRlKCk7IC8vIG1ha2Ugc3VyZSB0aGUgY29weUlEIGlzIGludmlzaWJsZVxuICAgICAgICBsZXQgc3ZnSHRtbCA9ICQoYCMke2Nsb25lSWR9YCkuYXBwZW5kKCRzdmdDb3B5KS5odG1sKCk7XG5cbiAgICAgICAgbGV0IHN2Z0Jsb2IgPSBuZXcgQmxvYihbc3ZnSHRtbF0sIHt0eXBlOiBcImltYWdlL3N2Zyt4bWxcIn0pO1xuICAgICAgICBzYXZlQXMoc3ZnQmxvYiwgZmlsZU5hbWUpOyAvLyB0aGlzIGlzIGEgRmlsZVNhdmVyIGZ1bmN0aW9uLi4uLlxuXG4gICAgICAgIC8vIGNsZWFyIHRoZSB0ZW1wIGRvd25sb2FkIGRpdlxuICAgICAgICAkKGAjJHtjbG9uZUlkfWApLmh0bWwoJycpLmhpZGUoKTtcbiAgICB9XG59IiwiJ3VzZSBzdHJpY3QnO1xuaW1wb3J0IHtqc29uLCB0c3Z9IGZyb20gJ2QzLWZldGNoJztcbmltcG9ydCB7c2VsZWN0LCBzZWxlY3RBbGx9IGZyb20gJ2QzLXNlbGVjdGlvbic7XG5pbXBvcnQge2dldEd0ZXhVcmxzLFxuICAgIHBhcnNlVGlzc3Vlc1xufSBmcm9tICcuL21vZHVsZXMvZ3RleERhdGFQYXJzZXInO1xuaW1wb3J0IFRvb2xiYXIgZnJvbSAnLi9tb2R1bGVzL1Rvb2xiYXInO1xuXG4vKlxuVE9ETzpcbmZpcnN0IGJ1aWxkIGEgZGF0YSBtYXRyaXggd2l0aCB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZVxue1xuICAgIGNvbDogdGlzc3Vlc1xuICAgIHJvdzogZGF0YSB0eXBlc1xuICAgIGRhdGE6IFsgb2JqZWN0cyB3aXRoIGNvbCBhbmQgcm93IGFuZCB2YWx1ZSBdXG59XG4gKi9cbi8qKlxuICogYnVpbGQgdGhlIGRhdGEgbWF0cml4IHRhYmxlXG4gKiBAcGFyYW0gdGFibGVJZCB7U3RyaW5nfVxuICogQHBhcmFtIGRhdGFzZXRJZCB7U3RyaW5nfVxuICogQHBhcmFtIHVybHNcbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gbGF1bmNoKHRhYmxlSWQsIGRhdGFzZXRJZD0nZ3RleF92NycsIHVybHM9Z2V0R3RleFVybHMoKSl7XG4gICAgY29uc3QgcHJvbWlzZXMgPSBbXG4gICAgICAgIC8vIFRPRE86IHVybHMgZm9yIG90aGVyIGRhdGFzZXRzXG4gICAgICAgIGpzb24odXJscy50aXNzdWUpLFxuICAgICAgICB0c3YodXJscy5ybmFzZXFDcmFtKSxcbiAgICAgICAgdHN2KHVybHMud2dzQ3JhbSksXG4gICAgICAgIHRzdih1cmxzLnNhbXBsZSksXG4gICAgXTtcblxuICAgIFByb21pc2UuYWxsKHByb21pc2VzKVxuICAgICAgICAudGhlbihmdW5jdGlvbihhcmdzKXtcbiAgICAgICAgICAgIGxldCB0aXNzdWVzID0gcGFyc2VUaXNzdWVzKGFyZ3NbMF0pO1xuICAgICAgICAgICAgY29uc3QgY3JhbSA9IHtcbiAgICAgICAgICAgICAgICBybmFzZXE6IGFyZ3NbMV0ucmVkdWNlKChhLCBkKT0+e2FbZC5zYW1wbGVfaWRdPWQ7IHJldHVybiBhO30sIHt9KSxcbiAgICAgICAgICAgICAgICB3Z3M6IGFyZ3NbMl0ucmVkdWNlKChhLCBkKT0+e2FbZC5zYW1wbGVfaWRdPWQ7IHJldHVybiBhO30sIHt9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGxldCBzYW1wbGVzID0gYXJnc1szXVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKHMpPT5zLmRhdGFzZXRJZD09ZGF0YXNldElkKVxuICAgICAgICAgICAgICAgIC5tYXAoKHMpPT57XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAocy5kYXRhVHlwZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiV0dTXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzLmNyYW1GaWxlID0gY3JhbS53Z3Nbcy5zYW1wbGVJZF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiUk5BU0VRXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzLmNyYW1GaWxlID0gY3JhbS5ybmFzZXFbcy5zYW1wbGVJZF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgdGhlTWF0cml4ID0gX2J1aWxkTWF0cml4KGRhdGFzZXRJZCwgc2FtcGxlcywgdGlzc3Vlcyk7XG5cbiAgICAgICAgICAgIF9yZW5kZXJNYXRyaXhUYWJsZSh0YWJsZUlkLCB0aGVNYXRyaXgpO1xuICAgICAgICAgICAgX2FkZEZpbHRlcnModGFibGVJZCwgdGhlTWF0cml4LCBzYW1wbGVzLCB0aXNzdWVzKTtcblxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtjb25zb2xlLmVycm9yKGVycil9KTtcbn1cblxuZnVuY3Rpb24gX2FkZEZpbHRlcnModGFibGVJZCwgbWF0LCBzYW1wbGVzLCB0aXNzdWVzKXtcbiAgICBjb25zdCBfX2ZpbHRlciA9ICgpPT57XG4gICAgICAgIGNvbnN0IHNleCA9IHNlbGVjdCgnaW5wdXRbbmFtZT1cInNleFwiXTpjaGVja2VkJykubm9kZSgpLnZhbHVlO1xuICAgICAgICBjb25zdCBhZ2UgPSBzZWxlY3QoJ2lucHV0W25hbWU9XCJhZ2VcIl06Y2hlY2tlZCcpLm5vZGUoKS52YWx1ZTtcbiAgICAgICAgaWYgKHNleCA9PSAnYm90aCcgJiYgYWdlID09ICdhbGwnKXtcbiAgICAgICAgICAgIF9yZW5kZXJNYXRyaXhUYWJsZSh0YWJsZUlkLCBfYnVpbGRNYXRyaXgobWF0LmRhdGFzZXRJZCwgc2FtcGxlcywgdGlzc3VlcykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGZpbHRlcmVkTWF0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKHNleCA9PSAnYm90aCcpIGZpbHRlcmVkTWF0ID0gX2J1aWxkTWF0cml4KG1hdC5kYXRhc2V0SWQsIHNhbXBsZXMuZmlsdGVyKHM9PnMuYWdlQnJhY2tldD09YWdlKSwgdGlzc3Vlcyk7XG4gICAgICAgICAgICBlbHNlIGlmIChhZ2UgPT0gJ2FsbCcpIGZpbHRlcmVkTWF0ID0gX2J1aWxkTWF0cml4KG1hdC5kYXRhc2V0SWQsIHNhbXBsZXMuZmlsdGVyKHM9PnMuc2V4PT1zZXgpLCB0aXNzdWVzKTtcbiAgICAgICAgICAgIGVsc2UgZmlsdGVyZWRNYXQgPSBfYnVpbGRNYXRyaXgobWF0LmRhdGFzZXRJZCwgc2FtcGxlcy5maWx0ZXIocz0+cy5zZXg9PXNleCAmJiBzLmFnZUJyYWNrZXQ9PWFnZSksIHRpc3N1ZXMpO1xuICAgICAgICAgICAgX3JlbmRlck1hdHJpeFRhYmxlKHRhYmxlSWQsIGZpbHRlcmVkTWF0KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgc2VsZWN0KCcjZmlsdGVyLW1lbnUnKS5zZWxlY3RBbGwoJ2lucHV0W25hbWU9XCJzZXhcIl0nKS5vbignY2hhbmdlJywgX19maWx0ZXIpO1xuICAgIHNlbGVjdCgnI2ZpbHRlci1tZW51Jykuc2VsZWN0QWxsKCdpbnB1dFtuYW1lPVwiYWdlXCJdJykub24oJ2NoYW5nZScsIF9fZmlsdGVyKTtcbn1cblxuZnVuY3Rpb24gX2J1aWxkTWF0cml4KGRhdGFzZXRJZCwgc2FtcGxlcywgdGlzc3Vlcyl7XG4gICAgY29uc3QgX19idWlsZEhhc2ggPSBmdW5jdGlvbihkYXRhVHlwZSl7XG4gICAgICAgIHJldHVybiBzYW1wbGVzLmZpbHRlcigocyk9PnMuZGF0YVR5cGU9PWRhdGFUeXBlKS5yZWR1Y2UoKGEsIGQpPT57XG4gICAgICAgICAgICBpZihhW2QudGlzc3VlSWRdPT09dW5kZWZpbmVkKSBhW2QudGlzc3VlSWRdID0gMDtcbiAgICAgICAgICAgIGFbZC50aXNzdWVJZF09IGFbZC50aXNzdWVJZF0rMTtcbiAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICB9LCB7fSk7XG4gICAgfTtcbiAgICBjb25zdCBjb2x1bW5zID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICBsYWJlbDogJ1JOQS1TZXEnLFxuICAgICAgICAgICAgaWQ6ICdSTkFTRVEnLFxuICAgICAgICAgICAgZGF0YTogX19idWlsZEhhc2goJ1JOQVNFUScpXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGxhYmVsOiAnV0VTJyxcbiAgICAgICAgICAgIGlkOiAnV0VTJyxcbiAgICAgICAgICAgIGRhdGE6IF9fYnVpbGRIYXNoKCdXRVMnKVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBsYWJlbDogJ1dHUycsXG4gICAgICAgICAgICBpZDogJ1dHUycsXG4gICAgICAgICAgICBkYXRhOiBfX2J1aWxkSGFzaCgnV0dTJylcbiAgICAgICAgfVxuICAgIF07XG4gICAgY29uc3Qgcm93cyA9IHRpc3N1ZXMubWFwKCh0KT0+e1xuICAgICAgICB0LmlkID0gdC50aXNzdWVJZDtcbiAgICAgICAgdC5sYWJlbCA9IHQudGlzc3VlTmFtZTtcbiAgICAgICAgY29sdW1ucy5mb3JFYWNoKChjb2wpPT57XG4gICAgICAgICAgICB0W2NvbC5pZF0gPSBjb2wuZGF0YVt0LmlkXSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdDtcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGRhdGFzZXRJZDogZGF0YXNldElkLFxuICAgICAgICBYOiByb3dzLFxuICAgICAgICBZOiBjb2x1bW5zLFxuICAgICAgICBkYXRhOiBzYW1wbGVzXG4gICAgfTtcbn1cblxuXG4vKipcbiAqIFJlbmRlciB0aGUgbWF0cml4IGluIGFuIEhUTUwgdGFibGUgZm9ybWF0XG4gKiBAcGFyYW0gdGFibGVJZCB7U3RyaW5nfSB0aGUgRE9NIElEIG9mIHRoZSB0YWJsZVxuICogQHBhcmFtIG1hdCB7T2JqZWN0fSBvZiBhdHRyOiBkYXRhc2V0SWQsIFgtLWEgbGlzdCBvZiB4IG9iamVjdHMsIFktLWEgbGlzdCBvZiB5IG9iamVjdHNcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9yZW5kZXJNYXRyaXhUYWJsZSh0YWJsZUlkLCBtYXQpe1xuICAgIGNvbnN0IGRhdGFzZXQgPSB7XG4gICAgICAgICdndGV4X3Y3Jzoge1xuICAgICAgICAgICAgbGFiZWw6J0dURVggVjcnLFxuICAgICAgICAgICAgYmdjb2xvcjogJyMyYTcxOGInXG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8vIHJlbmRlcmluZyB0aGUgY29sdW1uIGxhYmVsc1xuICAgIGNvbnN0IHRoZVRhYmxlID0gc2VsZWN0KGAjJHt0YWJsZUlkfWApO1xuICAgIHRoZVRhYmxlLnNlbGVjdCgndGhlYWQnKS5zZWxlY3RBbGwoJ3RoJylcbiAgICAgICAgLmRhdGEoW3tsYWJlbDpcIlwiLCBpZDpcIlwifV0uY29uY2F0KG1hdC5ZKSlcbiAgICAgICAgLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgndGgnKVxuICAgICAgICAuYXR0cignc2NvcGUnLCAnY29sJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgKGQsIGkpPT5kLmlkPT1cIlwiPycnOmB5JHtpLTF9YClcbiAgICAgICAgLnRleHQoKGQpPT5kLmxhYmVsKTtcblxuICAgIHRoZVRhYmxlLnNlbGVjdCgnLnRhYmxlLWxhYmVsJykuc2VsZWN0QWxsKCcqJykucmVtb3ZlKCk7XG4gICAgdGhlVGFibGUuc2VsZWN0KCcudGFibGUtbGFiZWwnKS5hcHBlbmQoJ3RoJylcbiAgICAgICAgLmF0dHIoJ2NvbHNwYW4nLCBtYXQuWS5sZW5ndGggKyAxKVxuICAgICAgICAudGV4dChkYXRhc2V0W21hdC5kYXRhc2V0SWRdLmxhYmVsKVxuICAgICAgICAuc3R5bGUoJ2JhY2tncm91bmQtY29sb3InLGRhdGFzZXRbbWF0LmRhdGFzZXRJZF0uYmdjb2xvcik7XG5cbiAgICBfcmVuZGVyQ291bnRzKHRoZVRhYmxlLnNlbGVjdCgndGJvZHknKSwgbWF0KTtcbiAgICBfYWRkQ2xpY2tFdmVudHModGFibGVJZCk7XG4gICAgX2FkZFRvb2xiYXIodGFibGVJZCwgbWF0KTtcbn1cblxuZnVuY3Rpb24gX3JlbmRlckNvdW50cyh0Ym9keSwgbWF0KXtcbiAgICB0Ym9keS5zZWxlY3RBbGwoJy5kYXRhLXJvdycpLnJlbW92ZSgpO1xuICAgIGNvbnN0IHRoZVJvd3MgPSB0Ym9keS5zZWxlY3RBbGwoJy5kYXRhLXJvdycpXG4gICAgICAgIC5kYXRhKG1hdC5YKVxuICAgICAgICAuZW50ZXIoKVxuICAgICAgICAuYXBwZW5kKCd0cicpXG4gICAgICAgIC5jbGFzc2VkKCdkYXRhLXJvdycsIHRydWUpO1xuXG4gICAgLy8gcmVuZGVyaW5nIHRoZSByb3cgbGFiZWxcbiAgICB0aGVSb3dzLmFwcGVuZCgndGgnKVxuICAgICAgICAuYXR0cignc2NvcGUnLCAncm93JylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgKGQsIGkpPT5geCR7aX1gKVxuICAgICAgICAudGV4dCgoZCk9PmQubGFiZWwpO1xuXG4gICAgbWF0LlkuZm9yRWFjaCgoeSwgaik9PntcbiAgICAgICAgdGhlUm93cy5hcHBlbmQoJ3RkJylcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIChkLCBpKT0+e1xuICAgICAgICAgICAgICAgIHJldHVybiBkW3kuaWRdPT09dW5kZWZpbmVkPycnOmB4JHtpfSB5JHtqfWA7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRleHQoKGQpPT5kW3kuaWRdfHwnJyk7XG4gICAgfSk7XG5cbn1cblxuLyoqXG4gKiBBZGQgY3VzdG9taXplZCBjb2x1bW4sIHJvdyBhbmQgY2VsbCBjbGljayBldmVudHNcbiAqIEBwYXJhbSB0YWJsZUlkIHtTdHJpbmd9IHRoZSBkb20gSUQgb2YgdGhlIHRhYmxlXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfYWRkQ2xpY2tFdmVudHModGFibGVJZCl7XG4gICAgY29uc3QgdGhlQ2VsbHMgPSBzZWxlY3QoYCMke3RhYmxlSWR9YCkuc2VsZWN0KCd0Ym9keScpLnNlbGVjdEFsbCgndGQnKTtcblxuICAgIC8vIGNvbHVtbiBsYWJlbHNcbiAgICBzZWxlY3QoYCMke3RhYmxlSWR9YCkuc2VsZWN0KCd0aGVhZCcpLnNlbGVjdEFsbCgndGgnKVxuICAgICAgICAuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJylcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAvLyB0b2dnbGUgdGhlIHNlbGVjdGlvblxuICAgICAgICAgICBjb25zdCB0aGVDb2x1bW4gPSBzZWxlY3QodGhpcykuYXR0cignY2xhc3MnKTtcbiAgICAgICAgICAgaWYgKHNlbGVjdCh0aGlzKS5hdHRyKCdzY29wZScpID09ICdjb2wnKSB7XG4gICAgICAgICAgICAgICBzZWxlY3QodGhpcykuYXR0cignc2NvcGUnLCAnc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgICAgIHRoZUNlbGxzLmZpbHRlcihgLiR7dGhlQ29sdW1ufWApLmNsYXNzZWQoJ3NlbGVjdGVkJywgdHJ1ZSk7XG4gICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICBzZWxlY3QodGhpcykuYXR0cignc2NvcGUnLCAnY29sJyk7XG4gICAgICAgICAgICAgICB0aGVDZWxscy5maWx0ZXIoYC4ke3RoZUNvbHVtbn1gKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGVDb2x1bW4pO1xuICAgICAgICB9KTtcblxuICAgIC8vIHJvdyBsYWJlbHNcbiAgICBzZWxlY3QoYCMke3RhYmxlSWR9YCkuc2VsZWN0KCd0Ym9keScpLnNlbGVjdEFsbCgndGgnKVxuICAgICAgICAuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJylcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgIGNvbnN0IHRoZVJvdyA9IHNlbGVjdCh0aGlzKS5hdHRyKCdjbGFzcycpO1xuICAgICAgICAgICBpZiAoc2VsZWN0KHRoaXMpLmF0dHIoJ3Njb3BlJykgPT0gJ3JvdycpIHtcbiAgICAgICAgICAgICAgIHNlbGVjdCh0aGlzKS5hdHRyKCdzY29wZScsICdzZWxlY3RlZCcpO1xuICAgICAgICAgICAgICAgdGhlQ2VsbHMuZmlsdGVyKGAuJHt0aGVSb3d9YCkuY2xhc3NlZCgnc2VsZWN0ZWQnLCB0cnVlKTtcbiAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgIHNlbGVjdCh0aGlzKS5hdHRyKCdzY29wZScsICdyb3cnKTtcbiAgICAgICAgICAgICAgIHRoZUNlbGxzLmZpbHRlcihgLiR7dGhlUm93fWApLmNsYXNzZWQoJ3NlbGVjdGVkJywgZmFsc2UpO1xuICAgICAgICAgICB9XG4gICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoZVJvdyk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAvLyBkYXRhIGNlbGxzXG4gICAgdGhlQ2VsbHMuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJylcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAvLyB0b2dnbGUgdGhlIHNlbGVjdGVkIGNsYXNzIGFzc2lnbm1lbnRcbiAgICAgICAgICAgIHNlbGVjdCh0aGlzKS5jbGFzc2VkKCdzZWxlY3RlZCcsICFzZWxlY3QodGhpcykuY2xhc3NlZCgnc2VsZWN0ZWQnKSk7XG4gICAgICAgIH0pXG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSB0YWJsZUlkXG4gKiBAcGFyYW0gbWF0XG4gKiBAcHJpdmF0ZVxuICogUmVmZXJlbmNlOiBodHRwczovL2dpdGh1Yi5jb20vZWxpZ3JleS9GaWxlU2F2ZXIuanMvXG4gKiBEZXBlbmRlbmNpZXM6IGdvb2dsZVVzZXIuanNcbiAqL1xuZnVuY3Rpb24gX2FkZFRvb2xiYXIodGFibGVJZCwgbWF0KXtcbiAgICAvLyBUT0RPOiBnZXQgcmlkIG9mIGhhcmQtY29kZWQgZG9tIElEc1xuICAgIGNvbnN0IHRoZUNlbGxzID0gc2VsZWN0KGAjJHt0YWJsZUlkfWApLnNlbGVjdCgndGJvZHknKS5zZWxlY3RBbGwoJ3RkJyk7XG4gICAgc2VsZWN0KCcjbWF0cml4LXRhYmxlLXRvb2xiYXInKS5zZWxlY3RBbGwoJyonKS5yZW1vdmUoKTtcbiAgICBjb25zdCB0b29sYmFyID0gbmV3IFRvb2xiYXIoJ21hdHJpeC10YWJsZS10b29sYmFyJywgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICB0b29sYmFyLmNyZWF0ZUJ1dHRvbignc2FtcGxlLWRvd25sb2FkJyk7XG4gICAgdG9vbGJhci5jcmVhdGVCdXR0b24oJ3NlbmQtdG8tZmlyZWNsb3VkJywgJ2ZhLWNsb3VkLXVwbG9hZC1hbHQnKTtcblxuICAgIHNlbGVjdCgnI3NhbXBsZS1kb3dubG9hZCcpXG4gICAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ3BvaW50ZXInKVxuICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGxldCBjZWxscyA9IHRoZUNlbGxzLmZpbHRlcihgLnNlbGVjdGVkYCk7XG4gICAgICAgICAgICBpZiAoY2VsbHMuZW1wdHkoKSkgYWxlcnQoJ1lvdSBoYXZlIG5vdCBzZWxlY3RlZCBhbnkgc2FtcGxlcyB0byBkb3dubG9hZC4nKTtcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBkb3dubG9hZENvbnRlbnQgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAnU2FtcGxlIElEJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdUaXNzdWUgTmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnRGF0YSBUeXBlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdDUkFNIEZpbGUgR0NQJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdDUkFNIEZpbGUgQVdTJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdDUkFNIEZpbGUgTUQ1JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdDUkFNIEZpbGUgU2l6ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnQ1JBTSBJbmRleCBHQ1AnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NSQU0gSW5kZXggQVdTJ1xuICAgICAgICAgICAgICAgICAgICBdLmpvaW4oXCJcXHRcIikgKyAnXFxuJztcbiAgICAgICAgICAgICAgICBjZWxscy5lYWNoKGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXJrZXIgPSBzZWxlY3QodGhpcykuYXR0cignY2xhc3MnKS5zcGxpdCgnICcpLmZpbHRlcigoYyk9PntyZXR1cm4gYyE9J3NlbGVjdGVkJ30pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB4ID0gbWF0LlhbcGFyc2VJbnQobWFya2VyWzBdLnJlcGxhY2UoJ3gnLCAnJykpXS5pZDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeSA9IG1hdC5ZW3BhcnNlSW50KG1hcmtlclsxXS5yZXBsYWNlKCd5JywgJycpKV0uaWQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEb3dubG9hZCAnICsgeCArICcgOiAnKyB5KTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZFNhbXBsZXMgPSBtYXQuZGF0YS5maWx0ZXIoKHMpPT5zLmRhdGFUeXBlPT15JiZzLnRpc3N1ZUlkPT14JiZzLmRhdGFUeXBlIT0nV0VTJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC8qKioqIFdBUk5JTkc6IG5vIFdFUyBjcmFtIGZpbGVzIGF2YWlsYWJsZSBBVE0gKioqKi9cbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoKHMpPT57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNyYW0gPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjcmFtX2ZpbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY3JhbV9maWxlX2F3cycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjcmFtX2ZpbGVfbWQ1JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NyYW1fZmlsZV9zaXplJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NyYW1faW5kZXgnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY3JhbV9pbmRleF9hd3MnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXS5tYXAoKGQpPT5zLmNyYW1GaWxlW2RdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29sdW1ucyA9IFtzLnNhbXBsZUlkLCBzLnRpc3N1ZU5hbWUsIHMuZGF0YVR5cGVdLmNvbmNhdChjcmFtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29sdW1ucy5qb2luKFwiXFx0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNlbGVjdGVkU2FtcGxlcyk7XG4gICAgICAgICAgICAgICAgICAgIGRvd25sb2FkQ29udGVudCArPSBzZWxlY3RlZFNhbXBsZXMuam9pbihcIlxcblwiKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBsZXQgZmlsZSA9IG5ldyBCbG9iKFtkb3dubG9hZENvbnRlbnRdLCB7dHlwZTogJ3RleHQvcGxhaW47Y2hhcnNldD11dGYtOCd9KTtcbiAgICAgICAgICAgICAgICBzYXZlQXMoZmlsZSwgJ0dURXguY3JhbS50eHQnLCB0cnVlKTsgLy8gc2F2ZUFzKCkgaXMgYSBGaWxlU2F2ZXIgZmlsZSwgZGlzYWJsZSBhdXRvIEJPTVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICBzZWxlY3QoJyNzZW5kLXRvLWZpcmVjbG91ZCcpXG4gICAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ3BvaW50ZXInKVxuICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICBpZiAoIWNoZWNrU2lnbmVkSW4oKSl7XG4gICAgICAgICAgICAgICAgIGFsZXJ0KFwiWW91IG5lZWQgdG8gc2lnbiBpbiBmaXJzdFwiKTtcbiAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9yZXBvcnRCaWxsaW5nUHJvamVjdHMoZ2V0VXNlcigpKTtcbiAgICAgICAgICAgIF9yZXBvcnRXb3Jrc3BhY2VzKGdldFVzZXIoKSk7XG5cbiAgICAgICAgICAgIGxldCBjZWxscyA9IHRoZUNlbGxzLmZpbHRlcihgLnNlbGVjdGVkYCk7XG4gICAgICAgICAgICBpZiAoY2VsbHMuZW1wdHkoKSkgYWxlcnQoJ1lvdSBoYXZlIG5vdCBzZWxlY3RlZCBhbnkgc2FtcGxlcyB0byBkb3dubG9hZC4nKTtcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbGVjdCgnI2ZpcmUtY2xvdWQtZm9ybScpLnN0eWxlKFwiZGlzcGxheVwiLCBcImJsb2NrXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIHNlbGVjdCgnI3N1Ym1pdC10by1maXJlY2xvdWQtYnRuJylcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBsZXQgY2VsbHMgPSB0aGVDZWxscy5maWx0ZXIoYC5zZWxlY3RlZGApO1xuICAgICAgICAgICAgbGV0IGFsbFNlbGVjdGVkU2FtcGxlcyA9IFtdO1xuICAgICAgICAgICAgY2VsbHMuZWFjaChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWFya2VyID0gc2VsZWN0KHRoaXMpLmF0dHIoJ2NsYXNzJykuc3BsaXQoJyAnKS5maWx0ZXIoKGMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGMgIT0gJ3NlbGVjdGVkJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSBtYXQuWFtwYXJzZUludChtYXJrZXJbMF0ucmVwbGFjZSgneCcsICcnKSldLmlkO1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSBtYXQuWVtwYXJzZUludChtYXJrZXJbMV0ucmVwbGFjZSgneScsICcnKSldLmlkO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEb3dubG9hZCAnICsgeCArICcgOiAnICsgeSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWQgPSBtYXQuZGF0YS5maWx0ZXIoKHMpPT5zLmRhdGFUeXBlPT15JiZzLnRpc3N1ZUlkPT14JiZzLmRhdGFUeXBlIT0nV0VTJykubWFwKGQ9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0ZW1wID0gZC5zYW1wbGVJZC5zcGxpdCgnLScpO1xuICAgICAgICAgICAgICAgICAgICBkLmRvbm9ySWQgPSB0ZW1wWzBdICsgJy0nICsgdGVtcFsxXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgICAgICAgfSk7IC8vIE5PVEU6IGN1cnJlbnRseSB3ZSBkb24ndCBoYXZlIFdFUyBDUkFNIGZpbGUgcGF0aHNcbiAgICAgICAgICAgICAgICBhbGxTZWxlY3RlZFNhbXBsZXMgPSBhbGxTZWxlY3RlZFNhbXBsZXMuY29uY2F0KHNlbGVjdGVkKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIF9zdWJtaXRUb0ZpcmVDbG91ZChnZXRVc2VyKCksIGFsbFNlbGVjdGVkU2FtcGxlcyk7XG4gICAgICAgICAgICBzZWxlY3QoJyNmaXJlLWNsb3VkLWZvcm0nKS5zdHlsZShcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuICAgICAgICB9KTtcblxuICAgIHNlbGVjdCgnI2NhbmNlbC1maXJlY2xvdWQtYnRuJylcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxlY3QoJyNmaXJlLWNsb3VkLWZvcm0nKS5zdHlsZShcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuICAgICAgICAgICAgYWxlcnQoJ0NhbmNlbGVkIScpO1xuICAgICAgICB9KVxufVxuXG4vKioqKiogRmlyZUNsb3VkIEFQSSAqKioqKi9cbi8vIHJlZmVyZW5jZTogdXNlIHRoaXMgVVJMLCBodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvdG9rZW5pbmZvP2FjY2Vzc190b2tlbj1NeUFjY2Vzc1Rva2VuLCB0byBjaGVjayB0aGUgYWNjZXNzIHRva2VuIGluZm9cbi8vIHJlZmVyZW5jZTogaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20vaWRlbnRpdHkvc2lnbi1pbi93ZWIvYnVpbGQtYnV0dG9uXG4vLyBkZXBlbmRlbmNpZXM6IGpRdWVyeVxuZnVuY3Rpb24gX3JlcG9ydEJpbGxpbmdQcm9qZWN0cyhnb29nbGVVc2VyLCBkb21JZD1cImJpbGxpbmctcHJvamVjdC1saXN0XCIpIHtcblxuICAgIC8vIGxldCBwcm9maWxlID0gZ29vZ2xlVXNlci5nZXRCYXNpY1Byb2ZpbGUoKTtcbiAgICAvLyBjb25zb2xlLmxvZygnSUQ6ICcgKyBwcm9maWxlLmdldElkKCkpO1xuICAgIC8vIGNvbnNvbGUubG9nKCdOYW1lOiAnICsgcHJvZmlsZS5nZXROYW1lKCkpO1xuICAgIC8vIGNvbnNvbGUubG9nKCdFbWFpbDogJyArIHByb2ZpbGUuZ2V0RW1haWwoKSk7XG4gICAgLy8gZ2V0IHRoZSB1c2VyJ3MgYWNjZXNzIHRva2VuXG4gICAgbGV0IHRva2VuID0gZ29vZ2xlVXNlci5nZXRBdXRoUmVzcG9uc2UodHJ1ZSkuYWNjZXNzX3Rva2VuO1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogJ2h0dHBzOi8vYXBpLmZpcmVjbG91ZC5vcmcvYXBpL3Byb2ZpbGUvYmlsbGluZycsXG4gICAgICAgIHR5cGU6ICdHRVQnLFxuICAgICAgICB4aHJGaWVsZHM6IHtcbiAgICAgICAgICAgIHdpdGhDcmVkZW50aWFsczogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgYmVmb3JlU2VuZDogZnVuY3Rpb24gKHhocikge1xuICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCAnQmVhcmVyICcgKyB0b2tlbik7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcsXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIC8vIENhbid0IGZpZ3VyZSBvdXQgaG93IHRvIGdlbmVyYXRlIHRoaXMgZm9ybSB1c2luZyBEMy4uLiBzbyBoZXJlIEknbSB1c2luZyBqUXVlcnkgc3ludGF4XG4gICAgICAgICAgICAkKGAjJHtkb21JZH1gKS5lbXB0eSgpO1xuICAgICAgICAgICAgcmVzcG9uc2UuZm9yRWFjaCgoZCk9PntcbiAgICAgICAgICAgICAgICAkKCc8bGFiZWw+JyArXG4gICAgICAgICAgICAgICAgICAgIGA8aW5wdXQgdHlwZT1cInJhZGlvXCIgbmFtZT1cImJpbGxpbmctcHJvamVjdFwiIHZhbHVlPVwiJHtkLnByb2plY3ROYW1lfVwiPiBgICtcbiAgICAgICAgICAgICAgICAgICAgZC5wcm9qZWN0TmFtZSArXG4gICAgICAgICAgICAgICAgICAgJzwvbGFiZWw+PGJyLz4nXG4gICAgICAgICAgICAgICAgKS5hcHBlbmRUbygkKGAjJHtkb21JZH1gKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2VbMF0pO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIF9yZXBvcnRXb3Jrc3BhY2VzKGdvb2dsZVVzZXIpe1xuICAgIGxldCB0b2tlbiA9IGdvb2dsZVVzZXIuZ2V0QXV0aFJlc3BvbnNlKHRydWUpLmFjY2Vzc190b2tlbjtcbiAgICAgLy8gbGlzdCBVc2VyJ3Mgd29ya3NwYWNlc1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogJ2h0dHBzOi8vYXBpLmZpcmVjbG91ZC5vcmcvYXBpL3dvcmtzcGFjZXMnLFxuICAgICAgICB0eXBlOiAnR0VUJyxcbiAgICAgICAgeGhyRmllbGRzOiB7XG4gICAgICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIGJlZm9yZVNlbmQ6IGZ1bmN0aW9uICh4aHIpIHtcbiAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgJ0JlYXJlciAnICsgdG9rZW4pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgIGNvbnN0IHdvcmtzcGFjZXMgPSByZXNwb25zZS5maWx0ZXIoKGQpPT4hZC5wdWJsaWMpO1xuICAgICAgICAgICAgY29uc29sZS5sb2cod29ya3NwYWNlcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBfc3VibWl0VG9GaXJlQ2xvdWQoZ29vZ2xlVXNlciwgc2FtcGxlcyl7XG4gICAgY29uc3QgdG9rZW4gPSBnb29nbGVVc2VyLmdldEF1dGhSZXNwb25zZSh0cnVlKS5hY2Nlc3NfdG9rZW47XG4gICAgY29uc3QgbmFtZXNwYWNlID0gJCgnaW5wdXRbbmFtZT1cImJpbGxpbmctcHJvamVjdFwiXScpLnZhbCgpO1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9ICQoJ2lucHV0W25hbWU9XCJ3b3Jrc3BhY2VcIl0nKS52YWwoKTtcbiAgICBjb25zb2xlLmxvZyh3b3Jrc3BhY2UpO1xuICAgIGNvbnNvbGUubG9nKHNhbXBsZXMpO1xuXG4gICAgLy8gY3JlYXRlIHRoZSB3b3Jrc3BhY2VcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6ICdodHRwczovL2FwaS5maXJlY2xvdWQub3JnL2FwaS93b3Jrc3BhY2VzJyxcbiAgICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgICB4aHJGaWVsZHM6IHtcbiAgICAgICAgICAgIHdpdGhDcmVkZW50aWFsczogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgYmVmb3JlU2VuZDogZnVuY3Rpb24gKHhocikge1xuICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCAnQmVhcmVyICcgKyB0b2tlbik7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcsXG4gICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIFwibmFtZXNwYWNlXCI6IG5hbWVzcGFjZSxcbiAgICAgICAgICAgIFwibmFtZVwiOiB3b3Jrc3BhY2UsXG4gICAgICAgICAgICBcImF0dHJpYnV0ZXNcIjoge30sXG4gICAgICAgICAgICBcImF1dGhvcml6YXRpb25Eb21haW5cIjogW11cbiAgICAgICAgfSksXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3BvbnNlKXsgLy8gY2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgd29ya3NwYWNlIGlzIGNyZWF0ZWRcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZmluaXNoZWQgY3JlYXRpbmcgd29ya3NwYWNlLi4uXCIpO1xuICAgICAgICAgICAgY29uc3QgZG9ub3JzID0gc2FtcGxlcy5tYXAoZD0+e1xuICAgICAgICAgICAgICAgIGlmICghZC5oYXNPd25Qcm9wZXJ0eSgnZG9ub3JJZCcpKSB0aHJvdyAnU2FtcGxlIGRvZXMgbm90IGNvbnRhaW4gYXR0ciBkb25vcklkLic7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQuZG9ub3JJZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgZG9ub3JFbnRpdHlTdHJpbmcgPSBgZW50aXRpZXM9ZW50aXR5OnBhcnRpY2lwYW50X2lkXFxuJHtkb25vcnMuam9pbignXFxuJyl9XFxuYDtcbiAgICAgICAgICAgIGNvbnN0IGRvbm9yRW50aXR5VXJsRW5jb2RlID0gZW5jb2RlVVJJKGRvbm9yRW50aXR5U3RyaW5nKTtcblxuICAgICAgICAgICAgLy8gc3VibWl0dGluZyBwYXJ0aWNpcGFudCBJRHNcbiAgICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBgaHR0cHM6Ly9hcGkuZmlyZWNsb3VkLm9yZy9hcGkvd29ya3NwYWNlcy8ke25hbWVzcGFjZX0vJHt3b3Jrc3BhY2V9L2ltcG9ydEVudGl0aWVzYCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgeGhyRmllbGRzOiB7XG4gICAgICAgICAgICAgICAgICAgIHdpdGhDcmVkZW50aWFsczogZmFsc2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGZ1bmN0aW9uICh4aHIpIHtcbiAgICAgICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCAnQmVhcmVyICcgKyB0b2tlbik7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICBkYXRhOiBkb25vckVudGl0eVVybEVuY29kZSxcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbmFsbHksIHN1Ym1pdHRpbmcgc2FtcGxlc1xuICAgICAgICAgICAgICAgICAgICAvLyBwcmVwYXJlIHRoZSBzYW1wbGVFbnRpdHlTdHJpbmcgZm9yIEZpcmVDbG91ZCBBUElcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJmaW5pc2hlZCBpbXBvcnRpbmcgcGFydGljaXBhbnQgSURzLi4uXCIpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgc2FtcGxlRW50aXR5ID0gW1snZW50aXR5OnNhbXBsZV9pZCcsICdwYXJ0aWNpcGFudF9pZCcsICdzYW1wbGVfdHlwZScsICdiYW1fZmlsZScsICdiYW1faW5kZXgnXS5qb2luKCdcXHQnKV07XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZUVudGl0eSA9IHNhbXBsZUVudGl0eS5jb25jYXQoc2FtcGxlcy5tYXAoZD0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtkLnNhbXBsZUlkLCBkLmRvbm9ySWQsIGQuZGF0YVR5cGUsIGQuY3JhbUZpbGUuY3JhbV9maWxlLCBkLmNyYW1GaWxlLmNyYW1faW5kZXhdLmpvaW4oJ1xcdCcpO1xuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhbXBsZUVudGl0eVN0cmluZyA9IGBlbnRpdGllcz0ke3NhbXBsZUVudGl0eS5qb2luKCdcXG4nKX1cXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYW1wbGVFbnRpdHlVcmxFbmNvZGUgPSBlbmNvZGVVUkkoc2FtcGxlRW50aXR5U3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coc2FtcGxlRW50aXR5U3RyaW5nKTtcblxuICAgICAgICAgICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBgaHR0cHM6Ly9hcGkuZmlyZWNsb3VkLm9yZy9hcGkvd29ya3NwYWNlcy8ke25hbWVzcGFjZX0vJHt3b3Jrc3BhY2V9L2ltcG9ydEVudGl0aWVzYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHhockZpZWxkczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpdGhDcmVkZW50aWFsczogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBiZWZvcmVTZW5kOiBmdW5jdGlvbiAoeGhyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCAnQmVhcmVyICcgKyB0b2tlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHNhbXBsZUVudGl0eVVybEVuY29kZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImZpbmlzaGVkIGltcG9ydGluZyBzYW1wbGVzLi4uXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZjVVJMID0gYGh0dHBzOi8vcG9ydGFsLmZpcmVjbG91ZC5vcmcvI3dvcmtzcGFjZXMvJHtuYW1lc3BhY2V9LyR7d29ya3NwYWNlfS9kYXRhYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjZmlyZS1jbG91ZC1zdGF0dXMnKS5odG1sKGBTdWJtaXR0ZWQhIDxici8+IEdvIHRvIHlvdXIgPGJyLz4gPGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cIiR7ZmNVUkx9XCI+RmlyZUNsb3VkIHdvcmtzcGFjZTwvYT5gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24oZXJyb3Ipe2NvbnNvbGUuZXJyb3IoZXJyb3IpfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbihlcnJvcil7Y29uc29sZS5lcnJvcihlcnJvcil9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKGVycm9yKXtjb25zb2xlLmVycm9yKGVycm9yKX1cbiAgICB9KTtcbn1cblxuXG5cblxuIl0sIm5hbWVzIjpbImNzdiIsImRzdiIsInRzdiIsIm1hdGNoZXIiLCJzZWxlY3Rpb24iLCJlbGVtZW50Il0sIm1hcHBpbmdzIjoiOzs7QUFBQSxJQUFJLEdBQUcsR0FBRyxFQUFFO0lBQ1IsR0FBRyxHQUFHLEVBQUU7SUFDUixLQUFLLEdBQUcsRUFBRTtJQUNWLE9BQU8sR0FBRyxFQUFFO0lBQ1osTUFBTSxHQUFHLEVBQUUsQ0FBQzs7QUFFaEIsU0FBUyxlQUFlLENBQUMsT0FBTyxFQUFFO0VBQ2hDLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFFLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsRUFBRTtJQUNsRSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7R0FDaEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztDQUNyQjs7QUFFRCxTQUFTLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFO0VBQ25DLElBQUksTUFBTSxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztFQUN0QyxPQUFPLFNBQVMsR0FBRyxFQUFFLENBQUMsRUFBRTtJQUN0QixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0dBQ25DLENBQUM7Q0FDSDs7O0FBR0QsU0FBUyxZQUFZLENBQUMsSUFBSSxFQUFFO0VBQzFCLElBQUksU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO01BQy9CLE9BQU8sR0FBRyxFQUFFLENBQUM7O0VBRWpCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLEVBQUU7SUFDekIsS0FB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Q0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztTQUNoRCxLQUFLLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQztTQUMxQixFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVU7O1dBRXBCLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7V0FDN0MsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssRUFBRTtlQUNyQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztlQUN2QyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU07ZUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztlQUNsQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9EOztTQUVILENBQUMsQ0FBQzs7O0lBR1AsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztTQUNoRCxLQUFLLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQztTQUMxQixFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVU7V0FDcEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztXQUMx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
