import * as d4 from "d3";

import DendroHeatmap from "./modules/DendroHeatmap";
import GeneModel from "./modules/GeneModel";
import DendroHeatmapConfig from "./modules/DendroHeatmapConfig";
import {getGtexUrls, parseTissues, parseJunctionExpression, parseExons, parseJunctions} from "./modules/gtexDataParser";
import {createSvg} from "./modules/utils";

/** TODO
 * 2.1 NDRG4 bugs
 * 2.7 merge into one svg, so that the whole visualization can be downloaded as one image
 * 3. color the gene model with expression data when a tissue is clicked
 * 4. add tissue colors
 * 4.1 do we set a threshold on tissues if the gene isn't expressed?
 * 4.5 automatic filtering of tissues based on median gene expression?
 * 5. report individual isoforms
 * 6. gene information
 * 7. improve heatmap custom layout configuration
 * 8. inconsistent highlight visual effects
 * 9. add exon text label
 * 10. add cell mouse events
 * 11. implement the tool bar (should it be a hamburger?
 * 11.5 tree scale bug
 * 11.9 rebuild spliceViz
 * 12. code review
 * 13. Isoform Express Map
 * 14. EpiMap
 * 15. Create a new github repo and consolidate all of my d3.v4 viz tools there
 */


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
        process(gene);

    });
}

function process(gene){
    const gencodeId = gene.gencodeId;
    const chartDomId = "chart";
    const modelDomId = "model";
    $('#spinner').show();
    d4.queue()
        .defer(d4.json, urls.tissue) // tissue colors
        .defer(d4.json, urls.geneModelUnfiltered + gencodeId) // unfiltered collapsed gene model
        .defer(d4.json, urls.geneModel + gencodeId) // final collapsed gene model
        .defer(d4.json, urls.junctionExp + gencodeId) // junction expression data
        .await(function(error, tissueJson, geneModelJson, curatedGeneModelJson, data){
            if (error !== null) throw "Web service error.";
            const tissues = parseTissues(tissueJson),
                exons = parseExons(geneModelJson),
                exonsCurated = parseExons(curatedGeneModelJson),
                junctions = parseJunctions(data),
                tissueTree = data.clusters.tissue,
                junctionTree = data.clusters.junction, // junction tree is not really useful
                expression = parseJunctionExpression(data);

            // junction expression heat map
            let dmapConfig = new DendroHeatmapConfig("chart");
            dmapConfig.setMargin({left: 10, top: 20, right: 200, bottom: 20});
            dmapConfig.noTopTreePanel();
            const dmap = new DendroHeatmap(junctionTree, tissueTree, expression, "reds2", 5, dmapConfig);
            dmap.render(chartDomId, false, true, "top"); // false: no top tree, true: show left tree, top: legend on top

            // gene model rendering
            const geneModel = new GeneModel(gene, exons, exonsCurated, junctions);
            const modelConfig = {
                w: window.innerWidth,
                h: 100,
                margin: {
                    top: 20,
                    left: 110
                }
            };
            let modelSvg = createSvg(modelDomId, modelConfig.w, modelConfig.h, modelConfig.margin);
            geneModel.render(modelSvg);
            customize(geneModel, modelSvg, dmap.visualComponents.svg);
            $('#spinner').hide();

        });
}

function reset(){
    d4.select("#chart").selectAll("*").remove();
    d4.select("#model").selectAll("*").remove();
    d4.select("#boxplot").selectAll("*").remove();
    d4.select("#dashboardToolbar").style("display", "none");
    d4.selectAll("*").classed("inView", false);
}

function customize(geneModel, modelSvg, mapSvg){
    // junction labels on the map
    mapSvg.selectAll(".xLabel")
        .each(function(d){
            // add junction ID as the dom id
            const xlabel = d4.select(this);
            const jId = xlabel.text();
            xlabel.attr("id", `${jId}`);
            xlabel.classed(`junc${jId}`, true);

            // and then change the text to startExon-endExon format
            const junc = geneModel.junctions.filter((d)=>d.junctionId == `${jId}` && !d.filtered)[0];
            if (junc !== undefined) xlabel.text(`Exon ${junc.startExon.exonNumber} - ${junc.endExon.exonNumber}`);
        })
        .on("mouseover", function(d){
            const jId = d4.select(this).attr("id");
            d4.select(this).classed("highlighted", true)
                .classed("normal", false);

            // highlight the junction and its exons on the gene model
            modelSvg.select(`.junc${jId}`).classed("highlighted", true);
            const junc = geneModel.junctions.filter((d)=>d.junctionId == jId && !d.filtered)[0];
            if (junc !== undefined) {
                modelSvg.selectAll(`.exon${junc.startExon.exonNumber}`).classed("highlighted", true);
                modelSvg.selectAll(`.exon${junc.endExon.exonNumber}`).classed("highlighted", true);
            }
        })
        .on("mouseout", function(d){
            d4.select(this).classed("highlighted", false)
                .classed("normal", true);
            d4.selectAll(".junc").classed("highlighted", false);
            d4.selectAll(".junc-curve").classed("highlighted", false);
            modelSvg.selectAll(".exon").classed("highlighted", false);
        });

    modelSvg.selectAll(".junc")
        .on("mouseover", function(d){
            d4.selectAll(`.junc${d.junctionId}`).classed("highlighted", true);
            console.log(`Junction ${d.junctionId}: ${d.chromStart} - ${d.chromEnd}`)

            if (d.startExon !== undefined){
                modelSvg.selectAll(".exon").filter(`.exon${d.startExon.exonNumber}`).classed("highlighted", true);
                modelSvg.selectAll(".exon").filter(`.exon${d.endExon.exonNumber}`).classed("highlighted", true);
            }


            // on the junction heat map, label the xlabel
            mapSvg.select(`.junc${d.junctionId}`).classed("highlighted", true)
                .classed("normal", false);
        })
        .on("mouseout", function(d){
            d4.selectAll(`.junc${d.junctionId}`).classed("highlighted", false);
            modelSvg.selectAll(".exon").classed("highlighted", false);
            mapSvg.selectAll(".xLabel").classed("highlighted", false)
                .classed("normal", true);
        });
    modelSvg.selectAll(".exon-curated")
        .on('mouseover', function(d){
            d4.select(this).classed("highlighted", true);
            console.log(`Exon ${d.exonNumber}: ${d.chromStart} - ${d.chromEnd}`)
        })
        .on('mouseout', function(d){
            d4.select(this).classed("highlighted", false);
        });

}