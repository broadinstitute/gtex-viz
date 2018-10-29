/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
// bubbleMapUtil module contains functions that can be independently used for other projects besides bubbleMap
var bubbleMapUtil = (function(){
    var colorStock = {
        // reference: http://colorbrewer2.org/
        blues: ['rgb(247,251,255)','rgb(222,235,247)','rgb(198,219,239)','rgb(158,202,225)','rgb(107,174,214)','rgb(66,146,198)','rgb(33,113,181)','rgb(8,81,156)','rgb(8,48,107)'],
        reds: ['rgb(255,245,240)','rgb(254,224,210)','rgb(252,187,161)','rgb(252,146,114)','rgb(251,106,74)','rgb(239,59,44)','rgb(203,24,29)','rgb(165,15,21)','rgb(103,0,13)'],
        greys: ['rgb(255,255,255)','rgb(37,37,37)','rgb(0,0,0)'],
        oranges: ['rgb(255,245,235)','rgb(254,230,206)','rgb(253,208,162)','rgb(253,174,107)','rgb(253,141,60)','rgb(241,105,19)','rgb(217,72,1)','rgb(166,54,3)','rgb(127,39,4)'],
        greens: ['rgb(247,252,245)','rgb(229,245,224)','rgb(199,233,192)','rgb(161,217,155)','rgb(116,196,118)','rgb(65,171,93)','rgb(35,139,69)','rgb(0,109,44)','rgb(0,68,27)'],
        purples: ['rgb(252,251,253)','rgb(239,237,245)','rgb(218,218,235)','rgb(188,189,220)','rgb(158,154,200)','rgb(128,125,186)','rgb(106,81,163)','rgb(84,39,143)','rgb(63,0,125)'],

        // more options
        steelblues:['#f7fafc','#dee9f2','#c6d9e9','#adc8df','#95b8d6','#7da8cc','#6497c3','#4c87b9','#4076a3','#36648B'],

        // categorical
        '6class': ['#f7fafc','#809d79','#e66c54','#f5bd49','#7bb67f','#7c65ff'],

        // diverging
        bluered: ['#0571b0','#f7f7f7','#ca0020']
    };

    var checkDataIntegrity = function(mat){
        // data integrity
        if (mat === undefined) {
            throw 'Fatal Error: mat must be defined';
        }
        if (mat.x === undefined || mat.x.length == 0) {
            throw 'Fatal Error. mat.x must be provided';
        }
        if (mat.y === undefined || mat.y.length == 0) {
            throw 'Fatal Error. mat.y must be provided';
        }
        if (mat.data === undefined || mat.data.length == 0) {
            throw 'Fatal Error. mat.data must be provided';
        }

    };

    var setOrdinalScale = function(args){
        // this is used to set the X and Y scales
        return d3.scale.ordinal()
            .rangeBands(args.range, .1, 1)
            .domain(args.domain);
    };

    var setRscale = function(radius, max){
        //var max = d3.max(plot.mat.data, function(d){return d.r});
        if (max === undefined) max = 15; //hard-coded, global setting
        return d3.scale.sqrt() // for bubble heatmap, the bubble size (i.e. area)  ==> r (needs to use the square root function)
                        .domain([0, max])
                        .range([0, radius]);
    };

    var setCscale = function(dataType, data, max){
        var domain = [];
        var colors;
        switch(dataType){
            case 'diverging':
                max = max === undefined?d3.max(data, function(d){return Math.abs(d.value)}):max; // hmm, here data must be a list of objects with a key named 'value'
                domain = [-max, 0, max];
                colors = 'bluered';
                break;
            default:
                max = max === undefined?d3.max(data, function(d){return d.value}):max;
                domain = [0, max];
                colors = 'steelblues';
        }
        var range = colorStock[colors];
        return d3.scale.linear()
                        .domain(domain)
                        .range(range);
    };

    var createSvg = function(div, args, id, style){
        if(div === undefined) throw "Must provide svg DOM ID";
        if (args === undefined) args = {};
        var svgW = args.width===undefined?$("#" + div).width():args.width;
        var svgH = args.height===undefined?200:args.height;// TODO: hard-coded default value
        var svg = d3.select('#'+div).append('svg').attr({
            width: svgW,
            height: svgH
        });
        if(id !== undefined) svg.attr('id', id);
        if(style !== undefined) svg.style(style);
        return svg;
    };

    var makeColumnLabels = function(g, data, scale, ypos){
        var id = 'xLabel';
        var style = {
            'font-size': 12,
            'font-family': 'arial',
            'fill': '#aaa'
        };
        var gg = g.select('#'+id);
        gg = gg.empty()?g.append('g').attr('id',id):gg; // for easier transformation event handling
        var angle = -90;

        var _rotate = function(d){
            var x = scale(d) + 4;
            return 'translate('+x +','+ypos+') rotate(' + angle + ')'
        };

        // rendering
        var cols = gg.selectAll('.xlab').data(data, function(d){return d});
        cols.enter().append('text').text(function(d){return d});
        cols.exit().remove();

        cols.attr({
                    x: 0,
                    y: 0,
                    'class': 'xlab',
                    'col': function(d){return d},
                    'text-anchor': 'end'

                })
                .attr(style)
                .attr('transform', _rotate);
        return cols;
    };

    var makeRowLabels = function(g, data, scale, onLeft, xadjust, yadjust){
        var id = 'yLabel';
        var style = {
            'font-size': 12,
            'font-family': 'arial',
            'fill': '#aaa'
        };
        var gg = g.select('#'+id); // d3 <g>
        gg = gg.empty()?g.append('g').attr('id',id):gg;

        // helper functions

        var findLast = function(){
            return scale(data[data.length-1]);
        };

        // d3 rendering
        var rows = gg.selectAll('text').data(data, function(d){return d});
        rows.enter().append('text').text(function(d){return d});
        rows.exit().remove();
        rows.attr({
                    x: function(){
                        if (onLeft) {
                            return 0 + xadjust;
                        }
                        return findLast() + xadjust;
                    },
                    y: function(d){
                        if (yadjust !== undefined) {
                            return scale(d) + yadjust;
                        }

                        return (2/3)*scale.rangeBand()
                    },
                    'text-anchor': function(){
                        if (onLeft) {
                            return 'end'
                        }
                        return 'start'
                    },
                    'row': function(d){return d}
                })
                .attr(style)
                .classed('ylab', true);

        return rows;
    };

    var makeColumnMarkers = function(args){
        var id = 'xMarkerGroup'; // TODO: review hard-coded dependency
        var gg = args.g.select('#'+id);
        gg = gg.empty()?args.g.append('g').attr('id', id):gg;
        if (args.data === undefined) return;
        var scale = args.xscale;
        var data = args.data;

        var getX = function(d){return scale(d)};
        var myClass = 'xMarker';
        var markers = gg.selectAll('.' + myClass).filter(function(){return !d3.select(this).classed('sortMarker')}).data(data, function(d){return d});
        markers.enter().append('path');
        markers.exit().remove();
        markers.attr({
                d: d3.svg.symbol().type("triangle-down"),
                'class': myClass,
                'fill': 'none',
                col: function(d){return d}

            })
            .attr('transform', function(d){return 'translate('+getX(d)+','+args.markerAdjust+') scale(0.75)'});
        return markers;
    };

    var makeCircles = function(g, scale, data){
        var circles = g.selectAll('.dcircle').data(data, function (d) {return d.x + d.y});
        circles.enter().append('circle');
        circles.exit().remove();
        circles.attr({
            cx: function (d) {return scale.X(d.x).toFixed(2);},
            cy: function (d) {return scale.Y(d.y).toFixed(2);},
            r: function (d) {return scale.R(d.r).toFixed(2);},
            fill: function (d) {
                var toFilter = d.filters? d3.values(d.filters).filter(function(d){return d}):[];
                return toFilter.length>0?'#eee':scale.C(d.value);
            },
            'class': function () {return 'dcircle';}, // TODO: hard-coded dom class
            col: function (d) {return d.x},
            row: function (d) {return d.y}
        });
    };

    var makeLegend = function (div, title, radiusTitle, scale, cellW) {
        // TODO: hard-coded...
        $('#' + div).html("");
        var dim = {
            width: 450,
            height: 60
        };
        var svg = createSvg(div, dim);

        // legend title
        var g = svg.append('g').attr('id', '#cLegend');
        var initX = 10;
        var initY = 20;
        g.append('text')
            .text(title)
            .attr({
                x: initX,
                y: initY,
                'font-size': 10,
                fill: 'black'
            });

        // rectangles
        var w = cellW;
        var data = d3.range(-1.0, 1.2, 0.2);
        initX += 10;
        initY += 10;
        var colors = [];
        g.selectAll('rect')
            .data(data)
            .enter()
            .append('rect')
            .attr({
                width: w,
                height: w,
                x: function (d, i) {return initX + i * w},
                y: initY,
                fill: function (d) {
                    colors.push(scale.C(d));
                    return scale.C(d)
                }
            });
        data = data.map(function (d) {
            return d.toFixed(1)
        });

        // axis labels
        g.selectAll('.clabels')
            .data(data)
            .enter()
            .append('text')
            .text(function (d) {
                return d
            })
            .attr({
                x: function (d, i) {return initX + i * w + 2},
                y: initY + 10 + w,
                'font-size': 6,
                fill: function (d, i) {return i % 2 == 1 ? 'black' : '#aaa'}
            });

        // radius (bubble size) legend
        g = svg.append('g').attr('id', '#rLegend');
        initX -= 10;
        initY -= 10;
        initX = initX + (data.length + 2) * w;
        g.append('text')
            .text(radiusTitle)
            .attr({
                x: initX,
                y: initY,
                'font-size': 10,
                fill: 'black'
            });

        // bubbles
        //var maxR = d3.max(data, function (d) {
        //    return d.r
        //});
        data = [30, 20, 10, 5, 2, 1]; // hard-coded!

        initX += 10;
        initY += 10;

        g.selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr({
                cx: function (d, i) {return initX + i * w},
                cy: initY + (w / 2),
                fill: scale.C(-1),
                r: function (d) {
                    return scale.R(d)
                }
            });

        // axis labels
        initX -= 5; // adjusting the X position, kind of a hack...
        g.selectAll('.rlabels')
            .data(data)
            .enter()
            .append('text')
            .text(function (d) {
                return d
            })
            .attr({
                x: function (d, i) {return initX + i * w},
                y: initY + 10 + w,
                'font-size': 6,
                fill: 'black'
            });
    };

    var createDialog = function(parentDivId, dialogDivId, title){
        // jquery UI dialog
        var template = '' +
            '<div id="' + dialogDivId + '" title="' + title + '">' +
                '<div class="bbMap-clear">Clear All</div>' +
                '<div class="bbMap-content"></div>' +
            '</div>';

        var $modal = $('#' + parentDivId).append(template);
        $('#' + dialogDivId).dialog({
            autoOpen: false,
            'position': [20,20]
        });
        $('#' + dialogDivId).dialog('moveToTop');

       $('.bbMap-clear').click(function(){
            $('.bbMap-content').empty();
        });
    };

    var createCanvas = function(div, width, height, margin, className){

        d3.select('#' + div).select('canvas').remove(); // remove existing canvas
        if(className !== undefined) d3.select('#' + div).classed(className, true);
        var canvas = d3.select('#' + div).style('position', 'relative')
            .append('canvas')
            .attr({
                width: width + margin,
                height: height + 10 //TODO: remove hard-coded...
            })
            .style(
                {position: 'absolute'}
            );
        return canvas;
    };

    var renderCanvas = function(canvas, scale, data){ // this is for the mini bubble heatmap
        var context = canvas.node().getContext('2d');

        // background
        context.fillStyle = '#fff';
        context.rect(0, 0, canvas.attr('width'), canvas.attr('height'));
        context.fill();

        // no data binding
        data.forEach(function(d){
            var filterlist = d.filters?d3.values(d.filters).filter(function(d){return d}):[]; // if any of the values is true, then the data point is to be filtered
            context.beginPath();
            context.fillStyle = filterlist.length>0?'#eee':scale.C(d.value);
            context.arc(scale.X(d.x), scale.Y(d.y), scale.R(d.r), 0, 2*Math.PI);
            context.fill();
            context.closePath();
        });
    };

    var createBrush = function(scale, ext, svg, height){

        // create a brush
        var brush = d3.svg.brush()
            .x(scale.X) // move only along the x axis
            .extent(ext);


        svg.append('g')
            .attr('id', 'bbrush')// TODO: hard-coded id name
            .call(brush)
            .selectAll('rect')
            .attr('height', height)
            .style({
                 'stroke-width': 0,
                 opacity: 0.30
            });
        return brush;

    };

    return {
        // data related
        checkDataIntegrity: checkDataIntegrity,
        setOrdinalScale: setOrdinalScale,
        setCscale: setCscale,
        setRscale: setRscale,

        // D3
        createSvg: createSvg,
        makeRowLabels: makeRowLabels,
        makeColumnLabels: makeColumnLabels,
        makeColumnMarkers: makeColumnMarkers,
        makeCircles: makeCircles,
        makeLegend: makeLegend,

        // jQuery UI
        createDialog: createDialog,

        // canvas
        createCanvas: createCanvas,
        renderCanvas: renderCanvas,

        // brush
        createBrush: createBrush
    }
})();

