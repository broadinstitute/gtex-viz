/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

"use strict";
import {nest} from "d3-collection";
import {extent, max, min} from "d3-array";
import {select, selectAll} from "d3-selection";
import {scaleBand, scaleLinear, scaleSqrt} from "d3-scale";
import Tooltip from "./Tooltip";
import {setColorScale, drawColorLegend} from "./colors";

export default class BubbleMap {
    constructor(data, useLog=true, logBase=10, colorScheme="Reds", tooltipId = "tooltip"){
        this.data = data;
        this.useLog = useLog;
        this.logBase = logBase;
        this.colorScheme = colorScheme;

        // initiates additional attributes
        this.xScale = undefined;
        this.yScale = undefined;
        this.colorScale = undefined;
        this.bubbleScale = undefined;

        // peripheral features
        // Tooltip
        if ($(`#${tooltipId}`).length == 0) $('<div/>').attr('id', tooltipId).appendTo($('body'));
        this.tooltip = new Tooltip(tooltipId);
        select(`#${tooltipId}`).classed('bubblemap-tooltip', true);

        this.toolbar = undefined;
    }

    /**
     * Render the bubble map in canvas
     * @param canvas {OBJECT}: the canvas DOM D3 select object
     * @param dimensions {OBJECT}: the plot's dimensions
     * @param colorScaleDomain {LIST} define the color scale domain()
     * @param showLabels {Boolean}
     * @param columnLabelAngle {Integer}
     * @param columnLabelPosAdjust {Integer}
     */
    drawCanvas(canvas, dimensions={w:1000, h:600, top:20, left:20}, colorScaleDomain=undefined, showLabels=true, columnLabelAngle=30, columnLabelPosAdjust=0){
        this._setScales(dimensions, colorScaleDomain);

        let context = canvas.node().getContext('2d');

        //background
        context.fillStyle = '#ffffff';
        context.rect(0,0,canvas.attr('width'), canvas.attr('height'));
        context.fill();

        // bubbles
        this.data.forEach((d)=>{
            // context.beginPath();
            context.fillStyle = this.colorScale(d.value);
            context.arc(this.xScale(d.x) + this.xScale.bandwidth()/2, this.yScale(d.y), this.bubbleScale(d.r), 0, 2*Math.PI);
            context.fill();
            // context.closePath();
        });

        // text labels
        if(showLabels){
            context.save();
            context.textAlign = 'right';
            context.fillStyle = 'black';
            context.font = '10px Open Sans';
            this.yScale.domain().forEach((d)=>{
                context.fillText(d, this.xScale.range()[0]-12, this.yScale(d)+2);
            });
            context.restore();

            this.xScale.domain().forEach((d)=>{
                context.save();
                context.fillStyle = 'black';
                context.font = '10px Open Sans';
                context.textAlign = 'left';
                context.translate(this.xScale(d)+this.xScale.bandwidth()/2 - 3, this.yScale.range()[1] + columnLabelPosAdjust);
                context.rotate(Math.PI/2);
                context.fillText(d, 0, 0);
                context.restore();

            });
        }
    }

