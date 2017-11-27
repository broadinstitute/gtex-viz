export function getGtexUrls(){
    return {
        "geneExp": "https://gtexportal.org/rest/v1/dataset/featureExpression?feature=gene&gencode_id=",
        "tissue": "https://gtexportal.org/rest/v1/dataset/color",
        "liverGeneExp": "data/top50.genes.liver.genomic.median.tpm.json", // top 50 genes in GTEx liver
        "cerebellumGeneExp": "data/top.gtex.cerebellum.genes.median.tpm.tsv",
        "mayoGeneExp": "data/gtex+mayo.top.cerebellum_ad.genes.median.tpm.tsv" // the top 50 genes in Mayo Cerebellum_AD + their gtex expression values
    }
}

export function getTissueClusters(dataset){
    const trees = {
        'top50Liver': "((((((((Heart_Atrial_Appendage:4.97,Brain_Spinal_cord_cervical_c-1:4.97):0.25,Brain_Nucleus_accumbens_basal_ganglia:5.22):1.68,Skin_Sun_Exposed_Lower_leg:6.90):1.81,(Small_Intestine_Terminal_Ileum:5.48,Brain_Cerebellar_Hemisphere:5.48):3.23):1.57,((Ovary:6.71,Adipose_Subcutaneous:6.71):1.69,Brain_Cortex:8.41):1.87):3.74,Cervix_Endocervix:14.02):4.60,((((Stomach:7.16,Esophagus_Mucosa:7.16):1.91,Brain_Cerebellum:9.07):1.61,((Heart_Left_Ventricle:5.35,Brain_Hippocampus:5.35):2.67,Thyroid:8.01):2.66):2.23,((((Brain_Frontal_Cortex_BA9:5.49,Artery_Aorta:5.49):1.51,Brain_Caudate_basal_ganglia:7.00):1.95,Pancreas:8.94):0.49,((((Vagina:6.14,Artery_Tibial:6.14):0.73,(((Prostate:4.95,Colon_Sigmoid:4.95):1.03,Artery_Coronary:5.98):0.14,(((((Spleen:4.53,Brain_Putamen_basal_ganglia:4.53):0.50,Brain_Substantia_nigra:5.03):0.11,(((Cells_Transformed_fibroblasts:4.38,Brain_Amygdala:4.38):0.15,(Bladder:3.63,Adrenal_Gland:3.63):0.89):0.15,Adipose_Visceral_Omentum:4.67):0.47):0.42,Cells_EBV-transformed_lymphocytes:5.57):0.31,((Skin_Not_Sun_Exposed_Suprapubic:4.92,Muscle_Skeletal:4.92):0.58,Breast_Mammary_Tissue:5.50):0.38):0.25):0.74):0.26,((((Whole_Blood:4.57,Esophagus_Gastroesophageal_Junction:4.57):1.07,Pituitary:5.63):0.33,Colon_Transverse:5.97):0.76,Brain_Anterior_cingulate_cortex_BA24:6.73):0.39):0.55,Minor_Salivary_Gland:7.67):1.77):3.47):5.71):6.03,((((Uterus:5.70,Esophagus_Muscularis:5.70):3.22,Lung:8.93):4.60,(((Testis:6.30,Fallopian_Tube:6.30):0.63,Brain_Hypothalamus:6.93):1.45,((Liver:4.77,Kidney_Cortex:4.77):2.06,Nerve_Tibial:6.83):1.55):5.15):0.52,Cervix_Ectocervix:14.05):10.60);",
        'top50Cerebellum_AD': "(((((((Prostate:5.19,Colon_Sigmoid:5.19):2.74,Brain_Anterior_cingulate_cortex_BA24:7.93):2.73,Cervix_Ectocervix:10.66):0.91,((Esophagus_Mucosa:6.24,Brain_Cerebellar_Hemisphere:6.24):2.36,(Brain_Frontal_Cortex_BA9:5.54,Brain_Caudate_basal_ganglia:5.54):3.06):2.97):1.46,((((Thyroid:3.53,Heart_Left_Ventricle:3.53):2.93,Artery_Aorta:6.47):0.58,((Vagina:4.07,Adipose_Subcutaneous:4.07):1.40,Spleen:5.47):1.57):2.48,Stomach:9.52):3.51):4.48,(((((((Uterus:4.16,Artery_Coronary:4.16):0.48,Bladder:4.64):0.51,((((Brain_Hippocampus:2.54,Brain_Cortex:2.54):0.73,(Brain_Nucleus_accumbens_basal_ganglia:2.30,Brain_Hypothalamus:2.30):0.97):0.40,((Whole_Blood:2.63,Artery_Tibial:2.63):0.35,Liver:2.98):0.69):0.77,Minor_Salivary_Gland:4.44):0.71):0.89,(Small_Intestine_Terminal_Ileum:3.06,Esophagus_Gastroesophageal_Junction:3.06):2.99):0.53,(Testis:3.36,Heart_Atrial_Appendage:3.36):3.20):1.07,(Pancreas:5.69,Kidney_Cortex:5.69):1.95):3.03,(((((((((Mayo_Cerebellum:0.77,Mayo_Cerebellum_AD:0.77):1.13,Colon_Transverse:1.90):0.10,Brain_Putamen_basal_ganglia:2.01):0.60,Skin_Not_Sun_Exposed_Suprapubic:2.60):0.55,(Skin_Sun_Exposed_Lower_leg:2.42,Muscle_Skeletal:2.42):0.74):0.45,((Ovary:2.23,Cells_EBV-transformed_lymphocytes:2.23):0.75,(Mayo_Temporal_Cortex:0.65,Mayo_Temporal_Cortex_AD:0.65):2.33):0.63):0.59,(((Fallopian_Tube:2.92,Breast_Mammary_Tissue:2.92):0.15,Nerve_Tibial:3.07):0.16,(Brain_Substantia_nigra:2.23,Brain_Spinal_cord_cervical_c-1:2.23):1.00):0.97):0.91,(Esophagus_Muscularis:3.96,Brain_Cerebellum:3.96):1.14):1.01,Adipose_Visceral_Omentum:6.12):4.54):6.85):0.81,((((Pituitary:7.91,Cells_Transformed_fibroblasts:7.91):2.47,Lung:10.37):1.22,Adrenal_Gland:11.60):1.20,(Cervix_Endocervix:8.89,Brain_Amygdala:8.89):3.90):5.53);",
        'top50Cerebellum_gtex': "(((((((((Whole_Blood:4.58,Lung:4.58):1.30,Esophagus_Gastroesophageal_Junction:5.89):2.22,Muscle_Skeletal:8.11):0.55,Esophagus_Muscularis:8.66):1.31,Skin_Sun_Exposed_Lower_leg:9.96):1.99,Pituitary:11.96):2.19,((Minor_Salivary_Gland:9.60,Liver:9.60):1.04,(((Breast_Mammary_Tissue:5.99,Adrenal_Gland:5.99):0.58,Nerve_Tibial:6.58):2.14,Artery_Aorta:8.71):1.92):3.50):4.03,((((Prostate:6.71,Brain_Anterior_cingulate_cortex_BA24:6.71):2.26,(Small_Intestine_Terminal_Ileum:5.65,Esophagus_Mucosa:5.65):3.33):3.07,(Testis:5.54,Fallopian_Tube:5.54):6.50):1.47,(((Uterus:6.52,Brain_Hypothalamus:6.52):2.16,Stomach:8.67):2.02,(Heart_Left_Ventricle:6.75,Brain_Frontal_Cortex_BA9:6.75):3.94):2.82):4.66):3.86,(((((((((((Mayo_Cerebellum:0.59,Mayo_Cerebellum_AD:0.59):1.42,Cells_Transformed_fibroblasts:2.01):0.12,Cervix_Ectocervix:2.13):0.64,Skin_Not_Sun_Exposed_Suprapubic:2.77):0.40,Brain_Substantia_nigra:3.17):1.33,Heart_Atrial_Appendage:4.50):0.82,(((Brain_Nucleus_accumbens_basal_ganglia:2.44,Artery_Tibial:2.44):1.01,Pancreas:3.46):0.82,Vagina:4.28):1.04):0.95,((Brain_Cerebellar_Hemisphere:3.66,Adipose_Subcutaneous:3.66):0.47,(Brain_Spinal_cord_cervical_c-1:3.06,Bladder:3.06):1.06):2.15):2.53,(Brain_Cerebellum:5.76,Brain_Caudate_basal_ganglia:5.76):3.05):1.82,((((Kidney_Cortex:5.40,Brain_Amygdala:5.40):0.40,(((Cervix_Endocervix:2.49,Brain_Putamen_basal_ganglia:2.49):1.16,(Colon_Transverse:2.19,Colon_Sigmoid:2.19):1.46):1.17,Adipose_Visceral_Omentum:4.82):0.98):0.50,(Thyroid:3.70,Brain_Hippocampus:3.70):2.60):1.25,((Spleen:5.66,Brain_Cortex:5.66):0.59,(Mayo_Temporal_Cortex:0.55,Mayo_Temporal_Cortex_AD:0.55):5.69):1.31):3.07):1.95,((Ovary:4.77,Cells_EBV-transformed_lymphocytes:4.77):0.46,Artery_Coronary:5.23):7.34):9.45);"
    };
    return trees[dataset];
}

