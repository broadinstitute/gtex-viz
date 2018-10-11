/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
'use strict';

import {json} from 'd3-fetch';
import {select} from 'd3-selection';
import {getGtexUrls, parseTissues} from './modules/gtexDataParser';

import GroupedViolin from './modules/GroupedViolin';

export function launch(rootId, tooltipRootId, gencodeId, urls=getGtexUrls()) {
    const promises = [
        json(urls.tissue),
        json(urls.geneExp + gencodeId)
    ];

    const ids = {
        rootId: rootId,
        tooltipId: tooltipRootId
    };
                                        // top, right, bottom, left
    const margin = _setViolinPlotMargins(10, 75, 250, 50);
                                        // height, width, margins
    const dim = _setViolinPlotDimensions(1200, 250, margin);

    if ($(`#${ids.rootId}`).length == 0) throw 'Violin Plot Error: rootId does not exist.';
    if ($(`#${ids.tooltipId}`).length == 0) $('<div/>').attr('id', ids.tooltip).appendTo($('body')); // create if not already present


    let svg = select(`#${ids.rootId}`)
                .append('svg')
                .attr('width', dim.outerWidth)
                .attr('height', dim.outerHeight)
                .append('g')
                    .attr('transform', `translate(${margin.left}, ${margin.top})`);


    Promise.all(promises)
        .then(function(args) {
            const tissues = parseTissues(args[0]);
            const tissueIdNameMap = {};
            const tissueIdColorMap = {};
            tissues.forEach(x => {
                tissueIdNameMap[x.tissueSiteDetailId] = x.tissueSiteDetail;
                tissueIdColorMap[x.tissueSiteDetailId] = x.colorHex;
            });
            const violinPlotData = parseGeneExpressionForViolin(args[1], tissueIdNameMap, tissueIdColorMap);
            // setting colors for each violin by tissue
            violinPlotData.forEach((d) => {d.color = `#${tissueIdColorMap[d.tissueSiteDetailId]}`});
            const tissueGroups = violinPlotData.map((d) => d.group);
            let violinPlot = new GroupedViolin(violinPlotData);
            violinPlot.createTooltip(ids.tooltipId)


            let width = dim.width;
            let height = dim.height;
            let xPadding = 0.1;
            let xDomain = tissueGroups.sort(); // alphabetically sorting by tissue
            let yDomain =[];
            let yLabel = 'log10(TPM)';
            let showX = true;
            let showSubX = false;
            // let showWhisker = false;
            // let showDivider = false;
            // let showLegend = false;
            // let showSize = false;
            violinPlot.render(svg, width, height, xPadding, xDomain, yDomain, yLabel, showX, showSubX);
        });
}

/**
 * Set the margins of the violin plot
 * @param top {Integer}
 * @param right {Integer}
 * @param bottom {integer}
 * @param left {Integer}
 * @returns {{top: number, right: number, bottom: number, left: number}}
 * @private
 */
function _setViolinPlotMargins(top=50, right=50, bottom=50, left=50){
    return {
        top: top,
        right: right,
        bottom: bottom,
        left: left
    };
}

/**
 * Set the dimensions of the violin plot
 * @param width {Integer}
 * @param height {Integer}
 * @param margin {Object} with attr: top, right, bottom, left
 * @returns {{width: number, height: number, outerWidth: number, outerHeight: number}}
 * @private
 */
function _setViolinPlotDimensions(width=1200, height=250, margin=_setViolinPlotMargins()){
    return {
        width: width,
        height: height,
        outerWidth: width + (margin.left + margin.right),
        outerHeight: height + (margin.top + margin.bottom)
    }
}

/**
 *
 * DATA PARSERS
 *
 */

/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 * @param IdNameMap {Dictionary} mapping of tissueIds to tissue names
 */
function parseGeneExpressionForViolin(data, idNameMap=undefined, colors=undefined, useLog=true){
    const attr = 'geneExpression';
    if(!data.hasOwnProperty(attr)) throw 'Parse Error: required json attribute is missing: ' + attr;
    data[attr].forEach((d)=>{
        ['data', 'tissueSiteDetailId', 'geneSymbol', 'gencodeId'].forEach((k)=>{
            if(!d.hasOwnProperty(k)){
                console.error(d);
                throw 'Parse Error: required json attribute is missing: ' + k;
            }
        });
        d.values = useLog?d.data.map((dd)=>{return Math.log10(+dd+1)}):d.data;
        d.group = idNameMap===undefined?d.tissueSiteDetailId:idNameMap[d.tissueSiteDetailId];
        d.label = d.subsetGroup===undefined?d.geneSymbol:d.subsetGroup;
        d.color = colors===undefined?'#90c1c1':colors[d.tissueSiteDetailId];
    });
    return data[attr];
}
