"use strict";
export function getGtexUrls(){
    const host = 'https://gtexportal.org/rest/v1/';
    return {
        // eqtl Dashboard specific
        dyneqtl: host + 'association/dyneqtl',
        snp: host + 'reference/variantDev?format=json&snpId=',
        variantId: host + 'reference/variantDev?format=json&variantId=',

        // transcript, exon, junction expression specific
        exonExp: host + 'expression/medianExonExpressionDev?datasetId=gtex_v7&hcluster=true&gencodeId=',
        transcriptExp: host + 'expression/medianTranscriptExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',
        junctionExp: host + 'expression/medianJunctionExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',

        isoform: host + 'reference/transcript?release=v7&gencode_id=',
        geneModel: host + 'reference/collapsedGeneModel?unfiltered=false&release=v7&geneId=',
        geneModelUnfiltered: host + 'reference/collapsedGeneModel?unfiltered=true&release=v7&geneId=',

        geneId: host + 'reference/geneId?format=json&release=v7&geneId=',
        geneExp: host + 'expression/geneExpression?datasetId=gtex_v7&gencodeId=',
        medGeneExp: host + 'expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&page_size=10000',

        tissue:  host + 'dataset/tissueInfo',
        tissueSites: host + 'dataset/tissueSiteDetail?format=json',

        topInTissueFiltered: host + 'expression/topExpressedGene?datasetId=gtex_v7&filterMtGene=true&sort_by=median&sortDirection=desc&page_size=50&tissueId=',
        topInTissue: host + 'expression/topExpressedGene?datasetId=gtex_v7&sort_by=median&sortDirection=desc&page_size=50&tissueId=',

        // local static files
        sample: 'tmpSummaryData/gtex.Sample.csv',

        rnaseqCram: 'tmpSummaryData/rnaseq_cram_files_v7_dbGaP_011516.txt',
        wgsCram: 'tmpSummaryData/wgs_cram_files_v7_hg38_dbGaP_011516.txt',

        // fireCloud
        fcBilling: 'https://api.firecloud.org/api/profile/billing',
        fcWorkSpace: 'https://api.firecloud.org/api/workspaces',
        fcPortalWorkSpace: 'https://portal.firecloud.org/#workspaces'
    }
}

/**
 * Parse the genes from GTEx web service
 * @param data {Json}
 * @returns {List} of genes
 */
export function parseGenes(data){
    const attr = 'geneId';
    if(!data.hasOwnProperty(attr)) throw 'Gene web service parsing error';
    return data[attr];
}

/**
 * Parse the tissues
 * @param data {Json}
 * @returns {List} of tissues
 */
export function parseTissues(data){
    const attr = 'tissueInfo';
    if(!data.hasOwnProperty(attr)) throw 'Fatal Error: parseTissues input error.';
    const tissues = data[attr];

    // sanity check
    ['tissueId', 'tissueName', 'colorHex'].forEach((d)=>{
        if (!tissues[0].hasOwnProperty(d)) throw 'Fatal Error: parseTissue attr not found: ' + d;
    });

    return tissues;
}

/**
 * Parse the tissue groups
 * @param data {Json}
 * @param forEqtl {Boolean}
 * @returns {Dictionary} of lists of tissues indexed by the tissue group name
 */
export function parseTissueSites(data, forEqtl=false){
    // the list of invalide eqtl tissues due to sample size < 70
    // a hard-coded list because the sample size is not easy to retrieve
    const invalidTissues = ['Bladder', 'Cervix_Ectocervix', 'Cervix_Endocervix', 'Fallopian_Tube', 'Kidney_Cortex'];

    const attr = 'tissueSiteDetail';
    if(!data.hasOwnProperty(attr)) throw 'Fatal Error: parseTissueSites input error.';
    const tissues = forEqtl==false?data[attr]:data[attr].filter((d)=>{return !invalidTissues.includes(d.tissue_site_detail_id)}); // an array of tissue_site_detail objects

    // build the tissueGroups lookup dictionary indexed by the tissue group name (i.e. the tissue main site name)
    ['tissue_site', 'tissue_site_detail_id', 'tissue_site_detail'].forEach((d)=>{
        if (!tissues[0].hasOwnProperty(d)) throw `parseTissueSites attr error. ${d} is not found`;
    });
    let tissueGroups = tissues.reduce((arr, d)=>{
        let groupName = d.tissue_site;
        let site = {
            id: d.tissue_site_detail_id,
            name: d.tissue_site_detail
        };
        if (!arr.hasOwnProperty(groupName)) arr[groupName] = []; // initiate an array
        arr[groupName].push(site);
        return arr;
    }, {});

    // modify the tissue groups that have only a single site
    // by replacing the group's name with the single site's name -- for a better Alphabetical order of the tissue groups

    Object.keys(tissueGroups).forEach((d)=>{
        if (tissueGroups[d].length == 1){ // a single-site group
            let site = tissueGroups[d][0]; // the single site
            delete tissueGroups[d]; // remove the old group in the dictionary
            tissueGroups[site.name] = [site]; // create a new group with the site's name
        }
    });

    return tissueGroups;

}

