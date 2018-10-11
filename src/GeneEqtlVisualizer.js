/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
"use strict";
import {json} from "d3-fetch";
import {brushX} from "d3-brush";
import {select, selectAll, event} from "d3-selection";
import {extent, max, min} from "d3-array";

import {checkDomId} from "./modules/utils";
import {
    getGtexUrls,
    parseGenes,
    parseSingleTissueEqtls,
    parseLD
} from "./modules/gtexDataParser";
import BubbleMap from "./modules/BubbleMap";
import HalfMap from "./modules/HalfMap";

export function render(svgPar, geneId, rootDivId, spinnerId, urls = getGtexUrls()){
    console.log(geneId);
    json(urls.geneId + geneId) // query the gene by geneId which could be gene name or gencode ID with or withour versioning
        .then(function(data){
            let gene = parseGenes(data, true, geneId); // fetch the gene by user specified gene ID
            json(urls.singleTissueEqtl + gene.gencodeId)
                .then(function(data2){
                    let eqtls = parseSingleTissueEqtls(data2);
                    // canvasPar.data = eqtls;
                    svgPar.data = eqtls;
                    json(urls.ld + gene.gencodeId)
                    .then(function(data) {
                        let ld = parseLD(data);
                        svgPar.ldData = ld.filter((d)=>d.value>=svgPar.ldCutoff); // filter unused data
                        renderBubbleMap(svgPar, gene, urls);
                        $('#' + spinnerId).hide();
                    });

                })
        })
}

/**
 * Set the dimensions of the panels
 * @param par
 * @returns {*}
 */
function setDimensions(par){
    par.margin = {
        left: par.marginLeft + par.focusPanelRowLabelWidth,
        top: par.marginTop,
        right: par.marginRight,
        bottom: par.marginBottom + par.focusPanelColumnLabelHeight
    };
    par.inWidth = par.width - (par.margin.left + par.margin.right);
    par.inHeight = par.height - (par.margin.top + par.margin.bottom);
    par.focusPanelHeight = par.inHeight - (par.legendHeight + par.miniPanelHeight);
    if (par.focusPanelHeight < 0) throw "Config error: focus panel height is negative.";
    par.focusPanelMargin = {
        left: par.margin.left,
        top: par.margin.top + par.miniPanelHeight + par.legendHeight
    };
    par.ldPanelMargin = {
        left: par.margin.left,
        top: par.focusPanelMargin.top + par.focusPanelHeight + par.focusPanelColumnLabelHeight + 80
    };
    return par;
}

function createSvg(rootId, width, height, margin, svgId=undefined){
    checkDomId(rootId);
    if (svgId===undefined) svgId=`${rootId}-svg`;
    let svg = select("#"+rootId).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", svgId);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    return svg;
}

/**
 * Render the bubble heatmap
 * @param par {Object} configure the visualizations
 * TODO: check required attributes in par
 * @param gene {Object} containing attr: gencodeId
 * @returns {BubbleMap}
 */
function renderBubbleMap(par, gene, urls){
    par = setDimensions(par);

    let bmap = new BubbleMap(par.data, par.useLog, par.logBase, par.colorScheme, par.id+"-tooltip");
    let ldMap = new HalfMap(par.ldData, par.ldCutoff, false, undefined, par.ldColorScheme, par.id+"-tooltip");

    let svg = createSvg(par.id, par.width, par.height, par.margin, undefined);

    let miniG = svg.append("g")
        .attr("class", "context")
        .attr("transform", `translate(${par.margin.left}, ${par.margin.top})`);

    let focusG = svg.append("g")
        .attr("class", "focus")
        .attr("transform", `translate(${par.focusPanelMargin.left}, ${par.focusPanelMargin.top})`);

    let ldCanvas = select(`#${par.ldId}`).append("canvas")
        .attr("id", par.id + "-ld-canvas")
        .attr("width", par.width)
        .attr("height", par.width);

    let ldG = svg.append("g")
        .attr("class", "ld")
        .attr("transform", `translate(${par.ldPanelMargin.left}, ${par.ldPanelMargin.top})`);

    bmap.drawCombo(
        miniG,
        focusG,
        {w:par.inWidth, h:par.miniPanelHeight, top:5, left:0, h2: par.focusPanelHeight},
        par.colorScaleDomain,
        par.showLabels,
        par.focusPanelColumnLabelAngle,
        par.focusPanelColumnLabelAdjust,
        false);

    // add customed brush
    let brush = brushX()
        .extent([
            [0,0],
            [par.inWidth, par.miniPanelHeight]
        ])
        .on("brush", ()=>{
            let selection = event.selection;
            let brushLeft = Math.round(selection[0] / bmap.xScaleMini.step());
            let brushRight = Math.round(selection[1] / bmap.xScaleMini.step());

            // update scales
            bmap.xScale.domain(bmap.xScaleMini.domain().slice(brushLeft, brushRight)); // reset the xScale domain
            let bubbleMax = min([bmap.xScale.bandwidth(), bmap.yScale.bandwidth()]) / 2;
            bmap.bubbleScale.range([2, bubbleMax]); // TODO: change hard-coded min radius

            if (ldMap.xScale !== undefined) ldMap.xScale.domain(bmap.xScale.domain());
            if (ldMap.yScale !== undefined) ldMap.yScale.domain(bmap.xScale.domain());

            // update the focus bubbles
            focusG.selectAll(".bubble-map-cell")
                .attr("cx", (d) => {
                    let x = bmap.xScale(d.displayX ? d.displayX : d.x);
                    return x === undefined ? bmap.xScale.bandwidth() / 2 : x + bmap.xScale.bandwidth() / 2;

                })
                .attr("r", (d) => {
                    let x = bmap.xScale(d.displayX ? d.displayX : d.x);
                    return x === undefined ? 0 : bmap.bubbleScale(d.r)
                });

            // update the column labels
            focusG.selectAll(".bubble-map-xlabel")
                .attr("transform", (d) => {
                    let x = bmap.xScale(d) + bmap.xScale.bandwidth()/3 || 0; // TODO: remove hard-coded value
                    let y = bmap.yScale.range()[1] + par.focusPanelColumnLabelAdjust;
                    return `translate(${x}, ${y}) rotate(${par.focusPanelColumnLabelAngle})`;

                })
                .style("font-size", `${Math.floor(bmap.xScale.bandwidth())/2}px`)
                .style("display", (d) => {
                    let x = bmap.xScale(d);
                    return x === undefined ? "none" : "block";
                });

            // render the LD
            ldG.selectAll("*").remove(); // clear all child nodes in ldG before rendering
            // clear the canvas context
            let context = ldCanvas.node().getContext('2d');
            context.save();
            context.setTransform(1,0,0,1,0,0);
            context.clearRect(0, 0, ldCanvas.width, ldCanvas.height); // clear the canvas
            // draw
            ldMap.draw(ldCanvas, ldG, {w:par.inWidth, top:0, left:par.ldPanelMargin.left}, [0,1], false, undefined, bmap.xScale.domain(), bmap.xScale.domain());
        });
    miniG.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, [0, bmap.xScaleMini.bandwidth()*50]);



    // bmap.drawColorLegend(svg, {x: 0, y: -30}, 3, "NES");
    // bmap.drawBubbleLegend(svg, {x: 500, y:-30, title: "-log10(p-value)"}, 5, "-log10(p-value)");

    return bmap;

}