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
        parseIsoformExpressionTranspose,
        parseIsoformExons,
        parseJunctionExpression,
        parseExonExpression,
        parseIsoformExpression
} from "./modules/gtexDataParser";

import {setColorScale, drawColorLegend} from "./modules/colors";
// import {downloadSvg} from "./modules/utils";

import DendroHeatmapConfig from "./modules/DendroHeatmapConfig";
import DendroHeatmap from "./modules/DendroHeatmap";
import GeneModel from "./modules/GeneModel";
import IsoformTrackViewer from "./modules/IsoformTrackViewer";

/**
 * Render expression heatmap, gene model, and isoform tracks
 * @param type {enum} isoform, exon, junction
 * @param geneId {String} a gene name or gencode ID
 * @param rootId {String} the DOM ID of the SVG
 * @param urls {Object} of the GTEx web service urls with attr: geneId, tissue, geneModelUnfiltered, geneModel, junctionExp, exonExp
 */
export function render(type, geneId, rootId, urls=getGtexUrls()){
    json(urls.geneId + geneId) // query the gene by geneId--gene name or gencode ID with or without versioning
        .then(function(data){
             // get the gene object and its gencode Id
             if (!data.hasOwnProperty("geneId")) throw "Parsing Error: attribute geneId doesn't exist.";
             if (data.geneId.length==0){
                 alert("No gene is found with " + geneId);
                 throw "Fatal Error: gene is not found";
             }
             if (data.geneId.length>1) {
                 let filtered = data.geneId.filter((g)=>{
                     return g.geneSymbolUpper==geneId.toUpperCase() || g.ensemblId==geneId.toUpperCase() || g.gencodeId == geneId.toUpperCase()
                 });
                 if (filtered.length > 1) {
                     alert("Fatal Error: input gene ID is not unique.");
                     throw "Fatal Error: input gene ID is not unique.";
                 }
                 else{
                     data.geneId = filtered;
                 }
             }
             const gene = data.geneId[0];
             if (gene === undefined) {
                 alert("No gene is found with " + geneId);
                 throw "Fatal Error: gene is not found";
             }
             const gencodeId = gene.gencodeId;

             // build the promises
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
                        exons = parseExons(args[1]), // exons of the full gene model
                        exonsCurated = parseExons(args[2]), // exons of the curated gene model
                        isoforms = parseIsoforms(args[3]), // by default, the parser sorts the isoforms in descending order by length
                        isoformExons = parseIsoformExons(args[3]), // exons of the individual isoforms
                        junctions = parseJunctions(args[4]),
                        junctionExpress = parseJunctionExpression(args[4]),
                        exonExpress = parseExonExpression(args[5],  exonsCurated);
                    let isoformExpress = parseIsoformExpression(args[6]);

                    // error checking
                    let exonColorScale, isoformColorScale, junctionColorScale;
                    if (junctions.length >= 0){
                        // scenario1: not a single-exon gene
                        if (junctionExpress !== undefined){
                            junctionColorScale = setColorScale(junctionExpress.map(d=>d.value), "Reds");
                        }
                    }

                    // define all the color scales
                    exonColorScale = setColorScale(exonExpress.map(d=>d.value), "Blues");
                    isoformColorScale = setColorScale(isoformExpress.map(d=>d.value), "Purples");

                // heat map
                let dmap = undefined;
                const ids = {
                    root: rootId,
                    svg: `${rootId}-svg`,
                    tooltip: "isoformTooltip",
                    toolbar: "isoformToolbar",
                    clone: "isoformClone",
                    buttons: {
                        save: "isoformSave"
                    }
                };
                // build the dom components
                if($(`#${ids.tooltip}`).length == 0) $('<div/>').attr('id', ids.tooltip).appendTo($('body'));
                ["toolbar", "clone"].forEach((key)=>{
                    $('<div/>').attr("id", ids[key]).appendTo($(`#${ids.root}`));
                });
                const svgTitle = `${gene.geneSymbol}: ${gene.gencodeId} ${gene.description}`;
                const width = $(`#${rootId}`).innerWidth()||window.innerWidth;
               
                switch(type){
                    case "isoformTransposed": {
                        const dmapConfig = new DendroHeatmapConfig(width, 150, 100, {top: 60, right: 350, bottom: 200, left: 50}, 12, 10);
                        let tissueTree = args[6].clusters.tissue;
                        let isoformTree = args[6].clusters.isoform;
                        let isoformExpressT = parseIsoformExpressionTranspose(args[6]);

                        dmap = new DendroHeatmap(tissueTree, isoformTree, isoformExpressT, "Purples", 5, dmapConfig, true, 10, `Isoform Expression of ${svgTitle}`);
                        dmap.render(ids.root, ids.svg, true, true, top, 5);
                        isoforms.sort((a, b)=>{
                            const orders = dmap.objects.rowTree.yScale.domain(); // the leaf order of the isoform dendrogram
                            if (orders.indexOf(a.transcriptId) < orders.indexOf(b.transcriptId)) return -1;
                            if (orders.indexOf(a.transcriptId) > orders.indexOf(b.transcriptId)) return 1;
                            return 0;
                        });
                        break;
                    }
                    case "junction": {
                        if (junctions.length == 0) {
                            $(`#${rootId}`).text('This gene has no junctions available.');
                            break;
                        }
                        const dmapConfig = new DendroHeatmapConfig(width, 150, 0, {top: 60, right: 350, bottom: 200, left: 50}, 12, 10);
                        let tissueTree = args[4].clusters.tissue;
                        dmap = new DendroHeatmap(undefined, tissueTree, junctionExpress, "Reds", 5, dmapConfig, true, 10, `Junction Expression of ${svgTitle}`);
                        dmap.render(ids.root, ids.svg, false, true, top, 5);

                        break;
                    }
                    case "exon": {
                        const dmapConfig = new DendroHeatmapConfig(width, 150, 0, {top: 60, right: 350, bottom: 200, left: 50}, 12, 10);
                        let tissueTree = args[5].clusters.tissue;
                        dmap = new DendroHeatmap(undefined, tissueTree, exonExpress, "Blues", 5, dmapConfig, true, 2, `Exon Expression of ${svgTitle}`);
                        dmap.render(ids.root, ids.svg, false, true, top, 5);

                        break;
                    }
                    default: {
                        throw "Input type is not recognized";
                    }
                }
                $('#spinner').hide();

                // TODO: code review
                // tooltip
                dmap.createTooltip(ids.tooltip);

                // define the gene model and isoform tracks layout dimensions
                const yAdjust = type.startsWith('isoform')?60:80; // vertical space between the heatmap and gene model/isoform tracks
                const modelConfig = {
                    x: dmap.config.panels.main.x,
                    y: dmap.config.panels.main.h + dmap.config.panels.main.y + yAdjust, // TODO: remove hard-coded values
                    w: dmap.config.panels.main.w,
                    h: 100
                };

                const exonH = 20; // TODO: remove hard-coded values
                const isoTrackViewerConfig = {
                    x: modelConfig.x,
                    y: modelConfig.y + modelConfig.h,
                    w: modelConfig.w,
                    h: exonH*(isoforms.length),
                    labelOn: 'left'
                };

                // extend the SVG height to accommondate the gene model and isoform tracks
                let h = +select(`#${ids.svg}`).attr("height"); // get the current height
                let adjust = h + modelConfig.h + isoTrackViewerConfig.h;
                if (!type.startsWith('isoform')) adjust = adjust < 1200?1200:adjust;
                select(`#${ids.svg}`).attr("height", adjust); // set minimum height to 1200 for color legends // TODO: code review, remove hard-coded values

                // render the gene model
                const geneModel = new GeneModel(gene, exons, exonsCurated, junctions);
                const modelG = dmap.visualComponents.svg.append("g").attr("id", "geneModel") // TODO: remove hard-coded id
                    .attr("transform", `translate(${modelConfig.x}, ${modelConfig.y})`);
                if (!type.startsWith("isoform")) geneModel.render(modelG, modelConfig); // gene model is not rendered when the page is in isoform view mode

                // render isoform tracks, ignoring intron lengths
                const isoformTrackViewer = new IsoformTrackViewer(isoforms, isoformExons, exons, isoTrackViewerConfig);
                const trackViewerG = dmap.visualComponents.svg.append("g")
                    .attr("transform", `translate(${isoTrackViewerConfig.x}, ${isoTrackViewerConfig.y})`);
                const labelOn = type.startsWith('isoform')?'both':'left';
                isoformTrackViewer.render(false, trackViewerG, labelOn);

                // customization
                if(!type.startsWith('isoform')) _addColorLegendsForGeneModel(dmap, junctionColorScale, exonColorScale);
                _createToolbar(dmap, ids);

                switch(type){
                    case "isoformTransposed": {
                        _customizeIsoformTransposedMap(tissues, dmap, isoformTrackViewer, junctionColorScale, exonColorScale, isoformColorScale, junctionExpress, exonExpress, isoformExpress);
                        break;
                    }
                    case "junction": {
                        if (junctions.length == 0) break;
                        _customizeHeatMap(tissues, geneModel, dmap, isoformTrackViewer, junctionColorScale, exonColorScale, isoformColorScale, junctionExpress, exonExpress, isoformExpress);
                        _customizeJunctionMap(tissues, geneModel, dmap);
                        _customizeGeneModel(tissues, geneModel, dmap);
                        break;
                    }
                    case "exon": {
                        _customizeHeatMap(tissues, geneModel, dmap, isoformTrackViewer, junctionColorScale, exonColorScale, isoformColorScale, junctionExpress, exonExpress, isoformExpress);
                        _customizeExonMap(tissues, geneModel, dmap);
                        _customizeGeneModel(tissues, geneModel, dmap);
                        break;
                    }
                    default: {
                        throw "unrecognized type";
                    }
                }
        }).catch(function(err){
            console.error(err);
            $('#spinner').hide();
        });
        })
        .catch(function(err){
            console.error(err);
            $('#spinner').hide();
        })
}