/**
 * parse the exons
 * @param data {Json}
 * @returns {List} of exons
 */
export function parseExons(data){
    const attr = 'collapsedGeneModel';
    if(!data.hasOwnProperty(attr)) throw 'Fatal Error: parseExons input error.' + data;
    // sanity check
    ['featureType', 'start', 'end'].forEach((d)=>{
        if (!data[attr][0].hasOwnProperty(d)) throw 'Fatal Error: parseExons attr not found: ' + d;
    });
    return data[attr].filter((d)=>d.featureType == 'exon').map((d)=>{
        d.chromStart = d.start;
        d.chromEnd = d.end;
        return d;
    });
}

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

    const attr = 'medianJunctionExpression';
    if(!data.hasOwnProperty(attr)) throw 'Fatal Error: parseJunctions input error. ' + data;
    return data[attr].filter((d)=>d.tissueId=='Liver')
                    .map((d) => {
                        let pos = d.junctionId.split('_');
                        return {
                            chrom: pos[0],
                            chromStart: pos[1],
                            chromEnd: pos[2],
                            junctionId: d.junctionId
                        }
                    });
}

/**
 * parse transcript isoforms from the GTEx web service: 'reference/transcript?release=v7&gencode_id='
 * @param data {Json}
 * returns a dictionary of transcript exon object lists indexed by ENST IDs
 */
export function parseIsoformExons(data){
    const attr = 'transcript';
    if(!data.hasOwnProperty(attr)) throw 'parseIsoforms input error ' + data;
    return data[attr].filter((d)=>{return 'exon' == d.featureType})
        .reduce((a, d)=>{
        if (a[d.transcriptId] === undefined) a[d.transcriptId] = [];
        a[d.transcriptId].push(d);
        return a;
    }, {});
}

/**
 * parse transcript isoforms
 * @param data {Json} from GTEx web service 'reference/transcript?release=v7&gencode_id='
 * returns a list of isoform objects
 */
export function parseIsoforms(data){
    const attr = 'transcript';
    if(!data.hasOwnProperty(attr)) throw('parseIsoforms input error');
    return data[attr].filter((d)=>{return 'transcript' == d.featureType}).sort((a, b)=>{
        const l1 = Math.abs(a.chromEnd - a.chromStart) + 1;
        const l2 = Math.abs(b.chromEnd - b.chromStart) + 1;
        return -(l1-l2); // sort by isoform length in descending order
    });
}

/**
 * parse final (masked) gene model exon expression
 * expression is normalized to reads per kb
 * @param data {JSON} of exon expression web service
 * @param exons {List} of exons with positions
 * @param useLog {boolean} use log2 transformation
 * @param adjust {Number} default 0.01
 * @returns {List} of exon objects
 */
