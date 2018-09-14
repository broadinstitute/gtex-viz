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
