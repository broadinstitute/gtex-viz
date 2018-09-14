/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function Crosshair (svg, id, data) {
        var crosshairLineLength = 20;
        var _svg = svg;
        var _id = id;
        var _crosshair = null;

        _crosshair = _svg.append('g')
            .attr('class', 'crosshair')
            .attr('transform', 'translate(' + data.x + ',' + data.y + ')');

        _crosshair
          .selectAll('line')
            .data([
                {
                    x1: -crosshairLineLength,
                    y1: 0,
                    x2: crosshairLineLength,
                    y2: 0
                },
                {
                    x1: 0,
                    y1: data.height - crosshairLineLength,
                    x2: 0,
                    y2: data.height + crosshairLineLength
                }
            ])
          .enter().append('line')
            .attr({
                x1: function (d) { return d.x1; },
                y1: function (d) { return d.y1; },
                x2: function (d) { return d.x2; },
                y2: function (d) { return d.y2; }
            })
            .style({
                stroke: 'red',
                'stroke-width': 1,
                display: ''
            });

        this.show = function () { _crosshair.selectAll('line').style('display', ''); };
        this.hide = function () { _crosshair.selectAll('line').style('display', 'none'); };

        this.move = function (x, y) {
            _crosshair
              .selectAll('line')
                .data([
                    {
                        x1: -crosshairLineLength,
                        y1: y,
                        x2: crosshairLineLength,
                        y2: y
                    },
                    {
                        x1: x,
                        y1: data.height - crosshairLineLength,
                        x2: x,
                        y2: data.height + crosshairLineLength
                    }
                ])
                .attr({
                    x1: function (d) { return d.x1; },
                    y1: function (d) { return d.y1; },
                    x2: function (d) { return d.x2; },
                    y2: function (d) { return d.y2; }
                })
                .style({
                    stroke: 'red',
                    'stroke-width': 1,
                });
           };

    }

    plotviz.Crosshair = Crosshair;

    return plotviz;
}) (plotviz || {});
