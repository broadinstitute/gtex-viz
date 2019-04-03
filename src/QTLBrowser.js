/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

//TODO: code review on setting configurations
// TODO: unify QTL tracks' pvalue scale

"use strict";
import {tsv, json} from "d3-fetch";
import {select, selectAll} from "d3-selection";
import {max} from "d3-array";
import MiniGenomeBrowser from "./modules/MiniGenomeBrowser.js";
import BubbleMap from "./modules/BubbleMap.js";
import Heatmap from "./modules/Heatmap.js";
import HalfMap from "./modules/HalfMap.js";
import {createSvg} from "./modules/utils";

export function render(geneId, par=CONFIG){
    setDimensions(par);

    const promises1 = [
        json(par.urls.queryGene + geneId, {credentials: 'include'}),
        tsv(par.urls.genes)
    ]
    let mainSvg = createSvg(par.id, par.width, par.height, {left:0, top:0});
    Promise.all(promises1)
        .then((queryData)=>{
            let gene = queryData[0].gene[0]; // grab the first gene in the query results

            // fetch neighbor genes including the query gene itself
            let genes = queryData[1].filter((d)=>{ // all genes within the genomic view range
                const lower = gene.tss - CONFIG.genomicWindow;
                const upper = gene.tss + CONFIG.genomicWindow;
                return par.dataFilters.genes(d, gene.chromosome, lower, upper)
            }).map(par.parsers.genes); // genes are filtered by gene types defined in the config object
            genes.sort(par.dataSort.genes);

            console.log(genes);
            let genePosTable = {};
            genes.forEach((g)=>{
                genePosTable[g.gencodeId] = g.start
            });

            const geneStrings = genes.map((g)=>g.gencodeId).join(",");

            const promises2 = ["geneExpression", "geneModel", "eqtls", "sqtls"].map((d)=>{
                if(d == "geneExpression"){
                    const url = par.urls[d] + geneStrings;
                    return json(url, {credentials: 'include'})
                }
                if (d == "geneModel"){
                    const url = par.urls[d] + gene.gencodeId;
                    return json(url, {credentials: 'include'})
                }
                if (d == "eqtls"){
                    const url = par.urls[d] + gene.gencodeId;
                    return json(url, {credentials: 'include'})
                }
                return tsv(par.urls[d])
            });

            Promise.all(promises2)
                .then((args)=> {
                    renderGeneVisualComponents(gene, mainSvg, args.splice(0,2), genes, genePosTable, par);
                    renderVariantVisualComponents(gene, mainSvg, par, args)
                })
                .catch((err)=>{console.error(err)})
        })
        .catch((err)=>{
            console.error(err)
        })

}

/**
 * Calculate and sum the height of the root SVG based on the individual visual panels
 * Calculate and determine the Y position of each individual visual panel in the root SVG
 * @param par
 */
function setDimensions(par=CONFIG){
    par.height = Object.keys(par.panels)
        .reduce((total, panelKey, i)=>{
            let p = par.panels[panelKey];
             // simultaneously calculate the panel's yPos
            p.yPos = total;
            return total + p.height // summing the height
        }, 0);
}

/**
 * Rendering all variant related visualization components
 * TODO: break this function into smaller functions?
 * @param queryGene
 * @param mainSvg
 * @param par
 * @param data
 */
