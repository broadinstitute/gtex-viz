/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
import {select, selectAll} from "d3-selection";
import {scaleBand} from "d3-scale";
import {nest} from "d3-collection";
import {transition} from "d3-transition";

import {setColorScale, drawColorLegend} from "./colors";
import Toolbar from "./Toolbar";
import Tooltip from "./Tooltip";

export default class Heatmap {
    /**
     * constructor
     * @param data {List}, a list of objects with the following attributes: x: the x label, y: the y label
        value: the rendered numerical value (transformed)
        displayValue: display numerical value
     * @param useLog {Boolean} performs log transformation
     * @param colorScheme {String}: recognized terms in Colors:getColorInterpolator
     * @param r {Integer}: cell corner radius
     */
    constructor(data, useLog=true, logBase=10, colorScheme="YlGnBu", r=2, tooltipId="heatmapTooltip", tooltipCssClass="heatmap-tooltip"){
        this.data = data;
        this.useLog = useLog;
        this.logBase = logBase;
        this.nullColor = "#e6e6e6"; // TODO: remove hard-coded value. make it a param.
        this.colorScale = undefined;
        this.xList = undefined;
        this.yList = undefined;
        this.xScale = undefined;
        this.yScale = undefined;
        this.r = r;
        this.colorScheme = colorScheme;

        // peripheral features
        /// Tooltip
        /// create the tooltip DIV
        if (select(`#${tooltipId}`).length == 0) select('body').append('div').attr('id', tooltipId);
        this.tooltip = new Tooltip(tooltipId);
        select(`#${tooltipId}`).classed(tooltipCssClass, true);

        this.toolbar = undefined;
    }

    /**
     * Create the toolbar panel
     * @param domId {String} the toolbar's dom ID
     * @param tooltip {Tooltip}
     * @returns {Toolbar}
     */

    createToolbar(domId, tooltip){
        this.toolbar = new Toolbar(domId, tooltip);
        return this.toolbar;
    }


    /**
     * draw color legend for the heat map
     * @param dom {Selection} a d3 selection object
     * @param legendConfig {Object} with attr: x, y
     */

    drawColorLegend(dom, legendConfig={x:0, y:0}, ticks=5){
        drawColorLegend(this.data[0].unit||"Value", dom, this.colorScale, legendConfig, this.useLog, ticks, this.logBase);
    }

     /**
     * redraws the heatmap: when the xlist and ylist are changed, redraw the heatmap
     * @param dom {Selection} a d3 selection object
     * @param xList {List} a list of x labels
     * @param yList {List} a list of y labels
     * @param dimensions {Dictionary} {w:Integer, h:integer} with two attributes: w and h
     * @param angle {Integer} for the y text labels
     */
    redraw(dom, xList, yList, dimensions={w:1000, h:1000}, angle=30){
        this._setXScale(dimensions.w, xList);
        this._setYScale(dimensions.h, yList);
        this.draw(dom, dimensions, angle);
    }


    /**
     * draws the heatmap
     * @param dom {Selection}
     * @param dimensions {Dictionary} {w:Integer, h:integer} of the heatmap
     * @param angle {Integer} for the y text labels
     * @param useNullColor {Boolean} whether to render null values with the pre-defined null color
     */

