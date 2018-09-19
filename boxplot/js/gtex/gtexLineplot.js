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
