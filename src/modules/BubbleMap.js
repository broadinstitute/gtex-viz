/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

"use strict";
import {nest} from "d3-collection";
import {extent, max, min} from "d3-array";
import {select, selectAll, event} from "d3-selection";
import {scaleBand, scaleLinear, scaleSqrt} from "d3-scale";
import {brushX} from "d3-brush";

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
            context.beginPath();
            context.fillStyle = this.colorScale(d.value);
            context.arc(this.xScale(d.x) + this.xScale.bandwidth()/2, this.yScale(d.y), this.bubbleScale(d.r), 0, 2*Math.PI);
            context.fill();
            context.closePath();
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

    drawCombo(miniDom, focusDom, dimensions={w:1000, h:600, top:0, left:0}, colorScaleDomain=undefined, showLabels=true, columnLabelAngle=30, columnLabelPosAdjust=10, addBrush=true) {
        this._setMiniScales(dimensions, colorScaleDomain);
        this.drawSvg(focusDom, {
            w: dimensions.w,
            h: dimensions.h2,
            top: dimensions.top,
            left: dimensions.left
        }, colorScaleDomain, showLabels, columnLabelAngle, columnLabelPosAdjust);
        let bubbles = miniDom.append("g")
            .attr("clip-path", "url(#clip)");
        bubbles.selectAll(".mini-map-cell")
            .data(this.data, (d) => d.value)
            .enter()
            .append("circle")
            .attr("row", (d) => `x${this.xScaleMini.domain().indexOf(d.displayX ? d.displayX : d.x)}`)
            .attr("col", (d) => `y${this.yScaleMini.domain().indexOf(d.y)}`)
            .attr("cx", (d) => this.xScaleMini(d.displayX ? d.displayX : d.x) + this.xScaleMini.bandwidth() / 2)
            .attr("cy", (d) => this.yScaleMini(d.y))
            .attr("r", (d) => this.bubbleScaleMini(d.r))
            .style("fill", (d) => this.colorScale(d.value));

        let initialBrushSize = 50;
        let xList = this.xScaleMini.domain();
        if (addBrush) {
            const brushed = () => {
                let selection = event.selection;
                let brushLeft = Math.round(selection[0] / this.xScaleMini.step());
                let brushRight = Math.round(selection[1] / this.xScaleMini.step());
                this.xScale.domain(this.xScaleMini.domain().slice(brushLeft, brushRight)); // reset the xScale domain
                let bubbleMax = min([this.xScale.bandwidth(), this.yScale.bandwidth()]) / 2;
                this.bubbleScale = this._setBubbleScale({max: bubbleMax, min: 2}); // TODO: change hard-coded min radius

                // update the focus bubbles
                focusDom.selectAll(".bubble-map-cell")
                    .attr("cx", (d) => {
                        let x = this.xScale(d.displayX ? d.displayX : d.x);
                        return x === undefined ? this.xScale.bandwidth() / 2 : x + this.xScale.bandwidth() / 2;

                    })
                    // .attr("cy", (d)=>this.yScale(d.y))
                    .attr("r", (d) => {
                        let x = this.xScale(d.displayX ? d.displayX : d.x);
                        return x === undefined ? 0 : this.bubbleScale(d.r)
                    });

                // update the column labels
                focusDom.selectAll(".bubble-map-xlabel")
                    .attr("transform", (d) => {
                        let x = this.xScale(d) + 5 || 0; // TODO: remove hard-coded value
                        let y = this.yScale.range()[1] + columnLabelPosAdjust;
                        return `translate(${x}, ${y}) rotate(${columnLabelAngle})`;

                    })
                    .style("display", (d) => {
                        let x = this.xScale(d); // TODO: remove hard-coded value
                        return x === undefined ? "none" : "block";
                    });
            };
            let brush = brushX()
                .extent([
                    [0, 0],
                    [dimensions.w, dimensions.h]
                ])
                .on("brush", brushed);
            miniDom.append("g")
                .attr("class", "brush")
                .call(brush)
                // .call(brush.move, this.xScaleMini.range());
                .call(brush.move, [0, this.xScaleMini.bandwidth() * 50]);
        }

    }

    drawSvg(dom, dimensions={w:1000, h:600, top:0, left:0}, colorScaleDomain=undefined, showLabels=true, columnLabelAngle=30, columnLabelPosAdjust=0, brushSize=50){
        this._setScales(dimensions, colorScaleDomain, brushSize);
        let tooltip = this.tooltip;
        // bubbles
        let bubbles = dom.append("g")
            .attr("clip-path", "url(#clip)");

        bubbles.selectAll(".bubble-map-cell")
            .data(this.data, (d)=>d.value)
            .enter()
            .append("circle")
            .attr("class", "bubble-map-cell")
            .attr("row", (d)=> `x${this.xScale.domain().indexOf(d.displayX?d.displayX:d.x)}`)
            .attr("col", (d)=> `y${this.yScale.domain().indexOf(d.y)}`)
            .attr("cx", (d)=>this.xScale(d.displayX?d.displayX:d.x) + this.xScale.bandwidth()/2)
            .attr("cy", (d)=>this.yScale(d.y) + this.yScale.bandwidth()/2)
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
            let xLabels = dom.selectAll('.bubble-map-xlabel').data(this.xScale.domain())
                .enter().append("text")
                .attr("class", (d, i) => `bubble-map-xlabel x${i}`)
                .attr("x", 0)
                .attr("y", 0)
                .style("text-anchor", "start")
                .style("cursor", "default")
                .style("font-size", ()=>{
                    let size = Math.floor(this.xScale.bandwidth())/2;
                    return `${size}px`
                })
                .attr("transform", (d) => {
                    let x = this.xScale(d) + this.xScale.bandwidth()/3;
                    let y = this.yScale.range()[1] + columnLabelPosAdjust;
                    return `translate(${x}, ${y}) rotate(${columnLabelAngle})`;
                })
                .text((d) => d);

            // row labels
            let yLabels = dom.selectAll('.bubble-map-ylabel').data(this.yScale.domain())
                .enter().append("text")
                .attr("class", (d, i) => `bubble-map-ylabel y${i}`)
                .attr("x", this.xScale.range()[0] - 10)
                .attr("y", (d) => this.yScale(d) + this.yScale.bandwidth()/1.5)
                .style("text-anchor", "end")
                .style("cursor", "default")
                .style("font-size", ()=>{
                    let size = Math.floor(this.yScale.bandwidth()/1.5);
                    return `${size}px`
                })
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
    _setMiniScales(dimensions={w:1000, h:600, top:20, left:20}, cDomain){
        if (this.xScaleMini === undefined) this.xScaleMini = this._setXScaleMini(dimensions);
        if (this.yScaleMini === undefined) this.yScaleMini = this._setYScaleMini(dimensions);
        if (this.colorScale === undefined) this.colorScale = this._setColorScale(cDomain);
        if (this.bubbleScaleMini === undefined) {
            let bubbleMax = min([this.xScaleMini.bandwidth(), this.yScaleMini.bandwidth()])/2; // the max bubble radius
            this.bubbleScaleMini = this._setBubbleScale({max: bubbleMax, min:1});
        }
    }

    _setScales(dimensions={w:1000, h:600, top:20, left:20}, cDomain){
        if (this.xScale === undefined) this.xScale = this._setXScale(dimensions);
        if (this.yScale === undefined) this.yScale = this._setYScale(dimensions);
        if (this.colorScale === undefined) this.colorScale = this._setColorScale(cDomain);
        if (this.bubbleScale === undefined) {
            let bubbleMax = min([this.xScale.bandwidth(), this.yScale.bandwidth()])/2;
            this.bubbleScale = this._setBubbleScale({max:bubbleMax, min: 2}); // TODO: change hard-coded min radius
        }
    }

    _parseXList(){
         let xList = nest()
            .key((d) => d.displayX!==undefined?d.displayX:d.x) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
         return xList;
    }

    _parseYList(){
        let yList = nest()
            .key((d) => d.y) // group this.data by d.x
            .entries(this.data)
            .map((d) => d.key) // then return the unique list of d.x
            .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        return yList;
    }

    _setXScaleMini(dim={w:1000, left:20}){
        let xList = this._parseXList();
        return this._setXScale(dim, xList);
    }

    _setXScale(dim={w:1000, left:20}, xList = undefined){
        // use d3 nest data structure to find the unique list of x labels
        // reference: https://github.com/d3/d3-collection#nests
        xList = xList===undefined?this._parseXList():xList;
        return scaleBand() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(xList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            .range([dim.left, dim.left+dim.w])
            .padding(.05); // temporarily hard-coded value
    }

    _setYScaleMini(dim={h:600, top:20}){
        // use d3 nest data structure to find the unique list of y labels
        // reference: https://github.com/d3/d3-collection#nests
        let yList = this._parseYList();
        return this._setYScale(dim, yList);
    }

    _setYScale(dim={h:600, top:20}, yList=undefined){
        // use d3 nest data structure to find the unique list of y labels
        // reference: https://github.com/d3/d3-collection#nests
        yList = yList===undefined?this._parseYList():yList;
        return scaleBand() // reference: https://github.com/d3/d3-scale#scaleBand
            .domain(yList) // perhaps it isn't necessary to store xList, it could be retrieved by xScale.domain
            .range([dim.top, dim.top+dim.h])
            .padding(.05); // temporarily hard-coded value
    }

    _setColorScale(domain){
        let useLog = this.useLog;
        let data = domain===undefined?this.data.map((d)=>useLog?this._log(d.value):d.value):domain;
        return setColorScale(data, this.colorScheme, undefined, undefined, true);
    }

    // _setBubbleScaleMini(range={max:10, min:0}){
    //     return this._setBubbleScale(range);
    // }

    _setBubbleScale(range={max:10, min:0}){
        return scaleSqrt()
            .domain([3, max(this.data.map((d)=>d.r))]) // set min at 2 for -log(0.01)
            .range([range.min, range.max]);
    }

    _log(v){
        const adjust = 1;
        return Math.log(Number(v+adjust))/Math.log(this.logBase);
    }


}

