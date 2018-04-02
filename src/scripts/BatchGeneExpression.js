"use strict";
import {json, tsv} from "d3-fetch";
import {select, selectAll, event} from "d3-selection";
import {keys, values} from "d3-collection";

import {getGtexUrls, getTissueClusters, getGeneClusters, parseMedianTPM, parseTissues, parseMedianExpression, makeJsonForPlotly} from "./modules/gtex/gtexDataParser";
import {colorChart} from "./modules/Colors";
import {downloadSvg} from "./modules/utils";

import DendroHeatmap from "./modules/DendroHeatmap";

/**
 * Mayo demo
 * @param domId
 * @param toolbarId
 * @param urls
 */
export function renderMayo(domId, toolbarId, urls=getGtexUrls()){
    // - gets static data
    const tissueTree = getTissueClusters('top50Cerebellum_AD'),
          geneTree = getGeneClusters('top50Cerebellum_AD');
    Promise.all([json(urls.tissue), tsv(urls.mayoGeneExp)])
        .then(function(args){
            const tissues = parseTissues(args[0]);
            const expression = parseMedianTPM(args[1], true);
            const dmap = new DendroHeatmap(tissueTree, geneTree, expression);
            dmap.render(domId);
            // customization for GTEx
            const tissueDict = tissues.reduce((a, d)=>{
                if(!d.hasOwnProperty("tissueId")) throw "tissue has no attr tissue_id";
                a[d.tissueId] = d;
                return a;
            }, {});
            const geneDict = dmap.data.heatmap.reduce((a, d, i)=>{
                if (!d.hasOwnProperty("gencodeId")) throw "gene has no attr gencodeId";
                a[d.gencodeId]=d;
                return a;
            }, {});
            _customizeLabels(dmap, tissueDict, geneDict);
            _addTissueColors(dmap, tissueDict);
            _customizeMouseEvents(dmap, tissueDict, geneDict);
            _createToolbar(domId, toolbarId, undefined, dmap, tissueDict, [], urls);
            $('#spinner').hide(); // TODO: remove hard-coded dom ID
        })
        .catch(function(err){throw err});
}

export function reset(ids){
    ids.forEach((d)=>{$(`#${d}`).empty()});
}

/**
 * Create the tissue (dataset) dropdown menu using select2
 * @param domId {String} the dom ID of the menu
 * @param urls {Object} of web service urls with attr: tissue
 */
export function createDatasetMenu(domId, urls = getGtexUrls()){
    json(urls.tissue)
        .then(function(results){
            let tissues = parseTissues(results);
            tissues.forEach((d) => {
                d.id = d.tissueId;
                d.text = d.tissueName;
            });
            tissues.sort((a, b) => {
                if(a.tissueName < b.tissueName) return -1;
                if(a.tissueName > b.tissueName) return 1;
                return 0;
            });

            // external library dependency: select2
            $(`#${domId}`).select2({
                placeholder: 'Select a data set',
                data: tissues
            });

        })
        .catch(function(err){console.error(err)});

}

/**
 * Render top expressed genes in a given tissue
 * @param tissueId
 * @param domId {String} the dendroheatmap's DIV ID
 * @param toolbarId {String} the tool bar DOM ID
 * @param infoId {String} the message box DOM ID
 * @param urls {Dictionary} of GTEx web services urls
 * @param useFilters {Boolean} if the filter is applied, and if undefined, it means no filter
 */
export function renderTopExpressed(tissueId, domId, toolbarId, infoId, urls=getGtexUrls(), useFilters=true){
    // getting data
    const url = useFilters?urls.topInTissueFiltered:urls.topInTissue;
    json(url+ tissueId)
        .then(function(results){ // top 50 expressed genes in tissueId
            const topGeneList = results.topExpressedGene.map(d=>d.gencodeId);
            searchById(topGeneList, [tissueId], domId, toolbarId, infoId, urls, useFilters);
        })
        .catch(function(err){
            console.error(err);
        });
}

/**
 * Search gene expression by gene IDs and tissue IDs
 * @param glist {List} of gencode IDs or gene IDs
 * @param tlist {List} of tissue IDs: to search by tissue IDs is not yet implemented
 * @param domId {String} the DIV ID of the svg
 * @param infoId {String} the DOM ID of the message info box
 * @param toolbarId {String} the DOM ID of the toolbar
 * @param urls {Object} of web service urls with attr: tissue, geneId, medExpById
 * @param useFilters {Boolean} indicating whether gene filter is applied, or use undefined for no filtering
 * @returns {*}
 */
