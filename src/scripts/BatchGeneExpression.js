"use strict";
import {json, tsv} from "d3-fetch";
import {select, selectAll, event} from "d3-selection";
import {keys, values} from "d3-collection";

import {
    getGtexUrls,
    parseGenes,
    parseTissues,
    parseMedianExpression,
    parseGeneExpressionForViolin, parseTissueSites,
} from "./modules/gtexDataParser";

import {
    createTissueGroupMenu,
    parseTissueGroupMenu
} from "./modules/gtexMenuBuilder";

import {createTissueMenu} from "./modules/gtexMenuBuilder";
import {colorChart} from "./modules/colors";
import DendroHeatmapConfig from "./modules/DendroHeatmapConfig";
import DendroHeatmap from "./modules/DendroHeatmap";
import GroupedViolin from "./modules/GroupedViolin";

/**
 * Create the tissue (dataset) dropdown menu using select2
 * @param domId {String} the dom ID of the menu
 * @param url {String} the tissue web service url
 */
export function createDatasetMenu(domId, url=getGtexUrls().tissue){
    createTissueMenu(domId, url); // currently datasets only include GTEx tissues
}

/**
 * Render top expressed genes in a given tissue
 * @param tissueId
 * @param domId {String} the dendroheatmap's DIV ID
 * @param toolbarId {String} the tool bar DOM ID
 * @param infoId {String} the message box DOM ID
 * @param urls {Dictionary} of GTEx web services urls
 * @param filterGenes {Boolean} turn on the filter of special categories of genes (e.g. mitochondrial genes)
 */
export function launchTopExpressed(tissueId, heatmapRootId, violinRootId, urls=getGtexUrls(), filterGenes=true){
    // getting the top expressed genes in tissueId
    const url = filterGenes?urls.topInTissueFiltered:urls.topInTissue;
    const $filterInfoDiv = $(`#filterInfo`).length==0?$('<div/>').attr('id', 'filterInfo').appendTo('body'):$(`#filterInfo`);
    if(filterGenes) $filterInfoDiv.html("Mitochondrial genes are excluded.<br/>");
    else $filterInfoDiv.html("Mitochondrial genes are included.<br/>");

    json(url+ tissueId)
        .then(function(results){ // top 50 expressed genes in tissueId
            const topGeneList = results.topExpressedGene.map(d=>d.gencodeId);
            const callback = function(){
                _styleSelectedTissue(tissueId);
            };
            searchById(heatmapRootId, violinRootId, topGeneList, urls, filterGenes, callback, tissueId);
        })
        .catch(function(err){
            console.error(err);
        });
}


export function launch(formId, menuId, submitId, heatmapRootId, violinRootId, urls=getGtexUrls()){
    let tissueGroups = {}; // a dictionary of lists of tissue sites indexed by tissue groups

    json(urls.tissueSites)
        .then(function(data){ // retrieve all tissue (sub)sites
            const forEqtl = false;
            let tissueGroups = parseTissueSites(data, forEqtl);
            createTissueGroupMenu(tissueGroups, menuId);
            $(`#${submitId}`).click(function(){
                // hide the search form after the eQTL violin plots are reported
                    $(`#${formId}`).removeClass("show"); // for bootstrap 4
                    $(`#${formId}`).removeClass("in"); // for boostrap 3

                // get the input list of genes
                let glist = $('#genes').val().replace(/ /g, '').toUpperCase().split(',').filter((d)=>d!='');
                if (glist.length == 0){
                    alert('Input Error: At least one gene must be provided.');
                    throw('Gene input error');
                }
                // get the input tissue list
                let queryTissueIds = parseTissueGroupMenu(tissueGroups, menuId);
                // tissue input error-checking
                if (queryTissueIds.length == 0) {
                    alert("Input Error: At least one tissue must be selected.");
                    throw "Tissue input error";
                }

                // search
                ////////// NEXT //////////
                searchById(heatmapRootId, violinRootId, glist, queryTissueIds);
            });

        })
        .catch(function(err){
            console.error(err);
        });
}
/**
 * Search Gene Expression by ID
 * @param heatmapRootId {String}
 * @param violinRootId {String}
 * @param glist {List} of genes
 * @param tlist {List} of tissues
 * @param urls
 * @param filterGenes {Boolean} or undefined when it isn't applicable
 * @param callback
 * @param qTissue {String}: only applicable for the search of top expressed genes in the qTissue
 */
