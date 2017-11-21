import * as d4 from "d3";
import DendroHeatmap from "./modules/DendroHeatmap";
import {getTissueClusters, getGeneClusters, getGtexUrls, parseTissues, parseMedianTPM} from "./modules/gtexDataParser";

d4.select("#dataset1").on("click", function(){
    // top 50 expressed genes in liver
    // - DOM
    const domId = "#chart";
    // - gets data
    const tissueTree = getTissueClusters('top50Liver');
    const geneTree = getGeneClusters('top50Liver');
    const urls = getGtexUrls();


    d4.queue()
        .defer(d4.json, urls.tissue)
        .defer(d4.json, urls.medianGeneExp)
        .await(function(error, data1, data2){
            const tissues = parseTissues(data1);
            const expression = parseMedianTPM(data2, true);
            render(domId, tissueTree, geneTree, expression);
        });
});

d4.select("#dataset2").on("click", function(){
    alert("datset2 clicked");
});

function render(id, topTree, leftTree, heatmapData){
      // - visualization
    let hmap = new DendroHeatmap(topTree, leftTree, heatmapData);
    hmap.render(id);

}