export function searchById(glist, tlist, domId, toolbarId, infoId, urls = getGtexUrls(), useFilters=undefined){
    reset([domId, toolbarId, infoId, "boxplot"]);
    $('#spinner').show();
    if (select(`#${domId}`).empty()) throw `Fatal Error: DOM element with id ${domId} does not exist;`;
    let message = "";

    Promise.all([json(urls.tissue), json(urls.geneId+glist.join(","))])
        .then(function(args){
             const tissues = parseTissues(args[0]),
                max = 50;

             const attr = "geneId";
            if (!args[1].hasOwnProperty(attr)) throw "gene web service parsing error";
            let geneObjects = args[1][attr];
            if (geneObjects.length == 0) {
                // validate if gene list is empty
                message = "Fatal Error: the gene list is empty.<br/>";
            } else {
                // more input validation
                if (geneObjects.length < glist.length) { // validate if all input genes are found
                    const allIds = geneObjects.map((d)=>d.gencodeId).concat(geneObjects.map((d)=>d.geneSymbolUpper)); // gather all gencodeIds and gene symbols in retrieved geneObjects
                    const missingGenes = glist.filter((d) => !allIds.includes(d));
                    message = `Warning: Not all genes are found: ${missingGenes.join(",")}<br/>`;
                }
                if (geneObjects.length > max) { // validate if the number of input genes exceeds the maximum
                    //language=HTML
                    message += `Warning: Too many genes. Input list truncated to the first ${max}.<br/>`;
                    geneObjects = geneObjects.slice(0, max); // slice the input gene list to the maximum allowed entries
                }

                // visualization rendering
                // get all median express data of these genes in all tissues
                const gencodeIds = geneObjects.map((d) => d.gencodeId);
                json(urls.medExpById + gencodeIds.join(","))
                    .then(function(eData) {
                        const tissueTree = eData.clusters.tissue,
                            geneTree = eData.clusters.gene,
                            expression = parseMedianExpression(eData),
                            dmap = new DendroHeatmap(tissueTree, geneTree, expression);
                        dmap.render(domId);
                        $('#spinner').hide();
                        // customization for GTEx
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
                        _customizeLabels(dmap, tissueDict, geneDict);
                        _addTissueColors(dmap, tissueDict);
                        _customizeMouseEvents(dmap, tissueDict, geneDict);
                        _createToolbar(domId, toolbarId, infoId, dmap, tissueDict, tlist, urls, useFilters);
                        if(useFilters !== undefined){
                            message += useFilters?"Mitochondrial genes are excluded.":"Mitochondrial genes are included";
                        }
                        $(`#${infoId}`).html(message);

                    })
                    .catch(function(err){console.error(err)});
            }

        })
        .catch(function(err){throw err});
}

/**
 * Customizes the GTEx gene expression heatmap labels
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} of GTEx tissue objects indexed by tissue ID
 * @param geneDict {Dictionary} of GTEx genes indexed by gencode ID
 */
function _customizeLabels(dmap, tissueDict, geneDict){
    /***** Change row labels to tissue names *****/
    select("#" + dmap.config.panels.main.id).selectAll(".exp-map-xlabel")
        .text((d) => tissueDict[d]===undefined?d:tissueDict[d].tissueName);

    /***** Change column labels to gene symbols *****/
    select("#" + dmap.config.panels.main.id).selectAll(".exp-map-ylabel")
        .text((d) => geneDict[d]===undefined?d:geneDict[d].geneSymbol);
}

/**
 * Adds GTEx tissue colors to the tissue labels (column names)
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} of GTEx tissue objects indexed by tissue_id
 */
