/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var bubbleMapMini = function(mat, config){
    //bubbleMap.call(this, mat, config, _mat); // bubbleMapMini calls bubbleMap as its prototype
    var self = this;
    var mat = mat;
    //this._mat = _mat||mat;
    var minCellW = 2;
    var maxCellW = 5;
    var minH = 40; // TODO: get rid of hard-coded value
    var cellW, cellH;
    var height = config.height;
    var width = config.width;

    this.canvas;
    this.scale = {};

    this.init = function(){
        bubbleMapUtil.checkDataIntegrity(mat);
        setDimensions();
        setScales();
        render();
    };


    this.update = function(data){
        mat = data;
        setDimensions();
        setScales();
        render();
    };

    function render(){
        // TODO: what is the best way to rerender canvas?
        self.canvas = bubbleMapUtil.createCanvas(config.bbMapCanvasDiv, width, height, cellW*2, 'bbMap-canvas');
        bubbleMapUtil.renderCanvas(self.canvas, self.scale, mat.data);
    }

    function setDimensions(){
        var _initConfigWidth = function(){
            if (typeof width == "undefined") return $('#' + config.bbMapCanvasDiv).width()*0.8; // default to an arbitrary value
            return width;
        };
        var _setCellW = function () {
            var l = mat.x.length;
            var w = width / l;
            var min = minCellW;
            var max = maxCellW;
            return (w < min) ? min : ((w > max) ? max : w);
        };
        var _adjust = function () {
            var w = cellW * mat.x.length;
            return (w > width) ? w : width;
        };
        width = _initConfigWidth();
        cellW = _setCellW();

        width = _adjust(); // re-adjust config.width

        // height
        cellH = cellW;
        height = cellH * mat.y.length>minH?cellH * mat.y.length:minH;

    }
    function setScales(){
        self.scale = {
            X: bubbleMapUtil.setOrdinalScale({
                range: [0, width],
                domain: mat.x
            }),
            Y: bubbleMapUtil.setOrdinalScale({
                range: [15, height], // hard-coded
                domain: mat.y
            }),
            C: bubbleMapUtil.setCscale(config.dataType, mat.data, 1), // hard-coded max value
            R: bubbleMapUtil.setRscale(cellW/2) // maxR = self.config.cellW/2
        };
    }

};