export function searchById(heatmapRootId, violinRootId, glist, tlist=undefined, urls=getGtexUrls(), filterGenes=undefined, callback=undefined, qTissue=undefined){
    $('#spinner').show();
    $(`#${heatmapRootId}`).empty(); // clear the root DOM content
    $(`#${violinRootId}`).empty(); // clear the root DOM content

    const MAX = 50;
    const $message = $('<div/><br/>').attr('class', 'col-xs-12 col-md-12').css('color', 'firebrick').appendTo(`#${heatmapRootId}`);
    let message = "";
    if (glist.length > MAX) {
        message = `Warning: Too many genes. Input list truncated to the first ${MAX}. <br/>`;
        glist = glist.slice(0, MAX);
    }
    Promise.all([json(urls.tissue), json(urls.geneId+glist.join(","))])
       .then(function(args){
           const tissues = parseTissues(args[0]);

           // genes
           const genes = parseGenes(args[1]);
           // error-checking
           message += _validateGenes(heatmapRootId, genes, glist);


           // get median expression data and clusters of the input genes in all tissues
           const gQuery = genes.map((g)=>g.gencodeId).join(",");
           const tQuery = tlist.join(",");
           json(urls.medGeneExp + "&gencodeId=" + gQuery + "&tissueId=" + tQuery)
               .then(function(eData){
                   $('#spinner').hide();
                   const dataMessage = _validateExpressionData(eData);
                   if (dataMessage !== undefined){
                       $message.html(message + dataMessage);
                   }
                   else {
                       $message.html(message);
                       /***** render the DendroHeatmap *****/
                       const expression = parseMedianExpression(eData); // the parser determines the orientations of the heatmap
                       const ids = {
                           root: heatmapRootId,
                           violin: violinRootId,
                           svg: `${heatmapRootId}-svg`,
                           tooltip: "heatmapTooltip",
                           toolbar: "heatmapToolbar",
                           clone: "heatmapClone",
                           buttons: {
                               save: "heatmapSave",
                               filter: "heatmapFilter",
                               sort: "heatmapSortTissue",
                               cluster: "heatmapClusterTissue"
                           }
                       };
                        /***** build dom components *****/
                        if($(`#${ids.tooltip}`).length == 0) $('<div/>').attr('id', ids.tooltip).appendTo($('body'));
                        ["toolbar", "clone"].forEach((key)=>{
                            $('<div/>').attr("id", ids[key]).appendTo($(`#${ids.root}`));
                        });

                        /***** heatmap rendering *****/
                        const maxCellW = 25;
                        const minCellW = 25;

                        let cellW = Math.ceil(window.innerWidth/tlist.length);
                        cellW = cellW>maxCellW?maxCellW:(cellW<minCellW?minCellW:cellW); // this ensures a reasonable cellW
                        let dmapMargin={top:50, right:250, bottom:170, left:10};
                        let leftPanelW = 100;
                        let rootW = cellW * tlist.length + leftPanelW + dmapMargin.right + dmapMargin.left;

                        const config = new DendroHeatmapConfig(rootW, leftPanelW, 100, dmapMargin, 12, 10);
                        const dmap = new DendroHeatmap(eData.clusters.tissue, eData.clusters.gene, expression, "YlGnBu", 2, config);

                        if (genes.length < 3){
                            // too few genes to cluster
                            dmap.render(ids.root, ids.svg, true, false)
                        }
                        else {dmap.render(ids.root, ids.svg)}

                        // construct handy data lookup tables
                        const tissueDict = tissues.reduce((a, d)=>{
                            if (!d.hasOwnProperty("tissueId")) throw "tissue has not attr tissue_id";
                            a[d.tissueId] = d;
                            return a;
                        }, {});

                        const geneDict = dmap.data.heatmap.reduce((a, d, i)=>{
                            if (!d.hasOwnProperty("gencodeId")) throw "gene has no attr gencodeId";
                            a[d.gencodeId]=d;
                            return a;
                        }, {});

                        /***** customization for GTEx expression heatmap *****/
                        // tooltip
                        dmap.createTooltip(ids.tooltip);

                        // change row and column labels
                        // Change row labels to tissue names //
                        select("#" + dmap.config.panels.main.id).selectAll(".exp-map-xlabel")
                            .text((d) => tissueDict[d]===undefined?d:tissueDict[d].tissueName);


                        select("#" + dmap.config.panels.main.id).selectAll(".exp-map-ylabel")
                            .text((d) => geneDict[d]===undefined?d:geneDict[d].geneSymbol);

                        // Add tissue color boxes //
                        _addTissueColors(dmap, tissueDict);

                        // Add a toolbar
                        _addToolBar(dmap, ids, tissueDict, urls, filterGenes, qTissue);

                        // mouse events
                        _customizeMouseEvents(dmap, tissueDict, geneDict);

                        if (callback!= undefined) callback();

                   }
               })
               .catch(function(err){console.error(err)});
       })
       .catch(function(err){console.error(err)});
}

