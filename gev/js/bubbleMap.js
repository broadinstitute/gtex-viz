/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var bubbleMap = function(mat, config) {
    var self = this;

    /* bubbleMap's mat has the following json structure
     mat = {
         y:[]
         x:[]
         data:[ // a list of the following data object
             {
                 x:xLabel,
                 y:yLabel,
                 value:value, // color range
                 r: value2 // bubble size (i.e. the area of the circle)
            },
            ...
         ]
     }
     */
    var svgDivId = config.bbMapDiv;
    var mat = mat; // mutable
    var padding = config.padding;
    var height, width;
    var cellW = config.zoomCellW||15;
    var cellH = cellW;

    this.svg; // should use a getter
    this.scale;
    this.zoomGroup = undefined;
    this.bubbleEvents = {};
    this.id = config.id;
    this.tooltip;

    // prototype functions
    this.init = function () {
        var top = (config.needMini)?parseInt(d3.select('#' + config.bbMapCanvasDiv).select('canvas').attr('height')):50;
        d3.select('#' + svgDivId).attr('style', 'position: relative; top:' + top + 'px;' );
        this.svg = bubbleMapUtil.createSvg(svgDivId);
        setParams(); // TODO: review
        this.draw(false);
    };

    this.getPadding = function(){
        return padding;
    };

    this.getCellSize = function(){
        return cellW;
    };

    this.draw = function(isUpdate){
        setScales(); // Note: bubbleMap has a radius scale that determines the size of the bubbles
        if(isUpdate) checkHeight();
        render(isUpdate);
    };

    this.update = function(newmat, state){
        var isUpdate = true;
        mat = newmat;

        this.draw(isUpdate);
    };

    // private functions
    function setParams() {
        bubbleMapUtil.checkDataIntegrity(mat);

        // tooltip
        self.tooltip = new toolTip(self.svg, config.tooltipId);


        if (padding === undefined) {
            padding = {left: 0, top: 0};
        }
        else {
            ['top', 'left'].forEach(function (d) {
                if (padding[d] === undefined) padding[d] = 0;
            });
        }
        // height = self.svg.attr('height') - (padding.top); // bubble map's height
        checkHeight();
        width = config.width=== undefined? self.svg.attr('width') - (padding.left*2):config.width - (padding.left*2);
    }

    function checkHeight(){
        // adjusting the heatmap and svg height based on data

        // adjust svg according to the zoomMap
        var _adjustMapH = function(){
            var l = mat.y.length;
            if (self.scale === undefined) setScales();
            var h = self.scale.Y.rangeBand() * l;
            return h;
            // return h > height?h:height;
        };

        var _adjustSvgH = function(){
            var columnLabelSpace = 220; // TODO: remove hard-coded values
            //if(config.needMini) padding.top = padding.top + parseInt(d3.select('#' + config.bbMapCanvasDiv).select('canvas').attr('height'));

            // var h = height + (padding.top*2) + columnLabelSpace;
            return _adjustMapH() + padding.top*2 + columnLabelSpace;
            // var svgH = self.svg.attr('height');
            // return h >svgH? h:svgH;
        };

        // height = _adjustMapH();
        height = _adjustMapH();
        self.svg.attr('height', _adjustSvgH());
    }

    function setScales(){
        self.scale = {
            X:bubbleMapUtil.setOrdinalScale({
                range: [0, cellW * mat.x.length], // NOTE: this range is for the entire heat map, not just the partial map that's visible
                domain: mat.x
            }),
            Y: bubbleMapUtil.setOrdinalScale({
                range: [0, (cellW * mat.y.length) + 50], // NOTE: this is not the SVG height
                domain: mat.y
            }),
            C: bubbleMapUtil.setCscale(config.dataType, mat.data, 1),
            R: bubbleMapUtil.setRscale(cellW/2, 30)
        }
    }

    function render(update) {
        var zoomId = config.id + 'Zoom';
        if(!update) {
            self.zoomGroup = self.svg.append('g')
                .attr({
                    'id': zoomId
                });
            var initX = padding.left;
            var initY = padding.top;
            self.zoomGroup.attr('transform', 'translate(' + initX + ',' + initY + ')');
            bubbleMapUtil.makeLegend(config.legendDiv, config.colorTitle, config.radiusTitle, self.scale, cellW);

        }

        var ypos = self.scale.Y(mat.y[mat.y.length - 1]) + (2.5 * self.scale.Y.rangeBand());
        bubbleMapUtil.makeColumnLabels(self.zoomGroup, mat.x, self.scale.X, ypos);
        bubbleMapUtil.makeRowLabels(self.zoomGroup, mat.y, self.scale.Y, true, -24, 4);
        bubbleMapUtil.makeCircles(self.zoomGroup, self.scale, mat.data);

    }

};

