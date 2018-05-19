"use strict";
import {json} from "d3-fetch";
export function getGtexUrls(){
    const host = "https://gtexportal.org/rest/v1/"; // NOTE: top expressed genes are not yet in production
    return {
        // "geneExp": "https://gtexportal.org/rest/v1/dataset/featureExpression?feature=gene&gencode_id=",

        // "sample": host + "dataset/sample?datasetId=gtex_v7&format=json&sort_by=sampleId&sortDir=asc&dataType=",
        "rnaseqCram": "data/rnaseq_cram_files_v7_dbGaP_011516.txt",
        "wgsCram": "data/wgs_cram_files_v7_hg38_dbGaP_011516.txt",
        "sample": "data/gtex.Sample.csv",
        "geneId": host + "reference/geneId?format=json&geneId=",
        "geneExp": host + "expression/geneExpression?datasetId=gtex_v7&gencodeId=",
        "tissue":  host + "dataset/tissueInfo",
        "topInTissueFiltered": host + "expression/topExpressedGenes?datasetId=gtex_v7&filterMtGene=true&sort_by=median&sortDirection=desc&page_size=50&tissueId=",
        "topInTissue": host + "expression/topExpressedGenes?datasetId=gtex_v7&sort_by=median&sortDirection=desc&page_size=50&tissueId=",
        "medExpById": host + "expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&page_size=10000&gencodeId=",

        "exonExp": host + "expression/medianExonExpression?datasetId=gtex_v7&hcluster=true&gencodeId=",
        "junctionExp": host + "expression/medianJunctionExpression?datasetId=gtex_v7&hcluster=true&gencodeId=",
        "isoformExp": host + "expression/isoformExpression?datasetId=gtex_v7&boxplotDetail=median&gencodeId=",

        "geneModel": host + "reference/collapsedGeneModel?unfiltered=false&release=v7&geneId=",
        "geneModelUnfiltered": host + "reference/collapsedGeneModel?unfiltered=true&release=v7&geneId=",
        "isoform": host + "reference/transcript?release=v7&gencode_id=",

        "liverGeneExp": "data/top50.genes.liver.genomic.median.tpm.json", // top 50 genes in GTEx liver
        "cerebellumGeneExp": "data/top.gtex.cerebellum.genes.median.tpm.tsv",
        "mayoGeneExp": "data/gtex+mayo.top.cerebellum_ad.genes.median.tpm.tsv" // the top 50 genes in Mayo Cerebellum_AD + their gtex expression values
    }
}

/**
 * Create the tissue (dataset) dropdown menu using select2
 * @param domId {String} the dom ID of the menu
 * @param urls {Object} of web service urls with attr: tissue
 * dependency: select2
 */
export function createTissueMenu(domId, url = getGtexUrls().tissue){
    json(url)
        .then(function(results){
            let tissues = parseTissues(results);
            tissues.forEach((d) => {
                d.id = d.tissueId;
                d.text = d.tissueName;
            });
            tissues.sort((a, b) => {
                if(a.tissueName < b.tissueName) return -1;
                if(a.tissueName > b.tissueName) return 1;
                return 0;
            });

            // external library dependency: select2
            $(`#${domId}`).select2({
                placeholder: 'Select a data set',
                data: tissues
            });

        })
        .catch(function(err){console.error(err)});

}





/**
 * Parse the genes from GTEx web service
 * @param data {Json}
 * @returns {List} of genes
 */
export function parseGenes(data){
    const attr = "geneId";
    if(!data.hasOwnProperty(attr)) throw "Gene web service parsing error";
    return data[attr];
}

/**
 * parse the tissues
 * @param data {Json}
 * @returns {List} of tissues
 */
export function parseTissues(data){
    const attr = "tissueInfo";
    if(!data.hasOwnProperty(attr)) throw "Fatal Error: parseTissues input error.";
    const tissues = data[attr];

    // sanity check
    ["tissueId", "tissueName", "colorHex"].forEach((d)=>{
        if (!tissues[0].hasOwnProperty(d)) throw "Fatal Error: parseTissue attr not found: " + d;
    });

    return tissues;
}

