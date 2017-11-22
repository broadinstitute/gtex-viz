import * as d4 from "d3";
import DendroHeatmap from "./modules/DendroHeatmap";
import {getTissueClusters, getGeneClusters, getGtexUrls, parseTissues, parseMedianTPM} from "./modules/gtexDataParser";

d4.select("#dataset1").on("click", function(){
    // top 50 expressed genes in liver
    // - DOM
    const domId = "#chart";

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

function render(id, topTree, leftTree, heatmapData){
      // - visualization
    let hmap = new DendroHeatmap(topTree, leftTree, heatmapData);
    hmap.render(id);
    return hmap;
}

function customization(dmap, tissues){
    let tissueDict = {};
    tissues.forEach((d) => {tissueDict[d.tissue_id] = d});

    mapTissueIdToName(tissueDict);
    addTissueColors(dmap.config.panels.main.id, dmap.objects.heatmap, tissueDict);

}

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

function addTissueColors(id, heatmap, tissueDict){
    let dots = d4.select("#" + id).selectAll(".xColor")
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