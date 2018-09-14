/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function Legend (svg, id, metadata) {
        var _svg = svg;
        var _id = id;
        var _panel = null;
        var _mouseclick = null;
        var _mousemove = null;

        _panel = _svg.append('g')
            .attr({
                id: id,
                transform: 'translate(' + metadata.x + ',' + metadata.y + ')'
            });

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

        this.render = function (data, x, y, config) {
            _panel.attr({
                transform: 'translate(' + (config.x || metadata.x) + ',' + (config.y || metadata.y) + ')'
            });
            addText(data, _panel, x, y);
            addColorBars(data, _panel, x, y);
            addLegendPanel(data, _panel , x, y);
            //addBorder();
        };

        function addText(data, panel, x, y) {
            var textData = data.map(function (entry, index) {
                var entryHeight = 15;
                return {
                    key: entry.value.label,
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
                });
        }

        function addColorBars(data, panel, x, y) {
            var maxTextWidth = panel.select('.legend-text').selectAll('text')[0]
                .map(function (d) { return d.getBBox(); })
                .reduce(function (a, b) { return a.width > b.width ? a.width : b.width; }, {width:0});
            var entryHeight = 15;
            var colorBarData = data.map(function (entry, index) {
                return {
                    y: 3 + (entryHeight * index),
                    colorWidth: 12,
                    height: 12,
                    color: entry.value.color,
                    opacity: entry.value.opacity,
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
                });
        }


        function addLegendPanel(data, panel, x, y) {
            var legendData = data.map(function (entry, index) {
                var entryHeight = 15;
                return {
                    key: entry.value.label,
                    x: 100,
                    y: 3 + (entryHeight * index),
                    textWidth: 10,
                    colorWidth: 12,
                    height: 12,
                    color: entry.value.color,
                    opacity: entry.value.opacity
                };
            });

            var attrsText = panel.select('.legend-text').node().getBBox();
            var attrsRect = panel.select('.legend-rects').node().getBBox();

            if (legendData.length) {
                panel.select('.legend-border')
                    .attr({
                        x: attrsText.x - 5,
                        y: attrsText.y - 5,
                        width: (attrsText.width + attrsRect.width + 5 + 10) + 'px',
                        height: (attrsText.height + 10) + 'px'
                    })
                    .style({
                        stroke: 'black',
                        'stroke-width': 1
                    });

                var legendRight,
                    newX,
                    newY;

                if ('right' === metadata.align) {
                    legendRight = metadata.x;
                    newX = legendRight - (attrsText.width + attrsRect.width + 10 + 5);
                    newY = metadata.y;
                    panel.attr('transform' , 'translate(' + newX + ',' + newY + ')');
                }
                if ('center' === metadata.align) {
                    legendRight = metadata.x;
                    newX = legendRight - ((attrsText.width + attrsRect.width + 10 + 5) / 2);
                    newY = metadata.y;
                    panel.attr('transform' , 'translate(' + newX + ',' + newY + ')');
                }
                panel.select('.legend-border')
                    .attr({
                        x: attrsText.x - 5,
                        y: attrsText.y - 5,
                        width: (attrsText.width + attrsRect.width + 5 + 10) + 'px',
                        height: (attrsText.height + 10) + 'px'
                    })
                    .style({
                        stroke: 'black',
                        'stroke-width': 1
                    });
            } else {
                panel.select('.legend-border').style('stroke-width', 0);
            }
        }

    }

    plotviz.Legend = Legend;

    return plotviz;
}) (plotviz || {});
