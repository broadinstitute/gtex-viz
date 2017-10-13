function getTissueJson(){
    "use strict";
    return data/tissues.json
}

function getMedianTPMJson(){
    // return "data/genes.median.tpm.json";
    return "data/top100.genes.blood.median.tpm.json";
}

function getTissueClusters(){
    // const newick = "((((((((((Testis:0.68,Brain_Cerebellum:0.68):0.30,Prostate:0.98):0.17,(Brain_Nucleus_accumbens_basal_ganglia:0.78,Brain_Hypothalamus:0.78):0.36):0.31,Cervix_Ectocervix:1.45):0.35,Esophagus_Gastroesophageal_Junction:1.80):0.38,Pituitary:2.19):0.65,(((Brain_Putamen_basal_ganglia:0.83,Brain_Cortex:0.83):0.50,Skin_Not_Sun_Exposed_Suprapubic:1.32):0.51,Brain_Hippocampus:1.84):1.00):1.13,((((((Brain_Frontal_Cortex_BA9:0.47,Brain_Anterior_cingulate_cortex_BA24:0.47):0.20,Bladder:0.67):0.15,((Breast_Mammary_Tissue:0.47,Brain_Cerebellar_Hemisphere:0.47):0.15,Brain_Caudate_basal_ganglia:0.62):0.21):0.31,Esophagus_Mucosa:1.13):0.24,(Spleen:0.75,Colon_Sigmoid:0.75):0.63):0.48,(((Cells_Transformed_fibroblasts:0.26,Cells_EBV-transformed_lymphocytes:0.26):0.30,(Cervix_Endocervix:0.24,Brain_Spinal_cord_cervical_c-1:0.24):0.32):0.05,(((Brain_Substantia_nigra:0.15,Brain_Amygdala:0.15):0.09,Skin_Sun_Exposed_Lower_leg:0.25):0.24,Small_Intestine_Terminal_Ileum:0.48):0.13):1.24):2.11):2.90,(((Whole_Blood:1.14,Stomach:1.14):0.75,((((Uterus:0.66,Heart_Left_Ventricle:0.66):0.05,Kidney_Cortex:0.71):0.32,((Liver:0.38,Heart_Atrial_Appendage:0.38):0.19,Fallopian_Tube:0.57):0.45):0.06,Vagina:1.08):0.82):0.62,((Esophagus_Muscularis:1.25,Colon_Transverse:1.25):0.37,Thyroid:1.62):0.90):4.36):8.82,((((Artery_Coronary:1.04,Artery_Aorta:1.04):1.79,Adrenal_Gland:2.82):0.19,(Artery_Tibial:1.75,Adipose_Subcutaneous:1.75):1.27):1.19,(((((Pancreas:0.41,Adipose_Visceral_Omentum:0.41):0.22,Muscle_Skeletal:0.64):0.10,(Nerve_Tibial:0.51,Minor_Salivary_Gland:0.51):0.22):0.15,Ovary:0.88):0.91,Lung:1.79):2.41):11.48);";
    const newick = "((((((((((Brain_Caudate_basal_ganglia:4.42,Brain_Anterior_cingulate_cortex_BA24:4.42):3.48,Cervix_Endocervix:7.90):2.15,Cervix_Ectocervix:10.05):0.52,(Muscle_Skeletal:9.19,Liver:9.19):1.39):3.27,((((Kidney_Cortex:4.73,Breast_Mammary_Tissue:4.73):1.34,Brain_Spinal_cord_cervical_c-1:6.06):0.26,Vagina:6.32):2.92,(Small_Intestine_Terminal_Ileum:5.70,Adipose_Visceral_Omentum:5.70):3.53):4.61):7.34,(((Whole_Blood:7.69,Brain_Amygdala:7.69):1.90,(Brain_Substantia_nigra:6.48,Brain_Cerebellar_Hemisphere:6.48):3.11):4.14,(Fallopian_Tube:6.77,Artery_Aorta:6.77):6.96):7.46):3.87,((Heart_Atrial_Appendage:5.61,Brain_Frontal_Cortex_BA9:5.61):6.37,Testis:11.99):13.08):5.08,(Uterus:11.31,Prostate:11.31):18.84):14.53,(((Stomach:6.96,Nerve_Tibial:6.96):4.62,((Skin_Not_Sun_Exposed_Suprapubic:3.59,Ovary:3.59):2.75,Pancreas:6.34):5.24):4.79,(Skin_Sun_Exposed_Lower_leg:10.66,Pituitary:10.66):5.70):28.31):31.23,(((((((((Colon_Sigmoid:7.28,Adipose_Subcutaneous:7.28):0.91,Heart_Left_Ventricle:8.19):1.14,Cells_Transformed_fibroblasts:9.34):1.87,Brain_Hippocampus:11.20):2.21,(Lung:9.77,Esophagus_Gastroesophageal_Junction:9.77):3.65):3.89,Artery_Tibial:17.31):0.40,(Thyroid:12.34,Esophagus_Muscularis:12.34):5.37):5.01,((Spleen:8.11,Brain_Cerebellum:8.11):4.46,Brain_Cortex:12.58):10.14):12.60,(((((Brain_Nucleus_accumbens_basal_ganglia:8.48,Brain_Hypothalamus:8.48):3.94,Bladder:12.43):0.38,((Cells_EBV-transformed_lymphocytes:8.06,Adrenal_Gland:8.06):3.29,(Colon_Transverse:6.91,Brain_Putamen_basal_ganglia:6.91):4.44):1.46):2.01,Artery_Coronary:14.81):0.67,(Minor_Salivary_Gland:10.05,Esophagus_Mucosa:10.05):5.43):19.83):40.59);";
    return newick;
}

