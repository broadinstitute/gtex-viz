/*
Input data structure: a list of data object with the following structure:
[
    {
        label: "dataset 1",
        values: [a list of numerical values]
     },
     {
        label: "dataset 2",
        values: [a list of numerical values]
     }
]
*/

import {extent, ascending, median} from "d3-array";
import {scaleBand, scaleLinear} from "d3-scale";
import {area} from "d3-shape";
import {axisBottom, axisLeft} from "d3-axis";
import {brush} from "d3-brush";
import {select, event} from "d3-selection";
import {kernelDensityEstimator, kernel, kernelBandwidth} from "./kde";
import Toolbar from "./Toolbar";
import Tooltip from "./Tooltip";

export default class Violin {
    constructor(data){
        this._sanityCheck(data);
        this.data = data;
        this.tooltip = undefined;
        this.toolbar = undefined;
    }


    /**
     * renders the violin plot
     * @param dom {DOM} a D3 SVG DOM element object
     * @param width {Integer}
     * @param height {Integer}
     * @param yDomain {Array} [min, max] of the y scale
     * @param zDomain {Array} [min, max] of the z scale (it's the scale of the violin width)
     * @param bins {Integer} the number of bins to use for the KDE
     * @param xPadding {Float} padding of the x scale
     */
    render(dom, width=800, height=500, yDomain=undefined, zDomain=[-1, 1], bins=50, xPadding=0.05){

        // defines the X, Y, Z scales
        let scale = this._setScales(yDomain, zDomain, width, height, xPadding);
        let binValues = scale.y.ticks(bins); // these values are set only once using the original y scale
        // for each data entry
        this.data.forEach((entry, i) => {

            // kernel density estimation to get the vertices for the violin contour
            // vertices should not change when the rendering scale changes
            entry.vertices = kernelDensityEstimator(
                kernel.gaussian,
                binValues,
                kernelBandwidth.nrd(entry.values))
            (entry.values);
            let theViolin = dom.append("g").attr("id", `violin${i}`)
                .classed("gtex-violin", true);
            this._drawViolin(entry, theViolin, scale);
        });

        // X and Y axes
        let xAxis = axisBottom(scale.x);
        let yAxis = axisLeft(scale.y).tickValues(scale.y.ticks(5));

        // render the x axis
        var buffer = 5;
        dom.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", `translate(0, ${height + buffer})`)
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "start")
            .attr("transform", "rotate(30, -10, 10)");

        // add the y axis
        dom.append("g")
            .attr("class", "axis axis--y")
            .attr("transform", `translate(-${buffer}, 0)`)
            .call(yAxis);

        // add the brush
        let theBrush = brush();
        theBrush.on("end", (d) => {this._brush(dom, theBrush, yDomain, scale, xAxis, yAxis)});

        dom.append("g")
            .attr("class", "brush")
            .call(theBrush);

    }

    createToolbar(domId, tooltip=undefined){
        this.toolbar = new Toolbar(domId, tooltip);
        return this.toolbar
    }

    createTooltip(domId){
        this.tooltip = new Tooltip(domId);
        select(`#${domId}`).classed('violin-tooltip', true); // specific violin plot tooltip styling
        return this.tooltip;
    }

    _setScales(yDomain, zDomain, width, height, xPadding){
        if (undefined === yDomain){
            let allV = [];
            this.data.forEach((d) => allV = allV.concat(d.values));
            yDomain = extent(allV);
        }

        return {
            x: scaleBand()
                .rangeRound([0, width])
                .domain(this.data.map((d) => d.label))
                .padding(xPadding),
            y: scaleLinear()
                .rangeRound([height, 0])
                .domain(yDomain),
            z: scaleLinear() // the violin's width
                .domain(zDomain)
        };
    }
    _drawViolin(entry, dom, scale){
         // set the scale.z range based on scale.x
        let x0 = scale.x(entry.label),
            x1 = x0 + scale.x.bandwidth();
        scale.z.range([x0, x1]);

        entry.values = entry.values.sort(ascending);

        /////// visual rendering ///////
        let violin = area()
            .x0((d) => scale.z(d[1]))
            .x1((d) => scale.z(-d[1]))
            .y((d) => scale.y(d[0]));

        // the violin
        dom.append("path")
            .datum(entry.vertices)
            .attr("class", "violin")
            .attr("d", violin);

        // the median line
        const med = median(entry.values);
        dom.append("line")
            .attr("x1", scale.z(-0.25))
            .attr("x2", scale.z(0.25))
            .attr("y1", scale.y(med))
            .attr("y2", scale.y(med))
            .attr("class", "median");
    }
    _brush(dom, theBrush, yDomain, scale, xAxis, yAxis) {
        let s = event.selection,
            idelTimeout,
            idelDelay = 350;

        if (!s) {
            if (!idelTimeout) return idelTimeout = setTimeout(function(){
                idelTimeout = null;
            }, idelDelay);
            scale.x.domain(this.data.map((d) => d.label));
            scale.y.domain(yDomain);

        } else {
            // reset the scale domains based on the brushed window
            scale.x.domain(scale.x.domain().filter((d, i)=>{
                  const lowBound = Math.floor(s[0][0]/scale.x.bandwidth());
                  const upperBound = Math.floor(s[1][0]/scale.x.bandwidth());
                  return i >= lowBound && i <=upperBound;
            })); // TODO: add comments

            scale.y.domain([s[1][1], s[0][1]].map(scale.y.invert));

            dom.select(".brush").call(theBrush.move, null);
        }

        // zoom
        let t = dom.transition().duration(750);
        dom.select(".axis--x").transition(t).call(xAxis);
        dom.select(".axis--y").transition(t).call(yAxis);

        this.data.forEach((entry, i)=>{
            // set z for each violin
            let x0 = scale.x(entry.label),
            x1 = x0 + scale.x.bandwidth();
            scale.z.range([x0, x1]);

            // rerender the violin
            let g = dom.select(`#violin${i}`);
            g.select(".violin")
                .transition(t)
                .attr("d", area()
            .x0((d) => scale.z(d[1]))
            .x1((d) => scale.z(-d[1]))
            .y((d) => scale.y(d[0])))
        });

    }

    _sanityCheck(data){
        data.forEach((d) => {
            if (d.label === undefined || d.values === undefined) throw "Violin: Input data error.";
            if (0 == d.values.length) throw "Violin: Input data error";
        });
    }

}