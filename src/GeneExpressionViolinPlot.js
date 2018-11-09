/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
'use strict';

import {json} from 'd3-fetch';
import {median} from 'd3-array';
import {select, selectAll} from 'd3-selection';
import {getGtexUrls, parseTissues, parseTissueSites} from './modules/gtexDataParser';
import {createTissueGroupMenu, parseTissueGroupMenu} from './modules/gtexMenuBuilder';
import GroupedViolin from './modules/GroupedViolin';

export function launch(rootId, tooltipRootId, gencodeId, urls=getGtexUrls(), margins=_setViolinPlotMargins(50,75,250,60), dimensions={w: 1200, h:250}) {
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
            download: `${rootId}-download`,
            plotOptions: `${rootId}-option-modal`,
            filter: `${rootId}-filter`,
            // plot option buttons
            ascAlphaSort: `${rootId}-asc-alphasort`,
            descAlphaSort: `${rootId}-desc-alphasort`,
            ascSort: `${rootId}-asc-sort`,
            descSort: `${rootId}-desc-sort`,
            logScale: `${rootId}-log-scale`,
            linearScale: `${rootId}-linear-scale`,
            noDiff: `${rootId}-no-diff`,
            sexDiff: `${rootId}-sex-diff`
        },
        plotOptionGroups: {
            scale: `${rootId}-option-scale`,
            sort: `${rootId}-option-sort`,
            differentiation: `${rootId}-option-differentiation`
        },
        plotSorts: {
            ascAlphaSort: 'asc-alphasort',
            descAlphaSort: 'desc-alphasort',
            ascSort: 'asc-sort',
            descSort: 'desc-sort'
        },
        tissueFilter: `${rootId}-filter-modal`

    };
    const margin = margins;
    const dim = _setViolinPlotDimensions(dimensions.w, dimensions.h, margin);

    if ($(`#${ids.root}`).length == 0) throw 'Violin Plot Error: rootId does not exist.';
    // create DOM components if not already present
    if ($(`#${ids.tooltip}`).length == 0) $('<div/>').attr('id', ids.tooltip).appendTo($('body'));
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
            const tissueDict = {};
            tissues.forEach(x => {
                tissueIdNameMap[x.tissueSiteDetailId] = x.tissueSiteDetail;
                tissueIdColorMap[x.tissueSiteDetailId] = x.colorHex;
                tissueDict[x.tissueSiteDetail] = x;
            });
            // TEMPORARY HACK
            tissueIdColorMap.male='90a6c1';
            tissueIdColorMap.female='efc94c';

            const violinPlotData = _parseGeneExpressionForViolin(args[1], tissueIdNameMap, tissueIdColorMap);
            const tissueGroups = violinPlotData.map(d => d.group);
            let violinPlot = new GroupedViolin(violinPlotData);
            // alphabetically sort by default
            violinPlot.data.sort((a,b) => {
                if (a.group < b.group) return -1;
                else if (a.group > b.group) return 1;
                else return 0;
            });
            let tooltip = violinPlot.createTooltip(ids.tooltip);

            // adding property to keep track of sorting and filtering specifically for this plot
            violinPlot.genePlotSort = ids.plotSorts.ascAlphaSort;
            violinPlot.allData = violinPlot.data.map(d=>d);
            violinPlot.gencodeId = gencodeId;
            violinPlot.tIdNameMap = tissueIdNameMap;
            violinPlot.tIdColorMap = tissueIdColorMap;
            violinPlot.tissueDict = tissueDict;
            violinPlot.scaleView = 'log';

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
            let showLegend = true;
            let showSize = false;
            let sortSubX = true;

            violinPlot.render(svg, width, height, xPadding, xDomain, yDomain, yLabel, showX, showSubX, subXAngle, showWhisker, showDivider, showLegend, showSize, sortSubX);
            _addViolinTissueColorBand(violinPlot, svg, tissueDict, 'bottom');
            _populateTissueFilter(violinPlot, ids.tissueFilter, ids, args[0]);
            _addToolbar(violinPlot, tooltip, ids, urls);
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
 * Adds toolbar allowing the user to control different plot options
 * @param vplot {GroupedViolin} Violin plot object to add toolbar to
 * @param tooltip {Tooltip} Violin plot tooltip
 * @param ids {Dictionary} Dictionary of IDs relevant to the plot
 * @param urls {Dictionary} Dictionary of URLs to use when making AJAX calls
 */