/**
 * Create the SVG toolbar
 * @param dmap {DendroHeatmap}
 * @param ids {Dictionary} of DOM IDs with buttons
 * @private
 */
function _createToolbar(dmap, ids){
    let toolbar = dmap.createToolbar(ids.toolbar, dmap.tooltip);
    toolbar.createDownloadSvgButton(ids.buttons.save, ids.svg, `${ids.root}-save.svg`, ids.clone);
}

/**
 * customizing the heatmap
 * dependencies: CSS classes from expressMap.css, junctionMap.css
 * @param tissues {List} of GTEx tissue objects with attr: colorHex, tissueId, tissueName
 * @param geneModel {GeneModel} of the collapsed gene model
 * @param dmap {Object} of DendroHeatmap
 * @param isoTrackViewer {IsoformTrackViewer}
 * @param junctionScale
 * @param exonScale
 * @param isoformScale
 * @param junctionData {List} of junction expression data objects
 * @param exonData {List} of exon expression data objects
 * @param isoformData {List} of isoform expression data objects
 * @private
 */
function _customizeHeatMap(tissues, geneModel, dmap, isoTrackViewer, junctionScale, exonScale, isoformScale, junctionData, exonData, isoformData){
    const mapSvg = dmap.visualComponents.svg;
    const tissueDict = tissues.reduce((arr, d)=>{arr[d.tissueId] = d; return arr;},{});

    // replace tissue ID with tissue name
    mapSvg.selectAll(".exp-map-ylabel")
        .text((d)=>tissueDict[d]!==undefined?tissueDict[d].tissueName:d)
        .style("cursor", "pointer")
        .attr("x", dmap.objects.heatmap.xScale.range()[1] + 15); // make room for tissue color boxes

    // add tissue bands
    mapSvg.select("#heatmap").selectAll(".exp-map-ycolor")
        .data(dmap.objects.heatmap.yScale.domain())
        .enter()
        .append("rect")
        .attr("x", dmap.objects.heatmap.xScale.range()[1] + 5)
        .attr("y", (d)=>dmap.objects.heatmap.yScale(d))
        .attr("width", 5)
        .attr("height", dmap.objects.heatmap.yScale.bandwidth())
        .classed("exp-map-ycolor", true)
        .style("fill", (d)=>`#${tissueDict[d].colorHex}`);

    if (dmap.objects.heatmap.xScale.domain().length > 15) {
        // Add an extra tissue color band if the number of columns are larger than 15
        mapSvg.select("#heatmap").selectAll(".leaf-color")
            .data(dmap.objects.heatmap.yScale.domain())
            .enter()
            .append("rect")
            .attr("x", dmap.objects.heatmap.xScale.range()[0] - 5)
            .attr("y", (d) => dmap.objects.heatmap.yScale(d))
            .attr("width", 5)
            .attr("height", dmap.objects.heatmap.yScale.bandwidth())
            .classed("leaf-color", true)
            .style("fill", (d) => `#${tissueDict[d].colorHex}`);
    }

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
            let j;
            if (junctionData !== undefined) j = junctionData.filter((j)=>j.tissueId==tissue); // junction data
            const ex = exonData.filter((e)=>e.tissueId==tissue); // exon data
            // geneModel.changeTextlabel(mapSvg.select("#geneModel"), tissueDict[tissue].tissueName);
            geneModel.addData(mapSvg.select("#geneModel"), j, ex, junctionScale, exonScale);

            // isoforms update
            const isoBarScale = scaleLinear()
                .domain([min(isoformData.map(d=>d.value)), max(isoformData.map(d=>d.value))])
                .range([0, -100]);
            const isoData = isoformData.filter((iso)=>iso.tissueId==tissue);
            isoTrackViewer.showData(isoData, isoformScale, isoBarScale, tissueDict[tissue].tissueName);
        });
}