function _validateExpressionData(data){
    const attr = "medianGeneExpression";
    if(!data.hasOwnProperty(attr)) throw "expression data json format error.";
    if (data[attr].length == 0) return "No expression data found.";
    return undefined;
}

function _validateGenes(domId, genes, input){
    let message = "";

    if (genes.length == 0) message = "Fatal Error: the gene list is empty.<br/>";
    else {
        if (genes.length < input.length){
            let allIds = [];
            genes.forEach((g)=>{
                // compile a list of all known IDs
                allIds.push(g.gencodeId);
                allIds.push(g.geneSymbolUpper);
                allIds.push(g.ensemblId);
            });
            let missingGenes = input.filter((g)=>!allIds.includes(g.toLowerCase())&&!allIds.includes(g.toUpperCase()));
            if (missingGenes.length > 0) message = `Warning: Not all genes are found: ${missingGenes.join(",")}<br/>`;
        }
    }
    return message;
}

/**
 * For top expressed query, highlight the query tissue label
 * @param tissueId {String} the tissue ID
 * Dependencies: expressMap.css
 */
function _styleSelectedTissue(tissueId){
    selectAll(".exp-map-xlabel").filter((d)=>d==tissueId)
        .classed("query", true);
}

/**
 * Adds GTEx tissue colors to the tissue labels (column names of the heatmap)
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} of GTEx tissue objects indexed by tissue_id
 */
function _addTissueColors(dmap, tissueDict){

    const id = dmap.config.panels.main.id;
    const heatmap = dmap.objects.heatmap;

    let cells = select(`#${id}`).selectAll(".exp-map-xcolor").data(heatmap.xList);
    let leaves = select(`#${id}`).selectAll(".leaf-color").data(heatmap.xList);

    // update
    cells.attr("x", (d)=>heatmap.xScale(d))
        .attr("y", (d)=>heatmap.yScale.range()[1] + 5);
    leaves.attr("x", (d)=>heatmap.xScale(d))
        .attr("y", (d)=>heatmap.yScale.range()[0] - 10);

    // create new elements
    cells.enter().append("rect")
        .attr("x", (d)=>heatmap.xScale(d))
        .attr("y", (d)=>heatmap.yScale.range()[1] + 5)
        .attr("width", heatmap.xScale.bandwidth())
        .attr("height", heatmap.yScale.bandwidth()*0.5)
        .classed("exp-map-xcolor", true)
        .merge(cells)
        .style("fill", (d) => tissueDict[d] === undefined? "#000000": `#${tissueDict[d].colorHex}`);

    // exit and remove
    cells.exit().remove();

    if (dmap.objects.heatmap.yScale.domain().length > 15){
        leaves.enter().append("rect")
            .attr("x", (d)=>heatmap.xScale(d))
            .attr("y", (d)=>heatmap.yScale.range()[0] - 10)
            .attr("width", heatmap.xScale.bandwidth())
            .attr("height", heatmap.yScale.bandwidth()*0.5)
            .classed("leaf-color", true)
            .merge(leaves)
            .style("fill", (d) => tissueDict[d] === undefined? "#000000": `#${tissueDict[d].colorHex}`);
        leaves.exit().remove();
    }

}

