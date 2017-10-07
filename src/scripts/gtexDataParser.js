function parseMedianTPM(data, useLog=true){
    // parse GTEx median TPM json
    data.forEach(function(d){
        d.value = useLog?Math.log2(+d.medianTPM):+d.medianTPM;
        d.x = d.tissueId;
        d.y = d.geneSymbol;
        d.originalValue = d.medianTPM;
    });
    return data;
}