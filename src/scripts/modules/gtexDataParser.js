export function getGtexUrls(){
    const host = "https://dev.gtexportal.org/rest/v1/";
    return {
        // "geneExp": "https://gtexportal.org/rest/v1/dataset/featureExpression?feature=gene&gencode_id=",
        "geneId": host + "reference/geneId?format=json&geneId=",
        "geneExp": host + "expression/geneExpression?datasetId=gtex_v7&gencodeId=",
        "tissue":  host + "dataset/color",
        "topInTissue": host + "expression/topExpressedGenes?datasetId=gtex_v7&filterMtGene=true&sort_by=median&sortDirection=desc&page_size=50&tissueId=",
        "medExpById": host + "expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&page_size=10000&gencodeId=",

        "junctionExp": host + "expression/junctionExpression?datasetId=gtex_v7&hcluster=true&gencodeId=",
        "geneModel": host + "reference/collapsedGeneModel?release=v7&gencode_id=",

        "liverGeneExp": "data/top50.genes.liver.genomic.median.tpm.json", // top 50 genes in GTEx liver
        "cerebellumGeneExp": "data/top.gtex.cerebellum.genes.median.tpm.tsv",
        "mayoGeneExp": "data/gtex+mayo.top.cerebellum_ad.genes.median.tpm.tsv" // the top 50 genes in Mayo Cerebellum_AD + their gtex expression values
    }
}