function _addTissueColors(dmap, tissueDict){

    const id = dmap.config.panels.main.id;
    const heatmap = dmap.objects.heatmap;
    let dots = select("#"+id).selectAll(".exp-map-xcolor").data(heatmap.xList);

     // updates old elements
    dots.attr("fill", (d) => tissueDict[d]===undefined?"#000000":`#${tissueDict[d].colorHex}`);

    // enters new elements
    dots.enter().append("circle")
        .attr('cx', (d) => heatmap.xScale(d) + heatmap.xScale.bandwidth()/2)
        .attr('cy', heatmap.yScale.range()[1] + 10)
        .attr("r", 3)
        .attr("fill", (d) => tissueDict[d] === undefined? "#000000":`#${tissueDict[d].colorHex}`)
        .attr("opacity", 0.75)
        .attr("class", "exp-map-xcolor");

    // removes retired elements
    dots.exit().remove();
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
    const tooltip = dmap.visualComponents.tooltip;

    const cellMouseover = function(d) {
        // dependencies -- css classes
        // expressMap.css

        const selected = select(this); // note: "this" refers to the dom element of d
        selected.classed('highlighted', true);

        // highlight the row and column labels
        const rowClass = selected.attr("row");
        const colClass = selected.attr("col");
        svg.selectAll(".exp-map-xlabel").filter(`.${rowClass}`)
            .classed('highlighted', true);

        selectAll(".exp-map-ylabel").filter(`.${colClass}`)
            .classed('highlighted', true);

        let row = tissueDict[d.x]===undefined?d.x:tissueDict[d.x].tissueName;
        let column = geneDict[d.y]===undefined?d.y:geneDict[d.y].geneSymbol;

        tooltip.show(`Tissue: ${row} <br> Gene: ${column} <br> Median (${d.unit?d.unit:"TPM"}): ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`);
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
        if (event.altKey) { // if alt key is pressed -- i.e. adding an additional gene to boxplot
            // highlights the selected label
            if(!s.classed("clicked")) s.classed("clicked", true);
            action = "add";
        }
        else {
            // toggles click/unclick events
            // if the DOM has the class "clicked", then unclick it
            if (s.classed("clicked")) {
                s.classed("clicked", false);
                action = "delete";
            }
            else {
                // else click it
                selectAll(".clicked").classed("clicked", false); // first clears all clicked labels if any
                s.classed("clicked", true); // click this DOM element
                dmap.data.external = {}; // clears the data storage
                action = "add";
            }
        }
        // console.log(geneDict[d].color); // debugging
        _renderBoxplot(action, d, geneDict, tissueDict, dmap);
    };

    // mouse events of trees -- use closure

    const treeNodeMouseover = function(labelClass){
        return function(d){
            select(this)
                .attr("r", 6)
                .attr("fill", "red");
            const ids = d.leaves().map((node)=>node.data.name);
            // highlight labels
            svg.selectAll(labelClass)
                .filter((label)=>ids.includes(label))
                .classed("highlighted", true);
        }
    };

    const treeNodeMouseout = function(labelClass){
        return function(d){
            select(this)
            .attr("r", 2)
            .attr("fill", "#333");
            svg.selectAll(labelClass).classed("highlighted", false);
        }
    };

    dmap.visualComponents.topTree.selectAll(".dendrogram-node")
        .on("mouseover", treeNodeMouseover(".exp-map-xlabel"))
        .on("mouseout", treeNodeMouseout(".exp-map-xlabel"));

    dmap.visualComponents.leftTree.selectAll(".dendrogram-node")
        .on("mouseover", treeNodeMouseover(".exp-map-ylabel"))
        .on("mouseout", treeNodeMouseout(".exp-map-ylabel"));

    svg.selectAll(".exp-map-cell")
        .on("mouseover", cellMouseover)
        .on("mouseout", cellMouseout);

    svg.selectAll(".exp-map-ylabel").on("click", ylabelClick);
}

/**
 * renders the gene expression boxplot
 * @param action {ENUM} add, new, or delete
 * @param gene {String} gencode ID
 * @param geneDict {Dictionary} gencode ID => gene object with attribute: index
 * @param tissueDict {Dictionary} tissue objects indexed by tissue ID
 * @param dmap {DendroHeatmap}
 */
