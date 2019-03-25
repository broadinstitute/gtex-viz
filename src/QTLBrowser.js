/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

//TODO: code review on setting configurations

"use strict";
import {tsv} from "d3-fetch";
import {select} from "d3-selection";
import MiniGenomeBrowser from "./modules/MiniGenomeBrowser.js";
import BubbleMap from "./modules/BubbleMap.js";
import Heatmap from "./modules/Heatmap.js";
import HalfMap from "./modules/HalfMap.js";
import {createSvg} from "./modules/utils";

export function render(geneId, par=browserConfig){
    let mainSvg = createSvg(par.id, par.width, par.height, {left:0, top:0});
    const promises = ["genes", "eqtls", "sqtls"].map((dType)=>tsv(par.urls[dType]));

    Promise.all(promises)
        .then((args)=> {
            let genes = renderGeneVisualComponents(geneId, mainSvg, args[0], par);
            let queryGene = genes.filter((g)=>g.geneSymbol == geneId)[0];
            console.log(queryGene);
            renderVariantVisualComponents(queryGene, mainSvg, par, args[1], args[2])
        });
}

function renderVariantVisualComponents(queryGene, mainSvg, par=browserConfig, eqData, sqData){

    // eQTL position track
    let eqtlFeatures = eqData.map(par.parsers.qtlFeatures);
    eqtlFeatures.sort(par.dataSort.features);
    eqtlTrackConfig.data = eqtlFeatures;
    const eqtlTrackViz = renderFeatureTrack(queryGene.geneSymbol, mainSvg, eqtlTrackConfig, true);

    // sQTL position track
    let sqtlFeatures = sqData.map(par.parsers.qtlFeatures);
    sqtlFeatures.sort(par.dataSort.features);
    sqtlTrackConfig.data = sqtlFeatures;
    const sqtlTrackViz = renderFeatureTrack(queryGene.geneSymbol, mainSvg, sqtlTrackConfig, true);

    // QTL bubble map
    qtlMapConfig.data = qtlMapConfig.data.concat(eqData.map((d)=>{return par.parsers.qtlBubbles(d, "eQTL")}))
    qtlMapConfig.data = qtlMapConfig.data.concat(sqData.map((d)=>{return par.parsers.qtlBubbles(d, "sQTL")}))

    let bmap = new BubbleMap(qtlMapConfig.data, qtlMapConfig.useLog, qtlMapConfig.logBase, qtlMapConfig.colorScheme);
    bmap.addTooltip(qtlMapConfig.id);
    let bmapG = mainSvg.append("g")
        .attr("id", qtlMapConfig.id)
        .attr("class", "focus")
        .attr("transform", `translate(${qtlMapConfig.marginLeft}, ${qtlMapConfig.marginTop + qtlMapConfig.posH})`);

    // LD map
    tsv(par.urls.ld)
        .then((data)=>{
            let ldData = data.map(par.parsers.ld);
            const vList = {};
            ldData.forEach((d)=>{
                vList[d.x] = true;
                vList[d.y] = true;
            });
            ldConfig.data = ldData.concat(Object.keys(vList).map((v)=>{
                return {
                    x: v,
                    y: v,
                    value: 1,
                    displayValue: "1"
                }
            }));

            // render bubble map
            bmap.drawSvg(bmapG, {w:qtlMapConfig.width-(qtlMapConfig.marginLeft + qtlMapConfig.marginRight), h:qtlMapConfig.height, top: 0, left:0})
            bmap.fullDomain = bmap.xScale.domain();

             //-- TSS and TES markers
            findVariantsNearGeneStartEnd(queryGene, bmap);
            renderGeneStartEndMarkers(bmap, bmapG);

            const ldBrush = renderLdMap(ldConfig, bmap);
            // render the chromosome position axis and zoom brush
            const callback = (left, right)=>{
                $("#console").text(" " + left + ", " + right);
                let focusDomain = bmap.fullDomain.filter((d)=>{
                    let pos = parseInt(d.split("_")[1]);
                    return pos>=left && pos<=right
                });
                bmap.renderWithNewDomain(bmapG, focusDomain);

                // -- gene TSS and TES markers
                renderGeneStartEndMarkers(bmap, bmapG);

                // LD updates
                ldBrush();

            };
            sqtlTrackViz.renderAxis(sqtlTrackConfig.height + 30, true, callback);
        });

}

