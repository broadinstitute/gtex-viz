var GeneEqtlVisualizer = (function (exports) {
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

function parseTypenames(typenames, types) {
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
        T = parseTypenames(typename + "", _),
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
      if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
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

function set(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({name: name, value: callback});
  return type;
}

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

function empty$1() {
  return [];
}

var selectorAll = function(selector) {
  return selector == null ? empty$1 : function() {
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

function parseTypenames$1(typenames) {
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
  var typenames = parseTypenames$1(typename + ""), i, n = typenames.length, t;

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
  hex: function() {
    return this.rgb().hex();
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
  hex: function() {
    return "#" + hex(this.r) + hex(this.g) + hex(this.b);
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

function hex(value) {
  value = Math.max(0, Math.min(255, Math.round(value) || 0));
  return (value < 16 ? "0" : "") + value.toString(16);
}

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

// https://beta.observablehq.com/@mbostock/lab-and-rgb
var K = 18;
var Xn = 0.96422;
var Yn = 1;
var Zn = 0.82521;
var t0 = 4 / 29;
var t1 = 6 / 29;
var t2 = 3 * t1 * t1;
var t3 = t1 * t1 * t1;

function labConvert(o) {
  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
  if (o instanceof Hcl) {
    if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
    var h = o.h * deg2rad;
    return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
  }
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var r = rgb2lrgb(o.r),
      g = rgb2lrgb(o.g),
      b = rgb2lrgb(o.b),
      y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn), x, z;
  if (r === g && g === b) x = z = y; else {
    x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn);
    z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn);
  }
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
    return new Lab(this.l + K * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  darker: function(k) {
    return new Lab(this.l - K * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  rgb: function() {
    var y = (this.l + 16) / 116,
        x = isNaN(this.a) ? y : y + this.a / 500,
        z = isNaN(this.b) ? y : y - this.b / 200;
    x = Xn * lab2xyz(x);
    y = Yn * lab2xyz(y);
    z = Zn * lab2xyz(z);
    return new Rgb(
      lrgb2rgb( 3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
      lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z),
      lrgb2rgb( 0.0719453 * x - 0.2289914 * y + 1.4052427 * z),
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

function lrgb2rgb(x) {
  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
}

function rgb2lrgb(x) {
  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function hclConvert(o) {
  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
  if (!(o instanceof Lab)) o = labConvert(o);
  if (o.a === 0 && o.b === 0) return new Hcl(NaN, 0, o.l, o.opacity);
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
    return new Hcl(this.h, this.c, this.l + K * (k == null ? 1 : k), this.opacity);
  },
  darker: function(k) {
    return new Hcl(this.h, this.c, this.l - K * (k == null ? 1 : k), this.opacity);
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

function linear(a, d) {
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
  return d ? linear(a, d > 180 || d < -180 ? d - 360 * Math.round(d / 360) : d) : constant$2(isNaN(a) ? b : a);
}

function gamma(y) {
  return (y = +y) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y) : constant$2(isNaN(a) ? b : a);
  };
}

function nogamma(a, b) {
  var d = b - a;
  return d ? linear(a, d) : constant$2(isNaN(a) ? b : a);
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

var array = function(a, b) {
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

var reinterpolate = function(a, b) {
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
      q.push({i: i, x: reinterpolate(am, bm)});
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
      : (t === "number" ? reinterpolate
      : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
      : b instanceof color ? interpolateRgb
      : b instanceof Date ? date
      : Array.isArray(b) ? array
      : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
      : reinterpolate)(a, b);
};

var interpolateRound = function(a, b) {
  return a = +a, b -= a, function(t) {
    return Math.round(a + b * t);
  };
};

var degrees = 180 / Math.PI;

var identity = {
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
  if (value === "none") return identity;
  if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
  cssNode.style.transform = value;
  value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
  cssRoot.removeChild(cssNode);
  value = value.slice(7, -1).split(",");
  return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
}

function parseSvg(value) {
  if (value == null) return identity;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
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
      q.push({i: i - 4, x: reinterpolate(xa, xb)}, {i: i - 2, x: reinterpolate(ya, yb)});
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }

  function rotate(a, b, s, q) {
    if (a !== b) {
      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: reinterpolate(a, b)});
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }

  function skewX(a, b, s, q) {
    if (a !== b) {
      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: reinterpolate(a, b)});
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }

  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({i: i - 4, x: reinterpolate(xa, xb)}, {i: i - 2, x: reinterpolate(ya, yb)});
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

function set$1(node, id) {
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
    var schedule$$1 = set$1(this, id),
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
    var schedule$$1 = set$1(this, id),
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
    var schedule$$1 = set$1(this, id);
    (schedule$$1.value || (schedule$$1.value = {}))[name] = value.apply(this, arguments);
  });

  return function(node) {
    return get$1(node, id).value[name];
  };
}

var interpolate = function(a, b) {
  var c;
  return (typeof b === "number" ? reinterpolate
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
      : get$1(this.node(), id).delay;
};

function durationFunction(id, value) {
  return function() {
    set$1(this, id).duration = +value.apply(this, arguments);
  };
}

function durationConstant(id, value) {
  return value = +value, function() {
    set$1(this, id).duration = value;
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
    set$1(this, id).ease = value;
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
  var on0, on1, sit = start(name) ? init : set$1;
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

var constant$3 = function(x) {
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
function local(node) {
  while (!node.__brush) if (!(node = node.parentNode)) return;
  return node.__brush;
}

function empty(extent) {
  return extent[0][0] === extent[1][0]
      || extent[0][1] === extent[1][1];
}



function brushX() {
  return brush$1(X);
}



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
          var extent = local(this).extent;
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
                i = interpolateValue(selection0, selection1);

            function tween(t) {
              state.selection = t === 1 && empty(selection1) ? null : i(t);
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
            state.selection = selection1 == null || empty(selection1) ? null : selection1;
            redraw.call(that);
            emit.start().brush().end();
          });
    }
  };

  function redraw() {
    var group = select(this),
        selection = local(this).selection;

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
        state = local(that),
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
      if (empty(selection)) state.selection = null, redraw.call(that);
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
    return arguments.length ? (extent = typeof _ === "function" ? _ : constant$3([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), brush) : extent;
  };

  brush.filter = function(_) {
    return arguments.length ? (filter = typeof _ === "function" ? _ : constant$3(!!_), brush) : filter;
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

/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
/**
 * Creates an SVG
 * @param id {String} a DOM element ID that starts with a "#"
 * @param width {Numeric}
 * @param height {Numeric}
 * @param margin {Object} with two attributes: width and height
 * @return {Selection} the d3 selection object of the SVG
 */

function checkDomId(id){
    // test input params
    if ($(`#${id}`).length == 0) {
        let error = `Input Error: DOM ID ${id} is not found.`;
        alert(error);
        throw error;
    }
}

/**
 * Create a Canvas D3 object
 * @param id {String} the parent dom ID
 * @param width {Numeric}: the outer width
 * @param height {Numeric}: the outer height
 * @param margin {Object} with attr: left, top
 * @param canvasId {String}
 * @returns {*}
 */


/**
 * Create an SVG D3 object
 * @param id {String} the parent dom ID
 * @param width {Numeric}: the outer width
 * @param height {Numeric}: the outer height
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


/**
 * Generate a list of x*y data objects with random values
 * The data object has this structure: {x: xlabel, y: ylabel, value: some value, displayValue: some value}
 * @param par
 * @returns {Array}
 */


/**
 * Generate a list of random values
 * @param par
 * @returns {Array}
 */

/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
"use strict";
function getGtexUrls(){
    const host = 'https://gtexportal.org/rest/v1/';
    // const host = 'local.gtexportal.org/rest/v1/'
    return {
        // gene-eqtl visualizer specific
        singleTissueEqtl: host + 'association/singleTissueEqtl?format=json&datasetId=gtex_v7&gencodeId=',
        ld: host + 'dataset/ld?format=json&datasetId=gtex_v7&gencodeId=',

        // eqtl Dashboard specific
        dyneqtl: host + 'association/dyneqtl',
        snp: host + 'reference/variant?format=json&snpId=',
        variantId: host + 'dataset/variant?format=json&variantId=',

        // transcript, exon, junction expression specific
        exonExp: host + 'expression/medianExonExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',
        transcriptExp: host + 'expression/medianTranscriptExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',
        junctionExp: host + 'expression/medianJunctionExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',
        transcript: host + 'reference/transcript?datasetId=gtex_v7&gencodeId=',
        exon: host + 'reference/exon?datasetId=gtex_v7&gencodeId=',
        geneModel: host + 'dataset/collapsedGeneModelExon?datasetId=gtex_v7&gencodeId=',
        geneModelUnfiltered: host + 'dataset/fullCollapsedGeneModelExon?datasetId=gtex_v7&gencodeId=',

        // gene expression violin plot specific
        geneExp: host + 'expression/geneExpression?datasetId=gtex_v7&gencodeId=',

        // gene expression heat map specific
        medGeneExp: host + 'expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&pageSize=10000',

        // top expressed gene expression specific
        topInTissueFiltered: host + 'expression/topExpressedGene?datasetId=gtex_v7&filterMtGene=true&sortBy=median&sortDirection=desc&pageSize=50&tissueSiteDetailId=',
        topInTissue: host + 'expression/topExpressedGene?datasetId=gtex_v7&sortBy=median&sortDirection=desc&pageSize=50&tissueSiteDetailId=',

        geneId: host + 'reference/gene?format=json&gencodeVersion=v19&genomeBuild=GRCh37%2Fhg19&geneId=',

        // tissue menu specific
        tissue:  host + 'metadata/tissueSiteDetail?format=json',

        tissueSites: host + 'metadata/tissueSiteDetail?format=json',

        // local static files
        sample: 'tmpSummaryData/gtex.Sample.csv',
        rnaseqCram: 'tmpSummaryData/rnaseq_cram_files_v7_dbGaP_011516.txt',
        wgsCram: 'tmpSummaryData/wgs_cram_files_v7_hg38_dbGaP_011516.txt',

        // fireCloud
        fcBilling: 'https://api.firecloud.org/api/profile/billing',
        fcWorkSpace: 'https://api.firecloud.org/api/workspaces',
        fcPortalWorkSpace: 'https://portal.firecloud.org/#workspaces'
    }
}

/**
 * Parse the single tissue eqtls from GTEx web service
 * @param data {Json}
 * @returns {List} of eqtls with attributes required for GEV rendering
 */
function parseSingleTissueEqtls(data){
    const attr = 'singleTissueEqtl';
    if(!data.hasOwnProperty(attr)) throw "Parsing Error: required attribute is not found: " + attr;
    ['variantId', 'tissueSiteDetailId', 'nes', 'pValue'].forEach((k)=>{
        if (!data[attr][0].hasOwnProperty(k)) throw 'Parsing Error: required attribute is missing: ' + attr;
    });
    const generateShortVariantId = function(id){
        var temp = id.split("_");
        if(temp[2].length == 1 && temp[3].length == 1) return id;
        if(temp[2].length > temp[3].length) {
            temp[2] = "del";
            temp.splice(3, 1); // delete the alt
        }
        else if(temp[3].length > temp[2].length) {
            temp[3] = "ins";
            temp.splice(2, 1); // delete the ref
        }
        else { // temp[3].length == temp[2].length and temp[3].length > 1
            temp[3] = "sub";
            temp.splice(2, 1); // delete the ref
        }
        return temp.join("_");
    };

    return data[attr].map((d)=>{
        d.x = d.variantId;
        d.displayX = generateShortVariantId(d.variantId);
        d.y = d.tissueSiteDetailId;
        d.value = d.nes;
        d.displayValue = d.nes.toPrecision(3);
        d.r = -Math.log10(d.pValue); // set r to be the -log10(p-value)
        d.rDisplayValue = parseFloat(d.pValue.toExponential()).toPrecision(3);
        return d;
    })
}



/**
 * Parse the genes from GTEx web service
 * @param data {Json}
 * @returns {List} of genes
 */
function parseGenes(data, single=false, geneId=null){
    const attr = 'gene';
    if(!data.hasOwnProperty(attr)) throw "Parsing Error: attribute gene doesn't exist.";
    if (data.gene.length==0){
         alert("No gene is found");
         throw "Fatal Error: gene(s) not found";
     }
    if (single){
        if (geneId === null) throw "Please provide a gene ID for search results validation";
        if (data.gene.length>1) { // when a single gene ID has multiple matches
             let filtered = data.gene.filter((g)=>{
                 return g.geneSymbolUpper==geneId.toUpperCase() || g.gencodeId == geneId.toUpperCase()
             });
             if (filtered.length > 1) {
                 alert("Fatal Error: input gene ID is not unique.");
                 throw "Fatal Error: input gene ID is not unique.";
                 return
             } else if (filtered.length == 0){
                 alert("No gene is found with " + geneId);
                 throw "Fatal Error: gene not found";
             }
             else{
                 data.gene = filtered;
             }
         }
         return data.gene[0]
    }
    else return data[attr];
}

/**
 * Parse the tissues
 * @param data {Json}
 * @returns {List} of tissues
 */


/**
 * Parse the tissue groups
 * @param data {Json}
 * @param forEqtl {Boolean} restrict to eqtl tissues
 * @returns {Dictionary} of lists of tissues indexed by the tissue group name
 */


/**
 * parse the exons
 * @param data {Json}
 * @param full {Boolean}
 * @returns {List} of exons
 */


/**
 * parse the junctions
 * @param data
 * @returns {List} of junctions
 * // junction annotations are not stored in Mongo
    // so here we use the junction expression web service to parse the junction ID for its genomic location
    // assuming that each tissue has the same junctions,
    // to grab all the known junctions of a gene, we only need to query one tissue
    // here we arbitrarily pick Liver.
 */


/**
 * parse transcript isoforms from the GTEx web service: 'reference/transcript?release=v7&gencode_id='
 * @param data {Json}
 * returns a dictionary of transcript exon object lists indexed by transcript IDs -- ENST IDs
 */


/**
 * parse transcript isoforms
 * @param data {Json} from GTEx web service 'reference/transcript?release=v7&gencode_id='
 * returns a list of isoform objects sorted by length in descending order
 */


/**
 * parse final (masked) gene model exon expression
 * expression is normalized to reads per kb
 * @param data {JSON} of exon expression web service
 * @param exons {List} of exons with positions
 * @returns {List} of exon objects
 */


/**
 * Parse junction median read count data
 * @param data {JSON} of the junction expression web service
 * @returns {List} of junction objects
 */


/**
 * parse transcript expression
 * @param data
 * @returns {*}
 */


/**
 * parse transcript expression, and transpose the matrix
 * @param data
 * @returns {*}
 */


/**
 * parse median gene expression
 * @param data {Json} with attr medianGeneExpression
 * @returns {*}
 */


/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 */


/**
 * parse the LD (linkage disequilibrium data)
 * @param data {JSON} from GTEx ld web service
 * @returns {Array}
 */
function parseLD(data){
    const attr = 'ld';
    if(!data.hasOwnProperty(attr)) throw 'Parsing Error: required json attribute is missing: ' + attr;
    let parsed = [];
    data[attr].forEach((d)=>{
        let labels = d[0].split(",");
        parsed.push({
            x: labels[0],
            y: labels[1],
            value: parseFloat(d[1]),
            displayValue: parseFloat(d[1]).toPrecision(3)
        });
    });
    return parsed;
}

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

var array$2 = Array.prototype;

var map$3 = array$2.map;
var slice$1 = array$2.slice;

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

var constant$5 = function(x) {
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
      : constant$5(b);
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

var exponent$1 = function(x) {
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

// [[fill]align][sign][symbol][0][width][,][.precision][~][type]
var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

function formatSpecifier(specifier) {
  return new FormatSpecifier(specifier);
}

formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

function FormatSpecifier(specifier) {
  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
  var match;
  this.fill = match[1] || " ";
  this.align = match[2] || ">";
  this.sign = match[3] || "-";
  this.symbol = match[4] || "";
  this.zero = !!match[5];
  this.width = match[6] && +match[6];
  this.comma = !!match[7];
  this.precision = match[8] && +match[8].slice(1);
  this.trim = !!match[9];
  this.type = match[10] || "";
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
      + (this.trim ? "~" : "")
      + this.type;
};

// Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
var formatTrim = function(s) {
  out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
    switch (s[i]) {
      case ".": i0 = i1 = i; break;
      case "0": if (i0 === 0) i0 = i; i1 = i; break;
      default: if (i0 > 0) { if (!+s[i]) break out; i0 = 0; } break;
    }
  }
  return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
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
        trim = specifier.trim,
        type = specifier.type;

    // The "n" type is an alias for ",g".
    if (type === "n") comma = true, type = "g";

    // The "" type, and any invalid type, is an alias for ".12~g".
    else if (!formatTypes[type]) precision == null && (precision = 12), trim = true, type = "g";

    // If zero fill is specified, padding goes after sign and before digits.
    if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

    // Compute the prefix and suffix.
    // For SI-prefix, the suffix is lazily computed.
    var prefix = symbol === "$" ? currency[0] : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
        suffix = symbol === "$" ? currency[1] : /[%p]/.test(type) ? percent : "";

    // What format function should we use?
    // Is this an integer type?
    // Can this type generate exponential notation?
    var formatType = formatTypes[type],
        maybeSuffix = /[defgprs%]/.test(type);

    // Set the default precision if not specified,
    // or clamp the specified precision to the supported range.
    // For significant precision, it must be in [1, 21].
    // For fixed precision, it must be in [0, 20].
    precision = precision == null ? 6
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

        // Trim insignificant zeros.
        if (trim) value = formatTrim(value);

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
        e = Math.max(-8, Math.min(8, Math.floor(exponent$1(value) / 3))) * 3,
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
  return Math.max(0, -exponent$1(Math.abs(step)));
};

var precisionPrefix = function(step, value) {
  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent$1(value) / 3))) * 3 - exponent$1(Math.abs(step)));
};

var precisionRound = function(step, max) {
  step = Math.abs(step), max = Math.abs(max) - step;
  return Math.max(0, exponent$1(max) - exponent$1(step)) + 1;
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

function raise$1(x, exponent) {
  return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
}

function pow() {
  var exponent = 1,
      scale = continuous(deinterpolate, reinterpolate),
      domain = scale.domain;

  function deinterpolate(a, b) {
    return (b = raise$1(b, exponent) - (a = raise$1(a, exponent)))
        ? function(x) { return (raise$1(x, exponent) - a) / b; }
        : constant$5(b);
  }

  function reinterpolate(a, b) {
    b = raise$1(b, exponent) - (a = raise$1(a, exponent));
    return function(t) { return raise$1(a + b * t, 1 / exponent); };
  }

  scale.exponent = function(_) {
    return arguments.length ? (exponent = +_, domain(domain())) : exponent;
  };

  scale.copy = function() {
    return copy(scale, pow().exponent(exponent));
  };

  return linearish(scale);
}

function sqrt() {
  return pow().exponent(0.5);
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
      k10 = 1,
      clamp = false;

  function scale(x) {
    var t = (x - x0) * k10;
    return interpolator(clamp ? Math.max(0, Math.min(1, t)) : t);
  }

  scale.domain = function(_) {
    return arguments.length ? (x0 = +_[0], x1 = +_[1], k10 = x0 === x1 ? 0 : 1 / (x1 - x0), scale) : [x0, x1];
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

/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
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

var PiYG = ramp(scheme$2);

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

var PuOr = ramp(scheme$3);

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

var RdBu = ramp(scheme$4);

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

var RdGy = ramp(scheme$5);

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

var RdYlBu = ramp(scheme$6);

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

var c = cubehelix();

var c$1 = rgb();

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

/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
"use strict";



/**
 * get a color scheme by name
 * @param name {enum}: BuGn, OrRd....
 * @returns {*}: a continuous interpolator (used with d3.scaleSequential)
 */
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
        Grays: Greys,

        // diverging color schemes
        RdBu: RdBu,
        RdGy: RdGy,
        PiYG: PiYG,
        PuOr: PuOr,
        RdYlBu: RdYlBu
    };
    if (!interpolators.hasOwnProperty(name)) {
        const err = "Unrecognized color: " + name;
        alert(err);
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
 * @param dmin {Number} minimum domain value
 * @param dmax {Number} maximum domain value
 * @param reverse {Boolean} reverse the color scheme
 */
function setColorScale(data, colors="YlGnBu", dmin=undefined, dmax=undefined, reverse=false) {
    // let dmax = Math.round(max(data));
    dmax = dmax === undefined?max(data):dmax;
    dmin = dmin === undefined?min(data):dmin;
    const scale = sequential(getColorInterpolator(colors));
    if(reverse) scale.domain([dmax, dmin]);
    else scale.domain([dmin, dmax]);
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
 * @param ticks {Integer} number of ticks (one-sided)
 * @param base {Integer} log base
 * @param cell {Object} with attributes: h, w
 * @param orientation {enum} h or v, i.e. horizontal or vertical
 * @param diverging {Boolean} whether the color scheme is diverging
 * @param cell
 */
function drawColorLegend(title, dom, scale, config, useLog, ticks=10, base=10, cell={h:10, w:40}, orientation="h", diverging=false){
    let data = [];

    if(diverging){
        let range = [...Array(ticks+1).keys()];
        let interval = scale.domain()[1]/ticks;
        data = range.map((d)=>d*interval);
        data = data.concat(range.filter((d)=>d!=0).map((d)=>0-d*interval)).sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
    }
    else{
        let range = [...Array(ticks+1).keys()];
        let interval = scale.domain()[1]/ticks;
        data = range.map((d)=>d*interval);
    }

    // legend groups
    const legends = dom.append("g").attr("transform", `translate(${config.x}, ${config.y})`)
                    .selectAll(".legend").data(data);

    const g = legends.enter().append("g").classed("legend", true);

    if (orientation == 'h'){
         // legend title
        dom.append("text")
            .attr("class", "color-legend")
            .text(title)
            .attr("x", -10)
            .attr("text-anchor", "end")
            .attr("y", cell.h)
            .attr("transform", `translate(${config.x}, ${config.y})`);

        // the color legend
        g.append("rect")
            .attr("x", (d, i) => cell.w*i)
            .attr("y", 5)
            .attr("width", cell.w)
            .attr("height", cell.h)
            .style("fill", scale);

        g.append("text")
            .attr("class", "color-legend")
            .text((d) => useLog?(Math.pow(base, d)).toPrecision(2):d.toPrecision(2))
            .attr("x", (d, i) => cell.w * i)
            .attr("y", 0);
    } else {
         // legend title
        dom.append("text")
            .attr("class", "color-legend")
            .text(title)
            .attr("x", 5)
            .attr("text-anchor", "start")
            .attr("y", 0)
            .attr("transform", `translate(${config.x}, ${config.y + cell.h * data.length})rotate(90)`);

        g.append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => cell.h*i)
            .attr("width", cell.w)
            .attr("height", cell.h)
            .style("fill", scale);

        g.append("text")
            .attr("class", "color-legend")
            .text((d) => useLog?(Math.pow(base, d)-1).toPrecision(2):d.toPrecision(2))
            .attr("x", 15)
            .attr("y", (d, i) => cell.h * i + (cell.h/2));
    }



}

/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

"use strict";
class BubbleMap {
    constructor(data, useLog=true, logBase=10, colorScheme="Reds", tooltipId = "tooltip"){
        this.data = data;
        this.useLog = useLog;
        this.logBase = logBase;
        this.colorScheme = colorScheme;

        // initiates additional attributes
        this.xScale = undefined;
        this.yScale = undefined;
        this.colorScale = undefined;
        this.bubbleScale = undefined;

        // peripheral features
        // Tooltip
        if ($(`#${tooltipId}`).length == 0) $('<div/>').attr('id', tooltipId).appendTo($('body'));
        this.tooltip = new Tooltip(tooltipId);
        select(`#${tooltipId}`).classed('bubblemap-tooltip', true);

        this.toolbar = undefined;
    }

    /**
     * Render the bubble map in canvas
     * @param canvas {OBJECT}: the canvas DOM D3 select object
     * @param dimensions {OBJECT}: the plot's dimensions
     * @param colorScaleDomain {LIST} define the color scale domain()
     * @param showLabels {Boolean}
     * @param columnLabelAngle {Integer}
     * @param columnLabelPosAdjust {Integer}
     */
    drawCanvas(canvas, dimensions={w:1000, h:600, top:20, left:20}, colorScaleDomain=undefined, showLabels=true, columnLabelAngle=30, columnLabelPosAdjust=0){
        this._setScales(dimensions, colorScaleDomain);

        let context = canvas.node().getContext('2d');

        //background
        context.fillStyle = '#ffffff';
        context.rect(0,0,canvas.attr('width'), canvas.attr('height'));
        context.fill();
        // bubbles
        this.data.forEach((d)=>{
            context.beginPath();
            context.fillStyle = this.colorScale(d.value);
            context.arc(this.xScale(d.x) + this.xScale.bandwidth()/2, this.yScale(d.y), this.bubbleScale(d.r), 0, 2*Math.PI);
            context.fill();
            context.closePath();
        });

        // text labels
        if(showLabels){
            context.save();
            context.textAlign = 'right';
            context.fillStyle = 'black';
            context.font = '10px Open Sans';
            this.yScale.domain().forEach((d)=>{
                context.fillText(d, this.xScale.range()[0]-12, this.yScale(d)+2);
            });
            context.restore();

            this.xScale.domain().forEach((d)=>{
                context.save();
                context.fillStyle = 'black';
                context.font = '10px Open Sans';
                context.textAlign = 'left';
                context.translate(this.xScale(d)+this.xScale.bandwidth()/2 - 3, this.yScale.range()[1] + columnLabelPosAdjust);
                context.rotate(Math.PI/2);
                context.fillText(d, 0, 0);
                context.restore();

            });
        }
    }

    drawCombo(miniDom, focusDom, dimensions={w:1000, h:600, top:0, left:0}, colorScaleDomain=undefined, showLabels=true, columnLabelAngle=30, columnLabelPosAdjust=10, addBrush=true) {
        this._setMiniScales(dimensions, colorScaleDomain);
        this.drawSvg(focusDom, {
            w: dimensions.w,
            h: dimensions.h2,
            top: dimensions.top,
            left: dimensions.left
        }, colorScaleDomain, showLabels, columnLabelAngle, columnLabelPosAdjust);
        let bubbles = miniDom.append("g")
            .attr("clip-path", "url(#clip)");
        bubbles.selectAll(".mini-map-cell")
            .data(this.data, (d) => d.value)
            .enter()
            .append("circle")
            .attr("row", (d) => `x${this.xScaleMini.domain().indexOf(d.displayX ? d.displayX : d.x)}`)
            .attr("col", (d) => `y${this.yScaleMini.domain().indexOf(d.y)}`)
            .attr("cx", (d) => this.xScaleMini(d.displayX ? d.displayX : d.x) + this.xScaleMini.bandwidth() / 2)
            .attr("cy", (d) => this.yScaleMini(d.y))
            .attr("r", (d) => this.bubbleScaleMini(d.r))
            .style("fill", (d) => this.colorScale(d.value));

        let xList = this.xScaleMini.domain();
        if (addBrush) {
            const brushed = () => {
                let selection = event.selection;
                let brushLeft = Math.round(selection[0] / this.xScaleMini.step());
                let brushRight = Math.round(selection[1] / this.xScaleMini.step());
                this.xScale.domain(this.xScaleMini.domain().slice(brushLeft, brushRight)); // reset the xScale domain
                let bubbleMax = min([this.xScale.bandwidth(), this.yScale.bandwidth()]) / 2;
                this.bubbleScale = this._setBubbleScale({max: bubbleMax, min: 2}); // TODO: change hard-coded min radius

                // update the focus bubbles
                focusDom.selectAll(".bubble-map-cell")
                    .attr("cx", (d) => {
                        let x = this.xScale(d.displayX ? d.displayX : d.x);
                        return x === undefined ? this.xScale.bandwidth() / 2 : x + this.xScale.bandwidth() / 2;

                    })
                    // .attr("cy", (d)=>this.yScale(d.y))
                    .attr("r", (d) => {
                        let x = this.xScale(d.displayX ? d.displayX : d.x);
                        return x === undefined ? 0 : this.bubbleScale(d.r)
                    });

                // update the column labels
                focusDom.selectAll(".bubble-map-xlabel")
                    .attr("transform", (d) => {
                        let x = this.xScale(d) + 5 || 0; // TODO: remove hard-coded value
                        let y = this.yScale.range()[1] + columnLabelPosAdjust;
                        return `translate(${x}, ${y}) rotate(${columnLabelAngle})`;

                    })
                    .style("display", (d) => {
                        let x = this.xScale(d); // TODO: remove hard-coded value
                        return x === undefined ? "none" : "block";
                    });
            };
            let brush = brushX()
                .extent([
                    [0, 0],
                    [dimensions.w, dimensions.h]
                ])
                .on("brush", brushed);
            miniDom.append("g")
                .attr("class", "brush")
                .call(brush)
                // .call(brush.move, this.xScaleMini.range());
                .call(brush.move, [0, this.xScaleMini.bandwidth() * 50]);
        }

    }

    drawSvg(dom, dimensions={w:1000, h:600, top:0, left:0}, colorScaleDomain=undefined, showLabels=true, columnLabelAngle=30, columnLabelPosAdjust=0, brushSize=50){
        this._setScales(dimensions, colorScaleDomain, brushSize);
        let tooltip = this.tooltip;
        // bubbles
        let bubbles = dom.append("g")
            .attr("clip-path", "url(#clip)");

        bubbles.selectAll(".bubble-map-cell")
            .data(this.data, (d)=>d.value)
            .enter()
            .append("circle")
            .attr("class", "bubble-map-cell")
            .attr("row", (d)=> `x${this.xScale.domain().indexOf(d.displayX?d.displayX:d.x)}`)
            .attr("col", (d)=> `y${this.yScale.domain().indexOf(d.y)}`)
            .attr("cx", (d)=>this.xScale(d.displayX?d.displayX:d.x) + this.xScale.bandwidth()/2)
            .attr("cy", (d)=>this.yScale(d.y) + this.yScale.bandwidth()/2)
            .attr("r", (d)=>this.bubbleScale(d.r))
            .style("fill", (d)=>this.colorScale(d.value))
            .on("mouseover", function(d){
                let selected = select(this);
                let rowClass = selected.attr("row");
                let colClass = selected.attr("col");
                dom.selectAll(".bubble-map-xlabel").filter(`.${rowClass}`)
                    .classed('highlighted', true);
                dom.selectAll(".bubble-map-ylabel").filter(`.${colClass}`)
                    .classed('highlighted', true);
                selected.classed('highlighted', true);
                let displayValue = d.displayValue === undefined?parseFloat(d.value.toExponential()).toPrecision(4):d.displayValue;
                tooltip.show(`Column: ${d.x} <br/> Row: ${d.y}<br/> Value: ${displayValue}`);
            })
            .on("mouseout", function(){
                dom.selectAll("*").classed('highlighted', false);
                tooltip.hide();
            });

        // text labels
        if(showLabels) {
            // column labels
            let xLabels = dom.selectAll('.bubble-map-xlabel').data(this.xScale.domain())
                .enter().append("text")
                .attr("class", (d, i) => `bubble-map-xlabel x${i}`)
                .attr("x", 0)
                .attr("y", 0)
                .style("text-anchor", "start")
                .style("cursor", "default")
                .attr("transform", (d) => {
                    let x = this.xScale(d) + 5; // TODO: remove hard-coded value
                    let y = this.yScale.range()[1] + columnLabelPosAdjust;
                    return `translate(${x}, ${y}) rotate(${columnLabelAngle})`;
                })
                .text((d) => d);

            // row labels
            let yLabels = dom.selectAll('.bubble-map-ylabel').data(this.yScale.domain())
                .enter().append("text")
                .attr("class", (d, i) => `bubble-map-ylabel y${i}`)
                .attr("x", this.xScale.range()[0] - 10)
                .attr("y", (d) => this.yScale(d) + this.yScale.bandwidth()/2 + 2)
                .style("text-anchor", "end")
                .style("cursor", "default")
                .text((d) => d);
        }


    }

    drawColorLegend(dom, legendConfig={x:0, y:0}, ticks=5, unit=""){
        drawColorLegend(unit, dom, this.colorScale, legendConfig, this.useLog, ticks, this.logBase, {h:10, w:40}, "h", true);
    }

    drawBubbleLegend(dom, legendConfig={x:0, y:0, title:"Bubble legend"}, ticks=5, unit=""){
        console.log(this.bubbleScale.domain());
        console.log(this.bubbleScale.range());
        let range = [...Array(ticks+1).keys()];
        let interval = (this.bubbleScale.domain()[1]-this.bubbleScale.domain()[0])/ticks;
        let data = range.map((d)=>this.bubbleScale.domain()[0]+d*interval); // assuming d is positive
        console.log(data);

        // legend groups
        let legends = dom.append("g")
                .attr("transform", `translate(${legendConfig.x}, ${legendConfig.y})`)
                .selectAll(".legend").data(data);
        let g = legends.enter().append("g").classed("legend", true);

        // legend title
        dom.append("text")
            .attr("class", "color-legend")
            .text(legendConfig.title)
            .attr("x", -10)
            .attr("text-anchor", "end")
            .attr("y", 10)
            .attr("transform", `translate(${legendConfig.x}, ${legendConfig.y})`);

        // the bubbles
        let cellW = this.xScale.bandwidth()*2;
        console.log(cellW);
        g.append("circle")
            .attr("cx", (d, i) => cellW*i)
            .attr("cy", 10)
            .attr("r", (d)=>this.bubbleScale(d))
            .style("fill", "black");

        g.append("text")
            .attr("class", "color-legend")
            .text((d) => this.useLog?(Math.pow(base, d)).toPrecision(2):d.toPrecision(2))
            .attr("x", (d, i) => cellW * i -5)
            .attr("y", 0);
    }

    // private methods
    _setMiniScales(dimensions={w:1000, h:600, top:20, left:20}, cDomain){
        if (this.xScaleMini === undefined) this.xScaleMini = this._setXScaleMini(dimensions);
        if (this.yScaleMini === undefined) this.yScaleMini = this._setYScaleMini(dimensions);
        if (this.colorScale === undefined) this.colorScale = this._setColorScale(cDomain);
        if (this.bubbleScaleMini === undefined) {
            let bubbleMax = min([this.xScaleMini.bandwidth(), this.yScaleMini.bandwidth()])/2; // the max bubble radius
            console.log(bubbleMax);
            this.bubbleScaleMini = this._setBubbleScale({max: bubbleMax, min:1});
        }
    }

    _setScales(dimensions={w:1000, h:600, top:20, left:20}, cDomain){
        if (this.xScale === undefined) this.xScale = this._setXScale(dimensions);
        if (this.yScale === undefined) this.yScale = this._setYScale(dimensions);
        if (this.colorScale === undefined) this.colorScale = this._setColorScale(cDomain);
        if (this.bubbleScale === undefined) {
            let bubbleMax = min([this.xScale.bandwidth(), this.yScale.bandwidth()])/2;
            console.log(bubbleMax);
            this.bubbleScale = this._setBubbleScale({max:bubbleMax, min: 2}); // TODO: change hard-coded min radius
        }
    }

    _parseXList(){
         let xList = nest()
            .key((d) => d.displayX!==undefined?d.displayX:d.x) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
         return xList;
    }

    _parseYList(){
        let yList = nest()
            .key((d) => d.y) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        return yList;
    }

    _setXScaleMini(dim={w:1000, left:20}){
        let xList = this._parseXList();
        return this._setXScale(dim, xList);
    }

    _setXScale(dim={w:1000, left:20}, xList = undefined){
        // use d3 nest data structure to find the unique list of x labels
        // reference: https://github.com/d3/d3-collection#nests
        xList = xList===undefined?this._parseXList():xList;
        return band() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(xList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            .range([dim.left, dim.left+dim.w])
            .padding(.05); // temporarily hard-coded value
    }

    _setYScaleMini(dim={h:600, top:20}){
        // use d3 nest data structure to find the unique list of y labels
        // reference: https://github.com/d3/d3-collection#nests
        let yList = this._parseYList();
        return this._setYScale(dim, yList);
    }

    _setYScale(dim={h:600, top:20}, yList=undefined){
        // use d3 nest data structure to find the unique list of y labels
        // reference: https://github.com/d3/d3-collection#nests
        yList = yList===undefined?this._parseYList():yList;
        return band() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(yList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            .range([dim.top, dim.top+dim.h])
            .padding(.05); // temporarily hard-coded value
    }

    _setColorScale(domain){
        let useLog = this.useLog;
        let data = domain===undefined?this.data.map((d)=>useLog?this._log(d.value):d.value):domain;
        return setColorScale(data, this.colorScheme, undefined, undefined, true);
    }

    // _setBubbleScaleMini(range={max:10, min:0}){
    //     return this._setBubbleScale(range);
    // }

    _setBubbleScale(range={max:10, min:0}){
        return sqrt()
            .domain([3, max(this.data.map((d)=>d.r))]) // set min at 2 for -log(0.01)
            .range([range.min, range.max]);
    }

    _log(v){
        const adjust = 1;
        return Math.log(Number(v+adjust))/Math.log(this.logBase);
    }


}

/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

"use strict";
class HalfMap{
    /**
     *
     * @param data {Object} TODO: describe the data structure
     * @param cutoff
     * @param useLog
     * @param logBase
     * @param colorScheme
     * @param tooltipId
     */
    constructor(data, cutoff = 0.0, useLog=true, logBase=10, colorScheme="Greys", tooltipId="tooltip"){
        this.data= data;
        this.dataDict = {};
        this.cutoff = cutoff;
        this.useLog = useLog;
        this.logBase = logBase;
        this.colorScheme = colorScheme;

        this.xScale = undefined;
        this.yScale = undefined;
        this.colorScale = undefined;
        this.labelScale = undefined;

        // peripheral features
        //// the tooltip
        if ($(`#${tooltipId}`).length == 0) $('<div/>').attr('id', tooltipId).appendTo($('body'));
        this.tooltip = new Tooltip(tooltipId, false, 40, 0);
        select(`#${tooltipId}`).classed('half-map-tooltip', true);
    }

    draw(canvas, svg, dimensions={w:600, top:20, left:20}, colorScaleDomain=[0,1], showLabels=true, labelAngle=90){
        this._drawCanvas(canvas, dimensions, colorScaleDomain, showLabels);
        let drawCells = false;
        this.drawSvg(svg, dimensions, drawCells, showLabels, labelAngle);
    }

    drawColorLegend(dom, legendConfig={x:0, y:0}, ticks=5, unit=""){
        drawColorLegend(unit, dom, this.colorScale, legendConfig, this.useLog, ticks, this.logBase, {h:20, w:10}, "v");
    }

    // private methods
    _log(v){
        const adjust = 1;
        return Math.log(Number(v+adjust))/Math.log(this.logBase);
    }
    _drawCanvas(canvas, dimensions={w:600, top:20, left:20}, colorScaleDomain=[0,1]){
        this._setScales(dimensions, colorScaleDomain);
        let visibleData = this._filter(this.data, this.cutoff);
        let context = canvas.node().getContext('2d');

        // transform the canvas
        context.save();
        context.translate(dimensions.left , dimensions.top + (this.xScale.bandwidth()*Math.sqrt(2)/2)); // shift the radius distance...
        context.rotate(Math.PI*(-45/180)); // rotate counterclockwise (negative) 45 degrees

        // LD canvas rendering from GEV old code
        visibleData.forEach((d)=>{
            let x = this.xScale(d.x);
            let y = this.yScale(d.y);
            d.color = d.value==0?"#fff":this.useLog?this.colorScale(this._log(d.value)):this.colorScale(d.value);
            context.fillStyle = this.colorScale(d.value);
            // console.log(d);
            context.fillRect(x, y, this.xScale.bandwidth(), this.yScale.bandwidth());
            // uncomment the following for debugging
            // context.textAlign = 'left';
            // context.fillStyle = 'white';
            // context.font = '10px Open Sans';
            // context.fillText(d.x+' '+d.y, x+10, y+10);
        });
        this.dataDict = this._generateDataDict(visibleData);
        context.restore();
    }

    drawSvg(svg, dimensions, drawCells=true, showLabels=true, labelAngle=90, colorScaleDomain=[0,1]){
        if (drawCells){
            this._setScales(dimensions, colorScaleDomain);
            let mapG = svg.append("g")
                .attr("clip-path", "url(#clip)");
            let cells = mapG.selectAll(".half-map-cell")
                .data(this._filter(this.data, this.cutoff));

            // add new rects
            cells.enter()
                .append("rect")
                .attr("class", "half-map-cell")
                .attr("row", (d)=>`y${this.yScale.domain().indexOf(d.y)}`)
                .attr("column", (d)=>`x${this.xScale.domain().indexOf(d.x)}`)
                .attr("width", this.xScale.bandwidth())
                .attr("height", this.yScale.bandwidth())
                .attr("x", (d)=>this.xScale(d.x))
                .attr("y", (d)=>this.yScale(d.y))
                .attr("transform", `rotate(-45)`)
                .merge(cells)
                .style("fill", (d)=>d.value==0?"#fff":this.useLog?this.colorScale(this._log(d.value)):this.colorScale(d.value));


        }

        if(showLabels){
            this._setLabelScale(dimensions);
            svg.selectAll().data(this.labelScale.domain())
                .enter()
                .append("text")
                .attr("class", (d, i) => `half-map-label l${i}`)
                .attr("x", 0)
                .attr("y", 0)
                .style("text-anchor", "start")
                .style("cursor", "none")
                .attr("transform", (d) => {
                    let x = this.labelScale(d) + this.labelScale.step()/2;
                    let y = -5;
                    return `translate(${x}, ${y}) rotate(-${labelAngle})`;
                })
                .text((d)=>d);
        }

        let cursor = svg.append('rect')
            .attr('class', 'half-map-cursor')
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.xScale.bandwidth())
            .attr("height", this.yScale.bandwidth())
            .style("stroke", "#d2111b")
            .style("stroke-width", 1)
            .style("fill", "none")
            .style("display", 'none');
        svg.on('mouseout', ()=>{
            cursor.style("display", "none");
            this.tooltip.hide();
            svg.selectAll('.half-map-label').classed('highlighted', false);
        });
        select(svg.node().parentNode)
            // .style("cursor", "none")
            .on('mousemove', () => {
                let pos = mouse(svg.node()); // retrieve the mouse position relative to the SVG element
                let x = pos[0];
                let y = pos[1];

                // find the colliding cell's coordinates (before transformation)
                let radian = Math.PI*(45/180); // the radian at 45 degree angle
                let x2 = x*Math.cos(radian) - y*Math.sin(radian) + this.xScale.step()/2;
                let y2 = x*Math.sin(radian) + y*Math.cos(radian) - this.yScale.step()/2;
                if (x < 0 || y<0 || x2 < 0 || y2<0) {
                    this.tooltip.hide();
                    cursor.style("display", "none");
                    return;
                }
                let i = Math.floor(x2/this.xScale.step());
                let j = Math.floor((y2)/this.yScale.step());
                // show tooltip
                let col = this.xScale.domain()[i];
                let row = this.yScale.domain()[j];
                let cell = this.dataDict[col+row];
                // console.log([x, y, x2, y2, col, row]) // debugging
                if (cell !== undefined) {

                    cursor.attr('transform', `translate(${x},${y}) rotate(-45)`);
                    cursor.style("display", "block");

                    this.tooltip.show(`${col}<br/> ${row}<br/> Value: ${cell.displayValue}`);
                    if(showLabels){
                        svg.selectAll('.half-map-label').classed('highlighted', false); // clear previous highlighted labels
                        svg.select(`.l${i}`).classed('highlighted', true);
                        svg.select(`.l${j}`).classed('highlighted', true);
                    }
                }
            })
            .on('mouseout', () => {
                cursor.style("display", "none");
                this.tooltip.hide();
                svg.selectAll('.half-map-label').classed('highlighted', false);
            });
    }

    /**
     * Filter redundant data in a symmetrical matrix
     * @param data
     * @param cutoff {Number} filter data by this minimum value
     * @returns {*}
     * @private
     */
    _filter(data, cutoff){
        let pairs = {};
        // // first sort the data based on the x, y alphabetical order
        data.sort((a, b)=>{
            if(a.x < b.x) return -1;
            if (a.x > b.x) return 1;
            else {
                if (a.y < b.y) return -1;
                if (a.y > b.y) return 1;
                return 0;
            }
        });
        return data.filter((d)=>{
            // check redundant data
            let p = d.x + d.y;
            let p2 = d.y + d.x;
            if (pairs.hasOwnProperty(p) || pairs.hasOwnProperty(p2)) return false;
            pairs[p] = true;
            if (d.value < cutoff) return false;
            if (this.xScale(d.x) === undefined) return false; // filter the data that are not going to be rendered
            return true;
        });
    }

    /**
     * Generate a data dictionary indexed by x and y, for fast data look up
     * @param data {List}: a list of objects with attributes x and y
     * @private
     */
    _generateDataDict(data){
        let dict = {};
        data.forEach((d)=>{
            dict[d.x+d.y] = d;
            dict[d.y+d.x] = d;
        });
        return dict;
    }

    _setScales(dimensions={w:600, top:20, left:20}, colorScaleDomain=[0,1]){
        if (this.xScale === undefined) this._setXScale(dimensions);
        if (this.yScale === undefined) this._setYScale(dimensions);
        if (this.colorScale === undefined) this._setColorScale(colorScaleDomain);
    }

    _setXScale(dim={w:600}){
        let xList = nest()
            .key((d) => d.displayX!==undefined?d.displayX:d.x) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        this.xScale = band() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(xList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            // .range([dim.left, dim.left+(dim.w/Math.sqrt(2))])
            .range([0, dim.w/Math.sqrt(2)])
            .padding(.05); // temporarily hard-coded value
    }

    _setYScale(dim={w:600}){
        // use d3 nest data structure to find the unique list of y labels
        // reference: https://github.com/d3/d3-collection#nests
        let yList = nest()
            .key((d) => d.y) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        this.yScale = band() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(yList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            // .range([dim.top, dim.top+(dim.w/Math.sqrt(2))])
            .range([0, dim.w/Math.sqrt(2)])
            .padding(.05); // temporarily hard-coded value
    }

    _setLabelScale(dim={w:600}){
        if (this.xScale === undefined) this._setXScale();
        let xList = this.xScale.domain();
        this.labelScale = band()
            .domain(xList)
            .range([0, dim.w])
            .padding(.05);
    }

    _setColorScale(domain){
        let useLog = this.useLog;
        let data = domain===undefined?this.data.map((d)=>useLog?this._log(d.value):d.value):domain;
        this.colorScale = setColorScale(data, this.colorScheme);
    }
}

/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
"use strict";
function render(svgPar, geneId, rootDivId, spinnerId, urls = getGtexUrls()){
    console.log(geneId);
    json(urls.geneId + geneId) // query the gene by geneId which could be gene name or gencode ID with or withour versioning
        .then(function(data){
            let gene = parseGenes(data, true, geneId); // fetch the gene by user specified gene ID
            json(urls.singleTissueEqtl + gene.gencodeId)
                .then(function(data2){
                    let eqtls = parseSingleTissueEqtls(data2);
                    // canvasPar.data = eqtls;
                    svgPar.data = eqtls;
                    json(urls.ld + gene.gencodeId)
                    .then(function(data) {
                        let ld = parseLD(data);
                        svgPar.ldData = ld.filter((d)=>d.value>=svgPar.ldCutoff); // filter unused data
                        renderBubbleMap(svgPar, gene, urls);
                        $('#' + spinnerId).hide();
                    });

                });
        });
}

function setDimensions(par){
    par.margin = {
        left: par.marginLeft + par.focusPanelRowLabelWidth,
        top: par.marginTop,
        right: par.marginRight,
        bottom: par.marginBottom + par.focusPanelColumnLabelHeight
    };
    par.inWidth = par.width - (par.margin.left + par.margin.right);
    par.inHeight = par.height - (par.margin.top + par.margin.bottom);
    par.focusPanelHeight = par.inHeight - (par.legendHeight + par.miniPanelHeight + par.width);
    if (par.focusPanelHeight < 0) throw "Config error: focus panel height is negative.";
    par.focusPanelMargin = {
        left: par.margin.left,
        top: par.margin.top + par.miniPanelHeight + par.legendHeight
    };
    par.ldPanelMargin = {
        left: par.margin.left,
        top: par.focusPanelMargin.top + par.focusPanelHeight + par.focusPanelColumnLabelHeight + 80
    };
    return par;
}

function createSvg(rootId, width, height, margin, svgId=undefined){
    checkDomId(rootId);
    if (svgId===undefined) svgId=`${rootId}-svg`;
    let svg = select("#"+rootId).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", svgId);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    return svg;
}

/**
 * Render the bubble heatmap
 * @param par {Object} configure the visualizations
 * TODO: check required attributes in par
 * @param gene {Object} containing attr: gencodeId
 * @returns {BubbleMap}
 */
function renderBubbleMap(par, gene, urls){
    par = setDimensions(par);

    let bmap = new BubbleMap(par.data, par.useLog, par.logBase, par.colorScheme, par.id+"-tooltip");
    let ldMap = new HalfMap(par.ldData, par.ldCutoff, false, undefined, par.ldColorScheme, par.id+"-tooltip");

    let svg = createSvg(par.id, par.width, par.height, par.margin, undefined);

    let miniG = svg.append("g")
        .attr("class", "context")
        .attr("transform", `translate(${par.margin.left}, ${par.margin.top})`);

    let focusG = svg.append("g")
        .attr("class", "focus")
        .attr("transform", `translate(${par.focusPanelMargin.left}, ${par.focusPanelMargin.top})`);

    let ldCanvas = select(`#${par.id}`).append("canvas")
        .attr("id", par.id + "-ld-canvas")
        .attr("width", par.inWidth)
        .attr("height", par.inWidth);
        // .attr("transform", `translate(${par.ldPanelMargin.left}, ${par.ldPanelMargin.top})`);

    let ldG = svg.append("g")
        .attr("class", "ld")
        .attr("transform", `translate(${par.ldPanelMargin.left}, ${par.ldPanelMargin.top})`);

    bmap.drawCombo(
        miniG,
        focusG,
        {w:par.inWidth, h:par.miniPanelHeight, top:5, left:0, h2: par.focusPanelHeight},
        par.colorScaleDomain,
        par.showLabels,
        par.focusPanelColumnLabelAngle,
        par.focusPanelColumnLabelAdjust,
        false);

    // add customed brush
    let brush = brushX()
        .extent([
            [0,0],
            [par.inWidth, par.miniPanelHeight]
        ])
        .on("brush", ()=>{
            let selection = event.selection;
            let brushLeft = Math.round(selection[0] / bmap.xScaleMini.step());
            let brushRight = Math.round(selection[1] / bmap.xScaleMini.step());

            bmap.xScale.domain(bmap.xScaleMini.domain().slice(brushLeft, brushRight)); // reset the xScale domain
            let bubbleMax = min([bmap.xScale.bandwidth(), bmap.yScale.bandwidth()]) / 2;
            bmap.bubbleScale.range([2, bubbleMax]); // TODO: change hard-coded min radius

            ldMap.xScale = bmap.xScale;
            ldMap.yScale = bmap.xScale;

            // update the focus bubbles
            focusG.selectAll(".bubble-map-cell")
                .attr("cx", (d) => {
                    let x = bmap.xScale(d.displayX ? d.displayX : d.x);
                    return x === undefined ? bmap.xScale.bandwidth() / 2 : x + bmap.xScale.bandwidth() / 2;

                })
                .attr("r", (d) => {
                    let x = bmap.xScale(d.displayX ? d.displayX : d.x);
                    return x === undefined ? 0 : bmap.bubbleScale(d.r)
                });

            // update the column labels
            focusG.selectAll(".bubble-map-xlabel")
                .attr("transform", (d) => {
                    let x = bmap.xScale(d) + 5 || 0; // TODO: remove hard-coded value
                    let y = bmap.yScale.range()[1] + par.focusPanelColumnLabelAdjust;
                    return `translate(${x}, ${y}) rotate(${par.focusPanelColumnLabelAngle})`;

                })
                .style("display", (d) => {
                    let x = bmap.xScale(d);
                    return x === undefined ? "none" : "block";
                });
            return;
            // render the LD
            select(`#${par.id}-ld-canvas`).remove();
            let ldCanvas = select(`#${par.id}`).append("canvas")
                .attr("id", par.id + "-ld-canvas")
                .attr("width", par.inWidth)
                .attr("height", par.inWidth);
            ldG.selectAll("*").remove(); // clear all child nodes in ldG before rendering
            // ldMap.drawSvg(ldG, {w:par.inWidth, top:20, left:0}, true, false);
            ldMap.draw(ldCanvas, ldG, {w:par.inWidth, top:20, left:0}, [0,1], false);
        });
    miniG.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, [0, bmap.xScaleMini.bandwidth()*50]);

    // let ldMap = new HalfMap(ldConfig.data, ldConfig.cutoff, ldConfig.useLog, ldConfig.logBase, ldConfig.colorScheme, ldConfig.id+"-tooltip");
    // ldMap.drawSvg(ldG, {w: par.inWidth, top:20, left: 0}, true, false, undefined);




    // bmap.drawColorLegend(svg, {x: 0, y: -30}, 3, "NES");
    // bmap.drawBubbleLegend(svg, {x: 500, y:-30, title: "-log10(p-value)"}, 5, "-log10(p-value)");

    return bmap;

}

exports.render = render;

return exports;

}({}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V2LmJ1bmRsZS5kZXYuanMiLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1kc3Yvc3JjL2Rzdi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1kc3Yvc3JjL2Nzdi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1kc3Yvc3JjL3Rzdi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mZXRjaC9zcmMvanNvbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1kaXNwYXRjaC9zcmMvZGlzcGF0Y2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9uYW1lc3BhY2VzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbmFtZXNwYWNlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvY3JlYXRvci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdG9yLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NlbGVjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdG9yQWxsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NlbGVjdEFsbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL21hdGNoZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZmlsdGVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NwYXJzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lbnRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL2NvbnN0YW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2RhdGEuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZXhpdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9tZXJnZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9vcmRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zb3J0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2NhbGwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbm9kZXMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbm9kZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zaXplLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2VtcHR5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2VhY2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vYXR0ci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3dpbmRvdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zdHlsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9wcm9wZXJ0eS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jbGFzc2VkLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3RleHQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaHRtbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9yYWlzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9sb3dlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9hcHBlbmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaW5zZXJ0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3JlbW92ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jbG9uZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kYXR1bS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9vbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kaXNwYXRjaC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NvdXJjZUV2ZW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvcG9pbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9tb3VzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1kcmFnL3NyYy9ub2V2ZW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRyYWcvc3JjL25vZHJhZy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1kcmFnL3NyYy9ldmVudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvZGVmaW5lLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbG9yL3NyYy9jb2xvci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvbWF0aC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvbGFiLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbG9yL3NyYy9jdWJlaGVsaXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL2Jhc2lzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9iYXNpc0Nsb3NlZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvY29uc3RhbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL2NvbG9yLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9yZ2IuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL2FycmF5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9kYXRlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9udW1iZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL29iamVjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvc3RyaW5nLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy92YWx1ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvcm91bmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL3RyYW5zZm9ybS9kZWNvbXBvc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL3RyYW5zZm9ybS9wYXJzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvdHJhbnNmb3JtL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9jdWJlaGVsaXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZXIvc3JjL3RpbWVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWVyL3NyYy90aW1lb3V0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vc2NoZWR1bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvaW50ZXJydXB0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3NlbGVjdGlvbi9pbnRlcnJ1cHQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi90d2Vlbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL2ludGVycG9sYXRlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vYXR0ci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL2F0dHJUd2Vlbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL2RlbGF5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vZHVyYXRpb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9lYXNlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vZmlsdGVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vbWVyZ2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9vbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3JlbW92ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3NlbGVjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3NlbGVjdEFsbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3NlbGVjdGlvbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3N0eWxlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vc3R5bGVUd2Vlbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3RleHQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi90cmFuc2l0aW9uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZWFzZS9zcmMvY3ViaWMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvc2VsZWN0aW9uL3RyYW5zaXRpb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvc2VsZWN0aW9uL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWJydXNoL3NyYy9jb25zdGFudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1icnVzaC9zcmMvZXZlbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYnJ1c2gvc3JjL25vZXZlbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYnJ1c2gvc3JjL2JydXNoLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9hc2NlbmRpbmcuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL2Jpc2VjdG9yLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9iaXNlY3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL3JhbmdlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy90aWNrcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvbWF4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9taW4uanMiLCIuLi8uLi9zcmMvbW9kdWxlcy91dGlscy5qcyIsIi4uLy4uL3NyYy9tb2R1bGVzL2d0ZXhEYXRhUGFyc2VyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbGxlY3Rpb24vc3JjL21hcC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1jb2xsZWN0aW9uL3NyYy9uZXN0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9hcnJheS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvb3JkaW5hbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvYmFuZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvY29uc3RhbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL251bWJlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvY29udGludW91cy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdERlY2ltYWwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9leHBvbmVudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdEdyb3VwLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0TnVtZXJhbHMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRTcGVjaWZpZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRUcmltLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0UHJlZml4QXV0by5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdFJvdW5kZWQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRUeXBlcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2lkZW50aXR5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvbG9jYWxlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZGVmYXVsdExvY2FsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL3ByZWNpc2lvbkZpeGVkLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvcHJlY2lzaW9uUHJlZml4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvcHJlY2lzaW9uUm91bmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL3RpY2tGb3JtYXQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL2xpbmVhci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvcG93LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL2ludGVydmFsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL21pbGxpc2Vjb25kLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL2R1cmF0aW9uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3NlY29uZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9taW51dGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvaG91ci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9kYXkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvd2Vlay5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9tb250aC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy95ZWFyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3V0Y01pbnV0ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy91dGNIb3VyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3V0Y0RheS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy91dGNXZWVrLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3V0Y01vbnRoLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3V0Y1llYXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS1mb3JtYXQvc3JjL2xvY2FsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9zcmMvZGVmYXVsdExvY2FsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9zcmMvaXNvRm9ybWF0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUtZm9ybWF0L3NyYy9pc29QYXJzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvc2VxdWVudGlhbC5qcyIsIi4uLy4uL3NyYy9tb2R1bGVzL1Rvb2x0aXAuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9jb2xvcnMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9jYXRlZ29yaWNhbC9jYXRlZ29yeTEwLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvY2F0ZWdvcmljYWwvQWNjZW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvY2F0ZWdvcmljYWwvRGFyazIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9jYXRlZ29yaWNhbC9QYWlyZWQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9jYXRlZ29yaWNhbC9QYXN0ZWwxLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvY2F0ZWdvcmljYWwvUGFzdGVsMi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL2NhdGVnb3JpY2FsL1NldDEuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9jYXRlZ29yaWNhbC9TZXQyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvY2F0ZWdvcmljYWwvU2V0My5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3JhbXAuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9kaXZlcmdpbmcvQnJCRy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL2RpdmVyZ2luZy9QUkduLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvZGl2ZXJnaW5nL1BpWUcuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9kaXZlcmdpbmcvUHVPci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL2RpdmVyZ2luZy9SZEJ1LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvZGl2ZXJnaW5nL1JkR3kuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9kaXZlcmdpbmcvUmRZbEJ1LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvZGl2ZXJnaW5nL1JkWWxHbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL2RpdmVyZ2luZy9TcGVjdHJhbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvQnVHbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvQnVQdS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvR25CdS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvT3JSZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvUHVCdUduLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1tdWx0aS9QdUJ1LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1tdWx0aS9QdVJkLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1tdWx0aS9SZFB1LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1tdWx0aS9ZbEduQnUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLW11bHRpL1lsR24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLW11bHRpL1lsT3JCci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvWWxPclJkLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1zaW5nbGUvQmx1ZXMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLXNpbmdsZS9HcmVlbnMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLXNpbmdsZS9HcmV5cy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtc2luZ2xlL1B1cnBsZXMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUtY2hyb21hdGljL3NyYy9zZXF1ZW50aWFsLXNpbmdsZS9SZWRzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1zaW5nbGUvT3Jhbmdlcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS1jaHJvbWF0aWMvc3JjL3NlcXVlbnRpYWwtbXVsdGkvY3ViZWhlbGl4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1tdWx0aS9yYWluYm93LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1tdWx0aS9zaW5lYm93LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlLWNocm9tYXRpYy9zcmMvc2VxdWVudGlhbC1tdWx0aS92aXJpZGlzLmpzIiwiLi4vLi4vc3JjL21vZHVsZXMvY29sb3JzLmpzIiwiLi4vLi4vc3JjL21vZHVsZXMvQnViYmxlTWFwLmpzIiwiLi4vLi4vc3JjL21vZHVsZXMvSGFsZk1hcC5qcyIsIi4uLy4uL3NyYy9HZW5lRXF0bFZpc3VhbGl6ZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIEVPTCA9IHt9LFxuICAgIEVPRiA9IHt9LFxuICAgIFFVT1RFID0gMzQsXG4gICAgTkVXTElORSA9IDEwLFxuICAgIFJFVFVSTiA9IDEzO1xuXG5mdW5jdGlvbiBvYmplY3RDb252ZXJ0ZXIoY29sdW1ucykge1xuICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwiZFwiLCBcInJldHVybiB7XCIgKyBjb2x1bW5zLm1hcChmdW5jdGlvbihuYW1lLCBpKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG5hbWUpICsgXCI6IGRbXCIgKyBpICsgXCJdXCI7XG4gIH0pLmpvaW4oXCIsXCIpICsgXCJ9XCIpO1xufVxuXG5mdW5jdGlvbiBjdXN0b21Db252ZXJ0ZXIoY29sdW1ucywgZikge1xuICB2YXIgb2JqZWN0ID0gb2JqZWN0Q29udmVydGVyKGNvbHVtbnMpO1xuICByZXR1cm4gZnVuY3Rpb24ocm93LCBpKSB7XG4gICAgcmV0dXJuIGYob2JqZWN0KHJvdyksIGksIGNvbHVtbnMpO1xuICB9O1xufVxuXG4vLyBDb21wdXRlIHVuaXF1ZSBjb2x1bW5zIGluIG9yZGVyIG9mIGRpc2NvdmVyeS5cbmZ1bmN0aW9uIGluZmVyQ29sdW1ucyhyb3dzKSB7XG4gIHZhciBjb2x1bW5TZXQgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgY29sdW1ucyA9IFtdO1xuXG4gIHJvd3MuZm9yRWFjaChmdW5jdGlvbihyb3cpIHtcbiAgICBmb3IgKHZhciBjb2x1bW4gaW4gcm93KSB7XG4gICAgICBpZiAoIShjb2x1bW4gaW4gY29sdW1uU2V0KSkge1xuICAgICAgICBjb2x1bW5zLnB1c2goY29sdW1uU2V0W2NvbHVtbl0gPSBjb2x1bW4pO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGNvbHVtbnM7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGRlbGltaXRlcikge1xuICB2YXIgcmVGb3JtYXQgPSBuZXcgUmVnRXhwKFwiW1xcXCJcIiArIGRlbGltaXRlciArIFwiXFxuXFxyXVwiKSxcbiAgICAgIERFTElNSVRFUiA9IGRlbGltaXRlci5jaGFyQ29kZUF0KDApO1xuXG4gIGZ1bmN0aW9uIHBhcnNlKHRleHQsIGYpIHtcbiAgICB2YXIgY29udmVydCwgY29sdW1ucywgcm93cyA9IHBhcnNlUm93cyh0ZXh0LCBmdW5jdGlvbihyb3csIGkpIHtcbiAgICAgIGlmIChjb252ZXJ0KSByZXR1cm4gY29udmVydChyb3csIGkgLSAxKTtcbiAgICAgIGNvbHVtbnMgPSByb3csIGNvbnZlcnQgPSBmID8gY3VzdG9tQ29udmVydGVyKHJvdywgZikgOiBvYmplY3RDb252ZXJ0ZXIocm93KTtcbiAgICB9KTtcbiAgICByb3dzLmNvbHVtbnMgPSBjb2x1bW5zIHx8IFtdO1xuICAgIHJldHVybiByb3dzO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VSb3dzKHRleHQsIGYpIHtcbiAgICB2YXIgcm93cyA9IFtdLCAvLyBvdXRwdXQgcm93c1xuICAgICAgICBOID0gdGV4dC5sZW5ndGgsXG4gICAgICAgIEkgPSAwLCAvLyBjdXJyZW50IGNoYXJhY3RlciBpbmRleFxuICAgICAgICBuID0gMCwgLy8gY3VycmVudCBsaW5lIG51bWJlclxuICAgICAgICB0LCAvLyBjdXJyZW50IHRva2VuXG4gICAgICAgIGVvZiA9IE4gPD0gMCwgLy8gY3VycmVudCB0b2tlbiBmb2xsb3dlZCBieSBFT0Y/XG4gICAgICAgIGVvbCA9IGZhbHNlOyAvLyBjdXJyZW50IHRva2VuIGZvbGxvd2VkIGJ5IEVPTD9cblxuICAgIC8vIFN0cmlwIHRoZSB0cmFpbGluZyBuZXdsaW5lLlxuICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQoTiAtIDEpID09PSBORVdMSU5FKSAtLU47XG4gICAgaWYgKHRleHQuY2hhckNvZGVBdChOIC0gMSkgPT09IFJFVFVSTikgLS1OO1xuXG4gICAgZnVuY3Rpb24gdG9rZW4oKSB7XG4gICAgICBpZiAoZW9mKSByZXR1cm4gRU9GO1xuICAgICAgaWYgKGVvbCkgcmV0dXJuIGVvbCA9IGZhbHNlLCBFT0w7XG5cbiAgICAgIC8vIFVuZXNjYXBlIHF1b3Rlcy5cbiAgICAgIHZhciBpLCBqID0gSSwgYztcbiAgICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQoaikgPT09IFFVT1RFKSB7XG4gICAgICAgIHdoaWxlIChJKysgPCBOICYmIHRleHQuY2hhckNvZGVBdChJKSAhPT0gUVVPVEUgfHwgdGV4dC5jaGFyQ29kZUF0KCsrSSkgPT09IFFVT1RFKTtcbiAgICAgICAgaWYgKChpID0gSSkgPj0gTikgZW9mID0gdHJ1ZTtcbiAgICAgICAgZWxzZSBpZiAoKGMgPSB0ZXh0LmNoYXJDb2RlQXQoSSsrKSkgPT09IE5FV0xJTkUpIGVvbCA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKGMgPT09IFJFVFVSTikgeyBlb2wgPSB0cnVlOyBpZiAodGV4dC5jaGFyQ29kZUF0KEkpID09PSBORVdMSU5FKSArK0k7IH1cbiAgICAgICAgcmV0dXJuIHRleHQuc2xpY2UoaiArIDEsIGkgLSAxKS5yZXBsYWNlKC9cIlwiL2csIFwiXFxcIlwiKTtcbiAgICAgIH1cblxuICAgICAgLy8gRmluZCBuZXh0IGRlbGltaXRlciBvciBuZXdsaW5lLlxuICAgICAgd2hpbGUgKEkgPCBOKSB7XG4gICAgICAgIGlmICgoYyA9IHRleHQuY2hhckNvZGVBdChpID0gSSsrKSkgPT09IE5FV0xJTkUpIGVvbCA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKGMgPT09IFJFVFVSTikgeyBlb2wgPSB0cnVlOyBpZiAodGV4dC5jaGFyQ29kZUF0KEkpID09PSBORVdMSU5FKSArK0k7IH1cbiAgICAgICAgZWxzZSBpZiAoYyAhPT0gREVMSU1JVEVSKSBjb250aW51ZTtcbiAgICAgICAgcmV0dXJuIHRleHQuc2xpY2UoaiwgaSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJldHVybiBsYXN0IHRva2VuIGJlZm9yZSBFT0YuXG4gICAgICByZXR1cm4gZW9mID0gdHJ1ZSwgdGV4dC5zbGljZShqLCBOKTtcbiAgICB9XG5cbiAgICB3aGlsZSAoKHQgPSB0b2tlbigpKSAhPT0gRU9GKSB7XG4gICAgICB2YXIgcm93ID0gW107XG4gICAgICB3aGlsZSAodCAhPT0gRU9MICYmIHQgIT09IEVPRikgcm93LnB1c2godCksIHQgPSB0b2tlbigpO1xuICAgICAgaWYgKGYgJiYgKHJvdyA9IGYocm93LCBuKyspKSA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIHJvd3MucHVzaChyb3cpO1xuICAgIH1cblxuICAgIHJldHVybiByb3dzO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0KHJvd3MsIGNvbHVtbnMpIHtcbiAgICBpZiAoY29sdW1ucyA9PSBudWxsKSBjb2x1bW5zID0gaW5mZXJDb2x1bW5zKHJvd3MpO1xuICAgIHJldHVybiBbY29sdW1ucy5tYXAoZm9ybWF0VmFsdWUpLmpvaW4oZGVsaW1pdGVyKV0uY29uY2F0KHJvd3MubWFwKGZ1bmN0aW9uKHJvdykge1xuICAgICAgcmV0dXJuIGNvbHVtbnMubWFwKGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICByZXR1cm4gZm9ybWF0VmFsdWUocm93W2NvbHVtbl0pO1xuICAgICAgfSkuam9pbihkZWxpbWl0ZXIpO1xuICAgIH0pKS5qb2luKFwiXFxuXCIpO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0Um93cyhyb3dzKSB7XG4gICAgcmV0dXJuIHJvd3MubWFwKGZvcm1hdFJvdykuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFJvdyhyb3cpIHtcbiAgICByZXR1cm4gcm93Lm1hcChmb3JtYXRWYWx1ZSkuam9pbihkZWxpbWl0ZXIpO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VmFsdWUodGV4dCkge1xuICAgIHJldHVybiB0ZXh0ID09IG51bGwgPyBcIlwiXG4gICAgICAgIDogcmVGb3JtYXQudGVzdCh0ZXh0ICs9IFwiXCIpID8gXCJcXFwiXCIgKyB0ZXh0LnJlcGxhY2UoL1wiL2csIFwiXFxcIlxcXCJcIikgKyBcIlxcXCJcIlxuICAgICAgICA6IHRleHQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHBhcnNlOiBwYXJzZSxcbiAgICBwYXJzZVJvd3M6IHBhcnNlUm93cyxcbiAgICBmb3JtYXQ6IGZvcm1hdCxcbiAgICBmb3JtYXRSb3dzOiBmb3JtYXRSb3dzXG4gIH07XG59XG4iLCJpbXBvcnQgZHN2IGZyb20gXCIuL2RzdlwiO1xuXG52YXIgY3N2ID0gZHN2KFwiLFwiKTtcblxuZXhwb3J0IHZhciBjc3ZQYXJzZSA9IGNzdi5wYXJzZTtcbmV4cG9ydCB2YXIgY3N2UGFyc2VSb3dzID0gY3N2LnBhcnNlUm93cztcbmV4cG9ydCB2YXIgY3N2Rm9ybWF0ID0gY3N2LmZvcm1hdDtcbmV4cG9ydCB2YXIgY3N2Rm9ybWF0Um93cyA9IGNzdi5mb3JtYXRSb3dzO1xuIiwiaW1wb3J0IGRzdiBmcm9tIFwiLi9kc3ZcIjtcblxudmFyIHRzdiA9IGRzdihcIlxcdFwiKTtcblxuZXhwb3J0IHZhciB0c3ZQYXJzZSA9IHRzdi5wYXJzZTtcbmV4cG9ydCB2YXIgdHN2UGFyc2VSb3dzID0gdHN2LnBhcnNlUm93cztcbmV4cG9ydCB2YXIgdHN2Rm9ybWF0ID0gdHN2LmZvcm1hdDtcbmV4cG9ydCB2YXIgdHN2Rm9ybWF0Um93cyA9IHRzdi5mb3JtYXRSb3dzO1xuIiwiZnVuY3Rpb24gcmVzcG9uc2VKc29uKHJlc3BvbnNlKSB7XG4gIGlmICghcmVzcG9uc2Uub2spIHRocm93IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXMgKyBcIiBcIiArIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICByZXR1cm4gZmV0Y2goaW5wdXQsIGluaXQpLnRoZW4ocmVzcG9uc2VKc29uKTtcbn1cbiIsInZhciBub29wID0ge3ZhbHVlOiBmdW5jdGlvbigpIHt9fTtcblxuZnVuY3Rpb24gZGlzcGF0Y2goKSB7XG4gIGZvciAodmFyIGkgPSAwLCBuID0gYXJndW1lbnRzLmxlbmd0aCwgXyA9IHt9LCB0OyBpIDwgbjsgKytpKSB7XG4gICAgaWYgKCEodCA9IGFyZ3VtZW50c1tpXSArIFwiXCIpIHx8ICh0IGluIF8pKSB0aHJvdyBuZXcgRXJyb3IoXCJpbGxlZ2FsIHR5cGU6IFwiICsgdCk7XG4gICAgX1t0XSA9IFtdO1xuICB9XG4gIHJldHVybiBuZXcgRGlzcGF0Y2goXyk7XG59XG5cbmZ1bmN0aW9uIERpc3BhdGNoKF8pIHtcbiAgdGhpcy5fID0gXztcbn1cblxuZnVuY3Rpb24gcGFyc2VUeXBlbmFtZXModHlwZW5hbWVzLCB0eXBlcykge1xuICByZXR1cm4gdHlwZW5hbWVzLnRyaW0oKS5zcGxpdCgvXnxcXHMrLykubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgbmFtZSA9IFwiXCIsIGkgPSB0LmluZGV4T2YoXCIuXCIpO1xuICAgIGlmIChpID49IDApIG5hbWUgPSB0LnNsaWNlKGkgKyAxKSwgdCA9IHQuc2xpY2UoMCwgaSk7XG4gICAgaWYgKHQgJiYgIXR5cGVzLmhhc093blByb3BlcnR5KHQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGU6IFwiICsgdCk7XG4gICAgcmV0dXJuIHt0eXBlOiB0LCBuYW1lOiBuYW1lfTtcbiAgfSk7XG59XG5cbkRpc3BhdGNoLnByb3RvdHlwZSA9IGRpc3BhdGNoLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IERpc3BhdGNoLFxuICBvbjogZnVuY3Rpb24odHlwZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIF8gPSB0aGlzLl8sXG4gICAgICAgIFQgPSBwYXJzZVR5cGVuYW1lcyh0eXBlbmFtZSArIFwiXCIsIF8pLFxuICAgICAgICB0LFxuICAgICAgICBpID0gLTEsXG4gICAgICAgIG4gPSBULmxlbmd0aDtcblxuICAgIC8vIElmIG5vIGNhbGxiYWNrIHdhcyBzcGVjaWZpZWQsIHJldHVybiB0aGUgY2FsbGJhY2sgb2YgdGhlIGdpdmVuIHR5cGUgYW5kIG5hbWUuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKCh0ID0gKHR5cGVuYW1lID0gVFtpXSkudHlwZSkgJiYgKHQgPSBnZXQoX1t0XSwgdHlwZW5hbWUubmFtZSkpKSByZXR1cm4gdDtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiBhIHR5cGUgd2FzIHNwZWNpZmllZCwgc2V0IHRoZSBjYWxsYmFjayBmb3IgdGhlIGdpdmVuIHR5cGUgYW5kIG5hbWUuXG4gICAgLy8gT3RoZXJ3aXNlLCBpZiBhIG51bGwgY2FsbGJhY2sgd2FzIHNwZWNpZmllZCwgcmVtb3ZlIGNhbGxiYWNrcyBvZiB0aGUgZ2l2ZW4gbmFtZS5cbiAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCAmJiB0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBjYWxsYmFjazogXCIgKyBjYWxsYmFjayk7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGlmICh0ID0gKHR5cGVuYW1lID0gVFtpXSkudHlwZSkgX1t0XSA9IHNldChfW3RdLCB0eXBlbmFtZS5uYW1lLCBjYWxsYmFjayk7XG4gICAgICBlbHNlIGlmIChjYWxsYmFjayA9PSBudWxsKSBmb3IgKHQgaW4gXykgX1t0XSA9IHNldChfW3RdLCB0eXBlbmFtZS5uYW1lLCBudWxsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgY29weTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvcHkgPSB7fSwgXyA9IHRoaXMuXztcbiAgICBmb3IgKHZhciB0IGluIF8pIGNvcHlbdF0gPSBfW3RdLnNsaWNlKCk7XG4gICAgcmV0dXJuIG5ldyBEaXNwYXRjaChjb3B5KTtcbiAgfSxcbiAgY2FsbDogZnVuY3Rpb24odHlwZSwgdGhhdCkge1xuICAgIGlmICgobiA9IGFyZ3VtZW50cy5sZW5ndGggLSAyKSA+IDApIGZvciAodmFyIGFyZ3MgPSBuZXcgQXJyYXkobiksIGkgPSAwLCBuLCB0OyBpIDwgbjsgKytpKSBhcmdzW2ldID0gYXJndW1lbnRzW2kgKyAyXTtcbiAgICBpZiAoIXRoaXMuXy5oYXNPd25Qcm9wZXJ0eSh0eXBlKSkgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlOiBcIiArIHR5cGUpO1xuICAgIGZvciAodCA9IHRoaXMuX1t0eXBlXSwgaSA9IDAsIG4gPSB0Lmxlbmd0aDsgaSA8IG47ICsraSkgdFtpXS52YWx1ZS5hcHBseSh0aGF0LCBhcmdzKTtcbiAgfSxcbiAgYXBwbHk6IGZ1bmN0aW9uKHR5cGUsIHRoYXQsIGFyZ3MpIHtcbiAgICBpZiAoIXRoaXMuXy5oYXNPd25Qcm9wZXJ0eSh0eXBlKSkgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlOiBcIiArIHR5cGUpO1xuICAgIGZvciAodmFyIHQgPSB0aGlzLl9bdHlwZV0sIGkgPSAwLCBuID0gdC5sZW5ndGg7IGkgPCBuOyArK2kpIHRbaV0udmFsdWUuYXBwbHkodGhhdCwgYXJncyk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGdldCh0eXBlLCBuYW1lKSB7XG4gIGZvciAodmFyIGkgPSAwLCBuID0gdHlwZS5sZW5ndGgsIGM7IGkgPCBuOyArK2kpIHtcbiAgICBpZiAoKGMgPSB0eXBlW2ldKS5uYW1lID09PSBuYW1lKSB7XG4gICAgICByZXR1cm4gYy52YWx1ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0KHR5cGUsIG5hbWUsIGNhbGxiYWNrKSB7XG4gIGZvciAodmFyIGkgPSAwLCBuID0gdHlwZS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICBpZiAodHlwZVtpXS5uYW1lID09PSBuYW1lKSB7XG4gICAgICB0eXBlW2ldID0gbm9vcCwgdHlwZSA9IHR5cGUuc2xpY2UoMCwgaSkuY29uY2F0KHR5cGUuc2xpY2UoaSArIDEpKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkgdHlwZS5wdXNoKHtuYW1lOiBuYW1lLCB2YWx1ZTogY2FsbGJhY2t9KTtcbiAgcmV0dXJuIHR5cGU7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRpc3BhdGNoO1xuIiwiZXhwb3J0IHZhciB4aHRtbCA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHN2ZzogXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLFxuICB4aHRtbDogeGh0bWwsXG4gIHhsaW5rOiBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIixcbiAgeG1sOiBcImh0dHA6Ly93d3cudzMub3JnL1hNTC8xOTk4L25hbWVzcGFjZVwiLFxuICB4bWxuczogXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3htbG5zL1wiXG59O1xuIiwiaW1wb3J0IG5hbWVzcGFjZXMgZnJvbSBcIi4vbmFtZXNwYWNlc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBwcmVmaXggPSBuYW1lICs9IFwiXCIsIGkgPSBwcmVmaXguaW5kZXhPZihcIjpcIik7XG4gIGlmIChpID49IDAgJiYgKHByZWZpeCA9IG5hbWUuc2xpY2UoMCwgaSkpICE9PSBcInhtbG5zXCIpIG5hbWUgPSBuYW1lLnNsaWNlKGkgKyAxKTtcbiAgcmV0dXJuIG5hbWVzcGFjZXMuaGFzT3duUHJvcGVydHkocHJlZml4KSA/IHtzcGFjZTogbmFtZXNwYWNlc1twcmVmaXhdLCBsb2NhbDogbmFtZX0gOiBuYW1lO1xufVxuIiwiaW1wb3J0IG5hbWVzcGFjZSBmcm9tIFwiLi9uYW1lc3BhY2VcIjtcbmltcG9ydCB7eGh0bWx9IGZyb20gXCIuL25hbWVzcGFjZXNcIjtcblxuZnVuY3Rpb24gY3JlYXRvckluaGVyaXQobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5vd25lckRvY3VtZW50LFxuICAgICAgICB1cmkgPSB0aGlzLm5hbWVzcGFjZVVSSTtcbiAgICByZXR1cm4gdXJpID09PSB4aHRtbCAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubmFtZXNwYWNlVVJJID09PSB4aHRtbFxuICAgICAgICA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobmFtZSlcbiAgICAgICAgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlModXJpLCBuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRvckZpeGVkKGZ1bGxuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5vd25lckRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBmdWxsbmFtZSA9IG5hbWVzcGFjZShuYW1lKTtcbiAgcmV0dXJuIChmdWxsbmFtZS5sb2NhbFxuICAgICAgPyBjcmVhdG9yRml4ZWRcbiAgICAgIDogY3JlYXRvckluaGVyaXQpKGZ1bGxuYW1lKTtcbn1cbiIsImZ1bmN0aW9uIG5vbmUoKSB7fVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3Rvcikge1xuICByZXR1cm4gc2VsZWN0b3IgPT0gbnVsbCA/IG5vbmUgOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfTtcbn1cbiIsImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHNlbGVjdG9yIGZyb20gXCIuLi9zZWxlY3RvclwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3QpIHtcbiAgaWYgKHR5cGVvZiBzZWxlY3QgIT09IFwiZnVuY3Rpb25cIikgc2VsZWN0ID0gc2VsZWN0b3Ioc2VsZWN0KTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHN1Ymdyb3VwID0gc3ViZ3JvdXBzW2pdID0gbmV3IEFycmF5KG4pLCBub2RlLCBzdWJub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIChzdWJub2RlID0gc2VsZWN0LmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApKSkge1xuICAgICAgICBpZiAoXCJfX2RhdGFfX1wiIGluIG5vZGUpIHN1Ym5vZGUuX19kYXRhX18gPSBub2RlLl9fZGF0YV9fO1xuICAgICAgICBzdWJncm91cFtpXSA9IHN1Ym5vZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oc3ViZ3JvdXBzLCB0aGlzLl9wYXJlbnRzKTtcbn1cbiIsImZ1bmN0aW9uIGVtcHR5KCkge1xuICByZXR1cm4gW107XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiBzZWxlY3RvciA9PSBudWxsID8gZW1wdHkgOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgfTtcbn1cbiIsImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHNlbGVjdG9yQWxsIGZyb20gXCIuLi9zZWxlY3RvckFsbFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3QpIHtcbiAgaWYgKHR5cGVvZiBzZWxlY3QgIT09IFwiZnVuY3Rpb25cIikgc2VsZWN0ID0gc2VsZWN0b3JBbGwoc2VsZWN0KTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBbXSwgcGFyZW50cyA9IFtdLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgICBzdWJncm91cHMucHVzaChzZWxlY3QuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpO1xuICAgICAgICBwYXJlbnRzLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oc3ViZ3JvdXBzLCBwYXJlbnRzKTtcbn1cbiIsInZhciBtYXRjaGVyID0gZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm1hdGNoZXMoc2VsZWN0b3IpO1xuICB9O1xufTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgaWYgKCFlbGVtZW50Lm1hdGNoZXMpIHtcbiAgICB2YXIgdmVuZG9yTWF0Y2hlcyA9IGVsZW1lbnQud2Via2l0TWF0Y2hlc1NlbGVjdG9yXG4gICAgICAgIHx8IGVsZW1lbnQubXNNYXRjaGVzU2VsZWN0b3JcbiAgICAgICAgfHwgZWxlbWVudC5tb3pNYXRjaGVzU2VsZWN0b3JcbiAgICAgICAgfHwgZWxlbWVudC5vTWF0Y2hlc1NlbGVjdG9yO1xuICAgIG1hdGNoZXIgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdmVuZG9yTWF0Y2hlcy5jYWxsKHRoaXMsIHNlbGVjdG9yKTtcbiAgICAgIH07XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBtYXRjaGVyO1xuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgbWF0Y2hlciBmcm9tIFwiLi4vbWF0Y2hlclwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihtYXRjaCkge1xuICBpZiAodHlwZW9mIG1hdGNoICE9PSBcImZ1bmN0aW9uXCIpIG1hdGNoID0gbWF0Y2hlcihtYXRjaCk7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgc3ViZ3JvdXBzID0gbmV3IEFycmF5KG0pLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBzdWJncm91cCA9IHN1Ymdyb3Vwc1tqXSA9IFtdLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIG1hdGNoLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApKSB7XG4gICAgICAgIHN1Ymdyb3VwLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oc3ViZ3JvdXBzLCB0aGlzLl9wYXJlbnRzKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHVwZGF0ZSkge1xuICByZXR1cm4gbmV3IEFycmF5KHVwZGF0ZS5sZW5ndGgpO1xufVxuIiwiaW1wb3J0IHNwYXJzZSBmcm9tIFwiLi9zcGFyc2VcIjtcbmltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5fZW50ZXIgfHwgdGhpcy5fZ3JvdXBzLm1hcChzcGFyc2UpLCB0aGlzLl9wYXJlbnRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIEVudGVyTm9kZShwYXJlbnQsIGRhdHVtKSB7XG4gIHRoaXMub3duZXJEb2N1bWVudCA9IHBhcmVudC5vd25lckRvY3VtZW50O1xuICB0aGlzLm5hbWVzcGFjZVVSSSA9IHBhcmVudC5uYW1lc3BhY2VVUkk7XG4gIHRoaXMuX25leHQgPSBudWxsO1xuICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuX19kYXRhX18gPSBkYXR1bTtcbn1cblxuRW50ZXJOb2RlLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEVudGVyTm9kZSxcbiAgYXBwZW5kQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkKSB7IHJldHVybiB0aGlzLl9wYXJlbnQuaW5zZXJ0QmVmb3JlKGNoaWxkLCB0aGlzLl9uZXh0KTsgfSxcbiAgaW5zZXJ0QmVmb3JlOiBmdW5jdGlvbihjaGlsZCwgbmV4dCkgeyByZXR1cm4gdGhpcy5fcGFyZW50Lmluc2VydEJlZm9yZShjaGlsZCwgbmV4dCk7IH0sXG4gIHF1ZXJ5U2VsZWN0b3I6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7IHJldHVybiB0aGlzLl9wYXJlbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7IH0sXG4gIHF1ZXJ5U2VsZWN0b3JBbGw6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7IHJldHVybiB0aGlzLl9wYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7IH1cbn07XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4geDtcbiAgfTtcbn1cbiIsImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHtFbnRlck5vZGV9IGZyb20gXCIuL2VudGVyXCI7XG5pbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4uL2NvbnN0YW50XCI7XG5cbnZhciBrZXlQcmVmaXggPSBcIiRcIjsgLy8gUHJvdGVjdCBhZ2FpbnN0IGtleXMgbGlrZSDigJxfX3Byb3RvX1/igJ0uXG5cbmZ1bmN0aW9uIGJpbmRJbmRleChwYXJlbnQsIGdyb3VwLCBlbnRlciwgdXBkYXRlLCBleGl0LCBkYXRhKSB7XG4gIHZhciBpID0gMCxcbiAgICAgIG5vZGUsXG4gICAgICBncm91cExlbmd0aCA9IGdyb3VwLmxlbmd0aCxcbiAgICAgIGRhdGFMZW5ndGggPSBkYXRhLmxlbmd0aDtcblxuICAvLyBQdXQgYW55IG5vbi1udWxsIG5vZGVzIHRoYXQgZml0IGludG8gdXBkYXRlLlxuICAvLyBQdXQgYW55IG51bGwgbm9kZXMgaW50byBlbnRlci5cbiAgLy8gUHV0IGFueSByZW1haW5pbmcgZGF0YSBpbnRvIGVudGVyLlxuICBmb3IgKDsgaSA8IGRhdGFMZW5ndGg7ICsraSkge1xuICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgIG5vZGUuX19kYXRhX18gPSBkYXRhW2ldO1xuICAgICAgdXBkYXRlW2ldID0gbm9kZTtcbiAgICB9IGVsc2Uge1xuICAgICAgZW50ZXJbaV0gPSBuZXcgRW50ZXJOb2RlKHBhcmVudCwgZGF0YVtpXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gUHV0IGFueSBub24tbnVsbCBub2RlcyB0aGF0IGRvbuKAmXQgZml0IGludG8gZXhpdC5cbiAgZm9yICg7IGkgPCBncm91cExlbmd0aDsgKytpKSB7XG4gICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgZXhpdFtpXSA9IG5vZGU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGJpbmRLZXkocGFyZW50LCBncm91cCwgZW50ZXIsIHVwZGF0ZSwgZXhpdCwgZGF0YSwga2V5KSB7XG4gIHZhciBpLFxuICAgICAgbm9kZSxcbiAgICAgIG5vZGVCeUtleVZhbHVlID0ge30sXG4gICAgICBncm91cExlbmd0aCA9IGdyb3VwLmxlbmd0aCxcbiAgICAgIGRhdGFMZW5ndGggPSBkYXRhLmxlbmd0aCxcbiAgICAgIGtleVZhbHVlcyA9IG5ldyBBcnJheShncm91cExlbmd0aCksXG4gICAgICBrZXlWYWx1ZTtcblxuICAvLyBDb21wdXRlIHRoZSBrZXkgZm9yIGVhY2ggbm9kZS5cbiAgLy8gSWYgbXVsdGlwbGUgbm9kZXMgaGF2ZSB0aGUgc2FtZSBrZXksIHRoZSBkdXBsaWNhdGVzIGFyZSBhZGRlZCB0byBleGl0LlxuICBmb3IgKGkgPSAwOyBpIDwgZ3JvdXBMZW5ndGg7ICsraSkge1xuICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgIGtleVZhbHVlc1tpXSA9IGtleVZhbHVlID0ga2V5UHJlZml4ICsga2V5LmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApO1xuICAgICAgaWYgKGtleVZhbHVlIGluIG5vZGVCeUtleVZhbHVlKSB7XG4gICAgICAgIGV4aXRbaV0gPSBub2RlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZUJ5S2V5VmFsdWVba2V5VmFsdWVdID0gbm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDb21wdXRlIHRoZSBrZXkgZm9yIGVhY2ggZGF0dW0uXG4gIC8vIElmIHRoZXJlIGEgbm9kZSBhc3NvY2lhdGVkIHdpdGggdGhpcyBrZXksIGpvaW4gYW5kIGFkZCBpdCB0byB1cGRhdGUuXG4gIC8vIElmIHRoZXJlIGlzIG5vdCAob3IgdGhlIGtleSBpcyBhIGR1cGxpY2F0ZSksIGFkZCBpdCB0byBlbnRlci5cbiAgZm9yIChpID0gMDsgaSA8IGRhdGFMZW5ndGg7ICsraSkge1xuICAgIGtleVZhbHVlID0ga2V5UHJlZml4ICsga2V5LmNhbGwocGFyZW50LCBkYXRhW2ldLCBpLCBkYXRhKTtcbiAgICBpZiAobm9kZSA9IG5vZGVCeUtleVZhbHVlW2tleVZhbHVlXSkge1xuICAgICAgdXBkYXRlW2ldID0gbm9kZTtcbiAgICAgIG5vZGUuX19kYXRhX18gPSBkYXRhW2ldO1xuICAgICAgbm9kZUJ5S2V5VmFsdWVba2V5VmFsdWVdID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgZW50ZXJbaV0gPSBuZXcgRW50ZXJOb2RlKHBhcmVudCwgZGF0YVtpXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQWRkIGFueSByZW1haW5pbmcgbm9kZXMgdGhhdCB3ZXJlIG5vdCBib3VuZCB0byBkYXRhIHRvIGV4aXQuXG4gIGZvciAoaSA9IDA7IGkgPCBncm91cExlbmd0aDsgKytpKSB7XG4gICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIChub2RlQnlLZXlWYWx1ZVtrZXlWYWx1ZXNbaV1dID09PSBub2RlKSkge1xuICAgICAgZXhpdFtpXSA9IG5vZGU7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgaWYgKCF2YWx1ZSkge1xuICAgIGRhdGEgPSBuZXcgQXJyYXkodGhpcy5zaXplKCkpLCBqID0gLTE7XG4gICAgdGhpcy5lYWNoKGZ1bmN0aW9uKGQpIHsgZGF0YVsrK2pdID0gZDsgfSk7XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICB2YXIgYmluZCA9IGtleSA/IGJpbmRLZXkgOiBiaW5kSW5kZXgsXG4gICAgICBwYXJlbnRzID0gdGhpcy5fcGFyZW50cyxcbiAgICAgIGdyb3VwcyA9IHRoaXMuX2dyb3VwcztcblxuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHZhbHVlID0gY29uc3RhbnQodmFsdWUpO1xuXG4gIGZvciAodmFyIG0gPSBncm91cHMubGVuZ3RoLCB1cGRhdGUgPSBuZXcgQXJyYXkobSksIGVudGVyID0gbmV3IEFycmF5KG0pLCBleGl0ID0gbmV3IEFycmF5KG0pLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIHZhciBwYXJlbnQgPSBwYXJlbnRzW2pdLFxuICAgICAgICBncm91cCA9IGdyb3Vwc1tqXSxcbiAgICAgICAgZ3JvdXBMZW5ndGggPSBncm91cC5sZW5ndGgsXG4gICAgICAgIGRhdGEgPSB2YWx1ZS5jYWxsKHBhcmVudCwgcGFyZW50ICYmIHBhcmVudC5fX2RhdGFfXywgaiwgcGFyZW50cyksXG4gICAgICAgIGRhdGFMZW5ndGggPSBkYXRhLmxlbmd0aCxcbiAgICAgICAgZW50ZXJHcm91cCA9IGVudGVyW2pdID0gbmV3IEFycmF5KGRhdGFMZW5ndGgpLFxuICAgICAgICB1cGRhdGVHcm91cCA9IHVwZGF0ZVtqXSA9IG5ldyBBcnJheShkYXRhTGVuZ3RoKSxcbiAgICAgICAgZXhpdEdyb3VwID0gZXhpdFtqXSA9IG5ldyBBcnJheShncm91cExlbmd0aCk7XG5cbiAgICBiaW5kKHBhcmVudCwgZ3JvdXAsIGVudGVyR3JvdXAsIHVwZGF0ZUdyb3VwLCBleGl0R3JvdXAsIGRhdGEsIGtleSk7XG5cbiAgICAvLyBOb3cgY29ubmVjdCB0aGUgZW50ZXIgbm9kZXMgdG8gdGhlaXIgZm9sbG93aW5nIHVwZGF0ZSBub2RlLCBzdWNoIHRoYXRcbiAgICAvLyBhcHBlbmRDaGlsZCBjYW4gaW5zZXJ0IHRoZSBtYXRlcmlhbGl6ZWQgZW50ZXIgbm9kZSBiZWZvcmUgdGhpcyBub2RlLFxuICAgIC8vIHJhdGhlciB0aGFuIGF0IHRoZSBlbmQgb2YgdGhlIHBhcmVudCBub2RlLlxuICAgIGZvciAodmFyIGkwID0gMCwgaTEgPSAwLCBwcmV2aW91cywgbmV4dDsgaTAgPCBkYXRhTGVuZ3RoOyArK2kwKSB7XG4gICAgICBpZiAocHJldmlvdXMgPSBlbnRlckdyb3VwW2kwXSkge1xuICAgICAgICBpZiAoaTAgPj0gaTEpIGkxID0gaTAgKyAxO1xuICAgICAgICB3aGlsZSAoIShuZXh0ID0gdXBkYXRlR3JvdXBbaTFdKSAmJiArK2kxIDwgZGF0YUxlbmd0aCk7XG4gICAgICAgIHByZXZpb3VzLl9uZXh0ID0gbmV4dCB8fCBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZSA9IG5ldyBTZWxlY3Rpb24odXBkYXRlLCBwYXJlbnRzKTtcbiAgdXBkYXRlLl9lbnRlciA9IGVudGVyO1xuICB1cGRhdGUuX2V4aXQgPSBleGl0O1xuICByZXR1cm4gdXBkYXRlO1xufVxuIiwiaW1wb3J0IHNwYXJzZSBmcm9tIFwiLi9zcGFyc2VcIjtcbmltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5fZXhpdCB8fCB0aGlzLl9ncm91cHMubWFwKHNwYXJzZSksIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdGlvbikge1xuXG4gIGZvciAodmFyIGdyb3VwczAgPSB0aGlzLl9ncm91cHMsIGdyb3VwczEgPSBzZWxlY3Rpb24uX2dyb3VwcywgbTAgPSBncm91cHMwLmxlbmd0aCwgbTEgPSBncm91cHMxLmxlbmd0aCwgbSA9IE1hdGgubWluKG0wLCBtMSksIG1lcmdlcyA9IG5ldyBBcnJheShtMCksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAwID0gZ3JvdXBzMFtqXSwgZ3JvdXAxID0gZ3JvdXBzMVtqXSwgbiA9IGdyb3VwMC5sZW5ndGgsIG1lcmdlID0gbWVyZ2VzW2pdID0gbmV3IEFycmF5KG4pLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cDBbaV0gfHwgZ3JvdXAxW2ldKSB7XG4gICAgICAgIG1lcmdlW2ldID0gbm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKDsgaiA8IG0wOyArK2opIHtcbiAgICBtZXJnZXNbal0gPSBncm91cHMwW2pdO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24obWVyZ2VzLCB0aGlzLl9wYXJlbnRzKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgaiA9IC0xLCBtID0gZ3JvdXBzLmxlbmd0aDsgKytqIDwgbTspIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgaSA9IGdyb3VwLmxlbmd0aCAtIDEsIG5leHQgPSBncm91cFtpXSwgbm9kZTsgLS1pID49IDA7KSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIGlmIChuZXh0ICYmIG5leHQgIT09IG5vZGUubmV4dFNpYmxpbmcpIG5leHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgbmV4dCk7XG4gICAgICAgIG5leHQgPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbXBhcmUpIHtcbiAgaWYgKCFjb21wYXJlKSBjb21wYXJlID0gYXNjZW5kaW5nO1xuXG4gIGZ1bmN0aW9uIGNvbXBhcmVOb2RlKGEsIGIpIHtcbiAgICByZXR1cm4gYSAmJiBiID8gY29tcGFyZShhLl9fZGF0YV9fLCBiLl9fZGF0YV9fKSA6ICFhIC0gIWI7XG4gIH1cblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzb3J0Z3JvdXBzID0gbmV3IEFycmF5KG0pLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBzb3J0Z3JvdXAgPSBzb3J0Z3JvdXBzW2pdID0gbmV3IEFycmF5KG4pLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgICBzb3J0Z3JvdXBbaV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgICBzb3J0Z3JvdXAuc29ydChjb21wYXJlTm9kZSk7XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzb3J0Z3JvdXBzLCB0aGlzLl9wYXJlbnRzKS5vcmRlcigpO1xufVxuXG5mdW5jdGlvbiBhc2NlbmRpbmcoYSwgYikge1xuICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IGEgPj0gYiA/IDAgOiBOYU47XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgdmFyIGNhbGxiYWNrID0gYXJndW1lbnRzWzBdO1xuICBhcmd1bWVudHNbMF0gPSB0aGlzO1xuICBjYWxsYmFjay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICByZXR1cm4gdGhpcztcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZXMgPSBuZXcgQXJyYXkodGhpcy5zaXplKCkpLCBpID0gLTE7XG4gIHRoaXMuZWFjaChmdW5jdGlvbigpIHsgbm9kZXNbKytpXSA9IHRoaXM7IH0pO1xuICByZXR1cm4gbm9kZXM7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIGogPSAwLCBtID0gZ3JvdXBzLmxlbmd0aDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gMCwgbiA9IGdyb3VwLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgdmFyIG5vZGUgPSBncm91cFtpXTtcbiAgICAgIGlmIChub2RlKSByZXR1cm4gbm9kZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgc2l6ZSA9IDA7XG4gIHRoaXMuZWFjaChmdW5jdGlvbigpIHsgKytzaXplOyB9KTtcbiAgcmV0dXJuIHNpemU7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICF0aGlzLm5vZGUoKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBqID0gMCwgbSA9IGdyb3Vwcy5sZW5ndGg7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgaSA9IDAsIG4gPSBncm91cC5sZW5ndGgsIG5vZGU7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIGNhbGxiYWNrLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufVxuIiwiaW1wb3J0IG5hbWVzcGFjZSBmcm9tIFwiLi4vbmFtZXNwYWNlXCI7XG5cbmZ1bmN0aW9uIGF0dHJSZW1vdmUobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJSZW1vdmVOUyhmdWxsbmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyQ29uc3RhbnQobmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckNvbnN0YW50TlMoZnVsbG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNldEF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCwgdmFsdWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyRnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSB0aGlzLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICBlbHNlIHRoaXMuc2V0QXR0cmlidXRlKG5hbWUsIHYpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyRnVuY3Rpb25OUyhmdWxsbmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSB0aGlzLnJlbW92ZUF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gICAgZWxzZSB0aGlzLnNldEF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCwgdik7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHZhciBmdWxsbmFtZSA9IG5hbWVzcGFjZShuYW1lKTtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMubm9kZSgpO1xuICAgIHJldHVybiBmdWxsbmFtZS5sb2NhbFxuICAgICAgICA/IG5vZGUuZ2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKVxuICAgICAgICA6IG5vZGUuZ2V0QXR0cmlidXRlKGZ1bGxuYW1lKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmVhY2goKHZhbHVlID09IG51bGxcbiAgICAgID8gKGZ1bGxuYW1lLmxvY2FsID8gYXR0clJlbW92ZU5TIDogYXR0clJlbW92ZSkgOiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gKGZ1bGxuYW1lLmxvY2FsID8gYXR0ckZ1bmN0aW9uTlMgOiBhdHRyRnVuY3Rpb24pXG4gICAgICA6IChmdWxsbmFtZS5sb2NhbCA/IGF0dHJDb25zdGFudE5TIDogYXR0ckNvbnN0YW50KSkpKGZ1bGxuYW1lLCB2YWx1ZSkpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obm9kZSkge1xuICByZXR1cm4gKG5vZGUub3duZXJEb2N1bWVudCAmJiBub2RlLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcpIC8vIG5vZGUgaXMgYSBOb2RlXG4gICAgICB8fCAobm9kZS5kb2N1bWVudCAmJiBub2RlKSAvLyBub2RlIGlzIGEgV2luZG93XG4gICAgICB8fCBub2RlLmRlZmF1bHRWaWV3OyAvLyBub2RlIGlzIGEgRG9jdW1lbnRcbn1cbiIsImltcG9ydCBkZWZhdWx0VmlldyBmcm9tIFwiLi4vd2luZG93XCI7XG5cbmZ1bmN0aW9uIHN0eWxlUmVtb3ZlKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHN0eWxlQ29uc3RhbnQobmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIHZhbHVlLCBwcmlvcml0eSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHN0eWxlRnVuY3Rpb24obmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHYgPT0gbnVsbCkgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgICBlbHNlIHRoaXMuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdiwgcHJpb3JpdHkpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPiAxXG4gICAgICA/IHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbFxuICAgICAgICAgICAgPyBzdHlsZVJlbW92ZSA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgICA/IHN0eWxlRnVuY3Rpb25cbiAgICAgICAgICAgIDogc3R5bGVDb25zdGFudCkobmFtZSwgdmFsdWUsIHByaW9yaXR5ID09IG51bGwgPyBcIlwiIDogcHJpb3JpdHkpKVxuICAgICAgOiBzdHlsZVZhbHVlKHRoaXMubm9kZSgpLCBuYW1lKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0eWxlVmFsdWUobm9kZSwgbmFtZSkge1xuICByZXR1cm4gbm9kZS5zdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKG5hbWUpXG4gICAgICB8fCBkZWZhdWx0Vmlldyhub2RlKS5nZXRDb21wdXRlZFN0eWxlKG5vZGUsIG51bGwpLmdldFByb3BlcnR5VmFsdWUobmFtZSk7XG59XG4iLCJmdW5jdGlvbiBwcm9wZXJ0eVJlbW92ZShuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBkZWxldGUgdGhpc1tuYW1lXTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcHJvcGVydHlDb25zdGFudChuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpc1tuYW1lXSA9IHZhbHVlO1xuICB9O1xufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eUZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHYgPT0gbnVsbCkgZGVsZXRlIHRoaXNbbmFtZV07XG4gICAgZWxzZSB0aGlzW25hbWVdID0gdjtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPiAxXG4gICAgICA/IHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbFxuICAgICAgICAgID8gcHJvcGVydHlSZW1vdmUgOiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICAgID8gcHJvcGVydHlGdW5jdGlvblxuICAgICAgICAgIDogcHJvcGVydHlDb25zdGFudCkobmFtZSwgdmFsdWUpKVxuICAgICAgOiB0aGlzLm5vZGUoKVtuYW1lXTtcbn1cbiIsImZ1bmN0aW9uIGNsYXNzQXJyYXkoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmcudHJpbSgpLnNwbGl0KC9efFxccysvKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NMaXN0KG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuY2xhc3NMaXN0IHx8IG5ldyBDbGFzc0xpc3Qobm9kZSk7XG59XG5cbmZ1bmN0aW9uIENsYXNzTGlzdChub2RlKSB7XG4gIHRoaXMuX25vZGUgPSBub2RlO1xuICB0aGlzLl9uYW1lcyA9IGNsYXNzQXJyYXkobm9kZS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSB8fCBcIlwiKTtcbn1cblxuQ2xhc3NMaXN0LnByb3RvdHlwZSA9IHtcbiAgYWRkOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGkgPSB0aGlzLl9uYW1lcy5pbmRleE9mKG5hbWUpO1xuICAgIGlmIChpIDwgMCkge1xuICAgICAgdGhpcy5fbmFtZXMucHVzaChuYW1lKTtcbiAgICAgIHRoaXMuX25vZGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdGhpcy5fbmFtZXMuam9pbihcIiBcIikpO1xuICAgIH1cbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGkgPSB0aGlzLl9uYW1lcy5pbmRleE9mKG5hbWUpO1xuICAgIGlmIChpID49IDApIHtcbiAgICAgIHRoaXMuX25hbWVzLnNwbGljZShpLCAxKTtcbiAgICAgIHRoaXMuX25vZGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdGhpcy5fbmFtZXMuam9pbihcIiBcIikpO1xuICAgIH1cbiAgfSxcbiAgY29udGFpbnM6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5fbmFtZXMuaW5kZXhPZihuYW1lKSA+PSAwO1xuICB9XG59O1xuXG5mdW5jdGlvbiBjbGFzc2VkQWRkKG5vZGUsIG5hbWVzKSB7XG4gIHZhciBsaXN0ID0gY2xhc3NMaXN0KG5vZGUpLCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gIHdoaWxlICgrK2kgPCBuKSBsaXN0LmFkZChuYW1lc1tpXSk7XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRSZW1vdmUobm9kZSwgbmFtZXMpIHtcbiAgdmFyIGxpc3QgPSBjbGFzc0xpc3Qobm9kZSksIGkgPSAtMSwgbiA9IG5hbWVzLmxlbmd0aDtcbiAgd2hpbGUgKCsraSA8IG4pIGxpc3QucmVtb3ZlKG5hbWVzW2ldKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NlZFRydWUobmFtZXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzZWRBZGQodGhpcywgbmFtZXMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkRmFsc2UobmFtZXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzZWRSZW1vdmUodGhpcywgbmFtZXMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkRnVuY3Rpb24obmFtZXMsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAodmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKSA/IGNsYXNzZWRBZGQgOiBjbGFzc2VkUmVtb3ZlKSh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHZhciBuYW1lcyA9IGNsYXNzQXJyYXkobmFtZSArIFwiXCIpO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHZhciBsaXN0ID0gY2xhc3NMaXN0KHRoaXMubm9kZSgpKSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoIWxpc3QuY29udGFpbnMobmFtZXNbaV0pKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gdGhpcy5lYWNoKCh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgPyBjbGFzc2VkRnVuY3Rpb24gOiB2YWx1ZVxuICAgICAgPyBjbGFzc2VkVHJ1ZVxuICAgICAgOiBjbGFzc2VkRmFsc2UpKG5hbWVzLCB2YWx1ZSkpO1xufVxuIiwiZnVuY3Rpb24gdGV4dFJlbW92ZSgpIHtcbiAgdGhpcy50ZXh0Q29udGVudCA9IFwiXCI7XG59XG5cbmZ1bmN0aW9uIHRleHRDb25zdGFudCh2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50ZXh0Q29udGVudCA9IHZhbHVlO1xuICB9O1xufVxuXG5mdW5jdGlvbiB0ZXh0RnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gdiA9PSBudWxsID8gXCJcIiA6IHY7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyB0ZXh0UmVtb3ZlIDogKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyB0ZXh0RnVuY3Rpb25cbiAgICAgICAgICA6IHRleHRDb25zdGFudCkodmFsdWUpKVxuICAgICAgOiB0aGlzLm5vZGUoKS50ZXh0Q29udGVudDtcbn1cbiIsImZ1bmN0aW9uIGh0bWxSZW1vdmUoKSB7XG4gIHRoaXMuaW5uZXJIVE1MID0gXCJcIjtcbn1cblxuZnVuY3Rpb24gaHRtbENvbnN0YW50KHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlubmVySFRNTCA9IHZhbHVlO1xuICB9O1xufVxuXG5mdW5jdGlvbiBodG1sRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLmlubmVySFRNTCA9IHYgPT0gbnVsbCA/IFwiXCIgOiB2O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLmVhY2godmFsdWUgPT0gbnVsbFxuICAgICAgICAgID8gaHRtbFJlbW92ZSA6ICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICAgID8gaHRtbEZ1bmN0aW9uXG4gICAgICAgICAgOiBodG1sQ29uc3RhbnQpKHZhbHVlKSlcbiAgICAgIDogdGhpcy5ub2RlKCkuaW5uZXJIVE1MO1xufVxuIiwiZnVuY3Rpb24gcmFpc2UoKSB7XG4gIGlmICh0aGlzLm5leHRTaWJsaW5nKSB0aGlzLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQodGhpcyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lYWNoKHJhaXNlKTtcbn1cbiIsImZ1bmN0aW9uIGxvd2VyKCkge1xuICBpZiAodGhpcy5wcmV2aW91c1NpYmxpbmcpIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcywgdGhpcy5wYXJlbnROb2RlLmZpcnN0Q2hpbGQpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaChsb3dlcik7XG59XG4iLCJpbXBvcnQgY3JlYXRvciBmcm9tIFwiLi4vY3JlYXRvclwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBjcmVhdGUgPSB0eXBlb2YgbmFtZSA9PT0gXCJmdW5jdGlvblwiID8gbmFtZSA6IGNyZWF0b3IobmFtZSk7XG4gIHJldHVybiB0aGlzLnNlbGVjdChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5hcHBlbmRDaGlsZChjcmVhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gIH0pO1xufVxuIiwiaW1wb3J0IGNyZWF0b3IgZnJvbSBcIi4uL2NyZWF0b3JcIjtcbmltcG9ydCBzZWxlY3RvciBmcm9tIFwiLi4vc2VsZWN0b3JcIjtcblxuZnVuY3Rpb24gY29uc3RhbnROdWxsKCkge1xuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgYmVmb3JlKSB7XG4gIHZhciBjcmVhdGUgPSB0eXBlb2YgbmFtZSA9PT0gXCJmdW5jdGlvblwiID8gbmFtZSA6IGNyZWF0b3IobmFtZSksXG4gICAgICBzZWxlY3QgPSBiZWZvcmUgPT0gbnVsbCA/IGNvbnN0YW50TnVsbCA6IHR5cGVvZiBiZWZvcmUgPT09IFwiZnVuY3Rpb25cIiA/IGJlZm9yZSA6IHNlbGVjdG9yKGJlZm9yZSk7XG4gIHJldHVybiB0aGlzLnNlbGVjdChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5pbnNlcnRCZWZvcmUoY3JlYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksIHNlbGVjdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IG51bGwpO1xuICB9KTtcbn1cbiIsImZ1bmN0aW9uIHJlbW92ZSgpIHtcbiAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50Tm9kZTtcbiAgaWYgKHBhcmVudCkgcGFyZW50LnJlbW92ZUNoaWxkKHRoaXMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaChyZW1vdmUpO1xufVxuIiwiZnVuY3Rpb24gc2VsZWN0aW9uX2Nsb25lU2hhbGxvdygpIHtcbiAgcmV0dXJuIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5jbG9uZU5vZGUoZmFsc2UpLCB0aGlzLm5leHRTaWJsaW5nKTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0aW9uX2Nsb25lRGVlcCgpIHtcbiAgcmV0dXJuIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5jbG9uZU5vZGUodHJ1ZSksIHRoaXMubmV4dFNpYmxpbmcpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihkZWVwKSB7XG4gIHJldHVybiB0aGlzLnNlbGVjdChkZWVwID8gc2VsZWN0aW9uX2Nsb25lRGVlcCA6IHNlbGVjdGlvbl9jbG9uZVNoYWxsb3cpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5wcm9wZXJ0eShcIl9fZGF0YV9fXCIsIHZhbHVlKVxuICAgICAgOiB0aGlzLm5vZGUoKS5fX2RhdGFfXztcbn1cbiIsInZhciBmaWx0ZXJFdmVudHMgPSB7fTtcblxuZXhwb3J0IHZhciBldmVudCA9IG51bGw7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGlmICghKFwib25tb3VzZWVudGVyXCIgaW4gZWxlbWVudCkpIHtcbiAgICBmaWx0ZXJFdmVudHMgPSB7bW91c2VlbnRlcjogXCJtb3VzZW92ZXJcIiwgbW91c2VsZWF2ZTogXCJtb3VzZW91dFwifTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaWx0ZXJDb250ZXh0TGlzdGVuZXIobGlzdGVuZXIsIGluZGV4LCBncm91cCkge1xuICBsaXN0ZW5lciA9IGNvbnRleHRMaXN0ZW5lcihsaXN0ZW5lciwgaW5kZXgsIGdyb3VwKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgdmFyIHJlbGF0ZWQgPSBldmVudC5yZWxhdGVkVGFyZ2V0O1xuICAgIGlmICghcmVsYXRlZCB8fCAocmVsYXRlZCAhPT0gdGhpcyAmJiAhKHJlbGF0ZWQuY29tcGFyZURvY3VtZW50UG9zaXRpb24odGhpcykgJiA4KSkpIHtcbiAgICAgIGxpc3RlbmVyLmNhbGwodGhpcywgZXZlbnQpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gY29udGV4dExpc3RlbmVyKGxpc3RlbmVyLCBpbmRleCwgZ3JvdXApIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGV2ZW50MSkge1xuICAgIHZhciBldmVudDAgPSBldmVudDsgLy8gRXZlbnRzIGNhbiBiZSByZWVudHJhbnQgKGUuZy4sIGZvY3VzKS5cbiAgICBldmVudCA9IGV2ZW50MTtcbiAgICB0cnkge1xuICAgICAgbGlzdGVuZXIuY2FsbCh0aGlzLCB0aGlzLl9fZGF0YV9fLCBpbmRleCwgZ3JvdXApO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBldmVudCA9IGV2ZW50MDtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlVHlwZW5hbWVzKHR5cGVuYW1lcykge1xuICByZXR1cm4gdHlwZW5hbWVzLnRyaW0oKS5zcGxpdCgvXnxcXHMrLykubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgbmFtZSA9IFwiXCIsIGkgPSB0LmluZGV4T2YoXCIuXCIpO1xuICAgIGlmIChpID49IDApIG5hbWUgPSB0LnNsaWNlKGkgKyAxKSwgdCA9IHQuc2xpY2UoMCwgaSk7XG4gICAgcmV0dXJuIHt0eXBlOiB0LCBuYW1lOiBuYW1lfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG9uUmVtb3ZlKHR5cGVuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgb24gPSB0aGlzLl9fb247XG4gICAgaWYgKCFvbikgcmV0dXJuO1xuICAgIGZvciAodmFyIGogPSAwLCBpID0gLTEsIG0gPSBvbi5sZW5ndGgsIG87IGogPCBtOyArK2opIHtcbiAgICAgIGlmIChvID0gb25bal0sICghdHlwZW5hbWUudHlwZSB8fCBvLnR5cGUgPT09IHR5cGVuYW1lLnR5cGUpICYmIG8ubmFtZSA9PT0gdHlwZW5hbWUubmFtZSkge1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoby50eXBlLCBvLmxpc3RlbmVyLCBvLmNhcHR1cmUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb25bKytpXSA9IG87XG4gICAgICB9XG4gICAgfVxuICAgIGlmICgrK2kpIG9uLmxlbmd0aCA9IGk7XG4gICAgZWxzZSBkZWxldGUgdGhpcy5fX29uO1xuICB9O1xufVxuXG5mdW5jdGlvbiBvbkFkZCh0eXBlbmFtZSwgdmFsdWUsIGNhcHR1cmUpIHtcbiAgdmFyIHdyYXAgPSBmaWx0ZXJFdmVudHMuaGFzT3duUHJvcGVydHkodHlwZW5hbWUudHlwZSkgPyBmaWx0ZXJDb250ZXh0TGlzdGVuZXIgOiBjb250ZXh0TGlzdGVuZXI7XG4gIHJldHVybiBmdW5jdGlvbihkLCBpLCBncm91cCkge1xuICAgIHZhciBvbiA9IHRoaXMuX19vbiwgbywgbGlzdGVuZXIgPSB3cmFwKHZhbHVlLCBpLCBncm91cCk7XG4gICAgaWYgKG9uKSBmb3IgKHZhciBqID0gMCwgbSA9IG9uLmxlbmd0aDsgaiA8IG07ICsraikge1xuICAgICAgaWYgKChvID0gb25bal0pLnR5cGUgPT09IHR5cGVuYW1lLnR5cGUgJiYgby5uYW1lID09PSB0eXBlbmFtZS5uYW1lKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihvLnR5cGUsIG8ubGlzdGVuZXIsIG8uY2FwdHVyZSk7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihvLnR5cGUsIG8ubGlzdGVuZXIgPSBsaXN0ZW5lciwgby5jYXB0dXJlID0gY2FwdHVyZSk7XG4gICAgICAgIG8udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIodHlwZW5hbWUudHlwZSwgbGlzdGVuZXIsIGNhcHR1cmUpO1xuICAgIG8gPSB7dHlwZTogdHlwZW5hbWUudHlwZSwgbmFtZTogdHlwZW5hbWUubmFtZSwgdmFsdWU6IHZhbHVlLCBsaXN0ZW5lcjogbGlzdGVuZXIsIGNhcHR1cmU6IGNhcHR1cmV9O1xuICAgIGlmICghb24pIHRoaXMuX19vbiA9IFtvXTtcbiAgICBlbHNlIG9uLnB1c2gobyk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHR5cGVuYW1lLCB2YWx1ZSwgY2FwdHVyZSkge1xuICB2YXIgdHlwZW5hbWVzID0gcGFyc2VUeXBlbmFtZXModHlwZW5hbWUgKyBcIlwiKSwgaSwgbiA9IHR5cGVuYW1lcy5sZW5ndGgsIHQ7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgdmFyIG9uID0gdGhpcy5ub2RlKCkuX19vbjtcbiAgICBpZiAob24pIGZvciAodmFyIGogPSAwLCBtID0gb24ubGVuZ3RoLCBvOyBqIDwgbTsgKytqKSB7XG4gICAgICBmb3IgKGkgPSAwLCBvID0gb25bal07IGkgPCBuOyArK2kpIHtcbiAgICAgICAgaWYgKCh0ID0gdHlwZW5hbWVzW2ldKS50eXBlID09PSBvLnR5cGUgJiYgdC5uYW1lID09PSBvLm5hbWUpIHtcbiAgICAgICAgICByZXR1cm4gby52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICBvbiA9IHZhbHVlID8gb25BZGQgOiBvblJlbW92ZTtcbiAgaWYgKGNhcHR1cmUgPT0gbnVsbCkgY2FwdHVyZSA9IGZhbHNlO1xuICBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSB0aGlzLmVhY2gob24odHlwZW5hbWVzW2ldLCB2YWx1ZSwgY2FwdHVyZSkpO1xuICByZXR1cm4gdGhpcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGN1c3RvbUV2ZW50KGV2ZW50MSwgbGlzdGVuZXIsIHRoYXQsIGFyZ3MpIHtcbiAgdmFyIGV2ZW50MCA9IGV2ZW50O1xuICBldmVudDEuc291cmNlRXZlbnQgPSBldmVudDtcbiAgZXZlbnQgPSBldmVudDE7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGxpc3RlbmVyLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICB9IGZpbmFsbHkge1xuICAgIGV2ZW50ID0gZXZlbnQwO1xuICB9XG59XG4iLCJpbXBvcnQgZGVmYXVsdFZpZXcgZnJvbSBcIi4uL3dpbmRvd1wiO1xuXG5mdW5jdGlvbiBkaXNwYXRjaEV2ZW50KG5vZGUsIHR5cGUsIHBhcmFtcykge1xuICB2YXIgd2luZG93ID0gZGVmYXVsdFZpZXcobm9kZSksXG4gICAgICBldmVudCA9IHdpbmRvdy5DdXN0b21FdmVudDtcblxuICBpZiAodHlwZW9mIGV2ZW50ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBldmVudCA9IG5ldyBldmVudCh0eXBlLCBwYXJhbXMpO1xuICB9IGVsc2Uge1xuICAgIGV2ZW50ID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiRXZlbnRcIik7XG4gICAgaWYgKHBhcmFtcykgZXZlbnQuaW5pdEV2ZW50KHR5cGUsIHBhcmFtcy5idWJibGVzLCBwYXJhbXMuY2FuY2VsYWJsZSksIGV2ZW50LmRldGFpbCA9IHBhcmFtcy5kZXRhaWw7XG4gICAgZWxzZSBldmVudC5pbml0RXZlbnQodHlwZSwgZmFsc2UsIGZhbHNlKTtcbiAgfVxuXG4gIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG59XG5cbmZ1bmN0aW9uIGRpc3BhdGNoQ29uc3RhbnQodHlwZSwgcGFyYW1zKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGlzcGF0Y2hFdmVudCh0aGlzLCB0eXBlLCBwYXJhbXMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBkaXNwYXRjaEZ1bmN0aW9uKHR5cGUsIHBhcmFtcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGRpc3BhdGNoRXZlbnQodGhpcywgdHlwZSwgcGFyYW1zLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih0eXBlLCBwYXJhbXMpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaCgodHlwZW9mIHBhcmFtcyA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IGRpc3BhdGNoRnVuY3Rpb25cbiAgICAgIDogZGlzcGF0Y2hDb25zdGFudCkodHlwZSwgcGFyYW1zKSk7XG59XG4iLCJpbXBvcnQgc2VsZWN0aW9uX3NlbGVjdCBmcm9tIFwiLi9zZWxlY3RcIjtcbmltcG9ydCBzZWxlY3Rpb25fc2VsZWN0QWxsIGZyb20gXCIuL3NlbGVjdEFsbFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9maWx0ZXIgZnJvbSBcIi4vZmlsdGVyXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2RhdGEgZnJvbSBcIi4vZGF0YVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9lbnRlciBmcm9tIFwiLi9lbnRlclwiO1xuaW1wb3J0IHNlbGVjdGlvbl9leGl0IGZyb20gXCIuL2V4aXRcIjtcbmltcG9ydCBzZWxlY3Rpb25fbWVyZ2UgZnJvbSBcIi4vbWVyZ2VcIjtcbmltcG9ydCBzZWxlY3Rpb25fb3JkZXIgZnJvbSBcIi4vb3JkZXJcIjtcbmltcG9ydCBzZWxlY3Rpb25fc29ydCBmcm9tIFwiLi9zb3J0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX2NhbGwgZnJvbSBcIi4vY2FsbFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9ub2RlcyBmcm9tIFwiLi9ub2Rlc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9ub2RlIGZyb20gXCIuL25vZGVcIjtcbmltcG9ydCBzZWxlY3Rpb25fc2l6ZSBmcm9tIFwiLi9zaXplXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2VtcHR5IGZyb20gXCIuL2VtcHR5XCI7XG5pbXBvcnQgc2VsZWN0aW9uX2VhY2ggZnJvbSBcIi4vZWFjaFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9hdHRyIGZyb20gXCIuL2F0dHJcIjtcbmltcG9ydCBzZWxlY3Rpb25fc3R5bGUgZnJvbSBcIi4vc3R5bGVcIjtcbmltcG9ydCBzZWxlY3Rpb25fcHJvcGVydHkgZnJvbSBcIi4vcHJvcGVydHlcIjtcbmltcG9ydCBzZWxlY3Rpb25fY2xhc3NlZCBmcm9tIFwiLi9jbGFzc2VkXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3RleHQgZnJvbSBcIi4vdGV4dFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9odG1sIGZyb20gXCIuL2h0bWxcIjtcbmltcG9ydCBzZWxlY3Rpb25fcmFpc2UgZnJvbSBcIi4vcmFpc2VcIjtcbmltcG9ydCBzZWxlY3Rpb25fbG93ZXIgZnJvbSBcIi4vbG93ZXJcIjtcbmltcG9ydCBzZWxlY3Rpb25fYXBwZW5kIGZyb20gXCIuL2FwcGVuZFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9pbnNlcnQgZnJvbSBcIi4vaW5zZXJ0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX3JlbW92ZSBmcm9tIFwiLi9yZW1vdmVcIjtcbmltcG9ydCBzZWxlY3Rpb25fY2xvbmUgZnJvbSBcIi4vY2xvbmVcIjtcbmltcG9ydCBzZWxlY3Rpb25fZGF0dW0gZnJvbSBcIi4vZGF0dW1cIjtcbmltcG9ydCBzZWxlY3Rpb25fb24gZnJvbSBcIi4vb25cIjtcbmltcG9ydCBzZWxlY3Rpb25fZGlzcGF0Y2ggZnJvbSBcIi4vZGlzcGF0Y2hcIjtcblxuZXhwb3J0IHZhciByb290ID0gW251bGxdO1xuXG5leHBvcnQgZnVuY3Rpb24gU2VsZWN0aW9uKGdyb3VwcywgcGFyZW50cykge1xuICB0aGlzLl9ncm91cHMgPSBncm91cHM7XG4gIHRoaXMuX3BhcmVudHMgPSBwYXJlbnRzO1xufVxuXG5mdW5jdGlvbiBzZWxlY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKFtbZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XV0sIHJvb3QpO1xufVxuXG5TZWxlY3Rpb24ucHJvdG90eXBlID0gc2VsZWN0aW9uLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IFNlbGVjdGlvbixcbiAgc2VsZWN0OiBzZWxlY3Rpb25fc2VsZWN0LFxuICBzZWxlY3RBbGw6IHNlbGVjdGlvbl9zZWxlY3RBbGwsXG4gIGZpbHRlcjogc2VsZWN0aW9uX2ZpbHRlcixcbiAgZGF0YTogc2VsZWN0aW9uX2RhdGEsXG4gIGVudGVyOiBzZWxlY3Rpb25fZW50ZXIsXG4gIGV4aXQ6IHNlbGVjdGlvbl9leGl0LFxuICBtZXJnZTogc2VsZWN0aW9uX21lcmdlLFxuICBvcmRlcjogc2VsZWN0aW9uX29yZGVyLFxuICBzb3J0OiBzZWxlY3Rpb25fc29ydCxcbiAgY2FsbDogc2VsZWN0aW9uX2NhbGwsXG4gIG5vZGVzOiBzZWxlY3Rpb25fbm9kZXMsXG4gIG5vZGU6IHNlbGVjdGlvbl9ub2RlLFxuICBzaXplOiBzZWxlY3Rpb25fc2l6ZSxcbiAgZW1wdHk6IHNlbGVjdGlvbl9lbXB0eSxcbiAgZWFjaDogc2VsZWN0aW9uX2VhY2gsXG4gIGF0dHI6IHNlbGVjdGlvbl9hdHRyLFxuICBzdHlsZTogc2VsZWN0aW9uX3N0eWxlLFxuICBwcm9wZXJ0eTogc2VsZWN0aW9uX3Byb3BlcnR5LFxuICBjbGFzc2VkOiBzZWxlY3Rpb25fY2xhc3NlZCxcbiAgdGV4dDogc2VsZWN0aW9uX3RleHQsXG4gIGh0bWw6IHNlbGVjdGlvbl9odG1sLFxuICByYWlzZTogc2VsZWN0aW9uX3JhaXNlLFxuICBsb3dlcjogc2VsZWN0aW9uX2xvd2VyLFxuICBhcHBlbmQ6IHNlbGVjdGlvbl9hcHBlbmQsXG4gIGluc2VydDogc2VsZWN0aW9uX2luc2VydCxcbiAgcmVtb3ZlOiBzZWxlY3Rpb25fcmVtb3ZlLFxuICBjbG9uZTogc2VsZWN0aW9uX2Nsb25lLFxuICBkYXR1bTogc2VsZWN0aW9uX2RhdHVtLFxuICBvbjogc2VsZWN0aW9uX29uLFxuICBkaXNwYXRjaDogc2VsZWN0aW9uX2Rpc3BhdGNoXG59O1xuXG5leHBvcnQgZGVmYXVsdCBzZWxlY3Rpb247XG4iLCJpbXBvcnQge1NlbGVjdGlvbiwgcm9vdH0gZnJvbSBcIi4vc2VsZWN0aW9uL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiB0eXBlb2Ygc2VsZWN0b3IgPT09IFwic3RyaW5nXCJcbiAgICAgID8gbmV3IFNlbGVjdGlvbihbW2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpXV0sIFtkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRdKVxuICAgICAgOiBuZXcgU2VsZWN0aW9uKFtbc2VsZWN0b3JdXSwgcm9vdCk7XG59XG4iLCJpbXBvcnQge2V2ZW50fSBmcm9tIFwiLi9zZWxlY3Rpb24vb25cIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBjdXJyZW50ID0gZXZlbnQsIHNvdXJjZTtcbiAgd2hpbGUgKHNvdXJjZSA9IGN1cnJlbnQuc291cmNlRXZlbnQpIGN1cnJlbnQgPSBzb3VyY2U7XG4gIHJldHVybiBjdXJyZW50O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obm9kZSwgZXZlbnQpIHtcbiAgdmFyIHN2ZyA9IG5vZGUub3duZXJTVkdFbGVtZW50IHx8IG5vZGU7XG5cbiAgaWYgKHN2Zy5jcmVhdGVTVkdQb2ludCkge1xuICAgIHZhciBwb2ludCA9IHN2Zy5jcmVhdGVTVkdQb2ludCgpO1xuICAgIHBvaW50LnggPSBldmVudC5jbGllbnRYLCBwb2ludC55ID0gZXZlbnQuY2xpZW50WTtcbiAgICBwb2ludCA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShub2RlLmdldFNjcmVlbkNUTSgpLmludmVyc2UoKSk7XG4gICAgcmV0dXJuIFtwb2ludC54LCBwb2ludC55XTtcbiAgfVxuXG4gIHZhciByZWN0ID0gbm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgcmV0dXJuIFtldmVudC5jbGllbnRYIC0gcmVjdC5sZWZ0IC0gbm9kZS5jbGllbnRMZWZ0LCBldmVudC5jbGllbnRZIC0gcmVjdC50b3AgLSBub2RlLmNsaWVudFRvcF07XG59XG4iLCJpbXBvcnQgc291cmNlRXZlbnQgZnJvbSBcIi4vc291cmNlRXZlbnRcIjtcbmltcG9ydCBwb2ludCBmcm9tIFwiLi9wb2ludFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihub2RlKSB7XG4gIHZhciBldmVudCA9IHNvdXJjZUV2ZW50KCk7XG4gIGlmIChldmVudC5jaGFuZ2VkVG91Y2hlcykgZXZlbnQgPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXTtcbiAgcmV0dXJuIHBvaW50KG5vZGUsIGV2ZW50KTtcbn1cbiIsImltcG9ydCB7ZXZlbnR9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcHJvcGFnYXRpb24oKSB7XG4gIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG59XG4iLCJpbXBvcnQge3NlbGVjdH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IG5vZXZlbnQgZnJvbSBcIi4vbm9ldmVudFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2aWV3KSB7XG4gIHZhciByb290ID0gdmlldy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gICAgICBzZWxlY3Rpb24gPSBzZWxlY3Qodmlldykub24oXCJkcmFnc3RhcnQuZHJhZ1wiLCBub2V2ZW50LCB0cnVlKTtcbiAgaWYgKFwib25zZWxlY3RzdGFydFwiIGluIHJvb3QpIHtcbiAgICBzZWxlY3Rpb24ub24oXCJzZWxlY3RzdGFydC5kcmFnXCIsIG5vZXZlbnQsIHRydWUpO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuX19ub3NlbGVjdCA9IHJvb3Quc3R5bGUuTW96VXNlclNlbGVjdDtcbiAgICByb290LnN0eWxlLk1velVzZXJTZWxlY3QgPSBcIm5vbmVcIjtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24geWVzZHJhZyh2aWV3LCBub2NsaWNrKSB7XG4gIHZhciByb290ID0gdmlldy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gICAgICBzZWxlY3Rpb24gPSBzZWxlY3Qodmlldykub24oXCJkcmFnc3RhcnQuZHJhZ1wiLCBudWxsKTtcbiAgaWYgKG5vY2xpY2spIHtcbiAgICBzZWxlY3Rpb24ub24oXCJjbGljay5kcmFnXCIsIG5vZXZlbnQsIHRydWUpO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHNlbGVjdGlvbi5vbihcImNsaWNrLmRyYWdcIiwgbnVsbCk7IH0sIDApO1xuICB9XG4gIGlmIChcIm9uc2VsZWN0c3RhcnRcIiBpbiByb290KSB7XG4gICAgc2VsZWN0aW9uLm9uKFwic2VsZWN0c3RhcnQuZHJhZ1wiLCBudWxsKTtcbiAgfSBlbHNlIHtcbiAgICByb290LnN0eWxlLk1velVzZXJTZWxlY3QgPSByb290Ll9fbm9zZWxlY3Q7XG4gICAgZGVsZXRlIHJvb3QuX19ub3NlbGVjdDtcbiAgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRHJhZ0V2ZW50KHRhcmdldCwgdHlwZSwgc3ViamVjdCwgaWQsIGFjdGl2ZSwgeCwgeSwgZHgsIGR5LCBkaXNwYXRjaCkge1xuICB0aGlzLnRhcmdldCA9IHRhcmdldDtcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy5zdWJqZWN0ID0gc3ViamVjdDtcbiAgdGhpcy5pZGVudGlmaWVyID0gaWQ7XG4gIHRoaXMuYWN0aXZlID0gYWN0aXZlO1xuICB0aGlzLnggPSB4O1xuICB0aGlzLnkgPSB5O1xuICB0aGlzLmR4ID0gZHg7XG4gIHRoaXMuZHkgPSBkeTtcbiAgdGhpcy5fID0gZGlzcGF0Y2g7XG59XG5cbkRyYWdFdmVudC5wcm90b3R5cGUub24gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHZhbHVlID0gdGhpcy5fLm9uLmFwcGx5KHRoaXMuXywgYXJndW1lbnRzKTtcbiAgcmV0dXJuIHZhbHVlID09PSB0aGlzLl8gPyB0aGlzIDogdmFsdWU7XG59O1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29uc3RydWN0b3IsIGZhY3RvcnksIHByb3RvdHlwZSkge1xuICBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBmYWN0b3J5LnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgcHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY29uc3RydWN0b3I7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmQocGFyZW50LCBkZWZpbml0aW9uKSB7XG4gIHZhciBwcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUpO1xuICBmb3IgKHZhciBrZXkgaW4gZGVmaW5pdGlvbikgcHJvdG90eXBlW2tleV0gPSBkZWZpbml0aW9uW2tleV07XG4gIHJldHVybiBwcm90b3R5cGU7XG59XG4iLCJpbXBvcnQgZGVmaW5lLCB7ZXh0ZW5kfSBmcm9tIFwiLi9kZWZpbmVcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIENvbG9yKCkge31cblxuZXhwb3J0IHZhciBkYXJrZXIgPSAwLjc7XG5leHBvcnQgdmFyIGJyaWdodGVyID0gMSAvIGRhcmtlcjtcblxudmFyIHJlSSA9IFwiXFxcXHMqKFsrLV0/XFxcXGQrKVxcXFxzKlwiLFxuICAgIHJlTiA9IFwiXFxcXHMqKFsrLV0/XFxcXGQqXFxcXC4/XFxcXGQrKD86W2VFXVsrLV0/XFxcXGQrKT8pXFxcXHMqXCIsXG4gICAgcmVQID0gXCJcXFxccyooWystXT9cXFxcZCpcXFxcLj9cXFxcZCsoPzpbZUVdWystXT9cXFxcZCspPyklXFxcXHMqXCIsXG4gICAgcmVIZXgzID0gL14jKFswLTlhLWZdezN9KSQvLFxuICAgIHJlSGV4NiA9IC9eIyhbMC05YS1mXXs2fSkkLyxcbiAgICByZVJnYkludGVnZXIgPSBuZXcgUmVnRXhwKFwiXnJnYlxcXFwoXCIgKyBbcmVJLCByZUksIHJlSV0gKyBcIlxcXFwpJFwiKSxcbiAgICByZVJnYlBlcmNlbnQgPSBuZXcgUmVnRXhwKFwiXnJnYlxcXFwoXCIgKyBbcmVQLCByZVAsIHJlUF0gKyBcIlxcXFwpJFwiKSxcbiAgICByZVJnYmFJbnRlZ2VyID0gbmV3IFJlZ0V4cChcIl5yZ2JhXFxcXChcIiArIFtyZUksIHJlSSwgcmVJLCByZU5dICsgXCJcXFxcKSRcIiksXG4gICAgcmVSZ2JhUGVyY2VudCA9IG5ldyBSZWdFeHAoXCJecmdiYVxcXFwoXCIgKyBbcmVQLCByZVAsIHJlUCwgcmVOXSArIFwiXFxcXCkkXCIpLFxuICAgIHJlSHNsUGVyY2VudCA9IG5ldyBSZWdFeHAoXCJeaHNsXFxcXChcIiArIFtyZU4sIHJlUCwgcmVQXSArIFwiXFxcXCkkXCIpLFxuICAgIHJlSHNsYVBlcmNlbnQgPSBuZXcgUmVnRXhwKFwiXmhzbGFcXFxcKFwiICsgW3JlTiwgcmVQLCByZVAsIHJlTl0gKyBcIlxcXFwpJFwiKTtcblxudmFyIG5hbWVkID0ge1xuICBhbGljZWJsdWU6IDB4ZjBmOGZmLFxuICBhbnRpcXVld2hpdGU6IDB4ZmFlYmQ3LFxuICBhcXVhOiAweDAwZmZmZixcbiAgYXF1YW1hcmluZTogMHg3ZmZmZDQsXG4gIGF6dXJlOiAweGYwZmZmZixcbiAgYmVpZ2U6IDB4ZjVmNWRjLFxuICBiaXNxdWU6IDB4ZmZlNGM0LFxuICBibGFjazogMHgwMDAwMDAsXG4gIGJsYW5jaGVkYWxtb25kOiAweGZmZWJjZCxcbiAgYmx1ZTogMHgwMDAwZmYsXG4gIGJsdWV2aW9sZXQ6IDB4OGEyYmUyLFxuICBicm93bjogMHhhNTJhMmEsXG4gIGJ1cmx5d29vZDogMHhkZWI4ODcsXG4gIGNhZGV0Ymx1ZTogMHg1ZjllYTAsXG4gIGNoYXJ0cmV1c2U6IDB4N2ZmZjAwLFxuICBjaG9jb2xhdGU6IDB4ZDI2OTFlLFxuICBjb3JhbDogMHhmZjdmNTAsXG4gIGNvcm5mbG93ZXJibHVlOiAweDY0OTVlZCxcbiAgY29ybnNpbGs6IDB4ZmZmOGRjLFxuICBjcmltc29uOiAweGRjMTQzYyxcbiAgY3lhbjogMHgwMGZmZmYsXG4gIGRhcmtibHVlOiAweDAwMDA4YixcbiAgZGFya2N5YW46IDB4MDA4YjhiLFxuICBkYXJrZ29sZGVucm9kOiAweGI4ODYwYixcbiAgZGFya2dyYXk6IDB4YTlhOWE5LFxuICBkYXJrZ3JlZW46IDB4MDA2NDAwLFxuICBkYXJrZ3JleTogMHhhOWE5YTksXG4gIGRhcmtraGFraTogMHhiZGI3NmIsXG4gIGRhcmttYWdlbnRhOiAweDhiMDA4YixcbiAgZGFya29saXZlZ3JlZW46IDB4NTU2YjJmLFxuICBkYXJrb3JhbmdlOiAweGZmOGMwMCxcbiAgZGFya29yY2hpZDogMHg5OTMyY2MsXG4gIGRhcmtyZWQ6IDB4OGIwMDAwLFxuICBkYXJrc2FsbW9uOiAweGU5OTY3YSxcbiAgZGFya3NlYWdyZWVuOiAweDhmYmM4ZixcbiAgZGFya3NsYXRlYmx1ZTogMHg0ODNkOGIsXG4gIGRhcmtzbGF0ZWdyYXk6IDB4MmY0ZjRmLFxuICBkYXJrc2xhdGVncmV5OiAweDJmNGY0ZixcbiAgZGFya3R1cnF1b2lzZTogMHgwMGNlZDEsXG4gIGRhcmt2aW9sZXQ6IDB4OTQwMGQzLFxuICBkZWVwcGluazogMHhmZjE0OTMsXG4gIGRlZXBza3libHVlOiAweDAwYmZmZixcbiAgZGltZ3JheTogMHg2OTY5NjksXG4gIGRpbWdyZXk6IDB4Njk2OTY5LFxuICBkb2RnZXJibHVlOiAweDFlOTBmZixcbiAgZmlyZWJyaWNrOiAweGIyMjIyMixcbiAgZmxvcmFsd2hpdGU6IDB4ZmZmYWYwLFxuICBmb3Jlc3RncmVlbjogMHgyMjhiMjIsXG4gIGZ1Y2hzaWE6IDB4ZmYwMGZmLFxuICBnYWluc2Jvcm86IDB4ZGNkY2RjLFxuICBnaG9zdHdoaXRlOiAweGY4ZjhmZixcbiAgZ29sZDogMHhmZmQ3MDAsXG4gIGdvbGRlbnJvZDogMHhkYWE1MjAsXG4gIGdyYXk6IDB4ODA4MDgwLFxuICBncmVlbjogMHgwMDgwMDAsXG4gIGdyZWVueWVsbG93OiAweGFkZmYyZixcbiAgZ3JleTogMHg4MDgwODAsXG4gIGhvbmV5ZGV3OiAweGYwZmZmMCxcbiAgaG90cGluazogMHhmZjY5YjQsXG4gIGluZGlhbnJlZDogMHhjZDVjNWMsXG4gIGluZGlnbzogMHg0YjAwODIsXG4gIGl2b3J5OiAweGZmZmZmMCxcbiAga2hha2k6IDB4ZjBlNjhjLFxuICBsYXZlbmRlcjogMHhlNmU2ZmEsXG4gIGxhdmVuZGVyYmx1c2g6IDB4ZmZmMGY1LFxuICBsYXduZ3JlZW46IDB4N2NmYzAwLFxuICBsZW1vbmNoaWZmb246IDB4ZmZmYWNkLFxuICBsaWdodGJsdWU6IDB4YWRkOGU2LFxuICBsaWdodGNvcmFsOiAweGYwODA4MCxcbiAgbGlnaHRjeWFuOiAweGUwZmZmZixcbiAgbGlnaHRnb2xkZW5yb2R5ZWxsb3c6IDB4ZmFmYWQyLFxuICBsaWdodGdyYXk6IDB4ZDNkM2QzLFxuICBsaWdodGdyZWVuOiAweDkwZWU5MCxcbiAgbGlnaHRncmV5OiAweGQzZDNkMyxcbiAgbGlnaHRwaW5rOiAweGZmYjZjMSxcbiAgbGlnaHRzYWxtb246IDB4ZmZhMDdhLFxuICBsaWdodHNlYWdyZWVuOiAweDIwYjJhYSxcbiAgbGlnaHRza3libHVlOiAweDg3Y2VmYSxcbiAgbGlnaHRzbGF0ZWdyYXk6IDB4Nzc4ODk5LFxuICBsaWdodHNsYXRlZ3JleTogMHg3Nzg4OTksXG4gIGxpZ2h0c3RlZWxibHVlOiAweGIwYzRkZSxcbiAgbGlnaHR5ZWxsb3c6IDB4ZmZmZmUwLFxuICBsaW1lOiAweDAwZmYwMCxcbiAgbGltZWdyZWVuOiAweDMyY2QzMixcbiAgbGluZW46IDB4ZmFmMGU2LFxuICBtYWdlbnRhOiAweGZmMDBmZixcbiAgbWFyb29uOiAweDgwMDAwMCxcbiAgbWVkaXVtYXF1YW1hcmluZTogMHg2NmNkYWEsXG4gIG1lZGl1bWJsdWU6IDB4MDAwMGNkLFxuICBtZWRpdW1vcmNoaWQ6IDB4YmE1NWQzLFxuICBtZWRpdW1wdXJwbGU6IDB4OTM3MGRiLFxuICBtZWRpdW1zZWFncmVlbjogMHgzY2IzNzEsXG4gIG1lZGl1bXNsYXRlYmx1ZTogMHg3YjY4ZWUsXG4gIG1lZGl1bXNwcmluZ2dyZWVuOiAweDAwZmE5YSxcbiAgbWVkaXVtdHVycXVvaXNlOiAweDQ4ZDFjYyxcbiAgbWVkaXVtdmlvbGV0cmVkOiAweGM3MTU4NSxcbiAgbWlkbmlnaHRibHVlOiAweDE5MTk3MCxcbiAgbWludGNyZWFtOiAweGY1ZmZmYSxcbiAgbWlzdHlyb3NlOiAweGZmZTRlMSxcbiAgbW9jY2FzaW46IDB4ZmZlNGI1LFxuICBuYXZham93aGl0ZTogMHhmZmRlYWQsXG4gIG5hdnk6IDB4MDAwMDgwLFxuICBvbGRsYWNlOiAweGZkZjVlNixcbiAgb2xpdmU6IDB4ODA4MDAwLFxuICBvbGl2ZWRyYWI6IDB4NmI4ZTIzLFxuICBvcmFuZ2U6IDB4ZmZhNTAwLFxuICBvcmFuZ2VyZWQ6IDB4ZmY0NTAwLFxuICBvcmNoaWQ6IDB4ZGE3MGQ2LFxuICBwYWxlZ29sZGVucm9kOiAweGVlZThhYSxcbiAgcGFsZWdyZWVuOiAweDk4ZmI5OCxcbiAgcGFsZXR1cnF1b2lzZTogMHhhZmVlZWUsXG4gIHBhbGV2aW9sZXRyZWQ6IDB4ZGI3MDkzLFxuICBwYXBheWF3aGlwOiAweGZmZWZkNSxcbiAgcGVhY2hwdWZmOiAweGZmZGFiOSxcbiAgcGVydTogMHhjZDg1M2YsXG4gIHBpbms6IDB4ZmZjMGNiLFxuICBwbHVtOiAweGRkYTBkZCxcbiAgcG93ZGVyYmx1ZTogMHhiMGUwZTYsXG4gIHB1cnBsZTogMHg4MDAwODAsXG4gIHJlYmVjY2FwdXJwbGU6IDB4NjYzMzk5LFxuICByZWQ6IDB4ZmYwMDAwLFxuICByb3N5YnJvd246IDB4YmM4ZjhmLFxuICByb3lhbGJsdWU6IDB4NDE2OWUxLFxuICBzYWRkbGVicm93bjogMHg4YjQ1MTMsXG4gIHNhbG1vbjogMHhmYTgwNzIsXG4gIHNhbmR5YnJvd246IDB4ZjRhNDYwLFxuICBzZWFncmVlbjogMHgyZThiNTcsXG4gIHNlYXNoZWxsOiAweGZmZjVlZSxcbiAgc2llbm5hOiAweGEwNTIyZCxcbiAgc2lsdmVyOiAweGMwYzBjMCxcbiAgc2t5Ymx1ZTogMHg4N2NlZWIsXG4gIHNsYXRlYmx1ZTogMHg2YTVhY2QsXG4gIHNsYXRlZ3JheTogMHg3MDgwOTAsXG4gIHNsYXRlZ3JleTogMHg3MDgwOTAsXG4gIHNub3c6IDB4ZmZmYWZhLFxuICBzcHJpbmdncmVlbjogMHgwMGZmN2YsXG4gIHN0ZWVsYmx1ZTogMHg0NjgyYjQsXG4gIHRhbjogMHhkMmI0OGMsXG4gIHRlYWw6IDB4MDA4MDgwLFxuICB0aGlzdGxlOiAweGQ4YmZkOCxcbiAgdG9tYXRvOiAweGZmNjM0NyxcbiAgdHVycXVvaXNlOiAweDQwZTBkMCxcbiAgdmlvbGV0OiAweGVlODJlZSxcbiAgd2hlYXQ6IDB4ZjVkZWIzLFxuICB3aGl0ZTogMHhmZmZmZmYsXG4gIHdoaXRlc21va2U6IDB4ZjVmNWY1LFxuICB5ZWxsb3c6IDB4ZmZmZjAwLFxuICB5ZWxsb3dncmVlbjogMHg5YWNkMzJcbn07XG5cbmRlZmluZShDb2xvciwgY29sb3IsIHtcbiAgZGlzcGxheWFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnJnYigpLmRpc3BsYXlhYmxlKCk7XG4gIH0sXG4gIGhleDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucmdiKCkuaGV4KCk7XG4gIH0sXG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5yZ2IoKSArIFwiXCI7XG4gIH1cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb2xvcihmb3JtYXQpIHtcbiAgdmFyIG07XG4gIGZvcm1hdCA9IChmb3JtYXQgKyBcIlwiKS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIChtID0gcmVIZXgzLmV4ZWMoZm9ybWF0KSkgPyAobSA9IHBhcnNlSW50KG1bMV0sIDE2KSwgbmV3IFJnYigobSA+PiA4ICYgMHhmKSB8IChtID4+IDQgJiAweDBmMCksIChtID4+IDQgJiAweGYpIHwgKG0gJiAweGYwKSwgKChtICYgMHhmKSA8PCA0KSB8IChtICYgMHhmKSwgMSkpIC8vICNmMDBcbiAgICAgIDogKG0gPSByZUhleDYuZXhlYyhmb3JtYXQpKSA/IHJnYm4ocGFyc2VJbnQobVsxXSwgMTYpKSAvLyAjZmYwMDAwXG4gICAgICA6IChtID0gcmVSZ2JJbnRlZ2VyLmV4ZWMoZm9ybWF0KSkgPyBuZXcgUmdiKG1bMV0sIG1bMl0sIG1bM10sIDEpIC8vIHJnYigyNTUsIDAsIDApXG4gICAgICA6IChtID0gcmVSZ2JQZXJjZW50LmV4ZWMoZm9ybWF0KSkgPyBuZXcgUmdiKG1bMV0gKiAyNTUgLyAxMDAsIG1bMl0gKiAyNTUgLyAxMDAsIG1bM10gKiAyNTUgLyAxMDAsIDEpIC8vIHJnYigxMDAlLCAwJSwgMCUpXG4gICAgICA6IChtID0gcmVSZ2JhSW50ZWdlci5leGVjKGZvcm1hdCkpID8gcmdiYShtWzFdLCBtWzJdLCBtWzNdLCBtWzRdKSAvLyByZ2JhKDI1NSwgMCwgMCwgMSlcbiAgICAgIDogKG0gPSByZVJnYmFQZXJjZW50LmV4ZWMoZm9ybWF0KSkgPyByZ2JhKG1bMV0gKiAyNTUgLyAxMDAsIG1bMl0gKiAyNTUgLyAxMDAsIG1bM10gKiAyNTUgLyAxMDAsIG1bNF0pIC8vIHJnYigxMDAlLCAwJSwgMCUsIDEpXG4gICAgICA6IChtID0gcmVIc2xQZXJjZW50LmV4ZWMoZm9ybWF0KSkgPyBoc2xhKG1bMV0sIG1bMl0gLyAxMDAsIG1bM10gLyAxMDAsIDEpIC8vIGhzbCgxMjAsIDUwJSwgNTAlKVxuICAgICAgOiAobSA9IHJlSHNsYVBlcmNlbnQuZXhlYyhmb3JtYXQpKSA/IGhzbGEobVsxXSwgbVsyXSAvIDEwMCwgbVszXSAvIDEwMCwgbVs0XSkgLy8gaHNsYSgxMjAsIDUwJSwgNTAlLCAxKVxuICAgICAgOiBuYW1lZC5oYXNPd25Qcm9wZXJ0eShmb3JtYXQpID8gcmdibihuYW1lZFtmb3JtYXRdKVxuICAgICAgOiBmb3JtYXQgPT09IFwidHJhbnNwYXJlbnRcIiA/IG5ldyBSZ2IoTmFOLCBOYU4sIE5hTiwgMClcbiAgICAgIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gcmdibihuKSB7XG4gIHJldHVybiBuZXcgUmdiKG4gPj4gMTYgJiAweGZmLCBuID4+IDggJiAweGZmLCBuICYgMHhmZiwgMSk7XG59XG5cbmZ1bmN0aW9uIHJnYmEociwgZywgYiwgYSkge1xuICBpZiAoYSA8PSAwKSByID0gZyA9IGIgPSBOYU47XG4gIHJldHVybiBuZXcgUmdiKHIsIGcsIGIsIGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmdiQ29udmVydChvKSB7XG4gIGlmICghKG8gaW5zdGFuY2VvZiBDb2xvcikpIG8gPSBjb2xvcihvKTtcbiAgaWYgKCFvKSByZXR1cm4gbmV3IFJnYjtcbiAgbyA9IG8ucmdiKCk7XG4gIHJldHVybiBuZXcgUmdiKG8uciwgby5nLCBvLmIsIG8ub3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZ2IociwgZywgYiwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IHJnYkNvbnZlcnQocikgOiBuZXcgUmdiKHIsIGcsIGIsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFJnYihyLCBnLCBiLCBvcGFjaXR5KSB7XG4gIHRoaXMuciA9ICtyO1xuICB0aGlzLmcgPSArZztcbiAgdGhpcy5iID0gK2I7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoUmdiLCByZ2IsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBicmlnaHRlciA6IE1hdGgucG93KGJyaWdodGVyLCBrKTtcbiAgICByZXR1cm4gbmV3IFJnYih0aGlzLnIgKiBrLCB0aGlzLmcgKiBrLCB0aGlzLmIgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICBkYXJrZXI6IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gZGFya2VyIDogTWF0aC5wb3coZGFya2VyLCBrKTtcbiAgICByZXR1cm4gbmV3IFJnYih0aGlzLnIgKiBrLCB0aGlzLmcgKiBrLCB0aGlzLmIgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICByZ2I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuICBkaXNwbGF5YWJsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICgwIDw9IHRoaXMuciAmJiB0aGlzLnIgPD0gMjU1KVxuICAgICAgICAmJiAoMCA8PSB0aGlzLmcgJiYgdGhpcy5nIDw9IDI1NSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5iICYmIHRoaXMuYiA8PSAyNTUpXG4gICAgICAgICYmICgwIDw9IHRoaXMub3BhY2l0eSAmJiB0aGlzLm9wYWNpdHkgPD0gMSk7XG4gIH0sXG4gIGhleDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFwiI1wiICsgaGV4KHRoaXMucikgKyBoZXgodGhpcy5nKSArIGhleCh0aGlzLmIpO1xuICB9LFxuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEgPSB0aGlzLm9wYWNpdHk7IGEgPSBpc05hTihhKSA/IDEgOiBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBhKSk7XG4gICAgcmV0dXJuIChhID09PSAxID8gXCJyZ2IoXCIgOiBcInJnYmEoXCIpXG4gICAgICAgICsgTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHRoaXMucikgfHwgMCkpICsgXCIsIFwiXG4gICAgICAgICsgTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHRoaXMuZykgfHwgMCkpICsgXCIsIFwiXG4gICAgICAgICsgTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHRoaXMuYikgfHwgMCkpXG4gICAgICAgICsgKGEgPT09IDEgPyBcIilcIiA6IFwiLCBcIiArIGEgKyBcIilcIik7XG4gIH1cbn0pKTtcblxuZnVuY3Rpb24gaGV4KHZhbHVlKSB7XG4gIHZhbHVlID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHZhbHVlKSB8fCAwKSk7XG4gIHJldHVybiAodmFsdWUgPCAxNiA/IFwiMFwiIDogXCJcIikgKyB2YWx1ZS50b1N0cmluZygxNik7XG59XG5cbmZ1bmN0aW9uIGhzbGEoaCwgcywgbCwgYSkge1xuICBpZiAoYSA8PSAwKSBoID0gcyA9IGwgPSBOYU47XG4gIGVsc2UgaWYgKGwgPD0gMCB8fCBsID49IDEpIGggPSBzID0gTmFOO1xuICBlbHNlIGlmIChzIDw9IDApIGggPSBOYU47XG4gIHJldHVybiBuZXcgSHNsKGgsIHMsIGwsIGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaHNsQ29udmVydChvKSB7XG4gIGlmIChvIGluc3RhbmNlb2YgSHNsKSByZXR1cm4gbmV3IEhzbChvLmgsIG8ucywgby5sLCBvLm9wYWNpdHkpO1xuICBpZiAoIShvIGluc3RhbmNlb2YgQ29sb3IpKSBvID0gY29sb3Iobyk7XG4gIGlmICghbykgcmV0dXJuIG5ldyBIc2w7XG4gIGlmIChvIGluc3RhbmNlb2YgSHNsKSByZXR1cm4gbztcbiAgbyA9IG8ucmdiKCk7XG4gIHZhciByID0gby5yIC8gMjU1LFxuICAgICAgZyA9IG8uZyAvIDI1NSxcbiAgICAgIGIgPSBvLmIgLyAyNTUsXG4gICAgICBtaW4gPSBNYXRoLm1pbihyLCBnLCBiKSxcbiAgICAgIG1heCA9IE1hdGgubWF4KHIsIGcsIGIpLFxuICAgICAgaCA9IE5hTixcbiAgICAgIHMgPSBtYXggLSBtaW4sXG4gICAgICBsID0gKG1heCArIG1pbikgLyAyO1xuICBpZiAocykge1xuICAgIGlmIChyID09PSBtYXgpIGggPSAoZyAtIGIpIC8gcyArIChnIDwgYikgKiA2O1xuICAgIGVsc2UgaWYgKGcgPT09IG1heCkgaCA9IChiIC0gcikgLyBzICsgMjtcbiAgICBlbHNlIGggPSAociAtIGcpIC8gcyArIDQ7XG4gICAgcyAvPSBsIDwgMC41ID8gbWF4ICsgbWluIDogMiAtIG1heCAtIG1pbjtcbiAgICBoICo9IDYwO1xuICB9IGVsc2Uge1xuICAgIHMgPSBsID4gMCAmJiBsIDwgMSA/IDAgOiBoO1xuICB9XG4gIHJldHVybiBuZXcgSHNsKGgsIHMsIGwsIG8ub3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoc2woaCwgcywgbCwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGhzbENvbnZlcnQoaCkgOiBuZXcgSHNsKGgsIHMsIGwsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZnVuY3Rpb24gSHNsKGgsIHMsIGwsIG9wYWNpdHkpIHtcbiAgdGhpcy5oID0gK2g7XG4gIHRoaXMucyA9ICtzO1xuICB0aGlzLmwgPSArbDtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShIc2wsIGhzbCwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGJyaWdodGVyIDogTWF0aC5wb3coYnJpZ2h0ZXIsIGspO1xuICAgIHJldHVybiBuZXcgSHNsKHRoaXMuaCwgdGhpcy5zLCB0aGlzLmwgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICBkYXJrZXI6IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gZGFya2VyIDogTWF0aC5wb3coZGFya2VyLCBrKTtcbiAgICByZXR1cm4gbmV3IEhzbCh0aGlzLmgsIHRoaXMucywgdGhpcy5sICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgcmdiOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgaCA9IHRoaXMuaCAlIDM2MCArICh0aGlzLmggPCAwKSAqIDM2MCxcbiAgICAgICAgcyA9IGlzTmFOKGgpIHx8IGlzTmFOKHRoaXMucykgPyAwIDogdGhpcy5zLFxuICAgICAgICBsID0gdGhpcy5sLFxuICAgICAgICBtMiA9IGwgKyAobCA8IDAuNSA/IGwgOiAxIC0gbCkgKiBzLFxuICAgICAgICBtMSA9IDIgKiBsIC0gbTI7XG4gICAgcmV0dXJuIG5ldyBSZ2IoXG4gICAgICBoc2wycmdiKGggPj0gMjQwID8gaCAtIDI0MCA6IGggKyAxMjAsIG0xLCBtMiksXG4gICAgICBoc2wycmdiKGgsIG0xLCBtMiksXG4gICAgICBoc2wycmdiKGggPCAxMjAgPyBoICsgMjQwIDogaCAtIDEyMCwgbTEsIG0yKSxcbiAgICAgIHRoaXMub3BhY2l0eVxuICAgICk7XG4gIH0sXG4gIGRpc3BsYXlhYmxlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKDAgPD0gdGhpcy5zICYmIHRoaXMucyA8PSAxIHx8IGlzTmFOKHRoaXMucykpXG4gICAgICAgICYmICgwIDw9IHRoaXMubCAmJiB0aGlzLmwgPD0gMSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5vcGFjaXR5ICYmIHRoaXMub3BhY2l0eSA8PSAxKTtcbiAgfVxufSkpO1xuXG4vKiBGcm9tIEZ2RCAxMy4zNywgQ1NTIENvbG9yIE1vZHVsZSBMZXZlbCAzICovXG5mdW5jdGlvbiBoc2wycmdiKGgsIG0xLCBtMikge1xuICByZXR1cm4gKGggPCA2MCA/IG0xICsgKG0yIC0gbTEpICogaCAvIDYwXG4gICAgICA6IGggPCAxODAgPyBtMlxuICAgICAgOiBoIDwgMjQwID8gbTEgKyAobTIgLSBtMSkgKiAoMjQwIC0gaCkgLyA2MFxuICAgICAgOiBtMSkgKiAyNTU7XG59XG4iLCJleHBvcnQgdmFyIGRlZzJyYWQgPSBNYXRoLlBJIC8gMTgwO1xuZXhwb3J0IHZhciByYWQyZGVnID0gMTgwIC8gTWF0aC5QSTtcbiIsImltcG9ydCBkZWZpbmUsIHtleHRlbmR9IGZyb20gXCIuL2RlZmluZVwiO1xuaW1wb3J0IHtDb2xvciwgcmdiQ29udmVydCwgUmdifSBmcm9tIFwiLi9jb2xvclwiO1xuaW1wb3J0IHtkZWcycmFkLCByYWQyZGVnfSBmcm9tIFwiLi9tYXRoXCI7XG5cbi8vIGh0dHBzOi8vYmV0YS5vYnNlcnZhYmxlaHEuY29tL0BtYm9zdG9jay9sYWItYW5kLXJnYlxudmFyIEsgPSAxOCxcbiAgICBYbiA9IDAuOTY0MjIsXG4gICAgWW4gPSAxLFxuICAgIFpuID0gMC44MjUyMSxcbiAgICB0MCA9IDQgLyAyOSxcbiAgICB0MSA9IDYgLyAyOSxcbiAgICB0MiA9IDMgKiB0MSAqIHQxLFxuICAgIHQzID0gdDEgKiB0MSAqIHQxO1xuXG5mdW5jdGlvbiBsYWJDb252ZXJ0KG8pIHtcbiAgaWYgKG8gaW5zdGFuY2VvZiBMYWIpIHJldHVybiBuZXcgTGFiKG8ubCwgby5hLCBvLmIsIG8ub3BhY2l0eSk7XG4gIGlmIChvIGluc3RhbmNlb2YgSGNsKSB7XG4gICAgaWYgKGlzTmFOKG8uaCkpIHJldHVybiBuZXcgTGFiKG8ubCwgMCwgMCwgby5vcGFjaXR5KTtcbiAgICB2YXIgaCA9IG8uaCAqIGRlZzJyYWQ7XG4gICAgcmV0dXJuIG5ldyBMYWIoby5sLCBNYXRoLmNvcyhoKSAqIG8uYywgTWF0aC5zaW4oaCkgKiBvLmMsIG8ub3BhY2l0eSk7XG4gIH1cbiAgaWYgKCEobyBpbnN0YW5jZW9mIFJnYikpIG8gPSByZ2JDb252ZXJ0KG8pO1xuICB2YXIgciA9IHJnYjJscmdiKG8uciksXG4gICAgICBnID0gcmdiMmxyZ2Ioby5nKSxcbiAgICAgIGIgPSByZ2IybHJnYihvLmIpLFxuICAgICAgeSA9IHh5ejJsYWIoKDAuMjIyNTA0NSAqIHIgKyAwLjcxNjg3ODYgKiBnICsgMC4wNjA2MTY5ICogYikgLyBZbiksIHgsIHo7XG4gIGlmIChyID09PSBnICYmIGcgPT09IGIpIHggPSB6ID0geTsgZWxzZSB7XG4gICAgeCA9IHh5ejJsYWIoKDAuNDM2MDc0NyAqIHIgKyAwLjM4NTA2NDkgKiBnICsgMC4xNDMwODA0ICogYikgLyBYbik7XG4gICAgeiA9IHh5ejJsYWIoKDAuMDEzOTMyMiAqIHIgKyAwLjA5NzEwNDUgKiBnICsgMC43MTQxNzMzICogYikgLyBabik7XG4gIH1cbiAgcmV0dXJuIG5ldyBMYWIoMTE2ICogeSAtIDE2LCA1MDAgKiAoeCAtIHkpLCAyMDAgKiAoeSAtIHopLCBvLm9wYWNpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ3JheShsLCBvcGFjaXR5KSB7XG4gIHJldHVybiBuZXcgTGFiKGwsIDAsIDAsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbGFiKGwsIGEsIGIsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBsYWJDb252ZXJ0KGwpIDogbmV3IExhYihsLCBhLCBiLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBMYWIobCwgYSwgYiwgb3BhY2l0eSkge1xuICB0aGlzLmwgPSArbDtcbiAgdGhpcy5hID0gK2E7XG4gIHRoaXMuYiA9ICtiO1xuICB0aGlzLm9wYWNpdHkgPSArb3BhY2l0eTtcbn1cblxuZGVmaW5lKExhYiwgbGFiLCBleHRlbmQoQ29sb3IsIHtcbiAgYnJpZ2h0ZXI6IGZ1bmN0aW9uKGspIHtcbiAgICByZXR1cm4gbmV3IExhYih0aGlzLmwgKyBLICogKGsgPT0gbnVsbCA/IDEgOiBrKSwgdGhpcy5hLCB0aGlzLmIsIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcjogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBuZXcgTGFiKHRoaXMubCAtIEsgKiAoayA9PSBudWxsID8gMSA6IGspLCB0aGlzLmEsIHRoaXMuYiwgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgcmdiOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgeSA9ICh0aGlzLmwgKyAxNikgLyAxMTYsXG4gICAgICAgIHggPSBpc05hTih0aGlzLmEpID8geSA6IHkgKyB0aGlzLmEgLyA1MDAsXG4gICAgICAgIHogPSBpc05hTih0aGlzLmIpID8geSA6IHkgLSB0aGlzLmIgLyAyMDA7XG4gICAgeCA9IFhuICogbGFiMnh5eih4KTtcbiAgICB5ID0gWW4gKiBsYWIyeHl6KHkpO1xuICAgIHogPSBabiAqIGxhYjJ4eXooeik7XG4gICAgcmV0dXJuIG5ldyBSZ2IoXG4gICAgICBscmdiMnJnYiggMy4xMzM4NTYxICogeCAtIDEuNjE2ODY2NyAqIHkgLSAwLjQ5MDYxNDYgKiB6KSxcbiAgICAgIGxyZ2IycmdiKC0wLjk3ODc2ODQgKiB4ICsgMS45MTYxNDE1ICogeSArIDAuMDMzNDU0MCAqIHopLFxuICAgICAgbHJnYjJyZ2IoIDAuMDcxOTQ1MyAqIHggLSAwLjIyODk5MTQgKiB5ICsgMS40MDUyNDI3ICogeiksXG4gICAgICB0aGlzLm9wYWNpdHlcbiAgICApO1xuICB9XG59KSk7XG5cbmZ1bmN0aW9uIHh5ejJsYWIodCkge1xuICByZXR1cm4gdCA+IHQzID8gTWF0aC5wb3codCwgMSAvIDMpIDogdCAvIHQyICsgdDA7XG59XG5cbmZ1bmN0aW9uIGxhYjJ4eXoodCkge1xuICByZXR1cm4gdCA+IHQxID8gdCAqIHQgKiB0IDogdDIgKiAodCAtIHQwKTtcbn1cblxuZnVuY3Rpb24gbHJnYjJyZ2IoeCkge1xuICByZXR1cm4gMjU1ICogKHggPD0gMC4wMDMxMzA4ID8gMTIuOTIgKiB4IDogMS4wNTUgKiBNYXRoLnBvdyh4LCAxIC8gMi40KSAtIDAuMDU1KTtcbn1cblxuZnVuY3Rpb24gcmdiMmxyZ2IoeCkge1xuICByZXR1cm4gKHggLz0gMjU1KSA8PSAwLjA0MDQ1ID8geCAvIDEyLjkyIDogTWF0aC5wb3coKHggKyAwLjA1NSkgLyAxLjA1NSwgMi40KTtcbn1cblxuZnVuY3Rpb24gaGNsQ29udmVydChvKSB7XG4gIGlmIChvIGluc3RhbmNlb2YgSGNsKSByZXR1cm4gbmV3IEhjbChvLmgsIG8uYywgby5sLCBvLm9wYWNpdHkpO1xuICBpZiAoIShvIGluc3RhbmNlb2YgTGFiKSkgbyA9IGxhYkNvbnZlcnQobyk7XG4gIGlmIChvLmEgPT09IDAgJiYgby5iID09PSAwKSByZXR1cm4gbmV3IEhjbChOYU4sIDAsIG8ubCwgby5vcGFjaXR5KTtcbiAgdmFyIGggPSBNYXRoLmF0YW4yKG8uYiwgby5hKSAqIHJhZDJkZWc7XG4gIHJldHVybiBuZXcgSGNsKGggPCAwID8gaCArIDM2MCA6IGgsIE1hdGguc3FydChvLmEgKiBvLmEgKyBvLmIgKiBvLmIpLCBvLmwsIG8ub3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsY2gobCwgYywgaCwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGhjbENvbnZlcnQobCkgOiBuZXcgSGNsKGgsIGMsIGwsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhjbChoLCBjLCBsLCBvcGFjaXR5KSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gaGNsQ29udmVydChoKSA6IG5ldyBIY2woaCwgYywgbCwgb3BhY2l0eSA9PSBudWxsID8gMSA6IG9wYWNpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gSGNsKGgsIGMsIGwsIG9wYWNpdHkpIHtcbiAgdGhpcy5oID0gK2g7XG4gIHRoaXMuYyA9ICtjO1xuICB0aGlzLmwgPSArbDtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShIY2wsIGhjbCwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyOiBmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIG5ldyBIY2wodGhpcy5oLCB0aGlzLmMsIHRoaXMubCArIEsgKiAoayA9PSBudWxsID8gMSA6IGspLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICBkYXJrZXI6IGZ1bmN0aW9uKGspIHtcbiAgICByZXR1cm4gbmV3IEhjbCh0aGlzLmgsIHRoaXMuYywgdGhpcy5sIC0gSyAqIChrID09IG51bGwgPyAxIDogayksIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGxhYkNvbnZlcnQodGhpcykucmdiKCk7XG4gIH1cbn0pKTtcbiIsImltcG9ydCBkZWZpbmUsIHtleHRlbmR9IGZyb20gXCIuL2RlZmluZVwiO1xuaW1wb3J0IHtDb2xvciwgcmdiQ29udmVydCwgUmdiLCBkYXJrZXIsIGJyaWdodGVyfSBmcm9tIFwiLi9jb2xvclwiO1xuaW1wb3J0IHtkZWcycmFkLCByYWQyZGVnfSBmcm9tIFwiLi9tYXRoXCI7XG5cbnZhciBBID0gLTAuMTQ4NjEsXG4gICAgQiA9ICsxLjc4Mjc3LFxuICAgIEMgPSAtMC4yOTIyNyxcbiAgICBEID0gLTAuOTA2NDksXG4gICAgRSA9ICsxLjk3Mjk0LFxuICAgIEVEID0gRSAqIEQsXG4gICAgRUIgPSBFICogQixcbiAgICBCQ19EQSA9IEIgKiBDIC0gRCAqIEE7XG5cbmZ1bmN0aW9uIGN1YmVoZWxpeENvbnZlcnQobykge1xuICBpZiAobyBpbnN0YW5jZW9mIEN1YmVoZWxpeCkgcmV0dXJuIG5ldyBDdWJlaGVsaXgoby5oLCBvLnMsIG8ubCwgby5vcGFjaXR5KTtcbiAgaWYgKCEobyBpbnN0YW5jZW9mIFJnYikpIG8gPSByZ2JDb252ZXJ0KG8pO1xuICB2YXIgciA9IG8uciAvIDI1NSxcbiAgICAgIGcgPSBvLmcgLyAyNTUsXG4gICAgICBiID0gby5iIC8gMjU1LFxuICAgICAgbCA9IChCQ19EQSAqIGIgKyBFRCAqIHIgLSBFQiAqIGcpIC8gKEJDX0RBICsgRUQgLSBFQiksXG4gICAgICBibCA9IGIgLSBsLFxuICAgICAgayA9IChFICogKGcgLSBsKSAtIEMgKiBibCkgLyBELFxuICAgICAgcyA9IE1hdGguc3FydChrICogayArIGJsICogYmwpIC8gKEUgKiBsICogKDEgLSBsKSksIC8vIE5hTiBpZiBsPTAgb3IgbD0xXG4gICAgICBoID0gcyA/IE1hdGguYXRhbjIoaywgYmwpICogcmFkMmRlZyAtIDEyMCA6IE5hTjtcbiAgcmV0dXJuIG5ldyBDdWJlaGVsaXgoaCA8IDAgPyBoICsgMzYwIDogaCwgcywgbCwgby5vcGFjaXR5KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3ViZWhlbGl4KGgsIHMsIGwsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBjdWJlaGVsaXhDb252ZXJ0KGgpIDogbmV3IEN1YmVoZWxpeChoLCBzLCBsLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBDdWJlaGVsaXgoaCwgcywgbCwgb3BhY2l0eSkge1xuICB0aGlzLmggPSAraDtcbiAgdGhpcy5zID0gK3M7XG4gIHRoaXMubCA9ICtsO1xuICB0aGlzLm9wYWNpdHkgPSArb3BhY2l0eTtcbn1cblxuZGVmaW5lKEN1YmVoZWxpeCwgY3ViZWhlbGl4LCBleHRlbmQoQ29sb3IsIHtcbiAgYnJpZ2h0ZXI6IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gYnJpZ2h0ZXIgOiBNYXRoLnBvdyhicmlnaHRlciwgayk7XG4gICAgcmV0dXJuIG5ldyBDdWJlaGVsaXgodGhpcy5oLCB0aGlzLnMsIHRoaXMubCAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBkYXJrZXIgOiBNYXRoLnBvdyhkYXJrZXIsIGspO1xuICAgIHJldHVybiBuZXcgQ3ViZWhlbGl4KHRoaXMuaCwgdGhpcy5zLCB0aGlzLmwgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICByZ2I6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBoID0gaXNOYU4odGhpcy5oKSA/IDAgOiAodGhpcy5oICsgMTIwKSAqIGRlZzJyYWQsXG4gICAgICAgIGwgPSArdGhpcy5sLFxuICAgICAgICBhID0gaXNOYU4odGhpcy5zKSA/IDAgOiB0aGlzLnMgKiBsICogKDEgLSBsKSxcbiAgICAgICAgY29zaCA9IE1hdGguY29zKGgpLFxuICAgICAgICBzaW5oID0gTWF0aC5zaW4oaCk7XG4gICAgcmV0dXJuIG5ldyBSZ2IoXG4gICAgICAyNTUgKiAobCArIGEgKiAoQSAqIGNvc2ggKyBCICogc2luaCkpLFxuICAgICAgMjU1ICogKGwgKyBhICogKEMgKiBjb3NoICsgRCAqIHNpbmgpKSxcbiAgICAgIDI1NSAqIChsICsgYSAqIChFICogY29zaCkpLFxuICAgICAgdGhpcy5vcGFjaXR5XG4gICAgKTtcbiAgfVxufSkpO1xuIiwiZXhwb3J0IGZ1bmN0aW9uIGJhc2lzKHQxLCB2MCwgdjEsIHYyLCB2Mykge1xuICB2YXIgdDIgPSB0MSAqIHQxLCB0MyA9IHQyICogdDE7XG4gIHJldHVybiAoKDEgLSAzICogdDEgKyAzICogdDIgLSB0MykgKiB2MFxuICAgICAgKyAoNCAtIDYgKiB0MiArIDMgKiB0MykgKiB2MVxuICAgICAgKyAoMSArIDMgKiB0MSArIDMgKiB0MiAtIDMgKiB0MykgKiB2MlxuICAgICAgKyB0MyAqIHYzKSAvIDY7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlcykge1xuICB2YXIgbiA9IHZhbHVlcy5sZW5ndGggLSAxO1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIHZhciBpID0gdCA8PSAwID8gKHQgPSAwKSA6IHQgPj0gMSA/ICh0ID0gMSwgbiAtIDEpIDogTWF0aC5mbG9vcih0ICogbiksXG4gICAgICAgIHYxID0gdmFsdWVzW2ldLFxuICAgICAgICB2MiA9IHZhbHVlc1tpICsgMV0sXG4gICAgICAgIHYwID0gaSA+IDAgPyB2YWx1ZXNbaSAtIDFdIDogMiAqIHYxIC0gdjIsXG4gICAgICAgIHYzID0gaSA8IG4gLSAxID8gdmFsdWVzW2kgKyAyXSA6IDIgKiB2MiAtIHYxO1xuICAgIHJldHVybiBiYXNpcygodCAtIGkgLyBuKSAqIG4sIHYwLCB2MSwgdjIsIHYzKTtcbiAgfTtcbn1cbiIsImltcG9ydCB7YmFzaXN9IGZyb20gXCIuL2Jhc2lzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlcykge1xuICB2YXIgbiA9IHZhbHVlcy5sZW5ndGg7XG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgdmFyIGkgPSBNYXRoLmZsb29yKCgodCAlPSAxKSA8IDAgPyArK3QgOiB0KSAqIG4pLFxuICAgICAgICB2MCA9IHZhbHVlc1soaSArIG4gLSAxKSAlIG5dLFxuICAgICAgICB2MSA9IHZhbHVlc1tpICUgbl0sXG4gICAgICAgIHYyID0gdmFsdWVzWyhpICsgMSkgJSBuXSxcbiAgICAgICAgdjMgPSB2YWx1ZXNbKGkgKyAyKSAlIG5dO1xuICAgIHJldHVybiBiYXNpcygodCAtIGkgLyBuKSAqIG4sIHYwLCB2MSwgdjIsIHYzKTtcbiAgfTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB4O1xuICB9O1xufVxuIiwiaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuL2NvbnN0YW50XCI7XG5cbmZ1bmN0aW9uIGxpbmVhcihhLCBkKSB7XG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIGEgKyB0ICogZDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZXhwb25lbnRpYWwoYSwgYiwgeSkge1xuICByZXR1cm4gYSA9IE1hdGgucG93KGEsIHkpLCBiID0gTWF0aC5wb3coYiwgeSkgLSBhLCB5ID0gMSAvIHksIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gTWF0aC5wb3coYSArIHQgKiBiLCB5KTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGh1ZShhLCBiKSB7XG4gIHZhciBkID0gYiAtIGE7XG4gIHJldHVybiBkID8gbGluZWFyKGEsIGQgPiAxODAgfHwgZCA8IC0xODAgPyBkIC0gMzYwICogTWF0aC5yb3VuZChkIC8gMzYwKSA6IGQpIDogY29uc3RhbnQoaXNOYU4oYSkgPyBiIDogYSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnYW1tYSh5KSB7XG4gIHJldHVybiAoeSA9ICt5KSA9PT0gMSA/IG5vZ2FtbWEgOiBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGIgLSBhID8gZXhwb25lbnRpYWwoYSwgYiwgeSkgOiBjb25zdGFudChpc05hTihhKSA/IGIgOiBhKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbm9nYW1tYShhLCBiKSB7XG4gIHZhciBkID0gYiAtIGE7XG4gIHJldHVybiBkID8gbGluZWFyKGEsIGQpIDogY29uc3RhbnQoaXNOYU4oYSkgPyBiIDogYSk7XG59XG4iLCJpbXBvcnQge3JnYiBhcyBjb2xvclJnYn0gZnJvbSBcImQzLWNvbG9yXCI7XG5pbXBvcnQgYmFzaXMgZnJvbSBcIi4vYmFzaXNcIjtcbmltcG9ydCBiYXNpc0Nsb3NlZCBmcm9tIFwiLi9iYXNpc0Nsb3NlZFwiO1xuaW1wb3J0IG5vZ2FtbWEsIHtnYW1tYX0gZnJvbSBcIi4vY29sb3JcIjtcblxuZXhwb3J0IGRlZmF1bHQgKGZ1bmN0aW9uIHJnYkdhbW1hKHkpIHtcbiAgdmFyIGNvbG9yID0gZ2FtbWEoeSk7XG5cbiAgZnVuY3Rpb24gcmdiKHN0YXJ0LCBlbmQpIHtcbiAgICB2YXIgciA9IGNvbG9yKChzdGFydCA9IGNvbG9yUmdiKHN0YXJ0KSkuciwgKGVuZCA9IGNvbG9yUmdiKGVuZCkpLnIpLFxuICAgICAgICBnID0gY29sb3Ioc3RhcnQuZywgZW5kLmcpLFxuICAgICAgICBiID0gY29sb3Ioc3RhcnQuYiwgZW5kLmIpLFxuICAgICAgICBvcGFjaXR5ID0gbm9nYW1tYShzdGFydC5vcGFjaXR5LCBlbmQub3BhY2l0eSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIHN0YXJ0LnIgPSByKHQpO1xuICAgICAgc3RhcnQuZyA9IGcodCk7XG4gICAgICBzdGFydC5iID0gYih0KTtcbiAgICAgIHN0YXJ0Lm9wYWNpdHkgPSBvcGFjaXR5KHQpO1xuICAgICAgcmV0dXJuIHN0YXJ0ICsgXCJcIjtcbiAgICB9O1xuICB9XG5cbiAgcmdiLmdhbW1hID0gcmdiR2FtbWE7XG5cbiAgcmV0dXJuIHJnYjtcbn0pKDEpO1xuXG5mdW5jdGlvbiByZ2JTcGxpbmUoc3BsaW5lKSB7XG4gIHJldHVybiBmdW5jdGlvbihjb2xvcnMpIHtcbiAgICB2YXIgbiA9IGNvbG9ycy5sZW5ndGgsXG4gICAgICAgIHIgPSBuZXcgQXJyYXkobiksXG4gICAgICAgIGcgPSBuZXcgQXJyYXkobiksXG4gICAgICAgIGIgPSBuZXcgQXJyYXkobiksXG4gICAgICAgIGksIGNvbG9yO1xuICAgIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGNvbG9yID0gY29sb3JSZ2IoY29sb3JzW2ldKTtcbiAgICAgIHJbaV0gPSBjb2xvci5yIHx8IDA7XG4gICAgICBnW2ldID0gY29sb3IuZyB8fCAwO1xuICAgICAgYltpXSA9IGNvbG9yLmIgfHwgMDtcbiAgICB9XG4gICAgciA9IHNwbGluZShyKTtcbiAgICBnID0gc3BsaW5lKGcpO1xuICAgIGIgPSBzcGxpbmUoYik7XG4gICAgY29sb3Iub3BhY2l0eSA9IDE7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIGNvbG9yLnIgPSByKHQpO1xuICAgICAgY29sb3IuZyA9IGcodCk7XG4gICAgICBjb2xvci5iID0gYih0KTtcbiAgICAgIHJldHVybiBjb2xvciArIFwiXCI7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IHZhciByZ2JCYXNpcyA9IHJnYlNwbGluZShiYXNpcyk7XG5leHBvcnQgdmFyIHJnYkJhc2lzQ2xvc2VkID0gcmdiU3BsaW5lKGJhc2lzQ2xvc2VkKTtcbiIsImltcG9ydCB2YWx1ZSBmcm9tIFwiLi92YWx1ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciBuYiA9IGIgPyBiLmxlbmd0aCA6IDAsXG4gICAgICBuYSA9IGEgPyBNYXRoLm1pbihuYiwgYS5sZW5ndGgpIDogMCxcbiAgICAgIHggPSBuZXcgQXJyYXkobmEpLFxuICAgICAgYyA9IG5ldyBBcnJheShuYiksXG4gICAgICBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBuYTsgKytpKSB4W2ldID0gdmFsdWUoYVtpXSwgYltpXSk7XG4gIGZvciAoOyBpIDwgbmI7ICsraSkgY1tpXSA9IGJbaV07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbmE7ICsraSkgY1tpXSA9IHhbaV0odCk7XG4gICAgcmV0dXJuIGM7XG4gIH07XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciBkID0gbmV3IERhdGU7XG4gIHJldHVybiBhID0gK2EsIGIgLT0gYSwgZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBkLnNldFRpbWUoYSArIGIgKiB0KSwgZDtcbiAgfTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEgPSArYSwgYiAtPSBhLCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIGEgKyBiICogdDtcbiAgfTtcbn1cbiIsImltcG9ydCB2YWx1ZSBmcm9tIFwiLi92YWx1ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciBpID0ge30sXG4gICAgICBjID0ge30sXG4gICAgICBrO1xuXG4gIGlmIChhID09PSBudWxsIHx8IHR5cGVvZiBhICE9PSBcIm9iamVjdFwiKSBhID0ge307XG4gIGlmIChiID09PSBudWxsIHx8IHR5cGVvZiBiICE9PSBcIm9iamVjdFwiKSBiID0ge307XG5cbiAgZm9yIChrIGluIGIpIHtcbiAgICBpZiAoayBpbiBhKSB7XG4gICAgICBpW2tdID0gdmFsdWUoYVtrXSwgYltrXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNba10gPSBiW2tdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgZm9yIChrIGluIGkpIGNba10gPSBpW2tdKHQpO1xuICAgIHJldHVybiBjO1xuICB9O1xufVxuIiwiaW1wb3J0IG51bWJlciBmcm9tIFwiLi9udW1iZXJcIjtcblxudmFyIHJlQSA9IC9bLStdPyg/OlxcZCtcXC4/XFxkKnxcXC4/XFxkKykoPzpbZUVdWy0rXT9cXGQrKT8vZyxcbiAgICByZUIgPSBuZXcgUmVnRXhwKHJlQS5zb3VyY2UsIFwiZ1wiKTtcblxuZnVuY3Rpb24gemVybyhiKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYjtcbiAgfTtcbn1cblxuZnVuY3Rpb24gb25lKGIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gYih0KSArIFwiXCI7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGJpID0gcmVBLmxhc3RJbmRleCA9IHJlQi5sYXN0SW5kZXggPSAwLCAvLyBzY2FuIGluZGV4IGZvciBuZXh0IG51bWJlciBpbiBiXG4gICAgICBhbSwgLy8gY3VycmVudCBtYXRjaCBpbiBhXG4gICAgICBibSwgLy8gY3VycmVudCBtYXRjaCBpbiBiXG4gICAgICBicywgLy8gc3RyaW5nIHByZWNlZGluZyBjdXJyZW50IG51bWJlciBpbiBiLCBpZiBhbnlcbiAgICAgIGkgPSAtMSwgLy8gaW5kZXggaW4gc1xuICAgICAgcyA9IFtdLCAvLyBzdHJpbmcgY29uc3RhbnRzIGFuZCBwbGFjZWhvbGRlcnNcbiAgICAgIHEgPSBbXTsgLy8gbnVtYmVyIGludGVycG9sYXRvcnNcblxuICAvLyBDb2VyY2UgaW5wdXRzIHRvIHN0cmluZ3MuXG4gIGEgPSBhICsgXCJcIiwgYiA9IGIgKyBcIlwiO1xuXG4gIC8vIEludGVycG9sYXRlIHBhaXJzIG9mIG51bWJlcnMgaW4gYSAmIGIuXG4gIHdoaWxlICgoYW0gPSByZUEuZXhlYyhhKSlcbiAgICAgICYmIChibSA9IHJlQi5leGVjKGIpKSkge1xuICAgIGlmICgoYnMgPSBibS5pbmRleCkgPiBiaSkgeyAvLyBhIHN0cmluZyBwcmVjZWRlcyB0aGUgbmV4dCBudW1iZXIgaW4gYlxuICAgICAgYnMgPSBiLnNsaWNlKGJpLCBicyk7XG4gICAgICBpZiAoc1tpXSkgc1tpXSArPSBiczsgLy8gY29hbGVzY2Ugd2l0aCBwcmV2aW91cyBzdHJpbmdcbiAgICAgIGVsc2Ugc1srK2ldID0gYnM7XG4gICAgfVxuICAgIGlmICgoYW0gPSBhbVswXSkgPT09IChibSA9IGJtWzBdKSkgeyAvLyBudW1iZXJzIGluIGEgJiBiIG1hdGNoXG4gICAgICBpZiAoc1tpXSkgc1tpXSArPSBibTsgLy8gY29hbGVzY2Ugd2l0aCBwcmV2aW91cyBzdHJpbmdcbiAgICAgIGVsc2Ugc1srK2ldID0gYm07XG4gICAgfSBlbHNlIHsgLy8gaW50ZXJwb2xhdGUgbm9uLW1hdGNoaW5nIG51bWJlcnNcbiAgICAgIHNbKytpXSA9IG51bGw7XG4gICAgICBxLnB1c2goe2k6IGksIHg6IG51bWJlcihhbSwgYm0pfSk7XG4gICAgfVxuICAgIGJpID0gcmVCLmxhc3RJbmRleDtcbiAgfVxuXG4gIC8vIEFkZCByZW1haW5zIG9mIGIuXG4gIGlmIChiaSA8IGIubGVuZ3RoKSB7XG4gICAgYnMgPSBiLnNsaWNlKGJpKTtcbiAgICBpZiAoc1tpXSkgc1tpXSArPSBiczsgLy8gY29hbGVzY2Ugd2l0aCBwcmV2aW91cyBzdHJpbmdcbiAgICBlbHNlIHNbKytpXSA9IGJzO1xuICB9XG5cbiAgLy8gU3BlY2lhbCBvcHRpbWl6YXRpb24gZm9yIG9ubHkgYSBzaW5nbGUgbWF0Y2guXG4gIC8vIE90aGVyd2lzZSwgaW50ZXJwb2xhdGUgZWFjaCBvZiB0aGUgbnVtYmVycyBhbmQgcmVqb2luIHRoZSBzdHJpbmcuXG4gIHJldHVybiBzLmxlbmd0aCA8IDIgPyAocVswXVxuICAgICAgPyBvbmUocVswXS54KVxuICAgICAgOiB6ZXJvKGIpKVxuICAgICAgOiAoYiA9IHEubGVuZ3RoLCBmdW5jdGlvbih0KSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG87IGkgPCBiOyArK2kpIHNbKG8gPSBxW2ldKS5pXSA9IG8ueCh0KTtcbiAgICAgICAgICByZXR1cm4gcy5qb2luKFwiXCIpO1xuICAgICAgICB9KTtcbn1cbiIsImltcG9ydCB7Y29sb3J9IGZyb20gXCJkMy1jb2xvclwiO1xuaW1wb3J0IHJnYiBmcm9tIFwiLi9yZ2JcIjtcbmltcG9ydCBhcnJheSBmcm9tIFwiLi9hcnJheVwiO1xuaW1wb3J0IGRhdGUgZnJvbSBcIi4vZGF0ZVwiO1xuaW1wb3J0IG51bWJlciBmcm9tIFwiLi9udW1iZXJcIjtcbmltcG9ydCBvYmplY3QgZnJvbSBcIi4vb2JqZWN0XCI7XG5pbXBvcnQgc3RyaW5nIGZyb20gXCIuL3N0cmluZ1wiO1xuaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuL2NvbnN0YW50XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIHQgPSB0eXBlb2YgYiwgYztcbiAgcmV0dXJuIGIgPT0gbnVsbCB8fCB0ID09PSBcImJvb2xlYW5cIiA/IGNvbnN0YW50KGIpXG4gICAgICA6ICh0ID09PSBcIm51bWJlclwiID8gbnVtYmVyXG4gICAgICA6IHQgPT09IFwic3RyaW5nXCIgPyAoKGMgPSBjb2xvcihiKSkgPyAoYiA9IGMsIHJnYikgOiBzdHJpbmcpXG4gICAgICA6IGIgaW5zdGFuY2VvZiBjb2xvciA/IHJnYlxuICAgICAgOiBiIGluc3RhbmNlb2YgRGF0ZSA/IGRhdGVcbiAgICAgIDogQXJyYXkuaXNBcnJheShiKSA/IGFycmF5XG4gICAgICA6IHR5cGVvZiBiLnZhbHVlT2YgIT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgYi50b1N0cmluZyAhPT0gXCJmdW5jdGlvblwiIHx8IGlzTmFOKGIpID8gb2JqZWN0XG4gICAgICA6IG51bWJlcikoYSwgYik7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHJldHVybiBhID0gK2EsIGIgLT0gYSwgZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKGEgKyBiICogdCk7XG4gIH07XG59XG4iLCJ2YXIgZGVncmVlcyA9IDE4MCAvIE1hdGguUEk7XG5cbmV4cG9ydCB2YXIgaWRlbnRpdHkgPSB7XG4gIHRyYW5zbGF0ZVg6IDAsXG4gIHRyYW5zbGF0ZVk6IDAsXG4gIHJvdGF0ZTogMCxcbiAgc2tld1g6IDAsXG4gIHNjYWxlWDogMSxcbiAgc2NhbGVZOiAxXG59O1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIHZhciBzY2FsZVgsIHNjYWxlWSwgc2tld1g7XG4gIGlmIChzY2FsZVggPSBNYXRoLnNxcnQoYSAqIGEgKyBiICogYikpIGEgLz0gc2NhbGVYLCBiIC89IHNjYWxlWDtcbiAgaWYgKHNrZXdYID0gYSAqIGMgKyBiICogZCkgYyAtPSBhICogc2tld1gsIGQgLT0gYiAqIHNrZXdYO1xuICBpZiAoc2NhbGVZID0gTWF0aC5zcXJ0KGMgKiBjICsgZCAqIGQpKSBjIC89IHNjYWxlWSwgZCAvPSBzY2FsZVksIHNrZXdYIC89IHNjYWxlWTtcbiAgaWYgKGEgKiBkIDwgYiAqIGMpIGEgPSAtYSwgYiA9IC1iLCBza2V3WCA9IC1za2V3WCwgc2NhbGVYID0gLXNjYWxlWDtcbiAgcmV0dXJuIHtcbiAgICB0cmFuc2xhdGVYOiBlLFxuICAgIHRyYW5zbGF0ZVk6IGYsXG4gICAgcm90YXRlOiBNYXRoLmF0YW4yKGIsIGEpICogZGVncmVlcyxcbiAgICBza2V3WDogTWF0aC5hdGFuKHNrZXdYKSAqIGRlZ3JlZXMsXG4gICAgc2NhbGVYOiBzY2FsZVgsXG4gICAgc2NhbGVZOiBzY2FsZVlcbiAgfTtcbn1cbiIsImltcG9ydCBkZWNvbXBvc2UsIHtpZGVudGl0eX0gZnJvbSBcIi4vZGVjb21wb3NlXCI7XG5cbnZhciBjc3NOb2RlLFxuICAgIGNzc1Jvb3QsXG4gICAgY3NzVmlldyxcbiAgICBzdmdOb2RlO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDc3ModmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSBcIm5vbmVcIikgcmV0dXJuIGlkZW50aXR5O1xuICBpZiAoIWNzc05vZGUpIGNzc05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpLCBjc3NSb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCBjc3NWaWV3ID0gZG9jdW1lbnQuZGVmYXVsdFZpZXc7XG4gIGNzc05vZGUuc3R5bGUudHJhbnNmb3JtID0gdmFsdWU7XG4gIHZhbHVlID0gY3NzVmlldy5nZXRDb21wdXRlZFN0eWxlKGNzc1Jvb3QuYXBwZW5kQ2hpbGQoY3NzTm9kZSksIG51bGwpLmdldFByb3BlcnR5VmFsdWUoXCJ0cmFuc2Zvcm1cIik7XG4gIGNzc1Jvb3QucmVtb3ZlQ2hpbGQoY3NzTm9kZSk7XG4gIHZhbHVlID0gdmFsdWUuc2xpY2UoNywgLTEpLnNwbGl0KFwiLFwiKTtcbiAgcmV0dXJuIGRlY29tcG9zZSgrdmFsdWVbMF0sICt2YWx1ZVsxXSwgK3ZhbHVlWzJdLCArdmFsdWVbM10sICt2YWx1ZVs0XSwgK3ZhbHVlWzVdKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU3ZnKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gaWRlbnRpdHk7XG4gIGlmICghc3ZnTm9kZSkgc3ZnTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIFwiZ1wiKTtcbiAgc3ZnTm9kZS5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgdmFsdWUpO1xuICBpZiAoISh2YWx1ZSA9IHN2Z05vZGUudHJhbnNmb3JtLmJhc2VWYWwuY29uc29saWRhdGUoKSkpIHJldHVybiBpZGVudGl0eTtcbiAgdmFsdWUgPSB2YWx1ZS5tYXRyaXg7XG4gIHJldHVybiBkZWNvbXBvc2UodmFsdWUuYSwgdmFsdWUuYiwgdmFsdWUuYywgdmFsdWUuZCwgdmFsdWUuZSwgdmFsdWUuZik7XG59XG4iLCJpbXBvcnQgbnVtYmVyIGZyb20gXCIuLi9udW1iZXJcIjtcbmltcG9ydCB7cGFyc2VDc3MsIHBhcnNlU3ZnfSBmcm9tIFwiLi9wYXJzZVwiO1xuXG5mdW5jdGlvbiBpbnRlcnBvbGF0ZVRyYW5zZm9ybShwYXJzZSwgcHhDb21tYSwgcHhQYXJlbiwgZGVnUGFyZW4pIHtcblxuICBmdW5jdGlvbiBwb3Aocykge1xuICAgIHJldHVybiBzLmxlbmd0aCA/IHMucG9wKCkgKyBcIiBcIiA6IFwiXCI7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2xhdGUoeGEsIHlhLCB4YiwgeWIsIHMsIHEpIHtcbiAgICBpZiAoeGEgIT09IHhiIHx8IHlhICE9PSB5Yikge1xuICAgICAgdmFyIGkgPSBzLnB1c2goXCJ0cmFuc2xhdGUoXCIsIG51bGwsIHB4Q29tbWEsIG51bGwsIHB4UGFyZW4pO1xuICAgICAgcS5wdXNoKHtpOiBpIC0gNCwgeDogbnVtYmVyKHhhLCB4Yil9LCB7aTogaSAtIDIsIHg6IG51bWJlcih5YSwgeWIpfSk7XG4gICAgfSBlbHNlIGlmICh4YiB8fCB5Yikge1xuICAgICAgcy5wdXNoKFwidHJhbnNsYXRlKFwiICsgeGIgKyBweENvbW1hICsgeWIgKyBweFBhcmVuKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByb3RhdGUoYSwgYiwgcywgcSkge1xuICAgIGlmIChhICE9PSBiKSB7XG4gICAgICBpZiAoYSAtIGIgPiAxODApIGIgKz0gMzYwOyBlbHNlIGlmIChiIC0gYSA+IDE4MCkgYSArPSAzNjA7IC8vIHNob3J0ZXN0IHBhdGhcbiAgICAgIHEucHVzaCh7aTogcy5wdXNoKHBvcChzKSArIFwicm90YXRlKFwiLCBudWxsLCBkZWdQYXJlbikgLSAyLCB4OiBudW1iZXIoYSwgYil9KTtcbiAgICB9IGVsc2UgaWYgKGIpIHtcbiAgICAgIHMucHVzaChwb3AocykgKyBcInJvdGF0ZShcIiArIGIgKyBkZWdQYXJlbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2tld1goYSwgYiwgcywgcSkge1xuICAgIGlmIChhICE9PSBiKSB7XG4gICAgICBxLnB1c2goe2k6IHMucHVzaChwb3AocykgKyBcInNrZXdYKFwiLCBudWxsLCBkZWdQYXJlbikgLSAyLCB4OiBudW1iZXIoYSwgYil9KTtcbiAgICB9IGVsc2UgaWYgKGIpIHtcbiAgICAgIHMucHVzaChwb3AocykgKyBcInNrZXdYKFwiICsgYiArIGRlZ1BhcmVuKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzY2FsZSh4YSwgeWEsIHhiLCB5YiwgcywgcSkge1xuICAgIGlmICh4YSAhPT0geGIgfHwgeWEgIT09IHliKSB7XG4gICAgICB2YXIgaSA9IHMucHVzaChwb3AocykgKyBcInNjYWxlKFwiLCBudWxsLCBcIixcIiwgbnVsbCwgXCIpXCIpO1xuICAgICAgcS5wdXNoKHtpOiBpIC0gNCwgeDogbnVtYmVyKHhhLCB4Yil9LCB7aTogaSAtIDIsIHg6IG51bWJlcih5YSwgeWIpfSk7XG4gICAgfSBlbHNlIGlmICh4YiAhPT0gMSB8fCB5YiAhPT0gMSkge1xuICAgICAgcy5wdXNoKHBvcChzKSArIFwic2NhbGUoXCIgKyB4YiArIFwiLFwiICsgeWIgKyBcIilcIik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICB2YXIgcyA9IFtdLCAvLyBzdHJpbmcgY29uc3RhbnRzIGFuZCBwbGFjZWhvbGRlcnNcbiAgICAgICAgcSA9IFtdOyAvLyBudW1iZXIgaW50ZXJwb2xhdG9yc1xuICAgIGEgPSBwYXJzZShhKSwgYiA9IHBhcnNlKGIpO1xuICAgIHRyYW5zbGF0ZShhLnRyYW5zbGF0ZVgsIGEudHJhbnNsYXRlWSwgYi50cmFuc2xhdGVYLCBiLnRyYW5zbGF0ZVksIHMsIHEpO1xuICAgIHJvdGF0ZShhLnJvdGF0ZSwgYi5yb3RhdGUsIHMsIHEpO1xuICAgIHNrZXdYKGEuc2tld1gsIGIuc2tld1gsIHMsIHEpO1xuICAgIHNjYWxlKGEuc2NhbGVYLCBhLnNjYWxlWSwgYi5zY2FsZVgsIGIuc2NhbGVZLCBzLCBxKTtcbiAgICBhID0gYiA9IG51bGw7IC8vIGdjXG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIHZhciBpID0gLTEsIG4gPSBxLmxlbmd0aCwgbztcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBzWyhvID0gcVtpXSkuaV0gPSBvLngodCk7XG4gICAgICByZXR1cm4gcy5qb2luKFwiXCIpO1xuICAgIH07XG4gIH07XG59XG5cbmV4cG9ydCB2YXIgaW50ZXJwb2xhdGVUcmFuc2Zvcm1Dc3MgPSBpbnRlcnBvbGF0ZVRyYW5zZm9ybShwYXJzZUNzcywgXCJweCwgXCIsIFwicHgpXCIsIFwiZGVnKVwiKTtcbmV4cG9ydCB2YXIgaW50ZXJwb2xhdGVUcmFuc2Zvcm1TdmcgPSBpbnRlcnBvbGF0ZVRyYW5zZm9ybShwYXJzZVN2ZywgXCIsIFwiLCBcIilcIiwgXCIpXCIpO1xuIiwiaW1wb3J0IHtjdWJlaGVsaXggYXMgY29sb3JDdWJlaGVsaXh9IGZyb20gXCJkMy1jb2xvclwiO1xuaW1wb3J0IGNvbG9yLCB7aHVlfSBmcm9tIFwiLi9jb2xvclwiO1xuXG5mdW5jdGlvbiBjdWJlaGVsaXgoaHVlKSB7XG4gIHJldHVybiAoZnVuY3Rpb24gY3ViZWhlbGl4R2FtbWEoeSkge1xuICAgIHkgPSAreTtcblxuICAgIGZ1bmN0aW9uIGN1YmVoZWxpeChzdGFydCwgZW5kKSB7XG4gICAgICB2YXIgaCA9IGh1ZSgoc3RhcnQgPSBjb2xvckN1YmVoZWxpeChzdGFydCkpLmgsIChlbmQgPSBjb2xvckN1YmVoZWxpeChlbmQpKS5oKSxcbiAgICAgICAgICBzID0gY29sb3Ioc3RhcnQucywgZW5kLnMpLFxuICAgICAgICAgIGwgPSBjb2xvcihzdGFydC5sLCBlbmQubCksXG4gICAgICAgICAgb3BhY2l0eSA9IGNvbG9yKHN0YXJ0Lm9wYWNpdHksIGVuZC5vcGFjaXR5KTtcbiAgICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICAgIHN0YXJ0LmggPSBoKHQpO1xuICAgICAgICBzdGFydC5zID0gcyh0KTtcbiAgICAgICAgc3RhcnQubCA9IGwoTWF0aC5wb3codCwgeSkpO1xuICAgICAgICBzdGFydC5vcGFjaXR5ID0gb3BhY2l0eSh0KTtcbiAgICAgICAgcmV0dXJuIHN0YXJ0ICsgXCJcIjtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY3ViZWhlbGl4LmdhbW1hID0gY3ViZWhlbGl4R2FtbWE7XG5cbiAgICByZXR1cm4gY3ViZWhlbGl4O1xuICB9KSgxKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY3ViZWhlbGl4KGh1ZSk7XG5leHBvcnQgdmFyIGN1YmVoZWxpeExvbmcgPSBjdWJlaGVsaXgoY29sb3IpO1xuIiwidmFyIGZyYW1lID0gMCwgLy8gaXMgYW4gYW5pbWF0aW9uIGZyYW1lIHBlbmRpbmc/XG4gICAgdGltZW91dCA9IDAsIC8vIGlzIGEgdGltZW91dCBwZW5kaW5nP1xuICAgIGludGVydmFsID0gMCwgLy8gYXJlIGFueSB0aW1lcnMgYWN0aXZlP1xuICAgIHBva2VEZWxheSA9IDEwMDAsIC8vIGhvdyBmcmVxdWVudGx5IHdlIGNoZWNrIGZvciBjbG9jayBza2V3XG4gICAgdGFza0hlYWQsXG4gICAgdGFza1RhaWwsXG4gICAgY2xvY2tMYXN0ID0gMCxcbiAgICBjbG9ja05vdyA9IDAsXG4gICAgY2xvY2tTa2V3ID0gMCxcbiAgICBjbG9jayA9IHR5cGVvZiBwZXJmb3JtYW5jZSA9PT0gXCJvYmplY3RcIiAmJiBwZXJmb3JtYW5jZS5ub3cgPyBwZXJmb3JtYW5jZSA6IERhdGUsXG4gICAgc2V0RnJhbWUgPSB0eXBlb2Ygd2luZG93ID09PSBcIm9iamVjdFwiICYmIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPyB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lLmJpbmQod2luZG93KSA6IGZ1bmN0aW9uKGYpIHsgc2V0VGltZW91dChmLCAxNyk7IH07XG5cbmV4cG9ydCBmdW5jdGlvbiBub3coKSB7XG4gIHJldHVybiBjbG9ja05vdyB8fCAoc2V0RnJhbWUoY2xlYXJOb3cpLCBjbG9ja05vdyA9IGNsb2NrLm5vdygpICsgY2xvY2tTa2V3KTtcbn1cblxuZnVuY3Rpb24gY2xlYXJOb3coKSB7XG4gIGNsb2NrTm93ID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFRpbWVyKCkge1xuICB0aGlzLl9jYWxsID1cbiAgdGhpcy5fdGltZSA9XG4gIHRoaXMuX25leHQgPSBudWxsO1xufVxuXG5UaW1lci5wcm90b3R5cGUgPSB0aW1lci5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBUaW1lcixcbiAgcmVzdGFydDogZnVuY3Rpb24oY2FsbGJhY2ssIGRlbGF5LCB0aW1lKSB7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2FsbGJhY2sgaXMgbm90IGEgZnVuY3Rpb25cIik7XG4gICAgdGltZSA9ICh0aW1lID09IG51bGwgPyBub3coKSA6ICt0aW1lKSArIChkZWxheSA9PSBudWxsID8gMCA6ICtkZWxheSk7XG4gICAgaWYgKCF0aGlzLl9uZXh0ICYmIHRhc2tUYWlsICE9PSB0aGlzKSB7XG4gICAgICBpZiAodGFza1RhaWwpIHRhc2tUYWlsLl9uZXh0ID0gdGhpcztcbiAgICAgIGVsc2UgdGFza0hlYWQgPSB0aGlzO1xuICAgICAgdGFza1RhaWwgPSB0aGlzO1xuICAgIH1cbiAgICB0aGlzLl9jYWxsID0gY2FsbGJhY2s7XG4gICAgdGhpcy5fdGltZSA9IHRpbWU7XG4gICAgc2xlZXAoKTtcbiAgfSxcbiAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2NhbGwpIHtcbiAgICAgIHRoaXMuX2NhbGwgPSBudWxsO1xuICAgICAgdGhpcy5fdGltZSA9IEluZmluaXR5O1xuICAgICAgc2xlZXAoKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiB0aW1lcihjYWxsYmFjaywgZGVsYXksIHRpbWUpIHtcbiAgdmFyIHQgPSBuZXcgVGltZXI7XG4gIHQucmVzdGFydChjYWxsYmFjaywgZGVsYXksIHRpbWUpO1xuICByZXR1cm4gdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRpbWVyRmx1c2goKSB7XG4gIG5vdygpOyAvLyBHZXQgdGhlIGN1cnJlbnQgdGltZSwgaWYgbm90IGFscmVhZHkgc2V0LlxuICArK2ZyYW1lOyAvLyBQcmV0ZW5kIHdl4oCZdmUgc2V0IGFuIGFsYXJtLCBpZiB3ZSBoYXZlbuKAmXQgYWxyZWFkeS5cbiAgdmFyIHQgPSB0YXNrSGVhZCwgZTtcbiAgd2hpbGUgKHQpIHtcbiAgICBpZiAoKGUgPSBjbG9ja05vdyAtIHQuX3RpbWUpID49IDApIHQuX2NhbGwuY2FsbChudWxsLCBlKTtcbiAgICB0ID0gdC5fbmV4dDtcbiAgfVxuICAtLWZyYW1lO1xufVxuXG5mdW5jdGlvbiB3YWtlKCkge1xuICBjbG9ja05vdyA9IChjbG9ja0xhc3QgPSBjbG9jay5ub3coKSkgKyBjbG9ja1NrZXc7XG4gIGZyYW1lID0gdGltZW91dCA9IDA7XG4gIHRyeSB7XG4gICAgdGltZXJGbHVzaCgpO1xuICB9IGZpbmFsbHkge1xuICAgIGZyYW1lID0gMDtcbiAgICBuYXAoKTtcbiAgICBjbG9ja05vdyA9IDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gcG9rZSgpIHtcbiAgdmFyIG5vdyA9IGNsb2NrLm5vdygpLCBkZWxheSA9IG5vdyAtIGNsb2NrTGFzdDtcbiAgaWYgKGRlbGF5ID4gcG9rZURlbGF5KSBjbG9ja1NrZXcgLT0gZGVsYXksIGNsb2NrTGFzdCA9IG5vdztcbn1cblxuZnVuY3Rpb24gbmFwKCkge1xuICB2YXIgdDAsIHQxID0gdGFza0hlYWQsIHQyLCB0aW1lID0gSW5maW5pdHk7XG4gIHdoaWxlICh0MSkge1xuICAgIGlmICh0MS5fY2FsbCkge1xuICAgICAgaWYgKHRpbWUgPiB0MS5fdGltZSkgdGltZSA9IHQxLl90aW1lO1xuICAgICAgdDAgPSB0MSwgdDEgPSB0MS5fbmV4dDtcbiAgICB9IGVsc2Uge1xuICAgICAgdDIgPSB0MS5fbmV4dCwgdDEuX25leHQgPSBudWxsO1xuICAgICAgdDEgPSB0MCA/IHQwLl9uZXh0ID0gdDIgOiB0YXNrSGVhZCA9IHQyO1xuICAgIH1cbiAgfVxuICB0YXNrVGFpbCA9IHQwO1xuICBzbGVlcCh0aW1lKTtcbn1cblxuZnVuY3Rpb24gc2xlZXAodGltZSkge1xuICBpZiAoZnJhbWUpIHJldHVybjsgLy8gU29vbmVzdCBhbGFybSBhbHJlYWR5IHNldCwgb3Igd2lsbCBiZS5cbiAgaWYgKHRpbWVvdXQpIHRpbWVvdXQgPSBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gIHZhciBkZWxheSA9IHRpbWUgLSBjbG9ja05vdzsgLy8gU3RyaWN0bHkgbGVzcyB0aGFuIGlmIHdlIHJlY29tcHV0ZWQgY2xvY2tOb3cuXG4gIGlmIChkZWxheSA+IDI0KSB7XG4gICAgaWYgKHRpbWUgPCBJbmZpbml0eSkgdGltZW91dCA9IHNldFRpbWVvdXQod2FrZSwgdGltZSAtIGNsb2NrLm5vdygpIC0gY2xvY2tTa2V3KTtcbiAgICBpZiAoaW50ZXJ2YWwpIGludGVydmFsID0gY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKCFpbnRlcnZhbCkgY2xvY2tMYXN0ID0gY2xvY2subm93KCksIGludGVydmFsID0gc2V0SW50ZXJ2YWwocG9rZSwgcG9rZURlbGF5KTtcbiAgICBmcmFtZSA9IDEsIHNldEZyYW1lKHdha2UpO1xuICB9XG59XG4iLCJpbXBvcnQge1RpbWVyfSBmcm9tIFwiLi90aW1lclwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjYWxsYmFjaywgZGVsYXksIHRpbWUpIHtcbiAgdmFyIHQgPSBuZXcgVGltZXI7XG4gIGRlbGF5ID0gZGVsYXkgPT0gbnVsbCA/IDAgOiArZGVsYXk7XG4gIHQucmVzdGFydChmdW5jdGlvbihlbGFwc2VkKSB7XG4gICAgdC5zdG9wKCk7XG4gICAgY2FsbGJhY2soZWxhcHNlZCArIGRlbGF5KTtcbiAgfSwgZGVsYXksIHRpbWUpO1xuICByZXR1cm4gdDtcbn1cbiIsImltcG9ydCB7ZGlzcGF0Y2h9IGZyb20gXCJkMy1kaXNwYXRjaFwiO1xuaW1wb3J0IHt0aW1lciwgdGltZW91dH0gZnJvbSBcImQzLXRpbWVyXCI7XG5cbnZhciBlbXB0eU9uID0gZGlzcGF0Y2goXCJzdGFydFwiLCBcImVuZFwiLCBcImludGVycnVwdFwiKTtcbnZhciBlbXB0eVR3ZWVuID0gW107XG5cbmV4cG9ydCB2YXIgQ1JFQVRFRCA9IDA7XG5leHBvcnQgdmFyIFNDSEVEVUxFRCA9IDE7XG5leHBvcnQgdmFyIFNUQVJUSU5HID0gMjtcbmV4cG9ydCB2YXIgU1RBUlRFRCA9IDM7XG5leHBvcnQgdmFyIFJVTk5JTkcgPSA0O1xuZXhwb3J0IHZhciBFTkRJTkcgPSA1O1xuZXhwb3J0IHZhciBFTkRFRCA9IDY7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5vZGUsIG5hbWUsIGlkLCBpbmRleCwgZ3JvdXAsIHRpbWluZykge1xuICB2YXIgc2NoZWR1bGVzID0gbm9kZS5fX3RyYW5zaXRpb247XG4gIGlmICghc2NoZWR1bGVzKSBub2RlLl9fdHJhbnNpdGlvbiA9IHt9O1xuICBlbHNlIGlmIChpZCBpbiBzY2hlZHVsZXMpIHJldHVybjtcbiAgY3JlYXRlKG5vZGUsIGlkLCB7XG4gICAgbmFtZTogbmFtZSxcbiAgICBpbmRleDogaW5kZXgsIC8vIEZvciBjb250ZXh0IGR1cmluZyBjYWxsYmFjay5cbiAgICBncm91cDogZ3JvdXAsIC8vIEZvciBjb250ZXh0IGR1cmluZyBjYWxsYmFjay5cbiAgICBvbjogZW1wdHlPbixcbiAgICB0d2VlbjogZW1wdHlUd2VlbixcbiAgICB0aW1lOiB0aW1pbmcudGltZSxcbiAgICBkZWxheTogdGltaW5nLmRlbGF5LFxuICAgIGR1cmF0aW9uOiB0aW1pbmcuZHVyYXRpb24sXG4gICAgZWFzZTogdGltaW5nLmVhc2UsXG4gICAgdGltZXI6IG51bGwsXG4gICAgc3RhdGU6IENSRUFURURcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KG5vZGUsIGlkKSB7XG4gIHZhciBzY2hlZHVsZSA9IGdldChub2RlLCBpZCk7XG4gIGlmIChzY2hlZHVsZS5zdGF0ZSA+IENSRUFURUQpIHRocm93IG5ldyBFcnJvcihcInRvbyBsYXRlOyBhbHJlYWR5IHNjaGVkdWxlZFwiKTtcbiAgcmV0dXJuIHNjaGVkdWxlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0KG5vZGUsIGlkKSB7XG4gIHZhciBzY2hlZHVsZSA9IGdldChub2RlLCBpZCk7XG4gIGlmIChzY2hlZHVsZS5zdGF0ZSA+IFNUQVJUSU5HKSB0aHJvdyBuZXcgRXJyb3IoXCJ0b28gbGF0ZTsgYWxyZWFkeSBzdGFydGVkXCIpO1xuICByZXR1cm4gc2NoZWR1bGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXQobm9kZSwgaWQpIHtcbiAgdmFyIHNjaGVkdWxlID0gbm9kZS5fX3RyYW5zaXRpb247XG4gIGlmICghc2NoZWR1bGUgfHwgIShzY2hlZHVsZSA9IHNjaGVkdWxlW2lkXSkpIHRocm93IG5ldyBFcnJvcihcInRyYW5zaXRpb24gbm90IGZvdW5kXCIpO1xuICByZXR1cm4gc2NoZWR1bGU7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZShub2RlLCBpZCwgc2VsZikge1xuICB2YXIgc2NoZWR1bGVzID0gbm9kZS5fX3RyYW5zaXRpb24sXG4gICAgICB0d2VlbjtcblxuICAvLyBJbml0aWFsaXplIHRoZSBzZWxmIHRpbWVyIHdoZW4gdGhlIHRyYW5zaXRpb24gaXMgY3JlYXRlZC5cbiAgLy8gTm90ZSB0aGUgYWN0dWFsIGRlbGF5IGlzIG5vdCBrbm93biB1bnRpbCB0aGUgZmlyc3QgY2FsbGJhY2shXG4gIHNjaGVkdWxlc1tpZF0gPSBzZWxmO1xuICBzZWxmLnRpbWVyID0gdGltZXIoc2NoZWR1bGUsIDAsIHNlbGYudGltZSk7XG5cbiAgZnVuY3Rpb24gc2NoZWR1bGUoZWxhcHNlZCkge1xuICAgIHNlbGYuc3RhdGUgPSBTQ0hFRFVMRUQ7XG4gICAgc2VsZi50aW1lci5yZXN0YXJ0KHN0YXJ0LCBzZWxmLmRlbGF5LCBzZWxmLnRpbWUpO1xuXG4gICAgLy8gSWYgdGhlIGVsYXBzZWQgZGVsYXkgaXMgbGVzcyB0aGFuIG91ciBmaXJzdCBzbGVlcCwgc3RhcnQgaW1tZWRpYXRlbHkuXG4gICAgaWYgKHNlbGYuZGVsYXkgPD0gZWxhcHNlZCkgc3RhcnQoZWxhcHNlZCAtIHNlbGYuZGVsYXkpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnQoZWxhcHNlZCkge1xuICAgIHZhciBpLCBqLCBuLCBvO1xuXG4gICAgLy8gSWYgdGhlIHN0YXRlIGlzIG5vdCBTQ0hFRFVMRUQsIHRoZW4gd2UgcHJldmlvdXNseSBlcnJvcmVkIG9uIHN0YXJ0LlxuICAgIGlmIChzZWxmLnN0YXRlICE9PSBTQ0hFRFVMRUQpIHJldHVybiBzdG9wKCk7XG5cbiAgICBmb3IgKGkgaW4gc2NoZWR1bGVzKSB7XG4gICAgICBvID0gc2NoZWR1bGVzW2ldO1xuICAgICAgaWYgKG8ubmFtZSAhPT0gc2VsZi5uYW1lKSBjb250aW51ZTtcblxuICAgICAgLy8gV2hpbGUgdGhpcyBlbGVtZW50IGFscmVhZHkgaGFzIGEgc3RhcnRpbmcgdHJhbnNpdGlvbiBkdXJpbmcgdGhpcyBmcmFtZSxcbiAgICAgIC8vIGRlZmVyIHN0YXJ0aW5nIGFuIGludGVycnVwdGluZyB0cmFuc2l0aW9uIHVudGlsIHRoYXQgdHJhbnNpdGlvbiBoYXMgYVxuICAgICAgLy8gY2hhbmNlIHRvIHRpY2sgKGFuZCBwb3NzaWJseSBlbmQpOyBzZWUgZDMvZDMtdHJhbnNpdGlvbiM1NCFcbiAgICAgIGlmIChvLnN0YXRlID09PSBTVEFSVEVEKSByZXR1cm4gdGltZW91dChzdGFydCk7XG5cbiAgICAgIC8vIEludGVycnVwdCB0aGUgYWN0aXZlIHRyYW5zaXRpb24sIGlmIGFueS5cbiAgICAgIC8vIERpc3BhdGNoIHRoZSBpbnRlcnJ1cHQgZXZlbnQuXG4gICAgICBpZiAoby5zdGF0ZSA9PT0gUlVOTklORykge1xuICAgICAgICBvLnN0YXRlID0gRU5ERUQ7XG4gICAgICAgIG8udGltZXIuc3RvcCgpO1xuICAgICAgICBvLm9uLmNhbGwoXCJpbnRlcnJ1cHRcIiwgbm9kZSwgbm9kZS5fX2RhdGFfXywgby5pbmRleCwgby5ncm91cCk7XG4gICAgICAgIGRlbGV0ZSBzY2hlZHVsZXNbaV07XG4gICAgICB9XG5cbiAgICAgIC8vIENhbmNlbCBhbnkgcHJlLWVtcHRlZCB0cmFuc2l0aW9ucy4gTm8gaW50ZXJydXB0IGV2ZW50IGlzIGRpc3BhdGNoZWRcbiAgICAgIC8vIGJlY2F1c2UgdGhlIGNhbmNlbGxlZCB0cmFuc2l0aW9ucyBuZXZlciBzdGFydGVkLiBOb3RlIHRoYXQgdGhpcyBhbHNvXG4gICAgICAvLyByZW1vdmVzIHRoaXMgdHJhbnNpdGlvbiBmcm9tIHRoZSBwZW5kaW5nIGxpc3QhXG4gICAgICBlbHNlIGlmICgraSA8IGlkKSB7XG4gICAgICAgIG8uc3RhdGUgPSBFTkRFRDtcbiAgICAgICAgby50aW1lci5zdG9wKCk7XG4gICAgICAgIGRlbGV0ZSBzY2hlZHVsZXNbaV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVmZXIgdGhlIGZpcnN0IHRpY2sgdG8gZW5kIG9mIHRoZSBjdXJyZW50IGZyYW1lOyBzZWUgZDMvZDMjMTU3Ni5cbiAgICAvLyBOb3RlIHRoZSB0cmFuc2l0aW9uIG1heSBiZSBjYW5jZWxlZCBhZnRlciBzdGFydCBhbmQgYmVmb3JlIHRoZSBmaXJzdCB0aWNrIVxuICAgIC8vIE5vdGUgdGhpcyBtdXN0IGJlIHNjaGVkdWxlZCBiZWZvcmUgdGhlIHN0YXJ0IGV2ZW50OyBzZWUgZDMvZDMtdHJhbnNpdGlvbiMxNiFcbiAgICAvLyBBc3N1bWluZyB0aGlzIGlzIHN1Y2Nlc3NmdWwsIHN1YnNlcXVlbnQgY2FsbGJhY2tzIGdvIHN0cmFpZ2h0IHRvIHRpY2suXG4gICAgdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGlmIChzZWxmLnN0YXRlID09PSBTVEFSVEVEKSB7XG4gICAgICAgIHNlbGYuc3RhdGUgPSBSVU5OSU5HO1xuICAgICAgICBzZWxmLnRpbWVyLnJlc3RhcnQodGljaywgc2VsZi5kZWxheSwgc2VsZi50aW1lKTtcbiAgICAgICAgdGljayhlbGFwc2VkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIERpc3BhdGNoIHRoZSBzdGFydCBldmVudC5cbiAgICAvLyBOb3RlIHRoaXMgbXVzdCBiZSBkb25lIGJlZm9yZSB0aGUgdHdlZW4gYXJlIGluaXRpYWxpemVkLlxuICAgIHNlbGYuc3RhdGUgPSBTVEFSVElORztcbiAgICBzZWxmLm9uLmNhbGwoXCJzdGFydFwiLCBub2RlLCBub2RlLl9fZGF0YV9fLCBzZWxmLmluZGV4LCBzZWxmLmdyb3VwKTtcbiAgICBpZiAoc2VsZi5zdGF0ZSAhPT0gU1RBUlRJTkcpIHJldHVybjsgLy8gaW50ZXJydXB0ZWRcbiAgICBzZWxmLnN0YXRlID0gU1RBUlRFRDtcblxuICAgIC8vIEluaXRpYWxpemUgdGhlIHR3ZWVuLCBkZWxldGluZyBudWxsIHR3ZWVuLlxuICAgIHR3ZWVuID0gbmV3IEFycmF5KG4gPSBzZWxmLnR3ZWVuLmxlbmd0aCk7XG4gICAgZm9yIChpID0gMCwgaiA9IC0xOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobyA9IHNlbGYudHdlZW5baV0udmFsdWUuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBzZWxmLmluZGV4LCBzZWxmLmdyb3VwKSkge1xuICAgICAgICB0d2VlblsrK2pdID0gbztcbiAgICAgIH1cbiAgICB9XG4gICAgdHdlZW4ubGVuZ3RoID0gaiArIDE7XG4gIH1cblxuICBmdW5jdGlvbiB0aWNrKGVsYXBzZWQpIHtcbiAgICB2YXIgdCA9IGVsYXBzZWQgPCBzZWxmLmR1cmF0aW9uID8gc2VsZi5lYXNlLmNhbGwobnVsbCwgZWxhcHNlZCAvIHNlbGYuZHVyYXRpb24pIDogKHNlbGYudGltZXIucmVzdGFydChzdG9wKSwgc2VsZi5zdGF0ZSA9IEVORElORywgMSksXG4gICAgICAgIGkgPSAtMSxcbiAgICAgICAgbiA9IHR3ZWVuLmxlbmd0aDtcblxuICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICB0d2VlbltpXS5jYWxsKG51bGwsIHQpO1xuICAgIH1cblxuICAgIC8vIERpc3BhdGNoIHRoZSBlbmQgZXZlbnQuXG4gICAgaWYgKHNlbGYuc3RhdGUgPT09IEVORElORykge1xuICAgICAgc2VsZi5vbi5jYWxsKFwiZW5kXCIsIG5vZGUsIG5vZGUuX19kYXRhX18sIHNlbGYuaW5kZXgsIHNlbGYuZ3JvdXApO1xuICAgICAgc3RvcCgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgc2VsZi5zdGF0ZSA9IEVOREVEO1xuICAgIHNlbGYudGltZXIuc3RvcCgpO1xuICAgIGRlbGV0ZSBzY2hlZHVsZXNbaWRdO1xuICAgIGZvciAodmFyIGkgaW4gc2NoZWR1bGVzKSByZXR1cm47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW51c2VkLXZhcnNcbiAgICBkZWxldGUgbm9kZS5fX3RyYW5zaXRpb247XG4gIH1cbn1cbiIsImltcG9ydCB7U1RBUlRJTkcsIEVORElORywgRU5ERUR9IGZyb20gXCIuL3RyYW5zaXRpb24vc2NoZWR1bGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obm9kZSwgbmFtZSkge1xuICB2YXIgc2NoZWR1bGVzID0gbm9kZS5fX3RyYW5zaXRpb24sXG4gICAgICBzY2hlZHVsZSxcbiAgICAgIGFjdGl2ZSxcbiAgICAgIGVtcHR5ID0gdHJ1ZSxcbiAgICAgIGk7XG5cbiAgaWYgKCFzY2hlZHVsZXMpIHJldHVybjtcblxuICBuYW1lID0gbmFtZSA9PSBudWxsID8gbnVsbCA6IG5hbWUgKyBcIlwiO1xuXG4gIGZvciAoaSBpbiBzY2hlZHVsZXMpIHtcbiAgICBpZiAoKHNjaGVkdWxlID0gc2NoZWR1bGVzW2ldKS5uYW1lICE9PSBuYW1lKSB7IGVtcHR5ID0gZmFsc2U7IGNvbnRpbnVlOyB9XG4gICAgYWN0aXZlID0gc2NoZWR1bGUuc3RhdGUgPiBTVEFSVElORyAmJiBzY2hlZHVsZS5zdGF0ZSA8IEVORElORztcbiAgICBzY2hlZHVsZS5zdGF0ZSA9IEVOREVEO1xuICAgIHNjaGVkdWxlLnRpbWVyLnN0b3AoKTtcbiAgICBpZiAoYWN0aXZlKSBzY2hlZHVsZS5vbi5jYWxsKFwiaW50ZXJydXB0XCIsIG5vZGUsIG5vZGUuX19kYXRhX18sIHNjaGVkdWxlLmluZGV4LCBzY2hlZHVsZS5ncm91cCk7XG4gICAgZGVsZXRlIHNjaGVkdWxlc1tpXTtcbiAgfVxuXG4gIGlmIChlbXB0eSkgZGVsZXRlIG5vZGUuX190cmFuc2l0aW9uO1xufVxuIiwiaW1wb3J0IGludGVycnVwdCBmcm9tIFwiLi4vaW50ZXJydXB0XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICBpbnRlcnJ1cHQodGhpcywgbmFtZSk7XG4gIH0pO1xufVxuIiwiaW1wb3J0IHtnZXQsIHNldH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZnVuY3Rpb24gdHdlZW5SZW1vdmUoaWQsIG5hbWUpIHtcbiAgdmFyIHR3ZWVuMCwgdHdlZW4xO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjaGVkdWxlID0gc2V0KHRoaXMsIGlkKSxcbiAgICAgICAgdHdlZW4gPSBzY2hlZHVsZS50d2VlbjtcblxuICAgIC8vIElmIHRoaXMgbm9kZSBzaGFyZWQgdHdlZW4gd2l0aCB0aGUgcHJldmlvdXMgbm9kZSxcbiAgICAvLyBqdXN0IGFzc2lnbiB0aGUgdXBkYXRlZCBzaGFyZWQgdHdlZW4gYW5kIHdl4oCZcmUgZG9uZSFcbiAgICAvLyBPdGhlcndpc2UsIGNvcHktb24td3JpdGUuXG4gICAgaWYgKHR3ZWVuICE9PSB0d2VlbjApIHtcbiAgICAgIHR3ZWVuMSA9IHR3ZWVuMCA9IHR3ZWVuO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB0d2VlbjEubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICAgIGlmICh0d2VlbjFbaV0ubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgIHR3ZWVuMSA9IHR3ZWVuMS5zbGljZSgpO1xuICAgICAgICAgIHR3ZWVuMS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBzY2hlZHVsZS50d2VlbiA9IHR3ZWVuMTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdHdlZW5GdW5jdGlvbihpZCwgbmFtZSwgdmFsdWUpIHtcbiAgdmFyIHR3ZWVuMCwgdHdlZW4xO1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcjtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY2hlZHVsZSA9IHNldCh0aGlzLCBpZCksXG4gICAgICAgIHR3ZWVuID0gc2NoZWR1bGUudHdlZW47XG5cbiAgICAvLyBJZiB0aGlzIG5vZGUgc2hhcmVkIHR3ZWVuIHdpdGggdGhlIHByZXZpb3VzIG5vZGUsXG4gICAgLy8ganVzdCBhc3NpZ24gdGhlIHVwZGF0ZWQgc2hhcmVkIHR3ZWVuIGFuZCB3ZeKAmXJlIGRvbmUhXG4gICAgLy8gT3RoZXJ3aXNlLCBjb3B5LW9uLXdyaXRlLlxuICAgIGlmICh0d2VlbiAhPT0gdHdlZW4wKSB7XG4gICAgICB0d2VlbjEgPSAodHdlZW4wID0gdHdlZW4pLnNsaWNlKCk7XG4gICAgICBmb3IgKHZhciB0ID0ge25hbWU6IG5hbWUsIHZhbHVlOiB2YWx1ZX0sIGkgPSAwLCBuID0gdHdlZW4xLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgICBpZiAodHdlZW4xW2ldLm5hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgICB0d2VlbjFbaV0gPSB0O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoaSA9PT0gbikgdHdlZW4xLnB1c2godCk7XG4gICAgfVxuXG4gICAgc2NoZWR1bGUudHdlZW4gPSB0d2VlbjE7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHZhciBpZCA9IHRoaXMuX2lkO1xuXG4gIG5hbWUgKz0gXCJcIjtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICB2YXIgdHdlZW4gPSBnZXQodGhpcy5ub2RlKCksIGlkKS50d2VlbjtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IHR3ZWVuLmxlbmd0aCwgdDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKCh0ID0gdHdlZW5baV0pLm5hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHQudmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbCA/IHR3ZWVuUmVtb3ZlIDogdHdlZW5GdW5jdGlvbikoaWQsIG5hbWUsIHZhbHVlKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2VlblZhbHVlKHRyYW5zaXRpb24sIG5hbWUsIHZhbHVlKSB7XG4gIHZhciBpZCA9IHRyYW5zaXRpb24uX2lkO1xuXG4gIHRyYW5zaXRpb24uZWFjaChmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NoZWR1bGUgPSBzZXQodGhpcywgaWQpO1xuICAgIChzY2hlZHVsZS52YWx1ZSB8fCAoc2NoZWR1bGUudmFsdWUgPSB7fSkpW25hbWVdID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICByZXR1cm4gZ2V0KG5vZGUsIGlkKS52YWx1ZVtuYW1lXTtcbiAgfTtcbn1cbiIsImltcG9ydCB7Y29sb3J9IGZyb20gXCJkMy1jb2xvclwiO1xuaW1wb3J0IHtpbnRlcnBvbGF0ZU51bWJlciwgaW50ZXJwb2xhdGVSZ2IsIGludGVycG9sYXRlU3RyaW5nfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICB2YXIgYztcbiAgcmV0dXJuICh0eXBlb2YgYiA9PT0gXCJudW1iZXJcIiA/IGludGVycG9sYXRlTnVtYmVyXG4gICAgICA6IGIgaW5zdGFuY2VvZiBjb2xvciA/IGludGVycG9sYXRlUmdiXG4gICAgICA6IChjID0gY29sb3IoYikpID8gKGIgPSBjLCBpbnRlcnBvbGF0ZVJnYilcbiAgICAgIDogaW50ZXJwb2xhdGVTdHJpbmcpKGEsIGIpO1xufVxuIiwiaW1wb3J0IHtpbnRlcnBvbGF0ZVRyYW5zZm9ybVN2ZyBhcyBpbnRlcnBvbGF0ZVRyYW5zZm9ybX0gZnJvbSBcImQzLWludGVycG9sYXRlXCI7XG5pbXBvcnQge25hbWVzcGFjZX0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHt0d2VlblZhbHVlfSBmcm9tIFwiLi90d2VlblwiO1xuaW1wb3J0IGludGVycG9sYXRlIGZyb20gXCIuL2ludGVycG9sYXRlXCI7XG5cbmZ1bmN0aW9uIGF0dHJSZW1vdmUobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJSZW1vdmVOUyhmdWxsbmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyQ29uc3RhbnQobmFtZSwgaW50ZXJwb2xhdGUsIHZhbHVlMSkge1xuICB2YXIgdmFsdWUwMCxcbiAgICAgIGludGVycG9sYXRlMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZTAgPSB0aGlzLmdldEF0dHJpYnV0ZShuYW1lKTtcbiAgICByZXR1cm4gdmFsdWUwID09PSB2YWx1ZTEgPyBudWxsXG4gICAgICAgIDogdmFsdWUwID09PSB2YWx1ZTAwID8gaW50ZXJwb2xhdGUwXG4gICAgICAgIDogaW50ZXJwb2xhdGUwID0gaW50ZXJwb2xhdGUodmFsdWUwMCA9IHZhbHVlMCwgdmFsdWUxKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckNvbnN0YW50TlMoZnVsbG5hbWUsIGludGVycG9sYXRlLCB2YWx1ZTEpIHtcbiAgdmFyIHZhbHVlMDAsXG4gICAgICBpbnRlcnBvbGF0ZTA7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUwID0gdGhpcy5nZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICAgIHJldHVybiB2YWx1ZTAgPT09IHZhbHVlMSA/IG51bGxcbiAgICAgICAgOiB2YWx1ZTAgPT09IHZhbHVlMDAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyRnVuY3Rpb24obmFtZSwgaW50ZXJwb2xhdGUsIHZhbHVlKSB7XG4gIHZhciB2YWx1ZTAwLFxuICAgICAgdmFsdWUxMCxcbiAgICAgIGludGVycG9sYXRlMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZTAsIHZhbHVlMSA9IHZhbHVlKHRoaXMpO1xuICAgIGlmICh2YWx1ZTEgPT0gbnVsbCkgcmV0dXJuIHZvaWQgdGhpcy5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgdmFsdWUwID0gdGhpcy5nZXRBdHRyaWJ1dGUobmFtZSk7XG4gICAgcmV0dXJuIHZhbHVlMCA9PT0gdmFsdWUxID8gbnVsbFxuICAgICAgICA6IHZhbHVlMCA9PT0gdmFsdWUwMCAmJiB2YWx1ZTEgPT09IHZhbHVlMTAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEwID0gdmFsdWUxKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckZ1bmN0aW9uTlMoZnVsbG5hbWUsIGludGVycG9sYXRlLCB2YWx1ZSkge1xuICB2YXIgdmFsdWUwMCxcbiAgICAgIHZhbHVlMTAsXG4gICAgICBpbnRlcnBvbGF0ZTA7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUwLCB2YWx1ZTEgPSB2YWx1ZSh0aGlzKTtcbiAgICBpZiAodmFsdWUxID09IG51bGwpIHJldHVybiB2b2lkIHRoaXMucmVtb3ZlQXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgICB2YWx1ZTAgPSB0aGlzLmdldEF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gICAgcmV0dXJuIHZhbHVlMCA9PT0gdmFsdWUxID8gbnVsbFxuICAgICAgICA6IHZhbHVlMCA9PT0gdmFsdWUwMCAmJiB2YWx1ZTEgPT09IHZhbHVlMTAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEwID0gdmFsdWUxKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpLCBpID0gZnVsbG5hbWUgPT09IFwidHJhbnNmb3JtXCIgPyBpbnRlcnBvbGF0ZVRyYW5zZm9ybSA6IGludGVycG9sYXRlO1xuICByZXR1cm4gdGhpcy5hdHRyVHdlZW4obmFtZSwgdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gKGZ1bGxuYW1lLmxvY2FsID8gYXR0ckZ1bmN0aW9uTlMgOiBhdHRyRnVuY3Rpb24pKGZ1bGxuYW1lLCBpLCB0d2VlblZhbHVlKHRoaXMsIFwiYXR0ci5cIiArIG5hbWUsIHZhbHVlKSlcbiAgICAgIDogdmFsdWUgPT0gbnVsbCA/IChmdWxsbmFtZS5sb2NhbCA/IGF0dHJSZW1vdmVOUyA6IGF0dHJSZW1vdmUpKGZ1bGxuYW1lKVxuICAgICAgOiAoZnVsbG5hbWUubG9jYWwgPyBhdHRyQ29uc3RhbnROUyA6IGF0dHJDb25zdGFudCkoZnVsbG5hbWUsIGksIHZhbHVlICsgXCJcIikpO1xufVxuIiwiaW1wb3J0IHtuYW1lc3BhY2V9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcblxuZnVuY3Rpb24gYXR0clR3ZWVuTlMoZnVsbG5hbWUsIHZhbHVlKSB7XG4gIGZ1bmN0aW9uIHR3ZWVuKCkge1xuICAgIHZhciBub2RlID0gdGhpcywgaSA9IHZhbHVlLmFwcGx5KG5vZGUsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIGkgJiYgZnVuY3Rpb24odCkge1xuICAgICAgbm9kZS5zZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwsIGkodCkpO1xuICAgIH07XG4gIH1cbiAgdHdlZW4uX3ZhbHVlID0gdmFsdWU7XG4gIHJldHVybiB0d2Vlbjtcbn1cblxuZnVuY3Rpb24gYXR0clR3ZWVuKG5hbWUsIHZhbHVlKSB7XG4gIGZ1bmN0aW9uIHR3ZWVuKCkge1xuICAgIHZhciBub2RlID0gdGhpcywgaSA9IHZhbHVlLmFwcGx5KG5vZGUsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIGkgJiYgZnVuY3Rpb24odCkge1xuICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgaSh0KSk7XG4gICAgfTtcbiAgfVxuICB0d2Vlbi5fdmFsdWUgPSB2YWx1ZTtcbiAgcmV0dXJuIHR3ZWVuO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB2YXIga2V5ID0gXCJhdHRyLlwiICsgbmFtZTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSByZXR1cm4gKGtleSA9IHRoaXMudHdlZW4oa2V5KSkgJiYga2V5Ll92YWx1ZTtcbiAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiB0aGlzLnR3ZWVuKGtleSwgbnVsbCk7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IEVycm9yO1xuICB2YXIgZnVsbG5hbWUgPSBuYW1lc3BhY2UobmFtZSk7XG4gIHJldHVybiB0aGlzLnR3ZWVuKGtleSwgKGZ1bGxuYW1lLmxvY2FsID8gYXR0clR3ZWVuTlMgOiBhdHRyVHdlZW4pKGZ1bGxuYW1lLCB2YWx1ZSkpO1xufVxuIiwiaW1wb3J0IHtnZXQsIGluaXR9IGZyb20gXCIuL3NjaGVkdWxlXCI7XG5cbmZ1bmN0aW9uIGRlbGF5RnVuY3Rpb24oaWQsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBpbml0KHRoaXMsIGlkKS5kZWxheSA9ICt2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBkZWxheUNvbnN0YW50KGlkLCB2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPSArdmFsdWUsIGZ1bmN0aW9uKCkge1xuICAgIGluaXQodGhpcywgaWQpLmRlbGF5ID0gdmFsdWU7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBpZCA9IHRoaXMuX2lkO1xuXG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCgodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IGRlbGF5RnVuY3Rpb25cbiAgICAgICAgICA6IGRlbGF5Q29uc3RhbnQpKGlkLCB2YWx1ZSkpXG4gICAgICA6IGdldCh0aGlzLm5vZGUoKSwgaWQpLmRlbGF5O1xufVxuIiwiaW1wb3J0IHtnZXQsIHNldH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZnVuY3Rpb24gZHVyYXRpb25GdW5jdGlvbihpZCwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHNldCh0aGlzLCBpZCkuZHVyYXRpb24gPSArdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZHVyYXRpb25Db25zdGFudChpZCwgdmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID0gK3ZhbHVlLCBmdW5jdGlvbigpIHtcbiAgICBzZXQodGhpcywgaWQpLmR1cmF0aW9uID0gdmFsdWU7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBpZCA9IHRoaXMuX2lkO1xuXG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCgodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IGR1cmF0aW9uRnVuY3Rpb25cbiAgICAgICAgICA6IGR1cmF0aW9uQ29uc3RhbnQpKGlkLCB2YWx1ZSkpXG4gICAgICA6IGdldCh0aGlzLm5vZGUoKSwgaWQpLmR1cmF0aW9uO1xufVxuIiwiaW1wb3J0IHtnZXQsIHNldH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZnVuY3Rpb24gZWFzZUNvbnN0YW50KGlkLCB2YWx1ZSkge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcjtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHNldCh0aGlzLCBpZCkuZWFzZSA9IHZhbHVlO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICB2YXIgaWQgPSB0aGlzLl9pZDtcblxuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLmVhY2goZWFzZUNvbnN0YW50KGlkLCB2YWx1ZSkpXG4gICAgICA6IGdldCh0aGlzLm5vZGUoKSwgaWQpLmVhc2U7XG59XG4iLCJpbXBvcnQge21hdGNoZXJ9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7VHJhbnNpdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obWF0Y2gpIHtcbiAgaWYgKHR5cGVvZiBtYXRjaCAhPT0gXCJmdW5jdGlvblwiKSBtYXRjaCA9IG1hdGNoZXIobWF0Y2gpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc3ViZ3JvdXAgPSBzdWJncm91cHNbal0gPSBbXSwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmICgobm9kZSA9IGdyb3VwW2ldKSAmJiBtYXRjaC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSkge1xuICAgICAgICBzdWJncm91cC5wdXNoKG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgVHJhbnNpdGlvbihzdWJncm91cHMsIHRoaXMuX3BhcmVudHMsIHRoaXMuX25hbWUsIHRoaXMuX2lkKTtcbn1cbiIsImltcG9ydCB7VHJhbnNpdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odHJhbnNpdGlvbikge1xuICBpZiAodHJhbnNpdGlvbi5faWQgIT09IHRoaXMuX2lkKSB0aHJvdyBuZXcgRXJyb3I7XG5cbiAgZm9yICh2YXIgZ3JvdXBzMCA9IHRoaXMuX2dyb3VwcywgZ3JvdXBzMSA9IHRyYW5zaXRpb24uX2dyb3VwcywgbTAgPSBncm91cHMwLmxlbmd0aCwgbTEgPSBncm91cHMxLmxlbmd0aCwgbSA9IE1hdGgubWluKG0wLCBtMSksIG1lcmdlcyA9IG5ldyBBcnJheShtMCksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAwID0gZ3JvdXBzMFtqXSwgZ3JvdXAxID0gZ3JvdXBzMVtqXSwgbiA9IGdyb3VwMC5sZW5ndGgsIG1lcmdlID0gbWVyZ2VzW2pdID0gbmV3IEFycmF5KG4pLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cDBbaV0gfHwgZ3JvdXAxW2ldKSB7XG4gICAgICAgIG1lcmdlW2ldID0gbm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKDsgaiA8IG0wOyArK2opIHtcbiAgICBtZXJnZXNbal0gPSBncm91cHMwW2pdO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBUcmFuc2l0aW9uKG1lcmdlcywgdGhpcy5fcGFyZW50cywgdGhpcy5fbmFtZSwgdGhpcy5faWQpO1xufVxuIiwiaW1wb3J0IHtnZXQsIHNldCwgaW5pdH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZnVuY3Rpb24gc3RhcnQobmFtZSkge1xuICByZXR1cm4gKG5hbWUgKyBcIlwiKS50cmltKCkuc3BsaXQoL158XFxzKy8pLmV2ZXJ5KGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgaSA9IHQuaW5kZXhPZihcIi5cIik7XG4gICAgaWYgKGkgPj0gMCkgdCA9IHQuc2xpY2UoMCwgaSk7XG4gICAgcmV0dXJuICF0IHx8IHQgPT09IFwic3RhcnRcIjtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG9uRnVuY3Rpb24oaWQsIG5hbWUsIGxpc3RlbmVyKSB7XG4gIHZhciBvbjAsIG9uMSwgc2l0ID0gc3RhcnQobmFtZSkgPyBpbml0IDogc2V0O1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjaGVkdWxlID0gc2l0KHRoaXMsIGlkKSxcbiAgICAgICAgb24gPSBzY2hlZHVsZS5vbjtcblxuICAgIC8vIElmIHRoaXMgbm9kZSBzaGFyZWQgYSBkaXNwYXRjaCB3aXRoIHRoZSBwcmV2aW91cyBub2RlLFxuICAgIC8vIGp1c3QgYXNzaWduIHRoZSB1cGRhdGVkIHNoYXJlZCBkaXNwYXRjaCBhbmQgd2XigJlyZSBkb25lIVxuICAgIC8vIE90aGVyd2lzZSwgY29weS1vbi13cml0ZS5cbiAgICBpZiAob24gIT09IG9uMCkgKG9uMSA9IChvbjAgPSBvbikuY29weSgpKS5vbihuYW1lLCBsaXN0ZW5lcik7XG5cbiAgICBzY2hlZHVsZS5vbiA9IG9uMTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGlkID0gdGhpcy5faWQ7XG5cbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPCAyXG4gICAgICA/IGdldCh0aGlzLm5vZGUoKSwgaWQpLm9uLm9uKG5hbWUpXG4gICAgICA6IHRoaXMuZWFjaChvbkZ1bmN0aW9uKGlkLCBuYW1lLCBsaXN0ZW5lcikpO1xufVxuIiwiZnVuY3Rpb24gcmVtb3ZlRnVuY3Rpb24oaWQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudE5vZGU7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLl9fdHJhbnNpdGlvbikgaWYgKCtpICE9PSBpZCkgcmV0dXJuO1xuICAgIGlmIChwYXJlbnQpIHBhcmVudC5yZW1vdmVDaGlsZCh0aGlzKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm9uKFwiZW5kLnJlbW92ZVwiLCByZW1vdmVGdW5jdGlvbih0aGlzLl9pZCkpO1xufVxuIiwiaW1wb3J0IHtzZWxlY3Rvcn0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHtUcmFuc2l0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHNjaGVkdWxlLCB7Z2V0fSBmcm9tIFwiLi9zY2hlZHVsZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3QpIHtcbiAgdmFyIG5hbWUgPSB0aGlzLl9uYW1lLFxuICAgICAgaWQgPSB0aGlzLl9pZDtcblxuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvcihzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc3ViZ3JvdXAgPSBzdWJncm91cHNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIHN1Ym5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgKHN1Ym5vZGUgPSBzZWxlY3QuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpKSB7XG4gICAgICAgIGlmIChcIl9fZGF0YV9fXCIgaW4gbm9kZSkgc3Vibm9kZS5fX2RhdGFfXyA9IG5vZGUuX19kYXRhX187XG4gICAgICAgIHN1Ymdyb3VwW2ldID0gc3Vibm9kZTtcbiAgICAgICAgc2NoZWR1bGUoc3ViZ3JvdXBbaV0sIG5hbWUsIGlkLCBpLCBzdWJncm91cCwgZ2V0KG5vZGUsIGlkKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBUcmFuc2l0aW9uKHN1Ymdyb3VwcywgdGhpcy5fcGFyZW50cywgbmFtZSwgaWQpO1xufVxuIiwiaW1wb3J0IHtzZWxlY3RvckFsbH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHtUcmFuc2l0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHNjaGVkdWxlLCB7Z2V0fSBmcm9tIFwiLi9zY2hlZHVsZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3QpIHtcbiAgdmFyIG5hbWUgPSB0aGlzLl9uYW1lLFxuICAgICAgaWQgPSB0aGlzLl9pZDtcblxuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvckFsbChzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IFtdLCBwYXJlbnRzID0gW10sIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIGZvciAodmFyIGNoaWxkcmVuID0gc2VsZWN0LmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApLCBjaGlsZCwgaW5oZXJpdCA9IGdldChub2RlLCBpZCksIGsgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBrIDwgbDsgKytrKSB7XG4gICAgICAgICAgaWYgKGNoaWxkID0gY2hpbGRyZW5ba10pIHtcbiAgICAgICAgICAgIHNjaGVkdWxlKGNoaWxkLCBuYW1lLCBpZCwgaywgY2hpbGRyZW4sIGluaGVyaXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdWJncm91cHMucHVzaChjaGlsZHJlbik7XG4gICAgICAgIHBhcmVudHMucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFRyYW5zaXRpb24oc3ViZ3JvdXBzLCBwYXJlbnRzLCBuYW1lLCBpZCk7XG59XG4iLCJpbXBvcnQge3NlbGVjdGlvbn0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuXG52YXIgU2VsZWN0aW9uID0gc2VsZWN0aW9uLnByb3RvdHlwZS5jb25zdHJ1Y3RvcjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHRoaXMuX2dyb3VwcywgdGhpcy5fcGFyZW50cyk7XG59XG4iLCJpbXBvcnQge2ludGVycG9sYXRlVHJhbnNmb3JtQ3NzIGFzIGludGVycG9sYXRlVHJhbnNmb3JtfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcbmltcG9ydCB7c3R5bGV9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7dHdlZW5WYWx1ZX0gZnJvbSBcIi4vdHdlZW5cIjtcbmltcG9ydCBpbnRlcnBvbGF0ZSBmcm9tIFwiLi9pbnRlcnBvbGF0ZVwiO1xuXG5mdW5jdGlvbiBzdHlsZVJlbW92ZShuYW1lLCBpbnRlcnBvbGF0ZSkge1xuICB2YXIgdmFsdWUwMCxcbiAgICAgIHZhbHVlMTAsXG4gICAgICBpbnRlcnBvbGF0ZTA7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUwID0gc3R5bGUodGhpcywgbmFtZSksXG4gICAgICAgIHZhbHVlMSA9ICh0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpLCBzdHlsZSh0aGlzLCBuYW1lKSk7XG4gICAgcmV0dXJuIHZhbHVlMCA9PT0gdmFsdWUxID8gbnVsbFxuICAgICAgICA6IHZhbHVlMCA9PT0gdmFsdWUwMCAmJiB2YWx1ZTEgPT09IHZhbHVlMTAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEwID0gdmFsdWUxKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVSZW1vdmVFbmQobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVDb25zdGFudChuYW1lLCBpbnRlcnBvbGF0ZSwgdmFsdWUxKSB7XG4gIHZhciB2YWx1ZTAwLFxuICAgICAgaW50ZXJwb2xhdGUwO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlMCA9IHN0eWxlKHRoaXMsIG5hbWUpO1xuICAgIHJldHVybiB2YWx1ZTAgPT09IHZhbHVlMSA/IG51bGxcbiAgICAgICAgOiB2YWx1ZTAgPT09IHZhbHVlMDAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzdHlsZUZ1bmN0aW9uKG5hbWUsIGludGVycG9sYXRlLCB2YWx1ZSkge1xuICB2YXIgdmFsdWUwMCxcbiAgICAgIHZhbHVlMTAsXG4gICAgICBpbnRlcnBvbGF0ZTA7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUwID0gc3R5bGUodGhpcywgbmFtZSksXG4gICAgICAgIHZhbHVlMSA9IHZhbHVlKHRoaXMpO1xuICAgIGlmICh2YWx1ZTEgPT0gbnVsbCkgdmFsdWUxID0gKHRoaXMuc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSksIHN0eWxlKHRoaXMsIG5hbWUpKTtcbiAgICByZXR1cm4gdmFsdWUwID09PSB2YWx1ZTEgPyBudWxsXG4gICAgICAgIDogdmFsdWUwID09PSB2YWx1ZTAwICYmIHZhbHVlMSA9PT0gdmFsdWUxMCA/IGludGVycG9sYXRlMFxuICAgICAgICA6IGludGVycG9sYXRlMCA9IGludGVycG9sYXRlKHZhbHVlMDAgPSB2YWx1ZTAsIHZhbHVlMTAgPSB2YWx1ZTEpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgdmFyIGkgPSAobmFtZSArPSBcIlwiKSA9PT0gXCJ0cmFuc2Zvcm1cIiA/IGludGVycG9sYXRlVHJhbnNmb3JtIDogaW50ZXJwb2xhdGU7XG4gIHJldHVybiB2YWx1ZSA9PSBudWxsID8gdGhpc1xuICAgICAgICAgIC5zdHlsZVR3ZWVuKG5hbWUsIHN0eWxlUmVtb3ZlKG5hbWUsIGkpKVxuICAgICAgICAgIC5vbihcImVuZC5zdHlsZS5cIiArIG5hbWUsIHN0eWxlUmVtb3ZlRW5kKG5hbWUpKVxuICAgICAgOiB0aGlzLnN0eWxlVHdlZW4obmFtZSwgdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IHN0eWxlRnVuY3Rpb24obmFtZSwgaSwgdHdlZW5WYWx1ZSh0aGlzLCBcInN0eWxlLlwiICsgbmFtZSwgdmFsdWUpKVxuICAgICAgICAgIDogc3R5bGVDb25zdGFudChuYW1lLCBpLCB2YWx1ZSArIFwiXCIpLCBwcmlvcml0eSk7XG59XG4iLCJmdW5jdGlvbiBzdHlsZVR3ZWVuKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICBmdW5jdGlvbiB0d2VlbigpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMsIGkgPSB2YWx1ZS5hcHBseShub2RlLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiBpICYmIGZ1bmN0aW9uKHQpIHtcbiAgICAgIG5vZGUuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgaSh0KSwgcHJpb3JpdHkpO1xuICAgIH07XG4gIH1cbiAgdHdlZW4uX3ZhbHVlID0gdmFsdWU7XG4gIHJldHVybiB0d2Vlbjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIHZhciBrZXkgPSBcInN0eWxlLlwiICsgKG5hbWUgKz0gXCJcIik7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikgcmV0dXJuIChrZXkgPSB0aGlzLnR3ZWVuKGtleSkpICYmIGtleS5fdmFsdWU7XG4gIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gdGhpcy50d2VlbihrZXksIG51bGwpO1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcjtcbiAgcmV0dXJuIHRoaXMudHdlZW4oa2V5LCBzdHlsZVR3ZWVuKG5hbWUsIHZhbHVlLCBwcmlvcml0eSA9PSBudWxsID8gXCJcIiA6IHByaW9yaXR5KSk7XG59XG4iLCJpbXBvcnQge3R3ZWVuVmFsdWV9IGZyb20gXCIuL3R3ZWVuXCI7XG5cbmZ1bmN0aW9uIHRleHRDb25zdGFudCh2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50ZXh0Q29udGVudCA9IHZhbHVlO1xuICB9O1xufVxuXG5mdW5jdGlvbiB0ZXh0RnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZTEgPSB2YWx1ZSh0aGlzKTtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gdmFsdWUxID09IG51bGwgPyBcIlwiIDogdmFsdWUxO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdGhpcy50d2VlbihcInRleHRcIiwgdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gdGV4dEZ1bmN0aW9uKHR3ZWVuVmFsdWUodGhpcywgXCJ0ZXh0XCIsIHZhbHVlKSlcbiAgICAgIDogdGV4dENvbnN0YW50KHZhbHVlID09IG51bGwgPyBcIlwiIDogdmFsdWUgKyBcIlwiKSk7XG59XG4iLCJpbXBvcnQge1RyYW5zaXRpb24sIG5ld0lkfSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IHNjaGVkdWxlLCB7Z2V0fSBmcm9tIFwiLi9zY2hlZHVsZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgdmFyIG5hbWUgPSB0aGlzLl9uYW1lLFxuICAgICAgaWQwID0gdGhpcy5faWQsXG4gICAgICBpZDEgPSBuZXdJZCgpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHZhciBpbmhlcml0ID0gZ2V0KG5vZGUsIGlkMCk7XG4gICAgICAgIHNjaGVkdWxlKG5vZGUsIG5hbWUsIGlkMSwgaSwgZ3JvdXAsIHtcbiAgICAgICAgICB0aW1lOiBpbmhlcml0LnRpbWUgKyBpbmhlcml0LmRlbGF5ICsgaW5oZXJpdC5kdXJhdGlvbixcbiAgICAgICAgICBkZWxheTogMCxcbiAgICAgICAgICBkdXJhdGlvbjogaW5oZXJpdC5kdXJhdGlvbixcbiAgICAgICAgICBlYXNlOiBpbmhlcml0LmVhc2VcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBUcmFuc2l0aW9uKGdyb3VwcywgdGhpcy5fcGFyZW50cywgbmFtZSwgaWQxKTtcbn1cbiIsImltcG9ydCB7c2VsZWN0aW9ufSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9hdHRyIGZyb20gXCIuL2F0dHJcIjtcbmltcG9ydCB0cmFuc2l0aW9uX2F0dHJUd2VlbiBmcm9tIFwiLi9hdHRyVHdlZW5cIjtcbmltcG9ydCB0cmFuc2l0aW9uX2RlbGF5IGZyb20gXCIuL2RlbGF5XCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9kdXJhdGlvbiBmcm9tIFwiLi9kdXJhdGlvblwiO1xuaW1wb3J0IHRyYW5zaXRpb25fZWFzZSBmcm9tIFwiLi9lYXNlXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9maWx0ZXIgZnJvbSBcIi4vZmlsdGVyXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9tZXJnZSBmcm9tIFwiLi9tZXJnZVwiO1xuaW1wb3J0IHRyYW5zaXRpb25fb24gZnJvbSBcIi4vb25cIjtcbmltcG9ydCB0cmFuc2l0aW9uX3JlbW92ZSBmcm9tIFwiLi9yZW1vdmVcIjtcbmltcG9ydCB0cmFuc2l0aW9uX3NlbGVjdCBmcm9tIFwiLi9zZWxlY3RcIjtcbmltcG9ydCB0cmFuc2l0aW9uX3NlbGVjdEFsbCBmcm9tIFwiLi9zZWxlY3RBbGxcIjtcbmltcG9ydCB0cmFuc2l0aW9uX3NlbGVjdGlvbiBmcm9tIFwiLi9zZWxlY3Rpb25cIjtcbmltcG9ydCB0cmFuc2l0aW9uX3N0eWxlIGZyb20gXCIuL3N0eWxlXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9zdHlsZVR3ZWVuIGZyb20gXCIuL3N0eWxlVHdlZW5cIjtcbmltcG9ydCB0cmFuc2l0aW9uX3RleHQgZnJvbSBcIi4vdGV4dFwiO1xuaW1wb3J0IHRyYW5zaXRpb25fdHJhbnNpdGlvbiBmcm9tIFwiLi90cmFuc2l0aW9uXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl90d2VlbiBmcm9tIFwiLi90d2VlblwiO1xuXG52YXIgaWQgPSAwO1xuXG5leHBvcnQgZnVuY3Rpb24gVHJhbnNpdGlvbihncm91cHMsIHBhcmVudHMsIG5hbWUsIGlkKSB7XG4gIHRoaXMuX2dyb3VwcyA9IGdyb3VwcztcbiAgdGhpcy5fcGFyZW50cyA9IHBhcmVudHM7XG4gIHRoaXMuX25hbWUgPSBuYW1lO1xuICB0aGlzLl9pZCA9IGlkO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0cmFuc2l0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIHNlbGVjdGlvbigpLnRyYW5zaXRpb24obmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBuZXdJZCgpIHtcbiAgcmV0dXJuICsraWQ7XG59XG5cbnZhciBzZWxlY3Rpb25fcHJvdG90eXBlID0gc2VsZWN0aW9uLnByb3RvdHlwZTtcblxuVHJhbnNpdGlvbi5wcm90b3R5cGUgPSB0cmFuc2l0aW9uLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IFRyYW5zaXRpb24sXG4gIHNlbGVjdDogdHJhbnNpdGlvbl9zZWxlY3QsXG4gIHNlbGVjdEFsbDogdHJhbnNpdGlvbl9zZWxlY3RBbGwsXG4gIGZpbHRlcjogdHJhbnNpdGlvbl9maWx0ZXIsXG4gIG1lcmdlOiB0cmFuc2l0aW9uX21lcmdlLFxuICBzZWxlY3Rpb246IHRyYW5zaXRpb25fc2VsZWN0aW9uLFxuICB0cmFuc2l0aW9uOiB0cmFuc2l0aW9uX3RyYW5zaXRpb24sXG4gIGNhbGw6IHNlbGVjdGlvbl9wcm90b3R5cGUuY2FsbCxcbiAgbm9kZXM6IHNlbGVjdGlvbl9wcm90b3R5cGUubm9kZXMsXG4gIG5vZGU6IHNlbGVjdGlvbl9wcm90b3R5cGUubm9kZSxcbiAgc2l6ZTogc2VsZWN0aW9uX3Byb3RvdHlwZS5zaXplLFxuICBlbXB0eTogc2VsZWN0aW9uX3Byb3RvdHlwZS5lbXB0eSxcbiAgZWFjaDogc2VsZWN0aW9uX3Byb3RvdHlwZS5lYWNoLFxuICBvbjogdHJhbnNpdGlvbl9vbixcbiAgYXR0cjogdHJhbnNpdGlvbl9hdHRyLFxuICBhdHRyVHdlZW46IHRyYW5zaXRpb25fYXR0clR3ZWVuLFxuICBzdHlsZTogdHJhbnNpdGlvbl9zdHlsZSxcbiAgc3R5bGVUd2VlbjogdHJhbnNpdGlvbl9zdHlsZVR3ZWVuLFxuICB0ZXh0OiB0cmFuc2l0aW9uX3RleHQsXG4gIHJlbW92ZTogdHJhbnNpdGlvbl9yZW1vdmUsXG4gIHR3ZWVuOiB0cmFuc2l0aW9uX3R3ZWVuLFxuICBkZWxheTogdHJhbnNpdGlvbl9kZWxheSxcbiAgZHVyYXRpb246IHRyYW5zaXRpb25fZHVyYXRpb24sXG4gIGVhc2U6IHRyYW5zaXRpb25fZWFzZVxufTtcbiIsImV4cG9ydCBmdW5jdGlvbiBjdWJpY0luKHQpIHtcbiAgcmV0dXJuIHQgKiB0ICogdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGN1YmljT3V0KHQpIHtcbiAgcmV0dXJuIC0tdCAqIHQgKiB0ICsgMTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGN1YmljSW5PdXQodCkge1xuICByZXR1cm4gKCh0ICo9IDIpIDw9IDEgPyB0ICogdCAqIHQgOiAodCAtPSAyKSAqIHQgKiB0ICsgMikgLyAyO1xufVxuIiwiaW1wb3J0IHtUcmFuc2l0aW9uLCBuZXdJZH0gZnJvbSBcIi4uL3RyYW5zaXRpb24vaW5kZXhcIjtcbmltcG9ydCBzY2hlZHVsZSBmcm9tIFwiLi4vdHJhbnNpdGlvbi9zY2hlZHVsZVwiO1xuaW1wb3J0IHtlYXNlQ3ViaWNJbk91dH0gZnJvbSBcImQzLWVhc2VcIjtcbmltcG9ydCB7bm93fSBmcm9tIFwiZDMtdGltZXJcIjtcblxudmFyIGRlZmF1bHRUaW1pbmcgPSB7XG4gIHRpbWU6IG51bGwsIC8vIFNldCBvbiB1c2UuXG4gIGRlbGF5OiAwLFxuICBkdXJhdGlvbjogMjUwLFxuICBlYXNlOiBlYXNlQ3ViaWNJbk91dFxufTtcblxuZnVuY3Rpb24gaW5oZXJpdChub2RlLCBpZCkge1xuICB2YXIgdGltaW5nO1xuICB3aGlsZSAoISh0aW1pbmcgPSBub2RlLl9fdHJhbnNpdGlvbikgfHwgISh0aW1pbmcgPSB0aW1pbmdbaWRdKSkge1xuICAgIGlmICghKG5vZGUgPSBub2RlLnBhcmVudE5vZGUpKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdFRpbWluZy50aW1lID0gbm93KCksIGRlZmF1bHRUaW1pbmc7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aW1pbmc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGlkLFxuICAgICAgdGltaW5nO1xuXG4gIGlmIChuYW1lIGluc3RhbmNlb2YgVHJhbnNpdGlvbikge1xuICAgIGlkID0gbmFtZS5faWQsIG5hbWUgPSBuYW1lLl9uYW1lO1xuICB9IGVsc2Uge1xuICAgIGlkID0gbmV3SWQoKSwgKHRpbWluZyA9IGRlZmF1bHRUaW1pbmcpLnRpbWUgPSBub3coKSwgbmFtZSA9IG5hbWUgPT0gbnVsbCA/IG51bGwgOiBuYW1lICsgXCJcIjtcbiAgfVxuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHNjaGVkdWxlKG5vZGUsIG5hbWUsIGlkLCBpLCBncm91cCwgdGltaW5nIHx8IGluaGVyaXQobm9kZSwgaWQpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFRyYW5zaXRpb24oZ3JvdXBzLCB0aGlzLl9wYXJlbnRzLCBuYW1lLCBpZCk7XG59XG4iLCJpbXBvcnQge3NlbGVjdGlvbn0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHNlbGVjdGlvbl9pbnRlcnJ1cHQgZnJvbSBcIi4vaW50ZXJydXB0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX3RyYW5zaXRpb24gZnJvbSBcIi4vdHJhbnNpdGlvblwiO1xuXG5zZWxlY3Rpb24ucHJvdG90eXBlLmludGVycnVwdCA9IHNlbGVjdGlvbl9pbnRlcnJ1cHQ7XG5zZWxlY3Rpb24ucHJvdG90eXBlLnRyYW5zaXRpb24gPSBzZWxlY3Rpb25fdHJhbnNpdGlvbjtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB4O1xuICB9O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odGFyZ2V0LCB0eXBlLCBzZWxlY3Rpb24pIHtcbiAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMudHlwZSA9IHR5cGU7XG4gIHRoaXMuc2VsZWN0aW9uID0gc2VsZWN0aW9uO1xufVxuIiwiaW1wb3J0IHtldmVudH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuXG5leHBvcnQgZnVuY3Rpb24gbm9wcm9wYWdhdGlvbigpIHtcbiAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICBldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbn1cbiIsImltcG9ydCB7ZGlzcGF0Y2h9IGZyb20gXCJkMy1kaXNwYXRjaFwiO1xuaW1wb3J0IHtkcmFnRGlzYWJsZSwgZHJhZ0VuYWJsZX0gZnJvbSBcImQzLWRyYWdcIjtcbmltcG9ydCB7aW50ZXJwb2xhdGV9IGZyb20gXCJkMy1pbnRlcnBvbGF0ZVwiO1xuaW1wb3J0IHtjdXN0b21FdmVudCwgZXZlbnQsIG1vdXNlLCBzZWxlY3R9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7aW50ZXJydXB0fSBmcm9tIFwiZDMtdHJhbnNpdGlvblwiO1xuaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuL2NvbnN0YW50XCI7XG5pbXBvcnQgQnJ1c2hFdmVudCBmcm9tIFwiLi9ldmVudFwiO1xuaW1wb3J0IG5vZXZlbnQsIHtub3Byb3BhZ2F0aW9ufSBmcm9tIFwiLi9ub2V2ZW50XCI7XG5cbnZhciBNT0RFX0RSQUcgPSB7bmFtZTogXCJkcmFnXCJ9LFxuICAgIE1PREVfU1BBQ0UgPSB7bmFtZTogXCJzcGFjZVwifSxcbiAgICBNT0RFX0hBTkRMRSA9IHtuYW1lOiBcImhhbmRsZVwifSxcbiAgICBNT0RFX0NFTlRFUiA9IHtuYW1lOiBcImNlbnRlclwifTtcblxudmFyIFggPSB7XG4gIG5hbWU6IFwieFwiLFxuICBoYW5kbGVzOiBbXCJlXCIsIFwid1wiXS5tYXAodHlwZSksXG4gIGlucHV0OiBmdW5jdGlvbih4LCBlKSB7IHJldHVybiB4ICYmIFtbeFswXSwgZVswXVsxXV0sIFt4WzFdLCBlWzFdWzFdXV07IH0sXG4gIG91dHB1dDogZnVuY3Rpb24oeHkpIHsgcmV0dXJuIHh5ICYmIFt4eVswXVswXSwgeHlbMV1bMF1dOyB9XG59O1xuXG52YXIgWSA9IHtcbiAgbmFtZTogXCJ5XCIsXG4gIGhhbmRsZXM6IFtcIm5cIiwgXCJzXCJdLm1hcCh0eXBlKSxcbiAgaW5wdXQ6IGZ1bmN0aW9uKHksIGUpIHsgcmV0dXJuIHkgJiYgW1tlWzBdWzBdLCB5WzBdXSwgW2VbMV1bMF0sIHlbMV1dXTsgfSxcbiAgb3V0cHV0OiBmdW5jdGlvbih4eSkgeyByZXR1cm4geHkgJiYgW3h5WzBdWzFdLCB4eVsxXVsxXV07IH1cbn07XG5cbnZhciBYWSA9IHtcbiAgbmFtZTogXCJ4eVwiLFxuICBoYW5kbGVzOiBbXCJuXCIsIFwiZVwiLCBcInNcIiwgXCJ3XCIsIFwibndcIiwgXCJuZVwiLCBcInNlXCIsIFwic3dcIl0ubWFwKHR5cGUpLFxuICBpbnB1dDogZnVuY3Rpb24oeHkpIHsgcmV0dXJuIHh5OyB9LFxuICBvdXRwdXQ6IGZ1bmN0aW9uKHh5KSB7IHJldHVybiB4eTsgfVxufTtcblxudmFyIGN1cnNvcnMgPSB7XG4gIG92ZXJsYXk6IFwiY3Jvc3NoYWlyXCIsXG4gIHNlbGVjdGlvbjogXCJtb3ZlXCIsXG4gIG46IFwibnMtcmVzaXplXCIsXG4gIGU6IFwiZXctcmVzaXplXCIsXG4gIHM6IFwibnMtcmVzaXplXCIsXG4gIHc6IFwiZXctcmVzaXplXCIsXG4gIG53OiBcIm53c2UtcmVzaXplXCIsXG4gIG5lOiBcIm5lc3ctcmVzaXplXCIsXG4gIHNlOiBcIm53c2UtcmVzaXplXCIsXG4gIHN3OiBcIm5lc3ctcmVzaXplXCJcbn07XG5cbnZhciBmbGlwWCA9IHtcbiAgZTogXCJ3XCIsXG4gIHc6IFwiZVwiLFxuICBudzogXCJuZVwiLFxuICBuZTogXCJud1wiLFxuICBzZTogXCJzd1wiLFxuICBzdzogXCJzZVwiXG59O1xuXG52YXIgZmxpcFkgPSB7XG4gIG46IFwic1wiLFxuICBzOiBcIm5cIixcbiAgbnc6IFwic3dcIixcbiAgbmU6IFwic2VcIixcbiAgc2U6IFwibmVcIixcbiAgc3c6IFwibndcIlxufTtcblxudmFyIHNpZ25zWCA9IHtcbiAgb3ZlcmxheTogKzEsXG4gIHNlbGVjdGlvbjogKzEsXG4gIG46IG51bGwsXG4gIGU6ICsxLFxuICBzOiBudWxsLFxuICB3OiAtMSxcbiAgbnc6IC0xLFxuICBuZTogKzEsXG4gIHNlOiArMSxcbiAgc3c6IC0xXG59O1xuXG52YXIgc2lnbnNZID0ge1xuICBvdmVybGF5OiArMSxcbiAgc2VsZWN0aW9uOiArMSxcbiAgbjogLTEsXG4gIGU6IG51bGwsXG4gIHM6ICsxLFxuICB3OiBudWxsLFxuICBudzogLTEsXG4gIG5lOiAtMSxcbiAgc2U6ICsxLFxuICBzdzogKzFcbn07XG5cbmZ1bmN0aW9uIHR5cGUodCkge1xuICByZXR1cm4ge3R5cGU6IHR9O1xufVxuXG4vLyBJZ25vcmUgcmlnaHQtY2xpY2ssIHNpbmNlIHRoYXQgc2hvdWxkIG9wZW4gdGhlIGNvbnRleHQgbWVudS5cbmZ1bmN0aW9uIGRlZmF1bHRGaWx0ZXIoKSB7XG4gIHJldHVybiAhZXZlbnQuYnV0dG9uO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0RXh0ZW50KCkge1xuICB2YXIgc3ZnID0gdGhpcy5vd25lclNWR0VsZW1lbnQgfHwgdGhpcztcbiAgcmV0dXJuIFtbMCwgMF0sIFtzdmcud2lkdGguYmFzZVZhbC52YWx1ZSwgc3ZnLmhlaWdodC5iYXNlVmFsLnZhbHVlXV07XG59XG5cbi8vIExpa2UgZDMubG9jYWwsIGJ1dCB3aXRoIHRoZSBuYW1lIOKAnF9fYnJ1c2jigJ0gcmF0aGVyIHRoYW4gYXV0by1nZW5lcmF0ZWQuXG5mdW5jdGlvbiBsb2NhbChub2RlKSB7XG4gIHdoaWxlICghbm9kZS5fX2JydXNoKSBpZiAoIShub2RlID0gbm9kZS5wYXJlbnROb2RlKSkgcmV0dXJuO1xuICByZXR1cm4gbm9kZS5fX2JydXNoO1xufVxuXG5mdW5jdGlvbiBlbXB0eShleHRlbnQpIHtcbiAgcmV0dXJuIGV4dGVudFswXVswXSA9PT0gZXh0ZW50WzFdWzBdXG4gICAgICB8fCBleHRlbnRbMF1bMV0gPT09IGV4dGVudFsxXVsxXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJydXNoU2VsZWN0aW9uKG5vZGUpIHtcbiAgdmFyIHN0YXRlID0gbm9kZS5fX2JydXNoO1xuICByZXR1cm4gc3RhdGUgPyBzdGF0ZS5kaW0ub3V0cHV0KHN0YXRlLnNlbGVjdGlvbikgOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnJ1c2hYKCkge1xuICByZXR1cm4gYnJ1c2goWCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBicnVzaFkoKSB7XG4gIHJldHVybiBicnVzaChZKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBicnVzaChYWSk7XG59XG5cbmZ1bmN0aW9uIGJydXNoKGRpbSkge1xuICB2YXIgZXh0ZW50ID0gZGVmYXVsdEV4dGVudCxcbiAgICAgIGZpbHRlciA9IGRlZmF1bHRGaWx0ZXIsXG4gICAgICBsaXN0ZW5lcnMgPSBkaXNwYXRjaChicnVzaCwgXCJzdGFydFwiLCBcImJydXNoXCIsIFwiZW5kXCIpLFxuICAgICAgaGFuZGxlU2l6ZSA9IDYsXG4gICAgICB0b3VjaGVuZGluZztcblxuICBmdW5jdGlvbiBicnVzaChncm91cCkge1xuICAgIHZhciBvdmVybGF5ID0gZ3JvdXBcbiAgICAgICAgLnByb3BlcnR5KFwiX19icnVzaFwiLCBpbml0aWFsaXplKVxuICAgICAgLnNlbGVjdEFsbChcIi5vdmVybGF5XCIpXG4gICAgICAuZGF0YShbdHlwZShcIm92ZXJsYXlcIildKTtcblxuICAgIG92ZXJsYXkuZW50ZXIoKS5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJvdmVybGF5XCIpXG4gICAgICAgIC5hdHRyKFwicG9pbnRlci1ldmVudHNcIiwgXCJhbGxcIilcbiAgICAgICAgLmF0dHIoXCJjdXJzb3JcIiwgY3Vyc29ycy5vdmVybGF5KVxuICAgICAgLm1lcmdlKG92ZXJsYXkpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBleHRlbnQgPSBsb2NhbCh0aGlzKS5leHRlbnQ7XG4gICAgICAgICAgc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgIC5hdHRyKFwieFwiLCBleHRlbnRbMF1bMF0pXG4gICAgICAgICAgICAgIC5hdHRyKFwieVwiLCBleHRlbnRbMF1bMV0pXG4gICAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZXh0ZW50WzFdWzBdIC0gZXh0ZW50WzBdWzBdKVxuICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBleHRlbnRbMV1bMV0gLSBleHRlbnRbMF1bMV0pO1xuICAgICAgICB9KTtcblxuICAgIGdyb3VwLnNlbGVjdEFsbChcIi5zZWxlY3Rpb25cIilcbiAgICAgIC5kYXRhKFt0eXBlKFwic2VsZWN0aW9uXCIpXSlcbiAgICAgIC5lbnRlcigpLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInNlbGVjdGlvblwiKVxuICAgICAgICAuYXR0cihcImN1cnNvclwiLCBjdXJzb3JzLnNlbGVjdGlvbilcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwiIzc3N1wiKVxuICAgICAgICAuYXR0cihcImZpbGwtb3BhY2l0eVwiLCAwLjMpXG4gICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwiI2ZmZlwiKVxuICAgICAgICAuYXR0cihcInNoYXBlLXJlbmRlcmluZ1wiLCBcImNyaXNwRWRnZXNcIik7XG5cbiAgICB2YXIgaGFuZGxlID0gZ3JvdXAuc2VsZWN0QWxsKFwiLmhhbmRsZVwiKVxuICAgICAgLmRhdGEoZGltLmhhbmRsZXMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudHlwZTsgfSk7XG5cbiAgICBoYW5kbGUuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgaGFuZGxlLmVudGVyKCkuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwiaGFuZGxlIGhhbmRsZS0tXCIgKyBkLnR5cGU7IH0pXG4gICAgICAgIC5hdHRyKFwiY3Vyc29yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGN1cnNvcnNbZC50eXBlXTsgfSk7XG5cbiAgICBncm91cFxuICAgICAgICAuZWFjaChyZWRyYXcpXG4gICAgICAgIC5hdHRyKFwiZmlsbFwiLCBcIm5vbmVcIilcbiAgICAgICAgLmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcImFsbFwiKVxuICAgICAgICAuc3R5bGUoXCItd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3JcIiwgXCJyZ2JhKDAsMCwwLDApXCIpXG4gICAgICAgIC5vbihcIm1vdXNlZG93bi5icnVzaCB0b3VjaHN0YXJ0LmJydXNoXCIsIHN0YXJ0ZWQpO1xuICB9XG5cbiAgYnJ1c2gubW92ZSA9IGZ1bmN0aW9uKGdyb3VwLCBzZWxlY3Rpb24pIHtcbiAgICBpZiAoZ3JvdXAuc2VsZWN0aW9uKSB7XG4gICAgICBncm91cFxuICAgICAgICAgIC5vbihcInN0YXJ0LmJydXNoXCIsIGZ1bmN0aW9uKCkgeyBlbWl0dGVyKHRoaXMsIGFyZ3VtZW50cykuYmVmb3Jlc3RhcnQoKS5zdGFydCgpOyB9KVxuICAgICAgICAgIC5vbihcImludGVycnVwdC5icnVzaCBlbmQuYnJ1c2hcIiwgZnVuY3Rpb24oKSB7IGVtaXR0ZXIodGhpcywgYXJndW1lbnRzKS5lbmQoKTsgfSlcbiAgICAgICAgICAudHdlZW4oXCJicnVzaFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcyxcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IHRoYXQuX19icnVzaCxcbiAgICAgICAgICAgICAgICBlbWl0ID0gZW1pdHRlcih0aGF0LCBhcmd1bWVudHMpLFxuICAgICAgICAgICAgICAgIHNlbGVjdGlvbjAgPSBzdGF0ZS5zZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgc2VsZWN0aW9uMSA9IGRpbS5pbnB1dCh0eXBlb2Ygc2VsZWN0aW9uID09PSBcImZ1bmN0aW9uXCIgPyBzZWxlY3Rpb24uYXBwbHkodGhpcywgYXJndW1lbnRzKSA6IHNlbGVjdGlvbiwgc3RhdGUuZXh0ZW50KSxcbiAgICAgICAgICAgICAgICBpID0gaW50ZXJwb2xhdGUoc2VsZWN0aW9uMCwgc2VsZWN0aW9uMSk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHR3ZWVuKHQpIHtcbiAgICAgICAgICAgICAgc3RhdGUuc2VsZWN0aW9uID0gdCA9PT0gMSAmJiBlbXB0eShzZWxlY3Rpb24xKSA/IG51bGwgOiBpKHQpO1xuICAgICAgICAgICAgICByZWRyYXcuY2FsbCh0aGF0KTtcbiAgICAgICAgICAgICAgZW1pdC5icnVzaCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2VsZWN0aW9uMCAmJiBzZWxlY3Rpb24xID8gdHdlZW4gOiB0d2VlbigxKTtcbiAgICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZ3JvdXBcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcyxcbiAgICAgICAgICAgICAgICBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgICAgICAgICAgIHN0YXRlID0gdGhhdC5fX2JydXNoLFxuICAgICAgICAgICAgICAgIHNlbGVjdGlvbjEgPSBkaW0uaW5wdXQodHlwZW9mIHNlbGVjdGlvbiA9PT0gXCJmdW5jdGlvblwiID8gc2VsZWN0aW9uLmFwcGx5KHRoYXQsIGFyZ3MpIDogc2VsZWN0aW9uLCBzdGF0ZS5leHRlbnQpLFxuICAgICAgICAgICAgICAgIGVtaXQgPSBlbWl0dGVyKHRoYXQsIGFyZ3MpLmJlZm9yZXN0YXJ0KCk7XG5cbiAgICAgICAgICAgIGludGVycnVwdCh0aGF0KTtcbiAgICAgICAgICAgIHN0YXRlLnNlbGVjdGlvbiA9IHNlbGVjdGlvbjEgPT0gbnVsbCB8fCBlbXB0eShzZWxlY3Rpb24xKSA/IG51bGwgOiBzZWxlY3Rpb24xO1xuICAgICAgICAgICAgcmVkcmF3LmNhbGwodGhhdCk7XG4gICAgICAgICAgICBlbWl0LnN0YXJ0KCkuYnJ1c2goKS5lbmQoKTtcbiAgICAgICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgZnVuY3Rpb24gcmVkcmF3KCkge1xuICAgIHZhciBncm91cCA9IHNlbGVjdCh0aGlzKSxcbiAgICAgICAgc2VsZWN0aW9uID0gbG9jYWwodGhpcykuc2VsZWN0aW9uO1xuXG4gICAgaWYgKHNlbGVjdGlvbikge1xuICAgICAgZ3JvdXAuc2VsZWN0QWxsKFwiLnNlbGVjdGlvblwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgbnVsbClcbiAgICAgICAgICAuYXR0cihcInhcIiwgc2VsZWN0aW9uWzBdWzBdKVxuICAgICAgICAgIC5hdHRyKFwieVwiLCBzZWxlY3Rpb25bMF1bMV0pXG4gICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBzZWxlY3Rpb25bMV1bMF0gLSBzZWxlY3Rpb25bMF1bMF0pXG4gICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgc2VsZWN0aW9uWzFdWzFdIC0gc2VsZWN0aW9uWzBdWzFdKTtcblxuICAgICAgZ3JvdXAuc2VsZWN0QWxsKFwiLmhhbmRsZVwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgbnVsbClcbiAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50eXBlW2QudHlwZS5sZW5ndGggLSAxXSA9PT0gXCJlXCIgPyBzZWxlY3Rpb25bMV1bMF0gLSBoYW5kbGVTaXplIC8gMiA6IHNlbGVjdGlvblswXVswXSAtIGhhbmRsZVNpemUgLyAyOyB9KVxuICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnR5cGVbMF0gPT09IFwic1wiID8gc2VsZWN0aW9uWzFdWzFdIC0gaGFuZGxlU2l6ZSAvIDIgOiBzZWxlY3Rpb25bMF1bMV0gLSBoYW5kbGVTaXplIC8gMjsgfSlcbiAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudHlwZSA9PT0gXCJuXCIgfHwgZC50eXBlID09PSBcInNcIiA/IHNlbGVjdGlvblsxXVswXSAtIHNlbGVjdGlvblswXVswXSArIGhhbmRsZVNpemUgOiBoYW5kbGVTaXplOyB9KVxuICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudHlwZSA9PT0gXCJlXCIgfHwgZC50eXBlID09PSBcIndcIiA/IHNlbGVjdGlvblsxXVsxXSAtIHNlbGVjdGlvblswXVsxXSArIGhhbmRsZVNpemUgOiBoYW5kbGVTaXplOyB9KTtcbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIGdyb3VwLnNlbGVjdEFsbChcIi5zZWxlY3Rpb24sLmhhbmRsZVwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgXCJub25lXCIpXG4gICAgICAgICAgLmF0dHIoXCJ4XCIsIG51bGwpXG4gICAgICAgICAgLmF0dHIoXCJ5XCIsIG51bGwpXG4gICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBudWxsKVxuICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGVtaXR0ZXIodGhhdCwgYXJncykge1xuICAgIHJldHVybiB0aGF0Ll9fYnJ1c2guZW1pdHRlciB8fCBuZXcgRW1pdHRlcih0aGF0LCBhcmdzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIEVtaXR0ZXIodGhhdCwgYXJncykge1xuICAgIHRoaXMudGhhdCA9IHRoYXQ7XG4gICAgdGhpcy5hcmdzID0gYXJncztcbiAgICB0aGlzLnN0YXRlID0gdGhhdC5fX2JydXNoO1xuICAgIHRoaXMuYWN0aXZlID0gMDtcbiAgfVxuXG4gIEVtaXR0ZXIucHJvdG90eXBlID0ge1xuICAgIGJlZm9yZXN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgrK3RoaXMuYWN0aXZlID09PSAxKSB0aGlzLnN0YXRlLmVtaXR0ZXIgPSB0aGlzLCB0aGlzLnN0YXJ0aW5nID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuc3RhcnRpbmcpIHRoaXMuc3RhcnRpbmcgPSBmYWxzZSwgdGhpcy5lbWl0KFwic3RhcnRcIik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGJydXNoOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZW1pdChcImJydXNoXCIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBlbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGhpcy5hY3RpdmUgPT09IDApIGRlbGV0ZSB0aGlzLnN0YXRlLmVtaXR0ZXIsIHRoaXMuZW1pdChcImVuZFwiKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZW1pdDogZnVuY3Rpb24odHlwZSkge1xuICAgICAgY3VzdG9tRXZlbnQobmV3IEJydXNoRXZlbnQoYnJ1c2gsIHR5cGUsIGRpbS5vdXRwdXQodGhpcy5zdGF0ZS5zZWxlY3Rpb24pKSwgbGlzdGVuZXJzLmFwcGx5LCBsaXN0ZW5lcnMsIFt0eXBlLCB0aGlzLnRoYXQsIHRoaXMuYXJnc10pO1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBzdGFydGVkKCkge1xuICAgIGlmIChldmVudC50b3VjaGVzKSB7IGlmIChldmVudC5jaGFuZ2VkVG91Y2hlcy5sZW5ndGggPCBldmVudC50b3VjaGVzLmxlbmd0aCkgcmV0dXJuIG5vZXZlbnQoKTsgfVxuICAgIGVsc2UgaWYgKHRvdWNoZW5kaW5nKSByZXR1cm47XG4gICAgaWYgKCFmaWx0ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSkgcmV0dXJuO1xuXG4gICAgdmFyIHRoYXQgPSB0aGlzLFxuICAgICAgICB0eXBlID0gZXZlbnQudGFyZ2V0Ll9fZGF0YV9fLnR5cGUsXG4gICAgICAgIG1vZGUgPSAoZXZlbnQubWV0YUtleSA/IHR5cGUgPSBcIm92ZXJsYXlcIiA6IHR5cGUpID09PSBcInNlbGVjdGlvblwiID8gTU9ERV9EUkFHIDogKGV2ZW50LmFsdEtleSA/IE1PREVfQ0VOVEVSIDogTU9ERV9IQU5ETEUpLFxuICAgICAgICBzaWduWCA9IGRpbSA9PT0gWSA/IG51bGwgOiBzaWduc1hbdHlwZV0sXG4gICAgICAgIHNpZ25ZID0gZGltID09PSBYID8gbnVsbCA6IHNpZ25zWVt0eXBlXSxcbiAgICAgICAgc3RhdGUgPSBsb2NhbCh0aGF0KSxcbiAgICAgICAgZXh0ZW50ID0gc3RhdGUuZXh0ZW50LFxuICAgICAgICBzZWxlY3Rpb24gPSBzdGF0ZS5zZWxlY3Rpb24sXG4gICAgICAgIFcgPSBleHRlbnRbMF1bMF0sIHcwLCB3MSxcbiAgICAgICAgTiA9IGV4dGVudFswXVsxXSwgbjAsIG4xLFxuICAgICAgICBFID0gZXh0ZW50WzFdWzBdLCBlMCwgZTEsXG4gICAgICAgIFMgPSBleHRlbnRbMV1bMV0sIHMwLCBzMSxcbiAgICAgICAgZHgsXG4gICAgICAgIGR5LFxuICAgICAgICBtb3ZpbmcsXG4gICAgICAgIHNoaWZ0aW5nID0gc2lnblggJiYgc2lnblkgJiYgZXZlbnQuc2hpZnRLZXksXG4gICAgICAgIGxvY2tYLFxuICAgICAgICBsb2NrWSxcbiAgICAgICAgcG9pbnQwID0gbW91c2UodGhhdCksXG4gICAgICAgIHBvaW50ID0gcG9pbnQwLFxuICAgICAgICBlbWl0ID0gZW1pdHRlcih0aGF0LCBhcmd1bWVudHMpLmJlZm9yZXN0YXJ0KCk7XG5cbiAgICBpZiAodHlwZSA9PT0gXCJvdmVybGF5XCIpIHtcbiAgICAgIHN0YXRlLnNlbGVjdGlvbiA9IHNlbGVjdGlvbiA9IFtcbiAgICAgICAgW3cwID0gZGltID09PSBZID8gVyA6IHBvaW50MFswXSwgbjAgPSBkaW0gPT09IFggPyBOIDogcG9pbnQwWzFdXSxcbiAgICAgICAgW2UwID0gZGltID09PSBZID8gRSA6IHcwLCBzMCA9IGRpbSA9PT0gWCA/IFMgOiBuMF1cbiAgICAgIF07XG4gICAgfSBlbHNlIHtcbiAgICAgIHcwID0gc2VsZWN0aW9uWzBdWzBdO1xuICAgICAgbjAgPSBzZWxlY3Rpb25bMF1bMV07XG4gICAgICBlMCA9IHNlbGVjdGlvblsxXVswXTtcbiAgICAgIHMwID0gc2VsZWN0aW9uWzFdWzFdO1xuICAgIH1cblxuICAgIHcxID0gdzA7XG4gICAgbjEgPSBuMDtcbiAgICBlMSA9IGUwO1xuICAgIHMxID0gczA7XG5cbiAgICB2YXIgZ3JvdXAgPSBzZWxlY3QodGhhdClcbiAgICAgICAgLmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcIm5vbmVcIik7XG5cbiAgICB2YXIgb3ZlcmxheSA9IGdyb3VwLnNlbGVjdEFsbChcIi5vdmVybGF5XCIpXG4gICAgICAgIC5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnNbdHlwZV0pO1xuXG4gICAgaWYgKGV2ZW50LnRvdWNoZXMpIHtcbiAgICAgIGdyb3VwXG4gICAgICAgICAgLm9uKFwidG91Y2htb3ZlLmJydXNoXCIsIG1vdmVkLCB0cnVlKVxuICAgICAgICAgIC5vbihcInRvdWNoZW5kLmJydXNoIHRvdWNoY2FuY2VsLmJydXNoXCIsIGVuZGVkLCB0cnVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHZpZXcgPSBzZWxlY3QoZXZlbnQudmlldylcbiAgICAgICAgICAub24oXCJrZXlkb3duLmJydXNoXCIsIGtleWRvd25lZCwgdHJ1ZSlcbiAgICAgICAgICAub24oXCJrZXl1cC5icnVzaFwiLCBrZXl1cHBlZCwgdHJ1ZSlcbiAgICAgICAgICAub24oXCJtb3VzZW1vdmUuYnJ1c2hcIiwgbW92ZWQsIHRydWUpXG4gICAgICAgICAgLm9uKFwibW91c2V1cC5icnVzaFwiLCBlbmRlZCwgdHJ1ZSk7XG5cbiAgICAgIGRyYWdEaXNhYmxlKGV2ZW50LnZpZXcpO1xuICAgIH1cblxuICAgIG5vcHJvcGFnYXRpb24oKTtcbiAgICBpbnRlcnJ1cHQodGhhdCk7XG4gICAgcmVkcmF3LmNhbGwodGhhdCk7XG4gICAgZW1pdC5zdGFydCgpO1xuXG4gICAgZnVuY3Rpb24gbW92ZWQoKSB7XG4gICAgICB2YXIgcG9pbnQxID0gbW91c2UodGhhdCk7XG4gICAgICBpZiAoc2hpZnRpbmcgJiYgIWxvY2tYICYmICFsb2NrWSkge1xuICAgICAgICBpZiAoTWF0aC5hYnMocG9pbnQxWzBdIC0gcG9pbnRbMF0pID4gTWF0aC5hYnMocG9pbnQxWzFdIC0gcG9pbnRbMV0pKSBsb2NrWSA9IHRydWU7XG4gICAgICAgIGVsc2UgbG9ja1ggPSB0cnVlO1xuICAgICAgfVxuICAgICAgcG9pbnQgPSBwb2ludDE7XG4gICAgICBtb3ZpbmcgPSB0cnVlO1xuICAgICAgbm9ldmVudCgpO1xuICAgICAgbW92ZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdmUoKSB7XG4gICAgICB2YXIgdDtcblxuICAgICAgZHggPSBwb2ludFswXSAtIHBvaW50MFswXTtcbiAgICAgIGR5ID0gcG9pbnRbMV0gLSBwb2ludDBbMV07XG5cbiAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICBjYXNlIE1PREVfU1BBQ0U6XG4gICAgICAgIGNhc2UgTU9ERV9EUkFHOiB7XG4gICAgICAgICAgaWYgKHNpZ25YKSBkeCA9IE1hdGgubWF4KFcgLSB3MCwgTWF0aC5taW4oRSAtIGUwLCBkeCkpLCB3MSA9IHcwICsgZHgsIGUxID0gZTAgKyBkeDtcbiAgICAgICAgICBpZiAoc2lnblkpIGR5ID0gTWF0aC5tYXgoTiAtIG4wLCBNYXRoLm1pbihTIC0gczAsIGR5KSksIG4xID0gbjAgKyBkeSwgczEgPSBzMCArIGR5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgTU9ERV9IQU5ETEU6IHtcbiAgICAgICAgICBpZiAoc2lnblggPCAwKSBkeCA9IE1hdGgubWF4KFcgLSB3MCwgTWF0aC5taW4oRSAtIHcwLCBkeCkpLCB3MSA9IHcwICsgZHgsIGUxID0gZTA7XG4gICAgICAgICAgZWxzZSBpZiAoc2lnblggPiAwKSBkeCA9IE1hdGgubWF4KFcgLSBlMCwgTWF0aC5taW4oRSAtIGUwLCBkeCkpLCB3MSA9IHcwLCBlMSA9IGUwICsgZHg7XG4gICAgICAgICAgaWYgKHNpZ25ZIDwgMCkgZHkgPSBNYXRoLm1heChOIC0gbjAsIE1hdGgubWluKFMgLSBuMCwgZHkpKSwgbjEgPSBuMCArIGR5LCBzMSA9IHMwO1xuICAgICAgICAgIGVsc2UgaWYgKHNpZ25ZID4gMCkgZHkgPSBNYXRoLm1heChOIC0gczAsIE1hdGgubWluKFMgLSBzMCwgZHkpKSwgbjEgPSBuMCwgczEgPSBzMCArIGR5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgTU9ERV9DRU5URVI6IHtcbiAgICAgICAgICBpZiAoc2lnblgpIHcxID0gTWF0aC5tYXgoVywgTWF0aC5taW4oRSwgdzAgLSBkeCAqIHNpZ25YKSksIGUxID0gTWF0aC5tYXgoVywgTWF0aC5taW4oRSwgZTAgKyBkeCAqIHNpZ25YKSk7XG4gICAgICAgICAgaWYgKHNpZ25ZKSBuMSA9IE1hdGgubWF4KE4sIE1hdGgubWluKFMsIG4wIC0gZHkgKiBzaWduWSkpLCBzMSA9IE1hdGgubWF4KE4sIE1hdGgubWluKFMsIHMwICsgZHkgKiBzaWduWSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChlMSA8IHcxKSB7XG4gICAgICAgIHNpZ25YICo9IC0xO1xuICAgICAgICB0ID0gdzAsIHcwID0gZTAsIGUwID0gdDtcbiAgICAgICAgdCA9IHcxLCB3MSA9IGUxLCBlMSA9IHQ7XG4gICAgICAgIGlmICh0eXBlIGluIGZsaXBYKSBvdmVybGF5LmF0dHIoXCJjdXJzb3JcIiwgY3Vyc29yc1t0eXBlID0gZmxpcFhbdHlwZV1dKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHMxIDwgbjEpIHtcbiAgICAgICAgc2lnblkgKj0gLTE7XG4gICAgICAgIHQgPSBuMCwgbjAgPSBzMCwgczAgPSB0O1xuICAgICAgICB0ID0gbjEsIG4xID0gczEsIHMxID0gdDtcbiAgICAgICAgaWYgKHR5cGUgaW4gZmxpcFkpIG92ZXJsYXkuYXR0cihcImN1cnNvclwiLCBjdXJzb3JzW3R5cGUgPSBmbGlwWVt0eXBlXV0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3RhdGUuc2VsZWN0aW9uKSBzZWxlY3Rpb24gPSBzdGF0ZS5zZWxlY3Rpb247IC8vIE1heSBiZSBzZXQgYnkgYnJ1c2gubW92ZSFcbiAgICAgIGlmIChsb2NrWCkgdzEgPSBzZWxlY3Rpb25bMF1bMF0sIGUxID0gc2VsZWN0aW9uWzFdWzBdO1xuICAgICAgaWYgKGxvY2tZKSBuMSA9IHNlbGVjdGlvblswXVsxXSwgczEgPSBzZWxlY3Rpb25bMV1bMV07XG5cbiAgICAgIGlmIChzZWxlY3Rpb25bMF1bMF0gIT09IHcxXG4gICAgICAgICAgfHwgc2VsZWN0aW9uWzBdWzFdICE9PSBuMVxuICAgICAgICAgIHx8IHNlbGVjdGlvblsxXVswXSAhPT0gZTFcbiAgICAgICAgICB8fCBzZWxlY3Rpb25bMV1bMV0gIT09IHMxKSB7XG4gICAgICAgIHN0YXRlLnNlbGVjdGlvbiA9IFtbdzEsIG4xXSwgW2UxLCBzMV1dO1xuICAgICAgICByZWRyYXcuY2FsbCh0aGF0KTtcbiAgICAgICAgZW1pdC5icnVzaCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVuZGVkKCkge1xuICAgICAgbm9wcm9wYWdhdGlvbigpO1xuICAgICAgaWYgKGV2ZW50LnRvdWNoZXMpIHtcbiAgICAgICAgaWYgKGV2ZW50LnRvdWNoZXMubGVuZ3RoKSByZXR1cm47XG4gICAgICAgIGlmICh0b3VjaGVuZGluZykgY2xlYXJUaW1lb3V0KHRvdWNoZW5kaW5nKTtcbiAgICAgICAgdG91Y2hlbmRpbmcgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0b3VjaGVuZGluZyA9IG51bGw7IH0sIDUwMCk7IC8vIEdob3N0IGNsaWNrcyBhcmUgZGVsYXllZCFcbiAgICAgICAgZ3JvdXAub24oXCJ0b3VjaG1vdmUuYnJ1c2ggdG91Y2hlbmQuYnJ1c2ggdG91Y2hjYW5jZWwuYnJ1c2hcIiwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkcmFnRW5hYmxlKGV2ZW50LnZpZXcsIG1vdmluZyk7XG4gICAgICAgIHZpZXcub24oXCJrZXlkb3duLmJydXNoIGtleXVwLmJydXNoIG1vdXNlbW92ZS5icnVzaCBtb3VzZXVwLmJydXNoXCIsIG51bGwpO1xuICAgICAgfVxuICAgICAgZ3JvdXAuYXR0cihcInBvaW50ZXItZXZlbnRzXCIsIFwiYWxsXCIpO1xuICAgICAgb3ZlcmxheS5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnMub3ZlcmxheSk7XG4gICAgICBpZiAoc3RhdGUuc2VsZWN0aW9uKSBzZWxlY3Rpb24gPSBzdGF0ZS5zZWxlY3Rpb247IC8vIE1heSBiZSBzZXQgYnkgYnJ1c2gubW92ZSAob24gc3RhcnQpIVxuICAgICAgaWYgKGVtcHR5KHNlbGVjdGlvbikpIHN0YXRlLnNlbGVjdGlvbiA9IG51bGwsIHJlZHJhdy5jYWxsKHRoYXQpO1xuICAgICAgZW1pdC5lbmQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBrZXlkb3duZWQoKSB7XG4gICAgICBzd2l0Y2ggKGV2ZW50LmtleUNvZGUpIHtcbiAgICAgICAgY2FzZSAxNjogeyAvLyBTSElGVFxuICAgICAgICAgIHNoaWZ0aW5nID0gc2lnblggJiYgc2lnblk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAxODogeyAvLyBBTFRcbiAgICAgICAgICBpZiAobW9kZSA9PT0gTU9ERV9IQU5ETEUpIHtcbiAgICAgICAgICAgIGlmIChzaWduWCkgZTAgPSBlMSAtIGR4ICogc2lnblgsIHcwID0gdzEgKyBkeCAqIHNpZ25YO1xuICAgICAgICAgICAgaWYgKHNpZ25ZKSBzMCA9IHMxIC0gZHkgKiBzaWduWSwgbjAgPSBuMSArIGR5ICogc2lnblk7XG4gICAgICAgICAgICBtb2RlID0gTU9ERV9DRU5URVI7XG4gICAgICAgICAgICBtb3ZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgMzI6IHsgLy8gU1BBQ0U7IHRha2VzIHByaW9yaXR5IG92ZXIgQUxUXG4gICAgICAgICAgaWYgKG1vZGUgPT09IE1PREVfSEFORExFIHx8IG1vZGUgPT09IE1PREVfQ0VOVEVSKSB7XG4gICAgICAgICAgICBpZiAoc2lnblggPCAwKSBlMCA9IGUxIC0gZHg7IGVsc2UgaWYgKHNpZ25YID4gMCkgdzAgPSB3MSAtIGR4O1xuICAgICAgICAgICAgaWYgKHNpZ25ZIDwgMCkgczAgPSBzMSAtIGR5OyBlbHNlIGlmIChzaWduWSA+IDApIG4wID0gbjEgLSBkeTtcbiAgICAgICAgICAgIG1vZGUgPSBNT0RFX1NQQUNFO1xuICAgICAgICAgICAgb3ZlcmxheS5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnMuc2VsZWN0aW9uKTtcbiAgICAgICAgICAgIG1vdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDogcmV0dXJuO1xuICAgICAgfVxuICAgICAgbm9ldmVudCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGtleXVwcGVkKCkge1xuICAgICAgc3dpdGNoIChldmVudC5rZXlDb2RlKSB7XG4gICAgICAgIGNhc2UgMTY6IHsgLy8gU0hJRlRcbiAgICAgICAgICBpZiAoc2hpZnRpbmcpIHtcbiAgICAgICAgICAgIGxvY2tYID0gbG9ja1kgPSBzaGlmdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIDE4OiB7IC8vIEFMVFxuICAgICAgICAgIGlmIChtb2RlID09PSBNT0RFX0NFTlRFUikge1xuICAgICAgICAgICAgaWYgKHNpZ25YIDwgMCkgZTAgPSBlMTsgZWxzZSBpZiAoc2lnblggPiAwKSB3MCA9IHcxO1xuICAgICAgICAgICAgaWYgKHNpZ25ZIDwgMCkgczAgPSBzMTsgZWxzZSBpZiAoc2lnblkgPiAwKSBuMCA9IG4xO1xuICAgICAgICAgICAgbW9kZSA9IE1PREVfSEFORExFO1xuICAgICAgICAgICAgbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIDMyOiB7IC8vIFNQQUNFXG4gICAgICAgICAgaWYgKG1vZGUgPT09IE1PREVfU1BBQ0UpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5hbHRLZXkpIHtcbiAgICAgICAgICAgICAgaWYgKHNpZ25YKSBlMCA9IGUxIC0gZHggKiBzaWduWCwgdzAgPSB3MSArIGR4ICogc2lnblg7XG4gICAgICAgICAgICAgIGlmIChzaWduWSkgczAgPSBzMSAtIGR5ICogc2lnblksIG4wID0gbjEgKyBkeSAqIHNpZ25ZO1xuICAgICAgICAgICAgICBtb2RlID0gTU9ERV9DRU5URVI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZiAoc2lnblggPCAwKSBlMCA9IGUxOyBlbHNlIGlmIChzaWduWCA+IDApIHcwID0gdzE7XG4gICAgICAgICAgICAgIGlmIChzaWduWSA8IDApIHMwID0gczE7IGVsc2UgaWYgKHNpZ25ZID4gMCkgbjAgPSBuMTtcbiAgICAgICAgICAgICAgbW9kZSA9IE1PREVfSEFORExFO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3ZlcmxheS5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnNbdHlwZV0pO1xuICAgICAgICAgICAgbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiByZXR1cm47XG4gICAgICB9XG4gICAgICBub2V2ZW50KCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICB2YXIgc3RhdGUgPSB0aGlzLl9fYnJ1c2ggfHwge3NlbGVjdGlvbjogbnVsbH07XG4gICAgc3RhdGUuZXh0ZW50ID0gZXh0ZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgc3RhdGUuZGltID0gZGltO1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfVxuXG4gIGJydXNoLmV4dGVudCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChleHRlbnQgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KFtbK19bMF1bMF0sICtfWzBdWzFdXSwgWytfWzFdWzBdLCArX1sxXVsxXV1dKSwgYnJ1c2gpIDogZXh0ZW50O1xuICB9O1xuXG4gIGJydXNoLmZpbHRlciA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChmaWx0ZXIgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCEhXyksIGJydXNoKSA6IGZpbHRlcjtcbiAgfTtcblxuICBicnVzaC5oYW5kbGVTaXplID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGhhbmRsZVNpemUgPSArXywgYnJ1c2gpIDogaGFuZGxlU2l6ZTtcbiAgfTtcblxuICBicnVzaC5vbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZSA9IGxpc3RlbmVycy5vbi5hcHBseShsaXN0ZW5lcnMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHZhbHVlID09PSBsaXN0ZW5lcnMgPyBicnVzaCA6IHZhbHVlO1xuICB9O1xuXG4gIHJldHVybiBicnVzaDtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiBhID49IGIgPyAwIDogTmFOO1xufVxuIiwiaW1wb3J0IGFzY2VuZGluZyBmcm9tIFwiLi9hc2NlbmRpbmdcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29tcGFyZSkge1xuICBpZiAoY29tcGFyZS5sZW5ndGggPT09IDEpIGNvbXBhcmUgPSBhc2NlbmRpbmdDb21wYXJhdG9yKGNvbXBhcmUpO1xuICByZXR1cm4ge1xuICAgIGxlZnQ6IGZ1bmN0aW9uKGEsIHgsIGxvLCBoaSkge1xuICAgICAgaWYgKGxvID09IG51bGwpIGxvID0gMDtcbiAgICAgIGlmIChoaSA9PSBudWxsKSBoaSA9IGEubGVuZ3RoO1xuICAgICAgd2hpbGUgKGxvIDwgaGkpIHtcbiAgICAgICAgdmFyIG1pZCA9IGxvICsgaGkgPj4+IDE7XG4gICAgICAgIGlmIChjb21wYXJlKGFbbWlkXSwgeCkgPCAwKSBsbyA9IG1pZCArIDE7XG4gICAgICAgIGVsc2UgaGkgPSBtaWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gbG87XG4gICAgfSxcbiAgICByaWdodDogZnVuY3Rpb24oYSwgeCwgbG8sIGhpKSB7XG4gICAgICBpZiAobG8gPT0gbnVsbCkgbG8gPSAwO1xuICAgICAgaWYgKGhpID09IG51bGwpIGhpID0gYS5sZW5ndGg7XG4gICAgICB3aGlsZSAobG8gPCBoaSkge1xuICAgICAgICB2YXIgbWlkID0gbG8gKyBoaSA+Pj4gMTtcbiAgICAgICAgaWYgKGNvbXBhcmUoYVttaWRdLCB4KSA+IDApIGhpID0gbWlkO1xuICAgICAgICBlbHNlIGxvID0gbWlkICsgMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsbztcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZ0NvbXBhcmF0b3IoZikge1xuICByZXR1cm4gZnVuY3Rpb24oZCwgeCkge1xuICAgIHJldHVybiBhc2NlbmRpbmcoZihkKSwgeCk7XG4gIH07XG59XG4iLCJpbXBvcnQgYXNjZW5kaW5nIGZyb20gXCIuL2FzY2VuZGluZ1wiO1xuaW1wb3J0IGJpc2VjdG9yIGZyb20gXCIuL2Jpc2VjdG9yXCI7XG5cbnZhciBhc2NlbmRpbmdCaXNlY3QgPSBiaXNlY3Rvcihhc2NlbmRpbmcpO1xuZXhwb3J0IHZhciBiaXNlY3RSaWdodCA9IGFzY2VuZGluZ0Jpc2VjdC5yaWdodDtcbmV4cG9ydCB2YXIgYmlzZWN0TGVmdCA9IGFzY2VuZGluZ0Jpc2VjdC5sZWZ0O1xuZXhwb3J0IGRlZmF1bHQgYmlzZWN0UmlnaHQ7XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICBzdGFydCA9ICtzdGFydCwgc3RvcCA9ICtzdG9wLCBzdGVwID0gKG4gPSBhcmd1bWVudHMubGVuZ3RoKSA8IDIgPyAoc3RvcCA9IHN0YXJ0LCBzdGFydCA9IDAsIDEpIDogbiA8IDMgPyAxIDogK3N0ZXA7XG5cbiAgdmFyIGkgPSAtMSxcbiAgICAgIG4gPSBNYXRoLm1heCgwLCBNYXRoLmNlaWwoKHN0b3AgLSBzdGFydCkgLyBzdGVwKSkgfCAwLFxuICAgICAgcmFuZ2UgPSBuZXcgQXJyYXkobik7XG5cbiAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICByYW5nZVtpXSA9IHN0YXJ0ICsgaSAqIHN0ZXA7XG4gIH1cblxuICByZXR1cm4gcmFuZ2U7XG59XG4iLCJ2YXIgZTEwID0gTWF0aC5zcXJ0KDUwKSxcbiAgICBlNSA9IE1hdGguc3FydCgxMCksXG4gICAgZTIgPSBNYXRoLnNxcnQoMik7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBjb3VudCkge1xuICB2YXIgcmV2ZXJzZSxcbiAgICAgIGkgPSAtMSxcbiAgICAgIG4sXG4gICAgICB0aWNrcyxcbiAgICAgIHN0ZXA7XG5cbiAgc3RvcCA9ICtzdG9wLCBzdGFydCA9ICtzdGFydCwgY291bnQgPSArY291bnQ7XG4gIGlmIChzdGFydCA9PT0gc3RvcCAmJiBjb3VudCA+IDApIHJldHVybiBbc3RhcnRdO1xuICBpZiAocmV2ZXJzZSA9IHN0b3AgPCBzdGFydCkgbiA9IHN0YXJ0LCBzdGFydCA9IHN0b3AsIHN0b3AgPSBuO1xuICBpZiAoKHN0ZXAgPSB0aWNrSW5jcmVtZW50KHN0YXJ0LCBzdG9wLCBjb3VudCkpID09PSAwIHx8ICFpc0Zpbml0ZShzdGVwKSkgcmV0dXJuIFtdO1xuXG4gIGlmIChzdGVwID4gMCkge1xuICAgIHN0YXJ0ID0gTWF0aC5jZWlsKHN0YXJ0IC8gc3RlcCk7XG4gICAgc3RvcCA9IE1hdGguZmxvb3Ioc3RvcCAvIHN0ZXApO1xuICAgIHRpY2tzID0gbmV3IEFycmF5KG4gPSBNYXRoLmNlaWwoc3RvcCAtIHN0YXJ0ICsgMSkpO1xuICAgIHdoaWxlICgrK2kgPCBuKSB0aWNrc1tpXSA9IChzdGFydCArIGkpICogc3RlcDtcbiAgfSBlbHNlIHtcbiAgICBzdGFydCA9IE1hdGguZmxvb3Ioc3RhcnQgKiBzdGVwKTtcbiAgICBzdG9wID0gTWF0aC5jZWlsKHN0b3AgKiBzdGVwKTtcbiAgICB0aWNrcyA9IG5ldyBBcnJheShuID0gTWF0aC5jZWlsKHN0YXJ0IC0gc3RvcCArIDEpKTtcbiAgICB3aGlsZSAoKytpIDwgbikgdGlja3NbaV0gPSAoc3RhcnQgLSBpKSAvIHN0ZXA7XG4gIH1cblxuICBpZiAocmV2ZXJzZSkgdGlja3MucmV2ZXJzZSgpO1xuXG4gIHJldHVybiB0aWNrcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRpY2tJbmNyZW1lbnQoc3RhcnQsIHN0b3AsIGNvdW50KSB7XG4gIHZhciBzdGVwID0gKHN0b3AgLSBzdGFydCkgLyBNYXRoLm1heCgwLCBjb3VudCksXG4gICAgICBwb3dlciA9IE1hdGguZmxvb3IoTWF0aC5sb2coc3RlcCkgLyBNYXRoLkxOMTApLFxuICAgICAgZXJyb3IgPSBzdGVwIC8gTWF0aC5wb3coMTAsIHBvd2VyKTtcbiAgcmV0dXJuIHBvd2VyID49IDBcbiAgICAgID8gKGVycm9yID49IGUxMCA/IDEwIDogZXJyb3IgPj0gZTUgPyA1IDogZXJyb3IgPj0gZTIgPyAyIDogMSkgKiBNYXRoLnBvdygxMCwgcG93ZXIpXG4gICAgICA6IC1NYXRoLnBvdygxMCwgLXBvd2VyKSAvIChlcnJvciA+PSBlMTAgPyAxMCA6IGVycm9yID49IGU1ID8gNSA6IGVycm9yID49IGUyID8gMiA6IDEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGlja1N0ZXAoc3RhcnQsIHN0b3AsIGNvdW50KSB7XG4gIHZhciBzdGVwMCA9IE1hdGguYWJzKHN0b3AgLSBzdGFydCkgLyBNYXRoLm1heCgwLCBjb3VudCksXG4gICAgICBzdGVwMSA9IE1hdGgucG93KDEwLCBNYXRoLmZsb29yKE1hdGgubG9nKHN0ZXAwKSAvIE1hdGguTE4xMCkpLFxuICAgICAgZXJyb3IgPSBzdGVwMCAvIHN0ZXAxO1xuICBpZiAoZXJyb3IgPj0gZTEwKSBzdGVwMSAqPSAxMDtcbiAgZWxzZSBpZiAoZXJyb3IgPj0gZTUpIHN0ZXAxICo9IDU7XG4gIGVsc2UgaWYgKGVycm9yID49IGUyKSBzdGVwMSAqPSAyO1xuICByZXR1cm4gc3RvcCA8IHN0YXJ0ID8gLXN0ZXAxIDogc3RlcDE7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlb2YpIHtcbiAgdmFyIG4gPSB2YWx1ZXMubGVuZ3RoLFxuICAgICAgaSA9IC0xLFxuICAgICAgdmFsdWUsXG4gICAgICBtYXg7XG5cbiAgaWYgKHZhbHVlb2YgPT0gbnVsbCkge1xuICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIEZpbmQgdGhlIGZpcnN0IGNvbXBhcmFibGUgdmFsdWUuXG4gICAgICBpZiAoKHZhbHVlID0gdmFsdWVzW2ldKSAhPSBudWxsICYmIHZhbHVlID49IHZhbHVlKSB7XG4gICAgICAgIG1heCA9IHZhbHVlO1xuICAgICAgICB3aGlsZSAoKytpIDwgbikgeyAvLyBDb21wYXJlIHRoZSByZW1haW5pbmcgdmFsdWVzLlxuICAgICAgICAgIGlmICgodmFsdWUgPSB2YWx1ZXNbaV0pICE9IG51bGwgJiYgdmFsdWUgPiBtYXgpIHtcbiAgICAgICAgICAgIG1heCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGVsc2Uge1xuICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIEZpbmQgdGhlIGZpcnN0IGNvbXBhcmFibGUgdmFsdWUuXG4gICAgICBpZiAoKHZhbHVlID0gdmFsdWVvZih2YWx1ZXNbaV0sIGksIHZhbHVlcykpICE9IG51bGwgJiYgdmFsdWUgPj0gdmFsdWUpIHtcbiAgICAgICAgbWF4ID0gdmFsdWU7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIENvbXBhcmUgdGhlIHJlbWFpbmluZyB2YWx1ZXMuXG4gICAgICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlb2YodmFsdWVzW2ldLCBpLCB2YWx1ZXMpKSAhPSBudWxsICYmIHZhbHVlID4gbWF4KSB7XG4gICAgICAgICAgICBtYXggPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWF4O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWVzLCB2YWx1ZW9mKSB7XG4gIHZhciBuID0gdmFsdWVzLmxlbmd0aCxcbiAgICAgIGkgPSAtMSxcbiAgICAgIHZhbHVlLFxuICAgICAgbWluO1xuXG4gIGlmICh2YWx1ZW9mID09IG51bGwpIHtcbiAgICB3aGlsZSAoKytpIDwgbikgeyAvLyBGaW5kIHRoZSBmaXJzdCBjb21wYXJhYmxlIHZhbHVlLlxuICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlc1tpXSkgIT0gbnVsbCAmJiB2YWx1ZSA+PSB2YWx1ZSkge1xuICAgICAgICBtaW4gPSB2YWx1ZTtcbiAgICAgICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gQ29tcGFyZSB0aGUgcmVtYWluaW5nIHZhbHVlcy5cbiAgICAgICAgICBpZiAoKHZhbHVlID0gdmFsdWVzW2ldKSAhPSBudWxsICYmIG1pbiA+IHZhbHVlKSB7XG4gICAgICAgICAgICBtaW4gPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBlbHNlIHtcbiAgICB3aGlsZSAoKytpIDwgbikgeyAvLyBGaW5kIHRoZSBmaXJzdCBjb21wYXJhYmxlIHZhbHVlLlxuICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlb2YodmFsdWVzW2ldLCBpLCB2YWx1ZXMpKSAhPSBudWxsICYmIHZhbHVlID49IHZhbHVlKSB7XG4gICAgICAgIG1pbiA9IHZhbHVlO1xuICAgICAgICB3aGlsZSAoKytpIDwgbikgeyAvLyBDb21wYXJlIHRoZSByZW1haW5pbmcgdmFsdWVzLlxuICAgICAgICAgIGlmICgodmFsdWUgPSB2YWx1ZW9mKHZhbHVlc1tpXSwgaSwgdmFsdWVzKSkgIT0gbnVsbCAmJiBtaW4gPiB2YWx1ZSkge1xuICAgICAgICAgICAgbWluID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1pbjtcbn1cbiIsIi8qKlxuICogQ29weXJpZ2h0IMKpIDIwMTUgLSAyMDE4IFRoZSBCcm9hZCBJbnN0aXR1dGUsIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBCU0QgMy1jbGF1c2UgbGljZW5zZSAoaHR0cHM6Ly9naXRodWIuY29tL2Jyb2FkaW5zdGl0dXRlL2d0ZXgtdml6L2Jsb2IvbWFzdGVyL0xJQ0VOU0UubWQpXG4gKi9cbi8qKlxuICogQ3JlYXRlcyBhbiBTVkdcbiAqIEBwYXJhbSBpZCB7U3RyaW5nfSBhIERPTSBlbGVtZW50IElEIHRoYXQgc3RhcnRzIHdpdGggYSBcIiNcIlxuICogQHBhcmFtIHdpZHRoIHtOdW1lcmljfVxuICogQHBhcmFtIGhlaWdodCB7TnVtZXJpY31cbiAqIEBwYXJhbSBtYXJnaW4ge09iamVjdH0gd2l0aCB0d28gYXR0cmlidXRlczogd2lkdGggYW5kIGhlaWdodFxuICogQHJldHVybiB7U2VsZWN0aW9ufSB0aGUgZDMgc2VsZWN0aW9uIG9iamVjdCBvZiB0aGUgU1ZHXG4gKi9cblxuaW1wb3J0IHtzZWxlY3R9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7cmFuZ2V9IGZyb20gXCJkMy1hcnJheVwiO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0RvbUlkKGlkKXtcbiAgICAvLyB0ZXN0IGlucHV0IHBhcmFtc1xuICAgIGlmICgkKGAjJHtpZH1gKS5sZW5ndGggPT0gMCkge1xuICAgICAgICBsZXQgZXJyb3IgPSBgSW5wdXQgRXJyb3I6IERPTSBJRCAke2lkfSBpcyBub3QgZm91bmQuYDtcbiAgICAgICAgYWxlcnQoZXJyb3IpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgQ2FudmFzIEQzIG9iamVjdFxuICogQHBhcmFtIGlkIHtTdHJpbmd9IHRoZSBwYXJlbnQgZG9tIElEXG4gKiBAcGFyYW0gd2lkdGgge051bWVyaWN9OiB0aGUgb3V0ZXIgd2lkdGhcbiAqIEBwYXJhbSBoZWlnaHQge051bWVyaWN9OiB0aGUgb3V0ZXIgaGVpZ2h0XG4gKiBAcGFyYW0gbWFyZ2luIHtPYmplY3R9IHdpdGggYXR0cjogbGVmdCwgdG9wXG4gKiBAcGFyYW0gY2FudmFzSWQge1N0cmluZ31cbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ2FudmFzKGlkLCB3aWR0aCwgaGVpZ2h0LCBtYXJnaW4sIGNhbnZhc0lkPXVuZGVmaW5lZCwgcG9zaXRpb249XCJhYnNvbHV0ZVwiKXtcbiAgICBjaGVja0RvbUlkKGlkKTtcbiAgICBpZihjYW52YXNJZD09PXVuZGVmaW5lZCkgY2FudmFzSWQ9YCR7aWR9LWNhbnZhc2A7XG4gICAgcmV0dXJuIHNlbGVjdChgIyR7aWR9YClcbiAgICAgICAgLmFwcGVuZChcImNhbnZhc1wiKVxuICAgICAgICAuYXR0cignaWQnLCBjYW52YXNJZClcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgICAgICAuc3R5bGUoXCJwb3NpdGlvblwiLCBwb3NpdGlvbikgLy8gVE9ETzogc2hvdWxkIHRoZSBwb3NpdGlvbiBiZSB1c2VyLWRlZmluZWQ/IHJlbGF0aXZlIHZzIGFic29sdXRlXG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIFNWRyBEMyBvYmplY3RcbiAqIEBwYXJhbSBpZCB7U3RyaW5nfSB0aGUgcGFyZW50IGRvbSBJRFxuICogQHBhcmFtIHdpZHRoIHtOdW1lcmljfTogdGhlIG91dGVyIHdpZHRoXG4gKiBAcGFyYW0gaGVpZ2h0IHtOdW1lcmljfTogdGhlIG91dGVyIGhlaWdodFxuICogQHBhcmFtIG1hcmdpbiB7T2JqZWN0fSB3aXRoIGF0dHI6IGxlZnQsIHRvcFxuICogQHBhcmFtIHN2Z0lkIHtTdHJpbmd9XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVN2ZyhpZCwgd2lkdGgsIGhlaWdodCwgbWFyZ2luLCBzdmdJZD11bmRlZmluZWQsIHBvc2l0aW9uPVwicmVsYXRpdmVcIil7XG4gICAgY2hlY2tEb21JZChpZCk7XG4gICAgaWYgKHN2Z0lkPT09dW5kZWZpbmVkKSBzdmdJZD1gJHtpZH0tc3ZnYDtcbiAgICByZXR1cm4gc2VsZWN0KFwiI1wiK2lkKS5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgICAgICAuYXR0cihcImlkXCIsIHN2Z0lkKVxuICAgICAgICAvLyAuc3R5bGUoXCJwb3NpdGlvblwiLCBwb3NpdGlvbilcbiAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgke21hcmdpbi5sZWZ0fSwgJHttYXJnaW4udG9wfSlgKVxufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gc3ZnT2JqXG4gKiBAcGFyYW0gZG93bmxvYWRGaWxlTmFtZSB7U3RyaW5nfVxuICogQHBhcmFtIHRlbXBEb3dubG9hZERpdklkIHtTdHJpbmd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkb3dubG9hZFN2ZyhzdmdPYmosIGRvd25sb2FkRmlsZU5hbWUsIHRlbXBEb3dubG9hZERpdklkKXtcbiAgICBjb25zb2xlLmxvZyhzdmdPYmopO1xuICAgIHZhciAkc3ZnQ29weSA9IHN2Z09iai5jbG9uZSgpXG4gICAgLmF0dHIoXCJ2ZXJzaW9uXCIsIFwiMS4xXCIpXG4gICAgLmF0dHIoXCJ4bWxuc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpO1xuXG4gICAgLy8gcGFyc2UgYW5kIGFkZCB0aGUgQ1NTIHN0eWxpbmcgdXNlZCBieSB0aGUgU1ZHXG4gICAgdmFyIHN0eWxlcyA9IHBhcnNlQ3NzU3R5bGVzKHN2Z09iai5nZXQoKSk7XG4gICAgJHN2Z0NvcHkucHJlcGVuZChzdHlsZXMpO1xuXG4gICAgJChcIiNcIiArIHRlbXBEb3dubG9hZERpdklkKS5odG1sKCcnKS5oaWRlKCk7XG4gICAgdmFyIHN2Z0h0bWwgPSAkKFwiI1wiICsgdGVtcERvd25sb2FkRGl2SWQpLmFwcGVuZCgkc3ZnQ29weSkuaHRtbCgpO1xuXG4gICAgdmFyIHN2Z0Jsb2IgPSBuZXcgQmxvYihbc3ZnSHRtbF0sIHt0eXBlOiBcImltYWdlL3N2Zyt4bWxcIn0pO1xuICAgIHNhdmVBcyhzdmdCbG9iLCBkb3dubG9hZEZpbGVOYW1lKTtcblxuICAgIC8vIGNsZWFyIHRoZSB0ZW1wIGRvd25sb2FkIGRpdlxuICAgICQoXCIjXCIgKyB0ZW1wRG93bmxvYWREaXZJZCkuaHRtbCgnJykuaGlkZSgpO1xufVxuLyoqXG4gKiBBIGZ1bmN0aW9uIGZvciBwYXJzaW5nIHRoZSBDU1Mgc3R5bGUgc2hlZXQgYW5kIGluY2x1ZGluZyB0aGUgc3R5bGUgcHJvcGVydGllcyBpbiB0aGUgZG93bmxvYWRhYmxlIFNWRy5cbiAqIEBwYXJhbSBkb21cbiAqIEByZXR1cm5zIHtFbGVtZW50fVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDc3NTdHlsZXMgKGRvbSkge1xuICAgIHZhciB1c2VkID0gXCJcIjtcbiAgICB2YXIgc2hlZXRzID0gZG9jdW1lbnQuc3R5bGVTaGVldHM7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNoZWV0cy5sZW5ndGg7IGkrKykgeyAvLyBUT0RPOiB3YWxrIHRocm91Z2ggdGhpcyBibG9jayBvZiBjb2RlXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChzaGVldHNbaV0uY3NzUnVsZXMgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgICAgICB2YXIgcnVsZXMgPSBzaGVldHNbaV0uY3NzUnVsZXM7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcnVsZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcnVsZSA9IHJ1bGVzW2pdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YocnVsZS5zdHlsZSkgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZWxlbXM7XG4gICAgICAgICAgICAgICAgICAgIC8vU29tZSBzZWxlY3RvcnMgd29uJ3Qgd29yaywgYW5kIG1vc3Qgb2YgdGhlc2UgZG9uJ3QgbWF0dGVyLlxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbXMgPSAkKGRvbSkuZmluZChydWxlLnNlbGVjdG9yVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1zID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXNlZCArPSBydWxlLnNlbGVjdG9yVGV4dCArIFwiIHsgXCIgKyBydWxlLnN0eWxlLmNzc1RleHQgKyBcIiB9XFxuXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIEluIEZpcmVmb3gsIGlmIHN0eWxlc2hlZXQgb3JpZ2luYXRlcyBmcm9tIGEgZGlmZiBkb21haW4sXG4gICAgICAgICAgICAvLyB0cnlpbmcgdG8gYWNjZXNzIHRoZSBjc3NSdWxlcyB3aWxsIHRocm93IGEgU2VjdXJpdHlFcnJvci5cbiAgICAgICAgICAgIC8vIEhlbmNlLCB3ZSBtdXN0IHVzZSBhIHRyeS9jYXRjaCB0byBoYW5kbGUgdGhpcyBpbiBGaXJlZm94XG4gICAgICAgICAgICBpZiAoZS5uYW1lICE9PSAnU2VjdXJpdHlFcnJvcicpIHRocm93IGU7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBzLnNldEF0dHJpYnV0ZSgndHlwZScsICd0ZXh0L2NzcycpO1xuICAgIHMuaW5uZXJIVE1MID0gXCI8IVtDREFUQVtcXG5cIiArIHVzZWQgKyBcIlxcbl1dPlwiO1xuXG4gICAgcmV0dXJuIHM7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYSBsaXN0IG9mIHgqeSBkYXRhIG9iamVjdHMgd2l0aCByYW5kb20gdmFsdWVzXG4gKiBUaGUgZGF0YSBvYmplY3QgaGFzIHRoaXMgc3RydWN0dXJlOiB7eDogeGxhYmVsLCB5OiB5bGFiZWwsIHZhbHVlOiBzb21lIHZhbHVlLCBkaXNwbGF5VmFsdWU6IHNvbWUgdmFsdWV9XG4gKiBAcGFyYW0gcGFyXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVJhbmRvbU1hdHJpeChwYXI9e3g6MjAsIHk6MjAsIHNjYWxlRmFjdG9yOjEsIGRpdmVyZ2luZzpmYWxzZSwgYnViYmxlOmZhbHNlfSl7XG4gICAgbGV0IFggPSByYW5nZSgxLCBwYXIueCsxKTsgLy8gZ2VuZXJhdGVzIGEgMS1iYXNlZCBsaXN0LlxuICAgIGxldCBZID0gcmFuZ2UoMSwgcGFyLnkrMSk7XG4gICAgbGV0IGRhdGEgPSBbXTtcbiAgICBYLmZvckVhY2goKHgpPT57XG4gICAgICAgIHggPSAneCcgKyB4LnRvU3RyaW5nKCk7XG4gICAgICAgIFkuZm9yRWFjaCgoeSk9PntcbiAgICAgICAgICAgIHkgPSAneScgKyB5LnRvU3RyaW5nKCk7XG4gICAgICAgICAgICBsZXQgdiA9IE1hdGgucmFuZG9tKCkqcGFyLnNjYWxlRmFjdG9yO1xuICAgICAgICAgICAgdiA9IHBhci5kaXZlcmdpbmcmJk1hdGgucmFuZG9tKCkgPCAwLjUgPyAtdiA6IHY7IC8vIHJhbmRvbWx5IGFzc2lnbmluZyBuZWdhdGl2ZSBhbmQgcG9zaXRpdmUgdmFsdWVzXG4gICAgICAgICAgICBkYXRhLnB1c2goe1xuICAgICAgICAgICAgICAgIHg6IHgsXG4gICAgICAgICAgICAgICAgeTogeSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogdixcbiAgICAgICAgICAgICAgICBkaXNwbGF5VmFsdWU6IHBhcnNlRmxvYXQodi50b0V4cG9uZW50aWFsKCkpLnRvUHJlY2lzaW9uKDMpLFxuICAgICAgICAgICAgICAgIHI6IHBhci5idWJibGU/TWF0aC5yYW5kb20oKSozMDp1bmRlZmluZWQgLy8gb25seSByZWxldmFudCB0byBidWJibGUgbWFwXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICB9KTtcbiAgICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBhIGxpc3Qgb2YgcmFuZG9tIHZhbHVlc1xuICogQHBhcmFtIHBhclxuICogQHJldHVybnMge0FycmF5fVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVSYW5kb21MaXN0KHBhcj17bjoxMDAsIHNjYWxlRmFjdG9yOjF9KSB7XG4gICAgbGV0IFggPSByYW5nZSgwLCBwYXIubik7IC8vIGdlbmVyYXRlcyBhIDEtYmFzZWQgbGlzdC5cbiAgICBsZXQgZGF0YSA9IFtdO1xuICAgIHJldHVybiBYLm1hcCgoeCkgPT4gTWF0aC5yYW5kb20oKSAqIHBhci5zY2FsZUZhY3Rvcik7XG5cbn0iLCIvKipcbiAqIENvcHlyaWdodCDCqSAyMDE1IC0gMjAxOCBUaGUgQnJvYWQgSW5zdGl0dXRlLCBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQlNEIDMtY2xhdXNlIGxpY2Vuc2UgKGh0dHBzOi8vZ2l0aHViLmNvbS9icm9hZGluc3RpdHV0ZS9ndGV4LXZpei9ibG9iL21hc3Rlci9MSUNFTlNFLm1kKVxuICovXG5cInVzZSBzdHJpY3RcIjtcbmV4cG9ydCBmdW5jdGlvbiBnZXRHdGV4VXJscygpe1xuICAgIGNvbnN0IGhvc3QgPSAnaHR0cHM6Ly9ndGV4cG9ydGFsLm9yZy9yZXN0L3YxLyc7XG4gICAgLy8gY29uc3QgaG9zdCA9ICdsb2NhbC5ndGV4cG9ydGFsLm9yZy9yZXN0L3YxLydcbiAgICByZXR1cm4ge1xuICAgICAgICAvLyBnZW5lLWVxdGwgdmlzdWFsaXplciBzcGVjaWZpY1xuICAgICAgICBzaW5nbGVUaXNzdWVFcXRsOiBob3N0ICsgJ2Fzc29jaWF0aW9uL3NpbmdsZVRpc3N1ZUVxdGw/Zm9ybWF0PWpzb24mZGF0YXNldElkPWd0ZXhfdjcmZ2VuY29kZUlkPScsXG4gICAgICAgIGxkOiBob3N0ICsgJ2RhdGFzZXQvbGQ/Zm9ybWF0PWpzb24mZGF0YXNldElkPWd0ZXhfdjcmZ2VuY29kZUlkPScsXG5cbiAgICAgICAgLy8gZXF0bCBEYXNoYm9hcmQgc3BlY2lmaWNcbiAgICAgICAgZHluZXF0bDogaG9zdCArICdhc3NvY2lhdGlvbi9keW5lcXRsJyxcbiAgICAgICAgc25wOiBob3N0ICsgJ3JlZmVyZW5jZS92YXJpYW50P2Zvcm1hdD1qc29uJnNucElkPScsXG4gICAgICAgIHZhcmlhbnRJZDogaG9zdCArICdkYXRhc2V0L3ZhcmlhbnQ/Zm9ybWF0PWpzb24mdmFyaWFudElkPScsXG5cbiAgICAgICAgLy8gdHJhbnNjcmlwdCwgZXhvbiwganVuY3Rpb24gZXhwcmVzc2lvbiBzcGVjaWZpY1xuICAgICAgICBleG9uRXhwOiBob3N0ICsgJ2V4cHJlc3Npb24vbWVkaWFuRXhvbkV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmaGNsdXN0ZXI9dHJ1ZSZnZW5jb2RlSWQ9JyxcbiAgICAgICAgdHJhbnNjcmlwdEV4cDogaG9zdCArICdleHByZXNzaW9uL21lZGlhblRyYW5zY3JpcHRFeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmhjbHVzdGVyPXRydWUmZ2VuY29kZUlkPScsXG4gICAgICAgIGp1bmN0aW9uRXhwOiBob3N0ICsgJ2V4cHJlc3Npb24vbWVkaWFuSnVuY3Rpb25FeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmhjbHVzdGVyPXRydWUmZ2VuY29kZUlkPScsXG4gICAgICAgIHRyYW5zY3JpcHQ6IGhvc3QgKyAncmVmZXJlbmNlL3RyYW5zY3JpcHQ/ZGF0YXNldElkPWd0ZXhfdjcmZ2VuY29kZUlkPScsXG4gICAgICAgIGV4b246IGhvc3QgKyAncmVmZXJlbmNlL2V4b24/ZGF0YXNldElkPWd0ZXhfdjcmZ2VuY29kZUlkPScsXG4gICAgICAgIGdlbmVNb2RlbDogaG9zdCArICdkYXRhc2V0L2NvbGxhcHNlZEdlbmVNb2RlbEV4b24/ZGF0YXNldElkPWd0ZXhfdjcmZ2VuY29kZUlkPScsXG4gICAgICAgIGdlbmVNb2RlbFVuZmlsdGVyZWQ6IGhvc3QgKyAnZGF0YXNldC9mdWxsQ29sbGFwc2VkR2VuZU1vZGVsRXhvbj9kYXRhc2V0SWQ9Z3RleF92NyZnZW5jb2RlSWQ9JyxcblxuICAgICAgICAvLyBnZW5lIGV4cHJlc3Npb24gdmlvbGluIHBsb3Qgc3BlY2lmaWNcbiAgICAgICAgZ2VuZUV4cDogaG9zdCArICdleHByZXNzaW9uL2dlbmVFeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmdlbmNvZGVJZD0nLFxuXG4gICAgICAgIC8vIGdlbmUgZXhwcmVzc2lvbiBoZWF0IG1hcCBzcGVjaWZpY1xuICAgICAgICBtZWRHZW5lRXhwOiBob3N0ICsgJ2V4cHJlc3Npb24vbWVkaWFuR2VuZUV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmaGNsdXN0ZXI9dHJ1ZSZwYWdlU2l6ZT0xMDAwMCcsXG5cbiAgICAgICAgLy8gdG9wIGV4cHJlc3NlZCBnZW5lIGV4cHJlc3Npb24gc3BlY2lmaWNcbiAgICAgICAgdG9wSW5UaXNzdWVGaWx0ZXJlZDogaG9zdCArICdleHByZXNzaW9uL3RvcEV4cHJlc3NlZEdlbmU/ZGF0YXNldElkPWd0ZXhfdjcmZmlsdGVyTXRHZW5lPXRydWUmc29ydEJ5PW1lZGlhbiZzb3J0RGlyZWN0aW9uPWRlc2MmcGFnZVNpemU9NTAmdGlzc3VlU2l0ZURldGFpbElkPScsXG4gICAgICAgIHRvcEluVGlzc3VlOiBob3N0ICsgJ2V4cHJlc3Npb24vdG9wRXhwcmVzc2VkR2VuZT9kYXRhc2V0SWQ9Z3RleF92NyZzb3J0Qnk9bWVkaWFuJnNvcnREaXJlY3Rpb249ZGVzYyZwYWdlU2l6ZT01MCZ0aXNzdWVTaXRlRGV0YWlsSWQ9JyxcblxuICAgICAgICBnZW5lSWQ6IGhvc3QgKyAncmVmZXJlbmNlL2dlbmU/Zm9ybWF0PWpzb24mZ2VuY29kZVZlcnNpb249djE5Jmdlbm9tZUJ1aWxkPUdSQ2gzNyUyRmhnMTkmZ2VuZUlkPScsXG5cbiAgICAgICAgLy8gdGlzc3VlIG1lbnUgc3BlY2lmaWNcbiAgICAgICAgdGlzc3VlOiAgaG9zdCArICdtZXRhZGF0YS90aXNzdWVTaXRlRGV0YWlsP2Zvcm1hdD1qc29uJyxcblxuICAgICAgICB0aXNzdWVTaXRlczogaG9zdCArICdtZXRhZGF0YS90aXNzdWVTaXRlRGV0YWlsP2Zvcm1hdD1qc29uJyxcblxuICAgICAgICAvLyBsb2NhbCBzdGF0aWMgZmlsZXNcbiAgICAgICAgc2FtcGxlOiAndG1wU3VtbWFyeURhdGEvZ3RleC5TYW1wbGUuY3N2JyxcbiAgICAgICAgcm5hc2VxQ3JhbTogJ3RtcFN1bW1hcnlEYXRhL3JuYXNlcV9jcmFtX2ZpbGVzX3Y3X2RiR2FQXzAxMTUxNi50eHQnLFxuICAgICAgICB3Z3NDcmFtOiAndG1wU3VtbWFyeURhdGEvd2dzX2NyYW1fZmlsZXNfdjdfaGczOF9kYkdhUF8wMTE1MTYudHh0JyxcblxuICAgICAgICAvLyBmaXJlQ2xvdWRcbiAgICAgICAgZmNCaWxsaW5nOiAnaHR0cHM6Ly9hcGkuZmlyZWNsb3VkLm9yZy9hcGkvcHJvZmlsZS9iaWxsaW5nJyxcbiAgICAgICAgZmNXb3JrU3BhY2U6ICdodHRwczovL2FwaS5maXJlY2xvdWQub3JnL2FwaS93b3Jrc3BhY2VzJyxcbiAgICAgICAgZmNQb3J0YWxXb3JrU3BhY2U6ICdodHRwczovL3BvcnRhbC5maXJlY2xvdWQub3JnLyN3b3Jrc3BhY2VzJ1xuICAgIH1cbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgc2luZ2xlIHRpc3N1ZSBlcXRscyBmcm9tIEdURXggd2ViIHNlcnZpY2VcbiAqIEBwYXJhbSBkYXRhIHtKc29ufVxuICogQHJldHVybnMge0xpc3R9IG9mIGVxdGxzIHdpdGggYXR0cmlidXRlcyByZXF1aXJlZCBmb3IgR0VWIHJlbmRlcmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTaW5nbGVUaXNzdWVFcXRscyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gJ3NpbmdsZVRpc3N1ZUVxdGwnO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyBcIlBhcnNpbmcgRXJyb3I6IHJlcXVpcmVkIGF0dHJpYnV0ZSBpcyBub3QgZm91bmQ6IFwiICsgYXR0cjtcbiAgICBbJ3ZhcmlhbnRJZCcsICd0aXNzdWVTaXRlRGV0YWlsSWQnLCAnbmVzJywgJ3BWYWx1ZSddLmZvckVhY2goKGspPT57XG4gICAgICAgIGlmICghZGF0YVthdHRyXVswXS5oYXNPd25Qcm9wZXJ0eShrKSkgdGhyb3cgJ1BhcnNpbmcgRXJyb3I6IHJlcXVpcmVkIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgYXR0cjtcbiAgICB9KTtcbiAgICBjb25zdCBnZW5lcmF0ZVNob3J0VmFyaWFudElkID0gZnVuY3Rpb24oaWQpe1xuICAgICAgICB2YXIgdGVtcCA9IGlkLnNwbGl0KFwiX1wiKTtcbiAgICAgICAgaWYodGVtcFsyXS5sZW5ndGggPT0gMSAmJiB0ZW1wWzNdLmxlbmd0aCA9PSAxKSByZXR1cm4gaWQ7XG4gICAgICAgIGlmKHRlbXBbMl0ubGVuZ3RoID4gdGVtcFszXS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRlbXBbMl0gPSBcImRlbFwiO1xuICAgICAgICAgICAgdGVtcC5zcGxpY2UoMywgMSk7IC8vIGRlbGV0ZSB0aGUgYWx0XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZih0ZW1wWzNdLmxlbmd0aCA+IHRlbXBbMl0ubGVuZ3RoKSB7XG4gICAgICAgICAgICB0ZW1wWzNdID0gXCJpbnNcIjtcbiAgICAgICAgICAgIHRlbXAuc3BsaWNlKDIsIDEpOyAvLyBkZWxldGUgdGhlIHJlZlxuICAgICAgICB9XG4gICAgICAgIGVsc2UgeyAvLyB0ZW1wWzNdLmxlbmd0aCA9PSB0ZW1wWzJdLmxlbmd0aCBhbmQgdGVtcFszXS5sZW5ndGggPiAxXG4gICAgICAgICAgICB0ZW1wWzNdID0gXCJzdWJcIjtcbiAgICAgICAgICAgIHRlbXAuc3BsaWNlKDIsIDEpOyAvLyBkZWxldGUgdGhlIHJlZlxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0ZW1wLmpvaW4oXCJfXCIpO1xuICAgIH07XG5cbiAgICByZXR1cm4gZGF0YVthdHRyXS5tYXAoKGQpPT57XG4gICAgICAgIGQueCA9IGQudmFyaWFudElkO1xuICAgICAgICBkLmRpc3BsYXlYID0gZ2VuZXJhdGVTaG9ydFZhcmlhbnRJZChkLnZhcmlhbnRJZCk7XG4gICAgICAgIGQueSA9IGQudGlzc3VlU2l0ZURldGFpbElkO1xuICAgICAgICBkLnZhbHVlID0gZC5uZXM7XG4gICAgICAgIGQuZGlzcGxheVZhbHVlID0gZC5uZXMudG9QcmVjaXNpb24oMyk7XG4gICAgICAgIGQuciA9IC1NYXRoLmxvZzEwKGQucFZhbHVlKTsgLy8gc2V0IHIgdG8gYmUgdGhlIC1sb2cxMChwLXZhbHVlKVxuICAgICAgICBkLnJEaXNwbGF5VmFsdWUgPSBwYXJzZUZsb2F0KGQucFZhbHVlLnRvRXhwb25lbnRpYWwoKSkudG9QcmVjaXNpb24oMyk7XG4gICAgICAgIHJldHVybiBkO1xuICAgIH0pXG59XG5cblxuXG4vKipcbiAqIFBhcnNlIHRoZSBnZW5lcyBmcm9tIEdURXggd2ViIHNlcnZpY2VcbiAqIEBwYXJhbSBkYXRhIHtKc29ufVxuICogQHJldHVybnMge0xpc3R9IG9mIGdlbmVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUdlbmVzKGRhdGEsIHNpbmdsZT1mYWxzZSwgZ2VuZUlkPW51bGwpe1xuICAgIGNvbnN0IGF0dHIgPSAnZ2VuZSc7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwiUGFyc2luZyBFcnJvcjogYXR0cmlidXRlIGdlbmUgZG9lc24ndCBleGlzdC5cIjtcbiAgICBpZiAoZGF0YS5nZW5lLmxlbmd0aD09MCl7XG4gICAgICAgICBhbGVydChcIk5vIGdlbmUgaXMgZm91bmRcIik7XG4gICAgICAgICB0aHJvdyBcIkZhdGFsIEVycm9yOiBnZW5lKHMpIG5vdCBmb3VuZFwiO1xuICAgICB9XG4gICAgaWYgKHNpbmdsZSl7XG4gICAgICAgIGlmIChnZW5lSWQgPT09IG51bGwpIHRocm93IFwiUGxlYXNlIHByb3ZpZGUgYSBnZW5lIElEIGZvciBzZWFyY2ggcmVzdWx0cyB2YWxpZGF0aW9uXCI7XG4gICAgICAgIGlmIChkYXRhLmdlbmUubGVuZ3RoPjEpIHsgLy8gd2hlbiBhIHNpbmdsZSBnZW5lIElEIGhhcyBtdWx0aXBsZSBtYXRjaGVzXG4gICAgICAgICAgICAgbGV0IGZpbHRlcmVkID0gZGF0YS5nZW5lLmZpbHRlcigoZyk9PntcbiAgICAgICAgICAgICAgICAgcmV0dXJuIGcuZ2VuZVN5bWJvbFVwcGVyPT1nZW5lSWQudG9VcHBlckNhc2UoKSB8fCBnLmdlbmNvZGVJZCA9PSBnZW5lSWQudG9VcHBlckNhc2UoKVxuICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgIGlmIChmaWx0ZXJlZC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgIGFsZXJ0KFwiRmF0YWwgRXJyb3I6IGlucHV0IGdlbmUgSUQgaXMgbm90IHVuaXF1ZS5cIik7XG4gICAgICAgICAgICAgICAgIHRocm93IFwiRmF0YWwgRXJyb3I6IGlucHV0IGdlbmUgSUQgaXMgbm90IHVuaXF1ZS5cIjtcbiAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgfSBlbHNlIGlmIChmaWx0ZXJlZC5sZW5ndGggPT0gMCl7XG4gICAgICAgICAgICAgICAgIGFsZXJ0KFwiTm8gZ2VuZSBpcyBmb3VuZCB3aXRoIFwiICsgZ2VuZUlkKTtcbiAgICAgICAgICAgICAgICAgdGhyb3cgXCJGYXRhbCBFcnJvcjogZ2VuZSBub3QgZm91bmRcIjtcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgZGF0YS5nZW5lID0gZmlsdGVyZWRcbiAgICAgICAgICAgICB9XG4gICAgICAgICB9XG4gICAgICAgICByZXR1cm4gZGF0YS5nZW5lWzBdXG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIGRhdGFbYXR0cl07XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIHRpc3N1ZXNcbiAqIEBwYXJhbSBkYXRhIHtKc29ufVxuICogQHJldHVybnMge0xpc3R9IG9mIHRpc3N1ZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGlzc3Vlcyhqc29uKXtcbiAgICBjb25zdCBhdHRyID0gJ3Rpc3N1ZVNpdGVEZXRhaWwnO1xuICAgIGlmKCFqc29uLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAnUGFyc2luZyBFcnJvcjogcmVxdWlyZWQganNvbiBhdHRyIGlzIG1pc3Npbmc6ICcgKyBhdHRyO1xuICAgIGNvbnN0IHRpc3N1ZXMgPSBqc29uW2F0dHJdO1xuXG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgWyd0aXNzdWVTaXRlRGV0YWlsSWQnLCAndGlzc3VlU2l0ZURldGFpbCcsICdjb2xvckhleCddLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICghdGlzc3Vlc1swXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgJ1BhcnNpbmcgRXJyb3I6IHJlcXVpcmVkIGpzb24gYXR0ciBpcyBtaXNzaW5nOiAnICsgZDtcbiAgICB9KTtcblxuICAgIHJldHVybiB0aXNzdWVzO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSB0aXNzdWUgZ3JvdXBzXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEBwYXJhbSBmb3JFcXRsIHtCb29sZWFufSByZXN0cmljdCB0byBlcXRsIHRpc3N1ZXNcbiAqIEByZXR1cm5zIHtEaWN0aW9uYXJ5fSBvZiBsaXN0cyBvZiB0aXNzdWVzIGluZGV4ZWQgYnkgdGhlIHRpc3N1ZSBncm91cCBuYW1lXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRpc3N1ZVNpdGVzKGRhdGEsIGZvckVxdGw9ZmFsc2Upe1xuICAgIC8vIHRoZSBsaXN0IG9mIGludmFsaWRlIGVxdGwgdGlzc3VlcyBkdWUgdG8gc2FtcGxlIHNpemUgPCA3MFxuICAgIC8vIGEgaGFyZC1jb2RlZCBsaXN0IGJlY2F1c2UgdGhlIHNhbXBsZSBzaXplIGlzIG5vdCBlYXN5IHRvIHJldHJpZXZlXG4gICAgY29uc3QgaW52YWxpZFRpc3N1ZXMgPSBbJ0JsYWRkZXInLCAnQ2Vydml4X0VjdG9jZXJ2aXgnLCAnQ2Vydml4X0VuZG9jZXJ2aXgnLCAnRmFsbG9waWFuX1R1YmUnLCAnS2lkbmV5X0NvcnRleCddO1xuXG4gICAgY29uc3QgYXR0ciA9ICd0aXNzdWVTaXRlRGV0YWlsJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ1BhcnNpbmcgRXJyb3I6IHJlcXVpcmVkIGpzb24gYXR0cmlidXRlIGlzIG1pc3Npbmc6ICcgKyBhdHRyO1xuICAgIGxldCB0aXNzdWVzID0gZGF0YVthdHRyXTtcbiAgICBbJ3Rpc3N1ZVNpdGUnLCd0aXNzdWVTaXRlRGV0YWlsSWQnLCd0aXNzdWVTaXRlRGV0YWlsJ10uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCF0aXNzdWVzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBgcGFyc2VUaXNzdWVTaXRlcyBhdHRyIGVycm9yLiAke2R9IGlzIG5vdCBmb3VuZGA7XG4gICAgfSk7XG4gICAgdGlzc3VlcyA9IGZvckVxdGw9PWZhbHNlP3Rpc3N1ZXM6dGlzc3Vlcy5maWx0ZXIoKGQpPT57cmV0dXJuICFpbnZhbGlkVGlzc3Vlcy5pbmNsdWRlcyhkLnRpc3N1ZVNpdGVEZXRhaWxJZCl9KTsgLy8gYW4gYXJyYXkgb2YgdGlzc3VlU2l0ZURldGFpbElkIG9iamVjdHNcblxuICAgIC8vIGJ1aWxkIHRoZSB0aXNzdWVHcm91cHMgbG9va3VwIGRpY3Rpb25hcnkgaW5kZXhlZCBieSB0aGUgdGlzc3VlIGdyb3VwIG5hbWUgKGkuZS4gdGhlIHRpc3N1ZSBtYWluIHNpdGUgbmFtZSlcbiAgICBsZXQgdGlzc3VlR3JvdXBzID0gdGlzc3Vlcy5yZWR1Y2UoKGFyciwgZCk9PntcbiAgICAgICAgbGV0IGdyb3VwTmFtZSA9IGQudGlzc3VlU2l0ZTtcbiAgICAgICAgbGV0IHNpdGUgPSB7XG4gICAgICAgICAgICBpZDogZC50aXNzdWVTaXRlRGV0YWlsSWQsXG4gICAgICAgICAgICBuYW1lOiBkLnRpc3N1ZVNpdGVEZXRhaWxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFhcnIuaGFzT3duUHJvcGVydHkoZ3JvdXBOYW1lKSkgYXJyW2dyb3VwTmFtZV0gPSBbXTsgLy8gaW5pdGlhdGUgYW4gYXJyYXlcbiAgICAgICAgYXJyW2dyb3VwTmFtZV0ucHVzaChzaXRlKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LCB7fSk7XG5cbiAgICAvLyBtb2RpZnkgdGhlIHRpc3N1ZSBncm91cHMgdGhhdCBoYXZlIG9ubHkgYSBzaW5nbGUgc2l0ZVxuICAgIC8vIGJ5IHJlcGxhY2luZyB0aGUgZ3JvdXAncyBuYW1lIHdpdGggdGhlIHNpbmdsZSBzaXRlJ3MgbmFtZSAtLSByZXN1bHRpbmcgYSBiZXR0ZXIgQWxwaGFiZXRpY2FsIG9yZGVyIG9mIHRoZSB0aXNzdWUgZ3JvdXBzXG5cbiAgICBPYmplY3Qua2V5cyh0aXNzdWVHcm91cHMpLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICh0aXNzdWVHcm91cHNbZF0ubGVuZ3RoID09IDEpeyAvLyBhIHNpbmdsZS1zaXRlIGdyb3VwXG4gICAgICAgICAgICBsZXQgc2l0ZSA9IHRpc3N1ZUdyb3Vwc1tkXVswXTsgLy8gdGhlIHNpbmdsZSBzaXRlXG4gICAgICAgICAgICBkZWxldGUgdGlzc3VlR3JvdXBzW2RdOyAvLyByZW1vdmUgdGhlIG9sZCBncm91cCBpbiB0aGUgZGljdGlvbmFyeVxuICAgICAgICAgICAgdGlzc3VlR3JvdXBzW3NpdGUubmFtZV0gPSBbc2l0ZV07IC8vIGNyZWF0ZSBhIG5ldyBncm91cCB3aXRoIHRoZSBzaXRlJ3MgbmFtZVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGlzc3VlR3JvdXBzO1xuXG59XG5cbi8qKlxuICogcGFyc2UgdGhlIGV4b25zXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEBwYXJhbSBmdWxsIHtCb29sZWFufVxuICogQHJldHVybnMge0xpc3R9IG9mIGV4b25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1vZGVsRXhvbnMoanNvbil7XG4gICAgY29uc3QgYXR0ciA9ICdjb2xsYXBzZWRHZW5lTW9kZWxFeG9uJztcbiAgICBpZighanNvbi5oYXNPd25Qcm9wZXJ0eShhdHRyKSl7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoanNvbik7XG4gICAgICAgIHRocm93ICdQYXJzaW5nIEVycm9yOiBSZXF1aXJlZCBqc29uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgYXR0cjtcbiAgICB9XG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgWydzdGFydCcsICdlbmQnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWpzb25bYXR0cl1bMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93ICdQYXJzaW5nIEVycm9yOiBSZXF1aXJlZCBqc29uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgZDtcbiAgICB9KTtcbiAgICByZXR1cm4ganNvblthdHRyXS5tYXAoKGQpPT57XG4gICAgICAgIGQuY2hyb21TdGFydCA9IGQuc3RhcnQ7XG4gICAgICAgIGQuY2hyb21FbmQgPSBkLmVuZDtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgfSk7XG59XG5cbi8qKlxuICogcGFyc2UgdGhlIGp1bmN0aW9uc1xuICogQHBhcmFtIGRhdGFcbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBqdW5jdGlvbnNcbiAqIC8vIGp1bmN0aW9uIGFubm90YXRpb25zIGFyZSBub3Qgc3RvcmVkIGluIE1vbmdvXG4gICAgLy8gc28gaGVyZSB3ZSB1c2UgdGhlIGp1bmN0aW9uIGV4cHJlc3Npb24gd2ViIHNlcnZpY2UgdG8gcGFyc2UgdGhlIGp1bmN0aW9uIElEIGZvciBpdHMgZ2Vub21pYyBsb2NhdGlvblxuICAgIC8vIGFzc3VtaW5nIHRoYXQgZWFjaCB0aXNzdWUgaGFzIHRoZSBzYW1lIGp1bmN0aW9ucyxcbiAgICAvLyB0byBncmFiIGFsbCB0aGUga25vd24ganVuY3Rpb25zIG9mIGEgZ2VuZSwgd2Ugb25seSBuZWVkIHRvIHF1ZXJ5IG9uZSB0aXNzdWVcbiAgICAvLyBoZXJlIHdlIGFyYml0cmFyaWx5IHBpY2sgTGl2ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUp1bmN0aW9ucyhqc29uKXtcblxuICAgIGNvbnN0IGF0dHIgPSAnbWVkaWFuSnVuY3Rpb25FeHByZXNzaW9uJztcbiAgICBpZighanNvbi5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ1BhcnNpbmcgRXJyb3I6IHBhcnNlSnVuY3Rpb25zIGlucHV0IGVycm9yLiAnICsgYXR0cjtcblxuICAgIC8vIGNoZWNrIHJlcXVpcmVkIGpzb24gYXR0cmlidXRlc1xuICAgIFsndGlzc3VlU2l0ZURldGFpbElkJywgJ2p1bmN0aW9uSWQnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICAvLyB1c2UgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGpzb24gb2JqZWN0cyBhcyBhIHRlc3QgY2FzZVxuICAgICAgICBpZighanNvblthdHRyXVswXS5oYXNPd25Qcm9wZXJ0eShkKSl7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGpzb25bYXR0cl1bMF0pO1xuICAgICAgICAgICAgdGhyb3cgJ1BhcnNpbmcgRXJyb3I6IHJlcXVpcmVkIGp1bmN0aW9uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgZDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBqc29uW2F0dHJdLmZpbHRlcigoZCk9PmQudGlzc3VlU2l0ZURldGFpbElkPT0nTGl2ZXInKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zID0gZC5qdW5jdGlvbklkLnNwbGl0KCdfJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNocm9tOiBwb3NbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb21TdGFydDogcG9zWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNocm9tRW5kOiBwb3NbMl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganVuY3Rpb25JZDogZC5qdW5jdGlvbklkXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xufVxuXG4vKipcbiAqIHBhcnNlIHRyYW5zY3JpcHQgaXNvZm9ybXMgZnJvbSB0aGUgR1RFeCB3ZWIgc2VydmljZTogJ3JlZmVyZW5jZS90cmFuc2NyaXB0P3JlbGVhc2U9djcmZ2VuY29kZV9pZD0nXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIHJldHVybnMgYSBkaWN0aW9uYXJ5IG9mIHRyYW5zY3JpcHQgZXhvbiBvYmplY3QgbGlzdHMgaW5kZXhlZCBieSB0cmFuc2NyaXB0IElEcyAtLSBFTlNUIElEc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFeG9ucyhqc29uKXtcbiAgICBjb25zdCBhdHRyID0gJ2V4b24nO1xuICAgIGlmKCFqc29uLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAnUGFyc2luZyBFcnJvcjogcmVxdWlyZWQganNvbiBhdHRyaWJ1dGUgaXMgbWlzc2luZzogZXhvbic7XG4gICAgcmV0dXJuIGpzb25bYXR0cl0ucmVkdWNlKChhLCBkKT0+e1xuICAgICAgICAvLyBjaGVjayByZXF1aXJlZCBhdHRyaWJ1dGVzXG4gICAgICAgIFsndHJhbnNjcmlwdElkJywgJ2Nocm9tb3NvbWUnLCAnc3RhcnQnLCAnZW5kJywgJ2V4b25OdW1iZXInLCAnZXhvbklkJ10uZm9yRWFjaCgoayk9PntcbiAgICAgICAgICAgIGlmKCFkLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihkKTtcbiAgICAgICAgICAgICAgICB0aHJvdyAnUGFyc2luZyBFcnJvcjogcmVxdWlyZWQganNvbiBhdHRyaWJ1dGUgaXMgbWlzc2luZzogJyArIGtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChhW2QudHJhbnNjcmlwdElkXSA9PT0gdW5kZWZpbmVkKSBhW2QudHJhbnNjcmlwdElkXSA9IFtdO1xuICAgICAgICBkLmNocm9tID0gZC5jaHJvbW9zb21lO1xuICAgICAgICBkLmNocm9tU3RhcnQgPSBkLnN0YXJ0O1xuICAgICAgICBkLmNocm9tRW5kID0gZC5lbmQ7XG4gICAgICAgIGFbZC50cmFuc2NyaXB0SWRdLnB1c2goZCk7XG4gICAgICAgIHJldHVybiBhO1xuICAgIH0sIHt9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSB0cmFuc2NyaXB0IGlzb2Zvcm1zXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn0gZnJvbSBHVEV4IHdlYiBzZXJ2aWNlICdyZWZlcmVuY2UvdHJhbnNjcmlwdD9yZWxlYXNlPXY3JmdlbmNvZGVfaWQ9J1xuICogcmV0dXJucyBhIGxpc3Qgb2YgaXNvZm9ybSBvYmplY3RzIHNvcnRlZCBieSBsZW5ndGggaW4gZGVzY2VuZGluZyBvcmRlclxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUcmFuc2NyaXB0cyhqc29uKXtcbiAgICBjb25zdCBhdHRyID0gJ3RyYW5zY3JpcHQnO1xuICAgIGlmKCFqc29uLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdygncGFyc2VJc29mb3JtcyBpbnB1dCBlcnJvcicpO1xuXG4gICAgLy8gY2hlY2sgcmVxdWlyZWQgYXR0cmlidXRlcywgdXNlIHRoZSBmaXJzdCB0cmFuc2NyaXB0IGFzIHRoZSB0ZXN0IGNhc2VcbiAgICBbJ3RyYW5zY3JpcHRJZCcsICdzdGFydCcsICdlbmQnXS5mb3JFYWNoKChrKT0+e1xuICAgICAgICBpZighanNvblthdHRyXVswXS5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihkKTtcbiAgICAgICAgICAgIHRocm93ICdQYXJzaW5nIEVycm9yOiByZXF1aXJlZCBqc29uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsga1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4ganNvblthdHRyXS5zb3J0KChhLCBiKT0+e1xuICAgICAgICBjb25zdCBsMSA9IE1hdGguYWJzKGEuZW5kIC0gYS5zdGFydCkgKyAxO1xuICAgICAgICBjb25zdCBsMiA9IE1hdGguYWJzKGIuZW5kIC0gYi5zdGFydCkgKyAxO1xuICAgICAgICByZXR1cm4gLShsMS1sMik7IC8vIHNvcnQgYnkgaXNvZm9ybSBsZW5ndGggaW4gZGVzY2VuZGluZyBvcmRlclxuICAgIH0pO1xufVxuXG4vKipcbiAqIHBhcnNlIGZpbmFsIChtYXNrZWQpIGdlbmUgbW9kZWwgZXhvbiBleHByZXNzaW9uXG4gKiBleHByZXNzaW9uIGlzIG5vcm1hbGl6ZWQgdG8gcmVhZHMgcGVyIGtiXG4gKiBAcGFyYW0gZGF0YSB7SlNPTn0gb2YgZXhvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gZXhvbnMge0xpc3R9IG9mIGV4b25zIHdpdGggcG9zaXRpb25zXG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgZXhvbiBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV4b25FeHByZXNzaW9uKGRhdGEsIGV4b25zKXtcbiAgICBjb25zdCBleG9uRGljdCA9IGV4b25zLnJlZHVjZSgoYSwgZCk9PnthW2QuZXhvbklkXSA9IGQ7IHJldHVybiBhO30sIHt9KTtcbiAgICBjb25zdCBhdHRyID0gJ21lZGlhbkV4b25FeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coJ3BhcnNlRXhvbkV4cHJlc3Npb24gaW5wdXQgZXJyb3InKTtcblxuICAgIGNvbnN0IGV4b25PYmplY3RzID0gZGF0YVthdHRyXTtcbiAgICAvLyBlcnJvci1jaGVja2luZ1xuICAgIFsnbWVkaWFuJywgJ2V4b25JZCcsICd0aXNzdWVTaXRlRGV0YWlsSWQnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWV4b25PYmplY3RzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyAnRmF0YWwgRXJyb3I6IHBhcnNlRXhvbkV4cHJlc3Npb24gYXR0ciBub3QgZm91bmQ6ICcgKyBkO1xuICAgIH0pO1xuICAgIC8vIHBhcnNlIEdURXggbWVkaWFuIGV4b24gY291bnRzXG4gICAgZXhvbk9iamVjdHMuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICBjb25zdCBleG9uID0gZXhvbkRpY3RbZC5leG9uSWRdOyAvLyBmb3IgcmV0cmlldmluZyBleG9uIHBvc2l0aW9uc1xuICAgICAgICAvLyBlcnJvci1jaGVja2luZ1xuICAgICAgICBbJ2VuZCcsICdzdGFydCddLmZvckVhY2goKHApPT57XG4gICAgICAgICAgICBpZiAoIWV4b24uaGFzT3duUHJvcGVydHkocCkpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2VFeG9uRXhwcmVzc2lvbiBwb3NpdGlvbiBhdHRyIG5vdCBmb3VuZDogJyArIHA7XG4gICAgICAgIH0pO1xuICAgICAgICBkLmwgPSBleG9uLmVuZCAtIGV4b24uc3RhcnQgKyAxO1xuICAgICAgICBkLnZhbHVlID0gTnVtYmVyKGQubWVkaWFuKS9kLmw7XG4gICAgICAgIGQuZGlzcGxheVZhbHVlID0gTnVtYmVyKGQubWVkaWFuKS9kLmw7XG4gICAgICAgIGQueCA9IGQuZXhvbklkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZVNpdGVEZXRhaWxJZDtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkO1xuICAgICAgICBkLmNocm9tU3RhcnQgPSBleG9uLnN0YXJ0O1xuICAgICAgICBkLmNocm9tRW5kID0gZXhvbi5lbmQ7XG4gICAgICAgIGQudW5pdCA9ICdtZWRpYW4gJyArIGQudW5pdCArICcgcGVyIGJhc2UnO1xuICAgICAgICBkLnRpc3N1ZUlkID0gZC50aXNzdWVTaXRlRGV0YWlsSWQ7XG4gICAgfSk7XG4gICAgcmV0dXJuIGV4b25PYmplY3RzLnNvcnQoKGEsYik9PntcbiAgICAgICAgaWYgKGEuY2hyb21TdGFydDxiLmNocm9tU3RhcnQpIHJldHVybiAtMTtcbiAgICAgICAgaWYgKGEuY2hyb21TdGFydD5iLmNocm9tU3RhcnQpIHJldHVybiAxO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTsgLy8gc29ydCBieSBnZW5vbWljIGxvY2F0aW9uIGluIGFzY2VuZGluZyBvcmRlclxufVxuXG4vKipcbiAqIFBhcnNlIGp1bmN0aW9uIG1lZGlhbiByZWFkIGNvdW50IGRhdGFcbiAqIEBwYXJhbSBkYXRhIHtKU09OfSBvZiB0aGUganVuY3Rpb24gZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHJldHVybnMge0xpc3R9IG9mIGp1bmN0aW9uIG9iamVjdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnVuY3Rpb25FeHByZXNzaW9uKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSAnbWVkaWFuSnVuY3Rpb25FeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coJ3BhcnNlSnVuY3Rpb25FeHByZXNzaW9uIGlucHV0IGVycm9yJyk7XG5cbiAgICBjb25zdCBqdW5jdGlvbnMgPSBkYXRhW2F0dHJdO1xuXG4gICAgLy8gZXJyb3ItY2hlY2tpbmdcbiAgICBpZiAoanVuY3Rpb25zID09PSB1bmRlZmluZWQgfHwganVuY3Rpb25zLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignTm8ganVuY3Rpb24gZGF0YSBmb3VuZCcpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuXG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4ganVuY3Rpb24gcmVhZCBjb3VudHNcbiAgICBqdW5jdGlvbnMuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICBbJ3Rpc3N1ZVNpdGVEZXRhaWxJZCcsICdqdW5jdGlvbklkJywgJ21lZGlhbicsICdnZW5jb2RlSWQnXS5mb3JFYWNoKChrKT0+e1xuICAgICAgICAgICAgaWYgKCFkLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihkKTtcbiAgICAgICAgICAgICAgICB0aHJvdyAnUGFyc2luZ3IgRXJyb3I6IHBhcnNlSnVuY3Rpb25FeHByZXNzaW9uIGF0dHIgbm90IGZvdW5kOiAnICsgaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGxldCBtZWRpYW4gPSBkLm1lZGlhbjtcbiAgICAgICAgbGV0IHRpc3N1ZUlkID0gZC50aXNzdWVTaXRlRGV0YWlsSWQ7XG4gICAgICAgIGQudGlzc3VlSWQgPSB0aXNzdWVJZDtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkO1xuICAgICAgICBkLnggPSBkLmp1bmN0aW9uSWQ7XG4gICAgICAgIGQueSA9IHRpc3N1ZUlkO1xuICAgICAgICBkLnZhbHVlID0gTnVtYmVyKG1lZGlhbik7XG4gICAgICAgIGQuZGlzcGxheVZhbHVlID0gTnVtYmVyKG1lZGlhbik7XG4gICAgfSk7XG5cbiAgICAvLyBzb3J0IGJ5IGdlbm9taWMgbG9jYXRpb24gaW4gYXNjZW5kaW5nIG9yZGVyXG4gICAgcmV0dXJuIGp1bmN0aW9ucy5zb3J0KChhLGIpPT57XG4gICAgICAgIGlmIChhLmp1bmN0aW9uSWQ+Yi5qdW5jdGlvbklkKSByZXR1cm4gMTtcbiAgICAgICAgZWxzZSBpZiAoYS5qdW5jdGlvbklkPGIuanVuY3Rpb25JZCkgcmV0dXJuIC0xO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSB0cmFuc2NyaXB0IGV4cHJlc3Npb25cbiAqIEBwYXJhbSBkYXRhXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVHJhbnNjcmlwdEV4cHJlc3Npb24oZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9ICdtZWRpYW5UcmFuc2NyaXB0RXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KCdQYXJzaW5nIEVycm9yOiBwYXJzZVRyYW5zY3JpcHRFeHByZXNzaW9uIGlucHV0IGVycm9yJyk7XG4gICAgLy8gcGFyc2UgR1RFeCBpc29mb3JtIG1lZGlhbiBUUE1cbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgWydtZWRpYW4nLCAndHJhbnNjcmlwdElkJywgJ3Rpc3N1ZVNpdGVEZXRhaWxJZCcsICdnZW5jb2RlSWQnXS5mb3JFYWNoKChrKT0+e1xuICAgICAgICAgICAgaWYoIWQuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGQpO1xuICAgICAgICAgICAgICAgIHRocm93KCdQYXJzaW5nIEVycm9yOiByZXF1aXJlZCB0cmFuc2NpcHQgYXR0cmlidXRlIGlzIG1pc3Npbmc6ICcgKyBrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGQudmFsdWUgPSBOdW1iZXIoZC5tZWRpYW4pO1xuICAgICAgICBkLmRpc3BsYXlWYWx1ZSA9IE51bWJlcihkLm1lZGlhbik7XG4gICAgICAgIGQueCA9IGQudHJhbnNjcmlwdElkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZVNpdGVEZXRhaWxJZDtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkO1xuICAgICAgICBkLnRpc3N1ZUlkID0gZC50aXNzdWVTaXRlRGV0YWlsSWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuLyoqXG4gKiBwYXJzZSB0cmFuc2NyaXB0IGV4cHJlc3Npb24sIGFuZCB0cmFuc3Bvc2UgdGhlIG1hdHJpeFxuICogQHBhcmFtIGRhdGFcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUcmFuc2NyaXB0RXhwcmVzc2lvblRyYW5zcG9zZShkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gJ21lZGlhblRyYW5zY3JpcHRFeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGRhdGEpO1xuICAgICAgICB0aHJvdygnUGFyc2luZyBFcnJvcjogcGFyc2VUcmFuc2NyaXB0RXhwcmVzc2lvblRyYW5zcG9zZSBpbnB1dCBlcnJvci4nKTtcbiAgICB9XG4gICAgLy8gcGFyc2UgR1RFeCBpc29mb3JtIG1lZGlhbiBUUE1cbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgWydtZWRpYW4nLCAndHJhbnNjcmlwdElkJywgJ3Rpc3N1ZVNpdGVEZXRhaWxJZCcsICdnZW5jb2RlSWQnXS5mb3JFYWNoKChrKT0+e1xuICAgICAgICAgICAgaWYoIWQuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGQpO1xuICAgICAgICAgICAgICAgIHRocm93KCdQYXJzaW5nIEVycm9yOiBSZXF1aXJlZCB0cmFuc2NyaXB0IGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBtZWRpYW4gPSBkLm1lZGlhbjtcbiAgICAgICAgY29uc3QgdGlzc3VlSWQgPSBkLnRpc3N1ZVNpdGVEZXRhaWxJZDtcbiAgICAgICAgZC52YWx1ZSA9IE51bWJlcihtZWRpYW4pO1xuICAgICAgICBkLmRpc3BsYXlWYWx1ZSA9IE51bWJlcihtZWRpYW4pO1xuICAgICAgICBkLnkgPSBkLnRyYW5zY3JpcHRJZDtcbiAgICAgICAgZC54ID0gdGlzc3VlSWQ7XG4gICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZDtcbiAgICAgICAgZC50aXNzdWVJZCA9IHRpc3N1ZUlkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRhdGFbYXR0cl07XG59XG5cbi8qKlxuICogcGFyc2UgbWVkaWFuIGdlbmUgZXhwcmVzc2lvblxuICogQHBhcmFtIGRhdGEge0pzb259IHdpdGggYXR0ciBtZWRpYW5HZW5lRXhwcmVzc2lvblxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1lZGlhbkV4cHJlc3Npb24oZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9ICdtZWRpYW5HZW5lRXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdQYXJzaW5nIEVycm9yOiByZXF1aXJlZCBqc29uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgYXR0cjtcbiAgICBjb25zdCBhZGp1c3QgPSAxO1xuICAgIC8vIHBhcnNlIEdURXggbWVkaWFuIGdlbmUgZXhwcmVzc2lvblxuICAgIC8vIGVycm9yLWNoZWNraW5nIHRoZSByZXF1aXJlZCBhdHRyaWJ1dGVzOlxuICAgIGlmIChkYXRhW2F0dHJdLmxlbmd0aCA9PSAwKSB0aHJvdyAncGFyc2VNZWRpYW5FeHByZXNzaW9uIGZpbmRzIG5vIGRhdGEuJztcbiAgICBbJ21lZGlhbicsICd0aXNzdWVTaXRlRGV0YWlsSWQnLCAnZ2VuY29kZUlkJ10uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCFkYXRhW2F0dHJdWzBdLmhhc093blByb3BlcnR5KGQpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGRhdGFbYXR0cl1bMF0pO1xuICAgICAgICAgICAgdGhyb3cgYFBhcnNpbmcgRXJyb3I6IHJlcXVpcmVkIGpzb24gYXR0cmlidXRlIGlzIG1pc3NpbmdwOiAke2R9YDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGxldCByZXN1bHRzID0gZGF0YVthdHRyXTtcbiAgICByZXN1bHRzLmZvckVhY2goZnVuY3Rpb24oZCl7XG4gICAgICAgIGQudmFsdWUgPSBOdW1iZXIoZC5tZWRpYW4pO1xuICAgICAgICBkLnggPSBkLnRpc3N1ZVNpdGVEZXRhaWxJZDtcbiAgICAgICAgZC55ID0gZC5nZW5jb2RlSWQ7XG4gICAgICAgIGQuZGlzcGxheVZhbHVlID0gTnVtYmVyKGQubWVkaWFuKTtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbi8qKlxuICogcGFyc2UgdGhlIGV4cHJlc3Npb24gZGF0YSBvZiBhIGdlbmUgZm9yIGEgZ3JvdXBlZCB2aW9saW4gcGxvdFxuICogQHBhcmFtIGRhdGEge0pTT059IGZyb20gR1RFeCBnZW5lIGV4cHJlc3Npb24gd2ViIHNlcnZpY2VcbiAqIEBwYXJhbSBjb2xvcnMge0RpY3Rpb25hcnl9IHRoZSB2aW9saW4gY29sb3IgZm9yIGdlbmVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUdlbmVFeHByZXNzaW9uRm9yVmlvbGluKGRhdGEsIHVzZUxvZz10cnVlLCBjb2xvcnM9dW5kZWZpbmVkKXtcbiAgICBjb25zdCBhdHRyID0gJ2dlbmVFeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ1BhcnNpbmcgRXJyb3I6IHJlcXVpcmVkIGpzb24gYXR0cmlidXRlIGlzIG1pc3Npbmc6ICcgKyBhdHRyO1xuICAgIGRhdGFbYXR0cl0uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgWydkYXRhJywgJ3Rpc3N1ZVNpdGVEZXRhaWxJZCcsICdnZW5lU3ltYm9sJywgJ2dlbmNvZGVJZCddLmZvckVhY2goKGspPT57XG4gICAgICAgICAgICBpZighZC5oYXNPd25Qcm9wZXJ0eShrKSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihkKTtcbiAgICAgICAgICAgICAgICB0aHJvdyAnUGFyc2luZyBFcnJvcjogcmVxdWlyZWQganNvbiBhdHRyaWJ1dGUgaXMgbWlzc2luZzogJyArIGs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBkLnZhbHVlcyA9IHVzZUxvZz9kLmRhdGEubWFwKChkZCk9PntyZXR1cm4gTWF0aC5sb2cxMCgrZGQrMSl9KTpkLmRhdGE7XG4gICAgICAgIGQuZ3JvdXAgPSBkLnRpc3N1ZVNpdGVEZXRhaWxJZDtcbiAgICAgICAgZC5sYWJlbCA9IGQuZ2VuZVN5bWJvbDtcbiAgICAgICAgZC5jb2xvciA9IGNvbG9ycz09PXVuZGVmaW5lZD8nIzkwYzFjMSc6Y29sb3JzW2QuZ2VuY29kZUlkXTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuLyoqXG4gKiBwYXJzZSB0aGUgTEQgKGxpbmthZ2UgZGlzZXF1aWxpYnJpdW0gZGF0YSlcbiAqIEBwYXJhbSBkYXRhIHtKU09OfSBmcm9tIEdURXggbGQgd2ViIHNlcnZpY2VcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTEQoZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9ICdsZCc7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdQYXJzaW5nIEVycm9yOiByZXF1aXJlZCBqc29uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgYXR0cjtcbiAgICBsZXQgcGFyc2VkID0gW11cbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpPT57XG4gICAgICAgIGxldCBsYWJlbHMgPSBkWzBdLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgcGFyc2VkLnB1c2goe1xuICAgICAgICAgICAgeDogbGFiZWxzWzBdLFxuICAgICAgICAgICAgeTogbGFiZWxzWzFdLFxuICAgICAgICAgICAgdmFsdWU6IHBhcnNlRmxvYXQoZFsxXSksXG4gICAgICAgICAgICBkaXNwbGF5VmFsdWU6IHBhcnNlRmxvYXQoZFsxXSkudG9QcmVjaXNpb24oMylcbiAgICAgICAgfSlcbiAgICB9KTtcbiAgICByZXR1cm4gcGFyc2VkO1xufVxuIiwiZXhwb3J0IHZhciBwcmVmaXggPSBcIiRcIjtcblxuZnVuY3Rpb24gTWFwKCkge31cblxuTWFwLnByb3RvdHlwZSA9IG1hcC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBNYXAsXG4gIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIChwcmVmaXggKyBrZXkpIGluIHRoaXM7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIHRoaXNbcHJlZml4ICsga2V5XTtcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgdGhpc1twcmVmaXggKyBrZXldID0gdmFsdWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIHByb3BlcnR5ID0gcHJlZml4ICsga2V5O1xuICAgIHJldHVybiBwcm9wZXJ0eSBpbiB0aGlzICYmIGRlbGV0ZSB0aGlzW3Byb3BlcnR5XTtcbiAgfSxcbiAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSBkZWxldGUgdGhpc1twcm9wZXJ0eV07XG4gIH0sXG4gIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIGtleXMucHVzaChwcm9wZXJ0eS5zbGljZSgxKSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH0sXG4gIHZhbHVlczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSB2YWx1ZXMucHVzaCh0aGlzW3Byb3BlcnR5XSk7XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfSxcbiAgZW50cmllczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVudHJpZXMgPSBbXTtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkgZW50cmllcy5wdXNoKHtrZXk6IHByb3BlcnR5LnNsaWNlKDEpLCB2YWx1ZTogdGhpc1twcm9wZXJ0eV19KTtcbiAgICByZXR1cm4gZW50cmllcztcbiAgfSxcbiAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNpemUgPSAwO1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSArK3NpemU7XG4gICAgcmV0dXJuIHNpemU7XG4gIH0sXG4gIGVtcHR5OiBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBlYWNoOiBmdW5jdGlvbihmKSB7XG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIGYodGhpc1twcm9wZXJ0eV0sIHByb3BlcnR5LnNsaWNlKDEpLCB0aGlzKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gbWFwKG9iamVjdCwgZikge1xuICB2YXIgbWFwID0gbmV3IE1hcDtcblxuICAvLyBDb3B5IGNvbnN0cnVjdG9yLlxuICBpZiAob2JqZWN0IGluc3RhbmNlb2YgTWFwKSBvYmplY3QuZWFjaChmdW5jdGlvbih2YWx1ZSwga2V5KSB7IG1hcC5zZXQoa2V5LCB2YWx1ZSk7IH0pO1xuXG4gIC8vIEluZGV4IGFycmF5IGJ5IG51bWVyaWMgaW5kZXggb3Igc3BlY2lmaWVkIGtleSBmdW5jdGlvbi5cbiAgZWxzZSBpZiAoQXJyYXkuaXNBcnJheShvYmplY3QpKSB7XG4gICAgdmFyIGkgPSAtMSxcbiAgICAgICAgbiA9IG9iamVjdC5sZW5ndGgsXG4gICAgICAgIG87XG5cbiAgICBpZiAoZiA9PSBudWxsKSB3aGlsZSAoKytpIDwgbikgbWFwLnNldChpLCBvYmplY3RbaV0pO1xuICAgIGVsc2Ugd2hpbGUgKCsraSA8IG4pIG1hcC5zZXQoZihvID0gb2JqZWN0W2ldLCBpLCBvYmplY3QpLCBvKTtcbiAgfVxuXG4gIC8vIENvbnZlcnQgb2JqZWN0IHRvIG1hcC5cbiAgZWxzZSBpZiAob2JqZWN0KSBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSBtYXAuc2V0KGtleSwgb2JqZWN0W2tleV0pO1xuXG4gIHJldHVybiBtYXA7XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1hcDtcbiIsImltcG9ydCBtYXAgZnJvbSBcIi4vbWFwXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIga2V5cyA9IFtdLFxuICAgICAgc29ydEtleXMgPSBbXSxcbiAgICAgIHNvcnRWYWx1ZXMsXG4gICAgICByb2xsdXAsXG4gICAgICBuZXN0O1xuXG4gIGZ1bmN0aW9uIGFwcGx5KGFycmF5LCBkZXB0aCwgY3JlYXRlUmVzdWx0LCBzZXRSZXN1bHQpIHtcbiAgICBpZiAoZGVwdGggPj0ga2V5cy5sZW5ndGgpIHtcbiAgICAgIGlmIChzb3J0VmFsdWVzICE9IG51bGwpIGFycmF5LnNvcnQoc29ydFZhbHVlcyk7XG4gICAgICByZXR1cm4gcm9sbHVwICE9IG51bGwgPyByb2xsdXAoYXJyYXkpIDogYXJyYXk7XG4gICAgfVxuXG4gICAgdmFyIGkgPSAtMSxcbiAgICAgICAgbiA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAga2V5ID0ga2V5c1tkZXB0aCsrXSxcbiAgICAgICAga2V5VmFsdWUsXG4gICAgICAgIHZhbHVlLFxuICAgICAgICB2YWx1ZXNCeUtleSA9IG1hcCgpLFxuICAgICAgICB2YWx1ZXMsXG4gICAgICAgIHJlc3VsdCA9IGNyZWF0ZVJlc3VsdCgpO1xuXG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGlmICh2YWx1ZXMgPSB2YWx1ZXNCeUtleS5nZXQoa2V5VmFsdWUgPSBrZXkodmFsdWUgPSBhcnJheVtpXSkgKyBcIlwiKSkge1xuICAgICAgICB2YWx1ZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZXNCeUtleS5zZXQoa2V5VmFsdWUsIFt2YWx1ZV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhbHVlc0J5S2V5LmVhY2goZnVuY3Rpb24odmFsdWVzLCBrZXkpIHtcbiAgICAgIHNldFJlc3VsdChyZXN1bHQsIGtleSwgYXBwbHkodmFsdWVzLCBkZXB0aCwgY3JlYXRlUmVzdWx0LCBzZXRSZXN1bHQpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBlbnRyaWVzKG1hcCwgZGVwdGgpIHtcbiAgICBpZiAoKytkZXB0aCA+IGtleXMubGVuZ3RoKSByZXR1cm4gbWFwO1xuICAgIHZhciBhcnJheSwgc29ydEtleSA9IHNvcnRLZXlzW2RlcHRoIC0gMV07XG4gICAgaWYgKHJvbGx1cCAhPSBudWxsICYmIGRlcHRoID49IGtleXMubGVuZ3RoKSBhcnJheSA9IG1hcC5lbnRyaWVzKCk7XG4gICAgZWxzZSBhcnJheSA9IFtdLCBtYXAuZWFjaChmdW5jdGlvbih2LCBrKSB7IGFycmF5LnB1c2goe2tleTogaywgdmFsdWVzOiBlbnRyaWVzKHYsIGRlcHRoKX0pOyB9KTtcbiAgICByZXR1cm4gc29ydEtleSAhPSBudWxsID8gYXJyYXkuc29ydChmdW5jdGlvbihhLCBiKSB7IHJldHVybiBzb3J0S2V5KGEua2V5LCBiLmtleSk7IH0pIDogYXJyYXk7XG4gIH1cblxuICByZXR1cm4gbmVzdCA9IHtcbiAgICBvYmplY3Q6IGZ1bmN0aW9uKGFycmF5KSB7IHJldHVybiBhcHBseShhcnJheSwgMCwgY3JlYXRlT2JqZWN0LCBzZXRPYmplY3QpOyB9LFxuICAgIG1hcDogZnVuY3Rpb24oYXJyYXkpIHsgcmV0dXJuIGFwcGx5KGFycmF5LCAwLCBjcmVhdGVNYXAsIHNldE1hcCk7IH0sXG4gICAgZW50cmllczogZnVuY3Rpb24oYXJyYXkpIHsgcmV0dXJuIGVudHJpZXMoYXBwbHkoYXJyYXksIDAsIGNyZWF0ZU1hcCwgc2V0TWFwKSwgMCk7IH0sXG4gICAga2V5OiBmdW5jdGlvbihkKSB7IGtleXMucHVzaChkKTsgcmV0dXJuIG5lc3Q7IH0sXG4gICAgc29ydEtleXM6IGZ1bmN0aW9uKG9yZGVyKSB7IHNvcnRLZXlzW2tleXMubGVuZ3RoIC0gMV0gPSBvcmRlcjsgcmV0dXJuIG5lc3Q7IH0sXG4gICAgc29ydFZhbHVlczogZnVuY3Rpb24ob3JkZXIpIHsgc29ydFZhbHVlcyA9IG9yZGVyOyByZXR1cm4gbmVzdDsgfSxcbiAgICByb2xsdXA6IGZ1bmN0aW9uKGYpIHsgcm9sbHVwID0gZjsgcmV0dXJuIG5lc3Q7IH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlT2JqZWN0KCkge1xuICByZXR1cm4ge307XG59XG5cbmZ1bmN0aW9uIHNldE9iamVjdChvYmplY3QsIGtleSwgdmFsdWUpIHtcbiAgb2JqZWN0W2tleV0gPSB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWFwKCkge1xuICByZXR1cm4gbWFwKCk7XG59XG5cbmZ1bmN0aW9uIHNldE1hcChtYXAsIGtleSwgdmFsdWUpIHtcbiAgbWFwLnNldChrZXksIHZhbHVlKTtcbn1cbiIsInZhciBhcnJheSA9IEFycmF5LnByb3RvdHlwZTtcblxuZXhwb3J0IHZhciBtYXAgPSBhcnJheS5tYXA7XG5leHBvcnQgdmFyIHNsaWNlID0gYXJyYXkuc2xpY2U7XG4iLCJpbXBvcnQge21hcH0gZnJvbSBcImQzLWNvbGxlY3Rpb25cIjtcbmltcG9ydCB7c2xpY2V9IGZyb20gXCIuL2FycmF5XCI7XG5cbmV4cG9ydCB2YXIgaW1wbGljaXQgPSB7bmFtZTogXCJpbXBsaWNpdFwifTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gb3JkaW5hbChyYW5nZSkge1xuICB2YXIgaW5kZXggPSBtYXAoKSxcbiAgICAgIGRvbWFpbiA9IFtdLFxuICAgICAgdW5rbm93biA9IGltcGxpY2l0O1xuXG4gIHJhbmdlID0gcmFuZ2UgPT0gbnVsbCA/IFtdIDogc2xpY2UuY2FsbChyYW5nZSk7XG5cbiAgZnVuY3Rpb24gc2NhbGUoZCkge1xuICAgIHZhciBrZXkgPSBkICsgXCJcIiwgaSA9IGluZGV4LmdldChrZXkpO1xuICAgIGlmICghaSkge1xuICAgICAgaWYgKHVua25vd24gIT09IGltcGxpY2l0KSByZXR1cm4gdW5rbm93bjtcbiAgICAgIGluZGV4LnNldChrZXksIGkgPSBkb21haW4ucHVzaChkKSk7XG4gICAgfVxuICAgIHJldHVybiByYW5nZVsoaSAtIDEpICUgcmFuZ2UubGVuZ3RoXTtcbiAgfVxuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkb21haW4uc2xpY2UoKTtcbiAgICBkb21haW4gPSBbXSwgaW5kZXggPSBtYXAoKTtcbiAgICB2YXIgaSA9IC0xLCBuID0gXy5sZW5ndGgsIGQsIGtleTtcbiAgICB3aGlsZSAoKytpIDwgbikgaWYgKCFpbmRleC5oYXMoa2V5ID0gKGQgPSBfW2ldKSArIFwiXCIpKSBpbmRleC5zZXQoa2V5LCBkb21haW4ucHVzaChkKSk7XG4gICAgcmV0dXJuIHNjYWxlO1xuICB9O1xuXG4gIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHJhbmdlID0gc2xpY2UuY2FsbChfKSwgc2NhbGUpIDogcmFuZ2Uuc2xpY2UoKTtcbiAgfTtcblxuICBzY2FsZS51bmtub3duID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHVua25vd24gPSBfLCBzY2FsZSkgOiB1bmtub3duO1xuICB9O1xuXG4gIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gb3JkaW5hbCgpXG4gICAgICAgIC5kb21haW4oZG9tYWluKVxuICAgICAgICAucmFuZ2UocmFuZ2UpXG4gICAgICAgIC51bmtub3duKHVua25vd24pO1xuICB9O1xuXG4gIHJldHVybiBzY2FsZTtcbn1cbiIsImltcG9ydCB7cmFuZ2UgYXMgc2VxdWVuY2V9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IG9yZGluYWwgZnJvbSBcIi4vb3JkaW5hbFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBiYW5kKCkge1xuICB2YXIgc2NhbGUgPSBvcmRpbmFsKCkudW5rbm93bih1bmRlZmluZWQpLFxuICAgICAgZG9tYWluID0gc2NhbGUuZG9tYWluLFxuICAgICAgb3JkaW5hbFJhbmdlID0gc2NhbGUucmFuZ2UsXG4gICAgICByYW5nZSA9IFswLCAxXSxcbiAgICAgIHN0ZXAsXG4gICAgICBiYW5kd2lkdGgsXG4gICAgICByb3VuZCA9IGZhbHNlLFxuICAgICAgcGFkZGluZ0lubmVyID0gMCxcbiAgICAgIHBhZGRpbmdPdXRlciA9IDAsXG4gICAgICBhbGlnbiA9IDAuNTtcblxuICBkZWxldGUgc2NhbGUudW5rbm93bjtcblxuICBmdW5jdGlvbiByZXNjYWxlKCkge1xuICAgIHZhciBuID0gZG9tYWluKCkubGVuZ3RoLFxuICAgICAgICByZXZlcnNlID0gcmFuZ2VbMV0gPCByYW5nZVswXSxcbiAgICAgICAgc3RhcnQgPSByYW5nZVtyZXZlcnNlIC0gMF0sXG4gICAgICAgIHN0b3AgPSByYW5nZVsxIC0gcmV2ZXJzZV07XG4gICAgc3RlcCA9IChzdG9wIC0gc3RhcnQpIC8gTWF0aC5tYXgoMSwgbiAtIHBhZGRpbmdJbm5lciArIHBhZGRpbmdPdXRlciAqIDIpO1xuICAgIGlmIChyb3VuZCkgc3RlcCA9IE1hdGguZmxvb3Ioc3RlcCk7XG4gICAgc3RhcnQgKz0gKHN0b3AgLSBzdGFydCAtIHN0ZXAgKiAobiAtIHBhZGRpbmdJbm5lcikpICogYWxpZ247XG4gICAgYmFuZHdpZHRoID0gc3RlcCAqICgxIC0gcGFkZGluZ0lubmVyKTtcbiAgICBpZiAocm91bmQpIHN0YXJ0ID0gTWF0aC5yb3VuZChzdGFydCksIGJhbmR3aWR0aCA9IE1hdGgucm91bmQoYmFuZHdpZHRoKTtcbiAgICB2YXIgdmFsdWVzID0gc2VxdWVuY2UobikubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIHN0YXJ0ICsgc3RlcCAqIGk7IH0pO1xuICAgIHJldHVybiBvcmRpbmFsUmFuZ2UocmV2ZXJzZSA/IHZhbHVlcy5yZXZlcnNlKCkgOiB2YWx1ZXMpO1xuICB9XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRvbWFpbihfKSwgcmVzY2FsZSgpKSA6IGRvbWFpbigpO1xuICB9O1xuXG4gIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHJhbmdlID0gWytfWzBdLCArX1sxXV0sIHJlc2NhbGUoKSkgOiByYW5nZS5zbGljZSgpO1xuICB9O1xuXG4gIHNjYWxlLnJhbmdlUm91bmQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIHJhbmdlID0gWytfWzBdLCArX1sxXV0sIHJvdW5kID0gdHJ1ZSwgcmVzY2FsZSgpO1xuICB9O1xuXG4gIHNjYWxlLmJhbmR3aWR0aCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBiYW5kd2lkdGg7XG4gIH07XG5cbiAgc2NhbGUuc3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzdGVwO1xuICB9O1xuXG4gIHNjYWxlLnJvdW5kID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHJvdW5kID0gISFfLCByZXNjYWxlKCkpIDogcm91bmQ7XG4gIH07XG5cbiAgc2NhbGUucGFkZGluZyA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChwYWRkaW5nSW5uZXIgPSBwYWRkaW5nT3V0ZXIgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBfKSksIHJlc2NhbGUoKSkgOiBwYWRkaW5nSW5uZXI7XG4gIH07XG5cbiAgc2NhbGUucGFkZGluZ0lubmVyID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHBhZGRpbmdJbm5lciA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIF8pKSwgcmVzY2FsZSgpKSA6IHBhZGRpbmdJbm5lcjtcbiAgfTtcblxuICBzY2FsZS5wYWRkaW5nT3V0ZXIgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkZGluZ091dGVyID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgXykpLCByZXNjYWxlKCkpIDogcGFkZGluZ091dGVyO1xuICB9O1xuXG4gIHNjYWxlLmFsaWduID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGFsaWduID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgXykpLCByZXNjYWxlKCkpIDogYWxpZ247XG4gIH07XG5cbiAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBiYW5kKClcbiAgICAgICAgLmRvbWFpbihkb21haW4oKSlcbiAgICAgICAgLnJhbmdlKHJhbmdlKVxuICAgICAgICAucm91bmQocm91bmQpXG4gICAgICAgIC5wYWRkaW5nSW5uZXIocGFkZGluZ0lubmVyKVxuICAgICAgICAucGFkZGluZ091dGVyKHBhZGRpbmdPdXRlcilcbiAgICAgICAgLmFsaWduKGFsaWduKTtcbiAgfTtcblxuICByZXR1cm4gcmVzY2FsZSgpO1xufVxuXG5mdW5jdGlvbiBwb2ludGlzaChzY2FsZSkge1xuICB2YXIgY29weSA9IHNjYWxlLmNvcHk7XG5cbiAgc2NhbGUucGFkZGluZyA9IHNjYWxlLnBhZGRpbmdPdXRlcjtcbiAgZGVsZXRlIHNjYWxlLnBhZGRpbmdJbm5lcjtcbiAgZGVsZXRlIHNjYWxlLnBhZGRpbmdPdXRlcjtcblxuICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHBvaW50aXNoKGNvcHkoKSk7XG4gIH07XG5cbiAgcmV0dXJuIHNjYWxlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcG9pbnQoKSB7XG4gIHJldHVybiBwb2ludGlzaChiYW5kKCkucGFkZGluZ0lubmVyKDEpKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB4O1xuICB9O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4gK3g7XG59XG4iLCJpbXBvcnQge2Jpc2VjdH0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge2ludGVycG9sYXRlIGFzIGludGVycG9sYXRlVmFsdWUsIGludGVycG9sYXRlUm91bmR9IGZyb20gXCJkMy1pbnRlcnBvbGF0ZVwiO1xuaW1wb3J0IHttYXAsIHNsaWNlfSBmcm9tIFwiLi9hcnJheVwiO1xuaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuL2NvbnN0YW50XCI7XG5pbXBvcnQgbnVtYmVyIGZyb20gXCIuL251bWJlclwiO1xuXG52YXIgdW5pdCA9IFswLCAxXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRlaW50ZXJwb2xhdGVMaW5lYXIoYSwgYikge1xuICByZXR1cm4gKGIgLT0gKGEgPSArYSkpXG4gICAgICA/IGZ1bmN0aW9uKHgpIHsgcmV0dXJuICh4IC0gYSkgLyBiOyB9XG4gICAgICA6IGNvbnN0YW50KGIpO1xufVxuXG5mdW5jdGlvbiBkZWludGVycG9sYXRlQ2xhbXAoZGVpbnRlcnBvbGF0ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oYSwgYikge1xuICAgIHZhciBkID0gZGVpbnRlcnBvbGF0ZShhID0gK2EsIGIgPSArYik7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggPD0gYSA/IDAgOiB4ID49IGIgPyAxIDogZCh4KTsgfTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVpbnRlcnBvbGF0ZUNsYW1wKHJlaW50ZXJwb2xhdGUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICB2YXIgciA9IHJlaW50ZXJwb2xhdGUoYSA9ICthLCBiID0gK2IpO1xuICAgIHJldHVybiBmdW5jdGlvbih0KSB7IHJldHVybiB0IDw9IDAgPyBhIDogdCA+PSAxID8gYiA6IHIodCk7IH07XG4gIH07XG59XG5cbmZ1bmN0aW9uIGJpbWFwKGRvbWFpbiwgcmFuZ2UsIGRlaW50ZXJwb2xhdGUsIHJlaW50ZXJwb2xhdGUpIHtcbiAgdmFyIGQwID0gZG9tYWluWzBdLCBkMSA9IGRvbWFpblsxXSwgcjAgPSByYW5nZVswXSwgcjEgPSByYW5nZVsxXTtcbiAgaWYgKGQxIDwgZDApIGQwID0gZGVpbnRlcnBvbGF0ZShkMSwgZDApLCByMCA9IHJlaW50ZXJwb2xhdGUocjEsIHIwKTtcbiAgZWxzZSBkMCA9IGRlaW50ZXJwb2xhdGUoZDAsIGQxKSwgcjAgPSByZWludGVycG9sYXRlKHIwLCByMSk7XG4gIHJldHVybiBmdW5jdGlvbih4KSB7IHJldHVybiByMChkMCh4KSk7IH07XG59XG5cbmZ1bmN0aW9uIHBvbHltYXAoZG9tYWluLCByYW5nZSwgZGVpbnRlcnBvbGF0ZSwgcmVpbnRlcnBvbGF0ZSkge1xuICB2YXIgaiA9IE1hdGgubWluKGRvbWFpbi5sZW5ndGgsIHJhbmdlLmxlbmd0aCkgLSAxLFxuICAgICAgZCA9IG5ldyBBcnJheShqKSxcbiAgICAgIHIgPSBuZXcgQXJyYXkoaiksXG4gICAgICBpID0gLTE7XG5cbiAgLy8gUmV2ZXJzZSBkZXNjZW5kaW5nIGRvbWFpbnMuXG4gIGlmIChkb21haW5bal0gPCBkb21haW5bMF0pIHtcbiAgICBkb21haW4gPSBkb21haW4uc2xpY2UoKS5yZXZlcnNlKCk7XG4gICAgcmFuZ2UgPSByYW5nZS5zbGljZSgpLnJldmVyc2UoKTtcbiAgfVxuXG4gIHdoaWxlICgrK2kgPCBqKSB7XG4gICAgZFtpXSA9IGRlaW50ZXJwb2xhdGUoZG9tYWluW2ldLCBkb21haW5baSArIDFdKTtcbiAgICByW2ldID0gcmVpbnRlcnBvbGF0ZShyYW5nZVtpXSwgcmFuZ2VbaSArIDFdKTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbih4KSB7XG4gICAgdmFyIGkgPSBiaXNlY3QoZG9tYWluLCB4LCAxLCBqKSAtIDE7XG4gICAgcmV0dXJuIHJbaV0oZFtpXSh4KSk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3B5KHNvdXJjZSwgdGFyZ2V0KSB7XG4gIHJldHVybiB0YXJnZXRcbiAgICAgIC5kb21haW4oc291cmNlLmRvbWFpbigpKVxuICAgICAgLnJhbmdlKHNvdXJjZS5yYW5nZSgpKVxuICAgICAgLmludGVycG9sYXRlKHNvdXJjZS5pbnRlcnBvbGF0ZSgpKVxuICAgICAgLmNsYW1wKHNvdXJjZS5jbGFtcCgpKTtcbn1cblxuLy8gZGVpbnRlcnBvbGF0ZShhLCBiKSh4KSB0YWtlcyBhIGRvbWFpbiB2YWx1ZSB4IGluIFthLGJdIGFuZCByZXR1cm5zIHRoZSBjb3JyZXNwb25kaW5nIHBhcmFtZXRlciB0IGluIFswLDFdLlxuLy8gcmVpbnRlcnBvbGF0ZShhLCBiKSh0KSB0YWtlcyBhIHBhcmFtZXRlciB0IGluIFswLDFdIGFuZCByZXR1cm5zIHRoZSBjb3JyZXNwb25kaW5nIGRvbWFpbiB2YWx1ZSB4IGluIFthLGJdLlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29udGludW91cyhkZWludGVycG9sYXRlLCByZWludGVycG9sYXRlKSB7XG4gIHZhciBkb21haW4gPSB1bml0LFxuICAgICAgcmFuZ2UgPSB1bml0LFxuICAgICAgaW50ZXJwb2xhdGUgPSBpbnRlcnBvbGF0ZVZhbHVlLFxuICAgICAgY2xhbXAgPSBmYWxzZSxcbiAgICAgIHBpZWNld2lzZSxcbiAgICAgIG91dHB1dCxcbiAgICAgIGlucHV0O1xuXG4gIGZ1bmN0aW9uIHJlc2NhbGUoKSB7XG4gICAgcGllY2V3aXNlID0gTWF0aC5taW4oZG9tYWluLmxlbmd0aCwgcmFuZ2UubGVuZ3RoKSA+IDIgPyBwb2x5bWFwIDogYmltYXA7XG4gICAgb3V0cHV0ID0gaW5wdXQgPSBudWxsO1xuICAgIHJldHVybiBzY2FsZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNjYWxlKHgpIHtcbiAgICByZXR1cm4gKG91dHB1dCB8fCAob3V0cHV0ID0gcGllY2V3aXNlKGRvbWFpbiwgcmFuZ2UsIGNsYW1wID8gZGVpbnRlcnBvbGF0ZUNsYW1wKGRlaW50ZXJwb2xhdGUpIDogZGVpbnRlcnBvbGF0ZSwgaW50ZXJwb2xhdGUpKSkoK3gpO1xuICB9XG5cbiAgc2NhbGUuaW52ZXJ0ID0gZnVuY3Rpb24oeSkge1xuICAgIHJldHVybiAoaW5wdXQgfHwgKGlucHV0ID0gcGllY2V3aXNlKHJhbmdlLCBkb21haW4sIGRlaW50ZXJwb2xhdGVMaW5lYXIsIGNsYW1wID8gcmVpbnRlcnBvbGF0ZUNsYW1wKHJlaW50ZXJwb2xhdGUpIDogcmVpbnRlcnBvbGF0ZSkpKSgreSk7XG4gIH07XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRvbWFpbiA9IG1hcC5jYWxsKF8sIG51bWJlciksIHJlc2NhbGUoKSkgOiBkb21haW4uc2xpY2UoKTtcbiAgfTtcblxuICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChyYW5nZSA9IHNsaWNlLmNhbGwoXyksIHJlc2NhbGUoKSkgOiByYW5nZS5zbGljZSgpO1xuICB9O1xuXG4gIHNjYWxlLnJhbmdlUm91bmQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIHJhbmdlID0gc2xpY2UuY2FsbChfKSwgaW50ZXJwb2xhdGUgPSBpbnRlcnBvbGF0ZVJvdW5kLCByZXNjYWxlKCk7XG4gIH07XG5cbiAgc2NhbGUuY2xhbXAgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoY2xhbXAgPSAhIV8sIHJlc2NhbGUoKSkgOiBjbGFtcDtcbiAgfTtcblxuICBzY2FsZS5pbnRlcnBvbGF0ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChpbnRlcnBvbGF0ZSA9IF8sIHJlc2NhbGUoKSkgOiBpbnRlcnBvbGF0ZTtcbiAgfTtcblxuICByZXR1cm4gcmVzY2FsZSgpO1xufVxuIiwiLy8gQ29tcHV0ZXMgdGhlIGRlY2ltYWwgY29lZmZpY2llbnQgYW5kIGV4cG9uZW50IG9mIHRoZSBzcGVjaWZpZWQgbnVtYmVyIHggd2l0aFxuLy8gc2lnbmlmaWNhbnQgZGlnaXRzIHAsIHdoZXJlIHggaXMgcG9zaXRpdmUgYW5kIHAgaXMgaW4gWzEsIDIxXSBvciB1bmRlZmluZWQuXG4vLyBGb3IgZXhhbXBsZSwgZm9ybWF0RGVjaW1hbCgxLjIzKSByZXR1cm5zIFtcIjEyM1wiLCAwXS5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgsIHApIHtcbiAgaWYgKChpID0gKHggPSBwID8geC50b0V4cG9uZW50aWFsKHAgLSAxKSA6IHgudG9FeHBvbmVudGlhbCgpKS5pbmRleE9mKFwiZVwiKSkgPCAwKSByZXR1cm4gbnVsbDsgLy8gTmFOLCDCsUluZmluaXR5XG4gIHZhciBpLCBjb2VmZmljaWVudCA9IHguc2xpY2UoMCwgaSk7XG5cbiAgLy8gVGhlIHN0cmluZyByZXR1cm5lZCBieSB0b0V4cG9uZW50aWFsIGVpdGhlciBoYXMgdGhlIGZvcm0gXFxkXFwuXFxkK2VbLStdXFxkK1xuICAvLyAoZS5nLiwgMS4yZSszKSBvciB0aGUgZm9ybSBcXGRlWy0rXVxcZCsgKGUuZy4sIDFlKzMpLlxuICByZXR1cm4gW1xuICAgIGNvZWZmaWNpZW50Lmxlbmd0aCA+IDEgPyBjb2VmZmljaWVudFswXSArIGNvZWZmaWNpZW50LnNsaWNlKDIpIDogY29lZmZpY2llbnQsXG4gICAgK3guc2xpY2UoaSArIDEpXG4gIF07XG59XG4iLCJpbXBvcnQgZm9ybWF0RGVjaW1hbCBmcm9tIFwiLi9mb3JtYXREZWNpbWFsXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHggPSBmb3JtYXREZWNpbWFsKE1hdGguYWJzKHgpKSwgeCA/IHhbMV0gOiBOYU47XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihncm91cGluZywgdGhvdXNhbmRzKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSwgd2lkdGgpIHtcbiAgICB2YXIgaSA9IHZhbHVlLmxlbmd0aCxcbiAgICAgICAgdCA9IFtdLFxuICAgICAgICBqID0gMCxcbiAgICAgICAgZyA9IGdyb3VwaW5nWzBdLFxuICAgICAgICBsZW5ndGggPSAwO1xuXG4gICAgd2hpbGUgKGkgPiAwICYmIGcgPiAwKSB7XG4gICAgICBpZiAobGVuZ3RoICsgZyArIDEgPiB3aWR0aCkgZyA9IE1hdGgubWF4KDEsIHdpZHRoIC0gbGVuZ3RoKTtcbiAgICAgIHQucHVzaCh2YWx1ZS5zdWJzdHJpbmcoaSAtPSBnLCBpICsgZykpO1xuICAgICAgaWYgKChsZW5ndGggKz0gZyArIDEpID4gd2lkdGgpIGJyZWFrO1xuICAgICAgZyA9IGdyb3VwaW5nW2ogPSAoaiArIDEpICUgZ3JvdXBpbmcubGVuZ3RoXTtcbiAgICB9XG5cbiAgICByZXR1cm4gdC5yZXZlcnNlKCkuam9pbih0aG91c2FuZHMpO1xuICB9O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obnVtZXJhbHMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL1swLTldL2csIGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBudW1lcmFsc1sraV07XG4gICAgfSk7XG4gIH07XG59XG4iLCIvLyBbW2ZpbGxdYWxpZ25dW3NpZ25dW3N5bWJvbF1bMF1bd2lkdGhdWyxdWy5wcmVjaXNpb25dW35dW3R5cGVdXG52YXIgcmUgPSAvXig/OiguKT8oWzw+PV5dKSk/KFsrXFwtKCBdKT8oWyQjXSk/KDApPyhcXGQrKT8oLCk/KFxcLlxcZCspPyh+KT8oW2EteiVdKT8kL2k7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGZvcm1hdFNwZWNpZmllcihzcGVjaWZpZXIpIHtcbiAgcmV0dXJuIG5ldyBGb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKTtcbn1cblxuZm9ybWF0U3BlY2lmaWVyLnByb3RvdHlwZSA9IEZvcm1hdFNwZWNpZmllci5wcm90b3R5cGU7IC8vIGluc3RhbmNlb2ZcblxuZnVuY3Rpb24gRm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcikge1xuICBpZiAoIShtYXRjaCA9IHJlLmV4ZWMoc3BlY2lmaWVyKSkpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgZm9ybWF0OiBcIiArIHNwZWNpZmllcik7XG4gIHZhciBtYXRjaDtcbiAgdGhpcy5maWxsID0gbWF0Y2hbMV0gfHwgXCIgXCI7XG4gIHRoaXMuYWxpZ24gPSBtYXRjaFsyXSB8fCBcIj5cIjtcbiAgdGhpcy5zaWduID0gbWF0Y2hbM10gfHwgXCItXCI7XG4gIHRoaXMuc3ltYm9sID0gbWF0Y2hbNF0gfHwgXCJcIjtcbiAgdGhpcy56ZXJvID0gISFtYXRjaFs1XTtcbiAgdGhpcy53aWR0aCA9IG1hdGNoWzZdICYmICttYXRjaFs2XTtcbiAgdGhpcy5jb21tYSA9ICEhbWF0Y2hbN107XG4gIHRoaXMucHJlY2lzaW9uID0gbWF0Y2hbOF0gJiYgK21hdGNoWzhdLnNsaWNlKDEpO1xuICB0aGlzLnRyaW0gPSAhIW1hdGNoWzldO1xuICB0aGlzLnR5cGUgPSBtYXRjaFsxMF0gfHwgXCJcIjtcbn1cblxuRm9ybWF0U3BlY2lmaWVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5maWxsXG4gICAgICArIHRoaXMuYWxpZ25cbiAgICAgICsgdGhpcy5zaWduXG4gICAgICArIHRoaXMuc3ltYm9sXG4gICAgICArICh0aGlzLnplcm8gPyBcIjBcIiA6IFwiXCIpXG4gICAgICArICh0aGlzLndpZHRoID09IG51bGwgPyBcIlwiIDogTWF0aC5tYXgoMSwgdGhpcy53aWR0aCB8IDApKVxuICAgICAgKyAodGhpcy5jb21tYSA/IFwiLFwiIDogXCJcIilcbiAgICAgICsgKHRoaXMucHJlY2lzaW9uID09IG51bGwgPyBcIlwiIDogXCIuXCIgKyBNYXRoLm1heCgwLCB0aGlzLnByZWNpc2lvbiB8IDApKVxuICAgICAgKyAodGhpcy50cmltID8gXCJ+XCIgOiBcIlwiKVxuICAgICAgKyB0aGlzLnR5cGU7XG59O1xuIiwiLy8gVHJpbXMgaW5zaWduaWZpY2FudCB6ZXJvcywgZS5nLiwgcmVwbGFjZXMgMS4yMDAwayB3aXRoIDEuMmsuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzKSB7XG4gIG91dDogZm9yICh2YXIgbiA9IHMubGVuZ3RoLCBpID0gMSwgaTAgPSAtMSwgaTE7IGkgPCBuOyArK2kpIHtcbiAgICBzd2l0Y2ggKHNbaV0pIHtcbiAgICAgIGNhc2UgXCIuXCI6IGkwID0gaTEgPSBpOyBicmVhaztcbiAgICAgIGNhc2UgXCIwXCI6IGlmIChpMCA9PT0gMCkgaTAgPSBpOyBpMSA9IGk7IGJyZWFrO1xuICAgICAgZGVmYXVsdDogaWYgKGkwID4gMCkgeyBpZiAoIStzW2ldKSBicmVhayBvdXQ7IGkwID0gMDsgfSBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGkwID4gMCA/IHMuc2xpY2UoMCwgaTApICsgcy5zbGljZShpMSArIDEpIDogcztcbn1cbiIsImltcG9ydCBmb3JtYXREZWNpbWFsIGZyb20gXCIuL2Zvcm1hdERlY2ltYWxcIjtcblxuZXhwb3J0IHZhciBwcmVmaXhFeHBvbmVudDtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgcCkge1xuICB2YXIgZCA9IGZvcm1hdERlY2ltYWwoeCwgcCk7XG4gIGlmICghZCkgcmV0dXJuIHggKyBcIlwiO1xuICB2YXIgY29lZmZpY2llbnQgPSBkWzBdLFxuICAgICAgZXhwb25lbnQgPSBkWzFdLFxuICAgICAgaSA9IGV4cG9uZW50IC0gKHByZWZpeEV4cG9uZW50ID0gTWF0aC5tYXgoLTgsIE1hdGgubWluKDgsIE1hdGguZmxvb3IoZXhwb25lbnQgLyAzKSkpICogMykgKyAxLFxuICAgICAgbiA9IGNvZWZmaWNpZW50Lmxlbmd0aDtcbiAgcmV0dXJuIGkgPT09IG4gPyBjb2VmZmljaWVudFxuICAgICAgOiBpID4gbiA/IGNvZWZmaWNpZW50ICsgbmV3IEFycmF5KGkgLSBuICsgMSkuam9pbihcIjBcIilcbiAgICAgIDogaSA+IDAgPyBjb2VmZmljaWVudC5zbGljZSgwLCBpKSArIFwiLlwiICsgY29lZmZpY2llbnQuc2xpY2UoaSlcbiAgICAgIDogXCIwLlwiICsgbmV3IEFycmF5KDEgLSBpKS5qb2luKFwiMFwiKSArIGZvcm1hdERlY2ltYWwoeCwgTWF0aC5tYXgoMCwgcCArIGkgLSAxKSlbMF07IC8vIGxlc3MgdGhhbiAxeSFcbn1cbiIsImltcG9ydCBmb3JtYXREZWNpbWFsIGZyb20gXCIuL2Zvcm1hdERlY2ltYWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgcCkge1xuICB2YXIgZCA9IGZvcm1hdERlY2ltYWwoeCwgcCk7XG4gIGlmICghZCkgcmV0dXJuIHggKyBcIlwiO1xuICB2YXIgY29lZmZpY2llbnQgPSBkWzBdLFxuICAgICAgZXhwb25lbnQgPSBkWzFdO1xuICByZXR1cm4gZXhwb25lbnQgPCAwID8gXCIwLlwiICsgbmV3IEFycmF5KC1leHBvbmVudCkuam9pbihcIjBcIikgKyBjb2VmZmljaWVudFxuICAgICAgOiBjb2VmZmljaWVudC5sZW5ndGggPiBleHBvbmVudCArIDEgPyBjb2VmZmljaWVudC5zbGljZSgwLCBleHBvbmVudCArIDEpICsgXCIuXCIgKyBjb2VmZmljaWVudC5zbGljZShleHBvbmVudCArIDEpXG4gICAgICA6IGNvZWZmaWNpZW50ICsgbmV3IEFycmF5KGV4cG9uZW50IC0gY29lZmZpY2llbnQubGVuZ3RoICsgMikuam9pbihcIjBcIik7XG59XG4iLCJpbXBvcnQgZm9ybWF0UHJlZml4QXV0byBmcm9tIFwiLi9mb3JtYXRQcmVmaXhBdXRvXCI7XG5pbXBvcnQgZm9ybWF0Um91bmRlZCBmcm9tIFwiLi9mb3JtYXRSb3VuZGVkXCI7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgXCIlXCI6IGZ1bmN0aW9uKHgsIHApIHsgcmV0dXJuICh4ICogMTAwKS50b0ZpeGVkKHApOyB9LFxuICBcImJcIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygyKTsgfSxcbiAgXCJjXCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHggKyBcIlwiOyB9LFxuICBcImRcIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygxMCk7IH0sXG4gIFwiZVwiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvRXhwb25lbnRpYWwocCk7IH0sXG4gIFwiZlwiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvRml4ZWQocCk7IH0sXG4gIFwiZ1wiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiB4LnRvUHJlY2lzaW9uKHApOyB9LFxuICBcIm9cIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZyg4KTsgfSxcbiAgXCJwXCI6IGZ1bmN0aW9uKHgsIHApIHsgcmV0dXJuIGZvcm1hdFJvdW5kZWQoeCAqIDEwMCwgcCk7IH0sXG4gIFwiclwiOiBmb3JtYXRSb3VuZGVkLFxuICBcInNcIjogZm9ybWF0UHJlZml4QXV0byxcbiAgXCJYXCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE1hdGgucm91bmQoeCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7IH0sXG4gIFwieFwiOiBmdW5jdGlvbih4KSB7IHJldHVybiBNYXRoLnJvdW5kKHgpLnRvU3RyaW5nKDE2KTsgfVxufTtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHg7XG59XG4iLCJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnRcIjtcbmltcG9ydCBmb3JtYXRHcm91cCBmcm9tIFwiLi9mb3JtYXRHcm91cFwiO1xuaW1wb3J0IGZvcm1hdE51bWVyYWxzIGZyb20gXCIuL2Zvcm1hdE51bWVyYWxzXCI7XG5pbXBvcnQgZm9ybWF0U3BlY2lmaWVyIGZyb20gXCIuL2Zvcm1hdFNwZWNpZmllclwiO1xuaW1wb3J0IGZvcm1hdFRyaW0gZnJvbSBcIi4vZm9ybWF0VHJpbVwiO1xuaW1wb3J0IGZvcm1hdFR5cGVzIGZyb20gXCIuL2Zvcm1hdFR5cGVzXCI7XG5pbXBvcnQge3ByZWZpeEV4cG9uZW50fSBmcm9tIFwiLi9mb3JtYXRQcmVmaXhBdXRvXCI7XG5pbXBvcnQgaWRlbnRpdHkgZnJvbSBcIi4vaWRlbnRpdHlcIjtcblxudmFyIHByZWZpeGVzID0gW1wieVwiLFwielwiLFwiYVwiLFwiZlwiLFwicFwiLFwiblwiLFwiwrVcIixcIm1cIixcIlwiLFwia1wiLFwiTVwiLFwiR1wiLFwiVFwiLFwiUFwiLFwiRVwiLFwiWlwiLFwiWVwiXTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obG9jYWxlKSB7XG4gIHZhciBncm91cCA9IGxvY2FsZS5ncm91cGluZyAmJiBsb2NhbGUudGhvdXNhbmRzID8gZm9ybWF0R3JvdXAobG9jYWxlLmdyb3VwaW5nLCBsb2NhbGUudGhvdXNhbmRzKSA6IGlkZW50aXR5LFxuICAgICAgY3VycmVuY3kgPSBsb2NhbGUuY3VycmVuY3ksXG4gICAgICBkZWNpbWFsID0gbG9jYWxlLmRlY2ltYWwsXG4gICAgICBudW1lcmFscyA9IGxvY2FsZS5udW1lcmFscyA/IGZvcm1hdE51bWVyYWxzKGxvY2FsZS5udW1lcmFscykgOiBpZGVudGl0eSxcbiAgICAgIHBlcmNlbnQgPSBsb2NhbGUucGVyY2VudCB8fCBcIiVcIjtcblxuICBmdW5jdGlvbiBuZXdGb3JtYXQoc3BlY2lmaWVyKSB7XG4gICAgc3BlY2lmaWVyID0gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcik7XG5cbiAgICB2YXIgZmlsbCA9IHNwZWNpZmllci5maWxsLFxuICAgICAgICBhbGlnbiA9IHNwZWNpZmllci5hbGlnbixcbiAgICAgICAgc2lnbiA9IHNwZWNpZmllci5zaWduLFxuICAgICAgICBzeW1ib2wgPSBzcGVjaWZpZXIuc3ltYm9sLFxuICAgICAgICB6ZXJvID0gc3BlY2lmaWVyLnplcm8sXG4gICAgICAgIHdpZHRoID0gc3BlY2lmaWVyLndpZHRoLFxuICAgICAgICBjb21tYSA9IHNwZWNpZmllci5jb21tYSxcbiAgICAgICAgcHJlY2lzaW9uID0gc3BlY2lmaWVyLnByZWNpc2lvbixcbiAgICAgICAgdHJpbSA9IHNwZWNpZmllci50cmltLFxuICAgICAgICB0eXBlID0gc3BlY2lmaWVyLnR5cGU7XG5cbiAgICAvLyBUaGUgXCJuXCIgdHlwZSBpcyBhbiBhbGlhcyBmb3IgXCIsZ1wiLlxuICAgIGlmICh0eXBlID09PSBcIm5cIikgY29tbWEgPSB0cnVlLCB0eXBlID0gXCJnXCI7XG5cbiAgICAvLyBUaGUgXCJcIiB0eXBlLCBhbmQgYW55IGludmFsaWQgdHlwZSwgaXMgYW4gYWxpYXMgZm9yIFwiLjEyfmdcIi5cbiAgICBlbHNlIGlmICghZm9ybWF0VHlwZXNbdHlwZV0pIHByZWNpc2lvbiA9PSBudWxsICYmIChwcmVjaXNpb24gPSAxMiksIHRyaW0gPSB0cnVlLCB0eXBlID0gXCJnXCI7XG5cbiAgICAvLyBJZiB6ZXJvIGZpbGwgaXMgc3BlY2lmaWVkLCBwYWRkaW5nIGdvZXMgYWZ0ZXIgc2lnbiBhbmQgYmVmb3JlIGRpZ2l0cy5cbiAgICBpZiAoemVybyB8fCAoZmlsbCA9PT0gXCIwXCIgJiYgYWxpZ24gPT09IFwiPVwiKSkgemVybyA9IHRydWUsIGZpbGwgPSBcIjBcIiwgYWxpZ24gPSBcIj1cIjtcblxuICAgIC8vIENvbXB1dGUgdGhlIHByZWZpeCBhbmQgc3VmZml4LlxuICAgIC8vIEZvciBTSS1wcmVmaXgsIHRoZSBzdWZmaXggaXMgbGF6aWx5IGNvbXB1dGVkLlxuICAgIHZhciBwcmVmaXggPSBzeW1ib2wgPT09IFwiJFwiID8gY3VycmVuY3lbMF0gOiBzeW1ib2wgPT09IFwiI1wiICYmIC9bYm94WF0vLnRlc3QodHlwZSkgPyBcIjBcIiArIHR5cGUudG9Mb3dlckNhc2UoKSA6IFwiXCIsXG4gICAgICAgIHN1ZmZpeCA9IHN5bWJvbCA9PT0gXCIkXCIgPyBjdXJyZW5jeVsxXSA6IC9bJXBdLy50ZXN0KHR5cGUpID8gcGVyY2VudCA6IFwiXCI7XG5cbiAgICAvLyBXaGF0IGZvcm1hdCBmdW5jdGlvbiBzaG91bGQgd2UgdXNlP1xuICAgIC8vIElzIHRoaXMgYW4gaW50ZWdlciB0eXBlP1xuICAgIC8vIENhbiB0aGlzIHR5cGUgZ2VuZXJhdGUgZXhwb25lbnRpYWwgbm90YXRpb24/XG4gICAgdmFyIGZvcm1hdFR5cGUgPSBmb3JtYXRUeXBlc1t0eXBlXSxcbiAgICAgICAgbWF5YmVTdWZmaXggPSAvW2RlZmdwcnMlXS8udGVzdCh0eXBlKTtcblxuICAgIC8vIFNldCB0aGUgZGVmYXVsdCBwcmVjaXNpb24gaWYgbm90IHNwZWNpZmllZCxcbiAgICAvLyBvciBjbGFtcCB0aGUgc3BlY2lmaWVkIHByZWNpc2lvbiB0byB0aGUgc3VwcG9ydGVkIHJhbmdlLlxuICAgIC8vIEZvciBzaWduaWZpY2FudCBwcmVjaXNpb24sIGl0IG11c3QgYmUgaW4gWzEsIDIxXS5cbiAgICAvLyBGb3IgZml4ZWQgcHJlY2lzaW9uLCBpdCBtdXN0IGJlIGluIFswLCAyMF0uXG4gICAgcHJlY2lzaW9uID0gcHJlY2lzaW9uID09IG51bGwgPyA2XG4gICAgICAgIDogL1tncHJzXS8udGVzdCh0eXBlKSA/IE1hdGgubWF4KDEsIE1hdGgubWluKDIxLCBwcmVjaXNpb24pKVxuICAgICAgICA6IE1hdGgubWF4KDAsIE1hdGgubWluKDIwLCBwcmVjaXNpb24pKTtcblxuICAgIGZ1bmN0aW9uIGZvcm1hdCh2YWx1ZSkge1xuICAgICAgdmFyIHZhbHVlUHJlZml4ID0gcHJlZml4LFxuICAgICAgICAgIHZhbHVlU3VmZml4ID0gc3VmZml4LFxuICAgICAgICAgIGksIG4sIGM7XG5cbiAgICAgIGlmICh0eXBlID09PSBcImNcIikge1xuICAgICAgICB2YWx1ZVN1ZmZpeCA9IGZvcm1hdFR5cGUodmFsdWUpICsgdmFsdWVTdWZmaXg7XG4gICAgICAgIHZhbHVlID0gXCJcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gK3ZhbHVlO1xuXG4gICAgICAgIC8vIFBlcmZvcm0gdGhlIGluaXRpYWwgZm9ybWF0dGluZy5cbiAgICAgICAgdmFyIHZhbHVlTmVnYXRpdmUgPSB2YWx1ZSA8IDA7XG4gICAgICAgIHZhbHVlID0gZm9ybWF0VHlwZShNYXRoLmFicyh2YWx1ZSksIHByZWNpc2lvbik7XG5cbiAgICAgICAgLy8gVHJpbSBpbnNpZ25pZmljYW50IHplcm9zLlxuICAgICAgICBpZiAodHJpbSkgdmFsdWUgPSBmb3JtYXRUcmltKHZhbHVlKTtcblxuICAgICAgICAvLyBJZiBhIG5lZ2F0aXZlIHZhbHVlIHJvdW5kcyB0byB6ZXJvIGR1cmluZyBmb3JtYXR0aW5nLCB0cmVhdCBhcyBwb3NpdGl2ZS5cbiAgICAgICAgaWYgKHZhbHVlTmVnYXRpdmUgJiYgK3ZhbHVlID09PSAwKSB2YWx1ZU5lZ2F0aXZlID0gZmFsc2U7XG5cbiAgICAgICAgLy8gQ29tcHV0ZSB0aGUgcHJlZml4IGFuZCBzdWZmaXguXG4gICAgICAgIHZhbHVlUHJlZml4ID0gKHZhbHVlTmVnYXRpdmUgPyAoc2lnbiA9PT0gXCIoXCIgPyBzaWduIDogXCItXCIpIDogc2lnbiA9PT0gXCItXCIgfHwgc2lnbiA9PT0gXCIoXCIgPyBcIlwiIDogc2lnbikgKyB2YWx1ZVByZWZpeDtcbiAgICAgICAgdmFsdWVTdWZmaXggPSAodHlwZSA9PT0gXCJzXCIgPyBwcmVmaXhlc1s4ICsgcHJlZml4RXhwb25lbnQgLyAzXSA6IFwiXCIpICsgdmFsdWVTdWZmaXggKyAodmFsdWVOZWdhdGl2ZSAmJiBzaWduID09PSBcIihcIiA/IFwiKVwiIDogXCJcIik7XG5cbiAgICAgICAgLy8gQnJlYWsgdGhlIGZvcm1hdHRlZCB2YWx1ZSBpbnRvIHRoZSBpbnRlZ2VyIOKAnHZhbHVl4oCdIHBhcnQgdGhhdCBjYW4gYmVcbiAgICAgICAgLy8gZ3JvdXBlZCwgYW5kIGZyYWN0aW9uYWwgb3IgZXhwb25lbnRpYWwg4oCcc3VmZml44oCdIHBhcnQgdGhhdCBpcyBub3QuXG4gICAgICAgIGlmIChtYXliZVN1ZmZpeCkge1xuICAgICAgICAgIGkgPSAtMSwgbiA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICAgICAgaWYgKGMgPSB2YWx1ZS5jaGFyQ29kZUF0KGkpLCA0OCA+IGMgfHwgYyA+IDU3KSB7XG4gICAgICAgICAgICAgIHZhbHVlU3VmZml4ID0gKGMgPT09IDQ2ID8gZGVjaW1hbCArIHZhbHVlLnNsaWNlKGkgKyAxKSA6IHZhbHVlLnNsaWNlKGkpKSArIHZhbHVlU3VmZml4O1xuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnNsaWNlKDAsIGkpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIGZpbGwgY2hhcmFjdGVyIGlzIG5vdCBcIjBcIiwgZ3JvdXBpbmcgaXMgYXBwbGllZCBiZWZvcmUgcGFkZGluZy5cbiAgICAgIGlmIChjb21tYSAmJiAhemVybykgdmFsdWUgPSBncm91cCh2YWx1ZSwgSW5maW5pdHkpO1xuXG4gICAgICAvLyBDb21wdXRlIHRoZSBwYWRkaW5nLlxuICAgICAgdmFyIGxlbmd0aCA9IHZhbHVlUHJlZml4Lmxlbmd0aCArIHZhbHVlLmxlbmd0aCArIHZhbHVlU3VmZml4Lmxlbmd0aCxcbiAgICAgICAgICBwYWRkaW5nID0gbGVuZ3RoIDwgd2lkdGggPyBuZXcgQXJyYXkod2lkdGggLSBsZW5ndGggKyAxKS5qb2luKGZpbGwpIDogXCJcIjtcblxuICAgICAgLy8gSWYgdGhlIGZpbGwgY2hhcmFjdGVyIGlzIFwiMFwiLCBncm91cGluZyBpcyBhcHBsaWVkIGFmdGVyIHBhZGRpbmcuXG4gICAgICBpZiAoY29tbWEgJiYgemVybykgdmFsdWUgPSBncm91cChwYWRkaW5nICsgdmFsdWUsIHBhZGRpbmcubGVuZ3RoID8gd2lkdGggLSB2YWx1ZVN1ZmZpeC5sZW5ndGggOiBJbmZpbml0eSksIHBhZGRpbmcgPSBcIlwiO1xuXG4gICAgICAvLyBSZWNvbnN0cnVjdCB0aGUgZmluYWwgb3V0cHV0IGJhc2VkIG9uIHRoZSBkZXNpcmVkIGFsaWdubWVudC5cbiAgICAgIHN3aXRjaCAoYWxpZ24pIHtcbiAgICAgICAgY2FzZSBcIjxcIjogdmFsdWUgPSB2YWx1ZVByZWZpeCArIHZhbHVlICsgdmFsdWVTdWZmaXggKyBwYWRkaW5nOyBicmVhaztcbiAgICAgICAgY2FzZSBcIj1cIjogdmFsdWUgPSB2YWx1ZVByZWZpeCArIHBhZGRpbmcgKyB2YWx1ZSArIHZhbHVlU3VmZml4OyBicmVhaztcbiAgICAgICAgY2FzZSBcIl5cIjogdmFsdWUgPSBwYWRkaW5nLnNsaWNlKDAsIGxlbmd0aCA9IHBhZGRpbmcubGVuZ3RoID4+IDEpICsgdmFsdWVQcmVmaXggKyB2YWx1ZSArIHZhbHVlU3VmZml4ICsgcGFkZGluZy5zbGljZShsZW5ndGgpOyBicmVhaztcbiAgICAgICAgZGVmYXVsdDogdmFsdWUgPSBwYWRkaW5nICsgdmFsdWVQcmVmaXggKyB2YWx1ZSArIHZhbHVlU3VmZml4OyBicmVhaztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG51bWVyYWxzKHZhbHVlKTtcbiAgICB9XG5cbiAgICBmb3JtYXQudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBzcGVjaWZpZXIgKyBcIlwiO1xuICAgIH07XG5cbiAgICByZXR1cm4gZm9ybWF0O1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0UHJlZml4KHNwZWNpZmllciwgdmFsdWUpIHtcbiAgICB2YXIgZiA9IG5ld0Zvcm1hdCgoc3BlY2lmaWVyID0gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllciksIHNwZWNpZmllci50eXBlID0gXCJmXCIsIHNwZWNpZmllcikpLFxuICAgICAgICBlID0gTWF0aC5tYXgoLTgsIE1hdGgubWluKDgsIE1hdGguZmxvb3IoZXhwb25lbnQodmFsdWUpIC8gMykpKSAqIDMsXG4gICAgICAgIGsgPSBNYXRoLnBvdygxMCwgLWUpLFxuICAgICAgICBwcmVmaXggPSBwcmVmaXhlc1s4ICsgZSAvIDNdO1xuICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIGYoayAqIHZhbHVlKSArIHByZWZpeDtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBmb3JtYXQ6IG5ld0Zvcm1hdCxcbiAgICBmb3JtYXRQcmVmaXg6IGZvcm1hdFByZWZpeFxuICB9O1xufVxuIiwiaW1wb3J0IGZvcm1hdExvY2FsZSBmcm9tIFwiLi9sb2NhbGVcIjtcblxudmFyIGxvY2FsZTtcbmV4cG9ydCB2YXIgZm9ybWF0O1xuZXhwb3J0IHZhciBmb3JtYXRQcmVmaXg7XG5cbmRlZmF1bHRMb2NhbGUoe1xuICBkZWNpbWFsOiBcIi5cIixcbiAgdGhvdXNhbmRzOiBcIixcIixcbiAgZ3JvdXBpbmc6IFszXSxcbiAgY3VycmVuY3k6IFtcIiRcIiwgXCJcIl1cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkZWZhdWx0TG9jYWxlKGRlZmluaXRpb24pIHtcbiAgbG9jYWxlID0gZm9ybWF0TG9jYWxlKGRlZmluaXRpb24pO1xuICBmb3JtYXQgPSBsb2NhbGUuZm9ybWF0O1xuICBmb3JtYXRQcmVmaXggPSBsb2NhbGUuZm9ybWF0UHJlZml4O1xuICByZXR1cm4gbG9jYWxlO1xufVxuIiwiaW1wb3J0IGV4cG9uZW50IGZyb20gXCIuL2V4cG9uZW50XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0ZXApIHtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIC1leHBvbmVudChNYXRoLmFicyhzdGVwKSkpO1xufVxuIiwiaW1wb3J0IGV4cG9uZW50IGZyb20gXCIuL2V4cG9uZW50XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0ZXAsIHZhbHVlKSB7XG4gIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1heCgtOCwgTWF0aC5taW4oOCwgTWF0aC5mbG9vcihleHBvbmVudCh2YWx1ZSkgLyAzKSkpICogMyAtIGV4cG9uZW50KE1hdGguYWJzKHN0ZXApKSk7XG59XG4iLCJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RlcCwgbWF4KSB7XG4gIHN0ZXAgPSBNYXRoLmFicyhzdGVwKSwgbWF4ID0gTWF0aC5hYnMobWF4KSAtIHN0ZXA7XG4gIHJldHVybiBNYXRoLm1heCgwLCBleHBvbmVudChtYXgpIC0gZXhwb25lbnQoc3RlcCkpICsgMTtcbn1cbiIsImltcG9ydCB7dGlja1N0ZXB9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IHtmb3JtYXQsIGZvcm1hdFByZWZpeCwgZm9ybWF0U3BlY2lmaWVyLCBwcmVjaXNpb25GaXhlZCwgcHJlY2lzaW9uUHJlZml4LCBwcmVjaXNpb25Sb3VuZH0gZnJvbSBcImQzLWZvcm1hdFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihkb21haW4sIGNvdW50LCBzcGVjaWZpZXIpIHtcbiAgdmFyIHN0YXJ0ID0gZG9tYWluWzBdLFxuICAgICAgc3RvcCA9IGRvbWFpbltkb21haW4ubGVuZ3RoIC0gMV0sXG4gICAgICBzdGVwID0gdGlja1N0ZXAoc3RhcnQsIHN0b3AsIGNvdW50ID09IG51bGwgPyAxMCA6IGNvdW50KSxcbiAgICAgIHByZWNpc2lvbjtcbiAgc3BlY2lmaWVyID0gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllciA9PSBudWxsID8gXCIsZlwiIDogc3BlY2lmaWVyKTtcbiAgc3dpdGNoIChzcGVjaWZpZXIudHlwZSkge1xuICAgIGNhc2UgXCJzXCI6IHtcbiAgICAgIHZhciB2YWx1ZSA9IE1hdGgubWF4KE1hdGguYWJzKHN0YXJ0KSwgTWF0aC5hYnMoc3RvcCkpO1xuICAgICAgaWYgKHNwZWNpZmllci5wcmVjaXNpb24gPT0gbnVsbCAmJiAhaXNOYU4ocHJlY2lzaW9uID0gcHJlY2lzaW9uUHJlZml4KHN0ZXAsIHZhbHVlKSkpIHNwZWNpZmllci5wcmVjaXNpb24gPSBwcmVjaXNpb247XG4gICAgICByZXR1cm4gZm9ybWF0UHJlZml4KHNwZWNpZmllciwgdmFsdWUpO1xuICAgIH1cbiAgICBjYXNlIFwiXCI6XG4gICAgY2FzZSBcImVcIjpcbiAgICBjYXNlIFwiZ1wiOlxuICAgIGNhc2UgXCJwXCI6XG4gICAgY2FzZSBcInJcIjoge1xuICAgICAgaWYgKHNwZWNpZmllci5wcmVjaXNpb24gPT0gbnVsbCAmJiAhaXNOYU4ocHJlY2lzaW9uID0gcHJlY2lzaW9uUm91bmQoc3RlcCwgTWF0aC5tYXgoTWF0aC5hYnMoc3RhcnQpLCBNYXRoLmFicyhzdG9wKSkpKSkgc3BlY2lmaWVyLnByZWNpc2lvbiA9IHByZWNpc2lvbiAtIChzcGVjaWZpZXIudHlwZSA9PT0gXCJlXCIpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNhc2UgXCJmXCI6XG4gICAgY2FzZSBcIiVcIjoge1xuICAgICAgaWYgKHNwZWNpZmllci5wcmVjaXNpb24gPT0gbnVsbCAmJiAhaXNOYU4ocHJlY2lzaW9uID0gcHJlY2lzaW9uRml4ZWQoc3RlcCkpKSBzcGVjaWZpZXIucHJlY2lzaW9uID0gcHJlY2lzaW9uIC0gKHNwZWNpZmllci50eXBlID09PSBcIiVcIikgKiAyO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiBmb3JtYXQoc3BlY2lmaWVyKTtcbn1cbiIsImltcG9ydCB7dGlja3MsIHRpY2tJbmNyZW1lbnR9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IHtpbnRlcnBvbGF0ZU51bWJlciBhcyByZWludGVycG9sYXRlfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcbmltcG9ydCB7ZGVmYXVsdCBhcyBjb250aW51b3VzLCBjb3B5LCBkZWludGVycG9sYXRlTGluZWFyIGFzIGRlaW50ZXJwb2xhdGV9IGZyb20gXCIuL2NvbnRpbnVvdXNcIjtcbmltcG9ydCB0aWNrRm9ybWF0IGZyb20gXCIuL3RpY2tGb3JtYXRcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGxpbmVhcmlzaChzY2FsZSkge1xuICB2YXIgZG9tYWluID0gc2NhbGUuZG9tYWluO1xuXG4gIHNjYWxlLnRpY2tzID0gZnVuY3Rpb24oY291bnQpIHtcbiAgICB2YXIgZCA9IGRvbWFpbigpO1xuICAgIHJldHVybiB0aWNrcyhkWzBdLCBkW2QubGVuZ3RoIC0gMV0sIGNvdW50ID09IG51bGwgPyAxMCA6IGNvdW50KTtcbiAgfTtcblxuICBzY2FsZS50aWNrRm9ybWF0ID0gZnVuY3Rpb24oY291bnQsIHNwZWNpZmllcikge1xuICAgIHJldHVybiB0aWNrRm9ybWF0KGRvbWFpbigpLCBjb3VudCwgc3BlY2lmaWVyKTtcbiAgfTtcblxuICBzY2FsZS5uaWNlID0gZnVuY3Rpb24oY291bnQpIHtcbiAgICBpZiAoY291bnQgPT0gbnVsbCkgY291bnQgPSAxMDtcblxuICAgIHZhciBkID0gZG9tYWluKCksXG4gICAgICAgIGkwID0gMCxcbiAgICAgICAgaTEgPSBkLmxlbmd0aCAtIDEsXG4gICAgICAgIHN0YXJ0ID0gZFtpMF0sXG4gICAgICAgIHN0b3AgPSBkW2kxXSxcbiAgICAgICAgc3RlcDtcblxuICAgIGlmIChzdG9wIDwgc3RhcnQpIHtcbiAgICAgIHN0ZXAgPSBzdGFydCwgc3RhcnQgPSBzdG9wLCBzdG9wID0gc3RlcDtcbiAgICAgIHN0ZXAgPSBpMCwgaTAgPSBpMSwgaTEgPSBzdGVwO1xuICAgIH1cblxuICAgIHN0ZXAgPSB0aWNrSW5jcmVtZW50KHN0YXJ0LCBzdG9wLCBjb3VudCk7XG5cbiAgICBpZiAoc3RlcCA+IDApIHtcbiAgICAgIHN0YXJ0ID0gTWF0aC5mbG9vcihzdGFydCAvIHN0ZXApICogc3RlcDtcbiAgICAgIHN0b3AgPSBNYXRoLmNlaWwoc3RvcCAvIHN0ZXApICogc3RlcDtcbiAgICAgIHN0ZXAgPSB0aWNrSW5jcmVtZW50KHN0YXJ0LCBzdG9wLCBjb3VudCk7XG4gICAgfSBlbHNlIGlmIChzdGVwIDwgMCkge1xuICAgICAgc3RhcnQgPSBNYXRoLmNlaWwoc3RhcnQgKiBzdGVwKSAvIHN0ZXA7XG4gICAgICBzdG9wID0gTWF0aC5mbG9vcihzdG9wICogc3RlcCkgLyBzdGVwO1xuICAgICAgc3RlcCA9IHRpY2tJbmNyZW1lbnQoc3RhcnQsIHN0b3AsIGNvdW50KTtcbiAgICB9XG5cbiAgICBpZiAoc3RlcCA+IDApIHtcbiAgICAgIGRbaTBdID0gTWF0aC5mbG9vcihzdGFydCAvIHN0ZXApICogc3RlcDtcbiAgICAgIGRbaTFdID0gTWF0aC5jZWlsKHN0b3AgLyBzdGVwKSAqIHN0ZXA7XG4gICAgICBkb21haW4oZCk7XG4gICAgfSBlbHNlIGlmIChzdGVwIDwgMCkge1xuICAgICAgZFtpMF0gPSBNYXRoLmNlaWwoc3RhcnQgKiBzdGVwKSAvIHN0ZXA7XG4gICAgICBkW2kxXSA9IE1hdGguZmxvb3Ioc3RvcCAqIHN0ZXApIC8gc3RlcDtcbiAgICAgIGRvbWFpbihkKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2NhbGU7XG4gIH07XG5cbiAgcmV0dXJuIHNjYWxlO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBsaW5lYXIoKSB7XG4gIHZhciBzY2FsZSA9IGNvbnRpbnVvdXMoZGVpbnRlcnBvbGF0ZSwgcmVpbnRlcnBvbGF0ZSk7XG5cbiAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjb3B5KHNjYWxlLCBsaW5lYXIoKSk7XG4gIH07XG5cbiAgcmV0dXJuIGxpbmVhcmlzaChzY2FsZSk7XG59XG4iLCJpbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4vY29uc3RhbnRcIjtcbmltcG9ydCB7bGluZWFyaXNofSBmcm9tIFwiLi9saW5lYXJcIjtcbmltcG9ydCB7ZGVmYXVsdCBhcyBjb250aW51b3VzLCBjb3B5fSBmcm9tIFwiLi9jb250aW51b3VzXCI7XG5cbmZ1bmN0aW9uIHJhaXNlKHgsIGV4cG9uZW50KSB7XG4gIHJldHVybiB4IDwgMCA/IC1NYXRoLnBvdygteCwgZXhwb25lbnQpIDogTWF0aC5wb3coeCwgZXhwb25lbnQpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwb3coKSB7XG4gIHZhciBleHBvbmVudCA9IDEsXG4gICAgICBzY2FsZSA9IGNvbnRpbnVvdXMoZGVpbnRlcnBvbGF0ZSwgcmVpbnRlcnBvbGF0ZSksXG4gICAgICBkb21haW4gPSBzY2FsZS5kb21haW47XG5cbiAgZnVuY3Rpb24gZGVpbnRlcnBvbGF0ZShhLCBiKSB7XG4gICAgcmV0dXJuIChiID0gcmFpc2UoYiwgZXhwb25lbnQpIC0gKGEgPSByYWlzZShhLCBleHBvbmVudCkpKVxuICAgICAgICA/IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIChyYWlzZSh4LCBleHBvbmVudCkgLSBhKSAvIGI7IH1cbiAgICAgICAgOiBjb25zdGFudChiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlaW50ZXJwb2xhdGUoYSwgYikge1xuICAgIGIgPSByYWlzZShiLCBleHBvbmVudCkgLSAoYSA9IHJhaXNlKGEsIGV4cG9uZW50KSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHsgcmV0dXJuIHJhaXNlKGEgKyBiICogdCwgMSAvIGV4cG9uZW50KTsgfTtcbiAgfVxuXG4gIHNjYWxlLmV4cG9uZW50ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGV4cG9uZW50ID0gK18sIGRvbWFpbihkb21haW4oKSkpIDogZXhwb25lbnQ7XG4gIH07XG5cbiAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjb3B5KHNjYWxlLCBwb3coKS5leHBvbmVudChleHBvbmVudCkpO1xuICB9O1xuXG4gIHJldHVybiBsaW5lYXJpc2goc2NhbGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3FydCgpIHtcbiAgcmV0dXJuIHBvdygpLmV4cG9uZW50KDAuNSk7XG59XG4iLCJ2YXIgdDAgPSBuZXcgRGF0ZSxcbiAgICB0MSA9IG5ldyBEYXRlO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBuZXdJbnRlcnZhbChmbG9vcmksIG9mZnNldGksIGNvdW50LCBmaWVsZCkge1xuXG4gIGZ1bmN0aW9uIGludGVydmFsKGRhdGUpIHtcbiAgICByZXR1cm4gZmxvb3JpKGRhdGUgPSBuZXcgRGF0ZSgrZGF0ZSkpLCBkYXRlO1xuICB9XG5cbiAgaW50ZXJ2YWwuZmxvb3IgPSBpbnRlcnZhbDtcblxuICBpbnRlcnZhbC5jZWlsID0gZnVuY3Rpb24oZGF0ZSkge1xuICAgIHJldHVybiBmbG9vcmkoZGF0ZSA9IG5ldyBEYXRlKGRhdGUgLSAxKSksIG9mZnNldGkoZGF0ZSwgMSksIGZsb29yaShkYXRlKSwgZGF0ZTtcbiAgfTtcblxuICBpbnRlcnZhbC5yb3VuZCA9IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICB2YXIgZDAgPSBpbnRlcnZhbChkYXRlKSxcbiAgICAgICAgZDEgPSBpbnRlcnZhbC5jZWlsKGRhdGUpO1xuICAgIHJldHVybiBkYXRlIC0gZDAgPCBkMSAtIGRhdGUgPyBkMCA6IGQxO1xuICB9O1xuXG4gIGludGVydmFsLm9mZnNldCA9IGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICByZXR1cm4gb2Zmc2V0aShkYXRlID0gbmV3IERhdGUoK2RhdGUpLCBzdGVwID09IG51bGwgPyAxIDogTWF0aC5mbG9vcihzdGVwKSksIGRhdGU7XG4gIH07XG5cbiAgaW50ZXJ2YWwucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIHZhciByYW5nZSA9IFtdLCBwcmV2aW91cztcbiAgICBzdGFydCA9IGludGVydmFsLmNlaWwoc3RhcnQpO1xuICAgIHN0ZXAgPSBzdGVwID09IG51bGwgPyAxIDogTWF0aC5mbG9vcihzdGVwKTtcbiAgICBpZiAoIShzdGFydCA8IHN0b3ApIHx8ICEoc3RlcCA+IDApKSByZXR1cm4gcmFuZ2U7IC8vIGFsc28gaGFuZGxlcyBJbnZhbGlkIERhdGVcbiAgICBkbyByYW5nZS5wdXNoKHByZXZpb3VzID0gbmV3IERhdGUoK3N0YXJ0KSksIG9mZnNldGkoc3RhcnQsIHN0ZXApLCBmbG9vcmkoc3RhcnQpO1xuICAgIHdoaWxlIChwcmV2aW91cyA8IHN0YXJ0ICYmIHN0YXJ0IDwgc3RvcCk7XG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIGludGVydmFsLmZpbHRlciA9IGZ1bmN0aW9uKHRlc3QpIHtcbiAgICByZXR1cm4gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgaWYgKGRhdGUgPj0gZGF0ZSkgd2hpbGUgKGZsb29yaShkYXRlKSwgIXRlc3QoZGF0ZSkpIGRhdGUuc2V0VGltZShkYXRlIC0gMSk7XG4gICAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgICAgaWYgKGRhdGUgPj0gZGF0ZSkge1xuICAgICAgICBpZiAoc3RlcCA8IDApIHdoaWxlICgrK3N0ZXAgPD0gMCkge1xuICAgICAgICAgIHdoaWxlIChvZmZzZXRpKGRhdGUsIC0xKSwgIXRlc3QoZGF0ZSkpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHlcbiAgICAgICAgfSBlbHNlIHdoaWxlICgtLXN0ZXAgPj0gMCkge1xuICAgICAgICAgIHdoaWxlIChvZmZzZXRpKGRhdGUsICsxKSwgIXRlc3QoZGF0ZSkpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIGlmIChjb3VudCkge1xuICAgIGludGVydmFsLmNvdW50ID0gZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgICAgdDAuc2V0VGltZSgrc3RhcnQpLCB0MS5zZXRUaW1lKCtlbmQpO1xuICAgICAgZmxvb3JpKHQwKSwgZmxvb3JpKHQxKTtcbiAgICAgIHJldHVybiBNYXRoLmZsb29yKGNvdW50KHQwLCB0MSkpO1xuICAgIH07XG5cbiAgICBpbnRlcnZhbC5ldmVyeSA9IGZ1bmN0aW9uKHN0ZXApIHtcbiAgICAgIHN0ZXAgPSBNYXRoLmZsb29yKHN0ZXApO1xuICAgICAgcmV0dXJuICFpc0Zpbml0ZShzdGVwKSB8fCAhKHN0ZXAgPiAwKSA/IG51bGxcbiAgICAgICAgICA6ICEoc3RlcCA+IDEpID8gaW50ZXJ2YWxcbiAgICAgICAgICA6IGludGVydmFsLmZpbHRlcihmaWVsZFxuICAgICAgICAgICAgICA/IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGZpZWxkKGQpICUgc3RlcCA9PT0gMDsgfVxuICAgICAgICAgICAgICA6IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGludGVydmFsLmNvdW50KDAsIGQpICUgc3RlcCA9PT0gMDsgfSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBpbnRlcnZhbDtcbn1cbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuXG52YXIgbWlsbGlzZWNvbmQgPSBpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgLy8gbm9vcFxufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZCAtIHN0YXJ0O1xufSk7XG5cbi8vIEFuIG9wdGltaXplZCBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBzaW1wbGUgY2FzZS5cbm1pbGxpc2Vjb25kLmV2ZXJ5ID0gZnVuY3Rpb24oaykge1xuICBrID0gTWF0aC5mbG9vcihrKTtcbiAgaWYgKCFpc0Zpbml0ZShrKSB8fCAhKGsgPiAwKSkgcmV0dXJuIG51bGw7XG4gIGlmICghKGsgPiAxKSkgcmV0dXJuIG1pbGxpc2Vjb25kO1xuICByZXR1cm4gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0VGltZShNYXRoLmZsb29yKGRhdGUgLyBrKSAqIGspO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGspO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBrO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1pbGxpc2Vjb25kO1xuZXhwb3J0IHZhciBtaWxsaXNlY29uZHMgPSBtaWxsaXNlY29uZC5yYW5nZTtcbiIsImV4cG9ydCB2YXIgZHVyYXRpb25TZWNvbmQgPSAxZTM7XG5leHBvcnQgdmFyIGR1cmF0aW9uTWludXRlID0gNmU0O1xuZXhwb3J0IHZhciBkdXJhdGlvbkhvdXIgPSAzNmU1O1xuZXhwb3J0IHZhciBkdXJhdGlvbkRheSA9IDg2NGU1O1xuZXhwb3J0IHZhciBkdXJhdGlvbldlZWsgPSA2MDQ4ZTU7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25TZWNvbmR9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciBzZWNvbmQgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VGltZShNYXRoLmZsb29yKGRhdGUgLyBkdXJhdGlvblNlY29uZCkgKiBkdXJhdGlvblNlY29uZCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvblNlY29uZCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25TZWNvbmQ7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldFVUQ1NlY29uZHMoKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBzZWNvbmQ7XG5leHBvcnQgdmFyIHNlY29uZHMgPSBzZWNvbmQucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25NaW51dGV9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciBtaW51dGUgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VGltZShNYXRoLmZsb29yKGRhdGUgLyBkdXJhdGlvbk1pbnV0ZSkgKiBkdXJhdGlvbk1pbnV0ZSk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbk1pbnV0ZSk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25NaW51dGU7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldE1pbnV0ZXMoKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBtaW51dGU7XG5leHBvcnQgdmFyIG1pbnV0ZXMgPSBtaW51dGUucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25Ib3VyLCBkdXJhdGlvbk1pbnV0ZX0gZnJvbSBcIi4vZHVyYXRpb25cIjtcblxudmFyIGhvdXIgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIHZhciBvZmZzZXQgPSBkYXRlLmdldFRpbWV6b25lT2Zmc2V0KCkgKiBkdXJhdGlvbk1pbnV0ZSAlIGR1cmF0aW9uSG91cjtcbiAgaWYgKG9mZnNldCA8IDApIG9mZnNldCArPSBkdXJhdGlvbkhvdXI7XG4gIGRhdGUuc2V0VGltZShNYXRoLmZsb29yKCgrZGF0ZSAtIG9mZnNldCkgLyBkdXJhdGlvbkhvdXIpICogZHVyYXRpb25Ib3VyICsgb2Zmc2V0KTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uSG91cik7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25Ib3VyO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRIb3VycygpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGhvdXI7XG5leHBvcnQgdmFyIGhvdXJzID0gaG91ci5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbkRheSwgZHVyYXRpb25NaW51dGV9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciBkYXkgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0IC0gKGVuZC5nZXRUaW1lem9uZU9mZnNldCgpIC0gc3RhcnQuZ2V0VGltZXpvbmVPZmZzZXQoKSkgKiBkdXJhdGlvbk1pbnV0ZSkgLyBkdXJhdGlvbkRheTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0RGF0ZSgpIC0gMTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBkYXk7XG5leHBvcnQgdmFyIGRheXMgPSBkYXkucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25NaW51dGUsIGR1cmF0aW9uV2Vla30gZnJvbSBcIi4vZHVyYXRpb25cIjtcblxuZnVuY3Rpb24gd2Vla2RheShpKSB7XG4gIHJldHVybiBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gKGRhdGUuZ2V0RGF5KCkgKyA3IC0gaSkgJSA3KTtcbiAgICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgc3RlcCAqIDcpO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCAtIChlbmQuZ2V0VGltZXpvbmVPZmZzZXQoKSAtIHN0YXJ0LmdldFRpbWV6b25lT2Zmc2V0KCkpICogZHVyYXRpb25NaW51dGUpIC8gZHVyYXRpb25XZWVrO1xuICB9KTtcbn1cblxuZXhwb3J0IHZhciBzdW5kYXkgPSB3ZWVrZGF5KDApO1xuZXhwb3J0IHZhciBtb25kYXkgPSB3ZWVrZGF5KDEpO1xuZXhwb3J0IHZhciB0dWVzZGF5ID0gd2Vla2RheSgyKTtcbmV4cG9ydCB2YXIgd2VkbmVzZGF5ID0gd2Vla2RheSgzKTtcbmV4cG9ydCB2YXIgdGh1cnNkYXkgPSB3ZWVrZGF5KDQpO1xuZXhwb3J0IHZhciBmcmlkYXkgPSB3ZWVrZGF5KDUpO1xuZXhwb3J0IHZhciBzYXR1cmRheSA9IHdlZWtkYXkoNik7XG5cbmV4cG9ydCB2YXIgc3VuZGF5cyA9IHN1bmRheS5yYW5nZTtcbmV4cG9ydCB2YXIgbW9uZGF5cyA9IG1vbmRheS5yYW5nZTtcbmV4cG9ydCB2YXIgdHVlc2RheXMgPSB0dWVzZGF5LnJhbmdlO1xuZXhwb3J0IHZhciB3ZWRuZXNkYXlzID0gd2VkbmVzZGF5LnJhbmdlO1xuZXhwb3J0IHZhciB0aHVyc2RheXMgPSB0aHVyc2RheS5yYW5nZTtcbmV4cG9ydCB2YXIgZnJpZGF5cyA9IGZyaWRheS5yYW5nZTtcbmV4cG9ydCB2YXIgc2F0dXJkYXlzID0gc2F0dXJkYXkucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcblxudmFyIG1vbnRoID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldERhdGUoMSk7XG4gIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0TW9udGgoZGF0ZS5nZXRNb250aCgpICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiBlbmQuZ2V0TW9udGgoKSAtIHN0YXJ0LmdldE1vbnRoKCkgKyAoZW5kLmdldEZ1bGxZZWFyKCkgLSBzdGFydC5nZXRGdWxsWWVhcigpKSAqIDEyO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRNb250aCgpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IG1vbnRoO1xuZXhwb3J0IHZhciBtb250aHMgPSBtb250aC5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuXG52YXIgeWVhciA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRNb250aCgwLCAxKTtcbiAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRGdWxsWWVhcihkYXRlLmdldEZ1bGxZZWFyKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZC5nZXRGdWxsWWVhcigpIC0gc3RhcnQuZ2V0RnVsbFllYXIoKTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKTtcbn0pO1xuXG4vLyBBbiBvcHRpbWl6ZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgc2ltcGxlIGNhc2UuXG55ZWFyLmV2ZXJ5ID0gZnVuY3Rpb24oaykge1xuICByZXR1cm4gIWlzRmluaXRlKGsgPSBNYXRoLmZsb29yKGspKSB8fCAhKGsgPiAwKSA/IG51bGwgOiBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRGdWxsWWVhcihNYXRoLmZsb29yKGRhdGUuZ2V0RnVsbFllYXIoKSAvIGspICogayk7XG4gICAgZGF0ZS5zZXRNb250aCgwLCAxKTtcbiAgICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXRGdWxsWWVhcihkYXRlLmdldEZ1bGxZZWFyKCkgKyBzdGVwICogayk7XG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgeWVhcjtcbmV4cG9ydCB2YXIgeWVhcnMgPSB5ZWFyLnJhbmdlO1xuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5pbXBvcnQge2R1cmF0aW9uTWludXRlfSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG52YXIgdXRjTWludXRlID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFVUQ1NlY29uZHMoMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbk1pbnV0ZSk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25NaW51dGU7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldFVUQ01pbnV0ZXMoKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCB1dGNNaW51dGU7XG5leHBvcnQgdmFyIHV0Y01pbnV0ZXMgPSB1dGNNaW51dGUucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25Ib3VyfSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG52YXIgdXRjSG91ciA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRVVENNaW51dGVzKDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogZHVyYXRpb25Ib3VyKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbkhvdXI7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldFVUQ0hvdXJzKCk7XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgdXRjSG91cjtcbmV4cG9ydCB2YXIgdXRjSG91cnMgPSB1dGNIb3VyLnJhbmdlO1xuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5pbXBvcnQge2R1cmF0aW9uRGF5fSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG52YXIgdXRjRGF5ID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFVUQ0RhdGUoZGF0ZS5nZXRVVENEYXRlKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbkRheTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDRGF0ZSgpIC0gMTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCB1dGNEYXk7XG5leHBvcnQgdmFyIHV0Y0RheXMgPSB1dGNEYXkucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25XZWVrfSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG5mdW5jdGlvbiB1dGNXZWVrZGF5KGkpIHtcbiAgcmV0dXJuIGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBkYXRlLnNldFVUQ0RhdGUoZGF0ZS5nZXRVVENEYXRlKCkgLSAoZGF0ZS5nZXRVVENEYXkoKSArIDcgLSBpKSAlIDcpO1xuICAgIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldFVUQ0RhdGUoZGF0ZS5nZXRVVENEYXRlKCkgKyBzdGVwICogNyk7XG4gIH0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uV2VlaztcbiAgfSk7XG59XG5cbmV4cG9ydCB2YXIgdXRjU3VuZGF5ID0gdXRjV2Vla2RheSgwKTtcbmV4cG9ydCB2YXIgdXRjTW9uZGF5ID0gdXRjV2Vla2RheSgxKTtcbmV4cG9ydCB2YXIgdXRjVHVlc2RheSA9IHV0Y1dlZWtkYXkoMik7XG5leHBvcnQgdmFyIHV0Y1dlZG5lc2RheSA9IHV0Y1dlZWtkYXkoMyk7XG5leHBvcnQgdmFyIHV0Y1RodXJzZGF5ID0gdXRjV2Vla2RheSg0KTtcbmV4cG9ydCB2YXIgdXRjRnJpZGF5ID0gdXRjV2Vla2RheSg1KTtcbmV4cG9ydCB2YXIgdXRjU2F0dXJkYXkgPSB1dGNXZWVrZGF5KDYpO1xuXG5leHBvcnQgdmFyIHV0Y1N1bmRheXMgPSB1dGNTdW5kYXkucmFuZ2U7XG5leHBvcnQgdmFyIHV0Y01vbmRheXMgPSB1dGNNb25kYXkucmFuZ2U7XG5leHBvcnQgdmFyIHV0Y1R1ZXNkYXlzID0gdXRjVHVlc2RheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjV2VkbmVzZGF5cyA9IHV0Y1dlZG5lc2RheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjVGh1cnNkYXlzID0gdXRjVGh1cnNkYXkucmFuZ2U7XG5leHBvcnQgdmFyIHV0Y0ZyaWRheXMgPSB1dGNGcmlkYXkucmFuZ2U7XG5leHBvcnQgdmFyIHV0Y1NhdHVyZGF5cyA9IHV0Y1NhdHVyZGF5LnJhbmdlO1xuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5cbnZhciB1dGNNb250aCA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRVVENEYXRlKDEpO1xuICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFVUQ01vbnRoKGRhdGUuZ2V0VVRDTW9udGgoKSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gZW5kLmdldFVUQ01vbnRoKCkgLSBzdGFydC5nZXRVVENNb250aCgpICsgKGVuZC5nZXRVVENGdWxsWWVhcigpIC0gc3RhcnQuZ2V0VVRDRnVsbFllYXIoKSkgKiAxMjtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDTW9udGgoKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCB1dGNNb250aDtcbmV4cG9ydCB2YXIgdXRjTW9udGhzID0gdXRjTW9udGgucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcblxudmFyIHV0Y1llYXIgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VVRDTW9udGgoMCwgMSk7XG4gIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VVRDRnVsbFllYXIoZGF0ZS5nZXRVVENGdWxsWWVhcigpICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiBlbmQuZ2V0VVRDRnVsbFllYXIoKSAtIHN0YXJ0LmdldFVUQ0Z1bGxZZWFyKCk7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldFVUQ0Z1bGxZZWFyKCk7XG59KTtcblxuLy8gQW4gb3B0aW1pemVkIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIHNpbXBsZSBjYXNlLlxudXRjWWVhci5ldmVyeSA9IGZ1bmN0aW9uKGspIHtcbiAgcmV0dXJuICFpc0Zpbml0ZShrID0gTWF0aC5mbG9vcihrKSkgfHwgIShrID4gMCkgPyBudWxsIDogaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoTWF0aC5mbG9vcihkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgLyBrKSAqIGspO1xuICAgIGRhdGUuc2V0VVRDTW9udGgoMCwgMSk7XG4gICAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoZGF0ZS5nZXRVVENGdWxsWWVhcigpICsgc3RlcCAqIGspO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHV0Y1llYXI7XG5leHBvcnQgdmFyIHV0Y1llYXJzID0gdXRjWWVhci5yYW5nZTtcbiIsImltcG9ydCB7XG4gIHRpbWVEYXksXG4gIHRpbWVTdW5kYXksXG4gIHRpbWVNb25kYXksXG4gIHRpbWVUaHVyc2RheSxcbiAgdGltZVllYXIsXG4gIHV0Y0RheSxcbiAgdXRjU3VuZGF5LFxuICB1dGNNb25kYXksXG4gIHV0Y1RodXJzZGF5LFxuICB1dGNZZWFyXG59IGZyb20gXCJkMy10aW1lXCI7XG5cbmZ1bmN0aW9uIGxvY2FsRGF0ZShkKSB7XG4gIGlmICgwIDw9IGQueSAmJiBkLnkgPCAxMDApIHtcbiAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKC0xLCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKTtcbiAgICBkYXRlLnNldEZ1bGxZZWFyKGQueSk7XG4gICAgcmV0dXJuIGRhdGU7XG4gIH1cbiAgcmV0dXJuIG5ldyBEYXRlKGQueSwgZC5tLCBkLmQsIGQuSCwgZC5NLCBkLlMsIGQuTCk7XG59XG5cbmZ1bmN0aW9uIHV0Y0RhdGUoZCkge1xuICBpZiAoMCA8PSBkLnkgJiYgZC55IDwgMTAwKSB7XG4gICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQygtMSwgZC5tLCBkLmQsIGQuSCwgZC5NLCBkLlMsIGQuTCkpO1xuICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoZC55KTtcbiAgICByZXR1cm4gZGF0ZTtcbiAgfVxuICByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoZC55LCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKSk7XG59XG5cbmZ1bmN0aW9uIG5ld1llYXIoeSkge1xuICByZXR1cm4ge3k6IHksIG06IDAsIGQ6IDEsIEg6IDAsIE06IDAsIFM6IDAsIEw6IDB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmb3JtYXRMb2NhbGUobG9jYWxlKSB7XG4gIHZhciBsb2NhbGVfZGF0ZVRpbWUgPSBsb2NhbGUuZGF0ZVRpbWUsXG4gICAgICBsb2NhbGVfZGF0ZSA9IGxvY2FsZS5kYXRlLFxuICAgICAgbG9jYWxlX3RpbWUgPSBsb2NhbGUudGltZSxcbiAgICAgIGxvY2FsZV9wZXJpb2RzID0gbG9jYWxlLnBlcmlvZHMsXG4gICAgICBsb2NhbGVfd2Vla2RheXMgPSBsb2NhbGUuZGF5cyxcbiAgICAgIGxvY2FsZV9zaG9ydFdlZWtkYXlzID0gbG9jYWxlLnNob3J0RGF5cyxcbiAgICAgIGxvY2FsZV9tb250aHMgPSBsb2NhbGUubW9udGhzLFxuICAgICAgbG9jYWxlX3Nob3J0TW9udGhzID0gbG9jYWxlLnNob3J0TW9udGhzO1xuXG4gIHZhciBwZXJpb2RSZSA9IGZvcm1hdFJlKGxvY2FsZV9wZXJpb2RzKSxcbiAgICAgIHBlcmlvZExvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfcGVyaW9kcyksXG4gICAgICB3ZWVrZGF5UmUgPSBmb3JtYXRSZShsb2NhbGVfd2Vla2RheXMpLFxuICAgICAgd2Vla2RheUxvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfd2Vla2RheXMpLFxuICAgICAgc2hvcnRXZWVrZGF5UmUgPSBmb3JtYXRSZShsb2NhbGVfc2hvcnRXZWVrZGF5cyksXG4gICAgICBzaG9ydFdlZWtkYXlMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX3Nob3J0V2Vla2RheXMpLFxuICAgICAgbW9udGhSZSA9IGZvcm1hdFJlKGxvY2FsZV9tb250aHMpLFxuICAgICAgbW9udGhMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX21vbnRocyksXG4gICAgICBzaG9ydE1vbnRoUmUgPSBmb3JtYXRSZShsb2NhbGVfc2hvcnRNb250aHMpLFxuICAgICAgc2hvcnRNb250aExvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfc2hvcnRNb250aHMpO1xuXG4gIHZhciBmb3JtYXRzID0ge1xuICAgIFwiYVwiOiBmb3JtYXRTaG9ydFdlZWtkYXksXG4gICAgXCJBXCI6IGZvcm1hdFdlZWtkYXksXG4gICAgXCJiXCI6IGZvcm1hdFNob3J0TW9udGgsXG4gICAgXCJCXCI6IGZvcm1hdE1vbnRoLFxuICAgIFwiY1wiOiBudWxsLFxuICAgIFwiZFwiOiBmb3JtYXREYXlPZk1vbnRoLFxuICAgIFwiZVwiOiBmb3JtYXREYXlPZk1vbnRoLFxuICAgIFwiZlwiOiBmb3JtYXRNaWNyb3NlY29uZHMsXG4gICAgXCJIXCI6IGZvcm1hdEhvdXIyNCxcbiAgICBcIklcIjogZm9ybWF0SG91cjEyLFxuICAgIFwialwiOiBmb3JtYXREYXlPZlllYXIsXG4gICAgXCJMXCI6IGZvcm1hdE1pbGxpc2Vjb25kcyxcbiAgICBcIm1cIjogZm9ybWF0TW9udGhOdW1iZXIsXG4gICAgXCJNXCI6IGZvcm1hdE1pbnV0ZXMsXG4gICAgXCJwXCI6IGZvcm1hdFBlcmlvZCxcbiAgICBcIlFcIjogZm9ybWF0VW5peFRpbWVzdGFtcCxcbiAgICBcInNcIjogZm9ybWF0VW5peFRpbWVzdGFtcFNlY29uZHMsXG4gICAgXCJTXCI6IGZvcm1hdFNlY29uZHMsXG4gICAgXCJ1XCI6IGZvcm1hdFdlZWtkYXlOdW1iZXJNb25kYXksXG4gICAgXCJVXCI6IGZvcm1hdFdlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJWXCI6IGZvcm1hdFdlZWtOdW1iZXJJU08sXG4gICAgXCJ3XCI6IGZvcm1hdFdlZWtkYXlOdW1iZXJTdW5kYXksXG4gICAgXCJXXCI6IGZvcm1hdFdlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IG51bGwsXG4gICAgXCJYXCI6IG51bGwsXG4gICAgXCJ5XCI6IGZvcm1hdFllYXIsXG4gICAgXCJZXCI6IGZvcm1hdEZ1bGxZZWFyLFxuICAgIFwiWlwiOiBmb3JtYXRab25lLFxuICAgIFwiJVwiOiBmb3JtYXRMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIHZhciB1dGNGb3JtYXRzID0ge1xuICAgIFwiYVwiOiBmb3JtYXRVVENTaG9ydFdlZWtkYXksXG4gICAgXCJBXCI6IGZvcm1hdFVUQ1dlZWtkYXksXG4gICAgXCJiXCI6IGZvcm1hdFVUQ1Nob3J0TW9udGgsXG4gICAgXCJCXCI6IGZvcm1hdFVUQ01vbnRoLFxuICAgIFwiY1wiOiBudWxsLFxuICAgIFwiZFwiOiBmb3JtYXRVVENEYXlPZk1vbnRoLFxuICAgIFwiZVwiOiBmb3JtYXRVVENEYXlPZk1vbnRoLFxuICAgIFwiZlwiOiBmb3JtYXRVVENNaWNyb3NlY29uZHMsXG4gICAgXCJIXCI6IGZvcm1hdFVUQ0hvdXIyNCxcbiAgICBcIklcIjogZm9ybWF0VVRDSG91cjEyLFxuICAgIFwialwiOiBmb3JtYXRVVENEYXlPZlllYXIsXG4gICAgXCJMXCI6IGZvcm1hdFVUQ01pbGxpc2Vjb25kcyxcbiAgICBcIm1cIjogZm9ybWF0VVRDTW9udGhOdW1iZXIsXG4gICAgXCJNXCI6IGZvcm1hdFVUQ01pbnV0ZXMsXG4gICAgXCJwXCI6IGZvcm1hdFVUQ1BlcmlvZCxcbiAgICBcIlFcIjogZm9ybWF0VW5peFRpbWVzdGFtcCxcbiAgICBcInNcIjogZm9ybWF0VW5peFRpbWVzdGFtcFNlY29uZHMsXG4gICAgXCJTXCI6IGZvcm1hdFVUQ1NlY29uZHMsXG4gICAgXCJ1XCI6IGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXJNb25kYXksXG4gICAgXCJVXCI6IGZvcm1hdFVUQ1dlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJWXCI6IGZvcm1hdFVUQ1dlZWtOdW1iZXJJU08sXG4gICAgXCJ3XCI6IGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXJTdW5kYXksXG4gICAgXCJXXCI6IGZvcm1hdFVUQ1dlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IG51bGwsXG4gICAgXCJYXCI6IG51bGwsXG4gICAgXCJ5XCI6IGZvcm1hdFVUQ1llYXIsXG4gICAgXCJZXCI6IGZvcm1hdFVUQ0Z1bGxZZWFyLFxuICAgIFwiWlwiOiBmb3JtYXRVVENab25lLFxuICAgIFwiJVwiOiBmb3JtYXRMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIHZhciBwYXJzZXMgPSB7XG4gICAgXCJhXCI6IHBhcnNlU2hvcnRXZWVrZGF5LFxuICAgIFwiQVwiOiBwYXJzZVdlZWtkYXksXG4gICAgXCJiXCI6IHBhcnNlU2hvcnRNb250aCxcbiAgICBcIkJcIjogcGFyc2VNb250aCxcbiAgICBcImNcIjogcGFyc2VMb2NhbGVEYXRlVGltZSxcbiAgICBcImRcIjogcGFyc2VEYXlPZk1vbnRoLFxuICAgIFwiZVwiOiBwYXJzZURheU9mTW9udGgsXG4gICAgXCJmXCI6IHBhcnNlTWljcm9zZWNvbmRzLFxuICAgIFwiSFwiOiBwYXJzZUhvdXIyNCxcbiAgICBcIklcIjogcGFyc2VIb3VyMjQsXG4gICAgXCJqXCI6IHBhcnNlRGF5T2ZZZWFyLFxuICAgIFwiTFwiOiBwYXJzZU1pbGxpc2Vjb25kcyxcbiAgICBcIm1cIjogcGFyc2VNb250aE51bWJlcixcbiAgICBcIk1cIjogcGFyc2VNaW51dGVzLFxuICAgIFwicFwiOiBwYXJzZVBlcmlvZCxcbiAgICBcIlFcIjogcGFyc2VVbml4VGltZXN0YW1wLFxuICAgIFwic1wiOiBwYXJzZVVuaXhUaW1lc3RhbXBTZWNvbmRzLFxuICAgIFwiU1wiOiBwYXJzZVNlY29uZHMsXG4gICAgXCJ1XCI6IHBhcnNlV2Vla2RheU51bWJlck1vbmRheSxcbiAgICBcIlVcIjogcGFyc2VXZWVrTnVtYmVyU3VuZGF5LFxuICAgIFwiVlwiOiBwYXJzZVdlZWtOdW1iZXJJU08sXG4gICAgXCJ3XCI6IHBhcnNlV2Vla2RheU51bWJlclN1bmRheSxcbiAgICBcIldcIjogcGFyc2VXZWVrTnVtYmVyTW9uZGF5LFxuICAgIFwieFwiOiBwYXJzZUxvY2FsZURhdGUsXG4gICAgXCJYXCI6IHBhcnNlTG9jYWxlVGltZSxcbiAgICBcInlcIjogcGFyc2VZZWFyLFxuICAgIFwiWVwiOiBwYXJzZUZ1bGxZZWFyLFxuICAgIFwiWlwiOiBwYXJzZVpvbmUsXG4gICAgXCIlXCI6IHBhcnNlTGl0ZXJhbFBlcmNlbnRcbiAgfTtcblxuICAvLyBUaGVzZSByZWN1cnNpdmUgZGlyZWN0aXZlIGRlZmluaXRpb25zIG11c3QgYmUgZGVmZXJyZWQuXG4gIGZvcm1hdHMueCA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZSwgZm9ybWF0cyk7XG4gIGZvcm1hdHMuWCA9IG5ld0Zvcm1hdChsb2NhbGVfdGltZSwgZm9ybWF0cyk7XG4gIGZvcm1hdHMuYyA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZVRpbWUsIGZvcm1hdHMpO1xuICB1dGNGb3JtYXRzLnggPSBuZXdGb3JtYXQobG9jYWxlX2RhdGUsIHV0Y0Zvcm1hdHMpO1xuICB1dGNGb3JtYXRzLlggPSBuZXdGb3JtYXQobG9jYWxlX3RpbWUsIHV0Y0Zvcm1hdHMpO1xuICB1dGNGb3JtYXRzLmMgPSBuZXdGb3JtYXQobG9jYWxlX2RhdGVUaW1lLCB1dGNGb3JtYXRzKTtcblxuICBmdW5jdGlvbiBuZXdGb3JtYXQoc3BlY2lmaWVyLCBmb3JtYXRzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgIHZhciBzdHJpbmcgPSBbXSxcbiAgICAgICAgICBpID0gLTEsXG4gICAgICAgICAgaiA9IDAsXG4gICAgICAgICAgbiA9IHNwZWNpZmllci5sZW5ndGgsXG4gICAgICAgICAgYyxcbiAgICAgICAgICBwYWQsXG4gICAgICAgICAgZm9ybWF0O1xuXG4gICAgICBpZiAoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpIGRhdGUgPSBuZXcgRGF0ZSgrZGF0ZSk7XG5cbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIGlmIChzcGVjaWZpZXIuY2hhckNvZGVBdChpKSA9PT0gMzcpIHtcbiAgICAgICAgICBzdHJpbmcucHVzaChzcGVjaWZpZXIuc2xpY2UoaiwgaSkpO1xuICAgICAgICAgIGlmICgocGFkID0gcGFkc1tjID0gc3BlY2lmaWVyLmNoYXJBdCgrK2kpXSkgIT0gbnVsbCkgYyA9IHNwZWNpZmllci5jaGFyQXQoKytpKTtcbiAgICAgICAgICBlbHNlIHBhZCA9IGMgPT09IFwiZVwiID8gXCIgXCIgOiBcIjBcIjtcbiAgICAgICAgICBpZiAoZm9ybWF0ID0gZm9ybWF0c1tjXSkgYyA9IGZvcm1hdChkYXRlLCBwYWQpO1xuICAgICAgICAgIHN0cmluZy5wdXNoKGMpO1xuICAgICAgICAgIGogPSBpICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzdHJpbmcucHVzaChzcGVjaWZpZXIuc2xpY2UoaiwgaSkpO1xuICAgICAgcmV0dXJuIHN0cmluZy5qb2luKFwiXCIpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBuZXdQYXJzZShzcGVjaWZpZXIsIG5ld0RhdGUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICB2YXIgZCA9IG5ld1llYXIoMTkwMCksXG4gICAgICAgICAgaSA9IHBhcnNlU3BlY2lmaWVyKGQsIHNwZWNpZmllciwgc3RyaW5nICs9IFwiXCIsIDApLFxuICAgICAgICAgIHdlZWssIGRheTtcbiAgICAgIGlmIChpICE9IHN0cmluZy5sZW5ndGgpIHJldHVybiBudWxsO1xuXG4gICAgICAvLyBJZiBhIFVOSVggdGltZXN0YW1wIGlzIHNwZWNpZmllZCwgcmV0dXJuIGl0LlxuICAgICAgaWYgKFwiUVwiIGluIGQpIHJldHVybiBuZXcgRGF0ZShkLlEpO1xuXG4gICAgICAvLyBUaGUgYW0tcG0gZmxhZyBpcyAwIGZvciBBTSwgYW5kIDEgZm9yIFBNLlxuICAgICAgaWYgKFwicFwiIGluIGQpIGQuSCA9IGQuSCAlIDEyICsgZC5wICogMTI7XG5cbiAgICAgIC8vIENvbnZlcnQgZGF5LW9mLXdlZWsgYW5kIHdlZWstb2YteWVhciB0byBkYXktb2YteWVhci5cbiAgICAgIGlmIChcIlZcIiBpbiBkKSB7XG4gICAgICAgIGlmIChkLlYgPCAxIHx8IGQuViA+IDUzKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKCEoXCJ3XCIgaW4gZCkpIGQudyA9IDE7XG4gICAgICAgIGlmIChcIlpcIiBpbiBkKSB7XG4gICAgICAgICAgd2VlayA9IHV0Y0RhdGUobmV3WWVhcihkLnkpKSwgZGF5ID0gd2Vlay5nZXRVVENEYXkoKTtcbiAgICAgICAgICB3ZWVrID0gZGF5ID4gNCB8fCBkYXkgPT09IDAgPyB1dGNNb25kYXkuY2VpbCh3ZWVrKSA6IHV0Y01vbmRheSh3ZWVrKTtcbiAgICAgICAgICB3ZWVrID0gdXRjRGF5Lm9mZnNldCh3ZWVrLCAoZC5WIC0gMSkgKiA3KTtcbiAgICAgICAgICBkLnkgPSB3ZWVrLmdldFVUQ0Z1bGxZZWFyKCk7XG4gICAgICAgICAgZC5tID0gd2Vlay5nZXRVVENNb250aCgpO1xuICAgICAgICAgIGQuZCA9IHdlZWsuZ2V0VVRDRGF0ZSgpICsgKGQudyArIDYpICUgNztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3ZWVrID0gbmV3RGF0ZShuZXdZZWFyKGQueSkpLCBkYXkgPSB3ZWVrLmdldERheSgpO1xuICAgICAgICAgIHdlZWsgPSBkYXkgPiA0IHx8IGRheSA9PT0gMCA/IHRpbWVNb25kYXkuY2VpbCh3ZWVrKSA6IHRpbWVNb25kYXkod2Vlayk7XG4gICAgICAgICAgd2VlayA9IHRpbWVEYXkub2Zmc2V0KHdlZWssIChkLlYgLSAxKSAqIDcpO1xuICAgICAgICAgIGQueSA9IHdlZWsuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICBkLm0gPSB3ZWVrLmdldE1vbnRoKCk7XG4gICAgICAgICAgZC5kID0gd2Vlay5nZXREYXRlKCkgKyAoZC53ICsgNikgJSA3O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKFwiV1wiIGluIGQgfHwgXCJVXCIgaW4gZCkge1xuICAgICAgICBpZiAoIShcIndcIiBpbiBkKSkgZC53ID0gXCJ1XCIgaW4gZCA/IGQudSAlIDcgOiBcIldcIiBpbiBkID8gMSA6IDA7XG4gICAgICAgIGRheSA9IFwiWlwiIGluIGQgPyB1dGNEYXRlKG5ld1llYXIoZC55KSkuZ2V0VVRDRGF5KCkgOiBuZXdEYXRlKG5ld1llYXIoZC55KSkuZ2V0RGF5KCk7XG4gICAgICAgIGQubSA9IDA7XG4gICAgICAgIGQuZCA9IFwiV1wiIGluIGQgPyAoZC53ICsgNikgJSA3ICsgZC5XICogNyAtIChkYXkgKyA1KSAlIDcgOiBkLncgKyBkLlUgKiA3IC0gKGRheSArIDYpICUgNztcbiAgICAgIH1cblxuICAgICAgLy8gSWYgYSB0aW1lIHpvbmUgaXMgc3BlY2lmaWVkLCBhbGwgZmllbGRzIGFyZSBpbnRlcnByZXRlZCBhcyBVVEMgYW5kIHRoZW5cbiAgICAgIC8vIG9mZnNldCBhY2NvcmRpbmcgdG8gdGhlIHNwZWNpZmllZCB0aW1lIHpvbmUuXG4gICAgICBpZiAoXCJaXCIgaW4gZCkge1xuICAgICAgICBkLkggKz0gZC5aIC8gMTAwIHwgMDtcbiAgICAgICAgZC5NICs9IGQuWiAlIDEwMDtcbiAgICAgICAgcmV0dXJuIHV0Y0RhdGUoZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE90aGVyd2lzZSwgYWxsIGZpZWxkcyBhcmUgaW4gbG9jYWwgdGltZS5cbiAgICAgIHJldHVybiBuZXdEYXRlKGQpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVNwZWNpZmllcihkLCBzcGVjaWZpZXIsIHN0cmluZywgaikge1xuICAgIHZhciBpID0gMCxcbiAgICAgICAgbiA9IHNwZWNpZmllci5sZW5ndGgsXG4gICAgICAgIG0gPSBzdHJpbmcubGVuZ3RoLFxuICAgICAgICBjLFxuICAgICAgICBwYXJzZTtcblxuICAgIHdoaWxlIChpIDwgbikge1xuICAgICAgaWYgKGogPj0gbSkgcmV0dXJuIC0xO1xuICAgICAgYyA9IHNwZWNpZmllci5jaGFyQ29kZUF0KGkrKyk7XG4gICAgICBpZiAoYyA9PT0gMzcpIHtcbiAgICAgICAgYyA9IHNwZWNpZmllci5jaGFyQXQoaSsrKTtcbiAgICAgICAgcGFyc2UgPSBwYXJzZXNbYyBpbiBwYWRzID8gc3BlY2lmaWVyLmNoYXJBdChpKyspIDogY107XG4gICAgICAgIGlmICghcGFyc2UgfHwgKChqID0gcGFyc2UoZCwgc3RyaW5nLCBqKSkgPCAwKSkgcmV0dXJuIC0xO1xuICAgICAgfSBlbHNlIGlmIChjICE9IHN0cmluZy5jaGFyQ29kZUF0KGorKykpIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBqO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VQZXJpb2QoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBwZXJpb2RSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC5wID0gcGVyaW9kTG9va3VwW25bMF0udG9Mb3dlckNhc2UoKV0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlU2hvcnRXZWVrZGF5KGQsIHN0cmluZywgaSkge1xuICAgIHZhciBuID0gc2hvcnRXZWVrZGF5UmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQudyA9IHNob3J0V2Vla2RheUxvb2t1cFtuWzBdLnRvTG93ZXJDYXNlKCldLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVdlZWtkYXkoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSB3ZWVrZGF5UmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQudyA9IHdlZWtkYXlMb29rdXBbblswXS50b0xvd2VyQ2FzZSgpXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VTaG9ydE1vbnRoKGQsIHN0cmluZywgaSkge1xuICAgIHZhciBuID0gc2hvcnRNb250aFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLm0gPSBzaG9ydE1vbnRoTG9va3VwW25bMF0udG9Mb3dlckNhc2UoKV0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTW9udGgoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBtb250aFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLm0gPSBtb250aExvb2t1cFtuWzBdLnRvTG93ZXJDYXNlKCldLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUxvY2FsZURhdGVUaW1lKGQsIHN0cmluZywgaSkge1xuICAgIHJldHVybiBwYXJzZVNwZWNpZmllcihkLCBsb2NhbGVfZGF0ZVRpbWUsIHN0cmluZywgaSk7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUxvY2FsZURhdGUoZCwgc3RyaW5nLCBpKSB7XG4gICAgcmV0dXJuIHBhcnNlU3BlY2lmaWVyKGQsIGxvY2FsZV9kYXRlLCBzdHJpbmcsIGkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VMb2NhbGVUaW1lKGQsIHN0cmluZywgaSkge1xuICAgIHJldHVybiBwYXJzZVNwZWNpZmllcihkLCBsb2NhbGVfdGltZSwgc3RyaW5nLCBpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFNob3J0V2Vla2RheShkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydFdlZWtkYXlzW2QuZ2V0RGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0V2Vla2RheShkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV93ZWVrZGF5c1tkLmdldERheSgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFNob3J0TW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfc2hvcnRNb250aHNbZC5nZXRNb250aCgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdE1vbnRoKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX21vbnRoc1tkLmdldE1vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0UGVyaW9kKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3BlcmlvZHNbKyhkLmdldEhvdXJzKCkgPj0gMTIpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ1Nob3J0V2Vla2RheShkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydFdlZWtkYXlzW2QuZ2V0VVRDRGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDV2Vla2RheShkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV93ZWVrZGF5c1tkLmdldFVUQ0RheSgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ1Nob3J0TW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfc2hvcnRNb250aHNbZC5nZXRVVENNb250aCgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ01vbnRoKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX21vbnRoc1tkLmdldFVUQ01vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDUGVyaW9kKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3BlcmlvZHNbKyhkLmdldFVUQ0hvdXJzKCkgPj0gMTIpXTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZm9ybWF0OiBmdW5jdGlvbihzcGVjaWZpZXIpIHtcbiAgICAgIHZhciBmID0gbmV3Rm9ybWF0KHNwZWNpZmllciArPSBcIlwiLCBmb3JtYXRzKTtcbiAgICAgIGYudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNwZWNpZmllcjsgfTtcbiAgICAgIHJldHVybiBmO1xuICAgIH0sXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIHAgPSBuZXdQYXJzZShzcGVjaWZpZXIgKz0gXCJcIiwgbG9jYWxEYXRlKTtcbiAgICAgIHAudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNwZWNpZmllcjsgfTtcbiAgICAgIHJldHVybiBwO1xuICAgIH0sXG4gICAgdXRjRm9ybWF0OiBmdW5jdGlvbihzcGVjaWZpZXIpIHtcbiAgICAgIHZhciBmID0gbmV3Rm9ybWF0KHNwZWNpZmllciArPSBcIlwiLCB1dGNGb3JtYXRzKTtcbiAgICAgIGYudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNwZWNpZmllcjsgfTtcbiAgICAgIHJldHVybiBmO1xuICAgIH0sXG4gICAgdXRjUGFyc2U6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIHAgPSBuZXdQYXJzZShzcGVjaWZpZXIsIHV0Y0RhdGUpO1xuICAgICAgcC50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIHA7XG4gICAgfVxuICB9O1xufVxuXG52YXIgcGFkcyA9IHtcIi1cIjogXCJcIiwgXCJfXCI6IFwiIFwiLCBcIjBcIjogXCIwXCJ9LFxuICAgIG51bWJlclJlID0gL15cXHMqXFxkKy8sIC8vIG5vdGU6IGlnbm9yZXMgbmV4dCBkaXJlY3RpdmVcbiAgICBwZXJjZW50UmUgPSAvXiUvLFxuICAgIHJlcXVvdGVSZSA9IC9bXFxcXF4kKis/fFtcXF0oKS57fV0vZztcblxuZnVuY3Rpb24gcGFkKHZhbHVlLCBmaWxsLCB3aWR0aCkge1xuICB2YXIgc2lnbiA9IHZhbHVlIDwgMCA/IFwiLVwiIDogXCJcIixcbiAgICAgIHN0cmluZyA9IChzaWduID8gLXZhbHVlIDogdmFsdWUpICsgXCJcIixcbiAgICAgIGxlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gIHJldHVybiBzaWduICsgKGxlbmd0aCA8IHdpZHRoID8gbmV3IEFycmF5KHdpZHRoIC0gbGVuZ3RoICsgMSkuam9pbihmaWxsKSArIHN0cmluZyA6IHN0cmluZyk7XG59XG5cbmZ1bmN0aW9uIHJlcXVvdGUocykge1xuICByZXR1cm4gcy5yZXBsYWNlKHJlcXVvdGVSZSwgXCJcXFxcJCZcIik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFJlKG5hbWVzKSB7XG4gIHJldHVybiBuZXcgUmVnRXhwKFwiXig/OlwiICsgbmFtZXMubWFwKHJlcXVvdGUpLmpvaW4oXCJ8XCIpICsgXCIpXCIsIFwiaVwiKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TG9va3VwKG5hbWVzKSB7XG4gIHZhciBtYXAgPSB7fSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICB3aGlsZSAoKytpIDwgbikgbWFwW25hbWVzW2ldLnRvTG93ZXJDYXNlKCldID0gaTtcbiAgcmV0dXJuIG1hcDtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrZGF5TnVtYmVyU3VuZGF5KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAxKSk7XG4gIHJldHVybiBuID8gKGQudyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlV2Vla2RheU51bWJlck1vbmRheShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMSkpO1xuICByZXR1cm4gbiA/IChkLnUgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVdlZWtOdW1iZXJTdW5kYXkoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5VID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrTnVtYmVySVNPKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuViA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlV2Vla051bWJlck1vbmRheShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLlcgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZUZ1bGxZZWFyKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyA0KSk7XG4gIHJldHVybiBuID8gKGQueSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlWWVhcihkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLnkgPSArblswXSArICgrblswXSA+IDY4ID8gMTkwMCA6IDIwMDApLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlWm9uZShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSAvXihaKXwoWystXVxcZFxcZCkoPzo6PyhcXGRcXGQpKT8vLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyA2KSk7XG4gIHJldHVybiBuID8gKGQuWiA9IG5bMV0gPyAwIDogLShuWzJdICsgKG5bM10gfHwgXCIwMFwiKSksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VNb250aE51bWJlcihkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLm0gPSBuWzBdIC0gMSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZURheU9mTW9udGgoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5kID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VEYXlPZlllYXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDMpKTtcbiAgcmV0dXJuIG4gPyAoZC5tID0gMCwgZC5kID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VIb3VyMjQoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5IID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VNaW51dGVzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuTSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlU2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLlMgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1pbGxpc2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMykpO1xuICByZXR1cm4gbiA/IChkLkwgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1pY3Jvc2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgNikpO1xuICByZXR1cm4gbiA/IChkLkwgPSBNYXRoLmZsb29yKG5bMF0gLyAxMDAwKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZUxpdGVyYWxQZXJjZW50KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IHBlcmNlbnRSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMSkpO1xuICByZXR1cm4gbiA/IGkgKyBuWzBdLmxlbmd0aCA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVVuaXhUaW1lc3RhbXAoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICByZXR1cm4gbiA/IChkLlEgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVVuaXhUaW1lc3RhbXBTZWNvbmRzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgcmV0dXJuIG4gPyAoZC5RID0gKCtuWzBdKSAqIDEwMDAsIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RGF5T2ZNb250aChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXREYXRlKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRIb3VyMjQoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0SG91cnMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdEhvdXIxMihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRIb3VycygpICUgMTIgfHwgMTIsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXREYXlPZlllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKDEgKyB0aW1lRGF5LmNvdW50KHRpbWVZZWFyKGQpLCBkKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1pbGxpc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRNaWxsaXNlY29uZHMoKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1pY3Jvc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBmb3JtYXRNaWxsaXNlY29uZHMoZCwgcCkgKyBcIjAwMFwiO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNb250aE51bWJlcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRNb250aCgpICsgMSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1pbnV0ZXMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0TWludXRlcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0U2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRTZWNvbmRzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrZGF5TnVtYmVyTW9uZGF5KGQpIHtcbiAgdmFyIGRheSA9IGQuZ2V0RGF5KCk7XG4gIHJldHVybiBkYXkgPT09IDAgPyA3IDogZGF5O1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrTnVtYmVyU3VuZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZCh0aW1lU3VuZGF5LmNvdW50KHRpbWVZZWFyKGQpLCBkKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtOdW1iZXJJU08oZCwgcCkge1xuICB2YXIgZGF5ID0gZC5nZXREYXkoKTtcbiAgZCA9IChkYXkgPj0gNCB8fCBkYXkgPT09IDApID8gdGltZVRodXJzZGF5KGQpIDogdGltZVRodXJzZGF5LmNlaWwoZCk7XG4gIHJldHVybiBwYWQodGltZVRodXJzZGF5LmNvdW50KHRpbWVZZWFyKGQpLCBkKSArICh0aW1lWWVhcihkKS5nZXREYXkoKSA9PT0gNCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrZGF5TnVtYmVyU3VuZGF5KGQpIHtcbiAgcmV0dXJuIGQuZ2V0RGF5KCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtOdW1iZXJNb25kYXkoZCwgcCkge1xuICByZXR1cm4gcGFkKHRpbWVNb25kYXkuY291bnQodGltZVllYXIoZCksIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0WWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRGdWxsWWVhcigpICUgMTAwLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RnVsbFllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0RnVsbFllYXIoKSAlIDEwMDAwLCBwLCA0KTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0Wm9uZShkKSB7XG4gIHZhciB6ID0gZC5nZXRUaW1lem9uZU9mZnNldCgpO1xuICByZXR1cm4gKHogPiAwID8gXCItXCIgOiAoeiAqPSAtMSwgXCIrXCIpKVxuICAgICAgKyBwYWQoeiAvIDYwIHwgMCwgXCIwXCIsIDIpXG4gICAgICArIHBhZCh6ICUgNjAsIFwiMFwiLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDRGF5T2ZNb250aChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENEYXRlKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENIb3VyMjQoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDSG91cnMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0hvdXIxMihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENIb3VycygpICUgMTIgfHwgMTIsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENEYXlPZlllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKDEgKyB1dGNEYXkuY291bnQodXRjWWVhcihkKSwgZCksIHAsIDMpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENNaWxsaXNlY29uZHMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDTWlsbGlzZWNvbmRzKCksIHAsIDMpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENNaWNyb3NlY29uZHMoZCwgcCkge1xuICByZXR1cm4gZm9ybWF0VVRDTWlsbGlzZWNvbmRzKGQsIHApICsgXCIwMDBcIjtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDTW9udGhOdW1iZXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDTW9udGgoKSArIDEsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENNaW51dGVzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ01pbnV0ZXMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1NlY29uZHMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDU2Vjb25kcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla2RheU51bWJlck1vbmRheShkKSB7XG4gIHZhciBkb3cgPSBkLmdldFVUQ0RheSgpO1xuICByZXR1cm4gZG93ID09PSAwID8gNyA6IGRvdztcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla051bWJlclN1bmRheShkLCBwKSB7XG4gIHJldHVybiBwYWQodXRjU3VuZGF5LmNvdW50KHV0Y1llYXIoZCksIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla051bWJlcklTTyhkLCBwKSB7XG4gIHZhciBkYXkgPSBkLmdldFVUQ0RheSgpO1xuICBkID0gKGRheSA+PSA0IHx8IGRheSA9PT0gMCkgPyB1dGNUaHVyc2RheShkKSA6IHV0Y1RodXJzZGF5LmNlaWwoZCk7XG4gIHJldHVybiBwYWQodXRjVGh1cnNkYXkuY291bnQodXRjWWVhcihkKSwgZCkgKyAodXRjWWVhcihkKS5nZXRVVENEYXkoKSA9PT0gNCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrZGF5TnVtYmVyU3VuZGF5KGQpIHtcbiAgcmV0dXJuIGQuZ2V0VVRDRGF5KCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1dlZWtOdW1iZXJNb25kYXkoZCwgcCkge1xuICByZXR1cm4gcGFkKHV0Y01vbmRheS5jb3VudCh1dGNZZWFyKGQpLCBkKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1llYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDRnVsbFllYXIoKSAlIDEwMCwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0Z1bGxZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0Z1bGxZZWFyKCkgJSAxMDAwMCwgcCwgNCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1pvbmUoKSB7XG4gIHJldHVybiBcIiswMDAwXCI7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdExpdGVyYWxQZXJjZW50KCkge1xuICByZXR1cm4gXCIlXCI7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVuaXhUaW1lc3RhbXAoZCkge1xuICByZXR1cm4gK2Q7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVuaXhUaW1lc3RhbXBTZWNvbmRzKGQpIHtcbiAgcmV0dXJuIE1hdGguZmxvb3IoK2QgLyAxMDAwKTtcbn1cbiIsImltcG9ydCBmb3JtYXRMb2NhbGUgZnJvbSBcIi4vbG9jYWxlXCI7XG5cbnZhciBsb2NhbGU7XG5leHBvcnQgdmFyIHRpbWVGb3JtYXQ7XG5leHBvcnQgdmFyIHRpbWVQYXJzZTtcbmV4cG9ydCB2YXIgdXRjRm9ybWF0O1xuZXhwb3J0IHZhciB1dGNQYXJzZTtcblxuZGVmYXVsdExvY2FsZSh7XG4gIGRhdGVUaW1lOiBcIiV4LCAlWFwiLFxuICBkYXRlOiBcIiUtbS8lLWQvJVlcIixcbiAgdGltZTogXCIlLUk6JU06JVMgJXBcIixcbiAgcGVyaW9kczogW1wiQU1cIiwgXCJQTVwiXSxcbiAgZGF5czogW1wiU3VuZGF5XCIsIFwiTW9uZGF5XCIsIFwiVHVlc2RheVwiLCBcIldlZG5lc2RheVwiLCBcIlRodXJzZGF5XCIsIFwiRnJpZGF5XCIsIFwiU2F0dXJkYXlcIl0sXG4gIHNob3J0RGF5czogW1wiU3VuXCIsIFwiTW9uXCIsIFwiVHVlXCIsIFwiV2VkXCIsIFwiVGh1XCIsIFwiRnJpXCIsIFwiU2F0XCJdLFxuICBtb250aHM6IFtcIkphbnVhcnlcIiwgXCJGZWJydWFyeVwiLCBcIk1hcmNoXCIsIFwiQXByaWxcIiwgXCJNYXlcIiwgXCJKdW5lXCIsIFwiSnVseVwiLCBcIkF1Z3VzdFwiLCBcIlNlcHRlbWJlclwiLCBcIk9jdG9iZXJcIiwgXCJOb3ZlbWJlclwiLCBcIkRlY2VtYmVyXCJdLFxuICBzaG9ydE1vbnRoczogW1wiSmFuXCIsIFwiRmViXCIsIFwiTWFyXCIsIFwiQXByXCIsIFwiTWF5XCIsIFwiSnVuXCIsIFwiSnVsXCIsIFwiQXVnXCIsIFwiU2VwXCIsIFwiT2N0XCIsIFwiTm92XCIsIFwiRGVjXCJdXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZGVmYXVsdExvY2FsZShkZWZpbml0aW9uKSB7XG4gIGxvY2FsZSA9IGZvcm1hdExvY2FsZShkZWZpbml0aW9uKTtcbiAgdGltZUZvcm1hdCA9IGxvY2FsZS5mb3JtYXQ7XG4gIHRpbWVQYXJzZSA9IGxvY2FsZS5wYXJzZTtcbiAgdXRjRm9ybWF0ID0gbG9jYWxlLnV0Y0Zvcm1hdDtcbiAgdXRjUGFyc2UgPSBsb2NhbGUudXRjUGFyc2U7XG4gIHJldHVybiBsb2NhbGU7XG59XG4iLCJpbXBvcnQge3V0Y0Zvcm1hdH0gZnJvbSBcIi4vZGVmYXVsdExvY2FsZVwiO1xuXG5leHBvcnQgdmFyIGlzb1NwZWNpZmllciA9IFwiJVktJW0tJWRUJUg6JU06JVMuJUxaXCI7XG5cbmZ1bmN0aW9uIGZvcm1hdElzb05hdGl2ZShkYXRlKSB7XG4gIHJldHVybiBkYXRlLnRvSVNPU3RyaW5nKCk7XG59XG5cbnZhciBmb3JtYXRJc28gPSBEYXRlLnByb3RvdHlwZS50b0lTT1N0cmluZ1xuICAgID8gZm9ybWF0SXNvTmF0aXZlXG4gICAgOiB1dGNGb3JtYXQoaXNvU3BlY2lmaWVyKTtcblxuZXhwb3J0IGRlZmF1bHQgZm9ybWF0SXNvO1xuIiwiaW1wb3J0IHtpc29TcGVjaWZpZXJ9IGZyb20gXCIuL2lzb0Zvcm1hdFwiO1xuaW1wb3J0IHt1dGNQYXJzZX0gZnJvbSBcIi4vZGVmYXVsdExvY2FsZVwiO1xuXG5mdW5jdGlvbiBwYXJzZUlzb05hdGl2ZShzdHJpbmcpIHtcbiAgdmFyIGRhdGUgPSBuZXcgRGF0ZShzdHJpbmcpO1xuICByZXR1cm4gaXNOYU4oZGF0ZSkgPyBudWxsIDogZGF0ZTtcbn1cblxudmFyIHBhcnNlSXNvID0gK25ldyBEYXRlKFwiMjAwMC0wMS0wMVQwMDowMDowMC4wMDBaXCIpXG4gICAgPyBwYXJzZUlzb05hdGl2ZVxuICAgIDogdXRjUGFyc2UoaXNvU3BlY2lmaWVyKTtcblxuZXhwb3J0IGRlZmF1bHQgcGFyc2VJc287XG4iLCJpbXBvcnQge2xpbmVhcmlzaH0gZnJvbSBcIi4vbGluZWFyXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNlcXVlbnRpYWwoaW50ZXJwb2xhdG9yKSB7XG4gIHZhciB4MCA9IDAsXG4gICAgICB4MSA9IDEsXG4gICAgICBrMTAgPSAxLFxuICAgICAgY2xhbXAgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBzY2FsZSh4KSB7XG4gICAgdmFyIHQgPSAoeCAtIHgwKSAqIGsxMDtcbiAgICByZXR1cm4gaW50ZXJwb2xhdG9yKGNsYW1wID8gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgdCkpIDogdCk7XG4gIH1cblxuICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeDAgPSArX1swXSwgeDEgPSArX1sxXSwgazEwID0geDAgPT09IHgxID8gMCA6IDEgLyAoeDEgLSB4MCksIHNjYWxlKSA6IFt4MCwgeDFdO1xuICB9O1xuXG4gIHNjYWxlLmNsYW1wID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGNsYW1wID0gISFfLCBzY2FsZSkgOiBjbGFtcDtcbiAgfTtcblxuICBzY2FsZS5pbnRlcnBvbGF0b3IgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoaW50ZXJwb2xhdG9yID0gXywgc2NhbGUpIDogaW50ZXJwb2xhdG9yO1xuICB9O1xuXG4gIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2VxdWVudGlhbChpbnRlcnBvbGF0b3IpLmRvbWFpbihbeDAsIHgxXSkuY2xhbXAoY2xhbXApO1xuICB9O1xuXG4gIHJldHVybiBsaW5lYXJpc2goc2NhbGUpO1xufVxuIiwiLyoqXG4gKiBDb3B5cmlnaHQgwqkgMjAxNSAtIDIwMTggVGhlIEJyb2FkIEluc3RpdHV0ZSwgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEJTRCAzLWNsYXVzZSBsaWNlbnNlIChodHRwczovL2dpdGh1Yi5jb20vYnJvYWRpbnN0aXR1dGUvZ3RleC12aXovYmxvYi9tYXN0ZXIvTElDRU5TRS5tZClcbiAqL1xuaW1wb3J0IHtzZWxlY3QsIGV2ZW50fSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQge3RyYW5zaXRpb259IGZyb20gXCJkMy10cmFuc2l0aW9uXCI7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVG9vbHRpcCB7XG4gICAgY29uc3RydWN0b3IoaWQsIHZlcmJvc2U9ZmFsc2UsIG9mZnNldFg9MzAsIG9mZnNldFk9LTQwLCBkdXJhdGlvbj0xMDApe1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMudmVyYm9zZSA9IHZlcmJvc2U7XG4gICAgICAgIHRoaXMub2Zmc2V0WCA9IG9mZnNldFg7XG4gICAgICAgIHRoaXMub2Zmc2V0WSA9IG9mZnNldFk7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICBzaG93KGluZm8pIHtcbiAgICAgICAgaWYodGhpcy52ZXJib3NlKSBjb25zb2xlLmxvZyhpbmZvKTtcbiAgICAgICAgdGhpcy5lZGl0KGluZm8pO1xuICAgICAgICB0aGlzLm1vdmUoKTtcbiAgICAgICAgc2VsZWN0KFwiI1wiICsgdGhpcy5pZClcbiAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgXCJpbmxpbmVcIilcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbih0aGlzLmR1cmF0aW9uKVxuICAgICAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLCAxLjApXG4gICAgfVxuXG4gICAgaGlkZSgpIHtcbiAgICAgICAgc2VsZWN0KFwiI1wiICsgdGhpcy5pZClcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbih0aGlzLmR1cmF0aW9uKVxuICAgICAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLCAwLjApO1xuICAgICAgICB0aGlzLmVkaXQoXCJcIik7XG4gICAgfVxuXG4gICAgbW92ZSh4ID0gZXZlbnQucGFnZVgsIHkgPSBldmVudC5wYWdlWSkge1xuICAgICAgICBpZiAodGhpcy52ZXJib3NlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh4KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHkpO1xuICAgICAgICB9XG4gICAgICAgIHggPSB4ICsgdGhpcy5vZmZzZXRYOyAvLyBUT0RPOiBnZXQgcmlkIG9mIHRoZSBoYXJkLWNvZGVkIGFkanVzdG1lbnRcbiAgICAgICAgeSA9ICh5ICsgdGhpcy5vZmZzZXRZKTwwPzEwOnkrdGhpcy5vZmZzZXRZO1xuICAgICAgICBjb25zdCB0ID0gc2VsZWN0KCcjJyt0aGlzLmlkKVxuICAgICAgICAgICAgLnN0eWxlKFwibGVmdFwiLCBgJHt4fXB4YClcbiAgICAgICAgICAgIC5zdHlsZShcInRvcFwiLCBgJHt5fXB4YClcbiAgICB9XG5cbiAgICBlZGl0KGluZm8pIHtcbiAgICAgICAgc2VsZWN0KFwiI1wiICsgdGhpcy5pZClcbiAgICAgICAgICAgIC5odG1sKGluZm8pXG4gICAgfVxufVxuXG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzcGVjaWZpZXIpIHtcbiAgdmFyIG4gPSBzcGVjaWZpZXIubGVuZ3RoIC8gNiB8IDAsIGNvbG9ycyA9IG5ldyBBcnJheShuKSwgaSA9IDA7XG4gIHdoaWxlIChpIDwgbikgY29sb3JzW2ldID0gXCIjXCIgKyBzcGVjaWZpZXIuc2xpY2UoaSAqIDYsICsraSAqIDYpO1xuICByZXR1cm4gY29sb3JzO1xufVxuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNvbG9ycyhcIjFmNzdiNGZmN2YwZTJjYTAyY2Q2MjcyODk0NjdiZDhjNTY0YmUzNzdjMjdmN2Y3ZmJjYmQyMjE3YmVjZlwiKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjb2xvcnMoXCI3ZmM5N2ZiZWFlZDRmZGMwODZmZmZmOTkzODZjYjBmMDAyN2ZiZjViMTc2NjY2NjZcIik7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY29sb3JzKFwiMWI5ZTc3ZDk1ZjAyNzU3MGIzZTcyOThhNjZhNjFlZTZhYjAyYTY3NjFkNjY2NjY2XCIpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNvbG9ycyhcImE2Y2VlMzFmNzhiNGIyZGY4YTMzYTAyY2ZiOWE5OWUzMWExY2ZkYmY2ZmZmN2YwMGNhYjJkNjZhM2Q5YWZmZmY5OWIxNTkyOFwiKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjb2xvcnMoXCJmYmI0YWViM2NkZTNjY2ViYzVkZWNiZTRmZWQ5YTZmZmZmY2NlNWQ4YmRmZGRhZWNmMmYyZjJcIik7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY29sb3JzKFwiYjNlMmNkZmRjZGFjY2JkNWU4ZjRjYWU0ZTZmNWM5ZmZmMmFlZjFlMmNjY2NjY2NjXCIpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNvbG9ycyhcImU0MWExYzM3N2ViODRkYWY0YTk4NGVhM2ZmN2YwMGZmZmYzM2E2NTYyOGY3ODFiZjk5OTk5OVwiKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjb2xvcnMoXCI2NmMyYTVmYzhkNjI4ZGEwY2JlNzhhYzNhNmQ4NTRmZmQ5MmZlNWM0OTRiM2IzYjNcIik7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY29sb3JzKFwiOGRkM2M3ZmZmZmIzYmViYWRhZmI4MDcyODBiMWQzZmRiNDYyYjNkZTY5ZmNjZGU1ZDlkOWQ5YmM4MGJkY2NlYmM1ZmZlZDZmXCIpO1xuIiwiaW1wb3J0IHtpbnRlcnBvbGF0ZVJnYkJhc2lzfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2NoZW1lKSB7XG4gIHJldHVybiBpbnRlcnBvbGF0ZVJnYkJhc2lzKHNjaGVtZVtzY2hlbWUubGVuZ3RoIC0gMV0pO1xufVxuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZDhiMzY1ZjVmNWY1NWFiNGFjXCIsXG4gIFwiYTY2MTFhZGZjMjdkODBjZGMxMDE4NTcxXCIsXG4gIFwiYTY2MTFhZGZjMjdkZjVmNWY1ODBjZGMxMDE4NTcxXCIsXG4gIFwiOGM1MTBhZDhiMzY1ZjZlOGMzYzdlYWU1NWFiNGFjMDE2NjVlXCIsXG4gIFwiOGM1MTBhZDhiMzY1ZjZlOGMzZjVmNWY1YzdlYWU1NWFiNGFjMDE2NjVlXCIsXG4gIFwiOGM1MTBhYmY4MTJkZGZjMjdkZjZlOGMzYzdlYWU1ODBjZGMxMzU5NzhmMDE2NjVlXCIsXG4gIFwiOGM1MTBhYmY4MTJkZGZjMjdkZjZlOGMzZjVmNWY1YzdlYWU1ODBjZGMxMzU5NzhmMDE2NjVlXCIsXG4gIFwiNTQzMDA1OGM1MTBhYmY4MTJkZGZjMjdkZjZlOGMzYzdlYWU1ODBjZGMxMzU5NzhmMDE2NjVlMDAzYzMwXCIsXG4gIFwiNTQzMDA1OGM1MTBhYmY4MTJkZGZjMjdkZjZlOGMzZjVmNWY1YzdlYWU1ODBjZGMxMzU5NzhmMDE2NjVlMDAzYzMwXCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImFmOGRjM2Y3ZjdmNzdmYmY3YlwiLFxuICBcIjdiMzI5NGMyYTVjZmE2ZGJhMDAwODgzN1wiLFxuICBcIjdiMzI5NGMyYTVjZmY3ZjdmN2E2ZGJhMDAwODgzN1wiLFxuICBcIjc2MmE4M2FmOGRjM2U3ZDRlOGQ5ZjBkMzdmYmY3YjFiNzgzN1wiLFxuICBcIjc2MmE4M2FmOGRjM2U3ZDRlOGY3ZjdmN2Q5ZjBkMzdmYmY3YjFiNzgzN1wiLFxuICBcIjc2MmE4Mzk5NzBhYmMyYTVjZmU3ZDRlOGQ5ZjBkM2E2ZGJhMDVhYWU2MTFiNzgzN1wiLFxuICBcIjc2MmE4Mzk5NzBhYmMyYTVjZmU3ZDRlOGY3ZjdmN2Q5ZjBkM2E2ZGJhMDVhYWU2MTFiNzgzN1wiLFxuICBcIjQwMDA0Yjc2MmE4Mzk5NzBhYmMyYTVjZmU3ZDRlOGQ5ZjBkM2E2ZGJhMDVhYWU2MTFiNzgzNzAwNDQxYlwiLFxuICBcIjQwMDA0Yjc2MmE4Mzk5NzBhYmMyYTVjZmU3ZDRlOGY3ZjdmN2Q5ZjBkM2E2ZGJhMDVhYWU2MTFiNzgzNzAwNDQxYlwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJlOWEzYzlmN2Y3ZjdhMWQ3NmFcIixcbiAgXCJkMDFjOGJmMWI2ZGFiOGUxODY0ZGFjMjZcIixcbiAgXCJkMDFjOGJmMWI2ZGFmN2Y3ZjdiOGUxODY0ZGFjMjZcIixcbiAgXCJjNTFiN2RlOWEzYzlmZGUwZWZlNmY1ZDBhMWQ3NmE0ZDkyMjFcIixcbiAgXCJjNTFiN2RlOWEzYzlmZGUwZWZmN2Y3ZjdlNmY1ZDBhMWQ3NmE0ZDkyMjFcIixcbiAgXCJjNTFiN2RkZTc3YWVmMWI2ZGFmZGUwZWZlNmY1ZDBiOGUxODY3ZmJjNDE0ZDkyMjFcIixcbiAgXCJjNTFiN2RkZTc3YWVmMWI2ZGFmZGUwZWZmN2Y3ZjdlNmY1ZDBiOGUxODY3ZmJjNDE0ZDkyMjFcIixcbiAgXCI4ZTAxNTJjNTFiN2RkZTc3YWVmMWI2ZGFmZGUwZWZlNmY1ZDBiOGUxODY3ZmJjNDE0ZDkyMjEyNzY0MTlcIixcbiAgXCI4ZTAxNTJjNTFiN2RkZTc3YWVmMWI2ZGFmZGUwZWZmN2Y3ZjdlNmY1ZDBiOGUxODY3ZmJjNDE0ZDkyMjEyNzY0MTlcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiOTk4ZWMzZjdmN2Y3ZjFhMzQwXCIsXG4gIFwiNWUzYzk5YjJhYmQyZmRiODYzZTY2MTAxXCIsXG4gIFwiNWUzYzk5YjJhYmQyZjdmN2Y3ZmRiODYzZTY2MTAxXCIsXG4gIFwiNTQyNzg4OTk4ZWMzZDhkYWViZmVlMGI2ZjFhMzQwYjM1ODA2XCIsXG4gIFwiNTQyNzg4OTk4ZWMzZDhkYWViZjdmN2Y3ZmVlMGI2ZjFhMzQwYjM1ODA2XCIsXG4gIFwiNTQyNzg4ODA3M2FjYjJhYmQyZDhkYWViZmVlMGI2ZmRiODYzZTA4MjE0YjM1ODA2XCIsXG4gIFwiNTQyNzg4ODA3M2FjYjJhYmQyZDhkYWViZjdmN2Y3ZmVlMGI2ZmRiODYzZTA4MjE0YjM1ODA2XCIsXG4gIFwiMmQwMDRiNTQyNzg4ODA3M2FjYjJhYmQyZDhkYWViZmVlMGI2ZmRiODYzZTA4MjE0YjM1ODA2N2YzYjA4XCIsXG4gIFwiMmQwMDRiNTQyNzg4ODA3M2FjYjJhYmQyZDhkYWViZjdmN2Y3ZmVlMGI2ZmRiODYzZTA4MjE0YjM1ODA2N2YzYjA4XCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImVmOGE2MmY3ZjdmNzY3YTljZlwiLFxuICBcImNhMDAyMGY0YTU4MjkyYzVkZTA1NzFiMFwiLFxuICBcImNhMDAyMGY0YTU4MmY3ZjdmNzkyYzVkZTA1NzFiMFwiLFxuICBcImIyMTgyYmVmOGE2MmZkZGJjN2QxZTVmMDY3YTljZjIxNjZhY1wiLFxuICBcImIyMTgyYmVmOGE2MmZkZGJjN2Y3ZjdmN2QxZTVmMDY3YTljZjIxNjZhY1wiLFxuICBcImIyMTgyYmQ2NjA0ZGY0YTU4MmZkZGJjN2QxZTVmMDkyYzVkZTQzOTNjMzIxNjZhY1wiLFxuICBcImIyMTgyYmQ2NjA0ZGY0YTU4MmZkZGJjN2Y3ZjdmN2QxZTVmMDkyYzVkZTQzOTNjMzIxNjZhY1wiLFxuICBcIjY3MDAxZmIyMTgyYmQ2NjA0ZGY0YTU4MmZkZGJjN2QxZTVmMDkyYzVkZTQzOTNjMzIxNjZhYzA1MzA2MVwiLFxuICBcIjY3MDAxZmIyMTgyYmQ2NjA0ZGY0YTU4MmZkZGJjN2Y3ZjdmN2QxZTVmMDkyYzVkZTQzOTNjMzIxNjZhYzA1MzA2MVwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJlZjhhNjJmZmZmZmY5OTk5OTlcIixcbiAgXCJjYTAwMjBmNGE1ODJiYWJhYmE0MDQwNDBcIixcbiAgXCJjYTAwMjBmNGE1ODJmZmZmZmZiYWJhYmE0MDQwNDBcIixcbiAgXCJiMjE4MmJlZjhhNjJmZGRiYzdlMGUwZTA5OTk5OTk0ZDRkNGRcIixcbiAgXCJiMjE4MmJlZjhhNjJmZGRiYzdmZmZmZmZlMGUwZTA5OTk5OTk0ZDRkNGRcIixcbiAgXCJiMjE4MmJkNjYwNGRmNGE1ODJmZGRiYzdlMGUwZTBiYWJhYmE4Nzg3ODc0ZDRkNGRcIixcbiAgXCJiMjE4MmJkNjYwNGRmNGE1ODJmZGRiYzdmZmZmZmZlMGUwZTBiYWJhYmE4Nzg3ODc0ZDRkNGRcIixcbiAgXCI2NzAwMWZiMjE4MmJkNjYwNGRmNGE1ODJmZGRiYzdlMGUwZTBiYWJhYmE4Nzg3ODc0ZDRkNGQxYTFhMWFcIixcbiAgXCI2NzAwMWZiMjE4MmJkNjYwNGRmNGE1ODJmZGRiYzdmZmZmZmZlMGUwZTBiYWJhYmE4Nzg3ODc0ZDRkNGQxYTFhMWFcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZmM4ZDU5ZmZmZmJmOTFiZmRiXCIsXG4gIFwiZDcxOTFjZmRhZTYxYWJkOWU5MmM3YmI2XCIsXG4gIFwiZDcxOTFjZmRhZTYxZmZmZmJmYWJkOWU5MmM3YmI2XCIsXG4gIFwiZDczMDI3ZmM4ZDU5ZmVlMDkwZTBmM2Y4OTFiZmRiNDU3NWI0XCIsXG4gIFwiZDczMDI3ZmM4ZDU5ZmVlMDkwZmZmZmJmZTBmM2Y4OTFiZmRiNDU3NWI0XCIsXG4gIFwiZDczMDI3ZjQ2ZDQzZmRhZTYxZmVlMDkwZTBmM2Y4YWJkOWU5NzRhZGQxNDU3NWI0XCIsXG4gIFwiZDczMDI3ZjQ2ZDQzZmRhZTYxZmVlMDkwZmZmZmJmZTBmM2Y4YWJkOWU5NzRhZGQxNDU3NWI0XCIsXG4gIFwiYTUwMDI2ZDczMDI3ZjQ2ZDQzZmRhZTYxZmVlMDkwZTBmM2Y4YWJkOWU5NzRhZGQxNDU3NWI0MzEzNjk1XCIsXG4gIFwiYTUwMDI2ZDczMDI3ZjQ2ZDQzZmRhZTYxZmVlMDkwZmZmZmJmZTBmM2Y4YWJkOWU5NzRhZGQxNDU3NWI0MzEzNjk1XCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImZjOGQ1OWZmZmZiZjkxY2Y2MFwiLFxuICBcImQ3MTkxY2ZkYWU2MWE2ZDk2YTFhOTY0MVwiLFxuICBcImQ3MTkxY2ZkYWU2MWZmZmZiZmE2ZDk2YTFhOTY0MVwiLFxuICBcImQ3MzAyN2ZjOGQ1OWZlZTA4YmQ5ZWY4YjkxY2Y2MDFhOTg1MFwiLFxuICBcImQ3MzAyN2ZjOGQ1OWZlZTA4YmZmZmZiZmQ5ZWY4YjkxY2Y2MDFhOTg1MFwiLFxuICBcImQ3MzAyN2Y0NmQ0M2ZkYWU2MWZlZTA4YmQ5ZWY4YmE2ZDk2YTY2YmQ2MzFhOTg1MFwiLFxuICBcImQ3MzAyN2Y0NmQ0M2ZkYWU2MWZlZTA4YmZmZmZiZmQ5ZWY4YmE2ZDk2YTY2YmQ2MzFhOTg1MFwiLFxuICBcImE1MDAyNmQ3MzAyN2Y0NmQ0M2ZkYWU2MWZlZTA4YmQ5ZWY4YmE2ZDk2YTY2YmQ2MzFhOTg1MDAwNjgzN1wiLFxuICBcImE1MDAyNmQ3MzAyN2Y0NmQ0M2ZkYWU2MWZlZTA4YmZmZmZiZmQ5ZWY4YmE2ZDk2YTY2YmQ2MzFhOTg1MDAwNjgzN1wiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJmYzhkNTlmZmZmYmY5OWQ1OTRcIixcbiAgXCJkNzE5MWNmZGFlNjFhYmRkYTQyYjgzYmFcIixcbiAgXCJkNzE5MWNmZGFlNjFmZmZmYmZhYmRkYTQyYjgzYmFcIixcbiAgXCJkNTNlNGZmYzhkNTlmZWUwOGJlNmY1OTg5OWQ1OTQzMjg4YmRcIixcbiAgXCJkNTNlNGZmYzhkNTlmZWUwOGJmZmZmYmZlNmY1OTg5OWQ1OTQzMjg4YmRcIixcbiAgXCJkNTNlNGZmNDZkNDNmZGFlNjFmZWUwOGJlNmY1OThhYmRkYTQ2NmMyYTUzMjg4YmRcIixcbiAgXCJkNTNlNGZmNDZkNDNmZGFlNjFmZWUwOGJmZmZmYmZlNmY1OThhYmRkYTQ2NmMyYTUzMjg4YmRcIixcbiAgXCI5ZTAxNDJkNTNlNGZmNDZkNDNmZGFlNjFmZWUwOGJlNmY1OThhYmRkYTQ2NmMyYTUzMjg4YmQ1ZTRmYTJcIixcbiAgXCI5ZTAxNDJkNTNlNGZmNDZkNDNmZGFlNjFmZWUwOGJmZmZmYmZlNmY1OThhYmRkYTQ2NmMyYTUzMjg4YmQ1ZTRmYTJcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZTVmNWY5OTlkOGM5MmNhMjVmXCIsXG4gIFwiZWRmOGZiYjJlMmUyNjZjMmE0MjM4YjQ1XCIsXG4gIFwiZWRmOGZiYjJlMmUyNjZjMmE0MmNhMjVmMDA2ZDJjXCIsXG4gIFwiZWRmOGZiY2NlY2U2OTlkOGM5NjZjMmE0MmNhMjVmMDA2ZDJjXCIsXG4gIFwiZWRmOGZiY2NlY2U2OTlkOGM5NjZjMmE0NDFhZTc2MjM4YjQ1MDA1ODI0XCIsXG4gIFwiZjdmY2ZkZTVmNWY5Y2NlY2U2OTlkOGM5NjZjMmE0NDFhZTc2MjM4YjQ1MDA1ODI0XCIsXG4gIFwiZjdmY2ZkZTVmNWY5Y2NlY2U2OTlkOGM5NjZjMmE0NDFhZTc2MjM4YjQ1MDA2ZDJjMDA0NDFiXCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImUwZWNmNDllYmNkYTg4NTZhN1wiLFxuICBcImVkZjhmYmIzY2RlMzhjOTZjNjg4NDE5ZFwiLFxuICBcImVkZjhmYmIzY2RlMzhjOTZjNjg4NTZhNzgxMGY3Y1wiLFxuICBcImVkZjhmYmJmZDNlNjllYmNkYThjOTZjNjg4NTZhNzgxMGY3Y1wiLFxuICBcImVkZjhmYmJmZDNlNjllYmNkYThjOTZjNjhjNmJiMTg4NDE5ZDZlMDE2YlwiLFxuICBcImY3ZmNmZGUwZWNmNGJmZDNlNjllYmNkYThjOTZjNjhjNmJiMTg4NDE5ZDZlMDE2YlwiLFxuICBcImY3ZmNmZGUwZWNmNGJmZDNlNjllYmNkYThjOTZjNjhjNmJiMTg4NDE5ZDgxMGY3YzRkMDA0YlwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJlMGYzZGJhOGRkYjU0M2EyY2FcIixcbiAgXCJmMGY5ZThiYWU0YmM3YmNjYzQyYjhjYmVcIixcbiAgXCJmMGY5ZThiYWU0YmM3YmNjYzQ0M2EyY2EwODY4YWNcIixcbiAgXCJmMGY5ZThjY2ViYzVhOGRkYjU3YmNjYzQ0M2EyY2EwODY4YWNcIixcbiAgXCJmMGY5ZThjY2ViYzVhOGRkYjU3YmNjYzQ0ZWIzZDMyYjhjYmUwODU4OWVcIixcbiAgXCJmN2ZjZjBlMGYzZGJjY2ViYzVhOGRkYjU3YmNjYzQ0ZWIzZDMyYjhjYmUwODU4OWVcIixcbiAgXCJmN2ZjZjBlMGYzZGJjY2ViYzVhOGRkYjU3YmNjYzQ0ZWIzZDMyYjhjYmUwODY4YWMwODQwODFcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZmVlOGM4ZmRiYjg0ZTM0YTMzXCIsXG4gIFwiZmVmMGQ5ZmRjYzhhZmM4ZDU5ZDczMDFmXCIsXG4gIFwiZmVmMGQ5ZmRjYzhhZmM4ZDU5ZTM0YTMzYjMwMDAwXCIsXG4gIFwiZmVmMGQ5ZmRkNDllZmRiYjg0ZmM4ZDU5ZTM0YTMzYjMwMDAwXCIsXG4gIFwiZmVmMGQ5ZmRkNDllZmRiYjg0ZmM4ZDU5ZWY2NTQ4ZDczMDFmOTkwMDAwXCIsXG4gIFwiZmZmN2VjZmVlOGM4ZmRkNDllZmRiYjg0ZmM4ZDU5ZWY2NTQ4ZDczMDFmOTkwMDAwXCIsXG4gIFwiZmZmN2VjZmVlOGM4ZmRkNDllZmRiYjg0ZmM4ZDU5ZWY2NTQ4ZDczMDFmYjMwMDAwN2YwMDAwXCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImVjZTJmMGE2YmRkYjFjOTA5OVwiLFxuICBcImY2ZWZmN2JkYzllMTY3YTljZjAyODE4YVwiLFxuICBcImY2ZWZmN2JkYzllMTY3YTljZjFjOTA5OTAxNmM1OVwiLFxuICBcImY2ZWZmN2QwZDFlNmE2YmRkYjY3YTljZjFjOTA5OTAxNmM1OVwiLFxuICBcImY2ZWZmN2QwZDFlNmE2YmRkYjY3YTljZjM2OTBjMDAyODE4YTAxNjQ1MFwiLFxuICBcImZmZjdmYmVjZTJmMGQwZDFlNmE2YmRkYjY3YTljZjM2OTBjMDAyODE4YTAxNjQ1MFwiLFxuICBcImZmZjdmYmVjZTJmMGQwZDFlNmE2YmRkYjY3YTljZjM2OTBjMDAyODE4YTAxNmM1OTAxNDYzNlwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJlY2U3ZjJhNmJkZGIyYjhjYmVcIixcbiAgXCJmMWVlZjZiZGM5ZTE3NGE5Y2YwNTcwYjBcIixcbiAgXCJmMWVlZjZiZGM5ZTE3NGE5Y2YyYjhjYmUwNDVhOGRcIixcbiAgXCJmMWVlZjZkMGQxZTZhNmJkZGI3NGE5Y2YyYjhjYmUwNDVhOGRcIixcbiAgXCJmMWVlZjZkMGQxZTZhNmJkZGI3NGE5Y2YzNjkwYzAwNTcwYjAwMzRlN2JcIixcbiAgXCJmZmY3ZmJlY2U3ZjJkMGQxZTZhNmJkZGI3NGE5Y2YzNjkwYzAwNTcwYjAwMzRlN2JcIixcbiAgXCJmZmY3ZmJlY2U3ZjJkMGQxZTZhNmJkZGI3NGE5Y2YzNjkwYzAwNTcwYjAwNDVhOGQwMjM4NThcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZTdlMWVmYzk5NGM3ZGQxYzc3XCIsXG4gIFwiZjFlZWY2ZDdiNWQ4ZGY2NWIwY2UxMjU2XCIsXG4gIFwiZjFlZWY2ZDdiNWQ4ZGY2NWIwZGQxYzc3OTgwMDQzXCIsXG4gIFwiZjFlZWY2ZDRiOWRhYzk5NGM3ZGY2NWIwZGQxYzc3OTgwMDQzXCIsXG4gIFwiZjFlZWY2ZDRiOWRhYzk5NGM3ZGY2NWIwZTcyOThhY2UxMjU2OTEwMDNmXCIsXG4gIFwiZjdmNGY5ZTdlMWVmZDRiOWRhYzk5NGM3ZGY2NWIwZTcyOThhY2UxMjU2OTEwMDNmXCIsXG4gIFwiZjdmNGY5ZTdlMWVmZDRiOWRhYzk5NGM3ZGY2NWIwZTcyOThhY2UxMjU2OTgwMDQzNjcwMDFmXCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImZkZTBkZGZhOWZiNWM1MWI4YVwiLFxuICBcImZlZWJlMmZiYjRiOWY3NjhhMWFlMDE3ZVwiLFxuICBcImZlZWJlMmZiYjRiOWY3NjhhMWM1MWI4YTdhMDE3N1wiLFxuICBcImZlZWJlMmZjYzVjMGZhOWZiNWY3NjhhMWM1MWI4YTdhMDE3N1wiLFxuICBcImZlZWJlMmZjYzVjMGZhOWZiNWY3NjhhMWRkMzQ5N2FlMDE3ZTdhMDE3N1wiLFxuICBcImZmZjdmM2ZkZTBkZGZjYzVjMGZhOWZiNWY3NjhhMWRkMzQ5N2FlMDE3ZTdhMDE3N1wiLFxuICBcImZmZjdmM2ZkZTBkZGZjYzVjMGZhOWZiNWY3NjhhMWRkMzQ5N2FlMDE3ZTdhMDE3NzQ5MDA2YVwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJlZGY4YjE3ZmNkYmIyYzdmYjhcIixcbiAgXCJmZmZmY2NhMWRhYjQ0MWI2YzQyMjVlYThcIixcbiAgXCJmZmZmY2NhMWRhYjQ0MWI2YzQyYzdmYjgyNTM0OTRcIixcbiAgXCJmZmZmY2NjN2U5YjQ3ZmNkYmI0MWI2YzQyYzdmYjgyNTM0OTRcIixcbiAgXCJmZmZmY2NjN2U5YjQ3ZmNkYmI0MWI2YzQxZDkxYzAyMjVlYTgwYzJjODRcIixcbiAgXCJmZmZmZDllZGY4YjFjN2U5YjQ3ZmNkYmI0MWI2YzQxZDkxYzAyMjVlYTgwYzJjODRcIixcbiAgXCJmZmZmZDllZGY4YjFjN2U5YjQ3ZmNkYmI0MWI2YzQxZDkxYzAyMjVlYTgyNTM0OTQwODFkNThcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZjdmY2I5YWRkZDhlMzFhMzU0XCIsXG4gIFwiZmZmZmNjYzJlNjk5NzhjNjc5MjM4NDQzXCIsXG4gIFwiZmZmZmNjYzJlNjk5NzhjNjc5MzFhMzU0MDA2ODM3XCIsXG4gIFwiZmZmZmNjZDlmMGEzYWRkZDhlNzhjNjc5MzFhMzU0MDA2ODM3XCIsXG4gIFwiZmZmZmNjZDlmMGEzYWRkZDhlNzhjNjc5NDFhYjVkMjM4NDQzMDA1YTMyXCIsXG4gIFwiZmZmZmU1ZjdmY2I5ZDlmMGEzYWRkZDhlNzhjNjc5NDFhYjVkMjM4NDQzMDA1YTMyXCIsXG4gIFwiZmZmZmU1ZjdmY2I5ZDlmMGEzYWRkZDhlNzhjNjc5NDFhYjVkMjM4NDQzMDA2ODM3MDA0NTI5XCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImZmZjdiY2ZlYzQ0ZmQ5NWYwZVwiLFxuICBcImZmZmZkNGZlZDk4ZWZlOTkyOWNjNGMwMlwiLFxuICBcImZmZmZkNGZlZDk4ZWZlOTkyOWQ5NWYwZTk5MzQwNFwiLFxuICBcImZmZmZkNGZlZTM5MWZlYzQ0ZmZlOTkyOWQ5NWYwZTk5MzQwNFwiLFxuICBcImZmZmZkNGZlZTM5MWZlYzQ0ZmZlOTkyOWVjNzAxNGNjNGMwMjhjMmQwNFwiLFxuICBcImZmZmZlNWZmZjdiY2ZlZTM5MWZlYzQ0ZmZlOTkyOWVjNzAxNGNjNGMwMjhjMmQwNFwiLFxuICBcImZmZmZlNWZmZjdiY2ZlZTM5MWZlYzQ0ZmZlOTkyOWVjNzAxNGNjNGMwMjk5MzQwNDY2MjUwNlwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJmZmVkYTBmZWIyNGNmMDNiMjBcIixcbiAgXCJmZmZmYjJmZWNjNWNmZDhkM2NlMzFhMWNcIixcbiAgXCJmZmZmYjJmZWNjNWNmZDhkM2NmMDNiMjBiZDAwMjZcIixcbiAgXCJmZmZmYjJmZWQ5NzZmZWIyNGNmZDhkM2NmMDNiMjBiZDAwMjZcIixcbiAgXCJmZmZmYjJmZWQ5NzZmZWIyNGNmZDhkM2NmYzRlMmFlMzFhMWNiMTAwMjZcIixcbiAgXCJmZmZmY2NmZmVkYTBmZWQ5NzZmZWIyNGNmZDhkM2NmYzRlMmFlMzFhMWNiMTAwMjZcIixcbiAgXCJmZmZmY2NmZmVkYTBmZWQ5NzZmZWIyNGNmZDhkM2NmYzRlMmFlMzFhMWNiZDAwMjY4MDAwMjZcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZGVlYmY3OWVjYWUxMzE4MmJkXCIsXG4gIFwiZWZmM2ZmYmRkN2U3NmJhZWQ2MjE3MWI1XCIsXG4gIFwiZWZmM2ZmYmRkN2U3NmJhZWQ2MzE4MmJkMDg1MTljXCIsXG4gIFwiZWZmM2ZmYzZkYmVmOWVjYWUxNmJhZWQ2MzE4MmJkMDg1MTljXCIsXG4gIFwiZWZmM2ZmYzZkYmVmOWVjYWUxNmJhZWQ2NDI5MmM2MjE3MWI1MDg0NTk0XCIsXG4gIFwiZjdmYmZmZGVlYmY3YzZkYmVmOWVjYWUxNmJhZWQ2NDI5MmM2MjE3MWI1MDg0NTk0XCIsXG4gIFwiZjdmYmZmZGVlYmY3YzZkYmVmOWVjYWUxNmJhZWQ2NDI5MmM2MjE3MWI1MDg1MTljMDgzMDZiXCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImU1ZjVlMGExZDk5YjMxYTM1NFwiLFxuICBcImVkZjhlOWJhZTRiMzc0YzQ3NjIzOGI0NVwiLFxuICBcImVkZjhlOWJhZTRiMzc0YzQ3NjMxYTM1NDAwNmQyY1wiLFxuICBcImVkZjhlOWM3ZTljMGExZDk5Yjc0YzQ3NjMxYTM1NDAwNmQyY1wiLFxuICBcImVkZjhlOWM3ZTljMGExZDk5Yjc0YzQ3NjQxYWI1ZDIzOGI0NTAwNWEzMlwiLFxuICBcImY3ZmNmNWU1ZjVlMGM3ZTljMGExZDk5Yjc0YzQ3NjQxYWI1ZDIzOGI0NTAwNWEzMlwiLFxuICBcImY3ZmNmNWU1ZjVlMGM3ZTljMGExZDk5Yjc0YzQ3NjQxYWI1ZDIzOGI0NTAwNmQyYzAwNDQxYlwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJmMGYwZjBiZGJkYmQ2MzYzNjNcIixcbiAgXCJmN2Y3ZjdjY2NjY2M5Njk2OTY1MjUyNTJcIixcbiAgXCJmN2Y3ZjdjY2NjY2M5Njk2OTY2MzYzNjMyNTI1MjVcIixcbiAgXCJmN2Y3ZjdkOWQ5ZDliZGJkYmQ5Njk2OTY2MzYzNjMyNTI1MjVcIixcbiAgXCJmN2Y3ZjdkOWQ5ZDliZGJkYmQ5Njk2OTY3MzczNzM1MjUyNTIyNTI1MjVcIixcbiAgXCJmZmZmZmZmMGYwZjBkOWQ5ZDliZGJkYmQ5Njk2OTY3MzczNzM1MjUyNTIyNTI1MjVcIixcbiAgXCJmZmZmZmZmMGYwZjBkOWQ5ZDliZGJkYmQ5Njk2OTY3MzczNzM1MjUyNTIyNTI1MjUwMDAwMDBcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5pbXBvcnQgcmFtcCBmcm9tIFwiLi4vcmFtcFwiO1xuXG5leHBvcnQgdmFyIHNjaGVtZSA9IG5ldyBBcnJheSgzKS5jb25jYXQoXG4gIFwiZWZlZGY1YmNiZGRjNzU2YmIxXCIsXG4gIFwiZjJmMGY3Y2JjOWUyOWU5YWM4NmE1MWEzXCIsXG4gIFwiZjJmMGY3Y2JjOWUyOWU5YWM4NzU2YmIxNTQyNzhmXCIsXG4gIFwiZjJmMGY3ZGFkYWViYmNiZGRjOWU5YWM4NzU2YmIxNTQyNzhmXCIsXG4gIFwiZjJmMGY3ZGFkYWViYmNiZGRjOWU5YWM4ODA3ZGJhNmE1MWEzNGExNDg2XCIsXG4gIFwiZmNmYmZkZWZlZGY1ZGFkYWViYmNiZGRjOWU5YWM4ODA3ZGJhNmE1MWEzNGExNDg2XCIsXG4gIFwiZmNmYmZkZWZlZGY1ZGFkYWViYmNiZGRjOWU5YWM4ODA3ZGJhNmE1MWEzNTQyNzhmM2YwMDdkXCJcbikubWFwKGNvbG9ycyk7XG5cbmV4cG9ydCBkZWZhdWx0IHJhbXAoc2NoZW1lKTtcbiIsImltcG9ydCBjb2xvcnMgZnJvbSBcIi4uL2NvbG9yc1wiO1xuaW1wb3J0IHJhbXAgZnJvbSBcIi4uL3JhbXBcIjtcblxuZXhwb3J0IHZhciBzY2hlbWUgPSBuZXcgQXJyYXkoMykuY29uY2F0KFxuICBcImZlZTBkMmZjOTI3MmRlMmQyNlwiLFxuICBcImZlZTVkOWZjYWU5MWZiNmE0YWNiMTgxZFwiLFxuICBcImZlZTVkOWZjYWU5MWZiNmE0YWRlMmQyNmE1MGYxNVwiLFxuICBcImZlZTVkOWZjYmJhMWZjOTI3MmZiNmE0YWRlMmQyNmE1MGYxNVwiLFxuICBcImZlZTVkOWZjYmJhMWZjOTI3MmZiNmE0YWVmM2IyY2NiMTgxZDk5MDAwZFwiLFxuICBcImZmZjVmMGZlZTBkMmZjYmJhMWZjOTI3MmZiNmE0YWVmM2IyY2NiMTgxZDk5MDAwZFwiLFxuICBcImZmZjVmMGZlZTBkMmZjYmJhMWZjOTI3MmZiNmE0YWVmM2IyY2NiMTgxZGE1MGYxNTY3MDAwZFwiXG4pLm1hcChjb2xvcnMpO1xuXG5leHBvcnQgZGVmYXVsdCByYW1wKHNjaGVtZSk7XG4iLCJpbXBvcnQgY29sb3JzIGZyb20gXCIuLi9jb2xvcnNcIjtcbmltcG9ydCByYW1wIGZyb20gXCIuLi9yYW1wXCI7XG5cbmV4cG9ydCB2YXIgc2NoZW1lID0gbmV3IEFycmF5KDMpLmNvbmNhdChcbiAgXCJmZWU2Y2VmZGFlNmJlNjU1MGRcIixcbiAgXCJmZWVkZGVmZGJlODVmZDhkM2NkOTQ3MDFcIixcbiAgXCJmZWVkZGVmZGJlODVmZDhkM2NlNjU1MGRhNjM2MDNcIixcbiAgXCJmZWVkZGVmZGQwYTJmZGFlNmJmZDhkM2NlNjU1MGRhNjM2MDNcIixcbiAgXCJmZWVkZGVmZGQwYTJmZGFlNmJmZDhkM2NmMTY5MTNkOTQ4MDE4YzJkMDRcIixcbiAgXCJmZmY1ZWJmZWU2Y2VmZGQwYTJmZGFlNmJmZDhkM2NmMTY5MTNkOTQ4MDE4YzJkMDRcIixcbiAgXCJmZmY1ZWJmZWU2Y2VmZGQwYTJmZGFlNmJmZDhkM2NmMTY5MTNkOTQ4MDFhNjM2MDM3ZjI3MDRcIlxuKS5tYXAoY29sb3JzKTtcblxuZXhwb3J0IGRlZmF1bHQgcmFtcChzY2hlbWUpO1xuIiwiaW1wb3J0IHtjdWJlaGVsaXh9IGZyb20gXCJkMy1jb2xvclwiO1xuaW1wb3J0IHtpbnRlcnBvbGF0ZUN1YmVoZWxpeExvbmd9IGZyb20gXCJkMy1pbnRlcnBvbGF0ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBpbnRlcnBvbGF0ZUN1YmVoZWxpeExvbmcoY3ViZWhlbGl4KDMwMCwgMC41LCAwLjApLCBjdWJlaGVsaXgoLTI0MCwgMC41LCAxLjApKTtcbiIsImltcG9ydCB7Y3ViZWhlbGl4fSBmcm9tIFwiZDMtY29sb3JcIjtcbmltcG9ydCB7aW50ZXJwb2xhdGVDdWJlaGVsaXhMb25nfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcblxuZXhwb3J0IHZhciB3YXJtID0gaW50ZXJwb2xhdGVDdWJlaGVsaXhMb25nKGN1YmVoZWxpeCgtMTAwLCAwLjc1LCAwLjM1KSwgY3ViZWhlbGl4KDgwLCAxLjUwLCAwLjgpKTtcblxuZXhwb3J0IHZhciBjb29sID0gaW50ZXJwb2xhdGVDdWJlaGVsaXhMb25nKGN1YmVoZWxpeCgyNjAsIDAuNzUsIDAuMzUpLCBjdWJlaGVsaXgoODAsIDEuNTAsIDAuOCkpO1xuXG52YXIgYyA9IGN1YmVoZWxpeCgpO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih0KSB7XG4gIGlmICh0IDwgMCB8fCB0ID4gMSkgdCAtPSBNYXRoLmZsb29yKHQpO1xuICB2YXIgdHMgPSBNYXRoLmFicyh0IC0gMC41KTtcbiAgYy5oID0gMzYwICogdCAtIDEwMDtcbiAgYy5zID0gMS41IC0gMS41ICogdHM7XG4gIGMubCA9IDAuOCAtIDAuOSAqIHRzO1xuICByZXR1cm4gYyArIFwiXCI7XG59XG4iLCJpbXBvcnQge3JnYn0gZnJvbSBcImQzLWNvbG9yXCI7XG5cbnZhciBjID0gcmdiKCksXG4gICAgcGlfMV8zID0gTWF0aC5QSSAvIDMsXG4gICAgcGlfMl8zID0gTWF0aC5QSSAqIDIgLyAzO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih0KSB7XG4gIHZhciB4O1xuICB0ID0gKDAuNSAtIHQpICogTWF0aC5QSTtcbiAgYy5yID0gMjU1ICogKHggPSBNYXRoLnNpbih0KSkgKiB4O1xuICBjLmcgPSAyNTUgKiAoeCA9IE1hdGguc2luKHQgKyBwaV8xXzMpKSAqIHg7XG4gIGMuYiA9IDI1NSAqICh4ID0gTWF0aC5zaW4odCArIHBpXzJfMykpICogeDtcbiAgcmV0dXJuIGMgKyBcIlwiO1xufVxuIiwiaW1wb3J0IGNvbG9ycyBmcm9tIFwiLi4vY29sb3JzXCI7XG5cbmZ1bmN0aW9uIHJhbXAocmFuZ2UpIHtcbiAgdmFyIG4gPSByYW5nZS5sZW5ndGg7XG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIHJhbmdlW01hdGgubWF4KDAsIE1hdGgubWluKG4gLSAxLCBNYXRoLmZsb29yKHQgKiBuKSkpXTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgcmFtcChjb2xvcnMoXCI0NDAxNTQ0NDAyNTY0NTA0NTc0NTA1NTk0NjA3NWE0NjA4NWM0NjBhNWQ0NjBiNWU0NzBkNjA0NzBlNjE0NzEwNjM0NzExNjQ0NzEzNjU0ODE0Njc0ODE2Njg0ODE3Njk0ODE4NmE0ODFhNmM0ODFiNmQ0ODFjNmU0ODFkNmY0ODFmNzA0ODIwNzE0ODIxNzM0ODIzNzQ0ODI0NzU0ODI1NzY0ODI2Nzc0ODI4Nzg0ODI5Nzk0NzJhN2E0NzJjN2E0NzJkN2I0NzJlN2M0NzJmN2Q0NjMwN2U0NjMyN2U0NjMzN2Y0NjM0ODA0NTM1ODE0NTM3ODE0NTM4ODI0NDM5ODM0NDNhODM0NDNiODQ0MzNkODQ0MzNlODU0MjNmODU0MjQwODY0MjQxODY0MTQyODc0MTQ0ODc0MDQ1ODg0MDQ2ODgzZjQ3ODgzZjQ4ODkzZTQ5ODkzZTRhODkzZTRjOGEzZDRkOGEzZDRlOGEzYzRmOGEzYzUwOGIzYjUxOGIzYjUyOGIzYTUzOGIzYTU0OGMzOTU1OGMzOTU2OGMzODU4OGMzODU5OGMzNzVhOGMzNzViOGQzNjVjOGQzNjVkOGQzNTVlOGQzNTVmOGQzNDYwOGQzNDYxOGQzMzYyOGQzMzYzOGQzMjY0OGUzMjY1OGUzMTY2OGUzMTY3OGUzMTY4OGUzMDY5OGUzMDZhOGUyZjZiOGUyZjZjOGUyZTZkOGUyZTZlOGUyZTZmOGUyZDcwOGUyZDcxOGUyYzcxOGUyYzcyOGUyYzczOGUyYjc0OGUyYjc1OGUyYTc2OGUyYTc3OGUyYTc4OGUyOTc5OGUyOTdhOGUyOTdiOGUyODdjOGUyODdkOGUyNzdlOGUyNzdmOGUyNzgwOGUyNjgxOGUyNjgyOGUyNjgyOGUyNTgzOGUyNTg0OGUyNTg1OGUyNDg2OGUyNDg3OGUyMzg4OGUyMzg5OGUyMzhhOGQyMjhiOGQyMjhjOGQyMjhkOGQyMThlOGQyMThmOGQyMTkwOGQyMTkxOGMyMDkyOGMyMDkyOGMyMDkzOGMxZjk0OGMxZjk1OGIxZjk2OGIxZjk3OGIxZjk4OGIxZjk5OGExZjlhOGExZTliOGExZTljODkxZTlkODkxZjllODkxZjlmODgxZmEwODgxZmExODgxZmExODcxZmEyODcyMGEzODYyMGE0ODYyMWE1ODUyMWE2ODUyMmE3ODUyMmE4ODQyM2E5ODMyNGFhODMyNWFiODIyNWFjODIyNmFkODEyN2FkODEyOGFlODAyOWFmN2YyYWIwN2YyY2IxN2UyZGIyN2QyZWIzN2MyZmI0N2MzMWI1N2IzMmI2N2EzNGI2NzkzNWI3NzkzN2I4NzgzOGI5NzczYWJhNzYzYmJiNzUzZGJjNzQzZmJjNzM0MGJkNzI0MmJlNzE0NGJmNzA0NmMwNmY0OGMxNmU0YWMxNmQ0Y2MyNmM0ZWMzNmI1MGM0NmE1MmM1Njk1NGM1Njg1NmM2Njc1OGM3NjU1YWM4NjQ1Y2M4NjM1ZWM5NjI2MGNhNjA2M2NiNWY2NWNiNWU2N2NjNWM2OWNkNWI2Y2NkNWE2ZWNlNTg3MGNmNTc3M2QwNTY3NWQwNTQ3N2QxNTM3YWQxNTE3Y2QyNTA3ZmQzNGU4MWQzNGQ4NGQ0NGI4NmQ1NDk4OWQ1NDg4YmQ2NDY4ZWQ2NDU5MGQ3NDM5M2Q3NDE5NWQ4NDA5OGQ4M2U5YmQ5M2M5ZGQ5M2JhMGRhMzlhMmRhMzdhNWRiMzZhOGRiMzRhYWRjMzJhZGRjMzBiMGRkMmZiMmRkMmRiNWRlMmJiOGRlMjliYWRlMjhiZGRmMjZjMGRmMjVjMmRmMjNjNWUwMjFjOGUwMjBjYWUxMWZjZGUxMWRkMGUxMWNkMmUyMWJkNWUyMWFkOGUyMTlkYWUzMTlkZGUzMThkZmUzMThlMmU0MThlNWU0MTllN2U0MTllYWU1MWFlY2U1MWJlZmU1MWNmMWU1MWRmNGU2MWVmNmU2MjBmOGU2MjFmYmU3MjNmZGU3MjVcIikpO1xuXG5leHBvcnQgdmFyIG1hZ21hID0gcmFtcChjb2xvcnMoXCIwMDAwMDQwMTAwMDUwMTAxMDYwMTAxMDgwMjAxMDkwMjAyMGIwMjAyMGQwMzAzMGYwMzAzMTIwNDA0MTQwNTA0MTYwNjA1MTgwNjA1MWEwNzA2MWMwODA3MWUwOTA3MjAwYTA4MjIwYjA5MjQwYzA5MjYwZDBhMjkwZTBiMmIxMDBiMmQxMTBjMmYxMjBkMzExMzBkMzQxNDBlMzYxNTBlMzgxNjBmM2IxODBmM2QxOTEwM2YxYTEwNDIxYzEwNDQxZDExNDcxZTExNDkyMDExNGIyMTExNGUyMjExNTAyNDEyNTMyNTEyNTUyNzEyNTgyOTExNWEyYTExNWMyYzExNWYyZDExNjEyZjExNjMzMTExNjUzMzEwNjczNDEwNjkzNjEwNmIzODEwNmMzOTBmNmUzYjBmNzAzZDBmNzEzZjBmNzI0MDBmNzQ0MjBmNzU0NDBmNzY0NTEwNzc0NzEwNzg0OTEwNzg0YTEwNzk0YzExN2E0ZTExN2I0ZjEyN2I1MTEyN2M1MjEzN2M1NDEzN2Q1NjE0N2Q1NzE1N2U1OTE1N2U1YTE2N2U1YzE2N2Y1ZDE3N2Y1ZjE4N2Y2MDE4ODA2MjE5ODA2NDFhODA2NTFhODA2NzFiODA2ODFjODE2YTFjODE2YjFkODE2ZDFkODE2ZTFlODE3MDFmODE3MjFmODE3MzIwODE3NTIxODE3NjIxODE3ODIyODE3OTIyODI3YjIzODI3YzIzODI3ZTI0ODI4MDI1ODI4MTI1ODE4MzI2ODE4NDI2ODE4NjI3ODE4ODI3ODE4OTI4ODE4YjI5ODE4YzI5ODE4ZTJhODE5MDJhODE5MTJiODE5MzJiODA5NDJjODA5NjJjODA5ODJkODA5OTJkODA5YjJlN2Y5YzJlN2Y5ZTJmN2ZhMDJmN2ZhMTMwN2VhMzMwN2VhNTMxN2VhNjMxN2RhODMyN2RhYTMzN2RhYjMzN2NhZDM0N2NhZTM0N2JiMDM1N2JiMjM1N2JiMzM2N2FiNTM2N2FiNzM3NzliODM3NzliYTM4NzhiYzM5NzhiZDM5NzdiZjNhNzdjMDNhNzZjMjNiNzVjNDNjNzVjNTNjNzRjNzNkNzNjODNlNzNjYTNlNzJjYzNmNzFjZDQwNzFjZjQwNzBkMDQxNmZkMjQyNmZkMzQzNmVkNTQ0NmRkNjQ1NmNkODQ1NmNkOTQ2NmJkYjQ3NmFkYzQ4NjlkZTQ5NjhkZjRhNjhlMDRjNjdlMjRkNjZlMzRlNjVlNDRmNjRlNTUwNjRlNzUyNjNlODUzNjJlOTU0NjJlYTU2NjFlYjU3NjBlYzU4NjBlZDVhNWZlZTViNWVlZjVkNWVmMDVmNWVmMTYwNWRmMjYyNWRmMjY0NWNmMzY1NWNmNDY3NWNmNDY5NWNmNTZiNWNmNjZjNWNmNjZlNWNmNzcwNWNmNzcyNWNmODc0NWNmODc2NWNmOTc4NWRmOTc5NWRmOTdiNWRmYTdkNWVmYTdmNWVmYTgxNWZmYjgzNWZmYjg1NjBmYjg3NjFmYzg5NjFmYzhhNjJmYzhjNjNmYzhlNjRmYzkwNjVmZDkyNjZmZDk0NjdmZDk2NjhmZDk4NjlmZDlhNmFmZDliNmJmZTlkNmNmZTlmNmRmZWExNmVmZWEzNmZmZWE1NzFmZWE3NzJmZWE5NzNmZWFhNzRmZWFjNzZmZWFlNzdmZWIwNzhmZWIyN2FmZWI0N2JmZWI2N2NmZWI3N2VmZWI5N2ZmZWJiODFmZWJkODJmZWJmODRmZWMxODVmZWMyODdmZWM0ODhmZWM2OGFmZWM4OGNmZWNhOGRmZWNjOGZmZWNkOTBmZWNmOTJmZWQxOTRmZWQzOTVmZWQ1OTdmZWQ3OTlmZWQ4OWFmZGRhOWNmZGRjOWVmZGRlYTBmZGUwYTFmZGUyYTNmZGUzYTVmZGU1YTdmZGU3YTlmZGU5YWFmZGViYWNmY2VjYWVmY2VlYjBmY2YwYjJmY2YyYjRmY2Y0YjZmY2Y2YjhmY2Y3YjlmY2Y5YmJmY2ZiYmRmY2ZkYmZcIikpO1xuXG5leHBvcnQgdmFyIGluZmVybm8gPSByYW1wKGNvbG9ycyhcIjAwMDAwNDAxMDAwNTAxMDEwNjAxMDEwODAyMDEwYTAyMDIwYzAyMDIwZTAzMDIxMDA0MDMxMjA0MDMxNDA1MDQxNzA2MDQxOTA3MDUxYjA4MDUxZDA5MDYxZjBhMDcyMjBiMDcyNDBjMDgyNjBkMDgyOTBlMDkyYjEwMDkyZDExMGEzMDEyMGEzMjE0MGIzNDE1MGIzNzE2MGIzOTE4MGMzYzE5MGMzZTFiMGM0MTFjMGM0MzFlMGM0NTFmMGM0ODIxMGM0YTIzMGM0YzI0MGM0ZjI2MGM1MTI4MGI1MzI5MGI1NTJiMGI1NzJkMGI1OTJmMGE1YjMxMGE1YzMyMGE1ZTM0MGE1ZjM2MDk2MTM4MDk2MjM5MDk2MzNiMDk2NDNkMDk2NTNlMDk2NjQwMGE2NzQyMGE2ODQ0MGE2ODQ1MGE2OTQ3MGI2YTQ5MGI2YTRhMGM2YjRjMGM2YjRkMGQ2YzRmMGQ2YzUxMGU2YzUyMGU2ZDU0MGY2ZDU1MGY2ZDU3MTA2ZTU5MTA2ZTVhMTE2ZTVjMTI2ZTVkMTI2ZTVmMTM2ZTYxMTM2ZTYyMTQ2ZTY0MTU2ZTY1MTU2ZTY3MTY2ZTY5MTY2ZTZhMTc2ZTZjMTg2ZTZkMTg2ZTZmMTk2ZTcxMTk2ZTcyMWE2ZTc0MWE2ZTc1MWI2ZTc3MWM2ZDc4MWM2ZDdhMWQ2ZDdjMWQ2ZDdkMWU2ZDdmMWU2YzgwMWY2YzgyMjA2Yzg0MjA2Yjg1MjE2Yjg3MjE2Yjg4MjI2YThhMjI2YThjMjM2OThkMjM2OThmMjQ2OTkwMjU2ODkyMjU2ODkzMjY2Nzk1MjY2Nzk3Mjc2Njk4Mjc2NjlhMjg2NTliMjk2NDlkMjk2NDlmMmE2M2EwMmE2M2EyMmI2MmEzMmM2MWE1MmM2MGE2MmQ2MGE4MmU1ZmE5MmU1ZWFiMmY1ZWFkMzA1ZGFlMzA1Y2IwMzE1YmIxMzI1YWIzMzI1YWI0MzM1OWI2MzQ1OGI3MzU1N2I5MzU1NmJhMzY1NWJjMzc1NGJkMzg1M2JmMzk1MmMwM2E1MWMxM2E1MGMzM2I0ZmM0M2M0ZWM2M2Q0ZGM3M2U0Y2M4M2Y0YmNhNDA0YWNiNDE0OWNjNDI0OGNlNDM0N2NmNDQ0NmQwNDU0NWQyNDY0NGQzNDc0M2Q0NDg0MmQ1NGE0MWQ3NGIzZmQ4NGMzZWQ5NGQzZGRhNGUzY2RiNTAzYmRkNTEzYWRlNTIzOGRmNTMzN2UwNTUzNmUxNTYzNWUyNTczNGUzNTkzM2U0NWEzMWU1NWMzMGU2NWQyZmU3NWUyZWU4NjAyZGU5NjEyYmVhNjMyYWViNjQyOWViNjYyOGVjNjcyNmVkNjkyNWVlNmEyNGVmNmMyM2VmNmUyMWYwNmYyMGYxNzExZmYxNzMxZGYyNzQxY2YzNzYxYmYzNzgxOWY0NzkxOGY1N2IxN2Y1N2QxNWY2N2UxNGY2ODAxM2Y3ODIxMmY3ODQxMGY4ODUwZmY4ODcwZWY4ODkwY2Y5OGIwYmY5OGMwYWY5OGUwOWZhOTAwOGZhOTIwN2ZhOTQwN2ZiOTYwNmZiOTcwNmZiOTkwNmZiOWIwNmZiOWQwN2ZjOWYwN2ZjYTEwOGZjYTMwOWZjYTUwYWZjYTYwY2ZjYTgwZGZjYWEwZmZjYWMxMWZjYWUxMmZjYjAxNGZjYjIxNmZjYjQxOGZiYjYxYWZiYjgxZGZiYmExZmZiYmMyMWZiYmUyM2ZhYzAyNmZhYzIyOGZhYzQyYWZhYzYyZGY5YzcyZmY5YzkzMmY5Y2IzNWY4Y2QzN2Y4Y2YzYWY3ZDEzZGY3ZDM0MGY2ZDU0M2Y2ZDc0NmY1ZDk0OWY1ZGI0Y2Y0ZGQ0ZmY0ZGY1M2Y0ZTE1NmYzZTM1YWYzZTU1ZGYyZTY2MWYyZTg2NWYyZWE2OWYxZWM2ZGYxZWQ3MWYxZWY3NWYxZjE3OWYyZjI3ZGYyZjQ4MmYzZjU4NmYzZjY4YWY0Zjg4ZWY1Zjk5MmY2ZmE5NmY4ZmI5YWY5ZmM5ZGZhZmRhMWZjZmZhNFwiKSk7XG5cbmV4cG9ydCB2YXIgcGxhc21hID0gcmFtcChjb2xvcnMoXCIwZDA4ODcxMDA3ODgxMzA3ODkxNjA3OGExOTA2OGMxYjA2OGQxZDA2OGUyMDA2OGYyMjA2OTAyNDA2OTEyNjA1OTEyODA1OTIyYTA1OTMyYzA1OTQyZTA1OTUyZjA1OTYzMTA1OTczMzA1OTczNTA0OTgzNzA0OTkzODA0OWEzYTA0OWEzYzA0OWIzZTA0OWMzZjA0OWM0MTA0OWQ0MzAzOWU0NDAzOWU0NjAzOWY0ODAzOWY0OTAzYTA0YjAzYTE0YzAyYTE0ZTAyYTI1MDAyYTI1MTAyYTM1MzAyYTM1NTAyYTQ1NjAxYTQ1ODAxYTQ1OTAxYTU1YjAxYTU1YzAxYTY1ZTAxYTY2MDAxYTY2MTAwYTc2MzAwYTc2NDAwYTc2NjAwYTc2NzAwYTg2OTAwYTg2YTAwYTg2YzAwYTg2ZTAwYTg2ZjAwYTg3MTAwYTg3MjAxYTg3NDAxYTg3NTAxYTg3NzAxYTg3ODAxYTg3YTAyYTg3YjAyYTg3ZDAzYTg3ZTAzYTg4MDA0YTg4MTA0YTc4MzA1YTc4NDA1YTc4NjA2YTY4NzA3YTY4ODA4YTY4YTA5YTU4YjBhYTU4ZDBiYTU4ZTBjYTQ4ZjBkYTQ5MTBlYTM5MjBmYTM5NDEwYTI5NTExYTE5NjEzYTE5ODE0YTA5OTE1OWY5YTE2OWY5YzE3OWU5ZDE4OWQ5ZTE5OWRhMDFhOWNhMTFiOWJhMjFkOWFhMzFlOWFhNTFmOTlhNjIwOThhNzIxOTdhODIyOTZhYTIzOTVhYjI0OTRhYzI2OTRhZDI3OTNhZTI4OTJiMDI5OTFiMTJhOTBiMjJiOGZiMzJjOGViNDJlOGRiNTJmOGNiNjMwOGJiNzMxOGFiODMyODliYTMzODhiYjM0ODhiYzM1ODdiZDM3ODZiZTM4ODViZjM5ODRjMDNhODNjMTNiODJjMjNjODFjMzNkODBjNDNlN2ZjNTQwN2VjNjQxN2RjNzQyN2NjODQzN2JjOTQ0N2FjYTQ1N2FjYjQ2NzljYzQ3NzhjYzQ5NzdjZDRhNzZjZTRiNzVjZjRjNzRkMDRkNzNkMTRlNzJkMjRmNzFkMzUxNzFkNDUyNzBkNTUzNmZkNTU0NmVkNjU1NmRkNzU2NmNkODU3NmJkOTU4NmFkYTVhNmFkYTViNjlkYjVjNjhkYzVkNjdkZDVlNjZkZTVmNjVkZTYxNjRkZjYyNjNlMDYzNjNlMTY0NjJlMjY1NjFlMjY2NjBlMzY4NWZlNDY5NWVlNTZhNWRlNTZiNWRlNjZjNWNlNzZlNWJlNzZmNWFlODcwNTllOTcxNThlOTcyNTdlYTc0NTdlYjc1NTZlYjc2NTVlYzc3NTRlZDc5NTNlZDdhNTJlZTdiNTFlZjdjNTFlZjdlNTBmMDdmNGZmMDgwNGVmMTgxNGRmMTgzNGNmMjg0NGJmMzg1NGJmMzg3NGFmNDg4NDlmNDg5NDhmNThiNDdmNThjNDZmNjhkNDVmNjhmNDRmNzkwNDRmNzkxNDNmNzkzNDJmODk0NDFmODk1NDBmOTk3M2ZmOTk4M2VmOTlhM2VmYTliM2RmYTljM2NmYTllM2JmYjlmM2FmYmExMzlmYmEyMzhmY2EzMzhmY2E1MzdmY2E2MzZmY2E4MzVmY2E5MzRmZGFiMzNmZGFjMzNmZGFlMzJmZGFmMzFmZGIxMzBmZGIyMmZmZGI0MmZmZGI1MmVmZWI3MmRmZWI4MmNmZWJhMmNmZWJiMmJmZWJkMmFmZWJlMmFmZWMwMjlmZGMyMjlmZGMzMjhmZGM1MjdmZGM2MjdmZGM4MjdmZGNhMjZmZGNiMjZmY2NkMjVmY2NlMjVmY2QwMjVmY2QyMjVmYmQzMjRmYmQ1MjRmYmQ3MjRmYWQ4MjRmYWRhMjRmOWRjMjRmOWRkMjVmOGRmMjVmOGUxMjVmN2UyMjVmN2U0MjVmNmU2MjZmNmU4MjZmNWU5MjZmNWViMjdmNGVkMjdmM2VlMjdmM2YwMjdmMmYyMjdmMWY0MjZmMWY1MjVmMGY3MjRmMGY5MjFcIikpO1xuIiwiLyoqXG4gKiBDb3B5cmlnaHQgwqkgMjAxNSAtIDIwMTggVGhlIEJyb2FkIEluc3RpdHV0ZSwgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEJTRCAzLWNsYXVzZSBsaWNlbnNlIChodHRwczovL2dpdGh1Yi5jb20vYnJvYWRpbnN0aXR1dGUvZ3RleC12aXovYmxvYi9tYXN0ZXIvTElDRU5TRS5tZClcbiAqL1xuaW1wb3J0IHttYXgsIG1pbn0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge3NjYWxlU2VxdWVudGlhbH0gZnJvbSBcImQzLXNjYWxlXCI7XG5pbXBvcnQgKiBhcyBkM0Nocm9tYXRpYyBmcm9tIFwiZDMtc2NhbGUtY2hyb21hdGljXCI7XG5cInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbG9yQ2hhcnQoc2h1ZmZsZT10cnVlKXtcbiAgICAvLyByZWYgaWxsdXN0cmF0b3IgY29sb3IgdGhlbWVzXG4gICAgY29uc3QgY29sb3JzID0gW1xuICAgICAgICBcInJnYigxMDAsMTE4LDEyMClcIixcbiAgICAgICAgXCJyZ2IoMTAxLDE0MSwxNDUpXCIsXG4gICAgICAgIFwicmdiKDEwMywxMjYsODIpXCIsXG4gICAgICAgIFwicmdiKDEwMywxODQsMjIyKVwiLFxuICAgICAgICBcInJnYigxMDgsMTEwLDg4KVwiLFxuXG4gICAgICAgIFwicmdiKDEwOCwxNDcsMTI4KVwiLFxuICAgICAgICBcInJnYigxMTksMTQ0LDE4MilcIixcbiAgICAgICAgXCJyZ2IoMTI2LDEzMCwxMjIpXCIsXG4gICAgICAgIFwicmdiKDEzMywxNzMsMTg2KVwiLFxuICAgICAgICBcInJnYigxMzcsMTE0LDkxKVwiLFxuICAgICAgICBcInJnYigxNDUsMTcwLDE1NylcIixcblxuICAgICAgICBcInJnYigxNDUsMjAxLDIzMilcIixcbiAgICAgICAgXCJyZ2IoMTQ3LDEwNSw2NilcIixcbiAgICAgICAgXCJyZ2IoMTU5LDExNCwxMTYpXCIsXG4gICAgICAgIFwicmdiKDE1OSwxODgsMTkxKVwiLFxuICAgICAgICBcInJnYigxNTksMjI5LDE5NClcIixcbiAgICAgICAgXCJyZ2IoMTYzLDE2MywxNzEpXCIsXG5cbiAgICAgICAgXCJyZ2IoMTY0LDIwNywxOTApXCIsXG4gICAgICAgIFwicmdiKDE3MiwxMDgsMTMwKVwiLFxuICAgICAgICBcInJnYigxNzMsODQsMTE0KVwiLFxuICAgICAgICBcInJnYigxNzQsMTk1LDIyMilcIixcbiAgICAgICAgXCJyZ2IoMTc2LDIwNCwxNTMpXCIsXG5cbiAgICAgICAgXCJyZ2IoMTc5LDE4MCwxNTApXCIsXG4gICAgICAgIFwicmdiKDE4MCwyMjAsMjM3KVwiLFxuICAgICAgICBcInJnYigxODMsMjAyLDEyMSlcIixcbiAgICAgICAgXCJyZ2IoMTkyLDIwMiw4NSlcIixcbiAgICAgICAgXCJyZ2IoMTkzLDE5MSwxOTNcIixcbiAgICAgICAgXCJyZ2IoMTk1LDk3LDEzNilcIixcblxuICAgICAgICBcInJnYigxOTksMTIxLDEwMilcIixcbiAgICAgICAgXCJyZ2IoMjA3LDIwMiw3NilcIixcbiAgICAgICAgXCJyZ2IoMjA5LDIxOSwxODkpXCIsXG4gICAgICAgIFwicmdiKDIxMywyNTEsMjU1KVwiLFxuICAgICAgICBcInJnYigyMTUsOTQsNTYpXCIsXG5cbiAgICAgICAgXCJyZ2IoMjE4LDExNCwxMjYpXCIsXG4gICAgICAgIFwicmdiKDIyMyw5MCw3MylcIixcbiAgICAgICAgXCJyZ2IoMjI0LDI0NywyMTcpXCIsXG4gICAgICAgIFwicmdiKDIyNywyMDUsMTY0KVwiLFxuICAgICAgICBcInJnYigyMjgsMTY4LDE4NSlcIixcblxuICAgICAgICBcInJnYigyMzAsMTc2LDE1MilcIixcbiAgICAgICAgXCJyZ2IoMjMyLDIxMiwxNzUpXCIsXG4gICAgICAgIFwicmdiKDIzOSwyMDEsNzYpXCIsXG4gICAgICAgIFwicmdiKDI0MCwxMjQsMTA4KVwiLFxuICAgICAgICBcInJnYigyNDYsMjMyLDE3NylcIixcblxuICAgICAgICBcInJnYigyNDksMjI4LDE3MylcIixcbiAgICAgICAgXCJyZ2IoMjUyLDI0NSwxOTEpXCIsXG4gICAgICAgIFwicmdiKDI1NSwxODgsMTAzKVwiLFxuICAgICAgICBcInJnYig0NSw5NCwxMTApXCIsXG4gICAgICAgIFwicmdiKDUxLDE1MywyMDQpXCIsXG5cbiAgICAgICAgXCJyZ2IoNjAsMTI0LDE0NSlcIixcbiAgICAgICAgXCJyZ2IoNjIsODcsMTQ1KVwiLFxuICAgICAgICBcInJnYig2NSwxMTUsMTIwKVwiLFxuICAgICAgICBcInJnYig4OSwyMTYsMjI5KVwiLFxuICAgICAgICBcInJnYig5NCwxNzgsMTUzKVwiLFxuICAgICAgICBcInJnYig5NSwxMjQsMTM0KVwiXG4gICAgXTtcblxuICAgIGlmIChzaHVmZmxlKSByZXR1cm4gc2h1ZmZsZUNvbG9ycyhjb2xvcnMpO1xuICAgIHJldHVybiBjb2xvcnM7XG59XG5cbmZ1bmN0aW9uIHNodWZmbGVDb2xvcnMoYXJyYXkpIHtcbiAgICAvLyBGaXNoZXItWWF0ZXMgc2h1ZmZsZVxuICAgIGxldCBjb3VudGVyID0gYXJyYXkubGVuZ3RoO1xuXG4gICAgLy8gV2hpbGUgdGhlcmUgYXJlIGVsZW1lbnRzIGluIHRoZSBhcnJheVxuICAgIHdoaWxlIChjb3VudGVyID4gMCkge1xuICAgICAgICAvLyBQaWNrIGEgcmFuZG9tIGluZGV4XG4gICAgICAgIGxldCBpbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNvdW50ZXIpO1xuXG4gICAgICAgIC8vIERlY3JlYXNlIGNvdW50ZXIgYnkgMVxuICAgICAgICBjb3VudGVyLS07XG5cbiAgICAgICAgLy8gQW5kIHN3YXAgdGhlIGxhc3QgZWxlbWVudCB3aXRoIGl0XG4gICAgICAgIGxldCB0ZW1wID0gYXJyYXlbY291bnRlcl07XG4gICAgICAgIGFycmF5W2NvdW50ZXJdID0gYXJyYXlbaW5kZXhdO1xuICAgICAgICBhcnJheVtpbmRleF0gPSB0ZW1wO1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheTtcbn1cblxuLyoqXG4gKiBnZXQgYSBjb2xvciBzY2hlbWUgYnkgbmFtZVxuICogQHBhcmFtIG5hbWUge2VudW19OiBCdUduLCBPclJkLi4uLlxuICogQHJldHVybnMgeyp9OiBhIGNvbnRpbnVvdXMgaW50ZXJwb2xhdG9yICh1c2VkIHdpdGggZDMuc2NhbGVTZXF1ZW50aWFsKVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29sb3JJbnRlcnBvbGF0b3IobmFtZSl7XG4gICAgLy8gcmVmZXJlbmNlOiBodHRwczovL2dpdGh1Yi5jb20vZDMvZDMtc2NhbGUtY2hyb21hdGljL2Jsb2IvbWFzdGVyL1JFQURNRS5tZCNzZXF1ZW50aWFsLW11bHRpLWh1ZVxuXG4gICAgY29uc3QgaW50ZXJwb2xhdG9ycyA9IHtcbiAgICAgICAgQnVHbjogZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVCdUduLFxuICAgICAgICBPclJkOiBkM0Nocm9tYXRpYy5pbnRlcnBvbGF0ZU9yUmQsXG4gICAgICAgIFB1QnU6IGQzQ2hyb21hdGljLmludGVycG9sYXRlUHVCdSxcbiAgICAgICAgWWxHbkJ1OiBkM0Nocm9tYXRpYy5pbnRlcnBvbGF0ZVlsR25CdSxcbiAgICAgICAgQmx1ZXM6IGQzQ2hyb21hdGljLmludGVycG9sYXRlQmx1ZXMsXG4gICAgICAgIE9yYW5nZXM6IGQzQ2hyb21hdGljLmludGVycG9sYXRlT3JhbmdlcyxcbiAgICAgICAgR3JlZW5zOiBkM0Nocm9tYXRpYy5pbnRlcnBvbGF0ZUdyZWVucyxcbiAgICAgICAgUHVycGxlczogZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVQdXJwbGVzLFxuICAgICAgICBSZWRzOiBkM0Nocm9tYXRpYy5pbnRlcnBvbGF0ZVJlZHMsXG4gICAgICAgIEdyZXlzOiBkM0Nocm9tYXRpYy5pbnRlcnBvbGF0ZUdyZXlzLFxuICAgICAgICBHcmF5czogZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVHcmV5cyxcblxuICAgICAgICAvLyBkaXZlcmdpbmcgY29sb3Igc2NoZW1lc1xuICAgICAgICBSZEJ1OiBkM0Nocm9tYXRpYy5pbnRlcnBvbGF0ZVJkQnUsXG4gICAgICAgIFJkR3k6IGQzQ2hyb21hdGljLmludGVycG9sYXRlUmRHeSxcbiAgICAgICAgUGlZRzogZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVQaVlHLFxuICAgICAgICBQdU9yOiBkM0Nocm9tYXRpYy5pbnRlcnBvbGF0ZVB1T3IsXG4gICAgICAgIFJkWWxCdTogZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVSZFlsQnVcbiAgICB9O1xuICAgIGlmICghaW50ZXJwb2xhdG9ycy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBjb25zdCBlcnIgPSBcIlVucmVjb2duaXplZCBjb2xvcjogXCIgKyBuYW1lO1xuICAgICAgICBhbGVydChlcnIpO1xuICAgICAgICB0aHJvdyhlcnIpO1xuICAgIH1cbiAgICByZXR1cm4gaW50ZXJwb2xhdG9yc1tuYW1lXTtcbn1cblxuLyoqXG4gKiByZWZlcmVuY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9kMy9kMy1zY2FsZVxuICogcmVmZXJlbmNlOiBodHRwOi8vYmwub2Nrcy5vcmcvY3VycmFuLzMwOTRiMzdlNjNiOTE4YmFiMGEwNjc4N2UxNjE2MDdiXG4gKiBzY2FsZVNlcXVlbnRpYWwgbWFwcyB0aGUgY29udGludW91cyBkb21haW4gdG8gYSBjb250aW51b3VzIGNvbG9yIHNjYWxlXG4gKiBAcGFyYW0gZGF0YSB7TGlzdH0gb2YgbnVtZXJpY2FsIGRhdGFcbiAqIEBwYXJhbSBjb2xvcnMge1N0cmluZ30gYSBjb2xvciBuYW1lIHRoYXQgaXMgYXZhaWxhYmxlIGluIGdldENvbG9ySW50ZXJwb2xhdG9yKClcbiAqIEBwYXJhbSBkbWluIHtOdW1iZXJ9IG1pbmltdW0gZG9tYWluIHZhbHVlXG4gKiBAcGFyYW0gZG1heCB7TnVtYmVyfSBtYXhpbXVtIGRvbWFpbiB2YWx1ZVxuICogQHBhcmFtIHJldmVyc2Uge0Jvb2xlYW59IHJldmVyc2UgdGhlIGNvbG9yIHNjaGVtZVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0Q29sb3JTY2FsZShkYXRhLCBjb2xvcnM9XCJZbEduQnVcIiwgZG1pbj11bmRlZmluZWQsIGRtYXg9dW5kZWZpbmVkLCByZXZlcnNlPWZhbHNlKSB7XG4gICAgLy8gbGV0IGRtYXggPSBNYXRoLnJvdW5kKG1heChkYXRhKSk7XG4gICAgZG1heCA9IGRtYXggPT09IHVuZGVmaW5lZD9tYXgoZGF0YSk6ZG1heDtcbiAgICBkbWluID0gZG1pbiA9PT0gdW5kZWZpbmVkP21pbihkYXRhKTpkbWluO1xuICAgIGNvbnN0IHNjYWxlID0gc2NhbGVTZXF1ZW50aWFsKGdldENvbG9ySW50ZXJwb2xhdG9yKGNvbG9ycykpO1xuICAgIGlmKHJldmVyc2UpIHNjYWxlLmRvbWFpbihbZG1heCwgZG1pbl0pO1xuICAgIGVsc2Ugc2NhbGUuZG9tYWluKFtkbWluLCBkbWF4XSk7XG4gICAgcmV0dXJuIHNjYWxlO1xufVxuXG4vKipcbiAqIERyYXcgYSBjb2xvciBsZWdlbmQgYmFyLlxuICogRGVwZW5kZW5jaWVzOiBleHByZXNzaW9uTWFwLmNzc1xuICogQHBhcmFtIHRpdGxlIHtTdHJpbmd9XG4gKiBAcGFyYW0gZG9tIHtvYmplY3R9IEQzIGRvbSBvYmplY3RcbiAqIEBwYXJhbSBzY2FsZSB7T2JqZWN0fSBEMyBzY2FsZSBvZiB0aGUgY29sb3JcbiAqIEBwYXJhbSBjb25maWcge09iamVjdH0gd2l0aCBhdHRyOiB4LCB5XG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufVxuICogQHBhcmFtIHRpY2tzIHtJbnRlZ2VyfSBudW1iZXIgb2YgdGlja3MgKG9uZS1zaWRlZClcbiAqIEBwYXJhbSBiYXNlIHtJbnRlZ2VyfSBsb2cgYmFzZVxuICogQHBhcmFtIGNlbGwge09iamVjdH0gd2l0aCBhdHRyaWJ1dGVzOiBoLCB3XG4gKiBAcGFyYW0gb3JpZW50YXRpb24ge2VudW19IGggb3IgdiwgaS5lLiBob3Jpem9udGFsIG9yIHZlcnRpY2FsXG4gKiBAcGFyYW0gZGl2ZXJnaW5nIHtCb29sZWFufSB3aGV0aGVyIHRoZSBjb2xvciBzY2hlbWUgaXMgZGl2ZXJnaW5nXG4gKiBAcGFyYW0gY2VsbFxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJhd0NvbG9yTGVnZW5kKHRpdGxlLCBkb20sIHNjYWxlLCBjb25maWcsIHVzZUxvZywgdGlja3M9MTAsIGJhc2U9MTAsIGNlbGw9e2g6MTAsIHc6NDB9LCBvcmllbnRhdGlvbj1cImhcIiwgZGl2ZXJnaW5nPWZhbHNlKXtcbiAgICBsZXQgZGF0YSA9IFtdO1xuXG4gICAgaWYoZGl2ZXJnaW5nKXtcbiAgICAgICAgbGV0IHJhbmdlID0gWy4uLkFycmF5KHRpY2tzKzEpLmtleXMoKV07XG4gICAgICAgIGxldCBpbnRlcnZhbCA9IHNjYWxlLmRvbWFpbigpWzFdL3RpY2tzO1xuICAgICAgICBkYXRhID0gcmFuZ2UubWFwKChkKT0+ZCppbnRlcnZhbCk7XG4gICAgICAgIGRhdGEgPSBkYXRhLmNvbmNhdChyYW5nZS5maWx0ZXIoKGQpPT5kIT0wKS5tYXAoKGQpPT4wLWQqaW50ZXJ2YWwpKS5zb3J0KChhLCBiKSA9PiB7cmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiBhID49IGIgPyAwIDogTmFOO30pO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgICBsZXQgcmFuZ2UgPSBbLi4uQXJyYXkodGlja3MrMSkua2V5cygpXTtcbiAgICAgICAgbGV0IGludGVydmFsID0gc2NhbGUuZG9tYWluKClbMV0vdGlja3M7XG4gICAgICAgIGRhdGEgPSByYW5nZS5tYXAoKGQpPT5kKmludGVydmFsKTtcbiAgICB9XG5cbiAgICAvLyBsZWdlbmQgZ3JvdXBzXG4gICAgY29uc3QgbGVnZW5kcyA9IGRvbS5hcHBlbmQoXCJnXCIpLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgke2NvbmZpZy54fSwgJHtjb25maWcueX0pYClcbiAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5sZWdlbmRcIikuZGF0YShkYXRhKTtcblxuICAgIGNvbnN0IGcgPSBsZWdlbmRzLmVudGVyKCkuYXBwZW5kKFwiZ1wiKS5jbGFzc2VkKFwibGVnZW5kXCIsIHRydWUpO1xuXG4gICAgaWYgKG9yaWVudGF0aW9uID09ICdoJyl7XG4gICAgICAgICAvLyBsZWdlbmQgdGl0bGVcbiAgICAgICAgZG9tLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJjb2xvci1sZWdlbmRcIilcbiAgICAgICAgICAgIC50ZXh0KHRpdGxlKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIC0xMClcbiAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCBjZWxsLmgpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBgdHJhbnNsYXRlKCR7Y29uZmlnLnh9LCAke2NvbmZpZy55fSlgKTtcblxuICAgICAgICAvLyB0aGUgY29sb3IgbGVnZW5kXG4gICAgICAgIGcuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIChkLCBpKSA9PiBjZWxsLncqaSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCA1KVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBjZWxsLncpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBjZWxsLmgpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIHNjYWxlKTtcblxuICAgICAgICBnLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJjb2xvci1sZWdlbmRcIilcbiAgICAgICAgICAgIC50ZXh0KChkKSA9PiB1c2VMb2c/KE1hdGgucG93KGJhc2UsIGQpKS50b1ByZWNpc2lvbigyKTpkLnRvUHJlY2lzaW9uKDIpKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIChkLCBpKSA9PiBjZWxsLncgKiBpKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgICAvLyBsZWdlbmQgdGl0bGVcbiAgICAgICAgZG9tLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJjb2xvci1sZWdlbmRcIilcbiAgICAgICAgICAgIC50ZXh0KHRpdGxlKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIDUpXG4gICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwic3RhcnRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCAwKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgke2NvbmZpZy54fSwgJHtjb25maWcueSArIGNlbGwuaCAqIGRhdGEubGVuZ3RofSlyb3RhdGUoOTApYCk7XG5cbiAgICAgICAgZy5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgMClcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCAoZCwgaSkgPT4gY2VsbC5oKmkpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGNlbGwudylcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGNlbGwuaClcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgc2NhbGUpO1xuXG4gICAgICAgIGcuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImNvbG9yLWxlZ2VuZFwiKVxuICAgICAgICAgICAgLnRleHQoKGQpID0+IHVzZUxvZz8oTWF0aC5wb3coYmFzZSwgZCktMSkudG9QcmVjaXNpb24oMik6ZC50b1ByZWNpc2lvbigyKSlcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCAxNSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCAoZCwgaSkgPT4gY2VsbC5oICogaSArIChjZWxsLmgvMikpO1xuICAgIH1cblxuXG5cbn0iLCIvKipcbiAqIENvcHlyaWdodCDCqSAyMDE1IC0gMjAxOCBUaGUgQnJvYWQgSW5zdGl0dXRlLCBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQlNEIDMtY2xhdXNlIGxpY2Vuc2UgKGh0dHBzOi8vZ2l0aHViLmNvbS9icm9hZGluc3RpdHV0ZS9ndGV4LXZpei9ibG9iL21hc3Rlci9MSUNFTlNFLm1kKVxuICovXG5cblwidXNlIHN0cmljdFwiO1xuaW1wb3J0IHtuZXN0fSBmcm9tIFwiZDMtY29sbGVjdGlvblwiO1xuaW1wb3J0IHtleHRlbnQsIG1heCwgbWlufSBmcm9tIFwiZDMtYXJyYXlcIjtcbmltcG9ydCB7c2VsZWN0LCBzZWxlY3RBbGwsIGV2ZW50fSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQge3NjYWxlQmFuZCwgc2NhbGVMaW5lYXIsIHNjYWxlU3FydH0gZnJvbSBcImQzLXNjYWxlXCI7XG5pbXBvcnQge2JydXNoWH0gZnJvbSBcImQzLWJydXNoXCI7XG5cbmltcG9ydCBUb29sdGlwIGZyb20gXCIuL1Rvb2x0aXBcIjtcbmltcG9ydCB7c2V0Q29sb3JTY2FsZSwgZHJhd0NvbG9yTGVnZW5kfSBmcm9tIFwiLi9jb2xvcnNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQnViYmxlTWFwIHtcbiAgICBjb25zdHJ1Y3RvcihkYXRhLCB1c2VMb2c9dHJ1ZSwgbG9nQmFzZT0xMCwgY29sb3JTY2hlbWU9XCJSZWRzXCIsIHRvb2x0aXBJZCA9IFwidG9vbHRpcFwiKXtcbiAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy51c2VMb2cgPSB1c2VMb2c7XG4gICAgICAgIHRoaXMubG9nQmFzZSA9IGxvZ0Jhc2U7XG4gICAgICAgIHRoaXMuY29sb3JTY2hlbWUgPSBjb2xvclNjaGVtZTtcblxuICAgICAgICAvLyBpbml0aWF0ZXMgYWRkaXRpb25hbCBhdHRyaWJ1dGVzXG4gICAgICAgIHRoaXMueFNjYWxlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnlTY2FsZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5jb2xvclNjYWxlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmJ1YmJsZVNjYWxlID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIC8vIHBlcmlwaGVyYWwgZmVhdHVyZXNcbiAgICAgICAgLy8gVG9vbHRpcFxuICAgICAgICBpZiAoJChgIyR7dG9vbHRpcElkfWApLmxlbmd0aCA9PSAwKSAkKCc8ZGl2Lz4nKS5hdHRyKCdpZCcsIHRvb2x0aXBJZCkuYXBwZW5kVG8oJCgnYm9keScpKTtcbiAgICAgICAgdGhpcy50b29sdGlwID0gbmV3IFRvb2x0aXAodG9vbHRpcElkKTtcbiAgICAgICAgc2VsZWN0KGAjJHt0b29sdGlwSWR9YCkuY2xhc3NlZCgnYnViYmxlbWFwLXRvb2x0aXAnLCB0cnVlKTtcblxuICAgICAgICB0aGlzLnRvb2xiYXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHRoZSBidWJibGUgbWFwIGluIGNhbnZhc1xuICAgICAqIEBwYXJhbSBjYW52YXMge09CSkVDVH06IHRoZSBjYW52YXMgRE9NIEQzIHNlbGVjdCBvYmplY3RcbiAgICAgKiBAcGFyYW0gZGltZW5zaW9ucyB7T0JKRUNUfTogdGhlIHBsb3QncyBkaW1lbnNpb25zXG4gICAgICogQHBhcmFtIGNvbG9yU2NhbGVEb21haW4ge0xJU1R9IGRlZmluZSB0aGUgY29sb3Igc2NhbGUgZG9tYWluKClcbiAgICAgKiBAcGFyYW0gc2hvd0xhYmVscyB7Qm9vbGVhbn1cbiAgICAgKiBAcGFyYW0gY29sdW1uTGFiZWxBbmdsZSB7SW50ZWdlcn1cbiAgICAgKiBAcGFyYW0gY29sdW1uTGFiZWxQb3NBZGp1c3Qge0ludGVnZXJ9XG4gICAgICovXG4gICAgZHJhd0NhbnZhcyhjYW52YXMsIGRpbWVuc2lvbnM9e3c6MTAwMCwgaDo2MDAsIHRvcDoyMCwgbGVmdDoyMH0sIGNvbG9yU2NhbGVEb21haW49dW5kZWZpbmVkLCBzaG93TGFiZWxzPXRydWUsIGNvbHVtbkxhYmVsQW5nbGU9MzAsIGNvbHVtbkxhYmVsUG9zQWRqdXN0PTApe1xuICAgICAgICB0aGlzLl9zZXRTY2FsZXMoZGltZW5zaW9ucywgY29sb3JTY2FsZURvbWFpbik7XG5cbiAgICAgICAgbGV0IGNvbnRleHQgPSBjYW52YXMubm9kZSgpLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgLy9iYWNrZ3JvdW5kXG4gICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJyNmZmZmZmYnO1xuICAgICAgICBjb250ZXh0LnJlY3QoMCwwLGNhbnZhcy5hdHRyKCd3aWR0aCcpLCBjYW52YXMuYXR0cignaGVpZ2h0JykpO1xuICAgICAgICBjb250ZXh0LmZpbGwoKTtcbiAgICAgICAgLy8gYnViYmxlc1xuICAgICAgICB0aGlzLmRhdGEuZm9yRWFjaCgoZCk9PntcbiAgICAgICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuY29sb3JTY2FsZShkLnZhbHVlKTtcbiAgICAgICAgICAgIGNvbnRleHQuYXJjKHRoaXMueFNjYWxlKGQueCkgKyB0aGlzLnhTY2FsZS5iYW5kd2lkdGgoKS8yLCB0aGlzLnlTY2FsZShkLnkpLCB0aGlzLmJ1YmJsZVNjYWxlKGQuciksIDAsIDIqTWF0aC5QSSk7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGwoKTtcbiAgICAgICAgICAgIGNvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHRleHQgbGFiZWxzXG4gICAgICAgIGlmKHNob3dMYWJlbHMpe1xuICAgICAgICAgICAgY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgICBjb250ZXh0LnRleHRBbGlnbiA9ICdyaWdodCc7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICdibGFjayc7XG4gICAgICAgICAgICBjb250ZXh0LmZvbnQgPSAnMTBweCBPcGVuIFNhbnMnO1xuICAgICAgICAgICAgdGhpcy55U2NhbGUuZG9tYWluKCkuZm9yRWFjaCgoZCk9PntcbiAgICAgICAgICAgICAgICBjb250ZXh0LmZpbGxUZXh0KGQsIHRoaXMueFNjYWxlLnJhbmdlKClbMF0tMTIsIHRoaXMueVNjYWxlKGQpKzIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb250ZXh0LnJlc3RvcmUoKTtcblxuICAgICAgICAgICAgdGhpcy54U2NhbGUuZG9tYWluKCkuZm9yRWFjaCgoZCk9PntcbiAgICAgICAgICAgICAgICBjb250ZXh0LnNhdmUoKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICdibGFjayc7XG4gICAgICAgICAgICAgICAgY29udGV4dC5mb250ID0gJzEwcHggT3BlbiBTYW5zJztcbiAgICAgICAgICAgICAgICBjb250ZXh0LnRleHRBbGlnbiA9ICdsZWZ0JztcbiAgICAgICAgICAgICAgICBjb250ZXh0LnRyYW5zbGF0ZSh0aGlzLnhTY2FsZShkKSt0aGlzLnhTY2FsZS5iYW5kd2lkdGgoKS8yIC0gMywgdGhpcy55U2NhbGUucmFuZ2UoKVsxXSArIGNvbHVtbkxhYmVsUG9zQWRqdXN0KTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LnJvdGF0ZShNYXRoLlBJLzIpO1xuICAgICAgICAgICAgICAgIGNvbnRleHQuZmlsbFRleHQoZCwgMCwgMCk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5yZXN0b3JlKCk7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhd0NvbWJvKG1pbmlEb20sIGZvY3VzRG9tLCBkaW1lbnNpb25zPXt3OjEwMDAsIGg6NjAwLCB0b3A6MCwgbGVmdDowfSwgY29sb3JTY2FsZURvbWFpbj11bmRlZmluZWQsIHNob3dMYWJlbHM9dHJ1ZSwgY29sdW1uTGFiZWxBbmdsZT0zMCwgY29sdW1uTGFiZWxQb3NBZGp1c3Q9MTAsIGFkZEJydXNoPXRydWUpIHtcbiAgICAgICAgdGhpcy5fc2V0TWluaVNjYWxlcyhkaW1lbnNpb25zLCBjb2xvclNjYWxlRG9tYWluKTtcbiAgICAgICAgdGhpcy5kcmF3U3ZnKGZvY3VzRG9tLCB7XG4gICAgICAgICAgICB3OiBkaW1lbnNpb25zLncsXG4gICAgICAgICAgICBoOiBkaW1lbnNpb25zLmgyLFxuICAgICAgICAgICAgdG9wOiBkaW1lbnNpb25zLnRvcCxcbiAgICAgICAgICAgIGxlZnQ6IGRpbWVuc2lvbnMubGVmdFxuICAgICAgICB9LCBjb2xvclNjYWxlRG9tYWluLCBzaG93TGFiZWxzLCBjb2x1bW5MYWJlbEFuZ2xlLCBjb2x1bW5MYWJlbFBvc0FkanVzdCk7XG4gICAgICAgIGxldCBidWJibGVzID0gbWluaURvbS5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsaXAtcGF0aFwiLCBcInVybCgjY2xpcClcIik7XG4gICAgICAgIGJ1YmJsZXMuc2VsZWN0QWxsKFwiLm1pbmktbWFwLWNlbGxcIilcbiAgICAgICAgICAgIC5kYXRhKHRoaXMuZGF0YSwgKGQpID0+IGQudmFsdWUpXG4gICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJyb3dcIiwgKGQpID0+IGB4JHt0aGlzLnhTY2FsZU1pbmkuZG9tYWluKCkuaW5kZXhPZihkLmRpc3BsYXlYID8gZC5kaXNwbGF5WCA6IGQueCl9YClcbiAgICAgICAgICAgIC5hdHRyKFwiY29sXCIsIChkKSA9PiBgeSR7dGhpcy55U2NhbGVNaW5pLmRvbWFpbigpLmluZGV4T2YoZC55KX1gKVxuICAgICAgICAgICAgLmF0dHIoXCJjeFwiLCAoZCkgPT4gdGhpcy54U2NhbGVNaW5pKGQuZGlzcGxheVggPyBkLmRpc3BsYXlYIDogZC54KSArIHRoaXMueFNjYWxlTWluaS5iYW5kd2lkdGgoKSAvIDIpXG4gICAgICAgICAgICAuYXR0cihcImN5XCIsIChkKSA9PiB0aGlzLnlTY2FsZU1pbmkoZC55KSlcbiAgICAgICAgICAgIC5hdHRyKFwiclwiLCAoZCkgPT4gdGhpcy5idWJibGVTY2FsZU1pbmkoZC5yKSlcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgKGQpID0+IHRoaXMuY29sb3JTY2FsZShkLnZhbHVlKSk7XG5cbiAgICAgICAgbGV0IGluaXRpYWxCcnVzaFNpemUgPSA1MDtcbiAgICAgICAgbGV0IHhMaXN0ID0gdGhpcy54U2NhbGVNaW5pLmRvbWFpbigpO1xuICAgICAgICBpZiAoYWRkQnJ1c2gpIHtcbiAgICAgICAgICAgIGNvbnN0IGJydXNoZWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdGlvbiA9IGV2ZW50LnNlbGVjdGlvbjtcbiAgICAgICAgICAgICAgICBsZXQgYnJ1c2hMZWZ0ID0gTWF0aC5yb3VuZChzZWxlY3Rpb25bMF0gLyB0aGlzLnhTY2FsZU1pbmkuc3RlcCgpKTtcbiAgICAgICAgICAgICAgICBsZXQgYnJ1c2hSaWdodCA9IE1hdGgucm91bmQoc2VsZWN0aW9uWzFdIC8gdGhpcy54U2NhbGVNaW5pLnN0ZXAoKSk7XG4gICAgICAgICAgICAgICAgdGhpcy54U2NhbGUuZG9tYWluKHRoaXMueFNjYWxlTWluaS5kb21haW4oKS5zbGljZShicnVzaExlZnQsIGJydXNoUmlnaHQpKTsgLy8gcmVzZXQgdGhlIHhTY2FsZSBkb21haW5cbiAgICAgICAgICAgICAgICBsZXQgYnViYmxlTWF4ID0gbWluKFt0aGlzLnhTY2FsZS5iYW5kd2lkdGgoKSwgdGhpcy55U2NhbGUuYmFuZHdpZHRoKCldKSAvIDI7XG4gICAgICAgICAgICAgICAgdGhpcy5idWJibGVTY2FsZSA9IHRoaXMuX3NldEJ1YmJsZVNjYWxlKHttYXg6IGJ1YmJsZU1heCwgbWluOiAyfSk7IC8vIFRPRE86IGNoYW5nZSBoYXJkLWNvZGVkIG1pbiByYWRpdXNcblxuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgZm9jdXMgYnViYmxlc1xuICAgICAgICAgICAgICAgIGZvY3VzRG9tLnNlbGVjdEFsbChcIi5idWJibGUtbWFwLWNlbGxcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjeFwiLCAoZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHggPSB0aGlzLnhTY2FsZShkLmRpc3BsYXlYID8gZC5kaXNwbGF5WCA6IGQueCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geCA9PT0gdW5kZWZpbmVkID8gdGhpcy54U2NhbGUuYmFuZHdpZHRoKCkgLyAyIDogeCArIHRoaXMueFNjYWxlLmJhbmR3aWR0aCgpIC8gMjtcblxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAvLyAuYXR0cihcImN5XCIsIChkKT0+dGhpcy55U2NhbGUoZC55KSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJyXCIsIChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgeCA9IHRoaXMueFNjYWxlKGQuZGlzcGxheVggPyBkLmRpc3BsYXlYIDogZC54KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4ID09PSB1bmRlZmluZWQgPyAwIDogdGhpcy5idWJibGVTY2FsZShkLnIpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSBjb2x1bW4gbGFiZWxzXG4gICAgICAgICAgICAgICAgZm9jdXNEb20uc2VsZWN0QWxsKFwiLmJ1YmJsZS1tYXAteGxhYmVsXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgeCA9IHRoaXMueFNjYWxlKGQpICsgNSB8fCAwOyAvLyBUT0RPOiByZW1vdmUgaGFyZC1jb2RlZCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHkgPSB0aGlzLnlTY2FsZS5yYW5nZSgpWzFdICsgY29sdW1uTGFiZWxQb3NBZGp1c3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYHRyYW5zbGF0ZSgke3h9LCAke3l9KSByb3RhdGUoJHtjb2x1bW5MYWJlbEFuZ2xlfSlgO1xuXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgKGQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB4ID0gdGhpcy54U2NhbGUoZCk7IC8vIFRPRE86IHJlbW92ZSBoYXJkLWNvZGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geCA9PT0gdW5kZWZpbmVkID8gXCJub25lXCIgOiBcImJsb2NrXCI7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGxldCBicnVzaCA9IGJydXNoWCgpXG4gICAgICAgICAgICAgICAgLmV4dGVudChbXG4gICAgICAgICAgICAgICAgICAgIFswLCAwXSxcbiAgICAgICAgICAgICAgICAgICAgW2RpbWVuc2lvbnMudywgZGltZW5zaW9ucy5oXVxuICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgICAgLm9uKFwiYnJ1c2hcIiwgYnJ1c2hlZCk7XG4gICAgICAgICAgICBtaW5pRG9tLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiYnJ1c2hcIilcbiAgICAgICAgICAgICAgICAuY2FsbChicnVzaClcbiAgICAgICAgICAgICAgICAvLyAuY2FsbChicnVzaC5tb3ZlLCB0aGlzLnhTY2FsZU1pbmkucmFuZ2UoKSk7XG4gICAgICAgICAgICAgICAgLmNhbGwoYnJ1c2gubW92ZSwgWzAsIHRoaXMueFNjYWxlTWluaS5iYW5kd2lkdGgoKSAqIDUwXSk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGRyYXdTdmcoZG9tLCBkaW1lbnNpb25zPXt3OjEwMDAsIGg6NjAwLCB0b3A6MCwgbGVmdDowfSwgY29sb3JTY2FsZURvbWFpbj11bmRlZmluZWQsIHNob3dMYWJlbHM9dHJ1ZSwgY29sdW1uTGFiZWxBbmdsZT0zMCwgY29sdW1uTGFiZWxQb3NBZGp1c3Q9MCwgYnJ1c2hTaXplPTUwKXtcbiAgICAgICAgdGhpcy5fc2V0U2NhbGVzKGRpbWVuc2lvbnMsIGNvbG9yU2NhbGVEb21haW4sIGJydXNoU2l6ZSk7XG4gICAgICAgIGxldCB0b29sdGlwID0gdGhpcy50b29sdGlwO1xuICAgICAgICAvLyBidWJibGVzXG4gICAgICAgIGxldCBidWJibGVzID0gZG9tLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xpcC1wYXRoXCIsIFwidXJsKCNjbGlwKVwiKTtcblxuICAgICAgICBidWJibGVzLnNlbGVjdEFsbChcIi5idWJibGUtbWFwLWNlbGxcIilcbiAgICAgICAgICAgIC5kYXRhKHRoaXMuZGF0YSwgKGQpPT5kLnZhbHVlKVxuICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgIC5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJidWJibGUtbWFwLWNlbGxcIilcbiAgICAgICAgICAgIC5hdHRyKFwicm93XCIsIChkKT0+IGB4JHt0aGlzLnhTY2FsZS5kb21haW4oKS5pbmRleE9mKGQuZGlzcGxheVg/ZC5kaXNwbGF5WDpkLngpfWApXG4gICAgICAgICAgICAuYXR0cihcImNvbFwiLCAoZCk9PiBgeSR7dGhpcy55U2NhbGUuZG9tYWluKCkuaW5kZXhPZihkLnkpfWApXG4gICAgICAgICAgICAuYXR0cihcImN4XCIsIChkKT0+dGhpcy54U2NhbGUoZC5kaXNwbGF5WD9kLmRpc3BsYXlYOmQueCkgKyB0aGlzLnhTY2FsZS5iYW5kd2lkdGgoKS8yKVxuICAgICAgICAgICAgLmF0dHIoXCJjeVwiLCAoZCk9PnRoaXMueVNjYWxlKGQueSkgKyB0aGlzLnlTY2FsZS5iYW5kd2lkdGgoKS8yKVxuICAgICAgICAgICAgLmF0dHIoXCJyXCIsIChkKT0+dGhpcy5idWJibGVTY2FsZShkLnIpKVxuICAgICAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCAoZCk9PnRoaXMuY29sb3JTY2FsZShkLnZhbHVlKSlcbiAgICAgICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICBsZXQgc2VsZWN0ZWQgPSBzZWxlY3QodGhpcyk7XG4gICAgICAgICAgICAgICAgbGV0IHJvd0NsYXNzID0gc2VsZWN0ZWQuYXR0cihcInJvd1wiKTtcbiAgICAgICAgICAgICAgICBsZXQgY29sQ2xhc3MgPSBzZWxlY3RlZC5hdHRyKFwiY29sXCIpO1xuICAgICAgICAgICAgICAgIGRvbS5zZWxlY3RBbGwoXCIuYnViYmxlLW1hcC14bGFiZWxcIikuZmlsdGVyKGAuJHtyb3dDbGFzc31gKVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZCgnaGlnaGxpZ2h0ZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBkb20uc2VsZWN0QWxsKFwiLmJ1YmJsZS1tYXAteWxhYmVsXCIpLmZpbHRlcihgLiR7Y29sQ2xhc3N9YClcbiAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWQuY2xhc3NlZCgnaGlnaGxpZ2h0ZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBsZXQgZGlzcGxheVZhbHVlID0gZC5kaXNwbGF5VmFsdWUgPT09IHVuZGVmaW5lZD9wYXJzZUZsb2F0KGQudmFsdWUudG9FeHBvbmVudGlhbCgpKS50b1ByZWNpc2lvbig0KTpkLmRpc3BsYXlWYWx1ZTtcbiAgICAgICAgICAgICAgICB0b29sdGlwLnNob3coYENvbHVtbjogJHtkLnh9IDxici8+IFJvdzogJHtkLnl9PGJyLz4gVmFsdWU6ICR7ZGlzcGxheVZhbHVlfWApO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbihcIm1vdXNlb3V0XCIsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgZG9tLnNlbGVjdEFsbChcIipcIikuY2xhc3NlZCgnaGlnaGxpZ2h0ZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgdG9vbHRpcC5oaWRlKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyB0ZXh0IGxhYmVsc1xuICAgICAgICBpZihzaG93TGFiZWxzKSB7XG4gICAgICAgICAgICAvLyBjb2x1bW4gbGFiZWxzXG4gICAgICAgICAgICBsZXQgeExhYmVscyA9IGRvbS5zZWxlY3RBbGwoJy5idWJibGUtbWFwLXhsYWJlbCcpLmRhdGEodGhpcy54U2NhbGUuZG9tYWluKCkpXG4gICAgICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgKGQsIGkpID0+IGBidWJibGUtbWFwLXhsYWJlbCB4JHtpfWApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIDApXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIDApXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgXCJzdGFydFwiKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcImN1cnNvclwiLCBcImRlZmF1bHRcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCAoZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgeCA9IHRoaXMueFNjYWxlKGQpICsgNTsgLy8gVE9ETzogcmVtb3ZlIGhhcmQtY29kZWQgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgbGV0IHkgPSB0aGlzLnlTY2FsZS5yYW5nZSgpWzFdICsgY29sdW1uTGFiZWxQb3NBZGp1c3Q7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgdHJhbnNsYXRlKCR7eH0sICR7eX0pIHJvdGF0ZSgke2NvbHVtbkxhYmVsQW5nbGV9KWA7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAudGV4dCgoZCkgPT4gZCk7XG5cbiAgICAgICAgICAgIC8vIHJvdyBsYWJlbHNcbiAgICAgICAgICAgIGxldCB5TGFiZWxzID0gZG9tLnNlbGVjdEFsbCgnLmJ1YmJsZS1tYXAteWxhYmVsJykuZGF0YSh0aGlzLnlTY2FsZS5kb21haW4oKSlcbiAgICAgICAgICAgICAgICAuZW50ZXIoKS5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCAoZCwgaSkgPT4gYGJ1YmJsZS1tYXAteWxhYmVsIHkke2l9YClcbiAgICAgICAgICAgICAgICAuYXR0cihcInhcIiwgdGhpcy54U2NhbGUucmFuZ2UoKVswXSAtIDEwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCAoZCkgPT4gdGhpcy55U2NhbGUoZCkgKyB0aGlzLnlTY2FsZS5iYW5kd2lkdGgoKS8yICsgMilcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcImVuZFwiKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcImN1cnNvclwiLCBcImRlZmF1bHRcIilcbiAgICAgICAgICAgICAgICAudGV4dCgoZCkgPT4gZCk7XG4gICAgICAgIH1cblxuXG4gICAgfVxuXG4gICAgZHJhd0NvbG9yTGVnZW5kKGRvbSwgbGVnZW5kQ29uZmlnPXt4OjAsIHk6MH0sIHRpY2tzPTUsIHVuaXQ9XCJcIil7XG4gICAgICAgIGRyYXdDb2xvckxlZ2VuZCh1bml0LCBkb20sIHRoaXMuY29sb3JTY2FsZSwgbGVnZW5kQ29uZmlnLCB0aGlzLnVzZUxvZywgdGlja3MsIHRoaXMubG9nQmFzZSwge2g6MTAsIHc6NDB9LCBcImhcIiwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgZHJhd0J1YmJsZUxlZ2VuZChkb20sIGxlZ2VuZENvbmZpZz17eDowLCB5OjAsIHRpdGxlOlwiQnViYmxlIGxlZ2VuZFwifSwgdGlja3M9NSwgdW5pdD1cIlwiKXtcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5idWJibGVTY2FsZS5kb21haW4oKSk7XG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuYnViYmxlU2NhbGUucmFuZ2UoKSk7XG4gICAgICAgIGxldCByYW5nZSA9IFsuLi5BcnJheSh0aWNrcysxKS5rZXlzKCldO1xuICAgICAgICBsZXQgaW50ZXJ2YWwgPSAodGhpcy5idWJibGVTY2FsZS5kb21haW4oKVsxXS10aGlzLmJ1YmJsZVNjYWxlLmRvbWFpbigpWzBdKS90aWNrcztcbiAgICAgICAgbGV0IGRhdGEgPSByYW5nZS5tYXAoKGQpPT50aGlzLmJ1YmJsZVNjYWxlLmRvbWFpbigpWzBdK2QqaW50ZXJ2YWwpOyAvLyBhc3N1bWluZyBkIGlzIHBvc2l0aXZlXG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuXG4gICAgICAgIC8vIGxlZ2VuZCBncm91cHNcbiAgICAgICAgbGV0IGxlZ2VuZHMgPSBkb20uYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoJHtsZWdlbmRDb25maWcueH0sICR7bGVnZW5kQ29uZmlnLnl9KWApXG4gICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5sZWdlbmRcIikuZGF0YShkYXRhKTtcbiAgICAgICAgbGV0IGcgPSBsZWdlbmRzLmVudGVyKCkuYXBwZW5kKFwiZ1wiKS5jbGFzc2VkKFwibGVnZW5kXCIsIHRydWUpO1xuXG4gICAgICAgIC8vIGxlZ2VuZCB0aXRsZVxuICAgICAgICBkb20uYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImNvbG9yLWxlZ2VuZFwiKVxuICAgICAgICAgICAgLnRleHQobGVnZW5kQ29uZmlnLnRpdGxlKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIC0xMClcbiAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJlbmRcIilcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCAxMClcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoJHtsZWdlbmRDb25maWcueH0sICR7bGVnZW5kQ29uZmlnLnl9KWApO1xuXG4gICAgICAgIC8vIHRoZSBidWJibGVzXG4gICAgICAgIGxldCBjZWxsVyA9IHRoaXMueFNjYWxlLmJhbmR3aWR0aCgpKjI7XG4gICAgICAgIGNvbnNvbGUubG9nKGNlbGxXKTtcbiAgICAgICAgZy5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY3hcIiwgKGQsIGkpID0+IGNlbGxXKmkpXG4gICAgICAgICAgICAuYXR0cihcImN5XCIsIDEwKVxuICAgICAgICAgICAgLmF0dHIoXCJyXCIsIChkKT0+dGhpcy5idWJibGVTY2FsZShkKSlcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgXCJibGFja1wiKTtcblxuICAgICAgICBnLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJjb2xvci1sZWdlbmRcIilcbiAgICAgICAgICAgIC50ZXh0KChkKSA9PiB0aGlzLnVzZUxvZz8oTWF0aC5wb3coYmFzZSwgZCkpLnRvUHJlY2lzaW9uKDIpOmQudG9QcmVjaXNpb24oMikpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgKGQsIGkpID0+IGNlbGxXICogaSAtNSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCAwKTtcbiAgICB9XG5cbiAgICAvLyBwcml2YXRlIG1ldGhvZHNcbiAgICBfc2V0TWluaVNjYWxlcyhkaW1lbnNpb25zPXt3OjEwMDAsIGg6NjAwLCB0b3A6MjAsIGxlZnQ6MjB9LCBjRG9tYWluKXtcbiAgICAgICAgaWYgKHRoaXMueFNjYWxlTWluaSA9PT0gdW5kZWZpbmVkKSB0aGlzLnhTY2FsZU1pbmkgPSB0aGlzLl9zZXRYU2NhbGVNaW5pKGRpbWVuc2lvbnMpO1xuICAgICAgICBpZiAodGhpcy55U2NhbGVNaW5pID09PSB1bmRlZmluZWQpIHRoaXMueVNjYWxlTWluaSA9IHRoaXMuX3NldFlTY2FsZU1pbmkoZGltZW5zaW9ucyk7XG4gICAgICAgIGlmICh0aGlzLmNvbG9yU2NhbGUgPT09IHVuZGVmaW5lZCkgdGhpcy5jb2xvclNjYWxlID0gdGhpcy5fc2V0Q29sb3JTY2FsZShjRG9tYWluKTtcbiAgICAgICAgaWYgKHRoaXMuYnViYmxlU2NhbGVNaW5pID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBidWJibGVNYXggPSBtaW4oW3RoaXMueFNjYWxlTWluaS5iYW5kd2lkdGgoKSwgdGhpcy55U2NhbGVNaW5pLmJhbmR3aWR0aCgpXSkvMjsgLy8gdGhlIG1heCBidWJibGUgcmFkaXVzXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhidWJibGVNYXgpXG4gICAgICAgICAgICB0aGlzLmJ1YmJsZVNjYWxlTWluaSA9IHRoaXMuX3NldEJ1YmJsZVNjYWxlKHttYXg6IGJ1YmJsZU1heCwgbWluOjF9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9zZXRTY2FsZXMoZGltZW5zaW9ucz17dzoxMDAwLCBoOjYwMCwgdG9wOjIwLCBsZWZ0OjIwfSwgY0RvbWFpbil7XG4gICAgICAgIGlmICh0aGlzLnhTY2FsZSA9PT0gdW5kZWZpbmVkKSB0aGlzLnhTY2FsZSA9IHRoaXMuX3NldFhTY2FsZShkaW1lbnNpb25zKTtcbiAgICAgICAgaWYgKHRoaXMueVNjYWxlID09PSB1bmRlZmluZWQpIHRoaXMueVNjYWxlID0gdGhpcy5fc2V0WVNjYWxlKGRpbWVuc2lvbnMpO1xuICAgICAgICBpZiAodGhpcy5jb2xvclNjYWxlID09PSB1bmRlZmluZWQpIHRoaXMuY29sb3JTY2FsZSA9IHRoaXMuX3NldENvbG9yU2NhbGUoY0RvbWFpbik7XG4gICAgICAgIGlmICh0aGlzLmJ1YmJsZVNjYWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBidWJibGVNYXggPSBtaW4oW3RoaXMueFNjYWxlLmJhbmR3aWR0aCgpLCB0aGlzLnlTY2FsZS5iYW5kd2lkdGgoKV0pLzI7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhidWJibGVNYXgpXG4gICAgICAgICAgICB0aGlzLmJ1YmJsZVNjYWxlID0gdGhpcy5fc2V0QnViYmxlU2NhbGUoe21heDpidWJibGVNYXgsIG1pbjogMn0pOyAvLyBUT0RPOiBjaGFuZ2UgaGFyZC1jb2RlZCBtaW4gcmFkaXVzXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBfcGFyc2VYTGlzdCgpe1xuICAgICAgICAgbGV0IHhMaXN0ID0gbmVzdCgpXG4gICAgICAgICAgICAua2V5KChkKSA9PiBkLmRpc3BsYXlYIT09dW5kZWZpbmVkP2QuZGlzcGxheVg6ZC54KSAvLyBncm91cCB0aGlzLmRhdGEgYnkgZC54XG4gICAgICAgICAgICAuZW50cmllcyh0aGlzLmRhdGEpXG4gICAgICAgICAgICAubWFwKChkKSA9PiBkLmtleSkgLy8gdGhlbiByZXR1cm4gdGhlIHVuaXF1ZSBsaXN0IG9mIGQueFxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHtyZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IGEgPj0gYiA/IDAgOiBOYU47fSk7XG4gICAgICAgICByZXR1cm4geExpc3Q7XG4gICAgfVxuXG4gICAgX3BhcnNlWUxpc3QoKXtcbiAgICAgICAgbGV0IHlMaXN0ID0gbmVzdCgpXG4gICAgICAgICAgICAua2V5KChkKSA9PiBkLnkpIC8vIGdyb3VwIHRoaXMuZGF0YSBieSBkLnhcbiAgICAgICAgICAgIC5lbnRyaWVzKHRoaXMuZGF0YSlcbiAgICAgICAgICAgIC5tYXAoKGQpID0+IGQua2V5KSAvLyB0aGVuIHJldHVybiB0aGUgdW5pcXVlIGxpc3Qgb2YgZC54XG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4ge3JldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogYSA+PSBiID8gMCA6IE5hTjt9KTtcbiAgICAgICAgcmV0dXJuIHlMaXN0O1xuICAgIH1cblxuICAgIF9zZXRYU2NhbGVNaW5pKGRpbT17dzoxMDAwLCBsZWZ0OjIwfSl7XG4gICAgICAgIGxldCB4TGlzdCA9IHRoaXMuX3BhcnNlWExpc3QoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldFhTY2FsZShkaW0sIHhMaXN0KTtcbiAgICB9XG5cbiAgICBfc2V0WFNjYWxlKGRpbT17dzoxMDAwLCBsZWZ0OjIwfSwgeExpc3QgPSB1bmRlZmluZWQpe1xuICAgICAgICAvLyB1c2UgZDMgbmVzdCBkYXRhIHN0cnVjdHVyZSB0byBmaW5kIHRoZSB1bmlxdWUgbGlzdCBvZiB4IGxhYmVsc1xuICAgICAgICAvLyByZWZlcmVuY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9kMy9kMy1jb2xsZWN0aW9uI25lc3RzXG4gICAgICAgIHhMaXN0ID0geExpc3Q9PT11bmRlZmluZWQ/dGhpcy5fcGFyc2VYTGlzdCgpOnhMaXN0O1xuICAgICAgICByZXR1cm4gc2NhbGVCYW5kKCkgLy8gcmVmZXJlbmNlOiBodHRwczovL2dpdGh1Yi5jb20vZDMvZDMtc2NhbGUjc2NhbGVCYW5kXG4gICAgICAgICAgICAuZG9tYWluKHhMaXN0KSAvLyBwZXJoYXBzIGl0IGlzbid0IG5lY2Vzc2FyeSB0byBzdG9yZSB4TGlzdCwgaXQgY291bGQgYmUgcmV0cmlldmVkIGJ5IHhTY2FsZS5kb21haW5cbiAgICAgICAgICAgIC5yYW5nZShbZGltLmxlZnQsIGRpbS5sZWZ0K2RpbS53XSlcbiAgICAgICAgICAgIC5wYWRkaW5nKC4wNSk7IC8vIHRlbXBvcmFyaWx5IGhhcmQtY29kZWQgdmFsdWVcbiAgICB9XG5cbiAgICBfc2V0WVNjYWxlTWluaShkaW09e2g6NjAwLCB0b3A6MjB9KXtcbiAgICAgICAgLy8gdXNlIGQzIG5lc3QgZGF0YSBzdHJ1Y3R1cmUgdG8gZmluZCB0aGUgdW5pcXVlIGxpc3Qgb2YgeSBsYWJlbHNcbiAgICAgICAgLy8gcmVmZXJlbmNlOiBodHRwczovL2dpdGh1Yi5jb20vZDMvZDMtY29sbGVjdGlvbiNuZXN0c1xuICAgICAgICBsZXQgeUxpc3QgPSB0aGlzLl9wYXJzZVlMaXN0KCk7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZXRZU2NhbGUoZGltLCB5TGlzdCk7XG4gICAgfVxuXG4gICAgX3NldFlTY2FsZShkaW09e2g6NjAwLCB0b3A6MjB9LCB5TGlzdD11bmRlZmluZWQpe1xuICAgICAgICAvLyB1c2UgZDMgbmVzdCBkYXRhIHN0cnVjdHVyZSB0byBmaW5kIHRoZSB1bmlxdWUgbGlzdCBvZiB5IGxhYmVsc1xuICAgICAgICAvLyByZWZlcmVuY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9kMy9kMy1jb2xsZWN0aW9uI25lc3RzXG4gICAgICAgIHlMaXN0ID0geUxpc3Q9PT11bmRlZmluZWQ/dGhpcy5fcGFyc2VZTGlzdCgpOnlMaXN0O1xuICAgICAgICByZXR1cm4gc2NhbGVCYW5kKCkgLy8gcmVmZXJlbmNlOiBodHRwczovL2dpdGh1Yi5jb20vZDMvZDMtc2NhbGUjc2NhbGVCYW5kXG4gICAgICAgICAgICAuZG9tYWluKHlMaXN0KSAvLyBwZXJoYXBzIGl0IGlzbid0IG5lY2Vzc2FyeSB0byBzdG9yZSB4TGlzdCwgaXQgY291bGQgYmUgcmV0cmlldmVkIGJ5IHhTY2FsZS5kb21haW5cbiAgICAgICAgICAgIC5yYW5nZShbZGltLnRvcCwgZGltLnRvcCtkaW0uaF0pXG4gICAgICAgICAgICAucGFkZGluZyguMDUpOyAvLyB0ZW1wb3JhcmlseSBoYXJkLWNvZGVkIHZhbHVlXG4gICAgfVxuXG4gICAgX3NldENvbG9yU2NhbGUoZG9tYWluKXtcbiAgICAgICAgbGV0IHVzZUxvZyA9IHRoaXMudXNlTG9nO1xuICAgICAgICBsZXQgZGF0YSA9IGRvbWFpbj09PXVuZGVmaW5lZD90aGlzLmRhdGEubWFwKChkKT0+dXNlTG9nP3RoaXMuX2xvZyhkLnZhbHVlKTpkLnZhbHVlKTpkb21haW47XG4gICAgICAgIHJldHVybiBzZXRDb2xvclNjYWxlKGRhdGEsIHRoaXMuY29sb3JTY2hlbWUsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICB9XG5cbiAgICAvLyBfc2V0QnViYmxlU2NhbGVNaW5pKHJhbmdlPXttYXg6MTAsIG1pbjowfSl7XG4gICAgLy8gICAgIHJldHVybiB0aGlzLl9zZXRCdWJibGVTY2FsZShyYW5nZSk7XG4gICAgLy8gfVxuXG4gICAgX3NldEJ1YmJsZVNjYWxlKHJhbmdlPXttYXg6MTAsIG1pbjowfSl7XG4gICAgICAgIHJldHVybiBzY2FsZVNxcnQoKVxuICAgICAgICAgICAgLmRvbWFpbihbMywgbWF4KHRoaXMuZGF0YS5tYXAoKGQpPT5kLnIpKV0pIC8vIHNldCBtaW4gYXQgMiBmb3IgLWxvZygwLjAxKVxuICAgICAgICAgICAgLnJhbmdlKFtyYW5nZS5taW4sIHJhbmdlLm1heF0pO1xuICAgIH1cblxuICAgIF9sb2codil7XG4gICAgICAgIGNvbnN0IGFkanVzdCA9IDE7XG4gICAgICAgIHJldHVybiBNYXRoLmxvZyhOdW1iZXIodithZGp1c3QpKS9NYXRoLmxvZyh0aGlzLmxvZ0Jhc2UpO1xuICAgIH1cblxuXG59XG5cbiIsIi8qKlxuICogQ29weXJpZ2h0IMKpIDIwMTUgLSAyMDE4IFRoZSBCcm9hZCBJbnN0aXR1dGUsIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBCU0QgMy1jbGF1c2UgbGljZW5zZSAoaHR0cHM6Ly9naXRodWIuY29tL2Jyb2FkaW5zdGl0dXRlL2d0ZXgtdml6L2Jsb2IvbWFzdGVyL0xJQ0VOU0UubWQpXG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5pbXBvcnQgVG9vbHRpcCBmcm9tIFwiLi9Ub29sdGlwXCI7XG5pbXBvcnQge2RyYXdDb2xvckxlZ2VuZCwgc2V0Q29sb3JTY2FsZX0gZnJvbSBcIi4vY29sb3JzXCI7XG5pbXBvcnQge3NlbGVjdCwgc2VsZWN0QWxsLCBtb3VzZSwgZXZlbnR9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7bmVzdH0gZnJvbSBcImQzLWNvbGxlY3Rpb25cIjtcbmltcG9ydCB7c2NhbGVCYW5kLCBzY2FsZUxpbmVhcn0gZnJvbSBcImQzLXNjYWxlXCI7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSGFsZk1hcHtcbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhIHtPYmplY3R9IFRPRE86IGRlc2NyaWJlIHRoZSBkYXRhIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSBjdXRvZmZcbiAgICAgKiBAcGFyYW0gdXNlTG9nXG4gICAgICogQHBhcmFtIGxvZ0Jhc2VcbiAgICAgKiBAcGFyYW0gY29sb3JTY2hlbWVcbiAgICAgKiBAcGFyYW0gdG9vbHRpcElkXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoZGF0YSwgY3V0b2ZmID0gMC4wLCB1c2VMb2c9dHJ1ZSwgbG9nQmFzZT0xMCwgY29sb3JTY2hlbWU9XCJHcmV5c1wiLCB0b29sdGlwSWQ9XCJ0b29sdGlwXCIpe1xuICAgICAgICB0aGlzLmRhdGE9IGRhdGE7XG4gICAgICAgIHRoaXMuZGF0YURpY3QgPSB7fTtcbiAgICAgICAgdGhpcy5jdXRvZmYgPSBjdXRvZmY7XG4gICAgICAgIHRoaXMudXNlTG9nID0gdXNlTG9nO1xuICAgICAgICB0aGlzLmxvZ0Jhc2UgPSBsb2dCYXNlO1xuICAgICAgICB0aGlzLmNvbG9yU2NoZW1lID0gY29sb3JTY2hlbWU7XG5cbiAgICAgICAgdGhpcy54U2NhbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMueVNjYWxlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmNvbG9yU2NhbGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMubGFiZWxTY2FsZSA9IHVuZGVmaW5lZDtcblxuICAgICAgICAvLyBwZXJpcGhlcmFsIGZlYXR1cmVzXG4gICAgICAgIC8vLy8gdGhlIHRvb2x0aXBcbiAgICAgICAgaWYgKCQoYCMke3Rvb2x0aXBJZH1gKS5sZW5ndGggPT0gMCkgJCgnPGRpdi8+JykuYXR0cignaWQnLCB0b29sdGlwSWQpLmFwcGVuZFRvKCQoJ2JvZHknKSk7XG4gICAgICAgIHRoaXMudG9vbHRpcCA9IG5ldyBUb29sdGlwKHRvb2x0aXBJZCwgZmFsc2UsIDQwLCAwKTtcbiAgICAgICAgc2VsZWN0KGAjJHt0b29sdGlwSWR9YCkuY2xhc3NlZCgnaGFsZi1tYXAtdG9vbHRpcCcsIHRydWUpO1xuICAgIH1cblxuICAgIGRyYXcoY2FudmFzLCBzdmcsIGRpbWVuc2lvbnM9e3c6NjAwLCB0b3A6MjAsIGxlZnQ6MjB9LCBjb2xvclNjYWxlRG9tYWluPVswLDFdLCBzaG93TGFiZWxzPXRydWUsIGxhYmVsQW5nbGU9OTApe1xuICAgICAgICB0aGlzLl9kcmF3Q2FudmFzKGNhbnZhcywgZGltZW5zaW9ucywgY29sb3JTY2FsZURvbWFpbiwgc2hvd0xhYmVscyk7XG4gICAgICAgIGxldCBkcmF3Q2VsbHMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5kcmF3U3ZnKHN2ZywgZGltZW5zaW9ucywgZHJhd0NlbGxzLCBzaG93TGFiZWxzLCBsYWJlbEFuZ2xlKTtcbiAgICB9XG5cbiAgICBkcmF3Q29sb3JMZWdlbmQoZG9tLCBsZWdlbmRDb25maWc9e3g6MCwgeTowfSwgdGlja3M9NSwgdW5pdD1cIlwiKXtcbiAgICAgICAgZHJhd0NvbG9yTGVnZW5kKHVuaXQsIGRvbSwgdGhpcy5jb2xvclNjYWxlLCBsZWdlbmRDb25maWcsIHRoaXMudXNlTG9nLCB0aWNrcywgdGhpcy5sb2dCYXNlLCB7aDoyMCwgdzoxMH0sIFwidlwiKTtcbiAgICB9XG5cbiAgICAvLyBwcml2YXRlIG1ldGhvZHNcbiAgICBfbG9nKHYpe1xuICAgICAgICBjb25zdCBhZGp1c3QgPSAxO1xuICAgICAgICByZXR1cm4gTWF0aC5sb2coTnVtYmVyKHYrYWRqdXN0KSkvTWF0aC5sb2codGhpcy5sb2dCYXNlKTtcbiAgICB9XG4gICAgX2RyYXdDYW52YXMoY2FudmFzLCBkaW1lbnNpb25zPXt3OjYwMCwgdG9wOjIwLCBsZWZ0OjIwfSwgY29sb3JTY2FsZURvbWFpbj1bMCwxXSl7XG4gICAgICAgIHRoaXMuX3NldFNjYWxlcyhkaW1lbnNpb25zLCBjb2xvclNjYWxlRG9tYWluKTtcbiAgICAgICAgbGV0IHZpc2libGVEYXRhID0gdGhpcy5fZmlsdGVyKHRoaXMuZGF0YSwgdGhpcy5jdXRvZmYpO1xuICAgICAgICBsZXQgY29udGV4dCA9IGNhbnZhcy5ub2RlKCkuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgICAvLyB0cmFuc2Zvcm0gdGhlIGNhbnZhc1xuICAgICAgICBjb250ZXh0LnNhdmUoKTtcbiAgICAgICAgY29udGV4dC50cmFuc2xhdGUoZGltZW5zaW9ucy5sZWZ0ICwgZGltZW5zaW9ucy50b3AgKyAodGhpcy54U2NhbGUuYmFuZHdpZHRoKCkqTWF0aC5zcXJ0KDIpLzIpKTsgLy8gc2hpZnQgdGhlIHJhZGl1cyBkaXN0YW5jZS4uLlxuICAgICAgICBjb250ZXh0LnJvdGF0ZShNYXRoLlBJKigtNDUvMTgwKSk7IC8vIHJvdGF0ZSBjb3VudGVyY2xvY2t3aXNlIChuZWdhdGl2ZSkgNDUgZGVncmVlc1xuXG4gICAgICAgIC8vIExEIGNhbnZhcyByZW5kZXJpbmcgZnJvbSBHRVYgb2xkIGNvZGVcbiAgICAgICAgdmlzaWJsZURhdGEuZm9yRWFjaCgoZCk9PntcbiAgICAgICAgICAgIGxldCB4ID0gdGhpcy54U2NhbGUoZC54KTtcbiAgICAgICAgICAgIGxldCB5ID0gdGhpcy55U2NhbGUoZC55KTtcbiAgICAgICAgICAgIGQuY29sb3IgPSBkLnZhbHVlPT0wP1wiI2ZmZlwiOnRoaXMudXNlTG9nP3RoaXMuY29sb3JTY2FsZSh0aGlzLl9sb2coZC52YWx1ZSkpOnRoaXMuY29sb3JTY2FsZShkLnZhbHVlKTtcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gdGhpcy5jb2xvclNjYWxlKGQudmFsdWUpO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZCk7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxSZWN0KHgsIHksIHRoaXMueFNjYWxlLmJhbmR3aWR0aCgpLCB0aGlzLnlTY2FsZS5iYW5kd2lkdGgoKSk7XG4gICAgICAgICAgICAvLyB1bmNvbW1lbnQgdGhlIGZvbGxvd2luZyBmb3IgZGVidWdnaW5nXG4gICAgICAgICAgICAvLyBjb250ZXh0LnRleHRBbGlnbiA9ICdsZWZ0JztcbiAgICAgICAgICAgIC8vIGNvbnRleHQuZmlsbFN0eWxlID0gJ3doaXRlJztcbiAgICAgICAgICAgIC8vIGNvbnRleHQuZm9udCA9ICcxMHB4IE9wZW4gU2Fucyc7XG4gICAgICAgICAgICAvLyBjb250ZXh0LmZpbGxUZXh0KGQueCsnICcrZC55LCB4KzEwLCB5KzEwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZGF0YURpY3QgPSB0aGlzLl9nZW5lcmF0ZURhdGFEaWN0KHZpc2libGVEYXRhKTtcbiAgICAgICAgY29udGV4dC5yZXN0b3JlKCk7XG4gICAgfVxuXG4gICAgZHJhd1N2ZyhzdmcsIGRpbWVuc2lvbnMsIGRyYXdDZWxscz10cnVlLCBzaG93TGFiZWxzPXRydWUsIGxhYmVsQW5nbGU9OTAsIGNvbG9yU2NhbGVEb21haW49WzAsMV0pe1xuICAgICAgICBpZiAoZHJhd0NlbGxzKXtcbiAgICAgICAgICAgIHRoaXMuX3NldFNjYWxlcyhkaW1lbnNpb25zLCBjb2xvclNjYWxlRG9tYWluKTtcbiAgICAgICAgICAgIGxldCBtYXBHID0gc3ZnLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNsaXAtcGF0aFwiLCBcInVybCgjY2xpcClcIik7XG4gICAgICAgICAgICBsZXQgY2VsbHMgPSBtYXBHLnNlbGVjdEFsbChcIi5oYWxmLW1hcC1jZWxsXCIpXG4gICAgICAgICAgICAgICAgLmRhdGEodGhpcy5fZmlsdGVyKHRoaXMuZGF0YSwgdGhpcy5jdXRvZmYpKTtcblxuICAgICAgICAgICAgLy8gYWRkIG5ldyByZWN0c1xuICAgICAgICAgICAgY2VsbHMuZW50ZXIoKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImhhbGYtbWFwLWNlbGxcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInJvd1wiLCAoZCk9PmB5JHt0aGlzLnlTY2FsZS5kb21haW4oKS5pbmRleE9mKGQueSl9YClcbiAgICAgICAgICAgICAgICAuYXR0cihcImNvbHVtblwiLCAoZCk9PmB4JHt0aGlzLnhTY2FsZS5kb21haW4oKS5pbmRleE9mKGQueCl9YClcbiAgICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHRoaXMueFNjYWxlLmJhbmR3aWR0aCgpKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRoaXMueVNjYWxlLmJhbmR3aWR0aCgpKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieFwiLCAoZCk9PnRoaXMueFNjYWxlKGQueCkpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIChkKT0+dGhpcy55U2NhbGUoZC55KSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBgcm90YXRlKC00NSlgKVxuICAgICAgICAgICAgICAgIC5tZXJnZShjZWxscylcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIChkKT0+ZC52YWx1ZT09MD9cIiNmZmZcIjp0aGlzLnVzZUxvZz90aGlzLmNvbG9yU2NhbGUodGhpcy5fbG9nKGQudmFsdWUpKTp0aGlzLmNvbG9yU2NhbGUoZC52YWx1ZSkpXG5cblxuICAgICAgICB9XG5cbiAgICAgICAgaWYoc2hvd0xhYmVscyl7XG4gICAgICAgICAgICB0aGlzLl9zZXRMYWJlbFNjYWxlKGRpbWVuc2lvbnMpO1xuICAgICAgICAgICAgc3ZnLnNlbGVjdEFsbCgpLmRhdGEodGhpcy5sYWJlbFNjYWxlLmRvbWFpbigpKVxuICAgICAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIChkLCBpKSA9PiBgaGFsZi1tYXAtbGFiZWwgbCR7aX1gKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieFwiLCAwKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCAwKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwic3RhcnRcIilcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJjdXJzb3JcIiwgXCJub25lXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgKGQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHggPSB0aGlzLmxhYmVsU2NhbGUoZCkgKyB0aGlzLmxhYmVsU2NhbGUuc3RlcCgpLzI7XG4gICAgICAgICAgICAgICAgICAgIGxldCB5ID0gLTU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgdHJhbnNsYXRlKCR7eH0sICR7eX0pIHJvdGF0ZSgtJHtsYWJlbEFuZ2xlfSlgO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnRleHQoKGQpPT5kKVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGN1cnNvciA9IHN2Zy5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2hhbGYtbWFwLWN1cnNvcicpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgMClcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCAwKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB0aGlzLnhTY2FsZS5iYW5kd2lkdGgoKSlcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRoaXMueVNjYWxlLmJhbmR3aWR0aCgpKVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIFwiI2QyMTExYlwiKVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDEpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIFwibm9uZVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLCAnbm9uZScpO1xuICAgICAgICBzdmcub24oJ21vdXNlb3V0JywgKCk9PntcbiAgICAgICAgICAgIGN1cnNvci5zdHlsZShcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuICAgICAgICAgICAgdGhpcy50b29sdGlwLmhpZGUoKTtcbiAgICAgICAgICAgIHN2Zy5zZWxlY3RBbGwoJy5oYWxmLW1hcC1sYWJlbCcpLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2VsZWN0KHN2Zy5ub2RlKCkucGFyZW50Tm9kZSlcbiAgICAgICAgICAgIC8vIC5zdHlsZShcImN1cnNvclwiLCBcIm5vbmVcIilcbiAgICAgICAgICAgIC5vbignbW91c2Vtb3ZlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBwb3MgPSBtb3VzZShzdmcubm9kZSgpKTsgLy8gcmV0cmlldmUgdGhlIG1vdXNlIHBvc2l0aW9uIHJlbGF0aXZlIHRvIHRoZSBTVkcgZWxlbWVudFxuICAgICAgICAgICAgICAgIGxldCB4ID0gcG9zWzBdO1xuICAgICAgICAgICAgICAgIGxldCB5ID0gcG9zWzFdO1xuXG4gICAgICAgICAgICAgICAgLy8gZmluZCB0aGUgY29sbGlkaW5nIGNlbGwncyBjb29yZGluYXRlcyAoYmVmb3JlIHRyYW5zZm9ybWF0aW9uKVxuICAgICAgICAgICAgICAgIGxldCByYWRpYW4gPSBNYXRoLlBJKig0NS8xODApOyAvLyB0aGUgcmFkaWFuIGF0IDQ1IGRlZ3JlZSBhbmdsZVxuICAgICAgICAgICAgICAgIGxldCB4MiA9IHgqTWF0aC5jb3MocmFkaWFuKSAtIHkqTWF0aC5zaW4ocmFkaWFuKSArIHRoaXMueFNjYWxlLnN0ZXAoKS8yO1xuICAgICAgICAgICAgICAgIGxldCB5MiA9IHgqTWF0aC5zaW4ocmFkaWFuKSArIHkqTWF0aC5jb3MocmFkaWFuKSAtIHRoaXMueVNjYWxlLnN0ZXAoKS8yO1xuICAgICAgICAgICAgICAgIGlmICh4IDwgMCB8fCB5PDAgfHwgeDIgPCAwIHx8IHkyPDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b29sdGlwLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnN0eWxlKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGkgPSBNYXRoLmZsb29yKHgyL3RoaXMueFNjYWxlLnN0ZXAoKSk7XG4gICAgICAgICAgICAgICAgbGV0IGogPSBNYXRoLmZsb29yKCh5MikvdGhpcy55U2NhbGUuc3RlcCgpKTtcbiAgICAgICAgICAgICAgICAvLyBzaG93IHRvb2x0aXBcbiAgICAgICAgICAgICAgICBsZXQgY29sID0gdGhpcy54U2NhbGUuZG9tYWluKClbaV07XG4gICAgICAgICAgICAgICAgbGV0IHJvdyA9IHRoaXMueVNjYWxlLmRvbWFpbigpW2pdO1xuICAgICAgICAgICAgICAgIGxldCBjZWxsID0gdGhpcy5kYXRhRGljdFtjb2wrcm93XTtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhbeCwgeSwgeDIsIHkyLCBjb2wsIHJvd10pIC8vIGRlYnVnZ2luZ1xuICAgICAgICAgICAgICAgIGlmIChjZWxsICE9PSB1bmRlZmluZWQpIHtcblxuICAgICAgICAgICAgICAgICAgICBjdXJzb3IuYXR0cigndHJhbnNmb3JtJywgYHRyYW5zbGF0ZSgke3h9LCR7eX0pIHJvdGF0ZSgtNDUpYCk7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5zdHlsZShcImRpc3BsYXlcIiwgXCJibG9ja1wiKTtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvb2x0aXAuc2hvdyhgJHtjb2x9PGJyLz4gJHtyb3d9PGJyLz4gVmFsdWU6ICR7Y2VsbC5kaXNwbGF5VmFsdWV9YCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKHNob3dMYWJlbHMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnNlbGVjdEFsbCgnLmhhbGYtbWFwLWxhYmVsJykuY2xhc3NlZCgnaGlnaGxpZ2h0ZWQnLCBmYWxzZSk7IC8vIGNsZWFyIHByZXZpb3VzIGhpZ2hsaWdodGVkIGxhYmVsc1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLnNlbGVjdChgLmwke2l9YCkuY2xhc3NlZCgnaGlnaGxpZ2h0ZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5zZWxlY3QoYC5sJHtqfWApLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdtb3VzZW91dCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICBjdXJzb3Iuc3R5bGUoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2x0aXAuaGlkZSgpO1xuICAgICAgICAgICAgICAgIHN2Zy5zZWxlY3RBbGwoJy5oYWxmLW1hcC1sYWJlbCcpLmNsYXNzZWQoJ2hpZ2hsaWdodGVkJywgZmFsc2UpO1xuICAgICAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaWx0ZXIgcmVkdW5kYW50IGRhdGEgaW4gYSBzeW1tZXRyaWNhbCBtYXRyaXhcbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEBwYXJhbSBjdXRvZmYge051bWJlcn0gZmlsdGVyIGRhdGEgYnkgdGhpcyBtaW5pbXVtIHZhbHVlXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZmlsdGVyKGRhdGEsIGN1dG9mZil7XG4gICAgICAgIGxldCBwYWlycyA9IHt9O1xuICAgICAgICAvLyAvLyBmaXJzdCBzb3J0IHRoZSBkYXRhIGJhc2VkIG9uIHRoZSB4LCB5IGFscGhhYmV0aWNhbCBvcmRlclxuICAgICAgICBkYXRhLnNvcnQoKGEsIGIpPT57XG4gICAgICAgICAgICBpZihhLnggPCBiLngpIHJldHVybiAtMTtcbiAgICAgICAgICAgIGlmIChhLnggPiBiLngpIHJldHVybiAxO1xuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGEueSA8IGIueSkgcmV0dXJuIC0xO1xuICAgICAgICAgICAgICAgIGlmIChhLnkgPiBiLnkpIHJldHVybiAxO1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGRhdGEuZmlsdGVyKChkKT0+e1xuICAgICAgICAgICAgLy8gY2hlY2sgcmVkdW5kYW50IGRhdGFcbiAgICAgICAgICAgIGxldCBwID0gZC54ICsgZC55O1xuICAgICAgICAgICAgbGV0IHAyID0gZC55ICsgZC54O1xuICAgICAgICAgICAgaWYgKHBhaXJzLmhhc093blByb3BlcnR5KHApIHx8IHBhaXJzLmhhc093blByb3BlcnR5KHAyKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgcGFpcnNbcF0gPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGQudmFsdWUgPCBjdXRvZmYpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIGlmICh0aGlzLnhTY2FsZShkLngpID09PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTsgLy8gZmlsdGVyIHRoZSBkYXRhIHRoYXQgYXJlIG5vdCBnb2luZyB0byBiZSByZW5kZXJlZFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGEgZGF0YSBkaWN0aW9uYXJ5IGluZGV4ZWQgYnkgeCBhbmQgeSwgZm9yIGZhc3QgZGF0YSBsb29rIHVwXG4gICAgICogQHBhcmFtIGRhdGEge0xpc3R9OiBhIGxpc3Qgb2Ygb2JqZWN0cyB3aXRoIGF0dHJpYnV0ZXMgeCBhbmQgeVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dlbmVyYXRlRGF0YURpY3QoZGF0YSl7XG4gICAgICAgIGxldCBkaWN0ID0ge307XG4gICAgICAgIGRhdGEuZm9yRWFjaCgoZCk9PntcbiAgICAgICAgICAgIGRpY3RbZC54K2QueV0gPSBkO1xuICAgICAgICAgICAgZGljdFtkLnkrZC54XSA9IGQ7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGljdDtcbiAgICB9XG5cbiAgICBfc2V0U2NhbGVzKGRpbWVuc2lvbnM9e3c6NjAwLCB0b3A6MjAsIGxlZnQ6MjB9LCBjb2xvclNjYWxlRG9tYWluPVswLDFdKXtcbiAgICAgICAgaWYgKHRoaXMueFNjYWxlID09PSB1bmRlZmluZWQpIHRoaXMuX3NldFhTY2FsZShkaW1lbnNpb25zKTtcbiAgICAgICAgaWYgKHRoaXMueVNjYWxlID09PSB1bmRlZmluZWQpIHRoaXMuX3NldFlTY2FsZShkaW1lbnNpb25zKTtcbiAgICAgICAgaWYgKHRoaXMuY29sb3JTY2FsZSA9PT0gdW5kZWZpbmVkKSB0aGlzLl9zZXRDb2xvclNjYWxlKGNvbG9yU2NhbGVEb21haW4pO1xuICAgIH1cblxuICAgIF9zZXRYU2NhbGUoZGltPXt3OjYwMH0pe1xuICAgICAgICBsZXQgeExpc3QgPSBuZXN0KClcbiAgICAgICAgICAgIC5rZXkoKGQpID0+IGQuZGlzcGxheVghPT11bmRlZmluZWQ/ZC5kaXNwbGF5WDpkLngpIC8vIGdyb3VwIHRoaXMuZGF0YSBieSBkLnhcbiAgICAgICAgICAgIC5lbnRyaWVzKHRoaXMuZGF0YSlcbiAgICAgICAgICAgIC5tYXAoKGQpID0+IGQua2V5KSAvLyB0aGVuIHJldHVybiB0aGUgdW5pcXVlIGxpc3Qgb2YgZC54XG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4ge3JldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogYSA+PSBiID8gMCA6IE5hTjt9KTtcbiAgICAgICAgdGhpcy54U2NhbGUgPSBzY2FsZUJhbmQoKSAvLyByZWZlcmVuY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9kMy9kMy1zY2FsZSNzY2FsZUJhbmRcbiAgICAgICAgICAgIC5kb21haW4oeExpc3QpIC8vIHBlcmhhcHMgaXQgaXNuJ3QgbmVjZXNzYXJ5IHRvIHN0b3JlIHhMaXN0LCBpdCBjb3VsZCBiZSByZXRyaWV2ZWQgYnkgeFNjYWxlLmRvbWFpblxuICAgICAgICAgICAgLy8gLnJhbmdlKFtkaW0ubGVmdCwgZGltLmxlZnQrKGRpbS53L01hdGguc3FydCgyKSldKVxuICAgICAgICAgICAgLnJhbmdlKFswLCBkaW0udy9NYXRoLnNxcnQoMildKVxuICAgICAgICAgICAgLnBhZGRpbmcoLjA1KTsgLy8gdGVtcG9yYXJpbHkgaGFyZC1jb2RlZCB2YWx1ZVxuICAgIH1cblxuICAgIF9zZXRZU2NhbGUoZGltPXt3OjYwMH0pe1xuICAgICAgICAvLyB1c2UgZDMgbmVzdCBkYXRhIHN0cnVjdHVyZSB0byBmaW5kIHRoZSB1bmlxdWUgbGlzdCBvZiB5IGxhYmVsc1xuICAgICAgICAvLyByZWZlcmVuY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9kMy9kMy1jb2xsZWN0aW9uI25lc3RzXG4gICAgICAgIGxldCB5TGlzdCA9IG5lc3QoKVxuICAgICAgICAgICAgLmtleSgoZCkgPT4gZC55KSAvLyBncm91cCB0aGlzLmRhdGEgYnkgZC54XG4gICAgICAgICAgICAuZW50cmllcyh0aGlzLmRhdGEpXG4gICAgICAgICAgICAubWFwKChkKSA9PiBkLmtleSkgLy8gdGhlbiByZXR1cm4gdGhlIHVuaXF1ZSBsaXN0IG9mIGQueFxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHtyZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IGEgPj0gYiA/IDAgOiBOYU47fSk7XG4gICAgICAgIHRoaXMueVNjYWxlID0gc2NhbGVCYW5kKCkgLy8gcmVmZXJlbmNlOiBodHRwczovL2dpdGh1Yi5jb20vZDMvZDMtc2NhbGUjc2NhbGVCYW5kXG4gICAgICAgICAgICAuZG9tYWluKHlMaXN0KSAvLyBwZXJoYXBzIGl0IGlzbid0IG5lY2Vzc2FyeSB0byBzdG9yZSB4TGlzdCwgaXQgY291bGQgYmUgcmV0cmlldmVkIGJ5IHhTY2FsZS5kb21haW5cbiAgICAgICAgICAgIC8vIC5yYW5nZShbZGltLnRvcCwgZGltLnRvcCsoZGltLncvTWF0aC5zcXJ0KDIpKV0pXG4gICAgICAgICAgICAucmFuZ2UoWzAsIGRpbS53L01hdGguc3FydCgyKV0pXG4gICAgICAgICAgICAucGFkZGluZyguMDUpOyAvLyB0ZW1wb3JhcmlseSBoYXJkLWNvZGVkIHZhbHVlXG4gICAgfVxuXG4gICAgX3NldExhYmVsU2NhbGUoZGltPXt3OjYwMH0pe1xuICAgICAgICBpZiAodGhpcy54U2NhbGUgPT09IHVuZGVmaW5lZCkgdGhpcy5fc2V0WFNjYWxlKCk7XG4gICAgICAgIGxldCB4TGlzdCA9IHRoaXMueFNjYWxlLmRvbWFpbigpO1xuICAgICAgICB0aGlzLmxhYmVsU2NhbGUgPSBzY2FsZUJhbmQoKVxuICAgICAgICAgICAgLmRvbWFpbih4TGlzdClcbiAgICAgICAgICAgIC5yYW5nZShbMCwgZGltLnddKVxuICAgICAgICAgICAgLnBhZGRpbmcoLjA1KVxuICAgIH1cblxuICAgIF9zZXRDb2xvclNjYWxlKGRvbWFpbil7XG4gICAgICAgIGxldCB1c2VMb2cgPSB0aGlzLnVzZUxvZztcbiAgICAgICAgbGV0IGRhdGEgPSBkb21haW49PT11bmRlZmluZWQ/dGhpcy5kYXRhLm1hcCgoZCk9PnVzZUxvZz90aGlzLl9sb2coZC52YWx1ZSk6ZC52YWx1ZSk6ZG9tYWluO1xuICAgICAgICB0aGlzLmNvbG9yU2NhbGUgPSBzZXRDb2xvclNjYWxlKGRhdGEsIHRoaXMuY29sb3JTY2hlbWUpO1xuICAgIH1cbn0iLCIvKipcbiAqIENvcHlyaWdodCDCqSAyMDE1IC0gMjAxOCBUaGUgQnJvYWQgSW5zdGl0dXRlLCBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQlNEIDMtY2xhdXNlIGxpY2Vuc2UgKGh0dHBzOi8vZ2l0aHViLmNvbS9icm9hZGluc3RpdHV0ZS9ndGV4LXZpei9ibG9iL21hc3Rlci9MSUNFTlNFLm1kKVxuICovXG5cInVzZSBzdHJpY3RcIjtcbmltcG9ydCB7anNvbn0gZnJvbSBcImQzLWZldGNoXCI7XG5pbXBvcnQge2JydXNoWH0gZnJvbSBcImQzLWJydXNoXCI7XG5pbXBvcnQge3NlbGVjdCwgc2VsZWN0QWxsLCBldmVudH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHtleHRlbnQsIG1heCwgbWlufSBmcm9tIFwiZDMtYXJyYXlcIjtcblxuaW1wb3J0IHtjaGVja0RvbUlkfSBmcm9tIFwiLi9tb2R1bGVzL3V0aWxzXCI7XG5pbXBvcnQge1xuICAgIGdldEd0ZXhVcmxzLFxuICAgIHBhcnNlR2VuZXMsXG4gICAgcGFyc2VTaW5nbGVUaXNzdWVFcXRscyxcbiAgICBwYXJzZUxEXG59IGZyb20gXCIuL21vZHVsZXMvZ3RleERhdGFQYXJzZXJcIjtcbmltcG9ydCBCdWJibGVNYXAgZnJvbSBcIi4vbW9kdWxlcy9CdWJibGVNYXBcIjtcbmltcG9ydCBIYWxmTWFwIGZyb20gXCIuL21vZHVsZXMvSGFsZk1hcFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyKHN2Z1BhciwgZ2VuZUlkLCByb290RGl2SWQsIHNwaW5uZXJJZCwgdXJscyA9IGdldEd0ZXhVcmxzKCkpe1xuICAgIGNvbnNvbGUubG9nKGdlbmVJZCk7XG4gICAganNvbih1cmxzLmdlbmVJZCArIGdlbmVJZCkgLy8gcXVlcnkgdGhlIGdlbmUgYnkgZ2VuZUlkIHdoaWNoIGNvdWxkIGJlIGdlbmUgbmFtZSBvciBnZW5jb2RlIElEIHdpdGggb3Igd2l0aG91ciB2ZXJzaW9uaW5nXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgbGV0IGdlbmUgPSBwYXJzZUdlbmVzKGRhdGEsIHRydWUsIGdlbmVJZCk7IC8vIGZldGNoIHRoZSBnZW5lIGJ5IHVzZXIgc3BlY2lmaWVkIGdlbmUgSURcbiAgICAgICAgICAgIGpzb24odXJscy5zaW5nbGVUaXNzdWVFcXRsICsgZ2VuZS5nZW5jb2RlSWQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YTIpe1xuICAgICAgICAgICAgICAgICAgICBsZXQgZXF0bHMgPSBwYXJzZVNpbmdsZVRpc3N1ZUVxdGxzKGRhdGEyKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FudmFzUGFyLmRhdGEgPSBlcXRscztcbiAgICAgICAgICAgICAgICAgICAgc3ZnUGFyLmRhdGEgPSBlcXRscztcbiAgICAgICAgICAgICAgICAgICAganNvbih1cmxzLmxkICsgZ2VuZS5nZW5jb2RlSWQpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsZCA9IHBhcnNlTEQoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdmdQYXIubGREYXRhID0gbGQuZmlsdGVyKChkKT0+ZC52YWx1ZT49c3ZnUGFyLmxkQ3V0b2ZmKTsgLy8gZmlsdGVyIHVudXNlZCBkYXRhXG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJCdWJibGVNYXAoc3ZnUGFyLCBnZW5lLCB1cmxzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyMnICsgc3Bpbm5lcklkKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbn1cblxuZnVuY3Rpb24gc2V0RGltZW5zaW9ucyhwYXIpe1xuICAgIHBhci5tYXJnaW4gPSB7XG4gICAgICAgIGxlZnQ6IHBhci5tYXJnaW5MZWZ0ICsgcGFyLmZvY3VzUGFuZWxSb3dMYWJlbFdpZHRoLFxuICAgICAgICB0b3A6IHBhci5tYXJnaW5Ub3AsXG4gICAgICAgIHJpZ2h0OiBwYXIubWFyZ2luUmlnaHQsXG4gICAgICAgIGJvdHRvbTogcGFyLm1hcmdpbkJvdHRvbSArIHBhci5mb2N1c1BhbmVsQ29sdW1uTGFiZWxIZWlnaHRcbiAgICB9O1xuICAgIHBhci5pbldpZHRoID0gcGFyLndpZHRoIC0gKHBhci5tYXJnaW4ubGVmdCArIHBhci5tYXJnaW4ucmlnaHQpO1xuICAgIHBhci5pbkhlaWdodCA9IHBhci5oZWlnaHQgLSAocGFyLm1hcmdpbi50b3AgKyBwYXIubWFyZ2luLmJvdHRvbSk7XG4gICAgcGFyLmZvY3VzUGFuZWxIZWlnaHQgPSBwYXIuaW5IZWlnaHQgLSAocGFyLmxlZ2VuZEhlaWdodCArIHBhci5taW5pUGFuZWxIZWlnaHQgKyBwYXIud2lkdGgpO1xuICAgIGlmIChwYXIuZm9jdXNQYW5lbEhlaWdodCA8IDApIHRocm93IFwiQ29uZmlnIGVycm9yOiBmb2N1cyBwYW5lbCBoZWlnaHQgaXMgbmVnYXRpdmUuXCI7XG4gICAgcGFyLmZvY3VzUGFuZWxNYXJnaW4gPSB7XG4gICAgICAgIGxlZnQ6IHBhci5tYXJnaW4ubGVmdCxcbiAgICAgICAgdG9wOiBwYXIubWFyZ2luLnRvcCArIHBhci5taW5pUGFuZWxIZWlnaHQgKyBwYXIubGVnZW5kSGVpZ2h0XG4gICAgfTtcbiAgICBwYXIubGRQYW5lbE1hcmdpbiA9IHtcbiAgICAgICAgbGVmdDogcGFyLm1hcmdpbi5sZWZ0LFxuICAgICAgICB0b3A6IHBhci5mb2N1c1BhbmVsTWFyZ2luLnRvcCArIHBhci5mb2N1c1BhbmVsSGVpZ2h0ICsgcGFyLmZvY3VzUGFuZWxDb2x1bW5MYWJlbEhlaWdodCArIDgwXG4gICAgfTtcbiAgICByZXR1cm4gcGFyO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVTdmcocm9vdElkLCB3aWR0aCwgaGVpZ2h0LCBtYXJnaW4sIHN2Z0lkPXVuZGVmaW5lZCl7XG4gICAgY2hlY2tEb21JZChyb290SWQpO1xuICAgIGlmIChzdmdJZD09PXVuZGVmaW5lZCkgc3ZnSWQ9YCR7cm9vdElkfS1zdmdgO1xuICAgIGxldCBzdmcgPSBzZWxlY3QoXCIjXCIrcm9vdElkKS5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgICAgICAuYXR0cihcImlkXCIsIHN2Z0lkKTtcblxuICAgIHN2Zy5hcHBlbmQoXCJkZWZzXCIpLmFwcGVuZChcImNsaXBQYXRoXCIpXG4gICAgICAgIC5hdHRyKFwiaWRcIiwgXCJjbGlwXCIpXG4gICAgICAgIC5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCk7XG5cbiAgICByZXR1cm4gc3ZnO1xufVxuXG4vKipcbiAqIFJlbmRlciB0aGUgYnViYmxlIGhlYXRtYXBcbiAqIEBwYXJhbSBwYXIge09iamVjdH0gY29uZmlndXJlIHRoZSB2aXN1YWxpemF0aW9uc1xuICogVE9ETzogY2hlY2sgcmVxdWlyZWQgYXR0cmlidXRlcyBpbiBwYXJcbiAqIEBwYXJhbSBnZW5lIHtPYmplY3R9IGNvbnRhaW5pbmcgYXR0cjogZ2VuY29kZUlkXG4gKiBAcmV0dXJucyB7QnViYmxlTWFwfVxuICovXG5mdW5jdGlvbiByZW5kZXJCdWJibGVNYXAocGFyLCBnZW5lLCB1cmxzKXtcbiAgICBwYXIgPSBzZXREaW1lbnNpb25zKHBhcik7XG5cbiAgICBsZXQgYm1hcCA9IG5ldyBCdWJibGVNYXAocGFyLmRhdGEsIHBhci51c2VMb2csIHBhci5sb2dCYXNlLCBwYXIuY29sb3JTY2hlbWUsIHBhci5pZCtcIi10b29sdGlwXCIpO1xuICAgIGxldCBsZE1hcCA9IG5ldyBIYWxmTWFwKHBhci5sZERhdGEsIHBhci5sZEN1dG9mZiwgZmFsc2UsIHVuZGVmaW5lZCwgcGFyLmxkQ29sb3JTY2hlbWUsIHBhci5pZCtcIi10b29sdGlwXCIpO1xuXG4gICAgbGV0IHN2ZyA9IGNyZWF0ZVN2ZyhwYXIuaWQsIHBhci53aWR0aCwgcGFyLmhlaWdodCwgcGFyLm1hcmdpbiwgdW5kZWZpbmVkKTtcblxuICAgIGxldCBtaW5pRyA9IHN2Zy5hcHBlbmQoXCJnXCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJjb250ZXh0XCIpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoJHtwYXIubWFyZ2luLmxlZnR9LCAke3Bhci5tYXJnaW4udG9wfSlgKTtcblxuICAgIGxldCBmb2N1c0cgPSBzdmcuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiZm9jdXNcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgke3Bhci5mb2N1c1BhbmVsTWFyZ2luLmxlZnR9LCAke3Bhci5mb2N1c1BhbmVsTWFyZ2luLnRvcH0pYCk7XG5cbiAgICBsZXQgbGRDYW52YXMgPSBzZWxlY3QoYCMke3Bhci5pZH1gKS5hcHBlbmQoXCJjYW52YXNcIilcbiAgICAgICAgLmF0dHIoXCJpZFwiLCBwYXIuaWQgKyBcIi1sZC1jYW52YXNcIilcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBwYXIuaW5XaWR0aClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgcGFyLmluV2lkdGgpXG4gICAgICAgIC8vIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoJHtwYXIubGRQYW5lbE1hcmdpbi5sZWZ0fSwgJHtwYXIubGRQYW5lbE1hcmdpbi50b3B9KWApO1xuXG4gICAgbGV0IGxkRyA9IHN2Zy5hcHBlbmQoXCJnXCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsZFwiKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBgdHJhbnNsYXRlKCR7cGFyLmxkUGFuZWxNYXJnaW4ubGVmdH0sICR7cGFyLmxkUGFuZWxNYXJnaW4udG9wfSlgKTtcblxuICAgIGJtYXAuZHJhd0NvbWJvKFxuICAgICAgICBtaW5pRyxcbiAgICAgICAgZm9jdXNHLFxuICAgICAgICB7dzpwYXIuaW5XaWR0aCwgaDpwYXIubWluaVBhbmVsSGVpZ2h0LCB0b3A6NSwgbGVmdDowLCBoMjogcGFyLmZvY3VzUGFuZWxIZWlnaHR9LFxuICAgICAgICBwYXIuY29sb3JTY2FsZURvbWFpbixcbiAgICAgICAgcGFyLnNob3dMYWJlbHMsXG4gICAgICAgIHBhci5mb2N1c1BhbmVsQ29sdW1uTGFiZWxBbmdsZSxcbiAgICAgICAgcGFyLmZvY3VzUGFuZWxDb2x1bW5MYWJlbEFkanVzdCxcbiAgICAgICAgZmFsc2UpO1xuXG4gICAgLy8gYWRkIGN1c3RvbWVkIGJydXNoXG4gICAgbGV0IGJydXNoID0gYnJ1c2hYKClcbiAgICAgICAgLmV4dGVudChbXG4gICAgICAgICAgICBbMCwwXSxcbiAgICAgICAgICAgIFtwYXIuaW5XaWR0aCwgcGFyLm1pbmlQYW5lbEhlaWdodF1cbiAgICAgICAgXSlcbiAgICAgICAgLm9uKFwiYnJ1c2hcIiwgKCk9PntcbiAgICAgICAgICAgIGxldCBzZWxlY3Rpb24gPSBldmVudC5zZWxlY3Rpb247XG4gICAgICAgICAgICBsZXQgYnJ1c2hMZWZ0ID0gTWF0aC5yb3VuZChzZWxlY3Rpb25bMF0gLyBibWFwLnhTY2FsZU1pbmkuc3RlcCgpKTtcbiAgICAgICAgICAgIGxldCBicnVzaFJpZ2h0ID0gTWF0aC5yb3VuZChzZWxlY3Rpb25bMV0gLyBibWFwLnhTY2FsZU1pbmkuc3RlcCgpKTtcblxuICAgICAgICAgICAgYm1hcC54U2NhbGUuZG9tYWluKGJtYXAueFNjYWxlTWluaS5kb21haW4oKS5zbGljZShicnVzaExlZnQsIGJydXNoUmlnaHQpKTsgLy8gcmVzZXQgdGhlIHhTY2FsZSBkb21haW5cbiAgICAgICAgICAgIGxldCBidWJibGVNYXggPSBtaW4oW2JtYXAueFNjYWxlLmJhbmR3aWR0aCgpLCBibWFwLnlTY2FsZS5iYW5kd2lkdGgoKV0pIC8gMjtcbiAgICAgICAgICAgIGJtYXAuYnViYmxlU2NhbGUucmFuZ2UoWzIsIGJ1YmJsZU1heF0pOyAvLyBUT0RPOiBjaGFuZ2UgaGFyZC1jb2RlZCBtaW4gcmFkaXVzXG5cbiAgICAgICAgICAgIGxkTWFwLnhTY2FsZSA9IGJtYXAueFNjYWxlO1xuICAgICAgICAgICAgbGRNYXAueVNjYWxlID0gYm1hcC54U2NhbGU7XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgZm9jdXMgYnViYmxlc1xuICAgICAgICAgICAgZm9jdXNHLnNlbGVjdEFsbChcIi5idWJibGUtbWFwLWNlbGxcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImN4XCIsIChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB4ID0gYm1hcC54U2NhbGUoZC5kaXNwbGF5WCA/IGQuZGlzcGxheVggOiBkLngpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geCA9PT0gdW5kZWZpbmVkID8gYm1hcC54U2NhbGUuYmFuZHdpZHRoKCkgLyAyIDogeCArIGJtYXAueFNjYWxlLmJhbmR3aWR0aCgpIC8gMjtcblxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJyXCIsIChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB4ID0gYm1hcC54U2NhbGUoZC5kaXNwbGF5WCA/IGQuZGlzcGxheVggOiBkLngpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geCA9PT0gdW5kZWZpbmVkID8gMCA6IGJtYXAuYnViYmxlU2NhbGUoZC5yKVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyB1cGRhdGUgdGhlIGNvbHVtbiBsYWJlbHNcbiAgICAgICAgICAgIGZvY3VzRy5zZWxlY3RBbGwoXCIuYnViYmxlLW1hcC14bGFiZWxcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCAoZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgeCA9IGJtYXAueFNjYWxlKGQpICsgNSB8fCAwOyAvLyBUT0RPOiByZW1vdmUgaGFyZC1jb2RlZCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBsZXQgeSA9IGJtYXAueVNjYWxlLnJhbmdlKClbMV0gKyBwYXIuZm9jdXNQYW5lbENvbHVtbkxhYmVsQWRqdXN0O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYHRyYW5zbGF0ZSgke3h9LCAke3l9KSByb3RhdGUoJHtwYXIuZm9jdXNQYW5lbENvbHVtbkxhYmVsQW5nbGV9KWA7XG5cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgKGQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHggPSBibWFwLnhTY2FsZShkKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHggPT09IHVuZGVmaW5lZCA/IFwibm9uZVwiIDogXCJibG9ja1wiO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgLy8gcmVuZGVyIHRoZSBMRFxuICAgICAgICAgICAgc2VsZWN0KGAjJHtwYXIuaWR9LWxkLWNhbnZhc2ApLnJlbW92ZSgpO1xuICAgICAgICAgICAgbGV0IGxkQ2FudmFzID0gc2VsZWN0KGAjJHtwYXIuaWR9YCkuYXBwZW5kKFwiY2FudmFzXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJpZFwiLCBwYXIuaWQgKyBcIi1sZC1jYW52YXNcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHBhci5pbldpZHRoKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHBhci5pbldpZHRoKTtcbiAgICAgICAgICAgIGxkRy5zZWxlY3RBbGwoXCIqXCIpLnJlbW92ZSgpOyAvLyBjbGVhciBhbGwgY2hpbGQgbm9kZXMgaW4gbGRHIGJlZm9yZSByZW5kZXJpbmdcbiAgICAgICAgICAgIC8vIGxkTWFwLmRyYXdTdmcobGRHLCB7dzpwYXIuaW5XaWR0aCwgdG9wOjIwLCBsZWZ0OjB9LCB0cnVlLCBmYWxzZSk7XG4gICAgICAgICAgICBsZE1hcC5kcmF3KGxkQ2FudmFzLCBsZEcsIHt3OnBhci5pbldpZHRoLCB0b3A6MjAsIGxlZnQ6MH0sIFswLDFdLCBmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgIG1pbmlHLmFwcGVuZChcImdcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImJydXNoXCIpXG4gICAgICAgIC5jYWxsKGJydXNoKVxuICAgICAgICAuY2FsbChicnVzaC5tb3ZlLCBbMCwgYm1hcC54U2NhbGVNaW5pLmJhbmR3aWR0aCgpKjUwXSk7XG5cbiAgICAvLyBsZXQgbGRNYXAgPSBuZXcgSGFsZk1hcChsZENvbmZpZy5kYXRhLCBsZENvbmZpZy5jdXRvZmYsIGxkQ29uZmlnLnVzZUxvZywgbGRDb25maWcubG9nQmFzZSwgbGRDb25maWcuY29sb3JTY2hlbWUsIGxkQ29uZmlnLmlkK1wiLXRvb2x0aXBcIik7XG4gICAgLy8gbGRNYXAuZHJhd1N2ZyhsZEcsIHt3OiBwYXIuaW5XaWR0aCwgdG9wOjIwLCBsZWZ0OiAwfSwgdHJ1ZSwgZmFsc2UsIHVuZGVmaW5lZCk7XG5cblxuXG5cbiAgICAvLyBibWFwLmRyYXdDb2xvckxlZ2VuZChzdmcsIHt4OiAwLCB5OiAtMzB9LCAzLCBcIk5FU1wiKTtcbiAgICAvLyBibWFwLmRyYXdCdWJibGVMZWdlbmQoc3ZnLCB7eDogNTAwLCB5Oi0zMCwgdGl0bGU6IFwiLWxvZzEwKHAtdmFsdWUpXCJ9LCA1LCBcIi1sb2cxMChwLXZhbHVlKVwiKTtcblxuICAgIHJldHVybiBibWFwO1xuXG59Il0sIm5hbWVzIjpbImNzdiIsImRzdiIsInRzdiIsImVtcHR5IiwibWF0Y2hlciIsInNlbGVjdGlvbiIsImVsZW1lbnQiLCJwYXJzZVR5cGVuYW1lcyIsImNvbnN0YW50IiwiY29sb3IiLCJyZ2IiLCJjb2xvclJnYiIsImJhc2lzIiwidmFsdWUiLCJudW1iZXIiLCJzdHJpbmciLCJjdWJlaGVsaXgiLCJodWUiLCJjb2xvckN1YmVoZWxpeCIsImNyZWF0ZSIsImdldCIsInNldCIsInRpbWVvdXQiLCJzY2hlZHVsZSIsImludGVycG9sYXRlTnVtYmVyIiwiYXR0clJlbW92ZSIsImF0dHJSZW1vdmVOUyIsImF0dHJDb25zdGFudCIsImludGVycG9sYXRlIiwiYXR0ckNvbnN0YW50TlMiLCJhdHRyRnVuY3Rpb24iLCJhdHRyRnVuY3Rpb25OUyIsImludGVycG9sYXRlVHJhbnNmb3JtIiwidHJhbnNpdGlvbiIsIlNlbGVjdGlvbiIsInN0eWxlUmVtb3ZlIiwic3R5bGUiLCJzdHlsZUNvbnN0YW50Iiwic3R5bGVGdW5jdGlvbiIsInRleHRDb25zdGFudCIsInRleHRGdW5jdGlvbiIsImVhc2VDdWJpY0luT3V0Iiwibm9wcm9wYWdhdGlvbiIsImJydXNoIiwibm9ldmVudCIsImRyYWdEaXNhYmxlIiwiZHJhZ0VuYWJsZSIsImFzY2VuZGluZyIsIm1hcCIsImFycmF5Iiwic2xpY2UiLCJyYW5nZSIsImJpc2VjdCIsImlkZW50aXR5IiwiZXhwb25lbnQiLCJyYWlzZSIsInQwIiwidDEiLCJpbnRlcnZhbCIsImR1cmF0aW9uU2Vjb25kIiwiZHVyYXRpb25NaW51dGUiLCJkdXJhdGlvbkhvdXIiLCJkdXJhdGlvbkRheSIsImR1cmF0aW9uV2VlayIsImZvcm1hdExvY2FsZSIsImRheSIsInRpbWVNb25kYXkiLCJ0aW1lRGF5IiwidGltZVllYXIiLCJ0aW1lU3VuZGF5IiwidGltZVRodXJzZGF5IiwibG9jYWxlIiwiZGVmYXVsdExvY2FsZSIsImludGVycG9sYXRlUmdiQmFzaXMiLCJzY2hlbWUiLCJpbnRlcnBvbGF0ZUN1YmVoZWxpeExvbmciLCJjIiwicmFtcCIsImQzQ2hyb21hdGljLmludGVycG9sYXRlQnVHbiIsImQzQ2hyb21hdGljLmludGVycG9sYXRlT3JSZCIsImQzQ2hyb21hdGljLmludGVycG9sYXRlUHVCdSIsImQzQ2hyb21hdGljLmludGVycG9sYXRlWWxHbkJ1IiwiZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVCbHVlcyIsImQzQ2hyb21hdGljLmludGVycG9sYXRlT3JhbmdlcyIsImQzQ2hyb21hdGljLmludGVycG9sYXRlR3JlZW5zIiwiZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVQdXJwbGVzIiwiZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVSZWRzIiwiZDNDaHJvbWF0aWMuaW50ZXJwb2xhdGVHcmV5cyIsImQzQ2hyb21hdGljLmludGVycG9sYXRlUmRCdSIsImQzQ2hyb21hdGljLmludGVycG9sYXRlUmRHeSIsImQzQ2hyb21hdGljLmludGVycG9sYXRlUGlZRyIsImQzQ2hyb21hdGljLmludGVycG9sYXRlUHVPciIsImQzQ2hyb21hdGljLmludGVycG9sYXRlUmRZbEJ1Iiwic2NhbGVTZXF1ZW50aWFsIiwic2NhbGVCYW5kIiwic2NhbGVTcXJ0Il0sIm1hcHBpbmdzIjoiOzs7QUFBQSxJQUFJLEdBQUcsR0FBRyxFQUFFO0lBQ1IsR0FBRyxHQUFHLEVBQUU7SUFDUixLQUFLLEdBQUcsRUFBRTtJQUNWLE9BQU8sR0FBRyxFQUFFO0lBQ1osTUFBTSxHQUFHLEVBQUUsQ0FBQzs7QUFFaEIsU0FBUyxlQUFlLENBQUMsT0FBTyxFQUFFO0VBQ2hDLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFFLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsRUFBRTtJQUNsRSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7R0FDaEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztDQUNyQjs7QUFFRCxTQUFTLGVBQWUsQ0FBQyxPQUFPLEVBQUUs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QUFFLFdBQVc7SUFDbkIsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0dBQ3hCO0NBQ0YsQ0FBQyxDQUFDOztBQUVILEFBQWUsU0FBUyxLQUFLLENBQUMsTUFBTSxFQUFFO0VBQ3BDLElBQUksQ0FBQyxDQUFDO0VBQ04sTUFBTSxHQUFHLENBQUMsTUFBTSxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztFQUM1QyxPQUFPLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlKLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUQsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDbEcsQ0FBQyxDQUFDLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9ELENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEQsTUFBTSxLQUFLLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDO0NBQ1o7O0FBRUQsU0FBUyxJQUFJLENBQUMsQ0FBQyxFQUFFO0VBQ2YsT0FBTyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQzVEOztBQUVELFNBQVMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO0VBQzVCLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDNUI7O0FBRUQsQUFBTyxTQUFTLFVBQVUsQ0FBQyxDQUFDLEVBQUU7RUFDNUIsSUFBSSxFQUFFLENBQUMsWUFBWSxLQUFLLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3hDLElBQUksQ0FBQyxDQUFDLEVBQUUsT0FBTyxJQUFJLEdBQUcsQ0FBQztFQUN2QixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0VBQ1osT0FBTyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDMUM7O0FBRUQsQUFBTyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUU7RUFDcEMsT0FBTyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7Q0FDakc7O0FBRUQsQUFBTyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUU7RUFDcEMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUNaLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDWixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ1osSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQztDQUN6Qjs7QUFFRCxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFO0VBQzdCLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtJQUNwQixDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakQsT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDbEU7RUFDRCxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUU7SUFDbEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdDLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ2xFO0VBQ0QsR0FBRyxFQUFFLFdBQVc7SUFDZCxPQUFPLElBQUksQ0FBQztHQUNiO0VBQ0QsV0FBVyxFQUFFLFdBQVc7SUFDdEIsT0FBTyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRztZQUM1QixDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQztZQUM3QixDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQztZQUM3QixDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0dBQ2pEO0VBQ0QsR0FBRyxFQUFFLFdBQVc7SUFDZCxPQUFPLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUN0RDtFQUNELFFBQVEsRUFBRSxXQUFXO0lBQ25CLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sR0FBRyxPQUFPO1VBQzVCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSTtVQUMxRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUk7VUFDMUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7V0FDbEQsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztHQUN4QztDQUNGLENBQUMsQ0FBQyxDQUFDOztBQUVKLFNBQVMsR0FBRyxDQUFDLEtBQUssRUFBRTtFQUNsQixLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzNELE9BQU8sQ0FBQyxLQUFLLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztDQUNyRDs7QUFFRCxTQUFTLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztPQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztP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QUFDLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMzQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUc7TUFDYixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHO01BQ2IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRztNQUNiLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEtBQUssR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO01BQ3JELEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQztNQUNWLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO01BQzlCLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO01BQ2xELENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsT0FBTyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUM7RUFDcEQsT0FBTyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0NBQzVEOztBQUVELEFBQWUsU0FBUyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFO0VBQ2xELE9BQU8sU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxT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RyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUU7SUFDeEUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0dBQy9CLENBQUM7Q0FDSDs7QUFFRCxBQUFPLFNBQVMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDeEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUNkLE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBR0MsVUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Q0FDNUc7O0FBRUQsQUFBTyxTQUFTLEtBQUssQ0FBQyxDQUFDLEVBQUU7RUFDdkIsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsT0FBTyxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtJQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUdBLFVBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0dBQ2xFLENBQUM7Q0FDSDs7QUFFRCxBQUFlLFNBQVMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDcEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUNkLE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUdBLFVBQVEsQ0FBQyxLQUFL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R0FBRyxDQUFDOztFQUVsQixJQUFJLE9BQU8sTUFBTSxLQUFLLFVBQVUsRUFBRSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDOztFQUU1RCxLQUFLLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRTtJQUM5RixLQUFLLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO01BQ3RILElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFO1FBQy9FLElBQUksVUFBVSxJQUFJLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDekQsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztRQUN0QixRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRUEsS0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO09BQzdEO0tBQ0Y7R0FDRjs7RUFFRCxPQUFPLElBQUksVUFBVSxDQUFDLFNBQVMsRUFB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LElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDcEIsU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUM7O0lBRXRDLElBQUksU0FBUyxFQUFFO01BQ2IsS0FBSyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUM7V0FDeEIsS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUM7V0FDdEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7V0FDMUIsSUFBSSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7V0FDMUIsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1dBQ2hELElBQUksQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztNQUV2RCxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztXQUNyQixLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQztXQUN0QixJQUFJLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7V0FDMUksSUFBSSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsRUFBRSxF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QUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7VUFDbkYsSUFBSSxLQUFLLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztVQUNuRixNQUFNO1NBQ1A7UUFDRCxLQUFLLFdBQVcsRUFBRTtVQUNoQixJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO2VBQzdFLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7VUFDdkYsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQztl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SSxJQUFJLEtBQUssSUFBSSxLQUFLLEdBQUcsSUFBSSxLQUFLLEtBQUssR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLElBQUksRUFBRSxJQUFJLEdBQUcsR0FBRyxFQUFFLEtBQUssR0FBRyxHQUFHLENBQUM7Ozs7SUFJbEYsSUFBSSxNQUFNLEdBQUcsTUFBTSxLQUFLLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUM3RyxNQUFNLEdBQUcsTUFBTSxLQUFLLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLEdBQUcsRUFBRSxDQUFDOzs7OztJQUs3RSxJQUFJLFVBQVUsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO1FBQzlCLFdBQVcsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzs7Ozs7SUFNMUMsU0FBUyxHQUFHLFNBQVMsSUFBSSxJQUFJLEdBQUcsQ0FBQztVQUMzQixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1VBQzFELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7O0lBRTNDLFNBQVMsTUFBTSxDQUFDLEtBQUssRUFBRTtNQUNyQixJQUFJLFdBQVcsR0FBRyxNQUFNO1VBQ3BCLFdBQVcsR0FBRyxNQUFNO1VBQ3BCLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDOztNQUVaLElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRTtRQUNoQixXQUFXLEdB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QUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDcEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztDQUMzQixFQUFFLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtFQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztDQUM3QyxFQUFFLFNBQVMsS0FBSyxFQUFFLEdBQUcsRUFBRTtFQUN0QixPQUFPLEdBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7Q0FDaEQsRUFBRSxTQUFTLElBQUksRUFBRTtFQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztDQUMzQixDQUFDLENBQUM7OztBQUdILElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEVBQUU7RUFDdkIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBR0EsV0FBUSxDQUFDLFNBQVMsSUFBSSxFQUFFO0lBQy9FLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDekQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUMzQixFQUFFLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFD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Q0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsT0FBTyxJQUFJLENBQUM7R0FDYjtFQUNELE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ3BEOztBQUVELFNBQVMsT0FBTyxDQUFDLENBQUMsRUFBRTtFQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFO0lBQ3pCLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pCLE9BQU8sSUFBSSxDQUFDO0dBQ2I7RUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENB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ekIsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekMsTUFBTTtVQUNMLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFQSxNQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1VBQ2xELElBQUksR0FBR0EsTUFBRyxHQUFHLENBQUMsSUFBSUEsTUFBRyxLQUFLLENBQUMsR0FBR0MsTUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBR0EsTUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1VBQ3ZFLElBQUksR0FBR0MsR0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztVQUMzQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztVQUN6QixDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztVQUN0QixDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN0QztPQUNGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7UUFDL0IsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdERixNQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxD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TUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQztDQUNoRDs7QUFFRCxTQUFTLHFCQUFxQixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO0VBQzNDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQztDQUNoRDs7QUFFRCxTQUFTLGtCQUFrQixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO0VBQ3hDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQztDQUNoRDs7QUFFRCxTQUFTLHFCQUFxQixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO0VBQzNDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVB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TSxFQUFFLENBQUMsRUFBRTtFQUNsQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzlDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDaEQ7O0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtFQUN2QyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzlDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDaEQ7O0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtFQUN2QyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzlDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDbEU7O0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUs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T0FBTyxLQUFLLENBQUM7Q0FDaEI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJELEFBQU8sU0FBUyxlQUFlLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDO0lBQ3RJLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQzs7SUFFZCxHQUFHLFNBQVMsQ0FBQztRQUNULElBQUksS0FBSyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDdkMsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN2QyxJQUFJLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxSTtRQUNHO1FBQ0EsSUFBSSxLQUFLLEdBQUcsQ0FBQyxH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LEdBQUcsQ0FBQyxlQUFlLENBQUM7U0FDckMsQ0FBQztTQUNELEVBQUUsQ0FBQyxPQUFPLEVBQUUsSUFBSTtZQUNiLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUM7WUFDaEMsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xFLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQzs7WUFFbkUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDMUUsSUFBSSxTQUFTLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQzs7WUFFdkMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQzNCLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQzs7O1lBRzNCLE1BQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUM7aUJBQy9CLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUs7b0JBQ2YsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxD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
