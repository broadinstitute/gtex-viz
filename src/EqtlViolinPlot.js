/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

"use strict";
import {json} from "d3-fetch";
import {checkDomId} from "./modules/utils";
import {
    getGtexUrls,
    parseDynEqtl
} from "./modules/gtexDataParser";
import {groupedViolinPlot} from "./GTExViz";

export function render(par, gencodeId, variantId, tissueId, groupName=undefined, urls=getGtexUrls()){
    json(urls['dyneqtl'] + `?variantId=${variantId}&gencodeId=${gencodeId}&tissueSiteDetailId=${tissueId}`)
        .then(function(json){
            let data = parseDynEqtl(json);
            // construct the dynEqtl data for the three genotypes: ref, het, alt
            par.data = [
                {
                    group: groupName||data.tissueSiteDetailId,
                    label: data.ref.length>2?"ref":data.ref,
                    size: data.homoRefExp.length,
                    values: data.homoRefExp
                },
                {
                    group: groupName||data.tissueSiteDetailId,
                    label: data.het.length>2?"het":data.het,
                    size: data.heteroExp.length,
                    values: data.heteroExp
                },
                {
                    group: groupName||data.tissueSiteDetailId,
                    label: data.alt.length>2?"alt":data.alt,
                    size: data.homoAltExp.length,
                    values: data.homoAltExp
                }
            ];
            par.numPoints = 10;
            groupedViolinPlot(par);
        })

}
