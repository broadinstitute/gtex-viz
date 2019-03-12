/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

import {scaleLinear} from "d3-scale";

export default class MiniGenomeBrowser{
    /**
     * Rendering the genomic features in a 1D plot
     * @param data {LIST} a list of gene objects with attributes: start, end, strand, featureLabel, and featureType
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

    render(dom, width=1500, height=200, showFeatureSize=false, showLabels=true, backboneColor="#eeeeee"){
        let range = [0, width];
        let domain = [this.center-this.window, this.center+this.window];
        this.scale = scaleLinear()
            .rangeRound(range)
            .domain(domain);

        let browser = dom.append("g");

        // genome browser backbone
        let backboneHeight = 10;
        browser.append("rect")
            .attr("x", 0)
            .attr("y", height/2)
            .attr("width", width)
            .attr("height", backboneHeight)
            .style("fill", backboneColor);

        // genome features (genes)
        const yAdjust = (d, i)=>{
            if (showLabels == false) return 0;
            let adjust = 5;
            if (i>0){
                // if the upstream feature x position is too close, adjust the y height;
                let upstreamF = this.data[i-1];
                if (upstreamF.strand != d.strand) return adjust;
                let dist = this.scale(d.start - upstreamF.start) + 1;
                if (dist <= 10) {adjust = i%2?adjust + 60: adjust + 30}
            }
            return adjust
        };

        let features = browser.selectAll('.minibrowser-feature')
            .data(this.data)
            .enter()
            .append("rect")
            .attr("class", "minibrowser-feature")
            .attr("x", (d)=>{
                // console.log(d.start, " ", this.scale(d.start));
                return this.scale(d.start)
            })
            .attr("y", (d, i)=>{
                let y = height/2;
                let featureH = showFeatureSize?Math.abs(this.scale(d.start)-this.scale(d.end) + 1):0;
                return d.strand=="+"?(y - featureH - yAdjust(d, i)): y;
            })
            .attr("width", 1)
            .attr("height", (d, i)=>{
                let h = backboneHeight + yAdjust(d, i);
                let featureH = showFeatureSize?Math.abs(this.scale(d.start)-this.scale(d.end) + 1):0;
                return h+featureH
            })
            .style("fill", (d)=>d.start==this.center?"red":'#0086af');

        // feature labels
        if (showLabels == false) return;
        let fLabels = browser.selectAll('.minibrowser-feature-label')
            .data(this.data)
            .enter()
            .append("text")
            .attr("class", (d, i) => `.minibrowser-feature-label`)
            .attr("x", 0)
            .attr("y", 0)
            .style("font-size", (d)=>d.start==this.center?'12px':'9px')
            .style("fill", (d)=>d.start == this.center? "red":"black")
            // .attr("text-anchor", (d)=>d.strand='-'?'start':'end')

            .attr("transform", (d, i) => {
                let x = d.strad=="+"?this.scale(d.start):this.scale(d.start)-5;
                let y = height/2;
                let adjust = d.strand=="+"?yAdjust(d, i):yAdjust(d, i) + 5;
                let featureH = showFeatureSize?Math.abs(this.scale(d.start)-this.scale(d.end) + 1):0;

                y = d.strand=="+"?(y - featureH - adjust): (y + backboneHeight + featureH + adjust);
                let angle = d.strand=="+"?-45:45;
                return `translate(${x}, ${y}) rotate(${angle})`;
            })
            .text((d) => d.featureLabel);


    }
}