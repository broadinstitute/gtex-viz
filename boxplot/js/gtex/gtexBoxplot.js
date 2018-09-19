/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function GtexBoxplot (div, config) {
        config = config || {};
        var _tooltipFunction = null;
        var width = config.width || 1000;
        var height = config.height || 400;
        var _svg = d3.select(div).append('svg').attr({
                width: width,
                height: height
            });
        var layout = new plotviz.LayoutManager(_svg);
        layout.render(generateLayout(), {width:width, height:height});

        var _viewer = new plotviz.BoxWhiskerViewer(layout.getPanel('boxViewer'));
        var _leftAxis = new plotviz.AxisPanel(layout.getPanel('leftAxis'));
        var _bottomAxis = new plotviz.AxisPanel(layout.getPanel('bottomAxis'), 'bottomAxis');
        var _title = new plotviz.TextPanel(layout.getPanel('title'));

        function getPanelDimensions (key) {
            return layout.getPanelDimensions(key);
        }

        function callback (func) {
            _viewer.callback(func);
            _bottomAxis.callback(func);
        }

        function sortingFunctions (f) {
            _viewer.sortingFunctions(f);
        }

        function transformInput (data, f) {
            return data.map(function (box) {
                    return {
                        highWhisker: f(box.highWhisker),
                        q3: f(box.q3),
                        median: f(box.median),
                        q1: f(box.q1),
                        lowWhisker: f(box.lowWhisker),
                        outliers: box.outliers.map(f),
                        color: box.color,
                        extra: box.extra
                    };
                });
        }

        function builtInTransform (data, config) {
            var dataCopy = JSON.parse(JSON.stringify(data));
            if ('log' === config.scale) {
                dataCopy = transformInput(data, function (x) { return Math.log(x + 0.05) / Math.LN10; });
            }
            return dataCopy;
        }

        function container () {
            return _svg;
        }

        function render (data, config) {

            function boxMax (box) {
                return box.highWhisker || box.q3 || box.median || box.q1 || box.lowWhisker;
            }

            function boxesMax (boxes) {
                return Math.max.apply(null, boxes.map(function (box) {return boxMax(box);}));
            }

            function boxMin (box) {
                return box.lowWhisker || box.q1 || box.median || box.q3 || box.highWhisker;
            }

            function boxesMin (boxes) {
                return Math.min.apply(null, boxes.map(function (box) {return boxMin(box);}));
            }

            var newWidth = config.boxes.width || width;
            var newHeight = config.boxes.height || height;

            _svg.attr({
                'width': newWidth,
                'height': newHeight
            });

            layout.render(generateLayout(), {width:newWidth, height:newHeight});

            data.boxes = builtInTransform(data.boxes, config.boxes);

            var boxViewerDimensions = layout.getPanelDimensions('boxViewer');

            var boxConfig = {
                    width: boxViewerDimensions.width,
                    height: boxViewerDimensions.height,
                    outlierClass: config.boxes.outlierClass,
                    whiskerClass: config.boxes.whiskerClass,
                    boxClass: config.boxes.boxClass,
                    rectClass: config.boxes.rectClass,
                    outlierJitter: config.boxes.outlierJitter || 0
                };

            _viewer.render(data.boxes, boxConfig);

            var leftAxisData = {
                    orientation: 'left',
                    label: config.boxes.leftAxisLabel || 'TPM'
                },
                bottomAxisData = {
                    orientation: 'bottom',
                    label: ''
                };
            var leftAxisDimensions = layout.getPanelDimensions('leftAxis');
            var leftAxisConfig = {
                width: leftAxisDimensions.width,
                height: leftAxisDimensions.height,
                labelX: 0.5,
                labelY: 0.5,
                labelRotation: 90,
                axis: _viewer.generateYAxis(data.boxes, {height:boxConfig.height})
            };
            _leftAxis.render(leftAxisData, leftAxisConfig);

            var bottomAxisDimensions = layout.getPanelDimensions('bottomAxis');
            var bottomAxisConfig = {
                width: bottomAxisDimensions.width,
                height: bottomAxisDimensions.height,
                axisX: 0,
                axisY: 0,
                tickAlign: config.boxes.tickAlign || 'end',
                tickTranslate: config.boxes.tickTranslate === 0 ? 0 : (config.boxes.tickTranslate || -10),
                tickRotation: config.boxes.tickRotation === 0 ? 0 : (config.boxes.tickRotation || -45),
                axis: _viewer.generateXAxis(data.boxes, {width:boxConfig.width})
            };

            _bottomAxis.render(bottomAxisData, bottomAxisConfig);

            var titleDimensions = layout.getPanelDimensions('title');
            var titleConfig = {
                width: titleDimensions.width,
                height: titleDimensions.height,
                x: 0.5,
                y: 0.5,
                'class': config.boxes.titleClass
            };

            _title.render({content: config.boxes.titleContent}, titleConfig);
        }

        function generateLayout (data, config) {
            return {
                type: 'vertical',
                width: 1,
                height: 1,
                panels: [
                {
                    type: 'horizontal',
                    width: 1,
                    height: 0.1,
                    panels: [{
                        type: 'leaf',
                        width: 0.1,
                        height: 1
                    },
                    {
                        name: 'title',
                        type: 'leaf',
                        width: 0.9,
                        height: 1
                    }]
                },
                {
                    type: 'horizontal',
                    width: 1,
                    height: 0.9,
                    panels: [{
                        type: 'vertical',
                        width: 0.1,
                        height: 1,
                        panels: [{
                            name: 'leftAxis',
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
                        width: 0.9,
                        height: 1,
                        panels: [{
                            name: 'boxViewer',
                            type: 'leaf',
                            width: 1,
                            height: 0.55
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
                    }]
            }]
            };
        }

        this.render = render;
        this.container = container;
        this.builtInTransform = builtInTransform;
        this.sortingFunctions = sortingFunctions;
        this.callback = callback;
        this.getPanelDimensions = getPanelDimensions;
    }

    plotviz.GtexBoxplot = GtexBoxplot;

    return plotviz;
}) (plotviz || {});
