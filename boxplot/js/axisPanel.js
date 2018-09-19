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