/**
 *
 * @param tissues {List} of the GTEx tissue objects with attr: tissueName
 * @param dmap {Object} of DendroHeatmap
 * @param isoTrackViewer {IsoTrackViewer}
 * @param junctionScale
 * @param exonScale
 * @param isoformScale
 * @param junctionData {List} of junction expression data objects
 * @param exonData {List} of exon expression data objects
 * @param isoformData {List} of isoform expression data objects
 * @private
 */
function _customizeIsoformTransposedMap(tissues, dmap, isoTrackViewer, junctionScale, exonScale, isoformScale, junctionData, exonData, isoformData){
    const mapSvg = dmap.visualComponents.svg;
    const tissueDict = tissues.reduce((arr, d)=>{arr[d.tissueId] = d; return arr;},{});
    const tooltip = dmap.tooltip;

    //replace tissue ID with tissue name
    mapSvg.selectAll(".exp-map-xlabel")
        .text((d)=>tissueDict[d]!==undefined?tissueDict[d].tissueName:d)
        .style("cursor", "pointer");

    // add tissue bands
    mapSvg.select("#heatmap").selectAll(".exp-map-xcolor")
        .data(dmap.objects.heatmap.xScale.domain())
        .enter()
        .append("rect")
        .attr("x", (d)=>dmap.objects.heatmap.xScale(d))
        .attr("y", dmap.objects.heatmap.yScale.range()[1] + 5)
        .attr("width", dmap.objects.heatmap.xScale.bandwidth())
        .attr("height", 5)
        .classed("exp-map-xcolor", true)
        .style("fill", (d)=>`#${tissueDict[d].colorHex}`);

    if (dmap.objects.heatmap.yScale.domain().length > 15){
        // when there are more than 15 isoforms, add another tissue color bands under the dendrogram's leaf nodes
         mapSvg.select("#heatmap").selectAll(".leaf-color")
            .data(dmap.objects.heatmap.xScale.domain())
            .enter()
            .append("rect")
            .attr("x", (d)=>dmap.objects.heatmap.xScale(d))
            .attr("y", dmap.objects.heatmap.yScale.range()[0] - 10)
            .attr("width", dmap.objects.heatmap.xScale.bandwidth())
            .attr("height", 5)
            .classed("leaf-color", true)
            .style("fill", (d)=>`#${tissueDict[d].colorHex}`);
    }


    // define tissue label mouse events
    mapSvg.selectAll(".exp-map-xlabel")
        .on("mouseover", function(){
             select(this)
                .classed('highlighted', true);

        })
        .on("mouseout", function(){
             select(this)
                .classed('highlighted', false);

        })
        .on("click", function(d){
            mapSvg.selectAll(".exp-map-xlabel").classed("clicked", false);
            select(this).classed("clicked", true);
            const tissue = d;
            const j = junctionData.filter((j)=>j.tissueId==tissue); // junction data
            const ex = exonData.filter((e)=>e.tissueId==tissue); // exon data

            // isoforms update

            const isoBarScale = scaleLinear()
                .domain([min(isoformData.map(d=>d.value)), max(isoformData.map(d=>d.value))])
                .range([0, -100]);
            const isoData = isoformData.filter((iso)=>iso.tissueId==tissue);
            const sort = false;
            isoTrackViewer.showData(isoData, isoformScale, isoBarScale, tissueDict[tissue].tissueName, sort);
        });



    // define the isoform heatmap cells' mouse events
    // note: to reference the element inside the function (e.g. d3.select(this)) here we must use a normal anonymous function.
    mapSvg.selectAll(".exp-map-cell")
        .on("mouseover", function(d){
            const selected = select(this); // 'this' refers to the d3 DOM object
            dmap.objects.heatmap.cellMouseover(selected);
            const tissue = tissueDict[d.x] === undefined?d.x:tissueDict[d.x].tissueName; // get tissue name or ID
            const value = parseFloat(d.originalValue.toExponential()).toPrecision(3);
            tooltip.show(`Tissue: ${tissue}<br/> Isoform: ${d.id}<br/> ${d.unit}: ${value==0?'NA':value}`)
        })
        .on("mouseout", function(d){
            mapSvg.selectAll("*").classed('highlighted', false);
            tooltip.hide();
        });

    // isoform labels
    mapSvg.selectAll(".exp-map-ylabel")
        .on("mouseover", function(d){
            select(this).classed("highlighted", true);

            // highlight the isoform track
            const id = d.replace(".", "_"); // dot is not an allowable character, so it has been replaced with an underscore
            mapSvg.select(`#${id}`).selectAll(".exon-curated").classed("highlighted", true); // TODO: perhaps change the class name?
            mapSvg.select(`#${id}`).selectAll(".intron").classed("highlighted", true);
        })
        .on("mouseout", function(){
            select(this).classed("highlighted", false);
            mapSvg.selectAll(".exon-curated").classed("highlighted", false);
            mapSvg.selectAll(".intron").classed("highlighted", false);
        })
        .on ("click", function(){
            // no action implemented
        });
}

