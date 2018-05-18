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

import {setColorScale, drawColorLegend} from "./modules/Colors";
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
     json(urls.geneId + geneId)
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

                    // define all the color scales
                    const exonColorScale = setColorScale(exonExpress.map(d=>d.value), "Blues");
                    const isoformColorScale = setColorScale(isoformExpress.map(d=>d.value), "Greys");
                    const junctionColorScale = setColorScale(junctionExpress.map(d=>d.value), "Reds");

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
                switch(type){
                    case "isoform": {
                        const dmapConfig = new DendroHeatmapConfig(window.innerWidth, 150, 100, {top: 30, right: 350, bottom: 200, left: 50}, 12, 10);
                        let tissueTree = args[6].clusters.tissue;
                        let isoformTree = args[6].clusters.isoform;
                        dmap = new DendroHeatmap(isoformTree, tissueTree, isoformExpress, "Greys", 5, dmapConfig, true, 10);
                        dmap.render(ids.root, ids.svg, true, true, top, 5);
                        isoforms.sort((a, b)=>{
                            const orders = dmap.objects.columnTree.xScale.domain(); // the leaf order of the isoform dendrogram
                            if (orders.indexOf(a.transcriptId) < orders.indexOf(b.transcriptId)) return -1;
                            if (orders.indexOf(a.transcriptId) > orders.indexOf(b.transcriptId)) return 1;
                            return 0;
                        });
                        break;
                    }
                    case "isoformTransposed": {
                        const dmapConfig = new DendroHeatmapConfig(window.innerWidth, 150, 100, {top: 30, right: 350, bottom: 200, left: 50}, 12, 10);
                        let tissueTree = args[6].clusters.tissue;
                        let isoformTree = args[6].clusters.isoform;
                        let isoformExpressT = parseIsoformExpressionTranspose(args[6]);

                        dmap = new DendroHeatmap(tissueTree, isoformTree, isoformExpressT, "Greys", 5, dmapConfig, true, 10);
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
                        const dmapConfig = new DendroHeatmapConfig(window.innerWidth, 150, 0, {top: 30, right: 350, bottom: 200, left: 50}, 12, 10);
                        let tissueTree = args[4].clusters.tissue;
                        dmap = new DendroHeatmap(undefined, tissueTree, junctionExpress, "Reds", 5, dmapConfig, true, 10);
                        dmap.render(ids.root, ids.svg, false, true, top, 5);

                        break;
                    }
                    case "exon": {
                        const dmapConfig = new DendroHeatmapConfig(window.innerWidth, 150, 0, {top: 30, right: 350, bottom: 200, left: 50}, 12, 10);
                        let tissueTree = args[5].clusters.tissue;
                        dmap = new DendroHeatmap(undefined, tissueTree, exonExpress, "Blues", 5, dmapConfig, true, 2);
                        dmap.render(ids.root, ids.svg, false, true, top, 5);

                        break;
                    }
                    default: {
                        throw "Input type is not recognized";
                    }
                }
                $('#spinner').hide();

                // tooltip
                dmap.createTooltip(ids.tooltip);

                // define the gene model and isoform tracks layout dimensions
                const modelConfig = {
                    x: dmap.config.panels.main.x,
                    y: dmap.config.panels.main.h + dmap.config.panels.main.y + 100,
                    w: dmap.config.panels.main.w,
                    h: 100
                };

                const exonH = 20; // TODO: remove hard-coded values
                const isoTrackViewerConfig = {
                    x: modelConfig.x,
                    y: modelConfig.y + modelConfig.h,
                    w: modelConfig.w,
                    h: exonH*isoforms.length
                };

                // extend the SVG height to accommondate the gene model and isoform tracks
                let h = +select(`#${ids.svg}`).attr("height"); // get the current height
                select(`#${ids.svg}`).attr("height", h + modelConfig.h + isoTrackViewerConfig.h);

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

                // customization
                _addColorLegendsForGeneModel(dmap, junctionColorScale, exonColorScale, isoformColorScale);
                _createToolbar(dmap, ids);

                switch(type){
                    case "isoform": {
                        _customizeHeatMap(tissues, geneModel, dmap, isoformTrackViewer, junctionColorScale, exonColorScale, isoformColorScale, junctionExpress, exonExpress, isoformExpress);
                        _customizeIsoformMap(tissues, geneModel, dmap);

                        break;
                    }
                    case "isoformTransposed": {
                        _customizeIsoformTransposedMap(tissues, geneModel, dmap, isoformTrackViewer, junctionColorScale, exonColorScale, isoformColorScale, junctionExpress, exonExpress, isoformExpress);
                        break;
                    }
                    case "junction": {
                        _customizeHeatMap(tissues, geneModel, dmap, isoformTrackViewer, junctionColorScale, exonColorScale, isoformColorScale, junctionExpress, exonExpress, isoformExpress);
                        _customizeJunctionMap(tissues, geneModel, dmap);
                        break;
                    }
                    case "exon": {
                        _customizeHeatMap(tissues, geneModel, dmap, isoformTrackViewer, junctionColorScale, exonColorScale, isoformColorScale, junctionExpress, exonExpress, isoformExpress);
                        _customizeExonMap(tissues, geneModel, dmap);
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
    toolbar.createDownloadButton(ids.buttons.save, ids.svg, `${ids.root}-save.svg`, ids.clone);
}


function _customizeIsoformTransposedMap(tissues, geneModel, dmap, isoTrackViewer, junctionScale, exonScale, isoformScale, junctionData, exonData, isoformData){
    const mapSvg = dmap.visualComponents.svg;
    const tissueDict = tissues.reduce((arr, d)=>{arr[d.tissueId] = d; return arr;},{});
    const tooltip = dmap.tooltip;

    //replace tissue ID with tissue name
    mapSvg.selectAll(".exp-map-xlabel")
        .text((d)=>tissueDict[d]!==undefined?tissueDict[d].tissueName:d)
        .style("cursor", "pointer");

    // add tissue bands
    // TODO: refactor
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
            geneModel.changeTextlabel(mapSvg.select("#geneModel"), tissue);
            geneModel.addData(mapSvg.select("#geneModel"), j, ex, junctionScale, exonScale);

            // isoforms update

            const isoBarScale = scaleLinear()
                .domain([min(isoformData.map(d=>d.value)), max(isoformData.map(d=>d.value))])
                .range([0, -100]);
            const isoData = isoformData.filter((iso)=>iso.tissueId==tissue);
            isoTrackViewer.showData(isoData, isoformScale, isoBarScale);
        });



    // define the isoform heatmap cells' mouse events
    // note: to reference the element inside the function (e.g. d3.select(this)) here we must use a normal anonymous function.
    mapSvg.selectAll(".exp-map-cell")
        .on("mouseover", function(d){
            const selected = select(this); // 'this' refers to the d3 DOM object
            dmap.objects.heatmap.cellMouseover(selected);
            const tissue = tissueDict[d.x] === undefined?d.x:tissueDict[d.x].tissueName; // get tissue name or ID
            tooltip.show(`Tissue: ${tissue}<br/> Isoform: ${d.id}<br/> ${d.unit}: ${parseFloat(d.originalValue.toExponential()).toPrecision(3)}`)
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
        })
        .on("mouseout", function(){
            select(this).classed("highlighted", false);
            mapSvg.selectAll(".exon-curated").classed("highlighted", false);
        });
}



