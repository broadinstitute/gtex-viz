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

function parseGeneExpression(data, useLog=true){
    console.log(data);
}