var EqtlDashboard = (function (exports) {
  'use strict';

  var EOL = {},
      EOF = {},
      QUOTE = 34,
      NEWLINE = 10,
      RETURN = 13;

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

  function dsv(delimiter) {
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
  }

  var csv = dsv(",");

  var tsv = dsv("\t");

  function responseJson(response) {
    if (!response.ok) throw new Error(response.status + " " + response.statusText);
    return response.json();
  }

  function json(input, init) {
    return fetch(input, init).then(responseJson);
  }

  var xhtml = "http://www.w3.org/1999/xhtml";

  var namespaces = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  function namespace(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
  }

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

  function creator(name) {
    var fullname = namespace(name);
    return (fullname.local
        ? creatorFixed
        : creatorInherit)(fullname);
  }

  function none() {}

  function selector(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  function selection_select(select) {
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
  }

  function empty() {
    return [];
  }

  function selectorAll(selector) {
    return selector == null ? empty : function() {
      return this.querySelectorAll(selector);
    };
  }

  function selection_selectAll(select) {
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
  }

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

  function selection_filter(match) {
    if (typeof match !== "function") match = matcher$1(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function sparse(update) {
    return new Array(update.length);
  }

  function selection_enter() {
    return new Selection(this._enter || this._groups.map(sparse), this._parents);
  }

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

  function constant(x) {
    return function() {
      return x;
    };
  }

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

  function selection_data(value, key) {
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
  }

  function selection_exit() {
    return new Selection(this._exit || this._groups.map(sparse), this._parents);
  }

  function selection_merge(selection$$1) {

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
  }

  function selection_order() {

    for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
        if (node = group[i]) {
          if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }

    return this;
  }

  function selection_sort(compare) {
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
  }

  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function selection_call() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  function selection_nodes() {
    var nodes = new Array(this.size()), i = -1;
    this.each(function() { nodes[++i] = this; });
    return nodes;
  }

  function selection_node() {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }

    return null;
  }

  function selection_size() {
    var size = 0;
    this.each(function() { ++size; });
    return size;
  }

  function selection_empty() {
    return !this.node();
  }

  function selection_each(callback) {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }

    return this;
  }

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

  function selection_attr(name, value) {
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
  }

  function defaultView(node) {
    return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
        || (node.document && node) // node is a Window
        || node.defaultView; // node is a Document
  }

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

  function selection_style(name, value, priority) {
    return arguments.length > 1
        ? this.each((value == null
              ? styleRemove : typeof value === "function"
              ? styleFunction
              : styleConstant)(name, value, priority == null ? "" : priority))
        : styleValue(this.node(), name);
  }

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

  function selection_property(name, value) {
    return arguments.length > 1
        ? this.each((value == null
            ? propertyRemove : typeof value === "function"
            ? propertyFunction
            : propertyConstant)(name, value))
        : this.node()[name];
  }

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

  function selection_classed(name, value) {
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
  }

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

  function selection_text(value) {
    return arguments.length
        ? this.each(value == null
            ? textRemove : (typeof value === "function"
            ? textFunction
            : textConstant)(value))
        : this.node().textContent;
  }

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

  function selection_html(value) {
    return arguments.length
        ? this.each(value == null
            ? htmlRemove : (typeof value === "function"
            ? htmlFunction
            : htmlConstant)(value))
        : this.node().innerHTML;
  }

  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }

  function selection_raise() {
    return this.each(raise);
  }

  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }

  function selection_lower() {
    return this.each(lower);
  }

  function selection_append(name) {
    var create = typeof name === "function" ? name : creator(name);
    return this.select(function() {
      return this.appendChild(create.apply(this, arguments));
    });
  }

  function constantNull() {
    return null;
  }

  function selection_insert(name, before) {
    var create = typeof name === "function" ? name : creator(name),
        select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
    return this.select(function() {
      return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }

  function selection_remove() {
    return this.each(remove);
  }

  function selection_cloneShallow() {
    return this.parentNode.insertBefore(this.cloneNode(false), this.nextSibling);
  }

  function selection_cloneDeep() {
    return this.parentNode.insertBefore(this.cloneNode(true), this.nextSibling);
  }

  function selection_clone(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  function selection_datum(value) {
    return arguments.length
        ? this.property("__data__", value)
        : this.node().__data__;
  }

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

  function selection_on(typename, value, capture) {
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
  }

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

  function selection_dispatch(type, params) {
    return this.each((typeof params === "function"
        ? dispatchFunction
        : dispatchConstant)(type, params));
  }

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

  function select(selector) {
    return typeof selector === "string"
        ? new Selection([[document.querySelector(selector)]], [document.documentElement])
        : new Selection([[selector]], root);
  }

  function sourceEvent() {
    var current = event, source;
    while (source = current.sourceEvent) current = source;
    return current;
  }

  function point(node, event) {
    var svg = node.ownerSVGElement || node;

    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      point.x = event.clientX, point.y = event.clientY;
      point = point.matrixTransform(node.getScreenCTM().inverse());
      return [point.x, point.y];
    }

    var rect = node.getBoundingClientRect();
    return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
  }

  function mouse(node) {
    var event = sourceEvent();
    if (event.changedTouches) event = event.changedTouches[0];
    return point(node, event);
  }

  function ascending$1(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function bisector(compare) {
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
  }

  function ascendingComparator(f) {
    return function(d, x) {
      return ascending$1(f(d), x);
    };
  }

  var ascendingBisect = bisector(ascending$1);
  var bisectRight = ascendingBisect.right;

  function number(x) {
    return x === null ? NaN : +x;
  }

  function variance(values, valueof) {
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
  }

  function deviation(array, f) {
    var v = variance(array, f);
    return v ? Math.sqrt(v) : v;
  }

  function extent(values, valueof) {
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
  }

  function sequence(start, stop, step) {
    start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

    var i = -1,
        n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
        range = new Array(n);

    while (++i < n) {
      range[i] = start + i * step;
    }

    return range;
  }

  var e10 = Math.sqrt(50),
      e5 = Math.sqrt(10),
      e2 = Math.sqrt(2);

  function ticks(start, stop, count) {
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
  }

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

  function threshold(values, p, valueof) {
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
  }

  function max(values, valueof) {
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
  }

  function mean(values, valueof) {
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
  }

  function median(values, valueof) {
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

    return threshold(numbers.sort(ascending$1), 0.5);
  }

  function min(values, valueof) {
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

  function nest() {
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
  }

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

  function Set() {}

  var proto = map$1.prototype;

  Set.prototype = set.prototype = {
    constructor: Set,
    has: proto.has,
    add: function(value) {
      value += "";
      this[prefix + value] = value;
      return this;
    },
    remove: proto.remove,
    clear: proto.clear,
    values: proto.keys,
    size: proto.size,
    empty: proto.empty,
    each: proto.each
  };

  function set(object, f) {
    var set = new Set;

    // Copy constructor.
    if (object instanceof Set) object.each(function(value) { set.add(value); });

    // Otherwise, assume it’s an array.
    else if (object) {
      var i = -1, n = object.length;
      if (f == null) while (++i < n) set.add(object[i]);
      else while (++i < n) set.add(f(object[i], i, object));
    }

    return set;
  }

  var array$1 = Array.prototype;

  var map$2 = array$1.map;
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

  function define(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }

  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition) prototype[key] = definition[key];
    return prototype;
  }

  function Color() {}

  var darker = 0.7;
  var brighter = 1 / darker;

  var reI = "\\s*([+-]?\\d+)\\s*",
      reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
      reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
      reHex3 = /^#([0-9a-f]{3})$/,
      reHex6 = /^#([0-9a-f]{6})$/,
      reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
      reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
      reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
      reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
      reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
      reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

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

  // https://beta.observablehq.com/@mbostock/lab-and-rgb
  var K = 18,
      Xn = 0.96422,
      Yn = 1,
      Zn = 0.82521,
      t0 = 4 / 29,
      t1 = 6 / 29,
      t2 = 3 * t1 * t1,
      t3 = t1 * t1 * t1;

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

  var A = -0.14861,
      B = +1.78277,
      C = -0.29227,
      D = -0.90649,
      E = +1.97294,
      ED = E * D,
      EB = E * B,
      BC_DA = B * C - D * A;

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

  function constant$2(x) {
    return function() {
      return x;
    };
  }

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

  function array$2(a, b) {
    var nb = b ? b.length : 0,
        na = a ? Math.min(nb, a.length) : 0,
        x = new Array(na),
        c = new Array(nb),
        i;

    for (i = 0; i < na; ++i) x[i] = value(a[i], b[i]);
    for (; i < nb; ++i) c[i] = b[i];

    return function(t) {
      for (i = 0; i < na; ++i) c[i] = x[i](t);
      return c;
    };
  }

  function date(a, b) {
    var d = new Date;
    return a = +a, b -= a, function(t) {
      return d.setTime(a + b * t), d;
    };
  }

  function interpolateNumber(a, b) {
    return a = +a, b -= a, function(t) {
      return a + b * t;
    };
  }

  function object(a, b) {
    var i = {},
        c = {},
        k;

    if (a === null || typeof a !== "object") a = {};
    if (b === null || typeof b !== "object") b = {};

    for (k in b) {
      if (k in a) {
        i[k] = value(a[k], b[k]);
      } else {
        c[k] = b[k];
      }
    }

    return function(t) {
      for (k in i) c[k] = i[k](t);
      return c;
    };
  }

  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
      reB = new RegExp(reA.source, "g");

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

  function interpolateString(a, b) {
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
  }

  function value(a, b) {
    var t = typeof b, c;
    return b == null || t === "boolean" ? constant$2(b)
        : (t === "number" ? interpolateNumber
        : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
        : b instanceof color ? interpolateRgb
        : b instanceof Date ? date
        : Array.isArray(b) ? array$2
        : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
        : interpolateNumber)(a, b);
  }

  function interpolateRound(a, b) {
    return a = +a, b -= a, function(t) {
      return Math.round(a + b * t);
    };
  }

  var degrees = 180 / Math.PI;

  var identity$1 = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };

  function decompose(a, b, c, d, e, f) {
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
  }

  var cssNode,
      cssRoot,
      cssView,
      svgNode;

  function parseCss(value) {
    if (value === "none") return identity$1;
    if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
    cssNode.style.transform = value;
    value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
    cssRoot.removeChild(cssNode);
    value = value.slice(7, -1).split(",");
    return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
  }

  function parseSvg(value) {
    if (value == null) return identity$1;
    if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgNode.setAttribute("transform", value);
    if (!(value = svgNode.transform.baseVal.consolidate())) return identity$1;
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

  var rho = Math.SQRT2;

  function constant$3(x) {
    return function() {
      return x;
    };
  }

  function number$1(x) {
    return +x;
  }

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
        interpolate$$1 = value,
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
      return arguments.length ? (domain = map$2.call(_, number$1), rescale()) : domain.slice();
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
  function formatDecimal(x, p) {
    if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
    var i, coefficient = x.slice(0, i);

    // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
    // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
    return [
      coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
      +x.slice(i + 1)
    ];
  }

  function exponent(x) {
    return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
  }

  function formatGroup(grouping, thousands) {
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
  }

  function formatNumerals(numerals) {
    return function(value) {
      return value.replace(/[0-9]/g, function(i) {
        return numerals[+i];
      });
    };
  }

  function formatDefault(x, p) {
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
  }

  var prefixExponent;

  function formatPrefixAuto(x, p) {
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
  }

  function formatRounded(x, p) {
    var d = formatDecimal(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1];
    return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
        : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
        : coefficient + new Array(exponent - coefficient.length + 2).join("0");
  }

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

  function identity$2(x) {
    return x;
  }

  var prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

  function formatLocale(locale) {
    var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : identity$2,
        currency = locale.currency,
        decimal = locale.decimal,
        numerals = locale.numerals ? formatNumerals(locale.numerals) : identity$2,
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
  }

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

  function precisionFixed(step) {
    return Math.max(0, -exponent(Math.abs(step)));
  }

  function precisionPrefix(step, value) {
    return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
  }

  function precisionRound(step, max) {
    step = Math.abs(step), max = Math.abs(max) - step;
    return Math.max(0, exponent(max) - exponent(step)) + 1;
  }

  function tickFormat(domain, count, specifier) {
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
  }

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

  function linear$1() {
    var scale = continuous(deinterpolateLinear, interpolateNumber);

    scale.copy = function() {
      return copy(scale, linear$1());
    };

    return linearish(scale);
  }

  var t0$1 = new Date,
      t1$1 = new Date;

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

  var durationSecond = 1e3;
  var durationMinute = 6e4;
  var durationHour = 36e5;
  var durationDay = 864e5;
  var durationWeek = 6048e5;

  var second = newInterval(function(date) {
    date.setTime(Math.floor(date / durationSecond) * durationSecond);
  }, function(date, step) {
    date.setTime(+date + step * durationSecond);
  }, function(start, end) {
    return (end - start) / durationSecond;
  }, function(date) {
    return date.getUTCSeconds();
  });

  var minute = newInterval(function(date) {
    date.setTime(Math.floor(date / durationMinute) * durationMinute);
  }, function(date, step) {
    date.setTime(+date + step * durationMinute);
  }, function(start, end) {
    return (end - start) / durationMinute;
  }, function(date) {
    return date.getMinutes();
  });

  var hour = newInterval(function(date) {
    var offset = date.getTimezoneOffset() * durationMinute % durationHour;
    if (offset < 0) offset += durationHour;
    date.setTime(Math.floor((+date - offset) / durationHour) * durationHour + offset);
  }, function(date, step) {
    date.setTime(+date + step * durationHour);
  }, function(start, end) {
    return (end - start) / durationHour;
  }, function(date) {
    return date.getHours();
  });

  var day = newInterval(function(date) {
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setDate(date.getDate() + step);
  }, function(start, end) {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay;
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
      return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
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
    date.setTime(+date + step * durationMinute);
  }, function(start, end) {
    return (end - start) / durationMinute;
  }, function(date) {
    return date.getUTCMinutes();
  });

  var utcHour = newInterval(function(date) {
    date.setUTCMinutes(0, 0, 0);
  }, function(date, step) {
    date.setTime(+date + step * durationHour);
  }, function(start, end) {
    return (end - start) / durationHour;
  }, function(date) {
    return date.getUTCHours();
  });

  var utcDay = newInterval(function(date) {
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCDate(date.getUTCDate() + step);
  }, function(start, end) {
    return (end - start) / durationDay;
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
      return (end - start) / durationWeek;
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

  var pads = {"-": "", "_": " ", "0": "0"},
      numberRe = /^\s*\d+/, // note: ignores next directive
      percentRe = /^%/,
      requoteRe = /[\\^$*+?|[\]().{}]/g;

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
  var timeFormat;
  var timeParse;
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
    timeFormat = locale$1.format;
    timeParse = locale$1.parse;
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

  var pi = Math.PI,
      tau = 2 * pi,
      epsilon = 1e-6,
      tauEpsilon = tau - epsilon;

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
      else if (!(l01_2 > epsilon)) ;

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

  function constant$4(x) {
    return function constant() {
      return x;
    };
  }

  var pi$1 = Math.PI;

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

  function curveLinear(context) {
    return new Linear(context);
  }

  function x(p) {
    return p[0];
  }

  function y(p) {
    return p[1];
  }

  function line() {
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
  }

  function area() {
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
  }

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

  function identity$5(x) {
    return x;
  }

  var top = 1,
      right = 2,
      bottom = 3,
      left = 4,
      epsilon$2 = 1e-6;

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
        if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
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

  function set$1(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop$1, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }
    if (callback != null) type.push({name: name, value: callback});
    return type;
  }

  function noevent() {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function nodrag(view) {
    var root = view.document.documentElement,
        selection$$1 = select(view).on("dragstart.drag", noevent, true);
    if ("onselectstart" in root) {
      selection$$1.on("selectstart.drag", noevent, true);
    } else {
      root.__noselect = root.style.MozUserSelect;
      root.style.MozUserSelect = "none";
    }
  }

  function yesdrag(view, noclick) {
    var root = view.document.documentElement,
        selection$$1 = select(view).on("dragstart.drag", null);
    if (noclick) {
      selection$$1.on("click.drag", noevent, true);
      setTimeout(function() { selection$$1.on("click.drag", null); }, 0);
    }
    if ("onselectstart" in root) {
      selection$$1.on("selectstart.drag", null);
    } else {
      root.style.MozUserSelect = root.__noselect;
      delete root.__noselect;
    }
  }

  var frame = 0, // is an animation frame pending?
      timeout = 0, // is a timeout pending?
      interval = 0, // are any timers active?
      pokeDelay = 1000, // how frequently we check for clock skew
      taskHead,
      taskTail,
      clockLast = 0,
      clockNow = 0,
      clockSkew = 0,
      clock = typeof performance === "object" && performance.now ? performance : Date,
      setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

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

  function timeout$1(callback, delay, time) {
    var t = new Timer;
    delay = delay == null ? 0 : +delay;
    t.restart(function(elapsed) {
      t.stop();
      callback(elapsed + delay);
    }, delay, time);
    return t;
  }

  var emptyOn = dispatch("start", "end", "interrupt");
  var emptyTween = [];

  var CREATED = 0;
  var SCHEDULED = 1;
  var STARTING = 2;
  var STARTED = 3;
  var RUNNING = 4;
  var ENDING = 5;
  var ENDED = 6;

  function schedule(node, name, id, index, group, timing) {
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
  }

  function init(node, id) {
    var schedule = get$1(node, id);
    if (schedule.state > CREATED) throw new Error("too late; already scheduled");
    return schedule;
  }

  function set$2(node, id) {
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

  function interrupt(node, name) {
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
  }

  function selection_interrupt(name) {
    return this.each(function() {
      interrupt(this, name);
    });
  }

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

  function transition_tween(name, value) {
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
  }

  function tweenValue(transition, name, value) {
    var id = transition._id;

    transition.each(function() {
      var schedule$$1 = set$2(this, id);
      (schedule$$1.value || (schedule$$1.value = {}))[name] = value.apply(this, arguments);
    });

    return function(node) {
      return get$1(node, id).value[name];
    };
  }

  function interpolate(a, b) {
    var c;
    return (typeof b === "number" ? interpolateNumber
        : b instanceof color ? interpolateRgb
        : (c = color(b)) ? (b = c, interpolateRgb)
        : interpolateString)(a, b);
  }

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

  function attrFunction$1(name, interpolate$$1, value$$1) {
    var value00,
        value10,
        interpolate0;
    return function() {
      var value0, value1 = value$$1(this);
      if (value1 == null) return void this.removeAttribute(name);
      value0 = this.getAttribute(name);
      return value0 === value1 ? null
          : value0 === value00 && value1 === value10 ? interpolate0
          : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
    };
  }

  function attrFunctionNS$1(fullname, interpolate$$1, value$$1) {
    var value00,
        value10,
        interpolate0;
    return function() {
      var value0, value1 = value$$1(this);
      if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
      value0 = this.getAttributeNS(fullname.space, fullname.local);
      return value0 === value1 ? null
          : value0 === value00 && value1 === value10 ? interpolate0
          : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
    };
  }

  function transition_attr(name, value$$1) {
    var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
    return this.attrTween(name, typeof value$$1 === "function"
        ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value$$1))
        : value$$1 == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname)
        : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value$$1 + ""));
  }

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

  function transition_attrTween(name, value) {
    var key = "attr." + name;
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    var fullname = namespace(name);
    return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
  }

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

  function transition_delay(value) {
    var id = this._id;

    return arguments.length
        ? this.each((typeof value === "function"
            ? delayFunction
            : delayConstant)(id, value))
        : get$1(this.node(), id).delay;
  }

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

  function transition_duration(value) {
    var id = this._id;

    return arguments.length
        ? this.each((typeof value === "function"
            ? durationFunction
            : durationConstant)(id, value))
        : get$1(this.node(), id).duration;
  }

  function easeConstant(id, value) {
    if (typeof value !== "function") throw new Error;
    return function() {
      set$2(this, id).ease = value;
    };
  }

  function transition_ease(value) {
    var id = this._id;

    return arguments.length
        ? this.each(easeConstant(id, value))
        : get$1(this.node(), id).ease;
  }

  function transition_filter(match) {
    if (typeof match !== "function") match = matcher$1(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Transition(subgroups, this._parents, this._name, this._id);
  }

  function transition_merge(transition$$1) {
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
  }

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

  function transition_on(name, listener) {
    var id = this._id;

    return arguments.length < 2
        ? get$1(this.node(), id).on.on(name)
        : this.each(onFunction(id, name, listener));
  }

  function removeFunction(id) {
    return function() {
      var parent = this.parentNode;
      for (var i in this.__transition) if (+i !== id) return;
      if (parent) parent.removeChild(this);
    };
  }

  function transition_remove() {
    return this.on("end.remove", removeFunction(this._id));
  }

  function transition_select(select$$1) {
    var name = this._name,
        id = this._id;

    if (typeof select$$1 !== "function") select$$1 = selector(select$$1);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select$$1.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
          schedule(subgroup[i], name, id, i, subgroup, get$1(node, id));
        }
      }
    }

    return new Transition(subgroups, this._parents, name, id);
  }

  function transition_selectAll(select$$1) {
    var name = this._name,
        id = this._id;

    if (typeof select$$1 !== "function") select$$1 = selectorAll(select$$1);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          for (var children = select$$1.call(node, node.__data__, i, group), child, inherit = get$1(node, id), k = 0, l = children.length; k < l; ++k) {
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
  }

  var Selection$1 = selection.prototype.constructor;

  function transition_selection() {
    return new Selection$1(this._groups, this._parents);
  }

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

  function styleFunction$1(name, interpolate$$1, value$$1) {
    var value00,
        value10,
        interpolate0;
    return function() {
      var value0 = styleValue(this, name),
          value1 = value$$1(this);
      if (value1 == null) value1 = (this.style.removeProperty(name), styleValue(this, name));
      return value0 === value1 ? null
          : value0 === value00 && value1 === value10 ? interpolate0
          : interpolate0 = interpolate$$1(value00 = value0, value10 = value1);
    };
  }

  function transition_style(name, value$$1, priority) {
    var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
    return value$$1 == null ? this
            .styleTween(name, styleRemove$1(name, i))
            .on("end.style." + name, styleRemoveEnd(name))
        : this.styleTween(name, typeof value$$1 === "function"
            ? styleFunction$1(name, i, tweenValue(this, "style." + name, value$$1))
            : styleConstant$1(name, i, value$$1 + ""), priority);
  }

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

  function transition_styleTween(name, value, priority) {
    var key = "style." + (name += "");
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
  }

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

  function transition_text(value) {
    return this.tween("text", typeof value === "function"
        ? textFunction$1(tweenValue(this, "text", value))
        : textConstant$1(value == null ? "" : value + ""));
  }

  function transition_transition() {
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
  }

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

  var pi$2 = Math.PI;

  var tau$2 = 2 * Math.PI;

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

  function selection_transition(name) {
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
  }

  selection.prototype.interrupt = selection_interrupt;
  selection.prototype.transition = selection_transition;

  function constant$6(x) {
    return function() {
      return x;
    };
  }

  function BrushEvent(target, type, selection) {
    this.target = target;
    this.type = type;
    this.selection = selection;
  }

  function nopropagation$1() {
    event.stopImmediatePropagation();
  }

  function noevent$1() {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  var MODE_DRAG = {name: "drag"},
      MODE_SPACE = {name: "space"},
      MODE_HANDLE = {name: "handle"},
      MODE_CENTER = {name: "center"};

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
  function defaultFilter$1() {
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

  function brush() {
    return brush$1(XY);
  }

  function brush$1(dim) {
    var extent = defaultExtent,
        filter = defaultFilter$1,
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

    brush.move = function(group, selection$$1) {
      if (group.selection) {
        group
            .on("start.brush", function() { emitter(this, arguments).beforestart().start(); })
            .on("interrupt.brush end.brush", function() { emitter(this, arguments).end(); })
            .tween("brush", function() {
              var that = this,
                  state = that.__brush,
                  emit = emitter(that, arguments),
                  selection0 = state.selection,
                  selection1 = dim.input(typeof selection$$1 === "function" ? selection$$1.apply(this, arguments) : selection$$1, state.extent),
                  i = value(selection0, selection1);

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
                  selection1 = dim.input(typeof selection$$1 === "function" ? selection$$1.apply(that, args) : selection$$1, state.extent),
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
          selection$$1 = local$1(this).selection;

      if (selection$$1) {
        group.selectAll(".selection")
            .style("display", null)
            .attr("x", selection$$1[0][0])
            .attr("y", selection$$1[0][1])
            .attr("width", selection$$1[1][0] - selection$$1[0][0])
            .attr("height", selection$$1[1][1] - selection$$1[0][1]);

        group.selectAll(".handle")
            .style("display", null)
            .attr("x", function(d) { return d.type[d.type.length - 1] === "e" ? selection$$1[1][0] - handleSize / 2 : selection$$1[0][0] - handleSize / 2; })
            .attr("y", function(d) { return d.type[0] === "s" ? selection$$1[1][1] - handleSize / 2 : selection$$1[0][1] - handleSize / 2; })
            .attr("width", function(d) { return d.type === "n" || d.type === "s" ? selection$$1[1][0] - selection$$1[0][0] + handleSize : handleSize; })
            .attr("height", function(d) { return d.type === "e" || d.type === "w" ? selection$$1[1][1] - selection$$1[0][1] + handleSize : handleSize; });
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
          selection$$1 = state.selection,
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
          point$$1 = point0,
          emit = emitter(that, arguments).beforestart();

      if (type === "overlay") {
        state.selection = selection$$1 = [
          [w0 = dim === Y ? W : point0[0], n0 = dim === X ? N : point0[1]],
          [e0 = dim === Y ? E : w0, s0 = dim === X ? S : n0]
        ];
      } else {
        w0 = selection$$1[0][0];
        n0 = selection$$1[0][1];
        e0 = selection$$1[1][0];
        s0 = selection$$1[1][1];
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
          if (Math.abs(point1[0] - point$$1[0]) > Math.abs(point1[1] - point$$1[1])) lockY = true;
          else lockX = true;
        }
        point$$1 = point1;
        moving = true;
        noevent$1();
        move();
      }

      function move() {
        var t;

        dx = point$$1[0] - point0[0];
        dy = point$$1[1] - point0[1];

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

        if (state.selection) selection$$1 = state.selection; // May be set by brush.move!
        if (lockX) w1 = selection$$1[0][0], e1 = selection$$1[1][0];
        if (lockY) n1 = selection$$1[0][1], s1 = selection$$1[1][1];

        if (selection$$1[0][0] !== w1
            || selection$$1[0][1] !== n1
            || selection$$1[1][0] !== e1
            || selection$$1[1][1] !== s1) {
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
        if (state.selection) selection$$1 = state.selection; // May be set by brush.move (on start)!
        if (empty$1(selection$$1)) state.selection = null, redraw.call(that);
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
      var value$$1 = listeners.on.apply(listeners, arguments);
      return value$$1 === listeners ? brush : value$$1;
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
          let iqr = threshold(x, 0.75) - threshold(x, 0.25);
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
              y: linear$1()
                  .rangeRound([height, 0])
                  .domain(yDomain),
              z: linear$1() // this is the violin width, the domain and range are determined later individually for each violin
          };

          // for each group
          this.groups.forEach((g) => {
              let group = g.key;
              let entries$$1 = g.values;
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
                  .domain(entries$$1.map((d) => d.label))
                  .rangeRound([this.scale.x(group), this.scale.x(group) + this.scale.x.bandwidth()]);

              entries$$1.forEach((entry) => {

                  if (0 == entry.values.length) return; // no further rendering if this group has no entries
                  entry.values = entry.values.sort(ascending$1);
                  this._drawViolin(dom, entry, showWhisker, g.index);
              });

              // adds the sub-x axis if there are more than one entries
              var buffer = 15;
              if (showSize){
                   const sizeScale = band()
                      .domain(entries$$1.map((d) => {return d.size==undefined?'(0)':`(${d.size||0})`}))
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
              .attr("y", -40) // todo: avoid hard-coded value
              .attr("x", -40)
              .attr("class", "violin-axis-label")
              .attr("text-anchor", "start")
              .attr("transform", "rotate(-90)")
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
                  .attr("id", "violinLegend")
                  .attr("transform", `translate(0, 0)`);

              legendG.append("rect")
                  .attr("x", this.scale.x.range()[0])
                  .attr("y", -35)
                  .attr("width", 60*(this.groups[0].values.length) + 10)
                  .attr("height", 24)
                  .style("fill", "none")
                  .style("stroke", "silver");

              const legends = legendG.selectAll(".violin-legend").data(this.groups[0].values);


              const g = legends.enter().append("g").classed("violin-legend", true);
              const w = 10;
              g.append("rect")
                  .attr("x", (d, i) => 5 + 60*(i)  + this.scale.x.range()[0])
                  .attr("y", -28)
                  .attr("width", w)
                  .attr("height", w)
                  .style("fill", (d) => d.color);

              g.append("text")
                  .attr("class", "violin-legend-text")
                  .text((d) => d.label)
                  .attr("x", (d, i) => 17 + 60*(i) + this.scale.x.range()[0])
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

              const min$$1 = Math.floor(this.scale.y.invert(s[1][1]));
              const max$$1 = Math.floor(this.scale.y.invert(s[0][1]));
              this.scale.y.domain([min$$1, max$$1]); // todo: debug

              dom.select(".brush").call(theBrush.move, null);
          }


           // zoom
          let t = dom.transition().duration(750);
          dom.select(".axis--x").transition(t).call(this.xAxis);
          dom.select(".axis--y").transition(t).call(this.yAxis);

          this.groups.forEach((gg, i)=> {
              let group = gg.key;
              let entries$$1 = gg.values;

              // re-define the subx's range
              this.scale.subx
                  .rangeRound([this.scale.x(group), this.scale.x(group) + this.scale.x.bandwidth()]);

              entries$$1.forEach((entry) => {
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
                  const q1 = threshold(entry.values, 0.25);
                  const q3 = threshold(entry.values, 0.75);
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
          const q1 = threshold(entry.values, 0.25);
          const q3 = threshold(entry.values, 0.75);
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

  function getGtexUrls(){
      const host = 'https://dev.gtexportal.org/rest/v1/';
      return {
          // eqtl Dashboard specific
          dyneqtl: host + 'association/dyneqtl',
          snp: host + 'reference/variant?format=json&snpId=',
          variantId: host + 'reference/variant?format=json&variantId=',

          // transcript, exon, junction expression specific
          exonExp: host + 'expression/medianExonExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',
          transcriptExp: host + 'expression/medianTranscriptExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',
          junctionExp: host + 'expression/medianJunctionExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',
          transcript: host + 'reference/transcript?datasetId=gtex_v7&gencodeId=',
          exon: host + 'reference/exon?datasetId=gtex_v7&gencodeId=',
          geneModel: host + 'reference/collapsedGeneModelExon?unfiltered=false&datasetId=gtex_v7&gencodeId=',
          geneModelUnfiltered: host + 'reference/collapsedGeneModelExon?unfiltered=true&datasetId=gtex_v7&gencodeId=',

          // gene expression violin plot specific
          geneExp: host + 'expression/geneExpression?datasetId=gtex_v7&gencodeId=',

          // gene expression heat map specific
          medGeneExp: host + 'expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&page_size=10000',

          // top expressed gene expression specific
          topInTissueFiltered: host + 'expression/topExpressedGene?datasetId=gtex_v7&filterMtGene=true&sort_by=median&sortDirection=desc&page_size=50&tissueSiteDetailId=',
          topInTissue: host + 'expression/topExpressedGene?datasetId=gtex_v7&sort_by=median&sortDirection=desc&page_size=50&tissueSiteDetailId=',

          geneId: host + 'reference/geneId?format=json&release=v7&geneId=',

          // tissue menu specific
          tissue:  host + 'dataset/tissueInfo',

          tissueSites: host + 'dataset/tissueSiteDetail?format=json',

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
   * Build the two-level checkbox-style tissue menu
   * dependencies: tissueGroup.css classes
   * @param groups {Dictionary} of lists of tissues indexed by the group name, this is created by gtexDataParser:parseTissueSites()
   * @param domId {String} <div> ID
   * @param forEqtl {Boolean}
   * Dependencies: jQuery, Bootstrap, tissueGroup.css
   * todo: add reset and select all options
   */
  function createTissueGroupMenu(groups, domId, forEqtl=false){
      const mainClass="tissue-group-main-level";
      const subClass = "tissue-group-sub-level";
      const lastSiteClass = "last-site";

      // erase everything in domId in case it isn't empty
      select(`#${domId}`).selectAll("*").remove();

      // add check all and reset options
      const $allTissueDiv = $('<div/>').attr('class', 'col-xs-12 col-md-12').appendTo($(`#${domId}`));
      if (forEqtl){
          $(`<label class=${mainClass}>` +
          '<input type="radio" name="allTissues" value="reset"> Reset ' +
          '</label><br/>').appendTo($allTissueDiv);
      } else {
          $(`<label class=${mainClass}>` +
          '<input type="radio" name="allTissues" value="all"> All </label> ' +
          `<label class=${mainClass}>` +
          '<input type="radio" name="allTissues" value="reset"> Reset ' +
          '</label><br/>').appendTo($allTissueDiv);
      }


      // check all or reset events
      $('input[name="allTissues"]').change(function(){
          let val = $(this).val();
          switch(val){
              case 'all': {
                  $('.tissueGroup').prop('checked', true);
                  $('.tissueSubGroup').prop('checked', true);
                  break;
              }
              case 'reset': {
                  $('.tissueGroup').prop('checked', false);
                  $('.tissueSubGroup').prop('checked', false);
                  break;
              }
              default:
                  // do nothing

          }
          // $(this).prop('checked', false);
      });
      // sort the tissue groups alphabetically
      let groupNames = Object.keys(groups).sort();

      // create four <div> sections for the tissue menu
      // TODO: find a better way to organize tissues into sections
      const $sections = sequence(0,4).map((d)=>{
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
                                  `<input type="checkbox" id="${site.id}" class="tissueSubGroup"> ` +
                                  '<span class="checkmark"></span>' +
                                  `<span>${site.name}</span>` +
                                  '</label><br/>').appendTo($currentDom);
                  if (i == sites.length -1) $siteDom.addClass(lastSiteClass);
                  $siteDom.click(function(){
                      $('input[name="allTissues"]').prop('checked', false);
                  });
              });
          }

          // custom click event for the top-level tissues: toggle the check boxes
          $("#" + gId).click(function(){
              $('input[name="allTissues"]').prop('checked', false);
              if ($('#' + gId).is(":checked")) {
                  // when the group is checked, check all its tissues
                  sites.forEach(function (site) {
                      if ("id" == site.id) return;
                      $('#' + site.id).prop('checked', true);
                  });
              }
              else {
                  // when the group is unchecked, un-check all its tissues
                  sites.forEach(function (site) {
                      if ("id" == site.id) return;
                      $('#' + site.id).prop('checked', false);
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
      return queryTissueIds.filter((d)=>d!==undefined);
  }

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
              createTissueGroupMenu(tissueGroups, menuId, forEqtl);
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
      toolbar.createDownloadSvgButton(id.buttons.save, id.svg, `${id.main}-save.svg`, id.clone);
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
              const variantUrl = vid.toLowerCase().startsWith('rs')?urls.snp+vid:urls.variantId+vid;

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
                      _renderEqtlPlot(tissueDict, dashboardId, gene, variant, queryTissueIds, i, urls);

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
      const attr = 'variant';
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
  function _renderEqtlPlot(tissueDict, dashboardId, gene, variant, tissues, i, urls=getGtexUrls()) {
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
          let urlRoot = urls['dyneqtl'];
          // let url = `${urlRoot}?snp_id=${variant.variantId}&gene_id=${gene.gencodeId}&tissue=${tId}`; // use variant ID, gencode ID and tissue ID to query the dyneqtl
          let url = `${urlRoot}?variantId=${variant.variantId}&gencodeId=${gene.gencodeId}&tissueSiteDetailId=${tId}`; // use variant ID, gencode ID and tissue ID to query the dyneqtl
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
                      let group = tissueDict[d.tissueSiteDetailId]; // group is the tissue name, map tissue ID to tissue name

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
                          "pvalue": d["pValue"]===null?1:parseFloat(d["pValue"]).toPrecision(3),
                          "pvalueThreshold": d["pValueThreshold"]===null?0:parseFloat(d["pValueThreshold"]).toPrecision(3)
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
  function _parseEqtl(json$$1){
      // check required json attributes
      ['data', 'genotypes', 'pValue', 'pValueThreshold', 'tissueSiteDetailId'].forEach((d)=>{
          if(!json$$1.hasOwnProperty(d)){
              console.error(json$$1);
              throw 'Parse Error: Required json attribute is missing: ' + d;
          }
      });

      json$$1.expression_values = json$$1.data.map((d)=>parseFloat(d));
      json$$1.genotypes = json$$1.genotypes.map((d)=>parseFloat(d));

      json$$1.homoRefExp = json$$1.expression_values.filter((d,i) => {
          return json$$1.genotypes[i] == 0
      });
      json$$1.homoAltExp = json$$1.expression_values.filter((d,i) => {
          return json$$1.genotypes[i] == 2
      });
      json$$1.heteroExp = json$$1.expression_values.filter((d,i) => {
          return json$$1.genotypes[i] == 1
      });
      return json$$1;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXF0bC1kYXNoYm9hcmQuYnVuZGxlLmRldi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvZHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvY3N2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvdHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZldGNoL3NyYy9qc29uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbmFtZXNwYWNlcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL25hbWVzcGFjZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL2NyZWF0b3IuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rvci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zZWxlY3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3RvckFsbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zZWxlY3RBbGwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9tYXRjaGVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2ZpbHRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zcGFyc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZW50ZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9jb25zdGFudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kYXRhLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2V4aXQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbWVyZ2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vb3JkZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc29ydC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jYWxsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL25vZGVzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL25vZGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc2l6ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lbXB0eS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lYWNoLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2F0dHIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy93aW5kb3cuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc3R5bGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vcHJvcGVydHkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vY2xhc3NlZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi90ZXh0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2h0bWwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vcmFpc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbG93ZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vYXBwZW5kLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2luc2VydC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9yZW1vdmUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vY2xvbmUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZGF0dW0uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZGlzcGF0Y2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zb3VyY2VFdmVudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3BvaW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbW91c2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL2FzY2VuZGluZy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvYmlzZWN0b3IuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL2Jpc2VjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvbnVtYmVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy92YXJpYW5jZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvZGV2aWF0aW9uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9leHRlbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL3JhbmdlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy90aWNrcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvcXVhbnRpbGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL21heC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvbWVhbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvbWVkaWFuLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9taW4uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtY29sbGVjdGlvbi9zcmMvbWFwLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbGxlY3Rpb24vc3JjL25lc3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtY29sbGVjdGlvbi9zcmMvc2V0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9hcnJheS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvb3JkaW5hbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvYmFuZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvZGVmaW5lLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbG9yL3NyYy9jb2xvci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvbWF0aC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvbGFiLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWNvbG9yL3NyYy9jdWJlaGVsaXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL2NvbnN0YW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9jb2xvci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvcmdiLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9hcnJheS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvZGF0ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvbnVtYmVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9vYmplY3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL3N0cmluZy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvdmFsdWUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL3JvdW5kLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy90cmFuc2Zvcm0vZGVjb21wb3NlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy90cmFuc2Zvcm0vcGFyc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL3RyYW5zZm9ybS9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvem9vbS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvY29uc3RhbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL251bWJlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvY29udGludW91cy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdERlY2ltYWwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9leHBvbmVudC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdEdyb3VwLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0TnVtZXJhbHMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXREZWZhdWx0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0UHJlZml4QXV0by5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdFJvdW5kZWQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRUeXBlcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdFNwZWNpZmllci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2lkZW50aXR5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvbG9jYWxlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZGVmYXVsdExvY2FsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL3ByZWNpc2lvbkZpeGVkLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvcHJlY2lzaW9uUHJlZml4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvcHJlY2lzaW9uUm91bmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL3RpY2tGb3JtYXQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL2xpbmVhci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9pbnRlcnZhbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9taWxsaXNlY29uZC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9kdXJhdGlvbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9zZWNvbmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvbWludXRlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL2hvdXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvZGF5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3dlZWsuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvbW9udGguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMveWVhci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy91dGNNaW51dGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvdXRjSG91ci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy91dGNEYXkuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvdXRjV2Vlay5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy91dGNNb250aC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy91dGNZZWFyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWUtZm9ybWF0L3NyYy9sb2NhbGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS1mb3JtYXQvc3JjL2RlZmF1bHRMb2NhbGUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdGltZS1mb3JtYXQvc3JjL2lzb0Zvcm1hdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9zcmMvaXNvUGFyc2UuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtcGF0aC9zcmMvcGF0aC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zaGFwZS9zcmMvY29uc3RhbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL21hdGguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL2N1cnZlL2xpbmVhci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zaGFwZS9zcmMvcG9pbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL2xpbmUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL2FyZWEuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL2N1cnZlL21vbm90b25lLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWF4aXMvc3JjL2FycmF5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWF4aXMvc3JjL2lkZW50aXR5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWF4aXMvc3JjL2F4aXMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZGlzcGF0Y2gvc3JjL2Rpc3BhdGNoLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRyYWcvc3JjL25vZXZlbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZHJhZy9zcmMvbm9kcmFnLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRpbWVyL3NyYy90aW1lci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10aW1lci9zcmMvdGltZW91dC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3NjaGVkdWxlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL2ludGVycnVwdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy9zZWxlY3Rpb24vaW50ZXJydXB0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vdHdlZW4uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9pbnRlcnBvbGF0ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL2F0dHIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9hdHRyVHdlZW4uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9kZWxheS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL2R1cmF0aW9uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vZWFzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL2ZpbHRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL21lcmdlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9yZW1vdmUuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9zZWxlY3QuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9zZWxlY3RBbGwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9zZWxlY3Rpb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi9zdHlsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL3N0eWxlVHdlZW4uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtdHJhbnNpdGlvbi9zcmMvdHJhbnNpdGlvbi90ZXh0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3RyYW5zaXRpb24vdHJhbnNpdGlvbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy10cmFuc2l0aW9uL3NyYy90cmFuc2l0aW9uL2luZGV4LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWVhc2Uvc3JjL2N1YmljLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWVhc2Uvc3JjL3Npbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1lYXNlL3NyYy9lbGFzdGljLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3NlbGVjdGlvbi90cmFuc2l0aW9uLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXRyYW5zaXRpb24vc3JjL3NlbGVjdGlvbi9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1icnVzaC9zcmMvY29uc3RhbnQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtYnJ1c2gvc3JjL2V2ZW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWJydXNoL3NyYy9ub2V2ZW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWJydXNoL3NyYy9icnVzaC5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL21vZHVsZXMva2RlLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy9Ub29sdGlwLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy91dGlscy5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL21vZHVsZXMvVG9vbGJhci5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL21vZHVsZXMvR3JvdXBlZFZpb2xpbi5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL21vZHVsZXMvZ3RleERhdGFQYXJzZXIuanMiLCIuLi8uLi9zcmMvc2NyaXB0cy9tb2R1bGVzL2d0ZXhNZW51QnVpbGRlci5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL0VxdGxEYXNoYm9hcmQuanMiXSwic291cmNlc0NvbnRlbnQiOlsidmFyIEVPTCA9IHt9LFxuICAgIEVPRiA9IHt9LFxuICAgIFFVT1RFID0gMzQsXG4gICAgTkVXTElORSA9IDEwLFxuICAgIFJFVFVSTiA9IDEzO1xuXG5mdW5jdGlvbiBvYmplY3RDb252ZXJ0ZXIoY29sdW1ucykge1xuICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwiZFwiLCBcInJldHVybiB7XCIgKyBjb2x1bW5zLm1hcChmdW5jdGlvbihuYW1lLCBpKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG5hbWUpICsgXCI6IGRbXCIgKyBpICsgXCJdXCI7XG4gIH0pLmpvaW4oXCIsXCIpICsgXCJ9XCIpO1xufVxuXG5mdW5jdGlvbiBjdXN0b21Db252ZXJ0ZXIoY29sdW1ucywgZikge1xuICB2YXIgb2JqZWN0ID0gb2JqZWN0Q29udmVydGVyKGNvbHVtbnMpO1xuICByZXR1cm4gZnVuY3Rpb24ocm93LCBpKSB7XG4gICAgcmV0dXJuIGYob2JqZWN0KHJvdyksIGksIGNvbHVtbnMpO1xuICB9O1xufVxuXG4vLyBDb21wdXRlIHVuaXF1ZSBjb2x1bW5zIGluIG9yZGVyIG9mIGRpc2NvdmVyeS5cbmZ1bmN0aW9uIGluZmVyQ29sdW1ucyhyb3dzKSB7XG4gIHZhciBjb2x1bW5TZXQgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgY29sdW1ucyA9IFtdO1xuXG4gIHJvd3MuZm9yRWFjaChmdW5jdGlvbihyb3cpIHtcbiAgICBmb3IgKHZhciBjb2x1bW4gaW4gcm93KSB7XG4gICAgICBpZiAoIShjb2x1bW4gaW4gY29sdW1uU2V0KSkge1xuICAgICAgICBjb2x1bW5zLnB1c2goY29sdW1uU2V0W2NvbHVtbl0gPSBjb2x1bW4pO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGNvbHVtbnM7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGRlbGltaXRlcikge1xuICB2YXIgcmVGb3JtYXQgPSBuZXcgUmVnRXhwKFwiW1xcXCJcIiArIGRlbGltaXRlciArIFwiXFxuXFxyXVwiKSxcbiAgICAgIERFTElNSVRFUiA9IGRlbGltaXRlci5jaGFyQ29kZUF0KDApO1xuXG4gIGZ1bmN0aW9uIHBhcnNlKHRleHQsIGYpIHtcbiAgICB2YXIgY29udmVydCwgY29sdW1ucywgcm93cyA9IHBhcnNlUm93cyh0ZXh0LCBmdW5jdGlvbihyb3csIGkpIHtcbiAgICAgIGlmIChjb252ZXJ0KSByZXR1cm4gY29udmVydChyb3csIGkgLSAxKTtcbiAgICAgIGNvbHVtbnMgPSByb3csIGNvbnZlcnQgPSBmID8gY3VzdG9tQ29udmVydGVyKHJvdywgZikgOiBvYmplY3RDb252ZXJ0ZXIocm93KTtcbiAgICB9KTtcbiAgICByb3dzLmNvbHVtbnMgPSBjb2x1bW5zIHx8IFtdO1xuICAgIHJldHVybiByb3dzO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VSb3dzKHRleHQsIGYpIHtcbiAgICB2YXIgcm93cyA9IFtdLCAvLyBvdXRwdXQgcm93c1xuICAgICAgICBOID0gdGV4dC5sZW5ndGgsXG4gICAgICAgIEkgPSAwLCAvLyBjdXJyZW50IGNoYXJhY3RlciBpbmRleFxuICAgICAgICBuID0gMCwgLy8gY3VycmVudCBsaW5lIG51bWJlclxuICAgICAgICB0LCAvLyBjdXJyZW50IHRva2VuXG4gICAgICAgIGVvZiA9IE4gPD0gMCwgLy8gY3VycmVudCB0b2tlbiBmb2xsb3dlZCBieSBFT0Y/XG4gICAgICAgIGVvbCA9IGZhbHNlOyAvLyBjdXJyZW50IHRva2VuIGZvbGxvd2VkIGJ5IEVPTD9cblxuICAgIC8vIFN0cmlwIHRoZSB0cmFpbGluZyBuZXdsaW5lLlxuICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQoTiAtIDEpID09PSBORVdMSU5FKSAtLU47XG4gICAgaWYgKHRleHQuY2hhckNvZGVBdChOIC0gMSkgPT09IFJFVFVSTikgLS1OO1xuXG4gICAgZnVuY3Rpb24gdG9rZW4oKSB7XG4gICAgICBpZiAoZW9mKSByZXR1cm4gRU9GO1xuICAgICAgaWYgKGVvbCkgcmV0dXJuIGVvbCA9IGZhbHNlLCBFT0w7XG5cbiAgICAgIC8vIFVuZXNjYXBlIHF1b3Rlcy5cbiAgICAgIHZhciBpLCBqID0gSSwgYztcbiAgICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQoaikgPT09IFFVT1RFKSB7XG4gICAgICAgIHdoaWxlIChJKysgPCBOICYmIHRleHQuY2hhckNvZGVBdChJKSAhPT0gUVVPVEUgfHwgdGV4dC5jaGFyQ29kZUF0KCsrSSkgPT09IFFVT1RFKTtcbiAgICAgICAgaWYgKChpID0gSSkgPj0gTikgZW9mID0gdHJ1ZTtcbiAgICAgICAgZWxzZSBpZiAoKGMgPSB0ZXh0LmNoYXJDb2RlQXQoSSsrKSkgPT09IE5FV0xJTkUpIGVvbCA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKGMgPT09IFJFVFVSTikgeyBlb2wgPSB0cnVlOyBpZiAodGV4dC5jaGFyQ29kZUF0KEkpID09PSBORVdMSU5FKSArK0k7IH1cbiAgICAgICAgcmV0dXJuIHRleHQuc2xpY2UoaiArIDEsIGkgLSAxKS5yZXBsYWNlKC9cIlwiL2csIFwiXFxcIlwiKTtcbiAgICAgIH1cblxuICAgICAgLy8gRmluZCBuZXh0IGRlbGltaXRlciBvciBuZXdsaW5lLlxuICAgICAgd2hpbGUgKEkgPCBOKSB7XG4gICAgICAgIGlmICgoYyA9IHRleHQuY2hhckNvZGVBdChpID0gSSsrKSkgPT09IE5FV0xJTkUpIGVvbCA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKGMgPT09IFJFVFVSTikgeyBlb2wgPSB0cnVlOyBpZiAodGV4dC5jaGFyQ29kZUF0KEkpID09PSBORVdMSU5FKSArK0k7IH1cbiAgICAgICAgZWxzZSBpZiAoYyAhPT0gREVMSU1JVEVSKSBjb250aW51ZTtcbiAgICAgICAgcmV0dXJuIHRleHQuc2xpY2UoaiwgaSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJldHVybiBsYXN0IHRva2VuIGJlZm9yZSBFT0YuXG4gICAgICByZXR1cm4gZW9mID0gdHJ1ZSwgdGV4dC5zbGljZShqLCBOKTtcbiAgICB9XG5cbiAgICB3aGlsZSAoKHQgPSB0b2tlbigpKSAhPT0gRU9GKSB7XG4gICAgICB2YXIgcm93ID0gW107XG4gICAgICB3aGlsZSAodCAhPT0gRU9MICYmIHQgIT09IEVPRikgcm93LnB1c2godCksIHQgPSB0b2tlbigpO1xuICAgICAgaWYgKGYgJiYgKHJvdyA9IGYocm93LCBuKyspKSA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIHJvd3MucHVzaChyb3cpO1xuICAgIH1cblxuICAgIHJldHVybiByb3dzO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0KHJvd3MsIGNvbHVtbnMpIHtcbiAgICBpZiAoY29sdW1ucyA9PSBudWxsKSBjb2x1bW5zID0gaW5mZXJDb2x1bW5zKHJvd3MpO1xuICAgIHJldHVybiBbY29sdW1ucy5tYXAoZm9ybWF0VmFsdWUpLmpvaW4oZGVsaW1pdGVyKV0uY29uY2F0KHJvd3MubWFwKGZ1bmN0aW9uKHJvdykge1xuICAgICAgcmV0dXJuIGNvbHVtbnMubWFwKGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICByZXR1cm4gZm9ybWF0VmFsdWUocm93W2NvbHVtbl0pO1xuICAgICAgfSkuam9pbihkZWxpbWl0ZXIpO1xuICAgIH0pKS5qb2luKFwiXFxuXCIpO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0Um93cyhyb3dzKSB7XG4gICAgcmV0dXJuIHJvd3MubWFwKGZvcm1hdFJvdykuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFJvdyhyb3cpIHtcbiAgICByZXR1cm4gcm93Lm1hcChmb3JtYXRWYWx1ZSkuam9pbihkZWxpbWl0ZXIpO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VmFsdWUodGV4dCkge1xuICAgIHJldHVybiB0ZXh0ID09IG51bGwgPyBcIlwiXG4gICAgICAgIDogcmVGb3JtYXQudGVzdCh0ZXh0ICs9IFwiXCIpID8gXCJcXFwiXCIgKyB0ZXh0LnJlcGxhY2UoL1wiL2csIFwiXFxcIlxcXCJcIikgKyBcIlxcXCJcIlxuICAgICAgICA6IHRleHQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHBhcnNlOiBwYXJzZSxcbiAgICBwYXJzZVJvd3M6IHBhcnNlUm93cyxcbiAgICBmb3JtYXQ6IGZvcm1hdCxcbiAgICBmb3JtYXRSb3dzOiBmb3JtYXRSb3dzXG4gIH07XG59XG4iLCJpbXBvcnQgZHN2IGZyb20gXCIuL2RzdlwiO1xuXG52YXIgY3N2ID0gZHN2KFwiLFwiKTtcblxuZXhwb3J0IHZhciBjc3ZQYXJzZSA9IGNzdi5wYXJzZTtcbmV4cG9ydCB2YXIgY3N2UGFyc2VSb3dzID0gY3N2LnBhcnNlUm93cztcbmV4cG9ydCB2YXIgY3N2Rm9ybWF0ID0gY3N2LmZvcm1hdDtcbmV4cG9ydCB2YXIgY3N2Rm9ybWF0Um93cyA9IGNzdi5mb3JtYXRSb3dzO1xuIiwiaW1wb3J0IGRzdiBmcm9tIFwiLi9kc3ZcIjtcblxudmFyIHRzdiA9IGRzdihcIlxcdFwiKTtcblxuZXhwb3J0IHZhciB0c3ZQYXJzZSA9IHRzdi5wYXJzZTtcbmV4cG9ydCB2YXIgdHN2UGFyc2VSb3dzID0gdHN2LnBhcnNlUm93cztcbmV4cG9ydCB2YXIgdHN2Rm9ybWF0ID0gdHN2LmZvcm1hdDtcbmV4cG9ydCB2YXIgdHN2Rm9ybWF0Um93cyA9IHRzdi5mb3JtYXRSb3dzO1xuIiwiZnVuY3Rpb24gcmVzcG9uc2VKc29uKHJlc3BvbnNlKSB7XG4gIGlmICghcmVzcG9uc2Uub2spIHRocm93IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXMgKyBcIiBcIiArIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICByZXR1cm4gZmV0Y2goaW5wdXQsIGluaXQpLnRoZW4ocmVzcG9uc2VKc29uKTtcbn1cbiIsImV4cG9ydCB2YXIgeGh0bWwgPSBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIjtcblxuZXhwb3J0IGRlZmF1bHQge1xuICBzdmc6IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIixcbiAgeGh0bWw6IHhodG1sLFxuICB4bGluazogXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsXG4gIHhtbDogXCJodHRwOi8vd3d3LnczLm9yZy9YTUwvMTk5OC9uYW1lc3BhY2VcIixcbiAgeG1sbnM6IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC94bWxucy9cIlxufTtcbiIsImltcG9ydCBuYW1lc3BhY2VzIGZyb20gXCIuL25hbWVzcGFjZXNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSkge1xuICB2YXIgcHJlZml4ID0gbmFtZSArPSBcIlwiLCBpID0gcHJlZml4LmluZGV4T2YoXCI6XCIpO1xuICBpZiAoaSA+PSAwICYmIChwcmVmaXggPSBuYW1lLnNsaWNlKDAsIGkpKSAhPT0gXCJ4bWxuc1wiKSBuYW1lID0gbmFtZS5zbGljZShpICsgMSk7XG4gIHJldHVybiBuYW1lc3BhY2VzLmhhc093blByb3BlcnR5KHByZWZpeCkgPyB7c3BhY2U6IG5hbWVzcGFjZXNbcHJlZml4XSwgbG9jYWw6IG5hbWV9IDogbmFtZTtcbn1cbiIsImltcG9ydCBuYW1lc3BhY2UgZnJvbSBcIi4vbmFtZXNwYWNlXCI7XG5pbXBvcnQge3hodG1sfSBmcm9tIFwiLi9uYW1lc3BhY2VzXCI7XG5cbmZ1bmN0aW9uIGNyZWF0b3JJbmhlcml0KG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBkb2N1bWVudCA9IHRoaXMub3duZXJEb2N1bWVudCxcbiAgICAgICAgdXJpID0gdGhpcy5uYW1lc3BhY2VVUkk7XG4gICAgcmV0dXJuIHVyaSA9PT0geGh0bWwgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm5hbWVzcGFjZVVSSSA9PT0geGh0bWxcbiAgICAgICAgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5hbWUpXG4gICAgICAgIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHVyaSwgbmFtZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0b3JGaXhlZChmdWxsbmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMub3duZXJEb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSkge1xuICB2YXIgZnVsbG5hbWUgPSBuYW1lc3BhY2UobmFtZSk7XG4gIHJldHVybiAoZnVsbG5hbWUubG9jYWxcbiAgICAgID8gY3JlYXRvckZpeGVkXG4gICAgICA6IGNyZWF0b3JJbmhlcml0KShmdWxsbmFtZSk7XG59XG4iLCJmdW5jdGlvbiBub25lKCkge31cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIHNlbGVjdG9yID09IG51bGwgPyBub25lIDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIH07XG59XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCBzZWxlY3RvciBmcm9tIFwiLi4vc2VsZWN0b3JcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0KSB7XG4gIGlmICh0eXBlb2Ygc2VsZWN0ICE9PSBcImZ1bmN0aW9uXCIpIHNlbGVjdCA9IHNlbGVjdG9yKHNlbGVjdCk7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgc3ViZ3JvdXBzID0gbmV3IEFycmF5KG0pLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBzdWJncm91cCA9IHN1Ymdyb3Vwc1tqXSA9IG5ldyBBcnJheShuKSwgbm9kZSwgc3Vibm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmICgobm9kZSA9IGdyb3VwW2ldKSAmJiAoc3Vibm9kZSA9IHNlbGVjdC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSkpIHtcbiAgICAgICAgaWYgKFwiX19kYXRhX19cIiBpbiBub2RlKSBzdWJub2RlLl9fZGF0YV9fID0gbm9kZS5fX2RhdGFfXztcbiAgICAgICAgc3ViZ3JvdXBbaV0gPSBzdWJub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHN1Ymdyb3VwcywgdGhpcy5fcGFyZW50cyk7XG59XG4iLCJmdW5jdGlvbiBlbXB0eSgpIHtcbiAgcmV0dXJuIFtdO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3Rvcikge1xuICByZXR1cm4gc2VsZWN0b3IgPT0gbnVsbCA/IGVtcHR5IDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gIH07XG59XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCBzZWxlY3RvckFsbCBmcm9tIFwiLi4vc2VsZWN0b3JBbGxcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0KSB7XG4gIGlmICh0eXBlb2Ygc2VsZWN0ICE9PSBcImZ1bmN0aW9uXCIpIHNlbGVjdCA9IHNlbGVjdG9yQWxsKHNlbGVjdCk7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgc3ViZ3JvdXBzID0gW10sIHBhcmVudHMgPSBbXSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgICAgc3ViZ3JvdXBzLnB1c2goc2VsZWN0LmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApKTtcbiAgICAgICAgcGFyZW50cy5wdXNoKG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHN1Ymdyb3VwcywgcGFyZW50cyk7XG59XG4iLCJ2YXIgbWF0Y2hlciA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5tYXRjaGVzKHNlbGVjdG9yKTtcbiAgfTtcbn07XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGlmICghZWxlbWVudC5tYXRjaGVzKSB7XG4gICAgdmFyIHZlbmRvck1hdGNoZXMgPSBlbGVtZW50LndlYmtpdE1hdGNoZXNTZWxlY3RvclxuICAgICAgICB8fCBlbGVtZW50Lm1zTWF0Y2hlc1NlbGVjdG9yXG4gICAgICAgIHx8IGVsZW1lbnQubW96TWF0Y2hlc1NlbGVjdG9yXG4gICAgICAgIHx8IGVsZW1lbnQub01hdGNoZXNTZWxlY3RvcjtcbiAgICBtYXRjaGVyID0gZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHZlbmRvck1hdGNoZXMuY2FsbCh0aGlzLCBzZWxlY3Rvcik7XG4gICAgICB9O1xuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgbWF0Y2hlcjtcbiIsImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuaW1wb3J0IG1hdGNoZXIgZnJvbSBcIi4uL21hdGNoZXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obWF0Y2gpIHtcbiAgaWYgKHR5cGVvZiBtYXRjaCAhPT0gXCJmdW5jdGlvblwiKSBtYXRjaCA9IG1hdGNoZXIobWF0Y2gpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc3ViZ3JvdXAgPSBzdWJncm91cHNbal0gPSBbXSwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmICgobm9kZSA9IGdyb3VwW2ldKSAmJiBtYXRjaC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSkge1xuICAgICAgICBzdWJncm91cC5wdXNoKG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHN1Ymdyb3VwcywgdGhpcy5fcGFyZW50cyk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih1cGRhdGUpIHtcbiAgcmV0dXJuIG5ldyBBcnJheSh1cGRhdGUubGVuZ3RoKTtcbn1cbiIsImltcG9ydCBzcGFyc2UgZnJvbSBcIi4vc3BhcnNlXCI7XG5pbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHRoaXMuX2VudGVyIHx8IHRoaXMuX2dyb3Vwcy5tYXAoc3BhcnNlKSwgdGhpcy5fcGFyZW50cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBFbnRlck5vZGUocGFyZW50LCBkYXR1bSkge1xuICB0aGlzLm93bmVyRG9jdW1lbnQgPSBwYXJlbnQub3duZXJEb2N1bWVudDtcbiAgdGhpcy5uYW1lc3BhY2VVUkkgPSBwYXJlbnQubmFtZXNwYWNlVVJJO1xuICB0aGlzLl9uZXh0ID0gbnVsbDtcbiAgdGhpcy5fcGFyZW50ID0gcGFyZW50O1xuICB0aGlzLl9fZGF0YV9fID0gZGF0dW07XG59XG5cbkVudGVyTm9kZS5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBFbnRlck5vZGUsXG4gIGFwcGVuZENoaWxkOiBmdW5jdGlvbihjaGlsZCkgeyByZXR1cm4gdGhpcy5fcGFyZW50Lmluc2VydEJlZm9yZShjaGlsZCwgdGhpcy5fbmV4dCk7IH0sXG4gIGluc2VydEJlZm9yZTogZnVuY3Rpb24oY2hpbGQsIG5leHQpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5pbnNlcnRCZWZvcmUoY2hpbGQsIG5leHQpOyB9LFxuICBxdWVyeVNlbGVjdG9yOiBmdW5jdGlvbihzZWxlY3RvcikgeyByZXR1cm4gdGhpcy5fcGFyZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpOyB9LFxuICBxdWVyeVNlbGVjdG9yQWxsOiBmdW5jdGlvbihzZWxlY3RvcikgeyByZXR1cm4gdGhpcy5fcGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpOyB9XG59O1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHg7XG4gIH07XG59XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCB7RW50ZXJOb2RlfSBmcm9tIFwiLi9lbnRlclwiO1xuaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuLi9jb25zdGFudFwiO1xuXG52YXIga2V5UHJlZml4ID0gXCIkXCI7IC8vIFByb3RlY3QgYWdhaW5zdCBrZXlzIGxpa2Ug4oCcX19wcm90b19f4oCdLlxuXG5mdW5jdGlvbiBiaW5kSW5kZXgocGFyZW50LCBncm91cCwgZW50ZXIsIHVwZGF0ZSwgZXhpdCwgZGF0YSkge1xuICB2YXIgaSA9IDAsXG4gICAgICBub2RlLFxuICAgICAgZ3JvdXBMZW5ndGggPSBncm91cC5sZW5ndGgsXG4gICAgICBkYXRhTGVuZ3RoID0gZGF0YS5sZW5ndGg7XG5cbiAgLy8gUHV0IGFueSBub24tbnVsbCBub2RlcyB0aGF0IGZpdCBpbnRvIHVwZGF0ZS5cbiAgLy8gUHV0IGFueSBudWxsIG5vZGVzIGludG8gZW50ZXIuXG4gIC8vIFB1dCBhbnkgcmVtYWluaW5nIGRhdGEgaW50byBlbnRlci5cbiAgZm9yICg7IGkgPCBkYXRhTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICBub2RlLl9fZGF0YV9fID0gZGF0YVtpXTtcbiAgICAgIHVwZGF0ZVtpXSA9IG5vZGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVudGVyW2ldID0gbmV3IEVudGVyTm9kZShwYXJlbnQsIGRhdGFbaV0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIFB1dCBhbnkgbm9uLW51bGwgbm9kZXMgdGhhdCBkb27igJl0IGZpdCBpbnRvIGV4aXQuXG4gIGZvciAoOyBpIDwgZ3JvdXBMZW5ndGg7ICsraSkge1xuICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgIGV4aXRbaV0gPSBub2RlO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBiaW5kS2V5KHBhcmVudCwgZ3JvdXAsIGVudGVyLCB1cGRhdGUsIGV4aXQsIGRhdGEsIGtleSkge1xuICB2YXIgaSxcbiAgICAgIG5vZGUsXG4gICAgICBub2RlQnlLZXlWYWx1ZSA9IHt9LFxuICAgICAgZ3JvdXBMZW5ndGggPSBncm91cC5sZW5ndGgsXG4gICAgICBkYXRhTGVuZ3RoID0gZGF0YS5sZW5ndGgsXG4gICAgICBrZXlWYWx1ZXMgPSBuZXcgQXJyYXkoZ3JvdXBMZW5ndGgpLFxuICAgICAga2V5VmFsdWU7XG5cbiAgLy8gQ29tcHV0ZSB0aGUga2V5IGZvciBlYWNoIG5vZGUuXG4gIC8vIElmIG11bHRpcGxlIG5vZGVzIGhhdmUgdGhlIHNhbWUga2V5LCB0aGUgZHVwbGljYXRlcyBhcmUgYWRkZWQgdG8gZXhpdC5cbiAgZm9yIChpID0gMDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICBrZXlWYWx1ZXNbaV0gPSBrZXlWYWx1ZSA9IGtleVByZWZpeCArIGtleS5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKTtcbiAgICAgIGlmIChrZXlWYWx1ZSBpbiBub2RlQnlLZXlWYWx1ZSkge1xuICAgICAgICBleGl0W2ldID0gbm9kZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGVCeUtleVZhbHVlW2tleVZhbHVlXSA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ29tcHV0ZSB0aGUga2V5IGZvciBlYWNoIGRhdHVtLlxuICAvLyBJZiB0aGVyZSBhIG5vZGUgYXNzb2NpYXRlZCB3aXRoIHRoaXMga2V5LCBqb2luIGFuZCBhZGQgaXQgdG8gdXBkYXRlLlxuICAvLyBJZiB0aGVyZSBpcyBub3QgKG9yIHRoZSBrZXkgaXMgYSBkdXBsaWNhdGUpLCBhZGQgaXQgdG8gZW50ZXIuXG4gIGZvciAoaSA9IDA7IGkgPCBkYXRhTGVuZ3RoOyArK2kpIHtcbiAgICBrZXlWYWx1ZSA9IGtleVByZWZpeCArIGtleS5jYWxsKHBhcmVudCwgZGF0YVtpXSwgaSwgZGF0YSk7XG4gICAgaWYgKG5vZGUgPSBub2RlQnlLZXlWYWx1ZVtrZXlWYWx1ZV0pIHtcbiAgICAgIHVwZGF0ZVtpXSA9IG5vZGU7XG4gICAgICBub2RlLl9fZGF0YV9fID0gZGF0YVtpXTtcbiAgICAgIG5vZGVCeUtleVZhbHVlW2tleVZhbHVlXSA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVudGVyW2ldID0gbmV3IEVudGVyTm9kZShwYXJlbnQsIGRhdGFbaV0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFkZCBhbnkgcmVtYWluaW5nIG5vZGVzIHRoYXQgd2VyZSBub3QgYm91bmQgdG8gZGF0YSB0byBleGl0LlxuICBmb3IgKGkgPSAwOyBpIDwgZ3JvdXBMZW5ndGg7ICsraSkge1xuICAgIGlmICgobm9kZSA9IGdyb3VwW2ldKSAmJiAobm9kZUJ5S2V5VmFsdWVba2V5VmFsdWVzW2ldXSA9PT0gbm9kZSkpIHtcbiAgICAgIGV4aXRbaV0gPSBub2RlO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gIGlmICghdmFsdWUpIHtcbiAgICBkYXRhID0gbmV3IEFycmF5KHRoaXMuc2l6ZSgpKSwgaiA9IC0xO1xuICAgIHRoaXMuZWFjaChmdW5jdGlvbihkKSB7IGRhdGFbKytqXSA9IGQ7IH0pO1xuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgdmFyIGJpbmQgPSBrZXkgPyBiaW5kS2V5IDogYmluZEluZGV4LFxuICAgICAgcGFyZW50cyA9IHRoaXMuX3BhcmVudHMsXG4gICAgICBncm91cHMgPSB0aGlzLl9ncm91cHM7XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB2YWx1ZSA9IGNvbnN0YW50KHZhbHVlKTtcblxuICBmb3IgKHZhciBtID0gZ3JvdXBzLmxlbmd0aCwgdXBkYXRlID0gbmV3IEFycmF5KG0pLCBlbnRlciA9IG5ldyBBcnJheShtKSwgZXhpdCA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICB2YXIgcGFyZW50ID0gcGFyZW50c1tqXSxcbiAgICAgICAgZ3JvdXAgPSBncm91cHNbal0sXG4gICAgICAgIGdyb3VwTGVuZ3RoID0gZ3JvdXAubGVuZ3RoLFxuICAgICAgICBkYXRhID0gdmFsdWUuY2FsbChwYXJlbnQsIHBhcmVudCAmJiBwYXJlbnQuX19kYXRhX18sIGosIHBhcmVudHMpLFxuICAgICAgICBkYXRhTGVuZ3RoID0gZGF0YS5sZW5ndGgsXG4gICAgICAgIGVudGVyR3JvdXAgPSBlbnRlcltqXSA9IG5ldyBBcnJheShkYXRhTGVuZ3RoKSxcbiAgICAgICAgdXBkYXRlR3JvdXAgPSB1cGRhdGVbal0gPSBuZXcgQXJyYXkoZGF0YUxlbmd0aCksXG4gICAgICAgIGV4aXRHcm91cCA9IGV4aXRbal0gPSBuZXcgQXJyYXkoZ3JvdXBMZW5ndGgpO1xuXG4gICAgYmluZChwYXJlbnQsIGdyb3VwLCBlbnRlckdyb3VwLCB1cGRhdGVHcm91cCwgZXhpdEdyb3VwLCBkYXRhLCBrZXkpO1xuXG4gICAgLy8gTm93IGNvbm5lY3QgdGhlIGVudGVyIG5vZGVzIHRvIHRoZWlyIGZvbGxvd2luZyB1cGRhdGUgbm9kZSwgc3VjaCB0aGF0XG4gICAgLy8gYXBwZW5kQ2hpbGQgY2FuIGluc2VydCB0aGUgbWF0ZXJpYWxpemVkIGVudGVyIG5vZGUgYmVmb3JlIHRoaXMgbm9kZSxcbiAgICAvLyByYXRoZXIgdGhhbiBhdCB0aGUgZW5kIG9mIHRoZSBwYXJlbnQgbm9kZS5cbiAgICBmb3IgKHZhciBpMCA9IDAsIGkxID0gMCwgcHJldmlvdXMsIG5leHQ7IGkwIDwgZGF0YUxlbmd0aDsgKytpMCkge1xuICAgICAgaWYgKHByZXZpb3VzID0gZW50ZXJHcm91cFtpMF0pIHtcbiAgICAgICAgaWYgKGkwID49IGkxKSBpMSA9IGkwICsgMTtcbiAgICAgICAgd2hpbGUgKCEobmV4dCA9IHVwZGF0ZUdyb3VwW2kxXSkgJiYgKytpMSA8IGRhdGFMZW5ndGgpO1xuICAgICAgICBwcmV2aW91cy5fbmV4dCA9IG5leHQgfHwgbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB1cGRhdGUgPSBuZXcgU2VsZWN0aW9uKHVwZGF0ZSwgcGFyZW50cyk7XG4gIHVwZGF0ZS5fZW50ZXIgPSBlbnRlcjtcbiAgdXBkYXRlLl9leGl0ID0gZXhpdDtcbiAgcmV0dXJuIHVwZGF0ZTtcbn1cbiIsImltcG9ydCBzcGFyc2UgZnJvbSBcIi4vc3BhcnNlXCI7XG5pbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHRoaXMuX2V4aXQgfHwgdGhpcy5fZ3JvdXBzLm1hcChzcGFyc2UpLCB0aGlzLl9wYXJlbnRzKTtcbn1cbiIsImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3Rpb24pIHtcblxuICBmb3IgKHZhciBncm91cHMwID0gdGhpcy5fZ3JvdXBzLCBncm91cHMxID0gc2VsZWN0aW9uLl9ncm91cHMsIG0wID0gZ3JvdXBzMC5sZW5ndGgsIG0xID0gZ3JvdXBzMS5sZW5ndGgsIG0gPSBNYXRoLm1pbihtMCwgbTEpLCBtZXJnZXMgPSBuZXcgQXJyYXkobTApLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwMCA9IGdyb3VwczBbal0sIGdyb3VwMSA9IGdyb3VwczFbal0sIG4gPSBncm91cDAubGVuZ3RoLCBtZXJnZSA9IG1lcmdlc1tqXSA9IG5ldyBBcnJheShuKSwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXAwW2ldIHx8IGdyb3VwMVtpXSkge1xuICAgICAgICBtZXJnZVtpXSA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yICg7IGogPCBtMDsgKytqKSB7XG4gICAgbWVyZ2VzW2pdID0gZ3JvdXBzMFtqXTtcbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKG1lcmdlcywgdGhpcy5fcGFyZW50cyk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIGogPSAtMSwgbSA9IGdyb3Vwcy5sZW5ndGg7ICsraiA8IG07KSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIGkgPSBncm91cC5sZW5ndGggLSAxLCBuZXh0ID0gZ3JvdXBbaV0sIG5vZGU7IC0taSA+PSAwOykge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgICBpZiAobmV4dCAmJiBuZXh0ICE9PSBub2RlLm5leHRTaWJsaW5nKSBuZXh0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIG5leHQpO1xuICAgICAgICBuZXh0ID0gbm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn1cbiIsImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjb21wYXJlKSB7XG4gIGlmICghY29tcGFyZSkgY29tcGFyZSA9IGFzY2VuZGluZztcblxuICBmdW5jdGlvbiBjb21wYXJlTm9kZShhLCBiKSB7XG4gICAgcmV0dXJuIGEgJiYgYiA/IGNvbXBhcmUoYS5fX2RhdGFfXywgYi5fX2RhdGFfXykgOiAhYSAtICFiO1xuICB9XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgc29ydGdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc29ydGdyb3VwID0gc29ydGdyb3Vwc1tqXSA9IG5ldyBBcnJheShuKSwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgICAgc29ydGdyb3VwW2ldID0gbm9kZTtcbiAgICAgIH1cbiAgICB9XG4gICAgc29ydGdyb3VwLnNvcnQoY29tcGFyZU5vZGUpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oc29ydGdyb3VwcywgdGhpcy5fcGFyZW50cykub3JkZXIoKTtcbn1cblxuZnVuY3Rpb24gYXNjZW5kaW5nKGEsIGIpIHtcbiAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiBhID49IGIgPyAwIDogTmFOO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1swXTtcbiAgYXJndW1lbnRzWzBdID0gdGhpcztcbiAgY2FsbGJhY2suYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgcmV0dXJuIHRoaXM7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgdmFyIG5vZGVzID0gbmV3IEFycmF5KHRoaXMuc2l6ZSgpKSwgaSA9IC0xO1xuICB0aGlzLmVhY2goZnVuY3Rpb24oKSB7IG5vZGVzWysraV0gPSB0aGlzOyB9KTtcbiAgcmV0dXJuIG5vZGVzO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBqID0gMCwgbSA9IGdyb3Vwcy5sZW5ndGg7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgaSA9IDAsIG4gPSBncm91cC5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIHZhciBub2RlID0gZ3JvdXBbaV07XG4gICAgICBpZiAobm9kZSkgcmV0dXJuIG5vZGU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgdmFyIHNpemUgPSAwO1xuICB0aGlzLmVhY2goZnVuY3Rpb24oKSB7ICsrc2l6ZTsgfSk7XG4gIHJldHVybiBzaXplO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiAhdGhpcy5ub2RlKCk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgaiA9IDAsIG0gPSBncm91cHMubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIGkgPSAwLCBuID0gZ3JvdXAubGVuZ3RoLCBub2RlOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSBjYWxsYmFjay5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn1cbiIsImltcG9ydCBuYW1lc3BhY2UgZnJvbSBcIi4uL25hbWVzcGFjZVwiO1xuXG5mdW5jdGlvbiBhdHRyUmVtb3ZlKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyUmVtb3ZlTlMoZnVsbG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVtb3ZlQXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckNvbnN0YW50KG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJDb25zdGFudE5TKGZ1bGxuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwsIHZhbHVlKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHYgPT0gbnVsbCkgdGhpcy5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgZWxzZSB0aGlzLnNldEF0dHJpYnV0ZShuYW1lLCB2KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckZ1bmN0aW9uTlMoZnVsbG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHYgPT0gbnVsbCkgdGhpcy5yZW1vdmVBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICAgIGVsc2UgdGhpcy5zZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwsIHYpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB2YXIgZnVsbG5hbWUgPSBuYW1lc3BhY2UobmFtZSk7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLm5vZGUoKTtcbiAgICByZXR1cm4gZnVsbG5hbWUubG9jYWxcbiAgICAgICAgPyBub2RlLmdldEF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbClcbiAgICAgICAgOiBub2RlLmdldEF0dHJpYnV0ZShmdWxsbmFtZSk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsXG4gICAgICA/IChmdWxsbmFtZS5sb2NhbCA/IGF0dHJSZW1vdmVOUyA6IGF0dHJSZW1vdmUpIDogKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IChmdWxsbmFtZS5sb2NhbCA/IGF0dHJGdW5jdGlvbk5TIDogYXR0ckZ1bmN0aW9uKVxuICAgICAgOiAoZnVsbG5hbWUubG9jYWwgPyBhdHRyQ29uc3RhbnROUyA6IGF0dHJDb25zdGFudCkpKShmdWxsbmFtZSwgdmFsdWUpKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5vZGUpIHtcbiAgcmV0dXJuIChub2RlLm93bmVyRG9jdW1lbnQgJiYgbm9kZS5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3KSAvLyBub2RlIGlzIGEgTm9kZVxuICAgICAgfHwgKG5vZGUuZG9jdW1lbnQgJiYgbm9kZSkgLy8gbm9kZSBpcyBhIFdpbmRvd1xuICAgICAgfHwgbm9kZS5kZWZhdWx0VmlldzsgLy8gbm9kZSBpcyBhIERvY3VtZW50XG59XG4iLCJpbXBvcnQgZGVmYXVsdFZpZXcgZnJvbSBcIi4uL3dpbmRvd1wiO1xuXG5mdW5jdGlvbiBzdHlsZVJlbW92ZShuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzdHlsZUNvbnN0YW50KG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdHlsZS5zZXRQcm9wZXJ0eShuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzdHlsZUZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMuc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gICAgZWxzZSB0aGlzLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIHYsIHByaW9yaXR5KTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID4gMVxuICAgICAgPyB0aGlzLmVhY2goKHZhbHVlID09IG51bGxcbiAgICAgICAgICAgID8gc3R5bGVSZW1vdmUgOiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICAgICAgPyBzdHlsZUZ1bmN0aW9uXG4gICAgICAgICAgICA6IHN0eWxlQ29uc3RhbnQpKG5hbWUsIHZhbHVlLCBwcmlvcml0eSA9PSBudWxsID8gXCJcIiA6IHByaW9yaXR5KSlcbiAgICAgIDogc3R5bGVWYWx1ZSh0aGlzLm5vZGUoKSwgbmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHlsZVZhbHVlKG5vZGUsIG5hbWUpIHtcbiAgcmV0dXJuIG5vZGUuc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKVxuICAgICAgfHwgZGVmYXVsdFZpZXcobm9kZSkuZ2V0Q29tcHV0ZWRTdHlsZShub2RlLCBudWxsKS5nZXRQcm9wZXJ0eVZhbHVlKG5hbWUpO1xufVxuIiwiZnVuY3Rpb24gcHJvcGVydHlSZW1vdmUobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgZGVsZXRlIHRoaXNbbmFtZV07XG4gIH07XG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5Q29uc3RhbnQobmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXNbbmFtZV0gPSB2YWx1ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcHJvcGVydHlGdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIGRlbGV0ZSB0aGlzW25hbWVdO1xuICAgIGVsc2UgdGhpc1tuYW1lXSA9IHY7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID4gMVxuICAgICAgPyB0aGlzLmVhY2goKHZhbHVlID09IG51bGxcbiAgICAgICAgICA/IHByb3BlcnR5UmVtb3ZlIDogdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IHByb3BlcnR5RnVuY3Rpb25cbiAgICAgICAgICA6IHByb3BlcnR5Q29uc3RhbnQpKG5hbWUsIHZhbHVlKSlcbiAgICAgIDogdGhpcy5ub2RlKClbbmFtZV07XG59XG4iLCJmdW5jdGlvbiBjbGFzc0FycmF5KHN0cmluZykge1xuICByZXR1cm4gc3RyaW5nLnRyaW0oKS5zcGxpdCgvXnxcXHMrLyk7XG59XG5cbmZ1bmN0aW9uIGNsYXNzTGlzdChub2RlKSB7XG4gIHJldHVybiBub2RlLmNsYXNzTGlzdCB8fCBuZXcgQ2xhc3NMaXN0KG5vZGUpO1xufVxuXG5mdW5jdGlvbiBDbGFzc0xpc3Qobm9kZSkge1xuICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgdGhpcy5fbmFtZXMgPSBjbGFzc0FycmF5KG5vZGUuZ2V0QXR0cmlidXRlKFwiY2xhc3NcIikgfHwgXCJcIik7XG59XG5cbkNsYXNzTGlzdC5wcm90b3R5cGUgPSB7XG4gIGFkZDogZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBpID0gdGhpcy5fbmFtZXMuaW5kZXhPZihuYW1lKTtcbiAgICBpZiAoaSA8IDApIHtcbiAgICAgIHRoaXMuX25hbWVzLnB1c2gobmFtZSk7XG4gICAgICB0aGlzLl9ub2RlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIHRoaXMuX25hbWVzLmpvaW4oXCIgXCIpKTtcbiAgICB9XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBpID0gdGhpcy5fbmFtZXMuaW5kZXhPZihuYW1lKTtcbiAgICBpZiAoaSA+PSAwKSB7XG4gICAgICB0aGlzLl9uYW1lcy5zcGxpY2UoaSwgMSk7XG4gICAgICB0aGlzLl9ub2RlLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIHRoaXMuX25hbWVzLmpvaW4oXCIgXCIpKTtcbiAgICB9XG4gIH0sXG4gIGNvbnRhaW5zOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX25hbWVzLmluZGV4T2YobmFtZSkgPj0gMDtcbiAgfVxufTtcblxuZnVuY3Rpb24gY2xhc3NlZEFkZChub2RlLCBuYW1lcykge1xuICB2YXIgbGlzdCA9IGNsYXNzTGlzdChub2RlKSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICB3aGlsZSAoKytpIDwgbikgbGlzdC5hZGQobmFtZXNbaV0pO1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkUmVtb3ZlKG5vZGUsIG5hbWVzKSB7XG4gIHZhciBsaXN0ID0gY2xhc3NMaXN0KG5vZGUpLCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gIHdoaWxlICgrK2kgPCBuKSBsaXN0LnJlbW92ZShuYW1lc1tpXSk7XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRUcnVlKG5hbWVzKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBjbGFzc2VkQWRkKHRoaXMsIG5hbWVzKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gY2xhc3NlZEZhbHNlKG5hbWVzKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBjbGFzc2VkUmVtb3ZlKHRoaXMsIG5hbWVzKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gY2xhc3NlZEZ1bmN0aW9uKG5hbWVzLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgKHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgPyBjbGFzc2VkQWRkIDogY2xhc3NlZFJlbW92ZSkodGhpcywgbmFtZXMpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB2YXIgbmFtZXMgPSBjbGFzc0FycmF5KG5hbWUgKyBcIlwiKTtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICB2YXIgbGlzdCA9IGNsYXNzTGlzdCh0aGlzLm5vZGUoKSksIGkgPSAtMSwgbiA9IG5hbWVzLmxlbmd0aDtcbiAgICB3aGlsZSAoKytpIDwgbikgaWYgKCFsaXN0LmNvbnRhaW5zKG5hbWVzW2ldKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZWFjaCgodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gY2xhc3NlZEZ1bmN0aW9uIDogdmFsdWVcbiAgICAgID8gY2xhc3NlZFRydWVcbiAgICAgIDogY2xhc3NlZEZhbHNlKShuYW1lcywgdmFsdWUpKTtcbn1cbiIsImZ1bmN0aW9uIHRleHRSZW1vdmUoKSB7XG4gIHRoaXMudGV4dENvbnRlbnQgPSBcIlwiO1xufVxuXG5mdW5jdGlvbiB0ZXh0Q29uc3RhbnQodmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdGV4dEZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy50ZXh0Q29udGVudCA9IHYgPT0gbnVsbCA/IFwiXCIgOiB2O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLmVhY2godmFsdWUgPT0gbnVsbFxuICAgICAgICAgID8gdGV4dFJlbW92ZSA6ICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICAgID8gdGV4dEZ1bmN0aW9uXG4gICAgICAgICAgOiB0ZXh0Q29uc3RhbnQpKHZhbHVlKSlcbiAgICAgIDogdGhpcy5ub2RlKCkudGV4dENvbnRlbnQ7XG59XG4iLCJmdW5jdGlvbiBodG1sUmVtb3ZlKCkge1xuICB0aGlzLmlubmVySFRNTCA9IFwiXCI7XG59XG5cbmZ1bmN0aW9uIGh0bWxDb25zdGFudCh2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gaHRtbEZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy5pbm5lckhUTUwgPSB2ID09IG51bGwgPyBcIlwiIDogdjtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5lYWNoKHZhbHVlID09IG51bGxcbiAgICAgICAgICA/IGh0bWxSZW1vdmUgOiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IGh0bWxGdW5jdGlvblxuICAgICAgICAgIDogaHRtbENvbnN0YW50KSh2YWx1ZSkpXG4gICAgICA6IHRoaXMubm9kZSgpLmlubmVySFRNTDtcbn1cbiIsImZ1bmN0aW9uIHJhaXNlKCkge1xuICBpZiAodGhpcy5uZXh0U2libGluZykgdGhpcy5wYXJlbnROb2RlLmFwcGVuZENoaWxkKHRoaXMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaChyYWlzZSk7XG59XG4iLCJmdW5jdGlvbiBsb3dlcigpIHtcbiAgaWYgKHRoaXMucHJldmlvdXNTaWJsaW5nKSB0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMsIHRoaXMucGFyZW50Tm9kZS5maXJzdENoaWxkKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVhY2gobG93ZXIpO1xufVxuIiwiaW1wb3J0IGNyZWF0b3IgZnJvbSBcIi4uL2NyZWF0b3JcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSkge1xuICB2YXIgY3JlYXRlID0gdHlwZW9mIG5hbWUgPT09IFwiZnVuY3Rpb25cIiA/IG5hbWUgOiBjcmVhdG9yKG5hbWUpO1xuICByZXR1cm4gdGhpcy5zZWxlY3QoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwZW5kQ2hpbGQoY3JlYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICB9KTtcbn1cbiIsImltcG9ydCBjcmVhdG9yIGZyb20gXCIuLi9jcmVhdG9yXCI7XG5pbXBvcnQgc2VsZWN0b3IgZnJvbSBcIi4uL3NlbGVjdG9yXCI7XG5cbmZ1bmN0aW9uIGNvbnN0YW50TnVsbCgpIHtcbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIGJlZm9yZSkge1xuICB2YXIgY3JlYXRlID0gdHlwZW9mIG5hbWUgPT09IFwiZnVuY3Rpb25cIiA/IG5hbWUgOiBjcmVhdG9yKG5hbWUpLFxuICAgICAgc2VsZWN0ID0gYmVmb3JlID09IG51bGwgPyBjb25zdGFudE51bGwgOiB0eXBlb2YgYmVmb3JlID09PSBcImZ1bmN0aW9uXCIgPyBiZWZvcmUgOiBzZWxlY3RvcihiZWZvcmUpO1xuICByZXR1cm4gdGhpcy5zZWxlY3QoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5zZXJ0QmVmb3JlKGNyZWF0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpLCBzZWxlY3QuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCBudWxsKTtcbiAgfSk7XG59XG4iLCJmdW5jdGlvbiByZW1vdmUoKSB7XG4gIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudE5vZGU7XG4gIGlmIChwYXJlbnQpIHBhcmVudC5yZW1vdmVDaGlsZCh0aGlzKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVhY2gocmVtb3ZlKTtcbn1cbiIsImZ1bmN0aW9uIHNlbGVjdGlvbl9jbG9uZVNoYWxsb3coKSB7XG4gIHJldHVybiB0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuY2xvbmVOb2RlKGZhbHNlKSwgdGhpcy5uZXh0U2libGluZyk7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdGlvbl9jbG9uZURlZXAoKSB7XG4gIHJldHVybiB0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuY2xvbmVOb2RlKHRydWUpLCB0aGlzLm5leHRTaWJsaW5nKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oZGVlcCkge1xuICByZXR1cm4gdGhpcy5zZWxlY3QoZGVlcCA/IHNlbGVjdGlvbl9jbG9uZURlZXAgOiBzZWxlY3Rpb25fY2xvbmVTaGFsbG93KTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMucHJvcGVydHkoXCJfX2RhdGFfX1wiLCB2YWx1ZSlcbiAgICAgIDogdGhpcy5ub2RlKCkuX19kYXRhX187XG59XG4iLCJ2YXIgZmlsdGVyRXZlbnRzID0ge307XG5cbmV4cG9ydCB2YXIgZXZlbnQgPSBudWxsO1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICBpZiAoIShcIm9ubW91c2VlbnRlclwiIGluIGVsZW1lbnQpKSB7XG4gICAgZmlsdGVyRXZlbnRzID0ge21vdXNlZW50ZXI6IFwibW91c2VvdmVyXCIsIG1vdXNlbGVhdmU6IFwibW91c2VvdXRcIn07XG4gIH1cbn1cblxuZnVuY3Rpb24gZmlsdGVyQ29udGV4dExpc3RlbmVyKGxpc3RlbmVyLCBpbmRleCwgZ3JvdXApIHtcbiAgbGlzdGVuZXIgPSBjb250ZXh0TGlzdGVuZXIobGlzdGVuZXIsIGluZGV4LCBncm91cCk7XG4gIHJldHVybiBmdW5jdGlvbihldmVudCkge1xuICAgIHZhciByZWxhdGVkID0gZXZlbnQucmVsYXRlZFRhcmdldDtcbiAgICBpZiAoIXJlbGF0ZWQgfHwgKHJlbGF0ZWQgIT09IHRoaXMgJiYgIShyZWxhdGVkLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uKHRoaXMpICYgOCkpKSB7XG4gICAgICBsaXN0ZW5lci5jYWxsKHRoaXMsIGV2ZW50KTtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNvbnRleHRMaXN0ZW5lcihsaXN0ZW5lciwgaW5kZXgsIGdyb3VwKSB7XG4gIHJldHVybiBmdW5jdGlvbihldmVudDEpIHtcbiAgICB2YXIgZXZlbnQwID0gZXZlbnQ7IC8vIEV2ZW50cyBjYW4gYmUgcmVlbnRyYW50IChlLmcuLCBmb2N1cykuXG4gICAgZXZlbnQgPSBldmVudDE7XG4gICAgdHJ5IHtcbiAgICAgIGxpc3RlbmVyLmNhbGwodGhpcywgdGhpcy5fX2RhdGFfXywgaW5kZXgsIGdyb3VwKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgZXZlbnQgPSBldmVudDA7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBwYXJzZVR5cGVuYW1lcyh0eXBlbmFtZXMpIHtcbiAgcmV0dXJuIHR5cGVuYW1lcy50cmltKCkuc3BsaXQoL158XFxzKy8pLm1hcChmdW5jdGlvbih0KSB7XG4gICAgdmFyIG5hbWUgPSBcIlwiLCBpID0gdC5pbmRleE9mKFwiLlwiKTtcbiAgICBpZiAoaSA+PSAwKSBuYW1lID0gdC5zbGljZShpICsgMSksIHQgPSB0LnNsaWNlKDAsIGkpO1xuICAgIHJldHVybiB7dHlwZTogdCwgbmFtZTogbmFtZX07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBvblJlbW92ZSh0eXBlbmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9uID0gdGhpcy5fX29uO1xuICAgIGlmICghb24pIHJldHVybjtcbiAgICBmb3IgKHZhciBqID0gMCwgaSA9IC0xLCBtID0gb24ubGVuZ3RoLCBvOyBqIDwgbTsgKytqKSB7XG4gICAgICBpZiAobyA9IG9uW2pdLCAoIXR5cGVuYW1lLnR5cGUgfHwgby50eXBlID09PSB0eXBlbmFtZS50eXBlKSAmJiBvLm5hbWUgPT09IHR5cGVuYW1lLm5hbWUpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciwgby5jYXB0dXJlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9uWysraV0gPSBvO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoKytpKSBvbi5sZW5ndGggPSBpO1xuICAgIGVsc2UgZGVsZXRlIHRoaXMuX19vbjtcbiAgfTtcbn1cblxuZnVuY3Rpb24gb25BZGQodHlwZW5hbWUsIHZhbHVlLCBjYXB0dXJlKSB7XG4gIHZhciB3cmFwID0gZmlsdGVyRXZlbnRzLmhhc093blByb3BlcnR5KHR5cGVuYW1lLnR5cGUpID8gZmlsdGVyQ29udGV4dExpc3RlbmVyIDogY29udGV4dExpc3RlbmVyO1xuICByZXR1cm4gZnVuY3Rpb24oZCwgaSwgZ3JvdXApIHtcbiAgICB2YXIgb24gPSB0aGlzLl9fb24sIG8sIGxpc3RlbmVyID0gd3JhcCh2YWx1ZSwgaSwgZ3JvdXApO1xuICAgIGlmIChvbikgZm9yICh2YXIgaiA9IDAsIG0gPSBvbi5sZW5ndGg7IGogPCBtOyArK2opIHtcbiAgICAgIGlmICgobyA9IG9uW2pdKS50eXBlID09PSB0eXBlbmFtZS50eXBlICYmIG8ubmFtZSA9PT0gdHlwZW5hbWUubmFtZSkge1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoby50eXBlLCBvLmxpc3RlbmVyLCBvLmNhcHR1cmUpO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoby50eXBlLCBvLmxpc3RlbmVyID0gbGlzdGVuZXIsIG8uY2FwdHVyZSA9IGNhcHR1cmUpO1xuICAgICAgICBvLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKHR5cGVuYW1lLnR5cGUsIGxpc3RlbmVyLCBjYXB0dXJlKTtcbiAgICBvID0ge3R5cGU6IHR5cGVuYW1lLnR5cGUsIG5hbWU6IHR5cGVuYW1lLm5hbWUsIHZhbHVlOiB2YWx1ZSwgbGlzdGVuZXI6IGxpc3RlbmVyLCBjYXB0dXJlOiBjYXB0dXJlfTtcbiAgICBpZiAoIW9uKSB0aGlzLl9fb24gPSBbb107XG4gICAgZWxzZSBvbi5wdXNoKG8pO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih0eXBlbmFtZSwgdmFsdWUsIGNhcHR1cmUpIHtcbiAgdmFyIHR5cGVuYW1lcyA9IHBhcnNlVHlwZW5hbWVzKHR5cGVuYW1lICsgXCJcIiksIGksIG4gPSB0eXBlbmFtZXMubGVuZ3RoLCB0O1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHZhciBvbiA9IHRoaXMubm9kZSgpLl9fb247XG4gICAgaWYgKG9uKSBmb3IgKHZhciBqID0gMCwgbSA9IG9uLmxlbmd0aCwgbzsgaiA8IG07ICsraikge1xuICAgICAgZm9yIChpID0gMCwgbyA9IG9uW2pdOyBpIDwgbjsgKytpKSB7XG4gICAgICAgIGlmICgodCA9IHR5cGVuYW1lc1tpXSkudHlwZSA9PT0gby50eXBlICYmIHQubmFtZSA9PT0gby5uYW1lKSB7XG4gICAgICAgICAgcmV0dXJuIG8udmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgb24gPSB2YWx1ZSA/IG9uQWRkIDogb25SZW1vdmU7XG4gIGlmIChjYXB0dXJlID09IG51bGwpIGNhcHR1cmUgPSBmYWxzZTtcbiAgZm9yIChpID0gMDsgaSA8IG47ICsraSkgdGhpcy5lYWNoKG9uKHR5cGVuYW1lc1tpXSwgdmFsdWUsIGNhcHR1cmUpKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjdXN0b21FdmVudChldmVudDEsIGxpc3RlbmVyLCB0aGF0LCBhcmdzKSB7XG4gIHZhciBldmVudDAgPSBldmVudDtcbiAgZXZlbnQxLnNvdXJjZUV2ZW50ID0gZXZlbnQ7XG4gIGV2ZW50ID0gZXZlbnQxO1xuICB0cnkge1xuICAgIHJldHVybiBsaXN0ZW5lci5hcHBseSh0aGF0LCBhcmdzKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBldmVudCA9IGV2ZW50MDtcbiAgfVxufVxuIiwiaW1wb3J0IGRlZmF1bHRWaWV3IGZyb20gXCIuLi93aW5kb3dcIjtcblxuZnVuY3Rpb24gZGlzcGF0Y2hFdmVudChub2RlLCB0eXBlLCBwYXJhbXMpIHtcbiAgdmFyIHdpbmRvdyA9IGRlZmF1bHRWaWV3KG5vZGUpLFxuICAgICAgZXZlbnQgPSB3aW5kb3cuQ3VzdG9tRXZlbnQ7XG5cbiAgaWYgKHR5cGVvZiBldmVudCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgZXZlbnQgPSBuZXcgZXZlbnQodHlwZSwgcGFyYW1zKTtcbiAgfSBlbHNlIHtcbiAgICBldmVudCA9IHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFdmVudChcIkV2ZW50XCIpO1xuICAgIGlmIChwYXJhbXMpIGV2ZW50LmluaXRFdmVudCh0eXBlLCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUpLCBldmVudC5kZXRhaWwgPSBwYXJhbXMuZGV0YWlsO1xuICAgIGVsc2UgZXZlbnQuaW5pdEV2ZW50KHR5cGUsIGZhbHNlLCBmYWxzZSk7XG4gIH1cblxuICBub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xufVxuXG5mdW5jdGlvbiBkaXNwYXRjaENvbnN0YW50KHR5cGUsIHBhcmFtcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGRpc3BhdGNoRXZlbnQodGhpcywgdHlwZSwgcGFyYW1zKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZGlzcGF0Y2hGdW5jdGlvbih0eXBlLCBwYXJhbXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkaXNwYXRjaEV2ZW50KHRoaXMsIHR5cGUsIHBhcmFtcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odHlwZSwgcGFyYW1zKSB7XG4gIHJldHVybiB0aGlzLmVhY2goKHR5cGVvZiBwYXJhbXMgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgPyBkaXNwYXRjaEZ1bmN0aW9uXG4gICAgICA6IGRpc3BhdGNoQ29uc3RhbnQpKHR5cGUsIHBhcmFtcykpO1xufVxuIiwiaW1wb3J0IHNlbGVjdGlvbl9zZWxlY3QgZnJvbSBcIi4vc2VsZWN0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX3NlbGVjdEFsbCBmcm9tIFwiLi9zZWxlY3RBbGxcIjtcbmltcG9ydCBzZWxlY3Rpb25fZmlsdGVyIGZyb20gXCIuL2ZpbHRlclwiO1xuaW1wb3J0IHNlbGVjdGlvbl9kYXRhIGZyb20gXCIuL2RhdGFcIjtcbmltcG9ydCBzZWxlY3Rpb25fZW50ZXIgZnJvbSBcIi4vZW50ZXJcIjtcbmltcG9ydCBzZWxlY3Rpb25fZXhpdCBmcm9tIFwiLi9leGl0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX21lcmdlIGZyb20gXCIuL21lcmdlXCI7XG5pbXBvcnQgc2VsZWN0aW9uX29yZGVyIGZyb20gXCIuL29yZGVyXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3NvcnQgZnJvbSBcIi4vc29ydFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9jYWxsIGZyb20gXCIuL2NhbGxcIjtcbmltcG9ydCBzZWxlY3Rpb25fbm9kZXMgZnJvbSBcIi4vbm9kZXNcIjtcbmltcG9ydCBzZWxlY3Rpb25fbm9kZSBmcm9tIFwiLi9ub2RlXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3NpemUgZnJvbSBcIi4vc2l6ZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9lbXB0eSBmcm9tIFwiLi9lbXB0eVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9lYWNoIGZyb20gXCIuL2VhY2hcIjtcbmltcG9ydCBzZWxlY3Rpb25fYXR0ciBmcm9tIFwiLi9hdHRyXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3N0eWxlIGZyb20gXCIuL3N0eWxlXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3Byb3BlcnR5IGZyb20gXCIuL3Byb3BlcnR5XCI7XG5pbXBvcnQgc2VsZWN0aW9uX2NsYXNzZWQgZnJvbSBcIi4vY2xhc3NlZFwiO1xuaW1wb3J0IHNlbGVjdGlvbl90ZXh0IGZyb20gXCIuL3RleHRcIjtcbmltcG9ydCBzZWxlY3Rpb25faHRtbCBmcm9tIFwiLi9odG1sXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3JhaXNlIGZyb20gXCIuL3JhaXNlXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2xvd2VyIGZyb20gXCIuL2xvd2VyXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2FwcGVuZCBmcm9tIFwiLi9hcHBlbmRcIjtcbmltcG9ydCBzZWxlY3Rpb25faW5zZXJ0IGZyb20gXCIuL2luc2VydFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9yZW1vdmUgZnJvbSBcIi4vcmVtb3ZlXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2Nsb25lIGZyb20gXCIuL2Nsb25lXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2RhdHVtIGZyb20gXCIuL2RhdHVtXCI7XG5pbXBvcnQgc2VsZWN0aW9uX29uIGZyb20gXCIuL29uXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2Rpc3BhdGNoIGZyb20gXCIuL2Rpc3BhdGNoXCI7XG5cbmV4cG9ydCB2YXIgcm9vdCA9IFtudWxsXTtcblxuZXhwb3J0IGZ1bmN0aW9uIFNlbGVjdGlvbihncm91cHMsIHBhcmVudHMpIHtcbiAgdGhpcy5fZ3JvdXBzID0gZ3JvdXBzO1xuICB0aGlzLl9wYXJlbnRzID0gcGFyZW50cztcbn1cblxuZnVuY3Rpb24gc2VsZWN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbihbW2RvY3VtZW50LmRvY3VtZW50RWxlbWVudF1dLCByb290KTtcbn1cblxuU2VsZWN0aW9uLnByb3RvdHlwZSA9IHNlbGVjdGlvbi5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBTZWxlY3Rpb24sXG4gIHNlbGVjdDogc2VsZWN0aW9uX3NlbGVjdCxcbiAgc2VsZWN0QWxsOiBzZWxlY3Rpb25fc2VsZWN0QWxsLFxuICBmaWx0ZXI6IHNlbGVjdGlvbl9maWx0ZXIsXG4gIGRhdGE6IHNlbGVjdGlvbl9kYXRhLFxuICBlbnRlcjogc2VsZWN0aW9uX2VudGVyLFxuICBleGl0OiBzZWxlY3Rpb25fZXhpdCxcbiAgbWVyZ2U6IHNlbGVjdGlvbl9tZXJnZSxcbiAgb3JkZXI6IHNlbGVjdGlvbl9vcmRlcixcbiAgc29ydDogc2VsZWN0aW9uX3NvcnQsXG4gIGNhbGw6IHNlbGVjdGlvbl9jYWxsLFxuICBub2Rlczogc2VsZWN0aW9uX25vZGVzLFxuICBub2RlOiBzZWxlY3Rpb25fbm9kZSxcbiAgc2l6ZTogc2VsZWN0aW9uX3NpemUsXG4gIGVtcHR5OiBzZWxlY3Rpb25fZW1wdHksXG4gIGVhY2g6IHNlbGVjdGlvbl9lYWNoLFxuICBhdHRyOiBzZWxlY3Rpb25fYXR0cixcbiAgc3R5bGU6IHNlbGVjdGlvbl9zdHlsZSxcbiAgcHJvcGVydHk6IHNlbGVjdGlvbl9wcm9wZXJ0eSxcbiAgY2xhc3NlZDogc2VsZWN0aW9uX2NsYXNzZWQsXG4gIHRleHQ6IHNlbGVjdGlvbl90ZXh0LFxuICBodG1sOiBzZWxlY3Rpb25faHRtbCxcbiAgcmFpc2U6IHNlbGVjdGlvbl9yYWlzZSxcbiAgbG93ZXI6IHNlbGVjdGlvbl9sb3dlcixcbiAgYXBwZW5kOiBzZWxlY3Rpb25fYXBwZW5kLFxuICBpbnNlcnQ6IHNlbGVjdGlvbl9pbnNlcnQsXG4gIHJlbW92ZTogc2VsZWN0aW9uX3JlbW92ZSxcbiAgY2xvbmU6IHNlbGVjdGlvbl9jbG9uZSxcbiAgZGF0dW06IHNlbGVjdGlvbl9kYXR1bSxcbiAgb246IHNlbGVjdGlvbl9vbixcbiAgZGlzcGF0Y2g6IHNlbGVjdGlvbl9kaXNwYXRjaFxufTtcblxuZXhwb3J0IGRlZmF1bHQgc2VsZWN0aW9uO1xuIiwiaW1wb3J0IHtTZWxlY3Rpb24sIHJvb3R9IGZyb20gXCIuL3NlbGVjdGlvbi9pbmRleFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3Rvcikge1xuICByZXR1cm4gdHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiXG4gICAgICA/IG5ldyBTZWxlY3Rpb24oW1tkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKV1dLCBbZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XSlcbiAgICAgIDogbmV3IFNlbGVjdGlvbihbW3NlbGVjdG9yXV0sIHJvb3QpO1xufVxuIiwiaW1wb3J0IHtldmVudH0gZnJvbSBcIi4vc2VsZWN0aW9uL29uXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgY3VycmVudCA9IGV2ZW50LCBzb3VyY2U7XG4gIHdoaWxlIChzb3VyY2UgPSBjdXJyZW50LnNvdXJjZUV2ZW50KSBjdXJyZW50ID0gc291cmNlO1xuICByZXR1cm4gY3VycmVudDtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5vZGUsIGV2ZW50KSB7XG4gIHZhciBzdmcgPSBub2RlLm93bmVyU1ZHRWxlbWVudCB8fCBub2RlO1xuXG4gIGlmIChzdmcuY3JlYXRlU1ZHUG9pbnQpIHtcbiAgICB2YXIgcG9pbnQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKTtcbiAgICBwb2ludC54ID0gZXZlbnQuY2xpZW50WCwgcG9pbnQueSA9IGV2ZW50LmNsaWVudFk7XG4gICAgcG9pbnQgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obm9kZS5nZXRTY3JlZW5DVE0oKS5pbnZlcnNlKCkpO1xuICAgIHJldHVybiBbcG9pbnQueCwgcG9pbnQueV07XG4gIH1cblxuICB2YXIgcmVjdCA9IG5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIHJldHVybiBbZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdCAtIG5vZGUuY2xpZW50TGVmdCwgZXZlbnQuY2xpZW50WSAtIHJlY3QudG9wIC0gbm9kZS5jbGllbnRUb3BdO1xufVxuIiwiaW1wb3J0IHNvdXJjZUV2ZW50IGZyb20gXCIuL3NvdXJjZUV2ZW50XCI7XG5pbXBvcnQgcG9pbnQgZnJvbSBcIi4vcG9pbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obm9kZSkge1xuICB2YXIgZXZlbnQgPSBzb3VyY2VFdmVudCgpO1xuICBpZiAoZXZlbnQuY2hhbmdlZFRvdWNoZXMpIGV2ZW50ID0gZXZlbnQuY2hhbmdlZFRvdWNoZXNbMF07XG4gIHJldHVybiBwb2ludChub2RlLCBldmVudCk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogYSA+PSBiID8gMCA6IE5hTjtcbn1cbiIsImltcG9ydCBhc2NlbmRpbmcgZnJvbSBcIi4vYXNjZW5kaW5nXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbXBhcmUpIHtcbiAgaWYgKGNvbXBhcmUubGVuZ3RoID09PSAxKSBjb21wYXJlID0gYXNjZW5kaW5nQ29tcGFyYXRvcihjb21wYXJlKTtcbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBmdW5jdGlvbihhLCB4LCBsbywgaGkpIHtcbiAgICAgIGlmIChsbyA9PSBudWxsKSBsbyA9IDA7XG4gICAgICBpZiAoaGkgPT0gbnVsbCkgaGkgPSBhLmxlbmd0aDtcbiAgICAgIHdoaWxlIChsbyA8IGhpKSB7XG4gICAgICAgIHZhciBtaWQgPSBsbyArIGhpID4+PiAxO1xuICAgICAgICBpZiAoY29tcGFyZShhW21pZF0sIHgpIDwgMCkgbG8gPSBtaWQgKyAxO1xuICAgICAgICBlbHNlIGhpID0gbWlkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxvO1xuICAgIH0sXG4gICAgcmlnaHQ6IGZ1bmN0aW9uKGEsIHgsIGxvLCBoaSkge1xuICAgICAgaWYgKGxvID09IG51bGwpIGxvID0gMDtcbiAgICAgIGlmIChoaSA9PSBudWxsKSBoaSA9IGEubGVuZ3RoO1xuICAgICAgd2hpbGUgKGxvIDwgaGkpIHtcbiAgICAgICAgdmFyIG1pZCA9IGxvICsgaGkgPj4+IDE7XG4gICAgICAgIGlmIChjb21wYXJlKGFbbWlkXSwgeCkgPiAwKSBoaSA9IG1pZDtcbiAgICAgICAgZWxzZSBsbyA9IG1pZCArIDE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbG87XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBhc2NlbmRpbmdDb21wYXJhdG9yKGYpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGQsIHgpIHtcbiAgICByZXR1cm4gYXNjZW5kaW5nKGYoZCksIHgpO1xuICB9O1xufVxuIiwiaW1wb3J0IGFzY2VuZGluZyBmcm9tIFwiLi9hc2NlbmRpbmdcIjtcbmltcG9ydCBiaXNlY3RvciBmcm9tIFwiLi9iaXNlY3RvclwiO1xuXG52YXIgYXNjZW5kaW5nQmlzZWN0ID0gYmlzZWN0b3IoYXNjZW5kaW5nKTtcbmV4cG9ydCB2YXIgYmlzZWN0UmlnaHQgPSBhc2NlbmRpbmdCaXNlY3QucmlnaHQ7XG5leHBvcnQgdmFyIGJpc2VjdExlZnQgPSBhc2NlbmRpbmdCaXNlY3QubGVmdDtcbmV4cG9ydCBkZWZhdWx0IGJpc2VjdFJpZ2h0O1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4geCA9PT0gbnVsbCA/IE5hTiA6ICt4O1xufVxuIiwiaW1wb3J0IG51bWJlciBmcm9tIFwiLi9udW1iZXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWVzLCB2YWx1ZW9mKSB7XG4gIHZhciBuID0gdmFsdWVzLmxlbmd0aCxcbiAgICAgIG0gPSAwLFxuICAgICAgaSA9IC0xLFxuICAgICAgbWVhbiA9IDAsXG4gICAgICB2YWx1ZSxcbiAgICAgIGRlbHRhLFxuICAgICAgc3VtID0gMDtcblxuICBpZiAodmFsdWVvZiA9PSBudWxsKSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGlmICghaXNOYU4odmFsdWUgPSBudW1iZXIodmFsdWVzW2ldKSkpIHtcbiAgICAgICAgZGVsdGEgPSB2YWx1ZSAtIG1lYW47XG4gICAgICAgIG1lYW4gKz0gZGVsdGEgLyArK207XG4gICAgICAgIHN1bSArPSBkZWx0YSAqICh2YWx1ZSAtIG1lYW4pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGVsc2Uge1xuICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICBpZiAoIWlzTmFOKHZhbHVlID0gbnVtYmVyKHZhbHVlb2YodmFsdWVzW2ldLCBpLCB2YWx1ZXMpKSkpIHtcbiAgICAgICAgZGVsdGEgPSB2YWx1ZSAtIG1lYW47XG4gICAgICAgIG1lYW4gKz0gZGVsdGEgLyArK207XG4gICAgICAgIHN1bSArPSBkZWx0YSAqICh2YWx1ZSAtIG1lYW4pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChtID4gMSkgcmV0dXJuIHN1bSAvIChtIC0gMSk7XG59XG4iLCJpbXBvcnQgdmFyaWFuY2UgZnJvbSBcIi4vdmFyaWFuY2VcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYXJyYXksIGYpIHtcbiAgdmFyIHYgPSB2YXJpYW5jZShhcnJheSwgZik7XG4gIHJldHVybiB2ID8gTWF0aC5zcXJ0KHYpIDogdjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlcywgdmFsdWVvZikge1xuICB2YXIgbiA9IHZhbHVlcy5sZW5ndGgsXG4gICAgICBpID0gLTEsXG4gICAgICB2YWx1ZSxcbiAgICAgIG1pbixcbiAgICAgIG1heDtcblxuICBpZiAodmFsdWVvZiA9PSBudWxsKSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gRmluZCB0aGUgZmlyc3QgY29tcGFyYWJsZSB2YWx1ZS5cbiAgICAgIGlmICgodmFsdWUgPSB2YWx1ZXNbaV0pICE9IG51bGwgJiYgdmFsdWUgPj0gdmFsdWUpIHtcbiAgICAgICAgbWluID0gbWF4ID0gdmFsdWU7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIENvbXBhcmUgdGhlIHJlbWFpbmluZyB2YWx1ZXMuXG4gICAgICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlc1tpXSkgIT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKG1pbiA+IHZhbHVlKSBtaW4gPSB2YWx1ZTtcbiAgICAgICAgICAgIGlmIChtYXggPCB2YWx1ZSkgbWF4ID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZWxzZSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gRmluZCB0aGUgZmlyc3QgY29tcGFyYWJsZSB2YWx1ZS5cbiAgICAgIGlmICgodmFsdWUgPSB2YWx1ZW9mKHZhbHVlc1tpXSwgaSwgdmFsdWVzKSkgIT0gbnVsbCAmJiB2YWx1ZSA+PSB2YWx1ZSkge1xuICAgICAgICBtaW4gPSBtYXggPSB2YWx1ZTtcbiAgICAgICAgd2hpbGUgKCsraSA8IG4pIHsgLy8gQ29tcGFyZSB0aGUgcmVtYWluaW5nIHZhbHVlcy5cbiAgICAgICAgICBpZiAoKHZhbHVlID0gdmFsdWVvZih2YWx1ZXNbaV0sIGksIHZhbHVlcykpICE9IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChtaW4gPiB2YWx1ZSkgbWluID0gdmFsdWU7XG4gICAgICAgICAgICBpZiAobWF4IDwgdmFsdWUpIG1heCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbbWluLCBtYXhdO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgc3RhcnQgPSArc3RhcnQsIHN0b3AgPSArc3RvcCwgc3RlcCA9IChuID0gYXJndW1lbnRzLmxlbmd0aCkgPCAyID8gKHN0b3AgPSBzdGFydCwgc3RhcnQgPSAwLCAxKSA6IG4gPCAzID8gMSA6ICtzdGVwO1xuXG4gIHZhciBpID0gLTEsXG4gICAgICBuID0gTWF0aC5tYXgoMCwgTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCkpIHwgMCxcbiAgICAgIHJhbmdlID0gbmV3IEFycmF5KG4pO1xuXG4gIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgcmFuZ2VbaV0gPSBzdGFydCArIGkgKiBzdGVwO1xuICB9XG5cbiAgcmV0dXJuIHJhbmdlO1xufVxuIiwidmFyIGUxMCA9IE1hdGguc3FydCg1MCksXG4gICAgZTUgPSBNYXRoLnNxcnQoMTApLFxuICAgIGUyID0gTWF0aC5zcXJ0KDIpO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzdGFydCwgc3RvcCwgY291bnQpIHtcbiAgdmFyIHJldmVyc2UsXG4gICAgICBpID0gLTEsXG4gICAgICBuLFxuICAgICAgdGlja3MsXG4gICAgICBzdGVwO1xuXG4gIHN0b3AgPSArc3RvcCwgc3RhcnQgPSArc3RhcnQsIGNvdW50ID0gK2NvdW50O1xuICBpZiAoc3RhcnQgPT09IHN0b3AgJiYgY291bnQgPiAwKSByZXR1cm4gW3N0YXJ0XTtcbiAgaWYgKHJldmVyc2UgPSBzdG9wIDwgc3RhcnQpIG4gPSBzdGFydCwgc3RhcnQgPSBzdG9wLCBzdG9wID0gbjtcbiAgaWYgKChzdGVwID0gdGlja0luY3JlbWVudChzdGFydCwgc3RvcCwgY291bnQpKSA9PT0gMCB8fCAhaXNGaW5pdGUoc3RlcCkpIHJldHVybiBbXTtcblxuICBpZiAoc3RlcCA+IDApIHtcbiAgICBzdGFydCA9IE1hdGguY2VpbChzdGFydCAvIHN0ZXApO1xuICAgIHN0b3AgPSBNYXRoLmZsb29yKHN0b3AgLyBzdGVwKTtcbiAgICB0aWNrcyA9IG5ldyBBcnJheShuID0gTWF0aC5jZWlsKHN0b3AgLSBzdGFydCArIDEpKTtcbiAgICB3aGlsZSAoKytpIDwgbikgdGlja3NbaV0gPSAoc3RhcnQgKyBpKSAqIHN0ZXA7XG4gIH0gZWxzZSB7XG4gICAgc3RhcnQgPSBNYXRoLmZsb29yKHN0YXJ0ICogc3RlcCk7XG4gICAgc3RvcCA9IE1hdGguY2VpbChzdG9wICogc3RlcCk7XG4gICAgdGlja3MgPSBuZXcgQXJyYXkobiA9IE1hdGguY2VpbChzdGFydCAtIHN0b3AgKyAxKSk7XG4gICAgd2hpbGUgKCsraSA8IG4pIHRpY2tzW2ldID0gKHN0YXJ0IC0gaSkgLyBzdGVwO1xuICB9XG5cbiAgaWYgKHJldmVyc2UpIHRpY2tzLnJldmVyc2UoKTtcblxuICByZXR1cm4gdGlja3M7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0aWNrSW5jcmVtZW50KHN0YXJ0LCBzdG9wLCBjb3VudCkge1xuICB2YXIgc3RlcCA9IChzdG9wIC0gc3RhcnQpIC8gTWF0aC5tYXgoMCwgY291bnQpLFxuICAgICAgcG93ZXIgPSBNYXRoLmZsb29yKE1hdGgubG9nKHN0ZXApIC8gTWF0aC5MTjEwKSxcbiAgICAgIGVycm9yID0gc3RlcCAvIE1hdGgucG93KDEwLCBwb3dlcik7XG4gIHJldHVybiBwb3dlciA+PSAwXG4gICAgICA/IChlcnJvciA+PSBlMTAgPyAxMCA6IGVycm9yID49IGU1ID8gNSA6IGVycm9yID49IGUyID8gMiA6IDEpICogTWF0aC5wb3coMTAsIHBvd2VyKVxuICAgICAgOiAtTWF0aC5wb3coMTAsIC1wb3dlcikgLyAoZXJyb3IgPj0gZTEwID8gMTAgOiBlcnJvciA+PSBlNSA/IDUgOiBlcnJvciA+PSBlMiA/IDIgOiAxKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRpY2tTdGVwKHN0YXJ0LCBzdG9wLCBjb3VudCkge1xuICB2YXIgc3RlcDAgPSBNYXRoLmFicyhzdG9wIC0gc3RhcnQpIC8gTWF0aC5tYXgoMCwgY291bnQpLFxuICAgICAgc3RlcDEgPSBNYXRoLnBvdygxMCwgTWF0aC5mbG9vcihNYXRoLmxvZyhzdGVwMCkgLyBNYXRoLkxOMTApKSxcbiAgICAgIGVycm9yID0gc3RlcDAgLyBzdGVwMTtcbiAgaWYgKGVycm9yID49IGUxMCkgc3RlcDEgKj0gMTA7XG4gIGVsc2UgaWYgKGVycm9yID49IGU1KSBzdGVwMSAqPSA1O1xuICBlbHNlIGlmIChlcnJvciA+PSBlMikgc3RlcDEgKj0gMjtcbiAgcmV0dXJuIHN0b3AgPCBzdGFydCA/IC1zdGVwMSA6IHN0ZXAxO1xufVxuIiwiaW1wb3J0IG51bWJlciBmcm9tIFwiLi9udW1iZXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWVzLCBwLCB2YWx1ZW9mKSB7XG4gIGlmICh2YWx1ZW9mID09IG51bGwpIHZhbHVlb2YgPSBudW1iZXI7XG4gIGlmICghKG4gPSB2YWx1ZXMubGVuZ3RoKSkgcmV0dXJuO1xuICBpZiAoKHAgPSArcCkgPD0gMCB8fCBuIDwgMikgcmV0dXJuICt2YWx1ZW9mKHZhbHVlc1swXSwgMCwgdmFsdWVzKTtcbiAgaWYgKHAgPj0gMSkgcmV0dXJuICt2YWx1ZW9mKHZhbHVlc1tuIC0gMV0sIG4gLSAxLCB2YWx1ZXMpO1xuICB2YXIgbixcbiAgICAgIGkgPSAobiAtIDEpICogcCxcbiAgICAgIGkwID0gTWF0aC5mbG9vcihpKSxcbiAgICAgIHZhbHVlMCA9ICt2YWx1ZW9mKHZhbHVlc1tpMF0sIGkwLCB2YWx1ZXMpLFxuICAgICAgdmFsdWUxID0gK3ZhbHVlb2YodmFsdWVzW2kwICsgMV0sIGkwICsgMSwgdmFsdWVzKTtcbiAgcmV0dXJuIHZhbHVlMCArICh2YWx1ZTEgLSB2YWx1ZTApICogKGkgLSBpMCk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlb2YpIHtcbiAgdmFyIG4gPSB2YWx1ZXMubGVuZ3RoLFxuICAgICAgaSA9IC0xLFxuICAgICAgdmFsdWUsXG4gICAgICBtYXg7XG5cbiAgaWYgKHZhbHVlb2YgPT0gbnVsbCkge1xuICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIEZpbmQgdGhlIGZpcnN0IGNvbXBhcmFibGUgdmFsdWUuXG4gICAgICBpZiAoKHZhbHVlID0gdmFsdWVzW2ldKSAhPSBudWxsICYmIHZhbHVlID49IHZhbHVlKSB7XG4gICAgICAgIG1heCA9IHZhbHVlO1xuICAgICAgICB3aGlsZSAoKytpIDwgbikgeyAvLyBDb21wYXJlIHRoZSByZW1haW5pbmcgdmFsdWVzLlxuICAgICAgICAgIGlmICgodmFsdWUgPSB2YWx1ZXNbaV0pICE9IG51bGwgJiYgdmFsdWUgPiBtYXgpIHtcbiAgICAgICAgICAgIG1heCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGVsc2Uge1xuICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIEZpbmQgdGhlIGZpcnN0IGNvbXBhcmFibGUgdmFsdWUuXG4gICAgICBpZiAoKHZhbHVlID0gdmFsdWVvZih2YWx1ZXNbaV0sIGksIHZhbHVlcykpICE9IG51bGwgJiYgdmFsdWUgPj0gdmFsdWUpIHtcbiAgICAgICAgbWF4ID0gdmFsdWU7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIENvbXBhcmUgdGhlIHJlbWFpbmluZyB2YWx1ZXMuXG4gICAgICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlb2YodmFsdWVzW2ldLCBpLCB2YWx1ZXMpKSAhPSBudWxsICYmIHZhbHVlID4gbWF4KSB7XG4gICAgICAgICAgICBtYXggPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWF4O1xufVxuIiwiaW1wb3J0IG51bWJlciBmcm9tIFwiLi9udW1iZXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWVzLCB2YWx1ZW9mKSB7XG4gIHZhciBuID0gdmFsdWVzLmxlbmd0aCxcbiAgICAgIG0gPSBuLFxuICAgICAgaSA9IC0xLFxuICAgICAgdmFsdWUsXG4gICAgICBzdW0gPSAwO1xuXG4gIGlmICh2YWx1ZW9mID09IG51bGwpIHtcbiAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgaWYgKCFpc05hTih2YWx1ZSA9IG51bWJlcih2YWx1ZXNbaV0pKSkgc3VtICs9IHZhbHVlO1xuICAgICAgZWxzZSAtLW07XG4gICAgfVxuICB9XG5cbiAgZWxzZSB7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGlmICghaXNOYU4odmFsdWUgPSBudW1iZXIodmFsdWVvZih2YWx1ZXNbaV0sIGksIHZhbHVlcykpKSkgc3VtICs9IHZhbHVlO1xuICAgICAgZWxzZSAtLW07XG4gICAgfVxuICB9XG5cbiAgaWYgKG0pIHJldHVybiBzdW0gLyBtO1xufVxuIiwiaW1wb3J0IGFzY2VuZGluZyBmcm9tIFwiLi9hc2NlbmRpbmdcIjtcbmltcG9ydCBudW1iZXIgZnJvbSBcIi4vbnVtYmVyXCI7XG5pbXBvcnQgcXVhbnRpbGUgZnJvbSBcIi4vcXVhbnRpbGVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWVzLCB2YWx1ZW9mKSB7XG4gIHZhciBuID0gdmFsdWVzLmxlbmd0aCxcbiAgICAgIGkgPSAtMSxcbiAgICAgIHZhbHVlLFxuICAgICAgbnVtYmVycyA9IFtdO1xuXG4gIGlmICh2YWx1ZW9mID09IG51bGwpIHtcbiAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgaWYgKCFpc05hTih2YWx1ZSA9IG51bWJlcih2YWx1ZXNbaV0pKSkge1xuICAgICAgICBudW1iZXJzLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGVsc2Uge1xuICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICBpZiAoIWlzTmFOKHZhbHVlID0gbnVtYmVyKHZhbHVlb2YodmFsdWVzW2ldLCBpLCB2YWx1ZXMpKSkpIHtcbiAgICAgICAgbnVtYmVycy5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcXVhbnRpbGUobnVtYmVycy5zb3J0KGFzY2VuZGluZyksIDAuNSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZXMsIHZhbHVlb2YpIHtcbiAgdmFyIG4gPSB2YWx1ZXMubGVuZ3RoLFxuICAgICAgaSA9IC0xLFxuICAgICAgdmFsdWUsXG4gICAgICBtaW47XG5cbiAgaWYgKHZhbHVlb2YgPT0gbnVsbCkge1xuICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIEZpbmQgdGhlIGZpcnN0IGNvbXBhcmFibGUgdmFsdWUuXG4gICAgICBpZiAoKHZhbHVlID0gdmFsdWVzW2ldKSAhPSBudWxsICYmIHZhbHVlID49IHZhbHVlKSB7XG4gICAgICAgIG1pbiA9IHZhbHVlO1xuICAgICAgICB3aGlsZSAoKytpIDwgbikgeyAvLyBDb21wYXJlIHRoZSByZW1haW5pbmcgdmFsdWVzLlxuICAgICAgICAgIGlmICgodmFsdWUgPSB2YWx1ZXNbaV0pICE9IG51bGwgJiYgbWluID4gdmFsdWUpIHtcbiAgICAgICAgICAgIG1pbiA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGVsc2Uge1xuICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIEZpbmQgdGhlIGZpcnN0IGNvbXBhcmFibGUgdmFsdWUuXG4gICAgICBpZiAoKHZhbHVlID0gdmFsdWVvZih2YWx1ZXNbaV0sIGksIHZhbHVlcykpICE9IG51bGwgJiYgdmFsdWUgPj0gdmFsdWUpIHtcbiAgICAgICAgbWluID0gdmFsdWU7XG4gICAgICAgIHdoaWxlICgrK2kgPCBuKSB7IC8vIENvbXBhcmUgdGhlIHJlbWFpbmluZyB2YWx1ZXMuXG4gICAgICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlb2YodmFsdWVzW2ldLCBpLCB2YWx1ZXMpKSAhPSBudWxsICYmIG1pbiA+IHZhbHVlKSB7XG4gICAgICAgICAgICBtaW4gPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWluO1xufVxuIiwiZXhwb3J0IHZhciBwcmVmaXggPSBcIiRcIjtcblxuZnVuY3Rpb24gTWFwKCkge31cblxuTWFwLnByb3RvdHlwZSA9IG1hcC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBNYXAsXG4gIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIChwcmVmaXggKyBrZXkpIGluIHRoaXM7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIHRoaXNbcHJlZml4ICsga2V5XTtcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgdGhpc1twcmVmaXggKyBrZXldID0gdmFsdWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIHJlbW92ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIHByb3BlcnR5ID0gcHJlZml4ICsga2V5O1xuICAgIHJldHVybiBwcm9wZXJ0eSBpbiB0aGlzICYmIGRlbGV0ZSB0aGlzW3Byb3BlcnR5XTtcbiAgfSxcbiAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSBkZWxldGUgdGhpc1twcm9wZXJ0eV07XG4gIH0sXG4gIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIGtleXMucHVzaChwcm9wZXJ0eS5zbGljZSgxKSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH0sXG4gIHZhbHVlczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSB2YWx1ZXMucHVzaCh0aGlzW3Byb3BlcnR5XSk7XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfSxcbiAgZW50cmllczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVudHJpZXMgPSBbXTtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkgZW50cmllcy5wdXNoKHtrZXk6IHByb3BlcnR5LnNsaWNlKDEpLCB2YWx1ZTogdGhpc1twcm9wZXJ0eV19KTtcbiAgICByZXR1cm4gZW50cmllcztcbiAgfSxcbiAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNpemUgPSAwO1xuICAgIGZvciAodmFyIHByb3BlcnR5IGluIHRoaXMpIGlmIChwcm9wZXJ0eVswXSA9PT0gcHJlZml4KSArK3NpemU7XG4gICAgcmV0dXJuIHNpemU7XG4gIH0sXG4gIGVtcHR5OiBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiB0aGlzKSBpZiAocHJvcGVydHlbMF0gPT09IHByZWZpeCkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBlYWNoOiBmdW5jdGlvbihmKSB7XG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGhpcykgaWYgKHByb3BlcnR5WzBdID09PSBwcmVmaXgpIGYodGhpc1twcm9wZXJ0eV0sIHByb3BlcnR5LnNsaWNlKDEpLCB0aGlzKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gbWFwKG9iamVjdCwgZikge1xuICB2YXIgbWFwID0gbmV3IE1hcDtcblxuICAvLyBDb3B5IGNvbnN0cnVjdG9yLlxuICBpZiAob2JqZWN0IGluc3RhbmNlb2YgTWFwKSBvYmplY3QuZWFjaChmdW5jdGlvbih2YWx1ZSwga2V5KSB7IG1hcC5zZXQoa2V5LCB2YWx1ZSk7IH0pO1xuXG4gIC8vIEluZGV4IGFycmF5IGJ5IG51bWVyaWMgaW5kZXggb3Igc3BlY2lmaWVkIGtleSBmdW5jdGlvbi5cbiAgZWxzZSBpZiAoQXJyYXkuaXNBcnJheShvYmplY3QpKSB7XG4gICAgdmFyIGkgPSAtMSxcbiAgICAgICAgbiA9IG9iamVjdC5sZW5ndGgsXG4gICAgICAgIG87XG5cbiAgICBpZiAoZiA9PSBudWxsKSB3aGlsZSAoKytpIDwgbikgbWFwLnNldChpLCBvYmplY3RbaV0pO1xuICAgIGVsc2Ugd2hpbGUgKCsraSA8IG4pIG1hcC5zZXQoZihvID0gb2JqZWN0W2ldLCBpLCBvYmplY3QpLCBvKTtcbiAgfVxuXG4gIC8vIENvbnZlcnQgb2JqZWN0IHRvIG1hcC5cbiAgZWxzZSBpZiAob2JqZWN0KSBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSBtYXAuc2V0KGtleSwgb2JqZWN0W2tleV0pO1xuXG4gIHJldHVybiBtYXA7XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1hcDtcbiIsImltcG9ydCBtYXAgZnJvbSBcIi4vbWFwXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIga2V5cyA9IFtdLFxuICAgICAgc29ydEtleXMgPSBbXSxcbiAgICAgIHNvcnRWYWx1ZXMsXG4gICAgICByb2xsdXAsXG4gICAgICBuZXN0O1xuXG4gIGZ1bmN0aW9uIGFwcGx5KGFycmF5LCBkZXB0aCwgY3JlYXRlUmVzdWx0LCBzZXRSZXN1bHQpIHtcbiAgICBpZiAoZGVwdGggPj0ga2V5cy5sZW5ndGgpIHtcbiAgICAgIGlmIChzb3J0VmFsdWVzICE9IG51bGwpIGFycmF5LnNvcnQoc29ydFZhbHVlcyk7XG4gICAgICByZXR1cm4gcm9sbHVwICE9IG51bGwgPyByb2xsdXAoYXJyYXkpIDogYXJyYXk7XG4gICAgfVxuXG4gICAgdmFyIGkgPSAtMSxcbiAgICAgICAgbiA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAga2V5ID0ga2V5c1tkZXB0aCsrXSxcbiAgICAgICAga2V5VmFsdWUsXG4gICAgICAgIHZhbHVlLFxuICAgICAgICB2YWx1ZXNCeUtleSA9IG1hcCgpLFxuICAgICAgICB2YWx1ZXMsXG4gICAgICAgIHJlc3VsdCA9IGNyZWF0ZVJlc3VsdCgpO1xuXG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGlmICh2YWx1ZXMgPSB2YWx1ZXNCeUtleS5nZXQoa2V5VmFsdWUgPSBrZXkodmFsdWUgPSBhcnJheVtpXSkgKyBcIlwiKSkge1xuICAgICAgICB2YWx1ZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZXNCeUtleS5zZXQoa2V5VmFsdWUsIFt2YWx1ZV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhbHVlc0J5S2V5LmVhY2goZnVuY3Rpb24odmFsdWVzLCBrZXkpIHtcbiAgICAgIHNldFJlc3VsdChyZXN1bHQsIGtleSwgYXBwbHkodmFsdWVzLCBkZXB0aCwgY3JlYXRlUmVzdWx0LCBzZXRSZXN1bHQpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBlbnRyaWVzKG1hcCwgZGVwdGgpIHtcbiAgICBpZiAoKytkZXB0aCA+IGtleXMubGVuZ3RoKSByZXR1cm4gbWFwO1xuICAgIHZhciBhcnJheSwgc29ydEtleSA9IHNvcnRLZXlzW2RlcHRoIC0gMV07XG4gICAgaWYgKHJvbGx1cCAhPSBudWxsICYmIGRlcHRoID49IGtleXMubGVuZ3RoKSBhcnJheSA9IG1hcC5lbnRyaWVzKCk7XG4gICAgZWxzZSBhcnJheSA9IFtdLCBtYXAuZWFjaChmdW5jdGlvbih2LCBrKSB7IGFycmF5LnB1c2goe2tleTogaywgdmFsdWVzOiBlbnRyaWVzKHYsIGRlcHRoKX0pOyB9KTtcbiAgICByZXR1cm4gc29ydEtleSAhPSBudWxsID8gYXJyYXkuc29ydChmdW5jdGlvbihhLCBiKSB7IHJldHVybiBzb3J0S2V5KGEua2V5LCBiLmtleSk7IH0pIDogYXJyYXk7XG4gIH1cblxuICByZXR1cm4gbmVzdCA9IHtcbiAgICBvYmplY3Q6IGZ1bmN0aW9uKGFycmF5KSB7IHJldHVybiBhcHBseShhcnJheSwgMCwgY3JlYXRlT2JqZWN0LCBzZXRPYmplY3QpOyB9LFxuICAgIG1hcDogZnVuY3Rpb24oYXJyYXkpIHsgcmV0dXJuIGFwcGx5KGFycmF5LCAwLCBjcmVhdGVNYXAsIHNldE1hcCk7IH0sXG4gICAgZW50cmllczogZnVuY3Rpb24oYXJyYXkpIHsgcmV0dXJuIGVudHJpZXMoYXBwbHkoYXJyYXksIDAsIGNyZWF0ZU1hcCwgc2V0TWFwKSwgMCk7IH0sXG4gICAga2V5OiBmdW5jdGlvbihkKSB7IGtleXMucHVzaChkKTsgcmV0dXJuIG5lc3Q7IH0sXG4gICAgc29ydEtleXM6IGZ1bmN0aW9uKG9yZGVyKSB7IHNvcnRLZXlzW2tleXMubGVuZ3RoIC0gMV0gPSBvcmRlcjsgcmV0dXJuIG5lc3Q7IH0sXG4gICAgc29ydFZhbHVlczogZnVuY3Rpb24ob3JkZXIpIHsgc29ydFZhbHVlcyA9IG9yZGVyOyByZXR1cm4gbmVzdDsgfSxcbiAgICByb2xsdXA6IGZ1bmN0aW9uKGYpIHsgcm9sbHVwID0gZjsgcmV0dXJuIG5lc3Q7IH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlT2JqZWN0KCkge1xuICByZXR1cm4ge307XG59XG5cbmZ1bmN0aW9uIHNldE9iamVjdChvYmplY3QsIGtleSwgdmFsdWUpIHtcbiAgb2JqZWN0W2tleV0gPSB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWFwKCkge1xuICByZXR1cm4gbWFwKCk7XG59XG5cbmZ1bmN0aW9uIHNldE1hcChtYXAsIGtleSwgdmFsdWUpIHtcbiAgbWFwLnNldChrZXksIHZhbHVlKTtcbn1cbiIsImltcG9ydCB7ZGVmYXVsdCBhcyBtYXAsIHByZWZpeH0gZnJvbSBcIi4vbWFwXCI7XG5cbmZ1bmN0aW9uIFNldCgpIHt9XG5cbnZhciBwcm90byA9IG1hcC5wcm90b3R5cGU7XG5cblNldC5wcm90b3R5cGUgPSBzZXQucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogU2V0LFxuICBoYXM6IHByb3RvLmhhcyxcbiAgYWRkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhbHVlICs9IFwiXCI7XG4gICAgdGhpc1twcmVmaXggKyB2YWx1ZV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgcmVtb3ZlOiBwcm90by5yZW1vdmUsXG4gIGNsZWFyOiBwcm90by5jbGVhcixcbiAgdmFsdWVzOiBwcm90by5rZXlzLFxuICBzaXplOiBwcm90by5zaXplLFxuICBlbXB0eTogcHJvdG8uZW1wdHksXG4gIGVhY2g6IHByb3RvLmVhY2hcbn07XG5cbmZ1bmN0aW9uIHNldChvYmplY3QsIGYpIHtcbiAgdmFyIHNldCA9IG5ldyBTZXQ7XG5cbiAgLy8gQ29weSBjb25zdHJ1Y3Rvci5cbiAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIFNldCkgb2JqZWN0LmVhY2goZnVuY3Rpb24odmFsdWUpIHsgc2V0LmFkZCh2YWx1ZSk7IH0pO1xuXG4gIC8vIE90aGVyd2lzZSwgYXNzdW1lIGl04oCZcyBhbiBhcnJheS5cbiAgZWxzZSBpZiAob2JqZWN0KSB7XG4gICAgdmFyIGkgPSAtMSwgbiA9IG9iamVjdC5sZW5ndGg7XG4gICAgaWYgKGYgPT0gbnVsbCkgd2hpbGUgKCsraSA8IG4pIHNldC5hZGQob2JqZWN0W2ldKTtcbiAgICBlbHNlIHdoaWxlICgrK2kgPCBuKSBzZXQuYWRkKGYob2JqZWN0W2ldLCBpLCBvYmplY3QpKTtcbiAgfVxuXG4gIHJldHVybiBzZXQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHNldDtcbiIsInZhciBhcnJheSA9IEFycmF5LnByb3RvdHlwZTtcblxuZXhwb3J0IHZhciBtYXAgPSBhcnJheS5tYXA7XG5leHBvcnQgdmFyIHNsaWNlID0gYXJyYXkuc2xpY2U7XG4iLCJpbXBvcnQge21hcH0gZnJvbSBcImQzLWNvbGxlY3Rpb25cIjtcbmltcG9ydCB7c2xpY2V9IGZyb20gXCIuL2FycmF5XCI7XG5cbmV4cG9ydCB2YXIgaW1wbGljaXQgPSB7bmFtZTogXCJpbXBsaWNpdFwifTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gb3JkaW5hbChyYW5nZSkge1xuICB2YXIgaW5kZXggPSBtYXAoKSxcbiAgICAgIGRvbWFpbiA9IFtdLFxuICAgICAgdW5rbm93biA9IGltcGxpY2l0O1xuXG4gIHJhbmdlID0gcmFuZ2UgPT0gbnVsbCA/IFtdIDogc2xpY2UuY2FsbChyYW5nZSk7XG5cbiAgZnVuY3Rpb24gc2NhbGUoZCkge1xuICAgIHZhciBrZXkgPSBkICsgXCJcIiwgaSA9IGluZGV4LmdldChrZXkpO1xuICAgIGlmICghaSkge1xuICAgICAgaWYgKHVua25vd24gIT09IGltcGxpY2l0KSByZXR1cm4gdW5rbm93bjtcbiAgICAgIGluZGV4LnNldChrZXksIGkgPSBkb21haW4ucHVzaChkKSk7XG4gICAgfVxuICAgIHJldHVybiByYW5nZVsoaSAtIDEpICUgcmFuZ2UubGVuZ3RoXTtcbiAgfVxuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkb21haW4uc2xpY2UoKTtcbiAgICBkb21haW4gPSBbXSwgaW5kZXggPSBtYXAoKTtcbiAgICB2YXIgaSA9IC0xLCBuID0gXy5sZW5ndGgsIGQsIGtleTtcbiAgICB3aGlsZSAoKytpIDwgbikgaWYgKCFpbmRleC5oYXMoa2V5ID0gKGQgPSBfW2ldKSArIFwiXCIpKSBpbmRleC5zZXQoa2V5LCBkb21haW4ucHVzaChkKSk7XG4gICAgcmV0dXJuIHNjYWxlO1xuICB9O1xuXG4gIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHJhbmdlID0gc2xpY2UuY2FsbChfKSwgc2NhbGUpIDogcmFuZ2Uuc2xpY2UoKTtcbiAgfTtcblxuICBzY2FsZS51bmtub3duID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHVua25vd24gPSBfLCBzY2FsZSkgOiB1bmtub3duO1xuICB9O1xuXG4gIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gb3JkaW5hbCgpXG4gICAgICAgIC5kb21haW4oZG9tYWluKVxuICAgICAgICAucmFuZ2UocmFuZ2UpXG4gICAgICAgIC51bmtub3duKHVua25vd24pO1xuICB9O1xuXG4gIHJldHVybiBzY2FsZTtcbn1cbiIsImltcG9ydCB7cmFuZ2UgYXMgc2VxdWVuY2V9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IG9yZGluYWwgZnJvbSBcIi4vb3JkaW5hbFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBiYW5kKCkge1xuICB2YXIgc2NhbGUgPSBvcmRpbmFsKCkudW5rbm93bih1bmRlZmluZWQpLFxuICAgICAgZG9tYWluID0gc2NhbGUuZG9tYWluLFxuICAgICAgb3JkaW5hbFJhbmdlID0gc2NhbGUucmFuZ2UsXG4gICAgICByYW5nZSA9IFswLCAxXSxcbiAgICAgIHN0ZXAsXG4gICAgICBiYW5kd2lkdGgsXG4gICAgICByb3VuZCA9IGZhbHNlLFxuICAgICAgcGFkZGluZ0lubmVyID0gMCxcbiAgICAgIHBhZGRpbmdPdXRlciA9IDAsXG4gICAgICBhbGlnbiA9IDAuNTtcblxuICBkZWxldGUgc2NhbGUudW5rbm93bjtcblxuICBmdW5jdGlvbiByZXNjYWxlKCkge1xuICAgIHZhciBuID0gZG9tYWluKCkubGVuZ3RoLFxuICAgICAgICByZXZlcnNlID0gcmFuZ2VbMV0gPCByYW5nZVswXSxcbiAgICAgICAgc3RhcnQgPSByYW5nZVtyZXZlcnNlIC0gMF0sXG4gICAgICAgIHN0b3AgPSByYW5nZVsxIC0gcmV2ZXJzZV07XG4gICAgc3RlcCA9IChzdG9wIC0gc3RhcnQpIC8gTWF0aC5tYXgoMSwgbiAtIHBhZGRpbmdJbm5lciArIHBhZGRpbmdPdXRlciAqIDIpO1xuICAgIGlmIChyb3VuZCkgc3RlcCA9IE1hdGguZmxvb3Ioc3RlcCk7XG4gICAgc3RhcnQgKz0gKHN0b3AgLSBzdGFydCAtIHN0ZXAgKiAobiAtIHBhZGRpbmdJbm5lcikpICogYWxpZ247XG4gICAgYmFuZHdpZHRoID0gc3RlcCAqICgxIC0gcGFkZGluZ0lubmVyKTtcbiAgICBpZiAocm91bmQpIHN0YXJ0ID0gTWF0aC5yb3VuZChzdGFydCksIGJhbmR3aWR0aCA9IE1hdGgucm91bmQoYmFuZHdpZHRoKTtcbiAgICB2YXIgdmFsdWVzID0gc2VxdWVuY2UobikubWFwKGZ1bmN0aW9uKGkpIHsgcmV0dXJuIHN0YXJ0ICsgc3RlcCAqIGk7IH0pO1xuICAgIHJldHVybiBvcmRpbmFsUmFuZ2UocmV2ZXJzZSA/IHZhbHVlcy5yZXZlcnNlKCkgOiB2YWx1ZXMpO1xuICB9XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRvbWFpbihfKSwgcmVzY2FsZSgpKSA6IGRvbWFpbigpO1xuICB9O1xuXG4gIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHJhbmdlID0gWytfWzBdLCArX1sxXV0sIHJlc2NhbGUoKSkgOiByYW5nZS5zbGljZSgpO1xuICB9O1xuXG4gIHNjYWxlLnJhbmdlUm91bmQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIHJhbmdlID0gWytfWzBdLCArX1sxXV0sIHJvdW5kID0gdHJ1ZSwgcmVzY2FsZSgpO1xuICB9O1xuXG4gIHNjYWxlLmJhbmR3aWR0aCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBiYW5kd2lkdGg7XG4gIH07XG5cbiAgc2NhbGUuc3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzdGVwO1xuICB9O1xuXG4gIHNjYWxlLnJvdW5kID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHJvdW5kID0gISFfLCByZXNjYWxlKCkpIDogcm91bmQ7XG4gIH07XG5cbiAgc2NhbGUucGFkZGluZyA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChwYWRkaW5nSW5uZXIgPSBwYWRkaW5nT3V0ZXIgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBfKSksIHJlc2NhbGUoKSkgOiBwYWRkaW5nSW5uZXI7XG4gIH07XG5cbiAgc2NhbGUucGFkZGluZ0lubmVyID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHBhZGRpbmdJbm5lciA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIF8pKSwgcmVzY2FsZSgpKSA6IHBhZGRpbmdJbm5lcjtcbiAgfTtcblxuICBzY2FsZS5wYWRkaW5nT3V0ZXIgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkZGluZ091dGVyID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgXykpLCByZXNjYWxlKCkpIDogcGFkZGluZ091dGVyO1xuICB9O1xuXG4gIHNjYWxlLmFsaWduID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGFsaWduID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgXykpLCByZXNjYWxlKCkpIDogYWxpZ247XG4gIH07XG5cbiAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBiYW5kKClcbiAgICAgICAgLmRvbWFpbihkb21haW4oKSlcbiAgICAgICAgLnJhbmdlKHJhbmdlKVxuICAgICAgICAucm91bmQocm91bmQpXG4gICAgICAgIC5wYWRkaW5nSW5uZXIocGFkZGluZ0lubmVyKVxuICAgICAgICAucGFkZGluZ091dGVyKHBhZGRpbmdPdXRlcilcbiAgICAgICAgLmFsaWduKGFsaWduKTtcbiAgfTtcblxuICByZXR1cm4gcmVzY2FsZSgpO1xufVxuXG5mdW5jdGlvbiBwb2ludGlzaChzY2FsZSkge1xuICB2YXIgY29weSA9IHNjYWxlLmNvcHk7XG5cbiAgc2NhbGUucGFkZGluZyA9IHNjYWxlLnBhZGRpbmdPdXRlcjtcbiAgZGVsZXRlIHNjYWxlLnBhZGRpbmdJbm5lcjtcbiAgZGVsZXRlIHNjYWxlLnBhZGRpbmdPdXRlcjtcblxuICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHBvaW50aXNoKGNvcHkoKSk7XG4gIH07XG5cbiAgcmV0dXJuIHNjYWxlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcG9pbnQoKSB7XG4gIHJldHVybiBwb2ludGlzaChiYW5kKCkucGFkZGluZ0lubmVyKDEpKTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbnN0cnVjdG9yLCBmYWN0b3J5LCBwcm90b3R5cGUpIHtcbiAgY29uc3RydWN0b3IucHJvdG90eXBlID0gZmFjdG9yeS5wcm90b3R5cGUgPSBwcm90b3R5cGU7XG4gIHByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kKHBhcmVudCwgZGVmaW5pdGlvbikge1xuICB2YXIgcHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlKTtcbiAgZm9yICh2YXIga2V5IGluIGRlZmluaXRpb24pIHByb3RvdHlwZVtrZXldID0gZGVmaW5pdGlvbltrZXldO1xuICByZXR1cm4gcHJvdG90eXBlO1xufVxuIiwiaW1wb3J0IGRlZmluZSwge2V4dGVuZH0gZnJvbSBcIi4vZGVmaW5lXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBDb2xvcigpIHt9XG5cbmV4cG9ydCB2YXIgZGFya2VyID0gMC43O1xuZXhwb3J0IHZhciBicmlnaHRlciA9IDEgLyBkYXJrZXI7XG5cbnZhciByZUkgPSBcIlxcXFxzKihbKy1dP1xcXFxkKylcXFxccypcIixcbiAgICByZU4gPSBcIlxcXFxzKihbKy1dP1xcXFxkKlxcXFwuP1xcXFxkKyg/OltlRV1bKy1dP1xcXFxkKyk/KVxcXFxzKlwiLFxuICAgIHJlUCA9IFwiXFxcXHMqKFsrLV0/XFxcXGQqXFxcXC4/XFxcXGQrKD86W2VFXVsrLV0/XFxcXGQrKT8pJVxcXFxzKlwiLFxuICAgIHJlSGV4MyA9IC9eIyhbMC05YS1mXXszfSkkLyxcbiAgICByZUhleDYgPSAvXiMoWzAtOWEtZl17Nn0pJC8sXG4gICAgcmVSZ2JJbnRlZ2VyID0gbmV3IFJlZ0V4cChcIl5yZ2JcXFxcKFwiICsgW3JlSSwgcmVJLCByZUldICsgXCJcXFxcKSRcIiksXG4gICAgcmVSZ2JQZXJjZW50ID0gbmV3IFJlZ0V4cChcIl5yZ2JcXFxcKFwiICsgW3JlUCwgcmVQLCByZVBdICsgXCJcXFxcKSRcIiksXG4gICAgcmVSZ2JhSW50ZWdlciA9IG5ldyBSZWdFeHAoXCJecmdiYVxcXFwoXCIgKyBbcmVJLCByZUksIHJlSSwgcmVOXSArIFwiXFxcXCkkXCIpLFxuICAgIHJlUmdiYVBlcmNlbnQgPSBuZXcgUmVnRXhwKFwiXnJnYmFcXFxcKFwiICsgW3JlUCwgcmVQLCByZVAsIHJlTl0gKyBcIlxcXFwpJFwiKSxcbiAgICByZUhzbFBlcmNlbnQgPSBuZXcgUmVnRXhwKFwiXmhzbFxcXFwoXCIgKyBbcmVOLCByZVAsIHJlUF0gKyBcIlxcXFwpJFwiKSxcbiAgICByZUhzbGFQZXJjZW50ID0gbmV3IFJlZ0V4cChcIl5oc2xhXFxcXChcIiArIFtyZU4sIHJlUCwgcmVQLCByZU5dICsgXCJcXFxcKSRcIik7XG5cbnZhciBuYW1lZCA9IHtcbiAgYWxpY2VibHVlOiAweGYwZjhmZixcbiAgYW50aXF1ZXdoaXRlOiAweGZhZWJkNyxcbiAgYXF1YTogMHgwMGZmZmYsXG4gIGFxdWFtYXJpbmU6IDB4N2ZmZmQ0LFxuICBhenVyZTogMHhmMGZmZmYsXG4gIGJlaWdlOiAweGY1ZjVkYyxcbiAgYmlzcXVlOiAweGZmZTRjNCxcbiAgYmxhY2s6IDB4MDAwMDAwLFxuICBibGFuY2hlZGFsbW9uZDogMHhmZmViY2QsXG4gIGJsdWU6IDB4MDAwMGZmLFxuICBibHVldmlvbGV0OiAweDhhMmJlMixcbiAgYnJvd246IDB4YTUyYTJhLFxuICBidXJseXdvb2Q6IDB4ZGViODg3LFxuICBjYWRldGJsdWU6IDB4NWY5ZWEwLFxuICBjaGFydHJldXNlOiAweDdmZmYwMCxcbiAgY2hvY29sYXRlOiAweGQyNjkxZSxcbiAgY29yYWw6IDB4ZmY3ZjUwLFxuICBjb3JuZmxvd2VyYmx1ZTogMHg2NDk1ZWQsXG4gIGNvcm5zaWxrOiAweGZmZjhkYyxcbiAgY3JpbXNvbjogMHhkYzE0M2MsXG4gIGN5YW46IDB4MDBmZmZmLFxuICBkYXJrYmx1ZTogMHgwMDAwOGIsXG4gIGRhcmtjeWFuOiAweDAwOGI4YixcbiAgZGFya2dvbGRlbnJvZDogMHhiODg2MGIsXG4gIGRhcmtncmF5OiAweGE5YTlhOSxcbiAgZGFya2dyZWVuOiAweDAwNjQwMCxcbiAgZGFya2dyZXk6IDB4YTlhOWE5LFxuICBkYXJra2hha2k6IDB4YmRiNzZiLFxuICBkYXJrbWFnZW50YTogMHg4YjAwOGIsXG4gIGRhcmtvbGl2ZWdyZWVuOiAweDU1NmIyZixcbiAgZGFya29yYW5nZTogMHhmZjhjMDAsXG4gIGRhcmtvcmNoaWQ6IDB4OTkzMmNjLFxuICBkYXJrcmVkOiAweDhiMDAwMCxcbiAgZGFya3NhbG1vbjogMHhlOTk2N2EsXG4gIGRhcmtzZWFncmVlbjogMHg4ZmJjOGYsXG4gIGRhcmtzbGF0ZWJsdWU6IDB4NDgzZDhiLFxuICBkYXJrc2xhdGVncmF5OiAweDJmNGY0ZixcbiAgZGFya3NsYXRlZ3JleTogMHgyZjRmNGYsXG4gIGRhcmt0dXJxdW9pc2U6IDB4MDBjZWQxLFxuICBkYXJrdmlvbGV0OiAweDk0MDBkMyxcbiAgZGVlcHBpbms6IDB4ZmYxNDkzLFxuICBkZWVwc2t5Ymx1ZTogMHgwMGJmZmYsXG4gIGRpbWdyYXk6IDB4Njk2OTY5LFxuICBkaW1ncmV5OiAweDY5Njk2OSxcbiAgZG9kZ2VyYmx1ZTogMHgxZTkwZmYsXG4gIGZpcmVicmljazogMHhiMjIyMjIsXG4gIGZsb3JhbHdoaXRlOiAweGZmZmFmMCxcbiAgZm9yZXN0Z3JlZW46IDB4MjI4YjIyLFxuICBmdWNoc2lhOiAweGZmMDBmZixcbiAgZ2FpbnNib3JvOiAweGRjZGNkYyxcbiAgZ2hvc3R3aGl0ZTogMHhmOGY4ZmYsXG4gIGdvbGQ6IDB4ZmZkNzAwLFxuICBnb2xkZW5yb2Q6IDB4ZGFhNTIwLFxuICBncmF5OiAweDgwODA4MCxcbiAgZ3JlZW46IDB4MDA4MDAwLFxuICBncmVlbnllbGxvdzogMHhhZGZmMmYsXG4gIGdyZXk6IDB4ODA4MDgwLFxuICBob25leWRldzogMHhmMGZmZjAsXG4gIGhvdHBpbms6IDB4ZmY2OWI0LFxuICBpbmRpYW5yZWQ6IDB4Y2Q1YzVjLFxuICBpbmRpZ286IDB4NGIwMDgyLFxuICBpdm9yeTogMHhmZmZmZjAsXG4gIGtoYWtpOiAweGYwZTY4YyxcbiAgbGF2ZW5kZXI6IDB4ZTZlNmZhLFxuICBsYXZlbmRlcmJsdXNoOiAweGZmZjBmNSxcbiAgbGF3bmdyZWVuOiAweDdjZmMwMCxcbiAgbGVtb25jaGlmZm9uOiAweGZmZmFjZCxcbiAgbGlnaHRibHVlOiAweGFkZDhlNixcbiAgbGlnaHRjb3JhbDogMHhmMDgwODAsXG4gIGxpZ2h0Y3lhbjogMHhlMGZmZmYsXG4gIGxpZ2h0Z29sZGVucm9keWVsbG93OiAweGZhZmFkMixcbiAgbGlnaHRncmF5OiAweGQzZDNkMyxcbiAgbGlnaHRncmVlbjogMHg5MGVlOTAsXG4gIGxpZ2h0Z3JleTogMHhkM2QzZDMsXG4gIGxpZ2h0cGluazogMHhmZmI2YzEsXG4gIGxpZ2h0c2FsbW9uOiAweGZmYTA3YSxcbiAgbGlnaHRzZWFncmVlbjogMHgyMGIyYWEsXG4gIGxpZ2h0c2t5Ymx1ZTogMHg4N2NlZmEsXG4gIGxpZ2h0c2xhdGVncmF5OiAweDc3ODg5OSxcbiAgbGlnaHRzbGF0ZWdyZXk6IDB4Nzc4ODk5LFxuICBsaWdodHN0ZWVsYmx1ZTogMHhiMGM0ZGUsXG4gIGxpZ2h0eWVsbG93OiAweGZmZmZlMCxcbiAgbGltZTogMHgwMGZmMDAsXG4gIGxpbWVncmVlbjogMHgzMmNkMzIsXG4gIGxpbmVuOiAweGZhZjBlNixcbiAgbWFnZW50YTogMHhmZjAwZmYsXG4gIG1hcm9vbjogMHg4MDAwMDAsXG4gIG1lZGl1bWFxdWFtYXJpbmU6IDB4NjZjZGFhLFxuICBtZWRpdW1ibHVlOiAweDAwMDBjZCxcbiAgbWVkaXVtb3JjaGlkOiAweGJhNTVkMyxcbiAgbWVkaXVtcHVycGxlOiAweDkzNzBkYixcbiAgbWVkaXVtc2VhZ3JlZW46IDB4M2NiMzcxLFxuICBtZWRpdW1zbGF0ZWJsdWU6IDB4N2I2OGVlLFxuICBtZWRpdW1zcHJpbmdncmVlbjogMHgwMGZhOWEsXG4gIG1lZGl1bXR1cnF1b2lzZTogMHg0OGQxY2MsXG4gIG1lZGl1bXZpb2xldHJlZDogMHhjNzE1ODUsXG4gIG1pZG5pZ2h0Ymx1ZTogMHgxOTE5NzAsXG4gIG1pbnRjcmVhbTogMHhmNWZmZmEsXG4gIG1pc3R5cm9zZTogMHhmZmU0ZTEsXG4gIG1vY2Nhc2luOiAweGZmZTRiNSxcbiAgbmF2YWpvd2hpdGU6IDB4ZmZkZWFkLFxuICBuYXZ5OiAweDAwMDA4MCxcbiAgb2xkbGFjZTogMHhmZGY1ZTYsXG4gIG9saXZlOiAweDgwODAwMCxcbiAgb2xpdmVkcmFiOiAweDZiOGUyMyxcbiAgb3JhbmdlOiAweGZmYTUwMCxcbiAgb3JhbmdlcmVkOiAweGZmNDUwMCxcbiAgb3JjaGlkOiAweGRhNzBkNixcbiAgcGFsZWdvbGRlbnJvZDogMHhlZWU4YWEsXG4gIHBhbGVncmVlbjogMHg5OGZiOTgsXG4gIHBhbGV0dXJxdW9pc2U6IDB4YWZlZWVlLFxuICBwYWxldmlvbGV0cmVkOiAweGRiNzA5MyxcbiAgcGFwYXlhd2hpcDogMHhmZmVmZDUsXG4gIHBlYWNocHVmZjogMHhmZmRhYjksXG4gIHBlcnU6IDB4Y2Q4NTNmLFxuICBwaW5rOiAweGZmYzBjYixcbiAgcGx1bTogMHhkZGEwZGQsXG4gIHBvd2RlcmJsdWU6IDB4YjBlMGU2LFxuICBwdXJwbGU6IDB4ODAwMDgwLFxuICByZWJlY2NhcHVycGxlOiAweDY2MzM5OSxcbiAgcmVkOiAweGZmMDAwMCxcbiAgcm9zeWJyb3duOiAweGJjOGY4ZixcbiAgcm95YWxibHVlOiAweDQxNjllMSxcbiAgc2FkZGxlYnJvd246IDB4OGI0NTEzLFxuICBzYWxtb246IDB4ZmE4MDcyLFxuICBzYW5keWJyb3duOiAweGY0YTQ2MCxcbiAgc2VhZ3JlZW46IDB4MmU4YjU3LFxuICBzZWFzaGVsbDogMHhmZmY1ZWUsXG4gIHNpZW5uYTogMHhhMDUyMmQsXG4gIHNpbHZlcjogMHhjMGMwYzAsXG4gIHNreWJsdWU6IDB4ODdjZWViLFxuICBzbGF0ZWJsdWU6IDB4NmE1YWNkLFxuICBzbGF0ZWdyYXk6IDB4NzA4MDkwLFxuICBzbGF0ZWdyZXk6IDB4NzA4MDkwLFxuICBzbm93OiAweGZmZmFmYSxcbiAgc3ByaW5nZ3JlZW46IDB4MDBmZjdmLFxuICBzdGVlbGJsdWU6IDB4NDY4MmI0LFxuICB0YW46IDB4ZDJiNDhjLFxuICB0ZWFsOiAweDAwODA4MCxcbiAgdGhpc3RsZTogMHhkOGJmZDgsXG4gIHRvbWF0bzogMHhmZjYzNDcsXG4gIHR1cnF1b2lzZTogMHg0MGUwZDAsXG4gIHZpb2xldDogMHhlZTgyZWUsXG4gIHdoZWF0OiAweGY1ZGViMyxcbiAgd2hpdGU6IDB4ZmZmZmZmLFxuICB3aGl0ZXNtb2tlOiAweGY1ZjVmNSxcbiAgeWVsbG93OiAweGZmZmYwMCxcbiAgeWVsbG93Z3JlZW46IDB4OWFjZDMyXG59O1xuXG5kZWZpbmUoQ29sb3IsIGNvbG9yLCB7XG4gIGRpc3BsYXlhYmxlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5yZ2IoKS5kaXNwbGF5YWJsZSgpO1xuICB9LFxuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucmdiKCkgKyBcIlwiO1xuICB9XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29sb3IoZm9ybWF0KSB7XG4gIHZhciBtO1xuICBmb3JtYXQgPSAoZm9ybWF0ICsgXCJcIikudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiAobSA9IHJlSGV4My5leGVjKGZvcm1hdCkpID8gKG0gPSBwYXJzZUludChtWzFdLCAxNiksIG5ldyBSZ2IoKG0gPj4gOCAmIDB4ZikgfCAobSA+PiA0ICYgMHgwZjApLCAobSA+PiA0ICYgMHhmKSB8IChtICYgMHhmMCksICgobSAmIDB4ZikgPDwgNCkgfCAobSAmIDB4ZiksIDEpKSAvLyAjZjAwXG4gICAgICA6IChtID0gcmVIZXg2LmV4ZWMoZm9ybWF0KSkgPyByZ2JuKHBhcnNlSW50KG1bMV0sIDE2KSkgLy8gI2ZmMDAwMFxuICAgICAgOiAobSA9IHJlUmdiSW50ZWdlci5leGVjKGZvcm1hdCkpID8gbmV3IFJnYihtWzFdLCBtWzJdLCBtWzNdLCAxKSAvLyByZ2IoMjU1LCAwLCAwKVxuICAgICAgOiAobSA9IHJlUmdiUGVyY2VudC5leGVjKGZvcm1hdCkpID8gbmV3IFJnYihtWzFdICogMjU1IC8gMTAwLCBtWzJdICogMjU1IC8gMTAwLCBtWzNdICogMjU1IC8gMTAwLCAxKSAvLyByZ2IoMTAwJSwgMCUsIDAlKVxuICAgICAgOiAobSA9IHJlUmdiYUludGVnZXIuZXhlYyhmb3JtYXQpKSA/IHJnYmEobVsxXSwgbVsyXSwgbVszXSwgbVs0XSkgLy8gcmdiYSgyNTUsIDAsIDAsIDEpXG4gICAgICA6IChtID0gcmVSZ2JhUGVyY2VudC5leGVjKGZvcm1hdCkpID8gcmdiYShtWzFdICogMjU1IC8gMTAwLCBtWzJdICogMjU1IC8gMTAwLCBtWzNdICogMjU1IC8gMTAwLCBtWzRdKSAvLyByZ2IoMTAwJSwgMCUsIDAlLCAxKVxuICAgICAgOiAobSA9IHJlSHNsUGVyY2VudC5leGVjKGZvcm1hdCkpID8gaHNsYShtWzFdLCBtWzJdIC8gMTAwLCBtWzNdIC8gMTAwLCAxKSAvLyBoc2woMTIwLCA1MCUsIDUwJSlcbiAgICAgIDogKG0gPSByZUhzbGFQZXJjZW50LmV4ZWMoZm9ybWF0KSkgPyBoc2xhKG1bMV0sIG1bMl0gLyAxMDAsIG1bM10gLyAxMDAsIG1bNF0pIC8vIGhzbGEoMTIwLCA1MCUsIDUwJSwgMSlcbiAgICAgIDogbmFtZWQuaGFzT3duUHJvcGVydHkoZm9ybWF0KSA/IHJnYm4obmFtZWRbZm9ybWF0XSlcbiAgICAgIDogZm9ybWF0ID09PSBcInRyYW5zcGFyZW50XCIgPyBuZXcgUmdiKE5hTiwgTmFOLCBOYU4sIDApXG4gICAgICA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJnYm4obikge1xuICByZXR1cm4gbmV3IFJnYihuID4+IDE2ICYgMHhmZiwgbiA+PiA4ICYgMHhmZiwgbiAmIDB4ZmYsIDEpO1xufVxuXG5mdW5jdGlvbiByZ2JhKHIsIGcsIGIsIGEpIHtcbiAgaWYgKGEgPD0gMCkgciA9IGcgPSBiID0gTmFOO1xuICByZXR1cm4gbmV3IFJnYihyLCBnLCBiLCBhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJnYkNvbnZlcnQobykge1xuICBpZiAoIShvIGluc3RhbmNlb2YgQ29sb3IpKSBvID0gY29sb3Iobyk7XG4gIGlmICghbykgcmV0dXJuIG5ldyBSZ2I7XG4gIG8gPSBvLnJnYigpO1xuICByZXR1cm4gbmV3IFJnYihvLnIsIG8uZywgby5iLCBvLm9wYWNpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmdiKHIsIGcsIGIsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyByZ2JDb252ZXJ0KHIpIDogbmV3IFJnYihyLCBnLCBiLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBSZ2IociwgZywgYiwgb3BhY2l0eSkge1xuICB0aGlzLnIgPSArcjtcbiAgdGhpcy5nID0gK2c7XG4gIHRoaXMuYiA9ICtiO1xuICB0aGlzLm9wYWNpdHkgPSArb3BhY2l0eTtcbn1cblxuZGVmaW5lKFJnYiwgcmdiLCBleHRlbmQoQ29sb3IsIHtcbiAgYnJpZ2h0ZXI6IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gYnJpZ2h0ZXIgOiBNYXRoLnBvdyhicmlnaHRlciwgayk7XG4gICAgcmV0dXJuIG5ldyBSZ2IodGhpcy5yICogaywgdGhpcy5nICogaywgdGhpcy5iICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGRhcmtlciA6IE1hdGgucG93KGRhcmtlciwgayk7XG4gICAgcmV0dXJuIG5ldyBSZ2IodGhpcy5yICogaywgdGhpcy5nICogaywgdGhpcy5iICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgcmdiOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgZGlzcGxheWFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoMCA8PSB0aGlzLnIgJiYgdGhpcy5yIDw9IDI1NSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5nICYmIHRoaXMuZyA8PSAyNTUpXG4gICAgICAgICYmICgwIDw9IHRoaXMuYiAmJiB0aGlzLmIgPD0gMjU1KVxuICAgICAgICAmJiAoMCA8PSB0aGlzLm9wYWNpdHkgJiYgdGhpcy5vcGFjaXR5IDw9IDEpO1xuICB9LFxuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGEgPSB0aGlzLm9wYWNpdHk7IGEgPSBpc05hTihhKSA/IDEgOiBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBhKSk7XG4gICAgcmV0dXJuIChhID09PSAxID8gXCJyZ2IoXCIgOiBcInJnYmEoXCIpXG4gICAgICAgICsgTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHRoaXMucikgfHwgMCkpICsgXCIsIFwiXG4gICAgICAgICsgTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHRoaXMuZykgfHwgMCkpICsgXCIsIFwiXG4gICAgICAgICsgTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHRoaXMuYikgfHwgMCkpXG4gICAgICAgICsgKGEgPT09IDEgPyBcIilcIiA6IFwiLCBcIiArIGEgKyBcIilcIik7XG4gIH1cbn0pKTtcblxuZnVuY3Rpb24gaHNsYShoLCBzLCBsLCBhKSB7XG4gIGlmIChhIDw9IDApIGggPSBzID0gbCA9IE5hTjtcbiAgZWxzZSBpZiAobCA8PSAwIHx8IGwgPj0gMSkgaCA9IHMgPSBOYU47XG4gIGVsc2UgaWYgKHMgPD0gMCkgaCA9IE5hTjtcbiAgcmV0dXJuIG5ldyBIc2woaCwgcywgbCwgYSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoc2xDb252ZXJ0KG8pIHtcbiAgaWYgKG8gaW5zdGFuY2VvZiBIc2wpIHJldHVybiBuZXcgSHNsKG8uaCwgby5zLCBvLmwsIG8ub3BhY2l0eSk7XG4gIGlmICghKG8gaW5zdGFuY2VvZiBDb2xvcikpIG8gPSBjb2xvcihvKTtcbiAgaWYgKCFvKSByZXR1cm4gbmV3IEhzbDtcbiAgaWYgKG8gaW5zdGFuY2VvZiBIc2wpIHJldHVybiBvO1xuICBvID0gby5yZ2IoKTtcbiAgdmFyIHIgPSBvLnIgLyAyNTUsXG4gICAgICBnID0gby5nIC8gMjU1LFxuICAgICAgYiA9IG8uYiAvIDI1NSxcbiAgICAgIG1pbiA9IE1hdGgubWluKHIsIGcsIGIpLFxuICAgICAgbWF4ID0gTWF0aC5tYXgociwgZywgYiksXG4gICAgICBoID0gTmFOLFxuICAgICAgcyA9IG1heCAtIG1pbixcbiAgICAgIGwgPSAobWF4ICsgbWluKSAvIDI7XG4gIGlmIChzKSB7XG4gICAgaWYgKHIgPT09IG1heCkgaCA9IChnIC0gYikgLyBzICsgKGcgPCBiKSAqIDY7XG4gICAgZWxzZSBpZiAoZyA9PT0gbWF4KSBoID0gKGIgLSByKSAvIHMgKyAyO1xuICAgIGVsc2UgaCA9IChyIC0gZykgLyBzICsgNDtcbiAgICBzIC89IGwgPCAwLjUgPyBtYXggKyBtaW4gOiAyIC0gbWF4IC0gbWluO1xuICAgIGggKj0gNjA7XG4gIH0gZWxzZSB7XG4gICAgcyA9IGwgPiAwICYmIGwgPCAxID8gMCA6IGg7XG4gIH1cbiAgcmV0dXJuIG5ldyBIc2woaCwgcywgbCwgby5vcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhzbChoLCBzLCBsLCBvcGFjaXR5KSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gaHNsQ29udmVydChoKSA6IG5ldyBIc2woaCwgcywgbCwgb3BhY2l0eSA9PSBudWxsID8gMSA6IG9wYWNpdHkpO1xufVxuXG5mdW5jdGlvbiBIc2woaCwgcywgbCwgb3BhY2l0eSkge1xuICB0aGlzLmggPSAraDtcbiAgdGhpcy5zID0gK3M7XG4gIHRoaXMubCA9ICtsO1xuICB0aGlzLm9wYWNpdHkgPSArb3BhY2l0eTtcbn1cblxuZGVmaW5lKEhzbCwgaHNsLCBleHRlbmQoQ29sb3IsIHtcbiAgYnJpZ2h0ZXI6IGZ1bmN0aW9uKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gYnJpZ2h0ZXIgOiBNYXRoLnBvdyhicmlnaHRlciwgayk7XG4gICAgcmV0dXJuIG5ldyBIc2wodGhpcy5oLCB0aGlzLnMsIHRoaXMubCAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBkYXJrZXIgOiBNYXRoLnBvdyhkYXJrZXIsIGspO1xuICAgIHJldHVybiBuZXcgSHNsKHRoaXMuaCwgdGhpcy5zLCB0aGlzLmwgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICByZ2I6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBoID0gdGhpcy5oICUgMzYwICsgKHRoaXMuaCA8IDApICogMzYwLFxuICAgICAgICBzID0gaXNOYU4oaCkgfHwgaXNOYU4odGhpcy5zKSA/IDAgOiB0aGlzLnMsXG4gICAgICAgIGwgPSB0aGlzLmwsXG4gICAgICAgIG0yID0gbCArIChsIDwgMC41ID8gbCA6IDEgLSBsKSAqIHMsXG4gICAgICAgIG0xID0gMiAqIGwgLSBtMjtcbiAgICByZXR1cm4gbmV3IFJnYihcbiAgICAgIGhzbDJyZ2IoaCA+PSAyNDAgPyBoIC0gMjQwIDogaCArIDEyMCwgbTEsIG0yKSxcbiAgICAgIGhzbDJyZ2IoaCwgbTEsIG0yKSxcbiAgICAgIGhzbDJyZ2IoaCA8IDEyMCA/IGggKyAyNDAgOiBoIC0gMTIwLCBtMSwgbTIpLFxuICAgICAgdGhpcy5vcGFjaXR5XG4gICAgKTtcbiAgfSxcbiAgZGlzcGxheWFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoMCA8PSB0aGlzLnMgJiYgdGhpcy5zIDw9IDEgfHwgaXNOYU4odGhpcy5zKSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5sICYmIHRoaXMubCA8PSAxKVxuICAgICAgICAmJiAoMCA8PSB0aGlzLm9wYWNpdHkgJiYgdGhpcy5vcGFjaXR5IDw9IDEpO1xuICB9XG59KSk7XG5cbi8qIEZyb20gRnZEIDEzLjM3LCBDU1MgQ29sb3IgTW9kdWxlIExldmVsIDMgKi9cbmZ1bmN0aW9uIGhzbDJyZ2IoaCwgbTEsIG0yKSB7XG4gIHJldHVybiAoaCA8IDYwID8gbTEgKyAobTIgLSBtMSkgKiBoIC8gNjBcbiAgICAgIDogaCA8IDE4MCA/IG0yXG4gICAgICA6IGggPCAyNDAgPyBtMSArIChtMiAtIG0xKSAqICgyNDAgLSBoKSAvIDYwXG4gICAgICA6IG0xKSAqIDI1NTtcbn1cbiIsImV4cG9ydCB2YXIgZGVnMnJhZCA9IE1hdGguUEkgLyAxODA7XG5leHBvcnQgdmFyIHJhZDJkZWcgPSAxODAgLyBNYXRoLlBJO1xuIiwiaW1wb3J0IGRlZmluZSwge2V4dGVuZH0gZnJvbSBcIi4vZGVmaW5lXCI7XG5pbXBvcnQge0NvbG9yLCByZ2JDb252ZXJ0LCBSZ2J9IGZyb20gXCIuL2NvbG9yXCI7XG5pbXBvcnQge2RlZzJyYWQsIHJhZDJkZWd9IGZyb20gXCIuL21hdGhcIjtcblxuLy8gaHR0cHM6Ly9iZXRhLm9ic2VydmFibGVocS5jb20vQG1ib3N0b2NrL2xhYi1hbmQtcmdiXG52YXIgSyA9IDE4LFxuICAgIFhuID0gMC45NjQyMixcbiAgICBZbiA9IDEsXG4gICAgWm4gPSAwLjgyNTIxLFxuICAgIHQwID0gNCAvIDI5LFxuICAgIHQxID0gNiAvIDI5LFxuICAgIHQyID0gMyAqIHQxICogdDEsXG4gICAgdDMgPSB0MSAqIHQxICogdDE7XG5cbmZ1bmN0aW9uIGxhYkNvbnZlcnQobykge1xuICBpZiAobyBpbnN0YW5jZW9mIExhYikgcmV0dXJuIG5ldyBMYWIoby5sLCBvLmEsIG8uYiwgby5vcGFjaXR5KTtcbiAgaWYgKG8gaW5zdGFuY2VvZiBIY2wpIHtcbiAgICBpZiAoaXNOYU4oby5oKSkgcmV0dXJuIG5ldyBMYWIoby5sLCAwLCAwLCBvLm9wYWNpdHkpO1xuICAgIHZhciBoID0gby5oICogZGVnMnJhZDtcbiAgICByZXR1cm4gbmV3IExhYihvLmwsIE1hdGguY29zKGgpICogby5jLCBNYXRoLnNpbihoKSAqIG8uYywgby5vcGFjaXR5KTtcbiAgfVxuICBpZiAoIShvIGluc3RhbmNlb2YgUmdiKSkgbyA9IHJnYkNvbnZlcnQobyk7XG4gIHZhciByID0gcmdiMmxyZ2Ioby5yKSxcbiAgICAgIGcgPSByZ2IybHJnYihvLmcpLFxuICAgICAgYiA9IHJnYjJscmdiKG8uYiksXG4gICAgICB5ID0geHl6MmxhYigoMC4yMjI1MDQ1ICogciArIDAuNzE2ODc4NiAqIGcgKyAwLjA2MDYxNjkgKiBiKSAvIFluKSwgeCwgejtcbiAgaWYgKHIgPT09IGcgJiYgZyA9PT0gYikgeCA9IHogPSB5OyBlbHNlIHtcbiAgICB4ID0geHl6MmxhYigoMC40MzYwNzQ3ICogciArIDAuMzg1MDY0OSAqIGcgKyAwLjE0MzA4MDQgKiBiKSAvIFhuKTtcbiAgICB6ID0geHl6MmxhYigoMC4wMTM5MzIyICogciArIDAuMDk3MTA0NSAqIGcgKyAwLjcxNDE3MzMgKiBiKSAvIFpuKTtcbiAgfVxuICByZXR1cm4gbmV3IExhYigxMTYgKiB5IC0gMTYsIDUwMCAqICh4IC0geSksIDIwMCAqICh5IC0geiksIG8ub3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBncmF5KGwsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIG5ldyBMYWIobCwgMCwgMCwgb3BhY2l0eSA9PSBudWxsID8gMSA6IG9wYWNpdHkpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBsYWIobCwgYSwgYiwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGxhYkNvbnZlcnQobCkgOiBuZXcgTGFiKGwsIGEsIGIsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIExhYihsLCBhLCBiLCBvcGFjaXR5KSB7XG4gIHRoaXMubCA9ICtsO1xuICB0aGlzLmEgPSArYTtcbiAgdGhpcy5iID0gK2I7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoTGFiLCBsYWIsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBuZXcgTGFiKHRoaXMubCArIEsgKiAoayA9PSBudWxsID8gMSA6IGspLCB0aGlzLmEsIHRoaXMuYiwgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyOiBmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIG5ldyBMYWIodGhpcy5sIC0gSyAqIChrID09IG51bGwgPyAxIDogayksIHRoaXMuYSwgdGhpcy5iLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICByZ2I6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB5ID0gKHRoaXMubCArIDE2KSAvIDExNixcbiAgICAgICAgeCA9IGlzTmFOKHRoaXMuYSkgPyB5IDogeSArIHRoaXMuYSAvIDUwMCxcbiAgICAgICAgeiA9IGlzTmFOKHRoaXMuYikgPyB5IDogeSAtIHRoaXMuYiAvIDIwMDtcbiAgICB4ID0gWG4gKiBsYWIyeHl6KHgpO1xuICAgIHkgPSBZbiAqIGxhYjJ4eXooeSk7XG4gICAgeiA9IFpuICogbGFiMnh5eih6KTtcbiAgICByZXR1cm4gbmV3IFJnYihcbiAgICAgIGxyZ2IycmdiKCAzLjEzMzg1NjEgKiB4IC0gMS42MTY4NjY3ICogeSAtIDAuNDkwNjE0NiAqIHopLFxuICAgICAgbHJnYjJyZ2IoLTAuOTc4NzY4NCAqIHggKyAxLjkxNjE0MTUgKiB5ICsgMC4wMzM0NTQwICogeiksXG4gICAgICBscmdiMnJnYiggMC4wNzE5NDUzICogeCAtIDAuMjI4OTkxNCAqIHkgKyAxLjQwNTI0MjcgKiB6KSxcbiAgICAgIHRoaXMub3BhY2l0eVxuICAgICk7XG4gIH1cbn0pKTtcblxuZnVuY3Rpb24geHl6MmxhYih0KSB7XG4gIHJldHVybiB0ID4gdDMgPyBNYXRoLnBvdyh0LCAxIC8gMykgOiB0IC8gdDIgKyB0MDtcbn1cblxuZnVuY3Rpb24gbGFiMnh5eih0KSB7XG4gIHJldHVybiB0ID4gdDEgPyB0ICogdCAqIHQgOiB0MiAqICh0IC0gdDApO1xufVxuXG5mdW5jdGlvbiBscmdiMnJnYih4KSB7XG4gIHJldHVybiAyNTUgKiAoeCA8PSAwLjAwMzEzMDggPyAxMi45MiAqIHggOiAxLjA1NSAqIE1hdGgucG93KHgsIDEgLyAyLjQpIC0gMC4wNTUpO1xufVxuXG5mdW5jdGlvbiByZ2IybHJnYih4KSB7XG4gIHJldHVybiAoeCAvPSAyNTUpIDw9IDAuMDQwNDUgPyB4IC8gMTIuOTIgOiBNYXRoLnBvdygoeCArIDAuMDU1KSAvIDEuMDU1LCAyLjQpO1xufVxuXG5mdW5jdGlvbiBoY2xDb252ZXJ0KG8pIHtcbiAgaWYgKG8gaW5zdGFuY2VvZiBIY2wpIHJldHVybiBuZXcgSGNsKG8uaCwgby5jLCBvLmwsIG8ub3BhY2l0eSk7XG4gIGlmICghKG8gaW5zdGFuY2VvZiBMYWIpKSBvID0gbGFiQ29udmVydChvKTtcbiAgaWYgKG8uYSA9PT0gMCAmJiBvLmIgPT09IDApIHJldHVybiBuZXcgSGNsKE5hTiwgMCwgby5sLCBvLm9wYWNpdHkpO1xuICB2YXIgaCA9IE1hdGguYXRhbjIoby5iLCBvLmEpICogcmFkMmRlZztcbiAgcmV0dXJuIG5ldyBIY2woaCA8IDAgPyBoICsgMzYwIDogaCwgTWF0aC5zcXJ0KG8uYSAqIG8uYSArIG8uYiAqIG8uYiksIG8ubCwgby5vcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxjaChsLCBjLCBoLCBvcGFjaXR5KSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gaGNsQ29udmVydChsKSA6IG5ldyBIY2woaCwgYywgbCwgb3BhY2l0eSA9PSBudWxsID8gMSA6IG9wYWNpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGNsKGgsIGMsIGwsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBoY2xDb252ZXJ0KGgpIDogbmV3IEhjbChoLCBjLCBsLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBIY2woaCwgYywgbCwgb3BhY2l0eSkge1xuICB0aGlzLmggPSAraDtcbiAgdGhpcy5jID0gK2M7XG4gIHRoaXMubCA9ICtsO1xuICB0aGlzLm9wYWNpdHkgPSArb3BhY2l0eTtcbn1cblxuZGVmaW5lKEhjbCwgaGNsLCBleHRlbmQoQ29sb3IsIHtcbiAgYnJpZ2h0ZXI6IGZ1bmN0aW9uKGspIHtcbiAgICByZXR1cm4gbmV3IEhjbCh0aGlzLmgsIHRoaXMuYywgdGhpcy5sICsgSyAqIChrID09IG51bGwgPyAxIDogayksIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcjogZnVuY3Rpb24oaykge1xuICAgIHJldHVybiBuZXcgSGNsKHRoaXMuaCwgdGhpcy5jLCB0aGlzLmwgLSBLICogKGsgPT0gbnVsbCA/IDEgOiBrKSwgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgcmdiOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbGFiQ29udmVydCh0aGlzKS5yZ2IoKTtcbiAgfVxufSkpO1xuIiwiaW1wb3J0IGRlZmluZSwge2V4dGVuZH0gZnJvbSBcIi4vZGVmaW5lXCI7XG5pbXBvcnQge0NvbG9yLCByZ2JDb252ZXJ0LCBSZ2IsIGRhcmtlciwgYnJpZ2h0ZXJ9IGZyb20gXCIuL2NvbG9yXCI7XG5pbXBvcnQge2RlZzJyYWQsIHJhZDJkZWd9IGZyb20gXCIuL21hdGhcIjtcblxudmFyIEEgPSAtMC4xNDg2MSxcbiAgICBCID0gKzEuNzgyNzcsXG4gICAgQyA9IC0wLjI5MjI3LFxuICAgIEQgPSAtMC45MDY0OSxcbiAgICBFID0gKzEuOTcyOTQsXG4gICAgRUQgPSBFICogRCxcbiAgICBFQiA9IEUgKiBCLFxuICAgIEJDX0RBID0gQiAqIEMgLSBEICogQTtcblxuZnVuY3Rpb24gY3ViZWhlbGl4Q29udmVydChvKSB7XG4gIGlmIChvIGluc3RhbmNlb2YgQ3ViZWhlbGl4KSByZXR1cm4gbmV3IEN1YmVoZWxpeChvLmgsIG8ucywgby5sLCBvLm9wYWNpdHkpO1xuICBpZiAoIShvIGluc3RhbmNlb2YgUmdiKSkgbyA9IHJnYkNvbnZlcnQobyk7XG4gIHZhciByID0gby5yIC8gMjU1LFxuICAgICAgZyA9IG8uZyAvIDI1NSxcbiAgICAgIGIgPSBvLmIgLyAyNTUsXG4gICAgICBsID0gKEJDX0RBICogYiArIEVEICogciAtIEVCICogZykgLyAoQkNfREEgKyBFRCAtIEVCKSxcbiAgICAgIGJsID0gYiAtIGwsXG4gICAgICBrID0gKEUgKiAoZyAtIGwpIC0gQyAqIGJsKSAvIEQsXG4gICAgICBzID0gTWF0aC5zcXJ0KGsgKiBrICsgYmwgKiBibCkgLyAoRSAqIGwgKiAoMSAtIGwpKSwgLy8gTmFOIGlmIGw9MCBvciBsPTFcbiAgICAgIGggPSBzID8gTWF0aC5hdGFuMihrLCBibCkgKiByYWQyZGVnIC0gMTIwIDogTmFOO1xuICByZXR1cm4gbmV3IEN1YmVoZWxpeChoIDwgMCA/IGggKyAzNjAgOiBoLCBzLCBsLCBvLm9wYWNpdHkpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjdWJlaGVsaXgoaCwgcywgbCwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGN1YmVoZWxpeENvbnZlcnQoaCkgOiBuZXcgQ3ViZWhlbGl4KGgsIHMsIGwsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIEN1YmVoZWxpeChoLCBzLCBsLCBvcGFjaXR5KSB7XG4gIHRoaXMuaCA9ICtoO1xuICB0aGlzLnMgPSArcztcbiAgdGhpcy5sID0gK2w7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoQ3ViZWhlbGl4LCBjdWJlaGVsaXgsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcjogZnVuY3Rpb24oaykge1xuICAgIGsgPSBrID09IG51bGwgPyBicmlnaHRlciA6IE1hdGgucG93KGJyaWdodGVyLCBrKTtcbiAgICByZXR1cm4gbmV3IEN1YmVoZWxpeCh0aGlzLmgsIHRoaXMucywgdGhpcy5sICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyOiBmdW5jdGlvbihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGRhcmtlciA6IE1hdGgucG93KGRhcmtlciwgayk7XG4gICAgcmV0dXJuIG5ldyBDdWJlaGVsaXgodGhpcy5oLCB0aGlzLnMsIHRoaXMubCAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGggPSBpc05hTih0aGlzLmgpID8gMCA6ICh0aGlzLmggKyAxMjApICogZGVnMnJhZCxcbiAgICAgICAgbCA9ICt0aGlzLmwsXG4gICAgICAgIGEgPSBpc05hTih0aGlzLnMpID8gMCA6IHRoaXMucyAqIGwgKiAoMSAtIGwpLFxuICAgICAgICBjb3NoID0gTWF0aC5jb3MoaCksXG4gICAgICAgIHNpbmggPSBNYXRoLnNpbihoKTtcbiAgICByZXR1cm4gbmV3IFJnYihcbiAgICAgIDI1NSAqIChsICsgYSAqIChBICogY29zaCArIEIgKiBzaW5oKSksXG4gICAgICAyNTUgKiAobCArIGEgKiAoQyAqIGNvc2ggKyBEICogc2luaCkpLFxuICAgICAgMjU1ICogKGwgKyBhICogKEUgKiBjb3NoKSksXG4gICAgICB0aGlzLm9wYWNpdHlcbiAgICApO1xuICB9XG59KSk7XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4geDtcbiAgfTtcbn1cbiIsImltcG9ydCBjb25zdGFudCBmcm9tIFwiLi9jb25zdGFudFwiO1xuXG5mdW5jdGlvbiBsaW5lYXIoYSwgZCkge1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBhICsgdCAqIGQ7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGV4cG9uZW50aWFsKGEsIGIsIHkpIHtcbiAgcmV0dXJuIGEgPSBNYXRoLnBvdyhhLCB5KSwgYiA9IE1hdGgucG93KGIsIHkpIC0gYSwgeSA9IDEgLyB5LCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIE1hdGgucG93KGEgKyB0ICogYiwgeSk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBodWUoYSwgYikge1xuICB2YXIgZCA9IGIgLSBhO1xuICByZXR1cm4gZCA/IGxpbmVhcihhLCBkID4gMTgwIHx8IGQgPCAtMTgwID8gZCAtIDM2MCAqIE1hdGgucm91bmQoZCAvIDM2MCkgOiBkKSA6IGNvbnN0YW50KGlzTmFOKGEpID8gYiA6IGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2FtbWEoeSkge1xuICByZXR1cm4gKHkgPSAreSkgPT09IDEgPyBub2dhbW1hIDogZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBiIC0gYSA/IGV4cG9uZW50aWFsKGEsIGIsIHkpIDogY29uc3RhbnQoaXNOYU4oYSkgPyBiIDogYSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG5vZ2FtbWEoYSwgYikge1xuICB2YXIgZCA9IGIgLSBhO1xuICByZXR1cm4gZCA/IGxpbmVhcihhLCBkKSA6IGNvbnN0YW50KGlzTmFOKGEpID8gYiA6IGEpO1xufVxuIiwiaW1wb3J0IHtyZ2IgYXMgY29sb3JSZ2J9IGZyb20gXCJkMy1jb2xvclwiO1xuaW1wb3J0IGJhc2lzIGZyb20gXCIuL2Jhc2lzXCI7XG5pbXBvcnQgYmFzaXNDbG9zZWQgZnJvbSBcIi4vYmFzaXNDbG9zZWRcIjtcbmltcG9ydCBub2dhbW1hLCB7Z2FtbWF9IGZyb20gXCIuL2NvbG9yXCI7XG5cbmV4cG9ydCBkZWZhdWx0IChmdW5jdGlvbiByZ2JHYW1tYSh5KSB7XG4gIHZhciBjb2xvciA9IGdhbW1hKHkpO1xuXG4gIGZ1bmN0aW9uIHJnYihzdGFydCwgZW5kKSB7XG4gICAgdmFyIHIgPSBjb2xvcigoc3RhcnQgPSBjb2xvclJnYihzdGFydCkpLnIsIChlbmQgPSBjb2xvclJnYihlbmQpKS5yKSxcbiAgICAgICAgZyA9IGNvbG9yKHN0YXJ0LmcsIGVuZC5nKSxcbiAgICAgICAgYiA9IGNvbG9yKHN0YXJ0LmIsIGVuZC5iKSxcbiAgICAgICAgb3BhY2l0eSA9IG5vZ2FtbWEoc3RhcnQub3BhY2l0eSwgZW5kLm9wYWNpdHkpO1xuICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICBzdGFydC5yID0gcih0KTtcbiAgICAgIHN0YXJ0LmcgPSBnKHQpO1xuICAgICAgc3RhcnQuYiA9IGIodCk7XG4gICAgICBzdGFydC5vcGFjaXR5ID0gb3BhY2l0eSh0KTtcbiAgICAgIHJldHVybiBzdGFydCArIFwiXCI7XG4gICAgfTtcbiAgfVxuXG4gIHJnYi5nYW1tYSA9IHJnYkdhbW1hO1xuXG4gIHJldHVybiByZ2I7XG59KSgxKTtcblxuZnVuY3Rpb24gcmdiU3BsaW5lKHNwbGluZSkge1xuICByZXR1cm4gZnVuY3Rpb24oY29sb3JzKSB7XG4gICAgdmFyIG4gPSBjb2xvcnMubGVuZ3RoLFxuICAgICAgICByID0gbmV3IEFycmF5KG4pLFxuICAgICAgICBnID0gbmV3IEFycmF5KG4pLFxuICAgICAgICBiID0gbmV3IEFycmF5KG4pLFxuICAgICAgICBpLCBjb2xvcjtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBjb2xvciA9IGNvbG9yUmdiKGNvbG9yc1tpXSk7XG4gICAgICByW2ldID0gY29sb3IuciB8fCAwO1xuICAgICAgZ1tpXSA9IGNvbG9yLmcgfHwgMDtcbiAgICAgIGJbaV0gPSBjb2xvci5iIHx8IDA7XG4gICAgfVxuICAgIHIgPSBzcGxpbmUocik7XG4gICAgZyA9IHNwbGluZShnKTtcbiAgICBiID0gc3BsaW5lKGIpO1xuICAgIGNvbG9yLm9wYWNpdHkgPSAxO1xuICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICBjb2xvci5yID0gcih0KTtcbiAgICAgIGNvbG9yLmcgPSBnKHQpO1xuICAgICAgY29sb3IuYiA9IGIodCk7XG4gICAgICByZXR1cm4gY29sb3IgKyBcIlwiO1xuICAgIH07XG4gIH07XG59XG5cbmV4cG9ydCB2YXIgcmdiQmFzaXMgPSByZ2JTcGxpbmUoYmFzaXMpO1xuZXhwb3J0IHZhciByZ2JCYXNpc0Nsb3NlZCA9IHJnYlNwbGluZShiYXNpc0Nsb3NlZCk7XG4iLCJpbXBvcnQgdmFsdWUgZnJvbSBcIi4vdmFsdWVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICB2YXIgbmIgPSBiID8gYi5sZW5ndGggOiAwLFxuICAgICAgbmEgPSBhID8gTWF0aC5taW4obmIsIGEubGVuZ3RoKSA6IDAsXG4gICAgICB4ID0gbmV3IEFycmF5KG5hKSxcbiAgICAgIGMgPSBuZXcgQXJyYXkobmIpLFxuICAgICAgaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgbmE7ICsraSkgeFtpXSA9IHZhbHVlKGFbaV0sIGJbaV0pO1xuICBmb3IgKDsgaSA8IG5iOyArK2kpIGNbaV0gPSBiW2ldO1xuXG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgZm9yIChpID0gMDsgaSA8IG5hOyArK2kpIGNbaV0gPSB4W2ldKHQpO1xuICAgIHJldHVybiBjO1xuICB9O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICB2YXIgZCA9IG5ldyBEYXRlO1xuICByZXR1cm4gYSA9ICthLCBiIC09IGEsIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gZC5zZXRUaW1lKGEgKyBiICogdCksIGQ7XG4gIH07XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHJldHVybiBhID0gK2EsIGIgLT0gYSwgZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBhICsgYiAqIHQ7XG4gIH07XG59XG4iLCJpbXBvcnQgdmFsdWUgZnJvbSBcIi4vdmFsdWVcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICB2YXIgaSA9IHt9LFxuICAgICAgYyA9IHt9LFxuICAgICAgaztcblxuICBpZiAoYSA9PT0gbnVsbCB8fCB0eXBlb2YgYSAhPT0gXCJvYmplY3RcIikgYSA9IHt9O1xuICBpZiAoYiA9PT0gbnVsbCB8fCB0eXBlb2YgYiAhPT0gXCJvYmplY3RcIikgYiA9IHt9O1xuXG4gIGZvciAoayBpbiBiKSB7XG4gICAgaWYgKGsgaW4gYSkge1xuICAgICAgaVtrXSA9IHZhbHVlKGFba10sIGJba10pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjW2tdID0gYltrXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIGZvciAoayBpbiBpKSBjW2tdID0gaVtrXSh0KTtcbiAgICByZXR1cm4gYztcbiAgfTtcbn1cbiIsImltcG9ydCBudW1iZXIgZnJvbSBcIi4vbnVtYmVyXCI7XG5cbnZhciByZUEgPSAvWy0rXT8oPzpcXGQrXFwuP1xcZCp8XFwuP1xcZCspKD86W2VFXVstK10/XFxkKyk/L2csXG4gICAgcmVCID0gbmV3IFJlZ0V4cChyZUEuc291cmNlLCBcImdcIik7XG5cbmZ1bmN0aW9uIHplcm8oYikge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGI7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG9uZShiKSB7XG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIGIodCkgKyBcIlwiO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciBiaSA9IHJlQS5sYXN0SW5kZXggPSByZUIubGFzdEluZGV4ID0gMCwgLy8gc2NhbiBpbmRleCBmb3IgbmV4dCBudW1iZXIgaW4gYlxuICAgICAgYW0sIC8vIGN1cnJlbnQgbWF0Y2ggaW4gYVxuICAgICAgYm0sIC8vIGN1cnJlbnQgbWF0Y2ggaW4gYlxuICAgICAgYnMsIC8vIHN0cmluZyBwcmVjZWRpbmcgY3VycmVudCBudW1iZXIgaW4gYiwgaWYgYW55XG4gICAgICBpID0gLTEsIC8vIGluZGV4IGluIHNcbiAgICAgIHMgPSBbXSwgLy8gc3RyaW5nIGNvbnN0YW50cyBhbmQgcGxhY2Vob2xkZXJzXG4gICAgICBxID0gW107IC8vIG51bWJlciBpbnRlcnBvbGF0b3JzXG5cbiAgLy8gQ29lcmNlIGlucHV0cyB0byBzdHJpbmdzLlxuICBhID0gYSArIFwiXCIsIGIgPSBiICsgXCJcIjtcblxuICAvLyBJbnRlcnBvbGF0ZSBwYWlycyBvZiBudW1iZXJzIGluIGEgJiBiLlxuICB3aGlsZSAoKGFtID0gcmVBLmV4ZWMoYSkpXG4gICAgICAmJiAoYm0gPSByZUIuZXhlYyhiKSkpIHtcbiAgICBpZiAoKGJzID0gYm0uaW5kZXgpID4gYmkpIHsgLy8gYSBzdHJpbmcgcHJlY2VkZXMgdGhlIG5leHQgbnVtYmVyIGluIGJcbiAgICAgIGJzID0gYi5zbGljZShiaSwgYnMpO1xuICAgICAgaWYgKHNbaV0pIHNbaV0gKz0gYnM7IC8vIGNvYWxlc2NlIHdpdGggcHJldmlvdXMgc3RyaW5nXG4gICAgICBlbHNlIHNbKytpXSA9IGJzO1xuICAgIH1cbiAgICBpZiAoKGFtID0gYW1bMF0pID09PSAoYm0gPSBibVswXSkpIHsgLy8gbnVtYmVycyBpbiBhICYgYiBtYXRjaFxuICAgICAgaWYgKHNbaV0pIHNbaV0gKz0gYm07IC8vIGNvYWxlc2NlIHdpdGggcHJldmlvdXMgc3RyaW5nXG4gICAgICBlbHNlIHNbKytpXSA9IGJtO1xuICAgIH0gZWxzZSB7IC8vIGludGVycG9sYXRlIG5vbi1tYXRjaGluZyBudW1iZXJzXG4gICAgICBzWysraV0gPSBudWxsO1xuICAgICAgcS5wdXNoKHtpOiBpLCB4OiBudW1iZXIoYW0sIGJtKX0pO1xuICAgIH1cbiAgICBiaSA9IHJlQi5sYXN0SW5kZXg7XG4gIH1cblxuICAvLyBBZGQgcmVtYWlucyBvZiBiLlxuICBpZiAoYmkgPCBiLmxlbmd0aCkge1xuICAgIGJzID0gYi5zbGljZShiaSk7XG4gICAgaWYgKHNbaV0pIHNbaV0gKz0gYnM7IC8vIGNvYWxlc2NlIHdpdGggcHJldmlvdXMgc3RyaW5nXG4gICAgZWxzZSBzWysraV0gPSBicztcbiAgfVxuXG4gIC8vIFNwZWNpYWwgb3B0aW1pemF0aW9uIGZvciBvbmx5IGEgc2luZ2xlIG1hdGNoLlxuICAvLyBPdGhlcndpc2UsIGludGVycG9sYXRlIGVhY2ggb2YgdGhlIG51bWJlcnMgYW5kIHJlam9pbiB0aGUgc3RyaW5nLlxuICByZXR1cm4gcy5sZW5ndGggPCAyID8gKHFbMF1cbiAgICAgID8gb25lKHFbMF0ueClcbiAgICAgIDogemVybyhiKSlcbiAgICAgIDogKGIgPSBxLmxlbmd0aCwgZnVuY3Rpb24odCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBvOyBpIDwgYjsgKytpKSBzWyhvID0gcVtpXSkuaV0gPSBvLngodCk7XG4gICAgICAgICAgcmV0dXJuIHMuam9pbihcIlwiKTtcbiAgICAgICAgfSk7XG59XG4iLCJpbXBvcnQge2NvbG9yfSBmcm9tIFwiZDMtY29sb3JcIjtcbmltcG9ydCByZ2IgZnJvbSBcIi4vcmdiXCI7XG5pbXBvcnQgYXJyYXkgZnJvbSBcIi4vYXJyYXlcIjtcbmltcG9ydCBkYXRlIGZyb20gXCIuL2RhdGVcIjtcbmltcG9ydCBudW1iZXIgZnJvbSBcIi4vbnVtYmVyXCI7XG5pbXBvcnQgb2JqZWN0IGZyb20gXCIuL29iamVjdFwiO1xuaW1wb3J0IHN0cmluZyBmcm9tIFwiLi9zdHJpbmdcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi9jb25zdGFudFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciB0ID0gdHlwZW9mIGIsIGM7XG4gIHJldHVybiBiID09IG51bGwgfHwgdCA9PT0gXCJib29sZWFuXCIgPyBjb25zdGFudChiKVxuICAgICAgOiAodCA9PT0gXCJudW1iZXJcIiA/IG51bWJlclxuICAgICAgOiB0ID09PSBcInN0cmluZ1wiID8gKChjID0gY29sb3IoYikpID8gKGIgPSBjLCByZ2IpIDogc3RyaW5nKVxuICAgICAgOiBiIGluc3RhbmNlb2YgY29sb3IgPyByZ2JcbiAgICAgIDogYiBpbnN0YW5jZW9mIERhdGUgPyBkYXRlXG4gICAgICA6IEFycmF5LmlzQXJyYXkoYikgPyBhcnJheVxuICAgICAgOiB0eXBlb2YgYi52YWx1ZU9mICE9PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIGIudG9TdHJpbmcgIT09IFwiZnVuY3Rpb25cIiB8fCBpc05hTihiKSA/IG9iamVjdFxuICAgICAgOiBudW1iZXIpKGEsIGIpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICByZXR1cm4gYSA9ICthLCBiIC09IGEsIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZChhICsgYiAqIHQpO1xuICB9O1xufVxuIiwidmFyIGRlZ3JlZXMgPSAxODAgLyBNYXRoLlBJO1xuXG5leHBvcnQgdmFyIGlkZW50aXR5ID0ge1xuICB0cmFuc2xhdGVYOiAwLFxuICB0cmFuc2xhdGVZOiAwLFxuICByb3RhdGU6IDAsXG4gIHNrZXdYOiAwLFxuICBzY2FsZVg6IDEsXG4gIHNjYWxlWTogMVxufTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYiwgYywgZCwgZSwgZikge1xuICB2YXIgc2NhbGVYLCBzY2FsZVksIHNrZXdYO1xuICBpZiAoc2NhbGVYID0gTWF0aC5zcXJ0KGEgKiBhICsgYiAqIGIpKSBhIC89IHNjYWxlWCwgYiAvPSBzY2FsZVg7XG4gIGlmIChza2V3WCA9IGEgKiBjICsgYiAqIGQpIGMgLT0gYSAqIHNrZXdYLCBkIC09IGIgKiBza2V3WDtcbiAgaWYgKHNjYWxlWSA9IE1hdGguc3FydChjICogYyArIGQgKiBkKSkgYyAvPSBzY2FsZVksIGQgLz0gc2NhbGVZLCBza2V3WCAvPSBzY2FsZVk7XG4gIGlmIChhICogZCA8IGIgKiBjKSBhID0gLWEsIGIgPSAtYiwgc2tld1ggPSAtc2tld1gsIHNjYWxlWCA9IC1zY2FsZVg7XG4gIHJldHVybiB7XG4gICAgdHJhbnNsYXRlWDogZSxcbiAgICB0cmFuc2xhdGVZOiBmLFxuICAgIHJvdGF0ZTogTWF0aC5hdGFuMihiLCBhKSAqIGRlZ3JlZXMsXG4gICAgc2tld1g6IE1hdGguYXRhbihza2V3WCkgKiBkZWdyZWVzLFxuICAgIHNjYWxlWDogc2NhbGVYLFxuICAgIHNjYWxlWTogc2NhbGVZXG4gIH07XG59XG4iLCJpbXBvcnQgZGVjb21wb3NlLCB7aWRlbnRpdHl9IGZyb20gXCIuL2RlY29tcG9zZVwiO1xuXG52YXIgY3NzTm9kZSxcbiAgICBjc3NSb290LFxuICAgIGNzc1ZpZXcsXG4gICAgc3ZnTm9kZTtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQ3NzKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gXCJub25lXCIpIHJldHVybiBpZGVudGl0eTtcbiAgaWYgKCFjc3NOb2RlKSBjc3NOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKSwgY3NzUm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgY3NzVmlldyA9IGRvY3VtZW50LmRlZmF1bHRWaWV3O1xuICBjc3NOb2RlLnN0eWxlLnRyYW5zZm9ybSA9IHZhbHVlO1xuICB2YWx1ZSA9IGNzc1ZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShjc3NSb290LmFwcGVuZENoaWxkKGNzc05vZGUpLCBudWxsKS5nZXRQcm9wZXJ0eVZhbHVlKFwidHJhbnNmb3JtXCIpO1xuICBjc3NSb290LnJlbW92ZUNoaWxkKGNzc05vZGUpO1xuICB2YWx1ZSA9IHZhbHVlLnNsaWNlKDcsIC0xKS5zcGxpdChcIixcIik7XG4gIHJldHVybiBkZWNvbXBvc2UoK3ZhbHVlWzBdLCArdmFsdWVbMV0sICt2YWx1ZVsyXSwgK3ZhbHVlWzNdLCArdmFsdWVbNF0sICt2YWx1ZVs1XSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVN2Zyh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIGlkZW50aXR5O1xuICBpZiAoIXN2Z05vZGUpIHN2Z05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCBcImdcIik7XG4gIHN2Z05vZGUuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIHZhbHVlKTtcbiAgaWYgKCEodmFsdWUgPSBzdmdOb2RlLnRyYW5zZm9ybS5iYXNlVmFsLmNvbnNvbGlkYXRlKCkpKSByZXR1cm4gaWRlbnRpdHk7XG4gIHZhbHVlID0gdmFsdWUubWF0cml4O1xuICByZXR1cm4gZGVjb21wb3NlKHZhbHVlLmEsIHZhbHVlLmIsIHZhbHVlLmMsIHZhbHVlLmQsIHZhbHVlLmUsIHZhbHVlLmYpO1xufVxuIiwiaW1wb3J0IG51bWJlciBmcm9tIFwiLi4vbnVtYmVyXCI7XG5pbXBvcnQge3BhcnNlQ3NzLCBwYXJzZVN2Z30gZnJvbSBcIi4vcGFyc2VcIjtcblxuZnVuY3Rpb24gaW50ZXJwb2xhdGVUcmFuc2Zvcm0ocGFyc2UsIHB4Q29tbWEsIHB4UGFyZW4sIGRlZ1BhcmVuKSB7XG5cbiAgZnVuY3Rpb24gcG9wKHMpIHtcbiAgICByZXR1cm4gcy5sZW5ndGggPyBzLnBvcCgpICsgXCIgXCIgOiBcIlwiO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNsYXRlKHhhLCB5YSwgeGIsIHliLCBzLCBxKSB7XG4gICAgaWYgKHhhICE9PSB4YiB8fCB5YSAhPT0geWIpIHtcbiAgICAgIHZhciBpID0gcy5wdXNoKFwidHJhbnNsYXRlKFwiLCBudWxsLCBweENvbW1hLCBudWxsLCBweFBhcmVuKTtcbiAgICAgIHEucHVzaCh7aTogaSAtIDQsIHg6IG51bWJlcih4YSwgeGIpfSwge2k6IGkgLSAyLCB4OiBudW1iZXIoeWEsIHliKX0pO1xuICAgIH0gZWxzZSBpZiAoeGIgfHwgeWIpIHtcbiAgICAgIHMucHVzaChcInRyYW5zbGF0ZShcIiArIHhiICsgcHhDb21tYSArIHliICsgcHhQYXJlbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcm90YXRlKGEsIGIsIHMsIHEpIHtcbiAgICBpZiAoYSAhPT0gYikge1xuICAgICAgaWYgKGEgLSBiID4gMTgwKSBiICs9IDM2MDsgZWxzZSBpZiAoYiAtIGEgPiAxODApIGEgKz0gMzYwOyAvLyBzaG9ydGVzdCBwYXRoXG4gICAgICBxLnB1c2goe2k6IHMucHVzaChwb3AocykgKyBcInJvdGF0ZShcIiwgbnVsbCwgZGVnUGFyZW4pIC0gMiwgeDogbnVtYmVyKGEsIGIpfSk7XG4gICAgfSBlbHNlIGlmIChiKSB7XG4gICAgICBzLnB1c2gocG9wKHMpICsgXCJyb3RhdGUoXCIgKyBiICsgZGVnUGFyZW4pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNrZXdYKGEsIGIsIHMsIHEpIHtcbiAgICBpZiAoYSAhPT0gYikge1xuICAgICAgcS5wdXNoKHtpOiBzLnB1c2gocG9wKHMpICsgXCJza2V3WChcIiwgbnVsbCwgZGVnUGFyZW4pIC0gMiwgeDogbnVtYmVyKGEsIGIpfSk7XG4gICAgfSBlbHNlIGlmIChiKSB7XG4gICAgICBzLnB1c2gocG9wKHMpICsgXCJza2V3WChcIiArIGIgKyBkZWdQYXJlbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2NhbGUoeGEsIHlhLCB4YiwgeWIsIHMsIHEpIHtcbiAgICBpZiAoeGEgIT09IHhiIHx8IHlhICE9PSB5Yikge1xuICAgICAgdmFyIGkgPSBzLnB1c2gocG9wKHMpICsgXCJzY2FsZShcIiwgbnVsbCwgXCIsXCIsIG51bGwsIFwiKVwiKTtcbiAgICAgIHEucHVzaCh7aTogaSAtIDQsIHg6IG51bWJlcih4YSwgeGIpfSwge2k6IGkgLSAyLCB4OiBudW1iZXIoeWEsIHliKX0pO1xuICAgIH0gZWxzZSBpZiAoeGIgIT09IDEgfHwgeWIgIT09IDEpIHtcbiAgICAgIHMucHVzaChwb3AocykgKyBcInNjYWxlKFwiICsgeGIgKyBcIixcIiArIHliICsgXCIpXCIpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgdmFyIHMgPSBbXSwgLy8gc3RyaW5nIGNvbnN0YW50cyBhbmQgcGxhY2Vob2xkZXJzXG4gICAgICAgIHEgPSBbXTsgLy8gbnVtYmVyIGludGVycG9sYXRvcnNcbiAgICBhID0gcGFyc2UoYSksIGIgPSBwYXJzZShiKTtcbiAgICB0cmFuc2xhdGUoYS50cmFuc2xhdGVYLCBhLnRyYW5zbGF0ZVksIGIudHJhbnNsYXRlWCwgYi50cmFuc2xhdGVZLCBzLCBxKTtcbiAgICByb3RhdGUoYS5yb3RhdGUsIGIucm90YXRlLCBzLCBxKTtcbiAgICBza2V3WChhLnNrZXdYLCBiLnNrZXdYLCBzLCBxKTtcbiAgICBzY2FsZShhLnNjYWxlWCwgYS5zY2FsZVksIGIuc2NhbGVYLCBiLnNjYWxlWSwgcywgcSk7XG4gICAgYSA9IGIgPSBudWxsOyAvLyBnY1xuICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICB2YXIgaSA9IC0xLCBuID0gcS5sZW5ndGgsIG87XG4gICAgICB3aGlsZSAoKytpIDwgbikgc1sobyA9IHFbaV0pLmldID0gby54KHQpO1xuICAgICAgcmV0dXJuIHMuam9pbihcIlwiKTtcbiAgICB9O1xuICB9O1xufVxuXG5leHBvcnQgdmFyIGludGVycG9sYXRlVHJhbnNmb3JtQ3NzID0gaW50ZXJwb2xhdGVUcmFuc2Zvcm0ocGFyc2VDc3MsIFwicHgsIFwiLCBcInB4KVwiLCBcImRlZylcIik7XG5leHBvcnQgdmFyIGludGVycG9sYXRlVHJhbnNmb3JtU3ZnID0gaW50ZXJwb2xhdGVUcmFuc2Zvcm0ocGFyc2VTdmcsIFwiLCBcIiwgXCIpXCIsIFwiKVwiKTtcbiIsInZhciByaG8gPSBNYXRoLlNRUlQyLFxuICAgIHJobzIgPSAyLFxuICAgIHJobzQgPSA0LFxuICAgIGVwc2lsb24yID0gMWUtMTI7XG5cbmZ1bmN0aW9uIGNvc2goeCkge1xuICByZXR1cm4gKCh4ID0gTWF0aC5leHAoeCkpICsgMSAvIHgpIC8gMjtcbn1cblxuZnVuY3Rpb24gc2luaCh4KSB7XG4gIHJldHVybiAoKHggPSBNYXRoLmV4cCh4KSkgLSAxIC8geCkgLyAyO1xufVxuXG5mdW5jdGlvbiB0YW5oKHgpIHtcbiAgcmV0dXJuICgoeCA9IE1hdGguZXhwKDIgKiB4KSkgLSAxKSAvICh4ICsgMSk7XG59XG5cbi8vIHAwID0gW3V4MCwgdXkwLCB3MF1cbi8vIHAxID0gW3V4MSwgdXkxLCB3MV1cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHAwLCBwMSkge1xuICB2YXIgdXgwID0gcDBbMF0sIHV5MCA9IHAwWzFdLCB3MCA9IHAwWzJdLFxuICAgICAgdXgxID0gcDFbMF0sIHV5MSA9IHAxWzFdLCB3MSA9IHAxWzJdLFxuICAgICAgZHggPSB1eDEgLSB1eDAsXG4gICAgICBkeSA9IHV5MSAtIHV5MCxcbiAgICAgIGQyID0gZHggKiBkeCArIGR5ICogZHksXG4gICAgICBpLFxuICAgICAgUztcblxuICAvLyBTcGVjaWFsIGNhc2UgZm9yIHUwIOKJhSB1MS5cbiAgaWYgKGQyIDwgZXBzaWxvbjIpIHtcbiAgICBTID0gTWF0aC5sb2codzEgLyB3MCkgLyByaG87XG4gICAgaSA9IGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiBbXG4gICAgICAgIHV4MCArIHQgKiBkeCxcbiAgICAgICAgdXkwICsgdCAqIGR5LFxuICAgICAgICB3MCAqIE1hdGguZXhwKHJobyAqIHQgKiBTKVxuICAgICAgXTtcbiAgICB9XG4gIH1cblxuICAvLyBHZW5lcmFsIGNhc2UuXG4gIGVsc2Uge1xuICAgIHZhciBkMSA9IE1hdGguc3FydChkMiksXG4gICAgICAgIGIwID0gKHcxICogdzEgLSB3MCAqIHcwICsgcmhvNCAqIGQyKSAvICgyICogdzAgKiByaG8yICogZDEpLFxuICAgICAgICBiMSA9ICh3MSAqIHcxIC0gdzAgKiB3MCAtIHJobzQgKiBkMikgLyAoMiAqIHcxICogcmhvMiAqIGQxKSxcbiAgICAgICAgcjAgPSBNYXRoLmxvZyhNYXRoLnNxcnQoYjAgKiBiMCArIDEpIC0gYjApLFxuICAgICAgICByMSA9IE1hdGgubG9nKE1hdGguc3FydChiMSAqIGIxICsgMSkgLSBiMSk7XG4gICAgUyA9IChyMSAtIHIwKSAvIHJobztcbiAgICBpID0gZnVuY3Rpb24odCkge1xuICAgICAgdmFyIHMgPSB0ICogUyxcbiAgICAgICAgICBjb3NocjAgPSBjb3NoKHIwKSxcbiAgICAgICAgICB1ID0gdzAgLyAocmhvMiAqIGQxKSAqIChjb3NocjAgKiB0YW5oKHJobyAqIHMgKyByMCkgLSBzaW5oKHIwKSk7XG4gICAgICByZXR1cm4gW1xuICAgICAgICB1eDAgKyB1ICogZHgsXG4gICAgICAgIHV5MCArIHUgKiBkeSxcbiAgICAgICAgdzAgKiBjb3NocjAgLyBjb3NoKHJobyAqIHMgKyByMClcbiAgICAgIF07XG4gICAgfVxuICB9XG5cbiAgaS5kdXJhdGlvbiA9IFMgKiAxMDAwO1xuXG4gIHJldHVybiBpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHg7XG4gIH07XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiAreDtcbn1cbiIsImltcG9ydCB7YmlzZWN0fSBmcm9tIFwiZDMtYXJyYXlcIjtcbmltcG9ydCB7aW50ZXJwb2xhdGUgYXMgaW50ZXJwb2xhdGVWYWx1ZSwgaW50ZXJwb2xhdGVSb3VuZH0gZnJvbSBcImQzLWludGVycG9sYXRlXCI7XG5pbXBvcnQge21hcCwgc2xpY2V9IGZyb20gXCIuL2FycmF5XCI7XG5pbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4vY29uc3RhbnRcIjtcbmltcG9ydCBudW1iZXIgZnJvbSBcIi4vbnVtYmVyXCI7XG5cbnZhciB1bml0ID0gWzAsIDFdO1xuXG5leHBvcnQgZnVuY3Rpb24gZGVpbnRlcnBvbGF0ZUxpbmVhcihhLCBiKSB7XG4gIHJldHVybiAoYiAtPSAoYSA9ICthKSlcbiAgICAgID8gZnVuY3Rpb24oeCkgeyByZXR1cm4gKHggLSBhKSAvIGI7IH1cbiAgICAgIDogY29uc3RhbnQoYik7XG59XG5cbmZ1bmN0aW9uIGRlaW50ZXJwb2xhdGVDbGFtcChkZWludGVycG9sYXRlKSB7XG4gIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgdmFyIGQgPSBkZWludGVycG9sYXRlKGEgPSArYSwgYiA9ICtiKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oeCkgeyByZXR1cm4geCA8PSBhID8gMCA6IHggPj0gYiA/IDEgOiBkKHgpOyB9O1xuICB9O1xufVxuXG5mdW5jdGlvbiByZWludGVycG9sYXRlQ2xhbXAocmVpbnRlcnBvbGF0ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oYSwgYikge1xuICAgIHZhciByID0gcmVpbnRlcnBvbGF0ZShhID0gK2EsIGIgPSArYik7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHsgcmV0dXJuIHQgPD0gMCA/IGEgOiB0ID49IDEgPyBiIDogcih0KTsgfTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYmltYXAoZG9tYWluLCByYW5nZSwgZGVpbnRlcnBvbGF0ZSwgcmVpbnRlcnBvbGF0ZSkge1xuICB2YXIgZDAgPSBkb21haW5bMF0sIGQxID0gZG9tYWluWzFdLCByMCA9IHJhbmdlWzBdLCByMSA9IHJhbmdlWzFdO1xuICBpZiAoZDEgPCBkMCkgZDAgPSBkZWludGVycG9sYXRlKGQxLCBkMCksIHIwID0gcmVpbnRlcnBvbGF0ZShyMSwgcjApO1xuICBlbHNlIGQwID0gZGVpbnRlcnBvbGF0ZShkMCwgZDEpLCByMCA9IHJlaW50ZXJwb2xhdGUocjAsIHIxKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHIwKGQwKHgpKTsgfTtcbn1cblxuZnVuY3Rpb24gcG9seW1hcChkb21haW4sIHJhbmdlLCBkZWludGVycG9sYXRlLCByZWludGVycG9sYXRlKSB7XG4gIHZhciBqID0gTWF0aC5taW4oZG9tYWluLmxlbmd0aCwgcmFuZ2UubGVuZ3RoKSAtIDEsXG4gICAgICBkID0gbmV3IEFycmF5KGopLFxuICAgICAgciA9IG5ldyBBcnJheShqKSxcbiAgICAgIGkgPSAtMTtcblxuICAvLyBSZXZlcnNlIGRlc2NlbmRpbmcgZG9tYWlucy5cbiAgaWYgKGRvbWFpbltqXSA8IGRvbWFpblswXSkge1xuICAgIGRvbWFpbiA9IGRvbWFpbi5zbGljZSgpLnJldmVyc2UoKTtcbiAgICByYW5nZSA9IHJhbmdlLnNsaWNlKCkucmV2ZXJzZSgpO1xuICB9XG5cbiAgd2hpbGUgKCsraSA8IGopIHtcbiAgICBkW2ldID0gZGVpbnRlcnBvbGF0ZShkb21haW5baV0sIGRvbWFpbltpICsgMV0pO1xuICAgIHJbaV0gPSByZWludGVycG9sYXRlKHJhbmdlW2ldLCByYW5nZVtpICsgMV0pO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgaSA9IGJpc2VjdChkb21haW4sIHgsIDEsIGopIC0gMTtcbiAgICByZXR1cm4gcltpXShkW2ldKHgpKTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvcHkoc291cmNlLCB0YXJnZXQpIHtcbiAgcmV0dXJuIHRhcmdldFxuICAgICAgLmRvbWFpbihzb3VyY2UuZG9tYWluKCkpXG4gICAgICAucmFuZ2Uoc291cmNlLnJhbmdlKCkpXG4gICAgICAuaW50ZXJwb2xhdGUoc291cmNlLmludGVycG9sYXRlKCkpXG4gICAgICAuY2xhbXAoc291cmNlLmNsYW1wKCkpO1xufVxuXG4vLyBkZWludGVycG9sYXRlKGEsIGIpKHgpIHRha2VzIGEgZG9tYWluIHZhbHVlIHggaW4gW2EsYl0gYW5kIHJldHVybnMgdGhlIGNvcnJlc3BvbmRpbmcgcGFyYW1ldGVyIHQgaW4gWzAsMV0uXG4vLyByZWludGVycG9sYXRlKGEsIGIpKHQpIHRha2VzIGEgcGFyYW1ldGVyIHQgaW4gWzAsMV0gYW5kIHJldHVybnMgdGhlIGNvcnJlc3BvbmRpbmcgZG9tYWluIHZhbHVlIHggaW4gW2EsYl0uXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb250aW51b3VzKGRlaW50ZXJwb2xhdGUsIHJlaW50ZXJwb2xhdGUpIHtcbiAgdmFyIGRvbWFpbiA9IHVuaXQsXG4gICAgICByYW5nZSA9IHVuaXQsXG4gICAgICBpbnRlcnBvbGF0ZSA9IGludGVycG9sYXRlVmFsdWUsXG4gICAgICBjbGFtcCA9IGZhbHNlLFxuICAgICAgcGllY2V3aXNlLFxuICAgICAgb3V0cHV0LFxuICAgICAgaW5wdXQ7XG5cbiAgZnVuY3Rpb24gcmVzY2FsZSgpIHtcbiAgICBwaWVjZXdpc2UgPSBNYXRoLm1pbihkb21haW4ubGVuZ3RoLCByYW5nZS5sZW5ndGgpID4gMiA/IHBvbHltYXAgOiBiaW1hcDtcbiAgICBvdXRwdXQgPSBpbnB1dCA9IG51bGw7XG4gICAgcmV0dXJuIHNjYWxlO1xuICB9XG5cbiAgZnVuY3Rpb24gc2NhbGUoeCkge1xuICAgIHJldHVybiAob3V0cHV0IHx8IChvdXRwdXQgPSBwaWVjZXdpc2UoZG9tYWluLCByYW5nZSwgY2xhbXAgPyBkZWludGVycG9sYXRlQ2xhbXAoZGVpbnRlcnBvbGF0ZSkgOiBkZWludGVycG9sYXRlLCBpbnRlcnBvbGF0ZSkpKSgreCk7XG4gIH1cblxuICBzY2FsZS5pbnZlcnQgPSBmdW5jdGlvbih5KSB7XG4gICAgcmV0dXJuIChpbnB1dCB8fCAoaW5wdXQgPSBwaWVjZXdpc2UocmFuZ2UsIGRvbWFpbiwgZGVpbnRlcnBvbGF0ZUxpbmVhciwgY2xhbXAgPyByZWludGVycG9sYXRlQ2xhbXAocmVpbnRlcnBvbGF0ZSkgOiByZWludGVycG9sYXRlKSkpKCt5KTtcbiAgfTtcblxuICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZG9tYWluID0gbWFwLmNhbGwoXywgbnVtYmVyKSwgcmVzY2FsZSgpKSA6IGRvbWFpbi5zbGljZSgpO1xuICB9O1xuXG4gIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHJhbmdlID0gc2xpY2UuY2FsbChfKSwgcmVzY2FsZSgpKSA6IHJhbmdlLnNsaWNlKCk7XG4gIH07XG5cbiAgc2NhbGUucmFuZ2VSb3VuZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gcmFuZ2UgPSBzbGljZS5jYWxsKF8pLCBpbnRlcnBvbGF0ZSA9IGludGVycG9sYXRlUm91bmQsIHJlc2NhbGUoKTtcbiAgfTtcblxuICBzY2FsZS5jbGFtcCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChjbGFtcCA9ICEhXywgcmVzY2FsZSgpKSA6IGNsYW1wO1xuICB9O1xuXG4gIHNjYWxlLmludGVycG9sYXRlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGludGVycG9sYXRlID0gXywgcmVzY2FsZSgpKSA6IGludGVycG9sYXRlO1xuICB9O1xuXG4gIHJldHVybiByZXNjYWxlKCk7XG59XG4iLCIvLyBDb21wdXRlcyB0aGUgZGVjaW1hbCBjb2VmZmljaWVudCBhbmQgZXhwb25lbnQgb2YgdGhlIHNwZWNpZmllZCBudW1iZXIgeCB3aXRoXG4vLyBzaWduaWZpY2FudCBkaWdpdHMgcCwgd2hlcmUgeCBpcyBwb3NpdGl2ZSBhbmQgcCBpcyBpbiBbMSwgMjFdIG9yIHVuZGVmaW5lZC5cbi8vIEZvciBleGFtcGxlLCBmb3JtYXREZWNpbWFsKDEuMjMpIHJldHVybnMgW1wiMTIzXCIsIDBdLlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgcCkge1xuICBpZiAoKGkgPSAoeCA9IHAgPyB4LnRvRXhwb25lbnRpYWwocCAtIDEpIDogeC50b0V4cG9uZW50aWFsKCkpLmluZGV4T2YoXCJlXCIpKSA8IDApIHJldHVybiBudWxsOyAvLyBOYU4sIMKxSW5maW5pdHlcbiAgdmFyIGksIGNvZWZmaWNpZW50ID0geC5zbGljZSgwLCBpKTtcblxuICAvLyBUaGUgc3RyaW5nIHJldHVybmVkIGJ5IHRvRXhwb25lbnRpYWwgZWl0aGVyIGhhcyB0aGUgZm9ybSBcXGRcXC5cXGQrZVstK11cXGQrXG4gIC8vIChlLmcuLCAxLjJlKzMpIG9yIHRoZSBmb3JtIFxcZGVbLStdXFxkKyAoZS5nLiwgMWUrMykuXG4gIHJldHVybiBbXG4gICAgY29lZmZpY2llbnQubGVuZ3RoID4gMSA/IGNvZWZmaWNpZW50WzBdICsgY29lZmZpY2llbnQuc2xpY2UoMikgOiBjb2VmZmljaWVudCxcbiAgICAreC5zbGljZShpICsgMSlcbiAgXTtcbn1cbiIsImltcG9ydCBmb3JtYXREZWNpbWFsIGZyb20gXCIuL2Zvcm1hdERlY2ltYWxcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4geCA9IGZvcm1hdERlY2ltYWwoTWF0aC5hYnMoeCkpLCB4ID8geFsxXSA6IE5hTjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGdyb3VwaW5nLCB0aG91c2FuZHMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCB3aWR0aCkge1xuICAgIHZhciBpID0gdmFsdWUubGVuZ3RoLFxuICAgICAgICB0ID0gW10sXG4gICAgICAgIGogPSAwLFxuICAgICAgICBnID0gZ3JvdXBpbmdbMF0sXG4gICAgICAgIGxlbmd0aCA9IDA7XG5cbiAgICB3aGlsZSAoaSA+IDAgJiYgZyA+IDApIHtcbiAgICAgIGlmIChsZW5ndGggKyBnICsgMSA+IHdpZHRoKSBnID0gTWF0aC5tYXgoMSwgd2lkdGggLSBsZW5ndGgpO1xuICAgICAgdC5wdXNoKHZhbHVlLnN1YnN0cmluZyhpIC09IGcsIGkgKyBnKSk7XG4gICAgICBpZiAoKGxlbmd0aCArPSBnICsgMSkgPiB3aWR0aCkgYnJlYWs7XG4gICAgICBnID0gZ3JvdXBpbmdbaiA9IChqICsgMSkgJSBncm91cGluZy5sZW5ndGhdO1xuICAgIH1cblxuICAgIHJldHVybiB0LnJldmVyc2UoKS5qb2luKHRob3VzYW5kcyk7XG4gIH07XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihudW1lcmFscykge1xuICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUucmVwbGFjZSgvWzAtOV0vZywgZnVuY3Rpb24oaSkge1xuICAgICAgcmV0dXJuIG51bWVyYWxzWytpXTtcbiAgICB9KTtcbiAgfTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgsIHApIHtcbiAgeCA9IHgudG9QcmVjaXNpb24ocCk7XG5cbiAgb3V0OiBmb3IgKHZhciBuID0geC5sZW5ndGgsIGkgPSAxLCBpMCA9IC0xLCBpMTsgaSA8IG47ICsraSkge1xuICAgIHN3aXRjaCAoeFtpXSkge1xuICAgICAgY2FzZSBcIi5cIjogaTAgPSBpMSA9IGk7IGJyZWFrO1xuICAgICAgY2FzZSBcIjBcIjogaWYgKGkwID09PSAwKSBpMCA9IGk7IGkxID0gaTsgYnJlYWs7XG4gICAgICBjYXNlIFwiZVwiOiBicmVhayBvdXQ7XG4gICAgICBkZWZhdWx0OiBpZiAoaTAgPiAwKSBpMCA9IDA7IGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBpMCA+IDAgPyB4LnNsaWNlKDAsIGkwKSArIHguc2xpY2UoaTEgKyAxKSA6IHg7XG59XG4iLCJpbXBvcnQgZm9ybWF0RGVjaW1hbCBmcm9tIFwiLi9mb3JtYXREZWNpbWFsXCI7XG5cbmV4cG9ydCB2YXIgcHJlZml4RXhwb25lbnQ7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgsIHApIHtcbiAgdmFyIGQgPSBmb3JtYXREZWNpbWFsKHgsIHApO1xuICBpZiAoIWQpIHJldHVybiB4ICsgXCJcIjtcbiAgdmFyIGNvZWZmaWNpZW50ID0gZFswXSxcbiAgICAgIGV4cG9uZW50ID0gZFsxXSxcbiAgICAgIGkgPSBleHBvbmVudCAtIChwcmVmaXhFeHBvbmVudCA9IE1hdGgubWF4KC04LCBNYXRoLm1pbig4LCBNYXRoLmZsb29yKGV4cG9uZW50IC8gMykpKSAqIDMpICsgMSxcbiAgICAgIG4gPSBjb2VmZmljaWVudC5sZW5ndGg7XG4gIHJldHVybiBpID09PSBuID8gY29lZmZpY2llbnRcbiAgICAgIDogaSA+IG4gPyBjb2VmZmljaWVudCArIG5ldyBBcnJheShpIC0gbiArIDEpLmpvaW4oXCIwXCIpXG4gICAgICA6IGkgPiAwID8gY29lZmZpY2llbnQuc2xpY2UoMCwgaSkgKyBcIi5cIiArIGNvZWZmaWNpZW50LnNsaWNlKGkpXG4gICAgICA6IFwiMC5cIiArIG5ldyBBcnJheSgxIC0gaSkuam9pbihcIjBcIikgKyBmb3JtYXREZWNpbWFsKHgsIE1hdGgubWF4KDAsIHAgKyBpIC0gMSkpWzBdOyAvLyBsZXNzIHRoYW4gMXkhXG59XG4iLCJpbXBvcnQgZm9ybWF0RGVjaW1hbCBmcm9tIFwiLi9mb3JtYXREZWNpbWFsXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgsIHApIHtcbiAgdmFyIGQgPSBmb3JtYXREZWNpbWFsKHgsIHApO1xuICBpZiAoIWQpIHJldHVybiB4ICsgXCJcIjtcbiAgdmFyIGNvZWZmaWNpZW50ID0gZFswXSxcbiAgICAgIGV4cG9uZW50ID0gZFsxXTtcbiAgcmV0dXJuIGV4cG9uZW50IDwgMCA/IFwiMC5cIiArIG5ldyBBcnJheSgtZXhwb25lbnQpLmpvaW4oXCIwXCIpICsgY29lZmZpY2llbnRcbiAgICAgIDogY29lZmZpY2llbnQubGVuZ3RoID4gZXhwb25lbnQgKyAxID8gY29lZmZpY2llbnQuc2xpY2UoMCwgZXhwb25lbnQgKyAxKSArIFwiLlwiICsgY29lZmZpY2llbnQuc2xpY2UoZXhwb25lbnQgKyAxKVxuICAgICAgOiBjb2VmZmljaWVudCArIG5ldyBBcnJheShleHBvbmVudCAtIGNvZWZmaWNpZW50Lmxlbmd0aCArIDIpLmpvaW4oXCIwXCIpO1xufVxuIiwiaW1wb3J0IGZvcm1hdERlZmF1bHQgZnJvbSBcIi4vZm9ybWF0RGVmYXVsdFwiO1xuaW1wb3J0IGZvcm1hdFByZWZpeEF1dG8gZnJvbSBcIi4vZm9ybWF0UHJlZml4QXV0b1wiO1xuaW1wb3J0IGZvcm1hdFJvdW5kZWQgZnJvbSBcIi4vZm9ybWF0Um91bmRlZFwiO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIFwiXCI6IGZvcm1hdERlZmF1bHQsXG4gIFwiJVwiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiAoeCAqIDEwMCkudG9GaXhlZChwKTsgfSxcbiAgXCJiXCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE1hdGgucm91bmQoeCkudG9TdHJpbmcoMik7IH0sXG4gIFwiY1wiOiBmdW5jdGlvbih4KSB7IHJldHVybiB4ICsgXCJcIjsgfSxcbiAgXCJkXCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE1hdGgucm91bmQoeCkudG9TdHJpbmcoMTApOyB9LFxuICBcImVcIjogZnVuY3Rpb24oeCwgcCkgeyByZXR1cm4geC50b0V4cG9uZW50aWFsKHApOyB9LFxuICBcImZcIjogZnVuY3Rpb24oeCwgcCkgeyByZXR1cm4geC50b0ZpeGVkKHApOyB9LFxuICBcImdcIjogZnVuY3Rpb24oeCwgcCkgeyByZXR1cm4geC50b1ByZWNpc2lvbihwKTsgfSxcbiAgXCJvXCI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIE1hdGgucm91bmQoeCkudG9TdHJpbmcoOCk7IH0sXG4gIFwicFwiOiBmdW5jdGlvbih4LCBwKSB7IHJldHVybiBmb3JtYXRSb3VuZGVkKHggKiAxMDAsIHApOyB9LFxuICBcInJcIjogZm9ybWF0Um91bmRlZCxcbiAgXCJzXCI6IGZvcm1hdFByZWZpeEF1dG8sXG4gIFwiWFwiOiBmdW5jdGlvbih4KSB7IHJldHVybiBNYXRoLnJvdW5kKHgpLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpOyB9LFxuICBcInhcIjogZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygxNik7IH1cbn07XG4iLCJpbXBvcnQgZm9ybWF0VHlwZXMgZnJvbSBcIi4vZm9ybWF0VHlwZXNcIjtcblxuLy8gW1tmaWxsXWFsaWduXVtzaWduXVtzeW1ib2xdWzBdW3dpZHRoXVssXVsucHJlY2lzaW9uXVt0eXBlXVxudmFyIHJlID0gL14oPzooLik/KFs8Pj1eXSkpPyhbK1xcLVxcKCBdKT8oWyQjXSk/KDApPyhcXGQrKT8oLCk/KFxcLlxcZCspPyhbYS16JV0pPyQvaTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcikge1xuICByZXR1cm4gbmV3IEZvcm1hdFNwZWNpZmllcihzcGVjaWZpZXIpO1xufVxuXG5mb3JtYXRTcGVjaWZpZXIucHJvdG90eXBlID0gRm9ybWF0U3BlY2lmaWVyLnByb3RvdHlwZTsgLy8gaW5zdGFuY2VvZlxuXG5mdW5jdGlvbiBGb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKSB7XG4gIGlmICghKG1hdGNoID0gcmUuZXhlYyhzcGVjaWZpZXIpKSkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBmb3JtYXQ6IFwiICsgc3BlY2lmaWVyKTtcblxuICB2YXIgbWF0Y2gsXG4gICAgICBmaWxsID0gbWF0Y2hbMV0gfHwgXCIgXCIsXG4gICAgICBhbGlnbiA9IG1hdGNoWzJdIHx8IFwiPlwiLFxuICAgICAgc2lnbiA9IG1hdGNoWzNdIHx8IFwiLVwiLFxuICAgICAgc3ltYm9sID0gbWF0Y2hbNF0gfHwgXCJcIixcbiAgICAgIHplcm8gPSAhIW1hdGNoWzVdLFxuICAgICAgd2lkdGggPSBtYXRjaFs2XSAmJiArbWF0Y2hbNl0sXG4gICAgICBjb21tYSA9ICEhbWF0Y2hbN10sXG4gICAgICBwcmVjaXNpb24gPSBtYXRjaFs4XSAmJiArbWF0Y2hbOF0uc2xpY2UoMSksXG4gICAgICB0eXBlID0gbWF0Y2hbOV0gfHwgXCJcIjtcblxuICAvLyBUaGUgXCJuXCIgdHlwZSBpcyBhbiBhbGlhcyBmb3IgXCIsZ1wiLlxuICBpZiAodHlwZSA9PT0gXCJuXCIpIGNvbW1hID0gdHJ1ZSwgdHlwZSA9IFwiZ1wiO1xuXG4gIC8vIE1hcCBpbnZhbGlkIHR5cGVzIHRvIHRoZSBkZWZhdWx0IGZvcm1hdC5cbiAgZWxzZSBpZiAoIWZvcm1hdFR5cGVzW3R5cGVdKSB0eXBlID0gXCJcIjtcblxuICAvLyBJZiB6ZXJvIGZpbGwgaXMgc3BlY2lmaWVkLCBwYWRkaW5nIGdvZXMgYWZ0ZXIgc2lnbiBhbmQgYmVmb3JlIGRpZ2l0cy5cbiAgaWYgKHplcm8gfHwgKGZpbGwgPT09IFwiMFwiICYmIGFsaWduID09PSBcIj1cIikpIHplcm8gPSB0cnVlLCBmaWxsID0gXCIwXCIsIGFsaWduID0gXCI9XCI7XG5cbiAgdGhpcy5maWxsID0gZmlsbDtcbiAgdGhpcy5hbGlnbiA9IGFsaWduO1xuICB0aGlzLnNpZ24gPSBzaWduO1xuICB0aGlzLnN5bWJvbCA9IHN5bWJvbDtcbiAgdGhpcy56ZXJvID0gemVybztcbiAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICB0aGlzLmNvbW1hID0gY29tbWE7XG4gIHRoaXMucHJlY2lzaW9uID0gcHJlY2lzaW9uO1xuICB0aGlzLnR5cGUgPSB0eXBlO1xufVxuXG5Gb3JtYXRTcGVjaWZpZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmZpbGxcbiAgICAgICsgdGhpcy5hbGlnblxuICAgICAgKyB0aGlzLnNpZ25cbiAgICAgICsgdGhpcy5zeW1ib2xcbiAgICAgICsgKHRoaXMuemVybyA/IFwiMFwiIDogXCJcIilcbiAgICAgICsgKHRoaXMud2lkdGggPT0gbnVsbCA/IFwiXCIgOiBNYXRoLm1heCgxLCB0aGlzLndpZHRoIHwgMCkpXG4gICAgICArICh0aGlzLmNvbW1hID8gXCIsXCIgOiBcIlwiKVxuICAgICAgKyAodGhpcy5wcmVjaXNpb24gPT0gbnVsbCA/IFwiXCIgOiBcIi5cIiArIE1hdGgubWF4KDAsIHRoaXMucHJlY2lzaW9uIHwgMCkpXG4gICAgICArIHRoaXMudHlwZTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4O1xufVxuIiwiaW1wb3J0IGV4cG9uZW50IGZyb20gXCIuL2V4cG9uZW50XCI7XG5pbXBvcnQgZm9ybWF0R3JvdXAgZnJvbSBcIi4vZm9ybWF0R3JvdXBcIjtcbmltcG9ydCBmb3JtYXROdW1lcmFscyBmcm9tIFwiLi9mb3JtYXROdW1lcmFsc1wiO1xuaW1wb3J0IGZvcm1hdFNwZWNpZmllciBmcm9tIFwiLi9mb3JtYXRTcGVjaWZpZXJcIjtcbmltcG9ydCBmb3JtYXRUeXBlcyBmcm9tIFwiLi9mb3JtYXRUeXBlc1wiO1xuaW1wb3J0IHtwcmVmaXhFeHBvbmVudH0gZnJvbSBcIi4vZm9ybWF0UHJlZml4QXV0b1wiO1xuaW1wb3J0IGlkZW50aXR5IGZyb20gXCIuL2lkZW50aXR5XCI7XG5cbnZhciBwcmVmaXhlcyA9IFtcInlcIixcInpcIixcImFcIixcImZcIixcInBcIixcIm5cIixcIsK1XCIsXCJtXCIsXCJcIixcImtcIixcIk1cIixcIkdcIixcIlRcIixcIlBcIixcIkVcIixcIlpcIixcIllcIl07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGxvY2FsZSkge1xuICB2YXIgZ3JvdXAgPSBsb2NhbGUuZ3JvdXBpbmcgJiYgbG9jYWxlLnRob3VzYW5kcyA/IGZvcm1hdEdyb3VwKGxvY2FsZS5ncm91cGluZywgbG9jYWxlLnRob3VzYW5kcykgOiBpZGVudGl0eSxcbiAgICAgIGN1cnJlbmN5ID0gbG9jYWxlLmN1cnJlbmN5LFxuICAgICAgZGVjaW1hbCA9IGxvY2FsZS5kZWNpbWFsLFxuICAgICAgbnVtZXJhbHMgPSBsb2NhbGUubnVtZXJhbHMgPyBmb3JtYXROdW1lcmFscyhsb2NhbGUubnVtZXJhbHMpIDogaWRlbnRpdHksXG4gICAgICBwZXJjZW50ID0gbG9jYWxlLnBlcmNlbnQgfHwgXCIlXCI7XG5cbiAgZnVuY3Rpb24gbmV3Rm9ybWF0KHNwZWNpZmllcikge1xuICAgIHNwZWNpZmllciA9IGZvcm1hdFNwZWNpZmllcihzcGVjaWZpZXIpO1xuXG4gICAgdmFyIGZpbGwgPSBzcGVjaWZpZXIuZmlsbCxcbiAgICAgICAgYWxpZ24gPSBzcGVjaWZpZXIuYWxpZ24sXG4gICAgICAgIHNpZ24gPSBzcGVjaWZpZXIuc2lnbixcbiAgICAgICAgc3ltYm9sID0gc3BlY2lmaWVyLnN5bWJvbCxcbiAgICAgICAgemVybyA9IHNwZWNpZmllci56ZXJvLFxuICAgICAgICB3aWR0aCA9IHNwZWNpZmllci53aWR0aCxcbiAgICAgICAgY29tbWEgPSBzcGVjaWZpZXIuY29tbWEsXG4gICAgICAgIHByZWNpc2lvbiA9IHNwZWNpZmllci5wcmVjaXNpb24sXG4gICAgICAgIHR5cGUgPSBzcGVjaWZpZXIudHlwZTtcblxuICAgIC8vIENvbXB1dGUgdGhlIHByZWZpeCBhbmQgc3VmZml4LlxuICAgIC8vIEZvciBTSS1wcmVmaXgsIHRoZSBzdWZmaXggaXMgbGF6aWx5IGNvbXB1dGVkLlxuICAgIHZhciBwcmVmaXggPSBzeW1ib2wgPT09IFwiJFwiID8gY3VycmVuY3lbMF0gOiBzeW1ib2wgPT09IFwiI1wiICYmIC9bYm94WF0vLnRlc3QodHlwZSkgPyBcIjBcIiArIHR5cGUudG9Mb3dlckNhc2UoKSA6IFwiXCIsXG4gICAgICAgIHN1ZmZpeCA9IHN5bWJvbCA9PT0gXCIkXCIgPyBjdXJyZW5jeVsxXSA6IC9bJXBdLy50ZXN0KHR5cGUpID8gcGVyY2VudCA6IFwiXCI7XG5cbiAgICAvLyBXaGF0IGZvcm1hdCBmdW5jdGlvbiBzaG91bGQgd2UgdXNlP1xuICAgIC8vIElzIHRoaXMgYW4gaW50ZWdlciB0eXBlP1xuICAgIC8vIENhbiB0aGlzIHR5cGUgZ2VuZXJhdGUgZXhwb25lbnRpYWwgbm90YXRpb24/XG4gICAgdmFyIGZvcm1hdFR5cGUgPSBmb3JtYXRUeXBlc1t0eXBlXSxcbiAgICAgICAgbWF5YmVTdWZmaXggPSAhdHlwZSB8fCAvW2RlZmdwcnMlXS8udGVzdCh0eXBlKTtcblxuICAgIC8vIFNldCB0aGUgZGVmYXVsdCBwcmVjaXNpb24gaWYgbm90IHNwZWNpZmllZCxcbiAgICAvLyBvciBjbGFtcCB0aGUgc3BlY2lmaWVkIHByZWNpc2lvbiB0byB0aGUgc3VwcG9ydGVkIHJhbmdlLlxuICAgIC8vIEZvciBzaWduaWZpY2FudCBwcmVjaXNpb24sIGl0IG11c3QgYmUgaW4gWzEsIDIxXS5cbiAgICAvLyBGb3IgZml4ZWQgcHJlY2lzaW9uLCBpdCBtdXN0IGJlIGluIFswLCAyMF0uXG4gICAgcHJlY2lzaW9uID0gcHJlY2lzaW9uID09IG51bGwgPyAodHlwZSA/IDYgOiAxMilcbiAgICAgICAgOiAvW2dwcnNdLy50ZXN0KHR5cGUpID8gTWF0aC5tYXgoMSwgTWF0aC5taW4oMjEsIHByZWNpc2lvbikpXG4gICAgICAgIDogTWF0aC5tYXgoMCwgTWF0aC5taW4oMjAsIHByZWNpc2lvbikpO1xuXG4gICAgZnVuY3Rpb24gZm9ybWF0KHZhbHVlKSB7XG4gICAgICB2YXIgdmFsdWVQcmVmaXggPSBwcmVmaXgsXG4gICAgICAgICAgdmFsdWVTdWZmaXggPSBzdWZmaXgsXG4gICAgICAgICAgaSwgbiwgYztcblxuICAgICAgaWYgKHR5cGUgPT09IFwiY1wiKSB7XG4gICAgICAgIHZhbHVlU3VmZml4ID0gZm9ybWF0VHlwZSh2YWx1ZSkgKyB2YWx1ZVN1ZmZpeDtcbiAgICAgICAgdmFsdWUgPSBcIlwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSArdmFsdWU7XG5cbiAgICAgICAgLy8gUGVyZm9ybSB0aGUgaW5pdGlhbCBmb3JtYXR0aW5nLlxuICAgICAgICB2YXIgdmFsdWVOZWdhdGl2ZSA9IHZhbHVlIDwgMDtcbiAgICAgICAgdmFsdWUgPSBmb3JtYXRUeXBlKE1hdGguYWJzKHZhbHVlKSwgcHJlY2lzaW9uKTtcblxuICAgICAgICAvLyBJZiBhIG5lZ2F0aXZlIHZhbHVlIHJvdW5kcyB0byB6ZXJvIGR1cmluZyBmb3JtYXR0aW5nLCB0cmVhdCBhcyBwb3NpdGl2ZS5cbiAgICAgICAgaWYgKHZhbHVlTmVnYXRpdmUgJiYgK3ZhbHVlID09PSAwKSB2YWx1ZU5lZ2F0aXZlID0gZmFsc2U7XG5cbiAgICAgICAgLy8gQ29tcHV0ZSB0aGUgcHJlZml4IGFuZCBzdWZmaXguXG4gICAgICAgIHZhbHVlUHJlZml4ID0gKHZhbHVlTmVnYXRpdmUgPyAoc2lnbiA9PT0gXCIoXCIgPyBzaWduIDogXCItXCIpIDogc2lnbiA9PT0gXCItXCIgfHwgc2lnbiA9PT0gXCIoXCIgPyBcIlwiIDogc2lnbikgKyB2YWx1ZVByZWZpeDtcbiAgICAgICAgdmFsdWVTdWZmaXggPSAodHlwZSA9PT0gXCJzXCIgPyBwcmVmaXhlc1s4ICsgcHJlZml4RXhwb25lbnQgLyAzXSA6IFwiXCIpICsgdmFsdWVTdWZmaXggKyAodmFsdWVOZWdhdGl2ZSAmJiBzaWduID09PSBcIihcIiA/IFwiKVwiIDogXCJcIik7XG5cbiAgICAgICAgLy8gQnJlYWsgdGhlIGZvcm1hdHRlZCB2YWx1ZSBpbnRvIHRoZSBpbnRlZ2VyIOKAnHZhbHVl4oCdIHBhcnQgdGhhdCBjYW4gYmVcbiAgICAgICAgLy8gZ3JvdXBlZCwgYW5kIGZyYWN0aW9uYWwgb3IgZXhwb25lbnRpYWwg4oCcc3VmZml44oCdIHBhcnQgdGhhdCBpcyBub3QuXG4gICAgICAgIGlmIChtYXliZVN1ZmZpeCkge1xuICAgICAgICAgIGkgPSAtMSwgbiA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICAgICAgaWYgKGMgPSB2YWx1ZS5jaGFyQ29kZUF0KGkpLCA0OCA+IGMgfHwgYyA+IDU3KSB7XG4gICAgICAgICAgICAgIHZhbHVlU3VmZml4ID0gKGMgPT09IDQ2ID8gZGVjaW1hbCArIHZhbHVlLnNsaWNlKGkgKyAxKSA6IHZhbHVlLnNsaWNlKGkpKSArIHZhbHVlU3VmZml4O1xuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnNsaWNlKDAsIGkpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIGZpbGwgY2hhcmFjdGVyIGlzIG5vdCBcIjBcIiwgZ3JvdXBpbmcgaXMgYXBwbGllZCBiZWZvcmUgcGFkZGluZy5cbiAgICAgIGlmIChjb21tYSAmJiAhemVybykgdmFsdWUgPSBncm91cCh2YWx1ZSwgSW5maW5pdHkpO1xuXG4gICAgICAvLyBDb21wdXRlIHRoZSBwYWRkaW5nLlxuICAgICAgdmFyIGxlbmd0aCA9IHZhbHVlUHJlZml4Lmxlbmd0aCArIHZhbHVlLmxlbmd0aCArIHZhbHVlU3VmZml4Lmxlbmd0aCxcbiAgICAgICAgICBwYWRkaW5nID0gbGVuZ3RoIDwgd2lkdGggPyBuZXcgQXJyYXkod2lkdGggLSBsZW5ndGggKyAxKS5qb2luKGZpbGwpIDogXCJcIjtcblxuICAgICAgLy8gSWYgdGhlIGZpbGwgY2hhcmFjdGVyIGlzIFwiMFwiLCBncm91cGluZyBpcyBhcHBsaWVkIGFmdGVyIHBhZGRpbmcuXG4gICAgICBpZiAoY29tbWEgJiYgemVybykgdmFsdWUgPSBncm91cChwYWRkaW5nICsgdmFsdWUsIHBhZGRpbmcubGVuZ3RoID8gd2lkdGggLSB2YWx1ZVN1ZmZpeC5sZW5ndGggOiBJbmZpbml0eSksIHBhZGRpbmcgPSBcIlwiO1xuXG4gICAgICAvLyBSZWNvbnN0cnVjdCB0aGUgZmluYWwgb3V0cHV0IGJhc2VkIG9uIHRoZSBkZXNpcmVkIGFsaWdubWVudC5cbiAgICAgIHN3aXRjaCAoYWxpZ24pIHtcbiAgICAgICAgY2FzZSBcIjxcIjogdmFsdWUgPSB2YWx1ZVByZWZpeCArIHZhbHVlICsgdmFsdWVTdWZmaXggKyBwYWRkaW5nOyBicmVhaztcbiAgICAgICAgY2FzZSBcIj1cIjogdmFsdWUgPSB2YWx1ZVByZWZpeCArIHBhZGRpbmcgKyB2YWx1ZSArIHZhbHVlU3VmZml4OyBicmVhaztcbiAgICAgICAgY2FzZSBcIl5cIjogdmFsdWUgPSBwYWRkaW5nLnNsaWNlKDAsIGxlbmd0aCA9IHBhZGRpbmcubGVuZ3RoID4+IDEpICsgdmFsdWVQcmVmaXggKyB2YWx1ZSArIHZhbHVlU3VmZml4ICsgcGFkZGluZy5zbGljZShsZW5ndGgpOyBicmVhaztcbiAgICAgICAgZGVmYXVsdDogdmFsdWUgPSBwYWRkaW5nICsgdmFsdWVQcmVmaXggKyB2YWx1ZSArIHZhbHVlU3VmZml4OyBicmVhaztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG51bWVyYWxzKHZhbHVlKTtcbiAgICB9XG5cbiAgICBmb3JtYXQudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBzcGVjaWZpZXIgKyBcIlwiO1xuICAgIH07XG5cbiAgICByZXR1cm4gZm9ybWF0O1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0UHJlZml4KHNwZWNpZmllciwgdmFsdWUpIHtcbiAgICB2YXIgZiA9IG5ld0Zvcm1hdCgoc3BlY2lmaWVyID0gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllciksIHNwZWNpZmllci50eXBlID0gXCJmXCIsIHNwZWNpZmllcikpLFxuICAgICAgICBlID0gTWF0aC5tYXgoLTgsIE1hdGgubWluKDgsIE1hdGguZmxvb3IoZXhwb25lbnQodmFsdWUpIC8gMykpKSAqIDMsXG4gICAgICAgIGsgPSBNYXRoLnBvdygxMCwgLWUpLFxuICAgICAgICBwcmVmaXggPSBwcmVmaXhlc1s4ICsgZSAvIDNdO1xuICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIGYoayAqIHZhbHVlKSArIHByZWZpeDtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBmb3JtYXQ6IG5ld0Zvcm1hdCxcbiAgICBmb3JtYXRQcmVmaXg6IGZvcm1hdFByZWZpeFxuICB9O1xufVxuIiwiaW1wb3J0IGZvcm1hdExvY2FsZSBmcm9tIFwiLi9sb2NhbGVcIjtcblxudmFyIGxvY2FsZTtcbmV4cG9ydCB2YXIgZm9ybWF0O1xuZXhwb3J0IHZhciBmb3JtYXRQcmVmaXg7XG5cbmRlZmF1bHRMb2NhbGUoe1xuICBkZWNpbWFsOiBcIi5cIixcbiAgdGhvdXNhbmRzOiBcIixcIixcbiAgZ3JvdXBpbmc6IFszXSxcbiAgY3VycmVuY3k6IFtcIiRcIiwgXCJcIl1cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkZWZhdWx0TG9jYWxlKGRlZmluaXRpb24pIHtcbiAgbG9jYWxlID0gZm9ybWF0TG9jYWxlKGRlZmluaXRpb24pO1xuICBmb3JtYXQgPSBsb2NhbGUuZm9ybWF0O1xuICBmb3JtYXRQcmVmaXggPSBsb2NhbGUuZm9ybWF0UHJlZml4O1xuICByZXR1cm4gbG9jYWxlO1xufVxuIiwiaW1wb3J0IGV4cG9uZW50IGZyb20gXCIuL2V4cG9uZW50XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0ZXApIHtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIC1leHBvbmVudChNYXRoLmFicyhzdGVwKSkpO1xufVxuIiwiaW1wb3J0IGV4cG9uZW50IGZyb20gXCIuL2V4cG9uZW50XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0ZXAsIHZhbHVlKSB7XG4gIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1heCgtOCwgTWF0aC5taW4oOCwgTWF0aC5mbG9vcihleHBvbmVudCh2YWx1ZSkgLyAzKSkpICogMyAtIGV4cG9uZW50KE1hdGguYWJzKHN0ZXApKSk7XG59XG4iLCJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RlcCwgbWF4KSB7XG4gIHN0ZXAgPSBNYXRoLmFicyhzdGVwKSwgbWF4ID0gTWF0aC5hYnMobWF4KSAtIHN0ZXA7XG4gIHJldHVybiBNYXRoLm1heCgwLCBleHBvbmVudChtYXgpIC0gZXhwb25lbnQoc3RlcCkpICsgMTtcbn1cbiIsImltcG9ydCB7dGlja1N0ZXB9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IHtmb3JtYXQsIGZvcm1hdFByZWZpeCwgZm9ybWF0U3BlY2lmaWVyLCBwcmVjaXNpb25GaXhlZCwgcHJlY2lzaW9uUHJlZml4LCBwcmVjaXNpb25Sb3VuZH0gZnJvbSBcImQzLWZvcm1hdFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihkb21haW4sIGNvdW50LCBzcGVjaWZpZXIpIHtcbiAgdmFyIHN0YXJ0ID0gZG9tYWluWzBdLFxuICAgICAgc3RvcCA9IGRvbWFpbltkb21haW4ubGVuZ3RoIC0gMV0sXG4gICAgICBzdGVwID0gdGlja1N0ZXAoc3RhcnQsIHN0b3AsIGNvdW50ID09IG51bGwgPyAxMCA6IGNvdW50KSxcbiAgICAgIHByZWNpc2lvbjtcbiAgc3BlY2lmaWVyID0gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllciA9PSBudWxsID8gXCIsZlwiIDogc3BlY2lmaWVyKTtcbiAgc3dpdGNoIChzcGVjaWZpZXIudHlwZSkge1xuICAgIGNhc2UgXCJzXCI6IHtcbiAgICAgIHZhciB2YWx1ZSA9IE1hdGgubWF4KE1hdGguYWJzKHN0YXJ0KSwgTWF0aC5hYnMoc3RvcCkpO1xuICAgICAgaWYgKHNwZWNpZmllci5wcmVjaXNpb24gPT0gbnVsbCAmJiAhaXNOYU4ocHJlY2lzaW9uID0gcHJlY2lzaW9uUHJlZml4KHN0ZXAsIHZhbHVlKSkpIHNwZWNpZmllci5wcmVjaXNpb24gPSBwcmVjaXNpb247XG4gICAgICByZXR1cm4gZm9ybWF0UHJlZml4KHNwZWNpZmllciwgdmFsdWUpO1xuICAgIH1cbiAgICBjYXNlIFwiXCI6XG4gICAgY2FzZSBcImVcIjpcbiAgICBjYXNlIFwiZ1wiOlxuICAgIGNhc2UgXCJwXCI6XG4gICAgY2FzZSBcInJcIjoge1xuICAgICAgaWYgKHNwZWNpZmllci5wcmVjaXNpb24gPT0gbnVsbCAmJiAhaXNOYU4ocHJlY2lzaW9uID0gcHJlY2lzaW9uUm91bmQoc3RlcCwgTWF0aC5tYXgoTWF0aC5hYnMoc3RhcnQpLCBNYXRoLmFicyhzdG9wKSkpKSkgc3BlY2lmaWVyLnByZWNpc2lvbiA9IHByZWNpc2lvbiAtIChzcGVjaWZpZXIudHlwZSA9PT0gXCJlXCIpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNhc2UgXCJmXCI6XG4gICAgY2FzZSBcIiVcIjoge1xuICAgICAgaWYgKHNwZWNpZmllci5wcmVjaXNpb24gPT0gbnVsbCAmJiAhaXNOYU4ocHJlY2lzaW9uID0gcHJlY2lzaW9uRml4ZWQoc3RlcCkpKSBzcGVjaWZpZXIucHJlY2lzaW9uID0gcHJlY2lzaW9uIC0gKHNwZWNpZmllci50eXBlID09PSBcIiVcIikgKiAyO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiBmb3JtYXQoc3BlY2lmaWVyKTtcbn1cbiIsImltcG9ydCB7dGlja3MsIHRpY2tJbmNyZW1lbnR9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IHtpbnRlcnBvbGF0ZU51bWJlciBhcyByZWludGVycG9sYXRlfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcbmltcG9ydCB7ZGVmYXVsdCBhcyBjb250aW51b3VzLCBjb3B5LCBkZWludGVycG9sYXRlTGluZWFyIGFzIGRlaW50ZXJwb2xhdGV9IGZyb20gXCIuL2NvbnRpbnVvdXNcIjtcbmltcG9ydCB0aWNrRm9ybWF0IGZyb20gXCIuL3RpY2tGb3JtYXRcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGxpbmVhcmlzaChzY2FsZSkge1xuICB2YXIgZG9tYWluID0gc2NhbGUuZG9tYWluO1xuXG4gIHNjYWxlLnRpY2tzID0gZnVuY3Rpb24oY291bnQpIHtcbiAgICB2YXIgZCA9IGRvbWFpbigpO1xuICAgIHJldHVybiB0aWNrcyhkWzBdLCBkW2QubGVuZ3RoIC0gMV0sIGNvdW50ID09IG51bGwgPyAxMCA6IGNvdW50KTtcbiAgfTtcblxuICBzY2FsZS50aWNrRm9ybWF0ID0gZnVuY3Rpb24oY291bnQsIHNwZWNpZmllcikge1xuICAgIHJldHVybiB0aWNrRm9ybWF0KGRvbWFpbigpLCBjb3VudCwgc3BlY2lmaWVyKTtcbiAgfTtcblxuICBzY2FsZS5uaWNlID0gZnVuY3Rpb24oY291bnQpIHtcbiAgICBpZiAoY291bnQgPT0gbnVsbCkgY291bnQgPSAxMDtcblxuICAgIHZhciBkID0gZG9tYWluKCksXG4gICAgICAgIGkwID0gMCxcbiAgICAgICAgaTEgPSBkLmxlbmd0aCAtIDEsXG4gICAgICAgIHN0YXJ0ID0gZFtpMF0sXG4gICAgICAgIHN0b3AgPSBkW2kxXSxcbiAgICAgICAgc3RlcDtcblxuICAgIGlmIChzdG9wIDwgc3RhcnQpIHtcbiAgICAgIHN0ZXAgPSBzdGFydCwgc3RhcnQgPSBzdG9wLCBzdG9wID0gc3RlcDtcbiAgICAgIHN0ZXAgPSBpMCwgaTAgPSBpMSwgaTEgPSBzdGVwO1xuICAgIH1cblxuICAgIHN0ZXAgPSB0aWNrSW5jcmVtZW50KHN0YXJ0LCBzdG9wLCBjb3VudCk7XG5cbiAgICBpZiAoc3RlcCA+IDApIHtcbiAgICAgIHN0YXJ0ID0gTWF0aC5mbG9vcihzdGFydCAvIHN0ZXApICogc3RlcDtcbiAgICAgIHN0b3AgPSBNYXRoLmNlaWwoc3RvcCAvIHN0ZXApICogc3RlcDtcbiAgICAgIHN0ZXAgPSB0aWNrSW5jcmVtZW50KHN0YXJ0LCBzdG9wLCBjb3VudCk7XG4gICAgfSBlbHNlIGlmIChzdGVwIDwgMCkge1xuICAgICAgc3RhcnQgPSBNYXRoLmNlaWwoc3RhcnQgKiBzdGVwKSAvIHN0ZXA7XG4gICAgICBzdG9wID0gTWF0aC5mbG9vcihzdG9wICogc3RlcCkgLyBzdGVwO1xuICAgICAgc3RlcCA9IHRpY2tJbmNyZW1lbnQoc3RhcnQsIHN0b3AsIGNvdW50KTtcbiAgICB9XG5cbiAgICBpZiAoc3RlcCA+IDApIHtcbiAgICAgIGRbaTBdID0gTWF0aC5mbG9vcihzdGFydCAvIHN0ZXApICogc3RlcDtcbiAgICAgIGRbaTFdID0gTWF0aC5jZWlsKHN0b3AgLyBzdGVwKSAqIHN0ZXA7XG4gICAgICBkb21haW4oZCk7XG4gICAgfSBlbHNlIGlmIChzdGVwIDwgMCkge1xuICAgICAgZFtpMF0gPSBNYXRoLmNlaWwoc3RhcnQgKiBzdGVwKSAvIHN0ZXA7XG4gICAgICBkW2kxXSA9IE1hdGguZmxvb3Ioc3RvcCAqIHN0ZXApIC8gc3RlcDtcbiAgICAgIGRvbWFpbihkKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2NhbGU7XG4gIH07XG5cbiAgcmV0dXJuIHNjYWxlO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBsaW5lYXIoKSB7XG4gIHZhciBzY2FsZSA9IGNvbnRpbnVvdXMoZGVpbnRlcnBvbGF0ZSwgcmVpbnRlcnBvbGF0ZSk7XG5cbiAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjb3B5KHNjYWxlLCBsaW5lYXIoKSk7XG4gIH07XG5cbiAgcmV0dXJuIGxpbmVhcmlzaChzY2FsZSk7XG59XG4iLCJ2YXIgdDAgPSBuZXcgRGF0ZSxcbiAgICB0MSA9IG5ldyBEYXRlO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBuZXdJbnRlcnZhbChmbG9vcmksIG9mZnNldGksIGNvdW50LCBmaWVsZCkge1xuXG4gIGZ1bmN0aW9uIGludGVydmFsKGRhdGUpIHtcbiAgICByZXR1cm4gZmxvb3JpKGRhdGUgPSBuZXcgRGF0ZSgrZGF0ZSkpLCBkYXRlO1xuICB9XG5cbiAgaW50ZXJ2YWwuZmxvb3IgPSBpbnRlcnZhbDtcblxuICBpbnRlcnZhbC5jZWlsID0gZnVuY3Rpb24oZGF0ZSkge1xuICAgIHJldHVybiBmbG9vcmkoZGF0ZSA9IG5ldyBEYXRlKGRhdGUgLSAxKSksIG9mZnNldGkoZGF0ZSwgMSksIGZsb29yaShkYXRlKSwgZGF0ZTtcbiAgfTtcblxuICBpbnRlcnZhbC5yb3VuZCA9IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICB2YXIgZDAgPSBpbnRlcnZhbChkYXRlKSxcbiAgICAgICAgZDEgPSBpbnRlcnZhbC5jZWlsKGRhdGUpO1xuICAgIHJldHVybiBkYXRlIC0gZDAgPCBkMSAtIGRhdGUgPyBkMCA6IGQxO1xuICB9O1xuXG4gIGludGVydmFsLm9mZnNldCA9IGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICByZXR1cm4gb2Zmc2V0aShkYXRlID0gbmV3IERhdGUoK2RhdGUpLCBzdGVwID09IG51bGwgPyAxIDogTWF0aC5mbG9vcihzdGVwKSksIGRhdGU7XG4gIH07XG5cbiAgaW50ZXJ2YWwucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIHZhciByYW5nZSA9IFtdLCBwcmV2aW91cztcbiAgICBzdGFydCA9IGludGVydmFsLmNlaWwoc3RhcnQpO1xuICAgIHN0ZXAgPSBzdGVwID09IG51bGwgPyAxIDogTWF0aC5mbG9vcihzdGVwKTtcbiAgICBpZiAoIShzdGFydCA8IHN0b3ApIHx8ICEoc3RlcCA+IDApKSByZXR1cm4gcmFuZ2U7IC8vIGFsc28gaGFuZGxlcyBJbnZhbGlkIERhdGVcbiAgICBkbyByYW5nZS5wdXNoKHByZXZpb3VzID0gbmV3IERhdGUoK3N0YXJ0KSksIG9mZnNldGkoc3RhcnQsIHN0ZXApLCBmbG9vcmkoc3RhcnQpO1xuICAgIHdoaWxlIChwcmV2aW91cyA8IHN0YXJ0ICYmIHN0YXJ0IDwgc3RvcCk7XG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIGludGVydmFsLmZpbHRlciA9IGZ1bmN0aW9uKHRlc3QpIHtcbiAgICByZXR1cm4gbmV3SW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgaWYgKGRhdGUgPj0gZGF0ZSkgd2hpbGUgKGZsb29yaShkYXRlKSwgIXRlc3QoZGF0ZSkpIGRhdGUuc2V0VGltZShkYXRlIC0gMSk7XG4gICAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgICAgaWYgKGRhdGUgPj0gZGF0ZSkge1xuICAgICAgICBpZiAoc3RlcCA8IDApIHdoaWxlICgrK3N0ZXAgPD0gMCkge1xuICAgICAgICAgIHdoaWxlIChvZmZzZXRpKGRhdGUsIC0xKSwgIXRlc3QoZGF0ZSkpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHlcbiAgICAgICAgfSBlbHNlIHdoaWxlICgtLXN0ZXAgPj0gMCkge1xuICAgICAgICAgIHdoaWxlIChvZmZzZXRpKGRhdGUsICsxKSwgIXRlc3QoZGF0ZSkpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIGlmIChjb3VudCkge1xuICAgIGludGVydmFsLmNvdW50ID0gZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgICAgdDAuc2V0VGltZSgrc3RhcnQpLCB0MS5zZXRUaW1lKCtlbmQpO1xuICAgICAgZmxvb3JpKHQwKSwgZmxvb3JpKHQxKTtcbiAgICAgIHJldHVybiBNYXRoLmZsb29yKGNvdW50KHQwLCB0MSkpO1xuICAgIH07XG5cbiAgICBpbnRlcnZhbC5ldmVyeSA9IGZ1bmN0aW9uKHN0ZXApIHtcbiAgICAgIHN0ZXAgPSBNYXRoLmZsb29yKHN0ZXApO1xuICAgICAgcmV0dXJuICFpc0Zpbml0ZShzdGVwKSB8fCAhKHN0ZXAgPiAwKSA/IG51bGxcbiAgICAgICAgICA6ICEoc3RlcCA+IDEpID8gaW50ZXJ2YWxcbiAgICAgICAgICA6IGludGVydmFsLmZpbHRlcihmaWVsZFxuICAgICAgICAgICAgICA/IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGZpZWxkKGQpICUgc3RlcCA9PT0gMDsgfVxuICAgICAgICAgICAgICA6IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGludGVydmFsLmNvdW50KDAsIGQpICUgc3RlcCA9PT0gMDsgfSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBpbnRlcnZhbDtcbn1cbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuXG52YXIgbWlsbGlzZWNvbmQgPSBpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgLy8gbm9vcFxufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZCAtIHN0YXJ0O1xufSk7XG5cbi8vIEFuIG9wdGltaXplZCBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBzaW1wbGUgY2FzZS5cbm1pbGxpc2Vjb25kLmV2ZXJ5ID0gZnVuY3Rpb24oaykge1xuICBrID0gTWF0aC5mbG9vcihrKTtcbiAgaWYgKCFpc0Zpbml0ZShrKSB8fCAhKGsgPiAwKSkgcmV0dXJuIG51bGw7XG4gIGlmICghKGsgPiAxKSkgcmV0dXJuIG1pbGxpc2Vjb25kO1xuICByZXR1cm4gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0VGltZShNYXRoLmZsb29yKGRhdGUgLyBrKSAqIGspO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGspO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBrO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1pbGxpc2Vjb25kO1xuZXhwb3J0IHZhciBtaWxsaXNlY29uZHMgPSBtaWxsaXNlY29uZC5yYW5nZTtcbiIsImV4cG9ydCB2YXIgZHVyYXRpb25TZWNvbmQgPSAxZTM7XG5leHBvcnQgdmFyIGR1cmF0aW9uTWludXRlID0gNmU0O1xuZXhwb3J0IHZhciBkdXJhdGlvbkhvdXIgPSAzNmU1O1xuZXhwb3J0IHZhciBkdXJhdGlvbkRheSA9IDg2NGU1O1xuZXhwb3J0IHZhciBkdXJhdGlvbldlZWsgPSA2MDQ4ZTU7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25TZWNvbmR9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciBzZWNvbmQgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VGltZShNYXRoLmZsb29yKGRhdGUgLyBkdXJhdGlvblNlY29uZCkgKiBkdXJhdGlvblNlY29uZCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvblNlY29uZCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25TZWNvbmQ7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldFVUQ1NlY29uZHMoKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBzZWNvbmQ7XG5leHBvcnQgdmFyIHNlY29uZHMgPSBzZWNvbmQucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25NaW51dGV9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciBtaW51dGUgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VGltZShNYXRoLmZsb29yKGRhdGUgLyBkdXJhdGlvbk1pbnV0ZSkgKiBkdXJhdGlvbk1pbnV0ZSk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbk1pbnV0ZSk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25NaW51dGU7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldE1pbnV0ZXMoKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBtaW51dGU7XG5leHBvcnQgdmFyIG1pbnV0ZXMgPSBtaW51dGUucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25Ib3VyLCBkdXJhdGlvbk1pbnV0ZX0gZnJvbSBcIi4vZHVyYXRpb25cIjtcblxudmFyIGhvdXIgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIHZhciBvZmZzZXQgPSBkYXRlLmdldFRpbWV6b25lT2Zmc2V0KCkgKiBkdXJhdGlvbk1pbnV0ZSAlIGR1cmF0aW9uSG91cjtcbiAgaWYgKG9mZnNldCA8IDApIG9mZnNldCArPSBkdXJhdGlvbkhvdXI7XG4gIGRhdGUuc2V0VGltZShNYXRoLmZsb29yKCgrZGF0ZSAtIG9mZnNldCkgLyBkdXJhdGlvbkhvdXIpICogZHVyYXRpb25Ib3VyICsgb2Zmc2V0KTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uSG91cik7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25Ib3VyO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRIb3VycygpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGhvdXI7XG5leHBvcnQgdmFyIGhvdXJzID0gaG91ci5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuaW1wb3J0IHtkdXJhdGlvbkRheSwgZHVyYXRpb25NaW51dGV9IGZyb20gXCIuL2R1cmF0aW9uXCI7XG5cbnZhciBkYXkgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0IC0gKGVuZC5nZXRUaW1lem9uZU9mZnNldCgpIC0gc3RhcnQuZ2V0VGltZXpvbmVPZmZzZXQoKSkgKiBkdXJhdGlvbk1pbnV0ZSkgLyBkdXJhdGlvbkRheTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0RGF0ZSgpIC0gMTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBkYXk7XG5leHBvcnQgdmFyIGRheXMgPSBkYXkucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25NaW51dGUsIGR1cmF0aW9uV2Vla30gZnJvbSBcIi4vZHVyYXRpb25cIjtcblxuZnVuY3Rpb24gd2Vla2RheShpKSB7XG4gIHJldHVybiBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gKGRhdGUuZ2V0RGF5KCkgKyA3IC0gaSkgJSA3KTtcbiAgICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgc3RlcCAqIDcpO1xuICB9LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCAtIChlbmQuZ2V0VGltZXpvbmVPZmZzZXQoKSAtIHN0YXJ0LmdldFRpbWV6b25lT2Zmc2V0KCkpICogZHVyYXRpb25NaW51dGUpIC8gZHVyYXRpb25XZWVrO1xuICB9KTtcbn1cblxuZXhwb3J0IHZhciBzdW5kYXkgPSB3ZWVrZGF5KDApO1xuZXhwb3J0IHZhciBtb25kYXkgPSB3ZWVrZGF5KDEpO1xuZXhwb3J0IHZhciB0dWVzZGF5ID0gd2Vla2RheSgyKTtcbmV4cG9ydCB2YXIgd2VkbmVzZGF5ID0gd2Vla2RheSgzKTtcbmV4cG9ydCB2YXIgdGh1cnNkYXkgPSB3ZWVrZGF5KDQpO1xuZXhwb3J0IHZhciBmcmlkYXkgPSB3ZWVrZGF5KDUpO1xuZXhwb3J0IHZhciBzYXR1cmRheSA9IHdlZWtkYXkoNik7XG5cbmV4cG9ydCB2YXIgc3VuZGF5cyA9IHN1bmRheS5yYW5nZTtcbmV4cG9ydCB2YXIgbW9uZGF5cyA9IG1vbmRheS5yYW5nZTtcbmV4cG9ydCB2YXIgdHVlc2RheXMgPSB0dWVzZGF5LnJhbmdlO1xuZXhwb3J0IHZhciB3ZWRuZXNkYXlzID0gd2VkbmVzZGF5LnJhbmdlO1xuZXhwb3J0IHZhciB0aHVyc2RheXMgPSB0aHVyc2RheS5yYW5nZTtcbmV4cG9ydCB2YXIgZnJpZGF5cyA9IGZyaWRheS5yYW5nZTtcbmV4cG9ydCB2YXIgc2F0dXJkYXlzID0gc2F0dXJkYXkucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcblxudmFyIG1vbnRoID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldERhdGUoMSk7XG4gIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0TW9udGgoZGF0ZS5nZXRNb250aCgpICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiBlbmQuZ2V0TW9udGgoKSAtIHN0YXJ0LmdldE1vbnRoKCkgKyAoZW5kLmdldEZ1bGxZZWFyKCkgLSBzdGFydC5nZXRGdWxsWWVhcigpKSAqIDEyO1xufSwgZnVuY3Rpb24oZGF0ZSkge1xuICByZXR1cm4gZGF0ZS5nZXRNb250aCgpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IG1vbnRoO1xuZXhwb3J0IHZhciBtb250aHMgPSBtb250aC5yYW5nZTtcbiIsImltcG9ydCBpbnRlcnZhbCBmcm9tIFwiLi9pbnRlcnZhbFwiO1xuXG52YXIgeWVhciA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRNb250aCgwLCAxKTtcbiAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbn0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgZGF0ZS5zZXRGdWxsWWVhcihkYXRlLmdldEZ1bGxZZWFyKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGVuZC5nZXRGdWxsWWVhcigpIC0gc3RhcnQuZ2V0RnVsbFllYXIoKTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKTtcbn0pO1xuXG4vLyBBbiBvcHRpbWl6ZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgc2ltcGxlIGNhc2UuXG55ZWFyLmV2ZXJ5ID0gZnVuY3Rpb24oaykge1xuICByZXR1cm4gIWlzRmluaXRlKGsgPSBNYXRoLmZsb29yKGspKSB8fCAhKGsgPiAwKSA/IG51bGwgOiBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gICAgZGF0ZS5zZXRGdWxsWWVhcihNYXRoLmZsb29yKGRhdGUuZ2V0RnVsbFllYXIoKSAvIGspICogayk7XG4gICAgZGF0ZS5zZXRNb250aCgwLCAxKTtcbiAgICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICB9LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gICAgZGF0ZS5zZXRGdWxsWWVhcihkYXRlLmdldEZ1bGxZZWFyKCkgKyBzdGVwICogayk7XG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgeWVhcjtcbmV4cG9ydCB2YXIgeWVhcnMgPSB5ZWFyLnJhbmdlO1xuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5pbXBvcnQge2R1cmF0aW9uTWludXRlfSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG52YXIgdXRjTWludXRlID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFVUQ1NlY29uZHMoMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbk1pbnV0ZSk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25NaW51dGU7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldFVUQ01pbnV0ZXMoKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCB1dGNNaW51dGU7XG5leHBvcnQgdmFyIHV0Y01pbnV0ZXMgPSB1dGNNaW51dGUucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25Ib3VyfSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG52YXIgdXRjSG91ciA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRVVENNaW51dGVzKDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogZHVyYXRpb25Ib3VyKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbkhvdXI7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldFVUQ0hvdXJzKCk7XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgdXRjSG91cjtcbmV4cG9ydCB2YXIgdXRjSG91cnMgPSB1dGNIb3VyLnJhbmdlO1xuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5pbXBvcnQge2R1cmF0aW9uRGF5fSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG52YXIgdXRjRGF5ID0gaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFVUQ0RhdGUoZGF0ZS5nZXRVVENEYXRlKCkgKyBzdGVwKTtcbn0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbkRheTtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDRGF0ZSgpIC0gMTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCB1dGNEYXk7XG5leHBvcnQgdmFyIHV0Y0RheXMgPSB1dGNEYXkucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcbmltcG9ydCB7ZHVyYXRpb25XZWVrfSBmcm9tIFwiLi9kdXJhdGlvblwiO1xuXG5mdW5jdGlvbiB1dGNXZWVrZGF5KGkpIHtcbiAgcmV0dXJuIGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBkYXRlLnNldFVUQ0RhdGUoZGF0ZS5nZXRVVENEYXRlKCkgLSAoZGF0ZS5nZXRVVENEYXkoKSArIDcgLSBpKSAlIDcpO1xuICAgIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG4gIH0sIGZ1bmN0aW9uKGRhdGUsIHN0ZXApIHtcbiAgICBkYXRlLnNldFVUQ0RhdGUoZGF0ZS5nZXRVVENEYXRlKCkgKyBzdGVwICogNyk7XG4gIH0sIGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uV2VlaztcbiAgfSk7XG59XG5cbmV4cG9ydCB2YXIgdXRjU3VuZGF5ID0gdXRjV2Vla2RheSgwKTtcbmV4cG9ydCB2YXIgdXRjTW9uZGF5ID0gdXRjV2Vla2RheSgxKTtcbmV4cG9ydCB2YXIgdXRjVHVlc2RheSA9IHV0Y1dlZWtkYXkoMik7XG5leHBvcnQgdmFyIHV0Y1dlZG5lc2RheSA9IHV0Y1dlZWtkYXkoMyk7XG5leHBvcnQgdmFyIHV0Y1RodXJzZGF5ID0gdXRjV2Vla2RheSg0KTtcbmV4cG9ydCB2YXIgdXRjRnJpZGF5ID0gdXRjV2Vla2RheSg1KTtcbmV4cG9ydCB2YXIgdXRjU2F0dXJkYXkgPSB1dGNXZWVrZGF5KDYpO1xuXG5leHBvcnQgdmFyIHV0Y1N1bmRheXMgPSB1dGNTdW5kYXkucmFuZ2U7XG5leHBvcnQgdmFyIHV0Y01vbmRheXMgPSB1dGNNb25kYXkucmFuZ2U7XG5leHBvcnQgdmFyIHV0Y1R1ZXNkYXlzID0gdXRjVHVlc2RheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjV2VkbmVzZGF5cyA9IHV0Y1dlZG5lc2RheS5yYW5nZTtcbmV4cG9ydCB2YXIgdXRjVGh1cnNkYXlzID0gdXRjVGh1cnNkYXkucmFuZ2U7XG5leHBvcnQgdmFyIHV0Y0ZyaWRheXMgPSB1dGNGcmlkYXkucmFuZ2U7XG5leHBvcnQgdmFyIHV0Y1NhdHVyZGF5cyA9IHV0Y1NhdHVyZGF5LnJhbmdlO1xuIiwiaW1wb3J0IGludGVydmFsIGZyb20gXCIuL2ludGVydmFsXCI7XG5cbnZhciB1dGNNb250aCA9IGludGVydmFsKGZ1bmN0aW9uKGRhdGUpIHtcbiAgZGF0ZS5zZXRVVENEYXRlKDEpO1xuICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xufSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICBkYXRlLnNldFVUQ01vbnRoKGRhdGUuZ2V0VVRDTW9udGgoKSArIHN0ZXApO1xufSwgZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICByZXR1cm4gZW5kLmdldFVUQ01vbnRoKCkgLSBzdGFydC5nZXRVVENNb250aCgpICsgKGVuZC5nZXRVVENGdWxsWWVhcigpIC0gc3RhcnQuZ2V0VVRDRnVsbFllYXIoKSkgKiAxMjtcbn0sIGZ1bmN0aW9uKGRhdGUpIHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDTW9udGgoKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCB1dGNNb250aDtcbmV4cG9ydCB2YXIgdXRjTW9udGhzID0gdXRjTW9udGgucmFuZ2U7XG4iLCJpbXBvcnQgaW50ZXJ2YWwgZnJvbSBcIi4vaW50ZXJ2YWxcIjtcblxudmFyIHV0Y1llYXIgPSBpbnRlcnZhbChmdW5jdGlvbihkYXRlKSB7XG4gIGRhdGUuc2V0VVRDTW9udGgoMCwgMSk7XG4gIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG59LCBmdW5jdGlvbihkYXRlLCBzdGVwKSB7XG4gIGRhdGUuc2V0VVRDRnVsbFllYXIoZGF0ZS5nZXRVVENGdWxsWWVhcigpICsgc3RlcCk7XG59LCBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHJldHVybiBlbmQuZ2V0VVRDRnVsbFllYXIoKSAtIHN0YXJ0LmdldFVUQ0Z1bGxZZWFyKCk7XG59LCBmdW5jdGlvbihkYXRlKSB7XG4gIHJldHVybiBkYXRlLmdldFVUQ0Z1bGxZZWFyKCk7XG59KTtcblxuLy8gQW4gb3B0aW1pemVkIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIHNpbXBsZSBjYXNlLlxudXRjWWVhci5ldmVyeSA9IGZ1bmN0aW9uKGspIHtcbiAgcmV0dXJuICFpc0Zpbml0ZShrID0gTWF0aC5mbG9vcihrKSkgfHwgIShrID4gMCkgPyBudWxsIDogaW50ZXJ2YWwoZnVuY3Rpb24oZGF0ZSkge1xuICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoTWF0aC5mbG9vcihkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgLyBrKSAqIGspO1xuICAgIGRhdGUuc2V0VVRDTW9udGgoMCwgMSk7XG4gICAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgZnVuY3Rpb24oZGF0ZSwgc3RlcCkge1xuICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoZGF0ZS5nZXRVVENGdWxsWWVhcigpICsgc3RlcCAqIGspO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHV0Y1llYXI7XG5leHBvcnQgdmFyIHV0Y1llYXJzID0gdXRjWWVhci5yYW5nZTtcbiIsImltcG9ydCB7XG4gIHRpbWVEYXksXG4gIHRpbWVTdW5kYXksXG4gIHRpbWVNb25kYXksXG4gIHRpbWVUaHVyc2RheSxcbiAgdGltZVllYXIsXG4gIHV0Y0RheSxcbiAgdXRjU3VuZGF5LFxuICB1dGNNb25kYXksXG4gIHV0Y1RodXJzZGF5LFxuICB1dGNZZWFyXG59IGZyb20gXCJkMy10aW1lXCI7XG5cbmZ1bmN0aW9uIGxvY2FsRGF0ZShkKSB7XG4gIGlmICgwIDw9IGQueSAmJiBkLnkgPCAxMDApIHtcbiAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKC0xLCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKTtcbiAgICBkYXRlLnNldEZ1bGxZZWFyKGQueSk7XG4gICAgcmV0dXJuIGRhdGU7XG4gIH1cbiAgcmV0dXJuIG5ldyBEYXRlKGQueSwgZC5tLCBkLmQsIGQuSCwgZC5NLCBkLlMsIGQuTCk7XG59XG5cbmZ1bmN0aW9uIHV0Y0RhdGUoZCkge1xuICBpZiAoMCA8PSBkLnkgJiYgZC55IDwgMTAwKSB7XG4gICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQygtMSwgZC5tLCBkLmQsIGQuSCwgZC5NLCBkLlMsIGQuTCkpO1xuICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoZC55KTtcbiAgICByZXR1cm4gZGF0ZTtcbiAgfVxuICByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoZC55LCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKSk7XG59XG5cbmZ1bmN0aW9uIG5ld1llYXIoeSkge1xuICByZXR1cm4ge3k6IHksIG06IDAsIGQ6IDEsIEg6IDAsIE06IDAsIFM6IDAsIEw6IDB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmb3JtYXRMb2NhbGUobG9jYWxlKSB7XG4gIHZhciBsb2NhbGVfZGF0ZVRpbWUgPSBsb2NhbGUuZGF0ZVRpbWUsXG4gICAgICBsb2NhbGVfZGF0ZSA9IGxvY2FsZS5kYXRlLFxuICAgICAgbG9jYWxlX3RpbWUgPSBsb2NhbGUudGltZSxcbiAgICAgIGxvY2FsZV9wZXJpb2RzID0gbG9jYWxlLnBlcmlvZHMsXG4gICAgICBsb2NhbGVfd2Vla2RheXMgPSBsb2NhbGUuZGF5cyxcbiAgICAgIGxvY2FsZV9zaG9ydFdlZWtkYXlzID0gbG9jYWxlLnNob3J0RGF5cyxcbiAgICAgIGxvY2FsZV9tb250aHMgPSBsb2NhbGUubW9udGhzLFxuICAgICAgbG9jYWxlX3Nob3J0TW9udGhzID0gbG9jYWxlLnNob3J0TW9udGhzO1xuXG4gIHZhciBwZXJpb2RSZSA9IGZvcm1hdFJlKGxvY2FsZV9wZXJpb2RzKSxcbiAgICAgIHBlcmlvZExvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfcGVyaW9kcyksXG4gICAgICB3ZWVrZGF5UmUgPSBmb3JtYXRSZShsb2NhbGVfd2Vla2RheXMpLFxuICAgICAgd2Vla2RheUxvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfd2Vla2RheXMpLFxuICAgICAgc2hvcnRXZWVrZGF5UmUgPSBmb3JtYXRSZShsb2NhbGVfc2hvcnRXZWVrZGF5cyksXG4gICAgICBzaG9ydFdlZWtkYXlMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX3Nob3J0V2Vla2RheXMpLFxuICAgICAgbW9udGhSZSA9IGZvcm1hdFJlKGxvY2FsZV9tb250aHMpLFxuICAgICAgbW9udGhMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX21vbnRocyksXG4gICAgICBzaG9ydE1vbnRoUmUgPSBmb3JtYXRSZShsb2NhbGVfc2hvcnRNb250aHMpLFxuICAgICAgc2hvcnRNb250aExvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfc2hvcnRNb250aHMpO1xuXG4gIHZhciBmb3JtYXRzID0ge1xuICAgIFwiYVwiOiBmb3JtYXRTaG9ydFdlZWtkYXksXG4gICAgXCJBXCI6IGZvcm1hdFdlZWtkYXksXG4gICAgXCJiXCI6IGZvcm1hdFNob3J0TW9udGgsXG4gICAgXCJCXCI6IGZvcm1hdE1vbnRoLFxuICAgIFwiY1wiOiBudWxsLFxuICAgIFwiZFwiOiBmb3JtYXREYXlPZk1vbnRoLFxuICAgIFwiZVwiOiBmb3JtYXREYXlPZk1vbnRoLFxuICAgIFwiZlwiOiBmb3JtYXRNaWNyb3NlY29uZHMsXG4gICAgXCJIXCI6IGZvcm1hdEhvdXIyNCxcbiAgICBcIklcIjogZm9ybWF0SG91cjEyLFxuICAgIFwialwiOiBmb3JtYXREYXlPZlllYXIsXG4gICAgXCJMXCI6IGZvcm1hdE1pbGxpc2Vjb25kcyxcbiAgICBcIm1cIjogZm9ybWF0TW9udGhOdW1iZXIsXG4gICAgXCJNXCI6IGZvcm1hdE1pbnV0ZXMsXG4gICAgXCJwXCI6IGZvcm1hdFBlcmlvZCxcbiAgICBcIlFcIjogZm9ybWF0VW5peFRpbWVzdGFtcCxcbiAgICBcInNcIjogZm9ybWF0VW5peFRpbWVzdGFtcFNlY29uZHMsXG4gICAgXCJTXCI6IGZvcm1hdFNlY29uZHMsXG4gICAgXCJ1XCI6IGZvcm1hdFdlZWtkYXlOdW1iZXJNb25kYXksXG4gICAgXCJVXCI6IGZvcm1hdFdlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJWXCI6IGZvcm1hdFdlZWtOdW1iZXJJU08sXG4gICAgXCJ3XCI6IGZvcm1hdFdlZWtkYXlOdW1iZXJTdW5kYXksXG4gICAgXCJXXCI6IGZvcm1hdFdlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IG51bGwsXG4gICAgXCJYXCI6IG51bGwsXG4gICAgXCJ5XCI6IGZvcm1hdFllYXIsXG4gICAgXCJZXCI6IGZvcm1hdEZ1bGxZZWFyLFxuICAgIFwiWlwiOiBmb3JtYXRab25lLFxuICAgIFwiJVwiOiBmb3JtYXRMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIHZhciB1dGNGb3JtYXRzID0ge1xuICAgIFwiYVwiOiBmb3JtYXRVVENTaG9ydFdlZWtkYXksXG4gICAgXCJBXCI6IGZvcm1hdFVUQ1dlZWtkYXksXG4gICAgXCJiXCI6IGZvcm1hdFVUQ1Nob3J0TW9udGgsXG4gICAgXCJCXCI6IGZvcm1hdFVUQ01vbnRoLFxuICAgIFwiY1wiOiBudWxsLFxuICAgIFwiZFwiOiBmb3JtYXRVVENEYXlPZk1vbnRoLFxuICAgIFwiZVwiOiBmb3JtYXRVVENEYXlPZk1vbnRoLFxuICAgIFwiZlwiOiBmb3JtYXRVVENNaWNyb3NlY29uZHMsXG4gICAgXCJIXCI6IGZvcm1hdFVUQ0hvdXIyNCxcbiAgICBcIklcIjogZm9ybWF0VVRDSG91cjEyLFxuICAgIFwialwiOiBmb3JtYXRVVENEYXlPZlllYXIsXG4gICAgXCJMXCI6IGZvcm1hdFVUQ01pbGxpc2Vjb25kcyxcbiAgICBcIm1cIjogZm9ybWF0VVRDTW9udGhOdW1iZXIsXG4gICAgXCJNXCI6IGZvcm1hdFVUQ01pbnV0ZXMsXG4gICAgXCJwXCI6IGZvcm1hdFVUQ1BlcmlvZCxcbiAgICBcIlFcIjogZm9ybWF0VW5peFRpbWVzdGFtcCxcbiAgICBcInNcIjogZm9ybWF0VW5peFRpbWVzdGFtcFNlY29uZHMsXG4gICAgXCJTXCI6IGZvcm1hdFVUQ1NlY29uZHMsXG4gICAgXCJ1XCI6IGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXJNb25kYXksXG4gICAgXCJVXCI6IGZvcm1hdFVUQ1dlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJWXCI6IGZvcm1hdFVUQ1dlZWtOdW1iZXJJU08sXG4gICAgXCJ3XCI6IGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXJTdW5kYXksXG4gICAgXCJXXCI6IGZvcm1hdFVUQ1dlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IG51bGwsXG4gICAgXCJYXCI6IG51bGwsXG4gICAgXCJ5XCI6IGZvcm1hdFVUQ1llYXIsXG4gICAgXCJZXCI6IGZvcm1hdFVUQ0Z1bGxZZWFyLFxuICAgIFwiWlwiOiBmb3JtYXRVVENab25lLFxuICAgIFwiJVwiOiBmb3JtYXRMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIHZhciBwYXJzZXMgPSB7XG4gICAgXCJhXCI6IHBhcnNlU2hvcnRXZWVrZGF5LFxuICAgIFwiQVwiOiBwYXJzZVdlZWtkYXksXG4gICAgXCJiXCI6IHBhcnNlU2hvcnRNb250aCxcbiAgICBcIkJcIjogcGFyc2VNb250aCxcbiAgICBcImNcIjogcGFyc2VMb2NhbGVEYXRlVGltZSxcbiAgICBcImRcIjogcGFyc2VEYXlPZk1vbnRoLFxuICAgIFwiZVwiOiBwYXJzZURheU9mTW9udGgsXG4gICAgXCJmXCI6IHBhcnNlTWljcm9zZWNvbmRzLFxuICAgIFwiSFwiOiBwYXJzZUhvdXIyNCxcbiAgICBcIklcIjogcGFyc2VIb3VyMjQsXG4gICAgXCJqXCI6IHBhcnNlRGF5T2ZZZWFyLFxuICAgIFwiTFwiOiBwYXJzZU1pbGxpc2Vjb25kcyxcbiAgICBcIm1cIjogcGFyc2VNb250aE51bWJlcixcbiAgICBcIk1cIjogcGFyc2VNaW51dGVzLFxuICAgIFwicFwiOiBwYXJzZVBlcmlvZCxcbiAgICBcIlFcIjogcGFyc2VVbml4VGltZXN0YW1wLFxuICAgIFwic1wiOiBwYXJzZVVuaXhUaW1lc3RhbXBTZWNvbmRzLFxuICAgIFwiU1wiOiBwYXJzZVNlY29uZHMsXG4gICAgXCJ1XCI6IHBhcnNlV2Vla2RheU51bWJlck1vbmRheSxcbiAgICBcIlVcIjogcGFyc2VXZWVrTnVtYmVyU3VuZGF5LFxuICAgIFwiVlwiOiBwYXJzZVdlZWtOdW1iZXJJU08sXG4gICAgXCJ3XCI6IHBhcnNlV2Vla2RheU51bWJlclN1bmRheSxcbiAgICBcIldcIjogcGFyc2VXZWVrTnVtYmVyTW9uZGF5LFxuICAgIFwieFwiOiBwYXJzZUxvY2FsZURhdGUsXG4gICAgXCJYXCI6IHBhcnNlTG9jYWxlVGltZSxcbiAgICBcInlcIjogcGFyc2VZZWFyLFxuICAgIFwiWVwiOiBwYXJzZUZ1bGxZZWFyLFxuICAgIFwiWlwiOiBwYXJzZVpvbmUsXG4gICAgXCIlXCI6IHBhcnNlTGl0ZXJhbFBlcmNlbnRcbiAgfTtcblxuICAvLyBUaGVzZSByZWN1cnNpdmUgZGlyZWN0aXZlIGRlZmluaXRpb25zIG11c3QgYmUgZGVmZXJyZWQuXG4gIGZvcm1hdHMueCA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZSwgZm9ybWF0cyk7XG4gIGZvcm1hdHMuWCA9IG5ld0Zvcm1hdChsb2NhbGVfdGltZSwgZm9ybWF0cyk7XG4gIGZvcm1hdHMuYyA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZVRpbWUsIGZvcm1hdHMpO1xuICB1dGNGb3JtYXRzLnggPSBuZXdGb3JtYXQobG9jYWxlX2RhdGUsIHV0Y0Zvcm1hdHMpO1xuICB1dGNGb3JtYXRzLlggPSBuZXdGb3JtYXQobG9jYWxlX3RpbWUsIHV0Y0Zvcm1hdHMpO1xuICB1dGNGb3JtYXRzLmMgPSBuZXdGb3JtYXQobG9jYWxlX2RhdGVUaW1lLCB1dGNGb3JtYXRzKTtcblxuICBmdW5jdGlvbiBuZXdGb3JtYXQoc3BlY2lmaWVyLCBmb3JtYXRzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICAgIHZhciBzdHJpbmcgPSBbXSxcbiAgICAgICAgICBpID0gLTEsXG4gICAgICAgICAgaiA9IDAsXG4gICAgICAgICAgbiA9IHNwZWNpZmllci5sZW5ndGgsXG4gICAgICAgICAgYyxcbiAgICAgICAgICBwYWQsXG4gICAgICAgICAgZm9ybWF0O1xuXG4gICAgICBpZiAoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpIGRhdGUgPSBuZXcgRGF0ZSgrZGF0ZSk7XG5cbiAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgIGlmIChzcGVjaWZpZXIuY2hhckNvZGVBdChpKSA9PT0gMzcpIHtcbiAgICAgICAgICBzdHJpbmcucHVzaChzcGVjaWZpZXIuc2xpY2UoaiwgaSkpO1xuICAgICAgICAgIGlmICgocGFkID0gcGFkc1tjID0gc3BlY2lmaWVyLmNoYXJBdCgrK2kpXSkgIT0gbnVsbCkgYyA9IHNwZWNpZmllci5jaGFyQXQoKytpKTtcbiAgICAgICAgICBlbHNlIHBhZCA9IGMgPT09IFwiZVwiID8gXCIgXCIgOiBcIjBcIjtcbiAgICAgICAgICBpZiAoZm9ybWF0ID0gZm9ybWF0c1tjXSkgYyA9IGZvcm1hdChkYXRlLCBwYWQpO1xuICAgICAgICAgIHN0cmluZy5wdXNoKGMpO1xuICAgICAgICAgIGogPSBpICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzdHJpbmcucHVzaChzcGVjaWZpZXIuc2xpY2UoaiwgaSkpO1xuICAgICAgcmV0dXJuIHN0cmluZy5qb2luKFwiXCIpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBuZXdQYXJzZShzcGVjaWZpZXIsIG5ld0RhdGUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICB2YXIgZCA9IG5ld1llYXIoMTkwMCksXG4gICAgICAgICAgaSA9IHBhcnNlU3BlY2lmaWVyKGQsIHNwZWNpZmllciwgc3RyaW5nICs9IFwiXCIsIDApLFxuICAgICAgICAgIHdlZWssIGRheTtcbiAgICAgIGlmIChpICE9IHN0cmluZy5sZW5ndGgpIHJldHVybiBudWxsO1xuXG4gICAgICAvLyBJZiBhIFVOSVggdGltZXN0YW1wIGlzIHNwZWNpZmllZCwgcmV0dXJuIGl0LlxuICAgICAgaWYgKFwiUVwiIGluIGQpIHJldHVybiBuZXcgRGF0ZShkLlEpO1xuXG4gICAgICAvLyBUaGUgYW0tcG0gZmxhZyBpcyAwIGZvciBBTSwgYW5kIDEgZm9yIFBNLlxuICAgICAgaWYgKFwicFwiIGluIGQpIGQuSCA9IGQuSCAlIDEyICsgZC5wICogMTI7XG5cbiAgICAgIC8vIENvbnZlcnQgZGF5LW9mLXdlZWsgYW5kIHdlZWstb2YteWVhciB0byBkYXktb2YteWVhci5cbiAgICAgIGlmIChcIlZcIiBpbiBkKSB7XG4gICAgICAgIGlmIChkLlYgPCAxIHx8IGQuViA+IDUzKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKCEoXCJ3XCIgaW4gZCkpIGQudyA9IDE7XG4gICAgICAgIGlmIChcIlpcIiBpbiBkKSB7XG4gICAgICAgICAgd2VlayA9IHV0Y0RhdGUobmV3WWVhcihkLnkpKSwgZGF5ID0gd2Vlay5nZXRVVENEYXkoKTtcbiAgICAgICAgICB3ZWVrID0gZGF5ID4gNCB8fCBkYXkgPT09IDAgPyB1dGNNb25kYXkuY2VpbCh3ZWVrKSA6IHV0Y01vbmRheSh3ZWVrKTtcbiAgICAgICAgICB3ZWVrID0gdXRjRGF5Lm9mZnNldCh3ZWVrLCAoZC5WIC0gMSkgKiA3KTtcbiAgICAgICAgICBkLnkgPSB3ZWVrLmdldFVUQ0Z1bGxZZWFyKCk7XG4gICAgICAgICAgZC5tID0gd2Vlay5nZXRVVENNb250aCgpO1xuICAgICAgICAgIGQuZCA9IHdlZWsuZ2V0VVRDRGF0ZSgpICsgKGQudyArIDYpICUgNztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3ZWVrID0gbmV3RGF0ZShuZXdZZWFyKGQueSkpLCBkYXkgPSB3ZWVrLmdldERheSgpO1xuICAgICAgICAgIHdlZWsgPSBkYXkgPiA0IHx8IGRheSA9PT0gMCA/IHRpbWVNb25kYXkuY2VpbCh3ZWVrKSA6IHRpbWVNb25kYXkod2Vlayk7XG4gICAgICAgICAgd2VlayA9IHRpbWVEYXkub2Zmc2V0KHdlZWssIChkLlYgLSAxKSAqIDcpO1xuICAgICAgICAgIGQueSA9IHdlZWsuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICBkLm0gPSB3ZWVrLmdldE1vbnRoKCk7XG4gICAgICAgICAgZC5kID0gd2Vlay5nZXREYXRlKCkgKyAoZC53ICsgNikgJSA3O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKFwiV1wiIGluIGQgfHwgXCJVXCIgaW4gZCkge1xuICAgICAgICBpZiAoIShcIndcIiBpbiBkKSkgZC53ID0gXCJ1XCIgaW4gZCA/IGQudSAlIDcgOiBcIldcIiBpbiBkID8gMSA6IDA7XG4gICAgICAgIGRheSA9IFwiWlwiIGluIGQgPyB1dGNEYXRlKG5ld1llYXIoZC55KSkuZ2V0VVRDRGF5KCkgOiBuZXdEYXRlKG5ld1llYXIoZC55KSkuZ2V0RGF5KCk7XG4gICAgICAgIGQubSA9IDA7XG4gICAgICAgIGQuZCA9IFwiV1wiIGluIGQgPyAoZC53ICsgNikgJSA3ICsgZC5XICogNyAtIChkYXkgKyA1KSAlIDcgOiBkLncgKyBkLlUgKiA3IC0gKGRheSArIDYpICUgNztcbiAgICAgIH1cblxuICAgICAgLy8gSWYgYSB0aW1lIHpvbmUgaXMgc3BlY2lmaWVkLCBhbGwgZmllbGRzIGFyZSBpbnRlcnByZXRlZCBhcyBVVEMgYW5kIHRoZW5cbiAgICAgIC8vIG9mZnNldCBhY2NvcmRpbmcgdG8gdGhlIHNwZWNpZmllZCB0aW1lIHpvbmUuXG4gICAgICBpZiAoXCJaXCIgaW4gZCkge1xuICAgICAgICBkLkggKz0gZC5aIC8gMTAwIHwgMDtcbiAgICAgICAgZC5NICs9IGQuWiAlIDEwMDtcbiAgICAgICAgcmV0dXJuIHV0Y0RhdGUoZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE90aGVyd2lzZSwgYWxsIGZpZWxkcyBhcmUgaW4gbG9jYWwgdGltZS5cbiAgICAgIHJldHVybiBuZXdEYXRlKGQpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVNwZWNpZmllcihkLCBzcGVjaWZpZXIsIHN0cmluZywgaikge1xuICAgIHZhciBpID0gMCxcbiAgICAgICAgbiA9IHNwZWNpZmllci5sZW5ndGgsXG4gICAgICAgIG0gPSBzdHJpbmcubGVuZ3RoLFxuICAgICAgICBjLFxuICAgICAgICBwYXJzZTtcblxuICAgIHdoaWxlIChpIDwgbikge1xuICAgICAgaWYgKGogPj0gbSkgcmV0dXJuIC0xO1xuICAgICAgYyA9IHNwZWNpZmllci5jaGFyQ29kZUF0KGkrKyk7XG4gICAgICBpZiAoYyA9PT0gMzcpIHtcbiAgICAgICAgYyA9IHNwZWNpZmllci5jaGFyQXQoaSsrKTtcbiAgICAgICAgcGFyc2UgPSBwYXJzZXNbYyBpbiBwYWRzID8gc3BlY2lmaWVyLmNoYXJBdChpKyspIDogY107XG4gICAgICAgIGlmICghcGFyc2UgfHwgKChqID0gcGFyc2UoZCwgc3RyaW5nLCBqKSkgPCAwKSkgcmV0dXJuIC0xO1xuICAgICAgfSBlbHNlIGlmIChjICE9IHN0cmluZy5jaGFyQ29kZUF0KGorKykpIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBqO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VQZXJpb2QoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBwZXJpb2RSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC5wID0gcGVyaW9kTG9va3VwW25bMF0udG9Mb3dlckNhc2UoKV0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlU2hvcnRXZWVrZGF5KGQsIHN0cmluZywgaSkge1xuICAgIHZhciBuID0gc2hvcnRXZWVrZGF5UmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQudyA9IHNob3J0V2Vla2RheUxvb2t1cFtuWzBdLnRvTG93ZXJDYXNlKCldLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVdlZWtkYXkoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSB3ZWVrZGF5UmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQudyA9IHdlZWtkYXlMb29rdXBbblswXS50b0xvd2VyQ2FzZSgpXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VTaG9ydE1vbnRoKGQsIHN0cmluZywgaSkge1xuICAgIHZhciBuID0gc2hvcnRNb250aFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLm0gPSBzaG9ydE1vbnRoTG9va3VwW25bMF0udG9Mb3dlckNhc2UoKV0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTW9udGgoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBtb250aFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLm0gPSBtb250aExvb2t1cFtuWzBdLnRvTG93ZXJDYXNlKCldLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUxvY2FsZURhdGVUaW1lKGQsIHN0cmluZywgaSkge1xuICAgIHJldHVybiBwYXJzZVNwZWNpZmllcihkLCBsb2NhbGVfZGF0ZVRpbWUsIHN0cmluZywgaSk7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUxvY2FsZURhdGUoZCwgc3RyaW5nLCBpKSB7XG4gICAgcmV0dXJuIHBhcnNlU3BlY2lmaWVyKGQsIGxvY2FsZV9kYXRlLCBzdHJpbmcsIGkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VMb2NhbGVUaW1lKGQsIHN0cmluZywgaSkge1xuICAgIHJldHVybiBwYXJzZVNwZWNpZmllcihkLCBsb2NhbGVfdGltZSwgc3RyaW5nLCBpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFNob3J0V2Vla2RheShkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydFdlZWtkYXlzW2QuZ2V0RGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0V2Vla2RheShkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV93ZWVrZGF5c1tkLmdldERheSgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFNob3J0TW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfc2hvcnRNb250aHNbZC5nZXRNb250aCgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdE1vbnRoKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX21vbnRoc1tkLmdldE1vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0UGVyaW9kKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3BlcmlvZHNbKyhkLmdldEhvdXJzKCkgPj0gMTIpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ1Nob3J0V2Vla2RheShkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydFdlZWtkYXlzW2QuZ2V0VVRDRGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDV2Vla2RheShkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV93ZWVrZGF5c1tkLmdldFVUQ0RheSgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ1Nob3J0TW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfc2hvcnRNb250aHNbZC5nZXRVVENNb250aCgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ01vbnRoKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX21vbnRoc1tkLmdldFVUQ01vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDUGVyaW9kKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3BlcmlvZHNbKyhkLmdldFVUQ0hvdXJzKCkgPj0gMTIpXTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZm9ybWF0OiBmdW5jdGlvbihzcGVjaWZpZXIpIHtcbiAgICAgIHZhciBmID0gbmV3Rm9ybWF0KHNwZWNpZmllciArPSBcIlwiLCBmb3JtYXRzKTtcbiAgICAgIGYudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNwZWNpZmllcjsgfTtcbiAgICAgIHJldHVybiBmO1xuICAgIH0sXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIHAgPSBuZXdQYXJzZShzcGVjaWZpZXIgKz0gXCJcIiwgbG9jYWxEYXRlKTtcbiAgICAgIHAudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNwZWNpZmllcjsgfTtcbiAgICAgIHJldHVybiBwO1xuICAgIH0sXG4gICAgdXRjRm9ybWF0OiBmdW5jdGlvbihzcGVjaWZpZXIpIHtcbiAgICAgIHZhciBmID0gbmV3Rm9ybWF0KHNwZWNpZmllciArPSBcIlwiLCB1dGNGb3JtYXRzKTtcbiAgICAgIGYudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNwZWNpZmllcjsgfTtcbiAgICAgIHJldHVybiBmO1xuICAgIH0sXG4gICAgdXRjUGFyc2U6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIHAgPSBuZXdQYXJzZShzcGVjaWZpZXIsIHV0Y0RhdGUpO1xuICAgICAgcC50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIHA7XG4gICAgfVxuICB9O1xufVxuXG52YXIgcGFkcyA9IHtcIi1cIjogXCJcIiwgXCJfXCI6IFwiIFwiLCBcIjBcIjogXCIwXCJ9LFxuICAgIG51bWJlclJlID0gL15cXHMqXFxkKy8sIC8vIG5vdGU6IGlnbm9yZXMgbmV4dCBkaXJlY3RpdmVcbiAgICBwZXJjZW50UmUgPSAvXiUvLFxuICAgIHJlcXVvdGVSZSA9IC9bXFxcXF4kKis/fFtcXF0oKS57fV0vZztcblxuZnVuY3Rpb24gcGFkKHZhbHVlLCBmaWxsLCB3aWR0aCkge1xuICB2YXIgc2lnbiA9IHZhbHVlIDwgMCA/IFwiLVwiIDogXCJcIixcbiAgICAgIHN0cmluZyA9IChzaWduID8gLXZhbHVlIDogdmFsdWUpICsgXCJcIixcbiAgICAgIGxlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gIHJldHVybiBzaWduICsgKGxlbmd0aCA8IHdpZHRoID8gbmV3IEFycmF5KHdpZHRoIC0gbGVuZ3RoICsgMSkuam9pbihmaWxsKSArIHN0cmluZyA6IHN0cmluZyk7XG59XG5cbmZ1bmN0aW9uIHJlcXVvdGUocykge1xuICByZXR1cm4gcy5yZXBsYWNlKHJlcXVvdGVSZSwgXCJcXFxcJCZcIik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFJlKG5hbWVzKSB7XG4gIHJldHVybiBuZXcgUmVnRXhwKFwiXig/OlwiICsgbmFtZXMubWFwKHJlcXVvdGUpLmpvaW4oXCJ8XCIpICsgXCIpXCIsIFwiaVwiKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TG9va3VwKG5hbWVzKSB7XG4gIHZhciBtYXAgPSB7fSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICB3aGlsZSAoKytpIDwgbikgbWFwW25hbWVzW2ldLnRvTG93ZXJDYXNlKCldID0gaTtcbiAgcmV0dXJuIG1hcDtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrZGF5TnVtYmVyU3VuZGF5KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAxKSk7XG4gIHJldHVybiBuID8gKGQudyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlV2Vla2RheU51bWJlck1vbmRheShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMSkpO1xuICByZXR1cm4gbiA/IChkLnUgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVdlZWtOdW1iZXJTdW5kYXkoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5VID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrTnVtYmVySVNPKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuViA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlV2Vla051bWJlck1vbmRheShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLlcgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZUZ1bGxZZWFyKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyA0KSk7XG4gIHJldHVybiBuID8gKGQueSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlWWVhcihkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLnkgPSArblswXSArICgrblswXSA+IDY4ID8gMTkwMCA6IDIwMDApLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlWm9uZShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSAvXihaKXwoWystXVxcZFxcZCkoPzo6PyhcXGRcXGQpKT8vLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyA2KSk7XG4gIHJldHVybiBuID8gKGQuWiA9IG5bMV0gPyAwIDogLShuWzJdICsgKG5bM10gfHwgXCIwMFwiKSksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VNb250aE51bWJlcihkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLm0gPSBuWzBdIC0gMSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZURheU9mTW9udGgoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5kID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VEYXlPZlllYXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDMpKTtcbiAgcmV0dXJuIG4gPyAoZC5tID0gMCwgZC5kID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VIb3VyMjQoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5IID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VNaW51dGVzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuTSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlU2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLlMgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1pbGxpc2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMykpO1xuICByZXR1cm4gbiA/IChkLkwgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1pY3Jvc2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgNikpO1xuICByZXR1cm4gbiA/IChkLkwgPSBNYXRoLmZsb29yKG5bMF0gLyAxMDAwKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZUxpdGVyYWxQZXJjZW50KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IHBlcmNlbnRSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMSkpO1xuICByZXR1cm4gbiA/IGkgKyBuWzBdLmxlbmd0aCA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVVuaXhUaW1lc3RhbXAoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICByZXR1cm4gbiA/IChkLlEgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVVuaXhUaW1lc3RhbXBTZWNvbmRzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgcmV0dXJuIG4gPyAoZC5RID0gKCtuWzBdKSAqIDEwMDAsIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RGF5T2ZNb250aChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXREYXRlKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRIb3VyMjQoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0SG91cnMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdEhvdXIxMihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRIb3VycygpICUgMTIgfHwgMTIsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXREYXlPZlllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKDEgKyB0aW1lRGF5LmNvdW50KHRpbWVZZWFyKGQpLCBkKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1pbGxpc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRNaWxsaXNlY29uZHMoKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1pY3Jvc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBmb3JtYXRNaWxsaXNlY29uZHMoZCwgcCkgKyBcIjAwMFwiO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNb250aE51bWJlcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRNb250aCgpICsgMSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1pbnV0ZXMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0TWludXRlcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0U2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRTZWNvbmRzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrZGF5TnVtYmVyTW9uZGF5KGQpIHtcbiAgdmFyIGRheSA9IGQuZ2V0RGF5KCk7XG4gIHJldHVybiBkYXkgPT09IDAgPyA3IDogZGF5O1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrTnVtYmVyU3VuZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZCh0aW1lU3VuZGF5LmNvdW50KHRpbWVZZWFyKGQpLCBkKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtOdW1iZXJJU08oZCwgcCkge1xuICB2YXIgZGF5ID0gZC5nZXREYXkoKTtcbiAgZCA9IChkYXkgPj0gNCB8fCBkYXkgPT09IDApID8gdGltZVRodXJzZGF5KGQpIDogdGltZVRodXJzZGF5LmNlaWwoZCk7XG4gIHJldHVybiBwYWQodGltZVRodXJzZGF5LmNvdW50KHRpbWVZZWFyKGQpLCBkKSArICh0aW1lWWVhcihkKS5nZXREYXkoKSA9PT0gNCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrZGF5TnVtYmVyU3VuZGF5KGQpIHtcbiAgcmV0dXJuIGQuZ2V0RGF5KCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtOdW1iZXJNb25kYXkoZCwgcCkge1xuICByZXR1cm4gcGFkKHRpbWVNb25kYXkuY291bnQodGltZVllYXIoZCksIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0WWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRGdWxsWWVhcigpICUgMTAwLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RnVsbFllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0RnVsbFllYXIoKSAlIDEwMDAwLCBwLCA0KTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0Wm9uZShkKSB7XG4gIHZhciB6ID0gZC5nZXRUaW1lem9uZU9mZnNldCgpO1xuICByZXR1cm4gKHogPiAwID8gXCItXCIgOiAoeiAqPSAtMSwgXCIrXCIpKVxuICAgICAgKyBwYWQoeiAvIDYwIHwgMCwgXCIwXCIsIDIpXG4gICAgICArIHBhZCh6ICUgNjAsIFwiMFwiLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDRGF5T2ZNb250aChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENEYXRlKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENIb3VyMjQoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDSG91cnMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0hvdXIxMihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENIb3VycygpICUgMTIgfHwgMTIsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENEYXlPZlllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKDEgKyB1dGNEYXkuY291bnQodXRjWWVhcihkKSwgZCksIHAsIDMpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENNaWxsaXNlY29uZHMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDTWlsbGlzZWNvbmRzKCksIHAsIDMpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENNaWNyb3NlY29uZHMoZCwgcCkge1xuICByZXR1cm4gZm9ybWF0VVRDTWlsbGlzZWNvbmRzKGQsIHApICsgXCIwMDBcIjtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDTW9udGhOdW1iZXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDTW9udGgoKSArIDEsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENNaW51dGVzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ01pbnV0ZXMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1NlY29uZHMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDU2Vjb25kcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla2RheU51bWJlck1vbmRheShkKSB7XG4gIHZhciBkb3cgPSBkLmdldFVUQ0RheSgpO1xuICByZXR1cm4gZG93ID09PSAwID8gNyA6IGRvdztcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla051bWJlclN1bmRheShkLCBwKSB7XG4gIHJldHVybiBwYWQodXRjU3VuZGF5LmNvdW50KHV0Y1llYXIoZCksIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla051bWJlcklTTyhkLCBwKSB7XG4gIHZhciBkYXkgPSBkLmdldFVUQ0RheSgpO1xuICBkID0gKGRheSA+PSA0IHx8IGRheSA9PT0gMCkgPyB1dGNUaHVyc2RheShkKSA6IHV0Y1RodXJzZGF5LmNlaWwoZCk7XG4gIHJldHVybiBwYWQodXRjVGh1cnNkYXkuY291bnQodXRjWWVhcihkKSwgZCkgKyAodXRjWWVhcihkKS5nZXRVVENEYXkoKSA9PT0gNCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrZGF5TnVtYmVyU3VuZGF5KGQpIHtcbiAgcmV0dXJuIGQuZ2V0VVRDRGF5KCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1dlZWtOdW1iZXJNb25kYXkoZCwgcCkge1xuICByZXR1cm4gcGFkKHV0Y01vbmRheS5jb3VudCh1dGNZZWFyKGQpLCBkKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1llYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDRnVsbFllYXIoKSAlIDEwMCwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0Z1bGxZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0Z1bGxZZWFyKCkgJSAxMDAwMCwgcCwgNCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1pvbmUoKSB7XG4gIHJldHVybiBcIiswMDAwXCI7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdExpdGVyYWxQZXJjZW50KCkge1xuICByZXR1cm4gXCIlXCI7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVuaXhUaW1lc3RhbXAoZCkge1xuICByZXR1cm4gK2Q7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVuaXhUaW1lc3RhbXBTZWNvbmRzKGQpIHtcbiAgcmV0dXJuIE1hdGguZmxvb3IoK2QgLyAxMDAwKTtcbn1cbiIsImltcG9ydCBmb3JtYXRMb2NhbGUgZnJvbSBcIi4vbG9jYWxlXCI7XG5cbnZhciBsb2NhbGU7XG5leHBvcnQgdmFyIHRpbWVGb3JtYXQ7XG5leHBvcnQgdmFyIHRpbWVQYXJzZTtcbmV4cG9ydCB2YXIgdXRjRm9ybWF0O1xuZXhwb3J0IHZhciB1dGNQYXJzZTtcblxuZGVmYXVsdExvY2FsZSh7XG4gIGRhdGVUaW1lOiBcIiV4LCAlWFwiLFxuICBkYXRlOiBcIiUtbS8lLWQvJVlcIixcbiAgdGltZTogXCIlLUk6JU06JVMgJXBcIixcbiAgcGVyaW9kczogW1wiQU1cIiwgXCJQTVwiXSxcbiAgZGF5czogW1wiU3VuZGF5XCIsIFwiTW9uZGF5XCIsIFwiVHVlc2RheVwiLCBcIldlZG5lc2RheVwiLCBcIlRodXJzZGF5XCIsIFwiRnJpZGF5XCIsIFwiU2F0dXJkYXlcIl0sXG4gIHNob3J0RGF5czogW1wiU3VuXCIsIFwiTW9uXCIsIFwiVHVlXCIsIFwiV2VkXCIsIFwiVGh1XCIsIFwiRnJpXCIsIFwiU2F0XCJdLFxuICBtb250aHM6IFtcIkphbnVhcnlcIiwgXCJGZWJydWFyeVwiLCBcIk1hcmNoXCIsIFwiQXByaWxcIiwgXCJNYXlcIiwgXCJKdW5lXCIsIFwiSnVseVwiLCBcIkF1Z3VzdFwiLCBcIlNlcHRlbWJlclwiLCBcIk9jdG9iZXJcIiwgXCJOb3ZlbWJlclwiLCBcIkRlY2VtYmVyXCJdLFxuICBzaG9ydE1vbnRoczogW1wiSmFuXCIsIFwiRmViXCIsIFwiTWFyXCIsIFwiQXByXCIsIFwiTWF5XCIsIFwiSnVuXCIsIFwiSnVsXCIsIFwiQXVnXCIsIFwiU2VwXCIsIFwiT2N0XCIsIFwiTm92XCIsIFwiRGVjXCJdXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZGVmYXVsdExvY2FsZShkZWZpbml0aW9uKSB7XG4gIGxvY2FsZSA9IGZvcm1hdExvY2FsZShkZWZpbml0aW9uKTtcbiAgdGltZUZvcm1hdCA9IGxvY2FsZS5mb3JtYXQ7XG4gIHRpbWVQYXJzZSA9IGxvY2FsZS5wYXJzZTtcbiAgdXRjRm9ybWF0ID0gbG9jYWxlLnV0Y0Zvcm1hdDtcbiAgdXRjUGFyc2UgPSBsb2NhbGUudXRjUGFyc2U7XG4gIHJldHVybiBsb2NhbGU7XG59XG4iLCJpbXBvcnQge3V0Y0Zvcm1hdH0gZnJvbSBcIi4vZGVmYXVsdExvY2FsZVwiO1xuXG5leHBvcnQgdmFyIGlzb1NwZWNpZmllciA9IFwiJVktJW0tJWRUJUg6JU06JVMuJUxaXCI7XG5cbmZ1bmN0aW9uIGZvcm1hdElzb05hdGl2ZShkYXRlKSB7XG4gIHJldHVybiBkYXRlLnRvSVNPU3RyaW5nKCk7XG59XG5cbnZhciBmb3JtYXRJc28gPSBEYXRlLnByb3RvdHlwZS50b0lTT1N0cmluZ1xuICAgID8gZm9ybWF0SXNvTmF0aXZlXG4gICAgOiB1dGNGb3JtYXQoaXNvU3BlY2lmaWVyKTtcblxuZXhwb3J0IGRlZmF1bHQgZm9ybWF0SXNvO1xuIiwiaW1wb3J0IHtpc29TcGVjaWZpZXJ9IGZyb20gXCIuL2lzb0Zvcm1hdFwiO1xuaW1wb3J0IHt1dGNQYXJzZX0gZnJvbSBcIi4vZGVmYXVsdExvY2FsZVwiO1xuXG5mdW5jdGlvbiBwYXJzZUlzb05hdGl2ZShzdHJpbmcpIHtcbiAgdmFyIGRhdGUgPSBuZXcgRGF0ZShzdHJpbmcpO1xuICByZXR1cm4gaXNOYU4oZGF0ZSkgPyBudWxsIDogZGF0ZTtcbn1cblxudmFyIHBhcnNlSXNvID0gK25ldyBEYXRlKFwiMjAwMC0wMS0wMVQwMDowMDowMC4wMDBaXCIpXG4gICAgPyBwYXJzZUlzb05hdGl2ZVxuICAgIDogdXRjUGFyc2UoaXNvU3BlY2lmaWVyKTtcblxuZXhwb3J0IGRlZmF1bHQgcGFyc2VJc287XG4iLCJ2YXIgcGkgPSBNYXRoLlBJLFxuICAgIHRhdSA9IDIgKiBwaSxcbiAgICBlcHNpbG9uID0gMWUtNixcbiAgICB0YXVFcHNpbG9uID0gdGF1IC0gZXBzaWxvbjtcblxuZnVuY3Rpb24gUGF0aCgpIHtcbiAgdGhpcy5feDAgPSB0aGlzLl95MCA9IC8vIHN0YXJ0IG9mIGN1cnJlbnQgc3VicGF0aFxuICB0aGlzLl94MSA9IHRoaXMuX3kxID0gbnVsbDsgLy8gZW5kIG9mIGN1cnJlbnQgc3VicGF0aFxuICB0aGlzLl8gPSBcIlwiO1xufVxuXG5mdW5jdGlvbiBwYXRoKCkge1xuICByZXR1cm4gbmV3IFBhdGg7XG59XG5cblBhdGgucHJvdG90eXBlID0gcGF0aC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBQYXRoLFxuICBtb3ZlVG86IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLl8gKz0gXCJNXCIgKyAodGhpcy5feDAgPSB0aGlzLl94MSA9ICt4KSArIFwiLFwiICsgKHRoaXMuX3kwID0gdGhpcy5feTEgPSAreSk7XG4gIH0sXG4gIGNsb3NlUGF0aDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3gxICE9PSBudWxsKSB7XG4gICAgICB0aGlzLl94MSA9IHRoaXMuX3gwLCB0aGlzLl95MSA9IHRoaXMuX3kwO1xuICAgICAgdGhpcy5fICs9IFwiWlwiO1xuICAgIH1cbiAgfSxcbiAgbGluZVRvOiBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5fICs9IFwiTFwiICsgKHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTEgPSAreSk7XG4gIH0sXG4gIHF1YWRyYXRpY0N1cnZlVG86IGZ1bmN0aW9uKHgxLCB5MSwgeCwgeSkge1xuICAgIHRoaXMuXyArPSBcIlFcIiArICgreDEpICsgXCIsXCIgKyAoK3kxKSArIFwiLFwiICsgKHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTEgPSAreSk7XG4gIH0sXG4gIGJlemllckN1cnZlVG86IGZ1bmN0aW9uKHgxLCB5MSwgeDIsIHkyLCB4LCB5KSB7XG4gICAgdGhpcy5fICs9IFwiQ1wiICsgKCt4MSkgKyBcIixcIiArICgreTEpICsgXCIsXCIgKyAoK3gyKSArIFwiLFwiICsgKCt5MikgKyBcIixcIiArICh0aGlzLl94MSA9ICt4KSArIFwiLFwiICsgKHRoaXMuX3kxID0gK3kpO1xuICB9LFxuICBhcmNUbzogZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIsIHIpIHtcbiAgICB4MSA9ICt4MSwgeTEgPSAreTEsIHgyID0gK3gyLCB5MiA9ICt5MiwgciA9ICtyO1xuICAgIHZhciB4MCA9IHRoaXMuX3gxLFxuICAgICAgICB5MCA9IHRoaXMuX3kxLFxuICAgICAgICB4MjEgPSB4MiAtIHgxLFxuICAgICAgICB5MjEgPSB5MiAtIHkxLFxuICAgICAgICB4MDEgPSB4MCAtIHgxLFxuICAgICAgICB5MDEgPSB5MCAtIHkxLFxuICAgICAgICBsMDFfMiA9IHgwMSAqIHgwMSArIHkwMSAqIHkwMTtcblxuICAgIC8vIElzIHRoZSByYWRpdXMgbmVnYXRpdmU/IEVycm9yLlxuICAgIGlmIChyIDwgMCkgdGhyb3cgbmV3IEVycm9yKFwibmVnYXRpdmUgcmFkaXVzOiBcIiArIHIpO1xuXG4gICAgLy8gSXMgdGhpcyBwYXRoIGVtcHR5PyBNb3ZlIHRvICh4MSx5MSkuXG4gICAgaWYgKHRoaXMuX3gxID09PSBudWxsKSB7XG4gICAgICB0aGlzLl8gKz0gXCJNXCIgKyAodGhpcy5feDEgPSB4MSkgKyBcIixcIiArICh0aGlzLl95MSA9IHkxKTtcbiAgICB9XG5cbiAgICAvLyBPciwgaXMgKHgxLHkxKSBjb2luY2lkZW50IHdpdGggKHgwLHkwKT8gRG8gbm90aGluZy5cbiAgICBlbHNlIGlmICghKGwwMV8yID4gZXBzaWxvbikpIHt9XG5cbiAgICAvLyBPciwgYXJlICh4MCx5MCksICh4MSx5MSkgYW5kICh4Mix5MikgY29sbGluZWFyP1xuICAgIC8vIEVxdWl2YWxlbnRseSwgaXMgKHgxLHkxKSBjb2luY2lkZW50IHdpdGggKHgyLHkyKT9cbiAgICAvLyBPciwgaXMgdGhlIHJhZGl1cyB6ZXJvPyBMaW5lIHRvICh4MSx5MSkuXG4gICAgZWxzZSBpZiAoIShNYXRoLmFicyh5MDEgKiB4MjEgLSB5MjEgKiB4MDEpID4gZXBzaWxvbikgfHwgIXIpIHtcbiAgICAgIHRoaXMuXyArPSBcIkxcIiArICh0aGlzLl94MSA9IHgxKSArIFwiLFwiICsgKHRoaXMuX3kxID0geTEpO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgZHJhdyBhbiBhcmMhXG4gICAgZWxzZSB7XG4gICAgICB2YXIgeDIwID0geDIgLSB4MCxcbiAgICAgICAgICB5MjAgPSB5MiAtIHkwLFxuICAgICAgICAgIGwyMV8yID0geDIxICogeDIxICsgeTIxICogeTIxLFxuICAgICAgICAgIGwyMF8yID0geDIwICogeDIwICsgeTIwICogeTIwLFxuICAgICAgICAgIGwyMSA9IE1hdGguc3FydChsMjFfMiksXG4gICAgICAgICAgbDAxID0gTWF0aC5zcXJ0KGwwMV8yKSxcbiAgICAgICAgICBsID0gciAqIE1hdGgudGFuKChwaSAtIE1hdGguYWNvcygobDIxXzIgKyBsMDFfMiAtIGwyMF8yKSAvICgyICogbDIxICogbDAxKSkpIC8gMiksXG4gICAgICAgICAgdDAxID0gbCAvIGwwMSxcbiAgICAgICAgICB0MjEgPSBsIC8gbDIxO1xuXG4gICAgICAvLyBJZiB0aGUgc3RhcnQgdGFuZ2VudCBpcyBub3QgY29pbmNpZGVudCB3aXRoICh4MCx5MCksIGxpbmUgdG8uXG4gICAgICBpZiAoTWF0aC5hYnModDAxIC0gMSkgPiBlcHNpbG9uKSB7XG4gICAgICAgIHRoaXMuXyArPSBcIkxcIiArICh4MSArIHQwMSAqIHgwMSkgKyBcIixcIiArICh5MSArIHQwMSAqIHkwMSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuXyArPSBcIkFcIiArIHIgKyBcIixcIiArIHIgKyBcIiwwLDAsXCIgKyAoKyh5MDEgKiB4MjAgPiB4MDEgKiB5MjApKSArIFwiLFwiICsgKHRoaXMuX3gxID0geDEgKyB0MjEgKiB4MjEpICsgXCIsXCIgKyAodGhpcy5feTEgPSB5MSArIHQyMSAqIHkyMSk7XG4gICAgfVxuICB9LFxuICBhcmM6IGZ1bmN0aW9uKHgsIHksIHIsIGEwLCBhMSwgY2N3KSB7XG4gICAgeCA9ICt4LCB5ID0gK3ksIHIgPSArcjtcbiAgICB2YXIgZHggPSByICogTWF0aC5jb3MoYTApLFxuICAgICAgICBkeSA9IHIgKiBNYXRoLnNpbihhMCksXG4gICAgICAgIHgwID0geCArIGR4LFxuICAgICAgICB5MCA9IHkgKyBkeSxcbiAgICAgICAgY3cgPSAxIF4gY2N3LFxuICAgICAgICBkYSA9IGNjdyA/IGEwIC0gYTEgOiBhMSAtIGEwO1xuXG4gICAgLy8gSXMgdGhlIHJhZGl1cyBuZWdhdGl2ZT8gRXJyb3IuXG4gICAgaWYgKHIgPCAwKSB0aHJvdyBuZXcgRXJyb3IoXCJuZWdhdGl2ZSByYWRpdXM6IFwiICsgcik7XG5cbiAgICAvLyBJcyB0aGlzIHBhdGggZW1wdHk/IE1vdmUgdG8gKHgwLHkwKS5cbiAgICBpZiAodGhpcy5feDEgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuXyArPSBcIk1cIiArIHgwICsgXCIsXCIgKyB5MDtcbiAgICB9XG5cbiAgICAvLyBPciwgaXMgKHgwLHkwKSBub3QgY29pbmNpZGVudCB3aXRoIHRoZSBwcmV2aW91cyBwb2ludD8gTGluZSB0byAoeDAseTApLlxuICAgIGVsc2UgaWYgKE1hdGguYWJzKHRoaXMuX3gxIC0geDApID4gZXBzaWxvbiB8fCBNYXRoLmFicyh0aGlzLl95MSAtIHkwKSA+IGVwc2lsb24pIHtcbiAgICAgIHRoaXMuXyArPSBcIkxcIiArIHgwICsgXCIsXCIgKyB5MDtcbiAgICB9XG5cbiAgICAvLyBJcyB0aGlzIGFyYyBlbXB0eT8gV2XigJlyZSBkb25lLlxuICAgIGlmICghcikgcmV0dXJuO1xuXG4gICAgLy8gRG9lcyB0aGUgYW5nbGUgZ28gdGhlIHdyb25nIHdheT8gRmxpcCB0aGUgZGlyZWN0aW9uLlxuICAgIGlmIChkYSA8IDApIGRhID0gZGEgJSB0YXUgKyB0YXU7XG5cbiAgICAvLyBJcyB0aGlzIGEgY29tcGxldGUgY2lyY2xlPyBEcmF3IHR3byBhcmNzIHRvIGNvbXBsZXRlIHRoZSBjaXJjbGUuXG4gICAgaWYgKGRhID4gdGF1RXBzaWxvbikge1xuICAgICAgdGhpcy5fICs9IFwiQVwiICsgciArIFwiLFwiICsgciArIFwiLDAsMSxcIiArIGN3ICsgXCIsXCIgKyAoeCAtIGR4KSArIFwiLFwiICsgKHkgLSBkeSkgKyBcIkFcIiArIHIgKyBcIixcIiArIHIgKyBcIiwwLDEsXCIgKyBjdyArIFwiLFwiICsgKHRoaXMuX3gxID0geDApICsgXCIsXCIgKyAodGhpcy5feTEgPSB5MCk7XG4gICAgfVxuXG4gICAgLy8gSXMgdGhpcyBhcmMgbm9uLWVtcHR5PyBEcmF3IGFuIGFyYyFcbiAgICBlbHNlIGlmIChkYSA+IGVwc2lsb24pIHtcbiAgICAgIHRoaXMuXyArPSBcIkFcIiArIHIgKyBcIixcIiArIHIgKyBcIiwwLFwiICsgKCsoZGEgPj0gcGkpKSArIFwiLFwiICsgY3cgKyBcIixcIiArICh0aGlzLl94MSA9IHggKyByICogTWF0aC5jb3MoYTEpKSArIFwiLFwiICsgKHRoaXMuX3kxID0geSArIHIgKiBNYXRoLnNpbihhMSkpO1xuICAgIH1cbiAgfSxcbiAgcmVjdDogZnVuY3Rpb24oeCwgeSwgdywgaCkge1xuICAgIHRoaXMuXyArPSBcIk1cIiArICh0aGlzLl94MCA9IHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTAgPSB0aGlzLl95MSA9ICt5KSArIFwiaFwiICsgKCt3KSArIFwidlwiICsgKCtoKSArIFwiaFwiICsgKC13KSArIFwiWlwiO1xuICB9LFxuICB0b1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuXztcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgcGF0aDtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGNvbnN0YW50KCkge1xuICAgIHJldHVybiB4O1xuICB9O1xufVxuIiwiZXhwb3J0IHZhciBhYnMgPSBNYXRoLmFicztcbmV4cG9ydCB2YXIgYXRhbjIgPSBNYXRoLmF0YW4yO1xuZXhwb3J0IHZhciBjb3MgPSBNYXRoLmNvcztcbmV4cG9ydCB2YXIgbWF4ID0gTWF0aC5tYXg7XG5leHBvcnQgdmFyIG1pbiA9IE1hdGgubWluO1xuZXhwb3J0IHZhciBzaW4gPSBNYXRoLnNpbjtcbmV4cG9ydCB2YXIgc3FydCA9IE1hdGguc3FydDtcblxuZXhwb3J0IHZhciBlcHNpbG9uID0gMWUtMTI7XG5leHBvcnQgdmFyIHBpID0gTWF0aC5QSTtcbmV4cG9ydCB2YXIgaGFsZlBpID0gcGkgLyAyO1xuZXhwb3J0IHZhciB0YXUgPSAyICogcGk7XG5cbmV4cG9ydCBmdW5jdGlvbiBhY29zKHgpIHtcbiAgcmV0dXJuIHggPiAxID8gMCA6IHggPCAtMSA/IHBpIDogTWF0aC5hY29zKHgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNpbih4KSB7XG4gIHJldHVybiB4ID49IDEgPyBoYWxmUGkgOiB4IDw9IC0xID8gLWhhbGZQaSA6IE1hdGguYXNpbih4KTtcbn1cbiIsImZ1bmN0aW9uIExpbmVhcihjb250ZXh0KSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufVxuXG5MaW5lYXIucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2xpbmUgfHwgKHRoaXMuX2xpbmUgIT09IDAgJiYgdGhpcy5fcG9pbnQgPT09IDEpKSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIHRoaXMuX2xpbmUgPSAxIC0gdGhpcy5fbGluZTtcbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB4ID0gK3gsIHkgPSAreTtcbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDA6IHRoaXMuX3BvaW50ID0gMTsgdGhpcy5fbGluZSA/IHRoaXMuX2NvbnRleHQubGluZVRvKHgsIHkpIDogdGhpcy5fY29udGV4dC5tb3ZlVG8oeCwgeSk7IGJyZWFrO1xuICAgICAgY2FzZSAxOiB0aGlzLl9wb2ludCA9IDI7IC8vIHByb2NlZWRcbiAgICAgIGRlZmF1bHQ6IHRoaXMuX2NvbnRleHQubGluZVRvKHgsIHkpOyBicmVhaztcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBMaW5lYXIoY29udGV4dCk7XG59XG4iLCJleHBvcnQgZnVuY3Rpb24geChwKSB7XG4gIHJldHVybiBwWzBdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24geShwKSB7XG4gIHJldHVybiBwWzFdO1xufVxuIiwiaW1wb3J0IHtwYXRofSBmcm9tIFwiZDMtcGF0aFwiO1xuaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuL2NvbnN0YW50XCI7XG5pbXBvcnQgY3VydmVMaW5lYXIgZnJvbSBcIi4vY3VydmUvbGluZWFyXCI7XG5pbXBvcnQge3ggYXMgcG9pbnRYLCB5IGFzIHBvaW50WX0gZnJvbSBcIi4vcG9pbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciB4ID0gcG9pbnRYLFxuICAgICAgeSA9IHBvaW50WSxcbiAgICAgIGRlZmluZWQgPSBjb25zdGFudCh0cnVlKSxcbiAgICAgIGNvbnRleHQgPSBudWxsLFxuICAgICAgY3VydmUgPSBjdXJ2ZUxpbmVhcixcbiAgICAgIG91dHB1dCA9IG51bGw7XG5cbiAgZnVuY3Rpb24gbGluZShkYXRhKSB7XG4gICAgdmFyIGksXG4gICAgICAgIG4gPSBkYXRhLmxlbmd0aCxcbiAgICAgICAgZCxcbiAgICAgICAgZGVmaW5lZDAgPSBmYWxzZSxcbiAgICAgICAgYnVmZmVyO1xuXG4gICAgaWYgKGNvbnRleHQgPT0gbnVsbCkgb3V0cHV0ID0gY3VydmUoYnVmZmVyID0gcGF0aCgpKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPD0gbjsgKytpKSB7XG4gICAgICBpZiAoIShpIDwgbiAmJiBkZWZpbmVkKGQgPSBkYXRhW2ldLCBpLCBkYXRhKSkgPT09IGRlZmluZWQwKSB7XG4gICAgICAgIGlmIChkZWZpbmVkMCA9ICFkZWZpbmVkMCkgb3V0cHV0LmxpbmVTdGFydCgpO1xuICAgICAgICBlbHNlIG91dHB1dC5saW5lRW5kKCk7XG4gICAgICB9XG4gICAgICBpZiAoZGVmaW5lZDApIG91dHB1dC5wb2ludCgreChkLCBpLCBkYXRhKSwgK3koZCwgaSwgZGF0YSkpO1xuICAgIH1cblxuICAgIGlmIChidWZmZXIpIHJldHVybiBvdXRwdXQgPSBudWxsLCBidWZmZXIgKyBcIlwiIHx8IG51bGw7XG4gIH1cblxuICBsaW5lLnggPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBsaW5lKSA6IHg7XG4gIH07XG5cbiAgbGluZS55ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHkgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgbGluZSkgOiB5O1xuICB9O1xuXG4gIGxpbmUuZGVmaW5lZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkZWZpbmVkID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCghIV8pLCBsaW5lKSA6IGRlZmluZWQ7XG4gIH07XG5cbiAgbGluZS5jdXJ2ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChjdXJ2ZSA9IF8sIGNvbnRleHQgIT0gbnVsbCAmJiAob3V0cHV0ID0gY3VydmUoY29udGV4dCkpLCBsaW5lKSA6IGN1cnZlO1xuICB9O1xuXG4gIGxpbmUuY29udGV4dCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChfID09IG51bGwgPyBjb250ZXh0ID0gb3V0cHV0ID0gbnVsbCA6IG91dHB1dCA9IGN1cnZlKGNvbnRleHQgPSBfKSwgbGluZSkgOiBjb250ZXh0O1xuICB9O1xuXG4gIHJldHVybiBsaW5lO1xufVxuIiwiaW1wb3J0IHtwYXRofSBmcm9tIFwiZDMtcGF0aFwiO1xuaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuL2NvbnN0YW50XCI7XG5pbXBvcnQgY3VydmVMaW5lYXIgZnJvbSBcIi4vY3VydmUvbGluZWFyXCI7XG5pbXBvcnQgbGluZSBmcm9tIFwiLi9saW5lXCI7XG5pbXBvcnQge3ggYXMgcG9pbnRYLCB5IGFzIHBvaW50WX0gZnJvbSBcIi4vcG9pbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciB4MCA9IHBvaW50WCxcbiAgICAgIHgxID0gbnVsbCxcbiAgICAgIHkwID0gY29uc3RhbnQoMCksXG4gICAgICB5MSA9IHBvaW50WSxcbiAgICAgIGRlZmluZWQgPSBjb25zdGFudCh0cnVlKSxcbiAgICAgIGNvbnRleHQgPSBudWxsLFxuICAgICAgY3VydmUgPSBjdXJ2ZUxpbmVhcixcbiAgICAgIG91dHB1dCA9IG51bGw7XG5cbiAgZnVuY3Rpb24gYXJlYShkYXRhKSB7XG4gICAgdmFyIGksXG4gICAgICAgIGosXG4gICAgICAgIGssXG4gICAgICAgIG4gPSBkYXRhLmxlbmd0aCxcbiAgICAgICAgZCxcbiAgICAgICAgZGVmaW5lZDAgPSBmYWxzZSxcbiAgICAgICAgYnVmZmVyLFxuICAgICAgICB4MHogPSBuZXcgQXJyYXkobiksXG4gICAgICAgIHkweiA9IG5ldyBBcnJheShuKTtcblxuICAgIGlmIChjb250ZXh0ID09IG51bGwpIG91dHB1dCA9IGN1cnZlKGJ1ZmZlciA9IHBhdGgoKSk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDw9IG47ICsraSkge1xuICAgICAgaWYgKCEoaSA8IG4gJiYgZGVmaW5lZChkID0gZGF0YVtpXSwgaSwgZGF0YSkpID09PSBkZWZpbmVkMCkge1xuICAgICAgICBpZiAoZGVmaW5lZDAgPSAhZGVmaW5lZDApIHtcbiAgICAgICAgICBqID0gaTtcbiAgICAgICAgICBvdXRwdXQuYXJlYVN0YXJ0KCk7XG4gICAgICAgICAgb3V0cHV0LmxpbmVTdGFydCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dHB1dC5saW5lRW5kKCk7XG4gICAgICAgICAgb3V0cHV0LmxpbmVTdGFydCgpO1xuICAgICAgICAgIGZvciAoayA9IGkgLSAxOyBrID49IGo7IC0taykge1xuICAgICAgICAgICAgb3V0cHV0LnBvaW50KHgweltrXSwgeTB6W2tdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0cHV0LmxpbmVFbmQoKTtcbiAgICAgICAgICBvdXRwdXQuYXJlYUVuZCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZGVmaW5lZDApIHtcbiAgICAgICAgeDB6W2ldID0gK3gwKGQsIGksIGRhdGEpLCB5MHpbaV0gPSAreTAoZCwgaSwgZGF0YSk7XG4gICAgICAgIG91dHB1dC5wb2ludCh4MSA/ICt4MShkLCBpLCBkYXRhKSA6IHgweltpXSwgeTEgPyAreTEoZCwgaSwgZGF0YSkgOiB5MHpbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChidWZmZXIpIHJldHVybiBvdXRwdXQgPSBudWxsLCBidWZmZXIgKyBcIlwiIHx8IG51bGw7XG4gIH1cblxuICBmdW5jdGlvbiBhcmVhbGluZSgpIHtcbiAgICByZXR1cm4gbGluZSgpLmRlZmluZWQoZGVmaW5lZCkuY3VydmUoY3VydmUpLmNvbnRleHQoY29udGV4dCk7XG4gIH1cblxuICBhcmVhLnggPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeDAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgeDEgPSBudWxsLCBhcmVhKSA6IHgwO1xuICB9O1xuXG4gIGFyZWEueDAgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeDAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJlYSkgOiB4MDtcbiAgfTtcblxuICBhcmVhLngxID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgxID0gXyA9PSBudWxsID8gbnVsbCA6IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmVhKSA6IHgxO1xuICB9O1xuXG4gIGFyZWEueSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh5MCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCB5MSA9IG51bGwsIGFyZWEpIDogeTA7XG4gIH07XG5cbiAgYXJlYS55MCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh5MCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmVhKSA6IHkwO1xuICB9O1xuXG4gIGFyZWEueTEgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeTEgPSBfID09IG51bGwgPyBudWxsIDogdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGFyZWEpIDogeTE7XG4gIH07XG5cbiAgYXJlYS5saW5lWDAgPVxuICBhcmVhLmxpbmVZMCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmVhbGluZSgpLngoeDApLnkoeTApO1xuICB9O1xuXG4gIGFyZWEubGluZVkxID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFyZWFsaW5lKCkueCh4MCkueSh5MSk7XG4gIH07XG5cbiAgYXJlYS5saW5lWDEgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXJlYWxpbmUoKS54KHgxKS55KHkwKTtcbiAgfTtcblxuICBhcmVhLmRlZmluZWQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZGVmaW5lZCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoISFfKSwgYXJlYSkgOiBkZWZpbmVkO1xuICB9O1xuXG4gIGFyZWEuY3VydmUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoY3VydmUgPSBfLCBjb250ZXh0ICE9IG51bGwgJiYgKG91dHB1dCA9IGN1cnZlKGNvbnRleHQpKSwgYXJlYSkgOiBjdXJ2ZTtcbiAgfTtcblxuICBhcmVhLmNvbnRleHQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoXyA9PSBudWxsID8gY29udGV4dCA9IG91dHB1dCA9IG51bGwgOiBvdXRwdXQgPSBjdXJ2ZShjb250ZXh0ID0gXyksIGFyZWEpIDogY29udGV4dDtcbiAgfTtcblxuICByZXR1cm4gYXJlYTtcbn1cbiIsImZ1bmN0aW9uIHNpZ24oeCkge1xuICByZXR1cm4geCA8IDAgPyAtMSA6IDE7XG59XG5cbi8vIENhbGN1bGF0ZSB0aGUgc2xvcGVzIG9mIHRoZSB0YW5nZW50cyAoSGVybWl0ZS10eXBlIGludGVycG9sYXRpb24pIGJhc2VkIG9uXG4vLyB0aGUgZm9sbG93aW5nIHBhcGVyOiBTdGVmZmVuLCBNLiAxOTkwLiBBIFNpbXBsZSBNZXRob2QgZm9yIE1vbm90b25pY1xuLy8gSW50ZXJwb2xhdGlvbiBpbiBPbmUgRGltZW5zaW9uLiBBc3Ryb25vbXkgYW5kIEFzdHJvcGh5c2ljcywgVm9sLiAyMzksIE5PLlxuLy8gTk9WKElJKSwgUC4gNDQzLCAxOTkwLlxuZnVuY3Rpb24gc2xvcGUzKHRoYXQsIHgyLCB5Mikge1xuICB2YXIgaDAgPSB0aGF0Ll94MSAtIHRoYXQuX3gwLFxuICAgICAgaDEgPSB4MiAtIHRoYXQuX3gxLFxuICAgICAgczAgPSAodGhhdC5feTEgLSB0aGF0Ll95MCkgLyAoaDAgfHwgaDEgPCAwICYmIC0wKSxcbiAgICAgIHMxID0gKHkyIC0gdGhhdC5feTEpIC8gKGgxIHx8IGgwIDwgMCAmJiAtMCksXG4gICAgICBwID0gKHMwICogaDEgKyBzMSAqIGgwKSAvIChoMCArIGgxKTtcbiAgcmV0dXJuIChzaWduKHMwKSArIHNpZ24oczEpKSAqIE1hdGgubWluKE1hdGguYWJzKHMwKSwgTWF0aC5hYnMoczEpLCAwLjUgKiBNYXRoLmFicyhwKSkgfHwgMDtcbn1cblxuLy8gQ2FsY3VsYXRlIGEgb25lLXNpZGVkIHNsb3BlLlxuZnVuY3Rpb24gc2xvcGUyKHRoYXQsIHQpIHtcbiAgdmFyIGggPSB0aGF0Ll94MSAtIHRoYXQuX3gwO1xuICByZXR1cm4gaCA/ICgzICogKHRoYXQuX3kxIC0gdGhhdC5feTApIC8gaCAtIHQpIC8gMiA6IHQ7XG59XG5cbi8vIEFjY29yZGluZyB0byBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9DdWJpY19IZXJtaXRlX3NwbGluZSNSZXByZXNlbnRhdGlvbnNcbi8vIFwieW91IGNhbiBleHByZXNzIGN1YmljIEhlcm1pdGUgaW50ZXJwb2xhdGlvbiBpbiB0ZXJtcyBvZiBjdWJpYyBCw6l6aWVyIGN1cnZlc1xuLy8gd2l0aCByZXNwZWN0IHRvIHRoZSBmb3VyIHZhbHVlcyBwMCwgcDAgKyBtMCAvIDMsIHAxIC0gbTEgLyAzLCBwMVwiLlxuZnVuY3Rpb24gcG9pbnQodGhhdCwgdDAsIHQxKSB7XG4gIHZhciB4MCA9IHRoYXQuX3gwLFxuICAgICAgeTAgPSB0aGF0Ll95MCxcbiAgICAgIHgxID0gdGhhdC5feDEsXG4gICAgICB5MSA9IHRoYXQuX3kxLFxuICAgICAgZHggPSAoeDEgLSB4MCkgLyAzO1xuICB0aGF0Ll9jb250ZXh0LmJlemllckN1cnZlVG8oeDAgKyBkeCwgeTAgKyBkeCAqIHQwLCB4MSAtIGR4LCB5MSAtIGR4ICogdDEsIHgxLCB5MSk7XG59XG5cbmZ1bmN0aW9uIE1vbm90b25lWChjb250ZXh0KSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufVxuXG5Nb25vdG9uZVgucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3gwID0gdGhpcy5feDEgPVxuICAgIHRoaXMuX3kwID0gdGhpcy5feTEgPVxuICAgIHRoaXMuX3QwID0gTmFOO1xuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLl9wb2ludCkge1xuICAgICAgY2FzZSAyOiB0aGlzLl9jb250ZXh0LmxpbmVUbyh0aGlzLl94MSwgdGhpcy5feTEpOyBicmVhaztcbiAgICAgIGNhc2UgMzogcG9pbnQodGhpcywgdGhpcy5fdDAsIHNsb3BlMih0aGlzLCB0aGlzLl90MCkpOyBicmVhaztcbiAgICB9XG4gICAgaWYgKHRoaXMuX2xpbmUgfHwgKHRoaXMuX2xpbmUgIT09IDAgJiYgdGhpcy5fcG9pbnQgPT09IDEpKSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIHRoaXMuX2xpbmUgPSAxIC0gdGhpcy5fbGluZTtcbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2YXIgdDEgPSBOYU47XG5cbiAgICB4ID0gK3gsIHkgPSAreTtcbiAgICBpZiAoeCA9PT0gdGhpcy5feDEgJiYgeSA9PT0gdGhpcy5feTEpIHJldHVybjsgLy8gSWdub3JlIGNvaW5jaWRlbnQgcG9pbnRzLlxuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMDogdGhpcy5fcG9pbnQgPSAxOyB0aGlzLl9saW5lID8gdGhpcy5fY29udGV4dC5saW5lVG8oeCwgeSkgOiB0aGlzLl9jb250ZXh0Lm1vdmVUbyh4LCB5KTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgYnJlYWs7XG4gICAgICBjYXNlIDI6IHRoaXMuX3BvaW50ID0gMzsgcG9pbnQodGhpcywgc2xvcGUyKHRoaXMsIHQxID0gc2xvcGUzKHRoaXMsIHgsIHkpKSwgdDEpOyBicmVhaztcbiAgICAgIGRlZmF1bHQ6IHBvaW50KHRoaXMsIHRoaXMuX3QwLCB0MSA9IHNsb3BlMyh0aGlzLCB4LCB5KSk7IGJyZWFrO1xuICAgIH1cblxuICAgIHRoaXMuX3gwID0gdGhpcy5feDEsIHRoaXMuX3gxID0geDtcbiAgICB0aGlzLl95MCA9IHRoaXMuX3kxLCB0aGlzLl95MSA9IHk7XG4gICAgdGhpcy5fdDAgPSB0MTtcbiAgfVxufVxuXG5mdW5jdGlvbiBNb25vdG9uZVkoY29udGV4dCkge1xuICB0aGlzLl9jb250ZXh0ID0gbmV3IFJlZmxlY3RDb250ZXh0KGNvbnRleHQpO1xufVxuXG4oTW9ub3RvbmVZLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTW9ub3RvbmVYLnByb3RvdHlwZSkpLnBvaW50ID0gZnVuY3Rpb24oeCwgeSkge1xuICBNb25vdG9uZVgucHJvdG90eXBlLnBvaW50LmNhbGwodGhpcywgeSwgeCk7XG59O1xuXG5mdW5jdGlvbiBSZWZsZWN0Q29udGV4dChjb250ZXh0KSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufVxuXG5SZWZsZWN0Q29udGV4dC5wcm90b3R5cGUgPSB7XG4gIG1vdmVUbzogZnVuY3Rpb24oeCwgeSkgeyB0aGlzLl9jb250ZXh0Lm1vdmVUbyh5LCB4KTsgfSxcbiAgY2xvc2VQYXRoOiBmdW5jdGlvbigpIHsgdGhpcy5fY29udGV4dC5jbG9zZVBhdGgoKTsgfSxcbiAgbGluZVRvOiBmdW5jdGlvbih4LCB5KSB7IHRoaXMuX2NvbnRleHQubGluZVRvKHksIHgpOyB9LFxuICBiZXppZXJDdXJ2ZVRvOiBmdW5jdGlvbih4MSwgeTEsIHgyLCB5MiwgeCwgeSkgeyB0aGlzLl9jb250ZXh0LmJlemllckN1cnZlVG8oeTEsIHgxLCB5MiwgeDIsIHksIHgpOyB9XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbW9ub3RvbmVYKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBNb25vdG9uZVgoY29udGV4dCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb25vdG9uZVkoY29udGV4dCkge1xuICByZXR1cm4gbmV3IE1vbm90b25lWShjb250ZXh0KTtcbn1cbiIsImV4cG9ydCB2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4O1xufVxuIiwiaW1wb3J0IHtzbGljZX0gZnJvbSBcIi4vYXJyYXlcIjtcbmltcG9ydCBpZGVudGl0eSBmcm9tIFwiLi9pZGVudGl0eVwiO1xuXG52YXIgdG9wID0gMSxcbiAgICByaWdodCA9IDIsXG4gICAgYm90dG9tID0gMyxcbiAgICBsZWZ0ID0gNCxcbiAgICBlcHNpbG9uID0gMWUtNjtcblxuZnVuY3Rpb24gdHJhbnNsYXRlWCh4KSB7XG4gIHJldHVybiBcInRyYW5zbGF0ZShcIiArICh4ICsgMC41KSArIFwiLDApXCI7XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVkoeSkge1xuICByZXR1cm4gXCJ0cmFuc2xhdGUoMCxcIiArICh5ICsgMC41KSArIFwiKVwiO1xufVxuXG5mdW5jdGlvbiBudW1iZXIoc2NhbGUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gK3NjYWxlKGQpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjZW50ZXIoc2NhbGUpIHtcbiAgdmFyIG9mZnNldCA9IE1hdGgubWF4KDAsIHNjYWxlLmJhbmR3aWR0aCgpIC0gMSkgLyAyOyAvLyBBZGp1c3QgZm9yIDAuNXB4IG9mZnNldC5cbiAgaWYgKHNjYWxlLnJvdW5kKCkpIG9mZnNldCA9IE1hdGgucm91bmQob2Zmc2V0KTtcbiAgcmV0dXJuIGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gK3NjYWxlKGQpICsgb2Zmc2V0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBlbnRlcmluZygpIHtcbiAgcmV0dXJuICF0aGlzLl9fYXhpcztcbn1cblxuZnVuY3Rpb24gYXhpcyhvcmllbnQsIHNjYWxlKSB7XG4gIHZhciB0aWNrQXJndW1lbnRzID0gW10sXG4gICAgICB0aWNrVmFsdWVzID0gbnVsbCxcbiAgICAgIHRpY2tGb3JtYXQgPSBudWxsLFxuICAgICAgdGlja1NpemVJbm5lciA9IDYsXG4gICAgICB0aWNrU2l6ZU91dGVyID0gNixcbiAgICAgIHRpY2tQYWRkaW5nID0gMyxcbiAgICAgIGsgPSBvcmllbnQgPT09IHRvcCB8fCBvcmllbnQgPT09IGxlZnQgPyAtMSA6IDEsXG4gICAgICB4ID0gb3JpZW50ID09PSBsZWZ0IHx8IG9yaWVudCA9PT0gcmlnaHQgPyBcInhcIiA6IFwieVwiLFxuICAgICAgdHJhbnNmb3JtID0gb3JpZW50ID09PSB0b3AgfHwgb3JpZW50ID09PSBib3R0b20gPyB0cmFuc2xhdGVYIDogdHJhbnNsYXRlWTtcblxuICBmdW5jdGlvbiBheGlzKGNvbnRleHQpIHtcbiAgICB2YXIgdmFsdWVzID0gdGlja1ZhbHVlcyA9PSBudWxsID8gKHNjYWxlLnRpY2tzID8gc2NhbGUudGlja3MuYXBwbHkoc2NhbGUsIHRpY2tBcmd1bWVudHMpIDogc2NhbGUuZG9tYWluKCkpIDogdGlja1ZhbHVlcyxcbiAgICAgICAgZm9ybWF0ID0gdGlja0Zvcm1hdCA9PSBudWxsID8gKHNjYWxlLnRpY2tGb3JtYXQgPyBzY2FsZS50aWNrRm9ybWF0LmFwcGx5KHNjYWxlLCB0aWNrQXJndW1lbnRzKSA6IGlkZW50aXR5KSA6IHRpY2tGb3JtYXQsXG4gICAgICAgIHNwYWNpbmcgPSBNYXRoLm1heCh0aWNrU2l6ZUlubmVyLCAwKSArIHRpY2tQYWRkaW5nLFxuICAgICAgICByYW5nZSA9IHNjYWxlLnJhbmdlKCksXG4gICAgICAgIHJhbmdlMCA9ICtyYW5nZVswXSArIDAuNSxcbiAgICAgICAgcmFuZ2UxID0gK3JhbmdlW3JhbmdlLmxlbmd0aCAtIDFdICsgMC41LFxuICAgICAgICBwb3NpdGlvbiA9IChzY2FsZS5iYW5kd2lkdGggPyBjZW50ZXIgOiBudW1iZXIpKHNjYWxlLmNvcHkoKSksXG4gICAgICAgIHNlbGVjdGlvbiA9IGNvbnRleHQuc2VsZWN0aW9uID8gY29udGV4dC5zZWxlY3Rpb24oKSA6IGNvbnRleHQsXG4gICAgICAgIHBhdGggPSBzZWxlY3Rpb24uc2VsZWN0QWxsKFwiLmRvbWFpblwiKS5kYXRhKFtudWxsXSksXG4gICAgICAgIHRpY2sgPSBzZWxlY3Rpb24uc2VsZWN0QWxsKFwiLnRpY2tcIikuZGF0YSh2YWx1ZXMsIHNjYWxlKS5vcmRlcigpLFxuICAgICAgICB0aWNrRXhpdCA9IHRpY2suZXhpdCgpLFxuICAgICAgICB0aWNrRW50ZXIgPSB0aWNrLmVudGVyKCkuYXBwZW5kKFwiZ1wiKS5hdHRyKFwiY2xhc3NcIiwgXCJ0aWNrXCIpLFxuICAgICAgICBsaW5lID0gdGljay5zZWxlY3QoXCJsaW5lXCIpLFxuICAgICAgICB0ZXh0ID0gdGljay5zZWxlY3QoXCJ0ZXh0XCIpO1xuXG4gICAgcGF0aCA9IHBhdGgubWVyZ2UocGF0aC5lbnRlcigpLmluc2VydChcInBhdGhcIiwgXCIudGlja1wiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiZG9tYWluXCIpXG4gICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwiIzAwMFwiKSk7XG5cbiAgICB0aWNrID0gdGljay5tZXJnZSh0aWNrRW50ZXIpO1xuXG4gICAgbGluZSA9IGxpbmUubWVyZ2UodGlja0VudGVyLmFwcGVuZChcImxpbmVcIilcbiAgICAgICAgLmF0dHIoXCJzdHJva2VcIiwgXCIjMDAwXCIpXG4gICAgICAgIC5hdHRyKHggKyBcIjJcIiwgayAqIHRpY2tTaXplSW5uZXIpKTtcblxuICAgIHRleHQgPSB0ZXh0Lm1lcmdlKHRpY2tFbnRlci5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgIC5hdHRyKFwiZmlsbFwiLCBcIiMwMDBcIilcbiAgICAgICAgLmF0dHIoeCwgayAqIHNwYWNpbmcpXG4gICAgICAgIC5hdHRyKFwiZHlcIiwgb3JpZW50ID09PSB0b3AgPyBcIjBlbVwiIDogb3JpZW50ID09PSBib3R0b20gPyBcIjAuNzFlbVwiIDogXCIwLjMyZW1cIikpO1xuXG4gICAgaWYgKGNvbnRleHQgIT09IHNlbGVjdGlvbikge1xuICAgICAgcGF0aCA9IHBhdGgudHJhbnNpdGlvbihjb250ZXh0KTtcbiAgICAgIHRpY2sgPSB0aWNrLnRyYW5zaXRpb24oY29udGV4dCk7XG4gICAgICBsaW5lID0gbGluZS50cmFuc2l0aW9uKGNvbnRleHQpO1xuICAgICAgdGV4dCA9IHRleHQudHJhbnNpdGlvbihjb250ZXh0KTtcblxuICAgICAgdGlja0V4aXQgPSB0aWNrRXhpdC50cmFuc2l0aW9uKGNvbnRleHQpXG4gICAgICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsIGVwc2lsb24pXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gaXNGaW5pdGUoZCA9IHBvc2l0aW9uKGQpKSA/IHRyYW5zZm9ybShkKSA6IHRoaXMuZ2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIpOyB9KTtcblxuICAgICAgdGlja0VudGVyXG4gICAgICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsIGVwc2lsb24pXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyB2YXIgcCA9IHRoaXMucGFyZW50Tm9kZS5fX2F4aXM7IHJldHVybiB0cmFuc2Zvcm0ocCAmJiBpc0Zpbml0ZShwID0gcChkKSkgPyBwIDogcG9zaXRpb24oZCkpOyB9KTtcbiAgICB9XG5cbiAgICB0aWNrRXhpdC5yZW1vdmUoKTtcblxuICAgIHBhdGhcbiAgICAgICAgLmF0dHIoXCJkXCIsIG9yaWVudCA9PT0gbGVmdCB8fCBvcmllbnQgPT0gcmlnaHRcbiAgICAgICAgICAgID8gXCJNXCIgKyBrICogdGlja1NpemVPdXRlciArIFwiLFwiICsgcmFuZ2UwICsgXCJIMC41VlwiICsgcmFuZ2UxICsgXCJIXCIgKyBrICogdGlja1NpemVPdXRlclxuICAgICAgICAgICAgOiBcIk1cIiArIHJhbmdlMCArIFwiLFwiICsgayAqIHRpY2tTaXplT3V0ZXIgKyBcIlYwLjVIXCIgKyByYW5nZTEgKyBcIlZcIiArIGsgKiB0aWNrU2l6ZU91dGVyKTtcblxuICAgIHRpY2tcbiAgICAgICAgLmF0dHIoXCJvcGFjaXR5XCIsIDEpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHRyYW5zZm9ybShwb3NpdGlvbihkKSk7IH0pO1xuXG4gICAgbGluZVxuICAgICAgICAuYXR0cih4ICsgXCIyXCIsIGsgKiB0aWNrU2l6ZUlubmVyKTtcblxuICAgIHRleHRcbiAgICAgICAgLmF0dHIoeCwgayAqIHNwYWNpbmcpXG4gICAgICAgIC50ZXh0KGZvcm1hdCk7XG5cbiAgICBzZWxlY3Rpb24uZmlsdGVyKGVudGVyaW5nKVxuICAgICAgICAuYXR0cihcImZpbGxcIiwgXCJub25lXCIpXG4gICAgICAgIC5hdHRyKFwiZm9udC1zaXplXCIsIDEwKVxuICAgICAgICAuYXR0cihcImZvbnQtZmFtaWx5XCIsIFwic2Fucy1zZXJpZlwiKVxuICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIG9yaWVudCA9PT0gcmlnaHQgPyBcInN0YXJ0XCIgOiBvcmllbnQgPT09IGxlZnQgPyBcImVuZFwiIDogXCJtaWRkbGVcIik7XG5cbiAgICBzZWxlY3Rpb25cbiAgICAgICAgLmVhY2goZnVuY3Rpb24oKSB7IHRoaXMuX19heGlzID0gcG9zaXRpb247IH0pO1xuICB9XG5cbiAgYXhpcy5zY2FsZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChzY2FsZSA9IF8sIGF4aXMpIDogc2NhbGU7XG4gIH07XG5cbiAgYXhpcy50aWNrcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aWNrQXJndW1lbnRzID0gc2xpY2UuY2FsbChhcmd1bWVudHMpLCBheGlzO1xuICB9O1xuXG4gIGF4aXMudGlja0FyZ3VtZW50cyA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh0aWNrQXJndW1lbnRzID0gXyA9PSBudWxsID8gW10gOiBzbGljZS5jYWxsKF8pLCBheGlzKSA6IHRpY2tBcmd1bWVudHMuc2xpY2UoKTtcbiAgfTtcblxuICBheGlzLnRpY2tWYWx1ZXMgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodGlja1ZhbHVlcyA9IF8gPT0gbnVsbCA/IG51bGwgOiBzbGljZS5jYWxsKF8pLCBheGlzKSA6IHRpY2tWYWx1ZXMgJiYgdGlja1ZhbHVlcy5zbGljZSgpO1xuICB9O1xuXG4gIGF4aXMudGlja0Zvcm1hdCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh0aWNrRm9ybWF0ID0gXywgYXhpcykgOiB0aWNrRm9ybWF0O1xuICB9O1xuXG4gIGF4aXMudGlja1NpemUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodGlja1NpemVJbm5lciA9IHRpY2tTaXplT3V0ZXIgPSArXywgYXhpcykgOiB0aWNrU2l6ZUlubmVyO1xuICB9O1xuXG4gIGF4aXMudGlja1NpemVJbm5lciA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh0aWNrU2l6ZUlubmVyID0gK18sIGF4aXMpIDogdGlja1NpemVJbm5lcjtcbiAgfTtcblxuICBheGlzLnRpY2tTaXplT3V0ZXIgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodGlja1NpemVPdXRlciA9ICtfLCBheGlzKSA6IHRpY2tTaXplT3V0ZXI7XG4gIH07XG5cbiAgYXhpcy50aWNrUGFkZGluZyA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh0aWNrUGFkZGluZyA9ICtfLCBheGlzKSA6IHRpY2tQYWRkaW5nO1xuICB9O1xuXG4gIHJldHVybiBheGlzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXhpc1RvcChzY2FsZSkge1xuICByZXR1cm4gYXhpcyh0b3AsIHNjYWxlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGF4aXNSaWdodChzY2FsZSkge1xuICByZXR1cm4gYXhpcyhyaWdodCwgc2NhbGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXhpc0JvdHRvbShzY2FsZSkge1xuICByZXR1cm4gYXhpcyhib3R0b20sIHNjYWxlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGF4aXNMZWZ0KHNjYWxlKSB7XG4gIHJldHVybiBheGlzKGxlZnQsIHNjYWxlKTtcbn1cbiIsInZhciBub29wID0ge3ZhbHVlOiBmdW5jdGlvbigpIHt9fTtcblxuZnVuY3Rpb24gZGlzcGF0Y2goKSB7XG4gIGZvciAodmFyIGkgPSAwLCBuID0gYXJndW1lbnRzLmxlbmd0aCwgXyA9IHt9LCB0OyBpIDwgbjsgKytpKSB7XG4gICAgaWYgKCEodCA9IGFyZ3VtZW50c1tpXSArIFwiXCIpIHx8ICh0IGluIF8pKSB0aHJvdyBuZXcgRXJyb3IoXCJpbGxlZ2FsIHR5cGU6IFwiICsgdCk7XG4gICAgX1t0XSA9IFtdO1xuICB9XG4gIHJldHVybiBuZXcgRGlzcGF0Y2goXyk7XG59XG5cbmZ1bmN0aW9uIERpc3BhdGNoKF8pIHtcbiAgdGhpcy5fID0gXztcbn1cblxuZnVuY3Rpb24gcGFyc2VUeXBlbmFtZXModHlwZW5hbWVzLCB0eXBlcykge1xuICByZXR1cm4gdHlwZW5hbWVzLnRyaW0oKS5zcGxpdCgvXnxcXHMrLykubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgbmFtZSA9IFwiXCIsIGkgPSB0LmluZGV4T2YoXCIuXCIpO1xuICAgIGlmIChpID49IDApIG5hbWUgPSB0LnNsaWNlKGkgKyAxKSwgdCA9IHQuc2xpY2UoMCwgaSk7XG4gICAgaWYgKHQgJiYgIXR5cGVzLmhhc093blByb3BlcnR5KHQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGU6IFwiICsgdCk7XG4gICAgcmV0dXJuIHt0eXBlOiB0LCBuYW1lOiBuYW1lfTtcbiAgfSk7XG59XG5cbkRpc3BhdGNoLnByb3RvdHlwZSA9IGRpc3BhdGNoLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IERpc3BhdGNoLFxuICBvbjogZnVuY3Rpb24odHlwZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIF8gPSB0aGlzLl8sXG4gICAgICAgIFQgPSBwYXJzZVR5cGVuYW1lcyh0eXBlbmFtZSArIFwiXCIsIF8pLFxuICAgICAgICB0LFxuICAgICAgICBpID0gLTEsXG4gICAgICAgIG4gPSBULmxlbmd0aDtcblxuICAgIC8vIElmIG5vIGNhbGxiYWNrIHdhcyBzcGVjaWZpZWQsIHJldHVybiB0aGUgY2FsbGJhY2sgb2YgdGhlIGdpdmVuIHR5cGUgYW5kIG5hbWUuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICB3aGlsZSAoKytpIDwgbikgaWYgKCh0ID0gKHR5cGVuYW1lID0gVFtpXSkudHlwZSkgJiYgKHQgPSBnZXQoX1t0XSwgdHlwZW5hbWUubmFtZSkpKSByZXR1cm4gdDtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiBhIHR5cGUgd2FzIHNwZWNpZmllZCwgc2V0IHRoZSBjYWxsYmFjayBmb3IgdGhlIGdpdmVuIHR5cGUgYW5kIG5hbWUuXG4gICAgLy8gT3RoZXJ3aXNlLCBpZiBhIG51bGwgY2FsbGJhY2sgd2FzIHNwZWNpZmllZCwgcmVtb3ZlIGNhbGxiYWNrcyBvZiB0aGUgZ2l2ZW4gbmFtZS5cbiAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCAmJiB0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBjYWxsYmFjazogXCIgKyBjYWxsYmFjayk7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGlmICh0ID0gKHR5cGVuYW1lID0gVFtpXSkudHlwZSkgX1t0XSA9IHNldChfW3RdLCB0eXBlbmFtZS5uYW1lLCBjYWxsYmFjayk7XG4gICAgICBlbHNlIGlmIChjYWxsYmFjayA9PSBudWxsKSBmb3IgKHQgaW4gXykgX1t0XSA9IHNldChfW3RdLCB0eXBlbmFtZS5uYW1lLCBudWxsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgY29weTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvcHkgPSB7fSwgXyA9IHRoaXMuXztcbiAgICBmb3IgKHZhciB0IGluIF8pIGNvcHlbdF0gPSBfW3RdLnNsaWNlKCk7XG4gICAgcmV0dXJuIG5ldyBEaXNwYXRjaChjb3B5KTtcbiAgfSxcbiAgY2FsbDogZnVuY3Rpb24odHlwZSwgdGhhdCkge1xuICAgIGlmICgobiA9IGFyZ3VtZW50cy5sZW5ndGggLSAyKSA+IDApIGZvciAodmFyIGFyZ3MgPSBuZXcgQXJyYXkobiksIGkgPSAwLCBuLCB0OyBpIDwgbjsgKytpKSBhcmdzW2ldID0gYXJndW1lbnRzW2kgKyAyXTtcbiAgICBpZiAoIXRoaXMuXy5oYXNPd25Qcm9wZXJ0eSh0eXBlKSkgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlOiBcIiArIHR5cGUpO1xuICAgIGZvciAodCA9IHRoaXMuX1t0eXBlXSwgaSA9IDAsIG4gPSB0Lmxlbmd0aDsgaSA8IG47ICsraSkgdFtpXS52YWx1ZS5hcHBseSh0aGF0LCBhcmdzKTtcbiAgfSxcbiAgYXBwbHk6IGZ1bmN0aW9uKHR5cGUsIHRoYXQsIGFyZ3MpIHtcbiAgICBpZiAoIXRoaXMuXy5oYXNPd25Qcm9wZXJ0eSh0eXBlKSkgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlOiBcIiArIHR5cGUpO1xuICAgIGZvciAodmFyIHQgPSB0aGlzLl9bdHlwZV0sIGkgPSAwLCBuID0gdC5sZW5ndGg7IGkgPCBuOyArK2kpIHRbaV0udmFsdWUuYXBwbHkodGhhdCwgYXJncyk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGdldCh0eXBlLCBuYW1lKSB7XG4gIGZvciAodmFyIGkgPSAwLCBuID0gdHlwZS5sZW5ndGgsIGM7IGkgPCBuOyArK2kpIHtcbiAgICBpZiAoKGMgPSB0eXBlW2ldKS5uYW1lID09PSBuYW1lKSB7XG4gICAgICByZXR1cm4gYy52YWx1ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0KHR5cGUsIG5hbWUsIGNhbGxiYWNrKSB7XG4gIGZvciAodmFyIGkgPSAwLCBuID0gdHlwZS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICBpZiAodHlwZVtpXS5uYW1lID09PSBuYW1lKSB7XG4gICAgICB0eXBlW2ldID0gbm9vcCwgdHlwZSA9IHR5cGUuc2xpY2UoMCwgaSkuY29uY2F0KHR5cGUuc2xpY2UoaSArIDEpKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkgdHlwZS5wdXNoKHtuYW1lOiBuYW1lLCB2YWx1ZTogY2FsbGJhY2t9KTtcbiAgcmV0dXJuIHR5cGU7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRpc3BhdGNoO1xuIiwiaW1wb3J0IHtldmVudH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuXG5leHBvcnQgZnVuY3Rpb24gbm9wcm9wYWdhdGlvbigpIHtcbiAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICBldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbn1cbiIsImltcG9ydCB7c2VsZWN0fSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQgbm9ldmVudCBmcm9tIFwiLi9ub2V2ZW50XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZpZXcpIHtcbiAgdmFyIHJvb3QgPSB2aWV3LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgICAgIHNlbGVjdGlvbiA9IHNlbGVjdCh2aWV3KS5vbihcImRyYWdzdGFydC5kcmFnXCIsIG5vZXZlbnQsIHRydWUpO1xuICBpZiAoXCJvbnNlbGVjdHN0YXJ0XCIgaW4gcm9vdCkge1xuICAgIHNlbGVjdGlvbi5vbihcInNlbGVjdHN0YXJ0LmRyYWdcIiwgbm9ldmVudCwgdHJ1ZSk7XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fX25vc2VsZWN0ID0gcm9vdC5zdHlsZS5Nb3pVc2VyU2VsZWN0O1xuICAgIHJvb3Quc3R5bGUuTW96VXNlclNlbGVjdCA9IFwibm9uZVwiO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB5ZXNkcmFnKHZpZXcsIG5vY2xpY2spIHtcbiAgdmFyIHJvb3QgPSB2aWV3LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgICAgIHNlbGVjdGlvbiA9IHNlbGVjdCh2aWV3KS5vbihcImRyYWdzdGFydC5kcmFnXCIsIG51bGwpO1xuICBpZiAobm9jbGljaykge1xuICAgIHNlbGVjdGlvbi5vbihcImNsaWNrLmRyYWdcIiwgbm9ldmVudCwgdHJ1ZSk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgc2VsZWN0aW9uLm9uKFwiY2xpY2suZHJhZ1wiLCBudWxsKTsgfSwgMCk7XG4gIH1cbiAgaWYgKFwib25zZWxlY3RzdGFydFwiIGluIHJvb3QpIHtcbiAgICBzZWxlY3Rpb24ub24oXCJzZWxlY3RzdGFydC5kcmFnXCIsIG51bGwpO1xuICB9IGVsc2Uge1xuICAgIHJvb3Quc3R5bGUuTW96VXNlclNlbGVjdCA9IHJvb3QuX19ub3NlbGVjdDtcbiAgICBkZWxldGUgcm9vdC5fX25vc2VsZWN0O1xuICB9XG59XG4iLCJ2YXIgZnJhbWUgPSAwLCAvLyBpcyBhbiBhbmltYXRpb24gZnJhbWUgcGVuZGluZz9cbiAgICB0aW1lb3V0ID0gMCwgLy8gaXMgYSB0aW1lb3V0IHBlbmRpbmc/XG4gICAgaW50ZXJ2YWwgPSAwLCAvLyBhcmUgYW55IHRpbWVycyBhY3RpdmU/XG4gICAgcG9rZURlbGF5ID0gMTAwMCwgLy8gaG93IGZyZXF1ZW50bHkgd2UgY2hlY2sgZm9yIGNsb2NrIHNrZXdcbiAgICB0YXNrSGVhZCxcbiAgICB0YXNrVGFpbCxcbiAgICBjbG9ja0xhc3QgPSAwLFxuICAgIGNsb2NrTm93ID0gMCxcbiAgICBjbG9ja1NrZXcgPSAwLFxuICAgIGNsb2NrID0gdHlwZW9mIHBlcmZvcm1hbmNlID09PSBcIm9iamVjdFwiICYmIHBlcmZvcm1hbmNlLm5vdyA/IHBlcmZvcm1hbmNlIDogRGF0ZSxcbiAgICBzZXRGcmFtZSA9IHR5cGVvZiB3aW5kb3cgPT09IFwib2JqZWN0XCIgJiYgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA/IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUuYmluZCh3aW5kb3cpIDogZnVuY3Rpb24oZikgeyBzZXRUaW1lb3V0KGYsIDE3KTsgfTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vdygpIHtcbiAgcmV0dXJuIGNsb2NrTm93IHx8IChzZXRGcmFtZShjbGVhck5vdyksIGNsb2NrTm93ID0gY2xvY2subm93KCkgKyBjbG9ja1NrZXcpO1xufVxuXG5mdW5jdGlvbiBjbGVhck5vdygpIHtcbiAgY2xvY2tOb3cgPSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gVGltZXIoKSB7XG4gIHRoaXMuX2NhbGwgPVxuICB0aGlzLl90aW1lID1cbiAgdGhpcy5fbmV4dCA9IG51bGw7XG59XG5cblRpbWVyLnByb3RvdHlwZSA9IHRpbWVyLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IFRpbWVyLFxuICByZXN0YXJ0OiBmdW5jdGlvbihjYWxsYmFjaywgZGVsYXksIHRpbWUpIHtcbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYWxsYmFjayBpcyBub3QgYSBmdW5jdGlvblwiKTtcbiAgICB0aW1lID0gKHRpbWUgPT0gbnVsbCA/IG5vdygpIDogK3RpbWUpICsgKGRlbGF5ID09IG51bGwgPyAwIDogK2RlbGF5KTtcbiAgICBpZiAoIXRoaXMuX25leHQgJiYgdGFza1RhaWwgIT09IHRoaXMpIHtcbiAgICAgIGlmICh0YXNrVGFpbCkgdGFza1RhaWwuX25leHQgPSB0aGlzO1xuICAgICAgZWxzZSB0YXNrSGVhZCA9IHRoaXM7XG4gICAgICB0YXNrVGFpbCA9IHRoaXM7XG4gICAgfVxuICAgIHRoaXMuX2NhbGwgPSBjYWxsYmFjaztcbiAgICB0aGlzLl90aW1lID0gdGltZTtcbiAgICBzbGVlcCgpO1xuICB9LFxuICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fY2FsbCkge1xuICAgICAgdGhpcy5fY2FsbCA9IG51bGw7XG4gICAgICB0aGlzLl90aW1lID0gSW5maW5pdHk7XG4gICAgICBzbGVlcCgpO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHRpbWVyKGNhbGxiYWNrLCBkZWxheSwgdGltZSkge1xuICB2YXIgdCA9IG5ldyBUaW1lcjtcbiAgdC5yZXN0YXJ0KGNhbGxiYWNrLCBkZWxheSwgdGltZSk7XG4gIHJldHVybiB0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGltZXJGbHVzaCgpIHtcbiAgbm93KCk7IC8vIEdldCB0aGUgY3VycmVudCB0aW1lLCBpZiBub3QgYWxyZWFkeSBzZXQuXG4gICsrZnJhbWU7IC8vIFByZXRlbmQgd2XigJl2ZSBzZXQgYW4gYWxhcm0sIGlmIHdlIGhhdmVu4oCZdCBhbHJlYWR5LlxuICB2YXIgdCA9IHRhc2tIZWFkLCBlO1xuICB3aGlsZSAodCkge1xuICAgIGlmICgoZSA9IGNsb2NrTm93IC0gdC5fdGltZSkgPj0gMCkgdC5fY2FsbC5jYWxsKG51bGwsIGUpO1xuICAgIHQgPSB0Ll9uZXh0O1xuICB9XG4gIC0tZnJhbWU7XG59XG5cbmZ1bmN0aW9uIHdha2UoKSB7XG4gIGNsb2NrTm93ID0gKGNsb2NrTGFzdCA9IGNsb2NrLm5vdygpKSArIGNsb2NrU2tldztcbiAgZnJhbWUgPSB0aW1lb3V0ID0gMDtcbiAgdHJ5IHtcbiAgICB0aW1lckZsdXNoKCk7XG4gIH0gZmluYWxseSB7XG4gICAgZnJhbWUgPSAwO1xuICAgIG5hcCgpO1xuICAgIGNsb2NrTm93ID0gMDtcbiAgfVxufVxuXG5mdW5jdGlvbiBwb2tlKCkge1xuICB2YXIgbm93ID0gY2xvY2subm93KCksIGRlbGF5ID0gbm93IC0gY2xvY2tMYXN0O1xuICBpZiAoZGVsYXkgPiBwb2tlRGVsYXkpIGNsb2NrU2tldyAtPSBkZWxheSwgY2xvY2tMYXN0ID0gbm93O1xufVxuXG5mdW5jdGlvbiBuYXAoKSB7XG4gIHZhciB0MCwgdDEgPSB0YXNrSGVhZCwgdDIsIHRpbWUgPSBJbmZpbml0eTtcbiAgd2hpbGUgKHQxKSB7XG4gICAgaWYgKHQxLl9jYWxsKSB7XG4gICAgICBpZiAodGltZSA+IHQxLl90aW1lKSB0aW1lID0gdDEuX3RpbWU7XG4gICAgICB0MCA9IHQxLCB0MSA9IHQxLl9uZXh0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0MiA9IHQxLl9uZXh0LCB0MS5fbmV4dCA9IG51bGw7XG4gICAgICB0MSA9IHQwID8gdDAuX25leHQgPSB0MiA6IHRhc2tIZWFkID0gdDI7XG4gICAgfVxuICB9XG4gIHRhc2tUYWlsID0gdDA7XG4gIHNsZWVwKHRpbWUpO1xufVxuXG5mdW5jdGlvbiBzbGVlcCh0aW1lKSB7XG4gIGlmIChmcmFtZSkgcmV0dXJuOyAvLyBTb29uZXN0IGFsYXJtIGFscmVhZHkgc2V0LCBvciB3aWxsIGJlLlxuICBpZiAodGltZW91dCkgdGltZW91dCA9IGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgdmFyIGRlbGF5ID0gdGltZSAtIGNsb2NrTm93OyAvLyBTdHJpY3RseSBsZXNzIHRoYW4gaWYgd2UgcmVjb21wdXRlZCBjbG9ja05vdy5cbiAgaWYgKGRlbGF5ID4gMjQpIHtcbiAgICBpZiAodGltZSA8IEluZmluaXR5KSB0aW1lb3V0ID0gc2V0VGltZW91dCh3YWtlLCB0aW1lIC0gY2xvY2subm93KCkgLSBjbG9ja1NrZXcpO1xuICAgIGlmIChpbnRlcnZhbCkgaW50ZXJ2YWwgPSBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoIWludGVydmFsKSBjbG9ja0xhc3QgPSBjbG9jay5ub3coKSwgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChwb2tlLCBwb2tlRGVsYXkpO1xuICAgIGZyYW1lID0gMSwgc2V0RnJhbWUod2FrZSk7XG4gIH1cbn1cbiIsImltcG9ydCB7VGltZXJ9IGZyb20gXCIuL3RpbWVyXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNhbGxiYWNrLCBkZWxheSwgdGltZSkge1xuICB2YXIgdCA9IG5ldyBUaW1lcjtcbiAgZGVsYXkgPSBkZWxheSA9PSBudWxsID8gMCA6ICtkZWxheTtcbiAgdC5yZXN0YXJ0KGZ1bmN0aW9uKGVsYXBzZWQpIHtcbiAgICB0LnN0b3AoKTtcbiAgICBjYWxsYmFjayhlbGFwc2VkICsgZGVsYXkpO1xuICB9LCBkZWxheSwgdGltZSk7XG4gIHJldHVybiB0O1xufVxuIiwiaW1wb3J0IHtkaXNwYXRjaH0gZnJvbSBcImQzLWRpc3BhdGNoXCI7XG5pbXBvcnQge3RpbWVyLCB0aW1lb3V0fSBmcm9tIFwiZDMtdGltZXJcIjtcblxudmFyIGVtcHR5T24gPSBkaXNwYXRjaChcInN0YXJ0XCIsIFwiZW5kXCIsIFwiaW50ZXJydXB0XCIpO1xudmFyIGVtcHR5VHdlZW4gPSBbXTtcblxuZXhwb3J0IHZhciBDUkVBVEVEID0gMDtcbmV4cG9ydCB2YXIgU0NIRURVTEVEID0gMTtcbmV4cG9ydCB2YXIgU1RBUlRJTkcgPSAyO1xuZXhwb3J0IHZhciBTVEFSVEVEID0gMztcbmV4cG9ydCB2YXIgUlVOTklORyA9IDQ7XG5leHBvcnQgdmFyIEVORElORyA9IDU7XG5leHBvcnQgdmFyIEVOREVEID0gNjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obm9kZSwgbmFtZSwgaWQsIGluZGV4LCBncm91cCwgdGltaW5nKSB7XG4gIHZhciBzY2hlZHVsZXMgPSBub2RlLl9fdHJhbnNpdGlvbjtcbiAgaWYgKCFzY2hlZHVsZXMpIG5vZGUuX190cmFuc2l0aW9uID0ge307XG4gIGVsc2UgaWYgKGlkIGluIHNjaGVkdWxlcykgcmV0dXJuO1xuICBjcmVhdGUobm9kZSwgaWQsIHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIGluZGV4OiBpbmRleCwgLy8gRm9yIGNvbnRleHQgZHVyaW5nIGNhbGxiYWNrLlxuICAgIGdyb3VwOiBncm91cCwgLy8gRm9yIGNvbnRleHQgZHVyaW5nIGNhbGxiYWNrLlxuICAgIG9uOiBlbXB0eU9uLFxuICAgIHR3ZWVuOiBlbXB0eVR3ZWVuLFxuICAgIHRpbWU6IHRpbWluZy50aW1lLFxuICAgIGRlbGF5OiB0aW1pbmcuZGVsYXksXG4gICAgZHVyYXRpb246IHRpbWluZy5kdXJhdGlvbixcbiAgICBlYXNlOiB0aW1pbmcuZWFzZSxcbiAgICB0aW1lcjogbnVsbCxcbiAgICBzdGF0ZTogQ1JFQVRFRFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXQobm9kZSwgaWQpIHtcbiAgdmFyIHNjaGVkdWxlID0gZ2V0KG5vZGUsIGlkKTtcbiAgaWYgKHNjaGVkdWxlLnN0YXRlID4gQ1JFQVRFRCkgdGhyb3cgbmV3IEVycm9yKFwidG9vIGxhdGU7IGFscmVhZHkgc2NoZWR1bGVkXCIpO1xuICByZXR1cm4gc2NoZWR1bGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXQobm9kZSwgaWQpIHtcbiAgdmFyIHNjaGVkdWxlID0gZ2V0KG5vZGUsIGlkKTtcbiAgaWYgKHNjaGVkdWxlLnN0YXRlID4gU1RBUlRJTkcpIHRocm93IG5ldyBFcnJvcihcInRvbyBsYXRlOyBhbHJlYWR5IHN0YXJ0ZWRcIik7XG4gIHJldHVybiBzY2hlZHVsZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldChub2RlLCBpZCkge1xuICB2YXIgc2NoZWR1bGUgPSBub2RlLl9fdHJhbnNpdGlvbjtcbiAgaWYgKCFzY2hlZHVsZSB8fCAhKHNjaGVkdWxlID0gc2NoZWR1bGVbaWRdKSkgdGhyb3cgbmV3IEVycm9yKFwidHJhbnNpdGlvbiBub3QgZm91bmRcIik7XG4gIHJldHVybiBzY2hlZHVsZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlKG5vZGUsIGlkLCBzZWxmKSB7XG4gIHZhciBzY2hlZHVsZXMgPSBub2RlLl9fdHJhbnNpdGlvbixcbiAgICAgIHR3ZWVuO1xuXG4gIC8vIEluaXRpYWxpemUgdGhlIHNlbGYgdGltZXIgd2hlbiB0aGUgdHJhbnNpdGlvbiBpcyBjcmVhdGVkLlxuICAvLyBOb3RlIHRoZSBhY3R1YWwgZGVsYXkgaXMgbm90IGtub3duIHVudGlsIHRoZSBmaXJzdCBjYWxsYmFjayFcbiAgc2NoZWR1bGVzW2lkXSA9IHNlbGY7XG4gIHNlbGYudGltZXIgPSB0aW1lcihzY2hlZHVsZSwgMCwgc2VsZi50aW1lKTtcblxuICBmdW5jdGlvbiBzY2hlZHVsZShlbGFwc2VkKSB7XG4gICAgc2VsZi5zdGF0ZSA9IFNDSEVEVUxFRDtcbiAgICBzZWxmLnRpbWVyLnJlc3RhcnQoc3RhcnQsIHNlbGYuZGVsYXksIHNlbGYudGltZSk7XG5cbiAgICAvLyBJZiB0aGUgZWxhcHNlZCBkZWxheSBpcyBsZXNzIHRoYW4gb3VyIGZpcnN0IHNsZWVwLCBzdGFydCBpbW1lZGlhdGVseS5cbiAgICBpZiAoc2VsZi5kZWxheSA8PSBlbGFwc2VkKSBzdGFydChlbGFwc2VkIC0gc2VsZi5kZWxheSk7XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydChlbGFwc2VkKSB7XG4gICAgdmFyIGksIGosIG4sIG87XG5cbiAgICAvLyBJZiB0aGUgc3RhdGUgaXMgbm90IFNDSEVEVUxFRCwgdGhlbiB3ZSBwcmV2aW91c2x5IGVycm9yZWQgb24gc3RhcnQuXG4gICAgaWYgKHNlbGYuc3RhdGUgIT09IFNDSEVEVUxFRCkgcmV0dXJuIHN0b3AoKTtcblxuICAgIGZvciAoaSBpbiBzY2hlZHVsZXMpIHtcbiAgICAgIG8gPSBzY2hlZHVsZXNbaV07XG4gICAgICBpZiAoby5uYW1lICE9PSBzZWxmLm5hbWUpIGNvbnRpbnVlO1xuXG4gICAgICAvLyBXaGlsZSB0aGlzIGVsZW1lbnQgYWxyZWFkeSBoYXMgYSBzdGFydGluZyB0cmFuc2l0aW9uIGR1cmluZyB0aGlzIGZyYW1lLFxuICAgICAgLy8gZGVmZXIgc3RhcnRpbmcgYW4gaW50ZXJydXB0aW5nIHRyYW5zaXRpb24gdW50aWwgdGhhdCB0cmFuc2l0aW9uIGhhcyBhXG4gICAgICAvLyBjaGFuY2UgdG8gdGljayAoYW5kIHBvc3NpYmx5IGVuZCk7IHNlZSBkMy9kMy10cmFuc2l0aW9uIzU0IVxuICAgICAgaWYgKG8uc3RhdGUgPT09IFNUQVJURUQpIHJldHVybiB0aW1lb3V0KHN0YXJ0KTtcblxuICAgICAgLy8gSW50ZXJydXB0IHRoZSBhY3RpdmUgdHJhbnNpdGlvbiwgaWYgYW55LlxuICAgICAgLy8gRGlzcGF0Y2ggdGhlIGludGVycnVwdCBldmVudC5cbiAgICAgIGlmIChvLnN0YXRlID09PSBSVU5OSU5HKSB7XG4gICAgICAgIG8uc3RhdGUgPSBFTkRFRDtcbiAgICAgICAgby50aW1lci5zdG9wKCk7XG4gICAgICAgIG8ub24uY2FsbChcImludGVycnVwdFwiLCBub2RlLCBub2RlLl9fZGF0YV9fLCBvLmluZGV4LCBvLmdyb3VwKTtcbiAgICAgICAgZGVsZXRlIHNjaGVkdWxlc1tpXTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2FuY2VsIGFueSBwcmUtZW1wdGVkIHRyYW5zaXRpb25zLiBObyBpbnRlcnJ1cHQgZXZlbnQgaXMgZGlzcGF0Y2hlZFxuICAgICAgLy8gYmVjYXVzZSB0aGUgY2FuY2VsbGVkIHRyYW5zaXRpb25zIG5ldmVyIHN0YXJ0ZWQuIE5vdGUgdGhhdCB0aGlzIGFsc29cbiAgICAgIC8vIHJlbW92ZXMgdGhpcyB0cmFuc2l0aW9uIGZyb20gdGhlIHBlbmRpbmcgbGlzdCFcbiAgICAgIGVsc2UgaWYgKCtpIDwgaWQpIHtcbiAgICAgICAgby5zdGF0ZSA9IEVOREVEO1xuICAgICAgICBvLnRpbWVyLnN0b3AoKTtcbiAgICAgICAgZGVsZXRlIHNjaGVkdWxlc1tpXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWZlciB0aGUgZmlyc3QgdGljayB0byBlbmQgb2YgdGhlIGN1cnJlbnQgZnJhbWU7IHNlZSBkMy9kMyMxNTc2LlxuICAgIC8vIE5vdGUgdGhlIHRyYW5zaXRpb24gbWF5IGJlIGNhbmNlbGVkIGFmdGVyIHN0YXJ0IGFuZCBiZWZvcmUgdGhlIGZpcnN0IHRpY2shXG4gICAgLy8gTm90ZSB0aGlzIG11c3QgYmUgc2NoZWR1bGVkIGJlZm9yZSB0aGUgc3RhcnQgZXZlbnQ7IHNlZSBkMy9kMy10cmFuc2l0aW9uIzE2IVxuICAgIC8vIEFzc3VtaW5nIHRoaXMgaXMgc3VjY2Vzc2Z1bCwgc3Vic2VxdWVudCBjYWxsYmFja3MgZ28gc3RyYWlnaHQgdG8gdGljay5cbiAgICB0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHNlbGYuc3RhdGUgPT09IFNUQVJURUQpIHtcbiAgICAgICAgc2VsZi5zdGF0ZSA9IFJVTk5JTkc7XG4gICAgICAgIHNlbGYudGltZXIucmVzdGFydCh0aWNrLCBzZWxmLmRlbGF5LCBzZWxmLnRpbWUpO1xuICAgICAgICB0aWNrKGVsYXBzZWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gRGlzcGF0Y2ggdGhlIHN0YXJ0IGV2ZW50LlxuICAgIC8vIE5vdGUgdGhpcyBtdXN0IGJlIGRvbmUgYmVmb3JlIHRoZSB0d2VlbiBhcmUgaW5pdGlhbGl6ZWQuXG4gICAgc2VsZi5zdGF0ZSA9IFNUQVJUSU5HO1xuICAgIHNlbGYub24uY2FsbChcInN0YXJ0XCIsIG5vZGUsIG5vZGUuX19kYXRhX18sIHNlbGYuaW5kZXgsIHNlbGYuZ3JvdXApO1xuICAgIGlmIChzZWxmLnN0YXRlICE9PSBTVEFSVElORykgcmV0dXJuOyAvLyBpbnRlcnJ1cHRlZFxuICAgIHNlbGYuc3RhdGUgPSBTVEFSVEVEO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSB0aGUgdHdlZW4sIGRlbGV0aW5nIG51bGwgdHdlZW4uXG4gICAgdHdlZW4gPSBuZXcgQXJyYXkobiA9IHNlbGYudHdlZW4ubGVuZ3RoKTtcbiAgICBmb3IgKGkgPSAwLCBqID0gLTE7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChvID0gc2VsZi50d2VlbltpXS52YWx1ZS5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIHNlbGYuaW5kZXgsIHNlbGYuZ3JvdXApKSB7XG4gICAgICAgIHR3ZWVuWysral0gPSBvO1xuICAgICAgfVxuICAgIH1cbiAgICB0d2Vlbi5sZW5ndGggPSBqICsgMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpY2soZWxhcHNlZCkge1xuICAgIHZhciB0ID0gZWxhcHNlZCA8IHNlbGYuZHVyYXRpb24gPyBzZWxmLmVhc2UuY2FsbChudWxsLCBlbGFwc2VkIC8gc2VsZi5kdXJhdGlvbikgOiAoc2VsZi50aW1lci5yZXN0YXJ0KHN0b3ApLCBzZWxmLnN0YXRlID0gRU5ESU5HLCAxKSxcbiAgICAgICAgaSA9IC0xLFxuICAgICAgICBuID0gdHdlZW4ubGVuZ3RoO1xuXG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIHR3ZWVuW2ldLmNhbGwobnVsbCwgdCk7XG4gICAgfVxuXG4gICAgLy8gRGlzcGF0Y2ggdGhlIGVuZCBldmVudC5cbiAgICBpZiAoc2VsZi5zdGF0ZSA9PT0gRU5ESU5HKSB7XG4gICAgICBzZWxmLm9uLmNhbGwoXCJlbmRcIiwgbm9kZSwgbm9kZS5fX2RhdGFfXywgc2VsZi5pbmRleCwgc2VsZi5ncm91cCk7XG4gICAgICBzdG9wKCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc3RvcCgpIHtcbiAgICBzZWxmLnN0YXRlID0gRU5ERUQ7XG4gICAgc2VsZi50aW1lci5zdG9wKCk7XG4gICAgZGVsZXRlIHNjaGVkdWxlc1tpZF07XG4gICAgZm9yICh2YXIgaSBpbiBzY2hlZHVsZXMpIHJldHVybjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bnVzZWQtdmFyc1xuICAgIGRlbGV0ZSBub2RlLl9fdHJhbnNpdGlvbjtcbiAgfVxufVxuIiwiaW1wb3J0IHtTVEFSVElORywgRU5ESU5HLCBFTkRFRH0gZnJvbSBcIi4vdHJhbnNpdGlvbi9zY2hlZHVsZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihub2RlLCBuYW1lKSB7XG4gIHZhciBzY2hlZHVsZXMgPSBub2RlLl9fdHJhbnNpdGlvbixcbiAgICAgIHNjaGVkdWxlLFxuICAgICAgYWN0aXZlLFxuICAgICAgZW1wdHkgPSB0cnVlLFxuICAgICAgaTtcblxuICBpZiAoIXNjaGVkdWxlcykgcmV0dXJuO1xuXG4gIG5hbWUgPSBuYW1lID09IG51bGwgPyBudWxsIDogbmFtZSArIFwiXCI7XG5cbiAgZm9yIChpIGluIHNjaGVkdWxlcykge1xuICAgIGlmICgoc2NoZWR1bGUgPSBzY2hlZHVsZXNbaV0pLm5hbWUgIT09IG5hbWUpIHsgZW1wdHkgPSBmYWxzZTsgY29udGludWU7IH1cbiAgICBhY3RpdmUgPSBzY2hlZHVsZS5zdGF0ZSA+IFNUQVJUSU5HICYmIHNjaGVkdWxlLnN0YXRlIDwgRU5ESU5HO1xuICAgIHNjaGVkdWxlLnN0YXRlID0gRU5ERUQ7XG4gICAgc2NoZWR1bGUudGltZXIuc3RvcCgpO1xuICAgIGlmIChhY3RpdmUpIHNjaGVkdWxlLm9uLmNhbGwoXCJpbnRlcnJ1cHRcIiwgbm9kZSwgbm9kZS5fX2RhdGFfXywgc2NoZWR1bGUuaW5kZXgsIHNjaGVkdWxlLmdyb3VwKTtcbiAgICBkZWxldGUgc2NoZWR1bGVzW2ldO1xuICB9XG5cbiAgaWYgKGVtcHR5KSBkZWxldGUgbm9kZS5fX3RyYW5zaXRpb247XG59XG4iLCJpbXBvcnQgaW50ZXJydXB0IGZyb20gXCIuLi9pbnRlcnJ1cHRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSkge1xuICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgIGludGVycnVwdCh0aGlzLCBuYW1lKTtcbiAgfSk7XG59XG4iLCJpbXBvcnQge2dldCwgc2V0fSBmcm9tIFwiLi9zY2hlZHVsZVwiO1xuXG5mdW5jdGlvbiB0d2VlblJlbW92ZShpZCwgbmFtZSkge1xuICB2YXIgdHdlZW4wLCB0d2VlbjE7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NoZWR1bGUgPSBzZXQodGhpcywgaWQpLFxuICAgICAgICB0d2VlbiA9IHNjaGVkdWxlLnR3ZWVuO1xuXG4gICAgLy8gSWYgdGhpcyBub2RlIHNoYXJlZCB0d2VlbiB3aXRoIHRoZSBwcmV2aW91cyBub2RlLFxuICAgIC8vIGp1c3QgYXNzaWduIHRoZSB1cGRhdGVkIHNoYXJlZCB0d2VlbiBhbmQgd2XigJlyZSBkb25lIVxuICAgIC8vIE90aGVyd2lzZSwgY29weS1vbi13cml0ZS5cbiAgICBpZiAodHdlZW4gIT09IHR3ZWVuMCkge1xuICAgICAgdHdlZW4xID0gdHdlZW4wID0gdHdlZW47XG4gICAgICBmb3IgKHZhciBpID0gMCwgbiA9IHR3ZWVuMS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgICAgaWYgKHR3ZWVuMVtpXS5uYW1lID09PSBuYW1lKSB7XG4gICAgICAgICAgdHdlZW4xID0gdHdlZW4xLnNsaWNlKCk7XG4gICAgICAgICAgdHdlZW4xLnNwbGljZShpLCAxKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHNjaGVkdWxlLnR3ZWVuID0gdHdlZW4xO1xuICB9O1xufVxuXG5mdW5jdGlvbiB0d2VlbkZ1bmN0aW9uKGlkLCBuYW1lLCB2YWx1ZSkge1xuICB2YXIgdHdlZW4wLCB0d2VlbjE7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IEVycm9yO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjaGVkdWxlID0gc2V0KHRoaXMsIGlkKSxcbiAgICAgICAgdHdlZW4gPSBzY2hlZHVsZS50d2VlbjtcblxuICAgIC8vIElmIHRoaXMgbm9kZSBzaGFyZWQgdHdlZW4gd2l0aCB0aGUgcHJldmlvdXMgbm9kZSxcbiAgICAvLyBqdXN0IGFzc2lnbiB0aGUgdXBkYXRlZCBzaGFyZWQgdHdlZW4gYW5kIHdl4oCZcmUgZG9uZSFcbiAgICAvLyBPdGhlcndpc2UsIGNvcHktb24td3JpdGUuXG4gICAgaWYgKHR3ZWVuICE9PSB0d2VlbjApIHtcbiAgICAgIHR3ZWVuMSA9ICh0d2VlbjAgPSB0d2Vlbikuc2xpY2UoKTtcbiAgICAgIGZvciAodmFyIHQgPSB7bmFtZTogbmFtZSwgdmFsdWU6IHZhbHVlfSwgaSA9IDAsIG4gPSB0d2VlbjEubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICAgIGlmICh0d2VlbjFbaV0ubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgIHR3ZWVuMVtpXSA9IHQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChpID09PSBuKSB0d2VlbjEucHVzaCh0KTtcbiAgICB9XG5cbiAgICBzY2hlZHVsZS50d2VlbiA9IHR3ZWVuMTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIGlkID0gdGhpcy5faWQ7XG5cbiAgbmFtZSArPSBcIlwiO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHZhciB0d2VlbiA9IGdldCh0aGlzLm5vZGUoKSwgaWQpLnR3ZWVuO1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gdHdlZW4ubGVuZ3RoLCB0OyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKHQgPSB0d2VlbltpXSkubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICByZXR1cm4gdC52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsID8gdHdlZW5SZW1vdmUgOiB0d2VlbkZ1bmN0aW9uKShpZCwgbmFtZSwgdmFsdWUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR3ZWVuVmFsdWUodHJhbnNpdGlvbiwgbmFtZSwgdmFsdWUpIHtcbiAgdmFyIGlkID0gdHJhbnNpdGlvbi5faWQ7XG5cbiAgdHJhbnNpdGlvbi5lYWNoKGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY2hlZHVsZSA9IHNldCh0aGlzLCBpZCk7XG4gICAgKHNjaGVkdWxlLnZhbHVlIHx8IChzY2hlZHVsZS52YWx1ZSA9IHt9KSlbbmFtZV0gPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24obm9kZSkge1xuICAgIHJldHVybiBnZXQobm9kZSwgaWQpLnZhbHVlW25hbWVdO1xuICB9O1xufVxuIiwiaW1wb3J0IHtjb2xvcn0gZnJvbSBcImQzLWNvbG9yXCI7XG5pbXBvcnQge2ludGVycG9sYXRlTnVtYmVyLCBpbnRlcnBvbGF0ZVJnYiwgaW50ZXJwb2xhdGVTdHJpbmd9IGZyb20gXCJkMy1pbnRlcnBvbGF0ZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciBjO1xuICByZXR1cm4gKHR5cGVvZiBiID09PSBcIm51bWJlclwiID8gaW50ZXJwb2xhdGVOdW1iZXJcbiAgICAgIDogYiBpbnN0YW5jZW9mIGNvbG9yID8gaW50ZXJwb2xhdGVSZ2JcbiAgICAgIDogKGMgPSBjb2xvcihiKSkgPyAoYiA9IGMsIGludGVycG9sYXRlUmdiKVxuICAgICAgOiBpbnRlcnBvbGF0ZVN0cmluZykoYSwgYik7XG59XG4iLCJpbXBvcnQge2ludGVycG9sYXRlVHJhbnNmb3JtU3ZnIGFzIGludGVycG9sYXRlVHJhbnNmb3JtfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcbmltcG9ydCB7bmFtZXNwYWNlfSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQge3R3ZWVuVmFsdWV9IGZyb20gXCIuL3R3ZWVuXCI7XG5pbXBvcnQgaW50ZXJwb2xhdGUgZnJvbSBcIi4vaW50ZXJwb2xhdGVcIjtcblxuZnVuY3Rpb24gYXR0clJlbW92ZShuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0clJlbW92ZU5TKGZ1bGxuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJDb25zdGFudChuYW1lLCBpbnRlcnBvbGF0ZSwgdmFsdWUxKSB7XG4gIHZhciB2YWx1ZTAwLFxuICAgICAgaW50ZXJwb2xhdGUwO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlMCA9IHRoaXMuZ2V0QXR0cmlidXRlKG5hbWUpO1xuICAgIHJldHVybiB2YWx1ZTAgPT09IHZhbHVlMSA/IG51bGxcbiAgICAgICAgOiB2YWx1ZTAgPT09IHZhbHVlMDAgPyBpbnRlcnBvbGF0ZTBcbiAgICAgICAgOiBpbnRlcnBvbGF0ZTAgPSBpbnRlcnBvbGF0ZSh2YWx1ZTAwID0gdmFsdWUwLCB2YWx1ZTEpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyQ29uc3RhbnROUyhmdWxsbmFtZSwgaW50ZXJwb2xhdGUsIHZhbHVlMSkge1xuICB2YXIgdmFsdWUwMCxcbiAgICAgIGludGVycG9sYXRlMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZTAgPSB0aGlzLmdldEF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gICAgcmV0dXJuIHZhbHVlMCA9PT0gdmFsdWUxID8gbnVsbFxuICAgICAgICA6IHZhbHVlMCA9PT0gdmFsdWUwMCA/IGludGVycG9sYXRlMFxuICAgICAgICA6IGludGVycG9sYXRlMCA9IGludGVycG9sYXRlKHZhbHVlMDAgPSB2YWx1ZTAsIHZhbHVlMSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbihuYW1lLCBpbnRlcnBvbGF0ZSwgdmFsdWUpIHtcbiAgdmFyIHZhbHVlMDAsXG4gICAgICB2YWx1ZTEwLFxuICAgICAgaW50ZXJwb2xhdGUwO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlMCwgdmFsdWUxID0gdmFsdWUodGhpcyk7XG4gICAgaWYgKHZhbHVlMSA9PSBudWxsKSByZXR1cm4gdm9pZCB0aGlzLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICB2YWx1ZTAgPSB0aGlzLmdldEF0dHJpYnV0ZShuYW1lKTtcbiAgICByZXR1cm4gdmFsdWUwID09PSB2YWx1ZTEgPyBudWxsXG4gICAgICAgIDogdmFsdWUwID09PSB2YWx1ZTAwICYmIHZhbHVlMSA9PT0gdmFsdWUxMCA/IGludGVycG9sYXRlMFxuICAgICAgICA6IGludGVycG9sYXRlMCA9IGludGVycG9sYXRlKHZhbHVlMDAgPSB2YWx1ZTAsIHZhbHVlMTAgPSB2YWx1ZTEpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyRnVuY3Rpb25OUyhmdWxsbmFtZSwgaW50ZXJwb2xhdGUsIHZhbHVlKSB7XG4gIHZhciB2YWx1ZTAwLFxuICAgICAgdmFsdWUxMCxcbiAgICAgIGludGVycG9sYXRlMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZTAsIHZhbHVlMSA9IHZhbHVlKHRoaXMpO1xuICAgIGlmICh2YWx1ZTEgPT0gbnVsbCkgcmV0dXJuIHZvaWQgdGhpcy5yZW1vdmVBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICAgIHZhbHVlMCA9IHRoaXMuZ2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgICByZXR1cm4gdmFsdWUwID09PSB2YWx1ZTEgPyBudWxsXG4gICAgICAgIDogdmFsdWUwID09PSB2YWx1ZTAwICYmIHZhbHVlMSA9PT0gdmFsdWUxMCA/IGludGVycG9sYXRlMFxuICAgICAgICA6IGludGVycG9sYXRlMCA9IGludGVycG9sYXRlKHZhbHVlMDAgPSB2YWx1ZTAsIHZhbHVlMTAgPSB2YWx1ZTEpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB2YXIgZnVsbG5hbWUgPSBuYW1lc3BhY2UobmFtZSksIGkgPSBmdWxsbmFtZSA9PT0gXCJ0cmFuc2Zvcm1cIiA/IGludGVycG9sYXRlVHJhbnNmb3JtIDogaW50ZXJwb2xhdGU7XG4gIHJldHVybiB0aGlzLmF0dHJUd2VlbihuYW1lLCB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyRnVuY3Rpb25OUyA6IGF0dHJGdW5jdGlvbikoZnVsbG5hbWUsIGksIHR3ZWVuVmFsdWUodGhpcywgXCJhdHRyLlwiICsgbmFtZSwgdmFsdWUpKVxuICAgICAgOiB2YWx1ZSA9PSBudWxsID8gKGZ1bGxuYW1lLmxvY2FsID8gYXR0clJlbW92ZU5TIDogYXR0clJlbW92ZSkoZnVsbG5hbWUpXG4gICAgICA6IChmdWxsbmFtZS5sb2NhbCA/IGF0dHJDb25zdGFudE5TIDogYXR0ckNvbnN0YW50KShmdWxsbmFtZSwgaSwgdmFsdWUgKyBcIlwiKSk7XG59XG4iLCJpbXBvcnQge25hbWVzcGFjZX0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuXG5mdW5jdGlvbiBhdHRyVHdlZW5OUyhmdWxsbmFtZSwgdmFsdWUpIHtcbiAgZnVuY3Rpb24gdHdlZW4oKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLCBpID0gdmFsdWUuYXBwbHkobm9kZSwgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gaSAmJiBmdW5jdGlvbih0KSB7XG4gICAgICBub2RlLnNldEF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCwgaSh0KSk7XG4gICAgfTtcbiAgfVxuICB0d2Vlbi5fdmFsdWUgPSB2YWx1ZTtcbiAgcmV0dXJuIHR3ZWVuO1xufVxuXG5mdW5jdGlvbiBhdHRyVHdlZW4obmFtZSwgdmFsdWUpIHtcbiAgZnVuY3Rpb24gdHdlZW4oKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLCBpID0gdmFsdWUuYXBwbHkobm9kZSwgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gaSAmJiBmdW5jdGlvbih0KSB7XG4gICAgICBub2RlLnNldEF0dHJpYnV0ZShuYW1lLCBpKHQpKTtcbiAgICB9O1xuICB9XG4gIHR3ZWVuLl92YWx1ZSA9IHZhbHVlO1xuICByZXR1cm4gdHdlZW47XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHZhciBrZXkgPSBcImF0dHIuXCIgKyBuYW1lO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHJldHVybiAoa2V5ID0gdGhpcy50d2VlbihrZXkpKSAmJiBrZXkuX3ZhbHVlO1xuICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIHRoaXMudHdlZW4oa2V5LCBudWxsKTtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgRXJyb3I7XG4gIHZhciBmdWxsbmFtZSA9IG5hbWVzcGFjZShuYW1lKTtcbiAgcmV0dXJuIHRoaXMudHdlZW4oa2V5LCAoZnVsbG5hbWUubG9jYWwgPyBhdHRyVHdlZW5OUyA6IGF0dHJUd2VlbikoZnVsbG5hbWUsIHZhbHVlKSk7XG59XG4iLCJpbXBvcnQge2dldCwgaW5pdH0gZnJvbSBcIi4vc2NoZWR1bGVcIjtcblxuZnVuY3Rpb24gZGVsYXlGdW5jdGlvbihpZCwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGluaXQodGhpcywgaWQpLmRlbGF5ID0gK3ZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGRlbGF5Q29uc3RhbnQoaWQsIHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9ICt2YWx1ZSwgZnVuY3Rpb24oKSB7XG4gICAgaW5pdCh0aGlzLCBpZCkuZGVsYXkgPSB2YWx1ZTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIGlkID0gdGhpcy5faWQ7XG5cbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5lYWNoKCh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICAgID8gZGVsYXlGdW5jdGlvblxuICAgICAgICAgIDogZGVsYXlDb25zdGFudCkoaWQsIHZhbHVlKSlcbiAgICAgIDogZ2V0KHRoaXMubm9kZSgpLCBpZCkuZGVsYXk7XG59XG4iLCJpbXBvcnQge2dldCwgc2V0fSBmcm9tIFwiLi9zY2hlZHVsZVwiO1xuXG5mdW5jdGlvbiBkdXJhdGlvbkZ1bmN0aW9uKGlkLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgc2V0KHRoaXMsIGlkKS5kdXJhdGlvbiA9ICt2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBkdXJhdGlvbkNvbnN0YW50KGlkLCB2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPSArdmFsdWUsIGZ1bmN0aW9uKCkge1xuICAgIHNldCh0aGlzLCBpZCkuZHVyYXRpb24gPSB2YWx1ZTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIGlkID0gdGhpcy5faWQ7XG5cbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5lYWNoKCh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICAgID8gZHVyYXRpb25GdW5jdGlvblxuICAgICAgICAgIDogZHVyYXRpb25Db25zdGFudCkoaWQsIHZhbHVlKSlcbiAgICAgIDogZ2V0KHRoaXMubm9kZSgpLCBpZCkuZHVyYXRpb247XG59XG4iLCJpbXBvcnQge2dldCwgc2V0fSBmcm9tIFwiLi9zY2hlZHVsZVwiO1xuXG5mdW5jdGlvbiBlYXNlQ29uc3RhbnQoaWQsIHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IEVycm9yO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgc2V0KHRoaXMsIGlkKS5lYXNlID0gdmFsdWU7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBpZCA9IHRoaXMuX2lkO1xuXG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaChlYXNlQ29uc3RhbnQoaWQsIHZhbHVlKSlcbiAgICAgIDogZ2V0KHRoaXMubm9kZSgpLCBpZCkuZWFzZTtcbn1cbiIsImltcG9ydCB7bWF0Y2hlcn0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHtUcmFuc2l0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihtYXRjaCkge1xuICBpZiAodHlwZW9mIG1hdGNoICE9PSBcImZ1bmN0aW9uXCIpIG1hdGNoID0gbWF0Y2hlcihtYXRjaCk7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgc3ViZ3JvdXBzID0gbmV3IEFycmF5KG0pLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBzdWJncm91cCA9IHN1Ymdyb3Vwc1tqXSA9IFtdLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIG1hdGNoLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApKSB7XG4gICAgICAgIHN1Ymdyb3VwLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBUcmFuc2l0aW9uKHN1Ymdyb3VwcywgdGhpcy5fcGFyZW50cywgdGhpcy5fbmFtZSwgdGhpcy5faWQpO1xufVxuIiwiaW1wb3J0IHtUcmFuc2l0aW9ufSBmcm9tIFwiLi9pbmRleFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih0cmFuc2l0aW9uKSB7XG4gIGlmICh0cmFuc2l0aW9uLl9pZCAhPT0gdGhpcy5faWQpIHRocm93IG5ldyBFcnJvcjtcblxuICBmb3IgKHZhciBncm91cHMwID0gdGhpcy5fZ3JvdXBzLCBncm91cHMxID0gdHJhbnNpdGlvbi5fZ3JvdXBzLCBtMCA9IGdyb3VwczAubGVuZ3RoLCBtMSA9IGdyb3VwczEubGVuZ3RoLCBtID0gTWF0aC5taW4obTAsIG0xKSwgbWVyZ2VzID0gbmV3IEFycmF5KG0wKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cDAgPSBncm91cHMwW2pdLCBncm91cDEgPSBncm91cHMxW2pdLCBuID0gZ3JvdXAwLmxlbmd0aCwgbWVyZ2UgPSBtZXJnZXNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwMFtpXSB8fCBncm91cDFbaV0pIHtcbiAgICAgICAgbWVyZ2VbaV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBqIDwgbTA7ICsraikge1xuICAgIG1lcmdlc1tqXSA9IGdyb3VwczBbal07XG4gIH1cblxuICByZXR1cm4gbmV3IFRyYW5zaXRpb24obWVyZ2VzLCB0aGlzLl9wYXJlbnRzLCB0aGlzLl9uYW1lLCB0aGlzLl9pZCk7XG59XG4iLCJpbXBvcnQge2dldCwgc2V0LCBpbml0fSBmcm9tIFwiLi9zY2hlZHVsZVwiO1xuXG5mdW5jdGlvbiBzdGFydChuYW1lKSB7XG4gIHJldHVybiAobmFtZSArIFwiXCIpLnRyaW0oKS5zcGxpdCgvXnxcXHMrLykuZXZlcnkoZnVuY3Rpb24odCkge1xuICAgIHZhciBpID0gdC5pbmRleE9mKFwiLlwiKTtcbiAgICBpZiAoaSA+PSAwKSB0ID0gdC5zbGljZSgwLCBpKTtcbiAgICByZXR1cm4gIXQgfHwgdCA9PT0gXCJzdGFydFwiO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gb25GdW5jdGlvbihpZCwgbmFtZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG9uMCwgb24xLCBzaXQgPSBzdGFydChuYW1lKSA/IGluaXQgOiBzZXQ7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NoZWR1bGUgPSBzaXQodGhpcywgaWQpLFxuICAgICAgICBvbiA9IHNjaGVkdWxlLm9uO1xuXG4gICAgLy8gSWYgdGhpcyBub2RlIHNoYXJlZCBhIGRpc3BhdGNoIHdpdGggdGhlIHByZXZpb3VzIG5vZGUsXG4gICAgLy8ganVzdCBhc3NpZ24gdGhlIHVwZGF0ZWQgc2hhcmVkIGRpc3BhdGNoIGFuZCB3ZeKAmXJlIGRvbmUhXG4gICAgLy8gT3RoZXJ3aXNlLCBjb3B5LW9uLXdyaXRlLlxuICAgIGlmIChvbiAhPT0gb24wKSAob24xID0gKG9uMCA9IG9uKS5jb3B5KCkpLm9uKG5hbWUsIGxpc3RlbmVyKTtcblxuICAgIHNjaGVkdWxlLm9uID0gb24xO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCBsaXN0ZW5lcikge1xuICB2YXIgaWQgPSB0aGlzLl9pZDtcblxuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA8IDJcbiAgICAgID8gZ2V0KHRoaXMubm9kZSgpLCBpZCkub24ub24obmFtZSlcbiAgICAgIDogdGhpcy5lYWNoKG9uRnVuY3Rpb24oaWQsIG5hbWUsIGxpc3RlbmVyKSk7XG59XG4iLCJmdW5jdGlvbiByZW1vdmVGdW5jdGlvbihpZCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50Tm9kZTtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMuX190cmFuc2l0aW9uKSBpZiAoK2kgIT09IGlkKSByZXR1cm47XG4gICAgaWYgKHBhcmVudCkgcGFyZW50LnJlbW92ZUNoaWxkKHRoaXMpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMub24oXCJlbmQucmVtb3ZlXCIsIHJlbW92ZUZ1bmN0aW9uKHRoaXMuX2lkKSk7XG59XG4iLCJpbXBvcnQge3NlbGVjdG9yfSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQge1RyYW5zaXRpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgc2NoZWR1bGUsIHtnZXR9IGZyb20gXCIuL3NjaGVkdWxlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdCkge1xuICB2YXIgbmFtZSA9IHRoaXMuX25hbWUsXG4gICAgICBpZCA9IHRoaXMuX2lkO1xuXG4gIGlmICh0eXBlb2Ygc2VsZWN0ICE9PSBcImZ1bmN0aW9uXCIpIHNlbGVjdCA9IHNlbGVjdG9yKHNlbGVjdCk7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgc3ViZ3JvdXBzID0gbmV3IEFycmF5KG0pLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBzdWJncm91cCA9IHN1Ymdyb3Vwc1tqXSA9IG5ldyBBcnJheShuKSwgbm9kZSwgc3Vibm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmICgobm9kZSA9IGdyb3VwW2ldKSAmJiAoc3Vibm9kZSA9IHNlbGVjdC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSkpIHtcbiAgICAgICAgaWYgKFwiX19kYXRhX19cIiBpbiBub2RlKSBzdWJub2RlLl9fZGF0YV9fID0gbm9kZS5fX2RhdGFfXztcbiAgICAgICAgc3ViZ3JvdXBbaV0gPSBzdWJub2RlO1xuICAgICAgICBzY2hlZHVsZShzdWJncm91cFtpXSwgbmFtZSwgaWQsIGksIHN1Ymdyb3VwLCBnZXQobm9kZSwgaWQpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFRyYW5zaXRpb24oc3ViZ3JvdXBzLCB0aGlzLl9wYXJlbnRzLCBuYW1lLCBpZCk7XG59XG4iLCJpbXBvcnQge3NlbGVjdG9yQWxsfSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQge1RyYW5zaXRpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgc2NoZWR1bGUsIHtnZXR9IGZyb20gXCIuL3NjaGVkdWxlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdCkge1xuICB2YXIgbmFtZSA9IHRoaXMuX25hbWUsXG4gICAgICBpZCA9IHRoaXMuX2lkO1xuXG4gIGlmICh0eXBlb2Ygc2VsZWN0ICE9PSBcImZ1bmN0aW9uXCIpIHNlbGVjdCA9IHNlbGVjdG9yQWxsKHNlbGVjdCk7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgc3ViZ3JvdXBzID0gW10sIHBhcmVudHMgPSBbXSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgICAgZm9yICh2YXIgY2hpbGRyZW4gPSBzZWxlY3QuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCksIGNoaWxkLCBpbmhlcml0ID0gZ2V0KG5vZGUsIGlkKSwgayA9IDAsIGwgPSBjaGlsZHJlbi5sZW5ndGg7IGsgPCBsOyArK2spIHtcbiAgICAgICAgICBpZiAoY2hpbGQgPSBjaGlsZHJlbltrXSkge1xuICAgICAgICAgICAgc2NoZWR1bGUoY2hpbGQsIG5hbWUsIGlkLCBrLCBjaGlsZHJlbiwgaW5oZXJpdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN1Ymdyb3Vwcy5wdXNoKGNoaWxkcmVuKTtcbiAgICAgICAgcGFyZW50cy5wdXNoKG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgVHJhbnNpdGlvbihzdWJncm91cHMsIHBhcmVudHMsIG5hbWUsIGlkKTtcbn1cbiIsImltcG9ydCB7c2VsZWN0aW9ufSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5cbnZhciBTZWxlY3Rpb24gPSBzZWxlY3Rpb24ucHJvdG90eXBlLmNvbnN0cnVjdG9yO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5fZ3JvdXBzLCB0aGlzLl9wYXJlbnRzKTtcbn1cbiIsImltcG9ydCB7aW50ZXJwb2xhdGVUcmFuc2Zvcm1Dc3MgYXMgaW50ZXJwb2xhdGVUcmFuc2Zvcm19IGZyb20gXCJkMy1pbnRlcnBvbGF0ZVwiO1xuaW1wb3J0IHtzdHlsZX0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHt0d2VlblZhbHVlfSBmcm9tIFwiLi90d2VlblwiO1xuaW1wb3J0IGludGVycG9sYXRlIGZyb20gXCIuL2ludGVycG9sYXRlXCI7XG5cbmZ1bmN0aW9uIHN0eWxlUmVtb3ZlKG5hbWUsIGludGVycG9sYXRlKSB7XG4gIHZhciB2YWx1ZTAwLFxuICAgICAgdmFsdWUxMCxcbiAgICAgIGludGVycG9sYXRlMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZTAgPSBzdHlsZSh0aGlzLCBuYW1lKSxcbiAgICAgICAgdmFsdWUxID0gKHRoaXMuc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSksIHN0eWxlKHRoaXMsIG5hbWUpKTtcbiAgICByZXR1cm4gdmFsdWUwID09PSB2YWx1ZTEgPyBudWxsXG4gICAgICAgIDogdmFsdWUwID09PSB2YWx1ZTAwICYmIHZhbHVlMSA9PT0gdmFsdWUxMCA/IGludGVycG9sYXRlMFxuICAgICAgICA6IGludGVycG9sYXRlMCA9IGludGVycG9sYXRlKHZhbHVlMDAgPSB2YWx1ZTAsIHZhbHVlMTAgPSB2YWx1ZTEpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzdHlsZVJlbW92ZUVuZChuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzdHlsZUNvbnN0YW50KG5hbWUsIGludGVycG9sYXRlLCB2YWx1ZTEpIHtcbiAgdmFyIHZhbHVlMDAsXG4gICAgICBpbnRlcnBvbGF0ZTA7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUwID0gc3R5bGUodGhpcywgbmFtZSk7XG4gICAgcmV0dXJuIHZhbHVlMCA9PT0gdmFsdWUxID8gbnVsbFxuICAgICAgICA6IHZhbHVlMCA9PT0gdmFsdWUwMCA/IGludGVycG9sYXRlMFxuICAgICAgICA6IGludGVycG9sYXRlMCA9IGludGVycG9sYXRlKHZhbHVlMDAgPSB2YWx1ZTAsIHZhbHVlMSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHN0eWxlRnVuY3Rpb24obmFtZSwgaW50ZXJwb2xhdGUsIHZhbHVlKSB7XG4gIHZhciB2YWx1ZTAwLFxuICAgICAgdmFsdWUxMCxcbiAgICAgIGludGVycG9sYXRlMDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZTAgPSBzdHlsZSh0aGlzLCBuYW1lKSxcbiAgICAgICAgdmFsdWUxID0gdmFsdWUodGhpcyk7XG4gICAgaWYgKHZhbHVlMSA9PSBudWxsKSB2YWx1ZTEgPSAodGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKSwgc3R5bGUodGhpcywgbmFtZSkpO1xuICAgIHJldHVybiB2YWx1ZTAgPT09IHZhbHVlMSA/IG51bGxcbiAgICAgICAgOiB2YWx1ZTAgPT09IHZhbHVlMDAgJiYgdmFsdWUxID09PSB2YWx1ZTEwID8gaW50ZXJwb2xhdGUwXG4gICAgICAgIDogaW50ZXJwb2xhdGUwID0gaW50ZXJwb2xhdGUodmFsdWUwMCA9IHZhbHVlMCwgdmFsdWUxMCA9IHZhbHVlMSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICB2YXIgaSA9IChuYW1lICs9IFwiXCIpID09PSBcInRyYW5zZm9ybVwiID8gaW50ZXJwb2xhdGVUcmFuc2Zvcm0gOiBpbnRlcnBvbGF0ZTtcbiAgcmV0dXJuIHZhbHVlID09IG51bGwgPyB0aGlzXG4gICAgICAgICAgLnN0eWxlVHdlZW4obmFtZSwgc3R5bGVSZW1vdmUobmFtZSwgaSkpXG4gICAgICAgICAgLm9uKFwiZW5kLnN0eWxlLlwiICsgbmFtZSwgc3R5bGVSZW1vdmVFbmQobmFtZSkpXG4gICAgICA6IHRoaXMuc3R5bGVUd2VlbihuYW1lLCB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICAgID8gc3R5bGVGdW5jdGlvbihuYW1lLCBpLCB0d2VlblZhbHVlKHRoaXMsIFwic3R5bGUuXCIgKyBuYW1lLCB2YWx1ZSkpXG4gICAgICAgICAgOiBzdHlsZUNvbnN0YW50KG5hbWUsIGksIHZhbHVlICsgXCJcIiksIHByaW9yaXR5KTtcbn1cbiIsImZ1bmN0aW9uIHN0eWxlVHdlZW4obmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIGZ1bmN0aW9uIHR3ZWVuKCkge1xuICAgIHZhciBub2RlID0gdGhpcywgaSA9IHZhbHVlLmFwcGx5KG5vZGUsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIGkgJiYgZnVuY3Rpb24odCkge1xuICAgICAgbm9kZS5zdHlsZS5zZXRQcm9wZXJ0eShuYW1lLCBpKHQpLCBwcmlvcml0eSk7XG4gICAgfTtcbiAgfVxuICB0d2Vlbi5fdmFsdWUgPSB2YWx1ZTtcbiAgcmV0dXJuIHR3ZWVuO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgdmFyIGtleSA9IFwic3R5bGUuXCIgKyAobmFtZSArPSBcIlwiKTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSByZXR1cm4gKGtleSA9IHRoaXMudHdlZW4oa2V5KSkgJiYga2V5Ll92YWx1ZTtcbiAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiB0aGlzLnR3ZWVuKGtleSwgbnVsbCk7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IEVycm9yO1xuICByZXR1cm4gdGhpcy50d2VlbihrZXksIHN0eWxlVHdlZW4obmFtZSwgdmFsdWUsIHByaW9yaXR5ID09IG51bGwgPyBcIlwiIDogcHJpb3JpdHkpKTtcbn1cbiIsImltcG9ydCB7dHdlZW5WYWx1ZX0gZnJvbSBcIi4vdHdlZW5cIjtcblxuZnVuY3Rpb24gdGV4dENvbnN0YW50KHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRleHRGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlMSA9IHZhbHVlKHRoaXMpO1xuICAgIHRoaXMudGV4dENvbnRlbnQgPSB2YWx1ZTEgPT0gbnVsbCA/IFwiXCIgOiB2YWx1ZTE7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0aGlzLnR3ZWVuKFwidGV4dFwiLCB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgPyB0ZXh0RnVuY3Rpb24odHdlZW5WYWx1ZSh0aGlzLCBcInRleHRcIiwgdmFsdWUpKVxuICAgICAgOiB0ZXh0Q29uc3RhbnQodmFsdWUgPT0gbnVsbCA/IFwiXCIgOiB2YWx1ZSArIFwiXCIpKTtcbn1cbiIsImltcG9ydCB7VHJhbnNpdGlvbiwgbmV3SWR9IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgc2NoZWR1bGUsIHtnZXR9IGZyb20gXCIuL3NjaGVkdWxlXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgbmFtZSA9IHRoaXMuX25hbWUsXG4gICAgICBpZDAgPSB0aGlzLl9pZCxcbiAgICAgIGlkMSA9IG5ld0lkKCk7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgICAgdmFyIGluaGVyaXQgPSBnZXQobm9kZSwgaWQwKTtcbiAgICAgICAgc2NoZWR1bGUobm9kZSwgbmFtZSwgaWQxLCBpLCBncm91cCwge1xuICAgICAgICAgIHRpbWU6IGluaGVyaXQudGltZSArIGluaGVyaXQuZGVsYXkgKyBpbmhlcml0LmR1cmF0aW9uLFxuICAgICAgICAgIGRlbGF5OiAwLFxuICAgICAgICAgIGR1cmF0aW9uOiBpbmhlcml0LmR1cmF0aW9uLFxuICAgICAgICAgIGVhc2U6IGluaGVyaXQuZWFzZVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFRyYW5zaXRpb24oZ3JvdXBzLCB0aGlzLl9wYXJlbnRzLCBuYW1lLCBpZDEpO1xufVxuIiwiaW1wb3J0IHtzZWxlY3Rpb259IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB0cmFuc2l0aW9uX2F0dHIgZnJvbSBcIi4vYXR0clwiO1xuaW1wb3J0IHRyYW5zaXRpb25fYXR0clR3ZWVuIGZyb20gXCIuL2F0dHJUd2VlblwiO1xuaW1wb3J0IHRyYW5zaXRpb25fZGVsYXkgZnJvbSBcIi4vZGVsYXlcIjtcbmltcG9ydCB0cmFuc2l0aW9uX2R1cmF0aW9uIGZyb20gXCIuL2R1cmF0aW9uXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9lYXNlIGZyb20gXCIuL2Vhc2VcIjtcbmltcG9ydCB0cmFuc2l0aW9uX2ZpbHRlciBmcm9tIFwiLi9maWx0ZXJcIjtcbmltcG9ydCB0cmFuc2l0aW9uX21lcmdlIGZyb20gXCIuL21lcmdlXCI7XG5pbXBvcnQgdHJhbnNpdGlvbl9vbiBmcm9tIFwiLi9vblwiO1xuaW1wb3J0IHRyYW5zaXRpb25fcmVtb3ZlIGZyb20gXCIuL3JlbW92ZVwiO1xuaW1wb3J0IHRyYW5zaXRpb25fc2VsZWN0IGZyb20gXCIuL3NlbGVjdFwiO1xuaW1wb3J0IHRyYW5zaXRpb25fc2VsZWN0QWxsIGZyb20gXCIuL3NlbGVjdEFsbFwiO1xuaW1wb3J0IHRyYW5zaXRpb25fc2VsZWN0aW9uIGZyb20gXCIuL3NlbGVjdGlvblwiO1xuaW1wb3J0IHRyYW5zaXRpb25fc3R5bGUgZnJvbSBcIi4vc3R5bGVcIjtcbmltcG9ydCB0cmFuc2l0aW9uX3N0eWxlVHdlZW4gZnJvbSBcIi4vc3R5bGVUd2VlblwiO1xuaW1wb3J0IHRyYW5zaXRpb25fdGV4dCBmcm9tIFwiLi90ZXh0XCI7XG5pbXBvcnQgdHJhbnNpdGlvbl90cmFuc2l0aW9uIGZyb20gXCIuL3RyYW5zaXRpb25cIjtcbmltcG9ydCB0cmFuc2l0aW9uX3R3ZWVuIGZyb20gXCIuL3R3ZWVuXCI7XG5cbnZhciBpZCA9IDA7XG5cbmV4cG9ydCBmdW5jdGlvbiBUcmFuc2l0aW9uKGdyb3VwcywgcGFyZW50cywgbmFtZSwgaWQpIHtcbiAgdGhpcy5fZ3JvdXBzID0gZ3JvdXBzO1xuICB0aGlzLl9wYXJlbnRzID0gcGFyZW50cztcbiAgdGhpcy5fbmFtZSA9IG5hbWU7XG4gIHRoaXMuX2lkID0gaWQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRyYW5zaXRpb24obmFtZSkge1xuICByZXR1cm4gc2VsZWN0aW9uKCkudHJhbnNpdGlvbihuYW1lKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5ld0lkKCkge1xuICByZXR1cm4gKytpZDtcbn1cblxudmFyIHNlbGVjdGlvbl9wcm90b3R5cGUgPSBzZWxlY3Rpb24ucHJvdG90eXBlO1xuXG5UcmFuc2l0aW9uLnByb3RvdHlwZSA9IHRyYW5zaXRpb24ucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogVHJhbnNpdGlvbixcbiAgc2VsZWN0OiB0cmFuc2l0aW9uX3NlbGVjdCxcbiAgc2VsZWN0QWxsOiB0cmFuc2l0aW9uX3NlbGVjdEFsbCxcbiAgZmlsdGVyOiB0cmFuc2l0aW9uX2ZpbHRlcixcbiAgbWVyZ2U6IHRyYW5zaXRpb25fbWVyZ2UsXG4gIHNlbGVjdGlvbjogdHJhbnNpdGlvbl9zZWxlY3Rpb24sXG4gIHRyYW5zaXRpb246IHRyYW5zaXRpb25fdHJhbnNpdGlvbixcbiAgY2FsbDogc2VsZWN0aW9uX3Byb3RvdHlwZS5jYWxsLFxuICBub2Rlczogc2VsZWN0aW9uX3Byb3RvdHlwZS5ub2RlcyxcbiAgbm9kZTogc2VsZWN0aW9uX3Byb3RvdHlwZS5ub2RlLFxuICBzaXplOiBzZWxlY3Rpb25fcHJvdG90eXBlLnNpemUsXG4gIGVtcHR5OiBzZWxlY3Rpb25fcHJvdG90eXBlLmVtcHR5LFxuICBlYWNoOiBzZWxlY3Rpb25fcHJvdG90eXBlLmVhY2gsXG4gIG9uOiB0cmFuc2l0aW9uX29uLFxuICBhdHRyOiB0cmFuc2l0aW9uX2F0dHIsXG4gIGF0dHJUd2VlbjogdHJhbnNpdGlvbl9hdHRyVHdlZW4sXG4gIHN0eWxlOiB0cmFuc2l0aW9uX3N0eWxlLFxuICBzdHlsZVR3ZWVuOiB0cmFuc2l0aW9uX3N0eWxlVHdlZW4sXG4gIHRleHQ6IHRyYW5zaXRpb25fdGV4dCxcbiAgcmVtb3ZlOiB0cmFuc2l0aW9uX3JlbW92ZSxcbiAgdHdlZW46IHRyYW5zaXRpb25fdHdlZW4sXG4gIGRlbGF5OiB0cmFuc2l0aW9uX2RlbGF5LFxuICBkdXJhdGlvbjogdHJhbnNpdGlvbl9kdXJhdGlvbixcbiAgZWFzZTogdHJhbnNpdGlvbl9lYXNlXG59O1xuIiwiZXhwb3J0IGZ1bmN0aW9uIGN1YmljSW4odCkge1xuICByZXR1cm4gdCAqIHQgKiB0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3ViaWNPdXQodCkge1xuICByZXR1cm4gLS10ICogdCAqIHQgKyAxO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3ViaWNJbk91dCh0KSB7XG4gIHJldHVybiAoKHQgKj0gMikgPD0gMSA/IHQgKiB0ICogdCA6ICh0IC09IDIpICogdCAqIHQgKyAyKSAvIDI7XG59XG4iLCJ2YXIgcGkgPSBNYXRoLlBJLFxuICAgIGhhbGZQaSA9IHBpIC8gMjtcblxuZXhwb3J0IGZ1bmN0aW9uIHNpbkluKHQpIHtcbiAgcmV0dXJuIDEgLSBNYXRoLmNvcyh0ICogaGFsZlBpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbk91dCh0KSB7XG4gIHJldHVybiBNYXRoLnNpbih0ICogaGFsZlBpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbkluT3V0KHQpIHtcbiAgcmV0dXJuICgxIC0gTWF0aC5jb3MocGkgKiB0KSkgLyAyO1xufVxuIiwidmFyIHRhdSA9IDIgKiBNYXRoLlBJLFxuICAgIGFtcGxpdHVkZSA9IDEsXG4gICAgcGVyaW9kID0gMC4zO1xuXG5leHBvcnQgdmFyIGVsYXN0aWNJbiA9IChmdW5jdGlvbiBjdXN0b20oYSwgcCkge1xuICB2YXIgcyA9IE1hdGguYXNpbigxIC8gKGEgPSBNYXRoLm1heCgxLCBhKSkpICogKHAgLz0gdGF1KTtcblxuICBmdW5jdGlvbiBlbGFzdGljSW4odCkge1xuICAgIHJldHVybiBhICogTWF0aC5wb3coMiwgMTAgKiAtLXQpICogTWF0aC5zaW4oKHMgLSB0KSAvIHApO1xuICB9XG5cbiAgZWxhc3RpY0luLmFtcGxpdHVkZSA9IGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGN1c3RvbShhLCBwICogdGF1KTsgfTtcbiAgZWxhc3RpY0luLnBlcmlvZCA9IGZ1bmN0aW9uKHApIHsgcmV0dXJuIGN1c3RvbShhLCBwKTsgfTtcblxuICByZXR1cm4gZWxhc3RpY0luO1xufSkoYW1wbGl0dWRlLCBwZXJpb2QpO1xuXG5leHBvcnQgdmFyIGVsYXN0aWNPdXQgPSAoZnVuY3Rpb24gY3VzdG9tKGEsIHApIHtcbiAgdmFyIHMgPSBNYXRoLmFzaW4oMSAvIChhID0gTWF0aC5tYXgoMSwgYSkpKSAqIChwIC89IHRhdSk7XG5cbiAgZnVuY3Rpb24gZWxhc3RpY091dCh0KSB7XG4gICAgcmV0dXJuIDEgLSBhICogTWF0aC5wb3coMiwgLTEwICogKHQgPSArdCkpICogTWF0aC5zaW4oKHQgKyBzKSAvIHApO1xuICB9XG5cbiAgZWxhc3RpY091dC5hbXBsaXR1ZGUgPSBmdW5jdGlvbihhKSB7IHJldHVybiBjdXN0b20oYSwgcCAqIHRhdSk7IH07XG4gIGVsYXN0aWNPdXQucGVyaW9kID0gZnVuY3Rpb24ocCkgeyByZXR1cm4gY3VzdG9tKGEsIHApOyB9O1xuXG4gIHJldHVybiBlbGFzdGljT3V0O1xufSkoYW1wbGl0dWRlLCBwZXJpb2QpO1xuXG5leHBvcnQgdmFyIGVsYXN0aWNJbk91dCA9IChmdW5jdGlvbiBjdXN0b20oYSwgcCkge1xuICB2YXIgcyA9IE1hdGguYXNpbigxIC8gKGEgPSBNYXRoLm1heCgxLCBhKSkpICogKHAgLz0gdGF1KTtcblxuICBmdW5jdGlvbiBlbGFzdGljSW5PdXQodCkge1xuICAgIHJldHVybiAoKHQgPSB0ICogMiAtIDEpIDwgMFxuICAgICAgICA/IGEgKiBNYXRoLnBvdygyLCAxMCAqIHQpICogTWF0aC5zaW4oKHMgLSB0KSAvIHApXG4gICAgICAgIDogMiAtIGEgKiBNYXRoLnBvdygyLCAtMTAgKiB0KSAqIE1hdGguc2luKChzICsgdCkgLyBwKSkgLyAyO1xuICB9XG5cbiAgZWxhc3RpY0luT3V0LmFtcGxpdHVkZSA9IGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGN1c3RvbShhLCBwICogdGF1KTsgfTtcbiAgZWxhc3RpY0luT3V0LnBlcmlvZCA9IGZ1bmN0aW9uKHApIHsgcmV0dXJuIGN1c3RvbShhLCBwKTsgfTtcblxuICByZXR1cm4gZWxhc3RpY0luT3V0O1xufSkoYW1wbGl0dWRlLCBwZXJpb2QpO1xuIiwiaW1wb3J0IHtUcmFuc2l0aW9uLCBuZXdJZH0gZnJvbSBcIi4uL3RyYW5zaXRpb24vaW5kZXhcIjtcbmltcG9ydCBzY2hlZHVsZSBmcm9tIFwiLi4vdHJhbnNpdGlvbi9zY2hlZHVsZVwiO1xuaW1wb3J0IHtlYXNlQ3ViaWNJbk91dH0gZnJvbSBcImQzLWVhc2VcIjtcbmltcG9ydCB7bm93fSBmcm9tIFwiZDMtdGltZXJcIjtcblxudmFyIGRlZmF1bHRUaW1pbmcgPSB7XG4gIHRpbWU6IG51bGwsIC8vIFNldCBvbiB1c2UuXG4gIGRlbGF5OiAwLFxuICBkdXJhdGlvbjogMjUwLFxuICBlYXNlOiBlYXNlQ3ViaWNJbk91dFxufTtcblxuZnVuY3Rpb24gaW5oZXJpdChub2RlLCBpZCkge1xuICB2YXIgdGltaW5nO1xuICB3aGlsZSAoISh0aW1pbmcgPSBub2RlLl9fdHJhbnNpdGlvbikgfHwgISh0aW1pbmcgPSB0aW1pbmdbaWRdKSkge1xuICAgIGlmICghKG5vZGUgPSBub2RlLnBhcmVudE5vZGUpKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdFRpbWluZy50aW1lID0gbm93KCksIGRlZmF1bHRUaW1pbmc7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aW1pbmc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGlkLFxuICAgICAgdGltaW5nO1xuXG4gIGlmIChuYW1lIGluc3RhbmNlb2YgVHJhbnNpdGlvbikge1xuICAgIGlkID0gbmFtZS5faWQsIG5hbWUgPSBuYW1lLl9uYW1lO1xuICB9IGVsc2Uge1xuICAgIGlkID0gbmV3SWQoKSwgKHRpbWluZyA9IGRlZmF1bHRUaW1pbmcpLnRpbWUgPSBub3coKSwgbmFtZSA9IG5hbWUgPT0gbnVsbCA/IG51bGwgOiBuYW1lICsgXCJcIjtcbiAgfVxuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHNjaGVkdWxlKG5vZGUsIG5hbWUsIGlkLCBpLCBncm91cCwgdGltaW5nIHx8IGluaGVyaXQobm9kZSwgaWQpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFRyYW5zaXRpb24oZ3JvdXBzLCB0aGlzLl9wYXJlbnRzLCBuYW1lLCBpZCk7XG59XG4iLCJpbXBvcnQge3NlbGVjdGlvbn0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuaW1wb3J0IHNlbGVjdGlvbl9pbnRlcnJ1cHQgZnJvbSBcIi4vaW50ZXJydXB0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX3RyYW5zaXRpb24gZnJvbSBcIi4vdHJhbnNpdGlvblwiO1xuXG5zZWxlY3Rpb24ucHJvdG90eXBlLmludGVycnVwdCA9IHNlbGVjdGlvbl9pbnRlcnJ1cHQ7XG5zZWxlY3Rpb24ucHJvdG90eXBlLnRyYW5zaXRpb24gPSBzZWxlY3Rpb25fdHJhbnNpdGlvbjtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB4O1xuICB9O1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odGFyZ2V0LCB0eXBlLCBzZWxlY3Rpb24pIHtcbiAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gIHRoaXMudHlwZSA9IHR5cGU7XG4gIHRoaXMuc2VsZWN0aW9uID0gc2VsZWN0aW9uO1xufVxuIiwiaW1wb3J0IHtldmVudH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuXG5leHBvcnQgZnVuY3Rpb24gbm9wcm9wYWdhdGlvbigpIHtcbiAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICBldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbn1cbiIsImltcG9ydCB7ZGlzcGF0Y2h9IGZyb20gXCJkMy1kaXNwYXRjaFwiO1xuaW1wb3J0IHtkcmFnRGlzYWJsZSwgZHJhZ0VuYWJsZX0gZnJvbSBcImQzLWRyYWdcIjtcbmltcG9ydCB7aW50ZXJwb2xhdGV9IGZyb20gXCJkMy1pbnRlcnBvbGF0ZVwiO1xuaW1wb3J0IHtjdXN0b21FdmVudCwgZXZlbnQsIG1vdXNlLCBzZWxlY3R9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7aW50ZXJydXB0fSBmcm9tIFwiZDMtdHJhbnNpdGlvblwiO1xuaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuL2NvbnN0YW50XCI7XG5pbXBvcnQgQnJ1c2hFdmVudCBmcm9tIFwiLi9ldmVudFwiO1xuaW1wb3J0IG5vZXZlbnQsIHtub3Byb3BhZ2F0aW9ufSBmcm9tIFwiLi9ub2V2ZW50XCI7XG5cbnZhciBNT0RFX0RSQUcgPSB7bmFtZTogXCJkcmFnXCJ9LFxuICAgIE1PREVfU1BBQ0UgPSB7bmFtZTogXCJzcGFjZVwifSxcbiAgICBNT0RFX0hBTkRMRSA9IHtuYW1lOiBcImhhbmRsZVwifSxcbiAgICBNT0RFX0NFTlRFUiA9IHtuYW1lOiBcImNlbnRlclwifTtcblxudmFyIFggPSB7XG4gIG5hbWU6IFwieFwiLFxuICBoYW5kbGVzOiBbXCJlXCIsIFwid1wiXS5tYXAodHlwZSksXG4gIGlucHV0OiBmdW5jdGlvbih4LCBlKSB7IHJldHVybiB4ICYmIFtbeFswXSwgZVswXVsxXV0sIFt4WzFdLCBlWzFdWzFdXV07IH0sXG4gIG91dHB1dDogZnVuY3Rpb24oeHkpIHsgcmV0dXJuIHh5ICYmIFt4eVswXVswXSwgeHlbMV1bMF1dOyB9XG59O1xuXG52YXIgWSA9IHtcbiAgbmFtZTogXCJ5XCIsXG4gIGhhbmRsZXM6IFtcIm5cIiwgXCJzXCJdLm1hcCh0eXBlKSxcbiAgaW5wdXQ6IGZ1bmN0aW9uKHksIGUpIHsgcmV0dXJuIHkgJiYgW1tlWzBdWzBdLCB5WzBdXSwgW2VbMV1bMF0sIHlbMV1dXTsgfSxcbiAgb3V0cHV0OiBmdW5jdGlvbih4eSkgeyByZXR1cm4geHkgJiYgW3h5WzBdWzFdLCB4eVsxXVsxXV07IH1cbn07XG5cbnZhciBYWSA9IHtcbiAgbmFtZTogXCJ4eVwiLFxuICBoYW5kbGVzOiBbXCJuXCIsIFwiZVwiLCBcInNcIiwgXCJ3XCIsIFwibndcIiwgXCJuZVwiLCBcInNlXCIsIFwic3dcIl0ubWFwKHR5cGUpLFxuICBpbnB1dDogZnVuY3Rpb24oeHkpIHsgcmV0dXJuIHh5OyB9LFxuICBvdXRwdXQ6IGZ1bmN0aW9uKHh5KSB7IHJldHVybiB4eTsgfVxufTtcblxudmFyIGN1cnNvcnMgPSB7XG4gIG92ZXJsYXk6IFwiY3Jvc3NoYWlyXCIsXG4gIHNlbGVjdGlvbjogXCJtb3ZlXCIsXG4gIG46IFwibnMtcmVzaXplXCIsXG4gIGU6IFwiZXctcmVzaXplXCIsXG4gIHM6IFwibnMtcmVzaXplXCIsXG4gIHc6IFwiZXctcmVzaXplXCIsXG4gIG53OiBcIm53c2UtcmVzaXplXCIsXG4gIG5lOiBcIm5lc3ctcmVzaXplXCIsXG4gIHNlOiBcIm53c2UtcmVzaXplXCIsXG4gIHN3OiBcIm5lc3ctcmVzaXplXCJcbn07XG5cbnZhciBmbGlwWCA9IHtcbiAgZTogXCJ3XCIsXG4gIHc6IFwiZVwiLFxuICBudzogXCJuZVwiLFxuICBuZTogXCJud1wiLFxuICBzZTogXCJzd1wiLFxuICBzdzogXCJzZVwiXG59O1xuXG52YXIgZmxpcFkgPSB7XG4gIG46IFwic1wiLFxuICBzOiBcIm5cIixcbiAgbnc6IFwic3dcIixcbiAgbmU6IFwic2VcIixcbiAgc2U6IFwibmVcIixcbiAgc3c6IFwibndcIlxufTtcblxudmFyIHNpZ25zWCA9IHtcbiAgb3ZlcmxheTogKzEsXG4gIHNlbGVjdGlvbjogKzEsXG4gIG46IG51bGwsXG4gIGU6ICsxLFxuICBzOiBudWxsLFxuICB3OiAtMSxcbiAgbnc6IC0xLFxuICBuZTogKzEsXG4gIHNlOiArMSxcbiAgc3c6IC0xXG59O1xuXG52YXIgc2lnbnNZID0ge1xuICBvdmVybGF5OiArMSxcbiAgc2VsZWN0aW9uOiArMSxcbiAgbjogLTEsXG4gIGU6IG51bGwsXG4gIHM6ICsxLFxuICB3OiBudWxsLFxuICBudzogLTEsXG4gIG5lOiAtMSxcbiAgc2U6ICsxLFxuICBzdzogKzFcbn07XG5cbmZ1bmN0aW9uIHR5cGUodCkge1xuICByZXR1cm4ge3R5cGU6IHR9O1xufVxuXG4vLyBJZ25vcmUgcmlnaHQtY2xpY2ssIHNpbmNlIHRoYXQgc2hvdWxkIG9wZW4gdGhlIGNvbnRleHQgbWVudS5cbmZ1bmN0aW9uIGRlZmF1bHRGaWx0ZXIoKSB7XG4gIHJldHVybiAhZXZlbnQuYnV0dG9uO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0RXh0ZW50KCkge1xuICB2YXIgc3ZnID0gdGhpcy5vd25lclNWR0VsZW1lbnQgfHwgdGhpcztcbiAgcmV0dXJuIFtbMCwgMF0sIFtzdmcud2lkdGguYmFzZVZhbC52YWx1ZSwgc3ZnLmhlaWdodC5iYXNlVmFsLnZhbHVlXV07XG59XG5cbi8vIExpa2UgZDMubG9jYWwsIGJ1dCB3aXRoIHRoZSBuYW1lIOKAnF9fYnJ1c2jigJ0gcmF0aGVyIHRoYW4gYXV0by1nZW5lcmF0ZWQuXG5mdW5jdGlvbiBsb2NhbChub2RlKSB7XG4gIHdoaWxlICghbm9kZS5fX2JydXNoKSBpZiAoIShub2RlID0gbm9kZS5wYXJlbnROb2RlKSkgcmV0dXJuO1xuICByZXR1cm4gbm9kZS5fX2JydXNoO1xufVxuXG5mdW5jdGlvbiBlbXB0eShleHRlbnQpIHtcbiAgcmV0dXJuIGV4dGVudFswXVswXSA9PT0gZXh0ZW50WzFdWzBdXG4gICAgICB8fCBleHRlbnRbMF1bMV0gPT09IGV4dGVudFsxXVsxXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJydXNoU2VsZWN0aW9uKG5vZGUpIHtcbiAgdmFyIHN0YXRlID0gbm9kZS5fX2JydXNoO1xuICByZXR1cm4gc3RhdGUgPyBzdGF0ZS5kaW0ub3V0cHV0KHN0YXRlLnNlbGVjdGlvbikgOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnJ1c2hYKCkge1xuICByZXR1cm4gYnJ1c2goWCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBicnVzaFkoKSB7XG4gIHJldHVybiBicnVzaChZKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBicnVzaChYWSk7XG59XG5cbmZ1bmN0aW9uIGJydXNoKGRpbSkge1xuICB2YXIgZXh0ZW50ID0gZGVmYXVsdEV4dGVudCxcbiAgICAgIGZpbHRlciA9IGRlZmF1bHRGaWx0ZXIsXG4gICAgICBsaXN0ZW5lcnMgPSBkaXNwYXRjaChicnVzaCwgXCJzdGFydFwiLCBcImJydXNoXCIsIFwiZW5kXCIpLFxuICAgICAgaGFuZGxlU2l6ZSA9IDYsXG4gICAgICB0b3VjaGVuZGluZztcblxuICBmdW5jdGlvbiBicnVzaChncm91cCkge1xuICAgIHZhciBvdmVybGF5ID0gZ3JvdXBcbiAgICAgICAgLnByb3BlcnR5KFwiX19icnVzaFwiLCBpbml0aWFsaXplKVxuICAgICAgLnNlbGVjdEFsbChcIi5vdmVybGF5XCIpXG4gICAgICAuZGF0YShbdHlwZShcIm92ZXJsYXlcIildKTtcblxuICAgIG92ZXJsYXkuZW50ZXIoKS5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJvdmVybGF5XCIpXG4gICAgICAgIC5hdHRyKFwicG9pbnRlci1ldmVudHNcIiwgXCJhbGxcIilcbiAgICAgICAgLmF0dHIoXCJjdXJzb3JcIiwgY3Vyc29ycy5vdmVybGF5KVxuICAgICAgLm1lcmdlKG92ZXJsYXkpXG4gICAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBleHRlbnQgPSBsb2NhbCh0aGlzKS5leHRlbnQ7XG4gICAgICAgICAgc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgIC5hdHRyKFwieFwiLCBleHRlbnRbMF1bMF0pXG4gICAgICAgICAgICAgIC5hdHRyKFwieVwiLCBleHRlbnRbMF1bMV0pXG4gICAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZXh0ZW50WzFdWzBdIC0gZXh0ZW50WzBdWzBdKVxuICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBleHRlbnRbMV1bMV0gLSBleHRlbnRbMF1bMV0pO1xuICAgICAgICB9KTtcblxuICAgIGdyb3VwLnNlbGVjdEFsbChcIi5zZWxlY3Rpb25cIilcbiAgICAgIC5kYXRhKFt0eXBlKFwic2VsZWN0aW9uXCIpXSlcbiAgICAgIC5lbnRlcigpLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInNlbGVjdGlvblwiKVxuICAgICAgICAuYXR0cihcImN1cnNvclwiLCBjdXJzb3JzLnNlbGVjdGlvbilcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwiIzc3N1wiKVxuICAgICAgICAuYXR0cihcImZpbGwtb3BhY2l0eVwiLCAwLjMpXG4gICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwiI2ZmZlwiKVxuICAgICAgICAuYXR0cihcInNoYXBlLXJlbmRlcmluZ1wiLCBcImNyaXNwRWRnZXNcIik7XG5cbiAgICB2YXIgaGFuZGxlID0gZ3JvdXAuc2VsZWN0QWxsKFwiLmhhbmRsZVwiKVxuICAgICAgLmRhdGEoZGltLmhhbmRsZXMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudHlwZTsgfSk7XG5cbiAgICBoYW5kbGUuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgaGFuZGxlLmVudGVyKCkuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwiaGFuZGxlIGhhbmRsZS0tXCIgKyBkLnR5cGU7IH0pXG4gICAgICAgIC5hdHRyKFwiY3Vyc29yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGN1cnNvcnNbZC50eXBlXTsgfSk7XG5cbiAgICBncm91cFxuICAgICAgICAuZWFjaChyZWRyYXcpXG4gICAgICAgIC5hdHRyKFwiZmlsbFwiLCBcIm5vbmVcIilcbiAgICAgICAgLmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcImFsbFwiKVxuICAgICAgICAuc3R5bGUoXCItd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3JcIiwgXCJyZ2JhKDAsMCwwLDApXCIpXG4gICAgICAgIC5vbihcIm1vdXNlZG93bi5icnVzaCB0b3VjaHN0YXJ0LmJydXNoXCIsIHN0YXJ0ZWQpO1xuICB9XG5cbiAgYnJ1c2gubW92ZSA9IGZ1bmN0aW9uKGdyb3VwLCBzZWxlY3Rpb24pIHtcbiAgICBpZiAoZ3JvdXAuc2VsZWN0aW9uKSB7XG4gICAgICBncm91cFxuICAgICAgICAgIC5vbihcInN0YXJ0LmJydXNoXCIsIGZ1bmN0aW9uKCkgeyBlbWl0dGVyKHRoaXMsIGFyZ3VtZW50cykuYmVmb3Jlc3RhcnQoKS5zdGFydCgpOyB9KVxuICAgICAgICAgIC5vbihcImludGVycnVwdC5icnVzaCBlbmQuYnJ1c2hcIiwgZnVuY3Rpb24oKSB7IGVtaXR0ZXIodGhpcywgYXJndW1lbnRzKS5lbmQoKTsgfSlcbiAgICAgICAgICAudHdlZW4oXCJicnVzaFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcyxcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IHRoYXQuX19icnVzaCxcbiAgICAgICAgICAgICAgICBlbWl0ID0gZW1pdHRlcih0aGF0LCBhcmd1bWVudHMpLFxuICAgICAgICAgICAgICAgIHNlbGVjdGlvbjAgPSBzdGF0ZS5zZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgc2VsZWN0aW9uMSA9IGRpbS5pbnB1dCh0eXBlb2Ygc2VsZWN0aW9uID09PSBcImZ1bmN0aW9uXCIgPyBzZWxlY3Rpb24uYXBwbHkodGhpcywgYXJndW1lbnRzKSA6IHNlbGVjdGlvbiwgc3RhdGUuZXh0ZW50KSxcbiAgICAgICAgICAgICAgICBpID0gaW50ZXJwb2xhdGUoc2VsZWN0aW9uMCwgc2VsZWN0aW9uMSk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHR3ZWVuKHQpIHtcbiAgICAgICAgICAgICAgc3RhdGUuc2VsZWN0aW9uID0gdCA9PT0gMSAmJiBlbXB0eShzZWxlY3Rpb24xKSA/IG51bGwgOiBpKHQpO1xuICAgICAgICAgICAgICByZWRyYXcuY2FsbCh0aGF0KTtcbiAgICAgICAgICAgICAgZW1pdC5icnVzaCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2VsZWN0aW9uMCAmJiBzZWxlY3Rpb24xID8gdHdlZW4gOiB0d2VlbigxKTtcbiAgICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZ3JvdXBcbiAgICAgICAgICAuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcyxcbiAgICAgICAgICAgICAgICBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgICAgICAgICAgIHN0YXRlID0gdGhhdC5fX2JydXNoLFxuICAgICAgICAgICAgICAgIHNlbGVjdGlvbjEgPSBkaW0uaW5wdXQodHlwZW9mIHNlbGVjdGlvbiA9PT0gXCJmdW5jdGlvblwiID8gc2VsZWN0aW9uLmFwcGx5KHRoYXQsIGFyZ3MpIDogc2VsZWN0aW9uLCBzdGF0ZS5leHRlbnQpLFxuICAgICAgICAgICAgICAgIGVtaXQgPSBlbWl0dGVyKHRoYXQsIGFyZ3MpLmJlZm9yZXN0YXJ0KCk7XG5cbiAgICAgICAgICAgIGludGVycnVwdCh0aGF0KTtcbiAgICAgICAgICAgIHN0YXRlLnNlbGVjdGlvbiA9IHNlbGVjdGlvbjEgPT0gbnVsbCB8fCBlbXB0eShzZWxlY3Rpb24xKSA/IG51bGwgOiBzZWxlY3Rpb24xO1xuICAgICAgICAgICAgcmVkcmF3LmNhbGwodGhhdCk7XG4gICAgICAgICAgICBlbWl0LnN0YXJ0KCkuYnJ1c2goKS5lbmQoKTtcbiAgICAgICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgZnVuY3Rpb24gcmVkcmF3KCkge1xuICAgIHZhciBncm91cCA9IHNlbGVjdCh0aGlzKSxcbiAgICAgICAgc2VsZWN0aW9uID0gbG9jYWwodGhpcykuc2VsZWN0aW9uO1xuXG4gICAgaWYgKHNlbGVjdGlvbikge1xuICAgICAgZ3JvdXAuc2VsZWN0QWxsKFwiLnNlbGVjdGlvblwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgbnVsbClcbiAgICAgICAgICAuYXR0cihcInhcIiwgc2VsZWN0aW9uWzBdWzBdKVxuICAgICAgICAgIC5hdHRyKFwieVwiLCBzZWxlY3Rpb25bMF1bMV0pXG4gICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBzZWxlY3Rpb25bMV1bMF0gLSBzZWxlY3Rpb25bMF1bMF0pXG4gICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgc2VsZWN0aW9uWzFdWzFdIC0gc2VsZWN0aW9uWzBdWzFdKTtcblxuICAgICAgZ3JvdXAuc2VsZWN0QWxsKFwiLmhhbmRsZVwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgbnVsbClcbiAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50eXBlW2QudHlwZS5sZW5ndGggLSAxXSA9PT0gXCJlXCIgPyBzZWxlY3Rpb25bMV1bMF0gLSBoYW5kbGVTaXplIC8gMiA6IHNlbGVjdGlvblswXVswXSAtIGhhbmRsZVNpemUgLyAyOyB9KVxuICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnR5cGVbMF0gPT09IFwic1wiID8gc2VsZWN0aW9uWzFdWzFdIC0gaGFuZGxlU2l6ZSAvIDIgOiBzZWxlY3Rpb25bMF1bMV0gLSBoYW5kbGVTaXplIC8gMjsgfSlcbiAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudHlwZSA9PT0gXCJuXCIgfHwgZC50eXBlID09PSBcInNcIiA/IHNlbGVjdGlvblsxXVswXSAtIHNlbGVjdGlvblswXVswXSArIGhhbmRsZVNpemUgOiBoYW5kbGVTaXplOyB9KVxuICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudHlwZSA9PT0gXCJlXCIgfHwgZC50eXBlID09PSBcIndcIiA/IHNlbGVjdGlvblsxXVsxXSAtIHNlbGVjdGlvblswXVsxXSArIGhhbmRsZVNpemUgOiBoYW5kbGVTaXplOyB9KTtcbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIGdyb3VwLnNlbGVjdEFsbChcIi5zZWxlY3Rpb24sLmhhbmRsZVwiKVxuICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgXCJub25lXCIpXG4gICAgICAgICAgLmF0dHIoXCJ4XCIsIG51bGwpXG4gICAgICAgICAgLmF0dHIoXCJ5XCIsIG51bGwpXG4gICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBudWxsKVxuICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGVtaXR0ZXIodGhhdCwgYXJncykge1xuICAgIHJldHVybiB0aGF0Ll9fYnJ1c2guZW1pdHRlciB8fCBuZXcgRW1pdHRlcih0aGF0LCBhcmdzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIEVtaXR0ZXIodGhhdCwgYXJncykge1xuICAgIHRoaXMudGhhdCA9IHRoYXQ7XG4gICAgdGhpcy5hcmdzID0gYXJncztcbiAgICB0aGlzLnN0YXRlID0gdGhhdC5fX2JydXNoO1xuICAgIHRoaXMuYWN0aXZlID0gMDtcbiAgfVxuXG4gIEVtaXR0ZXIucHJvdG90eXBlID0ge1xuICAgIGJlZm9yZXN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgrK3RoaXMuYWN0aXZlID09PSAxKSB0aGlzLnN0YXRlLmVtaXR0ZXIgPSB0aGlzLCB0aGlzLnN0YXJ0aW5nID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuc3RhcnRpbmcpIHRoaXMuc3RhcnRpbmcgPSBmYWxzZSwgdGhpcy5lbWl0KFwic3RhcnRcIik7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGJydXNoOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZW1pdChcImJydXNoXCIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBlbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGhpcy5hY3RpdmUgPT09IDApIGRlbGV0ZSB0aGlzLnN0YXRlLmVtaXR0ZXIsIHRoaXMuZW1pdChcImVuZFwiKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZW1pdDogZnVuY3Rpb24odHlwZSkge1xuICAgICAgY3VzdG9tRXZlbnQobmV3IEJydXNoRXZlbnQoYnJ1c2gsIHR5cGUsIGRpbS5vdXRwdXQodGhpcy5zdGF0ZS5zZWxlY3Rpb24pKSwgbGlzdGVuZXJzLmFwcGx5LCBsaXN0ZW5lcnMsIFt0eXBlLCB0aGlzLnRoYXQsIHRoaXMuYXJnc10pO1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBzdGFydGVkKCkge1xuICAgIGlmIChldmVudC50b3VjaGVzKSB7IGlmIChldmVudC5jaGFuZ2VkVG91Y2hlcy5sZW5ndGggPCBldmVudC50b3VjaGVzLmxlbmd0aCkgcmV0dXJuIG5vZXZlbnQoKTsgfVxuICAgIGVsc2UgaWYgKHRvdWNoZW5kaW5nKSByZXR1cm47XG4gICAgaWYgKCFmaWx0ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSkgcmV0dXJuO1xuXG4gICAgdmFyIHRoYXQgPSB0aGlzLFxuICAgICAgICB0eXBlID0gZXZlbnQudGFyZ2V0Ll9fZGF0YV9fLnR5cGUsXG4gICAgICAgIG1vZGUgPSAoZXZlbnQubWV0YUtleSA/IHR5cGUgPSBcIm92ZXJsYXlcIiA6IHR5cGUpID09PSBcInNlbGVjdGlvblwiID8gTU9ERV9EUkFHIDogKGV2ZW50LmFsdEtleSA/IE1PREVfQ0VOVEVSIDogTU9ERV9IQU5ETEUpLFxuICAgICAgICBzaWduWCA9IGRpbSA9PT0gWSA/IG51bGwgOiBzaWduc1hbdHlwZV0sXG4gICAgICAgIHNpZ25ZID0gZGltID09PSBYID8gbnVsbCA6IHNpZ25zWVt0eXBlXSxcbiAgICAgICAgc3RhdGUgPSBsb2NhbCh0aGF0KSxcbiAgICAgICAgZXh0ZW50ID0gc3RhdGUuZXh0ZW50LFxuICAgICAgICBzZWxlY3Rpb24gPSBzdGF0ZS5zZWxlY3Rpb24sXG4gICAgICAgIFcgPSBleHRlbnRbMF1bMF0sIHcwLCB3MSxcbiAgICAgICAgTiA9IGV4dGVudFswXVsxXSwgbjAsIG4xLFxuICAgICAgICBFID0gZXh0ZW50WzFdWzBdLCBlMCwgZTEsXG4gICAgICAgIFMgPSBleHRlbnRbMV1bMV0sIHMwLCBzMSxcbiAgICAgICAgZHgsXG4gICAgICAgIGR5LFxuICAgICAgICBtb3ZpbmcsXG4gICAgICAgIHNoaWZ0aW5nID0gc2lnblggJiYgc2lnblkgJiYgZXZlbnQuc2hpZnRLZXksXG4gICAgICAgIGxvY2tYLFxuICAgICAgICBsb2NrWSxcbiAgICAgICAgcG9pbnQwID0gbW91c2UodGhhdCksXG4gICAgICAgIHBvaW50ID0gcG9pbnQwLFxuICAgICAgICBlbWl0ID0gZW1pdHRlcih0aGF0LCBhcmd1bWVudHMpLmJlZm9yZXN0YXJ0KCk7XG5cbiAgICBpZiAodHlwZSA9PT0gXCJvdmVybGF5XCIpIHtcbiAgICAgIHN0YXRlLnNlbGVjdGlvbiA9IHNlbGVjdGlvbiA9IFtcbiAgICAgICAgW3cwID0gZGltID09PSBZID8gVyA6IHBvaW50MFswXSwgbjAgPSBkaW0gPT09IFggPyBOIDogcG9pbnQwWzFdXSxcbiAgICAgICAgW2UwID0gZGltID09PSBZID8gRSA6IHcwLCBzMCA9IGRpbSA9PT0gWCA/IFMgOiBuMF1cbiAgICAgIF07XG4gICAgfSBlbHNlIHtcbiAgICAgIHcwID0gc2VsZWN0aW9uWzBdWzBdO1xuICAgICAgbjAgPSBzZWxlY3Rpb25bMF1bMV07XG4gICAgICBlMCA9IHNlbGVjdGlvblsxXVswXTtcbiAgICAgIHMwID0gc2VsZWN0aW9uWzFdWzFdO1xuICAgIH1cblxuICAgIHcxID0gdzA7XG4gICAgbjEgPSBuMDtcbiAgICBlMSA9IGUwO1xuICAgIHMxID0gczA7XG5cbiAgICB2YXIgZ3JvdXAgPSBzZWxlY3QodGhhdClcbiAgICAgICAgLmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcIm5vbmVcIik7XG5cbiAgICB2YXIgb3ZlcmxheSA9IGdyb3VwLnNlbGVjdEFsbChcIi5vdmVybGF5XCIpXG4gICAgICAgIC5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnNbdHlwZV0pO1xuXG4gICAgaWYgKGV2ZW50LnRvdWNoZXMpIHtcbiAgICAgIGdyb3VwXG4gICAgICAgICAgLm9uKFwidG91Y2htb3ZlLmJydXNoXCIsIG1vdmVkLCB0cnVlKVxuICAgICAgICAgIC5vbihcInRvdWNoZW5kLmJydXNoIHRvdWNoY2FuY2VsLmJydXNoXCIsIGVuZGVkLCB0cnVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHZpZXcgPSBzZWxlY3QoZXZlbnQudmlldylcbiAgICAgICAgICAub24oXCJrZXlkb3duLmJydXNoXCIsIGtleWRvd25lZCwgdHJ1ZSlcbiAgICAgICAgICAub24oXCJrZXl1cC5icnVzaFwiLCBrZXl1cHBlZCwgdHJ1ZSlcbiAgICAgICAgICAub24oXCJtb3VzZW1vdmUuYnJ1c2hcIiwgbW92ZWQsIHRydWUpXG4gICAgICAgICAgLm9uKFwibW91c2V1cC5icnVzaFwiLCBlbmRlZCwgdHJ1ZSk7XG5cbiAgICAgIGRyYWdEaXNhYmxlKGV2ZW50LnZpZXcpO1xuICAgIH1cblxuICAgIG5vcHJvcGFnYXRpb24oKTtcbiAgICBpbnRlcnJ1cHQodGhhdCk7XG4gICAgcmVkcmF3LmNhbGwodGhhdCk7XG4gICAgZW1pdC5zdGFydCgpO1xuXG4gICAgZnVuY3Rpb24gbW92ZWQoKSB7XG4gICAgICB2YXIgcG9pbnQxID0gbW91c2UodGhhdCk7XG4gICAgICBpZiAoc2hpZnRpbmcgJiYgIWxvY2tYICYmICFsb2NrWSkge1xuICAgICAgICBpZiAoTWF0aC5hYnMocG9pbnQxWzBdIC0gcG9pbnRbMF0pID4gTWF0aC5hYnMocG9pbnQxWzFdIC0gcG9pbnRbMV0pKSBsb2NrWSA9IHRydWU7XG4gICAgICAgIGVsc2UgbG9ja1ggPSB0cnVlO1xuICAgICAgfVxuICAgICAgcG9pbnQgPSBwb2ludDE7XG4gICAgICBtb3ZpbmcgPSB0cnVlO1xuICAgICAgbm9ldmVudCgpO1xuICAgICAgbW92ZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdmUoKSB7XG4gICAgICB2YXIgdDtcblxuICAgICAgZHggPSBwb2ludFswXSAtIHBvaW50MFswXTtcbiAgICAgIGR5ID0gcG9pbnRbMV0gLSBwb2ludDBbMV07XG5cbiAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICBjYXNlIE1PREVfU1BBQ0U6XG4gICAgICAgIGNhc2UgTU9ERV9EUkFHOiB7XG4gICAgICAgICAgaWYgKHNpZ25YKSBkeCA9IE1hdGgubWF4KFcgLSB3MCwgTWF0aC5taW4oRSAtIGUwLCBkeCkpLCB3MSA9IHcwICsgZHgsIGUxID0gZTAgKyBkeDtcbiAgICAgICAgICBpZiAoc2lnblkpIGR5ID0gTWF0aC5tYXgoTiAtIG4wLCBNYXRoLm1pbihTIC0gczAsIGR5KSksIG4xID0gbjAgKyBkeSwgczEgPSBzMCArIGR5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgTU9ERV9IQU5ETEU6IHtcbiAgICAgICAgICBpZiAoc2lnblggPCAwKSBkeCA9IE1hdGgubWF4KFcgLSB3MCwgTWF0aC5taW4oRSAtIHcwLCBkeCkpLCB3MSA9IHcwICsgZHgsIGUxID0gZTA7XG4gICAgICAgICAgZWxzZSBpZiAoc2lnblggPiAwKSBkeCA9IE1hdGgubWF4KFcgLSBlMCwgTWF0aC5taW4oRSAtIGUwLCBkeCkpLCB3MSA9IHcwLCBlMSA9IGUwICsgZHg7XG4gICAgICAgICAgaWYgKHNpZ25ZIDwgMCkgZHkgPSBNYXRoLm1heChOIC0gbjAsIE1hdGgubWluKFMgLSBuMCwgZHkpKSwgbjEgPSBuMCArIGR5LCBzMSA9IHMwO1xuICAgICAgICAgIGVsc2UgaWYgKHNpZ25ZID4gMCkgZHkgPSBNYXRoLm1heChOIC0gczAsIE1hdGgubWluKFMgLSBzMCwgZHkpKSwgbjEgPSBuMCwgczEgPSBzMCArIGR5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgTU9ERV9DRU5URVI6IHtcbiAgICAgICAgICBpZiAoc2lnblgpIHcxID0gTWF0aC5tYXgoVywgTWF0aC5taW4oRSwgdzAgLSBkeCAqIHNpZ25YKSksIGUxID0gTWF0aC5tYXgoVywgTWF0aC5taW4oRSwgZTAgKyBkeCAqIHNpZ25YKSk7XG4gICAgICAgICAgaWYgKHNpZ25ZKSBuMSA9IE1hdGgubWF4KE4sIE1hdGgubWluKFMsIG4wIC0gZHkgKiBzaWduWSkpLCBzMSA9IE1hdGgubWF4KE4sIE1hdGgubWluKFMsIHMwICsgZHkgKiBzaWduWSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChlMSA8IHcxKSB7XG4gICAgICAgIHNpZ25YICo9IC0xO1xuICAgICAgICB0ID0gdzAsIHcwID0gZTAsIGUwID0gdDtcbiAgICAgICAgdCA9IHcxLCB3MSA9IGUxLCBlMSA9IHQ7XG4gICAgICAgIGlmICh0eXBlIGluIGZsaXBYKSBvdmVybGF5LmF0dHIoXCJjdXJzb3JcIiwgY3Vyc29yc1t0eXBlID0gZmxpcFhbdHlwZV1dKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHMxIDwgbjEpIHtcbiAgICAgICAgc2lnblkgKj0gLTE7XG4gICAgICAgIHQgPSBuMCwgbjAgPSBzMCwgczAgPSB0O1xuICAgICAgICB0ID0gbjEsIG4xID0gczEsIHMxID0gdDtcbiAgICAgICAgaWYgKHR5cGUgaW4gZmxpcFkpIG92ZXJsYXkuYXR0cihcImN1cnNvclwiLCBjdXJzb3JzW3R5cGUgPSBmbGlwWVt0eXBlXV0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3RhdGUuc2VsZWN0aW9uKSBzZWxlY3Rpb24gPSBzdGF0ZS5zZWxlY3Rpb247IC8vIE1heSBiZSBzZXQgYnkgYnJ1c2gubW92ZSFcbiAgICAgIGlmIChsb2NrWCkgdzEgPSBzZWxlY3Rpb25bMF1bMF0sIGUxID0gc2VsZWN0aW9uWzFdWzBdO1xuICAgICAgaWYgKGxvY2tZKSBuMSA9IHNlbGVjdGlvblswXVsxXSwgczEgPSBzZWxlY3Rpb25bMV1bMV07XG5cbiAgICAgIGlmIChzZWxlY3Rpb25bMF1bMF0gIT09IHcxXG4gICAgICAgICAgfHwgc2VsZWN0aW9uWzBdWzFdICE9PSBuMVxuICAgICAgICAgIHx8IHNlbGVjdGlvblsxXVswXSAhPT0gZTFcbiAgICAgICAgICB8fCBzZWxlY3Rpb25bMV1bMV0gIT09IHMxKSB7XG4gICAgICAgIHN0YXRlLnNlbGVjdGlvbiA9IFtbdzEsIG4xXSwgW2UxLCBzMV1dO1xuICAgICAgICByZWRyYXcuY2FsbCh0aGF0KTtcbiAgICAgICAgZW1pdC5icnVzaCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVuZGVkKCkge1xuICAgICAgbm9wcm9wYWdhdGlvbigpO1xuICAgICAgaWYgKGV2ZW50LnRvdWNoZXMpIHtcbiAgICAgICAgaWYgKGV2ZW50LnRvdWNoZXMubGVuZ3RoKSByZXR1cm47XG4gICAgICAgIGlmICh0b3VjaGVuZGluZykgY2xlYXJUaW1lb3V0KHRvdWNoZW5kaW5nKTtcbiAgICAgICAgdG91Y2hlbmRpbmcgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0b3VjaGVuZGluZyA9IG51bGw7IH0sIDUwMCk7IC8vIEdob3N0IGNsaWNrcyBhcmUgZGVsYXllZCFcbiAgICAgICAgZ3JvdXAub24oXCJ0b3VjaG1vdmUuYnJ1c2ggdG91Y2hlbmQuYnJ1c2ggdG91Y2hjYW5jZWwuYnJ1c2hcIiwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkcmFnRW5hYmxlKGV2ZW50LnZpZXcsIG1vdmluZyk7XG4gICAgICAgIHZpZXcub24oXCJrZXlkb3duLmJydXNoIGtleXVwLmJydXNoIG1vdXNlbW92ZS5icnVzaCBtb3VzZXVwLmJydXNoXCIsIG51bGwpO1xuICAgICAgfVxuICAgICAgZ3JvdXAuYXR0cihcInBvaW50ZXItZXZlbnRzXCIsIFwiYWxsXCIpO1xuICAgICAgb3ZlcmxheS5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnMub3ZlcmxheSk7XG4gICAgICBpZiAoc3RhdGUuc2VsZWN0aW9uKSBzZWxlY3Rpb24gPSBzdGF0ZS5zZWxlY3Rpb247IC8vIE1heSBiZSBzZXQgYnkgYnJ1c2gubW92ZSAob24gc3RhcnQpIVxuICAgICAgaWYgKGVtcHR5KHNlbGVjdGlvbikpIHN0YXRlLnNlbGVjdGlvbiA9IG51bGwsIHJlZHJhdy5jYWxsKHRoYXQpO1xuICAgICAgZW1pdC5lbmQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBrZXlkb3duZWQoKSB7XG4gICAgICBzd2l0Y2ggKGV2ZW50LmtleUNvZGUpIHtcbiAgICAgICAgY2FzZSAxNjogeyAvLyBTSElGVFxuICAgICAgICAgIHNoaWZ0aW5nID0gc2lnblggJiYgc2lnblk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAxODogeyAvLyBBTFRcbiAgICAgICAgICBpZiAobW9kZSA9PT0gTU9ERV9IQU5ETEUpIHtcbiAgICAgICAgICAgIGlmIChzaWduWCkgZTAgPSBlMSAtIGR4ICogc2lnblgsIHcwID0gdzEgKyBkeCAqIHNpZ25YO1xuICAgICAgICAgICAgaWYgKHNpZ25ZKSBzMCA9IHMxIC0gZHkgKiBzaWduWSwgbjAgPSBuMSArIGR5ICogc2lnblk7XG4gICAgICAgICAgICBtb2RlID0gTU9ERV9DRU5URVI7XG4gICAgICAgICAgICBtb3ZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgMzI6IHsgLy8gU1BBQ0U7IHRha2VzIHByaW9yaXR5IG92ZXIgQUxUXG4gICAgICAgICAgaWYgKG1vZGUgPT09IE1PREVfSEFORExFIHx8IG1vZGUgPT09IE1PREVfQ0VOVEVSKSB7XG4gICAgICAgICAgICBpZiAoc2lnblggPCAwKSBlMCA9IGUxIC0gZHg7IGVsc2UgaWYgKHNpZ25YID4gMCkgdzAgPSB3MSAtIGR4O1xuICAgICAgICAgICAgaWYgKHNpZ25ZIDwgMCkgczAgPSBzMSAtIGR5OyBlbHNlIGlmIChzaWduWSA+IDApIG4wID0gbjEgLSBkeTtcbiAgICAgICAgICAgIG1vZGUgPSBNT0RFX1NQQUNFO1xuICAgICAgICAgICAgb3ZlcmxheS5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnMuc2VsZWN0aW9uKTtcbiAgICAgICAgICAgIG1vdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDogcmV0dXJuO1xuICAgICAgfVxuICAgICAgbm9ldmVudCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGtleXVwcGVkKCkge1xuICAgICAgc3dpdGNoIChldmVudC5rZXlDb2RlKSB7XG4gICAgICAgIGNhc2UgMTY6IHsgLy8gU0hJRlRcbiAgICAgICAgICBpZiAoc2hpZnRpbmcpIHtcbiAgICAgICAgICAgIGxvY2tYID0gbG9ja1kgPSBzaGlmdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIDE4OiB7IC8vIEFMVFxuICAgICAgICAgIGlmIChtb2RlID09PSBNT0RFX0NFTlRFUikge1xuICAgICAgICAgICAgaWYgKHNpZ25YIDwgMCkgZTAgPSBlMTsgZWxzZSBpZiAoc2lnblggPiAwKSB3MCA9IHcxO1xuICAgICAgICAgICAgaWYgKHNpZ25ZIDwgMCkgczAgPSBzMTsgZWxzZSBpZiAoc2lnblkgPiAwKSBuMCA9IG4xO1xuICAgICAgICAgICAgbW9kZSA9IE1PREVfSEFORExFO1xuICAgICAgICAgICAgbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjYXNlIDMyOiB7IC8vIFNQQUNFXG4gICAgICAgICAgaWYgKG1vZGUgPT09IE1PREVfU1BBQ0UpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5hbHRLZXkpIHtcbiAgICAgICAgICAgICAgaWYgKHNpZ25YKSBlMCA9IGUxIC0gZHggKiBzaWduWCwgdzAgPSB3MSArIGR4ICogc2lnblg7XG4gICAgICAgICAgICAgIGlmIChzaWduWSkgczAgPSBzMSAtIGR5ICogc2lnblksIG4wID0gbjEgKyBkeSAqIHNpZ25ZO1xuICAgICAgICAgICAgICBtb2RlID0gTU9ERV9DRU5URVI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZiAoc2lnblggPCAwKSBlMCA9IGUxOyBlbHNlIGlmIChzaWduWCA+IDApIHcwID0gdzE7XG4gICAgICAgICAgICAgIGlmIChzaWduWSA8IDApIHMwID0gczE7IGVsc2UgaWYgKHNpZ25ZID4gMCkgbjAgPSBuMTtcbiAgICAgICAgICAgICAgbW9kZSA9IE1PREVfSEFORExFO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3ZlcmxheS5hdHRyKFwiY3Vyc29yXCIsIGN1cnNvcnNbdHlwZV0pO1xuICAgICAgICAgICAgbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OiByZXR1cm47XG4gICAgICB9XG4gICAgICBub2V2ZW50KCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICB2YXIgc3RhdGUgPSB0aGlzLl9fYnJ1c2ggfHwge3NlbGVjdGlvbjogbnVsbH07XG4gICAgc3RhdGUuZXh0ZW50ID0gZXh0ZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgc3RhdGUuZGltID0gZGltO1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfVxuXG4gIGJydXNoLmV4dGVudCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChleHRlbnQgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KFtbK19bMF1bMF0sICtfWzBdWzFdXSwgWytfWzFdWzBdLCArX1sxXVsxXV1dKSwgYnJ1c2gpIDogZXh0ZW50O1xuICB9O1xuXG4gIGJydXNoLmZpbHRlciA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChmaWx0ZXIgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCEhXyksIGJydXNoKSA6IGZpbHRlcjtcbiAgfTtcblxuICBicnVzaC5oYW5kbGVTaXplID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGhhbmRsZVNpemUgPSArXywgYnJ1c2gpIDogaGFuZGxlU2l6ZTtcbiAgfTtcblxuICBicnVzaC5vbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZSA9IGxpc3RlbmVycy5vbi5hcHBseShsaXN0ZW5lcnMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHZhbHVlID09PSBsaXN0ZW5lcnMgPyBicnVzaCA6IHZhbHVlO1xuICB9O1xuXG4gIHJldHVybiBicnVzaDtcbn1cbiIsImltcG9ydCB7bWVhbiwgcXVhbnRpbGUsIGRldmlhdGlvbn0gZnJvbSBcImQzLWFycmF5XCI7XG5cblxuLy8gcmVmZXJlbmNlOiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9LZXJuZWxfKHN0YXRpc3RpY3MpXG4vLyByZWZlcmVuY2U6IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0tlcm5lbF9kZW5zaXR5X2VzdGltYXRpb25cbmV4cG9ydCBjb25zdCBrZXJuZWwgPSB7XG4gICAgZXBhbmVjaG5pa292OiBmdW5jdGlvbih1KXtyZXR1cm4gTWF0aC5hYnModSkgPD0gMT8gKDMvNCkqKDEtdSp1KTowfSxcbiAgICBnYXVzc2lhbjogZnVuY3Rpb24odSl7cmV0dXJuIDEvTWF0aC5zcXJ0KDIqTWF0aC5QSSkqTWF0aC5leHAoLS41KnUqdSl9XG59O1xuXG4vLyByZWZlcmVuY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNvbmRhdmllcy9zY2llbmNlLmpzL2Jsb2IvbWFzdGVyL3NyYy9zdGF0cy9iYW5kd2lkdGguanNcbmV4cG9ydCBjb25zdCBrZXJuZWxCYW5kd2lkdGggPSB7XG4gICAgLy8gQmFuZHdpZHRoIHNlbGVjdG9ycyBmb3IgR2F1c3NpYW4ga2VybmVscy5cbiAgICBucmQ6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgbGV0IGlxciA9IHF1YW50aWxlKHgsIDAuNzUpIC0gcXVhbnRpbGUoeCwgMC4yNSk7XG4gICAgICAgIGxldCBoID0gaXFyIC8gMS4zNDtcbiAgICAgICAgcmV0dXJuIDEuMDYgKiBNYXRoLm1pbihkZXZpYXRpb24oeCksIGgpICogTWF0aC5wb3coeC5sZW5ndGgsIC0xLzUpO1xuICAgIH1cbn07XG5cbi8qKlxuICpcbiAqIEBwYXJhbSBrZXJuZWw6IHRoZSBrZXJuZWwgZnVuY3Rpb24sIHN1Y2ggYXMgZ2F1c3NpYW5cbiAqIEBwYXJhbSBYOiBsaXN0IG9mIGJpbnNcbiAqIEBwYXJhbSBoOiB0aGUgYmFuZHdpZHRoLCBlaXRoZXIgYSBudW1lcmljYWwgdmFsdWUgZ2l2ZW4gYnkgdGhlIHVzZXIgb3IgY2FsY3VsYXRlZCB1c2luZyB0aGUgZnVuY3Rpb24ga2VybmVsQmFuZHdpZHRoXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259OiB0aGUga2VybmVsIGRlbnNpdHkgZXN0aW1hdG9yXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBrZXJuZWxEZW5zaXR5RXN0aW1hdG9yKGtlcm5lbCwgWCwgaCl7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKFYpIHtcbiAgICAgICAgLy8gWCBpcyB0aGUgYmluc1xuICAgICAgICByZXR1cm4gWC5tYXAoKHgpID0+IFt4LCBtZWFuKFYsICh2KSA9PiBrZXJuZWwoKHgtdikvaCkpL2hdKTtcbiAgICB9XG59XG5cbiIsImltcG9ydCB7c2VsZWN0LCBldmVudH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUb29sdGlwIHtcbiAgICBjb25zdHJ1Y3RvcihpZCwgdmVyYm9zZT1mYWxzZSwgb2Zmc2V0WD0zMCwgb2Zmc2V0WT0tNDAsIGR1cmF0aW9uPTEwMCl7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy52ZXJib3NlID0gdmVyYm9zZTtcbiAgICAgICAgdGhpcy5vZmZzZXRYID0gb2Zmc2V0WDtcbiAgICAgICAgdGhpcy5vZmZzZXRZID0gb2Zmc2V0WTtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgIH1cblxuICAgIHNob3coaW5mbykge1xuICAgICAgICBpZih0aGlzLnZlcmJvc2UpIGNvbnNvbGUubG9nKGluZm8pO1xuICAgICAgICB0aGlzLmVkaXQoaW5mbyk7XG4gICAgICAgIHRoaXMubW92ZSgpO1xuICAgICAgICBzZWxlY3QoXCIjXCIgKyB0aGlzLmlkKVxuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLCBcImlubGluZVwiKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKHRoaXMuZHVyYXRpb24pXG4gICAgICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsIDEuMClcblxuICAgIH1cblxuICAgIGhpZGUoKSB7XG4gICAgICAgIHNlbGVjdChcIiNcIiArIHRoaXMuaWQpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24odGhpcy5kdXJhdGlvbilcbiAgICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIiwgMC4wKTtcbiAgICAgICAgdGhpcy5lZGl0KFwiXCIpO1xuICAgIH1cblxuICAgIG1vdmUoeCA9IGV2ZW50LnBhZ2VYLCB5ID0gZXZlbnQucGFnZVkpIHtcbiAgICAgICAgaWYgKHRoaXMudmVyYm9zZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coeCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh5KTtcbiAgICAgICAgfVxuICAgICAgICB4ID0geCArIHRoaXMub2Zmc2V0WDsgLy8gVE9ETzogZ2V0IHJpZCBvZiB0aGUgaGFyZC1jb2RlZCBhZGp1c3RtZW50XG4gICAgICAgIHkgPSAoeSArIHRoaXMub2Zmc2V0WSk8MD8xMDp5K3RoaXMub2Zmc2V0WTtcbiAgICAgICAgY29uc3QgdCA9IHNlbGVjdCgnIycrdGhpcy5pZClcbiAgICAgICAgICAgIC5zdHlsZShcImxlZnRcIiwgYCR7eH1weGApXG4gICAgICAgICAgICAuc3R5bGUoXCJ0b3BcIiwgYCR7eX1weGApXG4gICAgfVxuXG4gICAgZWRpdChpbmZvKSB7XG4gICAgICAgIHNlbGVjdChcIiNcIiArIHRoaXMuaWQpXG4gICAgICAgICAgICAuaHRtbChpbmZvKVxuICAgIH1cbn1cblxuIiwiLyoqXG4gKiBDcmVhdGVzIGFuIFNWR1xuICogQHBhcmFtIGlkIHtTdHJpbmd9IGEgRE9NIGVsZW1lbnQgSUQgdGhhdCBzdGFydHMgd2l0aCBhIFwiI1wiXG4gKiBAcGFyYW0gd2lkdGgge051bWVyaWN9XG4gKiBAcGFyYW0gaGVpZ2h0IHtOdW1lcmljfVxuICogQHBhcmFtIG1hcmdpbiB7T2JqZWN0fSB3aXRoIHR3byBhdHRyaWJ1dGVzOiB3aWR0aCBhbmQgaGVpZ2h0XG4gKiBAcmV0dXJuIHtTZWxlY3Rpb259IHRoZSBkMyBzZWxlY3Rpb24gb2JqZWN0IG9mIHRoZSBTVkdcbiAqL1xuXG5pbXBvcnQge3NlbGVjdH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xuXG4vKipcbiAqXG4gKiBAcGFyYW0gaWQge1N0cmluZ30gdGhlIHBhcmVudCBkb20gSURcbiAqIEBwYXJhbSB3aWR0aCB7TnVtZXJpY31cbiAqIEBwYXJhbSBoZWlnaHQge051bWVyaWN9XG4gKiBAcGFyYW0gbWFyZ2luIHtPYmplY3R9IHdpdGggYXR0cjogbGVmdCwgdG9wXG4gKiBAcGFyYW0gc3ZnSWQge1N0cmluZ31cbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3ZnKGlkLCB3aWR0aCwgaGVpZ2h0LCBtYXJnaW4sIHN2Z0lkPXVuZGVmaW5lZCl7XG4gICAgaWYgKHN2Z0lkPT09dW5kZWZpbmVkKSBzdmdJZD1gJHtpZH0tc3ZnYDtcbiAgICByZXR1cm4gc2VsZWN0KFwiI1wiK2lkKS5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgICAgICAuYXR0cihcImlkXCIsIHN2Z0lkKVxuICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBgdHJhbnNsYXRlKCR7bWFyZ2luLmxlZnR9LCAke21hcmdpbi50b3B9KWApXG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSBzdmdPYmpcbiAqIEBwYXJhbSBkb3dubG9hZEZpbGVOYW1lIHtTdHJpbmd9XG4gKiBAcGFyYW0gdGVtcERvd25sb2FkRGl2SWQge1N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRvd25sb2FkU3ZnKHN2Z09iaiwgZG93bmxvYWRGaWxlTmFtZSwgdGVtcERvd25sb2FkRGl2SWQpe1xuICAgIGNvbnNvbGUubG9nKHN2Z09iaik7XG4gICAgdmFyICRzdmdDb3B5ID0gc3ZnT2JqLmNsb25lKClcbiAgICAuYXR0cihcInZlcnNpb25cIiwgXCIxLjFcIilcbiAgICAuYXR0cihcInhtbG5zXCIsIFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIik7XG5cbiAgICAvLyBwYXJzZSBhbmQgYWRkIHRoZSBDU1Mgc3R5bGluZyB1c2VkIGJ5IHRoZSBTVkdcbiAgICB2YXIgc3R5bGVzID0gcGFyc2VDc3NTdHlsZXMoc3ZnT2JqLmdldCgpKTtcbiAgICAkc3ZnQ29weS5wcmVwZW5kKHN0eWxlcyk7XG5cbiAgICAkKFwiI1wiICsgdGVtcERvd25sb2FkRGl2SWQpLmh0bWwoJycpLmhpZGUoKTtcbiAgICB2YXIgc3ZnSHRtbCA9ICQoXCIjXCIgKyB0ZW1wRG93bmxvYWREaXZJZCkuYXBwZW5kKCRzdmdDb3B5KS5odG1sKCk7XG5cbiAgICB2YXIgc3ZnQmxvYiA9IG5ldyBCbG9iKFtzdmdIdG1sXSwge3R5cGU6IFwiaW1hZ2Uvc3ZnK3htbFwifSk7XG4gICAgc2F2ZUFzKHN2Z0Jsb2IsIGRvd25sb2FkRmlsZU5hbWUpO1xuXG4gICAgLy8gY2xlYXIgdGhlIHRlbXAgZG93bmxvYWQgZGl2XG4gICAgJChcIiNcIiArIHRlbXBEb3dubG9hZERpdklkKS5odG1sKCcnKS5oaWRlKCk7XG59XG4vKipcbiAqIEEgZnVuY3Rpb24gZm9yIHBhcnNpbmcgdGhlIENTUyBzdHlsZSBzaGVldCBhbmQgaW5jbHVkaW5nIHRoZSBzdHlsZSBwcm9wZXJ0aWVzIGluIHRoZSBkb3dubG9hZGFibGUgU1ZHLlxuICogQHBhcmFtIGRvbVxuICogQHJldHVybnMge0VsZW1lbnR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNzc1N0eWxlcyAoZG9tKSB7XG4gICAgdmFyIHVzZWQgPSBcIlwiO1xuICAgIHZhciBzaGVldHMgPSBkb2N1bWVudC5zdHlsZVNoZWV0cztcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2hlZXRzLmxlbmd0aDsgaSsrKSB7IC8vIFRPRE86IHdhbGsgdGhyb3VnaCB0aGlzIGJsb2NrIG9mIGNvZGVcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHNoZWV0c1tpXS5jc3NSdWxlcyA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgICAgIHZhciBydWxlcyA9IHNoZWV0c1tpXS5jc3NSdWxlcztcblxuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBydWxlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBydWxlID0gcnVsZXNbal07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZihydWxlLnN0eWxlKSAhPSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbGVtcztcbiAgICAgICAgICAgICAgICAgICAgLy9Tb21lIHNlbGVjdG9ycyB3b24ndCB3b3JrLCBhbmQgbW9zdCBvZiB0aGVzZSBkb24ndCBtYXR0ZXIuXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtcyA9ICQoZG9tKS5maW5kKHJ1bGUuc2VsZWN0b3JUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VkICs9IHJ1bGUuc2VsZWN0b3JUZXh0ICsgXCIgeyBcIiArIHJ1bGUuc3R5bGUuY3NzVGV4dCArIFwiIH1cXG5cIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gSW4gRmlyZWZveCwgaWYgc3R5bGVzaGVldCBvcmlnaW5hdGVzIGZyb20gYSBkaWZmIGRvbWFpbixcbiAgICAgICAgICAgIC8vIHRyeWluZyB0byBhY2Nlc3MgdGhlIGNzc1J1bGVzIHdpbGwgdGhyb3cgYSBTZWN1cml0eUVycm9yLlxuICAgICAgICAgICAgLy8gSGVuY2UsIHdlIG11c3QgdXNlIGEgdHJ5L2NhdGNoIHRvIGhhbmRsZSB0aGlzIGluIEZpcmVmb3hcbiAgICAgICAgICAgIGlmIChlLm5hbWUgIT09ICdTZWN1cml0eUVycm9yJykgdGhyb3cgZTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIHMuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3RleHQvY3NzJyk7XG4gICAgcy5pbm5lckhUTUwgPSBcIjwhW0NEQVRBW1xcblwiICsgdXNlZCArIFwiXFxuXV0+XCI7XG5cbiAgICByZXR1cm4gcztcbn1cbiIsIi8qKlxuICogQ3JlYXRlIGEgdG9vbGJhclxuICogVGhpcyBjbGFzcyB1c2VzIGEgbG90IG9mIGpRdWVyeSBmb3IgZG9tIGVsZW1lbnQgbWFuaXB1bGF0aW9uXG4gKi9cblxuaW1wb3J0IHtzZWxlY3R9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7cGFyc2VDc3NTdHlsZXN9IGZyb20gXCIuL3V0aWxzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRvb2xiYXIge1xuICAgIGNvbnN0cnVjdG9yKGRvbUlkLCB0b29sdGlwPXVuZGVmaW5lZCwgdmVydGljYWw9ZmFsc2Upe1xuICAgICAgICAkKGAjJHtkb21JZH1gKS5zaG93KCk7IC8vIGlmIGhpZGRlblxuXG4gICAgICAgIC8vIGFkZCBhIG5ldyBiYXJncm91cCBkaXYgdG8gZG9tSUQgd2l0aCBib290c3RyYXAgYnV0dG9uIGNsYXNzZXNcbiAgICAgICAgY29uc3QgYnRuQ2xhc3NlcyA9IHZlcnRpY2FsPydidG4tZ3JvdXAtdmVydGljYWwgYnRuLWdyb3VwLXNtJzogJ2J0bi1ncm91cCBidG4tZ3JvdXAtc20nO1xuICAgICAgICB0aGlzLmJhciA9ICQoJzxkaXYvPicpLmFkZENsYXNzKGJ0bkNsYXNzZXMpLmFwcGVuZFRvKGAjJHtkb21JZH1gKTtcbiAgICAgICAgdGhpcy5idXR0b25zID0ge307XG4gICAgICAgIHRoaXMudG9vbHRpcCA9IHRvb2x0aXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgZG93bmxvYWQgYnV0dG9uIGZvciBTVkdcbiAgICAgKiBAcGFyYW0gaWQge1N0cmluZ30gdGhlIGJ1dHRvbiBkb20gSURcbiAgICAgKiBAcGFyYW0gc3ZnSWQge1N0cmluZ30gdGhlIFNWRyBkb20gSUQgdG8gZ3JhYiBhbmQgZG93bmxvYWRcbiAgICAgKiBAcGFyYW0gb3V0ZmlsZU5hbWUge1N0cmluZ30gdGhlIGRvd25sb2FkIGZpbGUgbmFtZVxuICAgICAqIEBwYXJhbSBjbG9uZUlkIHtTdHJpbmd9IHRoZSBjbG9uZWQgU1ZHIGRvbSBJRFxuICAgICAqIEBwYXJhbSBpY29uIHtTdHJpbmd9IGEgZm9udGF3ZXNvbWUncyBpY29uIGNsYXNzIG5hbWVcbiAgICAgKi9cbiAgICBjcmVhdGVEb3dubG9hZFN2Z0J1dHRvbihpZCwgc3ZnSWQsIG91dGZpbGVOYW1lLCBjbG9uZUlkLCBpY29uPSdmYS1kb3dubG9hZCcpe1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gdGhpcy5jcmVhdGVCdXR0b24oaWQsIGljb24pO1xuICAgICAgICBzZWxlY3QoYCMke2lkfWApXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLmRvd25sb2FkU3ZnKHN2Z0lkLCBvdXRmaWxlTmFtZSwgY2xvbmVJZCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdtb3VzZW92ZXInLCAoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbHRpcC5zaG93KFwiRG93bmxvYWRcIik7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdtb3VzZW91dCcsICgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy50b29sdGlwLmhpZGUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNyZWF0ZVJlc2V0QnV0dG9uKGlkLCBjYWxsYmFjaywgaWNvbj0nZmEtZXhwYW5kLWFycm93cy1hbHQnKXtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9IHRoaXMuY3JlYXRlQnV0dG9uKGlkLCBpY29uKTtcbiAgICAgICAgc2VsZWN0KGAjJHtpZH1gKVxuICAgICAgICAgICAgLm9uKCdjbGljaycsIGNhbGxiYWNrKVxuICAgICAgICAgICAgLm9uKCdtb3VzZW92ZXInLCAoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbHRpcC5zaG93KFwiUmVzZXQgdGhlIHNjYWxlc1wiKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ21vdXNlb3V0JywgKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2x0aXAuaGlkZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY3JlYXRlIGEgYnV0dG9uIHRvIHRoZSB0b29sYmFyXG4gICAgICogQHBhcmFtIGlkIHtTdHJpbmd9IHRoZSBidXR0b24ncyBpZFxuICAgICAqIEBwYXJhbSBpY29uIHtTdHJpbmd9IGEgZm9udGF3ZXNvbWUgaWNvbiBjbGFzc1xuICAgICAqIERlcGVuZGVuY2llczogQm9vdHN0cmFwLCBqUXVlcnksIEZvbnRhd2Vzb21lXG4gICAgICovXG4gICAgY3JlYXRlQnV0dG9uKGlkLCBpY29uPSdmYS1kb3dubG9hZCcpe1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnPGEvPicpLmF0dHIoJ2lkJywgaWQpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2J0biBidG4tZGVmYXVsdCcpLmFwcGVuZFRvKHRoaXMuYmFyKTtcbiAgICAgICAgJCgnPGkvPicpLmFkZENsYXNzKGBmYSAke2ljb259YCkuYXBwZW5kVG8oJGJ1dHRvbik7XG4gICAgICAgIHRoaXMuYnV0dG9uc1tpZF0gPSAkYnV0dG9uO1xuICAgICAgICByZXR1cm4gJGJ1dHRvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBhdHRhY2ggYSB0b29sdGlwIGRvbSB3aXRoIHRoZSB0b29sYmFyXG4gICAgICogQHBhcmFtIHRvb2x0aXAge1Rvb2x0aXB9XG4gICAgICovXG4gICAgYXR0YWNoVG9vbHRpcCh0b29sdGlwKXtcbiAgICAgICAgdGhpcy50b29sdGlwID0gdG9vbHRpcDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZCBTVkcgb2JqXG4gICAgICogQHBhcmFtIHN2Z0lkIHtTdHJpbmd9IHRoZSBTVkcgZG9tIElEXG4gICAgICogQHBhcmFtIGZpbGVOYW1lIHtTdHJpbmd9IHRoZSBvdXRwdXQgZmlsZSBuYW1lXG4gICAgICogQHBhcmFtIGNsb25lSWQge1N0cmluZ30gdGhlIHRlbXBvcmFyeSBkb20gSUQgdG8gY29weSB0aGUgU1ZHIHRvXG4gICAgICogRGVwZW5kZW5jaWVzOiBGaWxlU2F2ZXJcbiAgICAgKi9cbiAgICBkb3dubG9hZFN2ZyhzdmdJZCwgZmlsZU5hbWUsIGNsb25lSWQpe1xuICAgICAgICAvLyBsZXQgc3ZnT2JqID0gJCgkKCQoYCR7XCIjXCIgK3N2Z0lkfSBzdmdgKSlbMF0pOyAvLyBjb21wbGljYXRlZCBqUXVlcnkgdG8gZ2V0IHRvIHRoZSBTVkcgb2JqZWN0XG4gICAgICAgIGxldCBzdmdPYmogPSAkKCQoJChgJHtcIiNcIiArc3ZnSWR9YCkpWzBdKTtcbiAgICAgICAgbGV0ICRzdmdDb3B5ID0gc3ZnT2JqLmNsb25lKClcbiAgICAgICAgLmF0dHIoXCJ2ZXJzaW9uXCIsIFwiMS4xXCIpXG4gICAgICAgIC5hdHRyKFwieG1sbnNcIiwgXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiKTtcblxuICAgICAgICAvLyBwYXJzZSBhbmQgYWRkIGFsbCB0aGUgQ1NTIHN0eWxpbmcgdXNlZCBieSB0aGUgU1ZHXG4gICAgICAgIGxldCBzdHlsZXMgPSBwYXJzZUNzc1N0eWxlcyhzdmdPYmouZ2V0KCkpO1xuICAgICAgICAkc3ZnQ29weS5wcmVwZW5kKHN0eWxlcyk7XG5cbiAgICAgICAgJChcIiNcIiArIGNsb25lSWQpLmh0bWwoJycpLmhpZGUoKTsgLy8gbWFrZSBzdXJlIHRoZSBjb3B5SUQgaXMgaW52aXNpYmxlXG4gICAgICAgIGxldCBzdmdIdG1sID0gJChgIyR7Y2xvbmVJZH1gKS5hcHBlbmQoJHN2Z0NvcHkpLmh0bWwoKTtcblxuICAgICAgICBsZXQgc3ZnQmxvYiA9IG5ldyBCbG9iKFtzdmdIdG1sXSwge3R5cGU6IFwiaW1hZ2Uvc3ZnK3htbFwifSk7XG4gICAgICAgIHNhdmVBcyhzdmdCbG9iLCBmaWxlTmFtZSk7IC8vIHRoaXMgaXMgYSBGaWxlU2F2ZXIgZnVuY3Rpb24uLi4uXG5cbiAgICAgICAgLy8gY2xlYXIgdGhlIHRlbXAgZG93bmxvYWQgZGl2XG4gICAgICAgICQoYCMke2Nsb25lSWR9YCkuaHRtbCgnJykuaGlkZSgpO1xuICAgIH1cbn0iLCIvKlxuSW5wdXQgZGF0YSBzdHJ1Y3R1cmU6IGEgbGlzdCBvZiBkYXRhIG9iamVjdCB3aXRoIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxuW1xuICAgIHtcbiAgICAgICAgZ3JvdXA6IFwiZ3JvdXAxXCJcbiAgICAgICAgbGFiZWw6IFwiZGF0YXNldCAxXCIsXG4gICAgICAgIHZhbHVlczogW2EgbGlzdCBvZiBudW1lcmljYWwgdmFsdWVzXVxuICAgICB9LFxuICAgICB7XG4gICAgICAgIGdyb3VwOiBcImdyb3VwMVwiXG4gICAgICAgIGxhYmVsOiBcImRhdGFzZXQgMlwiLFxuICAgICAgICB2YWx1ZXM6IFthIGxpc3Qgb2YgbnVtZXJpY2FsIHZhbHVlc11cbiAgICAgfSxcbiAgICAge1xuICAgICAgICBncm91cDogXCJncm91cDJcIlxuICAgICAgICBsYWJlbDogXCJkYXRhc2V0IDNcIixcbiAgICAgICAgdmFsdWVzOiBbYSBsaXN0IG9mIG51bWVyaWNhbCB2YWx1ZXNdXG4gICAgIH1cbl1cbiovXG5cbmltcG9ydCB7ZXh0ZW50LCBtZWRpYW4sIGFzY2VuZGluZywgcXVhbnRpbGUsIG1heCwgbWlufSBmcm9tIFwiZDMtYXJyYXlcIjtcbmltcG9ydCB7bmVzdH0gZnJvbSBcImQzLWNvbGxlY3Rpb25cIjtcbmltcG9ydCB7c2NhbGVCYW5kLCBzY2FsZUxpbmVhcn0gZnJvbSBcImQzLXNjYWxlXCI7XG5pbXBvcnQge2FyZWF9IGZyb20gXCJkMy1zaGFwZVwiO1xuaW1wb3J0IHtheGlzVG9wLCBheGlzQm90dG9tLCBheGlzTGVmdH0gZnJvbSBcImQzLWF4aXNcIjtcbmltcG9ydCB7c2VsZWN0LCBzZWxlY3RBbGwsIGV2ZW50fSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQge2JydXNofSBmcm9tIFwiZDMtYnJ1c2hcIjtcblxuaW1wb3J0IHtrZXJuZWxEZW5zaXR5RXN0aW1hdG9yLCBrZXJuZWwsIGtlcm5lbEJhbmR3aWR0aH0gZnJvbSBcIi4va2RlXCI7XG5pbXBvcnQgVG9vbHRpcCBmcm9tIFwiLi9Ub29sdGlwXCI7XG5pbXBvcnQgVG9vbGJhciBmcm9tIFwiLi9Ub29sYmFyXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdyb3VwZWRWaW9saW4ge1xuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yIGZvciBHcm91cGVkVmlvbGluXG4gICAgICogQHBhcmFtIGRhdGEge0xpc3R9OiBhIGxpc3Qgb2Ygb2JqZWN0cyB3aXRoIGF0dHJpYnV0ZXM6IGdyb3VwOiB7U3RyaW5nfSwgbGFiZWw6IHtTdHJpbmd9LCB2YWx1ZXM6IHtMaXN0fSBvZiBudW1lcmljYWwgdmFsdWVzLCBzaXplOiBpbnRlZ2VyLCBvcHRpb25hbFxuICAgICAqIEBwYXJhbSBncm91cEluZm8ge0RpY3Rpb25hcnl9OiBtZXRhZGF0YSBvZiB0aGUgZ3JvdXAsIGluZGV4ZWQgYnkgZ3JvdXAgSURcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihkYXRhLCBncm91cEluZm8gPSB7fSl7XG4gICAgICAgIHRoaXMuX3Nhbml0eUNoZWNrKGRhdGEpO1xuICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLmdyb3VwSW5mbyA9IGdyb3VwSW5mbztcbiAgICAgICAgdGhpcy50b29sYmFyID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnRvb2x0aXAgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tIHtET019IHRoZSBTVkcgZG9tIG9iamVjdCB0byBhcHBlbmQgdGhlIHZpb2xpbiBwbG90IHRvXG4gICAgICogQHBhcmFtIHdpZHRoIHtGbG9hdH1cbiAgICAgKiBAcGFyYW0gaGVpZ2h0IHtGbG9hdH1cbiAgICAgKiBAcGFyYW0geFBhZGRpbmcge0Zsb2F0fSBwYWRkaW5nIG9mIHRoZSB4IGF4aXNcbiAgICAgKiBAcGFyYW0geERvbWFpbiB7TGlzdH0gdGhlIG9yZGVyIG9mIFggZ3JvdXBzXG4gICAgICogQHBhcmFtIHlEb21haW4gIHtMaXN0fSB0aGUgbWluIGFuZCBtYXggdmFsdWVzIG9mIHRoZSB5IGRvbWFpblxuICAgICAqIEBwYXJhbSB5TGFiZWwge1N0cmluZ31cbiAgICAgKiBAcGFyYW0gc2hvd1hcbiAgICAgKiBAcGFyYW0gc2hvd1N1YlhcbiAgICAgKiBAcGFyYW0gc3ViWEFuZ2xlXG4gICAgICogQHBhcmFtIHNob3dXaGlza2VyXG4gICAgICogQHBhcmFtIHNob3dEaXZpZGVyXG4gICAgICogQHBhcmFtIHNob3dMZWdlbmRcbiAgICAgKiBAcGFyYW0gc2hvd1NpemVcbiAgICAgKi9cblxuICAgIHJlbmRlcihkb20sIHdpZHRoPTUwMCwgaGVpZ2h0PTM1NywgeFBhZGRpbmc9MC4wNSwgeERvbWFpbj11bmRlZmluZWQsIHlEb21haW49Wy0zLDNdLCB5TGFiZWw9XCJZIGF4aXNcIixcbiAgICAgICAgICAgc2hvd1g9dHJ1ZSwgc2hvd1N1Ylg9dHJ1ZSwgc3ViWEFuZ2xlPTAsXG4gICAgICAgICAgIHNob3dXaGlza2VyPWZhbHNlLCBzaG93RGl2aWRlcj1mYWxzZSwgc2hvd0xlZ2VuZD1mYWxzZSwgc2hvd1NpemU9ZmFsc2Upe1xuXG4gICAgICAgIC8vIGRlZmluZSB0aGUgcmVzZXQgZm9yIHRoaXMgcGxvdFxuICAgICAgICB0aGlzLnJlc2V0ID0gKCkgPT4ge1xuICAgICAgICAgICAgZG9tLnNlbGVjdEFsbChcIipcIikucmVtb3ZlKCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcihkb20sIHdpZHRoLCBoZWlnaHQsIHhQYWRkaW5nLCB4RG9tYWluLCB5RG9tYWluLCB5TGFiZWwsIHNob3dYLCBzaG93U3ViWCwgc3ViWEFuZ2xlLCBzaG93V2hpc2tlciwgc2hvd0RpdmlkZXIsIHNob3dMZWdlbmQpO1xuICAgICAgICB9O1xuXG5cbiAgICAgICAgLy8gZGVmaW5lcyB0aGUgWCwgc3ViWCwgWSwgWiBzY2FsZXNcbiAgICAgICAgaWYgKHlEb21haW49PT11bmRlZmluZWQgfHwgMCA9PSB5RG9tYWluLmxlbmd0aCl7XG4gICAgICAgICAgICBsZXQgYWxsViA9IFtdO1xuICAgICAgICAgICAgdGhpcy5kYXRhLmZvckVhY2goKGQpID0+IGFsbFYgPSBhbGxWLmNvbmNhdChkLnZhbHVlcykpO1xuICAgICAgICAgICAgeURvbWFpbiA9IGV4dGVudChhbGxWKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlLW9yZ2FuaXplZCB0aGlzLmRhdGEgaW5kZXhlZCBieSBncm91cHNcbiAgICAgICAgdGhpcy5ncm91cHMgPSBuZXN0KClcbiAgICAgICAgICAgIC5rZXkoKGQpID0+IGQuZ3JvdXApXG4gICAgICAgICAgICAuZW50cmllcyh0aGlzLmRhdGEpO1xuXG4gICAgICAgIHRoaXMuc2NhbGUgPSB7XG4gICAgICAgICAgICB4OiBzY2FsZUJhbmQoKVxuICAgICAgICAgICAgICAgIC5yYW5nZVJvdW5kKFswLCB3aWR0aF0pXG4gICAgICAgICAgICAgICAgLmRvbWFpbih4RG9tYWlufHx0aGlzLmdyb3Vwcy5tYXAoKGQpID0+IGQua2V5KSlcbiAgICAgICAgICAgICAgICAucGFkZGluZ0lubmVyKHhQYWRkaW5nKSxcbiAgICAgICAgICAgIHN1Yng6IHNjYWxlQmFuZCgpLFxuICAgICAgICAgICAgeTogc2NhbGVMaW5lYXIoKVxuICAgICAgICAgICAgICAgIC5yYW5nZVJvdW5kKFtoZWlnaHQsIDBdKVxuICAgICAgICAgICAgICAgIC5kb21haW4oeURvbWFpbiksXG4gICAgICAgICAgICB6OiBzY2FsZUxpbmVhcigpIC8vIHRoaXMgaXMgdGhlIHZpb2xpbiB3aWR0aCwgdGhlIGRvbWFpbiBhbmQgcmFuZ2UgYXJlIGRldGVybWluZWQgbGF0ZXIgaW5kaXZpZHVhbGx5IGZvciBlYWNoIHZpb2xpblxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGZvciBlYWNoIGdyb3VwXG4gICAgICAgIHRoaXMuZ3JvdXBzLmZvckVhY2goKGcpID0+IHtcbiAgICAgICAgICAgIGxldCBncm91cCA9IGcua2V5O1xuICAgICAgICAgICAgbGV0IGVudHJpZXMgPSBnLnZhbHVlcztcbiAgICAgICAgICAgIGxldCBpbmZvID0gdGhpcy5ncm91cEluZm9bZ3JvdXBdOyAvLyBvcHRpb25hbFxuICAgICAgICAgICAgZy5pbmRleCA9IHRoaXMuc2NhbGUueC5kb21haW4oKS5pbmRleE9mKGdyb3VwKTtcblxuICAgICAgICAgICAgaWYgKGluZm8gIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgIC8vIHJlbmRlcnMgZ3JvdXAgaW5mbyBzdWNoIGFzIHAtdmFsdWUsIGdyb3VwIG5hbWVcbiAgICAgICAgICAgICAgICBjb25zdCBncm91cEluZm9Eb20gPSBkb20uYXBwZW5kKFwiZ1wiKTtcbiAgICAgICAgICAgICAgICBjb25zdCBncm91cExhYmVscyA9IGdyb3VwSW5mb0RvbS5zZWxlY3RBbGwoXCIudmlvbGluLWdyb3VwLWxhYmVsXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKFsncHZhbHVlJ10pO1xuICAgICAgICAgICAgICAgIGdyb3VwTGFiZWxzLmVudGVyKCkuYXBwZW5kKFwidGV4dFwiKSAvLyBDb2RlIHJldmlldzogY29uc2lkZXIgbW92aW5nIHRoaXMgcGFydCB0byB0aGUgZVFUTCBkYXNoYm9hcmRcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIDApXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCAwKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidmlvbGluLWdyb3VwLWxhYmVsXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCAoZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coaW5mb1sncHZhbHVlVGhyZXNob2xkJ10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQ9PSdwdmFsdWUnJiZwYXJzZUZsb2F0KGluZm9bZF0pPD1wYXJzZUZsb2F0KGluZm9bJ3B2YWx1ZVRocmVzaG9sZCddKT9cIm9yYW5nZXJlZFwiOlwiU2xhdGVHcmF5XCJcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgKGQsIGkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB4ID0gdGhpcy5zY2FsZS54KGdyb3VwKSArIHRoaXMuc2NhbGUueC5iYW5kd2lkdGgoKS8yO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHkgPSB0aGlzLnNjYWxlLnkoeURvbWFpblswXSkgKyA1MDsgLy8gdG9kbzogYXZvaWQgaGFyZC1jb2RlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgdHJhbnNsYXRlKCR7eH0sICR7eX0pYFxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAudGV4dCgoZCkgPT4gYCR7ZH06ICR7cGFyc2VGbG9hdChwYXJzZUZsb2F0KGluZm9bZF0pLnRvUHJlY2lzaW9uKDMpKS50b0V4cG9uZW50aWFsKCl9YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGRlZmluZXMgdGhlIHRoaXMuc2NhbGUuc3VieCBiYXNlZCBvbiB0aGlzLnNjYWxlLnhcbiAgICAgICAgICAgIHRoaXMuc2NhbGUuc3VieFxuICAgICAgICAgICAgICAgIC5kb21haW4oZW50cmllcy5tYXAoKGQpID0+IGQubGFiZWwpKVxuICAgICAgICAgICAgICAgIC5yYW5nZVJvdW5kKFt0aGlzLnNjYWxlLngoZ3JvdXApLCB0aGlzLnNjYWxlLngoZ3JvdXApICsgdGhpcy5zY2FsZS54LmJhbmR3aWR0aCgpXSk7XG5cbiAgICAgICAgICAgIGVudHJpZXMuZm9yRWFjaCgoZW50cnkpID0+IHtcblxuICAgICAgICAgICAgICAgIGlmICgwID09IGVudHJ5LnZhbHVlcy5sZW5ndGgpIHJldHVybjsgLy8gbm8gZnVydGhlciByZW5kZXJpbmcgaWYgdGhpcyBncm91cCBoYXMgbm8gZW50cmllc1xuICAgICAgICAgICAgICAgIGVudHJ5LnZhbHVlcyA9IGVudHJ5LnZhbHVlcy5zb3J0KGFzY2VuZGluZyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZHJhd1Zpb2xpbihkb20sIGVudHJ5LCBzaG93V2hpc2tlciwgZy5pbmRleCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gYWRkcyB0aGUgc3ViLXggYXhpcyBpZiB0aGVyZSBhcmUgbW9yZSB0aGFuIG9uZSBlbnRyaWVzXG4gICAgICAgICAgICB2YXIgYnVmZmVyID0gMTU7XG4gICAgICAgICAgICBpZiAoc2hvd1NpemUpe1xuICAgICAgICAgICAgICAgICBjb25zdCBzaXplU2NhbGUgPSBzY2FsZUJhbmQoKVxuICAgICAgICAgICAgICAgICAgICAuZG9tYWluKGVudHJpZXMubWFwKChkKSA9PiB7cmV0dXJuIGQuc2l6ZT09dW5kZWZpbmVkPycoMCknOmAoJHtkLnNpemV8fDB9KWB9KSlcbiAgICAgICAgICAgICAgICAgICAgLnJhbmdlUm91bmQoW3RoaXMuc2NhbGUueChncm91cCksIHRoaXMuc2NhbGUueChncm91cCkgKyB0aGlzLnNjYWxlLnguYmFuZHdpZHRoKCldKTtcbiAgICAgICAgICAgICAgICAgY29uc3Qgc2l6ZXhHID0gZG9tLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ2aW9saW4tc2l6ZS1heGlzXCIpXG4gICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBgdHJhbnNsYXRlKDAsICR7aGVpZ2h0ICsgYnVmZmVyfSlgKVxuICAgICAgICAgICAgICAgICAgICAgLmNhbGwoYXhpc0JvdHRvbShzaXplU2NhbGUpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNob3dTdWJYKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJ1ZmZlciA9IDU7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3VieEcgPSBkb20uYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidmlvbGluLXN1Yi1heGlzXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoMCwgJHtoZWlnaHQgKyBidWZmZXJ9KWApXG4gICAgICAgICAgICAgICAgICAgIC5jYWxsKGF4aXNCb3R0b20odGhpcy5zY2FsZS5zdWJ4KSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoc3ViWEFuZ2xlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBzdWJ4Ry5zZWxlY3RBbGwoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcInN0YXJ0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBgcm90YXRlKCR7c3ViWEFuZ2xlfSwgMiwgMTApYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcmVuZGVycyB0aGUgeCBheGlzXG4gICAgICAgIGxldCBidWZmZXIgPSBzaG93U3ViWD81NTowOyAvLyBDb2RlIHJldmlldzogaGFyZC1jb2RlZCB2YWx1ZXNcbiAgICAgICAgdGhpcy54QXhpcyA9IHNob3dYP2F4aXNCb3R0b20odGhpcy5zY2FsZS54KTpheGlzQm90dG9tKHRoaXMuc2NhbGUueCkudGlja0Zvcm1hdChcIlwiKTtcbiAgICAgICAgZG9tLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ2aW9saW4teC1heGlzIGF4aXMtLXhcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoMCwgJHtoZWlnaHQgKyBidWZmZXJ9KWApXG4gICAgICAgICAgICAuY2FsbCh0aGlzLnhBeGlzKSAvLyBzZXQgdGlja0Zvcm1hdChcIlwiKSB0byBzaG93IHRpY2sgbWFya3Mgd2l0aG91dCB0ZXh0IGxhYmVsc1xuICAgICAgICAgICAgLnNlbGVjdEFsbChcInRleHRcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwic3RhcnRcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKDMwLCAtMTAsIDEwKVwiKTtcblxuICAgICAgICAvLyBhZGRzIHRoZSB5IEF4aXNcbiAgICAgICAgYnVmZmVyID0gNTtcbiAgICAgICAgdGhpcy55QXhpcyA9IGF4aXNMZWZ0KHRoaXMuc2NhbGUueSlcbiAgICAgICAgICAgICAgICAgICAgLnRpY2tWYWx1ZXModGhpcy5zY2FsZS55LnRpY2tzKDUpKTtcbiAgICAgICAgZG9tLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ2aW9saW4teS1heGlzIGF4aXMtLXlcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoLSR7YnVmZmVyfSwgMClgKVxuICAgICAgICAgICAgLmNhbGwodGhpcy55QXhpcyk7XG5cbiAgICAgICAgLy8gYWRkcyB0aGUgdGV4dCBsYWJlbCBmb3IgdGhlIHkgYXhpc1xuICAgICAgICBkb20uYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIC00MCkgLy8gdG9kbzogYXZvaWQgaGFyZC1jb2RlZCB2YWx1ZVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIC00MClcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ2aW9saW4tYXhpcy1sYWJlbFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcInN0YXJ0XCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInJvdGF0ZSgtOTApXCIpXG4gICAgICAgICAgICAudGV4dCh5TGFiZWwpO1xuXG4gICAgICAgIC8vIHBsb3QgbW91c2UgZXZlbnRzXG4gICAgICAgIGRvbS5vbihcIm1vdXNlb3V0XCIsICgpPT57XG4gICAgICAgICAgICBpZih0aGlzLnRvb2x0aXAgIT09IHVuZGVmaW5lZCkgdGhpcy50b29sdGlwLmhpZGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gYWRkIGdyb3VwIGRpdmlkZXJzXG4gICAgICAgIGlmKHNob3dEaXZpZGVyKXtcbiAgICAgICAgICAgIHRoaXMuX2FkZEdyb3VwRGl2aWRlcihkb20pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWRkIGNvbG9yIGxlZ2VuZFxuICAgICAgICBpZiAoc2hvd0xlZ2VuZCkge1xuICAgICAgICAgICAgY29uc3QgbGVnZW5kRyA9IGRvbS5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJpZFwiLCBcInZpb2xpbkxlZ2VuZFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoMCwgMClgKTtcblxuICAgICAgICAgICAgbGVnZW5kRy5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHRoaXMuc2NhbGUueC5yYW5nZSgpWzBdKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCAtMzUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCA2MCoodGhpcy5ncm91cHNbMF0udmFsdWVzLmxlbmd0aCkgKyAxMClcbiAgICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCAyNClcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIFwibm9uZVwiKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZVwiLCBcInNpbHZlclwiKTtcblxuICAgICAgICAgICAgY29uc3QgbGVnZW5kcyA9IGxlZ2VuZEcuc2VsZWN0QWxsKFwiLnZpb2xpbi1sZWdlbmRcIikuZGF0YSh0aGlzLmdyb3Vwc1swXS52YWx1ZXMpO1xuXG5cbiAgICAgICAgICAgIGNvbnN0IGcgPSBsZWdlbmRzLmVudGVyKCkuYXBwZW5kKFwiZ1wiKS5jbGFzc2VkKFwidmlvbGluLWxlZ2VuZFwiLCB0cnVlKTtcbiAgICAgICAgICAgIGNvbnN0IHcgPSAxMDtcbiAgICAgICAgICAgIGcuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieFwiLCAoZCwgaSkgPT4gNSArIDYwKihpKSAgKyB0aGlzLnNjYWxlLngucmFuZ2UoKVswXSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInlcIiwgLTI4KVxuICAgICAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgdylcbiAgICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCB3KVxuICAgICAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgKGQpID0+IGQuY29sb3IpO1xuXG4gICAgICAgICAgICBnLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidmlvbGluLWxlZ2VuZC10ZXh0XCIpXG4gICAgICAgICAgICAgICAgLnRleHQoKGQpID0+IGQubGFiZWwpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIChkLCBpKSA9PiAxNyArIDYwKihpKSArIHRoaXMuc2NhbGUueC5yYW5nZSgpWzBdKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCAtMjApO1xuICAgICAgICB9XG5cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgdG9vbHRpcCBvYmplY3RcbiAgICAgKiBAcGFyYW0gZG9tSWQge1N0cmluZ30gdGhlIHRvb2x0aXAncyBkb20gSURcbiAgICAgKiBAcmV0dXJucyB7VG9vbHRpcH1cbiAgICAgKi9cbiAgICBjcmVhdGVUb29sdGlwKGRvbUlkKXtcbiAgICAgICAgdGhpcy50b29sdGlwID0gbmV3IFRvb2x0aXAoZG9tSWQpO1xuICAgICAgICBzZWxlY3QoYCMke2RvbUlkfWApLmNsYXNzZWQoJ3Zpb2xpbi10b29sdGlwJywgdHJ1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzLnRvb2x0aXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHRoZSB0b29sYmFyIHBhbmVsXG4gICAgICogQHBhcmFtIGRvbUlkIHtTdHJpbmd9IHRoZSB0b29sYmFyJ3MgZG9tIElEXG4gICAgICogQHBhcmFtIHRvb2x0aXAge1Rvb2x0aXB9XG4gICAgICogQHJldHVybnMge1Rvb2xiYXJ9XG4gICAgICovXG5cbiAgICBjcmVhdGVUb29sYmFyKGRvbUlkLCB0b29sdGlwKXtcbiAgICAgICAgLy8gaWYgKHRvb2x0aXAgPT09IHVuZGVmaW5lZCkgdG9vbHRpcCA9IHRoaXMuY3JlYXRlVG9vbHRpcChkb21JZCk7XG4gICAgICAgIHRoaXMudG9vbGJhciA9IG5ldyBUb29sYmFyKGRvbUlkLCB0b29sdGlwKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9vbGJhcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBicnVzaCB0byB0aGUgcGxvdFxuICAgICAqIEBwYXJhbSBkb20ge0QzfSBEb20gZWxlbWVudFxuICAgICAqL1xuICAgIGFkZEJydXNoKGRvbSl7XG4gICAgICAgIGNvbnN0IHRoZUJydXNoID0gYnJ1c2goKTtcbiAgICAgICAgdGhlQnJ1c2gub24oXCJlbmRcIiwgKCk9Pnt0aGlzLnpvb20oZG9tLCB0aGVCcnVzaCl9KTtcbiAgICAgICAgZG9tLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJicnVzaFwiKVxuICAgICAgICAgICAgLmNhbGwodGhlQnJ1c2gpO1xuICAgIH1cblxuICAgIHpvb20oZG9tLCB0aGVCcnVzaCl7XG4gICAgICAgIGxldCBzID0gZXZlbnQuc2VsZWN0aW9uLFxuICAgICAgICAgICAgaWRlbFRpbWVvdXQsXG4gICAgICAgICAgICBpZGVsRGVsYXkgPSAzNTA7XG4gICAgICAgIGlmICh0aGVCcnVzaCA9PT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghcykge1xuICAgICAgICAgICAgaWYgKCFpZGVsVGltZW91dCkgcmV0dXJuIGlkZWxUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWRlbFRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgfSwgaWRlbERlbGF5KTtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcblxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gcmVzZXQgdGhlIGN1cnJlbnQgc2NhbGVzJyBkb21haW5zIGJhc2VkIG9uIHRoZSBicnVzaGVkIHdpbmRvd1xuICAgICAgICAgICAgdGhpcy5zY2FsZS54LmRvbWFpbih0aGlzLnNjYWxlLnguZG9tYWluKCkuZmlsdGVyKChkLCBpKT0+e1xuICAgICAgICAgICAgICAgICAgY29uc3QgbG93Qm91bmQgPSBNYXRoLmZsb29yKHNbMF1bMF0vdGhpcy5zY2FsZS54LmJhbmR3aWR0aCgpKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHVwcGVyQm91bmQgPSBNYXRoLmZsb29yKHNbMV1bMF0vdGhpcy5zY2FsZS54LmJhbmR3aWR0aCgpKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBpID49IGxvd0JvdW5kICYmIGkgPD11cHBlckJvdW5kO1xuICAgICAgICAgICAgfSkpOyAvLyBUT0RPOiBhZGQgY29tbWVudHNcblxuICAgICAgICAgICAgY29uc3QgbWluID0gTWF0aC5mbG9vcih0aGlzLnNjYWxlLnkuaW52ZXJ0KHNbMV1bMV0pKTtcbiAgICAgICAgICAgIGNvbnN0IG1heCA9IE1hdGguZmxvb3IodGhpcy5zY2FsZS55LmludmVydChzWzBdWzFdKSk7XG4gICAgICAgICAgICB0aGlzLnNjYWxlLnkuZG9tYWluKFttaW4sIG1heF0pOyAvLyB0b2RvOiBkZWJ1Z1xuXG4gICAgICAgICAgICBkb20uc2VsZWN0KFwiLmJydXNoXCIpLmNhbGwodGhlQnJ1c2gubW92ZSwgbnVsbCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgICAvLyB6b29tXG4gICAgICAgIGxldCB0ID0gZG9tLnRyYW5zaXRpb24oKS5kdXJhdGlvbig3NTApO1xuICAgICAgICBkb20uc2VsZWN0KFwiLmF4aXMtLXhcIikudHJhbnNpdGlvbih0KS5jYWxsKHRoaXMueEF4aXMpO1xuICAgICAgICBkb20uc2VsZWN0KFwiLmF4aXMtLXlcIikudHJhbnNpdGlvbih0KS5jYWxsKHRoaXMueUF4aXMpO1xuXG4gICAgICAgIHRoaXMuZ3JvdXBzLmZvckVhY2goKGdnLCBpKT0+IHtcbiAgICAgICAgICAgIGxldCBncm91cCA9IGdnLmtleTtcbiAgICAgICAgICAgIGxldCBlbnRyaWVzID0gZ2cudmFsdWVzO1xuXG4gICAgICAgICAgICAvLyByZS1kZWZpbmUgdGhlIHN1YngncyByYW5nZVxuICAgICAgICAgICAgdGhpcy5zY2FsZS5zdWJ4XG4gICAgICAgICAgICAgICAgLnJhbmdlUm91bmQoW3RoaXMuc2NhbGUueChncm91cCksIHRoaXMuc2NhbGUueChncm91cCkgKyB0aGlzLnNjYWxlLnguYmFuZHdpZHRoKCldKTtcblxuICAgICAgICAgICAgZW50cmllcy5mb3JFYWNoKChlbnRyeSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICgwID09IGVudHJ5LnZhbHVlcy5sZW5ndGgpIHJldHVybjsgLy8gbm8gZnVydGhlciByZW5kZXJpbmcgaWYgdGhpcyBncm91cCBoYXMgbm8gZW50cmllc1xuICAgICAgICAgICAgICAgIGNvbnN0IGdJbmRleCA9IHRoaXMuc2NhbGUueC5kb21haW4oKS5pbmRleE9mKGdyb3VwKTtcblxuXG4gICAgICAgICAgICAgICAgLy8gcmUtZGVmaW5lIHRoZSBzY2FsZS56J3MgcmFuZ2VcbiAgICAgICAgICAgICAgICB0aGlzLnNjYWxlLnpcbiAgICAgICAgICAgICAgICAgICAgLnJhbmdlKFt0aGlzLnNjYWxlLnN1YngoZW50cnkubGFiZWwpLCB0aGlzLnNjYWxlLnN1YngoZW50cnkubGFiZWwpICsgdGhpcy5zY2FsZS5zdWJ4LmJhbmR3aWR0aCgpXSk7XG5cbiAgICAgICAgICAgICAgICAvLyByZS1yZW5kZXIgdGhlIHZpb2xpblxuICAgICAgICAgICAgICAgIGNvbnN0IGcgPSBkb20uc2VsZWN0KGAjdmlvbGluJHtnZy5pbmRleH0tJHtlbnRyeS5sYWJlbH1gKTtcbiAgICAgICAgICAgICAgICBnLnNlbGVjdChcIi52aW9saW5cIilcbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24odClcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJkXCIsIGFyZWEoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLngwKChkKSA9PiB0aGlzLnNjYWxlLnooZFsxXSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAueDEoKGQpID0+IHRoaXMuc2NhbGUueigtZFsxXSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAueSgoZCkgPT4gdGhpcy5zY2FsZS55KGRbMF0pKVxuICAgICAgICAgICAgICAgICAgICApO1xuXG5cbiAgICAgICAgICAgICAgICAvLyByZS1yZW5kZXIgdGhlIGJveCBwbG90XG4gICAgICAgICAgICAgICAgLy8gaW50ZXJxdWFydGlsZSByYW5nZVxuICAgICAgICAgICAgICAgIGNvbnN0IHExID0gcXVhbnRpbGUoZW50cnkudmFsdWVzLCAwLjI1KTtcbiAgICAgICAgICAgICAgICBjb25zdCBxMyA9IHF1YW50aWxlKGVudHJ5LnZhbHVlcywgMC43NSk7XG4gICAgICAgICAgICAgICAgY29uc3QgeiA9IDAuMTtcbiAgICAgICAgICAgICAgICBnLnNlbGVjdChcIi52aW9saW4taXJcIilcbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24odClcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHRoaXMuc2NhbGUueigteikpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCB0aGlzLnNjYWxlLnkocTMpKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIE1hdGguYWJzKHRoaXMuc2NhbGUueigteikgLSB0aGlzLnNjYWxlLnooeikpKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBNYXRoLmFicyh0aGlzLnNjYWxlLnkocTMpIC0gdGhpcy5zY2FsZS55KHExKSkpO1xuXG4gICAgICAgICAgICAgICAgLy8gdGhlIG1lZGlhbiBsaW5lXG4gICAgICAgICAgICAgICAgY29uc3QgbWVkID0gbWVkaWFuKGVudHJ5LnZhbHVlcyk7XG4gICAgICAgICAgICAgICAgZy5zZWxlY3QoXCIudmlvbGluLW1lZGlhblwiKVxuICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbih0KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIHRoaXMuc2NhbGUueigteikpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgdGhpcy5zY2FsZS56KHopKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIHRoaXMuc2NhbGUueShtZWQpKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIHRoaXMuc2NhbGUueShtZWQpKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVuZGVyIHRoZSB2aW9saW4gYW5kIGJveCBwbG90c1xuICAgICAqIEBwYXJhbSBkb20ge0QzIERPTX1cbiAgICAgKiBAcGFyYW0gZW50cnkge09iamVjdH0gd2l0aCBhdHRyczogdmFsdWVzLCBsYWJlbFxuICAgICAqIEBwYXJhbSBzaG93V2hpc2tlciB7Qm9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9kcmF3VmlvbGluKGRvbSwgZW50cnksIHNob3dXaGlza2VyLCBnSW5kZXgpe1xuXG4gICAgICAgIC8vIGdlbmVyYXRlIHRoZSB2ZXJ0aWNlcyBmb3IgdGhlIHZpb2xpbiBwYXRoIHVzZSBhIGtkZVxuICAgICAgICBsZXQga2RlID0ga2VybmVsRGVuc2l0eUVzdGltYXRvcihcbiAgICAgICAgICAgIGtlcm5lbC5nYXVzc2lhbixcbiAgICAgICAgICAgIHRoaXMuc2NhbGUueS50aWNrcygxMDApLCAvLyB1c2UgdXAgdG8gMTAwIHZlcnRpY2VzIGFsb25nIHRoZSBZIGF4aXMgKHRvIGNyZWF0ZSB0aGUgdmlvbGluIHBhdGgpXG4gICAgICAgICAgICBrZXJuZWxCYW5kd2lkdGgubnJkKGVudHJ5LnZhbHVlcykgLy8gZXN0aW1hdGUgdGhlIGJhbmR3aWR0aCBiYXNlZCBvbiB0aGUgZGF0YVxuICAgICAgICApO1xuICAgICAgICBjb25zdCBlRG9tYWluID0gZXh0ZW50KGVudHJ5LnZhbHVlcyk7IC8vIGdldCB0aGUgbWF4IGFuZCBtaW4gaW4gZW50cnkudmFsdWVzXG4gICAgICAgIGNvbnN0IHZlcnRpY2VzID0ga2RlKGVudHJ5LnZhbHVlcykuZmlsdGVyKChkKT0+ZFswXT5lRG9tYWluWzBdJiZkWzBdPGVEb21haW5bMV0pOyAvLyBmaWx0ZXIgdGhlIHZlcnRpY2VzIHRoYXQgYXJlbid0IGluIHRoZSBlbnRyeS52YWx1ZXNcblxuICAgICAgICAvLyBkZWZpbmUgdGhlIHogc2NhbGUgLS0gdGhlIHZpb2xpbiB3aWR0aFxuICAgICAgICBsZXQgek1heCA9IG1heCh2ZXJ0aWNlcywgKGQpPT5NYXRoLmFicyhkWzFdKSk7IC8vIGZpbmQgdGhlIGFicyh2YWx1ZSkgaW4gZW50cnkudmFsdWVzXG4gICAgICAgIHRoaXMuc2NhbGUuelxuICAgICAgICAgICAgLmRvbWFpbihbLXpNYXgsIHpNYXhdKVxuICAgICAgICAgICAgLnJhbmdlKFt0aGlzLnNjYWxlLnN1YngoZW50cnkubGFiZWwpLCB0aGlzLnNjYWxlLnN1YngoZW50cnkubGFiZWwpICsgdGhpcy5zY2FsZS5zdWJ4LmJhbmR3aWR0aCgpXSk7XG5cbiAgICAgICAgLy8gdmlzdWFsIHJlbmRlcmluZ1xuICAgICAgICBjb25zdCB2aW9saW5HID0gZG9tLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGB2aW9saW4ke2dJbmRleH0tJHtlbnRyeS5sYWJlbH1gKTtcblxuICAgICAgICBsZXQgdmlvbGluID0gYXJlYSgpXG4gICAgICAgICAgICAueDAoKGQpID0+IHRoaXMuc2NhbGUueihkWzFdKSlcbiAgICAgICAgICAgIC54MSgoZCkgPT4gdGhpcy5zY2FsZS56KC1kWzFdKSlcbiAgICAgICAgICAgIC55KChkKSA9PiB0aGlzLnNjYWxlLnkoZFswXSkpO1xuXG4gICAgICAgIGNvbnN0IHZQYXRoID0gdmlvbGluRy5hcHBlbmQoXCJwYXRoXCIpXG4gICAgICAgICAgICAuZGF0dW0odmVydGljZXMpXG4gICAgICAgICAgICAuYXR0cihcImRcIiwgdmlvbGluKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2aW9saW5cIiwgdHJ1ZSlcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgKCk9PntcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkuY29sb3IgIT09IHVuZGVmaW5lZCkgcmV0dXJuIGVudHJ5LmNvbG9yO1xuICAgICAgICAgICAgICAgIC8vIGFsdGVybmF0ZSB0aGUgb2RkIGFuZCBldmVuIGNvbG9ycywgbWF5YmUgd2UgZG9uJ3Qgd2FudCB0aGlzIGZlYXR1cmVcbiAgICAgICAgICAgICAgICBpZihnSW5kZXglMiA9PSAwKSByZXR1cm4gXCIjOTBjMWMxXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiIzk0YThiOFwiO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gYm94cGxvdFxuICAgICAgICBjb25zdCBxMSA9IHF1YW50aWxlKGVudHJ5LnZhbHVlcywgMC4yNSk7XG4gICAgICAgIGNvbnN0IHEzID0gcXVhbnRpbGUoZW50cnkudmFsdWVzLCAwLjc1KTtcbiAgICAgICAgY29uc3QgeiA9IHRoaXMuc2NhbGUuei5kb21haW4oKVsxXS8zO1xuXG4gICAgICAgIGlmKHNob3dXaGlza2VyKXtcbiAgICAgICAgICAgIC8vIHRoZSB1cHBlciBhbmQgbG93ZXIgbGltaXRzIG9mIGVudHJ5LnZhbHVlc1xuICAgICAgICAgICAgY29uc3QgaXFyID0gTWF0aC5hYnMocTMtcTEpO1xuICAgICAgICAgICAgY29uc3QgdXBwZXIgPSBtYXgoZW50cnkudmFsdWVzLmZpbHRlcigoZCk9PmQ8cTMrKGlxcioxLjUpKSk7XG4gICAgICAgICAgICBjb25zdCBsb3dlciA9IG1pbihlbnRyeS52YWx1ZXMuZmlsdGVyKChkKT0+ZD5xMS0oaXFyKjEuNSkpKTtcbiAgICAgICAgICAgIGRvbS5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ3aGlza2VyXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCB0aGlzLnNjYWxlLnooMCkpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCB0aGlzLnNjYWxlLnooMCkpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCB0aGlzLnNjYWxlLnkodXBwZXIpKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgdGhpcy5zY2FsZS55KGxvd2VyKSlcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2VcIiwgXCIjZmZmXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaW50ZXJxdWFydGlsZSByYW5nZVxuICAgICAgICB2aW9saW5HLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCB0aGlzLnNjYWxlLnooLXopKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIHRoaXMuc2NhbGUueShxMykpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIE1hdGguYWJzKHRoaXMuc2NhbGUueigteiktdGhpcy5zY2FsZS56KHopKSlcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIE1hdGguYWJzKHRoaXMuc2NhbGUueShxMykgLSB0aGlzLnNjYWxlLnkocTEpKSlcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ2aW9saW4taXJcIik7XG5cbiAgICAgICAgLy8gbWVkaWFuXG4gICAgICAgIGNvbnN0IG1lZCA9IG1lZGlhbihlbnRyeS52YWx1ZXMpO1xuICAgICAgICB2aW9saW5HLmFwcGVuZChcImxpbmVcIikgLy8gdGhlIG1lZGlhbiBsaW5lXG4gICAgICAgICAgICAuYXR0cihcIngxXCIsIHRoaXMuc2NhbGUueigteikpXG4gICAgICAgICAgICAuYXR0cihcIngyXCIsIHRoaXMuc2NhbGUueih6KSlcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgdGhpcy5zY2FsZS55KG1lZCkpXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIHRoaXMuc2NhbGUueShtZWQpKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInZpb2xpbi1tZWRpYW5cIik7XG5cbiAgICAgICAgLy8gbW91c2UgZXZlbnRzXG4gICAgICAgIHZpb2xpbkcub24oXCJtb3VzZW92ZXJcIiwgKCk9PntcbiAgICAgICAgICAgIHZQYXRoLmNsYXNzZWQoXCJoaWdobGlnaHRlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVudHJ5KTtcbiAgICAgICAgICAgIGlmKHRoaXMudG9vbHRpcCA9PT0gdW5kZWZpbmVkKSBjb25zb2xlLndhcm4oXCJHcm91cFZpb2xpbiBXYXJuaW5nOiB0b29sdGlwIG5vdCBkZWZpbmVkXCIpO1xuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b29sdGlwLnNob3coXG4gICAgICAgICAgICAgICAgICAgIGVudHJ5Lmdyb3VwICsgXCI8YnIvPlwiICtcbiAgICAgICAgICAgICAgICAgICAgZW50cnkubGFiZWwgKyBcIjxici8+XCIgK1xuICAgICAgICAgICAgICAgICAgICBcIk1lZGlhbjogXCIgKyBtZWQudG9QcmVjaXNpb24oNCkgKyBcIjxici8+XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdmlvbGluRy5vbihcIm1vdXNlb3V0XCIsICgpPT57XG4gICAgICAgICAgICB2UGF0aC5jbGFzc2VkKFwiaGlnaGxpZ2h0ZWRcIiwgZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBfc2FuaXR5Q2hlY2soZGF0YSl7XG4gICAgICAgIGNvbnN0IGF0dHIgPSBbXCJncm91cFwiLCBcImxhYmVsXCIsIFwidmFsdWVzXCJdO1xuXG4gICAgICAgIGRhdGEuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICAgICAgYXR0ci5mb3JFYWNoKChhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGRbYV0gPT09IHVuZGVmaW5lZCkgdGhyb3cgXCJHcm91cGVkVmlvbGluOiBpbnB1dCBkYXRhIGVycm9yLlwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIGlmICgwID09IGQudmFsdWVzLmxlbmd0aCkgdGhyb3cgXCJWaW9saW46IElucHV0IGRhdGEgZXJyb3JcIjtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgX2FkZEdyb3VwRGl2aWRlcihkb20pe1xuICAgICAgICBjb25zdCBncm91cHMgPSB0aGlzLnNjYWxlLnguZG9tYWluKCk7XG4gICAgICAgIGNvbnN0IHBhZGRpbmcgPSBNYXRoLmFicyh0aGlzLnNjYWxlLngodGhpcy5zY2FsZS54LmRvbWFpbigpWzFdKSAtIHRoaXMuc2NhbGUueCh0aGlzLnNjYWxlLnguZG9tYWluKClbMF0pIC0gdGhpcy5zY2FsZS54LmJhbmR3aWR0aCgpKTtcblxuICAgICAgICBjb25zdCBnZXRYID0gKGcsIGkpPT4ge1xuICAgICAgICAgICAgaWYgKGkgIT09IGdyb3Vwcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2NhbGUueChnKSArICt0aGlzLnNjYWxlLnguYmFuZHdpZHRoKCkgKyAocGFkZGluZy8yKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZG9tLnNlbGVjdEFsbChcIi52bGluZVwiKS5kYXRhKGdyb3VwcylcbiAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ2bGluZVwiLCB0cnVlKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCBnZXRYKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCBnZXRYKVxuICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCB0aGlzLnNjYWxlLnkucmFuZ2UoKVswXSlcbiAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgdGhpcy5zY2FsZS55LnJhbmdlKClbMV0pXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgKGcsIGkpPT5pIT1ncm91cHMubGVuZ3RoLTE/MTowKVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIFwicmdiKDg2LDk4LDEwNylcIilcbiAgICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIiwgMC41KVxuXG4gICAgfVxuXG5cbn0iLCJcInVzZSBzdHJpY3RcIjtcbmV4cG9ydCBmdW5jdGlvbiBnZXRHdGV4VXJscygpe1xuICAgIGNvbnN0IGhvc3QgPSAnaHR0cHM6Ly9kZXYuZ3RleHBvcnRhbC5vcmcvcmVzdC92MS8nO1xuICAgIHJldHVybiB7XG4gICAgICAgIC8vIGVxdGwgRGFzaGJvYXJkIHNwZWNpZmljXG4gICAgICAgIGR5bmVxdGw6IGhvc3QgKyAnYXNzb2NpYXRpb24vZHluZXF0bCcsXG4gICAgICAgIHNucDogaG9zdCArICdyZWZlcmVuY2UvdmFyaWFudD9mb3JtYXQ9anNvbiZzbnBJZD0nLFxuICAgICAgICB2YXJpYW50SWQ6IGhvc3QgKyAncmVmZXJlbmNlL3ZhcmlhbnQ/Zm9ybWF0PWpzb24mdmFyaWFudElkPScsXG5cbiAgICAgICAgLy8gdHJhbnNjcmlwdCwgZXhvbiwganVuY3Rpb24gZXhwcmVzc2lvbiBzcGVjaWZpY1xuICAgICAgICBleG9uRXhwOiBob3N0ICsgJ2V4cHJlc3Npb24vbWVkaWFuRXhvbkV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmaGNsdXN0ZXI9dHJ1ZSZnZW5jb2RlSWQ9JyxcbiAgICAgICAgdHJhbnNjcmlwdEV4cDogaG9zdCArICdleHByZXNzaW9uL21lZGlhblRyYW5zY3JpcHRFeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmhjbHVzdGVyPXRydWUmZ2VuY29kZUlkPScsXG4gICAgICAgIGp1bmN0aW9uRXhwOiBob3N0ICsgJ2V4cHJlc3Npb24vbWVkaWFuSnVuY3Rpb25FeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmhjbHVzdGVyPXRydWUmZ2VuY29kZUlkPScsXG4gICAgICAgIHRyYW5zY3JpcHQ6IGhvc3QgKyAncmVmZXJlbmNlL3RyYW5zY3JpcHQ/ZGF0YXNldElkPWd0ZXhfdjcmZ2VuY29kZUlkPScsXG4gICAgICAgIGV4b246IGhvc3QgKyAncmVmZXJlbmNlL2V4b24/ZGF0YXNldElkPWd0ZXhfdjcmZ2VuY29kZUlkPScsXG4gICAgICAgIGdlbmVNb2RlbDogaG9zdCArICdyZWZlcmVuY2UvY29sbGFwc2VkR2VuZU1vZGVsRXhvbj91bmZpbHRlcmVkPWZhbHNlJmRhdGFzZXRJZD1ndGV4X3Y3JmdlbmNvZGVJZD0nLFxuICAgICAgICBnZW5lTW9kZWxVbmZpbHRlcmVkOiBob3N0ICsgJ3JlZmVyZW5jZS9jb2xsYXBzZWRHZW5lTW9kZWxFeG9uP3VuZmlsdGVyZWQ9dHJ1ZSZkYXRhc2V0SWQ9Z3RleF92NyZnZW5jb2RlSWQ9JyxcblxuICAgICAgICAvLyBnZW5lIGV4cHJlc3Npb24gdmlvbGluIHBsb3Qgc3BlY2lmaWNcbiAgICAgICAgZ2VuZUV4cDogaG9zdCArICdleHByZXNzaW9uL2dlbmVFeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmdlbmNvZGVJZD0nLFxuXG4gICAgICAgIC8vIGdlbmUgZXhwcmVzc2lvbiBoZWF0IG1hcCBzcGVjaWZpY1xuICAgICAgICBtZWRHZW5lRXhwOiBob3N0ICsgJ2V4cHJlc3Npb24vbWVkaWFuR2VuZUV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmaGNsdXN0ZXI9dHJ1ZSZwYWdlX3NpemU9MTAwMDAnLFxuXG4gICAgICAgIC8vIHRvcCBleHByZXNzZWQgZ2VuZSBleHByZXNzaW9uIHNwZWNpZmljXG4gICAgICAgIHRvcEluVGlzc3VlRmlsdGVyZWQ6IGhvc3QgKyAnZXhwcmVzc2lvbi90b3BFeHByZXNzZWRHZW5lP2RhdGFzZXRJZD1ndGV4X3Y3JmZpbHRlck10R2VuZT10cnVlJnNvcnRfYnk9bWVkaWFuJnNvcnREaXJlY3Rpb249ZGVzYyZwYWdlX3NpemU9NTAmdGlzc3VlU2l0ZURldGFpbElkPScsXG4gICAgICAgIHRvcEluVGlzc3VlOiBob3N0ICsgJ2V4cHJlc3Npb24vdG9wRXhwcmVzc2VkR2VuZT9kYXRhc2V0SWQ9Z3RleF92NyZzb3J0X2J5PW1lZGlhbiZzb3J0RGlyZWN0aW9uPWRlc2MmcGFnZV9zaXplPTUwJnRpc3N1ZVNpdGVEZXRhaWxJZD0nLFxuXG4gICAgICAgIGdlbmVJZDogaG9zdCArICdyZWZlcmVuY2UvZ2VuZUlkP2Zvcm1hdD1qc29uJnJlbGVhc2U9djcmZ2VuZUlkPScsXG5cbiAgICAgICAgLy8gdGlzc3VlIG1lbnUgc3BlY2lmaWNcbiAgICAgICAgdGlzc3VlOiAgaG9zdCArICdkYXRhc2V0L3Rpc3N1ZUluZm8nLFxuXG4gICAgICAgIHRpc3N1ZVNpdGVzOiBob3N0ICsgJ2RhdGFzZXQvdGlzc3VlU2l0ZURldGFpbD9mb3JtYXQ9anNvbicsXG5cbiAgICAgICAgLy8gbG9jYWwgc3RhdGljIGZpbGVzXG4gICAgICAgIHNhbXBsZTogJ3RtcFN1bW1hcnlEYXRhL2d0ZXguU2FtcGxlLmNzdicsXG4gICAgICAgIHJuYXNlcUNyYW06ICd0bXBTdW1tYXJ5RGF0YS9ybmFzZXFfY3JhbV9maWxlc192N19kYkdhUF8wMTE1MTYudHh0JyxcbiAgICAgICAgd2dzQ3JhbTogJ3RtcFN1bW1hcnlEYXRhL3dnc19jcmFtX2ZpbGVzX3Y3X2hnMzhfZGJHYVBfMDExNTE2LnR4dCcsXG5cbiAgICAgICAgLy8gZmlyZUNsb3VkXG4gICAgICAgIGZjQmlsbGluZzogJ2h0dHBzOi8vYXBpLmZpcmVjbG91ZC5vcmcvYXBpL3Byb2ZpbGUvYmlsbGluZycsXG4gICAgICAgIGZjV29ya1NwYWNlOiAnaHR0cHM6Ly9hcGkuZmlyZWNsb3VkLm9yZy9hcGkvd29ya3NwYWNlcycsXG4gICAgICAgIGZjUG9ydGFsV29ya1NwYWNlOiAnaHR0cHM6Ly9wb3J0YWwuZmlyZWNsb3VkLm9yZy8jd29ya3NwYWNlcydcbiAgICB9XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGdlbmVzIGZyb20gR1RFeCB3ZWIgc2VydmljZVxuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgZ2VuZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlR2VuZXMoZGF0YSl7XG4gICAgY29uc3QgYXR0ciA9ICdnZW5lSWQnO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAnR2VuZSB3ZWIgc2VydmljZSBwYXJzaW5nIGVycm9yJztcbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgdGlzc3Vlc1xuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgdGlzc3Vlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUaXNzdWVzKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSAndGlzc3VlSW5mbyc7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2VUaXNzdWVzIGlucHV0IGVycm9yLic7XG4gICAgY29uc3QgdGlzc3VlcyA9IGRhdGFbYXR0cl07XG5cbiAgICAvLyBzYW5pdHkgY2hlY2tcbiAgICBbJ3Rpc3N1ZUlkJywgJ3Rpc3N1ZU5hbWUnLCAnY29sb3JIZXgnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIXRpc3N1ZXNbMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2VUaXNzdWUgYXR0ciBub3QgZm91bmQ6ICcgKyBkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRpc3N1ZXM7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIHRpc3N1ZSBncm91cHNcbiAqIEBwYXJhbSBkYXRhIHtKc29ufVxuICogQHBhcmFtIGZvckVxdGwge0Jvb2xlYW59XG4gKiBAcmV0dXJucyB7RGljdGlvbmFyeX0gb2YgbGlzdHMgb2YgdGlzc3VlcyBpbmRleGVkIGJ5IHRoZSB0aXNzdWUgZ3JvdXAgbmFtZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUaXNzdWVTaXRlcyhkYXRhLCBmb3JFcXRsPWZhbHNlKXtcbiAgICAvLyB0aGUgbGlzdCBvZiBpbnZhbGlkZSBlcXRsIHRpc3N1ZXMgZHVlIHRvIHNhbXBsZSBzaXplIDwgNzBcbiAgICAvLyBhIGhhcmQtY29kZWQgbGlzdCBiZWNhdXNlIHRoZSBzYW1wbGUgc2l6ZSBpcyBub3QgZWFzeSB0byByZXRyaWV2ZVxuICAgIGNvbnN0IGludmFsaWRUaXNzdWVzID0gWydCbGFkZGVyJywgJ0NlcnZpeF9FY3RvY2Vydml4JywgJ0NlcnZpeF9FbmRvY2Vydml4JywgJ0ZhbGxvcGlhbl9UdWJlJywgJ0tpZG5leV9Db3J0ZXgnXTtcblxuICAgIGNvbnN0IGF0dHIgPSAndGlzc3VlU2l0ZURldGFpbCc7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2VUaXNzdWVTaXRlcyBpbnB1dCBlcnJvci4nO1xuICAgIGNvbnN0IHRpc3N1ZXMgPSBmb3JFcXRsPT1mYWxzZT9kYXRhW2F0dHJdOmRhdGFbYXR0cl0uZmlsdGVyKChkKT0+e3JldHVybiAhaW52YWxpZFRpc3N1ZXMuaW5jbHVkZXMoZC50aXNzdWVfc2l0ZV9kZXRhaWxfaWQpfSk7IC8vIGFuIGFycmF5IG9mIHRpc3N1ZV9zaXRlX2RldGFpbCBvYmplY3RzXG5cbiAgICAvLyBidWlsZCB0aGUgdGlzc3VlR3JvdXBzIGxvb2t1cCBkaWN0aW9uYXJ5IGluZGV4ZWQgYnkgdGhlIHRpc3N1ZSBncm91cCBuYW1lIChpLmUuIHRoZSB0aXNzdWUgbWFpbiBzaXRlIG5hbWUpXG4gICAgWyd0aXNzdWVfc2l0ZScsICd0aXNzdWVfc2l0ZV9kZXRhaWxfaWQnLCAndGlzc3VlX3NpdGVfZGV0YWlsJ10uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCF0aXNzdWVzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBgcGFyc2VUaXNzdWVTaXRlcyBhdHRyIGVycm9yLiAke2R9IGlzIG5vdCBmb3VuZGA7XG4gICAgfSk7XG4gICAgbGV0IHRpc3N1ZUdyb3VwcyA9IHRpc3N1ZXMucmVkdWNlKChhcnIsIGQpPT57XG4gICAgICAgIGxldCBncm91cE5hbWUgPSBkLnRpc3N1ZV9zaXRlO1xuICAgICAgICBsZXQgc2l0ZSA9IHtcbiAgICAgICAgICAgIGlkOiBkLnRpc3N1ZV9zaXRlX2RldGFpbF9pZCxcbiAgICAgICAgICAgIG5hbWU6IGQudGlzc3VlX3NpdGVfZGV0YWlsXG4gICAgICAgIH07XG4gICAgICAgIGlmICghYXJyLmhhc093blByb3BlcnR5KGdyb3VwTmFtZSkpIGFycltncm91cE5hbWVdID0gW107IC8vIGluaXRpYXRlIGFuIGFycmF5XG4gICAgICAgIGFycltncm91cE5hbWVdLnB1c2goc2l0ZSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSwge30pO1xuXG4gICAgLy8gbW9kaWZ5IHRoZSB0aXNzdWUgZ3JvdXBzIHRoYXQgaGF2ZSBvbmx5IGEgc2luZ2xlIHNpdGVcbiAgICAvLyBieSByZXBsYWNpbmcgdGhlIGdyb3VwJ3MgbmFtZSB3aXRoIHRoZSBzaW5nbGUgc2l0ZSdzIG5hbWUgLS0gZm9yIGEgYmV0dGVyIEFscGhhYmV0aWNhbCBvcmRlciBvZiB0aGUgdGlzc3VlIGdyb3Vwc1xuXG4gICAgT2JqZWN0LmtleXModGlzc3VlR3JvdXBzKS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAodGlzc3VlR3JvdXBzW2RdLmxlbmd0aCA9PSAxKXsgLy8gYSBzaW5nbGUtc2l0ZSBncm91cFxuICAgICAgICAgICAgbGV0IHNpdGUgPSB0aXNzdWVHcm91cHNbZF1bMF07IC8vIHRoZSBzaW5nbGUgc2l0ZVxuICAgICAgICAgICAgZGVsZXRlIHRpc3N1ZUdyb3Vwc1tkXTsgLy8gcmVtb3ZlIHRoZSBvbGQgZ3JvdXAgaW4gdGhlIGRpY3Rpb25hcnlcbiAgICAgICAgICAgIHRpc3N1ZUdyb3Vwc1tzaXRlLm5hbWVdID0gW3NpdGVdOyAvLyBjcmVhdGUgYSBuZXcgZ3JvdXAgd2l0aCB0aGUgc2l0ZSdzIG5hbWVcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRpc3N1ZUdyb3VwcztcblxufVxuXG4vKipcbiAqIHBhcnNlIHRoZSBleG9uc1xuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgZXhvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTW9kZWxFeG9ucyhqc29uKXtcbiAgICBjb25zdCBhdHRyID0gJ2NvbGxhcHNlZEdlbmVNb2RlbEV4b24nO1xuICAgIGlmKCFqc29uLmhhc093blByb3BlcnR5KGF0dHIpKXtcbiAgICAgICAgY29uc29sZS5lcnJvcihqc29uKTtcbiAgICAgICAgdGhyb3cgJ1BhcnNlIEVycm9yOiBSZXF1aXJlZCBqc29uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgYXR0cjtcbiAgICB9XG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgWydzdGFydCcsICdlbmQnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWpzb25bYXR0cl1bMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93ICdQYXJzZSBFcnJvcjogUmVxdWlyZWQganNvbiBhdHRyaWJ1dGUgaXMgbWlzc2luZzogJyArIGQ7XG4gICAgfSk7XG4gICAgcmV0dXJuIGpzb25bYXR0cl0ubWFwKChkKT0+e1xuICAgICAgICBkLmNocm9tU3RhcnQgPSBkLnN0YXJ0O1xuICAgICAgICBkLmNocm9tRW5kID0gZC5lbmQ7XG4gICAgICAgIHJldHVybiBkO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIHBhcnNlIHRoZSBqdW5jdGlvbnNcbiAqIEBwYXJhbSBkYXRhXG4gKiBAcmV0dXJucyB7TGlzdH0gb2YganVuY3Rpb25zXG4gKiAvLyBqdW5jdGlvbiBhbm5vdGF0aW9ucyBhcmUgbm90IHN0b3JlZCBpbiBNb25nb1xuICAgIC8vIHNvIGhlcmUgd2UgdXNlIHRoZSBqdW5jdGlvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlIHRvIHBhcnNlIHRoZSBqdW5jdGlvbiBJRCBmb3IgaXRzIGdlbm9taWMgbG9jYXRpb25cbiAgICAvLyBhc3N1bWluZyB0aGF0IGVhY2ggdGlzc3VlIGhhcyB0aGUgc2FtZSBqdW5jdGlvbnMsXG4gICAgLy8gdG8gZ3JhYiBhbGwgdGhlIGtub3duIGp1bmN0aW9ucyBvZiBhIGdlbmUsIHdlIG9ubHkgbmVlZCB0byBxdWVyeSBvbmUgdGlzc3VlXG4gICAgLy8gaGVyZSB3ZSBhcmJpdHJhcmlseSBwaWNrIExpdmVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VKdW5jdGlvbnMoanNvbil7XG5cbiAgICBjb25zdCBhdHRyID0gJ21lZGlhbkp1bmN0aW9uRXhwcmVzc2lvbic7XG4gICAgaWYoIWpzb24uaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdQYXJzZSBFcnJvcjogcGFyc2VKdW5jdGlvbnMgaW5wdXQgZXJyb3IuICcgKyBhdHRyO1xuXG4gICAgLy8gY2hlY2sgcmVxdWlyZWQganNvbiBhdHRyaWJ1dGVzXG4gICAgWyd0aXNzdWVTaXRlRGV0YWlsSWQnLCAnanVuY3Rpb25JZCddLmZvckVhY2goKGQpPT57XG4gICAgICAgIC8vIHVzZSB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUganNvbiBvYmplY3RzIGFzIGEgdGVzdCBjYXNlXG4gICAgICAgIGlmKCFqc29uW2F0dHJdWzBdLmhhc093blByb3BlcnR5KGQpKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoanNvblthdHRyXVswXSk7XG4gICAgICAgICAgICB0aHJvdyAnUGFyc2UgRXJyb3I6IHJlcXVpcmVkIGp1bmN0aW9uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgZDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBqc29uW2F0dHJdLmZpbHRlcigoZCk9PmQudGlzc3VlU2l0ZURldGFpbElkPT0nTGl2ZXInKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zID0gZC5qdW5jdGlvbklkLnNwbGl0KCdfJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNocm9tOiBwb3NbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb21TdGFydDogcG9zWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNocm9tRW5kOiBwb3NbMl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganVuY3Rpb25JZDogZC5qdW5jdGlvbklkXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xufVxuXG4vKipcbiAqIHBhcnNlIHRyYW5zY3JpcHQgaXNvZm9ybXMgZnJvbSB0aGUgR1RFeCB3ZWIgc2VydmljZTogJ3JlZmVyZW5jZS90cmFuc2NyaXB0P3JlbGVhc2U9djcmZ2VuY29kZV9pZD0nXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIHJldHVybnMgYSBkaWN0aW9uYXJ5IG9mIHRyYW5zY3JpcHQgZXhvbiBvYmplY3QgbGlzdHMgaW5kZXhlZCBieSB0cmFuc2NyaXB0IElEcyAtLSBFTlNUIElEc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFeG9ucyhqc29uKXtcbiAgICBjb25zdCBhdHRyID0gJ2V4b24nO1xuICAgIGlmKCFqc29uLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAnUGFyc2UgRXJyb3I6IHJlcXVpcmVkIGpzb24gYXR0cmlidXRlIGlzIG1pc3Npbmc6IGV4b24nO1xuICAgIHJldHVybiBqc29uW2F0dHJdLnJlZHVjZSgoYSwgZCk9PntcbiAgICAgICAgLy8gY2hlY2sgcmVxdWlyZWQgYXR0cmlidXRlc1xuICAgICAgICBbJ3RyYW5zY3JpcHRJZCcsICdjaHJvbW9zb21lJywgJ3N0YXJ0JywgJ2VuZCcsICdleG9uTnVtYmVyJywgJ2V4b25JZCddLmZvckVhY2goKGspPT57XG4gICAgICAgICAgICBpZighZC5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ1BhcnNlIEVycm9yOiByZXF1aXJlZCBqc29uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsga1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGFbZC50cmFuc2NyaXB0SWRdID09PSB1bmRlZmluZWQpIGFbZC50cmFuc2NyaXB0SWRdID0gW107XG4gICAgICAgIGQuY2hyb20gPSBkLmNocm9tb3NvbWU7XG4gICAgICAgIGQuY2hyb21TdGFydCA9IGQuc3RhcnQ7XG4gICAgICAgIGQuY2hyb21FbmQgPSBkLmVuZDtcbiAgICAgICAgYVtkLnRyYW5zY3JpcHRJZF0ucHVzaChkKTtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfSwge30pO1xufVxuXG4vKipcbiAqIHBhcnNlIHRyYW5zY3JpcHQgaXNvZm9ybXNcbiAqIEBwYXJhbSBkYXRhIHtKc29ufSBmcm9tIEdURXggd2ViIHNlcnZpY2UgJ3JlZmVyZW5jZS90cmFuc2NyaXB0P3JlbGVhc2U9djcmZ2VuY29kZV9pZD0nXG4gKiByZXR1cm5zIGEgbGlzdCBvZiBpc29mb3JtIG9iamVjdHMgc29ydGVkIGJ5IGxlbmd0aCBpbiBkZXNjZW5kaW5nIG9yZGVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRyYW5zY3JpcHRzKGpzb24pe1xuICAgIGNvbnN0IGF0dHIgPSAndHJhbnNjcmlwdCc7XG4gICAgaWYoIWpzb24uaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KCdwYXJzZUlzb2Zvcm1zIGlucHV0IGVycm9yJyk7XG5cbiAgICAvLyBjaGVjayByZXF1aXJlZCBhdHRyaWJ1dGVzLCB1c2UgdGhlIGZpcnN0IHRyYW5zY3JpcHQgYXMgdGhlIHRlc3QgY2FzZVxuICAgIFsndHJhbnNjcmlwdElkJywgJ3N0YXJ0JywgJ2VuZCddLmZvckVhY2goKGspPT57XG4gICAgICAgIGlmKCFqc29uW2F0dHJdWzBdLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGQpO1xuICAgICAgICAgICAgdGhyb3cgJ1BhcnNlIEVycm9yOiByZXF1aXJlZCBqc29uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsga1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4ganNvblthdHRyXS5zb3J0KChhLCBiKT0+e1xuICAgICAgICBjb25zdCBsMSA9IE1hdGguYWJzKGEuZW5kIC0gYS5zdGFydCkgKyAxO1xuICAgICAgICBjb25zdCBsMiA9IE1hdGguYWJzKGIuZW5kIC0gYi5zdGFydCkgKyAxO1xuICAgICAgICByZXR1cm4gLShsMS1sMik7IC8vIHNvcnQgYnkgaXNvZm9ybSBsZW5ndGggaW4gZGVzY2VuZGluZyBvcmRlclxuICAgIH0pO1xufVxuXG4vKipcbiAqIHBhcnNlIGZpbmFsIChtYXNrZWQpIGdlbmUgbW9kZWwgZXhvbiBleHByZXNzaW9uXG4gKiBleHByZXNzaW9uIGlzIG5vcm1hbGl6ZWQgdG8gcmVhZHMgcGVyIGtiXG4gKiBAcGFyYW0gZGF0YSB7SlNPTn0gb2YgZXhvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gZXhvbnMge0xpc3R9IG9mIGV4b25zIHdpdGggcG9zaXRpb25zXG4gKiBAcGFyYW0gdXNlTG9nIHtib29sZWFufSB1c2UgbG9nMiB0cmFuc2Zvcm1hdGlvblxuICogQHBhcmFtIGFkanVzdCB7TnVtYmVyfSBkZWZhdWx0IDAuMDFcbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBleG9uIG9iamVjdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRXhvbkV4cHJlc3Npb24oZGF0YSwgZXhvbnMsIHVzZUxvZz10cnVlLCBhZGp1c3Q9MSl7XG4gICAgY29uc3QgZXhvbkRpY3QgPSBleG9ucy5yZWR1Y2UoKGEsIGQpPT57YVtkLmV4b25JZF0gPSBkOyByZXR1cm4gYTt9LCB7fSk7XG4gICAgY29uc3QgYXR0ciA9ICdtZWRpYW5FeG9uRXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KCdwYXJzZUV4b25FeHByZXNzaW9uIGlucHV0IGVycm9yJyk7XG5cbiAgICBjb25zdCBleG9uT2JqZWN0cyA9IGRhdGFbYXR0cl07XG4gICAgLy8gZXJyb3ItY2hlY2tpbmdcbiAgICBbJ21lZGlhbicsICdleG9uSWQnLCAndGlzc3VlU2l0ZURldGFpbElkJ10uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCFleG9uT2JqZWN0c1swXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZUV4b25FeHByZXNzaW9uIGF0dHIgbm90IGZvdW5kOiAnICsgZDtcbiAgICB9KTtcbiAgICAvLyBwYXJzZSBHVEV4IG1lZGlhbiBleG9uIGNvdW50c1xuICAgIGV4b25PYmplY3RzLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgY29uc3QgZXhvbiA9IGV4b25EaWN0W2QuZXhvbklkXTsgLy8gZm9yIHJldHJpZXZpbmcgZXhvbiBwb3NpdGlvbnNcbiAgICAgICAgLy8gZXJyb3ItY2hlY2tpbmdcbiAgICAgICAgWydlbmQnLCAnc3RhcnQnXS5mb3JFYWNoKChwKT0+e1xuICAgICAgICAgICAgaWYgKCFleG9uLmhhc093blByb3BlcnR5KHApKSB0aHJvdyAnRmF0YWwgRXJyb3I6IHBhcnNlRXhvbkV4cHJlc3Npb24gcG9zaXRpb24gYXR0ciBub3QgZm91bmQ6ICcgKyBwO1xuICAgICAgICB9KTtcbiAgICAgICAgZC5sID0gZXhvbi5lbmQgLSBleG9uLnN0YXJ0ICsgMTtcbiAgICAgICAgZC52YWx1ZSA9IE51bWJlcihkLm1lZGlhbikvZC5sO1xuICAgICAgICBkLm9yaWdpbmFsVmFsdWUgPSBOdW1iZXIoZC5tZWRpYW4pL2QubDtcbiAgICAgICAgaWYgKHVzZUxvZykgZC52YWx1ZSA9IE1hdGgubG9nMihkLnZhbHVlICsgMSk7XG4gICAgICAgIGQueCA9IGQuZXhvbklkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZVNpdGVEZXRhaWxJZDtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkO1xuICAgICAgICBkLmNocm9tU3RhcnQgPSBleG9uLnN0YXJ0O1xuICAgICAgICBkLmNocm9tRW5kID0gZXhvbi5lbmQ7XG4gICAgICAgIGQudW5pdCA9ICdtZWRpYW4gJyArIGQudW5pdCArICcgcGVyIGJhc2UnO1xuICAgICAgICBkLnRpc3N1ZUlkID0gZC50aXNzdWVTaXRlRGV0YWlsSWQ7XG4gICAgfSk7XG4gICAgcmV0dXJuIGV4b25PYmplY3RzLnNvcnQoKGEsYik9PntcbiAgICAgICAgaWYgKGEuY2hyb21TdGFydDxiLmNocm9tU3RhcnQpIHJldHVybiAtMTtcbiAgICAgICAgaWYgKGEuY2hyb21TdGFydD5iLmNocm9tU3RhcnQpIHJldHVybiAxO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTsgLy8gc29ydCBieSBnZW5vbWljIGxvY2F0aW9uIGluIGFzY2VuZGluZyBvcmRlclxufVxuXG4vKipcbiAqIFBhcnNlIGp1bmN0aW9uIG1lZGlhbiByZWFkIGNvdW50IGRhdGFcbiAqIEBwYXJhbSBkYXRhIHtKU09OfSBvZiB0aGUganVuY3Rpb24gZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIHVzZUxvZyB7Qm9vbGVhbn0gcGVyZm9ybSBsb2cgdHJhbnNmb3JtYXRpb25cbiAqIEBwYXJhbSBhZGp1c3Qge051bWJlcn0gZm9yIGhhbmRsaW5nIDAncyB3aGVuIHVzZUxvZyBpcyB0cnVlXG4gKiBAcmV0dXJucyB7TGlzdH0gb2YganVuY3Rpb24gb2JqZWN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VKdW5jdGlvbkV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gJ21lZGlhbkp1bmN0aW9uRXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KCdwYXJzZUp1bmN0aW9uRXhwcmVzc2lvbiBpbnB1dCBlcnJvcicpO1xuXG4gICAgY29uc3QganVuY3Rpb25zID0gZGF0YVthdHRyXTtcblxuICAgIC8vIGVycm9yLWNoZWNraW5nXG4gICAgaWYgKGp1bmN0aW9ucyA9PT0gdW5kZWZpbmVkIHx8IGp1bmN0aW9ucy5sZW5ndGggPT0gMCkge1xuICAgICAgICBjb25zb2xlLndhcm4oJ05vIGp1bmN0aW9uIGRhdGEgZm91bmQnKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cblxuICAgIC8vIHBhcnNlIEdURXggbWVkaWFuIGp1bmN0aW9uIHJlYWQgY291bnRzXG4gICAganVuY3Rpb25zLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgWyd0aXNzdWVTaXRlRGV0YWlsSWQnLCAnanVuY3Rpb25JZCcsICdtZWRpYW4nLCAnZ2VuY29kZUlkJ10uZm9yRWFjaCgoayk9PntcbiAgICAgICAgICAgIGlmICghZC5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ1BhcnNlciBFcnJvcjogcGFyc2VKdW5jdGlvbkV4cHJlc3Npb24gYXR0ciBub3QgZm91bmQ6ICcgKyBrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgbGV0IG1lZGlhbiA9IGQubWVkaWFuO1xuICAgICAgICBsZXQgdGlzc3VlSWQgPSBkLnRpc3N1ZVNpdGVEZXRhaWxJZDtcbiAgICAgICAgZC50aXNzdWVJZCA9IHRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgICAgIGQueCA9IGQuanVuY3Rpb25JZDtcbiAgICAgICAgZC55ID0gdGlzc3VlSWQ7XG4gICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMChOdW1iZXIobWVkaWFuICsgYWRqdXN0KSk6TnVtYmVyKG1lZGlhbik7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihtZWRpYW4pO1xuICAgIH0pO1xuXG4gICAgLy8gc29ydCBieSBnZW5vbWljIGxvY2F0aW9uIGluIGFzY2VuZGluZyBvcmRlclxuICAgIHJldHVybiBqdW5jdGlvbnMuc29ydCgoYSxiKT0+e1xuICAgICAgICBpZiAoYS5qdW5jdGlvbklkPmIuanVuY3Rpb25JZCkgcmV0dXJuIDE7XG4gICAgICAgIGVsc2UgaWYgKGEuanVuY3Rpb25JZDxiLmp1bmN0aW9uSWQpIHJldHVybiAtMTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSk7XG59XG5cbi8qKlxuICogcGFyc2UgdHJhbnNjcmlwdCBleHByZXNzaW9uXG4gKiBAcGFyYW0gZGF0YVxuICogQHBhcmFtIHVzZUxvZ1xuICogQHBhcmFtIGFkanVzdFxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRyYW5zY3JpcHRFeHByZXNzaW9uKGRhdGEsIHVzZUxvZz10cnVlLCBhZGp1c3Q9MSl7XG4gICAgY29uc3QgYXR0ciA9ICdtZWRpYW5UcmFuc2NyaXB0RXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KCdQYXJzZSBFcnJvcjogcGFyc2VUcmFuc2NyaXB0RXhwcmVzc2lvbiBpbnB1dCBlcnJvcicpO1xuICAgIC8vIHBhcnNlIEdURXggaXNvZm9ybSBtZWRpYW4gVFBNXG4gICAgZGF0YVthdHRyXS5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIFsnbWVkaWFuJywgJ3RyYW5zY3JpcHRJZCcsICd0aXNzdWVTaXRlRGV0YWlsSWQnLCAnZ2VuY29kZUlkJ10uZm9yRWFjaCgoayk9PntcbiAgICAgICAgICAgIGlmKCFkLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihkKTtcbiAgICAgICAgICAgICAgICB0aHJvdygnUGFyc2UgRXJyb3I6IHJlcXVpcmVkIHRyYW5zY2lwdCBhdHRyaWJ1dGUgaXMgbWlzc2luZzogJyArIGspO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLm1lZGlhbiArIGFkanVzdCkpOk51bWJlcihkLm1lZGlhbik7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLm1lZGlhbik7XG4gICAgICAgIGQueCA9IGQudHJhbnNjcmlwdElkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZVNpdGVEZXRhaWxJZDtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkO1xuICAgICAgICBkLnRpc3N1ZUlkID0gZC50aXNzdWVTaXRlRGV0YWlsSWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVHJhbnNjcmlwdEV4cHJlc3Npb25UcmFuc3Bvc2UoZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gJ21lZGlhblRyYW5zY3JpcHRFeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGRhdGEpO1xuICAgICAgICB0aHJvdygnUGFyc2UgRXJyb3I6IHBhcnNlVHJhbnNjcmlwdEV4cHJlc3Npb25UcmFuc3Bvc2UgaW5wdXQgZXJyb3IuJyk7XG4gICAgfVxuICAgIC8vIHBhcnNlIEdURXggaXNvZm9ybSBtZWRpYW4gVFBNXG4gICAgZGF0YVthdHRyXS5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIFsnbWVkaWFuJywgJ3RyYW5zY3JpcHRJZCcsICd0aXNzdWVTaXRlRGV0YWlsSWQnLCAnZ2VuY29kZUlkJ10uZm9yRWFjaCgoayk9PntcbiAgICAgICAgICAgIGlmKCFkLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihkKTtcbiAgICAgICAgICAgICAgICB0aHJvdygnUGFyc2UgRXJyb3I6IFJlcXVpcmVkIHRyYW5zY3JpcHQgYXR0cmlidXRlIGlzIG1pc3Npbmc6ICcgKyBrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IG1lZGlhbiA9IGQubWVkaWFuO1xuICAgICAgICBjb25zdCB0aXNzdWVJZCA9IGQudGlzc3VlU2l0ZURldGFpbElkO1xuICAgICAgICBkLnZhbHVlID0gdXNlTG9nP01hdGgubG9nMTAoTnVtYmVyKG1lZGlhbiArIGFkanVzdCkpOk51bWJlcihtZWRpYW4pO1xuICAgICAgICBkLm9yaWdpbmFsVmFsdWUgPSBOdW1iZXIobWVkaWFuKTtcbiAgICAgICAgZC55ID0gZC50cmFuc2NyaXB0SWQ7XG4gICAgICAgIGQueCA9IHRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgICAgIGQudGlzc3VlSWQgPSB0aXNzdWVJZDtcbiAgICB9KTtcblxuICAgIHJldHVybiBkYXRhW2F0dHJdO1xufVxuXG4vKipcbiAqIHBhcnNlIG1lZGlhbiBnZW5lIGV4cHJlc3Npb25cbiAqIEBwYXJhbSBkYXRhIHtKc29ufSB3aXRoIGF0dHIgbWVkaWFuR2VuZUV4cHJlc3Npb25cbiAqIEBwYXJhbSB1c2VMb2cge0Jvb2xlYW59IHBlcmZvcm1zIGxvZzEwIHRyYW5zZm9ybWF0aW9uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTWVkaWFuRXhwcmVzc2lvbihkYXRhLCB1c2VMb2c9dHJ1ZSl7XG4gICAgY29uc3QgYXR0ciA9ICdtZWRpYW5HZW5lRXhwcmVzc2lvbic7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdQYXJzZSBFcnJvcjogcmVxdWlyZWQganNvbiBhdHRyaWJ1dGUgaXMgbWlzc2luZzogJyArIGF0dHI7XG4gICAgY29uc3QgYWRqdXN0ID0gMTtcbiAgICAvLyBwYXJzZSBHVEV4IG1lZGlhbiBnZW5lIGV4cHJlc3Npb25cbiAgICAvLyBlcnJvci1jaGVja2luZyB0aGUgcmVxdWlyZWQgYXR0cmlidXRlczpcbiAgICBpZiAoZGF0YVthdHRyXS5sZW5ndGggPT0gMCkgdGhyb3cgJ3BhcnNlTWVkaWFuRXhwcmVzc2lvbiBmaW5kcyBubyBkYXRhLic7XG4gICAgWydtZWRpYW4nLCAndGlzc3VlU2l0ZURldGFpbElkJywgJ2dlbmNvZGVJZCddLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmICghZGF0YVthdHRyXVswXS5oYXNPd25Qcm9wZXJ0eShkKSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihkYXRhW2F0dHJdWzBdKTtcbiAgICAgICAgICAgIHRocm93IGBQYXJzZSBFcnJvcjogcmVxdWlyZWQganNvbiBhdHRyaWJ1dGUgaXMgbWlzc2luZ3A6ICR7ZH1gO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgbGV0IHJlc3VsdHMgPSBkYXRhW2F0dHJdO1xuICAgIHJlc3VsdHMuZm9yRWFjaChmdW5jdGlvbihkKXtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLm1lZGlhbikgKyBhZGp1c3QpOk51bWJlcihkLm1lZGlhbik7XG4gICAgICAgIGQueCA9IGQudGlzc3VlU2l0ZURldGFpbElkO1xuICAgICAgICBkLnkgPSBkLmdlbmNvZGVJZDtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQubWVkaWFuKTtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbi8qKlxuICogcGFyc2UgdGhlIGV4cHJlc3Npb24gZGF0YSBvZiBhIGdlbmUgZm9yIGEgZ3JvdXBlZCB2aW9saW4gcGxvdFxuICogQHBhcmFtIGRhdGEge0pTT059IGZyb20gR1RFeCBnZW5lIGV4cHJlc3Npb24gd2ViIHNlcnZpY2VcbiAqIEBwYXJhbSBjb2xvcnMge0RpY3Rpb25hcnl9IHRoZSB2aW9saW4gY29sb3IgZm9yIGdlbmVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUdlbmVFeHByZXNzaW9uRm9yVmlvbGluKGRhdGEsIHVzZUxvZz10cnVlLCBjb2xvcnM9dW5kZWZpbmVkKXtcbiAgICBjb25zdCBhdHRyID0gJ2dlbmVFeHByZXNzaW9uJztcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ1BhcnNlIEVycm9yOiByZXF1aXJlZCBqc29uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgYXR0cjtcbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpPT57XG4gICAgICAgIFsnZGF0YScsICd0aXNzdWVTaXRlRGV0YWlsSWQnLCAnZ2VuZVN5bWJvbCcsICdnZW5jb2RlSWQnXS5mb3JFYWNoKChrKT0+e1xuICAgICAgICAgICAgaWYoIWQuaGFzT3duUHJvcGVydHkoaykpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ1BhcnNlIEVycm9yOiByZXF1aXJlZCBqc29uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGQudmFsdWVzID0gdXNlTG9nP2QuZGF0YS5tYXAoKGRkKT0+e3JldHVybiBNYXRoLmxvZzEwKCtkZCsxKX0pOmQuZGF0YTtcbiAgICAgICAgZC5ncm91cCA9IGQudGlzc3VlU2l0ZURldGFpbElkO1xuICAgICAgICBkLmxhYmVsID0gZC5nZW5lU3ltYm9sO1xuICAgICAgICBkLmNvbG9yID0gY29sb3JzPT09dW5kZWZpbmVkPycjOTBjMWMxJzpjb2xvcnNbZC5nZW5jb2RlSWRdO1xuICAgIH0pO1xuICAgIHJldHVybiBkYXRhW2F0dHJdO1xufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5pbXBvcnQge2pzb259IGZyb20gXCJkMy1mZXRjaFwiO1xuaW1wb3J0IHtzZWxlY3R9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbmltcG9ydCB7cmFuZ2V9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IHtnZXRHdGV4VXJscywgcGFyc2VUaXNzdWVzfSBmcm9tIFwiLi9ndGV4RGF0YVBhcnNlclwiO1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgdGlzc3VlIChkYXRhc2V0KSBkcm9wZG93biBtZW51IHVzaW5nIHNlbGVjdDJcbiAqIEBwYXJhbSBkb21JZCB7U3RyaW5nfSB0aGUgZG9tIElEIG9mIHRoZSBtZW51XG4gKiBAcGFyYW0gdXJsIHtTdHJpbmd9IHRoZSB0aXNzdWUgd2ViIHNlcnZpY2UgdXJsXG4gKiBkZXBlbmRlbmN5OiBzZWxlY3QyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUaXNzdWVNZW51KGRvbUlkLCB1cmwgPSBnZXRHdGV4VXJscygpLnRpc3N1ZSl7XG4gICAganNvbih1cmwpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdHMpe1xuICAgICAgICAgICAgbGV0IHRpc3N1ZXMgPSBwYXJzZVRpc3N1ZXMocmVzdWx0cyk7XG4gICAgICAgICAgICB0aXNzdWVzLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgICAgICAgICBkLmlkID0gZC50aXNzdWVJZDtcbiAgICAgICAgICAgICAgICBkLnRleHQgPSBkLnRpc3N1ZU5hbWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRpc3N1ZXMuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgIGlmKGEudGlzc3VlTmFtZSA8IGIudGlzc3VlTmFtZSkgcmV0dXJuIC0xO1xuICAgICAgICAgICAgICAgIGlmKGEudGlzc3VlTmFtZSA+IGIudGlzc3VlTmFtZSkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gZXh0ZXJuYWwgbGlicmFyeSBkZXBlbmRlbmN5OiBzZWxlY3QyXG4gICAgICAgICAgICAkKGAjJHtkb21JZH1gKS5zZWxlY3QyKHtcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogJ1NlbGVjdCBhIGRhdGEgc2V0JyxcbiAgICAgICAgICAgICAgICBkYXRhOiB0aXNzdWVzXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtjb25zb2xlLmVycm9yKGVycil9KTtcbn1cblxuLyoqXG4gKiBCdWlsZCB0aGUgdHdvLWxldmVsIGNoZWNrYm94LXN0eWxlIHRpc3N1ZSBtZW51XG4gKiBkZXBlbmRlbmNpZXM6IHRpc3N1ZUdyb3VwLmNzcyBjbGFzc2VzXG4gKiBAcGFyYW0gZ3JvdXBzIHtEaWN0aW9uYXJ5fSBvZiBsaXN0cyBvZiB0aXNzdWVzIGluZGV4ZWQgYnkgdGhlIGdyb3VwIG5hbWUsIHRoaXMgaXMgY3JlYXRlZCBieSBndGV4RGF0YVBhcnNlcjpwYXJzZVRpc3N1ZVNpdGVzKClcbiAqIEBwYXJhbSBkb21JZCB7U3RyaW5nfSA8ZGl2PiBJRFxuICogQHBhcmFtIGZvckVxdGwge0Jvb2xlYW59XG4gKiBEZXBlbmRlbmNpZXM6IGpRdWVyeSwgQm9vdHN0cmFwLCB0aXNzdWVHcm91cC5jc3NcbiAqIHRvZG86IGFkZCByZXNldCBhbmQgc2VsZWN0IGFsbCBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUaXNzdWVHcm91cE1lbnUoZ3JvdXBzLCBkb21JZCwgZm9yRXF0bD1mYWxzZSl7XG4gICAgY29uc3QgbWFpbkNsYXNzPVwidGlzc3VlLWdyb3VwLW1haW4tbGV2ZWxcIjtcbiAgICBjb25zdCBzdWJDbGFzcyA9IFwidGlzc3VlLWdyb3VwLXN1Yi1sZXZlbFwiO1xuICAgIGNvbnN0IGxhc3RTaXRlQ2xhc3MgPSBcImxhc3Qtc2l0ZVwiO1xuXG4gICAgLy8gZXJhc2UgZXZlcnl0aGluZyBpbiBkb21JZCBpbiBjYXNlIGl0IGlzbid0IGVtcHR5XG4gICAgc2VsZWN0KGAjJHtkb21JZH1gKS5zZWxlY3RBbGwoXCIqXCIpLnJlbW92ZSgpO1xuXG4gICAgLy8gYWRkIGNoZWNrIGFsbCBhbmQgcmVzZXQgb3B0aW9uc1xuICAgIGNvbnN0ICRhbGxUaXNzdWVEaXYgPSAkKCc8ZGl2Lz4nKS5hdHRyKCdjbGFzcycsICdjb2wteHMtMTIgY29sLW1kLTEyJykuYXBwZW5kVG8oJChgIyR7ZG9tSWR9YCkpO1xuICAgIGlmIChmb3JFcXRsKXtcbiAgICAgICAgJChgPGxhYmVsIGNsYXNzPSR7bWFpbkNsYXNzfT5gICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiYWxsVGlzc3Vlc1wiIHZhbHVlPVwicmVzZXRcIj4gUmVzZXQgJyArXG4gICAgICAgICc8L2xhYmVsPjxici8+JykuYXBwZW5kVG8oJGFsbFRpc3N1ZURpdik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgJChgPGxhYmVsIGNsYXNzPSR7bWFpbkNsYXNzfT5gICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiYWxsVGlzc3Vlc1wiIHZhbHVlPVwiYWxsXCI+IEFsbCA8L2xhYmVsPiAnICtcbiAgICAgICAgYDxsYWJlbCBjbGFzcz0ke21haW5DbGFzc30+YCArXG4gICAgICAgICc8aW5wdXQgdHlwZT1cInJhZGlvXCIgbmFtZT1cImFsbFRpc3N1ZXNcIiB2YWx1ZT1cInJlc2V0XCI+IFJlc2V0ICcgK1xuICAgICAgICAnPC9sYWJlbD48YnIvPicpLmFwcGVuZFRvKCRhbGxUaXNzdWVEaXYpO1xuICAgIH1cblxuXG4gICAgLy8gY2hlY2sgYWxsIG9yIHJlc2V0IGV2ZW50c1xuICAgICQoJ2lucHV0W25hbWU9XCJhbGxUaXNzdWVzXCJdJykuY2hhbmdlKGZ1bmN0aW9uKCl7XG4gICAgICAgIGxldCB2YWwgPSAkKHRoaXMpLnZhbCgpO1xuICAgICAgICBzd2l0Y2godmFsKXtcbiAgICAgICAgICAgIGNhc2UgJ2FsbCc6IHtcbiAgICAgICAgICAgICAgICAkKCcudGlzc3VlR3JvdXAnKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJCgnLnRpc3N1ZVN1Ykdyb3VwJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncmVzZXQnOiB7XG4gICAgICAgICAgICAgICAgJCgnLnRpc3N1ZUdyb3VwJykucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkKCcudGlzc3VlU3ViR3JvdXAnKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nXG5cbiAgICAgICAgfVxuICAgICAgICAvLyAkKHRoaXMpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG4gICAgfSk7XG4gICAgLy8gc29ydCB0aGUgdGlzc3VlIGdyb3VwcyBhbHBoYWJldGljYWxseVxuICAgIGxldCBncm91cE5hbWVzID0gT2JqZWN0LmtleXMoZ3JvdXBzKS5zb3J0KCk7XG5cbiAgICAvLyBjcmVhdGUgZm91ciA8ZGl2PiBzZWN0aW9ucyBmb3IgdGhlIHRpc3N1ZSBtZW51XG4gICAgLy8gVE9ETzogZmluZCBhIGJldHRlciB3YXkgdG8gb3JnYW5pemUgdGlzc3VlcyBpbnRvIHNlY3Rpb25zXG4gICAgY29uc3QgJHNlY3Rpb25zID0gcmFuZ2UoMCw0KS5tYXAoKGQpPT57XG4gICAgICAgIHJldHVybiAkKGA8ZGl2IGlkPVwic2VjdGlvbiR7ZH1cIiBjbGFzcz1cImNvbC14cy0xMiBjb2wtbWQtM1wiPmApLmFwcGVuZFRvKCQoYCMke2RvbUlkfWApKTtcbiAgICB9KTtcblxuICAgIGdyb3VwTmFtZXMuZm9yRWFjaChmdW5jdGlvbihnbmFtZSl7XG4gICAgICAgIGxldCBzaXRlcyA9IGdyb3Vwc1tnbmFtZV07IC8vIGEgbGlzdCBvZiBzaXRlIG9iamVjdHMgd2l0aCBhdHRyOiBuYW1lIGFuZCBpZFxuICAgICAgICBjb25zdCBnSWQgPSBnbmFtZS5yZXBsYWNlKC8gL2csIFwiX1wiKTsgLy8gcmVwbGFjZSB0aGUgc3BhY2VzIHdpdGggZGFzaGVzIHRvIGNyZWF0ZSBhIGdyb3VwIDxET00+IGlkXG4gICAgICAgIC8vIGZpZ3VyZSBvdXQgd2hpY2ggZG9tIHNlY3Rpb24gdG8gYXBwZW5kIHRoaXMgdGlzc3VlIHNpdGVcbiAgICAgICAgbGV0ICRjdXJyZW50RG9tID0gJHNlY3Rpb25zWzNdO1xuICAgICAgICBpZihcIkJyYWluXCIgPT0gZ25hbWUpICRjdXJyZW50RG9tID0gJHNlY3Rpb25zWzBdO1xuICAgICAgICBlbHNlIGlmIChnbmFtZS5tYXRjaCgvXltBLURdLykpICRjdXJyZW50RG9tID0gJHNlY3Rpb25zWzFdO1xuICAgICAgICBlbHNlIGlmIChnbmFtZS5tYXRjaCgvXltFLVBdLykpICRjdXJyZW50RG9tID0gJHNlY3Rpb25zWzJdO1xuXG4gICAgICAgIC8vIGNyZWF0ZSB0aGUgPGxhYmVsPiBmb3IgdGhlIHRpc3N1ZSBncm91cFxuICAgICAgICAkKGA8bGFiZWwgY2xhc3M9JHttYWluQ2xhc3N9PmArXG4gICAgICAgICAgICBgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGlkPVwiJHtnSWR9XCIgY2xhc3M9XCJ0aXNzdWVHcm91cFwiPiBgICtcbiAgICAgICAgICAgICc8c3BhbiBjbGFzcz1cImNoZWNrbWFya1wiPjwvc3Bhbj4nICtcbiAgICAgICAgICAgIGA8c3Bhbj4ke2duYW1lfTwvc3Bhbj5gICtcbiAgICAgICAgICAgICc8L2xhYmVsPjxici8+JykuYXBwZW5kVG8oJGN1cnJlbnREb20pO1xuXG4gICAgICAgIC8vIHRpc3N1ZSBzaXRlcyBpbiB0aGUgZ3JvdXBcbiAgICAgICAgaWYgKHNpdGVzLmxlbmd0aCA+IDEpe1xuICAgICAgICAgICAgIC8vIHNvcnQgc2l0ZXMgYWxwaGFiZXRpY2FsbHlcbiAgICAgICAgICAgIHNpdGVzLnNvcnQoKGEsIGIpPT57XG4gICAgICAgICAgICAgICAgaWYgKGEuaWQgPiBiLmlkKSByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICBpZiAoYS5pZCA8IGIuaWQpIHJldHVybiAtMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzaXRlLCBpKXtcbiAgICAgICAgICAgICAgICBsZXQgJHNpdGVEb20gPSAkKGA8bGFiZWwgY2xhc3M9JHtzdWJDbGFzc30+YCtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBpZD1cIiR7c2l0ZS5pZH1cIiBjbGFzcz1cInRpc3N1ZVN1Ykdyb3VwXCI+IGAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJjaGVja21hcmtcIj48L3NwYW4+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGA8c3Bhbj4ke3NpdGUubmFtZX08L3NwYW4+YCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8L2xhYmVsPjxici8+JykuYXBwZW5kVG8oJGN1cnJlbnREb20pO1xuICAgICAgICAgICAgICAgIGlmIChpID09IHNpdGVzLmxlbmd0aCAtMSkgJHNpdGVEb20uYWRkQ2xhc3MobGFzdFNpdGVDbGFzcyk7XG4gICAgICAgICAgICAgICAgJHNpdGVEb20uY2xpY2soZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cImFsbFRpc3N1ZXNcIl0nKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGN1c3RvbSBjbGljayBldmVudCBmb3IgdGhlIHRvcC1sZXZlbCB0aXNzdWVzOiB0b2dnbGUgdGhlIGNoZWNrIGJveGVzXG4gICAgICAgICQoXCIjXCIgKyBnSWQpLmNsaWNrKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwiYWxsVGlzc3Vlc1wiXScpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICBpZiAoJCgnIycgKyBnSWQpLmlzKFwiOmNoZWNrZWRcIikpIHtcbiAgICAgICAgICAgICAgICAvLyB3aGVuIHRoZSBncm91cCBpcyBjaGVja2VkLCBjaGVjayBhbGwgaXRzIHRpc3N1ZXNcbiAgICAgICAgICAgICAgICBzaXRlcy5mb3JFYWNoKGZ1bmN0aW9uIChzaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChcImlkXCIgPT0gc2l0ZS5pZCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAkKCcjJyArIHNpdGUuaWQpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHdoZW4gdGhlIGdyb3VwIGlzIHVuY2hlY2tlZCwgdW4tY2hlY2sgYWxsIGl0cyB0aXNzdWVzXG4gICAgICAgICAgICAgICAgc2l0ZXMuZm9yRWFjaChmdW5jdGlvbiAoc2l0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoXCJpZFwiID09IHNpdGUuaWQpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgJCgnIycgKyBzaXRlLmlkKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxufVxuXG4vKipcbiAqIFBhcnNlIHRoZSB0d28tbGV2ZWwgY2hlY2tib3gtc3R5bGUgdGlzc3VlIG1lbnVcbiAqIEBwYXJhbSBncm91cHMge0RpY3Rpb25hcnl9IG9mIGxpc3RzIG9mIHRpc3N1ZXMgaW5kZXhlZCBieSB0aGUgZ3JvdXAgbmFtZSwgdGhpcyBpcyBjcmVhdGVkIGJ5IGd0ZXhEYXRhUGFyc2VyOnBhcnNlVGlzc3VlU2l0ZXMoKVxuICogQHBhcmFtIGRvbUlkIHtTdHJpbmd9IDxkaXY+IElEXG4gKiBEZXBlbmRlbmNpZXM6IGpRdWVyeVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUaXNzdWVHcm91cE1lbnUoZ3JvdXBzLCBkb21JZCl7XG4gICAgbGV0IHF1ZXJ5VGlzc3VlSWRzID0gW107XG4gICAgJChgIyR7ZG9tSWR9YCkuZmluZChcIjppbnB1dFwiKS5lYWNoKGZ1bmN0aW9uKCl7IC8vIHVzaW5nIGpRdWVyeSB0byBwYXJzZSBlYWNoIGlucHV0IGl0ZW1cbiAgICAgICAgaWYgKCAkKHRoaXMpLmlzKFwiOmNoZWNrZWRcIikpIHsgLy8gdGhlIGpRdWVyeSB3YXkgdG8gZmV0Y2ggYSBjaGVja2VkIHRpc3N1ZVxuICAgICAgICAgICAgY29uc3QgaWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5oYXNDbGFzcyhcInRpc3N1ZUdyb3VwXCIpKXtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlucHV0IGl0ZW0gaXMgYSB0aXNzdWUgZ3JvdXBcbiAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiB0aGlzIHRpc3N1ZSBncm91cCBpcyBhIHNpbmdsZS1zaXRlIGdyb3VwIHVzaW5nIHRoZSB0aXNzdWVHcm91cHMgZGljdGlvbmFyeVxuICAgICAgICAgICAgICAgIC8vIGlmIHNvLCBhZGQgdGhlIHNpbmdsZSBzaXRlIHRvIHRoZSBxdWVyeSBsaXN0XG4gICAgICAgICAgICAgICAgbGV0IGdyb3VwTmFtZSA9IGlkLnJlcGxhY2UoL18vZywgXCIgXCIpOyAvLyBmaXJzdCBjb252ZXJ0IHRoZSBJRCBiYWNrIHRvIGdyb3VwIG5hbWVcbiAgICAgICAgICAgICAgICBpZiAoZ3JvdXBzW2dyb3VwTmFtZV0ubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlUaXNzdWVJZHMucHVzaChncm91cHNbZ3JvdXBOYW1lXVswXS5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXsgLy8gdGhpcyBpbnB1dCBpdGVtIGlzIGEgdGlzc3VlIHNpdGVcbiAgICAgICAgICAgICAgICBxdWVyeVRpc3N1ZUlkcy5wdXNoKGlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBxdWVyeVRpc3N1ZUlkcy5maWx0ZXIoKGQpPT5kIT09dW5kZWZpbmVkKTtcbn0iLCJpbXBvcnQge2pzb259IGZyb20gXCJkMy1mZXRjaFwiO1xuaW1wb3J0IHtzZWxlY3R9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcbi8vIGltcG9ydCB7cmFuZ2V9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IEdyb3VwZWRWaW9saW4gZnJvbSBcIi4vbW9kdWxlcy9Hcm91cGVkVmlvbGluXCI7XG5pbXBvcnQge1xuICAgIGdldEd0ZXhVcmxzLFxuICAgIHBhcnNlVGlzc3VlU2l0ZXNcbn0gZnJvbSBcIi4vbW9kdWxlcy9ndGV4RGF0YVBhcnNlclwiO1xuXG5pbXBvcnQge1xuICAgIGNyZWF0ZVRpc3N1ZUdyb3VwTWVudSxcbiAgICBwYXJzZVRpc3N1ZUdyb3VwTWVudVxufSBmcm9tIFwiLi9tb2R1bGVzL2d0ZXhNZW51QnVpbGRlclwiO1xuXG4vKipcbiAqIEJ1aWxkIHRoZSBlUVRMIERhc2hib2FyZFxuICogSW5pdGlhdGUgdGhlIGRhc2hib2FyZCB3aXRoIGEgc2VhcmNoIGZvcm0uXG4gKiAxLiBGZXRjaCBhbmQgb3JnYW5pemUgdGlzc3VlIHNpdGVzIGludG8gZ3JvdXBzLlxuICogMi4gQnVpbGQgdGhlIHR3by1sZXZlbCB0aXNzdWUgc2l0ZSBtZW51LlxuICogMy4gQmluZCB0aGUgc2VhcmNoIGZ1bmN0aW9uIHRvIHRoZSBzdWJtaXQgYnV0dG9uLlxuICogVG9EbzogcGVyaGFwcyB0aGUgZG9tIGVsZW1lbnRzIGluIHRoZSBmb3JtIGNvdWxkIGJlIGFjY2Vzc2VkIHdpdGhvdXQgc3BlY2lmeWluZyB0aGUgZG9tIElEcz9cbiAqIEBwYXJhbSBkYXNoYm9hcmRJZCB7U3RyaW5nfTogZVFUTCByZXN1bHQgPGRpdj4gSURcbiAqIEBwYXJhbSBtZW51SWQge1N0cmluZ30gdGlzc3VlIG1lbnUgPGRpdj4gSURcbiAqIEBwYXJhbSBwYWlySWQge1N0cmluZ30gZ2VuZS12YXJpYW50IDx0ZXh0YXJlYT4gSURcbiAqIEBwYXJhbSBzdWJtaXRJZCB7U3RyaW5nfSBmb3JtIHN1Ym1pdCBidXR0b24gPGRpdj4gSURcbiAqIEBwYXJhbSBmb3JtSWQge1N0cmluZ30gZGFzaGJvYXJkIDxmb3JtPiBJRFxuICogQHBhcmFtIG1lc3NhZ2VCb3hJZCB7U3RyaW5nfSBtZXNzYWdlIGJveCA8ZGl2PiBJRFxuICogQHBhcmFtIHVybHMge0RpY3Rpb25hcnl9IG9mIEdURXggd2ViIHNlcnZpY2UgVVJMc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGQoZGFzaGJvYXJkSWQsIG1lbnVJZCwgcGFpcklkLCBzdWJtaXRJZCwgZm9ybUlkLCBtZXNzYWdlQm94SWQsIHVybHM9Z2V0R3RleFVybHMoKSl7XG4gICAgbGV0IHRpc3N1ZUdyb3VwcyA9IHt9OyAvLyBhIGRpY3Rpb25hcnkgb2YgbGlzdHMgb2YgdGlzc3VlIHNpdGVzIGluZGV4ZWQgYnkgdGlzc3VlIGdyb3Vwc1xuXG4gICAganNvbih1cmxzLnRpc3N1ZVNpdGVzKVxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXsgLy8gcmV0cmlldmUgYWxsIHRpc3N1ZSAoc3ViKXNpdGVzXG4gICAgICAgICAgICBjb25zdCBmb3JFcXRsID0gdHJ1ZTtcbiAgICAgICAgICAgIGxldCB0aXNzdWVHcm91cHMgPSBwYXJzZVRpc3N1ZVNpdGVzKGRhdGEsIGZvckVxdGwpO1xuICAgICAgICAgICAgY3JlYXRlVGlzc3VlR3JvdXBNZW51KHRpc3N1ZUdyb3VwcywgbWVudUlkLCBmb3JFcXRsKTtcbiAgICAgICAgICAgICQoYCMke3N1Ym1pdElkfWApLmNsaWNrKF9zdWJtaXQodGlzc3VlR3JvdXBzLCBkYXNoYm9hcmRJZCwgbWVudUlkLCBwYWlySWQsIHN1Ym1pdElkLCBmb3JtSWQsIG1lc3NhZ2VCb3hJZCwgdXJscykpO1xuXG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICB9KTtcbn1cblxuLyoqXG4gKlxuICogQHBhcmFtIGdlbmUge09iamVjdH0gd2l0aCBhdHRyIGdlbmVTeW1ib2wgYW5kIGdlbmNvZGVJZFxuICogQHBhcmFtIHZhcmlhbnQge09iamVjdH0gd2l0aCBhdHRyIHZhcmlhbnRJZCBhbmQgc25wSWRcbiAqIEBwYXJhbSBtYWluSWQge1N0cmluZ30gdGhlIG1haW4gRElWIGlkXG4gKiBAcGFyYW0gaW5wdXQge09iamVjdH0gdGhlIHZpb2xpbiBkYXRhXG4gKiBAcGFyYW0gaW5mbyB7T2JqZWN0fSB0aGUgbWV0YWRhdGEgb2YgdGhlIGdyb3Vwc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX3Zpc3VhbGl6ZShnZW5lLCB2YXJpYW50LCBtYWluSWQsIGlucHV0LCBpbmZvKXtcblxuICAgIGNvbnN0IGlkID0ge1xuICAgICAgICBtYWluOiBtYWluSWQsXG4gICAgICAgIHRvb2x0aXA6IFwiZXF0bFRvb2x0aXBcIixcbiAgICAgICAgdG9vbGJhcjogYCR7bWFpbklkfVRvb2xiYXJgLFxuICAgICAgICBjbG9uZTogYCR7bWFpbklkfUNsb25lYCxcbiAgICAgICAgY2hhcnQ6IGAke21haW5JZH1DaGFydGAsXG4gICAgICAgIHN2ZzogYCR7bWFpbklkfVN2Z2AsXG4gICAgICAgIGJ1dHRvbnM6IHtcbiAgICAgICAgICAgIHNhdmU6IGAke21haW5JZH1TYXZlYFxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIGVycm9yLWNoZWNraW5nIERPTSBlbGVtZW50c1xuICAgIGlmICgkKGAjJHtpZC5tYWlufWApLmxlbmd0aCA9PSAwKSB0aHJvdyBcIlZpb2xpbiBQbG90IEVycm9yOiB0aGUgY2hhcnQgRE9NIGRvZXNuJ3QgZXhpc3RcIjtcbiAgICBpZiAoJChgIyR7aWQudG9vbHRpcH1gKS5sZW5ndGggPT0gMCkgJCgnPGRpdi8+JykuYXR0cihcImlkXCIsIGlkLnRvb2x0aXApLmFwcGVuZFRvKCQoJ2JvZHknKSk7XG5cbiAgICAvLyBjbGVhciBwcmV2aW91c2x5IHJlbmRlcmVkIHBsb3QgaWYgYW55XG4gICAgc2VsZWN0KGAjJHtpZC5tYWlufWApLnNlbGVjdEFsbChcIipcIikucmVtb3ZlKCk7XG5cbiAgICAvLyBidWlsZCB0aGUgZG9tIGVsZW1lbnRzXG4gICAgW1widG9vbGJhclwiLCBcImNoYXJ0XCIsIFwiY2xvbmVcIl0uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgJCgnPGRpdi8+JykuYXR0cihcImlkXCIsIGlkW2RdKS5hcHBlbmRUbygkKGAjJHtpZC5tYWlufWApKTtcbiAgICB9KTtcblxuICAgIC8vIHZpb2xpbiBwbG90XG4gICAgLy8gVE9ETzogY29kZSByZXZpZXcgb24gdGhlIGxheW91dCwgcmVtb3ZlIGhhcmQtY29kZWQgdmFsdWVzIGFuZCBjdXN0b21pemVkIGNvZGUgaW4gR3JvdXBlZFZpb2xpbi5qc1xuICAgIGxldCBtYXJnaW4gPSB7XG4gICAgICAgIGxlZnQ6IDUwLFxuICAgICAgICB0b3A6IDUwLFxuICAgICAgICByaWdodDogNTAsXG4gICAgICAgIGJvdHRvbTogMTAwXG4gICAgfTtcblxuICAgIGxldCBpbm5lcldpZHRoID0gaW5wdXQubGVuZ3RoICogNDAsIC8vIHNldCBhdCBhdCBsZWFzdCA1MCBiZWNhdXNlIG9mIHRoZSBsb25nIHRpc3N1ZSBuYW1lc1xuICAgICAgICB3aWR0aCA9IGlubmVyV2lkdGggKyAobWFyZ2luLmxlZnQgKyBtYXJnaW4ucmlnaHQpO1xuICAgIGxldCBpbm5lckhlaWdodCA9IDgwLFxuICAgICAgICBoZWlnaHQgPSBpbm5lckhlaWdodCArIChtYXJnaW4udG9wICsgbWFyZ2luLmJvdHRvbSk7XG5cbiAgICBsZXQgZG9tID0gc2VsZWN0KGAjJHtpZC5jaGFydH1gKVxuICAgICAgICAuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICAgICAgLmF0dHIoXCJpZFwiLCBpZC5zdmcpXG4gICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGB0cmFuc2xhdGUoJHttYXJnaW4ubGVmdH0sICR7bWFyZ2luLnRvcH0pYCk7XG5cbiAgICAvLyBhZGQgdmlvbGluIHRpdGxlXG5cbiAgICBkb20uYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAuY2xhc3NlZChcImVkLXNlY3Rpb24tdGl0bGVcIiwgdHJ1ZSlcbiAgICAgICAgLnRleHQoYCR7Z2VuZS5nZW5lU3ltYm9sfSAoJHtnZW5lLmdlbmNvZGVJZH0pIGFuZCAke3ZhcmlhbnQuc25wSWR8fFwiXCJ9ICgke3ZhcmlhbnQudmFyaWFudElkfSlgKVxuICAgICAgICAuYXR0cihcInhcIiwgMClcbiAgICAgICAgLmF0dHIoXCJ5XCIsIC1tYXJnaW4udG9wICsgMTYpO1xuXG4gICAgLy8gcmVuZGVyIHRoZSB2aW9saW5cbiAgICBsZXQgdmlvbGluID0gbmV3IEdyb3VwZWRWaW9saW4oaW5wdXQsIGluZm8pO1xuICAgIGNvbnN0IHRvb2x0aXAgPSB2aW9saW4uY3JlYXRlVG9vbHRpcChpZC50b29sdGlwKTtcbiAgICBjb25zdCB0b29sYmFyID0gdmlvbGluLmNyZWF0ZVRvb2xiYXIoaWQudG9vbGJhciwgdG9vbHRpcCk7XG4gICAgdG9vbGJhci5jcmVhdGVEb3dubG9hZFN2Z0J1dHRvbihpZC5idXR0b25zLnNhdmUsIGlkLnN2ZywgYCR7aWQubWFpbn0tc2F2ZS5zdmdgLCBpZC5jbG9uZSk7XG4gICAgdmlvbGluLnJlbmRlcihkb20sIGlubmVyV2lkdGgsIGlubmVySGVpZ2h0LCAwLjMsIHVuZGVmaW5lZCwgW10sIFwiTm9ybWFsaXplZCBFeHByZXNzaW9uXCIsIGZhbHNlLCB0cnVlLCAwLCBmYWxzZSwgdHJ1ZSwgZmFsc2UsIHRydWUpO1xuICAgIF9jdXN0b21pemVWaW9saW5QbG90KHZpb2xpbiwgZG9tKTtcbn1cbi8qKlxuICogQ3VzdG9taXphdGlvbiBvZiB0aGUgdmlvbGluIHBsb3RcbiAqIEBwYXJhbSBwbG90IHtHcm91cGVkVmlvbGlufVxuICogQHBhcmFtIGRvbSB7RDMgRE9NfVxuICovXG5mdW5jdGlvbiBfY3VzdG9taXplVmlvbGluUGxvdChwbG90LCBkb20pe1xuICAgIHBsb3QuZ3JvdXBzLmZvckVhY2goKGcpPT57XG4gICAgICAgIC8vIGN1c3RvbWl6ZSB0aGUgbG9uZyB0aXNzdWUgbmFtZVxuICAgICAgICBjb25zdCBnbmFtZSA9IGcua2V5O1xuICAgICAgICBjb25zdCBuYW1lcyA9IGduYW1lLnJlcGxhY2UoL1xcKC8sIFwiIC0gKFwiKS5zcGxpdCgvXFxzKi1cXHMqLyk7XG4gICAgICAgIGNvbnN0IGN1c3RvbVhsYWJlbCA9IGRvbS5hcHBlbmQoXCJnXCIpO1xuICAgICAgICBjb25zdCBjdXN0b21MYWJlbHMgPSBjdXN0b21YbGFiZWwuc2VsZWN0QWxsKFwiLnZpb2xpbi1ncm91cC1sYWJlbFwiKVxuICAgICAgICAgICAgLmRhdGEobmFtZXMpO1xuICAgICAgICBjdXN0b21MYWJlbHMuZW50ZXIoKS5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgMClcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCAwKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInZpb2xpbi1ncm91cC1sYWJlbFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgKGQsIGkpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgeCA9IHBsb3Quc2NhbGUueChnbmFtZSkgKyBwbG90LnNjYWxlLnguYmFuZHdpZHRoKCkvMjtcbiAgICAgICAgICAgICAgICBsZXQgeSA9IHBsb3Quc2NhbGUueShwbG90LnNjYWxlLnkuZG9tYWluKClbMF0pICsgNzUgKyAoMTAqaSk7IC8vIHRvZG86IGF2b2lkIGhhcmQtY29kZWQgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmV0dXJuIGB0cmFuc2xhdGUoJHt4fSwgJHt5fSlgXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRleHQoKGQpID0+IGQpO1xuICAgIH0pO1xuXG4gICAgZG9tLnNlbGVjdEFsbChcIi52aW9saW4tc2l6ZS1heGlzXCIpLmNsYXNzZWQoXCJ2aW9saW4tc2l6ZS1heGlzLWhpZGVcIiwgdHJ1ZSkuY2xhc3NlZChcInZpb2xpbi1zaXplLWF4aXNcIiwgZmFsc2UpO1xuXG59XG5cbi8qKlxuICogRGVmaW5lIHRoZSBzdWJtaXQgYnV0dG9uJ3MgYWN0aW9uXG4gKiBAcGFyYW0gdGlzc3VlR3JvdXBzIHtEaWN0aW9uYXJ5fSBvZiBsaXN0cyBvZiB0aXNzdWVzIGluZGV4ZWQgYnkgdGlzc3VlIGdyb3Vwc1xuICogQHBhcmFtIGRhc2hib2FyZElkIHtTdHJpbmd9IGVRVEwgcmVzdWx0cyA8ZGl2PiBJRFxuICogQHBhcmFtIG1lbnVJZCB7U3RyaW5nfSB0aXNzdWUgbWVudSA8ZGl2PiBJRFxuICogQHBhcmFtIHBhaXJJZCB7U3RyaW5nfSBnZW5lLXZhcmlhbnQgPHRleHRhcmVhPiBJRFxuICogQHBhcmFtIHN1Ym1pdElkIHtTdHJpbmd9IHN1Ym1pdCBidXR0b24gPGRpdj4gSURcbiAqIEBwYXJhbSBtZXNzYWdlQm94SWQge1N0cmluZ30gbWVzc2FnZSBib3ggPGRpdj4gSURcbiAqIEBwYXJhbSB1cmxzIHtEaWN0aW9uYXJ5fSBvZiBHVEV4IHdlYiBzZXJ2aWNlIFVSTHNcbiAqIEBwYXJhbSBtYXgge0ludGVnZXJ9IG1heCBudW1iZXIgb2YgZ2VuZS12YXJpYW50IGVudHJpZXMuIFRoZSBkZWZhdWx0IGlzIHNldCB0byAzMC5cbiAqIEBwcml2YXRlXG4gKiBEZXBlbmRlbmNpZXM6IGpRdWVyeVxuICovXG5mdW5jdGlvbiBfc3VibWl0KHRpc3N1ZUdyb3VwcywgZGFzaGJvYXJkSWQsIG1lbnVJZCwgcGFpcklkLCBzdWJtaXRJZCwgZm9ybUlkLCBtZXNzYWdlQm94SWQsIHVybHM9X2dldEdURXhVcmxzKCksIG1heD0zMCl7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgLy8gY2xlYXIgdGhlIHByZXZpb3VzIGRhc2hib2FyZCBzZWFyY2ggcmVzdWx0cyBpZiBhbnlcbiAgICAgICAgJChgIyR7ZGFzaGJvYXJkSWR9YCkuaHRtbCgnJyk7XG5cbiAgICAgICAgLy8vLy8vIHZhbGlkYXRlIHRpc3N1ZSBpbnB1dHMgYW5kIGNvbnZlcnQgdGhlbSB0byB0aXNzdWUgSURzIC8vLy8vL1xuICAgICAgICBsZXQgcXVlcnlUaXNzdWVJZHMgPSBwYXJzZVRpc3N1ZUdyb3VwTWVudSh0aXNzdWVHcm91cHMsIG1lbnVJZCk7XG5cbiAgICAgICAgLy8gdGlzc3VlIGlucHV0IGVycm9yLWNoZWNraW5nXG4gICAgICAgIGlmIChxdWVyeVRpc3N1ZUlkcy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgYWxlcnQoXCJNdXN0IHNlbGVjdCBhdCBsZWFzdCBvbmUgdGlzc3VlLlwiKTtcbiAgICAgICAgICAgIHRocm93IFwiSW5wdXQgZXJyb3JcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vLy8vLyBwYXJzZSB0aGUgZ2VuZS12YXJpYW50IGlucHV0IGxpc3QgLy8vLy8vXG4gICAgICAgIGxldCBwYWlycyA9ICQoYCMke3BhaXJJZH1gKS52YWwoKS5zcGxpdChcIlxcblwiKS5maWx0ZXIoZnVuY3Rpb24oZCl7cmV0dXJuIGQgIT0gXCJcIn0pO1xuICAgICAgICBpZiAocGFpcnMubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIGFsZXJ0KFwiTXVzdCBpbnB1dCBhdCBsZWFzdCBvbmUgZ2VuZS12YXJpYW50IHBhaXIuXCIpO1xuICAgICAgICAgICAgdGhyb3cgXCJJbnB1dCBlcnJvclwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHBhaXJzLmxlbmd0aCA+IG1heCkge1xuICAgICAgICAgICAgJChgIyR7bWVzc2FnZUJveElkfWApLmFwcGVuZChgWW91ciBpbnB1dCBoYXMgZXhjZWVkZWQgdGhlIG1heGltdW0gbnVtYmVyIG9mIGFsbG93ZWQgZW50cmllcy4gT25seSB0aGUgZmlyc3QgJHttYXh9IGVudHJpZXMgYXJlIHByb2Nlc3NlZC5gKTtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIlVzZXIgaW5wdXQgaGFzIGV4Y2VlZGVkIHRoZSBtYXhpbXVtIG51bWJlciBvZiBhbGxvd2VkIGVudHJpZXMuXCIpO1xuICAgICAgICAgICAgcGFpcnMgPSBwYWlycy5zbGljZSgwLCBtYXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8vLy8vIHByb2Nlc3MgZWFjaCBnZW5lLXZhcmlhbnQgcGFpciAvLy8vLy9cblxuICAgICAgICAvLyBjcmVhdGUgYSB0aXNzdWUgbmFtZSBsb29rdXAgdGFibGVcbiAgICAgICAgY29uc3QgdGlzc3VlRGljdCA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyh0aXNzdWVHcm91cHMpLmZvckVhY2goKGduYW1lKSA9PiB7XG4gICAgICAgICAgICB0aXNzdWVHcm91cHNbZ25hbWVdLmZvckVhY2goKHNpdGUpID0+IHtcbiAgICAgICAgICAgICAgICB0aXNzdWVEaWN0W3NpdGUuaWRdID0gc2l0ZS5uYW1lO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGZvciBlYWNoIGdlbmUtdmFyaWFudCBwYWlyXG4gICAgICAgIHBhaXJzLmZvckVhY2goZnVuY3Rpb24ocGFpciwgaSl7XG4gICAgICAgICAgICBwYWlyLnJlcGxhY2UoLyAvZywgXCJcIik7IC8vIHJlbW92ZSBhbGwgc3BhY2VzXG4gICAgICAgICAgICBsZXQgdmlkID0gcGFpci5zcGxpdCgnLCcpWzFdLFxuICAgICAgICAgICAgICAgIGdpZCA9IHBhaXIuc3BsaXQoJywnKVswXTtcblxuICAgICAgICAgICAgLy8gcmV0cmlldmUgZ2VuZSBhbmQgdmFyaWFudCBpbmZvIGZyb20gdGhlIHdlYiBzZXJ2aWNlXG4gICAgICAgICAgICBjb25zdCBnZW5lVXJsID0gdXJscy5nZW5lSWQgKyBnaWQ7XG4gICAgICAgICAgICBjb25zdCB2YXJpYW50VXJsID0gdmlkLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aCgncnMnKT91cmxzLnNucCt2aWQ6dXJscy52YXJpYW50SWQrdmlkO1xuXG4gICAgICAgICAgICBQcm9taXNlLmFsbChbanNvbihnZW5lVXJsKSwganNvbih2YXJpYW50VXJsKV0pXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oYXJncyl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGdlbmUgPSBfcGFyc2VHZW5lKGFyZ3NbMF0sIGdpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhcmlhbnQgPSBfcGFyc2VWYXJpYW50KGFyZ3NbMV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ2VuZSA9PT0gbnVsbCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBgSW5wdXQgRXJyb3I6IG5vIGdlbmUgZm91bmQgZm9yICR7Z2lkfS4gPGJyLz5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7bWVzc2FnZUJveElkfWApLmFwcGVuZChlcnJvck1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3JNZXNzYWdlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YXJpYW50ID09PSBudWxsKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGBJbnB1dCBFcnJvcjogbm8gdmFyaWFudCBmb3VuZCBmb3IgJHt2aWR9IDxici8+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke21lc3NhZ2VCb3hJZH1gKS5hcHBlbmQoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yTWVzc2FnZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSBlUVRMcyBhbmQgZGlzcGxheSB0aGUgZVFUTCB2aW9saW4gcGxvdHNcbiAgICAgICAgICAgICAgICAgICAgX3JlbmRlckVxdGxQbG90KHRpc3N1ZURpY3QsIGRhc2hib2FyZElkLCBnZW5lLCB2YXJpYW50LCBxdWVyeVRpc3N1ZUlkcywgaSwgdXJscyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaGlkZSB0aGUgc2VhcmNoIGZvcm0gYWZ0ZXIgdGhlIGVRVEwgdmlvbGluIHBsb3RzIGFyZSByZXBvcnRlZFxuICAgICAgICAgICAgICAgICAgICAkKGAjJHtmb3JtSWR9YCkucmVtb3ZlQ2xhc3MoXCJzaG93XCIpOyAvLyBmb3IgYm9vdHN0cmFwIDRcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Zm9ybUlkfWApLnJlbW92ZUNsYXNzKFwiaW5cIik7IC8vIGZvciBib29zdHJhcCAzXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBQYXJzZSBHVEV4IGdlbmUgd2ViIHNlcnZpY2VcbiAqIEBwYXJhbSBnanNvblxuICogQHBhcmFtIGlkIHtTdHJpbmd9IHRoZSBxdWVyeSBnZW5lIElEXG4gKiBAcmV0dXJucyB7Kn0gYSBnZW5lIG9iamVjdCBvciBudWxsIGlmIG5vdCBmb3VuZFxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX3BhcnNlR2VuZShnanNvbiwgaWQpe1xuICAgIGNvbnN0IGF0dHIgPSAnZ2VuZUlkJztcbiAgICBpZighZ2pzb24uaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93ICdGYXRhbCBFcnJvcjogcGFyc2UgZ2VuZSBlcnJvcic7XG4gICAgbGV0IGdlbmVzID0gZ2pzb25bYXR0cl0uZmlsdGVyKChkKSA9PiB7cmV0dXJuIGQuZ2VuZVN5bWJvbFVwcGVyID09IGlkLnRvVXBwZXJDYXNlKCkgfHwgZC5nZW5jb2RlSWQgPT0gaWQudG9VcHBlckNhc2UoKX0pOyAvLyBmaW5kIHRoZSBleGFjdCBtYXRjaFxuICAgIGlmIChnZW5lcy5sZW5ndGggPT0wKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gZ2VuZXNbMF07XG59XG5cbi8qKlxuICogUGFyc2UgR1RFeCB2YXJpYW50L3NucCB3ZWIgc2VydmljZVxuICogQHBhcmFtIHZqc29uXG4gKiBAcmV0dXJucyB7Kn0gYSB2YXJpYW50IG9iamVjdCBvciBudWxsXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfcGFyc2VWYXJpYW50KHZqc29uKXtcbiAgICBjb25zdCBhdHRyID0gJ3ZhcmlhbnQnO1xuICAgIGlmKCF2anNvbi5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgJ0ZhdGFsIEVycm9yOiBwYXJzZSB2YXJpYW50IGVycm9yJztcbiAgICBjb25zdCB2YXJpYW50cyA9IHZqc29uW2F0dHJdO1xuICAgIGlmICh2YXJpYW50cy5sZW5ndGggPT0gMCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHZhcmlhbnRzWzBdO1xufVxuXG4vKipcbiAqIGNhbGN1bGF0ZSB0aGUgZVFUTHMgYW5kIGZldGNoIGV4cHJlc3Npb24gb2YgZ2Vub3R5cGVzIGZvciBlYWNoIGdlbmUtdmFyaWFudCBwYWlyXG4gKiBAcGFyYW0gdGlzc3VEaWN0IHtEaWN0aW9uYXJ5fSB0aXNzdWUgbmFtZSBsb29rdXAgdGFibGUsIGluZGV4ZWQgYnkgdGlzc3VlIElEc1xuICogQHBhcmFtIGRhc2hib2FyZElkIHtTdHJpbmd9IHRoZSBkYXNoYm9hcmQgcmVzdWx0cyA8ZGl2PiBJRFxuICogQHBhcmFtIGdlbmUge09iamVjdH0gYSBHVEV4IGdlbmUgb2JqZWN0XG4gKiBAcGFyYW0gdmFyaWFudCB7T2JqZWN0fSB0aGUgR1RFeCB2YXJpYW50IG9iamVjdFxuICogQHBhcmFtIHRpc3N1ZXMge0xpc3R9IG9mIHF1ZXJ5IHRpc3N1ZSBJRHNcbiAqIEBwYXJhbSBpIHtJbnRlZ2VyfSB0aGUgYm94cGxvdCBESVYncyBpbmRleFxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX3JlbmRlckVxdGxQbG90KHRpc3N1ZURpY3QsIGRhc2hib2FyZElkLCBnZW5lLCB2YXJpYW50LCB0aXNzdWVzLCBpLCB1cmxzPWdldEd0ZXhVcmxzKCkpIHtcbiAgICAvLyBkaXNwbGF5IGdlbmUtdmFyaWFudCBwYWlyIG5hbWVzXG4gICAgY29uc3QgaWQgPSBgdmlvbGlucGxvdCR7aX1gO1xuICAgICQoYCMke2Rhc2hib2FyZElkfWApLmFwcGVuZChgPGRpdiBpZD1cIiR7aWR9XCIgY2xhc3M9XCJjb2wtc20tMTJcIj48L2Rpdj5gKTtcblxuICAgIC8vIHBhcnNlIHRoZSBnZW5vdHlwZXMgZnJvbSB0aGUgdmFyaWFudCBJRFxuICAgIGxldCByZWYgPSB2YXJpYW50LnZhcmlhbnRJZC5zcGxpdCgvXy8pWzJdO1xuICAgIGxldCBhbHQgPSB2YXJpYW50LnZhcmlhbnRJZC5zcGxpdCgvXy8pWzNdO1xuICAgIGNvbnN0IGhldCA9IHJlZiArIGFsdDtcbiAgICByZWYgPSByZWYgKyByZWY7XG4gICAgYWx0ID0gYWx0ICsgYWx0O1xuICAgIC8vIGQzLXF1ZXVlIGh0dHBzOi8vZ2l0aHViLmNvbS9kMy9kMy1xdWV1ZVxuICAgIGxldCBwcm9taXNlcyA9IFtdO1xuXG4gICAgLy8gcXVldWUgdXAgYWxsIHRpc3N1ZSBJRHNcbiAgICB0aXNzdWVzLmZvckVhY2goKHRJZCkgPT4ge1xuICAgICAgICBsZXQgdXJsUm9vdCA9IHVybHNbJ2R5bmVxdGwnXTtcbiAgICAgICAgLy8gbGV0IHVybCA9IGAke3VybFJvb3R9P3NucF9pZD0ke3ZhcmlhbnQudmFyaWFudElkfSZnZW5lX2lkPSR7Z2VuZS5nZW5jb2RlSWR9JnRpc3N1ZT0ke3RJZH1gOyAvLyB1c2UgdmFyaWFudCBJRCwgZ2VuY29kZSBJRCBhbmQgdGlzc3VlIElEIHRvIHF1ZXJ5IHRoZSBkeW5lcXRsXG4gICAgICAgIGxldCB1cmwgPSBgJHt1cmxSb290fT92YXJpYW50SWQ9JHt2YXJpYW50LnZhcmlhbnRJZH0mZ2VuY29kZUlkPSR7Z2VuZS5nZW5jb2RlSWR9JnRpc3N1ZVNpdGVEZXRhaWxJZD0ke3RJZH1gOyAvLyB1c2UgdmFyaWFudCBJRCwgZ2VuY29kZSBJRCBhbmQgdGlzc3VlIElEIHRvIHF1ZXJ5IHRoZSBkeW5lcXRsXG4gICAgICAgIHByb21pc2VzLnB1c2goX2FwaUNhbGwodXJsLCB0SWQpKTtcbiAgICB9KTtcblxuICAgIFByb21pc2UuYWxsKHByb21pc2VzKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXN1bHRzKXtcbiAgICAgICAgICAgIGxldCBpbnB1dCA9IFtdOyAvLyBhIGxpc3Qgb2YgZ2Vub3R5cGUgZXhwcmVzc2lvbiBvYmplY3RzXG4gICAgICAgICAgICBsZXQgaW5mbyA9IHt9O1xuICAgICAgICAgICAgcmVzdWx0cy5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGQuc3RhdHVzID09IFwiZmFpbGVkXCIpe1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiBlUVRMcyBhcmVuJ3QgYXZhaWxhYmxlIGZvciB0aGlzIHF1ZXJ5LCBjcmVhdGUgYW4gZW1wdHkgc3BhY2UgZm9yIHRoZSBsYXlvdXQgb2YgdGhlIHJlcG9ydFxuICAgICAgICAgICAgICAgICAgICBsZXQgZ3JvdXAgPSB0aXNzdWVEaWN0W2QudGlzc3VlXTsgLy8gZ3JvdXAgcmVmZXJzIHRvIHRoZSB0aXNzdWUgbmFtZSwgbWFwIHRpc3N1ZSBJRCB0byB0aXNzdWUgbmFtZVxuICAgICAgICAgICAgICAgICAgICAvLyBnZW5vdHlwZSBleHByZXNzaW9uIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQgPSBpbnB1dC5jb25jYXQoW1xuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwOiBncm91cCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogcmVmLmxlbmd0aD4yP1wicmVmXCI6cmVmLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlczogWzBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwOiBncm91cCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogaGV0Lmxlbmd0aD4yP1wiaGV0XCI6aGV0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlczogWzBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwOiBncm91cCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogYWx0Lmxlbmd0aD4yP1wiYWx0XCI6YWx0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlczogWzBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkID0gX3BhcnNlRXF0bChkKTsgLy8gcmVmb3JtYXQgZVFUTCByZXN1bHRzIGRcbiAgICAgICAgICAgICAgICAgICAgbGV0IGdyb3VwID0gdGlzc3VlRGljdFtkLnRpc3N1ZVNpdGVEZXRhaWxJZF07IC8vIGdyb3VwIGlzIHRoZSB0aXNzdWUgbmFtZSwgbWFwIHRpc3N1ZSBJRCB0byB0aXNzdWUgbmFtZVxuXG4gICAgICAgICAgICAgICAgICAgIGlucHV0ID0gaW5wdXQuY29uY2F0KFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBncm91cDogZ3JvdXAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IHJlZi5sZW5ndGg+Mj9cInJlZlwiOnJlZixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaXplOiBkLmhvbW9SZWZFeHAubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlczogZC5ob21vUmVmRXhwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwOiBncm91cCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogaGV0Lmxlbmd0aD4yP1wiaGV0XCI6aGV0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IGQuaGV0ZXJvRXhwLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXM6IGQuaGV0ZXJvRXhwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwOiBncm91cCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogYWx0Lmxlbmd0aD4yP1wiYWx0XCI6YWx0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IGQuaG9tb0FsdEV4cC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzOiBkLmhvbW9BbHRFeHBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZGl0aW9uYWwgaW5mbyBvZiB0aGUgZ3JvdXAgZ29lcyBoZXJlXG4gICAgICAgICAgICAgICAgICAgIGluZm9bZ3JvdXBdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJwdmFsdWVcIjogZFtcInBWYWx1ZVwiXT09PW51bGw/MTpwYXJzZUZsb2F0KGRbXCJwVmFsdWVcIl0pLnRvUHJlY2lzaW9uKDMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJwdmFsdWVUaHJlc2hvbGRcIjogZFtcInBWYWx1ZVRocmVzaG9sZFwiXT09PW51bGw/MDpwYXJzZUZsb2F0KGRbXCJwVmFsdWVUaHJlc2hvbGRcIl0pLnRvUHJlY2lzaW9uKDMpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgX3Zpc3VhbGl6ZShnZW5lLCB2YXJpYW50LCBpZCwgaW5wdXQsIGluZm8pO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtjb25zb2xlLmVycm9yKGVycil9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSBHVEV4IGR5bmVxdGwganNvblxuICogQHBhcmFtIGRhdGEge0pTT059IGZyb20gR1RFeCBkeW5lcXRsIHdlYiBzZXJ2aWNlXG4gKiBAcmV0dXJucyBkYXRhIHtKU09OfSBtb2RpZmllZCBkYXRhXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfcGFyc2VFcXRsKGpzb24pe1xuICAgIC8vIGNoZWNrIHJlcXVpcmVkIGpzb24gYXR0cmlidXRlc1xuICAgIFsnZGF0YScsICdnZW5vdHlwZXMnLCAncFZhbHVlJywgJ3BWYWx1ZVRocmVzaG9sZCcsICd0aXNzdWVTaXRlRGV0YWlsSWQnXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZighanNvbi5oYXNPd25Qcm9wZXJ0eShkKSl7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGpzb24pO1xuICAgICAgICAgICAgdGhyb3cgJ1BhcnNlIEVycm9yOiBSZXF1aXJlZCBqc29uIGF0dHJpYnV0ZSBpcyBtaXNzaW5nOiAnICsgZDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAganNvbi5leHByZXNzaW9uX3ZhbHVlcyA9IGpzb24uZGF0YS5tYXAoKGQpPT5wYXJzZUZsb2F0KGQpKTtcbiAgICBqc29uLmdlbm90eXBlcyA9IGpzb24uZ2Vub3R5cGVzLm1hcCgoZCk9PnBhcnNlRmxvYXQoZCkpO1xuXG4gICAganNvbi5ob21vUmVmRXhwID0ganNvbi5leHByZXNzaW9uX3ZhbHVlcy5maWx0ZXIoKGQsaSkgPT4ge1xuICAgICAgICByZXR1cm4ganNvbi5nZW5vdHlwZXNbaV0gPT0gMFxuICAgIH0pO1xuICAgIGpzb24uaG9tb0FsdEV4cCA9IGpzb24uZXhwcmVzc2lvbl92YWx1ZXMuZmlsdGVyKChkLGkpID0+IHtcbiAgICAgICAgcmV0dXJuIGpzb24uZ2Vub3R5cGVzW2ldID09IDJcbiAgICB9KTtcbiAgICBqc29uLmhldGVyb0V4cCA9IGpzb24uZXhwcmVzc2lvbl92YWx1ZXMuZmlsdGVyKChkLGkpID0+IHtcbiAgICAgICAgcmV0dXJuIGpzb24uZ2Vub3R5cGVzW2ldID09IDFcbiAgICB9KTtcbiAgICByZXR1cm4ganNvbjtcbn1cblxuZnVuY3Rpb24gX2FwaUNhbGwodXJsLCB0aXNzdWUpe1xuICAgIC8vIHJlZmVyZW5jZTogaHR0cDovL2FkYW1wYXh0b24uY29tL2hhbmRsaW5nLW11bHRpcGxlLWphdmFzY3JpcHQtcHJvbWlzZXMtZXZlbi1pZi1zb21lLWZhaWwvXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgIGpzb24odXJsKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVxdWVzdCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUocmVxdWVzdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgLy8gcmVwb3J0IHRoZSB0aXNzdWUgYXMgZmFpbGVkXG4gICAgICAgICAgICAgICAgY29uc3QgZmFpbGVkID0ge1xuICAgICAgICAgICAgICAgICAgICB0aXNzdWU6IHRpc3N1ZSxcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiBcImZhaWxlZFwiXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGZhaWxlZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcblxufVxuXG5cblxuXG4iXSwibmFtZXMiOlsibWF0Y2hlciIsInNlbGVjdGlvbiIsImVsZW1lbnQiLCJhc2NlbmRpbmciLCJxdWFudGlsZSIsIm1hcCIsImFycmF5Iiwic2xpY2UiLCJyYW5nZSIsImNvbnN0YW50IiwiY29sb3IiLCJyZ2IiLCJjb2xvclJnYiIsIm51bWJlciIsInN0cmluZyIsImlkZW50aXR5IiwiYmlzZWN0IiwiaW50ZXJwb2xhdGUiLCJpbnRlcnBvbGF0ZVZhbHVlIiwibGluZWFyIiwiZGVpbnRlcnBvbGF0ZSIsInJlaW50ZXJwb2xhdGUiLCJ0MCIsInQxIiwiaW50ZXJ2YWwiLCJmb3JtYXRMb2NhbGUiLCJkYXkiLCJ0aW1lTW9uZGF5IiwidGltZURheSIsInRpbWVZZWFyIiwidGltZVN1bmRheSIsInRpbWVUaHVyc2RheSIsImxvY2FsZSIsImRlZmF1bHRMb2NhbGUiLCJwaSIsIngiLCJwb2ludFgiLCJ5IiwicG9pbnRZIiwicG9pbnQiLCJlcHNpbG9uIiwibm9vcCIsInBhcnNlVHlwZW5hbWVzIiwic2V0IiwiY3JlYXRlIiwiZ2V0IiwidGltZW91dCIsInNjaGVkdWxlIiwiYXR0clJlbW92ZSIsImF0dHJSZW1vdmVOUyIsImF0dHJDb25zdGFudCIsImF0dHJDb25zdGFudE5TIiwiYXR0ckZ1bmN0aW9uIiwidmFsdWUiLCJhdHRyRnVuY3Rpb25OUyIsImludGVycG9sYXRlVHJhbnNmb3JtIiwidHJhbnNpdGlvbiIsInNlbGVjdCIsIlNlbGVjdGlvbiIsInN0eWxlUmVtb3ZlIiwic3R5bGUiLCJzdHlsZUNvbnN0YW50Iiwic3R5bGVGdW5jdGlvbiIsInRleHRDb25zdGFudCIsInRleHRGdW5jdGlvbiIsInRhdSIsImVhc2VDdWJpY0luT3V0Iiwibm9wcm9wYWdhdGlvbiIsImRlZmF1bHRGaWx0ZXIiLCJsb2NhbCIsImVtcHR5IiwiYnJ1c2giLCJub2V2ZW50IiwiZHJhZ0Rpc2FibGUiLCJkcmFnRW5hYmxlIiwic2NhbGVCYW5kIiwic2NhbGVMaW5lYXIiLCJlbnRyaWVzIiwibWluIiwibWF4IiwianNvbiJdLCJtYXBwaW5ncyI6Ijs7O0VBQUEsSUFBSSxHQUFHLEdBQUcsRUFBRTtFQUNaLElBQUksR0FBRyxHQUFHLEVBQUU7RUFDWixJQUFJLEtBQUssR0FBRyxFQUFFO0VBQ2QsSUFBSSxPQUFPLEdBQUcsRUFBRTtFQUNoQixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7O0VBRWhCLFNBQVMsZUFBZSxDQUFDLE9BQU8sRUFBRTtFQUNsQyxFQUFFLE9BQU8sSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFFLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsSUFBSSxFQUFF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QUFFLEVBQUUsQ0FBQyxDQUFDOztFQUUvQyxJQUFJLFNBQVMsS0FBSyxHQUFHO0VBQ3JCLE1BQU0sSUFBSSxHQUFHLEVBQUUsT0FBTyxHQUFHLENBQUM7RUFDMUIsTUFBTSxJQUFJLEdBQUcsRUFBRSxPQUFPLEdBQUcsR0FBRyxLQUFLLEVBQUUsR0FBRyxDQUFDOztFQUV2QztFQUNBLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDdEIsTUFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxFQUFFO0VBQ3hDLFFBQVEsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDO0VBQzFGLFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUM7RUFDckMsYUFBYSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxPQUFPLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQztFQUNwRSxhQUFhLElBQUksQ0FBQyxLQUFLLE1BQU0sRUFBRSxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7RUFDdkYsUUFBUSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztFQUM3RCxPQUFPOztFQUVQO0VBQ0EsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDcEIsUUFBUSxJ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LENBQUM7RUFDM0MsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDMUIsQ0FBQzs7RUMzQkQsU0FBUyxVQUFVLENBQUMsTUFBTSxFQUFFO0VBQzVCLEVBQUUsT0FBTyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0VBQ3RDLENBQUM7O0VBRUQsU0FBUyxTQUFTLENBQUMsSUFBSSxFQUFFO0VBQ3pCLEVBQUUsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQy9DLENBQUM7O0VBRUQsU0FBUyxTQUFTLENBQUMsSUFBSSxFQUFFO0VBQ3pCLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7RUFDcEIsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0VBQzdELENBQUM7O0VBRUQsU0FBUyxDQUFDLFNBQVMsR0FBRztFQUN0QixFQUFFLEdBQUcsRUFBRSxTQUFTLElBQUksRUFBRTtFQUN0QixJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ3RDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQ2YsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUM3QixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQzlELEtBQUs7RUFDTCxHQUFHO0VBQ0gsRUFBRSxNQUFNLEVBQUUsU0FBUyxJQUFJLEVBQUU7RUFDekIsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJ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LEVBQUUsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQztFQUNoRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztFQUNwRCxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDekMsRUFBRSxPQUFPLEtBQUssSUFBSSxDQUFDO0VBQ25CLFFBQVEsQ0FBQyxLQUFLLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDO0VBQ3pGLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxHQUFHLEdBQUcsRUFBRSxHQUFHLEtBQUssSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEtBQUssSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQzVGLENBQUM7O0FBRUQsRUFBTyxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRTtFQUM3QyxFQUFFLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQztFQUN6RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcs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LEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDdEssUUFBUSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0VBQzVELFFBQVEsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDdEUsUUFBUSxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQztFQUMxRyxRQUFRLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN2RSxRQUFRLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMzRyxRQUFRLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0VBQy9FLFFBQVEsQ0FBQyxDQUFDLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDbkYsUUFBUSxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDMUQsUUFBUSxNQUFNLEtBQUssYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztFQUM1RCxRQUFRLElBQUksQ0FBQztFQUNiLENBQUM7O0VBRUQsU0FBUyxJQUFJLENBQUMsQ0FBQyxFQUFFO0VBQ2pCLEVBQUUsT0FBTyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQzdELENBQUM7O0VBRUQsU0FBUyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQzFCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztFQUM5QixFQUFFLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDN0IsQ0FBQzs7QUFFRCxFQUFPLFNBQVMsVUFBVSxDQUFDLENBQUMsRUFBRTtFQUM5QixFQUFFLElBQUksRUFBRSxDQUFDLFlBQVksS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsT0FBTyxJQUFJLEdBQUcsQ0FBQztFQUN6QixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7RUFDZCxFQUFFLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0VBQzNDLENBQUM7O0FBRUQsRUFBTyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUU7RUFDdEMsRUFBRSxPQUFPLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQztFQUNsRyxDQUFDOztBQUVELEVBQU8sU0FBUyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFO0VBQ3RDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUNkLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUNkLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUNkLEVBQUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQztFQUMxQixDQUFDOztFQUVELE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUU7RUFDL0IsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7RUFDeEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDckQsSUFBSSxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztFQUNyRSxHQUFHO0VBQ0gsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUU7RUFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDakQsSUFBSSxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztFQUNyRSxHQUFHO0VBQ0gsRUFBRSxHQUFHLEVBQUUsV0FBVztFQUNsQixJQUFJLE9BQU8sSUFBSSxDQUFDO0VBQ2hCLEdBQUc7RUFDSCxFQUFFLFdBQVcsRUFBRSxXQUFXO0VBQzFCLElBQUksT0FBTyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRztFQUN4QyxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDO0VBQ3pDLFlBQVksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUM7RUFDekMsWUFBWSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3BELEdBQUc7RUFDSCxFQUFFLFFBQVEsRUFBRSxXQUFXO0VBQ3ZCLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDekUsSUFBSSxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLEdBQUcsT0FBTztFQUN0QyxVQUFVLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSTtFQUNwRSxVQUFVLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSTtFQUNwRSxVQUFVLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQzdELFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztFQUMzQyxHQUFHO0VBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7RUFFSixTQUFTLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDMUIsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO0VBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7RUFDekMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQztFQUMzQixFQUFFLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDN0IsQ0FBQzs7QUFFRCxFQUFPLFNBQVMsVUFBVSxDQUFDLENBQUMsRUFBRTtFQUM5QixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxPQUFPLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztFQUNqRSxFQUFFLElBQUksRUFBRSxDQUFDLFlBQVksS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsT0FBTyxJQUFJLEdBQUcsQ0FBQztFQUN6QixFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztFQUNqQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7RUFDZCxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRztFQUNuQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUc7RUFDbkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHO0VBQ25CLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDN0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUM3QixNQUFNLENBQUMsR0FBRyxHQUFHO0VBQ2IsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUc7RUFDbkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztFQUMxQixFQUFFLElBQUksQ0FBQyxFQUFFO0VBQ1QsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNqRCxTQUFTLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDNUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDO0VBQzdDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztFQUNaLEdBQUcsTUFBTTtFQUNULElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQy9CLEdBQUc7RUFDSCxFQUFFLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0VBQ3JDLENBQUM7O0FBRUQsRUFBTyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUU7RUFDdEMsRUFBRSxPQUFPLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQztFQUNsRyxDQUFDOztFQUVELFNBQVMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRTtFQUMvQixFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDZCxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDZCxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDZCxFQUFFLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUM7RUFDMUIsQ0FBQzs7RUFFRCxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFO0VBQy9CLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO0VBQ3hCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ3JELElBQUksT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0VBQzdELEdBQUc7RUFDSCxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsRUFBRTtFQUN0QixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNqRCxJQUFJLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztFQUM3RCxHQUFHO0VBQ0gsRUFBRSxHQUFHLEVBQUUsV0FBVztFQUNsQixJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRztFQUM3QyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDbEQsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7RUFDbEIsUUFBUSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO0VBQzFDLFFBQVEsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0VBQ3hCLElBQUksT0FBTyxJQUFJLEdBQUc7RUFDbEIsTUFB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LEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0VBQ3pFLEdBQUc7RUFDSCxFQUFFLElBQUksRUFBRSxDQUFDLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM3QyxFQUFFLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3ZCLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3ZCLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3ZCLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDOUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNO0VBQzFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0VBQ3RFLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0VBQ3RFLEdBQUc7RUFDSCxFQUFFLE9BQU8sSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMs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QUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztFQUNqRSxFQUFFLElBQUksRUFBRSxDQUFDLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM3QyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0VBQ3JFLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUM7RUFDekMsRUFBRSxPQUFPLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7RUFDeEYsQ0FBQztBQUNELEFBSUE7QUFDQSxFQUFPLFNBQVMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRTtFQUN0QyxFQUFFLE9BQU8sU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0VBQ2xHLENBQUM7O0FBRUQsRUFBTyxTQUFTLEdBQUcsQ0FBQyxDQUFD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QUFFLFNBQVMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM5QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUNqQixNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQztFQUNoRSxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFQSxpQkFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDbkYsS0FBSyxNQUFNLElBQUksQ0FBQyxFQUFFO0VBQ2xCLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQztFQUNoRCxLQUFLO0VBQ0wsR0FBRzs7RUFFSCxFQUFFLFNBQVMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM3QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtFQUNqQixNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFQSxpQkFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDbEYsS0FBSyxNQUFNLElBQUksQ0FBQyxFQUFFO0VBQ2xCLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQztFQUMvQyxLQUFLO0VBQ0wsR0FBRzs7RUFFSCxFQUFFLFNBQVMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQ3ZDLElBQUksSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUU7RUFDaEMsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDOUQsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFQSxpQkFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFQSxpQkFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDM0UsS0FBSyxNQUFNLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFO0VBQ3JDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0VBQ3RELEtBQUs7RUFDTCxHQUFHOztFQUVILEVBQUUsT0FBTyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDeEIsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO0VBQ2QsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDO0VBQ2YsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENB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LElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQztFQUNuRixHQUFHLENBQUM7O0VBRUosRUFBRSxRQUFRLENBQUMsS0FBSyxHQUFHLFNBQVMsSUFBSSxFQUFFO0VBQ2xDLElBQUksSUFBSSxFQUFFLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztFQUMzQixRQUFRLEVBQUUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ2pDLElBQUksT0FBTyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztFQUMzQyxHQUFHLENBQUM7O0VBRUosRUFBRSxRQUFRLENBQUMsTUFBTSxHQUFHLFNBQVMsSUFBSSxFQUFFLElBQUksRUFBRTtFQUN6QyxJQUFJLE9BQU8sT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7RUFDdEYsR0FBRyxDQUFDOztFQUVKLEVBQUUsUUFBUSxDQUFDLEtBQUssR0FBRyxTQUFTLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQy9DLElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRSxFQUFFLFFBQVEsQ0FBQztFQUM3QixJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQ2pDLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDL0MsSUFBSSxJQUFJLEVBQUUsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxHQUFHLENBQUMs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RTtFQUNwQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUU7RUFDN0IsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNwRSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzdCLElBQUksT0FBTyxJQUFJLENBQUM7RUFDaEIsR0FBRztFQUNILEVBQUUsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQy9ELENBQUM7O0VBRUQsU0FBUyxPQUFPLENBQUMsQ0FBQyxFQUFFO0VBQ3BCLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNwRCxDQUFDOztBQUVELEVBQWUsU0FBU0MsY0FBWSxDQUFDLE1BQU0sRUFBRTtFQUM3QyxFQUFFLElBQUksZUFBZSxHQUFHLE1BQU0sQ0FBQyxRQUFRO0VBQ3ZDLE1BQU0sV0FBVyxHQUFHLE1BQU0s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Q3JELFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7RUFDbkMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztFQUNoQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQy9DLFNBQVM7RUFDVCxPQUFPLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7RUFDdkMsUUFBUSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDckUsUUFBUUYsTUFBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0VBQzVGLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDaEIsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQ0EsTUFBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDQSxNQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztF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QyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDaEQsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2pELENBQUM7O0VBRUQsU0FBUyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtFQUNoRCxFQUFFLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDaEQsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2pELENBQUM7O0VBRUQsU0FBUyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtFQUM3QyxFQUFFLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDaEQsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2pELENBQUM7O0VBRUQsU0FBUyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtFQUMxQyxFQUFFLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDaEQsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2pELENBQUM7O0VBRUQsU0FBUyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtFQUM3QyxFQUFFLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDaEQsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2pELENBQUM7O0VBRUQsU0FBUyxhQUFhLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFDckMsRUFBRSxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ2hELEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNqRCxDQUFDOztFQUVELFNBQVMsU0FBUyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO0VBQ2pDLEVBQUUsSUFBSSxDQUFDLEdBQUcsUUFBUSxD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QUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDakQsQ0FBQzs7RUFFRCxTQUFTLFlBQVksQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtFQUNwQyxFQUFFLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDaEQsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2pELENBQUM7O0VBRUQsU0FBUyxZQUFZLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFDcEMsRUFBRSxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ2hELEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNqRCxDQUFDOztFQUVELFNBQVMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7RUFDekMsRUFBRSxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ2hELEVB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QUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDcEgsR0FBRztFQUNILEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtFQUNyQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDbkQsSUFBSSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRztFQUNyQixRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRztFQUNyQixRQUFRLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNyQixRQUFRLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNyQixRQUFRLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNyQixRQUFRLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNyQixRQUFRLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUM7O0VBRXRDO0VBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUMsQ0FBQzs7RUFFeEQ7RUFDQSxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxJQUFJLEVBQUU7RUFDM0IsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0VBQzlELEtBQUs7O0VBRUw7RUFDQSxTQUFTLElBQUksRUFBRSxLQUFLLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBRTs7RUFFbkM7RUFDQTtFQUNBO0VBQ0EsU0FBUyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtFQUNqRSxNQUFNLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUM7RUFDOUQsS0FBSzs7RUFFTDtFQUNBLFNBQVM7RUFDVCxNQUFNLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQ3ZCLFVBQVUsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQ3ZCLFVBQVUsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUc7RUFDdkMsVUFBVSxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztFQUN2QyxVQUFVLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztFQUNoQyxVQUFVLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztFQUNoQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssR0FBRyxLQUFLLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENB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R0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxPQUFPLEdBQUcsRUFBRSxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0VBQ3RLLEtBQUs7O0VBRUw7RUFDQSxTQUFTLElBQUksRUFBRSxHQUFHLE9BQU8sRUFBRTtFQUMzQixNQUFNLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEtBQUssSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDekosS0FBSztFQUNMLEdBQUc7RUFDSCxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtFQUM3QixJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMs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QUlGLElBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUFHMUIsVUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJMEIsSUFBQyxDQUFDO0VBQ3pGLEdBQUcsQ0FBQzs7RUFFSixFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLEVBQUU7RUFDdkIsSUFBSSxPQUFPLFNBQVMsQ0FBQyxNQUFNLElBQUlFLElBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUFHNUIsVUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxJQUFJNEIsSUFBQyxDQUFDO0VBQ3pGLEdBQUcsQ0FBQzs7RUFFSixFQUFFLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLEVBQUU7RUFDN0IsSUFBSSxPQUFPLFNBQVMsQ0FBQyxNQUFNLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQUc1QixVQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxPQUFPLENBQUM7RUFDdEcsR0FBRyxDQUFDOztFQUVKLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsRUFBRTtFQUMzQixJQUFJLE9BQU8sU0FBUyxDQUFDLE1BQU0sSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLE9BQU8sSUFBSSxJQUFJLEtBQUssTUFBTSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxLQUFLLENBQUM7RUFDdEcsR0FBRyxDQUFDOztFQUVKLEVBQUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUMsRUFBRTtFQUM3QixJQUFJLE9BQU8sU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksSUFBSSxHQUFHLE9BQU8sR0FBRyxNQUFNLEdBQUcsSUFBSSxHQUFHLE1BQU0sR0FBRyxLQUFLLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksSUFB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RUFDQTtFQUNBLFNBQVMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzlCLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRztFQUM5QixNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUc7RUFDeEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDdkQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNqRCxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7RUFDMUMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUM5RixDQUFDOztFQUVEO0VBQ0EsU0FBUyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRTtFQUN6QixFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztFQUM5QixFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMs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QUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07RUFDM0csTUFBTSxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU07RUFDckMsTUFBTSxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDQSxPQUFLLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNO0VBQzdGLE1BQU0sU0FBU0EsT0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtFQUNyRSxLQUFLOztFQUVMLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0VBQ3RDLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0VBQ3RDLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7RUFDbEIsR0FBRztFQUNILEVBQUM7O0VBRUQsU0FBUyxTQUFTLENBQUMsT0FBTyxFQUFFO0VBQzVCLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztFQUM5QyxDQUFDOztFQUVELENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEdBQUcsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQ2xGLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDN0MsQ0FBQyxDQUFDOztFQUVGLFNBQVMsY0FBYyxDQUFDLE9BQU8sRUFBRTtFQUNqQyxFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO0VBQzFCLENBQUM7O0VBRUQsY0FBYyxDQUFDLFNBQVMsR0FBRztFQUMzQixFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUN4RCxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFO0VBQ3RELEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ3hELEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDdEcsQ0FBQyxDQUFDOztFQy9GSyxJQUFJaEMsT0FBSyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDOztFQ0ExQixtQkFBUSxDQUFDLENBQUMsRUFBRTtFQUMzQixFQUFFLE9BQU8sQ0FBQyxDQUFDO0VBQ1gsQ0FBQzs7RUNDRCxJQUFJLEdBQUcsR0FBRyxDQUFDO0VBQ1gsSUFBSSxLQUFLLEdBQUcsQ0FBQztFQUNiLElBQUksTUFBTSxHQUFHLENBQUM7RUFDZCxJQUFJLElBQUksR0FBRyxDQUFDO0VBQ1osSUFBSWlDLFNBQU8sR0FBRyxJQUFJLENBQUM7O0VBRW5CLFNBQVMsVUFBVSxDQUFDLENBQUMsRUFBRTtFQUN2QixFQUFFLE9BQU8sWUFBWSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7RUFDMUMsQ0FBQzs7RUFFRCxTQUFTLFVBQVUsQ0FBQyxDQUFDLEVBQUU7RUFDdkIsRUFBRSxPQUFPLGNBQWMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO0VBQzFDLENBQUM7O0VBRUQsU0FBUzNCLFFBQU0sQ0FBQyxLQUFLLEVBQUU7RUFDdkIsRUFBRSxPQUFPLFNBQVMsQ0FBQyxFQUFFO0VBQ3JCLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNyQixHQUFHLENBQUM7RUFDSixDQUFDOztFQUVELFNBQVMsTUFBTSxDQUFDLEtBQUssRUFBRTtFQUN2QixFQUFFLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDdEQsRUFBRSxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUNqRCxFQUFFLE9BQU8sU0FBUyxDQUFDLEVBQUU7RUFDckIsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQztFQUM5QixHQUFHLENBQUM7RUFDSixDQUFDOztFQUVELFNBQVMsUUFBUSxHQUFHO0VBQ3BCLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7RUFDdEIsQ0FBQzs7RUFFRCxTQUFTLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFO0VBQzdCLEVBQUUsSUFBSSxhQUFhLEdBQUcsRUFBRTtFQUN4QixNQUFNLFVBQVUsR0FBRyxJQUFJO0VBQ3ZCLE1BQU0sVUFBVSxHQUFHLElBQUk7RUFDdkIsTUFBTSxhQUFhLEdBQUcsQ0FBQztFQUN2QixNQUFNLGFBQWEsR0FBRyxDQUFDO0VBQ3ZCLE1BQU0sV0FBVyxHQUFHLENBQUM7RUFDckIsTUFBTSxDQUFDLEdBQUcsTUFBTSxLQUFLLEdBQUcsSUFBSSxNQUFNLEtBQUssSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7RUFDcEQsTUFBTSxDQUFDLEdBQUcsTUFBTSxLQUFLLElBQUksSUFBSSxNQUFNLEtBQUssS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHO0VBQ3pELE1BQU0sU0FBUyxHQUFHLE1BQU0sS0FBSyxHQUFHLElBQUksTUFBTSxLQUFLLE1BQU0sR0FBRyxVQUFVLEdBQUcsVUFBVSxDQUFDOztFQUVoRixFQUFFLFNBQVMsSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUN6QixJQUFJLElBQUksTUFBTSxHQUFHLFVBQVUsSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLFVBQVU7RUFDM0gsUUFBUSxNQUFNLEdBQUcsVUFBVSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsR0FBR0UsVUFBUSxJQUFJLFVBQVU7RUFDL0gsUUFBUSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEdBQUcsV0FBVztFQUMxRCxRQUFRLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFO0VBQzdCLFFBQVEsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUc7RUFDaEMsUUFBUSxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHO0VBQy9DLFFBQVEsUUFBUSxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxNQUFNLEdBQUdGLFFBQU0sRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7RUFDcEUsUUFBUSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsT0FBTztFQUNyRSxRQUFRLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzFELFFBQVEsSUFBSSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUU7RUFDdkUsUUFBUSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRTtFQUM5QixRQUFRLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDO0VBQ2xFLFFBQVEsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQ2xDLFFBQVEsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7O0VBRW5DLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO0VBQzFELFNBQVMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7RUFDaEMsU0FBUyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7O0VBRWpDLElBQUksSUFBSSxHQUFHLElBQUks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QUUsSUFBSSxFQUFFLFdBQVc7RUFDbkIsSUFBSSxJQUFJLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDOUIsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0VBQzVDLElBQUksT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUM5QixHQUFHO0VBQ0gsRUFBRSxJQUFJLEVBQUUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFO0VBQzdCLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztFQUMxSCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxDQUFDO0VBQy9FLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0VBQ3pGLEdBQUc7RUFDSCxFQUFFLEtB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LEtBQUssR0FBRzdDLFNBQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQzs7RUFFMUQsRUFBRSxLQUFLLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRTtFQUNsRyxJQUFJLEtBQUssSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7RUFDekcsTUFBTSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRTtFQUMxRSxRQUFRLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDNUIsT0FBTztFQUNQLEtBQUs7RUFDTCxHQUFHOztFQUVILEVBQUUsT0FBTyxJQUFJLFVBQVUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUN4RSxDQUFDOztFQ2JjLHlCQUFRLENBQUN3RCxhQUFVLEVBQUU7RUFDcEMsRUFBRSxJQUFJQSxhQUFVLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQzs7RUFFbkQsRUFBRSxLQUFLLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxH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RUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzdELENBQUMsQ0FBQzs7RUFFRixJQUFJLENBQUMsR0FBRztFQUNSLEVBQUUsSUFBSSxFQUFFLEdBQUc7RUFDWCxFQUFFLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO0VBQy9CLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzNFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUM3RCxDQUFDLENBQUM7O0VBRUYsSUFBSSxFQUFFLEdBQUc7RUFDVCxFQUFFLElBQUksRUFBRSxJQUFJO0VBQ1osRUFBRSxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztFQUNqRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFB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QUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztFQUM3RixVQUFVLE1BQU07RUFDaEIsU0FBUztFQUNULFFBQVEsS0FBSyxXQUFXLEVBQUU7RUFDMUIsVUFBVSxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO0VBQzVGLGVBQWUsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztFQUNqRyxVQUFVLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUM7RUFDNUYsZUFBZSxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxD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QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNqRSxZQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDRCxNQUFHLEVBQUVDLE1BQUcsQ0FBQyxDQUFDLENBQUM7O0VBRTVDLFlBQVksR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztFQUMzRCxTQUFTOzs7RUFHVDtFQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUMvQyxRQUFRLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDOUQsUUFBUSxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOztFQUU5RCxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSTtFQUN0QyxZQUFZLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUM7RUFDL0IsWUFBWSxJQUFJRixVQUFPLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQzs7RUFFcEM7RUFDQSxZQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSTtFQUMzQixpQkFBaUIsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FB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QyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7RUFFekY7RUFDQSxRQUFRLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3RELFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQ3BCLGFBQWEsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDbEMsYUFBYSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7RUFFL0c7RUFDQSxRQUFRLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0VBQ3ZDLGFBQWEsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7O0VBRTFELFFBQVEsSUFBSSxNQUFNLEdBQUcsSUFBSSxFQUFFO0VBQzNCLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxD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