export function getTissueClusters(dataset){
    const trees = {
        'top50Liver': "(((((((((((((Brain_Nucleus_accumbens_basal_ganglia:0.65,Brain_Caudate_basal_ganglia:0.65):0.12,Brain_Putamen_basal_ganglia:0.77):0.18,Brain_Amygdala:0.95):0.48,((Brain_Frontal_Cortex_BA9:0.33,Brain_Cortex:0.33):0.47,Brain_Anterior_cingulate_cortex_BA24:0.80):0.63):0.36,((Brain_Hypothalamus:0.94,Brain_Hippocampus:0.94):0.47,Brain_Substantia_nigra:1.41):0.37):0.76,Brain_Spinal_cord_cervical_c-1:2.54):0.29,(Brain_Cerebellum:0.43,Brain_Cerebellar_Hemisphere:0.43):2.41):1.66,Testis:4.50):0.28,((((((((((((((((((Esophagus_Muscularis:0.34,Esophagus_Gastroesophageal_Junction:0.34):0.60,Colon_Sigmoid:0.95):0.44,Uterus:1.39):0.40,Bladder:1.79):0.12,((Vagina:1.29,Cervix_Ectocervix:1.29):0.30,Cervix_Endocervix:1.59):0.31):0.13,Colon_Transverse:2.03):0.20,Ovary:2.23):0.25,((Skin_Sun_Exposed_Lower_leg:0.60,Skin_Not_Sun_Exposed_Suprapubic:0.60):1.18,Esophagus_Mucosa:1.77):0.71):0.05,(Thyroid:1.87,Prostate:1.87):0.66):0.15,((((Artery_Coronary:1.24,Artery_Aorta:1.24):0.35,Nerve_Tibial:1.60):0.42,Artery_Tibial:2.01):0.27,Fallopian_Tube:2.29):0.39):0.41,Cells_Transformed_fibroblasts:3.09):0.06,Pituitary:3.15):0.23,Lung:3.37):0.08,((Heart_Left_Ventricle:1.97,Heart_Atrial_Appendage:1.97):1.29,Muscle_Skeletal:3.26):0.19):0.16,Stomach:3.61):0.27,Spleen:3.89):0.20,(((Breast_Mammary_Tissue:1.65,Adipose_Subcutaneous:1.65):0.45,Adipose_Visceral_Omentum:2.09):1.20,Minor_Salivary_Gland:3.29):0.79):0.08,Adrenal_Gland:4.17):0.60):0.56,(Small_Intestine_Terminal_Ileum:4.28,Kidney_Cortex:4.28):1.06):0.60,(Whole_Blood:4.38,Cells_EBV-transformed_lymphocytes:4.38):1.56):0.10,Pancreas:6.04):13.05,Liver:19.08);",
        'top50Cerebellum_gtex': "((((((Brain_Substantia_nigra:1.69,Brain_Hypothalamus:1.69):0.37,(((Brain_Putamen_basal_ganglia:0.75,Brain_Caudate_basal_ganglia:0.75):0.29,Brain_Nucleus_accumbens_basal_ganglia:1.03):0.17,(Brain_Hippocampus:0.77,Brain_Amygdala:0.77):0.43):0.86):0.21,(((Brain_Cortex_Mayo:0.55,Brain_Cortex_AD_Mayo:0.55):0.55,Brain_Anterior_cingulate_cortex_BA24:1.10):0.11,(Brain_Frontal_Cortex_BA9:0.77,Brain_Cortex:0.77):0.44):1.05):1.02,Brain_Spinal_cord_cervical_c-1:3.28):1.53,((Brain_Cerebellum:0.72,Brain_Cerebellar_Hemisphere:0.72):0.51,(Brain_Cerebellum_Mayo:0.59,Brain_Cerebellum_AD_Mayo:0.59):0.65):3.57):3.41,((((Pancreas:3.77,Liver:3.77):0.29,Whole_Blood:4.06):0.40,((Heart_Left_Ventricle:1.92,Heart_Atrial_Appendage:1.92):0.81,Muscle_Skeletal:2.73):1.73):0.07,((((((((((((Uterus:1.03,Fallopian_Tube:1.03):0.57,Prostate:1.60):0.22,((Artery_Tibial:1.09,Artery_Aorta:1.09):0.10,Artery_Coronary:1.19):0.62):0.13,(((((Breast_Mammary_Tissue:0.73,Adipose_Visceral_Omentum:0.73):0.22,Adipose_Subcutaneous:0.95):0.43,Lung:1.38):0.23,Thyroid:1.61):0.10,(((Cervix_Endocervix:0.64,Cervix_Ectocervix:0.64):0.29,Vagina:0.93):0.64,Bladder:1.57):0.14):0.23):0.32,((Esophagus_Muscularis:0.37,Esophagus_Gastroesophageal_Junction:0.37):0.89,Colon_Sigmoid:1.25):1.01):0.11,Nerve_Tibial:2.37):0.09,((((Small_Intestine_Terminal_Ileum:1.43,Colon_Transverse:1.43):0.29,Stomach:1.73):0.19,(Minor_Salivary_Gland:1.44,Esophagus_Mucosa:1.44):0.47):0.22,(Skin_Sun_Exposed_Lower_leg:0.63,Skin_Not_Sun_Exposed_Suprapubic:0.63):1.51):0.33):0.31,Ovary:2.77):0.34,(Spleen:2.72,Kidney_Cortex:2.72):0.39):0.46,(Testis:3.06,Adrenal_Gland:3.06):0.50):0.61,(Cells_Transformed_fibroblasts:3.47,Cells_EBV-transformed_lymphocytes:3.47):0.71):0.23,Pituitary:4.41):0.12):3.68);",
        'top50Cerebellum_AD': "(((((((((((((((((((Vagina:0.64,Cervix_Ectocervix:0.64):0.25,Cervix_Endocervix:0.89):0.36,Bladder:1.25):0.24,(((Breast_Mammary_Tissue:0.73,Adipose_Visceral_Omentum:0.73):0.07,Adipose_Subcutaneous:0.80):0.39,Lung:1.19):0.30):0.01,Thyroid:1.50):0.15,((Uterus:0.88,Fallopian_Tube:0.88):0.34,Prostate:1.22):0.43):0.14,((Artery_Coronary:1.05,Artery_Aorta:1.05):0.18,Artery_Tibial:1.23):0.55):0.37,((Esophagus_Muscularis:0.37,Esophagus_Gastroesophageal_Junction:0.37):0.81,Colon_Sigmoid:1.19):0.97):0.07,(((Minor_Salivary_Gland:1.44,Esophagus_Mucosa:1.44):0.39,(Skin_Sun_Exposed_Lower_leg:0.54,Skin_Not_Sun_Exposed_Suprapubic:0.54):1.30):0.14,((Small_Intestine_Terminal_Ileum:1.43,Colon_Transverse:1.43):0.16,Stomach:1.60):0.37):0.25):0.36,Ovary:2.59):0.28,Spleen:2.86):0.25,Nerve_Tibial:3.11):0.29,(Testis:2.72,Adrenal_Gland:2.72):0.68):0.10,((((Heart_Left_Ventricle:1.81,Heart_Atrial_Appendage:1.81):0.68,Kidney_Cortex:2.49):0.62,Muscle_Skeletal:3.11):0.20,Pancreas:3.31):0.18):0.22,Pituitary:3.71):0.73,Liver:4.44):0.05,(Cells_Transformed_fibroblasts:3.59,Cells_EBV-transformed_lymphocytes:3.59):0.90):0.64,Whole_Blood:5.14):2.17,((((Brain_Cerebellum_Mayo:0.77,Brain_Cerebellum_AD_Mayo:0.77):1.09,(Brain_Cortex_Mayo:0.65,Brain_Cortex_AD_Mayo:0.65):1.21):0.44,(Brain_Cerebellum:0.92,Brain_Cerebellar_Hemisphere:0.92):1.38):0.85,((((((Brain_Hippocampus:0.58,Brain_Amygdala:0.58):0.36,Brain_Nucleus_accumbens_basal_ganglia:0.94):0.02,(Brain_Putamen_basal_ganglia:0.57,Brain_Caudate_basal_ganglia:0.57):0.39):0.33,(Brain_Substantia_nigra:0.89,Brain_Hypothalamus:0.89):0.39):0.19,((Brain_Cortex:0.78,Brain_Anterior_cingulate_cortex_BA24:0.78):0.23,Brain_Frontal_Cortex_BA9:1.01):0.46):0.69,Brain_Spinal_cord_cervical_c-1:2.17):0.98):4.15);"
    };
    return trees[dataset];
}

