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


// bubbleMapUtil module contains functions that can be independently used for other projects besides bubbleMap
var bubbleMapUtil = (function(){
    var colorStock = {
        // reference: http://colorbrewer2.org/
        blues: ['rgb(247,251,255)','rgb(222,235,247)','rgb(198,219,239)','rgb(158,202,225)','rgb(107,174,214)','rgb(66,146,198)','rgb(33,113,181)','rgb(8,81,156)','rgb(8,48,107)'],
        reds: ['rgb(255,245,240)','rgb(254,224,210)','rgb(252,187,161)','rgb(252,146,114)','rgb(251,106,74)','rgb(239,59,44)','rgb(203,24,29)','rgb(165,15,21)','rgb(103,0,13)'],
        greys: ['rgb(255,255,255)','rgb(37,37,37)','rgb(0,0,0)'],
        oranges: ['rgb(255,245,235)','rgb(254,230,206)','rgb(253,208,162)','rgb(253,174,107)','rgb(253,141,60)','rgb(241,105,19)','rgb(217,72,1)','rgb(166,54,3)','rgb(127,39,4)'],
        greens: ['rgb(247,252,245)','rgb(229,245,224)','rgb(199,233,192)','rgb(161,217,155)','rgb(116,196,118)','rgb(65,171,93)','rgb(35,139,69)','rgb(0,109,44)','rgb(0,68,27)'],
        purples: ['rgb(252,251,253)','rgb(239,237,245)','rgb(218,218,235)','rgb(188,189,220)','rgb(158,154,200)','rgb(128,125,186)','rgb(106,81,163)','rgb(84,39,143)','rgb(63,0,125)'],

        // more options
        steelblues:['#f7fafc','#dee9f2','#c6d9e9','#adc8df','#95b8d6','#7da8cc','#6497c3','#4c87b9','#4076a3','#36648B'],

        // categorical
        '6class': ['#f7fafc','#809d79','#e66c54','#f5bd49','#7bb67f','#7c65ff'],

        // diverging
        bluered: ['#0571b0','#f7f7f7','#ca0020']
    };

    var checkDataIntegrity = function(mat){
        // data integrity
        if (mat === undefined) {
            throw 'Fatal Error: mat must be defined';
        }
        if (mat.x === undefined || mat.x.length == 0) {
            throw 'Fatal Error. mat.x must be provided';
        }
        if (mat.y === undefined || mat.y.length == 0) {
            throw 'Fatal Error. mat.y must be provided';
        }
        if (mat.data === undefined || mat.data.length == 0) {
            throw 'Fatal Error. mat.data must be provided';
        }

    };

    var setOrdinalScale = function(args){
        // this is used to set the X and Y scales
        return d3.scale.ordinal()
            .rangeBands(args.range, .1, 1)
            .domain(args.domain);
    };

    var setRscale = function(radius, max){
        //var max = d3.max(plot.mat.data, function(d){return d.r});
        if (max === undefined) max = 15; //hard-coded, global setting
        return d3.scale.sqrt() // for bubble heatmap, the bubble size (i.e. area)  ==> r (needs to use the square root function)
                        .domain([0, max])
                        .range([0, radius]);
    };

    var setCscale = function(dataType, data, max){
        var domain = [];
        var colors;
        switch(dataType){
            case 'diverging':
                max = max === undefined?d3.max(data, function(d){return Math.abs(d.value)}):max; // hmm, here data must be a list of objects with a key named 'value'
                domain = [-max, 0, max];
                colors = 'bluered';
                break;
            default:
                max = max === undefined?d3.max(data, function(d){return d.value}):max;
                domain = [0, max];
                colors = 'steelblues';
        }
        var range = colorStock[colors];
        return d3.scale.linear()
                        .domain(domain)
                        .range(range);
    };

    var createSvg = function(div, args, id, style){
        if(div === undefined) throw "Must provide svg DOM ID";
        if (args === undefined) args = {};
        var svgW = args.width===undefined?$("#" + div).width():args.width;
        var svgH = args.height===undefined?200:args.height;// TODO: hard-coded default value
        var svg = d3.select('#'+div).append('svg').attr({
            width: svgW,
            height: svgH
        });
        if(id !== undefined) svg.attr('id', id);
        if(style !== undefined) svg.style(style);
        return svg;
    };

    var makeColumnLabels = function(g, data, scale, ypos){
        var id = 'xLabel';
        var style = {
            'font-size': 12,
            'font-family': 'arial',
            'fill': '#aaa'
        };
        var gg = g.select('#'+id);
        gg = gg.empty()?g.append('g').attr('id',id):gg; // for easier transformation event handling
        var angle = -90;

        var _rotate = function(d){
            var x = scale(d) + 4;
            return 'translate('+x +','+ypos+') rotate(' + angle + ')'
        };

        // rendering
        var cols = gg.selectAll('.xlab').data(data, function(d){return d});
        cols.enter().append('text').text(function(d){return d});
        cols.exit().remove();

        cols.attr({
                    x: 0,
                    y: 0,
                    'class': 'xlab',
                    'col': function(d){return d},
                    'text-anchor': 'end'

                })
                .attr(style)
                .attr('transform', _rotate);
        return cols;
    };

    var makeRowLabels = function(g, data, scale, onLeft, xadjust, yadjust){
        var id = 'yLabel';
        var style = {
            'font-size': 12,
            'font-family': 'arial',
            'fill': '#aaa'
        };
        var gg = g.select('#'+id); // d3 <g>
        gg = gg.empty()?g.append('g').attr('id',id):gg;

        // helper functions

        var findLast = function(){
            return scale(data[data.length-1]);
        };

        // d3 rendering
        var rows = gg.selectAll('text').data(data, function(d){return d});
        rows.enter().append('text').text(function(d){return d});
        rows.exit().remove();
        rows.attr({
                    x: function(){
                        if (onLeft) {
                            return 0 + xadjust;
                        }
                        return findLast() + xadjust;
                    },
                    y: function(d){
                        if (yadjust !== undefined) {
                            return scale(d) + yadjust;
                        }

                        return (2/3)*scale.rangeBand()
                    },
                    'text-anchor': function(){
                        if (onLeft) {
                            return 'end'
                        }
                        return 'start'
                    },
                    'row': function(d){return d}
                })
                .attr(style)
                .classed('ylab', true);

        return rows;
    };

    var makeColumnMarkers = function(args){
        var id = 'xMarkerGroup'; // TODO: review hard-coded dependency
        var gg = args.g.select('#'+id);
        gg = gg.empty()?args.g.append('g').attr('id', id):gg;
        if (args.data === undefined) return;
        var scale = args.xscale;
        var data = args.data;

        var getX = function(d){return scale(d)};
        var myClass = 'xMarker';
        var markers = gg.selectAll('.' + myClass).filter(function(){return !d3.select(this).classed('sortMarker')}).data(data, function(d){return d});
        markers.enter().append('path');
        markers.exit().remove();
        markers.attr({
                d: d3.svg.symbol().type("triangle-down"),
                'class': myClass,
                'fill': 'none',
                col: function(d){return d}

            })
            .attr('transform', function(d){return 'translate('+getX(d)+','+args.markerAdjust+') scale(0.75)'});
        return markers;
    };

    var makeCircles = function(g, scale, data){
        var circles = g.selectAll('.dcircle').data(data, function (d) {return d.x + d.y});
        circles.enter().append('circle');
        circles.exit().remove();
        circles.attr({
            cx: function (d) {return scale.X(d.x).toFixed(2);},
            cy: function (d) {return scale.Y(d.y).toFixed(2);},
            r: function (d) {return scale.R(d.r).toFixed(2);},
            fill: function (d) {
                var toFilter = d.filters? d3.values(d.filters).filter(function(d){return d}):[];
                return toFilter.length>0?'#eee':scale.C(d.value);
            },
            'class': function () {return 'dcircle';}, // TODO: hard-coded dom class
            col: function (d) {return d.x},
            row: function (d) {return d.y}
        });
    };

    var makeLegend = function (div, title, radiusTitle, scale, cellW) {
        // TODO: hard-coded...
        $('#' + div).html("");
        var dim = {
            width: 450,
            height: 60
        };
        var svg = createSvg(div, dim);

        // legend title
        var g = svg.append('g').attr('id', '#cLegend');
        var initX = 10;
        var initY = 20;
        g.append('text')
            .text(title)
            .attr({
                x: initX,
                y: initY,
                'font-size': 10,
                fill: 'black'
            });

        // rectangles
        var w = cellW;
        var data = d3.range(-1.0, 1.2, 0.2);
        initX += 10;
        initY += 10;
        var colors = [];
        g.selectAll('rect')
            .data(data)
            .enter()
            .append('rect')
            .attr({
                width: w,
                height: w,
                x: function (d, i) {return initX + i * w},
                y: initY,
                fill: function (d) {
                    colors.push(scale.C(d));
                    return scale.C(d)
                }
            });
        data = data.map(function (d) {
            return d.toFixed(1)
        });

        // axis labels
        g.selectAll('.clabels')
            .data(data)
            .enter()
            .append('text')
            .text(function (d) {
                return d
            })
            .attr({
                x: function (d, i) {return initX + i * w + 2},
                y: initY + 10 + w,
                'font-size': 6,
                fill: function (d, i) {return i % 2 == 1 ? 'black' : '#aaa'}
            });

        // radius (bubble size) legend
        g = svg.append('g').attr('id', '#rLegend');
        initX -= 10;
        initY -= 10;
        initX = initX + (data.length + 2) * w;
        g.append('text')
            .text(radiusTitle)
            .attr({
                x: initX,
                y: initY,
                'font-size': 10,
                fill: 'black'
            });

        // bubbles
        //var maxR = d3.max(data, function (d) {
        //    return d.r
        //});
        data = [30, 20, 10, 5, 2, 1]; // hard-coded!

        initX += 10;
        initY += 10;

        g.selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr({
                cx: function (d, i) {return initX + i * w},
                cy: initY + (w / 2),
                fill: scale.C(-1),
                r: function (d) {
                    return scale.R(d)
                }
            });

        // axis labels
        initX -= 5; // adjusting the X position, kind of a hack...
        g.selectAll('.rlabels')
            .data(data)
            .enter()
            .append('text')
            .text(function (d) {
                return d
            })
            .attr({
                x: function (d, i) {return initX + i * w},
                y: initY + 10 + w,
                'font-size': 6,
                fill: 'black'
            });
    };

    var createDialog = function(parentDivId, dialogDivId, title){
        // jquery UI dialog
        var template = '' +
            '<div id="' + dialogDivId + '" title="' + title + '">' +
                '<div class="bbMap-clear">Clear All</div>' +
                '<div class="bbMap-content"></div>' +
            '</div>';

        var $modal = $('#' + parentDivId).append(template);
        $('#' + dialogDivId).dialog({
            autoOpen: false,
            'position': [20,20]
        });
        $('#' + dialogDivId).dialog('moveToTop');

       $('.bbMap-clear').click(function(){
            $('.bbMap-content').empty();
        });

    };

    var createCanvas = function(div, width, height, margin, className){

        d3.select('#' + div).select('canvas').remove(); // remove existing canvas
        if(className !== undefined) d3.select('#' + div).classed(className, true);
        var canvas = d3.select('#' + div).style('position', 'relative')
            .append('canvas')
            .attr({
                width: width + margin,
                height: height + 10 //TODO: remove hard-coded...
            })
            .style(
                {position: 'absolute'}
            );
        return canvas;
    };

    var renderCanvas = function(canvas, scale, data){ // this is for the mini bubble heatmap
        var context = canvas.node().getContext('2d');

        // background
        context.fillStyle = '#fff';
        context.rect(0, 0, canvas.attr('width'), canvas.attr('height'));
        context.fill();

        // no data binding
        data.forEach(function(d){
            var filterlist = d.filters?d3.values(d.filters).filter(function(d){return d}):[]; // if any of the values is true, then the data point is to be filtered
            context.beginPath();
            context.fillStyle = filterlist.length>0?'#eee':scale.C(d.value);
            context.arc(scale.X(d.x), scale.Y(d.y), scale.R(d.r), 0, 2*Math.PI);
            context.fill();
            context.closePath();
        });
    };

    var createBrush = function(scale, ext, svg, height){

        // create a brush
        var brush = d3.svg.brush()
            .x(scale.X) // move only along the x axis
            .extent(ext);


        svg.append('g')
            .attr('id', 'bbrush')// TODO: hard-coded id name
            .call(brush)
            .selectAll('rect')
            .attr('height', height)
            .style({
                 'stroke-width': 0,
                 opacity: 0.30
            });
        return brush;

    };

    return {
        // data related
        checkDataIntegrity: checkDataIntegrity,
        setOrdinalScale: setOrdinalScale,
        setCscale: setCscale,
        setRscale: setRscale,

        // D3
        createSvg: createSvg,
        makeRowLabels: makeRowLabels,
        makeColumnLabels: makeColumnLabels,
        makeColumnMarkers: makeColumnMarkers,
        makeCircles: makeCircles,
        makeLegend: makeLegend,

        // jQuery UI
        createDialog: createDialog,

        // canvas
        createCanvas: createCanvas,
        renderCanvas: renderCanvas,

        // brush
        createBrush: createBrush
    }
})();


