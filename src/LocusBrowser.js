/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

/**
 * TODO:
 * BarMap: hide column labels when bar width is too small
 * BarMap: row filtering
 * BarMap: auto adjustment of row height--when there are too few or too many rows, set a fix row heihgt?
 * BarMap: custom tooltip
 * BarMap: bar click events
 * BarMap: move styling to css
 */
"use strict";
import {tsv, json} from "d3-fetch";
import {select, selectAll} from "d3-selection";
import {max} from "d3-array";
import {axisBottom, axisLeft} from "d3-axis";
import {scaleBand, scaleLinear} from "d3-scale";
import {symbol, symbolDiamond, symbolSquare} from "d3-shape";

import MiniGenomeBrowser from "./modules/MiniGenomeBrowser.js";
import BubbleMap from "./modules/BubbleMap.js";
import BarMap from "./modules/BarMap.js";
import Heatmap from "./modules/Heatmap.js";
import HalfMap from "./modules/HalfMap.js";
import {createSvg} from "./modules/utils";

/**
 * Store the data for the visualization
 * @type {{queryGene: undefined, genes: undefined, geneModel: undefined, sqtl: undefined, eqtl: undefined}}
 */
export let data = {
    queryGene: undefined,
    genes: undefined,
    geneModel: undefined,
    sqtl: undefined,
    eqtl: undefined,
    gwasToGene: undefined,
    gwasImputed: undefined,
    vepDict: undefined
};

/**
 * Data URLs or file sources
 * @type {{queryGene: string, genes: string, geneExpression: string, geneModel: string, eqtls: string, sqtls: string, ld: string}}
 */
const host = "https://dev.gtexportal.org/rest/v1/";

export let dataUrls = {
    queryGene: host + 'reference/gene?format=json&gencodeVersion=v26&genomeBuild=GRCh38%2Fhg38&geneId=',
    genes: "../tempData/V8.genes.csv",
    geneExpression: host + 'expression/medianGeneExpression?datasetId=gtex_v8&hcluster=true&pageSize=10000&gencodeId=',
    geneModel:  host + 'dataset/collapsedGeneModelExon?datasetId=gtex_v8&gencodeId=', // should use final collapsed gene model instead. correct this when switching to query data from the web service
    gwasToGene: "../tempData/GWASVar2Gene_r2_08_sample_file.chr11.tsv",
    gwasImputed: "../tempData/gwas-traits-v8/imputed_IBD.EUR.Crohns_Disease.chr11.txt",
    eqtls: host + 'association/singleTissueEqtl?format=json&datasetId=gtex_v8&gencodeId=',
    sqtls:  host + 'association/singleTissueSqtl?format=json&datasetId=gtex_v8&gencodeId=',
    ld: host + 'dataset/ld?format=json&datasetId=gtex_v8&gencodeId=',
    vep: "../tempData/chromosome11.sample.vep.txt" // currently only support VEP data for a small region of genes on Chr11
};

/**
 * Default data parsers
 * @type {{genes: (function(*): *), geneModel: (function(*): *), geneExpression: (function(*): *), qtlFeatures: (function(*): *), qtlBubbles: (function(*, *): *), ld: (function(*): {x: *, y: *, value: *, displayValue: string})}}
 */
export let dataParsers = {
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
        d.y = dataType + "-" + d.tissueSiteDetailId;
        d.value = parseFloat(d.nes);
        d.r = -Math.log10(parseFloat(d.pValue));
        d.dataType=dataType;
        return d;
    },
    ld: (d)=>{
        let vars = d[0].split(",");
        return {
            x: vars[0],
            y: vars[1],
            value: d[1],
            displayValue: d[1].toPrecision(3)
        }
    },
    gwas: (d)=>{
        return {
            x: d.panel_variant_id,
            y: "GWAS Crohn's disease", // TODO: remove hard-coded values
            value:  parseFloat(parseFloat(d.effect_size).toPrecision(3)),
            r: -Math.log10(parseFloat(d.pvalue)),
            dataType: "GWAS"
        }
    }
};

/** Default filters for the data */
export const dataFilters = {
    genes: (d, gene, window) => {
         const lower = gene.tss - window; // lower bound
         const upper = gene.tss + window;
        if (d.chromosome==gene.chromosome && d.tss>=lower && d.tss<=upper){
            return d.geneType == "protein coding" || d.geneType == "lincRNA"
        } else {
            return false
        }
    },
    qtls: (d, gene, window) =>{
        const lower = gene.tss - window;
        const upper = gene.tss + window;
        return d.pos>=lower && d.pos<=upper;
    },
    gwas: (d, tss)=>{
        let pos = parseInt(d.panel_variant_id.split("_")[1]);
        return pos<=tss + 1e6 && pos>=tss - 1e6;
    },
    vep: (d, gencodeId)=>{
        let id = gencodeId.split(".")[0];
        return d.gencodeId==id;
    }
};

