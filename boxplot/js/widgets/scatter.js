function scatter (config) {
    'use strict';

    var _width = 1000,
        _height = 1000,
        _margin = {
            top: 0.1,
            right: 0.1,
            bottom: 0.1,
            left: 0.1
        },
        _data = config.data || [],
        _divId = '#scatter';

    var _container = null,
        _svg = null,
        _viewer = null;

    _width = config.width || _width;
    _height = config.height || _height;
    _margin = config.margin || _margin;
    _data = config.data || _data;
    _divId = config.divId || '#scatter';

    _container = d3.select(_divId).append('svg');
    _svg = _container.append('g');

    _svg.append('rect').attr('id', 'border');
    _svg.append('g').attr('id', 'viewer');
    _svg.append('g').attr('id', 'bottomAxis');
    _svg.append('g').attr('id', 'leftAxis');

    function plot () {
        var margin = {
            'top': _margin.top * _height,
            'right': _margin.right * _width,
            'bottom': _margin.bottom * _height,
            'left': _margin.left * _width
        };

        var width = _width - margin.left - margin.right,
            height = _height - margin.top - margin.bottom;
        

        _container.attr({
            'width': width + margin.left + margin.right,
            'height': height + margin.top + margin.bottom
        });

        _svg.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        _svg.select('g#viewer').attr({
            'width': width,
            'height': height,
        });

        _svg.select('#border').attr({
            'width': width,
            'height': height,
        }).style({
            'fill': 'none',
            'stroke-width': 2,
            'stroke': 'black'
        });

        _svg.select('g#bottomAxis').attr({
            'transform': 'translate(' + 0 + ',' + height + ')'
        });


        var x = d3.scale.linear()
            .domain([d3.min(_data, function (d) {return d.x;}),
                    d3.max(_data, function (d) {return d.x;})])
            .range([0, width]);

        var y = d3.scale.linear()
            .domain([d3.min(_data, function (d) {return d.y;}),
                    d3.max(_data, function (d) {return d.y;})])
            .range([height, 0]);

        addLeftAxis(y);
        addBottomAxis(x);
        addPoints(_data, x, y);
    }

    function addLeftAxis (scale) {
        var leftAxis = d3.svg.axis()
            .scale(scale)
            .orient('left');

        _svg.select('g#leftAxis').call(leftAxis);
    }

    function addBottomAxis (scale) {
        var bottomAxis = d3.svg.axis()
            .scale(scale)
            .orient('bottom');

        _svg.select('g#bottomAxis').call(bottomAxis);
    }

    // Adds the scatter plot points. Currently they are circles
    // @param: data - The data for the points' x and y coordinates
    // @param: x - An SVG scale for the x coordinate mapping to pixels
    // @param: y - An SVG scale for the x coordinate mapping to pixels
    function addPoints (data, x, y) {
        var update = _svg.select('g#viewer').selectAll('circle')
            .data(data);

        update.exit().remove();
        update.enter().append('circle');
        update.attr({
            'cx': function (d) {return x(d.x);},
            'cy': function (d) {return y(d.y);},
            'r': 3
        });
    }

    plot.width = function (value) {
        if (!arguments.length) return _width;
        _width = value;
        return scatter;
    };

    plot.height = function (value) {
        if (!arguments.length) return _height;
        _height = value;
        return scatter;
    };

    plot.margin = function (value) {
        if (!arguments.length) return _margin;
        _margin = value;
        return scatter;
    };

    return plot;
}