function renderVariantVisualComponents(queryGene, mainSvg, par=CONFIG, data){

    let eqData = data[0];
    let sqData = data[1];

    // parse eQTL position track data
    //-- Collapse eQTLs at each each locus, and report only the best (smallest) p-value.
    let uniqEqtl = {};
    eqData.singleTissueEqtl.forEach((d)=>{
        if (uniqEqtl.hasOwnProperty(d.variantId)){
            // compare p-value, save the eqtl with the smallest p-value
            let temp = uniqEqtl[d.variantId];
            if (parseFloat(temp.pValue) > parseFloat(d.pValue)) {uniqEqtl[d.variantId] = d} // find the smaller p-value
        }
        else {
            uniqEqtl[d.variantId] = d;
        }
    })
    let eqtlFeatures = Object.values(uniqEqtl).map(par.parsers.qtlFeatures);
    eqtlFeatures.sort(par.dataSort.variants);
    let eqtlPanel = par.panels.eqtlTrack;
    eqtlPanel.data = eqtlFeatures;
    console.log(eqtlFeatures)

    // sQTL position track data
    let sqtlFeatures = sqData.map(par.parsers.qtlFeatures);
    sqtlFeatures.sort(par.dataSort.variants);
    let sqtlPanel = par.panels.sqtlTrack;
    sqtlPanel.data = sqtlFeatures;
    console.log(sqtlFeatures)

    // QTL bubble map data
    let qtlMapPanel = par.panels.qtlMap;
    qtlMapPanel.data = [];
    qtlMapPanel.data = qtlMapPanel.data.concat(eqData.singleTissueEqtl.map((d)=>{return par.parsers.qtlBubbles(d, "e")}));
    qtlMapPanel.data = qtlMapPanel.data.concat(sqData.map((d)=>{return par.parsers.qtlBubbles(d, "s")}));

    // QTL tracks rendering
    ////// find the max color value (-log(p-value)) from all QTLs, for creating a shared color scale for all variant tracks
    // let max1 = max(eqtlPanel.data.filter((d)=>isFinite(d.colorValue)).map((d)=>d.colorValue));
    // let max2 = max(sqtlPanel.data.filter((d)=>isFinite(d.colorValue)).map((d)=>d.colorValue));
    // const maxColorValue = max([max1, max2]);
    const maxColorValue = 50; // TODO: define a universal max value for the QTLs, so that it's comparable?
    const eqtlTrackViz = renderFeatureTrack(mainSvg, par.genomicWindow, eqtlPanel, false, true, maxColorValue);
    const sqtlTrackViz = renderFeatureTrack(mainSvg, par.genomicWindow, sqtlPanel, false, true, maxColorValue);

    let bmap = new BubbleMap(qtlMapPanel.data, qtlMapPanel.useLog, qtlMapPanel.logBase, qtlMapPanel.colorScheme);
    bmap.addTooltip(qtlMapPanel.id);
    let bmapG = mainSvg.append("g")
        .attr("id", qtlMapPanel.id)
        .attr("class", "focus")
        .attr("transform", `translate(${qtlMapPanel.margin.left}, ${qtlMapPanel.margin.top + qtlMapPanel.yPos})`);

    // LD map
    tsv(par.urls.ld)
        .then((data)=>{
            // render bubble map
            let bmapInWidth = qtlMapPanel.width-(qtlMapPanel.margin.left + qtlMapPanel.margin.right);
            let bmapInHeight = qtlMapPanel.height-(qtlMapPanel.margin.top + qtlMapPanel.margin.bottom);
            bmap.drawSvg(bmapG, {w:bmapInWidth, h:bmapInHeight, top: 0, left:0});
            bmap.fullDomain = bmap.xScale.domain(); // save the full domain as a new attribute of bmap

             //-- TSS and TES markers
            findVariantsNearGeneStartEnd(queryGene, bmap); // NOTE: bmap.fullDomain is used in this function
            renderGeneStartEndMarkers(bmap, bmapG);

            // LD map: parse the data and call the initial rendering
            _ldMapDataParserHelper(data, bmap, par);
            const ldBrush = renderLdMap(par.ld, bmap); // the rendering function returns a callback function for updating the LD map

            // render the chromosome position axis and zoom brush
            const callback = (left, right, xA, xB)=>{
                // parameters: left and right are screen coordinates, xA and xB are genomic coordinates
                // refresh the x scale's domain() based on the brush
                let focusDomain = bmap.fullDomain.filter((d)=>{
                    let pos = parseInt(d.split("_")[1]);
                    return pos>=xA && pos<=xB
                });
                bmap.renderWithNewDomain(bmapG, focusDomain);

                // refresh the gene's TSS and TES markers on the bubble map
                renderGeneStartEndMarkers(bmap, bmapG);

                // update the LD
                ldBrush();

                // redraw brush lines
                selectAll(".brushLine").remove();
                select(".brush")
                    .append("line")
                    .classed("brushLine", true)
                    .attr("x1", left)
                    .attr("x2", bmap.xScale.range()[0] + qtlMapPanel.margin.left - sqtlPanel.margin.left)
                    .attr("y1", 20)
                    .attr("y2", 60)
                    .style("stroke-width", 1)
                    .style("stroke", "#ababab");
                select(".brush")
                    .append("line")
                    .classed("brushLine", true)
                    .attr("x1", right)
                    .attr("x2", bmap.xScale.range()[1]+ qtlMapPanel.margin.left - sqtlPanel.margin.left)
                    .attr("y1", 20)
                    .attr("y2", 60)
                    .style("stroke-width", 1)
                    .style("stroke", "#ababab")

            };
            let addBrush = true;
            let brushConfig = {
                w: 20,
                h: Math.abs(par.panels.tssTrack.yPos + par.panels.tssTrack.margin.top - (par.panels.sqtlTrack.yPos + par.panels.sqtlTrack.height +20)) // the brush should cover all tracks
            };
            MiniGenomeBrowser.renderAxis(sqtlTrackViz.dom, sqtlTrackViz.scale, sqtlPanel.height + 30, addBrush, callback, brushConfig, sqtlPanel.centerPos); // TODO: remove hard-coded adjustment
        });

}