var bubbleMap = function(mat, config) {
    var self = this;

    /* bubbleMap's mat has the following json structure
     mat = {
         y:[]
         x:[]
         data:[ // a list of the following data object
             {
                 x:xLabel,
                 y:yLabel,
                 value:value, // color range
                 r: value2 // bubble size (i.e. the area of the circle)
            },
            ...
         ]
     }
     */
    var svgDivId = config.bbMapDiv;
    var mat = mat; // mutable
    var padding = config.padding;
    var height, width;
    var cellW = config.zoomCellW||15;
    var cellH = cellW;

    this.svg; // should use a getter
    this.scale;
    this.zoomGroup = undefined;
    this.bubbleEvents = {};
    this.id = config.id;
    this.tooltip;

    // prototype functions
    this.init = function () {
        var top = (config.needMini)?parseInt(d3.select('#' + config.bbMapCanvasDiv).select('canvas').attr('height')):50;
        d3.select('#' + svgDivId).attr('style', 'position: relative; top:' + top + 'px;' );
        this.svg = bubbleMapUtil.createSvg(svgDivId);
        setParams(); // TODO: review
        this.draw(false);
    };

    this.getPadding = function(){
        return padding;
    };

    this.getCellSize = function(){
        return cellW;
    };

    this.draw = function(isUpdate){
        setScales(); // Note: bubbleMap has a radius scale that determines the size of the bubbles
        if(isUpdate) checkHeight();
        render(isUpdate);
    };

    this.update = function(newmat, state){
        var isUpdate = true;
        mat = newmat;

        this.draw(isUpdate);
    };

    // private functions
    function setParams() {
        bubbleMapUtil.checkDataIntegrity(mat);

        // tooltip
        self.tooltip = new toolTip(self.svg, config.tooltipId);


        if (padding === undefined) {
            padding = {left: 0, top: 0};
        }
        else {
            ['top', 'left'].forEach(function (d) {
                if (padding[d] === undefined) padding[d] = 0;
            });
        }
        // height = self.svg.attr('height') - (padding.top); // bubble map's height
        checkHeight();
        width = config.width=== undefined? self.svg.attr('width') - (padding.left*2):config.width - (padding.left*2);
    }

    function checkHeight(){
        // adjusting the heatmap and svg height based on data

        // adjust svg according to the zoomMap
        var _adjustMapH = function(){
            var l = mat.y.length;
            if (self.scale === undefined) setScales();
            var h = self.scale.Y.rangeBand() * l;
            return h;
            // return h > height?h:height;
        };

        var _adjustSvgH = function(){
            var columnLabelSpace = 220; // TODO: remove hard-coded values
            //if(config.needMini) padding.top = padding.top + parseInt(d3.select('#' + config.bbMapCanvasDiv).select('canvas').attr('height'));

            // var h = height + (padding.top*2) + columnLabelSpace;
            return _adjustMapH() + padding.top*2 + columnLabelSpace;
            // var svgH = self.svg.attr('height');
            // return h >svgH? h:svgH;
        };

        // height = _adjustMapH();
        height = _adjustMapH();
        self.svg.attr('height', _adjustSvgH());
    }

    function setScales(){
        self.scale = {
            X:bubbleMapUtil.setOrdinalScale({
                range: [0, cellW * mat.x.length], // NOTE: this range is for the entire heat map, not just the partial map that's visible
                domain: mat.x
            }),
            Y: bubbleMapUtil.setOrdinalScale({
                range: [0, (cellW * mat.y.length) + 50], // NOTE: this is not the SVG height
                domain: mat.y
            }),
            C: bubbleMapUtil.setCscale(config.dataType, mat.data, 1),
            R: bubbleMapUtil.setRscale(cellW/2, 30)
        }
    }

    function render(update) {
        var zoomId = config.id + 'Zoom';
        if(!update) {
            self.zoomGroup = self.svg.append('g')
                .attr({
                    'id': zoomId
                });
            var initX = padding.left;
            var initY = padding.top;
            self.zoomGroup.attr('transform', 'translate(' + initX + ',' + initY + ')');
            bubbleMapUtil.makeLegend(config.legendDiv, config.colorTitle, config.radiusTitle, self.scale, cellW);

        }

        var ypos = self.scale.Y(mat.y[mat.y.length - 1]) + (2.5 * self.scale.Y.rangeBand());
        bubbleMapUtil.makeColumnLabels(self.zoomGroup, mat.x, self.scale.X, ypos);
        bubbleMapUtil.makeRowLabels(self.zoomGroup, mat.y, self.scale.Y, true, -24, 4);
        bubbleMapUtil.makeCircles(self.zoomGroup, self.scale, mat.data);

    }

};