    drawSvg(dom, dimensions={w:1000, h:600, top:0, left:0}, colorScaleDomain=undefined, showLabels=true, columnLabelAngle=30, columnLabelPosAdjust=0){
        this._setScales(dimensions, colorScaleDomain);
        let tooltip = this.tooltip;
        // bubbles
        let bubbles = dom.selectAll(".bubble-map-cell")
            .data(this.data, (d)=>d.value)
            .enter()
            .append("circle")
            .attr("row", (d)=> `x${this.xScale.domain().indexOf(d.displayX?d.displayX:d.x)}`)
            .attr("col", (d)=> `y${this.yScale.domain().indexOf(d.y)}`)
            .attr("cx", (d)=>this.xScale(d.displayX?d.displayX:d.x) + this.xScale.bandwidth()/2)
            .attr("cy", (d)=>this.yScale(d.y))
            .attr("r", (d)=>this.bubbleScale(d.r))
            .style("fill", (d)=>this.colorScale(d.value))
            .on("mouseover", function(d){
                let selected = select(this);
                let rowClass = selected.attr("row");
                let colClass = selected.attr("col");
                dom.selectAll(".bubble-map-xlabel").filter(`.${rowClass}`)
                    .classed('highlighted', true);
                dom.selectAll(".bubble-map-ylabel").filter(`.${colClass}`)
                    .classed('highlighted', true);
                selected.classed('highlighted', true);
                let displayValue = d.displayValue === undefined?parseFloat(d.value.toExponential()).toPrecision(4):d.displayValue;
                tooltip.show(`Column: ${d.x} <br/> Row: ${d.y}<br/> Value: ${displayValue}`);
            })
            .on("mouseout", function(){
                dom.selectAll("*").classed('highlighted', false);
                tooltip.hide();
            });

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
                    let y = this.yScale.range()[1] + columnLabelPosAdjust;
                    return `translate(${x}, ${y}) rotate(${columnLabelAngle})`;
                })
                .text((d) => d);

            // row labels
            let yLabels = dom.selectAll().data(this.yScale.domain())
                .enter().append("text")
                .attr("class", (d, i) => `bubble-map-ylabel y${i}`)
                .attr("x", this.xScale.range()[0] - 10)
                .attr("y", (d) => this.yScale(d) + 2)
                .style("text-anchor", "end")
                .style("cursor", "default")
                .text((d) => d);
        }


    }

    drawColorLegend(dom, legendConfig={x:0, y:0}, ticks=5, unit=""){
        drawColorLegend(unit, dom, this.colorScale, legendConfig, this.useLog, ticks, this.logBase, {h:10, w:40}, "h", true);
    }

    drawBubbleLegend(dom, legendConfig={x:0, y:0, title:"Bubble legend"}, ticks=5, unit=""){
        console.log(this.bubbleScale.domain());
        console.log(this.bubbleScale.range());
        let range = [...Array(ticks+1).keys()];
        let interval = (this.bubbleScale.domain()[1]-this.bubbleScale.domain()[0])/ticks;
        let data = range.map((d)=>this.bubbleScale.domain()[0]+d*interval); // assuming d is positive
        console.log(data);

        // legend groups
        let legends = dom.append("g")
                .attr("transform", `translate(${legendConfig.x}, ${legendConfig.y})`)
                .selectAll(".legend").data(data);
        let g = legends.enter().append("g").classed("legend", true);

        // legend title
        dom.append("text")
            .attr("class", "color-legend")
            .text(legendConfig.title)
            .attr("x", -10)
            .attr("text-anchor", "end")
            .attr("y", 10)
            .attr("transform", `translate(${legendConfig.x}, ${legendConfig.y})`);

        // the bubbles
        let cellW = this.xScale.bandwidth()*2;
        console.log(cellW);
        g.append("circle")
            .attr("cx", (d, i) => cellW*i)
            .attr("cy", 10)
            .attr("r", (d)=>this.bubbleScale(d))
            .style("fill", "black");

        g.append("text")
            .attr("class", "color-legend")
            .text((d) => this.useLog?(Math.pow(base, d)).toPrecision(2):d.toPrecision(2))
            .attr("x", (d, i) => cellW * i -5)
            .attr("y", 0);
    }

    // private methods
    _setScales(dimensions={w:1000, h:600, top:20, left:20}, cDomain){
        if (this.xScale === undefined) this._setXScale(dimensions);
        if (this.yScale === undefined) this._setYScale(dimensions);
        if (this.colorScale === undefined) this._setColorScale(cDomain);
        if (this.bubbleScale === undefined) {
            let bubbleMax = min([this.xScale.bandwidth(), this.yScale.bandwidth()])/2
            this._setBubbleScale({max:bubbleMax, min: 2});
        }
    }

    _setXScale(dim={w:1000, left:20}){
        // use d3 nest data structure to find the unique list of x labels
        // reference: https://github.com/d3/d3-collection#nests
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

    _setBubbleScale(range={max:10, min:0}){
        this.bubbleScale = scaleSqrt()
            .domain([2, max(this.data.map((d)=>d.r))])
            .range([range.min, range.max]);
    }

    _log(v){
        const adjust = 1;
        return Math.log(Number(v+adjust))/Math.log(this.logBase);
    }


}