/**
 * customizing the exon heat map
 * @param tissues {List} of the GTEx tissue objects with attr: tissueName
 * @param geneModel {GeneModel}
 * @param dmap {DendroHeatmap}

 * @private
 */
function _customizeExonMap(tissues, geneModel, dmap){
    const mapSvg = dmap.visualComponents.svg;
    const tooltip = dmap.tooltip;
    const tissueDict = tissues.reduce((arr, d)=>{arr[d.tissueId] = d; return arr;},{});

    // define the exon heatmap cells' mouse events
    // note: to reference the element inside the function (e.g. d3.select(this)) here we must use a normal anonymous function.
    mapSvg.selectAll(".exp-map-cell")
        .on("mouseover", function(d){
            const selected = select(this); // 'this' refers to the d3 DOM object
            dmap.objects.heatmap.cellMouseover(selected);
            const tissue = tissueDict[d.y] === undefined?d.x:tissueDict[d.y].tissueName; // get tissue name or ID
            const value = parseFloat(d.originalValue.toExponential()).toPrecision(3);
            tooltip.show(`Tissue: ${tissue}<br/> Exon: ${d.exonId}<br/> ${d.unit}: ${value==0?'NA':value}`)
        })
        .on("mouseout", function(d){
            mapSvg.selectAll("*").classed('highlighted', false);
            tooltip.hide();
        });

    // exon labels
    mapSvg.selectAll(".exp-map-xlabel")
        .each(function(d){
            // simplified the exon label
            const exonNumber = d.split("_")[1];
            select(this).text(`Exon ${exonNumber}`);
        })
        .on("mouseover", function(d){
            select(this).classed("highlighted", true);

            // highlight the exon on the gene model
            const exonNumber = d.split("_")[1];
            mapSvg.selectAll(`.exon-curated${exonNumber}`).classed("highlighted", true);
        })
        .on("mouseout", function(){
            select(this).classed("highlighted", false);
            mapSvg.selectAll(".exon-curated").classed("highlighted", false);
        });

}