    draw(dom, dimensions={w:1000, h:600}, angle=30, useNullColor=false, columnLabelPosAdjust=null){

        if (this.xList === undefined) this._setXScale(dimensions.w);
        if (this.yList === undefined) this._setYScale(dimensions.h);
        if (this.colorScale === undefined) this._setColorScale();

        // text labels
        // data join
        const xLabels = dom.selectAll(".exp-map-xlabel")
            .data(this.xList);

        // update and transform
        const Y = columnLabelPosAdjust==null?this.yScale.range()[1] + (this.yScale.bandwidth() * 2):this.yScale.range()[1]+columnLabelPosAdjust;
        const adjust = 5;
        xLabels.attr("transform", (d) => {
                let x = this.xScale(d) + adjust;
                let y = Y;
                return `translate(${x}, ${y}) rotate(${angle})`;
            });

        // enters new elements
        xLabels.enter().append("text")
            .attr("class", (d, i) => `exp-map-xlabel x${i}`)
            .attr("x", 0)
            .attr("y", 0)
            .style("text-anchor", "start")
            .style("cursor", "default")
            .style("font-size", this.xScale.bandwidth()>14?14:this.xScale.bandwidth())
            .attr("transform", (d) => {
                let x = this.xScale(d) + adjust;
                let y = Y;
                return `translate(${x}, ${y}) rotate(${angle})`;
            })
            .merge(xLabels)
            .text((d) => d);

        // exit -- removes old elements as needed
        xLabels.exit().remove();

        const yLabels = dom.selectAll(".exp-map-ylabel")
            .data(this.yList)
            .enter().append("text")
            .text((d) => d)
            .attr("x", this.xScale.range()[1] + 5)
            .attr("y", (d) => this.yScale(d) + this.yScale.bandwidth()/2)
            .style("font-size", this.yScale.bandwidth())
            .attr("class", (d, i) => `exp-map-ylabel y${i}`)
            .attr("text-anchor", "start")
            .style("cursor", "default")
            .on('click', (d) => {
                alert(`${d} is clicked. To be implemented`)
            })
            .on('mouseover', function(d){
                select(this)
                    .classed('normal', false)
                    .classed('highlighted', true);
            })
            .on('mouseout', function(d){
                select(this)
                    .classed('normal', true)
                    .classed('highlighted', false);
            });

        // renders the heatmap cells

        // data join
        const cells = dom.selectAll(".exp-map-cell")
            .data(this.data, (d) => d.value);

        // update old elements
        cells.attr("x", (d) => this.xScale(d.x))
            .attr("y", (d) => this.yScale(d.y))
            .attr("row", (d) => `x${this.xList.indexOf(d.x)}`) // TODO: row should be y, column should be x...
            .attr("col", (d) => `y${this.yList.indexOf(d.y)}`);

        // enter new elements
        const nullColor = "#DDDDDD";
        const self = this;
        cells.enter().append("rect")
            .attr("row", (d) => `x${this.xList.indexOf(d.x)}`)
            .attr("col", (d) => `y${this.yList.indexOf(d.y)}`)

            .attr("x", (d) => this.xScale(d.x))
            .attr("y", (d) => this.yScale(d.y))
            .attr("rx", this.r)
            .attr('ry', this.r)
            .attr("class", "exp-map-cell")
            .attr("width", this.xScale.bandwidth())
            .attr("height", this.yScale.bandwidth())
            .style("fill", "#eeeeee")
            .on("mouseover", function(d){
                const selected = select(this); // Note: "this" here refers to the dom element not the object
                self.cellMouseover(d, dom, selected);
            })
            .on("mouseout", function(d){
                const selected = select(this); // Note: "this" here refers to the dom element not the object
                self.cellMouseout()
            })
            .merge(cells)
            // .transition()
            // .duration(2000)
            .style("fill", (d) => {
                return useNullColor&&d.value==0?nullColor:this.useLog?this.colorScale(this._log(d.value)):this.colorScale(d.value)
            }); // TODO: what if null value isn't 0?

        // exit and remove
        cells.exit().remove();
    }


    cellMouseout(d){
        selectAll("*").classed('highlighted', false);
        this.tooltip.hide();
    }

    cellMouseover (d, dom, selected) {
        const rowClass = selected.attr("row");
        const colClass = selected.attr("col");
        dom.selectAll(".exp-map-xlabel").filter(`.${rowClass}`)
            .classed('highlighted', true);
        dom.selectAll(".exp-map-ylabel").filter(`.${colClass}`)
            .classed('highlighted', true);
        selected.classed('highlighted', true);
        const displayValue = d.displayValue === undefined?parseFloat(d.value.toExponential()).toPrecision(4):d.displayValue;
        this.tooltip.show(`Column: ${d.x} <br/> Row: ${d.y}<br/> Value: ${displayValue}`);
    }

    _setXScale(width, newList = undefined) {
        if(newList !== undefined){
            this.xList = newList
        }
        else {
            this.xList = nest()
                .key((d) => d.x)
                .entries(this.data)
                .map((d) => d.key);
        }
        this.xScale = scaleBand()
            .domain(this.xList)
            .range([0, width])
            .padding(.05); // TODO: eliminate hard-coded value
    }

    _setYScale(height, newList) {
        if(newList !== undefined){
            this.yList = newList
        }
        else {
           this.yList = nest()
            .key((d) => d.y)
            .entries(this.data)
            .map((d) => d.key);
        }
        this.yScale = scaleBand()
                .domain(this.yList)
                .range([0, height])
                .padding(.05); // TODO: eliminate hard-coded value
    }

    _setColorScale(){
        let useLog = this.useLog;
        let data = this.data.map((d)=>useLog?this._log(d.value):d.value);
        this.colorScale = setColorScale(data, this.colorScheme, 0);
    }

    _log(v){
        const adjust = 1;
        return Math.log(Number(v+adjust))/Math.log(this.logBase);
    }



}