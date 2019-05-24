/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

import {nest} from "d3-collection";
import {scaleBand, scaleLinear} from "d3-scale";
import {axisBottom, axisLeft, axisRight} from "d3-axis";
import {select} from "d3-selection";
import {max} from "d3-array";
import Tooltip from "./Tooltip";


export default class BarMap {

    constructor(data, colorScheme="Reds"){
        this.data = data;
        this.colorScheme = colorScheme;
        this.xScale = undefined;
        this.yScale = undefined;
        this.colorScale = undefined;
        this.tooltip = undefined;
    }

    addTooltip(parentId, tooltipCssClass="bar-map-tooltip"){
        // error-checking
        if (select(`#${parentId}`).empty()) throw "DOM ID is missing: " + parentId;
        let parent = select(`#${parentId}`);
        let tooltipId = parentId + '-tooltip';
        if (select(`#${tooltipId}`).empty()) parent.append("div").attr('id', tooltipId);
        this.tooltip = new Tooltip(tooltipId);
        select(`#${tooltipId}`).classed(tooltipCssClass, true);
    }

    renderWithNewDomain(dom, domain){
        this.xScale.domain(domain);
        this._renderXAxis(dom);
        dom.selectAll(".bar-row").selectAll("rect")
            .attr("x", (d)=>this.xScale(d.x)-this.xScale.bandwidth()/2||0)
            .attr("width", (d)=>{
                if (this.xScale(d.x)===undefined) return 0;
                return this.xScale.bandwidth()
            })
    }

    drawSvg(dom, dimensions={w:1000, h: 600, top:0, left: 0}, setGroupHScale=false){
        if (this.xScale=== undefined || this.yScale===undefined) this.setScales(dimensions)
        this._renderAxes(dom);
        this._renderBars(dom, setGroupHScale);
    }

    setScales(dimensions, colorRange=undefined){
        this._setXScale(dimensions);
        this._setYScale(dimensions);
    }

    /**
     * Set X scale to a scale band
     * reference: https://github.com/d3/d3-scale#scaleBand
     * @param dim
     * @param xlist {List} of x. optional. User-defined list of x.
     */
    _setXScale(dim={width:1000, left:20}, xlist = undefined, padding=0.05){
        if (xlist === undefined) {
            xlist = nest()
                .key((d) => d.x) // group by d.x
                .entries(this.data)
                .map((d)=> d.key) // return the unique list of d.x
                .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        }
        this.xScale = scaleBand()
            .domain(xlist)
            .range([dim.left, dim.left+dim.width])
            .padding(padding)

    }

    /**
     * Set Y scale to a scale band
     * reference: https://github.com/d3/d3-scale#scaleBand
     * @param dim
     * @param xlist {List} of x. optional. User-defined list of x.
     */
    _setYScale(dim={height:600, top:20}, ylist = undefined, padding=0.3){
        if (ylist === undefined) {
            ylist = nest()
                .key((d) => d.y) // group by d.x
                .entries(this.data)
                .map((d)=> d.key) // return the unique list of d.x
                .sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
        }
        this.yScale = scaleBand()
            .domain(ylist)
            .range([dim.top, dim.top+dim.height])
            .padding(padding)

    }

    _renderAxes(g){
        this._renderXAxis(g);
        this._renderYAxis(g);
    }

    _renderXAxis(g){
        let axis = axisBottom(this.xScale).tickSize(0); // show no tick marks
        g.select(".bar-map-x-axis").remove(); // remove previously rendered X axis;
        let Y = this.yScale.range()[1];
        g.append("g")
            .attr("class", "bar-map-x-axis")
            .attr("transform", `translate(0, ${Y})`)
            .call(axis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("class", "bar-map-x-label")
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");
    }

    _renderYAxis(g){
        let axis = axisLeft(this.yScale).tickSize(0);
        g.append("g")
            .attr("class", "bar-map-y-axis")
            .call(axis)
            .selectAll("text")
            .attr("class", "bar-map-y-label")
    }

    _renderBars(g, groupHScale=false, domain=[-0.5, 0, 0.5]){
        let cScale = scaleLinear()
            .domain(domain)
            .range(["#129cff", "#ffffff", "#f53956"]);

        let nest_data = nest()
            .key((d)=>d.y)
            .entries(this.data);

        let grouped_data = nest()
            .key((d)=>d.dataType)
            .entries(this.data);

        nest_data.forEach((row, i)=> {
            // console.log(row)
            let hScale = scaleLinear().rangeRound([0, -this.yScale.bandwidth()]);
            let dMax = max(row.values, (d) => d.r); // find the maximum value in the row

            if (groupHScale) {
                // when groupHScale is true indicates that the hScale should be set based on all data from the same data type
                let type = row.values[0].dataType;
                dMax = max(grouped_data.filter((g)=>g.key==type)[0].values.map((d)=>d.r));
            }

            hScale.domain([0, dMax])

            let rowG = g.append("g")
                .classed("bar-row", true);

            // add a row baseline to help visual alignment
            rowG.append("line")
                .attr("x1", this.xScale.range()[0])
                .attr("x2", this.xScale.range()[1])
                .attr("y1", 0)
                .attr("y2", 0)
                .attr("transform", `translate(0, ${this.yScale(row.key)+this.yScale.bandwidth()})`)
                .style("stroke", "#efefef");

            let hAxis = axisRight(hScale).ticks(2);
            let hAxisG = rowG.append("g")
                .attr("class", "h-axis")
                .attr("transform", `translate(${this.xScale.range()[1]}, ${this.yScale(row.key)+this.yScale.bandwidth()})`)
                .call(hAxis)
                .selectAll("text")
                .attr("font-size", 6);

            let bars = rowG.selectAll("rect")
                .data(row.values)
                .enter()
                .append("rect")
                .attr("x", (d) => this.xScale(d.x)-this.xScale.bandwidth()/2)
                .attr("y", (d) => this.yScale(d.y) + this.yScale.bandwidth() + hScale(d.r)) // the attr r is originally for radius...
                .attr("width", this.xScale.bandwidth())
                .attr("height", (d) => {
                    return Math.abs(hScale(d.r))
                })
                .attr("fill", (d)=>{
                    if (isNaN(d.value)) return "darkgrey";
                    return cScale(d.value)
                })
                .attr("stroke-width", 0)
                .attr("cursor", "pointer");

            let tooltip = this.tooltip;
            bars.on("mouseover", (d)=>{
                    tooltip.show(`Row: ${d.y}<br/> Column: ${d.x} <br/> Value: ${d.value}<br/> Height: ${d.r}`);
                })
                .on("mouseout", (d)=>{
                    tooltip.hide();
                });
        });

    }



}