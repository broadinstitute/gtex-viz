/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function Boxplot (config) {

        var _width = 1000,
            _height = 1000;

        var _margin = {
                'top': 0.1,
                'right': 0.9,
                'bottom': 0.9,
                'left': 0.1
            };
        var _data;

        var _div;
        var _svgContainer;
        var _svg;
        var _labels;

        var _viewer;
        var _leftAxis;
        var _bottomAxis;



        function plot () {

            _svgContainer = d3.select(_div).append('svg')
                .attr({
                    'width': _width,
                    'height': _height
                });

            _svg = _svgContainer.append('g')
                .attr('transform', 'translate(' + (_margin.left * _width) + ',' + (_margin.top * _height) + ')');

            _viewer = new plotviz.BoxWhiskerViewer(_svg);
            _leftAxis = new plotviz.AxisPanel(_svg);
            _bottomAxis = new plotviz.AxisPanel(_svg);

            var width = _width - (_margin.left * _width) - ((1 - _margin.right) * _width);
            var height = _height - (_margin.top * _height) - ((1 - _margin.bottom) * _height);

            var viewerConfig = {
                    'width': width,
                    'height': height
                };

            _viewer.render(_data, viewerConfig);

            var leftAxisData = {
                    'orientation': 'left',
                };

            var leftAxisConfig = {
                    'width': 0,
                    'height': height,
                    'axis': _viewer.generateYAxis(_data, viewerConfig)
                };

            _leftAxis.render(leftAxisData, leftAxisConfig);

            var bottomAxisData = {
                    'orientation': 'bottom'
                };

            var bottomAxisConfig = {
                    'width': width,
                    'height': height,
                    'axis': _viewer.generateXAxis(_data, viewerConfig)
                };

            _bottomAxis.render(bottomAxisData, bottomAxisConfig);

        }

        plot.configure = function (config) {

            if ('container' in config) plot.container(config.container);
            if ('data' in config) plot.data(config.data);
            if ('labels' in config) plot.labels(config.data);

            return plot;

        };

        plot.container = function (value) {
            if (!arguments.length) return _div;
            _div = value;
            return plot;
        };

        plot.data = function (value) {
            if (!arguments.length) return _data;
            _data = value;
            return plot;
        };

        plot.configure(config);

        return plot;

    }

    plotviz.Boxplot = Boxplot;
    return plotviz;

}) (plotviz || {});