var bubbleMapBrush = function(svgId, source, target, config){
    // this is a brush that moves along the x-axis

    var self = this;
    var width, height; // canvas width
    var brush;

    this.xlist;

    this.svg;
    this.actions = [];
    this.scale = source.scale; // this is the mini scale

    this.defaultRange = function(){
        return this.scale.X.domain().slice(0, config.zoomN)
    };

    this.update = function(scale){
        if(typeof scale !== 'undefined') this.create(scale); // keep the brush range as is
        else this.create()
    };

    this.addEvent = function(callback){
        this.actions.push(callback);
    };

    this.create = function(scale) {
        if(typeof scale !== 'undefined'){
            this.scale = scale;
        }
        width = source.canvas.attr('width'); // canvas width
        height = source.canvas.attr('height'); // canvas height
        this.xlist = this.defaultRange();

        var head = this.xlist[0];
        var tail = this.xlist[this.xlist.length - 1];
        var ext = [self.scale.X(head), self.scale.X(tail)];
        var _clearSvg = function () {
            d3.select('#' + svgId).remove(); // make sure to drop existing brush}

        };
        _clearSvg();
        var style = {
                border: '1px solid #eee',
                position: 'absolute',
                'z-index': '500'
            };
        self.svg = bubbleMapUtil.createSvg(config.bbMapCanvasDiv, {width: width, height: height}, svgId, style);
        //// TODO: review
        brush = bubbleMapUtil.createBrush(self.scale, ext, self.svg, height);
        // brush event
        brush.on('brush', function () {
            self.brushEvent(brush.extent());
        });

        // update target
        moveTarget();

    };

    this.brushEvent = function (ext) { // ext is a list, start and stop positions of the brush range

        if (typeof ext == 'undefined') ext = brush.extent();
        if (ext[0] - ext[1] == 0) { // this handles the single clicking event of the brush on canvas
            var winSize = config.zoomN / 2;
            var dist = self.scale.X.rangeBand() * winSize;
            ext = [ext[0] - dist < 0 ? 0 : ext[0] - dist, (ext[0] + dist) > width ? width : (ext[0] + dist)]; // center the brush around the clicked position
            brush.extent(ext); // force updates the brush's extent
            self.svg.select('#bbrush').call(brush); // recreate the brush with the new extent
        }

        this.xlist = self.scale.X.domain().filter(function (d) {
            return (ext[0] <= self.scale.X(d)) && (ext[1] >= self.scale.X(d))
        });

        // check target's SVG width
        var width = this.xlist.length * target.getCellSize() + target.getPadding().left;
        if (width > parseInt(target.svg.attr('width'))) {
            target.svg.attr('width', width); // adjust the svg width according to the brush
        }

        moveTarget();
    };

    function moveTarget() {

        var zoomId = config.id + 'Zoom'; // the same as target.zoomGroup?

        var _brushRange = function(){
            d3.select('#'+zoomId).selectAll('.dcircle').classed('hide', true);
            d3.select('#'+zoomId).selectAll('.xlab').classed('hide', true);
            d3.select('#'+zoomId).selectAll('.xMarker').classed('hide',true);
            d3.select('#'+zoomId).selectAll('.ldbox').classed('hide',true);
            d3.select('#'+zoomId).selectAll('.ldline').classed('hide',true);

            self.xlist.forEach(function(d){
                var col = '[col="'+d+'"]';
                d3.select('#'+ zoomId).selectAll('circle'+col).classed('hide', false);
                d3.select('#'+ zoomId).selectAll('rect'+col).classed('hide', false);
                d3.select('#'+ zoomId).selectAll('.xlab'+col).classed('hide', false);
                d3.select('#'+zoomId).selectAll('.xMarker'+col).classed('hide',false);
                d3.select('#'+zoomId).selectAll('.ldbox'+col).classed('hide',false);
                d3.select('#'+zoomId).selectAll('.ldline'+col).classed('hide',false);
            });
        };
        _brushRange();
        var x = (-target.scale.X(self.xlist[0]) + target.scale.X.rangeBand()).toFixed(3);
        var _move = function(d){
            d.attr({'transform': 'translate('+ x +',0)'});
        };
        target.zoomGroup.selectAll('.dcircle').call(_move);
        // update the <g> of xlabels
        d3.select('#' + zoomId + ' ' + '#xLabel' ).call(_move);
        d3.select('#' + zoomId + ' ' + '#xMarkerGroup').call(_move);
        d3.selectAll('#' + zoomId + ' ' + '.additionalRow').call(_move);

        // other customized brush events
        self.actions.forEach(function(action){
            action(x);
        });
    }
};


var bubbleMapMini = function(mat, config){
    //bubbleMap.call(this, mat, config, _mat); // bubbleMapMini calls bubbleMap as its prototype
    var self = this;
    var mat = mat;
    //this._mat = _mat||mat;
    var minCellW = 2;
    var maxCellW = 5;
    var minH = 40; // TODO: get rid of hard-coded value
    var cellW, cellH;
    var height = config.height;
    var width = config.width;

    this.canvas;
    this.scale = {};

    this.init = function(){
        bubbleMapUtil.checkDataIntegrity(mat);
        setDimensions();
        setScales();
        render();
    };


    this.update = function(data){
        mat = data;
        setDimensions();
        setScales();
        render();
    };

    function render(){
        // TODO: what is the best way to rerender canvas?
        self.canvas = bubbleMapUtil.createCanvas(config.bbMapCanvasDiv, width, height, cellW*2, 'bbMap-canvas');
        bubbleMapUtil.renderCanvas(self.canvas, self.scale, mat.data);
    }

    function setDimensions(){
        var _initConfigWidth = function(){
            if (typeof width == "undefined") return $('#' + config.bbMapCanvasDiv).width()*0.8; // default to an arbitrary value
            return width;
        };
        var _setCellW = function () {
            var l = mat.x.length;
            var w = width / l;
            var min = minCellW;
            var max = maxCellW;
            return (w < min) ? min : ((w > max) ? max : w);
        };
        var _adjust = function () {
            var w = cellW * mat.x.length;
            return (w > width) ? w : width;
        };
        width = _initConfigWidth();
        cellW = _setCellW();

        width = _adjust(); // re-adjust config.width

        // height
        cellH = cellW;
        height = cellH * mat.y.length>minH?cellH * mat.y.length:minH;

    }
    function setScales(){
        self.scale = {
            X: bubbleMapUtil.setOrdinalScale({
                range: [0, width],
                domain: mat.x
            }),
            Y: bubbleMapUtil.setOrdinalScale({
                range: [15, height], // hard-coded
                domain: mat.y
            }),
            C: bubbleMapUtil.setCscale(config.dataType, mat.data, 1), // hard-coded max value
            R: bubbleMapUtil.setRscale(cellW/2) // maxR = self.config.cellW/2
        };
    }

};


var toolTip = function(svg, id){
    this.svg = svg;
    this.id = id;
    var self = this;

    this.show = function(info, x, y){
        move(x, y);
        $('#'+self.id).show();
        $('#'+self.id).html(info); // TODO: get rid of jquery style

        d3.select("#" + self.id)
            .transition()
            .duration(200)
            .style('opacity',1.0); // a div element
    };
    this.hide = function(){
        move();
        d3.select("#" + self.id)
            .transition()
            .duration(50)
            .style('opacity',0.0); // a div element
    };
    var move = function(x,y){
        if(x === undefined){
            x = d3.event.pageX; // TODO: get rid of the hard-coded adjustment
            y = d3.event.pageY;
        }
        x = x + 15;
        y = y - 50;
        $('#'+self.id).css({left:x+"px", top:y+"px"});
    };
};


