/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

"use strict";
import {nest} from "d3-collection";
import {extent} from "d3-array";
import {select, selectAll} from "d3-selection";
import {scaleBand, scaleLinear} from "d3-scale";
import Tooltip from "./Tooltip";
import {setColorScale} from "./colors";

export default class BubbleMap {
    constructor(data, useLog=true, logBase=10, colorScheme="Reds", tooltipId = "tooltip"){
        this.data = data;
        this.useLog = useLog;
        this.logBase = logBase;
        this.colorScheme = colorScheme;

        // initiates additional attributes
        // this.xList = undefined;
        // this.yList = undefined;
        this.xScale = undefined;
        this.yScale = undefined;
        this.colorScale = undefined;
        this.bubbleScale = undefined;

        // peripheral features
        // Tooltip
        if ($(`#${tooltipId}`).length == 0) $('<div/>').attr('id', tooltipId).appendTo($('body'));
        this.tooltip = new Tooltip(tooltipId);
        select(`#${tooltipId}`).classed('bubblemap-tooltip', true);

        // Toolbar
        this.toolbar = undefined;
    }

    draw(dom, dimensions={w:1000, h:600}, columnLabelAngle=30, columnLabelPosAdjust=undefined, colorDomain=undefined, showLabels=true){
        if (this.xScale === undefined) this._setXScale(dimensions.w);
        if (this.yScale === undefined) this._setYScale(dimensions.h);
        if (this.colorScale === undefined) this._setColorScale(colorDomain);
        if (this.bubbleScale === undefined) this._setBubbleScale({max:this.xScale.bandwidth(), min: 1});

        // text labels
        if(showLabels) {
            // column labels
            let xLabels = dom.selectAll().data(this.xScale.domain())
                .enter().append("text")
                .attr("class", (d, i) => `bubble-map-xlabel x${i}`)
                .attr("x", 0)
                .attr("y", 0)
                .style("text-anchor", "start")
                .style("cursor", "default")
                .attr("transform", (d) => {
                    let x = this.xScale(d) + 5; // TODO: remove hard-coded value
                    let y = columnLabelPosAdjust === undefined ? this.yScale.range()[1] : this.yScale.range()[1] + columnLabelPosAdjust;
                    return `translate(${x}, ${y}) rotate(${columnLabelAngle})`;
                })
                .text((d) => d);

            // row labels
            let yLabels = dom.selectAll().data(this.yScale.domain())
                .enter().append("text")
                .attr("class", (d, i) => `bubble-map-ylabel y${i}`)
                .attr("x", this.xScale.range()[0])
                .attr("y", (d) => this.yScale(d) + 2)
                .style("text-anchor", "end")
                .style("cursor", "default")
                .text((d) => d);
        }
        // bubbles
        let bubbles = dom.selectAll(".bubble-map-cell")
            .data(this.data, (d)=>d.value)
            .enter()
            .append("circle")
            .attr("cx", (d)=>this.xScale(d.x) + this.xScale.bandwidth()/2)
            .attr("cy", (d)=>this.yScale(d.y))
            .attr("r", (d)=>this.bubbleScale(d.r))
            .style("fill", (d)=>this.colorScale(d.value))

    }

    // private methods
    _setXScale(width){
        // use d3 nest data structure to find the unique list of x labels
        // reference: https://github.com/d3/d3-collection#nests
        let xList = nest()
            .key((d) => d.x) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        console.log(xList);
        this.xScale = scaleBand() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(xList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            .range([0, width])
            .padding(.05); // temporarily hard-coded value
    }

    _setYScale(height){
        // use d3 nest data structure to find the unique list of y labels
        // reference: https://github.com/d3/d3-collection#nests
        let yList = nest()
            .key((d) => d.y) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        console.log(yList);
        this.yScale = scaleBand() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(yList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            .range([0, height])
            .padding(.05); // temporarily hard-coded value
    }

    _setColorScale(domain){
        let useLog = this.useLog;
        let data = domain===undefined?this.data.map((d)=>useLog?this._log(d.value):d.value):domain;
        this.colorScale = setColorScale(data, this.colorScheme, undefined, undefined, true);
    }

    _setBubbleScale(range={max:10, min:2}){
        this.bubbleScale = scaleLinear()
            .domain(extent(this.data.map((d)=>d.r)))
            .range([range.min, range.max]);

    }

    _log(v){
        const adjust = 1;
        return Math.log(Number(v+adjust))/Math.log(this.logBase);
    }


}