/**
 * parse the exons
 * @param data {Json}
 * @returns {List} of exons
 */
export function parseExons(data){
    const attr = "collapsedGeneModel";
    if(!data.hasOwnProperty(attr)) throw "Fatal Error: parseExons input error." + data;
    // sanity check
    ["featureType", "start", "end"].forEach((d)=>{
        if (!data[attr][0].hasOwnProperty(d)) throw "Fatal Error: parseExons attr not found: " + d;
    });
    return data[attr].filter((d)=>d.featureType == "exon").map((d)=>{
        d.chromStart = d.start;
        d.chromEnd = d.end;
        return d;
    });
}

// export function parseSamples(data){
//     const attr = "sample";
//     if (!data.hasOwnProperty(attr)) throw "Fatal Error: parseSamples input error. " + data;
//     return data[attr];
// }
//


/**
 * parse the junctions
 * @param data
 * @returns {List} of junctions
 * // we do not store junction structure annotations in Mongo
    // so here we use the junction expression web service to retrieve the junction genomic locations
    // assuming that each tissue has the same junctions,
    // to grab all the known junctions of a gene, we only need to look at one tissue
    // here we arbitrarily pick Liver.
 */
export function parseJunctions(data){

    const attr = "medianJunctionExpression";
    if(!data.hasOwnProperty(attr)) throw "Fatal Error: parseJunctions input error. " + data;
    return data[attr].filter((d)=>d.tissueId=="Liver")
                    .map((d) => {
                        let pos = d.junctionId.split("_");
                        return {
                            chrom: pos[0],
                            chromStart: pos[1],
                            chromEnd: pos[2],
                            junctionId: d.junctionId
                        }
                    });
}

/**
 * parse transcript isoforms from the GTEx web service: "reference/transcript?release=v7&gencode_id="
 * @param data {Json}
 * returns a dictionary of transcript exon object lists indexed by ENST IDs
 */
export function parseIsoformExons(data){
    const attr = "transcript";
    if(!data.hasOwnProperty(attr)) throw "parseIsoforms input error " + data;
    return data[attr].filter((d)=>{return "exon" == d.featureType})
        .reduce((a, d)=>{
        if (a[d.transcriptId] === undefined) a[d.transcriptId] = [];
        a[d.transcriptId].push(d);
        return a;
    }, {});
}

/**
 * parse transcript isoforms
 * @param data {Json} from GTEx web service "reference/transcript?release=v7&gencode_id="
 * returns a list of isoform objects
 */

export function parseIsoforms(data){
    const attr = "transcript";
    if(!data.hasOwnProperty(attr)) throw("parseIsoforms input error");
    return data[attr].filter((d)=>{return "transcript" == d.featureType}).sort((a, b)=>{
        const l1 = Math.abs(a.chromEnd - a.chromStart) + 1;
        const l2 = Math.abs(b.chromEnd - b.chromStart) + 1;
        return -(l1-l2); // sort by isoform length in descending order
    });
}

/**
 * parse final gene model exon expression
 * expression is normalized to reads per kb
 * @param data {JSON} of exon expression web service
 * @param exons {List} of exons with positions
 * @param useLog {boolean} use log2 transformation
 * @param adjust {Number} default 0.01
 * @returns {List} of exon objects
 */
