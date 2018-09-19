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
