/*
The MIT License (MIT)

Copyright (c) 2014 The Broad Institute

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function AxisPanel (container, id, config) {
        var _id = id;
        var _panel = container;
        var _label = null;
        var _tooltip = null;
        var _tooltipFunc = null;
        var _mouseclick = null;
        var _callback = null;

        this.callback = function (func) {
            _callback = func;
        };

        _panel.append('g').attr('class', 'axis');

        _panel.append('text').attr('class', 'plotviz-label')
            .on('mousemove', function (d, i) {
                if (_callback) {
                    var mouseCoordinates = d3.mouse(_panel.node());

                    var callbackInput = {
                            type: 'mousemove',
                            component: 'label',
                            id: _id,
                            x: mouseCoordinates[0],
                            y: mouseCoordinates[1],
                            data: d
                        };

                    _callback(callbackInput);
                }
            })
            .on('mouseout', function (d) {
                if (_callback) {
                    var mouseCoordinates = d3.mouse(_panel.node());

                    var callbackInput = {
                            type: 'mouseout',
                            component: 'label',
                            id: _id,
                            x: mouseCoordinates[0],
                            y: mouseCoordinates[1],
                            data: d
                        };
                }
            })
            .on('click', function (d, i) {
                if (_mouseclick) {
                    var mouseclickInput = {
                        key: 'mouseclick',
                        value: {
                            type: 'axis',
                            subtype: 'text',
                            id: _id,
                            data: d.raw
                        }
                    };
                    var xy = d3.mouse(_svg.node());
                    _mouseclick(xy[0], xy[1], mouseclickInput);
                }
            });

        function rawToData (raw) {
            var copy = JSON.parse(JSON.stringify(raw));
            var range;
            if ('left' === copy.orientation) {
                range = [copy.height, 0];
            }
            if ('bottom' === copy.orientation) {
                range = [0, copy.width];
            }

            return {
                label: copy.label || '',
                width: copy.width,
                height: copy.height,
                orientation: copy.orientation,
                domain: copy.values,
                range: range
            };
        }


        /*
            leftAxis
                <
                    label,
                    range: < >`
                >
        */
        this.render = function (data, unvalidatedConfig) {
            //var axis = _panel.call(d3.svg.axis()
            //                        .scale(data.axis)
            //                        .orient(data.orientation));
            function validate (config) {
                if ('left' === data.orientation) {
                return {
                        width: config.width,
                        height: config.height,
                        labelClass: config.labelClass || undefined,
                        axisClass: config.axisClass || undefined,
                        axisX: config.axisX || 1,
                        axisY: config.axisY || 0,
                        labelX: config.labelX || 0,
                        labelY: config.labelY || 0,
                        tickTranslate: config.tickTranslate || 0,
                        tickRotation: config.tickRotation || 0,
                        tickAlign: config.tickAlign || 'end',
                        labelRotation: config.labelRotation || 0,
                        fontSize: (config.fontSize || 16) + 'px',
                        fill: (config.fill || '#000'),
                        axis: config.axis
                    };
                }
                if ('bottom' === data.orientation) {
                return {
                        width: config.width,
                        height: config.height,
                        labelClass: config.labelClass || undefined,
                        axisClass: config.axisClass || undefined,
                        axisX: config.axisX || 0,
                        axisY: config.axisY === 0 ? 0 : (config.axisY || 1),
                        labelX: config.labelX || 0,
                        labelY: config.labelY || 0,
                        tickTranslate: config.tickTranslate || 0,
                        tickRotation: config.tickRotation || 0,
                        tickAlign: config.tickAlign || 'middle',
                        labelRotation: config.labelRotation || 0,
                        fontSize: (config.fontSize || 16) + 'px',
                        fill: (config.fill || '#000'),
                        axis: config.axis
                    };
                }
            }

            data = rawToData(data);

            var axis;
            var scale;

            var config = validate(unvalidatedConfig);
            if ('left' === data.orientation) {
                scale = config.axis || d3.scale.linear()
                    .domain(data.domain)
                    .range([config.height, 0])
                    .nice();

                axis = _panel.select('g.axis').attr('class', 'axis plotviz-left-axis' + (config.axisClass ? ' ' + config.axisClass : '')).call(d3.svg.axis()
                                        .scale(scale)
                                        .orient(data.orientation)
                                        .ticks(5));

                axis.attr('transform', 'translate(' + (config.axisX * config.width) + ',' + (config.axisY * config.height) + ')');
                // TODO: Generalize positioning the label.
                _panel.select('.plotviz-label')
                    .attr('class', 'plotviz-label' + (config.labelClass ? ' ' + config.labelClass : ''))
                    .attr('transform', 'translate(' + (config.labelX * config.width) + ',' + (config.labelY * config.height) + ') rotate(' + (-config.labelRotation) + ')')
                    .text(data.label);

                axis.selectAll('g.tick text').style('text-anchor', config.tickAlign);

                axis.selectAll('.tick')
                    .on('mousemove', function (d) {
                        if (_tooltipFunc) {
                            var tooltipInput = {
                                key: 'tooltip',
                                value: {
                                    type: 'tick',
                                    id: _id,
                                    data: d.raw
                                }
                            };
                            var tooltipText = _tooltipFunc(d3.mouse(_svg.node())[0], d3.mouse(_svg.node())[1], tooltipInput);
                            _tooltip
                                .style({
                                    left: (d3.mouse(_svg.node())[0] + 20) + 'px',
                                    top: (d3.mouse(_svg.node())[1] + 20) + 'px',
                                    color: 'white',
                                    'font-weight': 'bold',
                                    background: 'rgba(0,0,0,0.75)',
                                    padding: '12px',
                                    'border-radius': '2px',
                                    'line-height': 1,
                                    display: tooltipText ? '' : 'none'
                                })
                                .html(tooltipText);
                        }
                    })
                    .on('mouseout', function (d) {
                        if (_callback) {
                            var mouseCoordinates = d3.mouse(_panel.node());

                            var callbackInput = {
                                    type: 'mouseout',
                                    component: 'tick',
                                    id: _id,
                                    x: mouseCoordinates[0],
                                    y: mouseCoordinates[1],
                                    data: d.raw
                                };
                        }
                    });
            }

            if ('bottom' === data.orientation) {
                scale = config.axis || d3.scale.ordinal()
                    .domain(data.domain)
                    .rangeBands([0, config.width]);

                axis = _panel.select('g.axis').attr('class', 'axis plotviz-bottom-axis' + (config.axisClass ? ' ' + config.axisClass : '')).call(d3.svg.axis()
                                        .scale(scale)
                                        .orient(data.orientation));
                axis.attr('transform', 'translate(' + (config.axisX * config.width) + ',' + (config.axisY * config.height) + ')');

                axis.selectAll('g.tick text').style('text-anchor', config.tickAlign);

                _panel.select('.plotviz-label')
                    .attr('class', 'plotviz-label' + (config.labelClass ? ' ' + config.labelClass : ''))
                    .attr('transform', 'translate(' + (config.labelX * config.width) + ',' + (config.labelY * config.height) + ') rotate(' + (-config.labelRotation) + ')')
                    .text(data.label);

                axis.selectAll('g.tick text')
                    .attr('transform', 'translate(' + config.tickTranslate + ') rotate(' + config.tickRotation + ')');

                var tempData = axis.selectAll('g.tick text').data();
                tempData = tempData.map(function (d) {return d.split('<br/>');});

                axis.selectAll('g.tick text')
                    .data(tempData).text('');
                axis.selectAll('g.tick text')
                  .selectAll('tspan')
                    .data(function (d) {return d;})
                  .enter().append('tspan')
                    .text(function (d) {return d;})
                    .attr({
                        x: 0,
                        dy: function (d, i) {return 15;}
                    })
                    .on('mousemove', function (d) {
                        d3.select(this).attr('class', 'mouseover');
                        if (_callback) {
                            var mouseCoordinates = d3.mouse(_panel.node());

                            var callbackInput = {
                                    type: 'mousemove',
                                    component: 'text',
                                    id: _id,
                                    x: mouseCoordinates[0],
                                    y: mouseCoordinates[1],
                                    data: d
                                };

                            _callback(callbackInput);
                        }
                    })
                    .on('mouseout', function (d) {
                        d3.select(this).attr('class', null);
                        if (_callback) {
                            var mouseCoordinates = d3.mouse(_panel.node());

                            var callbackInput = {
                                    type: 'mouseout',
                                    subtype: 'axis',
                                    component: 'text',
                                    id: _id,
                                    x: mouseCoordinates[0],
                                    y: mouseCoordinates[1],
                                    data: d
                                };
                        }
                    });

                axis.selectAll('.tick')
                    .on('mousemove', function (d) {
                        if (_tooltipFunc) {
                            var tooltipInput = {
                                key: 'tooltip',
                                value: {
                                    type: 'tick',
                                    id: _id,
                                    data: d.raw
                                }
                            };

                            var tooltipText = _tooltipFunc(d3.mouse(_svg.node())[0], d3.mouse(_svg.node())[1], tooltipInput);
                            _tooltip
                                .style({
                                    left: (d3.mouse(_svg.node())[0] + 20) + 'px',
                                    top: (d3.mouse(_svg.node())[1] + 20) + 'px',
                                    color: 'white',
                                    'font-weight': 'bold',
                                    background: 'rgba(0,0,0,0.75)',
                                    padding: '12px',
                                    'border-radius': '2px',
                                    'line-height': 1,
                                    display: tooltipText ? '' : 'none'
                                })
                                .html(tooltipText);
                            if (null === tooltipText) {
                                _tooltip.style('display', 'none');
                            }
                        }
                    })
                    .on('mouseout', function (d) {
                        if (_callback) {
                            var mouseCoordinates = d3.mouse(_panel.node());

                            var callbackInput = {
                                    type: 'mouseout',
                                    subtype: 'axis',
                                    component: 'tick',
                                    id: _id,
                                    x: mouseCoordinates[0],
                                    y: mouseCoordinates[1],
                                    data: d.raw
                                };
                        }
                    })
                    .on('click', function (d, i) {
                        if (_callback) {
                            var mouseCoordinates = d3.mouse(_panel.node());

                            var callbackInput = {
                                    type: 'click',
                                    subtype: 'axis',
                                    'id': _id,
                                    x: mouseCoordinates[0],
                                    y: mouseCoordinates[1],
                                    data: d
                                };

                            _callback(callbackInput);
                        }
                        if (_mouseclick) {
                            var mouseclickInput = {
                                key: 'mouseclick',
                                value: {
                                    type: 'axis',
                                    subtype: 'tick',
                                    id: _id,
                                    data: d
                                }
                            };
                            var xy = d3.mouse(_svg.node());
                            _mouseclick(xy[0], xy[1], mouseclickInput);
                        }
                    });
            }
        };

    }

    plotviz.AxisPanel = AxisPanel;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function BoxWhiskerViewer (container, id, config) {
        var _id = id;
        var _panel = container.append('g');
        var _tooltip = null;
        var _tooltipFunc = null;
        var _config = config;
        var _sortingFunctions = {
                outer: function (a, b) { return 0; },
                inner: function (a, b) { return 0; }
            };
        var _callback = null;

        _panel.append('rect').attr({
            x: 0,
            y: 0,
            'class': 'border',
        })
        .style({
            stroke: 'black',
            fill: 'none',
            'stroke-width': 2
        });

        _panel.append('g').attr('class', 'under-lines');
        _panel.append('g').attr('class', 'rects');
        _panel.append('g').attr('class', 'whisker-lines');
        _panel.append('g').attr('class', 'outliers');
        _panel.append('g').attr('class', 'median-lines');
        _panel.append('g').attr('class', 'significance-line');

        this.callback = function (func) {
            // TODO: Check if func is a function
            _callback = func;
        };

        this.tooltipPanel = function (tooltip) {
            if (tooltip) {
                _tooltip = tooltip;
                return this;
            } else {
                return _tooltip;
            }
        };

        this.tooltipFunction = function (func) {
            if (func) {
                _tooltipFunc = func;
                return this;
            } else {
                return _tooltipFunc;
            }
        };

        this.sortingFunctions = function (f) {
            // TODO: Check to make sure f is an object with both functions
            _sortingFunctions = f || {
                    outer: function (a, b) { return 0; },
                    inner: function (a, b) { return 0; }
                };
        };

        /**
         *
         *   box =
                highWhisker
                q3
                median
                q1
                lowWhisker
                outliers [
                    <
                        value
                        extra
                    >
                ]
                extra
                    <
                        groupName
                    >
         */

        function rawToData (boxes) {

            var data = retrieveBoxGroups(boxes).map(function (groupName) {
                    var newBoxGroup = {
                            key: groupName,
                            values: retrieveBoxesByGroupName(boxes, groupName).map(boxToData).sort(_sortingFunctions.inner)
                        };
                    return newBoxGroup;
                }).sort(_sortingFunctions.outer);

            return data;

            function boxToData (box) {
                return {
                        'highWhisker': box.highWhisker,
                        'q3': box.q3,
                        'median': box.median,
                        'q1': box.q1,
                        'lowWhisker': box.lowWhisker,
                        'color': box.color,
                        'noData': box.noData,
                        'outliers': box.outliers.map(function (outlier) {
                                return {
                                        'value': outlier,
                                        'extra': {}
                                    };
                            }),
                        'extra': box.extra
                    };
            }

            function retrieveBoxesByGroupName (boxes, groupName) {
                return boxes.filter(function (box) {
                    return groupName === box.extra.groupName;
                });
            }

            function retrieveBoxGroups (boxes) {
                return boxes.map(function (box) { return box.extra.groupName; });
            }

        }

        this.maxMin = function (data) {
            return {maximum: d3.max(data.map(maxGroup)), minimum: d3.min(data.map(minGroup))};

            function maxGroup (boxGroup) {
                return d3.max(boxGroup.values.map(maxBox));
            }

            function maxBox (box) {
                return d3.max([box.highWhisker, box.q3, box.median, box.q1, box.lowWhisker].concat(box.outliers.map(function (outlier) { return outlier.value; })));
            }

            function minGroup (boxGroup) {
                return d3.min(boxGroup.values.map(minBox));
            }

            function minBox (box) {
                return d3.min([box.highWhisker, box.q3, box.median, box.q1, box.lowWhisker].concat(box.outliers.map(function (outlier) { return outlier.value; })));
            }
        };

        this.generateXAxis = function (data, config) {
            data = rawToData(data);
            var majorKeys = data.map(function (boxGroup) { return boxGroup.key; });

            return d3.scale.ordinal()
                .domain(majorKeys)
                .rangeBands([0, config.width], 0.1);
        };

        this.generateYAxis = function (data, config) {
            data = rawToData(data);
            var maxMin = this.maxMin(data);
            var spread = maxMin.maximum - maxMin.minimum;

            return d3.scale.linear()
                .domain([maxMin.minimum - spread / 10, maxMin.maximum + spread / 10])
                .range([config.height, 0])
                .nice();
        };

        this.render = function (rawData, config) {


            var y = this.generateYAxis(rawData, config);

            var x = this.generateXAxis(rawData, config);

            var data = rawToData(rawData);
            _panel.attr('class', 'plotviz-box' + (config.boxClass ? ' ' + config.boxClass : ''));
            _panel.select('.border').attr({ width: config.width, height: config.height });
            addRectangles(data, _panel.select('.rects'), x, y, config);
            addUnderLines(data, _panel.select('.under-lines'), x, y, config);
            addWhiskerLines(data, _panel.select('.whisker-lines'), x, y, config);
            addOutliers(data, _panel.select('.outliers'), x, y, config);
            addMedianLines(data, _panel.select('.median-lines'), x, y, config);
            //addSignificanceLine(data.data, _panel.select('.significance-line'), x, y, config);
        };

        function addSignificanceLine (data, panel, x, y, config) {
            var lineData = d3.range(0, _data.metadata.width, parseInt(_data.metadata.width / 100)).map(function (d) {
                    return d;
                });

            var lineSelection = panel.selectAll('line').data(lineData);
            lineSelection.exit().remove();
            lineSelection.enter().append('line');

            var significanceValue = 'log' === config.scale ? Math.log10(0.1 + 0.05) : 0.1;

            lineSelection.attr({
                x1: function (d) {return d;},
                y1: y(significanceValue),
                x2: function (d) {return d + (_data.metadata.width / 200);},
                y2: y(significanceValue)
            }).style({
                'stroke': '#aaa',
                'stroke-width': 1
            });
        }

        function addRectangles (data, panel, x, y, config) {
            var rectData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.values.map(function (box, index) {
                    return box.key || index;
                });
                var boxGroupValueMap = boxGroup.values.map(function (box, i) {
                    var testPadding = x.rangeBand() / minorKeys.length;
                    var realPadding = (config.boxGroupSpacing || 0.1) * testPadding >= 2 ? (config.boxGroupSpacing || 0.1) : 2 / testPadding;
                    var minorX = d3.scale.ordinal()
                                    .domain(minorKeys)
                                    .rangeBands([0, x.rangeBand()]);
                    return {
                        q3: y(box.q3),
                        q1: y(box.q1),
                        boxStart: x(boxGroup.key) + minorX(box.key || i),
                        boxWidth: minorX.rangeBand(),
                        color: box.color,
                        extra: box.extra,
                        raw: box
                    };
                });
                if (boxGroup.axisLine) {
                    boxGroupValueMap.push({
                        q3: 10 + y.range()[0] + (y.range()[1] - y.range()[0])/100,
                        q1: 10 + y.range()[0],
                        boxStart: x(boxGroup.key),
                        boxWidth: x.rangeBand(),
                        color: boxGroup.axisLine.color,
                        extra: {opacity: 1}
                    });
                }

                return boxGroupValueMap;
            })
            .reduce(function (boxGroupA, boxGroupB) {
                return boxGroupA.concat(boxGroupB);
            });

            panel.attr('class', 'rects' + (config.rectClass ? ' ' + config.rectClass : ''));

            var rectSelection = panel.selectAll('rect').data(rectData);
            rectSelection.exit().remove();
            rectSelection.enter().append('rect');

            rectSelection.attr({
                x: function (d) { return d.boxStart; },
                y: function (d) { return d.q3; },
                width: function (d) { return d.boxWidth; },
                height: function (d) { return d.q1 - d.q3; }
            })
            .style({
                fill: function (d) { return d.color; },
            })
            .on('mousemove', function (d, i) {
                if (_callback) {
                    var mouseCoordinates = d3.mouse(_panel.node());

                    var callbackInput = {
                            type: 'mousemove',
                            subtype: 'boxViewer',
                            x: mouseCoordinates[0],
                            y: mouseCoordinates[1],
                            data: d.raw
                        };

                    _callback(callbackInput);
                    var tooltipInput = {
                        key: 'tooltip',
                        value: {
                            type: 'box',
                            data: d.raw
                        }
                    };
                }
            })
            .on('mouseout', function (d) {
                if (_callback) {
                    var callbackInput = {
                            type: 'mouseout',
                            data: d.raw
                        };
                    _callback(callbackInput);
                }
            });
        }

        function addUnderLines (data, panel, x, y, config) {
            var lineData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.values.map(function (box, index) {
                    return box.key || index;
                });
                return boxGroup.values.map(function (box, index) {
                    var minorX = d3.scale.ordinal()
                                    .domain(minorKeys)
                                    .rangeBands([0, x.rangeBand()], 0.1);
                    // TODO: Remove these quality control checks that
                    // fall back in case certain values aren't provided
                    return box.noData ? null : {
                        xAxis: x(boxGroup.key) + minorX(box.key || index) + minorX.rangeBand() / 2,
                        valueLow: y(box.lowWhisker || box.median || 0),
                        valueHigh: y(box.highWhisker || box.median || 0),
                        opacity: box.extra.opacity ? box.extra.opacity : 1
                    };
                })
                .filter(function (underlines) {
                    return underlines ? true : false;
                });
            })
            .reduce(function (lineGroupA, lineGroupB) {
                return lineGroupA.concat(lineGroupB);
            });

            panel.attr('class', 'under-lines' + (config.whiskerClass ? ' ' + config.whiskerClass : ''));

            var lineSelection = panel.selectAll('line').data(lineData);
            lineSelection.exit().remove();
            lineSelection.enter().append('line');

            lineSelection.attr({
                x1: function (d) { return d.xAxis; },
                y1: function (d) { return d.valueHigh; },
                x2: function (d) { return d.xAxis; },
                y2: function (d) { return d.valueLow; }
            });
        }

        function addWhiskerLines (data, panel, x, y, config) {
            var lineData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.values.map(function (box, index) {
                    return box.key || index;
                });
                return boxGroup.values.map(function (box, index) {
                    var minorX = d3.scale.ordinal()
                                        .domain(minorKeys)
                                        .rangeBands([0, x.rangeBand()], boxGroup.values.length > 1 ? 0.1 : 0);
                    return box.noData ? null : [
                        {
                            labelLower: x(boxGroup.key) + minorX(box.key || index) + minorX.rangeBand() / 4,
                            yAxis: y(box.highWhisker || box.q3 || box.median),
                            labelHigher: x(boxGroup.key) + minorX(box.key || index) + 3 * minorX.rangeBand() / 4,
                            opacity: box.extra.opacity ? box.extra.opacity : 1
                        },
                        {
                            labelLower: x(boxGroup.key) + minorX(box.key || index) + minorX.rangeBand() / 4,
                            yAxis: y(box.lowWhisker || box.q1 || box.median),
                            labelHigher: x(boxGroup.key) + minorX(box.key || index) + 3 * minorX.rangeBand() / 4,
                            opacity: box.extra.opacity ? box.extra.opacity : 1
                        }];
                })
                .filter(function (lines) {
                    return lines ? true : false;
                })
                .reduce(function (linesA, linesB) {
                    return linesA.concat(linesB);
                }, []);
            })
            .reduce(function (lineGroupA, lineGroupB) {
                return lineGroupA.concat(lineGroupB);
            });

            panel.attr('class', 'whisker-lines' + (config.whiskerClass ? ' ' + config.whiskerClass : ''));

            var lineSelection = panel.selectAll('line').data(lineData);
            lineSelection.exit().remove();
            lineSelection.enter().append('line');

            lineSelection.attr({
                x1: function (d) { return d.labelLower; },
                y1: function (d) { return d.yAxis; },
                x2: function (d) { return d.labelHigher; },
                y2: function (d) { return d.yAxis; }
            });
        }

        function addMedianLines (data, panel, x, y, config) {
            var lineData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.values.map(function (box, index) {
                    return box.key || index;
                });
                return boxGroup.values.map(function (box, index) {
                    var minorX = d3.scale.ordinal()
                                        .domain(minorKeys)
                                        .rangeBands([0, x.rangeBand()], boxGroup.values.length > 1 ? 0.1 : 0);
                    return box.noData ? null : [{
                            labelLower: x(boxGroup.key) + minorX(box.key || index),
                            yAxis: y(box.median),
                            labelHigher: x(boxGroup.key) + minorX(box.key || index) + minorX.rangeBand(),
                            opacity: box.extra.opacity ? box.value.extra.opacity : 1,
                            medianColor: box.extra.medianColor,
                        }];
                })
                .filter(function (lines) {
                    return lines ? true : false;
                })
                .reduce(function (linesA, linesB) {
                    return linesA.concat(linesB);
                }, []);
            })
            .reduce(function (lineGroupA, lineGroupB) {
                return lineGroupA.concat(lineGroupB);
            });

            var lineSelection = panel.selectAll('line').data(lineData);
            lineSelection.exit().remove();
            lineSelection.enter().append('line');

            lineSelection.attr({
                x1: function (d) { return d.labelLower; },
                y1: function (d) { return d.yAxis; },
                x2: function (d) { return d.labelHigher; },
                y2: function (d) { return d.yAxis; }
            });
        }

        function addOutliers (data, panel, x, y, config) {
            var jitterBound = 0;
            var outlierData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.values.map(function (box, index) {
                    return box.key || index;
                });
                return boxGroup.values.map(function (box, i) {
                    var minorX = d3.scale.ordinal()
                        .domain(minorKeys)
                        .rangeBands([0, x.rangeBand()], boxGroup.values.length > 1 ? 0.1 : 0);
                    jitterBound = minorX.rangeBand();
                    return box.outliers.map(function (outlier) {
                        return {
                            boxStart: x(boxGroup.key) + minorX(box.key || i),
                            boxWidth: minorX.rangeBand(),
                            outlier: y(outlier.value),
                            raw: outlier
                        };
                    });
                })
                .reduce(function (boxOutliersA, boxOutliersB) {
                    return boxOutliersA.concat(boxOutliersB);
                });
            })
            .reduce(function (boxGroupOutliersA, boxGroupOutliersB) {
                return boxGroupOutliersA.concat(boxGroupOutliersB);
            });

            panel.attr('class', 'outliers');

            var outlierSelection = panel.selectAll('circle').data(outlierData);
            outlierSelection.exit().remove();
            outlierSelection.enter().append('circle');
            var jitter = (config.outlierJitter || 0) * jitterBound;
            outlierSelection.attr({
                cx: function (d) { return d.boxStart + (d.boxWidth / 2) + (Math.random() * jitter - (jitter / 2)); },
                cy: function (d) { return d.outlier; },
                r: function (d) { return config.outlierRadius || 2; },
                'class': config.outlierClass || null
            })
            .style({
                //display: config.outliers === 'on' ? '' : 'none'
            })
            .on('mousemove', function (d) {
                var tooltipInput = {
                    key: 'tooltip',
                    value: {
                        type: 'outlier',
                        data: d.raw
                    }
                };

                if (_tooltipFunc) {
                    _tooltip
                        .style({
                            left: (d3.mouse(_svg.node())[0] + 10) + 'px',
                            top: (d3.mouse(_svg.node())[1] + 20) + 'px',
                            color: 'white',
                            'font-weight': 'bold',
                            background: 'rgba(0,0,0,0.7)',
                            padding: '12px',
                            'border-radius': '2px',
                            'line-height': 1,
                            display: ''
                        })
                        .html(_tooltipFunc(d3.mouse(_svg.node())[0], d3.mouse(_svg.node())[1], tooltipInput));
                }
            })
            .on('mouseout', function (d) {
                _tooltip.style('display', 'none');
            });

        }

        this.dataTransform = function (data, config) {
            var newData = JSON.parse(JSON.stringify(data));

            if ('log' === config.scale) {
                newData = logTransform(data);
            }

            if ('only' === config.medians) {
                newData = mediansOnly(newData);
            }

            return newData;
        };

        function logTransform (data) {
            var transform = function (x) { return Math.log10(x + 0.05); };

            var newData = {};

            newData.legend = JSON.parse(JSON.stringify(data.legend));
            newData.metadata = JSON.parse(JSON.stringify(data.metadata));
            newData.data = data.data.map(function (boxGroup) {
                return {
                    key: boxGroup.key,
                    axisLine: boxGroup.axisLine,
                    value: boxGroup.value.map(function (box) {
                        return !(box.key) ? JSON.parse(JSON.stringify(box)) : {
                            key: box.key,
                            value: {
                                high_whisker: transform(box.value.high_whisker),
                                q3: transform(box.value.q3),
                                median: transform(box.value.median),
                                q1: transform(box.value.q1),
                                low_whisker: transform(box.value.low_whisker),
                                outliers: box.value.outliers.map(function (out) {
                                    return {
                                        key: out.key,
                                        value: {
                                            outlier: transform(out.value.outlier)
                                        }
                                    };
                                }),
                                color: box.value.color,
                                extra: JSON.parse(JSON.stringify(box.value.extra))
                            }
                        };
                    })
                };
            });
            return newData;
        }

        function mediansOnly (data) {
            var newData = {};

            newData.legend = JSON.parse(JSON.stringify(data.legend));
            newData.metadata = JSON.parse(JSON.stringify(data.metadata));
            newData.data = data.data.map(function (boxGroup) {
                return {
                    key: boxGroup.key,
                    axisLine: boxGroup.axisLine,
                    value: boxGroup.value.map(function (box) {
                        return !(box.key) ? JSON.parse(JSON.stringify(box)) : {
                            key: box.key,
                            value: {
                                high_whisker: box.value.median,
                                q3: box.value.median,
                                median: box.value.median,
                                q1: box.value.median,
                                low_whisker: box.value.median,
                                outliers: JSON.parse(JSON.stringify(box.value.outliers)),
                                color: box.value.color,
                                extra: JSON.parse(JSON.stringify(box.value.extra))
                            }
                        };
                    })
                };
            });

            return newData;
        }

        /**
         * Sorts the major and minor keys in the data to be visualized. Some
         * default sorting function options available are 'alphabetical',
         * 'increasing', and 'decreasing'. 'increasing' and 'decreasing' for the
         * minor keys base it on the median of the minor keys. 'increasing' and
         * 'decreasing' for the major keys base it on the average of the medians
         * for the minor keys in their grouping.
         *
         * @param - string/function - majorSortFunction - The function that will
         *          be used to sort the major keys. A string can be used to
         *          call and default supported sorting function.
         * @param - string/function - minorSortFunction - The function that will
         *          be used to sort the minor keys. A string can be used to
         *          call and default supported sorting function.
         */

    }

    plotviz.BoxWhiskerViewer = BoxWhiskerViewer;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function Crosshair (svg, id, data) {
        var crosshairLineLength = 20;
        var _svg = svg;
        var _id = id;
        var _crosshair = null;

        _crosshair = _svg.append('g')
            .attr('class', 'crosshair')
            .attr('transform', 'translate(' + data.x + ',' + data.y + ')');

        _crosshair
          .selectAll('line')
            .data([
                {
                    x1: -crosshairLineLength,
                    y1: 0,
                    x2: crosshairLineLength,
                    y2: 0
                },
                {
                    x1: 0,
                    y1: data.height - crosshairLineLength,
                    x2: 0,
                    y2: data.height + crosshairLineLength
                }
            ])
          .enter().append('line')
            .attr({
                x1: function (d) { return d.x1; },
                y1: function (d) { return d.y1; },
                x2: function (d) { return d.x2; },
                y2: function (d) { return d.y2; }
            })
            .style({
                stroke: 'red',
                'stroke-width': 1,
                display: ''
            });

        this.show = function () { _crosshair.selectAll('line').style('display', ''); };
        this.hide = function () { _crosshair.selectAll('line').style('display', 'none'); };

        this.move = function (x, y) {
            _crosshair
              .selectAll('line')
                .data([
                    {
                        x1: -crosshairLineLength,
                        y1: y,
                        x2: crosshairLineLength,
                        y2: y
                    },
                    {
                        x1: x,
                        y1: data.height - crosshairLineLength,
                        x2: x,
                        y2: data.height + crosshairLineLength
                    }
                ])
                .attr({
                    x1: function (d) { return d.x1; },
                    y1: function (d) { return d.y1; },
                    x2: function (d) { return d.x2; },
                    y2: function (d) { return d.y2; }
                })
                .style({
                    stroke: 'red',
                    'stroke-width': 1,
                });
           };

    }

    plotviz.Crosshair = Crosshair;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';


    /**
     * Calculates the maximum and minimum value for all data points. Used to
     * automatically decide how wide the range should be for the plot to let
     * all data be seen.
     *
     * @param - Object - data - The data to be visualized.
     *
     * @returns - Object - two keys: maximum, minimum
     */
    plotviz.maxMin = function (data) {
        var values = data.data.map(function (majorBox) {
            return majorBox.value.map(function (minorBox) {
                // TODO: Better error checking
                minorBox.value = minorBox.value || {};
                minorBox.value.outliers = minorBox.value.outliers || [];
                return [minorBox.value.high_whisker || undefined,
                        minorBox.value.q3 || undefined,
                        minorBox.value.median || undefined,
                        minorBox.value.q1 || undefined,
                        minorBox.value.low_whisker || undefined]
                    .concat(minorBox.value.outliers.map(function (outlier) {
                            return outlier.value.outlier;
                        })
                    );
            })
            .filter(function (value) {
                return value !== undefined && value !== null;
            })
            .reduce(function (minorBoxValuesA, minorBoxValuesB) {
                return minorBoxValuesA.concat(minorBoxValuesB);
            });
        })
        .reduce(function (majorBoxValuesA, majorBoxValuesB) {
            return majorBoxValuesA.concat(majorBoxValuesB);
        })
        .filter(function (identity) {return identity;});

        return {maximum: values.reduce(function (a, b)
                                        {return a > b ? a : b;}, 0),
                minimum: values.reduce(function (a, b)
                                        {return a < b ? a : b;}, 0)};
    };

    plotviz.lineMaxMin = function (data) {
        var values = data.map(function (line) {
            return line.value.points.map(function (point) {
                return point.value.median;
            });
        })
        .reduce(function (lineA, lineB) {
            return lineA.concat(lineB);
        });

        return {maximum: values.reduce(function (a, b)
                                        {return a > b ? a : b;}),
                minimum: values.reduce(function (a, b)
                                        {return a < b ? a : b;})};
    };


    /**
     * Sorts the major and minor keys in the data to be visualized. Some
     * default sorting function options available are 'alphabetical',
     * 'increasing', and 'decreasing'. 'increasing' and 'decreasing' for the
     * minor keys base it on the median of the minor keys. 'increasing' and
     * 'decreasing' for the major keys base it on the average of the medians
     * for the minor keys in their grouping.
     *
     * @param - string/function - majorSortFunction - The function that will
     *          be used to sort the major keys. A string can be used to
     *          call and default supported sorting function.
     * @param - string/function - minorSortFunction - The function that will
     *          be used to sort the minor keys. A string can be used to
     *          call and default supported sorting function.
     */
    plotviz.globalSortSVG = function (data, majorSortFunction, minorSortFunction) {
        var newData = JSON.parse(JSON.stringify(data));
        if ('string' === typeof minorSortFunction){
            if ('alphabetical' === minorSortFunction) {
                newData.data.forEach(function (boxList, bLIndex, bLArray) {
                    boxList.value.sort(function (a, b) {
                        return b.key < a.key;
                    });
                });
            } else if ('increasing' === minorSortFunction) {
                newData.data.forEach(function (boxList, bLIndex, bLArray) {
                    boxList.value.sort(function (a, b) {
                        return a.value.median - b.value.median;
                    });
                });
            } else {
                newData.data.forEach(function (boxList, bLIndex, bLArray) {
                    boxList.value.sort(function (a, b) {
                        return b.value.median - a.value.median;
                    });
                });
            }
        }

        if ('string' === typeof majorSortFunction) {
            if ('alphabetical' === majorSortFunction) {
                newData.data.sort(function (a, b) {
                    return b.key < a.key ? 1 : -1;
                });
            } else if ('increasing' === majorSortFunction) {
                newData.data.sort(function (a, b) {
                    var aTotal = 0,
                        bTotal = 0;

                    aTotal = a.value.filter(function (d) { return d.value ? true : false; })
                        .map(function (d) { return d.value.median; })
                        .reduce(function (b1, b2) { return b1 + b2; }, 0);

                    b.Total = b.value.filter(function (d) { return d.value ? true : false; })
                        .map(function (d) { return d.value.median; })
                        .reduce(function (b1, b2) { return b1 + b2; }, 0);

                    aTotal /= a.value.filter(function (d) { return d ? true : false; }).length;
                    bTotal /= a.value.filter(function (d) { return d ? true : false; }).length;
                    return aTotal - bTotal;
                });
            } else if ('decreasing' === majorSortFunction) {
                newData.data.sort(function (a, b) {
                    var aTotal = 0,
                        bTotal = 0;

                    a.value.forEach(function (box, index, array) {
                        aTotal += box.value.median;
                    });
                    b.value.forEach(function (box, index, array) {
                        bTotal += box.value.median;
                    });

                    aTotal /= a.value.length;
                    bTotal /= b.value.length;
                    return bTotal - aTotal;
                });
            }
        }

        if ('function' === typeof majorSortFunction) {
            newData.data.sort(majorSortFunction);
        }

        if ('function' === typeof minorSortFunction) {
            newData.data.forEach(function (boxList, bLIndex, bLArray) {
                boxList.value.sort(minorSortFunction);
            });
        }

        return newData;
    };

    return plotviz;
})(plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
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
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function LayoutManager (svg) {
        var _svg = svg;
        var _namedPanels = {};

        this.getPanel = function (name) {
            return _namedPanels[name].panel;
        };

        this.getPanelDimensions = function (name) {
            return {width: _namedPanels[name].width, height: _namedPanels[name].height, x: _namedPanels[name].x, y: _namedPanels[name].y};
        };

        this.render = function (data, config) {

            var gPanels = [];

            generatePanels(data, 0, 0, config.width, config.height);

            var panels = _svg.selectAll('g.layout-panels').data(gPanels);

            panels.exit().remove();
            panels.enter().append('g');

            panels.attr({
                transform: function (d) {
                    if (d.name) {
                        _namedPanels[d.name] = {
                            panel: d3.select(this),
                            width: d.width,
                            height: d.height,
                            x: d.x,
                            y: d.y
                        };
                    }
                    return d.transform;
                },
                'class': 'layout-panels'
            });

            function generatePanels (data, x, y, width, height) {
                var accumulatedWidth = 0;
                var accumulatedHeight = 0;

                var morePanels = [];

                var dimensions = {
                    x: x,
                    y: y,
                    transform: 'translate(' + x + ',' + y + ')',
                    name: data.name,
                    width: width,
                    height: height
                };

                gPanels.push(dimensions);

                if (data.panels) {
                    morePanels = data.panels.map(function (subPanel) {
                        generatePanels(subPanel, x + accumulatedWidth, y + accumulatedHeight, width * subPanel.width, height * subPanel.height);
                        if ('horizontal' === data.type) {
                            accumulatedWidth += width * subPanel.width;
                        }
                        if ('vertical' === data.type) {
                            accumulatedHeight += height * subPanel.height;
                        }

                    });
                }
            }

        };
    }

    plotviz.LayoutManager = LayoutManager;
    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function Legend (container, id, metadata) {
        var _id = id;
        var _panel = container;
        var _mouseclick = null;
        var _mousemove = null;
        var _callback = null;

        _panel.append('g').attr('class', 'legend-text');

        _panel.append('g').attr('class', 'legend-rects');

        _panel.append('rect').attr({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            'class': 'legend-border'
        })
        .style({
            stroke: 'black',
            fill: 'none',
            'stroke-width': 1
        });

        this.mousemove = function (func) {
            if (func) {
                _mousemove = func;
                return this;
            } else {
                return _mousemove;
            }
        };

        this.mouseclick = function (func) {
            if (func) {
                _mouseclick = func;
                return this;
            } else {
                return _mouseclick;
            }
        };

        this.callback = function (func) {
            // TODO: Check if func is a function
            _callback = func;
        };

        this.render = function (data, config) {
            _panel.select('.legend-border').attr({ width:config.width, height:config.height });

            addText(data, _panel);
            addColorBars(data, _panel);
        };

        function addText(data, panel) {
            var textData = data.map(function (entry, index) {
                var entryHeight = 15;
                return {
                    key: entry.label,
                    x: 100,
                    y: 3 + (entryHeight * index),
                    textWidth: 10,
                    height: 12,
                    raw: entry
                };
            });

            var textSelection = panel.select('.legend-text').selectAll('text')
                .data(textData);
            textSelection.exit().remove();
            textSelection.enter().append('text');
            textSelection.attr({
                    x: function (d) { return d.textWidth; },
                    y: function (d) { return d.y; },
                    dy: function (d) { return d.height + 'px'; }
                })
                .text(function (d) { return d.key; })
                .on('click', function (d, i) {
                    if (_callback) {
                        var callbackInput = {
                            type: 'click',
                            subtype: 'legend',
                            component: 'text',
                            'id': _id,
                            data: d
                        };

                        _callback(callbackInput);
                    }
                })
                .on('mousemove', function (d, i) {
                    if (_callback) {
                        var callbackInput = {
                            type: 'mousemove',
                            subtype: 'legend',
                            component: 'text',
                            data: d.raw
                        };

                        _callback(callbackInput);
                    }
                    if (_mousemove) {
                        var xy = d3.mouse(_svg.node());
                        var mousemoveInput = {
                            key: 'mousemove',
                            value: {
                                type: 'legend',
                                subtype: 'color',
                                id: _id,
                                data: d.raw
                            }
                        };

                        _mousemove(xy[0], xy[1], mousemoveInput);
                    }
                })
                .on('mouseout', function (d, i) {
                    if (_callback) {
                        var callbackInput = {
                            type: 'mouseout',
                            subtype: 'legend',
                            component: 'text',
                            data: d.raw
                        };
                        _callback(callbackInput);
                    }
                });
        }

        function addColorBars(data, panel) {
            var colors = generateDefaultColors();

            var maxTextWidth = panel.select('.legend-text').selectAll('text')[0]
                .map(function (d) { return d.getBBox(); })
                .reduce(function (a, b) { return a.width > b.width ? a.width : b.width; }, {width:0});
            var entryHeight = 15;
            var colorBarData = data.map(function (entry, index) {
                return {
                    y: 3 + (entryHeight * index),
                    colorWidth: 12,
                    height: 12,
                    color: entry.color || colors[index],
                    opacity: entry.opacity,
                    raw: entry
                };
            });

            var colorBarSelection = panel.select('.legend-rects').selectAll('rect')
                .data(colorBarData);
            colorBarSelection.exit().remove();
            colorBarSelection.enter().append('rect');
            colorBarSelection.attr({
                    x: function (d) { return maxTextWidth + 15; },
                    y: function (d) { return d.y; },
                    width: function (d) { return d.colorWidth; },
                    height: function (d) { return d.height; }
                })
                .style({
                    fill: function (d) { return d.color; },
                    opacity: function (d) { return d.opacity; }
                })
                .on('click', function (d, i) {
                    if (_callback) {
                        var callbackInput = {
                            type: 'click',
                            subtype: 'legend',
                            component: 'box',
                            'id': _id,
                            data: d.raw
                        };

                        _callback(callbackInput);
                    }
                    if (_mouseclick) {
                        var xy = d3.mouse(_svg.node());
                        var mouseclickInput = {
                            key: 'mouseclick',
                            value: {
                                type: 'legend',
                                subtype: 'color',
                                id: _id,
                                data: d.raw
                            }
                        };

                        _mouseclick(xy[0], xy[1], mouseclickInput);
                    }
                })
                .on('mousemove', function (d, i) {
                    if (_callback) {
                        var callbackInput = {
                            type: 'mousemove',
                            subtype: 'legend',
                            component: 'box',
                            data: d.raw
                        };

                        _callback(callbackInput);
                    }
                    if (_mousemove) {
                        var xy = d3.mouse(_svg.node());
                        var mousemoveInput = {
                            key: 'mousemove',
                            value: {
                                type: 'legend',
                                subtype: 'color',
                                id: _id,
                                data: d.raw
                            }
                        };

                        _mousemove(xy[0], xy[1], mousemoveInput);
                    }
                })
                .on('mouseout', function (d, i) {
                    if (_callback) {
                        var callbackInput = {
                            type: 'mouseout',
                            subtype: 'legend',
                            component: 'box',
                            data: d.raw
                        };
                        _callback(callbackInput);
                    }
                });
        }

        function generateDefaultColors () {
            return {
                0: '#c41708',
                1: '#1fccf9',
                2: '#79e537',
                3: '#ddb501',
                4: '#60119a',
                5: '#3ea0a1',
                6: '#296f18',
                7: '#f5dbfc',
                8: '#b4e6fa',
                9: '#65079a',
                10: '#6216a4',
                11: '#8a24c6',
                12: '#a82d20',
                13: '#07ad84',
                14: '#d50fd1',
                15: '#249e5a',
                16: '#af3067',
                17: '#644ffb',
                18: '#1bb80a',
                19: '#33c5fa',
                20: '#668be6',
                21: '#cedc2a',
                22: '#6ea417',
                23: '#f80ddb',
                24: '#e3f3e4',
                25: '#1be427',
                26: '#93a3df',
                27: '#94416b',
                28: '#a37e55',
                29: '#9ba900',
                30: '#750f69',
                31: '#abfb4f',
                32: '#d257ee',
                33: '#094e9d',
                34: '#9a3574',
                35: '#cf4cc3',
                36: '#0357de',
                37: '#dd4571',
                38: '#ef6215',
                39: '#086b2b',
                40: '#e7e006',
                41: '#646a42',
                42: '#a7cebf',
                43: '#a1fd8f',
                44: '#168939',
                45: '#f6ee4d',
                46: '#1e70cb',
                47: '#92f910',
                48: '#cc41b0',
                49: '#1cd065',
                50: '#c17f19',
                51: '#d5701d',
                52: '#49e889',
                53: '#97344d',
                54: '#6ccbfa',
                55: '#b51460',
                56: '#3aa9e7',
                57: '#c4b580',
                58: '#f550b5',
                59: '#02af26',
                60: '#dbbe1c',
                61: '#9ac744',
                62: '#250501',
                63: '#176468',
                64: '#a0e7c7',
                65: '#f7cf08',
                66: '#f7cf08',
                67: '#4c0313',
                68: '#e58e54',
                69: '#f06bdb',
                70: '#c83de1',
                71: '#6bbcd0',
                72: '#b201b0',
                73: '#976027',
                74: '#da523d',
                75: '#4e74f8',
                76: '#dfc523',
                77: '#f6f43f',
                78: '#01e6c5',
                79: '#19fce0',
                80: '#3f3189',
                81: '#6a9fa6',
                82: '#f340af',
                83: '#113996',
                84: '#a0ec80',
                85: '#513f54',
                86: '#a7b48f',
                87: '#f90084',
                88: '#637acc',
                89: '#616de7',
                90: '#ec5494',
                91: '#95f459',
                92: '#8d3297',
                93: '#bc5a81',
                94: '#06e704',
                95: '#a03654',
                96: '#4576c0',
                97: '#3f8649',
                98: '#8b8a7f',
                99: '#e5c0ee'
            };
        }

    }

    plotviz.Legend = Legend;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function LineViewer (container, id, config) {
        var _id = id;
        var _panel = container;
        var _tooltip = null;
        var _tooltipFunc = null;
        var _config = config;
        var _sortingFunction = function (a, b) { return 0; };

        _panel.append('rect').attr({
            x: 0,
            y: 0,
            'class': 'border'
        })
        .style({
            stroke: 'black',
            fill: 'none',
            'stroke-width': 2
        });

        this.tooltipPanel = function (tooltip) {
            if (tooltip) {
                _tooltip = tooltip;
                return this;
            } else {
                return _tooltip;
            }
        };

        this.tooltipFunction = function (func) {
            if (func) {
                _tooltipFunc = func;
                return this;
            } else {
                return _tooltipFunc;
            }
        };

        this.sortingFunction = function (f) {
            // TODO: Error check that f is a function
            _sortingFunction = f || function (a, b) { return 0; };
        };

        function retrievePointsByKey (raw, key) {
            return raw.filter(function (point) { return point.key === key; });
        }

        function rawToKeysData (raw) {
            return extractAxisKeys(raw).map(function (key) {
                    return {
                        key: key,
                        values: retrievePointsByKey (raw, key)
                    };
                }).sort(_sortingFunction);
        }

        function keysDataToLineData (keysData, lineLabels) {
            return lineLabels.map(function (label) {
                return {
                        label: label,
                        points: keysData.map(function (keyDatum) {
                                return {
                                        key: keyDatum.key,
                                        value: keyDatum.values.filter(function (point) { return label === point.label; })[0].value
                                    };
                            })
                    };
            });
        }

        function extractLineLabels (raw) {
            var labelUnion = raw.map(function (point) {
                        return point.label;
                    });

            return d3.set(labelUnion).values();
        }

        function extractAxisKeys (raw, config) {
            var keyUnion = raw.map(function (point) {
                        return point.key;
                    });

            return  d3.set(keyUnion).values();
        }

        this.generateXAxis = function (raw, config) {

            var keys = rawToKeysData(raw).map(function (keyDatum) {
                    return keyDatum.key;
                });

            return d3.scale.ordinal()
                .domain(keys)
                .rangeBands([0, config.width], 0.1);
        };

        this.generateYAxis = function (raw, config) {
            var maxMin = this.maxMin(raw);
            var spread = maxMin.maximum - maxMin.minimum;

            return d3.scale.linear()
                .domain([maxMin.minimum - spread / 10, maxMin.maximum + spread / 10])
                .range([config.height, 0])
                .nice();
        };

        this.maxMin = function (raw) {
            return {
                maximum: Math.max.apply(null, extractValues(raw)),
                minimum: Math.min.apply(null, extractValues(raw))
            };

            function extractValues(raw) {
                return raw.map(function (point) {
                        return point.value;
                    });
            }
        };

        this.render = function (raw, config) {
            _panel.select('.border').attr({ width:config.width, height: config.height });

            var x = this.generateXAxis(raw, config);
            var y = this.generateYAxis(raw, config);

            addLines(keysDataToLineData(rawToKeysData(raw), extractLineLabels(raw)), _panel, x, y, config);
        };

        function addLines (data, panel, x, y, config) {
            var colors = generateDefaultColors();
            var classes = config.classes || {};
            var pathData = data.map(function (lineData, lineIndex) {
                return {
                    line: lineData.points.map(function (point) {
                        return {
                            x: x(point.key) + (x.rangeBand() / 2),
                            y: y(point.value)
                        };
                    }),
                    color: config.colors ? config.colors[lineData.label] : colors[lineIndex],
                    'class': classes[lineData.label],
                    key: lineData.label
                };
            });

            var lineFunction = d3.svg.line()
                                .x(function (d) { return d.x; })
                                .y(function (d) { return d.y; })
                                .interpolate('linear');

            var lineSelection = panel.selectAll('path').data(pathData);
            lineSelection.enter().append('path');

            lineSelection.attr('d', function (d) { return lineFunction(d.line); })
                .attr('class', function (d) { return d.class; })
            .style({
                stroke: function (d) { return d.color; },
                fill: 'none'
            });
        }

        function generateDefaultColors () {
            return {
                0: '#c41708',
                1: '#1fccf9',
                2: '#79e537',
                3: '#ddb501',
                4: '#60119a',
                5: '#3ea0a1',
                6: '#296f18',
                7: '#f5dbfc',
                8: '#b4e6fa',
                9: '#65079a',
                10: '#6216a4',
                11: '#8a24c6',
                12: '#a82d20',
                13: '#07ad84',
                14: '#d50fd1',
                15: '#249e5a',
                16: '#af3067',
                17: '#644ffb',
                18: '#1bb80a',
                19: '#33c5fa',
                20: '#668be6',
                21: '#cedc2a',
                22: '#6ea417',
                23: '#f80ddb',
                24: '#e3f3e4',
                25: '#1be427',
                26: '#93a3df',
                27: '#94416b',
                28: '#a37e55',
                29: '#9ba900',
                30: '#750f69',
                31: '#abfb4f',
                32: '#d257ee',
                33: '#094e9d',
                34: '#9a3574',
                35: '#cf4cc3',
                36: '#0357de',
                37: '#dd4571',
                38: '#ef6215',
                39: '#086b2b',
                40: '#e7e006',
                41: '#646a42',
                42: '#a7cebf',
                43: '#a1fd8f',
                44: '#168939',
                45: '#f6ee4d',
                46: '#1e70cb',
                47: '#92f910',
                48: '#cc41b0',
                49: '#1cd065',
                50: '#c17f19',
                51: '#d5701d',
                52: '#49e889',
                53: '#97344d',
                54: '#6ccbfa',
                55: '#b51460',
                56: '#3aa9e7',
                57: '#c4b580',
                58: '#f550b5',
                59: '#02af26',
                60: '#dbbe1c',
                61: '#9ac744',
                62: '#250501',
                63: '#176468',
                64: '#a0e7c7',
                65: '#f7cf08',
                66: '#f7cf08',
                67: '#4c0313',
                68: '#e58e54',
                69: '#f06bdb',
                70: '#c83de1',
                71: '#6bbcd0',
                72: '#b201b0',
                73: '#976027',
                74: '#da523d',
                75: '#4e74f8',
                76: '#dfc523',
                77: '#f6f43f',
                78: '#01e6c5',
                79: '#19fce0',
                80: '#3f3189',
                81: '#6a9fa6',
                82: '#f340af',
                83: '#113996',
                84: '#a0ec80',
                85: '#513f54',
                86: '#a7b48f',
                87: '#f90084',
                88: '#637acc',
                89: '#616de7',
                90: '#ec5494',
                91: '#95f459',
                92: '#8d3297',
                93: '#bc5a81',
                94: '#06e704',
                95: '#a03654',
                96: '#4576c0',
                97: '#3f8649',
                98: '#8b8a7f',
                99: '#e5c0ee'
            };
        }

        /**
         * Sorts the major and minor keys in the data to be visualized. Some
         * default sorting function options available are 'alphabetical',
         * 'increasing', and 'decreasing'. 'increasing' and 'decreasing' for the
         * minor keys base it on the median of the minor keys. 'increasing' and
         * 'decreasing' for the major keys base it on the average of the medians
         * for the minor keys in their grouping.
         *
         * @param - string/function - sortFunction - The function that will
         *          be used to sort the major keys. A string can be used to
         *          call a default supported sorting function.
         */
        this.sort = function (data, config) {

            // TODO: Needs to be looked at for possible consicions and cleaning.
            var values, key,
                newData = JSON.parse(JSON.stringify(data));
            if ('alphabetical' === config.sorting) {
                newData.data.forEach(function (line) {
                    line.value.points.sort(function (pointA, pointB) {
                        return pointA.key < pointB.key ? -1 : 1;
                    });
                });
                return newData;
            } else if ('increasing' === config.sorting) {
                values = {};
                newData.data.forEach(function (line) {
                    line.value.points.map(function (point) {
                        if (point.key in values) {
                            values[point.key].push(point.value.median);
                        } else {
                            values[point.key] = [point.value.median];
                        }
                    });
                });

                Object.keys(values).forEach(function (key) {
                    values[key] = values[key].reduce(function (keyA, keyB) {
                        return keyA + keyB;
                    }) / values[key].length;
                });

                newData.data.forEach(function (line) {
                    line.value.points.sort(function (pointA, pointB) {
                        return values[pointA.key] - values[pointB.key];
                    });
                });
                return newData;
            } else {
                values = {};
                newData.data.map(function (line) {
                    line.value.points.map(function (point) {
                        if (point.key in values) {
                            values[point.key].push(point.value.median);
                        } else {
                            values[point.key] = [point.value.median];
                        }
                    });
                });

                Object.keys(values).forEach(function (key) {
                    values[key] = values[key].reduce(function (keyA, keyB) {
                        return keyA + keyB;
                    }) / values[key].length;
                });

                newData.data.map(function (line) {
                    line.value.points.sort(function (pointA, pointB) {
                        return values[pointB.key] - values[pointA.key];
                    });
                });
                return newData;
            }
        };

        this.dataTransform = function (data, config) {
            var newData = JSON.parse(JSON.stringify(data));

            if ('log' === config.scale) {
                newData = logTransform(newData);
            }

            return newData;
        };

        function logTransform (data) {
            var transform = function (x) { return Math.log10(x + 0.05); };

            var newData = {};
            newData.legend = JSON.parse(JSON.stringify(data.legend));
            newData.metadata = JSON.parse(JSON.stringify(data.metadata));
            newData.data = data.data.map(function (lines) {
                return {
                    key: lines.key,
                    value: {
                        color: lines.value.color,
                        points: lines.value.points.map(function (point) {
                            return {
                                key: point.key,
                                value: {
                                    median: transform(point.value.median),
                                    extra: point.value.extra
                                }
                            };
                        })
                    }
                };
            });

            return newData;
        }

    }

    plotviz.LineViewer = LineViewer;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    plotviz.Plot = function (div) {
        var _data = null;
        var _name = null;

        var _viewerPanel = null;
        var _xAxisPanel = null;
        var _yAxisPanel = null;
        var _legend = null;

        var _container = d3.select(div);
        var _root = null;
        var _svgRoot = null;
        var _tooltip = null;
        var _tooltipFunc = null;
        var _mouseclickFunc = null;
        var _mousemoveFunc = null;
        var _titlePanel = null;
        var _crosshair = null;
        var _config = {
            orientation: 'horizontal',
            scale: 'linear',
            sorting: 'alphabetical',
            crosshair: 'on',
            outliers: 'on',
            medians: 'all'
        };

        var _dataTransform = null;

        this.initialize = function(data) {
            data.metadata.options.forEach(function(option) {
                _config[option.value.key] = option.value.initial;
            },
            this);
        };


    /**
     * Main controlling rendering function that sets up the data
     * and calls the remaining rendering functions.
     *
     * @param - Object - data - The data used for the rendering.
     * @param - Object - config - Lets you give state configuration options
     *                          for the plot being rendered.
     */
    this.render = function (data, config) {

        var that = this;
        config = config || this.config();

        var metadata = validateMetadata(data.metadata);

        var x, y, spread,
            width = metadata.width,
            height = metadata.height,
            legendProportionLeft = metadata.position.legend.x || (6/7),
            legendProportionTop = metadata.position.legend.y || (1/4),
            legendProportionRight = metadata.position.legend.right || (6/7),
            legendLeft = legendProportionLeft * width,
            legendTop = legendProportionTop * height,
            legendRight = legendProportionRight * width,
            viewerProportionLeft = metadata.position.viewer.left || (1/7),
            viewerProportionTop = metadata.position.viewer.top || (1/4),
            viewerProportionRight = metadata.position.viewer.right || (6/7),
            viewerProportionBottom = metadata.position.viewer.bottom || (3/4),
            viewerLeft = viewerProportionLeft * width,
            viewerTop = viewerProportionTop * height,
            viewerRight = viewerProportionRight * width,
            viewerBottom = viewerProportionBottom * height;
            var majorKeys;

            _svgRoot.attr({
                width: width,
                height: height
            });


            _svgRoot.on('mousemove', function (d) {
                var newMouseX = d3.mouse(this)[0] - 2 - viewerLeft;
                var newMouseY= d3.mouse(this)[1] - 2 - viewerTop;
                var betterX = Math.min(Math.max(newMouseX, 0), viewerRight - viewerLeft);
                var betterY = Math.min(Math.max(newMouseY, 0), viewerBottom - viewerTop);
                _crosshair.move(betterX, betterY);
                            if (betterX < 0 || betterX > viewerRight - viewerLeft || betterY > viewerBottom - viewerTop || betterY < 0) {
                                _crosshair.hide();
                            } else {
                                //return that.config().crosshair === 'on' ? '' : 'none';
                                _crosshair.show();
                            }
                if ('off' === that.config().crosshair) {
                    _crosshair.hide();
                }
            });

            if ('box' === data.metadata.type) {
                majorKeys = data.data.map(function (boxGroup) {
                    return boxGroup.key;
                });
            }

            // TODO: Kane! This is a complete hack! Fix it! - Kane
            if ('line' === data.metadata.type) {
                majorKeys = data.data[0].value.points.map(function (lineGroup) {
                    return lineGroup.key;
                });
            }
            var maxMin;
            if ('box' === data.metadata.type) {
                maxMin = plotviz.maxMin(data);
            }
            if ('line' === data.metadata.type) {
                maxMin = plotviz.lineMaxMin(data.data);
            }
            _titlePanel.attr('transform', 'translate(' + viewerLeft + ',0)');

        spread = maxMin.maximum - maxMin.minimum;

        var titleAnchor = 'middle';
        if ('left' === metadata.position.title.align) {
            titleAnchor = 'left';
        }
        if ('right' === metadata.position.title.align) {
            titleAnchor = 'right';
        }
        _titlePanel.select('#titleLabel')
            .attr({
                x: (viewerRight - viewerLeft) * metadata.position.title.x,
                y: viewerTop * metadata.position.title.y 
            })
            .style({
                'text-anchor': titleAnchor,
                font: data.metadata.titlefont
            })
            .text(data.metadata.title);

        _svgRoot.attr('height', data.metadata.height + 'px');

        y = d3.scale.linear()
            .domain([maxMin.minimum - spread / 10,
                    maxMin.maximum + spread / 10])
            .range([viewerBottom - viewerTop, 0])
            .nice();


        x = d3.scale.ordinal()
            .domain(majorKeys)
            .rangeBands([0, viewerRight - viewerLeft], metadata.boxGroupSpacing);

        var leftPanelData = {
            axis: y,
            x: viewerLeft,
            y: viewerTop,
            orientation: 'left',
            label: data.metadata.ylabel,
            labelX: viewerLeft * metadata.position.yAxisLabel.x,
            labelY: (viewerBottom - viewerTop) *  metadata.position.yAxisLabel.y,
            rotation: metadata.position.yAxisLabel.rotation,
            align: metadata.position.yAxisLabel.align
        };

        _yAxisPanel.render(leftPanelData);

        var bottomPanelData = {
            axis: x,
            x: viewerLeft,
            y: viewerBottom,
            orientation: 'bottom',
            //label: data.metadata.xlabel
            label: data.metadata.xlabel,
            labelY: (data.metadata.height - viewerBottom) * metadata.position.xAxisLabel.y,
            labelX: (viewerRight - viewerLeft) * metadata.position.xAxisLabel.x,
            tickRotation: metadata.position.xAxisLabel.tickRotation,
            tickTranslate: metadata.position.xAxisLabel.tickTranslate,
            tickAlign: metadata.position.xAxisLabel.tickAlign
        };

        _xAxisPanel.render(bottomPanelData);


        var copyingData = JSON.parse(JSON.stringify(data));
        copyingData.metadata = metadata;

        if ('box' === data.metadata.type) {
            _viewerPanel.render(transformPseudo(copyingData, x, y), x, y, config);
        }
        if ('line' === data.metadata.type) {
            _viewerPanel.render(data.data, x, y, {x:viewerLeft, y:viewerTop, width:viewerRight - viewerLeft, height:viewerBottom - viewerTop});
        }

        _legend.render(data.legend, x, y, {x: legendLeft, y: legendTop});
    };

        this.option = function (key, value) {
            if (value) {
                if (typeof _config[key] !== 'undefined') {
                    _config[key] = value;
                    // TODO: This is a hack before figuring out a better way
                    // to sort correctly.
                    if ('sorting' === key && 'box' === _data.metadata.type) {
                        _config.minorSort = _config.sorting;
                        _config.majorSort = _config.sorting;
                    }
                } else {
                    console.log(key + ' is not an option or setting.');
                }
            }
            else {
                return _config[key];
            }
            return this;
        };



        /**
         * Updates or returns the data the plot is visualizing.
         *
         * @param - JSON - data - The plot data to for later rendering.
         *
         * @return - JSON - data - If no parameter is supplied then return data.
         */
        this.data = function (data) {
            if (data) {
                _data = JSON.parse(JSON.stringify(data));
            } else {
                return JSON.parse(JSON.stringify(_data));
            }
        };


        this.config = function (config) {
            if (config) {
                _config = JSON.parse(JSON.stringify(config));
            } else {
                return JSON.parse(JSON.stringify(_config));
            }
        };


        this.create = function (data, name) {
            var that = this;
            var metadata = validateMetadata(data.metadata);

            _name = name;

            _root = _container.append('div')
                .attr({
                    id: 'plotviz-rootDiv' + (_name ? '-' + name : ''),
                    className: 'plotviz-rootClass-horizontal'
                })
                .style({
                    'position': 'relative',
                    'height': metadata.height + 'px',
                    'width': metadata.width + 'px'
                });


            this.initialize(data);

            addControls(_root.node(), data, this);

            _svgRoot = _root.append('svg').attr({
                id: 'svg-plotviz-root',
                width: '100%',
                height: '100%',
                'xmlns:xmlns:xlink': 'http://www.w3.org/1999/xlink'
            });

            _tooltip = _root.append('div')
                .attr('class', 'tooltip')
                .style('position', 'absolute');

            _titlePanel = _svgRoot.append('g').attr({
                    id: 'svg-plotviz-titlePanel'
                });
            _titlePanel.append('text').attr('id', 'titleLabel')
                .style('font', data.metadata.options.titlefont || '48px');


            var viewerLeft = metadata.position.viewer.left * metadata.width;
            var viewerTop = metadata.position.viewer.top * metadata.height;
            var viewerRight = metadata.position.viewer.right * metadata.width;
            var viewerBottom = metadata.position.viewer.bottom * metadata.height;

            var _viewerPanelData;

            if ('box' === metadata.type) {
                _viewerPanelData = {
                    metadata: {
                        width: viewerRight - viewerLeft,
                        height: viewerBottom - viewerTop,
                        x: viewerLeft,
                        y: viewerTop,
                        outlierRadius: metadata.outlierRadius,
                        outlierJitter: metadata.outlierJitter
                    },
                    data: data.data
                };

                _viewerPanel = new plotviz.BoxWhiskerViewer(_svgRoot, 'svg-plotviz-mainPanel', _viewerPanelData);
                _viewerPanel.tooltipPanel(_tooltip);
                if (_tooltipFunc) {_viewerPanel.tooltipFunction(_tooltipFunc);}
                _config.minorSort = _config.sorting;
                _config.majorSort = _config.sorting;
            }


            if ('line' === metadata.type) {
                _viewerPanelData = {
                    metadata: {
                        width: viewerRight - viewerLeft,
                        height: viewerBottom - viewerTop,
                        x: viewerLeft,
                        y: viewerTop
                    },
                    data: data.data
                };

                _viewerPanel = new plotviz.LineViewer(_svgRoot, 'svg-plotviz-mainPanel', _viewerPanelData);
                _viewerPanel.tooltipPanel(_tooltip);
                if (_tooltipFunc) {_viewerPanel.tooltipFunction(_tooltipFunc);}
            }

            if (_mouseclickFunc) {_viewerPanel.mouseclick(_mouseclickFunc);}

            _dataTransform = _viewerPanel.dataTransform;
            this.sort = _viewerPanel.sort;

            var crosshairMetadata = {
                width: viewerRight - viewerLeft,
                height: viewerBottom - viewerTop,
                x: 0,
                y: 0
                //x: viewerLeft,
                //y: viewerTop
            };

            var mainPanel = _svgRoot.select('#svg-plotviz-mainPanel');
            _crosshair = new plotviz.Crosshair(mainPanel, 'svg-plotviz-crosshair', crosshairMetadata);



            var leftPanelInput = {
                x: viewerLeft,
                y: viewerTop,
                labelX: metadata.position.yAxisLabel.x,
                labelY: metadata.position.yAxisLabel.y,
                rotation: metadata.position.yAxisLabel.rotation,
                align: metadata.position.yAxisLabel.align,
            };

            _yAxisPanel = new plotviz.AxisPanel(_svgRoot, 'svg-plotviz-leftPanel', leftPanelInput);

            var bottomPanelInput = {
                x: viewerLeft,
                y: viewerBottom,
            };

            _xAxisPanel = new plotviz.AxisPanel(_svgRoot, 'svg-plotviz-bottomPanel', bottomPanelInput);
            _xAxisPanel.tooltipPanel(_tooltip);
            if (_tooltipFunc) {_xAxisPanel.tooltipFunction(_tooltipFunc);}
            if (_mouseclickFunc) {_xAxisPanel.mouseclick(_mouseclickFunc);}

            var legendLeft = metadata.position.legend.x * metadata.width;
            var legendTop = metadata.position.legend.y * metadata.height;
            var legendRight = metadata.position.legend.right * metadata.width;

            var legendMetadata = {
                x: legendLeft,
                y: legendTop,
                align: metadata.position.legend.align
            };
            _legend = new plotviz.Legend(_svgRoot, 'legendPanel', legendMetadata);
            if (_mouseclickFunc) {_legend.mouseclick(_mouseclickFunc);}

            if (data.metadata.init) {
                data.metadata.init(this, data, this.config());
            }

            return _root;

        };


        this.tooltip = function (func) {
            if (func) {
                _tooltipFunc = func;
                if (_viewerPanel) {_viewerPanel.tooltipFunction(func);}
                if (_xAxisPanel) {_xAxisPanel.tooltipFunction(func);}
                if (_yAxisPanel) {_yAxisPanel.tooltipFunction(func);}

                if (_viewerPanel) {_viewerPanel.tooltipPanel(_tooltip);}
                if (_xAxisPanel) {_xAxisPanel.tooltipPanel(_tooltip);}
                if (_yAxisPanel) {_yAxisPanel.tooltipPanel(_tooltip);}
            } else {
                return _tooltipFunc;
            }
        };


        this.mouseclick = function (func) {
            if (func) {
                _mouseclickFunc = func;
                if (_legend) {_legend.mouseclick(func);}
                if (_xAxisPanel) {_xAxisPanel.mouseclick(func);}
            } else {
                return _mouseclickFunc;
            }
        };

        this.mousemove = function (func) {
            if (func) {
                _mousemoveFunc = func;
                if (_legend) {_legend.mousemove(func);}
            } else {
                return _mousemoveFunc;
            }
        };


        /**
         *  Validates the metadata field for the Plot object's input. If
         *  a field doesn't exist then it is given a default value. Once
         *  the input is validated the validated version is returned. The
         *  original input is untouched.
         *
         *  TODO: Echo out proper logging and warning messages based on the
         *          input fields that don't exist.
         *
         *  @param - JSON - input - The metadata from the plot input.
         *
         *  @return - JSON - The validated input with all fields filled in
         *                  either with the input values or a proper default.
         *
         *      The JSON takes this form
         *
         *      input:
         *
         */
        function validateMetadata (input) {
            var data = input || {};
            data = JSON.parse(JSON.stringify(data));
            var metadata = data || {};
            metadata.height = metadata.height || 400;
            metadata.width = metadata.width || 1000;
            metadata.type = metadata.type || 'box';
            metadata.title = metadata.title || '';
            metadata.titlefont = metadata.titlefont || '48px';
            metadata.boxGroupSpacing = metadata.boxGroupSpacing || 0.1;

            metadata.options = metadata.options || {};
            metadata.position = metadata.position || {};

            metadata.position.viewer = metadata.position.viewer || {};
            var viewer = metadata.position.viewer;
            viewer.left = viewer.left || 1/7;
            viewer.top = viewer.top || 1/4;
            viewer.right = viewer.right || 6/7;
            viewer.bottom = viewer.bottom || 3/4;
            metadata.position.viewer = viewer;

            metadata.position.legend = metadata.position.legend || {};
            var legend = metadata.position.legend;
            legend.x = legend.x || 6/7;
            legend.y = legend.y || 1/4;
            legend.align = legend.align || 'left';
            metadata.position.legend = legend;

            metadata.position.title = metadata.position.title || {};
            var title = metadata.position.title;
            title.x = title.x || 0.5;
            title.y = title.y || 0.5;
            title.align = title.align || 'center';
            metadata.position.title = title;

            metadata.position.yAxisLabel = metadata.position.yAxisLabel || {};
            var yAxisLabel = metadata.position.yAxisLabel;
            yAxisLabel.x = yAxisLabel.x || 0.5;
            yAxisLabel.y = yAxisLabel.y || 0.5;
            yAxisLabel.rotation = yAxisLabel.rotation === 0 ? 0 : yAxisLabel.rotation || 90;
            yAxisLabel.align = yAxisLabel.align || 'center';
            metadata.position.yAxisLabel = yAxisLabel;

            metadata.position.xAxisLabel = metadata.position.xAxisLabel || {};
            var xAxisLabel = metadata.position.xAxisLabel;
            xAxisLabel.x = xAxisLabel.x || 0.5;
            xAxisLabel.y = xAxisLabel.y || 0.5;
            xAxisLabel.rotation = xAxisLabel.rotation || 0;
            xAxisLabel.tickRotation = xAxisLabel.tickRotation === 0 ? 0 : xAxisLabel.tickRotation || 45;
            xAxisLabel.tickTranslate = xAxisLabel.tickTranslate === 0 ? 0 : xAxisLabel.tickTranslate || 10;
            xAxisLabel.align = xAxisLabel.align || 'center';
            xAxisLabel.tickAlign = xAxisLabel.tickAlign || 'center';
            metadata.position.xAxisLabel = xAxisLabel;

            return metadata;
        }

        function validateLegendData (input) {
            var data = input || {};
            data = JSON.parse(JSON.stringify(data));
            var legendData = data || {};
            
            return legendData;
        }



        /**
         * Creates the controls for the plot on screen.
         *
         * @param - HTMLElement - div - Div to append the controls to.
         * @param - JSON - data - Button box data to generate the controls.
         */
        function addControls (div, data, that) {

            var control = d3.select(div);

            data.metadata.position = data.metadata.position || {};
            data.metadata.position.control = data.metadata.position.control || {};

            var width = data.metadata.width;
            var height = data.metadata.height;

            var controlProportionLeft = data.metadata.position.control.left || 1/8;
            var controlProportionTop = data.metadata.position.control.top || 7/8;
            var controlLeft = controlProportionLeft * width;
            var controlTop = controlProportionTop * height;

            var controlData = data.metadata.controls.map(function (d) {
                var controlGenerator = {
                    'sorting': plotviz.toolbox.generateSortingControl,
                    'scaling': plotviz.toolbox.generateScalingControl,
                    'crosshair': plotviz.toolbox.generateCrosshairControl,
                    'outliers': plotviz.toolbox.generateOutlierControl,
                    'medians': plotviz.toolbox.generateMedianOnlyControl
                };
                return typeof d === 'string' ? (d in controlGenerator ? controlGenerator[d]() : undefined) : d;
            })
            .filter(function (d) { return d; });

            var buttonBox = control.append('div')
                .attr('id', 'plotviz-controlDiv')
                .attr('class', 'plotviz-controlClass')
                .style('position', 'absolute')
                .style('left', controlLeft + 'px')
                .style('top', controlTop + 'px')
              .append('div')
                .attr('class', 'plotviz-floatWrap')
              .selectAll('div')
                .data(controlData)
              .enter().append('div')
                .attr('id', function (d) { return d.value.id; })
                .attr('class', 'button-box button-box-first button-box-last');

            buttonBox.append('div')
                .attr('class', 'button-box-title')
                .text(function (d) { return d.value.text; });

            buttonBox.append('div')
                .attr('class', 'button-options')
              .selectAll('div')
                .data(function (d) { return d.value.buttons; })
              .enter().append('div')
                .attr('class', function (d) { return d.value.className + ' ' + (d.value.active ? 'btn-active' : 'btn-inactive'); })
                .text(function (d) { return d.value.text; })
                .on('click', function (d) {
                    if (d.value.pre) {
                        d.value.pre(that, _data, _config);
                    }

                    if (d.value.post) {
                        d.value.post(that, _dataTransform(_data, _config), _config);
                    }
                    deactivateChildButtons(this.parentNode);
                    activateSelf(this);
                });

                function activateSelf (button) {
                    d3.select(button)
                        .each(function (d) {
                            this.className = this.className.replace
                                (/(?:^|\s)btn-inactive(?!\S)/g, ' btn-active');
                        });
                }

                function deactivateChildButtons (button) {
                    d3.select(button).selectAll('div')
                        .each(function (d) {
                            this.className = this.className.replace
                                (/(?:^|\s)btn-active(?!\S)/g, ' btn-inactive');
                        });
                }

        }


    };

    function transformPseudo (data, x, y) {
        var min = Math.min.apply(null, y.domain());
        var scalingFactor = 32;
        var quad = Math.abs(y.domain()[0] - y.domain()[1]) / scalingFactor;
        var viewerLeft = data.metadata.position.viewer.left * data.metadata.width;
        var viewerRight = data.metadata.position.viewer.right * data.metadata.width;
        var viewerTop = data.metadata.position.viewer.top * data.metadata.height;
        var viewerBottom = data.metadata.position.viewer.bottom * data.metadata.height;

        var emptyBox = {
            key: 'normal',
            value: {
                high_whisker: min + ((scalingFactor / 2) - 1) * quad,
                q3: min + ((scalingFactor / 2) + 1) * quad,
                median: min + ((scalingFactor / 2) - 1) * quad,
                q1: min + ((scalingFactor / 2) - 1) * quad,
                low_whisker: min + ((scalingFactor / 2) - 1) * quad,
                outliers: [],
                color: 'grey',
                extra: {
                    opacity: 0.1
                },
                noData: true
            }
        };

        function addTooltipToEmptyBox (input) {
            var copyBox = JSON.parse(JSON.stringify(emptyBox));
            if (input && input.value && input.value.extra) {
                copyBox.value.extra.toolTip = input.value.extra.toolTip;
            }
            return copyBox;
        }

        return {
            metadata: {
                x: viewerLeft,
                y: viewerTop,
                width: viewerRight - viewerLeft,
                height: viewerBottom - viewerTop 
            },
            data: data.data.map(function (boxGroup) {
                return {
                    key: boxGroup.key,
                    axisLine: boxGroup.axisLine,
                    value: boxGroup.value.map(function (box, i) {
                        return box.key ? box : addTooltipToEmptyBox(box);
                    })
                };
            })
        };
    }



    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
function runIgvexpUnitTests() {
    module("Igvexp");

    asyncTest("Plot Info", 1, function () {
        equal(10, 10);

        start();
    });
}
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    plotviz.testInput2 = {
        metadata: {
            title: "Title",
            xlabel: "XAxisTest",
            ylabel: "YAxisTest",
            controls: ['orientation',
                        'sorting',
                        'scaling'],
            width: 1000,
            height: 400
        },
        data: [
            {
                key: 'key1',
                value: [
                    {
                        key: "key1",
                        value: {
                            high_whisker: 5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 0.1,
                            extra: {num_ticks: 7},
                            outliers: [6, 7, 7.5, 8],
                            color: 'red'
                        }
                    },
                    {
                        key: "key2",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 7,
                            low_whisker: 6,
                            color: 'green',
                            extra: {num_ticks: 6},
                            outliers: [2, 3, 2.5]
                        }
                    }
                ]
            },
            {
                key: 'key4',
                value: [
                    {
                        key: "key4",
                        value: {
                            high_whisker: 7,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 3,
                            color: 'blue',
                            extra: {num_ticks: 1},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key6',
                value: [
                    {
                        key: "key6",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 2,
                            low_whisker: 1,
                            color: 'yellow',
                            extra: {num_ticks: 2},
                            outliers: []
                        }
                    },
                    {
                        key: "key7",
                        value: {
                            high_whisker: 8,
                            q3: 7,
                            median: 6,
                            q1: 5,
                            low_whisker: 4,
                            color: 'orange',
                            extra: {num_ticks: 3},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key9',
                value: [
                    {
                        key: "key9",
                        value: {
                            high_whisker: 4.5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 1.5,
                            color: 'purple',
                            extra: {num_ticks: 4},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key10',
                value : [
                    {
                        key: "key10",
                        value: {
                            high_whisker: 9,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 1,
                            color: 'cyan',
                            extra: {num_ticks: 5},
                            outliers: []
                        }
                    }
                ]
            }
        ],
        legend: [
            {
                key: 'key1',
                value: {
                    label: 'label1',
                    color: 'red'
                }
            },
            {
                key: 'key2',
                value: {
                    label: 'label2',
                    color: 'blue'
                }
            },
            {
                key: 'key3',
                value: {
                    label: 'label3',
                    color: 'red'
                }
            }
        ]
    };

    plotviz.normalInput = {
        metadata: {
            title: "Title",
            xlabel: "XAxisTest",
            ylabel: "YAxisTest",
            controls: ['orientation',
                        'sorting',
                        'scaling'],
            width: 1400,
            height: 800
        },
        data: [
            {
                key: 'key1',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 0.1,
                            extra: {num_ticks: 7},
                            outliers: [
                                {
                                    key: 'one',
                                    value: {
                                        outlier: 6
                                    }
                                },
                                {
                                    key: 'two',
                                    value: {
                                        outlier: 7,
                                        extra: 'surprise'
                                    }
                                },
                                {
                                    key: 'three',
                                    value: {
                                        outlier: 7.5
                                    }
                                },
                                {
                                    key: 'four',
                                    value: {
                                        outlier: 8
                                    }
                                }
                            ],
                            color: 'red'
                        }
                    },
                    {
                        key: "even",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 7,
                            low_whisker: 6,
                            color: 'blue',
                            extra: {
                                num_ticks: 6,
                                opacity: 0.5
                            },
                            outliers: [
                                {
                                    key: 'one',
                                    value: {
                                        outlier: 2
                                    }
                                },
                                {
                                    key: 'two',
                                    value: {
                                        outlier: 3
                                    }
                                },
                                {
                                    key: 'three',
                                    value: {
                                        outlier: 2.5
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            {
                key: 'key4',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 7,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 3,
                            color: 'red',
                            extra: {num_ticks: 1},
                            outliers: []
                        }
                    },
                    {
                    }
                ]
            },
            {
                key: 'key6',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 2,
                            low_whisker: 1,
                            color: 'red',
                            extra: {num_ticks: 2},
                            outliers: []
                        }
                    },
                    {
                        key: "even",
                        value: {
                            high_whisker: 8,
                            q3: 7,
                            median: 6,
                            q1: 5,
                            low_whisker: 4,
                            color: 'blue',
                            extra: {num_ticks: 3},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key9',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 4.5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 1.5,
                            color: 'red',
                            extra: {num_ticks: 4},
                            outliers: []
                        }
                    },
                    {
                    }
                ]
            },
            {
                key: 'key10',
                value : [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 9,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 1,
                            color: 'red',
                            extra: {num_ticks: 5},
                            outliers: []
                        }
                    },
                    {
                        key: "even",
                        value: {
                            high_whisker: 9,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 1,
                            color: 'blue',
                            extra: {num_ticks: 5},
                            outliers: []
                        }
                    }
                ]
            }
        ],
        legend: [
            {
                key: 'key1',
                value: {
                    label: 'label1',
                    color: 'red'
                }
            },
            {
                key: 'key2',
                value: {
                    label: 'label2',
                    color: 'blue'
                }
            },
            {
                key: 'key3',
                value: {
                    label: 'label3',
                    color: 'red'
                }
            }
        ]
    };

    return plotviz;
})
    (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function TextPanel (container, id, config) {
        var _id = id;
        var _panel = container;
        var _text = null;

        _text = _panel.append('text').attr('class', 'plotviz-text');

        function render (data, unvalidatedConfig) {
            function validate (config) {
                return {
                        width: config.width,
                        height: config.height,
                        x: config.x || 0.5,
                        y: config.y || 0.5,
                        rotation: config.rotation ? config.rotation : 0,
                        'class': config.class || null
                    };
            }

            var config = validate(unvalidatedConfig);

            _text.attr('transform', 'translate(' + (config.x * config.width) + ',' + (config.y * config.height) + ') rotate(' + (-config.rotation) + ')')
                .attr('class', 'plotviz-text' + (config.class ? ' ' + config.class : ''))
                .text(data.content);
        }

        this.render = render;

    }

    plotviz.TextPanel = TextPanel;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    /*
        Takes a nested array and reduces it to an unnested array of all its
        elements.
    */
    function flatten (array) {
        return [];
    }

    plotviz.toolbox = {
        flatten: flatten
    };

    return plotviz;
}) (plotviz || {});

