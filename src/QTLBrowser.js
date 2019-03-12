/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

// TODO: consider creating a GEV class that stores bmap and LD objects...
"use strict";
import {tsv} from "d3-fetch";
import MiniGenomeBrowser from "./modules/MiniGenomeBrowser.js";
import {checkDomId, createSvg} from "./modules/utils";
import {bubblemap, heatmap} from "./GTExViz";

export const dim = {
    width: 1800,
};

export const gwasHeatmapConfig = {
    id: 'gwasHeatmap',
    data: null,
    useLog: false,
    logBase: null,
    width: dim.width,
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
    url: "../tempData/ACTN3.neighbor.genes.csv",
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

export const demoConfig = {
    id: 'demo',
    data: undefined,
    width: dim.width,
    height: 100,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 0,
    marginBottom: 0,
    showLabels: false,
    trackColor: "#848484",
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
    trackColor: "#58c9d7",
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
    trackColor: "#00aed7",
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

export function renderGwasHeatmap(geneId, par=gwasHeatmapConfig){
    tsv(par.url)
        .then((data)=>{
            let cols = data.map(par.dataParser).filter(par.dataFilter);
            cols.sort(par.dataSort);
            console.log(cols);
            par.data = generateRandomMatrix({x:cols.length, y:4, scaleFactor:1}, cols.map((d)=>d.geneSymbol));
            console.log(par.data);
            let hmap = heatmap(par);
        })
}

export function renderBrowserTrack(geneId, par=demoConfig){
    // preparation for the plot
    checkDomId(par.id);
    let inWidth = par.width - (par.marginLeft + par.marginRight);
    let inHeight = par.height - (par.marginTop + par.marginBottom);
    let svgId = `${par.id}Svg`;
    let tooltipId = `${par.id}Tooltip`;
    let margin = {
        top: par.marginTop,
        right: par.marginRight,
        bottom: par.marginBottom,
        left: par.marginLeft
    };
    let svg = createSvg(par.id, par.width, par.height, margin);

    const process = (data)=> {

        par.data = data.map(par.dataParser).filter(par.dataFilter)
        par.data.sort(par.dataSort);
        let browser = new MiniGenomeBrowser(par.data, par.center);
        browser.render(
            svg,
            inWidth,
            inHeight,
            false,
            par.showLabels,
            par.trackColor
        )
    };
    if (par.data === undefined){
         tsv(par.url)
        .then((dataprocess)
        .catch((err)=>{
            console.error(err)
        })
    } else {
        process()
    }

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