export function getGeneClusters(dataset){
    const trees = {
        'top50Liver': "(((((((MT2A:2.81,MT1X:2.81):1.63,PEBP1:4.44):0.77,(TPT1:3.87,IFITM3:3.87):1.34):0.89,((SERPING1:2.08,IGFBP4:2.08):2.29,C3:4.36):1.75):1.04,APOE:7.15):1.92,(MTATP6P1:3.41,FTL:3.41):5.65):6.96,((((RBP4:5.67,MT1G:5.67):0.22,((TF:5.18,APOC1:5.18):0.43,AGT:5.62):0.28):0.66,((((((ITIH4:3.11,CFB:3.11):0.50,ATF5:3.61):0.55,(SERPINF2:3.20,CYP2E1:3.20):0.97):0.79,SERPINA1:4.96):0.35,SERPINA3:5.30):0.28,SAA1:5.59):0.98):0.99,(((((((HPD:3.31,ALB:3.31):0.26,VTN:3.57):0.20,(((((((((FGB:1.14,FGA:1.14):0.15,CRP:1.29):0.14,FGG:1.43):0.16,((((((SERPINC1:0.64,AHSG:0.64):0.16,APCS:0.80):0.07,APOA2:0.87):0.12,AGXT:0.98):0.35,ORM2:1.33):0.02,(GC:1.06,APOH:1.06):0.29):0.23):0.40,(FGL1:1.20,AMBP:1.20):0.78):0.11,ORM1:2.10):0.23,SAA4:2.33):0.34,APOC3:2.67):0.07,HPX:2.74):1.03):0.28,APOA1:4.04):0.14,(SAA2:3.73,HP:3.73):0.46):0.12,TTR:4.30):0.42,ALDOB:4.73):2.82):8.47);",
        'top50Cerebellum_AD': "((((((((PRNP:2.82,CALM1:2.82):0.74,NDRG2:3.57):0.25,CPE:3.82):0.22,CKB:4.03):1.10,APOE:5.13):0.77,(((ZBTB18:2.45,RN7SK:2.45):1.36,(RN7SL2:1.42,RN7SL1:1.42):2.39):0.40,(ENO2:3.29,ALDOC:3.29):0.92):1.69):2.70,(((((((((HSPA8:1.36,HSP90AA1:1.36):0.08,(EIF4A2:1.23,AES:1.23):0.21):0.72,LDHB:2.16):0.20,ITM2B:2.36):0.09,(PEBP1:1.99,CALM2:1.99):0.45):0.32,MALAT1:2.76):1.47,CLU:4.23):0.25,((((PSAP:1.47,HSP90AB1:1.47):0.35,(((RPS25:0.89,EEF2:0.89):0.41,RPL3:1.30):0.09,(((((RPS27A:0.60,RPL9:0.60):0.08,RPL17:0.68):0.11,RPS13:0.79):0.03,RPL5:0.82):0.16,(RPL24:0.43,RPL21:0.43):0.55):0.42):0.43):0.87,GAPDH:2.69):0.12,((((RPS18:0.62,RPL13A:0.62):0.12,(RPS12:0.59,RPS11:0.59):0.15):0.47,EEF1A1:1.21):1.08,ACTB:2.29):0.52):1.67):1.30,(MTATP6P1:3.49,FTL:3.49):2.29):2.83):5.85,(((((STMN2:2.71,ATP6V1G2:2.71):0.73,SNAP25:3.45):0.28,TUBB4A:3.72):0.41,CDR1:4.13):0.34,(MT3:3.04,GFAP:3.04):1.44):9.97);",
        'top50Cerebellum_gtex': "(((((((ENO2:3.29,ALDOC:3.29):0.84,((PHYHIP:2.68,CA11:2.68):0.58,PRRT2:3.25):0.88):1.10,CPE:5.24):1.69,EEF1A2:6.93):0.47,APOE:7.40):1.12,(((((((TMEM59L:2.32,ATP6V1G2:2.32):0.67,STMN2:2.99):0.36,SNAP25:3.35):0.43,TUBB4A:3.78):0.67,((LINC00599:1.89,GABRD:1.89):1.53,SNCB:3.41):1.03):0.87,GFAP:5.31):1.45,((PVALB:3.57,CBLN1:3.57):1.27,CBLN3:4.84):1.92):1.76):5.74,(((MTATP6P1:3.49,FTL:3.49):1.08,((((PSAP:1.47,HSP90AB1:1.47):0.45,(((RPS25:0.89,EEF2:0.89):0.40,((RPS27A:0.60,RPL9:0.60):0.08,RPL17:0.68):0.60):0.03,RPL3:1.32):0.61):0.70,GAPDH:2.62):0.13,((((RPS18:0.62,RPL13A:0.62):0.12,(RPS12:0.59,RPS11:0.59):0.15):0.47,EEF1A1:1.21):1.08,ACTB:2.29):0.46):1.82):0.83,((CLU:4.08,CKB:4.08):0.29,((((SNRNP70:1.90,PTMS:1.90):0.42,(((EIF4A2:1.23,AES:1.23):0.22,HSPA8:1.45):0.35,ATP5B:1.80):0.52):0.61,(CALM3:1.68,CALM1:1.68):1.26):0.14,((PEBP1:1.99,CALM2:1.99):0.31,MTND2P28:2.30):0.78):1.28):1.03):8.86);"
    };
    return trees[dataset];
}

