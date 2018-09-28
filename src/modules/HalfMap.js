/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

"use strict";
import Tooltip from "./Tooltip";
import {setColorScale} from "./colors";

export default class HalfMap{
    constructor(data, useLog=true, logBase=10, colorScheme="Greys", tooltipId="tooltip"){
        this.data= data;
        this.useLog = useLog;
        this.logBase = logBase;
        this.colorScheme = colorScheme;

        this.xScale = undefined;
        this.yScale = undefined;
        this.colorScale = undefined;

        // peripheral features
        //// the tooltip
        if ($(`#${tooltipId}`).length == 0) $('<div/>').attr('id', tooltipId).appendTo($('body'));
        this.tooltip = new Tooltip(tooltipId);
        select(`#${tooltipId}`).classed('bubblemap-tooltip', true);
    }

    drawCanvas(canvas, dimensions={w:600, h:600, top:20, left:20}, showLabels=true){
        this._setScales(dimensions);

        let context = canvas.node().getContext('2d');
    }

    // private methods
    _setScales(dimensions={w:600, h:600, top:20, left:20}){
        if (this.xScale === undefined) this._setXScale(dimensions);
        if (this.yScale === undefined) this._setYScale(dimensions);
        if (this.colorScale === undefined) this._setColorScale(cDomain);
    }

    _setXScale(dim={w:600, left:20}){
        let xList = nest()
            .key((d) => d.displayX!==undefined?d.displayX:d.x) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        this.xScale = scaleBand() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(xList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            .range([dim.left, dim.left+dim.w])
            .padding(.05); // temporarily hard-coded value
    }

    _setYScale(dim={h:600, top:20}){
        // use d3 nest data structure to find the unique list of y labels
        // reference: https://github.com/d3/d3-collection#nests
        let yList = nest()
            .key((d) => d.y) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        this.yScale = scaleBand() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(yList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            .range([dim.top, dim.top+dim.h])
            .padding(.05); // temporarily hard-coded value
    }

    _setColorScale(domain){
        let useLog = this.useLog;
        let data = domain===undefined?this.data.map((d)=>useLog?this._log(d.value):d.value):domain;
        this.colorScale = setColorScale(data, this.colorScheme, undefined, undefined, true);
    }
}