/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
"use strict";
import {select} from "d3-selection";
import {json} from "d3-fetch";
import {checkDomId} from "./modules/utils";
import {
    getGtexUrls,
    parseGenes,
    parseSingleTissueEqtls
} from "./modules/gtexDataParser";
import BubbleMap from "./modules/BubbleMap";

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
                    // renderBubbleMap(canvasPar);
                    renderBubbleMap(svgPar);
                    $('#' + spinnerId).hide();
                })
        })
}

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
    par.focusPanelMargin = {
        left: par.margin.left,
        top: par.margin.top + par.miniPanelHeight + par.legendHeight
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

export function renderBubbleMap(par){
    par = setDimensions(par);
    let bmap = new BubbleMap(par.data, par.useLog, par.logBase, par.colorScheme, par.id+"-tooltip");

    let svg = createSvg(par.id, par.width, par.height, par.margin, undefined);

    let miniG = svg.append("g")
        .attr("class", "context")
        .attr("transform", `translate(${par.margin.left}, ${par.margin.top})`);

    let focusG = svg.append("g")
        .attr("class", "focus")
        .attr("transform", `translate(${par.focusPanelMargin.left}, ${par.focusPanelMargin.top})`);

    bmap.drawCombo(miniG, focusG, {w:par.inWidth, h:par.miniPanelHeight, top:5, left:0, h2: par.focusPanelHeight}, par.colorScaleDomain, par.showLabels, par.focusPanelColumnLabelAngle);


    // bmap.drawColorLegend(svg, {x: 0, y: -30}, 3, "NES");
    // bmap.drawBubbleLegend(svg, {x: 500, y:-30, title: "-log10(p-value)"}, 5, "-log10(p-value)");

    return bmap;

    // if(par.useCanvas) {
    //     let svgId = par.id + '-svgDiv';
    //     let canvasId = par.id + '-canvasDiv';
    //     if ($(`#${svgId}`).length == 0) $('<div/>').attr('id', svgId).appendTo($(`#${par.id}`));
    //     if ($(`#${canvasId}`).length == 0) $('<div/>').attr('id', canvasId).appendTo($(`#${par.id}`));
    //
    //
    //     let bmapCanvas = new BubbleMap(par.data, par.useLog, par.logBase, par.colorScheme, canvasId+"-tooltip");
    //     let canvas = createCanvas(canvasId, par.width, par.height, margin, undefined, "static");
    //     bmapCanvas.drawCanvas(canvas, {w:inWidth, h:inHeight, top: margin.top, left: margin.left}, par.colorScaleDomain, par.showLabels, par.columnLabelAngle, par.columnLabelPosAdjust)
    //
    //     // add brush
    //     let svg = createSvg(svgId, par.width, par.height, margin, undefined, "absolute");
    //     let brush = brushX()
    //         .extent([0,0], [inWidth, inHeight])
    //         .on("brush end", ()=>{
    //             console.log("brushed!");
    //         });
    //     svg.append("g")
    //         .attr("class", "brush")
    //         .call(brush)
    //         .call(brush.move, bmapCanvas.xScale.range());
    //
    //
    //     return bmapCanvas;
    // }
    // else {


    // }
}