/** Default data sort functions */
export const dataSort = {
    genes: (a, b) => {
        return parseInt(a.tss) - parseInt(b.tss)
    },
    geneExpression: (a, b) => {
        return parseInt(a.pos) - parseInt(b.pos)
    },
    variants: (a, b) => {
        return parseInt(a.pos) - parseInt(b.pos)
    },
};

/**
 * Render function
 * @param geneId {String} gene ID
 * @param par {Object} visualization config with required attributes
 */
export function render(geneId, par=DefaultConfig){
    _setDimensions(par);
    const promises1 = [
        json(par.urls.queryGene + geneId, {credentials: 'include'}),
        tsv(par.urls.genes),
        tsv(par.urls.gwasToGene)
    ];
    par.svg = createSvg(par.id, par.width, par.height, {left:0, top:0});
    Promise.all(promises1)
        .then((queryData)=>{
            if (queryData[0].gene.length > 1) console.warn("More than one gene matching the query:", geneId);
            par.data.queryGene = queryData[0].gene[0]; // grab the first gene in the query results
            par.data.genes = _findNeighbors(queryData[1], par)
            par.data.gwasToGene = _mapGenesToTraits(queryData[2], par);

            const promises2 = ["geneModel", "eqtls", "sqtls", "vep", "gwasImputed"].map((d)=>{
                if (d == "vep" || d=="gwasImputed"){
                    return tsv(par.urls[d])
                }
                const url = par.urls[d] + par.data.queryGene.gencodeId;
                return json(url, {credentials: 'include'})
            });

            const promises3 = ["ld"].map((d)=>{
                 const url = par.urls[d] + par.data.queryGene.gencodeId;
                return json(url, {credentials: 'include'})
            })

            Promise.all(promises2)
                .then((args)=> {
                    par.data.geneModel = args[0];
                    par.data.eqtl = args[1];
                    par.data.sqtl = args[2];
                    par.data.vepDict = args[3]===undefined?undefined:args[3].filter((d)=>{
                        return par.dataFilters.vep(d, par.data.queryGene.gencodeId);
                    }).reduce((acc, d)=>{
                        acc[d.variant] = d.vep;
                        return acc;
                    }, {});
                    par.data.gwasDict = args[4].filter((d)=>{
                        return par.dataFilters.gwas(d, par.data.queryGene.tss)
                    }).map(par.parsers.gwas)
                    .reduce((acc, d)=>{
                        acc[d.x] = d;
                        return acc;
                    }, {});
                    par.data.gwasImputed = args[4].filter((d)=>{
                        return par.dataFilters.gwas(d, par.data.queryGene.tss)
                    }).map(par.parsers.gwas);

                    renderGeneVisualComponents(par);
                    // QTL tracks
                    const qtlData = {
                        eqtl: par.data.eqtl.singleTissueEqtl,
                        sqtl: par.data.sqtl.singleTissueSqtl,
                        gwasImputed: par.data.gwasImputed
                    };
                    const sqtlTrackViz = _renderVariantTracks(par, qtlData);
                    Promise.all(promises3) // fetch LD data last so that partial visualization components are visible right away
                        .then((ld)=>{
                            par.data.ld = ld
                            renderGEV(par, qtlData, sqtlTrackViz);
                        });
                })
        })
        .catch((err)=>{
            console.error(err)
        })
}

function _mapGenesToTraits(data, par){
    let neighbors = par.data.genes.reduce((arr, d)=>{
        arr[d.geneSymbol] = d;
        return arr;
    }, {})
    let g2t = data.filter((d)=>neighbors.hasOwnProperty(d.eGene_name))
        .reduce((arr, d)=>{
            if (!arr.hasOwnProperty(d.GWAS_trait)) arr[d.GWAS_trait] = {};
            if (!arr[d.GWAS_trait].hasOwnProperty(d.eGene_name)) arr[d.GWAS_trait][d.eGene_name] = d.GWAS_p_value_mlog;
            else {
                arr[d.GWAS_trait][d.eGene_name] = arr[d.GWAS_trait][d.eGene_name]>d.GWAS_p_value_mlog?d.GWAS_p_value_mlog:arr[d.GWAS_trait][d.eGene_name];
            }
            return arr;
        },{})
    let dataReady = [];
    console.log(g2t)
    Object.keys(g2t).forEach((trait)=>{
        Object.keys(neighbors).forEach((gSymbol)=>{
            dataReady.push({
                x: gSymbol,
                y: trait,
                value: g2t[trait][gSymbol]?g2t[trait][gSymbol]:0,
                displayValue: g2t[trait][gSymbol]?g2t[trait][gSymbol]:0,
                pos: neighbors[gSymbol].pos
            })
        })
    });
    return dataReady;
}

/**
 * Find all neighbor genes of the query gene
 * Only searching for coding and lincRNA genes are
 * @param data {List} of gene objects
 * @param par {Object} of the viz config with required attributes: dataFilters.genes, data.queryGene, genomicWindow...
 * @returns {List} of neighbor gene objects (including the query gene itself
 * @private
 */