/**
 * LD map parser
 * This parser may change again when the data is queried from the web service
 * @param data {Object} raw LD data
 * @param bmap {BubbleMap}
 * @param par {config object}
 * @private
 */
function _ldMapDataParserHelper(data, bmap, par=CONFIG){
    let variantLookup = {};
    bmap.xScale.domain().forEach((x)=>{variantLookup[x]=true})
    let ldData = data.map(par.parsers.ld)
        .filter((d)=>{
            return par.dataFilters.ld(d, variantLookup)
        });
    const vList = {};
    ldData.forEach((d)=>{
        vList[d.x] = true;
        vList[d.y] = true;
    });
    let ldConfig = par.ld;
    ldConfig.data = ldData.concat(Object.keys(vList).map((v)=>{
        return {
            x: v,
            y: v,
            value: 1,
            displayValue: "1"
        }
    }));
}

function renderLdMap(config, bmap){
    let ldMap = new HalfMap(config.data, config.cutoff, false, undefined, config.colorScheme, [0,1]);
    ldMap.addTooltip(config.id);
    let ldCanvas = select(`#${config.id}`).append("canvas")
        .attr("id", config.id + "-ld-canvas")
        .attr("width", config.width)
        .attr("height", config.width)
        .style("position", "absolute");
    let ldContext = ldCanvas.node().getContext('2d');
    ldContext.translate(config.margin.left, config.margin.top);
    let ldSvg = createSvg(config.id, config.width, config.width, {top: 0, left:0});
    let ldG = ldSvg.append("g")
        .attr("class", "ld")
        .attr("id", "ldG")
        .attr("transform", `translate(${config.margin.left}, ${config.margin.top})`);
    ldMap.drawColorLegend(ldSvg, {x: config.margin.left, y: 100}, 10, "LD");
    ldG.selectAll("*").remove(); // clear all child nodes in ldG before rendering
    const drawConfig = {w: config.width-(config.margin.left+config.margin.right), top: 0, left: 0}
    ldMap.draw(ldCanvas, ldG, drawConfig, [0, 1], false, undefined, bmap.xScale.domain(), bmap.xScale.domain())

    // update the brush event with interactive LD map
    const ldBrush = ()=>{
        ldG.selectAll("*").remove();
        ldMap.draw(ldCanvas, ldG, drawConfig, [0, 1], false, undefined, bmap.xScale.domain(), bmap.xScale.domain())
    };
    return ldBrush;
}

/**
 * Render the visual components related to genes: GWAS trait heatmap, gene position track
 * @param gene {Object} the anchor gene
 * @param mainSvg {d3 svg} the root svg
 * @param data {List} web service results
 * @param genes {List} a list of gene objects with attr: geneSymbol, strand, start, end, geneType
 * @param genePosTable {Dict} gene TSS indexed by gencodeId
 * @param par {Object} the configuration object of the overall visualization
 */