export function parseTissues(data){
    const attr = "color";
    if(!data.hasOwnProperty(attr)) throw "parseTissues input error.";
    return data[attr];
}

export function parseExons(data){
    const attr = "collapsedGeneModel";
    if(!data.hasOwnProperty(attr)) throw "parseExons input error.";
    return data[attr]
}

export function parseMedianExpression(json, useLog=true){
    const attr = "medianGeneExpression";
    if(!json.hasOwnProperty(attr)) throw "parseMedianExpression input error.";
    const adjust = 1;
    // parse GTEx median gene expression
    json.medianGeneExpression.forEach(function(d){
        // TODO: error-checking of the attributes
        d.value = useLog?Math.log10(Number(d.median) + adjust):Number(d.median);
        d.x = d.tissueId;
        d.y = d.gencodeId;
        d.originalValue = Number(d.median);
        d.id = d.gencodeId
    });
    return json[attr];
}

export function parseMedianTPM(data, useLog=true){
    // parse GTEx median TPM json static file
    data.forEach(function(d){
        d.value = useLog?Math.log10(+d.medianTPM + 1):+d.medianTPM;
        d.x = d.tissueId;
        d.y = d.geneSymbol;
        d.originalValue = parseFloat(d.medianTPM);
        d.id = d.gencodeId;
    });
    return data;
}

export function parseJunctionExpression(json, useLog=true){
    const attr = "junctionExpression";
    if(!json.hasOwnProperty(attr)) throw("parseJunctionExpression input error");
    // parse GTEx median junction counts
    const adjust = 1;
    json.junctionExpression.forEach(function(d){
        // TODO: add json attr error-checking
        d.value = useLog?Math.log10(Number(d.data) + adjust):+Number(d.data);
        d.x = d.junctionId;
        d.y = d.tissueId;
        d.originalValue = Number(d.data);
        d.id = d.gencodeId
    });
    return json[attr];
}

function parseGeneExpression(gencodeId, data){
    /**
     *
     * @type {{exp: {}, geneSymbol: string}}
     */
    let lookupTable = {
        exp: {}, // indexed by tissueId
        geneSymbol: ""
    };
    data.geneExpression.forEach((d)=>{
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
 *
 * @param gencodeId {String}: a gencode ID
 * @param data {Object} gene expression API call
 * @param useLog {Boolean}
 * @param color {String}
 * @param xlist {List}: a list of tissue objects {id:String, name:String}
 * @returns {{x: Array, y: Array, name: string, type: string, line: {width: number}, marker: {color: string}}}
 */

export function makeJsonForPlotly(gencodeId, data, useLog=false, color="grey", xlist){

    // reference: https://plot.ly/javascript/box-plots/

    let lookupTable = parseGeneExpression(gencodeId, data); // constructs the tissue lookup table indexed by tissue ID
    let x = [];
    let y = [];

    // xlist: the tissues
    xlist.forEach((d)=>{
        // d: a tissue
        if (lookupTable.exp[d.id]===undefined){
            // when the gene has no expression data in tissue d,
            // provide dummy data
            x = x.concat([d.name]);
            y = y.concat([-1]);
        } else {
            // concatenate a list of the tissue label repeatedly (lookupTable.exp[d].length times) to x
            // concatenate all the expression values to y
            // the number of elements in x and y must match
            x = x.concat(Array(lookupTable.exp[d.id].length).fill(d.name));
            y = y.concat(lookupTable.exp[d.id]);
        }
    });
    return {
        x: x,
        y: y,
        name: lookupTable.geneSymbol,
        type: 'box',
        line: {width:1},
        marker: {color:color},
    };

}
