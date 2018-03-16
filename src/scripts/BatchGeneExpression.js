import * as d4 from "d3";
"use strict";
import {getGtexUrls, parseTissues, parseMedianExpression} from "./modules/gtex/gtexDataParser";
import DendroHeatmap from "./modules/DendroHeatmap";
export function searchById(glist, domId){
    // TODO: figure out what this line does...
    d4.selectAll("*").classed("inView", false);

    if (d4.select(`#${domId}`).empty()) throw `Fatal Error: DOM element with id ${domId} does not exist;`;
    const urls = getGtexUrls();
    let message = "";
    d4.queue()
    .defer(d4.json, urls.tissue) // get tissue colors
    .defer(d4.json, urls.geneId + glist.join(",")) // get gene objects
    .await(function(err2, data1, data2){
        const tissues = parseTissues(data1);
        const gencodeIds = data2.geneId.map((d) => d.gencodeId);
        if (gencodeIds.length <= glist.length){
            message = "Warning: Not all genes are found";
        }
        d4.json(urls.medExpById + gencodeIds.join(","), function(eData){ // get all median express data of these genes in all tissues
            const tissueTree = eData.clusters.tissue,
                  geneTree = eData.clusters.gene,
                  expression = parseMedianExpression(eData);
            const dmap = new DendroHeatmap(tissueTree, geneTree, expression);
            dmap.render(domId);
            customization(dmap, tissues);
            $('#spinner').hide();
            return message;
        });
    });
}

/**
 * Customizes the GTEx gene expression DendroHeatmap
 * @param dmap {DendroHeatmap}
 * @param tissues [List] of GTEx tissue objects, with attr: tissue_id}
 */
function customization(dmap, tissues){
    const genes = dmap.data.heatmap;
    const tissueDict = tissues.reduce((a, d)=>{a[d.tissue_id] = d; return a;}, {});
    const geneDict = genes.reduce((a, d)=>{a[d.gencodeId]=d; return a;}, {});

    /***** Change row labels to tissue names *****/
    d4.select("#" + dmap.config.panels.main.id).selectAll(".xLabel")
        .text((d) => tissueDict[d]===undefined?d:tissueDict[d].tissue_name);

    /***** Change column labels to gene symbols *****/
    d4.select("#" + dmap.config.panels.main.id).selectAll(".yLabel")
        .text((d) => geneDict[d]===undefined?d:geneDict[d].geneSymbol);


    addTissueColors(dmap, tissueDict);
    customizeHeatmapMouseEvents(dmap, tissueDict, geneDict);
    //
    // bindToolbarEvents(dmap, tissueDict, geneDict);

}

/**
 * Adds GTEx tissue colors to the tissue labels (column names)
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} of GTEx tissue objects indexed by tissue_id
 */
function addTissueColors(dmap, tissueDict){

    const id = dmap.config.panels.main.id;
    const heatmap = dmap.objects.heatmap;
    let dots = d4.select("#"+id).selectAll(".xColor").data(heatmap.xList);

     // updates old elements
    dots.attr("fill", (d) => tissueDict[d]===undefined?"#000000":`#${tissueDict[d].tissue_color_hex}`);

    // enters new elements
    dots.enter().append("circle")
        .attr('cx', (d) => heatmap.xScale(d) + heatmap.xScale.bandwidth()/2)
        .attr('cy', heatmap.yScale.range()[1] + 10)
        .attr("r", 3)
        .attr("fill", (d) => tissueDict[d] === undefined? "#000000":`#${tissueDict[d].tissue_color_hex}`)
        .attr("opacity", 0.75)
        .attr("class", "xColor");

    // removes retired elements
    dots.exit().remove();
}

/**
 * Customize the heatmap's mouse events
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary}: tissue objects indexed by tissue_id
 * @param geneDict {Dictionary}: gene objects indexed by gencode ID
 */
function customizeHeatmapMouseEvents(dmap, tissueDict, geneDict) {
    const svg = dmap.visualComponents.svg;
    const tooltip = dmap.visualComponents.tooltip;

    const cellMouseover = function(d) {
        // dependencies -- css classes
        // expressMap.css

        const selected = d4.select(this); // note: "this" refers to the dom element of d
        selected.classed('expressmap-highlighted', true);

        // highlight the row and column labels
        const rowClass = selected.attr("row");
        const colClass = selected.attr("col");
        svg.selectAll(".xLabel").filter(`.${rowClass}`)
            .classed('normal', false)
            .classed('highlighted', true);

        d4.selectAll(".yLabel").filter(`.${colClass}`)
            .classed('normal', false)
            .classed('highlighted', true);

        let row = tissueDict[d.x]===undefined?d.x:tissueDict[d.x].tissue_name;
        let column = geneDict[d.y]===undefined?d.y:geneDict[d.y].geneSymbol;

        tooltip.show(`Tissue: ${row} <br> Gene: ${column} <br> Median (${d.unit?d.unit:"TPM"}): ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`);
    };

    const heatmapMouseout = function(d){
        const selected = d4.select(this);
        const rowClass = selected.attr("row");
        const colClass = selected.attr("col");

        d4.selectAll(".xLabel").filter(`.${rowClass}`)
            .classed('normal', true)
            .classed('highlighted', false);

        d4.selectAll(".yLabel").filter(`.${colClass}`)
            .classed('normal', true)
            .classed('highlighted', false);
        selected.classed('expressmap-highlighted', false);
        tooltip.hide();
    };
    svg.selectAll(".cell")
        .on("mouseover", cellMouseover)
        .on("mouseout", heatmapMouseout);

    const ylabelClick = function(d){
        let s = d4.select(this);
        if (d4.event.altKey) {
            // if alt key is pressed -- additive selection
            // highlights the selected label
            if(!s.classed("clicked")) s.classed("clicked", true);
        }
        else {
            // toggles the css class, clicked
            if (s.classed("clicked")) s.classed("clicked", false);
            else {
                dmap.data.external = {}; // clears the existing data container
                d4.selectAll("clicked").classed("clicked", false); // clears all clicked labels if any
                s.classed("clicked", true); // highlights the clicked label
            }
        }

        // renders the boxplot
        // tissueOrder is a list of tissue objects {id:display name} in the same order as the x axis of the heat map.
        let tissueOrder = dmap.objects.heatmap.xScale.domain().map((d) => {
            if (tissueDict[d] === undefined){
                return {
                    id: d,
                    name: d
                }
            } else {
                return {
                    id: d,
                    name: tissueDict[d].tissue_name
                }
            }
        });

        // temporarily solution
        // eventually, genes should only be identified by gencode ID
        if (d.startsWith("ENSG")) renderBoxplot(d, geneDict, tissueOrder, dmap);
        else{
            // d is a gene symbol
            let geneDictBySymbol = {};
            Object.values(geneDict).forEach((d) => {geneDictBySymbol[d.geneSymbol] = d});
            renderBoxplot(geneDictBySymbol[d].gencodeId, geneDict, tissueOrder, dmap)
        }

    };
    svg.selectAll(".yLabel")
        .on("click", ylabelClick);
}