export function getGeneClusters(dataset){
    const trees = {
        'top50Liver': "(((((((ITIH4:3.11,CFB:3.11):0.51,ATF5:3.62):2.11,SAA1:5.73):1.76,(SERPINA3:4.56,C3:4.56):2.93):2.77,(((TF:5.18,APOC1:5.18):0.74,AGT:5.92):0.64,(RBP4:5.67,MT1G:5.67):0.89):3.70):3.53,((((((HPD:3.31,ALB:3.31):0.32,VTN:3.63):0.36,HP:3.99):0.66,(SERPINF2:3.20,CYP2E1:3.20):1.45):1.20,SERPINA1:5.86):1.25,(((APOA1:4.60,ALDOB:4.60):0.49,TTR:5.09):0.69,((((((((FGB:1.14,FGA:1.14):0.21,CRP:1.35):0.20,FGG:1.55):0.37,(ORM2:1.37,ORM1:1.37):0.55):0.70,HPX:2.61):0.56,APOC3:3.17):0.09,(((GC:1.06,APOH:1.06):0.67,((((SERPINC1:0.64,AHSG:0.64):0.20,APCS:0.84):0.14,APOA2:0.97):0.07,AGXT:1.04):0.69):0.70,(FGL1:1.20,AMBP:1.20):1.23):0.83):1.21,(SAA4:2.34,SAA2:2.34):2.13):1.31):1.33):6.68):11.57,((((MT2A:2.81,MT1X:2.81):2.01,(SERPING1:2.08,IGFBP4:2.08):2.74):3.43,APOE:8.24):3.11,(((TPT1:3.87,IFITM3:3.87):0.78,PEBP1:4.65):2.52,(MTATP6P1:3.41,FTL:3.41):3.75):4.18):14.01);",
        'top50Cerebellum_AD': "((((((HSP90AB1:6.34,CALM1:6.34):2.26,(((ATP6V1G2:5.24,ACTB:5.24):0.50,(((FTL:3.45,CALM2:3.45):0.56,(((NDRG2:2.21,TUBB4A:2.21):0.62,RPL13A:2.84):0.49,(LDHB:2.71,ITM2B:2.71):0.62):0.69):0.59,((HSPA8:2.22,PEBP1:2.22):1.14,CKB:3.36):1.25):1.13):0.42,((((RPS11:2.74,PSAP:2.74):0.57,AES:3.30):0.52,(((ENO2:2.01,RPL17:2.01):0.84,STMN2:2.86):0.43,(MT3:2.30,EIF4A2:2.30):0.99):0.53):0.27,ALDOC:4.09):2.07):2.44):1.87,MTATP6P1:10.47):1.59,((((ZBTB18:4.94,MALAT1:4.94):1.34,CPE:6.28):1.50,(RPS27A:5.78,HSP90AA1:5.78):2.00):0.85,((RPL21:6.07,RN7SK:6.07):0.80,EEF2:6.87):1.76):3.43):6.74,((RPL9:7.95,GFAP:7.95):3.82,(RPL5:7.81,RPS18:7.81):3.96):7.04):1.06,((((((RPL3:5.93,RPS25:5.93):0.79,GAPDH:6.72):3.04,CLU:9.75):2.95,RPS12:12.70):0.22,CDR1:12.92):3.58,(((((PRNP:3.50,RN7SL1:3.50):1.27,RPS13:4.77):1.24,(EEF1A1:4.46,RN7SL2:4.46):1.55):3.35,APOE:9.37):1.44,(RPL24:6.81,SNAP25:6.81):4.00):5.69):3.36);",
        'top50Cerebellum_gtex': "((((((PVALB:6.34,APOE:6.34):0.80,LINC00599:7.14):2.44,EIF4A2:9.58):4.12,(((PHYHIP:5.23,RPL3:5.23):1.49,STMN2:6.72):2.71,((HSPA8:4.47,ENO2:4.47):1.80,GFAP:6.26):3.17):4.27):4.36,(((PRRT2:9.94,CALM2:9.94):1.38,(GABRD:6.13,CBLN3:6.13):5.19):1.27,(((RPS25:5.89,AES:5.89):0.86,SNAP25:6.74):2.58,TMEM59L:9.32):3.27):5.47):4.67,((((((CPE:4.39,CLU:4.39):0.43,PEBP1:4.81):2.01,((CALM1:3.41,MTATP6P1:3.41):1.09,RPL13A:4.50):2.33):1.41,(((((SNRNP70:2.62,MTND2P28:2.62):0.65,HSP90AB1:3.27):1.49,RPS27A:4.76):0.83,CA11:5.58):0.72,((((((PSAP:1.98,TUBB4A:1.98):0.32,ATP6V1G2:2.30):0.66,GAPDH:2.96):0.30,EEF1A1:3.26):0.85,(ATP5B:2.79,EEF1A2:2.79):1.32):0.93,RPL17:5.04):1.25):1.94):3.86,((CALM3:3.60,ALDOC:3.60):3.64,PTMS:7.24):4.86):1.34,(((((RPL9:5.63,RPS12:5.63):1.67,RPS11:7.30):0.96,(CBLN1:5.61,EEF2:5.61):2.65):0.38,((SNCB:5.33,ACTB:5.33):1.61,CKB:6.94):1.70):0.65,(RPS18:6.23,FTL:6.23):3.06):4.15):9.28);"
    };
    return trees[dataset];
}