function renderGeneVisualComponents(gene, mainSvg, data, genes, genePosTable, par = CONFIG){

    // par.panels.geneMap.data = generateRandomMatrix({x:genes.length, y:4, scaleFactor:1}, genes.map((d)=>d.geneSymbol));
    par.panels.geneMap.data = data[0].medianGeneExpression.filter((d)=>genePosTable.hasOwnProperty(d.gencodeId)).map((d)=>{
        d = par.parsers.geneExpression(d);
        d.pos = genePosTable[d.gencodeId]
        return d;
    })

    par.panels.geneMap.data.sort(par.dataSort.geneExpression);
    const heatmapViz = renderGeneHeatmap(gene, mainSvg, par.panels.geneMap);

    par.panels.tssTrack.data = genes;
    const geneTrackViz = renderFeatureTrack(mainSvg, par.genomicWindow, par.panels.tssTrack, false);

    let gModel = data[1].collapsedGeneModelExon.map(par.parsers.geneModel);
    par.panels.geneModelTrack.data = gModel;
    renderFeatureTrack(mainSvg, par.genomicWindow, par.panels.geneModelTrack, true);


    //// draw connecting lines between the GWAS trait heatmap and gene position track
    let geneMapPanel = par.panels.geneMap;
    let tssPanel = par.panels.tssTrack;

    let xAdjust = geneMapPanel.margin.left - tssPanel.margin.left + (heatmapViz.xScale.bandwidth()/2);
    let trackHeight = tssPanel.height - (tssPanel.margin.top + tssPanel.margin.bottom);

    geneTrackViz.svg.selectAll(".connect")
        .data(genes.filter((d)=>heatmapViz.xScale.domain().indexOf(d.geneSymbol)>=0))
        .enter()
        .append('line')
        .attr("class", "connect")
        .attr("x1", (d)=>heatmapViz.xScale(d.geneSymbol) + xAdjust)
        .attr("x2", (d)=>geneTrackViz.scale(d.start))
        .attr("y1", trackHeight/2-20)
        .attr("y2", trackHeight/2)
        .attr("stroke", (d)=>d.geneSymbol==gene.geneSymbol?"red":"#ababab")
        .attr("stroke-width", 0.5);

    geneTrackViz.svg.selectAll(".connect2")
        .data(genes.filter((d)=>heatmapViz.xScale.domain().indexOf(d.geneSymbol)>=0))
        .enter()
        .append('line')
        .attr("class", "connect2")
        .attr("x1", (d)=>heatmapViz.xScale(d.geneSymbol) + xAdjust)
        .attr("x2", (d)=>heatmapViz.xScale(d.geneSymbol) + xAdjust)
        .attr("y1", trackHeight/2-20)
        .attr("y2", (d)=>{
            let adjust = -(geneMapPanel.margin.bottom+tssPanel.margin.top - 10) +(d.geneSymbol.length*heatmapViz.yScale.bandwidth());
            adjust = adjust > -20?-20:adjust;
            return trackHeight/2 + adjust;
        })
        .attr("stroke", (d)=>d.geneSymbol==gene.geneSymbol?"red":"#ababab")
        .attr("stroke-width", 0.5);

    return genes;
}

/**
 * Render the Gene Heatmap
 * @param gene {Object}
 * @param svg {D3 SVG} the root SVG object
 * @param panel {Object} the panel object defined in CONFIG
 * @returns {Heatmap}
 */
function renderGeneHeatmap(gene, svg, panel=CONFIG.panels.geneMap){

    let inWidth = panel.width - (panel.margin.left + panel.margin.right);
    let inHeight = panel.height - (panel.margin.top + panel.margin.bottom);
    if (inWidth * inHeight <= 0) throw "The inner height and width of the GWAS heatmap panel must be positive values. Check the height and margin configuration of this panel"
    let mapG = svg.append("g")
        .attr("id", panel.id)
        .attr("transform", `translate(${panel.margin.left}, ${panel.margin.top})`);
    let tooltipId = `${panel.id}Tooltip`;

    let hViz = new Heatmap(panel.data, false, undefined, panel.colorScheme, panel.cornerRadius, tooltipId);
    hViz.draw(mapG, {w:inWidth, h:inHeight}, panel.columnLabel.angle, false, panel.columnLabel.adjust);
    hViz.drawColorLegend(mapG, {x: 20, y:-20}, 5);

    // CUSTOMIZATION: highlight the anchor gene
    mapG.selectAll(".exp-map-xlabel")
        .attr('fill', (d)=>d==gene.geneSymbol?"red":"#000000");

    hViz.svg = mapG;
    return hViz

}