function _findNeighbors(data, par){
    // fetch neighbor genes including the query gene itself
    let genes = data.filter((d)=>{ // all genes within the genomic view range
        return par.dataFilters.genes(d, par.data.queryGene, par.genomicWindow)
    }).map(par.parsers.genes); // genes are filtered by gene types defined in the config object
    genes.sort(par.dataSort.genes);
    return genes
}

/**
 * Calculate and sum the height of the root SVG based on the individual visual panels
 * Calculate and determine the Y position of each individual visual panel in the root SVG
 * @param par
 */
function _setDimensions(par=DefaultConfig){
    par.height = Object.keys(par.panels)
        .reduce((total, panelKey, i)=>{
            let p = par.panels[panelKey];
             // simultaneously calculate the panel's yPos
            p.yPos = total;
            return total + p.height // summing the height
        }, 0);
}

/**
 * Define UI mouse events
 * @param geneId
 * @param par
 */
export function setUIEvents(geneId, par){
    select("#zoom-plus")
        .style("cursor", "pointer")
        .on("click", ()=>{
            par.genomicWindow = par.genomicWindow <= 5e4?5e4:par.genomicWindow/2;
            // console.log(par.genomicWindow)
            rerender(par)
        });
    select("#zoom-minus")
        .style("cursor", "pointer")
        .on("click", ()=>{
            par.genomicWindow = par.genomicWindow >= 1e6?1e6:par.genomicWindow*2;
            rerender(par)
        });
    select("#zoom-reset")
        .style("cursor", "pointer")
        .on("click", ()=>{
            par.genomicWindow = 1e6;
            console.log(par.genomicWindow)

            rerender(par)
        })
    select("#zoom-size")
        .text(`genomic range: ${(2*par.genomicWindow).toLocaleString()} bases`)
}

/**
 * Re-render the visualization when the genomic window range is changed
 * @param par {Object} visualization config
 */