function renderLdMap(config, bmap){
    let ldMap = new HalfMap(config.data, config.cutoff, false, undefined, config.colorScheme, [0,1]);
    ldMap.addTooltip(config.id);
    let ldCanvas = select(`#${config.id}`).append("canvas")
        .attr("id", config.id + "-ld-canvas")
        .attr("width", config.width)
        .attr("height", config.width)
        .style("position", "absolute")
    let ldContext = ldCanvas.node().getContext('2d');
    ldContext.translate(config.margin.left, config.margin.top);
    let ldSvg = createSvg(config.id, config.width, config.width, {top: 0, left:0});
    let ldG = ldSvg.append("g")
        .attr("class", "ld")
        .attr("id", "ldG")
        .attr("transform", `translate(${config.margin.left}, ${config.margin.top})`);
    ldMap.drawColorLegend(ldSvg, {x: config.margin.left, y: 100}, 10, "LD");
    ldG.selectAll("*").remove(); // clear all child nodes in ldG before rendering
    // let ldConfig = {w:par.inWidth, top:par.ldPanelMargin.top, left:par.ldPanelMargin.left};
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
 * @param geneId {String} the anchor gene's ID/symbol
 * @param mainSvg {d3 svg} the root svg
 * @param data {List} a list of gene objects with attr: geneSymbol, strand, start, end, geneType
 * @param par {Object} the configuration object of the overall visualization
 */
function renderGeneVisualComponents(geneId, mainSvg, data, par){
    let genes = data.map(par.parsers.genes).filter(par.dataFilters.genes);
    genes.sort(par.dataSort.genes);

    gwasHeatmapConfig.data = generateRandomMatrix({x:genes.length, y:4, scaleFactor:1}, genes.map((d)=>d.geneSymbol));
    const heatmapViz = renderGwasHeatmap(geneId, mainSvg, gwasHeatmapConfig);

    geneTrackConfig.data = genes;
    const geneTrackViz = renderFeatureTrack(geneId, mainSvg, geneTrackConfig);

    //// draw connecting lines between the GWAS trait heatmap and gene position track
    let xAdjust = gwasHeatmapConfig.marginLeft - geneTrackConfig.marginLeft + (heatmapViz.xScale.bandwidth()/2);
    let trackHeight = geneTrackConfig.height - (geneTrackConfig.marginTop + geneTrackConfig.marginBottom);

    geneTrackViz.svg.selectAll(".connect")
        .data(genes)
        .enter()
        .append('line')
        .attr("class", "connect")
        .attr("x1", (d)=>heatmapViz.xScale(d.geneSymbol) + xAdjust)
        .attr("x2", (d)=>geneTrackViz.scale(d.start))
        .attr("y1", trackHeight/2-20)
        .attr("y2", trackHeight/2)
        .attr("stroke", (d)=>d.geneSymbol==geneId?"red":"#ababab")
        .attr("stroke-width", 0.5);

    geneTrackViz.svg.selectAll(".connect2")
        .data(genes)
        .enter()
        .append('line')
        .attr("class", "connect2")
        .attr("x1", (d)=>heatmapViz.xScale(d.geneSymbol) + xAdjust)
        .attr("x2", (d)=>heatmapViz.xScale(d.geneSymbol) + xAdjust)
        .attr("y1", trackHeight/2-20)
        .attr("y2", (d)=>{
            // TODO: figure out the best way to make layout adjustment
            let adjust = -150 +(d.geneSymbol.length*heatmapViz.yScale.bandwidth());
            adjust = adjust > -20?-20:adjust;
            return trackHeight/2 + adjust;
        })
        .attr("stroke", (d)=>d.geneSymbol==geneId?"red":"#ababab")
        .attr("stroke-width", 0.5);

    return genes;
}

function renderGwasHeatmap(geneId, svg, par=gwasHeatmapConfig){

    let inWidth = par.width - (par.marginLeft + par.marginRight + par.rowLabelWidth);
    let inHeight = par.height - (par.marginTop + par.marginBottom + par.columnLabelHeight);
    let mapG = svg.append("g")
        .attr("id", par.id)
        .attr("transform", `translate(${par.marginLeft}, ${par.marginTop})`);
    let tooltipId = `${par.id}Tooltip`;

    let hViz = new Heatmap(par.data, false, undefined, par.colorScheme, par.colorRadius, tooltipId);
    hViz.draw(mapG, {w:inWidth, h:inHeight}, par.columnLabelAngle, false, par.columnLabelPosAdjust);
    hViz.drawColorLegend(mapG, {x: 20, y:-20}, 10);

    // highlight the anchor gene

    mapG.selectAll(".exp-map-xlabel")
        .attr('fill', (d)=>d==geneId?"red":"#000000")

    hViz.svg = mapG;
    return hViz

}

function renderFeatureTrack(geneId, svg, par=geneTrackConfig, useColorScale=false){
    // preparation for the plot
    let inWidth = par.width - (par.marginLeft + par.marginRight);
    let inHeight = par.height - (par.marginTop + par.marginBottom);
    let trackG = svg.append("g")
        .attr("id", par.id)
        .attr("transform", `translate(${par.marginLeft}, ${par.marginTop + par.posH})`);

    let featureViz = new MiniGenomeBrowser(par.data, par.center);
    featureViz.render(
        trackG,
        inWidth,
        inHeight,
        false,
        par.showLabels,
        par.label,
        par.trackColor,
        par.tickColor,
        useColorScale
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
        .attr('y1', 0)
        .attr('y2', bmap.yScale.range()[1])
        .style('stroke', '#94a8b8')
        .style('stroke-width', 2);
         g.append('text')
             .text('TSS')
             .attr('x', bmap.xScale(bmap.tss))
             .attr('y', -5)
             .attr('text-anchor', 'center')
             .style('font-size', "12px")
    }

    if (bmap.tes && bmap.xScale(bmap.tes)){
        g.append('line')
        .attr('x1', bmap.xScale(bmap.tes) + bmap.xScale.bandwidth()/2)
        .attr('x2', bmap.xScale(bmap.tes) + bmap.xScale.bandwidth()/2)
        .attr('y1', 0)
        .attr('y2', bmap.yScale.range()[1])
        .style('stroke', '#748797')
        .style('stroke-width', 2);
        g.append('text')
             .text('TES')
             .attr('x', bmap.xScale(bmap.tes))
             .attr('y', -5)
             .attr('text-anchor', 'center')
             .style('font-size', "12px")
    }

}

const ldConfig = {
    id: "ld-browser",
    data: [],
    cutoff: 0.1,
    width: 1800,
    margin: {
        left: 80,
        top: 10,
        right: 50
    },
    colorScheme: "Greys"
};
const browserConfig = {
    id: "qtl-browser",
    ldId: "ld-browser",
    width: 1800,
    height: 450, // should be dynamically calculated
    urls: {
        genes: "../tempData/ACTN3.neighbor.genes.csv",
        eqtls: "/tempData/ACTN3.eqtls.csv",
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
        qtlFeatures: (d)=>{
            // let id = d.variantId;
            d.chr = d.chromosome;
            d.start = parseInt(d.pos);
            d.end = d.start;
            d.pos = parseInt(d.pos);
            d.featureType = "variant";
            d.featureLabel = d.snpId||d.variantId;
            d.strand = "+";
            d.colorValue = -Math.log10(parseFloat(d.pValue));
            return d;
        },
        qtlBubbles: (d, dataType)=>{
            d.x = d.variantId;
            d.y = dataType;
            d.value = parseFloat(d.nes);
            d.r = -Math.log10(parseFloat(d.pValue));
            return d;
        },
        ld: (d)=>{
            d.x = d.snpId1;
            d.y = d.snpId2;
            d.value = parseFloat(d.rSquared);
            d.displayValue = parseFloat(d.value).toPrecision(3)
            return d;
        }
    },
    dataFilters: {
        genes: (d) => {
            return d.featureType == "protein coding" || d.featureType == "lincRNA"
        },

    },
    dataSort: {
        features: (a, b) => {
            return parseInt(a.start) - parseInt(b.start)
        }
    }
};

const gwasHeatmapConfig = {
    id: 'gwasHeatmap',
    data: null,
    useLog: false,
    logBase: null,
    width: 1800,
    height: 80,
    marginLeft: 100,
    marginRight: 10,
    marginTop: 40,
    marginBottom: 0, // need to save room for text labels
    colorScheme: "Greys",
    cornerRadius: 2,
    columnLabelHeight: 20,
    columnLabelAngle: 90,
    columnLabelPosAdjust: 10,
    rowLabelWidth: 100,
};

const geneTrackConfig = {
    id: 'geneTrack',
    label: 'TSS location',
    data: undefined,
    width: browserConfig.width,
    posH: 220,
    height: 20,
    marginLeft: 80,
    marginRight: 50,
    marginTop: 0, // space for connecting lines
    marginBottom: 0,
    showLabels: false,
    trackColor: "#ffffff",
    center: 66546395,
};

const eqtlTrackConfig = {
    id: 'eQTL-browser',
    data: undefined,
    width: browserConfig.width,
    height: 20,
    posH: 240,
    marginLeft: 80,
    marginRight: 50,
    marginTop: 0, // enough space to visually separate query gene association data panel
    marginBottom: 0,
    center: 66546395,
    showLabels: false,
    trackColor: "#ffffff",
    tickColor: "#0086af",
    label: 'ACTN3 eQTLs'
};

const sqtlTrackConfig = {
    id: 'sQTL-browser',
    data: undefined,
    width: browserConfig.width,
    height: 20,
    posH: 260,
    marginLeft: 80,
    marginRight: 50,
    marginTop: 0, // TODO: this should be calculated
    marginBottom: 0,
    center: 66546395,
    showLabels: false,
    trackColor: "#ffffff",
    tickColor: "#0086af",
    label: 'ACTN3 sQTLs'
};

const qtlMapConfig = {
    id: 'QTL-map',
    width: 1800, //window.innerWidth*0.9,
    height: 50, // TODO: use a dynamic width based on the matrix size
    posH: 350,
    marginTop: 0,
    marginRight: 50,
    marginBottom: 0,
    marginLeft: 80,

    colorScheme: "RdBu",
    colorScaleDomain: [-0.75, 0.75],

    useLog: false,
    logBase: undefined,

    // div IDs
    divSpinner: "spinner",
    divDashboard: "bmap-dashboard",
    divInfo: "bmap-filter-info",
    divGeneInfo: "bmap-gene-info",
    divModal: 'bmap-modal',
    data: [],

    labels: {
        column: {
            show: false,
            height: 100,
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
    },

    useCanvas: false // TODO: canvas mode is currently buggy
};