/**
 * Render a feature track
 * @param svg {D3 SVG}
 * @param window {Numeric} genomic window in view (one-sided)
 * @param panel {Object} of the panel, by default, it's defined in CONFIG
 * @param showWidth {Boolean} render the feature's width
 * @param useColorScale {Boolean} whether the color of the features should use a color scale
 * @param maxColorValue {Numnber} defines the maximum color value when useColorScale is true
 * @returns {MiniGenomeBrowser}
 */
function renderFeatureTrack(svg, window, panel=CONFIG.panels.tssTrack, showWidth, useColorScale=false, maxColorValue=undefined){
    // preparation for the plot
    let inWidth = panel.width - (panel.margin.left + panel.margin.right);
    let inHeight = panel.height - (panel.margin.top + panel.margin.bottom);
    let trackG = svg.append("g")
        .attr("id", panel.id)
        .attr("transform", `translate(${panel.margin.left}, ${panel.margin.top + panel.yPos})`);

    let featureViz = new MiniGenomeBrowser(panel.data, panel.centerPos, window);
    featureViz.render(
        trackG,
        inWidth,
        inHeight,
        showWidth,
        panel.label,
        panel.color.background,
        panel.color.feature,
        useColorScale,
        maxColorValue
    );
    featureViz.svg = trackG;
    return featureViz

}

function generateRandomMatrix(par={x:20, y:20, scaleFactor:1}, cols = []){
    let range = n => Array.from(Array(n).keys());
    let X = cols === undefined?range(par.x):cols; // generates a 1-based list.
    let Y = range(par.y);
    let data = [];
    X.forEach((x)=>{
        x = cols===undefined?'col ' + x.toString():x;
        Y.forEach((y)=>{
            y = 'trait ' + y.toString();
            let v = Math.random()*par.scaleFactor;
            let dataPoint = {
                x: x,
                y: y,
                value: v,
                displayValue: v.toPrecision(3)
            };
            data.push(dataPoint);
        })
    });
    return data;
}

/**
 * Find the closest left-side variant of the gene start and end sites (tss and tes)
 * This function creates two new attributes, tss and tes, for bmap
 * @param gene {Object} that has attributes start and end
 * @param bmap {BubbleMap}
 */
function findVariantsNearGeneStartEnd(gene, bmap) {
    let tss = gene.strand == '+' ? gene.start : gene.end;
    let tes = gene.strand == '+' ? gene.end : gene.start;
    let variants = bmap.fullDomain;
    const findLeftSideNearestNeighborVariant = (site) => {
        return variants.filter((d, i) => {
            // if the variant position is the site position
            let pos = parseFloat(d.split('_')[1]); // assumption: the variant ID has the genomic location
            if (pos === site) return true;

            // else find where the site is located
            // first, get the neighbor variant
            if (variants[i + 1] === undefined) return false;
            let next = parseFloat(variants[i + 1].split('_')[1]) || undefined;
            return (pos - site) * (next - site) < 0; // rationale: the value would be < 0 when the site is located between two variants.
        })
    };

    let tssVariant = findLeftSideNearestNeighborVariant(tss);
    let tesVariant = findLeftSideNearestNeighborVariant(tes);
    bmap.tss = tssVariant[0]; // bmap.tss stores the closest left-side variant of the start site
    bmap.tes = tesVariant[0]; // bmap.tes stores the closest left-side variant of the end site
}

/**
 * Render the TSS and TES of the Gene if applicable
 * @param bmap {BubbleMap}
 * @param bmapSvg {D3} the SVG object of the bubble map
 */
