/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function LineViewer (svg, id, data) {
        var _svg = svg;
        var _id = id;
        var _panel = null;
        var _tooltip = null;
        var _tooltipFunc = null;

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

        this.render = function (data, x, y, config) {
            _svg.select('g#' + _id).attr('transform', 'translate(' + config.x + ',' + config.y + ')');
            _panel.select('.border').attr({ width:config.width, height: config.height });
            addLines(data, _panel, x, y);
        };

        function addLines (data, panel, x, y) {
            var pathData = data.map(function (lineData) {
                return {
                    line: lineData.value.points.map(function (linePoint) {
                        return {
                            x: x(linePoint.key) + (x.rangeBand() / 2),
                            y: y(linePoint.value.median)
                        };
                    }),
                    color: lineData.value.color,
                    key: lineData.key,
                    style: lineData.value.style
                };
            });

            var lineFunction = d3.svg.line()
                                .x(function (d) { return d.x; })
                                .y(function (d) { return d.y; })
                                .interpolate('linear');

            var lineSelection = panel.selectAll('path').data(pathData);
            lineSelection.enter().append('path');

            lineSelection.attr('d', function (d) { return lineFunction(d.line); })
            .style({
                stroke: function (d) { return d.color; },
                fill: 'none',
                'stroke-width': function (d) {
                    if ('undefined' !== typeof d.style && 'undefined' !== typeof d.style.strokeWidth) {
                        return d.style.strokeWidth;
                    } else {
                        return 1;
                    }
                }
            });
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
            // Fix for IE11
            Math.log10 = Math.log10 || function (x) { return Math.log(x) / Math.log(10); };
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
