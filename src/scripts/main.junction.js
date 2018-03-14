import * as d4 from "d3";

import DendroHeatmap from "./modules/DendroHeatmap";
import GeneModel from "./modules/GeneModel";
import DendroHeatmapConfig from "./modules/DendroHeatmapConfig";
import {getGtexUrls, parseTissues, parseJunctionExpression, parseExonExpression, parseExons, parseJunctions} from "./modules/gtexDataParser";
import {createSvg} from "./modules/utils";

/** TODO
 * 3.6 add exon colors
 * 3.8 show clicked tissue name
 * 4. add tissue colors
 * 4.1 report individual isoforms
 * 4.2 reset gene model
 * 4.3 do we set a threshold on tissues if the gene isn't expressed?
 * 4.5 automatic filtering of tissues based on median gene expression?
 * 6. gene information
 * 7. improve heatmap custom layout configuration
 * 8. inconsistent highlight visual effects
 * 9. add exon text label
 * 10. add cell mouse events
 * 11. implement the tool bar (should it be a hamburger?
 * 11.5 tree scale bug
 * 11.9 rebuild spliceViz
 * 12.0 rewrite main.junction.js to a class
 * 12.1 code review
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
        .defer(d4.json, urls.exonExp + gencodeId) // exon expression data of the final collapsed model only
        .await(function(error, tissueJson, geneModelJson, curatedGeneModelJson, data, data2){
            if (error !== null) throw "Web service error.";
            const tissues = parseTissues(tissueJson),
                exons = parseExons(geneModelJson),
                exonsCurated = parseExons(curatedGeneModelJson),
                junctions = parseJunctions(data),
                tissueTree = data.clusters.tissue,
                junctionTree = data.clusters.junction, // junction tree is not really useful
                jExpress = parseJunctionExpression(data),
                exonExpress = parseExonExpression(data2);


            // junction expression heat map
            let dmapConfig = new DendroHeatmapConfig("chart");
            dmapConfig.setMargin({left: 10, top: 20, right: 200, bottom: 200});
            dmapConfig.noTopTreePanel();
            const dmap = new DendroHeatmap(junctionTree, tissueTree, jExpress, "reds2", 5, dmapConfig);
            dmap.render(chartDomId, false, true, "top"); // false: no top tree, true: show left tree, top: legend on top

            // gene model rendering
            const geneModel = new GeneModel(gene, exons, exonsCurated, junctions);
            const adjust = 100;
            const modelConfig = {
                x: dmap.config.panels.main.x,
                y: dmap.config.panels.main.h + dmap.config.panels.main.y + adjust,
                w: dmap.config.panels.main.w,
                h: 100
            };
            // let modelSvg = createSvg(modelDomId, modelConfig.w, modelConfig.h, modelConfig.margin);
            const modelG = dmap.visualComponents.svg.append("g").attr("id", "geneModel");
            modelG.attr("transform", `translate(${modelConfig.x}, ${modelConfig.y})`);
            geneModel.render(modelG, {w:modelConfig.w, h:modelConfig.h});

            customize(geneModel, dmap, jExpress, exonExpress);
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

/**
 * customizing the junciton expression visualization
 * @param geneModel {Object} of gene
 * @param map {Object} of DendropHeatmap
 * @param jdata {List} of junction expression data objects
 * @param edata {List} of exon expression data objects
 */
function customize(geneModel, map, jdata, edata){
    // junction labels on the map
    const mapSvg = map.visualComponents.svg;
    mapSvg.selectAll(".yLabel")
        .on("mouseover", function(d){
            const tissue = d4.select(this).text();
             d4.select(this)
                .classed('normal', false)
                .classed('highlighted', true);

        })
        .on("click", function(d){
            const tissue = d4.select(this).text();
            console.log(tissue);
            const j = jdata.filter((d)=>d.tissueId==tissue);
            const ex = edata.filter((d)=>d.tissueId==tissue);
            geneModel.changeColor(mapSvg, j, ex, map.objects.heatmap.colorScale);
        });

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
            mapSvg.selectAll(`.junc${jId}`).classed("highlighted", true);
            const junc = geneModel.junctions.filter((d)=>d.junctionId == jId && !d.filtered)[0];
            if (junc !== undefined) {
                mapSvg.selectAll(`.exon${junc.startExon.exonNumber}`).classed("highlighted", true);
                mapSvg.selectAll(`.exon${junc.endExon.exonNumber}`).classed("highlighted", true);
            }
        })
        .on("mouseout", function(d){
            d4.select(this).classed("highlighted", false)
                .classed("normal", true);
            d4.selectAll(".junc").classed("highlighted", false);
            d4.selectAll(".junc-curve").classed("highlighted", false);
            mapSvg.selectAll(".exon").classed("highlighted", false);
        });

    mapSvg.selectAll(".junc")
        .on("mouseover", function(d){
            d4.selectAll(`.junc${d.junctionId}`).classed("highlighted", true);
            console.log(`Junction ${d.junctionId}: ${d.chromStart} - ${d.chromEnd}`)

            if (d.startExon !== undefined){
                mapSvg.selectAll(".exon").filter(`.exon${d.startExon.exonNumber}`).classed("highlighted", true);
                mapSvg.selectAll(".exon").filter(`.exon${d.endExon.exonNumber}`).classed("highlighted", true);
            }


            // on the junction heat map, label the xlabel
            mapSvg.select(`.junc${d.junctionId}`).classed("highlighted", true)
                .classed("normal", false);
        })
        .on("mouseout", function(d){
            d4.selectAll(`.junc${d.junctionId}`).classed("highlighted", false);
            mapSvg.selectAll(".exon").classed("highlighted", false);
            mapSvg.selectAll(".xLabel").classed("highlighted", false)
                .classed("normal", true);
        });
    mapSvg.selectAll(".exon-curated")
        .on('mouseover', function(d){
            d4.select(this).classed("highlighted", true);
            console.log(`Exon ${d.exonNumber}: ${d.chromStart} - ${d.chromEnd}`)
        })
        .on('mouseout', function(d){
            d4.select(this).classed("highlighted", false);
        });

}