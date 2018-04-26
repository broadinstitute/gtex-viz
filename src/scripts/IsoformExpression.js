"use strict";

import {select, selectAll} from "d3-selection";
import {json} from "d3-fetch";
import {scaleLinear} from "d3-scale";
import {min, max} from "d3-array";

import {getGtexUrls,
        parseTissues,
        parseExons,
        parseJunctions,
        parseIsoforms,
        parseIsoformExons,
        parseJunctionExpression,
        parseExonExpression,
        parseIsoformExpression
} from "./modules/gtexDataParser";

import {setColorScale, getColors, drawColorLegend} from "./modules/Colors";
import {downloadSvg} from "./modules/utils";

import DendroHeatmapConfig from "./modules/DendroHeatmapConfig";
import DendroHeatmap from "./modules/DendroHeatmap";
import GeneModel from "./modules/GeneModel";
import IsoformTrackViewer from "./modules/IsoformTrackViewer";

/**
 * Render expression heatmap, gene model, and isoform tracks
 * @param geneId {String} a gene name or gencode ID
 * @param domId {String} the DOM ID of the SVG
 * @param toolbarId {String} the DOM ID of the tool bar DIV
 * @param urls {Object} of the GTEx web service urls with attr: geneId, tissue, geneModelUnfiltered, geneModel, junctionExp, exonExp
 */
export function render(geneId, domId, toolbarId, urls=getGtexUrls()){
     json(urls.geneId + geneId)
         .then(function(data){  // get the gene object
            const gene = data.geneId[0];
            if (gene === undefined) throw "Fatal Error: gene not found";
            const gencodeId = gene.gencodeId;

            const promises = [
                json(urls.tissue),
                json(urls.geneModelUnfiltered + gencodeId),
                json(urls.geneModel + gencodeId),
                json(urls.isoform + gencodeId),
                json(urls.junctionExp + gencodeId),
                json(urls.exonExp + gencodeId),
                json(urls.isoformExp + gencodeId)
            ];

            Promise.all(promises)
            .then(function(args){
                const tissues = parseTissues(args[0]),
                    exons = parseExons(args[1]),
                    exonsCurated = parseExons(args[2]),
                    isoforms = parseIsoforms(args[3]),
                    isoformExons = parseIsoformExons(args[3]),
                    junctions = parseJunctions(args[4]),
                    tissueTree = args[4].clusters.tissue,
                    jExpress = parseJunctionExpression(args[4]),
                    exonExpress = parseExonExpression(args[5],  exonsCurated),
                    isoformExpress = parseIsoformExpression(args[6]);

                // render the junction expression dendro-heatmap

                const dmapConfig = new DendroHeatmapConfig(domId, window.innerWidth, 150, 0, {top: 30, right: 350, bottom: 200, left: 50});
                const dmap = new DendroHeatmap(undefined, tissueTree, jExpress, "Reds", 5, dmapConfig, true);
                dmap.render(domId, false, true, top, 5);


                // define the gene model and isoform tracks layout dimensions
                const modelConfig = {
                    x: dmap.config.panels.main.x,
                    y: dmap.config.panels.main.h + dmap.config.panels.main.y + 100,
                    w: dmap.config.panels.main.w,
                    h: 100
                };

                const exonH = 20;
                const isoTrackViewerConfig = {
                    x: modelConfig.x,
                    y: modelConfig.y + modelConfig.h,
                    w: modelConfig.w,
                    h: exonH*isoforms.length
                };

                // extend the SVG height to accommondate the gene model and isoform tracks
                let h = +select(`#${domId}`).select('svg').attr("height"); // get the current height
                select(`#${domId}`).select('svg').attr("height", h + modelConfig.h + isoTrackViewerConfig.h);

                // render the gene model
                const geneModel = new GeneModel(gene, exons, exonsCurated, junctions);
                const modelG = dmap.visualComponents.svg.append("g").attr("id", "geneModel")
                    .attr("transform", `translate(${modelConfig.x}, ${modelConfig.y})`);
                geneModel.render(modelG, modelConfig);

                // render isoform tracks, ignoring intron lengths
                const isoformTrackViewer = new IsoformTrackViewer(isoforms, isoformExons, exons, isoTrackViewerConfig);
                const trackViewerG = dmap.visualComponents.svg.append("g")
                    .attr("transform", `translate(${isoTrackViewerConfig.x}, ${isoTrackViewerConfig.y})`);
                isoformTrackViewer.render(false, trackViewerG);

                // temporary code: customization
                _createToolbar(toolbarId, dmap, dmap.config.id);
                _customize(tissues, geneModel, dmap, isoformTrackViewer, jExpress, exonExpress, isoformExpress);
                $('#spinner').hide();
            })
                .catch(function(err){console.error(err)});
         })
         .catch(function(err){
             console.error(err);
         })
}


