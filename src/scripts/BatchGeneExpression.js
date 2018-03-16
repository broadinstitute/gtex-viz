import * as d4 from "d3";
"use strict";
import {getGtexUrls, parseTissues, parseMedianExpression} from "./modules/gtex/gtexDataParser";
import DendroHeatmap from "./modules/DendroHeatmap";
export function searchById(glist, domId){
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
            // customization(dmap, tissues, dmap.data.heatmap);
            $('#spinner').hide();
            return message;
        });
    });

}

