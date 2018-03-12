import * as d4 from "d3";

import DendroHeatmap from "./modules/DendroHeatmap";
import GeneModel from "./modules/GeneModel";

import {getGtexUrls, parseTissues, parseJunctionExpression, parseExons, parseJunctions} from "./modules/gtexDataParser";
import {createSvg} from "./modules/utils";

const urls = getGtexUrls();
$(document).ready(function(){
    // developing
    // searchJunctions();

    $('#gene').keypress(function(e){
        if(e.keyCode == 13){
            // bind the enter key
            e.preventDefault(); // or else, hitting the enter key's default is refreshing the page
            init();
        }
    });
    $('#junctionSubmit').click(function(){
        init();
    })
});

function init(){
    const inputGene = $('#gene').val();
    // const input = "SLK";
    reset();
    d4.json(urls.geneId + inputGene, function(json){  // get the gene object for the gencode ID
        const gene = json.geneId[0];
        process(gene.gencodeId);

    });
}

function process(gencodeId){
    const chartDomId = "chart";
    const modelDomId = "model";
    $('#spinner').show();
    d4.queue()
        .defer(d4.json, urls.tissue) // get tissue colors
        .defer(d4.json, urls.geneModel + gencodeId)
        .defer(d4.json, urls.junctionExp + gencodeId)
        .await(function(error, data1, data2, data3){
            if (error !== null) throw "Web service error.";
            const tissues = parseTissues(data1),
                exons = parseExons(data2),
                junctions = parseJunctions(data3),
                tissueTree = data3.clusters.tissue,
                junctionTree = data3.clusters.junction,
                expression = parseJunctionExpression(data3);
            const dmap = new DendroHeatmap(junctionTree, tissueTree, expression, "reds2", 5);
            dmap.render(chartDomId, false, true); // false: no top tree, true: show left tree

            // gene model rendering
            const gene = exons.shift(); // Note the 1st element in the exon array in the GTEx exon web service is actually the gene
            const geneModel = new GeneModel(gene, exons, junctions);
            const modelConfig = {
                w: 1500,
                h: 300,
                margin: {
                    top: 20,
                    left: 50
                }
            };
            let modelSvg = createSvg(modelDomId, modelConfig.w, modelConfig.h, modelConfig.margin);

            geneModel.render(modelSvg);

            $('#spinner').hide();
        });
}

function reset(){
    d4.select("#chart").selectAll("*").remove();
    d4.select("#boxplot").selectAll("*").remove();
    d4.select("#dashboardToolbar").style("display", "none");
    d4.selectAll("*").classed("inView", false);
}
