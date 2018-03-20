"use strict";
import * as d4 from "d3";
import {getGtexUrls, parseTissues, parseExons, parseJunctions, parseIsoforms, parseJunctionExpression, parseExonExpression} from "./modules/gtex/gtexDataParser";
import {setColorScale, getColors, drawColorLegend} from "./modules/Colors";
import DendroHeatmapConfig from "./modules/DendroHeatmapConfig";
import DendroHeatmap from "./modules/DendroHeatmap";
import GeneModel from "./modules/GeneModel";

/** TODO
 * 4.1 report individual isoforms
 * 4.2 mouseover exons should report the normalized read counts in a tissue
 *  * 6.5 exon expression map
 * 13. Isoform Express Map

 * 4. add tissue colors
 * 4.2 reset gene model to no coloring
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
 * 14. EpiMap
 * 15. Create a new github repo and consolidate all of my d3.v4 viz tools there
 */


/**
 *
 * @param geneId {String} a gene name or gencode ID
 * @param domId {String} the DOM ID of the SVG
 * @param toolbarId {String} the DOM ID of the tool bar DIV
 * @param urls {Object} of the GTEx web service urls with attr: geneId, tissue, geneModelUnfiltered, geneModel, junctionExp, exonExp
 */
export function renderJunctions(geneId, domId, toolbarId, urls=getGtexUrls()){
     d4.json(urls.geneId + geneId, function(json){  // get the gene object
        const gene = json.geneId[0];
        if (gene === undefined) throw "Fatal Error: gene not found";
        _renderJunctions(gene, domId, urls);
    });
}

/**
 *
 * @param gene {Object} with attr: gencodeId
 * @param heatmapDomId {String}
 * @param urls {Object} of the GTEx web service urls with attr: tissue, geneModelUnfiltered, geneModel, junctionExp, exonExp
 * @private
 */
function _renderJunctions(gene, heatmapDomId, urls=getGtexUrls()){
    const gencodeId = gene.gencodeId;
    const modelDomId = "model";
    d4.queue()
        .defer(d4.json, urls.tissue) // tissue colors
        .defer(d4.json, urls.geneModelUnfiltered + gencodeId) // unfiltered collapsed gene model
        .defer(d4.json, urls.geneModel + gencodeId) // final collapsed gene model
        .defer(d4.json, urls.isoform + gencodeId) // isoform structures
        .defer(d4.json, urls.junctionExp + gencodeId) // junction expression data
        .defer(d4.json, urls.exonExp + gencodeId) // exon expression data of the final collapsed model only
        .await(function(error, tissueJson, geneModelJson, curatedGeneModelJson, isoformJson, data, data2){
            if (error !== null) throw "Web service error.";
            const tissues = parseTissues(tissueJson),
                exons = parseExons(geneModelJson),
                exonsCurated = parseExons(curatedGeneModelJson),
                junctions = parseJunctions(data),
                isoforms = parseIsoforms(isoformJson),
                tissueTree = data.clusters.tissue,
                junctionTree = data.clusters.junction, // junction tree is not really useful
                jExpress = parseJunctionExpression(data),
                exonExpress = parseExonExpression(data2,  exonsCurated);

            // junction expression heat map
            let dmapConfig = new DendroHeatmapConfig("chart");
            dmapConfig.setMargin({left: 150, top: 20, right: 200, bottom: 2000}); // TODO: figure out a better way to extend the SVG height
            dmapConfig.noTopTreePanel(1250);
            const dmap = new DendroHeatmap(junctionTree, tissueTree, jExpress, "reds2", 5, dmapConfig, false);
            dmap.render(heatmapDomId, false, true, "top"); // false: no top tree, true: show left tree, top: legend on top

            // gene model rendering
            const geneModel = new GeneModel(gene, exons, exonsCurated, junctions);
            const adjust = 100;
            const modelConfig = {
                x: 100,
                y: dmap.config.panels.main.h + dmap.config.panels.main.y + adjust,
                w: dmap.config.panels.main.w,
                h: 100
            };
            const modelG = dmap.visualComponents.svg.append("g").attr("id", "geneModel");
            modelG.attr("transform", `translate(${modelConfig.x}, ${modelConfig.y})`);
            geneModel.render(modelG, modelConfig);

            // render isoform structures, ignoring intron lengths
            d4.keys(isoforms).forEach((id, i)=>{
                let transcript = gene;
                transcript["transcriptId"] = id; // TODO: or grab the actual transcript object through the web service
                const isoformModel = new GeneModel(transcript, exons, isoforms[id], [], true);
                const isoformG = dmap.visualComponents.svg.append("g").attr("id", id);
                const h = 20;
                const config = {
                    x: modelConfig.x,
                    y: modelConfig.y + modelConfig.h + ((i) * h),
                    w: modelConfig.w,
                    h: h
                };
                isoformG.attr("transform", `translate(${config.x}, ${config.y})`);
                isoformModel.render(isoformG, config)
            });

            // temporarily
            customize(geneModel, dmap, jExpress, exonExpress);
            $('#spinner').hide();

        });
}

