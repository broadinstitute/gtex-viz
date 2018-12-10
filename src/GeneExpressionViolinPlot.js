/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
'use strict';

import {json} from 'd3-fetch';
import {median, ascending} from 'd3-array';
import {select, selectAll} from 'd3-selection';
import {getGtexUrls, parseTissues, parseTissueSites} from './modules/gtexDataParser';
import {createTissueGroupMenu, parseTissueGroupMenu} from './modules/gtexMenuBuilder';
import GroupedViolin from './modules/GroupedViolin';

export function launch(rootId, tooltipRootId, gencodeId, plotTitle="Gene Expression Violin Plot", urls=getGtexUrls(), margins=_setViolinPlotMargins(50,75,250,60), dimensions={w: window.innerWidth*0.8, h:250}) {
    const promises = [
        json(urls.tissue),
        json(urls.geneExp + gencodeId),
        json(urls.geneExp + gencodeId + '&attributeSubset=sex')
    ];

    const ids = {
        root: rootId,
        spinner: 'spinner',
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
            sexDiff: `${rootId}-sex-diff`,
            outliersOn: `${rootId}-outliers-on`,
            outliersOff: `${rootId}-outliers-off`
        },
        plotOptionGroups: {
            scale: `${rootId}-option-scale`,
            sort: `${rootId}-option-sort`,
            differentiation: `${rootId}-option-differentiation`,
            outliers: `${rootId}-option-outlier`
        },
        plotSorts: {
            ascAlphaSort: 'asc-alphasort',
            descAlphaSort: 'desc-alphasort',
            ascSort: 'asc-sort',
            descSort: 'desc-sort'
        },
        tissueFilter: `${rootId}-filter-modal`

    };

    if ($(`#${ids.root}`).length == 0) throw 'Violin Plot Error: rootId does not exist.';
    // create DOM components if not already present
    if ($(`#${ids.tooltip}`).length == 0) $('<div/>').attr('id', ids.tooltip).appendTo($('body'));
    if ($(`#${ids.toolbar}`).length == 0) $('<div/>').attr('id', ids.toolbar).appendTo($(`#${ids.root}`));
    if ($(`#${ids.root} #${ids.spinner}`).length == 0) $(`<span><i id="spinner" class="fas fa-sync fa-spin"></i></span>`).appendTo($(`#${ids.root}`)); else $(`#${ids.root} #${ids.spinner}`).show();
    if ($(`#${ids.clone}`).length == 0) $('<div/>').attr('id', ids.clone).appendTo($(`#${ids.root}`));


    Promise.all(promises)
        .then(function(args) {
            const tissues = parseTissues(args[0]);
            const tissueDict = {};
            const tissueIdNameMap = {};
            const groupColorDict = {
                female: '#e67f7b',
                male: '#70bcd2'
            };
            tissues.forEach(x => {
                tissueIdNameMap[x.tissueSiteDetailId] = x.tissueSiteDetail;
                tissueDict[x.tissueSiteDetail] = x;
                groupColorDict[x.tissueSiteDetailId] = x.colorHex;
            });

            const violinPlotData = _parseGeneExpressionForViolin(args[1], tissueIdNameMap, groupColorDict);
            let violinPlot = new GroupedViolin(violinPlotData);
            let tooltip = violinPlot.createTooltip(ids.tooltip);

            // adding properties to keep track of sorting and filtering specifically for this plot
            violinPlot.sortData = violinPlot.data.map(d=>d); // sort any differentiated data by the aggregate data, too
            violinPlot.allData = violinPlot.data.map(d=>d);
            violinPlot.gencodeId = gencodeId;
            violinPlot.tIdNameMap = tissueIdNameMap;
            violinPlot.groupColorDict = groupColorDict;
            violinPlot.tissueDict = tissueDict;
            violinPlot.geneJson = {
                allData: args[1],
                subsetData: args[2]
            };
            violinPlot.unit = violinPlotData.length > 0 ? ` ${violinPlotData[0].unit}` : '';
            // default plot options
            violinPlot.gpConfig = {
                subset: false,
                scale: 'log',
                sort: ids.plotSorts.ascAlphaSort,
                showOutliers: false,
                title: plotTitle
            };

            _drawViolinPlot(violinPlot, margins, dimensions, ids);
            _createTissueFilter(violinPlot, ids.tissueFilter, ids, args[0]);
            _addToolbar(violinPlot, tooltip, ids, urls);
            $(`#${ids.root} #${ids.spinner}`).hide();
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
 * @private
 */
function _addToolbar(vplot, tooltip, ids, urls) {
    let toolbar = vplot.createToolbar(ids.toolbar, tooltip);
    toolbar.createDownloadSvgButton(ids.buttons.download, ids.svg, 'gene-exp-plot.svg', ids.clone);

    // adding bootstrap classes to toolbar
    $(`#${ids.toolbar}`).addClass('row');
    $(`#${ids.toolbar} .btn-group`).addClass('col-xs-12 col-lg-1 text-nowrap').css('display', 'flex');

    $('<div></div>').appendTo(`#${ids.toolbar}`)
        .attr('id', `${ids.toolbar}-plot-options`)
        .attr('class', 'col-lg-11 text-nowrap');
    let plotOptions = $(`#${ids.toolbar}-plot-options`);

    // subsetting options
    $('<div/>').appendTo(plotOptions)
        .attr('id', ids.plotOptionGroups.differentiation)
        .attr('class', 'col-lg-2 col-xl-2');
    $('<span/>').appendTo(`#${ids.plotOptionGroups.differentiation}`)
        .attr('class', `${ids.root}-option-label`)
        .html('Subset');
    $('<div/>').appendTo(`#${ids.plotOptionGroups.differentiation}`)
        .attr('class', 'btn-group btn-group-sm');
    let subsetButtonGroup = $(`#${ids.plotOptionGroups.differentiation} .btn-group`);
    $(`<button class="btn btn-default" id="${ids.buttons.noDiff}">None</button>`).appendTo(subsetButtonGroup);
    $(`<button class="btn btn-default" id="${ids.buttons.sexDiff}">Sex</button>`).appendTo(subsetButtonGroup);

    // scale options
    $('<div/>').appendTo(plotOptions)
        .attr('id', ids.plotOptionGroups.scale)
        .attr('class', 'col-lg-2 col-xl-2');
    $('<span/>').appendTo(`#${ids.plotOptionGroups.scale}`)
        .attr('class', `${ids.root}-option-label`)
        .html('Scale');
    $('<div/>').appendTo(`#${ids.plotOptionGroups.scale}`)
        .attr('class', 'btn-group btn-group-sm');
    let scaleButtonGroup = $(`#${ids.plotOptionGroups.scale} .btn-group`);
    $(`<button class="btn btn-default" id="${ids.buttons.logScale}">Log</button>`).appendTo(scaleButtonGroup);
    $(`<button class="btn btn-default" id="${ids.buttons.linearScale}">Linear</button>`).appendTo(scaleButtonGroup);

    // sort options -- tissue name sorts
    $('<div/>').appendTo(plotOptions)
        .attr('class', `${ids.plotOptionGroups.sort} col-lg-2 col-xl-2`)
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
        .attr('class', `${ids.plotOptionGroups.sort} col-lg-2 col-xl-2`)
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

    // outlier display options
    $('<div/>').appendTo(plotOptions)
        .attr('id', ids.plotOptionGroups.outliers)
        .attr('class', 'col-lg-2 col-xl-2');
    $('<span/>').appendTo(`#${ids.plotOptionGroups.outliers}`)
        .attr('class', `${ids.root}-option-label`)
        .html('Outliers');
    $('<div/>').appendTo(`#${ids.plotOptionGroups.outliers}`)
        .attr('class', 'btn-group btn-group-sm');
    let outliersButtonGroup = $(`#${ids.plotOptionGroups.outliers} .btn-group`);
    $(`<button class="btn btn-default" id="${ids.buttons.outliersOn}">On</button>`).appendTo(outliersButtonGroup);
    $(`<button class="btn btn-default" id="${ids.buttons.outliersOff}">Off</button>`).appendTo(outliersButtonGroup);

    selectAll(`#${ids.plotOptionsModal} .modal-body button`).classed('active', false);

    // plot defaults
    selectAll(`#${ids.buttons.ascAlphaSort},
               #${ids.buttons.logScale},
               #${ids.buttons.noDiff},
               #${ids.buttons.outliersOff}`).classed('active', true);

    // filter
    toolbar.createButton(ids.buttons.filter, 'fa-filter');
    let tissueFilterButton = select(`#${ids.buttons.filter}`)
        .on('mouseover', ()=>{toolbar.tooltip.show('Filter Tissues');})
        .on('mouseout', ()=>{toolbar.tooltip.hide();});
    tissueFilterButton.on('click', (d, i, nodes)=>{
        $('#gene-expr-vplot-filter-modal').modal('show');
    });


    // sort events
    $(`.${ids.plotOptionGroups.sort} button`).on('click', function(e){
        let btn = select(this);
        if (btn.classed('active')) return;
        selectAll(`.${ids.plotOptionGroups.sort} button`).classed('active', false);
        btn.classed('active', true);
        vplot.gpConfig.sort = e.target.id.replace(`${ids.root}-`, '');
        _redrawViolinPlot(vplot, ids);
    });

    // scale events
    $(`#${ids.plotOptionGroups.scale} button`).on('click', function(e){
        let btn = select(this);
        if (btn.classed('active')) return;
        selectAll(`#${ids.plotOptionGroups.scale} button`).classed('active', false);
        btn.classed('active', true);
        vplot.gpConfig.scale = e.target.id == ids.buttons.logScale ? 'log' : 'linear';
        _redrawViolinPlot(vplot, ids);
    });

    // outlier display events
    $(`#${ids.plotOptionGroups.outliers} button`).on('click', function(e) {
        let btn = select(this);
        if (btn.classed('active')) return;
        selectAll(`#${ids.plotOptionGroups.outliers} button`).classed('active', false);
        btn.classed('active', true);
        vplot.gpConfig.showOutliers = e.target.id == ids.buttons.outliersOn;
        _updateOutlierDisplay(vplot, ids);
    });

    // differentiation events
    $(`#${ids.plotOptionGroups.differentiation} button`).on('click', function(e){
        let btn = select(this);
        if (btn.classed('active')) return;
        selectAll(`#${ids.plotOptionGroups.differentiation} button`).classed('active', false);
        btn.classed('active', true);
        vplot.gpConfig.subset = e.target.id == ids.buttons.sexDiff;
        _redrawViolinPlot(vplot, ids);
    });
}

/**
 * Calculates values for violin plot in specified scale
 * @param data
 * @param useLog {Boolean}
 * @private
 */
function _calcViolinPlotValues(data, useLog=true) {
    data.forEach((d)=>{
        d.values = useLog?d.data.map((dd)=>{return Math.log10(+dd+1)}):d.data;
        d.values.sort(ascending);
        // median needed for sorting
        d.median = median(d.values);
    });
}

/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 * @param IdNameMap {Dictionary} mapping of tissueIds to tissue names
 * @param useLog {Boolean} whether or not to calculate values in log
 * @private
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
        d.color = colors===undefined?'#90c1c1':d.subsetGroup===undefined?`#${colors[d.tissueSiteDetailId]}`:colors[d.subsetGroup];
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
 * @private
 */
function _createTissueFilter(vplot, domId, ids, tissues) {
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
 * @private
 */
function _addTissueFilterEvent(vplot, domId, ids, tissues) {
    $(`#${domId}`).on('hidden.bs.modal', (e) => {
        let checkedTissues = parseTissueGroupMenu(tissues, `${domId}-body`, true);
        _filterTissues(vplot, ids, checkedTissues);
    });
}

/**
 * Filters view to only specified tissues
 * @param vplot {GroupedViolin} violin plot object to be modified
 * @param ids {Dictionary} Dictionary of IDs relevant to plot
 * @param tissues {Array} List of tissues to filter down to
 * @private
 */
function _filterTissues(vplot, ids, tissues) {
    let filteredData = vplot.allData.filter(x => tissues.includes(x.group));
    vplot.data = filteredData;
    _redrawViolinPlot(vplot, ids);
}

/**
 * Moves the x-axis down
 * @param dom {svg} SVG to be modified
 * @private
 */
function _moveXAxis(dom) {
    const xAxis = dom.select('.violin-x-axis');
    xAxis.attr('transform', `${xAxis.attr('transform')} translate(0, 3)`);
}

/**
 * Adds tissue color to the plot
 * @param plot {GroupedViolin} violin plot object to be modified
 * @param dom {d3 Selection} d3 selection of the svg to modify
 * @param tissueDict {Dictionary} Dictionary of tissues containing color info
 * @param loc {String} "top" || "bottom"; specified where to display the colors
 * @private
 */
function _addViolinTissueColorBand(plot, dom, tissueDict, loc="top"){
    _moveXAxis(dom);

    // moving x-axis text down to make space for color band
    const xAxisText = dom.selectAll('.violin-x-axis text');
    xAxisText.attr('transform', `translate(0, 8) ${xAxisText.attr('transform')}`);

    // add tissue colors
    const tissueG = dom.append("g");
    tissueG.selectAll(".tcolor").data(plot.scale.x.domain())
        .enter()
        .append("rect")
        .classed("tcolor", true)
        .attr("x", (g)=>plot.scale.x(g))
        .attr("y", (g)=>loc=="top"?plot.scale.y.range()[1]:plot.scale.y.range()[0])
        .attr('transform', 'translate(0, 14)')
        .attr("width", (g)=>plot.scale.x.bandwidth())
        .attr("height", 5)
        .style("stroke-width", 0)
        .style("fill", (g)=>`#${tissueDict[g].colorHex}`)
        .style("opacity", 0.9);
}

/**
 * Customizes the tooltip specifically for this plot
 * @param vplot {GroupedViolin}
 * @private
 */
function _customizeTooltip(vplot){
    let violinGs = selectAll('.violin-g');
    violinGs.on('mouseover', (d, i, nodes)=>{
        let med = vplot.gpConfig.scale=='log'?Math.pow(10, d.median) - 1:d.median;
        let vPath = select(nodes[i]).select('path');
        vPath.classed('highlighted', true);
        if (!vplot.gpConfig.subset) {
            vplot.tooltip.show(
                d.group + "<br/>" +
                `n = ${d.values.length}` + "<br/>" +
                `Median${vplot.unit}: ${med.toPrecision(4)}` + "<br/>");
        } else {
            vplot.tooltip.show(
                d.group + "<br/>" +
                d.label + ` (n = ${d.values.length})` + "<br/>" +
                `Median${vplot.unit}: ${med.toPrecision(4)}` + "<br/>");
        }
    });
}

/**
 * Draws the initial rendering of the violin plot
 * @param vplot {GroupedViolin}
 * @param margins {Object} Contains plot top, right, bottom and left margin information
 * @param dimensions {Object} Contains plot width and height information
 * @param ids {Dictionary} Dictionary of IDs relevant to plot
 * @private
 */
function _drawViolinPlot(vplot, margins, dimensions, ids) {
    const margin = margins;
    const dim = _setViolinPlotDimensions(dimensions.w, dimensions.h, margin);
    const svg = select(`#${ids.root}`)
            .append('svg')
            .attr('id', ids.svg)
            .attr('width', dim.outerWidth)
            .attr('height', dim.outerHeight)
            .append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);
    const width = dim.width;
    const height = dim.height;
    const xPadding = 0.2;
    const xDomain = _sortData(vplot.gpConfig.sort, vplot.sortData, ids);
    const yDomain =[];
    const yLabel = 'log10(TPM+1)';
    const showX = true;
    const xAngle = 35;
    const showSubX = false;
    const subXAngle = 0;
    const showWhisker = false;
    const showDivider = false;
    const showLegend = true;
    const showSize = false;
    const sortSubX = true;
    const showOutliers = true;

    vplot.render(svg, width, height, xPadding, xDomain, yDomain, yLabel, showX, xAngle, showSubX, subXAngle, showWhisker, showDivider, showLegend, showSize, sortSubX, showOutliers);
    _customizePlot(vplot, ids);
}

/**
 * Adds peripheral details to violin plot post-initial rendering.
 * @param vplot {GroupedViolin}
 * @param ids {Dictionary} Dictionary of IDs relevant to plot
 * @private
 */
function _customizePlot(vplot, ids) {
    let svg = select(`#${ids.svg} g`);
    if(vplot.gpConfig.title !== undefined) vplot.addPlotTitle(svg, vplot.gpConfig.title);
    _updateOutlierDisplay(vplot, ids);
    if (!vplot.gpConfig.subset) {
        select(`#${ids.svg} #violinLegend`).remove();
        _moveXAxis(svg);
    } else {
        _addViolinTissueColorBand(vplot, svg, vplot.tissueDict, 'bottom');
    }
    _customizeTooltip(vplot);
}

/**
 * Determines whether or not to display outliers on the plot
 * @param vplot {GroupedViolin}
 * @param ids {Dictionary} Dictionary of IDs relevant to plot
 * @private
 */
function _updateOutlierDisplay(vplot, ids) {
    selectAll(`#${ids.svg} path.violin`).classed('outlined', !vplot.gpConfig.showOutliers);
    $(`#${ids.svg} .violin-outliers`).toggle(vplot.gpConfig.showOutliers);
}

/**
 *
 * @param sortMethod {String} asc-alphasort' || 'desc-alphasort' || 'asc-sort' || 'desc-sort'
 * @param data {Object} data to be sorted
 * @param ids {Dictionary} dictionary of IDs relevant to plot
 * @private
 */
function _sortData(sortMethod, data, ids) {
    switch (sortMethod) {
        case ids.plotSorts.ascAlphaSort:
            data.sort((a,b) => {
                if (a.group < b.group) return -1;
                else if (a.group > b.group) return 1;
                else return 0;
            });
            break;
        case ids.plotSorts.descAlphaSort:
            data.sort((a,b) => {
                if (a.group < b.group) return 1;
                else if (a.group > b.group) return -1;
                else return 0;
            });
            break;
        case ids.plotSorts.ascSort:
            data.sort((a,b) => { return a.median - b.median; });
            break;
        case ids.plotSorts.descSort:
            data.sort((a,b) => { return b.median - a.median; });
            break;
        default:
    }
    let xDomain = data.map((d) => d.group);
    return xDomain;
}

/**
 * Redraws plot after a display option has been updated
 * @param vplot {GroupedViolin} Contains plot display configurations in vplot.gpConfig
 * @param ids {Dictionary} dictionary of IDs relevant to plot
 * @private
 */
function _redrawViolinPlot(vplot, ids) {
    // subsetting and sorting
    let newData = vplot.gpConfig.subset ? vplot.geneJson.subsetData : vplot.geneJson.allData;
    const violinPlotData = vplot.gpConfig.scale == 'log'? _parseGeneExpressionForViolin(newData, vplot.tIdNameMap, vplot.groupColorDict) : _parseGeneExpressionForViolin(newData, vplot.tIdNameMap, vplot.groupColorDict, false);
    let filteredTissues = vplot.data.map((d)=>d.group);
    vplot.allData = violinPlotData.map(d=>d);
    vplot.data = violinPlotData.filter(d=>filteredTissues.indexOf(d.group) != -1);
    let sortData = vplot.sortData.filter((d) => filteredTissues.includes(d.group));
    let xDomain = _sortData(vplot.gpConfig.sort, sortData, ids);

    // scaling
    _calcViolinPlotValues(vplot.data, vplot.gpConfig.scale == 'log');
    _calcViolinPlotValues(vplot.allData, vplot.gpConfig.scale == 'log');
    let yScaleLabel = vplot.gpConfig.scale == 'log' ? 'log10(TPM+1)' : 'TPM';

    vplot.updateXScale(xDomain);
    vplot.updateYScale(yScaleLabel);
    _customizePlot(vplot, ids);
}
