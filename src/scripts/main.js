import * as d4 from "d3";
import DendroHeatmap from "./modules/DendroHeatmap";
import {getTissueClusters, getGeneClusters, getGtexUrls, parseTissues, parseMedianTPM} from "./modules/gtexDataParser";

d4.select("#dataset1").on("click", function(){
    // top 50 expressed genes in liver
    // - DOM
    d4.select(this).attr("class", "inView")
    const domId = "chart";

    // - gets data
    const tissueTree = getTissueClusters('top50Liver'),
          geneTree = getGeneClusters('top50Liver'),
          urls = getGtexUrls();


    d4.queue()
        .defer(d4.json, urls.tissue)
        .defer(d4.json, urls.medianGeneExp)
        .await(function(error, data1, data2){
            const tissues = parseTissues(data1);
            const expression = parseMedianTPM(data2, true);
            const dmap = render(domId, tissueTree, geneTree, expression);
            customization(dmap, tissues);
        });
});

d4.select("#dataset2").on("click", function(){
    alert("datset2 clicked");
});

/**
 * renders the dendroHeatmap
 * @param id {String} the ID of the SVG
 * @param topTree {String} a Newick tree
 * @param leftTree {String} a Newick tree
 * @param heatmapData {List} of objects: {x: {String}, y: {String}, value: {Float}, originalValue: {Float}
 * @returns {DendroHeatmap}
 */
function render(id, topTree, leftTree, heatmapData){
    // - visualization
    let dmap = new DendroHeatmap(topTree, leftTree, heatmapData);
    dmap.render(id);
    return dmap;
}

/**
 * Customizes the dendroHeatmap specifically for the dataset
 * @param dmap {DendroHeatmap}
 * @param tissues [List] of GTEx tissue objects: {tissue_id: {String}, and a bunch of other attributes}
 */
function customization(dmap, tissues){
    console.log(tissues)
    let tissueDict = {};
    tissues.forEach((d) => {tissueDict[d.tissue_id] = d});

    mapTissueIdToName(tissueDict);
    addTissueColors(dmap, tissueDict);

    /***** NEXT STEP **************/
    changeHeatmapMouseEvents(dmap, tissueDict);
}

/**
 * Overrides the heatmap mouse events
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} GTEx tissue objects indexed by tissue_id
 */
function changeHeatmapMouseEvents(dmap, tissueDict) {
    const svg = dmap.visualComponents.svg;
    const tooltip = dmap.visualComponents.tooltip;
    const heatmapMouseover = function(d) {
        // overrides the heatmap cell's mouseover event
        // dependencies -- css classes
        // expressMap.css
        // heatmap.css

        const selected = d4.select(this); // note: "this" refers to the dom element of d
        const rowClass = selected.attr("row");
        const colClass = selected.attr("col");
        d4.selectAll(".xLabel").filter(`.${rowClass}`)
            .classed('normal', false)
            .classed('highlighted', true);

        d4.selectAll(".yLabel").filter(`.${colClass}`)
            .classed('normal', false)
            .classed('highlighted', true);
        selected.classed('expressmap-highlighted', true);
        let row = tissueDict[d.x].tissue_name;
        let column = d.y;

        tooltip.show(`Tissue: ${row} <br> Gene: ${column} <br> Median TPM: ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`);
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
        .on("mouseover", heatmapMouseover)
        .on("mouseout", heatmapMouseout)

}

/**
 * Maps GTEx tissue ID to tissue Names for improvement of readability
 * @param tissueDict {Dictionary} GTEx tissue objects indexed by tissue_id
 */
function mapTissueIdToName(tissueDict){
    /////// tissue label modifications ///////
    // the tree clusters and tpm expression data use tissue IDs.
    // the featureExpression web service, however, uses tissue names.
    // tissue ID <=> tissue name mapping is required.
    // This is a temporary solution, the inconsistency of tissue ID/name should be a backend fix.

    // displays tissue names in the heatmap
    d4.selectAll(".xLabel")
        .text((d) => tissueDict[d].tissue_name);
}

/**
 * Adds GTEx tissue colors to the tissue labels
 * @param id:
 * @param heatmap
 * @param tissueDict
 */
function addTissueColors(dmap, tissueDict){
    const id = dmap.config.panels.main.id;
    const heatmap = dmap.objects.heatmap;
    let dots = d4.select("#"+id).selectAll(".xColor")
        .data(heatmap.xList);

     // updates old elements
    dots.attr("fill", (d) => `#${tissueDict[d].tissue_color_hex}`);

    // enters new elements
    dots.enter().append("circle")
        .attr('cx', (d) => heatmap.xScale(d) + heatmap.xScale.bandwidth()/2)
        .attr('cy', heatmap.yScale.range()[1] + 10) // TODO: eliminate hard-coded values
        .attr("r", 3)
        .attr("fill", (d) => `#${tissueDict[d].tissue_color_hex}`)
        .attr("opacity", 0.75) // more subdued color
        .attr("class", "xColor");

    // removes retired elements
    dots.exit().remove();
}