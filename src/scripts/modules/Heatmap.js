/*
    Dependencies:
    tooltip.js
 */

import {scaleBand, scaleQuantile} from "d3-scale";
import {min, max} from "d3-array";
import {select, selectAll} from "d3-selection";
import {nest} from "d3-collection";

export default class Heatmap {
    /* data is a json with the following attributes:
        x: the x label
        y: the y label
        value: the rendered numerical value (transformed)
        originalValue: the original numerical value
     */


    constructor(data, useLog=true, dimensions={w:1000, h:600}, colorScheme="gnbu"){
        this.data = data;
        this.useLog = useLog;
        this.width = dimensions.w;
        this.height = dimensions.h;
        this.nullColor = "#e6e6e6";
        this.colorScale = undefined;
        this.xList = undefined;
        this.yList = undefined;
        this.xScale = undefined;
        this.yScale = undefined;

        this.palette = {
            // colorbrewer
            ylgnbu:["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58","#040e29"],
            orrd: ["#edf8b1",'#fff7ec','#fee8c8','#fdd49e','#fdbb84','#fc8d59','#ef6548','#d7301f','#b30000','#7f0000','#4c0000'],
            gnbu: ['#fffffe','#f7fcf0','#e0f3db','#ccebc5','#a8ddb5','#7bccc4','#4eb3d3','#2b8cbe','#0868ac','#084081','#052851'],
            // other sources
            reds: ["#FFE4DE", "#FFC6BA", "#F7866E", "#d9745e", "#D25C43", "#b6442c", "#9b3a25","#712a1c", "#562015", "#2d110b"],
        };

        this.colors = this.palette[colorScheme]
    }

    // TODO: should the legend rendering be a separate class?
    drawLegend(dom, cellWidth = 70, yAdjust = 16) {
        if (this.colorScale === undefined) this._setColorScale();
        if (this.yList === undefined) this._setYList();

        const legend = dom.selectAll(".legend")
            .data([0].concat(this.colorScale.quantiles()), (d) => d);
        const legendGroups = legend.enter().append("g")
            .attr("class", "legend");

        legendGroups.append("rect")
            .attr("x", (d, i) => cellWidth*i)
            .attr("y", 5)
            .attr("width", cellWidth)
            .attr("height", this.yScale.bandwidth())
            .style("fill", (d) => d==0?this.nullColor:this.colorScale(d));

        legendGroups.append("text")
            .attr("class", "normal")
            .text((d) => d==0?"NA":"≥ " + Math.pow(2, d).toPrecision(2))
            .attr("x", (d, i) => cellWidth * i)
            .attr("y", yAdjust + this.yScale.bandwidth());

        dom.append("text")
            .attr("class", "legend normal")
            .text("Median TPM") // TODO: eliminated hard-coded values
            .attr("x", cellWidth * 11)
            .attr("y", yAdjust + this.yScale.bandwidth())

    }

    update(dom, xList, yList, angle=30){
        this._setXList(xList);
        this._setYList(yList);
        this.draw(dom, angle);
    }

