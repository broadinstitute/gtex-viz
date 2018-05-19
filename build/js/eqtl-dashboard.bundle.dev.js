var EqtlDashboard = (function (exports) {
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

var tsv$1 = dsv$1("\t");

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

function customEvent(event1, listener, that, args) {
  var event0 = event;
  event1.sourceEvent = event;
  event = event1;
  try {
    return listener.apply(that, args);
  } finally {
    event = event0;
  }
}

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

var sourceEvent = function() {
  var current = event, source;
  while (source = current.sourceEvent) current = source;
  return current;
};

var point = function(node, event) {
  var svg = node.ownerSVGElement || node;

  if (svg.createSVGPoint) {
    var point = svg.createSVGPoint();
    point.x = event.clientX, point.y = event.clientY;
    point = point.matrixTransform(node.getScreenCTM().inverse());
    return [point.x, point.y];
  }

  var rect = node.getBoundingClientRect();
  return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
};

var mouse = function(node) {
  var event = sourceEvent();
  if (event.changedTouches) event = event.changedTouches[0];
  return point(node, event);
};

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

var number = function(x) {
  return x === null ? NaN : +x;
};

var variance = function(values, valueof) {
  var n = values.length,
      m = 0,
      i = -1,
      mean = 0,
      value,
      delta,
      sum = 0;

  if (valueof == null) {
    while (++i < n) {
      if (!isNaN(value = number(values[i]))) {
        delta = value - mean;
        mean += delta / ++m;
        sum += delta * (value - mean);
      }
    }
  }

  else {
    while (++i < n) {
      if (!isNaN(value = number(valueof(values[i], i, values)))) {
        delta = value - mean;
        mean += delta / ++m;
        sum += delta * (value - mean);
      }
    }
  }

  if (m > 1) return sum / (m - 1);
};

var deviation = function(array, f) {
  var v = variance(array, f);
  return v ? Math.sqrt(v) : v;
};

var extent = function(values, valueof) {
  var n = values.length,
      i = -1,
      value,
      min,
      max;

  if (valueof == null) {
    while (++i < n) { // Find the first comparable value.
      if ((value = values[i]) != null && value >= value) {
        min = max = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = values[i]) != null) {
            if (min > value) min = value;
            if (max < value) max = value;
          }
        }
      }
    }
  }

  else {
    while (++i < n) { // Find the first comparable value.
      if ((value = valueof(values[i], i, values)) != null && value >= value) {
        min = max = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = valueof(values[i], i, values)) != null) {
            if (min > value) min = value;
            if (max < value) max = value;
          }
        }
      }
    }
  }

  return [min, max];
};

var range = function(start, stop, step) {
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

var quantile = function(values, p, valueof) {
  if (valueof == null) valueof = number;
  if (!(n = values.length)) return;
  if ((p = +p) <= 0 || n < 2) return +valueof(values[0], 0, values);
  if (p >= 1) return +valueof(values[n - 1], n - 1, values);
  var n,
      i = (n - 1) * p,
      i0 = Math.floor(i),
      value0 = +valueof(values[i0], i0, values),
      value1 = +valueof(values[i0 + 1], i0 + 1, values);
  return value0 + (value1 - value0) * (i - i0);
};

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

var mean = function(values, valueof) {
  var n = values.length,
      m = n,
      i = -1,
      value,
      sum = 0;

  if (valueof == null) {
    while (++i < n) {
      if (!isNaN(value = number(values[i]))) sum += value;
      else --m;
    }
  }

  else {
    while (++i < n) {
      if (!isNaN(value = number(valueof(values[i], i, values)))) sum += value;
      else --m;
    }
  }

  if (m) return sum / m;
};

var median = function(values, valueof) {
  var n = values.length,
      i = -1,
      value,
      numbers = [];

  if (valueof == null) {
    while (++i < n) {
      if (!isNaN(value = number(values[i]))) {
        numbers.push(value);
      }
    }
  }

  else {
    while (++i < n) {
      if (!isNaN(value = number(valueof(values[i], i, values)))) {
        numbers.push(value);
      }
    }
  }

  return quantile(numbers.sort(ascending$1), 0.5);
};

var min = function(values, valueof) {
  var n = values.length,
      i = -1,
      value,
      min;

  if (valueof == null) {
    while (++i < n) { // Find the first comparable value.
      if ((value = values[i]) != null && value >= value) {
        min = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = values[i]) != null && min > value) {
            min = value;
          }
        }
      }
    }
  }

  else {
    while (++i < n) { // Find the first comparable value.
      if ((value = valueof(values[i], i, values)) != null && value >= value) {
        min = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = valueof(values[i], i, values)) != null && min > value) {
            min = value;
          }
        }
      }
    }
  }

  return min;
};

var prefix = "$";

function Map() {}

Map.prototype = map$1.prototype = {
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

function map$1(object, f) {
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
        valuesByKey = map$1(),
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

  function entries(map, depth) {
    if (++depth > keys.length) return map;
    var array, sortKey = sortKeys[depth - 1];
    if (rollup != null && depth >= keys.length) array = map.entries();
    else array = [], map.each(function(v, k) { array.push({key: k, values: entries(v, depth)}); });
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
  return map$1();
}

function setMap(map, key, value) {
  map.set(key, value);
}

var array$1 = Array.prototype;

var map$3 = array$1.map;
var slice$1 = array$1.slice;

var implicit = {name: "implicit"};

function ordinal(range) {
  var index = map$1(),
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
    domain = [], index = map$1();
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
    var values = range(n).map(function(i) { return start + step * i; });
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

var array$2 = function(a, b) {
  var nb = b ? b.length : 0,
      na = a ? Math.min(nb, a.length) : 0,
      x = new Array(na),
      c = new Array(nb),
      i;

  for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
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
      i[k] = interpolate(a[k], b[k]);
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

var interpolate = function(a, b) {
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
      interpolate$$1 = interpolate,
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

var pi = Math.PI;
var tau = 2 * pi;
var epsilon = 1e-6;
var tauEpsilon = tau - epsilon;

function Path() {
  this._x0 = this._y0 = // start of current subpath
  this._x1 = this._y1 = null; // end of current subpath
  this._ = "";
}

function path() {
  return new Path;
}

Path.prototype = path.prototype = {
  constructor: Path,
  moveTo: function(x, y) {
    this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
  },
  closePath: function() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._ += "Z";
    }
  },
  lineTo: function(x, y) {
    this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  quadraticCurveTo: function(x1, y1, x, y) {
    this._ += "Q" + (+x1) + "," + (+y1) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  bezierCurveTo: function(x1, y1, x2, y2, x, y) {
    this._ += "C" + (+x1) + "," + (+y1) + "," + (+x2) + "," + (+y2) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  arcTo: function(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    var x0 = this._x1,
        y0 = this._y1,
        x21 = x2 - x1,
        y21 = y2 - y1,
        x01 = x0 - x1,
        y01 = y0 - y1,
        l01_2 = x01 * x01 + y01 * y01;

    // Is the radius negative? Error.
    if (r < 0) throw new Error("negative radius: " + r);

    // Is this path empty? Move to (x1,y1).
    if (this._x1 === null) {
      this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
    }

    // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
    else if (!(l01_2 > epsilon)) {}

    // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
    // Equivalently, is (x1,y1) coincident with (x2,y2)?
    // Or, is the radius zero? Line to (x1,y1).
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
    }

    // Otherwise, draw an arc!
    else {
      var x20 = x2 - x0,
          y20 = y2 - y0,
          l21_2 = x21 * x21 + y21 * y21,
          l20_2 = x20 * x20 + y20 * y20,
          l21 = Math.sqrt(l21_2),
          l01 = Math.sqrt(l01_2),
          l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
          t01 = l / l01,
          t21 = l / l21;

      // If the start tangent is not coincident with (x0,y0), line to.
      if (Math.abs(t01 - 1) > epsilon) {
        this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
      }

      this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
    }
  },
  arc: function(x, y, r, a0, a1, ccw) {
    x = +x, y = +y, r = +r;
    var dx = r * Math.cos(a0),
        dy = r * Math.sin(a0),
        x0 = x + dx,
        y0 = y + dy,
        cw = 1 ^ ccw,
        da = ccw ? a0 - a1 : a1 - a0;

    // Is the radius negative? Error.
    if (r < 0) throw new Error("negative radius: " + r);

    // Is this path empty? Move to (x0,y0).
    if (this._x1 === null) {
      this._ += "M" + x0 + "," + y0;
    }

    // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
    else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._ += "L" + x0 + "," + y0;
    }

    // Is this arc empty? We’re done.
    if (!r) return;

    // Does the angle go the wrong way? Flip the direction.
    if (da < 0) da = da % tau + tau;

    // Is this a complete circle? Draw two arcs to complete the circle.
    if (da > tauEpsilon) {
      this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
    }

    // Is this arc non-empty? Draw an arc!
    else if (da > epsilon) {
      this._ += "A" + r + "," + r + ",0," + (+(da >= pi)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
    }
  },
  rect: function(x, y, w, h) {
    this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + (+w) + "v" + (+h) + "h" + (-w) + "Z";
  },
  toString: function() {
    return this._;
  }
};

var constant$4 = function(x) {
  return function constant() {
    return x;
  };
};

function Linear(context) {
  this._context = context;
}

Linear.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; // proceed
      default: this._context.lineTo(x, y); break;
    }
  }
};

var curveLinear = function(context) {
  return new Linear(context);
};

function x(p) {
  return p[0];
}

function y(p) {
  return p[1];
}

var line = function() {
  var x$$1 = x,
      y$$1 = y,
      defined = constant$4(true),
      context = null,
      curve = curveLinear,
      output = null;

  function line(data) {
    var i,
        n = data.length,
        d,
        defined0 = false,
        buffer;

    if (context == null) output = curve(buffer = path());

    for (i = 0; i <= n; ++i) {
      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
        if (defined0 = !defined0) output.lineStart();
        else output.lineEnd();
      }
      if (defined0) output.point(+x$$1(d, i, data), +y$$1(d, i, data));
    }

    if (buffer) return output = null, buffer + "" || null;
  }

  line.x = function(_) {
    return arguments.length ? (x$$1 = typeof _ === "function" ? _ : constant$4(+_), line) : x$$1;
  };

  line.y = function(_) {
    return arguments.length ? (y$$1 = typeof _ === "function" ? _ : constant$4(+_), line) : y$$1;
  };

  line.defined = function(_) {
    return arguments.length ? (defined = typeof _ === "function" ? _ : constant$4(!!_), line) : defined;
  };

  line.curve = function(_) {
    return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
  };

  line.context = function(_) {
    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
  };

  return line;
};

var area = function() {
  var x0 = x,
      x1 = null,
      y0 = constant$4(0),
      y1 = y,
      defined = constant$4(true),
      context = null,
      curve = curveLinear,
      output = null;

  function area(data) {
    var i,
        j,
        k,
        n = data.length,
        d,
        defined0 = false,
        buffer,
        x0z = new Array(n),
        y0z = new Array(n);

    if (context == null) output = curve(buffer = path());

    for (i = 0; i <= n; ++i) {
      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
        if (defined0 = !defined0) {
          j = i;
          output.areaStart();
          output.lineStart();
        } else {
          output.lineEnd();
          output.lineStart();
          for (k = i - 1; k >= j; --k) {
            output.point(x0z[k], y0z[k]);
          }
          output.lineEnd();
          output.areaEnd();
        }
      }
      if (defined0) {
        x0z[i] = +x0(d, i, data), y0z[i] = +y0(d, i, data);
        output.point(x1 ? +x1(d, i, data) : x0z[i], y1 ? +y1(d, i, data) : y0z[i]);
      }
    }

    if (buffer) return output = null, buffer + "" || null;
  }

  function arealine() {
    return line().defined(defined).curve(curve).context(context);
  }

  area.x = function(_) {
    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant$4(+_), x1 = null, area) : x0;
  };

  area.x0 = function(_) {
    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant$4(+_), area) : x0;
  };

  area.x1 = function(_) {
    return arguments.length ? (x1 = _ == null ? null : typeof _ === "function" ? _ : constant$4(+_), area) : x1;
  };

  area.y = function(_) {
    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant$4(+_), y1 = null, area) : y0;
  };

  area.y0 = function(_) {
    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant$4(+_), area) : y0;
  };

  area.y1 = function(_) {
    return arguments.length ? (y1 = _ == null ? null : typeof _ === "function" ? _ : constant$4(+_), area) : y1;
  };

  area.lineX0 =
  area.lineY0 = function() {
    return arealine().x(x0).y(y0);
  };

  area.lineY1 = function() {
    return arealine().x(x0).y(y1);
  };

  area.lineX1 = function() {
    return arealine().x(x1).y(y0);
  };

  area.defined = function(_) {
    return arguments.length ? (defined = typeof _ === "function" ? _ : constant$4(!!_), area) : defined;
  };

  area.curve = function(_) {
    return arguments.length ? (curve = _, context != null && (output = curve(context)), area) : curve;
  };

  area.context = function(_) {
    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), area) : context;
  };

  return area;
};

function sign(x) {
  return x < 0 ? -1 : 1;
}

// Calculate the slopes of the tangents (Hermite-type interpolation) based on
// the following paper: Steffen, M. 1990. A Simple Method for Monotonic
// Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
// NOV(II), P. 443, 1990.
function slope3(that, x2, y2) {
  var h0 = that._x1 - that._x0,
      h1 = x2 - that._x1,
      s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
      s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
      p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}

// Calculate a one-sided slope.
function slope2(that, t) {
  var h = that._x1 - that._x0;
  return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
}

// According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
// "you can express cubic Hermite interpolation in terms of cubic Bézier curves
// with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
function point$5(that, t0, t1) {
  var x0 = that._x0,
      y0 = that._y0,
      x1 = that._x1,
      y1 = that._y1,
      dx = (x1 - x0) / 3;
  that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
}

function MonotoneX(context) {
  this._context = context;
}

MonotoneX.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 =
    this._y0 = this._y1 =
    this._t0 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2: this._context.lineTo(this._x1, this._y1); break;
      case 3: point$5(this, this._t0, slope2(this, this._t0)); break;
    }
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    var t1 = NaN;

    x = +x, y = +y;
    if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; point$5(this, slope2(this, t1 = slope3(this, x, y)), t1); break;
      default: point$5(this, this._t0, t1 = slope3(this, x, y)); break;
    }

    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
    this._t0 = t1;
  }
};

function MonotoneY(context) {
  this._context = new ReflectContext(context);
}

(MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function(x, y) {
  MonotoneX.prototype.point.call(this, y, x);
};

function ReflectContext(context) {
  this._context = context;
}

ReflectContext.prototype = {
  moveTo: function(x, y) { this._context.moveTo(y, x); },
  closePath: function() { this._context.closePath(); },
  lineTo: function(x, y) { this._context.lineTo(y, x); },
  bezierCurveTo: function(x1, y1, x2, y2, x, y) { this._context.bezierCurveTo(y1, x1, y2, x2, y, x); }
};

var slice$3 = Array.prototype.slice;

var identity$5 = function(x) {
  return x;
};

var top = 1;
var right = 2;
var bottom = 3;
var left = 4;
var epsilon$2 = 1e-6;

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
        format = tickFormat == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity$5) : tickFormat,
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
          .attr("opacity", epsilon$2)
          .attr("transform", function(d) { return isFinite(d = position(d)) ? transform(d) : this.getAttribute("transform"); });

      tickEnter
          .attr("opacity", epsilon$2)
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

var noop$1 = {value: function() {}};

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
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
      return;
    }

    // If a type was specified, set the callback for the given type and name.
    // Otherwise, if a null callback was specified, remove callbacks of the given name.
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set$2(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set$2(_[t], typename.name, null);
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

function get(type, name) {
  for (var i = 0, n = type.length, c; i < n; ++i) {
    if ((c = type[i]).name === name) {
      return c.value;
    }
  }
}

function set$2(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop$1, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({name: name, value: callback});
  return type;
}

var noevent = function() {
  event.preventDefault();
  event.stopImmediatePropagation();
};

var nodrag = function(view) {
  var root = view.document.documentElement,
      selection = select(view).on("dragstart.drag", noevent, true);
  if ("onselectstart" in root) {
    selection.on("selectstart.drag", noevent, true);
  } else {
    root.__noselect = root.style.MozUserSelect;
    root.style.MozUserSelect = "none";
  }
};

function yesdrag(view, noclick) {
  var root = view.document.documentElement,
      selection = select(view).on("dragstart.drag", null);
  if (noclick) {
    selection.on("click.drag", noevent, true);
    setTimeout(function() { selection.on("click.drag", null); }, 0);
  }
  if ("onselectstart" in root) {
    selection.on("selectstart.drag", null);
  } else {
    root.style.MozUserSelect = root.__noselect;
    delete root.__noselect;
  }
}

function DragEvent(target, type, subject, id, active, x, y, dx, dy, dispatch) {
  this.target = target;
  this.type = type;
  this.subject = subject;
  this.identifier = id;
  this.active = active;
  this.x = x;
  this.y = y;
  this.dx = dx;
  this.dy = dy;
  this._ = dispatch;
}

DragEvent.prototype.on = function() {
  var value = this._.on.apply(this._, arguments);
  return value === this._ ? this : value;
};

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
  var schedule = get$1(node, id);
  if (schedule.state > CREATED) throw new Error("too late; already scheduled");
  return schedule;
}

function set$3(node, id) {
  var schedule = get$1(node, id);
  if (schedule.state > STARTING) throw new Error("too late; already started");
  return schedule;
}

function get$1(node, id) {
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
    var schedule$$1 = set$3(this, id),
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
    var schedule$$1 = set$3(this, id),
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
    var tween = get$1(this.node(), id).tween;
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
    var schedule$$1 = set$3(this, id);
    (schedule$$1.value || (schedule$$1.value = {}))[name] = value.apply(this, arguments);
  });

  return function(node) {
    return get$1(node, id).value[name];
  };
}

var interpolate$1 = function(a, b) {
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

function attrConstant$1(name, interpolate, value1) {
  var value00,
      interpolate0;
  return function() {
    var value0 = this.getAttribute(name);
    return value0 === value1 ? null
        : value0 === value00 ? interpolate0
        : interpolate0 = interpolate(value00 = value0, value1);
  };
}

function attrConstantNS$1(fullname, interpolate, value1) {
  var value00,
      interpolate0;
  return function() {
    var value0 = this.getAttributeNS(fullname.space, fullname.local);
    return value0 === value1 ? null
        : value0 === value00 ? interpolate0
        : interpolate0 = interpolate(value00 = value0, value1);
  };
}

function attrFunction$1(name, interpolate, value) {
  var value00,
      value10,
      interpolate0;
  return function() {
    var value0, value1 = value(this);
    if (value1 == null) return void this.removeAttribute(name);
    value0 = this.getAttribute(name);
    return value0 === value1 ? null
        : value0 === value00 && value1 === value10 ? interpolate0
        : interpolate0 = interpolate(value00 = value0, value10 = value1);
  };
}

function attrFunctionNS$1(fullname, interpolate, value) {
  var value00,
      value10,
      interpolate0;
  return function() {
    var value0, value1 = value(this);
    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
    value0 = this.getAttributeNS(fullname.space, fullname.local);
    return value0 === value1 ? null
        : value0 === value00 && value1 === value10 ? interpolate0
        : interpolate0 = interpolate(value00 = value0, value10 = value1);
  };
}

var transition_attr = function(name, value) {
  var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate$1;
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
      : get$1(this.node(), id).delay;
};

function durationFunction(id, value) {
  return function() {
    set$3(this, id).duration = +value.apply(this, arguments);
  };
}

function durationConstant(id, value) {
  return value = +value, function() {
    set$3(this, id).duration = value;
  };
}

var transition_duration = function(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? durationFunction
          : durationConstant)(id, value))
      : get$1(this.node(), id).duration;
};

function easeConstant(id, value) {
  if (typeof value !== "function") throw new Error;
  return function() {
    set$3(this, id).ease = value;
  };
}

var transition_ease = function(value) {
  var id = this._id;

  return arguments.length
      ? this.each(easeConstant(id, value))
      : get$1(this.node(), id).ease;
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
  var on0, on1, sit = start(name) ? init : set$3;
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
      ? get$1(this.node(), id).on.on(name)
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
        schedule(subgroup[i], name, id, i, subgroup, get$1(node, id));
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
        for (var children = select.call(node, node.__data__, i, group), child, inherit = get$1(node, id), k = 0, l = children.length; k < l; ++k) {
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

function styleRemove$1(name, interpolate) {
  var value00,
      value10,
      interpolate0;
  return function() {
    var value0 = styleValue(this, name),
        value1 = (this.style.removeProperty(name), styleValue(this, name));
    return value0 === value1 ? null
        : value0 === value00 && value1 === value10 ? interpolate0
        : interpolate0 = interpolate(value00 = value0, value10 = value1);
  };
}

function styleRemoveEnd(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant$1(name, interpolate, value1) {
  var value00,
      interpolate0;
  return function() {
    var value0 = styleValue(this, name);
    return value0 === value1 ? null
        : value0 === value00 ? interpolate0
        : interpolate0 = interpolate(value00 = value0, value1);
  };
}

function styleFunction$1(name, interpolate, value) {
  var value00,
      value10,
      interpolate0;
  return function() {
    var value0 = styleValue(this, name),
        value1 = value(this);
    if (value1 == null) value1 = (this.style.removeProperty(name), styleValue(this, name));
    return value0 === value1 ? null
        : value0 === value00 && value1 === value10 ? interpolate0
        : interpolate0 = interpolate(value00 = value0, value10 = value1);
  };
}

var transition_style = function(name, value, priority) {
  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate$1;
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
        var inherit = get$1(node, id0);
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

var constant$6 = function(x) {
  return function() {
    return x;
  };
};

var BrushEvent = function(target, type, selection) {
  this.target = target;
  this.type = type;
  this.selection = selection;
};

function nopropagation$1() {
  event.stopImmediatePropagation();
}

var noevent$1 = function() {
  event.preventDefault();
  event.stopImmediatePropagation();
};

var MODE_DRAG = {name: "drag"};
var MODE_SPACE = {name: "space"};
var MODE_HANDLE = {name: "handle"};
var MODE_CENTER = {name: "center"};

var X = {
  name: "x",
  handles: ["e", "w"].map(type),
  input: function(x, e) { return x && [[x[0], e[0][1]], [x[1], e[1][1]]]; },
  output: function(xy) { return xy && [xy[0][0], xy[1][0]]; }
};

var Y = {
  name: "y",
  handles: ["n", "s"].map(type),
  input: function(y, e) { return y && [[e[0][0], y[0]], [e[1][0], y[1]]]; },
  output: function(xy) { return xy && [xy[0][1], xy[1][1]]; }
};

var XY = {
  name: "xy",
  handles: ["n", "e", "s", "w", "nw", "ne", "se", "sw"].map(type),
  input: function(xy) { return xy; },
  output: function(xy) { return xy; }
};

var cursors = {
  overlay: "crosshair",
  selection: "move",
  n: "ns-resize",
  e: "ew-resize",
  s: "ns-resize",
  w: "ew-resize",
  nw: "nwse-resize",
  ne: "nesw-resize",
  se: "nwse-resize",
  sw: "nesw-resize"
};

var flipX = {
  e: "w",
  w: "e",
  nw: "ne",
  ne: "nw",
  se: "sw",
  sw: "se"
};

var flipY = {
  n: "s",
  s: "n",
  nw: "sw",
  ne: "se",
  se: "ne",
  sw: "nw"
};

var signsX = {
  overlay: +1,
  selection: +1,
  n: null,
  e: +1,
  s: null,
  w: -1,
  nw: -1,
  ne: +1,
  se: +1,
  sw: -1
};

var signsY = {
  overlay: +1,
  selection: +1,
  n: -1,
  e: null,
  s: +1,
  w: null,
  nw: -1,
  ne: -1,
  se: +1,
  sw: +1
};

function type(t) {
  return {type: t};
}

// Ignore right-click, since that should open the context menu.
function defaultFilter() {
  return !event.button;
}

function defaultExtent() {
  var svg = this.ownerSVGElement || this;
  return [[0, 0], [svg.width.baseVal.value, svg.height.baseVal.value]];
}

// Like d3.local, but with the name “__brush” rather than auto-generated.
function local$1(node) {
  while (!node.__brush) if (!(node = node.parentNode)) return;
  return node.__brush;
}

function empty$1(extent) {
  return extent[0][0] === extent[1][0]
      || extent[0][1] === extent[1][1];
}







var brush = function() {
  return brush$1(XY);
};

function brush$1(dim) {
  var extent = defaultExtent,
      filter = defaultFilter,
      listeners = dispatch(brush, "start", "brush", "end"),
      handleSize = 6,
      touchending;

  function brush(group) {
    var overlay = group
        .property("__brush", initialize)
      .selectAll(".overlay")
      .data([type("overlay")]);

    overlay.enter().append("rect")
        .attr("class", "overlay")
        .attr("pointer-events", "all")
        .attr("cursor", cursors.overlay)
      .merge(overlay)
        .each(function() {
          var extent = local$1(this).extent;
          select(this)
              .attr("x", extent[0][0])
              .attr("y", extent[0][1])
              .attr("width", extent[1][0] - extent[0][0])
              .attr("height", extent[1][1] - extent[0][1]);
        });

    group.selectAll(".selection")
      .data([type("selection")])
      .enter().append("rect")
        .attr("class", "selection")
        .attr("cursor", cursors.selection)
        .attr("fill", "#777")
        .attr("fill-opacity", 0.3)
        .attr("stroke", "#fff")
        .attr("shape-rendering", "crispEdges");

    var handle = group.selectAll(".handle")
      .data(dim.handles, function(d) { return d.type; });

    handle.exit().remove();

    handle.enter().append("rect")
        .attr("class", function(d) { return "handle handle--" + d.type; })
        .attr("cursor", function(d) { return cursors[d.type]; });

    group
        .each(redraw)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)")
        .on("mousedown.brush touchstart.brush", started);
  }

  brush.move = function(group, selection) {
    if (group.selection) {
      group
          .on("start.brush", function() { emitter(this, arguments).beforestart().start(); })
          .on("interrupt.brush end.brush", function() { emitter(this, arguments).end(); })
          .tween("brush", function() {
            var that = this,
                state = that.__brush,
                emit = emitter(that, arguments),
                selection0 = state.selection,
                selection1 = dim.input(typeof selection === "function" ? selection.apply(this, arguments) : selection, state.extent),
                i = interpolate(selection0, selection1);

            function tween(t) {
              state.selection = t === 1 && empty$1(selection1) ? null : i(t);
              redraw.call(that);
              emit.brush();
            }

            return selection0 && selection1 ? tween : tween(1);
          });
    } else {
      group
          .each(function() {
            var that = this,
                args = arguments,
                state = that.__brush,
                selection1 = dim.input(typeof selection === "function" ? selection.apply(that, args) : selection, state.extent),
                emit = emitter(that, args).beforestart();

            interrupt(that);
            state.selection = selection1 == null || empty$1(selection1) ? null : selection1;
            redraw.call(that);
            emit.start().brush().end();
          });
    }
  };

  function redraw() {
    var group = select(this),
        selection = local$1(this).selection;

    if (selection) {
      group.selectAll(".selection")
          .style("display", null)
          .attr("x", selection[0][0])
          .attr("y", selection[0][1])
          .attr("width", selection[1][0] - selection[0][0])
          .attr("height", selection[1][1] - selection[0][1]);

      group.selectAll(".handle")
          .style("display", null)
          .attr("x", function(d) { return d.type[d.type.length - 1] === "e" ? selection[1][0] - handleSize / 2 : selection[0][0] - handleSize / 2; })
          .attr("y", function(d) { return d.type[0] === "s" ? selection[1][1] - handleSize / 2 : selection[0][1] - handleSize / 2; })
          .attr("width", function(d) { return d.type === "n" || d.type === "s" ? selection[1][0] - selection[0][0] + handleSize : handleSize; })
          .attr("height", function(d) { return d.type === "e" || d.type === "w" ? selection[1][1] - selection[0][1] + handleSize : handleSize; });
    }

    else {
      group.selectAll(".selection,.handle")
          .style("display", "none")
          .attr("x", null)
          .attr("y", null)
          .attr("width", null)
          .attr("height", null);
    }
  }

  function emitter(that, args) {
    return that.__brush.emitter || new Emitter(that, args);
  }

  function Emitter(that, args) {
    this.that = that;
    this.args = args;
    this.state = that.__brush;
    this.active = 0;
  }

  Emitter.prototype = {
    beforestart: function() {
      if (++this.active === 1) this.state.emitter = this, this.starting = true;
      return this;
    },
    start: function() {
      if (this.starting) this.starting = false, this.emit("start");
      return this;
    },
    brush: function() {
      this.emit("brush");
      return this;
    },
    end: function() {
      if (--this.active === 0) delete this.state.emitter, this.emit("end");
      return this;
    },
    emit: function(type) {
      customEvent(new BrushEvent(brush, type, dim.output(this.state.selection)), listeners.apply, listeners, [type, this.that, this.args]);
    }
  };

  function started() {
    if (event.touches) { if (event.changedTouches.length < event.touches.length) return noevent$1(); }
    else if (touchending) return;
    if (!filter.apply(this, arguments)) return;

    var that = this,
        type = event.target.__data__.type,
        mode = (event.metaKey ? type = "overlay" : type) === "selection" ? MODE_DRAG : (event.altKey ? MODE_CENTER : MODE_HANDLE),
        signX = dim === Y ? null : signsX[type],
        signY = dim === X ? null : signsY[type],
        state = local$1(that),
        extent = state.extent,
        selection = state.selection,
        W = extent[0][0], w0, w1,
        N = extent[0][1], n0, n1,
        E = extent[1][0], e0, e1,
        S = extent[1][1], s0, s1,
        dx,
        dy,
        moving,
        shifting = signX && signY && event.shiftKey,
        lockX,
        lockY,
        point0 = mouse(that),
        point = point0,
        emit = emitter(that, arguments).beforestart();

    if (type === "overlay") {
      state.selection = selection = [
        [w0 = dim === Y ? W : point0[0], n0 = dim === X ? N : point0[1]],
        [e0 = dim === Y ? E : w0, s0 = dim === X ? S : n0]
      ];
    } else {
      w0 = selection[0][0];
      n0 = selection[0][1];
      e0 = selection[1][0];
      s0 = selection[1][1];
    }

    w1 = w0;
    n1 = n0;
    e1 = e0;
    s1 = s0;

    var group = select(that)
        .attr("pointer-events", "none");

    var overlay = group.selectAll(".overlay")
        .attr("cursor", cursors[type]);

    if (event.touches) {
      group
          .on("touchmove.brush", moved, true)
          .on("touchend.brush touchcancel.brush", ended, true);
    } else {
      var view = select(event.view)
          .on("keydown.brush", keydowned, true)
          .on("keyup.brush", keyupped, true)
          .on("mousemove.brush", moved, true)
          .on("mouseup.brush", ended, true);

      nodrag(event.view);
    }

    nopropagation$1();
    interrupt(that);
    redraw.call(that);
    emit.start();

    function moved() {
      var point1 = mouse(that);
      if (shifting && !lockX && !lockY) {
        if (Math.abs(point1[0] - point[0]) > Math.abs(point1[1] - point[1])) lockY = true;
        else lockX = true;
      }
      point = point1;
      moving = true;
      noevent$1();
      move();
    }

    function move() {
      var t;

      dx = point[0] - point0[0];
      dy = point[1] - point0[1];

      switch (mode) {
        case MODE_SPACE:
        case MODE_DRAG: {
          if (signX) dx = Math.max(W - w0, Math.min(E - e0, dx)), w1 = w0 + dx, e1 = e0 + dx;
          if (signY) dy = Math.max(N - n0, Math.min(S - s0, dy)), n1 = n0 + dy, s1 = s0 + dy;
          break;
        }
        case MODE_HANDLE: {
          if (signX < 0) dx = Math.max(W - w0, Math.min(E - w0, dx)), w1 = w0 + dx, e1 = e0;
          else if (signX > 0) dx = Math.max(W - e0, Math.min(E - e0, dx)), w1 = w0, e1 = e0 + dx;
          if (signY < 0) dy = Math.max(N - n0, Math.min(S - n0, dy)), n1 = n0 + dy, s1 = s0;
          else if (signY > 0) dy = Math.max(N - s0, Math.min(S - s0, dy)), n1 = n0, s1 = s0 + dy;
          break;
        }
        case MODE_CENTER: {
          if (signX) w1 = Math.max(W, Math.min(E, w0 - dx * signX)), e1 = Math.max(W, Math.min(E, e0 + dx * signX));
          if (signY) n1 = Math.max(N, Math.min(S, n0 - dy * signY)), s1 = Math.max(N, Math.min(S, s0 + dy * signY));
          break;
        }
      }

      if (e1 < w1) {
        signX *= -1;
        t = w0, w0 = e0, e0 = t;
        t = w1, w1 = e1, e1 = t;
        if (type in flipX) overlay.attr("cursor", cursors[type = flipX[type]]);
      }

      if (s1 < n1) {
        signY *= -1;
        t = n0, n0 = s0, s0 = t;
        t = n1, n1 = s1, s1 = t;
        if (type in flipY) overlay.attr("cursor", cursors[type = flipY[type]]);
      }

      if (state.selection) selection = state.selection; // May be set by brush.move!
      if (lockX) w1 = selection[0][0], e1 = selection[1][0];
      if (lockY) n1 = selection[0][1], s1 = selection[1][1];

      if (selection[0][0] !== w1
          || selection[0][1] !== n1
          || selection[1][0] !== e1
          || selection[1][1] !== s1) {
        state.selection = [[w1, n1], [e1, s1]];
        redraw.call(that);
        emit.brush();
      }
    }

    function ended() {
      nopropagation$1();
      if (event.touches) {
        if (event.touches.length) return;
        if (touchending) clearTimeout(touchending);
        touchending = setTimeout(function() { touchending = null; }, 500); // Ghost clicks are delayed!
        group.on("touchmove.brush touchend.brush touchcancel.brush", null);
      } else {
        yesdrag(event.view, moving);
        view.on("keydown.brush keyup.brush mousemove.brush mouseup.brush", null);
      }
      group.attr("pointer-events", "all");
      overlay.attr("cursor", cursors.overlay);
      if (state.selection) selection = state.selection; // May be set by brush.move (on start)!
      if (empty$1(selection)) state.selection = null, redraw.call(that);
      emit.end();
    }

    function keydowned() {
      switch (event.keyCode) {
        case 16: { // SHIFT
          shifting = signX && signY;
          break;
        }
        case 18: { // ALT
          if (mode === MODE_HANDLE) {
            if (signX) e0 = e1 - dx * signX, w0 = w1 + dx * signX;
            if (signY) s0 = s1 - dy * signY, n0 = n1 + dy * signY;
            mode = MODE_CENTER;
            move();
          }
          break;
        }
        case 32: { // SPACE; takes priority over ALT
          if (mode === MODE_HANDLE || mode === MODE_CENTER) {
            if (signX < 0) e0 = e1 - dx; else if (signX > 0) w0 = w1 - dx;
            if (signY < 0) s0 = s1 - dy; else if (signY > 0) n0 = n1 - dy;
            mode = MODE_SPACE;
            overlay.attr("cursor", cursors.selection);
            move();
          }
          break;
        }
        default: return;
      }
      noevent$1();
    }

    function keyupped() {
      switch (event.keyCode) {
        case 16: { // SHIFT
          if (shifting) {
            lockX = lockY = shifting = false;
            move();
          }
          break;
        }
        case 18: { // ALT
          if (mode === MODE_CENTER) {
            if (signX < 0) e0 = e1; else if (signX > 0) w0 = w1;
            if (signY < 0) s0 = s1; else if (signY > 0) n0 = n1;
            mode = MODE_HANDLE;
            move();
          }
          break;
        }
        case 32: { // SPACE
          if (mode === MODE_SPACE) {
            if (event.altKey) {
              if (signX) e0 = e1 - dx * signX, w0 = w1 + dx * signX;
              if (signY) s0 = s1 - dy * signY, n0 = n1 + dy * signY;
              mode = MODE_CENTER;
            } else {
              if (signX < 0) e0 = e1; else if (signX > 0) w0 = w1;
              if (signY < 0) s0 = s1; else if (signY > 0) n0 = n1;
              mode = MODE_HANDLE;
            }
            overlay.attr("cursor", cursors[type]);
            move();
          }
          break;
        }
        default: return;
      }
      noevent$1();
    }
  }

  function initialize() {
    var state = this.__brush || {selection: null};
    state.extent = extent.apply(this, arguments);
    state.dim = dim;
    return state;
  }

  brush.extent = function(_) {
    return arguments.length ? (extent = typeof _ === "function" ? _ : constant$6([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), brush) : extent;
  };

  brush.filter = function(_) {
    return arguments.length ? (filter = typeof _ === "function" ? _ : constant$6(!!_), brush) : filter;
  };

  brush.handleSize = function(_) {
    return arguments.length ? (handleSize = +_, brush) : handleSize;
  };

  brush.on = function() {
    var value = listeners.on.apply(listeners, arguments);
    return value === listeners ? brush : value;
  };

  return brush;
}

// reference: https://en.wikipedia.org/wiki/Kernel_(statistics)
// reference: https://en.wikipedia.org/wiki/Kernel_density_estimation
const kernel = {
    epanechnikov: function(u){return Math.abs(u) <= 1? (3/4)*(1-u*u):0},
    gaussian: function(u){return 1/Math.sqrt(2*Math.PI)*Math.exp(-.5*u*u)}
};

// reference: https://github.com/jasondavies/science.js/blob/master/src/stats/bandwidth.js
const kernelBandwidth = {
    // Bandwidth selectors for Gaussian kernels.
    nrd: function(x) {
        let iqr = quantile(x, 0.75) - quantile(x, 0.25);
        let h = iqr / 1.34;
        return 1.06 * Math.min(deviation(x), h) * Math.pow(x.length, -1/5);
    }
};

/**
 *
 * @param kernel: the kernel function, such as gaussian
 * @param X: list of bins
 * @param h: the bandwidth, either a numerical value given by the user or calculated using the function kernelBandwidth
 * @returns {Function}: the kernel density estimator
 */
function kernelDensityEstimator(kernel, X, h){
    return function(V) {
        // X is the bins
        return X.map((x) => [x, mean(V, (v) => kernel((x-v)/h))/h]);
    }
}

class Tooltip {
    constructor(id, verbose=false, offsetX=30, offsetY=-40, duration=100){
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
     * Create a download button
     * @param id {String} the button dom ID
     * @param svgId {String} the SVG dom ID to grab and download
     * @param outfileName {String} the download file name
     * @param cloneId {String} the cloned SVG dom ID
     * @param icon {String} a fontawesome's icon class name
     */
    createDownloadButton(id, svgId, outfileName, cloneId, icon='fa-download'){
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
     */
    downloadSvg(svgId, fileName, cloneId){
        // let svgObj = $($($(`${"#" +svgId} svg`))[0]); // complicated jQuery to get to the SVG object
        let svgObj = $($($(`${"#" +svgId}`))[0]);
        var $svgCopy = svgObj.clone()
        .attr("version", "1.1")
        .attr("xmlns", "http://www.w3.org/2000/svg");

        // parse and add all the CSS styling used by the SVG
        var styles = parseCssStyles(svgObj.get());
        $svgCopy.prepend(styles);

        $("#" + cloneId).html('').hide(); // make sure the copyID is invisible
        var svgHtml = $(`#${cloneId}`).append($svgCopy).html();

        var svgBlob = new Blob([svgHtml], {type: "image/svg+xml"});
        saveAs(svgBlob, fileName);

        // clear the temp download div
        $(`#${cloneId}`).html('').hide();
    }
}

/*
Input data structure: a list of data object with the following structure:
[
    {
        group: "group1"
        label: "dataset 1",
        values: [a list of numerical values]
     },
     {
        group: "group1"
        label: "dataset 2",
        values: [a list of numerical values]
     },
     {
        group: "group2"
        label: "dataset 3",
        values: [a list of numerical values]
     }
]
*/

class GroupedViolin {
    /**
     * constructor for GroupedViolin
     * @param data {List}: a list of objects with attributes: group: {String}, label: {String}, values: {List} of numerical values, size: integer, optional
     * @param groupInfo {Dictionary}: metadata of the group, indexed by group ID
     */
    constructor(data, groupInfo = {}){
        this._sanityCheck(data);
        this.data = data;
        this.groupInfo = groupInfo;
        this.toolbar = undefined;
        this.tooltip = undefined;
    }

    /**
     *
     * @param dom {DOM} the SVG dom object to append the violin plot to
     * @param width {Float}
     * @param height {Float}
     * @param xPadding {Float} padding of the x axis
     * @param xDomain {List} the order of X groups
     * @param yDomain  {List} the min and max values of the y domain
     * @param yLabel {String}
     * @param showX
     * @param showSubX
     * @param subXAngle
     * @param showWhisker
     * @param showDivider
     * @param showLegend
     * @param showSize
     */

    render(dom, width=500, height=357, xPadding=0.05, xDomain=undefined, yDomain=[-3,3], yLabel="Y axis",
           showX=true, showSubX=true, subXAngle=0,
           showWhisker=false, showDivider=false, showLegend=false, showSize=false){

        // define the reset for this plot
        this.reset = () => {
            dom.selectAll("*").remove();
            this.render(dom, width, height, xPadding, xDomain, yDomain, yLabel, showX, showSubX, subXAngle, showWhisker, showDivider, showLegend);
        };


        // defines the X, subX, Y, Z scales
        if (yDomain===undefined || 0 == yDomain.length){
            let allV = [];
            this.data.forEach((d) => allV = allV.concat(d.values));
            yDomain = extent(allV);
        }

        // re-organized this.data indexed by groups
        this.groups = nest()
            .key((d) => d.group)
            .entries(this.data);

        this.scale = {
            x: band()
                .rangeRound([0, width])
                .domain(xDomain||this.groups.map((d) => d.key))
                .paddingInner(xPadding),
            subx: band(),
            y: linear()
                .rangeRound([height, 0])
                .domain(yDomain),
            z: linear() // this is the violin width, the domain and range are determined later individually for each violin
        };

        // for each group
        this.groups.forEach((g) => {
            let group = g.key;
            let entries = g.values;
            let info = this.groupInfo[group]; // optional
            g.index = this.scale.x.domain().indexOf(group);

            if (info !== undefined){
                 // renders group info such as p-value, group name
                const groupInfoDom = dom.append("g");
                const groupLabels = groupInfoDom.selectAll(".violin-group-label")
                    .data(['pvalue']);
                groupLabels.enter().append("text") // Code review: consider moving this part to the eQTL dashboard
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("class", "violin-group-label")
                    .attr("fill", (d) => {
                        // console.log(info['pvalueThreshold']);
                        return d=='pvalue'&&parseFloat(info[d])<=parseFloat(info['pvalueThreshold'])?"orangered":"SlateGray"
                    })
                    .attr("transform", (d, i) => {
                        let x = this.scale.x(group) + this.scale.x.bandwidth()/2;
                        let y = this.scale.y(yDomain[0]) + 50; // todo: avoid hard-coded values
                        return `translate(${x}, ${y})`
                    })
                    .text((d) => `${d}: ${parseFloat(parseFloat(info[d]).toPrecision(3)).toExponential()}`);
            }

            // defines the this.scale.subx based on this.scale.x
            this.scale.subx
                .domain(entries.map((d) => d.label))
                .rangeRound([this.scale.x(group), this.scale.x(group) + this.scale.x.bandwidth()]);

            entries.forEach((entry) => {

                if (0 == entry.values.length) return; // no further rendering if this group has no entries
                entry.values = entry.values.sort(ascending$1);
                this._drawViolin(dom, entry, showWhisker, g.index);
            });

            // adds the sub-x axis if there are more than one entries
            var buffer = 15;
            if (showSize){
                 const sizeScale = band()
                    .domain(entries.map((d) => {return d.size==undefined?'(0)':`(${d.size||0})`}))
                    .rangeRound([this.scale.x(group), this.scale.x(group) + this.scale.x.bandwidth()]);
                 const sizexG = dom.append("g")
                     .attr("class", "violin-size-axis")
                     .attr("transform", `translate(0, ${height + buffer})`)
                     .call(axisBottom(sizeScale));
            }

            if (showSubX) {
                var buffer = 5;
                const subxG = dom.append("g")
                    .attr("class", "violin-sub-axis")
                    .attr("transform", `translate(0, ${height + buffer})`)
                    .call(axisBottom(this.scale.subx));

                if (subXAngle > 0) {
                    subxG.selectAll("text")
                        .style("text-anchor", "start")
                        .attr("transform", `rotate(${subXAngle}, 2, 10)`);
                }
            }


        });

        // renders the x axis
        let buffer = showSubX?55:0; // Code review: hard-coded values
        this.xAxis = showX?axisBottom(this.scale.x):axisBottom(this.scale.x).tickFormat("");
        dom.append("g")
            .attr("class", "violin-x-axis axis--x")
            .attr("transform", `translate(0, ${height + buffer})`)
            .call(this.xAxis) // set tickFormat("") to show tick marks without text labels
            .selectAll("text")
            .style("text-anchor", "start")
            .attr("transform", "rotate(30, -10, 10)");

        // adds the y Axis
        buffer = 5;
        this.yAxis = axisLeft(this.scale.y)
                    .tickValues(this.scale.y.ticks(5));
        dom.append("g")
            .attr("class", "violin-y-axis axis--y")
            .attr("transform", `translate(-${buffer}, 0)`)
            .call(this.yAxis);

        // adds the text label for the y axis
        dom.append("text")
            .attr("y", -20) // todo: avoid hard-coded value
            .attr("x", -40)
            .attr("class", "violin-axis-label")
            .attr("text-anchor", "start")
            .text(yLabel);

        // plot mouse events
        dom.on("mouseout", ()=>{
            if(this.tooltip !== undefined) this.tooltip.hide();
        });

        // add group dividers
        if(showDivider){
            this._addGroupDivider(dom);
        }

        // add color legend
        if (showLegend) {
            const legendG = dom.append("g")
                .attr("transform", `translate(0, 0)`);

            legendG.append("rect")
                .attr("x", 50 + this.scale.x.range()[0]-5)
                .attr("y", -35)
                .attr("width", 70*(this.groups[0].values.length + 1))
                .attr("height", 24)
                .style("fill", "none")
                .style("stroke", "silver");

            const legends = legendG.selectAll(".violin-legend").data(this.groups[0].values);


            const g = legends.enter().append("g").classed("violin-legend", true);
            const w = 10;
            g.append("rect")
                .attr("x", (d, i) => 70*(i + 1)  + this.scale.x.range()[0])
                .attr("y", -28)
                .attr("width", w)
                .attr("height", w)
                .style("fill", (d) => d.color);

            g.append("text")
                .attr("class", "violin-legend-text")
                .text((d) => d.label)
                .attr("x", (d, i) => 15 + 70*(i + 1) + this.scale.x.range()[0])
                .attr("y", -20);
        }

    }

    /**
     * Create the tooltip object
     * @param domId {String} the tooltip's dom ID
     * @returns {Tooltip}
     */
    createTooltip(domId){
        this.tooltip = new Tooltip(domId);
        select(`#${domId}`).classed('violin-tooltip', true);
        return this.tooltip;
    }

    /**
     * Create the toolbar panel
     * @param domId {String} the toolbar's dom ID
     * @param tooltip {Tooltip}
     * @returns {Toolbar}
     */

    createToolbar(domId, tooltip){
        // if (tooltip === undefined) tooltip = this.createTooltip(domId);
        this.toolbar = new Toolbar(domId, tooltip);
        return this.toolbar;
    }

    /**
     * Add a brush to the plot
     * @param dom {D3} Dom element
     */
    addBrush(dom){
        const theBrush = brush();
        theBrush.on("end", ()=>{this.zoom(dom, theBrush);});
        dom.append("g")
            .attr("class", "brush")
            .call(theBrush);
    }

    zoom(dom, theBrush){
        let s = event.selection,
            idelTimeout,
            idelDelay = 350;
        if (theBrush === undefined){
            this.reset();
        }
        else if (!s) {
            if (!idelTimeout) return idelTimeout = setTimeout(function () {
                idelTimeout = null;
            }, idelDelay);
            this.reset();

        }
        else {
            // reset the current scales' domains based on the brushed window
            this.scale.x.domain(this.scale.x.domain().filter((d, i)=>{
                  const lowBound = Math.floor(s[0][0]/this.scale.x.bandwidth());
                  const upperBound = Math.floor(s[1][0]/this.scale.x.bandwidth());
                  return i >= lowBound && i <=upperBound;
            })); // TODO: add comments

            const min = Math.floor(this.scale.y.invert(s[1][1]));
            const max = Math.floor(this.scale.y.invert(s[0][1]));
            this.scale.y.domain([min, max]); // todo: debug

            dom.select(".brush").call(theBrush.move, null);
        }


         // zoom
        let t = dom.transition().duration(750);
        dom.select(".axis--x").transition(t).call(this.xAxis);
        dom.select(".axis--y").transition(t).call(this.yAxis);

        this.groups.forEach((gg, i)=> {
            let group = gg.key;
            let entries = gg.values;

            // re-define the subx's range
            this.scale.subx
                .rangeRound([this.scale.x(group), this.scale.x(group) + this.scale.x.bandwidth()]);

            entries.forEach((entry) => {
                if (0 == entry.values.length) return; // no further rendering if this group has no entries
                const gIndex = this.scale.x.domain().indexOf(group);


                // re-define the scale.z's range
                this.scale.z
                    .range([this.scale.subx(entry.label), this.scale.subx(entry.label) + this.scale.subx.bandwidth()]);

                // re-render the violin
                const g = dom.select(`#violin${gg.index}-${entry.label}`);
                g.select(".violin")
                    .transition(t)
                    .attr("d", area()
                        .x0((d) => this.scale.z(d[1]))
                        .x1((d) => this.scale.z(-d[1]))
                        .y((d) => this.scale.y(d[0]))
                    );


                // re-render the box plot
                // interquartile range
                const q1 = quantile(entry.values, 0.25);
                const q3 = quantile(entry.values, 0.75);
                const z = 0.1;
                g.select(".violin-ir")
                    .transition(t)
                    .attr("x", this.scale.z(-z))
                    .attr("y", this.scale.y(q3))
                    .attr("width", Math.abs(this.scale.z(-z) - this.scale.z(z)))
                    .attr("height", Math.abs(this.scale.y(q3) - this.scale.y(q1)));

                // the median line
                const med = median(entry.values);
                g.select(".violin-median")
                    .transition(t)
                    .attr("x1", this.scale.z(-z))
                    .attr("x2", this.scale.z(z))
                    .attr("y1", this.scale.y(med))
                    .attr("y2", this.scale.y(med));
            });
        });

    }

    /**
     * render the violin and box plots
     * @param dom {D3 DOM}
     * @param entry {Object} with attrs: values, label
     * @param showWhisker {Boolean}
     * @private
     */
    _drawViolin(dom, entry, showWhisker, gIndex){

        // generate the vertices for the violin path use a kde
        let kde = kernelDensityEstimator(
            kernel.gaussian,
            this.scale.y.ticks(100), // use up to 100 vertices along the Y axis (to create the violin path)
            kernelBandwidth.nrd(entry.values) // estimate the bandwidth based on the data
        );
        const eDomain = extent(entry.values); // get the max and min in entry.values
        const vertices = kde(entry.values).filter((d)=>d[0]>eDomain[0]&&d[0]<eDomain[1]); // filter the vertices that aren't in the entry.values

        // define the z scale -- the violin width
        let zMax = max(vertices, (d)=>Math.abs(d[1])); // find the abs(value) in entry.values
        this.scale.z
            .domain([-zMax, zMax])
            .range([this.scale.subx(entry.label), this.scale.subx(entry.label) + this.scale.subx.bandwidth()]);

        // visual rendering
        const violinG = dom.append("g")
            .attr('id', `violin${gIndex}-${entry.label}`);

        let violin = area()
            .x0((d) => this.scale.z(d[1]))
            .x1((d) => this.scale.z(-d[1]))
            .y((d) => this.scale.y(d[0]));

        const vPath = violinG.append("path")
            .datum(vertices)
            .attr("d", violin)
            .classed("violin", true)
            .style("fill", ()=>{
                if (entry.color !== undefined) return entry.color;
                // alternate the odd and even colors, maybe we don't want this feature
                if(gIndex%2 == 0) return "#90c1c1";
                return "#94a8b8";
            });

        // boxplot
        const q1 = quantile(entry.values, 0.25);
        const q3 = quantile(entry.values, 0.75);
        const z = this.scale.z.domain()[1]/3;

        if(showWhisker){
            // the upper and lower limits of entry.values
            const iqr = Math.abs(q3-q1);
            const upper = max(entry.values.filter((d)=>d<q3+(iqr*1.5)));
            const lower = min(entry.values.filter((d)=>d>q1-(iqr*1.5)));
            dom.append("line")
                .classed("whisker", true)
                .attr("x1", this.scale.z(0))
                .attr("x2", this.scale.z(0))
                .attr("y1", this.scale.y(upper))
                .attr("y2", this.scale.y(lower))
                .style("stroke", "#fff");
        }

        // interquartile range
        violinG.append("rect")
            .attr("x", this.scale.z(-z))
            .attr("y", this.scale.y(q3))
            .attr("width", Math.abs(this.scale.z(-z)-this.scale.z(z)))
            .attr("height", Math.abs(this.scale.y(q3) - this.scale.y(q1)))
            .attr("class", "violin-ir");

        // median
        const med = median(entry.values);
        violinG.append("line") // the median line
            .attr("x1", this.scale.z(-z))
            .attr("x2", this.scale.z(z))
            .attr("y1", this.scale.y(med))
            .attr("y2", this.scale.y(med))
            .attr("class", "violin-median");

        // mouse events
        violinG.on("mouseover", ()=>{
            vPath.classed("highlighted", true);
            // console.log(entry);
            if(this.tooltip === undefined) console.warn("GroupViolin Warning: tooltip not defined");
            else {
                this.tooltip.show(
                    entry.group + "<br/>" +
                    entry.label + "<br/>" +
                    "Median: " + med.toPrecision(4) + "<br/>");
            }
        });
        violinG.on("mouseout", ()=>{
            vPath.classed("highlighted", false);
        });
    }

    _sanityCheck(data){
        const attr = ["group", "label", "values"];

        data.forEach((d) => {
            attr.forEach((a) => {
                if (d[a] === undefined) throw "GroupedViolin: input data error."
            });
            // if (0 == d.values.length) throw "Violin: Input data error";
        });
    }

    _addGroupDivider(dom){
        const groups = this.scale.x.domain();
        const padding = Math.abs(this.scale.x(this.scale.x.domain()[1]) - this.scale.x(this.scale.x.domain()[0]) - this.scale.x.bandwidth());

        const getX = (g, i)=> {
            if (i !== groups.length - 1) {
                return this.scale.x(g) + +this.scale.x.bandwidth() + (padding/2)
            }
            else {
                return 0;
            }
        };

        dom.selectAll(".vline").data(groups)
            .enter()
            .append("line")
            .classed("vline", true)
            .attr("x1", getX)
            .attr("x2", getX)
            .attr("y1", this.scale.y.range()[0])
            .attr("y2", this.scale.y.range()[1])
            .style("stroke-width", (g, i)=>i!=groups.length-1?1:0)
            .style("stroke", "rgb(86,98,107)")
            .style("opacity", 0.5);

    }


}

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

        medExpById: host + 'expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&page_size=10000&gencodeId=',

        sample: 'data/gtex.Sample.csv',
        snp: host + 'reference/snp?reference=current&format=json&snpId=',

        tissue:  host + 'dataset/tissueInfo',
        tissueSites: host + 'dataset/tissueSiteDetail?format=json',

        topInTissueFiltered: host + 'expression/topExpressedGenes?datasetId=gtex_v7&filterMtGene=true&sort_by=median&sortDirection=desc&page_size=50&tissueId=',
        topInTissue: host + 'expression/topExpressedGenes?datasetId=gtex_v7&sort_by=median&sortDirection=desc&page_size=50&tissueId=',

        variantId: host + 'reference/snp?format=json&reference=current&release=v7&variantId=',

        // local static files
        rnaseqCram: 'data/rnaseq_cram_files_v7_dbGaP_011516.txt',
        wgsCram: 'data/wgs_cram_files_v7_hg38_dbGaP_011516.txt',

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


/**
 * Parse the tissue groups
 * @param data {Json}
 * @param forEqtl {Boolean}
 * @returns {Dictionary} of lists of tissues indexed by the tissue group name
 */
function parseTissueSites(data, forEqtl=false){
    // the list of invalide eqtl tissues due to sample size < 70
    // a hard-coded list because the sample size is not easy to retrieve
    const invalidTissues = ['Bladder', 'Cervix_Ectocervix', 'Cervix_Endocervix', 'Fallopian_Tube', 'Kidney_Cortex'];

    const attr = 'tissueSiteDetail';
    if(!data.hasOwnProperty(attr)) throw 'Fatal Error: parseTissueSites input error.';
    const tissues = forEqtl==false?data[attr]:data[attr].filter((d)=>{return !invalidTissues.includes(d.tissue_site_detail_id)}); // an array of tissue_site_detail objects

    // build the tissueGroups lookup dictionary indexed by the tissue group name (i.e. the tissue main site name)
    ['tissue_site', 'tissue_site_detail_id', 'tissue_site_detail'].forEach((d)=>{
        if (!tissues[0].hasOwnProperty(d)) throw `parseTissueSites attr error. ${d} is not found`;
    });
    let tissueGroups = tissues.reduce((arr, d)=>{
        let groupName = d.tissue_site;
        let site = {
            id: d.tissue_site_detail_id,
            name: d.tissue_site_detail
        };
        if (!arr.hasOwnProperty(groupName)) arr[groupName] = []; // initiate an array
        arr[groupName].push(site);
        return arr;
    }, {});

    // modify the tissue groups that have only a single site
    // by replacing the group's name with the single site's name -- for a better Alphabetical order of the tissue groups

    Object.keys(tissueGroups).forEach((d)=>{
        if (tissueGroups[d].length == 1){ // a single-site group
            let site = tissueGroups[d][0]; // the single site
            delete tissueGroups[d]; // remove the old group in the dictionary
            tissueGroups[site.name] = [site]; // create a new group with the site's name
        }
    });

    return tissueGroups;

}



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

"use strict";
/**
 * Create the tissue (dataset) dropdown menu using select2
 * @param domId {String} the dom ID of the menu
 * @param url {String} the tissue web service url
 * dependency: select2
 */


/**
 * Build the two-level checkbox-style tissue menu
 * dependencies: eqtlDashboard.css classes // todo: move related css somewhere else
 * @param groups {Dictionary} of lists of tissues indexed by the group name, this is created by gtexDataParser:parseTissueSites()
 * @param domId {String} <div> ID
 * Dependencies: jQuery, Bootstrap, eqtlDashboard.css
 * todo: add reset and select all options
 */
function createTissueGroupMenu(groups, domId){
    const mainClass="ed-tissue-main-level";
    const subClass = "ed-tissue-sub-level";
    const lastSiteClass = "last-site";

    // erase everything in domId in case it isn't empty
    select(`#${domId}`).selectAll("*").remove();

    // sort the tissue groups alphabetically
    let groupNames = Object.keys(groups).sort();

    // create four <div> sections for the tissue menu
    // TODO: find a better way to organize tissues into sections
    const $sections = range(0,4).map((d)=>{
        return $(`<div id="section${d}" class="col-xs-12 col-md-3">`).appendTo($(`#${domId}`));
    });

    groupNames.forEach(function(gname){
        let sites = groups[gname]; // a list of site objects with attr: name and id
        const gId = gname.replace(/ /g, "_"); // replace the spaces with dashes to create a group <DOM> id
        // figure out which dom section to append this tissue site
        let $currentDom = $sections[3];
        if("Brain" == gname) $currentDom = $sections[0];
        else if (gname.match(/^[A-D]/)) $currentDom = $sections[1];
        else if (gname.match(/^[E-P]/)) $currentDom = $sections[2];

        // create the <label> for the tissue group
        $(`<label class=${mainClass}>`+
            `<input type="checkbox" id="${gId}" class="tissueGroup"> ` +
            '<span class="checkmark"></span>' +
            `<span>${gname}</span>` +
            '</label><br/>').appendTo($currentDom);

        // tissue sites in the group
        if (sites.length > 1){
             // sort sites alphabetically
            sites.sort((a, b)=>{
                if (a.id > b.id) return 1;
                if (a.id < b.id) return -1;
                return 0;
            })
            .forEach(function(site, i){
                let $siteDom = $(`<label class=${subClass}>`+
                                `<input type="checkbox" id="${site.id}"> ` +
                                '<span class="checkmark"></span>' +
                                `<span>${site.name}</span>` +
                                '</label><br/>').appendTo($currentDom);
                if (i == sites.length -1) $siteDom.addClass(lastSiteClass);
            });
        }

        // custom click event for the top-level tissues: toggle the check boxes
        $("#" + gId).click(function(){
            if ($('#' + gId).is(":checked")) {
                // when the group is checked, check all its tissues
                sites.forEach(function (site) {
                    if ("id" == site.id) return;
                    $('#' + site.id).attr('checked', true);
                });
            }
            else {
                // when the group is unchecked, un-check all its tissues
                sites.forEach(function (site) {
                    if ("id" == site.id) return;
                    $('#' + site.id).attr('checked', false);
                });
            }
        });
    });

}

/**
 * Parse the two-level checkbox-style tissue menu
 * @param groups {Dictionary} of lists of tissues indexed by the group name, this is created by gtexDataParser:parseTissueSites()
 * @param domId {String} <div> ID
 * Dependencies: jQuery
 */
function parseTissueGroupMenu(groups, domId){
    let queryTissueIds = [];
    $(`#${domId}`).find(":input").each(function(){ // using jQuery to parse each input item
        if ( $(this).is(":checked")) { // the jQuery way to fetch a checked tissue
            const id = $(this).attr('id');
            if ($(this).hasClass("tissueGroup")){
                // this input item is a tissue group
                // check if this tissue group is a single-site group using the tissueGroups dictionary
                // if so, add the single site to the query list
                let groupName = id.replace(/_/g, " "); // first convert the ID back to group name
                if (groups[groupName].length == 1) {
                    queryTissueIds.push(groups[groupName][0].id);
                }
            }
            else{ // this input item is a tissue site
                queryTissueIds.push(id);
            }
        }
    });
    return queryTissueIds;
}

// import {range} from "d3-array";
/**
 * Build the eQTL Dashboard
 * Initiate the dashboard with a search form.
 * 1. Fetch and organize tissue sites into groups.
 * 2. Build the two-level tissue site menu.
 * 3. Bind the search function to the submit button.
 * ToDo: perhaps the dom elements in the form could be accessed without specifying the dom IDs?
 * @param dashboardId {String}: eQTL result <div> ID
 * @param menuId {String} tissue menu <div> ID
 * @param pairId {String} gene-variant <textarea> ID
 * @param submitId {String} form submit button <div> ID
 * @param formId {String} dashboard <form> ID
 * @param messageBoxId {String} message box <div> ID
 * @param urls {Dictionary} of GTEx web service URLs
 */
function build(dashboardId, menuId, pairId, submitId, formId, messageBoxId, urls=getGtexUrls()){
    json(urls.tissueSites)
        .then(function(data){ // retrieve all tissue (sub)sites
            const forEqtl = true;
            let tissueGroups = parseTissueSites(data, forEqtl);
            createTissueGroupMenu(tissueGroups, menuId);
            $(`#${submitId}`).click(_submit(tissueGroups, dashboardId, menuId, pairId, submitId, formId, messageBoxId, urls));

        })
        .catch(function(err){
            console.error(err);
        });
}

/**
 *
 * @param gene {Object} with attr geneSymbol and gencodeId
 * @param variant {Object} with attr variantId and snpId
 * @param mainId {String} the main DIV id
 * @param input {Object} the violin data
 * @param info {Object} the metadata of the groups
 * @private
 */
function _visualize(gene, variant, mainId, input, info){

    const id = {
        main: mainId,
        tooltip: "eqtlTooltip",
        toolbar: `${mainId}Toolbar`,
        clone: `${mainId}Clone`,
        chart: `${mainId}Chart`,
        svg: `${mainId}Svg`,
        buttons: {
            save: `${mainId}Save`
        }
    };

    // error-checking DOM elements
    if ($(`#${id.main}`).length == 0) throw "Violin Plot Error: the chart DOM doesn't exist";
    if ($(`#${id.tooltip}`).length == 0) $('<div/>').attr("id", id.tooltip).appendTo($('body'));

    // clear previously rendered plot if any
    select(`#${id.main}`).selectAll("*").remove();

    // build the dom elements
    ["toolbar", "chart", "clone"].forEach((d)=>{
        $('<div/>').attr("id", id[d]).appendTo($(`#${id.main}`));
    });

    // violin plot
    // TODO: code review on the layout, remove hard-coded values and customized code in GroupedViolin.js
    let margin = {
        left: 50,
        top: 50,
        right: 50,
        bottom: 100
    };

    let innerWidth = input.length * 40, // set at at least 50 because of the long tissue names
        width = innerWidth + (margin.left + margin.right);
    let innerHeight = 80,
        height = innerHeight + (margin.top + margin.bottom);

    let dom = select(`#${id.chart}`)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", id.svg)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // add violin title

    dom.append("text")
        .classed("ed-section-title", true)
        .text(`${gene.geneSymbol} (${gene.gencodeId}) and ${variant.snpId||""} (${variant.variantId})`)
        .attr("x", 0)
        .attr("y", -margin.top + 16);

    // render the violin
    let violin = new GroupedViolin(input, info);
    const tooltip = violin.createTooltip(id.tooltip);
    const toolbar = violin.createToolbar(id.toolbar, tooltip);
    toolbar.createDownloadButton(id.buttons.save, id.svg, `${id.main}-save.svg`, id.clone);
    violin.render(dom, innerWidth, innerHeight, 0.3, undefined, [], "Normalized Expression", false, true, 0, false, true, false, true);
    _customizeViolinPlot(violin, dom);
}
/**
 * Customization of the violin plot
 * @param plot {GroupedViolin}
 * @param dom {D3 DOM}
 */
function _customizeViolinPlot(plot, dom){
    plot.groups.forEach((g)=>{
        // customize the long tissue name
        const gname = g.key;
        const names = gname.replace(/\(/, " - (").split(/\s*-\s*/);
        const customXlabel = dom.append("g");
        const customLabels = customXlabel.selectAll(".violin-group-label")
            .data(names);
        customLabels.enter().append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("class", "violin-group-label")
            .attr("transform", (d, i) => {
                let x = plot.scale.x(gname) + plot.scale.x.bandwidth()/2;
                let y = plot.scale.y(plot.scale.y.domain()[0]) + 75 + (10*i); // todo: avoid hard-coded values
                return `translate(${x}, ${y})`
            })
            .text((d) => d);
    });

    dom.selectAll(".violin-size-axis").classed("violin-size-axis-hide", true).classed("violin-size-axis", false);

}

/**
 * Define the submit button's action
 * @param tissueGroups {Dictionary} of lists of tissues indexed by tissue groups
 * @param dashboardId {String} eQTL results <div> ID
 * @param menuId {String} tissue menu <div> ID
 * @param pairId {String} gene-variant <textarea> ID
 * @param submitId {String} submit button <div> ID
 * @param messageBoxId {String} message box <div> ID
 * @param urls {Dictionary} of GTEx web service URLs
 * @param max {Integer} max number of gene-variant entries. The default is set to 30.
 * @private
 * Dependencies: jQuery
 */
function _submit(tissueGroups, dashboardId, menuId, pairId, submitId, formId, messageBoxId, urls=_getGTExUrls(), max=30){
    return function(){

        // clear the previous dashboard search results if any
        $(`#${dashboardId}`).html('');

        ////// validate tissue inputs and convert them to tissue IDs //////
        let queryTissueIds = parseTissueGroupMenu(tissueGroups, menuId);
        // let queryTissueIds = [];
        // $(`#${menuId}`).find(":input").each(function(){ // using jQuery to parse each input item
        //     if ( $(this).is(":checked")) { // the jQuery way to fetch a checked tissue
        //         const id = $(this).attr('id');
        //         if ($(this).hasClass("tissueGroup")){
        //             // this input item is a tissue group
        //             // check if this tissue group is a single-site group using the tissueGroups dictionary
        //             // if so, add the single site to the query list
        //             let groupName = id.replace(/_/g, " "); // first convert the ID back to group name
        //             if (tissueGroups[groupName].length == 1) {
        //                 queryTissueIds.push(tissueGroups[groupName][0].id);
        //             }
        //         }
        //         else{ // this input item is a tissue site
        //             queryTissueIds.push(id);
        //         }
        //     }
        // });

        // tissue input error-checking
        if (queryTissueIds.length == 0) {
            alert("Must select at least one tissue.");
            throw "Input error";
        }

        ////// parse the gene-variant input list //////
        let pairs = $(`#${pairId}`).val().split("\n").filter(function(d){return d != ""});
        if (pairs.length == 0) {
            alert("Must input at least one gene-variant pair.");
            throw "Input error";
        }
        else if (pairs.length > max) {
            $(`#${messageBoxId}`).append(`Your input has exceeded the maximum number of allowed entries. Only the first ${max} entries are processed.`);
            console.warn("User input has exceeded the maximum number of allowed entries.");
            pairs = pairs.slice(0, max);
        }

        ////// process each gene-variant pair //////

        // create a tissue name lookup table
        const tissueDict = {};
        Object.keys(tissueGroups).forEach((gname) => {
            tissueGroups[gname].forEach((site) => {
                tissueDict[site.id] = site.name;
            });
        });

        // for each gene-variant pair
        pairs.forEach(function(pair, i){
            pair.replace(/ /g, ""); // remove all spaces
            let vid = pair.split(',')[1],
                gid = pair.split(',')[0];

            // retrieve gene and variant info from the web service
            const geneUrl = urls.geneId + gid;
            const variantUrl = vid.toLowerCase().startsWith('rs')?urls.rsId+vid:urls.variantId+vid;

            Promise.all([json(geneUrl), json(variantUrl)])
                .then(function(args){
                    const gene = _parseGene(args[0], gid);
                    const variant = _parseVariant(args[1]);
                    if (gene === null){
                        const errorMessage = `Input Error: no gene found for ${gid}. <br/>`;
                        $(`#${messageBoxId}`).append(errorMessage);
                        throw errorMessage;
                    }
                    if (variant === null){
                        const errorMessage = `Input Error: no variant found for ${vid} <br/>`;
                        $(`#${messageBoxId}`).append(errorMessage);
                        throw errorMessage;
                    }

                    // calculate eQTLs and display the eQTL violin plots
                    _renderEqtlPlot(tissueDict, dashboardId, gene, variant, queryTissueIds, i);

                    // hide the search form after the eQTL violin plots are reported
                    $(`#${formId}`).removeClass("show"); // for bootstrap 4
                    $(`#${formId}`).removeClass("in"); // for boostrap 3
                    }
                )
                .catch(function(err){
                    console.error(err);
                });
        });
    };
}

/**
 * Parse GTEx gene web service
 * @param gjson
 * @param id {String} the query gene ID
 * @returns {*} a gene object or null if not found
 * @private
 */
function _parseGene(gjson, id){
    const attr = 'geneId';
    if(!gjson.hasOwnProperty(attr)) throw 'Fatal Error: parse gene error';
    let genes = gjson[attr].filter((d) => {return d.geneSymbolUpper == id.toUpperCase() || d.gencodeId == id.toUpperCase()}); // find the exact match
    if (genes.length ==0) return null;
    return genes[0];
}

/**
 * Parse GTEx variant/snp web service
 * @param vjson
 * @returns {*} a variant object or null
 * @private
 */
function _parseVariant(vjson){
    const attr = 'snp';
    if(!vjson.hasOwnProperty(attr)) throw 'Fatal Error: parse variant error';
    const variants = vjson[attr];
    if (variants.length == 0) return null;
    return variants[0];
}

/**
 * calculate the eQTLs and fetch expression of genotypes for each gene-variant pair
 * @param tissuDict {Dictionary} tissue name lookup table, indexed by tissue IDs
 * @param dashboardId {String} the dashboard results <div> ID
 * @param gene {Object} a GTEx gene object
 * @param variant {Object} the GTEx variant object
 * @param tissues {List} of query tissue IDs
 * @param i {Integer} the boxplot DIV's index
 * @private
 */
function _renderEqtlPlot(tissueDict, dashboardId, gene, variant, tissues, i) {
    // display gene-variant pair names
    const id = `violinplot${i}`;
    $(`#${dashboardId}`).append(`<div id="${id}" class="col-sm-12"></div>`);

    // parse the genotypes from the variant ID
    let ref = variant.variantId.split(/_/)[2];
    let alt = variant.variantId.split(/_/)[3];
    const het = ref + alt;
    ref = ref + ref;
    alt = alt + alt;
    // d3-queue https://github.com/d3/d3-queue
    let promises = [];

    // queue up all tissue IDs
    tissues.forEach((tId) => {
        let urlRoot = getGtexUrls()['dyneqtl'];
        let url = `${urlRoot}?snp_id=${variant.variantId}&gene_id=${gene.gencodeId}&tissue=${tId}`; // use variant ID, gencode ID and tissue ID to query the dyneqtl
        promises.push(_apiCall(url, tId));
    });

    Promise.all(promises)
        .then(function(results){
            let input = []; // a list of genotype expression objects
            let info = {};
            results.forEach((d) => {
                if (d.status == "failed"){
                // if eQTLs aren't available for this query, create an empty space for the layout of the report
                let group = tissueDict[d.tissue]; // group refers to the tissue name, map tissue ID to tissue name
                // genotype expression data
                input = input.concat([
                    {
                        group: group,
                        label: ref.length>2?"ref":ref,
                        values: [0]
                    },
                    {
                        group: group,
                        label: het.length>2?"het":het,
                        values: [0]
                    },
                    {
                        group: group,
                        label: alt.length>2?"alt":alt,
                        values: [0]
                    }
                ]);
            }
                else {
                d = _parseEqtl(d); // reformat eQTL results d
                let group = tissueDict[d.tissue]; // group is the tissue name, map tissue ID to tissue name

                input = input.concat([
                    {
                        group: group,
                        label: ref.length>2?"ref":ref,
                        size: d.homoRefExp.length,
                        values: d.homoRefExp
                    },
                    {
                        group: group,
                        label: het.length>2?"het":het,
                        size: d.heteroExp.length,
                        values: d.heteroExp
                    },
                    {
                        group: group,
                        label: alt.length>2?"alt":alt,
                        size: d.homoAltExp.length,
                        values: d.homoAltExp
                    }
                ]);
                // additional info of the group goes here
                info[group] = {
                    "pvalue": d["p-value"]===null?1:parseFloat(d["p-value"]).toPrecision(3),
                    "pvalueThreshold": d["p-value_threshold"]===null?0:parseFloat(d["p-value_threshold"]).toPrecision(3)
                };
            }

            });
            _visualize(gene, variant, id, input, info);
        })
        .catch(function(err){console.error(err);});
}

/**
 * parse GTEx dyneqtl json
 * @param data {JSON} from GTEx dyneqtl web service
 * @returns data {JSON} modified data
 * @private
 */
function _parseEqtl(data){
    data.expression_values = data.expression_values.split(",").map((d)=>parseFloat(d));
    data.genotypes = data.genotypes.split(",").map((d)=>parseFloat(d));

    data.homoRefExp = data.expression_values.filter((d,i) => {
        return data.genotypes[i] == 0
    });
    data.homoAltExp = data.expression_values.filter((d,i) => {
        return data.genotypes[i] == 2
    });
    data.heteroExp = data.expression_values.filter((d,i) => {
        return data.genotypes[i] == 1
    });
    return data;
}

function _apiCall(url, tissue){
    // reference: http://adampaxton.com/handling-multiple-javascript-promises-even-if-some-fail/
    return new Promise(function(resolve, reject){
        json(url)
            .then(function(request) {
                resolve(request);
            })
            .catch(function(err){
                // report the tissue as failed
                const failed = {
                    tissue: tissue,
                    status: "failed"
                };
                resolve(failed);
            });
        })

}

exports.build = build;

return exports;

}({}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXF0bC1kYXNoYm9hcmQuYnVuZGxlLmRldi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvZHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvY3N2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvdHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZldGNoL3NyYy9qc29uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbmFtZXNwYWNlcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL25hbWVzcGFjZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL2NyZWF0b3IuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rvci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zZWxlY3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3RvckFsbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zZWxlY3RBbGwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9tYXRjaGVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2ZpbHRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zcGFyc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZW50ZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9jb25zdGFudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kYXRhLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2V4aXQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbWVyZ2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vb3JkZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc29ydC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jYWxsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL25vZGVzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL25vZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc2l6ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lbXB0eS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lYWNoLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2F0dHIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy93aW5kb3cuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc3R5bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vcHJvcGVydHkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vY2xhc3NlZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi90ZXh0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2h0bWwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vcmFpc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbG93ZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vYXBwZW5kLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2luc2VydC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9yZW1vdmUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vY2xvbmUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZGF0dW0uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZGlzcGF0Y2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zb3VyY2VFdmVudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3BvaW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbW91c2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL2FzY2VuZGluZy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvYmlzZWN0b3IuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL2Jpc2VjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvbnVtYmVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy92YXJpYW5jZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvZGV2aWF0aW9uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9leHRlbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL3JhbmdlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy90aWNrcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvcXVhbnRpbGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL21heC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvbWVhbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvbWVkaWFuLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9taW4uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtY29sbGVjdGlvbi9zcmMvbWFwLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbGxlY3Rpb24vc3JjL25lc3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL2FycmF5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9vcmRpbmFsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9iYW5kLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbG9yL3NyYy9kZWZpbmUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtY29sb3Ivc3JjL2NvbG9yLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbG9yL3NyYy9tYXRoLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbG9yL3NyYy9sYWIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtY29sb3Ivc3JjL2N1YmVoZWxpeC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvY29uc3RhbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL2NvbG9yLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9yZ2IuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL2FycmF5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9kYXRlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9udW1iZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL29iamVjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvc3RyaW5nLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy92YWx1ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvcm91bmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL3RyYW5zZm9ybS9kZWNvbXBvc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL3RyYW5zZm9ybS9wYXJzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvdHJhbnNmb3JtL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9jb25zdGFudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvbnVtYmVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9jb250aW51b3VzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0RGVjaW1hbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2V4cG9uZW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0R3JvdXAuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXROdW1lcmFscy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdERlZmF1bHQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRQcmVmaXhBdXRvLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0Um91bmRlZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdFR5cGVzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0U3BlY2lmaWVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvaWRlbnRpdHkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9sb2NhbGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9kZWZhdWx0TG9jYWxlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvcHJlY2lzaW9uRml4ZWQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9wcmVjaXNpb25QcmVmaXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9wcmVjaXNpb25Sb3VuZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvdGlja0Zvcm1hdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvbGluZWFyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL2ludGVydmFsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL21pbGxpc2Vjb25kLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL2R1cmF0aW9uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3NlY29uZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9taW51dGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvaG91ci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9kYXkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvd2Vlay5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9tb250aC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy95ZWFyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3V0Y01pbnV0ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy91dGNIb3VyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3V0Y0RheS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy91dGNXZWVrLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3V0Y01vbnRoLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3V0Y1llYXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS1mb3JtYXQvc3JjL2xvY2FsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9zcmMvZGVmYXVsdExvY2FsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9zcmMvaXNvRm9ybWF0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUtZm9ybWF0L3NyYy9pc29QYXJzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1wYXRoL3NyYy9wYXRoLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNoYXBlL3NyYy9jb25zdGFudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zaGFwZS9zcmMvY3VydmUvbGluZWFyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNoYXBlL3NyYy9wb2ludC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zaGFwZS9zcmMvbGluZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zaGFwZS9zcmMvYXJlYS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zaGFwZS9zcmMvY3VydmUvbW9ub3RvbmUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXhpcy9zcmMvYXJyYXkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXhpcy9zcmMvaWRlbnRpdHkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXhpcy9zcmMvYXhpcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1kaXNwYXRjaC9zcmMvZGlzcGF0Y2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZHJhZy9zcmMvbm9ldmVudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1kcmFnL3NyYy9ub2RyYWcuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZHJhZy9zcmMvZXZlbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZXIvc3JjL3RpbWVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWVyL3NyYy90aW1lb3V0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vc2NoZWR1bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvaW50ZXJydXB0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3NlbGVjdGlvbi9pbnRlcnJ1cHQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi90d2Vlbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL2ludGVycG9sYXRlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vYXR0ci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL2F0dHJUd2Vlbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL2RlbGF5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vZHVyYXRpb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9lYXNlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vZmlsdGVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vbWVyZ2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9vbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3JlbW92ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3NlbGVjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3NlbGVjdEFsbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3NlbGVjdGlvbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3N0eWxlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vc3R5bGVUd2Vlbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3RleHQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi90cmFuc2l0aW9uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZWFzZS9zcmMvY3ViaWMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvc2VsZWN0aW9uL3RyYW5zaXRpb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvc2VsZWN0aW9uL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWJydXNoL3NyYy9jb25zdGFudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1icnVzaC9zcmMvZXZlbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYnJ1c2gvc3JjL25vZXZlbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYnJ1c2gvc3JjL2JydXNoLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy9rZGUuanMiLCIuLi8uLi9zcmMvc2NyaXB0cy9tb2R1bGVzL1Rvb2x0aXAuanMiLCIuLi8uLi9zcmMvc2NyaXB0cy9tb2R1bGVzL3V0aWxzLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy9Ub29sYmFyLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy9Hcm91cGVkVmlvbGluLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy9ndGV4RGF0YVBhcnNlci5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL21vZHVsZXMvZ3RleE1lbnVCdWlsZGVyLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvRXF0bERhc2hib2FyZC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgRU9MID0ge30sXG4gICAgRU9GID0ge30sXG4gICAgUVVPVEUgPSAzNCxcbiAgICBORVdMSU5FID0gMTAsXG4gICAgUkVUVVJOID0gMTM7XG5cbmZ1bmN0aW9uIG9iamVjdENvbnZlcnRlcihjb2x1bW5zKSB7XG4gIHJldHVybiBuZXcgRnVuY3Rpb24oXCJkXCIsIFwicmV0dXJuIHtcIiArIGNvbHVtbnMubWFwKGZ1bmN0aW9uKG5hbWUsIGkpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkobmFtZSkgKyBcIjogZFtcIiArIGkgKyBcIl1cIjtcbiAgfSkuam9pbihcIixcIikgKyBcIn1cIik7XG59XG5cbmZ1bmN0aW9uIGN1c3RvbUNvbnZlcnRlcihjb2x1bW5zLCBmKSB7XG4gIHZhciBvYmplY3QgPSBvYmplY3RDb252ZXJ0ZXIoY29sdW1ucyk7XG4gIHJldHVybiBmdW5jdGlvbihyb3csIGkpIHtcbiAgICByZXR1cm4gZihvYmplY3Qocm93KSwgaSwgY29sdW1ucyk7XG4gIH07XG59XG5cbi8vIENvbXB1dGUgdW5pcXVlIGNvbHVtbnMgaW4gb3JkZXIgb2YgZGlzY292ZXJ5LlxuZnVuY3Rpb24gaW5mZXJDb2x1bW5zKHJvd3MpIHtcbiAgdmFyIGNvbHVtblNldCA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBjb2x1bW5zID0gW107XG5cbiAgcm93cy5mb3JFYWNoKGZ1bmN0aW9uKHJvdykge1xuICAgIGZvciAodmFyIGNvbHVtbiBpbiByb3cpIHtcbiAgICAgIGlmICghKGNvbHVtbiBpbiBjb2x1bW5TZXQpKSB7XG4gICAgICAgIGNvbHVtbnMucHVzaChjb2x1bW5TZXRbY29sdW1uXSA9IGNvbHVtbik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gY29sdW1ucztcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oZGVsaW1pdGVyKSB7XG4gIHZhciByZUZvcm1hdCA9IG5ldyBSZWdFeHAoXCJbXFxcIlwiICsgZGVsaW1pdGVyICsgXCJcXG5cXHJdXCIpLFxuICAgICAgREVMSU1JVEVSID0gZGVsaW1pdGVyLmNoYXJDb2RlQXQoMCk7XG5cbiAgZnVuY3Rpb24gcGFyc2UodGV4dCwgZikge1xuICAgIHZhciBjb252ZXJ0LCBjb2x1bW5zLCByb3dzID0gcGFyc2VSb3dzKHRleHQsIGZ1bmN0aW9uKHJvdywgaSkge1xuICAgICAgaWYgKGNvbnZlcnQpIHJldHVybiBjb252ZXJ0KHJvdywgaSAtIDEpO1xuICAgICAgY29sdW1ucyA9IHJvdywgY29udmVydCA9IGYgPyBjdXN0b21Db252ZXJ0ZXIocm93LCBmKSA6IG9iamVjdENvbnZlcnRlcihyb3cpO1xuICAgIH0pO1xuICAgIHJvd3MuY29sdW1ucyA9IGNvbHVtbnMgfHwgW107XG4gICAgcmV0dXJuIHJvd3M7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVJvd3ModGV4dCwgZikge1xuICAgIHZhciByb3dzID0gW10sIC8vIG91dHB1dCByb3dzXG4gICAgICAgIE4gPSB0ZXh0Lmxlbmd0aCxcbiAgICAgICAgSSA9IDAsIC8vIGN1cnJlbnQgY2hhcmFjdGVyIGluZGV4XG4gICAgICAgIG4gPSAwLCAvLyBjdXJyZW50IGxpbmUgbnVtYmVyXG4gICAgICAgIHQsIC8vIGN1cnJlbnQgdG9rZW5cbiAgICAgICAgZW9mID0gTiA8PSAwLCAvLyBjdXJyZW50IHRva2VuIGZvbGxvd2VkIGJ5IEVPRj9cbiAgICAgICAgZW9sID0gZmFsc2U7IC8vIGN1cnJlbnQgdG9rZW4gZm9sbG93ZWQgYnkgRU9MP1xuXG4gICAgLy8gU3RyaXAgdGhlIHRyYWlsaW5nIG5ld2xpbmUuXG4gICAgaWYgKHRleHQuY2hhckNvZGVBdChOIC0gMSkgPT09IE5FV0xJTkUpIC0tTjtcbiAgICBpZiAodGV4dC5jaGFyQ29kZUF0KE4gLSAxKSA9PT0gUkVUVVJOKSAtLU47XG5cbiAgICBmdW5jdGlvbiB0b2tlbigpIHtcbiAgICAgIGlmIChlb2YpIHJldHVybiBFT0Y7XG4gICAgICBpZiAoZW9sKSByZXR1cm4gZW9sID0gZmFsc2UsIEVPTDtcblxuICAgICAgLy8gVW5lc2NhcGUgcXVvdGVzLlxuICAgICAgdmFyIGksIGogPSBJLCBjO1xuICAgICAgaWYgKHRleHQuY2hhckNvZGVBdChqKSA9PT0gUVVPVEUpIHtcbiAgICAgICAgd2hpbGUgKEkrKyA8IE4gJiYgdGV4dC5jaGFyQ29kZUF0KEkpICE9PSBRVU9URSB8fCB0ZXh0LmNoYXJDb2RlQXQoKytJKSA9PT0gUVVPVEUpO1xuICAgICAgICBpZiAoKGkgPSBJKSA+PSBOKSBlb2YgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmICgoYyA9IHRleHQuY2hhckNvZGVBdChJKyspKSA9PT0gTkVXTElORSkgZW9sID0gdHJ1ZTtcbiAgICAgICAgZWxzZSBpZiAoYyA9PT0gUkVUVVJOKSB7IGVvbCA9IHRydWU7IGlmICh0ZXh0LmNoYXJDb2RlQXQoSSkgPT09IE5FV0xJTkUpICsrSTsgfVxuICAgICAgICByZXR1cm4gdGV4dC5zbGljZShqICsgMSwgaSAtIDEpLnJlcGxhY2UoL1wiXCIvZywgXCJcXFwiXCIpO1xuICAgICAgfVxuXG4gICAgICAvLyBGaW5kIG5leHQgZGVsaW1pdGVyIG9yIG5ld2xpbmUuXG4gICAgICB3aGlsZSAoSSA8IE4pIHtcbiAgICAgICAgaWYgKChjID0gdGV4dC5jaGFyQ29kZUF0KGkgPSBJKyspKSA9PT0gTkVXTElORSkgZW9sID0gdHJ1ZTtcbiAgICAgICAgZWxzZSBpZiAoYyA9PT0gUkVUVVJOKSB7IGVvbCA9IHRydWU7IGlmICh0ZXh0LmNoYXJDb2RlQXQoSSkgPT09IE5FV0xJTkUpICsrSTsgfVxuICAgICAgICBlbHNlIGlmIChjICE9PSBERUxJTUlURVIpIGNvbnRpbnVlO1xuICAgICAgICByZXR1cm4gdGV4dC5zbGljZShqLCBpKTtcbiAgICAgIH1cblxuICAgICAgLy8gUmV0dXJuIGxhc3QgdG9rZW4gYmVmb3JlIEVPRi5cbiAgICAgIHJldHVybiBlb2YgPSB0cnVlLCB0ZXh0LnNsaWNlKGosIE4pO1xuICAgIH1cblxuICAgIHdoaWxlICgodCA9IHRva2VuKCkpICE9PSBFT0YpIHtcbiAgICAgIHZhciByb3cgPSBbXTtcbiAgICAgIHdoaWxlICh0ICE9PSBFT0wgJiYgdCAhPT0gRU9GKSByb3cucHVzaCh0KSwgdCA9IHRva2VuKCk7XG4gICAgICBpZiAoZiAmJiAocm93ID0gZihyb3csIG4rKykpID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgcm93cy5wdXNoKHJvdyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJvd3M7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXQocm93cywgY29sdW1ucykge1xuICAgIGlmIChjb2x1bW5zID09IG51bGwpIGNvbHVtbnMgPSBpbmZlckNvbHVtbnMocm93cyk7XG4gICAgcmV0dXJuIFtjb2x1bW5zLm1hcChmb3JtYXRWYWx1ZSkuam9pbihkZWxpbWl0ZXIpXS5jb25jYXQocm93cy5tYXAoZnVuY3Rpb24ocm93KSB7XG4gICAgICByZXR1cm4gY29sdW1ucy5tYXAoZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICAgIHJldHVybiBmb3JtYXRWYWx1ZShyb3dbY29sdW1uXSk7XG4gICAgICB9KS5qb2luKGRlbGltaXRlcik7XG4gICAgfSkpLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRSb3dzKHJvd3MpIHtcbiAgICByZXR1cm4gcm93cy5tYXAoZm9ybWF0Um93KS5qb2luKFwiXFxuXCIpO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0Um93KHJvdykge1xuICAgIHJldHVybiByb3cubWFwKGZvcm1hdFZhbHVlKS5qb2luKGRlbGltaXRlcik7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRWYWx1ZSh0ZXh0KSB7XG4gICAgcmV0dXJuIHRleHQgPT0gbnVsbCA/IFwiXCJcbiAgICAgICAgOiByZUZvcm1hdC50ZXN0KHRleHQgKz0gXCJcIikgPyBcIlxcXCJcIiArIHRleHQucmVwbGFjZSgvXCIvZywgXCJcXFwiXFxcIlwiKSArIFwiXFxcIlwiXG4gICAgICAgIDogdGV4dDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcGFyc2U6IHBhcnNlLFxuICAgIHBhcnNlUm93czogcGFyc2VSb3dzLFxuICAgIGZvcm1hdDogZm9ybWF0LFxuICAgIGZvcm1hdFJvd3M6IGZvcm1hdFJvd3NcbiAgfTtcbn1cbiIsImltcG9ydCBkc3YgZnJvbSBcIi4vZHN2XCI7XG5cbnZhciBjc3YgPSBkc3YoXCIsXCIpO1xuXG5leHBvcnQgdmFyIGNzdlBhcnNlID0gY3N2LnBhcnNlO1xuZXhwb3J0IHZhciBjc3ZQYXJzZVJvd3MgPSBjc3YucGFyc2VSb3dzO1xuZXhwb3J0IHZhciBjc3ZGb3JtYXQgPSBjc3YuZm9ybWF0O1xuZXhwb3J0IHZhciBjc3ZGb3JtYXRSb3dzID0gY3N2LmZvcm1hdFJvd3M7XG4iLCJpbXBvcnQgZHN2IGZyb20gXCIuL2RzdlwiO1xuXG52YXIgdHN2ID0gZHN2KFwiXFx0XCIpO1xuXG5leHBvcnQgdmFyIHRzdlBhcnNlID0gdHN2LnBhcnNlO1xuZXhwb3J0IHZhciB0c3ZQYXJzZVJvd3MgPSB0c3YucGFyc2VSb3dzO1xuZXhwb3J0IHZhciB0c3ZGb3JtYXQgPSB0c3YuZm9ybWF0O1xuZXhwb3J0IHZhciB0c3ZGb3JtYXRSb3dzID0gdHN2LmZvcm1hdFJvd3M7XG4iLCJmdW5jdGlvbiByZXNwb25zZUpzb24ocmVzcG9uc2UpIHtcbiAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgbmV3IEVycm9yKHJlc3BvbnNlLnN0YXR1cyArIFwiIFwiICsgcmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gIHJldHVybiByZXNwb25zZS5qc29uKCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gIHJldHVybiBmZXRjaChpbnB1dCwgaW5pdCkudGhlbihyZXNwb25zZUpzb24pO1xufVxuIiwiZXhwb3J0IHZhciB4aHRtbCA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHN2ZzogXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLFxuICB4aHRtbDogeGh0bWwsXG4gIHhsaW5rOiBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIixcbiAgeG1sOiBcImh0dHA6Ly93d3cudzMub3JnL1hNTC8xOTk4L25hbWVzcGFjZVwiLFxuICB4bWxuczogXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3htbG5zL1wiXG59O1xuIiwiaW1wb3J0IG5hbWVzcGFjZXMgZnJvbSBcIi4vbmFtZXNwYWNlc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBwcmVmaXggPSBuYW1lICs9IFwiXCIsIGkgPSBwcmVmaXguaW5kZXhPZihcIjpcIik7XG4gIGlmIChpID49IDAgJiYgKHByZWZpeCA9IG5hbWUuc2xpY2UoMCwgaSkpICE9PSBcInhtbG5zXCIpIG5hbWUgPSBuYW1lLnNsaWNlKGkgKyAxKTtcbiAgcmV0dXJuIG5hbWVzcGFjZXMuaGFzT3duUHJvcGVydHkocHJlZml4KSA/IHtzcGFjZTogbmFtZXNwYWNlc1twcmVmaXhdLCBsb2NhbDogbmFtZX0gOiBuYW1lO1xufVxuIiwiaW1wb3J0IG5hbWVzcGFjZSBmcm9tIFwiLi9uYW1lc3BhY2VcIjtcbmltcG9ydCB7eGh0bWx9IGZyb20gXCIuL25hbWVzcGFjZXNcIjtcblxuZnVuY3Rpb24gY3JlYXRvckluaGVyaXQobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5vd25lckRvY3VtZW50LFxuICAgICAgICB1cmkgPSB0aGlzLm5hbWVzcGFjZVVSSTtcbiAgICByZXR1cm4gdXJpID09PSB4aHRtbCAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubmFtZXNwYWNlVVJJID09PSB4aHRtbFxuICAgICAgICA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobmFtZSlcbiAgICAgICAgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlModXJpLCBuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRvckZpeGVkKGZ1bGxuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5vd25lckRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBmdWxsbmFtZSA9IG5hbWVzcGFjZShuYW1lKTtcbiAgcmV0dXJuIChmdWxsbmFtZS5sb2NhbFxuICAgICAgPyBjcmVhdG9yRml4ZWRcbiAgICAgIDogY3JlYXRvckluaGVyaXQpKGZ1bGxuYW1lKTtcbn1cbiIsImZ1bmN0aW9uIG5vbmUoKSB7fVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3Rvcikge1xuICByZXR1cm4gc2VsZWN0b3IgPT0gbnVsbCA/IG5vbmUgOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfTtcbn1cbiIsImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHNlbGVjdG9yIGZyb20gXCIuLi9zZWxlY3RvclwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3QpIHtcbiAgaWYgKHR5cGVvZiBzZWxlY3QgIT09IFwiZnVuY3Rpb25cIikgc2VsZWN0ID0gc2VsZWN0b3Ioc2VsZWN0KTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHN1Ymdyb3VwID0gc3ViZ3JvdXBzW2pdID0gbmV3IEFycmF5KG4pLCBub2RlLCBzdWJub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIChzdWJub2RlID0gc2VsZWN0LmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApKSkge1xuICAgICAgICBpZiAoXCJfX2RhdGFfX1wiIGluIG5vZGUpIHN1Ym5vZGUuX19kYXRhX18gPSBub2RlLl9fZGF0YV9fO1xuICAgICAgICBzdWJncm91cFtpXSA9IHN1Ym5vZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oc3ViZ3JvdXBzLCB0aGlzLl9wYXJlbnRzKTtcbn1cbiIsImZ1bmN0aW9uIGVtcHR5KCkge1xuICByZXR1cm4gW107XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiBzZWxlY3RvciA9PSBudWxsID8gZW1wdHkgOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgfTtcbn1cbiIsImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHNlbGVjdG9yQWxsIGZyb20gXCIuLi9zZWxlY3RvckFsbFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3QpIHtcbiAgaWYgKHR5cGVvZiBzZWxlY3QgIT09IFwiZnVuY3Rpb25cIikgc2VsZWN0ID0gc2VsZWN0b3JBbGwoc2VsZWN0KTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBbXSwgcGFyZW50cyA9IFtdLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgICBzdWJncm91cHMucHVzaChzZWxlY3QuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpO1xuICAgICAgICBwYXJlbnRzLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oc3ViZ3JvdXBzLCBwYXJlbnRzKTtcbn1cbiIsInZhciBtYXRjaGVyID0gZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm1hdGNoZXMoc2VsZWN0b3IpO1xuICB9O1xufTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgaWYgKCFlbGVtZW50Lm1hdGNoZXMpIHtcbiAgICB2YXIgdmVuZG9yTWF0Y2hlcyA9IGVsZW1lbnQud2Via2l0TWF0Y2hlc1NlbGVjdG9yXG4gICAgICAgIHx8IGVsZW1lbnQubXNNYXRjaGVzU2VsZWN0b3JcbiAgICAgICAgfHwgZWxlbWVudC5tb3pNYXRjaGVzU2VsZWN0b3JcbiAgICAgICAgfHwgZWxlbWVudC5vTWF0Y2hlc1NlbGVjdG9yO1xuICAgIG1hdGNoZXIgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdmVuZG9yTWF0Y2hlcy5jYWxsKHRoaXMsIHNlbGVjdG9yKTtcbiAgICAgIH07XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBtYXRjaGVyO1xuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgbWF0Y2hlciBmcm9tIFwiLi4vbWF0Y2hlclwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihtYXRjaCkge1xuICBpZiAodHlwZW9mIG1hdGNoICE9PSBcImZ1bmN0aW9uXCIpIG1hdGNoID0gbWF0Y2hlcihtYXRjaCk7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgc3ViZ3JvdXBzID0gbmV3IEFycmF5KG0pLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBzdWJncm91cCA9IHN1Ymdyb3Vwc1tqXSA9IFtdLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIG1hdGNoLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApKSB7XG4gICAgICAgIHN1Ymdyb3VwLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oc3ViZ3JvdXBzLCB0aGlzLl9wYXJlbnRzKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHVwZGF0ZSkge1xuICByZXR1cm4gbmV3IEFycmF5KHVwZGF0ZS5sZW5ndGgpO1xufVxuIiwiaW1wb3J0IHNwYXJzZSBmcm9tIFwiLi9zcGFyc2VcIjtcbmltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5fZW50ZXIgfHwgdGhpcy5fZ3JvdXBzLm1hcChzcGFyc2UpLCB0aGlzLl9wYXJlbnRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIEVudGVyTm9kZShwYXJlbnQsIGRhdHVtKSB7XG4gIHRoaXMub3duZXJEb2N1bWVudCA9IHBhcmVudC5vd25lckRvY3VtZW50O1xuICB0aGlzLm5hbWVzcGFjZVVSSSA9IHBhcmVudC5uYW1lc3BhY2VVUkk7XG4gIHRoaXMuX25leHQgPSBudWxsO1xuICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuX19kYXRhX18gPSBkYXR1bTtcbn1cblxuRW50ZXJOb2RlLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEVudGVyTm9kZSxcbiAgYXBwZW5kQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkKSB7IHJldHVybiB0aGlzLl9wYXJlbnQuaW5zZXJ0QmVmb3JlKGNoaWxkLCB0aGlzLl9uZXh0KTsgfSxcbiAgaW5zZXJ0QmVmb3JlOiBmdW5jdGlvbihjaGlsZCwgbmV4dCkgeyByZXR1cm4gdGhpcy5fcGFyZW50Lmluc2VydEJlZm9yZShjaGlsZCwgbmV4dCk7IH0sXG4gIHF1ZXJ5U2VsZWN0b3I6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7IHJldHVybiB0aGlzLl9wYXJlbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7IH0sXG4gIHF1ZXJ5U2VsZWN0b3JBbGw6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7IHJldHVybiB0aGlzLl9wYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7IH1cbn07XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4geDtcbiAgfTtcbn1cbiIsImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHtFbnRlck5vZGV9IGZyb20gXCIuL2VudGVyXCI7XG5pbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4uL2NvbnN0YW50XCI7XG5cbnZhciBrZXlQcmVmaXggPSBcIiRcIjsgLy8gUHJvdGVjdCBhZ2FpbnN0IGtleXMgbGlrZSDigJxfX3Byb3RvX1/igJ0uXG5cbmZ1bmN0aW9uIGJpbmRJbmRleChwYXJlbnQsIGdyb3VwLCBlbnRlciwgdXBkYXRlLCBleGl0LCBkYXRhKSB7XG4gIHZhciBpID0gMCxcbiAgICAgIG5vZGUsXG4gICAgICBncm91cExlbmd0aCA9IGdyb3VwLmxlbmd0aCxcbiAgICAgIGRhdGFMZW5ndGggPSBkYXRhLmxlbmd0aDtcblxuICAvLyBQdXQgYW55IG5vbi1udWxsIG5vZGVzIHRoYXQgZml0IGludG8gdXBkYXRlLlxuICAvLyBQdXQgYW55IG51bGwgbm9kZXMgaW50byBlbnRlci5cbiAgLy8gUHV0IGFueSByZW1haW5pbmcgZGF0YSBpbnRvIGVudGVyLlxuICBmb3IgKDsgaSA8IGRhdGFMZW5ndGg7ICsraSkge1xuICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgIG5vZGUuX19kYXRhX18gPSBkYXRhW2ldO1xuICAgICAgdXBkYXRlW2ldID0gbm9kZTtcbiAgICB9IGVsc2Uge1xuICAgICAgZW50ZXJbaV0gPSBuZXcgRW50ZXJOb2RlKHBhcmVudCwgZGF0YVtpXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gUHV0IGFueSBub24tbnVsbCBub2RlcyB0aGF0IGRvbuKAmXQgZml0IGludG8gZXhpdC5cbiAgZm9yICg7IGkgPCBncm91cExlbmd0aDsgKytpKSB7XG4gICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgZXhpdFtpXSA9IG5vZGU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGJpbmRLZXkocGFyZW50LCBncm91cCwgZW50ZXIsIHVwZGF0ZSwgZXhpdCwgZGF0YSwga2V5KSB7XG4gIHZhciBpLFxuICAgICAgbm9kZSxcbiAgICAgIG5vZGVCeUtleVZhbHVlID0ge30sXG4gICAgICBncm91cExlbmd0aCA9IGdyb3VwLmxlbmd0aCxcbiAgICAgIGRhdGFMZW5ndGggPSBkYXRhLmxlbmd0aCxcbiAgICAgIGtleVZhbHVlcyA9IG5ldyBBcnJheShncm91cExlbmd0aCksXG4gICAgICBrZXlWYWx1ZTtcblxuICAvLyBDb21wdXRlIHRoZSBrZXkgZm9yIGVhY2ggbm9kZS5cbiAgLy8gSWYgbXVsdGlwbGUgbm9kZXMgaGF2ZSB0aGUgc2FtZSBrZXksIHRoZSBkdXBsaWNhdGVzIGFyZSBhZGRlZCB0byBleGl0LlxuICBmb3IgKGkgPSAwOyBpIDwgZ3JvdXBMZW5ndGg7ICsraSkge1xuICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgIGtleVZhbHVlc1tpXSA9IGtleVZhbHVlID0ga2V5UHJlZml4ICsga2V5LmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApO1xuICAgICAgaWYgKGtleVZhbHVlIGluIG5vZGVCeUtleVZhbHVlKSB7XG4gICAgICAgIGV4aXRbaV0gPSBub2RlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZUJ5S2V5VmFsdWVba2V5VmFsdWVdID0gbm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDb21wdXRlIHRoZSBrZXkgZm9yIGVhY2ggZGF0dW0uXG4gIC8vIElmIHRoZXJlIGEgbm9kZSBhc3NvY2lhdGVkIHdpdGggdGhpcyBrZXksIGpvaW4gYW5kIGFkZCBpdCB0byB1cGRhdGUuXG4gIC8vIElmIHRoZXJlIGlzIG5vdCAob3IgdGhlIGtleSBpcyBhIGR1cGxpY2F0ZSksIGFkZCBpdCB0byBlbnRlci5cbiAgZm9yIChpID0gMDsgaSA8IGRhdGFMZW5ndGg7ICsraSkge1xuICAgIGtleVZhbHVlID0ga2V5UHJlZml4ICsga2V5LmNhbGwocGFyZW50LCBkYXRhW2ldLCBpLCBkYXRhKTtcbiAgICBpZiAobm9kZSA9IG5vZGVCeUtleVZhbHVlW2tleVZhbHVlXSkge1xuICAgICAgdXBkYXRlW2ldID0gbm9kZTtcbiAgICAgIG5vZGUuX19kYXRhX18gPSBkYXRhW2ldO1xuICAgICAgbm9kZUJ5S2V5VmFsdWVba2V5VmFsdWVdID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgZW50ZXJbaV0gPSBuZXcgRW50ZXJOb2RlKHBhcmVudCwgZGF0YVtpXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQWRkIGFueSByZW1haW5pbmcgbm9kZXMgdGhhdCB3ZXJlIG5vdCBib3VuZCB0byBkYXRhIHRvIGV4aXQuXG4gIGZvciAoaSA9IDA7IGkgPCBncm91cExlbmd0aDsgKytpKSB7XG4gICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIChub2RlQnlLZXlWYWx1ZVtrZXlWYWx1ZXNbaV1dID09PSBub2RlKSkge1xuICAgICAgZXhpdFtpXSA9IG5vZGU7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgaWYgKCF2YWx1ZSkge1xuICAgIGRhdGEgPSBuZXcgQXJyYXkodGhpcy5zaXplKCkpLCBqID0gLTE7XG4gICAgdGhpcy5lYWNoKGZ1bmN0aW9uKGQpIHsgZGF0YVsrK2pdID0gZDsgfSk7XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICB2YXIgYmluZCA9IGtleSA/IGJpbmRLZXkgOiBiaW5kSW5kZXgsXG4gICAgICBwYXJlbnRzID0gdGhpcy5fcGFyZW50cyxcbiAgICAgIGdyb3VwcyA9IHRoaXMuX2dyb3VwcztcblxuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHZhbHVlID0gY29uc3RhbnQodmFsdWUpO1xuXG4gIGZvciAodmFyIG0gPSBncm91cHMubGVuZ3RoLCB1cGRhdGUgPSBuZXcgQXJyYXkobSksIGVudGVyID0gbmV3IEFycmF5KG0pLCBleGl0ID0gbmV3IEFycmF5KG0pLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIHZhciBwYXJlbnQgPSBwYXJlbnRzW2pdLFxuICAgICAgICBncm91cCA9IGdyb3Vwc1tqXSxcbiAgICAgICAgZ3JvdXBMZW5ndGggPSBncm91cC5sZW5ndGgsXG4gICAgICAgIGRhdGEgPSB2YWx1ZS5jYWxsKHBhcmVudCwgcGFyZW50ICYmIHBhcmVudC5fX2RhdGFfXywgaiwgcGFyZW50cyksXG4gICAgICAgIGRhdGFMZW5ndGggPSBkYXRhLmxlbmd0aCxcbiAgICAgICAgZW50ZXJHcm91cCA9IGVudGVyW2pdID0gbmV3IEFycmF5KGRhdGFMZW5ndGgpLFxuICAgICAgICB1cGRhdGVHcm91cCA9IHVwZGF0ZVtqXSA9IG5ldyBBcnJheShkYXRhTGVuZ3RoKSxcbiAgICAgICAgZXhpdEdyb3VwID0gZXhpdFtqXSA9IG5ldyBBcnJheShncm91cExlbmd0aCk7XG5cbiAgICBiaW5kKHBhcmVudCwgZ3JvdXAsIGVudGVyR3JvdXAsIHVwZGF0ZUdyb3VwLCBleGl0R3JvdXAsIGRhdGEsIGtleSk7XG5cbiAgICAvLyBOb3cgY29ubmVjdCB0aGUgZW50ZXIgbm9kZXMgdG8gdGhlaXIgZm9sbG93aW5nIHVwZGF0ZSBub2RlLCBzdWNoIHRoYXRcbiAgICAvLyBhcHBlbmRDaGlsZCBjYW4gaW5zZXJ0IHRoZSBtYXRlcmlhbGl6ZWQgZW50ZXIgbm9kZSBiZWZvcmUgdGhpcyBub2RlLFxuICAgIC8vIHJhdGhlciB0aGFuIGF0IHRoZSBlbmQgb2YgdGhlIHBhcmVudCBub2RlLlxuICAgIGZvciAodmFyIGkwID0gMCwgaTEgPSAwLCBwcmV2aW91cywgbmV4dDsgaTAgPCBkYXRhTGVuZ3RoOyArK2kwKSB7XG4gICAgICBpZiAocHJldmlvdXMgPSBlbnRlckdyb3VwW2kwXSkge1xuICAgICAgICBpZiAoaTAgPj0gaTEpIGkxID0gaTAgKyAxO1xuICAgICAgICB3aGlsZSAoIShuZXh0ID0gdXBkYXRlR3JvdXBbaTFdKSAmJiArK2kxIDwgZGF0YUxlbmd0aCk7XG4gICAgICAgIHByZXZpb3VzLl9uZXh0ID0gbmV4dCB8fCBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZSA9IG5ldyBTZWxlY3Rpb24odXBkYXRlLCBwYXJlbnRzKTtcbiAgdXBkYXRlLl9lbnRlciA9IGVudGVyO1xuICB1cGRhdGUuX2V4aXQgPSBleGl0O1xuICByZXR1cm4gdXBkYXRlO1xufVxuIiwiaW1wb3J0IHNwYXJzZSBmcm9tIFwiLi9zcGFyc2VcIjtcbmltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5fZXhpdCB8fCB0aGlzLl9ncm91cHMubWFwKHNwYXJzZSksIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdGlvbikge1xuXG4gIGZvciAodmFyIGdyb3VwczAgPSB0aGlzLl9ncm91cHMsIGdyb3VwczEgPSBzZWxlY3Rpb24uX2dyb3VwcywgbTAgPSBncm91cHMwLmxlbmd0aCwgbTEgPSBncm91cHMxLmxlbmd0aCwgbSA9IE1hdGgubWluKG0wLCBtMSksIG1lcmdlcyA9IG5ldyBBcnJheShtMCksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAwID0gZ3JvdXBzMFtqXSwgZ3JvdXAxID0gZ3JvdXBzMVtqXSwgbiA9IGdyb3VwMC5sZW5ndGgsIG1lcmdlID0gbWVyZ2VzW2pdID0gbmV3IEFycmF5KG4pLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cDBbaV0gfHwgZ3JvdXAxW2ldKSB7XG4gICAgICAgIG1lcmdlW2ldID0gbm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKDsgaiA8IG0wOyArK2opIHtcbiAgICBtZXJnZXNbal0gPSBncm91cHMwW2pdO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24obWVyZ2VzLCB0aGlzLl9wYXJlbnRzKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgaiA9IC0xLCBtID0gZ3JvdXBzLmxlbmd0aDsgKytqIDwgbTspIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgaSA9IGdyb3VwLmxlbmd0aCAtIDEsIG5leHQgPSBncm91cFtpXSwgbm9kZTsgLS1pID49IDA7KSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIGlmIChuZXh0ICYmIG5leHQgIT09IG5vZGUubmV4dFNpYmxpbmcpIG5leHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgbmV4dCk7XG4gICAgICAgIG5leHQgPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbXBhcmUpIHtcbiAgaWYgKCFjb21wYXJlKSBjb21wYXJlID0gYXNjZW5kaW5nO1xuXG4gIGZ1bmN0aW9uIGNvbXBhcmVOb2RlKGEsIGIpIHtcbiAgICByZXR1cm4gYSAmJiBiID8gY29tcGFyZShhLl9fZGF0YV9fLCBiLl9fZGF0YV9fKSA6ICFhIC0gIWI7XG4gIH1cblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzb3J0Z3JvdXBzID0gbmV3IEFycmF5KG0pLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBzb3J0Z3JvdXAgPSBzb3J0Z3JvdXBzW2pdID0gbmV3IEFycmF5KG4pLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgICBzb3J0Z3JvdXBbaV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgICBzb3J0Z3JvdXAuc29ydChjb21wYXJlTm9kZSk7XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzb3J0Z3JvdXBzLCB0aGlzLl9wYXJlbnRzKS5vcmRlcigpO1xufVxuXG5mdW5jdGlvbiBhc2NlbmRpbmcoYSwgYikge1xuICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IGEgPj0gYiA/IDAgOiBOYU47XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgdmFyIGNhbGxiYWNrID0gYXJndW1lbnRzWzBdO1xuICBhcmd1bWVudHNbMF0gPSB0aGlzO1xuICBjYWxsYmFjay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICByZXR1cm4gdGhpcztcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZXMgPSBuZXcgQXJyYXkodGhpcy5zaXplKCkpLCBpID0gLTE7XG4gIHRoaXMuZWFjaChmdW5jdGlvbigpIHsgbm9kZXNbKytpXSA9IHRoaXM7IH0pO1xuICByZXR1cm4gbm9kZXM7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIGogPSAwLCBtID0gZ3JvdXBzLmxlbmd0aDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gMCwgbiA9IGdyb3VwLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgdmFyIG5vZGUgPSBncm91cFtpXTtcbiAgICAgIGlmIChub2RlKSByZXR1cm4gbm9kZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgc2l6ZSA9IDA7XG4gIHRoaXMuZWFjaChmdW5jdGlvbigpIHsgKytzaXplOyB9KTtcbiAgcmV0dXJuIHNpemU7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICF0aGlzLm5vZGUoKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBqID0gMCwgbSA9IGdyb3Vwcy5sZW5ndGg7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgaSA9IDAsIG4gPSBncm91cC5sZW5ndGgsIG5vZGU7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIGNhbGxiYWNrLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufVxuIiwiaW1wb3J0IG5hbWVzcGFjZSBmcm9tIFwiLi4vbmFtZXNwYWNlXCI7XG5cbmZ1bmN0aW9uIGF0dHJSZW1vdmUobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJSZW1vdmVOUyhmdWxsbmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyQ29uc3RhbnQobmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckNvbnN0YW50TlMoZnVsbG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNldEF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCwgdmFsdWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyRnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSB0aGlzLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICBlbHNlIHRoaXMuc2V0QXR0cmlidXRlKG5hbWUsIHYpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyRnVuY3Rpb25OUyhmdWxsbmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSB0aGlzLnJlbW92ZUF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gICAgZWxzZSB0aGlzLnNldEF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCwgdik7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHZhciBmdWxsbmFtZSA9IG5hbWVzcGFjZShuYW1lKTtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMubm9kZSgpO1xuICAgIHJldHVybiBmdWxsbmFtZS5sb2NhbFxuICAgICAgICA/IG5vZGUuZ2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKVxuICAgICAgICA6IG5vZGUuZ2V0QXR0cmlidXRlKGZ1bGxuYW1lKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmVhY2goKHZhbHVlID09IG51bGxcbiAgICAgID8gKGZ1bGxuYW1lLmxvY2FsID8gYXR0clJlbW92ZU5TIDogYXR0clJlbW92ZSkgOiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gKGZ1bGxuYW1lLmxvY2FsID8gYXR0ckZ1bmN0aW9uTlMgOiBhdHRyRnVuY3Rpb24pXG4gICAgICA6IChmdWxsbmFtZS5sb2NhbCA/IGF0dHJDb25zdGFudE5TIDogYXR0ckNvbnN0YW50KSkpKGZ1bGxuYW1lLCB2YWx1ZSkpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obm9kZSkge1xuICByZXR1cm4gKG5vZGUub3duZXJEb2N1bWVudCAmJiBub2RlLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcpIC8vIG5vZGUgaXMgYSBOb2RlXG4gICAgICB8fCAobm9kZS5kb2N1bWVudCAmJiBub2RlKSAvLyBub2RlIGlzIGEgV2luZG93XG4gICAgICB8fCBub2RlLmRlZmF1bHRWaWV3OyAvLyBub2RlIGlzIGEgRG9jdW1lbnRcbn1cbiIsImltcG9ydCBkZWZhdWx0VmlldyBmcm9tIFwiLi4vd2luZG93XCI7XG5cbmZ1bmN0aW9uIHN0eWxlUmVtb3ZlKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHN0eWxlQ29uc3RhbnQobmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIHZhbHVlLCBwcmlvcml0eSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHN0eWxlRnVuY3Rpb24obmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHYgPT0gbnVsbCkgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgICBlbHNlIHRoaXMuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdiwgcHJpb3JpdHkpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPiAxXG4gICAgICA/IHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbFxuICAgICAgICAgICAgPyBzdHlsZVJlbW92ZSA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgICA/IHN0eWxlRnVuY3Rpb25cbiAgICAgICAgICAgIDogc3R5bGVDb25zdGFudCkobmFtZSwgdmFsdWUsIHByaW9yaXR5ID09IG51bGwgPyBcIlwiIDogcHJpb3JpdHkpKVxuICAgICAgOiBzdHlsZVZhbHVlKHRoaXMubm9kZSgpLCBuYW1lKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0eWxlVmFsdWUobm9kZSwgbmFtZSkge1xuICByZXR1cm4gbm9kZS5zdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKG5hbWUpXG4gICAgICB8fCBkZWZhdWx0Vmlldyhub2RlKS5nZXRDb21wdXRlZFN0eWxlKG5vZGUsIG51bGwpLmdldFByb3BlcnR5VmFsdWUobmFtZSk7XG59XG4iLCJmdW5jdGlvbiBwcm9wZXJ0eVJlbW92ZShuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBkZWxldGUgdGhpc1tuYW1lXTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcHJvcGVydHlDb25zdGFudChuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpc1tuYW1lXSA9IHZhbHVlO1xuICB9O1xufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eUZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHYgPT0gbnVsbCkgZGVsZXRlIHRoaXNbbmFtZV07XG4gICAgZWxzZSB0aGlzW25hbWVdID0gdjtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPiAxXG4gICAgICA/IHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbFxuICAgICAgICAgID8gcHJvcGVydHlSZW1vdmUgOiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICAgID8gcHJvcGVydHlGdW5jdGlvblxuICAgICAgICAgIDogcHJvcGVydHlDb25zdGFudCkobmFtZSwgdmFsdWUpKVxuICAgICAgOiB0aGlzLm5vZGUoKVtuYW1lXTtcbn1cbiIsImZ1bmN0aW9uIGNsYXNzQXJyYXkoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmcudHJpbSgpLnNwbGl0KC9efFxccysvKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NMaXN0KG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuY2xhc3NMaXN0IHx8IG5ldyBDbGFzc0xpc3Qobm9kZSk7XG59XG5cbmZ1bmN0aW9uIENsYXNzTGlzdChub2RlKSB7XG4gIHRoaXMuX25vZGUgPSBub2RlO1xuICB0aGlzLl9uYW1lcyA9IGNsYXNzQXJyYXkobm9kZS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSB8fCBcIlwiKTtcbn1cblxuQ2xhc3NMaXN0LnByb3RvdHlwZSA9IHtcbiAgYWRkOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGkgPSB0aGlzLl9uYW1lcy5pbmRleE9mKG5hbWUpO1xuICAgIGlmIChpIDwgMCkge1xuICAgICAgdGhpcy5fbmFtZXMucHVzaChuYW1lKTtcbiAgICAgIHRoaXMuX25vZGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdGhpcy5fbmFtZXMuam9pbihcIiBcIikpO1xuICAgIH1cbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGkgPSB0aGlzLl9uYW1lcy5pbmRleE9mKG5hbWUpO1xuICAgIGlmIChpID49IDApIHtcbiAgICAgIHRoaXMuX25hbWVzLnNwbGljZShpLCAxKTtcbiAgICAgIHRoaXMuX25vZGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdGhpcy5fbmFtZXMuam9pbihcIiBcIikpO1xuICAgIH1cbiAgfSxcbiAgY29udGFpbnM6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5fbmFtZXMuaW5kZXhPZihuYW1lKSA+PSAwO1xuICB9XG59O1xuXG5mdW5jdGlvbiBjbGFzc2VkQWRkKG5vZGUsIG5hbWVzKSB7XG4gIHZhciBsaXN0ID0gY2xhc3NMaXN0KG5vZGUpLCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gIHdoaWxlICgrK2kgPCBuKSBsaXN0LmFkZChuYW1lc1tpXSk7XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRSZW1vdmUobm9kZSwgbmFtZXMpIHtcbiAgdmFyIGxpc3QgPSBjbGFzc0xpc3Qobm9kZSksIGkgPSAtMSwgbiA9IG5hbWVzLmxlbmd0aDtcbiAgd2hpbGUgKCsraSA8IG4pIGxpc3QucmVtb3ZlKG5hbWVzW2ldKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NlZFRydWUobmFtZXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzZWRBZGQodGhpcywgbmFtZXMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkRmFsc2UobmFtZXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzZWRSZW1vdmUodGhpcywgbmFtZXMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkRnVuY3Rpb24obmFtZXMsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAodmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKSA/IGNsYXNzZWRBZGQgOiBjbGFzc2VkUmVtb3ZlKSh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHZhciBuYW1lcyA9IGNsYXNzQXJyYXkobmFtZSArIFwiXCIpO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHZhciBsaXN0ID0gY2xhc3NMaXN0KHRoaXMubm9kZSgpKSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoIWxpc3QuY29udGFpbnMobmFtZXNbaV0pKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gdGhpcy5lYWNoKCh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgPyBjbGFzc2VkRnVuY3Rpb24gOiB2YWx1ZVxuICAgICAgPyBjbGFzc2VkVHJ1ZVxuICAgICAgOiBjbGFzc2VkRmFsc2UpKG5hbWVzLCB2YWx1ZSkpO1xufVxuIiwiZnVuY3Rpb24gdGV4dFJlbW92ZSgpIHtcbiAgdGhpcy50ZXh0Q29udGVudCA9IFwiXCI7XG59XG5cbmZ1bmN0aW9uIHRleHRDb25zdGFudCh2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50ZXh0Q29udGVudCA9IHZhbHVlO1xuICB9O1xufVxuXG5mdW5jdGlvbiB0ZXh0RnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gdiA9PSBudWxsID8gXCJcIiA6IHY7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyB0ZXh0UmVtb3ZlIDogKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyB0ZXh0RnVuY3Rpb25cbiAgICAgICAgICA6IHRleHRDb25zdGFudCkodmFsdWUpKVxuICAgICAgOiB0aGlzLm5vZGUoKS50ZXh0Q29udGVudDtcbn1cbiIsImZ1bmN0aW9uIGh0bWxSZW1vdmUoKSB7XG4gIHRoaXMuaW5uZXJIVE1MID0gXCJcIjtcbn1cblxuZnVuY3Rpb24gaHRtbENvbnN0YW50KHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlubmVySFRNTCA9IHZhbHVlO1xuICB9O1xufVxuXG5mdW5jdGlvbiBodG1sRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLmlubmVySFRNTCA9IHYgPT0gbnVsbCA/IFwiXCIgOiB2O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLmVhY2godmFsdWUgPT0gbnVsbFxuICAgICAgICAgID8gaHRtbFJlbW92ZSA6ICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICAgID8gaHRtbEZ1bmN0aW9uXG4gICAgICAgICAgOiBodG1sQ29uc3RhbnQpKHZhbHVlKSlcbiAgICAgIDogdGhpcy5ub2RlKCkuaW5uZXJIVE1MO1xufVxuIiwiZnVuY3Rpb24gcmFpc2UoKSB7XG4gIGlmICh0aGlzLm5leHRTaWJsaW5nKSB0aGlzLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQodGhpcyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lYWNoKHJhaXNlKTtcbn1cbiIsImZ1bmN0aW9uIGxvd2VyKCkge1xuICBpZiAodGhpcy5wcmV2aW91c1NpYmxpbmcpIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcywgdGhpcy5wYXJlbnROb2RlLmZpcnN0Q2hpbGQpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaChsb3dlcik7XG59XG4iLCJpbXBvcnQgY3JlYXRvciBmcm9tIFwiLi4vY3JlYXRvclwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBjcmVhdGUgPSB0eXBlb2YgbmFtZSA9PT0gXCJmdW5jdGlvblwiID8gbmFtZSA6IGNyZWF0b3IobmFtZSk7XG4gIHJldHVybiB0aGlzLnNlbGVjdChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5hcHBlbmRDaGlsZChjcmVhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gIH0pO1xufVxuIiwiaW1wb3J0IGNyZWF0b3IgZnJvbSBcIi4uL2NyZWF0b3JcIjtcbmltcG9ydCBzZWxlY3RvciBmcm9tIFwiLi4vc2VsZWN0b3JcIjtcblxuZnVuY3Rpb24gY29uc3RhbnROdWxsKCkge1xuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgYmVmb3JlKSB7XG4gIHZhciBjcmVhdGUgPSB0eXBlb2YgbmFtZSA9PT0gXCJmdW5jdGlvblwiID8gbmFtZSA6IGNyZWF0b3IobmFtZSksXG4gICAgICBzZWxlY3QgPSBiZWZvcmUgPT0gbnVsbCA/IGNvbnN0YW50TnVsbCA6IHR5cGVvZiBiZWZvcmUgPT09IFwiZnVuY3Rpb25cIiA/IGJlZm9yZSA6IHNlbGVjdG9yKGJlZm9yZSk7XG4gIHJldHVybiB0aGlzLnNlbGVjdChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5pbnNlcnRCZWZvcmUoY3JlYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksIHNlbGVjdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IG51bGwpO1xuICB9KTtcbn1cbiIsImZ1bmN0aW9uIHJlbW92ZSgpIHtcbiAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50Tm9kZTtcbiAgaWYgKHBhcmVudCkgcGFyZW50LnJlbW92ZUNoaWxkKHRoaXMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaChyZW1vdmUpO1xufVxuIiwiZnVuY3Rpb24gc2VsZWN0aW9uX2Nsb25lU2hhbGxvdygpIHtcbiAgcmV0dXJuIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5jbG9uZU5vZGUoZmFsc2UpLCB0aGlzLm5leHRTaWJsaW5nKTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0aW9uX2Nsb25lRGVlcCgpIHtcbiAgcmV0dXJuIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5jbG9uZU5vZGUodHJ1ZSksIHRoaXMubmV4dFNpYmxpbmcpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihkZWVwKSB7XG4gIHJldHVybiB0aGlzLnNlbGVjdChkZWVwID8gc2VsZWN0aW9uX2Nsb25lRGVlcCA6IHNlbGVjdGlvbl9jbG9uZVNoYWxsb3cpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5wcm9wZXJ0eShcIl9fZGF0YV9fXCIsIHZhbHVlKVxuICAgICAgOiB0aGlzLm5vZGUoKS5fX2RhdGFfXztcbn1cbiIsInZhciBmaWx0ZXJFdmVudHMgPSB7fTtcblxuZXhwb3J0IHZhciBldmVudCA9IG51bGw7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGlmICghKFwib25tb3VzZWVudGVyXCIgaW4gZWxlbWVudCkpIHtcbiAgICBmaWx0ZXJFdmVudHMgPSB7bW91c2VlbnRlcjogXCJtb3VzZW92ZXJcIiwgbW91c2VsZWF2ZTogXCJtb3VzZW91dFwifTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaWx0ZXJDb250ZXh0TGlzdGVuZXIobGlzdGVuZXIsIGluZGV4LCBncm91cCkge1xuICBsaXN0ZW5lciA9IGNvbnRleHRMaXN0ZW5lcihsaXN0ZW5lciwgaW5kZXgsIGdyb3VwKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgdmFyIHJlbGF0ZWQgPSBldmVudC5yZWxhdGVkVGFyZ2V0O1xuICAgIGlmICghcmVsYXRlZCB8fCAocmVsYXRlZCAhPT0gdGhpcyAmJiAhKHJlbGF0ZWQuY29tcGFyZURvY3VtZW50UG9zaXRpb24odGhpcykgJiA4KSkpIHtcbiAgICAgIGxpc3RlbmVyLmNhbGwodGhpcywgZXZlbnQpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gY29udGV4dExpc3RlbmVyKGxpc3RlbmVyLCBpbmRleCwgZ3JvdXApIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGV2ZW50MSkge1xuICAgIHZhciBldmVudDAgPSBldmVudDsgLy8gRXZlbnRzIGNhbiBiZSByZWVudHJhbnQgKGUuZy4sIGZvY3VzKS5cbiAgICBldmVudCA9IGV2ZW50MTtcbiAgICB0cnkge1xuICAgICAgbGlzdGVuZXIuY2FsbCh0aGlzLCB0aGlzLl9fZGF0YV9fLCBpbmRleCwgZ3JvdXApO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBldmVudCA9IGV2ZW50MDtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlVHlwZW5hbWVzKHR5cGVuYW1lcykge1xuICByZXR1cm4gdHlwZW5hbWVzLnRyaW0oKS5zcGxpdCgvXnxcXHMrLykubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgbmFtZSA9IFwiXCIsIGkgPSB0LmluZGV4T2YoXCIuXCIpO1xuICAgIGlmIChpID49IDApIG5hbWUgPSB0LnNsaWNlKGkgKyAxKSwgdCA9IHQuc2xpY2UoMCwgaSk7XG4gICAgcmV0dXJuIHt0eXBlOiB0LCBuYW1lOiBuYW1lfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG9uUmVtb3ZlKHR5cGVuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgb24gPSB0aGlzLl9fb247XG4gICAgaWYgKCFvbikgcmV0dXJuO1xuICAgIGZvciAodmFyIGogPSAwLCBpID0gLTEsIG0gPSBvbi5sZW5ndGgsIG87IGogPCBtOyArK2opIHtcbiAgICAgIGlmIChvID0gb25bal0sICghdHlwZW5hbWUudHlwZSB8fCBvLnR5cGUgPT09IHR5cGVuYW1lLnR5cGUpICYmIG8ubmFtZSA9PT0gdHlwZW5hbWUubmFtZSkge1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoby50eXBlLCBvLmxpc3RlbmVyLCBvLmNhcHR1cmUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb25bKytpXSA9IG87XG4gICAgICB9XG4gICAgfVxuICAgIGlmICgrK2kpIG9uLmxlbmd0aCA9IGk7XG4gICAgZWxzZSBkZWxldGUgdGhpcy5fX29uO1xuICB9O1xufVxuXG5mdW5jdGlvbiBvbkFkZCh0eXBlbmFtZSwgdmFsdWUsIGNhcHR1cmUpIHtcbiAgdmFyIHdyYXAgPSBmaWx0ZXJFdmVudHMuaGFzT3duUHJvcGVydHkodHlwZW5hbWUudHlwZSkgPyBmaWx0ZXJDb250ZXh0TGlzdGVuZXIgOiBjb250ZXh0TGlzdGVuZXI7XG4gIHJldHVybiBmdW5jdGlvbihkLCBpLCBncm91cCkge1xuICAgIHZhciBvbiA9IHRoaXMuX19vbiwgbywgbGlzdGVuZXIgPSB3cmFwKHZhbHVlLCBpLCBncm91cCk7XG4gICAgaWYgKG9uKSBmb3IgKHZhciBqID0gMCwgbSA9IG9uLmxlbmd0aDsgaiA8IG07ICsraikge1xuICAgICAgaWYgKChvID0gb25bal0pLnR5cGUgPT09IHR5cGVuYW1lLnR5cGUgJiYgby5uYW1lID09PSB0eXBlbmFtZS5uYW1lKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihvLnR5cGUsIG8ubGlzdGVuZXIsIG8uY2FwdHVyZSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihvLnR5cGUsIG8ubGlzdGVuZXIgPSBsaXN0ZW5lciwgby5jYXB0dXJlID0gY2FwdHVyZSk7XG4gICAgICAgIG8udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIodHlwZW5hbWUudHlwZSwgbGlzdGVuZXIsIGNhcHR1cmUpO1xuICAgIG8gPSB7dHlwZTogdHlwZW5hbWUudHlwZSwgbmFtZTogdHlwZW5hbWUubmFtZSwgdmFsdWU6IHZhbHVlLCBsaXN0ZW5lcjogbGlzdGVuZXIsIGNhcHR1cmU6IGNhcHR1cmV9O1xuICAgIGlmICghb24pIHRoaXMuX19vbiA9IFtvXTtcbiAgICBlbHNlIG9uLnB1c2gobyk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHR5cGVuYW1lLCB2YWx1ZSwgY2FwdHVyZSkge1xuICB2YXIgdHlwZW5hbWVzID0gcGFyc2VUeXBlbmFtZXModHlwZW5hbWUgKyBcIlwiKSwgaSwgbiA9IHR5cGVuYW1lcy5sZW5ndGgsIHQ7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgdmFyIG9uID0gdGhpcy5ub2RlKCkuX19vbjtcbiAgICBpZiAob24pIGZvciAodmFyIGogPSAwLCBtID0gb24ubGVuZ3RoLCBvOyBqIDwgbTsgKytqKSB7XG4gICAgICBmb3IgKGkgPSAwLCBvID0gb25bal07IGkgPCBuOyArK2kpIHtcbiAgICAgICAgaWYgKCh0ID0gdHlwZW5hbWVzW2ldKS50eXBlID09PSBvLnR5cGUgJiYgdC5uYW1lID09PSBvLm5hbWUpIHtcbiAgICAgICAgICByZXR1cm4gby52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICBvbiA9IHZhbHVlID8gb25BZGQgOiBvblJlbW92ZTtcbiAgaWYgKGNhcHR1cmUgPT0gbnVsbCkgY2FwdHVyZSA9IGZhbHNlO1xuICBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSB0aGlzLmVhY2gob24odHlwZW5hbWVzW2ldLCB2YWx1ZSwgY2FwdHVyZSkpO1xuICByZXR1cm4gdGhpcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGN1c3RvbUV2ZW50KGV2ZW50MSwgbGlzdGVuZXIsIHRoYXQsIGFyZ3MpIHtcbiAgdmFyIGV2ZW50MCA9IGV2ZW50O1xuICBldmVudDEuc291cmNlRXZlbnQgPSBldmVudDtcbiAgZXZlbnQgPSBldmVudDE7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGxpc3RlbmVyLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICB9IGZpbmFsbHkge1xuICAgIGV2ZW50ID0gZXZlbnQwO1xuICB9XG59XG4iLCJpbXBvcnQgZGVmYXVsdFZpZXcgZnJvbSBcIi4uL3dpbmRvd1wiO1xuXG5mdW5jdGlvbiBkaXNwYXRjaEV2ZW50KG5vZGUsIHR5cGUsIHBhcmFtcykge1xuICB2YXIgd2luZG93ID0gZGVmYXVsdFZpZXcobm9kZSksXG4gICAgICBldmVudCA9IHdpbmRvdy5DdXN0b21FdmVudDtcblxuICBpZiAodHlwZW9mIGV2ZW50ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBldmVudCA9IG5ldyBldmVudCh0eXBlLCBwYXJhbXMpO1xuICB9IGVsc2Uge1xuICAgIGV2ZW50ID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiRXZlbnRcIik7XG4gICAgaWYgKHBhcmFtcykgZXZlbnQuaW5pdEV2ZW50KHR5cGUsIHBhcmFtcy5idWJibGVzLCBwYXJhbXMuY2FuY2VsYWJsZSksIGV2ZW50LmRldGFpbCA9IHBhcmFtcy5kZXRhaWw7XG4gICAgZWxzZSBldmVudC5pbml0RXZlbnQodHlwZSwgZmFsc2UsIGZhbHNlKTtcbiAgfVxuXG4gIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG59XG5cbmZ1bmN0aW9uIGRpc3BhdGNoQ29uc3RhbnQodHlwZSwgcGFyYW1zKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGlzcGF0Y2hFdmVudCh0aGlzLCB0eXBlLCBwYXJhbXMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBkaXNwYXRjaEZ1bmN0aW9uKHR5cGUsIHBhcmFtcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGRpc3BhdGNoRXZlbnQodGhpcywgdHlwZSwgcGFyYW1zLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih0eXBlLCBwYXJhbXMpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaCgodHlwZW9mIHBhcmFtcyA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IGRpc3BhdGNoRnVuY3Rpb25cbiAgICAgIDogZGlzcGF0Y2hDb25zdGFudCkodHlwZSwgcGFyYW1zKSk7XG59XG4iLCJpbXBvcnQgc2VsZWN0aW9uX3NlbGVjdCBmcm9tIFwiLi9zZWxlY3RcIjtcbmltcG9ydCBzZWxlY3Rpb25fc2VsZWN0QWxsIGZyb20gXCIuL3NlbGVjdEFsbFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9maWx0ZXIgZnJvbSBcIi4vZmlsdGVyXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2RhdGEgZnJvbSBcIi4vZGF0YVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9lbnRlciBmcm9tIFwiLi9lbnRlclwiO1xuaW1wb3J0IHNlbGVjdGlvbl9leGl0IGZyb20gXCIuL2V4aXRcIjtcbmltcG9ydCBzZWxlY3Rpb25fbWVyZ2UgZnJvbSBcIi4vbWVyZ2VcIjtcbmltcG9ydCBzZWxlY3Rpb25fb3JkZXIgZnJvbSBcIi4vb3JkZXJcIjtcbmltcG9ydCBzZWxlY3Rpb25fc29ydCBmcm9tIFwiLi9zb3J0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX2NhbGwgZnJvbSBcIi4vY2FsbFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9ub2RlcyBmcm9tIFwiLi9ub2Rlc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9ub2RlIGZyb20gXCIuL25vZGVcIjtcbmltcG9ydCBzZWxlY3Rpb25fc2l6ZSBmcm9tIFwiLi9zaXplXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2VtcHR5IGZyb20gXCIuL2VtcHR5XCI7XG5pbXBvcnQgc2VsZWN0aW9uX2VhY2ggZnJvbSBcIi4vZWFjaFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9hdHRyIGZyb20gXCIuL2F0dHJcIjtcbmltcG9ydCBzZWxlY3Rpb25fc3R5bGUgZnJvbSBcIi4vc3R5bGVcIjtcbmltcG9ydCBzZWxlY3Rpb25fcHJvcGVydHkgZnJvbSBcIi4vcHJvcGVydHlcIjtcbmltcG9ydCBzZWxlY3Rpb25fY2xhc3NlZCBmcm9tIFwiLi9jbGFzc2VkXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3RleHQgZnJvbSBcIi4vdGV4dFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9odG1sIGZyb20gXCIuL2h0bWxcIjtcbmltcG9ydCBzZWxlY3Rpb25fcmFpc2UgZnJvbSBcIi4vcmFpc2VcIjtcbmltcG9ydCBzZWxlY3Rpb25fbG93ZXIgZnJvbSBcIi4vbG93ZXJcIjtcbmltcG9ydCBzZWxlY3Rpb25fYXBwZW5kIGZyb20gXCIuL2FwcGVuZFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9pbnNlcnQgZnJvbSBcIi4vaW5zZXJ0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX3JlbW92ZSBmcm9tIFwiLi9yZW1vdmVcIjtcbmltcG9ydCBzZWxlY3Rpb25fY2xvbmUgZnJvbSBcIi4vY2xvbmVcIjtcbmltcG9ydCBzZWxlY3Rpb25fZGF0dW0gZnJvbSBcIi4vZGF0dW1cIjtcbmltcG9ydCBzZWxlY3Rpb25fb24gZnJvbSBcIi4vb25cIjtcbmltcG9ydCBzZWxlY3Rpb25fZGlzcGF0Y2ggZnJvbSBcIi4vZGlzcGF0Y2hcIjtcblxuZXhwb3J0IHZhciByb290ID0gW251bGxdO1xuXG5leHBvcnQgZnVuY3Rpb24gU2VsZWN0aW9uKGdyb3VwcywgcGFyZW50cykge1xuICB0aGlzLl9ncm91cHMgPSBncm91cHM7XG4gIHRoaXMuX3BhcmVudHMgPSBwYXJlbnRzO1xufVxuXG5mdW5jdGlvbiBzZWxlY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKFtbZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XV0sIHJvb3QpO1xufVxuXG5TZWxlY3Rpb24ucHJvdG90eXBlID0gc2VsZWN0aW9uLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IFNlbGVjdGlvbixcbiAgc2VsZWN0OiBzZWxlY3Rpb25fc2VsZWN0LFxuICBzZWxlY3RBbGw6IHNlbGVjdGlvbl9zZWxlY3RBbGwsXG4gIGZpbHRlcjogc2VsZWN0aW9uX2ZpbHRlcixcbiAgZGF0YTogc2VsZWN0aW9uX2RhdGEsXG4gIGVudGVyOiBzZWxlY3Rpb25fZW50ZXIsXG4gIGV4aXQ6IHNlbGVjdGlvbl9leGl0LFxuICBtZXJnZTogc2VsZWN0aW9uX21lcmdlLFxuICBvcmRlcjogc2VsZWN0aW9uX29yZGVyLFxuICBzb3J0OiBzZWxlY3Rpb25fc29ydCxcbiAgY2FsbDogc2VsZWN0aW9uX2NhbGwsXG4gIG5vZGVzOiBzZWxlY3Rpb25fbm9kZXMsXG4gIG5vZGU6IHNlbGVjdGlvbl9ub2RlLFxuICBzaXplOiBzZWxlY3Rpb25fc2l6ZSxcbiAgZW1wdHk6IHNlbGVjdGlvbl9lbXB0eSxcbiAgZWFjaDogc2VsZWN0aW9uX2VhY2gsXG4gIGF0dHI6IHNlbGVjdGlvbl9hdHRyLFxuICBzdHlsZTogc2VsZWN0aW9uX3N0eWxlLFxuICBwcm9wZXJ0eTogc2VsZWN0aW9uX3Byb3BlcnR5LFxuICBjbGFzc2VkOiBzZWxlY3Rpb25fY2xhc3NlZCxcbiAgdGV4dDogc2VsZWN0aW9uX3RleHQsXG4gIGh0bWw6IHNlbGVjdGlvbl9odG1sLFxuICByYWlzZTogc2VsZWN0aW9uX3JhaXNlLFxuICBsb3dlcjogc2VsZWN0aW9uX2xvd2VyLFxuICBhcHBlbmQ6IHNlbGVjdGlvbl9hcHBlbmQsXG4gIGluc2VydDogc2VsZWN0aW9uX2luc2VydCxcbiAgcmVtb3ZlOiBzZWxlY3Rpb25fcmVtb3ZlLFxuICBjbG9uZTogc2VsZWN0aW9uX2Nsb25lLFxuICBkYXR1bTogc2VsZWN0aW9uX2RhdHVtLFxuICBvbjogc2VsZWN0aW9uX29uLFxuICBkaXNwYXRjaDogc2VsZWN0aW9uX2Rpc3BhdGNoXG59O1xuXG5leHBvcnQgZGVmYXVsdCBzZWxlY3Rpb247XG4iLCJpbXBvcnQge1NlbGVjdGlvbiwgcm9vdH0gZnJvbSBcIi4vc2VsZWN0aW9uL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiB0eXBlb2Ygc2VsZWN0b3IgPT09IFwic3RyaW5nXCJcbiAgICAgID8gbmV3IFNlbGVjdGlvbihbW2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpXV0sIFtkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRdKVxuICAgICAgOiBuZXcgU2VsZWN0aW9uKFtbc2VsZWN0b3JdXSwgcm9vdCk7XG59XG4iLCJpbXBvcnQge2V2ZW50fSBmcm9tIFwiLi9zZWxlY3Rpb24vb25cIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBjdXJyZW50ID0gZXZlbnQsIHNvdXJjZTtcbiAgd2hpbGUgKHNvdXJjZSA9IGN1cnJlbnQuc291cmNlRXZlbnQpIGN1cnJlbnQgPSBzb3VyY2U7XG4gIHJldHVybiBjdXJyZW50O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obm9kZSwgZXZlbnQpIHtcbiAgdmFyIHN2ZyA9IG5vZGUub3duZXJTVkdFbGVtZW50IHx8IG5vZGU7XG5cbiAgaWYgKHN2Zy5jcmVhdGVTVkdQb2ludCkge1xuICAgIHZhciBwb2ludCA9IHN2Zy5jcmVhdGVTVkdQb2ludCgpO1xuICAgIHBvaW50LnggPSBldmVudC5jbGllbnRYLCBwb2ludC55ID0gZXZlbnQuY2xpZW50WTtcbiAgICBwb2ludCA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShub2RlLmdldFNjcmVlbkNUTSgpLmludmVyc2UoKSk7XG4gICAgcmV0dXJuIFtwb2ludC54LCBwb2ludC55XTtcbiAgfVxuXG4gIHZhciByZWN0ID0gbm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgcmV0dXJuIFtldmVudC5jbGllbnRYIC0gcmVjdC5sZWZ0IC0gbm9kZS5jbGllbnRMZWZ0LCBldmVudC5jbGllbnRZIC0gcmVjdC50b3AgLSBub2RlLmNsaWVudFRvcF07XG59XG4iLCJpbXBvcnQgc291cmNlRXZlbnQgZnJvbSBcIi4vc291cmNlRXZlbnRcIjtcbmltcG9ydCBwb2ludCBmcm9tIFwiLi9wb2ludFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihub2RlKSB7XG4gIHZhciBldmVudCA9IHNvdXJjZUV2ZW50KCk7XG4gIGlmIChldmVudC5jaGFuZ2VkVG91Y2hlcykgZXZlbnQgPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXTtcbiAgcmV0dXJuIHBvaW50KG5vZGUsIGV2ZW50KTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiBhID49IGIgPyAwIDogTmFOO1xufVxuIiwiaW1wb3J0IGFzY2VuZGluZyBmcm9tIFwiLi9hc2NlbmRpbmdcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29tcGFyZSkge1xuICBpZiAoY29tcGFyZS5sZW5ndGggPT09IDEpIGNvbXBhcmUgPSBhc2NlbmRpbmdDb21wYXJhdG9yKGNvbXBhcmUpO1xuICByZXR1cm4ge1xuICAgIGxlZnQ6IGZ1bmN0aW9uKGEsIHgsIGxvLCBoaSkge1xuICAgICAgaWYgKGxvID09IG51bGwpIGxvID0gMDtcbiAgICAgIGlmIChoaSA9PSBudWxsKSBoaSA9IGEubGVuZ3RoO1xuICAgICAgd2hpbGUgKGxvIDwgaGkpIHtcbiAgICAgICAgdmFyIG1pZCA9IGxvICsgaGkgPj4+IDE7XG4gICAgICAgIGlmIChjb21wYXJlKGFbbWlkXSwgeCkgPCAwKSBsbyA9IG1pZCArIDE7XG4gICAgICAgIGVsc2UgaGkgPSBtaWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gbG87XG4gICAgfSxcbiAgICByaWdodDogZnVuY3Rpb24oYSwgeCwgbG8sIGhpKSB7XG4gICAgICBpZiAobG8gPT0gbnVsbCkgbG8gPSAwO1xuICAgICAgaWYgKGhpID09IG51bGwpIGhpID0gYS5sZW5ndGg7XG4gICAgICB3aGlsZSAobG8gPCBoaSkge1xuICAgICAgICB2YXIgbWlkID0gbG8gKyBoaSA+Pj4gMTtcbiAgICAgICAgaWYgKGNvbXBhcmUoYVttaWRdLCB4KSA+IDApIGhpID0gbWlkO1xuICAgICAgICBlbHNlIGxvID0gbWlkICsgMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsbztcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZ0NvbXBhcmF0b3IoZikge1xuICByZXR1cm4gZnVuY3Rpb24oZCwgeCkge1xuICAgIHJldHVybiBhc2NlbmRpbmcoZihkKSwgeCk7XG4gIH07XG59XG4iLCJpbXBvcnQgYXNjZW5kaW5nIGZyb20gXCIuL2FzY2VuZGluZ1wiO1xuaW1wb3J0IGJpc2VjdG9yIGZyb20gXCIuL2Jpc2VjdG9yXCI7XG5cbnZhciBhc2NlbmRpbmdCaXNlY3QgPSBiaXNlY3Rvcihhc2NlbmRpbmcpO1xuZXhwb3J0IHZhciBiaXNlY3RSaWdodCA9IGFzY2VuZGluZ0Jpc2VjdC5yaWdodDtcbmV4cG9ydCB2YXIgYmlzZWN0TGVmdCA9IGFzY2VuZGluZ0Jpc2VjdC5sZWZ0O1xuZXhwb3J0IGRlZmF1bHQgYmlzZWN0UmlnaHQ7XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4ID09PSBudWxsID8gTmFOIDogK3g7XG59XG4iLCJpbXBvcnQgbnVtYmVyIGZyb20gXCIuL251bWJlclwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlb2YpIHtcbiAgdmFyIG4gPSB2YWx1ZXMubGVuZ3RoLFxuICAgICAgbSA9IDAsXG4gICAgICBpID0gLTEsXG4gICAgICBtZWFuID0gMCxcbiAgICAgIHZhbHVlLFxuICAgICAgZGVsdGEsXG4gICAgICBzdW0gPSAwO1xuXG4gIGlmICh2YWx1ZW9mID09IG51bGwpIHtcbiAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgaWYgKCFpc05hTih2YWx1ZSA9IG51bWJlcih2YWx1ZXNbaV0pKSkge1xuICAgICAgICBkZWx0YSA9IHZhbHVlIC0gbWVhbjtcbiAgICAgICAgbWVhbiArPSBkZWx0YSAvICsrbTtcbiAgICAgICAgc3VtICs9IGRlbHRhICogKHZhbHVlIC0gbWVhbik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZWxzZSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGlmICghaXNOYU4odmFsdWUgPSBudW1iZXIodmFsdWVvZih2YWx1ZXNbaV0sIGksIHZhbHVlcykpKSkge1xuICAgICAgICBkZWx0YSA9IHZhbHVlIC0gbWVhbjtcbiAgICAgICAgbWVhbiArPSBkZWx0YSAvICsrbTtcbiAgICAgICAgc3VtICs9IGRlbHRhICogKHZhbHVlIC0gbWVhbik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKG0gPiAxKSByZXR1cm4gc3VtIC8gKG0gLSAxKTtcbn1cbiIsImltcG9ydCB2YXJpYW5jZSBmcm9tIFwiLi92YXJpYW5jZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhcnJheSwgZikge1xuICB2YXIgdiA9IHZhcmlhbmNlKGFycmF5LCBmKTtcbiAgcmV0dXJuIHYgPyBNYXRoLnNxcnQodikgOiB2O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWVzLCB2YWx1ZW9mKSB7XG4gIHZhciBuID0gdmFsdWVzLmxlbmd0aCxcbiAgICAgIGkgPSAtMSxcbiAgICAgIHZhbHVlLFxuICAgICAgbWluLFxuICAgICAgbWF4O1xuXG4gIGlmICh2YWx1ZW9mID09IG51bGwpIHtcbiAgICB3aGlsZSAoKytpIDwgbikgeyAvLyBGaW5kIHRoZSBmaXJzdCBjb21wYXJhYmxlIHZhbHVlLlxuICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlc1tpXSkgIT0gbnVsbCAmJiB2YWx1ZSA+PSB2YWx1ZSkge1xuICAgICAgICBtaW4gPSBtYXggPSB2YWx1ZTtcbiAgICAgICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gQ29tcGFyZSB0aGUgcmVtYWluaW5nIHZhbHVlcy5cbiAgICAgICAgICBpZiAoKHZhbHVlID0gdmFsdWVzW2ldKSAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZiAobWluID4gdmFsdWUpIG1pbiA9IHZhbHVlO1xuICAgICAgICAgICAgaWYgKG1heCA8IHZhbHVlKSBtYXggPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBlbHNlIHtcbiAgICB3aGlsZSAoKytpIDwgbikgeyAvLyBGaW5kIHRoZSBmaXJzdCBjb21wYXJhYmxlIHZhbHVlLlxuICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlb2YodmFsdWVzW2ldLCBpLCB2YWx1ZXMpKSAhPSBudWxsICYmIHZhbHVlID49IHZhbHVlKSB7XG4gICAgICAgIG1pbiA9IG1heCA9IHZhbHVlO1xuICAgICAgICB3aGlsZSAoKytpIDwgbikgeyAvLyBDb21wYXJlIHRoZSByZW1haW5pbmcgdmFsdWVzLlxuICAgICAgICAgIGlmICgodmFsdWUgPSB2YWx1ZW9mKHZhbHVlc1tpXSwgaSwgdmFsdWVzKSkgIT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKG1pbiA+IHZhbHVlKSBtaW4gPSB2YWx1ZTtcbiAgICAgICAgICAgIGlmIChtYXggPCB2YWx1ZSkgbWF4ID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIFttaW4sIG1heF07XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICBzdGFydCA9ICtzdGFydCwgc3RvcCA9ICtzdG9wLCBzdGVwID0gKG4gPSBhcmd1bWVudHMubGVuZ3RoKSA8IDIgPyAoc3RvcCA9IHN0YXJ0LCBzdGFydCA9IDAsIDEpIDogbiA8IDMgPyAxIDogK3N0ZXA7XG5cbiAgdmFyIGkgPSAtMSxcbiAgICAgIG4gPSBNYXRoLm1heCgwLCBNYXRoLmNlaWwoKHN0b3AgLSBzdGFydCkgLyBzdGVwKSkgfCAwLFxuICAgICAgcmFuZ2UgPSBuZXcgQXJyYXkobik7XG5cbiAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICByYW5nZVtpXSA9IHN0YXJ0ICsgaSAqIHN0ZXA7XG4gIH1cblxuICByZXR1cm4gcmFuZ2U7XG59XG4iLCJ2YXIgZTEwID0gTWF0aC5zcXJ0KDUwKSxcbiAgICBlNSA9IE1hdGguc3FydCgxMCksXG4gICAgZTIgPSBNYXRoLnNxcnQoMik7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBjb3VudCkge1xuICB2YXIgcmV2ZXJzZSxcbiAgICAgIGkgPSAtMSxcbiAgICAgIG4sXG4gICAgICB0aWNrcyxcbiAgICAgIHN0ZXA7XG5cbiAgc3RvcCA9ICtzdG9wLCBzdGFydCA9ICtzdGFydCwgY291bnQgPSArY291bnQ7XG4gIGlmIChzdGFydCA9PT0gc3RvcCAmJiBjb3VudCA+IDApIHJldHVybiBbc3RhcnRdO1xuICBpZiAocmV2ZXJzZSA9IHN0b3AgPCBzdGFydCkgbiA9IHN0YXJ0LCBzdGFydCA9IHN0b3AsIHN0b3AgPSBuO1xuICBpZiAoKHN0ZXAgPSB0aWNrSW5jcmVtZW50KHN0YXJ0LCBzdG9wLCBjb3VudCkpID09PSAwIHx8ICFpc0Zpbml0ZShzdGVwKSkgcmV0dXJuIFtdO1xuXG4gIGlmIChzdGVwID4gMCkge1xuICAgIHN0YXJ0ID0gTWF0aC5jZWlsKHN0YXJ0IC8gc3RlcCk7XG4gICAgc3RvcCA9IE1hdGguZmxvb3Ioc3RvcCAvIHN0ZXApO1xuICAgIHRpY2tzID0gbmV3IEFycmF5KG4gPSBNYXRoLmNlaWwoc3RvcCAtIHN0YXJ0ICsgMSkpO1xuICAgIHdoaWxlICgrK2kgPCBuKSB0aWNrc1tpXSA9IChzdGFydCArIGkpICogc3RlcDtcbiAgfSBlbHNlIHtcbiAgICBzdGFydCA9IE1hdGguZmxvb3Ioc3RhcnQgKiBzdGVwKTtcbiAgICBzdG9wID0gTWF0aC5jZWlsKHN0b3AgKiBzdGVwKTtcbiAgICB0aWNrcyA9IG5ldyBBcnJheShuID0gTWF0aC5jZWlsKHN0YXJ0IC0gc3RvcCArIDEpKTtcbiAgICB3aGlsZSAoKytpIDwgbikgdGlja3NbaV0gPSAoc3RhcnQgLSBpKSAvIHN0ZXA7XG4gIH1cblxuICBpZiAocmV2ZXJzZSkgdGlja3MucmV2ZXJzZSgpO1xuXG4gIHJldHVybiB0aWNrcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRpY2tJbmNyZW1lbnQoc3RhcnQsIHN0b3AsIGNvdW50KSB7XG4gIHZhciBzdGVwID0gKHN0b3AgLSBzdGFydCkgLyBNYXRoLm1heCgwLCBjb3VudCksXG4gICAgICBwb3dlciA9IE1hdGguZmxvb3IoTWF0aC5sb2coc3RlcCkgLyBNYXRoLkxOMTApLFxuICAgICAgZXJyb3IgPSBzdGVwIC8gTWF0aC5wb3coMTAsIHBvd2VyKTtcbiAgcmV0dXJuIHBvd2VyID49IDBcbiAgICAgID8gKGVycm9yID49IGUxMCA/IDEwIDogZXJyb3IgPj0gZTUgPyA1IDogZXJyb3IgPj0gZTIgPyAyIDogMSkgKiBNYXRoLnBvdygxMCwgcG93ZXIpXG4gICAgICA6IC1NYXRoLnBvdygxMCwgLXBvd2VyKSAvIChlcnJvciA+PSBlMTAgPyAxMCA6IGVycm9yID49IGU1ID8gNSA6IGVycm9yID49IGUyID8gMiA6IDEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGlja1N0ZXAoc3RhcnQsIHN0b3AsIGNvdW50KSB7XG4gIHZhciBzdGVwMCA9IE1hdGguYWJzKHN0b3AgLSBzdGFydCkgLyBNYXRoLm1heCgwLCBjb3VudCksXG4gICAgICBzdGVwMSA9IE1hdGgucG93KDEwLCBNYXRoLmZsb29yKE1hdGgubG9nKHN0ZXAwKSAvIE1hdGguTE4xMCkpLFxuICAgICAgZXJyb3IgPSBzdGVwMCAvIHN0ZXAxO1xuICBpZiAoZXJyb3IgPj0gZTEwKSBzdGVwMSAqPSAxMDtcbiAgZWxzZSBpZiAoZXJyb3IgPj0gZTUpIHN0ZXAxICo9IDU7XG4gIGVsc2UgaWYgKGVycm9yID49IGUyKSBzdGVwMSAqPSAyO1xuICByZXR1cm4gc3RvcCA8IHN0YXJ0ID8gLXN0ZXAxIDogc3RlcDE7XG59XG4iLCJpbXBvcnQgbnVtYmVyIGZyb20gXCIuL251bWJlclwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZXMsIHAsIHZhbHVlb2YpIHtcbiAgaWYgKHZhbHVlb2YgPT0gbnVsbCkgdmFsdWVvZiA9IG51bWJlcjtcbiAgaWYgKCEobiA9IHZhbHVlcy5sZW5ndGgpKSByZXR1cm47XG4gIGlmICgocCA9ICtwKSA8PSAwIHx8IG4gPCAyKSByZXR1cm4gK3ZhbHVlb2YodmFsdWVzWzBdLCAwLCB2YWx1ZXMpO1xuICBpZiAocCA+PSAxKSByZXR1cm4gK3ZhbHVlb2YodmFsdWVzW24gLSAxXSwgbiAtIDEsIHZhbHVlcyk7XG4gIHZhciBuLFxuICAgICAgaSA9IChuIC0gMSkgKiBwLFxuICAgICAgaTAgPSBNYXRoLmZsb29yKGkpLFxuICAgICAgdmFsdWUwID0gK3ZhbHVlb2YodmFsdWVzW2kwXSwgaTAsIHZhbHVlcyksXG4gICAgICB2YWx1ZTEgPSArdmFsdWVvZih2YWx1ZXNbaTAgKyAxXSwgaTAgKyAxLCB2YWx1ZXMpO1xuICByZXR1cm4gdmFsdWUwICsgKHZhbHVlMSAtIHZhbHVlMCkgKiAoaSAtIGkwKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlcywgdmFsdWVvZikge1xuICB2YXIgbiA9IHZhbHVlcy5sZW5ndGgsXG4gICAgICBpID0gLTEsXG4gICAgICB2YWx1ZSxcbiAgICAgIG1heDtcblxuICBpZiAodmFsdWVvZiA9PSBudWxsKSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gRmluZCB0aGUgZmlyc3QgY29tcGFyYWJsZSB2YWx1ZS5cbiAgICAgIGlmICgodmFsdWUgPSB2YWx1ZXNbaV0pICE9IG51bGwgJiYgdmFsdWUgPj0gdmFsdWUpIHtcbiAgICAgICAgbWF4ID0gdmFsdWU7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIENvbXBhcmUgdGhlIHJlbWFpbmluZyB2YWx1ZXMuXG4gICAgICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlc1tpXSkgIT0gbnVsbCAmJiB2YWx1ZSA+IG1heCkge1xuICAgICAgICAgICAgbWF4ID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZWxzZSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gRmluZCB0aGUgZmlyc3QgY29tcGFyYWJsZSB2YWx1ZS5cbiAgICAgIGlmICgodmFsdWUgPSB2YWx1ZW9mKHZhbHVlc1tpXSwgaSwgdmFsdWVzKSkgIT0gbnVsbCAmJiB2YWx1ZSA+PSB2YWx1ZSkge1xuICAgICAgICBtYXggPSB2YWx1ZTtcbiAgICAgICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gQ29tcGFyZSB0aGUgcmVtYWluaW5nIHZhbHVlcy5cbiAgICAgICAgICBpZiAoKHZhbHVlID0gdmFsdWVvZih2YWx1ZXNbaV0sIGksIHZhbHVlcykpICE9IG51bGwgJiYgdmFsdWUgPiBtYXgpIHtcbiAgICAgICAgICAgIG1heCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtYXg7XG59XG4iLCJpbXBvcnQgbnVtYmVyIGZyb20gXCIuL251bWJlclwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlb2YpIHtcbiAgdmFyIG4gPSB2YWx1ZXMubGVuZ3RoLFxuICAgICAgbSA9IG4sXG4gICAgICBpID0gLTEsXG4gICAgICB2YWx1ZSxcbiAgICAgIHN1bSA9IDA7XG5cbiAgaWYgKHZhbHVlb2YgPT0gbnVsbCkge1xuICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICBpZiAoIWlzTmFOKHZhbHVlID0gbnVtYmVyKHZhbHVlc1tpXSkpKSBzdW0gKz0gdmFsdWU7XG4gICAgICBlbHNlIC0tbTtcbiAgICB9XG4gIH1cblxuICBlbHNlIHtcbiAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgaWYgKCFpc05hTih2YWx1ZSA9IG51bWJlcih2YWx1ZW9mKHZhbHVlc1tpXSwgaSwgdmFsdWVzKSkpKSBzdW0gKz0gdmFsdWU7XG4gICAgICBlbHNlIC0tbTtcbiAgICB9XG4gIH1cblxuICBpZiAobSkgcmV0dXJuIHN1bSAvIG07XG59XG4iLCJpbXBvcnQgYXNjZW5kaW5nIGZyb20gXCIuL2FzY2VuZGluZ1wiO1xuaW1wb3J0IG51bWJlciBmcm9tIFwiLi9udW1iZXJcIjtcbmltcG9ydCBxdWFudGlsZSBmcm9tIFwiLi9xdWFudGlsZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlb2YpIHtcbiAgdmFyIG4gPSB2YWx1ZXMubGVuZ3RoLFxuICAgICAgaSA9IC0xLFxuICAgICAgdmFsdWUsXG4gICAgICBudW1iZXJzID0gW107XG5cbiAgaWYgKHZhbHVlb2YgPT0gbnVsbCkge1xuICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICBpZiAoIWlzTmFOKHZhbHVlID0gbnVtYmVyKHZhbHVlc1tpXSkpKSB7XG4gICAgICAgIG51bWJlcnMucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZWxzZSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGlmICghaXNOYU4odmFsdWUgPSBudW1iZXIodmFsdWVvZih2YWx1ZXNbaV0sIGksIHZhbHVlcykpKSkge1xuICAgICAgICBudW1iZXJzLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBxdWFudGlsZShudW1iZXJzLnNvcnQoYXNjZW5kaW5nKSwgMC41KTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlcywgdmFsdWVvZikge1xuICB2YXIgbiA9IHZhbHVlcy5sZW5ndGgsXG4gICAgICBpID0gLTEsXG4gICAgICB2YWx1ZSxcbiAgICAgIG1pbjtcblxuICBpZiAodmFsdWVvZiA9PSBudWxsKSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gRmluZCB0aGUgZmlyc3QgY29tcGFyYWJsZSB2YWx1ZS5cbiAgICAgIGlmICgodmFsdWUgPSB2YWx1ZXNbaV0pICE9IG51bGwgJiYgdmFsdWUgPj0gdmFsdWUpIHtcbiAgICAgICAgbWluID0gdmFsdWU7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIENvbXBhcmUgdGhlIHJlbWFpbmluZyB2YWx1ZXMuXG4gICAgICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlc1tpXSkgIT0gbnVsbCAmJiBtaW4gPiB2YWx1ZSkge1xuICAgICAgICAgICAgbWluID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZWxzZSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gRmluZCB0aGUgZmlyc3QgY29tcGFyYWJsZSB2YWx1ZS5cbiAgICAgIGlmICgodmFsdWUgPSB2YWx1ZW9mKHZhbHVlc1tpXSwgaSwgdmFsdWVzKSkgIT0gbnVsbCAmJiB2YWx1ZSA+PSB2YWx1ZSkge1xuICAgICAgICBtaW4gPSB2YWx1ZTtcbiAgICAgICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gQ29tcGFyZSB0aGUgcmVtYWluaW5nIHZhbHVlcy5cbiAgICAgICAgICBpZiAoKHZhbHVlID0gdmFsdWVvZih2YWx1ZXNbaV0sIGksIHZhbHVlcykpICE9IG51bGwgJiYgbWluID4gdmFsdWUpIHtcbiAgICAgICAgICAgIG1pbiA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtaW47XG59XG4iLCJleHBvcnQgdmFyIHByZWZpeCA9IFwiJFwiO1xuXG5mdW5jdGlvbiBNYXAoKSB7fVxuXG5NYXAucHJvdG90eXBlID0gbWFwLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IE1hcCxcbiAgaGFzOiBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gKHByZWZpeCArIGtleSkgaW4gdGhpcztcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gdGhpc1twcmVmaXggKyBrZXldO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICB0aGlzW3ByZWZpeCArIGtleV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgcHJvcGVydHkgPSBwcmVmaXggKyBrZXk7XG4gICAgcmV0dXJuIHByb3BlcnR5IGluIHRoaXMgJiYgZGVsZXRlIHRoaXNbcHJvcGVydHldO1xuICB9LFxuICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIGRlbGV0ZSB0aGlzW3Byb3BlcnR5XTtcbiAgfSxcbiAga2V5czogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkga2V5cy5wdXNoKHByb3BlcnR5LnNsaWNlKDEpKTtcbiAgICByZXR1cm4ga2V5cztcbiAgfSxcbiAgdmFsdWVzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWVzID0gW107XG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIHZhbHVlcy5wdXNoKHRoaXNbcHJvcGVydHldKTtcbiAgICByZXR1cm4gdmFsdWVzO1xuICB9LFxuICBlbnRyaWVzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZW50cmllcyA9IFtdO1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSBlbnRyaWVzLnB1c2goe2tleTogcHJvcGVydHkuc2xpY2UoMSksIHZhbHVlOiB0aGlzW3Byb3BlcnR5XX0pO1xuICAgIHJldHVybiBlbnRyaWVzO1xuICB9LFxuICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2l6ZSA9IDA7XG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpICsrc2l6ZTtcbiAgICByZXR1cm4gc2l6ZTtcbiAgfSxcbiAgZW1wdHk6IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIGVhY2g6IGZ1bmN0aW9uKGYpIHtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkgZih0aGlzW3Byb3BlcnR5XSwgcHJvcGVydHkuc2xpY2UoMSksIHRoaXMpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBtYXAob2JqZWN0LCBmKSB7XG4gIHZhciBtYXAgPSBuZXcgTWFwO1xuXG4gIC8vIENvcHkgY29uc3RydWN0b3IuXG4gIGlmIChvYmplY3QgaW5zdGFuY2VvZiBNYXApIG9iamVjdC5lYWNoKGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHsgbWFwLnNldChrZXksIHZhbHVlKTsgfSk7XG5cbiAgLy8gSW5kZXggYXJyYXkgYnkgbnVtZXJpYyBpbmRleCBvciBzcGVjaWZpZWQga2V5IGZ1bmN0aW9uLlxuICBlbHNlIGlmIChBcnJheS5pc0FycmF5KG9iamVjdCkpIHtcbiAgICB2YXIgaSA9IC0xLFxuICAgICAgICBuID0gb2JqZWN0Lmxlbmd0aCxcbiAgICAgICAgbztcblxuICAgIGlmIChmID09IG51bGwpIHdoaWxlICgrK2kgPCBuKSBtYXAuc2V0KGksIG9iamVjdFtpXSk7XG4gICAgZWxzZSB3aGlsZSAoKytpIDwgbikgbWFwLnNldChmKG8gPSBvYmplY3RbaV0sIGksIG9iamVjdCksIG8pO1xuICB9XG5cbiAgLy8gQ29udmVydCBvYmplY3QgdG8gbWFwLlxuICBlbHNlIGlmIChvYmplY3QpIGZvciAodmFyIGtleSBpbiBvYmplY3QpIG1hcC5zZXQoa2V5LCBvYmplY3Rba2V5XSk7XG5cbiAgcmV0dXJuIG1hcDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgbWFwO1xuIiwiaW1wb3J0IG1hcCBmcm9tIFwiLi9tYXBcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBrZXlzID0gW10sXG4gICAgICBzb3J0S2V5cyA9IFtdLFxuICAgICAgc29ydFZhbHVlcyxcbiAgICAgIHJvbGx1cCxcbiAgICAgIG5lc3Q7XG5cbiAgZnVuY3Rpb24gYXBwbHkoYXJyYXksIGRlcHRoLCBjcmVhdGVSZXN1bHQsIHNldFJlc3VsdCkge1xuICAgIGlmIChkZXB0aCA+PSBrZXlzLmxlbmd0aCkge1xuICAgICAgaWYgKHNvcnRWYWx1ZXMgIT0gbnVsbCkgYXJyYXkuc29ydChzb3J0VmFsdWVzKTtcbiAgICAgIHJldHVybiByb2xsdXAgIT0gbnVsbCA/IHJvbGx1cChhcnJheSkgOiBhcnJheTtcbiAgICB9XG5cbiAgICB2YXIgaSA9IC0xLFxuICAgICAgICBuID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICBrZXkgPSBrZXlzW2RlcHRoKytdLFxuICAgICAgICBrZXlWYWx1ZSxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIHZhbHVlc0J5S2V5ID0gbWFwKCksXG4gICAgICAgIHZhbHVlcyxcbiAgICAgICAgcmVzdWx0ID0gY3JlYXRlUmVzdWx0KCk7XG5cbiAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgaWYgKHZhbHVlcyA9IHZhbHVlc0J5S2V5LmdldChrZXlWYWx1ZSA9IGtleSh2YWx1ZSA9IGFycmF5W2ldKSArIFwiXCIpKSB7XG4gICAgICAgIHZhbHVlcy5wdXNoKHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlc0J5S2V5LnNldChrZXlWYWx1ZSwgW3ZhbHVlXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFsdWVzQnlLZXkuZWFjaChmdW5jdGlvbih2YWx1ZXMsIGtleSkge1xuICAgICAgc2V0UmVzdWx0KHJlc3VsdCwga2V5LCBhcHBseSh2YWx1ZXMsIGRlcHRoLCBjcmVhdGVSZXN1bHQsIHNldFJlc3VsdCkpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVudHJpZXMobWFwLCBkZXB0aCkge1xuICAgIGlmICgrK2RlcHRoID4ga2V5cy5sZW5ndGgpIHJldHVybiBtYXA7XG4gICAgdmFyIGFycmF5LCBzb3J0S2V5ID0gc29ydEtleXNbZGVwdGggLSAxXTtcbiAgICBpZiAocm9sbHVwICE9IG51bGwgJiYgZGVwdGggPj0ga2V5cy5sZW5ndGgpIGFycmF5ID0gbWFwLmVudHJpZXMoKTtcbiAgICBlbHNlIGFycmF5ID0gW10sIG1hcC5lYWNoKGZ1bmN0aW9uKHYsIGspIHsgYXJyYXkucHVzaCh7a2V5OiBrLCB2YWx1ZXM6IGVudHJpZXModiwgZGVwdGgpfSk7IH0pO1xuICAgIHJldHVybiBzb3J0S2V5ICE9IG51bGwgPyBhcnJheS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIHNvcnRLZXkoYS5rZXksIGIua2V5KTsgfSkgOiBhcnJheTtcbiAgfVxuXG4gIHJldHVybiBuZXN0ID0ge1xuICAgIG9iamVjdDogZnVuY3Rpb24oYXJyYXkpIHsgcmV0dXJuIGFwcGx5KGFycmF5LCAwLCBjcmVhdGVPYmplY3QsIHNldE9iamVjdCk7IH0sXG4gICAgbWFwOiBmdW5jdGlvbihhcnJheSkgeyByZXR1cm4gYXBwbHkoYXJyYXksIDAsIGNyZWF0ZU1hcCwgc2V0TWFwKTsgfSxcbiAgICBlbnRyaWVzOiBmdW5jdGlvbihhcnJheSkgeyByZXR1cm4gZW50cmllcyhhcHBseShhcnJheSwgMCwgY3JlYXRlTWFwLCBzZXRNYXApLCAwKTsgfSxcbiAgICBrZXk6IGZ1bmN0aW9uKGQpIHsga2V5cy5wdXNoKGQpOyByZXR1cm4gbmVzdDsgfSxcbiAgICBzb3J0S2V5czogZnVuY3Rpb24ob3JkZXIpIHsgc29ydEtleXNba2V5cy5sZW5ndGggLSAxXSA9IG9yZGVyOyByZXR1cm4gbmVzdDsgfSxcbiAgICBzb3J0VmFsdWVzOiBmdW5jdGlvbihvcmRlcikgeyBzb3J0VmFsdWVzID0gb3JkZXI7IHJldHVybiBuZXN0OyB9LFxuICAgIHJvbGx1cDogZnVuY3Rpb24oZikgeyByb2xsdXAgPSBmOyByZXR1cm4gbmVzdDsgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVPYmplY3QoKSB7XG4gIHJldHVybiB7fTtcbn1cblxuZnVuY3Rpb24gc2V0T2JqZWN0KG9iamVjdCwga2V5LCB2YWx1ZSkge1xuICBvYmplY3Rba2V5XSA9IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNYXAoKSB7XG4gIHJldHVybiBtYXAoKTtcbn1cblxuZnVuY3Rpb24gc2V0TWFwKG1hcCwga2V5LCB2YWx1ZSkge1xuICBtYXAuc2V0KGtleSwgdmFsdWUpO1xufVxuIiwidmFyIGFycmF5ID0gQXJyYXkucHJvdG90eXBlO1xuXG5leHBvcnQgdmFyIG1hcCA9IGFycmF5Lm1hcDtcbmV4cG9ydCB2YXIgc2xpY2UgPSBhcnJheS5zbGljZTtcbiIsImltcG9ydCB7bWFwfSBmcm9tIFwiZDMtY29sbGVjdGlvblwiO1xuaW1wb3J0IHtzbGljZX0gZnJvbSBcIi4vYXJyYXlcIjtcblxuZXhwb3J0IHZhciBpbXBsaWNpdCA9IHtuYW1lOiBcImltcGxpY2l0XCJ9O1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBvcmRpbmFsKHJhbmdlKSB7XG4gIHZhciBpbmRleCA9IG1hcCgpLFxuICAgICAgZG9tYWluID0gW10sXG4gICAgICB1bmtub3duID0gaW1wbGljaXQ7XG5cbiAgcmFuZ2UgPSByYW5nZSA9PSBudWxsID8gW10gOiBzbGljZS5jYWxsKHJhbmdlKTtcblxuICBmdW5jdGlvbiBzY2FsZShkKSB7XG4gICAgdmFyIGtleSA9IGQgKyBcIlwiLCBpID0gaW5kZXguZ2V0KGtleSk7XG4gICAgaWYgKCFpKSB7XG4gICAgICBpZiAodW5rbm93biAhPT0gaW1wbGljaXQpIHJldHVybiB1bmtub3duO1xuICAgICAgaW5kZXguc2V0KGtleSwgaSA9IGRvbWFpbi5wdXNoKGQpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJhbmdlWyhpIC0gMSkgJSByYW5nZS5sZW5ndGhdO1xuICB9XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRvbWFpbi5zbGljZSgpO1xuICAgIGRvbWFpbiA9IFtdLCBpbmRleCA9IG1hcCgpO1xuICAgIHZhciBpID0gLTEsIG4gPSBfLmxlbmd0aCwgZCwga2V5O1xuICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoIWluZGV4LmhhcyhrZXkgPSAoZCA9IF9baV0pICsgXCJcIikpIGluZGV4LnNldChrZXksIGRvbWFpbi5wdXNoKGQpKTtcbiAgICByZXR1cm4gc2NhbGU7XG4gIH07XG5cbiAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocmFuZ2UgPSBzbGljZS5jYWxsKF8pLCBzY2FsZSkgOiByYW5nZS5zbGljZSgpO1xuICB9O1xuXG4gIHNjYWxlLnVua25vd24gPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodW5rbm93biA9IF8sIHNjYWxlKSA6IHVua25vd247XG4gIH07XG5cbiAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBvcmRpbmFsKClcbiAgICAgICAgLmRvbWFpbihkb21haW4pXG4gICAgICAgIC5yYW5nZShyYW5nZSlcbiAgICAgICAgLnVua25vd24odW5rbm93bik7XG4gIH07XG5cbiAgcmV0dXJuIHNjYWxlO1xufVxuIiwiaW1wb3J0IHtyYW5nZSBhcyBzZXF1ZW5jZX0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQgb3JkaW5hbCBmcm9tIFwiLi9vcmRpbmFsXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGJhbmQoKSB7XG4gIHZhciBzY2FsZSA9IG9yZGluYWwoKS51bmtub3duKHVuZGVmaW5lZCksXG4gICAgICBkb21haW4gPSBzY2FsZS5kb21haW4sXG4gICAgICBvcmRpbmFsUmFuZ2UgPSBzY2FsZS5yYW5nZSxcbiAgICAgIHJhbmdlID0gWzAsIDFdLFxuICAgICAgc3RlcCxcbiAgICAgIGJhbmR3aWR0aCxcbiAgICAgIHJvdW5kID0gZmFsc2UsXG4gICAgICBwYWRkaW5nSW5uZXIgPSAwLFxuICAgICAgcGFkZGluZ091dGVyID0gMCxcbiAgICAgIGFsaWduID0gMC41O1xuXG4gIGRlbGV0ZSBzY2FsZS51bmtub3duO1xuXG4gIGZ1bmN0aW9uIHJlc2NhbGUoKSB7XG4gICAgdmFyIG4gPSBkb21haW4oKS5sZW5ndGgsXG4gICAgICAgIHJldmVyc2UgPSByYW5nZVsxXSA8IHJhbmdlWzBdLFxuICAgICAgICBzdGFydCA9IHJhbmdlW3JldmVyc2UgLSAwXSxcbiAgICAgICAgc3RvcCA9IHJhbmdlWzEgLSByZXZlcnNlXTtcbiAgICBzdGVwID0gKHN0b3AgLSBzdGFydCkgLyBNYXRoLm1heCgxLCBuIC0gcGFkZGluZ0lubmVyICsgcGFkZGluZ091dGVyICogMik7XG4gICAgaWYgKHJvdW5kKSBzdGVwID0gTWF0aC5mbG9vcihzdGVwKTtcbiAgICBzdGFydCArPSAoc3RvcCAtIHN0YXJ0IC0gc3RlcCAqIChuIC0gcGFkZGluZ0lubmVyKSkgKiBhbGlnbjtcbiAgICBiYW5kd2lkdGggPSBzdGVwICogKDEgLSBwYWRkaW5nSW5uZXIpO1xuICAgIGlmIChyb3VuZCkgc3RhcnQgPSBNYXRoLnJvdW5kKHN0YXJ0KSwgYmFuZHdpZHRoID0gTWF0aC5yb3VuZChiYW5kd2lkdGgpO1xuICAgIHZhciB2YWx1ZXMgPSBzZXF1ZW5jZShuKS5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gc3RhcnQgKyBzdGVwICogaTsgfSk7XG4gICAgcmV0dXJuIG9yZGluYWxSYW5nZShyZXZlcnNlID8gdmFsdWVzLnJldmVyc2UoKSA6IHZhbHVlcyk7XG4gIH1cblxuICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZG9tYWluKF8pLCByZXNjYWxlKCkpIDogZG9tYWluKCk7XG4gIH07XG5cbiAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocmFuZ2UgPSBbK19bMF0sICtfWzFdXSwgcmVzY2FsZSgpKSA6IHJhbmdlLnNsaWNlKCk7XG4gIH07XG5cbiAgc2NhbGUucmFuZ2VSb3VuZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gcmFuZ2UgPSBbK19bMF0sICtfWzFdXSwgcm91bmQgPSB0cnVlLCByZXNjYWxlKCk7XG4gIH07XG5cbiAgc2NhbGUuYmFuZHdpZHRoID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGJhbmR3aWR0aDtcbiAgfTtcblxuICBzY2FsZS5zdGVwID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHN0ZXA7XG4gIH07XG5cbiAgc2NhbGUucm91bmQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocm91bmQgPSAhIV8sIHJlc2NhbGUoKSkgOiByb3VuZDtcbiAgfTtcblxuICBzY2FsZS5wYWRkaW5nID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHBhZGRpbmdJbm5lciA9IHBhZGRpbmdPdXRlciA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIF8pKSwgcmVzY2FsZSgpKSA6IHBhZGRpbmdJbm5lcjtcbiAgfTtcblxuICBzY2FsZS5wYWRkaW5nSW5uZXIgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkZGluZ0lubmVyID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgXykpLCByZXNjYWxlKCkpIDogcGFkZGluZ0lubmVyO1xuICB9O1xuXG4gIHNjYWxlLnBhZGRpbmdPdXRlciA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChwYWRkaW5nT3V0ZXIgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBfKSksIHJlc2NhbGUoKSkgOiBwYWRkaW5nT3V0ZXI7XG4gIH07XG5cbiAgc2NhbGUuYWxpZ24gPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoYWxpZ24gPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBfKSksIHJlc2NhbGUoKSkgOiBhbGlnbjtcbiAgfTtcblxuICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGJhbmQoKVxuICAgICAgICAuZG9tYWluKGRvbWFpbigpKVxuICAgICAgICAucmFuZ2UocmFuZ2UpXG4gICAgICAgIC5yb3VuZChyb3VuZClcbiAgICAgICAgLnBhZGRpbmdJbm5lcihwYWRkaW5nSW5uZXIpXG4gICAgICAgIC5wYWRkaW5nT3V0ZXIocGFkZGluZ091dGVyKVxuICAgICAgICAuYWxpZ24oYWxpZ24pO1xuICB9O1xuXG4gIHJldHVybiByZXNjYWxlKCk7XG59XG5cbmZ1bmN0aW9uIHBvaW50aXNoKHNjYWxlKSB7XG4gIHZhciBjb3B5ID0gc2NhbGUuY29weTtcblxuICBzY2FsZS5wYWRkaW5nID0gc2NhbGUucGFkZGluZ091dGVyO1xuICBkZWxldGUgc2NhbGUucGFkZGluZ0lubmVyO1xuICBkZWxldGUgc2NhbGUucGFkZGluZ091dGVyO1xuXG4gIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcG9pbnRpc2goY29weSgpKTtcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwb2ludCgpIHtcbiAgcmV0dXJuIHBvaW50aXNoKGJhbmQoKS5wYWRkaW5nSW5uZXIoMSkpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29uc3RydWN0b3IsIGZhY3RvcnksIHByb3RvdHlwZSkge1xuICBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBmYWN0b3J5LnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgcHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY29uc3RydWN0b3I7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmQocGFyZW50LCBkZWZpbml0aW9uKSB7XG4gIHZhciBwcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUpO1xuICBmb3IgKHZhciBrZXkgaW4gZGVmaW5pdGlvbikgcHJvdG90eXBlW2tleV0gPSBkZWZpbml0aW9uW2tleV07XG4gIHJldHVybiBwcm90b3R5cGU7XG59XG4iLCJpbXBvcnQgZGVmaW5lLCB7ZXh0ZW5kfSBmcm9tIFwiLi9kZWZpbmVcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIENvbG9yKCkge31cblxuZXhwb3J0IHZhciBkYXJrZXIgPSAwLjc7XG5leHBvcnQgdmFyIGJyaWdodGVyID0gMSAvIGRhcmtlcjtcblxudmFyIHJlSSA9IFwiXFxcXHMqKFsrLV0/XFxcXGQrKVxcXFxzKlwiLFxuICAgIHJlTiA9IFwiXFxcXHMqKFsrLV0/XFxcXGQqXFxcXC4/XFxcXGQrKD86W2VFXVsrLV0/XFxcXGQrKT8pXFxcXHMqXCIsXG4gICAgcmVQID0gXCJcXFxccyooWystXT9cXFxcZCpcXFxcLj9cXFxcZCsoPzpbZUVdWystXT9cXFxcZCspPyklXFxcXHMqXCIsXG4gICAgcmVIZXgzID0gL14jKFswLTlhLWZdezN9KSQvLFxuICAgIHJlSGV4NiA9IC9eIyhbMC05YS1mXXs2fSkkLyxcbiAgICByZVJnYkludGVnZXIgPSBuZXcgUmVnRXhwKFwiXnJnYlxcXFwoXCIgKyBbcmVJLCByZUksIHJlSV0gKyBcIlxcXFwpJFwiKSxcbiAgICByZVJnYlBlcmNlbnQgPSBuZXcgUmVnRXhwKFwiXnJnYlxcXFwoXCIgKyBbcmVQLCByZVAsIHJlUF0gKyBcIlxcXFwpJFwiKSxcbiAgICByZVJnYmFJbnRlZ2VyID0gbmV3IFJlZ0V4cChcIl5yZ2JhXFxcXChcIiArIFtyZUksIHJlSSwgcmVJLCByZU5dICsgXCJcXFxcKSRcIiksXG4gICAgcmVSZ2JhUGVyY2VudCA9IG5ldyBSZWdFeHAoXCJecmdiYVxcXFwoXCIgKyBbcmVQLCByZVAsIHJlUCwgcmVOXSArIFwiXFxcXCkkXCIpLFxuICAgIHJlSHNsUGVyY2VudCA9IG5ldyBSZWdFeHAoXCJeaHNsXFxcXChcIiArIFtyZU4sIHJlUCwgcmVQXSArIFwiXFxcXCkkXCIpLFxuICAgIHJlSHNsYVBlcmNlbnQgPSBuZXcgUmVnRXhwKFwiXmhzbGFcXFxcKFwiICsgW3JlTiwgcmVQLCByZVAsIHJlTl0gKyBcIlxcXFwpJFwiKTtcblxudmFyIG5hbWVkID0ge1xuICBhbGljZWJsdWU6IDB4ZjBmOGZmLFxuICBhbnRpcXVld2hpdGU6IDB4ZmFlYmQ3LFxuICBhcXVhOiAweDAwZmZmZixcbiAgYXF1YW1hcmluZTogMHg3ZmZmZDQsXG4gIGF6dXJlOiAweGYwZmZmZixcbiAgYmVpZ2U6IDB4ZjVmNWRjLFxuICBiaXNxdWU6IDB4ZmZlNGM0LFxuICBibGFjazogMHgwMDAwMDAsXG4gIGJsYW5jaGVkYWxtb25kOiAweGZmZWJjZCxcbiAgYmx1ZTogMHgwMDAwZmYsXG4gIGJsdWV2aW9sZXQ6IDB4OGEyYmUyLFxuICBicm93bjogMHhhNTJhMmEsXG4gIGJ1cmx5d29vZDogMHhkZWI4ODcsXG4gIGNhZGV0Ymx1ZTogMHg1ZjllYTAsXG4gIGNoYXJ0cmV1c2U6IDB4N2ZmZjAwLFxuICBjaG9jb2xhdGU6IDB4ZDI2OTFlLFxuICBjb3JhbDogMHhmZjdmNTAsXG4gIGNvcm5mbG93ZXJibHVlOiAweDY0OTVlZCxcbiAgY29ybnNpbGs6IDB4ZmZmOGRjLFxuICBjcmltc29uOiAweGRjMTQzYyxcbiAgY3lhbjogMHgwMGZmZmYsXG4gIGRhcmtibHVlOiAweDAwMDA4YixcbiAgZGFya2N5YW46IDB4MDA4YjhiLFxuICBkYXJrZ29sZGVucm9kOiAweGI4ODYwYixcbiAgZGFya2dyYXk6IDB4YTlhOWE5LFxuICBkYXJrZ3JlZW46IDB4MDA2NDAwLFxuICBkYXJrZ3JleTogMHhhOWE5YTksXG4gIGRhcmtraGFraTogMHhiZGI3NmIsXG4gIGRhcmttYWdlbnRhOiAweDhiMDA4YixcbiAgZGFya29saXZlZ3JlZW46IDB4NTU2YjJmLFxuICBkYXJrb3JhbmdlOiAweGZmOGMwMCxcbiAgZGFya29yY2hpZDogMHg5OTMyY2MsXG4gIGRhcmtyZWQ6IDB4OGIwMDAwLFxuICBkYXJrc2FsbW9uOiAweGU5OTY3YSxcbiAgZGFya3NlYWdyZWVuOiAweDhmYmM4ZixcbiAgZGFya3NsYXRlYmx1ZTogMHg0ODNkOGIsXG4gIGRhcmtzbGF0ZWdyYXk6IDB4MmY0ZjRmLFxuICBkYXJrc2xhdGVncmV5OiAweDJmNGY0ZixcbiAgZGFya3R1cnF1b2lzZTogMHgwMGNlZDEsXG4gIGRhcmt2aW9sZXQ6IDB4OTQwMGQzLFxuICBkZWVwcGluazogMHhmZjE0OTMsXG4gIGRlZXBza3libHVlOiAweDAwYmZmZixcbiAgZGltZ3JheTogMHg2OTY5NjksXG4gIGRpbWdyZXk6IDB4Njk2OTY5LFxuICBkb2RnZXJibHVlOiAweDFlOTBmZixcbiAgZmlyZWJyaWNrOiAweGIyMjIyMixcbiAgZmxvcmFsd2hpdGU6IDB4ZmZmYWYwLFxuICBmb3Jlc3RncmVlbjogMHgyMjhiMjIsXG4gIGZ1Y2hzaWE6IDB4ZmYwMGZmLFxuICBnYWluc2Jvcm86IDB4ZGNkY2RjLFxuICBnaG9zdHdoaXRlOiAweGY4ZjhmZixcbiAgZ29sZDogMHhmZmQ3MDAsXG4gIGdvbGRlbnJvZDogMHhkYWE1MjAsXG4gIGdyYXk6IDB4ODA4MDgwLFxuICBncmVlbjogMHgwMDgwMDAsXG4gIGdyZWVueWVsbG93OiAweGFkZmYyZixcbiAgZ3JleTogMHg4MDgwODAsXG4gIGhvbmV5ZGV3OiAweGYwZmZmMCxcbiAgaG90cGluazogMHhmZjY5YjQsXG4gIGluZGlhbnJlZDogMHhjZDVjNWMsXG4gIGluZGlnbzogMHg0YjAwODIsXG4gIGl2b3J5OiAweGZmZmZmMCxcbiAga2hha2k6IDB4ZjBlNjhjLFxuICBsYXZlbmRlcjogMHhlNmU2ZmEsXG4gIGxhdmVuZGVyYmx1c2g6IDB4ZmZmMGY1LFxuICBsYXduZ3JlZW46IDB4N2NmYzAwLFxuICBsZW1vbmNoaWZmb246IDB4ZmZmYWNkLFxuICBsaWdodGJsdWU6IDB4YWRkOGU2LFxuICBsaWdodGNvcmFsOiAweGYwODA4MCxcbiAgbGlnaHRjeWFuOiAweGUwZmZmZixcbiAgbGlnaHRnb2xkZW5yb2R5ZWxsb3c6IDB4ZmFmYWQyLFxuICBsaWdodGdyYXk6IDB4ZDNkM2QzLFxuICBsaWdodGdyZWVuOiAweDkwZWU5MCxcbiAgbGlnaHRncmV5OiAweGQzZDNkMyxcbiAgbGlnaHRwaW5rOiAweGZmYjZjMSxcbiAgbGlnaHRzYWxtb246IDB4ZmZhMDdhLFxuICBsaWdodHNlYWdyZWVuOiAweDIwYjJhYSxcbiAgbGlnaHRza3libHVlOiAweDg3Y2VmYSxcbiAgbGlnaHRzbGF0ZWdyYXk6IDB4Nzc4ODk5LFxuICBsaWdodHNsYXRlZ3JleTogMHg3Nzg4OTksXG4gIGxpZ2h0c3RlZWxibHVlOiAweGIwYzRkZSxcbiAgbGlnaHR5ZWxsb3c6IDB4ZmZmZmUwLFxuICBsaW1lOiAweDAwZmYwMCxcbiAgbGltZWdyZWVuOiAweDMyY2QzMixcbiAgbGluZW46IDB4ZmFmMGU2LFxuICBtYWdlbnRhOiAweGZmMDBmZixcbiAgbWFyb29uOiAweDgwMDAwMCxcbiAgbWVkaXVtYXF1YW1hcmluZTogMHg2NmNkYWEsXG4gIG1lZGl1bWJsdWU6IDB4MDAwMGNkLFxuICBtZWRpdW1vcmNoaWQ6IDB4YmE1NWQzLFxuICBtZWRpdW1wdXJwbGU6IDB4OTM3MGRiLFxuICBtZWRpdW1zZWFncmVlbjogMHgzY2IzNzEsXG4gIG1lZGl1bXNsYXRlYmx1ZTogMHg3YjY4ZWUsXG4gIG1lZGl1bXNwcmluZ2dyZWVuOiAweDAwZmE5YSxcbiAgbWVkaXVtdHVycXVvaXNlOiAweDQ4ZDFjYyxcbiAgbWVkaXVtdmlvbGV0cmVkOiAweGM3MTU4NSxcbiAgbWlkbmlnaHRibHVlOiAweDE5MTk3MCxcbiAgbWludGNyZWFtOiAweGY1ZmZmYSxcbiAgbWlzdHlyb3NlOiAweGZmZTRlMSxcbiAgbW9jY2FzaW46IDB4ZmZlNGI1LFxuICBuYXZham93aGl0ZTogMHhmZmRlYWQsXG4gIG5hdnk6IDB4MDAwMDgwLFxuICBvbGRsYWNlOiAweGZkZjVlNixcbiAgb2xpdmU6IDB4ODA4MDAwLFxuICBvbGl2ZWRyYWI6IDB4NmI4ZTIzLFxuICBvcmFuZ2U6IDB4ZmZhNTAwLFxuICBvcmFuZ2VyZWQ6IDB4ZmY0NTAwLFxuICBvcmNoaWQ6IDB4ZGE3MGQ2LFxuICBwYWxlZ29sZGVucm9kOiAweGVlZThhYSxcbiAgcGFsZWdyZWVuOiAweDk4ZmI5OCxcbiAgcGFsZXR1cnF1b2lzZTogMHhhZmVlZWUsXG4gIHBhbGV2aW9sZXRyZWQ6IDB4ZGI3MDkzLFxuICBwYXBheWF3aGlwOiAweGZmZWZkNSxcbiAgcGVhY2hwdWZmOiAweGZmZGFiOSxcbiAgcGVydTogMHhjZDg1M2YsXG4gIHBpbms6IDB4ZmZjMGNiLFxuICBwbHVtOiAweGRkYTBkZCxcbiAgcG93ZGVyYmx1ZTogMHhiMGUwZTYsXG4gIHB1cnBsZTogMHg4MDAwODAsXG4gIHJlYmVjY2FwdXJwbGU6IDB4NjYzMzk5LFxuICByZWQ6IDB4ZmYwMDAwLFxuICByb3N5YnJvd246IDB4YmM4ZjhmLFxuICByb3lhbGJsdWU6IDB4NDE2OWUxLFxuICBzYWRkbGVicm93bjogMHg4YjQ1MTMsXG4gIHNhbG1vbjogMHhmYTgwNzIsXG4gIHNhbmR5YnJvd246IDB4ZjRhNDYwLFxuICBzZWFncmVlbjogMHgyZThiNTcsXG4gIHNlYXNoZWxsOiAweGZmZjVlZSxcbiAgc2llbm5hOiAweGEwNTIyZCxcbiAgc2lsdmVyOiAweGMwYzBjMCxcbiAgc2t5Ymx1ZTogMHg4N2NlZWIsXG4gIHNsYXRlYmx1ZTogMHg2YTVhY2QsXG4gIHNsYXRlZ3JheTogMHg3MDgwOTAsXG4gIHNsYXRlZ3JleTogMHg3MDgwOTAsXG4gIHNub3c6IDB4ZmZmYWZhLFxuICBzcHJpbmdncmVlbjogMHgwMGZmN2YsXG4gIHN0ZWVsYmx1ZTogMHg0NjgyYjQsXG4gIHRhbjogMHhkMmI0OGMsXG4gIHRlYWw6IDB4MDA4MDgwLFxuICB0aGlzdGxlOiAweGQ4YmZkOCxcbiAgdG9tYXRvOiAweGZmNjM0NyxcbiAgdHVycXVvaXNlOiAweDQwZTBkMCxcbiAgdmlvbGV0OiAweGVlODJlZSxcbiAgd2hlYXQ6IDB4ZjVkZWIzLFxuICB3aGl0ZTogMHhmZmZmZmYsXG4gIHdoaXRlc21va2U6IDB4ZjVmNWY1LFxuICB5ZWxsb3c6IDB4ZmZmZjAwLFxuICB5ZWxsb3dncmVlbjogMHg5YWNkMzJcbn07XG5cbmRlZmluZShDb2xvciwgY29sb3IsIHtcbiAgZGlzcGxheWFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnJnYigpLmRpc3BsYXlhYmxlKCk7XG4gIH0sXG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5yZ2IoKSArIFwiXCI7XG4gIH1cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb2xvcihmb3JtYXQpIHtcbiAgdmFyIG07XG4gIGZvcm1hdCA9IChmb3JtYXQgKyBcIlwiKS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIChtID0gcmVIZXgzLmV4ZWMoZm9ybWF0KSkgPyAobSA9IHBhcnNlSW50KG1bMV0sIDE2KSwgbmV3IFJnYigobSA+PiA4ICYgMHhmKSB8IChtID4+IDQgJiAweDBmMCksIChtID4+IDQgJiAweGYpIHwgKG0gJiAweGYwKSwgKChtICYgMHhmKSA8PCA0KSB8IChtICYgMHhmKSwgMSkpIC8vICNmMDBcbiAgICAgIDogKG0gPSByZUhleDYuZXhlYyhmb3JtYXQpKSA/IHJnYm4ocGFyc2VJbnQobVsxXSwgMTYpKSAvLyAjZmYwMDAwXG4gICAgICA6IChtID0gcmVSZ2JJbnRlZ2VyLmV4ZWMoZm9ybWF0KSkgPyBuZXcgUmdiKG1bMV0sIG1bMl0sIG1bM10sIDEpIC8vIHJnYigyNTUsIDAsIDApXG4gICAgICA6IChtID0gcmVSZ2JQZXJjZW50LmV4ZWMoZm9ybWF0KSkgPyBuZXcgUmdiKG1bMV0gKiAyNTUgLyAxMDAsIG1bMl0gKiAyNTUgLyAxMDAsIG1bM10gKiAyNTUgLyAxMDAsIDEpIC8vIHJnYigxMDAlLCAwJSwgMCUpXG4gICAgICA6IChtID0gcmVSZ2JhSW50ZWdlci5leGVjKGZvcm1hdCkpID8gcmdiYShtWzFdLCBtWzJdLCBtWzNdLCBtWzRdKSAvLyByZ2JhKDI1NSwgMCwgMCwgMSlcbiAgICAgIDogKG0gPSByZVJnYmFQZXJjZW50LmV4ZWMoZm9ybWF0KSkgPyByZ2JhKG1bMV0gKiAyNTUgLyAxMDAsIG1bMl0gKiAyNTUgLyAxMDAsIG1bM10gKiAyNTUgLyAxMDAsIG1bNF0pIC8vIHJnYigxMDAlLCAwJSwgMCUsIDEpXG4gICAgICA6IChtID0gcmVIc2xQZXJjZW50LmV4ZWMoZm9ybWF0KSkgPyBoc2xhKG1bMV0sIG1bMl0gLyAxMDAsIG1bM10gLyAxMDAsIDEpIC8vIGhzbCgxMjAsIDUwJSwgNTAlKVxuICAgICAgOiAobSA9IHJlSHNsYVBlcmNlbnQuZXhlYyhmb3JtYXQpKSA/IGhzbGEobVsxXSwgbVsyXSAvIDEwMCwgbVszXSAvIDEwMCwgbVs0XSkgLy8gaHNsYSgxMjAsIDUwJSwgNTAlLCAxKVxuICAgICAgOiBuYW1lZC5oYXNPd25Qcm9wZXJ0eShmb3JtYXQpID8gcmdibihuYW1lZFtmb3JtYXRdKVxuICAgICAgOiBmb3JtYXQgPT09IFwidHJhbnNwYXJlbnRcIiA/IG5ldyBSZ2IoTmFOLCBOYU4sIE5hTiwgMClcbiAgICAgIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gcmdibihuKSB7XG4gIHJldHVybiBuZXcgUmdiKG4gPj4gMTYgJiAweGZmLCBuID4+IDggJiAweGZmLCBuICYgMHhmZiwgMSk7XG59XG5cbmZ1bmN0aW9uIHJnYmEociwgZywgYiwgYSkge1xuICBpZiAoYSA8PSAwKSByID0gZyA9IGIgPSBOYU47XG4gIHJldHVybiBuZXcgUmdiKHIsIGcsIGIsIGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmdiQ29udmVydChvKSB7XG4gIGlmICghKG8gaW5zdGFuY2VvZiBDb2xvcikpIG8gPSBjb2xvcihvKTtcbiAgaWYgKCFvKSByZXR1cm4gbmV3IFJnYjtcbiAgbyA9IG8ucmdiKCk7XG4gIHJldHVybiBuZXcgUmdiKG8uciwgby5nLCBvLmIsIG8ub3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZ2IociwgZywgYiwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IHJnYkNvbnZlcnQocikgOiBuZXcgUmdiKHIsIGcsIGIsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFJnYihyLCBnLCBiLCBvcGFjaXR5KSB7XG4gIHRoaXMuciA9ICtyO1xuICB0aGlzLmcgPSArZztcbiAgdGhpcy5iID0gK2I7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoUmdiLCByZ2IsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBicmlnaHRlciA6IE1hdGgucG93KGJyaWdodGVyLCBrKTtcbiAgICByZXR1cm4gbmV3IFJnYih0aGlzLnIgKiBrLCB0aGlzLmcgKiBrLCB0aGlzLmIgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICBkYXJrZXI6IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gZGFya2VyIDogTWF0aC5wb3coZGFya2VyLCBrKTtcbiAgICByZXR1cm4gbmV3IFJnYih0aGlzLnIgKiBrLCB0aGlzLmcgKiBrLCB0aGlzLmIgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICByZ2I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBkaXNwbGF5YWJsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICgwIDw9IHRoaXMuciAmJiB0aGlzLnIgPD0gMjU1KVxuICAgICAgICAmJiAoMCA8PSB0aGlzLmcgJiYgdGhpcy5nIDw9IDI1NSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5iICYmIHRoaXMuYiA8PSAyNTUpXG4gICAgICAgICYmICgwIDw9IHRoaXMub3BhY2l0eSAmJiB0aGlzLm9wYWNpdHkgPD0gMSk7XG4gIH0sXG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYSA9IHRoaXMub3BhY2l0eTsgYSA9IGlzTmFOKGEpID8gMSA6IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIGEpKTtcbiAgICByZXR1cm4gKGEgPT09IDEgPyBcInJnYihcIiA6IFwicmdiYShcIilcbiAgICAgICAgKyBNYXRoLm1heCgwLCBNYXRoLm1pbigyNTUsIE1hdGgucm91bmQodGhpcy5yKSB8fCAwKSkgKyBcIiwgXCJcbiAgICAgICAgKyBNYXRoLm1heCgwLCBNYXRoLm1pbigyNTUsIE1hdGgucm91bmQodGhpcy5nKSB8fCAwKSkgKyBcIiwgXCJcbiAgICAgICAgKyBNYXRoLm1heCgwLCBNYXRoLm1pbigyNTUsIE1hdGgucm91bmQodGhpcy5iKSB8fCAwKSlcbiAgICAgICAgKyAoYSA9PT0gMSA/IFwiKVwiIDogXCIsIFwiICsgYSArIFwiKVwiKTtcbiAgfVxufSkpO1xuXG5mdW5jdGlvbiBoc2xhKGgsIHMsIGwsIGEpIHtcbiAgaWYgKGEgPD0gMCkgaCA9IHMgPSBsID0gTmFOO1xuICBlbHNlIGlmIChsIDw9IDAgfHwgbCA+PSAxKSBoID0gcyA9IE5hTjtcbiAgZWxzZSBpZiAocyA8PSAwKSBoID0gTmFOO1xuICByZXR1cm4gbmV3IEhzbChoLCBzLCBsLCBhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhzbENvbnZlcnQobykge1xuICBpZiAobyBpbnN0YW5jZW9mIEhzbCkgcmV0dXJuIG5ldyBIc2woby5oLCBvLnMsIG8ubCwgby5vcGFjaXR5KTtcbiAgaWYgKCEobyBpbnN0YW5jZW9mIENvbG9yKSkgbyA9IGNvbG9yKG8pO1xuICBpZiAoIW8pIHJldHVybiBuZXcgSHNsO1xuICBpZiAobyBpbnN0YW5jZW9mIEhzbCkgcmV0dXJuIG87XG4gIG8gPSBvLnJnYigpO1xuICB2YXIgciA9IG8uciAvIDI1NSxcbiAgICAgIGcgPSBvLmcgLyAyNTUsXG4gICAgICBiID0gby5iIC8gMjU1LFxuICAgICAgbWluID0gTWF0aC5taW4ociwgZywgYiksXG4gICAgICBtYXggPSBNYXRoLm1heChyLCBnLCBiKSxcbiAgICAgIGggPSBOYU4sXG4gICAgICBzID0gbWF4IC0gbWluLFxuICAgICAgbCA9IChtYXggKyBtaW4pIC8gMjtcbiAgaWYgKHMpIHtcbiAgICBpZiAociA9PT0gbWF4KSBoID0gKGcgLSBiKSAvIHMgKyAoZyA8IGIpICogNjtcbiAgICBlbHNlIGlmIChnID09PSBtYXgpIGggPSAoYiAtIHIpIC8gcyArIDI7XG4gICAgZWxzZSBoID0gKHIgLSBnKSAvIHMgKyA0O1xuICAgIHMgLz0gbCA8IDAuNSA/IG1heCArIG1pbiA6IDIgLSBtYXggLSBtaW47XG4gICAgaCAqPSA2MDtcbiAgfSBlbHNlIHtcbiAgICBzID0gbCA+IDAgJiYgbCA8IDEgPyAwIDogaDtcbiAgfVxuICByZXR1cm4gbmV3IEhzbChoLCBzLCBsLCBvLm9wYWNpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaHNsKGgsIHMsIGwsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBoc2xDb252ZXJ0KGgpIDogbmV3IEhzbChoLCBzLCBsLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmZ1bmN0aW9uIEhzbChoLCBzLCBsLCBvcGFjaXR5KSB7XG4gIHRoaXMuaCA9ICtoO1xuICB0aGlzLnMgPSArcztcbiAgdGhpcy5sID0gK2w7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoSHNsLCBoc2wsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBicmlnaHRlciA6IE1hdGgucG93KGJyaWdodGVyLCBrKTtcbiAgICByZXR1cm4gbmV3IEhzbCh0aGlzLmgsIHRoaXMucywgdGhpcy5sICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGRhcmtlciA6IE1hdGgucG93KGRhcmtlciwgayk7XG4gICAgcmV0dXJuIG5ldyBIc2wodGhpcy5oLCB0aGlzLnMsIHRoaXMubCAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGggPSB0aGlzLmggJSAzNjAgKyAodGhpcy5oIDwgMCkgKiAzNjAsXG4gICAgICAgIHMgPSBpc05hTihoKSB8fCBpc05hTih0aGlzLnMpID8gMCA6IHRoaXMucyxcbiAgICAgICAgbCA9IHRoaXMubCxcbiAgICAgICAgbTIgPSBsICsgKGwgPCAwLjUgPyBsIDogMSAtIGwpICogcyxcbiAgICAgICAgbTEgPSAyICogbCAtIG0yO1xuICAgIHJldHVybiBuZXcgUmdiKFxuICAgICAgaHNsMnJnYihoID49IDI0MCA/IGggLSAyNDAgOiBoICsgMTIwLCBtMSwgbTIpLFxuICAgICAgaHNsMnJnYihoLCBtMSwgbTIpLFxuICAgICAgaHNsMnJnYihoIDwgMTIwID8gaCArIDI0MCA6IGggLSAxMjAsIG0xLCBtMiksXG4gICAgICB0aGlzLm9wYWNpdHlcbiAgICApO1xuICB9LFxuICBkaXNwbGF5YWJsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICgwIDw9IHRoaXMucyAmJiB0aGlzLnMgPD0gMSB8fCBpc05hTih0aGlzLnMpKVxuICAgICAgICAmJiAoMCA8PSB0aGlzLmwgJiYgdGhpcy5sIDw9IDEpXG4gICAgICAgICYmICgwIDw9IHRoaXMub3BhY2l0eSAmJiB0aGlzLm9wYWNpdHkgPD0gMSk7XG4gIH1cbn0pKTtcblxuLyogRnJvbSBGdkQgMTMuMzcsIENTUyBDb2xvciBNb2R1bGUgTGV2ZWwgMyAqL1xuZnVuY3Rpb24gaHNsMnJnYihoLCBtMSwgbTIpIHtcbiAgcmV0dXJuIChoIDwgNjAgPyBtMSArIChtMiAtIG0xKSAqIGggLyA2MFxuICAgICAgOiBoIDwgMTgwID8gbTJcbiAgICAgIDogaCA8IDI0MCA/IG0xICsgKG0yIC0gbTEpICogKDI0MCAtIGgpIC8gNjBcbiAgICAgIDogbTEpICogMjU1O1xufVxuIiwiZXhwb3J0IHZhciBkZWcycmFkID0gTWF0aC5QSSAvIDE4MDtcbmV4cG9ydCB2YXIgcmFkMmRlZyA9IDE4MCAvIE1hdGguUEk7XG4iLCJpbXBvcnQgZGVmaW5lLCB7ZXh0ZW5kfSBmcm9tIFwiLi9kZWZpbmVcIjtcbmltcG9ydCB7Q29sb3IsIHJnYkNvbnZlcnQsIFJnYn0gZnJvbSBcIi4vY29sb3JcIjtcbmltcG9ydCB7ZGVnMnJhZCwgcmFkMmRlZ30gZnJvbSBcIi4vbWF0aFwiO1xuXG52YXIgS24gPSAxOCxcbiAgICBYbiA9IDAuOTUwNDcwLCAvLyBENjUgc3RhbmRhcmQgcmVmZXJlbnRcbiAgICBZbiA9IDEsXG4gICAgWm4gPSAxLjA4ODgzMCxcbiAgICB0MCA9IDQgLyAyOSxcbiAgICB0MSA9IDYgLyAyOSxcbiAgICB0MiA9IDMgKiB0MSAqIHQxLFxuICAgIHQzID0gdDEgKiB0MSAqIHQxO1xuXG5mdW5jdGlvbiBsYWJDb252ZXJ0KG8pIHtcbiAgaWYgKG8gaW5zdGFuY2VvZiBMYWIpIHJldHVybiBuZXcgTGFiKG8ubCwgby5hLCBvLmIsIG8ub3BhY2l0eSk7XG4gIGlmIChvIGluc3RhbmNlb2YgSGNsKSB7XG4gICAgdmFyIGggPSBvLmggKiBkZWcycmFkO1xuICAgIHJldHVybiBuZXcgTGFiKG8ubCwgTWF0aC5jb3MoaCkgKiBvLmMsIE1hdGguc2luKGgpICogby5jLCBvLm9wYWNpdHkpO1xuICB9XG4gIGlmICghKG8gaW5zdGFuY2VvZiBSZ2IpKSBvID0gcmdiQ29udmVydChvKTtcbiAgdmFyIGIgPSByZ2IyeHl6KG8uciksXG4gICAgICBhID0gcmdiMnh5eihvLmcpLFxuICAgICAgbCA9IHJnYjJ4eXooby5iKSxcbiAgICAgIHggPSB4eXoybGFiKCgwLjQxMjQ1NjQgKiBiICsgMC4zNTc1NzYxICogYSArIDAuMTgwNDM3NSAqIGwpIC8gWG4pLFxuICAgICAgeSA9IHh5ejJsYWIoKDAuMjEyNjcyOSAqIGIgKyAwLjcxNTE1MjIgKiBhICsgMC4wNzIxNzUwICogbCkgLyBZbiksXG4gICAgICB6ID0geHl6MmxhYigoMC4wMTkzMzM5ICogYiArIDAuMTE5MTkyMCAqIGEgKyAwLjk1MDMwNDEgKiBsKSAvIFpuKTtcbiAgcmV0dXJuIG5ldyBMYWIoMTE2ICogeSAtIDE2LCA1MDAgKiAoeCAtIHkpLCAyMDAgKiAoeSAtIHopLCBvLm9wYWNpdHkpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBsYWIobCwgYSwgYiwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGxhYkNvbnZlcnQobCkgOiBuZXcgTGFiKGwsIGEsIGIsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIExhYihsLCBhLCBiLCBvcGFjaXR5KSB7XG4gIHRoaXMubCA9ICtsO1xuICB0aGlzLmEgPSArYTtcbiAgdGhpcy5iID0gK2I7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoTGFiLCBsYWIsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBuZXcgTGFiKHRoaXMubCArIEtuICogKGsgPT0gbnVsbCA/IDEgOiBrKSwgdGhpcy5hLCB0aGlzLmIsIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcjogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBuZXcgTGFiKHRoaXMubCAtIEtuICogKGsgPT0gbnVsbCA/IDEgOiBrKSwgdGhpcy5hLCB0aGlzLmIsIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHkgPSAodGhpcy5sICsgMTYpIC8gMTE2LFxuICAgICAgICB4ID0gaXNOYU4odGhpcy5hKSA/IHkgOiB5ICsgdGhpcy5hIC8gNTAwLFxuICAgICAgICB6ID0gaXNOYU4odGhpcy5iKSA/IHkgOiB5IC0gdGhpcy5iIC8gMjAwO1xuICAgIHkgPSBZbiAqIGxhYjJ4eXooeSk7XG4gICAgeCA9IFhuICogbGFiMnh5eih4KTtcbiAgICB6ID0gWm4gKiBsYWIyeHl6KHopO1xuICAgIHJldHVybiBuZXcgUmdiKFxuICAgICAgeHl6MnJnYiggMy4yNDA0NTQyICogeCAtIDEuNTM3MTM4NSAqIHkgLSAwLjQ5ODUzMTQgKiB6KSwgLy8gRDY1IC0+IHNSR0JcbiAgICAgIHh5ejJyZ2IoLTAuOTY5MjY2MCAqIHggKyAxLjg3NjAxMDggKiB5ICsgMC4wNDE1NTYwICogeiksXG4gICAgICB4eXoycmdiKCAwLjA1NTY0MzQgKiB4IC0gMC4yMDQwMjU5ICogeSArIDEuMDU3MjI1MiAqIHopLFxuICAgICAgdGhpcy5vcGFjaXR5XG4gICAgKTtcbiAgfVxufSkpO1xuXG5mdW5jdGlvbiB4eXoybGFiKHQpIHtcbiAgcmV0dXJuIHQgPiB0MyA/IE1hdGgucG93KHQsIDEgLyAzKSA6IHQgLyB0MiArIHQwO1xufVxuXG5mdW5jdGlvbiBsYWIyeHl6KHQpIHtcbiAgcmV0dXJuIHQgPiB0MSA/IHQgKiB0ICogdCA6IHQyICogKHQgLSB0MCk7XG59XG5cbmZ1bmN0aW9uIHh5ejJyZ2IoeCkge1xuICByZXR1cm4gMjU1ICogKHggPD0gMC4wMDMxMzA4ID8gMTIuOTIgKiB4IDogMS4wNTUgKiBNYXRoLnBvdyh4LCAxIC8gMi40KSAtIDAuMDU1KTtcbn1cblxuZnVuY3Rpb24gcmdiMnh5eih4KSB7XG4gIHJldHVybiAoeCAvPSAyNTUpIDw9IDAuMDQwNDUgPyB4IC8gMTIuOTIgOiBNYXRoLnBvdygoeCArIDAuMDU1KSAvIDEuMDU1LCAyLjQpO1xufVxuXG5mdW5jdGlvbiBoY2xDb252ZXJ0KG8pIHtcbiAgaWYgKG8gaW5zdGFuY2VvZiBIY2wpIHJldHVybiBuZXcgSGNsKG8uaCwgby5jLCBvLmwsIG8ub3BhY2l0eSk7XG4gIGlmICghKG8gaW5zdGFuY2VvZiBMYWIpKSBvID0gbGFiQ29udmVydChvKTtcbiAgdmFyIGggPSBNYXRoLmF0YW4yKG8uYiwgby5hKSAqIHJhZDJkZWc7XG4gIHJldHVybiBuZXcgSGNsKGggPCAwID8gaCArIDM2MCA6IGgsIE1hdGguc3FydChvLmEgKiBvLmEgKyBvLmIgKiBvLmIpLCBvLmwsIG8ub3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoY2woaCwgYywgbCwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGhjbENvbnZlcnQoaCkgOiBuZXcgSGNsKGgsIGMsIGwsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIEhjbChoLCBjLCBsLCBvcGFjaXR5KSB7XG4gIHRoaXMuaCA9ICtoO1xuICB0aGlzLmMgPSArYztcbiAgdGhpcy5sID0gK2w7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoSGNsLCBoY2wsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBuZXcgSGNsKHRoaXMuaCwgdGhpcy5jLCB0aGlzLmwgKyBLbiAqIChrID09IG51bGwgPyAxIDogayksIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcjogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBuZXcgSGNsKHRoaXMuaCwgdGhpcy5jLCB0aGlzLmwgLSBLbiAqIChrID09IG51bGwgPyAxIDogayksIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGxhYkNvbnZlcnQodGhpcykucmdiKCk7XG4gIH1cbn0pKTtcbiIsImltcG9ydCBkZWZpbmUsIHtleHRlbmR9IGZyb20gXCIuL2RlZmluZVwiO1xuaW1wb3J0IHtDb2xvciwgcmdiQ29udmVydCwgUmdiLCBkYXJrZXIsIGJyaWdodGVyfSBmcm9tIFwiLi9jb2xvclwiO1xuaW1wb3J0IHtkZWcycmFkLCByYWQyZGVnfSBmcm9tIFwiLi9tYXRoXCI7XG5cbnZhciBBID0gLTAuMTQ4NjEsXG4gICAgQiA9ICsxLjc4Mjc3LFxuICAgIEMgPSAtMC4yOTIyNyxcbiAgICBEID0gLTAuOTA2NDksXG4gICAgRSA9ICsxLjk3Mjk0LFxuICAgIEVEID0gRSAqIEQsXG4gICAgRUIgPSBFICogQixcbiAgICBCQ19EQSA9IEIgKiBDIC0gRCAqIEE7XG5cbmZ1bmN0aW9uIGN1YmVoZWxpeENvbnZlcnQobykge1xuICBpZiAobyBpbnN0YW5jZW9mIEN1YmVoZWxpeCkgcmV0dXJuIG5ldyBDdWJlaGVsaXgoby5oLCBvLnMsIG8ubCwgby5vcGFjaXR5KTtcbiAgaWYgKCEobyBpbnN0YW5jZW9mIFJnYikpIG8gPSByZ2JDb252ZXJ0KG8pO1xuICB2YXIgciA9IG8uciAvIDI1NSxcbiAgICAgIGcgPSBvLmcgLyAyNTUsXG4gICAgICBiID0gby5iIC8gMjU1LFxuICAgICAgbCA9IChCQ19EQSAqIGIgKyBFRCAqIHIgLSBFQiAqIGcpIC8gKEJDX0RBICsgRUQgLSBFQiksXG4gICAgICBibCA9IGIgLSBsLFxuICAgICAgayA9IChFICogKGcgLSBsKSAtIEMgKiBibCkgLyBELFxuICAgICAgcyA9IE1hdGguc3FydChrICogayArIGJsICogYmwpIC8gKEUgKiBsICogKDEgLSBsKSksIC8vIE5hTiBpZiBsPTAgb3IgbD0xXG4gICAgICBoID0gcyA/IE1hdGguYXRhbjIoaywgYmwpICogcmFkMmRlZyAtIDEyMCA6IE5hTjtcbiAgcmV0dXJuIG5ldyBDdWJlaGVsaXgoaCA8IDAgPyBoICsgMzYwIDogaCwgcywgbCwgby5vcGFjaXR5KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3ViZWhlbGl4KGgsIHMsIGwsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBjdWJlaGVsaXhDb252ZXJ0KGgpIDogbmV3IEN1YmVoZWxpeChoLCBzLCBsLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBDdWJlaGVsaXgoaCwgcywgbCwgb3BhY2l0eSkge1xuICB0aGlzLmggPSAraDtcbiAgdGhpcy5zID0gK3M7XG4gIHRoaXMubCA9ICtsO1xuICB0aGlzLm9wYWNpdHkgPSArb3BhY2l0eTtcbn1cblxuZGVmaW5lKEN1YmVoZWxpeCwgY3ViZWhlbGl4LCBleHRlbmQoQ29sb3IsIHtcbiAgYnJpZ2h0ZXI6IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gYnJpZ2h0ZXIgOiBNYXRoLnBvdyhicmlnaHRlciwgayk7XG4gICAgcmV0dXJuIG5ldyBDdWJlaGVsaXgodGhpcy5oLCB0aGlzLnMsIHRoaXMubCAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBkYXJrZXIgOiBNYXRoLnBvdyhkYXJrZXIsIGspO1xuICAgIHJldHVybiBuZXcgQ3ViZWhlbGl4KHRoaXMuaCwgdGhpcy5zLCB0aGlzLmwgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICByZ2I6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBoID0gaXNOYU4odGhpcy5oKSA/IDAgOiAodGhpcy5oICsgMTIwKSAqIGRlZzJyYWQsXG4gICAgICAgIGwgPSArdGhpcy5sLFxuICAgICAgICBhID0gaXNOYU4odGhpcy5zKSA/IDAgOiB0aGlzLnMgKiBsICogKDEgLSBsKSxcbiAgICAgICAgY29zaCA9IE1hdGguY29zKGgpLFxuICAgICAgICBzaW5oID0gTWF0aC5zaW4oaCk7XG4gICAgcmV0dXJuIG5ldyBSZ2IoXG4gICAgICAyNTUgKiAobCArIGEgKiAoQSAqIGNvc2ggKyBCICogc2luaCkpLFxuICAgICAgMjU1ICogKGwgKyBhICogKEMgKiBjb3NoICsgRCAqIHNpbmgpKSxcbiAgICAgIDI1NSAqIChsICsgYSAqIChFICogY29zaCkpLFxuICAgICAgdGhpcy5vcGFjaXR5XG4gICAgKTtcbiAgfVxufSkpO1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHg7XG4gIH07XG59XG4iLCJpbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4vY29uc3RhbnRcIjtcblxuZnVuY3Rpb24gbGluZWFyKGEsIGQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gYSArIHQgKiBkO1xuICB9O1xufVxuXG5mdW5jdGlvbiBleHBvbmVudGlhbChhLCBiLCB5KSB7XG4gIHJldHVybiBhID0gTWF0aC5wb3coYSwgeSksIGIgPSBNYXRoLnBvdyhiLCB5KSAtIGEsIHkgPSAxIC8geSwgZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBNYXRoLnBvdyhhICsgdCAqIGIsIHkpO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaHVlKGEsIGIpIHtcbiAgdmFyIGQgPSBiIC0gYTtcbiAgcmV0dXJuIGQgPyBsaW5lYXIoYSwgZCA+IDE4MCB8fCBkIDwgLTE4MCA/IGQgLSAzNjAgKiBNYXRoLnJvdW5kKGQgLyAzNjApIDogZCkgOiBjb25zdGFudChpc05hTihhKSA/IGIgOiBhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdhbW1hKHkpIHtcbiAgcmV0dXJuICh5ID0gK3kpID09PSAxID8gbm9nYW1tYSA6IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYiAtIGEgPyBleHBvbmVudGlhbChhLCBiLCB5KSA6IGNvbnN0YW50KGlzTmFOKGEpID8gYiA6IGEpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBub2dhbW1hKGEsIGIpIHtcbiAgdmFyIGQgPSBiIC0gYTtcbiAgcmV0dXJuIGQgPyBsaW5lYXIoYSwgZCkgOiBjb25zdGFudChpc05hTihhKSA/IGIgOiBhKTtcbn1cbiIsImltcG9ydCB7cmdiIGFzIGNvbG9yUmdifSBmcm9tIFwiZDMtY29sb3JcIjtcbmltcG9ydCBiYXNpcyBmcm9tIFwiLi9iYXNpc1wiO1xuaW1wb3J0IGJhc2lzQ2xvc2VkIGZyb20gXCIuL2Jhc2lzQ2xvc2VkXCI7XG5pbXBvcnQgbm9nYW1tYSwge2dhbW1hfSBmcm9tIFwiLi9jb2xvclwiO1xuXG5leHBvcnQgZGVmYXVsdCAoZnVuY3Rpb24gcmdiR2FtbWEoeSkge1xuICB2YXIgY29sb3IgPSBnYW1tYSh5KTtcblxuICBmdW5jdGlvbiByZ2Ioc3RhcnQsIGVuZCkge1xuICAgIHZhciByID0gY29sb3IoKHN0YXJ0ID0gY29sb3JSZ2Ioc3RhcnQpKS5yLCAoZW5kID0gY29sb3JSZ2IoZW5kKSkuciksXG4gICAgICAgIGcgPSBjb2xvcihzdGFydC5nLCBlbmQuZyksXG4gICAgICAgIGIgPSBjb2xvcihzdGFydC5iLCBlbmQuYiksXG4gICAgICAgIG9wYWNpdHkgPSBub2dhbW1hKHN0YXJ0Lm9wYWNpdHksIGVuZC5vcGFjaXR5KTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgc3RhcnQuciA9IHIodCk7XG4gICAgICBzdGFydC5nID0gZyh0KTtcbiAgICAgIHN0YXJ0LmIgPSBiKHQpO1xuICAgICAgc3RhcnQub3BhY2l0eSA9IG9wYWNpdHkodCk7XG4gICAgICByZXR1cm4gc3RhcnQgKyBcIlwiO1xuICAgIH07XG4gIH1cblxuICByZ2IuZ2FtbWEgPSByZ2JHYW1tYTtcblxuICByZXR1cm4gcmdiO1xufSkoMSk7XG5cbmZ1bmN0aW9uIHJnYlNwbGluZShzcGxpbmUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbG9ycykge1xuICAgIHZhciBuID0gY29sb3JzLmxlbmd0aCxcbiAgICAgICAgciA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgZyA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgYiA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgaSwgY29sb3I7XG4gICAgZm9yIChpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgY29sb3IgPSBjb2xvclJnYihjb2xvcnNbaV0pO1xuICAgICAgcltpXSA9IGNvbG9yLnIgfHwgMDtcbiAgICAgIGdbaV0gPSBjb2xvci5nIHx8IDA7XG4gICAgICBiW2ldID0gY29sb3IuYiB8fCAwO1xuICAgIH1cbiAgICByID0gc3BsaW5lKHIpO1xuICAgIGcgPSBzcGxpbmUoZyk7XG4gICAgYiA9IHNwbGluZShiKTtcbiAgICBjb2xvci5vcGFjaXR5ID0gMTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgY29sb3IuciA9IHIodCk7XG4gICAgICBjb2xvci5nID0gZyh0KTtcbiAgICAgIGNvbG9yLmIgPSBiKHQpO1xuICAgICAgcmV0dXJuIGNvbG9yICsgXCJcIjtcbiAgICB9O1xuICB9O1xufVxuXG5leHBvcnQgdmFyIHJnYkJhc2lzID0gcmdiU3BsaW5lKGJhc2lzKTtcbmV4cG9ydCB2YXIgcmdiQmFzaXNDbG9zZWQgPSByZ2JTcGxpbmUoYmFzaXNDbG9zZWQpO1xuIiwiaW1wb3J0IHZhbHVlIGZyb20gXCIuL3ZhbHVlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIG5iID0gYiA/IGIubGVuZ3RoIDogMCxcbiAgICAgIG5hID0gYSA/IE1hdGgubWluKG5iLCBhLmxlbmd0aCkgOiAwLFxuICAgICAgeCA9IG5ldyBBcnJheShuYSksXG4gICAgICBjID0gbmV3IEFycmF5KG5iKSxcbiAgICAgIGk7XG5cbiAgZm9yIChpID0gMDsgaSA8IG5hOyArK2kpIHhbaV0gPSB2YWx1ZShhW2ldLCBiW2ldKTtcbiAgZm9yICg7IGkgPCBuYjsgKytpKSBjW2ldID0gYltpXTtcblxuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBuYTsgKytpKSBjW2ldID0geFtpXSh0KTtcbiAgICByZXR1cm4gYztcbiAgfTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZTtcbiAgcmV0dXJuIGEgPSArYSwgYiAtPSBhLCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIGQuc2V0VGltZShhICsgYiAqIHQpLCBkO1xuICB9O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICByZXR1cm4gYSA9ICthLCBiIC09IGEsIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gYSArIGIgKiB0O1xuICB9O1xufVxuIiwiaW1wb3J0IHZhbHVlIGZyb20gXCIuL3ZhbHVlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGkgPSB7fSxcbiAgICAgIGMgPSB7fSxcbiAgICAgIGs7XG5cbiAgaWYgKGEgPT09IG51bGwgfHwgdHlwZW9mIGEgIT09IFwib2JqZWN0XCIpIGEgPSB7fTtcbiAgaWYgKGIgPT09IG51bGwgfHwgdHlwZW9mIGIgIT09IFwib2JqZWN0XCIpIGIgPSB7fTtcblxuICBmb3IgKGsgaW4gYikge1xuICAgIGlmIChrIGluIGEpIHtcbiAgICAgIGlba10gPSB2YWx1ZShhW2tdLCBiW2tdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY1trXSA9IGJba107XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICBmb3IgKGsgaW4gaSkgY1trXSA9IGlba10odCk7XG4gICAgcmV0dXJuIGM7XG4gIH07XG59XG4iLCJpbXBvcnQgbnVtYmVyIGZyb20gXCIuL251bWJlclwiO1xuXG52YXIgcmVBID0gL1stK10/KD86XFxkK1xcLj9cXGQqfFxcLj9cXGQrKSg/OltlRV1bLStdP1xcZCspPy9nLFxuICAgIHJlQiA9IG5ldyBSZWdFeHAocmVBLnNvdXJjZSwgXCJnXCIpO1xuXG5mdW5jdGlvbiB6ZXJvKGIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBiO1xuICB9O1xufVxuXG5mdW5jdGlvbiBvbmUoYikge1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBiKHQpICsgXCJcIjtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICB2YXIgYmkgPSByZUEubGFzdEluZGV4ID0gcmVCLmxhc3RJbmRleCA9IDAsIC8vIHNjYW4gaW5kZXggZm9yIG5leHQgbnVtYmVyIGluIGJcbiAgICAgIGFtLCAvLyBjdXJyZW50IG1hdGNoIGluIGFcbiAgICAgIGJtLCAvLyBjdXJyZW50IG1hdGNoIGluIGJcbiAgICAgIGJzLCAvLyBzdHJpbmcgcHJlY2VkaW5nIGN1cnJlbnQgbnVtYmVyIGluIGIsIGlmIGFueVxuICAgICAgaSA9IC0xLCAvLyBpbmRleCBpbiBzXG4gICAgICBzID0gW10sIC8vIHN0cmluZyBjb25zdGFudHMgYW5kIHBsYWNlaG9sZGVyc1xuICAgICAgcSA9IFtdOyAvLyBudW1iZXIgaW50ZXJwb2xhdG9yc1xuXG4gIC8vIENvZXJjZSBpbnB1dHMgdG8gc3RyaW5ncy5cbiAgYSA9IGEgKyBcIlwiLCBiID0gYiArIFwiXCI7XG5cbiAgLy8gSW50ZXJwb2xhdGUgcGFpcnMgb2YgbnVtYmVycyBpbiBhICYgYi5cbiAgd2hpbGUgKChhbSA9IHJlQS5leGVjKGEpKVxuICAgICAgJiYgKGJtID0gcmVCLmV4ZWMoYikpKSB7XG4gICAgaWYgKChicyA9IGJtLmluZGV4KSA+IGJpKSB7IC8vIGEgc3RyaW5nIHByZWNlZGVzIHRoZSBuZXh0IG51bWJlciBpbiBiXG4gICAgICBicyA9IGIuc2xpY2UoYmksIGJzKTtcbiAgICAgIGlmIChzW2ldKSBzW2ldICs9IGJzOyAvLyBjb2FsZXNjZSB3aXRoIHByZXZpb3VzIHN0cmluZ1xuICAgICAgZWxzZSBzWysraV0gPSBicztcbiAgICB9XG4gICAgaWYgKChhbSA9IGFtWzBdKSA9PT0gKGJtID0gYm1bMF0pKSB7IC8vIG51bWJlcnMgaW4gYSAmIGIgbWF0Y2hcbiAgICAgIGlmIChzW2ldKSBzW2ldICs9IGJtOyAvLyBjb2FsZXNjZSB3aXRoIHByZXZpb3VzIHN0cmluZ1xuICAgICAgZWxzZSBzWysraV0gPSBibTtcbiAgICB9IGVsc2UgeyAvLyBpbnRlcnBvbGF0ZSBub24tbWF0Y2hpbmcgbnVtYmVyc1xuICAgICAgc1srK2ldID0gbnVsbDtcbiAgICAgIHEucHVzaCh7aTogaSwgeDogbnVtYmVyKGFtLCBibSl9KTtcbiAgICB9XG4gICAgYmkgPSByZUIubGFzdEluZGV4O1xuICB9XG5cbiAgLy8gQWRkIHJlbWFpbnMgb2YgYi5cbiAgaWYgKGJpIDwgYi5sZW5ndGgpIHtcbiAgICBicyA9IGIuc2xpY2UoYmkpO1xuICAgIGlmIChzW2ldKSBzW2ldICs9IGJzOyAvLyBjb2FsZXNjZSB3aXRoIHByZXZpb3VzIHN0cmluZ1xuICAgIGVsc2Ugc1srK2ldID0gYnM7XG4gIH1cblxuICAvLyBTcGVjaWFsIG9wdGltaXphdGlvbiBmb3Igb25seSBhIHNpbmdsZSBtYXRjaC5cbiAgLy8gT3RoZXJ3aXNlLCBpbnRlcnBvbGF0ZSBlYWNoIG9mIHRoZSBudW1iZXJzIGFuZCByZWpvaW4gdGhlIHN0cmluZy5cbiAgcmV0dXJuIHMubGVuZ3RoIDwgMiA/IChxWzBdXG4gICAgICA/IG9uZShxWzBdLngpXG4gICAgICA6IHplcm8oYikpXG4gICAgICA6IChiID0gcS5sZW5ndGgsIGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbzsgaSA8IGI7ICsraSkgc1sobyA9IHFbaV0pLmldID0gby54KHQpO1xuICAgICAgICAgIHJldHVybiBzLmpvaW4oXCJcIik7XG4gICAgICAgIH0pO1xufVxuIiwiaW1wb3J0IHtjb2xvcn0gZnJvbSBcImQzLWNvbG9yXCI7XG5pbXBvcnQgcmdiIGZyb20gXCIuL3JnYlwiO1xuaW1wb3J0IGFycmF5IGZyb20gXCIuL2FycmF5XCI7XG5pbXBvcnQgZGF0ZSBmcm9tIFwiLi9kYXRlXCI7XG5pbXBvcnQgbnVtYmVyIGZyb20gXCIuL251bWJlclwiO1xuaW1wb3J0IG9iamVjdCBmcm9tIFwiLi9vYmplY3RcIjtcbmltcG9ydCBzdHJpbmcgZnJvbSBcIi4vc3RyaW5nXCI7XG5pbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4vY29uc3RhbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICB2YXIgdCA9IHR5cGVvZiBiLCBjO1xuICByZXR1cm4gYiA9PSBudWxsIHx8IHQgPT09IFwiYm9vbGVhblwiID8gY29uc3RhbnQoYilcbiAgICAgIDogKHQgPT09IFwibnVtYmVyXCIgPyBudW1iZXJcbiAgICAgIDogdCA9PT0gXCJzdHJpbmdcIiA/ICgoYyA9IGNvbG9yKGIpKSA/IChiID0gYywgcmdiKSA6IHN0cmluZylcbiAgICAgIDogYiBpbnN0YW5jZW9mIGNvbG9yID8gcmdiXG4gICAgICA6IGIgaW5zdGFuY2VvZiBEYXRlID8gZGF0ZVxuICAgICAgOiBBcnJheS5pc0FycmF5KGIpID8gYXJyYXlcbiAgICAgIDogdHlwZW9mIGIudmFsdWVPZiAhPT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBiLnRvU3RyaW5nICE9PSBcImZ1bmN0aW9uXCIgfHwgaXNOYU4oYikgPyBvYmplY3RcbiAgICAgIDogbnVtYmVyKShhLCBiKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEgPSArYSwgYiAtPSBhLCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoYSArIGIgKiB0KTtcbiAgfTtcbn1cbiIsInZhciBkZWdyZWVzID0gMTgwIC8gTWF0aC5QSTtcblxuZXhwb3J0IHZhciBpZGVudGl0eSA9IHtcbiAgdHJhbnNsYXRlWDogMCxcbiAgdHJhbnNsYXRlWTogMCxcbiAgcm90YXRlOiAwLFxuICBza2V3WDogMCxcbiAgc2NhbGVYOiAxLFxuICBzY2FsZVk6IDFcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgdmFyIHNjYWxlWCwgc2NhbGVZLCBza2V3WDtcbiAgaWYgKHNjYWxlWCA9IE1hdGguc3FydChhICogYSArIGIgKiBiKSkgYSAvPSBzY2FsZVgsIGIgLz0gc2NhbGVYO1xuICBpZiAoc2tld1ggPSBhICogYyArIGIgKiBkKSBjIC09IGEgKiBza2V3WCwgZCAtPSBiICogc2tld1g7XG4gIGlmIChzY2FsZVkgPSBNYXRoLnNxcnQoYyAqIGMgKyBkICogZCkpIGMgLz0gc2NhbGVZLCBkIC89IHNjYWxlWSwgc2tld1ggLz0gc2NhbGVZO1xuICBpZiAoYSAqIGQgPCBiICogYykgYSA9IC1hLCBiID0gLWIsIHNrZXdYID0gLXNrZXdYLCBzY2FsZVggPSAtc2NhbGVYO1xuICByZXR1cm4ge1xuICAgIHRyYW5zbGF0ZVg6IGUsXG4gICAgdHJhbnNsYXRlWTogZixcbiAgICByb3RhdGU6IE1hdGguYXRhbjIoYiwgYSkgKiBkZWdyZWVzLFxuICAgIHNrZXdYOiBNYXRoLmF0YW4oc2tld1gpICogZGVncmVlcyxcbiAgICBzY2FsZVg6IHNjYWxlWCxcbiAgICBzY2FsZVk6IHNjYWxlWVxuICB9O1xufVxuIiwiaW1wb3J0IGRlY29tcG9zZSwge2lkZW50aXR5fSBmcm9tIFwiLi9kZWNvbXBvc2VcIjtcblxudmFyIGNzc05vZGUsXG4gICAgY3NzUm9vdCxcbiAgICBjc3NWaWV3LFxuICAgIHN2Z05vZGU7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNzcyh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IFwibm9uZVwiKSByZXR1cm4gaWRlbnRpdHk7XG4gIGlmICghY3NzTm9kZSkgY3NzTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIiksIGNzc1Jvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIGNzc1ZpZXcgPSBkb2N1bWVudC5kZWZhdWx0VmlldztcbiAgY3NzTm9kZS5zdHlsZS50cmFuc2Zvcm0gPSB2YWx1ZTtcbiAgdmFsdWUgPSBjc3NWaWV3LmdldENvbXB1dGVkU3R5bGUoY3NzUm9vdC5hcHBlbmRDaGlsZChjc3NOb2RlKSwgbnVsbCkuZ2V0UHJvcGVydHlWYWx1ZShcInRyYW5zZm9ybVwiKTtcbiAgY3NzUm9vdC5yZW1vdmVDaGlsZChjc3NOb2RlKTtcbiAgdmFsdWUgPSB2YWx1ZS5zbGljZSg3LCAtMSkuc3BsaXQoXCIsXCIpO1xuICByZXR1cm4gZGVjb21wb3NlKCt2YWx1ZVswXSwgK3ZhbHVlWzFdLCArdmFsdWVbMl0sICt2YWx1ZVszXSwgK3ZhbHVlWzRdLCArdmFsdWVbNV0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTdmcodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBpZGVudGl0eTtcbiAgaWYgKCFzdmdOb2RlKSBzdmdOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgXCJnXCIpO1xuICBzdmdOb2RlLnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCB2YWx1ZSk7XG4gIGlmICghKHZhbHVlID0gc3ZnTm9kZS50cmFuc2Zvcm0uYmFzZVZhbC5jb25zb2xpZGF0ZSgpKSkgcmV0dXJuIGlkZW50aXR5O1xuICB2YWx1ZSA9IHZhbHVlLm1hdHJpeDtcbiAgcmV0dXJuIGRlY29tcG9zZSh2YWx1ZS5hLCB2YWx1ZS5iLCB2YWx1ZS5jLCB2YWx1ZS5kLCB2YWx1ZS5lLCB2YWx1ZS5mKTtcbn1cbiIsImltcG9ydCBudW1iZXIgZnJvbSBcIi4uL251bWJlclwiO1xuaW1wb3J0IHtwYXJzZUNzcywgcGFyc2VTdmd9IGZyb20gXCIuL3BhcnNlXCI7XG5cbmZ1bmN0aW9uIGludGVycG9sYXRlVHJhbnNmb3JtKHBhcnNlLCBweENvbW1hLCBweFBhcmVuLCBkZWdQYXJlbikge1xuXG4gIGZ1bmN0aW9uIHBvcChzKSB7XG4gICAgcmV0dXJuIHMubGVuZ3RoID8gcy5wb3AoKSArIFwiIFwiIDogXCJcIjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zbGF0ZSh4YSwgeWEsIHhiLCB5YiwgcywgcSkge1xuICAgIGlmICh4YSAhPT0geGIgfHwgeWEgIT09IHliKSB7XG4gICAgICB2YXIgaSA9IHMucHVzaChcInRyYW5zbGF0ZShcIiwgbnVsbCwgcHhDb21tYSwgbnVsbCwgcHhQYXJlbik7XG4gICAgICBxLnB1c2goe2k6IGkgLSA0LCB4OiBudW1iZXIoeGEsIHhiKX0sIHtpOiBpIC0gMiwgeDogbnVtYmVyKHlhLCB5Yil9KTtcbiAgICB9IGVsc2UgaWYgKHhiIHx8IHliKSB7XG4gICAgICBzLnB1c2goXCJ0cmFuc2xhdGUoXCIgKyB4YiArIHB4Q29tbWEgKyB5YiArIHB4UGFyZW4pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJvdGF0ZShhLCBiLCBzLCBxKSB7XG4gICAgaWYgKGEgIT09IGIpIHtcbiAgICAgIGlmIChhIC0gYiA+IDE4MCkgYiArPSAzNjA7IGVsc2UgaWYgKGIgLSBhID4gMTgwKSBhICs9IDM2MDsgLy8gc2hvcnRlc3QgcGF0aFxuICAgICAgcS5wdXNoKHtpOiBzLnB1c2gocG9wKHMpICsgXCJyb3RhdGUoXCIsIG51bGwsIGRlZ1BhcmVuKSAtIDIsIHg6IG51bWJlcihhLCBiKX0pO1xuICAgIH0gZWxzZSBpZiAoYikge1xuICAgICAgcy5wdXNoKHBvcChzKSArIFwicm90YXRlKFwiICsgYiArIGRlZ1BhcmVuKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBza2V3WChhLCBiLCBzLCBxKSB7XG4gICAgaWYgKGEgIT09IGIpIHtcbiAgICAgIHEucHVzaCh7aTogcy5wdXNoKHBvcChzKSArIFwic2tld1goXCIsIG51bGwsIGRlZ1BhcmVuKSAtIDIsIHg6IG51bWJlcihhLCBiKX0pO1xuICAgIH0gZWxzZSBpZiAoYikge1xuICAgICAgcy5wdXNoKHBvcChzKSArIFwic2tld1goXCIgKyBiICsgZGVnUGFyZW4pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNjYWxlKHhhLCB5YSwgeGIsIHliLCBzLCBxKSB7XG4gICAgaWYgKHhhICE9PSB4YiB8fCB5YSAhPT0geWIpIHtcbiAgICAgIHZhciBpID0gcy5wdXNoKHBvcChzKSArIFwic2NhbGUoXCIsIG51bGwsIFwiLFwiLCBudWxsLCBcIilcIik7XG4gICAgICBxLnB1c2goe2k6IGkgLSA0LCB4OiBudW1iZXIoeGEsIHhiKX0sIHtpOiBpIC0gMiwgeDogbnVtYmVyKHlhLCB5Yil9KTtcbiAgICB9IGVsc2UgaWYgKHhiICE9PSAxIHx8IHliICE9PSAxKSB7XG4gICAgICBzLnB1c2gocG9wKHMpICsgXCJzY2FsZShcIiArIHhiICsgXCIsXCIgKyB5YiArIFwiKVwiKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oYSwgYikge1xuICAgIHZhciBzID0gW10sIC8vIHN0cmluZyBjb25zdGFudHMgYW5kIHBsYWNlaG9sZGVyc1xuICAgICAgICBxID0gW107IC8vIG51bWJlciBpbnRlcnBvbGF0b3JzXG4gICAgYSA9IHBhcnNlKGEpLCBiID0gcGFyc2UoYik7XG4gICAgdHJhbnNsYXRlKGEudHJhbnNsYXRlWCwgYS50cmFuc2xhdGVZLCBiLnRyYW5zbGF0ZVgsIGIudHJhbnNsYXRlWSwgcywgcSk7XG4gICAgcm90YXRlKGEucm90YXRlLCBiLnJvdGF0ZSwgcywgcSk7XG4gICAgc2tld1goYS5za2V3WCwgYi5za2V3WCwgcywgcSk7XG4gICAgc2NhbGUoYS5zY2FsZVgsIGEuc2NhbGVZLCBiLnNjYWxlWCwgYi5zY2FsZVksIHMsIHEpO1xuICAgIGEgPSBiID0gbnVsbDsgLy8gZ2NcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgdmFyIGkgPSAtMSwgbiA9IHEubGVuZ3RoLCBvO1xuICAgICAgd2hpbGUgKCsraSA8IG4pIHNbKG8gPSBxW2ldKS5pXSA9IG8ueCh0KTtcbiAgICAgIHJldHVybiBzLmpvaW4oXCJcIik7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IHZhciBpbnRlcnBvbGF0ZVRyYW5zZm9ybUNzcyA9IGludGVycG9sYXRlVHJhbnNmb3JtKHBhcnNlQ3NzLCBcInB4LCBcIiwgXCJweClcIiwgXCJkZWcpXCIpO1xuZXhwb3J0IHZhciBpbnRlcnBvbGF0ZVRyYW5zZm9ybVN2ZyA9IGludGVycG9sYXRlVHJhbnNmb3JtKHBhcnNlU3ZnLCBcIiwgXCIsIFwiKVwiLCBcIilcIik7XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4geDtcbiAgfTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuICt4O1xufVxuIiwiaW1wb3J0IHtiaXNlY3R9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IHtpbnRlcnBvbGF0ZSBhcyBpbnRlcnBvbGF0ZVZhbHVlLCBpbnRlcnBvbGF0ZVJvdW5kfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcbmltcG9ydCB7bWFwLCBzbGljZX0gZnJvbSBcIi4vYXJyYXlcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi9jb25zdGFudFwiO1xuaW1wb3J0IG51bWJlciBmcm9tIFwiLi9udW1iZXJcIjtcblxudmFyIHVuaXQgPSBbMCwgMV07XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWludGVycG9sYXRlTGluZWFyKGEsIGIpIHtcbiAgcmV0dXJuIChiIC09IChhID0gK2EpKVxuICAgICAgPyBmdW5jdGlvbih4KSB7IHJldHVybiAoeCAtIGEpIC8gYjsgfVxuICAgICAgOiBjb25zdGFudChiKTtcbn1cblxuZnVuY3Rpb24gZGVpbnRlcnBvbGF0ZUNsYW1wKGRlaW50ZXJwb2xhdGUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICB2YXIgZCA9IGRlaW50ZXJwb2xhdGUoYSA9ICthLCBiID0gK2IpO1xuICAgIHJldHVybiBmdW5jdGlvbih4KSB7IHJldHVybiB4IDw9IGEgPyAwIDogeCA+PSBiID8gMSA6IGQoeCk7IH07XG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlaW50ZXJwb2xhdGVDbGFtcChyZWludGVycG9sYXRlKSB7XG4gIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgdmFyIHIgPSByZWludGVycG9sYXRlKGEgPSArYSwgYiA9ICtiKTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkgeyByZXR1cm4gdCA8PSAwID8gYSA6IHQgPj0gMSA/IGIgOiByKHQpOyB9O1xuICB9O1xufVxuXG5mdW5jdGlvbiBiaW1hcChkb21haW4sIHJhbmdlLCBkZWludGVycG9sYXRlLCByZWludGVycG9sYXRlKSB7XG4gIHZhciBkMCA9IGRvbWFpblswXSwgZDEgPSBkb21haW5bMV0sIHIwID0gcmFuZ2VbMF0sIHIxID0gcmFuZ2VbMV07XG4gIGlmIChkMSA8IGQwKSBkMCA9IGRlaW50ZXJwb2xhdGUoZDEsIGQwKSwgcjAgPSByZWludGVycG9sYXRlKHIxLCByMCk7XG4gIGVsc2UgZDAgPSBkZWludGVycG9sYXRlKGQwLCBkMSksIHIwID0gcmVpbnRlcnBvbGF0ZShyMCwgcjEpO1xuICByZXR1cm4gZnVuY3Rpb24oeCkgeyByZXR1cm4gcjAoZDAoeCkpOyB9O1xufVxuXG5mdW5jdGlvbiBwb2x5bWFwKGRvbWFpbiwgcmFuZ2UsIGRlaW50ZXJwb2xhdGUsIHJlaW50ZXJwb2xhdGUpIHtcbiAgdmFyIGogPSBNYXRoLm1pbihkb21haW4ubGVuZ3RoLCByYW5nZS5sZW5ndGgpIC0gMSxcbiAgICAgIGQgPSBuZXcgQXJyYXkoaiksXG4gICAgICByID0gbmV3IEFycmF5KGopLFxuICAgICAgaSA9IC0xO1xuXG4gIC8vIFJldmVyc2UgZGVzY2VuZGluZyBkb21haW5zLlxuICBpZiAoZG9tYWluW2pdIDwgZG9tYWluWzBdKSB7XG4gICAgZG9tYWluID0gZG9tYWluLnNsaWNlKCkucmV2ZXJzZSgpO1xuICAgIHJhbmdlID0gcmFuZ2Uuc2xpY2UoKS5yZXZlcnNlKCk7XG4gIH1cblxuICB3aGlsZSAoKytpIDwgaikge1xuICAgIGRbaV0gPSBkZWludGVycG9sYXRlKGRvbWFpbltpXSwgZG9tYWluW2kgKyAxXSk7XG4gICAgcltpXSA9IHJlaW50ZXJwb2xhdGUocmFuZ2VbaV0sIHJhbmdlW2kgKyAxXSk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgIHZhciBpID0gYmlzZWN0KGRvbWFpbiwgeCwgMSwgaikgLSAxO1xuICAgIHJldHVybiByW2ldKGRbaV0oeCkpO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29weShzb3VyY2UsIHRhcmdldCkge1xuICByZXR1cm4gdGFyZ2V0XG4gICAgICAuZG9tYWluKHNvdXJjZS5kb21haW4oKSlcbiAgICAgIC5yYW5nZShzb3VyY2UucmFuZ2UoKSlcbiAgICAgIC5pbnRlcnBvbGF0ZShzb3VyY2UuaW50ZXJwb2xhdGUoKSlcbiAgICAgIC5jbGFtcChzb3VyY2UuY2xhbXAoKSk7XG59XG5cbi8vIGRlaW50ZXJwb2xhdGUoYSwgYikoeCkgdGFrZXMgYSBkb21haW4gdmFsdWUgeCBpbiBbYSxiXSBhbmQgcmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyBwYXJhbWV0ZXIgdCBpbiBbMCwxXS5cbi8vIHJlaW50ZXJwb2xhdGUoYSwgYikodCkgdGFrZXMgYSBwYXJhbWV0ZXIgdCBpbiBbMCwxXSBhbmQgcmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyBkb21haW4gdmFsdWUgeCBpbiBbYSxiXS5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbnRpbnVvdXMoZGVpbnRlcnBvbGF0ZSwgcmVpbnRlcnBvbGF0ZSkge1xuICB2YXIgZG9tYWluID0gdW5pdCxcbiAgICAgIHJhbmdlID0gdW5pdCxcbiAgICAgIGludGVycG9sYXRlID0gaW50ZXJwb2xhdGVWYWx1ZSxcbiAgICAgIGNsYW1wID0gZmFsc2UsXG4gICAgICBwaWVjZXdpc2UsXG4gICAgICBvdXRwdXQsXG4gICAgICBpbnB1dDtcblxuICBmdW5jdGlvbiByZXNjYWxlKCkge1xuICAgIHBpZWNld2lzZSA9IE1hdGgubWluKGRvbWFpbi5sZW5ndGgsIHJhbmdlLmxlbmd0aCkgPiAyID8gcG9seW1hcCA6IGJpbWFwO1xuICAgIG91dHB1dCA9IGlucHV0ID0gbnVsbDtcbiAgICByZXR1cm4gc2NhbGU7XG4gIH1cblxuICBmdW5jdGlvbiBzY2FsZSh4KSB7XG4gICAgcmV0dXJuIChvdXRwdXQgfHwgKG91dHB1dCA9IHBpZWNld2lzZShkb21haW4sIHJhbmdlLCBjbGFtcCA/IGRlaW50ZXJwb2xhdGVDbGFtcChkZWludGVycG9sYXRlKSA6IGRlaW50ZXJwb2xhdGUsIGludGVycG9sYXRlKSkpKCt4KTtcbiAgfVxuXG4gIHNjYWxlLmludmVydCA9IGZ1bmN0aW9uKHkpIHtcbiAgICByZXR1cm4gKGlucHV0IHx8IChpbnB1dCA9IHBpZWNld2lzZShyYW5nZSwgZG9tYWluLCBkZWludGVycG9sYXRlTGluZWFyLCBjbGFtcCA/IHJlaW50ZXJwb2xhdGVDbGFtcChyZWludGVycG9sYXRlKSA6IHJlaW50ZXJwb2xhdGUpKSkoK3kpO1xuICB9O1xuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkb21haW4gPSBtYXAuY2FsbChfLCBudW1iZXIpLCByZXNjYWxlKCkpIDogZG9tYWluLnNsaWNlKCk7XG4gIH07XG5cbiAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocmFuZ2UgPSBzbGljZS5jYWxsKF8pLCByZXNjYWxlKCkpIDogcmFuZ2Uuc2xpY2UoKTtcbiAgfTtcblxuICBzY2FsZS5yYW5nZVJvdW5kID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiByYW5nZSA9IHNsaWNlLmNhbGwoXyksIGludGVycG9sYXRlID0gaW50ZXJwb2xhdGVSb3VuZCwgcmVzY2FsZSgpO1xuICB9O1xuXG4gIHNjYWxlLmNsYW1wID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGNsYW1wID0gISFfLCByZXNjYWxlKCkpIDogY2xhbXA7XG4gIH07XG5cbiAgc2NhbGUuaW50ZXJwb2xhdGUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoaW50ZXJwb2xhdGUgPSBfLCByZXNjYWxlKCkpIDogaW50ZXJwb2xhdGU7XG4gIH07XG5cbiAgcmV0dXJuIHJlc2NhbGUoKTtcbn1cbiIsIi8vIENvbXB1dGVzIHRoZSBkZWNpbWFsIGNvZWZmaWNpZW50IGFuZCBleHBvbmVudCBvZiB0aGUgc3BlY2lmaWVkIG51bWJlciB4IHdpdGhcbi8vIHNpZ25pZmljYW50IGRpZ2l0cyBwLCB3aGVyZSB4IGlzIHBvc2l0aXZlIGFuZCBwIGlzIGluIFsxLCAyMV0gb3IgdW5kZWZpbmVkLlxuLy8gRm9yIGV4YW1wbGUsIGZvcm1hdERlY2ltYWwoMS4yMykgcmV0dXJucyBbXCIxMjNcIiwgMF0uXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4LCBwKSB7XG4gIGlmICgoaSA9ICh4ID0gcCA/IHgudG9FeHBvbmVudGlhbChwIC0gMSkgOiB4LnRvRXhwb25lbnRpYWwoKSkuaW5kZXhPZihcImVcIikpIDwgMCkgcmV0dXJuIG51bGw7IC8vIE5hTiwgwrFJbmZpbml0eVxuICB2YXIgaSwgY29lZmZpY2llbnQgPSB4LnNsaWNlKDAsIGkpO1xuXG4gIC8vIFRoZSBzdHJpbmcgcmV0dXJuZWQgYnkgdG9FeHBvbmVudGlhbCBlaXRoZXIgaGFzIHRoZSBmb3JtIFxcZFxcLlxcZCtlWy0rXVxcZCtcbiAgLy8gKGUuZy4sIDEuMmUrMykgb3IgdGhlIGZvcm0gXFxkZVstK11cXGQrIChlLmcuLCAxZSszKS5cbiAgcmV0dXJuIFtcbiAgICBjb2VmZmljaWVudC5sZW5ndGggPiAxID8gY29lZmZpY2llbnRbMF0gKyBjb2VmZmljaWVudC5zbGljZSgyKSA6IGNvZWZmaWNpZW50LFxuICAgICt4LnNsaWNlKGkgKyAxKVxuICBdO1xufVxuIiwiaW1wb3J0IGZvcm1hdERlY2ltYWwgZnJvbSBcIi4vZm9ybWF0RGVjaW1hbFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4ID0gZm9ybWF0RGVjaW1hbChNYXRoLmFicyh4KSksIHggPyB4WzFdIDogTmFOO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oZ3JvdXBpbmcsIHRob3VzYW5kcykge1xuICByZXR1cm4gZnVuY3Rpb24odmFsdWUsIHdpZHRoKSB7XG4gICAgdmFyIGkgPSB2YWx1ZS5sZW5ndGgsXG4gICAgICAgIHQgPSBbXSxcbiAgICAgICAgaiA9IDAsXG4gICAgICAgIGcgPSBncm91cGluZ1swXSxcbiAgICAgICAgbGVuZ3RoID0gMDtcblxuICAgIHdoaWxlIChpID4gMCAmJiBnID4gMCkge1xuICAgICAgaWYgKGxlbmd0aCArIGcgKyAxID4gd2lkdGgpIGcgPSBNYXRoLm1heCgxLCB3aWR0aCAtIGxlbmd0aCk7XG4gICAgICB0LnB1c2godmFsdWUuc3Vic3RyaW5nKGkgLT0gZywgaSArIGcpKTtcbiAgICAgIGlmICgobGVuZ3RoICs9IGcgKyAxKSA+IHdpZHRoKSBicmVhaztcbiAgICAgIGcgPSBncm91cGluZ1tqID0gKGogKyAxKSAlIGdyb3VwaW5nLmxlbmd0aF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHQucmV2ZXJzZSgpLmpvaW4odGhvdXNhbmRzKTtcbiAgfTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG51bWVyYWxzKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bMC05XS9nLCBmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gbnVtZXJhbHNbK2ldO1xuICAgIH0pO1xuICB9O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgcCkge1xuICB4ID0geC50b1ByZWNpc2lvbihwKTtcblxuICBvdXQ6IGZvciAodmFyIG4gPSB4Lmxlbmd0aCwgaSA9IDEsIGkwID0gLTEsIGkxOyBpIDwgbjsgKytpKSB7XG4gICAgc3dpdGNoICh4W2ldKSB7XG4gICAgICBjYXNlIFwiLlwiOiBpMCA9IGkxID0gaTsgYnJlYWs7XG4gICAgICBjYXNlIFwiMFwiOiBpZiAoaTAgPT09IDApIGkwID0gaTsgaTEgPSBpOyBicmVhaztcbiAgICAgIGNhc2UgXCJlXCI6IGJyZWFrIG91dDtcbiAgICAgIGRlZmF1bHQ6IGlmIChpMCA+IDApIGkwID0gMDsgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGkwID4gMCA/IHguc2xpY2UoMCwgaTApICsgeC5zbGljZShpMSArIDEpIDogeDtcbn1cbiIsImltcG9ydCBmb3JtYXREZWNpbWFsIGZyb20gXCIuL2Zvcm1hdERlY2ltYWxcIjtcblxuZXhwb3J0IHZhciBwcmVmaXhFeHBvbmVudDtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgcCkge1xuICB2YXIgZCA9IGZvcm1hdERlY2ltYWwoeCwgcCk7XG4gIGlmICghZCkgcmV0dXJuIHggKyBcIlwiO1xuICB2YXIgY29lZmZpY2llbnQgPSBkWzBdLFxuICAgICAgZXhwb25lbnQgPSBkWzFdLFxuICAgICAgaSA9IGV4cG9uZW50IC0gKHByZWZpeEV4cG9uZW50ID0gTWF0aC5tYXgoLTgsIE1hdGgubWluKDgsIE1hdGguZmxvb3IoZXhwb25lbnQgLyAzKSkpICogMykgKyAxLFxuICAgICAgbiA9IGNvZWZmaWNpZW50Lmxlbmd0aDtcbiAgcmV0dXJuIGkgPT09IG4gPyBjb2VmZmljaWVudFxuICAgICAgOiBpID4gbiA/IGNvZWZmaWNpZW50ICsgbmV3IEFycmF5KGkgLSBuICsgMSkuam9pbihcIjBcIilcbiAgICAgIDogaSA+IDAgPyBjb2VmZmljaWVudC5zbGljZSgwLCBpKSArIFwiLlwiICsgY29lZmZpY2llbnQuc2xpY2UoaSlcbiAgICAgIDogXCIwLlwiICsgbmV3IEFycmF5KDEgLSBpKS5qb2luKFwiMFwiKSArIGZvcm1hdERlY2ltYWwoeCwgTWF0aC5tYXgoMCwgcCArIGkgLSAxKSlbMF07IC8vIGxlc3MgdGhhbiAxeSFcbn1cbiIsImltcG9ydCBmb3JtYXREZWNpbWFsIGZyb20gXCIuL2Zvcm1hdERlY2ltYWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgcCkge1xuICB2YXIgZCA9IGZvcm1hdERlY2ltYWwoeCwgcCk7XG4gIGlmICghZCkgcmV0dXJuIHggKyBcIlwiO1xuICB2YXIgY29lZmZpY2llbnQgPSBkWzBdLFxuICAgICAgZXhwb25lbnQgPSBkWzFdO1xuICByZXR1cm4gZXhwb25lbnQgPCAwID8gXCIwLlwiICsgbmV3IEFycmF5KC1leHBvbmVudCkuam9pbihcIjBcIikgKyBjb2VmZmljaWVudFxuICAgICAgOiBjb2VmZmljaWVudC5sZW5ndGggPiBleHBvbmVudCArIDEgPyBjb2VmZmljaWVudC5zbGljZSgwLCBleHBvbmVudCArIDEpICsgXCIuXCIgKyBjb2VmZmljaWVudC5zbGljZShleHBvbmVudCArIDEpXG4gICAgICA6IGNvZWZmaWNpZW50ICsgbmV3IEFycmF5KGV4cG9uZW50IC0gY29lZmZpY2llbnQubGVuZ3RoICsgMikuam9pbihcIjBcIik7XG59XG4iLCJpbXBvcnQgZm9ybWF0RGVmYXVsdCBmcm9tIFwiLi9mb3JtYXREZWZhdWx0XCI7XG5pbXBvcnQgZm9ybWF0UHJlZml4QXV0byBmcm9tIFwiLi9mb3JtYXRQcmVmaXhBdXRvXCI7XG5pbXBvcnQgZm9ybWF0Um91bmRlZCBmcm9tIFwiLi9mb3JtYXRSb3VuZGVkXCI7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgXCJcIjogZm9ybWF0RGVmYXVsdCxcbiAgXCIlXCI6IGZ1bmN0aW9uKHgsIHApIHsgcmV0dXJuICh4ICogMTAwKS50b0ZpeGVkKHApOyB9LFxuICBcImJcIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygyKTsgfSxcbiAgXCJjXCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggKyBcIlwiOyB9LFxuICBcImRcIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygxMCk7IH0sXG4gIFwiZVwiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvRXhwb25lbnRpYWwocCk7IH0sXG4gIFwiZlwiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvRml4ZWQocCk7IH0sXG4gIFwiZ1wiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvUHJlY2lzaW9uKHApOyB9LFxuICBcIm9cIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZyg4KTsgfSxcbiAgXCJwXCI6IGZ1bmN0aW9uKHgsIHApIHsgcmV0dXJuIGZvcm1hdFJvdW5kZWQoeCAqIDEwMCwgcCk7IH0sXG4gIFwiclwiOiBmb3JtYXRSb3VuZGVkLFxuICBcInNcIjogZm9ybWF0UHJlZml4QXV0byxcbiAgXCJYXCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE1hdGgucm91bmQoeCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7IH0sXG4gIFwieFwiOiBmdW5jdGlvbih4KSB7IHJldHVybiBNYXRoLnJvdW5kKHgpLnRvU3RyaW5nKDE2KTsgfVxufTtcbiIsImltcG9ydCBmb3JtYXRUeXBlcyBmcm9tIFwiLi9mb3JtYXRUeXBlc1wiO1xuXG4vLyBbW2ZpbGxdYWxpZ25dW3NpZ25dW3N5bWJvbF1bMF1bd2lkdGhdWyxdWy5wcmVjaXNpb25dW3R5cGVdXG52YXIgcmUgPSAvXig/OiguKT8oWzw+PV5dKSk/KFsrXFwtXFwoIF0pPyhbJCNdKT8oMCk/KFxcZCspPygsKT8oXFwuXFxkKyk/KFthLXolXSk/JC9pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKSB7XG4gIHJldHVybiBuZXcgRm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcik7XG59XG5cbmZvcm1hdFNwZWNpZmllci5wcm90b3R5cGUgPSBGb3JtYXRTcGVjaWZpZXIucHJvdG90eXBlOyAvLyBpbnN0YW5jZW9mXG5cbmZ1bmN0aW9uIEZvcm1hdFNwZWNpZmllcihzcGVjaWZpZXIpIHtcbiAgaWYgKCEobWF0Y2ggPSByZS5leGVjKHNwZWNpZmllcikpKSB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIGZvcm1hdDogXCIgKyBzcGVjaWZpZXIpO1xuXG4gIHZhciBtYXRjaCxcbiAgICAgIGZpbGwgPSBtYXRjaFsxXSB8fCBcIiBcIixcbiAgICAgIGFsaWduID0gbWF0Y2hbMl0gfHwgXCI+XCIsXG4gICAgICBzaWduID0gbWF0Y2hbM10gfHwgXCItXCIsXG4gICAgICBzeW1ib2wgPSBtYXRjaFs0XSB8fCBcIlwiLFxuICAgICAgemVybyA9ICEhbWF0Y2hbNV0sXG4gICAgICB3aWR0aCA9IG1hdGNoWzZdICYmICttYXRjaFs2XSxcbiAgICAgIGNvbW1hID0gISFtYXRjaFs3XSxcbiAgICAgIHByZWNpc2lvbiA9IG1hdGNoWzhdICYmICttYXRjaFs4XS5zbGljZSgxKSxcbiAgICAgIHR5cGUgPSBtYXRjaFs5XSB8fCBcIlwiO1xuXG4gIC8vIFRoZSBcIm5cIiB0eXBlIGlzIGFuIGFsaWFzIGZvciBcIixnXCIuXG4gIGlmICh0eXBlID09PSBcIm5cIikgY29tbWEgPSB0cnVlLCB0eXBlID0gXCJnXCI7XG5cbiAgLy8gTWFwIGludmFsaWQgdHlwZXMgdG8gdGhlIGRlZmF1bHQgZm9ybWF0LlxuICBlbHNlIGlmICghZm9ybWF0VHlwZXNbdHlwZV0pIHR5cGUgPSBcIlwiO1xuXG4gIC8vIElmIHplcm8gZmlsbCBpcyBzcGVjaWZpZWQsIHBhZGRpbmcgZ29lcyBhZnRlciBzaWduIGFuZCBiZWZvcmUgZGlnaXRzLlxuICBpZiAoemVybyB8fCAoZmlsbCA9PT0gXCIwXCIgJiYgYWxpZ24gPT09IFwiPVwiKSkgemVybyA9IHRydWUsIGZpbGwgPSBcIjBcIiwgYWxpZ24gPSBcIj1cIjtcblxuICB0aGlzLmZpbGwgPSBmaWxsO1xuICB0aGlzLmFsaWduID0gYWxpZ247XG4gIHRoaXMuc2lnbiA9IHNpZ247XG4gIHRoaXMuc3ltYm9sID0gc3ltYm9sO1xuICB0aGlzLnplcm8gPSB6ZXJvO1xuICB0aGlzLndpZHRoID0gd2lkdGg7XG4gIHRoaXMuY29tbWEgPSBjb21tYTtcbiAgdGhpcy5wcmVjaXNpb24gPSBwcmVjaXNpb247XG4gIHRoaXMudHlwZSA9IHR5cGU7XG59XG5cbkZvcm1hdFNwZWNpZmllci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZmlsbFxuICAgICAgKyB0aGlzLmFsaWduXG4gICAgICArIHRoaXMuc2lnblxuICAgICAgKyB0aGlzLnN5bWJvbFxuICAgICAgKyAodGhpcy56ZXJvID8gXCIwXCIgOiBcIlwiKVxuICAgICAgKyAodGhpcy53aWR0aCA9PSBudWxsID8gXCJcIiA6IE1hdGgubWF4KDEsIHRoaXMud2lkdGggfCAwKSlcbiAgICAgICsgKHRoaXMuY29tbWEgPyBcIixcIiA6IFwiXCIpXG4gICAgICArICh0aGlzLnByZWNpc2lvbiA9PSBudWxsID8gXCJcIiA6IFwiLlwiICsgTWF0aC5tYXgoMCwgdGhpcy5wcmVjaXNpb24gfCAwKSlcbiAgICAgICsgdGhpcy50eXBlO1xufTtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHg7XG59XG4iLCJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnRcIjtcbmltcG9ydCBmb3JtYXRHcm91cCBmcm9tIFwiLi9mb3JtYXRHcm91cFwiO1xuaW1wb3J0IGZvcm1hdE51bWVyYWxzIGZyb20gXCIuL2Zvcm1hdE51bWVyYWxzXCI7XG5pbXBvcnQgZm9ybWF0U3BlY2lmaWVyIGZyb20gXCIuL2Zvcm1hdFNwZWNpZmllclwiO1xuaW1wb3J0IGZvcm1hdFR5cGVzIGZyb20gXCIuL2Zvcm1hdFR5cGVzXCI7XG5pbXBvcnQge3ByZWZpeEV4cG9uZW50fSBmcm9tIFwiLi9mb3JtYXRQcmVmaXhBdXRvXCI7XG5pbXBvcnQgaWRlbnRpdHkgZnJvbSBcIi4vaWRlbnRpdHlcIjtcblxudmFyIHByZWZpeGVzID0gW1wieVwiLFwielwiLFwiYVwiLFwiZlwiLFwicFwiLFwiblwiLFwiwrVcIixcIm1cIixcIlwiLFwia1wiLFwiTVwiLFwiR1wiLFwiVFwiLFwiUFwiLFwiRVwiLFwiWlwiLFwiWVwiXTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obG9jYWxlKSB7XG4gIHZhciBncm91cCA9IGxvY2FsZS5ncm91cGluZyAmJiBsb2NhbGUudGhvdXNhbmRzID8gZm9ybWF0R3JvdXAobG9jYWxlLmdyb3VwaW5nLCBsb2NhbGUudGhvdXNhbmRzKSA6IGlkZW50aXR5LFxuICAgICAgY3VycmVuY3kgPSBsb2NhbGUuY3VycmVuY3ksXG4gICAgICBkZWNpbWFsID0gbG9jYWxlLmRlY2ltYWwsXG4gICAgICBudW1lcmFscyA9IGxvY2FsZS5udW1lcmFscyA/IGZvcm1hdE51bWVyYWxzKGxvY2FsZS5udW1lcmFscykgOiBpZGVudGl0eSxcbiAgICAgIHBlcmNlbnQgPSBsb2NhbGUucGVyY2VudCB8fCBcIiVcIjtcblxuICBmdW5jdGlvbiBuZXdGb3JtYXQoc3BlY2lmaWVyKSB7XG4gICAgc3BlY2lmaWVyID0gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcik7XG5cbiAgICB2YXIgZmlsbCA9IHNwZWNpZmllci5maWxsLFxuICAgICAgICBhbGlnbiA9IHNwZWNpZmllci5hbGlnbixcbiAgICAgICAgc2lnbiA9IHNwZWNpZmllci5zaWduLFxuICAgICAgICBzeW1ib2wgPSBzcGVjaWZpZXIuc3ltYm9sLFxuICAgICAgICB6ZXJvID0gc3BlY2lmaWVyLnplcm8sXG4gICAgICAgIHdpZHRoID0gc3BlY2lmaWVyLndpZHRoLFxuICAgICAgICBjb21tYSA9IHNwZWNpZmllci5jb21tYSxcbiAgICAgICAgcHJlY2lzaW9uID0gc3BlY2lmaWVyLnByZWNpc2lvbixcbiAgICAgICAgdHlwZSA9IHNwZWNpZmllci50eXBlO1xuXG4gICAgLy8gQ29tcHV0ZSB0aGUgcHJlZml4IGFuZCBzdWZmaXguXG4gICAgLy8gRm9yIFNJLXByZWZpeCwgdGhlIHN1ZmZpeCBpcyBsYXppbHkgY29tcHV0ZWQuXG4gICAgdmFyIHByZWZpeCA9IHN5bWJvbCA9PT0gXCIkXCIgPyBjdXJyZW5jeVswXSA6IHN5bWJvbCA9PT0gXCIjXCIgJiYgL1tib3hYXS8udGVzdCh0eXBlKSA/IFwiMFwiICsgdHlwZS50b0xvd2VyQ2FzZSgpIDogXCJcIixcbiAgICAgICAgc3VmZml4ID0gc3ltYm9sID09PSBcIiRcIiA/IGN1cnJlbmN5WzFdIDogL1slcF0vLnRlc3QodHlwZSkgPyBwZXJjZW50IDogXCJcIjtcblxuICAgIC8vIFdoYXQgZm9ybWF0IGZ1bmN0aW9uIHNob3VsZCB3ZSB1c2U/XG4gICAgLy8gSXMgdGhpcyBhbiBpbnRlZ2VyIHR5cGU/XG4gICAgLy8gQ2FuIHRoaXMgdHlwZSBnZW5lcmF0ZSBleHBvbmVudGlhbCBub3RhdGlvbj9cbiAgICB2YXIgZm9ybWF0VHlwZSA9IGZvcm1hdFR5cGVzW3R5cGVdLFxuICAgICAgICBtYXliZVN1ZmZpeCA9ICF0eXBlIHx8IC9bZGVmZ3BycyVdLy50ZXN0KHR5cGUpO1xuXG4gICAgLy8gU2V0IHRoZSBkZWZhdWx0IHByZWNpc2lvbiBpZiBub3Qgc3BlY2lmaWVkLFxuICAgIC8vIG9yIGNsYW1wIHRoZSBzcGVjaWZpZWQgcHJlY2lzaW9uIHRvIHRoZSBzdXBwb3J0ZWQgcmFuZ2UuXG4gICAgLy8gRm9yIHNpZ25pZmljYW50IHByZWNpc2lvbiwgaXQgbXVzdCBiZSBpbiBbMSwgMjFdLlxuICAgIC8vIEZvciBmaXhlZCBwcmVjaXNpb24sIGl0IG11c3QgYmUgaW4gWzAsIDIwXS5cbiAgICBwcmVjaXNpb24gPSBwcmVjaXNpb24gPT0gbnVsbCA/ICh0eXBlID8gNiA6IDEyKVxuICAgICAgICA6IC9bZ3Byc10vLnRlc3QodHlwZSkgPyBNYXRoLm1heCgxLCBNYXRoLm1pbigyMSwgcHJlY2lzaW9uKSlcbiAgICAgICAgOiBNYXRoLm1heCgwLCBNYXRoLm1pbigyMCwgcHJlY2lzaW9uKSk7XG5cbiAgICBmdW5jdGlvbiBmb3JtYXQodmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZVByZWZpeCA9IHByZWZpeCxcbiAgICAgICAgICB2YWx1ZVN1ZmZpeCA9IHN1ZmZpeCxcbiAgICAgICAgICBpLCBuLCBjO1xuXG4gICAgICBpZiAodHlwZSA9PT0gXCJjXCIpIHtcbiAgICAgICAgdmFsdWVTdWZmaXggPSBmb3JtYXRUeXBlKHZhbHVlKSArIHZhbHVlU3VmZml4O1xuICAgICAgICB2YWx1ZSA9IFwiXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9ICt2YWx1ZTtcblxuICAgICAgICAvLyBQZXJmb3JtIHRoZSBpbml0aWFsIGZvcm1hdHRpbmcuXG4gICAgICAgIHZhciB2YWx1ZU5lZ2F0aXZlID0gdmFsdWUgPCAwO1xuICAgICAgICB2YWx1ZSA9IGZvcm1hdFR5cGUoTWF0aC5hYnModmFsdWUpLCBwcmVjaXNpb24pO1xuXG4gICAgICAgIC8vIElmIGEgbmVnYXRpdmUgdmFsdWUgcm91bmRzIHRvIHplcm8gZHVyaW5nIGZvcm1hdHRpbmcsIHRyZWF0IGFzIHBvc2l0aXZlLlxuICAgICAgICBpZiAodmFsdWVOZWdhdGl2ZSAmJiArdmFsdWUgPT09IDApIHZhbHVlTmVnYXRpdmUgPSBmYWxzZTtcblxuICAgICAgICAvLyBDb21wdXRlIHRoZSBwcmVmaXggYW5kIHN1ZmZpeC5cbiAgICAgICAgdmFsdWVQcmVmaXggPSAodmFsdWVOZWdhdGl2ZSA/IChzaWduID09PSBcIihcIiA/IHNpZ24gOiBcIi1cIikgOiBzaWduID09PSBcIi1cIiB8fCBzaWduID09PSBcIihcIiA/IFwiXCIgOiBzaWduKSArIHZhbHVlUHJlZml4O1xuICAgICAgICB2YWx1ZVN1ZmZpeCA9ICh0eXBlID09PSBcInNcIiA/IHByZWZpeGVzWzggKyBwcmVmaXhFeHBvbmVudCAvIDNdIDogXCJcIikgKyB2YWx1ZVN1ZmZpeCArICh2YWx1ZU5lZ2F0aXZlICYmIHNpZ24gPT09IFwiKFwiID8gXCIpXCIgOiBcIlwiKTtcblxuICAgICAgICAvLyBCcmVhayB0aGUgZm9ybWF0dGVkIHZhbHVlIGludG8gdGhlIGludGVnZXIg4oCcdmFsdWXigJ0gcGFydCB0aGF0IGNhbiBiZVxuICAgICAgICAvLyBncm91cGVkLCBhbmQgZnJhY3Rpb25hbCBvciBleHBvbmVudGlhbCDigJxzdWZmaXjigJ0gcGFydCB0aGF0IGlzIG5vdC5cbiAgICAgICAgaWYgKG1heWJlU3VmZml4KSB7XG4gICAgICAgICAgaSA9IC0xLCBuID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgICAgICBpZiAoYyA9IHZhbHVlLmNoYXJDb2RlQXQoaSksIDQ4ID4gYyB8fCBjID4gNTcpIHtcbiAgICAgICAgICAgICAgdmFsdWVTdWZmaXggPSAoYyA9PT0gNDYgPyBkZWNpbWFsICsgdmFsdWUuc2xpY2UoaSArIDEpIDogdmFsdWUuc2xpY2UoaSkpICsgdmFsdWVTdWZmaXg7XG4gICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc2xpY2UoMCwgaSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgZmlsbCBjaGFyYWN0ZXIgaXMgbm90IFwiMFwiLCBncm91cGluZyBpcyBhcHBsaWVkIGJlZm9yZSBwYWRkaW5nLlxuICAgICAgaWYgKGNvbW1hICYmICF6ZXJvKSB2YWx1ZSA9IGdyb3VwKHZhbHVlLCBJbmZpbml0eSk7XG5cbiAgICAgIC8vIENvbXB1dGUgdGhlIHBhZGRpbmcuXG4gICAgICB2YXIgbGVuZ3RoID0gdmFsdWVQcmVmaXgubGVuZ3RoICsgdmFsdWUubGVuZ3RoICsgdmFsdWVTdWZmaXgubGVuZ3RoLFxuICAgICAgICAgIHBhZGRpbmcgPSBsZW5ndGggPCB3aWR0aCA/IG5ldyBBcnJheSh3aWR0aCAtIGxlbmd0aCArIDEpLmpvaW4oZmlsbCkgOiBcIlwiO1xuXG4gICAgICAvLyBJZiB0aGUgZmlsbCBjaGFyYWN0ZXIgaXMgXCIwXCIsIGdyb3VwaW5nIGlzIGFwcGxpZWQgYWZ0ZXIgcGFkZGluZy5cbiAgICAgIGlmIChjb21tYSAmJiB6ZXJvKSB2YWx1ZSA9IGdyb3VwKHBhZGRpbmcgKyB2YWx1ZSwgcGFkZGluZy5sZW5ndGggPyB3aWR0aCAtIHZhbHVlU3VmZml4Lmxlbmd0aCA6IEluZmluaXR5KSwgcGFkZGluZyA9IFwiXCI7XG5cbiAgICAgIC8vIFJlY29uc3RydWN0IHRoZSBmaW5hbCBvdXRwdXQgYmFzZWQgb24gdGhlIGRlc2lyZWQgYWxpZ25tZW50LlxuICAgICAgc3dpdGNoIChhbGlnbikge1xuICAgICAgICBjYXNlIFwiPFwiOiB2YWx1ZSA9IHZhbHVlUHJlZml4ICsgdmFsdWUgKyB2YWx1ZVN1ZmZpeCArIHBhZGRpbmc7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiPVwiOiB2YWx1ZSA9IHZhbHVlUHJlZml4ICsgcGFkZGluZyArIHZhbHVlICsgdmFsdWVTdWZmaXg7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiXlwiOiB2YWx1ZSA9IHBhZGRpbmcuc2xpY2UoMCwgbGVuZ3RoID0gcGFkZGluZy5sZW5ndGggPj4gMSkgKyB2YWx1ZVByZWZpeCArIHZhbHVlICsgdmFsdWVTdWZmaXggKyBwYWRkaW5nLnNsaWNlKGxlbmd0aCk7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OiB2YWx1ZSA9IHBhZGRpbmcgKyB2YWx1ZVByZWZpeCArIHZhbHVlICsgdmFsdWVTdWZmaXg7IGJyZWFrO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbnVtZXJhbHModmFsdWUpO1xuICAgIH1cblxuICAgIGZvcm1hdC50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHNwZWNpZmllciArIFwiXCI7XG4gICAgfTtcblxuICAgIHJldHVybiBmb3JtYXQ7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRQcmVmaXgoc3BlY2lmaWVyLCB2YWx1ZSkge1xuICAgIHZhciBmID0gbmV3Rm9ybWF0KChzcGVjaWZpZXIgPSBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKSwgc3BlY2lmaWVyLnR5cGUgPSBcImZcIiwgc3BlY2lmaWVyKSksXG4gICAgICAgIGUgPSBNYXRoLm1heCgtOCwgTWF0aC5taW4oOCwgTWF0aC5mbG9vcihleHBvbmVudCh2YWx1ZSkgLyAzKSkpICogMyxcbiAgICAgICAgayA9IE1hdGgucG93KDEwLCAtZSksXG4gICAgICAgIHByZWZpeCA9IHByZWZpeGVzWzggKyBlIC8gM107XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gZihrICogdmFsdWUpICsgcHJlZml4O1xuICAgIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdDogbmV3Rm9ybWF0LFxuICAgIGZvcm1hdFByZWZpeDogZm9ybWF0UHJlZml4XG4gIH07XG59XG4iLCJpbXBvcnQgZm9ybWF0TG9jYWxlIGZyb20gXCIuL2xvY2FsZVwiO1xuXG52YXIgbG9jYWxlO1xuZXhwb3J0IHZhciBmb3JtYXQ7XG5leHBvcnQgdmFyIGZvcm1hdFByZWZpeDtcblxuZGVmYXVsdExvY2FsZSh7XG4gIGRlY2ltYWw6IFwiLlwiLFxuICB0aG91c2FuZHM6IFwiLFwiLFxuICBncm91cGluZzogWzNdLFxuICBjdXJyZW5jeTogW1wiJFwiLCBcIlwiXVxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRlZmF1bHRMb2NhbGUoZGVmaW5pdGlvbikge1xuICBsb2NhbGUgPSBmb3JtYXRMb2NhbGUoZGVmaW5pdGlvbik7XG4gIGZvcm1hdCA9IGxvY2FsZS5mb3JtYXQ7XG4gIGZvcm1hdFByZWZpeCA9IGxvY2FsZS5mb3JtYXRQcmVmaXg7XG4gIHJldHVybiBsb2NhbGU7XG59XG4iLCJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RlcCkge1xuICByZXR1cm4gTWF0aC5tYXgoMCwgLWV4cG9uZW50KE1hdGguYWJzKHN0ZXApKSk7XG59XG4iLCJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RlcCwgdmFsdWUpIHtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWF4KC04LCBNYXRoLm1pbig4LCBNYXRoLmZsb29yKGV4cG9uZW50KHZhbHVlKSAvIDMpKSkgKiAzIC0gZXhwb25lbnQoTWF0aC5hYnMoc3RlcCkpKTtcbn1cbiIsImltcG9ydCBleHBvbmVudCBmcm9tIFwiLi9leHBvbmVudFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzdGVwLCBtYXgpIHtcbiAgc3RlcCA9IE1hdGguYWJzKHN0ZXApLCBtYXggPSBNYXRoLmFicyhtYXgpIC0gc3RlcDtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIGV4cG9uZW50KG1heCkgLSBleHBvbmVudChzdGVwKSkgKyAxO1xufVxuIiwiaW1wb3J0IHt0aWNrU3RlcH0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge2Zvcm1hdCwgZm9ybWF0UHJlZml4LCBmb3JtYXRTcGVjaWZpZXIsIHByZWNpc2lvbkZpeGVkLCBwcmVjaXNpb25QcmVmaXgsIHByZWNpc2lvblJvdW5kfSBmcm9tIFwiZDMtZm9ybWF0XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGRvbWFpbiwgY291bnQsIHNwZWNpZmllcikge1xuICB2YXIgc3RhcnQgPSBkb21haW5bMF0sXG4gICAgICBzdG9wID0gZG9tYWluW2RvbWFpbi5sZW5ndGggLSAxXSxcbiAgICAgIHN0ZXAgPSB0aWNrU3RlcChzdGFydCwgc3RvcCwgY291bnQgPT0gbnVsbCA/IDEwIDogY291bnQpLFxuICAgICAgcHJlY2lzaW9uO1xuICBzcGVjaWZpZXIgPSBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyID09IG51bGwgPyBcIixmXCIgOiBzcGVjaWZpZXIpO1xuICBzd2l0Y2ggKHNwZWNpZmllci50eXBlKSB7XG4gICAgY2FzZSBcInNcIjoge1xuICAgICAgdmFyIHZhbHVlID0gTWF0aC5tYXgoTWF0aC5hYnMoc3RhcnQpLCBNYXRoLmFicyhzdG9wKSk7XG4gICAgICBpZiAoc3BlY2lmaWVyLnByZWNpc2lvbiA9PSBudWxsICYmICFpc05hTihwcmVjaXNpb24gPSBwcmVjaXNpb25QcmVmaXgoc3RlcCwgdmFsdWUpKSkgc3BlY2lmaWVyLnByZWNpc2lvbiA9IHByZWNpc2lvbjtcbiAgICAgIHJldHVybiBmb3JtYXRQcmVmaXgoc3BlY2lmaWVyLCB2YWx1ZSk7XG4gICAgfVxuICAgIGNhc2UgXCJcIjpcbiAgICBjYXNlIFwiZVwiOlxuICAgIGNhc2UgXCJnXCI6XG4gICAgY2FzZSBcInBcIjpcbiAgICBjYXNlIFwiclwiOiB7XG4gICAgICBpZiAoc3BlY2lmaWVyLnByZWNpc2lvbiA9PSBudWxsICYmICFpc05hTihwcmVjaXNpb24gPSBwcmVjaXNpb25Sb3VuZChzdGVwLCBNYXRoLm1heChNYXRoLmFicyhzdGFydCksIE1hdGguYWJzKHN0b3ApKSkpKSBzcGVjaWZpZXIucHJlY2lzaW9uID0gcHJlY2lzaW9uIC0gKHNwZWNpZmllci50eXBlID09PSBcImVcIik7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2FzZSBcImZcIjpcbiAgICBjYXNlIFwiJVwiOiB7XG4gICAgICBpZiAoc3BlY2lmaWVyLnByZWNpc2lvbiA9PSBudWxsICYmICFpc05hTihwcmVjaXNpb24gPSBwcmVjaXNpb25GaXhlZChzdGVwKSkpIHNwZWNpZmllci5wcmVjaXNpb24gPSBwcmVjaXNpb24gLSAoc3BlY2lmaWVyLnR5cGUgPT09IFwiJVwiKSAqIDI7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZvcm1hdChzcGVjaWZpZXIpO1xufVxuIiwiaW1wb3J0IHt0aWNrcywgdGlja0luY3JlbWVudH0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge2ludGVycG9sYXRlTnVtYmVyIGFzIHJlaW50ZXJwb2xhdGV9IGZyb20gXCJkMy1pbnRlcnBvbGF0ZVwiO1xuaW1wb3J0IHtkZWZhdWx0IGFzIGNvbnRpbnVvdXMsIGNvcHksIGRlaW50ZXJwb2xhdGVMaW5lYXIgYXMgZGVpbnRlcnBvbGF0ZX0gZnJvbSBcIi4vY29udGludW91c1wiO1xuaW1wb3J0IHRpY2tGb3JtYXQgZnJvbSBcIi4vdGlja0Zvcm1hdFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gbGluZWFyaXNoKHNjYWxlKSB7XG4gIHZhciBkb21haW4gPSBzY2FsZS5kb21haW47XG5cbiAgc2NhbGUudGlja3MgPSBmdW5jdGlvbihjb3VudCkge1xuICAgIHZhciBkID0gZG9tYWluKCk7XG4gICAgcmV0dXJuIHRpY2tzKGRbMF0sIGRbZC5sZW5ndGggLSAxXSwgY291bnQgPT0gbnVsbCA/IDEwIDogY291bnQpO1xuICB9O1xuXG4gIHNjYWxlLnRpY2tGb3JtYXQgPSBmdW5jdGlvbihjb3VudCwgc3BlY2lmaWVyKSB7XG4gICAgcmV0dXJuIHRpY2tGb3JtYXQoZG9tYWluKCksIGNvdW50LCBzcGVjaWZpZXIpO1xuICB9O1xuXG4gIHNjYWxlLm5pY2UgPSBmdW5jdGlvbihjb3VudCkge1xuICAgIGlmIChjb3VudCA9PSBudWxsKSBjb3VudCA9IDEwO1xuXG4gICAgdmFyIGQgPSBkb21haW4oKSxcbiAgICAgICAgaTAgPSAwLFxuICAgICAgICBpMSA9IGQubGVuZ3RoIC0gMSxcbiAgICAgICAgc3RhcnQgPSBkW2kwXSxcbiAgICAgICAgc3RvcCA9IGRbaTFdLFxuICAgICAgICBzdGVwO1xuXG4gICAgaWYgKHN0b3AgPCBzdGFydCkge1xuICAgICAgc3RlcCA9IHN0YXJ0LCBzdGFydCA9IHN0b3AsIHN0b3AgPSBzdGVwO1xuICAgICAgc3RlcCA9IGkwLCBpMCA9IGkxLCBpMSA9IHN0ZXA7XG4gICAgfVxuXG4gICAgc3RlcCA9IHRpY2tJbmNyZW1lbnQoc3RhcnQsIHN0b3AsIGNvdW50KTtcblxuICAgIGlmIChzdGVwID4gMCkge1xuICAgICAgc3RhcnQgPSBNYXRoLmZsb29yKHN0YXJ0IC8gc3RlcCkgKiBzdGVwO1xuICAgICAgc3RvcCA9IE1hdGguY2VpbChzdG9wIC8gc3RlcCkgKiBzdGVwO1xuICAgICAgc3RlcCA9IHRpY2tJbmNyZW1lbnQoc3RhcnQsIHN0b3AsIGNvdW50KTtcbiAgICB9IGVsc2UgaWYgKHN0ZXAgPCAwKSB7XG4gICAgICBzdGFydCA9IE1hdGguY2VpbChzdGFydCAqIHN0ZXApIC8gc3RlcDtcbiAgICAgIHN0b3AgPSBNYXRoLmZsb29yKHN0b3AgKiBzdGVwKSAvIHN0ZXA7XG4gICAgICBzdGVwID0gdGlja0luY3JlbWVudChzdGFydCwgc3RvcCwgY291bnQpO1xuICAgIH1cblxuICAgIGlmIChzdGVwID4gMCkge1xuICAgICAgZFtpMF0gPSBNYXRoLmZsb29yKHN0YXJ0IC8gc3RlcCkgKiBzdGVwO1xuICAgICAgZFtpMV0gPSBNYXRoLmNlaWwoc3RvcCAvIHN0ZXApICogc3RlcDtcbiAgICAgIGRvbWFpbihkKTtcbiAgICB9IGVsc2UgaWYgKHN0ZXAgPCAwKSB7XG4gICAgICBkW2kwXSA9IE1hdGguY2VpbChzdGFydCAqIHN0ZXApIC8gc3RlcDtcbiAgICAgIGRbaTFdID0gTWF0aC5mbG9vcihzdG9wICogc3RlcCkgLyBzdGVwO1xuICAgICAgZG9tYWluKGQpO1xuICAgIH1cblxuICAgIHJldHVybiBzY2FsZTtcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGxpbmVhcigpIHtcbiAgdmFyIHNjYWxlID0gY29udGludW91cyhkZWludGVycG9sYXRlLCByZWludGVycG9sYXRlKTtcblxuICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNvcHkoc2NhbGUsIGxpbmVhcigpKTtcbiAgfTtcblxuICByZXR1cm4gbGluZWFyaXNoKHNjYWxlKTtcbn1cbiIsInZhciB0MCA9IG5ldyBEYXRlLFxuICAgIHQxID0gbmV3IERhdGU7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG5ld0ludGVydmFsKGZsb29yaSwgb2Zmc2V0aSwgY291bnQsIGZpZWxkKSB7XG5cbiAgZnVuY3Rpb24gaW50ZXJ2YWwoZGF0ZSkge1xuICAgIHJldHVybiBmbG9vcmkoZGF0ZSA9IG5ldyBEYXRlKCtkYXRlKSksIGRhdGU7XG4gIH1cblxuICBpbnRlcnZhbC5mbG9vciA9IGludGVydmFsO1xuXG4gIGludGVydmFsLmNlaWwgPSBmdW5jdGlvbihkYXRlKSB7XG4gICAgcmV0dXJuIGZsb29yaShkYXRlID0gbmV3IERhdGUoZGF0ZSAtIDEpKSwgb2Zmc2V0aShkYXRlLCAxKSwgZmxvb3JpKGRhdGUpLCBkYXRlO1xuICB9O1xuXG4gIGludGVydmFsLnJvdW5kID0gZnVuY3Rpb24oZGF0ZSkge1xuICAgIHZhciBkMCA9IGludGVydmFsKGRhdGUpLFxuICAgICAgICBkMSA9IGludGVydmFsLmNlaWwoZGF0ZSk7XG4gICAgcmV0dXJuIGRhdGUgLSBkMCA8IGQxIC0gZGF0ZSA/IGQwIDogZDE7XG4gIH07XG5cbiAgaW50ZXJ2YWwub2Zmc2V0ID0gZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIHJldHVybiBvZmZzZXRpKGRhdGUgPSBuZXcgRGF0ZSgrZGF0ZSksIHN0ZXAgPT0gbnVsbCA/IDEgOiBNYXRoLmZsb29yKHN0ZXApKSwgZGF0ZTtcbiAgfTtcblxuICBpbnRlcnZhbC5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgdmFyIHJhbmdlID0gW10sIHByZXZpb3VzO1xuICAgIHN0YXJ0ID0gaW50ZXJ2YWwuY2VpbChzdGFydCk7XG4gICAgc3RlcCA9IHN0ZXAgPT0gbnVsbCA/IDEgOiBNYXRoLmZsb29yKHN0ZXApO1xuICAgIGlmICghKHN0YXJ0IDwgc3RvcCkgfHwgIShzdGVwID4gMCkpIHJldHVybiByYW5nZTsgLy8gYWxzbyBoYW5kbGVzIEludmFsaWQgRGF0ZVxuICAgIGRvIHJhbmdlLnB1c2gocHJldmlvdXMgPSBuZXcgRGF0ZSgrc3RhcnQpKSwgb2Zmc2V0aShzdGFydCwgc3RlcCksIGZsb29yaShzdGFydCk7XG4gICAgd2hpbGUgKHByZXZpb3VzIDwgc3RhcnQgJiYgc3RhcnQgPCBzdG9wKTtcbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgaW50ZXJ2YWwuZmlsdGVyID0gZnVuY3Rpb24odGVzdCkge1xuICAgIHJldHVybiBuZXdJbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgICBpZiAoZGF0ZSA+PSBkYXRlKSB3aGlsZSAoZmxvb3JpKGRhdGUpLCAhdGVzdChkYXRlKSkgZGF0ZS5zZXRUaW1lKGRhdGUgLSAxKTtcbiAgICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgICBpZiAoZGF0ZSA+PSBkYXRlKSB7XG4gICAgICAgIGlmIChzdGVwIDwgMCkgd2hpbGUgKCsrc3RlcCA8PSAwKSB7XG4gICAgICAgICAgd2hpbGUgKG9mZnNldGkoZGF0ZSwgLTEpLCAhdGVzdChkYXRlKSkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eVxuICAgICAgICB9IGVsc2Ugd2hpbGUgKC0tc3RlcCA+PSAwKSB7XG4gICAgICAgICAgd2hpbGUgKG9mZnNldGkoZGF0ZSwgKzEpLCAhdGVzdChkYXRlKSkge30gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgaWYgKGNvdW50KSB7XG4gICAgaW50ZXJ2YWwuY291bnQgPSBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgICB0MC5zZXRUaW1lKCtzdGFydCksIHQxLnNldFRpbWUoK2VuZCk7XG4gICAgICBmbG9vcmkodDApLCBmbG9vcmkodDEpO1xuICAgICAgcmV0dXJuIE1hdGguZmxvb3IoY291bnQodDAsIHQxKSk7XG4gICAgfTtcblxuICAgIGludGVydmFsLmV2ZXJ5ID0gZnVuY3Rpb24oc3RlcCkge1xuICAgICAgc3RlcCA9IE1hdGguZmxvb3Ioc3RlcCk7XG4gICAgICByZXR1cm4gIWlzRmluaXRlKHN0ZXApIHx8ICEoc3RlcCA+IDApID8gbnVsbFxuICAgICAgICAgIDogIShzdGVwID4gMSkgPyBpbnRlcnZhbFxuICAgICAgICAgIDogaW50ZXJ2YWwuZmlsdGVyKGZpZWxkXG4gICAgICAgICAgICAgID8gZnVuY3Rpb24oZCkgeyByZXR1cm4gZmllbGQoZCkgJSBzdGVwID09PSAwOyB9XG4gICAgICAgICAgICAgIDogZnVuY3Rpb24oZCkgeyByZXR1cm4gaW50ZXJ2YWwuY291bnQoMCwgZCkgJSBzdGVwID09PSAwOyB9KTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGludGVydmFsO1xufVxuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5cbnZhciBtaWxsaXNlY29uZCA9IGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAvLyBub29wXG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gZW5kIC0gc3RhcnQ7XG59KTtcblxuLy8gQW4gb3B0aW1pemVkIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIHNpbXBsZSBjYXNlLlxubWlsbGlzZWNvbmQuZXZlcnkgPSBmdW5jdGlvbihrKSB7XG4gIGsgPSBNYXRoLmZsb29yKGspO1xuICBpZiAoIWlzRmluaXRlKGspIHx8ICEoayA+IDApKSByZXR1cm4gbnVsbDtcbiAgaWYgKCEoayA+IDEpKSByZXR1cm4gbWlsbGlzZWNvbmQ7XG4gIHJldHVybiBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRUaW1lKE1hdGguZmxvb3IoZGF0ZSAvIGspICogayk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogayk7XG4gIH0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGs7XG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgbWlsbGlzZWNvbmQ7XG5leHBvcnQgdmFyIG1pbGxpc2Vjb25kcyA9IG1pbGxpc2Vjb25kLnJhbmdlO1xuIiwiZXhwb3J0IHZhciBkdXJhdGlvblNlY29uZCA9IDFlMztcbmV4cG9ydCB2YXIgZHVyYXRpb25NaW51dGUgPSA2ZTQ7XG5leHBvcnQgdmFyIGR1cmF0aW9uSG91ciA9IDM2ZTU7XG5leHBvcnQgdmFyIGR1cmF0aW9uRGF5ID0gODY0ZTU7XG5leHBvcnQgdmFyIGR1cmF0aW9uV2VlayA9IDYwNDhlNTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvblNlY29uZH0gZnJvbSBcIi4vZHVyYXRpb25cIjtcblxudmFyIHNlY29uZCA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRUaW1lKE1hdGguZmxvb3IoZGF0ZSAvIGR1cmF0aW9uU2Vjb25kKSAqIGR1cmF0aW9uU2Vjb25kKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uU2Vjb25kKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvblNlY29uZDtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDU2Vjb25kcygpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IHNlY29uZDtcbmV4cG9ydCB2YXIgc2Vjb25kcyA9IHNlY29uZC5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbk1pbnV0ZX0gZnJvbSBcIi4vZHVyYXRpb25cIjtcblxudmFyIG1pbnV0ZSA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRUaW1lKE1hdGguZmxvb3IoZGF0ZSAvIGR1cmF0aW9uTWludXRlKSAqIGR1cmF0aW9uTWludXRlKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uTWludXRlKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbk1pbnV0ZTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0TWludXRlcygpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IG1pbnV0ZTtcbmV4cG9ydCB2YXIgbWludXRlcyA9IG1pbnV0ZS5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbkhvdXIsIGR1cmF0aW9uTWludXRlfSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG52YXIgaG91ciA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgdmFyIG9mZnNldCA9IGRhdGUuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIGR1cmF0aW9uTWludXRlICUgZHVyYXRpb25Ib3VyO1xuICBpZiAob2Zmc2V0IDwgMCkgb2Zmc2V0ICs9IGR1cmF0aW9uSG91cjtcbiAgZGF0ZS5zZXRUaW1lKE1hdGguZmxvb3IoKCtkYXRlIC0gb2Zmc2V0KSAvIGR1cmF0aW9uSG91cikgKiBkdXJhdGlvbkhvdXIgKyBvZmZzZXQpO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogZHVyYXRpb25Ib3VyKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbkhvdXI7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldEhvdXJzKCk7XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgaG91cjtcbmV4cG9ydCB2YXIgaG91cnMgPSBob3VyLnJhbmdlO1xuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5pbXBvcnQge2R1cmF0aW9uRGF5LCBkdXJhdGlvbk1pbnV0ZX0gZnJvbSBcIi4vZHVyYXRpb25cIjtcblxudmFyIGRheSA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQgLSAoZW5kLmdldFRpbWV6b25lT2Zmc2V0KCkgLSBzdGFydC5nZXRUaW1lem9uZU9mZnNldCgpKSAqIGR1cmF0aW9uTWludXRlKSAvIGR1cmF0aW9uRGF5O1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXREYXRlKCkgLSAxO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRheTtcbmV4cG9ydCB2YXIgZGF5cyA9IGRheS5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbk1pbnV0ZSwgZHVyYXRpb25XZWVrfSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG5mdW5jdGlvbiB3ZWVrZGF5KGkpIHtcbiAgcmV0dXJuIGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSAoZGF0ZS5nZXREYXkoKSArIDcgLSBpKSAlIDcpO1xuICAgIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgKyBzdGVwICogNyk7XG4gIH0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gKGVuZCAtIHN0YXJ0IC0gKGVuZC5nZXRUaW1lem9uZU9mZnNldCgpIC0gc3RhcnQuZ2V0VGltZXpvbmVPZmZzZXQoKSkgKiBkdXJhdGlvbk1pbnV0ZSkgLyBkdXJhdGlvbldlZWs7XG4gIH0pO1xufVxuXG5leHBvcnQgdmFyIHN1bmRheSA9IHdlZWtkYXkoMCk7XG5leHBvcnQgdmFyIG1vbmRheSA9IHdlZWtkYXkoMSk7XG5leHBvcnQgdmFyIHR1ZXNkYXkgPSB3ZWVrZGF5KDIpO1xuZXhwb3J0IHZhciB3ZWRuZXNkYXkgPSB3ZWVrZGF5KDMpO1xuZXhwb3J0IHZhciB0aHVyc2RheSA9IHdlZWtkYXkoNCk7XG5leHBvcnQgdmFyIGZyaWRheSA9IHdlZWtkYXkoNSk7XG5leHBvcnQgdmFyIHNhdHVyZGF5ID0gd2Vla2RheSg2KTtcblxuZXhwb3J0IHZhciBzdW5kYXlzID0gc3VuZGF5LnJhbmdlO1xuZXhwb3J0IHZhciBtb25kYXlzID0gbW9uZGF5LnJhbmdlO1xuZXhwb3J0IHZhciB0dWVzZGF5cyA9IHR1ZXNkYXkucmFuZ2U7XG5leHBvcnQgdmFyIHdlZG5lc2RheXMgPSB3ZWRuZXNkYXkucmFuZ2U7XG5leHBvcnQgdmFyIHRodXJzZGF5cyA9IHRodXJzZGF5LnJhbmdlO1xuZXhwb3J0IHZhciBmcmlkYXlzID0gZnJpZGF5LnJhbmdlO1xuZXhwb3J0IHZhciBzYXR1cmRheXMgPSBzYXR1cmRheS5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuXG52YXIgbW9udGggPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0RGF0ZSgxKTtcbiAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRNb250aChkYXRlLmdldE1vbnRoKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZC5nZXRNb250aCgpIC0gc3RhcnQuZ2V0TW9udGgoKSArIChlbmQuZ2V0RnVsbFllYXIoKSAtIHN0YXJ0LmdldEZ1bGxZZWFyKCkpICogMTI7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldE1vbnRoKCk7XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgbW9udGg7XG5leHBvcnQgdmFyIG1vbnRocyA9IG1vbnRoLnJhbmdlO1xuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5cbnZhciB5ZWFyID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldE1vbnRoKDAsIDEpO1xuICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gZW5kLmdldEZ1bGxZZWFyKCkgLSBzdGFydC5nZXRGdWxsWWVhcigpO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRGdWxsWWVhcigpO1xufSk7XG5cbi8vIEFuIG9wdGltaXplZCBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBzaW1wbGUgY2FzZS5cbnllYXIuZXZlcnkgPSBmdW5jdGlvbihrKSB7XG4gIHJldHVybiAhaXNGaW5pdGUoayA9IE1hdGguZmxvb3IoaykpIHx8ICEoayA+IDApID8gbnVsbCA6IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBkYXRlLnNldEZ1bGxZZWFyKE1hdGguZmxvb3IoZGF0ZS5nZXRGdWxsWWVhcigpIC8gaykgKiBrKTtcbiAgICBkYXRlLnNldE1vbnRoKDAsIDEpO1xuICAgIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSArIHN0ZXAgKiBrKTtcbiAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB5ZWFyO1xuZXhwb3J0IHZhciB5ZWFycyA9IHllYXIucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25NaW51dGV9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciB1dGNNaW51dGUgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VVRDU2Vjb25kcygwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uTWludXRlKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbk1pbnV0ZTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDTWludXRlcygpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IHV0Y01pbnV0ZTtcbmV4cG9ydCB2YXIgdXRjTWludXRlcyA9IHV0Y01pbnV0ZS5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbkhvdXJ9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciB1dGNIb3VyID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFVUQ01pbnV0ZXMoMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbkhvdXIpO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uSG91cjtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDSG91cnMoKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCB1dGNIb3VyO1xuZXhwb3J0IHZhciB1dGNIb3VycyA9IHV0Y0hvdXIucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25EYXl9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciB1dGNEYXkgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uRGF5O1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRVVENEYXRlKCkgLSAxO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IHV0Y0RheTtcbmV4cG9ydCB2YXIgdXRjRGF5cyA9IHV0Y0RheS5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbldlZWt9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbmZ1bmN0aW9uIHV0Y1dlZWtkYXkoaSkge1xuICByZXR1cm4gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSAtIChkYXRlLmdldFVUQ0RheSgpICsgNyAtIGkpICUgNyk7XG4gICAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSArIHN0ZXAgKiA3KTtcbiAgfSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25XZWVrO1xuICB9KTtcbn1cblxuZXhwb3J0IHZhciB1dGNTdW5kYXkgPSB1dGNXZWVrZGF5KDApO1xuZXhwb3J0IHZhciB1dGNNb25kYXkgPSB1dGNXZWVrZGF5KDEpO1xuZXhwb3J0IHZhciB1dGNUdWVzZGF5ID0gdXRjV2Vla2RheSgyKTtcbmV4cG9ydCB2YXIgdXRjV2VkbmVzZGF5ID0gdXRjV2Vla2RheSgzKTtcbmV4cG9ydCB2YXIgdXRjVGh1cnNkYXkgPSB1dGNXZWVrZGF5KDQpO1xuZXhwb3J0IHZhciB1dGNGcmlkYXkgPSB1dGNXZWVrZGF5KDUpO1xuZXhwb3J0IHZhciB1dGNTYXR1cmRheSA9IHV0Y1dlZWtkYXkoNik7XG5cbmV4cG9ydCB2YXIgdXRjU3VuZGF5cyA9IHV0Y1N1bmRheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjTW9uZGF5cyA9IHV0Y01vbmRheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjVHVlc2RheXMgPSB1dGNUdWVzZGF5LnJhbmdlO1xuZXhwb3J0IHZhciB1dGNXZWRuZXNkYXlzID0gdXRjV2VkbmVzZGF5LnJhbmdlO1xuZXhwb3J0IHZhciB1dGNUaHVyc2RheXMgPSB1dGNUaHVyc2RheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjRnJpZGF5cyA9IHV0Y0ZyaWRheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjU2F0dXJkYXlzID0gdXRjU2F0dXJkYXkucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcblxudmFyIHV0Y01vbnRoID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFVUQ0RhdGUoMSk7XG4gIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VVRDTW9udGgoZGF0ZS5nZXRVVENNb250aCgpICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiBlbmQuZ2V0VVRDTW9udGgoKSAtIHN0YXJ0LmdldFVUQ01vbnRoKCkgKyAoZW5kLmdldFVUQ0Z1bGxZZWFyKCkgLSBzdGFydC5nZXRVVENGdWxsWWVhcigpKSAqIDEyO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRVVENNb250aCgpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IHV0Y01vbnRoO1xuZXhwb3J0IHZhciB1dGNNb250aHMgPSB1dGNNb250aC5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuXG52YXIgdXRjWWVhciA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRVVENNb250aCgwLCAxKTtcbiAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRVVENGdWxsWWVhcihkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZC5nZXRVVENGdWxsWWVhcigpIC0gc3RhcnQuZ2V0VVRDRnVsbFllYXIoKTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDRnVsbFllYXIoKTtcbn0pO1xuXG4vLyBBbiBvcHRpbWl6ZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgc2ltcGxlIGNhc2UuXG51dGNZZWFyLmV2ZXJ5ID0gZnVuY3Rpb24oaykge1xuICByZXR1cm4gIWlzRmluaXRlKGsgPSBNYXRoLmZsb29yKGspKSB8fCAhKGsgPiAwKSA/IG51bGwgOiBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRVVENGdWxsWWVhcihNYXRoLmZsb29yKGRhdGUuZ2V0VVRDRnVsbFllYXIoKSAvIGspICogayk7XG4gICAgZGF0ZS5zZXRVVENNb250aCgwLCAxKTtcbiAgICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXRVVENGdWxsWWVhcihkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgKyBzdGVwICogayk7XG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgdXRjWWVhcjtcbmV4cG9ydCB2YXIgdXRjWWVhcnMgPSB1dGNZZWFyLnJhbmdlO1xuIiwiaW1wb3J0IHtcbiAgdGltZURheSxcbiAgdGltZVN1bmRheSxcbiAgdGltZU1vbmRheSxcbiAgdGltZVRodXJzZGF5LFxuICB0aW1lWWVhcixcbiAgdXRjRGF5LFxuICB1dGNTdW5kYXksXG4gIHV0Y01vbmRheSxcbiAgdXRjVGh1cnNkYXksXG4gIHV0Y1llYXJcbn0gZnJvbSBcImQzLXRpbWVcIjtcblxuZnVuY3Rpb24gbG9jYWxEYXRlKGQpIHtcbiAgaWYgKDAgPD0gZC55ICYmIGQueSA8IDEwMCkge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoLTEsIGQubSwgZC5kLCBkLkgsIGQuTSwgZC5TLCBkLkwpO1xuICAgIGRhdGUuc2V0RnVsbFllYXIoZC55KTtcbiAgICByZXR1cm4gZGF0ZTtcbiAgfVxuICByZXR1cm4gbmV3IERhdGUoZC55LCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKTtcbn1cblxuZnVuY3Rpb24gdXRjRGF0ZShkKSB7XG4gIGlmICgwIDw9IGQueSAmJiBkLnkgPCAxMDApIHtcbiAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKERhdGUuVVRDKC0xLCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKSk7XG4gICAgZGF0ZS5zZXRVVENGdWxsWWVhcihkLnkpO1xuICAgIHJldHVybiBkYXRlO1xuICB9XG4gIHJldHVybiBuZXcgRGF0ZShEYXRlLlVUQyhkLnksIGQubSwgZC5kLCBkLkgsIGQuTSwgZC5TLCBkLkwpKTtcbn1cblxuZnVuY3Rpb24gbmV3WWVhcih5KSB7XG4gIHJldHVybiB7eTogeSwgbTogMCwgZDogMSwgSDogMCwgTTogMCwgUzogMCwgTDogMH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGZvcm1hdExvY2FsZShsb2NhbGUpIHtcbiAgdmFyIGxvY2FsZV9kYXRlVGltZSA9IGxvY2FsZS5kYXRlVGltZSxcbiAgICAgIGxvY2FsZV9kYXRlID0gbG9jYWxlLmRhdGUsXG4gICAgICBsb2NhbGVfdGltZSA9IGxvY2FsZS50aW1lLFxuICAgICAgbG9jYWxlX3BlcmlvZHMgPSBsb2NhbGUucGVyaW9kcyxcbiAgICAgIGxvY2FsZV93ZWVrZGF5cyA9IGxvY2FsZS5kYXlzLFxuICAgICAgbG9jYWxlX3Nob3J0V2Vla2RheXMgPSBsb2NhbGUuc2hvcnREYXlzLFxuICAgICAgbG9jYWxlX21vbnRocyA9IGxvY2FsZS5tb250aHMsXG4gICAgICBsb2NhbGVfc2hvcnRNb250aHMgPSBsb2NhbGUuc2hvcnRNb250aHM7XG5cbiAgdmFyIHBlcmlvZFJlID0gZm9ybWF0UmUobG9jYWxlX3BlcmlvZHMpLFxuICAgICAgcGVyaW9kTG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV9wZXJpb2RzKSxcbiAgICAgIHdlZWtkYXlSZSA9IGZvcm1hdFJlKGxvY2FsZV93ZWVrZGF5cyksXG4gICAgICB3ZWVrZGF5TG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV93ZWVrZGF5cyksXG4gICAgICBzaG9ydFdlZWtkYXlSZSA9IGZvcm1hdFJlKGxvY2FsZV9zaG9ydFdlZWtkYXlzKSxcbiAgICAgIHNob3J0V2Vla2RheUxvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfc2hvcnRXZWVrZGF5cyksXG4gICAgICBtb250aFJlID0gZm9ybWF0UmUobG9jYWxlX21vbnRocyksXG4gICAgICBtb250aExvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfbW9udGhzKSxcbiAgICAgIHNob3J0TW9udGhSZSA9IGZvcm1hdFJlKGxvY2FsZV9zaG9ydE1vbnRocyksXG4gICAgICBzaG9ydE1vbnRoTG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV9zaG9ydE1vbnRocyk7XG5cbiAgdmFyIGZvcm1hdHMgPSB7XG4gICAgXCJhXCI6IGZvcm1hdFNob3J0V2Vla2RheSxcbiAgICBcIkFcIjogZm9ybWF0V2Vla2RheSxcbiAgICBcImJcIjogZm9ybWF0U2hvcnRNb250aCxcbiAgICBcIkJcIjogZm9ybWF0TW9udGgsXG4gICAgXCJjXCI6IG51bGwsXG4gICAgXCJkXCI6IGZvcm1hdERheU9mTW9udGgsXG4gICAgXCJlXCI6IGZvcm1hdERheU9mTW9udGgsXG4gICAgXCJmXCI6IGZvcm1hdE1pY3Jvc2Vjb25kcyxcbiAgICBcIkhcIjogZm9ybWF0SG91cjI0LFxuICAgIFwiSVwiOiBmb3JtYXRIb3VyMTIsXG4gICAgXCJqXCI6IGZvcm1hdERheU9mWWVhcixcbiAgICBcIkxcIjogZm9ybWF0TWlsbGlzZWNvbmRzLFxuICAgIFwibVwiOiBmb3JtYXRNb250aE51bWJlcixcbiAgICBcIk1cIjogZm9ybWF0TWludXRlcyxcbiAgICBcInBcIjogZm9ybWF0UGVyaW9kLFxuICAgIFwiUVwiOiBmb3JtYXRVbml4VGltZXN0YW1wLFxuICAgIFwic1wiOiBmb3JtYXRVbml4VGltZXN0YW1wU2Vjb25kcyxcbiAgICBcIlNcIjogZm9ybWF0U2Vjb25kcyxcbiAgICBcInVcIjogZm9ybWF0V2Vla2RheU51bWJlck1vbmRheSxcbiAgICBcIlVcIjogZm9ybWF0V2Vla051bWJlclN1bmRheSxcbiAgICBcIlZcIjogZm9ybWF0V2Vla051bWJlcklTTyxcbiAgICBcIndcIjogZm9ybWF0V2Vla2RheU51bWJlclN1bmRheSxcbiAgICBcIldcIjogZm9ybWF0V2Vla051bWJlck1vbmRheSxcbiAgICBcInhcIjogbnVsbCxcbiAgICBcIlhcIjogbnVsbCxcbiAgICBcInlcIjogZm9ybWF0WWVhcixcbiAgICBcIllcIjogZm9ybWF0RnVsbFllYXIsXG4gICAgXCJaXCI6IGZvcm1hdFpvbmUsXG4gICAgXCIlXCI6IGZvcm1hdExpdGVyYWxQZXJjZW50XG4gIH07XG5cbiAgdmFyIHV0Y0Zvcm1hdHMgPSB7XG4gICAgXCJhXCI6IGZvcm1hdFVUQ1Nob3J0V2Vla2RheSxcbiAgICBcIkFcIjogZm9ybWF0VVRDV2Vla2RheSxcbiAgICBcImJcIjogZm9ybWF0VVRDU2hvcnRNb250aCxcbiAgICBcIkJcIjogZm9ybWF0VVRDTW9udGgsXG4gICAgXCJjXCI6IG51bGwsXG4gICAgXCJkXCI6IGZvcm1hdFVUQ0RheU9mTW9udGgsXG4gICAgXCJlXCI6IGZvcm1hdFVUQ0RheU9mTW9udGgsXG4gICAgXCJmXCI6IGZvcm1hdFVUQ01pY3Jvc2Vjb25kcyxcbiAgICBcIkhcIjogZm9ybWF0VVRDSG91cjI0LFxuICAgIFwiSVwiOiBmb3JtYXRVVENIb3VyMTIsXG4gICAgXCJqXCI6IGZvcm1hdFVUQ0RheU9mWWVhcixcbiAgICBcIkxcIjogZm9ybWF0VVRDTWlsbGlzZWNvbmRzLFxuICAgIFwibVwiOiBmb3JtYXRVVENNb250aE51bWJlcixcbiAgICBcIk1cIjogZm9ybWF0VVRDTWludXRlcyxcbiAgICBcInBcIjogZm9ybWF0VVRDUGVyaW9kLFxuICAgIFwiUVwiOiBmb3JtYXRVbml4VGltZXN0YW1wLFxuICAgIFwic1wiOiBmb3JtYXRVbml4VGltZXN0YW1wU2Vjb25kcyxcbiAgICBcIlNcIjogZm9ybWF0VVRDU2Vjb25kcyxcbiAgICBcInVcIjogZm9ybWF0VVRDV2Vla2RheU51bWJlck1vbmRheSxcbiAgICBcIlVcIjogZm9ybWF0VVRDV2Vla051bWJlclN1bmRheSxcbiAgICBcIlZcIjogZm9ybWF0VVRDV2Vla051bWJlcklTTyxcbiAgICBcIndcIjogZm9ybWF0VVRDV2Vla2RheU51bWJlclN1bmRheSxcbiAgICBcIldcIjogZm9ybWF0VVRDV2Vla051bWJlck1vbmRheSxcbiAgICBcInhcIjogbnVsbCxcbiAgICBcIlhcIjogbnVsbCxcbiAgICBcInlcIjogZm9ybWF0VVRDWWVhcixcbiAgICBcIllcIjogZm9ybWF0VVRDRnVsbFllYXIsXG4gICAgXCJaXCI6IGZvcm1hdFVUQ1pvbmUsXG4gICAgXCIlXCI6IGZvcm1hdExpdGVyYWxQZXJjZW50XG4gIH07XG5cbiAgdmFyIHBhcnNlcyA9IHtcbiAgICBcImFcIjogcGFyc2VTaG9ydFdlZWtkYXksXG4gICAgXCJBXCI6IHBhcnNlV2Vla2RheSxcbiAgICBcImJcIjogcGFyc2VTaG9ydE1vbnRoLFxuICAgIFwiQlwiOiBwYXJzZU1vbnRoLFxuICAgIFwiY1wiOiBwYXJzZUxvY2FsZURhdGVUaW1lLFxuICAgIFwiZFwiOiBwYXJzZURheU9mTW9udGgsXG4gICAgXCJlXCI6IHBhcnNlRGF5T2ZNb250aCxcbiAgICBcImZcIjogcGFyc2VNaWNyb3NlY29uZHMsXG4gICAgXCJIXCI6IHBhcnNlSG91cjI0LFxuICAgIFwiSVwiOiBwYXJzZUhvdXIyNCxcbiAgICBcImpcIjogcGFyc2VEYXlPZlllYXIsXG4gICAgXCJMXCI6IHBhcnNlTWlsbGlzZWNvbmRzLFxuICAgIFwibVwiOiBwYXJzZU1vbnRoTnVtYmVyLFxuICAgIFwiTVwiOiBwYXJzZU1pbnV0ZXMsXG4gICAgXCJwXCI6IHBhcnNlUGVyaW9kLFxuICAgIFwiUVwiOiBwYXJzZVVuaXhUaW1lc3RhbXAsXG4gICAgXCJzXCI6IHBhcnNlVW5peFRpbWVzdGFtcFNlY29uZHMsXG4gICAgXCJTXCI6IHBhcnNlU2Vjb25kcyxcbiAgICBcInVcIjogcGFyc2VXZWVrZGF5TnVtYmVyTW9uZGF5LFxuICAgIFwiVVwiOiBwYXJzZVdlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJWXCI6IHBhcnNlV2Vla051bWJlcklTTyxcbiAgICBcIndcIjogcGFyc2VXZWVrZGF5TnVtYmVyU3VuZGF5LFxuICAgIFwiV1wiOiBwYXJzZVdlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IHBhcnNlTG9jYWxlRGF0ZSxcbiAgICBcIlhcIjogcGFyc2VMb2NhbGVUaW1lLFxuICAgIFwieVwiOiBwYXJzZVllYXIsXG4gICAgXCJZXCI6IHBhcnNlRnVsbFllYXIsXG4gICAgXCJaXCI6IHBhcnNlWm9uZSxcbiAgICBcIiVcIjogcGFyc2VMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIC8vIFRoZXNlIHJlY3Vyc2l2ZSBkaXJlY3RpdmUgZGVmaW5pdGlvbnMgbXVzdCBiZSBkZWZlcnJlZC5cbiAgZm9ybWF0cy54ID0gbmV3Rm9ybWF0KGxvY2FsZV9kYXRlLCBmb3JtYXRzKTtcbiAgZm9ybWF0cy5YID0gbmV3Rm9ybWF0KGxvY2FsZV90aW1lLCBmb3JtYXRzKTtcbiAgZm9ybWF0cy5jID0gbmV3Rm9ybWF0KGxvY2FsZV9kYXRlVGltZSwgZm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMueCA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZSwgdXRjRm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMuWCA9IG5ld0Zvcm1hdChsb2NhbGVfdGltZSwgdXRjRm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMuYyA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZVRpbWUsIHV0Y0Zvcm1hdHMpO1xuXG4gIGZ1bmN0aW9uIG5ld0Zvcm1hdChzcGVjaWZpZXIsIGZvcm1hdHMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgdmFyIHN0cmluZyA9IFtdLFxuICAgICAgICAgIGkgPSAtMSxcbiAgICAgICAgICBqID0gMCxcbiAgICAgICAgICBuID0gc3BlY2lmaWVyLmxlbmd0aCxcbiAgICAgICAgICBjLFxuICAgICAgICAgIHBhZCxcbiAgICAgICAgICBmb3JtYXQ7XG5cbiAgICAgIGlmICghKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgZGF0ZSA9IG5ldyBEYXRlKCtkYXRlKTtcblxuICAgICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgaWYgKHNwZWNpZmllci5jaGFyQ29kZUF0KGkpID09PSAzNykge1xuICAgICAgICAgIHN0cmluZy5wdXNoKHNwZWNpZmllci5zbGljZShqLCBpKSk7XG4gICAgICAgICAgaWYgKChwYWQgPSBwYWRzW2MgPSBzcGVjaWZpZXIuY2hhckF0KCsraSldKSAhPSBudWxsKSBjID0gc3BlY2lmaWVyLmNoYXJBdCgrK2kpO1xuICAgICAgICAgIGVsc2UgcGFkID0gYyA9PT0gXCJlXCIgPyBcIiBcIiA6IFwiMFwiO1xuICAgICAgICAgIGlmIChmb3JtYXQgPSBmb3JtYXRzW2NdKSBjID0gZm9ybWF0KGRhdGUsIHBhZCk7XG4gICAgICAgICAgc3RyaW5nLnB1c2goYyk7XG4gICAgICAgICAgaiA9IGkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHN0cmluZy5wdXNoKHNwZWNpZmllci5zbGljZShqLCBpKSk7XG4gICAgICByZXR1cm4gc3RyaW5nLmpvaW4oXCJcIik7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5ld1BhcnNlKHNwZWNpZmllciwgbmV3RGF0ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIHZhciBkID0gbmV3WWVhcigxOTAwKSxcbiAgICAgICAgICBpID0gcGFyc2VTcGVjaWZpZXIoZCwgc3BlY2lmaWVyLCBzdHJpbmcgKz0gXCJcIiwgMCksXG4gICAgICAgICAgd2VlaywgZGF5O1xuICAgICAgaWYgKGkgIT0gc3RyaW5nLmxlbmd0aCkgcmV0dXJuIG51bGw7XG5cbiAgICAgIC8vIElmIGEgVU5JWCB0aW1lc3RhbXAgaXMgc3BlY2lmaWVkLCByZXR1cm4gaXQuXG4gICAgICBpZiAoXCJRXCIgaW4gZCkgcmV0dXJuIG5ldyBEYXRlKGQuUSk7XG5cbiAgICAgIC8vIFRoZSBhbS1wbSBmbGFnIGlzIDAgZm9yIEFNLCBhbmQgMSBmb3IgUE0uXG4gICAgICBpZiAoXCJwXCIgaW4gZCkgZC5IID0gZC5IICUgMTIgKyBkLnAgKiAxMjtcblxuICAgICAgLy8gQ29udmVydCBkYXktb2Ytd2VlayBhbmQgd2Vlay1vZi15ZWFyIHRvIGRheS1vZi15ZWFyLlxuICAgICAgaWYgKFwiVlwiIGluIGQpIHtcbiAgICAgICAgaWYgKGQuViA8IDEgfHwgZC5WID4gNTMpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIShcIndcIiBpbiBkKSkgZC53ID0gMTtcbiAgICAgICAgaWYgKFwiWlwiIGluIGQpIHtcbiAgICAgICAgICB3ZWVrID0gdXRjRGF0ZShuZXdZZWFyKGQueSkpLCBkYXkgPSB3ZWVrLmdldFVUQ0RheSgpO1xuICAgICAgICAgIHdlZWsgPSBkYXkgPiA0IHx8IGRheSA9PT0gMCA/IHV0Y01vbmRheS5jZWlsKHdlZWspIDogdXRjTW9uZGF5KHdlZWspO1xuICAgICAgICAgIHdlZWsgPSB1dGNEYXkub2Zmc2V0KHdlZWssIChkLlYgLSAxKSAqIDcpO1xuICAgICAgICAgIGQueSA9IHdlZWsuZ2V0VVRDRnVsbFllYXIoKTtcbiAgICAgICAgICBkLm0gPSB3ZWVrLmdldFVUQ01vbnRoKCk7XG4gICAgICAgICAgZC5kID0gd2Vlay5nZXRVVENEYXRlKCkgKyAoZC53ICsgNikgJSA3O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdlZWsgPSBuZXdEYXRlKG5ld1llYXIoZC55KSksIGRheSA9IHdlZWsuZ2V0RGF5KCk7XG4gICAgICAgICAgd2VlayA9IGRheSA+IDQgfHwgZGF5ID09PSAwID8gdGltZU1vbmRheS5jZWlsKHdlZWspIDogdGltZU1vbmRheSh3ZWVrKTtcbiAgICAgICAgICB3ZWVrID0gdGltZURheS5vZmZzZXQod2VlaywgKGQuViAtIDEpICogNyk7XG4gICAgICAgICAgZC55ID0gd2Vlay5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgIGQubSA9IHdlZWsuZ2V0TW9udGgoKTtcbiAgICAgICAgICBkLmQgPSB3ZWVrLmdldERhdGUoKSArIChkLncgKyA2KSAlIDc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoXCJXXCIgaW4gZCB8fCBcIlVcIiBpbiBkKSB7XG4gICAgICAgIGlmICghKFwid1wiIGluIGQpKSBkLncgPSBcInVcIiBpbiBkID8gZC51ICUgNyA6IFwiV1wiIGluIGQgPyAxIDogMDtcbiAgICAgICAgZGF5ID0gXCJaXCIgaW4gZCA/IHV0Y0RhdGUobmV3WWVhcihkLnkpKS5nZXRVVENEYXkoKSA6IG5ld0RhdGUobmV3WWVhcihkLnkpKS5nZXREYXkoKTtcbiAgICAgICAgZC5tID0gMDtcbiAgICAgICAgZC5kID0gXCJXXCIgaW4gZCA/IChkLncgKyA2KSAlIDcgKyBkLlcgKiA3IC0gKGRheSArIDUpICUgNyA6IGQudyArIGQuVSAqIDcgLSAoZGF5ICsgNikgJSA3O1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBhIHRpbWUgem9uZSBpcyBzcGVjaWZpZWQsIGFsbCBmaWVsZHMgYXJlIGludGVycHJldGVkIGFzIFVUQyBhbmQgdGhlblxuICAgICAgLy8gb2Zmc2V0IGFjY29yZGluZyB0byB0aGUgc3BlY2lmaWVkIHRpbWUgem9uZS5cbiAgICAgIGlmIChcIlpcIiBpbiBkKSB7XG4gICAgICAgIGQuSCArPSBkLlogLyAxMDAgfCAwO1xuICAgICAgICBkLk0gKz0gZC5aICUgMTAwO1xuICAgICAgICByZXR1cm4gdXRjRGF0ZShkKTtcbiAgICAgIH1cblxuICAgICAgLy8gT3RoZXJ3aXNlLCBhbGwgZmllbGRzIGFyZSBpbiBsb2NhbCB0aW1lLlxuICAgICAgcmV0dXJuIG5ld0RhdGUoZCk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlU3BlY2lmaWVyKGQsIHNwZWNpZmllciwgc3RyaW5nLCBqKSB7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBuID0gc3BlY2lmaWVyLmxlbmd0aCxcbiAgICAgICAgbSA9IHN0cmluZy5sZW5ndGgsXG4gICAgICAgIGMsXG4gICAgICAgIHBhcnNlO1xuXG4gICAgd2hpbGUgKGkgPCBuKSB7XG4gICAgICBpZiAoaiA+PSBtKSByZXR1cm4gLTE7XG4gICAgICBjID0gc3BlY2lmaWVyLmNoYXJDb2RlQXQoaSsrKTtcbiAgICAgIGlmIChjID09PSAzNykge1xuICAgICAgICBjID0gc3BlY2lmaWVyLmNoYXJBdChpKyspO1xuICAgICAgICBwYXJzZSA9IHBhcnNlc1tjIGluIHBhZHMgPyBzcGVjaWZpZXIuY2hhckF0KGkrKykgOiBjXTtcbiAgICAgICAgaWYgKCFwYXJzZSB8fCAoKGogPSBwYXJzZShkLCBzdHJpbmcsIGopKSA8IDApKSByZXR1cm4gLTE7XG4gICAgICB9IGVsc2UgaWYgKGMgIT0gc3RyaW5nLmNoYXJDb2RlQXQoaisrKSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGo7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVBlcmlvZChkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IHBlcmlvZFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLnAgPSBwZXJpb2RMb29rdXBbblswXS50b0xvd2VyQ2FzZSgpXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VTaG9ydFdlZWtkYXkoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBzaG9ydFdlZWtkYXlSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC53ID0gc2hvcnRXZWVrZGF5TG9va3VwW25bMF0udG9Mb3dlckNhc2UoKV0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlV2Vla2RheShkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IHdlZWtkYXlSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC53ID0gd2Vla2RheUxvb2t1cFtuWzBdLnRvTG93ZXJDYXNlKCldLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVNob3J0TW9udGgoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBzaG9ydE1vbnRoUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQubSA9IHNob3J0TW9udGhMb29rdXBbblswXS50b0xvd2VyQ2FzZSgpXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VNb250aChkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IG1vbnRoUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQubSA9IG1vbnRoTG9va3VwW25bMF0udG9Mb3dlckNhc2UoKV0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYWxlRGF0ZVRpbWUoZCwgc3RyaW5nLCBpKSB7XG4gICAgcmV0dXJuIHBhcnNlU3BlY2lmaWVyKGQsIGxvY2FsZV9kYXRlVGltZSwgc3RyaW5nLCBpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYWxlRGF0ZShkLCBzdHJpbmcsIGkpIHtcbiAgICByZXR1cm4gcGFyc2VTcGVjaWZpZXIoZCwgbG9jYWxlX2RhdGUsIHN0cmluZywgaSk7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUxvY2FsZVRpbWUoZCwgc3RyaW5nLCBpKSB7XG4gICAgcmV0dXJuIHBhcnNlU3BlY2lmaWVyKGQsIGxvY2FsZV90aW1lLCBzdHJpbmcsIGkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0U2hvcnRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3Nob3J0V2Vla2RheXNbZC5nZXREYXkoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3dlZWtkYXlzW2QuZ2V0RGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0U2hvcnRNb250aChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydE1vbnRoc1tkLmdldE1vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0TW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfbW9udGhzW2QuZ2V0TW9udGgoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRQZXJpb2QoZCkge1xuICAgIHJldHVybiBsb2NhbGVfcGVyaW9kc1srKGQuZ2V0SG91cnMoKSA+PSAxMildO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDU2hvcnRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3Nob3J0V2Vla2RheXNbZC5nZXRVVENEYXkoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRVVENXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3dlZWtkYXlzW2QuZ2V0VVRDRGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDU2hvcnRNb250aChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydE1vbnRoc1tkLmdldFVUQ01vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDTW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfbW9udGhzW2QuZ2V0VVRDTW9udGgoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRVVENQZXJpb2QoZCkge1xuICAgIHJldHVybiBsb2NhbGVfcGVyaW9kc1srKGQuZ2V0VVRDSG91cnMoKSA+PSAxMildO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBmb3JtYXQ6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIGYgPSBuZXdGb3JtYXQoc3BlY2lmaWVyICs9IFwiXCIsIGZvcm1hdHMpO1xuICAgICAgZi50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIGY7XG4gICAgfSxcbiAgICBwYXJzZTogZnVuY3Rpb24oc3BlY2lmaWVyKSB7XG4gICAgICB2YXIgcCA9IG5ld1BhcnNlKHNwZWNpZmllciArPSBcIlwiLCBsb2NhbERhdGUpO1xuICAgICAgcC50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIHA7XG4gICAgfSxcbiAgICB1dGNGb3JtYXQ6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIGYgPSBuZXdGb3JtYXQoc3BlY2lmaWVyICs9IFwiXCIsIHV0Y0Zvcm1hdHMpO1xuICAgICAgZi50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIGY7XG4gICAgfSxcbiAgICB1dGNQYXJzZTogZnVuY3Rpb24oc3BlY2lmaWVyKSB7XG4gICAgICB2YXIgcCA9IG5ld1BhcnNlKHNwZWNpZmllciwgdXRjRGF0ZSk7XG4gICAgICBwLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiBzcGVjaWZpZXI7IH07XG4gICAgICByZXR1cm4gcDtcbiAgICB9XG4gIH07XG59XG5cbnZhciBwYWRzID0ge1wiLVwiOiBcIlwiLCBcIl9cIjogXCIgXCIsIFwiMFwiOiBcIjBcIn0sXG4gICAgbnVtYmVyUmUgPSAvXlxccypcXGQrLywgLy8gbm90ZTogaWdub3JlcyBuZXh0IGRpcmVjdGl2ZVxuICAgIHBlcmNlbnRSZSA9IC9eJS8sXG4gICAgcmVxdW90ZVJlID0gL1tcXFxcXiQqKz98W1xcXSgpLnt9XS9nO1xuXG5mdW5jdGlvbiBwYWQodmFsdWUsIGZpbGwsIHdpZHRoKSB7XG4gIHZhciBzaWduID0gdmFsdWUgPCAwID8gXCItXCIgOiBcIlwiLFxuICAgICAgc3RyaW5nID0gKHNpZ24gPyAtdmFsdWUgOiB2YWx1ZSkgKyBcIlwiLFxuICAgICAgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcbiAgcmV0dXJuIHNpZ24gKyAobGVuZ3RoIDwgd2lkdGggPyBuZXcgQXJyYXkod2lkdGggLSBsZW5ndGggKyAxKS5qb2luKGZpbGwpICsgc3RyaW5nIDogc3RyaW5nKTtcbn1cblxuZnVuY3Rpb24gcmVxdW90ZShzKSB7XG4gIHJldHVybiBzLnJlcGxhY2UocmVxdW90ZVJlLCBcIlxcXFwkJlwiKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0UmUobmFtZXMpIHtcbiAgcmV0dXJuIG5ldyBSZWdFeHAoXCJeKD86XCIgKyBuYW1lcy5tYXAocmVxdW90ZSkuam9pbihcInxcIikgKyBcIilcIiwgXCJpXCIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRMb29rdXAobmFtZXMpIHtcbiAgdmFyIG1hcCA9IHt9LCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gIHdoaWxlICgrK2kgPCBuKSBtYXBbbmFtZXNbaV0udG9Mb3dlckNhc2UoKV0gPSBpO1xuICByZXR1cm4gbWFwO1xufVxuXG5mdW5jdGlvbiBwYXJzZVdlZWtkYXlOdW1iZXJTdW5kYXkoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDEpKTtcbiAgcmV0dXJuIG4gPyAoZC53ID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrZGF5TnVtYmVyTW9uZGF5KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAxKSk7XG4gIHJldHVybiBuID8gKGQudSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlV2Vla051bWJlclN1bmRheShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLlUgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVdlZWtOdW1iZXJJU08oZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5WID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrTnVtYmVyTW9uZGF5KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuVyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRnVsbFllYXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDQpKTtcbiAgcmV0dXJuIG4gPyAoZC55ID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VZZWFyKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQueSA9ICtuWzBdICsgKCtuWzBdID4gNjggPyAxOTAwIDogMjAwMCksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2Vab25lKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IC9eKFopfChbKy1dXFxkXFxkKSg/Ojo/KFxcZFxcZCkpPy8uZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDYpKTtcbiAgcmV0dXJuIG4gPyAoZC5aID0gblsxXSA/IDAgOiAtKG5bMl0gKyAoblszXSB8fCBcIjAwXCIpKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1vbnRoTnVtYmVyKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQubSA9IG5bMF0gLSAxLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRGF5T2ZNb250aChkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLmQgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZURheU9mWWVhcihkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMykpO1xuICByZXR1cm4gbiA/IChkLm0gPSAwLCBkLmQgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZUhvdXIyNChkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLkggPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1pbnV0ZXMoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5NID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VTZWNvbmRzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuUyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTWlsbGlzZWNvbmRzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAzKSk7XG4gIHJldHVybiBuID8gKGQuTCA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTWljcm9zZWNvbmRzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyA2KSk7XG4gIHJldHVybiBuID8gKGQuTCA9IE1hdGguZmxvb3IoblswXSAvIDEwMDApLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTGl0ZXJhbFBlcmNlbnQoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gcGVyY2VudFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAxKSk7XG4gIHJldHVybiBuID8gaSArIG5bMF0ubGVuZ3RoIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlVW5peFRpbWVzdGFtcChkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gIHJldHVybiBuID8gKGQuUSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlVW5peFRpbWVzdGFtcFNlY29uZHMoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICByZXR1cm4gbiA/IChkLlEgPSAoK25bMF0pICogMTAwMCwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBmb3JtYXREYXlPZk1vbnRoKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldERhdGUoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdEhvdXIyNChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRIb3VycygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0SG91cjEyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldEhvdXJzKCkgJSAxMiB8fCAxMiwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdERheU9mWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoMSArIHRpbWVEYXkuY291bnQodGltZVllYXIoZCksIGQpLCBwLCAzKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TWlsbGlzZWNvbmRzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldE1pbGxpc2Vjb25kcygpLCBwLCAzKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TWljcm9zZWNvbmRzKGQsIHApIHtcbiAgcmV0dXJuIGZvcm1hdE1pbGxpc2Vjb25kcyhkLCBwKSArIFwiMDAwXCI7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1vbnRoTnVtYmVyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldE1vbnRoKCkgKyAxLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TWludXRlcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRNaW51dGVzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRTZWNvbmRzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFNlY29uZHMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtkYXlOdW1iZXJNb25kYXkoZCkge1xuICB2YXIgZGF5ID0gZC5nZXREYXkoKTtcbiAgcmV0dXJuIGRheSA9PT0gMCA/IDcgOiBkYXk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtOdW1iZXJTdW5kYXkoZCwgcCkge1xuICByZXR1cm4gcGFkKHRpbWVTdW5kYXkuY291bnQodGltZVllYXIoZCksIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2Vla051bWJlcklTTyhkLCBwKSB7XG4gIHZhciBkYXkgPSBkLmdldERheSgpO1xuICBkID0gKGRheSA+PSA0IHx8IGRheSA9PT0gMCkgPyB0aW1lVGh1cnNkYXkoZCkgOiB0aW1lVGh1cnNkYXkuY2VpbChkKTtcbiAgcmV0dXJuIHBhZCh0aW1lVGh1cnNkYXkuY291bnQodGltZVllYXIoZCksIGQpICsgKHRpbWVZZWFyKGQpLmdldERheSgpID09PSA0KSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtkYXlOdW1iZXJTdW5kYXkoZCkge1xuICByZXR1cm4gZC5nZXREYXkoKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2Vla051bWJlck1vbmRheShkLCBwKSB7XG4gIHJldHVybiBwYWQodGltZU1vbmRheS5jb3VudCh0aW1lWWVhcihkKSwgZCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldEZ1bGxZZWFyKCkgJSAxMDAsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRGdWxsWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRGdWxsWWVhcigpICUgMTAwMDAsIHAsIDQpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRab25lKGQpIHtcbiAgdmFyIHogPSBkLmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gIHJldHVybiAoeiA+IDAgPyBcIi1cIiA6ICh6ICo9IC0xLCBcIitcIikpXG4gICAgICArIHBhZCh6IC8gNjAgfCAwLCBcIjBcIiwgMilcbiAgICAgICsgcGFkKHogJSA2MCwgXCIwXCIsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENEYXlPZk1vbnRoKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0RhdGUoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0hvdXIyNChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENIb3VycygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDSG91cjEyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0hvdXJzKCkgJSAxMiB8fCAxMiwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0RheU9mWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoMSArIHV0Y0RheS5jb3VudCh1dGNZZWFyKGQpLCBkKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01pbGxpc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENNaWxsaXNlY29uZHMoKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01pY3Jvc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBmb3JtYXRVVENNaWxsaXNlY29uZHMoZCwgcCkgKyBcIjAwMFwiO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENNb250aE51bWJlcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENNb250aCgpICsgMSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01pbnV0ZXMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDTWludXRlcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDU2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENTZWNvbmRzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrZGF5TnVtYmVyTW9uZGF5KGQpIHtcbiAgdmFyIGRvdyA9IGQuZ2V0VVRDRGF5KCk7XG4gIHJldHVybiBkb3cgPT09IDAgPyA3IDogZG93O1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrTnVtYmVyU3VuZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZCh1dGNTdW5kYXkuY291bnQodXRjWWVhcihkKSwgZCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrTnVtYmVySVNPKGQsIHApIHtcbiAgdmFyIGRheSA9IGQuZ2V0VVRDRGF5KCk7XG4gIGQgPSAoZGF5ID49IDQgfHwgZGF5ID09PSAwKSA/IHV0Y1RodXJzZGF5KGQpIDogdXRjVGh1cnNkYXkuY2VpbChkKTtcbiAgcmV0dXJuIHBhZCh1dGNUaHVyc2RheS5jb3VudCh1dGNZZWFyKGQpLCBkKSArICh1dGNZZWFyKGQpLmdldFVUQ0RheSgpID09PSA0KSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXJTdW5kYXkoZCkge1xuICByZXR1cm4gZC5nZXRVVENEYXkoKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla051bWJlck1vbmRheShkLCBwKSB7XG4gIHJldHVybiBwYWQodXRjTW9uZGF5LmNvdW50KHV0Y1llYXIoZCksIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENGdWxsWWVhcigpICUgMTAwLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDRnVsbFllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDRnVsbFllYXIoKSAlIDEwMDAwLCBwLCA0KTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDWm9uZSgpIHtcbiAgcmV0dXJuIFwiKzAwMDBcIjtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TGl0ZXJhbFBlcmNlbnQoKSB7XG4gIHJldHVybiBcIiVcIjtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VW5peFRpbWVzdGFtcChkKSB7XG4gIHJldHVybiArZDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VW5peFRpbWVzdGFtcFNlY29uZHMoZCkge1xuICByZXR1cm4gTWF0aC5mbG9vcigrZCAvIDEwMDApO1xufVxuIiwiaW1wb3J0IGZvcm1hdExvY2FsZSBmcm9tIFwiLi9sb2NhbGVcIjtcblxudmFyIGxvY2FsZTtcbmV4cG9ydCB2YXIgdGltZUZvcm1hdDtcbmV4cG9ydCB2YXIgdGltZVBhcnNlO1xuZXhwb3J0IHZhciB1dGNGb3JtYXQ7XG5leHBvcnQgdmFyIHV0Y1BhcnNlO1xuXG5kZWZhdWx0TG9jYWxlKHtcbiAgZGF0ZVRpbWU6IFwiJXgsICVYXCIsXG4gIGRhdGU6IFwiJS1tLyUtZC8lWVwiLFxuICB0aW1lOiBcIiUtSTolTTolUyAlcFwiLFxuICBwZXJpb2RzOiBbXCJBTVwiLCBcIlBNXCJdLFxuICBkYXlzOiBbXCJTdW5kYXlcIiwgXCJNb25kYXlcIiwgXCJUdWVzZGF5XCIsIFwiV2VkbmVzZGF5XCIsIFwiVGh1cnNkYXlcIiwgXCJGcmlkYXlcIiwgXCJTYXR1cmRheVwiXSxcbiAgc2hvcnREYXlzOiBbXCJTdW5cIiwgXCJNb25cIiwgXCJUdWVcIiwgXCJXZWRcIiwgXCJUaHVcIiwgXCJGcmlcIiwgXCJTYXRcIl0sXG4gIG1vbnRoczogW1wiSmFudWFyeVwiLCBcIkZlYnJ1YXJ5XCIsIFwiTWFyY2hcIiwgXCJBcHJpbFwiLCBcIk1heVwiLCBcIkp1bmVcIiwgXCJKdWx5XCIsIFwiQXVndXN0XCIsIFwiU2VwdGVtYmVyXCIsIFwiT2N0b2JlclwiLCBcIk5vdmVtYmVyXCIsIFwiRGVjZW1iZXJcIl0sXG4gIHNob3J0TW9udGhzOiBbXCJKYW5cIiwgXCJGZWJcIiwgXCJNYXJcIiwgXCJBcHJcIiwgXCJNYXlcIiwgXCJKdW5cIiwgXCJKdWxcIiwgXCJBdWdcIiwgXCJTZXBcIiwgXCJPY3RcIiwgXCJOb3ZcIiwgXCJEZWNcIl1cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkZWZhdWx0TG9jYWxlKGRlZmluaXRpb24pIHtcbiAgbG9jYWxlID0gZm9ybWF0TG9jYWxlKGRlZmluaXRpb24pO1xuICB0aW1lRm9ybWF0ID0gbG9jYWxlLmZvcm1hdDtcbiAgdGltZVBhcnNlID0gbG9jYWxlLnBhcnNlO1xuICB1dGNGb3JtYXQgPSBsb2NhbGUudXRjRm9ybWF0O1xuICB1dGNQYXJzZSA9IGxvY2FsZS51dGNQYXJzZTtcbiAgcmV0dXJuIGxvY2FsZTtcbn1cbiIsImltcG9ydCB7dXRjRm9ybWF0fSBmcm9tIFwiLi9kZWZhdWx0TG9jYWxlXCI7XG5cbmV4cG9ydCB2YXIgaXNvU3BlY2lmaWVyID0gXCIlWS0lbS0lZFQlSDolTTolUy4lTFpcIjtcblxuZnVuY3Rpb24gZm9ybWF0SXNvTmF0aXZlKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUudG9JU09TdHJpbmcoKTtcbn1cblxudmFyIGZvcm1hdElzbyA9IERhdGUucHJvdG90eXBlLnRvSVNPU3RyaW5nXG4gICAgPyBmb3JtYXRJc29OYXRpdmVcbiAgICA6IHV0Y0Zvcm1hdChpc29TcGVjaWZpZXIpO1xuXG5leHBvcnQgZGVmYXVsdCBmb3JtYXRJc287XG4iLCJpbXBvcnQge2lzb1NwZWNpZmllcn0gZnJvbSBcIi4vaXNvRm9ybWF0XCI7XG5pbXBvcnQge3V0Y1BhcnNlfSBmcm9tIFwiLi9kZWZhdWx0TG9jYWxlXCI7XG5cbmZ1bmN0aW9uIHBhcnNlSXNvTmF0aXZlKHN0cmluZykge1xuICB2YXIgZGF0ZSA9IG5ldyBEYXRlKHN0cmluZyk7XG4gIHJldHVybiBpc05hTihkYXRlKSA/IG51bGwgOiBkYXRlO1xufVxuXG52YXIgcGFyc2VJc28gPSArbmV3IERhdGUoXCIyMDAwLTAxLTAxVDAwOjAwOjAwLjAwMFpcIilcbiAgICA/IHBhcnNlSXNvTmF0aXZlXG4gICAgOiB1dGNQYXJzZShpc29TcGVjaWZpZXIpO1xuXG5leHBvcnQgZGVmYXVsdCBwYXJzZUlzbztcbiIsInZhciBwaSA9IE1hdGguUEksXG4gICAgdGF1ID0gMiAqIHBpLFxuICAgIGVwc2lsb24gPSAxZS02LFxuICAgIHRhdUVwc2lsb24gPSB0YXUgLSBlcHNpbG9uO1xuXG5mdW5jdGlvbiBQYXRoKCkge1xuICB0aGlzLl94MCA9IHRoaXMuX3kwID0gLy8gc3RhcnQgb2YgY3VycmVudCBzdWJwYXRoXG4gIHRoaXMuX3gxID0gdGhpcy5feTEgPSBudWxsOyAvLyBlbmQgb2YgY3VycmVudCBzdWJwYXRoXG4gIHRoaXMuXyA9IFwiXCI7XG59XG5cbmZ1bmN0aW9uIHBhdGgoKSB7XG4gIHJldHVybiBuZXcgUGF0aDtcbn1cblxuUGF0aC5wcm90b3R5cGUgPSBwYXRoLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IFBhdGgsXG4gIG1vdmVUbzogZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuXyArPSBcIk1cIiArICh0aGlzLl94MCA9IHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTAgPSB0aGlzLl95MSA9ICt5KTtcbiAgfSxcbiAgY2xvc2VQYXRoOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5feDEgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuX3gxID0gdGhpcy5feDAsIHRoaXMuX3kxID0gdGhpcy5feTA7XG4gICAgICB0aGlzLl8gKz0gXCJaXCI7XG4gICAgfVxuICB9LFxuICBsaW5lVG86IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLl8gKz0gXCJMXCIgKyAodGhpcy5feDEgPSAreCkgKyBcIixcIiArICh0aGlzLl95MSA9ICt5KTtcbiAgfSxcbiAgcXVhZHJhdGljQ3VydmVUbzogZnVuY3Rpb24oeDEsIHkxLCB4LCB5KSB7XG4gICAgdGhpcy5fICs9IFwiUVwiICsgKCt4MSkgKyBcIixcIiArICgreTEpICsgXCIsXCIgKyAodGhpcy5feDEgPSAreCkgKyBcIixcIiArICh0aGlzLl95MSA9ICt5KTtcbiAgfSxcbiAgYmV6aWVyQ3VydmVUbzogZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIsIHgsIHkpIHtcbiAgICB0aGlzLl8gKz0gXCJDXCIgKyAoK3gxKSArIFwiLFwiICsgKCt5MSkgKyBcIixcIiArICgreDIpICsgXCIsXCIgKyAoK3kyKSArIFwiLFwiICsgKHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTEgPSAreSk7XG4gIH0sXG4gIGFyY1RvOiBmdW5jdGlvbih4MSwgeTEsIHgyLCB5Miwgcikge1xuICAgIHgxID0gK3gxLCB5MSA9ICt5MSwgeDIgPSAreDIsIHkyID0gK3kyLCByID0gK3I7XG4gICAgdmFyIHgwID0gdGhpcy5feDEsXG4gICAgICAgIHkwID0gdGhpcy5feTEsXG4gICAgICAgIHgyMSA9IHgyIC0geDEsXG4gICAgICAgIHkyMSA9IHkyIC0geTEsXG4gICAgICAgIHgwMSA9IHgwIC0geDEsXG4gICAgICAgIHkwMSA9IHkwIC0geTEsXG4gICAgICAgIGwwMV8yID0geDAxICogeDAxICsgeTAxICogeTAxO1xuXG4gICAgLy8gSXMgdGhlIHJhZGl1cyBuZWdhdGl2ZT8gRXJyb3IuXG4gICAgaWYgKHIgPCAwKSB0aHJvdyBuZXcgRXJyb3IoXCJuZWdhdGl2ZSByYWRpdXM6IFwiICsgcik7XG5cbiAgICAvLyBJcyB0aGlzIHBhdGggZW1wdHk/IE1vdmUgdG8gKHgxLHkxKS5cbiAgICBpZiAodGhpcy5feDEgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuXyArPSBcIk1cIiArICh0aGlzLl94MSA9IHgxKSArIFwiLFwiICsgKHRoaXMuX3kxID0geTEpO1xuICAgIH1cblxuICAgIC8vIE9yLCBpcyAoeDEseTEpIGNvaW5jaWRlbnQgd2l0aCAoeDAseTApPyBEbyBub3RoaW5nLlxuICAgIGVsc2UgaWYgKCEobDAxXzIgPiBlcHNpbG9uKSkge31cblxuICAgIC8vIE9yLCBhcmUgKHgwLHkwKSwgKHgxLHkxKSBhbmQgKHgyLHkyKSBjb2xsaW5lYXI/XG4gICAgLy8gRXF1aXZhbGVudGx5LCBpcyAoeDEseTEpIGNvaW5jaWRlbnQgd2l0aCAoeDIseTIpP1xuICAgIC8vIE9yLCBpcyB0aGUgcmFkaXVzIHplcm8/IExpbmUgdG8gKHgxLHkxKS5cbiAgICBlbHNlIGlmICghKE1hdGguYWJzKHkwMSAqIHgyMSAtIHkyMSAqIHgwMSkgPiBlcHNpbG9uKSB8fCAhcikge1xuICAgICAgdGhpcy5fICs9IFwiTFwiICsgKHRoaXMuX3gxID0geDEpICsgXCIsXCIgKyAodGhpcy5feTEgPSB5MSk7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCBkcmF3IGFuIGFyYyFcbiAgICBlbHNlIHtcbiAgICAgIHZhciB4MjAgPSB4MiAtIHgwLFxuICAgICAgICAgIHkyMCA9IHkyIC0geTAsXG4gICAgICAgICAgbDIxXzIgPSB4MjEgKiB4MjEgKyB5MjEgKiB5MjEsXG4gICAgICAgICAgbDIwXzIgPSB4MjAgKiB4MjAgKyB5MjAgKiB5MjAsXG4gICAgICAgICAgbDIxID0gTWF0aC5zcXJ0KGwyMV8yKSxcbiAgICAgICAgICBsMDEgPSBNYXRoLnNxcnQobDAxXzIpLFxuICAgICAgICAgIGwgPSByICogTWF0aC50YW4oKHBpIC0gTWF0aC5hY29zKChsMjFfMiArIGwwMV8yIC0gbDIwXzIpIC8gKDIgKiBsMjEgKiBsMDEpKSkgLyAyKSxcbiAgICAgICAgICB0MDEgPSBsIC8gbDAxLFxuICAgICAgICAgIHQyMSA9IGwgLyBsMjE7XG5cbiAgICAgIC8vIElmIHRoZSBzdGFydCB0YW5nZW50IGlzIG5vdCBjb2luY2lkZW50IHdpdGggKHgwLHkwKSwgbGluZSB0by5cbiAgICAgIGlmIChNYXRoLmFicyh0MDEgLSAxKSA+IGVwc2lsb24pIHtcbiAgICAgICAgdGhpcy5fICs9IFwiTFwiICsgKHgxICsgdDAxICogeDAxKSArIFwiLFwiICsgKHkxICsgdDAxICogeTAxKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fICs9IFwiQVwiICsgciArIFwiLFwiICsgciArIFwiLDAsMCxcIiArICgrKHkwMSAqIHgyMCA+IHgwMSAqIHkyMCkpICsgXCIsXCIgKyAodGhpcy5feDEgPSB4MSArIHQyMSAqIHgyMSkgKyBcIixcIiArICh0aGlzLl95MSA9IHkxICsgdDIxICogeTIxKTtcbiAgICB9XG4gIH0sXG4gIGFyYzogZnVuY3Rpb24oeCwgeSwgciwgYTAsIGExLCBjY3cpIHtcbiAgICB4ID0gK3gsIHkgPSAreSwgciA9ICtyO1xuICAgIHZhciBkeCA9IHIgKiBNYXRoLmNvcyhhMCksXG4gICAgICAgIGR5ID0gciAqIE1hdGguc2luKGEwKSxcbiAgICAgICAgeDAgPSB4ICsgZHgsXG4gICAgICAgIHkwID0geSArIGR5LFxuICAgICAgICBjdyA9IDEgXiBjY3csXG4gICAgICAgIGRhID0gY2N3ID8gYTAgLSBhMSA6IGExIC0gYTA7XG5cbiAgICAvLyBJcyB0aGUgcmFkaXVzIG5lZ2F0aXZlPyBFcnJvci5cbiAgICBpZiAociA8IDApIHRocm93IG5ldyBFcnJvcihcIm5lZ2F0aXZlIHJhZGl1czogXCIgKyByKTtcblxuICAgIC8vIElzIHRoaXMgcGF0aCBlbXB0eT8gTW92ZSB0byAoeDAseTApLlxuICAgIGlmICh0aGlzLl94MSA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5fICs9IFwiTVwiICsgeDAgKyBcIixcIiArIHkwO1xuICAgIH1cblxuICAgIC8vIE9yLCBpcyAoeDAseTApIG5vdCBjb2luY2lkZW50IHdpdGggdGhlIHByZXZpb3VzIHBvaW50PyBMaW5lIHRvICh4MCx5MCkuXG4gICAgZWxzZSBpZiAoTWF0aC5hYnModGhpcy5feDEgLSB4MCkgPiBlcHNpbG9uIHx8IE1hdGguYWJzKHRoaXMuX3kxIC0geTApID4gZXBzaWxvbikge1xuICAgICAgdGhpcy5fICs9IFwiTFwiICsgeDAgKyBcIixcIiArIHkwO1xuICAgIH1cblxuICAgIC8vIElzIHRoaXMgYXJjIGVtcHR5PyBXZeKAmXJlIGRvbmUuXG4gICAgaWYgKCFyKSByZXR1cm47XG5cbiAgICAvLyBEb2VzIHRoZSBhbmdsZSBnbyB0aGUgd3Jvbmcgd2F5PyBGbGlwIHRoZSBkaXJlY3Rpb24uXG4gICAgaWYgKGRhIDwgMCkgZGEgPSBkYSAlIHRhdSArIHRhdTtcblxuICAgIC8vIElzIHRoaXMgYSBjb21wbGV0ZSBjaXJjbGU/IERyYXcgdHdvIGFyY3MgdG8gY29tcGxldGUgdGhlIGNpcmNsZS5cbiAgICBpZiAoZGEgPiB0YXVFcHNpbG9uKSB7XG4gICAgICB0aGlzLl8gKz0gXCJBXCIgKyByICsgXCIsXCIgKyByICsgXCIsMCwxLFwiICsgY3cgKyBcIixcIiArICh4IC0gZHgpICsgXCIsXCIgKyAoeSAtIGR5KSArIFwiQVwiICsgciArIFwiLFwiICsgciArIFwiLDAsMSxcIiArIGN3ICsgXCIsXCIgKyAodGhpcy5feDEgPSB4MCkgKyBcIixcIiArICh0aGlzLl95MSA9IHkwKTtcbiAgICB9XG5cbiAgICAvLyBJcyB0aGlzIGFyYyBub24tZW1wdHk/IERyYXcgYW4gYXJjIVxuICAgIGVsc2UgaWYgKGRhID4gZXBzaWxvbikge1xuICAgICAgdGhpcy5fICs9IFwiQVwiICsgciArIFwiLFwiICsgciArIFwiLDAsXCIgKyAoKyhkYSA+PSBwaSkpICsgXCIsXCIgKyBjdyArIFwiLFwiICsgKHRoaXMuX3gxID0geCArIHIgKiBNYXRoLmNvcyhhMSkpICsgXCIsXCIgKyAodGhpcy5feTEgPSB5ICsgciAqIE1hdGguc2luKGExKSk7XG4gICAgfVxuICB9LFxuICByZWN0OiBmdW5jdGlvbih4LCB5LCB3LCBoKSB7XG4gICAgdGhpcy5fICs9IFwiTVwiICsgKHRoaXMuX3gwID0gdGhpcy5feDEgPSAreCkgKyBcIixcIiArICh0aGlzLl95MCA9IHRoaXMuX3kxID0gK3kpICsgXCJoXCIgKyAoK3cpICsgXCJ2XCIgKyAoK2gpICsgXCJoXCIgKyAoLXcpICsgXCJaXCI7XG4gIH0sXG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBwYXRoO1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4gZnVuY3Rpb24gY29uc3RhbnQoKSB7XG4gICAgcmV0dXJuIHg7XG4gIH07XG59XG4iLCJmdW5jdGlvbiBMaW5lYXIoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbn1cblxuTGluZWFyLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gMDtcbiAgfSxcbiAgYXJlYUVuZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IE5hTjtcbiAgfSxcbiAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9wb2ludCA9IDA7XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9saW5lIHx8ICh0aGlzLl9saW5lICE9PSAwICYmIHRoaXMuX3BvaW50ID09PSAxKSkgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICB0aGlzLl9saW5lID0gMSAtIHRoaXMuX2xpbmU7XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgeCA9ICt4LCB5ID0gK3k7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAwOiB0aGlzLl9wb2ludCA9IDE7IHRoaXMuX2xpbmUgPyB0aGlzLl9jb250ZXh0LmxpbmVUbyh4LCB5KSA6IHRoaXMuX2NvbnRleHQubW92ZVRvKHgsIHkpOyBicmVhaztcbiAgICAgIGNhc2UgMTogdGhpcy5fcG9pbnQgPSAyOyAvLyBwcm9jZWVkXG4gICAgICBkZWZhdWx0OiB0aGlzLl9jb250ZXh0LmxpbmVUbyh4LCB5KTsgYnJlYWs7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjb250ZXh0KSB7XG4gIHJldHVybiBuZXcgTGluZWFyKGNvbnRleHQpO1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIHgocCkge1xuICByZXR1cm4gcFswXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHkocCkge1xuICByZXR1cm4gcFsxXTtcbn1cbiIsImltcG9ydCB7cGF0aH0gZnJvbSBcImQzLXBhdGhcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi9jb25zdGFudFwiO1xuaW1wb3J0IGN1cnZlTGluZWFyIGZyb20gXCIuL2N1cnZlL2xpbmVhclwiO1xuaW1wb3J0IHt4IGFzIHBvaW50WCwgeSBhcyBwb2ludFl9IGZyb20gXCIuL3BvaW50XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgeCA9IHBvaW50WCxcbiAgICAgIHkgPSBwb2ludFksXG4gICAgICBkZWZpbmVkID0gY29uc3RhbnQodHJ1ZSksXG4gICAgICBjb250ZXh0ID0gbnVsbCxcbiAgICAgIGN1cnZlID0gY3VydmVMaW5lYXIsXG4gICAgICBvdXRwdXQgPSBudWxsO1xuXG4gIGZ1bmN0aW9uIGxpbmUoZGF0YSkge1xuICAgIHZhciBpLFxuICAgICAgICBuID0gZGF0YS5sZW5ndGgsXG4gICAgICAgIGQsXG4gICAgICAgIGRlZmluZWQwID0gZmFsc2UsXG4gICAgICAgIGJ1ZmZlcjtcblxuICAgIGlmIChjb250ZXh0ID09IG51bGwpIG91dHB1dCA9IGN1cnZlKGJ1ZmZlciA9IHBhdGgoKSk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDw9IG47ICsraSkge1xuICAgICAgaWYgKCEoaSA8IG4gJiYgZGVmaW5lZChkID0gZGF0YVtpXSwgaSwgZGF0YSkpID09PSBkZWZpbmVkMCkge1xuICAgICAgICBpZiAoZGVmaW5lZDAgPSAhZGVmaW5lZDApIG91dHB1dC5saW5lU3RhcnQoKTtcbiAgICAgICAgZWxzZSBvdXRwdXQubGluZUVuZCgpO1xuICAgICAgfVxuICAgICAgaWYgKGRlZmluZWQwKSBvdXRwdXQucG9pbnQoK3goZCwgaSwgZGF0YSksICt5KGQsIGksIGRhdGEpKTtcbiAgICB9XG5cbiAgICBpZiAoYnVmZmVyKSByZXR1cm4gb3V0cHV0ID0gbnVsbCwgYnVmZmVyICsgXCJcIiB8fCBudWxsO1xuICB9XG5cbiAgbGluZS54ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHggPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgbGluZSkgOiB4O1xuICB9O1xuXG4gIGxpbmUueSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh5ID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGxpbmUpIDogeTtcbiAgfTtcblxuICBsaW5lLmRlZmluZWQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZGVmaW5lZCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoISFfKSwgbGluZSkgOiBkZWZpbmVkO1xuICB9O1xuXG4gIGxpbmUuY3VydmUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoY3VydmUgPSBfLCBjb250ZXh0ICE9IG51bGwgJiYgKG91dHB1dCA9IGN1cnZlKGNvbnRleHQpKSwgbGluZSkgOiBjdXJ2ZTtcbiAgfTtcblxuICBsaW5lLmNvbnRleHQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoXyA9PSBudWxsID8gY29udGV4dCA9IG91dHB1dCA9IG51bGwgOiBvdXRwdXQgPSBjdXJ2ZShjb250ZXh0ID0gXyksIGxpbmUpIDogY29udGV4dDtcbiAgfTtcblxuICByZXR1cm4gbGluZTtcbn1cbiIsImltcG9ydCB7cGF0aH0gZnJvbSBcImQzLXBhdGhcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi9jb25zdGFudFwiO1xuaW1wb3J0IGN1cnZlTGluZWFyIGZyb20gXCIuL2N1cnZlL2xpbmVhclwiO1xuaW1wb3J0IGxpbmUgZnJvbSBcIi4vbGluZVwiO1xuaW1wb3J0IHt4IGFzIHBvaW50WCwgeSBhcyBwb2ludFl9IGZyb20gXCIuL3BvaW50XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgeDAgPSBwb2ludFgsXG4gICAgICB4MSA9IG51bGwsXG4gICAgICB5MCA9IGNvbnN0YW50KDApLFxuICAgICAgeTEgPSBwb2ludFksXG4gICAgICBkZWZpbmVkID0gY29uc3RhbnQodHJ1ZSksXG4gICAgICBjb250ZXh0ID0gbnVsbCxcbiAgICAgIGN1cnZlID0gY3VydmVMaW5lYXIsXG4gICAgICBvdXRwdXQgPSBudWxsO1xuXG4gIGZ1bmN0aW9uIGFyZWEoZGF0YSkge1xuICAgIHZhciBpLFxuICAgICAgICBqLFxuICAgICAgICBrLFxuICAgICAgICBuID0gZGF0YS5sZW5ndGgsXG4gICAgICAgIGQsXG4gICAgICAgIGRlZmluZWQwID0gZmFsc2UsXG4gICAgICAgIGJ1ZmZlcixcbiAgICAgICAgeDB6ID0gbmV3IEFycmF5KG4pLFxuICAgICAgICB5MHogPSBuZXcgQXJyYXkobik7XG5cbiAgICBpZiAoY29udGV4dCA9PSBudWxsKSBvdXRwdXQgPSBjdXJ2ZShidWZmZXIgPSBwYXRoKCkpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8PSBuOyArK2kpIHtcbiAgICAgIGlmICghKGkgPCBuICYmIGRlZmluZWQoZCA9IGRhdGFbaV0sIGksIGRhdGEpKSA9PT0gZGVmaW5lZDApIHtcbiAgICAgICAgaWYgKGRlZmluZWQwID0gIWRlZmluZWQwKSB7XG4gICAgICAgICAgaiA9IGk7XG4gICAgICAgICAgb3V0cHV0LmFyZWFTdGFydCgpO1xuICAgICAgICAgIG91dHB1dC5saW5lU3RhcnQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXRwdXQubGluZUVuZCgpO1xuICAgICAgICAgIG91dHB1dC5saW5lU3RhcnQoKTtcbiAgICAgICAgICBmb3IgKGsgPSBpIC0gMTsgayA+PSBqOyAtLWspIHtcbiAgICAgICAgICAgIG91dHB1dC5wb2ludCh4MHpba10sIHkweltrXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dHB1dC5saW5lRW5kKCk7XG4gICAgICAgICAgb3V0cHV0LmFyZWFFbmQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGRlZmluZWQwKSB7XG4gICAgICAgIHgweltpXSA9ICt4MChkLCBpLCBkYXRhKSwgeTB6W2ldID0gK3kwKGQsIGksIGRhdGEpO1xuICAgICAgICBvdXRwdXQucG9pbnQoeDEgPyAreDEoZCwgaSwgZGF0YSkgOiB4MHpbaV0sIHkxID8gK3kxKGQsIGksIGRhdGEpIDogeTB6W2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYnVmZmVyKSByZXR1cm4gb3V0cHV0ID0gbnVsbCwgYnVmZmVyICsgXCJcIiB8fCBudWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gYXJlYWxpbmUoKSB7XG4gICAgcmV0dXJuIGxpbmUoKS5kZWZpbmVkKGRlZmluZWQpLmN1cnZlKGN1cnZlKS5jb250ZXh0KGNvbnRleHQpO1xuICB9XG5cbiAgYXJlYS54ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgwID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIHgxID0gbnVsbCwgYXJlYSkgOiB4MDtcbiAgfTtcblxuICBhcmVhLngwID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgwID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGFyZWEpIDogeDA7XG4gIH07XG5cbiAgYXJlYS54MSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh4MSA9IF8gPT0gbnVsbCA/IG51bGwgOiB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJlYSkgOiB4MTtcbiAgfTtcblxuICBhcmVhLnkgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeTAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgeTEgPSBudWxsLCBhcmVhKSA6IHkwO1xuICB9O1xuXG4gIGFyZWEueTAgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeTAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJlYSkgOiB5MDtcbiAgfTtcblxuICBhcmVhLnkxID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHkxID0gXyA9PSBudWxsID8gbnVsbCA6IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmVhKSA6IHkxO1xuICB9O1xuXG4gIGFyZWEubGluZVgwID1cbiAgYXJlYS5saW5lWTAgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXJlYWxpbmUoKS54KHgwKS55KHkwKTtcbiAgfTtcblxuICBhcmVhLmxpbmVZMSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmVhbGluZSgpLngoeDApLnkoeTEpO1xuICB9O1xuXG4gIGFyZWEubGluZVgxID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFyZWFsaW5lKCkueCh4MSkueSh5MCk7XG4gIH07XG5cbiAgYXJlYS5kZWZpbmVkID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRlZmluZWQgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCEhXyksIGFyZWEpIDogZGVmaW5lZDtcbiAgfTtcblxuICBhcmVhLmN1cnZlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGN1cnZlID0gXywgY29udGV4dCAhPSBudWxsICYmIChvdXRwdXQgPSBjdXJ2ZShjb250ZXh0KSksIGFyZWEpIDogY3VydmU7XG4gIH07XG5cbiAgYXJlYS5jb250ZXh0ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKF8gPT0gbnVsbCA/IGNvbnRleHQgPSBvdXRwdXQgPSBudWxsIDogb3V0cHV0ID0gY3VydmUoY29udGV4dCA9IF8pLCBhcmVhKSA6IGNvbnRleHQ7XG4gIH07XG5cbiAgcmV0dXJuIGFyZWE7XG59XG4iLCJmdW5jdGlvbiBzaWduKHgpIHtcbiAgcmV0dXJuIHggPCAwID8gLTEgOiAxO1xufVxuXG4vLyBDYWxjdWxhdGUgdGhlIHNsb3BlcyBvZiB0aGUgdGFuZ2VudHMgKEhlcm1pdGUtdHlwZSBpbnRlcnBvbGF0aW9uKSBiYXNlZCBvblxuLy8gdGhlIGZvbGxvd2luZyBwYXBlcjogU3RlZmZlbiwgTS4gMTk5MC4gQSBTaW1wbGUgTWV0aG9kIGZvciBNb25vdG9uaWNcbi8vIEludGVycG9sYXRpb24gaW4gT25lIERpbWVuc2lvbi4gQXN0cm9ub215IGFuZCBBc3Ryb3BoeXNpY3MsIFZvbC4gMjM5LCBOTy5cbi8vIE5PVihJSSksIFAuIDQ0MywgMTk5MC5cbmZ1bmN0aW9uIHNsb3BlMyh0aGF0LCB4MiwgeTIpIHtcbiAgdmFyIGgwID0gdGhhdC5feDEgLSB0aGF0Ll94MCxcbiAgICAgIGgxID0geDIgLSB0aGF0Ll94MSxcbiAgICAgIHMwID0gKHRoYXQuX3kxIC0gdGhhdC5feTApIC8gKGgwIHx8IGgxIDwgMCAmJiAtMCksXG4gICAgICBzMSA9ICh5MiAtIHRoYXQuX3kxKSAvIChoMSB8fCBoMCA8IDAgJiYgLTApLFxuICAgICAgcCA9IChzMCAqIGgxICsgczEgKiBoMCkgLyAoaDAgKyBoMSk7XG4gIHJldHVybiAoc2lnbihzMCkgKyBzaWduKHMxKSkgKiBNYXRoLm1pbihNYXRoLmFicyhzMCksIE1hdGguYWJzKHMxKSwgMC41ICogTWF0aC5hYnMocCkpIHx8IDA7XG59XG5cbi8vIENhbGN1bGF0ZSBhIG9uZS1zaWRlZCBzbG9wZS5cbmZ1bmN0aW9uIHNsb3BlMih0aGF0LCB0KSB7XG4gIHZhciBoID0gdGhhdC5feDEgLSB0aGF0Ll94MDtcbiAgcmV0dXJuIGggPyAoMyAqICh0aGF0Ll95MSAtIHRoYXQuX3kwKSAvIGggLSB0KSAvIDIgOiB0O1xufVxuXG4vLyBBY2NvcmRpbmcgdG8gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ3ViaWNfSGVybWl0ZV9zcGxpbmUjUmVwcmVzZW50YXRpb25zXG4vLyBcInlvdSBjYW4gZXhwcmVzcyBjdWJpYyBIZXJtaXRlIGludGVycG9sYXRpb24gaW4gdGVybXMgb2YgY3ViaWMgQsOpemllciBjdXJ2ZXNcbi8vIHdpdGggcmVzcGVjdCB0byB0aGUgZm91ciB2YWx1ZXMgcDAsIHAwICsgbTAgLyAzLCBwMSAtIG0xIC8gMywgcDFcIi5cbmZ1bmN0aW9uIHBvaW50KHRoYXQsIHQwLCB0MSkge1xuICB2YXIgeDAgPSB0aGF0Ll94MCxcbiAgICAgIHkwID0gdGhhdC5feTAsXG4gICAgICB4MSA9IHRoYXQuX3gxLFxuICAgICAgeTEgPSB0aGF0Ll95MSxcbiAgICAgIGR4ID0gKHgxIC0geDApIC8gMztcbiAgdGhhdC5fY29udGV4dC5iZXppZXJDdXJ2ZVRvKHgwICsgZHgsIHkwICsgZHggKiB0MCwgeDEgLSBkeCwgeTEgLSBkeCAqIHQxLCB4MSwgeTEpO1xufVxuXG5mdW5jdGlvbiBNb25vdG9uZVgoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbn1cblxuTW9ub3RvbmVYLnByb3RvdHlwZSA9IHtcbiAgYXJlYVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gMDtcbiAgfSxcbiAgYXJlYUVuZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IE5hTjtcbiAgfSxcbiAgbGluZVN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxID1cbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxID1cbiAgICB0aGlzLl90MCA9IE5hTjtcbiAgICB0aGlzLl9wb2ludCA9IDA7XG4gIH0sXG4gIGxpbmVFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMjogdGhpcy5fY29udGV4dC5saW5lVG8odGhpcy5feDEsIHRoaXMuX3kxKTsgYnJlYWs7XG4gICAgICBjYXNlIDM6IHBvaW50KHRoaXMsIHRoaXMuX3QwLCBzbG9wZTIodGhpcywgdGhpcy5fdDApKTsgYnJlYWs7XG4gICAgfVxuICAgIGlmICh0aGlzLl9saW5lIHx8ICh0aGlzLl9saW5lICE9PSAwICYmIHRoaXMuX3BvaW50ID09PSAxKSkgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICB0aGlzLl9saW5lID0gMSAtIHRoaXMuX2xpbmU7XG4gIH0sXG4gIHBvaW50OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgdmFyIHQxID0gTmFOO1xuXG4gICAgeCA9ICt4LCB5ID0gK3k7XG4gICAgaWYgKHggPT09IHRoaXMuX3gxICYmIHkgPT09IHRoaXMuX3kxKSByZXR1cm47IC8vIElnbm9yZSBjb2luY2lkZW50IHBvaW50cy5cbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDA6IHRoaXMuX3BvaW50ID0gMTsgdGhpcy5fbGluZSA/IHRoaXMuX2NvbnRleHQubGluZVRvKHgsIHkpIDogdGhpcy5fY29udGV4dC5tb3ZlVG8oeCwgeSk7IGJyZWFrO1xuICAgICAgY2FzZSAxOiB0aGlzLl9wb2ludCA9IDI7IGJyZWFrO1xuICAgICAgY2FzZSAyOiB0aGlzLl9wb2ludCA9IDM7IHBvaW50KHRoaXMsIHNsb3BlMih0aGlzLCB0MSA9IHNsb3BlMyh0aGlzLCB4LCB5KSksIHQxKTsgYnJlYWs7XG4gICAgICBkZWZhdWx0OiBwb2ludCh0aGlzLCB0aGlzLl90MCwgdDEgPSBzbG9wZTModGhpcywgeCwgeSkpOyBicmVhaztcbiAgICB9XG5cbiAgICB0aGlzLl94MCA9IHRoaXMuX3gxLCB0aGlzLl94MSA9IHg7XG4gICAgdGhpcy5feTAgPSB0aGlzLl95MSwgdGhpcy5feTEgPSB5O1xuICAgIHRoaXMuX3QwID0gdDE7XG4gIH1cbn1cblxuZnVuY3Rpb24gTW9ub3RvbmVZKGNvbnRleHQpIHtcbiAgdGhpcy5fY29udGV4dCA9IG5ldyBSZWZsZWN0Q29udGV4dChjb250ZXh0KTtcbn1cblxuKE1vbm90b25lWS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE1vbm90b25lWC5wcm90b3R5cGUpKS5wb2ludCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgTW9ub3RvbmVYLnByb3RvdHlwZS5wb2ludC5jYWxsKHRoaXMsIHksIHgpO1xufTtcblxuZnVuY3Rpb24gUmVmbGVjdENvbnRleHQoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbn1cblxuUmVmbGVjdENvbnRleHQucHJvdG90eXBlID0ge1xuICBtb3ZlVG86IGZ1bmN0aW9uKHgsIHkpIHsgdGhpcy5fY29udGV4dC5tb3ZlVG8oeSwgeCk7IH0sXG4gIGNsb3NlUGF0aDogZnVuY3Rpb24oKSB7IHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7IH0sXG4gIGxpbmVUbzogZnVuY3Rpb24oeCwgeSkgeyB0aGlzLl9jb250ZXh0LmxpbmVUbyh5LCB4KTsgfSxcbiAgYmV6aWVyQ3VydmVUbzogZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIsIHgsIHkpIHsgdGhpcy5fY29udGV4dC5iZXppZXJDdXJ2ZVRvKHkxLCB4MSwgeTIsIHgyLCB5LCB4KTsgfVxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG1vbm90b25lWChjb250ZXh0KSB7XG4gIHJldHVybiBuZXcgTW9ub3RvbmVYKGNvbnRleHQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW9ub3RvbmVZKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBNb25vdG9uZVkoY29udGV4dCk7XG59XG4iLCJleHBvcnQgdmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4geDtcbn1cbiIsImltcG9ydCB7c2xpY2V9IGZyb20gXCIuL2FycmF5XCI7XG5pbXBvcnQgaWRlbnRpdHkgZnJvbSBcIi4vaWRlbnRpdHlcIjtcblxudmFyIHRvcCA9IDEsXG4gICAgcmlnaHQgPSAyLFxuICAgIGJvdHRvbSA9IDMsXG4gICAgbGVmdCA9IDQsXG4gICAgZXBzaWxvbiA9IDFlLTY7XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVgoeCkge1xuICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyAoeCArIDAuNSkgKyBcIiwwKVwiO1xufVxuXG5mdW5jdGlvbiB0cmFuc2xhdGVZKHkpIHtcbiAgcmV0dXJuIFwidHJhbnNsYXRlKDAsXCIgKyAoeSArIDAuNSkgKyBcIilcIjtcbn1cblxuZnVuY3Rpb24gbnVtYmVyKHNjYWxlKSB7XG4gIHJldHVybiBmdW5jdGlvbihkKSB7XG4gICAgcmV0dXJuICtzY2FsZShkKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gY2VudGVyKHNjYWxlKSB7XG4gIHZhciBvZmZzZXQgPSBNYXRoLm1heCgwLCBzY2FsZS5iYW5kd2lkdGgoKSAtIDEpIC8gMjsgLy8gQWRqdXN0IGZvciAwLjVweCBvZmZzZXQuXG4gIGlmIChzY2FsZS5yb3VuZCgpKSBvZmZzZXQgPSBNYXRoLnJvdW5kKG9mZnNldCk7XG4gIHJldHVybiBmdW5jdGlvbihkKSB7XG4gICAgcmV0dXJuICtzY2FsZShkKSArIG9mZnNldDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZW50ZXJpbmcoKSB7XG4gIHJldHVybiAhdGhpcy5fX2F4aXM7XG59XG5cbmZ1bmN0aW9uIGF4aXMob3JpZW50LCBzY2FsZSkge1xuICB2YXIgdGlja0FyZ3VtZW50cyA9IFtdLFxuICAgICAgdGlja1ZhbHVlcyA9IG51bGwsXG4gICAgICB0aWNrRm9ybWF0ID0gbnVsbCxcbiAgICAgIHRpY2tTaXplSW5uZXIgPSA2LFxuICAgICAgdGlja1NpemVPdXRlciA9IDYsXG4gICAgICB0aWNrUGFkZGluZyA9IDMsXG4gICAgICBrID0gb3JpZW50ID09PSB0b3AgfHwgb3JpZW50ID09PSBsZWZ0ID8gLTEgOiAxLFxuICAgICAgeCA9IG9yaWVudCA9PT0gbGVmdCB8fCBvcmllbnQgPT09IHJpZ2h0ID8gXCJ4XCIgOiBcInlcIixcbiAgICAgIHRyYW5zZm9ybSA9IG9yaWVudCA9PT0gdG9wIHx8IG9yaWVudCA9PT0gYm90dG9tID8gdHJhbnNsYXRlWCA6IHRyYW5zbGF0ZVk7XG5cbiAgZnVuY3Rpb24gYXhpcyhjb250ZXh0KSB7XG4gICAgdmFyIHZhbHVlcyA9IHRpY2tWYWx1ZXMgPT0gbnVsbCA/IChzY2FsZS50aWNrcyA/IHNjYWxlLnRpY2tzLmFwcGx5KHNjYWxlLCB0aWNrQXJndW1lbnRzKSA6IHNjYWxlLmRvbWFpbigpKSA6IHRpY2tWYWx1ZXMsXG4gICAgICAgIGZvcm1hdCA9IHRpY2tGb3JtYXQgPT0gbnVsbCA/IChzY2FsZS50aWNrRm9ybWF0ID8gc2NhbGUudGlja0Zvcm1hdC5hcHBseShzY2FsZSwgdGlja0FyZ3VtZW50cykgOiBpZGVudGl0eSkgOiB0aWNrRm9ybWF0LFxuICAgICAgICBzcGFjaW5nID0gTWF0aC5tYXgodGlja1NpemVJbm5lciwgMCkgKyB0aWNrUGFkZGluZyxcbiAgICAgICAgcmFuZ2UgPSBzY2FsZS5yYW5nZSgpLFxuICAgICAgICByYW5nZTAgPSArcmFuZ2VbMF0gKyAwLjUsXG4gICAgICAgIHJhbmdlMSA9ICtyYW5nZVtyYW5nZS5sZW5ndGggLSAxXSArIDAuNSxcbiAgICAgICAgcG9zaXRpb24gPSAoc2NhbGUuYmFuZHdpZHRoID8gY2VudGVyIDogbnVtYmVyKShzY2FsZS5jb3B5KCkpLFxuICAgICAgICBzZWxlY3Rpb24gPSBjb250ZXh0LnNlbGVjdGlvbiA/IGNvbnRleHQuc2VsZWN0aW9uKCkgOiBjb250ZXh0LFxuICAgICAgICBwYXRoID0gc2VsZWN0aW9uLnNlbGVjdEFsbChcIi5kb21haW5cIikuZGF0YShbbnVsbF0pLFxuICAgICAgICB0aWNrID0gc2VsZWN0aW9uLnNlbGVjdEFsbChcIi50aWNrXCIpLmRhdGEodmFsdWVzLCBzY2FsZSkub3JkZXIoKSxcbiAgICAgICAgdGlja0V4aXQgPSB0aWNrLmV4aXQoKSxcbiAgICAgICAgdGlja0VudGVyID0gdGljay5lbnRlcigpLmFwcGVuZChcImdcIikuYXR0cihcImNsYXNzXCIsIFwidGlja1wiKSxcbiAgICAgICAgbGluZSA9IHRpY2suc2VsZWN0KFwibGluZVwiKSxcbiAgICAgICAgdGV4dCA9IHRpY2suc2VsZWN0KFwidGV4dFwiKTtcblxuICAgIHBhdGggPSBwYXRoLm1lcmdlKHBhdGguZW50ZXIoKS5pbnNlcnQoXCJwYXRoXCIsIFwiLnRpY2tcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImRvbWFpblwiKVxuICAgICAgICAuYXR0cihcInN0cm9rZVwiLCBcIiMwMDBcIikpO1xuXG4gICAgdGljayA9IHRpY2subWVyZ2UodGlja0VudGVyKTtcblxuICAgIGxpbmUgPSBsaW5lLm1lcmdlKHRpY2tFbnRlci5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwiIzAwMFwiKVxuICAgICAgICAuYXR0cih4ICsgXCIyXCIsIGsgKiB0aWNrU2l6ZUlubmVyKSk7XG5cbiAgICB0ZXh0ID0gdGV4dC5tZXJnZSh0aWNrRW50ZXIuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAuYXR0cihcImZpbGxcIiwgXCIjMDAwXCIpXG4gICAgICAgIC5hdHRyKHgsIGsgKiBzcGFjaW5nKVxuICAgICAgICAuYXR0cihcImR5XCIsIG9yaWVudCA9PT0gdG9wID8gXCIwZW1cIiA6IG9yaWVudCA9PT0gYm90dG9tID8gXCIwLjcxZW1cIiA6IFwiMC4zMmVtXCIpKTtcblxuICAgIGlmIChjb250ZXh0ICE9PSBzZWxlY3Rpb24pIHtcbiAgICAgIHBhdGggPSBwYXRoLnRyYW5zaXRpb24oY29udGV4dCk7XG4gICAgICB0aWNrID0gdGljay50cmFuc2l0aW9uKGNvbnRleHQpO1xuICAgICAgbGluZSA9IGxpbmUudHJhbnNpdGlvbihjb250ZXh0KTtcbiAgICAgIHRleHQgPSB0ZXh0LnRyYW5zaXRpb24oY29udGV4dCk7XG5cbiAgICAgIHRpY2tFeGl0ID0gdGlja0V4aXQudHJhbnNpdGlvbihjb250ZXh0KVxuICAgICAgICAgIC5hdHRyKFwib3BhY2l0eVwiLCBlcHNpbG9uKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGlzRmluaXRlKGQgPSBwb3NpdGlvbihkKSkgPyB0cmFuc2Zvcm0oZCkgOiB0aGlzLmdldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiKTsgfSk7XG5cbiAgICAgIHRpY2tFbnRlclxuICAgICAgICAgIC5hdHRyKFwib3BhY2l0eVwiLCBlcHNpbG9uKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgdmFyIHAgPSB0aGlzLnBhcmVudE5vZGUuX19heGlzOyByZXR1cm4gdHJhbnNmb3JtKHAgJiYgaXNGaW5pdGUocCA9IHAoZCkpID8gcCA6IHBvc2l0aW9uKGQpKTsgfSk7XG4gICAgfVxuXG4gICAgdGlja0V4aXQucmVtb3ZlKCk7XG5cbiAgICBwYXRoXG4gICAgICAgIC5hdHRyKFwiZFwiLCBvcmllbnQgPT09IGxlZnQgfHwgb3JpZW50ID09IHJpZ2h0XG4gICAgICAgICAgICA/IFwiTVwiICsgayAqIHRpY2tTaXplT3V0ZXIgKyBcIixcIiArIHJhbmdlMCArIFwiSDAuNVZcIiArIHJhbmdlMSArIFwiSFwiICsgayAqIHRpY2tTaXplT3V0ZXJcbiAgICAgICAgICAgIDogXCJNXCIgKyByYW5nZTAgKyBcIixcIiArIGsgKiB0aWNrU2l6ZU91dGVyICsgXCJWMC41SFwiICsgcmFuZ2UxICsgXCJWXCIgKyBrICogdGlja1NpemVPdXRlcik7XG5cbiAgICB0aWNrXG4gICAgICAgIC5hdHRyKFwib3BhY2l0eVwiLCAxKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiB0cmFuc2Zvcm0ocG9zaXRpb24oZCkpOyB9KTtcblxuICAgIGxpbmVcbiAgICAgICAgLmF0dHIoeCArIFwiMlwiLCBrICogdGlja1NpemVJbm5lcik7XG5cbiAgICB0ZXh0XG4gICAgICAgIC5hdHRyKHgsIGsgKiBzcGFjaW5nKVxuICAgICAgICAudGV4dChmb3JtYXQpO1xuXG4gICAgc2VsZWN0aW9uLmZpbHRlcihlbnRlcmluZylcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwibm9uZVwiKVxuICAgICAgICAuYXR0cihcImZvbnQtc2l6ZVwiLCAxMClcbiAgICAgICAgLmF0dHIoXCJmb250LWZhbWlseVwiLCBcInNhbnMtc2VyaWZcIilcbiAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBvcmllbnQgPT09IHJpZ2h0ID8gXCJzdGFydFwiIDogb3JpZW50ID09PSBsZWZ0ID8gXCJlbmRcIiA6IFwibWlkZGxlXCIpO1xuXG4gICAgc2VsZWN0aW9uXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKCkgeyB0aGlzLl9fYXhpcyA9IHBvc2l0aW9uOyB9KTtcbiAgfVxuXG4gIGF4aXMuc2NhbGUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoc2NhbGUgPSBfLCBheGlzKSA6IHNjYWxlO1xuICB9O1xuXG4gIGF4aXMudGlja3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGlja0FyZ3VtZW50cyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKSwgYXhpcztcbiAgfTtcblxuICBheGlzLnRpY2tBcmd1bWVudHMgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodGlja0FyZ3VtZW50cyA9IF8gPT0gbnVsbCA/IFtdIDogc2xpY2UuY2FsbChfKSwgYXhpcykgOiB0aWNrQXJndW1lbnRzLnNsaWNlKCk7XG4gIH07XG5cbiAgYXhpcy50aWNrVmFsdWVzID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHRpY2tWYWx1ZXMgPSBfID09IG51bGwgPyBudWxsIDogc2xpY2UuY2FsbChfKSwgYXhpcykgOiB0aWNrVmFsdWVzICYmIHRpY2tWYWx1ZXMuc2xpY2UoKTtcbiAgfTtcblxuICBheGlzLnRpY2tGb3JtYXQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodGlja0Zvcm1hdCA9IF8sIGF4aXMpIDogdGlja0Zvcm1hdDtcbiAgfTtcblxuICBheGlzLnRpY2tTaXplID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHRpY2tTaXplSW5uZXIgPSB0aWNrU2l6ZU91dGVyID0gK18sIGF4aXMpIDogdGlja1NpemVJbm5lcjtcbiAgfTtcblxuICBheGlzLnRpY2tTaXplSW5uZXIgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodGlja1NpemVJbm5lciA9ICtfLCBheGlzKSA6IHRpY2tTaXplSW5uZXI7XG4gIH07XG5cbiAgYXhpcy50aWNrU2l6ZU91dGVyID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHRpY2tTaXplT3V0ZXIgPSArXywgYXhpcykgOiB0aWNrU2l6ZU91dGVyO1xuICB9O1xuXG4gIGF4aXMudGlja1BhZGRpbmcgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodGlja1BhZGRpbmcgPSArXywgYXhpcykgOiB0aWNrUGFkZGluZztcbiAgfTtcblxuICByZXR1cm4gYXhpcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGF4aXNUb3Aoc2NhbGUpIHtcbiAgcmV0dXJuIGF4aXModG9wLCBzY2FsZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBheGlzUmlnaHQoc2NhbGUpIHtcbiAgcmV0dXJuIGF4aXMocmlnaHQsIHNjYWxlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGF4aXNCb3R0b20oc2NhbGUpIHtcbiAgcmV0dXJuIGF4aXMoYm90dG9tLCBzY2FsZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBheGlzTGVmdChzY2FsZSkge1xuICByZXR1cm4gYXhpcyhsZWZ0LCBzY2FsZSk7XG59XG4iLCJ2YXIgbm9vcCA9IHt2YWx1ZTogZnVuY3Rpb24oKSB7fX07XG5cbmZ1bmN0aW9uIGRpc3BhdGNoKCkge1xuICBmb3IgKHZhciBpID0gMCwgbiA9IGFyZ3VtZW50cy5sZW5ndGgsIF8gPSB7fSwgdDsgaSA8IG47ICsraSkge1xuICAgIGlmICghKHQgPSBhcmd1bWVudHNbaV0gKyBcIlwiKSB8fCAodCBpbiBfKSkgdGhyb3cgbmV3IEVycm9yKFwiaWxsZWdhbCB0eXBlOiBcIiArIHQpO1xuICAgIF9bdF0gPSBbXTtcbiAgfVxuICByZXR1cm4gbmV3IERpc3BhdGNoKF8pO1xufVxuXG5mdW5jdGlvbiBEaXNwYXRjaChfKSB7XG4gIHRoaXMuXyA9IF87XG59XG5cbmZ1bmN0aW9uIHBhcnNlVHlwZW5hbWVzKHR5cGVuYW1lcywgdHlwZXMpIHtcbiAgcmV0dXJuIHR5cGVuYW1lcy50cmltKCkuc3BsaXQoL158XFxzKy8pLm1hcChmdW5jdGlvbih0KSB7XG4gICAgdmFyIG5hbWUgPSBcIlwiLCBpID0gdC5pbmRleE9mKFwiLlwiKTtcbiAgICBpZiAoaSA+PSAwKSBuYW1lID0gdC5zbGljZShpICsgMSksIHQgPSB0LnNsaWNlKDAsIGkpO1xuICAgIGlmICh0ICYmICF0eXBlcy5oYXNPd25Qcm9wZXJ0eSh0KSkgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlOiBcIiArIHQpO1xuICAgIHJldHVybiB7dHlwZTogdCwgbmFtZTogbmFtZX07XG4gIH0pO1xufVxuXG5EaXNwYXRjaC5wcm90b3R5cGUgPSBkaXNwYXRjaC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBEaXNwYXRjaCxcbiAgb246IGZ1bmN0aW9uKHR5cGVuYW1lLCBjYWxsYmFjaykge1xuICAgIHZhciBfID0gdGhpcy5fLFxuICAgICAgICBUID0gcGFyc2VUeXBlbmFtZXModHlwZW5hbWUgKyBcIlwiLCBfKSxcbiAgICAgICAgdCxcbiAgICAgICAgaSA9IC0xLFxuICAgICAgICBuID0gVC5sZW5ndGg7XG5cbiAgICAvLyBJZiBubyBjYWxsYmFjayB3YXMgc3BlY2lmaWVkLCByZXR1cm4gdGhlIGNhbGxiYWNrIG9mIHRoZSBnaXZlbiB0eXBlIGFuZCBuYW1lLlxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGlmICgodCA9ICh0eXBlbmFtZSA9IFRbaV0pLnR5cGUpICYmICh0ID0gZ2V0KF9bdF0sIHR5cGVuYW1lLm5hbWUpKSkgcmV0dXJuIHQ7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgYSB0eXBlIHdhcyBzcGVjaWZpZWQsIHNldCB0aGUgY2FsbGJhY2sgZm9yIHRoZSBnaXZlbiB0eXBlIGFuZCBuYW1lLlxuICAgIC8vIE90aGVyd2lzZSwgaWYgYSBudWxsIGNhbGxiYWNrIHdhcyBzcGVjaWZpZWQsIHJlbW92ZSBjYWxsYmFja3Mgb2YgdGhlIGdpdmVuIG5hbWUuXG4gICAgaWYgKGNhbGxiYWNrICE9IG51bGwgJiYgdHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgY2FsbGJhY2s6IFwiICsgY2FsbGJhY2spO1xuICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICBpZiAodCA9ICh0eXBlbmFtZSA9IFRbaV0pLnR5cGUpIF9bdF0gPSBzZXQoX1t0XSwgdHlwZW5hbWUubmFtZSwgY2FsbGJhY2spO1xuICAgICAgZWxzZSBpZiAoY2FsbGJhY2sgPT0gbnVsbCkgZm9yICh0IGluIF8pIF9bdF0gPSBzZXQoX1t0XSwgdHlwZW5hbWUubmFtZSwgbnVsbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGNvcHk6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb3B5ID0ge30sIF8gPSB0aGlzLl87XG4gICAgZm9yICh2YXIgdCBpbiBfKSBjb3B5W3RdID0gX1t0XS5zbGljZSgpO1xuICAgIHJldHVybiBuZXcgRGlzcGF0Y2goY29weSk7XG4gIH0sXG4gIGNhbGw6IGZ1bmN0aW9uKHR5cGUsIHRoYXQpIHtcbiAgICBpZiAoKG4gPSBhcmd1bWVudHMubGVuZ3RoIC0gMikgPiAwKSBmb3IgKHZhciBhcmdzID0gbmV3IEFycmF5KG4pLCBpID0gMCwgbiwgdDsgaSA8IG47ICsraSkgYXJnc1tpXSA9IGFyZ3VtZW50c1tpICsgMl07XG4gICAgaWYgKCF0aGlzLl8uaGFzT3duUHJvcGVydHkodHlwZSkpIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZTogXCIgKyB0eXBlKTtcbiAgICBmb3IgKHQgPSB0aGlzLl9bdHlwZV0sIGkgPSAwLCBuID0gdC5sZW5ndGg7IGkgPCBuOyArK2kpIHRbaV0udmFsdWUuYXBwbHkodGhhdCwgYXJncyk7XG4gIH0sXG4gIGFwcGx5OiBmdW5jdGlvbih0eXBlLCB0aGF0LCBhcmdzKSB7XG4gICAgaWYgKCF0aGlzLl8uaGFzT3duUHJvcGVydHkodHlwZSkpIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZTogXCIgKyB0eXBlKTtcbiAgICBmb3IgKHZhciB0ID0gdGhpcy5fW3R5cGVdLCBpID0gMCwgbiA9IHQubGVuZ3RoOyBpIDwgbjsgKytpKSB0W2ldLnZhbHVlLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBnZXQodHlwZSwgbmFtZSkge1xuICBmb3IgKHZhciBpID0gMCwgbiA9IHR5cGUubGVuZ3RoLCBjOyBpIDwgbjsgKytpKSB7XG4gICAgaWYgKChjID0gdHlwZVtpXSkubmFtZSA9PT0gbmFtZSkge1xuICAgICAgcmV0dXJuIGMudmFsdWU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNldCh0eXBlLCBuYW1lLCBjYWxsYmFjaykge1xuICBmb3IgKHZhciBpID0gMCwgbiA9IHR5cGUubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgaWYgKHR5cGVbaV0ubmFtZSA9PT0gbmFtZSkge1xuICAgICAgdHlwZVtpXSA9IG5vb3AsIHR5cGUgPSB0eXBlLnNsaWNlKDAsIGkpLmNvbmNhdCh0eXBlLnNsaWNlKGkgKyAxKSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgaWYgKGNhbGxiYWNrICE9IG51bGwpIHR5cGUucHVzaCh7bmFtZTogbmFtZSwgdmFsdWU6IGNhbGxiYWNrfSk7XG4gIHJldHVybiB0eXBlO1xufVxuXG5leHBvcnQgZGVmYXVsdCBkaXNwYXRjaDtcbiIsImltcG9ydCB7ZXZlbnR9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcHJvcGFnYXRpb24oKSB7XG4gIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG59XG4iLCJpbXBvcnQge3NlbGVjdH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IG5vZXZlbnQgZnJvbSBcIi4vbm9ldmVudFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2aWV3KSB7XG4gIHZhciByb290ID0gdmlldy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gICAgICBzZWxlY3Rpb24gPSBzZWxlY3Qodmlldykub24oXCJkcmFnc3RhcnQuZHJhZ1wiLCBub2V2ZW50LCB0cnVlKTtcbiAgaWYgKFwib25zZWxlY3RzdGFydFwiIGluIHJvb3QpIHtcbiAgICBzZWxlY3Rpb24ub24oXCJzZWxlY3RzdGFydC5kcmFnXCIsIG5vZXZlbnQsIHRydWUpO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuX19ub3NlbGVjdCA9IHJvb3Quc3R5bGUuTW96VXNlclNlbGVjdDtcbiAgICByb290LnN0eWxlLk1velVzZXJTZWxlY3QgPSBcIm5vbmVcIjtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24geWVzZHJhZyh2aWV3LCBub2NsaWNrKSB7XG4gIHZhciByb290ID0gdmlldy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gICAgICBzZWxlY3Rpb24gPSBzZWxlY3Qodmlldykub24oXCJkcmFnc3RhcnQuZHJhZ1wiLCBudWxsKTtcbiAgaWYgKG5vY2xpY2spIHtcbiAgICBzZWxlY3Rpb24ub24oXCJjbGljay5kcmFnXCIsIG5vZXZlbnQsIHRydWUpO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHNlbGVjdGlvbi5vbihcImNsaWNrLmRyYWdcIiwgbnVsbCk7IH0sIDApO1xuICB9XG4gIGlmIChcIm9uc2VsZWN0c3RhcnRcIiBpbiByb290KSB7XG4gICAgc2VsZWN0aW9uLm9uKFwic2VsZWN0c3RhcnQuZHJhZ1wiLCBudWxsKTtcbiAgfSBlbHNlIHtcbiAgICByb290LnN0eWxlLk1velVzZXJTZWxlY3QgPSByb290Ll9fbm9zZWxlY3Q7XG4gICAgZGVsZXRlIHJvb3QuX19ub3NlbGVjdDtcbiAgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRHJhZ0V2ZW50KHRhcmdldCwgdHlwZSwgc3ViamVjdCwgaWQsIGFjdGl2ZSwgeCwgeSwgZHgsIGR5LCBkaXNwYXRjaCkge1xuICB0aGlzLnRhcmdldCA9IHRhcmdldDtcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy5zdWJqZWN0ID0gc3ViamVjdDtcbiAgdGhpcy5pZGVudGlmaWVyID0gaWQ7XG4gIHRoaXMuYWN0aXZlID0gYWN0aXZlO1xuICB0aGlzLnggPSB4O1xuICB0aGlzLnkgPSB5O1xuICB0aGlzLmR4ID0gZHg7XG4gIHRoaXMuZHkgPSBkeTtcbiAgdGhpcy5fID0gZGlzcGF0Y2g7XG59XG5cbkRyYWdFdmVudC5wcm90b3R5cGUub24gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHZhbHVlID0gdGhpcy5fLm9uLmFwcGx5KHRoaXMuXywgYXJndW1lbnRzKTtcbiAgcmV0dXJuIHZhbHVlID09PSB0aGlzLl8gPyB0aGlzIDogdmFsdWU7XG59O1xuIiwidmFyIGZyYW1lID0gMCwgLy8gaXMgYW4gYW5pbWF0aW9uIGZyYW1lIHBlbmRpbmc/XG4gICAgdGltZW91dCA9IDAsIC8vIGlzIGEgdGltZW91dCBwZW5kaW5nP1xuICAgIGludGVydmFsID0gMCwgLy8gYXJlIGFueSB0aW1lcnMgYWN0aXZlP1xuICAgIHBva2VEZWxheSA9IDEwMDAsIC8vIGhvdyBmcmVxdWVudGx5IHdlIGNoZWNrIGZvciBjbG9jayBza2V3XG4gICAgdGFza0hlYWQsXG4gICAgdGFza1RhaWwsXG4gICAgY2xvY2tMYXN0ID0gMCxcbiAgICBjbG9ja05vdyA9IDAsXG4gICAgY2xvY2tTa2V3ID0gMCxcbiAgICBjbG9jayA9IHR5cGVvZiBwZXJmb3JtYW5jZSA9PT0gXCJvYmplY3RcIiAmJiBwZXJmb3JtYW5jZS5ub3cgPyBwZXJmb3JtYW5jZSA6IERhdGUsXG4gICAgc2V0RnJhbWUgPSB0eXBlb2Ygd2luZG93ID09PSBcIm9iamVjdFwiICYmIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPyB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lLmJpbmQod2luZG93KSA6IGZ1bmN0aW9uKGYpIHsgc2V0VGltZW91dChmLCAxNyk7IH07XG5cbmV4cG9ydCBmdW5jdGlvbiBub3coKSB7XG4gIHJldHVybiBjbG9ja05vdyB8fCAoc2V0RnJhbWUoY2xlYXJOb3cpLCBjbG9ja05vdyA9IGNsb2NrLm5vdygpICsgY2xvY2tTa2V3KTtcbn1cblxuZnVuY3Rpb24gY2xlYXJOb3coKSB7XG4gIGNsb2NrTm93ID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFRpbWVyKCkge1xuICB0aGlzLl9jYWxsID1cbiAgdGhpcy5fdGltZSA9XG4gIHRoaXMuX25leHQgPSBudWxsO1xufVxuXG5UaW1lci5wcm90b3R5cGUgPSB0aW1lci5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBUaW1lcixcbiAgcmVzdGFydDogZnVuY3Rpb24oY2FsbGJhY2ssIGRlbGF5LCB0aW1lKSB7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2FsbGJhY2sgaXMgbm90IGEgZnVuY3Rpb25cIik7XG4gICAgdGltZSA9ICh0aW1lID09IG51bGwgPyBub3coKSA6ICt0aW1lKSArIChkZWxheSA9PSBudWxsID8gMCA6ICtkZWxheSk7XG4gICAgaWYgKCF0aGlzLl9uZXh0ICYmIHRhc2tUYWlsICE9PSB0aGlzKSB7XG4gICAgICBpZiAodGFza1RhaWwpIHRhc2tUYWlsLl9uZXh0ID0gdGhpcztcbiAgICAgIGVsc2UgdGFza0hlYWQgPSB0aGlzO1xuICAgICAgdGFza1RhaWwgPSB0aGlzO1xuICAgIH1cbiAgICB0aGlzLl9jYWxsID0gY2FsbGJhY2s7XG4gICAgdGhpcy5fdGltZSA9IHRpbWU7XG4gICAgc2xlZXAoKTtcbiAgfSxcbiAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2NhbGwpIHtcbiAgICAgIHRoaXMuX2NhbGwgPSBudWxsO1xuICAgICAgdGhpcy5fdGltZSA9IEluZmluaXR5O1xuICAgICAgc2xlZXAoKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiB0aW1lcihjYWxsYmFjaywgZGVsYXksIHRpbWUpIHtcbiAgdmFyIHQgPSBuZXcgVGltZXI7XG4gIHQucmVzdGFydChjYWxsYmFjaywgZGVsYXksIHRpbWUpO1xuICByZXR1cm4gdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRpbWVyRmx1c2goKSB7XG4gIG5vdygpOyAvLyBHZXQgdGhlIGN1cnJlbnQgdGltZSwgaWYgbm90IGFscmVhZHkgc2V0LlxuICArK2ZyYW1lOyAvLyBQcmV0ZW5kIHdl4oCZdmUgc2V0IGFuIGFsYXJtLCBpZiB3ZSBoYXZlbuKAmXQgYWxyZWFkeS5cbiAgdmFyIHQgPSB0YXNrSGVhZCwgZTtcbiAgd2hpbGUgKHQpIHtcbiAgICBpZiAoKGUgPSBjbG9ja05vdyAtIHQuX3RpbWUpID49IDApIHQuX2NhbGwuY2FsbChudWxsLCBlKTtcbiAgICB0ID0gdC5fbmV4dDtcbiAgfVxuICAtLWZyYW1lO1xufVxuXG5mdW5jdGlvbiB3YWtlKCkge1xuICBjbG9ja05vdyA9IChjbG9ja0xhc3QgPSBjbG9jay5ub3coKSkgKyBjbG9ja1NrZXc7XG4gIGZyYW1lID0gdGltZW91dCA9IDA7XG4gIHRyeSB7XG4gICAgdGltZXJGbHVzaCgpO1xuICB9IGZpbmFsbHkge1xuICAgIGZyYW1lID0gMDtcbiAgICBuYXAoKTtcbiAgICBjbG9ja05vdyA9IDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gcG9rZSgpIHtcbiAgdmFyIG5vdyA9IGNsb2NrLm5vdygpLCBkZWxheSA9IG5vdyAtIGNsb2NrTGFzdDtcbiAgaWYgKGRlbGF5ID4gcG9rZURlbGF5KSBjbG9ja1NrZXcgLT0gZGVsYXksIGNsb2NrTGFzdCA9IG5vdztcbn1cblxuZnVuY3Rpb24gbmFwKCkge1xuICB2YXIgdDAsIHQxID0gdGFza0hlYWQsIHQyLCB0aW1lID0gSW5maW5pdHk7XG4gIHdoaWxlICh0MSkge1xuICAgIGlmICh0MS5fY2FsbCkge1xuICAgICAgaWYgKHRpbWUgPiB0MS5fdGltZSkgdGltZSA9IHQxLl90aW1lO1xuICAgICAgdDAgPSB0MSwgdDEgPSB0MS5fbmV4dDtcbiAgICB9IGVsc2Uge1xuICAgICAgdDIgPSB0MS5fbmV4dCwgdDEuX25leHQgPSBudWxsO1xuICAgICAgdDEgPSB0MCA/IHQwLl9uZXh0ID0gdDIgOiB0YXNrSGVhZCA9IHQyO1xuICAgIH1cbiAgfVxuICB0YXNrVGFpbCA9IHQwO1xuICBzbGVlcCh0aW1lKTtcbn1cblxuZnVuY3Rpb24gc2xlZXAodGltZSkge1xuICBpZiAoZnJhbWUpIHJldHVybjsgLy8gU29vbmVzdCBhbGFybSBhbHJlYWR5IHNldCwgb3Igd2lsbCBiZS5cbiAgaWYgKHRpbWVvdXQpIHRpbWVvdXQgPSBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gIHZhciBkZWxheSA9IHRpbWUgLSBjbG9ja05vdzsgLy8gU3RyaWN0bHkgbGVzcyB0aGFuIGlmIHdlIHJlY29tcHV0ZWQgY2xvY2tOb3cuXG4gIGlmIChkZWxheSA+IDI0KSB7XG4gICAgaWYgKHRpbWUgPCBJbmZpbml0eSkgdGltZW91dCA9IHNldFRpbWVvdXQod2FrZSwgdGltZSAtIGNsb2NrLm5vdygpIC0gY2xvY2tTa2V3KTtcbiAgICBpZiAoaW50ZXJ2YWwpIGludGVydmFsID0gY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKCFpbnRlcnZhbCkgY2xvY2tMYXN0ID0gY2xvY2subm93KCksIGludGVydmFsID0gc2V0SW50ZXJ2YWwocG9rZSwgcG9rZURlbGF5KTtcbiAgICBmcmFtZSA9IDEsIHNldEZyYW1lKHdha2UpO1xuICB9XG59XG4iLCJpbXBvcnQge1RpbWVyfSBmcm9tIFwiLi90aW1lclwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjYWxsYmFjaywgZGVsYXksIHRpbWUpIHtcbiAgdmFyIHQgPSBuZXcgVGltZXI7XG4gIGRlbGF5ID0gZGVsYXkgPT0gbnVsbCA/IDAgOiArZGVsYXk7XG4gIHQucmVzdGFydChmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgdC5zdG9wKCk7XG4gICAgY2FsbGJhY2soZWxhcHNlZCArIGRlbGF5KTtcbiAgfSwgZGVsYXksIHRpbWUpO1xuICByZXR1cm4gdDtcbn1cbiIsImltcG9ydCB7ZGlzcGF0Y2h9IGZyb20gXCJkMy1kaXNwYXRjaFwiO1xuaW1wb3J0IHt0aW1lciwgdGltZW91dH0gZnJvbSBcImQzLXRpbWVyXCI7XG5cbnZhciBlbXB0eU9uID0gZGlzcGF0Y2goXCJzdGFydFwiLCBcImVuZFwiLCBcImludGVycnVwdFwiKTtcbnZhciBlbXB0eVR3ZWVuID0gW107XG5cbmV4cG9ydCB2YXIgQ1JFQVRFRCA9IDA7XG5leHBvcnQgdmFyIFNDSEVEVUxFRCA9IDE7XG5leHBvcnQgdmFyIFNUQVJUSU5HID0gMjtcbmV4cG9ydCB2YXIgU1RBUlRFRCA9IDM7XG5leHBvcnQgdmFyIFJVTk5JTkcgPSA0O1xuZXhwb3J0IHZhciBFTkRJTkcgPSA1O1xuZXhwb3J0IHZhciBFTkRFRCA9IDY7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5vZGUsIG5hbWUsIGlkLCBpbmRleCwgZ3JvdXAsIHRpbWluZykge1xuICB2YXIgc2NoZWR1bGVzID0gbm9kZS5fX3RyYW5zaXRpb247XG4gIGlmICghc2NoZWR1bGVzKSBub2RlLl9fdHJhbnNpdGlvbiA9IHt9O1xuICBlbHNlIGlmIChpZCBpbiBzY2hlZHVsZXMpIHJldHVybjtcbiAgY3JlYXRlKG5vZGUsIGlkLCB7XG4gICAgbmFtZTogbmFtZSxcbiAgICBpbmRleDogaW5kZXgsIC8vIEZvciBjb250ZXh0IGR1cmluZyBjYWxsYmFjay5cbiAgICBncm91cDogZ3JvdXAsIC8vIEZvciBjb250ZXh0IGR1cmluZyBjYWxsYmFjay5cbiAgICBvbjogZW1wdHlPbixcbiAgICB0d2VlbjogZW1wdHlUd2VlbixcbiAgICB0aW1lOiB0aW1pbmcudGltZSxcbiAgICBkZWxheTogdGltaW5nLmRlbGF5LFxuICAgIGR1cmF0aW9uOiB0aW1pbmcuZHVyYXRpb24sXG4gICAgZWFzZTogdGltaW5nLmVhc2UsXG4gICAgdGltZXI6IG51bGwsXG4gICAgc3RhdGU6IENSRUFURURcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KG5vZGUsIGlkKSB7XG4gIHZhciBzY2hlZHVsZSA9IGdldChub2RlLCBpZCk7XG4gIGlmIChzY2hlZHVsZS5zdGF0ZSA+IENSRUFURUQpIHRocm93IG5ldyBFcnJvcihcInRvbyBsYXRlOyBhbHJlYWR5IHNjaGVkdWxlZFwiKTtcbiAgcmV0dXJuIHNjaGVkdWxlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0KG5vZGUsIGlkKSB7XG4gIHZhciBzY2hlZHVsZSA9IGdldChub2RlLCBpZCk7XG4gIGlmIChzY2hlZHVsZS5zdGF0ZSA+IFNUQVJUSU5HKSB0aHJvdyBuZXcgRXJyb3IoXCJ0b28gbGF0ZTsgYWxyZWFkeSBzdGFydGVkXCIpO1xuICByZXR1cm4gc2NoZWR1bGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXQobm9kZSwgaWQpIHtcbiAgdmFyIHNjaGVkdWxlID0gbm9kZS5fX3RyYW5zaXRpb247XG4gIGlmICghc2NoZWR1bGUgfHwgIShzY2hlZHVsZSA9IHNjaGVkdWxlW2lkXSkpIHRocm93IG5ldyBFcnJvcihcInRyYW5zaXRpb24gbm90IGZvdW5kXCIpO1xuICByZXR1cm4gc2NoZWR1bGU7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZShub2RlLCBpZCwgc2VsZikge1xuICB2YXIgc2NoZWR1bGVzID0gbm9kZS5fX3RyYW5zaXRpb24sXG4gICAgICB0d2VlbjtcblxuICAvLyBJbml0aWFsaXplIHRoZSBzZWxmIHRpbWVyIHdoZW4gdGhlIHRyYW5zaXRpb24gaXMgY3JlYXRlZC5cbiAgLy8gTm90ZSB0aGUgYWN0dWFsIGRlbGF5IGlzIG5vdCBrbm93biB1bnRpbCB0aGUgZmlyc3QgY2FsbGJhY2shXG4gIHNjaGVkdWxlc1tpZF0gPSBzZWxmO1xuICBzZWxmLnRpbWVyID0gdGltZXIoc2NoZWR1bGUsIDAsIHNlbGYudGltZSk7XG5cbiAgZnVuY3Rpb24gc2NoZWR1bGUoZWxhcHNlZCkge1xuICAgIHNlbGYuc3RhdGUgPSBTQ0hFRFVMRUQ7XG4gICAgc2VsZi50aW1lci5yZXN0YXJ0KHN0YXJ0LCBzZWxmLmRlbGF5LCBzZWxmLnRpbWUpO1xuXG4gICAgLy8gSWYgdGhlIGVsYXBzZWQgZGVsYXkgaXMgbGVzcyB0aGFuIG91ciBmaXJzdCBzbGVlcCwgc3RhcnQgaW1tZWRpYXRlbHkuXG4gICAgaWYgKHNlbGYuZGVsYXkgPD0gZWxhcHNlZCkgc3RhcnQoZWxhcHNlZCAtIHNlbGYuZGVsYXkpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnQoZWxhcHNlZCkge1xuICAgIHZhciBpLCBqLCBuLCBvO1xuXG4gICAgLy8gSWYgdGhlIHN0YXRlIGlzIG5vdCBTQ0hFRFVMRUQsIHRoZW4gd2UgcHJldmlvdXNseSBlcnJvcmVkIG9uIHN0YXJ0LlxuICAgIGlmIChzZWxmLnN0YXRlICE9PSBTQ0hFRFVMRUQpIHJldHVybiBzdG9wKCk7XG5cbiAgICBmb3IgKGkgaW4gc2NoZWR1bGVzKSB7XG4gICAgICBvID0gc2NoZWR1bGVzW2ldO1xuICAgICAgaWYgKG8ubmFtZSAhPT0gc2VsZi5uYW1lKSBjb250aW51ZTtcblxuICAgICAgLy8gV2hpbGUgdGhpcyBlbGVtZW50IGFscmVhZHkgaGFzIGEgc3RhcnRpbmcgdHJhbnNpdGlvbiBkdXJpbmcgdGhpcyBmcmFtZSxcbiAgICAgIC8vIGRlZmVyIHN0YXJ0aW5nIGFuIGludGVycnVwdGluZyB0cmFuc2l0aW9uIHVudGlsIHRoYXQgdHJhbnNpdGlvbiBoYXMgYVxuICAgICAgLy8gY2hhbmNlIHRvIHRpY2sgKGFuZCBwb3NzaWJseSBlbmQpOyBzZWUgZDMvZDMtdHJhbnNpdGlvbiM1NCFcbiAgICAgIGlmIChvLnN0YXRlID09PSBTVEFSVEVEKSByZXR1cm4gdGltZW91dChzdGFydCk7XG5cbiAgICAgIC8vIEludGVycnVwdCB0aGUgYWN0aXZlIHRyYW5zaXRpb24sIGlmIGFueS5cbiAgICAgIC8vIERpc3BhdGNoIHRoZSBpbnRlcnJ1cHQgZXZlbnQuXG4gICAgICBpZiAoby5zdGF0ZSA9PT0gUlVOTklORykge1xuICAgICAgICBvLnN0YXRlID0gRU5ERUQ7XG4gICAgICAgIG8udGltZXIuc3RvcCgpO1xuICAgICAgICBvLm9uLmNhbGwoXCJpbnRlcnJ1cHRcIiwgbm9kZSwgbm9kZS5fX2RhdGFfXywgby5pbmRleCwgby5ncm91cCk7XG4gICAgICAgIGRlbGV0ZSBzY2hlZHVsZXNbaV07XG4gICAgICB9XG5cbiAgICAgIC8vIENhbmNlbCBhbnkgcHJlLWVtcHRlZCB0cmFuc2l0aW9ucy4gTm8gaW50ZXJydXB0IGV2ZW50IGlzIGRpc3BhdGNoZWRcbiAgICAgIC8vIGJlY2F1c2UgdGhlIGNhbmNlbGxlZCB0cmFuc2l0aW9ucyBuZXZlciBzdGFydGVkLiBOb3RlIHRoYXQgdGhpcyBhbHNvXG4gICAgICAvLyByZW1vdmVzIHRoaXMgdHJhbnNpdGlvbiBmcm9tIHRoZSBwZW5kaW5nIGxpc3QhXG4gICAgICBlbHNlIGlmICgraSA8IGlkKSB7XG4gICAgICAgIG8uc3RhdGUgPSBFTkRFRDtcbiAgICAgICAgby50aW1lci5zdG9wKCk7XG4gICAgICAgIGRlbGV0ZSBzY2hlZHVsZXNbaV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVmZXIgdGhlIGZpcnN0IHRpY2sgdG8gZW5kIG9mIHRoZSBjdXJyZW50IGZyYW1lOyBzZWUgZDMvZDMjMTU3Ni5cbiAgICAvLyBOb3RlIHRoZSB0cmFuc2l0aW9uIG1heSBiZSBjYW5jZWxlZCBhZnRlciBzdGFydCBhbmQgYmVmb3JlIHRoZSBmaXJzdCB0aWNrIVxuICAgIC8vIE5vdGUgdGhpcyBtdXN0IGJlIHNjaGVkdWxlZCBiZWZvcmUgdGhlIHN0YXJ0IGV2ZW50OyBzZWUgZDMvZDMtdHJhbnNpdGlvbiMxNiFcbiAgICAvLyBBc3N1bWluZyB0aGlzIGlzIHN1Y2Nlc3NmdWwsIHN1YnNlcXVlbnQgY2FsbGJhY2tzIGdvIHN0cmFpZ2h0IHRvIHRpY2suXG4gICAgdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGlmIChzZWxmLnN0YXRlID09PSBTVEFSVEVEKSB7XG4gICAgICAgIHNlbGYuc3RhdGUgPSBSVU5OSU5HO1xuICAgICAgICBzZWxmLnRpbWVyLnJlc3RhcnQodGljaywgc2VsZi5kZWxheSwgc2VsZi50aW1lKTtcbiAgICAgICAgdGljayhlbGFwc2VkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIERpc3BhdGNoIHRoZSBzdGFydCBldmVudC5cbiAgICAvLyBOb3RlIHRoaXMgbXVzdCBiZSBkb25lIGJlZm9yZSB0aGUgdHdlZW4gYXJlIGluaXRpYWxpemVkLlxuICAgIHNlbGYuc3RhdGUgPSBTVEFSVElORztcbiAgICBzZWxmLm9uLmNhbGwoXCJzdGFydFwiLCBub2RlLCBub2RlLl9fZGF0YV9fLCBzZWxmLmluZGV4LCBzZWxmLmdyb3VwKTtcbiAgICBpZiAoc2VsZi5zdGF0ZSAhPT0gU1RBUlRJTkcpIHJldHVybjsgLy8gaW50ZXJydXB0ZWRcbiAgICBzZWxmLnN0YXRlID0gU1RBUlRFRDtcblxuICAgIC8vIEluaXRpYWxpemUgdGhlIHR3ZWVuLCBkZWxldGluZyBudWxsIHR3ZWVuLlxuICAgIHR3ZWVuID0gbmV3IEFycmF5KG4gPSBzZWxmLnR3ZWVuLmxlbmd0aCk7XG4gICAgZm9yIChpID0gMCwgaiA9IC0xOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobyA9IHNlbGYudHdlZW5baV0udmFsdWUuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBzZWxmLmluZGV4LCBzZWxmLmdyb3VwKSkge1xuICAgICAgICB0d2VlblsrK2pdID0gbztcbiAgICAgIH1cbiAgICB9XG4gICAgdHdlZW4ubGVuZ3RoID0gaiArIDE7XG4gIH1cblxuICBmdW5jdGlvbiB0aWNrKGVsYXBzZWQpIHtcbiAgICB2YXIgdCA9IGVsYXBzZWQgPCBzZWxmLmR1cmF0aW9uID8gc2VsZi5lYXNlLmNhbGwobnVsbCwgZWxhcHNlZCAvIHNlbGYuZHVyYXRpb24pIDogKHNlbGYudGltZXIucmVzdGFydChzdG9wKSwgc2VsZi5zdGF0ZSA9IEVORElORywgMSksXG4gICAgICAgIGkgPSAtMSxcbiAgICAgICAgbiA9IHR3ZWVuLmxlbmd0aDtcblxuICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICB0d2VlbltpXS5jYWxsKG51bGwsIHQpO1xuICAgIH1cblxuICAgIC8vIERpc3BhdGNoIHRoZSBlbmQgZXZlbnQuXG4gICAgaWYgKHNlbGYuc3RhdGUgPT09IEVORElORykge1xuICAgICAgc2VsZi5vbi5jYWxsKFwiZW5kXCIsIG5vZGUsIG5vZGUuX19kYXRhX18sIHNlbGYuaW5kZXgsIHNlbGYuZ3JvdXApO1xuICAgICAgc3RvcCgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgc2VsZi5zdGF0ZSA9IEVOREVEO1xuICAgIHNlbGYudGltZXIuc3RvcCgpO1xuICAgIGRlbGV0ZSBzY2hlZHVsZXNbaWRdO1xuICAgIGZvciAodmFyIGkgaW4gc2NoZWR1bGVzKSByZXR1cm47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW51c2VkLXZhcnNcbiAgICBkZWxldGUgbm9kZS5fX3RyYW5zaXRpb247XG4gIH1cbn1cbiIsImltcG9ydCB7U1RBUlRJTkcsIEVORElORywgRU5ERUR9IGZyb20gXCIuL3RyYW5zaXRpb24vc2NoZWR1bGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obm9kZSwgbmFtZSkge1xuICB2YXIgc2NoZWR1bGVzID0gbm9kZS5fX3RyYW5zaXRpb24sXG4gICAgICBzY2hlZHVsZSxcbiAgICAgIGFjdGl2ZSxcbiAgICAgIGVtcHR5ID0gdHJ1ZSxcbiAgICAgIGk7XG5cbiAgaWYgKCFzY2hlZHVsZXMpIHJldHVybjtcblxuICBuYW1lID0gbmFtZSA9PSBudWxsID8gbnVsbCA6IG5hbWUgKyBcIlwiO1xuXG4gIGZvciAoaSBpbiBzY2hlZHVsZXMpIHtcbiAgICBpZiAoKHNjaGVkdWxlID0gc2NoZWR1bGVzW2ldKS5uYW1lICE9PSBuYW1lKSB7IGVtcHR5ID0gZmFsc2U7IGNvbnRpbnVlOyB9XG4gICAgYWN0aXZlID0gc2NoZWR1bGUuc3RhdGUgPiBTVEFSVElORyAmJiBzY2hlZHVsZS5zdGF0ZSA8IEVORElORztcbiAgICBzY2hlZHVsZS5zdGF0ZSA9IEVOREVEO1xuICAgIHNjaGVkdWxlLnRpbWVyLnN0b3AoKTtcbiAgICBpZiAoYWN0aXZlKSBzY2hlZHVsZS5vbi5jYWxsKFwiaW50ZXJydXB0XCIsIG5vZGUsIG5vZGUuX19kYXRhX18sIHNjaGVkdWxlLmluZGV4LCBzY2hlZHVsZS5ncm91cCk7XG4gICAgZGVsZXRlIHNjaGVkdWxlc1tpXTtcbiAgfVxuXG4gIGlmIChlbXB0eSkgZGVsZXRlIG5vZGUuX190cmFuc2l0aW9uO1xufVxuIiwiaW1wb3J0IGludGVycnVwdCBmcm9tIFwiLi4vaW50ZXJydXB0XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICBpbnRlcnJ1cHQodGhpcywgbmFtZSk7XG4gIH0pO1xufVxuIiwiaW1wb3J0IHtnZXQsIHNldH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZnVuY3Rpb24gdHdlZW5SZW1vdmUoaWQsIG5hbWUpIHtcbiAgdmFyIHR3ZWVuMCwgdHdlZW4xO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjaGVkdWxlID0gc2V0KHRoaXMsIGlkKSxcbiAgICAgICAgdHdlZW4gPSBzY2hlZHVsZS50d2VlbjtcblxuICAgIC8vIElmIHRoaXMgbm9kZSBzaGFyZWQgdHdlZW4gd2l0aCB0aGUgcHJldmlvdXMgbm9kZSxcbiAgICAvLyBqdXN0IGFzc2lnbiB0aGUgdXBkYXRlZCBzaGFyZWQgdHdlZW4gYW5kIHdl4oCZcmUgZG9uZSFcbiAgICAvLyBPdGhlcndpc2UsIGNvcHktb24td3JpdGUuXG4gICAgaWYgKHR3ZWVuICE9PSB0d2VlbjApIHtcbiAgICAgIHR3ZWVuMSA9IHR3ZWVuMCA9IHR3ZWVuO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0d2VlbjEubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICAgIGlmICh0d2VlbjFbaV0ubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgIHR3ZWVuMSA9IHR3ZWVuMS5zbGljZSgpO1xuICAgICAgICAgIHR3ZWVuMS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBzY2hlZHVsZS50d2VlbiA9IHR3ZWVuMTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdHdlZW5GdW5jdGlvbihpZCwgbmFtZSwgdmFsdWUpIHtcbiAgdmFyIHR3ZWVuMCwgdHdlZW4xO1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcjtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY2hlZHVsZSA9IHNldCh0aGlzLCBpZCksXG4gICAgICAgIHR3ZWVuID0gc2NoZWR1bGUudHdlZW47XG5cbiAgICAvLyBJZiB0aGlzIG5vZGUgc2hhcmVkIHR3ZWVuIHdpdGggdGhlIHByZXZpb3VzIG5vZGUsXG4gICAgLy8ganVzdCBhc3NpZ24gdGhlIHVwZGF0ZWQgc2hhcmVkIHR3ZWVuIGFuZCB3ZeKAmXJlIGRvbmUhXG4gICAgLy8gT3RoZXJ3aXNlLCBjb3B5LW9uLXdyaXRlLlxuICAgIGlmICh0d2VlbiAhPT0gdHdlZW4wKSB7XG4gICAgICB0d2VlbjEgPSAodHdlZW4wID0gdHdlZW4pLnNsaWNlKCk7XG4gICAgICBmb3IgKHZhciB0ID0ge25hbWU6IG5hbWUsIHZhbHVlOiB2YWx1ZX0sIGkgPSAwLCBuID0gdHdlZW4xLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgICBpZiAodHdlZW4xW2ldLm5hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgICB0d2VlbjFbaV0gPSB0O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoaSA9PT0gbikgdHdlZW4xLnB1c2godCk7XG4gICAgfVxuXG4gICAgc2NoZWR1bGUudHdlZW4gPSB0d2VlbjE7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHZhciBpZCA9IHRoaXMuX2lkO1xuXG4gIG5hbWUgKz0gXCJcIjtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICB2YXIgdHdlZW4gPSBnZXQodGhpcy5ub2RlKCksIGlkKS50d2VlbjtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IHR3ZWVuLmxlbmd0aCwgdDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKCh0ID0gdHdlZW5baV0pLm5hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHQudmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbCA/IHR3ZWVuUmVtb3ZlIDogdHdlZW5GdW5jdGlvbikoaWQsIG5hbWUsIHZhbHVlKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2VlblZhbHVlKHRyYW5zaXRpb24sIG5hbWUsIHZhbHVlKSB7XG4gIHZhciBpZCA9IHRyYW5zaXRpb24uX2lkO1xuXG4gIHRyYW5zaXRpb24uZWFjaChmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NoZWR1bGUgPSBzZXQodGhpcywgaWQpO1xuICAgIChzY2hlZHVsZS52YWx1ZSB8fCAoc2NoZWR1bGUudmFsdWUgPSB7fSkpW25hbWVdID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICByZXR1cm4gZ2V0KG5vZGUsIGlkKS52YWx1ZVtuYW1lXTtcbiAgfTtcbn1cbiIsImltcG9ydCB7Y29sb3J9IGZyb20gXCJkMy1jb2xvclwiO1xuaW1wb3J0IHtpbnRlcnBvbGF0ZU51bWJlciwgaW50ZXJwb2xhdGVSZ2IsIGludGVycG9sYXRlU3RyaW5nfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICB2YXIgYztcbiAgcmV0dXJuICh0eXBlb2YgYiA9PT0gXCJudW1iZXJcIiA/IGludGVycG9sYXRlTnVtYmVyXG4gICAgICA6IGIgaW5zdGFuY2VvZiBjb2xvciA/IGludGVycG9sYXRlUmdiXG4gICAgICA6IChjID0gY29sb3IoYikpID8gKGIgPSBjLCBpbnRlcnBvbGF0ZVJnYilcbiAgICAgIDogaW50ZXJwb2xhdGVTdHJpbmcpKGEsIGIpO1xufVxuIiwiaW1wb3J0IHtpbnRlcnBvbGF0ZVRyYW5zZm9ybVN2ZyBhcyBpbnRlcnBvbGF0ZVRyYW5zZm9ybX0gZnJvbSBcImQzLWludGVycG9sYXRlXCI7XG5pbXBvcnQge25hbWVzcGFjZX0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHt0d2VlblZhbHVlfSBmcm9tIFwiLi90d2VlblwiO1xuaW1wb3J0IGludGVycG9sYXRlIGZyb20gXCIuL2ludGVycG9sYXRlXCI7XG5cbmZ1bmN0aW9uIGF0dHJSZW1vdmUobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJSZW1vdmVOUyhmdWxsbmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyQ29uc3RhbnQobmFtZSwgaW50ZXJwb2xhdGUsIHZhbHVlMSkge1xuICB2YXIgdmFsdWUwMCxcbiAgICAgIGludGVycG9sYXRlMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZTAgPSB0aGlzLmdldEF0dHJpYnV0ZShuYW1lKTtcbiAgICByZXR1cm4gdmFsdWUwID09PSB2YWx1ZTEgPyBudWxsXG4gICAgICAgIDogdmFsdWUwID09PSB2YWx1ZTAwID8gaW50ZXJwb2xhdGUwXG4gICAgICAgIDogaW50ZXJwb2xhdGUwID0gaW50ZXJwb2xhdGUodmFsdWUwMCA9IHZhbHVlMCwgdmFsdWUxKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckNvbnN0YW50TlMoZnVsbG5hbWUsIGludGVycG9sYXRlLCB2YWx1ZTEpIHtcbiAgdmFyIHZhbHVlMDAsXG4gICAgICBpbnRlcnBvbGF0ZTA7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUwID0gdGhpcy5nZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICAgIHJldHVybiB2YWx1ZTAgPT09IHZhbHVlMSA/IG51bGxcbiAgICAgICAgOiB2YWx1ZTAgPT09IHZhbHVlMDAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyRnVuY3Rpb24obmFtZSwgaW50ZXJwb2xhdGUsIHZhbHVlKSB7XG4gIHZhciB2YWx1ZTAwLFxuICAgICAgdmFsdWUxMCxcbiAgICAgIGludGVycG9sYXRlMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZTAsIHZhbHVlMSA9IHZhbHVlKHRoaXMpO1xuICAgIGlmICh2YWx1ZTEgPT0gbnVsbCkgcmV0dXJuIHZvaWQgdGhpcy5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgdmFsdWUwID0gdGhpcy5nZXRBdHRyaWJ1dGUobmFtZSk7XG4gICAgcmV0dXJuIHZhbHVlMCA9PT0gdmFsdWUxID8gbnVsbFxuICAgICAgICA6IHZhbHVlMCA9PT0gdmFsdWUwMCAmJiB2YWx1ZTEgPT09IHZhbHVlMTAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEwID0gdmFsdWUxKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckZ1bmN0aW9uTlMoZnVsbG5hbWUsIGludGVycG9sYXRlLCB2YWx1ZSkge1xuICB2YXIgdmFsdWUwMCxcbiAgICAgIHZhbHVlMTAsXG4gICAgICBpbnRlcnBvbGF0ZTA7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUwLCB2YWx1ZTEgPSB2YWx1ZSh0aGlzKTtcbiAgICBpZiAodmFsdWUxID09IG51bGwpIHJldHVybiB2b2lkIHRoaXMucmVtb3ZlQXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgICB2YWx1ZTAgPSB0aGlzLmdldEF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gICAgcmV0dXJuIHZhbHVlMCA9PT0gdmFsdWUxID8gbnVsbFxuICAgICAgICA6IHZhbHVlMCA9PT0gdmFsdWUwMCAmJiB2YWx1ZTEgPT09IHZhbHVlMTAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEwID0gdmFsdWUxKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpLCBpID0gZnVsbG5hbWUgPT09IFwidHJhbnNmb3JtXCIgPyBpbnRlcnBvbGF0ZVRyYW5zZm9ybSA6IGludGVycG9sYXRlO1xuICByZXR1cm4gdGhpcy5hdHRyVHdlZW4obmFtZSwgdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gKGZ1bGxuYW1lLmxvY2FsID8gYXR0ckZ1bmN0aW9uTlMgOiBhdHRyRnVuY3Rpb24pKGZ1bGxuYW1lLCBpLCB0d2VlblZhbHVlKHRoaXMsIFwiYXR0ci5cIiArIG5hbWUsIHZhbHVlKSlcbiAgICAgIDogdmFsdWUgPT0gbnVsbCA/IChmdWxsbmFtZS5sb2NhbCA/IGF0dHJSZW1vdmVOUyA6IGF0dHJSZW1vdmUpKGZ1bGxuYW1lKVxuICAgICAgOiAoZnVsbG5hbWUubG9jYWwgPyBhdHRyQ29uc3RhbnROUyA6IGF0dHJDb25zdGFudCkoZnVsbG5hbWUsIGksIHZhbHVlICsgXCJcIikpO1xufVxuIiwiaW1wb3J0IHtuYW1lc3BhY2V9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcblxuZnVuY3Rpb24gYXR0clR3ZWVuTlMoZnVsbG5hbWUsIHZhbHVlKSB7XG4gIGZ1bmN0aW9uIHR3ZWVuKCkge1xuICAgIHZhciBub2RlID0gdGhpcywgaSA9IHZhbHVlLmFwcGx5KG5vZGUsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIGkgJiYgZnVuY3Rpb24odCkge1xuICAgICAgbm9kZS5zZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwsIGkodCkpO1xuICAgIH07XG4gIH1cbiAgdHdlZW4uX3ZhbHVlID0gdmFsdWU7XG4gIHJldHVybiB0d2Vlbjtcbn1cblxuZnVuY3Rpb24gYXR0clR3ZWVuKG5hbWUsIHZhbHVlKSB7XG4gIGZ1bmN0aW9uIHR3ZWVuKCkge1xuICAgIHZhciBub2RlID0gdGhpcywgaSA9IHZhbHVlLmFwcGx5KG5vZGUsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIGkgJiYgZnVuY3Rpb24odCkge1xuICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgaSh0KSk7XG4gICAgfTtcbiAgfVxuICB0d2Vlbi5fdmFsdWUgPSB2YWx1ZTtcbiAgcmV0dXJuIHR3ZWVuO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB2YXIga2V5ID0gXCJhdHRyLlwiICsgbmFtZTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSByZXR1cm4gKGtleSA9IHRoaXMudHdlZW4oa2V5KSkgJiYga2V5Ll92YWx1ZTtcbiAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiB0aGlzLnR3ZWVuKGtleSwgbnVsbCk7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IEVycm9yO1xuICB2YXIgZnVsbG5hbWUgPSBuYW1lc3BhY2UobmFtZSk7XG4gIHJldHVybiB0aGlzLnR3ZWVuKGtleSwgKGZ1bGxuYW1lLmxvY2FsID8gYXR0clR3ZWVuTlMgOiBhdHRyVHdlZW4pKGZ1bGxuYW1lLCB2YWx1ZSkpO1xufVxuIiwiaW1wb3J0IHtnZXQsIGluaXR9IGZyb20gXCIuL3NjaGVkdWxlXCI7XG5cbmZ1bmN0aW9uIGRlbGF5RnVuY3Rpb24oaWQsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBpbml0KHRoaXMsIGlkKS5kZWxheSA9ICt2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBkZWxheUNvbnN0YW50KGlkLCB2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPSArdmFsdWUsIGZ1bmN0aW9uKCkge1xuICAgIGluaXQodGhpcywgaWQpLmRlbGF5ID0gdmFsdWU7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBpZCA9IHRoaXMuX2lkO1xuXG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCgodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IGRlbGF5RnVuY3Rpb25cbiAgICAgICAgICA6IGRlbGF5Q29uc3RhbnQpKGlkLCB2YWx1ZSkpXG4gICAgICA6IGdldCh0aGlzLm5vZGUoKSwgaWQpLmRlbGF5O1xufVxuIiwiaW1wb3J0IHtnZXQsIHNldH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZnVuY3Rpb24gZHVyYXRpb25GdW5jdGlvbihpZCwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHNldCh0aGlzLCBpZCkuZHVyYXRpb24gPSArdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZHVyYXRpb25Db25zdGFudChpZCwgdmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID0gK3ZhbHVlLCBmdW5jdGlvbigpIHtcbiAgICBzZXQodGhpcywgaWQpLmR1cmF0aW9uID0gdmFsdWU7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBpZCA9IHRoaXMuX2lkO1xuXG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCgodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IGR1cmF0aW9uRnVuY3Rpb25cbiAgICAgICAgICA6IGR1cmF0aW9uQ29uc3RhbnQpKGlkLCB2YWx1ZSkpXG4gICAgICA6IGdldCh0aGlzLm5vZGUoKSwgaWQpLmR1cmF0aW9uO1xufVxuIiwiaW1wb3J0IHtnZXQsIHNldH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZnVuY3Rpb24gZWFzZUNvbnN0YW50KGlkLCB2YWx1ZSkge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcjtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHNldCh0aGlzLCBpZCkuZWFzZSA9IHZhbHVlO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICB2YXIgaWQgPSB0aGlzLl9pZDtcblxuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLmVhY2goZWFzZUNvbnN0YW50KGlkLCB2YWx1ZSkpXG4gICAgICA6IGdldCh0aGlzLm5vZGUoKSwgaWQpLmVhc2U7XG59XG4iLCJpbXBvcnQge21hdGNoZXJ9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7VHJhbnNpdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obWF0Y2gpIHtcbiAgaWYgKHR5cGVvZiBtYXRjaCAhPT0gXCJmdW5jdGlvblwiKSBtYXRjaCA9IG1hdGNoZXIobWF0Y2gpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc3ViZ3JvdXAgPSBzdWJncm91cHNbal0gPSBbXSwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmICgobm9kZSA9IGdyb3VwW2ldKSAmJiBtYXRjaC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSkge1xuICAgICAgICBzdWJncm91cC5wdXNoKG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgVHJhbnNpdGlvbihzdWJncm91cHMsIHRoaXMuX3BhcmVudHMsIHRoaXMuX25hbWUsIHRoaXMuX2lkKTtcbn1cbiIsImltcG9ydCB7VHJhbnNpdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odHJhbnNpdGlvbikge1xuICBpZiAodHJhbnNpdGlvbi5faWQgIT09IHRoaXMuX2lkKSB0aHJvdyBuZXcgRXJyb3I7XG5cbiAgZm9yICh2YXIgZ3JvdXBzMCA9IHRoaXMuX2dyb3VwcywgZ3JvdXBzMSA9IHRyYW5zaXRpb24uX2dyb3VwcywgbTAgPSBncm91cHMwLmxlbmd0aCwgbTEgPSBncm91cHMxLmxlbmd0aCwgbSA9IE1hdGgubWluKG0wLCBtMSksIG1lcmdlcyA9IG5ldyBBcnJheShtMCksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAwID0gZ3JvdXBzMFtqXSwgZ3JvdXAxID0gZ3JvdXBzMVtqXSwgbiA9IGdyb3VwMC5sZW5ndGgsIG1lcmdlID0gbWVyZ2VzW2pdID0gbmV3IEFycmF5KG4pLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cDBbaV0gfHwgZ3JvdXAxW2ldKSB7XG4gICAgICAgIG1lcmdlW2ldID0gbm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKDsgaiA8IG0wOyArK2opIHtcbiAgICBtZXJnZXNbal0gPSBncm91cHMwW2pdO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBUcmFuc2l0aW9uKG1lcmdlcywgdGhpcy5fcGFyZW50cywgdGhpcy5fbmFtZSwgdGhpcy5faWQpO1xufVxuIiwiaW1wb3J0IHtnZXQsIHNldCwgaW5pdH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZnVuY3Rpb24gc3RhcnQobmFtZSkge1xuICByZXR1cm4gKG5hbWUgKyBcIlwiKS50cmltKCkuc3BsaXQoL158XFxzKy8pLmV2ZXJ5KGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgaSA9IHQuaW5kZXhPZihcIi5cIik7XG4gICAgaWYgKGkgPj0gMCkgdCA9IHQuc2xpY2UoMCwgaSk7XG4gICAgcmV0dXJuICF0IHx8IHQgPT09IFwic3RhcnRcIjtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG9uRnVuY3Rpb24oaWQsIG5hbWUsIGxpc3RlbmVyKSB7XG4gIHZhciBvbjAsIG9uMSwgc2l0ID0gc3RhcnQobmFtZSkgPyBpbml0IDogc2V0O1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjaGVkdWxlID0gc2l0KHRoaXMsIGlkKSxcbiAgICAgICAgb24gPSBzY2hlZHVsZS5vbjtcblxuICAgIC8vIElmIHRoaXMgbm9kZSBzaGFyZWQgYSBkaXNwYXRjaCB3aXRoIHRoZSBwcmV2aW91cyBub2RlLFxuICAgIC8vIGp1c3QgYXNzaWduIHRoZSB1cGRhdGVkIHNoYXJlZCBkaXNwYXRjaCBhbmQgd2XigJlyZSBkb25lIVxuICAgIC8vIE90aGVyd2lzZSwgY29weS1vbi13cml0ZS5cbiAgICBpZiAob24gIT09IG9uMCkgKG9uMSA9IChvbjAgPSBvbikuY29weSgpKS5vbihuYW1lLCBsaXN0ZW5lcik7XG5cbiAgICBzY2hlZHVsZS5vbiA9IG9uMTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGlkID0gdGhpcy5faWQ7XG5cbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPCAyXG4gICAgICA/IGdldCh0aGlzLm5vZGUoKSwgaWQpLm9uLm9uKG5hbWUpXG4gICAgICA6IHRoaXMuZWFjaChvbkZ1bmN0aW9uKGlkLCBuYW1lLCBsaXN0ZW5lcikpO1xufVxuIiwiZnVuY3Rpb24gcmVtb3ZlRnVuY3Rpb24oaWQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudE5vZGU7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLl9fdHJhbnNpdGlvbikgaWYgKCtpICE9PSBpZCkgcmV0dXJuO1xuICAgIGlmIChwYXJlbnQpIHBhcmVudC5yZW1vdmVDaGlsZCh0aGlzKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm9uKFwiZW5kLnJlbW92ZVwiLCByZW1vdmVGdW5jdGlvbih0aGlzLl9pZCkpO1xufVxuIiwiaW1wb3J0IHtzZWxlY3Rvcn0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHtUcmFuc2l0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHNjaGVkdWxlLCB7Z2V0fSBmcm9tIFwiLi9zY2hlZHVsZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3QpIHtcbiAgdmFyIG5hbWUgPSB0aGlzLl9uYW1lLFxuICAgICAgaWQgPSB0aGlzLl9pZDtcblxuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvcihzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc3ViZ3JvdXAgPSBzdWJncm91cHNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIHN1Ym5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgKHN1Ym5vZGUgPSBzZWxlY3QuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpKSB7XG4gICAgICAgIGlmIChcIl9fZGF0YV9fXCIgaW4gbm9kZSkgc3Vibm9kZS5fX2RhdGFfXyA9IG5vZGUuX19kYXRhX187XG4gICAgICAgIHN1Ymdyb3VwW2ldID0gc3Vibm9kZTtcbiAgICAgICAgc2NoZWR1bGUoc3ViZ3JvdXBbaV0sIG5hbWUsIGlkLCBpLCBzdWJncm91cCwgZ2V0KG5vZGUsIGlkKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBUcmFuc2l0aW9uKHN1Ymdyb3VwcywgdGhpcy5fcGFyZW50cywgbmFtZSwgaWQpO1xufVxuIiwiaW1wb3J0IHtzZWxlY3RvckFsbH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHtUcmFuc2l0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHNjaGVkdWxlLCB7Z2V0fSBmcm9tIFwiLi9zY2hlZHVsZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3QpIHtcbiAgdmFyIG5hbWUgPSB0aGlzLl9uYW1lLFxuICAgICAgaWQgPSB0aGlzLl9pZDtcblxuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvckFsbChzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IFtdLCBwYXJlbnRzID0gW10sIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIGZvciAodmFyIGNoaWxkcmVuID0gc2VsZWN0LmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApLCBjaGlsZCwgaW5oZXJpdCA9IGdldChub2RlLCBpZCksIGsgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBrIDwgbDsgKytrKSB7XG4gICAgICAgICAgaWYgKGNoaWxkID0gY2hpbGRyZW5ba10pIHtcbiAgICAgICAgICAgIHNjaGVkdWxlKGNoaWxkLCBuYW1lLCBpZCwgaywgY2hpbGRyZW4sIGluaGVyaXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdWJncm91cHMucHVzaChjaGlsZHJlbik7XG4gICAgICAgIHBhcmVudHMucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFRyYW5zaXRpb24oc3ViZ3JvdXBzLCBwYXJlbnRzLCBuYW1lLCBpZCk7XG59XG4iLCJpbXBvcnQge3NlbGVjdGlvbn0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuXG52YXIgU2VsZWN0aW9uID0gc2VsZWN0aW9uLnByb3RvdHlwZS5jb25zdHJ1Y3RvcjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHRoaXMuX2dyb3VwcywgdGhpcy5fcGFyZW50cyk7XG59XG4iLCJpbXBvcnQge2ludGVycG9sYXRlVHJhbnNmb3JtQ3NzIGFzIGludGVycG9sYXRlVHJhbnNmb3JtfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcbmltcG9ydCB7c3R5bGV9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7dHdlZW5WYWx1ZX0gZnJvbSBcIi4vdHdlZW5cIjtcbmltcG9ydCBpbnRlcnBvbGF0ZSBmcm9tIFwiLi9pbnRlcnBvbGF0ZVwiO1xuXG5mdW5jdGlvbiBzdHlsZVJlbW92ZShuYW1lLCBpbnRlcnBvbGF0ZSkge1xuICB2YXIgdmFsdWUwMCxcbiAgICAgIHZhbHVlMTAsXG4gICAgICBpbnRlcnBvbGF0ZTA7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUwID0gc3R5bGUodGhpcywgbmFtZSksXG4gICAgICAgIHZhbHVlMSA9ICh0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpLCBzdHlsZSh0aGlzLCBuYW1lKSk7XG4gICAgcmV0dXJuIHZhbHVlMCA9PT0gdmFsdWUxID8gbnVsbFxuICAgICAgICA6IHZhbHVlMCA9PT0gdmFsdWUwMCAmJiB2YWx1ZTEgPT09IHZhbHVlMTAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEwID0gdmFsdWUxKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVSZW1vdmVFbmQobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVDb25zdGFudChuYW1lLCBpbnRlcnBvbGF0ZSwgdmFsdWUxKSB7XG4gIHZhciB2YWx1ZTAwLFxuICAgICAgaW50ZXJwb2xhdGUwO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlMCA9IHN0eWxlKHRoaXMsIG5hbWUpO1xuICAgIHJldHVybiB2YWx1ZTAgPT09IHZhbHVlMSA/IG51bGxcbiAgICAgICAgOiB2YWx1ZTAgPT09IHZhbHVlMDAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzdHlsZUZ1bmN0aW9uKG5hbWUsIGludGVycG9sYXRlLCB2YWx1ZSkge1xuICB2YXIgdmFsdWUwMCxcbiAgICAgIHZhbHVlMTAsXG4gICAgICBpbnRlcnBvbGF0ZTA7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUwID0gc3R5bGUodGhpcywgbmFtZSksXG4gICAgICAgIHZhbHVlMSA9IHZhbHVlKHRoaXMpO1xuICAgIGlmICh2YWx1ZTEgPT0gbnVsbCkgdmFsdWUxID0gKHRoaXMuc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSksIHN0eWxlKHRoaXMsIG5hbWUpKTtcbiAgICByZXR1cm4gdmFsdWUwID09PSB2YWx1ZTEgPyBudWxsXG4gICAgICAgIDogdmFsdWUwID09PSB2YWx1ZTAwICYmIHZhbHVlMSA9PT0gdmFsdWUxMCA/IGludGVycG9sYXRlMFxuICAgICAgICA6IGludGVycG9sYXRlMCA9IGludGVycG9sYXRlKHZhbHVlMDAgPSB2YWx1ZTAsIHZhbHVlMTAgPSB2YWx1ZTEpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgdmFyIGkgPSAobmFtZSArPSBcIlwiKSA9PT0gXCJ0cmFuc2Zvcm1cIiA/IGludGVycG9sYXRlVHJhbnNmb3JtIDogaW50ZXJwb2xhdGU7XG4gIHJldHVybiB2YWx1ZSA9PSBudWxsID8gdGhpc1xuICAgICAgICAgIC5zdHlsZVR3ZWVuKG5hbWUsIHN0eWxlUmVtb3ZlKG5hbWUsIGkpKVxuICAgICAgICAgIC5vbihcImVuZC5zdHlsZS5cIiArIG5hbWUsIHN0eWxlUmVtb3ZlRW5kKG5hbWUpKVxuICAgICAgOiB0aGlzLnN0eWxlVHdlZW4obmFtZSwgdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IHN0eWxlRnVuY3Rpb24obmFtZSwgaSwgdHdlZW5WYWx1ZSh0aGlzLCBcInN0eWxlLlwiICsgbmFtZSwgdmFsdWUpKVxuICAgICAgICAgIDogc3R5bGVDb25zdGFudChuYW1lLCBpLCB2YWx1ZSArIFwiXCIpLCBwcmlvcml0eSk7XG59XG4iLCJmdW5jdGlvbiBzdHlsZVR3ZWVuKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICBmdW5jdGlvbiB0d2VlbigpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMsIGkgPSB2YWx1ZS5hcHBseShub2RlLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiBpICYmIGZ1bmN0aW9uKHQpIHtcbiAgICAgIG5vZGUuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgaSh0KSwgcHJpb3JpdHkpO1xuICAgIH07XG4gIH1cbiAgdHdlZW4uX3ZhbHVlID0gdmFsdWU7XG4gIHJldHVybiB0d2Vlbjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIHZhciBrZXkgPSBcInN0eWxlLlwiICsgKG5hbWUgKz0gXCJcIik7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikgcmV0dXJuIChrZXkgPSB0aGlzLnR3ZWVuKGtleSkpICYmIGtleS5fdmFsdWU7XG4gIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gdGhpcy50d2VlbihrZXksIG51bGwpO1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcjtcbiAgcmV0dXJuIHRoaXMudHdlZW4oa2V5LCBzdHlsZVR3ZWVuKG5hbWUsIHZhbHVlLCBwcmlvcml0eSA9PSBudWxsID8gXCJcIiA6IHByaW9yaXR5KSk7XG59XG4iLCJpbXBvcnQge3R3ZWVuVmFsdWV9IGZyb20gXCIuL3R3ZWVuXCI7XG5cbmZ1bmN0aW9uIHRleHRDb25zdGFudCh2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50ZXh0Q29udGVudCA9IHZhbHVlO1xuICB9O1xufVxuXG5mdW5jdGlvbiB0ZXh0RnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZTEgPSB2YWx1ZSh0aGlzKTtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gdmFsdWUxID09IG51bGwgPyBcIlwiIDogdmFsdWUxO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdGhpcy50d2VlbihcInRleHRcIiwgdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gdGV4dEZ1bmN0aW9uKHR3ZWVuVmFsdWUodGhpcywgXCJ0ZXh0XCIsIHZhbHVlKSlcbiAgICAgIDogdGV4dENvbnN0YW50KHZhbHVlID09IG51bGwgPyBcIlwiIDogdmFsdWUgKyBcIlwiKSk7XG59XG4iLCJpbXBvcnQge1RyYW5zaXRpb24sIG5ld0lkfSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHNjaGVkdWxlLCB7Z2V0fSBmcm9tIFwiLi9zY2hlZHVsZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgdmFyIG5hbWUgPSB0aGlzLl9uYW1lLFxuICAgICAgaWQwID0gdGhpcy5faWQsXG4gICAgICBpZDEgPSBuZXdJZCgpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHZhciBpbmhlcml0ID0gZ2V0KG5vZGUsIGlkMCk7XG4gICAgICAgIHNjaGVkdWxlKG5vZGUsIG5hbWUsIGlkMSwgaSwgZ3JvdXAsIHtcbiAgICAgICAgICB0aW1lOiBpbmhlcml0LnRpbWUgKyBpbmhlcml0LmRlbGF5ICsgaW5oZXJpdC5kdXJhdGlvbixcbiAgICAgICAgICBkZWxheTogMCxcbiAgICAgICAgICBkdXJhdGlvbjogaW5oZXJpdC5kdXJhdGlvbixcbiAgICAgICAgICBlYXNlOiBpbmhlcml0LmVhc2VcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBUcmFuc2l0aW9uKGdyb3VwcywgdGhpcy5fcGFyZW50cywgbmFtZSwgaWQxKTtcbn1cbiIsImltcG9ydCB7c2VsZWN0aW9ufSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9hdHRyIGZyb20gXCIuL2F0dHJcIjtcbmltcG9ydCB0cmFuc2l0aW9uX2F0dHJUd2VlbiBmcm9tIFwiLi9hdHRyVHdlZW5cIjtcbmltcG9ydCB0cmFuc2l0aW9uX2RlbGF5IGZyb20gXCIuL2RlbGF5XCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9kdXJhdGlvbiBmcm9tIFwiLi9kdXJhdGlvblwiO1xuaW1wb3J0IHRyYW5zaXRpb25fZWFzZSBmcm9tIFwiLi9lYXNlXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9maWx0ZXIgZnJvbSBcIi4vZmlsdGVyXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9tZXJnZSBmcm9tIFwiLi9tZXJnZVwiO1xuaW1wb3J0IHRyYW5zaXRpb25fb24gZnJvbSBcIi4vb25cIjtcbmltcG9ydCB0cmFuc2l0aW9uX3JlbW92ZSBmcm9tIFwiLi9yZW1vdmVcIjtcbmltcG9ydCB0cmFuc2l0aW9uX3NlbGVjdCBmcm9tIFwiLi9zZWxlY3RcIjtcbmltcG9ydCB0cmFuc2l0aW9uX3NlbGVjdEFsbCBmcm9tIFwiLi9zZWxlY3RBbGxcIjtcbmltcG9ydCB0cmFuc2l0aW9uX3NlbGVjdGlvbiBmcm9tIFwiLi9zZWxlY3Rpb25cIjtcbmltcG9ydCB0cmFuc2l0aW9uX3N0eWxlIGZyb20gXCIuL3N0eWxlXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9zdHlsZVR3ZWVuIGZyb20gXCIuL3N0eWxlVHdlZW5cIjtcbmltcG9ydCB0cmFuc2l0aW9uX3RleHQgZnJvbSBcIi4vdGV4dFwiO1xuaW1wb3J0IHRyYW5zaXRpb25fdHJhbnNpdGlvbiBmcm9tIFwiLi90cmFuc2l0aW9uXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl90d2VlbiBmcm9tIFwiLi90d2VlblwiO1xuXG52YXIgaWQgPSAwO1xuXG5leHBvcnQgZnVuY3Rpb24gVHJhbnNpdGlvbihncm91cHMsIHBhcmVudHMsIG5hbWUsIGlkKSB7XG4gIHRoaXMuX2dyb3VwcyA9IGdyb3VwcztcbiAgdGhpcy5fcGFyZW50cyA9IHBhcmVudHM7XG4gIHRoaXMuX25hbWUgPSBuYW1lO1xuICB0aGlzLl9pZCA9IGlkO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0cmFuc2l0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIHNlbGVjdGlvbigpLnRyYW5zaXRpb24obmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBuZXdJZCgpIHtcbiAgcmV0dXJuICsraWQ7XG59XG5cbnZhciBzZWxlY3Rpb25fcHJvdG90eXBlID0gc2VsZWN0aW9uLnByb3RvdHlwZTtcblxuVHJhbnNpdGlvbi5wcm90b3R5cGUgPSB0cmFuc2l0aW9uLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IFRyYW5zaXRpb24sXG4gIHNlbGVjdDogdHJhbnNpdGlvbl9zZWxlY3QsXG4gIHNlbGVjdEFsbDogdHJhbnNpdGlvbl9zZWxlY3RBbGwsXG4gIGZpbHRlcjogdHJhbnNpdGlvbl9maWx0ZXIsXG4gIG1lcmdlOiB0cmFuc2l0aW9uX21lcmdlLFxuICBzZWxlY3Rpb246IHRyYW5zaXRpb25fc2VsZWN0aW9uLFxuICB0cmFuc2l0aW9uOiB0cmFuc2l0aW9uX3RyYW5zaXRpb24sXG4gIGNhbGw6IHNlbGVjdGlvbl9wcm90b3R5cGUuY2FsbCxcbiAgbm9kZXM6IHNlbGVjdGlvbl9wcm90b3R5cGUubm9kZXMsXG4gIG5vZGU6IHNlbGVjdGlvbl9wcm90b3R5cGUubm9kZSxcbiAgc2l6ZTogc2VsZWN0aW9uX3Byb3RvdHlwZS5zaXplLFxuICBlbXB0eTogc2VsZWN0aW9uX3Byb3RvdHlwZS5lbXB0eSxcbiAgZWFjaDogc2VsZWN0aW9uX3Byb3RvdHlwZS5lYWNoLFxuICBvbjogdHJhbnNpdGlvbl9vbixcbiAgYXR0cjogdHJhbnNpdGlvbl9hdHRyLFxuICBhdHRyVHdlZW46IHRyYW5zaXRpb25fYXR0clR3ZWVuLFxuICBzdHlsZTogdHJhbnNpdGlvbl9zdHlsZSxcbiAgc3R5bGVUd2VlbjogdHJhbnNpdGlvbl9zdHlsZVR3ZWVuLFxuICB0ZXh0OiB0cmFuc2l0aW9uX3RleHQsXG4gIHJlbW92ZTogdHJhbnNpdGlvbl9yZW1vdmUsXG4gIHR3ZWVuOiB0cmFuc2l0aW9uX3R3ZWVuLFxuICBkZWxheTogdHJhbnNpdGlvbl9kZWxheSxcbiAgZHVyYXRpb246IHRyYW5zaXRpb25fZHVyYXRpb24sXG4gIGVhc2U6IHRyYW5zaXRpb25fZWFzZVxufTtcbiIsImV4cG9ydCBmdW5jdGlvbiBjdWJpY0luKHQpIHtcbiAgcmV0dXJuIHQgKiB0ICogdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGN1YmljT3V0KHQpIHtcbiAgcmV0dXJuIC0tdCAqIHQgKiB0ICsgMTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGN1YmljSW5PdXQodCkge1xuICByZXR1cm4gKCh0ICo9IDIpIDw9IDEgPyB0ICogdCAqIHQgOiAodCAtPSAyKSAqIHQgKiB0ICsgMikgLyAyO1xufVxuIiwiaW1wb3J0IHtUcmFuc2l0aW9uLCBuZXdJZH0gZnJvbSBcIi4uL3RyYW5zaXRpb24vaW5kZXhcIjtcbmltcG9ydCBzY2hlZHVsZSBmcm9tIFwiLi4vdHJhbnNpdGlvbi9zY2hlZHVsZVwiO1xuaW1wb3J0IHtlYXNlQ3ViaWNJbk91dH0gZnJvbSBcImQzLWVhc2VcIjtcbmltcG9ydCB7bm93fSBmcm9tIFwiZDMtdGltZXJcIjtcblxudmFyIGRlZmF1bHRUaW1pbmcgPSB7XG4gIHRpbWU6IG51bGwsIC8vIFNldCBvbiB1c2UuXG4gIGRlbGF5OiAwLFxuICBkdXJhdGlvbjogMjUwLFxuICBlYXNlOiBlYXNlQ3ViaWNJbk91dFxufTtcblxuZnVuY3Rpb24gaW5oZXJpdChub2RlLCBpZCkge1xuICB2YXIgdGltaW5nO1xuICB3aGlsZSAoISh0aW1pbmcgPSBub2RlLl9fdHJhbnNpdGlvbikgfHwgISh0aW1pbmcgPSB0aW1pbmdbaWRdKSkge1xuICAgIGlmICghKG5vZGUgPSBub2RlLnBhcmVudE5vZGUpKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdFRpbWluZy50aW1lID0gbm93KCksIGRlZmF1bHRUaW1pbmc7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aW1pbmc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGlkLFxuICAgICAgdGltaW5nO1xuXG4gIGlmIChuYW1lIGluc3RhbmNlb2YgVHJhbnNpdGlvbikge1xuICAgIGlkID0gbmFtZS5faWQsIG5hbWUgPSBuYW1lLl9uYW1lO1xuICB9IGVsc2Uge1xuICAgIGlkID0gbmV3SWQoKSwgKHRpbWluZyA9IGRlZmF1bHRUaW1pbmcpLnRpbWUgPSBub3coKSwgbmFtZSA9IG5hbWUgPT0gbnVsbCA/IG51bGwgOiBuYW1lICsgXCJcIjtcbiAgfVxuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHNjaGVkdWxlKG5vZGUsIG5hbWUsIGlkLCBpLCBncm91cCwgdGltaW5nIHx8IGluaGVyaXQobm9kZSwgaWQpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFRyYW5zaXRpb24oZ3JvdXBzLCB0aGlzLl9wYXJlbnRzLCBuYW1lLCBpZCk7XG59XG4iLCJpbXBvcnQge3NlbGVjdGlvbn0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHNlbGVjdGlvbl9pbnRlcnJ1cHQgZnJvbSBcIi4vaW50ZXJydXB0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX3RyYW5zaXRpb24gZnJvbSBcIi4vdHJhbnNpdGlvblwiO1xuXG5zZWxlY3Rpb24ucHJvdG90eXBlLmludGVycnVwdCA9IHNlbGVjdGlvbl9pbnRlcnJ1cHQ7XG5zZWxlY3Rpb24ucHJvdG90eXBlLnRyYW5zaXRpb24gPSBzZWxlY3Rpb25fdHJhbnNpdGlvbjtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB4O1xuICB9O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odGFyZ2V0LCB0eXBlLCBzZWxlY3Rpb24pIHtcbiAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMudHlwZSA9IHR5cGU7XG4gIHRoaXMuc2VsZWN0aW9uID0gc2VsZWN0aW9uO1xufVxuIiwiaW1wb3J0IHtldmVudH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuXG5leHBvcnQgZnVuY3Rpb24gbm9wcm9wYWdhdGlvbigpIHtcbiAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICBldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbn1cbiIsImltcG9ydCB7ZGlzcGF0Y2h9IGZyb20gXCJkMy1kaXNwYXRjaFwiO1xuaW1wb3J0IHtkcmFnRGlzYWJsZSwgZHJhZ0VuYWJsZX0gZnJvbSBcImQzLWRyYWdcIjtcbmltcG9ydCB7aW50ZXJwb2xhdGV9IGZyb20gXCJkMy1pbnRlcnBvbGF0ZVwiO1xuaW1wb3J0IHtjdXN0b21FdmVudCwgZXZlbnQsIG1vdXNlLCBzZWxlY3R9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7aW50ZXJydXB0fSBmcm9tIFwiZDMtdHJhbnNpdGlvblwiO1xuaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuL2NvbnN0YW50XCI7XG5pbXBvcnQgQnJ1c2hFdmVudCBmcm9tIFwiLi9ldmVudFwiO1xuaW1wb3J0IG5vZXZlbnQsIHtub3Byb3BhZ2F0aW9ufSBmcm9tIFwiLi9ub2V2ZW50XCI7XG5cbnZhciBNT0RFX0RSQUcgPSB7bmFtZTogXCJkcmFnXCJ9LFxuICAgIE1PREVfU1BBQ0UgPSB7bmFtZTogXCJzcGFjZVwifSxcbiAgICBNT0RFX0hBTkRMRSA9IHtuYW1lOiBcImhhbmRsZVwifSxcbiAgICBNT0RFX0NFTlRFUiA9IHtuYW1lOiBcImNlbnRlclwifTtcblxudmFyIFggPSB7XG4gIG5hbWU6IFwieFwiLFxuICBoYW5kbGVzOiBbXCJlXCIsIFwid1wiXS5tYXAodHlwZSksXG4gIGlucHV0OiBmdW5jdGlvbih4LCBlKSB7IHJldHVybiB4ICYmIFtbeFswXSwgZVswXVsxXV0sIFt4WzFdLCBlWzFdWzFdXV07IH0sXG4gIG91dHB1dDogZnVuY3Rpb24oeHkpIHsgcmV0dXJuIHh5ICYmIFt4eVswXVswXSwgeHlbMV1bMF1dOyB9XG59O1xuXG52YXIgWSA9IHtcbiAgbmFtZTogXCJ5XCIsXG4gIGhhbmRsZXM6IFtcIm5cIiwgXCJzXCJdLm1hcCh0eXBlKSxcbiAgaW5wdXQ6IGZ1bmN0aW9uKHksIGUpIHsgcmV0dXJuIHkgJiYgW1tlWzBdWzBdLCB5WzBdXSwgW2VbMV1bMF0sIHlbMV1dXTsgfSxcbiAgb3V0cHV0OiBmdW5jdGlvbih4eSkgeyByZXR1cm4geHkgJiYgW3h5WzBdWzFdLCB4eVsxXVsxXV07IH1cbn07XG5cbnZhciBYWSA9IHtcbiAgbmFtZTogXCJ4eVwiLFxuICBoYW5kbGVzOiBbXCJuXCIsIFwiZVwiLCBcInNcIiwgXCJ3XCIsIFwibndcIiwgXCJuZVwiLCBcInNlXCIsIFwic3dcIl0ubWFwKHR5cGUpLFxuICBpbnB1dDogZnVuY3Rpb24oeHkpIHsgcmV0dXJuIHh5OyB9LFxuICBvdXRwdXQ6IGZ1bmN0aW9uKHh5KSB7IHJldHVybiB4eTsgfVxufTtcblxudmFyIGN1cnNvcnMgPSB7XG4gIG92ZXJsYXk6IFwiY3Jvc3NoYWlyXCIsXG4gIHNlbGVjdGlvbjogXCJtb3ZlXCIsXG4gIG46IFwibnMtcmVzaXplXCIsXG4gIGU6IFwiZXctcmVzaXplXCIsXG4gIHM6IFwibnMtcmVzaXplXCIsXG4gIHc6IFwiZXctcmVzaXplXCIsXG4gIG53OiBcIm53c2UtcmVzaXplXCIsXG4gIG5lOiBcIm5lc3ctcmVzaXplXCIsXG4gIHNlOiBcIm53c2UtcmVzaXplXCIsXG4gIHN3OiBcIm5lc3ctcmVzaXplXCJcbn07XG5cbnZhciBmbGlwWCA9IHtcbiAgZTogXCJ3XCIsXG4gIHc6IFwiZVwiLFxuICBudzogXCJuZVwiLFxuICBuZTogXCJud1wiLFxuICBzZTogXCJzd1wiLFxuICBzdzogXCJzZVwiXG59O1xuXG52YXIgZmxpcFkgPSB7XG4gIG46IFwic1wiLFxuICBzOiBcIm5cIixcbiAgbnc6IFwic3dcIixcbiAgbmU6IFwic2VcIixcbiAgc2U6IFwibmVcIixcbiAgc3c6IFwibndcIlxufTtcblxudmFyIHNpZ25zWCA9IHtcbiAgb3ZlcmxheTogKzEsXG4gIHNlbGVjdGlvbjogKzEsXG4gIG46IG51bGwsXG4gIGU6ICsxLFxuICBzOiBudWxsLFxuICB3OiAtMSxcbiAgbnc6IC0xLFxuICBuZTogKzEsXG4gIHNlOiArMSxcbiAgc3c6IC0xXG59O1xuXG52YXIgc2lnbnNZID0ge1xuICBvdmVybGF5OiArMSxcbiAgc2VsZWN0aW9uOiArMSxcbiAgbjogLTEsXG4gIGU6IG51bGwsXG4gIHM6ICsxLFxuICB3OiBudWxsLFxuICBudzogLTEsXG4gIG5lOiAtMSxcbiAgc2U6ICsxLFxuICBzdzogKzFcbn07XG5cbmZ1bmN0aW9uIHR5cGUodCkge1xuICByZXR1cm4ge3R5cGU6IHR9O1xufVxuXG4vLyBJZ25vcmUgcmlnaHQtY2xpY2ssIHNpbmNlIHRoYXQgc2hvdWxkIG9wZW4gdGhlIGNvbnRleHQgbWVudS5cbmZ1bmN0aW9uIGRlZmF1bHRGaWx0ZXIoKSB7XG4gIHJldHVybiAhZXZlbnQuYnV0dG9uO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0RXh0ZW50KCkge1xuICB2YXIgc3ZnID0gdGhpcy5vd25lclNWR0VsZW1lbnQgfHwgdGhpcztcbiAgcmV0dXJuIFtbMCwgMF0sIFtzdmcud2lkdGguYmFzZVZhbC52YWx1ZSwgc3ZnLmhlaWdodC5iYXNlVmFsLnZhbHVlXV07XG59XG5cbi8vIExpa2UgZDMubG9jYWwsIGJ1dCB3aXRoIHRoZSBuYW1lIOKAnF9fYnJ1c2jigJ0gcmF0aGVyIHRoYW4gYXV0by1nZW5lcmF0ZWQuXG5mdW5jdGlvbiBsb2NhbChub2RlKSB7XG4gIHdoaWxlICghbm9kZS5fX2JydXNoKSBpZiAoIShub2RlID0gbm9kZS5wYXJlbnROb2RlKSkgcmV0dXJuO1xuICByZXR1cm4gbm9kZS5fX2JydXNoO1xufVxuXG5mdW5jdGlvbiBlbXB0eShleHRlbnQpIHtcbiAgcmV0dXJuIGV4dGVudFswXVswXSA9PT0gZXh0ZW50WzFdWzBdXG4gICAgICB8fCBleHRlbnRbMF1bMV0gPT09IGV4dGVudFsxXVsxXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJydXNoU2VsZWN0aW9uKG5vZGUpIHtcbiAgdmFyIHN0YXRlID0gbm9kZS5fX2JydXNoO1xuICByZXR1cm4gc3RhdGUgPyBzdGF0ZS5kaW0ub3V0cHV0KHN0YXRlLnNlbGVjdGlvbikgOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnJ1c2hYKCkge1xuICByZXR1cm4gYnJ1c2goWCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBicnVzaFkoKSB7XG4gIHJldHVybiBicnVzaChZKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBicnVzaChYWSk7XG59XG5cbmZ1bmN0aW9uIGJydXNoKGRpbSkge1xuICB2YXIgZXh0ZW50ID0gZGVmYXVsdEV4dGVudCxcbiAgICAgIGZpbHRlciA9IGRlZmF1bHRGaWx0ZXIsXG4gICAgICBsaXN0ZW5lcnMgPSBkaXNwYXRjaChicnVzaCwgXCJzdGFydFwiLCBcImJydXNoXCIsIFwiZW5kXCIpLFxuICAgICAgaGFuZGxlU2l6ZSA9IDYsXG4gICAgICB0b3VjaGVuZGluZztcblxuICBmdW5jdGlvbiBicnVzaChncm91cCkge1xuICAgIHZhciBvdmVybGF5ID0gZ3JvdXBcbiAgICAgICAgLnByb3BlcnR5KFwiX19icnVzaFwiLCBpbml0aWFsaXplKVxuICAgICAgLnNlbGVjdEFsbChcIi5vdmVybGF5XCIpXG4gICAgICAuZGF0YShbdHlwZShcIm92ZXJsYXlcIildKTtcblxuICAgIG92ZXJsYXkuZW50ZXIoKS5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJvdmVybGF5XCIpXG4gICAgICAgIC5hdHRyKFwicG9pbnRlci1ldmVudHNcIiwgXCJhbGxcIilcbiAgICAgICAgLmF0dHIoXCJjdXJzb3JcIiwgY3Vyc29ycy5vdmVybGF5KVxuICAgICAgLm1lcmdlKG92ZXJsYXkpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBleHRlbnQgPSBsb2NhbCh0aGlzKS5leHRlbnQ7XG4gICAgICAgICAgc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgIC5hdHRyKFwieFwiLCBleHRlbnRbMF1bMF0pXG4gICAgICAgICAgICAgIC5hdHRyKFwieVwiLCBleHRlbnRbMF1bMV0pXG4gICAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZXh0ZW50WzFdWzBdIC0gZXh0ZW50WzBdWzBdKVxuICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBleHRlbnRbMV1bMV0gLSBleHRlbnRbMF1bMV0pO1xuICAgICAgICB9KTtcblxuICAgIGdyb3VwLnNlbGVjdEFsbChcIi5zZWxlY3Rpb25cIilcbiAgICAgIC5kYXRhKFt0eXBlKFwic2VsZWN0aW9uXCIpXSlcbiAgICAgIC5lbnRlcigpLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInNlbGVjdGlvblwiKVxuICAgICAgICAuYXR0cihcImN1cnNvclwiLCBjdXJzb3JzLnNlbGVjdGlvbilcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwiIzc3N1wiKVxuICAgICAgICAuYXR0cihcImZpbGwtb3BhY2l0eVwiLCAwLjMpXG4gICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwiI2ZmZlwiKVxuICAgICAgICAuYXR0cihcInNoYXBlLXJlbmRlcmluZ1wiLCBcImNyaXNwRWRnZXNcIik7XG5cbiAgICB2YXIgaGFuZGxlID0gZ3JvdXAuc2VsZWN0QWxsKFwiLmhhbmRsZVwiKVxuICAgICAgLmRhdGEoZGltLmhhbmRsZXMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudHlwZTsgfSk7XG5cbiAgICBoYW5kbGUuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgaGFuZGxlLmVudGVyKCkuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwiaGFuZGxlIGhhbmRsZS0tXCIgKyBkLnR5cGU7IH0pXG4gICAgICAgIC5hdHRyKFwiY3Vyc29yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGN1cnNvcnNbZC50eXBlXTsgfSk7XG5cbiAgICBncm91cFxuICAgICAgICAuZWFjaChyZWRyYXcpXG4gICAgICAgIC5hdHRyKFwiZmlsbFwiLCBcIm5vbmVcIilcbiAgICAgICAgLmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcImFsbFwiKVxuICAgICAgICAuc3R5bGUoXCItd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3JcIiwgXCJyZ2JhKDAsMCwwLDApXCIpXG4gICAgICAgIC5vbihcIm1vdXNlZG93bi5icnVzaCB0b3VjaHN0YXJ0LmJydXNoXCIsIHN0YXJ0ZWQpO1xuICB9XG5cbiAgYnJ1c2gubW92ZSA9IGZ1bmN0aW9uKGdyb3VwLCBzZWxlY3Rpb24pIHtcbiAgICBpZiAoZ3JvdXAuc2VsZWN0aW9uKSB7XG4gICAgICBncm91cFxuICAgICAgICAgIC5vbihcInN0YXJ0LmJydXNoXCIsIGZ1bmN0aW9uKCkgeyBlbWl0dGVyKHRoaXMsIGFyZ3VtZW50cykuYmVmb3Jlc3RhcnQoKS5zdGFydCgpOyB9KVxuICAgICAgICAgIC5vbihcImludGVycnVwdC5icnVzaCBlbmQuYnJ1c2hcIiwgZnVuY3Rpb24oKSB7IGVtaXR0ZXIodGhpcywgYXJndW1lbnRzKS5lbmQoKTsgfSlcbiAgICAgICAgICAudHdlZW4oXCJicnVzaFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcyxcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IHRoYXQuX19icnVzaCxcbiAgICAgICAgICAgICAgICBlbWl0ID0gZW1pdHRlcih0aGF0LCBhcmd1bWVudHMpLFxuICAgICAgICAgICAgICAgIHNlbGVjdGlvbjAgPSBzdGF0ZS5zZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgc2VsZWN0aW9uMSA9IGRpbS5pbnB1dCh0eXBlb2Ygc2VsZWN0aW9uID09PSBcImZ1bmN0aW9uXCIgPyBzZWxlY3Rpb24uYXBwbHkodGhpcywgYXJndW1lbnRzKSA6IHNlbGVjdGlvbiwgc3RhdGUuZXh0ZW50KSxcbiAgICAgICAgICAgICAgICBpID0gaW50ZXJwb2xhdGUoc2VsZWN0aW9uMCwgc2VsZWN0aW9uMSk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHR3ZWVuKHQpIHtcbiAgICAgICAgICAgICAgc3RhdGUuc2VsZWN0aW9uID0gdCA9PT0gMSAmJiBlbXB0eShzZWxlY3Rpb24xKSA/IG51bGwgOiBpKHQpO1xuICAgICAgICAgICAgICByZWRyYXcuY2FsbCh0aGF0KTtcbiAgICAgICAgICAgICAgZW1pdC5icnVzaCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2VsZWN0aW9uMCAmJiBzZWxlY3Rpb24xID8gdHdlZW4gOiB0d2VlbigxKTtcbiAgICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZ3JvdXBcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcyxcbiAgICAgICAgICAgICAgICBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgICAgICAgICAgIHN0YXRlID0gdGhhdC5fX2JydXNoLFxuICAgICAgICAgICAgICAgIHNlbGVjdGlvbjEgPSBkaW0uaW5wdXQodHlwZW9mIHNlbGVjdGlvbiA9PT0gXCJmdW5jdGlvblwiID8gc2VsZWN0aW9uLmFwcGx5KHRoYXQsIGFyZ3MpIDogc2VsZWN0aW9uLCBzdGF0ZS5leHRlbnQpLFxuICAgICAgICAgICAgICAgIGVtaXQgPSBlbWl0dGVyKHRoYXQsIGFyZ3MpLmJlZm9yZXN0YXJ0KCk7XG5cbiAgICAgICAgICAgIGludGVycnVwdCh0aGF0KTtcbiAgICAgICAgICAgIHN0YXRlLnNlbGVjdGlvbiA9IHNlbGVjdGlvbjEgPT0gbnVsbCB8fCBlbXB0eShzZWxlY3Rpb24xKSA/IG51bGwgOiBzZWxlY3Rpb24xO1xuICAgICAgICAgICAgcmVkcmF3LmNhbGwodGhhdCk7XG4gICAgICAgICAgICBlbWl0LnN0YXJ0KCkuYnJ1c2goKS5lbmQoKTtcbiAgICAgICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgZnVuY3Rpb24gcmVkcmF3KCkge1xuICAgIHZhciBncm91cCA9IHNlbGVjdCh0aGlzKSxcbiAgICAgICAgc2VsZWN0aW9uID0gbG9jYWwodGhpcykuc2VsZWN0aW9uO1xuXG4gICAgaWYgKHNlbGVjdGlvbikge1xuICAgICAgZ3JvdXAuc2VsZWN0QWxsKFwiLnNlbGVjdGlvblwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgbnVsbClcbiAgICAgICAgICAuYXR0cihcInhcIiwgc2VsZWN0aW9uWzBdWzBdKVxuICAgICAgICAgIC5hdHRyKFwieVwiLCBzZWxlY3Rpb25bMF1bMV0pXG4gICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBzZWxlY3Rpb25bMV1bMF0gLSBzZWxlY3Rpb25bMF1bMF0pXG4gICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgc2VsZWN0aW9uWzFdWzFdIC0gc2VsZWN0aW9uWzBdWzFdKTtcblxuICAgICAgZ3JvdXAuc2VsZWN0QWxsKFwiLmhhbmRsZVwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgbnVsbClcbiAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50eXBlW2QudHlwZS5sZW5ndGggLSAxXSA9PT0gXCJlXCIgPyBzZWxlY3Rpb25bMV1bMF0gLSBoYW5kbGVTaXplIC8gMiA6IHNlbGVjdGlvblswXVswXSAtIGhhbmRsZVNpemUgLyAyOyB9KVxuICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnR5cGVbMF0gPT09IFwic1wiID8gc2VsZWN0aW9uWzFdWzFdIC0gaGFuZGxlU2l6ZSAvIDIgOiBzZWxlY3Rpb25bMF1bMV0gLSBoYW5kbGVTaXplIC8gMjsgfSlcbiAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudHlwZSA9PT0gXCJuXCIgfHwgZC50eXBlID09PSBcInNcIiA/IHNlbGVjdGlvblsxXVswXSAtIHNlbGVjdGlvblswXVswXSArIGhhbmRsZVNpemUgOiBoYW5kbGVTaXplOyB9KVxuICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudHlwZSA9PT0gXCJlXCIgfHwgZC50eXBlID09PSBcIndcIiA/IHNlbGVjdGlvblsxXVsxXSAtIHNlbGVjdGlvblswXVsxXSArIGhhbmRsZVNpemUgOiBoYW5kbGVTaXplOyB9KTtcbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIGdyb3VwLnNlbGVjdEFsbChcIi5zZWxlY3Rpb24sLmhhbmRsZVwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgXCJub25lXCIpXG4gICAgICAgICAgLmF0dHIoXCJ4XCIsIG51bGwpXG4gICAgICAgICAgLmF0dHIoXCJ5XCIsIG51bGwpXG4gICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBudWxsKVxuICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGVtaXR0ZXIodGhhdCwgYXJncykge1xuICAgIHJldHVybiB0aGF0Ll9fYnJ1c2guZW1pdHRlciB8fCBuZXcgRW1pdHRlcih0aGF0LCBhcmdzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIEVtaXR0ZXIodGhhdCwgYXJncykge1xuICAgIHRoaXMudGhhdCA9IHRoYXQ7XG4gICAgdGhpcy5hcmdzID0gYXJncztcbiAgICB0aGlzLnN0YXRlID0gdGhhdC5fX2JydXNoO1xuICAgIHRoaXMuYWN0aXZlID0gMDtcbiAgfVxuXG4gIEVtaXR0ZXIucHJvdG90eXBlID0ge1xuICAgIGJlZm9yZXN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgrK3RoaXMuYWN0aXZlID09PSAxKSB0aGlzLnN0YXRlLmVtaXR0ZXIgPSB0aGlzLCB0aGlzLnN0YXJ0aW5nID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuc3RhcnRpbmcpIHRoaXMuc3RhcnRpbmcgPSBmYWxzZSwgdGhpcy5lbWl0KFwic3RhcnRcIik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGJydXNoOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZW1pdChcImJydXNoXCIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBlbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGhpcy5hY3RpdmUgPT09IDApIGRlbGV0ZSB0aGlzLnN0YXRlLmVtaXR0ZXIsIHRoaXMuZW1pdChcImVuZFwiKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZW1pdDogZnVuY3Rpb24odHlwZSkge1xuICAgICAgY3VzdG9tRXZlbnQobmV3IEJydXNoRXZlbnQoYnJ1c2gsIHR5cGUsIGRpbS5vdXRwdXQodGhpcy5zdGF0ZS5zZWxlY3Rpb24pKSwgbGlzdGVuZXJzLmFwcGx5LCBsaXN0ZW5lcnMsIFt0eXBlLCB0aGlzLnRoYXQsIHRoaXMuYXJnc10pO1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBzdGFydGVkKCkge1xuICAgIGlmIChldmVudC50b3VjaGVzKSB7IGlmIChldmVudC5jaGFuZ2VkVG91Y2hlcy5sZW5ndGggPCBldmVudC50b3VjaGVzLmxlbmd0aCkgcmV0dXJuIG5vZXZlbnQoKTsgfVxuICAgIGVsc2UgaWYgKHRvdWNoZW5kaW5nKSByZXR1cm47XG4gICAgaWYgKCFmaWx0ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSkgcmV0dXJuO1xuXG4gICAgdmFyIHRoYXQgPSB0aGlzLFxuICAgICAgICB0eXBlID0gZXZlbnQudGFyZ2V0Ll9fZGF0YV9fLnR5cGUsXG4gICAgICAgIG1vZGUgPSAoZXZlbnQubWV0YUtleSA/IHR5cGUgPSBcIm92ZXJsYXlcIiA6IHR5cGUpID09PSBcInNlbGVjdGlvblwiID8gTU9ERV9EUkFHIDogKGV2ZW50LmFsdEtleSA/IE1PREVfQ0VOVEVSIDogTU9ERV9IQU5ETEUpLFxuICAgICAgICBzaWduWCA9IGRpbSA9PT0gWSA/IG51bGwgOiBzaWduc1hbdHlwZV0sXG4gICAgICAgIHNpZ25ZID0gZGltID09PSBYID8gbnVsbCA6IHNpZ25zWVt0eXBlXSxcbiAgICAgICAgc3RhdGUgPSBsb2NhbCh0aGF0KSxcbiAgICAgICAgZXh0ZW50ID0gc3RhdGUuZXh0ZW50LFxuICAgICAgICBzZWxlY3Rpb24gPSBzdGF0ZS5zZWxlY3Rpb24sXG4gICAgICAgIFcgPSBleHRlbnRbMF1bMF0sIHcwLCB3MSxcbiAgICAgICAgTiA9IGV4dGVudFswXVsxXSwgbjAsIG4xLFxuICAgICAgICBFID0gZXh0ZW50WzFdWzBdLCBlMCwgZTEsXG4gICAgICAgIFMgPSBleHRlbnRbMV1bMV0sIHMwLCBzMSxcbiAgICAgICAgZHgsXG4gICAgICAgIGR5LFxuICAgICAgICBtb3ZpbmcsXG4gICAgICAgIHNoaWZ0aW5nID0gc2lnblggJiYgc2lnblkgJiYgZXZlbnQuc2hpZnRLZXksXG4gICAgICAgIGxvY2tYLFxuICAgICAgICBsb2NrWSxcbiAgICAgICAgcG9pbnQwID0gbW91c2UodGhhdCksXG4gICAgICAgIHBvaW50ID0gcG9pbnQwLFxuICAgICAgICBlbWl0ID0gZW1pdHRlcih0aGF0LCBhcmd1bWVudHMpLmJlZm9yZXN0YXJ0KCk7XG5cbiAgICBpZiAodHlwZSA9PT0gXCJvdmVybGF5XCIpIHtcbiAgICAgIHN0YXRlLnNlbGVjdGlvbiA9IHNlbGVjdGlvbiA9IFtcbiAgICAgICAgW3cwID0gZGltID09PSBZID8gVyA6IHBvaW50MFswXSwgbjAgPSBkaW0gPT09IFggPyBOIDogcG9pbnQwWzFdXSxcbiAgICAgICAgW2UwID0gZGltID09PSBZID8gRSA6IHcwLCBzMCA9IGRpbSA9PT0gWCA/IFMgOiBuMF1cbiAgICAgIF07XG4gICAgfSBlbHNlIHtcbiAgICAgIHcwID0gc2VsZWN0aW9uWzBdWzBdO1xuICAgICAgbjAgPSBzZWxlY3Rpb25bMF1bMV07XG4gICAgICBlMCA9IHNlbGVjdGlvblsxXVswXTtcbiAgICAgIHMwID0gc2VsZWN0aW9uWzFdWzFdO1xuICAgIH1cblxuICAgIHcxID0gdzA7XG4gICAgbjEgPSBuMDtcbiAgICBlMSA9IGUwO1xuICAgIHMxID0gczA7XG5cbiAgICB2YXIgZ3JvdXAgPSBzZWxlY3QodGhhdClcbiAgICAgICAgLmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcIm5vbmVcIik7XG5cbiAgICB2YXIgb3ZlcmxheSA9IGdyb3VwLnNlbGVjdEFsbChcIi5vdmVybGF5XCIpXG4gICAgICAgIC5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnNbdHlwZV0pO1xuXG4gICAgaWYgKGV2ZW50LnRvdWNoZXMpIHtcbiAgICAgIGdyb3VwXG4gICAgICAgICAgLm9uKFwidG91Y2htb3ZlLmJydXNoXCIsIG1vdmVkLCB0cnVlKVxuICAgICAgICAgIC5vbihcInRvdWNoZW5kLmJydXNoIHRvdWNoY2FuY2VsLmJydXNoXCIsIGVuZGVkLCB0cnVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHZpZXcgPSBzZWxlY3QoZXZlbnQudmlldylcbiAgICAgICAgICAub24oXCJrZXlkb3duLmJydXNoXCIsIGtleWRvd25lZCwgdHJ1ZSlcbiAgICAgICAgICAub24oXCJrZXl1cC5icnVzaFwiLCBrZXl1cHBlZCwgdHJ1ZSlcbiAgICAgICAgICAub24oXCJtb3VzZW1vdmUuYnJ1c2hcIiwgbW92ZWQsIHRydWUpXG4gICAgICAgICAgLm9uKFwibW91c2V1cC5icnVzaFwiLCBlbmRlZCwgdHJ1ZSk7XG5cbiAgICAgIGRyYWdEaXNhYmxlKGV2ZW50LnZpZXcpO1xuICAgIH1cblxuICAgIG5vcHJvcGFnYXRpb24oKTtcbiAgICBpbnRlcnJ1cHQodGhhdCk7XG4gICAgcmVkcmF3LmNhbGwodGhhdCk7XG4gICAgZW1pdC5zdGFydCgpO1xuXG4gICAgZnVuY3Rpb24gbW92ZWQoKSB7XG4gICAgICB2YXIgcG9pbnQxID0gbW91c2UodGhhdCk7XG4gICAgICBpZiAoc2hpZnRpbmcgJiYgIWxvY2tYICYmICFsb2NrWSkge1xuICAgICAgICBpZiAoTWF0aC5hYnMocG9pbnQxWzBdIC0gcG9pbnRbMF0pID4gTWF0aC5hYnMocG9pbnQxWzFdIC0gcG9pbnRbMV0pKSBsb2NrWSA9IHRydWU7XG4gICAgICAgIGVsc2UgbG9ja1ggPSB0cnVlO1xuICAgICAgfVxuICAgICAgcG9pbnQgPSBwb2ludDE7XG4gICAgICBtb3ZpbmcgPSB0cnVlO1xuICAgICAgbm9ldmVudCgpO1xuICAgICAgbW92ZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdmUoKSB7XG4gICAgICB2YXIgdDtcblxuICAgICAgZHggPSBwb2ludFswXSAtIHBvaW50MFswXTtcbiAgICAgIGR5ID0gcG9pbnRbMV0gLSBwb2ludDBbMV07XG5cbiAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICBjYXNlIE1PREVfU1BBQ0U6XG4gICAgICAgIGNhc2UgTU9ERV9EUkFHOiB7XG4gICAgICAgICAgaWYgKHNpZ25YKSBkeCA9IE1hdGgubWF4KFcgLSB3MCwgTWF0aC5taW4oRSAtIGUwLCBkeCkpLCB3MSA9IHcwICsgZHgsIGUxID0gZTAgKyBkeDtcbiAgICAgICAgICBpZiAoc2lnblkpIGR5ID0gTWF0aC5tYXgoTiAtIG4wLCBNYXRoLm1pbihTIC0gczAsIGR5KSksIG4xID0gbjAgKyBkeSwgczEgPSBzMCArIGR5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgTU9ERV9IQU5ETEU6IHtcbiAgICAgICAgICBpZiAoc2lnblggPCAwKSBkeCA9IE1hdGgubWF4KFcgLSB3MCwgTWF0aC5taW4oRSAtIHcwLCBkeCkpLCB3MSA9IHcwICsgZHgsIGUxID0gZTA7XG4gICAgICAgICAgZWxzZSBpZiAoc2lnblggPiAwKSBkeCA9IE1hdGgubWF4KFcgLSBlMCwgTWF0aC5taW4oRSAtIGUwLCBkeCkpLCB3MSA9IHcwLCBlMSA9IGUwICsgZHg7XG4gICAgICAgICAgaWYgKHNpZ25ZIDwgMCkgZHkgPSBNYXRoLm1heChOIC0gbjAsIE1hdGgubWluKFMgLSBuMCwgZHkpKSwgbjEgPSBuMCArIGR5LCBzMSA9IHMwO1xuICAgICAgICAgIGVsc2UgaWYgKHNpZ25ZID4gMCkgZHkgPSBNYXRoLm1heChOIC0gczAsIE1hdGgubWluKFMgLSBzMCwgZHkpKSwgbjEgPSBuMCwgczEgPSBzMCArIGR5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgTU9ERV9DRU5URVI6IHtcbiAgICAgICAgICBpZiAoc2lnblgpIHcxID0gTWF0aC5tYXgoVywgTWF0aC5taW4oRSwgdzAgLSBkeCAqIHNpZ25YKSksIGUxID0gTWF0aC5tYXgoVywgTWF0aC5taW4oRSwgZTAgKyBkeCAqIHNpZ25YKSk7XG4gICAgICAgICAgaWYgKHNpZ25ZKSBuMSA9IE1hdGgubWF4KE4sIE1hdGgubWluKFMsIG4wIC0gZHkgKiBzaWduWSkpLCBzMSA9IE1hdGgubWF4KE4sIE1hdGgubWluKFMsIHMwICsgZHkgKiBzaWduWSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChlMSA8IHcxKSB7XG4gICAgICAgIHNpZ25YICo9IC0xO1xuICAgICAgICB0ID0gdzAsIHcwID0gZTAsIGUwID0gdDtcbiAgICAgICAgdCA9IHcxLCB3MSA9IGUxLCBlMSA9IHQ7XG4gICAgICAgIGlmICh0eXBlIGluIGZsaXBYKSBvdmVybGF5LmF0dHIoXCJjdXJzb3JcIiwgY3Vyc29yc1t0eXBlID0gZmxpcFhbdHlwZV1dKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHMxIDwgbjEpIHtcbiAgICAgICAgc2lnblkgKj0gLTE7XG4gICAgICAgIHQgPSBuMCwgbjAgPSBzMCwgczAgPSB0O1xuICAgICAgICB0ID0gbjEsIG4xID0gczEsIHMxID0gdDtcbiAgICAgICAgaWYgKHR5cGUgaW4gZmxpcFkpIG92ZXJsYXkuYXR0cihcImN1cnNvclwiLCBjdXJzb3JzW3R5cGUgPSBmbGlwWVt0eXBlXV0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3RhdGUuc2VsZWN0aW9uKSBzZWxlY3Rpb24gPSBzdGF0ZS5zZWxlY3Rpb247IC8vIE1heSBiZSBzZXQgYnkgYnJ1c2gubW92ZSFcbiAgICAgIGlmIChsb2NrWCkgdzEgPSBzZWxlY3Rpb25bMF1bMF0sIGUxID0gc2VsZWN0aW9uWzFdWzBdO1xuICAgICAgaWYgKGxvY2tZKSBuMSA9IHNlbGVjdGlvblswXVsxXSwgczEgPSBzZWxlY3Rpb25bMV1bMV07XG5cbiAgICAgIGlmIChzZWxlY3Rpb25bMF1bMF0gIT09IHcxXG4gICAgICAgICAgfHwgc2VsZWN0aW9uWzBdWzFdICE9PSBuMVxuICAgICAgICAgIHx8IHNlbGVjdGlvblsxXVswXSAhPT0gZTFcbiAgICAgICAgICB8fCBzZWxlY3Rpb25bMV1bMV0gIT09IHMxKSB7XG4gICAgICAgIHN0YXRlLnNlbGVjdGlvbiA9IFtbdzEsIG4xXSwgW2UxLCBzMV1dO1xuICAgICAgICByZWRyYXcuY2FsbCh0aGF0KTtcbiAgICAgICAgZW1pdC5icnVzaCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVuZGVkKCkge1xuICAgICAgbm9wcm9wYWdhdGlvbigpO1xuICAgICAgaWYgKGV2ZW50LnRvdWNoZXMpIHtcbiAgICAgICAgaWYgKGV2ZW50LnRvdWNoZXMubGVuZ3RoKSByZXR1cm47XG4gICAgICAgIGlmICh0b3VjaGVuZGluZykgY2xlYXJUaW1lb3V0KHRvdWNoZW5kaW5nKTtcbiAgICAgICAgdG91Y2hlbmRpbmcgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0b3VjaGVuZGluZyA9IG51bGw7IH0sIDUwMCk7IC8vIEdob3N0IGNsaWNrcyBhcmUgZGVsYXllZCFcbiAgICAgICAgZ3JvdXAub24oXCJ0b3VjaG1vdmUuYnJ1c2ggdG91Y2hlbmQuYnJ1c2ggdG91Y2hjYW5jZWwuYnJ1c2hcIiwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkcmFnRW5hYmxlKGV2ZW50LnZpZXcsIG1vdmluZyk7XG4gICAgICAgIHZpZXcub24oXCJrZXlkb3duLmJydXNoIGtleXVwLmJydXNoIG1vdXNlbW92ZS5icnVzaCBtb3VzZXVwLmJydXNoXCIsIG51bGwpO1xuICAgICAgfVxuICAgICAgZ3JvdXAuYXR0cihcInBvaW50ZXItZXZlbnRzXCIsIFwiYWxsXCIpO1xuICAgICAgb3ZlcmxheS5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnMub3ZlcmxheSk7XG4gICAgICBpZiAoc3RhdGUuc2VsZWN0aW9uKSBzZWxlY3Rpb24gPSBzdGF0ZS5zZWxlY3Rpb247IC8vIE1heSBiZSBzZXQgYnkgYnJ1c2gubW92ZSAob24gc3RhcnQpIVxuICAgICAgaWYgKGVtcHR5KHNlbGVjdGlvbikpIHN0YXRlLnNlbGVjdGlvbiA9IG51bGwsIHJlZHJhdy5jYWxsKHRoYXQpO1xuICAgICAgZW1pdC5lbmQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBrZXlkb3duZWQoKSB7XG4gICAgICBzd2l0Y2ggKGV2ZW50LmtleUNvZGUpIHtcbiAgICAgICAgY2FzZSAxNjogeyAvLyBTSElGVFxuICAgICAgICAgIHNoaWZ0aW5nID0gc2lnblggJiYgc2lnblk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAxODogeyAvLyBBTFRcbiAgICAgICAgICBpZiAobW9kZSA9PT0gTU9ERV9IQU5ETEUpIHtcbiAgICAgICAgICAgIGlmIChzaWduWCkgZTAgPSBlMSAtIGR4ICogc2lnblgsIHcwID0gdzEgKyBkeCAqIHNpZ25YO1xuICAgICAgICAgICAgaWYgKHNpZ25ZKSBzMCA9IHMxIC0gZHkgKiBzaWduWSwgbjAgPSBuMSArIGR5ICogc2lnblk7XG4gICAgICAgICAgICBtb2RlID0gTU9ERV9DRU5URVI7XG4gICAgICAgICAgICBtb3ZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgMzI6IHsgLy8gU1BBQ0U7IHRha2VzIHByaW9yaXR5IG92ZXIgQUxUXG4gICAgICAgICAgaWYgKG1vZGUgPT09IE1PREVfSEFORExFIHx8IG1vZGUgPT09IE1PREVfQ0VOVEVSKSB7XG4gICAgICAgICAgICBpZiAoc2lnblggPCAwKSBlMCA9IGUxIC0gZHg7IGVsc2UgaWYgKHNpZ25YID4gMCkgdzAgPSB3MSAtIGR4O1xuICAgICAgICAgICAgaWYgKHNpZ25ZIDwgMCkgczAgPSBzMSAtIGR5OyBlbHNlIGlmIChzaWduWSA+IDApIG4wID0gbjEgLSBkeTtcbiAgICAgICAgICAgIG1vZGUgPSBNT0RFX1NQQUNFO1xuICAgICAgICAgICAgb3ZlcmxheS5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnMuc2VsZWN0aW9uKTtcbiAgICAgICAgICAgIG1vdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDogcmV0dXJuO1xuICAgICAgfVxuICAgICAgbm9ldmVudCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGtleXVwcGVkKCkge1xuICAgICAgc3dpdGNoIChldmVudC5rZXlDb2RlKSB7XG4gICAgICAgIGNhc2UgMTY6IHsgLy8gU0hJRlRcbiAgICAgICAgICBpZiAoc2hpZnRpbmcpIHtcbiAgICAgICAgICAgIGxvY2tYID0gbG9ja1kgPSBzaGlmdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIDE4OiB7IC8vIEFMVFxuICAgICAgICAgIGlmIChtb2RlID09PSBNT0RFX0NFTlRFUikge1xuICAgICAgICAgICAgaWYgKHNpZ25YIDwgMCkgZTAgPSBlMTsgZWxzZSBpZiAoc2lnblggPiAwKSB3MCA9IHcxO1xuICAgICAgICAgICAgaWYgKHNpZ25ZIDwgMCkgczAgPSBzMTsgZWxzZSBpZiAoc2lnblkgPiAwKSBuMCA9IG4xO1xuICAgICAgICAgICAgbW9kZSA9IE1PREVfSEFORExFO1xuICAgICAgICAgICAgbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIDMyOiB7IC8vIFNQQUNFXG4gICAgICAgICAgaWYgKG1vZGUgPT09IE1PREVfU1BBQ0UpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5hbHRLZXkpIHtcbiAgICAgICAgICAgICAgaWYgKHNpZ25YKSBlMCA9IGUxIC0gZHggKiBzaWduWCwgdzAgPSB3MSArIGR4ICogc2lnblg7XG4gICAgICAgICAgICAgIGlmIChzaWduWSkgczAgPSBzMSAtIGR5ICogc2lnblksIG4wID0gbjEgKyBkeSAqIHNpZ25ZO1xuICAgICAgICAgICAgICBtb2RlID0gTU9ERV9DRU5URVI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZiAoc2lnblggPCAwKSBlMCA9IGUxOyBlbHNlIGlmIChzaWduWCA+IDApIHcwID0gdzE7XG4gICAgICAgICAgICAgIGlmIChzaWduWSA8IDApIHMwID0gczE7IGVsc2UgaWYgKHNpZ25ZID4gMCkgbjAgPSBuMTtcbiAgICAgICAgICAgICAgbW9kZSA9IE1PREVfSEFORExFO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3ZlcmxheS5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnNbdHlwZV0pO1xuICAgICAgICAgICAgbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiByZXR1cm47XG4gICAgICB9XG4gICAgICBub2V2ZW50KCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICB2YXIgc3RhdGUgPSB0aGlzLl9fYnJ1c2ggfHwge3NlbGVjdGlvbjogbnVsbH07XG4gICAgc3RhdGUuZXh0ZW50ID0gZXh0ZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgc3RhdGUuZGltID0gZGltO1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfVxuXG4gIGJydXNoLmV4dGVudCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChleHRlbnQgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KFtbK19bMF1bMF0sICtfWzBdWzFdXSwgWytfWzFdWzBdLCArX1sxXVsxXV1dKSwgYnJ1c2gpIDogZXh0ZW50O1xuICB9O1xuXG4gIGJydXNoLmZpbHRlciA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChmaWx0ZXIgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCEhXyksIGJydXNoKSA6IGZpbHRlcjtcbiAgfTtcblxuICBicnVzaC5oYW5kbGVTaXplID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGhhbmRsZVNpemUgPSArXywgYnJ1c2gpIDogaGFuZGxlU2l6ZTtcbiAgfTtcblxuICBicnVzaC5vbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZSA9IGxpc3RlbmVycy5vbi5hcHBseShsaXN0ZW5lcnMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHZhbHVlID09PSBsaXN0ZW5lcnMgPyBicnVzaCA6IHZhbHVlO1xuICB9O1xuXG4gIHJldHVybiBicnVzaDtcbn1cbiIsImltcG9ydCB7bWVhbiwgcXVhbnRpbGUsIGRldmlhdGlvbn0gZnJvbSBcImQzLWFycmF5XCI7XG5cblxuLy8gcmVmZXJlbmNlOiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9LZXJuZWxfKHN0YXRpc3RpY3MpXG4vLyByZWZlcmVuY2U6IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0tlcm5lbF9kZW5zaXR5X2VzdGltYXRpb25cbmV4cG9ydCBjb25zdCBrZXJuZWwgPSB7XG4gICAgZXBhbmVjaG5pa292OiBmdW5jdGlvbih1KXtyZXR1cm4gTWF0aC5hYnModSkgPD0gMT8gKDMvNCkqKDEtdSp1KTowfSxcbiAgICBnYXVzc2lhbjogZnVuY3Rpb24odSl7cmV0dXJuIDEvTWF0aC5zcXJ0KDIqTWF0aC5QSSkqTWF0aC5leHAoLS41KnUqdSl9XG59O1xuXG4vLyByZWZlcmVuY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbmRhdmllcy9zY2llbmNlLmpzL2Jsb2IvbWFzdGVyL3NyYy9zdGF0cy9iYW5kd2lkdGguanNcbmV4cG9ydCBjb25zdCBrZXJuZWxCYW5kd2lkdGggPSB7XG4gICAgLy8gQmFuZHdpZHRoIHNlbGVjdG9ycyBmb3IgR2F1c3NpYW4ga2VybmVscy5cbiAgICBucmQ6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgbGV0IGlxciA9IHF1YW50aWxlKHgsIDAuNzUpIC0gcXVhbnRpbGUoeCwgMC4yNSk7XG4gICAgICAgIGxldCBoID0gaXFyIC8gMS4zNDtcbiAgICAgICAgcmV0dXJuIDEuMDYgKiBNYXRoLm1pbihkZXZpYXRpb24oeCksIGgpICogTWF0aC5wb3coeC5sZW5ndGgsIC0xLzUpO1xuICAgIH1cbn07XG5cbi8qKlxuICpcbiAqIEBwYXJhbSBrZXJuZWw6IHRoZSBrZXJuZWwgZnVuY3Rpb24sIHN1Y2ggYXMgZ2F1c3NpYW5cbiAqIEBwYXJhbSBYOiBsaXN0IG9mIGJpbnNcbiAqIEBwYXJhbSBoOiB0aGUgYmFuZHdpZHRoLCBlaXRoZXIgYSBudW1lcmljYWwgdmFsdWUgZ2l2ZW4gYnkgdGhlIHVzZXIgb3IgY2FsY3VsYXRlZCB1c2luZyB0aGUgZnVuY3Rpb24ga2VybmVsQmFuZHdpZHRoXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259OiB0aGUga2VybmVsIGRlbnNpdHkgZXN0aW1hdG9yXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBrZXJuZWxEZW5zaXR5RXN0aW1hdG9yKGtlcm5lbCwgWCwgaCl7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKFYpIHtcbiAgICAgICAgLy8gWCBpcyB0aGUgYmluc1xuICAgICAgICByZXR1cm4gWC5tYXAoKHgpID0+IFt4LCBtZWFuKFYsICh2KSA9PiBrZXJuZWwoKHgtdikvaCkpL2hdKTtcbiAgICB9XG59XG5cbiIsImltcG9ydCB7c2VsZWN0LCBldmVudH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUb29sdGlwIHtcbiAgICBjb25zdHJ1Y3RvcihpZCwgdmVyYm9zZT1mYWxzZSwgb2Zmc2V0WD0zMCwgb2Zmc2V0WT0tNDAsIGR1cmF0aW9uPTEwMCl7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy52ZXJib3NlID0gdmVyYm9zZTtcbiAgICAgICAgdGhpcy5vZmZzZXRYID0gb2Zmc2V0WDtcbiAgICAgICAgdGhpcy5vZmZzZXRZID0gb2Zmc2V0WTtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgIH1cblxuICAgIHNob3coaW5mbykge1xuICAgICAgICBpZih0aGlzLnZlcmJvc2UpIGNvbnNvbGUubG9nKGluZm8pO1xuICAgICAgICB0aGlzLmVkaXQoaW5mbyk7XG4gICAgICAgIHRoaXMubW92ZSgpO1xuICAgICAgICBzZWxlY3QoXCIjXCIgKyB0aGlzLmlkKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLCBcImlubGluZVwiKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKHRoaXMuZHVyYXRpb24pXG4gICAgICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsIDEuMClcblxuICAgIH1cblxuICAgIGhpZGUoKSB7XG4gICAgICAgIHNlbGVjdChcIiNcIiArIHRoaXMuaWQpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24odGhpcy5kdXJhdGlvbilcbiAgICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIiwgMC4wKTtcbiAgICAgICAgdGhpcy5lZGl0KFwiXCIpO1xuICAgIH1cblxuICAgIG1vdmUoeCA9IGV2ZW50LnBhZ2VYLCB5ID0gZXZlbnQucGFnZVkpIHtcbiAgICAgICAgaWYgKHRoaXMudmVyYm9zZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coeCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh5KTtcbiAgICAgICAgfVxuICAgICAgICB4ID0geCArIHRoaXMub2Zmc2V0WDsgLy8gVE9ETzogZ2V0IHJpZCBvZiB0aGUgaGFyZC1jb2RlZCBhZGp1c3RtZW50XG4gICAgICAgIHkgPSAoeSArIHRoaXMub2Zmc2V0WSk8MD8xMDp5K3RoaXMub2Zmc2V0WTtcbiAgICAgICAgY29uc3QgdCA9IHNlbGVjdCgnIycrdGhpcy5pZClcbiAgICAgICAgICAgIC5zdHlsZShcImxlZnRcIiwgYCR7eH1weGApXG4gICAgICAgICAgICAuc3R5bGUoXCJ0b3BcIiwgYCR7eX1weGApXG4gICAgfVxuXG4gICAgZWRpdChpbmZvKSB7XG4gICAgICAgIHNlbGVjdChcIiNcIiArIHRoaXMuaWQpXG4gICAgICAgICAgICAuaHRtbChpbmZvKVxuICAgIH1cbn1cblxuIiwiLyoqXG4gKiBDcmVhdGVzIGFuIFNWR1xuICogQHBhcmFtIGlkIHtTdHJpbmd9IGEgRE9NIGVsZW1lbnQgSUQgdGhhdCBzdGFydHMgd2l0aCBhIFwiI1wiXG4gKiBAcGFyYW0gd2lkdGgge051bWVyaWN9XG4gKiBAcGFyYW0gaGVpZ2h0IHtOdW1lcmljfVxuICogQHBhcmFtIG1hcmdpbiB7T2JqZWN0fSB3aXRoIHR3byBhdHRyaWJ1dGVzOiB3aWR0aCBhbmQgaGVpZ2h0XG4gKiBAcmV0dXJuIHtTZWxlY3Rpb259IHRoZSBkMyBzZWxlY3Rpb24gb2JqZWN0IG9mIHRoZSBTVkdcbiAqL1xuXG5pbXBvcnQge3NlbGVjdH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuXG4vKipcbiAqXG4gKiBAcGFyYW0gaWQge1N0cmluZ30gdGhlIHBhcmVudCBkb20gSURcbiAqIEBwYXJhbSB3aWR0aCB7TnVtZXJpY31cbiAqIEBwYXJhbSBoZWlnaHQge051bWVyaWN9XG4gKiBAcGFyYW0gbWFyZ2luIHtPYmplY3R9IHdpdGggYXR0cjogbGVmdCwgdG9wXG4gKiBAcGFyYW0gc3ZnSWQge1N0cmluZ31cbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3ZnKGlkLCB3aWR0aCwgaGVpZ2h0LCBtYXJnaW4sIHN2Z0lkPXVuZGVmaW5lZCl7XG4gICAgaWYgKHN2Z0lkPT09dW5kZWZpbmVkKSBzdmdJZD1gJHtpZH0tc3ZnYDtcbiAgICByZXR1cm4gc2VsZWN0KFwiI1wiK2lkKS5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgICAgICAuYXR0cihcImlkXCIsIHN2Z0lkKVxuICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBgdHJhbnNsYXRlKCR7bWFyZ2luLmxlZnR9LCAke21hcmdpbi50b3B9KWApXG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSBzdmdPYmpcbiAqIEBwYXJhbSBkb3dubG9hZEZpbGVOYW1lIHtTdHJpbmd9XG4gKiBAcGFyYW0gdGVtcERvd25sb2FkRGl2SWQge1N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRvd25sb2FkU3ZnKHN2Z09iaiwgZG93bmxvYWRGaWxlTmFtZSwgdGVtcERvd25sb2FkRGl2SWQpe1xuICAgIGNvbnNvbGUubG9nKHN2Z09iaik7XG4gICAgdmFyICRzdmdDb3B5ID0gc3ZnT2JqLmNsb25lKClcbiAgICAuYXR0cihcInZlcnNpb25cIiwgXCIxLjFcIilcbiAgICAuYXR0cihcInhtbG5zXCIsIFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIik7XG5cbiAgICAvLyBwYXJzZSBhbmQgYWRkIHRoZSBDU1Mgc3R5bGluZyB1c2VkIGJ5IHRoZSBTVkdcbiAgICB2YXIgc3R5bGVzID0gcGFyc2VDc3NTdHlsZXMoc3ZnT2JqLmdldCgpKTtcbiAgICAkc3ZnQ29weS5wcmVwZW5kKHN0eWxlcyk7XG5cbiAgICAkKFwiI1wiICsgdGVtcERvd25sb2FkRGl2SWQpLmh0bWwoJycpLmhpZGUoKTtcbiAgICB2YXIgc3ZnSHRtbCA9ICQoXCIjXCIgKyB0ZW1wRG93bmxvYWREaXZJZCkuYXBwZW5kKCRzdmdDb3B5KS5odG1sKCk7XG5cbiAgICB2YXIgc3ZnQmxvYiA9IG5ldyBCbG9iKFtzdmdIdG1sXSwge3R5cGU6IFwiaW1hZ2Uvc3ZnK3htbFwifSk7XG4gICAgc2F2ZUFzKHN2Z0Jsb2IsIGRvd25sb2FkRmlsZU5hbWUpO1xuXG4gICAgLy8gY2xlYXIgdGhlIHRlbXAgZG93bmxvYWQgZGl2XG4gICAgJChcIiNcIiArIHRlbXBEb3dubG9hZERpdklkKS5odG1sKCcnKS5oaWRlKCk7XG59XG4vKipcbiAqIEEgZnVuY3Rpb24gZm9yIHBhcnNpbmcgdGhlIENTUyBzdHlsZSBzaGVldCBhbmQgaW5jbHVkaW5nIHRoZSBzdHlsZSBwcm9wZXJ0aWVzIGluIHRoZSBkb3dubG9hZGFibGUgU1ZHLlxuICogQHBhcmFtIGRvbVxuICogQHJldHVybnMge0VsZW1lbnR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNzc1N0eWxlcyAoZG9tKSB7XG4gICAgdmFyIHVzZWQgPSBcIlwiO1xuICAgIHZhciBzaGVldHMgPSBkb2N1bWVudC5zdHlsZVNoZWV0cztcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2hlZXRzLmxlbmd0aDsgaSsrKSB7IC8vIFRPRE86IHdhbGsgdGhyb3VnaCB0aGlzIGJsb2NrIG9mIGNvZGVcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHNoZWV0c1tpXS5jc3NSdWxlcyA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgICAgIHZhciBydWxlcyA9IHNoZWV0c1tpXS5jc3NSdWxlcztcblxuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBydWxlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBydWxlID0gcnVsZXNbal07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZihydWxlLnN0eWxlKSAhPSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbGVtcztcbiAgICAgICAgICAgICAgICAgICAgLy9Tb21lIHNlbGVjdG9ycyB3b24ndCB3b3JrLCBhbmQgbW9zdCBvZiB0aGVzZSBkb24ndCBtYXR0ZXIuXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtcyA9ICQoZG9tKS5maW5kKHJ1bGUuc2VsZWN0b3JUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VkICs9IHJ1bGUuc2VsZWN0b3JUZXh0ICsgXCIgeyBcIiArIHJ1bGUuc3R5bGUuY3NzVGV4dCArIFwiIH1cXG5cIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gSW4gRmlyZWZveCwgaWYgc3R5bGVzaGVldCBvcmlnaW5hdGVzIGZyb20gYSBkaWZmIGRvbWFpbixcbiAgICAgICAgICAgIC8vIHRyeWluZyB0byBhY2Nlc3MgdGhlIGNzc1J1bGVzIHdpbGwgdGhyb3cgYSBTZWN1cml0eUVycm9yLlxuICAgICAgICAgICAgLy8gSGVuY2UsIHdlIG11c3QgdXNlIGEgdHJ5L2NhdGNoIHRvIGhhbmRsZSB0aGlzIGluIEZpcmVmb3hcbiAgICAgICAgICAgIGlmIChlLm5hbWUgIT09ICdTZWN1cml0eUVycm9yJykgdGhyb3cgZTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIHMuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3RleHQvY3NzJyk7XG4gICAgcy5pbm5lckhUTUwgPSBcIjwhW0NEQVRBW1xcblwiICsgdXNlZCArIFwiXFxuXV0+XCI7XG5cbiAgICByZXR1cm4gcztcbn1cbiIsIi8qKlxuICogQ3JlYXRlIGEgdG9vbGJhclxuICogVGhpcyBjbGFzcyB1c2VzIGEgbG90IG9mIGpRdWVyeSBmb3IgZG9tIGVsZW1lbnQgbWFuaXB1bGF0aW9uXG4gKi9cblxuaW1wb3J0IHtzZWxlY3R9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7cGFyc2VDc3NTdHlsZXN9IGZyb20gXCIuL3V0aWxzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRvb2xiYXIge1xuICAgIGNvbnN0cnVjdG9yKGRvbUlkLCB0b29sdGlwPXVuZGVmaW5lZCwgdmVydGljYWw9ZmFsc2Upe1xuICAgICAgICAkKGAjJHtkb21JZH1gKS5zaG93KCk7IC8vIGlmIGhpZGRlblxuXG4gICAgICAgIC8vIGFkZCBhIG5ldyBiYXJncm91cCBkaXYgdG8gZG9tSUQgd2l0aCBib290c3RyYXAgYnV0dG9uIGNsYXNzZXNcbiAgICAgICAgY29uc3QgYnRuQ2xhc3NlcyA9IHZlcnRpY2FsPydidG4tZ3JvdXAtdmVydGljYWwgYnRuLWdyb3VwLXNtJzogJ2J0bi1ncm91cCBidG4tZ3JvdXAtc20nO1xuICAgICAgICB0aGlzLmJhciA9ICQoJzxkaXYvPicpLmFkZENsYXNzKGJ0bkNsYXNzZXMpLmFwcGVuZFRvKGAjJHtkb21JZH1gKTtcbiAgICAgICAgdGhpcy5idXR0b25zID0ge307XG4gICAgICAgIHRoaXMudG9vbHRpcCA9IHRvb2x0aXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgZG93bmxvYWQgYnV0dG9uXG4gICAgICogQHBhcmFtIGlkIHtTdHJpbmd9IHRoZSBidXR0b24gZG9tIElEXG4gICAgICogQHBhcmFtIHN2Z0lkIHtTdHJpbmd9IHRoZSBTVkcgZG9tIElEIHRvIGdyYWIgYW5kIGRvd25sb2FkXG4gICAgICogQHBhcmFtIG91dGZpbGVOYW1lIHtTdHJpbmd9IHRoZSBkb3dubG9hZCBmaWxlIG5hbWVcbiAgICAgKiBAcGFyYW0gY2xvbmVJZCB7U3RyaW5nfSB0aGUgY2xvbmVkIFNWRyBkb20gSURcbiAgICAgKiBAcGFyYW0gaWNvbiB7U3RyaW5nfSBhIGZvbnRhd2Vzb21lJ3MgaWNvbiBjbGFzcyBuYW1lXG4gICAgICovXG4gICAgY3JlYXRlRG93bmxvYWRCdXR0b24oaWQsIHN2Z0lkLCBvdXRmaWxlTmFtZSwgY2xvbmVJZCwgaWNvbj0nZmEtZG93bmxvYWQnKXtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9IHRoaXMuY3JlYXRlQnV0dG9uKGlkLCBpY29uKTtcbiAgICAgICAgc2VsZWN0KGAjJHtpZH1gKVxuICAgICAgICAgICAgLm9uKCdjbGljaycsICgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZFN2ZyhzdmdJZCwgb3V0ZmlsZU5hbWUsIGNsb25lSWQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdmVyJywgKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2x0aXAuc2hvdyhcIkRvd25sb2FkXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdXQnLCAoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbHRpcC5oaWRlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjcmVhdGVSZXNldEJ1dHRvbihpZCwgY2FsbGJhY2ssIGljb249J2ZhLWV4cGFuZC1hcnJvd3MtYWx0Jyl7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSB0aGlzLmNyZWF0ZUJ1dHRvbihpZCwgaWNvbik7XG4gICAgICAgIHNlbGVjdChgIyR7aWR9YClcbiAgICAgICAgICAgIC5vbignY2xpY2snLCBjYWxsYmFjaylcbiAgICAgICAgICAgIC5vbignbW91c2VvdmVyJywgKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2x0aXAuc2hvdyhcIlJlc2V0IHRoZSBzY2FsZXNcIik7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdtb3VzZW91dCcsICgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy50b29sdGlwLmhpZGUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGNyZWF0ZSBhIGJ1dHRvbiB0byB0aGUgdG9vbGJhclxuICAgICAqIEBwYXJhbSBpZCB7U3RyaW5nfSB0aGUgYnV0dG9uJ3MgaWRcbiAgICAgKiBAcGFyYW0gaWNvbiB7U3RyaW5nfSBhIGZvbnRhd2Vzb21lIGljb24gY2xhc3NcbiAgICAgKiBEZXBlbmRlbmNpZXM6IEJvb3RzdHJhcCwgalF1ZXJ5LCBGb250YXdlc29tZVxuICAgICAqL1xuICAgIGNyZWF0ZUJ1dHRvbihpZCwgaWNvbj0nZmEtZG93bmxvYWQnKXtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJzxhLz4nKS5hdHRyKCdpZCcsIGlkKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdidG4gYnRuLWRlZmF1bHQnKS5hcHBlbmRUbyh0aGlzLmJhcik7XG4gICAgICAgICQoJzxpLz4nKS5hZGRDbGFzcyhgZmEgJHtpY29ufWApLmFwcGVuZFRvKCRidXR0b24pO1xuICAgICAgICB0aGlzLmJ1dHRvbnNbaWRdID0gJGJ1dHRvbjtcbiAgICAgICAgcmV0dXJuICRidXR0b247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogYXR0YWNoIGEgdG9vbHRpcCBkb20gd2l0aCB0aGUgdG9vbGJhclxuICAgICAqIEBwYXJhbSB0b29sdGlwIHtUb29sdGlwfVxuICAgICAqL1xuICAgIGF0dGFjaFRvb2x0aXAodG9vbHRpcCl7XG4gICAgICAgIHRoaXMudG9vbHRpcCA9IHRvb2x0aXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWQgU1ZHIG9ialxuICAgICAqIEBwYXJhbSBzdmdJZCB7U3RyaW5nfSB0aGUgU1ZHIGRvbSBJRFxuICAgICAqIEBwYXJhbSBmaWxlTmFtZSB7U3RyaW5nfSB0aGUgb3V0cHV0IGZpbGUgbmFtZVxuICAgICAqIEBwYXJhbSBjbG9uZUlkIHtTdHJpbmd9IHRoZSB0ZW1wb3JhcnkgZG9tIElEIHRvIGNvcHkgdGhlIFNWRyB0b1xuICAgICAqL1xuICAgIGRvd25sb2FkU3ZnKHN2Z0lkLCBmaWxlTmFtZSwgY2xvbmVJZCl7XG4gICAgICAgIC8vIGxldCBzdmdPYmogPSAkKCQoJChgJHtcIiNcIiArc3ZnSWR9IHN2Z2ApKVswXSk7IC8vIGNvbXBsaWNhdGVkIGpRdWVyeSB0byBnZXQgdG8gdGhlIFNWRyBvYmplY3RcbiAgICAgICAgbGV0IHN2Z09iaiA9ICQoJCgkKGAke1wiI1wiICtzdmdJZH1gKSlbMF0pO1xuICAgICAgICB2YXIgJHN2Z0NvcHkgPSBzdmdPYmouY2xvbmUoKVxuICAgICAgICAuYXR0cihcInZlcnNpb25cIiwgXCIxLjFcIilcbiAgICAgICAgLmF0dHIoXCJ4bWxuc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpO1xuXG4gICAgICAgIC8vIHBhcnNlIGFuZCBhZGQgYWxsIHRoZSBDU1Mgc3R5bGluZyB1c2VkIGJ5IHRoZSBTVkdcbiAgICAgICAgdmFyIHN0eWxlcyA9IHBhcnNlQ3NzU3R5bGVzKHN2Z09iai5nZXQoKSk7XG4gICAgICAgICRzdmdDb3B5LnByZXBlbmQoc3R5bGVzKTtcblxuICAgICAgICAkKFwiI1wiICsgY2xvbmVJZCkuaHRtbCgnJykuaGlkZSgpOyAvLyBtYWtlIHN1cmUgdGhlIGNvcHlJRCBpcyBpbnZpc2libGVcbiAgICAgICAgdmFyIHN2Z0h0bWwgPSAkKGAjJHtjbG9uZUlkfWApLmFwcGVuZCgkc3ZnQ29weSkuaHRtbCgpO1xuXG4gICAgICAgIHZhciBzdmdCbG9iID0gbmV3IEJsb2IoW3N2Z0h0bWxdLCB7dHlwZTogXCJpbWFnZS9zdmcreG1sXCJ9KTtcbiAgICAgICAgc2F2ZUFzKHN2Z0Jsb2IsIGZpbGVOYW1lKTtcblxuICAgICAgICAvLyBjbGVhciB0aGUgdGVtcCBkb3dubG9hZCBkaXZcbiAgICAgICAgJChgIyR7Y2xvbmVJZH1gKS5odG1sKCcnKS5oaWRlKCk7XG4gICAgfVxufSIsIi8qXG5JbnB1dCBkYXRhIHN0cnVjdHVyZTogYSBsaXN0IG9mIGRhdGEgb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6XG5bXG4gICAge1xuICAgICAgICBncm91cDogXCJncm91cDFcIlxuICAgICAgICBsYWJlbDogXCJkYXRhc2V0IDFcIixcbiAgICAgICAgdmFsdWVzOiBbYSBsaXN0IG9mIG51bWVyaWNhbCB2YWx1ZXNdXG4gICAgIH0sXG4gICAgIHtcbiAgICAgICAgZ3JvdXA6IFwiZ3JvdXAxXCJcbiAgICAgICAgbGFiZWw6IFwiZGF0YXNldCAyXCIsXG4gICAgICAgIHZhbHVlczogW2EgbGlzdCBvZiBudW1lcmljYWwgdmFsdWVzXVxuICAgICB9LFxuICAgICB7XG4gICAgICAgIGdyb3VwOiBcImdyb3VwMlwiXG4gICAgICAgIGxhYmVsOiBcImRhdGFzZXQgM1wiLFxuICAgICAgICB2YWx1ZXM6IFthIGxpc3Qgb2YgbnVtZXJpY2FsIHZhbHVlc11cbiAgICAgfVxuXVxuKi9cblxuaW1wb3J0IHtleHRlbnQsIG1lZGlhbiwgYXNjZW5kaW5nLCBxdWFudGlsZSwgbWF4LCBtaW59IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IHtuZXN0fSBmcm9tIFwiZDMtY29sbGVjdGlvblwiO1xuaW1wb3J0IHtzY2FsZUJhbmQsIHNjYWxlTGluZWFyfSBmcm9tIFwiZDMtc2NhbGVcIjtcbmltcG9ydCB7YXJlYX0gZnJvbSBcImQzLXNoYXBlXCI7XG5pbXBvcnQge2F4aXNUb3AsIGF4aXNCb3R0b20sIGF4aXNMZWZ0fSBmcm9tIFwiZDMtYXhpc1wiO1xuaW1wb3J0IHtzZWxlY3QsIHNlbGVjdEFsbCwgZXZlbnR9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7YnJ1c2h9IGZyb20gXCJkMy1icnVzaFwiO1xuXG5pbXBvcnQge2tlcm5lbERlbnNpdHlFc3RpbWF0b3IsIGtlcm5lbCwga2VybmVsQmFuZHdpZHRofSBmcm9tIFwiLi9rZGVcIjtcbmltcG9ydCBUb29sdGlwIGZyb20gXCIuL1Rvb2x0aXBcIjtcbmltcG9ydCBUb29sYmFyIGZyb20gXCIuL1Rvb2xiYXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR3JvdXBlZFZpb2xpbiB7XG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3IgZm9yIEdyb3VwZWRWaW9saW5cbiAgICAgKiBAcGFyYW0gZGF0YSB7TGlzdH06IGEgbGlzdCBvZiBvYmplY3RzIHdpdGggYXR0cmlidXRlczogZ3JvdXA6IHtTdHJpbmd9LCBsYWJlbDoge1N0cmluZ30sIHZhbHVlczoge0xpc3R9IG9mIG51bWVyaWNhbCB2YWx1ZXMsIHNpemU6IGludGVnZXIsIG9wdGlvbmFsXG4gICAgICogQHBhcmFtIGdyb3VwSW5mbyB7RGljdGlvbmFyeX06IG1ldGFkYXRhIG9mIHRoZSBncm91cCwgaW5kZXhlZCBieSBncm91cCBJRFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGRhdGEsIGdyb3VwSW5mbyA9IHt9KXtcbiAgICAgICAgdGhpcy5fc2FuaXR5Q2hlY2soZGF0YSk7XG4gICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgICAgIHRoaXMuZ3JvdXBJbmZvID0gZ3JvdXBJbmZvO1xuICAgICAgICB0aGlzLnRvb2xiYXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudG9vbHRpcCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb20ge0RPTX0gdGhlIFNWRyBkb20gb2JqZWN0IHRvIGFwcGVuZCB0aGUgdmlvbGluIHBsb3QgdG9cbiAgICAgKiBAcGFyYW0gd2lkdGgge0Zsb2F0fVxuICAgICAqIEBwYXJhbSBoZWlnaHQge0Zsb2F0fVxuICAgICAqIEBwYXJhbSB4UGFkZGluZyB7RmxvYXR9IHBhZGRpbmcgb2YgdGhlIHggYXhpc1xuICAgICAqIEBwYXJhbSB4RG9tYWluIHtMaXN0fSB0aGUgb3JkZXIgb2YgWCBncm91cHNcbiAgICAgKiBAcGFyYW0geURvbWFpbiAge0xpc3R9IHRoZSBtaW4gYW5kIG1heCB2YWx1ZXMgb2YgdGhlIHkgZG9tYWluXG4gICAgICogQHBhcmFtIHlMYWJlbCB7U3RyaW5nfVxuICAgICAqIEBwYXJhbSBzaG93WFxuICAgICAqIEBwYXJhbSBzaG93U3ViWFxuICAgICAqIEBwYXJhbSBzdWJYQW5nbGVcbiAgICAgKiBAcGFyYW0gc2hvd1doaXNrZXJcbiAgICAgKiBAcGFyYW0gc2hvd0RpdmlkZXJcbiAgICAgKiBAcGFyYW0gc2hvd0xlZ2VuZFxuICAgICAqIEBwYXJhbSBzaG93U2l6ZVxuICAgICAqL1xuXG4gICAgcmVuZGVyKGRvbSwgd2lkdGg9NTAwLCBoZWlnaHQ9MzU3LCB4UGFkZGluZz0wLjA1LCB4RG9tYWluPXVuZGVmaW5lZCwgeURvbWFpbj1bLTMsM10sIHlMYWJlbD1cIlkgYXhpc1wiLFxuICAgICAgICAgICBzaG93WD10cnVlLCBzaG93U3ViWD10cnVlLCBzdWJYQW5nbGU9MCxcbiAgICAgICAgICAgc2hvd1doaXNrZXI9ZmFsc2UsIHNob3dEaXZpZGVyPWZhbHNlLCBzaG93TGVnZW5kPWZhbHNlLCBzaG93U2l6ZT1mYWxzZSl7XG5cbiAgICAgICAgLy8gZGVmaW5lIHRoZSByZXNldCBmb3IgdGhpcyBwbG90XG4gICAgICAgIHRoaXMucmVzZXQgPSAoKSA9PiB7XG4gICAgICAgICAgICBkb20uc2VsZWN0QWxsKFwiKlwiKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKGRvbSwgd2lkdGgsIGhlaWdodCwgeFBhZGRpbmcsIHhEb21haW4sIHlEb21haW4sIHlMYWJlbCwgc2hvd1gsIHNob3dTdWJYLCBzdWJYQW5nbGUsIHNob3dXaGlza2VyLCBzaG93RGl2aWRlciwgc2hvd0xlZ2VuZCk7XG4gICAgICAgIH07XG5cblxuICAgICAgICAvLyBkZWZpbmVzIHRoZSBYLCBzdWJYLCBZLCBaIHNjYWxlc1xuICAgICAgICBpZiAoeURvbWFpbj09PXVuZGVmaW5lZCB8fCAwID09IHlEb21haW4ubGVuZ3RoKXtcbiAgICAgICAgICAgIGxldCBhbGxWID0gW107XG4gICAgICAgICAgICB0aGlzLmRhdGEuZm9yRWFjaCgoZCkgPT4gYWxsViA9IGFsbFYuY29uY2F0KGQudmFsdWVzKSk7XG4gICAgICAgICAgICB5RG9tYWluID0gZXh0ZW50KGFsbFYpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmUtb3JnYW5pemVkIHRoaXMuZGF0YSBpbmRleGVkIGJ5IGdyb3Vwc1xuICAgICAgICB0aGlzLmdyb3VwcyA9IG5lc3QoKVxuICAgICAgICAgICAgLmtleSgoZCkgPT4gZC5ncm91cClcbiAgICAgICAgICAgIC5lbnRyaWVzKHRoaXMuZGF0YSk7XG5cbiAgICAgICAgdGhpcy5zY2FsZSA9IHtcbiAgICAgICAgICAgIHg6IHNjYWxlQmFuZCgpXG4gICAgICAgICAgICAgICAgLnJhbmdlUm91bmQoWzAsIHdpZHRoXSlcbiAgICAgICAgICAgICAgICAuZG9tYWluKHhEb21haW58fHRoaXMuZ3JvdXBzLm1hcCgoZCkgPT4gZC5rZXkpKVxuICAgICAgICAgICAgICAgIC5wYWRkaW5nSW5uZXIoeFBhZGRpbmcpLFxuICAgICAgICAgICAgc3VieDogc2NhbGVCYW5kKCksXG4gICAgICAgICAgICB5OiBzY2FsZUxpbmVhcigpXG4gICAgICAgICAgICAgICAgLnJhbmdlUm91bmQoW2hlaWdodCwgMF0pXG4gICAgICAgICAgICAgICAgLmRvbWFpbih5RG9tYWluKSxcbiAgICAgICAgICAgIHo6IHNjYWxlTGluZWFyKCkgLy8gdGhpcyBpcyB0aGUgdmlvbGluIHdpZHRoLCB0aGUgZG9tYWluIGFuZCByYW5nZSBhcmUgZGV0ZXJtaW5lZCBsYXRlciBpbmRpdmlkdWFsbHkgZm9yIGVhY2ggdmlvbGluXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gZm9yIGVhY2ggZ3JvdXBcbiAgICAgICAgdGhpcy5ncm91cHMuZm9yRWFjaCgoZykgPT4ge1xuICAgICAgICAgICAgbGV0IGdyb3VwID0gZy5rZXk7XG4gICAgICAgICAgICBsZXQgZW50cmllcyA9IGcudmFsdWVzO1xuICAgICAgICAgICAgbGV0IGluZm8gPSB0aGlzLmdyb3VwSW5mb1tncm91cF07IC8vIG9wdGlvbmFsXG4gICAgICAgICAgICBnLmluZGV4ID0gdGhpcy5zY2FsZS54LmRvbWFpbigpLmluZGV4T2YoZ3JvdXApO1xuXG4gICAgICAgICAgICBpZiAoaW5mbyAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgLy8gcmVuZGVycyBncm91cCBpbmZvIHN1Y2ggYXMgcC12YWx1ZSwgZ3JvdXAgbmFtZVxuICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwSW5mb0RvbSA9IGRvbS5hcHBlbmQoXCJnXCIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwTGFiZWxzID0gZ3JvdXBJbmZvRG9tLnNlbGVjdEFsbChcIi52aW9saW4tZ3JvdXAtbGFiZWxcIilcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEoWydwdmFsdWUnXSk7XG4gICAgICAgICAgICAgICAgZ3JvdXBMYWJlbHMuZW50ZXIoKS5hcHBlbmQoXCJ0ZXh0XCIpIC8vIENvZGUgcmV2aWV3OiBjb25zaWRlciBtb3ZpbmcgdGhpcyBwYXJ0IHRvIHRoZSBlUVRMIGRhc2hib2FyZFxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInhcIiwgMClcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIDApXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ2aW9saW4tZ3JvdXAtbGFiZWxcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhpbmZvWydwdmFsdWVUaHJlc2hvbGQnXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZD09J3B2YWx1ZScmJnBhcnNlRmxvYXQoaW5mb1tkXSk8PXBhcnNlRmxvYXQoaW5mb1sncHZhbHVlVGhyZXNob2xkJ10pP1wib3JhbmdlcmVkXCI6XCJTbGF0ZUdyYXlcIlxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCAoZCwgaSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHggPSB0aGlzLnNjYWxlLngoZ3JvdXApICsgdGhpcy5zY2FsZS54LmJhbmR3aWR0aCgpLzI7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgeSA9IHRoaXMuc2NhbGUueSh5RG9tYWluWzBdKSArIDUwOyAvLyB0b2RvOiBhdm9pZCBoYXJkLWNvZGVkIHZhbHVlc1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGB0cmFuc2xhdGUoJHt4fSwgJHt5fSlgXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KChkKSA9PiBgJHtkfTogJHtwYXJzZUZsb2F0KHBhcnNlRmxvYXQoaW5mb1tkXSkudG9QcmVjaXNpb24oMykpLnRvRXhwb25lbnRpYWwoKX1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZGVmaW5lcyB0aGUgdGhpcy5zY2FsZS5zdWJ4IGJhc2VkIG9uIHRoaXMuc2NhbGUueFxuICAgICAgICAgICAgdGhpcy5zY2FsZS5zdWJ4XG4gICAgICAgICAgICAgICAgLmRvbWFpbihlbnRyaWVzLm1hcCgoZCkgPT4gZC5sYWJlbCkpXG4gICAgICAgICAgICAgICAgLnJhbmdlUm91bmQoW3RoaXMuc2NhbGUueChncm91cCksIHRoaXMuc2NhbGUueChncm91cCkgKyB0aGlzLnNjYWxlLnguYmFuZHdpZHRoKCldKTtcblxuICAgICAgICAgICAgZW50cmllcy5mb3JFYWNoKChlbnRyeSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgaWYgKDAgPT0gZW50cnkudmFsdWVzLmxlbmd0aCkgcmV0dXJuOyAvLyBubyBmdXJ0aGVyIHJlbmRlcmluZyBpZiB0aGlzIGdyb3VwIGhhcyBubyBlbnRyaWVzXG4gICAgICAgICAgICAgICAgZW50cnkudmFsdWVzID0gZW50cnkudmFsdWVzLnNvcnQoYXNjZW5kaW5nKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9kcmF3VmlvbGluKGRvbSwgZW50cnksIHNob3dXaGlza2VyLCBnLmluZGV4KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBhZGRzIHRoZSBzdWIteCBheGlzIGlmIHRoZXJlIGFyZSBtb3JlIHRoYW4gb25lIGVudHJpZXNcbiAgICAgICAgICAgIHZhciBidWZmZXIgPSAxNTtcbiAgICAgICAgICAgIGlmIChzaG93U2l6ZSl7XG4gICAgICAgICAgICAgICAgIGNvbnN0IHNpemVTY2FsZSA9IHNjYWxlQmFuZCgpXG4gICAgICAgICAgICAgICAgICAgIC5kb21haW4oZW50cmllcy5tYXAoKGQpID0+IHtyZXR1cm4gZC5zaXplPT11bmRlZmluZWQ/JygwKSc6YCgke2Quc2l6ZXx8MH0pYH0pKVxuICAgICAgICAgICAgICAgICAgICAucmFuZ2VSb3VuZChbdGhpcy5zY2FsZS54KGdyb3VwKSwgdGhpcy5zY2FsZS54KGdyb3VwKSArIHRoaXMuc2NhbGUueC5iYW5kd2lkdGgoKV0pO1xuICAgICAgICAgICAgICAgICBjb25zdCBzaXpleEcgPSBkb20uYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInZpb2xpbi1zaXplLWF4aXNcIilcbiAgICAgICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoMCwgJHtoZWlnaHQgKyBidWZmZXJ9KWApXG4gICAgICAgICAgICAgICAgICAgICAuY2FsbChheGlzQm90dG9tKHNpemVTY2FsZSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2hvd1N1YlgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYnVmZmVyID0gNTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdWJ4RyA9IGRvbS5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ2aW9saW4tc3ViLWF4aXNcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgwLCAke2hlaWdodCArIGJ1ZmZlcn0pYClcbiAgICAgICAgICAgICAgICAgICAgLmNhbGwoYXhpc0JvdHRvbSh0aGlzLnNjYWxlLnN1YngpKTtcblxuICAgICAgICAgICAgICAgIGlmIChzdWJYQW5nbGUgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1YnhHLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwic3RhcnRcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGByb3RhdGUoJHtzdWJYQW5nbGV9LCAyLCAxMClgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICB9KTtcblxuICAgICAgICAvLyByZW5kZXJzIHRoZSB4IGF4aXNcbiAgICAgICAgbGV0IGJ1ZmZlciA9IHNob3dTdWJYPzU1OjA7IC8vIENvZGUgcmV2aWV3OiBoYXJkLWNvZGVkIHZhbHVlc1xuICAgICAgICB0aGlzLnhBeGlzID0gc2hvd1g/YXhpc0JvdHRvbSh0aGlzLnNjYWxlLngpOmF4aXNCb3R0b20odGhpcy5zY2FsZS54KS50aWNrRm9ybWF0KFwiXCIpO1xuICAgICAgICBkb20uYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInZpb2xpbi14LWF4aXMgYXhpcy0teFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgwLCAke2hlaWdodCArIGJ1ZmZlcn0pYClcbiAgICAgICAgICAgIC5jYWxsKHRoaXMueEF4aXMpIC8vIHNldCB0aWNrRm9ybWF0KFwiXCIpIHRvIHNob3cgdGljayBtYXJrcyB3aXRob3V0IHRleHQgbGFiZWxzXG4gICAgICAgICAgICAuc2VsZWN0QWxsKFwidGV4dFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJzdGFydFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoMzAsIC0xMCwgMTApXCIpO1xuXG4gICAgICAgIC8vIGFkZHMgdGhlIHkgQXhpc1xuICAgICAgICBidWZmZXIgPSA1O1xuICAgICAgICB0aGlzLnlBeGlzID0gYXhpc0xlZnQodGhpcy5zY2FsZS55KVxuICAgICAgICAgICAgICAgICAgICAudGlja1ZhbHVlcyh0aGlzLnNjYWxlLnkudGlja3MoNSkpO1xuICAgICAgICBkb20uYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInZpb2xpbi15LWF4aXMgYXhpcy0teVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgtJHtidWZmZXJ9LCAwKWApXG4gICAgICAgICAgICAuY2FsbCh0aGlzLnlBeGlzKTtcblxuICAgICAgICAvLyBhZGRzIHRoZSB0ZXh0IGxhYmVsIGZvciB0aGUgeSBheGlzXG4gICAgICAgIGRvbS5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgLTIwKSAvLyB0b2RvOiBhdm9pZCBoYXJkLWNvZGVkIHZhbHVlXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgLTQwKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInZpb2xpbi1heGlzLWxhYmVsXCIpXG4gICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwic3RhcnRcIilcbiAgICAgICAgICAgIC50ZXh0KHlMYWJlbCk7XG5cbiAgICAgICAgLy8gcGxvdCBtb3VzZSBldmVudHNcbiAgICAgICAgZG9tLm9uKFwibW91c2VvdXRcIiwgKCk9PntcbiAgICAgICAgICAgIGlmKHRoaXMudG9vbHRpcCAhPT0gdW5kZWZpbmVkKSB0aGlzLnRvb2x0aXAuaGlkZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBhZGQgZ3JvdXAgZGl2aWRlcnNcbiAgICAgICAgaWYoc2hvd0RpdmlkZXIpe1xuICAgICAgICAgICAgdGhpcy5fYWRkR3JvdXBEaXZpZGVyKGRvbSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhZGQgY29sb3IgbGVnZW5kXG4gICAgICAgIGlmIChzaG93TGVnZW5kKSB7XG4gICAgICAgICAgICBjb25zdCBsZWdlbmRHID0gZG9tLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBgdHJhbnNsYXRlKDAsIDApYCk7XG5cbiAgICAgICAgICAgIGxlZ2VuZEcuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieFwiLCA1MCArIHRoaXMuc2NhbGUueC5yYW5nZSgpWzBdLTUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIC0zNSlcbiAgICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIDcwKih0aGlzLmdyb3Vwc1swXS52YWx1ZXMubGVuZ3RoICsgMSkpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgMjQpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBcIm5vbmVcIilcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2VcIiwgXCJzaWx2ZXJcIik7XG5cbiAgICAgICAgICAgIGNvbnN0IGxlZ2VuZHMgPSBsZWdlbmRHLnNlbGVjdEFsbChcIi52aW9saW4tbGVnZW5kXCIpLmRhdGEodGhpcy5ncm91cHNbMF0udmFsdWVzKTtcblxuXG4gICAgICAgICAgICBjb25zdCBnID0gbGVnZW5kcy5lbnRlcigpLmFwcGVuZChcImdcIikuY2xhc3NlZChcInZpb2xpbi1sZWdlbmRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICBjb25zdCB3ID0gMTA7XG4gICAgICAgICAgICBnLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInhcIiwgKGQsIGkpID0+IDcwKihpICsgMSkgICsgdGhpcy5zY2FsZS54LnJhbmdlKClbMF0pXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIC0yOClcbiAgICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHcpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgdylcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIChkKSA9PiBkLmNvbG9yKTtcblxuICAgICAgICAgICAgZy5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInZpb2xpbi1sZWdlbmQtdGV4dFwiKVxuICAgICAgICAgICAgICAgIC50ZXh0KChkKSA9PiBkLmxhYmVsKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieFwiLCAoZCwgaSkgPT4gMTUgKyA3MCooaSArIDEpICsgdGhpcy5zY2FsZS54LnJhbmdlKClbMF0pXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIC0yMCk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgdG9vbHRpcCBvYmplY3RcbiAgICAgKiBAcGFyYW0gZG9tSWQge1N0cmluZ30gdGhlIHRvb2x0aXAncyBkb20gSURcbiAgICAgKiBAcmV0dXJucyB7VG9vbHRpcH1cbiAgICAgKi9cbiAgICBjcmVhdGVUb29sdGlwKGRvbUlkKXtcbiAgICAgICAgdGhpcy50b29sdGlwID0gbmV3IFRvb2x0aXAoZG9tSWQpO1xuICAgICAgICBzZWxlY3QoYCMke2RvbUlkfWApLmNsYXNzZWQoJ3Zpb2xpbi10b29sdGlwJywgdHJ1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzLnRvb2x0aXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHRoZSB0b29sYmFyIHBhbmVsXG4gICAgICogQHBhcmFtIGRvbUlkIHtTdHJpbmd9IHRoZSB0b29sYmFyJ3MgZG9tIElEXG4gICAgICogQHBhcmFtIHRvb2x0aXAge1Rvb2x0aXB9XG4gICAgICogQHJldHVybnMge1Rvb2xiYXJ9XG4gICAgICovXG5cbiAgICBjcmVhdGVUb29sYmFyKGRvbUlkLCB0b29sdGlwKXtcbiAgICAgICAgLy8gaWYgKHRvb2x0aXAgPT09IHVuZGVmaW5lZCkgdG9vbHRpcCA9IHRoaXMuY3JlYXRlVG9vbHRpcChkb21JZCk7XG4gICAgICAgIHRoaXMudG9vbGJhciA9IG5ldyBUb29sYmFyKGRvbUlkLCB0b29sdGlwKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9vbGJhcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBicnVzaCB0byB0aGUgcGxvdFxuICAgICAqIEBwYXJhbSBkb20ge0QzfSBEb20gZWxlbWVudFxuICAgICAqL1xuICAgIGFkZEJydXNoKGRvbSl7XG4gICAgICAgIGNvbnN0IHRoZUJydXNoID0gYnJ1c2goKTtcbiAgICAgICAgdGhlQnJ1c2gub24oXCJlbmRcIiwgKCk9Pnt0aGlzLnpvb20oZG9tLCB0aGVCcnVzaCl9KTtcbiAgICAgICAgZG9tLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJicnVzaFwiKVxuICAgICAgICAgICAgLmNhbGwodGhlQnJ1c2gpO1xuICAgIH1cblxuICAgIHpvb20oZG9tLCB0aGVCcnVzaCl7XG4gICAgICAgIGxldCBzID0gZXZlbnQuc2VsZWN0aW9uLFxuICAgICAgICAgICAgaWRlbFRpbWVvdXQsXG4gICAgICAgICAgICBpZGVsRGVsYXkgPSAzNTA7XG4gICAgICAgIGlmICh0aGVCcnVzaCA9PT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghcykge1xuICAgICAgICAgICAgaWYgKCFpZGVsVGltZW91dCkgcmV0dXJuIGlkZWxUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWRlbFRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgfSwgaWRlbERlbGF5KTtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcblxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gcmVzZXQgdGhlIGN1cnJlbnQgc2NhbGVzJyBkb21haW5zIGJhc2VkIG9uIHRoZSBicnVzaGVkIHdpbmRvd1xuICAgICAgICAgICAgdGhpcy5zY2FsZS54LmRvbWFpbih0aGlzLnNjYWxlLnguZG9tYWluKCkuZmlsdGVyKChkLCBpKT0+e1xuICAgICAgICAgICAgICAgICAgY29uc3QgbG93Qm91bmQgPSBNYXRoLmZsb29yKHNbMF1bMF0vdGhpcy5zY2FsZS54LmJhbmR3aWR0aCgpKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHVwcGVyQm91bmQgPSBNYXRoLmZsb29yKHNbMV1bMF0vdGhpcy5zY2FsZS54LmJhbmR3aWR0aCgpKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBpID49IGxvd0JvdW5kICYmIGkgPD11cHBlckJvdW5kO1xuICAgICAgICAgICAgfSkpOyAvLyBUT0RPOiBhZGQgY29tbWVudHNcblxuICAgICAgICAgICAgY29uc3QgbWluID0gTWF0aC5mbG9vcih0aGlzLnNjYWxlLnkuaW52ZXJ0KHNbMV1bMV0pKTtcbiAgICAgICAgICAgIGNvbnN0IG1heCA9IE1hdGguZmxvb3IodGhpcy5zY2FsZS55LmludmVydChzWzBdWzFdKSk7XG4gICAgICAgICAgICB0aGlzLnNjYWxlLnkuZG9tYWluKFttaW4sIG1heF0pOyAvLyB0b2RvOiBkZWJ1Z1xuXG4gICAgICAgICAgICBkb20uc2VsZWN0KFwiLmJydXNoXCIpLmNhbGwodGhlQnJ1c2gubW92ZSwgbnVsbCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgICAvLyB6b29tXG4gICAgICAgIGxldCB0ID0gZG9tLnRyYW5zaXRpb24oKS5kdXJhdGlvbig3NTApO1xuICAgICAgICBkb20uc2VsZWN0KFwiLmF4aXMtLXhcIikudHJhbnNpdGlvbih0KS5jYWxsKHRoaXMueEF4aXMpO1xuICAgICAgICBkb20uc2VsZWN0KFwiLmF4aXMtLXlcIikudHJhbnNpdGlvbih0KS5jYWxsKHRoaXMueUF4aXMpO1xuXG4gICAgICAgIHRoaXMuZ3JvdXBzLmZvckVhY2goKGdnLCBpKT0+IHtcbiAgICAgICAgICAgIGxldCBncm91cCA9IGdnLmtleTtcbiAgICAgICAgICAgIGxldCBlbnRyaWVzID0gZ2cudmFsdWVzO1xuXG4gICAgICAgICAgICAvLyByZS1kZWZpbmUgdGhlIHN1YngncyByYW5nZVxuICAgICAgICAgICAgdGhpcy5zY2FsZS5zdWJ4XG4gICAgICAgICAgICAgICAgLnJhbmdlUm91bmQoW3RoaXMuc2NhbGUueChncm91cCksIHRoaXMuc2NhbGUueChncm91cCkgKyB0aGlzLnNjYWxlLnguYmFuZHdpZHRoKCldKTtcblxuICAgICAgICAgICAgZW50cmllcy5mb3JFYWNoKChlbnRyeSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICgwID09IGVudHJ5LnZhbHVlcy5sZW5ndGgpIHJldHVybjsgLy8gbm8gZnVydGhlciByZW5kZXJpbmcgaWYgdGhpcyBncm91cCBoYXMgbm8gZW50cmllc1xuICAgICAgICAgICAgICAgIGNvbnN0IGdJbmRleCA9IHRoaXMuc2NhbGUueC5kb21haW4oKS5pbmRleE9mKGdyb3VwKTtcblxuXG4gICAgICAgICAgICAgICAgLy8gcmUtZGVmaW5lIHRoZSBzY2FsZS56J3MgcmFuZ2VcbiAgICAgICAgICAgICAgICB0aGlzLnNjYWxlLnpcbiAgICAgICAgICAgICAgICAgICAgLnJhbmdlKFt0aGlzLnNjYWxlLnN1YngoZW50cnkubGFiZWwpLCB0aGlzLnNjYWxlLnN1YngoZW50cnkubGFiZWwpICsgdGhpcy5zY2FsZS5zdWJ4LmJhbmR3aWR0aCgpXSk7XG5cbiAgICAgICAgICAgICAgICAvLyByZS1yZW5kZXIgdGhlIHZpb2xpblxuICAgICAgICAgICAgICAgIGNvbnN0IGcgPSBkb20uc2VsZWN0KGAjdmlvbGluJHtnZy5pbmRleH0tJHtlbnRyeS5sYWJlbH1gKTtcbiAgICAgICAgICAgICAgICBnLnNlbGVjdChcIi52aW9saW5cIilcbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24odClcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJkXCIsIGFyZWEoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLngwKChkKSA9PiB0aGlzLnNjYWxlLnooZFsxXSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAueDEoKGQpID0+IHRoaXMuc2NhbGUueigtZFsxXSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAueSgoZCkgPT4gdGhpcy5zY2FsZS55KGRbMF0pKVxuICAgICAgICAgICAgICAgICAgICApO1xuXG5cbiAgICAgICAgICAgICAgICAvLyByZS1yZW5kZXIgdGhlIGJveCBwbG90XG4gICAgICAgICAgICAgICAgLy8gaW50ZXJxdWFydGlsZSByYW5nZVxuICAgICAgICAgICAgICAgIGNvbnN0IHExID0gcXVhbnRpbGUoZW50cnkudmFsdWVzLCAwLjI1KTtcbiAgICAgICAgICAgICAgICBjb25zdCBxMyA9IHF1YW50aWxlKGVudHJ5LnZhbHVlcywgMC43NSk7XG4gICAgICAgICAgICAgICAgY29uc3QgeiA9IDAuMTtcbiAgICAgICAgICAgICAgICBnLnNlbGVjdChcIi52aW9saW4taXJcIilcbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24odClcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHRoaXMuc2NhbGUueigteikpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCB0aGlzLnNjYWxlLnkocTMpKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIE1hdGguYWJzKHRoaXMuc2NhbGUueigteikgLSB0aGlzLnNjYWxlLnooeikpKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBNYXRoLmFicyh0aGlzLnNjYWxlLnkocTMpIC0gdGhpcy5zY2FsZS55KHExKSkpO1xuXG4gICAgICAgICAgICAgICAgLy8gdGhlIG1lZGlhbiBsaW5lXG4gICAgICAgICAgICAgICAgY29uc3QgbWVkID0gbWVkaWFuKGVudHJ5LnZhbHVlcyk7XG4gICAgICAgICAgICAgICAgZy5zZWxlY3QoXCIudmlvbGluLW1lZGlhblwiKVxuICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbih0KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIHRoaXMuc2NhbGUueigteikpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdGhpcy5zY2FsZS56KHopKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIHRoaXMuc2NhbGUueShtZWQpKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIHRoaXMuc2NhbGUueShtZWQpKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVuZGVyIHRoZSB2aW9saW4gYW5kIGJveCBwbG90c1xuICAgICAqIEBwYXJhbSBkb20ge0QzIERPTX1cbiAgICAgKiBAcGFyYW0gZW50cnkge09iamVjdH0gd2l0aCBhdHRyczogdmFsdWVzLCBsYWJlbFxuICAgICAqIEBwYXJhbSBzaG93V2hpc2tlciB7Qm9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9kcmF3VmlvbGluKGRvbSwgZW50cnksIHNob3dXaGlza2VyLCBnSW5kZXgpe1xuXG4gICAgICAgIC8vIGdlbmVyYXRlIHRoZSB2ZXJ0aWNlcyBmb3IgdGhlIHZpb2xpbiBwYXRoIHVzZSBhIGtkZVxuICAgICAgICBsZXQga2RlID0ga2VybmVsRGVuc2l0eUVzdGltYXRvcihcbiAgICAgICAgICAgIGtlcm5lbC5nYXVzc2lhbixcbiAgICAgICAgICAgIHRoaXMuc2NhbGUueS50aWNrcygxMDApLCAvLyB1c2UgdXAgdG8gMTAwIHZlcnRpY2VzIGFsb25nIHRoZSBZIGF4aXMgKHRvIGNyZWF0ZSB0aGUgdmlvbGluIHBhdGgpXG4gICAgICAgICAgICBrZXJuZWxCYW5kd2lkdGgubnJkKGVudHJ5LnZhbHVlcykgLy8gZXN0aW1hdGUgdGhlIGJhbmR3aWR0aCBiYXNlZCBvbiB0aGUgZGF0YVxuICAgICAgICApO1xuICAgICAgICBjb25zdCBlRG9tYWluID0gZXh0ZW50KGVudHJ5LnZhbHVlcyk7IC8vIGdldCB0aGUgbWF4IGFuZCBtaW4gaW4gZW50cnkudmFsdWVzXG4gICAgICAgIGNvbnN0IHZlcnRpY2VzID0ga2RlKGVudHJ5LnZhbHVlcykuZmlsdGVyKChkKT0+ZFswXT5lRG9tYWluWzBdJiZkWzBdPGVEb21haW5bMV0pOyAvLyBmaWx0ZXIgdGhlIHZlcnRpY2VzIHRoYXQgYXJlbid0IGluIHRoZSBlbnRyeS52YWx1ZXNcblxuICAgICAgICAvLyBkZWZpbmUgdGhlIHogc2NhbGUgLS0gdGhlIHZpb2xpbiB3aWR0aFxuICAgICAgICBsZXQgek1heCA9IG1heCh2ZXJ0aWNlcywgKGQpPT5NYXRoLmFicyhkWzFdKSk7IC8vIGZpbmQgdGhlIGFicyh2YWx1ZSkgaW4gZW50cnkudmFsdWVzXG4gICAgICAgIHRoaXMuc2NhbGUuelxuICAgICAgICAgICAgLmRvbWFpbihbLXpNYXgsIHpNYXhdKVxuICAgICAgICAgICAgLnJhbmdlKFt0aGlzLnNjYWxlLnN1YngoZW50cnkubGFiZWwpLCB0aGlzLnNjYWxlLnN1YngoZW50cnkubGFiZWwpICsgdGhpcy5zY2FsZS5zdWJ4LmJhbmR3aWR0aCgpXSk7XG5cbiAgICAgICAgLy8gdmlzdWFsIHJlbmRlcmluZ1xuICAgICAgICBjb25zdCB2aW9saW5HID0gZG9tLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGB2aW9saW4ke2dJbmRleH0tJHtlbnRyeS5sYWJlbH1gKTtcblxuICAgICAgICBsZXQgdmlvbGluID0gYXJlYSgpXG4gICAgICAgICAgICAueDAoKGQpID0+IHRoaXMuc2NhbGUueihkWzFdKSlcbiAgICAgICAgICAgIC54MSgoZCkgPT4gdGhpcy5zY2FsZS56KC1kWzFdKSlcbiAgICAgICAgICAgIC55KChkKSA9PiB0aGlzLnNjYWxlLnkoZFswXSkpO1xuXG4gICAgICAgIGNvbnN0IHZQYXRoID0gdmlvbGluRy5hcHBlbmQoXCJwYXRoXCIpXG4gICAgICAgICAgICAuZGF0dW0odmVydGljZXMpXG4gICAgICAgICAgICAuYXR0cihcImRcIiwgdmlvbGluKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2aW9saW5cIiwgdHJ1ZSlcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgKCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkuY29sb3IgIT09IHVuZGVmaW5lZCkgcmV0dXJuIGVudHJ5LmNvbG9yO1xuICAgICAgICAgICAgICAgIC8vIGFsdGVybmF0ZSB0aGUgb2RkIGFuZCBldmVuIGNvbG9ycywgbWF5YmUgd2UgZG9uJ3Qgd2FudCB0aGlzIGZlYXR1cmVcbiAgICAgICAgICAgICAgICBpZihnSW5kZXglMiA9PSAwKSByZXR1cm4gXCIjOTBjMWMxXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiIzk0YThiOFwiO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gYm94cGxvdFxuICAgICAgICBjb25zdCBxMSA9IHF1YW50aWxlKGVudHJ5LnZhbHVlcywgMC4yNSk7XG4gICAgICAgIGNvbnN0IHEzID0gcXVhbnRpbGUoZW50cnkudmFsdWVzLCAwLjc1KTtcbiAgICAgICAgY29uc3QgeiA9IHRoaXMuc2NhbGUuei5kb21haW4oKVsxXS8zO1xuXG4gICAgICAgIGlmKHNob3dXaGlza2VyKXtcbiAgICAgICAgICAgIC8vIHRoZSB1cHBlciBhbmQgbG93ZXIgbGltaXRzIG9mIGVudHJ5LnZhbHVlc1xuICAgICAgICAgICAgY29uc3QgaXFyID0gTWF0aC5hYnMocTMtcTEpO1xuICAgICAgICAgICAgY29uc3QgdXBwZXIgPSBtYXgoZW50cnkudmFsdWVzLmZpbHRlcigoZCk9PmQ8cTMrKGlxcioxLjUpKSk7XG4gICAgICAgICAgICBjb25zdCBsb3dlciA9IG1pbihlbnRyeS52YWx1ZXMuZmlsdGVyKChkKT0+ZD5xMS0oaXFyKjEuNSkpKTtcbiAgICAgICAgICAgIGRvbS5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ3aGlza2VyXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCB0aGlzLnNjYWxlLnooMCkpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCB0aGlzLnNjYWxlLnooMCkpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCB0aGlzLnNjYWxlLnkodXBwZXIpKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgdGhpcy5zY2FsZS55KGxvd2VyKSlcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2VcIiwgXCIjZmZmXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaW50ZXJxdWFydGlsZSByYW5nZVxuICAgICAgICB2aW9saW5HLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCB0aGlzLnNjYWxlLnooLXopKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIHRoaXMuc2NhbGUueShxMykpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIE1hdGguYWJzKHRoaXMuc2NhbGUueigteiktdGhpcy5zY2FsZS56KHopKSlcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIE1hdGguYWJzKHRoaXMuc2NhbGUueShxMykgLSB0aGlzLnNjYWxlLnkocTEpKSlcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ2aW9saW4taXJcIik7XG5cbiAgICAgICAgLy8gbWVkaWFuXG4gICAgICAgIGNvbnN0IG1lZCA9IG1lZGlhbihlbnRyeS52YWx1ZXMpO1xuICAgICAgICB2aW9saW5HLmFwcGVuZChcImxpbmVcIikgLy8gdGhlIG1lZGlhbiBsaW5lXG4gICAgICAgICAgICAuYXR0cihcIngxXCIsIHRoaXMuc2NhbGUueigteikpXG4gICAgICAgICAgICAuYXR0cihcIngyXCIsIHRoaXMuc2NhbGUueih6KSlcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgdGhpcy5zY2FsZS55KG1lZCkpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIHRoaXMuc2NhbGUueShtZWQpKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInZpb2xpbi1tZWRpYW5cIik7XG5cbiAgICAgICAgLy8gbW91c2UgZXZlbnRzXG4gICAgICAgIHZpb2xpbkcub24oXCJtb3VzZW92ZXJcIiwgKCk9PntcbiAgICAgICAgICAgIHZQYXRoLmNsYXNzZWQoXCJoaWdobGlnaHRlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVudHJ5KTtcbiAgICAgICAgICAgIGlmKHRoaXMudG9vbHRpcCA9PT0gdW5kZWZpbmVkKSBjb25zb2xlLndhcm4oXCJHcm91cFZpb2xpbiBXYXJuaW5nOiB0b29sdGlwIG5vdCBkZWZpbmVkXCIpO1xuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b29sdGlwLnNob3coXG4gICAgICAgICAgICAgICAgICAgIGVudHJ5Lmdyb3VwICsgXCI8YnIvPlwiICtcbiAgICAgICAgICAgICAgICAgICAgZW50cnkubGFiZWwgKyBcIjxici8+XCIgK1xuICAgICAgICAgICAgICAgICAgICBcIk1lZGlhbjogXCIgKyBtZWQudG9QcmVjaXNpb24oNCkgKyBcIjxici8+XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdmlvbGluRy5vbihcIm1vdXNlb3V0XCIsICgpPT57XG4gICAgICAgICAgICB2UGF0aC5jbGFzc2VkKFwiaGlnaGxpZ2h0ZWRcIiwgZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBfc2FuaXR5Q2hlY2soZGF0YSl7XG4gICAgICAgIGNvbnN0IGF0dHIgPSBbXCJncm91cFwiLCBcImxhYmVsXCIsIFwidmFsdWVzXCJdO1xuXG4gICAgICAgIGRhdGEuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICAgICAgYXR0ci5mb3JFYWNoKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGRbYV0gPT09IHVuZGVmaW5lZCkgdGhyb3cgXCJHcm91cGVkVmlvbGluOiBpbnB1dCBkYXRhIGVycm9yLlwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIGlmICgwID09IGQudmFsdWVzLmxlbmd0aCkgdGhyb3cgXCJWaW9saW46IElucHV0IGRhdGEgZXJyb3JcIjtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgX2FkZEdyb3VwRGl2aWRlcihkb20pe1xuICAgICAgICBjb25zdCBncm91cHMgPSB0aGlzLnNjYWxlLnguZG9tYWluKCk7XG4gICAgICAgIGNvbnN0IHBhZGRpbmcgPSBNYXRoLmFicyh0aGlzLnNjYWxlLngodGhpcy5zY2FsZS54LmRvbWFpbigpWzFdKSAtIHRoaXMuc2NhbGUueCh0aGlzLnNjYWxlLnguZG9tYWluKClbMF0pIC0gdGhpcy5zY2FsZS54LmJhbmR3aWR0aCgpKTtcblxuICAgICAgICBjb25zdCBnZXRYID0gKGcsIGkpPT4ge1xuICAgICAgICAgICAgaWYgKGkgIT09IGdyb3Vwcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2NhbGUueChnKSArICt0aGlzLnNjYWxlLnguYmFuZHdpZHRoKCkgKyAocGFkZGluZy8yKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZG9tLnNlbGVjdEFsbChcIi52bGluZVwiKS5kYXRhKGdyb3VwcylcbiAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2bGluZVwiLCB0cnVlKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCBnZXRYKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCBnZXRYKVxuICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCB0aGlzLnNjYWxlLnkucmFuZ2UoKVswXSlcbiAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgdGhpcy5zY2FsZS55LnJhbmdlKClbMV0pXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgKGcsIGkpPT5pIT1ncm91cHMubGVuZ3RoLTE/MTowKVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIFwicmdiKDg2LDk4LDEwNylcIilcbiAgICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIiwgMC41KVxuXG4gICAgfVxuXG5cbn0iLCJcInVzZSBzdHJpY3RcIjtcbmV4cG9ydCBmdW5jdGlvbiBnZXRHdGV4VXJscygpe1xuICAgIGNvbnN0IGhvc3QgPSAnaHR0cHM6Ly9ndGV4cG9ydGFsLm9yZy9yZXN0L3YxLyc7IC8vIE5PVEU6IHRvcCBleHByZXNzZWQgZ2VuZXMgYXJlIG5vdCB5ZXQgaW4gcHJvZHVjdGlvblxuICAgIHJldHVybiB7XG4gICAgICAgIGR5bmVxdGw6IGhvc3QgKyAnYXNzb2NpYXRpb24vZHluZXF0bCcsXG5cbiAgICAgICAgZXhvbkV4cDogaG9zdCArICdleHByZXNzaW9uL21lZGlhbkV4b25FeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmhjbHVzdGVyPXRydWUmZ2VuY29kZUlkPScsXG5cbiAgICAgICAgZ2VuZUlkOiBob3N0ICsgJ3JlZmVyZW5jZS9nZW5lSWQ/Zm9ybWF0PWpzb24mcmVsZWFzZT12NyZnZW5lSWQ9JyxcbiAgICAgICAgZ2VuZUV4cDogaG9zdCArICdleHByZXNzaW9uL2dlbmVFeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmdlbmNvZGVJZD0nLFxuICAgICAgICBnZW5lTW9kZWw6IGhvc3QgKyAncmVmZXJlbmNlL2NvbGxhcHNlZEdlbmVNb2RlbD91bmZpbHRlcmVkPWZhbHNlJnJlbGVhc2U9djcmZ2VuZUlkPScsXG4gICAgICAgIGdlbmVNb2RlbFVuZmlsdGVyZWQ6IGhvc3QgKyAncmVmZXJlbmNlL2NvbGxhcHNlZEdlbmVNb2RlbD91bmZpbHRlcmVkPXRydWUmcmVsZWFzZT12NyZnZW5lSWQ9JyxcblxuICAgICAgICBpc29mb3JtOiBob3N0ICsgJ3JlZmVyZW5jZS90cmFuc2NyaXB0P3JlbGVhc2U9djcmZ2VuY29kZV9pZD0nLFxuICAgICAgICBpc29mb3JtRXhwOiBob3N0ICsgJ2V4cHJlc3Npb24vaXNvZm9ybUV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmYm94cGxvdERldGFpbD1tZWRpYW4mZ2VuY29kZUlkPScsXG5cbiAgICAgICAganVuY3Rpb25FeHA6IGhvc3QgKyAnZXhwcmVzc2lvbi9tZWRpYW5KdW5jdGlvbkV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmaGNsdXN0ZXI9dHJ1ZSZnZW5jb2RlSWQ9JyxcblxuICAgICAgICBtZWRFeHBCeUlkOiBob3N0ICsgJ2V4cHJlc3Npb24vbWVkaWFuR2VuZUV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmaGNsdXN0ZXI9dHJ1ZSZwYWdlX3NpemU9MTAwMDAmZ2VuY29kZUlkPScsXG5cbiAgICAgICAgc2FtcGxlOiAnZGF0YS9ndGV4LlNhbXBsZS5jc3YnLFxuICAgICAgICBzbnA6IGhvc3QgKyAncmVmZXJlbmNlL3NucD9yZWZlcmVuY2U9Y3VycmVudCZmb3JtYXQ9anNvbiZzbnBJZD0nLFxuXG4gICAgICAgIHRpc3N1ZTogIGhvc3QgKyAnZGF0YXNldC90aXNzdWVJbmZvJyxcbiAgICAgICAgdGlzc3VlU2l0ZXM6IGhvc3QgKyAnZGF0YXNldC90aXNzdWVTaXRlRGV0YWlsP2Zvcm1hdD1qc29uJyxcblxuICAgICAgICB0b3BJblRpc3N1ZUZpbHRlcmVkOiBob3N0ICsgJ2V4cHJlc3Npb24vdG9wRXhwcmVzc2VkR2VuZXM/ZGF0YXNldElkPWd0ZXhfdjcmZmlsdGVyTXRHZW5lPXRydWUmc29ydF9ieT1tZWRpYW4mc29ydERpcmVjdGlvbj1kZXNjJnBhZ2Vfc2l6ZT01MCZ0aXNzdWVJZD0nLFxuICAgICAgICB0b3BJblRpc3N1ZTogaG9zdCArICdleHByZXNzaW9uL3RvcEV4cHJlc3NlZEdlbmVzP2RhdGFzZXRJZD1ndGV4X3Y3JnNvcnRfYnk9bWVkaWFuJnNvcnREaXJlY3Rpb249ZGVzYyZwYWdlX3NpemU9NTAmdGlzc3VlSWQ9JyxcblxuICAgICAgICB2YXJpYW50SWQ6IGhvc3QgKyAncmVmZXJlbmNlL3NucD9mb3JtYXQ9anNvbiZyZWZlcmVuY2U9Y3VycmVudCZyZWxlYXNlPXY3JnZhcmlhbnRJZD0nLFxuXG4gICAgICAgIC8vIGxvY2FsIHN0YXRpYyBmaWxlc1xuICAgICAgICBybmFzZXFDcmFtOiAnZGF0YS9ybmFzZXFfY3JhbV9maWxlc192N19kYkdhUF8wMTE1MTYudHh0JyxcbiAgICAgICAgd2dzQ3JhbTogJ2RhdGEvd2dzX2NyYW1fZmlsZXNfdjdfaGczOF9kYkdhUF8wMTE1MTYudHh0JyxcblxuICAgIH1cbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2VuZXMgZnJvbSBHVEV4IHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBnZW5lc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VHZW5lcyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gJ2dlbmVJZCc7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdHZW5lIHdlYiBzZXJ2aWNlIHBhcnNpbmcgZXJyb3InO1xuICAgIHJldHVybiBkYXRhW2F0dHJdO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSB0aXNzdWVzXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEByZXR1cm5zIHtMaXN0fSBvZiB0aXNzdWVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRpc3N1ZXMoZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9ICd0aXNzdWVJbmZvJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZVRpc3N1ZXMgaW5wdXQgZXJyb3IuJztcbiAgICBjb25zdCB0aXNzdWVzID0gZGF0YVthdHRyXTtcblxuICAgIC8vIHNhbml0eSBjaGVja1xuICAgIFsndGlzc3VlSWQnLCAndGlzc3VlTmFtZScsICdjb2xvckhleCddLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICghdGlzc3Vlc1swXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZVRpc3N1ZSBhdHRyIG5vdCBmb3VuZDogJyArIGQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGlzc3Vlcztcbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgdGlzc3VlIGdyb3Vwc1xuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiBAcGFyYW0gZm9yRXF0bCB7Qm9vbGVhbn1cbiAqIEByZXR1cm5zIHtEaWN0aW9uYXJ5fSBvZiBsaXN0cyBvZiB0aXNzdWVzIGluZGV4ZWQgYnkgdGhlIHRpc3N1ZSBncm91cCBuYW1lXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRpc3N1ZVNpdGVzKGRhdGEsIGZvckVxdGw9ZmFsc2Upe1xuICAgIC8vIHRoZSBsaXN0IG9mIGludmFsaWRlIGVxdGwgdGlzc3VlcyBkdWUgdG8gc2FtcGxlIHNpemUgPCA3MFxuICAgIC8vIGEgaGFyZC1jb2RlZCBsaXN0IGJlY2F1c2UgdGhlIHNhbXBsZSBzaXplIGlzIG5vdCBlYXN5IHRvIHJldHJpZXZlXG4gICAgY29uc3QgaW52YWxpZFRpc3N1ZXMgPSBbJ0JsYWRkZXInLCAnQ2Vydml4X0VjdG9jZXJ2aXgnLCAnQ2Vydml4X0VuZG9jZXJ2aXgnLCAnRmFsbG9waWFuX1R1YmUnLCAnS2lkbmV5X0NvcnRleCddO1xuXG4gICAgY29uc3QgYXR0ciA9ICd0aXNzdWVTaXRlRGV0YWlsJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZVRpc3N1ZVNpdGVzIGlucHV0IGVycm9yLic7XG4gICAgY29uc3QgdGlzc3VlcyA9IGZvckVxdGw9PWZhbHNlP2RhdGFbYXR0cl06ZGF0YVthdHRyXS5maWx0ZXIoKGQpPT57cmV0dXJuICFpbnZhbGlkVGlzc3Vlcy5pbmNsdWRlcyhkLnRpc3N1ZV9zaXRlX2RldGFpbF9pZCl9KTsgLy8gYW4gYXJyYXkgb2YgdGlzc3VlX3NpdGVfZGV0YWlsIG9iamVjdHNcblxuICAgIC8vIGJ1aWxkIHRoZSB0aXNzdWVHcm91cHMgbG9va3VwIGRpY3Rpb25hcnkgaW5kZXhlZCBieSB0aGUgdGlzc3VlIGdyb3VwIG5hbWUgKGkuZS4gdGhlIHRpc3N1ZSBtYWluIHNpdGUgbmFtZSlcbiAgICBbJ3Rpc3N1ZV9zaXRlJywgJ3Rpc3N1ZV9zaXRlX2RldGFpbF9pZCcsICd0aXNzdWVfc2l0ZV9kZXRhaWwnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIXRpc3N1ZXNbMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93IGBwYXJzZVRpc3N1ZVNpdGVzIGF0dHIgZXJyb3IuICR7ZH0gaXMgbm90IGZvdW5kYDtcbiAgICB9KTtcbiAgICBsZXQgdGlzc3VlR3JvdXBzID0gdGlzc3Vlcy5yZWR1Y2UoKGFyciwgZCk9PntcbiAgICAgICAgbGV0IGdyb3VwTmFtZSA9IGQudGlzc3VlX3NpdGU7XG4gICAgICAgIGxldCBzaXRlID0ge1xuICAgICAgICAgICAgaWQ6IGQudGlzc3VlX3NpdGVfZGV0YWlsX2lkLFxuICAgICAgICAgICAgbmFtZTogZC50aXNzdWVfc2l0ZV9kZXRhaWxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFhcnIuaGFzT3duUHJvcGVydHkoZ3JvdXBOYW1lKSkgYXJyW2dyb3VwTmFtZV0gPSBbXTsgLy8gaW5pdGlhdGUgYW4gYXJyYXlcbiAgICAgICAgYXJyW2dyb3VwTmFtZV0ucHVzaChzaXRlKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LCB7fSk7XG5cbiAgICAvLyBtb2RpZnkgdGhlIHRpc3N1ZSBncm91cHMgdGhhdCBoYXZlIG9ubHkgYSBzaW5nbGUgc2l0ZVxuICAgIC8vIGJ5IHJlcGxhY2luZyB0aGUgZ3JvdXAncyBuYW1lIHdpdGggdGhlIHNpbmdsZSBzaXRlJ3MgbmFtZSAtLSBmb3IgYSBiZXR0ZXIgQWxwaGFiZXRpY2FsIG9yZGVyIG9mIHRoZSB0aXNzdWUgZ3JvdXBzXG5cbiAgICBPYmplY3Qua2V5cyh0aXNzdWVHcm91cHMpLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICh0aXNzdWVHcm91cHNbZF0ubGVuZ3RoID09IDEpeyAvLyBhIHNpbmdsZS1zaXRlIGdyb3VwXG4gICAgICAgICAgICBsZXQgc2l0ZSA9IHRpc3N1ZUdyb3Vwc1tkXVswXTsgLy8gdGhlIHNpbmdsZSBzaXRlXG4gICAgICAgICAgICBkZWxldGUgdGlzc3VlR3JvdXBzW2RdOyAvLyByZW1vdmUgdGhlIG9sZCBncm91cCBpbiB0aGUgZGljdGlvbmFyeVxuICAgICAgICAgICAgdGlzc3VlR3JvdXBzW3NpdGUubmFtZV0gPSBbc2l0ZV07IC8vIGNyZWF0ZSBhIG5ldyBncm91cCB3aXRoIHRoZSBzaXRlJ3MgbmFtZVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGlzc3VlR3JvdXBzO1xuXG59XG5cblxuXG4vKipcbiAqIHBhcnNlIHRoZSBleG9uc1xuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgZXhvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRXhvbnMoZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9ICdjb2xsYXBzZWRHZW5lTW9kZWwnO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAnRmF0YWwgRXJyb3I6IHBhcnNlRXhvbnMgaW5wdXQgZXJyb3IuJyArIGRhdGE7XG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgWydmZWF0dXJlVHlwZScsICdzdGFydCcsICdlbmQnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWRhdGFbYXR0cl1bMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2VFeG9ucyBhdHRyIG5vdCBmb3VuZDogJyArIGQ7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl0uZmlsdGVyKChkKT0+ZC5mZWF0dXJlVHlwZSA9PSAnZXhvbicpLm1hcCgoZCk9PntcbiAgICAgICAgZC5jaHJvbVN0YXJ0ID0gZC5zdGFydDtcbiAgICAgICAgZC5jaHJvbUVuZCA9IGQuZW5kO1xuICAgICAgICByZXR1cm4gZDtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSB0aGUganVuY3Rpb25zXG4gKiBAcGFyYW0gZGF0YVxuICogQHJldHVybnMge0xpc3R9IG9mIGp1bmN0aW9uc1xuICogLy8gd2UgZG8gbm90IHN0b3JlIGp1bmN0aW9uIHN0cnVjdHVyZSBhbm5vdGF0aW9ucyBpbiBNb25nb1xuICAgIC8vIHNvIGhlcmUgd2UgdXNlIHRoZSBqdW5jdGlvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlIHRvIHJldHJpZXZlIHRoZSBqdW5jdGlvbiBnZW5vbWljIGxvY2F0aW9uc1xuICAgIC8vIGFzc3VtaW5nIHRoYXQgZWFjaCB0aXNzdWUgaGFzIHRoZSBzYW1lIGp1bmN0aW9ucyxcbiAgICAvLyB0byBncmFiIGFsbCB0aGUga25vd24ganVuY3Rpb25zIG9mIGEgZ2VuZSwgd2Ugb25seSBuZWVkIHRvIGxvb2sgYXQgb25lIHRpc3N1ZVxuICAgIC8vIGhlcmUgd2UgYXJiaXRyYXJpbHkgcGljayBMaXZlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnVuY3Rpb25zKGRhdGEpe1xuXG4gICAgY29uc3QgYXR0ciA9ICdtZWRpYW5KdW5jdGlvbkV4cHJlc3Npb24nO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAnRmF0YWwgRXJyb3I6IHBhcnNlSnVuY3Rpb25zIGlucHV0IGVycm9yLiAnICsgZGF0YTtcbiAgICByZXR1cm4gZGF0YVthdHRyXS5maWx0ZXIoKGQpPT5kLnRpc3N1ZUlkPT0nTGl2ZXInKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zID0gZC5qdW5jdGlvbklkLnNwbGl0KCdfJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNocm9tOiBwb3NbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb21TdGFydDogcG9zWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNocm9tRW5kOiBwb3NbMl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganVuY3Rpb25JZDogZC5qdW5jdGlvbklkXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xufVxuXG4vKipcbiAqIHBhcnNlIHRyYW5zY3JpcHQgaXNvZm9ybXMgZnJvbSB0aGUgR1RFeCB3ZWIgc2VydmljZTogJ3JlZmVyZW5jZS90cmFuc2NyaXB0P3JlbGVhc2U9djcmZ2VuY29kZV9pZD0nXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIHJldHVybnMgYSBkaWN0aW9uYXJ5IG9mIHRyYW5zY3JpcHQgZXhvbiBvYmplY3QgbGlzdHMgaW5kZXhlZCBieSBFTlNUIElEc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VJc29mb3JtRXhvbnMoZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9ICd0cmFuc2NyaXB0JztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ3BhcnNlSXNvZm9ybXMgaW5wdXQgZXJyb3IgJyArIGRhdGE7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl0uZmlsdGVyKChkKT0+e3JldHVybiAnZXhvbicgPT0gZC5mZWF0dXJlVHlwZX0pXG4gICAgICAgIC5yZWR1Y2UoKGEsIGQpPT57XG4gICAgICAgIGlmIChhW2QudHJhbnNjcmlwdElkXSA9PT0gdW5kZWZpbmVkKSBhW2QudHJhbnNjcmlwdElkXSA9IFtdO1xuICAgICAgICBhW2QudHJhbnNjcmlwdElkXS5wdXNoKGQpO1xuICAgICAgICByZXR1cm4gYTtcbiAgICB9LCB7fSk7XG59XG5cbi8qKlxuICogcGFyc2UgdHJhbnNjcmlwdCBpc29mb3Jtc1xuICogQHBhcmFtIGRhdGEge0pzb259IGZyb20gR1RFeCB3ZWIgc2VydmljZSAncmVmZXJlbmNlL3RyYW5zY3JpcHQ/cmVsZWFzZT12NyZnZW5jb2RlX2lkPSdcbiAqIHJldHVybnMgYSBsaXN0IG9mIGlzb2Zvcm0gb2JqZWN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VJc29mb3JtcyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gJ3RyYW5zY3JpcHQnO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdygncGFyc2VJc29mb3JtcyBpbnB1dCBlcnJvcicpO1xuICAgIHJldHVybiBkYXRhW2F0dHJdLmZpbHRlcigoZCk9PntyZXR1cm4gJ3RyYW5zY3JpcHQnID09IGQuZmVhdHVyZVR5cGV9KS5zb3J0KChhLCBiKT0+e1xuICAgICAgICBjb25zdCBsMSA9IE1hdGguYWJzKGEuY2hyb21FbmQgLSBhLmNocm9tU3RhcnQpICsgMTtcbiAgICAgICAgY29uc3QgbDIgPSBNYXRoLmFicyhiLmNocm9tRW5kIC0gYi5jaHJvbVN0YXJ0KSArIDE7XG4gICAgICAgIHJldHVybiAtKGwxLWwyKTsgLy8gc29ydCBieSBpc29mb3JtIGxlbmd0aCBpbiBkZXNjZW5kaW5nIG9yZGVyXG4gICAgfSk7XG59XG5cbi8qKlxuICogcGFyc2UgZmluYWwgKG1hc2tlZCkgZ2VuZSBtb2RlbCBleG9uIGV4cHJlc3Npb25cbiAqIGV4cHJlc3Npb24gaXMgbm9ybWFsaXplZCB0byByZWFkcyBwZXIga2JcbiAqIEBwYXJhbSBkYXRhIHtKU09OfSBvZiBleG9uIGV4cHJlc3Npb24gd2ViIHNlcnZpY2VcbiAqIEBwYXJhbSBleG9ucyB7TGlzdH0gb2YgZXhvbnMgd2l0aCBwb3NpdGlvbnNcbiAqIEBwYXJhbSB1c2VMb2cge2Jvb2xlYW59IHVzZSBsb2cyIHRyYW5zZm9ybWF0aW9uXG4gKiBAcGFyYW0gYWRqdXN0IHtOdW1iZXJ9IGRlZmF1bHQgMC4wMVxuICogQHJldHVybnMge0xpc3R9IG9mIGV4b24gb2JqZWN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFeG9uRXhwcmVzc2lvbihkYXRhLCBleG9ucywgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBleG9uRGljdCA9IGV4b25zLnJlZHVjZSgoYSwgZCk9PnthW2QuZXhvbklkXSA9IGQ7IHJldHVybiBhO30sIHt9KTtcbiAgICBjb25zdCBhdHRyID0gJ21lZGlhbkV4b25FeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coJ3BhcnNlRXhvbkV4cHJlc3Npb24gaW5wdXQgZXJyb3InKTtcblxuICAgIGNvbnN0IGV4b25PYmplY3RzID0gZGF0YVthdHRyXTtcbiAgICAvLyBlcnJvci1jaGVja2luZ1xuICAgIFsnZGF0YScsICdleG9uSWQnLCAndGlzc3VlSWQnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWV4b25PYmplY3RzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyAnRmF0YWwgRXJyb3I6IHBhcnNlRXhvbkV4cHJlc3Npb24gYXR0ciBub3QgZm91bmQ6ICcgKyBkO1xuICAgIH0pO1xuICAgIC8vIHBhcnNlIEdURXggbWVkaWFuIGV4b24gY291bnRzXG4gICAgZXhvbk9iamVjdHMuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICBjb25zdCBleG9uID0gZXhvbkRpY3RbZC5leG9uSWRdOyAvLyBmb3IgcmV0cmlldmluZyBleG9uIHBvc2l0aW9uc1xuICAgICAgICAvLyBlcnJvci1jaGVja2luZ1xuICAgICAgICBbJ2VuZCcsICdzdGFydCddLmZvckVhY2goKHApPT57XG4gICAgICAgICAgICBpZiAoIWV4b24uaGFzT3duUHJvcGVydHkocCkpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2VFeG9uRXhwcmVzc2lvbiBhdHRyIG5vdCBmb3VuZDogJyArIHA7XG4gICAgICAgIH0pO1xuICAgICAgICBkLmwgPSBleG9uLmVuZCAtIGV4b24uc3RhcnQgKyAxO1xuICAgICAgICBkLnZhbHVlID0gTnVtYmVyKGQuZGF0YSkvZC5sO1xuICAgICAgICBkLm9yaWdpbmFsVmFsdWUgPSBOdW1iZXIoZC5kYXRhKS9kLmw7XG4gICAgICAgIGlmICh1c2VMb2cpIGQudmFsdWUgPSBNYXRoLmxvZzIoZC52YWx1ZSArIDEpO1xuICAgICAgICBkLnggPSBkLmV4b25JZDtcbiAgICAgICAgZC55ID0gZC50aXNzdWVJZDtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkO1xuICAgICAgICBkLmNocm9tU3RhcnQgPSBleG9uLnN0YXJ0O1xuICAgICAgICBkLmNocm9tRW5kID0gZXhvbi5lbmQ7XG4gICAgICAgIGQudW5pdCA9IGQudW5pdCArICcgcGVyIGJhc2UnO1xuICAgIH0pO1xuICAgIHJldHVybiBleG9uT2JqZWN0cy5zb3J0KChhLGIpPT57XG4gICAgICAgIGlmIChhLmNocm9tU3RhcnQ8Yi5jaHJvbVN0YXJ0KSByZXR1cm4gLTE7XG4gICAgICAgIGlmIChhLmNocm9tU3RhcnQ+Yi5jaHJvbVN0YXJ0KSByZXR1cm4gMTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSk7IC8vIHNvcnQgYnkgZ2Vub21pYyBsb2NhdGlvbiBpbiBhc2NlbmRpbmcgb3JkZXJcbn1cblxuLyoqXG4gKiBQYXJzZSBqdW5jdGlvbiBtZWRpYW4gcmVhZCBjb3VudCBkYXRhXG4gKiBAcGFyYW0gZGF0YSB7SlNPTn0gb2YgdGhlIGp1bmN0aW9uIGV4cHJlc3Npb24gd2ViIHNlcnZpY2VcbiAqIEBwYXJhbSB1c2VMb2cge0Jvb2xlYW59IHBlcmZvcm0gbG9nIHRyYW5zZm9ybWF0aW9uXG4gKiBAcGFyYW0gYWRqdXN0IHtOdW1iZXJ9IGZvciBoYW5kbGluZyAwJ3Mgd2hlbiB1c2VMb2cgaXMgdHJ1ZVxuICogQHJldHVybnMge0xpc3R9IG9mIGp1bmN0aW9uIG9iamVjdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnVuY3Rpb25FeHByZXNzaW9uKGRhdGEsIHVzZUxvZz10cnVlLCBhZGp1c3Q9MSl7XG4gICAgY29uc3QgYXR0ciA9ICdtZWRpYW5KdW5jdGlvbkV4cHJlc3Npb24nO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdygncGFyc2VKdW5jdGlvbkV4cHJlc3Npb24gaW5wdXQgZXJyb3InKTtcblxuICAgIGNvbnN0IGp1bmN0aW9ucyA9IGRhdGFbYXR0cl07XG5cbiAgICAvLyBlcnJvci1jaGVja2luZ1xuICAgIFsndGlzc3VlSWQnLCAnanVuY3Rpb25JZCcsICdkYXRhJywgJ2dlbmNvZGVJZCddLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICghanVuY3Rpb25zWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyAnRmF0YWwgRXJyb3I6IHBhcnNlSnVuY3Rpb25FeHByZXNzaW9uIGF0dHIgbm90IGZvdW5kOiAnICsgZDtcbiAgICB9KTtcblxuICAgIC8vIHBhcnNlIEdURXggbWVkaWFuIGp1bmN0aW9uIHJlYWQgY291bnRzXG4gICAganVuY3Rpb25zLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC54ID0gZC5qdW5jdGlvbklkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLm9yaWdpbmFsVmFsdWUgPSBOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkXG4gICAgfSk7XG5cbiAgICAvLyBzb3J0IGJ5IGdlbm9taWMgbG9jYXRpb24gaW4gYXNjZW5kaW5nIG9yZGVyXG4gICAgcmV0dXJuIGp1bmN0aW9ucy5zb3J0KChhLGIpPT57XG4gICAgICAgIGlmIChhLmp1bmN0aW9uSWQ+Yi5qdW5jdGlvbklkKSByZXR1cm4gMTtcbiAgICAgICAgZWxzZSBpZiAoYS5qdW5jdGlvbklkPGIuanVuY3Rpb25JZCkgcmV0dXJuIC0xO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSBpc29mb3JtIGV4cHJlc3Npb25cbiAqIEBwYXJhbSBkYXRhXG4gKiBAcGFyYW0gdXNlTG9nXG4gKiBAcGFyYW0gYWRqdXN0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gJ2lzb2Zvcm1FeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coJ3BhcnNlSXNvZm9ybUV4cHJlc3Npb24gaW5wdXQgZXJyb3InKTtcbiAgICAvLyBwYXJzZSBHVEV4IGlzb2Zvcm0gbWVkaWFuIFRQTVxuICAgIGRhdGFbYXR0cl0uZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICBkLnZhbHVlID0gdXNlTG9nP01hdGgubG9nMTAoTnVtYmVyKGQuZGF0YSArIGFkanVzdCkpOk51bWJlcihkLmRhdGEpO1xuICAgICAgICBkLm9yaWdpbmFsVmFsdWUgPSBOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC54ID0gZC50cmFuc2NyaXB0SWQ7XG4gICAgICAgIGQueSA9IGQudGlzc3VlSWQ7XG4gICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZDtcbiAgICB9KTtcblxuICAgIHJldHVybiBkYXRhW2F0dHJdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VJc29mb3JtRXhwcmVzc2lvblRyYW5zcG9zZShkYXRhLCB1c2VMb2c9dHJ1ZSwgYWRqdXN0PTEpe1xuICAgIGNvbnN0IGF0dHIgPSAnaXNvZm9ybUV4cHJlc3Npb24nO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdygncGFyc2VJc29mb3JtRXhwcmVzc2lvbiBpbnB1dCBlcnJvcicpO1xuICAgIC8vIHBhcnNlIEdURXggaXNvZm9ybSBtZWRpYW4gVFBNXG4gICAgZGF0YVthdHRyXS5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMChOdW1iZXIoZC5kYXRhICsgYWRqdXN0KSk6TnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLmRhdGEpO1xuICAgICAgICBkLnkgPSBkLnRyYW5zY3JpcHRJZDtcbiAgICAgICAgZC54ID0gZC50aXNzdWVJZDtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRhdGFbYXR0cl07XG59XG5cbi8qKlxuICogcGFyc2UgbWVkaWFuIGdlbmUgZXhwcmVzc2lvblxuICogQHBhcmFtIGRhdGEge0pzb259IHdpdGggYXR0ciBtZWRpYW5HZW5lRXhwcmVzc2lvblxuICogQHBhcmFtIHVzZUxvZyB7Qm9vbGVhbn0gcGVyZm9ybXMgbG9nMTAgdHJhbnNmb3JtYXRpb25cbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VNZWRpYW5FeHByZXNzaW9uKGRhdGEsIHVzZUxvZz10cnVlKXtcbiAgICBjb25zdCBhdHRyID0gJ21lZGlhbkdlbmVFeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ3BhcnNlTWVkaWFuRXhwcmVzc2lvbiBpbnB1dCBlcnJvci4nO1xuICAgIGNvbnN0IGFkanVzdCA9IDE7XG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gZ2VuZSBleHByZXNzaW9uXG4gICAgLy8gZXJyb3ItY2hlY2tpbmcgdGhlIHJlcXVpcmVkIGF0dHJpYnV0ZXM6XG4gICAgaWYgKGRhdGFbYXR0cl0ubGVuZ3RoID09IDApIHRocm93ICdwYXJzZU1lZGlhbkV4cHJlc3Npb24gZmluZHMgbm8gZGF0YS4nO1xuICAgIFsnbWVkaWFuJywgJ3Rpc3N1ZUlkJywgJ2dlbmNvZGVJZCddLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICghZGF0YVthdHRyXVswXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgYHBhcnNlTWVkaWFuRXhwcmVzc2lvbiBhdHRyIGVycm9yLiAke2R9IGlzIG5vdCBmb3VuZGA7XG4gICAgfSk7XG4gICAgZGF0YS5tZWRpYW5HZW5lRXhwcmVzc2lvbi5mb3JFYWNoKGZ1bmN0aW9uKGQpe1xuICAgICAgICBkLnZhbHVlID0gdXNlTG9nP01hdGgubG9nMTAoTnVtYmVyKGQubWVkaWFuKSArIGFkanVzdCk6TnVtYmVyKGQubWVkaWFuKTtcbiAgICAgICAgZC54ID0gZC50aXNzdWVJZDtcbiAgICAgICAgZC55ID0gZC5nZW5jb2RlSWQ7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLm1lZGlhbik7XG4gICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZFxuICAgIH0pO1xuICAgIHJldHVybiBkYXRhW2F0dHJdO1xufVxuXG4vKipcbiAqIHBhcnNlIHRoZSBnZW5lIGV4cHJlc3Npb25cbiAqIEBwYXJhbSBnZW5jb2RlSWQge1N0cmluZ31cbiAqIEBwYXJhbSBkYXRhIHtKc29ufSB3aXRoIGF0dHI6IHRpc3N1ZUlkLCBnZW5lU3ltYm9sXG4gKiBAcmV0dXJucyB7e2V4cDoge30sIGdlbmVTeW1ib2w6IHN0cmluZ319XG4gKi9cbi8vIGZ1bmN0aW9uIHBhcnNlR2VuZUV4cHJlc3Npb24oZ2VuY29kZUlkLCBkYXRhKXtcbi8vICAgICBsZXQgbG9va3VwVGFibGUgPSB7XG4vLyAgICAgICAgIGV4cDoge30sIC8vIGluZGV4ZWQgYnkgdGlzc3VlSWRcbi8vICAgICAgICAgZ2VuZVN5bWJvbDogJydcbi8vICAgICB9O1xuLy8gICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAoJ3BhcnNlR2VuZUV4cHJlc3Npb24gaW5wdXQgZXJyb3IuJyk7XG4vLyAgICAgZGF0YVthdHRyXS5mb3JFYWNoKChkKT0+e1xuLy8gICAgICAgICBpZiAoZC5nZW5jb2RlSWQgPT0gZ2VuY29kZUlkKSB7XG4vLyAgICAgICAgICAgICAvLyBpZiB0aGUgZ2VuY29kZSBJRCBtYXRjaGVzIHRoZSBxdWVyeSBnZW5jb2RlSWQsXG4vLyAgICAgICAgICAgICAvLyBhZGQgdGhlIGV4cHJlc3Npb24gZGF0YSB0byB0aGUgbG9va3VwIHRhYmxlXG4vLyAgICAgICAgICAgICBsb29rdXBUYWJsZS5leHBbZC50aXNzdWVJZF0gPSBkLmRhdGE7XG4vLyAgICAgICAgICAgICBpZiAoJycgPT0gbG9va3VwVGFibGUuZ2VuZVN5bWJvbCkgbG9va3VwVGFibGUuZ2VuZVN5bWJvbCA9IGQuZ2VuZVN5bWJvbFxuLy8gICAgICAgICB9XG4vLyAgICAgfSk7XG4vLyAgICAgcmV0dXJuIGxvb2t1cFRhYmxlXG4vLyB9XG5cbi8qKlxuICogcGFyc2UgdGhlIGV4cHJlc3Npb24gZGF0YSBvZiBhIGdlbmUgZm9yIGEgZ3JvdXBlZCB2aW9saW4gcGxvdFxuICogQHBhcmFtIGRhdGEge0pTT059IGZyb20gR1RFeCBnZW5lIGV4cHJlc3Npb24gd2ViIHNlcnZpY2VcbiAqIEBwYXJhbSBjb2xvcnMge0RpY3Rpb25hcnl9IHRoZSB2aW9saW4gY29sb3IgZm9yIGdlbmVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUdlbmVFeHByZXNzaW9uRm9yVmlvbGluKGRhdGEsIHVzZUxvZz10cnVlLCBjb2xvcnM9dW5kZWZpbmVkKXtcbiAgICBjb25zdCBhdHRyID0gJ2dlbmVFeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ3BhcnNlR2VuZUV4cHJlc3Npb25Gb3JWaW9saW4gaW5wdXQgZXJyb3IuJztcbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpPT57XG4gICAgICAgIGQudmFsdWVzID0gdXNlTG9nP2QuZGF0YS5tYXAoKGRkKT0+e3JldHVybiBNYXRoLmxvZzEwKCtkZCsxKX0pOmQuZGF0YTtcbiAgICAgICAgZC5ncm91cCA9IGQudGlzc3VlSWQ7XG4gICAgICAgIGQubGFiZWwgPSBkLmdlbmVTeW1ib2w7XG4gICAgICAgIGQuY29sb3IgPSBjb2xvcnM9PT11bmRlZmluZWQ/JyM5MGMxYzEnOmNvbG9yc1tkLmdlbmNvZGVJZF07XG4gICAgfSk7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl07XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbmltcG9ydCB7anNvbn0gZnJvbSBcImQzLWZldGNoXCI7XG5pbXBvcnQge3NlbGVjdH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHtyYW5nZX0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge2dldEd0ZXhVcmxzLCBwYXJzZVRpc3N1ZXN9IGZyb20gXCIuL2d0ZXhEYXRhUGFyc2VyXCI7XG5cbi8qKlxuICogQ3JlYXRlIHRoZSB0aXNzdWUgKGRhdGFzZXQpIGRyb3Bkb3duIG1lbnUgdXNpbmcgc2VsZWN0MlxuICogQHBhcmFtIGRvbUlkIHtTdHJpbmd9IHRoZSBkb20gSUQgb2YgdGhlIG1lbnVcbiAqIEBwYXJhbSB1cmwge1N0cmluZ30gdGhlIHRpc3N1ZSB3ZWIgc2VydmljZSB1cmxcbiAqIGRlcGVuZGVuY3k6IHNlbGVjdDJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRpc3N1ZU1lbnUoZG9tSWQsIHVybCA9IGdldEd0ZXhVcmxzKCkudGlzc3VlKXtcbiAgICBqc29uKHVybClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0cyl7XG4gICAgICAgICAgICBsZXQgdGlzc3VlcyA9IHBhcnNlVGlzc3VlcyhyZXN1bHRzKTtcbiAgICAgICAgICAgIHRpc3N1ZXMuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICAgICAgICAgIGQuaWQgPSBkLnRpc3N1ZUlkO1xuICAgICAgICAgICAgICAgIGQudGV4dCA9IGQudGlzc3VlTmFtZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGlzc3Vlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYoYS50aXNzdWVOYW1lIDwgYi50aXNzdWVOYW1lKSByZXR1cm4gLTE7XG4gICAgICAgICAgICAgICAgaWYoYS50aXNzdWVOYW1lID4gYi50aXNzdWVOYW1lKSByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBleHRlcm5hbCBsaWJyYXJ5IGRlcGVuZGVuY3k6IHNlbGVjdDJcbiAgICAgICAgICAgICQoYCMke2RvbUlkfWApLnNlbGVjdDIoe1xuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnU2VsZWN0IGEgZGF0YSBzZXQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHRpc3N1ZXNcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpe2NvbnNvbGUuZXJyb3IoZXJyKX0pO1xufVxuXG4vKipcbiAqIEJ1aWxkIHRoZSB0d28tbGV2ZWwgY2hlY2tib3gtc3R5bGUgdGlzc3VlIG1lbnVcbiAqIGRlcGVuZGVuY2llczogZXF0bERhc2hib2FyZC5jc3MgY2xhc3NlcyAvLyB0b2RvOiBtb3ZlIHJlbGF0ZWQgY3NzIHNvbWV3aGVyZSBlbHNlXG4gKiBAcGFyYW0gZ3JvdXBzIHtEaWN0aW9uYXJ5fSBvZiBsaXN0cyBvZiB0aXNzdWVzIGluZGV4ZWQgYnkgdGhlIGdyb3VwIG5hbWUsIHRoaXMgaXMgY3JlYXRlZCBieSBndGV4RGF0YVBhcnNlcjpwYXJzZVRpc3N1ZVNpdGVzKClcbiAqIEBwYXJhbSBkb21JZCB7U3RyaW5nfSA8ZGl2PiBJRFxuICogRGVwZW5kZW5jaWVzOiBqUXVlcnksIEJvb3RzdHJhcCwgZXF0bERhc2hib2FyZC5jc3NcbiAqIHRvZG86IGFkZCByZXNldCBhbmQgc2VsZWN0IGFsbCBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUaXNzdWVHcm91cE1lbnUoZ3JvdXBzLCBkb21JZCl7XG4gICAgY29uc3QgbWFpbkNsYXNzPVwiZWQtdGlzc3VlLW1haW4tbGV2ZWxcIjtcbiAgICBjb25zdCBzdWJDbGFzcyA9IFwiZWQtdGlzc3VlLXN1Yi1sZXZlbFwiO1xuICAgIGNvbnN0IGxhc3RTaXRlQ2xhc3MgPSBcImxhc3Qtc2l0ZVwiO1xuXG4gICAgLy8gZXJhc2UgZXZlcnl0aGluZyBpbiBkb21JZCBpbiBjYXNlIGl0IGlzbid0IGVtcHR5XG4gICAgc2VsZWN0KGAjJHtkb21JZH1gKS5zZWxlY3RBbGwoXCIqXCIpLnJlbW92ZSgpO1xuXG4gICAgLy8gc29ydCB0aGUgdGlzc3VlIGdyb3VwcyBhbHBoYWJldGljYWxseVxuICAgIGxldCBncm91cE5hbWVzID0gT2JqZWN0LmtleXMoZ3JvdXBzKS5zb3J0KCk7XG5cbiAgICAvLyBjcmVhdGUgZm91ciA8ZGl2PiBzZWN0aW9ucyBmb3IgdGhlIHRpc3N1ZSBtZW51XG4gICAgLy8gVE9ETzogZmluZCBhIGJldHRlciB3YXkgdG8gb3JnYW5pemUgdGlzc3VlcyBpbnRvIHNlY3Rpb25zXG4gICAgY29uc3QgJHNlY3Rpb25zID0gcmFuZ2UoMCw0KS5tYXAoKGQpPT57XG4gICAgICAgIHJldHVybiAkKGA8ZGl2IGlkPVwic2VjdGlvbiR7ZH1cIiBjbGFzcz1cImNvbC14cy0xMiBjb2wtbWQtM1wiPmApLmFwcGVuZFRvKCQoYCMke2RvbUlkfWApKTtcbiAgICB9KTtcblxuICAgIGdyb3VwTmFtZXMuZm9yRWFjaChmdW5jdGlvbihnbmFtZSl7XG4gICAgICAgIGxldCBzaXRlcyA9IGdyb3Vwc1tnbmFtZV07IC8vIGEgbGlzdCBvZiBzaXRlIG9iamVjdHMgd2l0aCBhdHRyOiBuYW1lIGFuZCBpZFxuICAgICAgICBjb25zdCBnSWQgPSBnbmFtZS5yZXBsYWNlKC8gL2csIFwiX1wiKTsgLy8gcmVwbGFjZSB0aGUgc3BhY2VzIHdpdGggZGFzaGVzIHRvIGNyZWF0ZSBhIGdyb3VwIDxET00+IGlkXG4gICAgICAgIC8vIGZpZ3VyZSBvdXQgd2hpY2ggZG9tIHNlY3Rpb24gdG8gYXBwZW5kIHRoaXMgdGlzc3VlIHNpdGVcbiAgICAgICAgbGV0ICRjdXJyZW50RG9tID0gJHNlY3Rpb25zWzNdO1xuICAgICAgICBpZihcIkJyYWluXCIgPT0gZ25hbWUpICRjdXJyZW50RG9tID0gJHNlY3Rpb25zWzBdO1xuICAgICAgICBlbHNlIGlmIChnbmFtZS5tYXRjaCgvXltBLURdLykpICRjdXJyZW50RG9tID0gJHNlY3Rpb25zWzFdO1xuICAgICAgICBlbHNlIGlmIChnbmFtZS5tYXRjaCgvXltFLVBdLykpICRjdXJyZW50RG9tID0gJHNlY3Rpb25zWzJdO1xuXG4gICAgICAgIC8vIGNyZWF0ZSB0aGUgPGxhYmVsPiBmb3IgdGhlIHRpc3N1ZSBncm91cFxuICAgICAgICAkKGA8bGFiZWwgY2xhc3M9JHttYWluQ2xhc3N9PmArXG4gICAgICAgICAgICBgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGlkPVwiJHtnSWR9XCIgY2xhc3M9XCJ0aXNzdWVHcm91cFwiPiBgICtcbiAgICAgICAgICAgICc8c3BhbiBjbGFzcz1cImNoZWNrbWFya1wiPjwvc3Bhbj4nICtcbiAgICAgICAgICAgIGA8c3Bhbj4ke2duYW1lfTwvc3Bhbj5gICtcbiAgICAgICAgICAgICc8L2xhYmVsPjxici8+JykuYXBwZW5kVG8oJGN1cnJlbnREb20pO1xuXG4gICAgICAgIC8vIHRpc3N1ZSBzaXRlcyBpbiB0aGUgZ3JvdXBcbiAgICAgICAgaWYgKHNpdGVzLmxlbmd0aCA+IDEpe1xuICAgICAgICAgICAgIC8vIHNvcnQgc2l0ZXMgYWxwaGFiZXRpY2FsbHlcbiAgICAgICAgICAgIHNpdGVzLnNvcnQoKGEsIGIpPT57XG4gICAgICAgICAgICAgICAgaWYgKGEuaWQgPiBiLmlkKSByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICBpZiAoYS5pZCA8IGIuaWQpIHJldHVybiAtMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzaXRlLCBpKXtcbiAgICAgICAgICAgICAgICBsZXQgJHNpdGVEb20gPSAkKGA8bGFiZWwgY2xhc3M9JHtzdWJDbGFzc30+YCtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBpZD1cIiR7c2l0ZS5pZH1cIj4gYCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8c3BhbiBjbGFzcz1cImNoZWNrbWFya1wiPjwvc3Bhbj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYDxzcGFuPiR7c2l0ZS5uYW1lfTwvc3Bhbj5gICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJzwvbGFiZWw+PGJyLz4nKS5hcHBlbmRUbygkY3VycmVudERvbSk7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gc2l0ZXMubGVuZ3RoIC0xKSAkc2l0ZURvbS5hZGRDbGFzcyhsYXN0U2l0ZUNsYXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY3VzdG9tIGNsaWNrIGV2ZW50IGZvciB0aGUgdG9wLWxldmVsIHRpc3N1ZXM6IHRvZ2dsZSB0aGUgY2hlY2sgYm94ZXNcbiAgICAgICAgJChcIiNcIiArIGdJZCkuY2xpY2soZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmICgkKCcjJyArIGdJZCkuaXMoXCI6Y2hlY2tlZFwiKSkge1xuICAgICAgICAgICAgICAgIC8vIHdoZW4gdGhlIGdyb3VwIGlzIGNoZWNrZWQsIGNoZWNrIGFsbCBpdHMgdGlzc3Vlc1xuICAgICAgICAgICAgICAgIHNpdGVzLmZvckVhY2goZnVuY3Rpb24gKHNpdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFwiaWRcIiA9PSBzaXRlLmlkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICQoJyMnICsgc2l0ZS5pZCkuYXR0cignY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gd2hlbiB0aGUgZ3JvdXAgaXMgdW5jaGVja2VkLCB1bi1jaGVjayBhbGwgaXRzIHRpc3N1ZXNcbiAgICAgICAgICAgICAgICBzaXRlcy5mb3JFYWNoKGZ1bmN0aW9uIChzaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChcImlkXCIgPT0gc2l0ZS5pZCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAkKCcjJyArIHNpdGUuaWQpLmF0dHIoJ2NoZWNrZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG59XG5cbi8qKlxuICogUGFyc2UgdGhlIHR3by1sZXZlbCBjaGVja2JveC1zdHlsZSB0aXNzdWUgbWVudVxuICogQHBhcmFtIGdyb3VwcyB7RGljdGlvbmFyeX0gb2YgbGlzdHMgb2YgdGlzc3VlcyBpbmRleGVkIGJ5IHRoZSBncm91cCBuYW1lLCB0aGlzIGlzIGNyZWF0ZWQgYnkgZ3RleERhdGFQYXJzZXI6cGFyc2VUaXNzdWVTaXRlcygpXG4gKiBAcGFyYW0gZG9tSWQge1N0cmluZ30gPGRpdj4gSURcbiAqIERlcGVuZGVuY2llczogalF1ZXJ5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRpc3N1ZUdyb3VwTWVudShncm91cHMsIGRvbUlkKXtcbiAgICBsZXQgcXVlcnlUaXNzdWVJZHMgPSBbXTtcbiAgICAkKGAjJHtkb21JZH1gKS5maW5kKFwiOmlucHV0XCIpLmVhY2goZnVuY3Rpb24oKXsgLy8gdXNpbmcgalF1ZXJ5IHRvIHBhcnNlIGVhY2ggaW5wdXQgaXRlbVxuICAgICAgICBpZiAoICQodGhpcykuaXMoXCI6Y2hlY2tlZFwiKSkgeyAvLyB0aGUgalF1ZXJ5IHdheSB0byBmZXRjaCBhIGNoZWNrZWQgdGlzc3VlXG4gICAgICAgICAgICBjb25zdCBpZCA9ICQodGhpcykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmhhc0NsYXNzKFwidGlzc3VlR3JvdXBcIikpe1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaW5wdXQgaXRlbSBpcyBhIHRpc3N1ZSBncm91cFxuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIHRoaXMgdGlzc3VlIGdyb3VwIGlzIGEgc2luZ2xlLXNpdGUgZ3JvdXAgdXNpbmcgdGhlIHRpc3N1ZUdyb3VwcyBkaWN0aW9uYXJ5XG4gICAgICAgICAgICAgICAgLy8gaWYgc28sIGFkZCB0aGUgc2luZ2xlIHNpdGUgdG8gdGhlIHF1ZXJ5IGxpc3RcbiAgICAgICAgICAgICAgICBsZXQgZ3JvdXBOYW1lID0gaWQucmVwbGFjZSgvXy9nLCBcIiBcIik7IC8vIGZpcnN0IGNvbnZlcnQgdGhlIElEIGJhY2sgdG8gZ3JvdXAgbmFtZVxuICAgICAgICAgICAgICAgIGlmIChncm91cHNbZ3JvdXBOYW1lXS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBxdWVyeVRpc3N1ZUlkcy5wdXNoKGdyb3Vwc1tncm91cE5hbWVdWzBdLmlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNleyAvLyB0aGlzIGlucHV0IGl0ZW0gaXMgYSB0aXNzdWUgc2l0ZVxuICAgICAgICAgICAgICAgIHF1ZXJ5VGlzc3VlSWRzLnB1c2goaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHF1ZXJ5VGlzc3VlSWRzO1xufSIsImltcG9ydCB7anNvbn0gZnJvbSBcImQzLWZldGNoXCI7XG5pbXBvcnQge3NlbGVjdH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuLy8gaW1wb3J0IHtyYW5nZX0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQgR3JvdXBlZFZpb2xpbiBmcm9tIFwiLi9tb2R1bGVzL0dyb3VwZWRWaW9saW5cIjtcbmltcG9ydCB7XG4gICAgZ2V0R3RleFVybHMsXG4gICAgcGFyc2VUaXNzdWVTaXRlc1xufSBmcm9tIFwiLi9tb2R1bGVzL2d0ZXhEYXRhUGFyc2VyXCI7XG5cbmltcG9ydCB7XG4gICAgY3JlYXRlVGlzc3VlR3JvdXBNZW51LFxuICAgIHBhcnNlVGlzc3VlR3JvdXBNZW51XG59IGZyb20gXCIuL21vZHVsZXMvZ3RleE1lbnVCdWlsZGVyXCI7XG5cbi8qKlxuICogQnVpbGQgdGhlIGVRVEwgRGFzaGJvYXJkXG4gKiBJbml0aWF0ZSB0aGUgZGFzaGJvYXJkIHdpdGggYSBzZWFyY2ggZm9ybS5cbiAqIDEuIEZldGNoIGFuZCBvcmdhbml6ZSB0aXNzdWUgc2l0ZXMgaW50byBncm91cHMuXG4gKiAyLiBCdWlsZCB0aGUgdHdvLWxldmVsIHRpc3N1ZSBzaXRlIG1lbnUuXG4gKiAzLiBCaW5kIHRoZSBzZWFyY2ggZnVuY3Rpb24gdG8gdGhlIHN1Ym1pdCBidXR0b24uXG4gKiBUb0RvOiBwZXJoYXBzIHRoZSBkb20gZWxlbWVudHMgaW4gdGhlIGZvcm0gY291bGQgYmUgYWNjZXNzZWQgd2l0aG91dCBzcGVjaWZ5aW5nIHRoZSBkb20gSURzP1xuICogQHBhcmFtIGRhc2hib2FyZElkIHtTdHJpbmd9OiBlUVRMIHJlc3VsdCA8ZGl2PiBJRFxuICogQHBhcmFtIG1lbnVJZCB7U3RyaW5nfSB0aXNzdWUgbWVudSA8ZGl2PiBJRFxuICogQHBhcmFtIHBhaXJJZCB7U3RyaW5nfSBnZW5lLXZhcmlhbnQgPHRleHRhcmVhPiBJRFxuICogQHBhcmFtIHN1Ym1pdElkIHtTdHJpbmd9IGZvcm0gc3VibWl0IGJ1dHRvbiA8ZGl2PiBJRFxuICogQHBhcmFtIGZvcm1JZCB7U3RyaW5nfSBkYXNoYm9hcmQgPGZvcm0+IElEXG4gKiBAcGFyYW0gbWVzc2FnZUJveElkIHtTdHJpbmd9IG1lc3NhZ2UgYm94IDxkaXY+IElEXG4gKiBAcGFyYW0gdXJscyB7RGljdGlvbmFyeX0gb2YgR1RFeCB3ZWIgc2VydmljZSBVUkxzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZChkYXNoYm9hcmRJZCwgbWVudUlkLCBwYWlySWQsIHN1Ym1pdElkLCBmb3JtSWQsIG1lc3NhZ2VCb3hJZCwgdXJscz1nZXRHdGV4VXJscygpKXtcbiAgICBsZXQgdGlzc3VlR3JvdXBzID0ge307IC8vIGEgZGljdGlvbmFyeSBvZiBsaXN0cyBvZiB0aXNzdWUgc2l0ZXMgaW5kZXhlZCBieSB0aXNzdWUgZ3JvdXBzXG5cbiAgICBqc29uKHVybHMudGlzc3VlU2l0ZXMpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpeyAvLyByZXRyaWV2ZSBhbGwgdGlzc3VlIChzdWIpc2l0ZXNcbiAgICAgICAgICAgIGNvbnN0IGZvckVxdGwgPSB0cnVlO1xuICAgICAgICAgICAgbGV0IHRpc3N1ZUdyb3VwcyA9IHBhcnNlVGlzc3VlU2l0ZXMoZGF0YSwgZm9yRXF0bCk7XG4gICAgICAgICAgICBjcmVhdGVUaXNzdWVHcm91cE1lbnUodGlzc3VlR3JvdXBzLCBtZW51SWQpO1xuICAgICAgICAgICAgJChgIyR7c3VibWl0SWR9YCkuY2xpY2soX3N1Ym1pdCh0aXNzdWVHcm91cHMsIGRhc2hib2FyZElkLCBtZW51SWQsIHBhaXJJZCwgc3VibWl0SWQsIGZvcm1JZCwgbWVzc2FnZUJveElkLCB1cmxzKSk7XG5cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIH0pO1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gZ2VuZSB7T2JqZWN0fSB3aXRoIGF0dHIgZ2VuZVN5bWJvbCBhbmQgZ2VuY29kZUlkXG4gKiBAcGFyYW0gdmFyaWFudCB7T2JqZWN0fSB3aXRoIGF0dHIgdmFyaWFudElkIGFuZCBzbnBJZFxuICogQHBhcmFtIG1haW5JZCB7U3RyaW5nfSB0aGUgbWFpbiBESVYgaWRcbiAqIEBwYXJhbSBpbnB1dCB7T2JqZWN0fSB0aGUgdmlvbGluIGRhdGFcbiAqIEBwYXJhbSBpbmZvIHtPYmplY3R9IHRoZSBtZXRhZGF0YSBvZiB0aGUgZ3JvdXBzXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfdmlzdWFsaXplKGdlbmUsIHZhcmlhbnQsIG1haW5JZCwgaW5wdXQsIGluZm8pe1xuXG4gICAgY29uc3QgaWQgPSB7XG4gICAgICAgIG1haW46IG1haW5JZCxcbiAgICAgICAgdG9vbHRpcDogXCJlcXRsVG9vbHRpcFwiLFxuICAgICAgICB0b29sYmFyOiBgJHttYWluSWR9VG9vbGJhcmAsXG4gICAgICAgIGNsb25lOiBgJHttYWluSWR9Q2xvbmVgLFxuICAgICAgICBjaGFydDogYCR7bWFpbklkfUNoYXJ0YCxcbiAgICAgICAgc3ZnOiBgJHttYWluSWR9U3ZnYCxcbiAgICAgICAgYnV0dG9uczoge1xuICAgICAgICAgICAgc2F2ZTogYCR7bWFpbklkfVNhdmVgXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gZXJyb3ItY2hlY2tpbmcgRE9NIGVsZW1lbnRzXG4gICAgaWYgKCQoYCMke2lkLm1haW59YCkubGVuZ3RoID09IDApIHRocm93IFwiVmlvbGluIFBsb3QgRXJyb3I6IHRoZSBjaGFydCBET00gZG9lc24ndCBleGlzdFwiO1xuICAgIGlmICgkKGAjJHtpZC50b29sdGlwfWApLmxlbmd0aCA9PSAwKSAkKCc8ZGl2Lz4nKS5hdHRyKFwiaWRcIiwgaWQudG9vbHRpcCkuYXBwZW5kVG8oJCgnYm9keScpKTtcblxuICAgIC8vIGNsZWFyIHByZXZpb3VzbHkgcmVuZGVyZWQgcGxvdCBpZiBhbnlcbiAgICBzZWxlY3QoYCMke2lkLm1haW59YCkuc2VsZWN0QWxsKFwiKlwiKS5yZW1vdmUoKTtcblxuICAgIC8vIGJ1aWxkIHRoZSBkb20gZWxlbWVudHNcbiAgICBbXCJ0b29sYmFyXCIsIFwiY2hhcnRcIiwgXCJjbG9uZVwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICAkKCc8ZGl2Lz4nKS5hdHRyKFwiaWRcIiwgaWRbZF0pLmFwcGVuZFRvKCQoYCMke2lkLm1haW59YCkpO1xuICAgIH0pO1xuXG4gICAgLy8gdmlvbGluIHBsb3RcbiAgICAvLyBUT0RPOiBjb2RlIHJldmlldyBvbiB0aGUgbGF5b3V0LCByZW1vdmUgaGFyZC1jb2RlZCB2YWx1ZXMgYW5kIGN1c3RvbWl6ZWQgY29kZSBpbiBHcm91cGVkVmlvbGluLmpzXG4gICAgbGV0IG1hcmdpbiA9IHtcbiAgICAgICAgbGVmdDogNTAsXG4gICAgICAgIHRvcDogNTAsXG4gICAgICAgIHJpZ2h0OiA1MCxcbiAgICAgICAgYm90dG9tOiAxMDBcbiAgICB9O1xuXG4gICAgbGV0IGlubmVyV2lkdGggPSBpbnB1dC5sZW5ndGggKiA0MCwgLy8gc2V0IGF0IGF0IGxlYXN0IDUwIGJlY2F1c2Ugb2YgdGhlIGxvbmcgdGlzc3VlIG5hbWVzXG4gICAgICAgIHdpZHRoID0gaW5uZXJXaWR0aCArIChtYXJnaW4ubGVmdCArIG1hcmdpbi5yaWdodCk7XG4gICAgbGV0IGlubmVySGVpZ2h0ID0gODAsXG4gICAgICAgIGhlaWdodCA9IGlubmVySGVpZ2h0ICsgKG1hcmdpbi50b3AgKyBtYXJnaW4uYm90dG9tKTtcblxuICAgIGxldCBkb20gPSBzZWxlY3QoYCMke2lkLmNoYXJ0fWApXG4gICAgICAgIC5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgICAgICAuYXR0cihcImlkXCIsIGlkLnN2ZylcbiAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgke21hcmdpbi5sZWZ0fSwgJHttYXJnaW4udG9wfSlgKTtcblxuICAgIC8vIGFkZCB2aW9saW4gdGl0bGVcblxuICAgIGRvbS5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgIC5jbGFzc2VkKFwiZWQtc2VjdGlvbi10aXRsZVwiLCB0cnVlKVxuICAgICAgICAudGV4dChgJHtnZW5lLmdlbmVTeW1ib2x9ICgke2dlbmUuZ2VuY29kZUlkfSkgYW5kICR7dmFyaWFudC5zbnBJZHx8XCJcIn0gKCR7dmFyaWFudC52YXJpYW50SWR9KWApXG4gICAgICAgIC5hdHRyKFwieFwiLCAwKVxuICAgICAgICAuYXR0cihcInlcIiwgLW1hcmdpbi50b3AgKyAxNik7XG5cbiAgICAvLyByZW5kZXIgdGhlIHZpb2xpblxuICAgIGxldCB2aW9saW4gPSBuZXcgR3JvdXBlZFZpb2xpbihpbnB1dCwgaW5mbyk7XG4gICAgY29uc3QgdG9vbHRpcCA9IHZpb2xpbi5jcmVhdGVUb29sdGlwKGlkLnRvb2x0aXApO1xuICAgIGNvbnN0IHRvb2xiYXIgPSB2aW9saW4uY3JlYXRlVG9vbGJhcihpZC50b29sYmFyLCB0b29sdGlwKTtcbiAgICB0b29sYmFyLmNyZWF0ZURvd25sb2FkQnV0dG9uKGlkLmJ1dHRvbnMuc2F2ZSwgaWQuc3ZnLCBgJHtpZC5tYWlufS1zYXZlLnN2Z2AsIGlkLmNsb25lKTtcbiAgICB2aW9saW4ucmVuZGVyKGRvbSwgaW5uZXJXaWR0aCwgaW5uZXJIZWlnaHQsIDAuMywgdW5kZWZpbmVkLCBbXSwgXCJOb3JtYWxpemVkIEV4cHJlc3Npb25cIiwgZmFsc2UsIHRydWUsIDAsIGZhbHNlLCB0cnVlLCBmYWxzZSwgdHJ1ZSk7XG4gICAgX2N1c3RvbWl6ZVZpb2xpblBsb3QodmlvbGluLCBkb20pO1xufVxuLyoqXG4gKiBDdXN0b21pemF0aW9uIG9mIHRoZSB2aW9saW4gcGxvdFxuICogQHBhcmFtIHBsb3Qge0dyb3VwZWRWaW9saW59XG4gKiBAcGFyYW0gZG9tIHtEMyBET019XG4gKi9cbmZ1bmN0aW9uIF9jdXN0b21pemVWaW9saW5QbG90KHBsb3QsIGRvbSl7XG4gICAgcGxvdC5ncm91cHMuZm9yRWFjaCgoZyk9PntcbiAgICAgICAgLy8gY3VzdG9taXplIHRoZSBsb25nIHRpc3N1ZSBuYW1lXG4gICAgICAgIGNvbnN0IGduYW1lID0gZy5rZXk7XG4gICAgICAgIGNvbnN0IG5hbWVzID0gZ25hbWUucmVwbGFjZSgvXFwoLywgXCIgLSAoXCIpLnNwbGl0KC9cXHMqLVxccyovKTtcbiAgICAgICAgY29uc3QgY3VzdG9tWGxhYmVsID0gZG9tLmFwcGVuZChcImdcIik7XG4gICAgICAgIGNvbnN0IGN1c3RvbUxhYmVscyA9IGN1c3RvbVhsYWJlbC5zZWxlY3RBbGwoXCIudmlvbGluLWdyb3VwLWxhYmVsXCIpXG4gICAgICAgICAgICAuZGF0YShuYW1lcyk7XG4gICAgICAgIGN1c3RvbUxhYmVscy5lbnRlcigpLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCAwKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIDApXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidmlvbGluLWdyb3VwLWxhYmVsXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCAoZCwgaSkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCB4ID0gcGxvdC5zY2FsZS54KGduYW1lKSArIHBsb3Quc2NhbGUueC5iYW5kd2lkdGgoKS8yO1xuICAgICAgICAgICAgICAgIGxldCB5ID0gcGxvdC5zY2FsZS55KHBsb3Quc2NhbGUueS5kb21haW4oKVswXSkgKyA3NSArICgxMCppKTsgLy8gdG9kbzogYXZvaWQgaGFyZC1jb2RlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXR1cm4gYHRyYW5zbGF0ZSgke3h9LCAke3l9KWBcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGV4dCgoZCkgPT4gZCk7XG4gICAgfSk7XG5cbiAgICBkb20uc2VsZWN0QWxsKFwiLnZpb2xpbi1zaXplLWF4aXNcIikuY2xhc3NlZChcInZpb2xpbi1zaXplLWF4aXMtaGlkZVwiLCB0cnVlKS5jbGFzc2VkKFwidmlvbGluLXNpemUtYXhpc1wiLCBmYWxzZSk7XG5cbn1cblxuLyoqXG4gKiBEZWZpbmUgdGhlIHN1Ym1pdCBidXR0b24ncyBhY3Rpb25cbiAqIEBwYXJhbSB0aXNzdWVHcm91cHMge0RpY3Rpb25hcnl9IG9mIGxpc3RzIG9mIHRpc3N1ZXMgaW5kZXhlZCBieSB0aXNzdWUgZ3JvdXBzXG4gKiBAcGFyYW0gZGFzaGJvYXJkSWQge1N0cmluZ30gZVFUTCByZXN1bHRzIDxkaXY+IElEXG4gKiBAcGFyYW0gbWVudUlkIHtTdHJpbmd9IHRpc3N1ZSBtZW51IDxkaXY+IElEXG4gKiBAcGFyYW0gcGFpcklkIHtTdHJpbmd9IGdlbmUtdmFyaWFudCA8dGV4dGFyZWE+IElEXG4gKiBAcGFyYW0gc3VibWl0SWQge1N0cmluZ30gc3VibWl0IGJ1dHRvbiA8ZGl2PiBJRFxuICogQHBhcmFtIG1lc3NhZ2VCb3hJZCB7U3RyaW5nfSBtZXNzYWdlIGJveCA8ZGl2PiBJRFxuICogQHBhcmFtIHVybHMge0RpY3Rpb25hcnl9IG9mIEdURXggd2ViIHNlcnZpY2UgVVJMc1xuICogQHBhcmFtIG1heCB7SW50ZWdlcn0gbWF4IG51bWJlciBvZiBnZW5lLXZhcmlhbnQgZW50cmllcy4gVGhlIGRlZmF1bHQgaXMgc2V0IHRvIDMwLlxuICogQHByaXZhdGVcbiAqIERlcGVuZGVuY2llczogalF1ZXJ5XG4gKi9cbmZ1bmN0aW9uIF9zdWJtaXQodGlzc3VlR3JvdXBzLCBkYXNoYm9hcmRJZCwgbWVudUlkLCBwYWlySWQsIHN1Ym1pdElkLCBmb3JtSWQsIG1lc3NhZ2VCb3hJZCwgdXJscz1fZ2V0R1RFeFVybHMoKSwgbWF4PTMwKXtcbiAgICByZXR1cm4gZnVuY3Rpb24oKXtcblxuICAgICAgICAvLyBjbGVhciB0aGUgcHJldmlvdXMgZGFzaGJvYXJkIHNlYXJjaCByZXN1bHRzIGlmIGFueVxuICAgICAgICAkKGAjJHtkYXNoYm9hcmRJZH1gKS5odG1sKCcnKTtcblxuICAgICAgICAvLy8vLy8gdmFsaWRhdGUgdGlzc3VlIGlucHV0cyBhbmQgY29udmVydCB0aGVtIHRvIHRpc3N1ZSBJRHMgLy8vLy8vXG4gICAgICAgIGxldCBxdWVyeVRpc3N1ZUlkcyA9IHBhcnNlVGlzc3VlR3JvdXBNZW51KHRpc3N1ZUdyb3VwcywgbWVudUlkKTtcbiAgICAgICAgLy8gbGV0IHF1ZXJ5VGlzc3VlSWRzID0gW107XG4gICAgICAgIC8vICQoYCMke21lbnVJZH1gKS5maW5kKFwiOmlucHV0XCIpLmVhY2goZnVuY3Rpb24oKXsgLy8gdXNpbmcgalF1ZXJ5IHRvIHBhcnNlIGVhY2ggaW5wdXQgaXRlbVxuICAgICAgICAvLyAgICAgaWYgKCAkKHRoaXMpLmlzKFwiOmNoZWNrZWRcIikpIHsgLy8gdGhlIGpRdWVyeSB3YXkgdG8gZmV0Y2ggYSBjaGVja2VkIHRpc3N1ZVxuICAgICAgICAvLyAgICAgICAgIGNvbnN0IGlkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgICAvLyAgICAgICAgIGlmICgkKHRoaXMpLmhhc0NsYXNzKFwidGlzc3VlR3JvdXBcIikpe1xuICAgICAgICAvLyAgICAgICAgICAgICAvLyB0aGlzIGlucHV0IGl0ZW0gaXMgYSB0aXNzdWUgZ3JvdXBcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gY2hlY2sgaWYgdGhpcyB0aXNzdWUgZ3JvdXAgaXMgYSBzaW5nbGUtc2l0ZSBncm91cCB1c2luZyB0aGUgdGlzc3VlR3JvdXBzIGRpY3Rpb25hcnlcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gaWYgc28sIGFkZCB0aGUgc2luZ2xlIHNpdGUgdG8gdGhlIHF1ZXJ5IGxpc3RcbiAgICAgICAgLy8gICAgICAgICAgICAgbGV0IGdyb3VwTmFtZSA9IGlkLnJlcGxhY2UoL18vZywgXCIgXCIpOyAvLyBmaXJzdCBjb252ZXJ0IHRoZSBJRCBiYWNrIHRvIGdyb3VwIG5hbWVcbiAgICAgICAgLy8gICAgICAgICAgICAgaWYgKHRpc3N1ZUdyb3Vwc1tncm91cE5hbWVdLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBxdWVyeVRpc3N1ZUlkcy5wdXNoKHRpc3N1ZUdyb3Vwc1tncm91cE5hbWVdWzBdLmlkKTtcbiAgICAgICAgLy8gICAgICAgICAgICAgfVxuICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgLy8gICAgICAgICBlbHNleyAvLyB0aGlzIGlucHV0IGl0ZW0gaXMgYSB0aXNzdWUgc2l0ZVxuICAgICAgICAvLyAgICAgICAgICAgICBxdWVyeVRpc3N1ZUlkcy5wdXNoKGlkKTtcbiAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vIH0pO1xuXG4gICAgICAgIC8vIHRpc3N1ZSBpbnB1dCBlcnJvci1jaGVja2luZ1xuICAgICAgICBpZiAocXVlcnlUaXNzdWVJZHMubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIGFsZXJ0KFwiTXVzdCBzZWxlY3QgYXQgbGVhc3Qgb25lIHRpc3N1ZS5cIik7XG4gICAgICAgICAgICB0aHJvdyBcIklucHV0IGVycm9yXCI7XG4gICAgICAgIH1cblxuICAgICAgICAvLy8vLy8gcGFyc2UgdGhlIGdlbmUtdmFyaWFudCBpbnB1dCBsaXN0IC8vLy8vL1xuICAgICAgICBsZXQgcGFpcnMgPSAkKGAjJHtwYWlySWR9YCkudmFsKCkuc3BsaXQoXCJcXG5cIikuZmlsdGVyKGZ1bmN0aW9uKGQpe3JldHVybiBkICE9IFwiXCJ9KTtcbiAgICAgICAgaWYgKHBhaXJzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICBhbGVydChcIk11c3QgaW5wdXQgYXQgbGVhc3Qgb25lIGdlbmUtdmFyaWFudCBwYWlyLlwiKTtcbiAgICAgICAgICAgIHRocm93IFwiSW5wdXQgZXJyb3JcIjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwYWlycy5sZW5ndGggPiBtYXgpIHtcbiAgICAgICAgICAgICQoYCMke21lc3NhZ2VCb3hJZH1gKS5hcHBlbmQoYFlvdXIgaW5wdXQgaGFzIGV4Y2VlZGVkIHRoZSBtYXhpbXVtIG51bWJlciBvZiBhbGxvd2VkIGVudHJpZXMuIE9ubHkgdGhlIGZpcnN0ICR7bWF4fSBlbnRyaWVzIGFyZSBwcm9jZXNzZWQuYCk7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJVc2VyIGlucHV0IGhhcyBleGNlZWRlZCB0aGUgbWF4aW11bSBudW1iZXIgb2YgYWxsb3dlZCBlbnRyaWVzLlwiKTtcbiAgICAgICAgICAgIHBhaXJzID0gcGFpcnMuc2xpY2UoMCwgbWF4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vLy8vLyBwcm9jZXNzIGVhY2ggZ2VuZS12YXJpYW50IHBhaXIgLy8vLy8vXG5cbiAgICAgICAgLy8gY3JlYXRlIGEgdGlzc3VlIG5hbWUgbG9va3VwIHRhYmxlXG4gICAgICAgIGNvbnN0IHRpc3N1ZURpY3QgPSB7fTtcbiAgICAgICAgT2JqZWN0LmtleXModGlzc3VlR3JvdXBzKS5mb3JFYWNoKChnbmFtZSkgPT4ge1xuICAgICAgICAgICAgdGlzc3VlR3JvdXBzW2duYW1lXS5mb3JFYWNoKChzaXRlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGlzc3VlRGljdFtzaXRlLmlkXSA9IHNpdGUubmFtZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBmb3IgZWFjaCBnZW5lLXZhcmlhbnQgcGFpclxuICAgICAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKHBhaXIsIGkpe1xuICAgICAgICAgICAgcGFpci5yZXBsYWNlKC8gL2csIFwiXCIpOyAvLyByZW1vdmUgYWxsIHNwYWNlc1xuICAgICAgICAgICAgbGV0IHZpZCA9IHBhaXIuc3BsaXQoJywnKVsxXSxcbiAgICAgICAgICAgICAgICBnaWQgPSBwYWlyLnNwbGl0KCcsJylbMF07XG5cbiAgICAgICAgICAgIC8vIHJldHJpZXZlIGdlbmUgYW5kIHZhcmlhbnQgaW5mbyBmcm9tIHRoZSB3ZWIgc2VydmljZVxuICAgICAgICAgICAgY29uc3QgZ2VuZVVybCA9IHVybHMuZ2VuZUlkICsgZ2lkO1xuICAgICAgICAgICAgY29uc3QgdmFyaWFudFVybCA9IHZpZC50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoJ3JzJyk/dXJscy5yc0lkK3ZpZDp1cmxzLnZhcmlhbnRJZCt2aWQ7XG5cbiAgICAgICAgICAgIFByb21pc2UuYWxsKFtqc29uKGdlbmVVcmwpLCBqc29uKHZhcmlhbnRVcmwpXSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihhcmdzKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ2VuZSA9IF9wYXJzZUdlbmUoYXJnc1swXSwgZ2lkKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFyaWFudCA9IF9wYXJzZVZhcmlhbnQoYXJnc1sxXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChnZW5lID09PSBudWxsKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGBJbnB1dCBFcnJvcjogbm8gZ2VuZSBmb3VuZCBmb3IgJHtnaWR9LiA8YnIvPmA7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHttZXNzYWdlQm94SWR9YCkuYXBwZW5kKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvck1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhcmlhbnQgPT09IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gYElucHV0IEVycm9yOiBubyB2YXJpYW50IGZvdW5kIGZvciAke3ZpZH0gPGJyLz5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7bWVzc2FnZUJveElkfWApLmFwcGVuZChlcnJvck1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3JNZXNzYWdlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIGVRVExzIGFuZCBkaXNwbGF5IHRoZSBlUVRMIHZpb2xpbiBwbG90c1xuICAgICAgICAgICAgICAgICAgICBfcmVuZGVyRXF0bFBsb3QodGlzc3VlRGljdCwgZGFzaGJvYXJkSWQsIGdlbmUsIHZhcmlhbnQsIHF1ZXJ5VGlzc3VlSWRzLCBpKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBoaWRlIHRoZSBzZWFyY2ggZm9ybSBhZnRlciB0aGUgZVFUTCB2aW9saW4gcGxvdHMgYXJlIHJlcG9ydGVkXG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Zvcm1JZH1gKS5yZW1vdmVDbGFzcyhcInNob3dcIik7IC8vIGZvciBib290c3RyYXAgNFxuICAgICAgICAgICAgICAgICAgICAkKGAjJHtmb3JtSWR9YCkucmVtb3ZlQ2xhc3MoXCJpblwiKTsgLy8gZm9yIGJvb3N0cmFwIDNcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xufVxuXG4vKipcbiAqIFBhcnNlIEdURXggZ2VuZSB3ZWIgc2VydmljZVxuICogQHBhcmFtIGdqc29uXG4gKiBAcGFyYW0gaWQge1N0cmluZ30gdGhlIHF1ZXJ5IGdlbmUgSURcbiAqIEByZXR1cm5zIHsqfSBhIGdlbmUgb2JqZWN0IG9yIG51bGwgaWYgbm90IGZvdW5kXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfcGFyc2VHZW5lKGdqc29uLCBpZCl7XG4gICAgY29uc3QgYXR0ciA9ICdnZW5lSWQnO1xuICAgIGlmKCFnanNvbi5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZSBnZW5lIGVycm9yJztcbiAgICBsZXQgZ2VuZXMgPSBnanNvblthdHRyXS5maWx0ZXIoKGQpID0+IHtyZXR1cm4gZC5nZW5lU3ltYm9sVXBwZXIgPT0gaWQudG9VcHBlckNhc2UoKSB8fCBkLmdlbmNvZGVJZCA9PSBpZC50b1VwcGVyQ2FzZSgpfSk7IC8vIGZpbmQgdGhlIGV4YWN0IG1hdGNoXG4gICAgaWYgKGdlbmVzLmxlbmd0aCA9PTApIHJldHVybiBudWxsO1xuICAgIHJldHVybiBnZW5lc1swXTtcbn1cblxuLyoqXG4gKiBQYXJzZSBHVEV4IHZhcmlhbnQvc25wIHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gdmpzb25cbiAqIEByZXR1cm5zIHsqfSBhIHZhcmlhbnQgb2JqZWN0IG9yIG51bGxcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9wYXJzZVZhcmlhbnQodmpzb24pe1xuICAgIGNvbnN0IGF0dHIgPSAnc25wJztcbiAgICBpZighdmpzb24uaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2UgdmFyaWFudCBlcnJvcic7XG4gICAgY29uc3QgdmFyaWFudHMgPSB2anNvblthdHRyXTtcbiAgICBpZiAodmFyaWFudHMubGVuZ3RoID09IDApIHJldHVybiBudWxsO1xuICAgIHJldHVybiB2YXJpYW50c1swXTtcbn1cblxuLyoqXG4gKiBjYWxjdWxhdGUgdGhlIGVRVExzIGFuZCBmZXRjaCBleHByZXNzaW9uIG9mIGdlbm90eXBlcyBmb3IgZWFjaCBnZW5lLXZhcmlhbnQgcGFpclxuICogQHBhcmFtIHRpc3N1RGljdCB7RGljdGlvbmFyeX0gdGlzc3VlIG5hbWUgbG9va3VwIHRhYmxlLCBpbmRleGVkIGJ5IHRpc3N1ZSBJRHNcbiAqIEBwYXJhbSBkYXNoYm9hcmRJZCB7U3RyaW5nfSB0aGUgZGFzaGJvYXJkIHJlc3VsdHMgPGRpdj4gSURcbiAqIEBwYXJhbSBnZW5lIHtPYmplY3R9IGEgR1RFeCBnZW5lIG9iamVjdFxuICogQHBhcmFtIHZhcmlhbnQge09iamVjdH0gdGhlIEdURXggdmFyaWFudCBvYmplY3RcbiAqIEBwYXJhbSB0aXNzdWVzIHtMaXN0fSBvZiBxdWVyeSB0aXNzdWUgSURzXG4gKiBAcGFyYW0gaSB7SW50ZWdlcn0gdGhlIGJveHBsb3QgRElWJ3MgaW5kZXhcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF9yZW5kZXJFcXRsUGxvdCh0aXNzdWVEaWN0LCBkYXNoYm9hcmRJZCwgZ2VuZSwgdmFyaWFudCwgdGlzc3VlcywgaSkge1xuICAgIC8vIGRpc3BsYXkgZ2VuZS12YXJpYW50IHBhaXIgbmFtZXNcbiAgICBjb25zdCBpZCA9IGB2aW9saW5wbG90JHtpfWA7XG4gICAgJChgIyR7ZGFzaGJvYXJkSWR9YCkuYXBwZW5kKGA8ZGl2IGlkPVwiJHtpZH1cIiBjbGFzcz1cImNvbC1zbS0xMlwiPjwvZGl2PmApO1xuXG4gICAgLy8gcGFyc2UgdGhlIGdlbm90eXBlcyBmcm9tIHRoZSB2YXJpYW50IElEXG4gICAgbGV0IHJlZiA9IHZhcmlhbnQudmFyaWFudElkLnNwbGl0KC9fLylbMl07XG4gICAgbGV0IGFsdCA9IHZhcmlhbnQudmFyaWFudElkLnNwbGl0KC9fLylbM107XG4gICAgY29uc3QgaGV0ID0gcmVmICsgYWx0O1xuICAgIHJlZiA9IHJlZiArIHJlZjtcbiAgICBhbHQgPSBhbHQgKyBhbHQ7XG4gICAgLy8gZDMtcXVldWUgaHR0cHM6Ly9naXRodWIuY29tL2QzL2QzLXF1ZXVlXG4gICAgbGV0IHByb21pc2VzID0gW107XG5cbiAgICAvLyBxdWV1ZSB1cCBhbGwgdGlzc3VlIElEc1xuICAgIHRpc3N1ZXMuZm9yRWFjaCgodElkKSA9PiB7XG4gICAgICAgIGxldCB1cmxSb290ID0gZ2V0R3RleFVybHMoKVsnZHluZXF0bCddO1xuICAgICAgICBsZXQgdXJsID0gYCR7dXJsUm9vdH0/c25wX2lkPSR7dmFyaWFudC52YXJpYW50SWR9JmdlbmVfaWQ9JHtnZW5lLmdlbmNvZGVJZH0mdGlzc3VlPSR7dElkfWA7IC8vIHVzZSB2YXJpYW50IElELCBnZW5jb2RlIElEIGFuZCB0aXNzdWUgSUQgdG8gcXVlcnkgdGhlIGR5bmVxdGxcbiAgICAgICAgcHJvbWlzZXMucHVzaChfYXBpQ2FsbCh1cmwsIHRJZCkpO1xuICAgIH0pO1xuXG4gICAgUHJvbWlzZS5hbGwocHJvbWlzZXMpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdHMpe1xuICAgICAgICAgICAgbGV0IGlucHV0ID0gW107IC8vIGEgbGlzdCBvZiBnZW5vdHlwZSBleHByZXNzaW9uIG9iamVjdHNcbiAgICAgICAgICAgIGxldCBpbmZvID0ge307XG4gICAgICAgICAgICByZXN1bHRzLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZC5zdGF0dXMgPT0gXCJmYWlsZWRcIil7XG4gICAgICAgICAgICAgICAgLy8gaWYgZVFUTHMgYXJlbid0IGF2YWlsYWJsZSBmb3IgdGhpcyBxdWVyeSwgY3JlYXRlIGFuIGVtcHR5IHNwYWNlIGZvciB0aGUgbGF5b3V0IG9mIHRoZSByZXBvcnRcbiAgICAgICAgICAgICAgICBsZXQgZ3JvdXAgPSB0aXNzdWVEaWN0W2QudGlzc3VlXTsgLy8gZ3JvdXAgcmVmZXJzIHRvIHRoZSB0aXNzdWUgbmFtZSwgbWFwIHRpc3N1ZSBJRCB0byB0aXNzdWUgbmFtZVxuICAgICAgICAgICAgICAgIC8vIGdlbm90eXBlIGV4cHJlc3Npb24gZGF0YVxuICAgICAgICAgICAgICAgIGlucHV0ID0gaW5wdXQuY29uY2F0KFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3JvdXA6IGdyb3VwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IHJlZi5sZW5ndGg+Mj9cInJlZlwiOnJlZixcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlczogWzBdXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwOiBncm91cCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBoZXQubGVuZ3RoPjI/XCJoZXRcIjpoZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXM6IFswXVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBncm91cDogZ3JvdXAsXG4gICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogYWx0Lmxlbmd0aD4yP1wiYWx0XCI6YWx0LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzOiBbMF1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZCA9IF9wYXJzZUVxdGwoZCk7IC8vIHJlZm9ybWF0IGVRVEwgcmVzdWx0cyBkXG4gICAgICAgICAgICAgICAgbGV0IGdyb3VwID0gdGlzc3VlRGljdFtkLnRpc3N1ZV07IC8vIGdyb3VwIGlzIHRoZSB0aXNzdWUgbmFtZSwgbWFwIHRpc3N1ZSBJRCB0byB0aXNzdWUgbmFtZVxuXG4gICAgICAgICAgICAgICAgaW5wdXQgPSBpbnB1dC5jb25jYXQoW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBncm91cDogZ3JvdXAsXG4gICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogcmVmLmxlbmd0aD4yP1wicmVmXCI6cmVmLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogZC5ob21vUmVmRXhwLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlczogZC5ob21vUmVmRXhwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwOiBncm91cCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBoZXQubGVuZ3RoPjI/XCJoZXRcIjpoZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplOiBkLmhldGVyb0V4cC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXM6IGQuaGV0ZXJvRXhwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwOiBncm91cCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBhbHQubGVuZ3RoPjI/XCJhbHRcIjphbHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplOiBkLmhvbW9BbHRFeHAubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzOiBkLmhvbW9BbHRFeHBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICAgIC8vIGFkZGl0aW9uYWwgaW5mbyBvZiB0aGUgZ3JvdXAgZ29lcyBoZXJlXG4gICAgICAgICAgICAgICAgaW5mb1tncm91cF0gPSB7XG4gICAgICAgICAgICAgICAgICAgIFwicHZhbHVlXCI6IGRbXCJwLXZhbHVlXCJdPT09bnVsbD8xOnBhcnNlRmxvYXQoZFtcInAtdmFsdWVcIl0pLnRvUHJlY2lzaW9uKDMpLFxuICAgICAgICAgICAgICAgICAgICBcInB2YWx1ZVRocmVzaG9sZFwiOiBkW1wicC12YWx1ZV90aHJlc2hvbGRcIl09PT1udWxsPzA6cGFyc2VGbG9hdChkW1wicC12YWx1ZV90aHJlc2hvbGRcIl0pLnRvUHJlY2lzaW9uKDMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIF92aXN1YWxpemUoZ2VuZSwgdmFyaWFudCwgaWQsIGlucHV0LCBpbmZvKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7Y29uc29sZS5lcnJvcihlcnIpfSk7XG59XG5cbi8qKlxuICogcGFyc2UgR1RFeCBkeW5lcXRsIGpzb25cbiAqIEBwYXJhbSBkYXRhIHtKU09OfSBmcm9tIEdURXggZHluZXF0bCB3ZWIgc2VydmljZVxuICogQHJldHVybnMgZGF0YSB7SlNPTn0gbW9kaWZpZWQgZGF0YVxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX3BhcnNlRXF0bChkYXRhKXtcbiAgICBkYXRhLmV4cHJlc3Npb25fdmFsdWVzID0gZGF0YS5leHByZXNzaW9uX3ZhbHVlcy5zcGxpdChcIixcIikubWFwKChkKT0+cGFyc2VGbG9hdChkKSk7XG4gICAgZGF0YS5nZW5vdHlwZXMgPSBkYXRhLmdlbm90eXBlcy5zcGxpdChcIixcIikubWFwKChkKT0+cGFyc2VGbG9hdChkKSk7XG5cbiAgICBkYXRhLmhvbW9SZWZFeHAgPSBkYXRhLmV4cHJlc3Npb25fdmFsdWVzLmZpbHRlcigoZCxpKSA9PiB7XG4gICAgICAgIHJldHVybiBkYXRhLmdlbm90eXBlc1tpXSA9PSAwXG4gICAgfSk7XG4gICAgZGF0YS5ob21vQWx0RXhwID0gZGF0YS5leHByZXNzaW9uX3ZhbHVlcy5maWx0ZXIoKGQsaSkgPT4ge1xuICAgICAgICByZXR1cm4gZGF0YS5nZW5vdHlwZXNbaV0gPT0gMlxuICAgIH0pO1xuICAgIGRhdGEuaGV0ZXJvRXhwID0gZGF0YS5leHByZXNzaW9uX3ZhbHVlcy5maWx0ZXIoKGQsaSkgPT4ge1xuICAgICAgICByZXR1cm4gZGF0YS5nZW5vdHlwZXNbaV0gPT0gMVxuICAgIH0pO1xuICAgIHJldHVybiBkYXRhO1xufVxuXG5mdW5jdGlvbiBfYXBpQ2FsbCh1cmwsIHRpc3N1ZSl7XG4gICAgLy8gcmVmZXJlbmNlOiBodHRwOi8vYWRhbXBheHRvbi5jb20vaGFuZGxpbmctbXVsdGlwbGUtamF2YXNjcmlwdC1wcm9taXNlcy1ldmVuLWlmLXNvbWUtZmFpbC9cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgICAganNvbih1cmwpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXF1ZXN0KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXF1ZXN0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgICAgICAvLyByZXBvcnQgdGhlIHRpc3N1ZSBhcyBmYWlsZWRcbiAgICAgICAgICAgICAgICBjb25zdCBmYWlsZWQgPSB7XG4gICAgICAgICAgICAgICAgICAgIHRpc3N1ZTogdGlzc3VlLFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IFwiZmFpbGVkXCJcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZmFpbGVkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuXG59XG5cblxuXG5cbiJdLCJuYW1lcyI6WyJjc3YiLCJkc3YiLCJ0c3YiLCJtYXRjaGVyIiwic2VsZWN0aW9uIiwiZWxlbWVudCIsImFzY2VuZGluZyIsIm1hcCIsImFycmF5Iiwic2xpY2UiLCJyYW5nZSIsInNlcXVlbmNlIiwibGluZWFyIiwiY29uc3RhbnQiLCJjb2xvciIsInJnYiIsImNvbG9yUmdiIiwidmFsdWUiLCJudW1iZXIiLCJzdHJpbmciLCJpZGVudGl0eSIsImJpc2VjdCIsImludGVycG9sYXRlIiwiaW50ZXJwb2xhdGVWYWx1ZSIsImRlaW50ZXJwb2xhdGUiLCJyZWludGVycG9sYXRlIiwidDAiLCJ0MSIsImludGVydmFsIiwiZHVyYXRpb25TZWNvbmQiLCJkdXJhdGlvbk1pbnV0ZSIsImR1cmF0aW9uSG91ciIsImR1cmF0aW9uRGF5IiwiZHVyYXRpb25XZWVrIiwiZm9ybWF0TG9jYWxlIiwiZGF5IiwidGltZU1vbmRheSIsInRpbWVEYXkiLCJ0aW1lWWVhciIsInRpbWVTdW5kYXkiLCJ0aW1lVGh1cnNkYXkiLCJsb2NhbGUiLCJkZWZhdWx0TG9jYWxlIiwieCIsInBvaW50WCIsInkiLCJwb2ludFkiLCJwb2ludCIsImVwc2lsb24iLCJub29wIiwicGFyc2VUeXBlbmFtZXMiLCJzZXQiLCJjcmVhdGUiLCJnZXQiLCJ0aW1lb3V0Iiwic2NoZWR1bGUiLCJhdHRyUmVtb3ZlIiwiYXR0clJlbW92ZU5TIiwiYXR0ckNvbnN0YW50IiwiYXR0ckNvbnN0YW50TlMiLCJhdHRyRnVuY3Rpb24iLCJhdHRyRnVuY3Rpb25OUyIsImludGVycG9sYXRlVHJhbnNmb3JtIiwidHJhbnNpdGlvbiIsIlNlbGVjdGlvbiIsInN0eWxlUmVtb3ZlIiwic3R5bGUiLCJzdHlsZUNvbnN0YW50Iiwic3R5bGVGdW5jdGlvbiIsInRleHRDb25zdGFudCIsInRleHRGdW5jdGlvbiIsImVhc2VDdWJpY0luT3V0Iiwibm9wcm9wYWdhdGlvbiIsImxvY2FsIiwiZW1wdHkiLCJicnVzaCIsIm5vZXZlbnQiLCJkcmFnRGlzYWJsZSIsImRyYWdFbmFibGUiLCJzY2FsZUJhbmQiLCJzY2FsZUxpbmVhciJdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsSUFBSSxHQUFHLEdBQUcsRUFBRTtJQUNSLEdBQUcsR0FBRyxFQUFFO0lBQ1IsS0FBSyxHQUFHLEVBQUU7SUFDVixPQUFPLEdBQUcsRUFBRTtJQUNaLE1BQU0sR0FBRyxFQUFFLENBQUM7O0FBRWhCLFNBQVMsZUFBZSxDQUFDLE9BQU8sRUFBRTtFQUNoQyxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsRUFBRSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLEVBQUU7SUFDbEUsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO0dBQ2hELENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7Q0FDckI7O0FBRUQsU0FBUyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRTtFQUNuQyxJQUFJLE1BQU0sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7RUFDdEMsT0FBTyxTQUFTLEdBQUcsRUFBRSxDQUFDLEVBQUU7SUFDdEIsT0FB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RSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDO0dBQy9DLE1BQU07SUFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDakMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQzlCLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkQsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUM7R0FDL0M7O0VBRUQsSUFBSSxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDOztFQUU3QixPQUFPLEtBQUssQ0FBQztFQUNkOztBQUVELEFBQU8sU0FBUyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7RUFDaEQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQztNQUMxQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7TUFDOUMsS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztFQUN2QyxPQUFPLEtBQUssSUFBSSxDQUFDO1FBQ1gsQ0FBQyxLQUFLLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxLQUFLLElBQUks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QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2xHLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvRCxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkcsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFH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QyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUMxRDtFQUNELE1BQU0sRUFBRSxTQUFTLENBQUMsRUFBRTtJQUNsQixDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDN0MsT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQzFEO0VBQ0QsR0FBRyxFQUFFLFdBQVc7SUFDZCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUc7UUFDckMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUMxQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDVixFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2xDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNwQixPQUFPLElBQUksR0FBRztNQUNaLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO01BQzdDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztNQUNsQixPQUFPLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsRUFB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QVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7RUFDM0UsSUFBSSxFQUFFLENBQUMsWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzNDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRztNQUNiLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUc7TUFDYixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHO01BQ2IsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssS0FBSyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7TUFDckQsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDO01BQ1YsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7TUFDOUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7TUFDbEQsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxPQUFPLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztFQUNwRCxPQUFPLElBQUksU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDNUQ7O0FBRUQsQUFBZSxTQUFTLFNBQVMsQ0FBQyxDQUFD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QUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRUYsaUJBQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRUEsaUJBQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3RFLE1BQU0sSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFO01BQ25CLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsR0FBRyxPQUFPLEdBQUcsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDO0tBQ3BEO0dBQ0Y7O0VBRUQsU0FBUyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0lBQzFCLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtNQUNYLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQztNQUMxRCxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRUEsaUJBQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzlFLE1BQU0sSUFBSSxDQUFDLEVBQUU7TUFDWixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0tBQzNDO0dBQ0Y7O0VBRUQsU0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0lBQ3pCLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtNQUNYLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFQSxpQkFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDN0UsTUFBTSxJQUFJLENBQUMsRUFBRTtNQUNaLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUM7S0FDMUM7R0FDRjs7RUFFRCxTQUFTLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtJQUNuQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtNQUMxQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7TUFDeEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRUEsaUJBQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRUEsaUJBQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3RFLE1BQU0sSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7TUFDL0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxD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QUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7TUFDN0IsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO01BQ2xCLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztNQUMxQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7O0VBRzFCLElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRSxLQUFLLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxHQUFHLENBQUM7OztPQUd0QyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFFLENBQUM7OztFQUd2QyxJQUFJLElBQUksS0FBSyxJQUFJLEtBQUssR0FBRyxJQUFJLEtBQUssS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxHQUFHLEVBQUUsS0FBSyxHQUFHLEdBQUcsQ0FBQzs7RUFFbEYsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7RUFDakIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7RUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7RUFDakIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7RUFDckIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7RUFDakIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7RUFDbkIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7RUFDbkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7RUFDM0IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7Q0FDbEI7O0FBRUQsZUFBZSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsV0FBVztFQUM5QyxPQUFPLElBQUksQ0FBQyxJQUFJO1FBQ1YsSUFBSSxDQUFDLEtBQUs7UUFDVixJQUFJLENBQUMsSUFBSTtRQUNULElBQUksQ0FBQyxNQUFNO1NBQ1YsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDO1NBQ3JCLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3RELElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztTQUN0QixJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDckUsSUFBSSxDQUFDLElBQUksQ0FBQztDQUNqQixDQUFDOztBQ3ZERixpQkFBZSxTQUFTLENBQUMsRUFBRTtFQUN6QixPQUFPLENBQUMsQ0FBQztDQUNWOztBQ01ELElBQUksUUFBUSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUVwRixtQkFBZSxTQUFTLE1BQU0sRUFBRTtFQUM5QixJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxJQUFJLE1BQU0sQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHRixVQUFRO01BQ3ZHLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUTtNQUMxQixPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU87TUFDeEIsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBR0EsVUFBUTtNQUN2RSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUM7O0VBRXBDLFNBQVMsU0FBUyxDQUFDLFNBQVMsRUFBRTtJQUM1QixTQUFTLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDOztJQUV2QyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSTtRQUNyQixLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUs7UUFDdkIsSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJO1FBQ3JCLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTTtRQUN6QixJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUk7UUFDckIsS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLO1FBQ3ZCLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSztRQUN2QixTQUFTLEdBQUcsU0FBUyxDQUFDLFNBQVM7UUFDL0IsSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7Ozs7SUFJMUIsSUFBSSxNQUFNLEdBQUcsTUFBTSxLQUFLLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUM3RyxNQUFNLEdBQUcsTUFBTSxLQUFLLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLEdBQUcsRUFBRSxDQUFDOzs7OztJQUs3RSxJQUFJLFVBQVUsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO1FBQzlCLFdBQVcsR0FBRyxDQUFDLElBQUksSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzs7Ozs7SUFNbkQsU0FBUyxHQUFHLFNBQVMsSUFBSSxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFO1VBQ3hDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7VUFDMUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQzs7SUFFM0MsU0FBUyxNQUFNLENBQUMsS0FBSyxFQUFFO01BQ3JCLElBQUksV0FBVyxHQUFHLE1BQU07VUFDcEIsV0FBVyxHQUFHLE1BQU07VUFDcEIsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7O01BRVosSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFO1FBQ2hCLFdBQVcsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsV0FBVyxDQUFDO1FBQzlDLEtBQUssR0FBRyxFQUFFLENBQUM7T0FDWixNQUFNO1FBQ0wsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDOzs7UUFHZixJQUFJLGFBQWEsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLEtBQUssR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQzs7O1FBRy9DLElBQUksYUFBYSxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRSxhQUFhLEdBQUcsS0FBSyxDQUFDOzs7UUFHekQsV0FBVyxHQUFHLENBQUMsYUFBYSxJQUFJLElBQUksS0FBSyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksS0FBSyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksSUFBSSxXQUFXLENBQUM7UUFDckgsV0FBVyxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxHQUFHLGNBQWMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksV0FBVyxJQUFJLGFBQWEsSUFBSSxJQUFJLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQzs7OztRQUloSSxJQUFJLFdBQVcsRUFBRTtVQUNmLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztVQUN6QixPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNkLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFO2NBQzdDLFdBQVcsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsT0FBTyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksV0FBVyxDQUFDO2NBQ3ZGLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztjQUMxQixNQUFNO2FBQ1A7V0FDRjtTQUNGO09BQ0Y7OztNQUdELElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDOzs7TUFHbkQsSUFBSSxNQUFNLEdBQUcsV0FBVyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxNQUFNO1VBQy9ELE9BQU8sR0FBRyxNQUFNLEdBQUcsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQzs7O01BRzdFLElBQUksS0FBSyxJQUFJLElBQUksRUFBRSxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFLLEVBQUUsT0FBTyxDQUFDLE1BQU0sR0FBRyxLQUFLLEdBQUcsV0FBVyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsRUFBRSxPQUFPLEdBQUcsRUFBRSxDQUFDOzs7TUFHeEgsUUFBUSxLQUFLO1FBQ1gsS0FBSyxHQUFHLEVBQUUsS0FBSyxHQUFHLFdBQVcsR0FBRyxLQUFLLEdBQUcsV0FBVyxHQUFHLE9BQU8sQ0FBQyxDQUFDLE1BQU07UUFDckUsS0FBSyxHQUFHLEVBQUUsS0FBSyxHQUFHLFdBQVcsR0FBRyxPQUFPLEdBQUcsS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDLE1BQU07UUFDckUsS0FBSyxHQUFHLEVBQUUsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLFdBQVcsR0FBRyxLQUFLLEdBQUcsV0FBVyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNO1FBQ3BJLFNBQVMsS0FBSyxHQUFHLE9BQU8sR0FBRyxXQUFXLEdBQUcsS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDLE1BQU07T0FDckU7O01BRUQsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDeEI7O0lBRUQsTUFBTSxDQUFDLFFBQVEsR0FBRyxXQUFXO01BQzNCLE9BQU8sU0FBUyxHQUFHLEVBQUUsQ0FBQztLQUN2QixDQUFDOztJQUVGLE9BQU8sTUFBTSxDQUFDO0dBQ2Y7O0VBRUQsU0FBUyxZQUFZLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRTtJQUN0QyxJQUFJLENBQUMsR0FBRyxTQUFTLEVBQUUsU0FBUyxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLENBQUMsSUFBSSxHQUFHLEdBQUcsRUFBRSxTQUFTLEVBQUU7UUFDeEYsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDbEUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sR0FBRyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNqQyxPQUFPLFNBQVMsS0FBSyxFQUFFO01BQ3JCLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUM7S0FDOUIsQ0FBQztHQUNIOztFQUVELE9BQU87SUFDTCxNQUFNLEVBQUUsU0FBUztJQUNqQixZQUFZLEVBQUUsWUFBWTtHQUMzQixDQUFDO0NBQ0g7O0FDN0hELElBQUksTUFBTSxDQUFDO0FBQ1gsQUFBTyxJQUFJLE1BQU0sQ0FBQztBQUNsQixBQUFPLElBQUksWUFBWSxDQUFDOztBQUV4QixhQUFhLENBQUM7RUFDWixPQUFPLEVBQUUsR0FBRztFQUNaLFNBQVMsRUFBRSxHQUFHO0VBQ2QsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ2IsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztDQUNwQixDQUFDLENBQUM7O0FBRUgsQUFBZSxTQUFTLGFBQWEsQ0FBQyxVQUFVLEVBQUU7RUFDaEQsTUFBTSxHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztFQUNsQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUN2QixZQUFZLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQztFQUNuQyxPQUFPLE1BQU0sQ0FBQztDQUNmOztBQ2hCRCxxQkFBZSxTQUFTLElBQUksRUFBRTtFQUM1QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQy9DOztBQ0ZELHNCQUFlLFNBQVMsSUFBSSxFQUFFLEtBQUssRUFBRTtFQUNuQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDL0c7O0FDRkQscUJBQWUsU0FBUyxJQUFJLEVBQUUsR0FBRyxFQUFFO0VBQ2pDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztFQUNsRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDeEQ7O0FDRkQsaUJBQWUsU0FBUyxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRTtFQUNoRCxJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO01BQ2pCLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7TUFDaEMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssSUFBSSxJQUFJLEdBQUcsRUFBRSxHQUFHLEtBQUssQ0FBQztNQUN4RCxTQUFTLENBQUM7RUFDZCxTQUFTLEdBQUcsZUFBZSxDQUFDLFNBQVMsSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDO0VBQ2xFLFFBQVEsU0FBUyxDQUFDLElBQUk7SUFDcEIsS0FBSyxHQUFHLEVBQUU7TUFDUixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO01BQ3RELElBQUksU0FBUyxDQUFDLFNBQVMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztNQUNySCxPQUFPLFlBQVksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDdkM7SUFDRCxLQUFLLEVBQUUsQ0FBQztJQUNSLEtBQUssR0FBRyxDQUFDO0lBQ1QsS0FBSyxHQUFHLENBQUM7SUFDVCxLQUFLLEdBQUcsQ0FBQztJQUNULEtBQUssR0FBRyxFQUFFO01BQ1IsSUFBSSxTQUFTLENBQUMsU0FBUyxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsU0FBUyxHQUFHLFNBQVMsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO01BQ25MLE1BQU07S0FDUDtJQUNELEtBQUssR0FBRyxDQUFDO0lBQ1QsS0FBSyxHQUFHLEVBQUU7TUFDUixJQUFJLFNBQVMsQ0FBQyxTQUFTLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsU0FBUyxHQUFHLFNBQVMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQztNQUM1SSxNQUFNO0tBQ1A7R0FDRjtFQUNELE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0NBQzFCOztBQ3pCTSxTQUFTLFNBQVMsQ0FBQyxLQUFLLEVBQUU7RUFDL0IsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQzs7RUFFMUIsS0FBSyxDQUFDLEtBQUssR0FBRyxTQUFTLEtBQUssRUFBRTtJQUM1QixJQUFJLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQztJQUNqQixPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLElBQUksR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUM7R0FDakUsQ0FBQzs7RUFFRixLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsS0FBSyxFQUFFLFNBQVMsRUFBRTtJQUM1QyxPQUFPLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7R0FDL0MsQ0FBQzs7RUFFRixLQUFLLENBQUMsSUFBSSxHQUFHLFNBQVMsS0FBSyxFQUFFO0lBQzNCLElBQUksS0FBSyxJQUFJLElBQUksRUFBRSxLQUFLLEdBQUcsRUFBRSxDQUFDOztJQUU5QixJQUFJLENBQUMsR0FBRyxNQUFNLEVBQUU7UUFDWixFQUFFLEdBQUcsQ0FBQztRQUNOLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUM7UUFDakIsS0FBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDYixJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNaLElBQUksQ0FBQzs7SUFFVCxJQUFJLElBQUksR0FBRyxLQUFLLEVBQUU7TUFDaEIsSUFBSSxHQUFHLEtBQUssRUFBRSxLQUFLLEdBQUcsSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUM7TUFDeEMsSUFBSSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUM7S0FDL0I7O0lBRUQsSUFBSSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDOztJQUV6QyxJQUFJLElBQUksR0FBRyxDQUFDLEVBQUU7TUFDWixLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO01BQ3hDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7TUFDckMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQzFDLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFO01BQ25CLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7TUFDdkMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztNQUN0QyxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDMUM7O0lBRUQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFO01BQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztNQUN4QyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO01BQ3RDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNYLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFO01BQ25CLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7TUFDdkMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztNQUN2QyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDWDs7SUFFRCxPQUFPLEtBQUssQ0FBQztHQUNkLENBQUM7O0VBRUYsT0FBTyxLQUFLLENBQUM7Q0FDZDs7QUFFRCxBQUFlLFNBQVMsTUFBTSxHQUFHO0VBQy9CLElBQUksS0FBSyxHQUFHLFVBQVUsQ0FBQ0ksbUJBQWEsRUFBRUMsaUJBQWEsQ0FBQyxDQUFDOztFQUVyRCxLQUFLLENBQUMsSUFBSSxHQUFHLFdBQVc7SUFDdEIsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7R0FDOUIsQ0FBQzs7RUFFRixPQUFPLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztDQUN6Qjs7QUNwRUQsSUFBSUMsSUFBRSxHQUFHLElBQUksSUFBSTtJQUNiQyxJQUFFLEdBQUcsSUFBSSxJQUFJLENBQUM7O0FBRWxCLEFBQWUsU0FBUyxXQUFXLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFOztFQUVqRSxTQUFTLFFBQVEsQ0FBQyxJQUFJLEVBQUU7SUFDdEIsT0FBTyxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7R0FDN0M7O0VBRUQsUUFBUSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUM7O0VBRTFCLFFBQVEsQ0FBQyxJQUFJLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDN0IsT0FBTyxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQztHQUNoRixDQUFDOztFQUVGLFFBQVEsQ0FBQyxLQUFLLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDOUIsSUFBSSxFQUFFLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztRQUNuQixFQUFFLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QixPQUFPLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0dBQ3hDLENBQUM7O0VBRUYsUUFBUSxDQUFDLE1BQU0sR0FBRyxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDckMsT0FBTyxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztHQUNuRixDQUFDOztFQUVGLFFBQVEsQ0FBQyxLQUFLLEdBQUcsU0FBUyxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtJQUMzQyxJQUFJLEtBQUssR0FBRyxFQUFFLEVBQUUsUUFBUSxDQUFDO0lBQ3pCLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzdCLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNDLElBQUksRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxLQUFLLENBQUM7SUFDakQsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7V0FDekUsUUFBUSxHQUFHLEtBQUssSUFBSSxLQUFLLEdBQUcsSUFBSSxFQUFFO0lBQ3pDLE9BQU8sS0FBSyxDQUFDO0dBQ2QsQ0FBQzs7RUFFRixRQUFRLENBQUMsTUFBTSxHQUFHLFNBQVMsSUFBSSxFQUFFO0lBQy9CLE9BQU8sV0FBVyxDQUFDLFNBQVMsSUFBSSxFQUFFO01BQ2hDLElBQUksSUFBSSxJQUFJLElBQUksRUFBRSxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztLQUM1RSxFQUFFLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtNQUN0QixJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7UUFDaEIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFO1VBQ2hDLE9BQU8sT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUU7U0FDMUMsTUFBTSxPQUFPLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRTtVQUN6QixPQUFPLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFO1NBQzFDO09BQ0Y7S0FDRixDQUFDLENBQUM7R0FDSixDQUFDOztFQUVGLElBQUksS0FBSyxFQUFFO0lBQ1QsUUFBUSxDQUFDLEtBQUssR0FBRyxTQUFTLEtBQUssRUFBRSxHQUFHLEVBQUU7TUFDcENELElBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRUMsSUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO01BQ3JDLE1BQU0sQ0FBQ0QsSUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDQyxJQUFFLENBQUMsQ0FBQztNQUN2QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDRCxJQUFFLEVBQUVDLElBQUUsQ0FBQyxDQUFDLENBQUM7S0FDbEMsQ0FBQzs7SUFFRixRQUFRLENBQUMsS0FBSyxHQUFHLFNBQVMsSUFBSSxFQUFFO01BQzlCLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO01BQ3hCLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSTtZQUN0QyxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxRQUFRO1lBQ3RCLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSztnQkFDakIsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUU7Z0JBQzdDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ3RFLENBQUM7R0FDSDs7RUFFRCxPQUFPLFFBQVEsQ0FBQztDQUNqQjs7QUNqRUQsSUFBSSxXQUFXLEdBQUdDLFdBQVEsQ0FBQyxXQUFXOztDQUVyQyxFQUFFLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtFQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO0NBQzVCLEVBQUUsU0FBUyxLQUFLLEVBQUUsR0FBRyxFQUFFO0VBQ3RCLE9BQU8sR0FBRyxHQUFHLEtBQUssQ0FBQztDQUNwQixDQUFDLENBQUM7OztBQUdILFdBQVcsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEVBQUU7RUFDOUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDbEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLElBQUksQ0FBQztFQUMxQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sV0FBVyxDQUFDO0VBQ2pDLE9BQU9BLFdBQVEsQ0FBQyxTQUFTLElBQUksRUFBRTtJQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0dBQ3hDLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0dBQ2hDLEVBQUUsU0FBUyxLQUFLLEVBQUUsR0FBRyxFQUFFO0lBQ3RCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztHQUMxQixDQUFDLENBQUM7Q0FDSixDQUFDOztBQ3RCSyxJQUFJQyxnQkFBYyxHQUFHLEdBQUcsQ0FBQztBQUNoQyxBQUFPLElBQUlDLGdCQUFjLEdBQUcsR0FBRyxDQUFDO0FBQ2hDLEFBQU8sSUFBSUMsY0FBWSxHQUFHLElBQUksQ0FBQztBQUMvQixBQUFPLElBQUlDLGFBQVcsR0FBRyxLQUFLLENBQUM7QUFDL0IsQUFBTyxJQUFJQyxjQUFZLEdBQUcsTUFBTTs7QUNEaEMsSUFBSSxNQUFNLEdBQUdMLFdBQVEsQ0FBQyxTQUFTLElBQUksRUFBRTtFQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHQyxnQkFBYyxDQUFDLEdBQUdBLGdCQUFjLENBQUMsQ0FBQztDQUNsRSxFQUFFLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtFQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksR0FBR0EsZ0JBQWMsQ0FBQyxDQUFDO0NBQzdDLEVBQUUsU0FBUyxLQUFLLEVBQUUsR0FBRyxFQUFFO0VBQ3RCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsS0FBSyxJQUFJQSxnQkFBYyxDQUFDO0NBQ3ZDLEVBQUUsU0FBUyxJQUFJLEVBQUU7RUFDaEIsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Q0FDN0IsQ0FBQzs7QUNSRixJQUFJLE1BQU0sR0FBR0QsV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0VBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUdFLGdCQUFjLENBQUMsR0FBR0EsZ0JBQWMsQ0FBQyxDQUFDO0NBQ2xFLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHQSxnQkFBYyxDQUFDLENBQUM7Q0FDN0MsRUFBRSxTQUFTLEtBQUssRUFBRSxHQUFHLEVBQUU7RUFDdEIsT0FBTyxDQUFDLEdBQUcsR0FBRyxLQUFLLElBQUlBLGdCQUFjLENBQUM7Q0FDdkMsRUFBRSxTQUFTLElBQUksRUFBRTtFQUNoQixPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztDQUMxQixDQUFDOztBQ1JGLElBQUksSUFBSSxHQUFHRixXQUFRLENBQUMsU0FBUyxJQUFJLEVBQUU7RUFDakMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUdFLGdCQUFjLEdBQUdDLGNBQVksQ0FBQztFQUN0RSxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsTUFBTSxJQUFJQSxjQUFZLENBQUM7RUFDdkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxJQUFJQSxjQUFZLENBQUMsR0FBR0EsY0FBWSxHQUFHLE1BQU0sQ0FBQyxDQUFDO0NBQ25GLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHQSxjQUFZLENBQUMsQ0FBQztDQUMzQyxFQUFFLFNBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRTtFQUN0QixPQUFPLENBQUMsR0FBRyxHQUFHLEtBQUssSUFBSUEsY0FBWSxDQUFDO0NBQ3JDLEVBQUUsU0FBUyxJQUFJLEVBQUU7RUFDaEIsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Q0FDeEIsQ0FBQzs7QUNWRixJQUFJLEdBQUcsR0FBR0gsV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0VBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDM0IsRUFBRSxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7RUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7Q0FDckMsRUFBRSxTQUFTLEtBQUssRUFBRSxHQUFHLEVBQUU7RUFDdEIsT0FBTyxDQUFDLEdBQUcsR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsSUFBSUUsZ0JBQWMsSUFBSUUsYUFBVyxDQUFDO0NBQzdHLEVBQUUsU0FBUyxJQUFJLEVBQUU7RUFDaEIsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0NBQzNCLENBQUM7O0FDUkYsU0FBUyxPQUFPLENBQUMsQ0FBQyxFQUFFO0VBQ2xCLE9BQU9KLFdBQVEsQ0FBQyxTQUFTLElBQUksRUFBRTtJQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzNELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7R0FDM0IsRUFBRSxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0dBQ3pDLEVBQUUsU0FBUyxLQUFLLEVBQUUsR0FBRyxFQUFFO0lBQ3RCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixFQUFFLElBQUlFLGdCQUFjLElBQUlHLGNBQVksQ0FBQztHQUM5RyxDQUFDLENBQUM7Q0FDSjs7QUFFRCxBQUFPLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixBQUFPLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixBQUFPLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQyxBQUFPLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxBQUFPLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqQyxBQUFPLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixBQUFPLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7O0FDbEJoQyxJQUFJLEtBQUssR0FBR0wsV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0VBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDaEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztDQUMzQixFQUFFLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtFQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztDQUN2QyxFQUFFLFNBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRTtFQUN0QixPQUFPLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQztDQUMzRixFQUFFLFNBQVMsSUFBSSxFQUFFO0VBQ2hCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0NBQ3hCLENBQUM7O0FDVEYsSUFBSSxJQUFJLEdBQUdBLFdBQVEsQ0FBQyxTQUFTLElBQUksRUFBRTtFQUNqQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNwQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQzNCLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQ3RCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0NBQzdDLEVBQUUsU0FBUyxLQUFLLEVBQUUsR0FBRyxFQUFFO0VBQ3RCLE9BQU8sR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztDQUNoRCxFQUFFLFNBQVMsSUFBSSxFQUFFO0VBQ2hCLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0NBQzNCLENBQUMsQ0FBQzs7O0FBR0gsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsRUFBRTtFQUN2QixPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHQSxXQUFRLENBQUMsU0FBUyxJQUFJLEVBQUU7SUFDL0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN6RCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0dBQzNCLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3RCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztHQUNqRCxDQUFDLENBQUM7Q0FDSixDQUFDOztBQ25CRixJQUFJLFNBQVMsR0FBR0EsV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0VBQ3RDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQzFCLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHRSxnQkFBYyxDQUFDLENBQUM7Q0FDN0MsRUFBRSxTQUFTLEtBQUssRUFBRSxHQUFHLEVBQUU7RUFDdEIsT0FBTyxDQUFDLEdBQUcsR0FBRyxLQUFLLElBQUlBLGdCQUFjLENBQUM7Q0FDdkMsRUFBRSxTQUFTLElBQUksRUFBRTtFQUNoQixPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztDQUM3QixDQUFDOztBQ1JGLElBQUksT0FBTyxHQUFHRixXQUFRLENBQUMsU0FBUyxJQUFJLEVBQUU7RUFDcEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQzdCLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHRyxjQUFZLENBQUMsQ0FBQztDQUMzQyxFQUFFLFNBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRTtFQUN0QixPQUFPLENBQUMsR0FBRyxHQUFHLEtBQUssSUFBSUEsY0FBWSxDQUFDO0NBQ3JDLEVBQUUsU0FBUyxJQUFJLEVBQUU7RUFDaEIsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Q0FDM0IsQ0FBQzs7QUNSRixJQUFJLE1BQU0sR0FBR0gsV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0VBQ25DLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDOUIsRUFBRSxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7RUFDdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7Q0FDM0MsRUFBRSxTQUFTLEtBQUssRUFBRSxHQUFHLEVBQUU7RUFDdEIsT0FBTyxDQUFDLEdBQUcsR0FBRyxLQUFLLElBQUlJLGFBQVcsQ0FBQztDQUNwQyxFQUFFLFNBQVMsSUFBSSxFQUFFO0VBQ2hCLE9BQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztDQUM5QixDQUFDOztBQ1JGLFNBQVMsVUFBVSxDQUFDLENBQUMsRUFBRTtFQUNyQixPQUFPSixXQUFRLENBQUMsU0FBUyxJQUFJLEVBQUU7SUFDN0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNwRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0dBQzlCLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQ3RCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztHQUMvQyxFQUFFLFNBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRTtJQUN0QixPQUFPLENBQUMsR0FBRyxHQUFHLEtBQUssSUFBSUssY0FBWSxDQUFDO0dBQ3JDLENBQUMsQ0FBQztDQUNKOztBQUVELEFBQU8sSUFBSSxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLEFBQU8sSUFBSSxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLEFBQU8sSUFBSSxVQUFVLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLEFBQU8sSUFBSSxZQUFZLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLEFBQU8sSUFBSSxXQUFXLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLEFBQU8sSUFBSSxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLEFBQU8sSUFBSSxXQUFXLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQzs7QUNsQnRDLElBQUksUUFBUSxHQUFHTCxXQUFRLENBQUMsU0FBUyxJQUFJLEVBQUU7RUFDckMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNuQixJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQzlCLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQ3RCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0NBQzdDLEVBQUUsU0FBUyxLQUFLLEVBQUUsR0FBRyxFQUFFO0VBQ3RCLE9BQU8sR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxDQUFDO0NBQ3ZHLEVBQUUsU0FBUyxJQUFJLEVBQUU7RUFDaEIsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Q0FDM0IsQ0FBQzs7QUNURixJQUFJLE9BQU8sR0FBR0EsV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0VBQ3BDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ3ZCLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDOUIsRUFBRSxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7RUFDdEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7Q0FDbkQsRUFBRSxTQUFTLEtBQUssRUFBRSxHQUFHLEVBQUU7RUFDdEIsT0FBTyxHQUFHLENBQUMsY0FBYyxFQUFFLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO0NBQ3RELEVBQUUsU0FBUyxJQUFJLEVBQUU7RUFDaEIsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Q0FDOUIsQ0FBQyxDQUFDOzs7QUFHSCxPQUFPLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxFQUFFO0VBQzFCLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUdBLFdBQVEsQ0FBQyxTQUFTLElBQUksRUFBRTtJQUMvRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQy9ELElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZCLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7R0FDOUIsRUFBRSxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDdEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0dBQ3ZELENBQUMsQ0FBQztDQUNKLENBQUM7O0FDVEYsU0FBUyxTQUFTLENBQUMsQ0FBQyxFQUFFO0VBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUU7SUFDekIsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RCxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixPQUFPLElBQUksQ0FBQztHQUNiO0VBQ0QsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDcEQ7O0FBRUQsU0FBUyxPQUFPLENBQUMsQ0FBQyxFQUFFO0VBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUU7SUFDekIsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEUsSUFB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Q0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ2hEOztBQUVELFNBQVMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFDOUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM5QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ2hEOztBQUVELFNBQVMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFDM0MsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM5QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ2hEOztBQUVELFNBQVMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFDeEMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM5QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENB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S0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtJQUNqQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQy9DLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHO1FBQ2IsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHO1FBQ2IsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFO1FBQ2IsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFO1FBQ2IsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFO1FBQ2IsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFO1FBQ2IsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQzs7O0lBR2xDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxDQUFDOzs7SUFHcEQsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLElBQUksRUFBRTtNQUNyQixJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0tBQ3pEOzs7U0FHSSxJQUFJLEVBQUUsS0FBSyxHQUFHLE9BQU8sQ0FBQyxFQUFFLEVBQUU7Ozs7O1NBSzFCLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO01BQzNELElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUM7S0FDekQ7OztTQUdJO01BQ0gsSUFBSSxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUU7VUFDYixHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUU7VUFDYixLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztVQUM3QixLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztVQUM3QixHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7VUFDdEIsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1VBQ3RCLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssR0FBRyxLQUFLLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztVQUNqRixHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUc7VUFDYixHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQzs7O01BR2xCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxFQUFFO1FBQy9CLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLEVBQUUsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLEVBQUUsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7T0FDM0Q7O01BRUQsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsT0FBTyxJQUFJLEVBQUUsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7S0FDNUk7R0FDRjtFQUNELEdBQUcsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZCLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNyQixFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3JCLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRTtRQUNYLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRTtRQUNYLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRztRQUNaLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDOzs7SUFHakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLENBQUM7OztJQUdwRCxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssSUFBSSxFQUFFO01BQ3JCLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDO0tBQy9COzs7U0FHSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxPQUFPLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLE9BQU8sRUFBRTtNQUMvRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztLQUMvQjs7O0lBR0QsSUFBSSxDQUFDLENBQUMsRUFBRSxPQUFPOzs7SUFHZixJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDOzs7SUFHaEMsSUFBSSxFQUFFLEdBQUcsVUFBVSxFQUFFO01BQ25CLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLE9BQU8sR0FBRyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxPQUFPLEdBQUcsRUFBRSxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0tBQ2pLOzs7U0FHSSxJQUFJLEVBQUUsR0FBRyxPQUFPLEVBQUU7TUFDckIsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsS0FBSyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUNwSjtHQUNGO0VBQ0QsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0lBQ3pCLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7R0FDNUg7RUFDRCxRQUFRLEVBQUUsV0FBVztJQUNuQixPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7R0FDZjtDQUNGLENBQUM7O0FDL0hGLGlCQUFlLFNBQVMsQ0FBQyxFQUFFO0VBQ3pCLE9BQU8sU0FBUyxRQUFRLEdBQUc7SUFDekIsT0FBTyxDQUFDLENBQUM7R0FDVixDQUFDO0NBQ0g7O0FDSkQsU0FBUyxNQUFNLENBQUMsT0FBTyxFQUFFO0VBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO0NBQ3pCOztBQUVELE1BQU0sQ0FBQyxTQUFTLEdBQUc7RUFDakIsU0FBUyxFQUFFLFdBQVc7SUFDcEIsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7R0FDaEI7RUFDRCxPQUFPLEVBQUUsV0FBVztJQUNsQixJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQztHQUNsQjtFQUNELFNBQVMsRUFBRSxXQUFXO0lBQ3BCLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0dBQ2pCO0VBQ0QsT0FBTyxFQUFFLFdBQVc7SUFDbEIsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNyRixJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0dBQzdCO0VBQ0QsS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtJQUNwQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2YsUUFBUSxJQUFJLENBQUMsTUFBTTtNQUNqQixLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07TUFDckcsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7TUFDeEIsU0FBUyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0tBQzVDO0dBQ0Y7Q0FDRixDQUFDOztBQUVGLGtCQUFlLFNBQVMsT0FBTyxFQUFFO0VBQy9CLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDNUI7O0FDOUJNLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNuQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUNiOztBQUVELEFBQU8sU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ25CLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ2I7O0FDREQsV0FBZSxXQUFXO0VBQ3hCLElBQUlFLElBQUMsR0FBR0MsQ0FBTTtNQUNWQyxJQUFDLEdBQUdDLENBQU07TUFDVixPQUFPLEdBQUdqQyxVQUFRLENBQUMsSUFBSSxDQUFDO01BQ3hCLE9BQU8sR0FBRyxJQUFJO01BQ2QsS0FBSyxHQUFHLFdBQVc7TUFDbkIsTUFBTSxHQUFHLElBQUksQ0FBQzs7RUFFbEIsU0FBUyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ2xCLElBQUksQ0FBQztRQUNELENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTTtRQUNmLENBQUM7UUFDRCxRQUFRLEdBQUcsS0FBSztRQUNoQixNQUFNLENBQUM7O0lBRVgsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDLENBQUM7O0lBRXJELEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO01BQ3ZCLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLFFBQVEsRUFBRTtRQUMxRCxJQUFJLFFBQVEsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7YUFDeEMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO09BQ3ZCO01BQ0QsSUFBSSxRQUFRLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDOEIsSUFBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQ0UsSUFBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUM1RDs7SUFFRCxJQUFJLE1BQU0sRUFBRSxPQUFPLE1BQU0sR0FBRyxJQUFJLEVBQUUsTUFBTSxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUM7R0FDdkQ7O0VBRUQsSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsRUFBRTtJQUNuQixPQUFPLFNBQVMsQ0FBQyxNQUFNLElBQUlGLElBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUFHOUIsVUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJOEIsSUFBQyxDQUFDO0dBQ3RGLENBQUM7O0VBRUYsSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsRUFBRTtJQUNuQixPQUFPLFNBQVMsQ0FBQyxNQUFNLElBQUlFLElBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUFHaEMsVUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJZ0MsSUFBQyxDQUFDO0dBQ3RGLENBQUM7O0VBRUYsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUMsRUFBRTtJQUN6QixPQUFPLFNBQVMsQ0FBQyxNQUFNLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQUdoQyxVQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxPQUFPLENBQUM7R0FDbkcsQ0FBQzs7RUFFRixJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxFQUFFO0lBQ3ZCLE9BQU8sU0FBUyxDQUFDLE1BQU0sSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLE9BQU8sSUFBSSxJQUFJLEtBQUssTUFBTSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxLQUFLLENBQUM7R0FDbkcsQ0FBQzs7RUFFRixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxFQUFFO0lBQ3pCLE9BQU8sU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksSUFBSSxHQUFHLE9BQU8sR0FBRyxNQUFNLEdBQUcsSUFBSSxHQUFHLE1BQU0sR0FBRyxLQUFLLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxPQUFPLENBQUM7R0FDL0csQ0FBQzs7RUFFRixPQUFPLElBQUksQ0FBQztDQUNiOztBQ2hERCxXQUFlLFdBQVc7RUFDeEIsSUFBSSxFQUFFLEdBQUcrQixDQUFNO01BQ1gsRUFBRSxHQUFHLElBQUk7TUFDVCxFQUFFLEdBQUcvQixVQUFRLENBQUMsQ0FBQyxDQUFDO01BQ2hCLEVBQUUsR0FBR2lDLENBQU07TUFDWCxPQUFPLEdBQUdqQyxVQUFRLENBQUMsSUFBSSxDQUFDO01BQ3hCLE9BQU8sR0FBRyxJQUFJO01BQ2QsS0FBSyxHQUFHLFdBQVc7TUFDbkIsTUFBTSxHQUFHLElBQUksQ0FBQzs7RUFFbEIsU0FBUyxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ2xCLElBQUksQ0FBQztRQUNELENBQUM7UUFDRCxDQUFDO1FBQ0QsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNO1FBQ2YsQ0FBQztRQUNELFFBQVEsR0FBRyxLQUFLO1FBQ2hCLE1BQU07UUFDTixHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzs7SUFFdkIsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDLENBQUM7O0lBRXJELEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO01BQ3ZCLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLFFBQVEsRUFBRTtRQUMxRCxJQUFJLFFBQVEsR0FBRyxDQUFDLFFBQVEsRUFBRTtVQUN4QixDQUFDLEdBQUcsQ0FBQyxDQUFDO1VBQ04sTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1VBQ25CLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztTQUNwQixNQUFNO1VBQ0wsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1VBQ2pCLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztVQUNuQixLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7V0FDOUI7VUFDRCxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7VUFDakIsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ2xCO09BQ0Y7TUFDRCxJQUFJLFFBQVEsRUFBRTtRQUNaLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQzVFO0tBQ0Y7O0lBRUQsSUFBSSxNQUFNLEVBQUUsT0FBTyxNQUFNLEdBQUcsSUFBSSxFQUFFLE1BQU0sR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDO0dBQ3ZEOztFQUVELFNBQVMsUUFBUSxHQUFHO0lBQ2xCLE9BQU8sSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDOUQ7O0VBRUQsSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsRUFBRTtJQUNuQixPQUFPLFNBQVMsQ0FBQyxNQUFNLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQUdBLFVBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQztHQUNuRyxDQUFDOztFQUVGLElBQUksQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDLEVBQUU7SUFDcEIsT0FBTyxTQUFTLENBQUMsTUFBTSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUFHQSxVQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDO0dBQ3hGLENBQUM7O0VBRUYsSUFBSSxDQUFDLEVBQUUsR0FBRyxTQUFTLENBQUMsRUFBRTtJQUNwQixPQUFPLFNBQVMsQ0FBQyxNQUFNLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQUdBLFVBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUM7R0FDM0csQ0FBQzs7RUFFRixJQUFJLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxFQUFFO0lBQ25CLE9BQU8sU0FBUyxDQUFDLE1BQU0sSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLEtBQUssVUFBVSxHQUFHLENBQUMsR0FBR0EsVUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLElBQUksRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDO0dBQ25HLENBQUM7O0VBRUYsSUFBSSxDQUFDLEVBQUUsR0FBRyxTQUFTLENBQUMsRUFBRTtJQUNwQixPQUFPLFNBQVMsQ0FBQyxNQUFNLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQUdBLFVBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUM7R0FDeEYsQ0FBQzs7RUFFRixJQUFJLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxFQUFFO0lBQ3BCLE9BQU8sU0FBUyxDQUFDLE1BQU0sSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssVUFBVSxHQUFHLENBQUMsR0FBR0EsVUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQztHQUMzRyxDQUFDOztFQUVGLElBQUksQ0FBQyxNQUFNO0VBQ1gsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXO0lBQ3ZCLE9BQU8sUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztHQUMvQixDQUFDOztFQUVGLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVztJQUN2QixPQUFPLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7R0FDL0IsQ0FBQzs7RUFFRixJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVc7SUFDdkIsT0FBTyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0dBQy9CLENBQUM7O0VBRUYsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUMsRUFBRTtJQUN6QixPQUFPLFNBQVMsQ0FBQyxNQUFNLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQUdBLFVBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLE9BQU8sQ0FBQztHQUNuRyxDQUFDOztFQUVGLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEVBQUU7SUFDdkIsT0FBTyxTQUFTLENBQUMsTUFBTSxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsT0FBTyxJQUFJLElBQUksS0FBSyxNQUFNLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLEtBQUssQ0FBQztHQUNuRyxDQUFDOztFQUVGLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLEVBQUU7SUFDekIsT0FBTyxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxJQUFJLEdBQUcsT0FBTyxHQUFHLE1BQU0sR0FBRyxJQUFJLEdBQUcsTUFBTSxHQUFHLEtBQUssQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJLE9BQU8sQ0FBQztHQUMvRyxDQUFDOztFQUVGLE9BQU8sSUFBSSxDQUFDO0NBQ2I7O0FDNUdELFNBQVMsSUFBSSxDQUFDLENBQUMsRUFBRTtFQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDdkI7Ozs7OztBQU1ELFNBQVMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzVCLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUc7TUFDeEIsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRztNQUNsQixFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7TUFDakQsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7TUFDM0MsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztFQUN4QyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUM3Rjs7O0FBR0QsU0FBUyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRTtFQUN2QixJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7RUFDNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0NBQ3hEOzs7OztBQUtELFNBQVNrQyxPQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7RUFDM0IsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUc7TUFDYixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUc7TUFDYixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUc7TUFDYixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUc7TUFDYixFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztFQUN2QixJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0NBQ25GOztBQUVELFNBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRTtFQUMxQixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztDQUN6Qjs7QUFFRCxTQUFTLENBQUMsU0FBUyxHQUFHO0VBQ3BCLFNBQVMsRUFBRSxXQUFXO0lBQ3BCLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0dBQ2hCO0VBQ0QsT0FBTyxFQUFFLFdBQVc7SUFDbEIsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUM7R0FDbEI7RUFDRCxTQUFTLEVBQUUsV0FBVztJQUNwQixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHO0lBQ25CLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUc7SUFDbkIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7SUFDZixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztHQUNqQjtFQUNELE9BQU8sRUFBRSxXQUFXO0lBQ2xCLFFBQVEsSUFBSSxDQUFDLE1BQU07TUFDakIsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNO01BQ3hELEtBQUssQ0FBQyxFQUFFQSxPQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07S0FDOUQ7SUFDRCxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3JGLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7R0FDN0I7RUFDRCxLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0lBQ3BCLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQzs7SUFFYixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2YsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPO0lBQzdDLFFBQVEsSUFBSSxDQUFDLE1BQU07TUFDakIsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO01BQ3JHLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTTtNQUMvQixLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDQSxPQUFLLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNO01BQ3ZGLFNBQVNBLE9BQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07S0FDaEU7O0lBRUQsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUNsQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztHQUNmO0VBQ0Y7O0FBRUQsU0FBUyxTQUFTLENBQUMsT0FBTyxFQUFFO0VBQzFCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDN0M7O0FBRUQsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssR0FBRyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDaEYsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDNUMsQ0FBQzs7QUFFRixTQUFTLGNBQWMsQ0FBQyxPQUFPLEVBQUU7RUFDL0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7Q0FDekI7O0FBRUQsY0FBYyxDQUFDLFNBQVMsR0FBRztFQUN6QixNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDdEQsU0FBUyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUU7RUFDcEQsTUFBTSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ3RELGFBQWEsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0NBQ3JHLENBQUM7O0FDL0ZLLElBQUl0QyxPQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLOztBQ0F4QyxpQkFBZSxTQUFTLENBQUMsRUFBRTtFQUN6QixPQUFPLENBQUMsQ0FBQztDQUNWOztBQ0NELElBQUksR0FBRyxHQUFHLENBQUM7SUFDUCxLQUFLLEdBQUcsQ0FBQztJQUNULE1BQU0sR0FBRyxDQUFDO0lBQ1YsSUFBSSxHQUFHLENBQUM7SUFDUnVDLFNBQU8sR0FBRyxJQUFJLENBQUM7O0FBRW5CLFNBQVMsVUFBVSxDQUFDLENBQUMsRUFBRTtFQUNyQixPQUFPLFlBQVksSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO0NBQ3pDOztBQUVELFNBQVMsVUFBVSxDQUFDLENBQUMsRUFBRTtFQUNyQixPQUFPLGNBQWMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO0NBQ3pDOztBQUVELFNBQVM5QixRQUFNLENBQUMsS0FBSyxFQUFFO0VBQ3JCLE9BQU8sU0FBUyxDQUFDLEVBQUU7SUFDakIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNsQixDQUFDO0NBQ0g7O0FBRUQsU0FBUyxNQUFNLENBQUMsS0FBSyxFQUFFO0VBQ3JCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDcEQsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDL0MsT0FBTyxTQUFTLENBQUMsRUFBRTtJQUNqQixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQztHQUMzQixDQUFDO0NBQ0g7O0FBRUQsU0FBUyxRQUFRLEdBQUc7RUFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7Q0FDckI7O0FBRUQsU0FBUyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRTtFQUMzQixJQUFJLGFBQWEsR0FBRyxFQUFFO01BQ2xCLFVBQVUsR0FBRyxJQUFJO01BQ2pCLFVBQVUsR0FBRyxJQUFJO01BQ2pCLGFBQWEsR0FBRyxDQUFDO01BQ2pCLGFBQWEsR0FBRyxDQUFDO01BQ2pCLFdBQVcsR0FBRyxDQUFDO01BQ2YsQ0FBQyxHQUFHLE1BQU0sS0FBSyxHQUFHLElBQUksTUFBTSxLQUFLLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO01BQzlDLENBQUMsR0FBRyxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUc7TUFDbkQsU0FBUyxHQUFHLE1BQU0sS0FBSyxHQUFHLElBQUksTUFBTSxLQUFLLE1BQU0sR0FBRyxVQUFVLEdBQUcsVUFBVSxDQUFDOztFQUU5RSxTQUFTLElBQUksQ0FBQyxPQUFPLEVBQUU7SUFDckIsSUFBSSxNQUFNLEdBQUcsVUFBVSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksVUFBVTtRQUNuSCxNQUFNLEdBQUcsVUFBVSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsR0FBR0UsVUFBUSxJQUFJLFVBQVU7UUFDdkgsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxHQUFHLFdBQVc7UUFDbEQsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUU7UUFDckIsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUc7UUFDeEIsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRztRQUN2QyxRQUFRLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE1BQU0sR0FBR0YsUUFBTSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM1RCxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsT0FBTztRQUM3RCxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRCxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRTtRQUMvRCxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRTtRQUN0QixTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQztRQUMxRCxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7O0lBRS9CLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQztTQUNqRCxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztTQUN2QixJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7O0lBRTdCLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDOztJQUU3QixJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztTQUNyQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQztTQUN0QixJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQzs7SUFFdkMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7U0FDckMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7U0FDcEIsSUFBSSxDQUFDLENB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QUFDLENBQUM7S0FDL0U7O0lBRUQsT0FBTyxJQUFJLENBQUM7R0FDYjtFQUNELElBQUksRUFBRSxXQUFXO0lBQ2YsSUFBSSxJQUFJLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzFCLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUMzQjtFQUNELElBQUksRUFBRSxTQUFTLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDekIsSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN0SCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMzRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDdEY7RUFDRCxLQUFLLEVBQUUs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UyxVQUFVLEdBQUc7RUFDM0IsR0FBRyxFQUFFLENBQUM7RUFDTixFQUFFLEtBQUssQ0FBQztFQUNSLElBQUksQ0FBQyxHQUFHLFFBQVEsRUFBRSxDQUFDLENBQUM7RUFDcEIsT0FBTyxDQUFDLEVBQUU7SUFDUixJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDYjtFQUNELEVBQUUsS0FBSyxDQUFDO0NBQ1Q7O0FBRUQsU0FBUyxJQUFJLEdBQUc7RUFDZCxRQUFRLEdBQUcsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLFNBQVMsQ0FBQztFQUNqRCxLQUFLLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQztFQUNwQixJQUFJO0lBQ0YsVUFBVSxFQUFFLENBQUM7R0FDZCxTQUFTO0lBQ1IsS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNWLEdBQUcsRUFBRSxDQUFDO0lBQ04sUUFBUSxHQUFHLENBQUMsQ0FBQztHQUNkO0NBQ0Y7O0FBRUQsU0FBUyxJQUFJLEdBQUc7RUFDZCxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsS0FBSyxHQUFHLEdBQUcsR0FBRyxTQUFTLENBQUM7RUFDL0MsSUFBSSxLQUFLLEdBQUcsU0FBUyxFQUFFLFNBQVMsSUFBSSxLQUFLLEVBQUUsU0FBUyxHQUFHLEdBQUcsQ0FBQztDQUM1RDs7QUFFRCxTQUFTLEdBQUcsR0FBRztFQUNiLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxRQUFRLEVBQUUsRUFBRSxFQUFFLElBQUksR0FBRyxRQUFRLENBQUM7RUFDM0MsT0FBTyxFQUFFLEVBQUU7SUFDVCxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUU7TUFDWixJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLElB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QUFJLEVBQUUsUUFBUSxDQUFDO0lBQzlCLFdBQVcsR0FBRyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQzs7QUFFbkMsSUFBSSxDQUFDLEdBQUc7RUFDTixJQUFJLEVBQUUsR0FBRztFQUNULE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO0VBQzdCLEtBQUssRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUN6RSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0NBQzVELENBQUM7O0FBRUYsSUFBSSxDQUFDLEdBQUc7RUFDTixJQUFJLEVBQUUsR0FBRztFQUNULE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO0VBQzdCLEtBQUssRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUN6RSxNQUFNLEVB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Q0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7V0FDaEQsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O01BRXZELEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO1dBQ3JCLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDO1dBQ3RCLElBQUksQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztXQUMxSSxJQUFJLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7V0FDMUgsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxHQUFHLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsVUFB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QUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUM7ZUFDN0UsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztVQUN2RixJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO2VBQzdFLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7VUFDdkYsTUFBTTtTQUNQO1FBQ0QsS0FBSyxXQUFXLEVBQUU7VUFDaEIsSUFBSSxLQUFLLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxD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QyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7a0JBQ2hFLE9BQU8sQ0FBQyxJQUFJLFFBQVEsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDO2FBQzVDLENBQUMsQ0FBQyxDQUFDOztZQUVKLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzs7WUFFaEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNsRDs7OztRQUlELElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0RCxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOztRQUV0RCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUk7WUFDMUIsSUFBSSxLQUFLLEdBQUcsRUFBRSxD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LENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7UUFHakYsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ1AsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDckIsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7OztRQUd2RyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUMxQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzs7UUFFbEQsSUFBSSxNQUFNLEdBQUcsSUFBSSxFQUFFO2FBQ2QsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxD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