/**
 * customizing the heatmap
 * dependencies: CSS classes from expressMap.css, junctionMap.css
 * @param tissues {List} of GTEx tissue objects with attr: colorHex, tissueId, tissueName
 * @param geneModel {GeneModel} of the collapsed gene model
 * @param dmap {Object} of DendroHeatmap
 * @param jdata {List} of junction expression data objects
 * @param edata {List} of exon expression data objects
 * @param idata {List} of isoform expression data objects
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

    mapSvg.select("#heatmap").selectAll(".leaf-color")
        .data(dmap.objects.heatmap.yScale.domain())
        .enter()
        .append("rect")
        .attr("x", dmap.objects.heatmap.xScale.range()[0] - 10)
        .attr("y", (d)=>dmap.objects.heatmap.yScale(d))
        .attr("width", 5)
        .attr("height", dmap.objects.heatmap.yScale.bandwidth())
        .classed("leaf-color", true)
        .style("fill", (d)=>`#${tissueDict[d].colorHex}`);

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
            const j = junctionData.filter((j)=>j.tissueId==tissue); // junction data
            const ex = exonData.filter((e)=>e.tissueId==tissue); // exon data
            geneModel.changeTextlabel(mapSvg.select("#geneModel"), tissue);
            geneModel.addData(mapSvg.select("#geneModel"), j, ex, junctionScale, exonScale);

            // isoforms update

            const isoBarScale = scaleLinear()
                .domain([min(isoformData.map(d=>d.value)), max(isoformData.map(d=>d.value))])
                .range([0, -100]);
            const isoData = isoformData.filter((iso)=>iso.tissueId==tissue);
            isoTrackViewer.showData(isoData, isoformScale, isoBarScale);
        });
}

/**
 * customizing the isoform heat map
 * @param tissues {List} of the GTEx tissue objects with attr: tissueName
 * @param geneModel {GeneModel}
 * @param dmap {DendroHeatmap}

 * @private
 */