/**
 * Customize the dendropHeatmap mouse events
 * dependencies: CSS classes from expressMap.css
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary}: tissue objects indexed by tissue_id, with attr: tissue_name
 * @param geneDict {Dictionary}: gene objects indexed by gencode ID, with attr: geneSymbol
 */
function _customizeMouseEvents(dmap, tissueDict, geneDict) {
    const svg = dmap.visualComponents.svg;
    const tooltip = dmap.tooltip;
    dmap.data.external = [];
    const cellMouseover = function(d) {
        const selected = select(this);
        dmap.objects.heatmap.cellMouseover(selected); // call the default heatmap mouse over event first
        let tissue = tissueDict[d.x]===undefined?d.x:tissueDict[d.x].tissueName;
        let gene = geneDict[d.y]===undefined?d.y:geneDict[d.y].geneSymbol;

        tooltip.show(`Tissue: ${tissue}<br/> Gene: ${gene}<br/> Median TPM: ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`)

    };

    const cellMouseout = function(d){
        svg.selectAll("*").classed('highlighted', false);
        tooltip.hide();
    };

    // gene boxplot prep: assign a colorIndex to each gene
    const colors = colorChart();
    keys(geneDict).forEach((d, i)=>{geneDict[d].color = colors[i]});
    const ylabelClick = function(d){
        let s = select(this);
        let action = "";

        // toggles click/unclick events
        // if the DOM has the class "clicked", then unclick it
        if (s.classed("clicked")) {
            s.classed("clicked", false);
            action = "delete";
        }
        else {
            // else click it
            // selectAll(".clicked").classed("clicked", false); // first clears all clicked labels if any
            s.classed("clicked", true); // click this DOM element
            action = "add";
        }
        _renderViolinPlot(action, d, geneDict, tissueDict, dmap);
    };

    svg.selectAll(".exp-map-cell")
        .on("mouseover", cellMouseover)
        .on("mouseout", cellMouseout);

    svg.selectAll(".exp-map-ylabel")
        .style("cursor", "pointer")
        .on("click", ylabelClick);
}

/**
 * renders the gene expression violin plot
 * @param action {ENUM} add, new, or delete
 * @param gene {String} gencode ID
 * @param geneDict {Dictionary} gencode ID => gene object with attribute: index
 * @param tissueDict {Dictionary} tissue objects indexed by tissue ID
 * @param dmap {DendroHeatmap}
 */
function _renderViolinPlot(action, gene, geneDict, tissueDict, dmap) {
    // action
    switch(action) {
        case "delete": {
            dmap.data.external = dmap.data.external.filter((d)=>d.gencodeId!=gene);
            _renderViolinHelper(dmap.data.external, dmap, tissueDict);
            break;
        }
        case "add": {
            const url = getGtexUrls().geneExp + gene;
            const colors = {};
            colors[gene] = geneDict[gene].color;
            const tlist = dmap.objects.heatmap.xScale.domain();
            json(url)
                .then(function (d) {
                    if (dmap.data.external === undefined) dmap.data.external = [];
                    dmap.data.external = dmap.data.external
                        .concat(parseGeneExpressionForViolin(d, true, colors))
                        .filter((d)=>{
                            // filtering the tissues that aren't selected
                            return tlist.indexOf(d.group) > -1;
                        });
                    _renderViolinHelper(dmap.data.external, dmap, tissueDict);
                })
                .catch(function(err){console.error(err)});
            break;
        }
        default: {
            console.warn("action not understood.");
            break;
        }
    }
}

