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