//exports.flatten = plotviz;
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function Tooltip (container) {
        var _div = container;

        var _tooltip = d3.select(_div).append('div')
            .attr('class', 'plotviz-tooltip')
            .style({
                    position: 'absolute',
                    left: '0px',
                    top: '0px'
                });

        hide();

        function move (x, y) {
            _tooltip.style({
                    left: x + 'px',
                    top: y + 'px'
                });

        }

        function tooltipClass (newClass) {
            if (newClass) {
                _tooltip.attr('class', newClass);
                return this;
            } else {
                _tooltip.attr('class');
            }
        }

        function text (content) {
            if (content) {
                _tooltip.html(content);
                return this;
            } else {
                return _tooltip.html();
            }
        }

        function show () {
            _tooltip.style('display', '');
        }

        function hide() {
            _tooltip.style('display', 'none');
        }

        return {
                show: show,
                hide: hide,
                tooltipClass: tooltipClass,
                move: move,
                text: text
            };
    }

    plotviz.Tooltip = Tooltip;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function GtexBoxplot (div, config) {
        config = config || {};
        var _tooltipFunction = null;
        var width = config.width || 1000;
        var height = config.height || 400;
        var _svg = d3.select(div).append('svg').attr({
                width: width,
                height: height
            });
        var layout = new plotviz.LayoutManager(_svg);
        layout.render(generateLayout(), {width:width, height:height});

        var _viewer = new plotviz.BoxWhiskerViewer(layout.getPanel('boxViewer'));
        var _leftAxis = new plotviz.AxisPanel(layout.getPanel('leftAxis'));
        var _bottomAxis = new plotviz.AxisPanel(layout.getPanel('bottomAxis'), 'bottomAxis');
        var _title = new plotviz.TextPanel(layout.getPanel('title'));

        function getPanelDimensions (key) {
            return layout.getPanelDimensions(key);
        }

        function callback (func) {
            _viewer.callback(func);
            _bottomAxis.callback(func);
        }

        function sortingFunctions (f) {
            _viewer.sortingFunctions(f);
        }

        function transformInput (data, f) {
            return data.map(function (box) {
                    return {
                        highWhisker: f(box.highWhisker),
                        q3: f(box.q3),
                        median: f(box.median),
                        q1: f(box.q1),
                        lowWhisker: f(box.lowWhisker),
                        outliers: box.outliers.map(f),
                        color: box.color,
                        extra: box.extra
                    };
                });
        }

        function builtInTransform (data, config) {
            var dataCopy = JSON.parse(JSON.stringify(data));
            if ('log' === config.scale) {
                dataCopy = transformInput(data, function (x) { return Math.log(x + 0.05) / Math.LN10; });
            }
            return dataCopy;
        }

        function container () {
            return _svg;
        }

        function render (data, config) {

            function boxMax (box) {
                return box.highWhisker || box.q3 || box.median || box.q1 || box.lowWhisker;
            }

            function boxesMax (boxes) {
                return Math.max.apply(null, boxes.map(function (box) {return boxMax(box);}));
            }

            function boxMin (box) {
                return box.lowWhisker || box.q1 || box.median || box.q3 || box.highWhisker;
            }

            function boxesMin (boxes) {
                return Math.min.apply(null, boxes.map(function (box) {return boxMin(box);}));
            }

            var newWidth = config.boxes.width || width;
            var newHeight = config.boxes.height || height;

            _svg.attr({
                'width': newWidth,
                'height': newHeight
            });

            layout.render(generateLayout(), {width:newWidth, height:newHeight});

            data.boxes = builtInTransform(data.boxes, config.boxes);

            var boxViewerDimensions = layout.getPanelDimensions('boxViewer');

            var boxConfig = {
                    width: boxViewerDimensions.width,
                    height: boxViewerDimensions.height,
                    outlierClass: config.boxes.outlierClass,
                    whiskerClass: config.boxes.whiskerClass,
                    boxClass: config.boxes.boxClass,
                    rectClass: config.boxes.rectClass,
                    outlierJitter: config.boxes.outlierJitter || 0
                };

            _viewer.render(data.boxes, boxConfig);

            var leftAxisData = {
                    orientation: 'left',
                    label: config.boxes.leftAxisLabel || 'TPM'
                },
                bottomAxisData = {
                    orientation: 'bottom',
                    label: ''
                };
            var leftAxisDimensions = layout.getPanelDimensions('leftAxis');
            var leftAxisConfig = {
                width: leftAxisDimensions.width,
                height: leftAxisDimensions.height,
                labelX: 0.5,
                labelY: 0.5,
                labelRotation: 90,
                axis: _viewer.generateYAxis(data.boxes, {height:boxConfig.height})
            };
            _leftAxis.render(leftAxisData, leftAxisConfig);

            var bottomAxisDimensions = layout.getPanelDimensions('bottomAxis');
            var bottomAxisConfig = {
                width: bottomAxisDimensions.width,
                height: bottomAxisDimensions.height,
                axisX: 0,
                axisY: 0,
                tickAlign: config.boxes.tickAlign || 'end',
                tickTranslate: config.boxes.tickTranslate === 0 ? 0 : (config.boxes.tickTranslate || -10),
                tickRotation: config.boxes.tickRotation === 0 ? 0 : (config.boxes.tickRotation || -45),
                axis: _viewer.generateXAxis(data.boxes, {width:boxConfig.width})
            };

            _bottomAxis.render(bottomAxisData, bottomAxisConfig);

            var titleDimensions = layout.getPanelDimensions('title');
            var titleConfig = {
                width: titleDimensions.width,
                height: titleDimensions.height,
                x: 0.5,
                y: 0.5,
                'class': config.boxes.titleClass
            };

            _title.render({content: config.boxes.titleContent}, titleConfig);
        }

        function generateLayout (data, config) {
            return {
                type: 'vertical',
                width: 1,
                height: 1,
                panels: [
                {
                    type: 'horizontal',
                    width: 1,
                    height: 0.1,
                    panels: [{
                        type: 'leaf',
                        width: 0.1,
                        height: 1
                    },
                    {
                        name: 'title',
                        type: 'leaf',
                        width: 0.9,
                        height: 1
                    }]
                },
                {
                    type: 'horizontal',
                    width: 1,
                    height: 0.9,
                    panels: [{
                        type: 'vertical',
                        width: 0.1,
                        height: 1,
                        panels: [{
                            name: 'leftAxis',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        },
                        {
                            referenceType: 'border',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        }]
                    },
                    {
                        type: 'vertical',
                        width: 0.9,
                        height: 1,
                        panels: [{
                            name: 'boxViewer',
                            type: 'leaf',
                            width: 1,
                            height: 0.55
                        },
                        {
                            name: 'bottomAxis',
                            type: 'leaf',
                            width: 1,
                            height: 0.25
                        },
                        {
                            type: 'leaf',
                            width: 1,
                            height: 0.2
                        }]
                    }]
            }]
            };
        }

        this.render = render;
        this.container = container;
        this.builtInTransform = builtInTransform;
        this.sortingFunctions = sortingFunctions;
        this.callback = callback;
        this.getPanelDimensions = getPanelDimensions;
    }

    plotviz.GtexBoxplot = GtexBoxplot;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function GtexLineplot (div, lineId, config) {
        var width = 1000;
        var height = 400;
        var _svg = d3.select(div).append('svg').attr({
                width: width,
                height: height
            });
        var layout = new plotviz.LayoutManager(_svg);
        layout.render(generateLayout(), {width:width, height:height});

        var _viewer = new plotviz.LineViewer(layout.getPanel('lineViewer'));
        var _viewer2 = new plotviz.LineViewer(layout.getPanel('lineViewer2'));
        var _leftAxis = new plotviz.AxisPanel(layout.getPanel('leftAxis'));
        var _leftAxis2 = new plotviz.AxisPanel(layout.getPanel('leftAxis2'));
        var _bottomAxis = new plotviz.AxisPanel(layout.getPanel('bottomAxis'));
        var _legend = new plotviz.Legend(layout.getPanel('legend'));

        function callback (func) {
            _legend.callback(func);
        }

        function sortingFunction (f) {
            _viewer.sortingFunction(f);
            _viewer2.sortingFunction(f);
        }

        function transformInput (raw, f) {
            return raw.map(function (point) {
                    return {
                            label: point.label,
                            key: point.key,
                            value: f(point.value)
                        };
                });
        }

        function builtInTransform (data, config) {
            var dataCopy = JSON.parse(JSON.stringify(data));
            if ('log' === config.scale) {
                dataCopy = transformInput(dataCopy, function (x) { return Math.log(x + 0.05) / Math.LN10; });
            }
            return dataCopy;
        }

        function container () {
            return _svg;
        }

        function render (data, config) {

            function linesMax (lines) {
                return Math.max.apply(null, lines.map(function (line) {return lineMax(line);}));
            }

            function lineMax (line) {
                return Math.max.apply(null, line.points.map(function (point) {return point.value;}));
            }

            function lineMin (line) {
                return Math.min.apply(null, line.points.map(function (point) {return point.value;}));
            }

            function linesMin (lines) {
                return Math.min.apply(null, lines.map(function (line) {return lineMin(line);}));
            }

            var lineConfig = layout.getPanelDimensions('lineViewer');

            _viewer.render(data.lines, lineConfig);

            var lineConfig2 = layout.getPanelDimensions('lineViewer2');

            _viewer2.render(data.lines, lineConfig2);

            var leftAxisData = {
                    orientation: 'left',
                    label: 'TPM'
                },
                bottomAxisData = {
                    orientation: 'bottom',
                    label: ''
                };
            var leftAxisDimensions = layout.getPanelDimensions('leftAxis');
            var leftAxisDimensions2 = layout.getPanelDimensions('leftAxis2');
            var viewerDimensions = layout.getPanelDimensions('lineViewer2');
            var leftAxisConfig = {
                width: leftAxisDimensions.width,
                height: leftAxisDimensions.height,
                labelX: 0.5,
                labelY: 0.5,
                labelRotation: 90,
                axis: _viewer.generateYAxis(data.lines, {height:viewerDimensions.height})
            };
            var leftAxisConfig2 = {
                width: leftAxisDimensions2.width,
                height: leftAxisDimensions2.height,
                labelX: 0.5,
                labelY: 0.5,
                labelRotation: 90,
                axis: _viewer.generateYAxis(data.lines, {height:viewerDimensions.height})
            };
            _leftAxis.render(leftAxisData, leftAxisConfig);
            _leftAxis2.render(leftAxisData, leftAxisConfig2);

            var bottomAxisDimensions = layout.getPanelDimensions('bottomAxis');
            var bottomAxisConfig = {
                width: bottomAxisDimensions.width,
                height: bottomAxisDimensions.height,
                axisX: 0,
                axisY: 0,
                tickAlign: 'end',
                tickTranslate: -10,
                tickRotation: -45,
                axis: _viewer.generateXAxis(data.lines, {width:viewerDimensions.width})
            };

            _bottomAxis.render(bottomAxisData, bottomAxisConfig);

            var legendDimensions = layout.getPanelDimensions('legend');
            var legendConfig = {
                width: legendDimensions.width,
                height: legendDimensions.height
            };
            var legendData = data.lines.map(function (line) {
                return {
                    label: line.label
                };
            });

            _legend.render(legendData, legendConfig);

        }

        function generateLayout (data, config) {
            return {
                type: 'vertical',
                width: 1,
                height: 1,
                panels: [{
                    type: 'leaf',
                    width: 1,
                    height: 0.1
                },
                {
                    type: 'horizontal',
                    width: 1,
                    height: 0.9,
                    panels: [{
                        type: 'vertical',
                        width: 0.15,
                        height: 1,
                        panels: [{
                            name: 'leftAxis',
                            type: 'leaf',
                            width: 1,
                            height: 0.215
                        },
                        {
                            type: 'leaf',
                            width: 1,
                            height: 0.07
                        },
                        {
                            name: 'leftAxis2',
                            type: 'leaf',
                            width: 1,
                            height: 0.215
                        },
                        {
                            referenceType: 'border',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        }]
                    },
                    {
                        type: 'vertical',
                        width: 0.65,
                        height: 1,
                        panels: [{
                            name: 'lineViewer',
                            type: 'leaf',
                            width: 1,
                            height: 0.215
                        },
                        {
                            type: 'leaf',
                            width: 1,
                            height: 0.07
                        },
                        {
                            name: 'lineViewer2',
                            type: 'leaf',
                            width: 1,
                            height: 0.215
                        },
                        {
                            name: 'bottomAxis',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        }]
                    },
                    {
                        type: 'vertical',
                        width: 0.2,
                        height: 1,
                        panels: [{
                            name: 'legend',
                            type: 'leaf',
                            width: 1,
                            height: 0.3
                        },
                        {
                            type: 'leaf',
                            width: 1,
                            height: 0.7
                        }]
                    }]
            }]
        };
        }

        function oldLayout (data, config) {
            return {
                type: 'root',
                width: 1000,
                height: 400,
                data: [{
                    key: 'box',
                    values: {
                        data: data.boxData
                    }
                },
                {
                    key: 'axisLeft',
                    values: {
                        data: data.leftAxisData
                    }
                },
                {
                    key: 'axisBottom',
                    values: {
                        data: data.bottomAxisData
                    }
                }],
                config: [{
                    key: 'box',
                    values: {
                        config: {'outliers' : 'on'}
                    }
                },
                {
                    key: 'axisLeft',
                    values: {
                        config: {
                            labelX: 0.5,
                            labelY: 0.5,
                            labelRotation: 90
                        }
                    }
                },
                {
                    key: 'axisBottom',
                    values: {
                        config: {
                            axisX: 0,
                            axisY: 0,
                            tickAlign: 'end',
                            tickTranslate: -10,
                            tickRotation: -45
                        }
                    }
                }],
                panelTypes: [
                    {
                        key: 'border',
                        values: {
                            blueprint: function (container) {
                                var _panel = container;
                                _panel.append('rect').attr('class', 'border');
                                this.render = function (data, config) {
                                    _panel.select('.border')
                                        .attr({
                                            'width': config.width,
                                            'height': config.height
                                        }).style({
                                            'fill': 'none',
                                            'stroke': 'black'
                                        });

                                };
                            }
                        }
                    },
                    {
                        key: 'box',
                        values: {
                            blueprint: plotviz.BoxWhiskerViewer
                        }
                    },
                    {
                        key: 'axis',
                        values: {
                            blueprint: plotviz.AxisPanel
                        }
                    }
                ],
                rootPanel: {
                    type: 'horizontal',
                    width: 1,
                    height: 1,
                    panels: [{
                        type: 'vertical',
                        width: 0.25,
                        height: 1,
                        panels: [{
                            referenceConfig: 'axisLeft',
                            referenceData: 'axisLeft',
                            referenceType: 'axis',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        },
                        {
                            referenceType: 'border',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        }]
                    },
                    {
                        type: 'vertical',
                        width: 0.75,
                        height: 1,
                        panels: [{
                            referenceConfig: 'box',
                            referenceData: 'box',
                            referenceType: 'box',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        },
                        {
                            referenceConfig: 'axisBottom',
                            referenceData: 'axisBottom',
                            referenceType: 'axis',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        }]
                    }]
                }
            };
        }

        this.render = render;
        this.container = container;
        this.builtInTransform = builtInTransform;
        this.sortingFunction = sortingFunction;
        this.callback = callback;
    }

    plotviz.GtexLineplot = GtexLineplot;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function GtexMixplot (div, config) {
        config = config || {};
        var width = config.width || 1000;
        var height = config.height || 400;
        var _svg = d3.select(div).append('svg').attr({
                width: width,
                height: height
            });
        var layout = new plotviz.LayoutManager(_svg);
        layout.render(generateLayout(), {width:width, height:height});

        var shadowLayout = new plotviz.LayoutManager(_svg);
        shadowLayout.render(generateLayout(), {width:width, height:height});

        var _lineViewer = new plotviz.LineViewer(layout.getPanel('lineViewer'));
        var _boxViewer = new plotviz.BoxWhiskerViewer(layout.getPanel('boxViewer'));
        var _lineAxis = new plotviz.AxisPanel(layout.getPanel('lineAxis'));
        var _boxAxis = new plotviz.AxisPanel(layout.getPanel('boxAxis'));
        var _bottomAxis = new plotviz.AxisPanel(layout.getPanel('bottomAxis'), 'bottomAxis');
        var _legend = new plotviz.Legend(layout.getPanel('legend'));
        var _title = new plotviz.TextPanel(layout.getPanel('title'));
        var _title2 = new plotviz.TextPanel(layout.getPanel('title2'));


        var viewAreaDimensions = getPanelDimensions('viewArea');
        // var _crosshair = new plotviz.Crosshair(shadowLayout.getPanel('viewArea'),
        //                                     'mixPlotCrosshair',
        //                                     {
        //                                         x:0,
        //                                         y:0,
        //                                         height: viewAreaDimensions.height,
        //                                         width: viewAreaDimensions.width
        //                                     });

        function getPanelDimensions (key) {
            return layout.getPanelDimensions(key);
        }

        function callback (func) {
            _boxViewer.callback(func);
            _bottomAxis.callback(func);
            _legend.callback(func);
        }

        function sortingFunctions (f) {
            _lineViewer.sortingFunction(f.lines);
            _boxViewer.sortingFunctions(f.boxes);
        }

        function transformLineInput (raw, f) {
            return raw.map(function (point) {
                    return {
                            label: point.label,
                            key: point.key,
                            value: f(point.value)
                        };
                });
        }

        function transformBoxInput (raw, f) {
            return raw.map(function (point) {
                    return {
                            highWhisker: f(point.highWhisker),
                            q3: f(point.q3),
                            median: f(point.median),
                            q1: f(point.q1),
                            lowWhisker: f(point.lowWhisker),
                            color: point.color,
                            outliers: point.outliers.map(function (outlier) {
                                    return f(outlier);
                                }),
                            extra: point.extra
                        };
                });
        }

        function builtInLineTransform (data, config) {
            var dataCopy = JSON.parse(JSON.stringify(data));
            if ('log' === config.scale) {
                dataCopy = transformLineInput(dataCopy, function (x) { return Math.log(x + 0.05) / Math.LN10; });
            }
            return dataCopy;
        }

        function builtInBoxTransform (data, config) {
            var dataCopy = JSON.parse(JSON.stringify(data));
            if ('log' === config.scale) {
                dataCopy = transformBoxInput(dataCopy, function (x) { return Math.log(x + 0.05) / Math.LN10; });
            }
            return dataCopy;
        }

        function container () {
            return _svg;
        }

        function render (data, config) {

            function extractLineLabels (points) {
                return d3.set(points.map(function (point) {
                    return point.label;
                })).values();
            }

            function extractKeys (points) {
                return d3.set(points.map(function (point) {
                    return point.key;
                })).values();
            }

            function filterPointsByLabel (points, label) {
                return points.filter(function (point) { return label === point.label; });
            }

            function filterPointsByKey (points, key) {
                return points.filter(function (point) { return key === point.key; });
            }

            function maxLineValue (points, label) {
                return Math.max.apply(null, filterPointsByLabel(points, label).map(function (point) { return point.value; }));
            }

            data = {
                lines: builtInLineTransform(data.lines, config.lines),
                boxes: builtInBoxTransform(data.boxes, config.boxes)
            };

            var newWidth = config.lines.width || width;
            var newHeight = config.lines.height || height;

            _svg.attr({
                'width': newWidth,
                'height': newHeight
            });

            layout.render(generateLayout(), {width:newWidth, height:newHeight});


            var lineViewerDimensions = layout.getPanelDimensions('lineViewer');
            var lineConfig = {
                    width: lineViewerDimensions.width,
                    height: lineViewerDimensions.height,
                    classes: config.lines.classMap,
                    colors: config.lines.lineColors ? config.lines.lineColors : null
                };

            _lineViewer.render(data.lines, lineConfig);

            var boxViewerDimensions = layout.getPanelDimensions('boxViewer');
            var boxConfig = {
                    width: boxViewerDimensions.width,
                    height: boxViewerDimensions.height,
                    outlierClass: config.boxes.outlierClass,
                    whiskerClass: config.boxes.whiskerClass,
                    boxClass: config.boxes.boxClass,
                    rectClass: config.boxes.rectClass
                };

            _boxViewer.render(data.boxes, boxConfig);

            var lineAxisData = {
                    orientation: 'left',
                    label: config.lines.leftAxisLabel || 'TPM'
                },
                boxAxisData = {
                    orientation: 'left',
                    label: config.boxes.leftAxisLabel || 'TPM'
                },
                bottomAxisData = {
                    orientation: 'bottom',
                    label: ''
                };
            var lineAxisDimensions = layout.getPanelDimensions('lineAxis');
            var boxAxisDimensions = layout.getPanelDimensions('boxAxis');
            var lineAxisConfig = {
                width: lineAxisDimensions.width,
                height: lineAxisDimensions.height,
                labelX: 0.5,
                labelY: 0.5,
                labelRotation: 90,
                axis: _lineViewer.generateYAxis(data.lines, {height:lineViewerDimensions.height})
            };
            var boxAxisConfig = {
                width: boxAxisDimensions.width,
                height: boxAxisDimensions.height,
                labelX: 0.5,
                labelY: 0.5,
                labelRotation: 90,
                axis: _boxViewer.generateYAxis(data.boxes, {height:boxViewerDimensions.height})
            };
            _lineAxis.render(lineAxisData, lineAxisConfig);
            _boxAxis.render(boxAxisData, boxAxisConfig);

            var bottomAxisDimensions = layout.getPanelDimensions('bottomAxis');
            var bottomAxisConfig = {
                width: bottomAxisDimensions.width,
                height: bottomAxisDimensions.height,
                axisX: 0,
                axisY: 0,
                tickAlign: 'end',
                tickTranslate: -10,
                tickRotation: -45,
                axis: _lineViewer.generateXAxis(data.lines, {width:lineViewerDimensions.width})
            };

            _bottomAxis.render(bottomAxisData, bottomAxisConfig);

            var legendDimensions = layout.getPanelDimensions('legend');
            var legendConfig = {
                width: legendDimensions.width,
                height: legendDimensions.height,
            };
            var legendData = d3.set(data.lines.map(function (line) {return line.label;})).values().map(function (label) {
                return {
                    label: label,
                    color: config.lines.legendColors ? config.lines.legendColors[label] : null
                };
            });

            legendData.sort(function (labelA, labelB) {
                return maxLineValue(data.lines, labelB.label) - maxLineValue(data.lines, labelA.label);
            });

            _legend.render(legendData, legendConfig);

            var titleDimensions = layout.getPanelDimensions('title');
            var titleConfig = {
                width: titleDimensions.width,
                height: titleDimensions.height,
                x: 0.5,
                y: 0.5,
                'class': config.lines.titleClass
            };

            _title.render({content: config.lines.titleContent}, titleConfig);

            var title2Dimensions = layout.getPanelDimensions('title');
            var title2Config = {
                width: title2Dimensions.width,
                height: title2Dimensions.height,
                x: 0.5,
                y: 0.5,
                'class': config.lines.title2Class
            };

            _title2.render({content: config.lines.title2Content}, title2Config);

        }

        function generateLayout (data, config) {
            return {
                type: 'vertical',
                width: 1,
                height: 1,
                panels: [{
                    type: 'horizontal',
                    width: 1,
                    height: 0.1,
                    panels:[{
                        type: 'leaf',
                        width: 0.15,
                        height: 1
                    },
                    {
                        name: 'title',
                        type: 'leaf',
                        width: 0.65,
                        height: 1
                    },
                    {
                        type: 'leaf',
                        width: 0.2,
                        height: 1
                    }]
                },
                {
                    type: 'horizontal',
                    width: 1,
                    height: 0.9,
                    panels: [{
                        type: 'vertical',
                        width: 0.15,
                        height: 1,
                        panels: [{
                            name: 'lineAxis',
                            type: 'leaf',
                            width: 1,
                            height: 0.240
                        },
                        {
                            type: 'leaf',
                            width: 1,
                            height: 0.07
                        },
                        {
                            name: 'boxAxis',
                            type: 'leaf',
                            width: 1,
                            height: 0.240
                        },
                        {
                            referenceType: 'border',
                            type: 'leaf',
                            width: 1,
                            height: 0.45
                        }]
                    },
                    {
                        type: 'vertical',
                        name: 'viewArea',
                        width: 0.65,
                        height: 1,
                        panels: [{
                            name: 'lineViewer',
                            type: 'leaf',
                            width: 1,
                            height: 0.240
                        },
                        {
                            name: 'title2',
                            type: 'leaf',
                            width: 1,
                            height: 0.07
                        },
                        {
                            name: 'boxViewer',
                            type: 'leaf',
                            width: 1,
                            height: 0.240
                        },
                        {
                            name: 'bottomAxis',
                            type: 'leaf',
                            width: 1,
                            height: 0.25
                        },
                        {
                            type: 'leaf',
                            width: 1,
                            height: 0.2
                        }]
                    },
                    {
                        type: 'vertical',
                        width: 0.2,
                        height: 1,
                        panels: [{
                            name: 'legend',
                            type: 'leaf',
                            width: 1,
                            height: 0.3
                        },
                        {
                            type: 'leaf',
                            width: 1,
                            height: 0.7
                        }]
                    }]
            }]
        };
        }

        function oldLayout (data, config) {
            return {
                type: 'root',
                width: 1000,
                height: 400,
                data: [{
                    key: 'box',
                    values: {
                        data: data.boxData
                    }
                },
                {
                    key: 'axisLeft',
                    values: {
                        data: data.lineAxisData
                    }
                },
                {
                    key: 'axisBottom',
                    values: {
                        data: data.bottomAxisData
                    }
                }],
                config: [{
                    key: 'box',
                    values: {
                        config: {'outliers' : 'on'}
                    }
                },
                {
                    key: 'axisLeft',
                    values: {
                        config: {
                            labelX: 0.5,
                            labelY: 0.5,
                            labelRotation: 90
                        }
                    }
                },
                {
                    key: 'axisBottom',
                    values: {
                        config: {
                            axisX: 0,
                            axisY: 0,
                            tickAlign: 'end',
                            tickTranslate: -10,
                            tickRotation: -45
                        }
                    }
                }],
                panelTypes: [
                    {
                        key: 'border',
                        values: {
                            blueprint: function (container) {
                                var _panel = container;
                                _panel.append('rect').attr('class', 'border');
                                this.render = function (data, config) {
                                    _panel.select('.border')
                                        .attr({
                                            'width': config.width,
                                            'height': config.height
                                        }).style({
                                            'fill': 'none',
                                            'stroke': 'black'
                                        });

                                };
                            }
                        }
                    },
                    {
                        key: 'box',
                        values: {
                            blueprint: plotviz.BoxWhiskerViewer
                        }
                    },
                    {
                        key: 'axis',
                        values: {
                            blueprint: plotviz.AxisPanel
                        }
                    }
                ],
                rootPanel: {
                    type: 'horizontal',
                    width: 1,
                    height: 1,
                    panels: [{
                        type: 'vertical',
                        width: 0.25,
                        height: 1,
                        panels: [{
                            referenceConfig: 'axisLeft',
                            referenceData: 'axisLeft',
                            referenceType: 'axis',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        },
                        {
                            referenceType: 'border',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        }]
                    },
                    {
                        type: 'vertical',
                        width: 0.75,
                        height: 1,
                        panels: [{
                            referenceConfig: 'box',
                            referenceData: 'box',
                            referenceType: 'box',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        },
                        {
                            referenceConfig: 'axisBottom',
                            referenceData: 'axisBottom',
                            referenceType: 'axis',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        }]
                    }]
                }
            };
        }

        this.render = render;
        this.container = container;
        this.builtInLineTransform = builtInLineTransform;
        this.builtInBoxTransform = builtInBoxTransform;
        this.sortingFunctions = sortingFunctions;
        this.callback = callback;
        this.getPanelDimensions = getPanelDimensions;
    }

    plotviz.GtexMixplot = GtexMixplot;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function EqtlPlot (div, url, config) {
        var controls;
        var _url = url;

        config = config || {};
        var _config = {
            'scale': 'linear',
            'points': 'on',
            'medians': 'all',
            'titleClass': 'title',
            'tickTranslate': 10,
            'tickRotation': 0,
            'tickAlign': 'middle',
            'leftAxisLabel': config.leftAxisLabel || 'Rank Normalized Gene Expression',
            'bottomAxisLabel': config.bottomAxisLabel || '',
            'outlierJitter': 0.25,
            'width': config.width || 850,
            'height': config.height || 800,
            'margin': config.margin || {
                                            'left': 20,
                                            'top': 20,
                                            'right': 20,
                                            'bottom': 20
                                        },
            'buttons': config.buttons || true
        };
        var _eqtl;
        var _buttonReference;
        var _buttonStates;
        var margin = _config.margin;


        var _tooltipFunction = null;
        var totalWidth = config.width || 1000;
        var totalHeight = config.height || 400;
        var width = totalWidth - margin.left - margin.right;
        var height = totalHeight - margin.top - margin.bottom;
        generateButtons(div, config);
        var _svgContainer = d3.select(div).append('div').attr('class', 'svg-div').append('svg').attr({
                width: totalWidth,
                height: totalHeight
            });
        var _svg = _svgContainer.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var layout = new plotviz.LayoutManager(_svg);
        layout.render(generateLayout(config), {width:width, height:height});

        var _viewer = new plotviz.BoxWhiskerViewer(layout.getPanel('boxViewer'));
        var _leftAxis = new plotviz.AxisPanel(layout.getPanel('leftAxis'));
        var _bottomAxis = new plotviz.AxisPanel(layout.getPanel('bottomAxis'), 'bottomAxis');
        var _title = new plotviz.TextPanel(layout.getPanel('title'));


        function query (snpId, geneId, tissue, geneSymbol, config) {
            var url = _url + '?variantId=' + snpId + '&gencodeId=' + geneId + '&tissueSiteDetailId=' + tissue;

            var oReq = new XMLHttpRequest();

            // TODO: Is this the conanical way? To check for truthyness
            //      instead of being undefined instead of an object?
            config = config || {};

            oReq.open('GET', url);

            oReq.onload = function (event) {
                var status = oReq.status;
                var response = oReq.responseText;

                _eqtl = dataToData(JSON.parse(response));
                _config.titleContent = config.titleContent || (tissue + ' eQTL ' + snpId + ' ' + geneId);
                _config.width = config.width || _config.width;
                _config.height = config.height || _config.height;
                _config.leftAxisWidth = config.leftAxisWidth || 0.1;
                render(_eqtl, config);
            };

            oReq.onerror = function (error) {

            };

            oReq.send();
        }

        function generateButtonBoxStates(config) {
            var points = 1,
                medians = 1;

            return [points,
                    medians];
        }

        function generateButtonStates(config) {
            return [
                _config.points === 'on' ? [1,0] : [0,1],
                _config.medians === 'all' ? [1,0] : [0,1]
            ];
        }

        function setButtonState (states, buttonBoxStates) {
            var counter = 0;
            var flattened = flatten(states);
            _buttonReference.selectAll('.button-options')
              .selectAll('div')
                .attr('class', function (d, index) {
                    return d.class + (flattened[counter++] ? ' btn-active' : ' btn-inactive');
                });

            counter = 0;
            flattened = flatten(buttonBoxStates);

            _buttonReference
                .style('display', function (d, index) {
                    return flattened[counter++] ? 'block' : 'none';
                });

            function flatten (arr) {
                if ('object' === typeof arr) {
                    return arr.map(flatten).reduce(function (a,b) {return a.concat(b);});
                } else {
                    return [arr];
                }
            }
        }

        function dataToData (raw) {
            var HET = 1;
            var HOMO_REF = 0;
            var HOMO_ALT = 2;
            var mappingKey = raw.genotypes;
            var mappingValues = raw.data;

            var het_outliers = mappingValues.filter(function (expressionValue, index) { return HET === mappingKey[index]; });
            var homo_ref_outliers = mappingValues.filter(function (expressionValue, index) { return HOMO_REF === mappingKey[index]; });
            var homo_alt_outliers = mappingValues.filter(function (expressionValue, index) { return HOMO_ALT === mappingKey[index]; });

            var boxplots = [];

            if (raw.boxplots.homoRef.numSamples > 5) {
                boxplots.push({
                    highWhisker: raw.boxplots.homoRef.upperLimit,
                    q3: raw.boxplots.homoRef.q3,
                    median: raw.boxplots.homoRef.median,
                    q1: raw.boxplots.homoRef.q1,
                    lowWhisker: raw.boxplots.homoRef.lowerLimit,
                    outliers: homo_ref_outliers,
                    color: 'rgb(142, 149, 222)',
                    extra: {
                        groupName: 'Homo Ref <br/> N = ' + raw.boxplots.homoRef.numSamples
                    }
                })
            } else {
                boxplots.push({
                    highWhisker: false,
                    q3: false,
                    median: false,
                    q1: false,
                    lowWhisker: false,
                    outliers: raw.boxplots.homoRef.outliers,
                    color: 'rgb(142, 149, 222)',
                    noData: true,
                    extra: {
                        groupName: 'Homo Ref <br/> N = ' + raw.boxplots.homoRef.numSamples
                    }
                });
            }

            if (raw.boxplots.het.numSamples > 5) {
                boxplots.push({
                    highWhisker: raw.boxplots.het.upperLimit,
                    q3: raw.boxplots.het.q3,
                    median: raw.boxplots.het.median,
                    q1: raw.boxplots.het.q1,
                    lowWhisker: raw.boxplots.het.lowerLimit,
                    outliers: het_outliers,
                    color: 'rgb(142, 149, 222)',
                    extra: {
                        groupName: 'Het <br/> N = ' + raw.boxplots.het.numSamples
                    }
                });
            } else {
                boxplots.push({
                    highWhisker: false,
                    q3: false,
                    median: false,
                    q1: false,
                    lowWhisker: false,
                    outliers: raw.boxplots.het.outliers,
                    color: 'rgb(142, 149, 222)',
                    noData: true,
                    extra: {
                        groupName: 'Het <br/> N = ' + raw.boxplots.het.numSamples
                    }
                });
            }

            if (raw.boxplots.homoAlt.numSamples > 5) {
                boxplots.push({
                    highWhisker: raw.boxplots.homoAlt.upperLimit,
                    q3: raw.boxplots.homoAlt.q3,
                    median: raw.boxplots.homoAlt.median,
                    q1: raw.boxplots.homoAlt.q1,
                    lowWhisker: raw.boxplots.homoAlt.lowerLimit,
                    outliers: homo_alt_outliers,
                    color: 'rgb(142, 149, 222)',
                    extra: {
                        groupName: 'Homo Alt <br/> N = ' + raw.boxplots.homoAlt.numSamples
                    }
                });
            } else {
                boxplots.push({
                    highWhisker: false,
                    q3: false,
                    median: false,
                    q1: false,
                    lowWhisker: false,
                    outliers: raw.boxplots.homoAlt.outliers,
                    color: 'rgb(142, 149, 222)',
                    noData: true,
                    extra: {
                        groupName: 'Homo Alt <br/> N = ' + raw.boxplots.homoAlt.numSamples
                    }
                })

            }

            return boxplots;
        }

        function generateButtons (div, config) {
            controls = d3.select(div).append('div');
            controls.attr({
                    'id': 'control-div',
                    'class': 'control-class'
                })
                .style('display', config.buttons ? '' : 'none');

            var buttonData = [{
                    title: 'Data Points',
                    buttons: [{
                            text: 'On',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                _config.points = 'on';
                                _config.outlierClass = 'outliers-on';
                                render(_eqtl, _config);
                            }
                        },
                        {
                            text: 'Off',
                            'class': 'button btn-right',
                            action: function () {
                                _config.points = 'off';
                                _config.outlierClass = 'outliers-off';
                                render(_eqtl, _config);
                            }
                        }]
                },
                {
                    title: 'Medians',
                    buttons: [{
                            text: 'All',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                _config.medians = 'all';
                                _config.whiskerClass = 'whiskers-on';
                                _config.rectClass = 'rects-on';
                                render(_eqtl, _config);
                            }
                        },
                        {
                            text: 'Only',
                            'class': 'button btn-right',
                            action: function () {
                                _config.medians = 'only';
                                _config.whiskerClass = 'whiskers-off';
                                _config.rectClass = 'rects-off';
                                render(_eqtl, _config);
                            }
                        }]
                }];

            var boxes = controls.selectAll('div')
                .data(buttonData)
              .enter().append('div')
                .attr({
                        'class': 'button-box button-box-first button-box-last'
                    });

            boxes.append('div')
                .attr('class', 'button-box-title')
                .text(function (d) { return d.title; });

            boxes.append('div')
                .attr('class', 'button-options')
              .selectAll('div')
                .data(function (d) { return d.buttons; })
              .enter().append('div')
                .attr('class', function (d) { return d.class + ' ' + (d.active ? 'btn-active' : 'btn-inactive'); })
                .attr('data-toggle', function (d) { return d['data-toggle'] || null; })
                .attr('data-target', function (d) { return d['data-target'] || null; })
                .text(function (d) { return d.text; })
                .on('click', function (d) {
                    if (d.action) {
                        d.action();
                    }
                });

            _buttonReference = boxes;
        }

        function getPanelDimensions (key) {
            return layout.getPanelDimensions(key);
        }

        function callback (func) {
            _viewer.callback(func);
            _bottomAxis.callback(func);
        }

        function transformInput (data, f) {
            return data.map(function (box) {
                    return {
                        highWhisker: f(box.highWhisker),
                        q3: f(box.q3),
                        median: f(box.median),
                        q1: f(box.q1),
                        lowWhisker: f(box.lowWhisker),
                        outliers: box.outliers.map(f),
                        color: box.color,
                        extra: box.extra
                    };
                });
        }

        function container () { return _svgContainer; }

        function render (data, config) {

            function boxMax (box) {
                return box.highWhisker || box.q3 || box.median || box.q1 || box.lowWhisker;
            }

            function boxesMax (boxes) {
                return Math.max.apply(null, boxes.map(function (box) {return boxMax(box);}));
            }

            function boxMin (box) {
                return box.lowWhisker || box.q1 || box.median || box.q3 || box.highWhisker;
            }

            function boxesMin (boxes) {
                return Math.min.apply(null, boxes.map(function (box) {return boxMin(box);}));
            }

            Object.keys(config).forEach(function (key) {
                _config[key] = config[key];
            });

            var margin = config.margin || _config.margin;

            var totalWidth = config.width || _config.width;
            var totalHeight = config.height || _config.height;

            var width = totalWidth - margin.left - margin.right;
            var height = totalHeight - margin.top - margin.bottom;

            _svgContainer.attr({
                'width': totalWidth,
                'height': totalHeight
            });

            _svg.attr({
                'transform': 'translate(' + margin.left + ',' + margin.top + ')'
            });

            layout.render(generateLayout(config), {width:width - 2, height:height});

            var boxViewerDimensions = layout.getPanelDimensions('boxViewer');

            var boxConfig = {
                    width: boxViewerDimensions.width,
                    height: boxViewerDimensions.height,
                    outlierClass: config.outlierClass || 'outliers-on',
                    whiskerClass: config.whiskerClass || 'whiskers-on',
                    boxClass: config.boxClass || 'box',
                    rectClass: config.rectClass || 'rects-on',
                    outlierJitter: config.outlierJitter || 0
                };

            _viewer.render(data, boxConfig);

            var leftAxisData = {
                    orientation: 'left',
                    label: config.leftAxisLabel || 'TPM'
                },
                bottomAxisData = {
                    orientation: 'bottom',
                    label: config.bottomAxisLabel || ''
                };
            var leftAxisDimensions = layout.getPanelDimensions('leftAxis');
            var leftAxisConfig = {
                axisClass: 'left-axis',
                width: leftAxisDimensions.width,
                height: leftAxisDimensions.height,
                labelX: config.leftLabelX || 0.5,
                labelY: config.leftLabelY || 0.5,
                labelRotation: 90,
                axis: _viewer.generateYAxis(data, {height:boxConfig.height})
            };
            _leftAxis.render(leftAxisData, leftAxisConfig);

            var bottomAxisDimensions = layout.getPanelDimensions('bottomAxis');
            var bottomAxisConfig = {
                axisClass: 'bottom-axis',
                width: bottomAxisDimensions.width,
                height: bottomAxisDimensions.height,
                axisX: 0,
                axisY: 0,
                tickAlign: config.tickAlign || 'end',
                tickTranslate: config.tickTranslate === 0 ? 0 : (config.tickTranslate || -10),
                tickRotation: config.tickRotation === 0 ? 0 : (config.tickRotation || -45),
                axis: _viewer.generateXAxis(data, {width:boxConfig.width})
            };

            _bottomAxis.render(bottomAxisData, bottomAxisConfig);

            var titleDimensions = layout.getPanelDimensions('title');
            var titleConfig = {
                width: titleDimensions.width,
                height: titleDimensions.height,
                x: config.titleX || 0.5,
                y: config.titleY || 0.5,
                'class': 'title'
            };

            _title.render({content: config.titleContent}, titleConfig);
            setButtonState(generateButtonStates(config), generateButtonBoxStates(config));
        }

        function generateLayout (config) {
            return {
                type: 'vertical',
                width: 1,
                height: 1,
                panels: [
                {
                    type: 'horizontal',
                    width: 1,
                    height: 0.1,
                    panels: [{
                        type: 'leaf',
                        width: config.viewerLeftSpacing || 0.1,
                        height: 1
                    },
                    {
                        name: 'title',
                        type: 'leaf',
                        width: 1 - (config.viewerLeftSpacing || 0.9),
                        height: 1
                    }]
                },
                {
                    type: 'horizontal',
                    width: 1,
                    height: 0.9,
                    panels: [{
                        type: 'vertical',
                        width: config.viewerLeftSpacing || 0.1,
                        height: 1,
                        panels: [{
                            name: 'leftAxis',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        },
                        {
                            referenceType: 'border',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        }]
                    },
                    {
                        type: 'vertical',
                        width: 1 - (config.viewerLeftSpacing || 0.1),
                        height: 1,
                        panels: [{
                            name: 'boxViewer',
                            type: 'leaf',
                            width: 1,
                            height: 1 - (config.viewerBottomSpacing || 0.45)
                        },
                        {
                            name: 'bottomAxis',
                            type: 'leaf',
                            width: 1,
                            height: 5 * (config.viewerBottomSpacing || 0.45) / 9
                        },
                        {
                            type: 'leaf',
                            width: 1,
                            height: 4 * (config.viewerBottomSpacing || 0.45) / 9
                        }]
                    }]
            }]
            };
        }

        this.query = query;
        this.container = container;
        this.callback = callback;
        this.getPanelDimensions = getPanelDimensions;
    }

    plotviz.EqtlPlot = EqtlPlot;

    return plotviz;
}) (plotviz || {});
/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function GtexPlot (outerDiv, geneExpUrl, isoformExpUrl, idColorMap, idNameMap) {
        var _gene = null;
        var _boxplot = null;
        var _mixplot = null;
        var _tooltip = null;
        var _filter = null;
        var _queries = {};
        var _config = {
                'plot': 'gene',
                //'scale': 'log',
                'scale': 'linear',
                //'leftAxisLabel': 'Log10(RPKM)',
                'leftAxisLabel': 'TPM',
                'sortState': 'alphabetical',
                'outlierClass': 'outliers-on',
                'whiskerClass': 'whiskers-on',
                'rectClass': 'rects-on',
                'titleClass': 'gtex-title',
                'title2Class': 'gtex-title',
                'controlClass': 'gtex-control',
                'sort': {
                        'outer': function (groupA, groupB) {
                                if (groupA.key < groupB.key) {
                                    return -1;
                                }
                                if (groupB.key < groupA.key) {
                                    return 1;
                                }
                                return 0;
                            },
                        'inner': function (boxA, boxB) {
                                return 0;
                            }
                    }
            };
        var _geneData;
        var _isoformData;
        var _femaleGeneData;
        var _maleGeneData;

        var _buttonReference;
        var _bottonStates;

        var width = 1150;
        var height = 800;

        var div = d3.select(outerDiv).append('div')
            .attr('class', 'gtex-outer-div')
            .node();

        addModal(div);

        generateButtons (div, _config);

        _boxplot = new plotviz.GtexBoxplot(div, {width: width, height: height});
        _mixplot = new plotviz.GtexMixplot(div, {width: width, height: height});
        _tooltip = new plotviz.Tooltip(div);


        var modalDiv = d3.select('#gtex-plot-modal .modal-body').node();
        //_filter = new plotviz.Filter(div);
        _filter = new plotviz.Filter(modalDiv);

        _mixplot.container().style('display', 'none');

        _boxplot.callback(boxplotCallback);
        _mixplot.callback(mixplotCallback);

        $(window).on('resize', function () {
            var width = $(outerDiv).width();
            var height = 800;
            var isoform;

            _config.width = width;
            _config.height = height;
            if ('gene' === _config.plot) {
                renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
            }

            if ('isoform' === _config.plot) {
                isoform = _config.isoformBoxes ||
                    extractGroups(_isoformData).map(function (isoform) {
                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                        }).sort(function (isoformA, isoformB) {
                            return isoformB[0] - isoformA[0];
                        })[0][1];

                renderMixplot({
                    lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                    boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                },
                {
                    lines: _config,
                    boxes: _config
                });
            }

            if ('singleTissue' === _config.plot) {
                renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
            }

            if ('sex' === _config.plot) {
                renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
            }

            if ('relative' === _config.plot) {
                isoform = _config.isoformBoxes ||
                    extractGroups(_isoformData).map(function (isoform) {
                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                        }).sort(function (isoformA, isoformB) {
                            return isoformB[0] - isoformA[0];
                        })[0][1];

                renderMixplot({
                    lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                    boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                },
                {
                    lines: _config,
                    boxes: _config
                });
            }


        });

        function generateMixplotSort (config) {
            var sort = {};
            if (config.sortState === 'alphabetical') {
                if ('isoform' === config.plot) {
                    sort.lines = function (keyDatumA, keyDatumB) {
                        if (keyDatumA.key < keyDatumB.key) {
                            return -1;
                        }
                        if (keyDatumB.key < keyDatumA.key) {
                            return 1;
                        }
                        return 0;
                    };

                    sort.boxes = {};
                    sort.boxes.outer = ABCKeySort;
                    sort.boxes.inner = innerPreserveSort;
                }
                if ('relative' === _config.plot) {
                    sort.lines = function (keyDatumA, keyDatumB) {
                        if (keyDatumA.key < keyDatumB.key) {
                            return -1;
                        }
                        if (keyDatumB.key < keyDatumA.key) {
                            return 1;
                        }
                        return 0;
                    };
                    sort.boxes = {};
                    sort.boxes.outer = ABCKeySort;
                    sort.boxes.inner = innerPreserveSort;
                }
            }

            if (config.sortState === 'increasing') {
                // Both isoform state and relative state return same values
                sort.lines = function (keyDatumA, keyDatumB) {
                    return keyDatumSum(keyDatumA) - keyDatumSum(keyDatumB);
                    function keyDatumSum (keyDatum) {
                        return keyDatum.values.map(function (point) { return point.value; }).reduce(function (pointValueA, pointValueB) { return pointValueA + pointValueB; });
                    }
                };
                sort.boxes = {};
                sort.boxes.outer = outerIncreasingSort;
                sort.boxes.inner = innerIncreasingSort;
            }

            if (config.sortState === 'decreasing') {
                // Both isoform state and relative state return same values
                sort.lines = function (keyDatumA, keyDatumB) {
                    return keyDatumSum(keyDatumB) - keyDatumSum(keyDatumA);
                    function keyDatumSum (keyDatum) {
                        return keyDatum.values.map(function (point) { return point.value; }).reduce(function (pointValueA, pointValueB) { return pointValueA + pointValueB; });
                    }
                };

                sort.boxes = {};
                sort.boxes.outer = outerDecreasingSort;
                sort.boxes.inner = innerDecreasingSort;
            }

            return sort;
        }

        function mixplotCallback (input) {
            var isoform;
            if ('click' === input.type) {
                if ('bottomAxis' === input.id) {
                    var tissue = input.data;
                    var boxes = filterBySingleTissue(_isoformData, tissue);

                    _boxplot.container().style('display', '');
                    _boxplot.callback(mixplotCallbackIsoforms);
                    _mixplot.container().style('display', 'none');
                    _config.plot = 'singleTissue';
                    _config.singleTissue = tissue;
                    renderBoxplot(boxes, _config);
                }
            }
            if ('mousemove' === input.type) {
                if ('boxViewer' === input.subtype) {
                    var dimensions = _mixplot.getPanelDimensions('boxViewer');
                    _tooltip.text(generateTooltipText(input));
                    _tooltip.move(dimensions.x + input.x + 20, dimensions.y + input.y + 20);
                    _tooltip.show();
                }
                if ('legend' === input.subtype) {
                    if ('box' === input.component) {
                        _config.isoformBoxes = input.data.label;
                        _config.title2Content = _gene + ' ' + input.data.label + ' Gene Expression';
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, _config.isoformBoxes)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                    if ('text' === input.component) {
                        _config.isoformBoxes = input.data.label;
                        _config.title2Content = _gene + ' ' + input.data.label + ' Gene Expression';
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, _config.isoformBoxes)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                }
                if ('legend' === input.subtype) {
                    var emphasis;
                    if ('box' === input.component) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                        emphasis = input.data.label;
                        _config.classMap = {};
                        _config.classMap[emphasis] = 'emphasis';
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                    if ('text' === input.component) {
                        //TODO: Does this work?
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                        emphasis = input.data.label;
                        _config.classMap = {};
                        _config.classMap[emphasis] = 'emphasis';
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                }
            }
            if ('mouseout' === input.type) {
                _tooltip.hide();
                if ('legend' === input.subtype) {
                    if ('box' === input.component) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                        _config.classMap = {};
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                    if ('text' === input.component) {
                        //TODO: Does this work?
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                        _config.classMap = {};
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                }
            }
            function generateTooltipText (input) {
                return (input.data.extra.sex ? 'Sex: ' + input.data.extra.sex + '<br/>': '') + input.data.extra.groupName + '<br/>Median TPM: ' + input.data.extra.originalMedian.toFixed(3) + '<br/>Number of Samples: ' + input.data.extra.numSamples;
            }
        }

        function mixplotCallbackIsoforms (input) {
            if ('click' === input.type) {
                if ('bottomAxis' === input.id) {
                    var isoform = input.data;

                    _boxplot.container().style('display', 'none');
                    _mixplot.container().style('display', '');
                    _config.plot = 'isoform';
                    renderMixplot({
                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, input.data)), _filter.selected())
                    },
                    {
                        lines: _config,
                        boxes: _config
                    });
                }
            }

            if ('mousemove' === input.type) {
                var dimensions = _boxplot.getPanelDimensions('boxViewer');
                _tooltip.text(generateTooltipText (input));
                _tooltip.move(dimensions.x + input.x + 20, dimensions.y + input.y + 20);
                _tooltip.show();
            }
            if ('mouseout' === input.type) {
                _tooltip.hide();
            }

            function generateTooltipText (input) {
                return (input.data.extra.sex ? 'Sex: ' + input.data.extra.sex + '<br/>': '') + input.data.extra.groupName + '<br/>Number of Samples: ' + input.data.extra.numSamples;
            }
        }

        function boxplotCallback (input) {
            if ('mousemove' === input.type) {
                if (input.subtype && 'boxViewer' === input.subtype) {
                    var dimensions = _boxplot.getPanelDimensions('boxViewer');
                    _tooltip.text(generateTooltipText(input));
                    _tooltip.move(dimensions.x + input.x + 20, dimensions.y + input.y + 20);
                    _tooltip.show();
                }
            }
            if ('mouseout' === input.type) {
                _tooltip.hide();
            }

            function generateTooltipText (input) {
                return (input.data.extra.sex ? 'Sex: ' + input.data.extra.sex + '<br/>': '') + input.data.extra.groupName + '<br/>Median TPM: ' + input.data.extra.originalMedian.toFixed(3) + '<br/>Number of Samples: ' + input.data.extra.numSamples;
            }
        }

        function renderBoxplot (boxes, config) {
            setButtonState(generateButtonStates(config), generateButtonBoxStates(config));

            if (config.sort) {
                _boxplot.sortingFunctions(config.sort);
            }

            _boxplot.render({
                    boxes: boxes
                },
                {
                    boxes: config
                });
        }

        function renderMixplot (mixes, config) {
            var trueConfig = JSON.parse(JSON.stringify(config));
            setButtonState(generateButtonStates(config.lines), generateButtonBoxStates(config.lines));

            // TODO: Figure out a better way than using _config in a closure
            _mixplot.sortingFunctions(generateMixplotSort(_config));

            if ('relative' === config.lines.plot) {
                trueConfig.lines.scale = 'linear';
            }

            _mixplot.render({
                    lines: mixes.lines,
                    boxes: mixes.boxes
                },
                {
                    lines: trueConfig.lines,
                    boxes: config.boxes
                });
        }

        function combineGeneDataAndColor (geneData, colors) {
            var newGeneData = JSON.parse(JSON.stringify(geneData));
            Object.keys(newGeneData).forEach(function (tissue) {
                    newGeneData[tissue].color = colors[tissue];
                });
            return newGeneData;
        }

        function combineIsoformDataAndColor (isoformData) {
            var colors = generateIsoformColors();
            var newIsoformData = JSON.parse(JSON.stringify(isoformData));

            _config.legendColors = {};
            _config.lineColors = {};

            sortIsoformData(newIsoformData).forEach(
                function (isoform, index) {
                    return Object.keys(newIsoformData[isoform]).forEach(function (tissue) {
                            newIsoformData[isoform][tissue].color = colors[index];
                            _config.legendColors[isoform] = colors[index];
                            _config.lineColors[isoform] = colors[index];
                        });
                });

            return newIsoformData;

            function sortIsoformData (isoformData) {
                return Object.keys(isoformData).map(function (isoform) {
                        return [maxIsoformValue (isoformData[isoform]),
                                isoform];
                    }).sort(function (isoformA, isoformB) {
                        return isoformB[0] - isoformA[0];
                    }).map(function (isoform) {
                        return isoform[1];
                    });
            }

            function maxIsoformValue (isoformTissueList) {
                return d3.max(
                    Object.keys(isoformTissueList).map(function (tissue) {
                        var entry = isoformTissueList[tissue];
                        return d3.max([entry.high_whisker,
                                entry.q3,
                                entry.median,
                                entry.q1,
                                entry.low_whisker]);
                    }));
            }
        }

        function normDataToData (normDataList) {
            return Object.keys(normDataList).map(function (tissue) {
                    return {
                            key: tissue,
                            values: normDataList[tissue]
                        };
                });
        }

        function geneDataToData (geneData, colors) {
            return normDataToData(combineGeneDataAndColor(geneData, colors)).map(
                    function (entry) {
                        return {
                                group: 'genetpm',
                                key: entry.key,
                                values: entry.values
                            };
                });
        }

        function topTenIsoformData (data) {
            var topTen = extractGroups(data).map(function (isoform) {
                return [maxValue(filterByGroup(data, isoform)), isoform];
            }).sort(function (isoformA, isoformB) {
                return isoformB[0] - isoformA[0];
            }).map(function (isoform) {
                return isoform[1];
            }).slice(0, 10);

            return data.filter(function (d) { return topTen.indexOf(d.group) > -1; });
        }

        function isoformDataToData (isoformData) {
            var newIsoformData = combineIsoformDataAndColor(isoformData);

            // TODO: Consider not making this completely default behavior
            return topTenIsoformData(Object.keys(newIsoformData).map(function (isoform) {
                    return normDataToData(newIsoformData[isoform]).map(
                        function (entry) {
                            return {
                                    group: isoform,
                                    key: entry.key,
                                    values: entry.values
                                };
                        });
                }).reduce(function (dataA, dataB) {
                    return dataA.concat(dataB);
                }));
        }

        function filterByGroup (data, group) {
            return data.filter(function (datum) {
                    return group === datum.group;
                });
        }

        function filterByKey (data, key) {
            return data.filter(function (datum) {
                    return key === datum.key;
                });
        }

        function filterBySingleTissue (isoformData, tissue) {
            return dataToGroupBoxes(filterByKey(isoformData, tissue));
        }

        function extractGroups (data) {
            return d3.set(data.map(function (datum) {
                    return datum.group;
                })).values();
        }

        function extractKeys (data) {
            return d3.set(data.map(function (datum) {
                    return datum.key;
                })).values();
        }

        function dataToPoints (data) {
            return data.map(function (datum) {
                    return {
                            label: datum.group,
                            key: datum.key,
                            value: datum.values.median
                        };
                });
        }

        function dataToRelativeData (data) {
            var totals = {};

            var keys = extractKeys(data);

            keys.forEach(function (key) {
                    totals[key] = 0;
                    filterByKey(data, key).forEach(function (datum) {
                            totals[key] += datum.values.median;
                        });
                });

            return data.map(function (datum) {
                    var values = JSON.parse(JSON.stringify(datum.values));
                    values.median = values.median / totals[datum.key];
                    return {
                            group: datum.group,
                            key: datum.key,
                            values: values
                        };
                });
        }

        function dataToBoxes (data, key) {
            return data.map(function (datum) {
                    var extra = datum.values.extra || {};
                    extra.groupName = datum[key];
                    extra.numSamples = datum.values.num_samples;
                    extra.originalMedian = datum.values.median;
                    return {
                            highWhisker: datum.values.high_whisker,
                            q3: datum.values.q3,
                            median: datum.values.median,
                            q1: datum.values.q1,
                            lowWhisker: datum.values.low_whisker,
                            outliers: datum.values.outliers,
                            color: datum.values.color,
                            extra: extra
                        };
                });
        }

        function dataToKeyBoxes (data) {
            return dataToBoxes(data, 'key');
        }

        function dataToGroupBoxes (data) {
            return dataToBoxes(data, 'group');
        }

        function maxValue (data) {
            return d3.max(data.map(function (datum) {
                    return datumMaxValue(datum);
                }));

            function datumMaxValue (datum) {
                return d3.max([datum.values.highWhisker,
                        datum.values.q3,
                        datum.values.median,
                        datum.values.q1,
                        datum.values.lowWhisker
                    ]);
            }
        }

        function minValue (data) {
            return d3.min(data.map(function (datum) {
                    return datumMinValue(datum);
                }));

            function datumMinValue (datum) {
                return d3.min([datum.values.highWhisker,
                        datum.values.q3,
                        datum.values.median,
                        datum.values.q1,
                        datum.values.lowWhisker
                    ]);
            }
        }


       function outerDecreasingSort (groupA, groupB) {
           return groupMedianSum(groupB) - groupMedianSum(groupA);

           function groupMedianSum (group) {
               return group.values.map(function (box) {
                   return box.median;
               }).reduce (function (a, b) {
                   return a + b;
               });
           }
       }

       function innerDecreasingSort (boxA, boxB) {
           return boxB.median - boxA.median;
       }

        function ABCKeySort (groupA, groupB) {
            if (groupA.key < groupB.key) {
                return -1;
            }
            if (groupB.key < groupA.key) {
                return 1;
            }
            return 0;
        }

        function innerPreserveSort (boxA, boxB) {
            return 0;
        }

       function outerIncreasingSort (groupA, groupB) {
           return groupMedianSum(groupA) - groupMedianSum(groupB);

           function groupMedianSum (group) {
               return group.values.map(function (box) {
                   return box.median;
               }).reduce (function (a, b) {
                   return a + b;
               });
           }
       }

       function innerIncreasingSort (boxA, boxB) {
           return boxA.median - boxB.median;
       }

        function filterBoxes (boxes, selection) {
            return boxes.filter(function (d) {return selection.indexOf(d.extra.groupName) > -1;});
        }
        function filterPoints (points, selection) {
            return points.filter(function (d){ return selection.indexOf(d.key) > -1; });
        }

        function generateButtons (div, config) {
            var controls = d3.select(div).append('div');
            controls.attr({
                    'id': 'control-div',
                    'class': 'control-class' + (config.controlClass ? ' ' + config.controlClass : '')
                });

            var buttonData = [{
                    title: 'Plot',
                    buttons: [{
                            text: 'Gene',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                _boxplot.container().style('display', '');
                                _mixplot.container().style('display', 'none');
                                _config.plot = 'gene';
                                _config.titleContent = _gene + ' Gene Expression';
                                renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                            }
                        },
                        {
                            text: 'Isoform',
                            'class': 'button btn-right',
                            action: function () {
                                _boxplot.container().style('display', 'none');
                                _mixplot.container().style('display', '');
                                _config.plot = 'isoform';

                                if ('alphabetical' === _config.sortState) {
                                    _config.sort = {};
                                    _config.sort.lines = function (keyDatumA, keyDatumB) {
                                        if (keyDatumA.key < keyDatumB.key) {
                                            return -1;
                                        }
                                        if (keyDatumB.key < keyDatumA.key) {
                                            return 1;
                                        }
                                        return 0;
                                    };

                                    _config.sort.boxes = {};
                                    _config.sort.boxes.outer = ABCKeySort;
                                    _config.sort.boxes.inner = innerPreserveSort;
                                }
                                if ('increasing' === _config.sortState) {
                                    _config.sort = {};
                                    _config.sort.lines = function (keyDatumA, keyDatumB) {
                                        return keyDatumSum(keyDatumB) - keyDatumSum(keyDatumA);
                                        function keyDatumSum (keyDatum) {
                                            return keyDatum.values.map(function (point) { return point.value; }).reduce(function (pointValueA, pointValueB) { return pointValueA + pointValueB; });
                                        }
                                    };

                                    _config.sort.boxes = {};
                                    _config.sort.boxes.outer = outerDecreasingSort;
                                    _config.sort.boxes.inner = innerDecreasingSort;
                                }
                                if ('decreasing' === _config.sortState) {
                                    _config.sort = {};
                                    _config.sort.lines = function (keyDatumA, keyDatumB) {
                                        return keyDatumSum(keyDatumB) - keyDatumSum(keyDatumA);
                                        function keyDatumSum (keyDatum) {
                                            return keyDatum.values.map(function (point) { return point.value; }).reduce(function (pointValueA, pointValueB) { return pointValueA + pointValueB; });
                                        }
                                    };

                                    _config.sort.boxes = {};
                                    _config.sort.boxes.outer = outerDecreasingSort;
                                    _config.sort.boxes.inner = innerDecreasingSort;
                                }

                                // Get isoform with largest maximum data point
                                var maxIsoform = extractGroups(_isoformData).map(function (isoform) {
                                        return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                    }).sort(function (isoformA, isoformB) {
                                        return isoformB[0] - isoformA[0];
                                    })[0][1];

                                _config.titleContent = _gene + ' Isoform Expression';
                                _config.title2Content = _gene + ' ' + maxIsoform + ' Gene Expression';

                                renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, maxIsoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                            }
                        }]
                },
                {
                    title: 'Differentiation',
                    buttons: [{
                            text: 'None',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                _config.plot = 'gene';
                                renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                            }
                        },
                        {
                            text: 'Sex',
                            'class': 'button btn-right',
                            action: function () {
                                _config.plot = 'sex';
                                renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                            }
                        }]
                },
                {
                    title: 'Scale',
                    buttons: [{
                            text: 'Log',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                var isoform;
                                _config.leftAxisLabel = 'Log10(TPM)';
                                _config.scale = 'log';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    // Get isoform with largest maximum data point
                                    isoform = _config.isoformBoxes || extractGroups(_isoformData).map(function (isoform) {
                                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                        }).sort(function (isoformA, isoformB) {
                                            return isoformB[0] - isoformA[0];
                                        })[0][1];

                                    var copyConfig = JSON.parse(JSON.stringify(_config));
                                    copyConfig.scale = 'linear';

                                    renderMixplot({
                                            lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                        },{
                                            lines: copyConfig,
                                            boxes: _config
                                        });
                                }
                            }
                        },
                        {
                            text: 'Linear',
                            'class': 'button btn-right',
                            action: function () {
                                var isoform;
                                _config.leftAxisLabel = 'TPM';
                                _config.scale = 'linear';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    // Get isoform with largest maximum data point
                                    isoform = _config.isoformBoxes || extractGroups(_isoformData).map(function (isoform) {
                                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                        }).sort(function (isoformA, isoformB) {
                                            return isoformB[0] - isoformA[0];
                                        })[0][1];

                                    renderMixplot({
                                            lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                        },
                                        {
                                            lines: _config,
                                            boxes: _config
                                        });
                                }
                            }
                        }]
                },
                {
                    title: 'Sort',
                    buttons: [{
                            text: 'ABC',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                var isoform;
                                _config.sortState = 'alphabetical';
                                if ('gene' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = ABCKeySort;
                                    _config.sort.inner = innerPreserveSort;

                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }

                                if ('singleTissue' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = ABCKeySort;
                                    _config.sort.inner = innerPreserveSort;

                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }

                                if ('sex' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = ABCKeySort;
                                    _config.sort.inner = function (boxA, boxB) {
                                            if (boxA.extra === 'female') {
                                                return -1;
                                            }
                                            if (boxB.extra === 'female') {
                                                return 1;
                                            }
                                            return 0;
                                        };
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }

                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }

                            }
                        },
                        {
                            text: '\u25B2',
                            'class': 'button btn-middle',
                            action: function () {
                                var isoform;
                                _config.sortState = 'increasing';
                                if ('gene' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerIncreasingSort;
                                    _config.sort.inner = innerIncreasingSort;

                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }

                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }

                                if ('singleTissue' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerIncreasingSort;
                                    _config.sort.inner = innerIncreasingSort;
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }

                                if ('sex' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerIncreasingSort;
                                    _config.sort.inner = function (boxA, boxB) {
                                            if (boxA.extra === 'female') {
                                                return -1;
                                            }
                                            if (boxB.extra === 'female') {
                                                return 1;
                                            }
                                            return 0;
                                        };
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }

                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }

                            }
                        },
                        {
                            text: '\u25BC',
                            'class': 'button btn-right',
                            action: function () {
                                var isoform;
                                _config.sortState = 'decreasing';
                                if ('gene' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerDecreasingSort;
                                    _config.sort.inner = innerDecreasingSort;
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }

                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }

                                if ('singleTissue' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerDecreasingSort;
                                    _config.sort.inner = innerDecreasingSort;
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }

                                if ('sex' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerDecreasingSort;
                                    _config.sort.inner = function (boxA, boxB) {
                                            if (boxA.extra === 'female') {
                                                return -1;
                                            }
                                            if (boxB.extra === 'female') {
                                                return 1;
                                            }
                                            return 0;
                                        };
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }

                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }


                            }
                        }]
                },
                {
                    title: 'Crosshair',
                    buttons: [{
                        },
                        {
                        }]
                },
                {
                    title: 'Outliers',
                    buttons: [{
                            text: 'On',
                            class: 'button btn-left',
                            action: function () {
                                var isoform;
                                _config.outlierClass = 'outliers-on';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                            }
                        },
                        {
                            text: 'Off',
                            class: 'button btn-right',
                            action: function () {
                                var isoform;
                                _config.outlierClass = 'outliers-off';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                            }
                        }]
                },
                {
                    title: 'Display',
                    buttons: [{
                            text: 'Boxes',
                            active: true,
                            'class': 'button btn-left',
                            action: function () {
                                var isoform;
                                _config.whiskerClass = 'whiskers-on';
                                _config.rectClass = 'rects-on';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                            }
                        },
                        {
                            text: 'Medians',
                            'class': 'button btn-right',
                            action: function () {
                                var isoform;
                                _config.whiskerClass = 'whiskers-off';
                                _config.rectClass = 'rects-off';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                            }
                        }]
                },
                {
                    title: 'Isoform Levels',
                    buttons: [{
                            text: 'Relative',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                _boxplot.container().style('display', 'none');
                                _mixplot.container().style('display', '');
                                _config.plot = 'relative';

                                // Get isoform with largest maximum data point
                                var isoform = _config.isoformBoxes || extractGroups(_isoformData).map(function (isoform) {
                                        return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                    }).sort(function (isoformA, isoformB) {
                                        return isoformB[0] - isoformA[0];
                                    })[0][1];

                                renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                            }
                        },
                        {
                            text: 'Absolute',
                            'class': 'button btn-right',
                            action: function () {
                                _boxplot.container().style('display', 'none');
                                _mixplot.container().style('display', '');
                                _config.plot = 'isoform';

                                // Get isoform with largest maximum data point
                                var isoform = _config.isoformBoxes || extractGroups(_isoformData).map(function (isoform) {
                                        return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                    }).sort(function (isoformA, isoformB) {
                                        return isoformB[0] - isoformA[0];
                                    })[0][1];

                                renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                            }
                        }]
                },
                {
                    title: 'Filter',
                    buttons: [{
                        text: 'Tissue',
                        'class': 'button btn-left btn-right',
                        'data-toggle': 'modal',
                        'data-target': '#gtex-plot-modal',
                    }]
                }];

            var boxes = controls.selectAll('div')
                .data(buttonData)
              .enter().append('div')
                .attr({
                        'class': 'button-box button-box-first button-box-last'
                    });

            boxes.append('div')
                .attr('class', 'button-box-title')
                .text(function (d) { return d.title; });

            boxes.append('div')
                .attr('class', 'button-options')
              .selectAll('div')
                .data(function (d) { return d.buttons; })
              .enter().append('div')
                .attr('class', function (d) { return d.class + ' ' + (d.active ? 'btn-active' : 'btn-inactive'); })
                .attr('data-toggle', function (d) { return d['data-toggle'] || null; })
                .attr('data-target', function (d) { return d['data-target'] || null; })
                .text(function (d) { return d.text; })
                .on('click', function (d) {
                    if (d.action) {
                        d.action();
                    }
                });

            _buttonReference = boxes;
        }

        function generateButtonStates(config) {
            return [
                _config.plot === 'isoform' || _config.plot === 'singleTissue' || _config.plot === 'relative' ? [0,1] : [1,0],
                _config.plot === 'sex' ? [0,1] : [1,0],
                _config.scale === 'log' ? [1,0] : [0,1],
                [
                    _config.sortState === 'alphabetical' ? 1 : 0,
                    _config.sortState === 'increasing' ? 1 : 0,
                    _config.sortState === 'decreasing' ? 1 : 0
                ],
                [0,0],
                _config.outlierClass === 'outliers-on' ? [1,0] : [0,1],
                _config.whiskerClass === 'whiskers-on' ? [1,0] : [0,1],
                _config.plot === 'relative' ? [1,0] : [0,1],
                [0]
            ];
        }

        function generateButtonBoxStates(config) {
            var plot = 1,
                differentiation = 1,
                scale = 1,
                sort = 1,
                crosshair = 1,
                outliers = 1,
                medians = 1,
                range = 1,
                filter = 1;

            if (config.plot === 'gene' || config.plot === 'sex') {
                crosshair = 0;
                range = 0;
            }
            if (config.plot === 'isoform' || config.plot === 'singleTissue' || config.plot === 'relative') {
                differentiation = 0;
                crosshair = 0;
            }

            return [plot,
                    differentiation,
                    scale,
                    sort,
                    crosshair,
                    outliers,
                    medians,
                    range,
                    filter];
        }

        function setButtonState (states, buttonBoxStates) {
            var counter = 0;
            var flattened = flatten(states);
            _buttonReference.selectAll('.button-options')
              .selectAll('div')
                .attr('class', function (d, index) {
                    return d.class + (flattened[counter++] ? ' btn-active' : ' btn-inactive');
                });

            counter = 0;
            flattened = flatten(buttonBoxStates);

            _buttonReference
                .style('display', function (d, index) {
                    return flattened[counter++] ? 'block' : 'none';
                });

            function flatten (arr) {
                if ('object' === typeof arr) {
                    return arr.map(flatten).reduce(function (a,b) {return a.concat(b);});
                } else {
                    return [arr];
                }
            }
        }

        function tissueHashToFormat (tissueHash) {
            return Object.keys(tissueHash).map(function (tissue) {
                    return {
                            tissue: tissue,
                            values: tissueHash[tissue]
                        };
                });
        }

        function isoformHashToFormat (isoformHash) {
            var mapping = isoformDataColorMapping (isoformHash);

            return Object.keys(isoformHash).map(function (isoform) {
                    return tissueHashToFormat(isoformHash[isoform]).map(
                        function (tissueFormat) {

                            var values = JSON.parse(JSON.stringify(tissueFormat.values));
                            values.color = mapping[isoform];

                            return {
                                    isoform: isoform,
                                    tissue: tissueFormat.tissue,
                                    values: values
                                };
                        }
                    );
                }).reduce(function (isoformFormatA, isoformFormatB) {
                        return isoformFormatA.concat(isoformFormatB);
                    });
        }

        function getFormatEntries (query, isoforms, tissues) {
            var format = isoformHashToFormat(query);

            if (isoforms) {
                format = format.filter(function (entry) {
                        return isoforms.indexOf(entry.isoform) > -1;
                    });
            }

            if (tissues) {
                format = format.filter(function (entry) {
                        return tissues.indexOf(entry.tissue) > -1;
                    });
            }

            return format;
        }

        function formatEntriesToBoxes (entries, category) {
            return entries.map(function (entry) {
                    return {
                            highWhisker: entry.values.high_whisker,
                            q3: entry.values.q3,
                            median: entry.values.median,
                            q1: entry.values.q1,
                            lowWhisker: entry.values.lowWhisker,
                            outliers: entry.values.outliers,
                            color: entry.values.color,
                            extra: {
                                groupName: entry[category || 'tissue']
                            }
                        };
                });
        }

        function formatEntriesToPoints (entries) {

        }

        function maxIsoformValue (isoform) {
            return d3.max(Object.keys(isoform).map(function (tissue) {
                    var values = isoform[tissue];
                    return [tissue.high_whisker,
                        tissue.q3,
                        tissue.median,
                        tissue.q1,
                        tissue.low_whisker];
                }).reduce(function (valuesA, valuesB) {
                    return valuesA.concat(valuesB);
                }).filter(function (value) { return value; }));
        }

        function isoformsSortedMaxToMin (isoformData) {
            var isoforms = Object.keys(isoformData).map(function (isoform) {
                    return {
                            value: maxIsoformValue(isoformData[isoform]),
                            isoform: isoform
                        };
                });

            isoforms.sort(function (isoformA, isoformB) {
                    return isoformB.value - isoformA.value;
                });

            return isoforms.map(function (isoform) { return isoform.isoform; });
        }

        function isoformDataColorMapping (isoformData) {
            var colors = generateDefaultColors();
            var mapping = {};

            isoformsSortedMaxToMin(isoformData).forEach(
                function (isoform, index) {
                    mapping[isoform] = colors[index];
                });

            return mapping;

        }

        function generateIsoformColors () {
            return {
                0: '#c41708',
                1: '#1fccf9',
                2: '#79e537',
                3: '#ddb501',
                4: '#60119a',
                5: '#3ea0a1',
                6: '#296f18',
                7: '#f5dbfc',
                8: '#b4e6fa',
                9: '#65079a',
                10: '#6216a4',
                11: '#8a24c6',
                12: '#a82d20',
                13: '#07ad84',
                14: '#d50fd1',
                15: '#249e5a',
                16: '#af3067',
                17: '#644ffb',
                18: '#1bb80a',
                19: '#33c5fa',
                20: '#668be6',
                21: '#cedc2a',
                22: '#6ea417',
                23: '#f80ddb',
                24: '#e3f3e4',
                25: '#1be427',
                26: '#93a3df',
                27: '#94416b',
                28: '#a37e55',
                29: '#9ba900',
                30: '#750f69',
                31: '#abfb4f',
                32: '#d257ee',
                33: '#094e9d',
                34: '#9a3574',
                35: '#cf4cc3',
                36: '#0357de',
                37: '#dd4571',
                38: '#ef6215',
                39: '#086b2b',
                40: '#e7e006',
                41: '#646a42',
                42: '#a7cebf',
                43: '#a1fd8f',
                44: '#168939',
                45: '#f6ee4d',
                46: '#1e70cb',
                47: '#92f910',
                48: '#cc41b0',
                49: '#1cd065',
                50: '#c17f19',
                51: '#d5701d',
                52: '#49e889',
                53: '#97344d',
                54: '#6ccbfa',
                55: '#b51460',
                56: '#3aa9e7',
                57: '#c4b580',
                58: '#f550b5',
                59: '#02af26',
                60: '#dbbe1c',
                61: '#9ac744',
                62: '#250501',
                63: '#176468',
                64: '#a0e7c7',
                65: '#f7cf08',
                66: '#f7cf08',
                67: '#4c0313',
                68: '#e58e54',
                69: '#f06bdb',
                70: '#c83de1',
                71: '#6bbcd0',
                72: '#b201b0',
                73: '#976027',
                74: '#da523d',
                75: '#4e74f8',
                76: '#dfc523',
                77: '#f6f43f',
                78: '#01e6c5',
                79: '#19fce0',
                80: '#3f3189',
                81: '#6a9fa6',
                82: '#f340af',
                83: '#113996',
                84: '#a0ec80',
                85: '#513f54',
                86: '#a7b48f',
                87: '#f90084',
                88: '#637acc',
                89: '#616de7',
                90: '#ec5494',
                91: '#95f459',
                92: '#8d3297',
                93: '#bc5a81',
                94: '#06e704',
                95: '#a03654',
                96: '#4576c0',
                97: '#3f8649',
                98: '#8b8a7f',
                99: '#e5c0ee'
            };
        }

        function generateDefaultColors () {
            return {
                0: '#c41708',
                1: '#1fccf9',
                2: '#79e537',
                3: '#ddb501',
                4: '#60119a',
                5: '#3ea0a1',
                6: '#296f18',
                7: '#f5dbfc',
                8: '#b4e6fa',
                9: '#65079a',
                10: '#6216a4',
                11: '#8a24c6',
                12: '#a82d20',
                13: '#07ad84',
                14: '#d50fd1',
                15: '#249e5a',
                16: '#af3067',
                17: '#644ffb',
                18: '#1bb80a',
                19: '#33c5fa',
                20: '#668be6',
                21: '#cedc2a',
                22: '#6ea417',
                23: '#f80ddb',
                24: '#e3f3e4',
                25: '#1be427',
                26: '#93a3df',
                27: '#94416b',
                28: '#a37e55',
                29: '#9ba900',
                30: '#750f69',
                31: '#abfb4f',
                32: '#d257ee',
                33: '#094e9d',
                34: '#9a3574',
                35: '#cf4cc3',
                36: '#0357de',
                37: '#dd4571',
                38: '#ef6215',
                39: '#086b2b',
                40: '#e7e006',
                41: '#646a42',
                42: '#a7cebf',
                43: '#a1fd8f',
                44: '#168939',
                45: '#f6ee4d',
                46: '#1e70cb',
                47: '#92f910',
                48: '#cc41b0',
                49: '#1cd065',
                50: '#c17f19',
                51: '#d5701d',
                52: '#49e889',
                53: '#97344d',
                54: '#6ccbfa',
                55: '#b51460',
                56: '#3aa9e7',
                57: '#c4b580',
                58: '#f550b5',
                59: '#02af26',
                60: '#dbbe1c',
                61: '#9ac744',
                62: '#250501',
                63: '#176468',
                64: '#a0e7c7',
                65: '#f7cf08',
                66: '#f7cf08',
                67: '#4c0313',
                68: '#e58e54',
                69: '#f06bdb',
                70: '#c83de1',
                71: '#6bbcd0',
                72: '#b201b0',
                73: '#976027',
                74: '#da523d',
                75: '#4e74f8',
                76: '#dfc523',
                77: '#f6f43f',
                78: '#01e6c5',
                79: '#19fce0',
                80: '#3f3189',
                81: '#6a9fa6',
                82: '#f340af',
                83: '#113996',
                84: '#a0ec80',
                85: '#513f54',
                86: '#a7b48f',
                87: '#f90084',
                88: '#637acc',
                89: '#616de7',
                90: '#ec5494',
                91: '#95f459',
                92: '#8d3297',
                93: '#bc5a81',
                94: '#06e704',
                95: '#a03654',
                96: '#4576c0',
                97: '#3f8649',
                98: '#8b8a7f',
                99: '#e5c0ee'
            };
        }

        function setGene (gene) {
            _gene = gene;

            var geneUrl = geneExpUrl + '?boxplotDetail=full&gencodeId=' + gene;
            var geneReq = new XMLHttpRequest();

            geneReq.open('GET', geneUrl);
            geneReq.onload = function(event) {
                var getBoxplotData = function(x) {
                    return {
                        low_whisker: x['data']['lowerLimit'],
                        high_whisker: x['data']['upperLimit'],
                        median: x['data']['median'],
                        num_samples: x['data']['numSamples'],
                        outliers: x['data']['outliers'],
                        q1: x['data']['q1'],
                        q3: x['data']['q3']
                    };
                };

                var isoformUrl = isoformExpUrl + '?boxplotDetail=full&gencodeId=' + gene;
                var isoformReq = new XMLHttpRequest();
                isoformReq.open('GET', isoformUrl);
                isoformReq.onload = function(event) {
                    var sexSubsetUrl = geneExpUrl + '?attributeSubset=sex&boxplotDetail=full&gencodeId=' + gene;
                    var sexSubsetReq = new XMLHttpRequest();
                    sexSubsetReq.open('GET', sexSubsetUrl);
                    sexSubsetReq.onload = function(event) {
                        var geneResponse = JSON.parse(geneReq.responseText).geneExpression;
                        var isoformResponse = JSON.parse(isoformReq.responseText).transcriptExpression;
                        var sexSubsetResponse = JSON.parse(sexSubsetReq.responseText).geneExpression;

                        //_queries.geneData = {};
                        //geneResponse.forEach(function(x) {
                        //    var tName = idNameMap[x.tissueSiteDetailId];
                        //    _queries.geneData[tName] = getBoxplotData(x);
                        //});

                        _queries.isoformData = {};
                        isoformResponse.forEach(function(x) {
                            var trId = x.transcriptId;
                            var tName = idNameMap[x.tissueSiteDetailId];
                            if (!_queries.isoformData[trId]) {
                                _queries.isoformData[trId] = {};
                            }
                            _queries.isoformData[trId][tName] = getBoxplotData(x);
                        });

                        _queries.sexSubsetData = {};
                        sexSubsetResponse.forEach(function(x) {
                            var sGroup = x.subsetGroup;
                            var tName = idNameMap[x.tissueSiteDetailId];
                            if (!_queries.sexSubsetData[sGroup]) {
                                _queries.sexSubsetData[sGroup] = {};
                            }
                            _queries.sexSubsetData[sGroup][tName] = getBoxplotData(x);
                        });

                        //_queries.colors = idColorMap;

                        //_geneData = geneDataToData(_queries.geneData, _queries.colors);
                        _isoformData = isoformDataToData(_queries.isoformData);
                        _femaleGeneData = sexPatch(geneDataToData(_queries.sexSubsetData.female, _queries.colors), 'female');
                        _maleGeneData = sexPatch(geneDataToData(_queries.sexSubsetData.male, _queries.colors), 'male');

                        //_config.titleContent = gene + ' Gene Expression';
                        //_config.width = $(outerDiv).width();
                        //_config.height = 800;

                        //renderBoxplot(dataToKeyBoxes(_geneData), _config);

                        $('#gtex-plot-modal').on('hidden.bs.modal', function () {
                            if (_filter.selected().length === 0) {
                                $('#gtex-plot-modal').modal('show');
                                $('#myModalWarning').text('Error! Select one or more tissues!');
                            }
                        });

                        _filter.callback(function (selected) {
                                if (selected.length === 0) {
                                    d3.select('#myModalWarning')
                                        .text('Error! Select one or more tissues!');
                                    return;
                                } else {
                                    d3.select('#myModalWarning')
                                        .text('');
                                }

                                var maxIsoform;
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), selected), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    // Get isoform with largest maximum data point
                                    maxIsoform = extractGroups(_isoformData).map(function (isoform) {
                                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                        }).sort(function (isoformA, isoformB) {
                                            return isoformB[0] - isoformA[0];
                                        })[0][1];

                                    renderMixplot({
                                            lines: filterPoints(dataToPoints(_isoformData), selected),
                                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, maxIsoform)), selected)
                                        },
                                        {
                                            lines: _config,
                                            boxes: _config
                                        });
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), selected), _config);
                                }
                                if ('relative' === _config.plot) {
                                    // Get isoform with largest maximum data point
                                    maxIsoform = extractGroups(_isoformData).map(function (isoform) {
                                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                        }).sort(function (isoformA, isoformB) {
                                            return isoformB[0] - isoformA[0];
                                        })[0][1];

                                    renderMixplot({
                                            lines: filterPoints(dataToPoints(_isoformData), selected),
                                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, maxIsoform)), selected)
                                        },
                                        {
                                            lines: _config,
                                            boxes: _config
                                        });
                                }
                            });

                        var filterData = [
                                [
                                    ['Adipose', true],
                                    ['Adipose - Subcutaneous', true],
                                    ['Adipose - Visceral (Omentum)', true]
                                ],
                                ['Adrenal Gland', true],
                                [
                                    ['Artery', true],
                                    ['Artery - Aorta', true],
                                    ['Artery - Coronary', true],
                                    ['Artery - Tibial', true]
                                ],
                                ['Bladder', true],
                                [
                                    ['Brain', true],
                                    ['Brain - Amygdala', true],
                                    ['Brain - Anterior cingulate cortex (BA24)', true],
                                    ['Brain - Caudate (basal ganglia)', true],
                                    ['Brain - Cerebellar Hemisphere', true],
                                    ['Brain - Cerebellum', true],
                                    ['Brain - Cortex', true],
                                    ['Brain - Frontal Cortex (BA9)', true],
                                    ['Brain - Hippocampus', true],
                                    ['Brain - Hypothalamus', true],
                                    ['Brain - Nucleus accumbens (basal ganglia)', true],
                                    ['Brain - Putamen (basal ganglia)', true],
                                    ['Brain - Spinal cord (cervical c-1)', true],
                                    ['Brain - Substantia nigra', true]
                                ],
                                ['Breast - Mammary Tissue', true],
                                [
                                    ['Cells', true],
                                    ['Cells - EBV-transformed lymphocytes', true],
                                    ['Cells - Transformed fibroblasts', true]
                                ],
                                [
                                    ['Cervix', true],
                                    ['Cervix - Ectocervix', true],
                                    ['Cervix - Endocervix', true]
                                ],
                                [
                                    ['Colon', true],
                                    ['Colon - Sigmoid', true],
                                    ['Colon - Transverse', true]
                                ],
                                [
                                    ['Esophagus', true],
                                    ['Esophagus - Gastroesophageal Junction', true],
                                    ['Esophagus - Mucosa', true],
                                    ['Esophagus - Muscularis', true]
                                ],
                                ['Fallopian Tube', true],
                                [
                                    ['Heart', true],
                                    ['Heart - Atrial Appendage', true],
                                    ['Heart - Left Ventricle', true]
                                ],
                                ['Kidney - Cortex', true],
                                ['Liver', true],
                                ['Lung', true],
                                ['Minor Salivary Gland', true],
                                ['Muscle - Skeletal', true],
                                ['Nerve - Tibial', true],
                                ['Ovary', true],
                                ['Pancreas', true],
                                ['Pituitary', true],
                                ['Prostate', true],
                                [
                                    ['Skin', true],
                                    ['Skin - Not Sun Exposed (Suprapubic)', true],
                                    ['Skin - Sun Exposed (Lower leg)', true]
                                ],
                                ['Small Intestine - Terminal Ileum', true],
                                ['Spleen', true],
                                ['Stomach', true],
                                ['Testis', true],
                                ['Thyroid', true],
                                ['Uterus', true],
                                ['Vagina', true],
                                ['Whole Blood', true]
                            ];

                        _filter.generate({data: filterData});

                        function sexPatch (data, sex) {
                            return data.map(function (datum) {
                                    var values = datum.values;
                                    values.highWhisker = values.highWhisker || 0;
                                    values.lowWhisker = values.lowWhisker || 0;
                                    values.outliers = values.outliers || [];
                                    values.extra = values.extra || {};
                                    values.extra.sex = sex;
                                    if ('female' === sex) {
                                        values.color = 'red';
                                    }
                                    if ('male' === sex) {
                                        values.color = 'blue';
                                    }
                                    return {
                                            group: datum.group,
                                            key: datum.key,
                                            values: values
                                        };
                                });
                        }

                        function colorsMutator (colors) {
                            var newColors = {};
                            Object.keys(colors).forEach(function (tissue) {
                                    newColors[colors[tissue].tissue_name]= 'rgb(' + colors[tissue].tissue_color_rgb + ')';
                                });

                            return newColors;
                        }
                    };
                    sexSubsetReq.onerror = function(event) {};
                    sexSubsetReq.send();
                };

                var geneResponse = JSON.parse(geneReq.responseText).geneExpression;

                _queries.geneData = {};
                geneResponse.forEach(function(x) {
                    var tName = idNameMap[x.tissueSiteDetailId];
                    _queries.geneData[tName] = getBoxplotData(x);
                });

                _queries.colors = idColorMap;
                _geneData = geneDataToData(_queries.geneData, _queries.colors);

                _config.titleContent = gene + ' Gene Expression';
                _config.width = $(outerDiv).width();
                _config.height = 800;

                renderBoxplot(dataToKeyBoxes(_geneData), _config);

                isoformReq.onerror = function (event) {};
                isoformReq.send();
            };
            geneReq.onerror = function (event) {};
            geneReq.send();

        }

        function devGene (datafile, colorfile, femaleFile, maleFile) {
            var oReq = new XMLHttpRequest();
            oReq.open('GET', datafile);

            oReq.onload = function (event) {
                var oReqFemale = new XMLHttpRequest();

                oReqFemale.open('GET', femaleFile);
                oReqFemale.onload = function (event) {

                    var oReqMale = new XMLHttpRequest();

                    oReqMale.open('GET', maleFile);
                    oReqMale.onload = function (event) {
                        var parsedResponse = JSON.parse(oReq.responseText);
                        // var parsedColor = JSON.parse(oReqColor.responseText);
                        var femaleResponse = JSON.parse(oReqFemale.responseText);
                        var maleResponse = JSON.parse(oReqMale.responseText);

                        _queries.geneData = parsedResponse.genetpm;
                        _queries.isoformData = parsedResponse.isoformtpm;
                        _queries.colors = colorsMutator(colorArr);

                        _geneData = geneDataToData(_queries.geneData, _queries.colors);
                        _isoformData = isoformDataToData(_queries.isoformData);
                        _femaleGeneData = sexPatch(geneDataToData(femaleResponse.genetpm, _queries.colors), 'female');
                        _maleGeneData = sexatch(geneDataToData(maleResponse.genetpm, _queries.colors), 'male');

                        renderBoxplot(dataToKeyBoxes(_geneData), _config);

                        _filter.callback(function (selected) {
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), selected), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    // Get isoform with largest maximum data point
                                    var maxIsoform = extractGroups(_isoformData).map(function (isoform) {
                                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                        }).sort(function (isoformA, isoformB) {
                                            return isoformB[0] - isoformA[0];
                                        })[0][1];

                                    renderMixplot({
                                            lines: filterPoints(dataToPoints(_isoformData), selected),
                                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, maxIsoform)), selected)
                                        },
                                        {
                                            lines: _config,
                                            boxes: _config
                                        });
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData))), _config);
                                }
                            });

                        var filterData = ['All',
                            [
                                ['Adipose',
                                    [
                                        ['Adipose - Subcutaneous', null],
                                        ['Adipose - Visceral (Omentum)', null]
                                    ]
                                ],
                                ['Adrenal Gland', null],
                                ['Artery',
                                    [
                                        ['Artery - Aorta', null],
                                        ['Artery - Coronary', null],
                                        ['Artery - Tibial', null]
                                    ]
                                ],
                                ['Bladder', null],
                                ['Brain',
                                    [
                                        ['Brain - Amygdala', null],
                                        ['Brain - Anterior cingulate cortex (BA24)', null],
                                        ['Brain - Caudate (basal ganglia)', null],
                                        ['Brain - Cerebellar Hemisphere', null],
                                        ['Brain - Cerebellum', null],
                                        ['Brain - Cortex', null],
                                        ['Brain - Frontal Cortex (BA9)', null],
                                        ['Brain - Hippocampus', null],
                                        ['Brain - Hypothalamus', null],
                                        ['Brain - Nucleus accumbens (basal ganglia)', null],
                                        ['Brain - Putamen (basal ganglia)', null],
                                        ['Brain - Spinal cord (cervical c-1)', null],
                                        ['Brain - Substantia nigra', null]
                                    ]
                                ],
                                ['Breast - Mammary Tissue', null],
                                ['Cells',
                                    [
                                        ['Cells - EBV-transformed lymphocytes', null],
                                        ['Cells - Transformed fibroblasts', null]
                                    ]
                                ],
                                ['Cervix',
                                    [
                                        ['Cervix - Ectocervix', null],
                                        ['Cervix - Endocervix', null]
                                    ]
                                ],
                                ['Colon',
                                    [
                                        ['Colon - Sigmoid', null],
                                        ['Colon - Transverse', null]
                                    ]
                                ],
                                ['Esophagus',
                                    [
                                        ['Esophagus - Gastroesophageal Junction', null],
                                        ['Esophagus - Mucosa', null],
                                        ['Esophagus - Muscularis', null]
                                    ]
                                ],
                                ['Fallopian Tube', null],
                                ['Heart',
                                    [
                                        ['Heart - Atrial Appendage', null],
                                        ['Heart - Left Ventricle', null]
                                    ]
                                ],
                                ['Kidney - Cortex', null],
                                ['Liver', null],
                                ['Lung', null],
                                ['Minor Salivary Gland', null],
                                ['Muscle - Skeletal', null],
                                ['Nerve - Tibial', null],
                                ['Ovary', null],
                                ['Pancreas', null],
                                ['Pituitary', null],
                                ['Prostate', null],
                                ['Skin',
                                    [
                                        ['Skin - Not Sun Exposed (Suprapubic)', null],
                                        ['Skin - Sun Exposed (Lower leg)']
                                    ]
                                ],
                                ['Small Intestine - Terminal Ileum', null],
                                ['Spleen', null],
                                ['Stomach', null],
                                ['Testis', null],
                                ['Thyroid', null],
                                ['Uterus', null],
                                ['Vagina', null],
                                ['Whole Blood', null]
                            ]
                        ];

                        _filter.generate(filterData);

                        function sexPatch (data, sex) {
                            return data.map(function (datum) {
                                    var values = datum.values;
                                    values.highWhisker = values.highWhisker || 0;
                                    values.lowWhisker = values.lowWhisker || 0;
                                    values.outliers = values.outliers || [];
                                    values.extra = values.extra || {};
                                    values.extra.sex = sex;
                                    if ('female' === sex) {
                                        values.color = 'red';
                                    }
                                    if ('male' === sex) {
                                        values.color = 'blue';
                                    }
                                    return {
                                            group: datum.group,
                                            key: datum.key,
                                            values: values
                                        };
                                });
                        }

                        function colorsMutator (colors) {
                            var newColors = {};
                            Object.keys(colors).forEach(function (tissue) {
                                    newColors[colors[tissue].tissue_name] = 'rgb(' + colors[tissue].tissue_color_rgb + ')';
                                });

                            return newColors;
                        }
                    };

                    oReqMale.onerror = function (event) {};

                    oReqMale.send();
                };

                oReqFemale.onerror = function (event) {};

                oReqFemale.send();
            };

            oReq.onerror = function (event) {

            };

            oReq.send();

        }

        function addModal (div) {
            var container = d3.select(div);
            var multiChildrenDiv = container.append('div')
                .attr({
                    'id': 'gtex-plot-modal',
                    'class': 'modal fade in',
                    'role': 'dialog'
                })
              .append('div')
                .attr({
                    'class': 'modal-dialog',
                    'role': 'document'
                })
              .append('div')
                .attr({
                    'class': 'modal-content'
                });

            var header = multiChildrenDiv.append('div')
                .attr('class', 'modal-header');

            header.append('button')
                .attr({
                    'type': 'button',
                    'class': 'close',
                    'data-dismiss': 'modal',
                    'aria-label': 'close'
                })
              .append('span')
                .attr('aria-hidden', 'true')
                .html('&times;');

            header.append('h4')
                .attr({
                    'id': 'myModalLabel',
                    'class': 'modal-title'
                })
                .html('Tissues');

            header.append('h4')
                .attr({
                    'id': 'myModalWarning',
                    'class': 'modal-title'
                })
                .style('color', 'red');

            multiChildrenDiv.append('div')
                .attr('class', 'modal-body');
        }

        this.devGene = devGene;
        this.setGene = setGene;
        this.test = {
                queries: _queries,
                isoformHashToFormat: isoformHashToFormat,
                geneDataToData: geneDataToData,
                isoformDataToData: isoformDataToData,
                test: function () {
                    console.log('test');
                }
            };
    }

    plotviz.GtexPlot = GtexPlot;

    return plotviz;
}) (plotviz || {});