function _renderViolinHelper(data, dmap, tissueDict){
    // plot configurations
    const id = {
        root: "violinRoot", // the root <div> ID
        tooltip: "violinTooltip",
        toolbar: "violinToolbar",
        clone: "violinClone",
        chart: "violinPlot",
        svg: "violinSvg",
        buttons: {
            save: "violinSave"
        }
    };

    // error-checking the required DOM elements
    const rootId = `#${id.root}`;
    const tooltipId = `#${id.tooltip}`;
    if ($(rootId).length == 0) throw 'Violin Plot Error: rootId does not exist.';
    if ($(tooltipId).length == 0) $('<div/>').attr('id', id.tooltip).appendTo($('body')); // create it if not already present on the html document

    // clear previously rendered plot
    select(rootId).selectAll("*").remove();

    // rebuild the dom components within the root div
    ["toolbar", "chart", "clone"].forEach((key)=>{
        $('<div/>').attr("id", id[key]).appendTo($(rootId));
    });


    if (data.length == 0){ // no expression data, no need to proceed
        select(rootId).style("opacity", 0.0);
        return;
    }
    // tissueOrder is a list of tissue objects {id:display name} in the same order as the x axis of the heat map.
    let tissueOrder = dmap.objects.heatmap.xScale.domain().map((d, i) => {return {id:d, name:tissueDict[d].tissueName}});
    const genes = data.reduce((arr, d)=>{arr[d.label]=1; return arr}, {});
    const gCounts = Object.keys(genes).length;


    if (gCounts == 0){
        select(rootId).style("opacity", 0.0);
        return
    }

    select(rootId).style("opacity", 1.0); // makes the boxplot section visible
    const margin = _setViolinPlotMargins(50, 50, 150, dmap.config.panels.main.x);
    let width = 20 * Object.keys(genes).length * tissueOrder.length;
    width = width < dmap.config.panels.main.w? dmap.config.panels.main.w: width;
    const dim = _setViolinPlotDimensions(width, 150, margin);


    // render the violin
    const dom = select(`#${id.chart}`)
                // .style("opacity", 1.0)
                .append("svg")
                .attr("width", dim.outerWidth)
                .attr("height", dim.outerHeight)
                .attr("id", id.svg)
                .append("g")
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const violin = new GroupedViolin(data);
    const tooltip = violin.createTooltip(id.tooltip);
    const toolbar = violin.createToolbar(id.toolbar, tooltip);
    toolbar.createDownloadButton(id.buttons.save, id.svg, `${id.root}-save.svg`, id.clone);

    const showDivider = gCounts == 1? false: true;
    violin.render(dom, dim.width, dim.height, 0.30, tissueOrder.map((d)=>d.id), [], "log10(TPM)", true, false, 0, false, showDivider, true);
    _addViolinTissueColorBand(violin, dom, tissueDict, "bottom");
    _changeViolinXLabel(dom, tissueDict);
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
function _setViolinPlotDimensions(width=1200, height=250, margin=_setMargins()){
    return {
        width: width,
        height: height,
        outerWidth: width + (margin.left + margin.right),
        outerHeight: height + (margin.top + margin.bottom)
    }
}

function _addViolinTissueColorBand(plot, dom, tissueDict, loc="top"){
     ///// add tissue colors
    const tissueG = dom.append("g");

    tissueG.selectAll(".tcolor").data(plot.scale.x.domain())
        .enter()
        .append("rect")
        .classed("tcolor", true)
        .attr("x", (g)=>plot.scale.x(g) )
        .attr("y", (g)=>loc=="top"?plot.scale.y.range()[1]-5:plot.scale.y.range()[0]-5)
        .attr("width", (g)=>plot.scale.x.bandwidth())
        .attr("height", 5)
        .style("stroke-width", 0)
        .style("fill", (g)=>`#${tissueDict[g].colorHex}`)
        .style("opacity", 0.7);
}

function _changeViolinXLabel(dom, tissueDict){
    /***** Change row labels to tissue names *****/
    dom.select(".violin-x-axis").selectAll("text")
        .text((d) => tissueDict[d]===undefined?d:tissueDict[d].tissueName);

}

/**
 * Add the toolbar
 * @param dmap {DendroHeatmap}
 * @param ids {Dictionary} of dom IDs with buttons
 * @param tissueDict {Dictionary} of tissue objects indexed by tissue ID
 * @param urls {Dictionary} of GTEx web service URLs
 * @param filterGenes {Boolean}
 * @param qTissue {String} of user-defined query tissues
 * @private
 */
function _addToolBar(dmap, ids, tissueDict, urls=getGtexUrls(), filterGenes=undefined, qTissue=undefined){
    let toolbar = dmap.createToolbar(ids.toolbar, dmap.tooltip);
    toolbar.createDownloadButton(ids.buttons.save, ids.svg, `${ids.root}-save.svg`, ids.clone);

    const __addFilter = ()=>{
        // so far this is only applicable for topExpressed gene heatmap
        const id = ids.buttons.filter;
        toolbar.createButton(id, 'fa-filter');
        select(`#${id}`)
            .on("click", function(){
                // toggle the applied filter
                renderTopExpressed(qTissue, ids.root, ids.violin, urls, !filterGenes);
            })
            .on("mouseover", function(){
                if(filterGenes) toolbar.tooltip.show("Include Mitochondrial Genes");
                else toolbar.tooltip.show("Exclude Mitochondrial Genes");
            })
            .on("mouseout", function(){
                toolbar.tooltip.hide();
            });
    };

    const __addSortTissues = ()=>{
        const id = ids.buttons.sort;
        toolbar.createButton(id, 'fa-sort-alpha-down');
        select(`#${id}`)
            .on("click", function(){
                // hides the tissue dendrogram
                select("#" + dmap.config.panels.top.id).style("display", "None");
                // sort tissues
                let xlist = dmap.objects.heatmap.xList.sort();
                _sortTissues(xlist, dmap, tissueDict);
            })
            .on("mouseover", function(){
                toolbar.tooltip.show("Sort Tissues Alphabetically");
            })
            .on("mouseout", function(){
                toolbar.tooltip.hide();
            });

    };

    const __addClusterTissues = ()=>{
        const id = ids.buttons.cluster;
        toolbar.createButton(id, `fa-code-branch`);
        select(`#${id}`)
        .on("click", function(){
            select("#" + dmap.config.panels.top.id).style("display", "Block");  // shows the tissue dendrogram
            let xlist = dmap.objects.columnTree.xScale.domain();
            _sortTissues(xlist, dmap, tissueDict);
        })
        .on("mouseover", function(){
            toolbar.tooltip.show("Cluster Tissues");
        })
        .on("mouseout", function(){
            toolbar.tooltip.hide();
        });
    };
    if (filterGenes !== undefined) __addFilter();
    __addSortTissues();
    __addClusterTissues();
}

/**
 * update the heatmap based on the order of the xlist
 * dependencies: CSS classes from expressMap.css
 * @param xlist {Heatmap XList}
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} of tissue objects indexed by tissue ID with attr, tissue_name
 */
function _sortTissues (xlist, dmap, tissueDict){
    // check if there's a query tissue, e.g. top-expressed heatmap
    let qId = undefined;
    const qTissue = select(".exp-map-xlabel.query");
    if (!qTissue.empty()) qId = qTissue.datum();

    // update the heatmap
    const dom = select("#"+dmap.config.panels.main.id);
    const dimensions = dmap.config.panels.main;
    dmap.objects.heatmap.redraw(dom, xlist, dmap.objects.heatmap.yList, dimensions);

    // change the tissue display text to tissue names
    selectAll(".exp-map-xlabel")
        .text((d) => tissueDict[d]===undefined?d:tissueDict[d].tissueName)
        .classed("query", false);
    _addTissueColors(dmap, tissueDict);

    // style the query tissue if found
    if (qId!==undefined) _styleSelectedTissue(qId);

    // hide the violin plot
    select('#violinRoot').style("opacity", 0.0);

    // deselect genes
    selectAll(".exp-map-ylabel").classed("clicked", false);
    dmap.data.external = undefined;

}