/**
 * customizing the junction heat map
 * @param tissues {List} of the GTEx tissue objects with attr: tissueName
 * @param geneModel {GeneModel}
 * @param dmap {DendroHeatmap}
 * @private
 */
function _customizeJunctionMap(tissues, geneModel, dmap){
    const mapSvg = dmap.visualComponents.svg;
    const tooltip = dmap.tooltip;
    const tissueDict = tissues.reduce((arr, d)=>{arr[d.tissueId] = d; return arr;},{});

    // define the junction heatmap cells' mouse events
    mapSvg.selectAll(".exp-map-cell")
        .on("mouseover", function(d){
            const selected = select(this);
            dmap.objects.heatmap.cellMouseover(selected);
            const tissue = tissueDict[d.y] === undefined?d.x:tissueDict[d.y].tissueName; // get tissue name or ID
            const junc = geneModel.junctions.filter((j)=>j.junctionId == d.x && !j.filtered)[0]; // get the junction display name
            const value = parseFloat(d.originalValue.toExponential()).toPrecision(3);
            tooltip.show(`Tissue: ${tissue}<br/> Junction: ${junc.displayName}<br/> ${d.unit}: ${value==0?'NA':value}`)
        })
        .on("mouseout", function(d){
            mapSvg.selectAll("*").classed('highlighted', false);
            tooltip.hide();
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


}

function _customizeGeneModel(tissues, geneModel, dmap){
    const mapSvg = dmap.visualComponents.svg;
    const tooltip = dmap.tooltip;
    const model = mapSvg.select('#geneModel');
    const tissueDict = tissues.reduce((arr, d)=>{arr[d.tissueId] = d; return arr;},{});
    // mouse events on the gene model
    mapSvg.selectAll(".junc")
        .on("mouseover", function(d){
            selectAll(`.junc${d.junctionId}`).classed("highlighted", true);
            tooltip.show(`Junction ${d.junctionId} <br/> ${d.displayName}`);
            console.log(d);

            if (d.startExon !== undefined){
                model.selectAll(".exon").filter(`.exon${d.startExon.exonNumber}`).classed("highlighted", true);
                model.selectAll(".exon").filter(`.exon${d.endExon.exonNumber}`).classed("highlighted", true);
            }

            // on the junction heat map, label the xlabel
            model.select(`.junc${d.junctionId}`).classed("highlighted", true)
                .classed("normal", false);
        })
        .on("mouseout", function(d){
            selectAll(`.junc${d.junctionId}`).classed("highlighted", false);
            model.selectAll(".exon").classed("highlighted", false);
            model.selectAll(".xLabel").classed("highlighted", false)
                .classed("normal", true);
            tooltip.hide();
        });
    model.selectAll(".exon-curated")
        .on('mouseover', function(d){
            select(this).classed("highlighted", true);
            tooltip.show(`Exon ${d.exonNumber}: ${d.chromStart} - ${d.chromEnd}`)
        })
        .on('mouseout', function(d){
            select(this).classed("highlighted", false);
            tooltip.hide();
        });
}

function _addColorLegendsForGeneModel(dmap, junctionScale, exonScale){
    const mapSvg = dmap.visualComponents.svg;
    let X = dmap.objects.heatmap.xScale.range()[1] + 50;
    const Y = 30;
    const inc = 50;
    drawColorLegend("Exon read counts per base", mapSvg.select("#geneModel"), exonScale, {x: X, y:Y}, true, 5, 2, {h:20, w:10}, 'v');

    X = X + inc;
    if (junctionScale !== undefined) drawColorLegend("Junction read counts", mapSvg.select("#geneModel"), junctionScale, {x: X, y:Y}, true, 5, 10, {h:20, w:10}, 'v');

}