var BatchGeneExpression = (function (exports) {
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

var event = null;

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
    var event0 = event; // Events can be reentrant (e.g., focus).
    event = event1;
    try {
      listener.call(this, this.__data__, index, group);
    } finally {
      event = event0;
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

var selectAll = function(selector) {
  return typeof selector === "string"
      ? new Selection([document.querySelectorAll(selector)], [document.documentElement])
      : new Selection([selector == null ? [] : selector], root);
};

var prefix = "$";

function Map() {}

Map.prototype = map.prototype = {
  constructor: Map,
  has: function(key) {
    return (prefix + key) in this;
  },
  get: function(key) {
    return this[prefix + key];
  },
  set: function(key, value) {
    this[prefix + key] = value;
    return this;
  },
  remove: function(key) {
    var property = prefix + key;
    return property in this && delete this[property];
  },
  clear: function() {
    for (var property in this) if (property[0] === prefix) delete this[property];
  },
  keys: function() {
    var keys = [];
    for (var property in this) if (property[0] === prefix) keys.push(property.slice(1));
    return keys;
  },
  values: function() {
    var values = [];
    for (var property in this) if (property[0] === prefix) values.push(this[property]);
    return values;
  },
  entries: function() {
    var entries = [];
    for (var property in this) if (property[0] === prefix) entries.push({key: property.slice(1), value: this[property]});
    return entries;
  },
  size: function() {
    var size = 0;
    for (var property in this) if (property[0] === prefix) ++size;
    return size;
  },
  empty: function() {
    for (var property in this) if (property[0] === prefix) return false;
    return true;
  },
  each: function(f) {
    for (var property in this) if (property[0] === prefix) f(this[property], property.slice(1), this);
  }
};

function map(object, f) {
  var map = new Map;

  // Copy constructor.
  if (object instanceof Map) object.each(function(value, key) { map.set(key, value); });

  // Index array by numeric index or specified key function.
  else if (Array.isArray(object)) {
    var i = -1,
        n = object.length,
        o;

    if (f == null) while (++i < n) map.set(i, object[i]);
    else while (++i < n) map.set(f(o = object[i], i, object), o);
  }

  // Convert object to map.
  else if (object) for (var key in object) map.set(key, object[key]);

  return map;
}

var nest = function() {
  var keys = [],
      sortKeys = [],
      sortValues,
      rollup,
      nest;

  function apply(array, depth, createResult, setResult) {
    if (depth >= keys.length) {
      if (sortValues != null) array.sort(sortValues);
      return rollup != null ? rollup(array) : array;
    }

    var i = -1,
        n = array.length,
        key = keys[depth++],
        keyValue,
        value,
        valuesByKey = map(),
        values,
        result = createResult();

    while (++i < n) {
      if (values = valuesByKey.get(keyValue = key(value = array[i]) + "")) {
        values.push(value);
      } else {
        valuesByKey.set(keyValue, [value]);
      }
    }

    valuesByKey.each(function(values, key) {
      setResult(result, key, apply(values, depth, createResult, setResult));
    });

    return result;
  }

  function entries(map$$1, depth) {
    if (++depth > keys.length) return map$$1;
    var array, sortKey = sortKeys[depth - 1];
    if (rollup != null && depth >= keys.length) array = map$$1.entries();
    else array = [], map$$1.each(function(v, k) { array.push({key: k, values: entries(v, depth)}); });
    return sortKey != null ? array.sort(function(a, b) { return sortKey(a.key, b.key); }) : array;
  }

  return nest = {
    object: function(array) { return apply(array, 0, createObject, setObject); },
    map: function(array) { return apply(array, 0, createMap, setMap); },
    entries: function(array) { return entries(apply(array, 0, createMap, setMap), 0); },
    key: function(d) { keys.push(d); return nest; },
    sortKeys: function(order) { sortKeys[keys.length - 1] = order; return nest; },
    sortValues: function(order) { sortValues = order; return nest; },
    rollup: function(f) { rollup = f; return nest; }
  };
};

function createObject() {
  return {};
}

function setObject(object, key, value) {
  object[key] = value;
}

function createMap() {
  return map();
}

function setMap(map$$1, key, value) {
  map$$1.set(key, value);
}

var keys = function(map) {
  var keys = [];
  for (var key in map) keys.push(key);
  return keys;
};

var values = function(map) {
  var values = [];
  for (var key in map) values.push(map[key]);
  return values;
};

"use strict";

function getGtexUrls(){
    const host = "https://gtexportal.org/rest/v1/"; // NOTE: top expressed genes are not yet in production
    return {
        // "geneExp": "https://gtexportal.org/rest/v1/dataset/featureExpression?feature=gene&gencode_id=",
        "geneId": host + "reference/geneId?format=json&geneId=",
        "geneExp": host + "expression/geneExpression?datasetId=gtex_v7&gencodeId=",
        "tissue":  host + "dataset/tissueInfo",
        "topInTissueFiltered": host + "expression/topExpressedGenes?datasetId=gtex_v7&filterMtGene=true&sort_by=median&sortDirection=desc&page_size=50&tissueId=",
        "topInTissue": host + "expression/topExpressedGenes?datasetId=gtex_v7&sort_by=median&sortDirection=desc&page_size=50&tissueId=",
        "medExpById": host + "expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&page_size=10000&gencodeId=",

        "exonExp": host + "expression/exonExpression?datasetId=gtex_v7&gencodeId=",
        "junctionExp": host + "expression/junctionExpression?datasetId=gtex_v7&hcluster=true&gencodeId=",
        "isoformExp": host + "expression/isoformExpression?datasetId=gtex_v7&boxplotDetail=median&gencodeId=",

        "geneModel": host + "reference/collapsedGeneModel?unfiltered=false&release=v7&gencode_id=",
        "geneModelUnfiltered": host + "reference/collapsedGeneModel?unfiltered=true&release=v7&gencode_id=",
        "isoform": host + "reference/transcript?release=v7&gencode_id=",

        "liverGeneExp": "data/top50.genes.liver.genomic.median.tpm.json", // top 50 genes in GTEx liver
        "cerebellumGeneExp": "data/top.gtex.cerebellum.genes.median.tpm.tsv",
        "mayoGeneExp": "data/gtex+mayo.top.cerebellum_ad.genes.median.tpm.tsv" // the top 50 genes in Mayo Cerebellum_AD + their gtex expression values
    }
}

function getTissueClusters(dataset){
    const trees = {
        'top50Liver': "(((((((((((((Brain_Nucleus_accumbens_basal_ganglia:0.65,Brain_Caudate_basal_ganglia:0.65):0.12,Brain_Putamen_basal_ganglia:0.77):0.18,Brain_Amygdala:0.95):0.48,((Brain_Frontal_Cortex_BA9:0.33,Brain_Cortex:0.33):0.47,Brain_Anterior_cingulate_cortex_BA24:0.80):0.63):0.36,((Brain_Hypothalamus:0.94,Brain_Hippocampus:0.94):0.47,Brain_Substantia_nigra:1.41):0.37):0.76,Brain_Spinal_cord_cervical_c-1:2.54):0.29,(Brain_Cerebellum:0.43,Brain_Cerebellar_Hemisphere:0.43):2.41):1.66,Testis:4.50):0.28,((((((((((((((((((Esophagus_Muscularis:0.34,Esophagus_Gastroesophageal_Junction:0.34):0.60,Colon_Sigmoid:0.95):0.44,Uterus:1.39):0.40,Bladder:1.79):0.12,((Vagina:1.29,Cervix_Ectocervix:1.29):0.30,Cervix_Endocervix:1.59):0.31):0.13,Colon_Transverse:2.03):0.20,Ovary:2.23):0.25,((Skin_Sun_Exposed_Lower_leg:0.60,Skin_Not_Sun_Exposed_Suprapubic:0.60):1.18,Esophagus_Mucosa:1.77):0.71):0.05,(Thyroid:1.87,Prostate:1.87):0.66):0.15,((((Artery_Coronary:1.24,Artery_Aorta:1.24):0.35,Nerve_Tibial:1.60):0.42,Artery_Tibial:2.01):0.27,Fallopian_Tube:2.29):0.39):0.41,Cells_Transformed_fibroblasts:3.09):0.06,Pituitary:3.15):0.23,Lung:3.37):0.08,((Heart_Left_Ventricle:1.97,Heart_Atrial_Appendage:1.97):1.29,Muscle_Skeletal:3.26):0.19):0.16,Stomach:3.61):0.27,Spleen:3.89):0.20,(((Breast_Mammary_Tissue:1.65,Adipose_Subcutaneous:1.65):0.45,Adipose_Visceral_Omentum:2.09):1.20,Minor_Salivary_Gland:3.29):0.79):0.08,Adrenal_Gland:4.17):0.60):0.56,(Small_Intestine_Terminal_Ileum:4.28,Kidney_Cortex:4.28):1.06):0.60,(Whole_Blood:4.38,Cells_EBV-transformed_lymphocytes:4.38):1.56):0.10,Pancreas:6.04):13.05,Liver:19.08);",
        'top50Cerebellum_gtex': "((((((Brain_Substantia_nigra:1.69,Brain_Hypothalamus:1.69):0.37,(((Brain_Putamen_basal_ganglia:0.75,Brain_Caudate_basal_ganglia:0.75):0.29,Brain_Nucleus_accumbens_basal_ganglia:1.03):0.17,(Brain_Hippocampus:0.77,Brain_Amygdala:0.77):0.43):0.86):0.21,(((Brain_Cortex_Mayo:0.55,Brain_Cortex_AD_Mayo:0.55):0.55,Brain_Anterior_cingulate_cortex_BA24:1.10):0.11,(Brain_Frontal_Cortex_BA9:0.77,Brain_Cortex:0.77):0.44):1.05):1.02,Brain_Spinal_cord_cervical_c-1:3.28):1.53,((Brain_Cerebellum:0.72,Brain_Cerebellar_Hemisphere:0.72):0.51,(Brain_Cerebellum_Mayo:0.59,Brain_Cerebellum_AD_Mayo:0.59):0.65):3.57):3.41,((((Pancreas:3.77,Liver:3.77):0.29,Whole_Blood:4.06):0.40,((Heart_Left_Ventricle:1.92,Heart_Atrial_Appendage:1.92):0.81,Muscle_Skeletal:2.73):1.73):0.07,((((((((((((Uterus:1.03,Fallopian_Tube:1.03):0.57,Prostate:1.60):0.22,((Artery_Tibial:1.09,Artery_Aorta:1.09):0.10,Artery_Coronary:1.19):0.62):0.13,(((((Breast_Mammary_Tissue:0.73,Adipose_Visceral_Omentum:0.73):0.22,Adipose_Subcutaneous:0.95):0.43,Lung:1.38):0.23,Thyroid:1.61):0.10,(((Cervix_Endocervix:0.64,Cervix_Ectocervix:0.64):0.29,Vagina:0.93):0.64,Bladder:1.57):0.14):0.23):0.32,((Esophagus_Muscularis:0.37,Esophagus_Gastroesophageal_Junction:0.37):0.89,Colon_Sigmoid:1.25):1.01):0.11,Nerve_Tibial:2.37):0.09,((((Small_Intestine_Terminal_Ileum:1.43,Colon_Transverse:1.43):0.29,Stomach:1.73):0.19,(Minor_Salivary_Gland:1.44,Esophagus_Mucosa:1.44):0.47):0.22,(Skin_Sun_Exposed_Lower_leg:0.63,Skin_Not_Sun_Exposed_Suprapubic:0.63):1.51):0.33):0.31,Ovary:2.77):0.34,(Spleen:2.72,Kidney_Cortex:2.72):0.39):0.46,(Testis:3.06,Adrenal_Gland:3.06):0.50):0.61,(Cells_Transformed_fibroblasts:3.47,Cells_EBV-transformed_lymphocytes:3.47):0.71):0.23,Pituitary:4.41):0.12):3.68);",
        'top50Cerebellum_AD': "(((((((((((((((((((Vagina:0.64,Cervix_Ectocervix:0.64):0.25,Cervix_Endocervix:0.89):0.36,Bladder:1.25):0.24,(((Breast_Mammary_Tissue:0.73,Adipose_Visceral_Omentum:0.73):0.07,Adipose_Subcutaneous:0.80):0.39,Lung:1.19):0.30):0.01,Thyroid:1.50):0.15,((Uterus:0.88,Fallopian_Tube:0.88):0.34,Prostate:1.22):0.43):0.14,((Artery_Coronary:1.05,Artery_Aorta:1.05):0.18,Artery_Tibial:1.23):0.55):0.37,((Esophagus_Muscularis:0.37,Esophagus_Gastroesophageal_Junction:0.37):0.81,Colon_Sigmoid:1.19):0.97):0.07,(((Minor_Salivary_Gland:1.44,Esophagus_Mucosa:1.44):0.39,(Skin_Sun_Exposed_Lower_leg:0.54,Skin_Not_Sun_Exposed_Suprapubic:0.54):1.30):0.14,((Small_Intestine_Terminal_Ileum:1.43,Colon_Transverse:1.43):0.16,Stomach:1.60):0.37):0.25):0.36,Ovary:2.59):0.28,Spleen:2.86):0.25,Nerve_Tibial:3.11):0.29,(Testis:2.72,Adrenal_Gland:2.72):0.68):0.10,((((Heart_Left_Ventricle:1.81,Heart_Atrial_Appendage:1.81):0.68,Kidney_Cortex:2.49):0.62,Muscle_Skeletal:3.11):0.20,Pancreas:3.31):0.18):0.22,Pituitary:3.71):0.73,Liver:4.44):0.05,(Cells_Transformed_fibroblasts:3.59,Cells_EBV-transformed_lymphocytes:3.59):0.90):0.64,Whole_Blood:5.14):2.17,((((Brain_Cerebellum_Mayo:0.77,Brain_Cerebellum_AD_Mayo:0.77):1.09,(Brain_Cortex_Mayo:0.65,Brain_Cortex_AD_Mayo:0.65):1.21):0.44,(Brain_Cerebellum:0.92,Brain_Cerebellar_Hemisphere:0.92):1.38):0.85,((((((Brain_Hippocampus:0.58,Brain_Amygdala:0.58):0.36,Brain_Nucleus_accumbens_basal_ganglia:0.94):0.02,(Brain_Putamen_basal_ganglia:0.57,Brain_Caudate_basal_ganglia:0.57):0.39):0.33,(Brain_Substantia_nigra:0.89,Brain_Hypothalamus:0.89):0.39):0.19,((Brain_Cortex:0.78,Brain_Anterior_cingulate_cortex_BA24:0.78):0.23,Brain_Frontal_Cortex_BA9:1.01):0.46):0.69,Brain_Spinal_cord_cervical_c-1:2.17):0.98):4.15);"
    };
    return trees[dataset];
}

function getGeneClusters(dataset){
    const trees = {
        'top50Liver': "(((((((MT2A:2.81,MT1X:2.81):1.63,PEBP1:4.44):0.77,(TPT1:3.87,IFITM3:3.87):1.34):0.89,((SERPING1:2.08,IGFBP4:2.08):2.29,C3:4.36):1.75):1.04,APOE:7.15):1.92,(MTATP6P1:3.41,FTL:3.41):5.65):6.96,((((RBP4:5.67,MT1G:5.67):0.22,((TF:5.18,APOC1:5.18):0.43,AGT:5.62):0.28):0.66,((((((ITIH4:3.11,CFB:3.11):0.50,ATF5:3.61):0.55,(SERPINF2:3.20,CYP2E1:3.20):0.97):0.79,SERPINA1:4.96):0.35,SERPINA3:5.30):0.28,SAA1:5.59):0.98):0.99,(((((((HPD:3.31,ALB:3.31):0.26,VTN:3.57):0.20,(((((((((FGB:1.14,FGA:1.14):0.15,CRP:1.29):0.14,FGG:1.43):0.16,((((((SERPINC1:0.64,AHSG:0.64):0.16,APCS:0.80):0.07,APOA2:0.87):0.12,AGXT:0.98):0.35,ORM2:1.33):0.02,(GC:1.06,APOH:1.06):0.29):0.23):0.40,(FGL1:1.20,AMBP:1.20):0.78):0.11,ORM1:2.10):0.23,SAA4:2.33):0.34,APOC3:2.67):0.07,HPX:2.74):1.03):0.28,APOA1:4.04):0.14,(SAA2:3.73,HP:3.73):0.46):0.12,TTR:4.30):0.42,ALDOB:4.73):2.82):8.47);",
        'top50Cerebellum_AD': "((((((((PRNP:2.82,CALM1:2.82):0.74,NDRG2:3.57):0.25,CPE:3.82):0.22,CKB:4.03):1.10,APOE:5.13):0.77,(((ZBTB18:2.45,RN7SK:2.45):1.36,(RN7SL2:1.42,RN7SL1:1.42):2.39):0.40,(ENO2:3.29,ALDOC:3.29):0.92):1.69):2.70,(((((((((HSPA8:1.36,HSP90AA1:1.36):0.08,(EIF4A2:1.23,AES:1.23):0.21):0.72,LDHB:2.16):0.20,ITM2B:2.36):0.09,(PEBP1:1.99,CALM2:1.99):0.45):0.32,MALAT1:2.76):1.47,CLU:4.23):0.25,((((PSAP:1.47,HSP90AB1:1.47):0.35,(((RPS25:0.89,EEF2:0.89):0.41,RPL3:1.30):0.09,(((((RPS27A:0.60,RPL9:0.60):0.08,RPL17:0.68):0.11,RPS13:0.79):0.03,RPL5:0.82):0.16,(RPL24:0.43,RPL21:0.43):0.55):0.42):0.43):0.87,GAPDH:2.69):0.12,((((RPS18:0.62,RPL13A:0.62):0.12,(RPS12:0.59,RPS11:0.59):0.15):0.47,EEF1A1:1.21):1.08,ACTB:2.29):0.52):1.67):1.30,(MTATP6P1:3.49,FTL:3.49):2.29):2.83):5.85,(((((STMN2:2.71,ATP6V1G2:2.71):0.73,SNAP25:3.45):0.28,TUBB4A:3.72):0.41,CDR1:4.13):0.34,(MT3:3.04,GFAP:3.04):1.44):9.97);",
        'top50Cerebellum_gtex': "(((((((ENO2:3.29,ALDOC:3.29):0.84,((PHYHIP:2.68,CA11:2.68):0.58,PRRT2:3.25):0.88):1.10,CPE:5.24):1.69,EEF1A2:6.93):0.47,APOE:7.40):1.12,(((((((TMEM59L:2.32,ATP6V1G2:2.32):0.67,STMN2:2.99):0.36,SNAP25:3.35):0.43,TUBB4A:3.78):0.67,((LINC00599:1.89,GABRD:1.89):1.53,SNCB:3.41):1.03):0.87,GFAP:5.31):1.45,((PVALB:3.57,CBLN1:3.57):1.27,CBLN3:4.84):1.92):1.76):5.74,(((MTATP6P1:3.49,FTL:3.49):1.08,((((PSAP:1.47,HSP90AB1:1.47):0.45,(((RPS25:0.89,EEF2:0.89):0.40,((RPS27A:0.60,RPL9:0.60):0.08,RPL17:0.68):0.60):0.03,RPL3:1.32):0.61):0.70,GAPDH:2.62):0.13,((((RPS18:0.62,RPL13A:0.62):0.12,(RPS12:0.59,RPS11:0.59):0.15):0.47,EEF1A1:1.21):1.08,ACTB:2.29):0.46):1.82):0.83,((CLU:4.08,CKB:4.08):0.29,((((SNRNP70:1.90,PTMS:1.90):0.42,(((EIF4A2:1.23,AES:1.23):0.22,HSPA8:1.45):0.35,ATP5B:1.80):0.52):0.61,(CALM3:1.68,CALM1:1.68):1.26):0.14,((PEBP1:1.99,CALM2:1.99):0.31,MTND2P28:2.30):0.78):1.28):1.03):8.86);"
    };
    return trees[dataset];
}

function parseTissues(data){
    const attr = "tissueInfo";
    if(!data.hasOwnProperty(attr)) throw "Fatal Error: parseTissues input error.";
    const tissues = data[attr];

    // sanity check
    ["tissueId", "tissueName", "colorHex"].forEach((d)=>{
        if (!tissues[0].hasOwnProperty(d)) throw "Fatal Error: parseTissue attr not found: " + d;
    });

    return tissues;
}





/**
 * parse transcript isoforms from the GTEx web service: "reference/transcript?release=v7&gencode_id="
 * @param data {Json}
 * returns a dictionary of transcript exon object lists indexed by ENST IDs
 */


/**
 * parse transcript isoforms
 * @param data {Json} from GTEx web service "reference/transcript?release=v7&gencode_id="
 * returns a list of isoform objects
 */



/**
 * parse final gene model exon expression
 * expression is normalized to reads per kb
 * @param data {JSON} of exon expression web service
 * @param exons {List} of exons with positions
 * @param useLog {boolean} use log2 transformation
 * @param adjust {Number} default 0.01
 * @returns {List} of exon objects
 */


/**
 * Parse junction median read count data
 * @param data {JSON} of the junciton expression web service
 * @param useLog {Boolean} perform log transformation
 * @param adjust {Number} for handling 0's when useLog is true
 * @returns {List} of junction objects
 */




function parseMedianExpression(data, useLog=true){
    const attr = "medianGeneExpression";
    if(!data.hasOwnProperty(attr)) throw "parseMedianExpression input error.";
    const adjust = 1;
    // parse GTEx median gene expression
    data.medianGeneExpression.forEach(function(d){
        // TODO: error-checking of the attributes
        d.value = useLog?Math.log10(Number(d.median) + adjust):Number(d.median);
        d.x = d.tissueId;
        d.y = d.gencodeId;
        d.originalValue = Number(d.median);
        d.id = d.gencodeId;
    });
    return data[attr];
}

function parseMedianTPM(data, useLog=true){
    // parse GTEx median TPM json static file
    data.forEach(function(d){
        d.value = useLog?Math.log10(+d.medianTPM + 1):+d.medianTPM;
        d.x = d.tissueId;
        d.y = d.geneSymbol;
        d.originalValue = parseFloat(d.medianTPM);
        d.id = d.gencodeId;
    });
    return data;
}

function parseGeneExpression(gencodeId, data){
    /**
     *
     * @type {{exp: {}, geneSymbol: string}}
     */
    let lookupTable = {
        exp: {}, // indexed by tissueId
        geneSymbol: ""
    };
    data.geneExpression.forEach((d)=>{
        if (d.gencodeId == gencodeId) {
            // if the gencode ID matches the query gencodeId,
            // add the expression data to the lookup table
            lookupTable.exp[d.tissueId] = d.data;
            if ("" == lookupTable.geneSymbol) lookupTable.geneSymbol = d.geneSymbol;
        }
    });
    return lookupTable
}

/**
 *
 * @param gencodeId {String}: a gencode ID
 * @param data {Object} gene expression API call
 * @param useLog {Boolean}
 * @param color {String}
 * @param xlist {List}: a list of tissue objects {id:String, name:String}
 * @returns {{x: Array, y: Array, name: string, type: string, line: {width: number}, marker: {color: string}}}
 */

function makeJsonForPlotly(gencodeId, data, useLog=false, color="grey", xlist){

    // reference: https://plot.ly/javascript/box-plots/

    let lookupTable = parseGeneExpression(gencodeId, data); // constructs the tissue lookup table indexed by tissue ID
    let x = [];
    let y = [];

    // xlist: the tissues
    xlist.forEach((d)=>{
        // d: a tissue
        if (lookupTable.exp[d.id]===undefined){
            // when the gene has no expression data in tissue d,
            // provide dummy data
            x = x.concat([d.name]);
            y = y.concat([-1]);
        } else {
            // concatenate a list of the tissue label repeatedly (lookupTable.exp[d].length times) to x
            // concatenate all the expression values to y
            // the number of elements in x and y must match
            x = x.concat(Array(lookupTable.exp[d.id].length).fill(d.name));
            y = y.concat(lookupTable.exp[d.id]);
        }
    });
    return {
        x: x,
        y: y,
        name: lookupTable.geneSymbol,
        type: 'box',
        line: {width:1},
        marker: {color:color},
    };

}

var ascending$1 = function(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
};

var bisector = function(compare) {
  if (compare.length === 1) compare = ascendingComparator(compare);
  return {
    left: function(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        var mid = lo + hi >>> 1;
        if (compare(a[mid], x) < 0) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
    right: function(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        var mid = lo + hi >>> 1;
        if (compare(a[mid], x) > 0) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    }
  };
};

function ascendingComparator(f) {
  return function(d, x) {
    return ascending$1(f(d), x);
  };
}

var ascendingBisect = bisector(ascending$1);
var bisectRight = ascendingBisect.right;

var sequence = function(start, stop, step) {
  start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

  var i = -1,
      n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
      range = new Array(n);

  while (++i < n) {
    range[i] = start + i * step;
  }

  return range;
};

var e10 = Math.sqrt(50);
var e5 = Math.sqrt(10);
var e2 = Math.sqrt(2);

var ticks = function(start, stop, count) {
  var reverse,
      i = -1,
      n,
      ticks,
      step;

  stop = +stop, start = +start, count = +count;
  if (start === stop && count > 0) return [start];
  if (reverse = stop < start) n = start, start = stop, stop = n;
  if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

  if (step > 0) {
    start = Math.ceil(start / step);
    stop = Math.floor(stop / step);
    ticks = new Array(n = Math.ceil(stop - start + 1));
    while (++i < n) ticks[i] = (start + i) * step;
  } else {
    start = Math.floor(start * step);
    stop = Math.ceil(stop * step);
    ticks = new Array(n = Math.ceil(start - stop + 1));
    while (++i < n) ticks[i] = (start - i) / step;
  }

  if (reverse) ticks.reverse();

  return ticks;
};

function tickIncrement(start, stop, count) {
  var step = (stop - start) / Math.max(0, count),
      power = Math.floor(Math.log(step) / Math.LN10),
      error = step / Math.pow(10, power);
  return power >= 0
      ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
      : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
}

function tickStep(start, stop, count) {
  var step0 = Math.abs(stop - start) / Math.max(0, count),
      step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
      error = step0 / step1;
  if (error >= e10) step1 *= 10;
  else if (error >= e5) step1 *= 5;
  else if (error >= e2) step1 *= 2;
  return stop < start ? -step1 : step1;
}

var max = function(values, valueof) {
  var n = values.length,
      i = -1,
      value,
      max;

  if (valueof == null) {
    while (++i < n) { // Find the first comparable value.
      if ((value = values[i]) != null && value >= value) {
        max = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = values[i]) != null && value > max) {
            max = value;
          }
        }
      }
    }
  }

  else {
    while (++i < n) { // Find the first comparable value.
      if ((value = valueof(values[i], i, values)) != null && value >= value) {
        max = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = valueof(values[i], i, values)) != null && value > max) {
            max = value;
          }
        }
      }
    }
  }

  return max;
};

var array$1 = Array.prototype;

var map$3 = array$1.map;
var slice$1 = array$1.slice;

var implicit = {name: "implicit"};

function ordinal(range) {
  var index = map(),
      domain = [],
      unknown = implicit;

  range = range == null ? [] : slice$1.call(range);

  function scale(d) {
    var key = d + "", i = index.get(key);
    if (!i) {
      if (unknown !== implicit) return unknown;
      index.set(key, i = domain.push(d));
    }
    return range[(i - 1) % range.length];
  }

  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = [], index = map();
    var i = -1, n = _.length, d, key;
    while (++i < n) if (!index.has(key = (d = _[i]) + "")) index.set(key, domain.push(d));
    return scale;
  };

  scale.range = function(_) {
    return arguments.length ? (range = slice$1.call(_), scale) : range.slice();
  };

  scale.unknown = function(_) {
    return arguments.length ? (unknown = _, scale) : unknown;
  };

  scale.copy = function() {
    return ordinal()
        .domain(domain)
        .range(range)
        .unknown(unknown);
  };

  return scale;
}

function band() {
  var scale = ordinal().unknown(undefined),
      domain = scale.domain,
      ordinalRange = scale.range,
      range$$1 = [0, 1],
      step,
      bandwidth,
      round = false,
      paddingInner = 0,
      paddingOuter = 0,
      align = 0.5;

  delete scale.unknown;

  function rescale() {
    var n = domain().length,
        reverse = range$$1[1] < range$$1[0],
        start = range$$1[reverse - 0],
        stop = range$$1[1 - reverse];
    step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
    if (round) step = Math.floor(step);
    start += (stop - start - step * (n - paddingInner)) * align;
    bandwidth = step * (1 - paddingInner);
    if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
    var values = sequence(n).map(function(i) { return start + step * i; });
    return ordinalRange(reverse ? values.reverse() : values);
  }

  scale.domain = function(_) {
    return arguments.length ? (domain(_), rescale()) : domain();
  };

  scale.range = function(_) {
    return arguments.length ? (range$$1 = [+_[0], +_[1]], rescale()) : range$$1.slice();
  };

  scale.rangeRound = function(_) {
    return range$$1 = [+_[0], +_[1]], round = true, rescale();
  };

  scale.bandwidth = function() {
    return bandwidth;
  };

  scale.step = function() {
    return step;
  };

  scale.round = function(_) {
    return arguments.length ? (round = !!_, rescale()) : round;
  };

  scale.padding = function(_) {
    return arguments.length ? (paddingInner = paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
  };

  scale.paddingInner = function(_) {
    return arguments.length ? (paddingInner = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
  };

  scale.paddingOuter = function(_) {
    return arguments.length ? (paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingOuter;
  };

  scale.align = function(_) {
    return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
  };

  scale.copy = function() {
    return band()
        .domain(domain())
        .range(range$$1)
        .round(round)
        .paddingInner(paddingInner)
        .paddingOuter(paddingOuter)
        .align(align);
  };

  return rescale();
}

var define = function(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
};

function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

function Color() {}

var darker = 0.7;
var brighter = 1 / darker;

var reI = "\\s*([+-]?\\d+)\\s*";
var reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*";
var reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
var reHex3 = /^#([0-9a-f]{3})$/;
var reHex6 = /^#([0-9a-f]{6})$/;
var reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$");
var reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$");
var reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$");
var reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$");
var reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$");
var reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

var named = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blanchedalmond: 0xffebcd,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32
};

define(Color, color, {
  displayable: function() {
    return this.rgb().displayable();
  },
  toString: function() {
    return this.rgb() + "";
  }
});

function color(format) {
  var m;
  format = (format + "").trim().toLowerCase();
  return (m = reHex3.exec(format)) ? (m = parseInt(m[1], 16), new Rgb((m >> 8 & 0xf) | (m >> 4 & 0x0f0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1)) // #f00
      : (m = reHex6.exec(format)) ? rgbn(parseInt(m[1], 16)) // #ff0000
      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
      : named.hasOwnProperty(format) ? rgbn(named[format])
      : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
      : null;
}

function rgbn(n) {
  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
}

function rgba(r, g, b, a) {
  if (a <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a);
}

function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb;
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}

function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}

function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}

define(Rgb, rgb, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb: function() {
    return this;
  },
  displayable: function() {
    return (0 <= this.r && this.r <= 255)
        && (0 <= this.g && this.g <= 255)
        && (0 <= this.b && this.b <= 255)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  toString: function() {
    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
    return (a === 1 ? "rgb(" : "rgba(")
        + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.b) || 0))
        + (a === 1 ? ")" : ", " + a + ")");
  }
}));

function hsla(h, s, l, a) {
  if (a <= 0) h = s = l = NaN;
  else if (l <= 0 || l >= 1) h = s = NaN;
  else if (s <= 0) h = NaN;
  return new Hsl(h, s, l, a);
}

function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl;
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      h = NaN,
      s = max - min,
      l = (max + min) / 2;
  if (s) {
    if (r === max) h = (g - b) / s + (g < b) * 6;
    else if (g === max) h = (b - r) / s + 2;
    else h = (r - g) / s + 4;
    s /= l < 0.5 ? max + min : 2 - max - min;
    h *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s, l, o.opacity);
}

function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
}

function Hsl(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Hsl, hsl, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb: function() {
    var h = this.h % 360 + (this.h < 0) * 360,
        s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
        l = this.l,
        m2 = l + (l < 0.5 ? l : 1 - l) * s,
        m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  displayable: function() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s))
        && (0 <= this.l && this.l <= 1)
        && (0 <= this.opacity && this.opacity <= 1);
  }
}));

/* From FvD 13.37, CSS Color Module Level 3 */
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60
      : h < 180 ? m2
      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
      : m1) * 255;
}

var deg2rad = Math.PI / 180;
var rad2deg = 180 / Math.PI;

var Kn = 18;
var Xn = 0.950470;
var Yn = 1;
var Zn = 1.088830;
var t0 = 4 / 29;
var t1 = 6 / 29;
var t2 = 3 * t1 * t1;
var t3 = t1 * t1 * t1;

function labConvert(o) {
  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
  if (o instanceof Hcl) {
    var h = o.h * deg2rad;
    return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
  }
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var b = rgb2xyz(o.r),
      a = rgb2xyz(o.g),
      l = rgb2xyz(o.b),
      x = xyz2lab((0.4124564 * b + 0.3575761 * a + 0.1804375 * l) / Xn),
      y = xyz2lab((0.2126729 * b + 0.7151522 * a + 0.0721750 * l) / Yn),
      z = xyz2lab((0.0193339 * b + 0.1191920 * a + 0.9503041 * l) / Zn);
  return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
}

function lab(l, a, b, opacity) {
  return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
}

function Lab(l, a, b, opacity) {
  this.l = +l;
  this.a = +a;
  this.b = +b;
  this.opacity = +opacity;
}

define(Lab, lab, extend(Color, {
  brighter: function(k) {
    return new Lab(this.l + Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  darker: function(k) {
    return new Lab(this.l - Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  rgb: function() {
    var y = (this.l + 16) / 116,
        x = isNaN(this.a) ? y : y + this.a / 500,
        z = isNaN(this.b) ? y : y - this.b / 200;
    y = Yn * lab2xyz(y);
    x = Xn * lab2xyz(x);
    z = Zn * lab2xyz(z);
    return new Rgb(
      xyz2rgb( 3.2404542 * x - 1.5371385 * y - 0.4985314 * z), // D65 -> sRGB
      xyz2rgb(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z),
      xyz2rgb( 0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
      this.opacity
    );
  }
}));

function xyz2lab(t) {
  return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
}

function lab2xyz(t) {
  return t > t1 ? t * t * t : t2 * (t - t0);
}

function xyz2rgb(x) {
  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
}

function rgb2xyz(x) {
  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function hclConvert(o) {
  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
  if (!(o instanceof Lab)) o = labConvert(o);
  var h = Math.atan2(o.b, o.a) * rad2deg;
  return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
}

function hcl(h, c, l, opacity) {
  return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
}

function Hcl(h, c, l, opacity) {
  this.h = +h;
  this.c = +c;
  this.l = +l;
  this.opacity = +opacity;
}

define(Hcl, hcl, extend(Color, {
  brighter: function(k) {
    return new Hcl(this.h, this.c, this.l + Kn * (k == null ? 1 : k), this.opacity);
  },
  darker: function(k) {
    return new Hcl(this.h, this.c, this.l - Kn * (k == null ? 1 : k), this.opacity);
  },
  rgb: function() {
    return labConvert(this).rgb();
  }
}));

var A = -0.14861;
var B = +1.78277;
var C = -0.29227;
var D = -0.90649;
var E = +1.97294;
var ED = E * D;
var EB = E * B;
var BC_DA = B * C - D * A;

function cubehelixConvert(o) {
  if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
      bl = b - l,
      k = (E * (g - l) - C * bl) / D,
      s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
      h = s ? Math.atan2(k, bl) * rad2deg - 120 : NaN;
  return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
}

function cubehelix(h, s, l, opacity) {
  return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
}

function Cubehelix(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Cubehelix, cubehelix, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  rgb: function() {
    var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
        l = +this.l,
        a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
        cosh = Math.cos(h),
        sinh = Math.sin(h);
    return new Rgb(
      255 * (l + a * (A * cosh + B * sinh)),
      255 * (l + a * (C * cosh + D * sinh)),
      255 * (l + a * (E * cosh)),
      this.opacity
    );
  }
}));

function basis(t1, v0, v1, v2, v3) {
  var t2 = t1 * t1, t3 = t2 * t1;
  return ((1 - 3 * t1 + 3 * t2 - t3) * v0
      + (4 - 6 * t2 + 3 * t3) * v1
      + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2
      + t3 * v3) / 6;
}

var basis$1 = function(values) {
  var n = values.length - 1;
  return function(t) {
    var i = t <= 0 ? (t = 0) : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n),
        v1 = values[i],
        v2 = values[i + 1],
        v0 = i > 0 ? values[i - 1] : 2 * v1 - v2,
        v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
};

var basisClosed = function(values) {
  var n = values.length;
  return function(t) {
    var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n),
        v0 = values[(i + n - 1) % n],
        v1 = values[i % n],
        v2 = values[(i + 1) % n],
        v3 = values[(i + 2) % n];
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
};

var constant$2 = function(x) {
  return function() {
    return x;
  };
};

function linear$1(a, d) {
  return function(t) {
    return a + t * d;
  };
}

function exponential(a, b, y) {
  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
    return Math.pow(a + t * b, y);
  };
}

function hue(a, b) {
  var d = b - a;
  return d ? linear$1(a, d > 180 || d < -180 ? d - 360 * Math.round(d / 360) : d) : constant$2(isNaN(a) ? b : a);
}

function gamma(y) {
  return (y = +y) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y) : constant$2(isNaN(a) ? b : a);
  };
}

function nogamma(a, b) {
  var d = b - a;
  return d ? linear$1(a, d) : constant$2(isNaN(a) ? b : a);
}

var interpolateRgb = (function rgbGamma(y) {
  var color$$1 = gamma(y);

  function rgb$$1(start, end) {
    var r = color$$1((start = rgb(start)).r, (end = rgb(end)).r),
        g = color$$1(start.g, end.g),
        b = color$$1(start.b, end.b),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.r = r(t);
      start.g = g(t);
      start.b = b(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }

  rgb$$1.gamma = rgbGamma;

  return rgb$$1;
})(1);

function rgbSpline(spline) {
  return function(colors) {
    var n = colors.length,
        r = new Array(n),
        g = new Array(n),
        b = new Array(n),
        i, color$$1;
    for (i = 0; i < n; ++i) {
      color$$1 = rgb(colors[i]);
      r[i] = color$$1.r || 0;
      g[i] = color$$1.g || 0;
      b[i] = color$$1.b || 0;
    }
    r = spline(r);
    g = spline(g);
    b = spline(b);
    color$$1.opacity = 1;
    return function(t) {
      color$$1.r = r(t);
      color$$1.g = g(t);
      color$$1.b = b(t);
      return color$$1 + "";
    };
  };
}

var rgbBasis = rgbSpline(basis$1);
var rgbBasisClosed = rgbSpline(basisClosed);

var array$2 = function(a, b) {
  var nb = b ? b.length : 0,
      na = a ? Math.min(nb, a.length) : 0,
      x = new Array(na),
      c = new Array(nb),
      i;

  for (i = 0; i < na; ++i) x[i] = interpolateValue(a[i], b[i]);
  for (; i < nb; ++i) c[i] = b[i];

  return function(t) {
    for (i = 0; i < na; ++i) c[i] = x[i](t);
    return c;
  };
};

var date = function(a, b) {
  var d = new Date;
  return a = +a, b -= a, function(t) {
    return d.setTime(a + b * t), d;
  };
};

var interpolateNumber = function(a, b) {
  return a = +a, b -= a, function(t) {
    return a + b * t;
  };
};

var object = function(a, b) {
  var i = {},
      c = {},
      k;

  if (a === null || typeof a !== "object") a = {};
  if (b === null || typeof b !== "object") b = {};

  for (k in b) {
    if (k in a) {
      i[k] = interpolateValue(a[k], b[k]);
    } else {
      c[k] = b[k];
    }
  }

  return function(t) {
    for (k in i) c[k] = i[k](t);
    return c;
  };
};

var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
var reB = new RegExp(reA.source, "g");

function zero(b) {
  return function() {
    return b;
  };
}

function one(b) {
  return function(t) {
    return b(t) + "";
  };
}

var interpolateString = function(a, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
      am, // current match in a
      bm, // current match in b
      bs, // string preceding current number in b, if any
      i = -1, // index in s
      s = [], // string constants and placeholders
      q = []; // number interpolators

  // Coerce inputs to strings.
  a = a + "", b = b + "";

  // Interpolate pairs of numbers in a & b.
  while ((am = reA.exec(a))
      && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) { // a string precedes the next number in b
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
      if (s[i]) s[i] += bm; // coalesce with previous string
      else s[++i] = bm;
    } else { // interpolate non-matching numbers
      s[++i] = null;
      q.push({i: i, x: interpolateNumber(am, bm)});
    }
    bi = reB.lastIndex;
  }

  // Add remains of b.
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs; // coalesce with previous string
    else s[++i] = bs;
  }

  // Special optimization for only a single match.
  // Otherwise, interpolate each of the numbers and rejoin the string.
  return s.length < 2 ? (q[0]
      ? one(q[0].x)
      : zero(b))
      : (b = q.length, function(t) {
          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
          return s.join("");
        });
};

var interpolateValue = function(a, b) {
  var t = typeof b, c;
  return b == null || t === "boolean" ? constant$2(b)
      : (t === "number" ? interpolateNumber
      : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
      : b instanceof color ? interpolateRgb
      : b instanceof Date ? date
      : Array.isArray(b) ? array$2
      : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
      : interpolateNumber)(a, b);
};

var interpolateRound = function(a, b) {
  return a = +a, b -= a, function(t) {
    return Math.round(a + b * t);
  };
};

var degrees = 180 / Math.PI;

var identity$2 = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};

var decompose = function(a, b, c, d, e, f) {
  var scaleX, scaleY, skewX;
  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a) * degrees,
    skewX: Math.atan(skewX) * degrees,
    scaleX: scaleX,
    scaleY: scaleY
  };
};

var cssNode;
var cssRoot;
var cssView;
var svgNode;

function parseCss(value) {
  if (value === "none") return identity$2;
  if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
  cssNode.style.transform = value;
  value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
  cssRoot.removeChild(cssNode);
  value = value.slice(7, -1).split(",");
  return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
}

function parseSvg(value) {
  if (value == null) return identity$2;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity$2;
  value = value.matrix;
  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
}

function interpolateTransform(parse, pxComma, pxParen, degParen) {

  function pop(s) {
    return s.length ? s.pop() + " " : "";
  }

  function translate(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push("translate(", null, pxComma, null, pxParen);
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }

  function rotate(a, b, s, q) {
    if (a !== b) {
      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }

  function skewX(a, b, s, q) {
    if (a !== b) {
      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }

  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb !== 1 || yb !== 1) {
      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
    }
  }

  return function(a, b) {
    var s = [], // string constants and placeholders
        q = []; // number interpolators
    a = parse(a), b = parse(b);
    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
    rotate(a.rotate, b.rotate, s, q);
    skewX(a.skewX, b.skewX, s, q);
    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
    a = b = null; // gc
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  };
}

var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

function cubehelix$1(hue$$1) {
  return (function cubehelixGamma(y) {
    y = +y;

    function cubehelix$$1(start, end) {
      var h = hue$$1((start = cubehelix(start)).h, (end = cubehelix(end)).h),
          s = nogamma(start.s, end.s),
          l = nogamma(start.l, end.l),
          opacity = nogamma(start.opacity, end.opacity);
      return function(t) {
        start.h = h(t);
        start.s = s(t);
        start.l = l(Math.pow(t, y));
        start.opacity = opacity(t);
        return start + "";
      };
    }

    cubehelix$$1.gamma = cubehelixGamma;

    return cubehelix$$1;
  })(1);
}

cubehelix$1(hue);
var cubehelixLong = cubehelix$1(nogamma);

var constant$3 = function(x) {
  return function() {
    return x;
  };
};

var number$1 = function(x) {
  return +x;
};

var unit = [0, 1];

function deinterpolateLinear(a, b) {
  return (b -= (a = +a))
      ? function(x) { return (x - a) / b; }
      : constant$3(b);
}

function deinterpolateClamp(deinterpolate) {
  return function(a, b) {
    var d = deinterpolate(a = +a, b = +b);
    return function(x) { return x <= a ? 0 : x >= b ? 1 : d(x); };
  };
}

function reinterpolateClamp(reinterpolate) {
  return function(a, b) {
    var r = reinterpolate(a = +a, b = +b);
    return function(t) { return t <= 0 ? a : t >= 1 ? b : r(t); };
  };
}

function bimap(domain, range, deinterpolate, reinterpolate) {
  var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
  if (d1 < d0) d0 = deinterpolate(d1, d0), r0 = reinterpolate(r1, r0);
  else d0 = deinterpolate(d0, d1), r0 = reinterpolate(r0, r1);
  return function(x) { return r0(d0(x)); };
}

function polymap(domain, range, deinterpolate, reinterpolate) {
  var j = Math.min(domain.length, range.length) - 1,
      d = new Array(j),
      r = new Array(j),
      i = -1;

  // Reverse descending domains.
  if (domain[j] < domain[0]) {
    domain = domain.slice().reverse();
    range = range.slice().reverse();
  }

  while (++i < j) {
    d[i] = deinterpolate(domain[i], domain[i + 1]);
    r[i] = reinterpolate(range[i], range[i + 1]);
  }

  return function(x) {
    var i = bisectRight(domain, x, 1, j) - 1;
    return r[i](d[i](x));
  };
}

function copy(source, target) {
  return target
      .domain(source.domain())
      .range(source.range())
      .interpolate(source.interpolate())
      .clamp(source.clamp());
}

// deinterpolate(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
// reinterpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding domain value x in [a,b].
function continuous(deinterpolate, reinterpolate) {
  var domain = unit,
      range = unit,
      interpolate$$1 = interpolateValue,
      clamp = false,
      piecewise,
      output,
      input;

  function rescale() {
    piecewise = Math.min(domain.length, range.length) > 2 ? polymap : bimap;
    output = input = null;
    return scale;
  }

  function scale(x) {
    return (output || (output = piecewise(domain, range, clamp ? deinterpolateClamp(deinterpolate) : deinterpolate, interpolate$$1)))(+x);
  }

  scale.invert = function(y) {
    return (input || (input = piecewise(range, domain, deinterpolateLinear, clamp ? reinterpolateClamp(reinterpolate) : reinterpolate)))(+y);
  };

  scale.domain = function(_) {
    return arguments.length ? (domain = map$3.call(_, number$1), rescale()) : domain.slice();
  };

  scale.range = function(_) {
    return arguments.length ? (range = slice$1.call(_), rescale()) : range.slice();
  };

  scale.rangeRound = function(_) {
    return range = slice$1.call(_), interpolate$$1 = interpolateRound, rescale();
  };

  scale.clamp = function(_) {
    return arguments.length ? (clamp = !!_, rescale()) : clamp;
  };

  scale.interpolate = function(_) {
    return arguments.length ? (interpolate$$1 = _, rescale()) : interpolate$$1;
  };

  return rescale();
}

// Computes the decimal coefficient and exponent of the specified number x with
// significant digits p, where x is positive and p is in [1, 21] or undefined.
// For example, formatDecimal(1.23) returns ["123", 0].
var formatDecimal = function(x, p) {
  if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
  var i, coefficient = x.slice(0, i);

  // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
  // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
  return [
    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
    +x.slice(i + 1)
  ];
};

var exponent = function(x) {
  return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
};

var formatGroup = function(grouping, thousands) {
  return function(value, width) {
    var i = value.length,
        t = [],
        j = 0,
        g = grouping[0],
        length = 0;

    while (i > 0 && g > 0) {
      if (length + g + 1 > width) g = Math.max(1, width - length);
      t.push(value.substring(i -= g, i + g));
      if ((length += g + 1) > width) break;
      g = grouping[j = (j + 1) % grouping.length];
    }

    return t.reverse().join(thousands);
  };
};

var formatNumerals = function(numerals) {
  return function(value) {
    return value.replace(/[0-9]/g, function(i) {
      return numerals[+i];
    });
  };
};

var formatDefault = function(x, p) {
  x = x.toPrecision(p);

  out: for (var n = x.length, i = 1, i0 = -1, i1; i < n; ++i) {
    switch (x[i]) {
      case ".": i0 = i1 = i; break;
      case "0": if (i0 === 0) i0 = i; i1 = i; break;
      case "e": break out;
      default: if (i0 > 0) i0 = 0; break;
    }
  }

  return i0 > 0 ? x.slice(0, i0) + x.slice(i1 + 1) : x;
};

var prefixExponent;

var formatPrefixAuto = function(x, p) {
  var d = formatDecimal(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1],
      i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
      n = coefficient.length;
  return i === n ? coefficient
      : i > n ? coefficient + new Array(i - n + 1).join("0")
      : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
      : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
};

var formatRounded = function(x, p) {
  var d = formatDecimal(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1];
  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
      : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
      : coefficient + new Array(exponent - coefficient.length + 2).join("0");
};

var formatTypes = {
  "": formatDefault,
  "%": function(x, p) { return (x * 100).toFixed(p); },
  "b": function(x) { return Math.round(x).toString(2); },
  "c": function(x) { return x + ""; },
  "d": function(x) { return Math.round(x).toString(10); },
  "e": function(x, p) { return x.toExponential(p); },
  "f": function(x, p) { return x.toFixed(p); },
  "g": function(x, p) { return x.toPrecision(p); },
  "o": function(x) { return Math.round(x).toString(8); },
  "p": function(x, p) { return formatRounded(x * 100, p); },
  "r": formatRounded,
  "s": formatPrefixAuto,
  "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
  "x": function(x) { return Math.round(x).toString(16); }
};

// [[fill]align][sign][symbol][0][width][,][.precision][type]
var re = /^(?:(.)?([<>=^]))?([+\-\( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?([a-z%])?$/i;

function formatSpecifier(specifier) {
  return new FormatSpecifier(specifier);
}

formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

function FormatSpecifier(specifier) {
  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);

  var match,
      fill = match[1] || " ",
      align = match[2] || ">",
      sign = match[3] || "-",
      symbol = match[4] || "",
      zero = !!match[5],
      width = match[6] && +match[6],
      comma = !!match[7],
      precision = match[8] && +match[8].slice(1),
      type = match[9] || "";

  // The "n" type is an alias for ",g".
  if (type === "n") comma = true, type = "g";

  // Map invalid types to the default format.
  else if (!formatTypes[type]) type = "";

  // If zero fill is specified, padding goes after sign and before digits.
  if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

  this.fill = fill;
  this.align = align;
  this.sign = sign;
  this.symbol = symbol;
  this.zero = zero;
  this.width = width;
  this.comma = comma;
  this.precision = precision;
  this.type = type;
}

FormatSpecifier.prototype.toString = function() {
  return this.fill
      + this.align
      + this.sign
      + this.symbol
      + (this.zero ? "0" : "")
      + (this.width == null ? "" : Math.max(1, this.width | 0))
      + (this.comma ? "," : "")
      + (this.precision == null ? "" : "." + Math.max(0, this.precision | 0))
      + this.type;
};

var identity$3 = function(x) {
  return x;
};

var prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

var formatLocale = function(locale) {
  var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : identity$3,
      currency = locale.currency,
      decimal = locale.decimal,
      numerals = locale.numerals ? formatNumerals(locale.numerals) : identity$3,
      percent = locale.percent || "%";

  function newFormat(specifier) {
    specifier = formatSpecifier(specifier);

    var fill = specifier.fill,
        align = specifier.align,
        sign = specifier.sign,
        symbol = specifier.symbol,
        zero = specifier.zero,
        width = specifier.width,
        comma = specifier.comma,
        precision = specifier.precision,
        type = specifier.type;

    // Compute the prefix and suffix.
    // For SI-prefix, the suffix is lazily computed.
    var prefix = symbol === "$" ? currency[0] : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
        suffix = symbol === "$" ? currency[1] : /[%p]/.test(type) ? percent : "";

    // What format function should we use?
    // Is this an integer type?
    // Can this type generate exponential notation?
    var formatType = formatTypes[type],
        maybeSuffix = !type || /[defgprs%]/.test(type);

    // Set the default precision if not specified,
    // or clamp the specified precision to the supported range.
    // For significant precision, it must be in [1, 21].
    // For fixed precision, it must be in [0, 20].
    precision = precision == null ? (type ? 6 : 12)
        : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
        : Math.max(0, Math.min(20, precision));

    function format(value) {
      var valuePrefix = prefix,
          valueSuffix = suffix,
          i, n, c;

      if (type === "c") {
        valueSuffix = formatType(value) + valueSuffix;
        value = "";
      } else {
        value = +value;

        // Perform the initial formatting.
        var valueNegative = value < 0;
        value = formatType(Math.abs(value), precision);

        // If a negative value rounds to zero during formatting, treat as positive.
        if (valueNegative && +value === 0) valueNegative = false;

        // Compute the prefix and suffix.
        valuePrefix = (valueNegative ? (sign === "(" ? sign : "-") : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
        valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

        // Break the formatted value into the integer “value” part that can be
        // grouped, and fractional or exponential “suffix” part that is not.
        if (maybeSuffix) {
          i = -1, n = value.length;
          while (++i < n) {
            if (c = value.charCodeAt(i), 48 > c || c > 57) {
              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
              value = value.slice(0, i);
              break;
            }
          }
        }
      }

      // If the fill character is not "0", grouping is applied before padding.
      if (comma && !zero) value = group(value, Infinity);

      // Compute the padding.
      var length = valuePrefix.length + value.length + valueSuffix.length,
          padding = length < width ? new Array(width - length + 1).join(fill) : "";

      // If the fill character is "0", grouping is applied after padding.
      if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

      // Reconstruct the final output based on the desired alignment.
      switch (align) {
        case "<": value = valuePrefix + value + valueSuffix + padding; break;
        case "=": value = valuePrefix + padding + value + valueSuffix; break;
        case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
        default: value = padding + valuePrefix + value + valueSuffix; break;
      }

      return numerals(value);
    }

    format.toString = function() {
      return specifier + "";
    };

    return format;
  }

  function formatPrefix(specifier, value) {
    var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
        e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
        k = Math.pow(10, -e),
        prefix = prefixes[8 + e / 3];
    return function(value) {
      return f(k * value) + prefix;
    };
  }

  return {
    format: newFormat,
    formatPrefix: formatPrefix
  };
};

var locale;
var format;
var formatPrefix;

defaultLocale({
  decimal: ".",
  thousands: ",",
  grouping: [3],
  currency: ["$", ""]
});

function defaultLocale(definition) {
  locale = formatLocale(definition);
  format = locale.format;
  formatPrefix = locale.formatPrefix;
  return locale;
}

var precisionFixed = function(step) {
  return Math.max(0, -exponent(Math.abs(step)));
};

var precisionPrefix = function(step, value) {
  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
};

var precisionRound = function(step, max) {
  step = Math.abs(step), max = Math.abs(max) - step;
  return Math.max(0, exponent(max) - exponent(step)) + 1;
};

var tickFormat = function(domain, count, specifier) {
  var start = domain[0],
      stop = domain[domain.length - 1],
      step = tickStep(start, stop, count == null ? 10 : count),
      precision;
  specifier = formatSpecifier(specifier == null ? ",f" : specifier);
  switch (specifier.type) {
    case "s": {
      var value = Math.max(Math.abs(start), Math.abs(stop));
      if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
      return formatPrefix(specifier, value);
    }
    case "":
    case "e":
    case "g":
    case "p":
    case "r": {
      if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
      break;
    }
    case "f":
    case "%": {
      if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
      break;
    }
  }
  return format(specifier);
};

function linearish(scale) {
  var domain = scale.domain;

  scale.ticks = function(count) {
    var d = domain();
    return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
  };

  scale.tickFormat = function(count, specifier) {
    return tickFormat(domain(), count, specifier);
  };

  scale.nice = function(count) {
    if (count == null) count = 10;

    var d = domain(),
        i0 = 0,
        i1 = d.length - 1,
        start = d[i0],
        stop = d[i1],
        step;

    if (stop < start) {
      step = start, start = stop, stop = step;
      step = i0, i0 = i1, i1 = step;
    }

    step = tickIncrement(start, stop, count);

    if (step > 0) {
      start = Math.floor(start / step) * step;
      stop = Math.ceil(stop / step) * step;
      step = tickIncrement(start, stop, count);
    } else if (step < 0) {
      start = Math.ceil(start * step) / step;
      stop = Math.floor(stop * step) / step;
      step = tickIncrement(start, stop, count);
    }

    if (step > 0) {
      d[i0] = Math.floor(start / step) * step;
      d[i1] = Math.ceil(stop / step) * step;
      domain(d);
    } else if (step < 0) {
      d[i0] = Math.ceil(start * step) / step;
      d[i1] = Math.floor(stop * step) / step;
      domain(d);
    }

    return scale;
  };

  return scale;
}

function linear() {
  var scale = continuous(deinterpolateLinear, interpolateNumber);

  scale.copy = function() {
    return copy(scale, linear());
  };

  return linearish(scale);
}

var t0$1 = new Date;
var t1$1 = new Date;

function newInterval(floori, offseti, count, field) {

  function interval(date) {
    return floori(date = new Date(+date)), date;
  }

  interval.floor = interval;

  interval.ceil = function(date) {
    return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
  };

  interval.round = function(date) {
    var d0 = interval(date),
        d1 = interval.ceil(date);
    return date - d0 < d1 - date ? d0 : d1;
  };

  interval.offset = function(date, step) {
    return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
  };

  interval.range = function(start, stop, step) {
    var range = [], previous;
    start = interval.ceil(start);
    step = step == null ? 1 : Math.floor(step);
    if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
    do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
    while (previous < start && start < stop);
    return range;
  };

  interval.filter = function(test) {
    return newInterval(function(date) {
      if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
    }, function(date, step) {
      if (date >= date) {
        if (step < 0) while (++step <= 0) {
          while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
        } else while (--step >= 0) {
          while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
        }
      }
    });
  };

  if (count) {
    interval.count = function(start, end) {
      t0$1.setTime(+start), t1$1.setTime(+end);
      floori(t0$1), floori(t1$1);
      return Math.floor(count(t0$1, t1$1));
    };

    interval.every = function(step) {
      step = Math.floor(step);
      return !isFinite(step) || !(step > 0) ? null
          : !(step > 1) ? interval
          : interval.filter(field
              ? function(d) { return field(d) % step === 0; }
              : function(d) { return interval.count(0, d) % step === 0; });
    };
  }

  return interval;
}

var millisecond = newInterval(function() {
  // noop
}, function(date, step) {
  date.setTime(+date + step);
}, function(start, end) {
  return end - start;
});

// An optimized implementation for this simple case.
millisecond.every = function(k) {
  k = Math.floor(k);
  if (!isFinite(k) || !(k > 0)) return null;
  if (!(k > 1)) return millisecond;
  return newInterval(function(date) {
    date.setTime(Math.floor(date / k) * k);
  }, function(date, step) {
    date.setTime(+date + step * k);
  }, function(start, end) {
    return (end - start) / k;
  });
};

var durationSecond$1 = 1e3;
var durationMinute$1 = 6e4;
var durationHour$1 = 36e5;
var durationDay$1 = 864e5;
var durationWeek$1 = 6048e5;

var second = newInterval(function(date) {
  date.setTime(Math.floor(date / durationSecond$1) * durationSecond$1);
}, function(date, step) {
  date.setTime(+date + step * durationSecond$1);
}, function(start, end) {
  return (end - start) / durationSecond$1;
}, function(date) {
  return date.getUTCSeconds();
});

var minute = newInterval(function(date) {
  date.setTime(Math.floor(date / durationMinute$1) * durationMinute$1);
}, function(date, step) {
  date.setTime(+date + step * durationMinute$1);
}, function(start, end) {
  return (end - start) / durationMinute$1;
}, function(date) {
  return date.getMinutes();
});

var hour = newInterval(function(date) {
  var offset = date.getTimezoneOffset() * durationMinute$1 % durationHour$1;
  if (offset < 0) offset += durationHour$1;
  date.setTime(Math.floor((+date - offset) / durationHour$1) * durationHour$1 + offset);
}, function(date, step) {
  date.setTime(+date + step * durationHour$1);
}, function(start, end) {
  return (end - start) / durationHour$1;
}, function(date) {
  return date.getHours();
});

var day = newInterval(function(date) {
  date.setHours(0, 0, 0, 0);
}, function(date, step) {
  date.setDate(date.getDate() + step);
}, function(start, end) {
  return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute$1) / durationDay$1;
}, function(date) {
  return date.getDate() - 1;
});

function weekday(i) {
  return newInterval(function(date) {
    date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setDate(date.getDate() + step * 7);
  }, function(start, end) {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute$1) / durationWeek$1;
  });
}

var sunday = weekday(0);
var monday = weekday(1);
var tuesday = weekday(2);
var wednesday = weekday(3);
var thursday = weekday(4);
var friday = weekday(5);
var saturday = weekday(6);

var month = newInterval(function(date) {
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
}, function(date, step) {
  date.setMonth(date.getMonth() + step);
}, function(start, end) {
  return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
}, function(date) {
  return date.getMonth();
});

var year = newInterval(function(date) {
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
}, function(date, step) {
  date.setFullYear(date.getFullYear() + step);
}, function(start, end) {
  return end.getFullYear() - start.getFullYear();
}, function(date) {
  return date.getFullYear();
});

// An optimized implementation for this simple case.
year.every = function(k) {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
    date.setFullYear(Math.floor(date.getFullYear() / k) * k);
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setFullYear(date.getFullYear() + step * k);
  });
};

var utcMinute = newInterval(function(date) {
  date.setUTCSeconds(0, 0);
}, function(date, step) {
  date.setTime(+date + step * durationMinute$1);
}, function(start, end) {
  return (end - start) / durationMinute$1;
}, function(date) {
  return date.getUTCMinutes();
});

var utcHour = newInterval(function(date) {
  date.setUTCMinutes(0, 0, 0);
}, function(date, step) {
  date.setTime(+date + step * durationHour$1);
}, function(start, end) {
  return (end - start) / durationHour$1;
}, function(date) {
  return date.getUTCHours();
});

var utcDay = newInterval(function(date) {
  date.setUTCHours(0, 0, 0, 0);
}, function(date, step) {
  date.setUTCDate(date.getUTCDate() + step);
}, function(start, end) {
  return (end - start) / durationDay$1;
}, function(date) {
  return date.getUTCDate() - 1;
});

function utcWeekday(i) {
  return newInterval(function(date) {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCDate(date.getUTCDate() + step * 7);
  }, function(start, end) {
    return (end - start) / durationWeek$1;
  });
}

var utcSunday = utcWeekday(0);
var utcMonday = utcWeekday(1);
var utcTuesday = utcWeekday(2);
var utcWednesday = utcWeekday(3);
var utcThursday = utcWeekday(4);
var utcFriday = utcWeekday(5);
var utcSaturday = utcWeekday(6);

var utcMonth = newInterval(function(date) {
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
}, function(date, step) {
  date.setUTCMonth(date.getUTCMonth() + step);
}, function(start, end) {
  return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
}, function(date) {
  return date.getUTCMonth();
});

var utcYear = newInterval(function(date) {
  date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
}, function(date, step) {
  date.setUTCFullYear(date.getUTCFullYear() + step);
}, function(start, end) {
  return end.getUTCFullYear() - start.getUTCFullYear();
}, function(date) {
  return date.getUTCFullYear();
});

// An optimized implementation for this simple case.
utcYear.every = function(k) {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
    date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCFullYear(date.getUTCFullYear() + step * k);
  });
};

function localDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
    date.setFullYear(d.y);
    return date;
  }
  return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
}

function utcDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
    date.setUTCFullYear(d.y);
    return date;
  }
  return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
}

function newYear(y) {
  return {y: y, m: 0, d: 1, H: 0, M: 0, S: 0, L: 0};
}

function formatLocale$1(locale) {
  var locale_dateTime = locale.dateTime,
      locale_date = locale.date,
      locale_time = locale.time,
      locale_periods = locale.periods,
      locale_weekdays = locale.days,
      locale_shortWeekdays = locale.shortDays,
      locale_months = locale.months,
      locale_shortMonths = locale.shortMonths;

  var periodRe = formatRe(locale_periods),
      periodLookup = formatLookup(locale_periods),
      weekdayRe = formatRe(locale_weekdays),
      weekdayLookup = formatLookup(locale_weekdays),
      shortWeekdayRe = formatRe(locale_shortWeekdays),
      shortWeekdayLookup = formatLookup(locale_shortWeekdays),
      monthRe = formatRe(locale_months),
      monthLookup = formatLookup(locale_months),
      shortMonthRe = formatRe(locale_shortMonths),
      shortMonthLookup = formatLookup(locale_shortMonths);

  var formats = {
    "a": formatShortWeekday,
    "A": formatWeekday,
    "b": formatShortMonth,
    "B": formatMonth,
    "c": null,
    "d": formatDayOfMonth,
    "e": formatDayOfMonth,
    "f": formatMicroseconds,
    "H": formatHour24,
    "I": formatHour12,
    "j": formatDayOfYear,
    "L": formatMilliseconds,
    "m": formatMonthNumber,
    "M": formatMinutes,
    "p": formatPeriod,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatSeconds,
    "u": formatWeekdayNumberMonday,
    "U": formatWeekNumberSunday,
    "V": formatWeekNumberISO,
    "w": formatWeekdayNumberSunday,
    "W": formatWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatYear,
    "Y": formatFullYear,
    "Z": formatZone,
    "%": formatLiteralPercent
  };

  var utcFormats = {
    "a": formatUTCShortWeekday,
    "A": formatUTCWeekday,
    "b": formatUTCShortMonth,
    "B": formatUTCMonth,
    "c": null,
    "d": formatUTCDayOfMonth,
    "e": formatUTCDayOfMonth,
    "f": formatUTCMicroseconds,
    "H": formatUTCHour24,
    "I": formatUTCHour12,
    "j": formatUTCDayOfYear,
    "L": formatUTCMilliseconds,
    "m": formatUTCMonthNumber,
    "M": formatUTCMinutes,
    "p": formatUTCPeriod,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatUTCSeconds,
    "u": formatUTCWeekdayNumberMonday,
    "U": formatUTCWeekNumberSunday,
    "V": formatUTCWeekNumberISO,
    "w": formatUTCWeekdayNumberSunday,
    "W": formatUTCWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatUTCYear,
    "Y": formatUTCFullYear,
    "Z": formatUTCZone,
    "%": formatLiteralPercent
  };

  var parses = {
    "a": parseShortWeekday,
    "A": parseWeekday,
    "b": parseShortMonth,
    "B": parseMonth,
    "c": parseLocaleDateTime,
    "d": parseDayOfMonth,
    "e": parseDayOfMonth,
    "f": parseMicroseconds,
    "H": parseHour24,
    "I": parseHour24,
    "j": parseDayOfYear,
    "L": parseMilliseconds,
    "m": parseMonthNumber,
    "M": parseMinutes,
    "p": parsePeriod,
    "Q": parseUnixTimestamp,
    "s": parseUnixTimestampSeconds,
    "S": parseSeconds,
    "u": parseWeekdayNumberMonday,
    "U": parseWeekNumberSunday,
    "V": parseWeekNumberISO,
    "w": parseWeekdayNumberSunday,
    "W": parseWeekNumberMonday,
    "x": parseLocaleDate,
    "X": parseLocaleTime,
    "y": parseYear,
    "Y": parseFullYear,
    "Z": parseZone,
    "%": parseLiteralPercent
  };

  // These recursive directive definitions must be deferred.
  formats.x = newFormat(locale_date, formats);
  formats.X = newFormat(locale_time, formats);
  formats.c = newFormat(locale_dateTime, formats);
  utcFormats.x = newFormat(locale_date, utcFormats);
  utcFormats.X = newFormat(locale_time, utcFormats);
  utcFormats.c = newFormat(locale_dateTime, utcFormats);

  function newFormat(specifier, formats) {
    return function(date) {
      var string = [],
          i = -1,
          j = 0,
          n = specifier.length,
          c,
          pad,
          format;

      if (!(date instanceof Date)) date = new Date(+date);

      while (++i < n) {
        if (specifier.charCodeAt(i) === 37) {
          string.push(specifier.slice(j, i));
          if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
          else pad = c === "e" ? " " : "0";
          if (format = formats[c]) c = format(date, pad);
          string.push(c);
          j = i + 1;
        }
      }

      string.push(specifier.slice(j, i));
      return string.join("");
    };
  }

  function newParse(specifier, newDate) {
    return function(string) {
      var d = newYear(1900),
          i = parseSpecifier(d, specifier, string += "", 0),
          week, day$$1;
      if (i != string.length) return null;

      // If a UNIX timestamp is specified, return it.
      if ("Q" in d) return new Date(d.Q);

      // The am-pm flag is 0 for AM, and 1 for PM.
      if ("p" in d) d.H = d.H % 12 + d.p * 12;

      // Convert day-of-week and week-of-year to day-of-year.
      if ("V" in d) {
        if (d.V < 1 || d.V > 53) return null;
        if (!("w" in d)) d.w = 1;
        if ("Z" in d) {
          week = utcDate(newYear(d.y)), day$$1 = week.getUTCDay();
          week = day$$1 > 4 || day$$1 === 0 ? utcMonday.ceil(week) : utcMonday(week);
          week = utcDay.offset(week, (d.V - 1) * 7);
          d.y = week.getUTCFullYear();
          d.m = week.getUTCMonth();
          d.d = week.getUTCDate() + (d.w + 6) % 7;
        } else {
          week = newDate(newYear(d.y)), day$$1 = week.getDay();
          week = day$$1 > 4 || day$$1 === 0 ? monday.ceil(week) : monday(week);
          week = day.offset(week, (d.V - 1) * 7);
          d.y = week.getFullYear();
          d.m = week.getMonth();
          d.d = week.getDate() + (d.w + 6) % 7;
        }
      } else if ("W" in d || "U" in d) {
        if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
        day$$1 = "Z" in d ? utcDate(newYear(d.y)).getUTCDay() : newDate(newYear(d.y)).getDay();
        d.m = 0;
        d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day$$1 + 5) % 7 : d.w + d.U * 7 - (day$$1 + 6) % 7;
      }

      // If a time zone is specified, all fields are interpreted as UTC and then
      // offset according to the specified time zone.
      if ("Z" in d) {
        d.H += d.Z / 100 | 0;
        d.M += d.Z % 100;
        return utcDate(d);
      }

      // Otherwise, all fields are in local time.
      return newDate(d);
    };
  }

  function parseSpecifier(d, specifier, string, j) {
    var i = 0,
        n = specifier.length,
        m = string.length,
        c,
        parse;

    while (i < n) {
      if (j >= m) return -1;
      c = specifier.charCodeAt(i++);
      if (c === 37) {
        c = specifier.charAt(i++);
        parse = parses[c in pads ? specifier.charAt(i++) : c];
        if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
      } else if (c != string.charCodeAt(j++)) {
        return -1;
      }
    }

    return j;
  }

  function parsePeriod(d, string, i) {
    var n = periodRe.exec(string.slice(i));
    return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
  }

  function parseShortWeekday(d, string, i) {
    var n = shortWeekdayRe.exec(string.slice(i));
    return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
  }

  function parseWeekday(d, string, i) {
    var n = weekdayRe.exec(string.slice(i));
    return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
  }

  function parseShortMonth(d, string, i) {
    var n = shortMonthRe.exec(string.slice(i));
    return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
  }

  function parseMonth(d, string, i) {
    var n = monthRe.exec(string.slice(i));
    return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
  }

  function parseLocaleDateTime(d, string, i) {
    return parseSpecifier(d, locale_dateTime, string, i);
  }

  function parseLocaleDate(d, string, i) {
    return parseSpecifier(d, locale_date, string, i);
  }

  function parseLocaleTime(d, string, i) {
    return parseSpecifier(d, locale_time, string, i);
  }

  function formatShortWeekday(d) {
    return locale_shortWeekdays[d.getDay()];
  }

  function formatWeekday(d) {
    return locale_weekdays[d.getDay()];
  }

  function formatShortMonth(d) {
    return locale_shortMonths[d.getMonth()];
  }

  function formatMonth(d) {
    return locale_months[d.getMonth()];
  }

  function formatPeriod(d) {
    return locale_periods[+(d.getHours() >= 12)];
  }

  function formatUTCShortWeekday(d) {
    return locale_shortWeekdays[d.getUTCDay()];
  }

  function formatUTCWeekday(d) {
    return locale_weekdays[d.getUTCDay()];
  }

  function formatUTCShortMonth(d) {
    return locale_shortMonths[d.getUTCMonth()];
  }

  function formatUTCMonth(d) {
    return locale_months[d.getUTCMonth()];
  }

  function formatUTCPeriod(d) {
    return locale_periods[+(d.getUTCHours() >= 12)];
  }

  return {
    format: function(specifier) {
      var f = newFormat(specifier += "", formats);
      f.toString = function() { return specifier; };
      return f;
    },
    parse: function(specifier) {
      var p = newParse(specifier += "", localDate);
      p.toString = function() { return specifier; };
      return p;
    },
    utcFormat: function(specifier) {
      var f = newFormat(specifier += "", utcFormats);
      f.toString = function() { return specifier; };
      return f;
    },
    utcParse: function(specifier) {
      var p = newParse(specifier, utcDate);
      p.toString = function() { return specifier; };
      return p;
    }
  };
}

var pads = {"-": "", "_": " ", "0": "0"};
var numberRe = /^\s*\d+/;
var percentRe = /^%/;
var requoteRe = /[\\^$*+?|[\]().{}]/g;

function pad(value, fill, width) {
  var sign = value < 0 ? "-" : "",
      string = (sign ? -value : value) + "",
      length = string.length;
  return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
}

function requote(s) {
  return s.replace(requoteRe, "\\$&");
}

function formatRe(names) {
  return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
}

function formatLookup(names) {
  var map = {}, i = -1, n = names.length;
  while (++i < n) map[names[i].toLowerCase()] = i;
  return map;
}

function parseWeekdayNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.w = +n[0], i + n[0].length) : -1;
}

function parseWeekdayNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.u = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.U = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberISO(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.V = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.W = +n[0], i + n[0].length) : -1;
}

function parseFullYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 4));
  return n ? (d.y = +n[0], i + n[0].length) : -1;
}

function parseYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
}

function parseZone(d, string, i) {
  var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
  return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
}

function parseMonthNumber(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
}

function parseDayOfMonth(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.d = +n[0], i + n[0].length) : -1;
}

function parseDayOfYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
}

function parseHour24(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.H = +n[0], i + n[0].length) : -1;
}

function parseMinutes(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.M = +n[0], i + n[0].length) : -1;
}

function parseSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.S = +n[0], i + n[0].length) : -1;
}

function parseMilliseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.L = +n[0], i + n[0].length) : -1;
}

function parseMicroseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 6));
  return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
}

function parseLiteralPercent(d, string, i) {
  var n = percentRe.exec(string.slice(i, i + 1));
  return n ? i + n[0].length : -1;
}

function parseUnixTimestamp(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.Q = +n[0], i + n[0].length) : -1;
}

function parseUnixTimestampSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.Q = (+n[0]) * 1000, i + n[0].length) : -1;
}

function formatDayOfMonth(d, p) {
  return pad(d.getDate(), p, 2);
}

function formatHour24(d, p) {
  return pad(d.getHours(), p, 2);
}

function formatHour12(d, p) {
  return pad(d.getHours() % 12 || 12, p, 2);
}

function formatDayOfYear(d, p) {
  return pad(1 + day.count(year(d), d), p, 3);
}

function formatMilliseconds(d, p) {
  return pad(d.getMilliseconds(), p, 3);
}

function formatMicroseconds(d, p) {
  return formatMilliseconds(d, p) + "000";
}

function formatMonthNumber(d, p) {
  return pad(d.getMonth() + 1, p, 2);
}

function formatMinutes(d, p) {
  return pad(d.getMinutes(), p, 2);
}

function formatSeconds(d, p) {
  return pad(d.getSeconds(), p, 2);
}

function formatWeekdayNumberMonday(d) {
  var day$$1 = d.getDay();
  return day$$1 === 0 ? 7 : day$$1;
}

function formatWeekNumberSunday(d, p) {
  return pad(sunday.count(year(d), d), p, 2);
}

function formatWeekNumberISO(d, p) {
  var day$$1 = d.getDay();
  d = (day$$1 >= 4 || day$$1 === 0) ? thursday(d) : thursday.ceil(d);
  return pad(thursday.count(year(d), d) + (year(d).getDay() === 4), p, 2);
}

function formatWeekdayNumberSunday(d) {
  return d.getDay();
}

function formatWeekNumberMonday(d, p) {
  return pad(monday.count(year(d), d), p, 2);
}

function formatYear(d, p) {
  return pad(d.getFullYear() % 100, p, 2);
}

function formatFullYear(d, p) {
  return pad(d.getFullYear() % 10000, p, 4);
}

function formatZone(d) {
  var z = d.getTimezoneOffset();
  return (z > 0 ? "-" : (z *= -1, "+"))
      + pad(z / 60 | 0, "0", 2)
      + pad(z % 60, "0", 2);
}

function formatUTCDayOfMonth(d, p) {
  return pad(d.getUTCDate(), p, 2);
}

function formatUTCHour24(d, p) {
  return pad(d.getUTCHours(), p, 2);
}

function formatUTCHour12(d, p) {
  return pad(d.getUTCHours() % 12 || 12, p, 2);
}

function formatUTCDayOfYear(d, p) {
  return pad(1 + utcDay.count(utcYear(d), d), p, 3);
}

function formatUTCMilliseconds(d, p) {
  return pad(d.getUTCMilliseconds(), p, 3);
}

function formatUTCMicroseconds(d, p) {
  return formatUTCMilliseconds(d, p) + "000";
}

function formatUTCMonthNumber(d, p) {
  return pad(d.getUTCMonth() + 1, p, 2);
}

function formatUTCMinutes(d, p) {
  return pad(d.getUTCMinutes(), p, 2);
}

function formatUTCSeconds(d, p) {
  return pad(d.getUTCSeconds(), p, 2);
}

function formatUTCWeekdayNumberMonday(d) {
  var dow = d.getUTCDay();
  return dow === 0 ? 7 : dow;
}

function formatUTCWeekNumberSunday(d, p) {
  return pad(utcSunday.count(utcYear(d), d), p, 2);
}

function formatUTCWeekNumberISO(d, p) {
  var day$$1 = d.getUTCDay();
  d = (day$$1 >= 4 || day$$1 === 0) ? utcThursday(d) : utcThursday.ceil(d);
  return pad(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
}

function formatUTCWeekdayNumberSunday(d) {
  return d.getUTCDay();
}

function formatUTCWeekNumberMonday(d, p) {
  return pad(utcMonday.count(utcYear(d), d), p, 2);
}

function formatUTCYear(d, p) {
  return pad(d.getUTCFullYear() % 100, p, 2);
}

function formatUTCFullYear(d, p) {
  return pad(d.getUTCFullYear() % 10000, p, 4);
}

function formatUTCZone() {
  return "+0000";
}

function formatLiteralPercent() {
  return "%";
}

function formatUnixTimestamp(d) {
  return +d;
}

function formatUnixTimestampSeconds(d) {
  return Math.floor(+d / 1000);
}

var locale$1;


var utcFormat;
var utcParse;

defaultLocale$1({
  dateTime: "%x, %X",
  date: "%-m/%-d/%Y",
  time: "%-I:%M:%S %p",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
});

function defaultLocale$1(definition) {
  locale$1 = formatLocale$1(definition);
  utcFormat = locale$1.utcFormat;
  utcParse = locale$1.utcParse;
  return locale$1;
}

var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

function formatIsoNative(date) {
  return date.toISOString();
}

var formatIso = Date.prototype.toISOString
    ? formatIsoNative
    : utcFormat(isoSpecifier);

function parseIsoNative(string) {
  var date = new Date(string);
  return isNaN(date) ? null : date;
}

var parseIso = +new Date("2000-01-01T00:00:00.000Z")
    ? parseIsoNative
    : utcParse(isoSpecifier);

function sequential(interpolator) {
  var x0 = 0,
      x1 = 1,
      clamp = false;

  function scale(x) {
    var t = (x - x0) / (x1 - x0);
    return interpolator(clamp ? Math.max(0, Math.min(1, t)) : t);
  }

  scale.domain = function(_) {
    return arguments.length ? (x0 = +_[0], x1 = +_[1], scale) : [x0, x1];
  };

  scale.clamp = function(_) {
    return arguments.length ? (clamp = !!_, scale) : clamp;
  };

  scale.interpolator = function(_) {
    return arguments.length ? (interpolator = _, scale) : interpolator;
  };

  scale.copy = function() {
    return sequential(interpolator).domain([x0, x1]).clamp(clamp);
  };

  return linearish(scale);
}

var colors = function(specifier) {
  var n = specifier.length / 6 | 0, colors = new Array(n), i = 0;
  while (i < n) colors[i] = "#" + specifier.slice(i * 6, ++i * 6);
  return colors;
};

colors("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf");

colors("7fc97fbeaed4fdc086ffff99386cb0f0027fbf5b17666666");

colors("1b9e77d95f027570b3e7298a66a61ee6ab02a6761d666666");

colors("a6cee31f78b4b2df8a33a02cfb9a99e31a1cfdbf6fff7f00cab2d66a3d9affff99b15928");

colors("fbb4aeb3cde3ccebc5decbe4fed9a6ffffcce5d8bdfddaecf2f2f2");

colors("b3e2cdfdcdaccbd5e8f4cae4e6f5c9fff2aef1e2cccccccc");

colors("e41a1c377eb84daf4a984ea3ff7f00ffff33a65628f781bf999999");

colors("66c2a5fc8d628da0cbe78ac3a6d854ffd92fe5c494b3b3b3");

colors("8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f");

var ramp = function(scheme) {
  return rgbBasis(scheme[scheme.length - 1]);
};

var scheme = new Array(3).concat(
  "d8b365f5f5f55ab4ac",
  "a6611adfc27d80cdc1018571",
  "a6611adfc27df5f5f580cdc1018571",
  "8c510ad8b365f6e8c3c7eae55ab4ac01665e",
  "8c510ad8b365f6e8c3f5f5f5c7eae55ab4ac01665e",
  "8c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e",
  "8c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e",
  "5430058c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e003c30",
  "5430058c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e003c30"
).map(colors);

ramp(scheme);

var scheme$1 = new Array(3).concat(
  "af8dc3f7f7f77fbf7b",
  "7b3294c2a5cfa6dba0008837",
  "7b3294c2a5cff7f7f7a6dba0008837",
  "762a83af8dc3e7d4e8d9f0d37fbf7b1b7837",
  "762a83af8dc3e7d4e8f7f7f7d9f0d37fbf7b1b7837",
  "762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b7837",
  "762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b7837",
  "40004b762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b783700441b",
  "40004b762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b783700441b"
).map(colors);

ramp(scheme$1);

var scheme$2 = new Array(3).concat(
  "e9a3c9f7f7f7a1d76a",
  "d01c8bf1b6dab8e1864dac26",
  "d01c8bf1b6daf7f7f7b8e1864dac26",
  "c51b7de9a3c9fde0efe6f5d0a1d76a4d9221",
  "c51b7de9a3c9fde0eff7f7f7e6f5d0a1d76a4d9221",
  "c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221",
  "c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221",
  "8e0152c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221276419",
  "8e0152c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221276419"
).map(colors);

ramp(scheme$2);

var scheme$3 = new Array(3).concat(
  "998ec3f7f7f7f1a340",
  "5e3c99b2abd2fdb863e66101",
  "5e3c99b2abd2f7f7f7fdb863e66101",
  "542788998ec3d8daebfee0b6f1a340b35806",
  "542788998ec3d8daebf7f7f7fee0b6f1a340b35806",
  "5427888073acb2abd2d8daebfee0b6fdb863e08214b35806",
  "5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b35806",
  "2d004b5427888073acb2abd2d8daebfee0b6fdb863e08214b358067f3b08",
  "2d004b5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b358067f3b08"
).map(colors);

ramp(scheme$3);

var scheme$4 = new Array(3).concat(
  "ef8a62f7f7f767a9cf",
  "ca0020f4a58292c5de0571b0",
  "ca0020f4a582f7f7f792c5de0571b0",
  "b2182bef8a62fddbc7d1e5f067a9cf2166ac",
  "b2182bef8a62fddbc7f7f7f7d1e5f067a9cf2166ac",
  "b2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac",
  "b2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac",
  "67001fb2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac053061",
  "67001fb2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac053061"
).map(colors);

ramp(scheme$4);

var scheme$5 = new Array(3).concat(
  "ef8a62ffffff999999",
  "ca0020f4a582bababa404040",
  "ca0020f4a582ffffffbababa404040",
  "b2182bef8a62fddbc7e0e0e09999994d4d4d",
  "b2182bef8a62fddbc7ffffffe0e0e09999994d4d4d",
  "b2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d",
  "b2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d",
  "67001fb2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d1a1a1a",
  "67001fb2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d1a1a1a"
).map(colors);

ramp(scheme$5);

var scheme$6 = new Array(3).concat(
  "fc8d59ffffbf91bfdb",
  "d7191cfdae61abd9e92c7bb6",
  "d7191cfdae61ffffbfabd9e92c7bb6",
  "d73027fc8d59fee090e0f3f891bfdb4575b4",
  "d73027fc8d59fee090ffffbfe0f3f891bfdb4575b4",
  "d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4",
  "d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4",
  "a50026d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4313695",
  "a50026d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4313695"
).map(colors);

ramp(scheme$6);

var scheme$7 = new Array(3).concat(
  "fc8d59ffffbf91cf60",
  "d7191cfdae61a6d96a1a9641",
  "d7191cfdae61ffffbfa6d96a1a9641",
  "d73027fc8d59fee08bd9ef8b91cf601a9850",
  "d73027fc8d59fee08bffffbfd9ef8b91cf601a9850",
  "d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850",
  "d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850",
  "a50026d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850006837",
  "a50026d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850006837"
).map(colors);

ramp(scheme$7);

var scheme$8 = new Array(3).concat(
  "fc8d59ffffbf99d594",
  "d7191cfdae61abdda42b83ba",
  "d7191cfdae61ffffbfabdda42b83ba",
  "d53e4ffc8d59fee08be6f59899d5943288bd",
  "d53e4ffc8d59fee08bffffbfe6f59899d5943288bd",
  "d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd",
  "d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd",
  "9e0142d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd5e4fa2",
  "9e0142d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd5e4fa2"
).map(colors);

ramp(scheme$8);

var scheme$9 = new Array(3).concat(
  "e5f5f999d8c92ca25f",
  "edf8fbb2e2e266c2a4238b45",
  "edf8fbb2e2e266c2a42ca25f006d2c",
  "edf8fbccece699d8c966c2a42ca25f006d2c",
  "edf8fbccece699d8c966c2a441ae76238b45005824",
  "f7fcfde5f5f9ccece699d8c966c2a441ae76238b45005824",
  "f7fcfde5f5f9ccece699d8c966c2a441ae76238b45006d2c00441b"
).map(colors);

var BuGn = ramp(scheme$9);

var scheme$10 = new Array(3).concat(
  "e0ecf49ebcda8856a7",
  "edf8fbb3cde38c96c688419d",
  "edf8fbb3cde38c96c68856a7810f7c",
  "edf8fbbfd3e69ebcda8c96c68856a7810f7c",
  "edf8fbbfd3e69ebcda8c96c68c6bb188419d6e016b",
  "f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d6e016b",
  "f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d810f7c4d004b"
).map(colors);

ramp(scheme$10);

var scheme$11 = new Array(3).concat(
  "e0f3dba8ddb543a2ca",
  "f0f9e8bae4bc7bccc42b8cbe",
  "f0f9e8bae4bc7bccc443a2ca0868ac",
  "f0f9e8ccebc5a8ddb57bccc443a2ca0868ac",
  "f0f9e8ccebc5a8ddb57bccc44eb3d32b8cbe08589e",
  "f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe08589e",
  "f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe0868ac084081"
).map(colors);

ramp(scheme$11);

var scheme$12 = new Array(3).concat(
  "fee8c8fdbb84e34a33",
  "fef0d9fdcc8afc8d59d7301f",
  "fef0d9fdcc8afc8d59e34a33b30000",
  "fef0d9fdd49efdbb84fc8d59e34a33b30000",
  "fef0d9fdd49efdbb84fc8d59ef6548d7301f990000",
  "fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301f990000",
  "fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301fb300007f0000"
).map(colors);

var OrRd = ramp(scheme$12);

var scheme$13 = new Array(3).concat(
  "ece2f0a6bddb1c9099",
  "f6eff7bdc9e167a9cf02818a",
  "f6eff7bdc9e167a9cf1c9099016c59",
  "f6eff7d0d1e6a6bddb67a9cf1c9099016c59",
  "f6eff7d0d1e6a6bddb67a9cf3690c002818a016450",
  "fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016450",
  "fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016c59014636"
).map(colors);

ramp(scheme$13);

var scheme$14 = new Array(3).concat(
  "ece7f2a6bddb2b8cbe",
  "f1eef6bdc9e174a9cf0570b0",
  "f1eef6bdc9e174a9cf2b8cbe045a8d",
  "f1eef6d0d1e6a6bddb74a9cf2b8cbe045a8d",
  "f1eef6d0d1e6a6bddb74a9cf3690c00570b0034e7b",
  "fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0034e7b",
  "fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0045a8d023858"
).map(colors);

var PuBu = ramp(scheme$14);

var scheme$15 = new Array(3).concat(
  "e7e1efc994c7dd1c77",
  "f1eef6d7b5d8df65b0ce1256",
  "f1eef6d7b5d8df65b0dd1c77980043",
  "f1eef6d4b9dac994c7df65b0dd1c77980043",
  "f1eef6d4b9dac994c7df65b0e7298ace125691003f",
  "f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125691003f",
  "f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125698004367001f"
).map(colors);

ramp(scheme$15);

var scheme$16 = new Array(3).concat(
  "fde0ddfa9fb5c51b8a",
  "feebe2fbb4b9f768a1ae017e",
  "feebe2fbb4b9f768a1c51b8a7a0177",
  "feebe2fcc5c0fa9fb5f768a1c51b8a7a0177",
  "feebe2fcc5c0fa9fb5f768a1dd3497ae017e7a0177",
  "fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a0177",
  "fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a017749006a"
).map(colors);

ramp(scheme$16);

var scheme$17 = new Array(3).concat(
  "edf8b17fcdbb2c7fb8",
  "ffffcca1dab441b6c4225ea8",
  "ffffcca1dab441b6c42c7fb8253494",
  "ffffccc7e9b47fcdbb41b6c42c7fb8253494",
  "ffffccc7e9b47fcdbb41b6c41d91c0225ea80c2c84",
  "ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea80c2c84",
  "ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea8253494081d58"
).map(colors);

var YlGnBu = ramp(scheme$17);

var scheme$18 = new Array(3).concat(
  "f7fcb9addd8e31a354",
  "ffffccc2e69978c679238443",
  "ffffccc2e69978c67931a354006837",
  "ffffccd9f0a3addd8e78c67931a354006837",
  "ffffccd9f0a3addd8e78c67941ab5d238443005a32",
  "ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443005a32",
  "ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443006837004529"
).map(colors);

ramp(scheme$18);

var scheme$19 = new Array(3).concat(
  "fff7bcfec44fd95f0e",
  "ffffd4fed98efe9929cc4c02",
  "ffffd4fed98efe9929d95f0e993404",
  "ffffd4fee391fec44ffe9929d95f0e993404",
  "ffffd4fee391fec44ffe9929ec7014cc4c028c2d04",
  "ffffe5fff7bcfee391fec44ffe9929ec7014cc4c028c2d04",
  "ffffe5fff7bcfee391fec44ffe9929ec7014cc4c02993404662506"
).map(colors);

ramp(scheme$19);

var scheme$20 = new Array(3).concat(
  "ffeda0feb24cf03b20",
  "ffffb2fecc5cfd8d3ce31a1c",
  "ffffb2fecc5cfd8d3cf03b20bd0026",
  "ffffb2fed976feb24cfd8d3cf03b20bd0026",
  "ffffb2fed976feb24cfd8d3cfc4e2ae31a1cb10026",
  "ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cb10026",
  "ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cbd0026800026"
).map(colors);

ramp(scheme$20);

var scheme$21 = new Array(3).concat(
  "deebf79ecae13182bd",
  "eff3ffbdd7e76baed62171b5",
  "eff3ffbdd7e76baed63182bd08519c",
  "eff3ffc6dbef9ecae16baed63182bd08519c",
  "eff3ffc6dbef9ecae16baed64292c62171b5084594",
  "f7fbffdeebf7c6dbef9ecae16baed64292c62171b5084594",
  "f7fbffdeebf7c6dbef9ecae16baed64292c62171b508519c08306b"
).map(colors);

var Blues = ramp(scheme$21);

var scheme$22 = new Array(3).concat(
  "e5f5e0a1d99b31a354",
  "edf8e9bae4b374c476238b45",
  "edf8e9bae4b374c47631a354006d2c",
  "edf8e9c7e9c0a1d99b74c47631a354006d2c",
  "edf8e9c7e9c0a1d99b74c47641ab5d238b45005a32",
  "f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45005a32",
  "f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45006d2c00441b"
).map(colors);

var Greens = ramp(scheme$22);

var scheme$23 = new Array(3).concat(
  "f0f0f0bdbdbd636363",
  "f7f7f7cccccc969696525252",
  "f7f7f7cccccc969696636363252525",
  "f7f7f7d9d9d9bdbdbd969696636363252525",
  "f7f7f7d9d9d9bdbdbd969696737373525252252525",
  "fffffff0f0f0d9d9d9bdbdbd969696737373525252252525",
  "fffffff0f0f0d9d9d9bdbdbd969696737373525252252525000000"
).map(colors);

var Greys = ramp(scheme$23);

var scheme$24 = new Array(3).concat(
  "efedf5bcbddc756bb1",
  "f2f0f7cbc9e29e9ac86a51a3",
  "f2f0f7cbc9e29e9ac8756bb154278f",
  "f2f0f7dadaebbcbddc9e9ac8756bb154278f",
  "f2f0f7dadaebbcbddc9e9ac8807dba6a51a34a1486",
  "fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a34a1486",
  "fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a354278f3f007d"
).map(colors);

var Purples = ramp(scheme$24);

var scheme$25 = new Array(3).concat(
  "fee0d2fc9272de2d26",
  "fee5d9fcae91fb6a4acb181d",
  "fee5d9fcae91fb6a4ade2d26a50f15",
  "fee5d9fcbba1fc9272fb6a4ade2d26a50f15",
  "fee5d9fcbba1fc9272fb6a4aef3b2ccb181d99000d",
  "fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181d99000d",
  "fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181da50f1567000d"
).map(colors);

var Reds = ramp(scheme$25);

var scheme$26 = new Array(3).concat(
  "fee6cefdae6be6550d",
  "feeddefdbe85fd8d3cd94701",
  "feeddefdbe85fd8d3ce6550da63603",
  "feeddefdd0a2fdae6bfd8d3ce6550da63603",
  "feeddefdd0a2fdae6bfd8d3cf16913d948018c2d04",
  "fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d948018c2d04",
  "fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d94801a636037f2704"
).map(colors);

var Oranges = ramp(scheme$26);

cubehelixLong(cubehelix(300, 0.5, 0.0), cubehelix(-240, 0.5, 1.0));

var warm = cubehelixLong(cubehelix(-100, 0.75, 0.35), cubehelix(80, 1.50, 0.8));

var cool = cubehelixLong(cubehelix(260, 0.75, 0.35), cubehelix(80, 1.50, 0.8));

var rainbow = cubehelix();

function ramp$1(range) {
  var n = range.length;
  return function(t) {
    return range[Math.max(0, Math.min(n - 1, Math.floor(t * n)))];
  };
}

ramp$1(colors("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725"));

var magma = ramp$1(colors("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf"));

var inferno = ramp$1(colors("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4"));

var plasma = ramp$1(colors("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));

"use strict";

function colorChart(shuffle=true){
    // ref: http://cloford.com/resources/colours/namedcol.htm
    const colors = [
        "crimson", "palevioletred", "deeppink", "mediumvioletred", "orchid",
        "fuchsia", "darkmagenta", "darkviolet", "indigo", "blueviolet",
        "blue", "mediumslateblue", "darkslateblue", "mediumblue", "midnightblue",
        "royalblue", "dodgerblue", "deppskyblue", "darkturquoise", "steelblue",
        "darkcyan", "darkslategray", "seagreen", "limegreen", "darkgreen",
        "mediumspringgreen", "darkseagreen","green", "olivedrab", "darkkhaki",
        "darkolivegreen", "yellowgreen", "olive", "goldenrod", "darkgoldenrod",
        "orange", "tan", "peru", "sandybrown", "chocolate", "saddlebrown",
        "sienna", "coral", "orangered", "tomato", "rosybrown",
        "firebrick", "indianred", "red", "brown","gray", "black"
    ];
    if (shuffle) return shuffleColors(colors);
    return colors;
}

function shuffleColors(array) {
    // Fisher-Yates shuffle
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }

    return array;
}

function getColorInterpolator(name){
    // reference: https://github.com/d3/d3-scale-chromatic/blob/master/README.md#sequential-multi-hue
    const interpolators = {
        BuGn: BuGn,
        OrRd: OrRd,
        PuBu: PuBu,
        YlGnBu: YlGnBu,
        Blues: Blues,
        Oranges: Oranges,
        Greens: Greens,
        Purples: Purples,
        Reds: Reds,
        Greys: Greys,
        Grays: Greys
    };
    if (!interpolators.hasOwnProperty(name)) {
        const err = "Color Interpolator Error " + name;
        console.error(err);
        throw(err);
    }
    return interpolators[name];

}




/**
 * reference: https://github.com/d3/d3-scale
 * reference: http://bl.ocks.org/curran/3094b37e63b918bab0a06787e161607b
 * scaleSequential maps the continuous domain to a continuous color scale
 * @param data {List} of numerical data
 * @param colors {String} a color name that is available in getColorInterpolator()
 */
function setColorScale(data, colors="YlGnBu", dmin = 0) {
    let dmax = Math.round(max(data));
    const scale = sequential(getColorInterpolator(colors));
    scale.domain([dmin, dmax]);
    return scale;
}

/**
 * Draw a color legend bar.
 * Dependencies: expressionMap.css
 * @param title {String}
 * @param dom {object} D3 dom object
 * @param scale {Object} D3 scale of the color
 * @param config {Object} with attr: x, y
 * @param useLog {Boolean}
 * @param cell
 */
function drawColorLegend(title, dom, scale, config, useLog, ticks=10, base=10, cell={h:15, w:50}){

    // const data = [0].concat(scale.quantiles()); // add 0 to the list of values
    const data = scale.ticks(ticks).slice(1); // why this doesn't provide consistent number of ticks??
    // legend title
    dom.append("text")
        .attr("class", "color-legend")
        .text(title)
        .attr("x", -10)
        .attr("text-anchor", "end")
        .attr("y", cell.h)
        .attr("transform", `translate(${config.x}, ${config.y})`);

    // legend groups
    const legends = dom.append("g").attr("transform", `translate(${config.x}, ${config.y})`)
                    .selectAll(".legend").data(data);

    const g = legends.enter().append("g").classed("legend", true);
    g.append("rect")
        .attr("x", (d, i) => cell.w*i)
        .attr("y", 5)
        .attr("width", cell.w)
        .attr("height", cell.h)
        .style("fill", scale);

    g.append("text")
        .attr("class", "color-legend")
        .text((d) => useLog?(Math.pow(base, d)-1).toPrecision(2):d.toPrecision(2)) // TODO: assuming log is base 10
        .attr("x", (d, i) => cell.w * i)
        .attr("y", 0);


}

/**
 * Creates an SVG
 * @param id {String} a DOM element ID that starts with a "#"
 * @param width {Numeric}
 * @param height {Numeric}
 * @param margin {Object} with two attributes: width and height
 * @return {Selection} the d3 selection object of the SVG
 */

function createSvg(id, width, height, margin){
    "use strict";
    return select("#"+id).append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
}

/**
 *
 * @param svgObj
 * @param downloadFileName {String}
 * @param tempDownloadDivId {String}
 */
function downloadSvg(svgObj, downloadFileName, tempDownloadDivId){
    console.log(svgObj);
    var $svgCopy = svgObj.clone()
    .attr("version", "1.1")
    .attr("xmlns", "http://www.w3.org/2000/svg");

    // parse and add the CSS styling used by the SVG
    var styles = _parseCssStyles(svgObj.get());
    $svgCopy.prepend(styles);

    $("#" + tempDownloadDivId).html('').hide();
    var svgHtml = $("#" + tempDownloadDivId).append($svgCopy).html();

    var svgBlob = new Blob([svgHtml], {type: "image/svg+xml"});
    saveAs(svgBlob, downloadFileName);

    // clear the temp download div
    $("#" + tempDownloadDivId).html('').hide();
}
/**
 * A private function for parsing the CSS style sheet and including the style properties in the downloadable SVG.
 * @param dom
 * @returns {Element}
 * @private
 */
function _parseCssStyles (dom) {
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
 * TODO: a better way of handling layout configuration
 * review all the position calculations
 */
class DendroHeatmapConfig {
    constructor(id="chart"){
        this.id = id;
        this.margin = {left: 10, top: 10, right: 250, bottom: 170};

        this.cell = { // are these used?
            w: undefined,
            h: 12
        };

        this.topTreePanel = { // the column dendrogram panel
            x: 100,
            y: 0,
            h: 60,
            w: window.innerWidth - (100 + 150 + 300), // hard-coded values?
            id: "topTree"
        };

        let adjust = 15; // spacing adjustment

        this.leftTreePanel = { // the row dendrogram panel
            x: this.margin.left,
            y: this.margin.top + this.topTreePanel.h,
            h: undefined, // data-dependent
            w: 100 - (adjust),
            id: "leftTree"
        };

        this.heatmapPanel = {
            x: 100,
            y: this.margin.top + this.topTreePanel.h,
            h: this.leftTreePanel.h,
            w: this.topTreePanel.w,
            id: "heatmap"
        };

        this.legendPanel = { // the color legend panel
            x: 100,
            y: this.margin.top + this.topTreePanel.h + 150,
            h: 50,
            w: this.topTreePanel.w,
            cell: {w: 60},
            id: "legend"
        };

    }

    setId(id="chart"){
        this.id = id;
    }

    setMargin(margin={left: 10, top: 10, right: 250, bottom: 170}){
        this.margin = margin;
    }

    setMainPanelWidth(w){
        this.heatmapPanel.w = w;
    }

    noTopTreePanel(mainPanelWidth = window.innerWidth - (100 + 250)){
        this.topTreePanel = {x:0, y:0, h:20, w:0};
        this.leftTreePanel.y = this.margin.top*2;
        this.heatmapPanel.y = this.margin.top*2;
        this.heatmapPanel.w = mainPanelWidth;
        this.legendPanel.y = 0; // in the margin top
    }

    get(){
        return {
            id: this.id,
            margin: this.margin,
            cell: this.cell,
            w: window.innerWidth,
            h: this.margin.top + this.topTreePanel.h + this.legendPanel.h + this.margin.bottom, // initial height
            panels: {
                top: this.topTreePanel,
                left: this.leftTreePanel,
                main: this.heatmapPanel,
                legend: this.legendPanel
            }
        };
    }
}

function count(node) {
  var sum = 0,
      children = node.children,
      i = children && children.length;
  if (!i) sum = 1;
  else while (--i >= 0) sum += children[i].value;
  node.value = sum;
}

var node_count = function() {
  return this.eachAfter(count);
};

var node_each = function(callback) {
  var node = this, current, next = [node], children, i, n;
  do {
    current = next.reverse(), next = [];
    while (node = current.pop()) {
      callback(node), children = node.children;
      if (children) for (i = 0, n = children.length; i < n; ++i) {
        next.push(children[i]);
      }
    }
  } while (next.length);
  return this;
};

var node_eachBefore = function(callback) {
  var node = this, nodes = [node], children, i;
  while (node = nodes.pop()) {
    callback(node), children = node.children;
    if (children) for (i = children.length - 1; i >= 0; --i) {
      nodes.push(children[i]);
    }
  }
  return this;
};

var node_eachAfter = function(callback) {
  var node = this, nodes = [node], next = [], children, i, n;
  while (node = nodes.pop()) {
    next.push(node), children = node.children;
    if (children) for (i = 0, n = children.length; i < n; ++i) {
      nodes.push(children[i]);
    }
  }
  while (node = next.pop()) {
    callback(node);
  }
  return this;
};

var node_sum = function(value) {
  return this.eachAfter(function(node) {
    var sum = +value(node.data) || 0,
        children = node.children,
        i = children && children.length;
    while (--i >= 0) sum += children[i].value;
    node.value = sum;
  });
};

var node_sort = function(compare) {
  return this.eachBefore(function(node) {
    if (node.children) {
      node.children.sort(compare);
    }
  });
};

var node_path = function(end) {
  var start = this,
      ancestor = leastCommonAncestor(start, end),
      nodes = [start];
  while (start !== ancestor) {
    start = start.parent;
    nodes.push(start);
  }
  var k = nodes.length;
  while (end !== ancestor) {
    nodes.splice(k, 0, end);
    end = end.parent;
  }
  return nodes;
};

function leastCommonAncestor(a, b) {
  if (a === b) return a;
  var aNodes = a.ancestors(),
      bNodes = b.ancestors(),
      c = null;
  a = aNodes.pop();
  b = bNodes.pop();
  while (a === b) {
    c = a;
    a = aNodes.pop();
    b = bNodes.pop();
  }
  return c;
}

var node_ancestors = function() {
  var node = this, nodes = [node];
  while (node = node.parent) {
    nodes.push(node);
  }
  return nodes;
};

var node_descendants = function() {
  var nodes = [];
  this.each(function(node) {
    nodes.push(node);
  });
  return nodes;
};

var node_leaves = function() {
  var leaves = [];
  this.eachBefore(function(node) {
    if (!node.children) {
      leaves.push(node);
    }
  });
  return leaves;
};

var node_links = function() {
  var root = this, links = [];
  root.each(function(node) {
    if (node !== root) { // Don’t include the root’s parent, if any.
      links.push({source: node.parent, target: node});
    }
  });
  return links;
};

function hierarchy(data, children) {
  var root = new Node(data),
      valued = +data.value && (root.value = data.value),
      node,
      nodes = [root],
      child,
      childs,
      i,
      n;

  if (children == null) children = defaultChildren;

  while (node = nodes.pop()) {
    if (valued) node.value = +node.data.value;
    if ((childs = children(node.data)) && (n = childs.length)) {
      node.children = new Array(n);
      for (i = n - 1; i >= 0; --i) {
        nodes.push(child = node.children[i] = new Node(childs[i]));
        child.parent = node;
        child.depth = node.depth + 1;
      }
    }
  }

  return root.eachBefore(computeHeight);
}

function node_copy() {
  return hierarchy(this).eachBefore(copyData);
}

function defaultChildren(d) {
  return d.children;
}

function copyData(node) {
  node.data = node.data.data;
}

function computeHeight(node) {
  var height = 0;
  do node.height = height;
  while ((node = node.parent) && (node.height < ++height));
}

function Node(data) {
  this.data = data;
  this.depth =
  this.height = 0;
  this.parent = null;
}

Node.prototype = hierarchy.prototype = {
  constructor: Node,
  count: node_count,
  each: node_each,
  eachAfter: node_eachAfter,
  eachBefore: node_eachBefore,
  sum: node_sum,
  sort: node_sort,
  path: node_path,
  ancestors: node_ancestors,
  descendants: node_descendants,
  leaves: node_leaves,
  links: node_links,
  copy: node_copy
};

var slice$3 = Array.prototype.slice;

var identity$4 = function(x) {
  return x;
};

var top = 1;
var right = 2;
var bottom = 3;
var left = 4;
var epsilon = 1e-6;

function translateX(x) {
  return "translate(" + (x + 0.5) + ",0)";
}

function translateY(y) {
  return "translate(0," + (y + 0.5) + ")";
}

function number$3(scale) {
  return function(d) {
    return +scale(d);
  };
}

function center(scale) {
  var offset = Math.max(0, scale.bandwidth() - 1) / 2; // Adjust for 0.5px offset.
  if (scale.round()) offset = Math.round(offset);
  return function(d) {
    return +scale(d) + offset;
  };
}

function entering() {
  return !this.__axis;
}

function axis(orient, scale) {
  var tickArguments = [],
      tickValues = null,
      tickFormat = null,
      tickSizeInner = 6,
      tickSizeOuter = 6,
      tickPadding = 3,
      k = orient === top || orient === left ? -1 : 1,
      x = orient === left || orient === right ? "x" : "y",
      transform = orient === top || orient === bottom ? translateX : translateY;

  function axis(context) {
    var values = tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain()) : tickValues,
        format = tickFormat == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity$4) : tickFormat,
        spacing = Math.max(tickSizeInner, 0) + tickPadding,
        range = scale.range(),
        range0 = +range[0] + 0.5,
        range1 = +range[range.length - 1] + 0.5,
        position = (scale.bandwidth ? center : number$3)(scale.copy()),
        selection = context.selection ? context.selection() : context,
        path = selection.selectAll(".domain").data([null]),
        tick = selection.selectAll(".tick").data(values, scale).order(),
        tickExit = tick.exit(),
        tickEnter = tick.enter().append("g").attr("class", "tick"),
        line = tick.select("line"),
        text = tick.select("text");

    path = path.merge(path.enter().insert("path", ".tick")
        .attr("class", "domain")
        .attr("stroke", "#000"));

    tick = tick.merge(tickEnter);

    line = line.merge(tickEnter.append("line")
        .attr("stroke", "#000")
        .attr(x + "2", k * tickSizeInner));

    text = text.merge(tickEnter.append("text")
        .attr("fill", "#000")
        .attr(x, k * spacing)
        .attr("dy", orient === top ? "0em" : orient === bottom ? "0.71em" : "0.32em"));

    if (context !== selection) {
      path = path.transition(context);
      tick = tick.transition(context);
      line = line.transition(context);
      text = text.transition(context);

      tickExit = tickExit.transition(context)
          .attr("opacity", epsilon)
          .attr("transform", function(d) { return isFinite(d = position(d)) ? transform(d) : this.getAttribute("transform"); });

      tickEnter
          .attr("opacity", epsilon)
          .attr("transform", function(d) { var p = this.parentNode.__axis; return transform(p && isFinite(p = p(d)) ? p : position(d)); });
    }

    tickExit.remove();

    path
        .attr("d", orient === left || orient == right
            ? "M" + k * tickSizeOuter + "," + range0 + "H0.5V" + range1 + "H" + k * tickSizeOuter
            : "M" + range0 + "," + k * tickSizeOuter + "V0.5H" + range1 + "V" + k * tickSizeOuter);

    tick
        .attr("opacity", 1)
        .attr("transform", function(d) { return transform(position(d)); });

    line
        .attr(x + "2", k * tickSizeInner);

    text
        .attr(x, k * spacing)
        .text(format);

    selection.filter(entering)
        .attr("fill", "none")
        .attr("font-size", 10)
        .attr("font-family", "sans-serif")
        .attr("text-anchor", orient === right ? "start" : orient === left ? "end" : "middle");

    selection
        .each(function() { this.__axis = position; });
  }

  axis.scale = function(_) {
    return arguments.length ? (scale = _, axis) : scale;
  };

  axis.ticks = function() {
    return tickArguments = slice$3.call(arguments), axis;
  };

  axis.tickArguments = function(_) {
    return arguments.length ? (tickArguments = _ == null ? [] : slice$3.call(_), axis) : tickArguments.slice();
  };

  axis.tickValues = function(_) {
    return arguments.length ? (tickValues = _ == null ? null : slice$3.call(_), axis) : tickValues && tickValues.slice();
  };

  axis.tickFormat = function(_) {
    return arguments.length ? (tickFormat = _, axis) : tickFormat;
  };

  axis.tickSize = function(_) {
    return arguments.length ? (tickSizeInner = tickSizeOuter = +_, axis) : tickSizeInner;
  };

  axis.tickSizeInner = function(_) {
    return arguments.length ? (tickSizeInner = +_, axis) : tickSizeInner;
  };

  axis.tickSizeOuter = function(_) {
    return arguments.length ? (tickSizeOuter = +_, axis) : tickSizeOuter;
  };

  axis.tickPadding = function(_) {
    return arguments.length ? (tickPadding = +_, axis) : tickPadding;
  };

  return axis;
}





function axisBottom(scale) {
  return axis(bottom, scale);
}

function axisLeft(scale) {
  return axis(left, scale);
}

// Copyright 2011 Jason Davies https://github.com/jasondavies/newick.js

function parseNewick(s) {
    var ancestors = [];
    var tree = {};
    var tokens = s.split(/\s*(;|\(|\)|,|:)\s*/);
    for (var i=0; i<tokens.length; i++) {
      var token = tokens[i];
      switch (token) {
        case '(': // new branchset
          var subtree = {};
          tree.branchset = [subtree];
          ancestors.push(tree);
          tree = subtree;
          break;
        case ',': // another branch
          var subtree = {};
          ancestors[ancestors.length-1].branchset.push(subtree);
          tree = subtree;
          break;
        case ')': // optional name next
          tree = ancestors.pop();
          break;
        case ':': // optional length next
          break;
        default:
          var x = tokens[i-1];
          if (x == ')' || x == '(' || x == ',') {
            tree.name = token;
          } else if (x == ':') {
            tree.length = parseFloat(token);
          }
      }
    }
    return tree;
}

/*
    Dendrogram visualizes a text-based Newick tree using D3 V4.

    dependencies:
    d3 v4
    the newick parser: newick.js

    references:
    https://github.com/d3/d3-hierarchy
    https://github.com/jasondavies/newick.js/

    notes on the underlying data structures:
    - it uses parseNewick() to convert the newick tree into the following json:
        {
            branchset:[child node json objects],
            name: "" // internal nodes would have no real labels
        }
       This json structure is the input data of d3.hierarchy()

    - In the d3.hierarchy(), the root node object has the following structure:
        {
            children: [co, co],
            data: {
                branchset: Array(2),
                name: "node name"
            },
            depth: 0,
            height: integer,
            parent: null,
            value: 9
        }
 */

// TODO: eliminate hard-coded values

const verbose = false;
class Dendrogram {

    constructor(newick, orientation='h'){
        this.newick = newick;
        this.orientation = orientation;

        this.postorder = [];
        this.root = hierarchy(parseNewick(newick), (d) => d.branchset)
            .sum((d)=>d.branchset?0:1)
            .sort((a,b)=>a.value-b.value||a.data.length-b.data.length);
        this.leaves = this.root.leaves().sort((a, b) => (a.value - b.value) || ascending$1(a.data.length, b.data.length));

        this.width = undefined;
        this.height = undefined;
        this.xScale = undefined;
        this.yScale = undefined;
    }

    draw(dom, width, height){
        this.width = width;
        this.height = height;
        this._setXScale();
        this._setYScale();
        if ('h' == this.orientation) this._drawHTree(dom);
        else this._drawVTree(dom);
    }

    /////// private methods ///////

    _drawHTree(dom){
        const setY = (node) => {
            if (node.children === undefined) {
                // a leaf node
                node.y = this.yScale(node.data.name);
            } else {
                // an internal node
                // the y coordinate of an internal node is the average y from its children
                node.y = node.children.reduce((sum, d)=>sum+d.y, 0)/node.children.length;
            }
        };
        const setX = (node) => {
            node.x = this.xScale(this._getBranchLengthToRoot(node));
        };

        // from the leaf level -> root
        const nodes = this._sortNodesByLevel();
        nodes.forEach((node) => {
            setX(node);
            setY(node);
        });

        dom.selectAll('.branch')
            .data(nodes)
            .enter().append("line")
            .attr("x1", (d) => d.x)
            .attr("x2", (d) => d.data.length?d.x - this.xScale(d.data.length):d.x)
            .attr("y1", (d) => d.y + this.yScale.bandwidth()/2)
            .attr("y2", (d) => d.y + this.yScale.bandwidth()/2)
            .attr("stroke", "gray")
            .attr("stroke-width", 1);

        // for all internal nodes
        // TODO: write a recursive function to draw the arms and nodes
        const inodes = this.root.descendants().filter((d)=>d.height).sort((a,b)=>b.height-a.height);
        dom.selectAll('.arm')
            .data(inodes)
            .enter().append("line")
            .attr("x1", (d) => d.x)
            .attr("x2", (d) => d.x)
            .attr("y1", (d) => d.children[0].y + this.yScale.bandwidth()/2)
            .attr("y2", (d) => d.children[1].y + this.yScale.bandwidth()/2)
            .attr("stroke", "gray")
            .attr("stroke-width", 1);

        dom.selectAll('.node')
            .data(inodes)
            .enter().append("circle")
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y + this.yScale.bandwidth()/2)
            .attr("r", 2)
            // .attr("fill", "#8DCDC1") // TODO: eliminate hard-coded value, use css class
            // .attr("fill", "#4b8699")
            .attr('fill', '#333')
            .attr("opacity", 0.5)
            .attr("class", "dendrogram-node")
            .on("mouseover", function(d){
                d3.select(this).attr("r", 3);
                console.log(d.leaves());
            })
            .on("mouseout", function(d){
                d3.select(this).attr("r", 2);
            });

        // axis
        // Add the x Axis
        dom.append("g")
            .attr("class", "dendrogram-axis")
            .attr("transform", "translate(0," + this.height + ")")
            .call(
                axisBottom(this.xScale)
                    .ticks(3)
                // .tickValues([Math.floor(this._getMaxBranchLength()/2), Math.floor(this._getMaxBranchLength())])
            );
    }

    _sortNodesByLevel(){
        // returns a list of nodes ordered by ancestral level, then by branch length
        return this.root.descendants().sort((a, b) => (a.height - b.height) || ascending$1(a.data.length, b.data.length));
    }

    _drawVTree(dom){
        const setX = (node) => {
            if (node.children === undefined) {
                // a leaf node
                node.x = this.xScale(node.data.name);
            } else {
                // an internal node
                // the y coordinate of an internal node is the average y from its children
                node.x = node.children.reduce((sum, d)=>sum+d.x, 0)/node.children.length;
            }
        };
        const setY = (node) => {
            node.y = this.yScale(this._getBranchLengthToRoot(node));
        };
        // from the leaf level -> root
        const nodes = this._sortNodesByLevel();
        nodes.forEach((node) => {
            setX(node);
            setY(node);
        });
        dom.selectAll('.branch')
            .data(nodes)
            .enter().append("line")
            .attr("y1", (d) => d.y)
            .attr("y2", (d) => d.data.length?d.y - this.yScale(d.data.length):d.y)
            .attr("x1", (d) => d.x + this.xScale.bandwidth()/2)
            .attr("x2", (d) => d.x + this.xScale.bandwidth()/2)
            .attr("stroke", "gray")
            .attr("stroke-width", 1);

        // for all internal nodes
        const inodes = this.root.descendants().filter((d)=>d.height).sort((a,b)=>b.height-a.height);
        dom.selectAll('.arm')
            .data(inodes)
            .enter().append("line")
            .attr("y1", (d) => d.y)
            .attr("y2", (d) => d.y)
            .attr("x1", (d) => d.children[0].x + this.xScale.bandwidth()/2)
            .attr("x2", (d) => d.children[1].x + this.xScale.bandwidth()/2)
            .attr("stroke", "gray")
            .attr("stroke-width", 1);

        dom.selectAll('.node')
            .data(inodes)
            .enter().append("circle")
            .attr("cx", (d) => d.x + this.xScale.bandwidth()/2)
            .attr("cy", (d) => d.y)
            .attr("r", 2)
            // .attr("fill", "#8DCDC1")
            // .attr("fill", "#4b8699")
            .attr('fill', '#333')
            .attr("opacity", 0.5)
            .attr("class", "dendrogram-node")
            .on("mouseover", function(d){
                d3.select(this).attr("r", 3);
                console.log(d.leaves());
            })
            .on("mouseout", function(d){
                d3.select(this).attr("r", 2);
            });

        // axis
        // Add the x Axis
        dom.append("g")
            // .attr("transform", `translate(${this.width}, 0)`)
            .attr("class", "dendrogram-axis")
            .call(
                axisLeft(this.yScale)
                .tickValues([Math.floor(this._getMaxBranchLength()/2), Math.floor(this._getMaxBranchLength())])
            );

    }

    _getBranchLengthToRoot(node) {
        // node: a d3.hierarchy node
        return node.path(this.root)
            .reduce((sum, d) => d.data.length?sum+d.data.length:sum, 0);
    }

    _getMaxBranchLength() {
        // the assumption here is that all leaf nodes have the same distance to the root.
        let node = this.leaves[0]; // randomly picks a leaf node
        return this._getBranchLengthToRoot(node);
    }

    _assignPostorder(node){
        // assigns post-order of all leaf nodes
        if(node.children === undefined){
            // base case
            this.postorder.push(node);
            return;
        } else {
            this._assignPostorder(node.children[0]);
            this._assignPostorder(node.children[1]);
            return;
        }
    }

    _setXScale(){
        if ('h' == this.orientation){
            this.xScale = linear()
                .domain([0, this._getMaxBranchLength()])
                .range([0, this.width]);
        } else {
            this._assignPostorder(this.root);
            if (verbose) console.log(this.postorder);
            this.xScale = band()
                .domain(this.postorder.map((d) => d.data.name))
                .range([0, this.width])
                .padding(.05);
        }
    }

    _setYScale(){
        if ('h' == this.orientation){
            this._assignPostorder(this.root);
            if (verbose) console.log(this.postorder);
            this.yScale = band()
                .domain(this.postorder.map((d) => d.data.name))
                .range([0, this.height])
                .padding(.05);
        } else {
            this.yScale = linear()
                .domain([0, this._getMaxBranchLength()])
                .range([0, this.height]);
        }
    }

}

var noop = {value: function() {}};

function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}

function Dispatch(_) {
  this._ = _;
}

function parseTypenames$1(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return {type: t, name: name};
  });
}

Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._,
        T = parseTypenames$1(typename + "", _),
        t,
        i = -1,
        n = T.length;

    // If no callback was specified, return the callback of the given type and name.
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
      return;
    }

    // If a type was specified, set the callback for the given type and name.
    // Otherwise, if a null callback was specified, remove callbacks of the given name.
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set$3(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set$3(_[t], typename.name, null);
    }

    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};

function get$1(type, name) {
  for (var i = 0, n = type.length, c; i < n; ++i) {
    if ((c = type[i]).name === name) {
      return c.value;
    }
  }
}

function set$3(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({name: name, value: callback});
  return type;
}

var frame = 0;
var timeout = 0;
var interval = 0;
var pokeDelay = 1000;
var taskHead;
var taskTail;
var clockLast = 0;
var clockNow = 0;
var clockSkew = 0;
var clock = typeof performance === "object" && performance.now ? performance : Date;
var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}

function clearNow() {
  clockNow = 0;
}

function Timer() {
  this._call =
  this._time =
  this._next = null;
}

Timer.prototype = timer.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function") throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail) taskTail._next = this;
      else taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};

function timer(callback, delay, time) {
  var t = new Timer;
  t.restart(callback, delay, time);
  return t;
}

function timerFlush() {
  now(); // Get the current time, if not already set.
  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
    t = t._next;
  }
  --frame;
}

function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}

function poke() {
  var now = clock.now(), delay = now - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
}

function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time) time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}

function sleep(time) {
  if (frame) return; // Soonest alarm already set, or will be.
  if (timeout) timeout = clearTimeout(timeout);
  var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
  if (delay > 24) {
    if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}

var timeout$1 = function(callback, delay, time) {
  var t = new Timer;
  delay = delay == null ? 0 : +delay;
  t.restart(function(elapsed) {
    t.stop();
    callback(elapsed + delay);
  }, delay, time);
  return t;
};

var emptyOn = dispatch("start", "end", "interrupt");
var emptyTween = [];

var CREATED = 0;
var SCHEDULED = 1;
var STARTING = 2;
var STARTED = 3;
var RUNNING = 4;
var ENDING = 5;
var ENDED = 6;

var schedule = function(node, name, id, index, group, timing) {
  var schedules = node.__transition;
  if (!schedules) node.__transition = {};
  else if (id in schedules) return;
  create$1(node, id, {
    name: name,
    index: index, // For context during callback.
    group: group, // For context during callback.
    on: emptyOn,
    tween: emptyTween,
    time: timing.time,
    delay: timing.delay,
    duration: timing.duration,
    ease: timing.ease,
    timer: null,
    state: CREATED
  });
};

function init(node, id) {
  var schedule = get(node, id);
  if (schedule.state > CREATED) throw new Error("too late; already scheduled");
  return schedule;
}

function set$2(node, id) {
  var schedule = get(node, id);
  if (schedule.state > STARTING) throw new Error("too late; already started");
  return schedule;
}

function get(node, id) {
  var schedule = node.__transition;
  if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
  return schedule;
}

function create$1(node, id, self) {
  var schedules = node.__transition,
      tween;

  // Initialize the self timer when the transition is created.
  // Note the actual delay is not known until the first callback!
  schedules[id] = self;
  self.timer = timer(schedule, 0, self.time);

  function schedule(elapsed) {
    self.state = SCHEDULED;
    self.timer.restart(start, self.delay, self.time);

    // If the elapsed delay is less than our first sleep, start immediately.
    if (self.delay <= elapsed) start(elapsed - self.delay);
  }

  function start(elapsed) {
    var i, j, n, o;

    // If the state is not SCHEDULED, then we previously errored on start.
    if (self.state !== SCHEDULED) return stop();

    for (i in schedules) {
      o = schedules[i];
      if (o.name !== self.name) continue;

      // While this element already has a starting transition during this frame,
      // defer starting an interrupting transition until that transition has a
      // chance to tick (and possibly end); see d3/d3-transition#54!
      if (o.state === STARTED) return timeout$1(start);

      // Interrupt the active transition, if any.
      // Dispatch the interrupt event.
      if (o.state === RUNNING) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("interrupt", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }

      // Cancel any pre-empted transitions. No interrupt event is dispatched
      // because the cancelled transitions never started. Note that this also
      // removes this transition from the pending list!
      else if (+i < id) {
        o.state = ENDED;
        o.timer.stop();
        delete schedules[i];
      }
    }

    // Defer the first tick to end of the current frame; see d3/d3#1576.
    // Note the transition may be canceled after start and before the first tick!
    // Note this must be scheduled before the start event; see d3/d3-transition#16!
    // Assuming this is successful, subsequent callbacks go straight to tick.
    timeout$1(function() {
      if (self.state === STARTED) {
        self.state = RUNNING;
        self.timer.restart(tick, self.delay, self.time);
        tick(elapsed);
      }
    });

    // Dispatch the start event.
    // Note this must be done before the tween are initialized.
    self.state = STARTING;
    self.on.call("start", node, node.__data__, self.index, self.group);
    if (self.state !== STARTING) return; // interrupted
    self.state = STARTED;

    // Initialize the tween, deleting null tween.
    tween = new Array(n = self.tween.length);
    for (i = 0, j = -1; i < n; ++i) {
      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
        tween[++j] = o;
      }
    }
    tween.length = j + 1;
  }

  function tick(elapsed) {
    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
        i = -1,
        n = tween.length;

    while (++i < n) {
      tween[i].call(null, t);
    }

    // Dispatch the end event.
    if (self.state === ENDING) {
      self.on.call("end", node, node.__data__, self.index, self.group);
      stop();
    }
  }

  function stop() {
    self.state = ENDED;
    self.timer.stop();
    delete schedules[id];
    for (var i in schedules) return; // eslint-disable-line no-unused-vars
    delete node.__transition;
  }
}

var interrupt = function(node, name) {
  var schedules = node.__transition,
      schedule$$1,
      active,
      empty = true,
      i;

  if (!schedules) return;

  name = name == null ? null : name + "";

  for (i in schedules) {
    if ((schedule$$1 = schedules[i]).name !== name) { empty = false; continue; }
    active = schedule$$1.state > STARTING && schedule$$1.state < ENDING;
    schedule$$1.state = ENDED;
    schedule$$1.timer.stop();
    if (active) schedule$$1.on.call("interrupt", node, node.__data__, schedule$$1.index, schedule$$1.group);
    delete schedules[i];
  }

  if (empty) delete node.__transition;
};

var selection_interrupt = function(name) {
  return this.each(function() {
    interrupt(this, name);
  });
};

function tweenRemove(id, name) {
  var tween0, tween1;
  return function() {
    var schedule$$1 = set$2(this, id),
        tween = schedule$$1.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = tween0 = tween;
      for (var i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1 = tween1.slice();
          tween1.splice(i, 1);
          break;
        }
      }
    }

    schedule$$1.tween = tween1;
  };
}

function tweenFunction(id, name, value) {
  var tween0, tween1;
  if (typeof value !== "function") throw new Error;
  return function() {
    var schedule$$1 = set$2(this, id),
        tween = schedule$$1.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = (tween0 = tween).slice();
      for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1[i] = t;
          break;
        }
      }
      if (i === n) tween1.push(t);
    }

    schedule$$1.tween = tween1;
  };
}

var transition_tween = function(name, value) {
  var id = this._id;

  name += "";

  if (arguments.length < 2) {
    var tween = get(this.node(), id).tween;
    for (var i = 0, n = tween.length, t; i < n; ++i) {
      if ((t = tween[i]).name === name) {
        return t.value;
      }
    }
    return null;
  }

  return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
};

function tweenValue(transition, name, value) {
  var id = transition._id;

  transition.each(function() {
    var schedule$$1 = set$2(this, id);
    (schedule$$1.value || (schedule$$1.value = {}))[name] = value.apply(this, arguments);
  });

  return function(node) {
    return get(node, id).value[name];
  };
}

var interpolate = function(a, b) {
  var c;
  return (typeof b === "number" ? interpolateNumber
      : b instanceof color ? interpolateRgb
      : (c = color(b)) ? (b = c, interpolateRgb)
      : interpolateString)(a, b);
};

function attrRemove$1(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS$1(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant$1(name, interpolate$$1, value1) {
  var value00,
      interpolate0;
  return function() {
    var value0 = this.getAttribute(name);
    return value0 === value1 ? null
        : value0 === value00 ? interpolate0
        : interpolate0 = interpolate$$1(value00 = value0, value1);
  };
}

function attrConstantNS$1(fullname, interpolate$$1, value1) {
  var value00,
      interpolate0;
  return function() {
    var value0 = this.getAttributeNS(fullname.space, fullname.local);
    return value0 === value1 ? null
        : value0 === value00 ? interpolate0
        : interpolate0 = interpolate$$1(value00 = value0, value1);
  };
}

function attrFunction$1(name, interpolate$$1, value) {
  var value00,
      value10,
      interpolate0;
  return function() {
    var value0, value1 = value(this);
    if (value1 == null) return void this.removeAttribute(name);
    value0 = this.getAttribute(name);
    return value0 === value1 ? null
        : value0 === value00 && value1 === value10 ? interpolate0
        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
  };
}

function attrFunctionNS$1(fullname, interpolate$$1, value) {
  var value00,
      value10,
      interpolate0;
  return function() {
    var value0, value1 = value(this);
    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
    value0 = this.getAttributeNS(fullname.space, fullname.local);
    return value0 === value1 ? null
        : value0 === value00 && value1 === value10 ? interpolate0
        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
  };
}

var transition_attr = function(name, value) {
  var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
  return this.attrTween(name, typeof value === "function"
      ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value))
      : value == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname)
      : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value + ""));
};

function attrTweenNS(fullname, value) {
  function tween() {
    var node = this, i = value.apply(node, arguments);
    return i && function(t) {
      node.setAttributeNS(fullname.space, fullname.local, i(t));
    };
  }
  tween._value = value;
  return tween;
}

function attrTween(name, value) {
  function tween() {
    var node = this, i = value.apply(node, arguments);
    return i && function(t) {
      node.setAttribute(name, i(t));
    };
  }
  tween._value = value;
  return tween;
}

var transition_attrTween = function(name, value) {
  var key = "attr." + name;
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  var fullname = namespace(name);
  return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
};

function delayFunction(id, value) {
  return function() {
    init(this, id).delay = +value.apply(this, arguments);
  };
}

function delayConstant(id, value) {
  return value = +value, function() {
    init(this, id).delay = value;
  };
}

var transition_delay = function(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? delayFunction
          : delayConstant)(id, value))
      : get(this.node(), id).delay;
};

function durationFunction(id, value) {
  return function() {
    set$2(this, id).duration = +value.apply(this, arguments);
  };
}

function durationConstant(id, value) {
  return value = +value, function() {
    set$2(this, id).duration = value;
  };
}

var transition_duration = function(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? durationFunction
          : durationConstant)(id, value))
      : get(this.node(), id).duration;
};

function easeConstant(id, value) {
  if (typeof value !== "function") throw new Error;
  return function() {
    set$2(this, id).ease = value;
  };
}

var transition_ease = function(value) {
  var id = this._id;

  return arguments.length
      ? this.each(easeConstant(id, value))
      : get(this.node(), id).ease;
};

var transition_filter = function(match) {
  if (typeof match !== "function") match = matcher$1(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Transition(subgroups, this._parents, this._name, this._id);
};

var transition_merge = function(transition$$1) {
  if (transition$$1._id !== this._id) throw new Error;

  for (var groups0 = this._groups, groups1 = transition$$1._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Transition(merges, this._parents, this._name, this._id);
};

function start(name) {
  return (name + "").trim().split(/^|\s+/).every(function(t) {
    var i = t.indexOf(".");
    if (i >= 0) t = t.slice(0, i);
    return !t || t === "start";
  });
}

function onFunction(id, name, listener) {
  var on0, on1, sit = start(name) ? init : set$2;
  return function() {
    var schedule$$1 = sit(this, id),
        on = schedule$$1.on;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

    schedule$$1.on = on1;
  };
}

var transition_on = function(name, listener) {
  var id = this._id;

  return arguments.length < 2
      ? get(this.node(), id).on.on(name)
      : this.each(onFunction(id, name, listener));
};

function removeFunction(id) {
  return function() {
    var parent = this.parentNode;
    for (var i in this.__transition) if (+i !== id) return;
    if (parent) parent.removeChild(this);
  };
}

var transition_remove = function() {
  return this.on("end.remove", removeFunction(this._id));
};

var transition_select = function(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
        schedule(subgroup[i], name, id, i, subgroup, get(node, id));
      }
    }
  }

  return new Transition(subgroups, this._parents, name, id);
};

var transition_selectAll = function(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) {
          if (child = children[k]) {
            schedule(child, name, id, k, children, inherit);
          }
        }
        subgroups.push(children);
        parents.push(node);
      }
    }
  }

  return new Transition(subgroups, parents, name, id);
};

var Selection$1 = selection.prototype.constructor;

var transition_selection = function() {
  return new Selection$1(this._groups, this._parents);
};

function styleRemove$1(name, interpolate$$1) {
  var value00,
      value10,
      interpolate0;
  return function() {
    var value0 = styleValue(this, name),
        value1 = (this.style.removeProperty(name), styleValue(this, name));
    return value0 === value1 ? null
        : value0 === value00 && value1 === value10 ? interpolate0
        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
  };
}

function styleRemoveEnd(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant$1(name, interpolate$$1, value1) {
  var value00,
      interpolate0;
  return function() {
    var value0 = styleValue(this, name);
    return value0 === value1 ? null
        : value0 === value00 ? interpolate0
        : interpolate0 = interpolate$$1(value00 = value0, value1);
  };
}

function styleFunction$1(name, interpolate$$1, value) {
  var value00,
      value10,
      interpolate0;
  return function() {
    var value0 = styleValue(this, name),
        value1 = value(this);
    if (value1 == null) value1 = (this.style.removeProperty(name), styleValue(this, name));
    return value0 === value1 ? null
        : value0 === value00 && value1 === value10 ? interpolate0
        : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
  };
}

var transition_style = function(name, value, priority) {
  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
  return value == null ? this
          .styleTween(name, styleRemove$1(name, i))
          .on("end.style." + name, styleRemoveEnd(name))
      : this.styleTween(name, typeof value === "function"
          ? styleFunction$1(name, i, tweenValue(this, "style." + name, value))
          : styleConstant$1(name, i, value + ""), priority);
};

function styleTween(name, value, priority) {
  function tween() {
    var node = this, i = value.apply(node, arguments);
    return i && function(t) {
      node.style.setProperty(name, i(t), priority);
    };
  }
  tween._value = value;
  return tween;
}

var transition_styleTween = function(name, value, priority) {
  var key = "style." + (name += "");
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
};

function textConstant$1(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction$1(value) {
  return function() {
    var value1 = value(this);
    this.textContent = value1 == null ? "" : value1;
  };
}

var transition_text = function(value) {
  return this.tween("text", typeof value === "function"
      ? textFunction$1(tweenValue(this, "text", value))
      : textConstant$1(value == null ? "" : value + ""));
};

var transition_transition = function() {
  var name = this._name,
      id0 = this._id,
      id1 = newId();

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        var inherit = get(node, id0);
        schedule(node, name, id1, i, group, {
          time: inherit.time + inherit.delay + inherit.duration,
          delay: 0,
          duration: inherit.duration,
          ease: inherit.ease
        });
      }
    }
  }

  return new Transition(groups, this._parents, name, id1);
};

var id = 0;

function Transition(groups, parents, name, id) {
  this._groups = groups;
  this._parents = parents;
  this._name = name;
  this._id = id;
}

function transition(name) {
  return selection().transition(name);
}

function newId() {
  return ++id;
}

var selection_prototype = selection.prototype;

Transition.prototype = transition.prototype = {
  constructor: Transition,
  select: transition_select,
  selectAll: transition_selectAll,
  filter: transition_filter,
  merge: transition_merge,
  selection: transition_selection,
  transition: transition_transition,
  call: selection_prototype.call,
  nodes: selection_prototype.nodes,
  node: selection_prototype.node,
  size: selection_prototype.size,
  empty: selection_prototype.empty,
  each: selection_prototype.each,
  on: transition_on,
  attr: transition_attr,
  attrTween: transition_attrTween,
  style: transition_style,
  styleTween: transition_styleTween,
  text: transition_text,
  remove: transition_remove,
  tween: transition_tween,
  delay: transition_delay,
  duration: transition_duration,
  ease: transition_ease
};

function cubicInOut(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

var defaultTiming = {
  time: null, // Set on use.
  delay: 0,
  duration: 250,
  ease: cubicInOut
};

function inherit(node, id) {
  var timing;
  while (!(timing = node.__transition) || !(timing = timing[id])) {
    if (!(node = node.parentNode)) {
      return defaultTiming.time = now(), defaultTiming;
    }
  }
  return timing;
}

var selection_transition = function(name) {
  var id,
      timing;

  if (name instanceof Transition) {
    id = name._id, name = name._name;
  } else {
    id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
  }

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        schedule(node, name, id, i, group, timing || inherit(node, id));
      }
    }
  }

  return new Transition(groups, this._parents, name, id);
};

selection.prototype.interrupt = selection_interrupt;
selection.prototype.transition = selection_transition;

class Heatmap {
    /* data is a json with the following attributes:
        x: the x label
        y: the y label
        value: the rendered numerical value (transformed)
        originalValue: the original numerical value
     */

    /**
     * constructor
     * @param data {Object}, see above
     * @param useLog {Boolean} performs log transformation
     * @param colorScheme {String}: recognized terms in Colors:getColorInterpolator
     */
    constructor(data, useLog=true, colorScheme="YlGnBu", r=2){
        this.data = data;
        this.useLog = useLog;
        this.nullColor = "#e6e6e6";
        this.colorScale = undefined;
        this.xList = undefined;
        this.yList = undefined;
        this.xScale = undefined;
        this.yScale = undefined;
        this.r = r;
        this.colorScheme = colorScheme;
    }

    /**
     * redraws the heatmap: when the xlist and ylist are changed, redraw the heatmap
     * @param dom {Selection} a d3 selection object
     * @param xList {List} a list of x labels
     * @param yList {List} a list of y labels
     * @param dimensions {Dictionary} {w:Integer, h:integer} with two attributes: w and h
     * @param angle {Integer} for the y text labels
     */
    redraw(dom, xList, yList, dimensions={w:1000, h:1000}, angle=30){
        this._setXList(dimensions.w, xList);
        this._setYList(dimensions.h, yList);
        this.draw(dom, dimensions, angle);
    }

    /**
     * draw color legend for the heat map
     * @param dom {Selection} a d3 selection object
     * @param legendConfig {Object} with attr: x, y
     */

    drawColorLegend(dom, legendConfig={x:0, y:0}, ticks=10){
        drawColorLegend(this.data[0].unit||"Value", dom, this.colorScale, legendConfig, this.useLog, ticks);
    }
    /**
     * draws the heatmap
     * @param dom {Selection}
     * @param dimensions {Dictionary} {w:Integer, h:integer} of the heatmap
     * @param angle {Integer} for the y text labels
     * @param useNullColor {Boolean} whether to render null values with the pre-defined null color
     */

    draw(dom, dimensions={w:1000, h:600}, angle=30, useNullColor=true){
        if (this.xList === undefined) this._setXList(dimensions.w);
        if (this.yList === undefined) this._setYList(dimensions.h);
        if (this.colorScale === undefined) this.colorScale = setColorScale(this.data.map((d)=>d.value), this.colorScheme);

        // text labels
        // data join
        const xLabels = dom.selectAll(".exp-map-xlabel")
            .data(this.xList);

        // update old elements
        xLabels.attr("transform", (d) => {
                let x = this.xScale(d)+(this.xScale.bandwidth()/2) + 1;
                let y = this.yScale.range()[1] + 17;
                return `translate(${x}, ${y}) rotate(${angle})`;
            });
            // .attr("class", (d, i) => `exp-map-xlabel x${i}`);


        // enters new elements
        xLabels.enter().append("text")
            .attr("class", (d, i) => `exp-map-xlabel x${i}`)
            .attr("x", 0)
            .attr("y", 0)
            .style("cursor", "pointer")
            .style("text-anchor", "start")
            .attr("transform", (d) => {
                let x = this.xScale(d)+(this.xScale.bandwidth()/2) + 1;
                let y = this.yScale.range()[1] + 17;
                return `translate(${x}, ${y}) rotate(${angle})`;
            })
            .merge(xLabels)
            .text((d) => d);

        // exit -- removes old elements as needed
        xLabels.exit().remove();

        const yLabels = dom.selectAll(".exp-map-ylabel")
            .data(this.yList)
            .enter().append("text")
            .text((d) => d)
            .attr("x", this.xScale.range()[1] + 5)
            .attr("y", (d) => this.yScale(d) + 10)
            .attr("class", (d, i) => `exp-map-ylabel y${i}`)
            .style("cursor", "pointer")
            .style("text-anchor", "start")
            .on('click', (d) => {
                alert(`${d} is clicked. To be implemented`);
            })
            .on('mouseover', function(d){
                select(this)
                    .classed('normal', false)
                    .classed('highlighted', true);
            })
            .on('mouseout', function(d){
                select(this)
                    .classed('normal', true)
                    .classed('highlighted', false);
            });

        // renders the heatmap cells

        // data join
        const cells = dom.selectAll(".exp-map-cell")
            .data(this.data, (d) => d.value);

        // update old elements
        cells.attr("x", (d) => this.xScale(d.x))
            .attr("y", (d) => this.yScale(d.y))
            .attr("row", (d) => `x${this.xList.indexOf(d.x)}`)
            .attr("col", (d) => `y${this.yList.indexOf(d.y)}`);

        // enter new elements
        const nullColor = "#DDDDDD";
        const self = this;
        cells.enter().append("rect")
            .attr("row", (d) => `x${this.xList.indexOf(d.x)}`)
            .attr("col", (d) => `y${this.yList.indexOf(d.y)}`)

            .attr("x", (d) => this.xScale(d.x))
            .attr("y", (d) => this.yScale(d.y))
            .attr("rx", this.r)
            .attr('ry', this.r)
            .attr("class", (d) => `exp-map-cell`)
            .attr("width", this.xScale.bandwidth())
            .attr("height", this.yScale.bandwidth())
            .style("fill", (d) => "#eeeeee")
            .on("mouseover", function(d){
                const selected = select(this); // Note: "this" here refers to the dom element not the object
                self.cellMouseover(selected);
            })
            .on("mouseout", function(d){
                const selected = select(this); // Note: "this" here refers to the dom element not the object
                self.cellMouseout();
            })
            .merge(cells)
            // .transition()
            // .duration(2000)
            .style("fill", (d) => useNullColor&&d.originalValue==0?nullColor:this.colorScale(d.value)); // TODO: what if null value isn't 0?

        // exit and remove
        cells.exit().remove();
    }

    cellMouseout(d){
        selectAll("*").classed('highlighted', false);
    }

    cellMouseover (selected) {
        const rowClass = selected.attr("row");
        const colClass = selected.attr("col");
        selectAll(".exp-map-xlabel").filter(`.${rowClass}`)
            .classed('highlighted', true);
        selectAll(".exp-map-ylabel").filter(`.${colClass}`)
            .classed('highlighted', true);
        selected.classed('highlighted', true);
    }

    _setXList(width, newList) {
        if(newList !== undefined){
            this.xList = newList;
        }
        else {
            this.xList = nest()
                .key((d) => d.x)
                .entries(this.data)
                .map((d) => d.key);
        }

        this.xScale = band()
            .domain(this.xList)
            .range([0, width])
            .padding(.05); // TODO: eliminate hard-coded value
    }

    _setYList(height, newList) {
        if(newList !== undefined){
            this.yList = newList;
        }
        else {
           this.yList = nest()
            .key((d) => d.y)
            .entries(this.data)
            .map((d) => d.key);
        }
        this.yScale = band()
                .domain(this.yList)
                .range([0, height])
                .padding(.05); // TODO: eliminate hard-coded value
    }


}

class Tooltip {
    constructor(id, verbose=false, offsetX=30, offsetY=-40, duration=500){
        this.id = id;
        this.verbose = verbose;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.duration = duration;
    }

    show(info) {
        if(this.verbose) console.log(info);
        this.edit(info);
        this.move();
        select("#" + this.id)
            .style("display", "inline")
            .transition()
            .duration(this.duration)
            .style("opacity", 1.0);

    }

    hide() {
        select("#" + this.id)
            .transition()
            .duration(this.duration)
            .style("opacity", 0.0);
        this.edit("");
    }

    move(x = event.pageX, y = event.pageY) {
        if (this.verbose) {
            console.log(x);
            console.log(y);
        }
        x = x + this.offsetX; // TODO: get rid of the hard-coded adjustment
        y = (y + this.offsetY)<0?10:y+this.offsetY;
        const t = select('#'+this.id)
            .style("left", `${x}px`)
            .style("top", `${y}px`);
    }

    edit(info) {
        select("#" + this.id)
            .html(info);
    }
}

class DendroHeatmap {

    /**
     * Constructor
     * @param columnTree {String} a newick tree
     * @param rowTree {String} a newick tree
     * @param heatmapData {List} of objects with attributes: x: String, y:String, value:Float, originalValue:Float
     * @param color {String} a color name that's available in Colors.getColorInterpolator
     * @param r {Integer} the degrees of rounded-corners of the heatmap cells
     * @param config {DendroHeatmapConfig}
     * @param useLog {Boolean}
     */
    constructor(columnTree, rowTree, heatmapData, color="YlGnBu", r=2, config=new DendroHeatmapConfig(), useLog=true){
        this.config = config.get();
        //input evaluations
        columnTree = columnTree===undefined||columnTree.startsWith("Not enough data")?undefined:columnTree;
        rowTree = rowTree===undefined||rowTree.startsWith("Not enough data")?undefined:rowTree;
        // assign attribute values based on input arguments
        this.data = {
            columnTree: columnTree,
            rowTree: rowTree,
            heatmap: heatmapData,
            external: undefined
        };
        this.objects = {
            columnTree: this.data.columnTree===undefined? undefined:new Dendrogram(this.data.columnTree, "v"),
            rowTree: this.data.rowTree===undefined?undefined:new Dendrogram(this.data.rowTree, "h"),
            heatmap: new Heatmap(this.data.heatmap, useLog, color, r)
        };
        this.visualComponents = {
            tooltip: new Tooltip("tooltip", false), // TODO: remove hard-coded tooltip DOM ID
            svg: undefined,
            columnTree: undefined,
            rowTree: undefined
        };
    }

    /**
     * Render the dendrograms and corresponding heatmap
     * @param domId {String} the DOM id of the SVG
     * @param showColumnTree {Boolean} render the column dendrogram
     * @param showRowTree {Boolean} render the row dendrogram
     * @param legendPos {Enum} where to place the color legend: bottom, top
     * @param ticks {Integer} number of bins of the color legend
     */
    render(domId, showColumnTree=true, showRowTree=true, legendPos="bottom", ticks=10){
        this._updateConfig(legendPos);
        this.visualComponents.svg = createSvg(domId, this.config.w, this.config.h, this.config.margin);

        let xlist = undefined,
            ylist = undefined;

        if (showColumnTree && this.objects.columnTree!==undefined){
            this.visualComponents.columnTree = this._renderTree(this.objects.columnTree, this.config.panels.top);
            xlist = this.objects.columnTree.xScale.domain();
        }
        if (showRowTree && this.objects.rowTree !== undefined){
            this.visualComponents.rowTree = this._renderTree(this.objects.rowTree, this.config.panels.left);
            ylist = this.objects.rowTree.yScale.domain();
        }

        this._renderHeatmap(this.objects.heatmap, xlist, ylist, ticks);
    }

    /**
     * renders a newick tree
     * @param tree {Dendrogram} a Dendrogram object
     * @param config {Object} a panel config with attributes: x, y, width and height
     * @private
     */
    _renderTree(tree, config){
        let dom = this.visualComponents.svg;
        const tooltip = this.visualComponents.tooltip;
        const g = dom.append("g")
            .attr("id", config.id)
            .attr("transform", `translate(${config.x}, ${config.y})`);
        tree.draw(g, config.w, config.h);

        // customized mouse events
        const mouseover = function(d){
            select(this)
                .attr("r", 6)
                .attr("fill", "red");
            const leaves = d.leaves().map((node)=>node.data.name);
            tooltip.show(`${leaves.join("<br>")}`);
        };
        const mouseout = function(d){
            select(this)
                .attr("r", 2)
                .attr("fill", "#333");
            tooltip.hide();
        };
        g.selectAll(".dendrogram-node")
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);
        return g;
    }

    /**
     * renders the heatmap and color legend
     * @param heatmap {Heatmap} a Heatmap object
     * @param xList {List} a list of x labels
     * @param yList {List} a list of y labels
     * @param ticks {Integer} the number of bins in the color legend
     * @private
     */
    _renderHeatmap(heatmap, xList, yList, ticks=10){
        let dom = this.visualComponents.svg;
        const config = this.config.panels.main;
        const g = dom.append("g")
            .attr("id", config.id)
            .attr("transform", `translate(${config.x}, ${config.y})`);
        heatmap.redraw(g, xList, yList, {w: config.w, h: config.h});
        heatmap.drawColorLegend(dom, this.config.panels.legend, ticks);
    }



    /**
     * adjusts the layout dimensions based on the actual data
     * @param legendPos {String} bottom or top
     * @private
     */
    _updateConfig(legendPos){
        const rows = this.objects.rowTree===undefined?1:this.objects.rowTree.leaves.length;

        // updates the left panel's height based on the data
        this.config.panels.left.h = this.config.cell.h * rows<20?20:this.config.cell.h * rows;
        if(legendPos=="bottom") this.config.panels.legend.y += this.config.panels.left.h;
        this.config.h += this.config.panels.left.h;
        this.config.panels.main.h = this.config.panels.left.h;

    }
}

"use strict";
/**
 * Mayo demo
 * @param domId
 * @param toolbarId
 * @param urls
 */
function renderMayo(domId, toolbarId, urls=getGtexUrls()){
    // - gets static data
    const tissueTree = getTissueClusters('top50Cerebellum_AD'),
          geneTree = getGeneClusters('top50Cerebellum_AD');
    Promise.all([json(urls.tissue), tsv(urls.mayoGeneExp)])
        .then(function(args){
            const tissues = parseTissues(args[0]);
            const expression = parseMedianTPM(args[1], true);
            const dmap = new DendroHeatmap(tissueTree, geneTree, expression);
            dmap.render(domId);
            // customization for GTEx
            const tissueDict = tissues.reduce((a, d)=>{
                if(!d.hasOwnProperty("tissueId")) throw "tissue has no attr tissue_id";
                a[d.tissueId] = d;
                return a;
            }, {});
            const geneDict = dmap.data.heatmap.reduce((a, d, i)=>{
                if (!d.hasOwnProperty("gencodeId")) throw "gene has no attr gencodeId";
                a[d.gencodeId]=d;
                return a;
            }, {});
            _customizeLabels(dmap, tissueDict, geneDict);
            _addTissueColors(dmap, tissueDict);
            _customizeMouseEvents(dmap, tissueDict, geneDict);
            _createToolbar(domId, toolbarId, undefined, dmap, tissueDict, [], urls);
            $('#spinner').hide(); // TODO: remove hard-coded dom ID
        })
        .catch(function(err){throw err});
}

function reset(ids){
    ids.forEach((d)=>{$(`#${d}`).empty();});
}

/**
 * Create the tissue (dataset) dropdown menu using select2
 * @param domId {String} the dom ID of the menu
 * @param urls {Object} of web service urls with attr: tissue
 */
function createDatasetMenu(domId, urls = getGtexUrls()){
    json(urls.tissue)
        .then(function(results){
            let tissues = parseTissues(results);
            tissues.forEach((d) => {
                d.id = d.tissueId;
                d.text = d.tissueName;
            });
            tissues.sort((a, b) => {
                if(a.tissueName < b.tissueName) return -1;
                if(a.tissueName > b.tissueName) return 1;
                return 0;
            });

            // external library dependency: select2
            $(`#${domId}`).select2({
                placeholder: 'Select a data set',
                data: tissues
            });

        })
        .catch(function(err){console.error(err);});

}

/**
 * Render top expressed genes in a given tissue
 * @param tissueId
 * @param domId {String} the dendroheatmap's DIV ID
 * @param toolbarId {String} the tool bar DOM ID
 * @param infoId {String} the message box DOM ID
 * @param urls {Dictionary} of GTEx web services urls
 * @param useFilters {Boolean} if the filter is applied, and if undefined, it means no filter
 */
function renderTopExpressed(tissueId, domId, toolbarId, infoId, urls=getGtexUrls(), useFilters=true){
    // getting data
    const url = useFilters?urls.topInTissueFiltered:urls.topInTissue;
    json(url+ tissueId)
        .then(function(results){ // top 50 expressed genes in tissueId
            const topGeneList = results.topExpressedGene.map(d=>d.gencodeId);
            const callback = function(){
                _styleSelectedTissue(tissueId);
            };
            searchById(topGeneList, [tissueId], domId, toolbarId, infoId, urls, useFilters, callback);
        })
        .catch(function(err){
            console.error(err);
        });
}

/**
 * Search gene expression by gene IDs and tissue IDs
 * @param glist {List} of gencode IDs or gene IDs
 * @param tlist {List} of tissue IDs: to search by tissue IDs is not yet implemented
 * @param domId {String} the DIV ID of the svg
 * @param infoId {String} the DOM ID of the message info box
 * @param toolbarId {String} the DOM ID of the toolbar
 * @param urls {Object} of web service urls with attr: tissue, geneId, medExpById
 * @param useFilters {Boolean} indicating whether gene filter is applied, or use undefined for no filtering
 * @returns {*}
 */
function searchById(glist, tlist, domId, toolbarId, infoId, urls = getGtexUrls(), useFilters=undefined, callback=undefined){
    reset([domId, toolbarId, infoId, "boxplot"]);
    $('#spinner').show();
    if (select(`#${domId}`).empty()) throw `Fatal Error: DOM element with id ${domId} does not exist;`;
    let message = "";

    Promise.all([json(urls.tissue), json(urls.geneId+glist.join(","))])
        .then(function(args){
             const tissues = parseTissues(args[0]),
                max = 50;

             const attr = "geneId";
            if (!args[1].hasOwnProperty(attr)) throw "gene web service parsing error";
            let geneObjects = args[1][attr];
            if (geneObjects.length == 0) {
                // validate if gene list is empty
                message = "Fatal Error: the gene list is empty.<br/>";
            } else {
                // more input validation
                if (geneObjects.length < glist.length) { // validate if all input genes are found
                    const allIds = [];
                    geneObjects.forEach((d)=>{
                        allIds.push(d.gencodeId);
                        allIds.push(d.geneSymbolUpper);
                        allIds.push(d.ensemblId);
                    }); // gather all IDs in retrieved geneObjects
                    const missingGenes = glist.filter((d) => !allIds.includes(d));

                    message = `Warning: Not all genes are found: ${missingGenes.join(",")}<br/>`;
                }
                if (geneObjects.length > max) { // validate if the number of input genes exceeds the maximum
                    //language=HTML
                    message += `Warning: Too many genes. Input list truncated to the first ${max}.<br/>`;
                    geneObjects = geneObjects.slice(0, max); // slice the input gene list to the maximum allowed entries
                }

                // visualization rendering
                // get all median express data of these genes in all tissues
                const gencodeIds = geneObjects.map((d) => d.gencodeId);
                json(urls.medExpById + gencodeIds.join(","))
                    .then(function(eData) {
                        const tissueTree = eData.clusters.tissue,
                            geneTree = eData.clusters.gene,
                            expression = parseMedianExpression(eData),
                            dmap = new DendroHeatmap(tissueTree, geneTree, expression);


                        if (gencodeIds.length < 3) {
                            dmap.render(domId, true, false);
                        } else {
                            dmap.render(domId);
                        }

                        $('#spinner').hide();
                        // customization for GTEx
                        const tissueDict = tissues.reduce((a, d)=>{
                            if (!d.hasOwnProperty("tissueId")) throw "tissue has not attr tissue_id";
                            a[d.tissueId] = d;
                            return a;
                        }, {});
                        const geneDict = dmap.data.heatmap.reduce((a, d, i)=>{
                            if (!d.hasOwnProperty("gencodeId")) throw "gene has no attr gencodeId";
                            a[d.gencodeId]=d;
                            return a;
                        }, {});
                        _customizeLabels(dmap, tissueDict, geneDict);
                        _addTissueColors(dmap, tissueDict);
                        _customizeMouseEvents(dmap, tissueDict, geneDict);
                        _createToolbar(domId, toolbarId, infoId, dmap, tissueDict, tlist, urls, useFilters);
                        if(useFilters !== undefined){
                            message += useFilters?"Mitochondrial genes are excluded.":"Mitochondrial genes are included";
                        }
                        $(`#${infoId}`).html(message);

                        if(callback !== undefined) callback();

                    })
                    .catch(function(err){console.error(err);});
            }

        })
        .catch(function(err){throw err});
}


/**
 * For top expressed query, highlight the query tissue label
 * @param tissueId {String} the tissue ID
 * Dependencies: expressMap.css
 */
function _styleSelectedTissue(tissueId){
    selectAll(".exp-map-xlabel").filter((d)=>d==tissueId)
        .classed("query", true);
}

/**
 * Customizes the GTEx gene expression heatmap labels
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} of GTEx tissue objects indexed by tissue ID
 * @param geneDict {Dictionary} of GTEx genes indexed by gencode ID
 */
function _customizeLabels(dmap, tissueDict, geneDict){
    /***** Change row labels to tissue names *****/
    select("#" + dmap.config.panels.main.id).selectAll(".exp-map-xlabel")
        .text((d) => tissueDict[d]===undefined?d:tissueDict[d].tissueName);

    /***** Change column labels to gene symbols *****/
    select("#" + dmap.config.panels.main.id).selectAll(".exp-map-ylabel")
        .text((d) => geneDict[d]===undefined?d:geneDict[d].geneSymbol);
}

/**
 * Adds GTEx tissue colors to the tissue labels (column names)
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} of GTEx tissue objects indexed by tissue_id
 */
function _addTissueColors(dmap, tissueDict){

    const id = dmap.config.panels.main.id;
    const heatmap = dmap.objects.heatmap;
    let dots = select("#"+id).selectAll(".exp-map-xcolor").data(heatmap.xList);

     // updates old elements
    dots.attr("fill", (d) => tissueDict[d]===undefined?"#000000":`#${tissueDict[d].colorHex}`);

    // enters new elements
    dots.enter().append("circle")
        .attr('cx', (d) => heatmap.xScale(d) + heatmap.xScale.bandwidth()/2)
        .attr('cy', heatmap.yScale.range()[1] + 10)
        .attr("r", 3)
        .attr("fill", (d) => tissueDict[d] === undefined? "#000000":`#${tissueDict[d].colorHex}`)
        .attr("opacity", 0.75)
        .attr("class", "exp-map-xcolor");

    // removes retired elements
    dots.exit().remove();
}

/**
 * Customize the dendropHeatmap mouse events
 * dependencies: CSS classes from expressMap.css
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary}: tissue objects indexed by tissue_id, with attr: tissue_name
 * @param geneDict {Dictionary}: gene objects indexed by gencode ID, with attr: geneSymbol
 */
function _customizeMouseEvents(dmap, tissueDict, geneDict) {
    const svg = dmap.visualComponents.svg;
    const tooltip = dmap.visualComponents.tooltip;

    const cellMouseover = function(d) {
        const selected = select(this);
        dmap.objects.heatmap.cellMouseover(selected); // call the default heatmap mouse over event first
        let tissue = tissueDict[d.x]===undefined?d.x:tissueDict[d.x].tissueName;
        let gene = geneDict[d.y]===undefined?d.y:geneDict[d.y].geneSymbol;

        // tooltip.show(
        //     `<table>
        //         <tr><td>Tissue</td><td>${tissue}</td></tr>
        //         <tr><td>Gene</td><td>${gene}</td></tr>
        //         <tr><td>Median ${d.unit?d.unit:"TPM"}</td><td>${parseFloat(d.originalValue.toExponential()).toPrecision(4)}</td></tr>
        //     </table>`
        // );
        tooltip.show(`Tissue: ${tissue}<br/> Gene: ${gene}<br/> Median TPM: ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`);

    };

    const cellMouseout = function(d){
        svg.selectAll("*").classed('highlighted', false);
        tooltip.hide();
    };

    // gene boxplot prep: assign a colorIndex to each gene
    const colors = colorChart();
    keys(geneDict).forEach((d, i)=>{geneDict[d].color = colors[i];});
    const ylabelClick = function(d){
        let s = select(this);
        let action = "";
        if (event.altKey) { // if alt key is pressed -- i.e. adding an additional gene to boxplot
            // highlights the selected label
            if(!s.classed("clicked")) s.classed("clicked", true);
            action = "add";
        }
        else {
            // toggles click/unclick events
            // if the DOM has the class "clicked", then unclick it
            if (s.classed("clicked")) {
                s.classed("clicked", false);
                action = "delete";
            }
            else {
                // else click it
                selectAll(".clicked").classed("clicked", false); // first clears all clicked labels if any
                s.classed("clicked", true); // click this DOM element
                dmap.data.external = {}; // clears the data storage
                action = "add";
            }
        }
        // console.log(geneDict[d].color); // debugging
        _renderBoxplot(action, d, geneDict, tissueDict, dmap);
    };

    // mouse events of trees -- use closure

    const treeNodeMouseover = function(labelClass){
        return function(d){
            select(this)
                .attr("r", 6)
                .attr("fill", "red");
            const ids = d.leaves().map((node)=>node.data.name);
            // highlight labels
            svg.selectAll(labelClass)
                .filter((label)=>ids.includes(label))
                .classed("highlighted", true);
        }
    };

    const treeNodeMouseout = function(labelClass){
        return function(d){
            select(this)
            .attr("r", 2)
            .attr("fill", "#333");
            svg.selectAll(labelClass).classed("highlighted", false);
        }
    };

    if (dmap.visualComponents.columnTree !== undefined){
         dmap.visualComponents.columnTree.selectAll(".dendrogram-node")
        .on("mouseover", treeNodeMouseover(".exp-map-xlabel"))
        .on("mouseout", treeNodeMouseout(".exp-map-xlabel"));
    }

    if (dmap.visualComponents.rowTree !== undefined){
        dmap.visualComponents.rowTree.selectAll(".dendrogram-node")
        .on("mouseover", treeNodeMouseover(".exp-map-ylabel"))
        .on("mouseout", treeNodeMouseout(".exp-map-ylabel"));
    }

    svg.selectAll(".exp-map-cell")
        .on("mouseover", cellMouseover)
        .on("mouseout", cellMouseout);

    svg.selectAll(".exp-map-ylabel").on("click", ylabelClick);
}

/**
 * renders the gene expression boxplot
 * @param action {ENUM} add, new, or delete
 * @param gene {String} gencode ID
 * @param geneDict {Dictionary} gencode ID => gene object with attribute: index
 * @param tissueDict {Dictionary} tissue objects indexed by tissue ID
 * @param dmap {DendroHeatmap}
 */
function _renderBoxplot(action, gene, geneDict, tissueDict, dmap) {
    // tissueOrder is a list of tissue objects {id:display name} in the same order as the x axis of the heat map.
    let tissueOrder = dmap.objects.heatmap.xScale.domain().map((d, i) => {return {id:d, name:tissueDict[d].tissueName}});
    // get gene expression data
    let data = dmap.data.external;

    // plotly boxplot configurations
    const config = {
        useLog: false,
        id: "boxplot",
    };
    const layout = {
        title: "",
        font: {
            family: 'Open Sans, Helvetica, sans-serif',
            size:11
        },
        yaxis: {
            title: 'TPM',
            zeroline: false,
            tickfont: {
                size: 9
            }
        },
        xaxis: {
            tickfont: {
                size: 9
            },
            tickangle: 30
        },
        boxmode: 'group',
        margin: {
            t:0,
        },
        showlegend: true,

    };

    // action
    switch(action) {
        case "delete": {
            delete data[gene];
            Plotly.newPlot(config.id, values(data), layout);
            if (keys(data).length == 0) {
                select("#" + config.id).style("opacity", 0.0); // makes the boxplot section visible
            } else {
                select("#" + config.id).style("opacity", 1.0); // makes the boxplot section visible
            }
            break;
        }
        case "add": {
            const url = getGtexUrls().geneExp + gene;
            json(url)
                .then(function (d) {
                    let color = geneDict[gene].color || "black";
                    data[gene] = makeJsonForPlotly(gene, d, config.useLog, color, tissueOrder);
                    Plotly.newPlot(config.id, values(data), layout);
                    select("#" + config.id).style("opacity", 1.0); // makes the boxplot section visible
                })
                .catch(function(err){console.error(err);});
            break;
        }
        default: {
            console.warn("action not understood.");
            break;
        }
    }
}

/**
 * create the toolbar
 * @param domId {String} the dendropheatmap's DIV ID
 * @param barId {String} the toolbar DOM ID
 * @param infoId {String} the message box DOM ID
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} of tissues indexed by tissue ID
 * @param queryTissues {List} of tissue IDs
 * @param urls {Object} of GTEx web service urls
 * @param useFilter {Boolean} indicating whether gene filter is on or off, and when the value is undefined, it means no filter
 */
function _createToolbar(domId, barId, infoId, dmap, tissueDict, queryTissues, urls=getGtexUrls(), useFilters=undefined){
    // fontawesome reference: http://fontawesome.io/examples/
    // jQuery syntax
    $(`#${barId}`).show();

    let $barDiv = $("<div/>").addClass("btn-group btn-group-sm").appendTo(`#${barId}`);

    if (useFilters !== undefined){ // so far only applicable for topExpressed gene heatmap
        const id0 = "filterOptions";
        let $button0 = $("<a/>").attr("id", id0)
            .addClass("btn btn-default").appendTo($barDiv);
        $("<i/>").addClass("fa fa-filter").appendTo($button0);

        select(`#${id0}`)
        .on("click", function(){
            // toggle the applied filter
            renderTopExpressed(queryTissues[0], domId, barId, infoId, urls, !useFilters);
        })
        .on("mouseover", function(){
            if(useFilters) dmap.visualComponents.tooltip.show("Include Mitochondrial Genes");
            else dmap.visualComponents.tooltip.show("Exclude Mitochondrial Genes");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });
    }

    const id1 = "sortTissues";
    let $button1 = $("<a/>").attr("id", id1)
        .addClass("btn btn-default").appendTo($barDiv);
    $("<i/>").addClass("fa fa-sort-alpha-down").appendTo($button1); // a fontawesome icon

    select(`#${id1}`)
        .on("click", function(){
            // hides the tissue dendrogram
            select("#" + dmap.config.panels.top.id).style("display", "None");
            // sort tissues
            let xlist = dmap.objects.heatmap.xList.sort();
            _sortTissues(xlist, dmap, tissueDict);
        })
        .on("mouseover", function(){
            dmap.visualComponents.tooltip.show("Sort Tissues Alphabetically");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });

    const id2 = "clusterTissues";
    let $button2 = $("<a/>").attr("id", id2)
        .addClass("btn btn-default").appendTo($barDiv);
    $("<i/>").addClass("fa fa-code-branch").appendTo($button2);

    select(`#${id2}`)
        .on("click", function(){
            select("#" + dmap.config.panels.top.id).style("display", "Block");  // shows the tissue dendrogram
            let xlist = dmap.objects.columnTree.xScale.domain();
            _sortTissues(xlist, dmap, tissueDict);
        })
        .on("mouseover", function(){
            dmap.visualComponents.tooltip.show("Cluster Tissues");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });

    const id3 = "expMapDownload";
    let $button3 = $("<a/>").attr("id", id3)
        .addClass("btn btn-default").appendTo($barDiv);
    $("<i/>").addClass("fa fa-save").appendTo($button3);

    select(`#${id3}`)
        .on("click", function(){
            let svgObj = $($($(`${"#" +dmap.config.id} svg`))[0]); // jQuery dependent
            downloadSvg(svgObj, "heatmap.svg", "downloadTempDiv");
        })
        .on("mouseover", function(){
            dmap.visualComponents.tooltip.show("Download Heatmap");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });
}

/**
 * update the heatmap based on the order of the xlist
 * dependencies: CSS classes from expressMap.css
 * @param xlist {Heatmap XList}
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} of tissue objects indexed by tissue ID with attr, tissue_name
 */
function _sortTissues (xlist, dmap, tissueDict){
    // check if there's a query tissue, e.g. top-expressed heatmap
    let qId = undefined;
    const qTissue = select(".exp-map-xlabel.query");
    if (!qTissue.empty()) qId = qTissue.datum();

    // update the heatmap
    const dom = select("#"+dmap.config.panels.main.id);
    const dimensions = dmap.config.panels.main;
    dmap.objects.heatmap.redraw(dom, xlist, dmap.objects.heatmap.yList, dimensions);

    // change the tissue display text to tissue names
    selectAll(".exp-map-xlabel")
        .text((d) => tissueDict[d]===undefined?d:tissueDict[d].tissueName)
        .classed("query", false);
    _addTissueColors(dmap, tissueDict);

    // style the query tissue if found
    if (qId!==undefined) _styleSelectedTissue(qId);

    // hide the boxplot
    select('#boxplot').style("opacity", 0.0);

    // deselect genes
    selectAll(".exp-map-ylabel").classed("clicked", false);
    dmap.data.external = {};

}

exports.renderMayo = renderMayo;
exports.reset = reset;
exports.createDatasetMenu = createDatasetMenu;
exports.renderTopExpressed = renderTopExpressed;
exports.searchById = searchById;

return exports;

}({}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF0Y2gtZ2VuZS1leHByZXNzaW9uLmJ1bmRsZS5kZXYuanMiLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1kc3Yvc3JjL2Rzdi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1kc3Yvc3JjL2Nzdi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1kc3Yvc3JjL3Rzdi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mZXRjaC9zcmMvdGV4dC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mZXRjaC9zcmMvZHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZldGNoL3NyYy9qc29uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbmFtZXNwYWNlcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL25hbWVzcGFjZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL2NyZWF0b3IuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rvci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zZWxlY3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3RvckFsbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zZWxlY3RBbGwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9tYXRjaGVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2ZpbHRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zcGFyc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZW50ZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9jb25zdGFudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kYXRhLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2V4aXQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbWVyZ2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vb3JkZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc29ydC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jYWxsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL25vZGVzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL25vZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc2l6ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lbXB0eS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lYWNoLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2F0dHIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy93aW5kb3cuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc3R5bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vcHJvcGVydHkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vY2xhc3NlZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi90ZXh0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2h0bWwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vcmFpc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbG93ZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vYXBwZW5kLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2luc2VydC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9yZW1vdmUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vY2xvbmUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZGF0dW0uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZGlzcGF0Y2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3RBbGwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtY29sbGVjdGlvbi9zcmMvbWFwLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbGxlY3Rpb24vc3JjL25lc3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtY29sbGVjdGlvbi9zcmMva2V5cy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1jb2xsZWN0aW9uL3NyYy92YWx1ZXMuanMiLCIuLi8uLi9zcmMvc2NyaXB0cy9tb2R1bGVzL2d0ZXhEYXRhUGFyc2VyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9hc2NlbmRpbmcuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL2Jpc2VjdG9yLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9iaXNlY3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL3JhbmdlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy90aWNrcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvbWF4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9hcnJheS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvb3JkaW5hbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvYmFuZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvZGVmaW5lLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbG9yL3NyYy9jb2xvci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvbWF0aC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvbGFiLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbG9yL3NyYy9jdWJlaGVsaXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL2Jhc2lzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9iYXNpc0Nsb3NlZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvY29uc3RhbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL2NvbG9yLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9yZ2IuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL2FycmF5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9kYXRlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9udW1iZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL29iamVjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvc3RyaW5nLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy92YWx1ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvcm91bmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL3RyYW5zZm9ybS9kZWNvbXBvc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL3RyYW5zZm9ybS9wYXJzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvdHJhbnNmb3JtL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9jdWJlaGVsaXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL2NvbnN0YW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9udW1iZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL2NvbnRpbnVvdXMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXREZWNpbWFsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZXhwb25lbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRHcm91cC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdE51bWVyYWxzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0RGVmYXVsdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdFByZWZpeEF1dG8uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRSb3VuZGVkLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0VHlwZXMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRTcGVjaWZpZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9pZGVudGl0eS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2xvY2FsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2RlZmF1bHRMb2NhbGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9wcmVjaXNpb25GaXhlZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL3ByZWNpc2lvblByZWZpeC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL3ByZWNpc2lvblJvdW5kLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy90aWNrRm9ybWF0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9saW5lYXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvaW50ZXJ2YWwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvbWlsbGlzZWNvbmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvZHVyYXRpb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvc2Vjb25kLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL21pbnV0ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9ob3VyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL2RheS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy93ZWVrLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL21vbnRoLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3llYXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvdXRjTWludXRlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3V0Y0hvdXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvdXRjRGF5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3V0Y1dlZWsuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvdXRjTW9udGguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvdXRjWWVhci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9zcmMvbG9jYWxlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUtZm9ybWF0L3NyYy9kZWZhdWx0TG9jYWxlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUtZm9ybWF0L3NyYy9pc29Gb3JtYXQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS1mb3JtYXQvc3JjL2lzb1BhcnNlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9zZXF1ZW50aWFsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvY29sb3JzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvY2F0ZWdvcmljYWwvY2F0ZWdvcnkxMC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL2NhdGVnb3JpY2FsL0FjY2VudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL2NhdGVnb3JpY2FsL0RhcmsyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvY2F0ZWdvcmljYWwvUGFpcmVkLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvY2F0ZWdvcmljYWwvUGFzdGVsMS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL2NhdGVnb3JpY2FsL1Bhc3RlbDIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9jYXRlZ29yaWNhbC9TZXQxLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvY2F0ZWdvcmljYWwvU2V0Mi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL2NhdGVnb3JpY2FsL1NldDMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9yYW1wLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvZGl2ZXJnaW5nL0JyQkcuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9kaXZlcmdpbmcvUFJHbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL2RpdmVyZ2luZy9QaVlHLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvZGl2ZXJnaW5nL1B1T3IuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9kaXZlcmdpbmcvUmRCdS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL2RpdmVyZ2luZy9SZEd5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvZGl2ZXJnaW5nL1JkWWxCdS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL2RpdmVyZ2luZy9SZFlsR24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9kaXZlcmdpbmcvU3BlY3RyYWwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLW11bHRpL0J1R24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLW11bHRpL0J1UHUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLW11bHRpL0duQnUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLW11bHRpL09yUmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLW11bHRpL1B1QnVHbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvUHVCdS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvUHVSZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvUmRQdS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvWWxHbkJ1LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1tdWx0aS9ZbEduLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1tdWx0aS9ZbE9yQnIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLW11bHRpL1lsT3JSZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtc2luZ2xlL0JsdWVzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1zaW5nbGUvR3JlZW5zLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1zaW5nbGUvR3JleXMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLXNpbmdsZS9QdXJwbGVzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1zaW5nbGUvUmVkcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtc2luZ2xlL09yYW5nZXMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLW11bHRpL2N1YmVoZWxpeC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvcmFpbmJvdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvdmlyaWRpcy5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL21vZHVsZXMvQ29sb3JzLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy91dGlscy5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL21vZHVsZXMvRGVuZHJvSGVhdG1hcENvbmZpZy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1oaWVyYXJjaHkvc3JjL2hpZXJhcmNoeS9jb3VudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1oaWVyYXJjaHkvc3JjL2hpZXJhcmNoeS9lYWNoLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWhpZXJhcmNoeS9zcmMvaGllcmFyY2h5L2VhY2hCZWZvcmUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaGllcmFyY2h5L3NyYy9oaWVyYXJjaHkvZWFjaEFmdGVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWhpZXJhcmNoeS9zcmMvaGllcmFyY2h5L3N1bS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1oaWVyYXJjaHkvc3JjL2hpZXJhcmNoeS9zb3J0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWhpZXJhcmNoeS9zcmMvaGllcmFyY2h5L3BhdGguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaGllcmFyY2h5L3NyYy9oaWVyYXJjaHkvYW5jZXN0b3JzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWhpZXJhcmNoeS9zcmMvaGllcmFyY2h5L2Rlc2NlbmRhbnRzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWhpZXJhcmNoeS9zcmMvaGllcmFyY2h5L2xlYXZlcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1oaWVyYXJjaHkvc3JjL2hpZXJhcmNoeS9saW5rcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1oaWVyYXJjaHkvc3JjL2hpZXJhcmNoeS9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1heGlzL3NyYy9hcnJheS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1heGlzL3NyYy9pZGVudGl0eS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1heGlzL3NyYy9heGlzLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvZXh0ZXJuYWwvbmV3aWNrLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy9EZW5kcm9ncmFtLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRpc3BhdGNoL3NyYy9kaXNwYXRjaC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lci9zcmMvdGltZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZXIvc3JjL3RpbWVvdXQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9zY2hlZHVsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy9pbnRlcnJ1cHQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvc2VsZWN0aW9uL2ludGVycnVwdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3R3ZWVuLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vaW50ZXJwb2xhdGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9hdHRyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vYXR0clR3ZWVuLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vZGVsYXkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9kdXJhdGlvbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL2Vhc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9maWx0ZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9tZXJnZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL29uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vcmVtb3ZlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vc2VsZWN0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vc2VsZWN0QWxsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vc2VsZWN0aW9uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vc3R5bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9zdHlsZVR3ZWVuLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vdGV4dC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3RyYW5zaXRpb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1lYXNlL3NyYy9jdWJpYy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy9zZWxlY3Rpb24vdHJhbnNpdGlvbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy9zZWxlY3Rpb24vaW5kZXguanMiLCIuLi8uLi9zcmMvc2NyaXB0cy9tb2R1bGVzL0hlYXRtYXAuanMiLCIuLi8uLi9zcmMvc2NyaXB0cy9tb2R1bGVzL1Rvb2x0aXAuanMiLCIuLi8uLi9zcmMvc2NyaXB0cy9tb2R1bGVzL0RlbmRyb0hlYXRtYXAuanMiLCIuLi8uLi9zcmMvc2NyaXB0cy9CYXRjaEdlbmVFeHByZXNzaW9uLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBFT0wgPSB7fSxcbiAgICBFT0YgPSB7fSxcbiAgICBRVU9URSA9IDM0LFxuICAgIE5FV0xJTkUgPSAxMCxcbiAgICBSRVRVUk4gPSAxMztcblxuZnVuY3Rpb24gb2JqZWN0Q29udmVydGVyKGNvbHVtbnMpIHtcbiAgcmV0dXJuIG5ldyBGdW5jdGlvbihcImRcIiwgXCJyZXR1cm4ge1wiICsgY29sdW1ucy5tYXAoZnVuY3Rpb24obmFtZSwgaSkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShuYW1lKSArIFwiOiBkW1wiICsgaSArIFwiXVwiO1xuICB9KS5qb2luKFwiLFwiKSArIFwifVwiKTtcbn1cblxuZnVuY3Rpb24gY3VzdG9tQ29udmVydGVyKGNvbHVtbnMsIGYpIHtcbiAgdmFyIG9iamVjdCA9IG9iamVjdENvbnZlcnRlcihjb2x1bW5zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHJvdywgaSkge1xuICAgIHJldHVybiBmKG9iamVjdChyb3cpLCBpLCBjb2x1bW5zKTtcbiAgfTtcbn1cblxuLy8gQ29tcHV0ZSB1bmlxdWUgY29sdW1ucyBpbiBvcmRlciBvZiBkaXNjb3ZlcnkuXG5mdW5jdGlvbiBpbmZlckNvbHVtbnMocm93cykge1xuICB2YXIgY29sdW1uU2V0ID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIGNvbHVtbnMgPSBbXTtcblxuICByb3dzLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgZm9yICh2YXIgY29sdW1uIGluIHJvdykge1xuICAgICAgaWYgKCEoY29sdW1uIGluIGNvbHVtblNldCkpIHtcbiAgICAgICAgY29sdW1ucy5wdXNoKGNvbHVtblNldFtjb2x1bW5dID0gY29sdW1uKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBjb2x1bW5zO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihkZWxpbWl0ZXIpIHtcbiAgdmFyIHJlRm9ybWF0ID0gbmV3IFJlZ0V4cChcIltcXFwiXCIgKyBkZWxpbWl0ZXIgKyBcIlxcblxccl1cIiksXG4gICAgICBERUxJTUlURVIgPSBkZWxpbWl0ZXIuY2hhckNvZGVBdCgwKTtcblxuICBmdW5jdGlvbiBwYXJzZSh0ZXh0LCBmKSB7XG4gICAgdmFyIGNvbnZlcnQsIGNvbHVtbnMsIHJvd3MgPSBwYXJzZVJvd3ModGV4dCwgZnVuY3Rpb24ocm93LCBpKSB7XG4gICAgICBpZiAoY29udmVydCkgcmV0dXJuIGNvbnZlcnQocm93LCBpIC0gMSk7XG4gICAgICBjb2x1bW5zID0gcm93LCBjb252ZXJ0ID0gZiA/IGN1c3RvbUNvbnZlcnRlcihyb3csIGYpIDogb2JqZWN0Q29udmVydGVyKHJvdyk7XG4gICAgfSk7XG4gICAgcm93cy5jb2x1bW5zID0gY29sdW1ucyB8fCBbXTtcbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlUm93cyh0ZXh0LCBmKSB7XG4gICAgdmFyIHJvd3MgPSBbXSwgLy8gb3V0cHV0IHJvd3NcbiAgICAgICAgTiA9IHRleHQubGVuZ3RoLFxuICAgICAgICBJID0gMCwgLy8gY3VycmVudCBjaGFyYWN0ZXIgaW5kZXhcbiAgICAgICAgbiA9IDAsIC8vIGN1cnJlbnQgbGluZSBudW1iZXJcbiAgICAgICAgdCwgLy8gY3VycmVudCB0b2tlblxuICAgICAgICBlb2YgPSBOIDw9IDAsIC8vIGN1cnJlbnQgdG9rZW4gZm9sbG93ZWQgYnkgRU9GP1xuICAgICAgICBlb2wgPSBmYWxzZTsgLy8gY3VycmVudCB0b2tlbiBmb2xsb3dlZCBieSBFT0w/XG5cbiAgICAvLyBTdHJpcCB0aGUgdHJhaWxpbmcgbmV3bGluZS5cbiAgICBpZiAodGV4dC5jaGFyQ29kZUF0KE4gLSAxKSA9PT0gTkVXTElORSkgLS1OO1xuICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQoTiAtIDEpID09PSBSRVRVUk4pIC0tTjtcblxuICAgIGZ1bmN0aW9uIHRva2VuKCkge1xuICAgICAgaWYgKGVvZikgcmV0dXJuIEVPRjtcbiAgICAgIGlmIChlb2wpIHJldHVybiBlb2wgPSBmYWxzZSwgRU9MO1xuXG4gICAgICAvLyBVbmVzY2FwZSBxdW90ZXMuXG4gICAgICB2YXIgaSwgaiA9IEksIGM7XG4gICAgICBpZiAodGV4dC5jaGFyQ29kZUF0KGopID09PSBRVU9URSkge1xuICAgICAgICB3aGlsZSAoSSsrIDwgTiAmJiB0ZXh0LmNoYXJDb2RlQXQoSSkgIT09IFFVT1RFIHx8IHRleHQuY2hhckNvZGVBdCgrK0kpID09PSBRVU9URSk7XG4gICAgICAgIGlmICgoaSA9IEkpID49IE4pIGVvZiA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKChjID0gdGV4dC5jaGFyQ29kZUF0KEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGogKyAxLCBpIC0gMSkucmVwbGFjZSgvXCJcIi9nLCBcIlxcXCJcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpbmQgbmV4dCBkZWxpbWl0ZXIgb3IgbmV3bGluZS5cbiAgICAgIHdoaWxlIChJIDwgTikge1xuICAgICAgICBpZiAoKGMgPSB0ZXh0LmNoYXJDb2RlQXQoaSA9IEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIGVsc2UgaWYgKGMgIT09IERFTElNSVRFUikgY29udGludWU7XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGosIGkpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXR1cm4gbGFzdCB0b2tlbiBiZWZvcmUgRU9GLlxuICAgICAgcmV0dXJuIGVvZiA9IHRydWUsIHRleHQuc2xpY2UoaiwgTik7XG4gICAgfVxuXG4gICAgd2hpbGUgKCh0ID0gdG9rZW4oKSkgIT09IEVPRikge1xuICAgICAgdmFyIHJvdyA9IFtdO1xuICAgICAgd2hpbGUgKHQgIT09IEVPTCAmJiB0ICE9PSBFT0YpIHJvdy5wdXNoKHQpLCB0ID0gdG9rZW4oKTtcbiAgICAgIGlmIChmICYmIChyb3cgPSBmKHJvdywgbisrKSkgPT0gbnVsbCkgY29udGludWU7XG4gICAgICByb3dzLnB1c2gocm93KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdChyb3dzLCBjb2x1bW5zKSB7XG4gICAgaWYgKGNvbHVtbnMgPT0gbnVsbCkgY29sdW1ucyA9IGluZmVyQ29sdW1ucyhyb3dzKTtcbiAgICByZXR1cm4gW2NvbHVtbnMubWFwKGZvcm1hdFZhbHVlKS5qb2luKGRlbGltaXRlcildLmNvbmNhdChyb3dzLm1hcChmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJldHVybiBjb2x1bW5zLm1hcChmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdFZhbHVlKHJvd1tjb2x1bW5dKTtcbiAgICAgIH0pLmpvaW4oZGVsaW1pdGVyKTtcbiAgICB9KSkuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFJvd3Mocm93cykge1xuICAgIHJldHVybiByb3dzLm1hcChmb3JtYXRSb3cpLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRSb3cocm93KSB7XG4gICAgcmV0dXJuIHJvdy5tYXAoZm9ybWF0VmFsdWUpLmpvaW4oZGVsaW1pdGVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFZhbHVlKHRleHQpIHtcbiAgICByZXR1cm4gdGV4dCA9PSBudWxsID8gXCJcIlxuICAgICAgICA6IHJlRm9ybWF0LnRlc3QodGV4dCArPSBcIlwiKSA/IFwiXFxcIlwiICsgdGV4dC5yZXBsYWNlKC9cIi9nLCBcIlxcXCJcXFwiXCIpICsgXCJcXFwiXCJcbiAgICAgICAgOiB0ZXh0O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwYXJzZTogcGFyc2UsXG4gICAgcGFyc2VSb3dzOiBwYXJzZVJvd3MsXG4gICAgZm9ybWF0OiBmb3JtYXQsXG4gICAgZm9ybWF0Um93czogZm9ybWF0Um93c1xuICB9O1xufVxuIiwiaW1wb3J0IGRzdiBmcm9tIFwiLi9kc3ZcIjtcblxudmFyIGNzdiA9IGRzdihcIixcIik7XG5cbmV4cG9ydCB2YXIgY3N2UGFyc2UgPSBjc3YucGFyc2U7XG5leHBvcnQgdmFyIGNzdlBhcnNlUm93cyA9IGNzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIGNzdkZvcm1hdCA9IGNzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIGNzdkZvcm1hdFJvd3MgPSBjc3YuZm9ybWF0Um93cztcbiIsImltcG9ydCBkc3YgZnJvbSBcIi4vZHN2XCI7XG5cbnZhciB0c3YgPSBkc3YoXCJcXHRcIik7XG5cbmV4cG9ydCB2YXIgdHN2UGFyc2UgPSB0c3YucGFyc2U7XG5leHBvcnQgdmFyIHRzdlBhcnNlUm93cyA9IHRzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIHRzdkZvcm1hdCA9IHRzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIHRzdkZvcm1hdFJvd3MgPSB0c3YuZm9ybWF0Um93cztcbiIsImZ1bmN0aW9uIHJlc3BvbnNlVGV4dChyZXNwb25zZSkge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzICsgXCIgXCIgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgcmV0dXJuIHJlc3BvbnNlLnRleHQoKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgcmV0dXJuIGZldGNoKGlucHV0LCBpbml0KS50aGVuKHJlc3BvbnNlVGV4dCk7XG59XG4iLCJpbXBvcnQge2NzdlBhcnNlLCBkc3ZGb3JtYXQsIHRzdlBhcnNlfSBmcm9tIFwiZDMtZHN2XCI7XG5pbXBvcnQgdGV4dCBmcm9tIFwiLi90ZXh0XCI7XG5cbmZ1bmN0aW9uIGRzdlBhcnNlKHBhcnNlKSB7XG4gIHJldHVybiBmdW5jdGlvbihpbnB1dCwgaW5pdCwgcm93KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgdHlwZW9mIGluaXQgPT09IFwiZnVuY3Rpb25cIikgcm93ID0gaW5pdCwgaW5pdCA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGV4dChpbnB1dCwgaW5pdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHBhcnNlKHJlc3BvbnNlLCByb3cpO1xuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkc3YoZGVsaW1pdGVyLCBpbnB1dCwgaW5pdCwgcm93KSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzICYmIHR5cGVvZiBpbml0ID09PSBcImZ1bmN0aW9uXCIpIHJvdyA9IGluaXQsIGluaXQgPSB1bmRlZmluZWQ7XG4gIHZhciBmb3JtYXQgPSBkc3ZGb3JtYXQoZGVsaW1pdGVyKTtcbiAgcmV0dXJuIHRleHQoaW5wdXQsIGluaXQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICByZXR1cm4gZm9ybWF0LnBhcnNlKHJlc3BvbnNlLCByb3cpO1xuICB9KTtcbn1cblxuZXhwb3J0IHZhciBjc3YgPSBkc3ZQYXJzZShjc3ZQYXJzZSk7XG5leHBvcnQgdmFyIHRzdiA9IGRzdlBhcnNlKHRzdlBhcnNlKTtcbiIsImZ1bmN0aW9uIHJlc3BvbnNlSnNvbihyZXNwb25zZSkge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzICsgXCIgXCIgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgcmV0dXJuIGZldGNoKGlucHV0LCBpbml0KS50aGVuKHJlc3BvbnNlSnNvbik7XG59XG4iLCJleHBvcnQgdmFyIHhodG1sID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCI7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgc3ZnOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsXG4gIHhodG1sOiB4aHRtbCxcbiAgeGxpbms6IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLFxuICB4bWw6IFwiaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlXCIsXG4gIHhtbG5zOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAveG1sbnMvXCJcbn07XG4iLCJpbXBvcnQgbmFtZXNwYWNlcyBmcm9tIFwiLi9uYW1lc3BhY2VzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHByZWZpeCA9IG5hbWUgKz0gXCJcIiwgaSA9IHByZWZpeC5pbmRleE9mKFwiOlwiKTtcbiAgaWYgKGkgPj0gMCAmJiAocHJlZml4ID0gbmFtZS5zbGljZSgwLCBpKSkgIT09IFwieG1sbnNcIikgbmFtZSA9IG5hbWUuc2xpY2UoaSArIDEpO1xuICByZXR1cm4gbmFtZXNwYWNlcy5oYXNPd25Qcm9wZXJ0eShwcmVmaXgpID8ge3NwYWNlOiBuYW1lc3BhY2VzW3ByZWZpeF0sIGxvY2FsOiBuYW1lfSA6IG5hbWU7XG59XG4iLCJpbXBvcnQgbmFtZXNwYWNlIGZyb20gXCIuL25hbWVzcGFjZVwiO1xuaW1wb3J0IHt4aHRtbH0gZnJvbSBcIi4vbmFtZXNwYWNlc1wiO1xuXG5mdW5jdGlvbiBjcmVhdG9ySW5oZXJpdChuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLm93bmVyRG9jdW1lbnQsXG4gICAgICAgIHVyaSA9IHRoaXMubmFtZXNwYWNlVVJJO1xuICAgIHJldHVybiB1cmkgPT09IHhodG1sICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5uYW1lc3BhY2VVUkkgPT09IHhodG1sXG4gICAgICAgID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKVxuICAgICAgICA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyh1cmksIG5hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdG9yRml4ZWQoZnVsbG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpO1xuICByZXR1cm4gKGZ1bGxuYW1lLmxvY2FsXG4gICAgICA/IGNyZWF0b3JGaXhlZFxuICAgICAgOiBjcmVhdG9ySW5oZXJpdCkoZnVsbG5hbWUpO1xufVxuIiwiZnVuY3Rpb24gbm9uZSgpIHt9XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiBzZWxlY3RvciA9PSBudWxsID8gbm9uZSA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgc2VsZWN0b3IgZnJvbSBcIi4uL3NlbGVjdG9yXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdCkge1xuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvcihzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc3ViZ3JvdXAgPSBzdWJncm91cHNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIHN1Ym5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgKHN1Ym5vZGUgPSBzZWxlY3QuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpKSB7XG4gICAgICAgIGlmIChcIl9fZGF0YV9fXCIgaW4gbm9kZSkgc3Vibm9kZS5fX2RhdGFfXyA9IG5vZGUuX19kYXRhX187XG4gICAgICAgIHN1Ymdyb3VwW2ldID0gc3Vibm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZnVuY3Rpb24gZW1wdHkoKSB7XG4gIHJldHVybiBbXTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIHNlbGVjdG9yID09IG51bGwgPyBlbXB0eSA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgc2VsZWN0b3JBbGwgZnJvbSBcIi4uL3NlbGVjdG9yQWxsXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdCkge1xuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvckFsbChzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IFtdLCBwYXJlbnRzID0gW10sIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHN1Ymdyb3Vwcy5wdXNoKHNlbGVjdC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSk7XG4gICAgICAgIHBhcmVudHMucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHBhcmVudHMpO1xufVxuIiwidmFyIG1hdGNoZXIgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2hlcyhzZWxlY3Rvcik7XG4gIH07XG59O1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICBpZiAoIWVsZW1lbnQubWF0Y2hlcykge1xuICAgIHZhciB2ZW5kb3JNYXRjaGVzID0gZWxlbWVudC53ZWJraXRNYXRjaGVzU2VsZWN0b3JcbiAgICAgICAgfHwgZWxlbWVudC5tc01hdGNoZXNTZWxlY3RvclxuICAgICAgICB8fCBlbGVtZW50Lm1vek1hdGNoZXNTZWxlY3RvclxuICAgICAgICB8fCBlbGVtZW50Lm9NYXRjaGVzU2VsZWN0b3I7XG4gICAgbWF0Y2hlciA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB2ZW5kb3JNYXRjaGVzLmNhbGwodGhpcywgc2VsZWN0b3IpO1xuICAgICAgfTtcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1hdGNoZXI7XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCBtYXRjaGVyIGZyb20gXCIuLi9tYXRjaGVyXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG1hdGNoKSB7XG4gIGlmICh0eXBlb2YgbWF0Y2ggIT09IFwiZnVuY3Rpb25cIikgbWF0Y2ggPSBtYXRjaGVyKG1hdGNoKTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHN1Ymdyb3VwID0gc3ViZ3JvdXBzW2pdID0gW10sIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgbWF0Y2guY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpIHtcbiAgICAgICAgc3ViZ3JvdXAucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odXBkYXRlKSB7XG4gIHJldHVybiBuZXcgQXJyYXkodXBkYXRlLmxlbmd0aCk7XG59XG4iLCJpbXBvcnQgc3BhcnNlIGZyb20gXCIuL3NwYXJzZVwiO1xuaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLl9lbnRlciB8fCB0aGlzLl9ncm91cHMubWFwKHNwYXJzZSksIHRoaXMuX3BhcmVudHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gRW50ZXJOb2RlKHBhcmVudCwgZGF0dW0pIHtcbiAgdGhpcy5vd25lckRvY3VtZW50ID0gcGFyZW50Lm93bmVyRG9jdW1lbnQ7XG4gIHRoaXMubmFtZXNwYWNlVVJJID0gcGFyZW50Lm5hbWVzcGFjZVVSSTtcbiAgdGhpcy5fbmV4dCA9IG51bGw7XG4gIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5fX2RhdGFfXyA9IGRhdHVtO1xufVxuXG5FbnRlck5vZGUucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogRW50ZXJOb2RlLFxuICBhcHBlbmRDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5pbnNlcnRCZWZvcmUoY2hpbGQsIHRoaXMuX25leHQpOyB9LFxuICBpbnNlcnRCZWZvcmU6IGZ1bmN0aW9uKGNoaWxkLCBuZXh0KSB7IHJldHVybiB0aGlzLl9wYXJlbnQuaW5zZXJ0QmVmb3JlKGNoaWxkLCBuZXh0KTsgfSxcbiAgcXVlcnlTZWxlY3RvcjogZnVuY3Rpb24oc2VsZWN0b3IpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTsgfSxcbiAgcXVlcnlTZWxlY3RvckFsbDogZnVuY3Rpb24oc2VsZWN0b3IpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTsgfVxufTtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB4O1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQge0VudGVyTm9kZX0gZnJvbSBcIi4vZW50ZXJcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi4vY29uc3RhbnRcIjtcblxudmFyIGtleVByZWZpeCA9IFwiJFwiOyAvLyBQcm90ZWN0IGFnYWluc3Qga2V5cyBsaWtlIOKAnF9fcHJvdG9fX+KAnS5cblxuZnVuY3Rpb24gYmluZEluZGV4KHBhcmVudCwgZ3JvdXAsIGVudGVyLCB1cGRhdGUsIGV4aXQsIGRhdGEpIHtcbiAgdmFyIGkgPSAwLFxuICAgICAgbm9kZSxcbiAgICAgIGdyb3VwTGVuZ3RoID0gZ3JvdXAubGVuZ3RoLFxuICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuXG4gIC8vIFB1dCBhbnkgbm9uLW51bGwgbm9kZXMgdGhhdCBmaXQgaW50byB1cGRhdGUuXG4gIC8vIFB1dCBhbnkgbnVsbCBub2RlcyBpbnRvIGVudGVyLlxuICAvLyBQdXQgYW55IHJlbWFpbmluZyBkYXRhIGludG8gZW50ZXIuXG4gIGZvciAoOyBpIDwgZGF0YUxlbmd0aDsgKytpKSB7XG4gICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgbm9kZS5fX2RhdGFfXyA9IGRhdGFbaV07XG4gICAgICB1cGRhdGVbaV0gPSBub2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbnRlcltpXSA9IG5ldyBFbnRlck5vZGUocGFyZW50LCBkYXRhW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBQdXQgYW55IG5vbi1udWxsIG5vZGVzIHRoYXQgZG9u4oCZdCBmaXQgaW50byBleGl0LlxuICBmb3IgKDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICBleGl0W2ldID0gbm9kZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYmluZEtleShwYXJlbnQsIGdyb3VwLCBlbnRlciwgdXBkYXRlLCBleGl0LCBkYXRhLCBrZXkpIHtcbiAgdmFyIGksXG4gICAgICBub2RlLFxuICAgICAgbm9kZUJ5S2V5VmFsdWUgPSB7fSxcbiAgICAgIGdyb3VwTGVuZ3RoID0gZ3JvdXAubGVuZ3RoLFxuICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoLFxuICAgICAga2V5VmFsdWVzID0gbmV3IEFycmF5KGdyb3VwTGVuZ3RoKSxcbiAgICAgIGtleVZhbHVlO1xuXG4gIC8vIENvbXB1dGUgdGhlIGtleSBmb3IgZWFjaCBub2RlLlxuICAvLyBJZiBtdWx0aXBsZSBub2RlcyBoYXZlIHRoZSBzYW1lIGtleSwgdGhlIGR1cGxpY2F0ZXMgYXJlIGFkZGVkIHRvIGV4aXQuXG4gIGZvciAoaSA9IDA7IGkgPCBncm91cExlbmd0aDsgKytpKSB7XG4gICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAga2V5VmFsdWVzW2ldID0ga2V5VmFsdWUgPSBrZXlQcmVmaXggKyBrZXkuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCk7XG4gICAgICBpZiAoa2V5VmFsdWUgaW4gbm9kZUJ5S2V5VmFsdWUpIHtcbiAgICAgICAgZXhpdFtpXSA9IG5vZGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlQnlLZXlWYWx1ZVtrZXlWYWx1ZV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENvbXB1dGUgdGhlIGtleSBmb3IgZWFjaCBkYXR1bS5cbiAgLy8gSWYgdGhlcmUgYSBub2RlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGtleSwgam9pbiBhbmQgYWRkIGl0IHRvIHVwZGF0ZS5cbiAgLy8gSWYgdGhlcmUgaXMgbm90IChvciB0aGUga2V5IGlzIGEgZHVwbGljYXRlKSwgYWRkIGl0IHRvIGVudGVyLlxuICBmb3IgKGkgPSAwOyBpIDwgZGF0YUxlbmd0aDsgKytpKSB7XG4gICAga2V5VmFsdWUgPSBrZXlQcmVmaXggKyBrZXkuY2FsbChwYXJlbnQsIGRhdGFbaV0sIGksIGRhdGEpO1xuICAgIGlmIChub2RlID0gbm9kZUJ5S2V5VmFsdWVba2V5VmFsdWVdKSB7XG4gICAgICB1cGRhdGVbaV0gPSBub2RlO1xuICAgICAgbm9kZS5fX2RhdGFfXyA9IGRhdGFbaV07XG4gICAgICBub2RlQnlLZXlWYWx1ZVtrZXlWYWx1ZV0gPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbnRlcltpXSA9IG5ldyBFbnRlck5vZGUocGFyZW50LCBkYXRhW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgYW55IHJlbWFpbmluZyBub2RlcyB0aGF0IHdlcmUgbm90IGJvdW5kIHRvIGRhdGEgdG8gZXhpdC5cbiAgZm9yIChpID0gMDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgKG5vZGVCeUtleVZhbHVlW2tleVZhbHVlc1tpXV0gPT09IG5vZGUpKSB7XG4gICAgICBleGl0W2ldID0gbm9kZTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgZGF0YSA9IG5ldyBBcnJheSh0aGlzLnNpemUoKSksIGogPSAtMTtcbiAgICB0aGlzLmVhY2goZnVuY3Rpb24oZCkgeyBkYXRhWysral0gPSBkOyB9KTtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciBiaW5kID0ga2V5ID8gYmluZEtleSA6IGJpbmRJbmRleCxcbiAgICAgIHBhcmVudHMgPSB0aGlzLl9wYXJlbnRzLFxuICAgICAgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzO1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdmFsdWUgPSBjb25zdGFudCh2YWx1ZSk7XG5cbiAgZm9yICh2YXIgbSA9IGdyb3Vwcy5sZW5ndGgsIHVwZGF0ZSA9IG5ldyBBcnJheShtKSwgZW50ZXIgPSBuZXcgQXJyYXkobSksIGV4aXQgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgdmFyIHBhcmVudCA9IHBhcmVudHNbal0sXG4gICAgICAgIGdyb3VwID0gZ3JvdXBzW2pdLFxuICAgICAgICBncm91cExlbmd0aCA9IGdyb3VwLmxlbmd0aCxcbiAgICAgICAgZGF0YSA9IHZhbHVlLmNhbGwocGFyZW50LCBwYXJlbnQgJiYgcGFyZW50Ll9fZGF0YV9fLCBqLCBwYXJlbnRzKSxcbiAgICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoLFxuICAgICAgICBlbnRlckdyb3VwID0gZW50ZXJbal0gPSBuZXcgQXJyYXkoZGF0YUxlbmd0aCksXG4gICAgICAgIHVwZGF0ZUdyb3VwID0gdXBkYXRlW2pdID0gbmV3IEFycmF5KGRhdGFMZW5ndGgpLFxuICAgICAgICBleGl0R3JvdXAgPSBleGl0W2pdID0gbmV3IEFycmF5KGdyb3VwTGVuZ3RoKTtcblxuICAgIGJpbmQocGFyZW50LCBncm91cCwgZW50ZXJHcm91cCwgdXBkYXRlR3JvdXAsIGV4aXRHcm91cCwgZGF0YSwga2V5KTtcblxuICAgIC8vIE5vdyBjb25uZWN0IHRoZSBlbnRlciBub2RlcyB0byB0aGVpciBmb2xsb3dpbmcgdXBkYXRlIG5vZGUsIHN1Y2ggdGhhdFxuICAgIC8vIGFwcGVuZENoaWxkIGNhbiBpbnNlcnQgdGhlIG1hdGVyaWFsaXplZCBlbnRlciBub2RlIGJlZm9yZSB0aGlzIG5vZGUsXG4gICAgLy8gcmF0aGVyIHRoYW4gYXQgdGhlIGVuZCBvZiB0aGUgcGFyZW50IG5vZGUuXG4gICAgZm9yICh2YXIgaTAgPSAwLCBpMSA9IDAsIHByZXZpb3VzLCBuZXh0OyBpMCA8IGRhdGFMZW5ndGg7ICsraTApIHtcbiAgICAgIGlmIChwcmV2aW91cyA9IGVudGVyR3JvdXBbaTBdKSB7XG4gICAgICAgIGlmIChpMCA+PSBpMSkgaTEgPSBpMCArIDE7XG4gICAgICAgIHdoaWxlICghKG5leHQgPSB1cGRhdGVHcm91cFtpMV0pICYmICsraTEgPCBkYXRhTGVuZ3RoKTtcbiAgICAgICAgcHJldmlvdXMuX25leHQgPSBuZXh0IHx8IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlID0gbmV3IFNlbGVjdGlvbih1cGRhdGUsIHBhcmVudHMpO1xuICB1cGRhdGUuX2VudGVyID0gZW50ZXI7XG4gIHVwZGF0ZS5fZXhpdCA9IGV4aXQ7XG4gIHJldHVybiB1cGRhdGU7XG59XG4iLCJpbXBvcnQgc3BhcnNlIGZyb20gXCIuL3NwYXJzZVwiO1xuaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLl9leGl0IHx8IHRoaXMuX2dyb3Vwcy5tYXAoc3BhcnNlKSwgdGhpcy5fcGFyZW50cyk7XG59XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0aW9uKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzMCA9IHRoaXMuX2dyb3VwcywgZ3JvdXBzMSA9IHNlbGVjdGlvbi5fZ3JvdXBzLCBtMCA9IGdyb3VwczAubGVuZ3RoLCBtMSA9IGdyb3VwczEubGVuZ3RoLCBtID0gTWF0aC5taW4obTAsIG0xKSwgbWVyZ2VzID0gbmV3IEFycmF5KG0wKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cDAgPSBncm91cHMwW2pdLCBncm91cDEgPSBncm91cHMxW2pdLCBuID0gZ3JvdXAwLmxlbmd0aCwgbWVyZ2UgPSBtZXJnZXNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwMFtpXSB8fCBncm91cDFbaV0pIHtcbiAgICAgICAgbWVyZ2VbaV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBqIDwgbTA7ICsraikge1xuICAgIG1lcmdlc1tqXSA9IGdyb3VwczBbal07XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihtZXJnZXMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBqID0gLTEsIG0gPSBncm91cHMubGVuZ3RoOyArK2ogPCBtOykge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gZ3JvdXAubGVuZ3RoIC0gMSwgbmV4dCA9IGdyb3VwW2ldLCBub2RlOyAtLWkgPj0gMDspIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgICAgaWYgKG5leHQgJiYgbmV4dCAhPT0gbm9kZS5uZXh0U2libGluZykgbmV4dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBuZXh0KTtcbiAgICAgICAgbmV4dCA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29tcGFyZSkge1xuICBpZiAoIWNvbXBhcmUpIGNvbXBhcmUgPSBhc2NlbmRpbmc7XG5cbiAgZnVuY3Rpb24gY29tcGFyZU5vZGUoYSwgYikge1xuICAgIHJldHVybiBhICYmIGIgPyBjb21wYXJlKGEuX19kYXRhX18sIGIuX19kYXRhX18pIDogIWEgLSAhYjtcbiAgfVxuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHNvcnRncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHNvcnRncm91cCA9IHNvcnRncm91cHNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHNvcnRncm91cFtpXSA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICAgIHNvcnRncm91cC5zb3J0KGNvbXBhcmVOb2RlKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHNvcnRncm91cHMsIHRoaXMuX3BhcmVudHMpLm9yZGVyKCk7XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZyhhLCBiKSB7XG4gIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogYSA+PSBiID8gMCA6IE5hTjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbMF07XG4gIGFyZ3VtZW50c1swXSA9IHRoaXM7XG4gIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gIHJldHVybiB0aGlzO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlcyA9IG5ldyBBcnJheSh0aGlzLnNpemUoKSksIGkgPSAtMTtcbiAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkgeyBub2Rlc1srK2ldID0gdGhpczsgfSk7XG4gIHJldHVybiBub2Rlcztcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgaiA9IDAsIG0gPSBncm91cHMubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIGkgPSAwLCBuID0gZ3JvdXAubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICB2YXIgbm9kZSA9IGdyb3VwW2ldO1xuICAgICAgaWYgKG5vZGUpIHJldHVybiBub2RlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBzaXplID0gMDtcbiAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkgeyArK3NpemU7IH0pO1xuICByZXR1cm4gc2l6ZTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMubm9kZSgpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIGogPSAwLCBtID0gZ3JvdXBzLmxlbmd0aDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gMCwgbiA9IGdyb3VwLmxlbmd0aCwgbm9kZTsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkgY2FsbGJhY2suY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59XG4iLCJpbXBvcnQgbmFtZXNwYWNlIGZyb20gXCIuLi9uYW1lc3BhY2VcIjtcblxuZnVuY3Rpb24gYXR0clJlbW92ZShuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0clJlbW92ZU5TKGZ1bGxuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJDb25zdGFudChuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyQ29uc3RhbnROUyhmdWxsbmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsLCB2YWx1ZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIGVsc2UgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgdik7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbk5TKGZ1bGxuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMucmVtb3ZlQXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgICBlbHNlIHRoaXMuc2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsLCB2KTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHZhciBub2RlID0gdGhpcy5ub2RlKCk7XG4gICAgcmV0dXJuIGZ1bGxuYW1lLmxvY2FsXG4gICAgICAgID8gbm9kZS5nZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpXG4gICAgICAgIDogbm9kZS5nZXRBdHRyaWJ1dGUoZnVsbG5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbFxuICAgICAgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyUmVtb3ZlTlMgOiBhdHRyUmVtb3ZlKSA6ICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyRnVuY3Rpb25OUyA6IGF0dHJGdW5jdGlvbilcbiAgICAgIDogKGZ1bGxuYW1lLmxvY2FsID8gYXR0ckNvbnN0YW50TlMgOiBhdHRyQ29uc3RhbnQpKSkoZnVsbG5hbWUsIHZhbHVlKSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihub2RlKSB7XG4gIHJldHVybiAobm9kZS5vd25lckRvY3VtZW50ICYmIG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldykgLy8gbm9kZSBpcyBhIE5vZGVcbiAgICAgIHx8IChub2RlLmRvY3VtZW50ICYmIG5vZGUpIC8vIG5vZGUgaXMgYSBXaW5kb3dcbiAgICAgIHx8IG5vZGUuZGVmYXVsdFZpZXc7IC8vIG5vZGUgaXMgYSBEb2N1bWVudFxufVxuIiwiaW1wb3J0IGRlZmF1bHRWaWV3IGZyb20gXCIuLi93aW5kb3dcIjtcblxuZnVuY3Rpb24gc3R5bGVSZW1vdmUobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVDb25zdGFudChuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdmFsdWUsIHByaW9yaXR5KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVGdW5jdGlvbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSB0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpO1xuICAgIGVsc2UgdGhpcy5zdHlsZS5zZXRQcm9wZXJ0eShuYW1lLCB2LCBwcmlvcml0eSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDFcbiAgICAgID8gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgICA/IHN0eWxlUmVtb3ZlIDogdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICAgID8gc3R5bGVGdW5jdGlvblxuICAgICAgICAgICAgOiBzdHlsZUNvbnN0YW50KShuYW1lLCB2YWx1ZSwgcHJpb3JpdHkgPT0gbnVsbCA/IFwiXCIgOiBwcmlvcml0eSkpXG4gICAgICA6IHN0eWxlVmFsdWUodGhpcy5ub2RlKCksIG5hbWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3R5bGVWYWx1ZShub2RlLCBuYW1lKSB7XG4gIHJldHVybiBub2RlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUobmFtZSlcbiAgICAgIHx8IGRlZmF1bHRWaWV3KG5vZGUpLmdldENvbXB1dGVkU3R5bGUobm9kZSwgbnVsbCkuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKTtcbn1cbiIsImZ1bmN0aW9uIHByb3BlcnR5UmVtb3ZlKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGRlbGV0ZSB0aGlzW25hbWVdO1xuICB9O1xufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eUNvbnN0YW50KG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzW25hbWVdID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5RnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSBkZWxldGUgdGhpc1tuYW1lXTtcbiAgICBlbHNlIHRoaXNbbmFtZV0gPSB2O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDFcbiAgICAgID8gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyBwcm9wZXJ0eVJlbW92ZSA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBwcm9wZXJ0eUZ1bmN0aW9uXG4gICAgICAgICAgOiBwcm9wZXJ0eUNvbnN0YW50KShuYW1lLCB2YWx1ZSkpXG4gICAgICA6IHRoaXMubm9kZSgpW25hbWVdO1xufVxuIiwiZnVuY3Rpb24gY2xhc3NBcnJheShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZy50cmltKCkuc3BsaXQoL158XFxzKy8pO1xufVxuXG5mdW5jdGlvbiBjbGFzc0xpc3Qobm9kZSkge1xuICByZXR1cm4gbm9kZS5jbGFzc0xpc3QgfHwgbmV3IENsYXNzTGlzdChub2RlKTtcbn1cblxuZnVuY3Rpb24gQ2xhc3NMaXN0KG5vZGUpIHtcbiAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gIHRoaXMuX25hbWVzID0gY2xhc3NBcnJheShub2RlLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpIHx8IFwiXCIpO1xufVxuXG5DbGFzc0xpc3QucHJvdG90eXBlID0ge1xuICBhZGQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaSA9IHRoaXMuX25hbWVzLmluZGV4T2YobmFtZSk7XG4gICAgaWYgKGkgPCAwKSB7XG4gICAgICB0aGlzLl9uYW1lcy5wdXNoKG5hbWUpO1xuICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0aGlzLl9uYW1lcy5qb2luKFwiIFwiKSk7XG4gICAgfVxuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaSA9IHRoaXMuX25hbWVzLmluZGV4T2YobmFtZSk7XG4gICAgaWYgKGkgPj0gMCkge1xuICAgICAgdGhpcy5fbmFtZXMuc3BsaWNlKGksIDEpO1xuICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0aGlzLl9uYW1lcy5qb2luKFwiIFwiKSk7XG4gICAgfVxuICB9LFxuICBjb250YWluczogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9uYW1lcy5pbmRleE9mKG5hbWUpID49IDA7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNsYXNzZWRBZGQobm9kZSwgbmFtZXMpIHtcbiAgdmFyIGxpc3QgPSBjbGFzc0xpc3Qobm9kZSksIGkgPSAtMSwgbiA9IG5hbWVzLmxlbmd0aDtcbiAgd2hpbGUgKCsraSA8IG4pIGxpc3QuYWRkKG5hbWVzW2ldKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NlZFJlbW92ZShub2RlLCBuYW1lcykge1xuICB2YXIgbGlzdCA9IGNsYXNzTGlzdChub2RlKSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICB3aGlsZSAoKytpIDwgbikgbGlzdC5yZW1vdmUobmFtZXNbaV0pO1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkVHJ1ZShuYW1lcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2xhc3NlZEFkZCh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRGYWxzZShuYW1lcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2xhc3NlZFJlbW92ZSh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRGdW5jdGlvbihuYW1lcywgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICh2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpID8gY2xhc3NlZEFkZCA6IGNsYXNzZWRSZW1vdmUpKHRoaXMsIG5hbWVzKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIG5hbWVzID0gY2xhc3NBcnJheShuYW1lICsgXCJcIik7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgdmFyIGxpc3QgPSBjbGFzc0xpc3QodGhpcy5ub2RlKCkpLCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IG4pIGlmICghbGlzdC5jb250YWlucyhuYW1lc1tpXSkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmVhY2goKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IGNsYXNzZWRGdW5jdGlvbiA6IHZhbHVlXG4gICAgICA/IGNsYXNzZWRUcnVlXG4gICAgICA6IGNsYXNzZWRGYWxzZSkobmFtZXMsIHZhbHVlKSk7XG59XG4iLCJmdW5jdGlvbiB0ZXh0UmVtb3ZlKCkge1xuICB0aGlzLnRleHRDb250ZW50ID0gXCJcIjtcbn1cblxuZnVuY3Rpb24gdGV4dENvbnN0YW50KHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRleHRGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMudGV4dENvbnRlbnQgPSB2ID09IG51bGwgPyBcIlwiIDogdjtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5lYWNoKHZhbHVlID09IG51bGxcbiAgICAgICAgICA/IHRleHRSZW1vdmUgOiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IHRleHRGdW5jdGlvblxuICAgICAgICAgIDogdGV4dENvbnN0YW50KSh2YWx1ZSkpXG4gICAgICA6IHRoaXMubm9kZSgpLnRleHRDb250ZW50O1xufVxuIiwiZnVuY3Rpb24gaHRtbFJlbW92ZSgpIHtcbiAgdGhpcy5pbm5lckhUTUwgPSBcIlwiO1xufVxuXG5mdW5jdGlvbiBodG1sQ29uc3RhbnQodmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW5uZXJIVE1MID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGh0bWxGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMuaW5uZXJIVE1MID0gdiA9PSBudWxsID8gXCJcIiA6IHY7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyBodG1sUmVtb3ZlIDogKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBodG1sRnVuY3Rpb25cbiAgICAgICAgICA6IGh0bWxDb25zdGFudCkodmFsdWUpKVxuICAgICAgOiB0aGlzLm5vZGUoKS5pbm5lckhUTUw7XG59XG4iLCJmdW5jdGlvbiByYWlzZSgpIHtcbiAgaWYgKHRoaXMubmV4dFNpYmxpbmcpIHRoaXMucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVhY2gocmFpc2UpO1xufVxuIiwiZnVuY3Rpb24gbG93ZXIoKSB7XG4gIGlmICh0aGlzLnByZXZpb3VzU2libGluZykgdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLCB0aGlzLnBhcmVudE5vZGUuZmlyc3RDaGlsZCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lYWNoKGxvd2VyKTtcbn1cbiIsImltcG9ydCBjcmVhdG9yIGZyb20gXCIuLi9jcmVhdG9yXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGNyZWF0ZSA9IHR5cGVvZiBuYW1lID09PSBcImZ1bmN0aW9uXCIgPyBuYW1lIDogY3JlYXRvcihuYW1lKTtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmFwcGVuZENoaWxkKGNyZWF0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgfSk7XG59XG4iLCJpbXBvcnQgY3JlYXRvciBmcm9tIFwiLi4vY3JlYXRvclwiO1xuaW1wb3J0IHNlbGVjdG9yIGZyb20gXCIuLi9zZWxlY3RvclwiO1xuXG5mdW5jdGlvbiBjb25zdGFudE51bGwoKSB7XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCBiZWZvcmUpIHtcbiAgdmFyIGNyZWF0ZSA9IHR5cGVvZiBuYW1lID09PSBcImZ1bmN0aW9uXCIgPyBuYW1lIDogY3JlYXRvcihuYW1lKSxcbiAgICAgIHNlbGVjdCA9IGJlZm9yZSA9PSBudWxsID8gY29uc3RhbnROdWxsIDogdHlwZW9mIGJlZm9yZSA9PT0gXCJmdW5jdGlvblwiID8gYmVmb3JlIDogc2VsZWN0b3IoYmVmb3JlKTtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmluc2VydEJlZm9yZShjcmVhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSwgc2VsZWN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgbnVsbCk7XG4gIH0pO1xufVxuIiwiZnVuY3Rpb24gcmVtb3ZlKCkge1xuICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnROb2RlO1xuICBpZiAocGFyZW50KSBwYXJlbnQucmVtb3ZlQ2hpbGQodGhpcyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lYWNoKHJlbW92ZSk7XG59XG4iLCJmdW5jdGlvbiBzZWxlY3Rpb25fY2xvbmVTaGFsbG93KCkge1xuICByZXR1cm4gdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmNsb25lTm9kZShmYWxzZSksIHRoaXMubmV4dFNpYmxpbmcpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3Rpb25fY2xvbmVEZWVwKCkge1xuICByZXR1cm4gdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmNsb25lTm9kZSh0cnVlKSwgdGhpcy5uZXh0U2libGluZyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGRlZXApIHtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGRlZXAgPyBzZWxlY3Rpb25fY2xvbmVEZWVwIDogc2VsZWN0aW9uX2Nsb25lU2hhbGxvdyk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLnByb3BlcnR5KFwiX19kYXRhX19cIiwgdmFsdWUpXG4gICAgICA6IHRoaXMubm9kZSgpLl9fZGF0YV9fO1xufVxuIiwidmFyIGZpbHRlckV2ZW50cyA9IHt9O1xuXG5leHBvcnQgdmFyIGV2ZW50ID0gbnVsbDtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgaWYgKCEoXCJvbm1vdXNlZW50ZXJcIiBpbiBlbGVtZW50KSkge1xuICAgIGZpbHRlckV2ZW50cyA9IHttb3VzZWVudGVyOiBcIm1vdXNlb3ZlclwiLCBtb3VzZWxlYXZlOiBcIm1vdXNlb3V0XCJ9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbHRlckNvbnRleHRMaXN0ZW5lcihsaXN0ZW5lciwgaW5kZXgsIGdyb3VwKSB7XG4gIGxpc3RlbmVyID0gY29udGV4dExpc3RlbmVyKGxpc3RlbmVyLCBpbmRleCwgZ3JvdXApO1xuICByZXR1cm4gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgcmVsYXRlZCA9IGV2ZW50LnJlbGF0ZWRUYXJnZXQ7XG4gICAgaWYgKCFyZWxhdGVkIHx8IChyZWxhdGVkICE9PSB0aGlzICYmICEocmVsYXRlZC5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbih0aGlzKSAmIDgpKSkge1xuICAgICAgbGlzdGVuZXIuY2FsbCh0aGlzLCBldmVudCk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBjb250ZXh0TGlzdGVuZXIobGlzdGVuZXIsIGluZGV4LCBncm91cCkge1xuICByZXR1cm4gZnVuY3Rpb24oZXZlbnQxKSB7XG4gICAgdmFyIGV2ZW50MCA9IGV2ZW50OyAvLyBFdmVudHMgY2FuIGJlIHJlZW50cmFudCAoZS5nLiwgZm9jdXMpLlxuICAgIGV2ZW50ID0gZXZlbnQxO1xuICAgIHRyeSB7XG4gICAgICBsaXN0ZW5lci5jYWxsKHRoaXMsIHRoaXMuX19kYXRhX18sIGluZGV4LCBncm91cCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGV2ZW50ID0gZXZlbnQwO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VUeXBlbmFtZXModHlwZW5hbWVzKSB7XG4gIHJldHVybiB0eXBlbmFtZXMudHJpbSgpLnNwbGl0KC9efFxccysvKS5tYXAoZnVuY3Rpb24odCkge1xuICAgIHZhciBuYW1lID0gXCJcIiwgaSA9IHQuaW5kZXhPZihcIi5cIik7XG4gICAgaWYgKGkgPj0gMCkgbmFtZSA9IHQuc2xpY2UoaSArIDEpLCB0ID0gdC5zbGljZSgwLCBpKTtcbiAgICByZXR1cm4ge3R5cGU6IHQsIG5hbWU6IG5hbWV9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gb25SZW1vdmUodHlwZW5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBvbiA9IHRoaXMuX19vbjtcbiAgICBpZiAoIW9uKSByZXR1cm47XG4gICAgZm9yICh2YXIgaiA9IDAsIGkgPSAtMSwgbSA9IG9uLmxlbmd0aCwgbzsgaiA8IG07ICsraikge1xuICAgICAgaWYgKG8gPSBvbltqXSwgKCF0eXBlbmFtZS50eXBlIHx8IG8udHlwZSA9PT0gdHlwZW5hbWUudHlwZSkgJiYgby5uYW1lID09PSB0eXBlbmFtZS5uYW1lKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihvLnR5cGUsIG8ubGlzdGVuZXIsIG8uY2FwdHVyZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvblsrK2ldID0gbztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCsraSkgb24ubGVuZ3RoID0gaTtcbiAgICBlbHNlIGRlbGV0ZSB0aGlzLl9fb247XG4gIH07XG59XG5cbmZ1bmN0aW9uIG9uQWRkKHR5cGVuYW1lLCB2YWx1ZSwgY2FwdHVyZSkge1xuICB2YXIgd3JhcCA9IGZpbHRlckV2ZW50cy5oYXNPd25Qcm9wZXJ0eSh0eXBlbmFtZS50eXBlKSA/IGZpbHRlckNvbnRleHRMaXN0ZW5lciA6IGNvbnRleHRMaXN0ZW5lcjtcbiAgcmV0dXJuIGZ1bmN0aW9uKGQsIGksIGdyb3VwKSB7XG4gICAgdmFyIG9uID0gdGhpcy5fX29uLCBvLCBsaXN0ZW5lciA9IHdyYXAodmFsdWUsIGksIGdyb3VwKTtcbiAgICBpZiAob24pIGZvciAodmFyIGogPSAwLCBtID0gb24ubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgICBpZiAoKG8gPSBvbltqXSkudHlwZSA9PT0gdHlwZW5hbWUudHlwZSAmJiBvLm5hbWUgPT09IHR5cGVuYW1lLm5hbWUpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciwgby5jYXB0dXJlKTtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciA9IGxpc3RlbmVyLCBvLmNhcHR1cmUgPSBjYXB0dXJlKTtcbiAgICAgICAgby52YWx1ZSA9IHZhbHVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcih0eXBlbmFtZS50eXBlLCBsaXN0ZW5lciwgY2FwdHVyZSk7XG4gICAgbyA9IHt0eXBlOiB0eXBlbmFtZS50eXBlLCBuYW1lOiB0eXBlbmFtZS5uYW1lLCB2YWx1ZTogdmFsdWUsIGxpc3RlbmVyOiBsaXN0ZW5lciwgY2FwdHVyZTogY2FwdHVyZX07XG4gICAgaWYgKCFvbikgdGhpcy5fX29uID0gW29dO1xuICAgIGVsc2Ugb24ucHVzaChvKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odHlwZW5hbWUsIHZhbHVlLCBjYXB0dXJlKSB7XG4gIHZhciB0eXBlbmFtZXMgPSBwYXJzZVR5cGVuYW1lcyh0eXBlbmFtZSArIFwiXCIpLCBpLCBuID0gdHlwZW5hbWVzLmxlbmd0aCwgdDtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICB2YXIgb24gPSB0aGlzLm5vZGUoKS5fX29uO1xuICAgIGlmIChvbikgZm9yICh2YXIgaiA9IDAsIG0gPSBvbi5sZW5ndGgsIG87IGogPCBtOyArK2opIHtcbiAgICAgIGZvciAoaSA9IDAsIG8gPSBvbltqXTsgaSA8IG47ICsraSkge1xuICAgICAgICBpZiAoKHQgPSB0eXBlbmFtZXNbaV0pLnR5cGUgPT09IG8udHlwZSAmJiB0Lm5hbWUgPT09IG8ubmFtZSkge1xuICAgICAgICAgIHJldHVybiBvLnZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIG9uID0gdmFsdWUgPyBvbkFkZCA6IG9uUmVtb3ZlO1xuICBpZiAoY2FwdHVyZSA9PSBudWxsKSBjYXB0dXJlID0gZmFsc2U7XG4gIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHRoaXMuZWFjaChvbih0eXBlbmFtZXNbaV0sIHZhbHVlLCBjYXB0dXJlKSk7XG4gIHJldHVybiB0aGlzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3VzdG9tRXZlbnQoZXZlbnQxLCBsaXN0ZW5lciwgdGhhdCwgYXJncykge1xuICB2YXIgZXZlbnQwID0gZXZlbnQ7XG4gIGV2ZW50MS5zb3VyY2VFdmVudCA9IGV2ZW50O1xuICBldmVudCA9IGV2ZW50MTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gbGlzdGVuZXIuYXBwbHkodGhhdCwgYXJncyk7XG4gIH0gZmluYWxseSB7XG4gICAgZXZlbnQgPSBldmVudDA7XG4gIH1cbn1cbiIsImltcG9ydCBkZWZhdWx0VmlldyBmcm9tIFwiLi4vd2luZG93XCI7XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRXZlbnQobm9kZSwgdHlwZSwgcGFyYW1zKSB7XG4gIHZhciB3aW5kb3cgPSBkZWZhdWx0Vmlldyhub2RlKSxcbiAgICAgIGV2ZW50ID0gd2luZG93LkN1c3RvbUV2ZW50O1xuXG4gIGlmICh0eXBlb2YgZXZlbnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGV2ZW50ID0gbmV3IGV2ZW50KHR5cGUsIHBhcmFtcyk7XG4gIH0gZWxzZSB7XG4gICAgZXZlbnQgPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJFdmVudFwiKTtcbiAgICBpZiAocGFyYW1zKSBldmVudC5pbml0RXZlbnQodHlwZSwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlKSwgZXZlbnQuZGV0YWlsID0gcGFyYW1zLmRldGFpbDtcbiAgICBlbHNlIGV2ZW50LmluaXRFdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UpO1xuICB9XG5cbiAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuZnVuY3Rpb24gZGlzcGF0Y2hDb25zdGFudCh0eXBlLCBwYXJhbXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkaXNwYXRjaEV2ZW50KHRoaXMsIHR5cGUsIHBhcmFtcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRnVuY3Rpb24odHlwZSwgcGFyYW1zKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGlzcGF0Y2hFdmVudCh0aGlzLCB0eXBlLCBwYXJhbXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHR5cGUsIHBhcmFtcykge1xuICByZXR1cm4gdGhpcy5lYWNoKCh0eXBlb2YgcGFyYW1zID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gZGlzcGF0Y2hGdW5jdGlvblxuICAgICAgOiBkaXNwYXRjaENvbnN0YW50KSh0eXBlLCBwYXJhbXMpKTtcbn1cbiIsImltcG9ydCBzZWxlY3Rpb25fc2VsZWN0IGZyb20gXCIuL3NlbGVjdFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zZWxlY3RBbGwgZnJvbSBcIi4vc2VsZWN0QWxsXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2ZpbHRlciBmcm9tIFwiLi9maWx0ZXJcIjtcbmltcG9ydCBzZWxlY3Rpb25fZGF0YSBmcm9tIFwiLi9kYXRhXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2VudGVyIGZyb20gXCIuL2VudGVyXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2V4aXQgZnJvbSBcIi4vZXhpdFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9tZXJnZSBmcm9tIFwiLi9tZXJnZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9vcmRlciBmcm9tIFwiLi9vcmRlclwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zb3J0IGZyb20gXCIuL3NvcnRcIjtcbmltcG9ydCBzZWxlY3Rpb25fY2FsbCBmcm9tIFwiLi9jYWxsXCI7XG5pbXBvcnQgc2VsZWN0aW9uX25vZGVzIGZyb20gXCIuL25vZGVzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX25vZGUgZnJvbSBcIi4vbm9kZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zaXplIGZyb20gXCIuL3NpemVcIjtcbmltcG9ydCBzZWxlY3Rpb25fZW1wdHkgZnJvbSBcIi4vZW1wdHlcIjtcbmltcG9ydCBzZWxlY3Rpb25fZWFjaCBmcm9tIFwiLi9lYWNoXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2F0dHIgZnJvbSBcIi4vYXR0clwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zdHlsZSBmcm9tIFwiLi9zdHlsZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9wcm9wZXJ0eSBmcm9tIFwiLi9wcm9wZXJ0eVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9jbGFzc2VkIGZyb20gXCIuL2NsYXNzZWRcIjtcbmltcG9ydCBzZWxlY3Rpb25fdGV4dCBmcm9tIFwiLi90ZXh0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX2h0bWwgZnJvbSBcIi4vaHRtbFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9yYWlzZSBmcm9tIFwiLi9yYWlzZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9sb3dlciBmcm9tIFwiLi9sb3dlclwiO1xuaW1wb3J0IHNlbGVjdGlvbl9hcHBlbmQgZnJvbSBcIi4vYXBwZW5kXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2luc2VydCBmcm9tIFwiLi9pbnNlcnRcIjtcbmltcG9ydCBzZWxlY3Rpb25fcmVtb3ZlIGZyb20gXCIuL3JlbW92ZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9jbG9uZSBmcm9tIFwiLi9jbG9uZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9kYXR1bSBmcm9tIFwiLi9kYXR1bVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9vbiBmcm9tIFwiLi9vblwiO1xuaW1wb3J0IHNlbGVjdGlvbl9kaXNwYXRjaCBmcm9tIFwiLi9kaXNwYXRjaFwiO1xuXG5leHBvcnQgdmFyIHJvb3QgPSBbbnVsbF07XG5cbmV4cG9ydCBmdW5jdGlvbiBTZWxlY3Rpb24oZ3JvdXBzLCBwYXJlbnRzKSB7XG4gIHRoaXMuX2dyb3VwcyA9IGdyb3VwcztcbiAgdGhpcy5fcGFyZW50cyA9IHBhcmVudHM7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oW1tkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRdXSwgcm9vdCk7XG59XG5cblNlbGVjdGlvbi5wcm90b3R5cGUgPSBzZWxlY3Rpb24ucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogU2VsZWN0aW9uLFxuICBzZWxlY3Q6IHNlbGVjdGlvbl9zZWxlY3QsXG4gIHNlbGVjdEFsbDogc2VsZWN0aW9uX3NlbGVjdEFsbCxcbiAgZmlsdGVyOiBzZWxlY3Rpb25fZmlsdGVyLFxuICBkYXRhOiBzZWxlY3Rpb25fZGF0YSxcbiAgZW50ZXI6IHNlbGVjdGlvbl9lbnRlcixcbiAgZXhpdDogc2VsZWN0aW9uX2V4aXQsXG4gIG1lcmdlOiBzZWxlY3Rpb25fbWVyZ2UsXG4gIG9yZGVyOiBzZWxlY3Rpb25fb3JkZXIsXG4gIHNvcnQ6IHNlbGVjdGlvbl9zb3J0LFxuICBjYWxsOiBzZWxlY3Rpb25fY2FsbCxcbiAgbm9kZXM6IHNlbGVjdGlvbl9ub2RlcyxcbiAgbm9kZTogc2VsZWN0aW9uX25vZGUsXG4gIHNpemU6IHNlbGVjdGlvbl9zaXplLFxuICBlbXB0eTogc2VsZWN0aW9uX2VtcHR5LFxuICBlYWNoOiBzZWxlY3Rpb25fZWFjaCxcbiAgYXR0cjogc2VsZWN0aW9uX2F0dHIsXG4gIHN0eWxlOiBzZWxlY3Rpb25fc3R5bGUsXG4gIHByb3BlcnR5OiBzZWxlY3Rpb25fcHJvcGVydHksXG4gIGNsYXNzZWQ6IHNlbGVjdGlvbl9jbGFzc2VkLFxuICB0ZXh0OiBzZWxlY3Rpb25fdGV4dCxcbiAgaHRtbDogc2VsZWN0aW9uX2h0bWwsXG4gIHJhaXNlOiBzZWxlY3Rpb25fcmFpc2UsXG4gIGxvd2VyOiBzZWxlY3Rpb25fbG93ZXIsXG4gIGFwcGVuZDogc2VsZWN0aW9uX2FwcGVuZCxcbiAgaW5zZXJ0OiBzZWxlY3Rpb25faW5zZXJ0LFxuICByZW1vdmU6IHNlbGVjdGlvbl9yZW1vdmUsXG4gIGNsb25lOiBzZWxlY3Rpb25fY2xvbmUsXG4gIGRhdHVtOiBzZWxlY3Rpb25fZGF0dW0sXG4gIG9uOiBzZWxlY3Rpb25fb24sXG4gIGRpc3BhdGNoOiBzZWxlY3Rpb25fZGlzcGF0Y2hcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHNlbGVjdGlvbjtcbiIsImltcG9ydCB7U2VsZWN0aW9uLCByb290fSBmcm9tIFwiLi9zZWxlY3Rpb24vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyBuZXcgU2VsZWN0aW9uKFtbZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcildXSwgW2RvY3VtZW50LmRvY3VtZW50RWxlbWVudF0pXG4gICAgICA6IG5ldyBTZWxlY3Rpb24oW1tzZWxlY3Rvcl1dLCByb290KTtcbn1cbiIsImltcG9ydCB7U2VsZWN0aW9uLCByb290fSBmcm9tIFwiLi9zZWxlY3Rpb24vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyBuZXcgU2VsZWN0aW9uKFtkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKV0sIFtkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRdKVxuICAgICAgOiBuZXcgU2VsZWN0aW9uKFtzZWxlY3RvciA9PSBudWxsID8gW10gOiBzZWxlY3Rvcl0sIHJvb3QpO1xufVxuIiwiZXhwb3J0IHZhciBwcmVmaXggPSBcIiRcIjtcblxuZnVuY3Rpb24gTWFwKCkge31cblxuTWFwLnByb3RvdHlwZSA9IG1hcC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBNYXAsXG4gIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIChwcmVmaXggKyBrZXkpIGluIHRoaXM7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIHRoaXNbcHJlZml4ICsga2V5XTtcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgdGhpc1twcmVmaXggKyBrZXldID0gdmFsdWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIHByb3BlcnR5ID0gcHJlZml4ICsga2V5O1xuICAgIHJldHVybiBwcm9wZXJ0eSBpbiB0aGlzICYmIGRlbGV0ZSB0aGlzW3Byb3BlcnR5XTtcbiAgfSxcbiAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSBkZWxldGUgdGhpc1twcm9wZXJ0eV07XG4gIH0sXG4gIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIGtleXMucHVzaChwcm9wZXJ0eS5zbGljZSgxKSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH0sXG4gIHZhbHVlczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSB2YWx1ZXMucHVzaCh0aGlzW3Byb3BlcnR5XSk7XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfSxcbiAgZW50cmllczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVudHJpZXMgPSBbXTtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkgZW50cmllcy5wdXNoKHtrZXk6IHByb3BlcnR5LnNsaWNlKDEpLCB2YWx1ZTogdGhpc1twcm9wZXJ0eV19KTtcbiAgICByZXR1cm4gZW50cmllcztcbiAgfSxcbiAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNpemUgPSAwO1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSArK3NpemU7XG4gICAgcmV0dXJuIHNpemU7XG4gIH0sXG4gIGVtcHR5OiBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBlYWNoOiBmdW5jdGlvbihmKSB7XG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIGYodGhpc1twcm9wZXJ0eV0sIHByb3BlcnR5LnNsaWNlKDEpLCB0aGlzKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gbWFwKG9iamVjdCwgZikge1xuICB2YXIgbWFwID0gbmV3IE1hcDtcblxuICAvLyBDb3B5IGNvbnN0cnVjdG9yLlxuICBpZiAob2JqZWN0IGluc3RhbmNlb2YgTWFwKSBvYmplY3QuZWFjaChmdW5jdGlvbih2YWx1ZSwga2V5KSB7IG1hcC5zZXQoa2V5LCB2YWx1ZSk7IH0pO1xuXG4gIC8vIEluZGV4IGFycmF5IGJ5IG51bWVyaWMgaW5kZXggb3Igc3BlY2lmaWVkIGtleSBmdW5jdGlvbi5cbiAgZWxzZSBpZiAoQXJyYXkuaXNBcnJheShvYmplY3QpKSB7XG4gICAgdmFyIGkgPSAtMSxcbiAgICAgICAgbiA9IG9iamVjdC5sZW5ndGgsXG4gICAgICAgIG87XG5cbiAgICBpZiAoZiA9PSBudWxsKSB3aGlsZSAoKytpIDwgbikgbWFwLnNldChpLCBvYmplY3RbaV0pO1xuICAgIGVsc2Ugd2hpbGUgKCsraSA8IG4pIG1hcC5zZXQoZihvID0gb2JqZWN0W2ldLCBpLCBvYmplY3QpLCBvKTtcbiAgfVxuXG4gIC8vIENvbnZlcnQgb2JqZWN0IHRvIG1hcC5cbiAgZWxzZSBpZiAob2JqZWN0KSBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSBtYXAuc2V0KGtleSwgb2JqZWN0W2tleV0pO1xuXG4gIHJldHVybiBtYXA7XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1hcDtcbiIsImltcG9ydCBtYXAgZnJvbSBcIi4vbWFwXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIga2V5cyA9IFtdLFxuICAgICAgc29ydEtleXMgPSBbXSxcbiAgICAgIHNvcnRWYWx1ZXMsXG4gICAgICByb2xsdXAsXG4gICAgICBuZXN0O1xuXG4gIGZ1bmN0aW9uIGFwcGx5KGFycmF5LCBkZXB0aCwgY3JlYXRlUmVzdWx0LCBzZXRSZXN1bHQpIHtcbiAgICBpZiAoZGVwdGggPj0ga2V5cy5sZW5ndGgpIHtcbiAgICAgIGlmIChzb3J0VmFsdWVzICE9IG51bGwpIGFycmF5LnNvcnQoc29ydFZhbHVlcyk7XG4gICAgICByZXR1cm4gcm9sbHVwICE9IG51bGwgPyByb2xsdXAoYXJyYXkpIDogYXJyYXk7XG4gICAgfVxuXG4gICAgdmFyIGkgPSAtMSxcbiAgICAgICAgbiA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAga2V5ID0ga2V5c1tkZXB0aCsrXSxcbiAgICAgICAga2V5VmFsdWUsXG4gICAgICAgIHZhbHVlLFxuICAgICAgICB2YWx1ZXNCeUtleSA9IG1hcCgpLFxuICAgICAgICB2YWx1ZXMsXG4gICAgICAgIHJlc3VsdCA9IGNyZWF0ZVJlc3VsdCgpO1xuXG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGlmICh2YWx1ZXMgPSB2YWx1ZXNCeUtleS5nZXQoa2V5VmFsdWUgPSBrZXkodmFsdWUgPSBhcnJheVtpXSkgKyBcIlwiKSkge1xuICAgICAgICB2YWx1ZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZXNCeUtleS5zZXQoa2V5VmFsdWUsIFt2YWx1ZV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhbHVlc0J5S2V5LmVhY2goZnVuY3Rpb24odmFsdWVzLCBrZXkpIHtcbiAgICAgIHNldFJlc3VsdChyZXN1bHQsIGtleSwgYXBwbHkodmFsdWVzLCBkZXB0aCwgY3JlYXRlUmVzdWx0LCBzZXRSZXN1bHQpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBlbnRyaWVzKG1hcCwgZGVwdGgpIHtcbiAgICBpZiAoKytkZXB0aCA+IGtleXMubGVuZ3RoKSByZXR1cm4gbWFwO1xuICAgIHZhciBhcnJheSwgc29ydEtleSA9IHNvcnRLZXlzW2RlcHRoIC0gMV07XG4gICAgaWYgKHJvbGx1cCAhPSBudWxsICYmIGRlcHRoID49IGtleXMubGVuZ3RoKSBhcnJheSA9IG1hcC5lbnRyaWVzKCk7XG4gICAgZWxzZSBhcnJheSA9IFtdLCBtYXAuZWFjaChmdW5jdGlvbih2LCBrKSB7IGFycmF5LnB1c2goe2tleTogaywgdmFsdWVzOiBlbnRyaWVzKHYsIGRlcHRoKX0pOyB9KTtcbiAgICByZXR1cm4gc29ydEtleSAhPSBudWxsID8gYXJyYXkuc29ydChmdW5jdGlvbihhLCBiKSB7IHJldHVybiBzb3J0S2V5KGEua2V5LCBiLmtleSk7IH0pIDogYXJyYXk7XG4gIH1cblxuICByZXR1cm4gbmVzdCA9IHtcbiAgICBvYmplY3Q6IGZ1bmN0aW9uKGFycmF5KSB7IHJldHVybiBhcHBseShhcnJheSwgMCwgY3JlYXRlT2JqZWN0LCBzZXRPYmplY3QpOyB9LFxuICAgIG1hcDogZnVuY3Rpb24oYXJyYXkpIHsgcmV0dXJuIGFwcGx5KGFycmF5LCAwLCBjcmVhdGVNYXAsIHNldE1hcCk7IH0sXG4gICAgZW50cmllczogZnVuY3Rpb24oYXJyYXkpIHsgcmV0dXJuIGVudHJpZXMoYXBwbHkoYXJyYXksIDAsIGNyZWF0ZU1hcCwgc2V0TWFwKSwgMCk7IH0sXG4gICAga2V5OiBmdW5jdGlvbihkKSB7IGtleXMucHVzaChkKTsgcmV0dXJuIG5lc3Q7IH0sXG4gICAgc29ydEtleXM6IGZ1bmN0aW9uKG9yZGVyKSB7IHNvcnRLZXlzW2tleXMubGVuZ3RoIC0gMV0gPSBvcmRlcjsgcmV0dXJuIG5lc3Q7IH0sXG4gICAgc29ydFZhbHVlczogZnVuY3Rpb24ob3JkZXIpIHsgc29ydFZhbHVlcyA9IG9yZGVyOyByZXR1cm4gbmVzdDsgfSxcbiAgICByb2xsdXA6IGZ1bmN0aW9uKGYpIHsgcm9sbHVwID0gZjsgcmV0dXJuIG5lc3Q7IH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlT2JqZWN0KCkge1xuICByZXR1cm4ge307XG59XG5cbmZ1bmN0aW9uIHNldE9iamVjdChvYmplY3QsIGtleSwgdmFsdWUpIHtcbiAgb2JqZWN0W2tleV0gPSB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWFwKCkge1xuICByZXR1cm4gbWFwKCk7XG59XG5cbmZ1bmN0aW9uIHNldE1hcChtYXAsIGtleSwgdmFsdWUpIHtcbiAgbWFwLnNldChrZXksIHZhbHVlKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG1hcCkge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gbWFwKSBrZXlzLnB1c2goa2V5KTtcbiAgcmV0dXJuIGtleXM7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihtYXApIHtcbiAgdmFyIHZhbHVlcyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gbWFwKSB2YWx1ZXMucHVzaChtYXBba2V5XSk7XG4gIHJldHVybiB2YWx1ZXM7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEd0ZXhVcmxzKCl7XG4gICAgY29uc3QgaG9zdCA9IFwiaHR0cHM6Ly9ndGV4cG9ydGFsLm9yZy9yZXN0L3YxL1wiOyAvLyBOT1RFOiB0b3AgZXhwcmVzc2VkIGdlbmVzIGFyZSBub3QgeWV0IGluIHByb2R1Y3Rpb25cbiAgICByZXR1cm4ge1xuICAgICAgICAvLyBcImdlbmVFeHBcIjogXCJodHRwczovL2d0ZXhwb3J0YWwub3JnL3Jlc3QvdjEvZGF0YXNldC9mZWF0dXJlRXhwcmVzc2lvbj9mZWF0dXJlPWdlbmUmZ2VuY29kZV9pZD1cIixcbiAgICAgICAgXCJnZW5lSWRcIjogaG9zdCArIFwicmVmZXJlbmNlL2dlbmVJZD9mb3JtYXQ9anNvbiZnZW5lSWQ9XCIsXG4gICAgICAgIFwiZ2VuZUV4cFwiOiBob3N0ICsgXCJleHByZXNzaW9uL2dlbmVFeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmdlbmNvZGVJZD1cIixcbiAgICAgICAgXCJ0aXNzdWVcIjogIGhvc3QgKyBcImRhdGFzZXQvdGlzc3VlSW5mb1wiLFxuICAgICAgICBcInRvcEluVGlzc3VlRmlsdGVyZWRcIjogaG9zdCArIFwiZXhwcmVzc2lvbi90b3BFeHByZXNzZWRHZW5lcz9kYXRhc2V0SWQ9Z3RleF92NyZmaWx0ZXJNdEdlbmU9dHJ1ZSZzb3J0X2J5PW1lZGlhbiZzb3J0RGlyZWN0aW9uPWRlc2MmcGFnZV9zaXplPTUwJnRpc3N1ZUlkPVwiLFxuICAgICAgICBcInRvcEluVGlzc3VlXCI6IGhvc3QgKyBcImV4cHJlc3Npb24vdG9wRXhwcmVzc2VkR2VuZXM/ZGF0YXNldElkPWd0ZXhfdjcmc29ydF9ieT1tZWRpYW4mc29ydERpcmVjdGlvbj1kZXNjJnBhZ2Vfc2l6ZT01MCZ0aXNzdWVJZD1cIixcbiAgICAgICAgXCJtZWRFeHBCeUlkXCI6IGhvc3QgKyBcImV4cHJlc3Npb24vbWVkaWFuR2VuZUV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmaGNsdXN0ZXI9dHJ1ZSZwYWdlX3NpemU9MTAwMDAmZ2VuY29kZUlkPVwiLFxuXG4gICAgICAgIFwiZXhvbkV4cFwiOiBob3N0ICsgXCJleHByZXNzaW9uL2V4b25FeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmdlbmNvZGVJZD1cIixcbiAgICAgICAgXCJqdW5jdGlvbkV4cFwiOiBob3N0ICsgXCJleHByZXNzaW9uL2p1bmN0aW9uRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZoY2x1c3Rlcj10cnVlJmdlbmNvZGVJZD1cIixcbiAgICAgICAgXCJpc29mb3JtRXhwXCI6IGhvc3QgKyBcImV4cHJlc3Npb24vaXNvZm9ybUV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmYm94cGxvdERldGFpbD1tZWRpYW4mZ2VuY29kZUlkPVwiLFxuXG4gICAgICAgIFwiZ2VuZU1vZGVsXCI6IGhvc3QgKyBcInJlZmVyZW5jZS9jb2xsYXBzZWRHZW5lTW9kZWw/dW5maWx0ZXJlZD1mYWxzZSZyZWxlYXNlPXY3JmdlbmNvZGVfaWQ9XCIsXG4gICAgICAgIFwiZ2VuZU1vZGVsVW5maWx0ZXJlZFwiOiBob3N0ICsgXCJyZWZlcmVuY2UvY29sbGFwc2VkR2VuZU1vZGVsP3VuZmlsdGVyZWQ9dHJ1ZSZyZWxlYXNlPXY3JmdlbmNvZGVfaWQ9XCIsXG4gICAgICAgIFwiaXNvZm9ybVwiOiBob3N0ICsgXCJyZWZlcmVuY2UvdHJhbnNjcmlwdD9yZWxlYXNlPXY3JmdlbmNvZGVfaWQ9XCIsXG5cbiAgICAgICAgXCJsaXZlckdlbmVFeHBcIjogXCJkYXRhL3RvcDUwLmdlbmVzLmxpdmVyLmdlbm9taWMubWVkaWFuLnRwbS5qc29uXCIsIC8vIHRvcCA1MCBnZW5lcyBpbiBHVEV4IGxpdmVyXG4gICAgICAgIFwiY2VyZWJlbGx1bUdlbmVFeHBcIjogXCJkYXRhL3RvcC5ndGV4LmNlcmViZWxsdW0uZ2VuZXMubWVkaWFuLnRwbS50c3ZcIixcbiAgICAgICAgXCJtYXlvR2VuZUV4cFwiOiBcImRhdGEvZ3RleCttYXlvLnRvcC5jZXJlYmVsbHVtX2FkLmdlbmVzLm1lZGlhbi50cG0udHN2XCIgLy8gdGhlIHRvcCA1MCBnZW5lcyBpbiBNYXlvIENlcmViZWxsdW1fQUQgKyB0aGVpciBndGV4IGV4cHJlc3Npb24gdmFsdWVzXG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGlzc3VlQ2x1c3RlcnMoZGF0YXNldCl7XG4gICAgY29uc3QgdHJlZXMgPSB7XG4gICAgICAgICd0b3A1MExpdmVyJzogXCIoKCgoKCgoKCgoKCgoQnJhaW5fTnVjbGV1c19hY2N1bWJlbnNfYmFzYWxfZ2FuZ2xpYTowLjY1LEJyYWluX0NhdWRhdGVfYmFzYWxfZ2FuZ2xpYTowLjY1KTowLjEyLEJyYWluX1B1dGFtZW5fYmFzYWxfZ2FuZ2xpYTowLjc3KTowLjE4LEJyYWluX0FteWdkYWxhOjAuOTUpOjAuNDgsKChCcmFpbl9Gcm9udGFsX0NvcnRleF9CQTk6MC4zMyxCcmFpbl9Db3J0ZXg6MC4zMyk6MC40NyxCcmFpbl9BbnRlcmlvcl9jaW5ndWxhdGVfY29ydGV4X0JBMjQ6MC44MCk6MC42Myk6MC4zNiwoKEJyYWluX0h5cG90aGFsYW11czowLjk0LEJyYWluX0hpcHBvY2FtcHVzOjAuOTQpOjAuNDcsQnJhaW5fU3Vic3RhbnRpYV9uaWdyYToxLjQxKTowLjM3KTowLjc2LEJyYWluX1NwaW5hbF9jb3JkX2NlcnZpY2FsX2MtMToyLjU0KTowLjI5LChCcmFpbl9DZXJlYmVsbHVtOjAuNDMsQnJhaW5fQ2VyZWJlbGxhcl9IZW1pc3BoZXJlOjAuNDMpOjIuNDEpOjEuNjYsVGVzdGlzOjQuNTApOjAuMjgsKCgoKCgoKCgoKCgoKCgoKCgoRXNvcGhhZ3VzX011c2N1bGFyaXM6MC4zNCxFc29waGFndXNfR2FzdHJvZXNvcGhhZ2VhbF9KdW5jdGlvbjowLjM0KTowLjYwLENvbG9uX1NpZ21vaWQ6MC45NSk6MC40NCxVdGVydXM6MS4zOSk6MC40MCxCbGFkZGVyOjEuNzkpOjAuMTIsKChWYWdpbmE6MS4yOSxDZXJ2aXhfRWN0b2NlcnZpeDoxLjI5KTowLjMwLENlcnZpeF9FbmRvY2Vydml4OjEuNTkpOjAuMzEpOjAuMTMsQ29sb25fVHJhbnN2ZXJzZToyLjAzKTowLjIwLE92YXJ5OjIuMjMpOjAuMjUsKChTa2luX1N1bl9FeHBvc2VkX0xvd2VyX2xlZzowLjYwLFNraW5fTm90X1N1bl9FeHBvc2VkX1N1cHJhcHViaWM6MC42MCk6MS4xOCxFc29waGFndXNfTXVjb3NhOjEuNzcpOjAuNzEpOjAuMDUsKFRoeXJvaWQ6MS44NyxQcm9zdGF0ZToxLjg3KTowLjY2KTowLjE1LCgoKChBcnRlcnlfQ29yb25hcnk6MS4yNCxBcnRlcnlfQW9ydGE6MS4yNCk6MC4zNSxOZXJ2ZV9UaWJpYWw6MS42MCk6MC40MixBcnRlcnlfVGliaWFsOjIuMDEpOjAuMjcsRmFsbG9waWFuX1R1YmU6Mi4yOSk6MC4zOSk6MC40MSxDZWxsc19UcmFuc2Zvcm1lZF9maWJyb2JsYXN0czozLjA5KTowLjA2LFBpdHVpdGFyeTozLjE1KTowLjIzLEx1bmc6My4zNyk6MC4wOCwoKEhlYXJ0X0xlZnRfVmVudHJpY2xlOjEuOTcsSGVhcnRfQXRyaWFsX0FwcGVuZGFnZToxLjk3KToxLjI5LE11c2NsZV9Ta2VsZXRhbDozLjI2KTowLjE5KTowLjE2LFN0b21hY2g6My42MSk6MC4yNyxTcGxlZW46My44OSk6MC4yMCwoKChCcmVhc3RfTWFtbWFyeV9UaXNzdWU6MS42NSxBZGlwb3NlX1N1YmN1dGFuZW91czoxLjY1KTowLjQ1LEFkaXBvc2VfVmlzY2VyYWxfT21lbnR1bToyLjA5KToxLjIwLE1pbm9yX1NhbGl2YXJ5X0dsYW5kOjMuMjkpOjAuNzkpOjAuMDgsQWRyZW5hbF9HbGFuZDo0LjE3KTowLjYwKTowLjU2LChTbWFsbF9JbnRlc3RpbmVfVGVybWluYWxfSWxldW06NC4yOCxLaWRuZXlfQ29ydGV4OjQuMjgpOjEuMDYpOjAuNjAsKFdob2xlX0Jsb29kOjQuMzgsQ2VsbHNfRUJWLXRyYW5zZm9ybWVkX2x5bXBob2N5dGVzOjQuMzgpOjEuNTYpOjAuMTAsUGFuY3JlYXM6Ni4wNCk6MTMuMDUsTGl2ZXI6MTkuMDgpO1wiLFxuICAgICAgICAndG9wNTBDZXJlYmVsbHVtX2d0ZXgnOiBcIigoKCgoKEJyYWluX1N1YnN0YW50aWFfbmlncmE6MS42OSxCcmFpbl9IeXBvdGhhbGFtdXM6MS42OSk6MC4zNywoKChCcmFpbl9QdXRhbWVuX2Jhc2FsX2dhbmdsaWE6MC43NSxCcmFpbl9DYXVkYXRlX2Jhc2FsX2dhbmdsaWE6MC43NSk6MC4yOSxCcmFpbl9OdWNsZXVzX2FjY3VtYmVuc19iYXNhbF9nYW5nbGlhOjEuMDMpOjAuMTcsKEJyYWluX0hpcHBvY2FtcHVzOjAuNzcsQnJhaW5fQW15Z2RhbGE6MC43Nyk6MC40Myk6MC44Nik6MC4yMSwoKChCcmFpbl9Db3J0ZXhfTWF5bzowLjU1LEJyYWluX0NvcnRleF9BRF9NYXlvOjAuNTUpOjAuNTUsQnJhaW5fQW50ZXJpb3JfY2luZ3VsYXRlX2NvcnRleF9CQTI0OjEuMTApOjAuMTEsKEJyYWluX0Zyb250YWxfQ29ydGV4X0JBOTowLjc3LEJyYWluX0NvcnRleDowLjc3KTowLjQ0KToxLjA1KToxLjAyLEJyYWluX1NwaW5hbF9jb3JkX2NlcnZpY2FsX2MtMTozLjI4KToxLjUzLCgoQnJhaW5fQ2VyZWJlbGx1bTowLjcyLEJyYWluX0NlcmViZWxsYXJfSGVtaXNwaGVyZTowLjcyKTowLjUxLChCcmFpbl9DZXJlYmVsbHVtX01heW86MC41OSxCcmFpbl9DZXJlYmVsbHVtX0FEX01heW86MC41OSk6MC42NSk6My41Nyk6My40MSwoKCgoUGFuY3JlYXM6My43NyxMaXZlcjozLjc3KTowLjI5LFdob2xlX0Jsb29kOjQuMDYpOjAuNDAsKChIZWFydF9MZWZ0X1ZlbnRyaWNsZToxLjkyLEhlYXJ0X0F0cmlhbF9BcHBlbmRhZ2U6MS45Mik6MC44MSxNdXNjbGVfU2tlbGV0YWw6Mi43Myk6MS43Myk6MC4wNywoKCgoKCgoKCgoKChVdGVydXM6MS4wMyxGYWxsb3BpYW5fVHViZToxLjAzKTowLjU3LFByb3N0YXRlOjEuNjApOjAuMjIsKChBcnRlcnlfVGliaWFsOjEuMDksQXJ0ZXJ5X0FvcnRhOjEuMDkpOjAuMTAsQXJ0ZXJ5X0Nvcm9uYXJ5OjEuMTkpOjAuNjIpOjAuMTMsKCgoKChCcmVhc3RfTWFtbWFyeV9UaXNzdWU6MC43MyxBZGlwb3NlX1Zpc2NlcmFsX09tZW50dW06MC43Myk6MC4yMixBZGlwb3NlX1N1YmN1dGFuZW91czowLjk1KTowLjQzLEx1bmc6MS4zOCk6MC4yMyxUaHlyb2lkOjEuNjEpOjAuMTAsKCgoQ2Vydml4X0VuZG9jZXJ2aXg6MC42NCxDZXJ2aXhfRWN0b2NlcnZpeDowLjY0KTowLjI5LFZhZ2luYTowLjkzKTowLjY0LEJsYWRkZXI6MS41Nyk6MC4xNCk6MC4yMyk6MC4zMiwoKEVzb3BoYWd1c19NdXNjdWxhcmlzOjAuMzcsRXNvcGhhZ3VzX0dhc3Ryb2Vzb3BoYWdlYWxfSnVuY3Rpb246MC4zNyk6MC44OSxDb2xvbl9TaWdtb2lkOjEuMjUpOjEuMDEpOjAuMTEsTmVydmVfVGliaWFsOjIuMzcpOjAuMDksKCgoKFNtYWxsX0ludGVzdGluZV9UZXJtaW5hbF9JbGV1bToxLjQzLENvbG9uX1RyYW5zdmVyc2U6MS40Myk6MC4yOSxTdG9tYWNoOjEuNzMpOjAuMTksKE1pbm9yX1NhbGl2YXJ5X0dsYW5kOjEuNDQsRXNvcGhhZ3VzX011Y29zYToxLjQ0KTowLjQ3KTowLjIyLChTa2luX1N1bl9FeHBvc2VkX0xvd2VyX2xlZzowLjYzLFNraW5fTm90X1N1bl9FeHBvc2VkX1N1cHJhcHViaWM6MC42Myk6MS41MSk6MC4zMyk6MC4zMSxPdmFyeToyLjc3KTowLjM0LChTcGxlZW46Mi43MixLaWRuZXlfQ29ydGV4OjIuNzIpOjAuMzkpOjAuNDYsKFRlc3RpczozLjA2LEFkcmVuYWxfR2xhbmQ6My4wNik6MC41MCk6MC42MSwoQ2VsbHNfVHJhbnNmb3JtZWRfZmlicm9ibGFzdHM6My40NyxDZWxsc19FQlYtdHJhbnNmb3JtZWRfbHltcGhvY3l0ZXM6My40Nyk6MC43MSk6MC4yMyxQaXR1aXRhcnk6NC40MSk6MC4xMik6My42OCk7XCIsXG4gICAgICAgICd0b3A1MENlcmViZWxsdW1fQUQnOiBcIigoKCgoKCgoKCgoKCgoKCgoKChWYWdpbmE6MC42NCxDZXJ2aXhfRWN0b2NlcnZpeDowLjY0KTowLjI1LENlcnZpeF9FbmRvY2Vydml4OjAuODkpOjAuMzYsQmxhZGRlcjoxLjI1KTowLjI0LCgoKEJyZWFzdF9NYW1tYXJ5X1Rpc3N1ZTowLjczLEFkaXBvc2VfVmlzY2VyYWxfT21lbnR1bTowLjczKTowLjA3LEFkaXBvc2VfU3ViY3V0YW5lb3VzOjAuODApOjAuMzksTHVuZzoxLjE5KTowLjMwKTowLjAxLFRoeXJvaWQ6MS41MCk6MC4xNSwoKFV0ZXJ1czowLjg4LEZhbGxvcGlhbl9UdWJlOjAuODgpOjAuMzQsUHJvc3RhdGU6MS4yMik6MC40Myk6MC4xNCwoKEFydGVyeV9Db3JvbmFyeToxLjA1LEFydGVyeV9Bb3J0YToxLjA1KTowLjE4LEFydGVyeV9UaWJpYWw6MS4yMyk6MC41NSk6MC4zNywoKEVzb3BoYWd1c19NdXNjdWxhcmlzOjAuMzcsRXNvcGhhZ3VzX0dhc3Ryb2Vzb3BoYWdlYWxfSnVuY3Rpb246MC4zNyk6MC44MSxDb2xvbl9TaWdtb2lkOjEuMTkpOjAuOTcpOjAuMDcsKCgoTWlub3JfU2FsaXZhcnlfR2xhbmQ6MS40NCxFc29waGFndXNfTXVjb3NhOjEuNDQpOjAuMzksKFNraW5fU3VuX0V4cG9zZWRfTG93ZXJfbGVnOjAuNTQsU2tpbl9Ob3RfU3VuX0V4cG9zZWRfU3VwcmFwdWJpYzowLjU0KToxLjMwKTowLjE0LCgoU21hbGxfSW50ZXN0aW5lX1Rlcm1pbmFsX0lsZXVtOjEuNDMsQ29sb25fVHJhbnN2ZXJzZToxLjQzKTowLjE2LFN0b21hY2g6MS42MCk6MC4zNyk6MC4yNSk6MC4zNixPdmFyeToyLjU5KTowLjI4LFNwbGVlbjoyLjg2KTowLjI1LE5lcnZlX1RpYmlhbDozLjExKTowLjI5LChUZXN0aXM6Mi43MixBZHJlbmFsX0dsYW5kOjIuNzIpOjAuNjgpOjAuMTAsKCgoKEhlYXJ0X0xlZnRfVmVudHJpY2xlOjEuODEsSGVhcnRfQXRyaWFsX0FwcGVuZGFnZToxLjgxKTowLjY4LEtpZG5leV9Db3J0ZXg6Mi40OSk6MC42MixNdXNjbGVfU2tlbGV0YWw6My4xMSk6MC4yMCxQYW5jcmVhczozLjMxKTowLjE4KTowLjIyLFBpdHVpdGFyeTozLjcxKTowLjczLExpdmVyOjQuNDQpOjAuMDUsKENlbGxzX1RyYW5zZm9ybWVkX2ZpYnJvYmxhc3RzOjMuNTksQ2VsbHNfRUJWLXRyYW5zZm9ybWVkX2x5bXBob2N5dGVzOjMuNTkpOjAuOTApOjAuNjQsV2hvbGVfQmxvb2Q6NS4xNCk6Mi4xNywoKCgoQnJhaW5fQ2VyZWJlbGx1bV9NYXlvOjAuNzcsQnJhaW5fQ2VyZWJlbGx1bV9BRF9NYXlvOjAuNzcpOjEuMDksKEJyYWluX0NvcnRleF9NYXlvOjAuNjUsQnJhaW5fQ29ydGV4X0FEX01heW86MC42NSk6MS4yMSk6MC40NCwoQnJhaW5fQ2VyZWJlbGx1bTowLjkyLEJyYWluX0NlcmViZWxsYXJfSGVtaXNwaGVyZTowLjkyKToxLjM4KTowLjg1LCgoKCgoKEJyYWluX0hpcHBvY2FtcHVzOjAuNTgsQnJhaW5fQW15Z2RhbGE6MC41OCk6MC4zNixCcmFpbl9OdWNsZXVzX2FjY3VtYmVuc19iYXNhbF9nYW5nbGlhOjAuOTQpOjAuMDIsKEJyYWluX1B1dGFtZW5fYmFzYWxfZ2FuZ2xpYTowLjU3LEJyYWluX0NhdWRhdGVfYmFzYWxfZ2FuZ2xpYTowLjU3KTowLjM5KTowLjMzLChCcmFpbl9TdWJzdGFudGlhX25pZ3JhOjAuODksQnJhaW5fSHlwb3RoYWxhbXVzOjAuODkpOjAuMzkpOjAuMTksKChCcmFpbl9Db3J0ZXg6MC43OCxCcmFpbl9BbnRlcmlvcl9jaW5ndWxhdGVfY29ydGV4X0JBMjQ6MC43OCk6MC4yMyxCcmFpbl9Gcm9udGFsX0NvcnRleF9CQTk6MS4wMSk6MC40Nik6MC42OSxCcmFpbl9TcGluYWxfY29yZF9jZXJ2aWNhbF9jLTE6Mi4xNyk6MC45OCk6NC4xNSk7XCJcbiAgICB9O1xuICAgIHJldHVybiB0cmVlc1tkYXRhc2V0XTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEdlbmVDbHVzdGVycyhkYXRhc2V0KXtcbiAgICBjb25zdCB0cmVlcyA9IHtcbiAgICAgICAgJ3RvcDUwTGl2ZXInOiBcIigoKCgoKChNVDJBOjIuODEsTVQxWDoyLjgxKToxLjYzLFBFQlAxOjQuNDQpOjAuNzcsKFRQVDE6My44NyxJRklUTTM6My44Nyk6MS4zNCk6MC44OSwoKFNFUlBJTkcxOjIuMDgsSUdGQlA0OjIuMDgpOjIuMjksQzM6NC4zNik6MS43NSk6MS4wNCxBUE9FOjcuMTUpOjEuOTIsKE1UQVRQNlAxOjMuNDEsRlRMOjMuNDEpOjUuNjUpOjYuOTYsKCgoKFJCUDQ6NS42NyxNVDFHOjUuNjcpOjAuMjIsKChURjo1LjE4LEFQT0MxOjUuMTgpOjAuNDMsQUdUOjUuNjIpOjAuMjgpOjAuNjYsKCgoKCgoSVRJSDQ6My4xMSxDRkI6My4xMSk6MC41MCxBVEY1OjMuNjEpOjAuNTUsKFNFUlBJTkYyOjMuMjAsQ1lQMkUxOjMuMjApOjAuOTcpOjAuNzksU0VSUElOQTE6NC45Nik6MC4zNSxTRVJQSU5BMzo1LjMwKTowLjI4LFNBQTE6NS41OSk6MC45OCk6MC45OSwoKCgoKCgoSFBEOjMuMzEsQUxCOjMuMzEpOjAuMjYsVlROOjMuNTcpOjAuMjAsKCgoKCgoKCgoRkdCOjEuMTQsRkdBOjEuMTQpOjAuMTUsQ1JQOjEuMjkpOjAuMTQsRkdHOjEuNDMpOjAuMTYsKCgoKCgoU0VSUElOQzE6MC42NCxBSFNHOjAuNjQpOjAuMTYsQVBDUzowLjgwKTowLjA3LEFQT0EyOjAuODcpOjAuMTIsQUdYVDowLjk4KTowLjM1LE9STTI6MS4zMyk6MC4wMiwoR0M6MS4wNixBUE9IOjEuMDYpOjAuMjkpOjAuMjMpOjAuNDAsKEZHTDE6MS4yMCxBTUJQOjEuMjApOjAuNzgpOjAuMTEsT1JNMToyLjEwKTowLjIzLFNBQTQ6Mi4zMyk6MC4zNCxBUE9DMzoyLjY3KTowLjA3LEhQWDoyLjc0KToxLjAzKTowLjI4LEFQT0ExOjQuMDQpOjAuMTQsKFNBQTI6My43MyxIUDozLjczKTowLjQ2KTowLjEyLFRUUjo0LjMwKTowLjQyLEFMRE9COjQuNzMpOjIuODIpOjguNDcpO1wiLFxuICAgICAgICAndG9wNTBDZXJlYmVsbHVtX0FEJzogXCIoKCgoKCgoKFBSTlA6Mi44MixDQUxNMToyLjgyKTowLjc0LE5EUkcyOjMuNTcpOjAuMjUsQ1BFOjMuODIpOjAuMjIsQ0tCOjQuMDMpOjEuMTAsQVBPRTo1LjEzKTowLjc3LCgoKFpCVEIxODoyLjQ1LFJON1NLOjIuNDUpOjEuMzYsKFJON1NMMjoxLjQyLFJON1NMMToxLjQyKToyLjM5KTowLjQwLChFTk8yOjMuMjksQUxET0M6My4yOSk6MC45Mik6MS42OSk6Mi43MCwoKCgoKCgoKChIU1BBODoxLjM2LEhTUDkwQUExOjEuMzYpOjAuMDgsKEVJRjRBMjoxLjIzLEFFUzoxLjIzKTowLjIxKTowLjcyLExESEI6Mi4xNik6MC4yMCxJVE0yQjoyLjM2KTowLjA5LChQRUJQMToxLjk5LENBTE0yOjEuOTkpOjAuNDUpOjAuMzIsTUFMQVQxOjIuNzYpOjEuNDcsQ0xVOjQuMjMpOjAuMjUsKCgoKFBTQVA6MS40NyxIU1A5MEFCMToxLjQ3KTowLjM1LCgoKFJQUzI1OjAuODksRUVGMjowLjg5KTowLjQxLFJQTDM6MS4zMCk6MC4wOSwoKCgoKFJQUzI3QTowLjYwLFJQTDk6MC42MCk6MC4wOCxSUEwxNzowLjY4KTowLjExLFJQUzEzOjAuNzkpOjAuMDMsUlBMNTowLjgyKTowLjE2LChSUEwyNDowLjQzLFJQTDIxOjAuNDMpOjAuNTUpOjAuNDIpOjAuNDMpOjAuODcsR0FQREg6Mi42OSk6MC4xMiwoKCgoUlBTMTg6MC42MixSUEwxM0E6MC42Mik6MC4xMiwoUlBTMTI6MC41OSxSUFMxMTowLjU5KTowLjE1KTowLjQ3LEVFRjFBMToxLjIxKToxLjA4LEFDVEI6Mi4yOSk6MC41Mik6MS42Nyk6MS4zMCwoTVRBVFA2UDE6My40OSxGVEw6My40OSk6Mi4yOSk6Mi44Myk6NS44NSwoKCgoKFNUTU4yOjIuNzEsQVRQNlYxRzI6Mi43MSk6MC43MyxTTkFQMjU6My40NSk6MC4yOCxUVUJCNEE6My43Mik6MC40MSxDRFIxOjQuMTMpOjAuMzQsKE1UMzozLjA0LEdGQVA6My4wNCk6MS40NCk6OS45Nyk7XCIsXG4gICAgICAgICd0b3A1MENlcmViZWxsdW1fZ3RleCc6IFwiKCgoKCgoKEVOTzI6My4yOSxBTERPQzozLjI5KTowLjg0LCgoUEhZSElQOjIuNjgsQ0ExMToyLjY4KTowLjU4LFBSUlQyOjMuMjUpOjAuODgpOjEuMTAsQ1BFOjUuMjQpOjEuNjksRUVGMUEyOjYuOTMpOjAuNDcsQVBPRTo3LjQwKToxLjEyLCgoKCgoKChUTUVNNTlMOjIuMzIsQVRQNlYxRzI6Mi4zMik6MC42NyxTVE1OMjoyLjk5KTowLjM2LFNOQVAyNTozLjM1KTowLjQzLFRVQkI0QTozLjc4KTowLjY3LCgoTElOQzAwNTk5OjEuODksR0FCUkQ6MS44OSk6MS41MyxTTkNCOjMuNDEpOjEuMDMpOjAuODcsR0ZBUDo1LjMxKToxLjQ1LCgoUFZBTEI6My41NyxDQkxOMTozLjU3KToxLjI3LENCTE4zOjQuODQpOjEuOTIpOjEuNzYpOjUuNzQsKCgoTVRBVFA2UDE6My40OSxGVEw6My40OSk6MS4wOCwoKCgoUFNBUDoxLjQ3LEhTUDkwQUIxOjEuNDcpOjAuNDUsKCgoUlBTMjU6MC44OSxFRUYyOjAuODkpOjAuNDAsKChSUFMyN0E6MC42MCxSUEw5OjAuNjApOjAuMDgsUlBMMTc6MC42OCk6MC42MCk6MC4wMyxSUEwzOjEuMzIpOjAuNjEpOjAuNzAsR0FQREg6Mi42Mik6MC4xMywoKCgoUlBTMTg6MC42MixSUEwxM0E6MC42Mik6MC4xMiwoUlBTMTI6MC41OSxSUFMxMTowLjU5KTowLjE1KTowLjQ3LEVFRjFBMToxLjIxKToxLjA4LEFDVEI6Mi4yOSk6MC40Nik6MS44Mik6MC44MywoKENMVTo0LjA4LENLQjo0LjA4KTowLjI5LCgoKChTTlJOUDcwOjEuOTAsUFRNUzoxLjkwKTowLjQyLCgoKEVJRjRBMjoxLjIzLEFFUzoxLjIzKTowLjIyLEhTUEE4OjEuNDUpOjAuMzUsQVRQNUI6MS44MCk6MC41Mik6MC42MSwoQ0FMTTM6MS42OCxDQUxNMToxLjY4KToxLjI2KTowLjE0LCgoUEVCUDE6MS45OSxDQUxNMjoxLjk5KTowLjMxLE1UTkQyUDI4OjIuMzApOjAuNzgpOjEuMjgpOjEuMDMpOjguODYpO1wiXG4gICAgfTtcbiAgICByZXR1cm4gdHJlZXNbZGF0YXNldF07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRpc3N1ZXMoZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9IFwidGlzc3VlSW5mb1wiO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZVRpc3N1ZXMgaW5wdXQgZXJyb3IuXCI7XG4gICAgY29uc3QgdGlzc3VlcyA9IGRhdGFbYXR0cl07XG5cbiAgICAvLyBzYW5pdHkgY2hlY2tcbiAgICBbXCJ0aXNzdWVJZFwiLCBcInRpc3N1ZU5hbWVcIiwgXCJjb2xvckhleFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIXRpc3N1ZXNbMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlVGlzc3VlIGF0dHIgbm90IGZvdW5kOiBcIiArIGQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGlzc3Vlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRXhvbnMoZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9IFwiY29sbGFwc2VkR2VuZU1vZGVsXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlRXhvbnMgaW5wdXQgZXJyb3IuXCI7XG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgW1wiZmVhdHVyZVR5cGVcIl0uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCFkYXRhW2F0dHJdWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZUV4b25zIGF0dHIgbm90IGZvdW5kOiBcIiArIGQ7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl0uZmlsdGVyKChkKT0+ZC5mZWF0dXJlVHlwZSA9PSBcImV4b25cIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUp1bmN0aW9ucyhkYXRhKXtcbiAgICAvLyB3ZSBkbyBub3Qgc3RvcmUganVuY3Rpb24gYW5ub3RhdGlvbnMgaW4gTW9uZ29cbiAgICAvLyBzbyBoZXJlIHdlIHVzZSB0aGUganVuY3Rpb24gZXhwcmVzc2lvbiB3ZWIgc2VydmljZSB0byBwYXJzZSB0aGUganVuY3Rpb25zXG4gICAgLy8gYXNzdW1pbmcgdGhhdCBlYWNoIHRpc3N1ZSBoYXMgdGhlIHNhbWUganVuY3Rpb25zLCB0byBncmFiIGFsbCB0aGUga25vd25cbiAgICAvLyBqdW5jdGlvbnMgb2YgYSBnZW5lLCB3ZSBvbmx5IG5lZWQgdG8gbG9vayBhdCBvbmUgdGlzc3VlXG4gICAgLy8gaGVyZSB3ZSB1c2UgTGl2ZXJcbiAgICBjb25zdCBhdHRyID0gXCJqdW5jdGlvbkV4cHJlc3Npb25cIjtcbiAgICByZXR1cm4gZGF0YVthdHRyXS5maWx0ZXIoKGQpPT57cmV0dXJuIGQudGlzc3VlSWQ9PVwiTGl2ZXJcIn0pXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoKGQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3MgPSBkLmp1bmN0aW9uSWQuc3BsaXQoXCJfXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbTogcG9zWzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNocm9tU3RhcnQ6IHBvc1sxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbUVuZDogcG9zWzJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGp1bmN0aW9uSWQ6IGQuanVuY3Rpb25JZFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSB0cmFuc2NyaXB0IGlzb2Zvcm1zIGZyb20gdGhlIEdURXggd2ViIHNlcnZpY2U6IFwicmVmZXJlbmNlL3RyYW5zY3JpcHQ/cmVsZWFzZT12NyZnZW5jb2RlX2lkPVwiXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIHJldHVybnMgYSBkaWN0aW9uYXJ5IG9mIHRyYW5zY3JpcHQgZXhvbiBvYmplY3QgbGlzdHMgaW5kZXhlZCBieSBFTlNUIElEc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VJc29mb3JtRXhvbnMoZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9IFwidHJhbnNjcmlwdFwiO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyhcInBhcnNlSXNvZm9ybXMgaW5wdXQgZXJyb3JcIik7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl0uZmlsdGVyKChkKT0+e3JldHVybiBcImV4b25cIiA9PSBkLmZlYXR1cmVUeXBlfSlcbiAgICAgICAgLnJlZHVjZSgoYSwgZCk9PntcbiAgICAgICAgaWYgKGFbZC50cmFuc2NyaXB0SWRdID09PSB1bmRlZmluZWQpIGFbZC50cmFuc2NyaXB0SWRdID0gW107XG4gICAgICAgIGFbZC50cmFuc2NyaXB0SWRdLnB1c2goZCk7XG4gICAgICAgIHJldHVybiBhO1xuICAgIH0sIHt9KTtcblxufVxuXG4vKipcbiAqIHBhcnNlIHRyYW5zY3JpcHQgaXNvZm9ybXNcbiAqIEBwYXJhbSBkYXRhIHtKc29ufSBmcm9tIEdURXggd2ViIHNlcnZpY2UgXCJyZWZlcmVuY2UvdHJhbnNjcmlwdD9yZWxlYXNlPXY3JmdlbmNvZGVfaWQ9XCJcbiAqIHJldHVybnMgYSBsaXN0IG9mIGlzb2Zvcm0gb2JqZWN0c1xuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUlzb2Zvcm1zKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSBcInRyYW5zY3JpcHRcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coXCJwYXJzZUlzb2Zvcm1zIGlucHV0IGVycm9yXCIpO1xuICAgIHJldHVybiBkYXRhW2F0dHJdLmZpbHRlcigoZCk9PntyZXR1cm4gXCJ0cmFuc2NyaXB0XCIgPT0gZC5mZWF0dXJlVHlwZX0pLnNvcnQoKGEsIGIpPT57XG4gICAgICAgIGNvbnN0IGwxID0gTWF0aC5hYnMoYS5jaHJvbUVuZCAtIGEuY2hyb21TdGFydCkgKyAxO1xuICAgICAgICBjb25zdCBsMiA9IE1hdGguYWJzKGIuY2hyb21FbmQgLSBiLmNocm9tU3RhcnQpICsgMTtcbiAgICAgICAgcmV0dXJuIC0obDEtbDIpOyAvLyBzb3J0IGJ5IGlzb2Zvcm0gbGVuZ3RoIGluIGRlc2NlbmRpbmcgb3JkZXJcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSBmaW5hbCBnZW5lIG1vZGVsIGV4b24gZXhwcmVzc2lvblxuICogZXhwcmVzc2lvbiBpcyBub3JtYWxpemVkIHRvIHJlYWRzIHBlciBrYlxuICogQHBhcmFtIGRhdGEge0pTT059IG9mIGV4b24gZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIGV4b25zIHtMaXN0fSBvZiBleG9ucyB3aXRoIHBvc2l0aW9uc1xuICogQHBhcmFtIHVzZUxvZyB7Ym9vbGVhbn0gdXNlIGxvZzIgdHJhbnNmb3JtYXRpb25cbiAqIEBwYXJhbSBhZGp1c3Qge051bWJlcn0gZGVmYXVsdCAwLjAxXG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgZXhvbiBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV4b25FeHByZXNzaW9uKGRhdGEsIGV4b25zLCB1c2VMb2c9dHJ1ZSwgYWRqdXN0PTEpe1xuICAgIGNvbnN0IGV4b25EaWN0ID0gZXhvbnMucmVkdWNlKChhLCBkKT0+e2FbZC5leG9uSWRdID0gZDsgcmV0dXJuIGE7fSwge30pO1xuICAgIGNvbnN0IGF0dHIgPSBcImV4b25FeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KFwicGFyc2VFeG9uRXhwcmVzc2lvbiBpbnB1dCBlcnJvclwiKTtcblxuICAgIGNvbnN0IGV4b25PYmplY3RzID0gZGF0YVthdHRyXTtcbiAgICAvLyBlcnJvci1jaGVja2luZ1xuICAgIFtcImRhdGFcIiwgXCJleG9uSWRcIiwgXCJ0aXNzdWVJZFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWV4b25PYmplY3RzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZUV4b25FeHByZXNzaW9uIGF0dHIgbm90IGZvdW5kOiBcIiArIGQ7XG4gICAgfSk7XG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gZXhvbiBjb3VudHNcbiAgICBleG9uT2JqZWN0cy5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIGNvbnN0IGV4b24gPSBleG9uRGljdFtkLmV4b25JZF07IC8vIGZvciByZXRyaWV2aW5nIGV4b24gcG9zaXRpb25zXG4gICAgICAgIC8vIGVycm9yLWNoZWNraW5nXG4gICAgICAgIFtcImNocm9tRW5kXCIsIFwiY2hyb21TdGFydFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICAgICAgaWYgKCFleG9uLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZUV4b25FeHByZXNzaW9uIGF0dHIgbm90IGZvdW5kOiBcIiArIGQ7XG4gICAgICAgIH0pO1xuICAgICAgICBkLmwgPSBleG9uLmNocm9tRW5kIC0gZXhvbi5jaHJvbVN0YXJ0ICsgMTtcbiAgICAgICAgZC52YWx1ZSA9IE51bWJlcihkLmRhdGEpL2QubDtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSkvZC5sO1xuICAgICAgICBpZiAodXNlTG9nKSBkLnZhbHVlID0gTWF0aC5sb2cyKGQudmFsdWUgKyAxKTtcbiAgICAgICAgZC54ID0gZC5leG9uSWQ7XG4gICAgICAgIGQueSA9IGQudGlzc3VlSWQ7XG4gICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZFxuICAgIH0pO1xuICAgIHJldHVybiBleG9uT2JqZWN0c1xufVxuXG4vKipcbiAqIFBhcnNlIGp1bmN0aW9uIG1lZGlhbiByZWFkIGNvdW50IGRhdGFcbiAqIEBwYXJhbSBkYXRhIHtKU09OfSBvZiB0aGUganVuY2l0b24gZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIHVzZUxvZyB7Qm9vbGVhbn0gcGVyZm9ybSBsb2cgdHJhbnNmb3JtYXRpb25cbiAqIEBwYXJhbSBhZGp1c3Qge051bWJlcn0gZm9yIGhhbmRsaW5nIDAncyB3aGVuIHVzZUxvZyBpcyB0cnVlXG4gKiBAcmV0dXJucyB7TGlzdH0gb2YganVuY3Rpb24gb2JqZWN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VKdW5jdGlvbkV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gXCJqdW5jdGlvbkV4cHJlc3Npb25cIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coXCJwYXJzZUp1bmN0aW9uRXhwcmVzc2lvbiBpbnB1dCBlcnJvclwiKTtcblxuICAgIGNvbnN0IGp1bmN0aW9ucyA9IGRhdGFbYXR0cl07XG5cbiAgICAvLyBlcnJvci1jaGVja2luZ1xuICAgIFtcInRpc3N1ZUlkXCIsIFwianVuY3Rpb25JZFwiLCBcImRhdGFcIiwgXCJnZW5jb2RlSWRcIl0uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCFqdW5jdGlvbnNbMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlSnVuY3Rpb25FeHByZXNzaW9uIGF0dHIgbm90IGZvdW5kOiBcIiArIGQ7XG4gICAgfSk7XG5cbiAgICAvLyBwYXJzZSBHVEV4IG1lZGlhbiBqdW5jdGlvbiByZWFkIGNvdW50c1xuICAgIGp1bmN0aW9ucy5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMChOdW1iZXIoZC5kYXRhICsgYWRqdXN0KSk6TnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQueCA9IGQuanVuY3Rpb25JZDtcbiAgICAgICAgZC55ID0gZC50aXNzdWVJZDtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZFxuICAgIH0pO1xuICAgIHJldHVybiBqdW5jdGlvbnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUlzb2Zvcm1FeHByZXNzaW9uKGRhdGEsIHVzZUxvZz10cnVlLCBhZGp1c3Q9MSl7XG4gICAgY29uc3QgYXR0ciA9IFwiaXNvZm9ybUV4cHJlc3Npb25cIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coXCJwYXJzZUlzb2Zvcm1FeHByZXNzaW9uIGlucHV0IGVycm9yXCIpO1xuICAgIC8vIHBhcnNlIEdURXggaXNvZm9ybSBtZWRpYW4gVFBNXG4gICAgZGF0YVthdHRyXS5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMChOdW1iZXIoZC5kYXRhICsgYWRqdXN0KSk6TnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLmRhdGEpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRhdGFbYXR0cl07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1lZGlhbkV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUpe1xuICAgIGNvbnN0IGF0dHIgPSBcIm1lZGlhbkdlbmVFeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwicGFyc2VNZWRpYW5FeHByZXNzaW9uIGlucHV0IGVycm9yLlwiO1xuICAgIGNvbnN0IGFkanVzdCA9IDE7XG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gZ2VuZSBleHByZXNzaW9uXG4gICAgZGF0YS5tZWRpYW5HZW5lRXhwcmVzc2lvbi5mb3JFYWNoKGZ1bmN0aW9uKGQpe1xuICAgICAgICAvLyBUT0RPOiBlcnJvci1jaGVja2luZyBvZiB0aGUgYXR0cmlidXRlc1xuICAgICAgICBkLnZhbHVlID0gdXNlTG9nP01hdGgubG9nMTAoTnVtYmVyKGQubWVkaWFuKSArIGFkanVzdCk6TnVtYmVyKGQubWVkaWFuKTtcbiAgICAgICAgZC54ID0gZC50aXNzdWVJZDtcbiAgICAgICAgZC55ID0gZC5nZW5jb2RlSWQ7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLm1lZGlhbik7XG4gICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZFxuICAgIH0pO1xuICAgIHJldHVybiBkYXRhW2F0dHJdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VNZWRpYW5UUE0oZGF0YSwgdXNlTG9nPXRydWUpe1xuICAgIC8vIHBhcnNlIEdURXggbWVkaWFuIFRQTSBqc29uIHN0YXRpYyBmaWxlXG4gICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKGQpe1xuICAgICAgICBkLnZhbHVlID0gdXNlTG9nP01hdGgubG9nMTAoK2QubWVkaWFuVFBNICsgMSk6K2QubWVkaWFuVFBNO1xuICAgICAgICBkLnggPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLnkgPSBkLmdlbmVTeW1ib2w7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IHBhcnNlRmxvYXQoZC5tZWRpYW5UUE0pO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlR2VuZUV4cHJlc3Npb24oZ2VuY29kZUlkLCBkYXRhKXtcbiAgICAvKipcbiAgICAgKlxuICAgICAqIEB0eXBlIHt7ZXhwOiB7fSwgZ2VuZVN5bWJvbDogc3RyaW5nfX1cbiAgICAgKi9cbiAgICBsZXQgbG9va3VwVGFibGUgPSB7XG4gICAgICAgIGV4cDoge30sIC8vIGluZGV4ZWQgYnkgdGlzc3VlSWRcbiAgICAgICAgZ2VuZVN5bWJvbDogXCJcIlxuICAgIH07XG4gICAgZGF0YS5nZW5lRXhwcmVzc2lvbi5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoZC5nZW5jb2RlSWQgPT0gZ2VuY29kZUlkKSB7XG4gICAgICAgICAgICAvLyBpZiB0aGUgZ2VuY29kZSBJRCBtYXRjaGVzIHRoZSBxdWVyeSBnZW5jb2RlSWQsXG4gICAgICAgICAgICAvLyBhZGQgdGhlIGV4cHJlc3Npb24gZGF0YSB0byB0aGUgbG9va3VwIHRhYmxlXG4gICAgICAgICAgICBsb29rdXBUYWJsZS5leHBbZC50aXNzdWVJZF0gPSBkLmRhdGE7XG4gICAgICAgICAgICBpZiAoXCJcIiA9PSBsb29rdXBUYWJsZS5nZW5lU3ltYm9sKSBsb29rdXBUYWJsZS5nZW5lU3ltYm9sID0gZC5nZW5lU3ltYm9sXG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbG9va3VwVGFibGVcbn1cblxuLyoqXG4gKlxuICogQHBhcmFtIGdlbmNvZGVJZCB7U3RyaW5nfTogYSBnZW5jb2RlIElEXG4gKiBAcGFyYW0gZGF0YSB7T2JqZWN0fSBnZW5lIGV4cHJlc3Npb24gQVBJIGNhbGxcbiAqIEBwYXJhbSB1c2VMb2cge0Jvb2xlYW59XG4gKiBAcGFyYW0gY29sb3Ige1N0cmluZ31cbiAqIEBwYXJhbSB4bGlzdCB7TGlzdH06IGEgbGlzdCBvZiB0aXNzdWUgb2JqZWN0cyB7aWQ6U3RyaW5nLCBuYW1lOlN0cmluZ31cbiAqIEByZXR1cm5zIHt7eDogQXJyYXksIHk6IEFycmF5LCBuYW1lOiBzdHJpbmcsIHR5cGU6IHN0cmluZywgbGluZToge3dpZHRoOiBudW1iZXJ9LCBtYXJrZXI6IHtjb2xvcjogc3RyaW5nfX19XG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VKc29uRm9yUGxvdGx5KGdlbmNvZGVJZCwgZGF0YSwgdXNlTG9nPWZhbHNlLCBjb2xvcj1cImdyZXlcIiwgeGxpc3Qpe1xuXG4gICAgLy8gcmVmZXJlbmNlOiBodHRwczovL3Bsb3QubHkvamF2YXNjcmlwdC9ib3gtcGxvdHMvXG5cbiAgICBsZXQgbG9va3VwVGFibGUgPSBwYXJzZUdlbmVFeHByZXNzaW9uKGdlbmNvZGVJZCwgZGF0YSk7IC8vIGNvbnN0cnVjdHMgdGhlIHRpc3N1ZSBsb29rdXAgdGFibGUgaW5kZXhlZCBieSB0aXNzdWUgSURcbiAgICBsZXQgeCA9IFtdO1xuICAgIGxldCB5ID0gW107XG5cbiAgICAvLyB4bGlzdDogdGhlIHRpc3N1ZXNcbiAgICB4bGlzdC5mb3JFYWNoKChkKT0+e1xuICAgICAgICAvLyBkOiBhIHRpc3N1ZVxuICAgICAgICBpZiAobG9va3VwVGFibGUuZXhwW2QuaWRdPT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgIC8vIHdoZW4gdGhlIGdlbmUgaGFzIG5vIGV4cHJlc3Npb24gZGF0YSBpbiB0aXNzdWUgZCxcbiAgICAgICAgICAgIC8vIHByb3ZpZGUgZHVtbXkgZGF0YVxuICAgICAgICAgICAgeCA9IHguY29uY2F0KFtkLm5hbWVdKTtcbiAgICAgICAgICAgIHkgPSB5LmNvbmNhdChbLTFdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGNvbmNhdGVuYXRlIGEgbGlzdCBvZiB0aGUgdGlzc3VlIGxhYmVsIHJlcGVhdGVkbHkgKGxvb2t1cFRhYmxlLmV4cFtkXS5sZW5ndGggdGltZXMpIHRvIHhcbiAgICAgICAgICAgIC8vIGNvbmNhdGVuYXRlIGFsbCB0aGUgZXhwcmVzc2lvbiB2YWx1ZXMgdG8geVxuICAgICAgICAgICAgLy8gdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiB4IGFuZCB5IG11c3QgbWF0Y2hcbiAgICAgICAgICAgIHggPSB4LmNvbmNhdChBcnJheShsb29rdXBUYWJsZS5leHBbZC5pZF0ubGVuZ3RoKS5maWxsKGQubmFtZSkpO1xuICAgICAgICAgICAgeSA9IHkuY29uY2F0KGxvb2t1cFRhYmxlLmV4cFtkLmlkXSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgICB4OiB4LFxuICAgICAgICB5OiB5LFxuICAgICAgICBuYW1lOiBsb29rdXBUYWJsZS5nZW5lU3ltYm9sLFxuICAgICAgICB0eXBlOiAnYm94JyxcbiAgICAgICAgbGluZToge3dpZHRoOjF9LFxuICAgICAgICBtYXJrZXI6IHtjb2xvcjpjb2xvcn0sXG4gICAgfTtcblxufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IGEgPj0gYiA/IDAgOiBOYU47XG59XG4iLCJpbXBvcnQgYXNjZW5kaW5nIGZyb20gXCIuL2FzY2VuZGluZ1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjb21wYXJlKSB7XG4gIGlmIChjb21wYXJlLmxlbmd0aCA9PT0gMSkgY29tcGFyZSA9IGFzY2VuZGluZ0NvbXBhcmF0b3IoY29tcGFyZSk7XG4gIHJldHVybiB7XG4gICAgbGVmdDogZnVuY3Rpb24oYSwgeCwgbG8sIGhpKSB7XG4gICAgICBpZiAobG8gPT0gbnVsbCkgbG8gPSAwO1xuICAgICAgaWYgKGhpID09IG51bGwpIGhpID0gYS5sZW5ndGg7XG4gICAgICB3aGlsZSAobG8gPCBoaSkge1xuICAgICAgICB2YXIgbWlkID0gbG8gKyBoaSA+Pj4gMTtcbiAgICAgICAgaWYgKGNvbXBhcmUoYVttaWRdLCB4KSA8IDApIGxvID0gbWlkICsgMTtcbiAgICAgICAgZWxzZSBoaSA9IG1pZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsbztcbiAgICB9LFxuICAgIHJpZ2h0OiBmdW5jdGlvbihhLCB4LCBsbywgaGkpIHtcbiAgICAgIGlmIChsbyA9PSBudWxsKSBsbyA9IDA7XG4gICAgICBpZiAoaGkgPT0gbnVsbCkgaGkgPSBhLmxlbmd0aDtcbiAgICAgIHdoaWxlIChsbyA8IGhpKSB7XG4gICAgICAgIHZhciBtaWQgPSBsbyArIGhpID4+PiAxO1xuICAgICAgICBpZiAoY29tcGFyZShhW21pZF0sIHgpID4gMCkgaGkgPSBtaWQ7XG4gICAgICAgIGVsc2UgbG8gPSBtaWQgKyAxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxvO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gYXNjZW5kaW5nQ29tcGFyYXRvcihmKSB7XG4gIHJldHVybiBmdW5jdGlvbihkLCB4KSB7XG4gICAgcmV0dXJuIGFzY2VuZGluZyhmKGQpLCB4KTtcbiAgfTtcbn1cbiIsImltcG9ydCBhc2NlbmRpbmcgZnJvbSBcIi4vYXNjZW5kaW5nXCI7XG5pbXBvcnQgYmlzZWN0b3IgZnJvbSBcIi4vYmlzZWN0b3JcIjtcblxudmFyIGFzY2VuZGluZ0Jpc2VjdCA9IGJpc2VjdG9yKGFzY2VuZGluZyk7XG5leHBvcnQgdmFyIGJpc2VjdFJpZ2h0ID0gYXNjZW5kaW5nQmlzZWN0LnJpZ2h0O1xuZXhwb3J0IHZhciBiaXNlY3RMZWZ0ID0gYXNjZW5kaW5nQmlzZWN0LmxlZnQ7XG5leHBvcnQgZGVmYXVsdCBiaXNlY3RSaWdodDtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gIHN0YXJ0ID0gK3N0YXJ0LCBzdG9wID0gK3N0b3AsIHN0ZXAgPSAobiA9IGFyZ3VtZW50cy5sZW5ndGgpIDwgMiA/IChzdG9wID0gc3RhcnQsIHN0YXJ0ID0gMCwgMSkgOiBuIDwgMyA/IDEgOiArc3RlcDtcblxuICB2YXIgaSA9IC0xLFxuICAgICAgbiA9IE1hdGgubWF4KDAsIE1hdGguY2VpbCgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXApKSB8IDAsXG4gICAgICByYW5nZSA9IG5ldyBBcnJheShuKTtcblxuICB3aGlsZSAoKytpIDwgbikge1xuICAgIHJhbmdlW2ldID0gc3RhcnQgKyBpICogc3RlcDtcbiAgfVxuXG4gIHJldHVybiByYW5nZTtcbn1cbiIsInZhciBlMTAgPSBNYXRoLnNxcnQoNTApLFxuICAgIGU1ID0gTWF0aC5zcXJ0KDEwKSxcbiAgICBlMiA9IE1hdGguc3FydCgyKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RhcnQsIHN0b3AsIGNvdW50KSB7XG4gIHZhciByZXZlcnNlLFxuICAgICAgaSA9IC0xLFxuICAgICAgbixcbiAgICAgIHRpY2tzLFxuICAgICAgc3RlcDtcblxuICBzdG9wID0gK3N0b3AsIHN0YXJ0ID0gK3N0YXJ0LCBjb3VudCA9ICtjb3VudDtcbiAgaWYgKHN0YXJ0ID09PSBzdG9wICYmIGNvdW50ID4gMCkgcmV0dXJuIFtzdGFydF07XG4gIGlmIChyZXZlcnNlID0gc3RvcCA8IHN0YXJ0KSBuID0gc3RhcnQsIHN0YXJ0ID0gc3RvcCwgc3RvcCA9IG47XG4gIGlmICgoc3RlcCA9IHRpY2tJbmNyZW1lbnQoc3RhcnQsIHN0b3AsIGNvdW50KSkgPT09IDAgfHwgIWlzRmluaXRlKHN0ZXApKSByZXR1cm4gW107XG5cbiAgaWYgKHN0ZXAgPiAwKSB7XG4gICAgc3RhcnQgPSBNYXRoLmNlaWwoc3RhcnQgLyBzdGVwKTtcbiAgICBzdG9wID0gTWF0aC5mbG9vcihzdG9wIC8gc3RlcCk7XG4gICAgdGlja3MgPSBuZXcgQXJyYXkobiA9IE1hdGguY2VpbChzdG9wIC0gc3RhcnQgKyAxKSk7XG4gICAgd2hpbGUgKCsraSA8IG4pIHRpY2tzW2ldID0gKHN0YXJ0ICsgaSkgKiBzdGVwO1xuICB9IGVsc2Uge1xuICAgIHN0YXJ0ID0gTWF0aC5mbG9vcihzdGFydCAqIHN0ZXApO1xuICAgIHN0b3AgPSBNYXRoLmNlaWwoc3RvcCAqIHN0ZXApO1xuICAgIHRpY2tzID0gbmV3IEFycmF5KG4gPSBNYXRoLmNlaWwoc3RhcnQgLSBzdG9wICsgMSkpO1xuICAgIHdoaWxlICgrK2kgPCBuKSB0aWNrc1tpXSA9IChzdGFydCAtIGkpIC8gc3RlcDtcbiAgfVxuXG4gIGlmIChyZXZlcnNlKSB0aWNrcy5yZXZlcnNlKCk7XG5cbiAgcmV0dXJuIHRpY2tzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGlja0luY3JlbWVudChzdGFydCwgc3RvcCwgY291bnQpIHtcbiAgdmFyIHN0ZXAgPSAoc3RvcCAtIHN0YXJ0KSAvIE1hdGgubWF4KDAsIGNvdW50KSxcbiAgICAgIHBvd2VyID0gTWF0aC5mbG9vcihNYXRoLmxvZyhzdGVwKSAvIE1hdGguTE4xMCksXG4gICAgICBlcnJvciA9IHN0ZXAgLyBNYXRoLnBvdygxMCwgcG93ZXIpO1xuICByZXR1cm4gcG93ZXIgPj0gMFxuICAgICAgPyAoZXJyb3IgPj0gZTEwID8gMTAgOiBlcnJvciA+PSBlNSA/IDUgOiBlcnJvciA+PSBlMiA/IDIgOiAxKSAqIE1hdGgucG93KDEwLCBwb3dlcilcbiAgICAgIDogLU1hdGgucG93KDEwLCAtcG93ZXIpIC8gKGVycm9yID49IGUxMCA/IDEwIDogZXJyb3IgPj0gZTUgPyA1IDogZXJyb3IgPj0gZTIgPyAyIDogMSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0aWNrU3RlcChzdGFydCwgc3RvcCwgY291bnQpIHtcbiAgdmFyIHN0ZXAwID0gTWF0aC5hYnMoc3RvcCAtIHN0YXJ0KSAvIE1hdGgubWF4KDAsIGNvdW50KSxcbiAgICAgIHN0ZXAxID0gTWF0aC5wb3coMTAsIE1hdGguZmxvb3IoTWF0aC5sb2coc3RlcDApIC8gTWF0aC5MTjEwKSksXG4gICAgICBlcnJvciA9IHN0ZXAwIC8gc3RlcDE7XG4gIGlmIChlcnJvciA+PSBlMTApIHN0ZXAxICo9IDEwO1xuICBlbHNlIGlmIChlcnJvciA+PSBlNSkgc3RlcDEgKj0gNTtcbiAgZWxzZSBpZiAoZXJyb3IgPj0gZTIpIHN0ZXAxICo9IDI7XG4gIHJldHVybiBzdG9wIDwgc3RhcnQgPyAtc3RlcDEgOiBzdGVwMTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlcywgdmFsdWVvZikge1xuICB2YXIgbiA9IHZhbHVlcy5sZW5ndGgsXG4gICAgICBpID0gLTEsXG4gICAgICB2YWx1ZSxcbiAgICAgIG1heDtcblxuICBpZiAodmFsdWVvZiA9PSBudWxsKSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gRmluZCB0aGUgZmlyc3QgY29tcGFyYWJsZSB2YWx1ZS5cbiAgICAgIGlmICgodmFsdWUgPSB2YWx1ZXNbaV0pICE9IG51bGwgJiYgdmFsdWUgPj0gdmFsdWUpIHtcbiAgICAgICAgbWF4ID0gdmFsdWU7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIENvbXBhcmUgdGhlIHJlbWFpbmluZyB2YWx1ZXMuXG4gICAgICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlc1tpXSkgIT0gbnVsbCAmJiB2YWx1ZSA+IG1heCkge1xuICAgICAgICAgICAgbWF4ID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZWxzZSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gRmluZCB0aGUgZmlyc3QgY29tcGFyYWJsZSB2YWx1ZS5cbiAgICAgIGlmICgodmFsdWUgPSB2YWx1ZW9mKHZhbHVlc1tpXSwgaSwgdmFsdWVzKSkgIT0gbnVsbCAmJiB2YWx1ZSA+PSB2YWx1ZSkge1xuICAgICAgICBtYXggPSB2YWx1ZTtcbiAgICAgICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gQ29tcGFyZSB0aGUgcmVtYWluaW5nIHZhbHVlcy5cbiAgICAgICAgICBpZiAoKHZhbHVlID0gdmFsdWVvZih2YWx1ZXNbaV0sIGksIHZhbHVlcykpICE9IG51bGwgJiYgdmFsdWUgPiBtYXgpIHtcbiAgICAgICAgICAgIG1heCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtYXg7XG59XG4iLCJ2YXIgYXJyYXkgPSBBcnJheS5wcm90b3R5cGU7XG5cbmV4cG9ydCB2YXIgbWFwID0gYXJyYXkubWFwO1xuZXhwb3J0IHZhciBzbGljZSA9IGFycmF5LnNsaWNlO1xuIiwiaW1wb3J0IHttYXB9IGZyb20gXCJkMy1jb2xsZWN0aW9uXCI7XG5pbXBvcnQge3NsaWNlfSBmcm9tIFwiLi9hcnJheVwiO1xuXG5leHBvcnQgdmFyIGltcGxpY2l0ID0ge25hbWU6IFwiaW1wbGljaXRcIn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG9yZGluYWwocmFuZ2UpIHtcbiAgdmFyIGluZGV4ID0gbWFwKCksXG4gICAgICBkb21haW4gPSBbXSxcbiAgICAgIHVua25vd24gPSBpbXBsaWNpdDtcblxuICByYW5nZSA9IHJhbmdlID09IG51bGwgPyBbXSA6IHNsaWNlLmNhbGwocmFuZ2UpO1xuXG4gIGZ1bmN0aW9uIHNjYWxlKGQpIHtcbiAgICB2YXIga2V5ID0gZCArIFwiXCIsIGkgPSBpbmRleC5nZXQoa2V5KTtcbiAgICBpZiAoIWkpIHtcbiAgICAgIGlmICh1bmtub3duICE9PSBpbXBsaWNpdCkgcmV0dXJuIHVua25vd247XG4gICAgICBpbmRleC5zZXQoa2V5LCBpID0gZG9tYWluLnB1c2goZCkpO1xuICAgIH1cbiAgICByZXR1cm4gcmFuZ2VbKGkgLSAxKSAlIHJhbmdlLmxlbmd0aF07XG4gIH1cblxuICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZG9tYWluLnNsaWNlKCk7XG4gICAgZG9tYWluID0gW10sIGluZGV4ID0gbWFwKCk7XG4gICAgdmFyIGkgPSAtMSwgbiA9IF8ubGVuZ3RoLCBkLCBrZXk7XG4gICAgd2hpbGUgKCsraSA8IG4pIGlmICghaW5kZXguaGFzKGtleSA9IChkID0gX1tpXSkgKyBcIlwiKSkgaW5kZXguc2V0KGtleSwgZG9tYWluLnB1c2goZCkpO1xuICAgIHJldHVybiBzY2FsZTtcbiAgfTtcblxuICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChyYW5nZSA9IHNsaWNlLmNhbGwoXyksIHNjYWxlKSA6IHJhbmdlLnNsaWNlKCk7XG4gIH07XG5cbiAgc2NhbGUudW5rbm93biA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh1bmtub3duID0gXywgc2NhbGUpIDogdW5rbm93bjtcbiAgfTtcblxuICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG9yZGluYWwoKVxuICAgICAgICAuZG9tYWluKGRvbWFpbilcbiAgICAgICAgLnJhbmdlKHJhbmdlKVxuICAgICAgICAudW5rbm93bih1bmtub3duKTtcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG4iLCJpbXBvcnQge3JhbmdlIGFzIHNlcXVlbmNlfSBmcm9tIFwiZDMtYXJyYXlcIjtcbmltcG9ydCBvcmRpbmFsIGZyb20gXCIuL29yZGluYWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYmFuZCgpIHtcbiAgdmFyIHNjYWxlID0gb3JkaW5hbCgpLnVua25vd24odW5kZWZpbmVkKSxcbiAgICAgIGRvbWFpbiA9IHNjYWxlLmRvbWFpbixcbiAgICAgIG9yZGluYWxSYW5nZSA9IHNjYWxlLnJhbmdlLFxuICAgICAgcmFuZ2UgPSBbMCwgMV0sXG4gICAgICBzdGVwLFxuICAgICAgYmFuZHdpZHRoLFxuICAgICAgcm91bmQgPSBmYWxzZSxcbiAgICAgIHBhZGRpbmdJbm5lciA9IDAsXG4gICAgICBwYWRkaW5nT3V0ZXIgPSAwLFxuICAgICAgYWxpZ24gPSAwLjU7XG5cbiAgZGVsZXRlIHNjYWxlLnVua25vd247XG5cbiAgZnVuY3Rpb24gcmVzY2FsZSgpIHtcbiAgICB2YXIgbiA9IGRvbWFpbigpLmxlbmd0aCxcbiAgICAgICAgcmV2ZXJzZSA9IHJhbmdlWzFdIDwgcmFuZ2VbMF0sXG4gICAgICAgIHN0YXJ0ID0gcmFuZ2VbcmV2ZXJzZSAtIDBdLFxuICAgICAgICBzdG9wID0gcmFuZ2VbMSAtIHJldmVyc2VdO1xuICAgIHN0ZXAgPSAoc3RvcCAtIHN0YXJ0KSAvIE1hdGgubWF4KDEsIG4gLSBwYWRkaW5nSW5uZXIgKyBwYWRkaW5nT3V0ZXIgKiAyKTtcbiAgICBpZiAocm91bmQpIHN0ZXAgPSBNYXRoLmZsb29yKHN0ZXApO1xuICAgIHN0YXJ0ICs9IChzdG9wIC0gc3RhcnQgLSBzdGVwICogKG4gLSBwYWRkaW5nSW5uZXIpKSAqIGFsaWduO1xuICAgIGJhbmR3aWR0aCA9IHN0ZXAgKiAoMSAtIHBhZGRpbmdJbm5lcik7XG4gICAgaWYgKHJvdW5kKSBzdGFydCA9IE1hdGgucm91bmQoc3RhcnQpLCBiYW5kd2lkdGggPSBNYXRoLnJvdW5kKGJhbmR3aWR0aCk7XG4gICAgdmFyIHZhbHVlcyA9IHNlcXVlbmNlKG4pLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiBzdGFydCArIHN0ZXAgKiBpOyB9KTtcbiAgICByZXR1cm4gb3JkaW5hbFJhbmdlKHJldmVyc2UgPyB2YWx1ZXMucmV2ZXJzZSgpIDogdmFsdWVzKTtcbiAgfVxuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkb21haW4oXyksIHJlc2NhbGUoKSkgOiBkb21haW4oKTtcbiAgfTtcblxuICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChyYW5nZSA9IFsrX1swXSwgK19bMV1dLCByZXNjYWxlKCkpIDogcmFuZ2Uuc2xpY2UoKTtcbiAgfTtcblxuICBzY2FsZS5yYW5nZVJvdW5kID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiByYW5nZSA9IFsrX1swXSwgK19bMV1dLCByb3VuZCA9IHRydWUsIHJlc2NhbGUoKTtcbiAgfTtcblxuICBzY2FsZS5iYW5kd2lkdGggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYmFuZHdpZHRoO1xuICB9O1xuXG4gIHNjYWxlLnN0ZXAgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc3RlcDtcbiAgfTtcblxuICBzY2FsZS5yb3VuZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChyb3VuZCA9ICEhXywgcmVzY2FsZSgpKSA6IHJvdW5kO1xuICB9O1xuXG4gIHNjYWxlLnBhZGRpbmcgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkZGluZ0lubmVyID0gcGFkZGluZ091dGVyID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgXykpLCByZXNjYWxlKCkpIDogcGFkZGluZ0lubmVyO1xuICB9O1xuXG4gIHNjYWxlLnBhZGRpbmdJbm5lciA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChwYWRkaW5nSW5uZXIgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBfKSksIHJlc2NhbGUoKSkgOiBwYWRkaW5nSW5uZXI7XG4gIH07XG5cbiAgc2NhbGUucGFkZGluZ091dGVyID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHBhZGRpbmdPdXRlciA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIF8pKSwgcmVzY2FsZSgpKSA6IHBhZGRpbmdPdXRlcjtcbiAgfTtcblxuICBzY2FsZS5hbGlnbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChhbGlnbiA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIF8pKSwgcmVzY2FsZSgpKSA6IGFsaWduO1xuICB9O1xuXG4gIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYmFuZCgpXG4gICAgICAgIC5kb21haW4oZG9tYWluKCkpXG4gICAgICAgIC5yYW5nZShyYW5nZSlcbiAgICAgICAgLnJvdW5kKHJvdW5kKVxuICAgICAgICAucGFkZGluZ0lubmVyKHBhZGRpbmdJbm5lcilcbiAgICAgICAgLnBhZGRpbmdPdXRlcihwYWRkaW5nT3V0ZXIpXG4gICAgICAgIC5hbGlnbihhbGlnbik7XG4gIH07XG5cbiAgcmV0dXJuIHJlc2NhbGUoKTtcbn1cblxuZnVuY3Rpb24gcG9pbnRpc2goc2NhbGUpIHtcbiAgdmFyIGNvcHkgPSBzY2FsZS5jb3B5O1xuXG4gIHNjYWxlLnBhZGRpbmcgPSBzY2FsZS5wYWRkaW5nT3V0ZXI7XG4gIGRlbGV0ZSBzY2FsZS5wYWRkaW5nSW5uZXI7XG4gIGRlbGV0ZSBzY2FsZS5wYWRkaW5nT3V0ZXI7XG5cbiAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBwb2ludGlzaChjb3B5KCkpO1xuICB9O1xuXG4gIHJldHVybiBzY2FsZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBvaW50KCkge1xuICByZXR1cm4gcG9pbnRpc2goYmFuZCgpLnBhZGRpbmdJbm5lcigxKSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjb25zdHJ1Y3RvciwgZmFjdG9yeSwgcHJvdG90eXBlKSB7XG4gIGNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IGZhY3RvcnkucHJvdG90eXBlID0gcHJvdG90eXBlO1xuICBwcm90b3R5cGUuY29uc3RydWN0b3IgPSBjb25zdHJ1Y3Rvcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dGVuZChwYXJlbnQsIGRlZmluaXRpb24pIHtcbiAgdmFyIHByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUocGFyZW50LnByb3RvdHlwZSk7XG4gIGZvciAodmFyIGtleSBpbiBkZWZpbml0aW9uKSBwcm90b3R5cGVba2V5XSA9IGRlZmluaXRpb25ba2V5XTtcbiAgcmV0dXJuIHByb3RvdHlwZTtcbn1cbiIsImltcG9ydCBkZWZpbmUsIHtleHRlbmR9IGZyb20gXCIuL2RlZmluZVwiO1xuXG5leHBvcnQgZnVuY3Rpb24gQ29sb3IoKSB7fVxuXG5leHBvcnQgdmFyIGRhcmtlciA9IDAuNztcbmV4cG9ydCB2YXIgYnJpZ2h0ZXIgPSAxIC8gZGFya2VyO1xuXG52YXIgcmVJID0gXCJcXFxccyooWystXT9cXFxcZCspXFxcXHMqXCIsXG4gICAgcmVOID0gXCJcXFxccyooWystXT9cXFxcZCpcXFxcLj9cXFxcZCsoPzpbZUVdWystXT9cXFxcZCspPylcXFxccypcIixcbiAgICByZVAgPSBcIlxcXFxzKihbKy1dP1xcXFxkKlxcXFwuP1xcXFxkKyg/OltlRV1bKy1dP1xcXFxkKyk/KSVcXFxccypcIixcbiAgICByZUhleDMgPSAvXiMoWzAtOWEtZl17M30pJC8sXG4gICAgcmVIZXg2ID0gL14jKFswLTlhLWZdezZ9KSQvLFxuICAgIHJlUmdiSW50ZWdlciA9IG5ldyBSZWdFeHAoXCJecmdiXFxcXChcIiArIFtyZUksIHJlSSwgcmVJXSArIFwiXFxcXCkkXCIpLFxuICAgIHJlUmdiUGVyY2VudCA9IG5ldyBSZWdFeHAoXCJecmdiXFxcXChcIiArIFtyZVAsIHJlUCwgcmVQXSArIFwiXFxcXCkkXCIpLFxuICAgIHJlUmdiYUludGVnZXIgPSBuZXcgUmVnRXhwKFwiXnJnYmFcXFxcKFwiICsgW3JlSSwgcmVJLCByZUksIHJlTl0gKyBcIlxcXFwpJFwiKSxcbiAgICByZVJnYmFQZXJjZW50ID0gbmV3IFJlZ0V4cChcIl5yZ2JhXFxcXChcIiArIFtyZVAsIHJlUCwgcmVQLCByZU5dICsgXCJcXFxcKSRcIiksXG4gICAgcmVIc2xQZXJjZW50ID0gbmV3IFJlZ0V4cChcIl5oc2xcXFxcKFwiICsgW3JlTiwgcmVQLCByZVBdICsgXCJcXFxcKSRcIiksXG4gICAgcmVIc2xhUGVyY2VudCA9IG5ldyBSZWdFeHAoXCJeaHNsYVxcXFwoXCIgKyBbcmVOLCByZVAsIHJlUCwgcmVOXSArIFwiXFxcXCkkXCIpO1xuXG52YXIgbmFtZWQgPSB7XG4gIGFsaWNlYmx1ZTogMHhmMGY4ZmYsXG4gIGFudGlxdWV3aGl0ZTogMHhmYWViZDcsXG4gIGFxdWE6IDB4MDBmZmZmLFxuICBhcXVhbWFyaW5lOiAweDdmZmZkNCxcbiAgYXp1cmU6IDB4ZjBmZmZmLFxuICBiZWlnZTogMHhmNWY1ZGMsXG4gIGJpc3F1ZTogMHhmZmU0YzQsXG4gIGJsYWNrOiAweDAwMDAwMCxcbiAgYmxhbmNoZWRhbG1vbmQ6IDB4ZmZlYmNkLFxuICBibHVlOiAweDAwMDBmZixcbiAgYmx1ZXZpb2xldDogMHg4YTJiZTIsXG4gIGJyb3duOiAweGE1MmEyYSxcbiAgYnVybHl3b29kOiAweGRlYjg4NyxcbiAgY2FkZXRibHVlOiAweDVmOWVhMCxcbiAgY2hhcnRyZXVzZTogMHg3ZmZmMDAsXG4gIGNob2NvbGF0ZTogMHhkMjY5MWUsXG4gIGNvcmFsOiAweGZmN2Y1MCxcbiAgY29ybmZsb3dlcmJsdWU6IDB4NjQ5NWVkLFxuICBjb3Juc2lsazogMHhmZmY4ZGMsXG4gIGNyaW1zb246IDB4ZGMxNDNjLFxuICBjeWFuOiAweDAwZmZmZixcbiAgZGFya2JsdWU6IDB4MDAwMDhiLFxuICBkYXJrY3lhbjogMHgwMDhiOGIsXG4gIGRhcmtnb2xkZW5yb2Q6IDB4Yjg4NjBiLFxuICBkYXJrZ3JheTogMHhhOWE5YTksXG4gIGRhcmtncmVlbjogMHgwMDY0MDAsXG4gIGRhcmtncmV5OiAweGE5YTlhOSxcbiAgZGFya2toYWtpOiAweGJkYjc2YixcbiAgZGFya21hZ2VudGE6IDB4OGIwMDhiLFxuICBkYXJrb2xpdmVncmVlbjogMHg1NTZiMmYsXG4gIGRhcmtvcmFuZ2U6IDB4ZmY4YzAwLFxuICBkYXJrb3JjaGlkOiAweDk5MzJjYyxcbiAgZGFya3JlZDogMHg4YjAwMDAsXG4gIGRhcmtzYWxtb246IDB4ZTk5NjdhLFxuICBkYXJrc2VhZ3JlZW46IDB4OGZiYzhmLFxuICBkYXJrc2xhdGVibHVlOiAweDQ4M2Q4YixcbiAgZGFya3NsYXRlZ3JheTogMHgyZjRmNGYsXG4gIGRhcmtzbGF0ZWdyZXk6IDB4MmY0ZjRmLFxuICBkYXJrdHVycXVvaXNlOiAweDAwY2VkMSxcbiAgZGFya3Zpb2xldDogMHg5NDAwZDMsXG4gIGRlZXBwaW5rOiAweGZmMTQ5MyxcbiAgZGVlcHNreWJsdWU6IDB4MDBiZmZmLFxuICBkaW1ncmF5OiAweDY5Njk2OSxcbiAgZGltZ3JleTogMHg2OTY5NjksXG4gIGRvZGdlcmJsdWU6IDB4MWU5MGZmLFxuICBmaXJlYnJpY2s6IDB4YjIyMjIyLFxuICBmbG9yYWx3aGl0ZTogMHhmZmZhZjAsXG4gIGZvcmVzdGdyZWVuOiAweDIyOGIyMixcbiAgZnVjaHNpYTogMHhmZjAwZmYsXG4gIGdhaW5zYm9ybzogMHhkY2RjZGMsXG4gIGdob3N0d2hpdGU6IDB4ZjhmOGZmLFxuICBnb2xkOiAweGZmZDcwMCxcbiAgZ29sZGVucm9kOiAweGRhYTUyMCxcbiAgZ3JheTogMHg4MDgwODAsXG4gIGdyZWVuOiAweDAwODAwMCxcbiAgZ3JlZW55ZWxsb3c6IDB4YWRmZjJmLFxuICBncmV5OiAweDgwODA4MCxcbiAgaG9uZXlkZXc6IDB4ZjBmZmYwLFxuICBob3RwaW5rOiAweGZmNjliNCxcbiAgaW5kaWFucmVkOiAweGNkNWM1YyxcbiAgaW5kaWdvOiAweDRiMDA4MixcbiAgaXZvcnk6IDB4ZmZmZmYwLFxuICBraGFraTogMHhmMGU2OGMsXG4gIGxhdmVuZGVyOiAweGU2ZTZmYSxcbiAgbGF2ZW5kZXJibHVzaDogMHhmZmYwZjUsXG4gIGxhd25ncmVlbjogMHg3Y2ZjMDAsXG4gIGxlbW9uY2hpZmZvbjogMHhmZmZhY2QsXG4gIGxpZ2h0Ymx1ZTogMHhhZGQ4ZTYsXG4gIGxpZ2h0Y29yYWw6IDB4ZjA4MDgwLFxuICBsaWdodGN5YW46IDB4ZTBmZmZmLFxuICBsaWdodGdvbGRlbnJvZHllbGxvdzogMHhmYWZhZDIsXG4gIGxpZ2h0Z3JheTogMHhkM2QzZDMsXG4gIGxpZ2h0Z3JlZW46IDB4OTBlZTkwLFxuICBsaWdodGdyZXk6IDB4ZDNkM2QzLFxuICBsaWdodHBpbms6IDB4ZmZiNmMxLFxuICBsaWdodHNhbG1vbjogMHhmZmEwN2EsXG4gIGxpZ2h0c2VhZ3JlZW46IDB4MjBiMmFhLFxuICBsaWdodHNreWJsdWU6IDB4ODdjZWZhLFxuICBsaWdodHNsYXRlZ3JheTogMHg3Nzg4OTksXG4gIGxpZ2h0c2xhdGVncmV5OiAweDc3ODg5OSxcbiAgbGlnaHRzdGVlbGJsdWU6IDB4YjBjNGRlLFxuICBsaWdodHllbGxvdzogMHhmZmZmZTAsXG4gIGxpbWU6IDB4MDBmZjAwLFxuICBsaW1lZ3JlZW46IDB4MzJjZDMyLFxuICBsaW5lbjogMHhmYWYwZTYsXG4gIG1hZ2VudGE6IDB4ZmYwMGZmLFxuICBtYXJvb246IDB4ODAwMDAwLFxuICBtZWRpdW1hcXVhbWFyaW5lOiAweDY2Y2RhYSxcbiAgbWVkaXVtYmx1ZTogMHgwMDAwY2QsXG4gIG1lZGl1bW9yY2hpZDogMHhiYTU1ZDMsXG4gIG1lZGl1bXB1cnBsZTogMHg5MzcwZGIsXG4gIG1lZGl1bXNlYWdyZWVuOiAweDNjYjM3MSxcbiAgbWVkaXVtc2xhdGVibHVlOiAweDdiNjhlZSxcbiAgbWVkaXVtc3ByaW5nZ3JlZW46IDB4MDBmYTlhLFxuICBtZWRpdW10dXJxdW9pc2U6IDB4NDhkMWNjLFxuICBtZWRpdW12aW9sZXRyZWQ6IDB4YzcxNTg1LFxuICBtaWRuaWdodGJsdWU6IDB4MTkxOTcwLFxuICBtaW50Y3JlYW06IDB4ZjVmZmZhLFxuICBtaXN0eXJvc2U6IDB4ZmZlNGUxLFxuICBtb2NjYXNpbjogMHhmZmU0YjUsXG4gIG5hdmFqb3doaXRlOiAweGZmZGVhZCxcbiAgbmF2eTogMHgwMDAwODAsXG4gIG9sZGxhY2U6IDB4ZmRmNWU2LFxuICBvbGl2ZTogMHg4MDgwMDAsXG4gIG9saXZlZHJhYjogMHg2YjhlMjMsXG4gIG9yYW5nZTogMHhmZmE1MDAsXG4gIG9yYW5nZXJlZDogMHhmZjQ1MDAsXG4gIG9yY2hpZDogMHhkYTcwZDYsXG4gIHBhbGVnb2xkZW5yb2Q6IDB4ZWVlOGFhLFxuICBwYWxlZ3JlZW46IDB4OThmYjk4LFxuICBwYWxldHVycXVvaXNlOiAweGFmZWVlZSxcbiAgcGFsZXZpb2xldHJlZDogMHhkYjcwOTMsXG4gIHBhcGF5YXdoaXA6IDB4ZmZlZmQ1LFxuICBwZWFjaHB1ZmY6IDB4ZmZkYWI5LFxuICBwZXJ1OiAweGNkODUzZixcbiAgcGluazogMHhmZmMwY2IsXG4gIHBsdW06IDB4ZGRhMGRkLFxuICBwb3dkZXJibHVlOiAweGIwZTBlNixcbiAgcHVycGxlOiAweDgwMDA4MCxcbiAgcmViZWNjYXB1cnBsZTogMHg2NjMzOTksXG4gIHJlZDogMHhmZjAwMDAsXG4gIHJvc3licm93bjogMHhiYzhmOGYsXG4gIHJveWFsYmx1ZTogMHg0MTY5ZTEsXG4gIHNhZGRsZWJyb3duOiAweDhiNDUxMyxcbiAgc2FsbW9uOiAweGZhODA3MixcbiAgc2FuZHlicm93bjogMHhmNGE0NjAsXG4gIHNlYWdyZWVuOiAweDJlOGI1NyxcbiAgc2Vhc2hlbGw6IDB4ZmZmNWVlLFxuICBzaWVubmE6IDB4YTA1MjJkLFxuICBzaWx2ZXI6IDB4YzBjMGMwLFxuICBza3libHVlOiAweDg3Y2VlYixcbiAgc2xhdGVibHVlOiAweDZhNWFjZCxcbiAgc2xhdGVncmF5OiAweDcwODA5MCxcbiAgc2xhdGVncmV5OiAweDcwODA5MCxcbiAgc25vdzogMHhmZmZhZmEsXG4gIHNwcmluZ2dyZWVuOiAweDAwZmY3ZixcbiAgc3RlZWxibHVlOiAweDQ2ODJiNCxcbiAgdGFuOiAweGQyYjQ4YyxcbiAgdGVhbDogMHgwMDgwODAsXG4gIHRoaXN0bGU6IDB4ZDhiZmQ4LFxuICB0b21hdG86IDB4ZmY2MzQ3LFxuICB0dXJxdW9pc2U6IDB4NDBlMGQwLFxuICB2aW9sZXQ6IDB4ZWU4MmVlLFxuICB3aGVhdDogMHhmNWRlYjMsXG4gIHdoaXRlOiAweGZmZmZmZixcbiAgd2hpdGVzbW9rZTogMHhmNWY1ZjUsXG4gIHllbGxvdzogMHhmZmZmMDAsXG4gIHllbGxvd2dyZWVuOiAweDlhY2QzMlxufTtcblxuZGVmaW5lKENvbG9yLCBjb2xvciwge1xuICBkaXNwbGF5YWJsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucmdiKCkuZGlzcGxheWFibGUoKTtcbiAgfSxcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnJnYigpICsgXCJcIjtcbiAgfVxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbG9yKGZvcm1hdCkge1xuICB2YXIgbTtcbiAgZm9ybWF0ID0gKGZvcm1hdCArIFwiXCIpLnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICByZXR1cm4gKG0gPSByZUhleDMuZXhlYyhmb3JtYXQpKSA/IChtID0gcGFyc2VJbnQobVsxXSwgMTYpLCBuZXcgUmdiKChtID4+IDggJiAweGYpIHwgKG0gPj4gNCAmIDB4MGYwKSwgKG0gPj4gNCAmIDB4ZikgfCAobSAmIDB4ZjApLCAoKG0gJiAweGYpIDw8IDQpIHwgKG0gJiAweGYpLCAxKSkgLy8gI2YwMFxuICAgICAgOiAobSA9IHJlSGV4Ni5leGVjKGZvcm1hdCkpID8gcmdibihwYXJzZUludChtWzFdLCAxNikpIC8vICNmZjAwMDBcbiAgICAgIDogKG0gPSByZVJnYkludGVnZXIuZXhlYyhmb3JtYXQpKSA/IG5ldyBSZ2IobVsxXSwgbVsyXSwgbVszXSwgMSkgLy8gcmdiKDI1NSwgMCwgMClcbiAgICAgIDogKG0gPSByZVJnYlBlcmNlbnQuZXhlYyhmb3JtYXQpKSA/IG5ldyBSZ2IobVsxXSAqIDI1NSAvIDEwMCwgbVsyXSAqIDI1NSAvIDEwMCwgbVszXSAqIDI1NSAvIDEwMCwgMSkgLy8gcmdiKDEwMCUsIDAlLCAwJSlcbiAgICAgIDogKG0gPSByZVJnYmFJbnRlZ2VyLmV4ZWMoZm9ybWF0KSkgPyByZ2JhKG1bMV0sIG1bMl0sIG1bM10sIG1bNF0pIC8vIHJnYmEoMjU1LCAwLCAwLCAxKVxuICAgICAgOiAobSA9IHJlUmdiYVBlcmNlbnQuZXhlYyhmb3JtYXQpKSA/IHJnYmEobVsxXSAqIDI1NSAvIDEwMCwgbVsyXSAqIDI1NSAvIDEwMCwgbVszXSAqIDI1NSAvIDEwMCwgbVs0XSkgLy8gcmdiKDEwMCUsIDAlLCAwJSwgMSlcbiAgICAgIDogKG0gPSByZUhzbFBlcmNlbnQuZXhlYyhmb3JtYXQpKSA/IGhzbGEobVsxXSwgbVsyXSAvIDEwMCwgbVszXSAvIDEwMCwgMSkgLy8gaHNsKDEyMCwgNTAlLCA1MCUpXG4gICAgICA6IChtID0gcmVIc2xhUGVyY2VudC5leGVjKGZvcm1hdCkpID8gaHNsYShtWzFdLCBtWzJdIC8gMTAwLCBtWzNdIC8gMTAwLCBtWzRdKSAvLyBoc2xhKDEyMCwgNTAlLCA1MCUsIDEpXG4gICAgICA6IG5hbWVkLmhhc093blByb3BlcnR5KGZvcm1hdCkgPyByZ2JuKG5hbWVkW2Zvcm1hdF0pXG4gICAgICA6IGZvcm1hdCA9PT0gXCJ0cmFuc3BhcmVudFwiID8gbmV3IFJnYihOYU4sIE5hTiwgTmFOLCAwKVxuICAgICAgOiBudWxsO1xufVxuXG5mdW5jdGlvbiByZ2JuKG4pIHtcbiAgcmV0dXJuIG5ldyBSZ2IobiA+PiAxNiAmIDB4ZmYsIG4gPj4gOCAmIDB4ZmYsIG4gJiAweGZmLCAxKTtcbn1cblxuZnVuY3Rpb24gcmdiYShyLCBnLCBiLCBhKSB7XG4gIGlmIChhIDw9IDApIHIgPSBnID0gYiA9IE5hTjtcbiAgcmV0dXJuIG5ldyBSZ2IociwgZywgYiwgYSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZ2JDb252ZXJ0KG8pIHtcbiAgaWYgKCEobyBpbnN0YW5jZW9mIENvbG9yKSkgbyA9IGNvbG9yKG8pO1xuICBpZiAoIW8pIHJldHVybiBuZXcgUmdiO1xuICBvID0gby5yZ2IoKTtcbiAgcmV0dXJuIG5ldyBSZ2Ioby5yLCBvLmcsIG8uYiwgby5vcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJnYihyLCBnLCBiLCBvcGFjaXR5KSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gcmdiQ29udmVydChyKSA6IG5ldyBSZ2IociwgZywgYiwgb3BhY2l0eSA9PSBudWxsID8gMSA6IG9wYWNpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gUmdiKHIsIGcsIGIsIG9wYWNpdHkpIHtcbiAgdGhpcy5yID0gK3I7XG4gIHRoaXMuZyA9ICtnO1xuICB0aGlzLmIgPSArYjtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShSZ2IsIHJnYiwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGJyaWdodGVyIDogTWF0aC5wb3coYnJpZ2h0ZXIsIGspO1xuICAgIHJldHVybiBuZXcgUmdiKHRoaXMuciAqIGssIHRoaXMuZyAqIGssIHRoaXMuYiAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBkYXJrZXIgOiBNYXRoLnBvdyhkYXJrZXIsIGspO1xuICAgIHJldHVybiBuZXcgUmdiKHRoaXMuciAqIGssIHRoaXMuZyAqIGssIHRoaXMuYiAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGRpc3BsYXlhYmxlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKDAgPD0gdGhpcy5yICYmIHRoaXMuciA8PSAyNTUpXG4gICAgICAgICYmICgwIDw9IHRoaXMuZyAmJiB0aGlzLmcgPD0gMjU1KVxuICAgICAgICAmJiAoMCA8PSB0aGlzLmIgJiYgdGhpcy5iIDw9IDI1NSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5vcGFjaXR5ICYmIHRoaXMub3BhY2l0eSA8PSAxKTtcbiAgfSxcbiAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhID0gdGhpcy5vcGFjaXR5OyBhID0gaXNOYU4oYSkgPyAxIDogTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgYSkpO1xuICAgIHJldHVybiAoYSA9PT0gMSA/IFwicmdiKFwiIDogXCJyZ2JhKFwiKVxuICAgICAgICArIE1hdGgubWF4KDAsIE1hdGgubWluKDI1NSwgTWF0aC5yb3VuZCh0aGlzLnIpIHx8IDApKSArIFwiLCBcIlxuICAgICAgICArIE1hdGgubWF4KDAsIE1hdGgubWluKDI1NSwgTWF0aC5yb3VuZCh0aGlzLmcpIHx8IDApKSArIFwiLCBcIlxuICAgICAgICArIE1hdGgubWF4KDAsIE1hdGgubWluKDI1NSwgTWF0aC5yb3VuZCh0aGlzLmIpIHx8IDApKVxuICAgICAgICArIChhID09PSAxID8gXCIpXCIgOiBcIiwgXCIgKyBhICsgXCIpXCIpO1xuICB9XG59KSk7XG5cbmZ1bmN0aW9uIGhzbGEoaCwgcywgbCwgYSkge1xuICBpZiAoYSA8PSAwKSBoID0gcyA9IGwgPSBOYU47XG4gIGVsc2UgaWYgKGwgPD0gMCB8fCBsID49IDEpIGggPSBzID0gTmFOO1xuICBlbHNlIGlmIChzIDw9IDApIGggPSBOYU47XG4gIHJldHVybiBuZXcgSHNsKGgsIHMsIGwsIGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaHNsQ29udmVydChvKSB7XG4gIGlmIChvIGluc3RhbmNlb2YgSHNsKSByZXR1cm4gbmV3IEhzbChvLmgsIG8ucywgby5sLCBvLm9wYWNpdHkpO1xuICBpZiAoIShvIGluc3RhbmNlb2YgQ29sb3IpKSBvID0gY29sb3Iobyk7XG4gIGlmICghbykgcmV0dXJuIG5ldyBIc2w7XG4gIGlmIChvIGluc3RhbmNlb2YgSHNsKSByZXR1cm4gbztcbiAgbyA9IG8ucmdiKCk7XG4gIHZhciByID0gby5yIC8gMjU1LFxuICAgICAgZyA9IG8uZyAvIDI1NSxcbiAgICAgIGIgPSBvLmIgLyAyNTUsXG4gICAgICBtaW4gPSBNYXRoLm1pbihyLCBnLCBiKSxcbiAgICAgIG1heCA9IE1hdGgubWF4KHIsIGcsIGIpLFxuICAgICAgaCA9IE5hTixcbiAgICAgIHMgPSBtYXggLSBtaW4sXG4gICAgICBsID0gKG1heCArIG1pbikgLyAyO1xuICBpZiAocykge1xuICAgIGlmIChyID09PSBtYXgpIGggPSAoZyAtIGIpIC8gcyArIChnIDwgYikgKiA2O1xuICAgIGVsc2UgaWYgKGcgPT09IG1heCkgaCA9IChiIC0gcikgLyBzICsgMjtcbiAgICBlbHNlIGggPSAociAtIGcpIC8gcyArIDQ7XG4gICAgcyAvPSBsIDwgMC41ID8gbWF4ICsgbWluIDogMiAtIG1heCAtIG1pbjtcbiAgICBoICo9IDYwO1xuICB9IGVsc2Uge1xuICAgIHMgPSBsID4gMCAmJiBsIDwgMSA/IDAgOiBoO1xuICB9XG4gIHJldHVybiBuZXcgSHNsKGgsIHMsIGwsIG8ub3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoc2woaCwgcywgbCwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGhzbENvbnZlcnQoaCkgOiBuZXcgSHNsKGgsIHMsIGwsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZnVuY3Rpb24gSHNsKGgsIHMsIGwsIG9wYWNpdHkpIHtcbiAgdGhpcy5oID0gK2g7XG4gIHRoaXMucyA9ICtzO1xuICB0aGlzLmwgPSArbDtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShIc2wsIGhzbCwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGJyaWdodGVyIDogTWF0aC5wb3coYnJpZ2h0ZXIsIGspO1xuICAgIHJldHVybiBuZXcgSHNsKHRoaXMuaCwgdGhpcy5zLCB0aGlzLmwgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICBkYXJrZXI6IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gZGFya2VyIDogTWF0aC5wb3coZGFya2VyLCBrKTtcbiAgICByZXR1cm4gbmV3IEhzbCh0aGlzLmgsIHRoaXMucywgdGhpcy5sICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgcmdiOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgaCA9IHRoaXMuaCAlIDM2MCArICh0aGlzLmggPCAwKSAqIDM2MCxcbiAgICAgICAgcyA9IGlzTmFOKGgpIHx8IGlzTmFOKHRoaXMucykgPyAwIDogdGhpcy5zLFxuICAgICAgICBsID0gdGhpcy5sLFxuICAgICAgICBtMiA9IGwgKyAobCA8IDAuNSA/IGwgOiAxIC0gbCkgKiBzLFxuICAgICAgICBtMSA9IDIgKiBsIC0gbTI7XG4gICAgcmV0dXJuIG5ldyBSZ2IoXG4gICAgICBoc2wycmdiKGggPj0gMjQwID8gaCAtIDI0MCA6IGggKyAxMjAsIG0xLCBtMiksXG4gICAgICBoc2wycmdiKGgsIG0xLCBtMiksXG4gICAgICBoc2wycmdiKGggPCAxMjAgPyBoICsgMjQwIDogaCAtIDEyMCwgbTEsIG0yKSxcbiAgICAgIHRoaXMub3BhY2l0eVxuICAgICk7XG4gIH0sXG4gIGRpc3BsYXlhYmxlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKDAgPD0gdGhpcy5zICYmIHRoaXMucyA8PSAxIHx8IGlzTmFOKHRoaXMucykpXG4gICAgICAgICYmICgwIDw9IHRoaXMubCAmJiB0aGlzLmwgPD0gMSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5vcGFjaXR5ICYmIHRoaXMub3BhY2l0eSA8PSAxKTtcbiAgfVxufSkpO1xuXG4vKiBGcm9tIEZ2RCAxMy4zNywgQ1NTIENvbG9yIE1vZHVsZSBMZXZlbCAzICovXG5mdW5jdGlvbiBoc2wycmdiKGgsIG0xLCBtMikge1xuICByZXR1cm4gKGggPCA2MCA/IG0xICsgKG0yIC0gbTEpICogaCAvIDYwXG4gICAgICA6IGggPCAxODAgPyBtMlxuICAgICAgOiBoIDwgMjQwID8gbTEgKyAobTIgLSBtMSkgKiAoMjQwIC0gaCkgLyA2MFxuICAgICAgOiBtMSkgKiAyNTU7XG59XG4iLCJleHBvcnQgdmFyIGRlZzJyYWQgPSBNYXRoLlBJIC8gMTgwO1xuZXhwb3J0IHZhciByYWQyZGVnID0gMTgwIC8gTWF0aC5QSTtcbiIsImltcG9ydCBkZWZpbmUsIHtleHRlbmR9IGZyb20gXCIuL2RlZmluZVwiO1xuaW1wb3J0IHtDb2xvciwgcmdiQ29udmVydCwgUmdifSBmcm9tIFwiLi9jb2xvclwiO1xuaW1wb3J0IHtkZWcycmFkLCByYWQyZGVnfSBmcm9tIFwiLi9tYXRoXCI7XG5cbnZhciBLbiA9IDE4LFxuICAgIFhuID0gMC45NTA0NzAsIC8vIEQ2NSBzdGFuZGFyZCByZWZlcmVudFxuICAgIFluID0gMSxcbiAgICBabiA9IDEuMDg4ODMwLFxuICAgIHQwID0gNCAvIDI5LFxuICAgIHQxID0gNiAvIDI5LFxuICAgIHQyID0gMyAqIHQxICogdDEsXG4gICAgdDMgPSB0MSAqIHQxICogdDE7XG5cbmZ1bmN0aW9uIGxhYkNvbnZlcnQobykge1xuICBpZiAobyBpbnN0YW5jZW9mIExhYikgcmV0dXJuIG5ldyBMYWIoby5sLCBvLmEsIG8uYiwgby5vcGFjaXR5KTtcbiAgaWYgKG8gaW5zdGFuY2VvZiBIY2wpIHtcbiAgICB2YXIgaCA9IG8uaCAqIGRlZzJyYWQ7XG4gICAgcmV0dXJuIG5ldyBMYWIoby5sLCBNYXRoLmNvcyhoKSAqIG8uYywgTWF0aC5zaW4oaCkgKiBvLmMsIG8ub3BhY2l0eSk7XG4gIH1cbiAgaWYgKCEobyBpbnN0YW5jZW9mIFJnYikpIG8gPSByZ2JDb252ZXJ0KG8pO1xuICB2YXIgYiA9IHJnYjJ4eXooby5yKSxcbiAgICAgIGEgPSByZ2IyeHl6KG8uZyksXG4gICAgICBsID0gcmdiMnh5eihvLmIpLFxuICAgICAgeCA9IHh5ejJsYWIoKDAuNDEyNDU2NCAqIGIgKyAwLjM1NzU3NjEgKiBhICsgMC4xODA0Mzc1ICogbCkgLyBYbiksXG4gICAgICB5ID0geHl6MmxhYigoMC4yMTI2NzI5ICogYiArIDAuNzE1MTUyMiAqIGEgKyAwLjA3MjE3NTAgKiBsKSAvIFluKSxcbiAgICAgIHogPSB4eXoybGFiKCgwLjAxOTMzMzkgKiBiICsgMC4xMTkxOTIwICogYSArIDAuOTUwMzA0MSAqIGwpIC8gWm4pO1xuICByZXR1cm4gbmV3IExhYigxMTYgKiB5IC0gMTYsIDUwMCAqICh4IC0geSksIDIwMCAqICh5IC0geiksIG8ub3BhY2l0eSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGxhYihsLCBhLCBiLCBvcGFjaXR5KSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gbGFiQ29udmVydChsKSA6IG5ldyBMYWIobCwgYSwgYiwgb3BhY2l0eSA9PSBudWxsID8gMSA6IG9wYWNpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gTGFiKGwsIGEsIGIsIG9wYWNpdHkpIHtcbiAgdGhpcy5sID0gK2w7XG4gIHRoaXMuYSA9ICthO1xuICB0aGlzLmIgPSArYjtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShMYWIsIGxhYiwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyOiBmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIG5ldyBMYWIodGhpcy5sICsgS24gKiAoayA9PSBudWxsID8gMSA6IGspLCB0aGlzLmEsIHRoaXMuYiwgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyOiBmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIG5ldyBMYWIodGhpcy5sIC0gS24gKiAoayA9PSBudWxsID8gMSA6IGspLCB0aGlzLmEsIHRoaXMuYiwgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgcmdiOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgeSA9ICh0aGlzLmwgKyAxNikgLyAxMTYsXG4gICAgICAgIHggPSBpc05hTih0aGlzLmEpID8geSA6IHkgKyB0aGlzLmEgLyA1MDAsXG4gICAgICAgIHogPSBpc05hTih0aGlzLmIpID8geSA6IHkgLSB0aGlzLmIgLyAyMDA7XG4gICAgeSA9IFluICogbGFiMnh5eih5KTtcbiAgICB4ID0gWG4gKiBsYWIyeHl6KHgpO1xuICAgIHogPSBabiAqIGxhYjJ4eXooeik7XG4gICAgcmV0dXJuIG5ldyBSZ2IoXG4gICAgICB4eXoycmdiKCAzLjI0MDQ1NDIgKiB4IC0gMS41MzcxMzg1ICogeSAtIDAuNDk4NTMxNCAqIHopLCAvLyBENjUgLT4gc1JHQlxuICAgICAgeHl6MnJnYigtMC45NjkyNjYwICogeCArIDEuODc2MDEwOCAqIHkgKyAwLjA0MTU1NjAgKiB6KSxcbiAgICAgIHh5ejJyZ2IoIDAuMDU1NjQzNCAqIHggLSAwLjIwNDAyNTkgKiB5ICsgMS4wNTcyMjUyICogeiksXG4gICAgICB0aGlzLm9wYWNpdHlcbiAgICApO1xuICB9XG59KSk7XG5cbmZ1bmN0aW9uIHh5ejJsYWIodCkge1xuICByZXR1cm4gdCA+IHQzID8gTWF0aC5wb3codCwgMSAvIDMpIDogdCAvIHQyICsgdDA7XG59XG5cbmZ1bmN0aW9uIGxhYjJ4eXoodCkge1xuICByZXR1cm4gdCA+IHQxID8gdCAqIHQgKiB0IDogdDIgKiAodCAtIHQwKTtcbn1cblxuZnVuY3Rpb24geHl6MnJnYih4KSB7XG4gIHJldHVybiAyNTUgKiAoeCA8PSAwLjAwMzEzMDggPyAxMi45MiAqIHggOiAxLjA1NSAqIE1hdGgucG93KHgsIDEgLyAyLjQpIC0gMC4wNTUpO1xufVxuXG5mdW5jdGlvbiByZ2IyeHl6KHgpIHtcbiAgcmV0dXJuICh4IC89IDI1NSkgPD0gMC4wNDA0NSA/IHggLyAxMi45MiA6IE1hdGgucG93KCh4ICsgMC4wNTUpIC8gMS4wNTUsIDIuNCk7XG59XG5cbmZ1bmN0aW9uIGhjbENvbnZlcnQobykge1xuICBpZiAobyBpbnN0YW5jZW9mIEhjbCkgcmV0dXJuIG5ldyBIY2woby5oLCBvLmMsIG8ubCwgby5vcGFjaXR5KTtcbiAgaWYgKCEobyBpbnN0YW5jZW9mIExhYikpIG8gPSBsYWJDb252ZXJ0KG8pO1xuICB2YXIgaCA9IE1hdGguYXRhbjIoby5iLCBvLmEpICogcmFkMmRlZztcbiAgcmV0dXJuIG5ldyBIY2woaCA8IDAgPyBoICsgMzYwIDogaCwgTWF0aC5zcXJ0KG8uYSAqIG8uYSArIG8uYiAqIG8uYiksIG8ubCwgby5vcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhjbChoLCBjLCBsLCBvcGFjaXR5KSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gaGNsQ29udmVydChoKSA6IG5ldyBIY2woaCwgYywgbCwgb3BhY2l0eSA9PSBudWxsID8gMSA6IG9wYWNpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gSGNsKGgsIGMsIGwsIG9wYWNpdHkpIHtcbiAgdGhpcy5oID0gK2g7XG4gIHRoaXMuYyA9ICtjO1xuICB0aGlzLmwgPSArbDtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShIY2wsIGhjbCwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyOiBmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIG5ldyBIY2wodGhpcy5oLCB0aGlzLmMsIHRoaXMubCArIEtuICogKGsgPT0gbnVsbCA/IDEgOiBrKSwgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyOiBmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIG5ldyBIY2wodGhpcy5oLCB0aGlzLmMsIHRoaXMubCAtIEtuICogKGsgPT0gbnVsbCA/IDEgOiBrKSwgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgcmdiOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbGFiQ29udmVydCh0aGlzKS5yZ2IoKTtcbiAgfVxufSkpO1xuIiwiaW1wb3J0IGRlZmluZSwge2V4dGVuZH0gZnJvbSBcIi4vZGVmaW5lXCI7XG5pbXBvcnQge0NvbG9yLCByZ2JDb252ZXJ0LCBSZ2IsIGRhcmtlciwgYnJpZ2h0ZXJ9IGZyb20gXCIuL2NvbG9yXCI7XG5pbXBvcnQge2RlZzJyYWQsIHJhZDJkZWd9IGZyb20gXCIuL21hdGhcIjtcblxudmFyIEEgPSAtMC4xNDg2MSxcbiAgICBCID0gKzEuNzgyNzcsXG4gICAgQyA9IC0wLjI5MjI3LFxuICAgIEQgPSAtMC45MDY0OSxcbiAgICBFID0gKzEuOTcyOTQsXG4gICAgRUQgPSBFICogRCxcbiAgICBFQiA9IEUgKiBCLFxuICAgIEJDX0RBID0gQiAqIEMgLSBEICogQTtcblxuZnVuY3Rpb24gY3ViZWhlbGl4Q29udmVydChvKSB7XG4gIGlmIChvIGluc3RhbmNlb2YgQ3ViZWhlbGl4KSByZXR1cm4gbmV3IEN1YmVoZWxpeChvLmgsIG8ucywgby5sLCBvLm9wYWNpdHkpO1xuICBpZiAoIShvIGluc3RhbmNlb2YgUmdiKSkgbyA9IHJnYkNvbnZlcnQobyk7XG4gIHZhciByID0gby5yIC8gMjU1LFxuICAgICAgZyA9IG8uZyAvIDI1NSxcbiAgICAgIGIgPSBvLmIgLyAyNTUsXG4gICAgICBsID0gKEJDX0RBICogYiArIEVEICogciAtIEVCICogZykgLyAoQkNfREEgKyBFRCAtIEVCKSxcbiAgICAgIGJsID0gYiAtIGwsXG4gICAgICBrID0gKEUgKiAoZyAtIGwpIC0gQyAqIGJsKSAvIEQsXG4gICAgICBzID0gTWF0aC5zcXJ0KGsgKiBrICsgYmwgKiBibCkgLyAoRSAqIGwgKiAoMSAtIGwpKSwgLy8gTmFOIGlmIGw9MCBvciBsPTFcbiAgICAgIGggPSBzID8gTWF0aC5hdGFuMihrLCBibCkgKiByYWQyZGVnIC0gMTIwIDogTmFOO1xuICByZXR1cm4gbmV3IEN1YmVoZWxpeChoIDwgMCA/IGggKyAzNjAgOiBoLCBzLCBsLCBvLm9wYWNpdHkpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjdWJlaGVsaXgoaCwgcywgbCwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGN1YmVoZWxpeENvbnZlcnQoaCkgOiBuZXcgQ3ViZWhlbGl4KGgsIHMsIGwsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIEN1YmVoZWxpeChoLCBzLCBsLCBvcGFjaXR5KSB7XG4gIHRoaXMuaCA9ICtoO1xuICB0aGlzLnMgPSArcztcbiAgdGhpcy5sID0gK2w7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoQ3ViZWhlbGl4LCBjdWJlaGVsaXgsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBicmlnaHRlciA6IE1hdGgucG93KGJyaWdodGVyLCBrKTtcbiAgICByZXR1cm4gbmV3IEN1YmVoZWxpeCh0aGlzLmgsIHRoaXMucywgdGhpcy5sICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGRhcmtlciA6IE1hdGgucG93KGRhcmtlciwgayk7XG4gICAgcmV0dXJuIG5ldyBDdWJlaGVsaXgodGhpcy5oLCB0aGlzLnMsIHRoaXMubCAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGggPSBpc05hTih0aGlzLmgpID8gMCA6ICh0aGlzLmggKyAxMjApICogZGVnMnJhZCxcbiAgICAgICAgbCA9ICt0aGlzLmwsXG4gICAgICAgIGEgPSBpc05hTih0aGlzLnMpID8gMCA6IHRoaXMucyAqIGwgKiAoMSAtIGwpLFxuICAgICAgICBjb3NoID0gTWF0aC5jb3MoaCksXG4gICAgICAgIHNpbmggPSBNYXRoLnNpbihoKTtcbiAgICByZXR1cm4gbmV3IFJnYihcbiAgICAgIDI1NSAqIChsICsgYSAqIChBICogY29zaCArIEIgKiBzaW5oKSksXG4gICAgICAyNTUgKiAobCArIGEgKiAoQyAqIGNvc2ggKyBEICogc2luaCkpLFxuICAgICAgMjU1ICogKGwgKyBhICogKEUgKiBjb3NoKSksXG4gICAgICB0aGlzLm9wYWNpdHlcbiAgICApO1xuICB9XG59KSk7XG4iLCJleHBvcnQgZnVuY3Rpb24gYmFzaXModDEsIHYwLCB2MSwgdjIsIHYzKSB7XG4gIHZhciB0MiA9IHQxICogdDEsIHQzID0gdDIgKiB0MTtcbiAgcmV0dXJuICgoMSAtIDMgKiB0MSArIDMgKiB0MiAtIHQzKSAqIHYwXG4gICAgICArICg0IC0gNiAqIHQyICsgMyAqIHQzKSAqIHYxXG4gICAgICArICgxICsgMyAqIHQxICsgMyAqIHQyIC0gMyAqIHQzKSAqIHYyXG4gICAgICArIHQzICogdjMpIC8gNjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWVzKSB7XG4gIHZhciBuID0gdmFsdWVzLmxlbmd0aCAtIDE7XG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgdmFyIGkgPSB0IDw9IDAgPyAodCA9IDApIDogdCA+PSAxID8gKHQgPSAxLCBuIC0gMSkgOiBNYXRoLmZsb29yKHQgKiBuKSxcbiAgICAgICAgdjEgPSB2YWx1ZXNbaV0sXG4gICAgICAgIHYyID0gdmFsdWVzW2kgKyAxXSxcbiAgICAgICAgdjAgPSBpID4gMCA/IHZhbHVlc1tpIC0gMV0gOiAyICogdjEgLSB2MixcbiAgICAgICAgdjMgPSBpIDwgbiAtIDEgPyB2YWx1ZXNbaSArIDJdIDogMiAqIHYyIC0gdjE7XG4gICAgcmV0dXJuIGJhc2lzKCh0IC0gaSAvIG4pICogbiwgdjAsIHYxLCB2MiwgdjMpO1xuICB9O1xufVxuIiwiaW1wb3J0IHtiYXNpc30gZnJvbSBcIi4vYmFzaXNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWVzKSB7XG4gIHZhciBuID0gdmFsdWVzLmxlbmd0aDtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgaSA9IE1hdGguZmxvb3IoKCh0ICU9IDEpIDwgMCA/ICsrdCA6IHQpICogbiksXG4gICAgICAgIHYwID0gdmFsdWVzWyhpICsgbiAtIDEpICUgbl0sXG4gICAgICAgIHYxID0gdmFsdWVzW2kgJSBuXSxcbiAgICAgICAgdjIgPSB2YWx1ZXNbKGkgKyAxKSAlIG5dLFxuICAgICAgICB2MyA9IHZhbHVlc1soaSArIDIpICUgbl07XG4gICAgcmV0dXJuIGJhc2lzKCh0IC0gaSAvIG4pICogbiwgdjAsIHYxLCB2MiwgdjMpO1xuICB9O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHg7XG4gIH07XG59XG4iLCJpbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4vY29uc3RhbnRcIjtcblxuZnVuY3Rpb24gbGluZWFyKGEsIGQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gYSArIHQgKiBkO1xuICB9O1xufVxuXG5mdW5jdGlvbiBleHBvbmVudGlhbChhLCBiLCB5KSB7XG4gIHJldHVybiBhID0gTWF0aC5wb3coYSwgeSksIGIgPSBNYXRoLnBvdyhiLCB5KSAtIGEsIHkgPSAxIC8geSwgZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBNYXRoLnBvdyhhICsgdCAqIGIsIHkpO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaHVlKGEsIGIpIHtcbiAgdmFyIGQgPSBiIC0gYTtcbiAgcmV0dXJuIGQgPyBsaW5lYXIoYSwgZCA+IDE4MCB8fCBkIDwgLTE4MCA/IGQgLSAzNjAgKiBNYXRoLnJvdW5kKGQgLyAzNjApIDogZCkgOiBjb25zdGFudChpc05hTihhKSA/IGIgOiBhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdhbW1hKHkpIHtcbiAgcmV0dXJuICh5ID0gK3kpID09PSAxID8gbm9nYW1tYSA6IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYiAtIGEgPyBleHBvbmVudGlhbChhLCBiLCB5KSA6IGNvbnN0YW50KGlzTmFOKGEpID8gYiA6IGEpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBub2dhbW1hKGEsIGIpIHtcbiAgdmFyIGQgPSBiIC0gYTtcbiAgcmV0dXJuIGQgPyBsaW5lYXIoYSwgZCkgOiBjb25zdGFudChpc05hTihhKSA/IGIgOiBhKTtcbn1cbiIsImltcG9ydCB7cmdiIGFzIGNvbG9yUmdifSBmcm9tIFwiZDMtY29sb3JcIjtcbmltcG9ydCBiYXNpcyBmcm9tIFwiLi9iYXNpc1wiO1xuaW1wb3J0IGJhc2lzQ2xvc2VkIGZyb20gXCIuL2Jhc2lzQ2xvc2VkXCI7XG5pbXBvcnQgbm9nYW1tYSwge2dhbW1hfSBmcm9tIFwiLi9jb2xvclwiO1xuXG5leHBvcnQgZGVmYXVsdCAoZnVuY3Rpb24gcmdiR2FtbWEoeSkge1xuICB2YXIgY29sb3IgPSBnYW1tYSh5KTtcblxuICBmdW5jdGlvbiByZ2Ioc3RhcnQsIGVuZCkge1xuICAgIHZhciByID0gY29sb3IoKHN0YXJ0ID0gY29sb3JSZ2Ioc3RhcnQpKS5yLCAoZW5kID0gY29sb3JSZ2IoZW5kKSkuciksXG4gICAgICAgIGcgPSBjb2xvcihzdGFydC5nLCBlbmQuZyksXG4gICAgICAgIGIgPSBjb2xvcihzdGFydC5iLCBlbmQuYiksXG4gICAgICAgIG9wYWNpdHkgPSBub2dhbW1hKHN0YXJ0Lm9wYWNpdHksIGVuZC5vcGFjaXR5KTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgc3RhcnQuciA9IHIodCk7XG4gICAgICBzdGFydC5nID0gZyh0KTtcbiAgICAgIHN0YXJ0LmIgPSBiKHQpO1xuICAgICAgc3RhcnQub3BhY2l0eSA9IG9wYWNpdHkodCk7XG4gICAgICByZXR1cm4gc3RhcnQgKyBcIlwiO1xuICAgIH07XG4gIH1cblxuICByZ2IuZ2FtbWEgPSByZ2JHYW1tYTtcblxuICByZXR1cm4gcmdiO1xufSkoMSk7XG5cbmZ1bmN0aW9uIHJnYlNwbGluZShzcGxpbmUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbG9ycykge1xuICAgIHZhciBuID0gY29sb3JzLmxlbmd0aCxcbiAgICAgICAgciA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgZyA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgYiA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgaSwgY29sb3I7XG4gICAgZm9yIChpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgY29sb3IgPSBjb2xvclJnYihjb2xvcnNbaV0pO1xuICAgICAgcltpXSA9IGNvbG9yLnIgfHwgMDtcbiAgICAgIGdbaV0gPSBjb2xvci5nIHx8IDA7XG4gICAgICBiW2ldID0gY29sb3IuYiB8fCAwO1xuICAgIH1cbiAgICByID0gc3BsaW5lKHIpO1xuICAgIGcgPSBzcGxpbmUoZyk7XG4gICAgYiA9IHNwbGluZShiKTtcbiAgICBjb2xvci5vcGFjaXR5ID0gMTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgY29sb3IuciA9IHIodCk7XG4gICAgICBjb2xvci5nID0gZyh0KTtcbiAgICAgIGNvbG9yLmIgPSBiKHQpO1xuICAgICAgcmV0dXJuIGNvbG9yICsgXCJcIjtcbiAgICB9O1xuICB9O1xufVxuXG5leHBvcnQgdmFyIHJnYkJhc2lzID0gcmdiU3BsaW5lKGJhc2lzKTtcbmV4cG9ydCB2YXIgcmdiQmFzaXNDbG9zZWQgPSByZ2JTcGxpbmUoYmFzaXNDbG9zZWQpO1xuIiwiaW1wb3J0IHZhbHVlIGZyb20gXCIuL3ZhbHVlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIG5iID0gYiA/IGIubGVuZ3RoIDogMCxcbiAgICAgIG5hID0gYSA/IE1hdGgubWluKG5iLCBhLmxlbmd0aCkgOiAwLFxuICAgICAgeCA9IG5ldyBBcnJheShuYSksXG4gICAgICBjID0gbmV3IEFycmF5KG5iKSxcbiAgICAgIGk7XG5cbiAgZm9yIChpID0gMDsgaSA8IG5hOyArK2kpIHhbaV0gPSB2YWx1ZShhW2ldLCBiW2ldKTtcbiAgZm9yICg7IGkgPCBuYjsgKytpKSBjW2ldID0gYltpXTtcblxuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBuYTsgKytpKSBjW2ldID0geFtpXSh0KTtcbiAgICByZXR1cm4gYztcbiAgfTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZTtcbiAgcmV0dXJuIGEgPSArYSwgYiAtPSBhLCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIGQuc2V0VGltZShhICsgYiAqIHQpLCBkO1xuICB9O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICByZXR1cm4gYSA9ICthLCBiIC09IGEsIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gYSArIGIgKiB0O1xuICB9O1xufVxuIiwiaW1wb3J0IHZhbHVlIGZyb20gXCIuL3ZhbHVlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGkgPSB7fSxcbiAgICAgIGMgPSB7fSxcbiAgICAgIGs7XG5cbiAgaWYgKGEgPT09IG51bGwgfHwgdHlwZW9mIGEgIT09IFwib2JqZWN0XCIpIGEgPSB7fTtcbiAgaWYgKGIgPT09IG51bGwgfHwgdHlwZW9mIGIgIT09IFwib2JqZWN0XCIpIGIgPSB7fTtcblxuICBmb3IgKGsgaW4gYikge1xuICAgIGlmIChrIGluIGEpIHtcbiAgICAgIGlba10gPSB2YWx1ZShhW2tdLCBiW2tdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY1trXSA9IGJba107XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICBmb3IgKGsgaW4gaSkgY1trXSA9IGlba10odCk7XG4gICAgcmV0dXJuIGM7XG4gIH07XG59XG4iLCJpbXBvcnQgbnVtYmVyIGZyb20gXCIuL251bWJlclwiO1xuXG52YXIgcmVBID0gL1stK10/KD86XFxkK1xcLj9cXGQqfFxcLj9cXGQrKSg/OltlRV1bLStdP1xcZCspPy9nLFxuICAgIHJlQiA9IG5ldyBSZWdFeHAocmVBLnNvdXJjZSwgXCJnXCIpO1xuXG5mdW5jdGlvbiB6ZXJvKGIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBiO1xuICB9O1xufVxuXG5mdW5jdGlvbiBvbmUoYikge1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBiKHQpICsgXCJcIjtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICB2YXIgYmkgPSByZUEubGFzdEluZGV4ID0gcmVCLmxhc3RJbmRleCA9IDAsIC8vIHNjYW4gaW5kZXggZm9yIG5leHQgbnVtYmVyIGluIGJcbiAgICAgIGFtLCAvLyBjdXJyZW50IG1hdGNoIGluIGFcbiAgICAgIGJtLCAvLyBjdXJyZW50IG1hdGNoIGluIGJcbiAgICAgIGJzLCAvLyBzdHJpbmcgcHJlY2VkaW5nIGN1cnJlbnQgbnVtYmVyIGluIGIsIGlmIGFueVxuICAgICAgaSA9IC0xLCAvLyBpbmRleCBpbiBzXG4gICAgICBzID0gW10sIC8vIHN0cmluZyBjb25zdGFudHMgYW5kIHBsYWNlaG9sZGVyc1xuICAgICAgcSA9IFtdOyAvLyBudW1iZXIgaW50ZXJwb2xhdG9yc1xuXG4gIC8vIENvZXJjZSBpbnB1dHMgdG8gc3RyaW5ncy5cbiAgYSA9IGEgKyBcIlwiLCBiID0gYiArIFwiXCI7XG5cbiAgLy8gSW50ZXJwb2xhdGUgcGFpcnMgb2YgbnVtYmVycyBpbiBhICYgYi5cbiAgd2hpbGUgKChhbSA9IHJlQS5leGVjKGEpKVxuICAgICAgJiYgKGJtID0gcmVCLmV4ZWMoYikpKSB7XG4gICAgaWYgKChicyA9IGJtLmluZGV4KSA+IGJpKSB7IC8vIGEgc3RyaW5nIHByZWNlZGVzIHRoZSBuZXh0IG51bWJlciBpbiBiXG4gICAgICBicyA9IGIuc2xpY2UoYmksIGJzKTtcbiAgICAgIGlmIChzW2ldKSBzW2ldICs9IGJzOyAvLyBjb2FsZXNjZSB3aXRoIHByZXZpb3VzIHN0cmluZ1xuICAgICAgZWxzZSBzWysraV0gPSBicztcbiAgICB9XG4gICAgaWYgKChhbSA9IGFtWzBdKSA9PT0gKGJtID0gYm1bMF0pKSB7IC8vIG51bWJlcnMgaW4gYSAmIGIgbWF0Y2hcbiAgICAgIGlmIChzW2ldKSBzW2ldICs9IGJtOyAvLyBjb2FsZXNjZSB3aXRoIHByZXZpb3VzIHN0cmluZ1xuICAgICAgZWxzZSBzWysraV0gPSBibTtcbiAgICB9IGVsc2UgeyAvLyBpbnRlcnBvbGF0ZSBub24tbWF0Y2hpbmcgbnVtYmVyc1xuICAgICAgc1srK2ldID0gbnVsbDtcbiAgICAgIHEucHVzaCh7aTogaSwgeDogbnVtYmVyKGFtLCBibSl9KTtcbiAgICB9XG4gICAgYmkgPSByZUIubGFzdEluZGV4O1xuICB9XG5cbiAgLy8gQWRkIHJlbWFpbnMgb2YgYi5cbiAgaWYgKGJpIDwgYi5sZW5ndGgpIHtcbiAgICBicyA9IGIuc2xpY2UoYmkpO1xuICAgIGlmIChzW2ldKSBzW2ldICs9IGJzOyAvLyBjb2FsZXNjZSB3aXRoIHByZXZpb3VzIHN0cmluZ1xuICAgIGVsc2Ugc1srK2ldID0gYnM7XG4gIH1cblxuICAvLyBTcGVjaWFsIG9wdGltaXphdGlvbiBmb3Igb25seSBhIHNpbmdsZSBtYXRjaC5cbiAgLy8gT3RoZXJ3aXNlLCBpbnRlcnBvbGF0ZSBlYWNoIG9mIHRoZSBudW1iZXJzIGFuZCByZWpvaW4gdGhlIHN0cmluZy5cbiAgcmV0dXJuIHMubGVuZ3RoIDwgMiA/IChxWzBdXG4gICAgICA/IG9uZShxWzBdLngpXG4gICAgICA6IHplcm8oYikpXG4gICAgICA6IChiID0gcS5sZW5ndGgsIGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbzsgaSA8IGI7ICsraSkgc1sobyA9IHFbaV0pLmldID0gby54KHQpO1xuICAgICAgICAgIHJldHVybiBzLmpvaW4oXCJcIik7XG4gICAgICAgIH0pO1xufVxuIiwiaW1wb3J0IHtjb2xvcn0gZnJvbSBcImQzLWNvbG9yXCI7XG5pbXBvcnQgcmdiIGZyb20gXCIuL3JnYlwiO1xuaW1wb3J0IGFycmF5IGZyb20gXCIuL2FycmF5XCI7XG5pbXBvcnQgZGF0ZSBmcm9tIFwiLi9kYXRlXCI7XG5pbXBvcnQgbnVtYmVyIGZyb20gXCIuL251bWJlclwiO1xuaW1wb3J0IG9iamVjdCBmcm9tIFwiLi9vYmplY3RcIjtcbmltcG9ydCBzdHJpbmcgZnJvbSBcIi4vc3RyaW5nXCI7XG5pbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4vY29uc3RhbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICB2YXIgdCA9IHR5cGVvZiBiLCBjO1xuICByZXR1cm4gYiA9PSBudWxsIHx8IHQgPT09IFwiYm9vbGVhblwiID8gY29uc3RhbnQoYilcbiAgICAgIDogKHQgPT09IFwibnVtYmVyXCIgPyBudW1iZXJcbiAgICAgIDogdCA9PT0gXCJzdHJpbmdcIiA/ICgoYyA9IGNvbG9yKGIpKSA/IChiID0gYywgcmdiKSA6IHN0cmluZylcbiAgICAgIDogYiBpbnN0YW5jZW9mIGNvbG9yID8gcmdiXG4gICAgICA6IGIgaW5zdGFuY2VvZiBEYXRlID8gZGF0ZVxuICAgICAgOiBBcnJheS5pc0FycmF5KGIpID8gYXJyYXlcbiAgICAgIDogdHlwZW9mIGIudmFsdWVPZiAhPT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBiLnRvU3RyaW5nICE9PSBcImZ1bmN0aW9uXCIgfHwgaXNOYU4oYikgPyBvYmplY3RcbiAgICAgIDogbnVtYmVyKShhLCBiKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEgPSArYSwgYiAtPSBhLCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoYSArIGIgKiB0KTtcbiAgfTtcbn1cbiIsInZhciBkZWdyZWVzID0gMTgwIC8gTWF0aC5QSTtcblxuZXhwb3J0IHZhciBpZGVudGl0eSA9IHtcbiAgdHJhbnNsYXRlWDogMCxcbiAgdHJhbnNsYXRlWTogMCxcbiAgcm90YXRlOiAwLFxuICBza2V3WDogMCxcbiAgc2NhbGVYOiAxLFxuICBzY2FsZVk6IDFcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgdmFyIHNjYWxlWCwgc2NhbGVZLCBza2V3WDtcbiAgaWYgKHNjYWxlWCA9IE1hdGguc3FydChhICogYSArIGIgKiBiKSkgYSAvPSBzY2FsZVgsIGIgLz0gc2NhbGVYO1xuICBpZiAoc2tld1ggPSBhICogYyArIGIgKiBkKSBjIC09IGEgKiBza2V3WCwgZCAtPSBiICogc2tld1g7XG4gIGlmIChzY2FsZVkgPSBNYXRoLnNxcnQoYyAqIGMgKyBkICogZCkpIGMgLz0gc2NhbGVZLCBkIC89IHNjYWxlWSwgc2tld1ggLz0gc2NhbGVZO1xuICBpZiAoYSAqIGQgPCBiICogYykgYSA9IC1hLCBiID0gLWIsIHNrZXdYID0gLXNrZXdYLCBzY2FsZVggPSAtc2NhbGVYO1xuICByZXR1cm4ge1xuICAgIHRyYW5zbGF0ZVg6IGUsXG4gICAgdHJhbnNsYXRlWTogZixcbiAgICByb3RhdGU6IE1hdGguYXRhbjIoYiwgYSkgKiBkZWdyZWVzLFxuICAgIHNrZXdYOiBNYXRoLmF0YW4oc2tld1gpICogZGVncmVlcyxcbiAgICBzY2FsZVg6IHNjYWxlWCxcbiAgICBzY2FsZVk6IHNjYWxlWVxuICB9O1xufVxuIiwiaW1wb3J0IGRlY29tcG9zZSwge2lkZW50aXR5fSBmcm9tIFwiLi9kZWNvbXBvc2VcIjtcblxudmFyIGNzc05vZGUsXG4gICAgY3NzUm9vdCxcbiAgICBjc3NWaWV3LFxuICAgIHN2Z05vZGU7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNzcyh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IFwibm9uZVwiKSByZXR1cm4gaWRlbnRpdHk7XG4gIGlmICghY3NzTm9kZSkgY3NzTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIiksIGNzc1Jvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIGNzc1ZpZXcgPSBkb2N1bWVudC5kZWZhdWx0VmlldztcbiAgY3NzTm9kZS5zdHlsZS50cmFuc2Zvcm0gPSB2YWx1ZTtcbiAgdmFsdWUgPSBjc3NWaWV3LmdldENvbXB1dGVkU3R5bGUoY3NzUm9vdC5hcHBlbmRDaGlsZChjc3NOb2RlKSwgbnVsbCkuZ2V0UHJvcGVydHlWYWx1ZShcInRyYW5zZm9ybVwiKTtcbiAgY3NzUm9vdC5yZW1vdmVDaGlsZChjc3NOb2RlKTtcbiAgdmFsdWUgPSB2YWx1ZS5zbGljZSg3LCAtMSkuc3BsaXQoXCIsXCIpO1xuICByZXR1cm4gZGVjb21wb3NlKCt2YWx1ZVswXSwgK3ZhbHVlWzFdLCArdmFsdWVbMl0sICt2YWx1ZVszXSwgK3ZhbHVlWzRdLCArdmFsdWVbNV0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTdmcodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBpZGVudGl0eTtcbiAgaWYgKCFzdmdOb2RlKSBzdmdOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgXCJnXCIpO1xuICBzdmdOb2RlLnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCB2YWx1ZSk7XG4gIGlmICghKHZhbHVlID0gc3ZnTm9kZS50cmFuc2Zvcm0uYmFzZVZhbC5jb25zb2xpZGF0ZSgpKSkgcmV0dXJuIGlkZW50aXR5O1xuICB2YWx1ZSA9IHZhbHVlLm1hdHJpeDtcbiAgcmV0dXJuIGRlY29tcG9zZSh2YWx1ZS5hLCB2YWx1ZS5iLCB2YWx1ZS5jLCB2YWx1ZS5kLCB2YWx1ZS5lLCB2YWx1ZS5mKTtcbn1cbiIsImltcG9ydCBudW1iZXIgZnJvbSBcIi4uL251bWJlclwiO1xuaW1wb3J0IHtwYXJzZUNzcywgcGFyc2VTdmd9IGZyb20gXCIuL3BhcnNlXCI7XG5cbmZ1bmN0aW9uIGludGVycG9sYXRlVHJhbnNmb3JtKHBhcnNlLCBweENvbW1hLCBweFBhcmVuLCBkZWdQYXJlbikge1xuXG4gIGZ1bmN0aW9uIHBvcChzKSB7XG4gICAgcmV0dXJuIHMubGVuZ3RoID8gcy5wb3AoKSArIFwiIFwiIDogXCJcIjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zbGF0ZSh4YSwgeWEsIHhiLCB5YiwgcywgcSkge1xuICAgIGlmICh4YSAhPT0geGIgfHwgeWEgIT09IHliKSB7XG4gICAgICB2YXIgaSA9IHMucHVzaChcInRyYW5zbGF0ZShcIiwgbnVsbCwgcHhDb21tYSwgbnVsbCwgcHhQYXJlbik7XG4gICAgICBxLnB1c2goe2k6IGkgLSA0LCB4OiBudW1iZXIoeGEsIHhiKX0sIHtpOiBpIC0gMiwgeDogbnVtYmVyKHlhLCB5Yil9KTtcbiAgICB9IGVsc2UgaWYgKHhiIHx8IHliKSB7XG4gICAgICBzLnB1c2goXCJ0cmFuc2xhdGUoXCIgKyB4YiArIHB4Q29tbWEgKyB5YiArIHB4UGFyZW4pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJvdGF0ZShhLCBiLCBzLCBxKSB7XG4gICAgaWYgKGEgIT09IGIpIHtcbiAgICAgIGlmIChhIC0gYiA+IDE4MCkgYiArPSAzNjA7IGVsc2UgaWYgKGIgLSBhID4gMTgwKSBhICs9IDM2MDsgLy8gc2hvcnRlc3QgcGF0aFxuICAgICAgcS5wdXNoKHtpOiBzLnB1c2gocG9wKHMpICsgXCJyb3RhdGUoXCIsIG51bGwsIGRlZ1BhcmVuKSAtIDIsIHg6IG51bWJlcihhLCBiKX0pO1xuICAgIH0gZWxzZSBpZiAoYikge1xuICAgICAgcy5wdXNoKHBvcChzKSArIFwicm90YXRlKFwiICsgYiArIGRlZ1BhcmVuKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBza2V3WChhLCBiLCBzLCBxKSB7XG4gICAgaWYgKGEgIT09IGIpIHtcbiAgICAgIHEucHVzaCh7aTogcy5wdXNoKHBvcChzKSArIFwic2tld1goXCIsIG51bGwsIGRlZ1BhcmVuKSAtIDIsIHg6IG51bWJlcihhLCBiKX0pO1xuICAgIH0gZWxzZSBpZiAoYikge1xuICAgICAgcy5wdXNoKHBvcChzKSArIFwic2tld1goXCIgKyBiICsgZGVnUGFyZW4pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNjYWxlKHhhLCB5YSwgeGIsIHliLCBzLCBxKSB7XG4gICAgaWYgKHhhICE9PSB4YiB8fCB5YSAhPT0geWIpIHtcbiAgICAgIHZhciBpID0gcy5wdXNoKHBvcChzKSArIFwic2NhbGUoXCIsIG51bGwsIFwiLFwiLCBudWxsLCBcIilcIik7XG4gICAgICBxLnB1c2goe2k6IGkgLSA0LCB4OiBudW1iZXIoeGEsIHhiKX0sIHtpOiBpIC0gMiwgeDogbnVtYmVyKHlhLCB5Yil9KTtcbiAgICB9IGVsc2UgaWYgKHhiICE9PSAxIHx8IHliICE9PSAxKSB7XG4gICAgICBzLnB1c2gocG9wKHMpICsgXCJzY2FsZShcIiArIHhiICsgXCIsXCIgKyB5YiArIFwiKVwiKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oYSwgYikge1xuICAgIHZhciBzID0gW10sIC8vIHN0cmluZyBjb25zdGFudHMgYW5kIHBsYWNlaG9sZGVyc1xuICAgICAgICBxID0gW107IC8vIG51bWJlciBpbnRlcnBvbGF0b3JzXG4gICAgYSA9IHBhcnNlKGEpLCBiID0gcGFyc2UoYik7XG4gICAgdHJhbnNsYXRlKGEudHJhbnNsYXRlWCwgYS50cmFuc2xhdGVZLCBiLnRyYW5zbGF0ZVgsIGIudHJhbnNsYXRlWSwgcywgcSk7XG4gICAgcm90YXRlKGEucm90YXRlLCBiLnJvdGF0ZSwgcywgcSk7XG4gICAgc2tld1goYS5za2V3WCwgYi5za2V3WCwgcywgcSk7XG4gICAgc2NhbGUoYS5zY2FsZVgsIGEuc2NhbGVZLCBiLnNjYWxlWCwgYi5zY2FsZVksIHMsIHEpO1xuICAgIGEgPSBiID0gbnVsbDsgLy8gZ2NcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgdmFyIGkgPSAtMSwgbiA9IHEubGVuZ3RoLCBvO1xuICAgICAgd2hpbGUgKCsraSA8IG4pIHNbKG8gPSBxW2ldKS5pXSA9IG8ueCh0KTtcbiAgICAgIHJldHVybiBzLmpvaW4oXCJcIik7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IHZhciBpbnRlcnBvbGF0ZVRyYW5zZm9ybUNzcyA9IGludGVycG9sYXRlVHJhbnNmb3JtKHBhcnNlQ3NzLCBcInB4LCBcIiwgXCJweClcIiwgXCJkZWcpXCIpO1xuZXhwb3J0IHZhciBpbnRlcnBvbGF0ZVRyYW5zZm9ybVN2ZyA9IGludGVycG9sYXRlVHJhbnNmb3JtKHBhcnNlU3ZnLCBcIiwgXCIsIFwiKVwiLCBcIilcIik7XG4iLCJpbXBvcnQge2N1YmVoZWxpeCBhcyBjb2xvckN1YmVoZWxpeH0gZnJvbSBcImQzLWNvbG9yXCI7XG5pbXBvcnQgY29sb3IsIHtodWV9IGZyb20gXCIuL2NvbG9yXCI7XG5cbmZ1bmN0aW9uIGN1YmVoZWxpeChodWUpIHtcbiAgcmV0dXJuIChmdW5jdGlvbiBjdWJlaGVsaXhHYW1tYSh5KSB7XG4gICAgeSA9ICt5O1xuXG4gICAgZnVuY3Rpb24gY3ViZWhlbGl4KHN0YXJ0LCBlbmQpIHtcbiAgICAgIHZhciBoID0gaHVlKChzdGFydCA9IGNvbG9yQ3ViZWhlbGl4KHN0YXJ0KSkuaCwgKGVuZCA9IGNvbG9yQ3ViZWhlbGl4KGVuZCkpLmgpLFxuICAgICAgICAgIHMgPSBjb2xvcihzdGFydC5zLCBlbmQucyksXG4gICAgICAgICAgbCA9IGNvbG9yKHN0YXJ0LmwsIGVuZC5sKSxcbiAgICAgICAgICBvcGFjaXR5ID0gY29sb3Ioc3RhcnQub3BhY2l0eSwgZW5kLm9wYWNpdHkpO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgc3RhcnQuaCA9IGgodCk7XG4gICAgICAgIHN0YXJ0LnMgPSBzKHQpO1xuICAgICAgICBzdGFydC5sID0gbChNYXRoLnBvdyh0LCB5KSk7XG4gICAgICAgIHN0YXJ0Lm9wYWNpdHkgPSBvcGFjaXR5KHQpO1xuICAgICAgICByZXR1cm4gc3RhcnQgKyBcIlwiO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBjdWJlaGVsaXguZ2FtbWEgPSBjdWJlaGVsaXhHYW1tYTtcblxuICAgIHJldHVybiBjdWJlaGVsaXg7XG4gIH0pKDEpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjdWJlaGVsaXgoaHVlKTtcbmV4cG9ydCB2YXIgY3ViZWhlbGl4TG9uZyA9IGN1YmVoZWxpeChjb2xvcik7XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4geDtcbiAgfTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuICt4O1xufVxuIiwiaW1wb3J0IHtiaXNlY3R9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IHtpbnRlcnBvbGF0ZSBhcyBpbnRlcnBvbGF0ZVZhbHVlLCBpbnRlcnBvbGF0ZVJvdW5kfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcbmltcG9ydCB7bWFwLCBzbGljZX0gZnJvbSBcIi4vYXJyYXlcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi9jb25zdGFudFwiO1xuaW1wb3J0IG51bWJlciBmcm9tIFwiLi9udW1iZXJcIjtcblxudmFyIHVuaXQgPSBbMCwgMV07XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWludGVycG9sYXRlTGluZWFyKGEsIGIpIHtcbiAgcmV0dXJuIChiIC09IChhID0gK2EpKVxuICAgICAgPyBmdW5jdGlvbih4KSB7IHJldHVybiAoeCAtIGEpIC8gYjsgfVxuICAgICAgOiBjb25zdGFudChiKTtcbn1cblxuZnVuY3Rpb24gZGVpbnRlcnBvbGF0ZUNsYW1wKGRlaW50ZXJwb2xhdGUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICB2YXIgZCA9IGRlaW50ZXJwb2xhdGUoYSA9ICthLCBiID0gK2IpO1xuICAgIHJldHVybiBmdW5jdGlvbih4KSB7IHJldHVybiB4IDw9IGEgPyAwIDogeCA+PSBiID8gMSA6IGQoeCk7IH07XG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlaW50ZXJwb2xhdGVDbGFtcChyZWludGVycG9sYXRlKSB7XG4gIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgdmFyIHIgPSByZWludGVycG9sYXRlKGEgPSArYSwgYiA9ICtiKTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkgeyByZXR1cm4gdCA8PSAwID8gYSA6IHQgPj0gMSA/IGIgOiByKHQpOyB9O1xuICB9O1xufVxuXG5mdW5jdGlvbiBiaW1hcChkb21haW4sIHJhbmdlLCBkZWludGVycG9sYXRlLCByZWludGVycG9sYXRlKSB7XG4gIHZhciBkMCA9IGRvbWFpblswXSwgZDEgPSBkb21haW5bMV0sIHIwID0gcmFuZ2VbMF0sIHIxID0gcmFuZ2VbMV07XG4gIGlmIChkMSA8IGQwKSBkMCA9IGRlaW50ZXJwb2xhdGUoZDEsIGQwKSwgcjAgPSByZWludGVycG9sYXRlKHIxLCByMCk7XG4gIGVsc2UgZDAgPSBkZWludGVycG9sYXRlKGQwLCBkMSksIHIwID0gcmVpbnRlcnBvbGF0ZShyMCwgcjEpO1xuICByZXR1cm4gZnVuY3Rpb24oeCkgeyByZXR1cm4gcjAoZDAoeCkpOyB9O1xufVxuXG5mdW5jdGlvbiBwb2x5bWFwKGRvbWFpbiwgcmFuZ2UsIGRlaW50ZXJwb2xhdGUsIHJlaW50ZXJwb2xhdGUpIHtcbiAgdmFyIGogPSBNYXRoLm1pbihkb21haW4ubGVuZ3RoLCByYW5nZS5sZW5ndGgpIC0gMSxcbiAgICAgIGQgPSBuZXcgQXJyYXkoaiksXG4gICAgICByID0gbmV3IEFycmF5KGopLFxuICAgICAgaSA9IC0xO1xuXG4gIC8vIFJldmVyc2UgZGVzY2VuZGluZyBkb21haW5zLlxuICBpZiAoZG9tYWluW2pdIDwgZG9tYWluWzBdKSB7XG4gICAgZG9tYWluID0gZG9tYWluLnNsaWNlKCkucmV2ZXJzZSgpO1xuICAgIHJhbmdlID0gcmFuZ2Uuc2xpY2UoKS5yZXZlcnNlKCk7XG4gIH1cblxuICB3aGlsZSAoKytpIDwgaikge1xuICAgIGRbaV0gPSBkZWludGVycG9sYXRlKGRvbWFpbltpXSwgZG9tYWluW2kgKyAxXSk7XG4gICAgcltpXSA9IHJlaW50ZXJwb2xhdGUocmFuZ2VbaV0sIHJhbmdlW2kgKyAxXSk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgIHZhciBpID0gYmlzZWN0KGRvbWFpbiwgeCwgMSwgaikgLSAxO1xuICAgIHJldHVybiByW2ldKGRbaV0oeCkpO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29weShzb3VyY2UsIHRhcmdldCkge1xuICByZXR1cm4gdGFyZ2V0XG4gICAgICAuZG9tYWluKHNvdXJjZS5kb21haW4oKSlcbiAgICAgIC5yYW5nZShzb3VyY2UucmFuZ2UoKSlcbiAgICAgIC5pbnRlcnBvbGF0ZShzb3VyY2UuaW50ZXJwb2xhdGUoKSlcbiAgICAgIC5jbGFtcChzb3VyY2UuY2xhbXAoKSk7XG59XG5cbi8vIGRlaW50ZXJwb2xhdGUoYSwgYikoeCkgdGFrZXMgYSBkb21haW4gdmFsdWUgeCBpbiBbYSxiXSBhbmQgcmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyBwYXJhbWV0ZXIgdCBpbiBbMCwxXS5cbi8vIHJlaW50ZXJwb2xhdGUoYSwgYikodCkgdGFrZXMgYSBwYXJhbWV0ZXIgdCBpbiBbMCwxXSBhbmQgcmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyBkb21haW4gdmFsdWUgeCBpbiBbYSxiXS5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbnRpbnVvdXMoZGVpbnRlcnBvbGF0ZSwgcmVpbnRlcnBvbGF0ZSkge1xuICB2YXIgZG9tYWluID0gdW5pdCxcbiAgICAgIHJhbmdlID0gdW5pdCxcbiAgICAgIGludGVycG9sYXRlID0gaW50ZXJwb2xhdGVWYWx1ZSxcbiAgICAgIGNsYW1wID0gZmFsc2UsXG4gICAgICBwaWVjZXdpc2UsXG4gICAgICBvdXRwdXQsXG4gICAgICBpbnB1dDtcblxuICBmdW5jdGlvbiByZXNjYWxlKCkge1xuICAgIHBpZWNld2lzZSA9IE1hdGgubWluKGRvbWFpbi5sZW5ndGgsIHJhbmdlLmxlbmd0aCkgPiAyID8gcG9seW1hcCA6IGJpbWFwO1xuICAgIG91dHB1dCA9IGlucHV0ID0gbnVsbDtcbiAgICByZXR1cm4gc2NhbGU7XG4gIH1cblxuICBmdW5jdGlvbiBzY2FsZSh4KSB7XG4gICAgcmV0dXJuIChvdXRwdXQgfHwgKG91dHB1dCA9IHBpZWNld2lzZShkb21haW4sIHJhbmdlLCBjbGFtcCA/IGRlaW50ZXJwb2xhdGVDbGFtcChkZWludGVycG9sYXRlKSA6IGRlaW50ZXJwb2xhdGUsIGludGVycG9sYXRlKSkpKCt4KTtcbiAgfVxuXG4gIHNjYWxlLmludmVydCA9IGZ1bmN0aW9uKHkpIHtcbiAgICByZXR1cm4gKGlucHV0IHx8IChpbnB1dCA9IHBpZWNld2lzZShyYW5nZSwgZG9tYWluLCBkZWludGVycG9sYXRlTGluZWFyLCBjbGFtcCA/IHJlaW50ZXJwb2xhdGVDbGFtcChyZWludGVycG9sYXRlKSA6IHJlaW50ZXJwb2xhdGUpKSkoK3kpO1xuICB9O1xuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkb21haW4gPSBtYXAuY2FsbChfLCBudW1iZXIpLCByZXNjYWxlKCkpIDogZG9tYWluLnNsaWNlKCk7XG4gIH07XG5cbiAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocmFuZ2UgPSBzbGljZS5jYWxsKF8pLCByZXNjYWxlKCkpIDogcmFuZ2Uuc2xpY2UoKTtcbiAgfTtcblxuICBzY2FsZS5yYW5nZVJvdW5kID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiByYW5nZSA9IHNsaWNlLmNhbGwoXyksIGludGVycG9sYXRlID0gaW50ZXJwb2xhdGVSb3VuZCwgcmVzY2FsZSgpO1xuICB9O1xuXG4gIHNjYWxlLmNsYW1wID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGNsYW1wID0gISFfLCByZXNjYWxlKCkpIDogY2xhbXA7XG4gIH07XG5cbiAgc2NhbGUuaW50ZXJwb2xhdGUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoaW50ZXJwb2xhdGUgPSBfLCByZXNjYWxlKCkpIDogaW50ZXJwb2xhdGU7XG4gIH07XG5cbiAgcmV0dXJuIHJlc2NhbGUoKTtcbn1cbiIsIi8vIENvbXB1dGVzIHRoZSBkZWNpbWFsIGNvZWZmaWNpZW50IGFuZCBleHBvbmVudCBvZiB0aGUgc3BlY2lmaWVkIG51bWJlciB4IHdpdGhcbi8vIHNpZ25pZmljYW50IGRpZ2l0cyBwLCB3aGVyZSB4IGlzIHBvc2l0aXZlIGFuZCBwIGlzIGluIFsxLCAyMV0gb3IgdW5kZWZpbmVkLlxuLy8gRm9yIGV4YW1wbGUsIGZvcm1hdERlY2ltYWwoMS4yMykgcmV0dXJucyBbXCIxMjNcIiwgMF0uXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4LCBwKSB7XG4gIGlmICgoaSA9ICh4ID0gcCA/IHgudG9FeHBvbmVudGlhbChwIC0gMSkgOiB4LnRvRXhwb25lbnRpYWwoKSkuaW5kZXhPZihcImVcIikpIDwgMCkgcmV0dXJuIG51bGw7IC8vIE5hTiwgwrFJbmZpbml0eVxuICB2YXIgaSwgY29lZmZpY2llbnQgPSB4LnNsaWNlKDAsIGkpO1xuXG4gIC8vIFRoZSBzdHJpbmcgcmV0dXJuZWQgYnkgdG9FeHBvbmVudGlhbCBlaXRoZXIgaGFzIHRoZSBmb3JtIFxcZFxcLlxcZCtlWy0rXVxcZCtcbiAgLy8gKGUuZy4sIDEuMmUrMykgb3IgdGhlIGZvcm0gXFxkZVstK11cXGQrIChlLmcuLCAxZSszKS5cbiAgcmV0dXJuIFtcbiAgICBjb2VmZmljaWVudC5sZW5ndGggPiAxID8gY29lZmZpY2llbnRbMF0gKyBjb2VmZmljaWVudC5zbGljZSgyKSA6IGNvZWZmaWNpZW50LFxuICAgICt4LnNsaWNlKGkgKyAxKVxuICBdO1xufVxuIiwiaW1wb3J0IGZvcm1hdERlY2ltYWwgZnJvbSBcIi4vZm9ybWF0RGVjaW1hbFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4ID0gZm9ybWF0RGVjaW1hbChNYXRoLmFicyh4KSksIHggPyB4WzFdIDogTmFOO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oZ3JvdXBpbmcsIHRob3VzYW5kcykge1xuICByZXR1cm4gZnVuY3Rpb24odmFsdWUsIHdpZHRoKSB7XG4gICAgdmFyIGkgPSB2YWx1ZS5sZW5ndGgsXG4gICAgICAgIHQgPSBbXSxcbiAgICAgICAgaiA9IDAsXG4gICAgICAgIGcgPSBncm91cGluZ1swXSxcbiAgICAgICAgbGVuZ3RoID0gMDtcblxuICAgIHdoaWxlIChpID4gMCAmJiBnID4gMCkge1xuICAgICAgaWYgKGxlbmd0aCArIGcgKyAxID4gd2lkdGgpIGcgPSBNYXRoLm1heCgxLCB3aWR0aCAtIGxlbmd0aCk7XG4gICAgICB0LnB1c2godmFsdWUuc3Vic3RyaW5nKGkgLT0gZywgaSArIGcpKTtcbiAgICAgIGlmICgobGVuZ3RoICs9IGcgKyAxKSA+IHdpZHRoKSBicmVhaztcbiAgICAgIGcgPSBncm91cGluZ1tqID0gKGogKyAxKSAlIGdyb3VwaW5nLmxlbmd0aF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHQucmV2ZXJzZSgpLmpvaW4odGhvdXNhbmRzKTtcbiAgfTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG51bWVyYWxzKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bMC05XS9nLCBmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gbnVtZXJhbHNbK2ldO1xuICAgIH0pO1xuICB9O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgcCkge1xuICB4ID0geC50b1ByZWNpc2lvbihwKTtcblxuICBvdXQ6IGZvciAodmFyIG4gPSB4Lmxlbmd0aCwgaSA9IDEsIGkwID0gLTEsIGkxOyBpIDwgbjsgKytpKSB7XG4gICAgc3dpdGNoICh4W2ldKSB7XG4gICAgICBjYXNlIFwiLlwiOiBpMCA9IGkxID0gaTsgYnJlYWs7XG4gICAgICBjYXNlIFwiMFwiOiBpZiAoaTAgPT09IDApIGkwID0gaTsgaTEgPSBpOyBicmVhaztcbiAgICAgIGNhc2UgXCJlXCI6IGJyZWFrIG91dDtcbiAgICAgIGRlZmF1bHQ6IGlmIChpMCA+IDApIGkwID0gMDsgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGkwID4gMCA/IHguc2xpY2UoMCwgaTApICsgeC5zbGljZShpMSArIDEpIDogeDtcbn1cbiIsImltcG9ydCBmb3JtYXREZWNpbWFsIGZyb20gXCIuL2Zvcm1hdERlY2ltYWxcIjtcblxuZXhwb3J0IHZhciBwcmVmaXhFeHBvbmVudDtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgcCkge1xuICB2YXIgZCA9IGZvcm1hdERlY2ltYWwoeCwgcCk7XG4gIGlmICghZCkgcmV0dXJuIHggKyBcIlwiO1xuICB2YXIgY29lZmZpY2llbnQgPSBkWzBdLFxuICAgICAgZXhwb25lbnQgPSBkWzFdLFxuICAgICAgaSA9IGV4cG9uZW50IC0gKHByZWZpeEV4cG9uZW50ID0gTWF0aC5tYXgoLTgsIE1hdGgubWluKDgsIE1hdGguZmxvb3IoZXhwb25lbnQgLyAzKSkpICogMykgKyAxLFxuICAgICAgbiA9IGNvZWZmaWNpZW50Lmxlbmd0aDtcbiAgcmV0dXJuIGkgPT09IG4gPyBjb2VmZmljaWVudFxuICAgICAgOiBpID4gbiA/IGNvZWZmaWNpZW50ICsgbmV3IEFycmF5KGkgLSBuICsgMSkuam9pbihcIjBcIilcbiAgICAgIDogaSA+IDAgPyBjb2VmZmljaWVudC5zbGljZSgwLCBpKSArIFwiLlwiICsgY29lZmZpY2llbnQuc2xpY2UoaSlcbiAgICAgIDogXCIwLlwiICsgbmV3IEFycmF5KDEgLSBpKS5qb2luKFwiMFwiKSArIGZvcm1hdERlY2ltYWwoeCwgTWF0aC5tYXgoMCwgcCArIGkgLSAxKSlbMF07IC8vIGxlc3MgdGhhbiAxeSFcbn1cbiIsImltcG9ydCBmb3JtYXREZWNpbWFsIGZyb20gXCIuL2Zvcm1hdERlY2ltYWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgcCkge1xuICB2YXIgZCA9IGZvcm1hdERlY2ltYWwoeCwgcCk7XG4gIGlmICghZCkgcmV0dXJuIHggKyBcIlwiO1xuICB2YXIgY29lZmZpY2llbnQgPSBkWzBdLFxuICAgICAgZXhwb25lbnQgPSBkWzFdO1xuICByZXR1cm4gZXhwb25lbnQgPCAwID8gXCIwLlwiICsgbmV3IEFycmF5KC1leHBvbmVudCkuam9pbihcIjBcIikgKyBjb2VmZmljaWVudFxuICAgICAgOiBjb2VmZmljaWVudC5sZW5ndGggPiBleHBvbmVudCArIDEgPyBjb2VmZmljaWVudC5zbGljZSgwLCBleHBvbmVudCArIDEpICsgXCIuXCIgKyBjb2VmZmljaWVudC5zbGljZShleHBvbmVudCArIDEpXG4gICAgICA6IGNvZWZmaWNpZW50ICsgbmV3IEFycmF5KGV4cG9uZW50IC0gY29lZmZpY2llbnQubGVuZ3RoICsgMikuam9pbihcIjBcIik7XG59XG4iLCJpbXBvcnQgZm9ybWF0RGVmYXVsdCBmcm9tIFwiLi9mb3JtYXREZWZhdWx0XCI7XG5pbXBvcnQgZm9ybWF0UHJlZml4QXV0byBmcm9tIFwiLi9mb3JtYXRQcmVmaXhBdXRvXCI7XG5pbXBvcnQgZm9ybWF0Um91bmRlZCBmcm9tIFwiLi9mb3JtYXRSb3VuZGVkXCI7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgXCJcIjogZm9ybWF0RGVmYXVsdCxcbiAgXCIlXCI6IGZ1bmN0aW9uKHgsIHApIHsgcmV0dXJuICh4ICogMTAwKS50b0ZpeGVkKHApOyB9LFxuICBcImJcIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygyKTsgfSxcbiAgXCJjXCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggKyBcIlwiOyB9LFxuICBcImRcIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygxMCk7IH0sXG4gIFwiZVwiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvRXhwb25lbnRpYWwocCk7IH0sXG4gIFwiZlwiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvRml4ZWQocCk7IH0sXG4gIFwiZ1wiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvUHJlY2lzaW9uKHApOyB9LFxuICBcIm9cIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZyg4KTsgfSxcbiAgXCJwXCI6IGZ1bmN0aW9uKHgsIHApIHsgcmV0dXJuIGZvcm1hdFJvdW5kZWQoeCAqIDEwMCwgcCk7IH0sXG4gIFwiclwiOiBmb3JtYXRSb3VuZGVkLFxuICBcInNcIjogZm9ybWF0UHJlZml4QXV0byxcbiAgXCJYXCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE1hdGgucm91bmQoeCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7IH0sXG4gIFwieFwiOiBmdW5jdGlvbih4KSB7IHJldHVybiBNYXRoLnJvdW5kKHgpLnRvU3RyaW5nKDE2KTsgfVxufTtcbiIsImltcG9ydCBmb3JtYXRUeXBlcyBmcm9tIFwiLi9mb3JtYXRUeXBlc1wiO1xuXG4vLyBbW2ZpbGxdYWxpZ25dW3NpZ25dW3N5bWJvbF1bMF1bd2lkdGhdWyxdWy5wcmVjaXNpb25dW3R5cGVdXG52YXIgcmUgPSAvXig/OiguKT8oWzw+PV5dKSk/KFsrXFwtXFwoIF0pPyhbJCNdKT8oMCk/KFxcZCspPygsKT8oXFwuXFxkKyk/KFthLXolXSk/JC9pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKSB7XG4gIHJldHVybiBuZXcgRm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcik7XG59XG5cbmZvcm1hdFNwZWNpZmllci5wcm90b3R5cGUgPSBGb3JtYXRTcGVjaWZpZXIucHJvdG90eXBlOyAvLyBpbnN0YW5jZW9mXG5cbmZ1bmN0aW9uIEZvcm1hdFNwZWNpZmllcihzcGVjaWZpZXIpIHtcbiAgaWYgKCEobWF0Y2ggPSByZS5leGVjKHNwZWNpZmllcikpKSB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIGZvcm1hdDogXCIgKyBzcGVjaWZpZXIpO1xuXG4gIHZhciBtYXRjaCxcbiAgICAgIGZpbGwgPSBtYXRjaFsxXSB8fCBcIiBcIixcbiAgICAgIGFsaWduID0gbWF0Y2hbMl0gfHwgXCI+XCIsXG4gICAgICBzaWduID0gbWF0Y2hbM10gfHwgXCItXCIsXG4gICAgICBzeW1ib2wgPSBtYXRjaFs0XSB8fCBcIlwiLFxuICAgICAgemVybyA9ICEhbWF0Y2hbNV0sXG4gICAgICB3aWR0aCA9IG1hdGNoWzZdICYmICttYXRjaFs2XSxcbiAgICAgIGNvbW1hID0gISFtYXRjaFs3XSxcbiAgICAgIHByZWNpc2lvbiA9IG1hdGNoWzhdICYmICttYXRjaFs4XS5zbGljZSgxKSxcbiAgICAgIHR5cGUgPSBtYXRjaFs5XSB8fCBcIlwiO1xuXG4gIC8vIFRoZSBcIm5cIiB0eXBlIGlzIGFuIGFsaWFzIGZvciBcIixnXCIuXG4gIGlmICh0eXBlID09PSBcIm5cIikgY29tbWEgPSB0cnVlLCB0eXBlID0gXCJnXCI7XG5cbiAgLy8gTWFwIGludmFsaWQgdHlwZXMgdG8gdGhlIGRlZmF1bHQgZm9ybWF0LlxuICBlbHNlIGlmICghZm9ybWF0VHlwZXNbdHlwZV0pIHR5cGUgPSBcIlwiO1xuXG4gIC8vIElmIHplcm8gZmlsbCBpcyBzcGVjaWZpZWQsIHBhZGRpbmcgZ29lcyBhZnRlciBzaWduIGFuZCBiZWZvcmUgZGlnaXRzLlxuICBpZiAoemVybyB8fCAoZmlsbCA9PT0gXCIwXCIgJiYgYWxpZ24gPT09IFwiPVwiKSkgemVybyA9IHRydWUsIGZpbGwgPSBcIjBcIiwgYWxpZ24gPSBcIj1cIjtcblxuICB0aGlzLmZpbGwgPSBmaWxsO1xuICB0aGlzLmFsaWduID0gYWxpZ247XG4gIHRoaXMuc2lnbiA9IHNpZ247XG4gIHRoaXMuc3ltYm9sID0gc3ltYm9sO1xuICB0aGlzLnplcm8gPSB6ZXJvO1xuICB0aGlzLndpZHRoID0gd2lkdGg7XG4gIHRoaXMuY29tbWEgPSBjb21tYTtcbiAgdGhpcy5wcmVjaXNpb24gPSBwcmVjaXNpb247XG4gIHRoaXMudHlwZSA9IHR5cGU7XG59XG5cbkZvcm1hdFNwZWNpZmllci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZmlsbFxuICAgICAgKyB0aGlzLmFsaWduXG4gICAgICArIHRoaXMuc2lnblxuICAgICAgKyB0aGlzLnN5bWJvbFxuICAgICAgKyAodGhpcy56ZXJvID8gXCIwXCIgOiBcIlwiKVxuICAgICAgKyAodGhpcy53aWR0aCA9PSBudWxsID8gXCJcIiA6IE1hdGgubWF4KDEsIHRoaXMud2lkdGggfCAwKSlcbiAgICAgICsgKHRoaXMuY29tbWEgPyBcIixcIiA6IFwiXCIpXG4gICAgICArICh0aGlzLnByZWNpc2lvbiA9PSBudWxsID8gXCJcIiA6IFwiLlwiICsgTWF0aC5tYXgoMCwgdGhpcy5wcmVjaXNpb24gfCAwKSlcbiAgICAgICsgdGhpcy50eXBlO1xufTtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHg7XG59XG4iLCJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnRcIjtcbmltcG9ydCBmb3JtYXRHcm91cCBmcm9tIFwiLi9mb3JtYXRHcm91cFwiO1xuaW1wb3J0IGZvcm1hdE51bWVyYWxzIGZyb20gXCIuL2Zvcm1hdE51bWVyYWxzXCI7XG5pbXBvcnQgZm9ybWF0U3BlY2lmaWVyIGZyb20gXCIuL2Zvcm1hdFNwZWNpZmllclwiO1xuaW1wb3J0IGZvcm1hdFR5cGVzIGZyb20gXCIuL2Zvcm1hdFR5cGVzXCI7XG5pbXBvcnQge3ByZWZpeEV4cG9uZW50fSBmcm9tIFwiLi9mb3JtYXRQcmVmaXhBdXRvXCI7XG5pbXBvcnQgaWRlbnRpdHkgZnJvbSBcIi4vaWRlbnRpdHlcIjtcblxudmFyIHByZWZpeGVzID0gW1wieVwiLFwielwiLFwiYVwiLFwiZlwiLFwicFwiLFwiblwiLFwiwrVcIixcIm1cIixcIlwiLFwia1wiLFwiTVwiLFwiR1wiLFwiVFwiLFwiUFwiLFwiRVwiLFwiWlwiLFwiWVwiXTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obG9jYWxlKSB7XG4gIHZhciBncm91cCA9IGxvY2FsZS5ncm91cGluZyAmJiBsb2NhbGUudGhvdXNhbmRzID8gZm9ybWF0R3JvdXAobG9jYWxlLmdyb3VwaW5nLCBsb2NhbGUudGhvdXNhbmRzKSA6IGlkZW50aXR5LFxuICAgICAgY3VycmVuY3kgPSBsb2NhbGUuY3VycmVuY3ksXG4gICAgICBkZWNpbWFsID0gbG9jYWxlLmRlY2ltYWwsXG4gICAgICBudW1lcmFscyA9IGxvY2FsZS5udW1lcmFscyA/IGZvcm1hdE51bWVyYWxzKGxvY2FsZS5udW1lcmFscykgOiBpZGVudGl0eSxcbiAgICAgIHBlcmNlbnQgPSBsb2NhbGUucGVyY2VudCB8fCBcIiVcIjtcblxuICBmdW5jdGlvbiBuZXdGb3JtYXQoc3BlY2lmaWVyKSB7XG4gICAgc3BlY2lmaWVyID0gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcik7XG5cbiAgICB2YXIgZmlsbCA9IHNwZWNpZmllci5maWxsLFxuICAgICAgICBhbGlnbiA9IHNwZWNpZmllci5hbGlnbixcbiAgICAgICAgc2lnbiA9IHNwZWNpZmllci5zaWduLFxuICAgICAgICBzeW1ib2wgPSBzcGVjaWZpZXIuc3ltYm9sLFxuICAgICAgICB6ZXJvID0gc3BlY2lmaWVyLnplcm8sXG4gICAgICAgIHdpZHRoID0gc3BlY2lmaWVyLndpZHRoLFxuICAgICAgICBjb21tYSA9IHNwZWNpZmllci5jb21tYSxcbiAgICAgICAgcHJlY2lzaW9uID0gc3BlY2lmaWVyLnByZWNpc2lvbixcbiAgICAgICAgdHlwZSA9IHNwZWNpZmllci50eXBlO1xuXG4gICAgLy8gQ29tcHV0ZSB0aGUgcHJlZml4IGFuZCBzdWZmaXguXG4gICAgLy8gRm9yIFNJLXByZWZpeCwgdGhlIHN1ZmZpeCBpcyBsYXppbHkgY29tcHV0ZWQuXG4gICAgdmFyIHByZWZpeCA9IHN5bWJvbCA9PT0gXCIkXCIgPyBjdXJyZW5jeVswXSA6IHN5bWJvbCA9PT0gXCIjXCIgJiYgL1tib3hYXS8udGVzdCh0eXBlKSA/IFwiMFwiICsgdHlwZS50b0xvd2VyQ2FzZSgpIDogXCJcIixcbiAgICAgICAgc3VmZml4ID0gc3ltYm9sID09PSBcIiRcIiA/IGN1cnJlbmN5WzFdIDogL1slcF0vLnRlc3QodHlwZSkgPyBwZXJjZW50IDogXCJcIjtcblxuICAgIC8vIFdoYXQgZm9ybWF0IGZ1bmN0aW9uIHNob3VsZCB3ZSB1c2U/XG4gICAgLy8gSXMgdGhpcyBhbiBpbnRlZ2VyIHR5cGU/XG4gICAgLy8gQ2FuIHRoaXMgdHlwZSBnZW5lcmF0ZSBleHBvbmVudGlhbCBub3RhdGlvbj9cbiAgICB2YXIgZm9ybWF0VHlwZSA9IGZvcm1hdFR5cGVzW3R5cGVdLFxuICAgICAgICBtYXliZVN1ZmZpeCA9ICF0eXBlIHx8IC9bZGVmZ3BycyVdLy50ZXN0KHR5cGUpO1xuXG4gICAgLy8gU2V0IHRoZSBkZWZhdWx0IHByZWNpc2lvbiBpZiBub3Qgc3BlY2lmaWVkLFxuICAgIC8vIG9yIGNsYW1wIHRoZSBzcGVjaWZpZWQgcHJlY2lzaW9uIHRvIHRoZSBzdXBwb3J0ZWQgcmFuZ2UuXG4gICAgLy8gRm9yIHNpZ25pZmljYW50IHByZWNpc2lvbiwgaXQgbXVzdCBiZSBpbiBbMSwgMjFdLlxuICAgIC8vIEZvciBmaXhlZCBwcmVjaXNpb24sIGl0IG11c3QgYmUgaW4gWzAsIDIwXS5cbiAgICBwcmVjaXNpb24gPSBwcmVjaXNpb24gPT0gbnVsbCA/ICh0eXBlID8gNiA6IDEyKVxuICAgICAgICA6IC9bZ3Byc10vLnRlc3QodHlwZSkgPyBNYXRoLm1heCgxLCBNYXRoLm1pbigyMSwgcHJlY2lzaW9uKSlcbiAgICAgICAgOiBNYXRoLm1heCgwLCBNYXRoLm1pbigyMCwgcHJlY2lzaW9uKSk7XG5cbiAgICBmdW5jdGlvbiBmb3JtYXQodmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZVByZWZpeCA9IHByZWZpeCxcbiAgICAgICAgICB2YWx1ZVN1ZmZpeCA9IHN1ZmZpeCxcbiAgICAgICAgICBpLCBuLCBjO1xuXG4gICAgICBpZiAodHlwZSA9PT0gXCJjXCIpIHtcbiAgICAgICAgdmFsdWVTdWZmaXggPSBmb3JtYXRUeXBlKHZhbHVlKSArIHZhbHVlU3VmZml4O1xuICAgICAgICB2YWx1ZSA9IFwiXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9ICt2YWx1ZTtcblxuICAgICAgICAvLyBQZXJmb3JtIHRoZSBpbml0aWFsIGZvcm1hdHRpbmcuXG4gICAgICAgIHZhciB2YWx1ZU5lZ2F0aXZlID0gdmFsdWUgPCAwO1xuICAgICAgICB2YWx1ZSA9IGZvcm1hdFR5cGUoTWF0aC5hYnModmFsdWUpLCBwcmVjaXNpb24pO1xuXG4gICAgICAgIC8vIElmIGEgbmVnYXRpdmUgdmFsdWUgcm91bmRzIHRvIHplcm8gZHVyaW5nIGZvcm1hdHRpbmcsIHRyZWF0IGFzIHBvc2l0aXZlLlxuICAgICAgICBpZiAodmFsdWVOZWdhdGl2ZSAmJiArdmFsdWUgPT09IDApIHZhbHVlTmVnYXRpdmUgPSBmYWxzZTtcblxuICAgICAgICAvLyBDb21wdXRlIHRoZSBwcmVmaXggYW5kIHN1ZmZpeC5cbiAgICAgICAgdmFsdWVQcmVmaXggPSAodmFsdWVOZWdhdGl2ZSA/IChzaWduID09PSBcIihcIiA/IHNpZ24gOiBcIi1cIikgOiBzaWduID09PSBcIi1cIiB8fCBzaWduID09PSBcIihcIiA/IFwiXCIgOiBzaWduKSArIHZhbHVlUHJlZml4O1xuICAgICAgICB2YWx1ZVN1ZmZpeCA9ICh0eXBlID09PSBcInNcIiA/IHByZWZpeGVzWzggKyBwcmVmaXhFeHBvbmVudCAvIDNdIDogXCJcIikgKyB2YWx1ZVN1ZmZpeCArICh2YWx1ZU5lZ2F0aXZlICYmIHNpZ24gPT09IFwiKFwiID8gXCIpXCIgOiBcIlwiKTtcblxuICAgICAgICAvLyBCcmVhayB0aGUgZm9ybWF0dGVkIHZhbHVlIGludG8gdGhlIGludGVnZXIg4oCcdmFsdWXigJ0gcGFydCB0aGF0IGNhbiBiZVxuICAgICAgICAvLyBncm91cGVkLCBhbmQgZnJhY3Rpb25hbCBvciBleHBvbmVudGlhbCDigJxzdWZmaXjigJ0gcGFydCB0aGF0IGlzIG5vdC5cbiAgICAgICAgaWYgKG1heWJlU3VmZml4KSB7XG4gICAgICAgICAgaSA9IC0xLCBuID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgICAgICBpZiAoYyA9IHZhbHVlLmNoYXJDb2RlQXQoaSksIDQ4ID4gYyB8fCBjID4gNTcpIHtcbiAgICAgICAgICAgICAgdmFsdWVTdWZmaXggPSAoYyA9PT0gNDYgPyBkZWNpbWFsICsgdmFsdWUuc2xpY2UoaSArIDEpIDogdmFsdWUuc2xpY2UoaSkpICsgdmFsdWVTdWZmaXg7XG4gICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc2xpY2UoMCwgaSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgZmlsbCBjaGFyYWN0ZXIgaXMgbm90IFwiMFwiLCBncm91cGluZyBpcyBhcHBsaWVkIGJlZm9yZSBwYWRkaW5nLlxuICAgICAgaWYgKGNvbW1hICYmICF6ZXJvKSB2YWx1ZSA9IGdyb3VwKHZhbHVlLCBJbmZpbml0eSk7XG5cbiAgICAgIC8vIENvbXB1dGUgdGhlIHBhZGRpbmcuXG4gICAgICB2YXIgbGVuZ3RoID0gdmFsdWVQcmVmaXgubGVuZ3RoICsgdmFsdWUubGVuZ3RoICsgdmFsdWVTdWZmaXgubGVuZ3RoLFxuICAgICAgICAgIHBhZGRpbmcgPSBsZW5ndGggPCB3aWR0aCA/IG5ldyBBcnJheSh3aWR0aCAtIGxlbmd0aCArIDEpLmpvaW4oZmlsbCkgOiBcIlwiO1xuXG4gICAgICAvLyBJZiB0aGUgZmlsbCBjaGFyYWN0ZXIgaXMgXCIwXCIsIGdyb3VwaW5nIGlzIGFwcGxpZWQgYWZ0ZXIgcGFkZGluZy5cbiAgICAgIGlmIChjb21tYSAmJiB6ZXJvKSB2YWx1ZSA9IGdyb3VwKHBhZGRpbmcgKyB2YWx1ZSwgcGFkZGluZy5sZW5ndGggPyB3aWR0aCAtIHZhbHVlU3VmZml4Lmxlbmd0aCA6IEluZmluaXR5KSwgcGFkZGluZyA9IFwiXCI7XG5cbiAgICAgIC8vIFJlY29uc3RydWN0IHRoZSBmaW5hbCBvdXRwdXQgYmFzZWQgb24gdGhlIGRlc2lyZWQgYWxpZ25tZW50LlxuICAgICAgc3dpdGNoIChhbGlnbikge1xuICAgICAgICBjYXNlIFwiPFwiOiB2YWx1ZSA9IHZhbHVlUHJlZml4ICsgdmFsdWUgKyB2YWx1ZVN1ZmZpeCArIHBhZGRpbmc7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiPVwiOiB2YWx1ZSA9IHZhbHVlUHJlZml4ICsgcGFkZGluZyArIHZhbHVlICsgdmFsdWVTdWZmaXg7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiXlwiOiB2YWx1ZSA9IHBhZGRpbmcuc2xpY2UoMCwgbGVuZ3RoID0gcGFkZGluZy5sZW5ndGggPj4gMSkgKyB2YWx1ZVByZWZpeCArIHZhbHVlICsgdmFsdWVTdWZmaXggKyBwYWRkaW5nLnNsaWNlKGxlbmd0aCk7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OiB2YWx1ZSA9IHBhZGRpbmcgKyB2YWx1ZVByZWZpeCArIHZhbHVlICsgdmFsdWVTdWZmaXg7IGJyZWFrO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbnVtZXJhbHModmFsdWUpO1xuICAgIH1cblxuICAgIGZvcm1hdC50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHNwZWNpZmllciArIFwiXCI7XG4gICAgfTtcblxuICAgIHJldHVybiBmb3JtYXQ7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRQcmVmaXgoc3BlY2lmaWVyLCB2YWx1ZSkge1xuICAgIHZhciBmID0gbmV3Rm9ybWF0KChzcGVjaWZpZXIgPSBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKSwgc3BlY2lmaWVyLnR5cGUgPSBcImZcIiwgc3BlY2lmaWVyKSksXG4gICAgICAgIGUgPSBNYXRoLm1heCgtOCwgTWF0aC5taW4oOCwgTWF0aC5mbG9vcihleHBvbmVudCh2YWx1ZSkgLyAzKSkpICogMyxcbiAgICAgICAgayA9IE1hdGgucG93KDEwLCAtZSksXG4gICAgICAgIHByZWZpeCA9IHByZWZpeGVzWzggKyBlIC8gM107XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gZihrICogdmFsdWUpICsgcHJlZml4O1xuICAgIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdDogbmV3Rm9ybWF0LFxuICAgIGZvcm1hdFByZWZpeDogZm9ybWF0UHJlZml4XG4gIH07XG59XG4iLCJpbXBvcnQgZm9ybWF0TG9jYWxlIGZyb20gXCIuL2xvY2FsZVwiO1xuXG52YXIgbG9jYWxlO1xuZXhwb3J0IHZhciBmb3JtYXQ7XG5leHBvcnQgdmFyIGZvcm1hdFByZWZpeDtcblxuZGVmYXVsdExvY2FsZSh7XG4gIGRlY2ltYWw6IFwiLlwiLFxuICB0aG91c2FuZHM6IFwiLFwiLFxuICBncm91cGluZzogWzNdLFxuICBjdXJyZW5jeTogW1wiJFwiLCBcIlwiXVxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRlZmF1bHRMb2NhbGUoZGVmaW5pdGlvbikge1xuICBsb2NhbGUgPSBmb3JtYXRMb2NhbGUoZGVmaW5pdGlvbik7XG4gIGZvcm1hdCA9IGxvY2FsZS5mb3JtYXQ7XG4gIGZvcm1hdFByZWZpeCA9IGxvY2FsZS5mb3JtYXRQcmVmaXg7XG4gIHJldHVybiBsb2NhbGU7XG59XG4iLCJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RlcCkge1xuICByZXR1cm4gTWF0aC5tYXgoMCwgLWV4cG9uZW50KE1hdGguYWJzKHN0ZXApKSk7XG59XG4iLCJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RlcCwgdmFsdWUpIHtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWF4KC04LCBNYXRoLm1pbig4LCBNYXRoLmZsb29yKGV4cG9uZW50KHZhbHVlKSAvIDMpKSkgKiAzIC0gZXhwb25lbnQoTWF0aC5hYnMoc3RlcCkpKTtcbn1cbiIsImltcG9ydCBleHBvbmVudCBmcm9tIFwiLi9leHBvbmVudFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzdGVwLCBtYXgpIHtcbiAgc3RlcCA9IE1hdGguYWJzKHN0ZXApLCBtYXggPSBNYXRoLmFicyhtYXgpIC0gc3RlcDtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIGV4cG9uZW50KG1heCkgLSBleHBvbmVudChzdGVwKSkgKyAxO1xufVxuIiwiaW1wb3J0IHt0aWNrU3RlcH0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge2Zvcm1hdCwgZm9ybWF0UHJlZml4LCBmb3JtYXRTcGVjaWZpZXIsIHByZWNpc2lvbkZpeGVkLCBwcmVjaXNpb25QcmVmaXgsIHByZWNpc2lvblJvdW5kfSBmcm9tIFwiZDMtZm9ybWF0XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGRvbWFpbiwgY291bnQsIHNwZWNpZmllcikge1xuICB2YXIgc3RhcnQgPSBkb21haW5bMF0sXG4gICAgICBzdG9wID0gZG9tYWluW2RvbWFpbi5sZW5ndGggLSAxXSxcbiAgICAgIHN0ZXAgPSB0aWNrU3RlcChzdGFydCwgc3RvcCwgY291bnQgPT0gbnVsbCA/IDEwIDogY291bnQpLFxuICAgICAgcHJlY2lzaW9uO1xuICBzcGVjaWZpZXIgPSBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyID09IG51bGwgPyBcIixmXCIgOiBzcGVjaWZpZXIpO1xuICBzd2l0Y2ggKHNwZWNpZmllci50eXBlKSB7XG4gICAgY2FzZSBcInNcIjoge1xuICAgICAgdmFyIHZhbHVlID0gTWF0aC5tYXgoTWF0aC5hYnMoc3RhcnQpLCBNYXRoLmFicyhzdG9wKSk7XG4gICAgICBpZiAoc3BlY2lmaWVyLnByZWNpc2lvbiA9PSBudWxsICYmICFpc05hTihwcmVjaXNpb24gPSBwcmVjaXNpb25QcmVmaXgoc3RlcCwgdmFsdWUpKSkgc3BlY2lmaWVyLnByZWNpc2lvbiA9IHByZWNpc2lvbjtcbiAgICAgIHJldHVybiBmb3JtYXRQcmVmaXgoc3BlY2lmaWVyLCB2YWx1ZSk7XG4gICAgfVxuICAgIGNhc2UgXCJcIjpcbiAgICBjYXNlIFwiZVwiOlxuICAgIGNhc2UgXCJnXCI6XG4gICAgY2FzZSBcInBcIjpcbiAgICBjYXNlIFwiclwiOiB7XG4gICAgICBpZiAoc3BlY2lmaWVyLnByZWNpc2lvbiA9PSBudWxsICYmICFpc05hTihwcmVjaXNpb24gPSBwcmVjaXNpb25Sb3VuZChzdGVwLCBNYXRoLm1heChNYXRoLmFicyhzdGFydCksIE1hdGguYWJzKHN0b3ApKSkpKSBzcGVjaWZpZXIucHJlY2lzaW9uID0gcHJlY2lzaW9uIC0gKHNwZWNpZmllci50eXBlID09PSBcImVcIik7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2FzZSBcImZcIjpcbiAgICBjYXNlIFwiJVwiOiB7XG4gICAgICBpZiAoc3BlY2lmaWVyLnByZWNpc2lvbiA9PSBudWxsICYmICFpc05hTihwcmVjaXNpb24gPSBwcmVjaXNpb25GaXhlZChzdGVwKSkpIHNwZWNpZmllci5wcmVjaXNpb24gPSBwcmVjaXNpb24gLSAoc3BlY2lmaWVyLnR5cGUgPT09IFwiJVwiKSAqIDI7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZvcm1hdChzcGVjaWZpZXIpO1xufVxuIiwiaW1wb3J0IHt0aWNrcywgdGlja0luY3JlbWVudH0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge2ludGVycG9sYXRlTnVtYmVyIGFzIHJlaW50ZXJwb2xhdGV9IGZyb20gXCJkMy1pbnRlcnBvbGF0ZVwiO1xuaW1wb3J0IHtkZWZhdWx0IGFzIGNvbnRpbnVvdXMsIGNvcHksIGRlaW50ZXJwb2xhdGVMaW5lYXIgYXMgZGVpbnRlcnBvbGF0ZX0gZnJvbSBcIi4vY29udGludW91c1wiO1xuaW1wb3J0IHRpY2tGb3JtYXQgZnJvbSBcIi4vdGlja0Zvcm1hdFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gbGluZWFyaXNoKHNjYWxlKSB7XG4gIHZhciBkb21haW4gPSBzY2FsZS5kb21haW47XG5cbiAgc2NhbGUudGlja3MgPSBmdW5jdGlvbihjb3VudCkge1xuICAgIHZhciBkID0gZG9tYWluKCk7XG4gICAgcmV0dXJuIHRpY2tzKGRbMF0sIGRbZC5sZW5ndGggLSAxXSwgY291bnQgPT0gbnVsbCA/IDEwIDogY291bnQpO1xuICB9O1xuXG4gIHNjYWxlLnRpY2tGb3JtYXQgPSBmdW5jdGlvbihjb3VudCwgc3BlY2lmaWVyKSB7XG4gICAgcmV0dXJuIHRpY2tGb3JtYXQoZG9tYWluKCksIGNvdW50LCBzcGVjaWZpZXIpO1xuICB9O1xuXG4gIHNjYWxlLm5pY2UgPSBmdW5jdGlvbihjb3VudCkge1xuICAgIGlmIChjb3VudCA9PSBudWxsKSBjb3VudCA9IDEwO1xuXG4gICAgdmFyIGQgPSBkb21haW4oKSxcbiAgICAgICAgaTAgPSAwLFxuICAgICAgICBpMSA9IGQubGVuZ3RoIC0gMSxcbiAgICAgICAgc3RhcnQgPSBkW2kwXSxcbiAgICAgICAgc3RvcCA9IGRbaTFdLFxuICAgICAgICBzdGVwO1xuXG4gICAgaWYgKHN0b3AgPCBzdGFydCkge1xuICAgICAgc3RlcCA9IHN0YXJ0LCBzdGFydCA9IHN0b3AsIHN0b3AgPSBzdGVwO1xuICAgICAgc3RlcCA9IGkwLCBpMCA9IGkxLCBpMSA9IHN0ZXA7XG4gICAgfVxuXG4gICAgc3RlcCA9IHRpY2tJbmNyZW1lbnQoc3RhcnQsIHN0b3AsIGNvdW50KTtcblxuICAgIGlmIChzdGVwID4gMCkge1xuICAgICAgc3RhcnQgPSBNYXRoLmZsb29yKHN0YXJ0IC8gc3RlcCkgKiBzdGVwO1xuICAgICAgc3RvcCA9IE1hdGguY2VpbChzdG9wIC8gc3RlcCkgKiBzdGVwO1xuICAgICAgc3RlcCA9IHRpY2tJbmNyZW1lbnQoc3RhcnQsIHN0b3AsIGNvdW50KTtcbiAgICB9IGVsc2UgaWYgKHN0ZXAgPCAwKSB7XG4gICAgICBzdGFydCA9IE1hdGguY2VpbChzdGFydCAqIHN0ZXApIC8gc3RlcDtcbiAgICAgIHN0b3AgPSBNYXRoLmZsb29yKHN0b3AgKiBzdGVwKSAvIHN0ZXA7XG4gICAgICBzdGVwID0gdGlja0luY3JlbWVudChzdGFydCwgc3RvcCwgY291bnQpO1xuICAgIH1cblxuICAgIGlmIChzdGVwID4gMCkge1xuICAgICAgZFtpMF0gPSBNYXRoLmZsb29yKHN0YXJ0IC8gc3RlcCkgKiBzdGVwO1xuICAgICAgZFtpMV0gPSBNYXRoLmNlaWwoc3RvcCAvIHN0ZXApICogc3RlcDtcbiAgICAgIGRvbWFpbihkKTtcbiAgICB9IGVsc2UgaWYgKHN0ZXAgPCAwKSB7XG4gICAgICBkW2kwXSA9IE1hdGguY2VpbChzdGFydCAqIHN0ZXApIC8gc3RlcDtcbiAgICAgIGRbaTFdID0gTWF0aC5mbG9vcihzdG9wICogc3RlcCkgLyBzdGVwO1xuICAgICAgZG9tYWluKGQpO1xuICAgIH1cblxuICAgIHJldHVybiBzY2FsZTtcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGxpbmVhcigpIHtcbiAgdmFyIHNjYWxlID0gY29udGludW91cyhkZWludGVycG9sYXRlLCByZWludGVycG9sYXRlKTtcblxuICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNvcHkoc2NhbGUsIGxpbmVhcigpKTtcbiAgfTtcblxuICByZXR1cm4gbGluZWFyaXNoKHNjYWxlKTtcbn1cbiIsInZhciB0MCA9IG5ldyBEYXRlLFxuICAgIHQxID0gbmV3IERhdGU7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG5ld0ludGVydmFsKGZsb29yaSwgb2Zmc2V0aSwgY291bnQsIGZpZWxkKSB7XG5cbiAgZnVuY3Rpb24gaW50ZXJ2YWwoZGF0ZSkge1xuICAgIHJldHVybiBmbG9vcmkoZGF0ZSA9IG5ldyBEYXRlKCtkYXRlKSksIGRhdGU7XG4gIH1cblxuICBpbnRlcnZhbC5mbG9vciA9IGludGVydmFsO1xuXG4gIGludGVydmFsLmNlaWwgPSBmdW5jdGlvbihkYXRlKSB7XG4gICAgcmV0dXJuIGZsb29yaShkYXRlID0gbmV3IERhdGUoZGF0ZSAtIDEpKSwgb2Zmc2V0aShkYXRlLCAxKSwgZmxvb3JpKGRhdGUpLCBkYXRlO1xuICB9O1xuXG4gIGludGVydmFsLnJvdW5kID0gZnVuY3Rpb24oZGF0ZSkge1xuICAgIHZhciBkMCA9IGludGVydmFsKGRhdGUpLFxuICAgICAgICBkMSA9IGludGVydmFsLmNlaWwoZGF0ZSk7XG4gICAgcmV0dXJuIGRhdGUgLSBkMCA8IGQxIC0gZGF0ZSA/IGQwIDogZDE7XG4gIH07XG5cbiAgaW50ZXJ2YWwub2Zmc2V0ID0gZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIHJldHVybiBvZmZzZXRpKGRhdGUgPSBuZXcgRGF0ZSgrZGF0ZSksIHN0ZXAgPT0gbnVsbCA/IDEgOiBNYXRoLmZsb29yKHN0ZXApKSwgZGF0ZTtcbiAgfTtcblxuICBpbnRlcnZhbC5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgdmFyIHJhbmdlID0gW10sIHByZXZpb3VzO1xuICAgIHN0YXJ0ID0gaW50ZXJ2YWwuY2VpbChzdGFydCk7XG4gICAgc3RlcCA9IHN0ZXAgPT0gbnVsbCA/IDEgOiBNYXRoLmZsb29yKHN0ZXApO1xuICAgIGlmICghKHN0YXJ0IDwgc3RvcCkgfHwgIShzdGVwID4gMCkpIHJldHVybiByYW5nZTsgLy8gYWxzbyBoYW5kbGVzIEludmFsaWQgRGF0ZVxuICAgIGRvIHJhbmdlLnB1c2gocHJldmlvdXMgPSBuZXcgRGF0ZSgrc3RhcnQpKSwgb2Zmc2V0aShzdGFydCwgc3RlcCksIGZsb29yaShzdGFydCk7XG4gICAgd2hpbGUgKHByZXZpb3VzIDwgc3RhcnQgJiYgc3RhcnQgPCBzdG9wKTtcbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgaW50ZXJ2YWwuZmlsdGVyID0gZnVuY3Rpb24odGVzdCkge1xuICAgIHJldHVybiBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgICBpZiAoZGF0ZSA+PSBkYXRlKSB3aGlsZSAoZmxvb3JpKGRhdGUpLCAhdGVzdChkYXRlKSkgZGF0ZS5zZXRUaW1lKGRhdGUgLSAxKTtcbiAgICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgICBpZiAoZGF0ZSA+PSBkYXRlKSB7XG4gICAgICAgIGlmIChzdGVwIDwgMCkgd2hpbGUgKCsrc3RlcCA8PSAwKSB7XG4gICAgICAgICAgd2hpbGUgKG9mZnNldGkoZGF0ZSwgLTEpLCAhdGVzdChkYXRlKSkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eVxuICAgICAgICB9IGVsc2Ugd2hpbGUgKC0tc3RlcCA+PSAwKSB7XG4gICAgICAgICAgd2hpbGUgKG9mZnNldGkoZGF0ZSwgKzEpLCAhdGVzdChkYXRlKSkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgaWYgKGNvdW50KSB7XG4gICAgaW50ZXJ2YWwuY291bnQgPSBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgICB0MC5zZXRUaW1lKCtzdGFydCksIHQxLnNldFRpbWUoK2VuZCk7XG4gICAgICBmbG9vcmkodDApLCBmbG9vcmkodDEpO1xuICAgICAgcmV0dXJuIE1hdGguZmxvb3IoY291bnQodDAsIHQxKSk7XG4gICAgfTtcblxuICAgIGludGVydmFsLmV2ZXJ5ID0gZnVuY3Rpb24oc3RlcCkge1xuICAgICAgc3RlcCA9IE1hdGguZmxvb3Ioc3RlcCk7XG4gICAgICByZXR1cm4gIWlzRmluaXRlKHN0ZXApIHx8ICEoc3RlcCA+IDApID8gbnVsbFxuICAgICAgICAgIDogIShzdGVwID4gMSkgPyBpbnRlcnZhbFxuICAgICAgICAgIDogaW50ZXJ2YWwuZmlsdGVyKGZpZWxkXG4gICAgICAgICAgICAgID8gZnVuY3Rpb24oZCkgeyByZXR1cm4gZmllbGQoZCkgJSBzdGVwID09PSAwOyB9XG4gICAgICAgICAgICAgIDogZnVuY3Rpb24oZCkgeyByZXR1cm4gaW50ZXJ2YWwuY291bnQoMCwgZCkgJSBzdGVwID09PSAwOyB9KTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGludGVydmFsO1xufVxuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5cbnZhciBtaWxsaXNlY29uZCA9IGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAvLyBub29wXG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gZW5kIC0gc3RhcnQ7XG59KTtcblxuLy8gQW4gb3B0aW1pemVkIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIHNpbXBsZSBjYXNlLlxubWlsbGlzZWNvbmQuZXZlcnkgPSBmdW5jdGlvbihrKSB7XG4gIGsgPSBNYXRoLmZsb29yKGspO1xuICBpZiAoIWlzRmluaXRlKGspIHx8ICEoayA+IDApKSByZXR1cm4gbnVsbDtcbiAgaWYgKCEoayA+IDEpKSByZXR1cm4gbWlsbGlzZWNvbmQ7XG4gIHJldHVybiBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRUaW1lKE1hdGguZmxvb3IoZGF0ZSAvIGspICogayk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogayk7XG4gIH0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGs7XG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgbWlsbGlzZWNvbmQ7XG5leHBvcnQgdmFyIG1pbGxpc2Vjb25kcyA9IG1pbGxpc2Vjb25kLnJhbmdlO1xuIiwiZXhwb3J0IHZhciBkdXJhdGlvblNlY29uZCA9IDFlMztcbmV4cG9ydCB2YXIgZHVyYXRpb25NaW51dGUgPSA2ZTQ7XG5leHBvcnQgdmFyIGR1cmF0aW9uSG91ciA9IDM2ZTU7XG5leHBvcnQgdmFyIGR1cmF0aW9uRGF5ID0gODY0ZTU7XG5leHBvcnQgdmFyIGR1cmF0aW9uV2VlayA9IDYwNDhlNTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvblNlY29uZH0gZnJvbSBcIi4vZHVyYXRpb25cIjtcblxudmFyIHNlY29uZCA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRUaW1lKE1hdGguZmxvb3IoZGF0ZSAvIGR1cmF0aW9uU2Vjb25kKSAqIGR1cmF0aW9uU2Vjb25kKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uU2Vjb25kKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvblNlY29uZDtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDU2Vjb25kcygpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IHNlY29uZDtcbmV4cG9ydCB2YXIgc2Vjb25kcyA9IHNlY29uZC5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbk1pbnV0ZX0gZnJvbSBcIi4vZHVyYXRpb25cIjtcblxudmFyIG1pbnV0ZSA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRUaW1lKE1hdGguZmxvb3IoZGF0ZSAvIGR1cmF0aW9uTWludXRlKSAqIGR1cmF0aW9uTWludXRlKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uTWludXRlKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbk1pbnV0ZTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0TWludXRlcygpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IG1pbnV0ZTtcbmV4cG9ydCB2YXIgbWludXRlcyA9IG1pbnV0ZS5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbkhvdXIsIGR1cmF0aW9uTWludXRlfSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG52YXIgaG91ciA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgdmFyIG9mZnNldCA9IGRhdGUuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIGR1cmF0aW9uTWludXRlICUgZHVyYXRpb25Ib3VyO1xuICBpZiAob2Zmc2V0IDwgMCkgb2Zmc2V0ICs9IGR1cmF0aW9uSG91cjtcbiAgZGF0ZS5zZXRUaW1lKE1hdGguZmxvb3IoKCtkYXRlIC0gb2Zmc2V0KSAvIGR1cmF0aW9uSG91cikgKiBkdXJhdGlvbkhvdXIgKyBvZmZzZXQpO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogZHVyYXRpb25Ib3VyKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbkhvdXI7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldEhvdXJzKCk7XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgaG91cjtcbmV4cG9ydCB2YXIgaG91cnMgPSBob3VyLnJhbmdlO1xuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5pbXBvcnQge2R1cmF0aW9uRGF5LCBkdXJhdGlvbk1pbnV0ZX0gZnJvbSBcIi4vZHVyYXRpb25cIjtcblxudmFyIGRheSA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQgLSAoZW5kLmdldFRpbWV6b25lT2Zmc2V0KCkgLSBzdGFydC5nZXRUaW1lem9uZU9mZnNldCgpKSAqIGR1cmF0aW9uTWludXRlKSAvIGR1cmF0aW9uRGF5O1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXREYXRlKCkgLSAxO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRheTtcbmV4cG9ydCB2YXIgZGF5cyA9IGRheS5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbk1pbnV0ZSwgZHVyYXRpb25XZWVrfSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG5mdW5jdGlvbiB3ZWVrZGF5KGkpIHtcbiAgcmV0dXJuIGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSAoZGF0ZS5nZXREYXkoKSArIDcgLSBpKSAlIDcpO1xuICAgIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgKyBzdGVwICogNyk7XG4gIH0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gKGVuZCAtIHN0YXJ0IC0gKGVuZC5nZXRUaW1lem9uZU9mZnNldCgpIC0gc3RhcnQuZ2V0VGltZXpvbmVPZmZzZXQoKSkgKiBkdXJhdGlvbk1pbnV0ZSkgLyBkdXJhdGlvbldlZWs7XG4gIH0pO1xufVxuXG5leHBvcnQgdmFyIHN1bmRheSA9IHdlZWtkYXkoMCk7XG5leHBvcnQgdmFyIG1vbmRheSA9IHdlZWtkYXkoMSk7XG5leHBvcnQgdmFyIHR1ZXNkYXkgPSB3ZWVrZGF5KDIpO1xuZXhwb3J0IHZhciB3ZWRuZXNkYXkgPSB3ZWVrZGF5KDMpO1xuZXhwb3J0IHZhciB0aHVyc2RheSA9IHdlZWtkYXkoNCk7XG5leHBvcnQgdmFyIGZyaWRheSA9IHdlZWtkYXkoNSk7XG5leHBvcnQgdmFyIHNhdHVyZGF5ID0gd2Vla2RheSg2KTtcblxuZXhwb3J0IHZhciBzdW5kYXlzID0gc3VuZGF5LnJhbmdlO1xuZXhwb3J0IHZhciBtb25kYXlzID0gbW9uZGF5LnJhbmdlO1xuZXhwb3J0IHZhciB0dWVzZGF5cyA9IHR1ZXNkYXkucmFuZ2U7XG5leHBvcnQgdmFyIHdlZG5lc2RheXMgPSB3ZWRuZXNkYXkucmFuZ2U7XG5leHBvcnQgdmFyIHRodXJzZGF5cyA9IHRodXJzZGF5LnJhbmdlO1xuZXhwb3J0IHZhciBmcmlkYXlzID0gZnJpZGF5LnJhbmdlO1xuZXhwb3J0IHZhciBzYXR1cmRheXMgPSBzYXR1cmRheS5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuXG52YXIgbW9udGggPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0RGF0ZSgxKTtcbiAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRNb250aChkYXRlLmdldE1vbnRoKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZC5nZXRNb250aCgpIC0gc3RhcnQuZ2V0TW9udGgoKSArIChlbmQuZ2V0RnVsbFllYXIoKSAtIHN0YXJ0LmdldEZ1bGxZZWFyKCkpICogMTI7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldE1vbnRoKCk7XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgbW9udGg7XG5leHBvcnQgdmFyIG1vbnRocyA9IG1vbnRoLnJhbmdlO1xuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5cbnZhciB5ZWFyID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldE1vbnRoKDAsIDEpO1xuICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gZW5kLmdldEZ1bGxZZWFyKCkgLSBzdGFydC5nZXRGdWxsWWVhcigpO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRGdWxsWWVhcigpO1xufSk7XG5cbi8vIEFuIG9wdGltaXplZCBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBzaW1wbGUgY2FzZS5cbnllYXIuZXZlcnkgPSBmdW5jdGlvbihrKSB7XG4gIHJldHVybiAhaXNGaW5pdGUoayA9IE1hdGguZmxvb3IoaykpIHx8ICEoayA+IDApID8gbnVsbCA6IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBkYXRlLnNldEZ1bGxZZWFyKE1hdGguZmxvb3IoZGF0ZS5nZXRGdWxsWWVhcigpIC8gaykgKiBrKTtcbiAgICBkYXRlLnNldE1vbnRoKDAsIDEpO1xuICAgIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSArIHN0ZXAgKiBrKTtcbiAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB5ZWFyO1xuZXhwb3J0IHZhciB5ZWFycyA9IHllYXIucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25NaW51dGV9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciB1dGNNaW51dGUgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VVRDU2Vjb25kcygwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uTWludXRlKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbk1pbnV0ZTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDTWludXRlcygpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IHV0Y01pbnV0ZTtcbmV4cG9ydCB2YXIgdXRjTWludXRlcyA9IHV0Y01pbnV0ZS5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbkhvdXJ9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciB1dGNIb3VyID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFVUQ01pbnV0ZXMoMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbkhvdXIpO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uSG91cjtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDSG91cnMoKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCB1dGNIb3VyO1xuZXhwb3J0IHZhciB1dGNIb3VycyA9IHV0Y0hvdXIucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25EYXl9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciB1dGNEYXkgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uRGF5O1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRVVENEYXRlKCkgLSAxO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IHV0Y0RheTtcbmV4cG9ydCB2YXIgdXRjRGF5cyA9IHV0Y0RheS5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbldlZWt9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbmZ1bmN0aW9uIHV0Y1dlZWtkYXkoaSkge1xuICByZXR1cm4gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSAtIChkYXRlLmdldFVUQ0RheSgpICsgNyAtIGkpICUgNyk7XG4gICAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSArIHN0ZXAgKiA3KTtcbiAgfSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25XZWVrO1xuICB9KTtcbn1cblxuZXhwb3J0IHZhciB1dGNTdW5kYXkgPSB1dGNXZWVrZGF5KDApO1xuZXhwb3J0IHZhciB1dGNNb25kYXkgPSB1dGNXZWVrZGF5KDEpO1xuZXhwb3J0IHZhciB1dGNUdWVzZGF5ID0gdXRjV2Vla2RheSgyKTtcbmV4cG9ydCB2YXIgdXRjV2VkbmVzZGF5ID0gdXRjV2Vla2RheSgzKTtcbmV4cG9ydCB2YXIgdXRjVGh1cnNkYXkgPSB1dGNXZWVrZGF5KDQpO1xuZXhwb3J0IHZhciB1dGNGcmlkYXkgPSB1dGNXZWVrZGF5KDUpO1xuZXhwb3J0IHZhciB1dGNTYXR1cmRheSA9IHV0Y1dlZWtkYXkoNik7XG5cbmV4cG9ydCB2YXIgdXRjU3VuZGF5cyA9IHV0Y1N1bmRheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjTW9uZGF5cyA9IHV0Y01vbmRheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjVHVlc2RheXMgPSB1dGNUdWVzZGF5LnJhbmdlO1xuZXhwb3J0IHZhciB1dGNXZWRuZXNkYXlzID0gdXRjV2VkbmVzZGF5LnJhbmdlO1xuZXhwb3J0IHZhciB1dGNUaHVyc2RheXMgPSB1dGNUaHVyc2RheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjRnJpZGF5cyA9IHV0Y0ZyaWRheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjU2F0dXJkYXlzID0gdXRjU2F0dXJkYXkucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcblxudmFyIHV0Y01vbnRoID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFVUQ0RhdGUoMSk7XG4gIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VVRDTW9udGgoZGF0ZS5nZXRVVENNb250aCgpICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiBlbmQuZ2V0VVRDTW9udGgoKSAtIHN0YXJ0LmdldFVUQ01vbnRoKCkgKyAoZW5kLmdldFVUQ0Z1bGxZZWFyKCkgLSBzdGFydC5nZXRVVENGdWxsWWVhcigpKSAqIDEyO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRVVENNb250aCgpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IHV0Y01vbnRoO1xuZXhwb3J0IHZhciB1dGNNb250aHMgPSB1dGNNb250aC5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuXG52YXIgdXRjWWVhciA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRVVENNb250aCgwLCAxKTtcbiAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRVVENGdWxsWWVhcihkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZC5nZXRVVENGdWxsWWVhcigpIC0gc3RhcnQuZ2V0VVRDRnVsbFllYXIoKTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDRnVsbFllYXIoKTtcbn0pO1xuXG4vLyBBbiBvcHRpbWl6ZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgc2ltcGxlIGNhc2UuXG51dGNZZWFyLmV2ZXJ5ID0gZnVuY3Rpb24oaykge1xuICByZXR1cm4gIWlzRmluaXRlKGsgPSBNYXRoLmZsb29yKGspKSB8fCAhKGsgPiAwKSA/IG51bGwgOiBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRVVENGdWxsWWVhcihNYXRoLmZsb29yKGRhdGUuZ2V0VVRDRnVsbFllYXIoKSAvIGspICogayk7XG4gICAgZGF0ZS5zZXRVVENNb250aCgwLCAxKTtcbiAgICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXRVVENGdWxsWWVhcihkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgKyBzdGVwICogayk7XG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgdXRjWWVhcjtcbmV4cG9ydCB2YXIgdXRjWWVhcnMgPSB1dGNZZWFyLnJhbmdlO1xuIiwiaW1wb3J0IHtcbiAgdGltZURheSxcbiAgdGltZVN1bmRheSxcbiAgdGltZU1vbmRheSxcbiAgdGltZVRodXJzZGF5LFxuICB0aW1lWWVhcixcbiAgdXRjRGF5LFxuICB1dGNTdW5kYXksXG4gIHV0Y01vbmRheSxcbiAgdXRjVGh1cnNkYXksXG4gIHV0Y1llYXJcbn0gZnJvbSBcImQzLXRpbWVcIjtcblxuZnVuY3Rpb24gbG9jYWxEYXRlKGQpIHtcbiAgaWYgKDAgPD0gZC55ICYmIGQueSA8IDEwMCkge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoLTEsIGQubSwgZC5kLCBkLkgsIGQuTSwgZC5TLCBkLkwpO1xuICAgIGRhdGUuc2V0RnVsbFllYXIoZC55KTtcbiAgICByZXR1cm4gZGF0ZTtcbiAgfVxuICByZXR1cm4gbmV3IERhdGUoZC55LCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKTtcbn1cblxuZnVuY3Rpb24gdXRjRGF0ZShkKSB7XG4gIGlmICgwIDw9IGQueSAmJiBkLnkgPCAxMDApIHtcbiAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKERhdGUuVVRDKC0xLCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKSk7XG4gICAgZGF0ZS5zZXRVVENGdWxsWWVhcihkLnkpO1xuICAgIHJldHVybiBkYXRlO1xuICB9XG4gIHJldHVybiBuZXcgRGF0ZShEYXRlLlVUQyhkLnksIGQubSwgZC5kLCBkLkgsIGQuTSwgZC5TLCBkLkwpKTtcbn1cblxuZnVuY3Rpb24gbmV3WWVhcih5KSB7XG4gIHJldHVybiB7eTogeSwgbTogMCwgZDogMSwgSDogMCwgTTogMCwgUzogMCwgTDogMH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGZvcm1hdExvY2FsZShsb2NhbGUpIHtcbiAgdmFyIGxvY2FsZV9kYXRlVGltZSA9IGxvY2FsZS5kYXRlVGltZSxcbiAgICAgIGxvY2FsZV9kYXRlID0gbG9jYWxlLmRhdGUsXG4gICAgICBsb2NhbGVfdGltZSA9IGxvY2FsZS50aW1lLFxuICAgICAgbG9jYWxlX3BlcmlvZHMgPSBsb2NhbGUucGVyaW9kcyxcbiAgICAgIGxvY2FsZV93ZWVrZGF5cyA9IGxvY2FsZS5kYXlzLFxuICAgICAgbG9jYWxlX3Nob3J0V2Vla2RheXMgPSBsb2NhbGUuc2hvcnREYXlzLFxuICAgICAgbG9jYWxlX21vbnRocyA9IGxvY2FsZS5tb250aHMsXG4gICAgICBsb2NhbGVfc2hvcnRNb250aHMgPSBsb2NhbGUuc2hvcnRNb250aHM7XG5cbiAgdmFyIHBlcmlvZFJlID0gZm9ybWF0UmUobG9jYWxlX3BlcmlvZHMpLFxuICAgICAgcGVyaW9kTG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV9wZXJpb2RzKSxcbiAgICAgIHdlZWtkYXlSZSA9IGZvcm1hdFJlKGxvY2FsZV93ZWVrZGF5cyksXG4gICAgICB3ZWVrZGF5TG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV93ZWVrZGF5cyksXG4gICAgICBzaG9ydFdlZWtkYXlSZSA9IGZvcm1hdFJlKGxvY2FsZV9zaG9ydFdlZWtkYXlzKSxcbiAgICAgIHNob3J0V2Vla2RheUxvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfc2hvcnRXZWVrZGF5cyksXG4gICAgICBtb250aFJlID0gZm9ybWF0UmUobG9jYWxlX21vbnRocyksXG4gICAgICBtb250aExvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfbW9udGhzKSxcbiAgICAgIHNob3J0TW9udGhSZSA9IGZvcm1hdFJlKGxvY2FsZV9zaG9ydE1vbnRocyksXG4gICAgICBzaG9ydE1vbnRoTG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV9zaG9ydE1vbnRocyk7XG5cbiAgdmFyIGZvcm1hdHMgPSB7XG4gICAgXCJhXCI6IGZvcm1hdFNob3J0V2Vla2RheSxcbiAgICBcIkFcIjogZm9ybWF0V2Vla2RheSxcbiAgICBcImJcIjogZm9ybWF0U2hvcnRNb250aCxcbiAgICBcIkJcIjogZm9ybWF0TW9udGgsXG4gICAgXCJjXCI6IG51bGwsXG4gICAgXCJkXCI6IGZvcm1hdERheU9mTW9udGgsXG4gICAgXCJlXCI6IGZvcm1hdERheU9mTW9udGgsXG4gICAgXCJmXCI6IGZvcm1hdE1pY3Jvc2Vjb25kcyxcbiAgICBcIkhcIjogZm9ybWF0SG91cjI0LFxuICAgIFwiSVwiOiBmb3JtYXRIb3VyMTIsXG4gICAgXCJqXCI6IGZvcm1hdERheU9mWWVhcixcbiAgICBcIkxcIjogZm9ybWF0TWlsbGlzZWNvbmRzLFxuICAgIFwibVwiOiBmb3JtYXRNb250aE51bWJlcixcbiAgICBcIk1cIjogZm9ybWF0TWludXRlcyxcbiAgICBcInBcIjogZm9ybWF0UGVyaW9kLFxuICAgIFwiUVwiOiBmb3JtYXRVbml4VGltZXN0YW1wLFxuICAgIFwic1wiOiBmb3JtYXRVbml4VGltZXN0YW1wU2Vjb25kcyxcbiAgICBcIlNcIjogZm9ybWF0U2Vjb25kcyxcbiAgICBcInVcIjogZm9ybWF0V2Vla2RheU51bWJlck1vbmRheSxcbiAgICBcIlVcIjogZm9ybWF0V2Vla051bWJlclN1bmRheSxcbiAgICBcIlZcIjogZm9ybWF0V2Vla051bWJlcklTTyxcbiAgICBcIndcIjogZm9ybWF0V2Vla2RheU51bWJlclN1bmRheSxcbiAgICBcIldcIjogZm9ybWF0V2Vla051bWJlck1vbmRheSxcbiAgICBcInhcIjogbnVsbCxcbiAgICBcIlhcIjogbnVsbCxcbiAgICBcInlcIjogZm9ybWF0WWVhcixcbiAgICBcIllcIjogZm9ybWF0RnVsbFllYXIsXG4gICAgXCJaXCI6IGZvcm1hdFpvbmUsXG4gICAgXCIlXCI6IGZvcm1hdExpdGVyYWxQZXJjZW50XG4gIH07XG5cbiAgdmFyIHV0Y0Zvcm1hdHMgPSB7XG4gICAgXCJhXCI6IGZvcm1hdFVUQ1Nob3J0V2Vla2RheSxcbiAgICBcIkFcIjogZm9ybWF0VVRDV2Vla2RheSxcbiAgICBcImJcIjogZm9ybWF0VVRDU2hvcnRNb250aCxcbiAgICBcIkJcIjogZm9ybWF0VVRDTW9udGgsXG4gICAgXCJjXCI6IG51bGwsXG4gICAgXCJkXCI6IGZvcm1hdFVUQ0RheU9mTW9udGgsXG4gICAgXCJlXCI6IGZvcm1hdFVUQ0RheU9mTW9udGgsXG4gICAgXCJmXCI6IGZvcm1hdFVUQ01pY3Jvc2Vjb25kcyxcbiAgICBcIkhcIjogZm9ybWF0VVRDSG91cjI0LFxuICAgIFwiSVwiOiBmb3JtYXRVVENIb3VyMTIsXG4gICAgXCJqXCI6IGZvcm1hdFVUQ0RheU9mWWVhcixcbiAgICBcIkxcIjogZm9ybWF0VVRDTWlsbGlzZWNvbmRzLFxuICAgIFwibVwiOiBmb3JtYXRVVENNb250aE51bWJlcixcbiAgICBcIk1cIjogZm9ybWF0VVRDTWludXRlcyxcbiAgICBcInBcIjogZm9ybWF0VVRDUGVyaW9kLFxuICAgIFwiUVwiOiBmb3JtYXRVbml4VGltZXN0YW1wLFxuICAgIFwic1wiOiBmb3JtYXRVbml4VGltZXN0YW1wU2Vjb25kcyxcbiAgICBcIlNcIjogZm9ybWF0VVRDU2Vjb25kcyxcbiAgICBcInVcIjogZm9ybWF0VVRDV2Vla2RheU51bWJlck1vbmRheSxcbiAgICBcIlVcIjogZm9ybWF0VVRDV2Vla051bWJlclN1bmRheSxcbiAgICBcIlZcIjogZm9ybWF0VVRDV2Vla051bWJlcklTTyxcbiAgICBcIndcIjogZm9ybWF0VVRDV2Vla2RheU51bWJlclN1bmRheSxcbiAgICBcIldcIjogZm9ybWF0VVRDV2Vla051bWJlck1vbmRheSxcbiAgICBcInhcIjogbnVsbCxcbiAgICBcIlhcIjogbnVsbCxcbiAgICBcInlcIjogZm9ybWF0VVRDWWVhcixcbiAgICBcIllcIjogZm9ybWF0VVRDRnVsbFllYXIsXG4gICAgXCJaXCI6IGZvcm1hdFVUQ1pvbmUsXG4gICAgXCIlXCI6IGZvcm1hdExpdGVyYWxQZXJjZW50XG4gIH07XG5cbiAgdmFyIHBhcnNlcyA9IHtcbiAgICBcImFcIjogcGFyc2VTaG9ydFdlZWtkYXksXG4gICAgXCJBXCI6IHBhcnNlV2Vla2RheSxcbiAgICBcImJcIjogcGFyc2VTaG9ydE1vbnRoLFxuICAgIFwiQlwiOiBwYXJzZU1vbnRoLFxuICAgIFwiY1wiOiBwYXJzZUxvY2FsZURhdGVUaW1lLFxuICAgIFwiZFwiOiBwYXJzZURheU9mTW9udGgsXG4gICAgXCJlXCI6IHBhcnNlRGF5T2ZNb250aCxcbiAgICBcImZcIjogcGFyc2VNaWNyb3NlY29uZHMsXG4gICAgXCJIXCI6IHBhcnNlSG91cjI0LFxuICAgIFwiSVwiOiBwYXJzZUhvdXIyNCxcbiAgICBcImpcIjogcGFyc2VEYXlPZlllYXIsXG4gICAgXCJMXCI6IHBhcnNlTWlsbGlzZWNvbmRzLFxuICAgIFwibVwiOiBwYXJzZU1vbnRoTnVtYmVyLFxuICAgIFwiTVwiOiBwYXJzZU1pbnV0ZXMsXG4gICAgXCJwXCI6IHBhcnNlUGVyaW9kLFxuICAgIFwiUVwiOiBwYXJzZVVuaXhUaW1lc3RhbXAsXG4gICAgXCJzXCI6IHBhcnNlVW5peFRpbWVzdGFtcFNlY29uZHMsXG4gICAgXCJTXCI6IHBhcnNlU2Vjb25kcyxcbiAgICBcInVcIjogcGFyc2VXZWVrZGF5TnVtYmVyTW9uZGF5LFxuICAgIFwiVVwiOiBwYXJzZVdlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJWXCI6IHBhcnNlV2Vla051bWJlcklTTyxcbiAgICBcIndcIjogcGFyc2VXZWVrZGF5TnVtYmVyU3VuZGF5LFxuICAgIFwiV1wiOiBwYXJzZVdlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IHBhcnNlTG9jYWxlRGF0ZSxcbiAgICBcIlhcIjogcGFyc2VMb2NhbGVUaW1lLFxuICAgIFwieVwiOiBwYXJzZVllYXIsXG4gICAgXCJZXCI6IHBhcnNlRnVsbFllYXIsXG4gICAgXCJaXCI6IHBhcnNlWm9uZSxcbiAgICBcIiVcIjogcGFyc2VMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIC8vIFRoZXNlIHJlY3Vyc2l2ZSBkaXJlY3RpdmUgZGVmaW5pdGlvbnMgbXVzdCBiZSBkZWZlcnJlZC5cbiAgZm9ybWF0cy54ID0gbmV3Rm9ybWF0KGxvY2FsZV9kYXRlLCBmb3JtYXRzKTtcbiAgZm9ybWF0cy5YID0gbmV3Rm9ybWF0KGxvY2FsZV90aW1lLCBmb3JtYXRzKTtcbiAgZm9ybWF0cy5jID0gbmV3Rm9ybWF0KGxvY2FsZV9kYXRlVGltZSwgZm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMueCA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZSwgdXRjRm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMuWCA9IG5ld0Zvcm1hdChsb2NhbGVfdGltZSwgdXRjRm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMuYyA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZVRpbWUsIHV0Y0Zvcm1hdHMpO1xuXG4gIGZ1bmN0aW9uIG5ld0Zvcm1hdChzcGVjaWZpZXIsIGZvcm1hdHMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgdmFyIHN0cmluZyA9IFtdLFxuICAgICAgICAgIGkgPSAtMSxcbiAgICAgICAgICBqID0gMCxcbiAgICAgICAgICBuID0gc3BlY2lmaWVyLmxlbmd0aCxcbiAgICAgICAgICBjLFxuICAgICAgICAgIHBhZCxcbiAgICAgICAgICBmb3JtYXQ7XG5cbiAgICAgIGlmICghKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgZGF0ZSA9IG5ldyBEYXRlKCtkYXRlKTtcblxuICAgICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgaWYgKHNwZWNpZmllci5jaGFyQ29kZUF0KGkpID09PSAzNykge1xuICAgICAgICAgIHN0cmluZy5wdXNoKHNwZWNpZmllci5zbGljZShqLCBpKSk7XG4gICAgICAgICAgaWYgKChwYWQgPSBwYWRzW2MgPSBzcGVjaWZpZXIuY2hhckF0KCsraSldKSAhPSBudWxsKSBjID0gc3BlY2lmaWVyLmNoYXJBdCgrK2kpO1xuICAgICAgICAgIGVsc2UgcGFkID0gYyA9PT0gXCJlXCIgPyBcIiBcIiA6IFwiMFwiO1xuICAgICAgICAgIGlmIChmb3JtYXQgPSBmb3JtYXRzW2NdKSBjID0gZm9ybWF0KGRhdGUsIHBhZCk7XG4gICAgICAgICAgc3RyaW5nLnB1c2goYyk7XG4gICAgICAgICAgaiA9IGkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHN0cmluZy5wdXNoKHNwZWNpZmllci5zbGljZShqLCBpKSk7XG4gICAgICByZXR1cm4gc3RyaW5nLmpvaW4oXCJcIik7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5ld1BhcnNlKHNwZWNpZmllciwgbmV3RGF0ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIHZhciBkID0gbmV3WWVhcigxOTAwKSxcbiAgICAgICAgICBpID0gcGFyc2VTcGVjaWZpZXIoZCwgc3BlY2lmaWVyLCBzdHJpbmcgKz0gXCJcIiwgMCksXG4gICAgICAgICAgd2VlaywgZGF5O1xuICAgICAgaWYgKGkgIT0gc3RyaW5nLmxlbmd0aCkgcmV0dXJuIG51bGw7XG5cbiAgICAgIC8vIElmIGEgVU5JWCB0aW1lc3RhbXAgaXMgc3BlY2lmaWVkLCByZXR1cm4gaXQuXG4gICAgICBpZiAoXCJRXCIgaW4gZCkgcmV0dXJuIG5ldyBEYXRlKGQuUSk7XG5cbiAgICAgIC8vIFRoZSBhbS1wbSBmbGFnIGlzIDAgZm9yIEFNLCBhbmQgMSBmb3IgUE0uXG4gICAgICBpZiAoXCJwXCIgaW4gZCkgZC5IID0gZC5IICUgMTIgKyBkLnAgKiAxMjtcblxuICAgICAgLy8gQ29udmVydCBkYXktb2Ytd2VlayBhbmQgd2Vlay1vZi15ZWFyIHRvIGRheS1vZi15ZWFyLlxuICAgICAgaWYgKFwiVlwiIGluIGQpIHtcbiAgICAgICAgaWYgKGQuViA8IDEgfHwgZC5WID4gNTMpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIShcIndcIiBpbiBkKSkgZC53ID0gMTtcbiAgICAgICAgaWYgKFwiWlwiIGluIGQpIHtcbiAgICAgICAgICB3ZWVrID0gdXRjRGF0ZShuZXdZZWFyKGQueSkpLCBkYXkgPSB3ZWVrLmdldFVUQ0RheSgpO1xuICAgICAgICAgIHdlZWsgPSBkYXkgPiA0IHx8IGRheSA9PT0gMCA/IHV0Y01vbmRheS5jZWlsKHdlZWspIDogdXRjTW9uZGF5KHdlZWspO1xuICAgICAgICAgIHdlZWsgPSB1dGNEYXkub2Zmc2V0KHdlZWssIChkLlYgLSAxKSAqIDcpO1xuICAgICAgICAgIGQueSA9IHdlZWsuZ2V0VVRDRnVsbFllYXIoKTtcbiAgICAgICAgICBkLm0gPSB3ZWVrLmdldFVUQ01vbnRoKCk7XG4gICAgICAgICAgZC5kID0gd2Vlay5nZXRVVENEYXRlKCkgKyAoZC53ICsgNikgJSA3O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdlZWsgPSBuZXdEYXRlKG5ld1llYXIoZC55KSksIGRheSA9IHdlZWsuZ2V0RGF5KCk7XG4gICAgICAgICAgd2VlayA9IGRheSA+IDQgfHwgZGF5ID09PSAwID8gdGltZU1vbmRheS5jZWlsKHdlZWspIDogdGltZU1vbmRheSh3ZWVrKTtcbiAgICAgICAgICB3ZWVrID0gdGltZURheS5vZmZzZXQod2VlaywgKGQuViAtIDEpICogNyk7XG4gICAgICAgICAgZC55ID0gd2Vlay5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgIGQubSA9IHdlZWsuZ2V0TW9udGgoKTtcbiAgICAgICAgICBkLmQgPSB3ZWVrLmdldERhdGUoKSArIChkLncgKyA2KSAlIDc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoXCJXXCIgaW4gZCB8fCBcIlVcIiBpbiBkKSB7XG4gICAgICAgIGlmICghKFwid1wiIGluIGQpKSBkLncgPSBcInVcIiBpbiBkID8gZC51ICUgNyA6IFwiV1wiIGluIGQgPyAxIDogMDtcbiAgICAgICAgZGF5ID0gXCJaXCIgaW4gZCA/IHV0Y0RhdGUobmV3WWVhcihkLnkpKS5nZXRVVENEYXkoKSA6IG5ld0RhdGUobmV3WWVhcihkLnkpKS5nZXREYXkoKTtcbiAgICAgICAgZC5tID0gMDtcbiAgICAgICAgZC5kID0gXCJXXCIgaW4gZCA/IChkLncgKyA2KSAlIDcgKyBkLlcgKiA3IC0gKGRheSArIDUpICUgNyA6IGQudyArIGQuVSAqIDcgLSAoZGF5ICsgNikgJSA3O1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBhIHRpbWUgem9uZSBpcyBzcGVjaWZpZWQsIGFsbCBmaWVsZHMgYXJlIGludGVycHJldGVkIGFzIFVUQyBhbmQgdGhlblxuICAgICAgLy8gb2Zmc2V0IGFjY29yZGluZyB0byB0aGUgc3BlY2lmaWVkIHRpbWUgem9uZS5cbiAgICAgIGlmIChcIlpcIiBpbiBkKSB7XG4gICAgICAgIGQuSCArPSBkLlogLyAxMDAgfCAwO1xuICAgICAgICBkLk0gKz0gZC5aICUgMTAwO1xuICAgICAgICByZXR1cm4gdXRjRGF0ZShkKTtcbiAgICAgIH1cblxuICAgICAgLy8gT3RoZXJ3aXNlLCBhbGwgZmllbGRzIGFyZSBpbiBsb2NhbCB0aW1lLlxuICAgICAgcmV0dXJuIG5ld0RhdGUoZCk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlU3BlY2lmaWVyKGQsIHNwZWNpZmllciwgc3RyaW5nLCBqKSB7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBuID0gc3BlY2lmaWVyLmxlbmd0aCxcbiAgICAgICAgbSA9IHN0cmluZy5sZW5ndGgsXG4gICAgICAgIGMsXG4gICAgICAgIHBhcnNlO1xuXG4gICAgd2hpbGUgKGkgPCBuKSB7XG4gICAgICBpZiAoaiA+PSBtKSByZXR1cm4gLTE7XG4gICAgICBjID0gc3BlY2lmaWVyLmNoYXJDb2RlQXQoaSsrKTtcbiAgICAgIGlmIChjID09PSAzNykge1xuICAgICAgICBjID0gc3BlY2lmaWVyLmNoYXJBdChpKyspO1xuICAgICAgICBwYXJzZSA9IHBhcnNlc1tjIGluIHBhZHMgPyBzcGVjaWZpZXIuY2hhckF0KGkrKykgOiBjXTtcbiAgICAgICAgaWYgKCFwYXJzZSB8fCAoKGogPSBwYXJzZShkLCBzdHJpbmcsIGopKSA8IDApKSByZXR1cm4gLTE7XG4gICAgICB9IGVsc2UgaWYgKGMgIT0gc3RyaW5nLmNoYXJDb2RlQXQoaisrKSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGo7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVBlcmlvZChkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IHBlcmlvZFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLnAgPSBwZXJpb2RMb29rdXBbblswXS50b0xvd2VyQ2FzZSgpXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VTaG9ydFdlZWtkYXkoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBzaG9ydFdlZWtkYXlSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC53ID0gc2hvcnRXZWVrZGF5TG9va3VwW25bMF0udG9Mb3dlckNhc2UoKV0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlV2Vla2RheShkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IHdlZWtkYXlSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC53ID0gd2Vla2RheUxvb2t1cFtuWzBdLnRvTG93ZXJDYXNlKCldLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVNob3J0TW9udGgoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBzaG9ydE1vbnRoUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQubSA9IHNob3J0TW9udGhMb29rdXBbblswXS50b0xvd2VyQ2FzZSgpXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VNb250aChkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IG1vbnRoUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQubSA9IG1vbnRoTG9va3VwW25bMF0udG9Mb3dlckNhc2UoKV0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYWxlRGF0ZVRpbWUoZCwgc3RyaW5nLCBpKSB7XG4gICAgcmV0dXJuIHBhcnNlU3BlY2lmaWVyKGQsIGxvY2FsZV9kYXRlVGltZSwgc3RyaW5nLCBpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYWxlRGF0ZShkLCBzdHJpbmcsIGkpIHtcbiAgICByZXR1cm4gcGFyc2VTcGVjaWZpZXIoZCwgbG9jYWxlX2RhdGUsIHN0cmluZywgaSk7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUxvY2FsZVRpbWUoZCwgc3RyaW5nLCBpKSB7XG4gICAgcmV0dXJuIHBhcnNlU3BlY2lmaWVyKGQsIGxvY2FsZV90aW1lLCBzdHJpbmcsIGkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0U2hvcnRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3Nob3J0V2Vla2RheXNbZC5nZXREYXkoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3dlZWtkYXlzW2QuZ2V0RGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0U2hvcnRNb250aChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydE1vbnRoc1tkLmdldE1vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0TW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfbW9udGhzW2QuZ2V0TW9udGgoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRQZXJpb2QoZCkge1xuICAgIHJldHVybiBsb2NhbGVfcGVyaW9kc1srKGQuZ2V0SG91cnMoKSA+PSAxMildO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDU2hvcnRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3Nob3J0V2Vla2RheXNbZC5nZXRVVENEYXkoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRVVENXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3dlZWtkYXlzW2QuZ2V0VVRDRGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDU2hvcnRNb250aChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydE1vbnRoc1tkLmdldFVUQ01vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDTW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfbW9udGhzW2QuZ2V0VVRDTW9udGgoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRVVENQZXJpb2QoZCkge1xuICAgIHJldHVybiBsb2NhbGVfcGVyaW9kc1srKGQuZ2V0VVRDSG91cnMoKSA+PSAxMildO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBmb3JtYXQ6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIGYgPSBuZXdGb3JtYXQoc3BlY2lmaWVyICs9IFwiXCIsIGZvcm1hdHMpO1xuICAgICAgZi50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIGY7XG4gICAgfSxcbiAgICBwYXJzZTogZnVuY3Rpb24oc3BlY2lmaWVyKSB7XG4gICAgICB2YXIgcCA9IG5ld1BhcnNlKHNwZWNpZmllciArPSBcIlwiLCBsb2NhbERhdGUpO1xuICAgICAgcC50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIHA7XG4gICAgfSxcbiAgICB1dGNGb3JtYXQ6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIGYgPSBuZXdGb3JtYXQoc3BlY2lmaWVyICs9IFwiXCIsIHV0Y0Zvcm1hdHMpO1xuICAgICAgZi50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIGY7XG4gICAgfSxcbiAgICB1dGNQYXJzZTogZnVuY3Rpb24oc3BlY2lmaWVyKSB7XG4gICAgICB2YXIgcCA9IG5ld1BhcnNlKHNwZWNpZmllciwgdXRjRGF0ZSk7XG4gICAgICBwLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiBzcGVjaWZpZXI7IH07XG4gICAgICByZXR1cm4gcDtcbiAgICB9XG4gIH07XG59XG5cbnZhciBwYWRzID0ge1wiLVwiOiBcIlwiLCBcIl9cIjogXCIgXCIsIFwiMFwiOiBcIjBcIn0sXG4gICAgbnVtYmVyUmUgPSAvXlxccypcXGQrLywgLy8gbm90ZTogaWdub3JlcyBuZXh0IGRpcmVjdGl2ZVxuICAgIHBlcmNlbnRSZSA9IC9eJS8sXG4gICAgcmVxdW90ZVJlID0gL1tcXFxcXiQqKz98W1xcXSgpLnt9XS9nO1xuXG5mdW5jdGlvbiBwYWQodmFsdWUsIGZpbGwsIHdpZHRoKSB7XG4gIHZhciBzaWduID0gdmFsdWUgPCAwID8gXCItXCIgOiBcIlwiLFxuICAgICAgc3RyaW5nID0gKHNpZ24gPyAtdmFsdWUgOiB2YWx1ZSkgKyBcIlwiLFxuICAgICAgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcbiAgcmV0dXJuIHNpZ24gKyAobGVuZ3RoIDwgd2lkdGggPyBuZXcgQXJyYXkod2lkdGggLSBsZW5ndGggKyAxKS5qb2luKGZpbGwpICsgc3RyaW5nIDogc3RyaW5nKTtcbn1cblxuZnVuY3Rpb24gcmVxdW90ZShzKSB7XG4gIHJldHVybiBzLnJlcGxhY2UocmVxdW90ZVJlLCBcIlxcXFwkJlwiKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0UmUobmFtZXMpIHtcbiAgcmV0dXJuIG5ldyBSZWdFeHAoXCJeKD86XCIgKyBuYW1lcy5tYXAocmVxdW90ZSkuam9pbihcInxcIikgKyBcIilcIiwgXCJpXCIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRMb29rdXAobmFtZXMpIHtcbiAgdmFyIG1hcCA9IHt9LCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gIHdoaWxlICgrK2kgPCBuKSBtYXBbbmFtZXNbaV0udG9Mb3dlckNhc2UoKV0gPSBpO1xuICByZXR1cm4gbWFwO1xufVxuXG5mdW5jdGlvbiBwYXJzZVdlZWtkYXlOdW1iZXJTdW5kYXkoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDEpKTtcbiAgcmV0dXJuIG4gPyAoZC53ID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrZGF5TnVtYmVyTW9uZGF5KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAxKSk7XG4gIHJldHVybiBuID8gKGQudSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlV2Vla051bWJlclN1bmRheShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLlUgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVdlZWtOdW1iZXJJU08oZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5WID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrTnVtYmVyTW9uZGF5KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuVyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRnVsbFllYXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDQpKTtcbiAgcmV0dXJuIG4gPyAoZC55ID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VZZWFyKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQueSA9ICtuWzBdICsgKCtuWzBdID4gNjggPyAxOTAwIDogMjAwMCksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2Vab25lKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IC9eKFopfChbKy1dXFxkXFxkKSg/Ojo/KFxcZFxcZCkpPy8uZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDYpKTtcbiAgcmV0dXJuIG4gPyAoZC5aID0gblsxXSA/IDAgOiAtKG5bMl0gKyAoblszXSB8fCBcIjAwXCIpKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1vbnRoTnVtYmVyKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQubSA9IG5bMF0gLSAxLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRGF5T2ZNb250aChkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLmQgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZURheU9mWWVhcihkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMykpO1xuICByZXR1cm4gbiA/IChkLm0gPSAwLCBkLmQgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZUhvdXIyNChkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLkggPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1pbnV0ZXMoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5NID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VTZWNvbmRzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuUyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTWlsbGlzZWNvbmRzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAzKSk7XG4gIHJldHVybiBuID8gKGQuTCA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTWljcm9zZWNvbmRzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyA2KSk7XG4gIHJldHVybiBuID8gKGQuTCA9IE1hdGguZmxvb3IoblswXSAvIDEwMDApLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTGl0ZXJhbFBlcmNlbnQoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gcGVyY2VudFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAxKSk7XG4gIHJldHVybiBuID8gaSArIG5bMF0ubGVuZ3RoIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlVW5peFRpbWVzdGFtcChkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gIHJldHVybiBuID8gKGQuUSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlVW5peFRpbWVzdGFtcFNlY29uZHMoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICByZXR1cm4gbiA/IChkLlEgPSAoK25bMF0pICogMTAwMCwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBmb3JtYXREYXlPZk1vbnRoKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldERhdGUoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdEhvdXIyNChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRIb3VycygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0SG91cjEyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldEhvdXJzKCkgJSAxMiB8fCAxMiwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdERheU9mWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoMSArIHRpbWVEYXkuY291bnQodGltZVllYXIoZCksIGQpLCBwLCAzKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TWlsbGlzZWNvbmRzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldE1pbGxpc2Vjb25kcygpLCBwLCAzKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TWljcm9zZWNvbmRzKGQsIHApIHtcbiAgcmV0dXJuIGZvcm1hdE1pbGxpc2Vjb25kcyhkLCBwKSArIFwiMDAwXCI7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1vbnRoTnVtYmVyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldE1vbnRoKCkgKyAxLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TWludXRlcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRNaW51dGVzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRTZWNvbmRzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFNlY29uZHMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtkYXlOdW1iZXJNb25kYXkoZCkge1xuICB2YXIgZGF5ID0gZC5nZXREYXkoKTtcbiAgcmV0dXJuIGRheSA9PT0gMCA/IDcgOiBkYXk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtOdW1iZXJTdW5kYXkoZCwgcCkge1xuICByZXR1cm4gcGFkKHRpbWVTdW5kYXkuY291bnQodGltZVllYXIoZCksIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2Vla051bWJlcklTTyhkLCBwKSB7XG4gIHZhciBkYXkgPSBkLmdldERheSgpO1xuICBkID0gKGRheSA+PSA0IHx8IGRheSA9PT0gMCkgPyB0aW1lVGh1cnNkYXkoZCkgOiB0aW1lVGh1cnNkYXkuY2VpbChkKTtcbiAgcmV0dXJuIHBhZCh0aW1lVGh1cnNkYXkuY291bnQodGltZVllYXIoZCksIGQpICsgKHRpbWVZZWFyKGQpLmdldERheSgpID09PSA0KSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtkYXlOdW1iZXJTdW5kYXkoZCkge1xuICByZXR1cm4gZC5nZXREYXkoKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2Vla051bWJlck1vbmRheShkLCBwKSB7XG4gIHJldHVybiBwYWQodGltZU1vbmRheS5jb3VudCh0aW1lWWVhcihkKSwgZCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldEZ1bGxZZWFyKCkgJSAxMDAsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRGdWxsWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRGdWxsWWVhcigpICUgMTAwMDAsIHAsIDQpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRab25lKGQpIHtcbiAgdmFyIHogPSBkLmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gIHJldHVybiAoeiA+IDAgPyBcIi1cIiA6ICh6ICo9IC0xLCBcIitcIikpXG4gICAgICArIHBhZCh6IC8gNjAgfCAwLCBcIjBcIiwgMilcbiAgICAgICsgcGFkKHogJSA2MCwgXCIwXCIsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENEYXlPZk1vbnRoKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0RhdGUoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0hvdXIyNChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENIb3VycygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDSG91cjEyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0hvdXJzKCkgJSAxMiB8fCAxMiwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0RheU9mWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoMSArIHV0Y0RheS5jb3VudCh1dGNZZWFyKGQpLCBkKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01pbGxpc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENNaWxsaXNlY29uZHMoKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01pY3Jvc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBmb3JtYXRVVENNaWxsaXNlY29uZHMoZCwgcCkgKyBcIjAwMFwiO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENNb250aE51bWJlcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENNb250aCgpICsgMSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01pbnV0ZXMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDTWludXRlcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDU2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENTZWNvbmRzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrZGF5TnVtYmVyTW9uZGF5KGQpIHtcbiAgdmFyIGRvdyA9IGQuZ2V0VVRDRGF5KCk7XG4gIHJldHVybiBkb3cgPT09IDAgPyA3IDogZG93O1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrTnVtYmVyU3VuZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZCh1dGNTdW5kYXkuY291bnQodXRjWWVhcihkKSwgZCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrTnVtYmVySVNPKGQsIHApIHtcbiAgdmFyIGRheSA9IGQuZ2V0VVRDRGF5KCk7XG4gIGQgPSAoZGF5ID49IDQgfHwgZGF5ID09PSAwKSA/IHV0Y1RodXJzZGF5KGQpIDogdXRjVGh1cnNkYXkuY2VpbChkKTtcbiAgcmV0dXJuIHBhZCh1dGNUaHVyc2RheS5jb3VudCh1dGNZZWFyKGQpLCBkKSArICh1dGNZZWFyKGQpLmdldFVUQ0RheSgpID09PSA0KSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXJTdW5kYXkoZCkge1xuICByZXR1cm4gZC5nZXRVVENEYXkoKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla051bWJlck1vbmRheShkLCBwKSB7XG4gIHJldHVybiBwYWQodXRjTW9uZGF5LmNvdW50KHV0Y1llYXIoZCksIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENGdWxsWWVhcigpICUgMTAwLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDRnVsbFllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDRnVsbFllYXIoKSAlIDEwMDAwLCBwLCA0KTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDWm9uZSgpIHtcbiAgcmV0dXJuIFwiKzAwMDBcIjtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TGl0ZXJhbFBlcmNlbnQoKSB7XG4gIHJldHVybiBcIiVcIjtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VW5peFRpbWVzdGFtcChkKSB7XG4gIHJldHVybiArZDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VW5peFRpbWVzdGFtcFNlY29uZHMoZCkge1xuICByZXR1cm4gTWF0aC5mbG9vcigrZCAvIDEwMDApO1xufVxuIiwiaW1wb3J0IGZvcm1hdExvY2FsZSBmcm9tIFwiLi9sb2NhbGVcIjtcblxudmFyIGxvY2FsZTtcbmV4cG9ydCB2YXIgdGltZUZvcm1hdDtcbmV4cG9ydCB2YXIgdGltZVBhcnNlO1xuZXhwb3J0IHZhciB1dGNGb3JtYXQ7XG5leHBvcnQgdmFyIHV0Y1BhcnNlO1xuXG5kZWZhdWx0TG9jYWxlKHtcbiAgZGF0ZVRpbWU6IFwiJXgsICVYXCIsXG4gIGRhdGU6IFwiJS1tLyUtZC8lWVwiLFxuICB0aW1lOiBcIiUtSTolTTolUyAlcFwiLFxuICBwZXJpb2RzOiBbXCJBTVwiLCBcIlBNXCJdLFxuICBkYXlzOiBbXCJTdW5kYXlcIiwgXCJNb25kYXlcIiwgXCJUdWVzZGF5XCIsIFwiV2VkbmVzZGF5XCIsIFwiVGh1cnNkYXlcIiwgXCJGcmlkYXlcIiwgXCJTYXR1cmRheVwiXSxcbiAgc2hvcnREYXlzOiBbXCJTdW5cIiwgXCJNb25cIiwgXCJUdWVcIiwgXCJXZWRcIiwgXCJUaHVcIiwgXCJGcmlcIiwgXCJTYXRcIl0sXG4gIG1vbnRoczogW1wiSmFudWFyeVwiLCBcIkZlYnJ1YXJ5XCIsIFwiTWFyY2hcIiwgXCJBcHJpbFwiLCBcIk1heVwiLCBcIkp1bmVcIiwgXCJKdWx5XCIsIFwiQXVndXN0XCIsIFwiU2VwdGVtYmVyXCIsIFwiT2N0b2JlclwiLCBcIk5vdmVtYmVyXCIsIFwiRGVjZW1iZXJcIl0sXG4gIHNob3J0TW9udGhzOiBbXCJKYW5cIiwgXCJGZWJcIiwgXCJNYXJcIiwgXCJBcHJcIiwgXCJNYXlcIiwgXCJKdW5cIiwgXCJKdWxcIiwgXCJBdWdcIiwgXCJTZXBcIiwgXCJPY3RcIiwgXCJOb3ZcIiwgXCJEZWNcIl1cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkZWZhdWx0TG9jYWxlKGRlZmluaXRpb24pIHtcbiAgbG9jYWxlID0gZm9ybWF0TG9jYWxlKGRlZmluaXRpb24pO1xuICB0aW1lRm9ybWF0ID0gbG9jYWxlLmZvcm1hdDtcbiAgdGltZVBhcnNlID0gbG9jYWxlLnBhcnNlO1xuICB1dGNGb3JtYXQgPSBsb2NhbGUudXRjRm9ybWF0O1xuICB1dGNQYXJzZSA9IGxvY2FsZS51dGNQYXJzZTtcbiAgcmV0dXJuIGxvY2FsZTtcbn1cbiIsImltcG9ydCB7dXRjRm9ybWF0fSBmcm9tIFwiLi9kZWZhdWx0TG9jYWxlXCI7XG5cbmV4cG9ydCB2YXIgaXNvU3BlY2lmaWVyID0gXCIlWS0lbS0lZFQlSDolTTolUy4lTFpcIjtcblxuZnVuY3Rpb24gZm9ybWF0SXNvTmF0aXZlKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUudG9JU09TdHJpbmcoKTtcbn1cblxudmFyIGZvcm1hdElzbyA9IERhdGUucHJvdG90eXBlLnRvSVNPU3RyaW5nXG4gICAgPyBmb3JtYXRJc29OYXRpdmVcbiAgICA6IHV0Y0Zvcm1hdChpc29TcGVjaWZpZXIpO1xuXG5leHBvcnQgZGVmYXVsdCBmb3JtYXRJc287XG4iLCJpbXBvcnQge2lzb1NwZWNpZmllcn0gZnJvbSBcIi4vaXNvRm9ybWF0XCI7XG5pbXBvcnQge3V0Y1BhcnNlfSBmcm9tIFwiLi9kZWZhdWx0TG9jYWxlXCI7XG5cbmZ1bmN0aW9uIHBhcnNlSXNvTmF0aXZlKHN0cmluZykge1xuICB2YXIgZGF0ZSA9IG5ldyBEYXRlKHN0cmluZyk7XG4gIHJldHVybiBpc05hTihkYXRlKSA/IG51bGwgOiBkYXRlO1xufVxuXG52YXIgcGFyc2VJc28gPSArbmV3IERhdGUoXCIyMDAwLTAxLTAxVDAwOjAwOjAwLjAwMFpcIilcbiAgICA/IHBhcnNlSXNvTmF0aXZlXG4gICAgOiB1dGNQYXJzZShpc29TcGVjaWZpZXIpO1xuXG5leHBvcnQgZGVmYXVsdCBwYXJzZUlzbztcbiIsImltcG9ydCB7bGluZWFyaXNofSBmcm9tIFwiLi9saW5lYXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2VxdWVudGlhbChpbnRlcnBvbGF0b3IpIHtcbiAgdmFyIHgwID0gMCxcbiAgICAgIHgxID0gMSxcbiAgICAgIGNsYW1wID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gc2NhbGUoeCkge1xuICAgIHZhciB0ID0gKHggLSB4MCkgLyAoeDEgLSB4MCk7XG4gICAgcmV0dXJuIGludGVycG9sYXRvcihjbGFtcCA/IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIHQpKSA6IHQpO1xuICB9XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgwID0gK19bMF0sIHgxID0gK19bMV0sIHNjYWxlKSA6IFt4MCwgeDFdO1xuICB9O1xuXG4gIHNjYWxlLmNsYW1wID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGNsYW1wID0gISFfLCBzY2FsZSkgOiBjbGFtcDtcbiAgfTtcblxuICBzY2FsZS5pbnRlcnBvbGF0b3IgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoaW50ZXJwb2xhdG9yID0gXywgc2NhbGUpIDogaW50ZXJwb2xhdG9yO1xuICB9O1xuXG4gIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2VxdWVudGlhbChpbnRlcnBvbGF0b3IpLmRvbWFpbihbeDAsIHgxXSkuY2xhbXAoY2xhbXApO1xuICB9O1xuXG4gIHJldHVybiBsaW5lYXJpc2goc2NhbGUpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3BlY2lmaWVyKSB7XG4gIHZhciBuID0gc3BlY2lmaWVyLmxlbmd0aCAvIDYgfCAwLCBjb2xvcnMgPSBuZXcgQXJyYXkobiksIGkgPSAwO1xuICB3aGlsZSAoaSA8IG4pIGNvbG9yc1tpXSA9IFwiI1wiICsgc3BlY2lmaWVyLnNsaWNlKGkgKiA2LCArK2kgKiA2KTtcbiAgcmV0dXJuIGNvbG9ycztcbn1cbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjb2xvcnMoXCIxZjc3YjRmZjdmMGUyY2EwMmNkNjI3Mjg5NDY3YmQ4YzU2NGJlMzc3YzI3ZjdmN2ZiY2JkMjIxN2JlY2ZcIik7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY29sb3JzKFwiN2ZjOTdmYmVhZWQ0ZmRjMDg2ZmZmZjk5Mzg2Y2IwZjAwMjdmYmY1YjE3NjY2NjY2XCIpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNvbG9ycyhcIjFiOWU3N2Q5NWYwMjc1NzBiM2U3Mjk4YTY2YTYxZWU2YWIwMmE2NzYxZDY2NjY2NlwiKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjb2xvcnMoXCJhNmNlZTMxZjc4YjRiMmRmOGEzM2EwMmNmYjlhOTllMzFhMWNmZGJmNmZmZjdmMDBjYWIyZDY2YTNkOWFmZmZmOTliMTU5MjhcIik7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY29sb3JzKFwiZmJiNGFlYjNjZGUzY2NlYmM1ZGVjYmU0ZmVkOWE2ZmZmZmNjZTVkOGJkZmRkYWVjZjJmMmYyXCIpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNvbG9ycyhcImIzZTJjZGZkY2RhY2NiZDVlOGY0Y2FlNGU2ZjVjOWZmZjJhZWYxZTJjY2NjY2NjY1wiKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjb2xvcnMoXCJlNDFhMWMzNzdlYjg0ZGFmNGE5ODRlYTNmZjdmMDBmZmZmMzNhNjU2MjhmNzgxYmY5OTk5OTlcIik7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY29sb3JzKFwiNjZjMmE1ZmM4ZDYyOGRhMGNiZTc4YWMzYTZkODU0ZmZkOTJmZTVjNDk0YjNiM2IzXCIpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNvbG9ycyhcIjhkZDNjN2ZmZmZiM2JlYmFkYWZiODA3MjgwYjFkM2ZkYjQ2MmIzZGU2OWZjY2RlNWQ5ZDlkOWJjODBiZGNjZWJjNWZmZWQ2ZlwiKTtcbiIsImltcG9ydCB7aW50ZXJwb2xhdGVSZ2JCYXNpc30gZnJvbSBcImQzLWludGVycG9sYXRlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNjaGVtZSkge1xuICByZXR1cm4gaW50ZXJwb2xhdGVSZ2JCYXNpcyhzY2hlbWVbc2NoZW1lLmxlbmd0aCAtIDFdKTtcbn1cbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImQ4YjM2NWY1ZjVmNTVhYjRhY1wiLFxuICBcImE2NjExYWRmYzI3ZDgwY2RjMTAxODU3MVwiLFxuICBcImE2NjExYWRmYzI3ZGY1ZjVmNTgwY2RjMTAxODU3MVwiLFxuICBcIjhjNTEwYWQ4YjM2NWY2ZThjM2M3ZWFlNTVhYjRhYzAxNjY1ZVwiLFxuICBcIjhjNTEwYWQ4YjM2NWY2ZThjM2Y1ZjVmNWM3ZWFlNTVhYjRhYzAxNjY1ZVwiLFxuICBcIjhjNTEwYWJmODEyZGRmYzI3ZGY2ZThjM2M3ZWFlNTgwY2RjMTM1OTc4ZjAxNjY1ZVwiLFxuICBcIjhjNTEwYWJmODEyZGRmYzI3ZGY2ZThjM2Y1ZjVmNWM3ZWFlNTgwY2RjMTM1OTc4ZjAxNjY1ZVwiLFxuICBcIjU0MzAwNThjNTEwYWJmODEyZGRmYzI3ZGY2ZThjM2M3ZWFlNTgwY2RjMTM1OTc4ZjAxNjY1ZTAwM2MzMFwiLFxuICBcIjU0MzAwNThjNTEwYWJmODEyZGRmYzI3ZGY2ZThjM2Y1ZjVmNWM3ZWFlNTgwY2RjMTM1OTc4ZjAxNjY1ZTAwM2MzMFwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJhZjhkYzNmN2Y3Zjc3ZmJmN2JcIixcbiAgXCI3YjMyOTRjMmE1Y2ZhNmRiYTAwMDg4MzdcIixcbiAgXCI3YjMyOTRjMmE1Y2ZmN2Y3ZjdhNmRiYTAwMDg4MzdcIixcbiAgXCI3NjJhODNhZjhkYzNlN2Q0ZThkOWYwZDM3ZmJmN2IxYjc4MzdcIixcbiAgXCI3NjJhODNhZjhkYzNlN2Q0ZThmN2Y3ZjdkOWYwZDM3ZmJmN2IxYjc4MzdcIixcbiAgXCI3NjJhODM5OTcwYWJjMmE1Y2ZlN2Q0ZThkOWYwZDNhNmRiYTA1YWFlNjExYjc4MzdcIixcbiAgXCI3NjJhODM5OTcwYWJjMmE1Y2ZlN2Q0ZThmN2Y3ZjdkOWYwZDNhNmRiYTA1YWFlNjExYjc4MzdcIixcbiAgXCI0MDAwNGI3NjJhODM5OTcwYWJjMmE1Y2ZlN2Q0ZThkOWYwZDNhNmRiYTA1YWFlNjExYjc4MzcwMDQ0MWJcIixcbiAgXCI0MDAwNGI3NjJhODM5OTcwYWJjMmE1Y2ZlN2Q0ZThmN2Y3ZjdkOWYwZDNhNmRiYTA1YWFlNjExYjc4MzcwMDQ0MWJcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZTlhM2M5ZjdmN2Y3YTFkNzZhXCIsXG4gIFwiZDAxYzhiZjFiNmRhYjhlMTg2NGRhYzI2XCIsXG4gIFwiZDAxYzhiZjFiNmRhZjdmN2Y3YjhlMTg2NGRhYzI2XCIsXG4gIFwiYzUxYjdkZTlhM2M5ZmRlMGVmZTZmNWQwYTFkNzZhNGQ5MjIxXCIsXG4gIFwiYzUxYjdkZTlhM2M5ZmRlMGVmZjdmN2Y3ZTZmNWQwYTFkNzZhNGQ5MjIxXCIsXG4gIFwiYzUxYjdkZGU3N2FlZjFiNmRhZmRlMGVmZTZmNWQwYjhlMTg2N2ZiYzQxNGQ5MjIxXCIsXG4gIFwiYzUxYjdkZGU3N2FlZjFiNmRhZmRlMGVmZjdmN2Y3ZTZmNWQwYjhlMTg2N2ZiYzQxNGQ5MjIxXCIsXG4gIFwiOGUwMTUyYzUxYjdkZGU3N2FlZjFiNmRhZmRlMGVmZTZmNWQwYjhlMTg2N2ZiYzQxNGQ5MjIxMjc2NDE5XCIsXG4gIFwiOGUwMTUyYzUxYjdkZGU3N2FlZjFiNmRhZmRlMGVmZjdmN2Y3ZTZmNWQwYjhlMTg2N2ZiYzQxNGQ5MjIxMjc2NDE5XCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcIjk5OGVjM2Y3ZjdmN2YxYTM0MFwiLFxuICBcIjVlM2M5OWIyYWJkMmZkYjg2M2U2NjEwMVwiLFxuICBcIjVlM2M5OWIyYWJkMmY3ZjdmN2ZkYjg2M2U2NjEwMVwiLFxuICBcIjU0Mjc4ODk5OGVjM2Q4ZGFlYmZlZTBiNmYxYTM0MGIzNTgwNlwiLFxuICBcIjU0Mjc4ODk5OGVjM2Q4ZGFlYmY3ZjdmN2ZlZTBiNmYxYTM0MGIzNTgwNlwiLFxuICBcIjU0Mjc4ODgwNzNhY2IyYWJkMmQ4ZGFlYmZlZTBiNmZkYjg2M2UwODIxNGIzNTgwNlwiLFxuICBcIjU0Mjc4ODgwNzNhY2IyYWJkMmQ4ZGFlYmY3ZjdmN2ZlZTBiNmZkYjg2M2UwODIxNGIzNTgwNlwiLFxuICBcIjJkMDA0YjU0Mjc4ODgwNzNhY2IyYWJkMmQ4ZGFlYmZlZTBiNmZkYjg2M2UwODIxNGIzNTgwNjdmM2IwOFwiLFxuICBcIjJkMDA0YjU0Mjc4ODgwNzNhY2IyYWJkMmQ4ZGFlYmY3ZjdmN2ZlZTBiNmZkYjg2M2UwODIxNGIzNTgwNjdmM2IwOFwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJlZjhhNjJmN2Y3Zjc2N2E5Y2ZcIixcbiAgXCJjYTAwMjBmNGE1ODI5MmM1ZGUwNTcxYjBcIixcbiAgXCJjYTAwMjBmNGE1ODJmN2Y3Zjc5MmM1ZGUwNTcxYjBcIixcbiAgXCJiMjE4MmJlZjhhNjJmZGRiYzdkMWU1ZjA2N2E5Y2YyMTY2YWNcIixcbiAgXCJiMjE4MmJlZjhhNjJmZGRiYzdmN2Y3ZjdkMWU1ZjA2N2E5Y2YyMTY2YWNcIixcbiAgXCJiMjE4MmJkNjYwNGRmNGE1ODJmZGRiYzdkMWU1ZjA5MmM1ZGU0MzkzYzMyMTY2YWNcIixcbiAgXCJiMjE4MmJkNjYwNGRmNGE1ODJmZGRiYzdmN2Y3ZjdkMWU1ZjA5MmM1ZGU0MzkzYzMyMTY2YWNcIixcbiAgXCI2NzAwMWZiMjE4MmJkNjYwNGRmNGE1ODJmZGRiYzdkMWU1ZjA5MmM1ZGU0MzkzYzMyMTY2YWMwNTMwNjFcIixcbiAgXCI2NzAwMWZiMjE4MmJkNjYwNGRmNGE1ODJmZGRiYzdmN2Y3ZjdkMWU1ZjA5MmM1ZGU0MzkzYzMyMTY2YWMwNTMwNjFcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZWY4YTYyZmZmZmZmOTk5OTk5XCIsXG4gIFwiY2EwMDIwZjRhNTgyYmFiYWJhNDA0MDQwXCIsXG4gIFwiY2EwMDIwZjRhNTgyZmZmZmZmYmFiYWJhNDA0MDQwXCIsXG4gIFwiYjIxODJiZWY4YTYyZmRkYmM3ZTBlMGUwOTk5OTk5NGQ0ZDRkXCIsXG4gIFwiYjIxODJiZWY4YTYyZmRkYmM3ZmZmZmZmZTBlMGUwOTk5OTk5NGQ0ZDRkXCIsXG4gIFwiYjIxODJiZDY2MDRkZjRhNTgyZmRkYmM3ZTBlMGUwYmFiYWJhODc4Nzg3NGQ0ZDRkXCIsXG4gIFwiYjIxODJiZDY2MDRkZjRhNTgyZmRkYmM3ZmZmZmZmZTBlMGUwYmFiYWJhODc4Nzg3NGQ0ZDRkXCIsXG4gIFwiNjcwMDFmYjIxODJiZDY2MDRkZjRhNTgyZmRkYmM3ZTBlMGUwYmFiYWJhODc4Nzg3NGQ0ZDRkMWExYTFhXCIsXG4gIFwiNjcwMDFmYjIxODJiZDY2MDRkZjRhNTgyZmRkYmM3ZmZmZmZmZTBlMGUwYmFiYWJhODc4Nzg3NGQ0ZDRkMWExYTFhXCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImZjOGQ1OWZmZmZiZjkxYmZkYlwiLFxuICBcImQ3MTkxY2ZkYWU2MWFiZDllOTJjN2JiNlwiLFxuICBcImQ3MTkxY2ZkYWU2MWZmZmZiZmFiZDllOTJjN2JiNlwiLFxuICBcImQ3MzAyN2ZjOGQ1OWZlZTA5MGUwZjNmODkxYmZkYjQ1NzViNFwiLFxuICBcImQ3MzAyN2ZjOGQ1OWZlZTA5MGZmZmZiZmUwZjNmODkxYmZkYjQ1NzViNFwiLFxuICBcImQ3MzAyN2Y0NmQ0M2ZkYWU2MWZlZTA5MGUwZjNmOGFiZDllOTc0YWRkMTQ1NzViNFwiLFxuICBcImQ3MzAyN2Y0NmQ0M2ZkYWU2MWZlZTA5MGZmZmZiZmUwZjNmOGFiZDllOTc0YWRkMTQ1NzViNFwiLFxuICBcImE1MDAyNmQ3MzAyN2Y0NmQ0M2ZkYWU2MWZlZTA5MGUwZjNmOGFiZDllOTc0YWRkMTQ1NzViNDMxMzY5NVwiLFxuICBcImE1MDAyNmQ3MzAyN2Y0NmQ0M2ZkYWU2MWZlZTA5MGZmZmZiZmUwZjNmOGFiZDllOTc0YWRkMTQ1NzViNDMxMzY5NVwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJmYzhkNTlmZmZmYmY5MWNmNjBcIixcbiAgXCJkNzE5MWNmZGFlNjFhNmQ5NmExYTk2NDFcIixcbiAgXCJkNzE5MWNmZGFlNjFmZmZmYmZhNmQ5NmExYTk2NDFcIixcbiAgXCJkNzMwMjdmYzhkNTlmZWUwOGJkOWVmOGI5MWNmNjAxYTk4NTBcIixcbiAgXCJkNzMwMjdmYzhkNTlmZWUwOGJmZmZmYmZkOWVmOGI5MWNmNjAxYTk4NTBcIixcbiAgXCJkNzMwMjdmNDZkNDNmZGFlNjFmZWUwOGJkOWVmOGJhNmQ5NmE2NmJkNjMxYTk4NTBcIixcbiAgXCJkNzMwMjdmNDZkNDNmZGFlNjFmZWUwOGJmZmZmYmZkOWVmOGJhNmQ5NmE2NmJkNjMxYTk4NTBcIixcbiAgXCJhNTAwMjZkNzMwMjdmNDZkNDNmZGFlNjFmZWUwOGJkOWVmOGJhNmQ5NmE2NmJkNjMxYTk4NTAwMDY4MzdcIixcbiAgXCJhNTAwMjZkNzMwMjdmNDZkNDNmZGFlNjFmZWUwOGJmZmZmYmZkOWVmOGJhNmQ5NmE2NmJkNjMxYTk4NTAwMDY4MzdcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZmM4ZDU5ZmZmZmJmOTlkNTk0XCIsXG4gIFwiZDcxOTFjZmRhZTYxYWJkZGE0MmI4M2JhXCIsXG4gIFwiZDcxOTFjZmRhZTYxZmZmZmJmYWJkZGE0MmI4M2JhXCIsXG4gIFwiZDUzZTRmZmM4ZDU5ZmVlMDhiZTZmNTk4OTlkNTk0MzI4OGJkXCIsXG4gIFwiZDUzZTRmZmM4ZDU5ZmVlMDhiZmZmZmJmZTZmNTk4OTlkNTk0MzI4OGJkXCIsXG4gIFwiZDUzZTRmZjQ2ZDQzZmRhZTYxZmVlMDhiZTZmNTk4YWJkZGE0NjZjMmE1MzI4OGJkXCIsXG4gIFwiZDUzZTRmZjQ2ZDQzZmRhZTYxZmVlMDhiZmZmZmJmZTZmNTk4YWJkZGE0NjZjMmE1MzI4OGJkXCIsXG4gIFwiOWUwMTQyZDUzZTRmZjQ2ZDQzZmRhZTYxZmVlMDhiZTZmNTk4YWJkZGE0NjZjMmE1MzI4OGJkNWU0ZmEyXCIsXG4gIFwiOWUwMTQyZDUzZTRmZjQ2ZDQzZmRhZTYxZmVlMDhiZmZmZmJmZTZmNTk4YWJkZGE0NjZjMmE1MzI4OGJkNWU0ZmEyXCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImU1ZjVmOTk5ZDhjOTJjYTI1ZlwiLFxuICBcImVkZjhmYmIyZTJlMjY2YzJhNDIzOGI0NVwiLFxuICBcImVkZjhmYmIyZTJlMjY2YzJhNDJjYTI1ZjAwNmQyY1wiLFxuICBcImVkZjhmYmNjZWNlNjk5ZDhjOTY2YzJhNDJjYTI1ZjAwNmQyY1wiLFxuICBcImVkZjhmYmNjZWNlNjk5ZDhjOTY2YzJhNDQxYWU3NjIzOGI0NTAwNTgyNFwiLFxuICBcImY3ZmNmZGU1ZjVmOWNjZWNlNjk5ZDhjOTY2YzJhNDQxYWU3NjIzOGI0NTAwNTgyNFwiLFxuICBcImY3ZmNmZGU1ZjVmOWNjZWNlNjk5ZDhjOTY2YzJhNDQxYWU3NjIzOGI0NTAwNmQyYzAwNDQxYlwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJlMGVjZjQ5ZWJjZGE4ODU2YTdcIixcbiAgXCJlZGY4ZmJiM2NkZTM4Yzk2YzY4ODQxOWRcIixcbiAgXCJlZGY4ZmJiM2NkZTM4Yzk2YzY4ODU2YTc4MTBmN2NcIixcbiAgXCJlZGY4ZmJiZmQzZTY5ZWJjZGE4Yzk2YzY4ODU2YTc4MTBmN2NcIixcbiAgXCJlZGY4ZmJiZmQzZTY5ZWJjZGE4Yzk2YzY4YzZiYjE4ODQxOWQ2ZTAxNmJcIixcbiAgXCJmN2ZjZmRlMGVjZjRiZmQzZTY5ZWJjZGE4Yzk2YzY4YzZiYjE4ODQxOWQ2ZTAxNmJcIixcbiAgXCJmN2ZjZmRlMGVjZjRiZmQzZTY5ZWJjZGE4Yzk2YzY4YzZiYjE4ODQxOWQ4MTBmN2M0ZDAwNGJcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZTBmM2RiYThkZGI1NDNhMmNhXCIsXG4gIFwiZjBmOWU4YmFlNGJjN2JjY2M0MmI4Y2JlXCIsXG4gIFwiZjBmOWU4YmFlNGJjN2JjY2M0NDNhMmNhMDg2OGFjXCIsXG4gIFwiZjBmOWU4Y2NlYmM1YThkZGI1N2JjY2M0NDNhMmNhMDg2OGFjXCIsXG4gIFwiZjBmOWU4Y2NlYmM1YThkZGI1N2JjY2M0NGViM2QzMmI4Y2JlMDg1ODllXCIsXG4gIFwiZjdmY2YwZTBmM2RiY2NlYmM1YThkZGI1N2JjY2M0NGViM2QzMmI4Y2JlMDg1ODllXCIsXG4gIFwiZjdmY2YwZTBmM2RiY2NlYmM1YThkZGI1N2JjY2M0NGViM2QzMmI4Y2JlMDg2OGFjMDg0MDgxXCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImZlZThjOGZkYmI4NGUzNGEzM1wiLFxuICBcImZlZjBkOWZkY2M4YWZjOGQ1OWQ3MzAxZlwiLFxuICBcImZlZjBkOWZkY2M4YWZjOGQ1OWUzNGEzM2IzMDAwMFwiLFxuICBcImZlZjBkOWZkZDQ5ZWZkYmI4NGZjOGQ1OWUzNGEzM2IzMDAwMFwiLFxuICBcImZlZjBkOWZkZDQ5ZWZkYmI4NGZjOGQ1OWVmNjU0OGQ3MzAxZjk5MDAwMFwiLFxuICBcImZmZjdlY2ZlZThjOGZkZDQ5ZWZkYmI4NGZjOGQ1OWVmNjU0OGQ3MzAxZjk5MDAwMFwiLFxuICBcImZmZjdlY2ZlZThjOGZkZDQ5ZWZkYmI4NGZjOGQ1OWVmNjU0OGQ3MzAxZmIzMDAwMDdmMDAwMFwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJlY2UyZjBhNmJkZGIxYzkwOTlcIixcbiAgXCJmNmVmZjdiZGM5ZTE2N2E5Y2YwMjgxOGFcIixcbiAgXCJmNmVmZjdiZGM5ZTE2N2E5Y2YxYzkwOTkwMTZjNTlcIixcbiAgXCJmNmVmZjdkMGQxZTZhNmJkZGI2N2E5Y2YxYzkwOTkwMTZjNTlcIixcbiAgXCJmNmVmZjdkMGQxZTZhNmJkZGI2N2E5Y2YzNjkwYzAwMjgxOGEwMTY0NTBcIixcbiAgXCJmZmY3ZmJlY2UyZjBkMGQxZTZhNmJkZGI2N2E5Y2YzNjkwYzAwMjgxOGEwMTY0NTBcIixcbiAgXCJmZmY3ZmJlY2UyZjBkMGQxZTZhNmJkZGI2N2E5Y2YzNjkwYzAwMjgxOGEwMTZjNTkwMTQ2MzZcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZWNlN2YyYTZiZGRiMmI4Y2JlXCIsXG4gIFwiZjFlZWY2YmRjOWUxNzRhOWNmMDU3MGIwXCIsXG4gIFwiZjFlZWY2YmRjOWUxNzRhOWNmMmI4Y2JlMDQ1YThkXCIsXG4gIFwiZjFlZWY2ZDBkMWU2YTZiZGRiNzRhOWNmMmI4Y2JlMDQ1YThkXCIsXG4gIFwiZjFlZWY2ZDBkMWU2YTZiZGRiNzRhOWNmMzY5MGMwMDU3MGIwMDM0ZTdiXCIsXG4gIFwiZmZmN2ZiZWNlN2YyZDBkMWU2YTZiZGRiNzRhOWNmMzY5MGMwMDU3MGIwMDM0ZTdiXCIsXG4gIFwiZmZmN2ZiZWNlN2YyZDBkMWU2YTZiZGRiNzRhOWNmMzY5MGMwMDU3MGIwMDQ1YThkMDIzODU4XCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImU3ZTFlZmM5OTRjN2RkMWM3N1wiLFxuICBcImYxZWVmNmQ3YjVkOGRmNjViMGNlMTI1NlwiLFxuICBcImYxZWVmNmQ3YjVkOGRmNjViMGRkMWM3Nzk4MDA0M1wiLFxuICBcImYxZWVmNmQ0YjlkYWM5OTRjN2RmNjViMGRkMWM3Nzk4MDA0M1wiLFxuICBcImYxZWVmNmQ0YjlkYWM5OTRjN2RmNjViMGU3Mjk4YWNlMTI1NjkxMDAzZlwiLFxuICBcImY3ZjRmOWU3ZTFlZmQ0YjlkYWM5OTRjN2RmNjViMGU3Mjk4YWNlMTI1NjkxMDAzZlwiLFxuICBcImY3ZjRmOWU3ZTFlZmQ0YjlkYWM5OTRjN2RmNjViMGU3Mjk4YWNlMTI1Njk4MDA0MzY3MDAxZlwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJmZGUwZGRmYTlmYjVjNTFiOGFcIixcbiAgXCJmZWViZTJmYmI0YjlmNzY4YTFhZTAxN2VcIixcbiAgXCJmZWViZTJmYmI0YjlmNzY4YTFjNTFiOGE3YTAxNzdcIixcbiAgXCJmZWViZTJmY2M1YzBmYTlmYjVmNzY4YTFjNTFiOGE3YTAxNzdcIixcbiAgXCJmZWViZTJmY2M1YzBmYTlmYjVmNzY4YTFkZDM0OTdhZTAxN2U3YTAxNzdcIixcbiAgXCJmZmY3ZjNmZGUwZGRmY2M1YzBmYTlmYjVmNzY4YTFkZDM0OTdhZTAxN2U3YTAxNzdcIixcbiAgXCJmZmY3ZjNmZGUwZGRmY2M1YzBmYTlmYjVmNzY4YTFkZDM0OTdhZTAxN2U3YTAxNzc0OTAwNmFcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZWRmOGIxN2ZjZGJiMmM3ZmI4XCIsXG4gIFwiZmZmZmNjYTFkYWI0NDFiNmM0MjI1ZWE4XCIsXG4gIFwiZmZmZmNjYTFkYWI0NDFiNmM0MmM3ZmI4MjUzNDk0XCIsXG4gIFwiZmZmZmNjYzdlOWI0N2ZjZGJiNDFiNmM0MmM3ZmI4MjUzNDk0XCIsXG4gIFwiZmZmZmNjYzdlOWI0N2ZjZGJiNDFiNmM0MWQ5MWMwMjI1ZWE4MGMyYzg0XCIsXG4gIFwiZmZmZmQ5ZWRmOGIxYzdlOWI0N2ZjZGJiNDFiNmM0MWQ5MWMwMjI1ZWE4MGMyYzg0XCIsXG4gIFwiZmZmZmQ5ZWRmOGIxYzdlOWI0N2ZjZGJiNDFiNmM0MWQ5MWMwMjI1ZWE4MjUzNDk0MDgxZDU4XCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImY3ZmNiOWFkZGQ4ZTMxYTM1NFwiLFxuICBcImZmZmZjY2MyZTY5OTc4YzY3OTIzODQ0M1wiLFxuICBcImZmZmZjY2MyZTY5OTc4YzY3OTMxYTM1NDAwNjgzN1wiLFxuICBcImZmZmZjY2Q5ZjBhM2FkZGQ4ZTc4YzY3OTMxYTM1NDAwNjgzN1wiLFxuICBcImZmZmZjY2Q5ZjBhM2FkZGQ4ZTc4YzY3OTQxYWI1ZDIzODQ0MzAwNWEzMlwiLFxuICBcImZmZmZlNWY3ZmNiOWQ5ZjBhM2FkZGQ4ZTc4YzY3OTQxYWI1ZDIzODQ0MzAwNWEzMlwiLFxuICBcImZmZmZlNWY3ZmNiOWQ5ZjBhM2FkZGQ4ZTc4YzY3OTQxYWI1ZDIzODQ0MzAwNjgzNzAwNDUyOVwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJmZmY3YmNmZWM0NGZkOTVmMGVcIixcbiAgXCJmZmZmZDRmZWQ5OGVmZTk5MjljYzRjMDJcIixcbiAgXCJmZmZmZDRmZWQ5OGVmZTk5MjlkOTVmMGU5OTM0MDRcIixcbiAgXCJmZmZmZDRmZWUzOTFmZWM0NGZmZTk5MjlkOTVmMGU5OTM0MDRcIixcbiAgXCJmZmZmZDRmZWUzOTFmZWM0NGZmZTk5MjllYzcwMTRjYzRjMDI4YzJkMDRcIixcbiAgXCJmZmZmZTVmZmY3YmNmZWUzOTFmZWM0NGZmZTk5MjllYzcwMTRjYzRjMDI4YzJkMDRcIixcbiAgXCJmZmZmZTVmZmY3YmNmZWUzOTFmZWM0NGZmZTk5MjllYzcwMTRjYzRjMDI5OTM0MDQ2NjI1MDZcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZmZlZGEwZmViMjRjZjAzYjIwXCIsXG4gIFwiZmZmZmIyZmVjYzVjZmQ4ZDNjZTMxYTFjXCIsXG4gIFwiZmZmZmIyZmVjYzVjZmQ4ZDNjZjAzYjIwYmQwMDI2XCIsXG4gIFwiZmZmZmIyZmVkOTc2ZmViMjRjZmQ4ZDNjZjAzYjIwYmQwMDI2XCIsXG4gIFwiZmZmZmIyZmVkOTc2ZmViMjRjZmQ4ZDNjZmM0ZTJhZTMxYTFjYjEwMDI2XCIsXG4gIFwiZmZmZmNjZmZlZGEwZmVkOTc2ZmViMjRjZmQ4ZDNjZmM0ZTJhZTMxYTFjYjEwMDI2XCIsXG4gIFwiZmZmZmNjZmZlZGEwZmVkOTc2ZmViMjRjZmQ4ZDNjZmM0ZTJhZTMxYTFjYmQwMDI2ODAwMDI2XCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImRlZWJmNzllY2FlMTMxODJiZFwiLFxuICBcImVmZjNmZmJkZDdlNzZiYWVkNjIxNzFiNVwiLFxuICBcImVmZjNmZmJkZDdlNzZiYWVkNjMxODJiZDA4NTE5Y1wiLFxuICBcImVmZjNmZmM2ZGJlZjllY2FlMTZiYWVkNjMxODJiZDA4NTE5Y1wiLFxuICBcImVmZjNmZmM2ZGJlZjllY2FlMTZiYWVkNjQyOTJjNjIxNzFiNTA4NDU5NFwiLFxuICBcImY3ZmJmZmRlZWJmN2M2ZGJlZjllY2FlMTZiYWVkNjQyOTJjNjIxNzFiNTA4NDU5NFwiLFxuICBcImY3ZmJmZmRlZWJmN2M2ZGJlZjllY2FlMTZiYWVkNjQyOTJjNjIxNzFiNTA4NTE5YzA4MzA2YlwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJlNWY1ZTBhMWQ5OWIzMWEzNTRcIixcbiAgXCJlZGY4ZTliYWU0YjM3NGM0NzYyMzhiNDVcIixcbiAgXCJlZGY4ZTliYWU0YjM3NGM0NzYzMWEzNTQwMDZkMmNcIixcbiAgXCJlZGY4ZTljN2U5YzBhMWQ5OWI3NGM0NzYzMWEzNTQwMDZkMmNcIixcbiAgXCJlZGY4ZTljN2U5YzBhMWQ5OWI3NGM0NzY0MWFiNWQyMzhiNDUwMDVhMzJcIixcbiAgXCJmN2ZjZjVlNWY1ZTBjN2U5YzBhMWQ5OWI3NGM0NzY0MWFiNWQyMzhiNDUwMDVhMzJcIixcbiAgXCJmN2ZjZjVlNWY1ZTBjN2U5YzBhMWQ5OWI3NGM0NzY0MWFiNWQyMzhiNDUwMDZkMmMwMDQ0MWJcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZjBmMGYwYmRiZGJkNjM2MzYzXCIsXG4gIFwiZjdmN2Y3Y2NjY2NjOTY5Njk2NTI1MjUyXCIsXG4gIFwiZjdmN2Y3Y2NjY2NjOTY5Njk2NjM2MzYzMjUyNTI1XCIsXG4gIFwiZjdmN2Y3ZDlkOWQ5YmRiZGJkOTY5Njk2NjM2MzYzMjUyNTI1XCIsXG4gIFwiZjdmN2Y3ZDlkOWQ5YmRiZGJkOTY5Njk2NzM3MzczNTI1MjUyMjUyNTI1XCIsXG4gIFwiZmZmZmZmZjBmMGYwZDlkOWQ5YmRiZGJkOTY5Njk2NzM3MzczNTI1MjUyMjUyNTI1XCIsXG4gIFwiZmZmZmZmZjBmMGYwZDlkOWQ5YmRiZGJkOTY5Njk2NzM3MzczNTI1MjUyMjUyNTI1MDAwMDAwXCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImVmZWRmNWJjYmRkYzc1NmJiMVwiLFxuICBcImYyZjBmN2NiYzllMjllOWFjODZhNTFhM1wiLFxuICBcImYyZjBmN2NiYzllMjllOWFjODc1NmJiMTU0Mjc4ZlwiLFxuICBcImYyZjBmN2RhZGFlYmJjYmRkYzllOWFjODc1NmJiMTU0Mjc4ZlwiLFxuICBcImYyZjBmN2RhZGFlYmJjYmRkYzllOWFjODgwN2RiYTZhNTFhMzRhMTQ4NlwiLFxuICBcImZjZmJmZGVmZWRmNWRhZGFlYmJjYmRkYzllOWFjODgwN2RiYTZhNTFhMzRhMTQ4NlwiLFxuICBcImZjZmJmZGVmZWRmNWRhZGFlYmJjYmRkYzllOWFjODgwN2RiYTZhNTFhMzU0Mjc4ZjNmMDA3ZFwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJmZWUwZDJmYzkyNzJkZTJkMjZcIixcbiAgXCJmZWU1ZDlmY2FlOTFmYjZhNGFjYjE4MWRcIixcbiAgXCJmZWU1ZDlmY2FlOTFmYjZhNGFkZTJkMjZhNTBmMTVcIixcbiAgXCJmZWU1ZDlmY2JiYTFmYzkyNzJmYjZhNGFkZTJkMjZhNTBmMTVcIixcbiAgXCJmZWU1ZDlmY2JiYTFmYzkyNzJmYjZhNGFlZjNiMmNjYjE4MWQ5OTAwMGRcIixcbiAgXCJmZmY1ZjBmZWUwZDJmY2JiYTFmYzkyNzJmYjZhNGFlZjNiMmNjYjE4MWQ5OTAwMGRcIixcbiAgXCJmZmY1ZjBmZWUwZDJmY2JiYTFmYzkyNzJmYjZhNGFlZjNiMmNjYjE4MWRhNTBmMTU2NzAwMGRcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZmVlNmNlZmRhZTZiZTY1NTBkXCIsXG4gIFwiZmVlZGRlZmRiZTg1ZmQ4ZDNjZDk0NzAxXCIsXG4gIFwiZmVlZGRlZmRiZTg1ZmQ4ZDNjZTY1NTBkYTYzNjAzXCIsXG4gIFwiZmVlZGRlZmRkMGEyZmRhZTZiZmQ4ZDNjZTY1NTBkYTYzNjAzXCIsXG4gIFwiZmVlZGRlZmRkMGEyZmRhZTZiZmQ4ZDNjZjE2OTEzZDk0ODAxOGMyZDA0XCIsXG4gIFwiZmZmNWViZmVlNmNlZmRkMGEyZmRhZTZiZmQ4ZDNjZjE2OTEzZDk0ODAxOGMyZDA0XCIsXG4gIFwiZmZmNWViZmVlNmNlZmRkMGEyZmRhZTZiZmQ4ZDNjZjE2OTEzZDk0ODAxYTYzNjAzN2YyNzA0XCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCB7Y3ViZWhlbGl4fSBmcm9tIFwiZDMtY29sb3JcIjtcbmltcG9ydCB7aW50ZXJwb2xhdGVDdWJlaGVsaXhMb25nfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgaW50ZXJwb2xhdGVDdWJlaGVsaXhMb25nKGN1YmVoZWxpeCgzMDAsIDAuNSwgMC4wKSwgY3ViZWhlbGl4KC0yNDAsIDAuNSwgMS4wKSk7XG4iLCJpbXBvcnQge2N1YmVoZWxpeH0gZnJvbSBcImQzLWNvbG9yXCI7XG5pbXBvcnQge2ludGVycG9sYXRlQ3ViZWhlbGl4TG9uZ30gZnJvbSBcImQzLWludGVycG9sYXRlXCI7XG5cbmV4cG9ydCB2YXIgd2FybSA9IGludGVycG9sYXRlQ3ViZWhlbGl4TG9uZyhjdWJlaGVsaXgoLTEwMCwgMC43NSwgMC4zNSksIGN1YmVoZWxpeCg4MCwgMS41MCwgMC44KSk7XG5cbmV4cG9ydCB2YXIgY29vbCA9IGludGVycG9sYXRlQ3ViZWhlbGl4TG9uZyhjdWJlaGVsaXgoMjYwLCAwLjc1LCAwLjM1KSwgY3ViZWhlbGl4KDgwLCAxLjUwLCAwLjgpKTtcblxudmFyIHJhaW5ib3cgPSBjdWJlaGVsaXgoKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odCkge1xuICBpZiAodCA8IDAgfHwgdCA+IDEpIHQgLT0gTWF0aC5mbG9vcih0KTtcbiAgdmFyIHRzID0gTWF0aC5hYnModCAtIDAuNSk7XG4gIHJhaW5ib3cuaCA9IDM2MCAqIHQgLSAxMDA7XG4gIHJhaW5ib3cucyA9IDEuNSAtIDEuNSAqIHRzO1xuICByYWluYm93LmwgPSAwLjggLSAwLjkgKiB0cztcbiAgcmV0dXJuIHJhaW5ib3cgKyBcIlwiO1xufVxuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5cbmZ1bmN0aW9uIHJhbXAocmFuZ2UpIHtcbiAgdmFyIG4gPSByYW5nZS5sZW5ndGg7XG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIHJhbmdlW01hdGgubWF4KDAsIE1hdGgubWluKG4gLSAxLCBNYXRoLmZsb29yKHQgKiBuKSkpXTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgcmFtcChjb2xvcnMoXCI0NDAxNTQ0NDAyNTY0NTA0NTc0NTA1NTk0NjA3NWE0NjA4NWM0NjBhNWQ0NjBiNWU0NzBkNjA0NzBlNjE0NzEwNjM0NzExNjQ0NzEzNjU0ODE0Njc0ODE2Njg0ODE3Njk0ODE4NmE0ODFhNmM0ODFiNmQ0ODFjNmU0ODFkNmY0ODFmNzA0ODIwNzE0ODIxNzM0ODIzNzQ0ODI0NzU0ODI1NzY0ODI2Nzc0ODI4Nzg0ODI5Nzk0NzJhN2E0NzJjN2E0NzJkN2I0NzJlN2M0NzJmN2Q0NjMwN2U0NjMyN2U0NjMzN2Y0NjM0ODA0NTM1ODE0NTM3ODE0NTM4ODI0NDM5ODM0NDNhODM0NDNiODQ0MzNkODQ0MzNlODU0MjNmODU0MjQwODY0MjQxODY0MTQyODc0MTQ0ODc0MDQ1ODg0MDQ2ODgzZjQ3ODgzZjQ4ODkzZTQ5ODkzZTRhODkzZTRjOGEzZDRkOGEzZDRlOGEzYzRmOGEzYzUwOGIzYjUxOGIzYjUyOGIzYTUzOGIzYTU0OGMzOTU1OGMzOTU2OGMzODU4OGMzODU5OGMzNzVhOGMzNzViOGQzNjVjOGQzNjVkOGQzNTVlOGQzNTVmOGQzNDYwOGQzNDYxOGQzMzYyOGQzMzYzOGQzMjY0OGUzMjY1OGUzMTY2OGUzMTY3OGUzMTY4OGUzMDY5OGUzMDZhOGUyZjZiOGUyZjZjOGUyZTZkOGUyZTZlOGUyZTZmOGUyZDcwOGUyZDcxOGUyYzcxOGUyYzcyOGUyYzczOGUyYjc0OGUyYjc1OGUyYTc2OGUyYTc3OGUyYTc4OGUyOTc5OGUyOTdhOGUyOTdiOGUyODdjOGUyODdkOGUyNzdlOGUyNzdmOGUyNzgwOGUyNjgxOGUyNjgyOGUyNjgyOGUyNTgzOGUyNTg0OGUyNTg1OGUyNDg2OGUyNDg3OGUyMzg4OGUyMzg5OGUyMzhhOGQyMjhiOGQyMjhjOGQyMjhkOGQyMThlOGQyMThmOGQyMTkwOGQyMTkxOGMyMDkyOGMyMDkyOGMyMDkzOGMxZjk0OGMxZjk1OGIxZjk2OGIxZjk3OGIxZjk4OGIxZjk5OGExZjlhOGExZTliOGExZTljODkxZTlkODkxZjllODkxZjlmODgxZmEwODgxZmExODgxZmExODcxZmEyODcyMGEzODYyMGE0ODYyMWE1ODUyMWE2ODUyMmE3ODUyMmE4ODQyM2E5ODMyNGFhODMyNWFiODIyNWFjODIyNmFkODEyN2FkODEyOGFlODAyOWFmN2YyYWIwN2YyY2IxN2UyZGIyN2QyZWIzN2MyZmI0N2MzMWI1N2IzMmI2N2EzNGI2NzkzNWI3NzkzN2I4NzgzOGI5NzczYWJhNzYzYmJiNzUzZGJjNzQzZmJjNzM0MGJkNzI0MmJlNzE0NGJmNzA0NmMwNmY0OGMxNmU0YWMxNmQ0Y2MyNmM0ZWMzNmI1MGM0NmE1MmM1Njk1NGM1Njg1NmM2Njc1OGM3NjU1YWM4NjQ1Y2M4NjM1ZWM5NjI2MGNhNjA2M2NiNWY2NWNiNWU2N2NjNWM2OWNkNWI2Y2NkNWE2ZWNlNTg3MGNmNTc3M2QwNTY3NWQwNTQ3N2QxNTM3YWQxNTE3Y2QyNTA3ZmQzNGU4MWQzNGQ4NGQ0NGI4NmQ1NDk4OWQ1NDg4YmQ2NDY4ZWQ2NDU5MGQ3NDM5M2Q3NDE5NWQ4NDA5OGQ4M2U5YmQ5M2M5ZGQ5M2JhMGRhMzlhMmRhMzdhNWRiMzZhOGRiMzRhYWRjMzJhZGRjMzBiMGRkMmZiMmRkMmRiNWRlMmJiOGRlMjliYWRlMjhiZGRmMjZjMGRmMjVjMmRmMjNjNWUwMjFjOGUwMjBjYWUxMWZjZGUxMWRkMGUxMWNkMmUyMWJkNWUyMWFkOGUyMTlkYWUzMTlkZGUzMThkZmUzMThlMmU0MThlNWU0MTllN2U0MTllYWU1MWFlY2U1MWJlZmU1MWNmMWU1MWRmNGU2MWVmNmU2MjBmOGU2MjFmYmU3MjNmZGU3MjVcIikpO1xuXG5leHBvcnQgdmFyIG1hZ21hID0gcmFtcChjb2xvcnMoXCIwMDAwMDQwMTAwMDUwMTAxMDYwMTAxMDgwMjAxMDkwMjAyMGIwMjAyMGQwMzAzMGYwMzAzMTIwNDA0MTQwNTA0MTYwNjA1MTgwNjA1MWEwNzA2MWMwODA3MWUwOTA3MjAwYTA4MjIwYjA5MjQwYzA5MjYwZDBhMjkwZTBiMmIxMDBiMmQxMTBjMmYxMjBkMzExMzBkMzQxNDBlMzYxNTBlMzgxNjBmM2IxODBmM2QxOTEwM2YxYTEwNDIxYzEwNDQxZDExNDcxZTExNDkyMDExNGIyMTExNGUyMjExNTAyNDEyNTMyNTEyNTUyNzEyNTgyOTExNWEyYTExNWMyYzExNWYyZDExNjEyZjExNjMzMTExNjUzMzEwNjczNDEwNjkzNjEwNmIzODEwNmMzOTBmNmUzYjBmNzAzZDBmNzEzZjBmNzI0MDBmNzQ0MjBmNzU0NDBmNzY0NTEwNzc0NzEwNzg0OTEwNzg0YTEwNzk0YzExN2E0ZTExN2I0ZjEyN2I1MTEyN2M1MjEzN2M1NDEzN2Q1NjE0N2Q1NzE1N2U1OTE1N2U1YTE2N2U1YzE2N2Y1ZDE3N2Y1ZjE4N2Y2MDE4ODA2MjE5ODA2NDFhODA2NTFhODA2NzFiODA2ODFjODE2YTFjODE2YjFkODE2ZDFkODE2ZTFlODE3MDFmODE3MjFmODE3MzIwODE3NTIxODE3NjIxODE3ODIyODE3OTIyODI3YjIzODI3YzIzODI3ZTI0ODI4MDI1ODI4MTI1ODE4MzI2ODE4NDI2ODE4NjI3ODE4ODI3ODE4OTI4ODE4YjI5ODE4YzI5ODE4ZTJhODE5MDJhODE5MTJiODE5MzJiODA5NDJjODA5NjJjODA5ODJkODA5OTJkODA5YjJlN2Y5YzJlN2Y5ZTJmN2ZhMDJmN2ZhMTMwN2VhMzMwN2VhNTMxN2VhNjMxN2RhODMyN2RhYTMzN2RhYjMzN2NhZDM0N2NhZTM0N2JiMDM1N2JiMjM1N2JiMzM2N2FiNTM2N2FiNzM3NzliODM3NzliYTM4NzhiYzM5NzhiZDM5NzdiZjNhNzdjMDNhNzZjMjNiNzVjNDNjNzVjNTNjNzRjNzNkNzNjODNlNzNjYTNlNzJjYzNmNzFjZDQwNzFjZjQwNzBkMDQxNmZkMjQyNmZkMzQzNmVkNTQ0NmRkNjQ1NmNkODQ1NmNkOTQ2NmJkYjQ3NmFkYzQ4NjlkZTQ5NjhkZjRhNjhlMDRjNjdlMjRkNjZlMzRlNjVlNDRmNjRlNTUwNjRlNzUyNjNlODUzNjJlOTU0NjJlYTU2NjFlYjU3NjBlYzU4NjBlZDVhNWZlZTViNWVlZjVkNWVmMDVmNWVmMTYwNWRmMjYyNWRmMjY0NWNmMzY1NWNmNDY3NWNmNDY5NWNmNTZiNWNmNjZjNWNmNjZlNWNmNzcwNWNmNzcyNWNmODc0NWNmODc2NWNmOTc4NWRmOTc5NWRmOTdiNWRmYTdkNWVmYTdmNWVmYTgxNWZmYjgzNWZmYjg1NjBmYjg3NjFmYzg5NjFmYzhhNjJmYzhjNjNmYzhlNjRmYzkwNjVmZDkyNjZmZDk0NjdmZDk2NjhmZDk4NjlmZDlhNmFmZDliNmJmZTlkNmNmZTlmNmRmZWExNmVmZWEzNmZmZWE1NzFmZWE3NzJmZWE5NzNmZWFhNzRmZWFjNzZmZWFlNzdmZWIwNzhmZWIyN2FmZWI0N2JmZWI2N2NmZWI3N2VmZWI5N2ZmZWJiODFmZWJkODJmZWJmODRmZWMxODVmZWMyODdmZWM0ODhmZWM2OGFmZWM4OGNmZWNhOGRmZWNjOGZmZWNkOTBmZWNmOTJmZWQxOTRmZWQzOTVmZWQ1OTdmZWQ3OTlmZWQ4OWFmZGRhOWNmZGRjOWVmZGRlYTBmZGUwYTFmZGUyYTNmZGUzYTVmZGU1YTdmZGU3YTlmZGU5YWFmZGViYWNmY2VjYWVmY2VlYjBmY2YwYjJmY2YyYjRmY2Y0YjZmY2Y2YjhmY2Y3YjlmY2Y5YmJmY2ZiYmRmY2ZkYmZcIikpO1xuXG5leHBvcnQgdmFyIGluZmVybm8gPSByYW1wKGNvbG9ycyhcIjAwMDAwNDAxMDAwNTAxMDEwNjAxMDEwODAyMDEwYTAyMDIwYzAyMDIwZTAzMDIxMDA0MDMxMjA0MDMxNDA1MDQxNzA2MDQxOTA3MDUxYjA4MDUxZDA5MDYxZjBhMDcyMjBiMDcyNDBjMDgyNjBkMDgyOTBlMDkyYjEwMDkyZDExMGEzMDEyMGEzMjE0MGIzNDE1MGIzNzE2MGIzOTE4MGMzYzE5MGMzZTFiMGM0MTFjMGM0MzFlMGM0NTFmMGM0ODIxMGM0YTIzMGM0YzI0MGM0ZjI2MGM1MTI4MGI1MzI5MGI1NTJiMGI1NzJkMGI1OTJmMGE1YjMxMGE1YzMyMGE1ZTM0MGE1ZjM2MDk2MTM4MDk2MjM5MDk2MzNiMDk2NDNkMDk2NTNlMDk2NjQwMGE2NzQyMGE2ODQ0MGE2ODQ1MGE2OTQ3MGI2YTQ5MGI2YTRhMGM2YjRjMGM2YjRkMGQ2YzRmMGQ2YzUxMGU2YzUyMGU2ZDU0MGY2ZDU1MGY2ZDU3MTA2ZTU5MTA2ZTVhMTE2ZTVjMTI2ZTVkMTI2ZTVmMTM2ZTYxMTM2ZTYyMTQ2ZTY0MTU2ZTY1MTU2ZTY3MTY2ZTY5MTY2ZTZhMTc2ZTZjMTg2ZTZkMTg2ZTZmMTk2ZTcxMTk2ZTcyMWE2ZTc0MWE2ZTc1MWI2ZTc3MWM2ZDc4MWM2ZDdhMWQ2ZDdjMWQ2ZDdkMWU2ZDdmMWU2YzgwMWY2YzgyMjA2Yzg0MjA2Yjg1MjE2Yjg3MjE2Yjg4MjI2YThhMjI2YThjMjM2OThkMjM2OThmMjQ2OTkwMjU2ODkyMjU2ODkzMjY2Nzk1MjY2Nzk3Mjc2Njk4Mjc2NjlhMjg2NTliMjk2NDlkMjk2NDlmMmE2M2EwMmE2M2EyMmI2MmEzMmM2MWE1MmM2MGE2MmQ2MGE4MmU1ZmE5MmU1ZWFiMmY1ZWFkMzA1ZGFlMzA1Y2IwMzE1YmIxMzI1YWIzMzI1YWI0MzM1OWI2MzQ1OGI3MzU1N2I5MzU1NmJhMzY1NWJjMzc1NGJkMzg1M2JmMzk1MmMwM2E1MWMxM2E1MGMzM2I0ZmM0M2M0ZWM2M2Q0ZGM3M2U0Y2M4M2Y0YmNhNDA0YWNiNDE0OWNjNDI0OGNlNDM0N2NmNDQ0NmQwNDU0NWQyNDY0NGQzNDc0M2Q0NDg0MmQ1NGE0MWQ3NGIzZmQ4NGMzZWQ5NGQzZGRhNGUzY2RiNTAzYmRkNTEzYWRlNTIzOGRmNTMzN2UwNTUzNmUxNTYzNWUyNTczNGUzNTkzM2U0NWEzMWU1NWMzMGU2NWQyZmU3NWUyZWU4NjAyZGU5NjEyYmVhNjMyYWViNjQyOWViNjYyOGVjNjcyNmVkNjkyNWVlNmEyNGVmNmMyM2VmNmUyMWYwNmYyMGYxNzExZmYxNzMxZGYyNzQxY2YzNzYxYmYzNzgxOWY0NzkxOGY1N2IxN2Y1N2QxNWY2N2UxNGY2ODAxM2Y3ODIxMmY3ODQxMGY4ODUwZmY4ODcwZWY4ODkwY2Y5OGIwYmY5OGMwYWY5OGUwOWZhOTAwOGZhOTIwN2ZhOTQwN2ZiOTYwNmZiOTcwNmZiOTkwNmZiOWIwNmZiOWQwN2ZjOWYwN2ZjYTEwOGZjYTMwOWZjYTUwYWZjYTYwY2ZjYTgwZGZjYWEwZmZjYWMxMWZjYWUxMmZjYjAxNGZjYjIxNmZjYjQxOGZiYjYxYWZiYjgxZGZiYmExZmZiYmMyMWZiYmUyM2ZhYzAyNmZhYzIyOGZhYzQyYWZhYzYyZGY5YzcyZmY5YzkzMmY5Y2IzNWY4Y2QzN2Y4Y2YzYWY3ZDEzZGY3ZDM0MGY2ZDU0M2Y2ZDc0NmY1ZDk0OWY1ZGI0Y2Y0ZGQ0ZmY0ZGY1M2Y0ZTE1NmYzZTM1YWYzZTU1ZGYyZTY2MWYyZTg2NWYyZWE2OWYxZWM2ZGYxZWQ3MWYxZWY3NWYxZjE3OWYyZjI3ZGYyZjQ4MmYzZjU4NmYzZjY4YWY0Zjg4ZWY1Zjk5MmY2ZmE5NmY4ZmI5YWY5ZmM5ZGZhZmRhMWZjZmZhNFwiKSk7XG5cbmV4cG9ydCB2YXIgcGxhc21hID0gcmFtcChjb2xvcnMoXCIwZDA4ODcxMDA3ODgxMzA3ODkxNjA3OGExOTA2OGMxYjA2OGQxZDA2OGUyMDA2OGYyMjA2OTAyNDA2OTEyNjA1OTEyODA1OTIyYTA1OTMyYzA1OTQyZTA1OTUyZjA1OTYzMTA1OTczMzA1OTczNTA0OTgzNzA0OTkzODA0OWEzYTA0OWEzYzA0OWIzZTA0OWMzZjA0OWM0MTA0OWQ0MzAzOWU0NDAzOWU0NjAzOWY0ODAzOWY0OTAzYTA0YjAzYTE0YzAyYTE0ZTAyYTI1MDAyYTI1MTAyYTM1MzAyYTM1NTAyYTQ1NjAxYTQ1ODAxYTQ1OTAxYTU1YjAxYTU1YzAxYTY1ZTAxYTY2MDAxYTY2MTAwYTc2MzAwYTc2NDAwYTc2NjAwYTc2NzAwYTg2OTAwYTg2YTAwYTg2YzAwYTg2ZTAwYTg2ZjAwYTg3MTAwYTg3MjAxYTg3NDAxYTg3NTAxYTg3NzAxYTg3ODAxYTg3YTAyYTg3YjAyYTg3ZDAzYTg3ZTAzYTg4MDA0YTg4MTA0YTc4MzA1YTc4NDA1YTc4NjA2YTY4NzA3YTY4ODA4YTY4YTA5YTU4YjBhYTU4ZDBiYTU4ZTBjYTQ4ZjBkYTQ5MTBlYTM5MjBmYTM5NDEwYTI5NTExYTE5NjEzYTE5ODE0YTA5OTE1OWY5YTE2OWY5YzE3OWU5ZDE4OWQ5ZTE5OWRhMDFhOWNhMTFiOWJhMjFkOWFhMzFlOWFhNTFmOTlhNjIwOThhNzIxOTdhODIyOTZhYTIzOTVhYjI0OTRhYzI2OTRhZDI3OTNhZTI4OTJiMDI5OTFiMTJhOTBiMjJiOGZiMzJjOGViNDJlOGRiNTJmOGNiNjMwOGJiNzMxOGFiODMyODliYTMzODhiYjM0ODhiYzM1ODdiZDM3ODZiZTM4ODViZjM5ODRjMDNhODNjMTNiODJjMjNjODFjMzNkODBjNDNlN2ZjNTQwN2VjNjQxN2RjNzQyN2NjODQzN2JjOTQ0N2FjYTQ1N2FjYjQ2NzljYzQ3NzhjYzQ5NzdjZDRhNzZjZTRiNzVjZjRjNzRkMDRkNzNkMTRlNzJkMjRmNzFkMzUxNzFkNDUyNzBkNTUzNmZkNTU0NmVkNjU1NmRkNzU2NmNkODU3NmJkOTU4NmFkYTVhNmFkYTViNjlkYjVjNjhkYzVkNjdkZDVlNjZkZTVmNjVkZTYxNjRkZjYyNjNlMDYzNjNlMTY0NjJlMjY1NjFlMjY2NjBlMzY4NWZlNDY5NWVlNTZhNWRlNTZiNWRlNjZjNWNlNzZlNWJlNzZmNWFlODcwNTllOTcxNThlOTcyNTdlYTc0NTdlYjc1NTZlYjc2NTVlYzc3NTRlZDc5NTNlZDdhNTJlZTdiNTFlZjdjNTFlZjdlNTBmMDdmNGZmMDgwNGVmMTgxNGRmMTgzNGNmMjg0NGJmMzg1NGJmMzg3NGFmNDg4NDlmNDg5NDhmNThiNDdmNThjNDZmNjhkNDVmNjhmNDRmNzkwNDRmNzkxNDNmNzkzNDJmODk0NDFmODk1NDBmOTk3M2ZmOTk4M2VmOTlhM2VmYTliM2RmYTljM2NmYTllM2JmYjlmM2FmYmExMzlmYmEyMzhmY2EzMzhmY2E1MzdmY2E2MzZmY2E4MzVmY2E5MzRmZGFiMzNmZGFjMzNmZGFlMzJmZGFmMzFmZGIxMzBmZGIyMmZmZGI0MmZmZGI1MmVmZWI3MmRmZWI4MmNmZWJhMmNmZWJiMmJmZWJkMmFmZWJlMmFmZWMwMjlmZGMyMjlmZGMzMjhmZGM1MjdmZGM2MjdmZGM4MjdmZGNhMjZmZGNiMjZmY2NkMjVmY2NlMjVmY2QwMjVmY2QyMjVmYmQzMjRmYmQ1MjRmYmQ3MjRmYWQ4MjRmYWRhMjRmOWRjMjRmOWRkMjVmOGRmMjVmOGUxMjVmN2UyMjVmN2U0MjVmNmU2MjZmNmU4MjZmNWU5MjZmNWViMjdmNGVkMjdmM2VlMjdmM2YwMjdmMmYyMjdmMWY0MjZmMWY1MjVmMGY3MjRmMGY5MjFcIikpO1xuIiwiaW1wb3J0IHttYXh9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IHtzY2FsZVNlcXVlbnRpYWx9IGZyb20gXCJkMy1zY2FsZVwiO1xuaW1wb3J0ICogYXMgZDNDaHJvbWF0aWMgZnJvbSBcImQzLXNjYWxlLWNocm9tYXRpY1wiO1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb2xvckNoYXJ0KHNodWZmbGU9dHJ1ZSl7XG4gICAgLy8gcmVmOiBodHRwOi8vY2xvZm9yZC5jb20vcmVzb3VyY2VzL2NvbG91cnMvbmFtZWRjb2wuaHRtXG4gICAgY29uc3QgY29sb3JzID0gW1xuICAgICAgICBcImNyaW1zb25cIiwgXCJwYWxldmlvbGV0cmVkXCIsIFwiZGVlcHBpbmtcIiwgXCJtZWRpdW12aW9sZXRyZWRcIiwgXCJvcmNoaWRcIixcbiAgICAgICAgXCJmdWNoc2lhXCIsIFwiZGFya21hZ2VudGFcIiwgXCJkYXJrdmlvbGV0XCIsIFwiaW5kaWdvXCIsIFwiYmx1ZXZpb2xldFwiLFxuICAgICAgICBcImJsdWVcIiwgXCJtZWRpdW1zbGF0ZWJsdWVcIiwgXCJkYXJrc2xhdGVibHVlXCIsIFwibWVkaXVtYmx1ZVwiLCBcIm1pZG5pZ2h0Ymx1ZVwiLFxuICAgICAgICBcInJveWFsYmx1ZVwiLCBcImRvZGdlcmJsdWVcIiwgXCJkZXBwc2t5Ymx1ZVwiLCBcImRhcmt0dXJxdW9pc2VcIiwgXCJzdGVlbGJsdWVcIixcbiAgICAgICAgXCJkYXJrY3lhblwiLCBcImRhcmtzbGF0ZWdyYXlcIiwgXCJzZWFncmVlblwiLCBcImxpbWVncmVlblwiLCBcImRhcmtncmVlblwiLFxuICAgICAgICBcIm1lZGl1bXNwcmluZ2dyZWVuXCIsIFwiZGFya3NlYWdyZWVuXCIsXCJncmVlblwiLCBcIm9saXZlZHJhYlwiLCBcImRhcmtraGFraVwiLFxuICAgICAgICBcImRhcmtvbGl2ZWdyZWVuXCIsIFwieWVsbG93Z3JlZW5cIiwgXCJvbGl2ZVwiLCBcImdvbGRlbnJvZFwiLCBcImRhcmtnb2xkZW5yb2RcIixcbiAgICAgICAgXCJvcmFuZ2VcIiwgXCJ0YW5cIiwgXCJwZXJ1XCIsIFwic2FuZHlicm93blwiLCBcImNob2NvbGF0ZVwiLCBcInNhZGRsZWJyb3duXCIsXG4gICAgICAgIFwic2llbm5hXCIsIFwiY29yYWxcIiwgXCJvcmFuZ2VyZWRcIiwgXCJ0b21hdG9cIiwgXCJyb3N5YnJvd25cIixcbiAgICAgICAgXCJmaXJlYnJpY2tcIiwgXCJpbmRpYW5yZWRcIiwgXCJyZWRcIiwgXCJicm93blwiLFwiZ3JheVwiLCBcImJsYWNrXCJcbiAgICBdO1xuICAgIGlmIChzaHVmZmxlKSByZXR1cm4gc2h1ZmZsZUNvbG9ycyhjb2xvcnMpO1xuICAgIHJldHVybiBjb2xvcnM7XG59XG5cbmZ1bmN0aW9uIHNodWZmbGVDb2xvcnMoYXJyYXkpIHtcbiAgICAvLyBGaXNoZXItWWF0ZXMgc2h1ZmZsZVxuICAgIGxldCBjb3VudGVyID0gYXJyYXkubGVuZ3RoO1xuXG4gICAgLy8gV2hpbGUgdGhlcmUgYXJlIGVsZW1lbnRzIGluIHRoZSBhcnJheVxuICAgIHdoaWxlIChjb3VudGVyID4gMCkge1xuICAgICAgICAvLyBQaWNrIGEgcmFuZG9tIGluZGV4XG4gICAgICAgIGxldCBpbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNvdW50ZXIpO1xuXG4gICAgICAgIC8vIERlY3JlYXNlIGNvdW50ZXIgYnkgMVxuICAgICAgICBjb3VudGVyLS07XG5cbiAgICAgICAgLy8gQW5kIHN3YXAgdGhlIGxhc3QgZWxlbWVudCB3aXRoIGl0XG4gICAgICAgIGxldCB0ZW1wID0gYXJyYXlbY291bnRlcl07XG4gICAgICAgIGFycmF5W2NvdW50ZXJdID0gYXJyYXlbaW5kZXhdO1xuICAgICAgICBhcnJheVtpbmRleF0gPSB0ZW1wO1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbG9ySW50ZXJwb2xhdG9yKG5hbWUpe1xuICAgIC8vIHJlZmVyZW5jZTogaHR0cHM6Ly9naXRodWIuY29tL2QzL2QzLXNjYWxlLWNocm9tYXRpYy9ibG9iL21hc3Rlci9SRUFETUUubWQjc2VxdWVudGlhbC1tdWx0aS1odWVcbiAgICBjb25zdCBpbnRlcnBvbGF0b3JzID0ge1xuICAgICAgICBCdUduOiBkM0Nocm9tYXRpYy5pbnRlcnBvbGF0ZUJ1R24sXG4gICAgICAgIE9yUmQ6IGQzQ2hyb21hdGljLmludGVycG9sYXRlT3JSZCxcbiAgICAgICAgUHVCdTogZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVQdUJ1LFxuICAgICAgICBZbEduQnU6IGQzQ2hyb21hdGljLmludGVycG9sYXRlWWxHbkJ1LFxuICAgICAgICBCbHVlczogZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVCbHVlcyxcbiAgICAgICAgT3JhbmdlczogZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVPcmFuZ2VzLFxuICAgICAgICBHcmVlbnM6IGQzQ2hyb21hdGljLmludGVycG9sYXRlR3JlZW5zLFxuICAgICAgICBQdXJwbGVzOiBkM0Nocm9tYXRpYy5pbnRlcnBvbGF0ZVB1cnBsZXMsXG4gICAgICAgIFJlZHM6IGQzQ2hyb21hdGljLmludGVycG9sYXRlUmVkcyxcbiAgICAgICAgR3JleXM6IGQzQ2hyb21hdGljLmludGVycG9sYXRlR3JleXMsXG4gICAgICAgIEdyYXlzOiBkM0Nocm9tYXRpYy5pbnRlcnBvbGF0ZUdyZXlzXG4gICAgfTtcbiAgICBpZiAoIWludGVycG9sYXRvcnMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgY29uc3QgZXJyID0gXCJDb2xvciBJbnRlcnBvbGF0b3IgRXJyb3IgXCIgKyBuYW1lO1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIHRocm93KGVycik7XG4gICAgfVxuICAgIHJldHVybiBpbnRlcnBvbGF0b3JzW25hbWVdO1xuXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbG9ycyh0aGVtZSl7XG4gICAgY29uc3QgcGFsZXR0ZSA9IHtcbiAgICAgICAgLy8gY29sb3JicmV3ZXJcbiAgICAgICAgeWxnbmJ1OltcIiNmZmZmZDlcIixcIiNlZGY4YjFcIixcIiNjN2U5YjRcIixcIiM3ZmNkYmJcIixcIiM0MWI2YzRcIixcIiMxZDkxYzBcIixcIiMyMjVlYThcIixcIiMyNTM0OTRcIixcIiMwODFkNThcIixcIiMwNDBlMjlcIl0sXG4gICAgICAgIG9ycmQ6IFtcIiNlZGY4YjFcIiwnI2ZmZjdlYycsJyNmZWU4YzgnLCcjZmRkNDllJywnI2ZkYmI4NCcsJyNmYzhkNTknLCcjZWY2NTQ4JywnI2Q3MzAxZicsJyNiMzAwMDAnLCcjN2YwMDAwJywnIzRjMDAwMCddLFxuICAgICAgICBnbmJ1OiBbJyNmMGYwZjAnLCcjZjdmY2YwJywnI2UwZjNkYicsJyNjY2ViYzUnLCcjYThkZGI1JywnIzdiY2NjNCcsJyM0ZWIzZDMnLCcjMmI4Y2JlJywnIzA4NjhhYycsJyMwODQwODEnLCcjMDUyODUxJ10sXG4gICAgICAgIHJkcHU6IFsnI2ZmZjdmMycsJyNmZGUwZGQnLCcjZmNjNWMwJywnI2ZhOWZiNScsJyNmNzY4YTEnLCcjZGQzNDk3JywnI2FlMDE3ZScsJyM3YTAxNzcnLCcjNDkwMDZhJ10sXG5cbiAgICAgICAgLy8gb3RoZXIgc291cmNlc1xuICAgICAgICBibHVlczogW1wiI2VlZWVlZVwiLCBcIiNlOGY4ZmNcIiwgXCIjY2FlZWY5XCIsIFwiI2FiZTRmNVwiLCBcIiM1ZmNiZWRcIiwgXCIjMWFhZmRkXCIsIFwiIzE2OTdiZlwiLCBcIiMxMTczOTFcIiwgXCIjMGE0MzU0XCIsIFwiIzA0MWYyN1wiXSxcbiAgICAgICAgcmVkczogW1wiI0ZGRTRERVwiLCBcIiNGRkM2QkFcIiwgXCIjRjc4NjZFXCIsIFwiI2Q5NzQ1ZVwiLCBcIiNEMjVDNDNcIiwgXCIjYjY0NDJjXCIsIFwiIzliM2EyNVwiLFwiIzcxMmExY1wiLCBcIiM1NjIwMTVcIiwgXCIjMmQxMTBiXCJdLFxuICAgICAgICByZWRzMjogWycjZjBmMGYwJywgJyNmZmY1ZjAnLCcjZmVlMGQyJywnI2ZjYmJhMScsJyNmYzkyNzInLCcjZmI2YTRhJywnI2VmM2IyYycsJyNjYjE4MWQnLCcjYTUwZjE1JywnIzY3MDAwZCddLFxuICAgICAgICBwdXJwbGVzOiBbXCIjZWVlZWVlXCIsJyNmY2ZiZmQnLCcjZWZlZGY1JywnI2RhZGFlYicsJyNiY2JkZGMnLCcjOWU5YWM4JywnIzgwN2RiYScsJyM2YTUxYTMnLCcjNTQyNzhmJywnIzNmMDA3ZCddLFxuICAgICAgICBncmV5czogW1wic25vd1wiLCcjZjBmMGYwJywnI2Q5ZDlkOScsJyNiZGJkYmQnLCcjOTY5Njk2JywnIzczNzM3MycsJyM1MjUyNTInLCcjMjUyNTI1JywnIzAwMDAwMCddXG4gICAgfTtcbiAgICBpZighcGFsZXR0ZS5oYXNPd25Qcm9wZXJ0eSh0aGVtZSkpIHRocm93IFwiQ29sb3IgdGhlbWUgbm90IGZvdW5kOiBcIiArIHRoZW1lO1xuICAgIHJldHVybiBwYWxldHRlW3RoZW1lXVxufVxuXG4vKipcbiAqIHJlZmVyZW5jZTogaHR0cHM6Ly9naXRodWIuY29tL2QzL2QzLXNjYWxlXG4gKiByZWZlcmVuY2U6IGh0dHA6Ly9ibC5vY2tzLm9yZy9jdXJyYW4vMzA5NGIzN2U2M2I5MThiYWIwYTA2Nzg3ZTE2MTYwN2JcbiAqIHNjYWxlU2VxdWVudGlhbCBtYXBzIHRoZSBjb250aW51b3VzIGRvbWFpbiB0byBhIGNvbnRpbnVvdXMgY29sb3Igc2NhbGVcbiAqIEBwYXJhbSBkYXRhIHtMaXN0fSBvZiBudW1lcmljYWwgZGF0YVxuICogQHBhcmFtIGNvbG9ycyB7U3RyaW5nfSBhIGNvbG9yIG5hbWUgdGhhdCBpcyBhdmFpbGFibGUgaW4gZ2V0Q29sb3JJbnRlcnBvbGF0b3IoKVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0Q29sb3JTY2FsZShkYXRhLCBjb2xvcnM9XCJZbEduQnVcIiwgZG1pbiA9IDApIHtcbiAgICBsZXQgZG1heCA9IE1hdGgucm91bmQobWF4KGRhdGEpKTtcbiAgICBjb25zdCBzY2FsZSA9IHNjYWxlU2VxdWVudGlhbChnZXRDb2xvckludGVycG9sYXRvcihjb2xvcnMpKTtcbiAgICBzY2FsZS5kb21haW4oW2RtaW4sIGRtYXhdKTtcbiAgICByZXR1cm4gc2NhbGU7XG59XG5cbi8qKlxuICogRHJhdyBhIGNvbG9yIGxlZ2VuZCBiYXIuXG4gKiBEZXBlbmRlbmNpZXM6IGV4cHJlc3Npb25NYXAuY3NzXG4gKiBAcGFyYW0gdGl0bGUge1N0cmluZ31cbiAqIEBwYXJhbSBkb20ge29iamVjdH0gRDMgZG9tIG9iamVjdFxuICogQHBhcmFtIHNjYWxlIHtPYmplY3R9IEQzIHNjYWxlIG9mIHRoZSBjb2xvclxuICogQHBhcmFtIGNvbmZpZyB7T2JqZWN0fSB3aXRoIGF0dHI6IHgsIHlcbiAqIEBwYXJhbSB1c2VMb2cge0Jvb2xlYW59XG4gKiBAcGFyYW0gY2VsbFxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJhd0NvbG9yTGVnZW5kKHRpdGxlLCBkb20sIHNjYWxlLCBjb25maWcsIHVzZUxvZywgdGlja3M9MTAsIGJhc2U9MTAsIGNlbGw9e2g6MTUsIHc6NTB9KXtcblxuICAgIC8vIGNvbnN0IGRhdGEgPSBbMF0uY29uY2F0KHNjYWxlLnF1YW50aWxlcygpKTsgLy8gYWRkIDAgdG8gdGhlIGxpc3Qgb2YgdmFsdWVzXG4gICAgY29uc3QgZGF0YSA9IHNjYWxlLnRpY2tzKHRpY2tzKS5zbGljZSgxKTsgLy8gd2h5IHRoaXMgZG9lc24ndCBwcm92aWRlIGNvbnNpc3RlbnQgbnVtYmVyIG9mIHRpY2tzPz9cbiAgICAvLyBsZWdlbmQgdGl0bGVcbiAgICBkb20uYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiY29sb3ItbGVnZW5kXCIpXG4gICAgICAgIC50ZXh0KHRpdGxlKVxuICAgICAgICAuYXR0cihcInhcIiwgLTEwKVxuICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwiZW5kXCIpXG4gICAgICAgIC5hdHRyKFwieVwiLCBjZWxsLmgpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoJHtjb25maWcueH0sICR7Y29uZmlnLnl9KWApO1xuXG4gICAgLy8gbGVnZW5kIGdyb3Vwc1xuICAgIGNvbnN0IGxlZ2VuZHMgPSBkb20uYXBwZW5kKFwiZ1wiKS5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoJHtjb25maWcueH0sICR7Y29uZmlnLnl9KWApXG4gICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCIubGVnZW5kXCIpLmRhdGEoZGF0YSk7XG5cbiAgICBjb25zdCBnID0gbGVnZW5kcy5lbnRlcigpLmFwcGVuZChcImdcIikuY2xhc3NlZChcImxlZ2VuZFwiLCB0cnVlKTtcbiAgICBnLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgLmF0dHIoXCJ4XCIsIChkLCBpKSA9PiBjZWxsLncqaSlcbiAgICAgICAgLmF0dHIoXCJ5XCIsIDUpXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgY2VsbC53KVxuICAgICAgICAuYXR0cihcImhlaWdodFwiLCBjZWxsLmgpXG4gICAgICAgIC5zdHlsZShcImZpbGxcIiwgc2NhbGUpO1xuXG4gICAgZy5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJjb2xvci1sZWdlbmRcIilcbiAgICAgICAgLnRleHQoKGQpID0+IHVzZUxvZz8oTWF0aC5wb3coYmFzZSwgZCktMSkudG9QcmVjaXNpb24oMik6ZC50b1ByZWNpc2lvbigyKSkgLy8gVE9ETzogYXNzdW1pbmcgbG9nIGlzIGJhc2UgMTBcbiAgICAgICAgLmF0dHIoXCJ4XCIsIChkLCBpKSA9PiBjZWxsLncgKiBpKVxuICAgICAgICAuYXR0cihcInlcIiwgMCk7XG5cblxufSIsIi8qKlxuICogQ3JlYXRlcyBhbiBTVkdcbiAqIEBwYXJhbSBpZCB7U3RyaW5nfSBhIERPTSBlbGVtZW50IElEIHRoYXQgc3RhcnRzIHdpdGggYSBcIiNcIlxuICogQHBhcmFtIHdpZHRoIHtOdW1lcmljfVxuICogQHBhcmFtIGhlaWdodCB7TnVtZXJpY31cbiAqIEBwYXJhbSBtYXJnaW4ge09iamVjdH0gd2l0aCB0d28gYXR0cmlidXRlczogd2lkdGggYW5kIGhlaWdodFxuICogQHJldHVybiB7U2VsZWN0aW9ufSB0aGUgZDMgc2VsZWN0aW9uIG9iamVjdCBvZiB0aGUgU1ZHXG4gKi9cblxuaW1wb3J0IHtzZWxlY3R9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTdmcoaWQsIHdpZHRoLCBoZWlnaHQsIG1hcmdpbil7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgcmV0dXJuIHNlbGVjdChcIiNcIitpZCkuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgke21hcmdpbi5sZWZ0fSwgJHttYXJnaW4udG9wfSlgKVxufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gc3ZnT2JqXG4gKiBAcGFyYW0gZG93bmxvYWRGaWxlTmFtZSB7U3RyaW5nfVxuICogQHBhcmFtIHRlbXBEb3dubG9hZERpdklkIHtTdHJpbmd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkb3dubG9hZFN2ZyhzdmdPYmosIGRvd25sb2FkRmlsZU5hbWUsIHRlbXBEb3dubG9hZERpdklkKXtcbiAgICBjb25zb2xlLmxvZyhzdmdPYmopO1xuICAgIHZhciAkc3ZnQ29weSA9IHN2Z09iai5jbG9uZSgpXG4gICAgLmF0dHIoXCJ2ZXJzaW9uXCIsIFwiMS4xXCIpXG4gICAgLmF0dHIoXCJ4bWxuc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpO1xuXG4gICAgLy8gcGFyc2UgYW5kIGFkZCB0aGUgQ1NTIHN0eWxpbmcgdXNlZCBieSB0aGUgU1ZHXG4gICAgdmFyIHN0eWxlcyA9IF9wYXJzZUNzc1N0eWxlcyhzdmdPYmouZ2V0KCkpO1xuICAgICRzdmdDb3B5LnByZXBlbmQoc3R5bGVzKTtcblxuICAgICQoXCIjXCIgKyB0ZW1wRG93bmxvYWREaXZJZCkuaHRtbCgnJykuaGlkZSgpO1xuICAgIHZhciBzdmdIdG1sID0gJChcIiNcIiArIHRlbXBEb3dubG9hZERpdklkKS5hcHBlbmQoJHN2Z0NvcHkpLmh0bWwoKTtcblxuICAgIHZhciBzdmdCbG9iID0gbmV3IEJsb2IoW3N2Z0h0bWxdLCB7dHlwZTogXCJpbWFnZS9zdmcreG1sXCJ9KTtcbiAgICBzYXZlQXMoc3ZnQmxvYiwgZG93bmxvYWRGaWxlTmFtZSk7XG5cbiAgICAvLyBjbGVhciB0aGUgdGVtcCBkb3dubG9hZCBkaXZcbiAgICAkKFwiI1wiICsgdGVtcERvd25sb2FkRGl2SWQpLmh0bWwoJycpLmhpZGUoKTtcbn1cbi8qKlxuICogQSBwcml2YXRlIGZ1bmN0aW9uIGZvciBwYXJzaW5nIHRoZSBDU1Mgc3R5bGUgc2hlZXQgYW5kIGluY2x1ZGluZyB0aGUgc3R5bGUgcHJvcGVydGllcyBpbiB0aGUgZG93bmxvYWRhYmxlIFNWRy5cbiAqIEBwYXJhbSBkb21cbiAqIEByZXR1cm5zIHtFbGVtZW50fVxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX3BhcnNlQ3NzU3R5bGVzIChkb20pIHtcbiAgICB2YXIgdXNlZCA9IFwiXCI7XG4gICAgdmFyIHNoZWV0cyA9IGRvY3VtZW50LnN0eWxlU2hlZXRzO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaGVldHMubGVuZ3RoOyBpKyspIHsgLy8gVE9ETzogd2FsayB0aHJvdWdoIHRoaXMgYmxvY2sgb2YgY29kZVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoc2hlZXRzW2ldLmNzc1J1bGVzID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICAgICAgdmFyIHJ1bGVzID0gc2hlZXRzW2ldLmNzc1J1bGVzO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJ1bGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJ1bGUgPSBydWxlc1tqXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mKHJ1bGUuc3R5bGUpICE9IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1zO1xuICAgICAgICAgICAgICAgICAgICAvL1NvbWUgc2VsZWN0b3JzIHdvbid0IHdvcmssIGFuZCBtb3N0IG9mIHRoZXNlIGRvbid0IG1hdHRlci5cbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1zID0gJChkb20pLmZpbmQocnVsZS5zZWxlY3RvclRleHQpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZWQgKz0gcnVsZS5zZWxlY3RvclRleHQgKyBcIiB7IFwiICsgcnVsZS5zdHlsZS5jc3NUZXh0ICsgXCIgfVxcblwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBJbiBGaXJlZm94LCBpZiBzdHlsZXNoZWV0IG9yaWdpbmF0ZXMgZnJvbSBhIGRpZmYgZG9tYWluLFxuICAgICAgICAgICAgLy8gdHJ5aW5nIHRvIGFjY2VzcyB0aGUgY3NzUnVsZXMgd2lsbCB0aHJvdyBhIFNlY3VyaXR5RXJyb3IuXG4gICAgICAgICAgICAvLyBIZW5jZSwgd2UgbXVzdCB1c2UgYSB0cnkvY2F0Y2ggdG8gaGFuZGxlIHRoaXMgaW4gRmlyZWZveFxuICAgICAgICAgICAgaWYgKGUubmFtZSAhPT0gJ1NlY3VyaXR5RXJyb3InKSB0aHJvdyBlO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgcy5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndGV4dC9jc3MnKTtcbiAgICBzLmlubmVySFRNTCA9IFwiPCFbQ0RBVEFbXFxuXCIgKyB1c2VkICsgXCJcXG5dXT5cIjtcblxuICAgIHJldHVybiBzO1xufVxuIiwiLyoqXG4gKiBUT0RPOiBhIGJldHRlciB3YXkgb2YgaGFuZGxpbmcgbGF5b3V0IGNvbmZpZ3VyYXRpb25cbiAqIHJldmlldyBhbGwgdGhlIHBvc2l0aW9uIGNhbGN1bGF0aW9uc1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEZW5kcm9IZWF0bWFwQ29uZmlnIHtcbiAgICBjb25zdHJ1Y3RvcihpZD1cImNoYXJ0XCIpe1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMubWFyZ2luID0ge2xlZnQ6IDEwLCB0b3A6IDEwLCByaWdodDogMjUwLCBib3R0b206IDE3MH07XG5cbiAgICAgICAgdGhpcy5jZWxsID0geyAvLyBhcmUgdGhlc2UgdXNlZD9cbiAgICAgICAgICAgIHc6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGg6IDEyXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy50b3BUcmVlUGFuZWwgPSB7IC8vIHRoZSBjb2x1bW4gZGVuZHJvZ3JhbSBwYW5lbFxuICAgICAgICAgICAgeDogMTAwLFxuICAgICAgICAgICAgeTogMCxcbiAgICAgICAgICAgIGg6IDYwLFxuICAgICAgICAgICAgdzogd2luZG93LmlubmVyV2lkdGggLSAoMTAwICsgMTUwICsgMzAwKSwgLy8gaGFyZC1jb2RlZCB2YWx1ZXM/XG4gICAgICAgICAgICBpZDogXCJ0b3BUcmVlXCJcbiAgICAgICAgfTtcblxuICAgICAgICBsZXQgYWRqdXN0ID0gMTU7IC8vIHNwYWNpbmcgYWRqdXN0bWVudFxuXG4gICAgICAgIHRoaXMubGVmdFRyZWVQYW5lbCA9IHsgLy8gdGhlIHJvdyBkZW5kcm9ncmFtIHBhbmVsXG4gICAgICAgICAgICB4OiB0aGlzLm1hcmdpbi5sZWZ0LFxuICAgICAgICAgICAgeTogdGhpcy5tYXJnaW4udG9wICsgdGhpcy50b3BUcmVlUGFuZWwuaCxcbiAgICAgICAgICAgIGg6IHVuZGVmaW5lZCwgLy8gZGF0YS1kZXBlbmRlbnRcbiAgICAgICAgICAgIHc6IDEwMCAtIChhZGp1c3QpLFxuICAgICAgICAgICAgaWQ6IFwibGVmdFRyZWVcIlxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuaGVhdG1hcFBhbmVsID0ge1xuICAgICAgICAgICAgeDogMTAwLFxuICAgICAgICAgICAgeTogdGhpcy5tYXJnaW4udG9wICsgdGhpcy50b3BUcmVlUGFuZWwuaCxcbiAgICAgICAgICAgIGg6IHRoaXMubGVmdFRyZWVQYW5lbC5oLFxuICAgICAgICAgICAgdzogdGhpcy50b3BUcmVlUGFuZWwudyxcbiAgICAgICAgICAgIGlkOiBcImhlYXRtYXBcIlxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubGVnZW5kUGFuZWwgPSB7IC8vIHRoZSBjb2xvciBsZWdlbmQgcGFuZWxcbiAgICAgICAgICAgIHg6IDEwMCxcbiAgICAgICAgICAgIHk6IHRoaXMubWFyZ2luLnRvcCArIHRoaXMudG9wVHJlZVBhbmVsLmggKyAxNTAsXG4gICAgICAgICAgICBoOiA1MCxcbiAgICAgICAgICAgIHc6IHRoaXMudG9wVHJlZVBhbmVsLncsXG4gICAgICAgICAgICBjZWxsOiB7dzogNjB9LFxuICAgICAgICAgICAgaWQ6IFwibGVnZW5kXCJcbiAgICAgICAgfTtcblxuICAgIH1cblxuICAgIHNldElkKGlkPVwiY2hhcnRcIil7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICB9XG5cbiAgICBzZXRNYXJnaW4obWFyZ2luPXtsZWZ0OiAxMCwgdG9wOiAxMCwgcmlnaHQ6IDI1MCwgYm90dG9tOiAxNzB9KXtcbiAgICAgICAgdGhpcy5tYXJnaW4gPSBtYXJnaW47XG4gICAgfVxuXG4gICAgc2V0TWFpblBhbmVsV2lkdGgodyl7XG4gICAgICAgIHRoaXMuaGVhdG1hcFBhbmVsLncgPSB3O1xuICAgIH1cblxuICAgIG5vVG9wVHJlZVBhbmVsKG1haW5QYW5lbFdpZHRoID0gd2luZG93LmlubmVyV2lkdGggLSAoMTAwICsgMjUwKSl7XG4gICAgICAgIHRoaXMudG9wVHJlZVBhbmVsID0ge3g6MCwgeTowLCBoOjIwLCB3OjB9O1xuICAgICAgICB0aGlzLmxlZnRUcmVlUGFuZWwueSA9IHRoaXMubWFyZ2luLnRvcCoyO1xuICAgICAgICB0aGlzLmhlYXRtYXBQYW5lbC55ID0gdGhpcy5tYXJnaW4udG9wKjI7XG4gICAgICAgIHRoaXMuaGVhdG1hcFBhbmVsLncgPSBtYWluUGFuZWxXaWR0aDtcbiAgICAgICAgdGhpcy5sZWdlbmRQYW5lbC55ID0gMDsgLy8gaW4gdGhlIG1hcmdpbiB0b3BcbiAgICB9XG5cbiAgICBnZXQoKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgICAgICAgbWFyZ2luOiB0aGlzLm1hcmdpbixcbiAgICAgICAgICAgIGNlbGw6IHRoaXMuY2VsbCxcbiAgICAgICAgICAgIHc6IHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgICAgICAgaDogdGhpcy5tYXJnaW4udG9wICsgdGhpcy50b3BUcmVlUGFuZWwuaCArIHRoaXMubGVnZW5kUGFuZWwuaCArIHRoaXMubWFyZ2luLmJvdHRvbSwgLy8gaW5pdGlhbCBoZWlnaHRcbiAgICAgICAgICAgIHBhbmVsczoge1xuICAgICAgICAgICAgICAgIHRvcDogdGhpcy50b3BUcmVlUGFuZWwsXG4gICAgICAgICAgICAgICAgbGVmdDogdGhpcy5sZWZ0VHJlZVBhbmVsLFxuICAgICAgICAgICAgICAgIG1haW46IHRoaXMuaGVhdG1hcFBhbmVsLFxuICAgICAgICAgICAgICAgIGxlZ2VuZDogdGhpcy5sZWdlbmRQYW5lbFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbn1cblxuIiwiZnVuY3Rpb24gY291bnQobm9kZSkge1xuICB2YXIgc3VtID0gMCxcbiAgICAgIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbixcbiAgICAgIGkgPSBjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGg7XG4gIGlmICghaSkgc3VtID0gMTtcbiAgZWxzZSB3aGlsZSAoLS1pID49IDApIHN1bSArPSBjaGlsZHJlbltpXS52YWx1ZTtcbiAgbm9kZS52YWx1ZSA9IHN1bTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVhY2hBZnRlcihjb3VudCk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjYWxsYmFjaykge1xuICB2YXIgbm9kZSA9IHRoaXMsIGN1cnJlbnQsIG5leHQgPSBbbm9kZV0sIGNoaWxkcmVuLCBpLCBuO1xuICBkbyB7XG4gICAgY3VycmVudCA9IG5leHQucmV2ZXJzZSgpLCBuZXh0ID0gW107XG4gICAgd2hpbGUgKG5vZGUgPSBjdXJyZW50LnBvcCgpKSB7XG4gICAgICBjYWxsYmFjayhub2RlKSwgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuO1xuICAgICAgaWYgKGNoaWxkcmVuKSBmb3IgKGkgPSAwLCBuID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICAgIG5leHQucHVzaChjaGlsZHJlbltpXSk7XG4gICAgICB9XG4gICAgfVxuICB9IHdoaWxlIChuZXh0Lmxlbmd0aCk7XG4gIHJldHVybiB0aGlzO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgdmFyIG5vZGUgPSB0aGlzLCBub2RlcyA9IFtub2RlXSwgY2hpbGRyZW4sIGk7XG4gIHdoaWxlIChub2RlID0gbm9kZXMucG9wKCkpIHtcbiAgICBjYWxsYmFjayhub2RlKSwgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuO1xuICAgIGlmIChjaGlsZHJlbikgZm9yIChpID0gY2hpbGRyZW4ubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIG5vZGVzLnB1c2goY2hpbGRyZW5baV0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcztcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIHZhciBub2RlID0gdGhpcywgbm9kZXMgPSBbbm9kZV0sIG5leHQgPSBbXSwgY2hpbGRyZW4sIGksIG47XG4gIHdoaWxlIChub2RlID0gbm9kZXMucG9wKCkpIHtcbiAgICBuZXh0LnB1c2gobm9kZSksIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbjtcbiAgICBpZiAoY2hpbGRyZW4pIGZvciAoaSA9IDAsIG4gPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIG5vZGVzLnB1c2goY2hpbGRyZW5baV0pO1xuICAgIH1cbiAgfVxuICB3aGlsZSAobm9kZSA9IG5leHQucG9wKCkpIHtcbiAgICBjYWxsYmFjayhub2RlKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0aGlzLmVhY2hBZnRlcihmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIHN1bSA9ICt2YWx1ZShub2RlLmRhdGEpIHx8IDAsXG4gICAgICAgIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbixcbiAgICAgICAgaSA9IGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aDtcbiAgICB3aGlsZSAoLS1pID49IDApIHN1bSArPSBjaGlsZHJlbltpXS52YWx1ZTtcbiAgICBub2RlLnZhbHVlID0gc3VtO1xuICB9KTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbXBhcmUpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaEJlZm9yZShmdW5jdGlvbihub2RlKSB7XG4gICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIG5vZGUuY2hpbGRyZW4uc29ydChjb21wYXJlKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oZW5kKSB7XG4gIHZhciBzdGFydCA9IHRoaXMsXG4gICAgICBhbmNlc3RvciA9IGxlYXN0Q29tbW9uQW5jZXN0b3Ioc3RhcnQsIGVuZCksXG4gICAgICBub2RlcyA9IFtzdGFydF07XG4gIHdoaWxlIChzdGFydCAhPT0gYW5jZXN0b3IpIHtcbiAgICBzdGFydCA9IHN0YXJ0LnBhcmVudDtcbiAgICBub2Rlcy5wdXNoKHN0YXJ0KTtcbiAgfVxuICB2YXIgayA9IG5vZGVzLmxlbmd0aDtcbiAgd2hpbGUgKGVuZCAhPT0gYW5jZXN0b3IpIHtcbiAgICBub2Rlcy5zcGxpY2UoaywgMCwgZW5kKTtcbiAgICBlbmQgPSBlbmQucGFyZW50O1xuICB9XG4gIHJldHVybiBub2Rlcztcbn1cblxuZnVuY3Rpb24gbGVhc3RDb21tb25BbmNlc3RvcihhLCBiKSB7XG4gIGlmIChhID09PSBiKSByZXR1cm4gYTtcbiAgdmFyIGFOb2RlcyA9IGEuYW5jZXN0b3JzKCksXG4gICAgICBiTm9kZXMgPSBiLmFuY2VzdG9ycygpLFxuICAgICAgYyA9IG51bGw7XG4gIGEgPSBhTm9kZXMucG9wKCk7XG4gIGIgPSBiTm9kZXMucG9wKCk7XG4gIHdoaWxlIChhID09PSBiKSB7XG4gICAgYyA9IGE7XG4gICAgYSA9IGFOb2Rlcy5wb3AoKTtcbiAgICBiID0gYk5vZGVzLnBvcCgpO1xuICB9XG4gIHJldHVybiBjO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlID0gdGhpcywgbm9kZXMgPSBbbm9kZV07XG4gIHdoaWxlIChub2RlID0gbm9kZS5wYXJlbnQpIHtcbiAgICBub2Rlcy5wdXNoKG5vZGUpO1xuICB9XG4gIHJldHVybiBub2Rlcztcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZXMgPSBbXTtcbiAgdGhpcy5lYWNoKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBub2Rlcy5wdXNoKG5vZGUpO1xuICB9KTtcbiAgcmV0dXJuIG5vZGVzO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBsZWF2ZXMgPSBbXTtcbiAgdGhpcy5lYWNoQmVmb3JlKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpZiAoIW5vZGUuY2hpbGRyZW4pIHtcbiAgICAgIGxlYXZlcy5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBsZWF2ZXM7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgdmFyIHJvb3QgPSB0aGlzLCBsaW5rcyA9IFtdO1xuICByb290LmVhY2goZnVuY3Rpb24obm9kZSkge1xuICAgIGlmIChub2RlICE9PSByb290KSB7IC8vIERvbuKAmXQgaW5jbHVkZSB0aGUgcm9vdOKAmXMgcGFyZW50LCBpZiBhbnkuXG4gICAgICBsaW5rcy5wdXNoKHtzb3VyY2U6IG5vZGUucGFyZW50LCB0YXJnZXQ6IG5vZGV9KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbGlua3M7XG59XG4iLCJpbXBvcnQgbm9kZV9jb3VudCBmcm9tIFwiLi9jb3VudFwiO1xuaW1wb3J0IG5vZGVfZWFjaCBmcm9tIFwiLi9lYWNoXCI7XG5pbXBvcnQgbm9kZV9lYWNoQmVmb3JlIGZyb20gXCIuL2VhY2hCZWZvcmVcIjtcbmltcG9ydCBub2RlX2VhY2hBZnRlciBmcm9tIFwiLi9lYWNoQWZ0ZXJcIjtcbmltcG9ydCBub2RlX3N1bSBmcm9tIFwiLi9zdW1cIjtcbmltcG9ydCBub2RlX3NvcnQgZnJvbSBcIi4vc29ydFwiO1xuaW1wb3J0IG5vZGVfcGF0aCBmcm9tIFwiLi9wYXRoXCI7XG5pbXBvcnQgbm9kZV9hbmNlc3RvcnMgZnJvbSBcIi4vYW5jZXN0b3JzXCI7XG5pbXBvcnQgbm9kZV9kZXNjZW5kYW50cyBmcm9tIFwiLi9kZXNjZW5kYW50c1wiO1xuaW1wb3J0IG5vZGVfbGVhdmVzIGZyb20gXCIuL2xlYXZlc1wiO1xuaW1wb3J0IG5vZGVfbGlua3MgZnJvbSBcIi4vbGlua3NcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaGllcmFyY2h5KGRhdGEsIGNoaWxkcmVuKSB7XG4gIHZhciByb290ID0gbmV3IE5vZGUoZGF0YSksXG4gICAgICB2YWx1ZWQgPSArZGF0YS52YWx1ZSAmJiAocm9vdC52YWx1ZSA9IGRhdGEudmFsdWUpLFxuICAgICAgbm9kZSxcbiAgICAgIG5vZGVzID0gW3Jvb3RdLFxuICAgICAgY2hpbGQsXG4gICAgICBjaGlsZHMsXG4gICAgICBpLFxuICAgICAgbjtcblxuICBpZiAoY2hpbGRyZW4gPT0gbnVsbCkgY2hpbGRyZW4gPSBkZWZhdWx0Q2hpbGRyZW47XG5cbiAgd2hpbGUgKG5vZGUgPSBub2Rlcy5wb3AoKSkge1xuICAgIGlmICh2YWx1ZWQpIG5vZGUudmFsdWUgPSArbm9kZS5kYXRhLnZhbHVlO1xuICAgIGlmICgoY2hpbGRzID0gY2hpbGRyZW4obm9kZS5kYXRhKSkgJiYgKG4gPSBjaGlsZHMubGVuZ3RoKSkge1xuICAgICAgbm9kZS5jaGlsZHJlbiA9IG5ldyBBcnJheShuKTtcbiAgICAgIGZvciAoaSA9IG4gLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICBub2Rlcy5wdXNoKGNoaWxkID0gbm9kZS5jaGlsZHJlbltpXSA9IG5ldyBOb2RlKGNoaWxkc1tpXSkpO1xuICAgICAgICBjaGlsZC5wYXJlbnQgPSBub2RlO1xuICAgICAgICBjaGlsZC5kZXB0aCA9IG5vZGUuZGVwdGggKyAxO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByb290LmVhY2hCZWZvcmUoY29tcHV0ZUhlaWdodCk7XG59XG5cbmZ1bmN0aW9uIG5vZGVfY29weSgpIHtcbiAgcmV0dXJuIGhpZXJhcmNoeSh0aGlzKS5lYWNoQmVmb3JlKGNvcHlEYXRhKTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdENoaWxkcmVuKGQpIHtcbiAgcmV0dXJuIGQuY2hpbGRyZW47XG59XG5cbmZ1bmN0aW9uIGNvcHlEYXRhKG5vZGUpIHtcbiAgbm9kZS5kYXRhID0gbm9kZS5kYXRhLmRhdGE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlSGVpZ2h0KG5vZGUpIHtcbiAgdmFyIGhlaWdodCA9IDA7XG4gIGRvIG5vZGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICB3aGlsZSAoKG5vZGUgPSBub2RlLnBhcmVudCkgJiYgKG5vZGUuaGVpZ2h0IDwgKytoZWlnaHQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIE5vZGUoZGF0YSkge1xuICB0aGlzLmRhdGEgPSBkYXRhO1xuICB0aGlzLmRlcHRoID1cbiAgdGhpcy5oZWlnaHQgPSAwO1xuICB0aGlzLnBhcmVudCA9IG51bGw7XG59XG5cbk5vZGUucHJvdG90eXBlID0gaGllcmFyY2h5LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IE5vZGUsXG4gIGNvdW50OiBub2RlX2NvdW50LFxuICBlYWNoOiBub2RlX2VhY2gsXG4gIGVhY2hBZnRlcjogbm9kZV9lYWNoQWZ0ZXIsXG4gIGVhY2hCZWZvcmU6IG5vZGVfZWFjaEJlZm9yZSxcbiAgc3VtOiBub2RlX3N1bSxcbiAgc29ydDogbm9kZV9zb3J0LFxuICBwYXRoOiBub2RlX3BhdGgsXG4gIGFuY2VzdG9yczogbm9kZV9hbmNlc3RvcnMsXG4gIGRlc2NlbmRhbnRzOiBub2RlX2Rlc2NlbmRhbnRzLFxuICBsZWF2ZXM6IG5vZGVfbGVhdmVzLFxuICBsaW5rczogbm9kZV9saW5rcyxcbiAgY29weTogbm9kZV9jb3B5XG59O1xuIiwiZXhwb3J0IHZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHg7XG59XG4iLCJpbXBvcnQge3NsaWNlfSBmcm9tIFwiLi9hcnJheVwiO1xuaW1wb3J0IGlkZW50aXR5IGZyb20gXCIuL2lkZW50aXR5XCI7XG5cbnZhciB0b3AgPSAxLFxuICAgIHJpZ2h0ID0gMixcbiAgICBib3R0b20gPSAzLFxuICAgIGxlZnQgPSA0LFxuICAgIGVwc2lsb24gPSAxZS02O1xuXG5mdW5jdGlvbiB0cmFuc2xhdGVYKHgpIHtcbiAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgKHggKyAwLjUpICsgXCIsMClcIjtcbn1cblxuZnVuY3Rpb24gdHJhbnNsYXRlWSh5KSB7XG4gIHJldHVybiBcInRyYW5zbGF0ZSgwLFwiICsgKHkgKyAwLjUpICsgXCIpXCI7XG59XG5cbmZ1bmN0aW9uIG51bWJlcihzY2FsZSkge1xuICByZXR1cm4gZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiArc2NhbGUoZCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNlbnRlcihzY2FsZSkge1xuICB2YXIgb2Zmc2V0ID0gTWF0aC5tYXgoMCwgc2NhbGUuYmFuZHdpZHRoKCkgLSAxKSAvIDI7IC8vIEFkanVzdCBmb3IgMC41cHggb2Zmc2V0LlxuICBpZiAoc2NhbGUucm91bmQoKSkgb2Zmc2V0ID0gTWF0aC5yb3VuZChvZmZzZXQpO1xuICByZXR1cm4gZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiArc2NhbGUoZCkgKyBvZmZzZXQ7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGVudGVyaW5nKCkge1xuICByZXR1cm4gIXRoaXMuX19heGlzO1xufVxuXG5mdW5jdGlvbiBheGlzKG9yaWVudCwgc2NhbGUpIHtcbiAgdmFyIHRpY2tBcmd1bWVudHMgPSBbXSxcbiAgICAgIHRpY2tWYWx1ZXMgPSBudWxsLFxuICAgICAgdGlja0Zvcm1hdCA9IG51bGwsXG4gICAgICB0aWNrU2l6ZUlubmVyID0gNixcbiAgICAgIHRpY2tTaXplT3V0ZXIgPSA2LFxuICAgICAgdGlja1BhZGRpbmcgPSAzLFxuICAgICAgayA9IG9yaWVudCA9PT0gdG9wIHx8IG9yaWVudCA9PT0gbGVmdCA/IC0xIDogMSxcbiAgICAgIHggPSBvcmllbnQgPT09IGxlZnQgfHwgb3JpZW50ID09PSByaWdodCA/IFwieFwiIDogXCJ5XCIsXG4gICAgICB0cmFuc2Zvcm0gPSBvcmllbnQgPT09IHRvcCB8fCBvcmllbnQgPT09IGJvdHRvbSA/IHRyYW5zbGF0ZVggOiB0cmFuc2xhdGVZO1xuXG4gIGZ1bmN0aW9uIGF4aXMoY29udGV4dCkge1xuICAgIHZhciB2YWx1ZXMgPSB0aWNrVmFsdWVzID09IG51bGwgPyAoc2NhbGUudGlja3MgPyBzY2FsZS50aWNrcy5hcHBseShzY2FsZSwgdGlja0FyZ3VtZW50cykgOiBzY2FsZS5kb21haW4oKSkgOiB0aWNrVmFsdWVzLFxuICAgICAgICBmb3JtYXQgPSB0aWNrRm9ybWF0ID09IG51bGwgPyAoc2NhbGUudGlja0Zvcm1hdCA/IHNjYWxlLnRpY2tGb3JtYXQuYXBwbHkoc2NhbGUsIHRpY2tBcmd1bWVudHMpIDogaWRlbnRpdHkpIDogdGlja0Zvcm1hdCxcbiAgICAgICAgc3BhY2luZyA9IE1hdGgubWF4KHRpY2tTaXplSW5uZXIsIDApICsgdGlja1BhZGRpbmcsXG4gICAgICAgIHJhbmdlID0gc2NhbGUucmFuZ2UoKSxcbiAgICAgICAgcmFuZ2UwID0gK3JhbmdlWzBdICsgMC41LFxuICAgICAgICByYW5nZTEgPSArcmFuZ2VbcmFuZ2UubGVuZ3RoIC0gMV0gKyAwLjUsXG4gICAgICAgIHBvc2l0aW9uID0gKHNjYWxlLmJhbmR3aWR0aCA/IGNlbnRlciA6IG51bWJlcikoc2NhbGUuY29weSgpKSxcbiAgICAgICAgc2VsZWN0aW9uID0gY29udGV4dC5zZWxlY3Rpb24gPyBjb250ZXh0LnNlbGVjdGlvbigpIDogY29udGV4dCxcbiAgICAgICAgcGF0aCA9IHNlbGVjdGlvbi5zZWxlY3RBbGwoXCIuZG9tYWluXCIpLmRhdGEoW251bGxdKSxcbiAgICAgICAgdGljayA9IHNlbGVjdGlvbi5zZWxlY3RBbGwoXCIudGlja1wiKS5kYXRhKHZhbHVlcywgc2NhbGUpLm9yZGVyKCksXG4gICAgICAgIHRpY2tFeGl0ID0gdGljay5leGl0KCksXG4gICAgICAgIHRpY2tFbnRlciA9IHRpY2suZW50ZXIoKS5hcHBlbmQoXCJnXCIpLmF0dHIoXCJjbGFzc1wiLCBcInRpY2tcIiksXG4gICAgICAgIGxpbmUgPSB0aWNrLnNlbGVjdChcImxpbmVcIiksXG4gICAgICAgIHRleHQgPSB0aWNrLnNlbGVjdChcInRleHRcIik7XG5cbiAgICBwYXRoID0gcGF0aC5tZXJnZShwYXRoLmVudGVyKCkuaW5zZXJ0KFwicGF0aFwiLCBcIi50aWNrXCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJkb21haW5cIilcbiAgICAgICAgLmF0dHIoXCJzdHJva2VcIiwgXCIjMDAwXCIpKTtcblxuICAgIHRpY2sgPSB0aWNrLm1lcmdlKHRpY2tFbnRlcik7XG5cbiAgICBsaW5lID0gbGluZS5tZXJnZSh0aWNrRW50ZXIuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAuYXR0cihcInN0cm9rZVwiLCBcIiMwMDBcIilcbiAgICAgICAgLmF0dHIoeCArIFwiMlwiLCBrICogdGlja1NpemVJbm5lcikpO1xuXG4gICAgdGV4dCA9IHRleHQubWVyZ2UodGlja0VudGVyLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwiIzAwMFwiKVxuICAgICAgICAuYXR0cih4LCBrICogc3BhY2luZylcbiAgICAgICAgLmF0dHIoXCJkeVwiLCBvcmllbnQgPT09IHRvcCA/IFwiMGVtXCIgOiBvcmllbnQgPT09IGJvdHRvbSA/IFwiMC43MWVtXCIgOiBcIjAuMzJlbVwiKSk7XG5cbiAgICBpZiAoY29udGV4dCAhPT0gc2VsZWN0aW9uKSB7XG4gICAgICBwYXRoID0gcGF0aC50cmFuc2l0aW9uKGNvbnRleHQpO1xuICAgICAgdGljayA9IHRpY2sudHJhbnNpdGlvbihjb250ZXh0KTtcbiAgICAgIGxpbmUgPSBsaW5lLnRyYW5zaXRpb24oY29udGV4dCk7XG4gICAgICB0ZXh0ID0gdGV4dC50cmFuc2l0aW9uKGNvbnRleHQpO1xuXG4gICAgICB0aWNrRXhpdCA9IHRpY2tFeGl0LnRyYW5zaXRpb24oY29udGV4dClcbiAgICAgICAgICAuYXR0cihcIm9wYWNpdHlcIiwgZXBzaWxvbilcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBpc0Zpbml0ZShkID0gcG9zaXRpb24oZCkpID8gdHJhbnNmb3JtKGQpIDogdGhpcy5nZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIik7IH0pO1xuXG4gICAgICB0aWNrRW50ZXJcbiAgICAgICAgICAuYXR0cihcIm9wYWNpdHlcIiwgZXBzaWxvbilcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7IHZhciBwID0gdGhpcy5wYXJlbnROb2RlLl9fYXhpczsgcmV0dXJuIHRyYW5zZm9ybShwICYmIGlzRmluaXRlKHAgPSBwKGQpKSA/IHAgOiBwb3NpdGlvbihkKSk7IH0pO1xuICAgIH1cblxuICAgIHRpY2tFeGl0LnJlbW92ZSgpO1xuXG4gICAgcGF0aFxuICAgICAgICAuYXR0cihcImRcIiwgb3JpZW50ID09PSBsZWZ0IHx8IG9yaWVudCA9PSByaWdodFxuICAgICAgICAgICAgPyBcIk1cIiArIGsgKiB0aWNrU2l6ZU91dGVyICsgXCIsXCIgKyByYW5nZTAgKyBcIkgwLjVWXCIgKyByYW5nZTEgKyBcIkhcIiArIGsgKiB0aWNrU2l6ZU91dGVyXG4gICAgICAgICAgICA6IFwiTVwiICsgcmFuZ2UwICsgXCIsXCIgKyBrICogdGlja1NpemVPdXRlciArIFwiVjAuNUhcIiArIHJhbmdlMSArIFwiVlwiICsgayAqIHRpY2tTaXplT3V0ZXIpO1xuXG4gICAgdGlja1xuICAgICAgICAuYXR0cihcIm9wYWNpdHlcIiwgMSlcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gdHJhbnNmb3JtKHBvc2l0aW9uKGQpKTsgfSk7XG5cbiAgICBsaW5lXG4gICAgICAgIC5hdHRyKHggKyBcIjJcIiwgayAqIHRpY2tTaXplSW5uZXIpO1xuXG4gICAgdGV4dFxuICAgICAgICAuYXR0cih4LCBrICogc3BhY2luZylcbiAgICAgICAgLnRleHQoZm9ybWF0KTtcblxuICAgIHNlbGVjdGlvbi5maWx0ZXIoZW50ZXJpbmcpXG4gICAgICAgIC5hdHRyKFwiZmlsbFwiLCBcIm5vbmVcIilcbiAgICAgICAgLmF0dHIoXCJmb250LXNpemVcIiwgMTApXG4gICAgICAgIC5hdHRyKFwiZm9udC1mYW1pbHlcIiwgXCJzYW5zLXNlcmlmXCIpXG4gICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgb3JpZW50ID09PSByaWdodCA/IFwic3RhcnRcIiA6IG9yaWVudCA9PT0gbGVmdCA/IFwiZW5kXCIgOiBcIm1pZGRsZVwiKTtcblxuICAgIHNlbGVjdGlvblxuICAgICAgICAuZWFjaChmdW5jdGlvbigpIHsgdGhpcy5fX2F4aXMgPSBwb3NpdGlvbjsgfSk7XG4gIH1cblxuICBheGlzLnNjYWxlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHNjYWxlID0gXywgYXhpcykgOiBzY2FsZTtcbiAgfTtcblxuICBheGlzLnRpY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRpY2tBcmd1bWVudHMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cyksIGF4aXM7XG4gIH07XG5cbiAgYXhpcy50aWNrQXJndW1lbnRzID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHRpY2tBcmd1bWVudHMgPSBfID09IG51bGwgPyBbXSA6IHNsaWNlLmNhbGwoXyksIGF4aXMpIDogdGlja0FyZ3VtZW50cy5zbGljZSgpO1xuICB9O1xuXG4gIGF4aXMudGlja1ZhbHVlcyA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh0aWNrVmFsdWVzID0gXyA9PSBudWxsID8gbnVsbCA6IHNsaWNlLmNhbGwoXyksIGF4aXMpIDogdGlja1ZhbHVlcyAmJiB0aWNrVmFsdWVzLnNsaWNlKCk7XG4gIH07XG5cbiAgYXhpcy50aWNrRm9ybWF0ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHRpY2tGb3JtYXQgPSBfLCBheGlzKSA6IHRpY2tGb3JtYXQ7XG4gIH07XG5cbiAgYXhpcy50aWNrU2l6ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh0aWNrU2l6ZUlubmVyID0gdGlja1NpemVPdXRlciA9ICtfLCBheGlzKSA6IHRpY2tTaXplSW5uZXI7XG4gIH07XG5cbiAgYXhpcy50aWNrU2l6ZUlubmVyID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHRpY2tTaXplSW5uZXIgPSArXywgYXhpcykgOiB0aWNrU2l6ZUlubmVyO1xuICB9O1xuXG4gIGF4aXMudGlja1NpemVPdXRlciA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh0aWNrU2l6ZU91dGVyID0gK18sIGF4aXMpIDogdGlja1NpemVPdXRlcjtcbiAgfTtcblxuICBheGlzLnRpY2tQYWRkaW5nID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHRpY2tQYWRkaW5nID0gK18sIGF4aXMpIDogdGlja1BhZGRpbmc7XG4gIH07XG5cbiAgcmV0dXJuIGF4aXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBheGlzVG9wKHNjYWxlKSB7XG4gIHJldHVybiBheGlzKHRvcCwgc2NhbGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXhpc1JpZ2h0KHNjYWxlKSB7XG4gIHJldHVybiBheGlzKHJpZ2h0LCBzY2FsZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBheGlzQm90dG9tKHNjYWxlKSB7XG4gIHJldHVybiBheGlzKGJvdHRvbSwgc2NhbGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXhpc0xlZnQoc2NhbGUpIHtcbiAgcmV0dXJuIGF4aXMobGVmdCwgc2NhbGUpO1xufVxuIiwiLy8gQ29weXJpZ2h0IDIwMTEgSmFzb24gRGF2aWVzIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbmRhdmllcy9uZXdpY2suanNcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTmV3aWNrKHMpIHtcbiAgICB2YXIgYW5jZXN0b3JzID0gW107XG4gICAgdmFyIHRyZWUgPSB7fTtcbiAgICB2YXIgdG9rZW5zID0gcy5zcGxpdCgvXFxzKig7fFxcKHxcXCl8LHw6KVxccyovKTtcbiAgICBmb3IgKHZhciBpPTA7IGk8dG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdG9rZW4gPSB0b2tlbnNbaV07XG4gICAgICBzd2l0Y2ggKHRva2VuKSB7XG4gICAgICAgIGNhc2UgJygnOiAvLyBuZXcgYnJhbmNoc2V0XG4gICAgICAgICAgdmFyIHN1YnRyZWUgPSB7fTtcbiAgICAgICAgICB0cmVlLmJyYW5jaHNldCA9IFtzdWJ0cmVlXTtcbiAgICAgICAgICBhbmNlc3RvcnMucHVzaCh0cmVlKTtcbiAgICAgICAgICB0cmVlID0gc3VidHJlZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnLCc6IC8vIGFub3RoZXIgYnJhbmNoXG4gICAgICAgICAgdmFyIHN1YnRyZWUgPSB7fTtcbiAgICAgICAgICBhbmNlc3RvcnNbYW5jZXN0b3JzLmxlbmd0aC0xXS5icmFuY2hzZXQucHVzaChzdWJ0cmVlKTtcbiAgICAgICAgICB0cmVlID0gc3VidHJlZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnKSc6IC8vIG9wdGlvbmFsIG5hbWUgbmV4dFxuICAgICAgICAgIHRyZWUgPSBhbmNlc3RvcnMucG9wKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzonOiAvLyBvcHRpb25hbCBsZW5ndGggbmV4dFxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHZhciB4ID0gdG9rZW5zW2ktMV07XG4gICAgICAgICAgaWYgKHggPT0gJyknIHx8IHggPT0gJygnIHx8IHggPT0gJywnKSB7XG4gICAgICAgICAgICB0cmVlLm5hbWUgPSB0b2tlbjtcbiAgICAgICAgICB9IGVsc2UgaWYgKHggPT0gJzonKSB7XG4gICAgICAgICAgICB0cmVlLmxlbmd0aCA9IHBhcnNlRmxvYXQodG9rZW4pO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRyZWU7XG59XG5cbiIsIi8qXG4gICAgRGVuZHJvZ3JhbSB2aXN1YWxpemVzIGEgdGV4dC1iYXNlZCBOZXdpY2sgdHJlZSB1c2luZyBEMyBWNC5cblxuICAgIGRlcGVuZGVuY2llczpcbiAgICBkMyB2NFxuICAgIHRoZSBuZXdpY2sgcGFyc2VyOiBuZXdpY2suanNcblxuICAgIHJlZmVyZW5jZXM6XG4gICAgaHR0cHM6Ly9naXRodWIuY29tL2QzL2QzLWhpZXJhcmNoeVxuICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbmRhdmllcy9uZXdpY2suanMvXG5cbiAgICBub3RlcyBvbiB0aGUgdW5kZXJseWluZyBkYXRhIHN0cnVjdHVyZXM6XG4gICAgLSBpdCB1c2VzIHBhcnNlTmV3aWNrKCkgdG8gY29udmVydCB0aGUgbmV3aWNrIHRyZWUgaW50byB0aGUgZm9sbG93aW5nIGpzb246XG4gICAgICAgIHtcbiAgICAgICAgICAgIGJyYW5jaHNldDpbY2hpbGQgbm9kZSBqc29uIG9iamVjdHNdLFxuICAgICAgICAgICAgbmFtZTogXCJcIiAvLyBpbnRlcm5hbCBub2RlcyB3b3VsZCBoYXZlIG5vIHJlYWwgbGFiZWxzXG4gICAgICAgIH1cbiAgICAgICBUaGlzIGpzb24gc3RydWN0dXJlIGlzIHRoZSBpbnB1dCBkYXRhIG9mIGQzLmhpZXJhcmNoeSgpXG5cbiAgICAtIEluIHRoZSBkMy5oaWVyYXJjaHkoKSwgdGhlIHJvb3Qgbm9kZSBvYmplY3QgaGFzIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxuICAgICAgICB7XG4gICAgICAgICAgICBjaGlsZHJlbjogW2NvLCBjb10sXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgYnJhbmNoc2V0OiBBcnJheSgyKSxcbiAgICAgICAgICAgICAgICBuYW1lOiBcIm5vZGUgbmFtZVwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVwdGg6IDAsXG4gICAgICAgICAgICBoZWlnaHQ6IGludGVnZXIsXG4gICAgICAgICAgICBwYXJlbnQ6IG51bGwsXG4gICAgICAgICAgICB2YWx1ZTogOVxuICAgICAgICB9XG4gKi9cblxuLy8gVE9ETzogZWxpbWluYXRlIGhhcmQtY29kZWQgdmFsdWVzXG5cbmltcG9ydCB7aGllcmFyY2h5fSBmcm9tIFwiZDMtaGllcmFyY2h5XCI7XG5pbXBvcnQge2FzY2VuZGluZ30gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge2F4aXNCb3R0b20sIGF4aXNMZWZ0fSBmcm9tIFwiZDMtYXhpc1wiO1xuaW1wb3J0IHtzY2FsZUxpbmVhciwgc2NhbGVCYW5kfSBmcm9tIFwiZDMtc2NhbGVcIjtcblxuaW1wb3J0IHtwYXJzZU5ld2lja30gZnJvbSBcIi4uL2V4dGVybmFsL25ld2lja1wiO1xuY29uc3QgdmVyYm9zZSA9IGZhbHNlO1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGVuZHJvZ3JhbSB7XG5cbiAgICBjb25zdHJ1Y3RvcihuZXdpY2ssIG9yaWVudGF0aW9uPSdoJyl7XG4gICAgICAgIHRoaXMubmV3aWNrID0gbmV3aWNrO1xuICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gb3JpZW50YXRpb247XG5cbiAgICAgICAgdGhpcy5wb3N0b3JkZXIgPSBbXTtcbiAgICAgICAgdGhpcy5yb290ID0gaGllcmFyY2h5KHBhcnNlTmV3aWNrKG5ld2ljayksIChkKSA9PiBkLmJyYW5jaHNldClcbiAgICAgICAgICAgIC5zdW0oKGQpPT5kLmJyYW5jaHNldD8wOjEpXG4gICAgICAgICAgICAuc29ydCgoYSxiKT0+YS52YWx1ZS1iLnZhbHVlfHxhLmRhdGEubGVuZ3RoLWIuZGF0YS5sZW5ndGgpO1xuICAgICAgICB0aGlzLmxlYXZlcyA9IHRoaXMucm9vdC5sZWF2ZXMoKS5zb3J0KChhLCBiKSA9PiAoYS52YWx1ZSAtIGIudmFsdWUpIHx8IGFzY2VuZGluZyhhLmRhdGEubGVuZ3RoLCBiLmRhdGEubGVuZ3RoKSk7XG5cbiAgICAgICAgdGhpcy53aWR0aCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5oZWlnaHQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMueFNjYWxlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnlTY2FsZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBkcmF3KGRvbSwgd2lkdGgsIGhlaWdodCl7XG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuX3NldFhTY2FsZSgpO1xuICAgICAgICB0aGlzLl9zZXRZU2NhbGUoKTtcbiAgICAgICAgaWYgKCdoJyA9PSB0aGlzLm9yaWVudGF0aW9uKSB0aGlzLl9kcmF3SFRyZWUoZG9tKTtcbiAgICAgICAgZWxzZSB0aGlzLl9kcmF3VlRyZWUoZG9tKTtcbiAgICB9XG5cbiAgICAvLy8vLy8vIHByaXZhdGUgbWV0aG9kcyAvLy8vLy8vXG5cbiAgICBfZHJhd0hUcmVlKGRvbSl7XG4gICAgICAgIGNvbnN0IHNldFkgPSAobm9kZSkgPT4ge1xuICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIGEgbGVhZiBub2RlXG4gICAgICAgICAgICAgICAgbm9kZS55ID0gdGhpcy55U2NhbGUobm9kZS5kYXRhLm5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBhbiBpbnRlcm5hbCBub2RlXG4gICAgICAgICAgICAgICAgLy8gdGhlIHkgY29vcmRpbmF0ZSBvZiBhbiBpbnRlcm5hbCBub2RlIGlzIHRoZSBhdmVyYWdlIHkgZnJvbSBpdHMgY2hpbGRyZW5cbiAgICAgICAgICAgICAgICBub2RlLnkgPSBub2RlLmNoaWxkcmVuLnJlZHVjZSgoc3VtLCBkKT0+c3VtK2QueSwgMCkvbm9kZS5jaGlsZHJlbi5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNldFggPSAobm9kZSkgPT4ge1xuICAgICAgICAgICAgbm9kZS54ID0gdGhpcy54U2NhbGUodGhpcy5fZ2V0QnJhbmNoTGVuZ3RoVG9Sb290KG5vZGUpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBmcm9tIHRoZSBsZWFmIGxldmVsIC0+IHJvb3RcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0aGlzLl9zb3J0Tm9kZXNCeUxldmVsKCk7XG4gICAgICAgIG5vZGVzLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgICAgICAgIHNldFgobm9kZSk7XG4gICAgICAgICAgICBzZXRZKG5vZGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICBkb20uc2VsZWN0QWxsKCcuYnJhbmNoJylcbiAgICAgICAgICAgIC5kYXRhKG5vZGVzKVxuICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCAoZCkgPT4gZC54KVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCAoZCkgPT4gZC5kYXRhLmxlbmd0aD9kLnggLSB0aGlzLnhTY2FsZShkLmRhdGEubGVuZ3RoKTpkLngpXG4gICAgICAgICAgICAuYXR0cihcInkxXCIsIChkKSA9PiBkLnkgKyB0aGlzLnlTY2FsZS5iYW5kd2lkdGgoKS8yKVxuICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCAoZCkgPT4gZC55ICsgdGhpcy55U2NhbGUuYmFuZHdpZHRoKCkvMilcbiAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwiZ3JheVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwgMSk7XG5cbiAgICAgICAgLy8gZm9yIGFsbCBpbnRlcm5hbCBub2Rlc1xuICAgICAgICAvLyBUT0RPOiB3cml0ZSBhIHJlY3Vyc2l2ZSBmdW5jdGlvbiB0byBkcmF3IHRoZSBhcm1zIGFuZCBub2Rlc1xuICAgICAgICBjb25zdCBpbm9kZXMgPSB0aGlzLnJvb3QuZGVzY2VuZGFudHMoKS5maWx0ZXIoKGQpPT5kLmhlaWdodCkuc29ydCgoYSxiKT0+Yi5oZWlnaHQtYS5oZWlnaHQpO1xuICAgICAgICBkb20uc2VsZWN0QWxsKCcuYXJtJylcbiAgICAgICAgICAgIC5kYXRhKGlub2RlcylcbiAgICAgICAgICAgIC5lbnRlcigpLmFwcGVuZChcImxpbmVcIilcbiAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgKGQpID0+IGQueClcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgKGQpID0+IGQueClcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgKGQpID0+IGQuY2hpbGRyZW5bMF0ueSArIHRoaXMueVNjYWxlLmJhbmR3aWR0aCgpLzIpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIChkKSA9PiBkLmNoaWxkcmVuWzFdLnkgKyB0aGlzLnlTY2FsZS5iYW5kd2lkdGgoKS8yKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIiwgXCJncmF5XCIpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAxKTtcblxuICAgICAgICBkb20uc2VsZWN0QWxsKCcubm9kZScpXG4gICAgICAgICAgICAuZGF0YShpbm9kZXMpXG4gICAgICAgICAgICAuZW50ZXIoKS5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY3hcIiwgKGQpID0+IGQueClcbiAgICAgICAgICAgIC5hdHRyKFwiY3lcIiwgKGQpID0+IGQueSArIHRoaXMueVNjYWxlLmJhbmR3aWR0aCgpLzIpXG4gICAgICAgICAgICAuYXR0cihcInJcIiwgMilcbiAgICAgICAgICAgIC8vIC5hdHRyKFwiZmlsbFwiLCBcIiM4RENEQzFcIikgLy8gVE9ETzogZWxpbWluYXRlIGhhcmQtY29kZWQgdmFsdWUsIHVzZSBjc3MgY2xhc3NcbiAgICAgICAgICAgIC8vIC5hdHRyKFwiZmlsbFwiLCBcIiM0Yjg2OTlcIilcbiAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgJyMzMzMnKVxuICAgICAgICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsIDAuNSlcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJkZW5kcm9ncmFtLW5vZGVcIilcbiAgICAgICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuYXR0cihcInJcIiwgMyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZC5sZWF2ZXMoKSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLmF0dHIoXCJyXCIsIDIpXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBheGlzXG4gICAgICAgIC8vIEFkZCB0aGUgeCBBeGlzXG4gICAgICAgIGRvbS5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiZGVuZHJvZ3JhbS1heGlzXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLFwiICsgdGhpcy5oZWlnaHQgKyBcIilcIilcbiAgICAgICAgICAgIC5jYWxsKFxuICAgICAgICAgICAgICAgIGF4aXNCb3R0b20odGhpcy54U2NhbGUpXG4gICAgICAgICAgICAgICAgICAgIC50aWNrcygzKVxuICAgICAgICAgICAgICAgIC8vIC50aWNrVmFsdWVzKFtNYXRoLmZsb29yKHRoaXMuX2dldE1heEJyYW5jaExlbmd0aCgpLzIpLCBNYXRoLmZsb29yKHRoaXMuX2dldE1heEJyYW5jaExlbmd0aCgpKV0pXG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIF9zb3J0Tm9kZXNCeUxldmVsKCl7XG4gICAgICAgIC8vIHJldHVybnMgYSBsaXN0IG9mIG5vZGVzIG9yZGVyZWQgYnkgYW5jZXN0cmFsIGxldmVsLCB0aGVuIGJ5IGJyYW5jaCBsZW5ndGhcbiAgICAgICAgcmV0dXJuIHRoaXMucm9vdC5kZXNjZW5kYW50cygpLnNvcnQoKGEsIGIpID0+IChhLmhlaWdodCAtIGIuaGVpZ2h0KSB8fCBhc2NlbmRpbmcoYS5kYXRhLmxlbmd0aCwgYi5kYXRhLmxlbmd0aCkpO1xuICAgIH1cblxuICAgIF9kcmF3VlRyZWUoZG9tKXtcbiAgICAgICAgY29uc3Qgc2V0WCA9IChub2RlKSA9PiB7XG4gICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgLy8gYSBsZWFmIG5vZGVcbiAgICAgICAgICAgICAgICBub2RlLnggPSB0aGlzLnhTY2FsZShub2RlLmRhdGEubmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGFuIGludGVybmFsIG5vZGVcbiAgICAgICAgICAgICAgICAvLyB0aGUgeSBjb29yZGluYXRlIG9mIGFuIGludGVybmFsIG5vZGUgaXMgdGhlIGF2ZXJhZ2UgeSBmcm9tIGl0cyBjaGlsZHJlblxuICAgICAgICAgICAgICAgIG5vZGUueCA9IG5vZGUuY2hpbGRyZW4ucmVkdWNlKChzdW0sIGQpPT5zdW0rZC54LCAwKS9ub2RlLmNoaWxkcmVuLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc2V0WSA9IChub2RlKSA9PiB7XG4gICAgICAgICAgICBub2RlLnkgPSB0aGlzLnlTY2FsZSh0aGlzLl9nZXRCcmFuY2hMZW5ndGhUb1Jvb3Qobm9kZSkpO1xuICAgICAgICB9O1xuICAgICAgICAvLyBmcm9tIHRoZSBsZWFmIGxldmVsIC0+IHJvb3RcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0aGlzLl9zb3J0Tm9kZXNCeUxldmVsKCk7XG4gICAgICAgIG5vZGVzLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgICAgICAgIHNldFgobm9kZSk7XG4gICAgICAgICAgICBzZXRZKG5vZGUpO1xuICAgICAgICB9KTtcbiAgICAgICAgZG9tLnNlbGVjdEFsbCgnLmJyYW5jaCcpXG4gICAgICAgICAgICAuZGF0YShub2RlcylcbiAgICAgICAgICAgIC5lbnRlcigpLmFwcGVuZChcImxpbmVcIilcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgKGQpID0+IGQueSlcbiAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgKGQpID0+IGQuZGF0YS5sZW5ndGg/ZC55IC0gdGhpcy55U2NhbGUoZC5kYXRhLmxlbmd0aCk6ZC55KVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCAoZCkgPT4gZC54ICsgdGhpcy54U2NhbGUuYmFuZHdpZHRoKCkvMilcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgKGQpID0+IGQueCArIHRoaXMueFNjYWxlLmJhbmR3aWR0aCgpLzIpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLCBcImdyYXlcIilcbiAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIDEpO1xuXG4gICAgICAgIC8vIGZvciBhbGwgaW50ZXJuYWwgbm9kZXNcbiAgICAgICAgY29uc3QgaW5vZGVzID0gdGhpcy5yb290LmRlc2NlbmRhbnRzKCkuZmlsdGVyKChkKT0+ZC5oZWlnaHQpLnNvcnQoKGEsYik9PmIuaGVpZ2h0LWEuaGVpZ2h0KTtcbiAgICAgICAgZG9tLnNlbGVjdEFsbCgnLmFybScpXG4gICAgICAgICAgICAuZGF0YShpbm9kZXMpXG4gICAgICAgICAgICAuZW50ZXIoKS5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAgICAgICAuYXR0cihcInkxXCIsIChkKSA9PiBkLnkpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIChkKSA9PiBkLnkpXG4gICAgICAgICAgICAuYXR0cihcIngxXCIsIChkKSA9PiBkLmNoaWxkcmVuWzBdLnggKyB0aGlzLnhTY2FsZS5iYW5kd2lkdGgoKS8yKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCAoZCkgPT4gZC5jaGlsZHJlblsxXS54ICsgdGhpcy54U2NhbGUuYmFuZHdpZHRoKCkvMilcbiAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwiZ3JheVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwgMSk7XG5cbiAgICAgICAgZG9tLnNlbGVjdEFsbCgnLm5vZGUnKVxuICAgICAgICAgICAgLmRhdGEoaW5vZGVzKVxuICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwiY2lyY2xlXCIpXG4gICAgICAgICAgICAuYXR0cihcImN4XCIsIChkKSA9PiBkLnggKyB0aGlzLnhTY2FsZS5iYW5kd2lkdGgoKS8yKVxuICAgICAgICAgICAgLmF0dHIoXCJjeVwiLCAoZCkgPT4gZC55KVxuICAgICAgICAgICAgLmF0dHIoXCJyXCIsIDIpXG4gICAgICAgICAgICAvLyAuYXR0cihcImZpbGxcIiwgXCIjOERDREMxXCIpXG4gICAgICAgICAgICAvLyAuYXR0cihcImZpbGxcIiwgXCIjNGI4Njk5XCIpXG4gICAgICAgICAgICAuYXR0cignZmlsbCcsICcjMzMzJylcbiAgICAgICAgICAgIC5hdHRyKFwib3BhY2l0eVwiLCAwLjUpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiZGVuZHJvZ3JhbS1ub2RlXCIpXG4gICAgICAgICAgICAub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLmF0dHIoXCJyXCIsIDMpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGQubGVhdmVzKCkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbihcIm1vdXNlb3V0XCIsIGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5hdHRyKFwiclwiLCAyKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gYXhpc1xuICAgICAgICAvLyBBZGQgdGhlIHggQXhpc1xuICAgICAgICBkb20uYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgLy8gLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgke3RoaXMud2lkdGh9LCAwKWApXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiZGVuZHJvZ3JhbS1heGlzXCIpXG4gICAgICAgICAgICAuY2FsbChcbiAgICAgICAgICAgICAgICBheGlzTGVmdCh0aGlzLnlTY2FsZSlcbiAgICAgICAgICAgICAgICAudGlja1ZhbHVlcyhbTWF0aC5mbG9vcih0aGlzLl9nZXRNYXhCcmFuY2hMZW5ndGgoKS8yKSwgTWF0aC5mbG9vcih0aGlzLl9nZXRNYXhCcmFuY2hMZW5ndGgoKSldKVxuICAgICAgICAgICAgKTtcblxuICAgIH1cblxuICAgIF9nZXRCcmFuY2hMZW5ndGhUb1Jvb3Qobm9kZSkge1xuICAgICAgICAvLyBub2RlOiBhIGQzLmhpZXJhcmNoeSBub2RlXG4gICAgICAgIHJldHVybiBub2RlLnBhdGgodGhpcy5yb290KVxuICAgICAgICAgICAgLnJlZHVjZSgoc3VtLCBkKSA9PiBkLmRhdGEubGVuZ3RoP3N1bStkLmRhdGEubGVuZ3RoOnN1bSwgMCk7XG4gICAgfVxuXG4gICAgX2dldE1heEJyYW5jaExlbmd0aCgpIHtcbiAgICAgICAgLy8gdGhlIGFzc3VtcHRpb24gaGVyZSBpcyB0aGF0IGFsbCBsZWFmIG5vZGVzIGhhdmUgdGhlIHNhbWUgZGlzdGFuY2UgdG8gdGhlIHJvb3QuXG4gICAgICAgIGxldCBub2RlID0gdGhpcy5sZWF2ZXNbMF07IC8vIHJhbmRvbWx5IHBpY2tzIGEgbGVhZiBub2RlXG4gICAgICAgIHJldHVybiB0aGlzLl9nZXRCcmFuY2hMZW5ndGhUb1Jvb3Qobm9kZSk7XG4gICAgfVxuXG4gICAgX2Fzc2lnblBvc3RvcmRlcihub2RlKXtcbiAgICAgICAgLy8gYXNzaWducyBwb3N0LW9yZGVyIG9mIGFsbCBsZWFmIG5vZGVzXG4gICAgICAgIGlmKG5vZGUuY2hpbGRyZW4gPT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAvLyBiYXNlIGNhc2VcbiAgICAgICAgICAgIHRoaXMucG9zdG9yZGVyLnB1c2gobm9kZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9hc3NpZ25Qb3N0b3JkZXIobm9kZS5jaGlsZHJlblswXSk7XG4gICAgICAgICAgICB0aGlzLl9hc3NpZ25Qb3N0b3JkZXIobm9kZS5jaGlsZHJlblsxXSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBfc2V0WFNjYWxlKCl7XG4gICAgICAgIGlmICgnaCcgPT0gdGhpcy5vcmllbnRhdGlvbil7XG4gICAgICAgICAgICB0aGlzLnhTY2FsZSA9IHNjYWxlTGluZWFyKClcbiAgICAgICAgICAgICAgICAuZG9tYWluKFswLCB0aGlzLl9nZXRNYXhCcmFuY2hMZW5ndGgoKV0pXG4gICAgICAgICAgICAgICAgLnJhbmdlKFswLCB0aGlzLndpZHRoXSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2Fzc2lnblBvc3RvcmRlcih0aGlzLnJvb3QpO1xuICAgICAgICAgICAgaWYgKHZlcmJvc2UpIGNvbnNvbGUubG9nKHRoaXMucG9zdG9yZGVyKTtcbiAgICAgICAgICAgIHRoaXMueFNjYWxlID0gc2NhbGVCYW5kKClcbiAgICAgICAgICAgICAgICAuZG9tYWluKHRoaXMucG9zdG9yZGVyLm1hcCgoZCkgPT4gZC5kYXRhLm5hbWUpKVxuICAgICAgICAgICAgICAgIC5yYW5nZShbMCwgdGhpcy53aWR0aF0pXG4gICAgICAgICAgICAgICAgLnBhZGRpbmcoLjA1KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9zZXRZU2NhbGUoKXtcbiAgICAgICAgaWYgKCdoJyA9PSB0aGlzLm9yaWVudGF0aW9uKXtcbiAgICAgICAgICAgIHRoaXMuX2Fzc2lnblBvc3RvcmRlcih0aGlzLnJvb3QpO1xuICAgICAgICAgICAgaWYgKHZlcmJvc2UpIGNvbnNvbGUubG9nKHRoaXMucG9zdG9yZGVyKTtcbiAgICAgICAgICAgIHRoaXMueVNjYWxlID0gc2NhbGVCYW5kKClcbiAgICAgICAgICAgICAgICAuZG9tYWluKHRoaXMucG9zdG9yZGVyLm1hcCgoZCkgPT4gZC5kYXRhLm5hbWUpKVxuICAgICAgICAgICAgICAgIC5yYW5nZShbMCwgdGhpcy5oZWlnaHRdKVxuICAgICAgICAgICAgICAgIC5wYWRkaW5nKC4wNSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnlTY2FsZSA9IHNjYWxlTGluZWFyKClcbiAgICAgICAgICAgICAgICAuZG9tYWluKFswLCB0aGlzLl9nZXRNYXhCcmFuY2hMZW5ndGgoKV0pXG4gICAgICAgICAgICAgICAgLnJhbmdlKFswLCB0aGlzLmhlaWdodF0pXG4gICAgICAgIH1cbiAgICB9XG5cbn0iLCJ2YXIgbm9vcCA9IHt2YWx1ZTogZnVuY3Rpb24oKSB7fX07XG5cbmZ1bmN0aW9uIGRpc3BhdGNoKCkge1xuICBmb3IgKHZhciBpID0gMCwgbiA9IGFyZ3VtZW50cy5sZW5ndGgsIF8gPSB7fSwgdDsgaSA8IG47ICsraSkge1xuICAgIGlmICghKHQgPSBhcmd1bWVudHNbaV0gKyBcIlwiKSB8fCAodCBpbiBfKSkgdGhyb3cgbmV3IEVycm9yKFwiaWxsZWdhbCB0eXBlOiBcIiArIHQpO1xuICAgIF9bdF0gPSBbXTtcbiAgfVxuICByZXR1cm4gbmV3IERpc3BhdGNoKF8pO1xufVxuXG5mdW5jdGlvbiBEaXNwYXRjaChfKSB7XG4gIHRoaXMuXyA9IF87XG59XG5cbmZ1bmN0aW9uIHBhcnNlVHlwZW5hbWVzKHR5cGVuYW1lcywgdHlwZXMpIHtcbiAgcmV0dXJuIHR5cGVuYW1lcy50cmltKCkuc3BsaXQoL158XFxzKy8pLm1hcChmdW5jdGlvbih0KSB7XG4gICAgdmFyIG5hbWUgPSBcIlwiLCBpID0gdC5pbmRleE9mKFwiLlwiKTtcbiAgICBpZiAoaSA+PSAwKSBuYW1lID0gdC5zbGljZShpICsgMSksIHQgPSB0LnNsaWNlKDAsIGkpO1xuICAgIGlmICh0ICYmICF0eXBlcy5oYXNPd25Qcm9wZXJ0eSh0KSkgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlOiBcIiArIHQpO1xuICAgIHJldHVybiB7dHlwZTogdCwgbmFtZTogbmFtZX07XG4gIH0pO1xufVxuXG5EaXNwYXRjaC5wcm90b3R5cGUgPSBkaXNwYXRjaC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBEaXNwYXRjaCxcbiAgb246IGZ1bmN0aW9uKHR5cGVuYW1lLCBjYWxsYmFjaykge1xuICAgIHZhciBfID0gdGhpcy5fLFxuICAgICAgICBUID0gcGFyc2VUeXBlbmFtZXModHlwZW5hbWUgKyBcIlwiLCBfKSxcbiAgICAgICAgdCxcbiAgICAgICAgaSA9IC0xLFxuICAgICAgICBuID0gVC5sZW5ndGg7XG5cbiAgICAvLyBJZiBubyBjYWxsYmFjayB3YXMgc3BlY2lmaWVkLCByZXR1cm4gdGhlIGNhbGxiYWNrIG9mIHRoZSBnaXZlbiB0eXBlIGFuZCBuYW1lLlxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgodCA9ICh0eXBlbmFtZSA9IFRbaV0pLnR5cGUpICYmICh0ID0gZ2V0KF9bdF0sIHR5cGVuYW1lLm5hbWUpKSkgcmV0dXJuIHQ7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgYSB0eXBlIHdhcyBzcGVjaWZpZWQsIHNldCB0aGUgY2FsbGJhY2sgZm9yIHRoZSBnaXZlbiB0eXBlIGFuZCBuYW1lLlxuICAgIC8vIE90aGVyd2lzZSwgaWYgYSBudWxsIGNhbGxiYWNrIHdhcyBzcGVjaWZpZWQsIHJlbW92ZSBjYWxsYmFja3Mgb2YgdGhlIGdpdmVuIG5hbWUuXG4gICAgaWYgKGNhbGxiYWNrICE9IG51bGwgJiYgdHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgY2FsbGJhY2s6IFwiICsgY2FsbGJhY2spO1xuICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICBpZiAodCA9ICh0eXBlbmFtZSA9IFRbaV0pLnR5cGUpIF9bdF0gPSBzZXQoX1t0XSwgdHlwZW5hbWUubmFtZSwgY2FsbGJhY2spO1xuICAgICAgZWxzZSBpZiAoY2FsbGJhY2sgPT0gbnVsbCkgZm9yICh0IGluIF8pIF9bdF0gPSBzZXQoX1t0XSwgdHlwZW5hbWUubmFtZSwgbnVsbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGNvcHk6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb3B5ID0ge30sIF8gPSB0aGlzLl87XG4gICAgZm9yICh2YXIgdCBpbiBfKSBjb3B5W3RdID0gX1t0XS5zbGljZSgpO1xuICAgIHJldHVybiBuZXcgRGlzcGF0Y2goY29weSk7XG4gIH0sXG4gIGNhbGw6IGZ1bmN0aW9uKHR5cGUsIHRoYXQpIHtcbiAgICBpZiAoKG4gPSBhcmd1bWVudHMubGVuZ3RoIC0gMikgPiAwKSBmb3IgKHZhciBhcmdzID0gbmV3IEFycmF5KG4pLCBpID0gMCwgbiwgdDsgaSA8IG47ICsraSkgYXJnc1tpXSA9IGFyZ3VtZW50c1tpICsgMl07XG4gICAgaWYgKCF0aGlzLl8uaGFzT3duUHJvcGVydHkodHlwZSkpIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZTogXCIgKyB0eXBlKTtcbiAgICBmb3IgKHQgPSB0aGlzLl9bdHlwZV0sIGkgPSAwLCBuID0gdC5sZW5ndGg7IGkgPCBuOyArK2kpIHRbaV0udmFsdWUuYXBwbHkodGhhdCwgYXJncyk7XG4gIH0sXG4gIGFwcGx5OiBmdW5jdGlvbih0eXBlLCB0aGF0LCBhcmdzKSB7XG4gICAgaWYgKCF0aGlzLl8uaGFzT3duUHJvcGVydHkodHlwZSkpIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZTogXCIgKyB0eXBlKTtcbiAgICBmb3IgKHZhciB0ID0gdGhpcy5fW3R5cGVdLCBpID0gMCwgbiA9IHQubGVuZ3RoOyBpIDwgbjsgKytpKSB0W2ldLnZhbHVlLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBnZXQodHlwZSwgbmFtZSkge1xuICBmb3IgKHZhciBpID0gMCwgbiA9IHR5cGUubGVuZ3RoLCBjOyBpIDwgbjsgKytpKSB7XG4gICAgaWYgKChjID0gdHlwZVtpXSkubmFtZSA9PT0gbmFtZSkge1xuICAgICAgcmV0dXJuIGMudmFsdWU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNldCh0eXBlLCBuYW1lLCBjYWxsYmFjaykge1xuICBmb3IgKHZhciBpID0gMCwgbiA9IHR5cGUubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgaWYgKHR5cGVbaV0ubmFtZSA9PT0gbmFtZSkge1xuICAgICAgdHlwZVtpXSA9IG5vb3AsIHR5cGUgPSB0eXBlLnNsaWNlKDAsIGkpLmNvbmNhdCh0eXBlLnNsaWNlKGkgKyAxKSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgaWYgKGNhbGxiYWNrICE9IG51bGwpIHR5cGUucHVzaCh7bmFtZTogbmFtZSwgdmFsdWU6IGNhbGxiYWNrfSk7XG4gIHJldHVybiB0eXBlO1xufVxuXG5leHBvcnQgZGVmYXVsdCBkaXNwYXRjaDtcbiIsInZhciBmcmFtZSA9IDAsIC8vIGlzIGFuIGFuaW1hdGlvbiBmcmFtZSBwZW5kaW5nP1xuICAgIHRpbWVvdXQgPSAwLCAvLyBpcyBhIHRpbWVvdXQgcGVuZGluZz9cbiAgICBpbnRlcnZhbCA9IDAsIC8vIGFyZSBhbnkgdGltZXJzIGFjdGl2ZT9cbiAgICBwb2tlRGVsYXkgPSAxMDAwLCAvLyBob3cgZnJlcXVlbnRseSB3ZSBjaGVjayBmb3IgY2xvY2sgc2tld1xuICAgIHRhc2tIZWFkLFxuICAgIHRhc2tUYWlsLFxuICAgIGNsb2NrTGFzdCA9IDAsXG4gICAgY2xvY2tOb3cgPSAwLFxuICAgIGNsb2NrU2tldyA9IDAsXG4gICAgY2xvY2sgPSB0eXBlb2YgcGVyZm9ybWFuY2UgPT09IFwib2JqZWN0XCIgJiYgcGVyZm9ybWFuY2Uubm93ID8gcGVyZm9ybWFuY2UgOiBEYXRlLFxuICAgIHNldEZyYW1lID0gdHlwZW9mIHdpbmRvdyA9PT0gXCJvYmplY3RcIiAmJiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID8gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZS5iaW5kKHdpbmRvdykgOiBmdW5jdGlvbihmKSB7IHNldFRpbWVvdXQoZiwgMTcpOyB9O1xuXG5leHBvcnQgZnVuY3Rpb24gbm93KCkge1xuICByZXR1cm4gY2xvY2tOb3cgfHwgKHNldEZyYW1lKGNsZWFyTm93KSwgY2xvY2tOb3cgPSBjbG9jay5ub3coKSArIGNsb2NrU2tldyk7XG59XG5cbmZ1bmN0aW9uIGNsZWFyTm93KCkge1xuICBjbG9ja05vdyA9IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBUaW1lcigpIHtcbiAgdGhpcy5fY2FsbCA9XG4gIHRoaXMuX3RpbWUgPVxuICB0aGlzLl9uZXh0ID0gbnVsbDtcbn1cblxuVGltZXIucHJvdG90eXBlID0gdGltZXIucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogVGltZXIsXG4gIHJlc3RhcnQ6IGZ1bmN0aW9uKGNhbGxiYWNrLCBkZWxheSwgdGltZSkge1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbGxiYWNrIGlzIG5vdCBhIGZ1bmN0aW9uXCIpO1xuICAgIHRpbWUgPSAodGltZSA9PSBudWxsID8gbm93KCkgOiArdGltZSkgKyAoZGVsYXkgPT0gbnVsbCA/IDAgOiArZGVsYXkpO1xuICAgIGlmICghdGhpcy5fbmV4dCAmJiB0YXNrVGFpbCAhPT0gdGhpcykge1xuICAgICAgaWYgKHRhc2tUYWlsKSB0YXNrVGFpbC5fbmV4dCA9IHRoaXM7XG4gICAgICBlbHNlIHRhc2tIZWFkID0gdGhpcztcbiAgICAgIHRhc2tUYWlsID0gdGhpcztcbiAgICB9XG4gICAgdGhpcy5fY2FsbCA9IGNhbGxiYWNrO1xuICAgIHRoaXMuX3RpbWUgPSB0aW1lO1xuICAgIHNsZWVwKCk7XG4gIH0sXG4gIHN0b3A6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9jYWxsKSB7XG4gICAgICB0aGlzLl9jYWxsID0gbnVsbDtcbiAgICAgIHRoaXMuX3RpbWUgPSBJbmZpbml0eTtcbiAgICAgIHNsZWVwKCk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gdGltZXIoY2FsbGJhY2ssIGRlbGF5LCB0aW1lKSB7XG4gIHZhciB0ID0gbmV3IFRpbWVyO1xuICB0LnJlc3RhcnQoY2FsbGJhY2ssIGRlbGF5LCB0aW1lKTtcbiAgcmV0dXJuIHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0aW1lckZsdXNoKCkge1xuICBub3coKTsgLy8gR2V0IHRoZSBjdXJyZW50IHRpbWUsIGlmIG5vdCBhbHJlYWR5IHNldC5cbiAgKytmcmFtZTsgLy8gUHJldGVuZCB3ZeKAmXZlIHNldCBhbiBhbGFybSwgaWYgd2UgaGF2ZW7igJl0IGFscmVhZHkuXG4gIHZhciB0ID0gdGFza0hlYWQsIGU7XG4gIHdoaWxlICh0KSB7XG4gICAgaWYgKChlID0gY2xvY2tOb3cgLSB0Ll90aW1lKSA+PSAwKSB0Ll9jYWxsLmNhbGwobnVsbCwgZSk7XG4gICAgdCA9IHQuX25leHQ7XG4gIH1cbiAgLS1mcmFtZTtcbn1cblxuZnVuY3Rpb24gd2FrZSgpIHtcbiAgY2xvY2tOb3cgPSAoY2xvY2tMYXN0ID0gY2xvY2subm93KCkpICsgY2xvY2tTa2V3O1xuICBmcmFtZSA9IHRpbWVvdXQgPSAwO1xuICB0cnkge1xuICAgIHRpbWVyRmx1c2goKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBmcmFtZSA9IDA7XG4gICAgbmFwKCk7XG4gICAgY2xvY2tOb3cgPSAwO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBva2UoKSB7XG4gIHZhciBub3cgPSBjbG9jay5ub3coKSwgZGVsYXkgPSBub3cgLSBjbG9ja0xhc3Q7XG4gIGlmIChkZWxheSA+IHBva2VEZWxheSkgY2xvY2tTa2V3IC09IGRlbGF5LCBjbG9ja0xhc3QgPSBub3c7XG59XG5cbmZ1bmN0aW9uIG5hcCgpIHtcbiAgdmFyIHQwLCB0MSA9IHRhc2tIZWFkLCB0MiwgdGltZSA9IEluZmluaXR5O1xuICB3aGlsZSAodDEpIHtcbiAgICBpZiAodDEuX2NhbGwpIHtcbiAgICAgIGlmICh0aW1lID4gdDEuX3RpbWUpIHRpbWUgPSB0MS5fdGltZTtcbiAgICAgIHQwID0gdDEsIHQxID0gdDEuX25leHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHQyID0gdDEuX25leHQsIHQxLl9uZXh0ID0gbnVsbDtcbiAgICAgIHQxID0gdDAgPyB0MC5fbmV4dCA9IHQyIDogdGFza0hlYWQgPSB0MjtcbiAgICB9XG4gIH1cbiAgdGFza1RhaWwgPSB0MDtcbiAgc2xlZXAodGltZSk7XG59XG5cbmZ1bmN0aW9uIHNsZWVwKHRpbWUpIHtcbiAgaWYgKGZyYW1lKSByZXR1cm47IC8vIFNvb25lc3QgYWxhcm0gYWxyZWFkeSBzZXQsIG9yIHdpbGwgYmUuXG4gIGlmICh0aW1lb3V0KSB0aW1lb3V0ID0gY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICB2YXIgZGVsYXkgPSB0aW1lIC0gY2xvY2tOb3c7IC8vIFN0cmljdGx5IGxlc3MgdGhhbiBpZiB3ZSByZWNvbXB1dGVkIGNsb2NrTm93LlxuICBpZiAoZGVsYXkgPiAyNCkge1xuICAgIGlmICh0aW1lIDwgSW5maW5pdHkpIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHdha2UsIHRpbWUgLSBjbG9jay5ub3coKSAtIGNsb2NrU2tldyk7XG4gICAgaWYgKGludGVydmFsKSBpbnRlcnZhbCA9IGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICB9IGVsc2Uge1xuICAgIGlmICghaW50ZXJ2YWwpIGNsb2NrTGFzdCA9IGNsb2NrLm5vdygpLCBpbnRlcnZhbCA9IHNldEludGVydmFsKHBva2UsIHBva2VEZWxheSk7XG4gICAgZnJhbWUgPSAxLCBzZXRGcmFtZSh3YWtlKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtUaW1lcn0gZnJvbSBcIi4vdGltZXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY2FsbGJhY2ssIGRlbGF5LCB0aW1lKSB7XG4gIHZhciB0ID0gbmV3IFRpbWVyO1xuICBkZWxheSA9IGRlbGF5ID09IG51bGwgPyAwIDogK2RlbGF5O1xuICB0LnJlc3RhcnQoZnVuY3Rpb24oZWxhcHNlZCkge1xuICAgIHQuc3RvcCgpO1xuICAgIGNhbGxiYWNrKGVsYXBzZWQgKyBkZWxheSk7XG4gIH0sIGRlbGF5LCB0aW1lKTtcbiAgcmV0dXJuIHQ7XG59XG4iLCJpbXBvcnQge2Rpc3BhdGNofSBmcm9tIFwiZDMtZGlzcGF0Y2hcIjtcbmltcG9ydCB7dGltZXIsIHRpbWVvdXR9IGZyb20gXCJkMy10aW1lclwiO1xuXG52YXIgZW1wdHlPbiA9IGRpc3BhdGNoKFwic3RhcnRcIiwgXCJlbmRcIiwgXCJpbnRlcnJ1cHRcIik7XG52YXIgZW1wdHlUd2VlbiA9IFtdO1xuXG5leHBvcnQgdmFyIENSRUFURUQgPSAwO1xuZXhwb3J0IHZhciBTQ0hFRFVMRUQgPSAxO1xuZXhwb3J0IHZhciBTVEFSVElORyA9IDI7XG5leHBvcnQgdmFyIFNUQVJURUQgPSAzO1xuZXhwb3J0IHZhciBSVU5OSU5HID0gNDtcbmV4cG9ydCB2YXIgRU5ESU5HID0gNTtcbmV4cG9ydCB2YXIgRU5ERUQgPSA2O1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihub2RlLCBuYW1lLCBpZCwgaW5kZXgsIGdyb3VwLCB0aW1pbmcpIHtcbiAgdmFyIHNjaGVkdWxlcyA9IG5vZGUuX190cmFuc2l0aW9uO1xuICBpZiAoIXNjaGVkdWxlcykgbm9kZS5fX3RyYW5zaXRpb24gPSB7fTtcbiAgZWxzZSBpZiAoaWQgaW4gc2NoZWR1bGVzKSByZXR1cm47XG4gIGNyZWF0ZShub2RlLCBpZCwge1xuICAgIG5hbWU6IG5hbWUsXG4gICAgaW5kZXg6IGluZGV4LCAvLyBGb3IgY29udGV4dCBkdXJpbmcgY2FsbGJhY2suXG4gICAgZ3JvdXA6IGdyb3VwLCAvLyBGb3IgY29udGV4dCBkdXJpbmcgY2FsbGJhY2suXG4gICAgb246IGVtcHR5T24sXG4gICAgdHdlZW46IGVtcHR5VHdlZW4sXG4gICAgdGltZTogdGltaW5nLnRpbWUsXG4gICAgZGVsYXk6IHRpbWluZy5kZWxheSxcbiAgICBkdXJhdGlvbjogdGltaW5nLmR1cmF0aW9uLFxuICAgIGVhc2U6IHRpbWluZy5lYXNlLFxuICAgIHRpbWVyOiBudWxsLFxuICAgIHN0YXRlOiBDUkVBVEVEXG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdChub2RlLCBpZCkge1xuICB2YXIgc2NoZWR1bGUgPSBnZXQobm9kZSwgaWQpO1xuICBpZiAoc2NoZWR1bGUuc3RhdGUgPiBDUkVBVEVEKSB0aHJvdyBuZXcgRXJyb3IoXCJ0b28gbGF0ZTsgYWxyZWFkeSBzY2hlZHVsZWRcIik7XG4gIHJldHVybiBzY2hlZHVsZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldChub2RlLCBpZCkge1xuICB2YXIgc2NoZWR1bGUgPSBnZXQobm9kZSwgaWQpO1xuICBpZiAoc2NoZWR1bGUuc3RhdGUgPiBTVEFSVElORykgdGhyb3cgbmV3IEVycm9yKFwidG9vIGxhdGU7IGFscmVhZHkgc3RhcnRlZFwiKTtcbiAgcmV0dXJuIHNjaGVkdWxlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0KG5vZGUsIGlkKSB7XG4gIHZhciBzY2hlZHVsZSA9IG5vZGUuX190cmFuc2l0aW9uO1xuICBpZiAoIXNjaGVkdWxlIHx8ICEoc2NoZWR1bGUgPSBzY2hlZHVsZVtpZF0pKSB0aHJvdyBuZXcgRXJyb3IoXCJ0cmFuc2l0aW9uIG5vdCBmb3VuZFwiKTtcbiAgcmV0dXJuIHNjaGVkdWxlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGUobm9kZSwgaWQsIHNlbGYpIHtcbiAgdmFyIHNjaGVkdWxlcyA9IG5vZGUuX190cmFuc2l0aW9uLFxuICAgICAgdHdlZW47XG5cbiAgLy8gSW5pdGlhbGl6ZSB0aGUgc2VsZiB0aW1lciB3aGVuIHRoZSB0cmFuc2l0aW9uIGlzIGNyZWF0ZWQuXG4gIC8vIE5vdGUgdGhlIGFjdHVhbCBkZWxheSBpcyBub3Qga25vd24gdW50aWwgdGhlIGZpcnN0IGNhbGxiYWNrIVxuICBzY2hlZHVsZXNbaWRdID0gc2VsZjtcbiAgc2VsZi50aW1lciA9IHRpbWVyKHNjaGVkdWxlLCAwLCBzZWxmLnRpbWUpO1xuXG4gIGZ1bmN0aW9uIHNjaGVkdWxlKGVsYXBzZWQpIHtcbiAgICBzZWxmLnN0YXRlID0gU0NIRURVTEVEO1xuICAgIHNlbGYudGltZXIucmVzdGFydChzdGFydCwgc2VsZi5kZWxheSwgc2VsZi50aW1lKTtcblxuICAgIC8vIElmIHRoZSBlbGFwc2VkIGRlbGF5IGlzIGxlc3MgdGhhbiBvdXIgZmlyc3Qgc2xlZXAsIHN0YXJ0IGltbWVkaWF0ZWx5LlxuICAgIGlmIChzZWxmLmRlbGF5IDw9IGVsYXBzZWQpIHN0YXJ0KGVsYXBzZWQgLSBzZWxmLmRlbGF5KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN0YXJ0KGVsYXBzZWQpIHtcbiAgICB2YXIgaSwgaiwgbiwgbztcblxuICAgIC8vIElmIHRoZSBzdGF0ZSBpcyBub3QgU0NIRURVTEVELCB0aGVuIHdlIHByZXZpb3VzbHkgZXJyb3JlZCBvbiBzdGFydC5cbiAgICBpZiAoc2VsZi5zdGF0ZSAhPT0gU0NIRURVTEVEKSByZXR1cm4gc3RvcCgpO1xuXG4gICAgZm9yIChpIGluIHNjaGVkdWxlcykge1xuICAgICAgbyA9IHNjaGVkdWxlc1tpXTtcbiAgICAgIGlmIChvLm5hbWUgIT09IHNlbGYubmFtZSkgY29udGludWU7XG5cbiAgICAgIC8vIFdoaWxlIHRoaXMgZWxlbWVudCBhbHJlYWR5IGhhcyBhIHN0YXJ0aW5nIHRyYW5zaXRpb24gZHVyaW5nIHRoaXMgZnJhbWUsXG4gICAgICAvLyBkZWZlciBzdGFydGluZyBhbiBpbnRlcnJ1cHRpbmcgdHJhbnNpdGlvbiB1bnRpbCB0aGF0IHRyYW5zaXRpb24gaGFzIGFcbiAgICAgIC8vIGNoYW5jZSB0byB0aWNrIChhbmQgcG9zc2libHkgZW5kKTsgc2VlIGQzL2QzLXRyYW5zaXRpb24jNTQhXG4gICAgICBpZiAoby5zdGF0ZSA9PT0gU1RBUlRFRCkgcmV0dXJuIHRpbWVvdXQoc3RhcnQpO1xuXG4gICAgICAvLyBJbnRlcnJ1cHQgdGhlIGFjdGl2ZSB0cmFuc2l0aW9uLCBpZiBhbnkuXG4gICAgICAvLyBEaXNwYXRjaCB0aGUgaW50ZXJydXB0IGV2ZW50LlxuICAgICAgaWYgKG8uc3RhdGUgPT09IFJVTk5JTkcpIHtcbiAgICAgICAgby5zdGF0ZSA9IEVOREVEO1xuICAgICAgICBvLnRpbWVyLnN0b3AoKTtcbiAgICAgICAgby5vbi5jYWxsKFwiaW50ZXJydXB0XCIsIG5vZGUsIG5vZGUuX19kYXRhX18sIG8uaW5kZXgsIG8uZ3JvdXApO1xuICAgICAgICBkZWxldGUgc2NoZWR1bGVzW2ldO1xuICAgICAgfVxuXG4gICAgICAvLyBDYW5jZWwgYW55IHByZS1lbXB0ZWQgdHJhbnNpdGlvbnMuIE5vIGludGVycnVwdCBldmVudCBpcyBkaXNwYXRjaGVkXG4gICAgICAvLyBiZWNhdXNlIHRoZSBjYW5jZWxsZWQgdHJhbnNpdGlvbnMgbmV2ZXIgc3RhcnRlZC4gTm90ZSB0aGF0IHRoaXMgYWxzb1xuICAgICAgLy8gcmVtb3ZlcyB0aGlzIHRyYW5zaXRpb24gZnJvbSB0aGUgcGVuZGluZyBsaXN0IVxuICAgICAgZWxzZSBpZiAoK2kgPCBpZCkge1xuICAgICAgICBvLnN0YXRlID0gRU5ERUQ7XG4gICAgICAgIG8udGltZXIuc3RvcCgpO1xuICAgICAgICBkZWxldGUgc2NoZWR1bGVzW2ldO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlZmVyIHRoZSBmaXJzdCB0aWNrIHRvIGVuZCBvZiB0aGUgY3VycmVudCBmcmFtZTsgc2VlIGQzL2QzIzE1NzYuXG4gICAgLy8gTm90ZSB0aGUgdHJhbnNpdGlvbiBtYXkgYmUgY2FuY2VsZWQgYWZ0ZXIgc3RhcnQgYW5kIGJlZm9yZSB0aGUgZmlyc3QgdGljayFcbiAgICAvLyBOb3RlIHRoaXMgbXVzdCBiZSBzY2hlZHVsZWQgYmVmb3JlIHRoZSBzdGFydCBldmVudDsgc2VlIGQzL2QzLXRyYW5zaXRpb24jMTYhXG4gICAgLy8gQXNzdW1pbmcgdGhpcyBpcyBzdWNjZXNzZnVsLCBzdWJzZXF1ZW50IGNhbGxiYWNrcyBnbyBzdHJhaWdodCB0byB0aWNrLlxuICAgIHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoc2VsZi5zdGF0ZSA9PT0gU1RBUlRFRCkge1xuICAgICAgICBzZWxmLnN0YXRlID0gUlVOTklORztcbiAgICAgICAgc2VsZi50aW1lci5yZXN0YXJ0KHRpY2ssIHNlbGYuZGVsYXksIHNlbGYudGltZSk7XG4gICAgICAgIHRpY2soZWxhcHNlZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBEaXNwYXRjaCB0aGUgc3RhcnQgZXZlbnQuXG4gICAgLy8gTm90ZSB0aGlzIG11c3QgYmUgZG9uZSBiZWZvcmUgdGhlIHR3ZWVuIGFyZSBpbml0aWFsaXplZC5cbiAgICBzZWxmLnN0YXRlID0gU1RBUlRJTkc7XG4gICAgc2VsZi5vbi5jYWxsKFwic3RhcnRcIiwgbm9kZSwgbm9kZS5fX2RhdGFfXywgc2VsZi5pbmRleCwgc2VsZi5ncm91cCk7XG4gICAgaWYgKHNlbGYuc3RhdGUgIT09IFNUQVJUSU5HKSByZXR1cm47IC8vIGludGVycnVwdGVkXG4gICAgc2VsZi5zdGF0ZSA9IFNUQVJURUQ7XG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSB0d2VlbiwgZGVsZXRpbmcgbnVsbCB0d2Vlbi5cbiAgICB0d2VlbiA9IG5ldyBBcnJheShuID0gc2VsZi50d2Vlbi5sZW5ndGgpO1xuICAgIGZvciAoaSA9IDAsIGogPSAtMTsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG8gPSBzZWxmLnR3ZWVuW2ldLnZhbHVlLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgc2VsZi5pbmRleCwgc2VsZi5ncm91cCkpIHtcbiAgICAgICAgdHdlZW5bKytqXSA9IG87XG4gICAgICB9XG4gICAgfVxuICAgIHR3ZWVuLmxlbmd0aCA9IGogKyAxO1xuICB9XG5cbiAgZnVuY3Rpb24gdGljayhlbGFwc2VkKSB7XG4gICAgdmFyIHQgPSBlbGFwc2VkIDwgc2VsZi5kdXJhdGlvbiA/IHNlbGYuZWFzZS5jYWxsKG51bGwsIGVsYXBzZWQgLyBzZWxmLmR1cmF0aW9uKSA6IChzZWxmLnRpbWVyLnJlc3RhcnQoc3RvcCksIHNlbGYuc3RhdGUgPSBFTkRJTkcsIDEpLFxuICAgICAgICBpID0gLTEsXG4gICAgICAgIG4gPSB0d2Vlbi5sZW5ndGg7XG5cbiAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgdHdlZW5baV0uY2FsbChudWxsLCB0KTtcbiAgICB9XG5cbiAgICAvLyBEaXNwYXRjaCB0aGUgZW5kIGV2ZW50LlxuICAgIGlmIChzZWxmLnN0YXRlID09PSBFTkRJTkcpIHtcbiAgICAgIHNlbGYub24uY2FsbChcImVuZFwiLCBub2RlLCBub2RlLl9fZGF0YV9fLCBzZWxmLmluZGV4LCBzZWxmLmdyb3VwKTtcbiAgICAgIHN0b3AoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdG9wKCkge1xuICAgIHNlbGYuc3RhdGUgPSBFTkRFRDtcbiAgICBzZWxmLnRpbWVyLnN0b3AoKTtcbiAgICBkZWxldGUgc2NoZWR1bGVzW2lkXTtcbiAgICBmb3IgKHZhciBpIGluIHNjaGVkdWxlcykgcmV0dXJuOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVudXNlZC12YXJzXG4gICAgZGVsZXRlIG5vZGUuX190cmFuc2l0aW9uO1xuICB9XG59XG4iLCJpbXBvcnQge1NUQVJUSU5HLCBFTkRJTkcsIEVOREVEfSBmcm9tIFwiLi90cmFuc2l0aW9uL3NjaGVkdWxlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5vZGUsIG5hbWUpIHtcbiAgdmFyIHNjaGVkdWxlcyA9IG5vZGUuX190cmFuc2l0aW9uLFxuICAgICAgc2NoZWR1bGUsXG4gICAgICBhY3RpdmUsXG4gICAgICBlbXB0eSA9IHRydWUsXG4gICAgICBpO1xuXG4gIGlmICghc2NoZWR1bGVzKSByZXR1cm47XG5cbiAgbmFtZSA9IG5hbWUgPT0gbnVsbCA/IG51bGwgOiBuYW1lICsgXCJcIjtcblxuICBmb3IgKGkgaW4gc2NoZWR1bGVzKSB7XG4gICAgaWYgKChzY2hlZHVsZSA9IHNjaGVkdWxlc1tpXSkubmFtZSAhPT0gbmFtZSkgeyBlbXB0eSA9IGZhbHNlOyBjb250aW51ZTsgfVxuICAgIGFjdGl2ZSA9IHNjaGVkdWxlLnN0YXRlID4gU1RBUlRJTkcgJiYgc2NoZWR1bGUuc3RhdGUgPCBFTkRJTkc7XG4gICAgc2NoZWR1bGUuc3RhdGUgPSBFTkRFRDtcbiAgICBzY2hlZHVsZS50aW1lci5zdG9wKCk7XG4gICAgaWYgKGFjdGl2ZSkgc2NoZWR1bGUub24uY2FsbChcImludGVycnVwdFwiLCBub2RlLCBub2RlLl9fZGF0YV9fLCBzY2hlZHVsZS5pbmRleCwgc2NoZWR1bGUuZ3JvdXApO1xuICAgIGRlbGV0ZSBzY2hlZHVsZXNbaV07XG4gIH1cblxuICBpZiAoZW1wdHkpIGRlbGV0ZSBub2RlLl9fdHJhbnNpdGlvbjtcbn1cbiIsImltcG9ydCBpbnRlcnJ1cHQgZnJvbSBcIi4uL2ludGVycnVwdFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lKSB7XG4gIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgaW50ZXJydXB0KHRoaXMsIG5hbWUpO1xuICB9KTtcbn1cbiIsImltcG9ydCB7Z2V0LCBzZXR9IGZyb20gXCIuL3NjaGVkdWxlXCI7XG5cbmZ1bmN0aW9uIHR3ZWVuUmVtb3ZlKGlkLCBuYW1lKSB7XG4gIHZhciB0d2VlbjAsIHR3ZWVuMTtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY2hlZHVsZSA9IHNldCh0aGlzLCBpZCksXG4gICAgICAgIHR3ZWVuID0gc2NoZWR1bGUudHdlZW47XG5cbiAgICAvLyBJZiB0aGlzIG5vZGUgc2hhcmVkIHR3ZWVuIHdpdGggdGhlIHByZXZpb3VzIG5vZGUsXG4gICAgLy8ganVzdCBhc3NpZ24gdGhlIHVwZGF0ZWQgc2hhcmVkIHR3ZWVuIGFuZCB3ZeKAmXJlIGRvbmUhXG4gICAgLy8gT3RoZXJ3aXNlLCBjb3B5LW9uLXdyaXRlLlxuICAgIGlmICh0d2VlbiAhPT0gdHdlZW4wKSB7XG4gICAgICB0d2VlbjEgPSB0d2VlbjAgPSB0d2VlbjtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gdHdlZW4xLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgICBpZiAodHdlZW4xW2ldLm5hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgICB0d2VlbjEgPSB0d2VlbjEuc2xpY2UoKTtcbiAgICAgICAgICB0d2VlbjEuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2NoZWR1bGUudHdlZW4gPSB0d2VlbjE7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHR3ZWVuRnVuY3Rpb24oaWQsIG5hbWUsIHZhbHVlKSB7XG4gIHZhciB0d2VlbjAsIHR3ZWVuMTtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgRXJyb3I7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NoZWR1bGUgPSBzZXQodGhpcywgaWQpLFxuICAgICAgICB0d2VlbiA9IHNjaGVkdWxlLnR3ZWVuO1xuXG4gICAgLy8gSWYgdGhpcyBub2RlIHNoYXJlZCB0d2VlbiB3aXRoIHRoZSBwcmV2aW91cyBub2RlLFxuICAgIC8vIGp1c3QgYXNzaWduIHRoZSB1cGRhdGVkIHNoYXJlZCB0d2VlbiBhbmQgd2XigJlyZSBkb25lIVxuICAgIC8vIE90aGVyd2lzZSwgY29weS1vbi13cml0ZS5cbiAgICBpZiAodHdlZW4gIT09IHR3ZWVuMCkge1xuICAgICAgdHdlZW4xID0gKHR3ZWVuMCA9IHR3ZWVuKS5zbGljZSgpO1xuICAgICAgZm9yICh2YXIgdCA9IHtuYW1lOiBuYW1lLCB2YWx1ZTogdmFsdWV9LCBpID0gMCwgbiA9IHR3ZWVuMS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgICAgaWYgKHR3ZWVuMVtpXS5uYW1lID09PSBuYW1lKSB7XG4gICAgICAgICAgdHdlZW4xW2ldID0gdDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGkgPT09IG4pIHR3ZWVuMS5wdXNoKHQpO1xuICAgIH1cblxuICAgIHNjaGVkdWxlLnR3ZWVuID0gdHdlZW4xO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB2YXIgaWQgPSB0aGlzLl9pZDtcblxuICBuYW1lICs9IFwiXCI7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgdmFyIHR3ZWVuID0gZ2V0KHRoaXMubm9kZSgpLCBpZCkudHdlZW47XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0d2Vlbi5sZW5ndGgsIHQ7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmICgodCA9IHR3ZWVuW2ldKS5uYW1lID09PSBuYW1lKSB7XG4gICAgICAgIHJldHVybiB0LnZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmVhY2goKHZhbHVlID09IG51bGwgPyB0d2VlblJlbW92ZSA6IHR3ZWVuRnVuY3Rpb24pKGlkLCBuYW1lLCB2YWx1ZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHdlZW5WYWx1ZSh0cmFuc2l0aW9uLCBuYW1lLCB2YWx1ZSkge1xuICB2YXIgaWQgPSB0cmFuc2l0aW9uLl9pZDtcblxuICB0cmFuc2l0aW9uLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjaGVkdWxlID0gc2V0KHRoaXMsIGlkKTtcbiAgICAoc2NoZWR1bGUudmFsdWUgfHwgKHNjaGVkdWxlLnZhbHVlID0ge30pKVtuYW1lXSA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbihub2RlKSB7XG4gICAgcmV0dXJuIGdldChub2RlLCBpZCkudmFsdWVbbmFtZV07XG4gIH07XG59XG4iLCJpbXBvcnQge2NvbG9yfSBmcm9tIFwiZDMtY29sb3JcIjtcbmltcG9ydCB7aW50ZXJwb2xhdGVOdW1iZXIsIGludGVycG9sYXRlUmdiLCBpbnRlcnBvbGF0ZVN0cmluZ30gZnJvbSBcImQzLWludGVycG9sYXRlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGM7XG4gIHJldHVybiAodHlwZW9mIGIgPT09IFwibnVtYmVyXCIgPyBpbnRlcnBvbGF0ZU51bWJlclxuICAgICAgOiBiIGluc3RhbmNlb2YgY29sb3IgPyBpbnRlcnBvbGF0ZVJnYlxuICAgICAgOiAoYyA9IGNvbG9yKGIpKSA/IChiID0gYywgaW50ZXJwb2xhdGVSZ2IpXG4gICAgICA6IGludGVycG9sYXRlU3RyaW5nKShhLCBiKTtcbn1cbiIsImltcG9ydCB7aW50ZXJwb2xhdGVUcmFuc2Zvcm1TdmcgYXMgaW50ZXJwb2xhdGVUcmFuc2Zvcm19IGZyb20gXCJkMy1pbnRlcnBvbGF0ZVwiO1xuaW1wb3J0IHtuYW1lc3BhY2V9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7dHdlZW5WYWx1ZX0gZnJvbSBcIi4vdHdlZW5cIjtcbmltcG9ydCBpbnRlcnBvbGF0ZSBmcm9tIFwiLi9pbnRlcnBvbGF0ZVwiO1xuXG5mdW5jdGlvbiBhdHRyUmVtb3ZlKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyUmVtb3ZlTlMoZnVsbG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVtb3ZlQXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckNvbnN0YW50KG5hbWUsIGludGVycG9sYXRlLCB2YWx1ZTEpIHtcbiAgdmFyIHZhbHVlMDAsXG4gICAgICBpbnRlcnBvbGF0ZTA7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUwID0gdGhpcy5nZXRBdHRyaWJ1dGUobmFtZSk7XG4gICAgcmV0dXJuIHZhbHVlMCA9PT0gdmFsdWUxID8gbnVsbFxuICAgICAgICA6IHZhbHVlMCA9PT0gdmFsdWUwMCA/IGludGVycG9sYXRlMFxuICAgICAgICA6IGludGVycG9sYXRlMCA9IGludGVycG9sYXRlKHZhbHVlMDAgPSB2YWx1ZTAsIHZhbHVlMSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJDb25zdGFudE5TKGZ1bGxuYW1lLCBpbnRlcnBvbGF0ZSwgdmFsdWUxKSB7XG4gIHZhciB2YWx1ZTAwLFxuICAgICAgaW50ZXJwb2xhdGUwO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlMCA9IHRoaXMuZ2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgICByZXR1cm4gdmFsdWUwID09PSB2YWx1ZTEgPyBudWxsXG4gICAgICAgIDogdmFsdWUwID09PSB2YWx1ZTAwID8gaW50ZXJwb2xhdGUwXG4gICAgICAgIDogaW50ZXJwb2xhdGUwID0gaW50ZXJwb2xhdGUodmFsdWUwMCA9IHZhbHVlMCwgdmFsdWUxKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckZ1bmN0aW9uKG5hbWUsIGludGVycG9sYXRlLCB2YWx1ZSkge1xuICB2YXIgdmFsdWUwMCxcbiAgICAgIHZhbHVlMTAsXG4gICAgICBpbnRlcnBvbGF0ZTA7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUwLCB2YWx1ZTEgPSB2YWx1ZSh0aGlzKTtcbiAgICBpZiAodmFsdWUxID09IG51bGwpIHJldHVybiB2b2lkIHRoaXMucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIHZhbHVlMCA9IHRoaXMuZ2V0QXR0cmlidXRlKG5hbWUpO1xuICAgIHJldHVybiB2YWx1ZTAgPT09IHZhbHVlMSA/IG51bGxcbiAgICAgICAgOiB2YWx1ZTAgPT09IHZhbHVlMDAgJiYgdmFsdWUxID09PSB2YWx1ZTEwID8gaW50ZXJwb2xhdGUwXG4gICAgICAgIDogaW50ZXJwb2xhdGUwID0gaW50ZXJwb2xhdGUodmFsdWUwMCA9IHZhbHVlMCwgdmFsdWUxMCA9IHZhbHVlMSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbk5TKGZ1bGxuYW1lLCBpbnRlcnBvbGF0ZSwgdmFsdWUpIHtcbiAgdmFyIHZhbHVlMDAsXG4gICAgICB2YWx1ZTEwLFxuICAgICAgaW50ZXJwb2xhdGUwO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlMCwgdmFsdWUxID0gdmFsdWUodGhpcyk7XG4gICAgaWYgKHZhbHVlMSA9PSBudWxsKSByZXR1cm4gdm9pZCB0aGlzLnJlbW92ZUF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gICAgdmFsdWUwID0gdGhpcy5nZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICAgIHJldHVybiB2YWx1ZTAgPT09IHZhbHVlMSA/IG51bGxcbiAgICAgICAgOiB2YWx1ZTAgPT09IHZhbHVlMDAgJiYgdmFsdWUxID09PSB2YWx1ZTEwID8gaW50ZXJwb2xhdGUwXG4gICAgICAgIDogaW50ZXJwb2xhdGUwID0gaW50ZXJwb2xhdGUodmFsdWUwMCA9IHZhbHVlMCwgdmFsdWUxMCA9IHZhbHVlMSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHZhciBmdWxsbmFtZSA9IG5hbWVzcGFjZShuYW1lKSwgaSA9IGZ1bGxuYW1lID09PSBcInRyYW5zZm9ybVwiID8gaW50ZXJwb2xhdGVUcmFuc2Zvcm0gOiBpbnRlcnBvbGF0ZTtcbiAgcmV0dXJuIHRoaXMuYXR0clR3ZWVuKG5hbWUsIHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IChmdWxsbmFtZS5sb2NhbCA/IGF0dHJGdW5jdGlvbk5TIDogYXR0ckZ1bmN0aW9uKShmdWxsbmFtZSwgaSwgdHdlZW5WYWx1ZSh0aGlzLCBcImF0dHIuXCIgKyBuYW1lLCB2YWx1ZSkpXG4gICAgICA6IHZhbHVlID09IG51bGwgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyUmVtb3ZlTlMgOiBhdHRyUmVtb3ZlKShmdWxsbmFtZSlcbiAgICAgIDogKGZ1bGxuYW1lLmxvY2FsID8gYXR0ckNvbnN0YW50TlMgOiBhdHRyQ29uc3RhbnQpKGZ1bGxuYW1lLCBpLCB2YWx1ZSArIFwiXCIpKTtcbn1cbiIsImltcG9ydCB7bmFtZXNwYWNlfSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5cbmZ1bmN0aW9uIGF0dHJUd2Vlbk5TKGZ1bGxuYW1lLCB2YWx1ZSkge1xuICBmdW5jdGlvbiB0d2VlbigpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMsIGkgPSB2YWx1ZS5hcHBseShub2RlLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiBpICYmIGZ1bmN0aW9uKHQpIHtcbiAgICAgIG5vZGUuc2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsLCBpKHQpKTtcbiAgICB9O1xuICB9XG4gIHR3ZWVuLl92YWx1ZSA9IHZhbHVlO1xuICByZXR1cm4gdHdlZW47XG59XG5cbmZ1bmN0aW9uIGF0dHJUd2VlbihuYW1lLCB2YWx1ZSkge1xuICBmdW5jdGlvbiB0d2VlbigpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMsIGkgPSB2YWx1ZS5hcHBseShub2RlLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiBpICYmIGZ1bmN0aW9uKHQpIHtcbiAgICAgIG5vZGUuc2V0QXR0cmlidXRlKG5hbWUsIGkodCkpO1xuICAgIH07XG4gIH1cbiAgdHdlZW4uX3ZhbHVlID0gdmFsdWU7XG4gIHJldHVybiB0d2Vlbjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIGtleSA9IFwiYXR0ci5cIiArIG5hbWU7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikgcmV0dXJuIChrZXkgPSB0aGlzLnR3ZWVuKGtleSkpICYmIGtleS5fdmFsdWU7XG4gIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gdGhpcy50d2VlbihrZXksIG51bGwpO1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcjtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpO1xuICByZXR1cm4gdGhpcy50d2VlbihrZXksIChmdWxsbmFtZS5sb2NhbCA/IGF0dHJUd2Vlbk5TIDogYXR0clR3ZWVuKShmdWxsbmFtZSwgdmFsdWUpKTtcbn1cbiIsImltcG9ydCB7Z2V0LCBpbml0fSBmcm9tIFwiLi9zY2hlZHVsZVwiO1xuXG5mdW5jdGlvbiBkZWxheUZ1bmN0aW9uKGlkLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgaW5pdCh0aGlzLCBpZCkuZGVsYXkgPSArdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZGVsYXlDb25zdGFudChpZCwgdmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID0gK3ZhbHVlLCBmdW5jdGlvbigpIHtcbiAgICBpbml0KHRoaXMsIGlkKS5kZWxheSA9IHZhbHVlO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICB2YXIgaWQgPSB0aGlzLl9pZDtcblxuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLmVhY2goKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBkZWxheUZ1bmN0aW9uXG4gICAgICAgICAgOiBkZWxheUNvbnN0YW50KShpZCwgdmFsdWUpKVxuICAgICAgOiBnZXQodGhpcy5ub2RlKCksIGlkKS5kZWxheTtcbn1cbiIsImltcG9ydCB7Z2V0LCBzZXR9IGZyb20gXCIuL3NjaGVkdWxlXCI7XG5cbmZ1bmN0aW9uIGR1cmF0aW9uRnVuY3Rpb24oaWQsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBzZXQodGhpcywgaWQpLmR1cmF0aW9uID0gK3ZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGR1cmF0aW9uQ29uc3RhbnQoaWQsIHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9ICt2YWx1ZSwgZnVuY3Rpb24oKSB7XG4gICAgc2V0KHRoaXMsIGlkKS5kdXJhdGlvbiA9IHZhbHVlO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICB2YXIgaWQgPSB0aGlzLl9pZDtcblxuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLmVhY2goKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBkdXJhdGlvbkZ1bmN0aW9uXG4gICAgICAgICAgOiBkdXJhdGlvbkNvbnN0YW50KShpZCwgdmFsdWUpKVxuICAgICAgOiBnZXQodGhpcy5ub2RlKCksIGlkKS5kdXJhdGlvbjtcbn1cbiIsImltcG9ydCB7Z2V0LCBzZXR9IGZyb20gXCIuL3NjaGVkdWxlXCI7XG5cbmZ1bmN0aW9uIGVhc2VDb25zdGFudChpZCwgdmFsdWUpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgRXJyb3I7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBzZXQodGhpcywgaWQpLmVhc2UgPSB2YWx1ZTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIGlkID0gdGhpcy5faWQ7XG5cbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5lYWNoKGVhc2VDb25zdGFudChpZCwgdmFsdWUpKVxuICAgICAgOiBnZXQodGhpcy5ub2RlKCksIGlkKS5lYXNlO1xufVxuIiwiaW1wb3J0IHttYXRjaGVyfSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQge1RyYW5zaXRpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG1hdGNoKSB7XG4gIGlmICh0eXBlb2YgbWF0Y2ggIT09IFwiZnVuY3Rpb25cIikgbWF0Y2ggPSBtYXRjaGVyKG1hdGNoKTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHN1Ymdyb3VwID0gc3ViZ3JvdXBzW2pdID0gW10sIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgbWF0Y2guY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpIHtcbiAgICAgICAgc3ViZ3JvdXAucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFRyYW5zaXRpb24oc3ViZ3JvdXBzLCB0aGlzLl9wYXJlbnRzLCB0aGlzLl9uYW1lLCB0aGlzLl9pZCk7XG59XG4iLCJpbXBvcnQge1RyYW5zaXRpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHRyYW5zaXRpb24pIHtcbiAgaWYgKHRyYW5zaXRpb24uX2lkICE9PSB0aGlzLl9pZCkgdGhyb3cgbmV3IEVycm9yO1xuXG4gIGZvciAodmFyIGdyb3VwczAgPSB0aGlzLl9ncm91cHMsIGdyb3VwczEgPSB0cmFuc2l0aW9uLl9ncm91cHMsIG0wID0gZ3JvdXBzMC5sZW5ndGgsIG0xID0gZ3JvdXBzMS5sZW5ndGgsIG0gPSBNYXRoLm1pbihtMCwgbTEpLCBtZXJnZXMgPSBuZXcgQXJyYXkobTApLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwMCA9IGdyb3VwczBbal0sIGdyb3VwMSA9IGdyb3VwczFbal0sIG4gPSBncm91cDAubGVuZ3RoLCBtZXJnZSA9IG1lcmdlc1tqXSA9IG5ldyBBcnJheShuKSwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXAwW2ldIHx8IGdyb3VwMVtpXSkge1xuICAgICAgICBtZXJnZVtpXSA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yICg7IGogPCBtMDsgKytqKSB7XG4gICAgbWVyZ2VzW2pdID0gZ3JvdXBzMFtqXTtcbiAgfVxuXG4gIHJldHVybiBuZXcgVHJhbnNpdGlvbihtZXJnZXMsIHRoaXMuX3BhcmVudHMsIHRoaXMuX25hbWUsIHRoaXMuX2lkKTtcbn1cbiIsImltcG9ydCB7Z2V0LCBzZXQsIGluaXR9IGZyb20gXCIuL3NjaGVkdWxlXCI7XG5cbmZ1bmN0aW9uIHN0YXJ0KG5hbWUpIHtcbiAgcmV0dXJuIChuYW1lICsgXCJcIikudHJpbSgpLnNwbGl0KC9efFxccysvKS5ldmVyeShmdW5jdGlvbih0KSB7XG4gICAgdmFyIGkgPSB0LmluZGV4T2YoXCIuXCIpO1xuICAgIGlmIChpID49IDApIHQgPSB0LnNsaWNlKDAsIGkpO1xuICAgIHJldHVybiAhdCB8fCB0ID09PSBcInN0YXJ0XCI7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBvbkZ1bmN0aW9uKGlkLCBuYW1lLCBsaXN0ZW5lcikge1xuICB2YXIgb24wLCBvbjEsIHNpdCA9IHN0YXJ0KG5hbWUpID8gaW5pdCA6IHNldDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY2hlZHVsZSA9IHNpdCh0aGlzLCBpZCksXG4gICAgICAgIG9uID0gc2NoZWR1bGUub247XG5cbiAgICAvLyBJZiB0aGlzIG5vZGUgc2hhcmVkIGEgZGlzcGF0Y2ggd2l0aCB0aGUgcHJldmlvdXMgbm9kZSxcbiAgICAvLyBqdXN0IGFzc2lnbiB0aGUgdXBkYXRlZCBzaGFyZWQgZGlzcGF0Y2ggYW5kIHdl4oCZcmUgZG9uZSFcbiAgICAvLyBPdGhlcndpc2UsIGNvcHktb24td3JpdGUuXG4gICAgaWYgKG9uICE9PSBvbjApIChvbjEgPSAob24wID0gb24pLmNvcHkoKSkub24obmFtZSwgbGlzdGVuZXIpO1xuXG4gICAgc2NoZWR1bGUub24gPSBvbjE7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIGxpc3RlbmVyKSB7XG4gIHZhciBpZCA9IHRoaXMuX2lkO1xuXG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoIDwgMlxuICAgICAgPyBnZXQodGhpcy5ub2RlKCksIGlkKS5vbi5vbihuYW1lKVxuICAgICAgOiB0aGlzLmVhY2gob25GdW5jdGlvbihpZCwgbmFtZSwgbGlzdGVuZXIpKTtcbn1cbiIsImZ1bmN0aW9uIHJlbW92ZUZ1bmN0aW9uKGlkKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnROb2RlO1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5fX3RyYW5zaXRpb24pIGlmICgraSAhPT0gaWQpIHJldHVybjtcbiAgICBpZiAocGFyZW50KSBwYXJlbnQucmVtb3ZlQ2hpbGQodGhpcyk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5vbihcImVuZC5yZW1vdmVcIiwgcmVtb3ZlRnVuY3Rpb24odGhpcy5faWQpKTtcbn1cbiIsImltcG9ydCB7c2VsZWN0b3J9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7VHJhbnNpdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCBzY2hlZHVsZSwge2dldH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0KSB7XG4gIHZhciBuYW1lID0gdGhpcy5fbmFtZSxcbiAgICAgIGlkID0gdGhpcy5faWQ7XG5cbiAgaWYgKHR5cGVvZiBzZWxlY3QgIT09IFwiZnVuY3Rpb25cIikgc2VsZWN0ID0gc2VsZWN0b3Ioc2VsZWN0KTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHN1Ymdyb3VwID0gc3ViZ3JvdXBzW2pdID0gbmV3IEFycmF5KG4pLCBub2RlLCBzdWJub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIChzdWJub2RlID0gc2VsZWN0LmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApKSkge1xuICAgICAgICBpZiAoXCJfX2RhdGFfX1wiIGluIG5vZGUpIHN1Ym5vZGUuX19kYXRhX18gPSBub2RlLl9fZGF0YV9fO1xuICAgICAgICBzdWJncm91cFtpXSA9IHN1Ym5vZGU7XG4gICAgICAgIHNjaGVkdWxlKHN1Ymdyb3VwW2ldLCBuYW1lLCBpZCwgaSwgc3ViZ3JvdXAsIGdldChub2RlLCBpZCkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgVHJhbnNpdGlvbihzdWJncm91cHMsIHRoaXMuX3BhcmVudHMsIG5hbWUsIGlkKTtcbn1cbiIsImltcG9ydCB7c2VsZWN0b3JBbGx9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7VHJhbnNpdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCBzY2hlZHVsZSwge2dldH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0KSB7XG4gIHZhciBuYW1lID0gdGhpcy5fbmFtZSxcbiAgICAgIGlkID0gdGhpcy5faWQ7XG5cbiAgaWYgKHR5cGVvZiBzZWxlY3QgIT09IFwiZnVuY3Rpb25cIikgc2VsZWN0ID0gc2VsZWN0b3JBbGwoc2VsZWN0KTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBbXSwgcGFyZW50cyA9IFtdLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgICBmb3IgKHZhciBjaGlsZHJlbiA9IHNlbGVjdC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSwgY2hpbGQsIGluaGVyaXQgPSBnZXQobm9kZSwgaWQpLCBrID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgayA8IGw7ICsraykge1xuICAgICAgICAgIGlmIChjaGlsZCA9IGNoaWxkcmVuW2tdKSB7XG4gICAgICAgICAgICBzY2hlZHVsZShjaGlsZCwgbmFtZSwgaWQsIGssIGNoaWxkcmVuLCBpbmhlcml0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3ViZ3JvdXBzLnB1c2goY2hpbGRyZW4pO1xuICAgICAgICBwYXJlbnRzLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBUcmFuc2l0aW9uKHN1Ymdyb3VwcywgcGFyZW50cywgbmFtZSwgaWQpO1xufVxuIiwiaW1wb3J0IHtzZWxlY3Rpb259IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcblxudmFyIFNlbGVjdGlvbiA9IHNlbGVjdGlvbi5wcm90b3R5cGUuY29uc3RydWN0b3I7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLl9ncm91cHMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiaW1wb3J0IHtpbnRlcnBvbGF0ZVRyYW5zZm9ybUNzcyBhcyBpbnRlcnBvbGF0ZVRyYW5zZm9ybX0gZnJvbSBcImQzLWludGVycG9sYXRlXCI7XG5pbXBvcnQge3N0eWxlfSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQge3R3ZWVuVmFsdWV9IGZyb20gXCIuL3R3ZWVuXCI7XG5pbXBvcnQgaW50ZXJwb2xhdGUgZnJvbSBcIi4vaW50ZXJwb2xhdGVcIjtcblxuZnVuY3Rpb24gc3R5bGVSZW1vdmUobmFtZSwgaW50ZXJwb2xhdGUpIHtcbiAgdmFyIHZhbHVlMDAsXG4gICAgICB2YWx1ZTEwLFxuICAgICAgaW50ZXJwb2xhdGUwO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlMCA9IHN0eWxlKHRoaXMsIG5hbWUpLFxuICAgICAgICB2YWx1ZTEgPSAodGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKSwgc3R5bGUodGhpcywgbmFtZSkpO1xuICAgIHJldHVybiB2YWx1ZTAgPT09IHZhbHVlMSA/IG51bGxcbiAgICAgICAgOiB2YWx1ZTAgPT09IHZhbHVlMDAgJiYgdmFsdWUxID09PSB2YWx1ZTEwID8gaW50ZXJwb2xhdGUwXG4gICAgICAgIDogaW50ZXJwb2xhdGUwID0gaW50ZXJwb2xhdGUodmFsdWUwMCA9IHZhbHVlMCwgdmFsdWUxMCA9IHZhbHVlMSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHN0eWxlUmVtb3ZlRW5kKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHN0eWxlQ29uc3RhbnQobmFtZSwgaW50ZXJwb2xhdGUsIHZhbHVlMSkge1xuICB2YXIgdmFsdWUwMCxcbiAgICAgIGludGVycG9sYXRlMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZTAgPSBzdHlsZSh0aGlzLCBuYW1lKTtcbiAgICByZXR1cm4gdmFsdWUwID09PSB2YWx1ZTEgPyBudWxsXG4gICAgICAgIDogdmFsdWUwID09PSB2YWx1ZTAwID8gaW50ZXJwb2xhdGUwXG4gICAgICAgIDogaW50ZXJwb2xhdGUwID0gaW50ZXJwb2xhdGUodmFsdWUwMCA9IHZhbHVlMCwgdmFsdWUxKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVGdW5jdGlvbihuYW1lLCBpbnRlcnBvbGF0ZSwgdmFsdWUpIHtcbiAgdmFyIHZhbHVlMDAsXG4gICAgICB2YWx1ZTEwLFxuICAgICAgaW50ZXJwb2xhdGUwO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlMCA9IHN0eWxlKHRoaXMsIG5hbWUpLFxuICAgICAgICB2YWx1ZTEgPSB2YWx1ZSh0aGlzKTtcbiAgICBpZiAodmFsdWUxID09IG51bGwpIHZhbHVlMSA9ICh0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpLCBzdHlsZSh0aGlzLCBuYW1lKSk7XG4gICAgcmV0dXJuIHZhbHVlMCA9PT0gdmFsdWUxID8gbnVsbFxuICAgICAgICA6IHZhbHVlMCA9PT0gdmFsdWUwMCAmJiB2YWx1ZTEgPT09IHZhbHVlMTAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEwID0gdmFsdWUxKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIHZhciBpID0gKG5hbWUgKz0gXCJcIikgPT09IFwidHJhbnNmb3JtXCIgPyBpbnRlcnBvbGF0ZVRyYW5zZm9ybSA6IGludGVycG9sYXRlO1xuICByZXR1cm4gdmFsdWUgPT0gbnVsbCA/IHRoaXNcbiAgICAgICAgICAuc3R5bGVUd2VlbihuYW1lLCBzdHlsZVJlbW92ZShuYW1lLCBpKSlcbiAgICAgICAgICAub24oXCJlbmQuc3R5bGUuXCIgKyBuYW1lLCBzdHlsZVJlbW92ZUVuZChuYW1lKSlcbiAgICAgIDogdGhpcy5zdHlsZVR3ZWVuKG5hbWUsIHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBzdHlsZUZ1bmN0aW9uKG5hbWUsIGksIHR3ZWVuVmFsdWUodGhpcywgXCJzdHlsZS5cIiArIG5hbWUsIHZhbHVlKSlcbiAgICAgICAgICA6IHN0eWxlQ29uc3RhbnQobmFtZSwgaSwgdmFsdWUgKyBcIlwiKSwgcHJpb3JpdHkpO1xufVxuIiwiZnVuY3Rpb24gc3R5bGVUd2VlbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgZnVuY3Rpb24gdHdlZW4oKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLCBpID0gdmFsdWUuYXBwbHkobm9kZSwgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gaSAmJiBmdW5jdGlvbih0KSB7XG4gICAgICBub2RlLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIGkodCksIHByaW9yaXR5KTtcbiAgICB9O1xuICB9XG4gIHR3ZWVuLl92YWx1ZSA9IHZhbHVlO1xuICByZXR1cm4gdHdlZW47XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICB2YXIga2V5ID0gXCJzdHlsZS5cIiArIChuYW1lICs9IFwiXCIpO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHJldHVybiAoa2V5ID0gdGhpcy50d2VlbihrZXkpKSAmJiBrZXkuX3ZhbHVlO1xuICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIHRoaXMudHdlZW4oa2V5LCBudWxsKTtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgRXJyb3I7XG4gIHJldHVybiB0aGlzLnR3ZWVuKGtleSwgc3R5bGVUd2VlbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkgPT0gbnVsbCA/IFwiXCIgOiBwcmlvcml0eSkpO1xufVxuIiwiaW1wb3J0IHt0d2VlblZhbHVlfSBmcm9tIFwiLi90d2VlblwiO1xuXG5mdW5jdGlvbiB0ZXh0Q29uc3RhbnQodmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdGV4dEZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUxID0gdmFsdWUodGhpcyk7XG4gICAgdGhpcy50ZXh0Q29udGVudCA9IHZhbHVlMSA9PSBudWxsID8gXCJcIiA6IHZhbHVlMTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHRoaXMudHdlZW4oXCJ0ZXh0XCIsIHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IHRleHRGdW5jdGlvbih0d2VlblZhbHVlKHRoaXMsIFwidGV4dFwiLCB2YWx1ZSkpXG4gICAgICA6IHRleHRDb25zdGFudCh2YWx1ZSA9PSBudWxsID8gXCJcIiA6IHZhbHVlICsgXCJcIikpO1xufVxuIiwiaW1wb3J0IHtUcmFuc2l0aW9uLCBuZXdJZH0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCBzY2hlZHVsZSwge2dldH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBuYW1lID0gdGhpcy5fbmFtZSxcbiAgICAgIGlkMCA9IHRoaXMuX2lkLFxuICAgICAgaWQxID0gbmV3SWQoKTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgICB2YXIgaW5oZXJpdCA9IGdldChub2RlLCBpZDApO1xuICAgICAgICBzY2hlZHVsZShub2RlLCBuYW1lLCBpZDEsIGksIGdyb3VwLCB7XG4gICAgICAgICAgdGltZTogaW5oZXJpdC50aW1lICsgaW5oZXJpdC5kZWxheSArIGluaGVyaXQuZHVyYXRpb24sXG4gICAgICAgICAgZGVsYXk6IDAsXG4gICAgICAgICAgZHVyYXRpb246IGluaGVyaXQuZHVyYXRpb24sXG4gICAgICAgICAgZWFzZTogaW5oZXJpdC5lYXNlXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgVHJhbnNpdGlvbihncm91cHMsIHRoaXMuX3BhcmVudHMsIG5hbWUsIGlkMSk7XG59XG4iLCJpbXBvcnQge3NlbGVjdGlvbn0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHRyYW5zaXRpb25fYXR0ciBmcm9tIFwiLi9hdHRyXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9hdHRyVHdlZW4gZnJvbSBcIi4vYXR0clR3ZWVuXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9kZWxheSBmcm9tIFwiLi9kZWxheVwiO1xuaW1wb3J0IHRyYW5zaXRpb25fZHVyYXRpb24gZnJvbSBcIi4vZHVyYXRpb25cIjtcbmltcG9ydCB0cmFuc2l0aW9uX2Vhc2UgZnJvbSBcIi4vZWFzZVwiO1xuaW1wb3J0IHRyYW5zaXRpb25fZmlsdGVyIGZyb20gXCIuL2ZpbHRlclwiO1xuaW1wb3J0IHRyYW5zaXRpb25fbWVyZ2UgZnJvbSBcIi4vbWVyZ2VcIjtcbmltcG9ydCB0cmFuc2l0aW9uX29uIGZyb20gXCIuL29uXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9yZW1vdmUgZnJvbSBcIi4vcmVtb3ZlXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9zZWxlY3QgZnJvbSBcIi4vc2VsZWN0XCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9zZWxlY3RBbGwgZnJvbSBcIi4vc2VsZWN0QWxsXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9zZWxlY3Rpb24gZnJvbSBcIi4vc2VsZWN0aW9uXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9zdHlsZSBmcm9tIFwiLi9zdHlsZVwiO1xuaW1wb3J0IHRyYW5zaXRpb25fc3R5bGVUd2VlbiBmcm9tIFwiLi9zdHlsZVR3ZWVuXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl90ZXh0IGZyb20gXCIuL3RleHRcIjtcbmltcG9ydCB0cmFuc2l0aW9uX3RyYW5zaXRpb24gZnJvbSBcIi4vdHJhbnNpdGlvblwiO1xuaW1wb3J0IHRyYW5zaXRpb25fdHdlZW4gZnJvbSBcIi4vdHdlZW5cIjtcblxudmFyIGlkID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIFRyYW5zaXRpb24oZ3JvdXBzLCBwYXJlbnRzLCBuYW1lLCBpZCkge1xuICB0aGlzLl9ncm91cHMgPSBncm91cHM7XG4gIHRoaXMuX3BhcmVudHMgPSBwYXJlbnRzO1xuICB0aGlzLl9uYW1lID0gbmFtZTtcbiAgdGhpcy5faWQgPSBpZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdHJhbnNpdGlvbihuYW1lKSB7XG4gIHJldHVybiBzZWxlY3Rpb24oKS50cmFuc2l0aW9uKG5hbWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbmV3SWQoKSB7XG4gIHJldHVybiArK2lkO1xufVxuXG52YXIgc2VsZWN0aW9uX3Byb3RvdHlwZSA9IHNlbGVjdGlvbi5wcm90b3R5cGU7XG5cblRyYW5zaXRpb24ucHJvdG90eXBlID0gdHJhbnNpdGlvbi5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBUcmFuc2l0aW9uLFxuICBzZWxlY3Q6IHRyYW5zaXRpb25fc2VsZWN0LFxuICBzZWxlY3RBbGw6IHRyYW5zaXRpb25fc2VsZWN0QWxsLFxuICBmaWx0ZXI6IHRyYW5zaXRpb25fZmlsdGVyLFxuICBtZXJnZTogdHJhbnNpdGlvbl9tZXJnZSxcbiAgc2VsZWN0aW9uOiB0cmFuc2l0aW9uX3NlbGVjdGlvbixcbiAgdHJhbnNpdGlvbjogdHJhbnNpdGlvbl90cmFuc2l0aW9uLFxuICBjYWxsOiBzZWxlY3Rpb25fcHJvdG90eXBlLmNhbGwsXG4gIG5vZGVzOiBzZWxlY3Rpb25fcHJvdG90eXBlLm5vZGVzLFxuICBub2RlOiBzZWxlY3Rpb25fcHJvdG90eXBlLm5vZGUsXG4gIHNpemU6IHNlbGVjdGlvbl9wcm90b3R5cGUuc2l6ZSxcbiAgZW1wdHk6IHNlbGVjdGlvbl9wcm90b3R5cGUuZW1wdHksXG4gIGVhY2g6IHNlbGVjdGlvbl9wcm90b3R5cGUuZWFjaCxcbiAgb246IHRyYW5zaXRpb25fb24sXG4gIGF0dHI6IHRyYW5zaXRpb25fYXR0cixcbiAgYXR0clR3ZWVuOiB0cmFuc2l0aW9uX2F0dHJUd2VlbixcbiAgc3R5bGU6IHRyYW5zaXRpb25fc3R5bGUsXG4gIHN0eWxlVHdlZW46IHRyYW5zaXRpb25fc3R5bGVUd2VlbixcbiAgdGV4dDogdHJhbnNpdGlvbl90ZXh0LFxuICByZW1vdmU6IHRyYW5zaXRpb25fcmVtb3ZlLFxuICB0d2VlbjogdHJhbnNpdGlvbl90d2VlbixcbiAgZGVsYXk6IHRyYW5zaXRpb25fZGVsYXksXG4gIGR1cmF0aW9uOiB0cmFuc2l0aW9uX2R1cmF0aW9uLFxuICBlYXNlOiB0cmFuc2l0aW9uX2Vhc2Vcbn07XG4iLCJleHBvcnQgZnVuY3Rpb24gY3ViaWNJbih0KSB7XG4gIHJldHVybiB0ICogdCAqIHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjdWJpY091dCh0KSB7XG4gIHJldHVybiAtLXQgKiB0ICogdCArIDE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjdWJpY0luT3V0KHQpIHtcbiAgcmV0dXJuICgodCAqPSAyKSA8PSAxID8gdCAqIHQgKiB0IDogKHQgLT0gMikgKiB0ICogdCArIDIpIC8gMjtcbn1cbiIsImltcG9ydCB7VHJhbnNpdGlvbiwgbmV3SWR9IGZyb20gXCIuLi90cmFuc2l0aW9uL2luZGV4XCI7XG5pbXBvcnQgc2NoZWR1bGUgZnJvbSBcIi4uL3RyYW5zaXRpb24vc2NoZWR1bGVcIjtcbmltcG9ydCB7ZWFzZUN1YmljSW5PdXR9IGZyb20gXCJkMy1lYXNlXCI7XG5pbXBvcnQge25vd30gZnJvbSBcImQzLXRpbWVyXCI7XG5cbnZhciBkZWZhdWx0VGltaW5nID0ge1xuICB0aW1lOiBudWxsLCAvLyBTZXQgb24gdXNlLlxuICBkZWxheTogMCxcbiAgZHVyYXRpb246IDI1MCxcbiAgZWFzZTogZWFzZUN1YmljSW5PdXRcbn07XG5cbmZ1bmN0aW9uIGluaGVyaXQobm9kZSwgaWQpIHtcbiAgdmFyIHRpbWluZztcbiAgd2hpbGUgKCEodGltaW5nID0gbm9kZS5fX3RyYW5zaXRpb24pIHx8ICEodGltaW5nID0gdGltaW5nW2lkXSkpIHtcbiAgICBpZiAoIShub2RlID0gbm9kZS5wYXJlbnROb2RlKSkge1xuICAgICAgcmV0dXJuIGRlZmF1bHRUaW1pbmcudGltZSA9IG5vdygpLCBkZWZhdWx0VGltaW5nO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGltaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBpZCxcbiAgICAgIHRpbWluZztcblxuICBpZiAobmFtZSBpbnN0YW5jZW9mIFRyYW5zaXRpb24pIHtcbiAgICBpZCA9IG5hbWUuX2lkLCBuYW1lID0gbmFtZS5fbmFtZTtcbiAgfSBlbHNlIHtcbiAgICBpZCA9IG5ld0lkKCksICh0aW1pbmcgPSBkZWZhdWx0VGltaW5nKS50aW1lID0gbm93KCksIG5hbWUgPSBuYW1lID09IG51bGwgPyBudWxsIDogbmFtZSArIFwiXCI7XG4gIH1cblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgICBzY2hlZHVsZShub2RlLCBuYW1lLCBpZCwgaSwgZ3JvdXAsIHRpbWluZyB8fCBpbmhlcml0KG5vZGUsIGlkKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBUcmFuc2l0aW9uKGdyb3VwcywgdGhpcy5fcGFyZW50cywgbmFtZSwgaWQpO1xufVxuIiwiaW1wb3J0IHtzZWxlY3Rpb259IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCBzZWxlY3Rpb25faW50ZXJydXB0IGZyb20gXCIuL2ludGVycnVwdFwiO1xuaW1wb3J0IHNlbGVjdGlvbl90cmFuc2l0aW9uIGZyb20gXCIuL3RyYW5zaXRpb25cIjtcblxuc2VsZWN0aW9uLnByb3RvdHlwZS5pbnRlcnJ1cHQgPSBzZWxlY3Rpb25faW50ZXJydXB0O1xuc2VsZWN0aW9uLnByb3RvdHlwZS50cmFuc2l0aW9uID0gc2VsZWN0aW9uX3RyYW5zaXRpb247XG4iLCJpbXBvcnQge3NlbGVjdCwgc2VsZWN0QWxsfSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQge3NjYWxlQmFuZH0gZnJvbSBcImQzLXNjYWxlXCI7XG5pbXBvcnQge25lc3R9IGZyb20gXCJkMy1jb2xsZWN0aW9uXCI7XG5pbXBvcnQge3RyYW5zaXRpb259IGZyb20gXCJkMy10cmFuc2l0aW9uXCI7XG5cbmltcG9ydCB7Z2V0Q29sb3JzLCBzZXRDb2xvclNjYWxlLCBkcmF3Q29sb3JMZWdlbmR9IGZyb20gXCIuL0NvbG9yc1wiO1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSGVhdG1hcCB7XG4gICAgLyogZGF0YSBpcyBhIGpzb24gd2l0aCB0aGUgZm9sbG93aW5nIGF0dHJpYnV0ZXM6XG4gICAgICAgIHg6IHRoZSB4IGxhYmVsXG4gICAgICAgIHk6IHRoZSB5IGxhYmVsXG4gICAgICAgIHZhbHVlOiB0aGUgcmVuZGVyZWQgbnVtZXJpY2FsIHZhbHVlICh0cmFuc2Zvcm1lZClcbiAgICAgICAgb3JpZ2luYWxWYWx1ZTogdGhlIG9yaWdpbmFsIG51bWVyaWNhbCB2YWx1ZVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0gZGF0YSB7T2JqZWN0fSwgc2VlIGFib3ZlXG4gICAgICogQHBhcmFtIHVzZUxvZyB7Qm9vbGVhbn0gcGVyZm9ybXMgbG9nIHRyYW5zZm9ybWF0aW9uXG4gICAgICogQHBhcmFtIGNvbG9yU2NoZW1lIHtTdHJpbmd9OiByZWNvZ25pemVkIHRlcm1zIGluIENvbG9yczpnZXRDb2xvckludGVycG9sYXRvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGRhdGEsIHVzZUxvZz10cnVlLCBjb2xvclNjaGVtZT1cIllsR25CdVwiLCByPTIpe1xuICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLnVzZUxvZyA9IHVzZUxvZztcbiAgICAgICAgdGhpcy5udWxsQ29sb3IgPSBcIiNlNmU2ZTZcIjtcbiAgICAgICAgdGhpcy5jb2xvclNjYWxlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnhMaXN0ID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnlMaXN0ID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnhTY2FsZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy55U2NhbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuciA9IHI7XG4gICAgICAgIHRoaXMuY29sb3JTY2hlbWUgPSBjb2xvclNjaGVtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZWRyYXdzIHRoZSBoZWF0bWFwOiB3aGVuIHRoZSB4bGlzdCBhbmQgeWxpc3QgYXJlIGNoYW5nZWQsIHJlZHJhdyB0aGUgaGVhdG1hcFxuICAgICAqIEBwYXJhbSBkb20ge1NlbGVjdGlvbn0gYSBkMyBzZWxlY3Rpb24gb2JqZWN0XG4gICAgICogQHBhcmFtIHhMaXN0IHtMaXN0fSBhIGxpc3Qgb2YgeCBsYWJlbHNcbiAgICAgKiBAcGFyYW0geUxpc3Qge0xpc3R9IGEgbGlzdCBvZiB5IGxhYmVsc1xuICAgICAqIEBwYXJhbSBkaW1lbnNpb25zIHtEaWN0aW9uYXJ5fSB7dzpJbnRlZ2VyLCBoOmludGVnZXJ9IHdpdGggdHdvIGF0dHJpYnV0ZXM6IHcgYW5kIGhcbiAgICAgKiBAcGFyYW0gYW5nbGUge0ludGVnZXJ9IGZvciB0aGUgeSB0ZXh0IGxhYmVsc1xuICAgICAqL1xuICAgIHJlZHJhdyhkb20sIHhMaXN0LCB5TGlzdCwgZGltZW5zaW9ucz17dzoxMDAwLCBoOjEwMDB9LCBhbmdsZT0zMCl7XG4gICAgICAgIHRoaXMuX3NldFhMaXN0KGRpbWVuc2lvbnMudywgeExpc3QpO1xuICAgICAgICB0aGlzLl9zZXRZTGlzdChkaW1lbnNpb25zLmgsIHlMaXN0KTtcbiAgICAgICAgdGhpcy5kcmF3KGRvbSwgZGltZW5zaW9ucywgYW5nbGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRyYXcgY29sb3IgbGVnZW5kIGZvciB0aGUgaGVhdCBtYXBcbiAgICAgKiBAcGFyYW0gZG9tIHtTZWxlY3Rpb259IGEgZDMgc2VsZWN0aW9uIG9iamVjdFxuICAgICAqIEBwYXJhbSBsZWdlbmRDb25maWcge09iamVjdH0gd2l0aCBhdHRyOiB4LCB5XG4gICAgICovXG5cbiAgICBkcmF3Q29sb3JMZWdlbmQoZG9tLCBsZWdlbmRDb25maWc9e3g6MCwgeTowfSwgdGlja3M9MTApe1xuICAgICAgICBkcmF3Q29sb3JMZWdlbmQodGhpcy5kYXRhWzBdLnVuaXR8fFwiVmFsdWVcIiwgZG9tLCB0aGlzLmNvbG9yU2NhbGUsIGxlZ2VuZENvbmZpZywgdGhpcy51c2VMb2csIHRpY2tzKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogZHJhd3MgdGhlIGhlYXRtYXBcbiAgICAgKiBAcGFyYW0gZG9tIHtTZWxlY3Rpb259XG4gICAgICogQHBhcmFtIGRpbWVuc2lvbnMge0RpY3Rpb25hcnl9IHt3OkludGVnZXIsIGg6aW50ZWdlcn0gb2YgdGhlIGhlYXRtYXBcbiAgICAgKiBAcGFyYW0gYW5nbGUge0ludGVnZXJ9IGZvciB0aGUgeSB0ZXh0IGxhYmVsc1xuICAgICAqIEBwYXJhbSB1c2VOdWxsQ29sb3Ige0Jvb2xlYW59IHdoZXRoZXIgdG8gcmVuZGVyIG51bGwgdmFsdWVzIHdpdGggdGhlIHByZS1kZWZpbmVkIG51bGwgY29sb3JcbiAgICAgKi9cblxuICAgIGRyYXcoZG9tLCBkaW1lbnNpb25zPXt3OjEwMDAsIGg6NjAwfSwgYW5nbGU9MzAsIHVzZU51bGxDb2xvcj10cnVlKXtcbiAgICAgICAgaWYgKHRoaXMueExpc3QgPT09IHVuZGVmaW5lZCkgdGhpcy5fc2V0WExpc3QoZGltZW5zaW9ucy53KTtcbiAgICAgICAgaWYgKHRoaXMueUxpc3QgPT09IHVuZGVmaW5lZCkgdGhpcy5fc2V0WUxpc3QoZGltZW5zaW9ucy5oKTtcbiAgICAgICAgaWYgKHRoaXMuY29sb3JTY2FsZSA9PT0gdW5kZWZpbmVkKSB0aGlzLmNvbG9yU2NhbGUgPSBzZXRDb2xvclNjYWxlKHRoaXMuZGF0YS5tYXAoKGQpPT5kLnZhbHVlKSwgdGhpcy5jb2xvclNjaGVtZSk7XG5cbiAgICAgICAgLy8gdGV4dCBsYWJlbHNcbiAgICAgICAgLy8gZGF0YSBqb2luXG4gICAgICAgIGNvbnN0IHhMYWJlbHMgPSBkb20uc2VsZWN0QWxsKFwiLmV4cC1tYXAteGxhYmVsXCIpXG4gICAgICAgICAgICAuZGF0YSh0aGlzLnhMaXN0KTtcblxuICAgICAgICAvLyB1cGRhdGUgb2xkIGVsZW1lbnRzXG4gICAgICAgIHhMYWJlbHMuYXR0cihcInRyYW5zZm9ybVwiLCAoZCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCB4ID0gdGhpcy54U2NhbGUoZCkrKHRoaXMueFNjYWxlLmJhbmR3aWR0aCgpLzIpICsgMTtcbiAgICAgICAgICAgICAgICBsZXQgeSA9IHRoaXMueVNjYWxlLnJhbmdlKClbMV0gKyAxNztcbiAgICAgICAgICAgICAgICByZXR1cm4gYHRyYW5zbGF0ZSgke3h9LCAke3l9KSByb3RhdGUoJHthbmdsZX0pYDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gLmF0dHIoXCJjbGFzc1wiLCAoZCwgaSkgPT4gYGV4cC1tYXAteGxhYmVsIHgke2l9YCk7XG5cblxuICAgICAgICAvLyBlbnRlcnMgbmV3IGVsZW1lbnRzXG4gICAgICAgIHhMYWJlbHMuZW50ZXIoKS5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIChkLCBpKSA9PiBgZXhwLW1hcC14bGFiZWwgeCR7aX1gKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIDApXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgMClcbiAgICAgICAgICAgIC5zdHlsZShcImN1cnNvclwiLCBcInBvaW50ZXJcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwic3RhcnRcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIChkKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHggPSB0aGlzLnhTY2FsZShkKSsodGhpcy54U2NhbGUuYmFuZHdpZHRoKCkvMikgKyAxO1xuICAgICAgICAgICAgICAgIGxldCB5ID0gdGhpcy55U2NhbGUucmFuZ2UoKVsxXSArIDE3O1xuICAgICAgICAgICAgICAgIHJldHVybiBgdHJhbnNsYXRlKCR7eH0sICR7eX0pIHJvdGF0ZSgke2FuZ2xlfSlgO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5tZXJnZSh4TGFiZWxzKVxuICAgICAgICAgICAgLnRleHQoKGQpID0+IGQpO1xuXG4gICAgICAgIC8vIGV4aXQgLS0gcmVtb3ZlcyBvbGQgZWxlbWVudHMgYXMgbmVlZGVkXG4gICAgICAgIHhMYWJlbHMuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICAgIGNvbnN0IHlMYWJlbHMgPSBkb20uc2VsZWN0QWxsKFwiLmV4cC1tYXAteWxhYmVsXCIpXG4gICAgICAgICAgICAuZGF0YSh0aGlzLnlMaXN0KVxuICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgLnRleHQoKGQpID0+IGQpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgdGhpcy54U2NhbGUucmFuZ2UoKVsxXSArIDUpXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgKGQpID0+IHRoaXMueVNjYWxlKGQpICsgMTApXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIChkLCBpKSA9PiBgZXhwLW1hcC15bGFiZWwgeSR7aX1gKVxuICAgICAgICAgICAgLnN0eWxlKFwiY3Vyc29yXCIsIFwicG9pbnRlclwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJzdGFydFwiKVxuICAgICAgICAgICAgLm9uKCdjbGljaycsIChkKSA9PiB7XG4gICAgICAgICAgICAgICAgYWxlcnQoYCR7ZH0gaXMgY2xpY2tlZC4gVG8gYmUgaW1wbGVtZW50ZWRgKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdmVyJywgZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdub3JtYWwnLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgIHNlbGVjdCh0aGlzKVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZCgnbm9ybWFsJywgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgZmFsc2UpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcmVuZGVycyB0aGUgaGVhdG1hcCBjZWxsc1xuXG4gICAgICAgIC8vIGRhdGEgam9pblxuICAgICAgICBjb25zdCBjZWxscyA9IGRvbS5zZWxlY3RBbGwoXCIuZXhwLW1hcC1jZWxsXCIpXG4gICAgICAgICAgICAuZGF0YSh0aGlzLmRhdGEsIChkKSA9PiBkLnZhbHVlKTtcblxuICAgICAgICAvLyB1cGRhdGUgb2xkIGVsZW1lbnRzXG4gICAgICAgIGNlbGxzLmF0dHIoXCJ4XCIsIChkKSA9PiB0aGlzLnhTY2FsZShkLngpKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIChkKSA9PiB0aGlzLnlTY2FsZShkLnkpKVxuICAgICAgICAgICAgLmF0dHIoXCJyb3dcIiwgKGQpID0+IGB4JHt0aGlzLnhMaXN0LmluZGV4T2YoZC54KX1gKVxuICAgICAgICAgICAgLmF0dHIoXCJjb2xcIiwgKGQpID0+IGB5JHt0aGlzLnlMaXN0LmluZGV4T2YoZC55KX1gKTtcblxuICAgICAgICAvLyBlbnRlciBuZXcgZWxlbWVudHNcbiAgICAgICAgY29uc3QgbnVsbENvbG9yID0gXCIjREREREREXCI7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBjZWxscy5lbnRlcigpLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgIC5hdHRyKFwicm93XCIsIChkKSA9PiBgeCR7dGhpcy54TGlzdC5pbmRleE9mKGQueCl9YClcbiAgICAgICAgICAgIC5hdHRyKFwiY29sXCIsIChkKSA9PiBgeSR7dGhpcy55TGlzdC5pbmRleE9mKGQueSl9YClcblxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIChkKSA9PiB0aGlzLnhTY2FsZShkLngpKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIChkKSA9PiB0aGlzLnlTY2FsZShkLnkpKVxuICAgICAgICAgICAgLmF0dHIoXCJyeFwiLCB0aGlzLnIpXG4gICAgICAgICAgICAuYXR0cigncnknLCB0aGlzLnIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIChkKSA9PiBgZXhwLW1hcC1jZWxsYClcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgdGhpcy54U2NhbGUuYmFuZHdpZHRoKCkpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCB0aGlzLnlTY2FsZS5iYW5kd2lkdGgoKSlcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgKGQpID0+IFwiI2VlZWVlZVwiKVxuICAgICAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsIGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkID0gc2VsZWN0KHRoaXMpOyAvLyBOb3RlOiBcInRoaXNcIiBoZXJlIHJlZmVycyB0byB0aGUgZG9tIGVsZW1lbnQgbm90IHRoZSBvYmplY3RcbiAgICAgICAgICAgICAgICBzZWxmLmNlbGxNb3VzZW92ZXIoc2VsZWN0ZWQpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWQgPSBzZWxlY3QodGhpcyk7IC8vIE5vdGU6IFwidGhpc1wiIGhlcmUgcmVmZXJzIHRvIHRoZSBkb20gZWxlbWVudCBub3QgdGhlIG9iamVjdFxuICAgICAgICAgICAgICAgIHNlbGYuY2VsbE1vdXNlb3V0KClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAubWVyZ2UoY2VsbHMpXG4gICAgICAgICAgICAvLyAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAvLyAuZHVyYXRpb24oMjAwMClcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgKGQpID0+IHVzZU51bGxDb2xvciYmZC5vcmlnaW5hbFZhbHVlPT0wP251bGxDb2xvcjp0aGlzLmNvbG9yU2NhbGUoZC52YWx1ZSkpOyAvLyBUT0RPOiB3aGF0IGlmIG51bGwgdmFsdWUgaXNuJ3QgMD9cblxuICAgICAgICAvLyBleGl0IGFuZCByZW1vdmVcbiAgICAgICAgY2VsbHMuZXhpdCgpLnJlbW92ZSgpO1xuICAgIH1cblxuICAgIGNlbGxNb3VzZW91dChkKXtcbiAgICAgICAgc2VsZWN0QWxsKFwiKlwiKS5jbGFzc2VkKCdoaWdobGlnaHRlZCcsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBjZWxsTW91c2VvdmVyIChzZWxlY3RlZCkge1xuICAgICAgICBjb25zdCByb3dDbGFzcyA9IHNlbGVjdGVkLmF0dHIoXCJyb3dcIik7XG4gICAgICAgIGNvbnN0IGNvbENsYXNzID0gc2VsZWN0ZWQuYXR0cihcImNvbFwiKTtcbiAgICAgICAgc2VsZWN0QWxsKFwiLmV4cC1tYXAteGxhYmVsXCIpLmZpbHRlcihgLiR7cm93Q2xhc3N9YClcbiAgICAgICAgICAgIC5jbGFzc2VkKCdoaWdobGlnaHRlZCcsIHRydWUpO1xuICAgICAgICBzZWxlY3RBbGwoXCIuZXhwLW1hcC15bGFiZWxcIikuZmlsdGVyKGAuJHtjb2xDbGFzc31gKVxuICAgICAgICAgICAgLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgdHJ1ZSk7XG4gICAgICAgIHNlbGVjdGVkLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgX3NldFhMaXN0KHdpZHRoLCBuZXdMaXN0KSB7XG4gICAgICAgIGlmKG5ld0xpc3QgIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICB0aGlzLnhMaXN0ID0gbmV3TGlzdFxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy54TGlzdCA9IG5lc3QoKVxuICAgICAgICAgICAgICAgIC5rZXkoKGQpID0+IGQueClcbiAgICAgICAgICAgICAgICAuZW50cmllcyh0aGlzLmRhdGEpXG4gICAgICAgICAgICAgICAgLm1hcCgoZCkgPT4gZC5rZXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy54U2NhbGUgPSBzY2FsZUJhbmQoKVxuICAgICAgICAgICAgLmRvbWFpbih0aGlzLnhMaXN0KVxuICAgICAgICAgICAgLnJhbmdlKFswLCB3aWR0aF0pXG4gICAgICAgICAgICAucGFkZGluZyguMDUpOyAvLyBUT0RPOiBlbGltaW5hdGUgaGFyZC1jb2RlZCB2YWx1ZVxuICAgIH1cblxuICAgIF9zZXRZTGlzdChoZWlnaHQsIG5ld0xpc3QpIHtcbiAgICAgICAgaWYobmV3TGlzdCAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgIHRoaXMueUxpc3QgPSBuZXdMaXN0XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgIHRoaXMueUxpc3QgPSBuZXN0KClcbiAgICAgICAgICAgIC5rZXkoKGQpID0+IGQueSlcbiAgICAgICAgICAgIC5lbnRyaWVzKHRoaXMuZGF0YSlcbiAgICAgICAgICAgIC5tYXAoKGQpID0+IGQua2V5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnlTY2FsZSA9IHNjYWxlQmFuZCgpXG4gICAgICAgICAgICAgICAgLmRvbWFpbih0aGlzLnlMaXN0KVxuICAgICAgICAgICAgICAgIC5yYW5nZShbMCwgaGVpZ2h0XSlcbiAgICAgICAgICAgICAgICAucGFkZGluZyguMDUpOyAvLyBUT0RPOiBlbGltaW5hdGUgaGFyZC1jb2RlZCB2YWx1ZVxuICAgIH1cblxuXG59IiwiaW1wb3J0IHtzZWxlY3QsIGV2ZW50fSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRvb2x0aXAge1xuICAgIGNvbnN0cnVjdG9yKGlkLCB2ZXJib3NlPWZhbHNlLCBvZmZzZXRYPTMwLCBvZmZzZXRZPS00MCwgZHVyYXRpb249NTAwKXtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLnZlcmJvc2UgPSB2ZXJib3NlO1xuICAgICAgICB0aGlzLm9mZnNldFggPSBvZmZzZXRYO1xuICAgICAgICB0aGlzLm9mZnNldFkgPSBvZmZzZXRZO1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgfVxuXG4gICAgc2hvdyhpbmZvKSB7XG4gICAgICAgIGlmKHRoaXMudmVyYm9zZSkgY29uc29sZS5sb2coaW5mbyk7XG4gICAgICAgIHRoaXMuZWRpdChpbmZvKTtcbiAgICAgICAgdGhpcy5tb3ZlKCk7XG4gICAgICAgIHNlbGVjdChcIiNcIiArIHRoaXMuaWQpXG4gICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsIFwiaW5saW5lXCIpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24odGhpcy5kdXJhdGlvbilcbiAgICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIiwgMS4wKVxuXG4gICAgfVxuXG4gICAgaGlkZSgpIHtcbiAgICAgICAgc2VsZWN0KFwiI1wiICsgdGhpcy5pZClcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbih0aGlzLmR1cmF0aW9uKVxuICAgICAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLCAwLjApO1xuICAgICAgICB0aGlzLmVkaXQoXCJcIik7XG4gICAgfVxuXG4gICAgbW92ZSh4ID0gZXZlbnQucGFnZVgsIHkgPSBldmVudC5wYWdlWSkge1xuICAgICAgICBpZiAodGhpcy52ZXJib3NlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh4KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHkpO1xuICAgICAgICB9XG4gICAgICAgIHggPSB4ICsgdGhpcy5vZmZzZXRYOyAvLyBUT0RPOiBnZXQgcmlkIG9mIHRoZSBoYXJkLWNvZGVkIGFkanVzdG1lbnRcbiAgICAgICAgeSA9ICh5ICsgdGhpcy5vZmZzZXRZKTwwPzEwOnkrdGhpcy5vZmZzZXRZO1xuICAgICAgICBjb25zdCB0ID0gc2VsZWN0KCcjJyt0aGlzLmlkKVxuICAgICAgICAgICAgLnN0eWxlKFwibGVmdFwiLCBgJHt4fXB4YClcbiAgICAgICAgICAgIC5zdHlsZShcInRvcFwiLCBgJHt5fXB4YClcbiAgICB9XG5cbiAgICBlZGl0KGluZm8pIHtcbiAgICAgICAgc2VsZWN0KFwiI1wiICsgdGhpcy5pZClcbiAgICAgICAgICAgIC5odG1sKGluZm8pXG4gICAgfVxufVxuXG4iLCJpbXBvcnQge2NyZWF0ZVN2Z30gZnJvbSBcIi4vdXRpbHNcIjtcbmltcG9ydCB7c2VsZWN0fSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5cbmltcG9ydCBEZW5kcm9IZWF0bWFwQ29uZmlnIGZyb20gXCIuL0RlbmRyb0hlYXRtYXBDb25maWdcIjtcbmltcG9ydCBEZW5kcm9ncmFtIGZyb20gXCIuL0RlbmRyb2dyYW1cIjtcbmltcG9ydCBIZWF0bWFwIGZyb20gXCIuL0hlYXRtYXBcIjtcbmltcG9ydCBUb29sdGlwIGZyb20gXCIuL1Rvb2x0aXBcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGVuZHJvSGVhdG1hcCB7XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSBjb2x1bW5UcmVlIHtTdHJpbmd9IGEgbmV3aWNrIHRyZWVcbiAgICAgKiBAcGFyYW0gcm93VHJlZSB7U3RyaW5nfSBhIG5ld2ljayB0cmVlXG4gICAgICogQHBhcmFtIGhlYXRtYXBEYXRhIHtMaXN0fSBvZiBvYmplY3RzIHdpdGggYXR0cmlidXRlczogeDogU3RyaW5nLCB5OlN0cmluZywgdmFsdWU6RmxvYXQsIG9yaWdpbmFsVmFsdWU6RmxvYXRcbiAgICAgKiBAcGFyYW0gY29sb3Ige1N0cmluZ30gYSBjb2xvciBuYW1lIHRoYXQncyBhdmFpbGFibGUgaW4gQ29sb3JzLmdldENvbG9ySW50ZXJwb2xhdG9yXG4gICAgICogQHBhcmFtIHIge0ludGVnZXJ9IHRoZSBkZWdyZWVzIG9mIHJvdW5kZWQtY29ybmVycyBvZiB0aGUgaGVhdG1hcCBjZWxsc1xuICAgICAqIEBwYXJhbSBjb25maWcge0RlbmRyb0hlYXRtYXBDb25maWd9XG4gICAgICogQHBhcmFtIHVzZUxvZyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb2x1bW5UcmVlLCByb3dUcmVlLCBoZWF0bWFwRGF0YSwgY29sb3I9XCJZbEduQnVcIiwgcj0yLCBjb25maWc9bmV3IERlbmRyb0hlYXRtYXBDb25maWcoKSwgdXNlTG9nPXRydWUpe1xuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZy5nZXQoKTtcbiAgICAgICAgLy9pbnB1dCBldmFsdWF0aW9uc1xuICAgICAgICBjb2x1bW5UcmVlID0gY29sdW1uVHJlZT09PXVuZGVmaW5lZHx8Y29sdW1uVHJlZS5zdGFydHNXaXRoKFwiTm90IGVub3VnaCBkYXRhXCIpP3VuZGVmaW5lZDpjb2x1bW5UcmVlO1xuICAgICAgICByb3dUcmVlID0gcm93VHJlZT09PXVuZGVmaW5lZHx8cm93VHJlZS5zdGFydHNXaXRoKFwiTm90IGVub3VnaCBkYXRhXCIpP3VuZGVmaW5lZDpyb3dUcmVlO1xuICAgICAgICAvLyBhc3NpZ24gYXR0cmlidXRlIHZhbHVlcyBiYXNlZCBvbiBpbnB1dCBhcmd1bWVudHNcbiAgICAgICAgdGhpcy5kYXRhID0ge1xuICAgICAgICAgICAgY29sdW1uVHJlZTogY29sdW1uVHJlZSxcbiAgICAgICAgICAgIHJvd1RyZWU6IHJvd1RyZWUsXG4gICAgICAgICAgICBoZWF0bWFwOiBoZWF0bWFwRGF0YSxcbiAgICAgICAgICAgIGV4dGVybmFsOiB1bmRlZmluZWRcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5vYmplY3RzID0ge1xuICAgICAgICAgICAgY29sdW1uVHJlZTogdGhpcy5kYXRhLmNvbHVtblRyZWU9PT11bmRlZmluZWQ/IHVuZGVmaW5lZDpuZXcgRGVuZHJvZ3JhbSh0aGlzLmRhdGEuY29sdW1uVHJlZSwgXCJ2XCIpLFxuICAgICAgICAgICAgcm93VHJlZTogdGhpcy5kYXRhLnJvd1RyZWU9PT11bmRlZmluZWQ/dW5kZWZpbmVkOm5ldyBEZW5kcm9ncmFtKHRoaXMuZGF0YS5yb3dUcmVlLCBcImhcIiksXG4gICAgICAgICAgICBoZWF0bWFwOiBuZXcgSGVhdG1hcCh0aGlzLmRhdGEuaGVhdG1hcCwgdXNlTG9nLCBjb2xvciwgcilcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy52aXN1YWxDb21wb25lbnRzID0ge1xuICAgICAgICAgICAgdG9vbHRpcDogbmV3IFRvb2x0aXAoXCJ0b29sdGlwXCIsIGZhbHNlKSwgLy8gVE9ETzogcmVtb3ZlIGhhcmQtY29kZWQgdG9vbHRpcCBET00gSURcbiAgICAgICAgICAgIHN2ZzogdW5kZWZpbmVkLFxuICAgICAgICAgICAgY29sdW1uVHJlZTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgcm93VHJlZTogdW5kZWZpbmVkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHRoZSBkZW5kcm9ncmFtcyBhbmQgY29ycmVzcG9uZGluZyBoZWF0bWFwXG4gICAgICogQHBhcmFtIGRvbUlkIHtTdHJpbmd9IHRoZSBET00gaWQgb2YgdGhlIFNWR1xuICAgICAqIEBwYXJhbSBzaG93Q29sdW1uVHJlZSB7Qm9vbGVhbn0gcmVuZGVyIHRoZSBjb2x1bW4gZGVuZHJvZ3JhbVxuICAgICAqIEBwYXJhbSBzaG93Um93VHJlZSB7Qm9vbGVhbn0gcmVuZGVyIHRoZSByb3cgZGVuZHJvZ3JhbVxuICAgICAqIEBwYXJhbSBsZWdlbmRQb3Mge0VudW19IHdoZXJlIHRvIHBsYWNlIHRoZSBjb2xvciBsZWdlbmQ6IGJvdHRvbSwgdG9wXG4gICAgICogQHBhcmFtIHRpY2tzIHtJbnRlZ2VyfSBudW1iZXIgb2YgYmlucyBvZiB0aGUgY29sb3IgbGVnZW5kXG4gICAgICovXG4gICAgcmVuZGVyKGRvbUlkLCBzaG93Q29sdW1uVHJlZT10cnVlLCBzaG93Um93VHJlZT10cnVlLCBsZWdlbmRQb3M9XCJib3R0b21cIiwgdGlja3M9MTApe1xuICAgICAgICB0aGlzLl91cGRhdGVDb25maWcobGVnZW5kUG9zKTtcbiAgICAgICAgdGhpcy52aXN1YWxDb21wb25lbnRzLnN2ZyA9IGNyZWF0ZVN2Zyhkb21JZCwgdGhpcy5jb25maWcudywgdGhpcy5jb25maWcuaCwgdGhpcy5jb25maWcubWFyZ2luKTtcblxuICAgICAgICBsZXQgeGxpc3QgPSB1bmRlZmluZWQsXG4gICAgICAgICAgICB5bGlzdCA9IHVuZGVmaW5lZDtcblxuICAgICAgICBpZiAoc2hvd0NvbHVtblRyZWUgJiYgdGhpcy5vYmplY3RzLmNvbHVtblRyZWUhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgdGhpcy52aXN1YWxDb21wb25lbnRzLmNvbHVtblRyZWUgPSB0aGlzLl9yZW5kZXJUcmVlKHRoaXMub2JqZWN0cy5jb2x1bW5UcmVlLCB0aGlzLmNvbmZpZy5wYW5lbHMudG9wKTtcbiAgICAgICAgICAgIHhsaXN0ID0gdGhpcy5vYmplY3RzLmNvbHVtblRyZWUueFNjYWxlLmRvbWFpbigpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzaG93Um93VHJlZSAmJiB0aGlzLm9iamVjdHMucm93VHJlZSAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgIHRoaXMudmlzdWFsQ29tcG9uZW50cy5yb3dUcmVlID0gdGhpcy5fcmVuZGVyVHJlZSh0aGlzLm9iamVjdHMucm93VHJlZSwgdGhpcy5jb25maWcucGFuZWxzLmxlZnQpO1xuICAgICAgICAgICAgeWxpc3QgPSB0aGlzLm9iamVjdHMucm93VHJlZS55U2NhbGUuZG9tYWluKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9yZW5kZXJIZWF0bWFwKHRoaXMub2JqZWN0cy5oZWF0bWFwLCB4bGlzdCwgeWxpc3QsIHRpY2tzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZW5kZXJzIGEgbmV3aWNrIHRyZWVcbiAgICAgKiBAcGFyYW0gdHJlZSB7RGVuZHJvZ3JhbX0gYSBEZW5kcm9ncmFtIG9iamVjdFxuICAgICAqIEBwYXJhbSBjb25maWcge09iamVjdH0gYSBwYW5lbCBjb25maWcgd2l0aCBhdHRyaWJ1dGVzOiB4LCB5LCB3aWR0aCBhbmQgaGVpZ2h0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcmVuZGVyVHJlZSh0cmVlLCBjb25maWcpe1xuICAgICAgICBsZXQgZG9tID0gdGhpcy52aXN1YWxDb21wb25lbnRzLnN2ZztcbiAgICAgICAgY29uc3QgdG9vbHRpcCA9IHRoaXMudmlzdWFsQ29tcG9uZW50cy50b29sdGlwO1xuICAgICAgICBjb25zdCBnID0gZG9tLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaWRcIiwgY29uZmlnLmlkKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgke2NvbmZpZy54fSwgJHtjb25maWcueX0pYCk7XG4gICAgICAgIHRyZWUuZHJhdyhnLCBjb25maWcudywgY29uZmlnLmgpO1xuXG4gICAgICAgIC8vIGN1c3RvbWl6ZWQgbW91c2UgZXZlbnRzXG4gICAgICAgIGNvbnN0IG1vdXNlb3ZlciA9IGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJyXCIsIDYpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwicmVkXCIpO1xuICAgICAgICAgICAgY29uc3QgbGVhdmVzID0gZC5sZWF2ZXMoKS5tYXAoKG5vZGUpPT5ub2RlLmRhdGEubmFtZSk7XG4gICAgICAgICAgICB0b29sdGlwLnNob3coYCR7bGVhdmVzLmpvaW4oXCI8YnI+XCIpfWApO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBtb3VzZW91dCA9IGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJyXCIsIDIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwiIzMzM1wiKTtcbiAgICAgICAgICAgIHRvb2x0aXAuaGlkZSgpO1xuICAgICAgICB9O1xuICAgICAgICBnLnNlbGVjdEFsbChcIi5kZW5kcm9ncmFtLW5vZGVcIilcbiAgICAgICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCBtb3VzZW92ZXIpXG4gICAgICAgICAgICAub24oXCJtb3VzZW91dFwiLCBtb3VzZW91dCk7XG4gICAgICAgIHJldHVybiBnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJlbmRlcnMgdGhlIGhlYXRtYXAgYW5kIGNvbG9yIGxlZ2VuZFxuICAgICAqIEBwYXJhbSBoZWF0bWFwIHtIZWF0bWFwfSBhIEhlYXRtYXAgb2JqZWN0XG4gICAgICogQHBhcmFtIHhMaXN0IHtMaXN0fSBhIGxpc3Qgb2YgeCBsYWJlbHNcbiAgICAgKiBAcGFyYW0geUxpc3Qge0xpc3R9IGEgbGlzdCBvZiB5IGxhYmVsc1xuICAgICAqIEBwYXJhbSB0aWNrcyB7SW50ZWdlcn0gdGhlIG51bWJlciBvZiBiaW5zIGluIHRoZSBjb2xvciBsZWdlbmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZW5kZXJIZWF0bWFwKGhlYXRtYXAsIHhMaXN0LCB5TGlzdCwgdGlja3M9MTApe1xuICAgICAgICBsZXQgZG9tID0gdGhpcy52aXN1YWxDb21wb25lbnRzLnN2ZztcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5jb25maWcucGFuZWxzLm1haW47XG4gICAgICAgIGNvbnN0IGcgPSBkb20uYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJpZFwiLCBjb25maWcuaWQpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBgdHJhbnNsYXRlKCR7Y29uZmlnLnh9LCAke2NvbmZpZy55fSlgKTtcbiAgICAgICAgaGVhdG1hcC5yZWRyYXcoZywgeExpc3QsIHlMaXN0LCB7dzogY29uZmlnLncsIGg6IGNvbmZpZy5ofSk7XG4gICAgICAgIGhlYXRtYXAuZHJhd0NvbG9yTGVnZW5kKGRvbSwgdGhpcy5jb25maWcucGFuZWxzLmxlZ2VuZCwgdGlja3MpO1xuICAgIH1cblxuXG5cbiAgICAvKipcbiAgICAgKiBhZGp1c3RzIHRoZSBsYXlvdXQgZGltZW5zaW9ucyBiYXNlZCBvbiB0aGUgYWN0dWFsIGRhdGFcbiAgICAgKiBAcGFyYW0gbGVnZW5kUG9zIHtTdHJpbmd9IGJvdHRvbSBvciB0b3BcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF91cGRhdGVDb25maWcobGVnZW5kUG9zKXtcbiAgICAgICAgY29uc3Qgcm93cyA9IHRoaXMub2JqZWN0cy5yb3dUcmVlPT09dW5kZWZpbmVkPzE6dGhpcy5vYmplY3RzLnJvd1RyZWUubGVhdmVzLmxlbmd0aDtcblxuICAgICAgICAvLyB1cGRhdGVzIHRoZSBsZWZ0IHBhbmVsJ3MgaGVpZ2h0IGJhc2VkIG9uIHRoZSBkYXRhXG4gICAgICAgIHRoaXMuY29uZmlnLnBhbmVscy5sZWZ0LmggPSB0aGlzLmNvbmZpZy5jZWxsLmggKiByb3dzPDIwPzIwOnRoaXMuY29uZmlnLmNlbGwuaCAqIHJvd3M7XG4gICAgICAgIGlmKGxlZ2VuZFBvcz09XCJib3R0b21cIikgdGhpcy5jb25maWcucGFuZWxzLmxlZ2VuZC55ICs9IHRoaXMuY29uZmlnLnBhbmVscy5sZWZ0Lmg7XG4gICAgICAgIHRoaXMuY29uZmlnLmggKz0gdGhpcy5jb25maWcucGFuZWxzLmxlZnQuaDtcbiAgICAgICAgdGhpcy5jb25maWcucGFuZWxzLm1haW4uaCA9IHRoaXMuY29uZmlnLnBhbmVscy5sZWZ0Lmg7XG5cbiAgICB9XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5pbXBvcnQge2pzb24sIHRzdn0gZnJvbSBcImQzLWZldGNoXCI7XG5pbXBvcnQge3NlbGVjdCwgc2VsZWN0QWxsLCBldmVudH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHtrZXlzLCB2YWx1ZXN9IGZyb20gXCJkMy1jb2xsZWN0aW9uXCI7XG5cbmltcG9ydCB7Z2V0R3RleFVybHMsXG4gICAgICAgIGdldFRpc3N1ZUNsdXN0ZXJzLFxuICAgICAgICBnZXRHZW5lQ2x1c3RlcnMsXG4gICAgICAgIHBhcnNlTWVkaWFuVFBNLFxuICAgICAgICBwYXJzZVRpc3N1ZXMsXG4gICAgICAgIHBhcnNlTWVkaWFuRXhwcmVzc2lvbixcbiAgICAgICAgbWFrZUpzb25Gb3JQbG90bHlcbn0gZnJvbSBcIi4vbW9kdWxlcy9ndGV4RGF0YVBhcnNlclwiO1xuaW1wb3J0IHtjb2xvckNoYXJ0fSBmcm9tIFwiLi9tb2R1bGVzL0NvbG9yc1wiO1xuaW1wb3J0IHtkb3dubG9hZFN2Z30gZnJvbSBcIi4vbW9kdWxlcy91dGlsc1wiO1xuXG5pbXBvcnQgRGVuZHJvSGVhdG1hcCBmcm9tIFwiLi9tb2R1bGVzL0RlbmRyb0hlYXRtYXBcIjtcblxuLyoqXG4gKiBNYXlvIGRlbW9cbiAqIEBwYXJhbSBkb21JZFxuICogQHBhcmFtIHRvb2xiYXJJZFxuICogQHBhcmFtIHVybHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlck1heW8oZG9tSWQsIHRvb2xiYXJJZCwgdXJscz1nZXRHdGV4VXJscygpKXtcbiAgICAvLyAtIGdldHMgc3RhdGljIGRhdGFcbiAgICBjb25zdCB0aXNzdWVUcmVlID0gZ2V0VGlzc3VlQ2x1c3RlcnMoJ3RvcDUwQ2VyZWJlbGx1bV9BRCcpLFxuICAgICAgICAgIGdlbmVUcmVlID0gZ2V0R2VuZUNsdXN0ZXJzKCd0b3A1MENlcmViZWxsdW1fQUQnKTtcbiAgICBQcm9taXNlLmFsbChbanNvbih1cmxzLnRpc3N1ZSksIHRzdih1cmxzLm1heW9HZW5lRXhwKV0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGFyZ3Mpe1xuICAgICAgICAgICAgY29uc3QgdGlzc3VlcyA9IHBhcnNlVGlzc3VlcyhhcmdzWzBdKTtcbiAgICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBwYXJzZU1lZGlhblRQTShhcmdzWzFdLCB0cnVlKTtcbiAgICAgICAgICAgIGNvbnN0IGRtYXAgPSBuZXcgRGVuZHJvSGVhdG1hcCh0aXNzdWVUcmVlLCBnZW5lVHJlZSwgZXhwcmVzc2lvbik7XG4gICAgICAgICAgICBkbWFwLnJlbmRlcihkb21JZCk7XG4gICAgICAgICAgICAvLyBjdXN0b21pemF0aW9uIGZvciBHVEV4XG4gICAgICAgICAgICBjb25zdCB0aXNzdWVEaWN0ID0gdGlzc3Vlcy5yZWR1Y2UoKGEsIGQpPT57XG4gICAgICAgICAgICAgICAgaWYoIWQuaGFzT3duUHJvcGVydHkoXCJ0aXNzdWVJZFwiKSkgdGhyb3cgXCJ0aXNzdWUgaGFzIG5vIGF0dHIgdGlzc3VlX2lkXCI7XG4gICAgICAgICAgICAgICAgYVtkLnRpc3N1ZUlkXSA9IGQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICB9LCB7fSk7XG4gICAgICAgICAgICBjb25zdCBnZW5lRGljdCA9IGRtYXAuZGF0YS5oZWF0bWFwLnJlZHVjZSgoYSwgZCwgaSk9PntcbiAgICAgICAgICAgICAgICBpZiAoIWQuaGFzT3duUHJvcGVydHkoXCJnZW5jb2RlSWRcIikpIHRocm93IFwiZ2VuZSBoYXMgbm8gYXR0ciBnZW5jb2RlSWRcIjtcbiAgICAgICAgICAgICAgICBhW2QuZ2VuY29kZUlkXT1kO1xuICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgfSwge30pO1xuICAgICAgICAgICAgX2N1c3RvbWl6ZUxhYmVscyhkbWFwLCB0aXNzdWVEaWN0LCBnZW5lRGljdCk7XG4gICAgICAgICAgICBfYWRkVGlzc3VlQ29sb3JzKGRtYXAsIHRpc3N1ZURpY3QpO1xuICAgICAgICAgICAgX2N1c3RvbWl6ZU1vdXNlRXZlbnRzKGRtYXAsIHRpc3N1ZURpY3QsIGdlbmVEaWN0KTtcbiAgICAgICAgICAgIF9jcmVhdGVUb29sYmFyKGRvbUlkLCB0b29sYmFySWQsIHVuZGVmaW5lZCwgZG1hcCwgdGlzc3VlRGljdCwgW10sIHVybHMpO1xuICAgICAgICAgICAgJCgnI3NwaW5uZXInKS5oaWRlKCk7IC8vIFRPRE86IHJlbW92ZSBoYXJkLWNvZGVkIGRvbSBJRFxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXt0aHJvdyBlcnJ9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0KGlkcyl7XG4gICAgaWRzLmZvckVhY2goKGQpPT57JChgIyR7ZH1gKS5lbXB0eSgpfSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIHRoZSB0aXNzdWUgKGRhdGFzZXQpIGRyb3Bkb3duIG1lbnUgdXNpbmcgc2VsZWN0MlxuICogQHBhcmFtIGRvbUlkIHtTdHJpbmd9IHRoZSBkb20gSUQgb2YgdGhlIG1lbnVcbiAqIEBwYXJhbSB1cmxzIHtPYmplY3R9IG9mIHdlYiBzZXJ2aWNlIHVybHMgd2l0aCBhdHRyOiB0aXNzdWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURhdGFzZXRNZW51KGRvbUlkLCB1cmxzID0gZ2V0R3RleFVybHMoKSl7XG4gICAganNvbih1cmxzLnRpc3N1ZSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0cyl7XG4gICAgICAgICAgICBsZXQgdGlzc3VlcyA9IHBhcnNlVGlzc3VlcyhyZXN1bHRzKTtcbiAgICAgICAgICAgIHRpc3N1ZXMuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICAgICAgICAgIGQuaWQgPSBkLnRpc3N1ZUlkO1xuICAgICAgICAgICAgICAgIGQudGV4dCA9IGQudGlzc3VlTmFtZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGlzc3Vlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYoYS50aXNzdWVOYW1lIDwgYi50aXNzdWVOYW1lKSByZXR1cm4gLTE7XG4gICAgICAgICAgICAgICAgaWYoYS50aXNzdWVOYW1lID4gYi50aXNzdWVOYW1lKSByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBleHRlcm5hbCBsaWJyYXJ5IGRlcGVuZGVuY3k6IHNlbGVjdDJcbiAgICAgICAgICAgICQoYCMke2RvbUlkfWApLnNlbGVjdDIoe1xuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnU2VsZWN0IGEgZGF0YSBzZXQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHRpc3N1ZXNcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpe2NvbnNvbGUuZXJyb3IoZXJyKX0pO1xuXG59XG5cbi8qKlxuICogUmVuZGVyIHRvcCBleHByZXNzZWQgZ2VuZXMgaW4gYSBnaXZlbiB0aXNzdWVcbiAqIEBwYXJhbSB0aXNzdWVJZFxuICogQHBhcmFtIGRvbUlkIHtTdHJpbmd9IHRoZSBkZW5kcm9oZWF0bWFwJ3MgRElWIElEXG4gKiBAcGFyYW0gdG9vbGJhcklkIHtTdHJpbmd9IHRoZSB0b29sIGJhciBET00gSURcbiAqIEBwYXJhbSBpbmZvSWQge1N0cmluZ30gdGhlIG1lc3NhZ2UgYm94IERPTSBJRFxuICogQHBhcmFtIHVybHMge0RpY3Rpb25hcnl9IG9mIEdURXggd2ViIHNlcnZpY2VzIHVybHNcbiAqIEBwYXJhbSB1c2VGaWx0ZXJzIHtCb29sZWFufSBpZiB0aGUgZmlsdGVyIGlzIGFwcGxpZWQsIGFuZCBpZiB1bmRlZmluZWQsIGl0IG1lYW5zIG5vIGZpbHRlclxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyVG9wRXhwcmVzc2VkKHRpc3N1ZUlkLCBkb21JZCwgdG9vbGJhcklkLCBpbmZvSWQsIHVybHM9Z2V0R3RleFVybHMoKSwgdXNlRmlsdGVycz10cnVlKXtcbiAgICAvLyBnZXR0aW5nIGRhdGFcbiAgICBjb25zdCB1cmwgPSB1c2VGaWx0ZXJzP3VybHMudG9wSW5UaXNzdWVGaWx0ZXJlZDp1cmxzLnRvcEluVGlzc3VlO1xuICAgIGpzb24odXJsKyB0aXNzdWVJZClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0cyl7IC8vIHRvcCA1MCBleHByZXNzZWQgZ2VuZXMgaW4gdGlzc3VlSWRcbiAgICAgICAgICAgIGNvbnN0IHRvcEdlbmVMaXN0ID0gcmVzdWx0cy50b3BFeHByZXNzZWRHZW5lLm1hcChkPT5kLmdlbmNvZGVJZCk7XG4gICAgICAgICAgICBjb25zdCBjYWxsYmFjayA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgX3N0eWxlU2VsZWN0ZWRUaXNzdWUodGlzc3VlSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VhcmNoQnlJZCh0b3BHZW5lTGlzdCwgW3Rpc3N1ZUlkXSwgZG9tSWQsIHRvb2xiYXJJZCwgaW5mb0lkLCB1cmxzLCB1c2VGaWx0ZXJzLCBjYWxsYmFjayk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICB9KTtcbn1cblxuLyoqXG4gKiBTZWFyY2ggZ2VuZSBleHByZXNzaW9uIGJ5IGdlbmUgSURzIGFuZCB0aXNzdWUgSURzXG4gKiBAcGFyYW0gZ2xpc3Qge0xpc3R9IG9mIGdlbmNvZGUgSURzIG9yIGdlbmUgSURzXG4gKiBAcGFyYW0gdGxpc3Qge0xpc3R9IG9mIHRpc3N1ZSBJRHM6IHRvIHNlYXJjaCBieSB0aXNzdWUgSURzIGlzIG5vdCB5ZXQgaW1wbGVtZW50ZWRcbiAqIEBwYXJhbSBkb21JZCB7U3RyaW5nfSB0aGUgRElWIElEIG9mIHRoZSBzdmdcbiAqIEBwYXJhbSBpbmZvSWQge1N0cmluZ30gdGhlIERPTSBJRCBvZiB0aGUgbWVzc2FnZSBpbmZvIGJveFxuICogQHBhcmFtIHRvb2xiYXJJZCB7U3RyaW5nfSB0aGUgRE9NIElEIG9mIHRoZSB0b29sYmFyXG4gKiBAcGFyYW0gdXJscyB7T2JqZWN0fSBvZiB3ZWIgc2VydmljZSB1cmxzIHdpdGggYXR0cjogdGlzc3VlLCBnZW5lSWQsIG1lZEV4cEJ5SWRcbiAqIEBwYXJhbSB1c2VGaWx0ZXJzIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgZ2VuZSBmaWx0ZXIgaXMgYXBwbGllZCwgb3IgdXNlIHVuZGVmaW5lZCBmb3Igbm8gZmlsdGVyaW5nXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEJ5SWQoZ2xpc3QsIHRsaXN0LCBkb21JZCwgdG9vbGJhcklkLCBpbmZvSWQsIHVybHMgPSBnZXRHdGV4VXJscygpLCB1c2VGaWx0ZXJzPXVuZGVmaW5lZCwgY2FsbGJhY2s9dW5kZWZpbmVkKXtcbiAgICByZXNldChbZG9tSWQsIHRvb2xiYXJJZCwgaW5mb0lkLCBcImJveHBsb3RcIl0pO1xuICAgICQoJyNzcGlubmVyJykuc2hvdygpO1xuICAgIGlmIChzZWxlY3QoYCMke2RvbUlkfWApLmVtcHR5KCkpIHRocm93IGBGYXRhbCBFcnJvcjogRE9NIGVsZW1lbnQgd2l0aCBpZCAke2RvbUlkfSBkb2VzIG5vdCBleGlzdDtgO1xuICAgIGxldCBtZXNzYWdlID0gXCJcIjtcblxuICAgIFByb21pc2UuYWxsKFtqc29uKHVybHMudGlzc3VlKSwganNvbih1cmxzLmdlbmVJZCtnbGlzdC5qb2luKFwiLFwiKSldKVxuICAgICAgICAudGhlbihmdW5jdGlvbihhcmdzKXtcbiAgICAgICAgICAgICBjb25zdCB0aXNzdWVzID0gcGFyc2VUaXNzdWVzKGFyZ3NbMF0pLFxuICAgICAgICAgICAgICAgIG1heCA9IDUwO1xuXG4gICAgICAgICAgICAgY29uc3QgYXR0ciA9IFwiZ2VuZUlkXCI7XG4gICAgICAgICAgICBpZiAoIWFyZ3NbMV0uaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwiZ2VuZSB3ZWIgc2VydmljZSBwYXJzaW5nIGVycm9yXCI7XG4gICAgICAgICAgICBsZXQgZ2VuZU9iamVjdHMgPSBhcmdzWzFdW2F0dHJdO1xuICAgICAgICAgICAgaWYgKGdlbmVPYmplY3RzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gdmFsaWRhdGUgaWYgZ2VuZSBsaXN0IGlzIGVtcHR5XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiRmF0YWwgRXJyb3I6IHRoZSBnZW5lIGxpc3QgaXMgZW1wdHkuPGJyLz5cIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gbW9yZSBpbnB1dCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGdlbmVPYmplY3RzLmxlbmd0aCA8IGdsaXN0Lmxlbmd0aCkgeyAvLyB2YWxpZGF0ZSBpZiBhbGwgaW5wdXQgZ2VuZXMgYXJlIGZvdW5kXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFsbElkcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBnZW5lT2JqZWN0cy5mb3JFYWNoKChkKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxsSWRzLnB1c2goZC5nZW5jb2RlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxsSWRzLnB1c2goZC5nZW5lU3ltYm9sVXBwZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxsSWRzLnB1c2goZC5lbnNlbWJsSWQpO1xuICAgICAgICAgICAgICAgICAgICB9KTsgLy8gZ2F0aGVyIGFsbCBJRHMgaW4gcmV0cmlldmVkIGdlbmVPYmplY3RzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1pc3NpbmdHZW5lcyA9IGdsaXN0LmZpbHRlcigoZCkgPT4gIWFsbElkcy5pbmNsdWRlcyhkKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBXYXJuaW5nOiBOb3QgYWxsIGdlbmVzIGFyZSBmb3VuZDogJHttaXNzaW5nR2VuZXMuam9pbihcIixcIil9PGJyLz5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZ2VuZU9iamVjdHMubGVuZ3RoID4gbWF4KSB7IC8vIHZhbGlkYXRlIGlmIHRoZSBudW1iZXIgb2YgaW5wdXQgZ2VuZXMgZXhjZWVkcyB0aGUgbWF4aW11bVxuICAgICAgICAgICAgICAgICAgICAvL2xhbmd1YWdlPUhUTUxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArPSBgV2FybmluZzogVG9vIG1hbnkgZ2VuZXMuIElucHV0IGxpc3QgdHJ1bmNhdGVkIHRvIHRoZSBmaXJzdCAke21heH0uPGJyLz5gO1xuICAgICAgICAgICAgICAgICAgICBnZW5lT2JqZWN0cyA9IGdlbmVPYmplY3RzLnNsaWNlKDAsIG1heCk7IC8vIHNsaWNlIHRoZSBpbnB1dCBnZW5lIGxpc3QgdG8gdGhlIG1heGltdW0gYWxsb3dlZCBlbnRyaWVzXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gdmlzdWFsaXphdGlvbiByZW5kZXJpbmdcbiAgICAgICAgICAgICAgICAvLyBnZXQgYWxsIG1lZGlhbiBleHByZXNzIGRhdGEgb2YgdGhlc2UgZ2VuZXMgaW4gYWxsIHRpc3N1ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBnZW5jb2RlSWRzID0gZ2VuZU9iamVjdHMubWFwKChkKSA9PiBkLmdlbmNvZGVJZCk7XG4gICAgICAgICAgICAgICAganNvbih1cmxzLm1lZEV4cEJ5SWQgKyBnZW5jb2RlSWRzLmpvaW4oXCIsXCIpKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihlRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGlzc3VlVHJlZSA9IGVEYXRhLmNsdXN0ZXJzLnRpc3N1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZW5lVHJlZSA9IGVEYXRhLmNsdXN0ZXJzLmdlbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwcmVzc2lvbiA9IHBhcnNlTWVkaWFuRXhwcmVzc2lvbihlRGF0YSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG1hcCA9IG5ldyBEZW5kcm9IZWF0bWFwKHRpc3N1ZVRyZWUsIGdlbmVUcmVlLCBleHByZXNzaW9uKTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2VuY29kZUlkcy5sZW5ndGggPCAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG1hcC5yZW5kZXIoZG9tSWQsIHRydWUsIGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkbWFwLnJlbmRlcihkb21JZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNzcGlubmVyJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3VzdG9taXphdGlvbiBmb3IgR1RFeFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGlzc3VlRGljdCA9IHRpc3N1ZXMucmVkdWNlKChhLCBkKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZC5oYXNPd25Qcm9wZXJ0eShcInRpc3N1ZUlkXCIpKSB0aHJvdyBcInRpc3N1ZSBoYXMgbm90IGF0dHIgdGlzc3VlX2lkXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYVtkLnRpc3N1ZUlkXSA9IGQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCB7fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBnZW5lRGljdCA9IGRtYXAuZGF0YS5oZWF0bWFwLnJlZHVjZSgoYSwgZCwgaSk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWQuaGFzT3duUHJvcGVydHkoXCJnZW5jb2RlSWRcIikpIHRocm93IFwiZ2VuZSBoYXMgbm8gYXR0ciBnZW5jb2RlSWRcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhW2QuZ2VuY29kZUlkXT1kO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwge30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgX2N1c3RvbWl6ZUxhYmVscyhkbWFwLCB0aXNzdWVEaWN0LCBnZW5lRGljdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYWRkVGlzc3VlQ29sb3JzKGRtYXAsIHRpc3N1ZURpY3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgX2N1c3RvbWl6ZU1vdXNlRXZlbnRzKGRtYXAsIHRpc3N1ZURpY3QsIGdlbmVEaWN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jcmVhdGVUb29sYmFyKGRvbUlkLCB0b29sYmFySWQsIGluZm9JZCwgZG1hcCwgdGlzc3VlRGljdCwgdGxpc3QsIHVybHMsIHVzZUZpbHRlcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodXNlRmlsdGVycyAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IHVzZUZpbHRlcnM/XCJNaXRvY2hvbmRyaWFsIGdlbmVzIGFyZSBleGNsdWRlZC5cIjpcIk1pdG9jaG9uZHJpYWwgZ2VuZXMgYXJlIGluY2x1ZGVkXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtpbmZvSWR9YCkuaHRtbChtZXNzYWdlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkgY2FsbGJhY2soKTtcblxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtjb25zb2xlLmVycm9yKGVycil9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXt0aHJvdyBlcnJ9KTtcbn1cblxuXG4vKipcbiAqIEZvciB0b3AgZXhwcmVzc2VkIHF1ZXJ5LCBoaWdobGlnaHQgdGhlIHF1ZXJ5IHRpc3N1ZSBsYWJlbFxuICogQHBhcmFtIHRpc3N1ZUlkIHtTdHJpbmd9IHRoZSB0aXNzdWUgSURcbiAqIERlcGVuZGVuY2llczogZXhwcmVzc01hcC5jc3NcbiAqL1xuZnVuY3Rpb24gX3N0eWxlU2VsZWN0ZWRUaXNzdWUodGlzc3VlSWQpe1xuICAgIHNlbGVjdEFsbChcIi5leHAtbWFwLXhsYWJlbFwiKS5maWx0ZXIoKGQpPT5kPT10aXNzdWVJZClcbiAgICAgICAgLmNsYXNzZWQoXCJxdWVyeVwiLCB0cnVlKTtcbn1cblxuLyoqXG4gKiBDdXN0b21pemVzIHRoZSBHVEV4IGdlbmUgZXhwcmVzc2lvbiBoZWF0bWFwIGxhYmVsc1xuICogQHBhcmFtIGRtYXAge0RlbmRyb0hlYXRtYXB9XG4gKiBAcGFyYW0gdGlzc3VlRGljdCB7RGljdGlvbmFyeX0gb2YgR1RFeCB0aXNzdWUgb2JqZWN0cyBpbmRleGVkIGJ5IHRpc3N1ZSBJRFxuICogQHBhcmFtIGdlbmVEaWN0IHtEaWN0aW9uYXJ5fSBvZiBHVEV4IGdlbmVzIGluZGV4ZWQgYnkgZ2VuY29kZSBJRFxuICovXG5mdW5jdGlvbiBfY3VzdG9taXplTGFiZWxzKGRtYXAsIHRpc3N1ZURpY3QsIGdlbmVEaWN0KXtcbiAgICAvKioqKiogQ2hhbmdlIHJvdyBsYWJlbHMgdG8gdGlzc3VlIG5hbWVzICoqKioqL1xuICAgIHNlbGVjdChcIiNcIiArIGRtYXAuY29uZmlnLnBhbmVscy5tYWluLmlkKS5zZWxlY3RBbGwoXCIuZXhwLW1hcC14bGFiZWxcIilcbiAgICAgICAgLnRleHQoKGQpID0+IHRpc3N1ZURpY3RbZF09PT11bmRlZmluZWQ/ZDp0aXNzdWVEaWN0W2RdLnRpc3N1ZU5hbWUpO1xuXG4gICAgLyoqKioqIENoYW5nZSBjb2x1bW4gbGFiZWxzIHRvIGdlbmUgc3ltYm9scyAqKioqKi9cbiAgICBzZWxlY3QoXCIjXCIgKyBkbWFwLmNvbmZpZy5wYW5lbHMubWFpbi5pZCkuc2VsZWN0QWxsKFwiLmV4cC1tYXAteWxhYmVsXCIpXG4gICAgICAgIC50ZXh0KChkKSA9PiBnZW5lRGljdFtkXT09PXVuZGVmaW5lZD9kOmdlbmVEaWN0W2RdLmdlbmVTeW1ib2wpO1xufVxuXG4vKipcbiAqIEFkZHMgR1RFeCB0aXNzdWUgY29sb3JzIHRvIHRoZSB0aXNzdWUgbGFiZWxzIChjb2x1bW4gbmFtZXMpXG4gKiBAcGFyYW0gZG1hcCB7RGVuZHJvSGVhdG1hcH1cbiAqIEBwYXJhbSB0aXNzdWVEaWN0IHtEaWN0aW9uYXJ5fSBvZiBHVEV4IHRpc3N1ZSBvYmplY3RzIGluZGV4ZWQgYnkgdGlzc3VlX2lkXG4gKi9cbmZ1bmN0aW9uIF9hZGRUaXNzdWVDb2xvcnMoZG1hcCwgdGlzc3VlRGljdCl7XG5cbiAgICBjb25zdCBpZCA9IGRtYXAuY29uZmlnLnBhbmVscy5tYWluLmlkO1xuICAgIGNvbnN0IGhlYXRtYXAgPSBkbWFwLm9iamVjdHMuaGVhdG1hcDtcbiAgICBsZXQgZG90cyA9IHNlbGVjdChcIiNcIitpZCkuc2VsZWN0QWxsKFwiLmV4cC1tYXAteGNvbG9yXCIpLmRhdGEoaGVhdG1hcC54TGlzdCk7XG5cbiAgICAgLy8gdXBkYXRlcyBvbGQgZWxlbWVudHNcbiAgICBkb3RzLmF0dHIoXCJmaWxsXCIsIChkKSA9PiB0aXNzdWVEaWN0W2RdPT09dW5kZWZpbmVkP1wiIzAwMDAwMFwiOmAjJHt0aXNzdWVEaWN0W2RdLmNvbG9ySGV4fWApO1xuXG4gICAgLy8gZW50ZXJzIG5ldyBlbGVtZW50c1xuICAgIGRvdHMuZW50ZXIoKS5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAgICAgLmF0dHIoJ2N4JywgKGQpID0+IGhlYXRtYXAueFNjYWxlKGQpICsgaGVhdG1hcC54U2NhbGUuYmFuZHdpZHRoKCkvMilcbiAgICAgICAgLmF0dHIoJ2N5JywgaGVhdG1hcC55U2NhbGUucmFuZ2UoKVsxXSArIDEwKVxuICAgICAgICAuYXR0cihcInJcIiwgMylcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsIChkKSA9PiB0aXNzdWVEaWN0W2RdID09PSB1bmRlZmluZWQ/IFwiIzAwMDAwMFwiOmAjJHt0aXNzdWVEaWN0W2RdLmNvbG9ySGV4fWApXG4gICAgICAgIC5hdHRyKFwib3BhY2l0eVwiLCAwLjc1KVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiZXhwLW1hcC14Y29sb3JcIik7XG5cbiAgICAvLyByZW1vdmVzIHJldGlyZWQgZWxlbWVudHNcbiAgICBkb3RzLmV4aXQoKS5yZW1vdmUoKTtcbn1cblxuLyoqXG4gKiBDdXN0b21pemUgdGhlIGRlbmRyb3BIZWF0bWFwIG1vdXNlIGV2ZW50c1xuICogZGVwZW5kZW5jaWVzOiBDU1MgY2xhc3NlcyBmcm9tIGV4cHJlc3NNYXAuY3NzXG4gKiBAcGFyYW0gZG1hcCB7RGVuZHJvSGVhdG1hcH1cbiAqIEBwYXJhbSB0aXNzdWVEaWN0IHtEaWN0aW9uYXJ5fTogdGlzc3VlIG9iamVjdHMgaW5kZXhlZCBieSB0aXNzdWVfaWQsIHdpdGggYXR0cjogdGlzc3VlX25hbWVcbiAqIEBwYXJhbSBnZW5lRGljdCB7RGljdGlvbmFyeX06IGdlbmUgb2JqZWN0cyBpbmRleGVkIGJ5IGdlbmNvZGUgSUQsIHdpdGggYXR0cjogZ2VuZVN5bWJvbFxuICovXG5mdW5jdGlvbiBfY3VzdG9taXplTW91c2VFdmVudHMoZG1hcCwgdGlzc3VlRGljdCwgZ2VuZURpY3QpIHtcbiAgICBjb25zdCBzdmcgPSBkbWFwLnZpc3VhbENvbXBvbmVudHMuc3ZnO1xuICAgIGNvbnN0IHRvb2x0aXAgPSBkbWFwLnZpc3VhbENvbXBvbmVudHMudG9vbHRpcDtcblxuICAgIGNvbnN0IGNlbGxNb3VzZW92ZXIgPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkID0gc2VsZWN0KHRoaXMpO1xuICAgICAgICBkbWFwLm9iamVjdHMuaGVhdG1hcC5jZWxsTW91c2VvdmVyKHNlbGVjdGVkKTsgLy8gY2FsbCB0aGUgZGVmYXVsdCBoZWF0bWFwIG1vdXNlIG92ZXIgZXZlbnQgZmlyc3RcbiAgICAgICAgbGV0IHRpc3N1ZSA9IHRpc3N1ZURpY3RbZC54XT09PXVuZGVmaW5lZD9kLng6dGlzc3VlRGljdFtkLnhdLnRpc3N1ZU5hbWU7XG4gICAgICAgIGxldCBnZW5lID0gZ2VuZURpY3RbZC55XT09PXVuZGVmaW5lZD9kLnk6Z2VuZURpY3RbZC55XS5nZW5lU3ltYm9sO1xuXG4gICAgICAgIC8vIHRvb2x0aXAuc2hvdyhcbiAgICAgICAgLy8gICAgIGA8dGFibGU+XG4gICAgICAgIC8vICAgICAgICAgPHRyPjx0ZD5UaXNzdWU8L3RkPjx0ZD4ke3Rpc3N1ZX08L3RkPjwvdHI+XG4gICAgICAgIC8vICAgICAgICAgPHRyPjx0ZD5HZW5lPC90ZD48dGQ+JHtnZW5lfTwvdGQ+PC90cj5cbiAgICAgICAgLy8gICAgICAgICA8dHI+PHRkPk1lZGlhbiAke2QudW5pdD9kLnVuaXQ6XCJUUE1cIn08L3RkPjx0ZD4ke3BhcnNlRmxvYXQoZC5vcmlnaW5hbFZhbHVlLnRvRXhwb25lbnRpYWwoKSkudG9QcmVjaXNpb24oNCl9PC90ZD48L3RyPlxuICAgICAgICAvLyAgICAgPC90YWJsZT5gXG4gICAgICAgIC8vICk7XG4gICAgICAgIHRvb2x0aXAuc2hvdyhgVGlzc3VlOiAke3Rpc3N1ZX08YnIvPiBHZW5lOiAke2dlbmV9PGJyLz4gTWVkaWFuIFRQTTogJHtwYXJzZUZsb2F0KGQub3JpZ2luYWxWYWx1ZS50b0V4cG9uZW50aWFsKCkpLnRvUHJlY2lzaW9uKDQpfWApXG5cbiAgICB9O1xuXG4gICAgY29uc3QgY2VsbE1vdXNlb3V0ID0gZnVuY3Rpb24oZCl7XG4gICAgICAgIHN2Zy5zZWxlY3RBbGwoXCIqXCIpLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgZmFsc2UpO1xuICAgICAgICB0b29sdGlwLmhpZGUoKTtcbiAgICB9O1xuXG4gICAgLy8gZ2VuZSBib3hwbG90IHByZXA6IGFzc2lnbiBhIGNvbG9ySW5kZXggdG8gZWFjaCBnZW5lXG4gICAgY29uc3QgY29sb3JzID0gY29sb3JDaGFydCgpO1xuICAgIGtleXMoZ2VuZURpY3QpLmZvckVhY2goKGQsIGkpPT57Z2VuZURpY3RbZF0uY29sb3IgPSBjb2xvcnNbaV19KTtcbiAgICBjb25zdCB5bGFiZWxDbGljayA9IGZ1bmN0aW9uKGQpe1xuICAgICAgICBsZXQgcyA9IHNlbGVjdCh0aGlzKTtcbiAgICAgICAgbGV0IGFjdGlvbiA9IFwiXCI7XG4gICAgICAgIGlmIChldmVudC5hbHRLZXkpIHsgLy8gaWYgYWx0IGtleSBpcyBwcmVzc2VkIC0tIGkuZS4gYWRkaW5nIGFuIGFkZGl0aW9uYWwgZ2VuZSB0byBib3hwbG90XG4gICAgICAgICAgICAvLyBoaWdobGlnaHRzIHRoZSBzZWxlY3RlZCBsYWJlbFxuICAgICAgICAgICAgaWYoIXMuY2xhc3NlZChcImNsaWNrZWRcIikpIHMuY2xhc3NlZChcImNsaWNrZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICBhY3Rpb24gPSBcImFkZFwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gdG9nZ2xlcyBjbGljay91bmNsaWNrIGV2ZW50c1xuICAgICAgICAgICAgLy8gaWYgdGhlIERPTSBoYXMgdGhlIGNsYXNzIFwiY2xpY2tlZFwiLCB0aGVuIHVuY2xpY2sgaXRcbiAgICAgICAgICAgIGlmIChzLmNsYXNzZWQoXCJjbGlja2VkXCIpKSB7XG4gICAgICAgICAgICAgICAgcy5jbGFzc2VkKFwiY2xpY2tlZFwiLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgYWN0aW9uID0gXCJkZWxldGVcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGVsc2UgY2xpY2sgaXRcbiAgICAgICAgICAgICAgICBzZWxlY3RBbGwoXCIuY2xpY2tlZFwiKS5jbGFzc2VkKFwiY2xpY2tlZFwiLCBmYWxzZSk7IC8vIGZpcnN0IGNsZWFycyBhbGwgY2xpY2tlZCBsYWJlbHMgaWYgYW55XG4gICAgICAgICAgICAgICAgcy5jbGFzc2VkKFwiY2xpY2tlZFwiLCB0cnVlKTsgLy8gY2xpY2sgdGhpcyBET00gZWxlbWVudFxuICAgICAgICAgICAgICAgIGRtYXAuZGF0YS5leHRlcm5hbCA9IHt9OyAvLyBjbGVhcnMgdGhlIGRhdGEgc3RvcmFnZVxuICAgICAgICAgICAgICAgIGFjdGlvbiA9IFwiYWRkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coZ2VuZURpY3RbZF0uY29sb3IpOyAvLyBkZWJ1Z2dpbmdcbiAgICAgICAgX3JlbmRlckJveHBsb3QoYWN0aW9uLCBkLCBnZW5lRGljdCwgdGlzc3VlRGljdCwgZG1hcCk7XG4gICAgfTtcblxuICAgIC8vIG1vdXNlIGV2ZW50cyBvZiB0cmVlcyAtLSB1c2UgY2xvc3VyZVxuXG4gICAgY29uc3QgdHJlZU5vZGVNb3VzZW92ZXIgPSBmdW5jdGlvbihsYWJlbENsYXNzKXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJyXCIsIDYpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwicmVkXCIpO1xuICAgICAgICAgICAgY29uc3QgaWRzID0gZC5sZWF2ZXMoKS5tYXAoKG5vZGUpPT5ub2RlLmRhdGEubmFtZSk7XG4gICAgICAgICAgICAvLyBoaWdobGlnaHQgbGFiZWxzXG4gICAgICAgICAgICBzdmcuc2VsZWN0QWxsKGxhYmVsQ2xhc3MpXG4gICAgICAgICAgICAgICAgLmZpbHRlcigobGFiZWwpPT5pZHMuaW5jbHVkZXMobGFiZWwpKVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwiaGlnaGxpZ2h0ZWRcIiwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdHJlZU5vZGVNb3VzZW91dCA9IGZ1bmN0aW9uKGxhYmVsQ2xhc3Mpe1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICBzZWxlY3QodGhpcylcbiAgICAgICAgICAgIC5hdHRyKFwiclwiLCAyKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwiIzMzM1wiKTtcbiAgICAgICAgICAgIHN2Zy5zZWxlY3RBbGwobGFiZWxDbGFzcykuY2xhc3NlZChcImhpZ2hsaWdodGVkXCIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoZG1hcC52aXN1YWxDb21wb25lbnRzLmNvbHVtblRyZWUgIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICBkbWFwLnZpc3VhbENvbXBvbmVudHMuY29sdW1uVHJlZS5zZWxlY3RBbGwoXCIuZGVuZHJvZ3JhbS1ub2RlXCIpXG4gICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCB0cmVlTm9kZU1vdXNlb3ZlcihcIi5leHAtbWFwLXhsYWJlbFwiKSlcbiAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgdHJlZU5vZGVNb3VzZW91dChcIi5leHAtbWFwLXhsYWJlbFwiKSk7XG4gICAgfVxuXG4gICAgaWYgKGRtYXAudmlzdWFsQ29tcG9uZW50cy5yb3dUcmVlICE9PSB1bmRlZmluZWQpe1xuICAgICAgICBkbWFwLnZpc3VhbENvbXBvbmVudHMucm93VHJlZS5zZWxlY3RBbGwoXCIuZGVuZHJvZ3JhbS1ub2RlXCIpXG4gICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCB0cmVlTm9kZU1vdXNlb3ZlcihcIi5leHAtbWFwLXlsYWJlbFwiKSlcbiAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgdHJlZU5vZGVNb3VzZW91dChcIi5leHAtbWFwLXlsYWJlbFwiKSk7XG4gICAgfVxuXG4gICAgc3ZnLnNlbGVjdEFsbChcIi5leHAtbWFwLWNlbGxcIilcbiAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsIGNlbGxNb3VzZW92ZXIpXG4gICAgICAgIC5vbihcIm1vdXNlb3V0XCIsIGNlbGxNb3VzZW91dCk7XG5cbiAgICBzdmcuc2VsZWN0QWxsKFwiLmV4cC1tYXAteWxhYmVsXCIpLm9uKFwiY2xpY2tcIiwgeWxhYmVsQ2xpY2spO1xufVxuXG4vKipcbiAqIHJlbmRlcnMgdGhlIGdlbmUgZXhwcmVzc2lvbiBib3hwbG90XG4gKiBAcGFyYW0gYWN0aW9uIHtFTlVNfSBhZGQsIG5ldywgb3IgZGVsZXRlXG4gKiBAcGFyYW0gZ2VuZSB7U3RyaW5nfSBnZW5jb2RlIElEXG4gKiBAcGFyYW0gZ2VuZURpY3Qge0RpY3Rpb25hcnl9IGdlbmNvZGUgSUQgPT4gZ2VuZSBvYmplY3Qgd2l0aCBhdHRyaWJ1dGU6IGluZGV4XG4gKiBAcGFyYW0gdGlzc3VlRGljdCB7RGljdGlvbmFyeX0gdGlzc3VlIG9iamVjdHMgaW5kZXhlZCBieSB0aXNzdWUgSURcbiAqIEBwYXJhbSBkbWFwIHtEZW5kcm9IZWF0bWFwfVxuICovXG5mdW5jdGlvbiBfcmVuZGVyQm94cGxvdChhY3Rpb24sIGdlbmUsIGdlbmVEaWN0LCB0aXNzdWVEaWN0LCBkbWFwKSB7XG4gICAgLy8gdGlzc3VlT3JkZXIgaXMgYSBsaXN0IG9mIHRpc3N1ZSBvYmplY3RzIHtpZDpkaXNwbGF5IG5hbWV9IGluIHRoZSBzYW1lIG9yZGVyIGFzIHRoZSB4IGF4aXMgb2YgdGhlIGhlYXQgbWFwLlxuICAgIGxldCB0aXNzdWVPcmRlciA9IGRtYXAub2JqZWN0cy5oZWF0bWFwLnhTY2FsZS5kb21haW4oKS5tYXAoKGQsIGkpID0+IHtyZXR1cm4ge2lkOmQsIG5hbWU6dGlzc3VlRGljdFtkXS50aXNzdWVOYW1lfX0pO1xuICAgIC8vIGdldCBnZW5lIGV4cHJlc3Npb24gZGF0YVxuICAgIGxldCBkYXRhID0gZG1hcC5kYXRhLmV4dGVybmFsO1xuXG4gICAgLy8gcGxvdGx5IGJveHBsb3QgY29uZmlndXJhdGlvbnNcbiAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICAgIHVzZUxvZzogZmFsc2UsXG4gICAgICAgIGlkOiBcImJveHBsb3RcIixcbiAgICB9O1xuICAgIGNvbnN0IGxheW91dCA9IHtcbiAgICAgICAgdGl0bGU6IFwiXCIsXG4gICAgICAgIGZvbnQ6IHtcbiAgICAgICAgICAgIGZhbWlseTogJ09wZW4gU2FucywgSGVsdmV0aWNhLCBzYW5zLXNlcmlmJyxcbiAgICAgICAgICAgIHNpemU6MTFcbiAgICAgICAgfSxcbiAgICAgICAgeWF4aXM6IHtcbiAgICAgICAgICAgIHRpdGxlOiAnVFBNJyxcbiAgICAgICAgICAgIHplcm9saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIHRpY2tmb250OiB7XG4gICAgICAgICAgICAgICAgc2l6ZTogOVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB4YXhpczoge1xuICAgICAgICAgICAgdGlja2ZvbnQ6IHtcbiAgICAgICAgICAgICAgICBzaXplOiA5XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGlja2FuZ2xlOiAzMFxuICAgICAgICB9LFxuICAgICAgICBib3htb2RlOiAnZ3JvdXAnLFxuICAgICAgICBtYXJnaW46IHtcbiAgICAgICAgICAgIHQ6MCxcbiAgICAgICAgfSxcbiAgICAgICAgc2hvd2xlZ2VuZDogdHJ1ZSxcblxuICAgIH07XG5cbiAgICAvLyBhY3Rpb25cbiAgICBzd2l0Y2goYWN0aW9uKSB7XG4gICAgICAgIGNhc2UgXCJkZWxldGVcIjoge1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFbZ2VuZV07XG4gICAgICAgICAgICBQbG90bHkubmV3UGxvdChjb25maWcuaWQsIHZhbHVlcyhkYXRhKSwgbGF5b3V0KTtcbiAgICAgICAgICAgIGlmIChrZXlzKGRhdGEpLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0KFwiI1wiICsgY29uZmlnLmlkKS5zdHlsZShcIm9wYWNpdHlcIiwgMC4wKTsgLy8gbWFrZXMgdGhlIGJveHBsb3Qgc2VjdGlvbiB2aXNpYmxlXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbGVjdChcIiNcIiArIGNvbmZpZy5pZCkuc3R5bGUoXCJvcGFjaXR5XCIsIDEuMCk7IC8vIG1ha2VzIHRoZSBib3hwbG90IHNlY3Rpb24gdmlzaWJsZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSBcImFkZFwiOiB7XG4gICAgICAgICAgICBjb25zdCB1cmwgPSBnZXRHdGV4VXJscygpLmdlbmVFeHAgKyBnZW5lO1xuICAgICAgICAgICAganNvbih1cmwpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbG9yID0gZ2VuZURpY3RbZ2VuZV0uY29sb3IgfHwgXCJibGFja1wiO1xuICAgICAgICAgICAgICAgICAgICBkYXRhW2dlbmVdID0gbWFrZUpzb25Gb3JQbG90bHkoZ2VuZSwgZCwgY29uZmlnLnVzZUxvZywgY29sb3IsIHRpc3N1ZU9yZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgUGxvdGx5Lm5ld1Bsb3QoY29uZmlnLmlkLCB2YWx1ZXMoZGF0YSksIGxheW91dCk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdChcIiNcIiArIGNvbmZpZy5pZCkuc3R5bGUoXCJvcGFjaXR5XCIsIDEuMCk7IC8vIG1ha2VzIHRoZSBib3hwbG90IHNlY3Rpb24gdmlzaWJsZVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7Y29uc29sZS5lcnJvcihlcnIpfSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJhY3Rpb24gbm90IHVuZGVyc3Rvb2QuXCIpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKlxuICogY3JlYXRlIHRoZSB0b29sYmFyXG4gKiBAcGFyYW0gZG9tSWQge1N0cmluZ30gdGhlIGRlbmRyb3BoZWF0bWFwJ3MgRElWIElEXG4gKiBAcGFyYW0gYmFySWQge1N0cmluZ30gdGhlIHRvb2xiYXIgRE9NIElEXG4gKiBAcGFyYW0gaW5mb0lkIHtTdHJpbmd9IHRoZSBtZXNzYWdlIGJveCBET00gSURcbiAqIEBwYXJhbSBkbWFwIHtEZW5kcm9IZWF0bWFwfVxuICogQHBhcmFtIHRpc3N1ZURpY3Qge0RpY3Rpb25hcnl9IG9mIHRpc3N1ZXMgaW5kZXhlZCBieSB0aXNzdWUgSURcbiAqIEBwYXJhbSBxdWVyeVRpc3N1ZXMge0xpc3R9IG9mIHRpc3N1ZSBJRHNcbiAqIEBwYXJhbSB1cmxzIHtPYmplY3R9IG9mIEdURXggd2ViIHNlcnZpY2UgdXJsc1xuICogQHBhcmFtIHVzZUZpbHRlciB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIGdlbmUgZmlsdGVyIGlzIG9uIG9yIG9mZiwgYW5kIHdoZW4gdGhlIHZhbHVlIGlzIHVuZGVmaW5lZCwgaXQgbWVhbnMgbm8gZmlsdGVyXG4gKi9cbmZ1bmN0aW9uIF9jcmVhdGVUb29sYmFyKGRvbUlkLCBiYXJJZCwgaW5mb0lkLCBkbWFwLCB0aXNzdWVEaWN0LCBxdWVyeVRpc3N1ZXMsIHVybHM9Z2V0R3RleFVybHMoKSwgdXNlRmlsdGVycz11bmRlZmluZWQpe1xuICAgIC8vIGZvbnRhd2Vzb21lIHJlZmVyZW5jZTogaHR0cDovL2ZvbnRhd2Vzb21lLmlvL2V4YW1wbGVzL1xuICAgIC8vIGpRdWVyeSBzeW50YXhcbiAgICAkKGAjJHtiYXJJZH1gKS5zaG93KCk7XG5cbiAgICBsZXQgJGJhckRpdiA9ICQoXCI8ZGl2Lz5cIikuYWRkQ2xhc3MoXCJidG4tZ3JvdXAgYnRuLWdyb3VwLXNtXCIpLmFwcGVuZFRvKGAjJHtiYXJJZH1gKTtcblxuICAgIGlmICh1c2VGaWx0ZXJzICE9PSB1bmRlZmluZWQpeyAvLyBzbyBmYXIgb25seSBhcHBsaWNhYmxlIGZvciB0b3BFeHByZXNzZWQgZ2VuZSBoZWF0bWFwXG4gICAgICAgIGNvbnN0IGlkMCA9IFwiZmlsdGVyT3B0aW9uc1wiO1xuICAgICAgICBsZXQgJGJ1dHRvbjAgPSAkKFwiPGEvPlwiKS5hdHRyKFwiaWRcIiwgaWQwKVxuICAgICAgICAgICAgLmFkZENsYXNzKFwiYnRuIGJ0bi1kZWZhdWx0XCIpLmFwcGVuZFRvKCRiYXJEaXYpO1xuICAgICAgICAkKFwiPGkvPlwiKS5hZGRDbGFzcyhcImZhIGZhLWZpbHRlclwiKS5hcHBlbmRUbygkYnV0dG9uMCk7XG5cbiAgICAgICAgc2VsZWN0KGAjJHtpZDB9YClcbiAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIC8vIHRvZ2dsZSB0aGUgYXBwbGllZCBmaWx0ZXJcbiAgICAgICAgICAgIHJlbmRlclRvcEV4cHJlc3NlZChxdWVyeVRpc3N1ZXNbMF0sIGRvbUlkLCBiYXJJZCwgaW5mb0lkLCB1cmxzLCAhdXNlRmlsdGVycyk7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYodXNlRmlsdGVycykgZG1hcC52aXN1YWxDb21wb25lbnRzLnRvb2x0aXAuc2hvdyhcIkluY2x1ZGUgTWl0b2Nob25kcmlhbCBHZW5lc1wiKTtcbiAgICAgICAgICAgIGVsc2UgZG1hcC52aXN1YWxDb21wb25lbnRzLnRvb2x0aXAuc2hvdyhcIkV4Y2x1ZGUgTWl0b2Nob25kcmlhbCBHZW5lc1wiKTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGRtYXAudmlzdWFsQ29tcG9uZW50cy50b29sdGlwLmhpZGUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgaWQxID0gXCJzb3J0VGlzc3Vlc1wiO1xuICAgIGxldCAkYnV0dG9uMSA9ICQoXCI8YS8+XCIpLmF0dHIoXCJpZFwiLCBpZDEpXG4gICAgICAgIC5hZGRDbGFzcyhcImJ0biBidG4tZGVmYXVsdFwiKS5hcHBlbmRUbygkYmFyRGl2KTtcbiAgICAkKFwiPGkvPlwiKS5hZGRDbGFzcyhcImZhIGZhLXNvcnQtYWxwaGEtZG93blwiKS5hcHBlbmRUbygkYnV0dG9uMSk7IC8vIGEgZm9udGF3ZXNvbWUgaWNvblxuXG4gICAgc2VsZWN0KGAjJHtpZDF9YClcbiAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIC8vIGhpZGVzIHRoZSB0aXNzdWUgZGVuZHJvZ3JhbVxuICAgICAgICAgICAgc2VsZWN0KFwiI1wiICsgZG1hcC5jb25maWcucGFuZWxzLnRvcC5pZCkuc3R5bGUoXCJkaXNwbGF5XCIsIFwiTm9uZVwiKTtcbiAgICAgICAgICAgIC8vIHNvcnQgdGlzc3Vlc1xuICAgICAgICAgICAgbGV0IHhsaXN0ID0gZG1hcC5vYmplY3RzLmhlYXRtYXAueExpc3Quc29ydCgpO1xuICAgICAgICAgICAgX3NvcnRUaXNzdWVzKHhsaXN0LCBkbWFwLCB0aXNzdWVEaWN0KTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBkbWFwLnZpc3VhbENvbXBvbmVudHMudG9vbHRpcC5zaG93KFwiU29ydCBUaXNzdWVzIEFscGhhYmV0aWNhbGx5XCIpO1xuICAgICAgICB9KVxuICAgICAgICAub24oXCJtb3VzZW91dFwiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgZG1hcC52aXN1YWxDb21wb25lbnRzLnRvb2x0aXAuaGlkZSgpO1xuICAgICAgICB9KTtcblxuICAgIGNvbnN0IGlkMiA9IFwiY2x1c3RlclRpc3N1ZXNcIjtcbiAgICBsZXQgJGJ1dHRvbjIgPSAkKFwiPGEvPlwiKS5hdHRyKFwiaWRcIiwgaWQyKVxuICAgICAgICAuYWRkQ2xhc3MoXCJidG4gYnRuLWRlZmF1bHRcIikuYXBwZW5kVG8oJGJhckRpdik7XG4gICAgJChcIjxpLz5cIikuYWRkQ2xhc3MoXCJmYSBmYS1jb2RlLWJyYW5jaFwiKS5hcHBlbmRUbygkYnV0dG9uMik7XG5cbiAgICBzZWxlY3QoYCMke2lkMn1gKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZWN0KFwiI1wiICsgZG1hcC5jb25maWcucGFuZWxzLnRvcC5pZCkuc3R5bGUoXCJkaXNwbGF5XCIsIFwiQmxvY2tcIik7ICAvLyBzaG93cyB0aGUgdGlzc3VlIGRlbmRyb2dyYW1cbiAgICAgICAgICAgIGxldCB4bGlzdCA9IGRtYXAub2JqZWN0cy5jb2x1bW5UcmVlLnhTY2FsZS5kb21haW4oKTtcbiAgICAgICAgICAgIF9zb3J0VGlzc3Vlcyh4bGlzdCwgZG1hcCwgdGlzc3VlRGljdCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgZG1hcC52aXN1YWxDb21wb25lbnRzLnRvb2x0aXAuc2hvdyhcIkNsdXN0ZXIgVGlzc3Vlc1wiKTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGRtYXAudmlzdWFsQ29tcG9uZW50cy50b29sdGlwLmhpZGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICBjb25zdCBpZDMgPSBcImV4cE1hcERvd25sb2FkXCI7XG4gICAgbGV0ICRidXR0b24zID0gJChcIjxhLz5cIikuYXR0cihcImlkXCIsIGlkMylcbiAgICAgICAgLmFkZENsYXNzKFwiYnRuIGJ0bi1kZWZhdWx0XCIpLmFwcGVuZFRvKCRiYXJEaXYpO1xuICAgICQoXCI8aS8+XCIpLmFkZENsYXNzKFwiZmEgZmEtc2F2ZVwiKS5hcHBlbmRUbygkYnV0dG9uMyk7XG5cbiAgICBzZWxlY3QoYCMke2lkM31gKVxuICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgbGV0IHN2Z09iaiA9ICQoJCgkKGAke1wiI1wiICtkbWFwLmNvbmZpZy5pZH0gc3ZnYCkpWzBdKTsgLy8galF1ZXJ5IGRlcGVuZGVudFxuICAgICAgICAgICAgZG93bmxvYWRTdmcoc3ZnT2JqLCBcImhlYXRtYXAuc3ZnXCIsIFwiZG93bmxvYWRUZW1wRGl2XCIpO1xuICAgICAgICB9KVxuICAgICAgICAub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGRtYXAudmlzdWFsQ29tcG9uZW50cy50b29sdGlwLnNob3coXCJEb3dubG9hZCBIZWF0bWFwXCIpO1xuICAgICAgICB9KVxuICAgICAgICAub24oXCJtb3VzZW91dFwiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgZG1hcC52aXN1YWxDb21wb25lbnRzLnRvb2x0aXAuaGlkZSgpO1xuICAgICAgICB9KTtcbn1cblxuLyoqXG4gKiB1cGRhdGUgdGhlIGhlYXRtYXAgYmFzZWQgb24gdGhlIG9yZGVyIG9mIHRoZSB4bGlzdFxuICogZGVwZW5kZW5jaWVzOiBDU1MgY2xhc3NlcyBmcm9tIGV4cHJlc3NNYXAuY3NzXG4gKiBAcGFyYW0geGxpc3Qge0hlYXRtYXAgWExpc3R9XG4gKiBAcGFyYW0gZG1hcCB7RGVuZHJvSGVhdG1hcH1cbiAqIEBwYXJhbSB0aXNzdWVEaWN0IHtEaWN0aW9uYXJ5fSBvZiB0aXNzdWUgb2JqZWN0cyBpbmRleGVkIGJ5IHRpc3N1ZSBJRCB3aXRoIGF0dHIsIHRpc3N1ZV9uYW1lXG4gKi9cbmZ1bmN0aW9uIF9zb3J0VGlzc3VlcyAoeGxpc3QsIGRtYXAsIHRpc3N1ZURpY3Qpe1xuICAgIC8vIGNoZWNrIGlmIHRoZXJlJ3MgYSBxdWVyeSB0aXNzdWUsIGUuZy4gdG9wLWV4cHJlc3NlZCBoZWF0bWFwXG4gICAgbGV0IHFJZCA9IHVuZGVmaW5lZDtcbiAgICBjb25zdCBxVGlzc3VlID0gc2VsZWN0KFwiLmV4cC1tYXAteGxhYmVsLnF1ZXJ5XCIpO1xuICAgIGlmICghcVRpc3N1ZS5lbXB0eSgpKSBxSWQgPSBxVGlzc3VlLmRhdHVtKCk7XG5cbiAgICAvLyB1cGRhdGUgdGhlIGhlYXRtYXBcbiAgICBjb25zdCBkb20gPSBzZWxlY3QoXCIjXCIrZG1hcC5jb25maWcucGFuZWxzLm1haW4uaWQpO1xuICAgIGNvbnN0IGRpbWVuc2lvbnMgPSBkbWFwLmNvbmZpZy5wYW5lbHMubWFpbjtcbiAgICBkbWFwLm9iamVjdHMuaGVhdG1hcC5yZWRyYXcoZG9tLCB4bGlzdCwgZG1hcC5vYmplY3RzLmhlYXRtYXAueUxpc3QsIGRpbWVuc2lvbnMpO1xuXG4gICAgLy8gY2hhbmdlIHRoZSB0aXNzdWUgZGlzcGxheSB0ZXh0IHRvIHRpc3N1ZSBuYW1lc1xuICAgIHNlbGVjdEFsbChcIi5leHAtbWFwLXhsYWJlbFwiKVxuICAgICAgICAudGV4dCgoZCkgPT4gdGlzc3VlRGljdFtkXT09PXVuZGVmaW5lZD9kOnRpc3N1ZURpY3RbZF0udGlzc3VlTmFtZSlcbiAgICAgICAgLmNsYXNzZWQoXCJxdWVyeVwiLCBmYWxzZSk7XG4gICAgX2FkZFRpc3N1ZUNvbG9ycyhkbWFwLCB0aXNzdWVEaWN0KTtcblxuICAgIC8vIHN0eWxlIHRoZSBxdWVyeSB0aXNzdWUgaWYgZm91bmRcbiAgICBpZiAocUlkIT09dW5kZWZpbmVkKSBfc3R5bGVTZWxlY3RlZFRpc3N1ZShxSWQpO1xuXG4gICAgLy8gaGlkZSB0aGUgYm94cGxvdFxuICAgIHNlbGVjdCgnI2JveHBsb3QnKS5zdHlsZShcIm9wYWNpdHlcIiwgMC4wKTtcblxuICAgIC8vIGRlc2VsZWN0IGdlbmVzXG4gICAgc2VsZWN0QWxsKFwiLmV4cC1tYXAteWxhYmVsXCIpLmNsYXNzZWQoXCJjbGlja2VkXCIsIGZhbHNlKTtcbiAgICBkbWFwLmRhdGEuZXh0ZXJuYWwgPSB7fTtcblxufVxuXG4iXSwibmFtZXMiOlsiY3N2IiwiZHN2IiwidHN2IiwibWF0Y2hlciIsInNlbGVjdGlvbiIsImVsZW1lbnQiLCJtYXAiLCJhc2NlbmRpbmciLCJhcnJheSIsInNsaWNlIiwicmFuZ2UiLCJsaW5lYXIiLCJjb25zdGFudCIsImNvbG9yIiwicmdiIiwiY29sb3JSZ2IiLCJiYXNpcyIsInZhbHVlIiwibnVtYmVyIiwic3RyaW5nIiwiaWRlbnRpdHkiLCJjdWJlaGVsaXgiLCJodWUiLCJjb2xvckN1YmVoZWxpeCIsImJpc2VjdCIsImludGVycG9sYXRlIiwiZGVpbnRlcnBvbGF0ZSIsInJlaW50ZXJwb2xhdGUiLCJ0MCIsInQxIiwiaW50ZXJ2YWwiLCJkdXJhdGlvblNlY29uZCIsImR1cmF0aW9uTWludXRlIiwiZHVyYXRpb25Ib3VyIiwiZHVyYXRpb25EYXkiLCJkdXJhdGlvbldlZWsiLCJmb3JtYXRMb2NhbGUiLCJkYXkiLCJ0aW1lTW9uZGF5IiwidGltZURheSIsInRpbWVZZWFyIiwidGltZVN1bmRheSIsInRpbWVUaHVyc2RheSIsImxvY2FsZSIsImRlZmF1bHRMb2NhbGUiLCJpbnRlcnBvbGF0ZVJnYkJhc2lzIiwic2NoZW1lIiwiaW50ZXJwb2xhdGVDdWJlaGVsaXhMb25nIiwicmFtcCIsImQzQ2hyb21hdGljLmludGVycG9sYXRlQnVHbiIsImQzQ2hyb21hdGljLmludGVycG9sYXRlT3JSZCIsImQzQ2hyb21hdGljLmludGVycG9sYXRlUHVCdSIsImQzQ2hyb21hdGljLmludGVycG9sYXRlWWxHbkJ1IiwiZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVCbHVlcyIsImQzQ2hyb21hdGljLmludGVycG9sYXRlT3JhbmdlcyIsImQzQ2hyb21hdGljLmludGVycG9sYXRlR3JlZW5zIiwiZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVQdXJwbGVzIiwiZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVSZWRzIiwiZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVHcmV5cyIsInNjYWxlU2VxdWVudGlhbCIsInNjYWxlTGluZWFyIiwic2NhbGVCYW5kIiwicGFyc2VUeXBlbmFtZXMiLCJnZXQiLCJzZXQiLCJjcmVhdGUiLCJ0aW1lb3V0Iiwic2NoZWR1bGUiLCJhdHRyUmVtb3ZlIiwiYXR0clJlbW92ZU5TIiwiYXR0ckNvbnN0YW50IiwiYXR0ckNvbnN0YW50TlMiLCJhdHRyRnVuY3Rpb24iLCJhdHRyRnVuY3Rpb25OUyIsImludGVycG9sYXRlVHJhbnNmb3JtIiwidHJhbnNpdGlvbiIsIlNlbGVjdGlvbiIsInN0eWxlUmVtb3ZlIiwic3R5bGUiLCJzdHlsZUNvbnN0YW50Iiwic3R5bGVGdW5jdGlvbiIsInRleHRDb25zdGFudCIsInRleHRGdW5jdGlvbiIsImVhc2VDdWJpY0luT3V0Il0sIm1hcHBpbmdzIjoiOzs7QUFBQSxJQUFJLEdBQUcsR0FBRyxFQUFFO0lBQ1IsR0FBRyxHQUFHLEVBQUU7SUFDUixLQUFLLEdBQUcsRUFBRTtJQUNWLE9BQU8sR0FBRyxFQUFFO0lBQ1osTUFBTSxHQUFHLEVBQUUsQ0FBQzs7QUFFaEIsU0FBUyxlQUFlLENBQUMsT0FBTyxFQUFFO0VBQ2hDLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFFLFVBQVUsR0FBRyxPQUFPLENB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QUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQy9GLE9BQU8sT0FBTyxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQztHQUMvRjs7RUFFRCxPQUFPLElBQUksR0FBRztJQUNaLE1BQU0sRUFBRSxTQUFTLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUU7SUFDNUUsR0FBRyxFQUFFLFNBQVMsS0FBSyxFQUFFLEVBQUUsT0FBTyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRTtJQUNuRSxPQUFPLEVBQUUsU0FBUyxLQUFLLEVBQUUsRUFBRSxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUNuRixHQUFHLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsRUFBRTtJQUMvQyxRQUFRLEVBQUUsU0FBUyxLQUFLLEVBQUUsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxFQUFFO0lBQzdF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QUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQztNQUMxQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7TUFDOUMsS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztFQUN2QyxPQUFPLEtBQUssSUFBSSxDQUFDO1FBQ1gsQ0FBQyxLQUFLLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDO1FBQ2pGLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztDQUMzRjs7QUFFRCxBQUFPLFNBQVMsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFO0VBQzNDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQztNQUNuRCxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztNQUM3RCxLQUFLLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FB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LENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5RCxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUNsRyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0QsQ0FBQyxDQUFDLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25HLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFD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LElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUNsRTtFQUNELE1BQU0sRUFBRSxTQUFTLENBQUMsRUFBRTtJQUNsQixDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDN0MsT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDbEU7RUFDRCxHQUFHLEVBQUUsV0FBVztJQUNkLE9BQU8sSUFBSSxDQUFDO0dBQ2I7RUFDRCxXQUFXLEVBQUUsV0FBVztJQUN0QixPQUFPLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHO1lBQzVCLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDO1lBQzdCLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDO1lBQzdCLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7R0FDakQ7RUFDRCxRQUFRLEVBQUUsV0FBVztJQUNuQixJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNyRSxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLEdBQUcsT0FBTztVQUM1QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUk7VUFDMUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJO1VBQzFELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1dBQ2xELENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7R0FDeEM7Q0FDRixDQUFDLENBQUMsQ0FBQzs7QUFFSixTQUFTLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztPQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztPQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQztFQUN6QixPQUFPLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FB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Q0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUU7RUFDN0IsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO0lBQ3BCLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqRCxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDMUQ7RUFDRCxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUU7SUFDbEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdDLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUMxRDtFQUNELEdBQUcsRUFBRSxXQUFXO0lBQ2QsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHO1FBQ3JDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDMUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ1YsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztRQUNsQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMs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O0VBQ2xCLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxLQUFLLE9BQU8sR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxJQUFJLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztDQUMvRTs7QUFFRCxTQUFTLFVBQVUsQ0FBQyxDQUFDLEVBQUU7RUFDckIsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0VBQy9ELElBQUksRUFBRSxDQUFDLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMzQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztFQUN2QyxPQUFPLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDdkY7O0FBRUQsQUFBTyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUU7RUFDcEMsT0FBTyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxJQUFJ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QUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ2hFO0VBQ0QsTUFBTSxFQUFFLFNBQVMsQ0FBQyxFQUFFO0lBQ2xCLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM3QyxPQUFPLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDaEU7RUFDRCxHQUFHLEVBQUUsV0FBVztJQUNkLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksT0FBTztRQUNoRCxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNYLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNsQixJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QixPQUFPLElBQUksR0FBRztNQUNaLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO01BQ3JDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO01BQ3JDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztNQUMxQixJQUFJLENBQUMsT0FBTztLQUNiLENBQUM7R0FDSDtDQUNGLENBQUMsQ0FBQyxDQUFDOztBQzVERyxTQUFTLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQ3hDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7RUFDL0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRTtRQUNqQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRTtRQUMxQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFO1FBQ25DLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0NBQ3BCOztBQUVELGNBQWUsU0FBUyxNQUFNLEVBQUU7RUFDOUIsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7RUFDMUIsT0FBTyxTQUFTLENBQUMsRUFBRTtJQUNqQixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xFLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2QsRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLEVBQUUsR0FBRyxDQUFDLEdB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Q0FBQyxDQUFDO0tBQ3BEO0dBQ0Y7O0VBRUQsU0FBUyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0lBQzFCLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtNQUNYLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQztNQUMxRCxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRUEsaUJBQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzlFLE1BQU0sSUFBSSxDQUFDLEVBQUU7TUFDWixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0tBQzNDO0dBQ0Y7O0VBRUQsU0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0lBQ3pCLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtNQUNYLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFQSxpQkFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDN0UsTUFBTSxJQUFJLENBQUMsRUFBRTtNQUNaLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUM7S0FDMUM7R0FDRjs7RUFFRCxTQUFTLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtJQUNuQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtNQUMxQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7TUFDeEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRUEsaUJBQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRUEsaUJBQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3RFLE1BQU0sSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7TUFDL0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0tBQ2pEO0dBQ0Y7O0VBRUQsT0FBTyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7SUFDcEIsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNOLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDWCxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0IsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlCLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwRCxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNiLE9BQU8sU0FBUyxDQUFDLEVBQUU7TUFDakIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO01BQzVCLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUN6QyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDbkIsQ0FBQztHQUNILENBQUM7Q0FDSDs7QUFFRCxBQUFPLElBQUksdUJBQXVCLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDM0YsQUFBTyxJQUFJLHVCQUF1QixHQUFHLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQzs7QUMzRG5GLFNBQVNHLFdBQVMsQ0FBQ0MsTUFBRyxFQUFFO0VBQ3RCLE9BQU8sQ0FBQyxTQUFTLGNBQWMsQ0FBQyxDQUFDLEVBQUU7SUFDakMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDOztJQUVQLFNBQVNELFlBQVMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO01BQzdCLElBQUksQ0FBQyxHQUFHQyxNQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUdDLFNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUdBLFNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7VUFDekUsQ0FBQyxHQUFHVixPQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1VBQ3pCLENBQUMsR0FBR0EsT0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztVQUN6QixPQUFPLEdBQUdBLE9BQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztNQUNoRCxPQUFPLFNBQVMsQ0FBQyxFQUFFO1FBQ2pCLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2YsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZixLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLE9BQU8sS0FBSyxHQUFHLEVBQUUsQ0FBQztPQUNuQixDQUFDO0tBQ0g7O0lBRURRLFlBQVMsQ0FBQyxLQUFLLEdBQUcsY0FBYyxDQUFDOztJQUVqQyxPQUFPQSxZQUFTLENBQUM7R0FDbEIsRUFBRSxDQUFDLENBQUMsQ0FBQztDQUNQOztBQUVELEFBQWVBLFdBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM5QixBQUFPLElBQUksYUFBYSxHQUFHQSxXQUFTLENBQUNSLE9BQUssQ0FBQzs7QUM1QjNDLGlCQUFlLFNBQVMsQ0FBQyxFQUFFO0VBQ3pCLE9BQU8sV0FBVztJQUNoQixPQUFPLENBQUMsQ0FBQztHQUNWLENBQUM7Q0FDSDs7QUNKRCxlQUFlLFNBQVMsQ0FBQyxFQUFFO0VBQ3pCLE9BQU8sQ0FBQyxDQUFDLENBQUM7Q0FDWDs7QUNJRCxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7QUFFbEIsQUFBTyxTQUFTLG1CQUFtQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDeEMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDZixTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO1FBQ25DRCxVQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDbkI7O0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUU7RUFDekMsT0FBTyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7SUFDcEIsSUFBSSxDQUFDLEdBQUcsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QyxPQUFPLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0dBQy9ELENBQUM7Q0FDSDs7QUFFRCxTQUFTLGtCQUFrQixDQUFDLGFBQWEsRUFBRTtFQUN6QyxPQUFPLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtJQUNwQixJQUFJLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLE9BQU8sU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7R0FDL0QsQ0FBQztDQUNIOztBQUVELFNBQVMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRTtFQUMxRCxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDakUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxhQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxhQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO09BQy9ELEVBQUUsR0FBRyxhQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxhQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0VBQzVELE9BQU8sU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Q0FDMUM7O0FBRUQsU0FBUyxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFO0VBQzVELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztNQUM3QyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDO01BQ2hCLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUM7TUFDaEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDOzs7RUFHWCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7SUFDekIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNsQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0dBQ2pDOztFQUVELE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUM5Qzs7RUFFRCxPQUFPLFNBQVMsQ0FBQyxFQUFFO0lBQ2pCLElBQUksQ0FBQyxHQUFHWSxXQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3RCLENBQUM7Q0FDSDs7QUFFRCxBQUFPLFNBQVMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUU7RUFDbkMsT0FBTyxNQUFNO09BQ1IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztPQUN2QixLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO09BQ3JCLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7T0FDakMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0NBQzVCOzs7O0FBSUQsQUFBZSxTQUFTLFVBQVUsQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFO0VBQy9ELElBQUksTUFBTSxHQUFHLElBQUk7TUFDYixLQUFLLEdBQUcsSUFBSTtNQUNaQyxjQUFXLEdBQUcsZ0JBQWdCO01BQzlCLEtBQUssR0FBRyxLQUFLO01BQ2IsU0FBUztNQUNULE1BQU07TUFDTixLQUFLLENBQUM7O0VBRVYsU0FBUyxPQUFPLEdBQUc7SUFDakIsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sR0FBRyxLQUFLLENBQUM7SUFDeEUsTUFBTSxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDdEIsT0FBTyxLQUFLLENBQUM7R0FDZDs7RUFFRCxTQUFTLEtBQUssQ0FBQyxDQUFDLEVBQUU7SUFDaEIsT0FBTyxDQUFDLE1BQU0sS0FBSyxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxHQUFHLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxHQUFHLGFBQWEsRUFBRUEsY0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3BJOztFQUVELEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLEVBQUU7SUFDekIsT0FBTyxDQUFDLEtBQUssS0FBSyxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxHQUFHLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUMxSSxDQUFDOztFQUVGLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLEVBQUU7SUFDekIsT0FBTyxTQUFTLENBQUMsTUFBTSxJQUFJLE1BQU0sR0FBR25CLEtBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFWSxRQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7R0FDdEYsQ0FBQzs7RUFFRixLQUFLLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxFQUFFO0lBQ3hCLE9BQU8sU0FBUyxDQUFDLE1BQU0sSUFBSSxLQUFLLEdBQUdULE9BQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0dBQzlFLENBQUM7O0VBRUYsS0FBSyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsRUFBRTtJQUM3QixPQUFPLEtBQUssR0FBR0EsT0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRWdCLGNBQVcsR0FBRyxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsQ0FBQztHQUN6RSxDQUFDOztFQUVGLEtBQUssQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEVBQUU7SUFDeEIsT0FBTyxTQUFTLENBQUMsTUFBTSxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEtBQUssQ0FBQztHQUM1RCxDQUFDOztFQUVGLEtBQUssQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDLEVBQUU7SUFDOUIsT0FBTyxTQUFTLENBQUMsTUFBTSxJQUFJQSxjQUFXLEdBQUcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJQSxjQUFXLENBQUM7R0FDdEUsQ0FBQzs7RUFFRixPQUFPLE9BQU8sRUFBRSxDQUFDO0NBQ2xCOztBQ2hIRDs7O0FBR0Esb0JBQWUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzVCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFhLEVBQUUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sSUFBSSxDQUFDO0VBQzdGLElBQUksQ0FBQyxFQUFFLFdBQVcsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7OztFQUluQyxPQUFPO0lBQ0wsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVztJQUM1RSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztHQUNoQixDQUFDO0NBQ0g7O0FDWEQsZUFBZSxTQUFTLENBQUMsRUFBRTtFQUN6QixPQUFPLENBQUMsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO0NBQ3ZEOztBQ0pELGtCQUFlLFNBQVMsUUFBUSxFQUFFLFNBQVMsRUFBRTtFQUMzQyxPQUFPLFNBQVMsS0FBSyxFQUFFLEtBQUssRUFBRTtJQUM1QixJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTTtRQUNoQixDQUFDLEdBQUcsRUFBRTtRQUNOLENBQUMsR0FBRyxDQUFDO1FBQ0wsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDZixNQUFNLEdBQUcsQ0FBQyxDQUFDOztJQUVmLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO01BQ3JCLElBQUksTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUM7TUFDNUQsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDdkMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRSxNQUFNO01BQ3JDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDN0M7O0lBRUQsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0dBQ3BDLENBQUM7Q0FDSDs7QUNqQkQscUJBQWUsU0FBUyxRQUFRLEVBQUU7RUFDaEMsT0FBTyxTQUFTLEtBQUssRUFBRTtJQUNyQixPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO01BQ3pDLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckIsQ0FBQyxDQUFDO0dBQ0osQ0FBQztDQUNIOztBQ05ELG9CQUFlLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM1QixDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7RUFFckIsR0FBRyxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRTtJQUMxRCxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDVixLQUFLLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU07TUFDN0IsS0FBSyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTTtNQUM5QyxLQUFLLEdBQUcsRUFBRSxNQUFNLEdBQUcsQ0FBQztNQUNwQixTQUFTLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTTtLQUNwQztHQUNGOztFQUVELE9BQU8sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDdEQ7O0FDWE0sSUFBSSxjQUFjLENBQUM7O0FBRTFCLHVCQUFlLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM1QixJQUFJLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQzVCLElBQUksQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0VBQ3RCLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDbEIsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDZixDQUFDLEdBQUcsUUFBUSxJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO01BQzdGLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDO0VBQzNCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxXQUFXO1FBQ3RCLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNwRCxDQUFDLEdBQUcsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM1RCxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUN2Rjs7QUNiRCxvQkFBZSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDNUIsSUFBSSxDQUFDLEdBQUcsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUM1QixJQUFJLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztFQUN0QixJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQ2xCLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDcEIsT0FBTyxRQUFRLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxXQUFXO1FBQ25FLFdBQVcsQ0FBQyxNQUFNLEdBQUcsUUFBUSxHQUFHLENBQUMsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUM5RyxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0NBQzVFOztBQ05ELGtCQUFlO0VBQ2IsRUFBRSxFQUFFLGFBQWE7RUFDakIsR0FBRyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ3BELEdBQUcsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUN0RCxHQUFHLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRTtFQUNuQyxHQUFHLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7RUFDdkQsR0FBRyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ2xELEdBQUcsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM1QyxHQUFHLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDaEQsR0FBRyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ3RELEdBQUcsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxPQUFPLGFBQWEsQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDekQsR0FBRyxFQUFFLGFBQWE7RUFDbEIsR0FBRyxFQUFFLGdCQUFnQjtFQUNyQixHQUFHLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUU7RUFDckUsR0FBRyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO0NBQ3hELENBQUM7O0FDakJGO0FBQ0EsSUFBSSxFQUFFLEdBQUcsdUVBQXVFLENBQUM7O0FBRWpGLEFBQWUsU0FBUyxlQUFlLENBQUMsU0FBUyxFQUFFO0VBQ2pELE9BQU8sSUFBSSxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7Q0FDdkM7O0FBRUQsZUFBZSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDOztBQUV0RCxTQUFTLGVBQWUsQ0FBQyxTQUFTLEVBQUU7RUFDbEMsSUFBSSxFQUFFLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUMsQ0FBQzs7RUFFbkYsSUFBSSxLQUFLO01BQ0wsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHO01BQ3RCLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRztNQUN2QixJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUc7TUFDdEIsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO01BQ3ZCLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztNQUNqQixLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztNQUM3QixLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7TUFDbEIsU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO01BQzFDLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDOzs7RUFHMUIsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFLEtBQUssR0FBRyxJQUFJLEVBQUUsSUFBSSxHQUFHLEdBQUcsQ0FBQzs7O09BR3RDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQzs7O0VBR3ZDLElBQUksSUFBSSxLQUFLLElBQUksS0FBSyxHQUFHLElBQUksS0FBSyxLQUFLLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxJQUFJLEVBQUUsSUFBSSxHQUFHLEdBQUcsRUFBRSxLQUFLLEdBQUcsR0FBRyxDQUFDOztFQUVsRixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztFQUNqQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztFQUNuQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztFQUNqQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztFQUNyQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztFQUNqQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztFQUNuQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztFQUNuQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztFQUMzQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztDQUNsQjs7QUFFRCxlQUFlLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxXQUFXO0VBQzlDLE9BQU8sSUFBSSxDQUFDLElBQUk7UUFDVixJQUFJLENBQUMsS0FBSztRQUNWLElBQUksQ0FBQyxJQUFJO1FBQ1QsSUFBSSxDQUFDLE1BQU07U0FDVixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7U0FDckIsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDdEQsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDO1NBQ3RCLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsSUFBSSxDQUFDO0NBQ2pCLENBQUM7O0FDdkRGLGlCQUFlLFNBQVMsQ0FBQyxFQUFFO0VBQ3pCLE9BQU8sQ0FBQyxDQUFDO0NBQ1Y7O0FDTUQsSUFBSSxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRXBGLG1CQUFlLFNBQVMsTUFBTSxFQUFFO0VBQzlCLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLElBQUksTUFBTSxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUdMLFVBQVE7TUFDdkcsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRO01BQzFCLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTztNQUN4QixRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHQSxVQUFRO01BQ3ZFLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQzs7RUFFcEMsU0FBUyxTQUFTLENBQUMsU0FBUyxFQUFFO0lBQzVCLFNBQVMsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7O0lBRXZDLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJO1FBQ3JCLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSztRQUN2QixJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUk7UUFDckIsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNO1FBQ3pCLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSTtRQUNyQixLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUs7UUFDdkIsS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLO1FBQ3ZCLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUztRQUMvQixJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQzs7OztJQUkxQixJQUFJLE1BQU0sR0FBRyxNQUFNLEtBQUssR0FBRyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLEtBQUssR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1FBQzdHLE1BQU0sR0FBRyxNQUFNLEtBQUssR0FBRyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sR0FBRyxFQUFFLENBQUM7Ozs7O0lBSzdFLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUM7UUFDOUIsV0FBVyxHQUFHLENBQUMsSUFBSSxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Ozs7OztJQU1uRCxTQUFTLEdBQUcsU0FBUyxJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUU7VUFDeEMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztVQUMxRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDOztJQUUzQyxTQUFTLE1BQU0sQ0FBQyxLQUFLLEVBQUU7TUFDckIsSUFBSSxXQUFXLEdBQUcsTUFBTTtVQUNwQixXQUFXLEdBQUcsTUFBTTtVQUNwQixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzs7TUFFWixJQUFJLElBQUksS0FBSyxHQUFHLEVBQUU7UUFDaEIsV0FBVyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxXQUFXLENBQUM7UUFDOUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztPQUNaLE1BQU07UUFDTCxLQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUM7OztRQUdmLElBQUksYUFBYSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDOUIsS0FBSyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDOzs7UUFHL0MsSUFBSSxhQUFhLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFLGFBQWEsR0FBRyxLQUFLLENBQUM7OztRQUd6RCxXQUFXLEdBQUcsQ0FBQyxhQUFhLElBQUksSUFBSSxLQUFLLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxJQUFJLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxLQUFLLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxJQUFJLFdBQVcsQ0FBQztRQUNySCxXQUFXLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEdBQUcsY0FBYyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxXQUFXLElBQUksYUFBYSxJQUFJLElBQUksS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDOzs7O1FBSWhJLElBQUksV0FBVyxFQUFFO1VBQ2YsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1VBQ3pCLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2QsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUU7Y0FDN0MsV0FBVyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxPQUFPLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxXQUFXLENBQUM7Y0FDdkYsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2NBQzFCLE1BQU07YUFDUDtXQUNGO1NBQ0Y7T0FDRjs7O01BR0QsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7OztNQUduRCxJQUFJLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLE1BQU07VUFDL0QsT0FBTyxHQUFHLE1BQU0sR0FBRyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDOzs7TUFHN0UsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxHQUFHLEtBQUssRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLEtBQUssR0FBRyxXQUFXLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxFQUFFLE9BQU8sR0FBRyxFQUFFLENBQUM7OztNQUd4SCxRQUFRLEtBQUs7UUFDWCxLQUFLLEdBQUcsRUFBRSxLQUFLLEdBQUcsV0FBVyxHQUFHLEtBQUssR0FBRyxXQUFXLEdBQUcsT0FBTyxDQUFDLENBQUMsTUFBTTtRQUNyRSxLQUFLLEdBQUcsRUFBRSxLQUFLLEdBQUcsV0FBVyxHQUFHLE9BQU8sR0FBRyxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUMsTUFBTTtRQUNyRSxLQUFLLEdBQUcsRUFBRSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsV0FBVyxHQUFHLEtBQUssR0FBRyxXQUFXLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU07UUFDcEksU0FBUyxLQUFLLEdBQUcsT0FBTyxHQUFHLFdBQVcsR0FBRyxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUMsTUFBTTtPQUNyRTs7TUFFRCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUN4Qjs7SUFFRCxNQUFNLENBQUMsUUFBUSxHQUFHLFdBQVc7TUFDM0IsT0FBTyxTQUFTLEdBQUcsRUFBRSxDQUFDO0tBQ3ZCLENBQUM7O0lBRUYsT0FBTyxNQUFNLENBQUM7R0FDZjs7RUFFRCxTQUFTLFlBQVksQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFO0lBQ3RDLElBQUksQ0FBQyxHQUFHLFNBQVMsRUFBRSxTQUFTLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxJQUFJLEdBQUcsR0FBRyxFQUFFLFNBQVMsRUFBRTtRQUN4RixDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUNsRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEIsTUFBTSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLE9BQU8sU0FBUyxLQUFLLEVBQUU7TUFDckIsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQztLQUM5QixDQUFDO0dBQ0g7O0VBRUQsT0FBTztJQUNMLE1BQU0sRUFBRSxTQUFTO0lBQ2pCLFlBQVksRUFBRSxZQUFZO0dBQzNCLENBQUM7Q0FDSDs7QUM3SEQsSUFBSSxNQUFNLENBQUM7QUFDWCxBQUFPLElBQUksTUFBTSxDQUFDO0FBQ2xCLEFBQU8sSUFBSSxZQUFZLENBQUM7O0FBRXhCLGFBQWEsQ0FBQztFQUNaLE9BQU8sRUFBRSxHQUFHO0VBQ1osU0FBUyxFQUFFLEdBQUc7RUFDZCxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDYixRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0NBQ3BCLENBQUMsQ0FBQzs7QUFFSCxBQUFlLFNBQVMsYUFBYSxDQUFDLFVBQVUsRUFBRTtFQUNoRCxNQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0VBQ2xDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQ3ZCLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO0VBQ25DLE9BQU8sTUFBTSxDQUFDO0NBQ2Y7O0FDaEJELHFCQUFlLFNBQVMsSUFBSSxFQUFFO0VBQzVCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDL0M7O0FDRkQsc0JBQWUsU0FBUyxJQUFJLEVBQUUsS0FBSyxFQUFFO0VBQ25DLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUMvRzs7QUNGRCxxQkFBZSxTQUFTLElBQUksRUFBRSxHQUFHLEVBQUU7RUFDakMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0VBQ2xELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztDQUN4RDs7QUNGRCxpQkFBZSxTQUFTLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFO0VBQ2hELElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7TUFDakIsSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztNQUNoQyxJQUFJLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxJQUFJLElBQUksR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDO01BQ3hELFNBQVMsQ0FBQztFQUNkLFNBQVMsR0FBRyxlQUFlLENBQUMsU0FBUyxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUM7RUFDbEUsUUFBUSxTQUFTLENBQUMsSUFBSTtJQUNwQixLQUFLLEdBQUcsRUFBRTtNQUNSLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7TUFDdEQsSUFBSSxTQUFTLENBQUMsU0FBUyxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO01BQ3JILE9BQU8sWUFBWSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztLQUN2QztJQUNELEtBQUssRUFBRSxDQUFDO0lBQ1IsS0FBSyxHQUFHLENBQUM7SUFDVCxLQUFLLEdBQUcsQ0FBQztJQUNULEtBQUssR0FBRyxDQUFDO0lBQ1QsS0FBSyxHQUFHLEVBQUU7TUFDUixJQUFJLFNBQVMsQ0FBQyxTQUFTLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7TUFDbkwsTUFBTTtLQUNQO0lBQ0QsS0FBSyxHQUFHLENBQUM7SUFDVCxLQUFLLEdBQUcsRUFBRTtNQUNSLElBQUksU0FBUyxDQUFDLFNBQVMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDO01BQzVJLE1BQU07S0FDUDtHQUNGO0VBQ0QsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7Q0FDMUI7O0FDekJNLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRTtFQUMvQixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDOztFQUUxQixLQUFLLENBQUMsS0FBSyxHQUFHLFNBQVMsS0FBSyxFQUFFO0lBQzVCLElBQUksQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDO0lBQ2pCLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLElBQUksSUFBSSxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQztHQUNqRSxDQUFDOztFQUVGLEtBQUssQ0FBQyxVQUFVLEdBQUcsU0FBUyxLQUFLLEVBQUUsU0FBUyxFQUFFO0lBQzVDLE9BQU8sVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztHQUMvQyxDQUFDOztFQUVGLEtBQUssQ0FBQyxJQUFJLEdBQUcsU0FBUyxLQUFLLEVBQUU7SUFDM0IsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFLEtBQUssR0FBRyxFQUFFLENBQUM7O0lBRTlCLElBQUksQ0FBQyxHQUFHLE1BQU0sRUFBRTtRQUNaLEVBQUUsR0FBRyxDQUFDO1FBQ04sRUFBRSxHQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQztRQUNqQixLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNiLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ1osSUFBSSxDQUFDOztJQUVULElBQUksSUFBSSxHQUFHLEtBQUssRUFBRTtNQUNoQixJQUFJLEdBQUcsS0FBSyxFQUFFLEtBQUssR0FBRyxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQztNQUN4QyxJQUFJLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQztLQUMvQjs7SUFFRCxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7O0lBRXpDLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRTtNQUNaLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7TUFDeEMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztNQUNyQyxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDMUMsTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUU7TUFDbkIsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztNQUN2QyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO01BQ3RDLElBQUksR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztLQUMxQzs7SUFFRCxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUU7TUFDWixDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO01BQ3hDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7TUFDdEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ1gsTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUU7TUFDbkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztNQUN2QyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO01BQ3ZDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNYOztJQUVELE9BQU8sS0FBSyxDQUFDO0dBQ2QsQ0FBQzs7RUFFRixPQUFPLEtBQUssQ0FBQztDQUNkOztBQUVELEFBQWUsU0FBUyxNQUFNLEdBQUc7RUFDL0IsSUFBSSxLQUFLLEdBQUcsVUFBVSxDQUFDTSxtQkFBYSxFQUFFQyxpQkFBYSxDQUFDLENBQUM7O0VBRXJELEtBQUssQ0FBQyxJQUFJLEdBQUcsV0FBVztJQUN0QixPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztHQUM5QixDQUFDOztFQUVGLE9BQU8sU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQ3pCOztBQ3BFRCxJQUFJQyxJQUFFLEdBQUcsSUFBSSxJQUFJO0lBQ2JDLElBQUUsR0FBRyxJQUFJLElBQUksQ0FBQzs7QUFFbEIsQUFBZSxTQUFTLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7O0VBRWpFLFNBQVMsUUFBUSxDQUFDLElBQUksRUFBRTtJQUN0QixPQUFPLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztHQUM3Qzs7RUFFRCxRQUFRLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQzs7RUFFMUIsUUFBUSxDQUFDLElBQUksR0FBRyxTQUFTLElBQUksRUFBRTtJQUM3QixPQUFPLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDO0dBQ2hGLENBQUM7O0VBRUYsUUFBUSxDQUFDLEtBQUssR0FBRyxTQUFTLElBQUksRUFBRTtJQUM5QixJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQ25CLEVBQUUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdCLE9BQU8sSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7R0FDeEMsQ0FBQzs7RUFFRixRQUFRLENBQUMsTUFBTSxHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUNyQyxPQUFPLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO0dBQ25GLENBQUM7O0VBRUYsUUFBUSxDQUFDLEtBQUssR0FBRyxTQUFTLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQzNDLElBQUksS0FBSyxHQUFHLEVBQUUsRUFBRSxRQUFRLENBQUM7SUFDekIsS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0IsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0MsSUFBSSxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLEtBQUssQ0FBQztJQUNqRCxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztXQUN6RSxRQUFRLEdBQUcsS0FBSyxJQUFJLEtBQUssR0FBRyxJQUFJLEVBQUU7SUFDekMsT0FBTyxLQUFLLENBQUM7R0FDZCxDQUFDOztFQUVGLFFBQVEsQ0FBQyxNQUFNLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDL0IsT0FBTyxXQUFXLENBQUMsU0FBUyxJQUFJLEVBQUU7TUFDaEMsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQzVFLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO01BQ3RCLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLElBQUksR0FBRyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUU7VUFDaEMsT0FBTyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRTtTQUMxQyxNQUFNLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFO1VBQ3pCLE9BQU8sT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUU7U0FDMUM7T0FDRjtLQUNGLENBQUMsQ0FBQztHQUNKLENBQUM7O0VBRUYsSUFBSSxLQUFLLEVBQUU7SUFDVCxRQUFRLENBQUMsS0FBSyxHQUFHLFNBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRTtNQUNwQ0QsSUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFQyxJQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7TUFDckMsTUFBTSxDQUFDRCxJQUFFLENBQUMsRUFBRSxNQUFNLENBQUNDLElBQUUsQ0FBQyxDQUFDO01BQ3ZCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUNELElBQUUsRUFBRUMsSUFBRSxDQUFDLENBQUMsQ0FBQztLQUNsQyxDQUFDOztJQUVGLFFBQVEsQ0FBQyxLQUFLLEdBQUcsU0FBUyxJQUFJLEVBQUU7TUFDOUIsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7TUFDeEIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJO1lBQ3RDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLFFBQVE7WUFDdEIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLO2dCQUNqQixTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRTtnQkFDN0MsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDdEUsQ0FBQztHQUNIOztFQUVELE9BQU8sUUFBUSxDQUFDO0NBQ2pCOztBQ2pFRCxJQUFJLFdBQVcsR0FBR0MsV0FBUSxDQUFDLFdBQVc7O0NBRXJDLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7Q0FDNUIsRUFBRSxTQUFTLEtBQUssRUFBRSxHQUFHLEVBQUU7RUFDdEIsT0FBTyxHQUFHLEdBQUcsS0FBSyxDQUFDO0NBQ3BCLENBQUMsQ0FBQzs7O0FBR0gsV0FBVyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsRUFBRTtFQUM5QixDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNsQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sSUFBSSxDQUFDO0VBQzFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxXQUFXLENBQUM7RUFDakMsT0FBT0EsV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0lBQzdCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDeEMsRUFBRSxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDaEMsRUFBRSxTQUFTLEtBQUssRUFBRSxHQUFHLEVBQUU7SUFDdEIsT0FBTyxDQUFDLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQyxDQUFDO0dBQzFCLENBQUMsQ0FBQztDQUNKLENBQUM7O0FDdEJLLElBQUlDLGdCQUFjLEdBQUcsR0FBRyxDQUFDO0FBQ2hDLEFBQU8sSUFBSUMsZ0JBQWMsR0FBRyxHQUFHLENBQUM7QUFDaEMsQUFBTyxJQUFJQyxjQUFZLEdBQUcsSUFBSSxDQUFDO0FBQy9CLEFBQU8sSUFBSUMsYUFBVyxHQUFHLEtBQUssQ0FBQztBQUMvQixBQUFPLElBQUlDLGNBQVksR0FBRyxNQUFNOztBQ0RoQyxJQUFJLE1BQU0sR0FBR0wsV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0VBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUdDLGdCQUFjLENBQUMsR0FBR0EsZ0JBQWMsQ0FBQyxDQUFDO0NBQ2xFLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHQSxnQkFBYyxDQUFDLENBQUM7Q0FDN0MsRUFBRSxTQUFTLEtBQUssRUFBRSxHQUFHLEVBQUU7RUFDdEIsT0FBTyxDQUFDLEdBQUcsR0FBRyxLQUFLLElBQUlBLGdCQUFjLENBQUM7Q0FDdkMsRUFBRSxTQUFTLElBQUksRUFBRTtFQUNoQixPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztDQUM3QixDQUFDOztBQ1JGLElBQUksTUFBTSxHQUFHRCxXQUFRLENBQUMsU0FBUyxJQUFJLEVBQUU7RUFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBR0UsZ0JBQWMsQ0FBQyxHQUFHQSxnQkFBYyxDQUFDLENBQUM7Q0FDbEUsRUFBRSxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7RUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUdBLGdCQUFjLENBQUMsQ0FBQztDQUM3QyxFQUFFLFNBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRTtFQUN0QixPQUFPLENBQUMsR0FBRyxHQUFHLEtBQUssSUFBSUEsZ0JBQWMsQ0FBQztDQUN2QyxFQUFFLFNBQVMsSUFBSSxFQUFFO0VBQ2hCLE9BQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0NBQzFCLENBQUM7O0FDUkYsSUFBSSxJQUFJLEdBQUdGLFdBQVEsQ0FBQyxTQUFTLElBQUksRUFBRTtFQUNqQyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBR0UsZ0JBQWMsR0FBR0MsY0FBWSxDQUFDO0VBQ3RFLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLElBQUlBLGNBQVksQ0FBQztFQUN2QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxNQUFNLElBQUlBLGNBQVksQ0FBQyxHQUFHQSxjQUFZLEdBQUcsTUFBTSxDQUFDLENBQUM7Q0FDbkYsRUFBRSxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7RUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUdBLGNBQVksQ0FBQyxDQUFDO0NBQzNDLEVBQUUsU0FBUyxLQUFLLEVBQUUsR0FBRyxFQUFFO0VBQ3RCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsS0FBSyxJQUFJQSxjQUFZLENBQUM7Q0FDckMsRUFBRSxTQUFTLElBQUksRUFBRTtFQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztDQUN4QixDQUFDOztBQ1ZGLElBQUksR0FBRyxHQUFHSCxXQUFRLENBQUMsU0FBUyxJQUFJLEVBQUU7RUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztDQUMzQixFQUFFLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtFQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztDQUNyQyxFQUFFLFNBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRTtFQUN0QixPQUFPLENBQUMsR0FBRyxHQUFHLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxJQUFJRSxnQkFBYyxJQUFJRSxhQUFXLENBQUM7Q0FDN0csRUFBRSxTQUFTLElBQUksRUFBRTtFQUNoQixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7Q0FDM0IsQ0FBQzs7QUNSRixTQUFTLE9BQU8sQ0FBQyxDQUFDLEVBQUU7RUFDbEIsT0FBT0osV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0lBQzdCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUMzQixFQUFFLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDekMsRUFBRSxTQUFTLEtBQUssRUFBRSxHQUFHLEVBQUU7SUFDdEIsT0FBTyxDQUFDLEdBQUcsR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsSUFBSUUsZ0JBQWMsSUFBSUcsY0FBWSxDQUFDO0dBQzlHLENBQUMsQ0FBQztDQUNKOztBQUVELEFBQU8sSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLEFBQU8sSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLEFBQU8sSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLEFBQU8sSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLEFBQU8sSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLEFBQU8sSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLEFBQU8sSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQzs7QUNsQmhDLElBQUksS0FBSyxHQUFHTCxXQUFRLENBQUMsU0FBUyxJQUFJLEVBQUU7RUFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNoQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQzNCLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0NBQ3ZDLEVBQUUsU0FBUyxLQUFLLEVBQUUsR0FBRyxFQUFFO0VBQ3RCLE9BQU8sR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDO0NBQzNGLEVBQUUsU0FBUyxJQUFJLEVBQUU7RUFDaEIsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Q0FDeEIsQ0FBQzs7QUNURixJQUFJLElBQUksR0FBR0EsV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0VBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDM0IsRUFBRSxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7RUFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7Q0FDN0MsRUFBRSxTQUFTLEtBQUssRUFBRSxHQUFHLEVBQUU7RUFDdEIsT0FBTyxHQUFHLENBQUMsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO0NBQ2hELEVBQUUsU0FBUyxJQUFJLEVBQUU7RUFDaEIsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Q0FDM0IsQ0FBQyxDQUFDOzs7QUFHSCxJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxFQUFFO0VBQ3ZCLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUdBLFdBQVEsQ0FBQyxTQUFTLElBQUksRUFBRTtJQUMvRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3pELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7R0FDM0IsRUFBRSxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0dBQ2pELENBQUMsQ0FBQztD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QUFJLENBQUMsQ0FBQztDQUNuRCxFQUFFLFNBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRTtFQUN0QixPQUFPLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7Q0FDdEQsRUFBRSxTQUFTLElBQUksRUFBRTtFQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztDQUM5QixDQUFDLENBQUM7OztBQUdILE9BQU8sQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEVBQUU7RUFDMUIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBR0EsV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0lBQy9FLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDL0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUM5QixFQUFFLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUN0QixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDdkQsQ0FBQyxDQUFDO0NBQ0osQ0FBQzs7QUNURixTQUFTLFNBQVMsQ0FBQyxDQUFDLEVBQUU7RUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRTtJQUN6QixJQUFJLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FB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SUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3pDLE1BQU07VUFDTCxJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRUEsTUFBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztVQUNsRCxJQUFJLEdBQUdBLE1BQUcsR0FBRyxDQUFDLElBQUlBLE1BQUcsS0FBSyxDQUFDLEdBQUdDLE1BQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUdBLE1BQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztVQUN2RSxJQUFJLEdBQUdDLEdBQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7VUFDM0MsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7VUFDekIsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7VUFDdEIsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDdEM7T0FDRixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFO1FBQy9CLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3REYsTUFBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFT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QyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzlDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDaEQ7O0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtFQUMzQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzlDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDaEQ7O0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtFQUN4QyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzlDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDaEQ7O0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtFQUMzQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzlDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDaEQ7O0FBRUQsU0FBUyxhQUFhLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFDbkMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM5QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ2hEOztBQUVELFNBQVMsU0FBUyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO0VBQy9CLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQzdFOztBQUVELFNBQVMsU0FBUyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO0VBQy9CLElBQUksQ0FBQyxHQUFHLDhCQUE4QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxD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SUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM5QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ2hEOztBQUVELFNBQVMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFDdkMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM5QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ2hEOztBQUVELFNBQVMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFDdkMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM5QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ2xFOztBQUVELFNBQVMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFD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Q0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdEIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3JFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUNsRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDbEQsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7YUFDdEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7OztRQUk3QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1RixHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQzthQUNoQixJQUFJLENBQUMsTUFBTSxDQUFDO2FBQ1osS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQzthQUN0QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdEIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FB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QUFFO01BQ2QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUdDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztXQUNyRSxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBR0EsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQy9FOztJQUVELE9BQU8sSUFBSSxDQUFDO0dBQ2I7RUFDRCxJQUFJLEVBQUUsV0FBVztJQUNmLElBQUksSUFBSSxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxQixLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3hDLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDM0I7RUFDRCxJQUFJLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3pCLElBQUksQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdEgsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDM0UsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0dBQ3RGO0VBQ0QsS0FBSyxFQUFFLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDM0UsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDMUY7Q0FDRixDQUFDOztBQUVGLFNBQVNELEtBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQ3ZCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO0lBQzlDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FB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RCxPQUFPLElBQUksVUFBVSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztDQUMzRDs7QUNqQkQsMkJBQWUsU0FBUyxNQUFNLEVBQUU7RUFDOUIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUs7TUFDakIsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7O0VBRWxCLElBQUksT0FBTyxNQUFNLEtBQUssVUFBVSxFQUFFLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7O0VBRS9ELEtBQUssSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEdBQUcsRUFBRSxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO0lBQ2xHLEtBQUssSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7TUFDckUsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ25CLEtBQUssSUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRTtVQUN0SSxJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFD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QUFJLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzVCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7S0FDbEM7Ozs7Ozs7Ozs7SUFVRCxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUM1RCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztLQUNyQzs7Ozs7Ozs7SUFRRCxlQUFlLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDbkQsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMs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