function rerender(par){
    // clear all visualizations
    Object.keys(par.panels).forEach((k)=>{
        console.log(k)
        let panel = par.panels[k]
        if (panel.id == "qtl-map") return;
        select(`#${panel.id}`).remove();
    })
    select("#zoom-size").text(`genomic range: ${(2*par.genomicWindow).toLocaleString()} bases`)
    renderGeneVisualComponents(par);
    let sqtlTrackViz = _renderVariantTracks(par);
    _createBrush(par.data.queryGene, sqtlTrackViz, par.bmap, par, par.ldBrush);
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
function renderGeneVisualComponents(par = DefaultConfig){
    // render the gene map as a heat map
    const heatmapViz = renderGeneHeatmap(par);

    let genes = par.data.genes;
    let gene = par.data.queryGene;
    let mainSvg = par.svg;

    // build a genePosTable

    let genePosTable = {};
    genes.forEach((g)=>{
        genePosTable[g.gencodeId] = g.tss
    });

    // render the gene list
    // const geneLabelScale = _renderGeneLabels(par);
    let geneLabelScale = heatmapViz.xScale;
    selectAll(".exp-map-xlabel").on("click", (d)=>{
            // reset everything
            select("#" + par.id).selectAll("*").remove();
            select("#"+par.ldId).selectAll("*").remove();
            par.data = data;
            par.panels.eqtlTrack.data = null;
            par.panels.sqtlTrack.data = null;
            par.panels.geneMap.data = null;
            par.ld.data = [];
            par.genomicWindow = 1e6;
            select("#zoom-size").text(`genomic range: ${(2*par.genomicWindow).toLocaleString()} bases`)
            render(d, par);
        })

    // render gene related genomic tracks
    const trackData = {
        tssTrack: genes,
        exonTrack: par.data.geneModel.collapsedGeneModelExon
    };
    const tssTrackViz = _renderGeneTracks(gene, mainSvg, par, trackData);

    //// visual customization: draw connecting lines between the gene heatmap column labels and tss positions on the tss track
    let geneMapPanel = par.panels.geneMap;
    let tssPanel = par.panels.tssTrack;

    let xAdjust = geneMapPanel.margin.left - tssPanel.margin.left + (geneLabelScale.bandwidth()/2);
    let trackHeight = tssPanel.height - (tssPanel.margin.top + tssPanel.margin.bottom);

    tssTrackViz.svg.selectAll(".connect")
        .data(genes.filter((d)=>geneLabelScale.domain().indexOf(d.geneSymbol)>=0))
        .enter()
        .append('line')
        .attr("class", "connect")
        .attr("x1", (d)=>geneLabelScale(d.geneSymbol) + xAdjust)
        .attr("x2", (d)=>tssTrackViz.scale(d.tss))
        .attr("y1", trackHeight/2-20)
        .attr("y2", trackHeight/2)
        .attr("stroke", (d)=>d.geneSymbol==gene.geneSymbol?"red":"#ababab")
        .attr("stroke-width", 0.5);

    tssTrackViz.svg.selectAll(".connect2")
        .data(genes.filter((d)=>geneLabelScale.domain().indexOf(d.geneSymbol)>=0))
        .enter()
        .append('line')
        .attr("class", "connect2")
        .attr("x1", (d)=>geneLabelScale(d.geneSymbol) + xAdjust)
        .attr("x2", (d)=>geneLabelScale(d.geneSymbol) + xAdjust)
        .attr("y1", trackHeight/2-20)
        .attr("y2", trackHeight/2-50)
        .attr("stroke", (d)=>d.geneSymbol==gene.geneSymbol?"red":"#ababab")
        .attr("stroke-width", 0.5);

    return genes;
}

/**
 * Rendering the list of gene labels using a scale
 * Note: This function is only used when the gene data table (heat map) is not displayed,
 * @param par {Object} visualization config
 * @returns {D3 scale object} of the gene labels
 */
function _renderGeneLabels(par){
    let queryGene = par.data.queryGene;
    let mainSvg = par.svg;
    let panel = par.panels.geneMap;
    let inWidth = panel.width - (panel.margin.left + panel.margin.right);
    let inHeight = panel.height - (panel.margin.top + panel.margin.bottom);
    if (inWidth * inHeight <= 0) throw "The inner height and width of the GWAS heatmap panel must both be positive values. Check the height and margin configuration of this panel"

    let xList = _findNeighbors(par.data.genes, par);
    let scale = scaleBand()
        .domain(xList.map((d)=>d.geneSymbol))
        .range([0, inWidth])
        .padding(.05);
    let axis = axisBottom(scale).tickSize(0);

    // render the text labels
    const axisG = mainSvg.append("g").attr("id", panel.id);
    axisG.attr("transform", `translate(${panel.margin.left}, ${panel.margin.top + inHeight})`)
        .call(axis)
        .selectAll("text")
        .attr("y", 0)
        .attr("x", 0)
        .attr("dy", ".35em")
        .attr("transform", `rotate(-90)`)
        .style("text-anchor", "start")
        .style("color", (d)=>d==queryGene.geneSymbol?"red":"black")
    axisG.select(".domain").remove(); // remove the axis line

    // define the axis ticks click events
    axisG.selectAll(".tick")
        .style("cursor", "pointer")
        .on("click", (d)=>{
            // reset everything
            select("#" + par.id).selectAll("*").remove();
            select("#"+par.ldId).selectAll("*").remove();
            par.data = data;
            par.panels.eqtlTrack.data = null;
            par.panels.sqtlTrack.data = null;
            par.ld.data = [];
            par.genomicWindow = 1e6;
            select("#zoom-size").text(`genomic range: ${(2*par.genomicWindow).toLocaleString()} bases`)
            render(d, par);
        })

    return scale;

}

/**
 * Render gene based genomic tracks: tss, exon
 * @param gene {Object} the query gene
 * @param svg {D3 SVG} the root SVG object
 * @param par {Object} the viz CONFIG
 * @param data {Dictionary} data of each gene-based track
 * @returns {MiniGenomeBrowser} of the tss track
 */
function _renderGeneTracks(gene, svg, par=DefaultConfig, data){

    // tss track
    let tssTrack = par.panels.tssTrack;
    tssTrack.data = data.tssTrack;
    const tssTrackViz = renderFeatureTrack(gene.tss, svg, par.genomicWindow, tssTrack, false);

    // gene model (exon) track
    let modelParser = par.parsers.geneModel;
    let gModel = data.exonTrack.map(modelParser);
    let exonTrack = par.panels.geneModelTrack;
    exonTrack.data = gModel;
    renderFeatureTrack(gene.tss, svg, par.genomicWindow, exonTrack, true);

    return tssTrackViz
}

/**
 * Rendering variant related visualization components in zoom view
 * @param queryGene
 * @param mainSvg
 * @param par
 * @param data
 */
function renderGEV(par=DefaultConfig, qtlData, sqtlTrackViz, mapType="bars"){

    let bmap = undefined;
    // LD map: parse the data and call the initial rendering
    if (par.ld.data.length == 0) _ldMapDataParserHelper(par);

    switch(mapType){
        case "bubbles":
            bmap = _renderQtlBubbleMap(par, qtlData);
            break;
        case "bars":
            bmap = _renderQtlBarMap(par, qtlData);
            break;
        default:
            console.error("unrecognized type")
    }
    par.ldBrush = _renderLdMap(par.ld, bmap); // the rendering function returns a callback function for updating the LD map
    // initial rendering components
    let dim = {
        w:Math.abs(bmap.xScale.range()[1]-bmap.xScale.range()[0]),
        h:Math.abs(bmap.yScale.range()[1]-bmap.yScale.range()[0]),
        top: 0,
        left:0
    };
    bmap.drawSvg(bmap.svg, dim, true); // initialize bubble heat map
    _renderGeneStartEndMarkers(bmap); // initialize tss and tes markers
    _createBrush(par.data.queryGene, sqtlTrackViz, bmap, par, par.ldBrush);
    par.bmap = bmap;
}


function _renderQtlMapHelper(par=DefaultConfig, qtlData){
    let qtlMapPanel = par.panels.qtlMap;
    let parser = par.parsers.qtlBubbles;
    qtlMapPanel.data = qtlData.gwasImputed;
    qtlMapPanel.data = qtlMapPanel.data.concat(qtlData.eqtl.map((d)=>{return parser(d, "eQTL")}));
    qtlMapPanel.data = qtlMapPanel.data.concat(qtlData.sqtl.map((d)=>{return parser(d, "sQTL")}));
    return qtlMapPanel;
}

function _renderQtlBarMap(par=DefaultConfig, qtlData){
    // TODO: refactoring
    let qtlMapPanel = _renderQtlMapHelper(par, qtlData);
    let bmapInWidth = qtlMapPanel.width-(qtlMapPanel.margin.left + qtlMapPanel.margin.right);
    let bmapInHeight = qtlMapPanel.height-(qtlMapPanel.margin.top + qtlMapPanel.margin.bottom);

    let bmap = new BarMap(qtlMapPanel.data, qtlMapPanel.colorScheme);
    bmap.svg = par.svg.append("g") // TODO: refactoring?
        .attr("id", qtlMapPanel.id)
        .attr("class", "focus")
        .attr("transform", `translate(${qtlMapPanel.margin.left}, ${qtlMapPanel.margin.top + qtlMapPanel.yPos})`);

    bmap.setScales({width:bmapInWidth, height:bmapInHeight, top: 0, left:0}, [-0.75, 0.75]); // hard setting for the color value range
    bmap.addTooltip("locus-browser", "locus-browser");
    bmap.fullDomain = bmap.xScale.domain(); // save initial x domain as the full domain in bmap

     //-- TSS and TES markers
    let gene = par.data.queryGene;
    _findVariantsClosestToGeneStartEnd(gene, bmap); // NOTE: bmap.fullDomain is required in this function and bmap.tss, bmap.tes are created by this function

    return bmap;
}

/**
 * Render QTL (variant)-based genomic tracks: eQTL, sQTL
 * @param gene {Object} the query gene
 * @param svg {D3} the root SVG
 * @param par {Object} the config of the visualization
 * @param trackData {Dictionary} QTL data
 * @returns {MiniGenomeBrowser} sQTL's track object (or the object to apply the brush)
 */
function _renderQtlBubbleMap(par=DefaultConfig, qtlData){
    let gene = par.data.queryGene;
    let svg = par.svg;
    let qtlMapPanel = _renderQtlMapHelper(par, qtlData);
    // prepare bubble map
    let bmap = new BubbleMap(qtlMapPanel.data, qtlMapPanel.useLog, qtlMapPanel.logBase, qtlMapPanel.colorScheme);
    let bmapG = svg.append("g")
        .attr("id", qtlMapPanel.id)
        .attr("class", "focus")
        .attr("transform", `translate(${qtlMapPanel.margin.left}, ${qtlMapPanel.margin.top + qtlMapPanel.yPos})`);

    let bmapInWidth = qtlMapPanel.width-(qtlMapPanel.margin.left + qtlMapPanel.margin.right);
    let bmapInHeight = qtlMapPanel.height-(qtlMapPanel.margin.top + qtlMapPanel.margin.bottom);
    bmap.setScales({w:bmapInWidth, h:bmapInHeight, top: 0, left:0}, [-0.75, 0.75]); // hard setting for the color value range
    bmap.drawColorLegend(svg, {x: qtlMapPanel.margin.left + bmapInWidth + 20, y: qtlMapPanel.yPos + qtlMapPanel.margin.top}, 3, "NES", {h:15, w:10}, "v");
    bmap.drawBubbleLegend(svg, {x: qtlMapPanel.margin.left + bmapInWidth + 20, y:qtlMapPanel.yPos + qtlMapPanel.margin.top + 150, title: "-log10(p-value)"}, 5, "-log10(p-value)", "v");


    bmap.fullDomain = bmap.xScale.domain(); // save the full domain as a new attribute of bmap
    bmap.addTooltip("locus-browser", "locus-browser");
    bmap.svg = bmapG;
    // customization
    //-- TSS and TES markers
    _findVariantsClosestToGeneStartEnd(gene, bmap); // NOTE: bmap.fullDomain is required in this function and bmap.tss, bmap.tes are created by this function

    return bmap;
}

function _customizeMapColumnLabels(bmap, par){
    bmap.svg.selectAll(".bubble-map-xlabel").remove(); // remove default xlabels of the bubble map
    bmap.svg.selectAll(".bar-map-x-axis").remove(); // remove default xlabels of the bubble map
    bmap.svg.selectAll(".custom-map-x-axis").remove(); // remove default xlabels of the bubble map

    let axis = axisBottom(bmap.xScale).tickSize(0);
    let Y = bmap.yScale.range()[1] + bmap.yScale.step();
    let axisG = bmap.svg.append("g")
         .attr("class", "custom-map-x-axis")
            .attr("transform", `translate(${-bmap.xScale.bandwidth()/2}, ${Y})`)
            .call(axis);

    axisG.selectAll("text")
        .attr("y", 0)
        .attr("x", 9)
        .attr("class", "custom-map-x-label")
        .attr("dy", ".35em")
        .attr("transform", "rotate(90)")
        .style("text-anchor", "start");

    axisG.selectAll(".tick").append("rect")
        .attr("class", "vep-box")
        .attr("x", -bmap.xScale.bandwidth()/2) // relative to its parent <g>
        .attr("y", -bmap.yScale.bandwidth() - 5) // position is relative to its parent <g>
        .attr("width", bmap.xScale.bandwidth())
        .attr("height", bmap.yScale.bandwidth())
        .style("fill", (d)=>{
            if (par.data.vepDict===undefined) return "none";
            let vep = par.data.vepDict[d]
            return vep===undefined?"#ffffff":vepColorKeys[vep]||"#ababab"
        })
        .style("stroke", "#eeeeee")
        .style("stoke-width", 1)
        .on("mouseover", (d)=>{
            let vep = par.data.vepDict[d] || "Not available";
            bmap.tooltip.show(`Variant: ${d} <br/> VEP: ${vep}`)
        })
        .on("mouseout", (d)=>{
            bmap.tooltip.hide();
        })
}

/**
 * Customize the barmap or bubblemap row text labels
 * @param bmap {BarMap or BubbleMap}
 * @private
 */
function _customizeMapRowLabels(bmap){
    bmap.svg.selectAll(".bubble-map-ylabel").remove();
    bmap.svg.select(".bar-map-y-axis").remove();
    bmap.svg.select(".custom-map-y-axis").remove();

    let axis = axisLeft(bmap.yScale).tickSize(0);
    bmap.svg.append("g")
        .attr("class", "custom-map-y-axis")
        .attr("transform", `translate(${-bmap.xScale.bandwidth()}, ${bmap.yScale.bandwidth()/3})`)
        .call(axis)
        .selectAll("text")
        .attr("class", "custom-map-y-label")
        .attr("fill", (d)=>{
            if (d.startsWith("GWAS")) return "#10b1b8";
            if (d.startsWith("sQTL")) return "#cc67b1";
            return "#7f7f7f"
        })
}

/**
 * render variant related genomic tracks
 * @param par
 * @param trackData {Object} of data with attributes: eqtl and sqtl
 * @param maxColorValue {Number} set the maximum color value for the color scale
 * @returns {MiniGenomeBrowser}
 */
function _renderVariantTracks(par=DefaultConfig, trackData=undefined, maxColorValue=30){
    let gene = par.data.queryGene;
    let svg = par.svg;
    let eqtlPanel = par.panels.eqtlTrack;
    let sqtlPanel = par.panels.sqtlTrack;
    if (eqtlPanel.data === null || sqtlPanel.data === null){
        eqtlPanel.data = _aggregateQtlData(trackData.eqtl, par)
        sqtlPanel.data = _aggregateQtlData(trackData.sqtl, par)
    }

    // QTL tracks rendering
    renderFeatureTrack(gene.tss, svg, par.genomicWindow, eqtlPanel, false, true, maxColorValue);
    const sqtlTrackViz = renderFeatureTrack(gene.tss, svg, par.genomicWindow, sqtlPanel, false, true, maxColorValue);
    return sqtlTrackViz;
}

/**
 * Collapsed QTL data for the summary genome browser tracks
 * QTLs are clustered by position
 * @param data {List} of QTL objects
 * @param par
 * @returns {List} of collapsed QTL objects sorted by genomic position
 */
function _aggregateQtlData(data, par=DefaultConfig){

    //-- Define the collapse function
    //   Collapse QTLs at each each locus, and report only the best (smallest) p-value.
    const collapse = (acc, d)=>{
        if (acc.hasOwnProperty(d.variantId)){
            if (acc[d.variantId].pValue > d.pValue) acc[d.variantId] = d;
        } else { acc[d.variantId] = d }
        return acc;
    };

    const parser = par.parsers.qtlFeatures;
    const qtlSort = par.dataSort.variants;
    let uniqEqtlVariants = data.reduce(collapse, {});
    let qtlFeatures = Object.values(uniqEqtlVariants).map(parser);
    qtlFeatures.sort(qtlSort);
    return qtlFeatures;
}

/**
 * Create the brush on the genomic tracks
 * @param gene
 * @param trackViz
 * @param bmap
 * @param par
 * @param ldBrush
 * @private
 */
function _createBrush(gene, trackViz, bmap, par=DefaultConfig, ldBrush=undefined){
    const qtlMapPanel = par.panels.qtlMap;
    const brushPanel = par.panels.sqtlTrack; // TODO: the genomic track that the brush is on may not be the sqtl track
    // Brush definition: render the chromosome position axis and zoom brush
    // parameters: left and right are screen coordinates, xA and xB are genomic coordinates
    const callback = (left, right, xA, xB)=>{
        // re-define the x scale's domain() based on the brush window change
        let focusDomain = bmap.fullDomain.filter((d)=>{
            let pos = parseInt(d.split("_")[1]);
            return pos>=xA && pos<=xB
        });
        bmap.renderWithNewDomain(bmap.svg, focusDomain);

        // refresh the gene's TSS and TES markers on the bubble map
        _renderGeneStartEndMarkers(bmap);
        _customizeMapRowLabels(bmap);
        _customizeMapColumnLabels(bmap, par);


        // update the corresponding LD using the ldBrush
        if(ldBrush!==undefined) ldBrush();

        // redraw the connecting lines between the edges of the brush window to the edges of the bubble map
        selectAll(".brushLine").remove();
        select(".brush")
            .append("line")
            .classed("brushLine", true)
            .attr("x1", left)
            .attr("x2", bmap.xScale.range()[0] + qtlMapPanel.margin.left - brushPanel.margin.left)
            .attr("y1",5)
            .attr("y2", par.panels.qtlMap.margin.top-40)
            .style("stroke-width", 1)
            .style("stroke", "#ababab");
        select(".brush")
            .append("line")
            .classed("brushLine", true)
            .attr("x1", right)
            .attr("x2", bmap.xScale.range()[1]+ qtlMapPanel.margin.left - brushPanel.margin.left)
            .attr("y1", 5)
            .attr("y2", par.panels.qtlMap.margin.top-40)
            .style("stroke-width", 1)
            .style("stroke", "#ababab")

    }; // this is the brush event

    let brushConfig = {
        w: 100,
        h: Math.abs(par.panels.tssTrack.yPos + par.panels.tssTrack.margin.top - (par.panels.sqtlTrack.yPos + par.panels.sqtlTrack.height +20)) // the brush should cover all tracks
    };

    let addBrush = true;
    MiniGenomeBrowser.renderAxis(trackViz.dom, trackViz.scale, brushPanel.height + 30, addBrush, callback, brushConfig, gene.tss); // TODO: remove hard-coded adjustment

}

/**
 * LD map parser
 * This parser may change again when the data is queried from the web service
 * @param data {Object} raw LD data
 * @param bmap {BubbleMap}
 * @param par {config object}
 * @private
 */
function _ldMapDataParserHelper(par=DefaultConfig){
    let ldData = par.data.ld[0].ld.map(par.parsers.ld);
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

/**
 * Render the LD halfmap
 * @param config {Locus Browser Config}
 * @param bmap {BarMap or BubbleMap}
 * @returns {ldBrush}
 * @private
 */
function _renderLdMap(config, bmap){
    let ldMap = new HalfMap(config.data, config.cutoff, false, undefined, config.colorScheme, [0,1]);
    ldMap.addTooltip('locus-browser');

    // LD heat map is rendered in canvas for performance optimization
    let ldCanvas = select(`#${config.id}`).append("canvas")
        .attr("id", config.id + "-ld-canvas")
        .attr("width", config.width)
        .attr("height", config.width)
        .style("position", "absolute");
    let ldContext = ldCanvas.node().getContext('2d');
    ldContext.translate(config.margin.left, config.margin.top);

    // SVG is used to render the cursor's rectangle
    let ldSvg = createSvg(config.id, config.width, config.width, {top: config.margin.top, left:config.margin.left});
    ldSvg.attr("class", "ld")
        .attr("id", "ldG");
    // ldSvg.selectAll("*").remove(); // clear all child nodes in ldG before rendering
    const ldSvgParent = select(ldSvg.node().parentNode);
    ldMap.drawColorLegend(ldSvgParent, {x: config.margin.left, y: 100}, 10, "LD");
    const drawConfig = {w: config.width-(config.margin.left+config.margin.right), top: 0, left: 0}
    ldMap.draw(ldCanvas, ldSvg, drawConfig, [0, 1], false, undefined, bmap.xScale.domain(), bmap.xScale.domain());

    // update the brush event with interactive LD map
    const ldBrush = ()=>{
        ldSvg.selectAll("*").remove();
        ldMap.draw(ldCanvas, ldSvg, drawConfig, [0, 1], false, undefined, bmap.xScale.domain(), bmap.xScale.domain())
    };
    return ldBrush;
}

/**
 * Render the Gene Heatmap
 * @param par {Object} the viz DefaultConfig
 * @returns {Heatmap}
 */
function renderGeneHeatmap(par=DefaultConfig){
    let panel = par.panels.geneMap;
    let gene = par.data.queryGene;
    let svg = par.svg;
    let data = par.data.gwasToGene;
    let dFilter = par.parsers.geneExpression;
    let dSort = par.dataSort.geneExpression;
    // parse gene map data
    panel.data = data;
    panel.data.sort((a,b)=>{return a.pos-b.pos});

    // calculate panel dimensions
    let inWidth = panel.width - (panel.margin.left + panel.margin.right);
    let inHeight = panel.height - (panel.margin.top + panel.margin.bottom);
    if (inWidth * inHeight <= 0) throw "The inner height and width of the GWAS heatmap panel must be positive values. Check the height and margin configuration of this panel"

    // create panel <g> root element
    let mapG = svg.append("g")
        .attr("id", panel.id)
        .attr("transform", `translate(${panel.margin.left}, ${panel.margin.top})`);

    // instantiate a Heatmap object
    let tooltipId = "locus-browser-tooltip";
    let hViz = new Heatmap(panel.data, panel.useLog, 10, panel.colorScheme, panel.cornerRadius, tooltipId, tooltipId);

    // render
    hViz.draw(mapG, {w:inWidth, h:inHeight}, panel.columnLabel.angle, false, panel.columnLabel.adjust);
    hViz.drawColorLegend(mapG, {x: 20, y:-20}, 5);

    // CUSTOMIZATION: highlight the anchor gene
    mapG.selectAll(".exp-map-xlabel")
        .attr('fill', (d)=>d==gene.geneSymbol?"red":"#000000")
        .style("cursor", "pointer")
        .on("click", (d)=>{
            par.genomicWindow = 1e6;
            rerender(d, par); // render data of the new gene
        });
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
function renderFeatureTrack(centerPos, svg, window, panel=DefaultConfig.panels.tssTrack, showWidth, useColorScale=false, maxColorValue=undefined){
    // preparation for the plot
    let inWidth = panel.width - (panel.margin.left + panel.margin.right);
    let inHeight = panel.height - (panel.margin.top + panel.margin.bottom);
    let trackG = svg.append("g")
        .attr("id", panel.id)
        .attr("transform", `translate(${panel.margin.left}, ${panel.margin.top + panel.yPos})`);

    let featureViz = new MiniGenomeBrowser(panel.data, centerPos, window);
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

// function generateRandomMatrix(par={x:20, y:20, scaleFactor:1}, cols = []){
//     let range = n => Array.from(Array(n).keys());
//     let X = cols === undefined?range(par.x):cols; // generates a 1-based list.
//     let Y = range(par.y);
//     let data = [];
//     X.forEach((x)=>{
//         x = cols===undefined?'col ' + x.toString():x;
//         Y.forEach((y)=>{
//             y = 'trait ' + y.toString();
//             let v = Math.random()*par.scaleFactor;
//             let dataPoint = {
//                 x: x,
//                 y: y,
//                 value: v,
//                 displayValue: v.toPrecision(3)
//             };
//             data.push(dataPoint);
//         })
//     });
//     return data;
// }

/**
 * Find the closest left-side variant of the gene start and end sites (tss and tes)
 * This function creates two new attributes, tss and tes, for bmap
 * @param gene {Object} that has attributes start and end
 * @param bmap {BubbleMap}
 */
function _findVariantsClosestToGeneStartEnd(gene, bmap) {
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
function _renderGeneStartEndMarkers(bmap){
    // rendering TSS
    let dom = bmap.svg
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
const vepColorKeys = {
    "splice_acceptor_variant": "#910807",
    "splice_donor_variant": "#910807",
    "splice_region_variant": "#ee974d",
    "transcript_ablation": "#af6563",
    "stop_gained": "#af6563",
    "framshift_variant": "#af6563",
    "stop_lost": "#af6563",
    "start_lost": "#af6563",
    "inframe_insertion": "#f9acb0",
    "infram_deletion": "#f9acb0",
    "missense_variant": "#f9acb0",
    "protein_altering_variant": "#f9acb0"
};
const DefaultConfig = {
    id: "locus-browser",
    ldId: "ld-browser",
    width: GlobalWidth,
    height: null, // should be dynamically calculated
    genomicWindow: 1e6,
    data: data,
    urls: dataUrls,
    parsers: dataParsers,
    dataFilters: dataFilters,
    dataSort: dataSort,
    panels: {
        geneMap: {
            id: 'gene-map',
            data: null,
            useLog: true,
            logBase: null,
            margin: {
                top: 0, // provide enough space for the color legend
                right: 100, // provide enough space for the row labels
                bottom: 0, // provide enough space for the column labels
                left: 80
            },
            width: GlobalWidth,
            height: 100, // outer height: this includes top and bottom margins + inner height
            colorScheme: "YlGnBu",
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
            label: "Gene model",
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
        },
        eqtlTrack: {
            id: 'eqtl-track',
            label: 'eQTL summary',
            data: null,
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
            label: 'sQTL summary',
            data: null,
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
                right: 100,
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
            right: 100,
            bottom: 0,
            left: 200
        },
        colorScheme: "Greys"
    }
};

