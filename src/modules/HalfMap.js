/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

"use strict";
import Tooltip from "./Tooltip";
import {drawColorLegend, setColorScale} from "./colors";
import {select, selectAll, mouse, event} from "d3-selection";
import {nest} from "d3-collection";
import {scaleBand, scaleLinear} from "d3-scale";


export default class HalfMap{
    /**
     *
     * @param data {Object} TODO: describe the data structure
     * @param cutoff
     * @param useLog
     * @param logBase
     * @param colorScheme
     * @param tooltipId
     */
    constructor(data, cutoff = 0.0, useLog=true, logBase=10, colorScheme="Greys", tooltipId="tooltip"){
        this.data= data;
        this.dataDict = {};
        this.cutoff = cutoff;
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
        this.tooltip = new Tooltip(tooltipId, false, 40, 0);
        select(`#${tooltipId}`).classed('half-map-tooltip', true);
    }

    draw(canvas, svg, dimensions={w:600, top:20, left:20}, colorScaleDomain=[0,1], showLabels=true, labelAngle=90){
        this._drawCanvas(canvas, dimensions, colorScaleDomain, showLabels);
        let drawCells = false;
        this.drawSvg(svg, dimensions, drawCells, showLabels, labelAngle);
    }

    drawColorLegend(dom, legendConfig={x:0, y:0}, ticks=5, unit=""){
        drawColorLegend(unit, dom, this.colorScale, legendConfig, this.useLog, ticks, this.logBase, {h:20, w:10}, "v");
    }

    // private methods
    _log(v){
        const adjust = 1;
        return Math.log(Number(v+adjust))/Math.log(this.logBase);
    }
    _drawCanvas(canvas, dimensions={w:600, top:20, left:20}, colorScaleDomain=[0,1]){
        this._setScales(dimensions, colorScaleDomain);
        let visibleData = this._filter(this.data, this.cutoff);
        let context = canvas.node().getContext('2d');

        // transform the canvas
        context.save();
        context.translate(dimensions.left , dimensions.top + (this.xScale.bandwidth()*Math.sqrt(2)/2)); // shift the radius distance...
        context.rotate(Math.PI*(-45/180)); // rotate counterclockwise (negative) 45 degrees
        context.clearRect(0,0,dimensions.w, dimensions.w);

        // LD canvas rendering from GEV old code
        visibleData.forEach((d)=>{
            let x = this.xScale(d.x);
            let y = this.yScale(d.y);
            d.color = d.value==0?"#fff":this.useLog?this.colorScale(this._log(d.value)):this.colorScale(d.value);
            context.fillStyle = this.colorScale(d.value);
            // console.log(d);
            context.fillRect(x, y, this.xScale.bandwidth(), this.yScale.bandwidth());
            // uncomment the following for debugging
            // context.textAlign = 'left';
            // context.fillStyle = 'white';
            // context.font = '10px Open Sans';
            // context.fillText(d.x+' '+d.y, x+10, y+10);
        });
        this.dataDict = this._generateDataDict(visibleData);
        context.restore();
    }

    drawSvg(svg, dimensions, drawCells=true, showLabels=true, labelAngle=90, colorScaleDomain=[0,1]){
        if (drawCells){
            this._setScales(dimensions, colorScaleDomain);
            let mapG = svg.append("g")
                .attr("clip-path", "url(#clip)");
            let cells = mapG.selectAll(".half-map-cell")
                .data(this._filter(this.data, this.cutoff));

            // add new rects
            cells.enter()
                .append("rect")
                .attr("class", "half-map-cell")
                .attr("row", (d)=>`y${this.yScale.domain().indexOf(d.y)}`)
                .attr("column", (d)=>`x${this.xScale.domain().indexOf(d.x)}`)
                .attr("width", this.xScale.bandwidth())
                .attr("height", this.yScale.bandwidth())
                .attr("x", (d)=>this.xScale(d.x))
                .attr("y", (d)=>this.yScale(d.y))
                .attr("transform", `rotate(-45)`)
                .merge(cells)
                .style("fill", (d)=>d.value==0?"#fff":this.useLog?this.colorScale(this._log(d.value)):this.colorScale(d.value))


        }

        if(showLabels){
            this._setLabelScale(dimensions);
            svg.selectAll().data(this.labelScale.domain())
                .enter()
                .append("text")
                .attr("class", (d, i) => `half-map-label l${i}`)
                .attr("x", 0)
                .attr("y", 0)
                .style("text-anchor", "start")
                .style("cursor", "none")
                .attr("transform", (d) => {
                    let x = this.labelScale(d) + this.labelScale.step()/2;
                    let y = -5;
                    return `translate(${x}, ${y}) rotate(-${labelAngle})`;
                })
                .text((d)=>d)
        }

        let cursor = svg.append('rect')
            .attr('class', 'half-map-cursor')
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.xScale.bandwidth())
            .attr("height", this.yScale.bandwidth())
            .style("stroke", "#d2111b")
            .style("stroke-width", 1)
            .style("fill", "none")
            .style("display", 'none');
        svg.on('mouseout', ()=>{
            cursor.style("display", "none");
            this.tooltip.hide();
            svg.selectAll('.half-map-label').classed('highlighted', false);
        });
        select(svg.node().parentNode)
            // .style("cursor", "none")
            .on('mousemove', () => {
                let pos = mouse(svg.node()); // retrieve the mouse position relative to the SVG element
                let x = pos[0];
                let y = pos[1];

                // find the colliding cell's coordinates (before transformation)
                let radian = Math.PI*(45/180); // the radian at 45 degree angle
                let x2 = x*Math.cos(radian) - y*Math.sin(radian) + this.xScale.step()/2;
                let y2 = x*Math.sin(radian) + y*Math.cos(radian) - this.yScale.step()/2;
                if (x < 0 || y<0 || x2 < 0 || y2<0) {
                    this.tooltip.hide();
                    cursor.style("display", "none");
                    return;
                }
                let i = Math.floor(x2/this.xScale.step());
                let j = Math.floor((y2)/this.yScale.step());
                // show tooltip
                let col = this.xScale.domain()[i];
                let row = this.yScale.domain()[j];
                let cell = this.dataDict[col+row];
                // console.log([x, y, x2, y2, col, row]) // debugging
                if (cell !== undefined) {

                    cursor.attr('transform', `translate(${x},${y}) rotate(-45)`);
                    cursor.style("display", "block");

                    this.tooltip.show(`${col}<br/> ${row}<br/> Value: ${cell.displayValue}`);
                    if(showLabels){
                        svg.selectAll('.half-map-label').classed('highlighted', false); // clear previous highlighted labels
                        svg.select(`.l${i}`).classed('highlighted', true);
                        svg.select(`.l${j}`).classed('highlighted', true);
                    }
                }
            })
            .on('mouseout', () => {
                cursor.style("display", "none");
                this.tooltip.hide();
                svg.selectAll('.half-map-label').classed('highlighted', false);
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
            if (this.xScale(d.x) === undefined) return false; // filter the data that are not going to be rendered
            return true;
        });
    }

    /**
     * Generate a data dictionary indexed by x and y, for fast data look up
     * @param data {List}: a list of objects with attributes x and y
     * @private
     */
    _generateDataDict(data){
        let dict = {};
        data.forEach((d)=>{
            dict[d.x+d.y] = d;
            dict[d.y+d.x] = d;
        });
        return dict;
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