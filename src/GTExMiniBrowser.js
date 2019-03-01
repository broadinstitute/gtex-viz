/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
// TODO: consider creating a GEV class that stores bmap and LD objects...
"use strict";
import {tsv} from "d3-fetch";
import MiniGenomeBrowser from "./modules/MiniGenomeBrowser.js";
import {checkDomId, createSvg} from "./modules/utils";

import {
    getGtexUrls,
} from "./modules/gtexDataParser";

export const demoConfig = {
    id: 'demo',
    data: undefined,
    width: 1800,
    height: 300,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 20,
    marginBottom: 0,
    showLabels: true,
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

export function render(geneId, par=demoConfig){
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

    tsv(par.url)
        .then((data)=> {

            par.data = data.map(par.dataParser).filter(par.dataFilter)
            par.data.sort((a, b)=>{
                return parseInt(a.start)-parseInt(b.start)
            });
            console.log(par.data);
            let browser = new MiniGenomeBrowser(par.data, par.center);
            browser.render(
                svg,
                inWidth,
                inHeight,
                false,
                par.showLabels,
                par.trackColor
            )
        })
        .catch((err)=>{
            console.error(err)
        })
}


