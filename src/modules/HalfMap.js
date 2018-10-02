/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

"use strict";
import Tooltip from "./Tooltip";
import {drawColorLegend, setColorScale} from "./colors";
import {select, selectAll, mouse} from "d3-selection";
import {nest} from "d3-collection";
import {scaleBand, scaleLinear} from "d3-scale";


export default class HalfMap{
    constructor(data, cutoff = 0.0, useLog=true, logBase=10, colorScheme="Greys", tooltipId="tooltip"){
        this.data= data;
        this.cutoff = cutoff;
        console.log(this.data);
        this.useLog = useLog;
        this.logBase = logBase;
        this.colorScheme = colorScheme;

        this.xScale = undefined;
        this.yScale = undefined;
        this.colorScale = undefined;
        this.labelScale = undefined;

        // peripheral features
        //// the tooltip
        if ($(`#${tooltipId}`).length == 0) $('<div/>').attr('id', tooltipId).appendTo($('body'));
        this.tooltip = new Tooltip(tooltipId);
        select(`#${tooltipId}`).classed('bubblemap-tooltip', true);
    }

    draw(canvas, svg, dimensions={w:600, top:20, left:20}, colorScaleDomain=[0,1], showLabels=true, labelAngle=90){
        this._drawCanvas(canvas, dimensions, colorScaleDomain, showLabels);
        this._drawSvg(svg, dimensions, showLabels, labelAngle);
    }

    drawColorLegend(dom, legendConfig={x:0, y:0}, ticks=5, unit=""){
        drawColorLegend(unit, dom, this.colorScale, legendConfig, this.useLog, ticks, this.logBase, {h:20, w:10}, "v");
    }

    // private methods
    _drawCanvas(canvas, dimensions={w:600, top:20, left:20}, colorScaleDomain=[0,1]){
        this._setScales(dimensions, colorScaleDomain);
        let visibleData = this._filter(this.data, this.cutoff);
        let context = canvas.node().getContext('2d');

        // transform the canvas
        context.save();
        context.translate(dimensions.left , dimensions.top + (this.xScale.bandwidth()*Math.sqrt(2)/2)); // shift the radius distance...
        context.rotate(Math.PI*(-45/180)); // rotate counterclockwise (negative) 45 degrees

        // LD canvas rendering from GEV old code
        visibleData.forEach((d)=>{
            let x = this.xScale(d.x);
            let y = this.yScale(d.y);
            context.fillStyle = this.colorScale(d.value);
            context.fillRect(x, y, this.xScale.bandwidth(), this.yScale.bandwidth());
        });
        context.restore();
    }

    _drawSvg(svg, dimensions, showLabels=true, labelAngle=90){
        if(showLabels){
            this._setLabelScale(dimensions);
            svg.selectAll().data(this.labelScale.domain())
                .enter()
                .append("text")
                .attr("class", (d, i) => `half-map-label l${i}`)
                .attr("x", 0)
                .attr("y", 0)
                .style("text-anchor", "start")
                .style("cursor", "default")
                .attr("transform", (d) => {
                    let x = this.labelScale(d) + 5; // TODO: remove hard-coded value
                    let y = -5;
                    return `translate(${x}, ${y}) rotate(-${labelAngle})`;
                })
                .text((d)=>d)
        }

        let cursor = svg.append('rect')
            .attr('class', 'half-map-cursor')
            .attr("x", 0)
            .attr("y", 0)
            .style("width", this.xScale.bandwidth())
            .style("height", this.xScale.bandwidth())
            .style("stroke", "#d2111b")
            .style("stroke-width", 2);

        select(svg.node().parentNode).on('mousemove', function(){
            let pos = mouse(this);
            console.log(pos);
        })
    }

    /**
     * Filter redundant data in a symmetrical matrix
     * @param data
     * @param cutoff {Number} filter data by this minimum value
     * @returns {*}
     * @private
     */
    _filter(data, cutoff){
        let pairs = {};
        // // first sort the data based on the x, y alphabetical order
        data.sort((a, b)=>{
            if(a.x < b.x) return -1;
            if (a.x > b.x) return 1;
            else {
                if (a.y < b.y) return -1;
                if (a.y > b.y) return 1;
                return 0;
            }
        });
        return data.filter((d)=>{
            // check redundant data
            let p = d.x + d.y;
            let p2 = d.y + d.x;
            if (pairs.hasOwnProperty(p) || pairs.hasOwnProperty(p2)) return false;
            pairs[p] = true;
            if (d.value < cutoff) return false;
            return true;
        });
    }

    _setScales(dimensions={w:600, top:20, left:20}, colorScaleDomain=[0,1]){
        if (this.xScale === undefined) this._setXScale(dimensions);
        if (this.yScale === undefined) this._setYScale(dimensions);
        if (this.colorScale === undefined) this._setColorScale(colorScaleDomain);
    }

    _setXScale(dim={w:600}){
        let xList = nest()
            .key((d) => d.displayX!==undefined?d.displayX:d.x) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        this.xScale = scaleBand() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(xList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            // .range([dim.left, dim.left+(dim.w/Math.sqrt(2))])
            .range([0, dim.w/Math.sqrt(2)])
            .padding(.05); // temporarily hard-coded value
    }

    _setYScale(dim={w:600}){
        // use d3 nest data structure to find the unique list of y labels
        // reference: https://github.com/d3/d3-collection#nests
        let yList = nest()
            .key((d) => d.y) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        this.yScale = scaleBand() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(yList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            // .range([dim.top, dim.top+(dim.w/Math.sqrt(2))])
            .range([0, dim.w/Math.sqrt(2)])
            .padding(.05); // temporarily hard-coded value
    }

    _setLabelScale(dim={w:600}){
        if (this.xScale === undefined) this._setXScale();
        let xList = this.xScale.domain();
        this.labelScale = scaleBand()
            .domain(xList)
            .range([0, dim.w])
            .padding(.05)
    }

    _setColorScale(domain){
        let useLog = this.useLog;
        let data = domain===undefined?this.data.map((d)=>useLog?this._log(d.value):d.value):domain;
        this.colorScale = setColorScale(data, this.colorScheme);
    }
}