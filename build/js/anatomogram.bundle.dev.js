var Anatomogram = (function (exports) {
'use strict';

var EOL = {};
var EOF = {};
var QUOTE = 34;
var NEWLINE = 10;
var RETURN = 13;

function objectConverter(columns) {
  return new Function("d", "return {" + columns.map(function(name, i) {
    return JSON.stringify(name) + ": d[" + i + "]";
  }).join(",") + "}");
}

function customConverter(columns, f) {
  var object = objectConverter(columns);
  return function(row, i) {
    return f(object(row), i, columns);
  };
}

// Compute unique columns in order of discovery.
function inferColumns(rows) {
  var columnSet = Object.create(null),
      columns = [];

  rows.forEach(function(row) {
    for (var column in row) {
      if (!(column in columnSet)) {
        columns.push(columnSet[column] = column);
      }
    }
  });

  return columns;
}

var dsv$1 = function(delimiter) {
  var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
      DELIMITER = delimiter.charCodeAt(0);

  function parse(text, f) {
    var convert, columns, rows = parseRows(text, function(row, i) {
      if (convert) return convert(row, i - 1);
      columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
    });
    rows.columns = columns || [];
    return rows;
  }

  function parseRows(text, f) {
    var rows = [], // output rows
        N = text.length,
        I = 0, // current character index
        n = 0, // current line number
        t, // current token
        eof = N <= 0, // current token followed by EOF?
        eol = false; // current token followed by EOL?

    // Strip the trailing newline.
    if (text.charCodeAt(N - 1) === NEWLINE) --N;
    if (text.charCodeAt(N - 1) === RETURN) --N;

    function token() {
      if (eof) return EOF;
      if (eol) return eol = false, EOL;

      // Unescape quotes.
      var i, j = I, c;
      if (text.charCodeAt(j) === QUOTE) {
        while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
        if ((i = I) >= N) eof = true;
        else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
        return text.slice(j + 1, i - 1).replace(/""/g, "\"");
      }

      // Find next delimiter or newline.
      while (I < N) {
        if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
        else if (c !== DELIMITER) continue;
        return text.slice(j, i);
      }

      // Return last token before EOF.
      return eof = true, text.slice(j, N);
    }

    while ((t = token()) !== EOF) {
      var row = [];
      while (t !== EOL && t !== EOF) row.push(t), t = token();
      if (f && (row = f(row, n++)) == null) continue;
      rows.push(row);
    }

    return rows;
  }

  function format(rows, columns) {
    if (columns == null) columns = inferColumns(rows);
    return [columns.map(formatValue).join(delimiter)].concat(rows.map(function(row) {
      return columns.map(function(column) {
        return formatValue(row[column]);
      }).join(delimiter);
    })).join("\n");
  }

  function formatRows(rows) {
    return rows.map(formatRow).join("\n");
  }

  function formatRow(row) {
    return row.map(formatValue).join(delimiter);
  }

  function formatValue(text) {
    return text == null ? ""
        : reFormat.test(text += "") ? "\"" + text.replace(/"/g, "\"\"") + "\""
        : text;
  }

  return {
    parse: parse,
    parseRows: parseRows,
    format: format,
    formatRows: formatRows
  };
};

var csv$1 = dsv$1(",");

var tsv$1 = dsv$1("\t");

function responseJson(response) {
  if (!response.ok) throw new Error(response.status + " " + response.statusText);
  return response.json();
}

var json = function(input, init) {
  return fetch(input, init).then(responseJson);
};

"use strict";

function getGtexUrls(){
    const host = "https://gtexportal.org/rest/v1/"; // NOTE: top expressed genes are not yet in production
    return {
        // "geneExp": "https://gtexportal.org/rest/v1/dataset/featureExpression?feature=gene&gencode_id=",

        // "sample": host + "dataset/sample?datasetId=gtex_v7&format=json&sort_by=sampleId&sortDir=asc&dataType=",
        "sample": "data/gtex.Sample.csv",
        "geneId": host + "reference/geneId?format=json&geneId=",
        "geneExp": host + "expression/geneExpression?datasetId=gtex_v7&gencodeId=",
        "tissue":  host + "dataset/tissueInfo",
        "topInTissueFiltered": host + "expression/topExpressedGenes?datasetId=gtex_v7&filterMtGene=true&sort_by=median&sortDirection=desc&page_size=50&tissueId=",
        "topInTissue": host + "expression/topExpressedGenes?datasetId=gtex_v7&sort_by=median&sortDirection=desc&page_size=50&tissueId=",
        "medExpById": host + "expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&page_size=10000&gencodeId=",

        "exonExp": host + "expression/medianExonExpression?datasetId=gtex_v7&hcluster=true&gencodeId=",
        "junctionExp": host + "expression/medianJunctionExpression?datasetId=gtex_v7&hcluster=true&gencodeId=",
        "isoformExp": host + "expression/isoformExpression?datasetId=gtex_v7&boxplotDetail=median&gencodeId=",

        "geneModel": host + "reference/collapsedGeneModel?unfiltered=false&release=v7&geneId=",
        "geneModelUnfiltered": host + "reference/collapsedGeneModel?unfiltered=true&release=v7&geneId=",
        "isoform": host + "reference/transcript?release=v7&gencode_id=",

        "liverGeneExp": "data/top50.genes.liver.genomic.median.tpm.json", // top 50 genes in GTEx liver
        "cerebellumGeneExp": "data/top.gtex.cerebellum.genes.median.tpm.tsv",
        "mayoGeneExp": "data/gtex+mayo.top.cerebellum_ad.genes.median.tpm.tsv" // the top 50 genes in Mayo Cerebellum_AD + their gtex expression values
    }
}

/**
 * Parse the genes from GTEx web service
 * @param data {Json}
 * @returns {List} of genes
 */


/**
 * parse the tissues
 * @param data {Json}
 * @returns {List} of tissues
 */
function parseTissues(data){
    const attr = "tissueInfo";
    if(!data.hasOwnProperty(attr)) throw "Fatal Error: parseTissues input error.";
    const tissues = data[attr];

    // sanity check
    ["tissueId", "tissueName", "colorHex"].forEach((d)=>{
        if (!tissues[0].hasOwnProperty(d)) throw "Fatal Error: parseTissue attr not found: " + d;
    });

    return tissues;
}

/**
 * parse the exons
 * @param data {Json}
 * @returns {List} of exons
 */


// export function parseSamples(data){
//     const attr = "sample";
//     if (!data.hasOwnProperty(attr)) throw "Fatal Error: parseSamples input error. " + data;
//     return data[attr];
// }
//


/**
 * parse the junctions
 * @param data
 * @returns {List} of junctions
 * // we do not store junction structure annotations in Mongo
    // so here we use the junction expression web service to retrieve the junction genomic locations
    // assuming that each tissue has the same junctions,
    // to grab all the known junctions of a gene, we only need to look at one tissue
    // here we arbitrarily pick Liver.
 */


/**
 * parse transcript isoforms from the GTEx web service: "reference/transcript?release=v7&gencode_id="
 * @param data {Json}
 * returns a dictionary of transcript exon object lists indexed by ENST IDs
 */


/**
 * parse transcript isoforms
 * @param data {Json} from GTEx web service "reference/transcript?release=v7&gencode_id="
 * returns a list of isoform objects
 */



/**
 * parse final gene model exon expression
 * expression is normalized to reads per kb
 * @param data {JSON} of exon expression web service
 * @param exons {List} of exons with positions
 * @param useLog {boolean} use log2 transformation
 * @param adjust {Number} default 0.01
 * @returns {List} of exon objects
 */


/**
 * Parse junction median read count data
 * @param data {JSON} of the junction expression web service
 * @param useLog {Boolean} perform log transformation
 * @param adjust {Number} for handling 0's when useLog is true
 * @returns {List} of junction objects
 */


/**
 * parse isoform expression
 * @param data
 * @param useLog
 * @param adjust
 * @returns {*}
 */




/**
 * parse median gene expression
 * @param data {Json} with attr medianGeneExpression
 * @param useLog {Boolean} performs log10 transformation
 * @returns {*}
 */


/**
 * Makes the json for the plotly boxplot, no longer in use
 * @param gencodeId {String}: a gencode ID
 * @param data {Object} gene expression API call
 * @param useLog {Boolean}
 * @param color {String}
 * @param xlist {List}: a list of tissue objects {id:String, name:String}
 * @returns {{x: Array, y: Array, name: string, type: string, line: {width: number}, marker: {color: string}}}
 */
// export function makeJsonForPlotly(gencodeId, data, useLog=false, color="grey", xlist){
//
//     // reference: https://plot.ly/javascript/box-plots/
//
//     let lookupTable = parseGeneExpression(gencodeId, data); // constructs the tissue lookup table indexed by tissue ID
//     let x = [];
//     let y = [];
//
//     // xlist: the tissues
//     xlist.forEach((d)=>{
//         // d: a tissue
//         if (lookupTable.exp[d.id]===undefined){
//             // when the gene has no expression data in tissue d,
//             // provide dummy data
//             x = x.concat([d.name]);
//             y = y.concat([-1]);
//         } else {
//             // concatenate a list of the tissue label repeatedly (lookupTable.exp[d].length times) to x
//             // concatenate all the expression values to y
//             // the number of elements in x and y must match
//             x = x.concat(Array(lookupTable.exp[d.id].length).fill(d.name));
//             y = y.concat(lookupTable.exp[d.id]);
//         }
//     });
//     return {
//         x: x,
//         y: y,
//         name: lookupTable.geneSymbol,
//         type: 'box',
//         line: {width:1},
//         marker: {color:color},
//     };
//
// }

/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 */

/**
 * Created by lucyxu on 6/9/17.
 * Modified by Kat on 5/17/2018.
 * This code is for generating a one-time static anatomogram with all the tissues highlighted
 * using the GTEx tissue colors.
 * It is not meant for replacing the GTEx interactive anatomogram.
 */


function render(urls=getGtexUrls()){
    const promises = [
        json(urls.tissue),
        json("data/AnatomogramDescriptionsCopy.json")
    ];
    Promise.all(promises)
        .then(function(args){
            let tissueMetadata = parseTissues(args[0]);
            let jsonTissues = args[1];

            // store the tissue color in jsonTissues lookup table
            tissueMetadata.forEach((t)=>{
                jsonTissues[t.tissueId].colorHex = t.colorHex;
            });

            let svgTissues = $("g#LAYER_EFO").children();
            $.each(svgTissues, function(i, t){
                let id = $(t).attr("id");
                let tissueId = Object.keys(jsonTissues).filter((tissueId)=>{
                    return jsonTissues[tissueId].IDName == id
                })[0];
                if (tissueId !== undefined){
                    console.log(tissueId);
                    let tissueColor = "#" + jsonTissues[tissueId].colorHex;
                    $(t).css('fill', tissueColor);
                    $(t).css('fill-opacity', 0.5);
                }

            });

        })
        .catch(function(err){
            console.error(err);
        });
}

// var renderAnatomogram = function() {
//
//     $.getJSON("data/AnatomogramDescriptionsCopy.json", function (jsonTissues) {
//
//         scaleSvgs("fullBodySvg");
//         var specialTissues = ["UBERON_0002367", "UBERON_0000473", "UBERON_0000007", "UBERON_0000945", "UBERON_0001044", "UBERON_0003889", "UBERON_0000002"]; //tissues that need to be highlighted in special ways
//         var svgTissues = $("g#LAYER_EFO").children();
//         var tissueMetadata = tissueMetadataJson;
//
//         createTissueTable("fullBody");
//
//         $(window).resize(function(size) {
//             $("#fullBodySvg .svgContainer").css("height", ""+$("#fullBodySvg .svgContainer").width()*1.85);
//             $("#brainSvg .svgContainer").css("height", ""+$("#brainSvg .svgContainer").width()*0.885);
//             //anatomogram transform scale factor determined by dividing the window width by the optimal scale for that size
//             if ($(window).width()>1200) {
//                 $("#fullBodySvg .svgImage").attr("transform", "scale("+($(window).width()/525)+")");
//                 $("#brainSvg .svgImage").attr("transform", "scale("+($(window).width()/362)+")");
//             }
//             else {
//                 $("#fullBodySvg .svgImage").attr("transform", "scale("+($(window).width()/263)+")");
//                 $("#brainSvg .svgImage").attr("transform", "scale("+($(window).width()/181)+")");
//             }
//         });
//
//         $.each(svgTissues, function (index, svgTissue) {
//             var svgIdName = $(svgTissue).attr("id");
//             //gives a class attribute to every tissue in the anatomogram based on the tissue's id
//             $(svgTissue).attr("class", svgIdName);
//             //removes the title element of each tissue so as to prevent tooltip from popping up
//             $(".gxaAnatomogram title").remove();
//             var tissueId=anatomogramIdToTissueId(svgIdName);
//
//             $(svgTissue).mouseenter(function () {
//                 colorTissue(tissueId);
//                 var anatomogramTable = $("#anatomogramTableWrapper").DataTable()
//                 anatomogramTable.rows().every(function(index) {
//                     var anatomogramId = jsonTissues[tissueNameToTissueId(this.data()[1])].IDName;
//                     if (anatomogramId === svgIdName) {
//                         $(this.node()).addClass("anatomogramRowHighlight");
//                     }
//                 })
//                 $(".anatomogram-plotviz-tooltip").css("left", (event.pageX+10) + "px");
//                 $(".anatomogram-plotviz-tooltip").css("top", (event.pageY+10) + "px");
//                 $(".anatomogram-plotviz-tooltip").html("");
//                 $.each(jsonTissues, function (index) {
//                      if (jsonTissues[index].IDName === svgIdName) {
//                          $(".anatomogram-plotviz-tooltip").html($(".anatomogram-plotviz-tooltip").html() + (tissueMetadata[index].tissueName).bold() + "<br class='anatomogramBreak'>" + "Main Sampling Site: " + JSON.stringify(jsonTissues[index].Description).replace(/\"/g, "") + "<br><br>");
//                      }
//                 });
//                 $(".anatomogram-plotviz-tooltip").show();
//             });
//
//             $(svgTissue).mouseleave(function () {
//                 uncolorTissue(tissueId);
//                 $(".anatomogram-plotviz-tooltip").html("");
//                 $(".anatomogram-plotviz-tooltip").hide();
//                 $("#anatomogramTableWrapper tr").removeClass("anatomogramRowHighlight");
//             });
//         });
//
//         $('#fullSvgSwitch').click(function(event) {
//         	$('#fullBodySvg').show();
//         	$('#brainSvg').hide();
//         	scaleSvgs("fullBodySvg");
//         	createTissueTable("fullBody");
//         	$('#brainSvgSwitch').removeClass("anatomogram-view-option-selected");
//         	$('#fullSvgSwitch').addClass("anatomogram-view-option-selected");
//         });
//
//         $('#brainSvgSwitch').click(function(event) {
//         	$('#brainSvg').show();
//         	$('#fullBodySvg').hide();
//             scaleSvgs("brainSvg");
//             createTissueTable("brain");
//         	$('#fullSvgSwitch').removeClass("anatomogram-view-option-selected");
//         	$('#brainSvgSwitch').addClass("anatomogram-view-option-selected");
//         });
//
//         //returns the tissue_id given the anatomogram id
//         function anatomogramIdToTissueId (anatomogramId) {
//             var id=""
//             $.each(jsonTissues, function (index) {
//                 if (jsonTissues[index].IDName === anatomogramId) {
//                     id=index;
//                 }
//             });
//             return id;
//         }
//
//         //returns the tissue_id given the tissueName
//         function tissueNameToTissueId(tissueName) {
//             var id = "";
//             $.each(jsonTissues, function (jsonTissue) {
//                 if (tissueMetadata[jsonTissue].tissueName === tissueName) {
//                     id = jsonTissue;
//                 }
//             });
//             return id;
//         }
//
//         //highlights the tissue given the tissue_id
//         function colorTissue(tissueId) {
//             var tissueColor = "#" + tissueMetadata[tissueId].colorHex;
//             var svgIdName = jsonTissues[tissueId].IDName;
//             $("." + svgIdName).css("fill", tissueColor);
//             $("." + svgIdName).css("fill-opacity", "0.7");
//
//             if (svgIdName === "UBERON_0002367" || svgIdName === "UBERON_0000473") {
//                 $("." + svgIdName).css("stroke", "black");
//                 $($("." + svgIdName).children()).css("stroke", "black");
//             }
//             if (svgIdName === "UBERON_0000007" || svgIdName === "UBERON_0000992" || svgIdName === "UBERON_0003889" || svgIdName === "UBERON_0000002") {
//                 $("." + svgIdName).css("stroke", tissueColor);
//                 $("." + svgIdName).css("fill-opacity", "1");
//                 $("." + svgIdName).css("stroke-width", "1.1");
//             }
//
//         }
//
//         //unhighlights the tissue given the tissue_id
//         function uncolorTissue(tissueId) {
//             var svgIdName = jsonTissues[tissueId].IDName;
//             $("."+svgIdName).css("fill", "#A4A4A4");
//             $("."+svgIdName).css("fill-opacity", "0.5");
//
//             if (specialTissues.includes(svgIdName)) {
//                 $("."+svgIdName).css("stroke", "none");
//                 $($("."+svgIdName).children()).css("stroke","none");
//             }
//         }
//
//         function scaleSvgs(type) {
//             var fullBodyAnatomogramScaleFactor = 525;
//             var fullBodyContainerScaleFactor = 1.85;
//             var brainAnatomogramScaleFactor = 362;
//             var brainContainerScaleFactor = 0.885;
//             if (type==="fullBodySvg") {
//                 var anatomogramScaleFactor = fullBodyAnatomogramScaleFactor;
//                 var containerScaleFactor = fullBodyContainerScaleFactor;
//             }
//             else {
//                 var anatomogramScaleFactor = brainAnatomogramScaleFactor;
//                 var containerScaleFactor = brainContainerScaleFactor;
//             }
//             $("#" + type + " .svgContainer").css("height", ""+ $("#" + type +" .svgContainer").width()*containerScaleFactor);
//             if ($(window).width()>1200) {
//                 $("#" + type +" .svgImage").attr("transform", "scale("+($(window).width()/anatomogramScaleFactor)+")");
//             }
//             else {
//                 $("#" + type +" .svgImage").attr("transform", "scale("+($(window).width()/(anatomogramScaleFactor/2))+")");
//             }
//         }
//
//         function createTissueTable(type) {
//             $("#anatomogramTableDisplay").html("");
//             var oTable = $('<table id="anatomogramTableWrapper"></table>');
//             $("#anatomogramTableDisplay").append(oTable);
//             var thead = $('<thead></thead>');
//             $(oTable).append(thead);
//             var tbody = $('<tbody></tbody>');
//             $(oTable).append(tbody);
//
//             var tr = $("<tr></tr>");
//             $(thead).append(tr);
//             var td1 = $('<th  style="max-width: 10px !important;"></th>');
//             $(tr).append(td1);
//             var td2 = $('<th>Tissue</th>');
//             $(tr).append(td2);
//             var td3 = $('<th>Main Sampling Site</th>');
//             $(tr).append(td3);
//
//             if (type==="fullBody") {
//                 $.each(jsonTissues, function (jsonTissue) {
//                     var tr = $("<tr></tr>");
//                     $(tbody).append(tr);
//                     var td1 = $('<td style="width: 10px;"><svg width="10px" height="10px"><circle cx="50%" cy="50%" r="5px" fill=' + '#' + tissueMetadata[jsonTissue].colorHex + '/></svg></td>');
//                     $(tr).append(td1);
//                     var td2 = $('<td>' + tissueMetadata[jsonTissue].tissueName + '</td>');
//                     $(tr).append(td2);
//                     var td3 = $('<td>' + jsonTissues[jsonTissue].Description + '</td>');
//                     $(tr).append(td3);
//                 });
//             }
//             else {
//                 $.each(jsonTissues, function (jsonTissue) {
//                     if (jsonTissues[jsonTissue].isBrain==="TRUE" && jsonTissues[jsonTissue].IDName!="UBERON_0002240") {
//                         var tr = $("<tr></tr>");
//                         $(tbody).append(tr);
//                         var td1 = $('<td style="width: 10px;"><svg width="10px" height="10px"><circle cx="50%" cy="50%" r="5px" fill=' + '#' + tissueMetadata[jsonTissue].colorHex + '/></svg></td>');
//                         $(tr).append(td1);
//                         var td2 = $('<td>' + tissueMetadata[jsonTissue].tissueName + '</td>');
//                         $(tr).append(td2);
//                         var td3 = $('<td>' + jsonTissues[jsonTissue].Description + '</td>');
//                         $(tr).append(td3);
//                     }
//                 });
//             }
//
//             $(oTable).DataTable({
//                 "bInfo": false,
//                 "aoColumns": [{"bSortable":false}, null, null],
//                 "order": [ 1, 'asc' ],
//                 jQueryUI : true,
//                 dom: '<"clear">lfrtip',
//                 destroy: true,
//                 scrollY:'820px',
//                 scrollCollapse: true,
//                 "paging": false,
//             });
//
//             var tissueId=""
//             $('#anatomogramTableWrapper tbody')
//             .on( 'mouseenter', 'tr', function () {
//                 $(this).addClass('anatomogramRowHighlight');
//                 var tissueName = $($(this).children()[1]).text();
//                 tissueId = tissueNameToTissueId(tissueName);
//                 var anatomogramId = jsonTissues[tissueId].IDName;
//                 colorTissue(tissueId);
//             })
//             .on('mouseleave', 'tr', function() {
//                 $(this).removeClass('anatomogramRowHighlight');
//                 uncolorTissue(tissueId);
//             })
//         }
//     });
// };

exports.render = render;

return exports;

}({}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hdG9tb2dyYW0uYnVuZGxlLmRldi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvZHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvY3N2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvdHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZldGNoL3NyYy9qc29uLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy9ndGV4RGF0YVBhcnNlci5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL0FuYXRvbW9ncmFtLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBFT0wgPSB7fSxcbiAgICBFT0YgPSB7fSxcbiAgICBRVU9URSA9IDM0LFxuICAgIE5FV0xJTkUgPSAxMCxcbiAgICBSRVRVUk4gPSAxMztcblxuZnVuY3Rpb24gb2JqZWN0Q29udmVydGVyKGNvbHVtbnMpIHtcbiAgcmV0dXJuIG5ldyBGdW5jdGlvbihcImRcIiwgXCJyZXR1cm4ge1wiICsgY29sdW1ucy5tYXAoZnVuY3Rpb24obmFtZSwgaSkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShuYW1lKSArIFwiOiBkW1wiICsgaSArIFwiXVwiO1xuICB9KS5qb2luKFwiLFwiKSArIFwifVwiKTtcbn1cblxuZnVuY3Rpb24gY3VzdG9tQ29udmVydGVyKGNvbHVtbnMsIGYpIHtcbiAgdmFyIG9iamVjdCA9IG9iamVjdENvbnZlcnRlcihjb2x1bW5zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHJvdywgaSkge1xuICAgIHJldHVybiBmKG9iamVjdChyb3cpLCBpLCBjb2x1bW5zKTtcbiAgfTtcbn1cblxuLy8gQ29tcHV0ZSB1bmlxdWUgY29sdW1ucyBpbiBvcmRlciBvZiBkaXNjb3ZlcnkuXG5mdW5jdGlvbiBpbmZlckNvbHVtbnMocm93cykge1xuICB2YXIgY29sdW1uU2V0ID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIGNvbHVtbnMgPSBbXTtcblxuICByb3dzLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgZm9yICh2YXIgY29sdW1uIGluIHJvdykge1xuICAgICAgaWYgKCEoY29sdW1uIGluIGNvbHVtblNldCkpIHtcbiAgICAgICAgY29sdW1ucy5wdXNoKGNvbHVtblNldFtjb2x1bW5dID0gY29sdW1uKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBjb2x1bW5zO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihkZWxpbWl0ZXIpIHtcbiAgdmFyIHJlRm9ybWF0ID0gbmV3IFJlZ0V4cChcIltcXFwiXCIgKyBkZWxpbWl0ZXIgKyBcIlxcblxccl1cIiksXG4gICAgICBERUxJTUlURVIgPSBkZWxpbWl0ZXIuY2hhckNvZGVBdCgwKTtcblxuICBmdW5jdGlvbiBwYXJzZSh0ZXh0LCBmKSB7XG4gICAgdmFyIGNvbnZlcnQsIGNvbHVtbnMsIHJvd3MgPSBwYXJzZVJvd3ModGV4dCwgZnVuY3Rpb24ocm93LCBpKSB7XG4gICAgICBpZiAoY29udmVydCkgcmV0dXJuIGNvbnZlcnQocm93LCBpIC0gMSk7XG4gICAgICBjb2x1bW5zID0gcm93LCBjb252ZXJ0ID0gZiA/IGN1c3RvbUNvbnZlcnRlcihyb3csIGYpIDogb2JqZWN0Q29udmVydGVyKHJvdyk7XG4gICAgfSk7XG4gICAgcm93cy5jb2x1bW5zID0gY29sdW1ucyB8fCBbXTtcbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlUm93cyh0ZXh0LCBmKSB7XG4gICAgdmFyIHJvd3MgPSBbXSwgLy8gb3V0cHV0IHJvd3NcbiAgICAgICAgTiA9IHRleHQubGVuZ3RoLFxuICAgICAgICBJID0gMCwgLy8gY3VycmVudCBjaGFyYWN0ZXIgaW5kZXhcbiAgICAgICAgbiA9IDAsIC8vIGN1cnJlbnQgbGluZSBudW1iZXJcbiAgICAgICAgdCwgLy8gY3VycmVudCB0b2tlblxuICAgICAgICBlb2YgPSBOIDw9IDAsIC8vIGN1cnJlbnQgdG9rZW4gZm9sbG93ZWQgYnkgRU9GP1xuICAgICAgICBlb2wgPSBmYWxzZTsgLy8gY3VycmVudCB0b2tlbiBmb2xsb3dlZCBieSBFT0w/XG5cbiAgICAvLyBTdHJpcCB0aGUgdHJhaWxpbmcgbmV3bGluZS5cbiAgICBpZiAodGV4dC5jaGFyQ29kZUF0KE4gLSAxKSA9PT0gTkVXTElORSkgLS1OO1xuICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQoTiAtIDEpID09PSBSRVRVUk4pIC0tTjtcblxuICAgIGZ1bmN0aW9uIHRva2VuKCkge1xuICAgICAgaWYgKGVvZikgcmV0dXJuIEVPRjtcbiAgICAgIGlmIChlb2wpIHJldHVybiBlb2wgPSBmYWxzZSwgRU9MO1xuXG4gICAgICAvLyBVbmVzY2FwZSBxdW90ZXMuXG4gICAgICB2YXIgaSwgaiA9IEksIGM7XG4gICAgICBpZiAodGV4dC5jaGFyQ29kZUF0KGopID09PSBRVU9URSkge1xuICAgICAgICB3aGlsZSAoSSsrIDwgTiAmJiB0ZXh0LmNoYXJDb2RlQXQoSSkgIT09IFFVT1RFIHx8IHRleHQuY2hhckNvZGVBdCgrK0kpID09PSBRVU9URSk7XG4gICAgICAgIGlmICgoaSA9IEkpID49IE4pIGVvZiA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKChjID0gdGV4dC5jaGFyQ29kZUF0KEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGogKyAxLCBpIC0gMSkucmVwbGFjZSgvXCJcIi9nLCBcIlxcXCJcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpbmQgbmV4dCBkZWxpbWl0ZXIgb3IgbmV3bGluZS5cbiAgICAgIHdoaWxlIChJIDwgTikge1xuICAgICAgICBpZiAoKGMgPSB0ZXh0LmNoYXJDb2RlQXQoaSA9IEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIGVsc2UgaWYgKGMgIT09IERFTElNSVRFUikgY29udGludWU7XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGosIGkpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXR1cm4gbGFzdCB0b2tlbiBiZWZvcmUgRU9GLlxuICAgICAgcmV0dXJuIGVvZiA9IHRydWUsIHRleHQuc2xpY2UoaiwgTik7XG4gICAgfVxuXG4gICAgd2hpbGUgKCh0ID0gdG9rZW4oKSkgIT09IEVPRikge1xuICAgICAgdmFyIHJvdyA9IFtdO1xuICAgICAgd2hpbGUgKHQgIT09IEVPTCAmJiB0ICE9PSBFT0YpIHJvdy5wdXNoKHQpLCB0ID0gdG9rZW4oKTtcbiAgICAgIGlmIChmICYmIChyb3cgPSBmKHJvdywgbisrKSkgPT0gbnVsbCkgY29udGludWU7XG4gICAgICByb3dzLnB1c2gocm93KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdChyb3dzLCBjb2x1bW5zKSB7XG4gICAgaWYgKGNvbHVtbnMgPT0gbnVsbCkgY29sdW1ucyA9IGluZmVyQ29sdW1ucyhyb3dzKTtcbiAgICByZXR1cm4gW2NvbHVtbnMubWFwKGZvcm1hdFZhbHVlKS5qb2luKGRlbGltaXRlcildLmNvbmNhdChyb3dzLm1hcChmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJldHVybiBjb2x1bW5zLm1hcChmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdFZhbHVlKHJvd1tjb2x1bW5dKTtcbiAgICAgIH0pLmpvaW4oZGVsaW1pdGVyKTtcbiAgICB9KSkuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFJvd3Mocm93cykge1xuICAgIHJldHVybiByb3dzLm1hcChmb3JtYXRSb3cpLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRSb3cocm93KSB7XG4gICAgcmV0dXJuIHJvdy5tYXAoZm9ybWF0VmFsdWUpLmpvaW4oZGVsaW1pdGVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFZhbHVlKHRleHQpIHtcbiAgICByZXR1cm4gdGV4dCA9PSBudWxsID8gXCJcIlxuICAgICAgICA6IHJlRm9ybWF0LnRlc3QodGV4dCArPSBcIlwiKSA/IFwiXFxcIlwiICsgdGV4dC5yZXBsYWNlKC9cIi9nLCBcIlxcXCJcXFwiXCIpICsgXCJcXFwiXCJcbiAgICAgICAgOiB0ZXh0O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwYXJzZTogcGFyc2UsXG4gICAgcGFyc2VSb3dzOiBwYXJzZVJvd3MsXG4gICAgZm9ybWF0OiBmb3JtYXQsXG4gICAgZm9ybWF0Um93czogZm9ybWF0Um93c1xuICB9O1xufVxuIiwiaW1wb3J0IGRzdiBmcm9tIFwiLi9kc3ZcIjtcblxudmFyIGNzdiA9IGRzdihcIixcIik7XG5cbmV4cG9ydCB2YXIgY3N2UGFyc2UgPSBjc3YucGFyc2U7XG5leHBvcnQgdmFyIGNzdlBhcnNlUm93cyA9IGNzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIGNzdkZvcm1hdCA9IGNzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIGNzdkZvcm1hdFJvd3MgPSBjc3YuZm9ybWF0Um93cztcbiIsImltcG9ydCBkc3YgZnJvbSBcIi4vZHN2XCI7XG5cbnZhciB0c3YgPSBkc3YoXCJcXHRcIik7XG5cbmV4cG9ydCB2YXIgdHN2UGFyc2UgPSB0c3YucGFyc2U7XG5leHBvcnQgdmFyIHRzdlBhcnNlUm93cyA9IHRzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIHRzdkZvcm1hdCA9IHRzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIHRzdkZvcm1hdFJvd3MgPSB0c3YuZm9ybWF0Um93cztcbiIsImZ1bmN0aW9uIHJlc3BvbnNlSnNvbihyZXNwb25zZSkge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzICsgXCIgXCIgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgcmV0dXJuIGZldGNoKGlucHV0LCBpbml0KS50aGVuKHJlc3BvbnNlSnNvbik7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEd0ZXhVcmxzKCl7XG4gICAgY29uc3QgaG9zdCA9IFwiaHR0cHM6Ly9ndGV4cG9ydGFsLm9yZy9yZXN0L3YxL1wiOyAvLyBOT1RFOiB0b3AgZXhwcmVzc2VkIGdlbmVzIGFyZSBub3QgeWV0IGluIHByb2R1Y3Rpb25cbiAgICByZXR1cm4ge1xuICAgICAgICAvLyBcImdlbmVFeHBcIjogXCJodHRwczovL2d0ZXhwb3J0YWwub3JnL3Jlc3QvdjEvZGF0YXNldC9mZWF0dXJlRXhwcmVzc2lvbj9mZWF0dXJlPWdlbmUmZ2VuY29kZV9pZD1cIixcblxuICAgICAgICAvLyBcInNhbXBsZVwiOiBob3N0ICsgXCJkYXRhc2V0L3NhbXBsZT9kYXRhc2V0SWQ9Z3RleF92NyZmb3JtYXQ9anNvbiZzb3J0X2J5PXNhbXBsZUlkJnNvcnREaXI9YXNjJmRhdGFUeXBlPVwiLFxuICAgICAgICBcInNhbXBsZVwiOiBcImRhdGEvZ3RleC5TYW1wbGUuY3N2XCIsXG4gICAgICAgIFwiZ2VuZUlkXCI6IGhvc3QgKyBcInJlZmVyZW5jZS9nZW5lSWQ/Zm9ybWF0PWpzb24mZ2VuZUlkPVwiLFxuICAgICAgICBcImdlbmVFeHBcIjogaG9zdCArIFwiZXhwcmVzc2lvbi9nZW5lRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZnZW5jb2RlSWQ9XCIsXG4gICAgICAgIFwidGlzc3VlXCI6ICBob3N0ICsgXCJkYXRhc2V0L3Rpc3N1ZUluZm9cIixcbiAgICAgICAgXCJ0b3BJblRpc3N1ZUZpbHRlcmVkXCI6IGhvc3QgKyBcImV4cHJlc3Npb24vdG9wRXhwcmVzc2VkR2VuZXM/ZGF0YXNldElkPWd0ZXhfdjcmZmlsdGVyTXRHZW5lPXRydWUmc29ydF9ieT1tZWRpYW4mc29ydERpcmVjdGlvbj1kZXNjJnBhZ2Vfc2l6ZT01MCZ0aXNzdWVJZD1cIixcbiAgICAgICAgXCJ0b3BJblRpc3N1ZVwiOiBob3N0ICsgXCJleHByZXNzaW9uL3RvcEV4cHJlc3NlZEdlbmVzP2RhdGFzZXRJZD1ndGV4X3Y3JnNvcnRfYnk9bWVkaWFuJnNvcnREaXJlY3Rpb249ZGVzYyZwYWdlX3NpemU9NTAmdGlzc3VlSWQ9XCIsXG4gICAgICAgIFwibWVkRXhwQnlJZFwiOiBob3N0ICsgXCJleHByZXNzaW9uL21lZGlhbkdlbmVFeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmhjbHVzdGVyPXRydWUmcGFnZV9zaXplPTEwMDAwJmdlbmNvZGVJZD1cIixcblxuICAgICAgICBcImV4b25FeHBcIjogaG9zdCArIFwiZXhwcmVzc2lvbi9tZWRpYW5FeG9uRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZoY2x1c3Rlcj10cnVlJmdlbmNvZGVJZD1cIixcbiAgICAgICAgXCJqdW5jdGlvbkV4cFwiOiBob3N0ICsgXCJleHByZXNzaW9uL21lZGlhbkp1bmN0aW9uRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZoY2x1c3Rlcj10cnVlJmdlbmNvZGVJZD1cIixcbiAgICAgICAgXCJpc29mb3JtRXhwXCI6IGhvc3QgKyBcImV4cHJlc3Npb24vaXNvZm9ybUV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmYm94cGxvdERldGFpbD1tZWRpYW4mZ2VuY29kZUlkPVwiLFxuXG4gICAgICAgIFwiZ2VuZU1vZGVsXCI6IGhvc3QgKyBcInJlZmVyZW5jZS9jb2xsYXBzZWRHZW5lTW9kZWw/dW5maWx0ZXJlZD1mYWxzZSZyZWxlYXNlPXY3JmdlbmVJZD1cIixcbiAgICAgICAgXCJnZW5lTW9kZWxVbmZpbHRlcmVkXCI6IGhvc3QgKyBcInJlZmVyZW5jZS9jb2xsYXBzZWRHZW5lTW9kZWw/dW5maWx0ZXJlZD10cnVlJnJlbGVhc2U9djcmZ2VuZUlkPVwiLFxuICAgICAgICBcImlzb2Zvcm1cIjogaG9zdCArIFwicmVmZXJlbmNlL3RyYW5zY3JpcHQ/cmVsZWFzZT12NyZnZW5jb2RlX2lkPVwiLFxuXG4gICAgICAgIFwibGl2ZXJHZW5lRXhwXCI6IFwiZGF0YS90b3A1MC5nZW5lcy5saXZlci5nZW5vbWljLm1lZGlhbi50cG0uanNvblwiLCAvLyB0b3AgNTAgZ2VuZXMgaW4gR1RFeCBsaXZlclxuICAgICAgICBcImNlcmViZWxsdW1HZW5lRXhwXCI6IFwiZGF0YS90b3AuZ3RleC5jZXJlYmVsbHVtLmdlbmVzLm1lZGlhbi50cG0udHN2XCIsXG4gICAgICAgIFwibWF5b0dlbmVFeHBcIjogXCJkYXRhL2d0ZXgrbWF5by50b3AuY2VyZWJlbGx1bV9hZC5nZW5lcy5tZWRpYW4udHBtLnRzdlwiIC8vIHRoZSB0b3AgNTAgZ2VuZXMgaW4gTWF5byBDZXJlYmVsbHVtX0FEICsgdGhlaXIgZ3RleCBleHByZXNzaW9uIHZhbHVlc1xuICAgIH1cbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2VuZXMgZnJvbSBHVEV4IHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBnZW5lc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VHZW5lcyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gXCJnZW5lSWRcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJHZW5lIHdlYiBzZXJ2aWNlIHBhcnNpbmcgZXJyb3JcIjtcbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuLyoqXG4gKiBwYXJzZSB0aGUgdGlzc3Vlc1xuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgdGlzc3Vlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUaXNzdWVzKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSBcInRpc3N1ZUluZm9cIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJGYXRhbCBFcnJvcjogcGFyc2VUaXNzdWVzIGlucHV0IGVycm9yLlwiO1xuICAgIGNvbnN0IHRpc3N1ZXMgPSBkYXRhW2F0dHJdO1xuXG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgW1widGlzc3VlSWRcIiwgXCJ0aXNzdWVOYW1lXCIsIFwiY29sb3JIZXhcIl0uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCF0aXNzdWVzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZVRpc3N1ZSBhdHRyIG5vdCBmb3VuZDogXCIgKyBkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRpc3N1ZXM7XG59XG5cbi8qKlxuICogcGFyc2UgdGhlIGV4b25zXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBleG9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFeG9ucyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gXCJjb2xsYXBzZWRHZW5lTW9kZWxcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJGYXRhbCBFcnJvcjogcGFyc2VFeG9ucyBpbnB1dCBlcnJvci5cIiArIGRhdGE7XG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgW1wiZmVhdHVyZVR5cGVcIiwgXCJzdGFydFwiLCBcImVuZFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWRhdGFbYXR0cl1bMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlRXhvbnMgYXR0ciBub3QgZm91bmQ6IFwiICsgZDtcbiAgICB9KTtcbiAgICByZXR1cm4gZGF0YVthdHRyXS5maWx0ZXIoKGQpPT5kLmZlYXR1cmVUeXBlID09IFwiZXhvblwiKS5tYXAoKGQpPT57XG4gICAgICAgIGQuY2hyb21TdGFydCA9IGQuc3RhcnQ7XG4gICAgICAgIGQuY2hyb21FbmQgPSBkLmVuZDtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgfSk7XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBwYXJzZVNhbXBsZXMoZGF0YSl7XG4vLyAgICAgY29uc3QgYXR0ciA9IFwic2FtcGxlXCI7XG4vLyAgICAgaWYgKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZVNhbXBsZXMgaW5wdXQgZXJyb3IuIFwiICsgZGF0YTtcbi8vICAgICByZXR1cm4gZGF0YVthdHRyXTtcbi8vIH1cbi8vXG5cblxuLyoqXG4gKiBwYXJzZSB0aGUganVuY3Rpb25zXG4gKiBAcGFyYW0gZGF0YVxuICogQHJldHVybnMge0xpc3R9IG9mIGp1bmN0aW9uc1xuICogLy8gd2UgZG8gbm90IHN0b3JlIGp1bmN0aW9uIHN0cnVjdHVyZSBhbm5vdGF0aW9ucyBpbiBNb25nb1xuICAgIC8vIHNvIGhlcmUgd2UgdXNlIHRoZSBqdW5jdGlvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlIHRvIHJldHJpZXZlIHRoZSBqdW5jdGlvbiBnZW5vbWljIGxvY2F0aW9uc1xuICAgIC8vIGFzc3VtaW5nIHRoYXQgZWFjaCB0aXNzdWUgaGFzIHRoZSBzYW1lIGp1bmN0aW9ucyxcbiAgICAvLyB0byBncmFiIGFsbCB0aGUga25vd24ganVuY3Rpb25zIG9mIGEgZ2VuZSwgd2Ugb25seSBuZWVkIHRvIGxvb2sgYXQgb25lIHRpc3N1ZVxuICAgIC8vIGhlcmUgd2UgYXJiaXRyYXJpbHkgcGljayBMaXZlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnVuY3Rpb25zKGRhdGEpe1xuXG4gICAgY29uc3QgYXR0ciA9IFwibWVkaWFuSnVuY3Rpb25FeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlSnVuY3Rpb25zIGlucHV0IGVycm9yLiBcIiArIGRhdGE7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl0uZmlsdGVyKChkKT0+ZC50aXNzdWVJZD09XCJMaXZlclwiKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zID0gZC5qdW5jdGlvbklkLnNwbGl0KFwiX1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb206IHBvc1swXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbVN0YXJ0OiBwb3NbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb21FbmQ6IHBvc1syXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqdW5jdGlvbklkOiBkLmp1bmN0aW9uSWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG59XG5cbi8qKlxuICogcGFyc2UgdHJhbnNjcmlwdCBpc29mb3JtcyBmcm9tIHRoZSBHVEV4IHdlYiBzZXJ2aWNlOiBcInJlZmVyZW5jZS90cmFuc2NyaXB0P3JlbGVhc2U9djcmZ2VuY29kZV9pZD1cIlxuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiByZXR1cm5zIGEgZGljdGlvbmFyeSBvZiB0cmFuc2NyaXB0IGV4b24gb2JqZWN0IGxpc3RzIGluZGV4ZWQgYnkgRU5TVCBJRHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4b25zKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSBcInRyYW5zY3JpcHRcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJwYXJzZUlzb2Zvcm1zIGlucHV0IGVycm9yIFwiICsgZGF0YTtcbiAgICByZXR1cm4gZGF0YVthdHRyXS5maWx0ZXIoKGQpPT57cmV0dXJuIFwiZXhvblwiID09IGQuZmVhdHVyZVR5cGV9KVxuICAgICAgICAucmVkdWNlKChhLCBkKT0+e1xuICAgICAgICBpZiAoYVtkLnRyYW5zY3JpcHRJZF0gPT09IHVuZGVmaW5lZCkgYVtkLnRyYW5zY3JpcHRJZF0gPSBbXTtcbiAgICAgICAgYVtkLnRyYW5zY3JpcHRJZF0ucHVzaChkKTtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfSwge30pO1xufVxuXG4vKipcbiAqIHBhcnNlIHRyYW5zY3JpcHQgaXNvZm9ybXNcbiAqIEBwYXJhbSBkYXRhIHtKc29ufSBmcm9tIEdURXggd2ViIHNlcnZpY2UgXCJyZWZlcmVuY2UvdHJhbnNjcmlwdD9yZWxlYXNlPXY3JmdlbmNvZGVfaWQ9XCJcbiAqIHJldHVybnMgYSBsaXN0IG9mIGlzb2Zvcm0gb2JqZWN0c1xuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUlzb2Zvcm1zKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSBcInRyYW5zY3JpcHRcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coXCJwYXJzZUlzb2Zvcm1zIGlucHV0IGVycm9yXCIpO1xuICAgIHJldHVybiBkYXRhW2F0dHJdLmZpbHRlcigoZCk9PntyZXR1cm4gXCJ0cmFuc2NyaXB0XCIgPT0gZC5mZWF0dXJlVHlwZX0pLnNvcnQoKGEsIGIpPT57XG4gICAgICAgIGNvbnN0IGwxID0gTWF0aC5hYnMoYS5jaHJvbUVuZCAtIGEuY2hyb21TdGFydCkgKyAxO1xuICAgICAgICBjb25zdCBsMiA9IE1hdGguYWJzKGIuY2hyb21FbmQgLSBiLmNocm9tU3RhcnQpICsgMTtcbiAgICAgICAgcmV0dXJuIC0obDEtbDIpOyAvLyBzb3J0IGJ5IGlzb2Zvcm0gbGVuZ3RoIGluIGRlc2NlbmRpbmcgb3JkZXJcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSBmaW5hbCBnZW5lIG1vZGVsIGV4b24gZXhwcmVzc2lvblxuICogZXhwcmVzc2lvbiBpcyBub3JtYWxpemVkIHRvIHJlYWRzIHBlciBrYlxuICogQHBhcmFtIGRhdGEge0pTT059IG9mIGV4b24gZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIGV4b25zIHtMaXN0fSBvZiBleG9ucyB3aXRoIHBvc2l0aW9uc1xuICogQHBhcmFtIHVzZUxvZyB7Ym9vbGVhbn0gdXNlIGxvZzIgdHJhbnNmb3JtYXRpb25cbiAqIEBwYXJhbSBhZGp1c3Qge051bWJlcn0gZGVmYXVsdCAwLjAxXG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgZXhvbiBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV4b25FeHByZXNzaW9uKGRhdGEsIGV4b25zLCB1c2VMb2c9dHJ1ZSwgYWRqdXN0PTEpe1xuICAgIGNvbnN0IGV4b25EaWN0ID0gZXhvbnMucmVkdWNlKChhLCBkKT0+e2FbZC5leG9uSWRdID0gZDsgcmV0dXJuIGE7fSwge30pO1xuICAgIGNvbnN0IGF0dHIgPSBcIm1lZGlhbkV4b25FeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KFwicGFyc2VFeG9uRXhwcmVzc2lvbiBpbnB1dCBlcnJvclwiKTtcblxuICAgIGNvbnN0IGV4b25PYmplY3RzID0gZGF0YVthdHRyXTtcbiAgICAvLyBlcnJvci1jaGVja2luZ1xuICAgIFtcImRhdGFcIiwgXCJleG9uSWRcIiwgXCJ0aXNzdWVJZFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWV4b25PYmplY3RzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZUV4b25FeHByZXNzaW9uIGF0dHIgbm90IGZvdW5kOiBcIiArIGQ7XG4gICAgfSk7XG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gZXhvbiBjb3VudHNcbiAgICBleG9uT2JqZWN0cy5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIGNvbnN0IGV4b24gPSBleG9uRGljdFtkLmV4b25JZF07IC8vIGZvciByZXRyaWV2aW5nIGV4b24gcG9zaXRpb25zXG4gICAgICAgIC8vIGVycm9yLWNoZWNraW5nXG4gICAgICAgIFtcImVuZFwiLCBcInN0YXJ0XCJdLmZvckVhY2goKHApPT57XG4gICAgICAgICAgICBpZiAoIWV4b24uaGFzT3duUHJvcGVydHkocCkpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlRXhvbkV4cHJlc3Npb24gYXR0ciBub3QgZm91bmQ6IFwiICsgcDtcbiAgICAgICAgfSk7XG4gICAgICAgIGQubCA9IGV4b24uZW5kIC0gZXhvbi5zdGFydCArIDE7XG4gICAgICAgIGQudmFsdWUgPSBOdW1iZXIoZC5kYXRhKS9kLmw7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLmRhdGEpL2QubDtcbiAgICAgICAgaWYgKHVzZUxvZykgZC52YWx1ZSA9IE1hdGgubG9nMihkLnZhbHVlICsgMSk7XG4gICAgICAgIGQueCA9IGQuZXhvbklkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgICAgIGQuY2hyb21TdGFydCA9IGV4b24uc3RhcnQ7XG4gICAgICAgIGQuY2hyb21FbmQgPSBleG9uLmVuZDtcbiAgICAgICAgZC51bml0ID0gZC51bml0ICsgXCIgcGVyIGJhc2VcIjtcbiAgICB9KTtcbiAgICByZXR1cm4gZXhvbk9iamVjdHMuc29ydCgoYSxiKT0+e1xuICAgICAgICBpZiAoYS5jaHJvbVN0YXJ0PGIuY2hyb21TdGFydCkgcmV0dXJuIC0xO1xuICAgICAgICBpZiAoYS5jaHJvbVN0YXJ0PmIuY2hyb21TdGFydCkgcmV0dXJuIDE7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0pOyAvLyBzb3J0IGJ5IGdlbm9taWMgbG9jYXRpb24gaW4gYXNjZW5kaW5nIG9yZGVyXG59XG5cbi8qKlxuICogUGFyc2UganVuY3Rpb24gbWVkaWFuIHJlYWQgY291bnQgZGF0YVxuICogQHBhcmFtIGRhdGEge0pTT059IG9mIHRoZSBqdW5jdGlvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufSBwZXJmb3JtIGxvZyB0cmFuc2Zvcm1hdGlvblxuICogQHBhcmFtIGFkanVzdCB7TnVtYmVyfSBmb3IgaGFuZGxpbmcgMCdzIHdoZW4gdXNlTG9nIGlzIHRydWVcbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBqdW5jdGlvbiBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUp1bmN0aW9uRXhwcmVzc2lvbihkYXRhLCB1c2VMb2c9dHJ1ZSwgYWRqdXN0PTEpe1xuICAgIGNvbnN0IGF0dHIgPSBcIm1lZGlhbkp1bmN0aW9uRXhwcmVzc2lvblwiO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyhcInBhcnNlSnVuY3Rpb25FeHByZXNzaW9uIGlucHV0IGVycm9yXCIpO1xuXG4gICAgY29uc3QganVuY3Rpb25zID0gZGF0YVthdHRyXTtcblxuICAgIC8vIGVycm9yLWNoZWNraW5nXG4gICAgW1widGlzc3VlSWRcIiwgXCJqdW5jdGlvbklkXCIsIFwiZGF0YVwiLCBcImdlbmNvZGVJZFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWp1bmN0aW9uc1swXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgXCJGYXRhbCBFcnJvcjogcGFyc2VKdW5jdGlvbkV4cHJlc3Npb24gYXR0ciBub3QgZm91bmQ6IFwiICsgZDtcbiAgICB9KTtcblxuICAgIC8vIHBhcnNlIEdURXggbWVkaWFuIGp1bmN0aW9uIHJlYWQgY291bnRzXG4gICAganVuY3Rpb25zLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC54ID0gZC5qdW5jdGlvbklkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLm9yaWdpbmFsVmFsdWUgPSBOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkXG4gICAgfSk7XG5cbiAgICAvLyBzb3J0IGJ5IGdlbm9taWMgbG9jYXRpb24gaW4gYXNjZW5kaW5nIG9yZGVyXG4gICAgcmV0dXJuIGp1bmN0aW9ucy5zb3J0KChhLGIpPT57XG4gICAgICAgIGlmIChhLmp1bmN0aW9uSWQ+Yi5qdW5jdGlvbklkKSByZXR1cm4gMTtcbiAgICAgICAgZWxzZSBpZiAoYS5qdW5jdGlvbklkPGIuanVuY3Rpb25JZCkgcmV0dXJuIC0xO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSBpc29mb3JtIGV4cHJlc3Npb25cbiAqIEBwYXJhbSBkYXRhXG4gKiBAcGFyYW0gdXNlTG9nXG4gKiBAcGFyYW0gYWRqdXN0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gXCJpc29mb3JtRXhwcmVzc2lvblwiO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyhcInBhcnNlSXNvZm9ybUV4cHJlc3Npb24gaW5wdXQgZXJyb3JcIik7XG4gICAgLy8gcGFyc2UgR1RFeCBpc29mb3JtIG1lZGlhbiBUUE1cbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQueCA9IGQudHJhbnNjcmlwdElkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4cHJlc3Npb25UcmFuc3Bvc2UoZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gXCJpc29mb3JtRXhwcmVzc2lvblwiO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyhcInBhcnNlSXNvZm9ybUV4cHJlc3Npb24gaW5wdXQgZXJyb3JcIik7XG4gICAgLy8gcGFyc2UgR1RFeCBpc29mb3JtIG1lZGlhbiBUUE1cbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQueSA9IGQudHJhbnNjcmlwdElkO1xuICAgICAgICBkLnggPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuLyoqXG4gKiBwYXJzZSBtZWRpYW4gZ2VuZSBleHByZXNzaW9uXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn0gd2l0aCBhdHRyIG1lZGlhbkdlbmVFeHByZXNzaW9uXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufSBwZXJmb3JtcyBsb2cxMCB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1lZGlhbkV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUpe1xuICAgIGNvbnN0IGF0dHIgPSBcIm1lZGlhbkdlbmVFeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwicGFyc2VNZWRpYW5FeHByZXNzaW9uIGlucHV0IGVycm9yLlwiO1xuICAgIGNvbnN0IGFkanVzdCA9IDE7XG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gZ2VuZSBleHByZXNzaW9uXG4gICAgLy8gZXJyb3ItY2hlY2tpbmcgdGhlIHJlcXVpcmVkIGF0dHJpYnV0ZXM6XG4gICAgaWYgKGRhdGFbYXR0cl0ubGVuZ3RoID09IDApIHRocm93IFwicGFyc2VNZWRpYW5FeHByZXNzaW9uIGZpbmRzIG5vIGRhdGEuXCI7XG4gICAgW1wibWVkaWFuXCIsIFwidGlzc3VlSWRcIiwgXCJnZW5jb2RlSWRcIl0uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCFkYXRhW2F0dHJdWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBgcGFyc2VNZWRpYW5FeHByZXNzaW9uIGF0dHIgZXJyb3IuICR7ZH0gaXMgbm90IGZvdW5kYDtcbiAgICB9KTtcbiAgICBkYXRhLm1lZGlhbkdlbmVFeHByZXNzaW9uLmZvckVhY2goZnVuY3Rpb24oZCl7XG4gICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMChOdW1iZXIoZC5tZWRpYW4pICsgYWRqdXN0KTpOdW1iZXIoZC5tZWRpYW4pO1xuICAgICAgICBkLnggPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLnkgPSBkLmdlbmNvZGVJZDtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQubWVkaWFuKTtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkXG4gICAgfSk7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl07XG59XG5cbi8qKlxuICogcGFyc2UgdGhlIG1lZGlhbiBnZW5lIGV4cHJlc3Npb24sIG5vIGxvbmdlciBpbiB1c2VcbiAqIEBwYXJhbSBkYXRhIHtMaXN0fSBvZiBkYXRhIHBvaW50cyB3aXRoIGF0dHI6IHZhbHVlLCB0aXNzdWVJZCwgZ2VuZVN5bWJvbCwgZ2VuY29kZUlkXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufSBwZXJmb3JtIGxvZyB0cmFuc2Zvcm1hdGlvbiB1c2luZyBsb2cxMFxuICogQHJldHVybnMge0xpc3R9XG4gKi9cbi8vIGV4cG9ydCBmdW5jdGlvbiBwYXJzZU1lZGlhblRQTShkYXRhLCB1c2VMb2c9dHJ1ZSl7XG4vLyAgICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gVFBNIGpzb24gc3RhdGljIGZpbGVcbi8vICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24oZCl7XG4vLyAgICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMCgrZC5tZWRpYW5UUE0gKyAxKTorZC5tZWRpYW5UUE07XG4vLyAgICAgICAgIGQueCA9IGQudGlzc3VlSWQ7XG4vLyAgICAgICAgIGQueSA9IGQuZ2VuZVN5bWJvbDtcbi8vICAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gcGFyc2VGbG9hdChkLm1lZGlhblRQTSk7XG4vLyAgICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZDtcbi8vICAgICB9KTtcbi8vICAgICByZXR1cm4gZGF0YTtcbi8vIH1cblxuLyoqXG4gKiBwYXJzZSB0aGUgZ2VuZSBleHByZXNzaW9uXG4gKiBAcGFyYW0gZ2VuY29kZUlkIHtTdHJpbmd9XG4gKiBAcGFyYW0gZGF0YSB7SnNvbn0gd2l0aCBhdHRyOiB0aXNzdWVJZCwgZ2VuZVN5bWJvbFxuICogQHJldHVybnMge3tleHA6IHt9LCBnZW5lU3ltYm9sOiBzdHJpbmd9fVxuICovXG5mdW5jdGlvbiBwYXJzZUdlbmVFeHByZXNzaW9uKGdlbmNvZGVJZCwgZGF0YSl7XG4gICAgbGV0IGxvb2t1cFRhYmxlID0ge1xuICAgICAgICBleHA6IHt9LCAvLyBpbmRleGVkIGJ5IHRpc3N1ZUlkXG4gICAgICAgIGdlbmVTeW1ib2w6IFwiXCJcbiAgICB9O1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAoXCJwYXJzZUdlbmVFeHByZXNzaW9uIGlucHV0IGVycm9yLlwiKTtcbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmIChkLmdlbmNvZGVJZCA9PSBnZW5jb2RlSWQpIHtcbiAgICAgICAgICAgIC8vIGlmIHRoZSBnZW5jb2RlIElEIG1hdGNoZXMgdGhlIHF1ZXJ5IGdlbmNvZGVJZCxcbiAgICAgICAgICAgIC8vIGFkZCB0aGUgZXhwcmVzc2lvbiBkYXRhIHRvIHRoZSBsb29rdXAgdGFibGVcbiAgICAgICAgICAgIGxvb2t1cFRhYmxlLmV4cFtkLnRpc3N1ZUlkXSA9IGQuZGF0YTtcbiAgICAgICAgICAgIGlmIChcIlwiID09IGxvb2t1cFRhYmxlLmdlbmVTeW1ib2wpIGxvb2t1cFRhYmxlLmdlbmVTeW1ib2wgPSBkLmdlbmVTeW1ib2xcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBsb29rdXBUYWJsZVxufVxuXG4vKipcbiAqIE1ha2VzIHRoZSBqc29uIGZvciB0aGUgcGxvdGx5IGJveHBsb3QsIG5vIGxvbmdlciBpbiB1c2VcbiAqIEBwYXJhbSBnZW5jb2RlSWQge1N0cmluZ306IGEgZ2VuY29kZSBJRFxuICogQHBhcmFtIGRhdGEge09iamVjdH0gZ2VuZSBleHByZXNzaW9uIEFQSSBjYWxsXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufVxuICogQHBhcmFtIGNvbG9yIHtTdHJpbmd9XG4gKiBAcGFyYW0geGxpc3Qge0xpc3R9OiBhIGxpc3Qgb2YgdGlzc3VlIG9iamVjdHMge2lkOlN0cmluZywgbmFtZTpTdHJpbmd9XG4gKiBAcmV0dXJucyB7e3g6IEFycmF5LCB5OiBBcnJheSwgbmFtZTogc3RyaW5nLCB0eXBlOiBzdHJpbmcsIGxpbmU6IHt3aWR0aDogbnVtYmVyfSwgbWFya2VyOiB7Y29sb3I6IHN0cmluZ319fVxuICovXG4vLyBleHBvcnQgZnVuY3Rpb24gbWFrZUpzb25Gb3JQbG90bHkoZ2VuY29kZUlkLCBkYXRhLCB1c2VMb2c9ZmFsc2UsIGNvbG9yPVwiZ3JleVwiLCB4bGlzdCl7XG4vL1xuLy8gICAgIC8vIHJlZmVyZW5jZTogaHR0cHM6Ly9wbG90Lmx5L2phdmFzY3JpcHQvYm94LXBsb3RzL1xuLy9cbi8vICAgICBsZXQgbG9va3VwVGFibGUgPSBwYXJzZUdlbmVFeHByZXNzaW9uKGdlbmNvZGVJZCwgZGF0YSk7IC8vIGNvbnN0cnVjdHMgdGhlIHRpc3N1ZSBsb29rdXAgdGFibGUgaW5kZXhlZCBieSB0aXNzdWUgSURcbi8vICAgICBsZXQgeCA9IFtdO1xuLy8gICAgIGxldCB5ID0gW107XG4vL1xuLy8gICAgIC8vIHhsaXN0OiB0aGUgdGlzc3Vlc1xuLy8gICAgIHhsaXN0LmZvckVhY2goKGQpPT57XG4vLyAgICAgICAgIC8vIGQ6IGEgdGlzc3VlXG4vLyAgICAgICAgIGlmIChsb29rdXBUYWJsZS5leHBbZC5pZF09PT11bmRlZmluZWQpe1xuLy8gICAgICAgICAgICAgLy8gd2hlbiB0aGUgZ2VuZSBoYXMgbm8gZXhwcmVzc2lvbiBkYXRhIGluIHRpc3N1ZSBkLFxuLy8gICAgICAgICAgICAgLy8gcHJvdmlkZSBkdW1teSBkYXRhXG4vLyAgICAgICAgICAgICB4ID0geC5jb25jYXQoW2QubmFtZV0pO1xuLy8gICAgICAgICAgICAgeSA9IHkuY29uY2F0KFstMV0pO1xuLy8gICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgLy8gY29uY2F0ZW5hdGUgYSBsaXN0IG9mIHRoZSB0aXNzdWUgbGFiZWwgcmVwZWF0ZWRseSAobG9va3VwVGFibGUuZXhwW2RdLmxlbmd0aCB0aW1lcykgdG8geFxuLy8gICAgICAgICAgICAgLy8gY29uY2F0ZW5hdGUgYWxsIHRoZSBleHByZXNzaW9uIHZhbHVlcyB0byB5XG4vLyAgICAgICAgICAgICAvLyB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIHggYW5kIHkgbXVzdCBtYXRjaFxuLy8gICAgICAgICAgICAgeCA9IHguY29uY2F0KEFycmF5KGxvb2t1cFRhYmxlLmV4cFtkLmlkXS5sZW5ndGgpLmZpbGwoZC5uYW1lKSk7XG4vLyAgICAgICAgICAgICB5ID0geS5jb25jYXQobG9va3VwVGFibGUuZXhwW2QuaWRdKTtcbi8vICAgICAgICAgfVxuLy8gICAgIH0pO1xuLy8gICAgIHJldHVybiB7XG4vLyAgICAgICAgIHg6IHgsXG4vLyAgICAgICAgIHk6IHksXG4vLyAgICAgICAgIG5hbWU6IGxvb2t1cFRhYmxlLmdlbmVTeW1ib2wsXG4vLyAgICAgICAgIHR5cGU6ICdib3gnLFxuLy8gICAgICAgICBsaW5lOiB7d2lkdGg6MX0sXG4vLyAgICAgICAgIG1hcmtlcjoge2NvbG9yOmNvbG9yfSxcbi8vICAgICB9O1xuLy9cbi8vIH1cblxuLyoqXG4gKiBwYXJzZSB0aGUgZXhwcmVzc2lvbiBkYXRhIG9mIGEgZ2VuZSBmb3IgYSBncm91cGVkIHZpb2xpbiBwbG90XG4gKiBAcGFyYW0gZGF0YSB7SlNPTn0gZnJvbSBHVEV4IGdlbmUgZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIGNvbG9ycyB7RGljdGlvbmFyeX0gdGhlIHZpb2xpbiBjb2xvciBmb3IgZ2VuZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlR2VuZUV4cHJlc3Npb25Gb3JWaW9saW4oZGF0YSwgdXNlTG9nPXRydWUsIGNvbG9ycz11bmRlZmluZWQpe1xuICAgIGNvbnN0IGF0dHIgPSBcImdlbmVFeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwicGFyc2VHZW5lRXhwcmVzc2lvbkZvclZpb2xpbiBpbnB1dCBlcnJvci5cIjtcbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpPT57XG4gICAgICAgIGQudmFsdWVzID0gdXNlTG9nP2QuZGF0YS5tYXAoKGRkKT0+e3JldHVybiBNYXRoLmxvZzEwKCtkZCsxKX0pOmQuZGF0YTtcbiAgICAgICAgZC5ncm91cCA9IGQudGlzc3VlSWQ7XG4gICAgICAgIGQubGFiZWwgPSBkLmdlbmVTeW1ib2w7XG4gICAgICAgIGQuY29sb3IgPSBjb2xvcnM9PT11bmRlZmluZWQ/XCIjOTBjMWMxXCI6Y29sb3JzW2QuZ2VuY29kZUlkXTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cbiIsIi8qKlxuICogQ3JlYXRlZCBieSBsdWN5eHUgb24gNi85LzE3LlxuICogTW9kaWZpZWQgYnkgS2F0IG9uIDUvMTcvMjAxOC5cbiAqIFRoaXMgY29kZSBpcyBmb3IgZ2VuZXJhdGluZyBhIG9uZS10aW1lIHN0YXRpYyBhbmF0b21vZ3JhbSB3aXRoIGFsbCB0aGUgdGlzc3VlcyBoaWdobGlnaHRlZFxuICogdXNpbmcgdGhlIEdURXggdGlzc3VlIGNvbG9ycy5cbiAqIEl0IGlzIG5vdCBtZWFudCBmb3IgcmVwbGFjaW5nIHRoZSBHVEV4IGludGVyYWN0aXZlIGFuYXRvbW9ncmFtLlxuICovXG5cblxuaW1wb3J0IHtqc29ufSBmcm9tIFwiZDMtZmV0Y2hcIjtcbmltcG9ydCB7XG4gICAgZ2V0R3RleFVybHMsXG4gICAgcGFyc2VUaXNzdWVzXG59IGZyb20gXCIuL21vZHVsZXMvZ3RleERhdGFQYXJzZXJcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlcih1cmxzPWdldEd0ZXhVcmxzKCkpe1xuICAgIGNvbnN0IHByb21pc2VzID0gW1xuICAgICAgICBqc29uKHVybHMudGlzc3VlKSxcbiAgICAgICAganNvbihcImRhdGEvQW5hdG9tb2dyYW1EZXNjcmlwdGlvbnNDb3B5Lmpzb25cIilcbiAgICBdO1xuICAgIFByb21pc2UuYWxsKHByb21pc2VzKVxuICAgICAgICAudGhlbihmdW5jdGlvbihhcmdzKXtcbiAgICAgICAgICAgIGxldCB0aXNzdWVNZXRhZGF0YSA9IHBhcnNlVGlzc3VlcyhhcmdzWzBdKTtcbiAgICAgICAgICAgIGxldCBqc29uVGlzc3VlcyA9IGFyZ3NbMV07XG5cbiAgICAgICAgICAgIC8vIHN0b3JlIHRoZSB0aXNzdWUgY29sb3IgaW4ganNvblRpc3N1ZXMgbG9va3VwIHRhYmxlXG4gICAgICAgICAgICB0aXNzdWVNZXRhZGF0YS5mb3JFYWNoKCh0KT0+e1xuICAgICAgICAgICAgICAgIGpzb25UaXNzdWVzW3QudGlzc3VlSWRdLmNvbG9ySGV4ID0gdC5jb2xvckhleDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBsZXQgc3BlY2lhbFRpc3N1ZXMgPSBbXCJVQkVST05fMDAwMjM2N1wiLCBcIlVCRVJPTl8wMDAwNDczXCIsIFwiVUJFUk9OXzAwMDAwMDdcIiwgXCJVQkVST05fMDAwMDk0NVwiLCBcIlVCRVJPTl8wMDAxMDQ0XCIsIFwiVUJFUk9OXzAwMDM4ODlcIiwgXCJVQkVST05fMDAwMDAwMlwiXTsgLy90aXNzdWVzIHRoYXQgbmVlZCB0byBiZSBoaWdobGlnaHRlZCBpbiBzcGVjaWFsIHdheXNcblxuICAgICAgICAgICAgLy8galF1ZXJ5OiBjb2xvciB0aGUgYW5hdG9tb2dyYW0gdGlzc3VlcyB1c2luZyB0aGUgR1RFeCB0aXNzdWUgY29sb3JzXG4gICAgICAgICAgICBsZXQgc3ZnVGlzc3VlcyA9ICQoXCJnI0xBWUVSX0VGT1wiKS5jaGlsZHJlbigpO1xuICAgICAgICAgICAgJC5lYWNoKHN2Z1Rpc3N1ZXMsIGZ1bmN0aW9uKGksIHQpe1xuICAgICAgICAgICAgICAgIGxldCBpZCA9ICQodCkuYXR0cihcImlkXCIpO1xuICAgICAgICAgICAgICAgIGxldCB0aXNzdWVJZCA9IE9iamVjdC5rZXlzKGpzb25UaXNzdWVzKS5maWx0ZXIoKHRpc3N1ZUlkKT0+e1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ganNvblRpc3N1ZXNbdGlzc3VlSWRdLklETmFtZSA9PSBpZFxuICAgICAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgICAgIGlmICh0aXNzdWVJZCAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGlzc3VlSWQpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGlzc3VlQ29sb3IgPSBcIiNcIiArIGpzb25UaXNzdWVzW3Rpc3N1ZUlkXS5jb2xvckhleDtcbiAgICAgICAgICAgICAgICAgICAgJCh0KS5jc3MoJ2ZpbGwnLCB0aXNzdWVDb2xvcik7XG4gICAgICAgICAgICAgICAgICAgICQodCkuY3NzKCdmaWxsLW9wYWNpdHknLCAwLjUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIH0pXG59XG5cbi8vIHZhciByZW5kZXJBbmF0b21vZ3JhbSA9IGZ1bmN0aW9uKCkge1xuLy9cbi8vICAgICAkLmdldEpTT04oXCJkYXRhL0FuYXRvbW9ncmFtRGVzY3JpcHRpb25zQ29weS5qc29uXCIsIGZ1bmN0aW9uIChqc29uVGlzc3Vlcykge1xuLy9cbi8vICAgICAgICAgc2NhbGVTdmdzKFwiZnVsbEJvZHlTdmdcIik7XG4vLyAgICAgICAgIHZhciBzcGVjaWFsVGlzc3VlcyA9IFtcIlVCRVJPTl8wMDAyMzY3XCIsIFwiVUJFUk9OXzAwMDA0NzNcIiwgXCJVQkVST05fMDAwMDAwN1wiLCBcIlVCRVJPTl8wMDAwOTQ1XCIsIFwiVUJFUk9OXzAwMDEwNDRcIiwgXCJVQkVST05fMDAwMzg4OVwiLCBcIlVCRVJPTl8wMDAwMDAyXCJdOyAvL3Rpc3N1ZXMgdGhhdCBuZWVkIHRvIGJlIGhpZ2hsaWdodGVkIGluIHNwZWNpYWwgd2F5c1xuLy8gICAgICAgICB2YXIgc3ZnVGlzc3VlcyA9ICQoXCJnI0xBWUVSX0VGT1wiKS5jaGlsZHJlbigpO1xuLy8gICAgICAgICB2YXIgdGlzc3VlTWV0YWRhdGEgPSB0aXNzdWVNZXRhZGF0YUpzb247XG4vL1xuLy8gICAgICAgICBjcmVhdGVUaXNzdWVUYWJsZShcImZ1bGxCb2R5XCIpO1xuLy9cbi8vICAgICAgICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbihzaXplKSB7XG4vLyAgICAgICAgICAgICAkKFwiI2Z1bGxCb2R5U3ZnIC5zdmdDb250YWluZXJcIikuY3NzKFwiaGVpZ2h0XCIsIFwiXCIrJChcIiNmdWxsQm9keVN2ZyAuc3ZnQ29udGFpbmVyXCIpLndpZHRoKCkqMS44NSk7XG4vLyAgICAgICAgICAgICAkKFwiI2JyYWluU3ZnIC5zdmdDb250YWluZXJcIikuY3NzKFwiaGVpZ2h0XCIsIFwiXCIrJChcIiNicmFpblN2ZyAuc3ZnQ29udGFpbmVyXCIpLndpZHRoKCkqMC44ODUpO1xuLy8gICAgICAgICAgICAgLy9hbmF0b21vZ3JhbSB0cmFuc2Zvcm0gc2NhbGUgZmFjdG9yIGRldGVybWluZWQgYnkgZGl2aWRpbmcgdGhlIHdpbmRvdyB3aWR0aCBieSB0aGUgb3B0aW1hbCBzY2FsZSBmb3IgdGhhdCBzaXplXG4vLyAgICAgICAgICAgICBpZiAoJCh3aW5kb3cpLndpZHRoKCk+MTIwMCkge1xuLy8gICAgICAgICAgICAgICAgICQoXCIjZnVsbEJvZHlTdmcgLnN2Z0ltYWdlXCIpLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJzY2FsZShcIisoJCh3aW5kb3cpLndpZHRoKCkvNTI1KStcIilcIik7XG4vLyAgICAgICAgICAgICAgICAgJChcIiNicmFpblN2ZyAuc3ZnSW1hZ2VcIikuYXR0cihcInRyYW5zZm9ybVwiLCBcInNjYWxlKFwiKygkKHdpbmRvdykud2lkdGgoKS8zNjIpK1wiKVwiKTtcbi8vICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgIGVsc2Uge1xuLy8gICAgICAgICAgICAgICAgICQoXCIjZnVsbEJvZHlTdmcgLnN2Z0ltYWdlXCIpLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJzY2FsZShcIisoJCh3aW5kb3cpLndpZHRoKCkvMjYzKStcIilcIik7XG4vLyAgICAgICAgICAgICAgICAgJChcIiNicmFpblN2ZyAuc3ZnSW1hZ2VcIikuYXR0cihcInRyYW5zZm9ybVwiLCBcInNjYWxlKFwiKygkKHdpbmRvdykud2lkdGgoKS8xODEpK1wiKVwiKTtcbi8vICAgICAgICAgICAgIH1cbi8vICAgICAgICAgfSk7XG4vL1xuLy8gICAgICAgICAkLmVhY2goc3ZnVGlzc3VlcywgZnVuY3Rpb24gKGluZGV4LCBzdmdUaXNzdWUpIHtcbi8vICAgICAgICAgICAgIHZhciBzdmdJZE5hbWUgPSAkKHN2Z1Rpc3N1ZSkuYXR0cihcImlkXCIpO1xuLy8gICAgICAgICAgICAgLy9naXZlcyBhIGNsYXNzIGF0dHJpYnV0ZSB0byBldmVyeSB0aXNzdWUgaW4gdGhlIGFuYXRvbW9ncmFtIGJhc2VkIG9uIHRoZSB0aXNzdWUncyBpZFxuLy8gICAgICAgICAgICAgJChzdmdUaXNzdWUpLmF0dHIoXCJjbGFzc1wiLCBzdmdJZE5hbWUpO1xuLy8gICAgICAgICAgICAgLy9yZW1vdmVzIHRoZSB0aXRsZSBlbGVtZW50IG9mIGVhY2ggdGlzc3VlIHNvIGFzIHRvIHByZXZlbnQgdG9vbHRpcCBmcm9tIHBvcHBpbmcgdXBcbi8vICAgICAgICAgICAgICQoXCIuZ3hhQW5hdG9tb2dyYW0gdGl0bGVcIikucmVtb3ZlKCk7XG4vLyAgICAgICAgICAgICB2YXIgdGlzc3VlSWQ9YW5hdG9tb2dyYW1JZFRvVGlzc3VlSWQoc3ZnSWROYW1lKTtcbi8vXG4vLyAgICAgICAgICAgICAkKHN2Z1Rpc3N1ZSkubW91c2VlbnRlcihmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgICAgICAgICAgY29sb3JUaXNzdWUodGlzc3VlSWQpO1xuLy8gICAgICAgICAgICAgICAgIHZhciBhbmF0b21vZ3JhbVRhYmxlID0gJChcIiNhbmF0b21vZ3JhbVRhYmxlV3JhcHBlclwiKS5EYXRhVGFibGUoKVxuLy8gICAgICAgICAgICAgICAgIGFuYXRvbW9ncmFtVGFibGUucm93cygpLmV2ZXJ5KGZ1bmN0aW9uKGluZGV4KSB7XG4vLyAgICAgICAgICAgICAgICAgICAgIHZhciBhbmF0b21vZ3JhbUlkID0ganNvblRpc3N1ZXNbdGlzc3VlTmFtZVRvVGlzc3VlSWQodGhpcy5kYXRhKClbMV0pXS5JRE5hbWU7XG4vLyAgICAgICAgICAgICAgICAgICAgIGlmIChhbmF0b21vZ3JhbUlkID09PSBzdmdJZE5hbWUpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcy5ub2RlKCkpLmFkZENsYXNzKFwiYW5hdG9tb2dyYW1Sb3dIaWdobGlnaHRcIik7XG4vLyAgICAgICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgICB9KVxuLy8gICAgICAgICAgICAgICAgICQoXCIuYW5hdG9tb2dyYW0tcGxvdHZpei10b29sdGlwXCIpLmNzcyhcImxlZnRcIiwgKGV2ZW50LnBhZ2VYKzEwKSArIFwicHhcIik7XG4vLyAgICAgICAgICAgICAgICAgJChcIi5hbmF0b21vZ3JhbS1wbG90dml6LXRvb2x0aXBcIikuY3NzKFwidG9wXCIsIChldmVudC5wYWdlWSsxMCkgKyBcInB4XCIpO1xuLy8gICAgICAgICAgICAgICAgICQoXCIuYW5hdG9tb2dyYW0tcGxvdHZpei10b29sdGlwXCIpLmh0bWwoXCJcIik7XG4vLyAgICAgICAgICAgICAgICAgJC5lYWNoKGpzb25UaXNzdWVzLCBmdW5jdGlvbiAoaW5kZXgpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgIGlmIChqc29uVGlzc3Vlc1tpbmRleF0uSUROYW1lID09PSBzdmdJZE5hbWUpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAkKFwiLmFuYXRvbW9ncmFtLXBsb3R2aXotdG9vbHRpcFwiKS5odG1sKCQoXCIuYW5hdG9tb2dyYW0tcGxvdHZpei10b29sdGlwXCIpLmh0bWwoKSArICh0aXNzdWVNZXRhZGF0YVtpbmRleF0udGlzc3VlTmFtZSkuYm9sZCgpICsgXCI8YnIgY2xhc3M9J2FuYXRvbW9ncmFtQnJlYWsnPlwiICsgXCJNYWluIFNhbXBsaW5nIFNpdGU6IFwiICsgSlNPTi5zdHJpbmdpZnkoanNvblRpc3N1ZXNbaW5kZXhdLkRlc2NyaXB0aW9uKS5yZXBsYWNlKC9cXFwiL2csIFwiXCIpICsgXCI8YnI+PGJyPlwiKTtcbi8vICAgICAgICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgICB9KTtcbi8vICAgICAgICAgICAgICAgICAkKFwiLmFuYXRvbW9ncmFtLXBsb3R2aXotdG9vbHRpcFwiKS5zaG93KCk7XG4vLyAgICAgICAgICAgICB9KTtcbi8vXG4vLyAgICAgICAgICAgICAkKHN2Z1Rpc3N1ZSkubW91c2VsZWF2ZShmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgICAgICAgICAgdW5jb2xvclRpc3N1ZSh0aXNzdWVJZCk7XG4vLyAgICAgICAgICAgICAgICAgJChcIi5hbmF0b21vZ3JhbS1wbG90dml6LXRvb2x0aXBcIikuaHRtbChcIlwiKTtcbi8vICAgICAgICAgICAgICAgICAkKFwiLmFuYXRvbW9ncmFtLXBsb3R2aXotdG9vbHRpcFwiKS5oaWRlKCk7XG4vLyAgICAgICAgICAgICAgICAgJChcIiNhbmF0b21vZ3JhbVRhYmxlV3JhcHBlciB0clwiKS5yZW1vdmVDbGFzcyhcImFuYXRvbW9ncmFtUm93SGlnaGxpZ2h0XCIpO1xuLy8gICAgICAgICAgICAgfSk7XG4vLyAgICAgICAgIH0pO1xuLy9cbi8vICAgICAgICAgJCgnI2Z1bGxTdmdTd2l0Y2gnKS5jbGljayhmdW5jdGlvbihldmVudCkge1xuLy8gICAgICAgICBcdCQoJyNmdWxsQm9keVN2ZycpLnNob3coKTtcbi8vICAgICAgICAgXHQkKCcjYnJhaW5TdmcnKS5oaWRlKCk7XG4vLyAgICAgICAgIFx0c2NhbGVTdmdzKFwiZnVsbEJvZHlTdmdcIik7XG4vLyAgICAgICAgIFx0Y3JlYXRlVGlzc3VlVGFibGUoXCJmdWxsQm9keVwiKTtcbi8vICAgICAgICAgXHQkKCcjYnJhaW5TdmdTd2l0Y2gnKS5yZW1vdmVDbGFzcyhcImFuYXRvbW9ncmFtLXZpZXctb3B0aW9uLXNlbGVjdGVkXCIpO1xuLy8gICAgICAgICBcdCQoJyNmdWxsU3ZnU3dpdGNoJykuYWRkQ2xhc3MoXCJhbmF0b21vZ3JhbS12aWV3LW9wdGlvbi1zZWxlY3RlZFwiKTtcbi8vICAgICAgICAgfSk7XG4vL1xuLy8gICAgICAgICAkKCcjYnJhaW5TdmdTd2l0Y2gnKS5jbGljayhmdW5jdGlvbihldmVudCkge1xuLy8gICAgICAgICBcdCQoJyNicmFpblN2ZycpLnNob3coKTtcbi8vICAgICAgICAgXHQkKCcjZnVsbEJvZHlTdmcnKS5oaWRlKCk7XG4vLyAgICAgICAgICAgICBzY2FsZVN2Z3MoXCJicmFpblN2Z1wiKTtcbi8vICAgICAgICAgICAgIGNyZWF0ZVRpc3N1ZVRhYmxlKFwiYnJhaW5cIik7XG4vLyAgICAgICAgIFx0JCgnI2Z1bGxTdmdTd2l0Y2gnKS5yZW1vdmVDbGFzcyhcImFuYXRvbW9ncmFtLXZpZXctb3B0aW9uLXNlbGVjdGVkXCIpO1xuLy8gICAgICAgICBcdCQoJyNicmFpblN2Z1N3aXRjaCcpLmFkZENsYXNzKFwiYW5hdG9tb2dyYW0tdmlldy1vcHRpb24tc2VsZWN0ZWRcIik7XG4vLyAgICAgICAgIH0pO1xuLy9cbi8vICAgICAgICAgLy9yZXR1cm5zIHRoZSB0aXNzdWVfaWQgZ2l2ZW4gdGhlIGFuYXRvbW9ncmFtIGlkXG4vLyAgICAgICAgIGZ1bmN0aW9uIGFuYXRvbW9ncmFtSWRUb1Rpc3N1ZUlkIChhbmF0b21vZ3JhbUlkKSB7XG4vLyAgICAgICAgICAgICB2YXIgaWQ9XCJcIlxuLy8gICAgICAgICAgICAgJC5lYWNoKGpzb25UaXNzdWVzLCBmdW5jdGlvbiAoaW5kZXgpIHtcbi8vICAgICAgICAgICAgICAgICBpZiAoanNvblRpc3N1ZXNbaW5kZXhdLklETmFtZSA9PT0gYW5hdG9tb2dyYW1JZCkge1xuLy8gICAgICAgICAgICAgICAgICAgICBpZD1pbmRleDtcbi8vICAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICB9KTtcbi8vICAgICAgICAgICAgIHJldHVybiBpZDtcbi8vICAgICAgICAgfVxuLy9cbi8vICAgICAgICAgLy9yZXR1cm5zIHRoZSB0aXNzdWVfaWQgZ2l2ZW4gdGhlIHRpc3N1ZU5hbWVcbi8vICAgICAgICAgZnVuY3Rpb24gdGlzc3VlTmFtZVRvVGlzc3VlSWQodGlzc3VlTmFtZSkge1xuLy8gICAgICAgICAgICAgdmFyIGlkID0gXCJcIjtcbi8vICAgICAgICAgICAgICQuZWFjaChqc29uVGlzc3VlcywgZnVuY3Rpb24gKGpzb25UaXNzdWUpIHtcbi8vICAgICAgICAgICAgICAgICBpZiAodGlzc3VlTWV0YWRhdGFbanNvblRpc3N1ZV0udGlzc3VlTmFtZSA9PT0gdGlzc3VlTmFtZSkge1xuLy8gICAgICAgICAgICAgICAgICAgICBpZCA9IGpzb25UaXNzdWU7XG4vLyAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgfSk7XG4vLyAgICAgICAgICAgICByZXR1cm4gaWQ7XG4vLyAgICAgICAgIH1cbi8vXG4vLyAgICAgICAgIC8vaGlnaGxpZ2h0cyB0aGUgdGlzc3VlIGdpdmVuIHRoZSB0aXNzdWVfaWRcbi8vICAgICAgICAgZnVuY3Rpb24gY29sb3JUaXNzdWUodGlzc3VlSWQpIHtcbi8vICAgICAgICAgICAgIHZhciB0aXNzdWVDb2xvciA9IFwiI1wiICsgdGlzc3VlTWV0YWRhdGFbdGlzc3VlSWRdLmNvbG9ySGV4O1xuLy8gICAgICAgICAgICAgdmFyIHN2Z0lkTmFtZSA9IGpzb25UaXNzdWVzW3Rpc3N1ZUlkXS5JRE5hbWU7XG4vLyAgICAgICAgICAgICAkKFwiLlwiICsgc3ZnSWROYW1lKS5jc3MoXCJmaWxsXCIsIHRpc3N1ZUNvbG9yKTtcbi8vICAgICAgICAgICAgICQoXCIuXCIgKyBzdmdJZE5hbWUpLmNzcyhcImZpbGwtb3BhY2l0eVwiLCBcIjAuN1wiKTtcbi8vXG4vLyAgICAgICAgICAgICBpZiAoc3ZnSWROYW1lID09PSBcIlVCRVJPTl8wMDAyMzY3XCIgfHwgc3ZnSWROYW1lID09PSBcIlVCRVJPTl8wMDAwNDczXCIpIHtcbi8vICAgICAgICAgICAgICAgICAkKFwiLlwiICsgc3ZnSWROYW1lKS5jc3MoXCJzdHJva2VcIiwgXCJibGFja1wiKTtcbi8vICAgICAgICAgICAgICAgICAkKCQoXCIuXCIgKyBzdmdJZE5hbWUpLmNoaWxkcmVuKCkpLmNzcyhcInN0cm9rZVwiLCBcImJsYWNrXCIpO1xuLy8gICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgaWYgKHN2Z0lkTmFtZSA9PT0gXCJVQkVST05fMDAwMDAwN1wiIHx8IHN2Z0lkTmFtZSA9PT0gXCJVQkVST05fMDAwMDk5MlwiIHx8IHN2Z0lkTmFtZSA9PT0gXCJVQkVST05fMDAwMzg4OVwiIHx8IHN2Z0lkTmFtZSA9PT0gXCJVQkVST05fMDAwMDAwMlwiKSB7XG4vLyAgICAgICAgICAgICAgICAgJChcIi5cIiArIHN2Z0lkTmFtZSkuY3NzKFwic3Ryb2tlXCIsIHRpc3N1ZUNvbG9yKTtcbi8vICAgICAgICAgICAgICAgICAkKFwiLlwiICsgc3ZnSWROYW1lKS5jc3MoXCJmaWxsLW9wYWNpdHlcIiwgXCIxXCIpO1xuLy8gICAgICAgICAgICAgICAgICQoXCIuXCIgKyBzdmdJZE5hbWUpLmNzcyhcInN0cm9rZS13aWR0aFwiLCBcIjEuMVwiKTtcbi8vICAgICAgICAgICAgIH1cbi8vXG4vLyAgICAgICAgIH1cbi8vXG4vLyAgICAgICAgIC8vdW5oaWdobGlnaHRzIHRoZSB0aXNzdWUgZ2l2ZW4gdGhlIHRpc3N1ZV9pZFxuLy8gICAgICAgICBmdW5jdGlvbiB1bmNvbG9yVGlzc3VlKHRpc3N1ZUlkKSB7XG4vLyAgICAgICAgICAgICB2YXIgc3ZnSWROYW1lID0ganNvblRpc3N1ZXNbdGlzc3VlSWRdLklETmFtZTtcbi8vICAgICAgICAgICAgICQoXCIuXCIrc3ZnSWROYW1lKS5jc3MoXCJmaWxsXCIsIFwiI0E0QTRBNFwiKTtcbi8vICAgICAgICAgICAgICQoXCIuXCIrc3ZnSWROYW1lKS5jc3MoXCJmaWxsLW9wYWNpdHlcIiwgXCIwLjVcIik7XG4vL1xuLy8gICAgICAgICAgICAgaWYgKHNwZWNpYWxUaXNzdWVzLmluY2x1ZGVzKHN2Z0lkTmFtZSkpIHtcbi8vICAgICAgICAgICAgICAgICAkKFwiLlwiK3N2Z0lkTmFtZSkuY3NzKFwic3Ryb2tlXCIsIFwibm9uZVwiKTtcbi8vICAgICAgICAgICAgICAgICAkKCQoXCIuXCIrc3ZnSWROYW1lKS5jaGlsZHJlbigpKS5jc3MoXCJzdHJva2VcIixcIm5vbmVcIik7XG4vLyAgICAgICAgICAgICB9XG4vLyAgICAgICAgIH1cbi8vXG4vLyAgICAgICAgIGZ1bmN0aW9uIHNjYWxlU3Zncyh0eXBlKSB7XG4vLyAgICAgICAgICAgICB2YXIgZnVsbEJvZHlBbmF0b21vZ3JhbVNjYWxlRmFjdG9yID0gNTI1O1xuLy8gICAgICAgICAgICAgdmFyIGZ1bGxCb2R5Q29udGFpbmVyU2NhbGVGYWN0b3IgPSAxLjg1O1xuLy8gICAgICAgICAgICAgdmFyIGJyYWluQW5hdG9tb2dyYW1TY2FsZUZhY3RvciA9IDM2Mjtcbi8vICAgICAgICAgICAgIHZhciBicmFpbkNvbnRhaW5lclNjYWxlRmFjdG9yID0gMC44ODU7XG4vLyAgICAgICAgICAgICBpZiAodHlwZT09PVwiZnVsbEJvZHlTdmdcIikge1xuLy8gICAgICAgICAgICAgICAgIHZhciBhbmF0b21vZ3JhbVNjYWxlRmFjdG9yID0gZnVsbEJvZHlBbmF0b21vZ3JhbVNjYWxlRmFjdG9yO1xuLy8gICAgICAgICAgICAgICAgIHZhciBjb250YWluZXJTY2FsZUZhY3RvciA9IGZ1bGxCb2R5Q29udGFpbmVyU2NhbGVGYWN0b3I7XG4vLyAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICBlbHNlIHtcbi8vICAgICAgICAgICAgICAgICB2YXIgYW5hdG9tb2dyYW1TY2FsZUZhY3RvciA9IGJyYWluQW5hdG9tb2dyYW1TY2FsZUZhY3Rvcjtcbi8vICAgICAgICAgICAgICAgICB2YXIgY29udGFpbmVyU2NhbGVGYWN0b3IgPSBicmFpbkNvbnRhaW5lclNjYWxlRmFjdG9yO1xuLy8gICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgJChcIiNcIiArIHR5cGUgKyBcIiAuc3ZnQ29udGFpbmVyXCIpLmNzcyhcImhlaWdodFwiLCBcIlwiKyAkKFwiI1wiICsgdHlwZSArXCIgLnN2Z0NvbnRhaW5lclwiKS53aWR0aCgpKmNvbnRhaW5lclNjYWxlRmFjdG9yKTtcbi8vICAgICAgICAgICAgIGlmICgkKHdpbmRvdykud2lkdGgoKT4xMjAwKSB7XG4vLyAgICAgICAgICAgICAgICAgJChcIiNcIiArIHR5cGUgK1wiIC5zdmdJbWFnZVwiKS5hdHRyKFwidHJhbnNmb3JtXCIsIFwic2NhbGUoXCIrKCQod2luZG93KS53aWR0aCgpL2FuYXRvbW9ncmFtU2NhbGVGYWN0b3IpK1wiKVwiKTtcbi8vICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgIGVsc2Uge1xuLy8gICAgICAgICAgICAgICAgICQoXCIjXCIgKyB0eXBlICtcIiAuc3ZnSW1hZ2VcIikuYXR0cihcInRyYW5zZm9ybVwiLCBcInNjYWxlKFwiKygkKHdpbmRvdykud2lkdGgoKS8oYW5hdG9tb2dyYW1TY2FsZUZhY3Rvci8yKSkrXCIpXCIpO1xuLy8gICAgICAgICAgICAgfVxuLy8gICAgICAgICB9XG4vL1xuLy8gICAgICAgICBmdW5jdGlvbiBjcmVhdGVUaXNzdWVUYWJsZSh0eXBlKSB7XG4vLyAgICAgICAgICAgICAkKFwiI2FuYXRvbW9ncmFtVGFibGVEaXNwbGF5XCIpLmh0bWwoXCJcIik7XG4vLyAgICAgICAgICAgICB2YXIgb1RhYmxlID0gJCgnPHRhYmxlIGlkPVwiYW5hdG9tb2dyYW1UYWJsZVdyYXBwZXJcIj48L3RhYmxlPicpO1xuLy8gICAgICAgICAgICAgJChcIiNhbmF0b21vZ3JhbVRhYmxlRGlzcGxheVwiKS5hcHBlbmQob1RhYmxlKTtcbi8vICAgICAgICAgICAgIHZhciB0aGVhZCA9ICQoJzx0aGVhZD48L3RoZWFkPicpO1xuLy8gICAgICAgICAgICAgJChvVGFibGUpLmFwcGVuZCh0aGVhZCk7XG4vLyAgICAgICAgICAgICB2YXIgdGJvZHkgPSAkKCc8dGJvZHk+PC90Ym9keT4nKTtcbi8vICAgICAgICAgICAgICQob1RhYmxlKS5hcHBlbmQodGJvZHkpO1xuLy9cbi8vICAgICAgICAgICAgIHZhciB0ciA9ICQoXCI8dHI+PC90cj5cIik7XG4vLyAgICAgICAgICAgICAkKHRoZWFkKS5hcHBlbmQodHIpO1xuLy8gICAgICAgICAgICAgdmFyIHRkMSA9ICQoJzx0aCAgc3R5bGU9XCJtYXgtd2lkdGg6IDEwcHggIWltcG9ydGFudDtcIj48L3RoPicpO1xuLy8gICAgICAgICAgICAgJCh0cikuYXBwZW5kKHRkMSk7XG4vLyAgICAgICAgICAgICB2YXIgdGQyID0gJCgnPHRoPlRpc3N1ZTwvdGg+Jyk7XG4vLyAgICAgICAgICAgICAkKHRyKS5hcHBlbmQodGQyKTtcbi8vICAgICAgICAgICAgIHZhciB0ZDMgPSAkKCc8dGg+TWFpbiBTYW1wbGluZyBTaXRlPC90aD4nKTtcbi8vICAgICAgICAgICAgICQodHIpLmFwcGVuZCh0ZDMpO1xuLy9cbi8vICAgICAgICAgICAgIGlmICh0eXBlPT09XCJmdWxsQm9keVwiKSB7XG4vLyAgICAgICAgICAgICAgICAgJC5lYWNoKGpzb25UaXNzdWVzLCBmdW5jdGlvbiAoanNvblRpc3N1ZSkge1xuLy8gICAgICAgICAgICAgICAgICAgICB2YXIgdHIgPSAkKFwiPHRyPjwvdHI+XCIpO1xuLy8gICAgICAgICAgICAgICAgICAgICAkKHRib2R5KS5hcHBlbmQodHIpO1xuLy8gICAgICAgICAgICAgICAgICAgICB2YXIgdGQxID0gJCgnPHRkIHN0eWxlPVwid2lkdGg6IDEwcHg7XCI+PHN2ZyB3aWR0aD1cIjEwcHhcIiBoZWlnaHQ9XCIxMHB4XCI+PGNpcmNsZSBjeD1cIjUwJVwiIGN5PVwiNTAlXCIgcj1cIjVweFwiIGZpbGw9JyArICcjJyArIHRpc3N1ZU1ldGFkYXRhW2pzb25UaXNzdWVdLmNvbG9ySGV4ICsgJy8+PC9zdmc+PC90ZD4nKTtcbi8vICAgICAgICAgICAgICAgICAgICAgJCh0cikuYXBwZW5kKHRkMSk7XG4vLyAgICAgICAgICAgICAgICAgICAgIHZhciB0ZDIgPSAkKCc8dGQ+JyArIHRpc3N1ZU1ldGFkYXRhW2pzb25UaXNzdWVdLnRpc3N1ZU5hbWUgKyAnPC90ZD4nKTtcbi8vICAgICAgICAgICAgICAgICAgICAgJCh0cikuYXBwZW5kKHRkMik7XG4vLyAgICAgICAgICAgICAgICAgICAgIHZhciB0ZDMgPSAkKCc8dGQ+JyArIGpzb25UaXNzdWVzW2pzb25UaXNzdWVdLkRlc2NyaXB0aW9uICsgJzwvdGQ+Jyk7XG4vLyAgICAgICAgICAgICAgICAgICAgICQodHIpLmFwcGVuZCh0ZDMpO1xuLy8gICAgICAgICAgICAgICAgIH0pO1xuLy8gICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgZWxzZSB7XG4vLyAgICAgICAgICAgICAgICAgJC5lYWNoKGpzb25UaXNzdWVzLCBmdW5jdGlvbiAoanNvblRpc3N1ZSkge1xuLy8gICAgICAgICAgICAgICAgICAgICBpZiAoanNvblRpc3N1ZXNbanNvblRpc3N1ZV0uaXNCcmFpbj09PVwiVFJVRVwiICYmIGpzb25UaXNzdWVzW2pzb25UaXNzdWVdLklETmFtZSE9XCJVQkVST05fMDAwMjI0MFwiKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdHIgPSAkKFwiPHRyPjwvdHI+XCIpO1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgJCh0Ym9keSkuYXBwZW5kKHRyKTtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZDEgPSAkKCc8dGQgc3R5bGU9XCJ3aWR0aDogMTBweDtcIj48c3ZnIHdpZHRoPVwiMTBweFwiIGhlaWdodD1cIjEwcHhcIj48Y2lyY2xlIGN4PVwiNTAlXCIgY3k9XCI1MCVcIiByPVwiNXB4XCIgZmlsbD0nICsgJyMnICsgdGlzc3VlTWV0YWRhdGFbanNvblRpc3N1ZV0uY29sb3JIZXggKyAnLz48L3N2Zz48L3RkPicpO1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgJCh0cikuYXBwZW5kKHRkMSk7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGQyID0gJCgnPHRkPicgKyB0aXNzdWVNZXRhZGF0YVtqc29uVGlzc3VlXS50aXNzdWVOYW1lICsgJzwvdGQ+Jyk7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAkKHRyKS5hcHBlbmQodGQyKTtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZDMgPSAkKCc8dGQ+JyArIGpzb25UaXNzdWVzW2pzb25UaXNzdWVdLkRlc2NyaXB0aW9uICsgJzwvdGQ+Jyk7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAkKHRyKS5hcHBlbmQodGQzKTtcbi8vICAgICAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgIH0pO1xuLy8gICAgICAgICAgICAgfVxuLy9cbi8vICAgICAgICAgICAgICQob1RhYmxlKS5EYXRhVGFibGUoe1xuLy8gICAgICAgICAgICAgICAgIFwiYkluZm9cIjogZmFsc2UsXG4vLyAgICAgICAgICAgICAgICAgXCJhb0NvbHVtbnNcIjogW3tcImJTb3J0YWJsZVwiOmZhbHNlfSwgbnVsbCwgbnVsbF0sXG4vLyAgICAgICAgICAgICAgICAgXCJvcmRlclwiOiBbIDEsICdhc2MnIF0sXG4vLyAgICAgICAgICAgICAgICAgalF1ZXJ5VUkgOiB0cnVlLFxuLy8gICAgICAgICAgICAgICAgIGRvbTogJzxcImNsZWFyXCI+bGZydGlwJyxcbi8vICAgICAgICAgICAgICAgICBkZXN0cm95OiB0cnVlLFxuLy8gICAgICAgICAgICAgICAgIHNjcm9sbFk6JzgyMHB4Jyxcbi8vICAgICAgICAgICAgICAgICBzY3JvbGxDb2xsYXBzZTogdHJ1ZSxcbi8vICAgICAgICAgICAgICAgICBcInBhZ2luZ1wiOiBmYWxzZSxcbi8vICAgICAgICAgICAgIH0pO1xuLy9cbi8vICAgICAgICAgICAgIHZhciB0aXNzdWVJZD1cIlwiXG4vLyAgICAgICAgICAgICAkKCcjYW5hdG9tb2dyYW1UYWJsZVdyYXBwZXIgdGJvZHknKVxuLy8gICAgICAgICAgICAgLm9uKCAnbW91c2VlbnRlcicsICd0cicsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdhbmF0b21vZ3JhbVJvd0hpZ2hsaWdodCcpO1xuLy8gICAgICAgICAgICAgICAgIHZhciB0aXNzdWVOYW1lID0gJCgkKHRoaXMpLmNoaWxkcmVuKClbMV0pLnRleHQoKTtcbi8vICAgICAgICAgICAgICAgICB0aXNzdWVJZCA9IHRpc3N1ZU5hbWVUb1Rpc3N1ZUlkKHRpc3N1ZU5hbWUpO1xuLy8gICAgICAgICAgICAgICAgIHZhciBhbmF0b21vZ3JhbUlkID0ganNvblRpc3N1ZXNbdGlzc3VlSWRdLklETmFtZTtcbi8vICAgICAgICAgICAgICAgICBjb2xvclRpc3N1ZSh0aXNzdWVJZCk7XG4vLyAgICAgICAgICAgICB9KVxuLy8gICAgICAgICAgICAgLm9uKCdtb3VzZWxlYXZlJywgJ3RyJywgZnVuY3Rpb24oKSB7XG4vLyAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmVDbGFzcygnYW5hdG9tb2dyYW1Sb3dIaWdobGlnaHQnKTtcbi8vICAgICAgICAgICAgICAgICB1bmNvbG9yVGlzc3VlKHRpc3N1ZUlkKTtcbi8vICAgICAgICAgICAgIH0pXG4vLyAgICAgICAgIH1cbi8vICAgICB9KTtcbi8vIH07Il0sIm5hbWVzIjpbImNzdiIsImRzdiIsInRzdiJdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsSUFBSSxHQUFHLEdBQUcsRUFBRTtJQUNSLEdBQUcsR0FBRyxFQUFFO0lBQ1IsS0FBSyxHQUFHLEVBQUU7SUFDVixPQUFPLEdBQUcsRUFBRTtJQUNaLE1BQU0sR0FBRyxFQUFFLENBQUM7O0FBRWhCLFNBQVMsZUFBZSxDQUFDLE9BQU8sRUFBRTtFQUNoQyxPQUFPLElBQUksUUFBUSxDQUFDLEdBQUcsRUFBRSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLEVBQUU7SUFDbEUsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO0dBQ2hELENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7Q0FDckI7O0FBRUQsU0FBUyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRTtFQUNuQyxJQUFJLE1BQU0sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7RUFDdEMsT0FBTyxTQUFTLEdBQUcsRUFBRSxDQUFDLEVBQUU7SUFDdEIsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztHQUNuQyxDQUFDO0NB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