/**
 * customizing the junciton expression visualization
 * dependencies: CSS classes from expressMap.css, junctionMap.css
 * @param geneModel {Object} of gene
 * @param map {Object} of DendropHeatmap
 * @param jdata {List} of junction expression data objects
 * @param edata {List} of exon expression data objects
 */
function customize(geneModel, map, jdata, edata){
    // junction labels on the map
    const mapSvg = map.visualComponents.svg;
    const ecolorScale = setColorScale(edata.map(d=>d.value), getColors("gnbu"));
    drawColorLegend("Exon median read counts per base", mapSvg, ecolorScale, {x: map.config.panels.legend.x + 700, y:map.config.panels.legend.y});// TODO: remove hard-coded positions
    mapSvg.selectAll(".exp-map-ylabel")
        .on("mouseover", function(d){
            const tissue = d4.select(this).text();
             d4.select(this)
                .classed('highlighted', true);

        })
        .on("click", function(d){
            mapSvg.selectAll(".exp-map-ylabel").classed("clicked", false);
            d4.select(this).classed("clicked", true);
            const tissue = d4.select(this).text();
            const j = jdata.filter((d)=>d.tissueId==tissue);
            const ex = edata.filter((d)=>d.tissueId==tissue);
            geneModel.changeTextlabel(mapSvg.select("#geneModel"), "Expression in " + tissue);
            geneModel.addData(mapSvg.select("#geneModel"), j, ex, map.objects.heatmap.colorScale, ecolorScale);
        });

    mapSvg.selectAll(".exp-map-xlabel")
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
            d4.select(this).classed("highlighted", true);

            // highlight the junction and its exons on the gene model
            mapSvg.selectAll(`.junc${jId}`).classed("highlighted", true);
            const junc = geneModel.junctions.filter((d)=>d.junctionId == jId && !d.filtered)[0];
            if (junc !== undefined) {
                mapSvg.selectAll(`.exon${junc.startExon.exonNumber}`).classed("highlighted", true);
                mapSvg.selectAll(`.exon${junc.endExon.exonNumber}`).classed("highlighted", true);
            }
        })
        .on("mouseout", function(d){
            d4.select(this).classed("highlighted", false);
            d4.selectAll(".junc").classed("highlighted", false);
            d4.selectAll(".junc-curve").classed("highlighted", false);
            mapSvg.selectAll(".exon").classed("highlighted", false);
        });

    mapSvg.selectAll(".junc")
        .on("mouseover", function(d){
            d4.selectAll(`.junc${d.junctionId}`).classed("highlighted", true);
            console.log(`Junction ${d.junctionId}: ${d.chromStart} - ${d.chromEnd}`);

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
            console.log(`Exon ${d.exonNumber}: ${d.chromStart} - ${d.chromEnd}. RPK: ${d.originalValue}`)
        })
        .on('mouseout', function(d){
            d4.select(this).classed("highlighted", false);
        });

}