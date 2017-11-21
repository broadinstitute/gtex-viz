export function getGtexUrls(){
    return {
        "geneExp": "https://gtexportal.org/rest/v1/dataset/featureExpression?feature=gene&gencode_id=",
        "tissue": "https://gtexportal.org/rest/v1/dataset/color",
        "medianGeneExp": getMedianTPMJson()
    }
}

export function getTissueClusters(dataset){
    const trees = {
        'top50Liver': "((((((((Heart_Atrial_Appendage:4.97,Brain_Spinal_cord_cervical_c-1:4.97):0.25,Brain_Nucleus_accumbens_basal_ganglia:5.22):1.68,Skin_Sun_Exposed_Lower_leg:6.90):1.81,(Small_Intestine_Terminal_Ileum:5.48,Brain_Cerebellar_Hemisphere:5.48):3.23):1.57,((Ovary:6.71,Adipose_Subcutaneous:6.71):1.69,Brain_Cortex:8.41):1.87):3.74,Cervix_Endocervix:14.02):4.60,((((Stomach:7.16,Esophagus_Mucosa:7.16):1.91,Brain_Cerebellum:9.07):1.61,((Heart_Left_Ventricle:5.35,Brain_Hippocampus:5.35):2.67,Thyroid:8.01):2.66):2.23,((((Brain_Frontal_Cortex_BA9:5.49,Artery_Aorta:5.49):1.51,Brain_Caudate_basal_ganglia:7.00):1.95,Pancreas:8.94):0.49,((((Vagina:6.14,Artery_Tibial:6.14):0.73,(((Prostate:4.95,Colon_Sigmoid:4.95):1.03,Artery_Coronary:5.98):0.14,(((((Spleen:4.53,Brain_Putamen_basal_ganglia:4.53):0.50,Brain_Substantia_nigra:5.03):0.11,(((Cells_Transformed_fibroblasts:4.38,Brain_Amygdala:4.38):0.15,(Bladder:3.63,Adrenal_Gland:3.63):0.89):0.15,Adipose_Visceral_Omentum:4.67):0.47):0.42,Cells_EBV-transformed_lymphocytes:5.57):0.31,((Skin_Not_Sun_Exposed_Suprapubic:4.92,Muscle_Skeletal:4.92):0.58,Breast_Mammary_Tissue:5.50):0.38):0.25):0.74):0.26,((((Whole_Blood:4.57,Esophagus_Gastroesophageal_Junction:4.57):1.07,Pituitary:5.63):0.33,Colon_Transverse:5.97):0.76,Brain_Anterior_cingulate_cortex_BA24:6.73):0.39):0.55,Minor_Salivary_Gland:7.67):1.77):3.47):5.71):6.03,((((Uterus:5.70,Esophagus_Muscularis:5.70):3.22,Lung:8.93):4.60,(((Testis:6.30,Fallopian_Tube:6.30):0.63,Brain_Hypothalamus:6.93):1.45,((Liver:4.77,Kidney_Cortex:4.77):2.06,Nerve_Tibial:6.83):1.55):5.15):0.52,Cervix_Ectocervix:14.05):10.60);"
    };
    return trees[dataset];
}

export function getGeneClusters(dataset){
    const trees = {
        'top50Liver': "(((((((ITIH4:3.11,CFB:3.11):0.51,ATF5:3.62):2.11,SAA1:5.73):1.76,(SERPINA3:4.56,C3:4.56):2.93):2.77,(((TF:5.18,APOC1:5.18):0.74,AGT:5.92):0.64,(RBP4:5.67,MT1G:5.67):0.89):3.70):3.53,((((((HPD:3.31,ALB:3.31):0.32,VTN:3.63):0.36,HP:3.99):0.66,(SERPINF2:3.20,CYP2E1:3.20):1.45):1.20,SERPINA1:5.86):1.25,(((APOA1:4.60,ALDOB:4.60):0.49,TTR:5.09):0.69,((((((((FGB:1.14,FGA:1.14):0.21,CRP:1.35):0.20,FGG:1.55):0.37,(ORM2:1.37,ORM1:1.37):0.55):0.70,HPX:2.61):0.56,APOC3:3.17):0.09,(((GC:1.06,APOH:1.06):0.67,((((SERPINC1:0.64,AHSG:0.64):0.20,APCS:0.84):0.14,APOA2:0.97):0.07,AGXT:1.04):0.69):0.70,(FGL1:1.20,AMBP:1.20):1.23):0.83):1.21,(SAA4:2.34,SAA2:2.34):2.13):1.31):1.33):6.68):11.57,((((MT2A:2.81,MT1X:2.81):2.01,(SERPING1:2.08,IGFBP4:2.08):2.74):3.43,APOE:8.24):3.11,(((TPT1:3.87,IFITM3:3.87):0.78,PEBP1:4.65):2.52,(MTATP6P1:3.41,FTL:3.41):3.75):4.18):14.01);"
    };
    return trees[dataset];
}

export function getMedianTPMJson(){
    // this should be an API call
    return "data/top50.genes.liver.genomic.median.tpm.json";
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
        d.originalValue = d.medianTPM;
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