export function parseExonExpression(data, exons, useLog=true, adjust=1){
    const exonDict = exons.reduce((a, d)=>{a[d.exonId] = d; return a;}, {});
    const attr = 'medianExonExpression';
    if(!data.hasOwnProperty(attr)) throw('parseExonExpression input error');

    const exonObjects = data[attr];
    // error-checking
    ['median', 'exonId', 'tissueSiteDetailId'].forEach((d)=>{
        if (!exonObjects[0].hasOwnProperty(d)) throw 'Fatal Error: parseExonExpression attr not found: ' + d;
    });
    // parse GTEx median exon counts
    exonObjects.forEach((d) => {
        const exon = exonDict[d.exonId]; // for retrieving exon positions
        // error-checking
        ['end', 'start'].forEach((p)=>{
            if (!exon.hasOwnProperty(p)) throw 'Fatal Error: parseExonExpression position attr not found: ' + p;
        });
        d.l = exon.end - exon.start + 1;
        d.value = Number(d.median)/d.l;
        d.originalValue = Number(d.median)/d.l;
        if (useLog) d.value = Math.log2(d.value + 1);
        d.x = d.exonId;
        d.y = d.tissueSiteDetailId;
        d.id = d.gencodeId;
        d.chromStart = exon.start;
        d.chromEnd = exon.end;
        d.unit = 'median ' + d.unit + ' per base';
        d.tissueId = d.tissueSiteDetailId;
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
    const attr = 'medianJunctionExpression';
    if(!data.hasOwnProperty(attr)) throw('parseJunctionExpression input error');

    const junctions = data[attr];

    // error-checking
    if (junctions === undefined || junctions.length == 0) {
        console.warn('No junction data found');
        return undefined;
    }
    ['tissueId', 'junctionId', 'data', 'gencodeId'].forEach((d)=>{
        if (!junctions[0].hasOwnProperty(d)) throw 'Fatal Error: parseJunctionExpression attr not found: ' + d;
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
 * parse transcript expression
 * @param data
 * @param useLog
 * @param adjust
 * @returns {*}
 */
export function parseTranscriptExpression(data, useLog=true, adjust=1){
    const attr = 'medianTranscriptExpression';
    if(!data.hasOwnProperty(attr)) throw('Parse Error: parseTranscriptExpression input error');
    // parse GTEx isoform median TPM
    data[attr].forEach((d) => {
        ['median', 'transcriptId', 'tissueSiteDetailId', 'gencodeId'].forEach((k)=>{
            if(!d.hasOwnProperty(k)) {
                console.error(d);
                throw('Parse Error: required transcipt attribute is missing: ' + k);
            }
        });
        d.value = useLog?Math.log10(Number(d.median + adjust)):Number(d.median);
        d.originalValue = Number(d.median);
        d.x = d.transcriptId;
        d.y = d.tissueSiteDetailId;
        d.id = d.gencodeId;
        d.tissueId = d.tissueSiteDetailId;
    });

    return data[attr];
}

export function parseTranscriptExpressionTranspose(data, useLog=true, adjust=1){
    const attr = 'medianTranscriptExpression';
    if(!data.hasOwnProperty(attr)) {
        console.error(data);
        throw('Parse Error: parseTranscriptExpressionTranspose input error.');
    }
    // parse GTEx isoform median TPM
    data[attr].forEach((d) => {
        ['median', 'transcriptId', 'tissueSiteDetailId', 'gencodeId'].forEach((k)=>{
            if(!d.hasOwnProperty(k)) {
                console.error(d);
                throw('Parse Error: Required transcript attribute is missing: ' + k);
            }
        });
        const median = d.median;
        const tissueId = d.tissueSiteDetailId;
        d.value = useLog?Math.log10(Number(median + adjust)):Number(median);
        d.originalValue = Number(median);
        d.y = d.transcriptId;
        d.x = tissueId;
        d.id = d.gencodeId;
        d.tissueId = tissueId;
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
    const attr = 'medianGeneExpression';
    if(!data.hasOwnProperty(attr)) throw 'parseMedianExpression input error.';
    const adjust = 1;
    // parse GTEx median gene expression
    // error-checking the required attributes:
    if (data[attr].length == 0) throw 'parseMedianExpression finds no data.';
    ['median', 'tissueId', 'gencodeId'].forEach((d)=>{
        if (!data[attr][0].hasOwnProperty(d)) throw `parseMedianExpression attr error. ${d} is not found`;
    });
    let results = data[attr];
    results.forEach(function(d){
        d.value = useLog?Math.log10(Number(d.median) + adjust):Number(d.median);
        d.x = d.tissueId;
        d.y = d.gencodeId;
        d.originalValue = Number(d.median);
        d.id = d.gencodeId;
    });

    return results;
}

/**
 * parse the gene expression
 * @param gencodeId {String}
 * @param data {Json} with attr: tissueId, geneSymbol
 * @returns {{exp: {}, geneSymbol: string}}
 */
// function parseGeneExpression(gencodeId, data){
//     let lookupTable = {
//         exp: {}, // indexed by tissueId
//         geneSymbol: ''
//     };
//     if(!data.hasOwnProperty(attr)) throw ('parseGeneExpression input error.');
//     data[attr].forEach((d)=>{
//         if (d.gencodeId == gencodeId) {
//             // if the gencode ID matches the query gencodeId,
//             // add the expression data to the lookup table
//             lookupTable.exp[d.tissueId] = d.data;
//             if ('' == lookupTable.geneSymbol) lookupTable.geneSymbol = d.geneSymbol
//         }
//     });
//     return lookupTable
// }

/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 */
export function parseGeneExpressionForViolin(data, useLog=true, colors=undefined){
    const attr = 'geneExpression';
    if(!data.hasOwnProperty(attr)) throw 'parseGeneExpressionForViolin input error.';
    data[attr].forEach((d)=>{
        d.values = useLog?d.data.map((dd)=>{return Math.log10(+dd+1)}):d.data;
        d.group = d.tissueId;
        d.label = d.geneSymbol;
        d.color = colors===undefined?'#90c1c1':colors[d.gencodeId];
    });
    return data[attr];
}