export function parseExonExpression(data, exons, useLog=true, adjust=1){
    const exonDict = exons.reduce((a, d)=>{a[d.exonId] = d; return a;}, {});
    const attr = "medianExonExpression";
    if(!data.hasOwnProperty(attr)) throw("parseExonExpression input error");

    const exonObjects = data[attr];
    // error-checking
    ["data", "exonId", "tissueId"].forEach((d)=>{
        if (!exonObjects[0].hasOwnProperty(d)) throw "Fatal Error: parseExonExpression attr not found: " + d;
    });
    // parse GTEx median exon counts
    exonObjects.forEach((d) => {
        const exon = exonDict[d.exonId]; // for retrieving exon positions
        // error-checking
        ["end", "start"].forEach((p)=>{
            if (!exon.hasOwnProperty(p)) throw "Fatal Error: parseExonExpression attr not found: " + p;
        });
        d.l = exon.end - exon.start + 1;
        d.value = Number(d.data)/d.l;
        d.originalValue = Number(d.data)/d.l;
        if (useLog) d.value = Math.log2(d.value + 1);
        d.x = d.exonId;
        d.y = d.tissueId;
        d.id = d.gencodeId;
        d.chromStart = exon.start;
        d.chromEnd = exon.end;
        d.unit = d.unit + " per base";
    });
    return exonObjects.sort((a,b)=>{
        if (a.chromStart<b.chromStart) return -1;
        if (a.chromStart>b.chromStart) return 1;
        return 0;
    }); // sort by genomic location in ascending order
}

/**
 * Parse junction median read count data
 * @param data {JSON} of the junction expression web service
 * @param useLog {Boolean} perform log transformation
 * @param adjust {Number} for handling 0's when useLog is true
 * @returns {List} of junction objects
 */
export function parseJunctionExpression(data, useLog=true, adjust=1){
    const attr = "medianJunctionExpression";
    if(!data.hasOwnProperty(attr)) throw("parseJunctionExpression input error");

    const junctions = data[attr];

    // error-checking
    ["tissueId", "junctionId", "data", "gencodeId"].forEach((d)=>{
        if (!junctions[0].hasOwnProperty(d)) throw "Fatal Error: parseJunctionExpression attr not found: " + d;
    });

    // parse GTEx median junction read counts
    junctions.forEach((d) => {
        d.value = useLog?Math.log10(Number(d.data + adjust)):Number(d.data);
        d.x = d.junctionId;
        d.y = d.tissueId;
        d.originalValue = Number(d.data);
        d.id = d.gencodeId
    });

    // sort by genomic location in ascending order
    return junctions.sort((a,b)=>{
        if (a.junctionId>b.junctionId) return 1;
        else if (a.junctionId<b.junctionId) return -1;
        return 0;
    });
}

/**
 * parse isoform expression
 * @param data
 * @param useLog
 * @param adjust
 * @returns {*}
 */
export function parseIsoformExpression(data, useLog=true, adjust=1){
    const attr = "isoformExpression";
    if(!data.hasOwnProperty(attr)) throw("parseIsoformExpression input error");
    // parse GTEx isoform median TPM
    data[attr].forEach((d) => {
        d.value = useLog?Math.log10(Number(d.data + adjust)):Number(d.data);
        d.originalValue = Number(d.data);
        d.x = d.transcriptId;
        d.y = d.tissueId;
        d.id = d.gencodeId;
    });

    return data[attr];
}

export function parseIsoformExpressionTranspose(data, useLog=true, adjust=1){
    const attr = "isoformExpression";
    if(!data.hasOwnProperty(attr)) throw("parseIsoformExpression input error");
    // parse GTEx isoform median TPM
    data[attr].forEach((d) => {
        d.value = useLog?Math.log10(Number(d.data + adjust)):Number(d.data);
        d.originalValue = Number(d.data);
        d.y = d.transcriptId;
        d.x = d.tissueId;
        d.id = d.gencodeId;
    });

    return data[attr];
}

/**
 * parse median gene expression
 * @param data {Json} with attr medianGeneExpression
 * @param useLog {Boolean} performs log10 transformation
 * @returns {*}
 */
export function parseMedianExpression(data, useLog=true){
    const attr = "medianGeneExpression";
    if(!data.hasOwnProperty(attr)) throw "parseMedianExpression input error.";
    const adjust = 1;
    // parse GTEx median gene expression
    // error-checking the required attributes:
    if (data[attr].length == 0) throw "parseMedianExpression finds no data.";
    ["median", "tissueId", "gencodeId"].forEach((d)=>{
        if (!data[attr][0].hasOwnProperty(d)) throw `parseMedianExpression attr error. ${d} is not found`;
    });
    data.medianGeneExpression.forEach(function(d){
        d.value = useLog?Math.log10(Number(d.median) + adjust):Number(d.median);
        d.x = d.tissueId;
        d.y = d.gencodeId;
        d.originalValue = Number(d.median);
        d.id = d.gencodeId
    });
    return data[attr];
}

