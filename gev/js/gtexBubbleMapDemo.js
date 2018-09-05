// var gene = 'NDRG4';
var gene = 'ENSG00000248746.1';
$(document).ready(function(){
    // gene search handling on the demo page
    var useRsId = false;
    var gtexMap = undefined;
    var proceed = function(gId, useRs){
        $('#bbGene').text(gId);
        var urls = {
            tissue: gtexBubbleMapConfig.getTissueUrl,
            gene: gtexBubbleMapConfig.getGeneUrl,
            eqtl: gtexBubbleMapConfig.getEqtlUrl,
            exons:gtexBubbleMapConfig.getExonsUrl,
            eqtlBoxplot: gtexBubbleMapConfig.getEqtlBoxplotUrl,
            ld: gtexBubbleMapConfig.getLDUrl
        };
        gtexMap = new gtexBubbleMap(gId, gtexBubbleMapConfig.build(gId), urls, useRs);
        gtexMap.launch();
    };
    proceed(gene);

    $('#bbGeneInput').keydown(function(e){
        if(e.keyCode == 13) {
            gene = $('#bbGeneInput').val().trim().toUpperCase();
            proceed(gene, useRsId);
        }
    });

    $('#useRsId').change(function(){
        if(this.checked){
            // the checkbox is now checked
            useRsId = true;
            gtexMap.changeXLabels(useRsId);

        } else {
            // the checkbox is no longer checked
            useRsId = false;
            gtexMap.changeXLabels(useRsId);
        }
    });
});

