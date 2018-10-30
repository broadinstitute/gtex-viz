/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
'use strict';

import {json} from 'd3-fetch';
import {median} from 'd3-array';
import {select} from 'd3-selection';
import {getGtexUrls, parseTissues, parseTissueSites} from './modules/gtexDataParser';
import {createTissueGroupMenu, parseTissueGroupMenu} from './modules/gtexMenuBuilder';
import GroupedViolin from './modules/GroupedViolin';

export function launch(rootId, tooltipRootId, gencodeId, urls=getGtexUrls()) {
    const promises = [
        json(urls.tissue),
        json(urls.geneExp + gencodeId)
    ];

    const ids = {
        root: rootId,
        svg: `${rootId}-svg`,
        tooltip: tooltipRootId,
        toolbar: `${rootId}-toolbar`,
        clone: `${rootId}-svg-clone`, // for user download
        buttons: {
            download: `${rootId}-svg-download`,
            ascAlphaSort: `${rootId}-svg-asc-alphasort`,
            descAlphaSort: `${rootId}-svg-desc-alphasort`,
            ascSort: `${rootId}-svg-asc-sort`,
            descSort: `${rootId}-svg-desc-sort`,
            logScale: `${rootId}-svg-log-scale`,
            linearScale: `${rootId}-svg-linear-scale`,
            filter: `${rootId}-svg-filter`
        },
        plotSorts: {
            ascAlphaSort: 'asc-alpha',
            descAlphaSort: 'desc-alpha',
            ascSort: 'asc-num',
            descSort: 'desc-num'
        },
        tissueFilter: 'gene-expr-vplot-filter-modal'

    };
                                        // top, right, bottom, left
    const margin = _setViolinPlotMargins(35, 75, 250, 50);
                                        // height, width, margins
    const dim = _setViolinPlotDimensions(1200, 250, margin);

    if ($(`#${ids.root}`).length == 0) throw 'Violin Plot Error: rootId does not exist.';
    // create DOM components if not already present
    if ($(`#${ids.tooltip}`).length == 0) $('<div/>').attr('id', ids.tooltip).appendTo($(`#${ids.root}`));
    if ($(`#${ids.toolbar}`).length == 0) $('<div/>').attr('id', ids.toolbar).appendTo($(`#${ids.root}`));
    if ($(`#${ids.clone}`).length == 0) $('<div/>').attr('id', ids.clone).appendTo($(`#${ids.root}`));


    let svg = select(`#${ids.root}`)
                .append('svg')
                .attr('id', ids.svg)
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
            const violinPlotData = _parseGeneExpressionForViolin(args[1], tissueIdNameMap, tissueIdColorMap);
            const tissueGroups = violinPlotData.map(d => d.group);
            let violinPlot = new GroupedViolin(violinPlotData);
            // alphabetically sort by default
            violinPlot.data.sort((a,b) => {
                if (a.group < b.group) return -1;
                else if (a.group > b.group) return 1;
                else return 0;
            });
            let tooltip = violinPlot.createTooltip(ids.tooltip)


            let width = dim.width;
            let height = dim.height;
            let xPadding = 0.1;
            let xDomain = violinPlot.data.map(d => d.group);
            let yDomain =[];
            let yLabel = 'log10(TPM)';
            let showX = true;
            let showSubX = false;
            let subXAngle = 0;
            let showWhisker = false;
            let showDivider = false;
            let showLegend = false;
            // let showSize = false;
            violinPlot.render(svg, width, height, xPadding, xDomain, yDomain, yLabel, showX, showSubX, subXAngle, showWhisker, showDivider, showLegend);
            _populateTissueFilter(violinPlot, ids.tissueFilter, args[0]);
            _addToolbar(violinPlot, tooltip, ids);
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

function _addToolbar(vplot, tooltip, ids) {
    let toolbar = vplot.createToolbar(ids.toolbar, tooltip);
    toolbar.createDownloadSvgButton(ids.buttons.download, ids.svg, 'gtex-violin-plot.svg', ids.clone);
    // ascending alphabetical sort
    toolbar.createButton(ids.buttons.ascAlphaSort, 'fa-sort-alpha-down');
    let ascAlphaSortButton = select(`#${ids.buttons.ascAlphaSort}`)
        .classed('active', true)
        .on('mouseover', ()=>{toolbar.tooltip.show('Sort Alphabetically (Asc)');})
        .on('mouseout', ()=>{toolbar.tooltip.hide();});
    // adding property to keep track of sort for the gene expression plot ONLY
    vplot.genePlotSort = ids.plotSorts.ascAlphaSort;

    // descending alphabetical sort
    toolbar.createButton(ids.buttons.descAlphaSort, 'fa-sort-alpha-up');
    let descAlphaSortButton = select(`#${ids.buttons.descAlphaSort}`)
        .on('mouseover', ()=>{toolbar.tooltip.show('Sort Alphabetically (Desc)');})
        .on('mouseout', ()=>{toolbar.tooltip.hide();});

    // ascending numerical sort
    toolbar.createButton(ids.buttons.ascSort, 'fa-sort-numeric-down');
    let ascNumSortButton = select(`#${ids.buttons.ascSort}`)
        .on('mouseover', ()=>{toolbar.tooltip.show('Sort by Median (Asc)');})
        .on('mouseout', ()=>{toolbar.tooltip.hide();});

    // descending numerical sort
    toolbar.createButton(ids.buttons.descSort, 'fa-sort-numeric-up');
    let descNumSortButton = select(`#${ids.buttons.descSort}`)
        .on('mouseover', ()=>{toolbar.tooltip.show('Sort by Median (Desc)');})
        .on('mouseout', ()=>{toolbar.tooltip.hide();});

    // log scale
    toolbar.createButton(ids.buttons.logScale, 'fa-sliders-h');
    let logScaleButton = select(`#${ids.buttons.logScale}`)
        .classed('active', true)
        .on('mouseover', ()=>{toolbar.tooltip.show('Log Scale');})
        .on('mouseout', ()=>{toolbar.tooltip.hide();});

    // linear scale
    toolbar.createButton(ids.buttons.linearScale, 'fa-sliders-h');
    let linearScaleButton = select(`#${ids.buttons.linearScale}`)
        .on('mouseover', ()=>{toolbar.tooltip.show('Linear Scale');})
        .on('mouseout', ()=>{toolbar.tooltip.hide();});

    // filter
    toolbar.createButton(ids.buttons.filter, 'fa-filter');
    let tissueFilterButton = select(`#${ids.buttons.filter}`)
        .on('mouseover', ()=>{toolbar.tooltip.show('Filter Tissues');})
        .on('mouseout', ()=>{toolbar.tooltip.hide();});


    ascAlphaSortButton.on('click', (d, i, nodes)=>{
        if (!ascAlphaSortButton.classed('active')) {
            ascAlphaSortButton.classed('active', true);
            descAlphaSortButton.classed('active', false);
            ascNumSortButton.classed('active', false);
            descNumSortButton.classed('active', false);

            vplot.genePlotSort = ids.plotSorts.ascAlphaSort;
            _sortAndUpdateData(vplot, ids);
        }

    });

    descAlphaSortButton.on('click', (d, i, nodes)=>{
        if (!descAlphaSortButton.classed('active')) {
            ascAlphaSortButton.classed('active', false);
            descAlphaSortButton.classed('active', true);
            ascNumSortButton.classed('active', false);
            descNumSortButton.classed('active', false);

            vplot.genePlotSort = ids.plotSorts.descAlphaSort;
            _sortAndUpdateData(vplot, ids);
        }
    });

    ascNumSortButton.on('click', (d, i, nodes)=>{
        if (!ascNumSortButton.classed('active')) {
            descAlphaSortButton.classed('active', false);
            ascAlphaSortButton.classed('active', false);
            ascNumSortButton.classed('active', true);
            descNumSortButton.classed('active', false);

            vplot.genePlotSort = ids.plotSorts.ascSort;
            _sortAndUpdateData(vplot, ids);
        }
    });

    descNumSortButton.on('click', (d, i, nodes)=>{
        if (!descNumSortButton.classed('active')) {
            descAlphaSortButton.classed('active', false);
            ascAlphaSortButton.classed('active', false);
            ascNumSortButton.classed('active', false);
            descNumSortButton.classed('active', true);

            vplot.genePlotSort = ids.plotSorts.descSort;
            _sortAndUpdateData(vplot, ids);
        }
    });

    linearScaleButton.on('click', (d, i, nodes)=>{
        if (!linearScaleButton.classed('active')) {
            logScaleButton.classed('active', false);
            linearScaleButton.classed('active', true);

            _calcViolinPlotValues(vplot.data, false);
            vplot.updateYScale('TPM');
        }
    });

    logScaleButton.on('click', (d, i, nodes)=>{
        if (!logScaleButton.classed('active')) {
            logScaleButton.classed('active', true);
            linearScaleButton.classed('active', false);

            _calcViolinPlotValues(vplot.data, true);
            vplot.updateYScale('log10(TPM)');
        }
    });

    tissueFilterButton.on('click', (d, i, nodes)=>{
        $('#gene-expr-vplot-filter-modal').modal('show');
    });

}

function _calcViolinPlotValues(data, useLog=true) {
    data.forEach((d)=>{
        d.values = useLog?d.data.map((dd)=>{return Math.log10(+dd+1)}):d.data;
        d.median = useLog?Math.log(median(d.data)+1):median(d.data);
    });
    return data;
}

/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 * @param IdNameMap {Dictionary} mapping of tissueIds to tissue names
 */
function _parseGeneExpressionForViolin(data, idNameMap=undefined, colors=undefined, useLog=true){
    const attr = 'geneExpression';
    if(!data.hasOwnProperty(attr)) throw 'Parse Error: required json attribute is missing: ' + attr;
    data[attr].forEach((d)=>{
        ['data', 'tissueSiteDetailId', 'geneSymbol', 'gencodeId'].forEach((k)=>{
            if(!d.hasOwnProperty(k)){
                console.error(d);
                throw 'Parse Error: required json attribute is missing: ' + k;
            }
        });
        d.group = idNameMap===undefined?d.tissueSiteDetailId:idNameMap[d.tissueSiteDetailId];
        d.label = d.subsetGroup===undefined?d.geneSymbol:d.subsetGroup;
        d.color = colors===undefined?'#90c1c1':colors[d.tissueSiteDetailId];
    });
    _calcViolinPlotValues(data[attr], useLog);
    return data[attr];
}

function _populateTissueFilter(vplot, domId, tissues) {
    const tissueGroups = parseTissueSites(tissues);
    createTissueGroupMenu(tissueGroups, `${domId}-body`, false, true, 3);
    _addTissueFilterEvent(vplot, domId, tissueGroups);
}

function _addTissueFilterEvent(vplot, domId, tissues) {
    $(`#${domId}`).on('hidden.bs.modal', (e) => {
        let currSort = vplot.genePlotSort;

        let checkedTissues = parseTissueGroupMenu(tissues, `${domId}-body`, true);
        _filterTissues(vplot, checkedTissues);
        // vplot.updateXScale(checkedTissues);
    });
}

function _sortAndUpdateData(vplot, ids) {
    switch (vplot.genePlotSort) {
        case ids.plotSorts.ascAlphaSort:
            vplot.data.sort((a,b) => {
                if (a.group < b.group) return -1;
                else if (a.group > b.group) return 1;
                else return 0;
            });
            break;
        case ids.plotSorts.descAlphaSort:
            vplot.data.sort((a,b) => {
                if (a.group < b.group) return 1;
                else if (a.group > b.group) return -1;
                else return 0;
            });
            break;
        case ids.plotSorts.ascSort:
            vplot.data.sort((a,b) => { return b.median - a.median; });
            break;
        case ids.plotSorts.descSort:
            vplot.data.sort((a,b) => { return a.median - b.median; });
            break;
        default:
    }

    let xDomain = vplot.data.map((d) => d.group);
    vplot.updateXScale(xDomain);
}

function _filterTissues(vplot, tissues) {
    let filteredData = vplot.data.filter(x => tissues.includes(x.group));
    let xDomain = filteredData.map(x => x.group);
    vplot.updateXScale(xDomain);
}