export function parseTissues(data){
    return data.color
}

export function parseMedianTPM(data, useLog=true){
    // parse GTEx median TPM json
    data.forEach(function(d){

        d.value = useLog?(d.medianTPM==0?0:Math.log2(+d.medianTPM + 0.1)):+d.medianTPM;
        d.x = d.tissueId;
        d.y = d.geneSymbol;
        d.originalValue = parseFloat(d.medianTPM);
        d.id = d.gencodeId;
    });
    return data;
}

export function parseGeneExpression(data, useLog=false, color="grey", xlist = []){
    let gene = data["featureExpression"][0];
    let x = [];
    let y = [];
    let xorder = xlist.length == 0? d3.keys(gene.genetpm):xlist;
    xorder.forEach((d)=>{
        // preparing for the plotly data structure of a grouped boxplot
        // reference: https://plot.ly/javascript/box-plots/
        // concatenates all the values of a tissue to the list values
        // concatenates a list of the tissue label repeatedly
        x = x.concat(Array(gene.genetpm[d]===undefined?0:gene.genetpm[d].length).fill(d));
        y = y.concat(gene.genetpm[d]===undefined?-1:gene.genetpm[d])
    });
    return {
        x: x,
        y: y,
        name: gene.name,
        type: 'box',
        line: {width:1},
        marker: {color:color},
    };

}
