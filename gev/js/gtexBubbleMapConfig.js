var gtexBubbleMapConfig = (function(){

    // var serverHost = 'https://dev.gtexportal.org/rest/';
    var serverHost = 'https://gtexportal.org/rest/';
    var serverVersion = 'v1';

    var roadmap = {
        'NDRG4': {
            beds: ['data/regions_prom_Heart_LV_E095.bed', 'data/regions_prom_Heart_RightAtrium_E104.bed', 'data/regions_dyadic_Heart_LV_E095.bed', 'data/regions_dyadic_Heart_RightAtrium_E104.bed'],
            labels:['Promoters:Heart Left Ventricle', 'Promoters:Heart Right Atrium','Dyadic regions:Heart Left Ventricle','Dyadic regions:Heart Right Atrium']
        },
        'CHRNA5': {
            beds: ['data/regions_prom_Heart_LV_E095.bed', 'data/regions_prom_Heart_RightAtrium_E104.bed', 'data/regions_dyadic_Heart_LV_E095.bed', 'data/regions_dyadic_Heart_RightAtrium_E104.bed'],
            labels:['Promoters:Heart Left Ventricle', 'Promoters:Heart Right Atrium','Dyadic regions:Heart Left Ventricle','Dyadic regions:Heart Right Atrium']
        },
        'CHRNA3': {
            beds: ['data/regions_prom_Heart_LV_E095.bed', 'data/regions_prom_Heart_RightAtrium_E104.bed', 'data/regions_dyadic_Heart_LV_E095.bed', 'data/regions_dyadic_Heart_RightAtrium_E104.bed'],
            labels:['Promoters:Heart Left Ventricle', 'Promoters:Heart Right Atrium','Dyadic regions:Heart Left Ventricle','Dyadic regions:Heart Right Atrium']
        }
    };

    var config = {
        id: 'eqtlBubbles', // <g> ID
        rootDiv: 'gtexBB', // the root <div>
        bbMapDiv: 'bbMap', // <div>, where the bubbleMap goes
        bbMapCanvasDiv: 'bbMapCanvas',
        ldCanvasDiv: 'ldCanvas',
        dialogDiv: 'bbMap-dialog',
        legendDiv: 'bbLegends', // <div>, where the legend goes
        modalDiv: 'bbMap-modal',
        tooltipId: 'bbTooltip', // <div>, where the tooltip is
        infoDiv: 'bbInfo',

        padding: {left:280, top:60},
        width: undefined, // let the program calculate the width
        height: undefined, // the program calculates the height dynamically

        yLabelShow: true,
        yLabelOrient: 'left',
        xLabelOrient: 'bottom',
        colorMax:1, // this sets the default value to render by the defined color.  Here, 'max' is somewhat incorrect because higher value is still rendered and scaled properly by the color scale

        colorTitle: 'Color Range (NES)',
        radiusTitle: 'Bubble Size in Zoom ViewPort (-log10(P-value))',
        ldTitle: 'Linkage Disequlibrium',

        dataType: 'diverging',
        serverHost: serverHost,

        badgeData:{}, // for storing tissue sample counts

        zoomN: 80,
        zoomCellW: 15,

        ldCutoff: 0.1
    };

    var build = function(gene){
        //TODO: rendering roadmap data .
        // config.files = {
        //     //roadmap:roadmap[gene]['beds']||undefined // Roadmap promoter annotation for heart LV
        // };
        //config.roadmapLabel = roadmap[gene]['labels'];

        return config;
    };

    var buildPlotvizConfig = function(x, y){
        return {
            width:250,
            height:250,
            outlierJitter:0.5,
            leftAxisLabel:'Rank Norm. Express.',
            margin:{top:0,left:5,right:5,bottom:0},
            titleContent: x + ' ' + y,
            leftLabelX: 0,
            viewerLeftSpacing: 0.30,
            viewerBottomSpacing: 0,
            tickRotation: 0,
            tickAlign: 'middle',
            tickTranslation: 0
        };
    };

    function getEqtlUrl(geneId){
        if (geneId.startsWith('ENSG')){
            return serverHost + serverVersion + '/association/singleTissueEqtl?gencodeId=' + geneId;
        }
        else {
            return serverHost + serverVersion + '/association/singleTissueEqtl?geneSymbol=' + geneId;
        }
    }

    function getGeneUrl(geneId){
        return serverHost + serverVersion + '/reference/gene?geneId=gencodeVersion=v19&genomeBuild=GRCh37%2Fhg19&geneId=' + geneId;
    }

    function getTissueUrl(){
        return serverHost + serverVersion + '/dataset/tissueSummary';
    }

    function getExonsUrl(geneId){
        if (!geneId.startsWith('ENSG')) {
            console.error('Exon query requires a gencodeId.');
        }
        return serverHost + serverVersion + '/reference/exon?datasetId=gtex_v7&gencodeId=' + geneId;
    }

    function getEqtlBoxplotUrl(){
        return serverHost + serverVersion + '/association/dyneqtl'
    }

    var getLDUrl = function(gene){
        return serverHost + serverVersion + '/dataset/ld?gencodeId=' + gene.gencodeId;
    };

    return {
        build: build,
        plotviz: buildPlotvizConfig,
        getTissueUrl: getTissueUrl,
        getEqtlUrl: getEqtlUrl,
        getExonsUrl: getExonsUrl,
        getEqtlBoxplotUrl: getEqtlBoxplotUrl,
        getLDUrl: getLDUrl,
        getGeneUrl: getGeneUrl
    }
})();
