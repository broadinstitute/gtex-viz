/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function AxisPanel (svg, id, data) {
        var _svg = svg;
        var _id = id;
        var _panel = null;
        var _label = null;
        var _tooltip = null;
        var _tooltipFunc = null;
        var _mouseclick = null;
        var _data = data;

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

        this.mouseclick = function (func) {
            if (func) { _mouseclick = func; }
            return func ? this : _mouseclick;
        };

        _panel = _svg.append('g').attr({
                id: _id,
                'class': 'axis',
                transform: 'translate(' + data.x + ',' + data.y + ')'
            });

        _panel.append('text').attr('id', _id + '-label')
            .on('mousemove', function (d, i) {
                if (_tooltipFunc) {
                    var tooltipInput = {
                        key: 'tooltip',
                        value: {
                            type: _id + '-label',
                            data: d
                        }
                    };

                    var xy = d3.mouse(_svg.node());

                    _tooltip
                        .style({
                            left: (xy[0] + 20) + 'px',
                            top: (xy[1] + 20) + 'px',
                            color: 'white',
                            'font-weight': 'bold',
                            background: 'rgba(0,0,0,0.75)',
                            padding: '12px',
                            'border-radius': '2px',
                            'line-height': 1,
                            display: ''
                        })
                        .html(_tooltipFunc(xy[0], xy[1], tooltipInput));
                }
            })
            .on('mouseout', function () {
                _tooltip.style('display', 'none');
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


        this.render = function (data) {
            var axis = _panel.call(d3.svg.axis()
                                    .scale(data.axis)
                                    .orient(data.orientation));

            if ('left' === data.orientation) {
                axis.attr('transform', 'translate(' + data.x + ',' + data.y + ')');
                // TODO: Generalize positioning the label.
                _panel.select('#' + _id + '-label')
                    .attr('transform', 'translate(' + (data.labelX - data.x) + ',' + (data.labelY) + ') rotate(' + (-data.rotation) + ')')
                    .style({
                        'text-anchor': 'middle',
                        stroke: data.label.search('xlink') >= 0 ? 'blue' : 'none',
                        'shape-rendering': 'crispEdges',
                        'text-decoration': data.label.search('xlink') >= 0 ? 'underline' : 'none',
                        'font-size': _data.fontSize ? _data.fontSize + 'px' : '16px',
                        'fill': _data.fill ? _data.fill : '#000'
                    })
                    .html(data.label);

                axis.selectAll('path')
                    .style({
                        fill: 'none',
                        stroke: 'none',
                        'shape-rendering': 'crispEdges'
                    });

                axis.selectAll('g.tick line')
                    .style({
                        fill: 'none',
                        stroke: '#000',
                        'shape-rendering': 'crispEdges'
                    });

                axis.selectAll('g.tick text')
                    .style({
                        'shape-rendering': 'crispEdges',
                        'font-size': _data.fontSize ? _data.fontSize + 'px' : '14px',
                        'fill': _data.fill ? _data.fill : '#000',
                        'font-family': 'sans-serif'
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
                        }
                    })
                    .on('mouseout', function () {
                        _tooltip.style('display', 'none');
                    });
            }

            if ('bottom' === data.orientation) {
                axis.attr('transform', 'translate(' + data.x + ',' + data.y + ')');
                _panel.select('#' + _id + '-label')
                    .attr('transform', 'translate(' + data.labelX + ',' + data.labelY + ')')
                    .style({
                        'text-anchor': 'middle',
                        stroke: data.label.search('xlink') >= 0 ? 'blue' : 'none',
                        'shape-rendering': 'crispEdges',
                        'text-decoration': data.label.search('xlink') >= 0 ? 'underline' : 'none',
                        'font-size': _data.fontSize ? _data.fontSize : '16px',
                        'fill': _data.fill ? _data.fill : '#000'
                    })
                    .html(data.label);

                // TODO: Make this configurable. Especially text rotation.
                var anchor = data.tickAlign;
                anchor = anchor || 'middle';
                anchor = 'center' === anchor ? 'middle' : anchor;

                axis.selectAll('g.tick text')
                    .attr('transform', 'translate(' + data.tickTranslate + ') rotate(' + data.tickRotation + ')')
                    .style({
                        'text-anchor': anchor,
                        'font-family': 'sans-serif'
                    });

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
                    });

                axis.selectAll('path')
                    .style({
                        fill: 'none',
                        stroke: 'none',
                        'shape-rendering': 'crispEdges'
                    });

                axis.selectAll('g.tick line')
                    .style({
                        fill: 'none',
                        stroke: '#000',
                        'shape-rendering': 'crispEdges'
                    });

                axis.selectAll('g.tick text')
                    .style({
                        'shape-rendering': 'crispEdges',
                        'font-size': _data.fontSize ? _data.fontSize + 'px' : '14px',
                        'fill': _data.fill ? _data.fill : '#000'
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
                    .on('mouseout', function () {
                        _tooltip.style('display', 'none');
                    })
                    .on('click', function (d, i) {
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
