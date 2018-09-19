/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function LayoutManager (svg) {
        var _svg = svg;
        var _namedPanels = {};

        this.getPanel = function (name) {
            return _namedPanels[name].panel;
        };

        this.getPanelDimensions = function (name) {
            return {width: _namedPanels[name].width, height: _namedPanels[name].height, x: _namedPanels[name].x, y: _namedPanels[name].y};
        };

        this.render = function (data, config) {

            var gPanels = [];

            generatePanels(data, 0, 0, config.width, config.height);

            var panels = _svg.selectAll('g.layout-panels').data(gPanels);

            panels.exit().remove();
            panels.enter().append('g');

            panels.attr({
                transform: function (d) {
                    if (d.name) {
                        _namedPanels[d.name] = {
                            panel: d3.select(this),
                            width: d.width,
                            height: d.height,
                            x: d.x,
                            y: d.y
                        };
                    }
                    return d.transform;
                },
                'class': 'layout-panels'
            });

            function generatePanels (data, x, y, width, height) {
                var accumulatedWidth = 0;
                var accumulatedHeight = 0;

                var morePanels = [];

                var dimensions = {
                    x: x,
                    y: y,
                    transform: 'translate(' + x + ',' + y + ')',
                    name: data.name,
                    width: width,
                    height: height
                };

                gPanels.push(dimensions);

                if (data.panels) {
                    morePanels = data.panels.map(function (subPanel) {
                        generatePanels(subPanel, x + accumulatedWidth, y + accumulatedHeight, width * subPanel.width, height * subPanel.height);
                        if ('horizontal' === data.type) {
                            accumulatedWidth += width * subPanel.width;
                        }
                        if ('vertical' === data.type) {
                            accumulatedHeight += height * subPanel.height;
                        }

                    });
                }
            }

        };
    }

    plotviz.LayoutManager = LayoutManager;
    return plotviz;
}) (plotviz || {});
