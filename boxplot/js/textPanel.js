/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function TextPanel (container, id, config) {
        var _id = id;
        var _panel = container;
        var _text = null;

        _text = _panel.append('text').attr('class', 'plotviz-text');

        function render (data, unvalidatedConfig) {
            function validate (config) {
                return {
                        width: config.width,
                        height: config.height,
                        x: config.x || 0.5,
                        y: config.y || 0.5,
                        rotation: config.rotation ? config.rotation : 0,
                        'class': config.class || null
                    };
            }

            var config = validate(unvalidatedConfig);

            _text.attr('transform', 'translate(' + (config.x * config.width) + ',' + (config.y * config.height) + ') rotate(' + (-config.rotation) + ')')
                .attr('class', 'plotviz-text' + (config.class ? ' ' + config.class : ''))
                .text(data.content);
        }

        this.render = render;

    }

    plotviz.TextPanel = TextPanel;

    return plotviz;
}) (plotviz || {});