function renderGeneStartEndMarkers(bmap, dom){
    // rendering TSS

    select('#siteMarkers').selectAll("*").remove(); // clear previously rendered markers
    select('#siteMarkers').remove();
    let g = dom.append('g')
        .attr('id', 'siteMarkers');
    if (bmap.tss && bmap.xScale(bmap.tss)){
         g.append('line')
        .attr('x1', bmap.xScale(bmap.tss) + bmap.xScale.bandwidth()/2)
        .attr('x2', bmap.xScale(bmap.tss) + bmap.xScale.bandwidth()/2)
        .attr('y1', -10)
        .attr('y2', bmap.yScale.range()[1])
        .style('stroke', '#94a8b8')
        .style('stroke-width', 2);
         g.append('text')
             .text('TSS')
             .attr('x', bmap.xScale(bmap.tss))
             .attr('y', -12)
             .attr('text-anchor', 'center')
             .style('font-size', "12px")
    }

    if (bmap.tes && bmap.xScale(bmap.tes)){
        g.append('line')
        .attr('x1', bmap.xScale(bmap.tes) + bmap.xScale.bandwidth()/2)
        .attr('x2', bmap.xScale(bmap.tes) + bmap.xScale.bandwidth()/2)
        .attr('y1', -10)
        .attr('y2', bmap.yScale.range()[1])
        .style('stroke', '#748797')
        .style('stroke-width', 2);
        g.append('text')
             .text('TES')
             .attr('x', bmap.xScale(bmap.tes))
             .attr('y', -12)
             .attr('text-anchor', 'center')
             .style('font-size', "12px")
    }

}

