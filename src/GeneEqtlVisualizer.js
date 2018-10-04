/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
"use strict";
import {json} from "d3-fetch";
import {createSvg, createCanvas} from "./modules/utils";
import {
    getGtexUrls,
    parseGenes,
    parseSingleTissueEqtls
} from "./modules/gtexDataParser";
import BubbleMap from "./modules/BubbleMap";

export function render(geneId, rootDivId, spinnerId, urls = getGtexUrls()){
    console.log(geneId);
    json(urls.geneId + geneId) // query the gene by geneId which could be gene name or gencode ID with or withour versioning
        .then(function(data){
            let gene = parseGenes(data, true, geneId); // fetch the gene by user specified gene ID
            json(urls.singleTissueEqtl + gene.gencodeId)
                .then(function(data2){
                    let eqtls = parseSingleTissueEqtls(data2);
                    let gevCanvasConfig = {
                        id: rootDivId,
                        data: eqtls,
                        width: 2000, //window.innerWidth*0.9,
                        height: 330, // TODO: use a dynamic width based on the matrix size
                        marginTop: 100,
                        marginRight: 100,
                        marginBottom: 30,
                        marginLeft: 30,
                        showLabels: false,
                        rowLabelWidth: 150,
                        columnLabelHeight: 100,
                        columnLabelAngle: 90,
                        columnLabelPosAdjust: 10,
                        useLog: false,
                        logBase: 10,
                        colorScheme: "RdBu", // a diverging color scheme
                        colorScaleDomain: [-0.75, 0.75],
                        useCanvas: true
                    };

                    renderBubbleMap(gevCanvasConfig);
                    let gevSvgConfig = gevCanvasConfig;
                    gevSvgConfig.showLabels = true;
                    gevSvgConfig.useCanvas = false;
                    // renderBubbleMap(gevSvgConfig);
                    $('#' + spinnerId).hide();
                })
        })
}

export function renderBubbleMap(par){
    let margin = {
        left: par.showLabels?par.marginLeft + par.rowLabelWidth: par.marginLeft,
        top: par.marginTop,
        right: par.marginRight,
        bottom: par.showLabels?par.marginBottom + par.columnLabelHeight:par.marginBottom
    };
    let inWidth = par.width - (par.rowLabelWidth + par.marginLeft + par.marginRight);
    let inHeight = par.height - (par.columnLabelHeight + par.marginTop + par.marginBottom);

    if(par.useCanvas) {
        let svgId = par.id + '-svgDiv';
        let canvasId = par.id + '-canvasDiv';
        if ($(`#${svgId}`).length == 0) $('<div/>').attr('id', svgId).appendTo($(`#${par.id}`));
        if ($(`#${canvasId}`).length == 0) $('<div/>').attr('id', canvasId).appendTo($(`#${par.id}`));

        // let bmapSvg = new BubbleMap(par.data, par.useLog, par.logBase, par.colorScheme, svgId+"-tooltip");
        // let svg = createSvg(svgId, par.width, par.height, margin);
        // bmapSvg.drawSvg(svg, {w:inWidth, h:inHeight, top:0, left:0}, par.colorScaleDomain, par.showLabels, par.columnLabelAngle, par.columnLabelPosAdjust);

        let bmapCanvas = new BubbleMap(par.data, par.useLog, par.logBase, par.colorScheme, canvasId+"-tooltip");
        let canvas = createCanvas(canvasId, par.width, par.height, margin);
        bmapCanvas.drawCanvas(canvas, {w:inWidth, h:inHeight, top: margin.top, left: margin.left}, par.colorScaleDomain, par.showLabels, par.columnLabelAngle, par.columnLabelPosAdjust)
        return bmapCanvas;
    }
    else {
        let bmap = new BubbleMap(par.data, par.useLog, par.logBase, par.colorScheme, par.id+"-tooltip");
        let svg = createSvg(par.id, par.width, par.height, margin);
        bmap.drawSvg(svg, {w:inWidth, h:inHeight, top:0, left:0}, par.colorScaleDomain, par.showLabels, par.columnLabelAngle, par.columnLabelPosAdjust);
        bmap.drawColorLegend(svg, {x: 0, y: -30}, 3, "NES");
        bmap.drawBubbleLegend(svg, {x: 500, y:-30, title: "-log10(p-value)"}, 5, "-log10(p-value)");
        return bmap;

    }
}