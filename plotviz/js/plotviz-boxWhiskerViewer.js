/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function BoxWhiskerViewer (svg, id, data) {
        var _svg = svg;
        var _id = id;
        var _panel = null;
        var _tooltip = null;
        var _tooltipFunc = null;
        var _data = data;

        _panel = _svg.append('g')
            .attr({
                id: id,
                transform: 'translate(' + data.metadata.x + ',' + data.metadata.y + ')'
            });

        _panel.append('rect').attr({
            x: 0,
            y: 0,
            width: data.metadata.width,
            height: data.metadata.height,
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

        this.render = function (data, x, y, config) {
            _data = data;
            _svg.select('g#' + _id).attr('transform', 'translate(' + data.metadata.x + ',' + data.metadata.y + ')');
            _panel.select('.border').attr({ width:data.metadata.width, height: data.metadata.height });
            addRectangles(data.data, _panel.select('.rects'), x, y);
            addUnderLines(data.data, _panel.select('.under-lines'), x, y);
            addWhiskerLines(data.data, _panel.select('.whisker-lines'), x, y, config);
            addOutliers(data.data, _panel.select('.outliers'), x, y, config);
            addMedianLines(data.data, _panel.select('.median-lines'), x, y);
            //addSignificanceLine(data.data, _panel.select('.significance-line'), x, y, config);
        };

        function addSignificanceLine (data, panel, x, y, config) {
            var lineData = d3.range(0, _data.metadata.width, parseInt(_data.metadata.width / 100)).map(function (d) {
                    return d;
                });

            var lineSelection = panel.selectAll('line').data(lineData);
            lineSelection.exit().remove();
            lineSelection.enter().append('line');
            // Fix for IE11
            Math.log10 = Math.log10 || function (x) { return Math.log(x) / Math.log(10); };
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

        function addRectangles (data, panel, x, y) {
            var rectData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.value.map(function (box) {
                    return box.key;
                });
                var boxGroupValueMap = boxGroup.value.map(function (box, i) {
                    var testPadding = x.rangeBand() / minorKeys.length;
                    var realPadding = (_data.metadata.boxGroupSpacing || 0.1) * testPadding >= 2 ? (_data.metadata.boxGroupSpacing || 0.1) : 2 / testPadding;
                    var minorX = d3.scale.ordinal()
                                    .domain(minorKeys)
                                    .rangeBands([0, x.rangeBand()]);
                    return {
                        q3: y(box.value.q3),
                        q1: y(box.value.q1),
                        boxStart: x(boxGroup.key) + minorX(box.key),
                        boxWidth: minorX.rangeBand(),
                        color: box.value.color,
                        extra: box.value.extra,
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
                stroke: '#aaa',
                'stroke-width': 1,
                opacity: function (d) { return d.extra.opacity; }
            })
            .on('mousemove', function (d, i) {
                if (_tooltipFunc) {
                    var tooltipInput = {
                        key: 'tooltip',
                        value: {
                            type: 'box',
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
                            display: '',
                            opacity: 1
                        })
                        .html(tooltipText);
                    if (null === tooltipText) {
                        _tooltip.style('display', 'none');
                    }
                }
            })
            .on('mouseout', function (d) {
                _tooltip.style('display', 'none');
            });
        }

        function addUnderLines (data, panel, x, y) {
            var lineData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.value.map(function (box) {
                    return box.key;
                });
                return boxGroup.value.map(function (box) {
                    var minorX = d3.scale.ordinal()
                                    .domain(minorKeys)
                                    .rangeBands([0, x.rangeBand()], 0.1);
                    // TODO: Remove these quality control checks that
                    // fall back in case certain values aren't provided
                    return box.noData ? null : {
                        xAxis: x(boxGroup.key) + minorX(box.key) + minorX.rangeBand() / 2,
                        valueLow: y(box.value.low_whisker || box.value.median || 0),
                        valueHigh: y(box.value.high_whisker || box.value.median || 0),
                        opacity: box.value.extra.whiskerOpacity === 0 ? 0 : (box.value.extra.whiskerOpacity || (box.value.extra.opacity === 0 ? 0 : (box.value.extra.opacity || 1)))
                    };
                })
                .filter(function (underlines) {
                    return underlines ? true : false;
                });
            })
            .reduce(function (lineGroupA, lineGroupB) {
                return lineGroupA.concat(lineGroupB);
            });

            var lineSelection = panel.selectAll('line').data(lineData);
            lineSelection.exit().remove();
            lineSelection.enter().append('line');

            lineSelection.attr({
                x1: function (d) { return d.xAxis; },
                y1: function (d) { return d.valueHigh; },
                x2: function (d) { return d.xAxis; },
                y2: function (d) { return d.valueLow; }
            })
            .style('opacity', function (d) { return d.opacity; });

            lineSelection.style({
                stroke: _data.metadata.whiskerStroke || '#aaa',
                'stroke-width': 1
            });
        }

        function addWhiskerLines (data, panel, x, y) {
            var lineData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.value.map(function (box) {
                    return box.key;
                });
                return boxGroup.value.map(function (box) {
                    var minorX = d3.scale.ordinal()
                                        .domain(minorKeys)
                                        .rangeBands([0, x.rangeBand()], boxGroup.value.length > 1 ? 0.1 : 0);
                    return box.noData ? null : [
                        {
                            labelLower: x(boxGroup.key) + minorX(box.key) + minorX.rangeBand() / 4,
                            yAxis: y(box.value.high_whisker || box.value.q3 || box.value.median),
                            labelHigher: x(boxGroup.key) + minorX(box.key) + 3 * minorX.rangeBand() / 4,
                            opacity: box.value.extra.whiskerOpacity === 0 ? 0 : (box.value.extra.whiskerOpacity || (box.value.extra.opacity === 0 ? 0 : (box.value.extra.opacity || 1)))
                        },
                        {
                            labelLower: x(boxGroup.key) + minorX(box.key) + minorX.rangeBand() / 4,
                            yAxis: y(box.value.low_whisker || box.value.q1 || box.value.median),
                            labelHigher: x(boxGroup.key) + minorX(box.key) + 3 * minorX.rangeBand() / 4,
                            opacity: box.value.extra.whiskerOpacity === 0 ? 0 : (box.value.extra.whiskerOpacity || (box.value.extra.opacity === 0 ? 0 : (box.value.extra.opacity || 1)))
                        }];
                })
                .filter(function (lines) {
                    return lines ? true : false;
                })
                .reduce(function (linesA, linesB) {
                    return linesA.concat(linesB);
                });
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
            })
            .style({
                opacity: function (d) { return d.opacity; },
                stroke: _data.metadata.whiskerStroke || '#aaa',
                'stroke-width': 1
            });
        }

        function addMedianLines (data, panel, x, y) {
            var lineData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.value.map(function (box) {
                    return box.key;
                });
                return boxGroup.value.map(function (box) {
                    var minorX = d3.scale.ordinal()
                                        .domain(minorKeys)
                                        .rangeBands([0, x.rangeBand()], boxGroup.value.length > 1 ? 0.1 : 0);
                    return box.noData ? null : [{
                            labelLower: x(boxGroup.key) + minorX(box.key),
                            yAxis: y(box.value.median),
                            labelHigher: x(boxGroup.key) + minorX(box.key) + minorX.rangeBand(),
                            opacity: box.value.extra.medianOpacity === 0 ? 0 : (box.value.extra.medianOpacity || (box.value.extra.opacity === 0 ? 0 : (box.value.extra.opacity || 1))),
                            medianColor: box.value.extra.medianColor,
                        }];
                })
                .filter(function (lines) {
                    return lines ? true : false;
                })
                .reduce(function (linesA, linesB) {
                    return linesA.concat(linesB);
                });
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
            })
            .style({
                opacity: function (d) { return d.opacity; },
                stroke: function (d) { return d.medianColor || 'black'; },
                'stroke-width': 2
            });
        }

        function addOutliers (data, panel, x, y, config) {
            var jitterBound = 0;
            var outlierData = data.map(function (boxGroup) {
                var minorKeys = boxGroup.value.map(function (box) {
                    return box.key;
                });
                return boxGroup.value.map(function (box) {
                    var minorX = d3.scale.ordinal()
                        .domain(minorKeys)
                        .rangeBands([0, x.rangeBand()], boxGroup.value.length > 1 ? 0.1 : 0);
                    jitterBound = minorX.rangeBand();
                    return box.value.outliers.map(function (outlier) {
                        return {
                            boxStart: x(boxGroup.key) + minorX(box.key),
                            boxWidth: minorX.rangeBand(),
                            outlier: y(outlier.value.outlier),
                            raw: outlier,
                            opacity: box.value.extra.outlierOpacity === 0 ? 0 : (box.value.extra.outlierOpacity || (box.value.extra.opacity === 0 ? 0 : (box.value.extra.opacity || 1)))
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

            var outlierSelection = panel.selectAll('circle').data(outlierData);
            outlierSelection.exit().remove();
            outlierSelection.enter().append('circle');
            var jitter = (_data.metadata.outlierJitter || 0) * jitterBound;
            outlierSelection.attr({
                cx: function (d) { return d.boxStart + (d.boxWidth / 2) + (Math.random() * jitter) - (jitter / 2); },
                cy: function (d) { return d.outlier; },
                r: function (d) { return _data.metadata.outlierRadius || 2; }
            })
            .style({
                fill: 'none',
                opacity: function (d) { return d.opacity; },
                stroke: _data.metadata.outlierStroke || '#aaa',
                display: config.outliers === 'on' ? '' : 'none'
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
            // Fix for IE11
            Math.log10 = Math.log10 || function (x) { return Math.log(x) / Math.log(10); };
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
        this.sort = function (data, config) {

            var newData = JSON.parse(JSON.stringify(data));
            if ('string' === typeof config.minorSort){
                if ('alphabetical' === config.minorSort) {
                    newData.data.forEach(function (boxList, bLIndex, bLArray) {
                        boxList.value.sort(function (a, b) {
                            return b.key < a.key;
                        });
                    });
                } else if ('increasing' === config.minorSort) {
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

            if ('string' === typeof config.majorSort) {
                   if ('alphabetical' === config.majorSort) {
                    newData.data.sort(function (a, b) {
                        return b.key < a.key ? 1 : -1;
                    });
                } else if ('increasing' === config.majorSort) {
                    newData.data.sort(function (a, b) {
                        var aTotal = 0,
                            bTotal = 0;

                        aTotal = a.value.filter(function (d) { return d.value ? true : false; })
                            .map(function (d) { return d.value.median; })
                            .reduce(function (b1, b2) { return b1 + b2; }, 0);

                        bTotal = b.value.filter(function (d) { return d.value ? true : false; })
                            .map(function (d) { return d.value.median; })
                            .reduce(function (b1, b2) { return b1 + b2; }, 0);

                        aTotal /= a.value.filter(function (d) { return d ? true : false; }).length;
                        bTotal /= b.value.filter(function (d) { return d ? true : false; }).length;
                        return aTotal - bTotal;
                    });
                } else if ('decreasing' === config.majorSort) {
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

            if ('function' === typeof config.majorSort) {
                newData.data.sort(config.majorSort);
            }

            if ('function' === typeof config.minorSort) {
                newData.data.forEach(function (boxList, bLIndex, bLArray) {
                    boxList.value.sort(config.minorSort);
                });
            }

            return newData;

        };

    }

    plotviz.BoxWhiskerViewer = BoxWhiskerViewer;

    return plotviz;
}) (plotviz || {});
