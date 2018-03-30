"use strict";

import {select, selectAll} from "d3-selection";
import {json} from "d3-request";
import {queue} from "d3-queue";
import {scaleLinear} from "d3-scale";
import {min, max} from "d3-array";

import {getGtexUrls, parseTissues, parseExons, parseJunctions, parseIsoforms, parseIsoformExons, parseJunctionExpression, parseExonExpression, parseIsoformExpression} from "./modules/gtex/gtexDataParser";
import {setColorScale, getColors, drawColorLegend} from "./modules/Colors";
import {downloadSvg} from "./modules/utils";

import DendroHeatmapConfig from "./modules/DendroHeatmapConfig";
import DendroHeatmap from "./modules/DendroHeatmap";
import GeneModel from "./modules/GeneModel";

/**
 * Render junctions
 * @param geneId {String} a gene name or gencode ID
 * @param domId {String} the DOM ID of the SVG
 * @param toolbarId {String} the DOM ID of the tool bar DIV
 * @param urls {Object} of the GTEx web service urls with attr: geneId, tissue, geneModelUnfiltered, geneModel, junctionExp, exonExp
 */
export function renderJunctions(geneId, domId, toolbarId, urls=getGtexUrls()){
     json(urls.geneId + geneId, function(json){  // get the gene object
        const gene = json.geneId[0];
        if (gene === undefined) throw "Fatal Error: gene not found";
        _renderJunctions(gene, domId, toolbarId, urls);
    });
}

/**
 * Render junction helper function
 * @param gene {Object} with attr: gencodeId
 * @param heatmapDomId {String}
 * @param toolbarId {String} the toolbar's dom ID
 * @param urls {Object} of the GTEx web service urls with attr: tissue, geneModelUnfiltered, geneModel, junctionExp, exonExp
 * @private
 */
