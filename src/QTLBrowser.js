/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

//TODO: Add a brush window on the QTL tracks

"use strict";
import {tsv} from "d3-fetch";
import MiniGenomeBrowser from "./modules/MiniGenomeBrowser.js";
import Heatmap from "./modules/Heatmap.js";
import {createSvg} from "./modules/utils";
import {bubblemap} from "./GTExViz";

export const browserConfig = {
    id: "qtl-browser",
    width: 1800,
    height: 2000,
    margin: {
        left: 20,
        top: 50
    },
    urls: {
        genes: "../tempData/ACTN3.neighbor.genes.csv",
        eqtls: "/tempData/ACTN3.eqtls.csv",
        sqtls:  "/tempData/ACTN3.sqtls.csv",
    },
    parsers: {
        genes: (d)=>{
            d.start = parseInt(d.start);
            d.end = parseInt(d.end);
            d.featureLabel = d.geneSymbol;
            d.featureType = d.geneType;
            return d;
        },
        qtlFeatures: (d)=>{
            let id = d.variantId;
            d.chr = d.chromosome;
            d.start = parseInt(d.pos);
            d.end = d.start;
            d.featureType = "variant";
            d.featureLabel = d.snpId||d.variantId;
            d.strand = "+";
            return d;
        },
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
    marginTop: 0,
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
    label: 'Gene Position',
    data: undefined,
    width: browserConfig.width,
    height: 20,
    marginLeft: 80,
    marginRight: 50,
    marginTop: 400, // space for connecting lines
    marginBottom: 0,
    showLabels: false,
    trackColor: "#ffffff",
    center: 66546395,
};

export const eqtlTrackConfig = {
    id: 'eQTL-browser',
    data: undefined,
    width: browserConfig.width,
    height: 20,
    marginLeft: 80,
    marginRight: 50,
    marginTop: 500, // enough space to visually separate query gene association data panel
    marginBottom: 0,
    center: 66546395,
    showLabels: false,
    trackColor: "#ffffff",
    tickColor: "#0086af",
    label: 'eQTL Position'
};

export const sqtlTrackConfig = {
    id: 'sQTL-browser',
    data: undefined,
    width: browserConfig.width,
    height: 20,
    marginLeft: 80,
    marginRight: 50,
    marginTop: 530, // TODO: this should be calculated
    marginBottom: 0,
    center: 66546395,
    showLabels: false,
    trackColor: "#ffffff",
    tickColor: "#0086af",
    label: 'sQTL Position'
};

export const qtlMapConfig = {
    id: 'QTL-map',
    width: 1800, //window.innerWidth*0.9,
    height: 150, // TODO: use a dynamic width based on the matrix size
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 100,

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
    urls: [
        "/tempData/ACTN3.eqtls.csv",
        "/tempData/ACTN3.sqtls.csv",
    ],
    dataType: [
        "eQTL",
        "sQTL"
    ],
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

export function renderQtlMap(geneId, par=qtlMapConfig){
    const promises = par.urls.map((url)=>{return tsv(url)});
    Promise.all(promises)
        .then(function(args){
            args.forEach((arg, i)=>{
                let dtype = par.dataType[i]
                console.log(dtype)
                arg.forEach((d)=>{
                    d.x = d.variantId;
                    d.y = d.geneSymbol + "-" + dtype;
                    d.value = parseFloat(d.nes);
                    d.displayValue = d.value.toPrecision(3);
                    d.r = -Math.log10(parseInt(d.pValue)); // set r to be the -log10(p-value)
                    d.rDisplayValue = parseFloat(d.r.toExponential()).toPrecision(3);
                    par.data.push(d)
                })
            })
            console.log(par.data);
            bubblemap(par)
        })
        .catch(function(err){console.error(err)})
}

export function render(geneId, par=browserConfig){
    let mainSvg = createSvg(par.id, par.width, par.height, {left:par.margin.left, top:par.margin.top});
    const promises = ["genes", "eqtls", "sqtls"].map((dType)=>tsv(par.urls[dType]));

    Promise.all(promises)
        .then((args)=> {
            renderGeneVisualComponents(geneId, mainSvg, args[0], par);
            renderVariantVisualComponents(geneId, mainSvg, par, args[1], args[2])
        })
}

function renderVariantVisualComponents(geneId, mainSvg, par=browserConfig, eqData, sqData){

    // eQTL position track
    let eqtlFeatures = eqData.map(par.parsers.qtlFeatures);
    eqtlFeatures.sort(par.dataSort.features);
    eqtlTrackConfig.data = eqtlFeatures;
    const eqtlTrackViz = renderFeatureTrack(geneId, mainSvg, eqtlTrackConfig);

    // sQTL position track
    let sqtlFeatures = sqData.map(par.parsers.qtlFeatures);
    sqtlFeatures.sort(par.dataSort.features);
    sqtlTrackConfig.data = sqtlFeatures;
    const sqtlTrackViz = renderFeatureTrack(geneId, mainSvg, sqtlTrackConfig);
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
        .attr("stroke-width", 0.5)

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

function renderFeatureTrack(geneId, svg, par=geneTrackConfig){
    // preparation for the plot
    let inWidth = par.width - (par.marginLeft + par.marginRight);
    let inHeight = par.height - (par.marginTop + par.marginBottom);
    let trackG = svg.append("g")
        .attr("id", par.id)
        .attr("transform", `translate(${par.marginLeft}, ${par.marginTop})`);

    let featureViz = new MiniGenomeBrowser(par.data, par.center);
    featureViz.render(
        trackG,
        inWidth,
        inHeight,
        false,
        par.showLabels,
        par.label,
        par.trackColor,
        par.tickColor
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