function _addToolbar(vplot, tooltip, ids, urls) {
    let toolbar = vplot.createToolbar(ids.toolbar, tooltip);
    toolbar.createDownloadSvgButton(ids.buttons.download, ids.svg, 'gtex-violin-plot.svg', ids.clone);

    // adding bootstrap classes to toolbar
    $(`#${ids.toolbar}`).addClass('row');
    $(`#${ids.toolbar} .btn-group`).addClass('col-xs-12 col-lg-1');

    $('<div></div>').appendTo(`#${ids.toolbar}`)
        .attr('id', `${ids.toolbar}-plot-options`)
        .attr('class', 'col-lg-11');
    let plotOptions = $(`#${ids.toolbar}-plot-options`);

    // sort options -- tissue name sorts
    $('<div/>').appendTo(plotOptions)
        .attr('class', `${ids.plotOptionGroups.sort} col-xs-12 col-lg-3 col-xl-2`)
        .attr('id', `vplot-alpha-sorts`);
    $('<span/>').appendTo(`.${ids.plotOptionGroups.sort}#vplot-alpha-sorts`)
        .attr('class', `${ids.root}-option-label`)
        .html('Tissue Sort');
    $('<div/>').appendTo(`.${ids.plotOptionGroups.sort}#vplot-alpha-sorts`)
        .attr('class', 'btn-group btn-group-sm')
        .attr('id', `${ids.plotOptionGroups.sort}-alpha`);
    let alphaSortButtonGroup = $(`#${ids.plotOptionGroups.sort}-alpha.btn-group`);
    $(`<button class="btn btn-default fa fa-sort-alpha-down" id="${ids.buttons.ascAlphaSort}"></button>`).appendTo(alphaSortButtonGroup);
    $(`<button class="btn btn-default fa fa-sort-alpha-up" id="${ids.buttons.descAlphaSort}"></button>`).appendTo(alphaSortButtonGroup);


    // sort options -- median sorts
    $('<div/>').appendTo(plotOptions)
        .attr('class', `${ids.plotOptionGroups.sort} col-xs-12 col-lg-3 col-xl-2`)
        .attr('id', `vplot-num-sorts`);
    $('<span/>').appendTo(`.${ids.plotOptionGroups.sort}#vplot-num-sorts`)
        .attr('class', `${ids.root}-option-label`)
        .html('Median Sort');
    $('<div/>').appendTo(`.${ids.plotOptionGroups.sort}#vplot-num-sorts`)
        .attr('class', 'btn-group btn-group-sm')
        .attr('id', `${ids.plotOptionGroups.sort}-num`);
    let numSortButtonGroup = $(`#${ids.plotOptionGroups.sort}-num.btn-group`);
    $(`<button class="btn btn-default fa fa-sort-numeric-down" id="${ids.buttons.ascSort}"></button>`).appendTo(numSortButtonGroup);
    $(`<button class="btn btn-default fa fa-sort-numeric-up" id="${ids.buttons.descSort}"></button>`).appendTo(numSortButtonGroup);

    // scale options
    $('<div/>').appendTo(plotOptions)
        .attr('id', ids.plotOptionGroups.scale)
        .attr('class', 'col-xs-12 col-lg-3 col-xl-2');
    $('<span/>').appendTo(`#${ids.plotOptionGroups.scale}`)
        .attr('class', `${ids.root}-option-label`)
        .html('Scale');
    $('<div/>').appendTo(`#${ids.plotOptionGroups.scale}`)
        .attr('class', 'btn-group btn-group-sm');
    let scaleButtonGroup = $(`#${ids.plotOptionGroups.scale} .btn-group`);
    $(`<button class="btn btn-default" id="${ids.buttons.logScale}">Log</button>`).appendTo(scaleButtonGroup);
    $(`<button class="btn btn-default" id="${ids.buttons.linearScale}">Linear</button>`).appendTo(scaleButtonGroup);

    // subsetting options
    $('<div/>').appendTo(plotOptions)
        .attr('id', ids.plotOptionGroups.differentiation)
        .attr('class', 'col-xs-12 col-lg-3 col-xl-5')
    $('<span/>').appendTo(`#${ids.plotOptionGroups.differentiation}`)
        .attr('class', `${ids.root}-option-label`)
        .html('Subset');
    $('<div/>').appendTo(`#${ids.plotOptionGroups.differentiation}`)
        .attr('class', 'btn-group btn-group-sm');
    let subsetButtonGroup = $(`#${ids.plotOptionGroups.differentiation} .btn-group`);
    $(`<button class="btn btn-default" id="${ids.buttons.noDiff}">None</button>`).appendTo(subsetButtonGroup);
    $(`<button class="btn btn-default" id="${ids.buttons.sexDiff}">Sex</button>`).appendTo(subsetButtonGroup);
    // adding spinner
    $(`<span><i id="spinner" class="fas fa-sync fa-spin" style="margin-left: 5px; display: none;"></i></span>`).appendTo(`#${ids.plotOptionGroups.differentiation}`);

    selectAll(`#${ids.plotOptionsModal} .modal-body button`).classed('active', false);

    // plot defaults
    // ascending alphabetical sort
    select(`#${ids.buttons.ascAlphaSort}`)
        .classed('active', true);
    // log scale
    select(`#${ids.buttons.logScale}`)
        .classed('active', true);
    // differentation
    select(`#${ids.buttons.noDiff}`)
        .classed('active', true);

    // filter
    toolbar.createButton(ids.buttons.filter, 'fa-filter');
    let tissueFilterButton = select(`#${ids.buttons.filter}`)
        .on('mouseover', ()=>{toolbar.tooltip.show('Filter Tissues');})
        .on('mouseout', ()=>{toolbar.tooltip.hide();});


    // sort changing events
    $(`.${ids.plotOptionGroups.sort} button`).on('click', (e)=>{
        if ($(e.currentTarget).hasClass('active')) return;
        vplot.genePlotSort = e.target.id.replace(`${ids.root}-`, '');
        selectAll(`.${ids.plotOptionGroups.sort} button`).classed('active', false);
        select(`button#${e.target.id}`).classed('active', true);
        _sortAndUpdateData(vplot, ids);
    });

    // scale changing events
    $(`#${ids.plotOptionGroups.scale} button`).on('click', (e)=>{
        if ($(e.currentTarget).hasClass('active')) return;
        selectAll(`#${ids.plotOptionGroups.scale} button`).classed('active', false);
        select(`button#${e.target.id}`).classed('active', true);
        if (e.target.id == ids.buttons.logScale) {
            _calcViolinPlotValues(vplot.data, true);
            _calcViolinPlotValues(vplot.allData, true);
            vplot.updateYScale('log10(TPM)');
            vplot.scaleView = 'log';
        } else {
            _calcViolinPlotValues(vplot.data, false);
            _calcViolinPlotValues(vplot.allData, false);
            vplot.updateYScale('TPM');
            vplot.scaleView = 'linear';
        }

        let svg = select(`#${ids.root} svg g`);
        _addViolinTissueColorBand(vplot, svg, vplot.tissueDict, 'bottom');
    });

    // differentiation changing events
    $(`#${ids.plotOptionGroups.differentiation} button`).on('click', (e)=>{
        if ($(e.currentTarget).hasClass('active')) return;
        $(`#${ids.toolbar}-plot-options button`).prop('disabled', true);
        $(`#${ids.toolbar} #spinner`).show();
        selectAll(`#${ids.plotOptionGroups.differentiation} button`).classed('active', false);
        select(`button#${e.target.id}`).classed('active', true);

        if (e.target.id == ids.buttons.sexDiff) {
            const promises = [ json(urls.geneExp + vplot.gencodeId + '&attributeSubset=sex') ];

            Promise.all(promises)
                .then(function(args) {
                    const violinPlotData = vplot.scaleView == 'log'? _parseGeneExpressionForViolin(args[0], vplot.tIdNameMap, vplot.tIdColorMap) : _parseGeneExpressionForViolin(args[0], vplot.tIdNameMap, vplot.tIdColorMap, false);
                    const filteredTissues = vplot.data.map(d => d.group);

                    vplot.allData = violinPlotData.map(d=>d);
                    vplot.data = violinPlotData.filter(d=>filteredTissues.indexOf(d.group) != -1);

                    vplot.reset();
                    let svg = select(`#${ids.root} svg g`);
                    _addViolinTissueColorBand(vplot, svg, vplot.tissueDict, 'bottom');
                    $(`#${ids.toolbar}-plot-options button`).prop('disabled', false);
                    $(`#${ids.toolbar} #spinner`).hide();
            });
        } else {
            const promises = [ json(urls.geneExp + vplot.gencodeId) ];

            Promise.all(promises)
                .then(function(args) {
                    const violinPlotData = vplot.scaleView == 'log'? _parseGeneExpressionForViolin(args[0], vplot.tIdNameMap, vplot.tIdColorMap) : _parseGeneExpressionForViolin(args[0], vplot.tIdNameMap, vplot.tIdColorMap, false);
                    const filteredTissues = vplot.data.map(d => d.group);
                    vplot.allData = violinPlotData.map(d=>d);
                    vplot.data = violinPlotData.filter(d=>filteredTissues.indexOf(d.group) != -1);
                    vplot.reset();
                    let svg = select(`#${ids.root} svg g`);
                    _addViolinTissueColorBand(vplot, svg, vplot.tissueDict, 'bottom');
                    $(`#${ids.toolbar} button`).prop('disabled', false);
                    $(`#${ids.toolbar} #spinner`).hide();
            });
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
}

/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 * @param IdNameMap {Dictionary} mapping of tissueIds to tissue names
 * @param useLog {Boolean} whether or not to calculate values in log
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
        d.color = colors===undefined?'#90c1c1':d.subsetGroup===undefined?'#90c1c1':colors[d.subsetGroup];
    });
    _calcViolinPlotValues(data[attr], useLog);
    return data[attr];
}

