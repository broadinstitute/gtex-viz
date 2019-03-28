/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

import {scaleLinear} from "d3-scale";
import {axisBottom, axisTop} from "d3-axis";
import {brushX} from "d3-brush";
import {event} from "d3-selection";
import {setColorScale} from "./colors";
import {max, min} from "d3-array";

export default class MiniGenomeBrowser{
    /**
     * Rendering the genomic features in a 1D plot
     * @param data {LIST} a list of gene objects with attributes: pos, start, end, strand, featureLabel, and featureType
     * @param center {Integer} the center position
     * @param window {Integer} the position range (one-side)
     */
    constructor(data, center, window=1e6){
        this.data = data;
        this.center = center;
        this.window = window;
        this.scale = undefined;
        this.tooltip = undefined;
    }

    render(dom, width=1500, height=200, showWidth=false, trackLabel="Track", bgColor="#ffffff", featureColor="#ababab", useColorValue=false, maxColorValue=undefined){
        this.dom = dom;
        let range = [0, width];
        let domain = [this.center-this.window, this.center+this.window];
        this.scale = scaleLinear()
            .rangeRound(range)
            .domain(domain);

        if (useColorValue){
            this.colorScale = setColorScale(this.data.map((d)=>d.colorValue), "Greys", 0);
            const maxValue = maxColorValue===undefined?(this.data.map((d)=>d.colorValue)):maxColorValue;
            this.maxColor = this.colorScale(maxValue);
        }
        let browser = this.dom.append("g");

        // genome browser backbone
        let backboneHeight = 10;
        browser.append("rect")
            .attr("x", 0)
            .attr("y", height/2)
            .attr("width", width)
            .attr("height", backboneHeight)
            .style("fill", bgColor)
            .style("stroke", "#ababab")
            .style("stroke-width", 1);

        // genome features
        // NOTE: d.pos is used when showWidth is false, d.pos is independent to the strand that the feature is on, applicable for rendering TSS sites, variants.
        // NOTE: d.start and d.end are used when showWidth is true.
        let features = browser.selectAll('.minibrowser-feature')
            .data(this.data)
            .enter()
            .append("rect")
            .attr("class", "minibrowser-feature")
            .attr("x", (d)=>{
                if (showWidth) return this.scale(d.start);
                return this.scale(d.pos)
            })
            .attr("y", (d)=>height/2)
            .attr("width", (d)=>{
                if (showWidth) {
                    let w = Math.abs(this.scale(d.start)-this.scale(d.end)+1)||1;
                    return w
                }
                return 1;
            })
            .attr("height", (d)=>backboneHeight)
            .style("fill", (d)=>{
                if (!showWidth && d.pos == this.center) return "red";
                if (useColorValue){
                    if (!isFinite(d.colorValue)) return this.maxColor;
                    return this.colorScale(d.colorValue);
                }
                return featureColor
            });

        // track label
        browser.append("text")
            .attr("x", -10)
            .attr("y", height/2 + 5)
            .style("font-size", "9px")
            .style("text-anchor", "end")
            .text(trackLabel);

    }

    static renderAxis(dom, scale, yPos, addBrush=true, callback=null, brushConfig={w:50, h:20}, brushCenter=0){
        let axis = axisTop(scale)
            .tickValues(scale.ticks(7)); // TODO: provide more options to customize the axis--location and the number of ticks
        const axisG = dom.append("g");
        axisG.attr("transform", `translate(0,${yPos})`)
            .call(axis)
            .selectAll("text");

        if (addBrush){
            const brushEvent = ()=> {
                let selection = event.selection; // event is a d3-selection object
                let leftPos = selection[0];
                let rightPos = selection[1];
                let brushLeftBound = Math.round(scale.invert(selection[0])); // selection provides the position in pixel, use the scale to invert that to chromosome position
                let brushRightBound = Math.round(scale.invert(selection[1]));
                callback(leftPos, rightPos, brushLeftBound, brushRightBound)
            };

            const brush = brushX()
                .extent([
                    [0,-brushConfig.h],
                    [scale.range()[1], 20]
                ])
                .on("brush", brushEvent);
            axisG.append("g")
                .attr("class", "brush")
                .call(brush)
                .call(brush.move, [scale(brushCenter)-brushConfig.w,scale(brushCenter)+brushConfig.w])
        }
    }
}