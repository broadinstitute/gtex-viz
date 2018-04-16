"use strict";
import {getGtexUrls} from "./modules/gtexDataParser";

export function build(rootId){
    // get some data
    const gname = "ACTN3";
    json(getGtexUrls().geneExp + gname)
        .then(function(d){
            console.log(d);
        })
        .catch(function(err){console.error(err)});

}