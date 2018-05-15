'use strict';
import {json} from 'd3-fetch';
import {getGtexUrls,
    parseTissues
} from "./modules/gtexDataParser";

export function buildDataMatrix(tableId, urls=getGtexUrls()){
    json(urls.tissue)
        .then(function(data){
            let tissues = parseTissues(data);
            tissues.forEach((t)=>{
                let $tr = $('<tr/>').appendTo(`#${tableId}`);
                $('<th/>').attr('scope', 'row').text(t.tissueName).appendTo($tr);
                $('<td/>').text(t.rnaSeqSampleCount).appendTo($tr);
                $('<td/>').text(t.rnaSeqAndGenotypeSampleCount).appendTo($tr);
                $('<td/>').text('-').appendTo($tr);
                $('<td/>').text('-').appendTo($tr);
            });
        })
        .catch(function(err){console.error(err)});
}