/**
 * populates tissue filter modal with tissues
 * @param  vplot {GroupedViolin} violin plot object being modified
 * @param  domId {String} ID of modal whose body is to be populated
 * @param  ids {Dictionary} Dictionary of IDs relevant to plot
 * @param  tissues {Array} Array of tissues returned from GTEx tissueSiteDetail API
 */
function _populateTissueFilter(vplot, domId, ids, tissues) {
    const tissueGroups = parseTissueSites(tissues);
    createTissueGroupMenu(tissueGroups, `${domId}-body`, false, true, 3);
    _addTissueFilterEvent(vplot, domId, ids, tissueGroups);
}

/**
 * filters tissues displayed in the plot
 * @param vplot {GroupedViolin} violin plot object being modified
 * @param domId {String} modal ID
 * @param ids {Dictionary} Dictionary of IDs relevant to plot
 * @param tissues {Dictionary} Dictionary of tissue groups
 */
function _addTissueFilterEvent(vplot, domId, ids, tissues) {
    $(`#${domId}`).on('hidden.bs.modal', (e) => {
        let currSort = vplot.genePlotSort;
        let checkedTissues = parseTissueGroupMenu(tissues, `${domId}-body`, true);
        _filterTissues(vplot, ids, checkedTissues);
    });
}

