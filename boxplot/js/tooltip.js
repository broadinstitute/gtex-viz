/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function Tooltip (container) {
        var _div = container;

        var _tooltip = d3.select(_div).append('div')
            .attr('class', 'plotviz-tooltip')
            .style({
                    position: 'absolute',
                    left: '0px',
                    top: '0px'
                });

        hide();

        function move (x, y) {
            _tooltip.style({
                    left: x + 'px',
                    top: y + 'px'
                });

        }

        function tooltipClass (newClass) {
            if (newClass) {
                _tooltip.attr('class', newClass);
                return this;
            } else {
                _tooltip.attr('class');
            }
        }

        function text (content) {
            if (content) {
                _tooltip.html(content);
                return this;
            } else {
                return _tooltip.html();
            }
        }

        function show () {
            _tooltip.style('display', '');
        }

        function hide() {
            _tooltip.style('display', 'none');
        }

        return {
                show: show,
                hide: hide,
                tooltipClass: tooltipClass,
                move: move,
                text: text
            };
    }

    plotviz.Tooltip = Tooltip;

    return plotviz;
}) (plotviz || {});
