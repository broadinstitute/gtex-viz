/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
"use strict";
import {json} from "d3-fetch";
import {checkDomId, createSvg} from "./modules/utils";
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
                    let gevConfig = {
                        id: rootDivId,
                        data: eqtls,
                        width: 1200, //window.innerWidth*0.9,
                        height: 300, // TODO: use a dynamic width based on the matrix size
                        marginTop: 50,
                        marginRight: 100,
                        marginBottom: 30,
                        marginLeft: 30,
                        rowLabelWidth: 100,
                        columnLabelHeight: 100,
                        showLabels: false,
                        columnLabelAngle: 90,
                        columnLabelPosAdjust: 10,
                        useLog: false,
                        logBase: 10,
                        colorScheme: "RdBu", // a diverging color scheme
                        colorDomain: [-1, 1]
                    };
                    renderBubbleMap(gevConfig);
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
    let svg = createSvg(par.id, par.width, par.height, margin);
    console.log(par.data);
    let bmap = new BubbleMap(par.data, par.useLog, par.logBase, par.colorScheme, par.id+"-tooltip");
    bmap.draw(svg, {w:inWidth, h:inHeight}, par.columnLabelAngle, par.columnLabelPosAdjust, par.colorDomain, par.showLabels);
    return bmap;
}