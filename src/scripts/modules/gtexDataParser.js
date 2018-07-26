"use strict";
export function getGtexUrls(){
    const host = 'https://dev.gtexportal.org/rest/v1/';
    return {
        // eqtl Dashboard specific
        dyneqtl: host + 'association/dyneqtl',
        snp: host + 'reference/variant?format=json&snpId=',
        variantId: host + 'reference/variant?format=json&variantId=',

        // transcript, exon, junction expression specific
        exonExp: host + 'expression/medianExonExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',
        transcriptExp: host + 'expression/medianTranscriptExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',
        junctionExp: host + 'expression/medianJunctionExpression?datasetId=gtex_v7&hcluster=true&gencodeId=',
        transcript: host + 'reference/transcript?datasetId=gtex_v7&gencodeId=',
        exon: host + 'reference/exon?datasetId=gtex_v7&gencodeId=',
        geneModel: host + 'reference/collapsedGeneModelExon?unfiltered=false&datasetId=gtex_v7&gencodeId=',
        geneModelUnfiltered: host + 'reference/collapsedGeneModelExon?unfiltered=true&datasetId=gtex_v7&gencodeId=',

        // gene expression violin plot specific
        geneExp: host + 'expression/geneExpression?datasetId=gtex_v7&gencodeId=',

        // gene expression heat map specific
        medGeneExp: host + 'expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&page_size=10000',

        // top expressed gene expression specific
        topInTissueFiltered: host + 'expression/topExpressedGene?datasetId=gtex_v7&filterMtGene=true&sort_by=median&sortDirection=desc&page_size=50&tissueSiteDetailId=',
        topInTissue: host + 'expression/topExpressedGene?datasetId=gtex_v7&sort_by=median&sortDirection=desc&page_size=50&tissueSiteDetailId=',

        geneId: host + 'reference/geneId?format=json&release=v7&geneId=',

        // tissue menu specific
        tissue:  host + 'dataset/tissueInfo',

        tissueSites: host + 'dataset/tissueSiteDetail?format=json',

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
export function parseModelExons(json){
    const attr = 'collapsedGeneModelExon';
    if(!json.hasOwnProperty(attr)){
        console.error(json);
        throw 'Parse Error: Required json attribute is missing: ' + attr;
    }
    // sanity check
    ['start', 'end'].forEach((d)=>{
        if (!json[attr][0].hasOwnProperty(d)) throw 'Parse Error: Required json attribute is missing: ' + d;
    });
    return json[attr].map((d)=>{
        d.chromStart = d.start;
        d.chromEnd = d.end;
        return d;
    });
}

/**
 * parse the junctions
 * @param data
 * @returns {List} of junctions
 * // junction annotations are not stored in Mongo
    // so here we use the junction expression web service to parse the junction ID for its genomic location
    // assuming that each tissue has the same junctions,
    // to grab all the known junctions of a gene, we only need to query one tissue
    // here we arbitrarily pick Liver.
 */
export function parseJunctions(json){

    const attr = 'medianJunctionExpression';
    if(!json.hasOwnProperty(attr)) throw 'Parse Error: parseJunctions input error. ' + attr;

    // check required json attributes
    ['tissueSiteDetailId', 'junctionId'].forEach((d)=>{
        // use the first element in the json objects as a test case
        if(!json[attr][0].hasOwnProperty(d)){
            console.error(json[attr][0]);
            throw 'Parse Error: required junction attribute is missing: ' + d;
        }
    });
    return json[attr].filter((d)=>d.tissueSiteDetailId=='Liver')
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
 * returns a dictionary of transcript exon object lists indexed by transcript IDs -- ENST IDs
 */
export function parseExons(json){
    const attr = 'exon';
    if(!json.hasOwnProperty(attr)) throw 'Parse Error: required json attribute is missing: exon';
    return json[attr].reduce((a, d)=>{
        // check required attributes
        ['transcriptId', 'chromosome', 'start', 'end', 'exonNumber', 'exonId'].forEach((k)=>{
            if(!d.hasOwnProperty(k)) {
                console.error(d);
                throw 'Parse Error: required json attribute is missing: ' + k
            }
        });
        if (a[d.transcriptId] === undefined) a[d.transcriptId] = [];
        d.chrom = d.chromosome;
        d.chromStart = d.start;
        d.chromEnd = d.end;
        a[d.transcriptId].push(d);
        return a;
    }, {});
}

/**
 * parse transcript isoforms
 * @param data {Json} from GTEx web service 'reference/transcript?release=v7&gencode_id='
 * returns a list of isoform objects sorted by length in descending order
 */
export function parseTranscripts(json){
    const attr = 'transcript';
    if(!json.hasOwnProperty(attr)) throw('parseIsoforms input error');

    // check required attributes, use the first transcript as the test case
    ['transcriptId', 'start', 'end'].forEach((k)=>{
        if(!json[attr][0].hasOwnProperty(k)) {
            console.error(d);
            throw 'Parse Error: required json attribute is missing: ' + k
        }
    });

    return json[attr].sort((a, b)=>{
        const l1 = Math.abs(a.end - a.start) + 1;
        const l2 = Math.abs(b.end - b.start) + 1;
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


    // parse GTEx median junction read counts
    junctions.forEach((d) => {
        ['tissueSiteDetailId', 'junctionId', 'median', 'gencodeId'].forEach((k)=>{
            if (!d.hasOwnProperty(k)) {
                console.error(d);
                throw 'Parser Error: parseJunctionExpression attr not found: ' + k;
            }
        });
        let median = d.median;
        let tissueId = d.tissueSiteDetailId;
        d.tissueId = tissueId;
        d.id = d.gencodeId;
        d.x = d.junctionId;
        d.y = tissueId;
        d.value = useLog?Math.log10(Number(median + adjust)):Number(median);
        d.originalValue = Number(median);
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
    if(!data.hasOwnProperty(attr)) throw 'Parse Error: required json attribute is missing: ' + attr;
    const adjust = 1;
    // parse GTEx median gene expression
    // error-checking the required attributes:
    if (data[attr].length == 0) throw 'parseMedianExpression finds no data.';
    ['median', 'tissueSiteDetailId', 'gencodeId'].forEach((d)=>{
        if (!data[attr][0].hasOwnProperty(d)) {
            console.error(data[attr][0]);
            throw `Parse Error: required json attribute is missingp: ${d}`;
        }
    });
    let results = data[attr];
    results.forEach(function(d){
        d.value = useLog?Math.log10(Number(d.median) + adjust):Number(d.median);
        d.x = d.tissueSiteDetailId;
        d.y = d.gencodeId;
        d.originalValue = Number(d.median);
        d.id = d.gencodeId;
    });

    return results;
}

/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 */
export function parseGeneExpressionForViolin(data, useLog=true, colors=undefined){
    const attr = 'geneExpression';
    if(!data.hasOwnProperty(attr)) throw 'Parse Error: required json attribute is missing: ' + attr;
    data[attr].forEach((d)=>{
        ['data', 'tissueSiteDetailId', 'geneSymbol', 'gencodeId'].forEach((k)=>{
            if(!d.hasOwnProperty(k)){
                console.error(d);
                throw 'Parse Error: required json attribute is missing: ' + k;
            }
        });
        d.values = useLog?d.data.map((dd)=>{return Math.log10(+dd+1)}):d.data;
        d.group = d.tissueSiteDetailId;
        d.label = d.geneSymbol;
        d.color = colors===undefined?'#90c1c1':colors[d.gencodeId];
    });
    return data[attr];
}