/**
 * Determines plot sort and updates plot view
 * @param  vplot {GroupedViolin} violin plot object to be modified
 * @param  ids {Dictionary} Dictionary of IDs relevant to plot
 */
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
            vplot.data.sort((a,b) => { return a.median - b.median; });
            break;
        case ids.plotSorts.descSort:
            vplot.data.sort((a,b) => { return b.median - a.median; });
            break;
        default:
    }

    let xDomain = vplot.data.map((d) => d.group);
    vplot.updateXScale(xDomain);
    let svg = select(`#${ids.root} svg g`);
    _addViolinTissueColorBand(vplot, svg, vplot.tissueDict, 'bottom');
}

/**
 * Filters view to only specified tissues
 * @param vplot {GroupedViolin} violin plot object to be modified
 * @param ids {Dictionary} Dictionary of IDs relevant to plot
 * @param tissues {Array} List of tissues to filter down to
 */
function _filterTissues(vplot, ids, tissues) {
    let filteredData = vplot.allData.filter(x => tissues.includes(x.group));
    vplot.data = filteredData;
    _sortAndUpdateData(vplot, ids);
}

/**
 * Adds tissue color to the plot
 * @param plot {GroupedViolin} violin plot object to be modified
 * @param dom {d3 Selection} d3 selection of the svg to modify
 * @param tissueDict {Dictionary} Dictionary of tissues containing color info
 * @param loc {String} "top" || "bottom"; specified where to display the colors
 */
function _addViolinTissueColorBand(plot, dom, tissueDict, loc="top"){
    // move x-axis down to make space for the color band
    const xAxis = dom.select('.violin-x-axis');
    xAxis.attr('transform', `${xAxis.attr('transform')} translate(0, 5)`);
    // add tissue colors
    const tissueG = dom.append("g");

    tissueG.selectAll(".tcolor").data(plot.scale.x.domain())
        .enter()
        .append("rect")
        .classed("tcolor", true)
        .attr("x", (g)=>plot.scale.x(g) )
        .attr("y", (g)=>loc=="top"?plot.scale.y.range()[1]:plot.scale.y.range()[0])
        .attr("width", (g)=>plot.scale.x.bandwidth())
        .attr("height", 5)
        .style("stroke-width", 0)
        .style("fill", (g)=>`#${tissueDict[g].colorHex}`)
        .style("opacity", 0.7);
}
