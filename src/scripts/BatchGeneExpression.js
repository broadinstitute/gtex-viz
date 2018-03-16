import * as d4 from "d3";
"use strict";
import {getGtexUrls, parseTissues, parseMedianExpression, makeJsonForPlotly} from "./modules/gtex/gtexDataParser";
import {colorChart} from "./modules/Colors";
import DendroHeatmap from "./modules/DendroHeatmap";
export function searchById(glist, domId, infoId){
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
        const max = 50;
        let gencodeIds = data2.geneId.map((d) => d.gencodeId);
        if (gencodeIds.length == 0){
            message = "Fatal Error: the gene list is empty.<br/>";
        }
        else {
            if (gencodeIds.length <= glist.length){
                message = "Warning: Not all genes are found.<br/>";
            }
            if (gencodeIds.length > max){
                message += `Warning: Too many genes. Input list truncated to the first ${max}.<br/>`;
                gencodeIds = gencodeIds.slice(0, max);
            }
            d4.json(urls.medExpById + gencodeIds.join(","), function(eData){ // get all median express data of these genes in all tissues
                const tissueTree = eData.clusters.tissue,
                      geneTree = eData.clusters.gene,
                      expression = parseMedianExpression(eData);
                const dmap = new DendroHeatmap(tissueTree, geneTree, expression);
                dmap.render(domId);
                customization(dmap, tissues);
                
            });
        }
        $(`#${infoId}`).html(message);
        $('#spinner').hide();


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
    const geneDict = genes.reduce((a, d, i)=>{a[d.gencodeId]=d; return a;}, {});

    /***** Change row labels to tissue names *****/
    d4.select("#" + dmap.config.panels.main.id).selectAll(".exp-map-xlabel")
        .text((d) => tissueDict[d]===undefined?d:tissueDict[d].tissue_name);

    /***** Change column labels to gene symbols *****/
    d4.select("#" + dmap.config.panels.main.id).selectAll(".exp-map-ylabel")
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
    let dots = d4.select("#"+id).selectAll(".exp-map-xcolor").data(heatmap.xList);

     // updates old elements
    dots.attr("fill", (d) => tissueDict[d]===undefined?"#000000":`#${tissueDict[d].tissue_color_hex}`);

    // enters new elements
    dots.enter().append("circle")
        .attr('cx', (d) => heatmap.xScale(d) + heatmap.xScale.bandwidth()/2)
        .attr('cy', heatmap.yScale.range()[1] + 10)
        .attr("r", 3)
        .attr("fill", (d) => tissueDict[d] === undefined? "#000000":`#${tissueDict[d].tissue_color_hex}`)
        .attr("opacity", 0.75)
        .attr("class", "exp-map-xcolor");

    // removes retired elements
    dots.exit().remove();
}

/**
 * Customize the heatmap's mouse events
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary}: tissue objects indexed by tissue_id, with attr: tissue_name
 * @param geneDict {Dictionary}: gene objects indexed by gencode ID, with attr: geneSymbol
 */
function customizeHeatmapMouseEvents(dmap, tissueDict, geneDict) {
    const svg = dmap.visualComponents.svg;
    const tooltip = dmap.visualComponents.tooltip;

    const cellMouseover = function(d) {
        // dependencies -- css classes
        // expressMap.css

        const selected = d4.select(this); // note: "this" refers to the dom element of d
        selected.classed('highlighted', true);

        // highlight the row and column labels
        const rowClass = selected.attr("row");
        const colClass = selected.attr("col");
        svg.selectAll(".exp-map-xlabel").filter(`.${rowClass}`)
            .classed('highlighted', true);

        d4.selectAll(".exp-map-ylabel").filter(`.${colClass}`)
            .classed('highlighted', true);

        let row = tissueDict[d.x]===undefined?d.x:tissueDict[d.x].tissue_name;
        let column = geneDict[d.y]===undefined?d.y:geneDict[d.y].geneSymbol;

        tooltip.show(`Tissue: ${row} <br> Gene: ${column} <br> Median (${d.unit?d.unit:"TPM"}): ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`);
    };

    const cellMouseout = function(d){
        svg.selectAll("*").classed('highlighted', false);
        tooltip.hide();
    };

    // gene boxplot prep: assign a colorIndex to each gene
    const colors = colorChart();
    d4.keys(geneDict).forEach((d, i)=>{geneDict[d].color = colors[i]});
    const ylabelClick = function(d){
        let s = d4.select(this);
        let action = "";
        if (d4.event.altKey) { // if alt key is pressed -- i.e. adding an additional gene to boxplot
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
                d4.selectAll(".clicked").classed("clicked", false); // first clears all clicked labels if any
                s.classed("clicked", true); // click this DOM element
                dmap.data.external = {}; // clears the data storage
                action = "add";
            }
        }
        console.log(geneDict[d].color); // debugging
        renderBoxplot(action, d, geneDict, tissueDict, dmap);
    };

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
function renderBoxplot(action, gene, geneDict, tissueDict, dmap) {
    // tissueOrder is a list of tissue objects {id:display name} in the same order as the x axis of the heat map.
    let tissueOrder = dmap.objects.heatmap.xScale.domain().map((d, i) => {return {id:d, name:tissueDict[d].tissue_name}});
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
            family: 'Libre Franklin',
            size:11
        },
        yaxis: {
            title: 'TPM',
            zeroline: false
        },
        boxmode: 'group',
        margin: {
            t:0,
        },
        showlegend: true
    };

    // action
    switch(action){
        case "delete": {
            delete data[gene];
            Plotly.newPlot(config.id, d4.values(data), layout);
            if (d4.keys(data).length == 0){
                d4.select("#" + config.id).style("opacity", 0.0); // makes the boxplot section visible
            }else {
                d4.select("#" + config.id).style("opacity", 1.0); // makes the boxplot section visible
            }
            break;
        }
        case "add": {
            const url = getGtexUrls().geneExp + gene;
            d4.json(url, function(error, d) {
                let color = geneDict[gene].color || "black";
                data[gene] = makeJsonForPlotly(gene, d, config.useLog, color, tissueOrder);
                Plotly.newPlot(config.id, d4.values(data), layout);
                d4.select("#" + config.id).style("opacity", 1.0); // makes the boxplot section visible
            });
            break;
        }
        default: {
            console.warn("action not understood.");
            break;
        }
    }







}