function _renderBoxplot(action, gene, geneDict, tissueDict, dmap) {
    // tissueOrder is a list of tissue objects {id:display name} in the same order as the x axis of the heat map.
    let tissueOrder = dmap.objects.heatmap.xScale.domain().map((d, i) => {return {id:d, name:tissueDict[d].tissueName}});
    // get gene expression data
    let data = dmap.data.external;

    // plotly boxplot configurations
    const config = {
        useLog: false,
        id: "boxplot",
    };
    const layout = {
        title: "",
        font: {
            family: 'Open Sans, Helvetica, sans-serif',
            size:11
        },
        yaxis: {
            title: 'TPM',
            zeroline: false,
            tickfont: {
                size: 9
            }
        },
        xaxis: {
            tickfont: {
                size: 9
            },
            tickangle: 30
        },
        boxmode: 'group',
        margin: {
            t:0,
        },
        showlegend: true,

    };

    // action
    switch(action) {
        case "delete": {
            delete data[gene];
            Plotly.newPlot(config.id, values(data), layout);
            if (keys(data).length == 0) {
                select("#" + config.id).style("opacity", 0.0); // makes the boxplot section visible
            } else {
                select("#" + config.id).style("opacity", 1.0); // makes the boxplot section visible
            }
            break;
        }
        case "add": {
            const url = getGtexUrls().geneExp + gene;
            json(url)
                .then(function (d) {
                    let color = geneDict[gene].color || "black";
                    data[gene] = makeJsonForPlotly(gene, d, config.useLog, color, tissueOrder);
                    Plotly.newPlot(config.id, values(data), layout);
                    select("#" + config.id).style("opacity", 1.0); // makes the boxplot section visible
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

/**
 * create the toolbar
 * @param domId {String} the dendropheatmap's DIV ID
 * @param barId {String} the toolbar DOM ID
 * @param infoId {String} the message box DOM ID
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} of tissues indexed by tissue ID
 * @param queryTissues {List} of tissue IDs
 * @param urls {Object} of GTEx web service urls
 * @param useFilter {Boolean} indicating whether gene filter is on or off, and when the value is undefined, it means no filter
 */
function _createToolbar(domId, barId, infoId, dmap, tissueDict, queryTissues, urls=getGtexUrls(), useFilters=undefined){
    // fontawesome reference: http://fontawesome.io/examples/
    // jQuery syntax
    $(`#${barId}`).show();

    let $barDiv = $("<div/>").addClass("btn-group btn-group-sm").appendTo(`#${barId}`);

    if (useFilters !== undefined){ // so far only applicable for topExpressed gene heatmap
        const id0 = "filterOptions";
        let $button0 = $("<a/>").attr("id", id0)
            .addClass("btn btn-default").appendTo($barDiv);
        $("<i/>").addClass("fa fa-filter").appendTo($button0);

        select(`#${id0}`)
        .on("click", function(){
            // toggle the applied filter
            renderTopExpressed(queryTissues[0], domId, barId, infoId, urls, !useFilters);
        })
        .on("mouseover", function(){
            if(useFilters) dmap.visualComponents.tooltip.show("Include Mitochondrial Genes");
            else dmap.visualComponents.tooltip.show("Exclude Mitochondrial Genes");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });
    }

    const id1 = "sortTissues";
    let $button1 = $("<a/>").attr("id", id1)
        .addClass("btn btn-default").appendTo($barDiv);
    $("<i/>").addClass("fa fa-sort-alpha-down").appendTo($button1); // a fontawesome icon

    select(`#${id1}`)
        .on("click", function(){
            // hides the tissue dendrogram
            select("#" + dmap.config.panels.top.id).style("display", "None");
            // sort tissues
            let xlist = dmap.objects.heatmap.xList.sort();
            _sortTissues(xlist, dmap, tissueDict);
        })
        .on("mouseover", function(){
            dmap.visualComponents.tooltip.show("Sort Tissues Alphabetically");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });

    const id2 = "clusterTissues";
    let $button2 = $("<a/>").attr("id", id2)
        .addClass("btn btn-default").appendTo($barDiv);
    $("<i/>").addClass("fa fa-code-branch").appendTo($button2);

    select(`#${id2}`)
        .on("click", function(){
            select("#" + dmap.config.panels.top.id).style("display", "Block");  // shows the tissue dendrogram
            let xlist = dmap.objects.columnTree.xScale.domain();
            _sortTissues(xlist, dmap, tissueDict);
        })
        .on("mouseover", function(){
            dmap.visualComponents.tooltip.show("Cluster Tissues");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });

    const id3 = "expMapDownload";
    let $button3 = $("<a/>").attr("id", id3)
        .addClass("btn btn-default").appendTo($barDiv);
    $("<i/>").addClass("fa fa-save").appendTo($button3);

    select(`#${id3}`)
        .on("click", function(){
            let svgObj = $($($(`${"#" +dmap.config.id} svg`))[0]); // jQuery dependent
            downloadSvg(svgObj, "heatmap.svg", "downloadTempDiv");
        })
        .on("mouseover", function(){
            dmap.visualComponents.tooltip.show("Download Heatmap");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });
}

/**
 * update the heatmap based on the order of the xlist
 * dependencies: CSS classes from expressMap.css
 * @param xlist {Heatmap XList}
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} of tissue objects indexed by tissue ID with attr, tissue_name
 */
function _sortTissues (xlist, dmap, tissueDict){
    // updates the heatmap
    const dom = select("#"+dmap.config.panels.main.id);
    const dimensions = dmap.config.panels.main;
    dmap.objects.heatmap.redraw(dom, xlist, dmap.objects.heatmap.yList, dimensions);

    // changes the tissue display text to tissue names
    selectAll(".exp-map-xlabel")
        .text((d) => tissueDict[d]===undefined?d:tissueDict[d].tissueName);
    _addTissueColors(dmap, tissueDict);

    // hides the boxplot
    select('#boxplot').style("opacity", 0.0);

    // deselects genes
    selectAll(".exp-map-ylabel").classed("clicked", false);
    dmap.data.external = {};

}