/*********************/
const GlobalWidth = window.innerWidth;
const AnchorPosition = 66546395;
const AnchorChr = 'chr11'
const host = "https://dev.gtexportal.org/rest/v1/";
const CONFIG = {
    id: "qtl-browser",
    ldId: "ld-browser",
    width: GlobalWidth,
    height: null, // should be dynamically calculated
    genomicWindow: 1e6,
    urls: {
        queryGene: host + 'reference/gene?format=json&gencodeVersion=v26&genomeBuild=GRCh38%2Fhg38&geneId=',
        genes: "../tempData/V8.genes.csv",
        geneExpression: host + 'expression/medianGeneExpression?datasetId=gtex_v8&hcluster=true&pageSize=10000&gencodeId=',
        geneModel:  host + 'dataset/collapsedGeneModelExon?datasetId=gtex_v8&gencodeId=', // should use final collapsed gene model instead. correct this when switching to query data from the web service
        eqtls: host + 'association/singleTissueEqtl?format=json&datasetId=gtex_v8&gencodeId=',
        sqtls:  "/tempData/ACTN3.sqtls.csv",
        ld: "/tempData/ACTN3.ld.csv"
    },
    parsers: {
        genes: (d)=>{
            d.start = parseInt(d.start);
            d.end = parseInt(d.end);
            d.pos = parseInt(d.tss);
            d.featureLabel = d.geneSymbol;
            d.featureType = d.geneType;
            return d;
        },
        geneModel: (d)=>{
            d.start = parseInt(d.start);
            d.end = parseInt(d.end);
            d.pos = d.start;
            d.featureLabel = d.exonId;
            return d;
        },
        geneExpression: (d)=>{
            d.x = d.geneSymbol
            d.y = d.tissueSiteDetailId
            d.value = d.median
            d.displayValue = d.value
            return d;
        },
        qtlFeatures: (d)=>{
            // let id = d.variantId;
            d.chr = d.chromosome;
            d.start = parseInt(d.pos);
            d.end = d.start;
            d.pos = parseInt(d.pos);
            d.featureType = "variant";
            d.featureLabel = d.snpId||d.variantId;
            d.colorValue = -Math.log10(parseFloat(d.pValue));
            return d;
        },
        qtlBubbles: (d, dataType)=>{
            d.x = d.variantId;
            d.y = d.tissueSiteDetailId + "-" + dataType;
            d.value = parseFloat(d.nes);
            d.r = -Math.log10(parseFloat(d.pValue));
            return d;
        },
        ld: (d)=>{
            d.x = d.snpId1;
            d.y = d.snpId2;
            d.value = parseFloat(d.rSquared);
            d.displayValue = parseFloat(d.value).toPrecision(3);
            return d;
        }
    },
    dataFilters: {
        genes: (d) => {
            let lower = AnchorPosition - CONFIG.genomicWindow;
            let upper = AnchorPosition + CONFIG.genomicWindow;
            if (d.chromosome==AnchorChr && d.tss>=lower && d.tss<=upper){
                return d.geneType == "protein coding" || d.geneType == "lincRNA"
            } else {
                return false
            }
        },
        ld: (d, lookupTable)=>{
            return lookupTable[d.x] && lookupTable[d.y];
        }
    },
    dataSort: {
        genes: (a, b) => {
            return parseInt(a.start) - parseInt(b.start)
        },
        geneExpression: (a, b) => {
            return parseInt(a.pos) - parseInt(b.pos)
        },
        variants: (a, b) => {
            return parseInt(a.pos) - parseInt(b.pos)
        },
    },
    panels: {
        geneMap: {
            id: 'gene-map',
            data: null,
            useLog: false,
            logBase: null,
            margin: {
                top: 40, // provide enough space for the color legend
                right: 100, // provide enough space for the row labels
                bottom: 100, // provide enough space for the column labels
                left: 80
            },
            width: GlobalWidth,
            height: 500, // outer height: this includes top and bottom margins + inner height
            colorScheme: "Greys",
            cornerRadius: 2,
            columnLabel: {
                angle: 90,
                adjust: 10
            },
            rowLabel: {
                width: 100
            }
        },
        tssTrack: {
            id: 'tss-track',
            label: 'TSS location',
            data: null,
            centerPos: AnchorPosition,
            yPos: null, // where the panel should be placed to be calculated based on the panel layout
            margin: {
                top: 50,
                right: 50,
                bottom: 0,
                left: 80
            },
            width: GlobalWidth,
            height: 70, // outer height=inner height + top margin + bottom margin
            color: {
                background: "#ffffff",
                feature: "#ababab"
            }
        },
        geneModelTrack: {
            id: 'gene-model-track',
            label: "ACTN3 exons",
            centerPos: AnchorPosition,
            yPos: null,
            margin: {
                top: 0,
                right: 50,
                bottom: 10,
                left: 80
            },
            width: GlobalWidth,
            height: 30,
            color: {
                background: '#ffffff',
                feature: "#910807"
            }
        }
        ,
        eqtlTrack: {
            id: 'eqtl-track',
            label: 'ACTN3 eQTLs',
            data: null,
            centerPos: AnchorPosition,
            yPos: null,
            margin: {
                top: 0,
                right: 50,
                bottom: 0,
                left: 80
            },
            width: GlobalWidth,
            height: 20, // outer height. outer height=inner height + top margin + bottom margin.
            color: {
                background: "#ffffff",
                feature: "#ababab"
            }

        },

        sqtlTrack: {
            id: 'sqtl-track',
            label: 'ACTN3 sQTLs',
            data: null,
            centerPos: AnchorPosition,
            yPos: null,
            margin: {
                top: 0,
                right: 50,
                bottom: 0,
                left: 80
            },
            width: GlobalWidth,
            height: 20, // outer height. outer height=inner height + top margin + bottom margin.
            color: {
                background: "#ffffff",
                feature: "#ababab"
            }
        },

        qtlMap: {
            id: 'qtl-map', // the bubble heat map of QTLs
            width: GlobalWidth,
            data: null,
            yPos: null,
            margin: {
                top: 100, // provide space for the genome position scale
                right: 50,
                bottom: 120, // provide space for the column labels
                left: 200
            },
            height: 500,
            colorScheme: "RdBu",
            colorScaleDomain: [-1, 1],
            useLog: false,
            logBase: null,
            label: {
                column: {
                    show: true,
                    angle: 90,
                    adjust: 10,
                    location: 'bottom',
                    textAlign: 'left'
                },
                row: {
                    show: true,
                    width: 150,
                    angle: 0,
                    adjust: 0,
                    location: 'left',
                    textAlign: 'right'
                }
            }
        }
    },
    ld: { // LD configuration is separate from the panels because it's in its own DIV and is rendered using canvas.
        id: "ld-browser",
        data: [],
        cutoff: 0.1,
        width: GlobalWidth,
        margin: {
            top: 10,
            right: 50,
            bottom: 0,
            left: 200
        },
        colorScheme: "Greys"
    }
};