function _renderJunctions(gene, heatmapDomId, toolbarId, urls=getGtexUrls()){
    const gencodeId = gene.gencodeId;
    const modelDomId = "model";
    queue()
        .defer(json, urls.tissue) // tissue colors
        .defer(json, urls.geneModelUnfiltered + gencodeId) // unfiltered collapsed gene model
        .defer(json, urls.geneModel + gencodeId) // final collapsed gene model
        .defer(json, urls.isoform + gencodeId) // isoform structures
        .defer(json, urls.junctionExp + gencodeId) // junction expression data
        .defer(json, urls.exonExp + gencodeId) // exon expression data of the final collapsed model only
        .defer(json, urls.isoformExp + gencodeId)
        .await(function(error, tissueJson, geneModelJson, curatedGeneModelJson, isoformJson, data, data2, data3){
            if (error !== null) throw "Web service error.";
            const tissues = parseTissues(tissueJson),
                exons = parseExons(geneModelJson),
                exonsCurated = parseExons(curatedGeneModelJson),
                junctions = parseJunctions(data),
                isoforms = parseIsoforms(isoformJson),
                isoformExons = parseIsoformExons(isoformJson),
                tissueTree = data.clusters.tissue,
                junctionTree = data.clusters.junction, // junction tree is not really useful
                jExpress = parseJunctionExpression(data),
                exonExpress = parseExonExpression(data2,  exonsCurated),
                isoformExpress = parseIsoformExpression(data3);

            // junction expression heat map
            let dmapConfig = new DendroHeatmapConfig("chart");
            dmapConfig.setMargin({left: 150, top: 20, right: 200, bottom: 2000}); // TODO: figure out a better way to extend the SVG height
            dmapConfig.noTopTreePanel(1250);
            const useLog = true;
            const dmap = new DendroHeatmap(junctionTree, tissueTree, jExpress, "reds2", 5, dmapConfig, useLog);
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

            isoforms.forEach((isoform, i)=>{
                const isoformModel = new GeneModel(isoform, exons, isoformExons[isoform.transcriptId], [], true);
                // create a new <g> for each isoform with the transcript ID, but replace the "." with "_" because a "." is not allowed in a dom ID
                const isoformG = dmap.visualComponents.svg.append("g").attr("id", isoform.transcriptId.replace(".", "_"));
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
            _createToolbar(toolbarId, dmap.config.id);
            _customize(geneModel, dmap, jExpress, exonExpress, isoformExpress);
            $('#spinner').hide();
        });
}

/**
 * Create the tool bar
 * @param barId {String} the toolbar's dom ID
 * @param domId {String} the SVG's parent dom ID
 * @private
 */
function _createToolbar(barId, domId){
    $(`#${barId}`).show();
    let $barDiv = $("<div/>").addClass("btn-group btn-group-sm").appendTo(`#${barId}`);
    const id1 = "isoformDownload";
    let $button1 = $("<a/>").attr("id", id1)
        .addClass("btn btn-default").appendTo($barDiv);
    $("<i/>").addClass("fa fa-save").appendTo($button1);

    select(`#${id1}`)
        .on("click", function(){
            // TODO: review this download method
            let svgObj = $($($(`${"#" +domId} svg`))[0]); // complicated jQuery!
            downloadSvg(svgObj, "isoforms.svg", "downloadTempDiv"); // TODO: remove hard-coded hidden div, create this div on the fly
        })
        // .on("mouseover", function(){
        //     dmap.visualComponents.tooltip.show("Download Isoform SVG");
        // })
        // .on("mouseout", function(){
        //     dmap.visualComponents.tooltip.hide();
        // });
}


/**
 * customizing the junciton expression visualization
 * dependencies: CSS classes from expressMap.css, junctionMap.css
 * @param geneModel {Object} of the collapsed gene model
 * @param map {Object} of DendropHeatmap
 * @param jdata {List} of junction expression data objects
 * @param edata {List} of exon expression data objects
 * @param idata {List} of isoform expression data objects
 */
function _customize(geneModel, map, jdata, edata, idata){
    // junction labels on the map
    const mapSvg = map.visualComponents.svg;

    // define exon color scale
    const ecolorScale = setColorScale(edata.map(d=>d.value), getColors("blues"));
    drawColorLegend("Exon median read counts per base", mapSvg, ecolorScale, {x: map.config.panels.legend.x + 700, y:map.config.panels.legend.y}, true, 2);

    // define isoform bar scale
    const isoBarScale = scaleLinear()
        .domain([min(idata.map(d=>d.value)), max(idata.map(d=>d.value))])
        .range([0, 100]);
    const isoColorScale = setColorScale(idata.map(d=>Math.log10(d.value+1)), getColors("greys"));
    // define tissue label mouse events
    mapSvg.selectAll(".exp-map-ylabel")
        .on("mouseover", function(d){
             select(this)
                .classed('highlighted', true);

        })
        .on("click", function(d){
            mapSvg.selectAll(".exp-map-ylabel").classed("clicked", false);
            select(this).classed("clicked", true);
            const tissue = select(this).text();
            const j = jdata.filter((d)=>d.tissueId==tissue);
            const ex = edata.filter((d)=>d.tissueId==tissue);
            geneModel.changeTextlabel(mapSvg.select("#geneModel"), "Expression in " + tissue);
            geneModel.addData(mapSvg.select("#geneModel"), j, ex, map.objects.heatmap.colorScale, ecolorScale);

            // TODO: code review!!! Add the following to geneModel.addData?
            // isoforms update
            // create a tissue-specific isoform expression lookup table indexed by transcriptId
            const isoDict = idata.filter((d)=>d.tissueId==tissue).reduce((arr, d)=>{arr[d.transcriptId]=d.value; return arr;}, {});
            Object.keys(isoDict).forEach((id)=>{
                const isoform = mapSvg.select(`#${id.replace(".", "_")}`);
                const x1 = isoform.select(".isoformBar").attr("x1");
                // reset x2 to x1, then extend x2 by the isoform TPM of the selected tissue
                const x2 = Number(x1) + isoBarScale(isoDict[id]) + 1; // base length = 1
                isoform.select(".isoformBar")
                    .attr("x2", x2)
                    .style("stroke", isoColorScale(Math.log10(isoDict[id])));
                isoform.selectAll(".exon-curated")
                    .style("fill", isoColorScale(Math.log10(isoDict[id])));
            });

        });

    mapSvg.selectAll(".exp-map-xlabel")
        .each(function(d){
            // add junction ID as the dom id
            const xlabel = select(this);
            const jId = xlabel.text();
            xlabel.attr("id", `${jId}`);
            xlabel.classed(`junc${jId}`, true);

            // and then change the text to startExon-endExon format
            const junc = geneModel.junctions.filter((d)=>d.junctionId == `${jId}` && !d.filtered)[0];
            if (junc !== undefined) xlabel.text(`Exon ${junc.startExon.exonNumber} - ${junc.endExon.exonNumber}`);
        })
        .on("mouseover", function(d){
            const jId = select(this).attr("id");
            select(this).classed("highlighted", true);

            // highlight the junction and its exons on the gene model
            mapSvg.selectAll(`.junc${jId}`).classed("highlighted", true);
            const junc = geneModel.junctions.filter((d)=>d.junctionId == jId && !d.filtered)[0];
            if (junc !== undefined) {
                mapSvg.selectAll(`.exon${junc.startExon.exonNumber}`).classed("highlighted", true);
                mapSvg.selectAll(`.exon${junc.endExon.exonNumber}`).classed("highlighted", true);
            }
        })
        .on("mouseout", function(d){
            select(this).classed("highlighted", false);
            selectAll(".junc").classed("highlighted", false);
            selectAll(".junc-curve").classed("highlighted", false);
            mapSvg.selectAll(".exon").classed("highlighted", false);
        });

    mapSvg.selectAll(".junc")
        .on("mouseover", function(d){
            selectAll(`.junc${d.junctionId}`).classed("highlighted", true);
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
            selectAll(`.junc${d.junctionId}`).classed("highlighted", false);
            mapSvg.selectAll(".exon").classed("highlighted", false);
            mapSvg.selectAll(".xLabel").classed("highlighted", false)
                .classed("normal", true);
        });
    mapSvg.selectAll(".exon-curated")
        .on('mouseover', function(d){
            select(this).classed("highlighted", true);
            console.log(`Exon ${d.exonNumber}: ${d.chromStart} - ${d.chromEnd}. RPK: ${d.originalValue}`)
        })
        .on('mouseout', function(d){
            select(this).classed("highlighted", false);
        });

}