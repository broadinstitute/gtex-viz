/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function Filter (div) {
        var _data;
        var _title;
        var _div = d3.select(div).append('div');

        var _selected = [];

        var _checkboxHash = {};

        var _parentHash = {};
        var _childrenHash = {};
        var _descendentHash = {};
        var _states = {};

        var _callback = null;

        var _leftDiv = null;
        var _rightDiv = null;

        var _mapping = null;

        function callback (func) {
            _callback = func;
        }

        function generate (input) {
            var raw = input.data;
            //var mapping = input.mapping;
            if (input.textMap) {
                _mapping = input.textMap;
            }
            var data = rawToData([['All', true]].concat(raw));
            var array = tail(rawToArray([['All', true]].concat(raw), 0));
            var title = {value: 'All', depth: -1, checked: true};
            _title = title.value;

            var totalChildren = length(flatten(data));

            var globalControlDiv = _div.append('div')
                .attr('class', 'pvz-control');

            _descendentHash = createDescendentHash(data);
            _childrenHash = createChildrenHash(data);
            _parentHash = createParentHash(data);

            var allBox = globalControlDiv.append('div')
                .attr('class', 'btn btn-default pvz-all')
                .on('click', function (d) {
                    select(d.value);
                    descendentHash(d.value).forEach(isSelected(d.value) ? select : deselect);
                    parentPath(d.value);
                    update(generateArray());
                    if (_callback) { _callback(selected()); }

                    function parentPath (key) {
                        var p = parentHash(key);
                        if (p) {
                            if(descendentHash(p).map(isSelected).reduce(function (a, b) { return a && b; })) {
                                select(p);
                            } else {
                                deselect(p);
                            }
                            parentPath(p);
                        }
                    }

                });

            allBox.data([title]);

            var allBoxCheckbox = allBox.append('input')
                .attr({
                    'type': 'checkbox',
                    'checked': function (d) {
                        (d.checked ? select : deselect).call(null, d.value);
                        _checkboxHash[d.value] = this;
                        return d.checked ? true : null;
                    }
                })
                .on('click', function (d) {
                    select(d.value);
                    descendentHash(d.value).forEach(isSelected(d.value) ? select : deselect);
                    parentPath(d.value);
                    update(generateArray());
                    if (_callback) { _callback(selected()); }

                    function parentPath (key) {
                        var p = parentHash(key);
                        if (p) {
                            if(descendentHash(p).map(isSelected).reduce(function (a, b) { return a && b; })) {
                                select(p);
                            } else {
                                deselect(p);
                            }
                            parentPath(p);
                        }
                    }
                });

            allBox.append('text')
                .attr('class', 'pvz-text')
                .text(function (d) { return d.value; })
              .append('span')
                .attr('class', 'badge gtex-badge')
                .text(function (d) {
                    return length(childrenHash(d.value));
                });


            var clearButton = globalControlDiv.append('button');
            clearButton.on('click', function (d) {
                    generateKeys().forEach(deselect);
                    update(generateArray());
                    if (_callback) { _callback(selected()); }
                })
                .text('Clear All')
                .attr('class', 'btn btn-default pvz-clear');

            var container = _div.append('div').attr('class', 'pvz-container');
            _leftDiv = container.append('div')
                .attr('class', 'col-sm-6 col-md-6 pvz-filter-box');
            _rightDiv = container.append('div')
                .attr('class', 'col-sm-6 col-md-6 pvz-filter-box');

            var elementDivide = divideElements(array, parseInt(totalChildren / 2));
            var leftElements = elementDivide[0];
            var rightElements = elementDivide[1];

            create(_leftDiv, leftElements);
            create(_rightDiv, rightElements);

            if (generateKeys().length === selected().length) {
                select('All');
                allBoxCheckbox.attr('checked', 'true');
            } else {
                deselect('All');
                allBoxCheckbox.attr('checked', null);
            }
        }

        function divideElements (elements, cutoff) {
            var right = JSON.parse(JSON.stringify(elements));
            var left = right.splice(0, cutoff);
            while(length(right) > 0 && head(right).depth > 1) {
                left.push(right.shift(1));
            }
            return [left, right];
        }

        function create (d3Selection, elements) {
            var options = d3Selection.selectAll('div')
                .data(elements)
              .enter().append('div')
                .attr('class', function (d) { return 'btn btn-default pvz-btn' + (d.checked ? ' pvz-btn-on' : ' pvz-btn-off') + ' depth' + d.depth; })
                .on('click', function (d) {
                    flip(d.value);
                    descendentHash(d.value).forEach(isSelected(d.value) ? select : deselect);
                    parentPath(d.value);
                    update(generateArray());
                    if (_callback) { _callback(selected()); }

                    function parentPath (key) {
                        var p = parentHash(key);
                        if (p) {
                            if(descendentHash(p).map(isSelected).reduce(function (a, b) { return a && b; })) {
                                select(p);
                            } else {
                                deselect(p);
                            }
                            parentPath(p);
                        }
                    }

                });

            options.append('input')
                .attr({
                    'type': 'checkbox',
                    'checked': function (d) {
                        (d.checked ? select : deselect).call(null, d.value);
                        _checkboxHash[d.value] = this;
                        return d.checked ? true: null;
                    }
                });

            var text = options.append('text')
                .attr('class', 'pvz-text')
                .text(function (d) { return d.displayText; })
              .append('span')
                .attr('class', 'badge gtex-badge')
                .text(function (d) {
                    var childrenCount = length(childrenHash(d.value));
                    return childrenCount > 0 ? childrenCount : null;
                });
        }

        function update (elements) {
            elements.forEach(function (element) {
                if (rawState(element)) {
                    check(rawValue(element));
                } else {
                    uncheck(rawValue(element));
                }
            });
        }

        function calculateChildren (data) {
            var t = tail(data);
            return head(t) ? d3.sum(children(data).map(calculateChildren)) : 1;
        }

        function leaves (data) {
            if (data instanceof Array) {
                return flatten(children(data).map(leaves));
            } else {
                return data;
            }
        }

        function dataToFilter (data, selection, depth) {
            var offset = 20;
            var div = selection.append('div')
                .attr('class', 'filter-button-div')
                .style({
                    'padding-left': offset + 'px'
                });

            var inner = div.append('div').attr('class','filter-button-div filter-button-div-on depth' + depth);

            inner.append('input')
                .data([{
                    label: head(data),
                    children: (function () {
                        if (0 === depth) {
                            var parent = head(data);
                            leaves(data).filter(function (d) { return parent !== d; })
                            .forEach(function (child) {
                                setParentToChild(child, parent);
                                addChildToParent(parent, child);
                            });
                        }
                        return tail(data);
                    })()
                }])
                .attr('class', 'filter-button filter-button-on')
                .attr('type', function (d) {
                    filterButtonReference(head(data), this);
                    addToSelected(head(data));
                    return 'checkbox';
                })
                .on('click', function (d) {
                    var children = flatten(d.children).filter(function (d) { return d; });
                    if (selectedContains(d.label)) {
                        removeFromSelected(d.label);
                        removeFromSelected(children);
                    } else {
                        addToSelected(d.label);
                        addToSelected(children);
                    }

                    deselectReferences(referenceNames());

                    selectReferences(selected());

                    if (parentHash(d.label)) {
                        var siblings = childrenHash(parentHash(d.label));
                        if (siblings.map(function (sibling) {return selectedContains(sibling);}).reduce(function (a, b) {return a && b;}, true)) {
                            addToSelected(parentHash(d.label));
                            selectReferences(parentHash(d.label));
                        } else {
                            removeFromSelected(parentHash(d.label));
                            deselectReferences(parentHash(d.label));
                        }
                    }

                    deselectReferences('All');

                    var leafies = leaves(_data);

                    if (calculateChildren(_data) === intersect(leafies, selected()).length) {
                        selectReferences('All');
                    }

                    if (_callback) { _callback(selected()); }
                });

                selectReferences(head(data));

            var text = inner.append('text')
                .attr('class', 'filter-text')
                .text(head(data));

            if (calculateChildren(data) > 1) {
                text.append('span')
                    .attr('class', 'badge pvz-badge')
                    .text(calculateChildren(data));
            }
            //var div2 = div.append('div');
            var div2 = div;

            var t = tail(data)[0];
            if (t) {
                t.forEach(function (d) {
                    dataToFilter(d, div2, depth + 1);
                });
            }
        }

        function rawToArray (raw, depth) {
            if (isRawElement(raw)) {
                return [rawElementToObject(raw, depth)];
            } else {
                return rawChildren(raw).map(function (d) {
                    return rawToArray(d, depth + 1); }).reduce(function (a, b) {
                        return a.concat(b);
                    }, [rawElementToObject(rawParent(raw), depth)]);
            }
        }

        function isRawElement (element) {
            return 'string' === typeof head(element);
        }

        function rawElementToObject (element, depth) {
            return {
                displayText: _mapping ? (_mapping[element[0]] ? _mapping[element[0]] : element[0]) : element[0],
                value: element[0],
                depth: depth,
                checked: element[1]
            };
        }

        function parent (data) { return head(data); }

        function rawParent (raw) { return isRawElement(raw) ? raw : head(raw); }

        function children (data) { return tail(data); }

        function rawChildren (raw) { return isRawElement(raw) ? [] : tail(raw); }

        function descendents (data) { return flatten(children(data)); }

        function createDescendentHash (data) {
            var hash = {};
            hashPath(data);
            return hash;

            function hashPath (descent) {
                if (descent instanceof Array) {
                    hash[parent(descent)] = descendents(descent);
                    children(descent).forEach(hashPath);
                } else {
                    hash[descent] = [];
                }
            }
        }

        function createChildrenHash (data) {
            var hash = {};
            hashPath(data);
            return hash;

            function hashPath (descent) {
                if (descent instanceof Array) {
                    hash[parent(descent)] = leaves(descent);
                    children(descent).forEach(hashPath);
                } else {
                    hash[descent] = [];
                }
            }
        }

        function createParentHash (data) {
            var hash = {};
            hashPath(data);
            return hash;

            function hashPath (descent) {
                if (descent instanceof Array) {
                    children(descent).forEach(function (d) {
                        if (d instanceof Array) {
                            hash[parent(d)] = parent(descent);
                        } else {
                            hash[d] = parent(descent);
                        }
                    });
                    children(descent).forEach(hashPath);
                }
            }
        }

        function rawToData (raw) {
            if (isRawElement(raw)) {
                return rawValue(raw);
            } else {
                return raw.map(rawToData);
            }
        }

        function rawValue (element) {
            return head(element);
        }

        function rawState (element) {
            return head(tail(element));
        }

        function head (array) {
            if (array.length > 0) {
                return array[0];
            } else {
                return [];
            }
        }

        function tail (array) {
            return array.slice(1);
        }

        function length (array) {
            return array.length;
        }

        function flatten (arr) {
            if ('undefined' === typeof arr) { return []; }
            if (arr !== null && arr.length && 'object' === typeof arr) {
                return arr.map(flatten).reduce(function (a,b) {return a.concat(b);});
            } else {
                return [arr];
            }
        }

        function isSelected (key) { return _states[key]; }

        function select (keys) {
            if (keys instanceof Array) {
                keys.forEach(selectKey);
            } else {
                selectKey(keys);
            }
        }

        function selectKey (key) {
            _states[key] = true;
        }

        function deselect(keys) {
            if (keys instanceof Array) {
                keys.forEach(deselectKey);
            } else {
                deselectKey(keys);
            }
        }

        function deselectKey (key) {
            _states[key] = false;
        }

        function flip (key) {
            if (isSelected(key)) {
                deselect(key);
            } else {
                select(key);
            }
        }

        function generateKeys () { return Object.keys(_states); }

        function generateArray () {
            return generateKeys().map(function (d) {
                return [d, isSelected(d)];
            }).sort(function (a, b) {
                if (a.value < b.value) { return -1; }
                if (a.value > b.value) { return 1; }
                return 0;
            });
        }

        function selected () { return generateKeys().filter(isSelected); }

        function intersect (elements, reference) {
            return elements.filter(function (d) { return reference.indexOf(d) > -1; });
        }

        function filterButtonReference (name, reference) {
            if (reference) {
                _checkboxReference[name] = reference;
            } else {
                return _checkboxReference[name];
            }
        }

        function parentHash (key) { return _parentHash[key] || null; }

        function childrenHash (key) { return _childrenHash[key] || []; }

        function descendentHash (key) { return _descendentHash[key] || []; }

        function check (key) {
            _checkboxHash[key].checked = true;
            _checkboxHash[key].parentNode.className = _checkboxHash[key].parentNode.className.replace('pvz-btn-off', 'pvz-btn-on');
        }

        function uncheck (key) {
            _checkboxHash[key].checked = null;
            _checkboxHash[key].parentNode.className = _checkboxHash[key].parentNode.className.replace('pvz-btn-on', 'pvz-btn-off');
        }

        function generateTestingResources () {
            return {};
        }

        function forceStates (states) {
            states.forEach(function (state) {
                (state[1] ? select : deselect).call(null, state[0]);
                (state[1] ? check : uncheck).call(null, state[0]);
            });
        }

        function labels () {
            return generateKeys();
        }

        this.selected = selected;
        this.generate = generate;
        this.callback = callback;
        this.generateTestingResources = generateTestingResources;
        this.forceStates = forceStates;
        this.labels = labels;
    }

    plotviz.Filter = Filter;

    return plotviz;
}) (plotviz || {});