function getGeneClusters(){
    // const newick = "(((((SLC25A21:1.47,GAS6-AS1:1.47):1.53,SLC27A6:2.99):0.84,TMEM229A:3.83):2.34,((TMEM255B:2.47,TMEM106B:2.47):0.62,GAS6-AS2:3.08):3.09):7.25,(TMEM167B:4.53,GAS6:4.53):8.89);";
    const newick = "((((((FKBP8:4.52,CD74:4.52):0.57,((((IFITM2:2.40,PFN1:2.40):0.25,SAT1:2.65):0.49,((IFITM1:1.95,TAGLN2:1.95):0.53,ZYX:2.48):0.67):0.51,S100A11:3.66):1.43):1.17,(((((PSAP:1.33,OAZ1:1.33):1.00,ENO1:2.32):0.42,(ITM2B:1.82,CTSD:1.82):0.92):0.86,(((HLA-A:0.79,HLA-C:0.79):0.71,HLA-E:1.50):1.02,(HLA-B:1.16,B2M:1.16):1.35):1.09):1.18,((DUSP1:2.75,TXNIP:2.75):0.37,(S100A6:2.37,IFITM3:2.37):0.75):1.67):1.47):4.40,(((((ACTG1:1.23,EEF1A1:1.23):0.68,(((RPS11:0.55,RPS12:0.55):0.32,RPLP1:0.88):0.07,(RPS18:0.60,RPL13A:0.60):0.35):0.96):0.93,((((RPL19:0.48,RPS16:0.48):0.11,RPL8:0.59):0.50,EEF2:1.09):0.50,((RPL10:0.85,RPS2:0.85):0.09,(EEF1G:0.67,RPLP2:0.67):0.27):0.65):1.24):0.50,(((TMSB4X:1.58,FTH1:1.58):0.17,TMSB10:1.74):0.98,GAPDH:2.72):0.62):1.74,(FTL:2.49,ACTB:2.49):2.59):5.58):7.39,(((MT-ND5:0.65,MT-ND6:0.65):2.53,MT-RNR1:3.18):4.03,(((((MT-ND1:0.59,MT-ND2:0.59):0.27,(MT-ATP8:0.51,MT-CYB:0.51):0.36):0.55,(MT-ND4L:0.68,MT-ND3:0.68):0.74):0.86,MT-RNR2:2.27):0.64,((((MT-ATP6:0.34,MT-ND4:0.34):0.15,MT-CO3:0.49):0.13,MT-CO2:0.63):0.33,MT-CO1:0.96):1.95):4.30):10.84):13.44,((((((((SH3BGRL3:2.10,SLC25A39:2.10):1.00,(SRGN:2.05,ARHGDIB:2.05):1.05):0.60,((R3HDM4:1.65,RHOG:1.65):1.05,ACSL1:2.71):0.99):1.48,S100A4:5.17):1.56,(S100A9:4.39,S100A8:4.39):2.34):1.04,(HBB:3.24,HBA2:3.24):4.53):2.90,((((((GPSM3:1.53,CD53:1.53):0.32,(ALOX5AP:1.00,SPI1:1.00):0.85):0.59,LCP1:2.44):1.05,RAC2:3.49):1.36,LYZ:4.85):1.71,(((IFI30:2.34,LAPTM5:2.34):1.19,(FCER1G:1.54,TYROBP:1.54):1.99):0.79,((ARRB2:2.12,SLC2A3:2.12):1.30,CORO1A:3.42):0.90):2.24):4.12):3.32,(((((((FPR1:1.87,CSF3R:1.87):0.12,CST7:1.99):0.66,S100A12:2.65):0.50,HBA1:3.16):0.48,(((MNDA:1.76,NCF2:1.76):0.84,SELL:2.60):0.39,(VNN2:1.70,FCN1:1.70):1.29):0.65):1.47,SERPINA1:5.11):2.11,(((CXCR1:0.74,FCGR3B:0.74):1.60,HBD:2.34):0.88,HBQ1:3.22):4.01):6.77):17.50);";
    return newick;
}

function getGtexURLs(){
    return {
        "geneExp": "https://gtexportal.org/rest/v1/dataset/featureExpression?feature=gene&gencode_id=",
        "tissue": "https://gtexportal.org/rest/v1/dataset/color"
    }
}

function parseMedianTPM(data, useLog=true){
    // parse GTEx median TPM json
    data.forEach(function(d){

        d.value = useLog?(d.medianTPM==0?0:Math.log2(+d.medianTPM + 0.001)):+d.medianTPM;
        d.x = d.tissueId;
        d.y = d.geneSymbol;
        d.originalValue = d.medianTPM;
        d.id = d.gencodeId;
    });
    return data;
}

function parseTissue(data){
    return data.color
}

function parseGeneExpression(data, useLog=false, color="grey", xlist = []){
    let gene = data["featureExpression"][0];
    let x = [];
    let y = [];
    let xorder = xlist.length == 0? d3.keys(gene.genetpm):xlist;
    xorder.forEach((d)=>{
        // preparing for the plotly data structure of a grouped boxplot
        // reference: https://plot.ly/javascript/box-plots/
        // concatenates all the values of a tissue to the list values
        // concatenates a list of the tissue label repeatedly
        x = x.concat(Array(gene.genetpm[d].length).fill(d));
        y = y.concat(gene.genetpm[d])
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