    draw(dom, angle=30){
        if (this.xList === undefined) this._setXList();
        if (this.yList === undefined) this._setYList();
        if (this.colorScale === undefined) this._setColorScale();

        // TODO: creates separate panels for text labels?
        // text labels
        // data join
        const xLabels = dom.selectAll(".xLabel")
            .data(this.xList);

        // update old elements
        xLabels.attr("transform", (d) => {
                let x = this.xScale(d)+(this.xScale.bandwidth()/2) + 1;
                let y = this.yScale.range()[1] + 17;
                return `translate(${x}, ${y}) rotate(${angle})`;
            })
            .attr("class", (d, i) => `xLabel normal x${i}`);


        // enter new elements and update
        xLabels.enter().append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("class", (d, i) => `xLabel normal x${i}`)
            .style("text-anchor", "start")
            .attr("transform", (d) => {
                let x = this.xScale(d)+(this.xScale.bandwidth()/2) + 1;
                let y = this.yScale.range()[1] + 17;
                return `translate(${x}, ${y}) rotate(${angle})`;
            })
            .merge(xLabels)
            .text((d) => d);

        // exit -- removes old elements as needed
        xLabels.exit().remove();

        const yLabels = dom.selectAll(".yLabel")
            .data(this.yList)
            .enter().append("text")
            .text((d) => d)
            .attr("x", this.xScale.range()[1] + 5)
            .attr("y", (d) => this.yScale(d) + 10)
            .attr("class", (d, i) => `yLabel normal y${i}`)
            .style("text-anchor", "start")
            .on('click', (d) => {
                alert(`${d} got clicked. To be implemented`)
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

        const cellMouseover = function(d) {
            const selected = select(this);
            const rowClass = selected.attr("row");
            const colClass = selected.attr("col");
             selectAll(".xLabel").filter(`.${rowClass}`)
            .classed('normal', false)
            .classed('highlighted', true);
            selectAll(".yLabel").filter(`.${colClass}`)
                .classed('normal', false)
                .classed('highlighted', true);
            selected.classed('expressmap-highlighted', true);
            console.log(`Row: ${d.x}, Column: ${d.y}, Value: ${d.originalValue}`)
        };

        const cellMouseout = function(d){
            const selected = select(this);
            const rowClass = selected.attr("row");
            const colClass = selected.attr("col");

            selectAll(".xLabel").filter(`.${rowClass}`)
                .classed('normal', true)
                .classed('highlighted', false);
            selectAll(".yLabel").filter(`.${colClass}`)
                .classed('normal', true)
                .classed('highlighted', false);
            selected.classed('expressmap-highlighted', false);
        };
        // data join
        const cells = dom.selectAll(".cell")
            .data(this.data, (d) => d.value);

        // update old elements
        cells.attr("x", (d) => this.xScale(d.x))
            .attr("y", (d) => this.yScale(d.y))
            .attr("row", (d) => `x${this.xList.indexOf(d.x)}`)
            .attr("col", (d) => `y${this.yList.indexOf(d.y)}`);

        // enter new elements
        cells.enter().append("rect")
            .attr("row", (d) => `x${this.xList.indexOf(d.x)}`)
            .attr("col", (d) => `y${this.yList.indexOf(d.y)}`)
            .attr("x", (d) => this.xScale(d.x))
            .attr("y", (d) => this.yScale(d.y))
            .attr("rx", 2)
            .attr('ry', 2)
            .attr("class", (d) => `cell expressmap-bordered`)
            .attr("width", this.xScale.bandwidth())
            .attr("height", this.yScale.bandwidth())
            .style("fill", (d) => this.colors[0])
            .on("mouseover", cellMouseover)
            .on("mouseout", cellMouseout)
            .merge(cells)
            .transition()
            .duration(2000)
            .style("fill", (d) => d.originalValue==0?this.nullColor:this.colorScale(d.value));

        // exit and remove
        cells.exit().remove();
    }



    _setXList(newList) {
        if(newList !== undefined){
            this.xList = newList
        }
        else {
            this.xList = replace()
                .key((d) => d.x)
                .entries(this.data)
                .map((d) => d.key);
        }

        this.xScale = scaleBand()
            .domain(this.xList)
            .range([0, this.width])
            .padding(.05); // TODO: eliminate hard-coded value
    }

    _setYList(newList) {
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
                .range([0, this.height])
                .padding(.05); // TODO: eliminate hard-coded value
    }

    _setColorScale() {
        let dmin = Math.round(min(this.data, (d) => d.value));
        let dmax = Math.round(max(this.data, (d) => d.value));
        this.colorScale = scaleQuantile() // scaleQuantile maps the continuous domain to a discrete range
            .domain([dmin, dmax])
            .range(this.colors);
    }
}