/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var gtexBubbleMapDataUtil = (function(){
    // API json parsers
    var parseGene = function(json, geneId){
        // parses gtex url: host + apiVersion + '/geneId/' + geneId;
        var gene;
        if (json.gene.length == 1) { // expect the ajax to return a single gene
            gene = json.gene[0];
        }
        else if(json.gene.length > 1){
            // multiple gene ID matches can occur if the gene Id is a gene symbol
            var _matchBySymbol = function(g){ // if so, look for the exact match
                var re = new RegExp(geneId + '$', 'i');
                if (re.test(g.geneSymbol)) {
                    gene = g;
                }
            };
            json.gene.forEach(_matchBySymbol);
        }

        if (typeof gene == 'undefined') {
            alert("Query gene not found: " + geneId);
            throw("Gene not found");
        }
        return gene;

    };

    var generateShortVariantId = function(id){
        var temp = id.split("_");
        if(temp[2].length == 1 && temp[3].length == 1) return id;
        if(temp[2].length > temp[3].length) {
            temp[2] = "del";
            temp.splice(3, 1); // delete the alt
        }
        else if(temp[3].length > temp[2].length) {
            temp[3] = "ins";
            temp.splice(2, 1); // delete the ref
        }
        else { // temp[3].length == temp[2].length and temp[3].length > 1
            temp[3] = "sub";
            temp.splice(2, 1); // delete the ref
        }
        return temp.join("_");
    };

    var parseEqtl = function(json, tss){
        // parses gtex url: host + apiVersion + '/singleTissueEqtl?geneId=' + geneId + '&tissueName=All';
        var key = 'singleTissueEqtl';
        var mat = {
            x:[],
            y:[],
            data: [], // a list of data objecs as defined below
            snp: {} // a hash indexed by snp ID, value is a snp data object as defined below
        };

        if (!json.hasOwnProperty(key)) throw "Json structure parsing error.";

        if(json[key].length == 0){
            console.warn("Eqtl json structure returns no data for this gene");
            return undefined;
        }

        // json[key] array data structure error-checking
        // use the first element in the json[key] array
        ['tissueSiteDetailId', 'snpId', 'variantId', 'pos', 'pValue', 'nes'].forEach(function(d){
            if (!json[key][0].hasOwnProperty(d)) throw 'Required attribute ' +  d + ' does not exist.';
        });
        json[key].forEach(function(d){
            var tissue = d.tissueSiteDetailId;
            var snpId = d.snpId;
            var variantId = d.variantId;
            var truncatedVariantId = generateShortVariantId(d.variantId);
            var start = d.pos;
            var p = d.pValue;
            var effectsize = d.nes;
            var snpData = {
                variantId: variantId,
                truncatedVariantId: truncatedVariantId,
                rsId: snpId,
                pos:parseInt(start),
                dist: parseInt(start) - parseInt(tss) // TSS distance, can be negative
            };
            var x = variantId;
            var data = {
                x:x,
                y:tissue,
                variantId: variantId,
                truncatedVariantId: truncatedVariantId,
                rsId: snpId,
                value: parseFloat(effectsize).toPrecision(3), // the effect size
                r: -(Math.log(p)/Math.log(10)).toPrecision(3) // the -log10(p-value)
            };

            if(mat.y.indexOf(tissue) == -1) mat.y.push(tissue);
            if(mat.x.indexOf(x) == -1) mat.x.push(x); // this could be an issue if the snpID is not unique
            if (mat.snp[x] === undefined) mat.snp[x] = snpData;

            mat.data.push(data);
        });

        // sort mat.y (the tissues) alphabetically
        mat.y.sort(function(a,b){
            return a<b?-1:1;
        });

        // sort mat.x (the SNPs) by tss distance
        mat.x.sort(function(a,b){
            return mat.snp[a].pos<mat.snp[b].pos?-1:1; // positions should never be identical, so the a==b is ignored here...
        });

        // TODO: is this still needed?
        mat.xlab = mat.x.map(function(x){
            return x;
        });
        return mat;
    };

    var parseTissue = function(rawJson){
        // parses URL: host + apiVersion + '.2/tissues';
        var json = {};
        rawJson.tissueSummary.forEach(function (tissueEntry, i, arr) {
            json[tissueEntry.tissueSiteDetailId] = tissueEntry;
        });
        var tissues = {};
        d3.keys(json).forEach(function(k){
            var v = json[k];
            tissues[k] = v.rnaSeqAndGenotypeSampleCount;
        });
        return tissues;
    };

    var parseExon = function(json){
        // parses the exon web service
        if (!json.hasOwnProperty('exon')) throw 'Json structure of the exons is not recognized.';
        else {
            return json.exon;
        }
    };

    var parseLD = function(json){
        var ld = {};
        json.forEach(function(d){
            var id = d.snp1.split(',')[0] + d.snp2.split(',')[0];
            ld[id] = parseFloat(d.r2);
        });
        return ld;
    };

    return {
        parseGene: parseGene,
        parseEqtl: parseEqtl,
        parseTissue: parseTissue,
        parseExon: parseExon,
        parseLD: parseLD
    }
})();