function _customizeIsoformMap(tissues, geneModel, dmap){
    const mapSvg = dmap.visualComponents.svg;
    const tooltip = dmap.tooltip;
    const tissueDict = tissues.reduce((arr, d)=>{arr[d.tissueId] = d; return arr;},{});

    // define the isoform heatmap cells' mouse events
    // note: to reference the element inside the function (e.g. d3.select(this)) here we must use a normal anonymous function.
    mapSvg.selectAll(".exp-map-cell")
        .on("mouseover", function(d){
            const selected = select(this); // 'this' refers to the d3 DOM object
            dmap.objects.heatmap.cellMouseover(selected);
            const tissue = tissueDict[d.y] === undefined?d.y:tissueDict[d.y].tissueName; // get tissue name or ID
            tooltip.show(`Tissue: ${tissue}<br/> Isoform: ${d.id}<br/> ${d.unit}: ${parseFloat(d.originalValue.toExponential()).toPrecision(3)}`)
        })
        .on("mouseout", function(d){
            mapSvg.selectAll("*").classed('highlighted', false);
            tooltip.hide();
        });

    // isoform labels
    mapSvg.selectAll(".exp-map-xlabel")
        .on("mouseover", function(d){
            select(this).classed("highlighted", true);

            // highlight the isoform track
            const id = d.replace(".", "_"); // dot is not an allowable character, so it has been replaced with an underscore
            mapSvg.select(`#${id}`).selectAll(".exon-curated").classed("highlighted", true); // TODO: perhaps change the class name?
        })
        .on("mouseout", function(){
            select(this).classed("highlighted", false);
            mapSvg.selectAll(".exon-curated").classed("highlighted", false);
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
            tooltip.show(`Tissue: ${tissue}<br/> Exon: ${d.exonId}<br/> ${d.unit}: ${parseFloat(d.originalValue.toExponential()).toPrecision(3)}`)
        })
        .on("mouseout", function(d){
            mapSvg.selectAll("*").classed('highlighted', false);
            tooltip.hide();
        });

    // exon labels
    mapSvg.selectAll(".exp-map-xlabel")
        .on("mouseover", function(d){
            select(this).classed("highlighted", true);

            // highlight the exon on the gene model
            const exonNumber = d.split("_")[1];
            mapSvg.selectAll(`.exon${exonNumber}`).classed("highlighted", true);
        })
        .on("mouseout", function(){
            select(this).classed("highlighted", false);
            mapSvg.selectAll(".exon").classed("highlighted", false);
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
            const junc = geneModel.junctions.filter((j)=>j.junctionId == d.x && !j.filtered)[0];
            tooltip.show(`Tissue: ${tissue}<br/> Junction: ${junc.displayName}<br/> ${d.unit}: ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`)
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

function _addColorLegendsForGeneModel(dmap, junctionScale, exonScale, isoformScale){
    const mapSvg = dmap.visualComponents.svg;
    let X = dmap.objects.heatmap.xScale.range()[1] + 50;
    const Y = 30;
    const inc = 50;
    drawColorLegend("Exon read counts per base", mapSvg.select("#geneModel"), exonScale, {x: X, y:Y}, true, 5, 2, {h:20, w:10}, 'v');

    X = X + inc;
    drawColorLegend("Junction read counts", mapSvg.select("#geneModel"), junctionScale, {x: X, y:Y}, true, 5, 10, {h:20, w:10}, 'v');

    // X = X + inc;
    // drawColorLegend("Isoform TPM", mapSvg.select("#geneModel"), isoformScale, {x: X, y:Y}, true, 5, 10, {h:20, w:10}, 'v');

}