/**
 * parse the median gene expression, no longer in use
 * @param data {List} of data points with attr: value, tissueId, geneSymbol, gencodeId
 * @param useLog {Boolean} perform log transformation using log10
 * @returns {List}
 */
// export function parseMedianTPM(data, useLog=true){
//     // parse GTEx median TPM json static file
//     data.forEach(function(d){
//         d.value = useLog?Math.log10(+d.medianTPM + 1):+d.medianTPM;
//         d.x = d.tissueId;
//         d.y = d.geneSymbol;
//         d.originalValue = parseFloat(d.medianTPM);
//         d.id = d.gencodeId;
//     });
//     return data;
// }

/**
 * parse the gene expression
 * @param gencodeId {String}
 * @param data {Json} with attr: tissueId, geneSymbol
 * @returns {{exp: {}, geneSymbol: string}}
 */
function parseGeneExpression(gencodeId, data){
    let lookupTable = {
        exp: {}, // indexed by tissueId
        geneSymbol: ""
    };
    if(!data.hasOwnProperty(attr)) throw ("parseGeneExpression input error.");
    data[attr].forEach((d)=>{
        if (d.gencodeId == gencodeId) {
            // if the gencode ID matches the query gencodeId,
            // add the expression data to the lookup table
            lookupTable.exp[d.tissueId] = d.data;
            if ("" == lookupTable.geneSymbol) lookupTable.geneSymbol = d.geneSymbol
        }
    });
    return lookupTable
}

/**
 * Makes the json for the plotly boxplot, no longer in use
 * @param gencodeId {String}: a gencode ID
 * @param data {Object} gene expression API call
 * @param useLog {Boolean}
 * @param color {String}
 * @param xlist {List}: a list of tissue objects {id:String, name:String}
 * @returns {{x: Array, y: Array, name: string, type: string, line: {width: number}, marker: {color: string}}}
 */
// export function makeJsonForPlotly(gencodeId, data, useLog=false, color="grey", xlist){
//
//     // reference: https://plot.ly/javascript/box-plots/
//
//     let lookupTable = parseGeneExpression(gencodeId, data); // constructs the tissue lookup table indexed by tissue ID
//     let x = [];
//     let y = [];
//
//     // xlist: the tissues
//     xlist.forEach((d)=>{
//         // d: a tissue
//         if (lookupTable.exp[d.id]===undefined){
//             // when the gene has no expression data in tissue d,
//             // provide dummy data
//             x = x.concat([d.name]);
//             y = y.concat([-1]);
//         } else {
//             // concatenate a list of the tissue label repeatedly (lookupTable.exp[d].length times) to x
//             // concatenate all the expression values to y
//             // the number of elements in x and y must match
//             x = x.concat(Array(lookupTable.exp[d.id].length).fill(d.name));
//             y = y.concat(lookupTable.exp[d.id]);
//         }
//     });
//     return {
//         x: x,
//         y: y,
//         name: lookupTable.geneSymbol,
//         type: 'box',
//         line: {width:1},
//         marker: {color:color},
//     };
//
// }

/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 */
export function parseGeneExpressionForViolin(data, useLog=true, colors=undefined){
    const attr = "geneExpression";
    if(!data.hasOwnProperty(attr)) throw "parseGeneExpressionForViolin input error.";
    data[attr].forEach((d)=>{
        d.values = useLog?d.data.map((dd)=>{return Math.log10(+dd+1)}):d.data;
        d.group = d.tissueId;
        d.label = d.geneSymbol;
        d.color = colors===undefined?"#90c1c1":colors[d.gencodeId];
    });
    return data[attr];
}
