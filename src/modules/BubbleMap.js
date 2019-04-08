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
    constructor(data, useLog=true, logBase=10, colorScheme="Reds"){
        this.data = data;
        this.useLog = useLog;
        this.logBase = logBase;
        this.colorScheme = colorScheme;

        // initiates additional attributes
        this.xScale = undefined;
        this.yScale = undefined;
        this.colorScale = undefined;
        this.bubbleScale = undefined;

        this.toolbar = undefined;
        this.tooltip = undefined;
    }

    addTooltip(parentId){
        let parent = $(`#${parentId}`);
        let tooltipId = parentId + '-tooltip';
        if ($(`#${tooltipId}`).length == 0) $('<div/>').attr('id', tooltipId).appendTo(parent);
        this.tooltip = new Tooltip(tooltipId);
        select(`#${tooltipId}`).classed('bubblemap-tooltip', true);
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
    drawCanvas(canvas,
        dimensions={w:1000, h:600, top:20, left:20},
        colorScaleDomain=undefined,
        labelConfig = {
            column: {
                show: true,
                angle: 30,
                adjust: 0,
                location: 'bottom',
                textAlign: 'left'
            },
           row: {
                show: true,
                angle: 0,
                adjust: 0,
                location: 'left',
                textAlign: 'right',
           }
    }){
        this.setScales(dimensions, colorScaleDomain);

        let context = canvas.node().getContext('2d');

        //background
        context.fillStyle = '#ffffff';
        context.rect(0,0,canvas.attr('width'), canvas.attr('height'));
        context.fill();
        // bubbles
        this.data.forEach((d)=>{
            context.beginPath();
            context.fillStyle = this.colorScale(d.value);
            context.arc(this.xScale(d.x), this.yScale(d.y), this.bubbleScale(d.r), 0, 2*Math.PI);
            context.fill();
            context.closePath();
        });

        // text labels
        let cl = labelConfig.column;
        let rl = labelConfig.row;
        if(rl.show) {
            context.save();
            context.textAlign = cl.textAlign;
            context.fillStyle = 'black';
            context.font = '10px Open Sans';
            this.yScale.domain().forEach((d) => {
                context.fillText(d, this.xScale.range()[0] - rl.adjust, this.yScale(d) + 2);
            });
            context.restore();
        }

        if(cl.show) {
            this.xScale.domain().forEach((d)=>{
                context.save();
                context.fillStyle = 'black';
                context.font = '10px Open Sans';
                context.textAlign = cl.textAlign;
                context.translate(this.xScale(d) - 3, this.yScale.range()[1] + cl.adjust);
                context.rotate(cl.angle==0?0:Math.PI/(180/cl.angle));
                context.fillText(d, 0, 0);
                context.restore();

            });
        }
    }

    drawCombo(
    miniDom,
    focusDom,
    dimensions={w:1000, h:600, top:0, left:0},
    colorScaleDomain=undefined,
    addBrush=true,
    labelConfig = {
        column: {
            show: true,
            angle: 30,
            adjust: 0,
            location: 'bottom',
            textAlign: 'left'
        },
       row: {
            show: true,
            angle: 0,
            adjust: 0,
            location: 'left',
            textAlign: 'right',
       }
    }) {

        let svgDim = {
            w: dimensions.w,
            h: dimensions.h2,
            top: dimensions.top,
            left: dimensions.left
        };
        this.drawSvg(focusDom, svgDim, colorScaleDomain, 50, labelConfig);

        let bubbles = miniDom.append("g")
            .attr("clip-path", "url(#clip)");
        this._setMiniScales(dimensions, colorScaleDomain);
        bubbles.selectAll(".mini-map-cell")
            .data(this.data, (d) => d.value)
            .enter()
            .append("circle")
            .attr('class', 'mini-map-cell')
            .attr("row", (d) => `x${this.xScaleMini.domain().indexOf(d.x)}`)
            .attr("col", (d) => `y${this.yScaleMini.domain().indexOf(d.y)}`)
            .attr("cx", (d) => this.xScaleMini(d.x))
            .attr("cy", (d) => this.yScaleMini(d.y))
            .attr("r", (d) => {
                return isFinite(d.r)?this.bubbleScaleMini(d.r):this.bubleScaleMini.range()[1]
            })
            .style("fill", (d) => this.colorScale(d.value));

        if (addBrush) {

            let brush = brushX()
                .extent([
                    [0, 0],
                    [dimensions.w, dimensions.h]
                ])
                .on("brush", ()=>{
                    this.brushed(focusDom, labelConfig);
                });
            miniDom.append("g")
                .attr("class", "brush")
                .call(brush)
                // .call(brush.move, this.xScaleMini.range());
                .call(brush.move, [0, this.xScaleMini.bandwidth() * 50]);
        }

    }

    drawSvg(dom, dimensions={w:1000, h:600, top:0, left:0}, colorScaleDomain=undefined, brushSize=50, labelConfig={
            column: {
                show: true,
                angle: 30,
                adjust: 0,
                location: 'bottom',
                textAlign: 'left'
            },
           row: {
                show: true,
                angle: 0,
                adjust: 10,
                location: 'left',
                textAlign: 'right',
           }
        }){
        this.setScales(dimensions, colorScaleDomain=undefined, brushSize=50);
        let tooltip = this.tooltip;
        // bubbles
        let bubbles = dom.append("g")
            .attr("clip-path", "url(#clip)");

        bubbles.selectAll(".bubble-map-cell")
            .data(this.data, (d)=>d.value)
            .enter()
            .append("circle")
            .attr("class", "bubble-map-cell")
            .attr("row", (d)=> `x${this.xScale.domain().indexOf(d.x)}`)
            .attr("col", (d)=> `y${this.yScale.domain().indexOf(d.y)}`)
            .attr("cx", (d)=> this.xScale(d.x))
            .attr("cy", (d)=>this.yScale(d.y))
            .attr("r", (d) => {
                return isFinite(d.r)?this.bubbleScale(d.r):this.bubbleScale.range()[1];
            })
            .style("fill", (d) => this.colorScale(d.value))
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
                let displaySize = d.rDisplayValue === undefined? d.r.toPrecision(4):d.rDisplayValue;
                let displayX = d.displayX === undefined? d.x:d.displayX;
                let displayY = d.displayY === undefined? d.y:d.displayY;
                console.log(`Column: ${displayX} <br/> Row: ${displayY}<br/> Value: ${displayValue}<br/> Size: ${displaySize}`)
                tooltip.show(`Column: ${displayX} <br/> Row: ${displayY}<br/> Value: ${displayValue}<br/> Size: ${displaySize}`);
            })
            .on("mouseout", function(){
                dom.selectAll("*").classed('highlighted', false);
                tooltip.hide();
            });

        // text labels
        let cl = labelConfig.column;
        let rl = labelConfig.row;
        if(cl.show) {
            // column labels
            let lookup = {};
            let size = Math.floor(this.xScale.bandwidth()/ 2)>12?12:Math.floor(this.xScale.bandwidth()/ 2);
            nest()
                .key((d) => d.x) // group this.data by d.x
                .entries(this.data)
                .forEach((d) => {
                    lookup[d.key] = d.values[0].displayX
                });
            let xLabels = dom.selectAll('.bubble-map-xlabel').data(this.xScale.domain())
                .enter().append("text")
                .attr("class", (d, i) => `bubble-map-xlabel x${i}`)
                .attr("x", 0)
                .attr("y", 0)
                .attr("text-anchor", cl.textAlign=='left'?'start':'end')
                .style("cursor", "default")
                .style("font-size", () => {
                    return `${size}px`
                })
                .attr("transform", (d) => {
                    let x = this.xScale(d) - size/2;
                    let y = this.yScale.range()[1] + cl.adjust;
                    return `translate(${x}, ${y}) rotate(${cl.angle})`;
                })
                .text((d) => lookup[d]||d);
        }
        if (rl.show){
            // row labels
            let lookup = {};
            let size = Math.floor(this.yScale.bandwidth()/1.5)>14?14:Math.floor(this.yScale.bandwidth()/1.5)<10?10:Math.floor(this.yScale.bandwidth()/1.5);
            nest()
                .key((d) => d.y) // group this.data by d.y
                .entries(this.data)
                .forEach((d) => {
                    lookup[d.key] = d.values[0].displayY
                });
            let yLabels = dom.selectAll('.bubble-map-ylabel').data(this.yScale.domain())
                .enter().append("text")
                .attr("class", (d, i) => `bubble-map-ylabel y${i}`)
                .attr("x", 0)
                .attr("y", 0)
                .attr("text-anchor", rl.textAlign=='left'?'start':'end')
                .style("cursor", "default")
                .style("font-size", ()=>{

                    return `${size}px`
                })
                .attr("transform", (d) => {
                    let x = this.xScale.range()[0] - rl.adjust;
                    let y = this.yScale(d);
                    return `translate(${x}, ${y}) rotate(${rl.angle})`;
                })
                .text((d) => lookup[d]||d);
        }
    }

    drawColorLegend(dom, legendConfig={x:0, y:0}, ticks=5, unit=""){
        drawColorLegend(unit, dom, this.colorScale, legendConfig, this.useLog, ticks, this.logBase, {h:10, w:40}, "h", true);
    }

    drawBubbleLegend(dom, legendConfig={x:0, y:0, title:"Bubble legend"}, ticks=5, unit=""){
        dom.selectAll(".bmap-bubble-legend").remove(); // clear previously rendered legend if any.

        let range = [...Array(ticks+1).keys()];
        let interval = (this.bubbleScale.domain()[1]-this.bubbleScale.domain()[0])/ticks;
        let data = range.map((d)=>this.bubbleScale.domain()[0]+d*interval); // assuming d is positive

        // legend groups
        let legendG = dom.append("g")
                .attr("class", "bmap-bubble-legend")
                .attr("transform", `translate(${legendConfig.x}, ${legendConfig.y})`);
         // legend title
        legendG.append("text")
            .attr("class", "color-legend")
            .text(legendConfig.title)
            .attr("x", -10)
            .attr("text-anchor", "end")
            .attr("y", 10);

        let legends = legendG.selectAll(".legend").data(data);

        let g = legends.enter().append("g").classed("legend", true);
        // the bubbles
        let cellW = 40;
        g.append("circle")
            .attr("cx", (d, i) => cellW*i)
            .attr("cy", 10)
            .attr("r", (d)=>{
                return isFinite(d.r)?this.bubbleScale(d.r):this.bubbleScale.range()[1];
            })
            .style("fill", "black");

        g.append("text")
            .attr("class", "color-legend")
            .text((d) => this.useLog?(Math.pow(base, d)).toPrecision(2):d.toPrecision(2))
            .attr("x", (d, i) => cellW * i -5)
            .attr("y", 0);
    }

    /**
    re-rendering the focus Heatmap with a new (user-defined) domain of the x scale
     */
    renderWithNewDomain(dom, domain, column={adjust: 0, angle:90}){
        this.xScale.domain(domain); // reset the xScale domain
        let bubbleMax = this._setBubbleMax();
        this.bubbleScale = this._setBubbleScale({max: bubbleMax, min: 2}); // TODO: change hard-coded min radius


        // update the focus bubbles
        dom.selectAll(".bubble-map-cell")
            .attr("cx", (d) => {
                let x = this.xScale(d.x);
                return x === undefined ? 0: x;

            })
            .attr("r", (d) => {
                let x = this.xScale(d.x);
                if (x === undefined) return 0; // set r to 0 when x is not in the focus domain
                return isFinite(d.r)?this.bubbleScale(d.r):this.bubbleScale.range()[1];
            });

        // update the column labels
        let size = Math.floor(this.xScale.bandwidth()/ 2)>10?10:Math.floor(this.xScale.bandwidth()/ 2);
        dom.selectAll(".bubble-map-xlabel")
            .attr("transform", (d) => {
                let x = this.xScale(d) - size/2|| 0;
                let y = this.yScale.range()[1] + column.adjust;
                return `translate(${x}, ${y}) rotate(${column.angle})`;
            })
            .style("font-size", () => {
                return `${size}px`
            })
            .style("display", (d) => {
                let x = this.xScale(d);
                return x === undefined ? "none" : "block";
            });
    }

    /**
     * Defining the brush event of the mini heat map
     * @param focusDom
     * @param labelConfig
     * @returns {*}
     */
    brushed(focusDom, labelConfig){ // TODO: code review and refactoring

        let selection = event.selection;
        let brushLeft = Math.round(selection[0] / this.xScaleMini.step());
        let brushRight = Math.round(selection[1] / this.xScaleMini.step());
        let domain = this.xScaleMini.domain().slice(brushLeft, brushRight);
        this.renderWithNewDomain(focusDom, domain, labelConfig.column)
        return domain;
        // // update the column labels
        // focusDom.selectAll(".bubble-map-xlabel")
        //     .attr("transform", (d) => {
        //         let x = this.xScale(d) + 5 || 0; // TODO: remove hard-coded value
        //         let y = this.yScale.range()[1] + labelConfig.column.adjust;
        //         return `translate(${x}, ${y}) rotate(${labelConfig.column.angle})`;
        //
        //     })
        //     .style("display", (d) => {
        //         let x = this.xScale(d); // TODO: remove hard-coded value
        //         return x === undefined ? "none" : "block";
        //     });

    }

    // private methods

    setScales(dimensions={w:1000, h:600, top:20, left:20}, cDomain){
        if (this.xScale === undefined) this.xScale = this._setXScale(dimensions);
        if (this.yScale === undefined) this.yScale = this._setYScale(dimensions);
        if (this.colorScale === undefined) this.colorScale = this._setColorScale(cDomain);
        if (this.bubbleScale === undefined) {
            let bubbleMax = this._setBubbleMax();
            this.bubbleScale = this._setBubbleScale({max:bubbleMax, min: 2}); // TODO: change hard-coded min radius
        }
    }

    _setMiniScales(dimensions={w:1000, h:600, top:20, left:20}, cDomain){
        if (this.xScaleMini === undefined) this.xScaleMini = this._setXScaleMini(dimensions);
        if (this.yScaleMini === undefined) this.yScaleMini = this._setYScaleMini(dimensions);
        if (this.colorScale === undefined) this.colorScale = this._setColorScale(cDomain);
        if (this.bubbleScaleMini === undefined) {
            let bubbleMax = this._setBubbleMax(true);
            this.bubbleScaleMini = this._setBubbleScale({max: bubbleMax, min:1});
        }
    }



    _parseXList(){
         let xList = nest()
            .key((d) => d.x) // group this.data by d.x
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

    /**
     * Sets the bubble max
     * @param mini {Boolean} setting for the mini map
     * @param scaleFactor {Integer}
     * @param absMax {Number} set an absolute max value
     * @returns {number}
     * @private
     */
    _setBubbleMax(mini=false, scaleFactor=2, absMax = 10){
        let xScale = mini? this.xScaleMini:this.xScale;
        let yScale = mini? this.yScaleMini:this.yScale;
        let rmax = max([xScale.bandwidth(), yScale.bandwidth()])/scaleFactor
        return absMax<rmax?absMax:rmax;
    }

    _setBubbleScale(range={max:10, min:0}){
        const maxData = max(this.data.filter((d)=>{
            return isFinite(d.r)
        }).map((d)=>d.r));
        return scaleSqrt()
            .domain([3, maxData]) // set min at 2 for -log(0.01)
            .range([range.min, range.max]);
    }

    _log(v){
        const adjust = 1;
        return Math.log(Number(v+adjust))/Math.log(this.logBase);
    }


}