/**
 * Create the tool bar
 * @param barId {String} the toolbar's dom ID
 * @param dmap {DendroHeatmap}
 * @param domId {String} the SVG's parent dom ID
 * @private
 */
function _createToolbar(barId, dmap, domId){
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
        .on("mouseover", function(){
            dmap.visualComponents.tooltip.show("Download Isoform SVG");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });
}


/**
 * customizing the junciton expression visualization
 * dependencies: CSS classes from expressMap.css, junctionMap.css
 * @param tissues {List} of GTEx tissue objects with attr: colorHex, tissueId, tissueName
 * @param geneModel {Object} of the collapsed gene model
 * @param dmap {Object} of DendropHeatmap
 * @param jdata {List} of junction expression data objects
 * @param edata {List} of exon expression data objects
 * @param idata {List} of isoform expression data objects
 */
function _customize(tissues, geneModel, dmap, isoTrackViewer, jdata, edata, idata){
    // junction labels on the map
    const mapSvg = dmap.visualComponents.svg;
    const tooltip = dmap.visualComponents.tooltip;
    const tissueDict = tissues.reduce((arr, d)=>{arr[d.tissueId] = d; return arr;},{});
    // define the junction heatmap cells' mouse events
    // note: If you need to reference the element inside the function (e.g. d3.select(this)) you will need to use a normal anonymous function.
    mapSvg.selectAll(".exp-map-cell")
        .on("mouseover", function(d){
            const selected = select(this);
            dmap.objects.heatmap.cellMouseover(selected);
            const tissue = tissueDict[d.y] === undefined?d.x:tissueDict[d.y].tissueName;
            const junc = geneModel.junctions.filter((j)=>j.junctionId == d.x && !j.filtered)[0];
            tooltip.show(`Tissue: ${tissue}<br/> Junction: ${junc.displayName}<br/> Median read counts: ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`)
        })
        .on("mouseout", function(d){
            mapSvg.selectAll("*").classed('highlighted', false);
            tooltip.hide();
        });

    // define gene model exon color scale
    const ecolorScale = setColorScale(edata.map(d=>d.value), "Blues");
    drawColorLegend("Exon median read counts per base", mapSvg, ecolorScale, {x: dmap.config.panels.legend.x + 700, y:dmap.config.panels.legend.y}, true, 5, 2);

    // define isoform exon color scale
    const isoColorScale = setColorScale(idata.map(d=>d.value), "Greys");
    const isoBarScale = scaleLinear()
            .domain([min(idata.map(d=>d.value)), max(idata.map(d=>d.value))])
            .range([0, -100]);

    // replace tissue ID with tissue name
    mapSvg.selectAll(".exp-map-ylabel")
        .text((d)=>tissueDict[d]!==undefined?tissueDict[d].tissueName:d)
        .attr("x", dmap.objects.heatmap.xScale.range()[1] + 15); // make room for tissue color boxes

    // add tissue bands
    mapSvg.select("#heatmap").selectAll(".tissue-band")
        .data(dmap.objects.heatmap.yScale.domain())
        .enter()
        .append("rect")
        .attr("x", dmap.objects.heatmap.xScale.range()[1] + 5)
        .attr("y", (d)=>dmap.objects.heatmap.yScale(d))
        .attr("width", 5)
        .attr("height", dmap.objects.heatmap.yScale.bandwidth())
        .classed("tissue-band", true)
        .style("fill", (d)=>tissueDict[d].colorHex);

    // define tissue label mouse events
    mapSvg.selectAll(".exp-map-ylabel")
        .on("mouseover", function(){
             select(this)
                .classed('highlighted', true);

        })
        .on("click", function(d){
            mapSvg.selectAll(".exp-map-ylabel").classed("clicked", false);
            select(this).classed("clicked", true);
            const tissue = d;
            const j = jdata.filter((j)=>j.tissueId==tissue); // junction data
            const ex = edata.filter((e)=>e.tissueId==tissue); // exon data
            geneModel.changeTextlabel(mapSvg.select("#geneModel"), tissue);
            geneModel.addData(mapSvg.select("#geneModel"), j, ex, dmap.objects.heatmap.colorScale, ecolorScale);

            // isoforms update
            const isoData = idata.filter((iso)=>iso.tissueId==tissue);
            isoTrackViewer.showData(isoData, isoColorScale, isoBarScale);
        });

    // junction labels
    mapSvg.selectAll(".exp-map-xlabel")
        .each(function(){
            // add junction ID as the dom id
            const xlabel = select(this);
            const jId = xlabel.text();
            xlabel.attr("id", `${jId}`);
            xlabel.classed(`junc${jId}`, true);

            // and then change the text to startExon-endExon format
            const junc = geneModel.junctions.filter((d)=>d.junctionId == `${jId}` && !d.filtered)[0];
            if (junc !== undefined) xlabel.text(junc.displayName);
        })
        .on("mouseover", function(){
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
        .on("mouseout", function(){
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