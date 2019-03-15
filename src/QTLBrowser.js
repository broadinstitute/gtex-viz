/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

// TODO: consider creating a GEV class that stores bmap and LD objects...
"use strict";
import {tsv} from "d3-fetch";
import MiniGenomeBrowser from "./modules/MiniGenomeBrowser.js";
import Heatmap from "./modules/Heatmap.js";
import {checkDomId, createSvg} from "./modules/utils";
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

    },
    parsers: {
        genes: (d)=>{
            d.start = parseInt(d.start);
            d.end = parseInt(d.end);
            d.featureLabel = d.geneSymbol;
            d.featureType = d.geneType;
            return d;
        },
    },
    dataFilters: {
        genes: (d) => {
            return d.featureType == "protein coding" || d.featureType == "lincRNA"
        },
    },
    dataSort: {
        genes: (a, b) => {
            return parseInt(a.start) - parseInt(b.start)
        }
    }
};

const gwasHeatmapConfig = {
    id: 'gwasHeatmap',
    data: null,
    useLog: false,
    logBase: null,
    width: browserConfig.width,
    height: 250,
    marginLeft: 100,
    marginRight: 10,
    marginTop: 50,
    marginBottom: 120,
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
    height: 100,
    marginLeft: 50,
    marginRight: 50,
    marginTop: 500,
    marginBottom: 0,
    showLabels: false,
    trackColor: "#ffffff",
    url: "../tempData/ACTN3.neighbor.genes.csv",
    center: 66546395,
    dataParser: (d)=>{
        d.start = parseInt(d.start);
        d.end = parseInt(d.end);
        d.featureLabel = d.geneSymbol;
        d.featureType = d.geneType;
        return d;
    },
    dataFilter: (d)=>{
        return d.featureType == "protein coding"||d.featureType=="lincRNA"
    },
    dataSort: (a, b)=>{
        return parseInt(a.start)-parseInt(b.start)
    }
};

export const eqtlConfig = {
    id: 'eQTL-browser',
    data: undefined,
    width: 1800,
    height: 20,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 0,
    marginBottom: 0,
    url: "/tempData/ACTN3.eqtls.csv",
    center: 66546395,
    showLabels: false,
    trackColor: "#f2f2f2",
    dataParser: (d)=>{
        let id = d.variantId;
        d.chr = d.chromosome;
        d.start = parseInt(d.pos)
        d.end = d.start
        d.featureType = "variant"
        d.featureLabel = d.snpId||d.variantId
        d.strand = "+"
        return d;
    },
    dataFilter: (d)=>{return d}
};

export const sqtlConfig = {
    id: 'sQTL-browser',
    data: undefined,
    width: 1800,
    height: 20,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 0,
    marginBottom: 0,
    url: "/tempData/ACTN3.sqtls.csv",
    center: 66546395,
    showLabels: false,
    trackColor: "#f4f4f4",
    dataParser: (d)=>{
        let id = d.variantId;
        d.chr = d.chromosome;
        d.start = parseInt(d.pos)
        d.end = d.start
        d.featureType = "variant"
        d.featureLabel = d.snpId||d.variantId
        d.strand = "+"
        return d;
    },
    dataFilter: (d)=>{return d}
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

    tsv(par.urls.genes)
        .then((data)=>{
            let genes = data.map(par.parsers.genes).filter(par.dataFilters.genes);
            genes.sort(par.dataSort.genes);

            gwasHeatmapConfig.data = generateRandomMatrix({x:genes.length, y:4, scaleFactor:1}, genes.map((d)=>d.geneSymbol));
            const heatmapViz = renderGwasHeatmap(geneId, mainSvg, gwasHeatmapConfig);

            geneTrackConfig.data = genes;
            const geneTrackViz = renderFeatureTrack(geneId, mainSvg, geneTrackConfig);
            let trackHeight = geneTrackConfig.height - (geneTrackConfig.marginTop + geneTrackConfig.marginBottom);

            let xAdjust = gwasHeatmapConfig.marginLeft - geneTrackConfig.marginLeft + (heatmapViz.xScale.bandwidth()/2)
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
                .attr("y2", (d)=>trackHeight/2-175 +(d.geneSymbol.length*10))
                .attr("stroke", (d)=>d.geneSymbol==geneId?"red":"#ababab")
                .attr("stroke-width", 0.5)


        })
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
        par.trackColor,
        par.label
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