// TODO: test config integrity and required fields
var gtexBubbleMap = function(geneId, config, urls, useRsId){
    // this module is for the bubbleMap of the GTEx single-tissue eQTL data
    var self = this;
    var verbose = false;

    var gene = undefined;
    var snp;
    var mat = {
        y:[],
        x:[],
        data:[],
        snp: {},
        xlab: [] // for display purposes
    };
    var TISSUES = [];
    var DATA = [];

    var bMap, bMapMini, bMapBrush;
    var dataFilters = {
        r: { // pvalue
            func: undefined,
            value: undefined
        },
        value: { // effect size
            func: undefined,
            value: undefined
        },
        ld: { // linkage disequilibrium
            func: undefined,
            value: undefined
        }
    };

    var xLabelMouseOverEvents = []; // for adding the column labels' mouse-over events
    var xLabelMouseOutEvents = [];

    this.querying = geneId;

    this.getGeneId = function(){return geneId}; // is this used?

    this.launch = function(){
        // clear DOM from pre-existing bubble map
        clear(config.bbMapDiv, config.infoDiv, config.bbMapCanvasDiv);

        gene = undefined; // reset previously stored this.gene object (if stored) to undefined // why? how is this possible?

        // nested ajax calls
        if(verbose) console.info(urls.gene(geneId));
        d3.json(urls.gene(geneId), function(error, gjson){ // api call to retrieve the gene and its TSS position
            if(gjson === undefined) {
                hideSpinner();
                throw "Fatal Error: Gene data retrieval failed";
            }
            gene = gtexBubbleMapDataUtil.parseGene(gjson, geneId);
            if(verbose) {
                console.info(gene);
                console.info(urls.eqtl(geneId));
            }
            // error checking
            // if (gene.geneSymbol.toUpperCase() != self.querying.toUpperCase()) {
            //     console.error("Fatal error: gene query didn't return the right query ID.");
            //     return
            // }

            d3.json(urls.eqtl(geneId), function(err, eqtlJson){ // retrieve single-tissue eQTL data of the query gene
                if(eqtlJson === undefined) {
                    hideSpinner();
                    throw "Fatal Error: eQTL data retrieval failed";
                }

                mat = gtexBubbleMapDataUtil.parseEqtl(eqtlJson, gene.tss);
                if (mat === undefined) {
                    $('#'+config.rootDiv).html("No eQTL data found for " + geneId);
                    throw "No eQTL data found. Visualization terminated.";
                }
                TISSUES = mat.y.slice(0);
                DATA = mat.data.slice(0);
                hideSpinner();
                setMini();
                render();
            });
        });

    };

    this.changeXLabels = function(userRsId){
        if(userRsId){
            bMap.zoomGroup.selectAll('.xlab')
                .each(function(){
                    var varId = $(this).attr("col");
                    $(this).text(mat.snp[varId].rsId);
                });
        }
        else {
             bMap.zoomGroup.selectAll('.xlab')
                .each(function(){
                    var varId = $(this).attr("col");
                    $(this).text(mat.snp[varId].truncatedVariantId);
                });
        }
    };

    function setMini(){
        // rendering the bubbleMap
        config.needMini = mat.x.length > config.zoomN;
    }

    function clear(){
        d3.select('#' + config.bbMapDiv).selectAll('*').remove(); // clear existing SVG
        d3.select('#' + config.bbMapCanvasDiv).selectAll('*').remove();
        d3.select('#' + config.ldCanvasDiv).selectAll('*').remove();
        showSpinner();

        $('#bbSnpSearch').val(''); // TODO: hard-coded
        $('#pvalueSlider').val(0);
        $('#pvalueLimit').val(0);
        $('#effectSizeSlider').val(0);
        $('#effectSizeLimit').val(0);
        $('#filterInfo').hide();
        $('#'+config.infoDiv).html('');

        config.ldData = undefined;
    }

    function render(){
        if(config.needMini){
            bMapMini = new bubbleMapMini(mat, config);
            bMapMini.init();
        }

        bMap = new bubbleMap(mat, config);
        bMap.init();
        self.changeXLabels(false);
        if(config.needMini){
            // create a mini map of the eqtl matrix
            bMapBrush = new bubbleMapBrush('bbrushSvg', bMapMini, bMap, config);
            // create the brush of the pre-defined zoomed range on the mini map
            bMapBrush.create();
        }

        addCustomFeatures();
    }

    function addCustomFeatures(){
        // text summary table
        updateSummary();

        // the boxplot modal
        bubbleMapUtil.createDialog(config.rootDiv, config.dialogDiv, 'eQTL Boxplot');

        // the tissue select functionality
        addTissueSelect();

        // Sorting and mouse events
        bMap.svg.on('mouseout', function(){bMap.tooltip.hide();});
        addXLabelMouseEvents();
        addBubbleMouseEvents();
        addSortTissueByAlphaBetButton();
        addSnpSearch(); // Add SNP text search functionality
        addDataFilters(); // Add p-value and effect size filtering
        addTissueBadges(); // render external data
        addSiteMarkers(); // TSS and TES
        addTssDist();
        addLD();

        // update the brush
        // this is a crucial step: for the brush to also apply to the external data and graphical components
        if (config.needMini) bMapBrush.brushEvent();

    }

    function rerender(state){
        var _resetMarkers = function(){
            d3.selectAll('#xMarkerGroup').selectAll('.xMarker').transition().attr({'fill':'none'});
        };
        _resetMarkers();
        switch(state){
            case 'dataFilter': // superficial visual filtering, which doesn't change the underlying structure of self.mat
                if(config.needMini) bMapMini.update(mat, state);
                bMap.update(mat, state);
                if(config.needMini) bMapBrush.brushEvent();
                break;
            case 'ldFilter':
                drawLD();
                break;
            case 'sort': // essentially the order of mat.y has changed
                if(config.needMini) bMapMini.update(mat, state);
                bMap.update(mat, state);
                addTissueBadges();
                if(config.needMini) bMapBrush.brushEvent();
                break;
            default:
                // when the self.mat dimensions are changed, such is the case of state == 'tissueSelect'
                // the execution order of the steps is important
                updateSummary();
                if(config.needMini) bMapMini.update(mat, state);
                bMap.update(mat, state);
                if (bMapBrush) {
                    bMapBrush.update(bMapMini.scale);
                }

                addSnpSearch(state);
                addSiteMarkers(state);
                addTissueBadges();
                addTssDist();
                addLD();
                if(snp !== undefined) sortTissuesBySnp(snp);
                if(config.needMini) bMapBrush.brushEvent();
        }
        var _markSnp = function(){
            // mark the selected SNP's column
            if(snp !== undefined) {
                var _draw = function(g, scale){

                    g.select('#xMarkerGroup').selectAll('.sortMarker').remove();
                    g.select('#xMarkerGroup').append('path')
                        .attr({
                            d: d3.svg.symbol().type("triangle-down"),
                            fill: '#000',
                            col: snp
                        })
                        .classed('xMarker sortMarker', true)
                        .attr('transform', function(d){return 'translate(' + scale.X(snp) + ',' + 0 + ')'});


                };
                _draw(bMap.zoomGroup, bMap.scale);
                _draw(bMapBrush.svg, bMapMini.scale);
                bMap.zoomGroup.select('#xLabel').selectAll('.xlab')
                    .attr('font-weight', undefined).filter(function (d) {
                        return d == snp
                    }).transition().attr({'fill': 'black', 'font-weight': 'bold'})
            }
        };
        if(snp !== undefined) _markSnp(); // sort by a specific SNP
    }

    function hideSpinner(){
        $('#fountainTextG').hide(); // hide the spinner
    }

    function showSpinner(){
        $('#fountainTextG').show(); // hide the spinner
    }

    function mouseOverColumn(d){
        // highlight the bar
        var colSelect = '[col="' + d + '"]';
        var col2Select = '[col2="' + d + '"]';
        d3.selectAll('.ldLine').classed('bubbleMouseover', false);
        d3.selectAll('circle'+colSelect).classed('bubbleMouseover', true);
        d3.select('#tssrow').selectAll('rect'+colSelect).classed('bubbleMouseover', true);
        d3.select('#ldwrapper').selectAll('rect'+colSelect).style({'stroke-width': 2, stroke:'#aaa'});
        d3.select('#ldwrapper').selectAll('rect'+col2Select).style({'stroke-width': 2, stroke:'#aaa'});
        d3.selectAll('.xlab'+colSelect).classed('textMouseover', true);
        d3.selectAll('.ldLine' + colSelect).classed('bubbleMouseover', true);
    }

    function mouseOutColumn (d){
        var colSelect = '[col="' + d + '"]';
        var col2Select = '[col2="' + d + '"]';
        d3.selectAll('circle'+colSelect).classed('bubbleMouseover', false);
        d3.selectAll('rect'+colSelect).classed('bubbleMouseover', false);
        d3.select('#ldwrapper').selectAll('rect'+colSelect).style({'stroke-width': 0});
        d3.select('#ldwrapper').selectAll('rect'+col2Select).style({'stroke-width': 0});

        d3.selectAll('.xlab'+colSelect).classed('textMouseover', false);
        d3.selectAll('.ldLine' + colSelect).classed('bubbleMouseover', false);
    }

    function sortTissuesBySnp(selected){
        // sorts tissue rows by a given SNP ID's effect size data
        var _fetchData = function(data){
            return data.filter(function(d){
                return d.x == selected;
            });
        };
        var _sortEffectSize = function(a,b){return Math.abs(b.value)-Math.abs(a.value)}; // descending
        var matched = _fetchData(mat.data).sort(_sortEffectSize).map(function(d){return d.y}); // fetch snp's data, sort data by effect size, return the tissue list

        // check missing tissues
        if (matched.length != mat.y) {
            // A SNP may not be present in all tissues,
            // so missing tissues have to be appended to the newly sorted tissue list
            var missed = mat.y.filter(function(d){return matched.indexOf(d)<0})
        }
        mat.y = matched.concat(missed);
        snp = selected;
        rerender('sort');
    }

    function addXLabelMouseEvents(){
         // column label mouse events
        var _mouseover = function(d, i){
            var label = useRsId?mat.snp[d].rsId:mat.snp[d].variantId;
            bMap.tooltip.show('click to sort tissue rows by: <br/>'
                + mat.snp[d].variantId
                + "<br/>" + mat.snp[d].rsId
            );
            mouseOverColumn(d, i);
            if(xLabelMouseOverEvents.length > 0){
                xLabelMouseOverEvents.forEach(function(e){
                    e(d);
                });
            }
        };
        var _click = function(d){
           sortTissuesBySnp(d)
        };

        var _mouseout = function(d){
            mouseOutColumn(d);
            if(xLabelMouseOutEvents.length > 0){
                xLabelMouseOutEvents.forEach(function(e){
                    e(d)
                });
            }
        };

        bMap.zoomGroup.selectAll('.xlab').style('cursor', 'pointer')
                .on('mouseover', _mouseover)
                .on('mouseout', _mouseout)
                .on('click', _click);
    }

    function addBubbleMouseEvents(){
        var _mouseover = function(d){
            // show data in tooltip
            var info = d.variantId + '<br>'
                     + d.rsId + '<br>'
                     + d.y + '<br>'
                     + "normalized effect size (NES): " + d.value + "<br>";
            bMap.tooltip.show(info);

           // highlight row and column labels
            var col = '[col="' + d.x + '"]';
            var row = '[row="' + d.y + '"]';
            d3.selectAll('.xlab' + col).classed('textMouseover',true);
            d3.selectAll('.ylab' + row).classed('textMouseover', true);
            // highlight the bubble
            d3.select(this).classed('bubbleMouseover', true);
        };
        var _mouseout = function(){
                d3.selectAll('.xlab').classed('textMouseover', false);
                d3.selectAll('.ylab').classed('textMouseover', false);
                d3.selectAll('.dcircle').classed('bubbleMouseover', false);
                bMap.tooltip.hide();
        };
        var _click = function(d){
            // TODO: review the box plot modal event
            // draw the eqtl box plot when a bubble is clicked
            $('#'+ config.dialogDiv).dialog('open');

            // generate a unique div ID for this plot
            var plotId = 'bbmap-'+mat.x.indexOf(d.x) + '-' + mat.y.indexOf(d.y);
            // check if the plot already exists in the dialog, if so, do nothing
            if ($('#'+plotId).length) return;

            $modalBody = $('#' + config.dialogDiv + ' .bbMap-content');

            $modalBody.append('<div style="float:left" id="' + plotId +
                              '"><span class="ui-icon ui-icon-closethick closePlot" id="' +
                              plotId+'Close"></span><div id="' + plotId+'Plot"></div>');

            d3.select('#'+plotId)
                .on('mouseover', function(){_mouseover(d)})
                .on('mouseout', function(){_mouseout(d)});

            $('#' + plotId + ' .closePlot').click(function(){
                $('#'+plotId).empty();
                $('#'+plotId).remove();
            });

            var plotDiv = d3.select('#' + plotId + 'Plot');
            var url = urls.eqtlBoxplot();
            var plotConfig = gtexBubbleMapConfig.plotviz(d.x, d.y);
            var eqtlplot = new plotviz.EqtlPlot(plotDiv.node(), url, plotConfig); //can modify the dimensions by passing a 3rd object, for example: {width:100,height:100}
            eqtlplot.query(d.x, gene.gencodeId, d.y, gene.geneSymbol, plotConfig);
        };

        bMap.zoomGroup.selectAll('.dcircle')
            .on('mouseover', _mouseover)
            .on('mouseout', _mouseout)
            .on('click', _click);
    }

    function addSortTissueByAlphaBetButton(){
        var _sortByTissueAlphabet = function(){
            mat.y = mat.y.sort(function(a,b){return a>b?1:-1});
            snp = undefined;
            rerender('sort');
        };
        var _tooltip = function(){
            var info='Click to sort tissues alphabetically';
            bMap.tooltip.show(info);
        };
        var _addButton = function(selected){
            return selected.append('rect')
                    .attr({
                        x:-100,
                        y:-10,
                        width: 110,
                        height: 16,
                        fill: '#eee',
                        cursor: 'pointer'
                    })

        };
        var _addText = function(selected){
            return selected.append('text')
                    .text('Sort Tissues Alphabetically')
                    .attr({
                        x:-95,
                        y:0,
                        fill: '#000',
                        'font-size':8,
                        'text-anchor': 'start',
                        'class': 'bbadge',
                        cursor: 'pointer'
                    })

        };
        var _addEvents = function(selected){
            selected.on('mouseover', _tooltip)
                    .on('click', _sortByTissueAlphabet)
        };

        var g = bMap.zoomGroup.append('g');
        g.call(_addButton).call(_addEvents);
        g.call(_addText).call(_addEvents);
    }

    function addTissueSelect(){
        var _createSelectMenuModal = function(div, y){
            $('#' + div + ' .modal-body').html(''); // first be sure that the tissue menu modal is empty
            var modal = d3.select('#' + div + ' .modal-body').node();
            var menu = new plotviz.Filter(modal);

            var _createMenu = function(){
                return y.map(function(d){return [d, true]});
            };
            var _createTextMap = function(){
                var textMap = {};
                y.forEach(function (d) {
                     if (typeof tissueMetadataJson != 'undefined' && d in tissueMetadataJson) { // this only works within gtex portal
                         if(!tissueMetadataJson[d].hasOwnProperty('tissueSiteDetail')) throw "Data structure parsing error.";
                         textMap[d] = tissueMetadataJson[d].tissueName;
                     }
                     else {
                         textMap[d] = d;
                     }
                });
                return textMap;
            };

            var input = {'data':_createMenu(), 'textMap': _createTextMap()};
            menu.generate(input);
            return menu;
        };
        var menu = _createSelectMenuModal(config.modalDiv, mat.y);
        var _filter = function(){
            // when the tissue menu modal closes, triggers the filtering of tissues
            var tissues = menu.selected().filter(function(d){return d != 'All'});
            if (tissues.length === 0) { // no tissue selected, prompt error message
                $('#' + config.modalDiv).modal('show');
                $('#' + config.modalDiv + ' .modal-footer').text('Error! Select one or more tissues!');
                return;
            }
            var data = DATA.filter(function(d){return tissues.indexOf(d.y) > -1});
            var _uniq = function(d, i, arr){
                return i == arr.indexOf(d);
            };
            var _buildX = function(){
                return data.map(function(d){return d.x}).filter(_uniq).sort(function(a,b){return mat.snp[a].pos-mat.snp[b].pos})
            };

            mat = {
                y: tissues,
                x:_buildX(),
                data:data,
                snp: mat.snp
            };
            rerender('tissueSelect');
        };
        $('#' + config.modalDiv).on('hidden.bs.modal', _filter);
    }

    function updateSummary(){
        var _updateEqtlSummary = function(){
            return '(' + gene.gencodeId + ') ' + gene.description + '<br>'
                     + 'Gene Location: chromosome ' + gene.chromosome + ': ' + gene.start + ' - ' + gene.end + ' (' + gene.strand + ') <br>'
                     + 'eQTLs: ' + mat.data.length + ' eQTLs (FDR <= 5%), including ' + mat.y.length + ' tissues (rows), ' + mat.x.length + ' SNPs (columns)  <br>  ';
        };
        var _getGenePageUrl = function(geneName, linkText) {
            var geneNameString = "'" + geneName + "'";
            if (typeof linkText == 'undefined') linkText = geneName;
            return '<a href="javascript:portalClient.eqtl.gotoGeneExpression(' + geneNameString +
            ')">' + linkText + '</a>';
        };
        var _getBrowserUrl = function(featureId){
            var featureIdString = "'" + featureId + "'";
            return '<a href="javascript:gotoBrowser('+ featureIdString + ')">eQTL Browser</a>';
        };
        $('#'+config.infoDiv).html(_updateEqtlSummary());
        $('#genePageLink').html(_getGenePageUrl(gene.geneSymbol, 'gene page'));
        $('#geneSymbol').html(_getGenePageUrl(gene.geneSymbol));
        $('#browserLink').html(_getBrowserUrl(gene.geneSymbol));
    }

    function addTissueBadges(){
        // reports the number of samples with genotype for each tissue
        var _tooltip = function(d){
                        var info=config.badgeData[d] + " samples with genotype in <br>" + d;
                        bMap.tooltip.show(info);
                    };
        var _createBadges = function(selected){
            selected.enter().append('ellipse');
            selected.exit().remove();
            selected.attr({
                        cx:-8,
                        cy:function(d){return bMap.scale.Y(d)},
                        rx: 11,
                        ry: 8,
                        fill: '#999',
                        cursor: 'default'
                    })
                    .on('mouseover', _tooltip);
        };
        var _createBadgeText = function(selected){
            selected.enter().append('text').text(function(d){return config.badgeData[d]});
            selected.exit().remove();
            selected.attr({
                        x:-1,
                        y:function(d){return bMap.scale.Y(d) + 3 },
                        fill: '#fff',
                        'font-size':8,
                        'text-anchor': 'end',
                        'class': 'bbadge',
                        cursor: 'default'
                    })
                    .on('mouseover', _tooltip);
        };

        var id = 'tissueBadges';
        var g = bMap.zoomGroup.select('#'+ id);

        var _render = function(){
            g = g.empty()? bMap.zoomGroup.append('g').attr('id', id):g;
            g.selectAll('ellipse').data(mat.y, function(d){return d}).call(_createBadges);
            g.selectAll('text').data(mat.y, function(d){return d}).call(_createBadgeText);
        };

        if(d3.keys(config.badgeData).length == 0){
            if(verbose) console.info(urls.tissue());
            d3.json(urls.tissue(), function(err, tjson) { // retrieve tissue sample count info
                config.badgeData = gtexBubbleMapDataUtil.parseTissue(tjson);
                _render();
            });
        }
        else{
            _render();
        }
    }

    function addSnpSearch(state){
        // add SNP search
        var _addSnpMarkers = function(isMini, data){
            var scale = isMini?bMapMini.scale:bMap.scale;
            var xargs = { //column labels
                g: isMini?bMapBrush.svg:bMap.zoomGroup,
                data: data,
                xscale: scale.X,
                markerAdjust: isMini?5:0
            };
            bubbleMapUtil.makeColumnMarkers(xargs);

        };
        var _findSnps = function(){
            // reset previously selected SNPs
            var _resetMarkers = function(){
                d3.selectAll('#xMarkerGroup').selectAll('.xMarker').classed('foundSnp', false);
                bMap.zoomGroup.selectAll('.xlab').classed('textMatched', false);
            };
            _resetMarkers();

            var snp = $('#bbSnpSearch').val();

            if (snp.length>3) {
                var __foundData = function(d){
                    var re = new RegExp(snp);
                    return re.test(d) == true; // why not return re.test(d)
                };
                var matched = mat.x.filter(__foundData);
                if (matched.length == 0) return;

                _addSnpMarkers(false, matched);
                _addSnpMarkers(true, matched);
                d3.selectAll('#xMarkerGroup').selectAll('.xMarker').classed('foundSnp', true);

                var __textHighlight = function(selected){
                    selected.filter(function(d){
                        return matched.indexOf(d) >=0;
                    })
                    .classed('textMatched', true);
                };

               bMap.zoomGroup.selectAll('.xlab').call(__textHighlight);
            }
        };
        var _addKeyEvent = function() {
            $('#bbSnpSearch').keyup(_findSnps);
        };
        var _createEmptyMarkerGroup = function(){
            if(bMapBrush !== undefined) bubbleMapUtil.makeColumnMarkers({g:bMapBrush.svg});
            bubbleMapUtil.makeColumnMarkers({g:bMap.zoomGroup});
        };
        switch(state){
            case 'tissueSelect':
                _findSnps();
                _createEmptyMarkerGroup();
                break;
            default:
                _addKeyEvent();
                _createEmptyMarkerGroup();
        }
    }

    function addSiteMarkers(){
        var _drawMarker = function(isMini, thingy, type){
            var markerClass = type+'Marker';
            // remove previously existing markers
            if (isMini) {
                bMapBrush.svg.select('.' + markerClass).remove();
            }
            else {
                bMap.zoomGroup.select('.' + markerClass).remove();
            }

            var g = isMini?bMapBrush.svg.append('g'):bMap.zoomGroup.append('g');
            g.classed(markerClass, true);

            // calculate coordinates
            var scale = isMini?bMapMini.scale:bMap.scale;
            var x = scale.X(thingy) + (0.5*scale.X.rangeBand());
            var y = isMini?scale.Y.range()[0] - 10:-scale.Y.rangeBand()*0.5;
            var direction = gene.strand == '+'? scale.X.rangeBand() : -scale.X.rangeBand();
            var __addLines = function(selected){
                // vertical line
                selected.append('line')
                .attr({
                    x1: x,
                    x2: x,
                    y1: y,
                    y2: scale.Y.range()[(mat.y.length -1)],
                    stroke: '#999',
                    'stroke-width': '1',
                    col:thingy
                })
                .classed('xMarker', true); // xMarker controls the hide/show behavior

                // horizontal line
                if(type == 'tss'){
                    selected.append('line')
                    .attr({
                        x1: x,
                        x2: x + direction,
                        y1: y,
                        y2: y,
                        stroke: '#999',
                        'stroke-width': '1',
                        col: thingy
                    })
                    .classed('xMarker', true);
                }

            };
            var __addTriangle = function(selected){
                // triangle
                var angle = gene.strand == '+'?90:-90;
                var s = isMini?0.75:1;
                selected.append('path')
                    .attr({
                            d: d3.svg.symbol().type("triangle-up"),
                            col:thingy, // important for hide/show the marker
                            'fill': '#999'
                    })
                    .classed('xMarker', true)
                    .attr('transform', 'translate('+(x + direction)+','+y+') rotate(' + angle + ') scale(' + s + ')')
            };
            var __addCircle = function(selected){
                 // circle
                selected.append('circle')
                .attr({
                        r: 3,
                        cx: x,
                        cy: y,
                        'class': 'xMarker',
                        col:thingy,
                        'fill': '#999'
                })
            };
            var __addText = function(selected){
                selected.append('text')
                    .text(gene.geneSymbol + ' ' + type.toUpperCase())
                    .attr({
                        x: gene.strand == '+'? x - (direction*3):x,
                        y: y - 3,
                        'fill': '#999',
                        'font-size': 8,
                        col:thingy
                    })
                    .classed('xMarker', true)
            };
            g.call(__addLines);
            if(type == 'tss') g.call(__addTriangle);
            if(type == 'tes') g.call(__addCircle);
            if (!isMini) {
                // add text label
                g.call(__addText);
                g.classed('additionalRow', true);
            }
        };
        var _createTssSiteMarker = function(){
            // Important Assumption: this filter assumes mat.x is sorted by the tss distance
            // this function estimates where the site is located in mat.x
            var sites = mat.x.filter(function(x, i){
                if (i == mat.x.length - 1) return false;
                if (mat.snp[x].dist == 0) return true;
                var right = mat.x[i+1];
                return mat.snp[x].dist * mat.snp[right].dist < 0; // the product is negative only if xdist < 0 and rightDist > 0
            });
            if (sites.length != 1) {
                console.error('TSS site not found');
                return null;
            }

            _drawMarker(false, sites[0], 'tss');
            if (config.needMini) _drawMarker(true, sites[0], 'tss');
        };
        var _createTesSiteMarker = function(){
            var sites = mat.x.filter(function(x, i) {
                // estimate where the site is in mat.x
                var tesPos = gene.strand == '+' ? gene.end : gene.start;
                var right = mat.x[i + 1] || undefined;
                if (typeof right == 'undefined') return false;
                return (mat.snp[x].pos - tesPos) * (mat.snp[right].pos - tesPos) < 0; // the product is negative only if xdist < 0 and rightDist > 0 regardless of the strand
            });
            if (sites.length != 1) {
                console.error('TES site not found');
                return
            }
            _drawMarker(false, sites[0], 'tes');
            if(config.needMini) _drawMarker(true, sites[0], 'tes');
        };
        _createTssSiteMarker();
        _createTesSiteMarker();
    }

    function addTssDist(){
        var unit = 1e5;

        var range = ['#000', '#252525', '#525252', '#737373', '#969696', '#f0f0f0','#fff'];
        var domain = [0,0.005, 0.01,0.1,0.5,2,3,4,5].map(function(d){return d*unit});
        var cscale = d3.scale.linear()
                            .domain(domain)
                            .range(range);
        var getPos = function(snp){
                var dist = Math.abs(mat.snp[snp].dist);
                return cscale(dist);
        };
        var markFeatureClass = function(snp){
            // mark the SNPS in exon regions of the collapsed gene model
            var exons = gene.exons;
            var snpPos = mat.snp[snp].pos;
            var overlap = exons.filter(function(exon){
                // find the overlapping exon
                if (!exon.hasOwnProperty('start') || !exon.hasOwnProperty('end')) throw 'Exon data structure error.';
                return exon.start <= snpPos && snpPos <= exon.end;
            });
            var fClass = 'xMarker';
            return (overlap.length > 0)? fClass + ' exon':fClass + ' noFeature';
        };
        var _drawRects = function(rects){
            rects.enter().append('rect');
            rects.exit().remove();
            rects.attr({
                    x:function(d){return bMap.scale.X(d) - (0.5*bMap.scale.X.rangeBand())},
                    y: bMap.scale.Y(mat.y[mat.y.length-1]) + bMap.scale.Y.rangeBand(),
                    width: bMap.scale.X.rangeBand(),

                    height: bMap.scale.Y.rangeBand(),
                    fill:getPos,
                    'stroke-width': 1.2,
                    'class': markFeatureClass,
                    col: function(d){return d}
                })
                .on('mouseover', function(d){
                      // tooltip
                    var dist = gene.strand == '+'?mat.snp[d].dist:0-mat.snp[d].dist;
                    var pos = mat.snp[d].pos;
                    var info = mat.snp[d].variantId + '<br>'
                            + mat.snp[d].rsId + '<br>'
                            + 'TSS distance: ' + dist + '<br>'
                            + 'Genomic location: ' + pos + '<br>';

                    if (d3.select(this).classed('exon')) {
                        info += 'Exon Region';
                    }

                    bMap.tooltip.show(info);
                    mouseOverColumn(d);
                    if(xLabelMouseOverEvents.length > 0){
                        xLabelMouseOverEvents.forEach(function(e){
                            e(d);
                        });
                    }

                })
                .on('mouseout', function(d){
                    mouseOutColumn(d);
                    if(xLabelMouseOutEvents.length > 0){
                        xLabelMouseOutEvents.forEach(function(e){
                            e(d)
                        });
                    }
                });
            };
        var _drawTextLabel = function(selected){
            bMap.zoomGroup.select('#tssLabel').remove();
            selected.text('TSS Proximity')
            .attr({
                id: 'tssLabel',
                x: -60,
                y: bMap.scale.Y(mat.y[mat.y.length-1]) + (1.7*bMap.scale.Y.rangeBand()),
                fill: '#999',
                'font-size':10
            });
        };
        // this is a 1D heatmap
        var id = 'tssRow';
        var g = bMap.zoomGroup.select('#' + id);

        var _render = function() {
            g = g.empty() ? bMap.zoomGroup.append('g').attr({'class': 'additionalRow', 'id': 'tssRow'}) : g;
            g.selectAll('rect').data(mat.x, function (d) {return d}).call(_drawRects);
            bMap.zoomGroup.append('text').call(_drawTextLabel);
            if(config.needMini) bMapBrush.brushEvent();
        };
        if(gene.exons == undefined){
             if(verbose) console.info(urls.exons(gene.gencodeId));
             d3.json(urls.exons(gene.gencodeId), function(err, exonJson){ // retrieve exons
                gene.exons = gtexBubbleMapDataUtil.parseExon(exonJson);// store the exons object as an attribute of the gene object
                _render();
            });
        }
        else{
            _render();
        }
    }

    function addLD(){
        var top = (config.needMini)?parseInt(d3.select('#' + config.bbMapCanvasDiv).select('canvas').attr('height')):50; // TODO: remove hard-coded values
        // TODO - Figure out why this isn't matched with padding. - Kane
        d3.select('#'+config.ldCanvasDiv).attr({style:'position: relative; top: '+top+'px; left:'+bMap.getPadding().left+'px;'});

        if(config.ldData === undefined){
            var url = urls.ld(gene);
            if(verbose) console.info(url);
            $.ajax({
                'url': url,
                type: 'GET',
                xhrFields: {
                    withCredentials: false
                },
                'success': function (data) {
                    // This is a fix for a race condition ---
                    // self.querying keeps track of what gene name is being
                    // queried for the LD Plot. If we're still querying the
                    // same gene when the LD Plot AJAX request resolves it is
                    // rendered. Otherwise the query is outdated and ignored.
                    if (geneId === self.querying) {
                        config.ldData = {};
                        data.ld.forEach(function (pair) {
                            config.ldData[pair[0]] = pair[1];
                        });
                        if (bMapBrush) {
                            bMapBrush.addEvent(drawLD);
                        }
                        drawLD();
                    }
                    else {
                        config.ldData = {} // erase ld data?
                    }
                }
            })
        }
        else {drawLD();}
    }

    function drawLD(){
        var min = config.ldCutoff; // minimum LD value cutoff
        var cellW = (bMap.scale.X.range()[1] - bMap.scale.X.range()[0]); // somehow it's different from bMap.scale.rangeBand())

        var _cscale = d3.scale.linear()
                            .domain([0, 1])
                            .range(['#fff', '#000']);

        var xlist = bMapBrush ? bMapBrush.xlist : bMap.scale.X.domain(); // updates the x range based on the brush range
                                                                         // otherwise select the full range.
        var _buildPairs = function(){
            var ld = config.ldData;
            var pairs = [];
            xlist.forEach(function (x, i) {
                xlist.forEach(function (x2, j) {
                    var r2 = ld[x + ',' + x2] || ld[x2 + ',' + x] || undefined;
                    if(i == j) pairs.push({x: x, y: x2, 'r2': 1});
                    if (i <= j && r2 != undefined && r2 > min) pairs.push({x: x, y: x2, 'r2': r2}); // when there's no data, the pair won't be included
                })
            });
            return pairs;
        };
        // LD canvas always rerender based on the range of the brush

        var data = _buildPairs(xlist); // LD pairs could change based on the eqtl data in view, so it is built each time

        // create overlaying SVG and canvas
        //var width = bMap.scale.X.range()[bMapBrush.xlist.length-1] + cellW; // annoying, should think of a better way to determine the width
        var width = bMap.scale.X.range()[(bMapBrush ? bMapBrush.xlist.length : bMap.scale.X.domain().length)-1] + cellW; // annoying, should think of a better way to determine the width
        var height = width;
        d3.select('#'+config.ldCanvasDiv).style('height', height + 'px');
        var _createCanvas = function(){
            d3.select('#'+config.ldCanvasDiv).select('canvas').remove();
            return d3.select('#' + config.ldCanvasDiv).append('canvas')
                            .attr({
                                width: width,
                                height: height
                            })
                            .style({
                                //border: '1px solid #eee',
                                position:'absolute',
                                top:0,
                                left:0
                            });
        };
        var _transformCanvas = function(canvas, left, top){
            var context = canvas.node().getContext('2d');
            context.translate(left , top); // shift the radius distance...
            context.rotate(Math.PI*(-45/180));
        };
        var _createPosScale = function(){
            return{
                pos: function (d) {
                    // Use i to fetch and align with the bubble map position
                    // bMap.scale.X.range()[i] is the center of the bubble
                    var i = xlist.indexOf(d);
                    if (i == -1) return undefined;
                    return this.band() * i;
                },
                data: function () {
                    return data
                },
                band: function () {
                    return cellW / Math.sqrt(2);
                },
                index: function (d) {
                    var i = xlist.indexOf(d);
                    if (i == -1) return undefined;
                    return i;
                }
            }
        };
        var _drawCanvas = function(canvas, xScale, snp){
            var context = canvas.node().getContext('2d');

            // clear canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            var positions = [];
            // Must be between 0.5 and 1.0
            //var scaling = 3/4;
            var scaling = 1;

            xScale.data().forEach(function(d){
                var x, y, xBand, yBand, shiftValue, xShift, yShift;
                positions.push({x:xScale.pos(d.x), y:xScale.pos(d.y)});
                context.beginPath();
                context.fillStyle = _cscale(d.r2);
                //context.rect(xScale.pos(d.x), xScale.pos(d.y), xScale.band(), xScale.band());
                xBand = xScale.band();
                yBand = xScale.band();

                shiftValue = Math.abs(xScale.index(d.x) - xScale.index(d.y));
                xShift = shiftValue * (1 - scaling) * xBand;
                // TODO: Check (cellW / 4) offset for alignment. - Kane
                yShift = -shiftValue * (1 - scaling) * yBand + (cellW / 4);
                x = xScale.pos(d.x) + xShift;
                y = xScale.pos(d.y) + yShift;

                context.moveTo(x, y);
                context.lineTo(x + (scaling * xBand), y + ((1 - scaling) * yBand));
                context.lineTo(x + xBand, y + yBand);
                context.lineTo(x + ((1 - scaling) * xBand), y + (scaling *  yBand));
                //context.rect(x, xScale.pos(d.y), xScale.band(), xScale.band());
                context.fill();
                // SNP highlight during mouseover
                if(typeof(snp) != 'undefined' && (d.x == snp || d.y == snp)){
                    context.lineWidth = 1;
                    context.strokeStyle = '#fd8c94';
                    context.stroke();
                }

                context.closePath();

            });
        };
        var _createSvg = function(){
            d3.select('#'+config.ldCanvasDiv).select('svg').remove();
            return d3.select('#'+config.ldCanvasDiv).append('svg')
                    .attr({
                        id:'ldSvg',
                        width:width,
                        height:height
                    })
                    .style({
                        position:'absolute',
                        top:0,
                        left:0,
                        cursor: 'none'
                    });

        };
        var _drawLines = function(){
            // NOTE: this function renders the vertical lines that aid alignment between the SNP labels to the LD matrix
            // However, it is rendered in SVG in bMap.zoomGroup because it's easier to implement in SVG
            var initY = bMap.scale.Y(mat.y[mat.y.length-1]) + (1.7*bMap.scale.Y.rangeBand()) + 150; // TODO: get rid of hard-coded value

            // vertical lines between the LD to SNP labels
            // Note: these lines are drawn on the bMap not LD svg
            var id = 'ldWrapper'; // TODO: hard-coded
            var _createGroup = function(){
                // create a nested group
                return bMap.zoomGroup.append('g')
                    .attr('id', id) // this inner group is for rendering the triangle map
                    .classed('additionalRow', true);
            };
            var g = bMap.zoomGroup.select('#' + id);
            if(g.empty()) g = _createGroup();
            var lines = g.selectAll('line').data(xlist, function (d) {return d});
            lines.enter().append('line');
            lines.exit().remove();
            lines.attr({
                    x1: function (d) {return bMap.scale.X(d)},
                    x2: function (d) {return bMap.scale.X(d)},
                    y1: initY,
                    y2: initY + 80,
                    stroke: '#cdcdcd',
                    'stroke-width': 1,
                    col: function(d){return d}
                })
                .classed('ldline', true);
        };

        var _getRad = function(theta){
            return Math.PI*(theta/180);
        };
        var _highlight = function(svg, id, scale, dlist){
            var g = svg.select('#'+id).empty()? svg.append('g').attr('id', id):svg.select('#'+id);

            var line = d3.svg.line()
                .x(function (d) {return d.x;})
                .y(function (d) {return d.y;});

            var lines = g.selectAll('path').data(dlist, function (d){
                return d.x + d.y;
            });

            lines.enter().append('path');
            lines.exit().remove();
            lines.attr({
                'd': function (d) {

                    var x, y, xBand, yBand, shiftValue, xShift, yShift;

                    var scaling = 1;

                    xBand = scale.band();
                    yBand = scale.band();

                    shiftValue = Math.abs(scale.index(d.x) - scale.index(d.y));
                    xShift = shiftValue * (1 - scaling) * xBand;
                    yShift = -shiftValue * (1 - scaling) * yBand + (cellW / 4);
                    x = scale.pos(d.x) + xShift;
                    y = scale.pos(d.y) + yShift;

                    var points = [
                        { 'x': x, 'y': y },
                        { 'x': x + (scaling * xBand), 'y': y + ((1 - scaling) * yBand) },
                        { 'x': x + xBand, 'y': y + yBand },
                        { 'x': x + ((1 - scaling) * xBand), 'y': y + (scaling * yBand)}
                    ];

                    return line(points) + 'Z';

                },
                'fill': 'none',
                'stroke': 'grey',
                'stroke-width': 1
            });

            return lines;

            /*
            var rect =  g.selectAll('rect').data(dlist, function(d){return d.x+ d.y});
            rect.enter().append('rect');
            rect.exit().remove(); // remove rect that are no longer needed
            rect.attr({
                    width: scale.band(),
                    height: scale.band(),
                    x:function(d){return scale.pos(d.x)},
                    y:function(d){return scale.pos(d.y)},
                    fill: 'none',
                    stroke: 'grey',
                    'stroke-width': 1
                });
            return rect;
            */

        };
        var _addSvgEvents = function(svg, cursor, band){
            svg.on('mousemove', function(){
                cursor.attr('display','');
                d3.selectAll('.xlab').classed('textMouseover', false);
                d3.selectAll('.ldLine').classed('bubbleMouseover', false);
                var pos = d3.mouse(this); // relative to the SVG
                var x = pos[0];
                var y = pos[1]; // minus cellW so that the mouse pointer stays to the lower right corner of the pointed cell
                var rad = _getRad(45);
                x2 = x*Math.cos(rad) - y*Math.sin(rad);
                y2 = x*Math.sin(rad) + y*Math.cos(rad) - band;
                // TODO: Check offset for alignment. - Kane
                var i = Math.floor(x2/band) + 1;
                var j = Math.floor(y2/band);
                var show = true;
                var rsq = config.ldData[xlist[i] + ',' + xlist[j]] || config.ldData[xlist[j] + ',' + xlist[i]];

                if(xlist[i] == xlist[j]) {
                    rsq = 1;
                }
                else if(typeof(rsq) === 'undefined' ) {show = false;}

                if(show){
                    var message = xlist[i] + '-' + xlist[j] + ': ' + rsq.toPrecision(3);
                    bMap.tooltip.show(message);
                    cursor.attr('stroke','red').attr('transform', 'translate'+ '(' + x+ ',' + y +') rotate(-45)');
                    var colSelect = '[col="' + xlist[i] + '"]';
                    var colSelect2 = '[col="' + xlist[j] + '"]';

                    d3.selectAll('.xlab'+colSelect).classed('textMouseover', true);
                    d3.selectAll('.xlab'+colSelect2).classed('textMouseover', true);
                    d3.selectAll('.ldLine' + colSelect).classed('bubbleMouseover', true);
                    d3.selectAll('.ldLine' + colSelect2).classed('bubbleMouseover', true);


                }
                else{
                    bMap.tooltip.hide();
                    cursor.attr('stroke','#ddd').attr('transform', 'translate'+ '(' + x+ ',' + y +') rotate(-45)');

                }
            })
            svg.on('mouseleave', function(){
                d3.selectAll('.xlab').classed('textMouseover', false);
                d3.selectAll('.lbLine').classed('bubbleMouseover', false);
                cursor.attr('display','none');
            })
        };

        var _drawLdLegend = function(svg, ldTitle) {
            var g = svg.append('g').attr('id', '#ldLegend');

            var domain = [0.1, 1];
            //var range = ['#ffffff', '#cccccc', '#b3b3b3', '#999999', '#808080', '#666666', '#4d4d4d', '#333333', '#1a1a1a', '#000000'];
            var range = ['#f7f7f7', '#000000'];
            //var range = ['#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999', '#b3b3b3', '#cccccc', '#ffffff'];

            var scale = d3.scale.linear()
                .domain(domain)
                .range(range);

            var cellW = (bMap.scale.X.range()[1] - bMap.scale.X.range()[0]); // somehow it's different from bMap.scale.rangeBand())
            var w = cellW;

            // legend title
            //var initX = 10 + 10 - 10 + (cData.length + 2) * w + 10 + (rData.length + 2) * w + 100;
            //var initY = 20;
            var initX = 10;
            var initY = 60;
            g.append('text')
                .text(ldTitle)
                .attr({
                    x: 0,
                    y: 0,
                    'font-size': 10,
                    fill: 'black',
                    transform: 'translate(' + initX + ', ' + (initY + 150) + ') rotate(-90)'
                });


            // rectangles
            var data = d3.range(0, 1.1, 0.1);
            initX += 10;
            initY += 30;
            var colors = [];
            g.selectAll('rect')
                .data(data)
                .enter()
                .append('rect')
                .attr({
                    width: w,
                    height: w,
                    x: initX,
                    y: function (d, i) {return initY + i * w;},
                    fill: function (d) {
                        colors.push(scale(d));
                        return scale(1 - d)
                    }
                });
            data = data.map(function (d) {
                return (1 - d).toFixed(1);
            });

            // axis labels
            g.selectAll('.ldLabels')
                .data(data)
                .enter()
                .append('text')
                .text(function (d) {
                    return d;
                })
                .attr({
                    x: initX + 10 + w,
                    y: function (d, i) {return initY + i * w + 2},
                    'font-size': 6,
                    fill: function (d, i) {return i%2 == 1 ? 'black': '#aaa'}
                });
        };



        var canvas = _createCanvas();
        var pScale = _createPosScale();
        _transformCanvas(canvas, pScale.band()/2, pScale.band());

        _drawCanvas(canvas, pScale);
        _drawLines(xlist);


        var svg = _createSvg();
        _drawLdLegend(svg, config.ldTitle);

        //Mouse Events

        //var ghost = _highlight(svg, pScale, data);
        var cursor = _highlight(svg, 'ldCursor', pScale, data.slice(0,1));
        cursor.attr('display', 'none'); // hide it by default
        _addSvgEvents(svg, cursor, pScale.band());

        xLabelMouseOverEvents.push(function(snp){
            var filtered = data.filter(function(d){return d.x == snp || d.y == snp});
            var boxes = _highlight(svg, 'ldHighlight', pScale, filtered);
            boxes.attr('stroke','red').attr('transform',  'translate('+pScale.band()/2 +',' + pScale.band() + ') rotate(-45)');
        });
        xLabelMouseOutEvents.push(function(){svg.select('#ldHighlight').selectAll('path').remove()});
    }

    function addDataFilters(){
        var _storeFilter = function(name, callback){
            dataFilters[name]['func'] = callback;
        };
           // create two data filter functions (using closure)
        var _reportFilterResults = function(){
            var l = mat.data.filter(function(d){
                        var temp = d.filters?d3.values(d.filters).filter(function(d){return d}):[];
                        return temp.length > 0;
                    })
                    .length;
            var L = mat.data.length;
            var after = L - l;
            if(l > 0){
                $('#filterInfo').show(); // Warning: hard-coded div name
                $('#filterInfo').text('Remaining number of eQTLs: ' + after + ' (' + (after/L*100).toFixed(2) + '%)'); // reports the #eQTLs after filtering
            }
            else{
                $('#filterInfo').hide();
            }

        };
        var _createFilter = function (x, isMax, useAbs) { //x is a key in this.mat.data, isMax is boolean for maximum or minimum cutoff

                // this function creates a filter function
                var myfilter = function (v, state) {
                    if (undefined === state) {
                        state = 'dataFilter';
                    }
                    dataFilters[x]['value'] = v; // store the current filter value
                    var fClass = x + 'Filtered';
                    // var fClass = 'filtered';
                    if (useAbs) {
                        v = Math.abs(v);
                    }

                    var __smallerEqual = function (d) {
                        return useAbs ? Math.abs(d[x]) <= v : d[x] <= v;
                    };

                    var __largerThan = function (d) {
                        return useAbs ? Math.abs(d[x]) > v : d[x] > v;
                    };


                    if (isMax) {
                        // TODO: to be implemented
                    }
                    else {
                        var __failed = function (selected) {
                            selected.filter(__smallerEqual)
                                .classed(fClass, true)
                        };

                        var __passed = function (selected) {
                            selected.filter(__largerThan)
                                .classed(fClass, false);
                        };

                        mat.data.filter(
                            function(d){
                                if(typeof d.filters == 'undefined') d.filters = {};
                                d.filters[x] = useAbs ? Math.abs(d[x]) <= v : d[x] <= v; // true means the data point will be filtered
                            }
                        );

                        rerender(state);

                        // update bMap, using DOM class is faster than rerendering the SVG
                        var zoomCircles = bMap.zoomGroup.selectAll('.dcircle');
                        zoomCircles.call(__failed);
                        zoomCircles.call(__passed);
                    }
                };

                // store the filters in this.filters, for plot refreshing purposes
                _storeFilter(x, myfilter);
                return myfilter;
            };

        var _filterP = _createFilter('r', false, false); // note: r = -log10(p)
        var _filterE = _createFilter('value', false, true); // note: value = effect size
        var _filterLD = _createFilter('ld', false, false); // note: ld = linkage disequilibrium

        var _addMouseEvents = function(){
            $('#pvalueSlider').on('change mousemove', function(){
                var v = $(this).val();
                $('#pvalueLimit').val(v);
                _filterP(parseFloat(v));
                _reportFilterResults();

            });
            $('#pvalueLimit').keydown(function(e){
                if(e.keyCode == 13){
                    var v = $('#pvalueLimit').val();
                    $('#pvalueSlider').val(v);
                    _filterP(parseFloat(v));
                    _reportFilterResults();
                }
            });
            $('#effectSizeSlider').on('change mousemove', function(){
                var v = $(this).val();
                $('#effectSizeLimit').val(v);
                _filterE(parseFloat(v));
                _reportFilterResults();
            });
            $('#effectSizeLimit').keydown(function(e){
                if(e.keyCode == 13){
                    var v = $('#effectSizeLimit').val();
                    $('#effectSizeSlider').val(v);
                    _filterE(parseFloat(v));
                    _reportFilterResults();
                }
            });
            $('#linkageDisequilibriumSlider').on('change mousemove', function () {
                var v = $(this).val();
                config.ldCutoff = parseFloat(v);
                $('#linkageDisequilibriumLimit').val(v);
                _filterLD(parseFloat(v), 'ldFilter');
                _reportFilterResults();
            });
            $('#linkageDisequilibriumLimit').keydown(function(e){
                if(e.keyCode == 13){
                    var v = $('#linkageDisequilibriumLimit').val();
                    config.ldCutoff = parseFloat(v);
                    $('#linkageDisequilibriumSlider').val(v);
                    _filterLD(parseFloat(v), 'ldFilter');
                    _reportFilterResults();
                }
            });
        };
        _addMouseEvents();
    }

};
