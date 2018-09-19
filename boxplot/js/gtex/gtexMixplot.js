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
