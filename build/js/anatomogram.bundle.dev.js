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
                    $(t).css('fill-opacity', 1);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hdG9tb2dyYW0uYnVuZGxlLmRldi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvZHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvY3N2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvdHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZldGNoL3NyYy9qc29uLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy9ndGV4RGF0YVBhcnNlci5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL0FuYXRvbW9ncmFtLmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBFT0wgPSB7fSxcbiAgICBFT0YgPSB7fSxcbiAgICBRVU9URSA9IDM0LFxuICAgIE5FV0xJTkUgPSAxMCxcbiAgICBSRVRVUk4gPSAxMztcblxuZnVuY3Rpb24gb2JqZWN0Q29udmVydGVyKGNvbHVtbnMpIHtcbiAgcmV0dXJuIG5ldyBGdW5jdGlvbihcImRcIiwgXCJyZXR1cm4ge1wiICsgY29sdW1ucy5tYXAoZnVuY3Rpb24obmFtZSwgaSkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShuYW1lKSArIFwiOiBkW1wiICsgaSArIFwiXVwiO1xuICB9KS5qb2luKFwiLFwiKSArIFwifVwiKTtcbn1cblxuZnVuY3Rpb24gY3VzdG9tQ29udmVydGVyKGNvbHVtbnMsIGYpIHtcbiAgdmFyIG9iamVjdCA9IG9iamVjdENvbnZlcnRlcihjb2x1bW5zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHJvdywgaSkge1xuICAgIHJldHVybiBmKG9iamVjdChyb3cpLCBpLCBjb2x1bW5zKTtcbiAgfTtcbn1cblxuLy8gQ29tcHV0ZSB1bmlxdWUgY29sdW1ucyBpbiBvcmRlciBvZiBkaXNjb3ZlcnkuXG5mdW5jdGlvbiBpbmZlckNvbHVtbnMocm93cykge1xuICB2YXIgY29sdW1uU2V0ID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIGNvbHVtbnMgPSBbXTtcblxuICByb3dzLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgZm9yICh2YXIgY29sdW1uIGluIHJvdykge1xuICAgICAgaWYgKCEoY29sdW1uIGluIGNvbHVtblNldCkpIHtcbiAgICAgICAgY29sdW1ucy5wdXNoKGNvbHVtblNldFtjb2x1bW5dID0gY29sdW1uKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBjb2x1bW5zO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihkZWxpbWl0ZXIpIHtcbiAgdmFyIHJlRm9ybWF0ID0gbmV3IFJlZ0V4cChcIltcXFwiXCIgKyBkZWxpbWl0ZXIgKyBcIlxcblxccl1cIiksXG4gICAgICBERUxJTUlURVIgPSBkZWxpbWl0ZXIuY2hhckNvZGVBdCgwKTtcblxuICBmdW5jdGlvbiBwYXJzZSh0ZXh0LCBmKSB7XG4gICAgdmFyIGNvbnZlcnQsIGNvbHVtbnMsIHJvd3MgPSBwYXJzZVJvd3ModGV4dCwgZnVuY3Rpb24ocm93LCBpKSB7XG4gICAgICBpZiAoY29udmVydCkgcmV0dXJuIGNvbnZlcnQocm93LCBpIC0gMSk7XG4gICAgICBjb2x1bW5zID0gcm93LCBjb252ZXJ0ID0gZiA/IGN1c3RvbUNvbnZlcnRlcihyb3csIGYpIDogb2JqZWN0Q29udmVydGVyKHJvdyk7XG4gICAgfSk7XG4gICAgcm93cy5jb2x1bW5zID0gY29sdW1ucyB8fCBbXTtcbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlUm93cyh0ZXh0LCBmKSB7XG4gICAgdmFyIHJvd3MgPSBbXSwgLy8gb3V0cHV0IHJvd3NcbiAgICAgICAgTiA9IHRleHQubGVuZ3RoLFxuICAgICAgICBJID0gMCwgLy8gY3VycmVudCBjaGFyYWN0ZXIgaW5kZXhcbiAgICAgICAgbiA9IDAsIC8vIGN1cnJlbnQgbGluZSBudW1iZXJcbiAgICAgICAgdCwgLy8gY3VycmVudCB0b2tlblxuICAgICAgICBlb2YgPSBOIDw9IDAsIC8vIGN1cnJlbnQgdG9rZW4gZm9sbG93ZWQgYnkgRU9GP1xuICAgICAgICBlb2wgPSBmYWxzZTsgLy8gY3VycmVudCB0b2tlbiBmb2xsb3dlZCBieSBFT0w/XG5cbiAgICAvLyBTdHJpcCB0aGUgdHJhaWxpbmcgbmV3bGluZS5cbiAgICBpZiAodGV4dC5jaGFyQ29kZUF0KE4gLSAxKSA9PT0gTkVXTElORSkgLS1OO1xuICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQoTiAtIDEpID09PSBSRVRVUk4pIC0tTjtcblxuICAgIGZ1bmN0aW9uIHRva2VuKCkge1xuICAgICAgaWYgKGVvZikgcmV0dXJuIEVPRjtcbiAgICAgIGlmIChlb2wpIHJldHVybiBlb2wgPSBmYWxzZSwgRU9MO1xuXG4gICAgICAvLyBVbmVzY2FwZSBxdW90ZXMuXG4gICAgICB2YXIgaSwgaiA9IEksIGM7XG4gICAgICBpZiAodGV4dC5jaGFyQ29kZUF0KGopID09PSBRVU9URSkge1xuICAgICAgICB3aGlsZSAoSSsrIDwgTiAmJiB0ZXh0LmNoYXJDb2RlQXQoSSkgIT09IFFVT1RFIHx8IHRleHQuY2hhckNvZGVBdCgrK0kpID09PSBRVU9URSk7XG4gICAgICAgIGlmICgoaSA9IEkpID49IE4pIGVvZiA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKChjID0gdGV4dC5jaGFyQ29kZUF0KEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGogKyAxLCBpIC0gMSkucmVwbGFjZSgvXCJcIi9nLCBcIlxcXCJcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpbmQgbmV4dCBkZWxpbWl0ZXIgb3IgbmV3bGluZS5cbiAgICAgIHdoaWxlIChJIDwgTikge1xuICAgICAgICBpZiAoKGMgPSB0ZXh0LmNoYXJDb2RlQXQoaSA9IEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIGVsc2UgaWYgKGMgIT09IERFTElNSVRFUikgY29udGludWU7XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGosIGkpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXR1cm4gbGFzdCB0b2tlbiBiZWZvcmUgRU9GLlxuICAgICAgcmV0dXJuIGVvZiA9IHRydWUsIHRleHQuc2xpY2UoaiwgTik7XG4gICAgfVxuXG4gICAgd2hpbGUgKCh0ID0gdG9rZW4oKSkgIT09IEVPRikge1xuICAgICAgdmFyIHJvdyA9IFtdO1xuICAgICAgd2hpbGUgKHQgIT09IEVPTCAmJiB0ICE9PSBFT0YpIHJvdy5wdXNoKHQpLCB0ID0gdG9rZW4oKTtcbiAgICAgIGlmIChmICYmIChyb3cgPSBmKHJvdywgbisrKSkgPT0gbnVsbCkgY29udGludWU7XG4gICAgICByb3dzLnB1c2gocm93KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdChyb3dzLCBjb2x1bW5zKSB7XG4gICAgaWYgKGNvbHVtbnMgPT0gbnVsbCkgY29sdW1ucyA9IGluZmVyQ29sdW1ucyhyb3dzKTtcbiAgICByZXR1cm4gW2NvbHVtbnMubWFwKGZvcm1hdFZhbHVlKS5qb2luKGRlbGltaXRlcildLmNvbmNhdChyb3dzLm1hcChmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJldHVybiBjb2x1bW5zLm1hcChmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdFZhbHVlKHJvd1tjb2x1bW5dKTtcbiAgICAgIH0pLmpvaW4oZGVsaW1pdGVyKTtcbiAgICB9KSkuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFJvd3Mocm93cykge1xuICAgIHJldHVybiByb3dzLm1hcChmb3JtYXRSb3cpLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRSb3cocm93KSB7XG4gICAgcmV0dXJuIHJvdy5tYXAoZm9ybWF0VmFsdWUpLmpvaW4oZGVsaW1pdGVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFZhbHVlKHRleHQpIHtcbiAgICByZXR1cm4gdGV4dCA9PSBudWxsID8gXCJcIlxuICAgICAgICA6IHJlRm9ybWF0LnRlc3QodGV4dCArPSBcIlwiKSA/IFwiXFxcIlwiICsgdGV4dC5yZXBsYWNlKC9cIi9nLCBcIlxcXCJcXFwiXCIpICsgXCJcXFwiXCJcbiAgICAgICAgOiB0ZXh0O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwYXJzZTogcGFyc2UsXG4gICAgcGFyc2VSb3dzOiBwYXJzZVJvd3MsXG4gICAgZm9ybWF0OiBmb3JtYXQsXG4gICAgZm9ybWF0Um93czogZm9ybWF0Um93c1xuICB9O1xufVxuIiwiaW1wb3J0IGRzdiBmcm9tIFwiLi9kc3ZcIjtcblxudmFyIGNzdiA9IGRzdihcIixcIik7XG5cbmV4cG9ydCB2YXIgY3N2UGFyc2UgPSBjc3YucGFyc2U7XG5leHBvcnQgdmFyIGNzdlBhcnNlUm93cyA9IGNzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIGNzdkZvcm1hdCA9IGNzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIGNzdkZvcm1hdFJvd3MgPSBjc3YuZm9ybWF0Um93cztcbiIsImltcG9ydCBkc3YgZnJvbSBcIi4vZHN2XCI7XG5cbnZhciB0c3YgPSBkc3YoXCJcXHRcIik7XG5cbmV4cG9ydCB2YXIgdHN2UGFyc2UgPSB0c3YucGFyc2U7XG5leHBvcnQgdmFyIHRzdlBhcnNlUm93cyA9IHRzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIHRzdkZvcm1hdCA9IHRzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIHRzdkZvcm1hdFJvd3MgPSB0c3YuZm9ybWF0Um93cztcbiIsImZ1bmN0aW9uIHJlc3BvbnNlSnNvbihyZXNwb25zZSkge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzICsgXCIgXCIgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgcmV0dXJuIGZldGNoKGlucHV0LCBpbml0KS50aGVuKHJlc3BvbnNlSnNvbik7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEd0ZXhVcmxzKCl7XG4gICAgY29uc3QgaG9zdCA9IFwiaHR0cHM6Ly9ndGV4cG9ydGFsLm9yZy9yZXN0L3YxL1wiOyAvLyBOT1RFOiB0b3AgZXhwcmVzc2VkIGdlbmVzIGFyZSBub3QgeWV0IGluIHByb2R1Y3Rpb25cbiAgICByZXR1cm4ge1xuICAgICAgICAvLyBcImdlbmVFeHBcIjogXCJodHRwczovL2d0ZXhwb3J0YWwub3JnL3Jlc3QvdjEvZGF0YXNldC9mZWF0dXJlRXhwcmVzc2lvbj9mZWF0dXJlPWdlbmUmZ2VuY29kZV9pZD1cIixcblxuICAgICAgICAvLyBcInNhbXBsZVwiOiBob3N0ICsgXCJkYXRhc2V0L3NhbXBsZT9kYXRhc2V0SWQ9Z3RleF92NyZmb3JtYXQ9anNvbiZzb3J0X2J5PXNhbXBsZUlkJnNvcnREaXI9YXNjJmRhdGFUeXBlPVwiLFxuICAgICAgICBcInNhbXBsZVwiOiBcImRhdGEvZ3RleC5TYW1wbGUuY3N2XCIsXG4gICAgICAgIFwiZ2VuZUlkXCI6IGhvc3QgKyBcInJlZmVyZW5jZS9nZW5lSWQ/Zm9ybWF0PWpzb24mZ2VuZUlkPVwiLFxuICAgICAgICBcImdlbmVFeHBcIjogaG9zdCArIFwiZXhwcmVzc2lvbi9nZW5lRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZnZW5jb2RlSWQ9XCIsXG4gICAgICAgIFwidGlzc3VlXCI6ICBob3N0ICsgXCJkYXRhc2V0L3Rpc3N1ZUluZm9cIixcbiAgICAgICAgXCJ0b3BJblRpc3N1ZUZpbHRlcmVkXCI6IGhvc3QgKyBcImV4cHJlc3Npb24vdG9wRXhwcmVzc2VkR2VuZXM/ZGF0YXNldElkPWd0ZXhfdjcmZmlsdGVyTXRHZW5lPXRydWUmc29ydF9ieT1tZWRpYW4mc29ydERpcmVjdGlvbj1kZXNjJnBhZ2Vfc2l6ZT01MCZ0aXNzdWVJZD1cIixcbiAgICAgICAgXCJ0b3BJblRpc3N1ZVwiOiBob3N0ICsgXCJleHByZXNzaW9uL3RvcEV4cHJlc3NlZEdlbmVzP2RhdGFzZXRJZD1ndGV4X3Y3JnNvcnRfYnk9bWVkaWFuJnNvcnREaXJlY3Rpb249ZGVzYyZwYWdlX3NpemU9NTAmdGlzc3VlSWQ9XCIsXG4gICAgICAgIFwibWVkRXhwQnlJZFwiOiBob3N0ICsgXCJleHByZXNzaW9uL21lZGlhbkdlbmVFeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmhjbHVzdGVyPXRydWUmcGFnZV9zaXplPTEwMDAwJmdlbmNvZGVJZD1cIixcblxuICAgICAgICBcImV4b25FeHBcIjogaG9zdCArIFwiZXhwcmVzc2lvbi9tZWRpYW5FeG9uRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZoY2x1c3Rlcj10cnVlJmdlbmNvZGVJZD1cIixcbiAgICAgICAgXCJqdW5jdGlvbkV4cFwiOiBob3N0ICsgXCJleHByZXNzaW9uL21lZGlhbkp1bmN0aW9uRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZoY2x1c3Rlcj10cnVlJmdlbmNvZGVJZD1cIixcbiAgICAgICAgXCJpc29mb3JtRXhwXCI6IGhvc3QgKyBcImV4cHJlc3Npb24vaXNvZm9ybUV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmYm94cGxvdERldGFpbD1tZWRpYW4mZ2VuY29kZUlkPVwiLFxuXG4gICAgICAgIFwiZ2VuZU1vZGVsXCI6IGhvc3QgKyBcInJlZmVyZW5jZS9jb2xsYXBzZWRHZW5lTW9kZWw/dW5maWx0ZXJlZD1mYWxzZSZyZWxlYXNlPXY3JmdlbmVJZD1cIixcbiAgICAgICAgXCJnZW5lTW9kZWxVbmZpbHRlcmVkXCI6IGhvc3QgKyBcInJlZmVyZW5jZS9jb2xsYXBzZWRHZW5lTW9kZWw/dW5maWx0ZXJlZD10cnVlJnJlbGVhc2U9djcmZ2VuZUlkPVwiLFxuICAgICAgICBcImlzb2Zvcm1cIjogaG9zdCArIFwicmVmZXJlbmNlL3RyYW5zY3JpcHQ/cmVsZWFzZT12NyZnZW5jb2RlX2lkPVwiLFxuXG4gICAgICAgIFwibGl2ZXJHZW5lRXhwXCI6IFwiZGF0YS90b3A1MC5nZW5lcy5saXZlci5nZW5vbWljLm1lZGlhbi50cG0uanNvblwiLCAvLyB0b3AgNTAgZ2VuZXMgaW4gR1RFeCBsaXZlclxuICAgICAgICBcImNlcmViZWxsdW1HZW5lRXhwXCI6IFwiZGF0YS90b3AuZ3RleC5jZXJlYmVsbHVtLmdlbmVzLm1lZGlhbi50cG0udHN2XCIsXG4gICAgICAgIFwibWF5b0dlbmVFeHBcIjogXCJkYXRhL2d0ZXgrbWF5by50b3AuY2VyZWJlbGx1bV9hZC5nZW5lcy5tZWRpYW4udHBtLnRzdlwiIC8vIHRoZSB0b3AgNTAgZ2VuZXMgaW4gTWF5byBDZXJlYmVsbHVtX0FEICsgdGhlaXIgZ3RleCBleHByZXNzaW9uIHZhbHVlc1xuICAgIH1cbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2VuZXMgZnJvbSBHVEV4IHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBnZW5lc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VHZW5lcyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gXCJnZW5lSWRcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJHZW5lIHdlYiBzZXJ2aWNlIHBhcnNpbmcgZXJyb3JcIjtcbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuLyoqXG4gKiBwYXJzZSB0aGUgdGlzc3Vlc1xuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgdGlzc3Vlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUaXNzdWVzKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSBcInRpc3N1ZUluZm9cIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJGYXRhbCBFcnJvcjogcGFyc2VUaXNzdWVzIGlucHV0IGVycm9yLlwiO1xuICAgIGNvbnN0IHRpc3N1ZXMgPSBkYXRhW2F0dHJdO1xuXG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgW1widGlzc3VlSWRcIiwgXCJ0aXNzdWVOYW1lXCIsIFwiY29sb3JIZXhcIl0uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCF0aXNzdWVzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZVRpc3N1ZSBhdHRyIG5vdCBmb3VuZDogXCIgKyBkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRpc3N1ZXM7XG59XG5cbi8qKlxuICogcGFyc2UgdGhlIGV4b25zXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBleG9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFeG9ucyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gXCJjb2xsYXBzZWRHZW5lTW9kZWxcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJGYXRhbCBFcnJvcjogcGFyc2VFeG9ucyBpbnB1dCBlcnJvci5cIiArIGRhdGE7XG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgW1wiZmVhdHVyZVR5cGVcIiwgXCJzdGFydFwiLCBcImVuZFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWRhdGFbYXR0cl1bMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlRXhvbnMgYXR0ciBub3QgZm91bmQ6IFwiICsgZDtcbiAgICB9KTtcbiAgICByZXR1cm4gZGF0YVthdHRyXS5maWx0ZXIoKGQpPT5kLmZlYXR1cmVUeXBlID09IFwiZXhvblwiKS5tYXAoKGQpPT57XG4gICAgICAgIGQuY2hyb21TdGFydCA9IGQuc3RhcnQ7XG4gICAgICAgIGQuY2hyb21FbmQgPSBkLmVuZDtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgfSk7XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBwYXJzZVNhbXBsZXMoZGF0YSl7XG4vLyAgICAgY29uc3QgYXR0ciA9IFwic2FtcGxlXCI7XG4vLyAgICAgaWYgKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZVNhbXBsZXMgaW5wdXQgZXJyb3IuIFwiICsgZGF0YTtcbi8vICAgICByZXR1cm4gZGF0YVthdHRyXTtcbi8vIH1cbi8vXG5cblxuLyoqXG4gKiBwYXJzZSB0aGUganVuY3Rpb25zXG4gKiBAcGFyYW0gZGF0YVxuICogQHJldHVybnMge0xpc3R9IG9mIGp1bmN0aW9uc1xuICogLy8gd2UgZG8gbm90IHN0b3JlIGp1bmN0aW9uIHN0cnVjdHVyZSBhbm5vdGF0aW9ucyBpbiBNb25nb1xuICAgIC8vIHNvIGhlcmUgd2UgdXNlIHRoZSBqdW5jdGlvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlIHRvIHJldHJpZXZlIHRoZSBqdW5jdGlvbiBnZW5vbWljIGxvY2F0aW9uc1xuICAgIC8vIGFzc3VtaW5nIHRoYXQgZWFjaCB0aXNzdWUgaGFzIHRoZSBzYW1lIGp1bmN0aW9ucyxcbiAgICAvLyB0byBncmFiIGFsbCB0aGUga25vd24ganVuY3Rpb25zIG9mIGEgZ2VuZSwgd2Ugb25seSBuZWVkIHRvIGxvb2sgYXQgb25lIHRpc3N1ZVxuICAgIC8vIGhlcmUgd2UgYXJiaXRyYXJpbHkgcGljayBMaXZlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnVuY3Rpb25zKGRhdGEpe1xuXG4gICAgY29uc3QgYXR0ciA9IFwibWVkaWFuSnVuY3Rpb25FeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlSnVuY3Rpb25zIGlucHV0IGVycm9yLiBcIiArIGRhdGE7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl0uZmlsdGVyKChkKT0+ZC50aXNzdWVJZD09XCJMaXZlclwiKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zID0gZC5qdW5jdGlvbklkLnNwbGl0KFwiX1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb206IHBvc1swXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbVN0YXJ0OiBwb3NbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb21FbmQ6IHBvc1syXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqdW5jdGlvbklkOiBkLmp1bmN0aW9uSWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG59XG5cbi8qKlxuICogcGFyc2UgdHJhbnNjcmlwdCBpc29mb3JtcyBmcm9tIHRoZSBHVEV4IHdlYiBzZXJ2aWNlOiBcInJlZmVyZW5jZS90cmFuc2NyaXB0P3JlbGVhc2U9djcmZ2VuY29kZV9pZD1cIlxuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiByZXR1cm5zIGEgZGljdGlvbmFyeSBvZiB0cmFuc2NyaXB0IGV4b24gb2JqZWN0IGxpc3RzIGluZGV4ZWQgYnkgRU5TVCBJRHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4b25zKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSBcInRyYW5zY3JpcHRcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJwYXJzZUlzb2Zvcm1zIGlucHV0IGVycm9yIFwiICsgZGF0YTtcbiAgICByZXR1cm4gZGF0YVthdHRyXS5maWx0ZXIoKGQpPT57cmV0dXJuIFwiZXhvblwiID09IGQuZmVhdHVyZVR5cGV9KVxuICAgICAgICAucmVkdWNlKChhLCBkKT0+e1xuICAgICAgICBpZiAoYVtkLnRyYW5zY3JpcHRJZF0gPT09IHVuZGVmaW5lZCkgYVtkLnRyYW5zY3JpcHRJZF0gPSBbXTtcbiAgICAgICAgYVtkLnRyYW5zY3JpcHRJZF0ucHVzaChkKTtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfSwge30pO1xufVxuXG4vKipcbiAqIHBhcnNlIHRyYW5zY3JpcHQgaXNvZm9ybXNcbiAqIEBwYXJhbSBkYXRhIHtKc29ufSBmcm9tIEdURXggd2ViIHNlcnZpY2UgXCJyZWZlcmVuY2UvdHJhbnNjcmlwdD9yZWxlYXNlPXY3JmdlbmNvZGVfaWQ9XCJcbiAqIHJldHVybnMgYSBsaXN0IG9mIGlzb2Zvcm0gb2JqZWN0c1xuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUlzb2Zvcm1zKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSBcInRyYW5zY3JpcHRcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coXCJwYXJzZUlzb2Zvcm1zIGlucHV0IGVycm9yXCIpO1xuICAgIHJldHVybiBkYXRhW2F0dHJdLmZpbHRlcigoZCk9PntyZXR1cm4gXCJ0cmFuc2NyaXB0XCIgPT0gZC5mZWF0dXJlVHlwZX0pLnNvcnQoKGEsIGIpPT57XG4gICAgICAgIGNvbnN0IGwxID0gTWF0aC5hYnMoYS5jaHJvbUVuZCAtIGEuY2hyb21TdGFydCkgKyAxO1xuICAgICAgICBjb25zdCBsMiA9IE1hdGguYWJzKGIuY2hyb21FbmQgLSBiLmNocm9tU3RhcnQpICsgMTtcbiAgICAgICAgcmV0dXJuIC0obDEtbDIpOyAvLyBzb3J0IGJ5IGlzb2Zvcm0gbGVuZ3RoIGluIGRlc2NlbmRpbmcgb3JkZXJcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSBmaW5hbCBnZW5lIG1vZGVsIGV4b24gZXhwcmVzc2lvblxuICogZXhwcmVzc2lvbiBpcyBub3JtYWxpemVkIHRvIHJlYWRzIHBlciBrYlxuICogQHBhcmFtIGRhdGEge0pTT059IG9mIGV4b24gZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIGV4b25zIHtMaXN0fSBvZiBleG9ucyB3aXRoIHBvc2l0aW9uc1xuICogQHBhcmFtIHVzZUxvZyB7Ym9vbGVhbn0gdXNlIGxvZzIgdHJhbnNmb3JtYXRpb25cbiAqIEBwYXJhbSBhZGp1c3Qge051bWJlcn0gZGVmYXVsdCAwLjAxXG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgZXhvbiBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV4b25FeHByZXNzaW9uKGRhdGEsIGV4b25zLCB1c2VMb2c9dHJ1ZSwgYWRqdXN0PTEpe1xuICAgIGNvbnN0IGV4b25EaWN0ID0gZXhvbnMucmVkdWNlKChhLCBkKT0+e2FbZC5leG9uSWRdID0gZDsgcmV0dXJuIGE7fSwge30pO1xuICAgIGNvbnN0IGF0dHIgPSBcIm1lZGlhbkV4b25FeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KFwicGFyc2VFeG9uRXhwcmVzc2lvbiBpbnB1dCBlcnJvclwiKTtcblxuICAgIGNvbnN0IGV4b25PYmplY3RzID0gZGF0YVthdHRyXTtcbiAgICAvLyBlcnJvci1jaGVja2luZ1xuICAgIFtcImRhdGFcIiwgXCJleG9uSWRcIiwgXCJ0aXNzdWVJZFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWV4b25PYmplY3RzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZUV4b25FeHByZXNzaW9uIGF0dHIgbm90IGZvdW5kOiBcIiArIGQ7XG4gICAgfSk7XG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gZXhvbiBjb3VudHNcbiAgICBleG9uT2JqZWN0cy5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIGNvbnN0IGV4b24gPSBleG9uRGljdFtkLmV4b25JZF07IC8vIGZvciByZXRyaWV2aW5nIGV4b24gcG9zaXRpb25zXG4gICAgICAgIC8vIGVycm9yLWNoZWNraW5nXG4gICAgICAgIFtcImVuZFwiLCBcInN0YXJ0XCJdLmZvckVhY2goKHApPT57XG4gICAgICAgICAgICBpZiAoIWV4b24uaGFzT3duUHJvcGVydHkocCkpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlRXhvbkV4cHJlc3Npb24gYXR0ciBub3QgZm91bmQ6IFwiICsgcDtcbiAgICAgICAgfSk7XG4gICAgICAgIGQubCA9IGV4b24uZW5kIC0gZXhvbi5zdGFydCArIDE7XG4gICAgICAgIGQudmFsdWUgPSBOdW1iZXIoZC5kYXRhKS9kLmw7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLmRhdGEpL2QubDtcbiAgICAgICAgaWYgKHVzZUxvZykgZC52YWx1ZSA9IE1hdGgubG9nMihkLnZhbHVlICsgMSk7XG4gICAgICAgIGQueCA9IGQuZXhvbklkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgICAgIGQuY2hyb21TdGFydCA9IGV4b24uc3RhcnQ7XG4gICAgICAgIGQuY2hyb21FbmQgPSBleG9uLmVuZDtcbiAgICAgICAgZC51bml0ID0gZC51bml0ICsgXCIgcGVyIGJhc2VcIjtcbiAgICB9KTtcbiAgICByZXR1cm4gZXhvbk9iamVjdHMuc29ydCgoYSxiKT0+e1xuICAgICAgICBpZiAoYS5jaHJvbVN0YXJ0PGIuY2hyb21TdGFydCkgcmV0dXJuIC0xO1xuICAgICAgICBpZiAoYS5jaHJvbVN0YXJ0PmIuY2hyb21TdGFydCkgcmV0dXJuIDE7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0pOyAvLyBzb3J0IGJ5IGdlbm9taWMgbG9jYXRpb24gaW4gYXNjZW5kaW5nIG9yZGVyXG59XG5cbi8qKlxuICogUGFyc2UganVuY3Rpb24gbWVkaWFuIHJlYWQgY291bnQgZGF0YVxuICogQHBhcmFtIGRhdGEge0pTT059IG9mIHRoZSBqdW5jdGlvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufSBwZXJmb3JtIGxvZyB0cmFuc2Zvcm1hdGlvblxuICogQHBhcmFtIGFkanVzdCB7TnVtYmVyfSBmb3IgaGFuZGxpbmcgMCdzIHdoZW4gdXNlTG9nIGlzIHRydWVcbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBqdW5jdGlvbiBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUp1bmN0aW9uRXhwcmVzc2lvbihkYXRhLCB1c2VMb2c9dHJ1ZSwgYWRqdXN0PTEpe1xuICAgIGNvbnN0IGF0dHIgPSBcIm1lZGlhbkp1bmN0aW9uRXhwcmVzc2lvblwiO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyhcInBhcnNlSnVuY3Rpb25FeHByZXNzaW9uIGlucHV0IGVycm9yXCIpO1xuXG4gICAgY29uc3QganVuY3Rpb25zID0gZGF0YVthdHRyXTtcblxuICAgIC8vIGVycm9yLWNoZWNraW5nXG4gICAgW1widGlzc3VlSWRcIiwgXCJqdW5jdGlvbklkXCIsIFwiZGF0YVwiLCBcImdlbmNvZGVJZFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWp1bmN0aW9uc1swXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgXCJGYXRhbCBFcnJvcjogcGFyc2VKdW5jdGlvbkV4cHJlc3Npb24gYXR0ciBub3QgZm91bmQ6IFwiICsgZDtcbiAgICB9KTtcblxuICAgIC8vIHBhcnNlIEdURXggbWVkaWFuIGp1bmN0aW9uIHJlYWQgY291bnRzXG4gICAganVuY3Rpb25zLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC54ID0gZC5qdW5jdGlvbklkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLm9yaWdpbmFsVmFsdWUgPSBOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkXG4gICAgfSk7XG5cbiAgICAvLyBzb3J0IGJ5IGdlbm9taWMgbG9jYXRpb24gaW4gYXNjZW5kaW5nIG9yZGVyXG4gICAgcmV0dXJuIGp1bmN0aW9ucy5zb3J0KChhLGIpPT57XG4gICAgICAgIGlmIChhLmp1bmN0aW9uSWQ+Yi5qdW5jdGlvbklkKSByZXR1cm4gMTtcbiAgICAgICAgZWxzZSBpZiAoYS5qdW5jdGlvbklkPGIuanVuY3Rpb25JZCkgcmV0dXJuIC0xO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSBpc29mb3JtIGV4cHJlc3Npb25cbiAqIEBwYXJhbSBkYXRhXG4gKiBAcGFyYW0gdXNlTG9nXG4gKiBAcGFyYW0gYWRqdXN0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gXCJpc29mb3JtRXhwcmVzc2lvblwiO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyhcInBhcnNlSXNvZm9ybUV4cHJlc3Npb24gaW5wdXQgZXJyb3JcIik7XG4gICAgLy8gcGFyc2UgR1RFeCBpc29mb3JtIG1lZGlhbiBUUE1cbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQueCA9IGQudHJhbnNjcmlwdElkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4cHJlc3Npb25UcmFuc3Bvc2UoZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gXCJpc29mb3JtRXhwcmVzc2lvblwiO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyhcInBhcnNlSXNvZm9ybUV4cHJlc3Npb24gaW5wdXQgZXJyb3JcIik7XG4gICAgLy8gcGFyc2UgR1RFeCBpc29mb3JtIG1lZGlhbiBUUE1cbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQueSA9IGQudHJhbnNjcmlwdElkO1xuICAgICAgICBkLnggPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuLyoqXG4gKiBwYXJzZSBtZWRpYW4gZ2VuZSBleHByZXNzaW9uXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn0gd2l0aCBhdHRyIG1lZGlhbkdlbmVFeHByZXNzaW9uXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufSBwZXJmb3JtcyBsb2cxMCB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1lZGlhbkV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUpe1xuICAgIGNvbnN0IGF0dHIgPSBcIm1lZGlhbkdlbmVFeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwicGFyc2VNZWRpYW5FeHByZXNzaW9uIGlucHV0IGVycm9yLlwiO1xuICAgIGNvbnN0IGFkanVzdCA9IDE7XG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gZ2VuZSBleHByZXNzaW9uXG4gICAgLy8gZXJyb3ItY2hlY2tpbmcgdGhlIHJlcXVpcmVkIGF0dHJpYnV0ZXM6XG4gICAgaWYgKGRhdGFbYXR0cl0ubGVuZ3RoID09IDApIHRocm93IFwicGFyc2VNZWRpYW5FeHByZXNzaW9uIGZpbmRzIG5vIGRhdGEuXCI7XG4gICAgW1wibWVkaWFuXCIsIFwidGlzc3VlSWRcIiwgXCJnZW5jb2RlSWRcIl0uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCFkYXRhW2F0dHJdWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBgcGFyc2VNZWRpYW5FeHByZXNzaW9uIGF0dHIgZXJyb3IuICR7ZH0gaXMgbm90IGZvdW5kYDtcbiAgICB9KTtcbiAgICBkYXRhLm1lZGlhbkdlbmVFeHByZXNzaW9uLmZvckVhY2goZnVuY3Rpb24oZCl7XG4gICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMChOdW1iZXIoZC5tZWRpYW4pICsgYWRqdXN0KTpOdW1iZXIoZC5tZWRpYW4pO1xuICAgICAgICBkLnggPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLnkgPSBkLmdlbmNvZGVJZDtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQubWVkaWFuKTtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkXG4gICAgfSk7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl07XG59XG5cbi8qKlxuICogcGFyc2UgdGhlIG1lZGlhbiBnZW5lIGV4cHJlc3Npb24sIG5vIGxvbmdlciBpbiB1c2VcbiAqIEBwYXJhbSBkYXRhIHtMaXN0fSBvZiBkYXRhIHBvaW50cyB3aXRoIGF0dHI6IHZhbHVlLCB0aXNzdWVJZCwgZ2VuZVN5bWJvbCwgZ2VuY29kZUlkXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufSBwZXJmb3JtIGxvZyB0cmFuc2Zvcm1hdGlvbiB1c2luZyBsb2cxMFxuICogQHJldHVybnMge0xpc3R9XG4gKi9cbi8vIGV4cG9ydCBmdW5jdGlvbiBwYXJzZU1lZGlhblRQTShkYXRhLCB1c2VMb2c9dHJ1ZSl7XG4vLyAgICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gVFBNIGpzb24gc3RhdGljIGZpbGVcbi8vICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24oZCl7XG4vLyAgICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMCgrZC5tZWRpYW5UUE0gKyAxKTorZC5tZWRpYW5UUE07XG4vLyAgICAgICAgIGQueCA9IGQudGlzc3VlSWQ7XG4vLyAgICAgICAgIGQueSA9IGQuZ2VuZVN5bWJvbDtcbi8vICAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gcGFyc2VGbG9hdChkLm1lZGlhblRQTSk7XG4vLyAgICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZDtcbi8vICAgICB9KTtcbi8vICAgICByZXR1cm4gZGF0YTtcbi8vIH1cblxuLyoqXG4gKiBwYXJzZSB0aGUgZ2VuZSBleHByZXNzaW9uXG4gKiBAcGFyYW0gZ2VuY29kZUlkIHtTdHJpbmd9XG4gKiBAcGFyYW0gZGF0YSB7SnNvbn0gd2l0aCBhdHRyOiB0aXNzdWVJZCwgZ2VuZVN5bWJvbFxuICogQHJldHVybnMge3tleHA6IHt9LCBnZW5lU3ltYm9sOiBzdHJpbmd9fVxuICovXG5mdW5jdGlvbiBwYXJzZUdlbmVFeHByZXNzaW9uKGdlbmNvZGVJZCwgZGF0YSl7XG4gICAgbGV0IGxvb2t1cFRhYmxlID0ge1xuICAgICAgICBleHA6IHt9LCAvLyBpbmRleGVkIGJ5IHRpc3N1ZUlkXG4gICAgICAgIGdlbmVTeW1ib2w6IFwiXCJcbiAgICB9O1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAoXCJwYXJzZUdlbmVFeHByZXNzaW9uIGlucHV0IGVycm9yLlwiKTtcbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmIChkLmdlbmNvZGVJZCA9PSBnZW5jb2RlSWQpIHtcbiAgICAgICAgICAgIC8vIGlmIHRoZSBnZW5jb2RlIElEIG1hdGNoZXMgdGhlIHF1ZXJ5IGdlbmNvZGVJZCxcbiAgICAgICAgICAgIC8vIGFkZCB0aGUgZXhwcmVzc2lvbiBkYXRhIHRvIHRoZSBsb29rdXAgdGFibGVcbiAgICAgICAgICAgIGxvb2t1cFRhYmxlLmV4cFtkLnRpc3N1ZUlkXSA9IGQuZGF0YTtcbiAgICAgICAgICAgIGlmIChcIlwiID09IGxvb2t1cFRhYmxlLmdlbmVTeW1ib2wpIGxvb2t1cFRhYmxlLmdlbmVTeW1ib2wgPSBkLmdlbmVTeW1ib2xcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBsb29rdXBUYWJsZVxufVxuXG4vKipcbiAqIE1ha2VzIHRoZSBqc29uIGZvciB0aGUgcGxvdGx5IGJveHBsb3QsIG5vIGxvbmdlciBpbiB1c2VcbiAqIEBwYXJhbSBnZW5jb2RlSWQge1N0cmluZ306IGEgZ2VuY29kZSBJRFxuICogQHBhcmFtIGRhdGEge09iamVjdH0gZ2VuZSBleHByZXNzaW9uIEFQSSBjYWxsXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufVxuICogQHBhcmFtIGNvbG9yIHtTdHJpbmd9XG4gKiBAcGFyYW0geGxpc3Qge0xpc3R9OiBhIGxpc3Qgb2YgdGlzc3VlIG9iamVjdHMge2lkOlN0cmluZywgbmFtZTpTdHJpbmd9XG4gKiBAcmV0dXJucyB7e3g6IEFycmF5LCB5OiBBcnJheSwgbmFtZTogc3RyaW5nLCB0eXBlOiBzdHJpbmcsIGxpbmU6IHt3aWR0aDogbnVtYmVyfSwgbWFya2VyOiB7Y29sb3I6IHN0cmluZ319fVxuICovXG4vLyBleHBvcnQgZnVuY3Rpb24gbWFrZUpzb25Gb3JQbG90bHkoZ2VuY29kZUlkLCBkYXRhLCB1c2VMb2c9ZmFsc2UsIGNvbG9yPVwiZ3JleVwiLCB4bGlzdCl7XG4vL1xuLy8gICAgIC8vIHJlZmVyZW5jZTogaHR0cHM6Ly9wbG90Lmx5L2phdmFzY3JpcHQvYm94LXBsb3RzL1xuLy9cbi8vICAgICBsZXQgbG9va3VwVGFibGUgPSBwYXJzZUdlbmVFeHByZXNzaW9uKGdlbmNvZGVJZCwgZGF0YSk7IC8vIGNvbnN0cnVjdHMgdGhlIHRpc3N1ZSBsb29rdXAgdGFibGUgaW5kZXhlZCBieSB0aXNzdWUgSURcbi8vICAgICBsZXQgeCA9IFtdO1xuLy8gICAgIGxldCB5ID0gW107XG4vL1xuLy8gICAgIC8vIHhsaXN0OiB0aGUgdGlzc3Vlc1xuLy8gICAgIHhsaXN0LmZvckVhY2goKGQpPT57XG4vLyAgICAgICAgIC8vIGQ6IGEgdGlzc3VlXG4vLyAgICAgICAgIGlmIChsb29rdXBUYWJsZS5leHBbZC5pZF09PT11bmRlZmluZWQpe1xuLy8gICAgICAgICAgICAgLy8gd2hlbiB0aGUgZ2VuZSBoYXMgbm8gZXhwcmVzc2lvbiBkYXRhIGluIHRpc3N1ZSBkLFxuLy8gICAgICAgICAgICAgLy8gcHJvdmlkZSBkdW1teSBkYXRhXG4vLyAgICAgICAgICAgICB4ID0geC5jb25jYXQoW2QubmFtZV0pO1xuLy8gICAgICAgICAgICAgeSA9IHkuY29uY2F0KFstMV0pO1xuLy8gICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgLy8gY29uY2F0ZW5hdGUgYSBsaXN0IG9mIHRoZSB0aXNzdWUgbGFiZWwgcmVwZWF0ZWRseSAobG9va3VwVGFibGUuZXhwW2RdLmxlbmd0aCB0aW1lcykgdG8geFxuLy8gICAgICAgICAgICAgLy8gY29uY2F0ZW5hdGUgYWxsIHRoZSBleHByZXNzaW9uIHZhbHVlcyB0byB5XG4vLyAgICAgICAgICAgICAvLyB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIHggYW5kIHkgbXVzdCBtYXRjaFxuLy8gICAgICAgICAgICAgeCA9IHguY29uY2F0KEFycmF5KGxvb2t1cFRhYmxlLmV4cFtkLmlkXS5sZW5ndGgpLmZpbGwoZC5uYW1lKSk7XG4vLyAgICAgICAgICAgICB5ID0geS5jb25jYXQobG9va3VwVGFibGUuZXhwW2QuaWRdKTtcbi8vICAgICAgICAgfVxuLy8gICAgIH0pO1xuLy8gICAgIHJldHVybiB7XG4vLyAgICAgICAgIHg6IHgsXG4vLyAgICAgICAgIHk6IHksXG4vLyAgICAgICAgIG5hbWU6IGxvb2t1cFRhYmxlLmdlbmVTeW1ib2wsXG4vLyAgICAgICAgIHR5cGU6ICdib3gnLFxuLy8gICAgICAgICBsaW5lOiB7d2lkdGg6MX0sXG4vLyAgICAgICAgIG1hcmtlcjoge2NvbG9yOmNvbG9yfSxcbi8vICAgICB9O1xuLy9cbi8vIH1cblxuLyoqXG4gKiBwYXJzZSB0aGUgZXhwcmVzc2lvbiBkYXRhIG9mIGEgZ2VuZSBmb3IgYSBncm91cGVkIHZpb2xpbiBwbG90XG4gKiBAcGFyYW0gZGF0YSB7SlNPTn0gZnJvbSBHVEV4IGdlbmUgZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIGNvbG9ycyB7RGljdGlvbmFyeX0gdGhlIHZpb2xpbiBjb2xvciBmb3IgZ2VuZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlR2VuZUV4cHJlc3Npb25Gb3JWaW9saW4oZGF0YSwgdXNlTG9nPXRydWUsIGNvbG9ycz11bmRlZmluZWQpe1xuICAgIGNvbnN0IGF0dHIgPSBcImdlbmVFeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwicGFyc2VHZW5lRXhwcmVzc2lvbkZvclZpb2xpbiBpbnB1dCBlcnJvci5cIjtcbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpPT57XG4gICAgICAgIGQudmFsdWVzID0gdXNlTG9nP2QuZGF0YS5tYXAoKGRkKT0+e3JldHVybiBNYXRoLmxvZzEwKCtkZCsxKX0pOmQuZGF0YTtcbiAgICAgICAgZC5ncm91cCA9IGQudGlzc3VlSWQ7XG4gICAgICAgIGQubGFiZWwgPSBkLmdlbmVTeW1ib2w7XG4gICAgICAgIGQuY29sb3IgPSBjb2xvcnM9PT11bmRlZmluZWQ/XCIjOTBjMWMxXCI6Y29sb3JzW2QuZ2VuY29kZUlkXTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cbiIsIi8qKlxuICogQ3JlYXRlZCBieSBsdWN5eHUgb24gNi85LzE3LlxuICogTW9kaWZpZWQgYnkgS2F0IG9uIDUvMTcvMjAxOC5cbiAqIFRoaXMgY29kZSBpcyBmb3IgZ2VuZXJhdGluZyBhIG9uZS10aW1lIHN0YXRpYyBhbmF0b21vZ3JhbSB3aXRoIGFsbCB0aGUgdGlzc3VlcyBoaWdobGlnaHRlZFxuICogdXNpbmcgdGhlIEdURXggdGlzc3VlIGNvbG9ycy5cbiAqIEl0IGlzIG5vdCBtZWFudCBmb3IgcmVwbGFjaW5nIHRoZSBHVEV4IGludGVyYWN0aXZlIGFuYXRvbW9ncmFtLlxuICovXG5cblxuaW1wb3J0IHtqc29ufSBmcm9tIFwiZDMtZmV0Y2hcIjtcbmltcG9ydCB7XG4gICAgZ2V0R3RleFVybHMsXG4gICAgcGFyc2VUaXNzdWVzXG59IGZyb20gXCIuL21vZHVsZXMvZ3RleERhdGFQYXJzZXJcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlcih1cmxzPWdldEd0ZXhVcmxzKCkpe1xuICAgIGNvbnN0IHByb21pc2VzID0gW1xuICAgICAgICBqc29uKHVybHMudGlzc3VlKSxcbiAgICAgICAganNvbihcImRhdGEvQW5hdG9tb2dyYW1EZXNjcmlwdGlvbnNDb3B5Lmpzb25cIilcbiAgICBdO1xuICAgIFByb21pc2UuYWxsKHByb21pc2VzKVxuICAgICAgICAudGhlbihmdW5jdGlvbihhcmdzKXtcbiAgICAgICAgICAgIGxldCB0aXNzdWVNZXRhZGF0YSA9IHBhcnNlVGlzc3VlcyhhcmdzWzBdKTtcbiAgICAgICAgICAgIGxldCBqc29uVGlzc3VlcyA9IGFyZ3NbMV07XG5cbiAgICAgICAgICAgIC8vIHN0b3JlIHRoZSB0aXNzdWUgY29sb3IgaW4ganNvblRpc3N1ZXMgbG9va3VwIHRhYmxlXG4gICAgICAgICAgICB0aXNzdWVNZXRhZGF0YS5mb3JFYWNoKCh0KT0+e1xuICAgICAgICAgICAgICAgIGpzb25UaXNzdWVzW3QudGlzc3VlSWRdLmNvbG9ySGV4ID0gdC5jb2xvckhleDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBsZXQgc3BlY2lhbFRpc3N1ZXMgPSBbXCJVQkVST05fMDAwMjM2N1wiLCBcIlVCRVJPTl8wMDAwNDczXCIsIFwiVUJFUk9OXzAwMDAwMDdcIiwgXCJVQkVST05fMDAwMDk0NVwiLCBcIlVCRVJPTl8wMDAxMDQ0XCIsIFwiVUJFUk9OXzAwMDM4ODlcIiwgXCJVQkVST05fMDAwMDAwMlwiXTsgLy90aXNzdWVzIHRoYXQgbmVlZCB0byBiZSBoaWdobGlnaHRlZCBpbiBzcGVjaWFsIHdheXNcblxuICAgICAgICAgICAgLy8galF1ZXJ5OiBjb2xvciB0aGUgYW5hdG9tb2dyYW0gdGlzc3VlcyB1c2luZyB0aGUgR1RFeCB0aXNzdWUgY29sb3JzXG4gICAgICAgICAgICBsZXQgc3ZnVGlzc3VlcyA9ICQoXCJnI0xBWUVSX0VGT1wiKS5jaGlsZHJlbigpO1xuICAgICAgICAgICAgJC5lYWNoKHN2Z1Rpc3N1ZXMsIGZ1bmN0aW9uKGksIHQpe1xuICAgICAgICAgICAgICAgIGxldCBpZCA9ICQodCkuYXR0cihcImlkXCIpO1xuICAgICAgICAgICAgICAgIGxldCB0aXNzdWVJZCA9IE9iamVjdC5rZXlzKGpzb25UaXNzdWVzKS5maWx0ZXIoKHRpc3N1ZUlkKT0+e1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ganNvblRpc3N1ZXNbdGlzc3VlSWRdLklETmFtZSA9PSBpZFxuICAgICAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgICAgIGlmICh0aXNzdWVJZCAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGlzc3VlSWQpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGlzc3VlQ29sb3IgPSBcIiNcIiArIGpzb25UaXNzdWVzW3Rpc3N1ZUlkXS5jb2xvckhleDtcbiAgICAgICAgICAgICAgICAgICAgJCh0KS5jc3MoJ2ZpbGwnLCB0aXNzdWVDb2xvcik7XG4gICAgICAgICAgICAgICAgICAgICQodCkuY3NzKCdmaWxsLW9wYWNpdHknLCAxKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICB9KVxufVxuXG4vLyB2YXIgcmVuZGVyQW5hdG9tb2dyYW0gPSBmdW5jdGlvbigpIHtcbi8vXG4vLyAgICAgJC5nZXRKU09OKFwiZGF0YS9BbmF0b21vZ3JhbURlc2NyaXB0aW9uc0NvcHkuanNvblwiLCBmdW5jdGlvbiAoanNvblRpc3N1ZXMpIHtcbi8vXG4vLyAgICAgICAgIHNjYWxlU3ZncyhcImZ1bGxCb2R5U3ZnXCIpO1xuLy8gICAgICAgICB2YXIgc3BlY2lhbFRpc3N1ZXMgPSBbXCJVQkVST05fMDAwMjM2N1wiLCBcIlVCRVJPTl8wMDAwNDczXCIsIFwiVUJFUk9OXzAwMDAwMDdcIiwgXCJVQkVST05fMDAwMDk0NVwiLCBcIlVCRVJPTl8wMDAxMDQ0XCIsIFwiVUJFUk9OXzAwMDM4ODlcIiwgXCJVQkVST05fMDAwMDAwMlwiXTsgLy90aXNzdWVzIHRoYXQgbmVlZCB0byBiZSBoaWdobGlnaHRlZCBpbiBzcGVjaWFsIHdheXNcbi8vICAgICAgICAgdmFyIHN2Z1Rpc3N1ZXMgPSAkKFwiZyNMQVlFUl9FRk9cIikuY2hpbGRyZW4oKTtcbi8vICAgICAgICAgdmFyIHRpc3N1ZU1ldGFkYXRhID0gdGlzc3VlTWV0YWRhdGFKc29uO1xuLy9cbi8vICAgICAgICAgY3JlYXRlVGlzc3VlVGFibGUoXCJmdWxsQm9keVwiKTtcbi8vXG4vLyAgICAgICAgICQod2luZG93KS5yZXNpemUoZnVuY3Rpb24oc2l6ZSkge1xuLy8gICAgICAgICAgICAgJChcIiNmdWxsQm9keVN2ZyAuc3ZnQ29udGFpbmVyXCIpLmNzcyhcImhlaWdodFwiLCBcIlwiKyQoXCIjZnVsbEJvZHlTdmcgLnN2Z0NvbnRhaW5lclwiKS53aWR0aCgpKjEuODUpO1xuLy8gICAgICAgICAgICAgJChcIiNicmFpblN2ZyAuc3ZnQ29udGFpbmVyXCIpLmNzcyhcImhlaWdodFwiLCBcIlwiKyQoXCIjYnJhaW5TdmcgLnN2Z0NvbnRhaW5lclwiKS53aWR0aCgpKjAuODg1KTtcbi8vICAgICAgICAgICAgIC8vYW5hdG9tb2dyYW0gdHJhbnNmb3JtIHNjYWxlIGZhY3RvciBkZXRlcm1pbmVkIGJ5IGRpdmlkaW5nIHRoZSB3aW5kb3cgd2lkdGggYnkgdGhlIG9wdGltYWwgc2NhbGUgZm9yIHRoYXQgc2l6ZVxuLy8gICAgICAgICAgICAgaWYgKCQod2luZG93KS53aWR0aCgpPjEyMDApIHtcbi8vICAgICAgICAgICAgICAgICAkKFwiI2Z1bGxCb2R5U3ZnIC5zdmdJbWFnZVwiKS5hdHRyKFwidHJhbnNmb3JtXCIsIFwic2NhbGUoXCIrKCQod2luZG93KS53aWR0aCgpLzUyNSkrXCIpXCIpO1xuLy8gICAgICAgICAgICAgICAgICQoXCIjYnJhaW5TdmcgLnN2Z0ltYWdlXCIpLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJzY2FsZShcIisoJCh3aW5kb3cpLndpZHRoKCkvMzYyKStcIilcIik7XG4vLyAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICBlbHNlIHtcbi8vICAgICAgICAgICAgICAgICAkKFwiI2Z1bGxCb2R5U3ZnIC5zdmdJbWFnZVwiKS5hdHRyKFwidHJhbnNmb3JtXCIsIFwic2NhbGUoXCIrKCQod2luZG93KS53aWR0aCgpLzI2MykrXCIpXCIpO1xuLy8gICAgICAgICAgICAgICAgICQoXCIjYnJhaW5TdmcgLnN2Z0ltYWdlXCIpLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJzY2FsZShcIisoJCh3aW5kb3cpLndpZHRoKCkvMTgxKStcIilcIik7XG4vLyAgICAgICAgICAgICB9XG4vLyAgICAgICAgIH0pO1xuLy9cbi8vICAgICAgICAgJC5lYWNoKHN2Z1Rpc3N1ZXMsIGZ1bmN0aW9uIChpbmRleCwgc3ZnVGlzc3VlKSB7XG4vLyAgICAgICAgICAgICB2YXIgc3ZnSWROYW1lID0gJChzdmdUaXNzdWUpLmF0dHIoXCJpZFwiKTtcbi8vICAgICAgICAgICAgIC8vZ2l2ZXMgYSBjbGFzcyBhdHRyaWJ1dGUgdG8gZXZlcnkgdGlzc3VlIGluIHRoZSBhbmF0b21vZ3JhbSBiYXNlZCBvbiB0aGUgdGlzc3VlJ3MgaWRcbi8vICAgICAgICAgICAgICQoc3ZnVGlzc3VlKS5hdHRyKFwiY2xhc3NcIiwgc3ZnSWROYW1lKTtcbi8vICAgICAgICAgICAgIC8vcmVtb3ZlcyB0aGUgdGl0bGUgZWxlbWVudCBvZiBlYWNoIHRpc3N1ZSBzbyBhcyB0byBwcmV2ZW50IHRvb2x0aXAgZnJvbSBwb3BwaW5nIHVwXG4vLyAgICAgICAgICAgICAkKFwiLmd4YUFuYXRvbW9ncmFtIHRpdGxlXCIpLnJlbW92ZSgpO1xuLy8gICAgICAgICAgICAgdmFyIHRpc3N1ZUlkPWFuYXRvbW9ncmFtSWRUb1Rpc3N1ZUlkKHN2Z0lkTmFtZSk7XG4vL1xuLy8gICAgICAgICAgICAgJChzdmdUaXNzdWUpLm1vdXNlZW50ZXIoZnVuY3Rpb24gKCkge1xuLy8gICAgICAgICAgICAgICAgIGNvbG9yVGlzc3VlKHRpc3N1ZUlkKTtcbi8vICAgICAgICAgICAgICAgICB2YXIgYW5hdG9tb2dyYW1UYWJsZSA9ICQoXCIjYW5hdG9tb2dyYW1UYWJsZVdyYXBwZXJcIikuRGF0YVRhYmxlKClcbi8vICAgICAgICAgICAgICAgICBhbmF0b21vZ3JhbVRhYmxlLnJvd3MoKS5ldmVyeShmdW5jdGlvbihpbmRleCkge1xuLy8gICAgICAgICAgICAgICAgICAgICB2YXIgYW5hdG9tb2dyYW1JZCA9IGpzb25UaXNzdWVzW3Rpc3N1ZU5hbWVUb1Rpc3N1ZUlkKHRoaXMuZGF0YSgpWzFdKV0uSUROYW1lO1xuLy8gICAgICAgICAgICAgICAgICAgICBpZiAoYW5hdG9tb2dyYW1JZCA9PT0gc3ZnSWROYW1lKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMubm9kZSgpKS5hZGRDbGFzcyhcImFuYXRvbW9ncmFtUm93SGlnaGxpZ2h0XCIpO1xuLy8gICAgICAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICAgfSlcbi8vICAgICAgICAgICAgICAgICAkKFwiLmFuYXRvbW9ncmFtLXBsb3R2aXotdG9vbHRpcFwiKS5jc3MoXCJsZWZ0XCIsIChldmVudC5wYWdlWCsxMCkgKyBcInB4XCIpO1xuLy8gICAgICAgICAgICAgICAgICQoXCIuYW5hdG9tb2dyYW0tcGxvdHZpei10b29sdGlwXCIpLmNzcyhcInRvcFwiLCAoZXZlbnQucGFnZVkrMTApICsgXCJweFwiKTtcbi8vICAgICAgICAgICAgICAgICAkKFwiLmFuYXRvbW9ncmFtLXBsb3R2aXotdG9vbHRpcFwiKS5odG1sKFwiXCIpO1xuLy8gICAgICAgICAgICAgICAgICQuZWFjaChqc29uVGlzc3VlcywgZnVuY3Rpb24gKGluZGV4KSB7XG4vLyAgICAgICAgICAgICAgICAgICAgICBpZiAoanNvblRpc3N1ZXNbaW5kZXhdLklETmFtZSA9PT0gc3ZnSWROYW1lKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgJChcIi5hbmF0b21vZ3JhbS1wbG90dml6LXRvb2x0aXBcIikuaHRtbCgkKFwiLmFuYXRvbW9ncmFtLXBsb3R2aXotdG9vbHRpcFwiKS5odG1sKCkgKyAodGlzc3VlTWV0YWRhdGFbaW5kZXhdLnRpc3N1ZU5hbWUpLmJvbGQoKSArIFwiPGJyIGNsYXNzPSdhbmF0b21vZ3JhbUJyZWFrJz5cIiArIFwiTWFpbiBTYW1wbGluZyBTaXRlOiBcIiArIEpTT04uc3RyaW5naWZ5KGpzb25UaXNzdWVzW2luZGV4XS5EZXNjcmlwdGlvbikucmVwbGFjZSgvXFxcIi9nLCBcIlwiKSArIFwiPGJyPjxicj5cIik7XG4vLyAgICAgICAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICAgfSk7XG4vLyAgICAgICAgICAgICAgICAgJChcIi5hbmF0b21vZ3JhbS1wbG90dml6LXRvb2x0aXBcIikuc2hvdygpO1xuLy8gICAgICAgICAgICAgfSk7XG4vL1xuLy8gICAgICAgICAgICAgJChzdmdUaXNzdWUpLm1vdXNlbGVhdmUoZnVuY3Rpb24gKCkge1xuLy8gICAgICAgICAgICAgICAgIHVuY29sb3JUaXNzdWUodGlzc3VlSWQpO1xuLy8gICAgICAgICAgICAgICAgICQoXCIuYW5hdG9tb2dyYW0tcGxvdHZpei10b29sdGlwXCIpLmh0bWwoXCJcIik7XG4vLyAgICAgICAgICAgICAgICAgJChcIi5hbmF0b21vZ3JhbS1wbG90dml6LXRvb2x0aXBcIikuaGlkZSgpO1xuLy8gICAgICAgICAgICAgICAgICQoXCIjYW5hdG9tb2dyYW1UYWJsZVdyYXBwZXIgdHJcIikucmVtb3ZlQ2xhc3MoXCJhbmF0b21vZ3JhbVJvd0hpZ2hsaWdodFwiKTtcbi8vICAgICAgICAgICAgIH0pO1xuLy8gICAgICAgICB9KTtcbi8vXG4vLyAgICAgICAgICQoJyNmdWxsU3ZnU3dpdGNoJykuY2xpY2soZnVuY3Rpb24oZXZlbnQpIHtcbi8vICAgICAgICAgXHQkKCcjZnVsbEJvZHlTdmcnKS5zaG93KCk7XG4vLyAgICAgICAgIFx0JCgnI2JyYWluU3ZnJykuaGlkZSgpO1xuLy8gICAgICAgICBcdHNjYWxlU3ZncyhcImZ1bGxCb2R5U3ZnXCIpO1xuLy8gICAgICAgICBcdGNyZWF0ZVRpc3N1ZVRhYmxlKFwiZnVsbEJvZHlcIik7XG4vLyAgICAgICAgIFx0JCgnI2JyYWluU3ZnU3dpdGNoJykucmVtb3ZlQ2xhc3MoXCJhbmF0b21vZ3JhbS12aWV3LW9wdGlvbi1zZWxlY3RlZFwiKTtcbi8vICAgICAgICAgXHQkKCcjZnVsbFN2Z1N3aXRjaCcpLmFkZENsYXNzKFwiYW5hdG9tb2dyYW0tdmlldy1vcHRpb24tc2VsZWN0ZWRcIik7XG4vLyAgICAgICAgIH0pO1xuLy9cbi8vICAgICAgICAgJCgnI2JyYWluU3ZnU3dpdGNoJykuY2xpY2soZnVuY3Rpb24oZXZlbnQpIHtcbi8vICAgICAgICAgXHQkKCcjYnJhaW5TdmcnKS5zaG93KCk7XG4vLyAgICAgICAgIFx0JCgnI2Z1bGxCb2R5U3ZnJykuaGlkZSgpO1xuLy8gICAgICAgICAgICAgc2NhbGVTdmdzKFwiYnJhaW5TdmdcIik7XG4vLyAgICAgICAgICAgICBjcmVhdGVUaXNzdWVUYWJsZShcImJyYWluXCIpO1xuLy8gICAgICAgICBcdCQoJyNmdWxsU3ZnU3dpdGNoJykucmVtb3ZlQ2xhc3MoXCJhbmF0b21vZ3JhbS12aWV3LW9wdGlvbi1zZWxlY3RlZFwiKTtcbi8vICAgICAgICAgXHQkKCcjYnJhaW5TdmdTd2l0Y2gnKS5hZGRDbGFzcyhcImFuYXRvbW9ncmFtLXZpZXctb3B0aW9uLXNlbGVjdGVkXCIpO1xuLy8gICAgICAgICB9KTtcbi8vXG4vLyAgICAgICAgIC8vcmV0dXJucyB0aGUgdGlzc3VlX2lkIGdpdmVuIHRoZSBhbmF0b21vZ3JhbSBpZFxuLy8gICAgICAgICBmdW5jdGlvbiBhbmF0b21vZ3JhbUlkVG9UaXNzdWVJZCAoYW5hdG9tb2dyYW1JZCkge1xuLy8gICAgICAgICAgICAgdmFyIGlkPVwiXCJcbi8vICAgICAgICAgICAgICQuZWFjaChqc29uVGlzc3VlcywgZnVuY3Rpb24gKGluZGV4KSB7XG4vLyAgICAgICAgICAgICAgICAgaWYgKGpzb25UaXNzdWVzW2luZGV4XS5JRE5hbWUgPT09IGFuYXRvbW9ncmFtSWQpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgaWQ9aW5kZXg7XG4vLyAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgfSk7XG4vLyAgICAgICAgICAgICByZXR1cm4gaWQ7XG4vLyAgICAgICAgIH1cbi8vXG4vLyAgICAgICAgIC8vcmV0dXJucyB0aGUgdGlzc3VlX2lkIGdpdmVuIHRoZSB0aXNzdWVOYW1lXG4vLyAgICAgICAgIGZ1bmN0aW9uIHRpc3N1ZU5hbWVUb1Rpc3N1ZUlkKHRpc3N1ZU5hbWUpIHtcbi8vICAgICAgICAgICAgIHZhciBpZCA9IFwiXCI7XG4vLyAgICAgICAgICAgICAkLmVhY2goanNvblRpc3N1ZXMsIGZ1bmN0aW9uIChqc29uVGlzc3VlKSB7XG4vLyAgICAgICAgICAgICAgICAgaWYgKHRpc3N1ZU1ldGFkYXRhW2pzb25UaXNzdWVdLnRpc3N1ZU5hbWUgPT09IHRpc3N1ZU5hbWUpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgaWQgPSBqc29uVGlzc3VlO1xuLy8gICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgIH0pO1xuLy8gICAgICAgICAgICAgcmV0dXJuIGlkO1xuLy8gICAgICAgICB9XG4vL1xuLy8gICAgICAgICAvL2hpZ2hsaWdodHMgdGhlIHRpc3N1ZSBnaXZlbiB0aGUgdGlzc3VlX2lkXG4vLyAgICAgICAgIGZ1bmN0aW9uIGNvbG9yVGlzc3VlKHRpc3N1ZUlkKSB7XG4vLyAgICAgICAgICAgICB2YXIgdGlzc3VlQ29sb3IgPSBcIiNcIiArIHRpc3N1ZU1ldGFkYXRhW3Rpc3N1ZUlkXS5jb2xvckhleDtcbi8vICAgICAgICAgICAgIHZhciBzdmdJZE5hbWUgPSBqc29uVGlzc3Vlc1t0aXNzdWVJZF0uSUROYW1lO1xuLy8gICAgICAgICAgICAgJChcIi5cIiArIHN2Z0lkTmFtZSkuY3NzKFwiZmlsbFwiLCB0aXNzdWVDb2xvcik7XG4vLyAgICAgICAgICAgICAkKFwiLlwiICsgc3ZnSWROYW1lKS5jc3MoXCJmaWxsLW9wYWNpdHlcIiwgXCIwLjdcIik7XG4vL1xuLy8gICAgICAgICAgICAgaWYgKHN2Z0lkTmFtZSA9PT0gXCJVQkVST05fMDAwMjM2N1wiIHx8IHN2Z0lkTmFtZSA9PT0gXCJVQkVST05fMDAwMDQ3M1wiKSB7XG4vLyAgICAgICAgICAgICAgICAgJChcIi5cIiArIHN2Z0lkTmFtZSkuY3NzKFwic3Ryb2tlXCIsIFwiYmxhY2tcIik7XG4vLyAgICAgICAgICAgICAgICAgJCgkKFwiLlwiICsgc3ZnSWROYW1lKS5jaGlsZHJlbigpKS5jc3MoXCJzdHJva2VcIiwgXCJibGFja1wiKTtcbi8vICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgIGlmIChzdmdJZE5hbWUgPT09IFwiVUJFUk9OXzAwMDAwMDdcIiB8fCBzdmdJZE5hbWUgPT09IFwiVUJFUk9OXzAwMDA5OTJcIiB8fCBzdmdJZE5hbWUgPT09IFwiVUJFUk9OXzAwMDM4ODlcIiB8fCBzdmdJZE5hbWUgPT09IFwiVUJFUk9OXzAwMDAwMDJcIikge1xuLy8gICAgICAgICAgICAgICAgICQoXCIuXCIgKyBzdmdJZE5hbWUpLmNzcyhcInN0cm9rZVwiLCB0aXNzdWVDb2xvcik7XG4vLyAgICAgICAgICAgICAgICAgJChcIi5cIiArIHN2Z0lkTmFtZSkuY3NzKFwiZmlsbC1vcGFjaXR5XCIsIFwiMVwiKTtcbi8vICAgICAgICAgICAgICAgICAkKFwiLlwiICsgc3ZnSWROYW1lKS5jc3MoXCJzdHJva2Utd2lkdGhcIiwgXCIxLjFcIik7XG4vLyAgICAgICAgICAgICB9XG4vL1xuLy8gICAgICAgICB9XG4vL1xuLy8gICAgICAgICAvL3VuaGlnaGxpZ2h0cyB0aGUgdGlzc3VlIGdpdmVuIHRoZSB0aXNzdWVfaWRcbi8vICAgICAgICAgZnVuY3Rpb24gdW5jb2xvclRpc3N1ZSh0aXNzdWVJZCkge1xuLy8gICAgICAgICAgICAgdmFyIHN2Z0lkTmFtZSA9IGpzb25UaXNzdWVzW3Rpc3N1ZUlkXS5JRE5hbWU7XG4vLyAgICAgICAgICAgICAkKFwiLlwiK3N2Z0lkTmFtZSkuY3NzKFwiZmlsbFwiLCBcIiNBNEE0QTRcIik7XG4vLyAgICAgICAgICAgICAkKFwiLlwiK3N2Z0lkTmFtZSkuY3NzKFwiZmlsbC1vcGFjaXR5XCIsIFwiMC41XCIpO1xuLy9cbi8vICAgICAgICAgICAgIGlmIChzcGVjaWFsVGlzc3Vlcy5pbmNsdWRlcyhzdmdJZE5hbWUpKSB7XG4vLyAgICAgICAgICAgICAgICAgJChcIi5cIitzdmdJZE5hbWUpLmNzcyhcInN0cm9rZVwiLCBcIm5vbmVcIik7XG4vLyAgICAgICAgICAgICAgICAgJCgkKFwiLlwiK3N2Z0lkTmFtZSkuY2hpbGRyZW4oKSkuY3NzKFwic3Ryb2tlXCIsXCJub25lXCIpO1xuLy8gICAgICAgICAgICAgfVxuLy8gICAgICAgICB9XG4vL1xuLy8gICAgICAgICBmdW5jdGlvbiBzY2FsZVN2Z3ModHlwZSkge1xuLy8gICAgICAgICAgICAgdmFyIGZ1bGxCb2R5QW5hdG9tb2dyYW1TY2FsZUZhY3RvciA9IDUyNTtcbi8vICAgICAgICAgICAgIHZhciBmdWxsQm9keUNvbnRhaW5lclNjYWxlRmFjdG9yID0gMS44NTtcbi8vICAgICAgICAgICAgIHZhciBicmFpbkFuYXRvbW9ncmFtU2NhbGVGYWN0b3IgPSAzNjI7XG4vLyAgICAgICAgICAgICB2YXIgYnJhaW5Db250YWluZXJTY2FsZUZhY3RvciA9IDAuODg1O1xuLy8gICAgICAgICAgICAgaWYgKHR5cGU9PT1cImZ1bGxCb2R5U3ZnXCIpIHtcbi8vICAgICAgICAgICAgICAgICB2YXIgYW5hdG9tb2dyYW1TY2FsZUZhY3RvciA9IGZ1bGxCb2R5QW5hdG9tb2dyYW1TY2FsZUZhY3Rvcjtcbi8vICAgICAgICAgICAgICAgICB2YXIgY29udGFpbmVyU2NhbGVGYWN0b3IgPSBmdWxsQm9keUNvbnRhaW5lclNjYWxlRmFjdG9yO1xuLy8gICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgZWxzZSB7XG4vLyAgICAgICAgICAgICAgICAgdmFyIGFuYXRvbW9ncmFtU2NhbGVGYWN0b3IgPSBicmFpbkFuYXRvbW9ncmFtU2NhbGVGYWN0b3I7XG4vLyAgICAgICAgICAgICAgICAgdmFyIGNvbnRhaW5lclNjYWxlRmFjdG9yID0gYnJhaW5Db250YWluZXJTY2FsZUZhY3Rvcjtcbi8vICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICQoXCIjXCIgKyB0eXBlICsgXCIgLnN2Z0NvbnRhaW5lclwiKS5jc3MoXCJoZWlnaHRcIiwgXCJcIisgJChcIiNcIiArIHR5cGUgK1wiIC5zdmdDb250YWluZXJcIikud2lkdGgoKSpjb250YWluZXJTY2FsZUZhY3Rvcik7XG4vLyAgICAgICAgICAgICBpZiAoJCh3aW5kb3cpLndpZHRoKCk+MTIwMCkge1xuLy8gICAgICAgICAgICAgICAgICQoXCIjXCIgKyB0eXBlICtcIiAuc3ZnSW1hZ2VcIikuYXR0cihcInRyYW5zZm9ybVwiLCBcInNjYWxlKFwiKygkKHdpbmRvdykud2lkdGgoKS9hbmF0b21vZ3JhbVNjYWxlRmFjdG9yKStcIilcIik7XG4vLyAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICBlbHNlIHtcbi8vICAgICAgICAgICAgICAgICAkKFwiI1wiICsgdHlwZSArXCIgLnN2Z0ltYWdlXCIpLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJzY2FsZShcIisoJCh3aW5kb3cpLndpZHRoKCkvKGFuYXRvbW9ncmFtU2NhbGVGYWN0b3IvMikpK1wiKVwiKTtcbi8vICAgICAgICAgICAgIH1cbi8vICAgICAgICAgfVxuLy9cbi8vICAgICAgICAgZnVuY3Rpb24gY3JlYXRlVGlzc3VlVGFibGUodHlwZSkge1xuLy8gICAgICAgICAgICAgJChcIiNhbmF0b21vZ3JhbVRhYmxlRGlzcGxheVwiKS5odG1sKFwiXCIpO1xuLy8gICAgICAgICAgICAgdmFyIG9UYWJsZSA9ICQoJzx0YWJsZSBpZD1cImFuYXRvbW9ncmFtVGFibGVXcmFwcGVyXCI+PC90YWJsZT4nKTtcbi8vICAgICAgICAgICAgICQoXCIjYW5hdG9tb2dyYW1UYWJsZURpc3BsYXlcIikuYXBwZW5kKG9UYWJsZSk7XG4vLyAgICAgICAgICAgICB2YXIgdGhlYWQgPSAkKCc8dGhlYWQ+PC90aGVhZD4nKTtcbi8vICAgICAgICAgICAgICQob1RhYmxlKS5hcHBlbmQodGhlYWQpO1xuLy8gICAgICAgICAgICAgdmFyIHRib2R5ID0gJCgnPHRib2R5PjwvdGJvZHk+Jyk7XG4vLyAgICAgICAgICAgICAkKG9UYWJsZSkuYXBwZW5kKHRib2R5KTtcbi8vXG4vLyAgICAgICAgICAgICB2YXIgdHIgPSAkKFwiPHRyPjwvdHI+XCIpO1xuLy8gICAgICAgICAgICAgJCh0aGVhZCkuYXBwZW5kKHRyKTtcbi8vICAgICAgICAgICAgIHZhciB0ZDEgPSAkKCc8dGggIHN0eWxlPVwibWF4LXdpZHRoOiAxMHB4ICFpbXBvcnRhbnQ7XCI+PC90aD4nKTtcbi8vICAgICAgICAgICAgICQodHIpLmFwcGVuZCh0ZDEpO1xuLy8gICAgICAgICAgICAgdmFyIHRkMiA9ICQoJzx0aD5UaXNzdWU8L3RoPicpO1xuLy8gICAgICAgICAgICAgJCh0cikuYXBwZW5kKHRkMik7XG4vLyAgICAgICAgICAgICB2YXIgdGQzID0gJCgnPHRoPk1haW4gU2FtcGxpbmcgU2l0ZTwvdGg+Jyk7XG4vLyAgICAgICAgICAgICAkKHRyKS5hcHBlbmQodGQzKTtcbi8vXG4vLyAgICAgICAgICAgICBpZiAodHlwZT09PVwiZnVsbEJvZHlcIikge1xuLy8gICAgICAgICAgICAgICAgICQuZWFjaChqc29uVGlzc3VlcywgZnVuY3Rpb24gKGpzb25UaXNzdWUpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgdmFyIHRyID0gJChcIjx0cj48L3RyPlwiKTtcbi8vICAgICAgICAgICAgICAgICAgICAgJCh0Ym9keSkuYXBwZW5kKHRyKTtcbi8vICAgICAgICAgICAgICAgICAgICAgdmFyIHRkMSA9ICQoJzx0ZCBzdHlsZT1cIndpZHRoOiAxMHB4O1wiPjxzdmcgd2lkdGg9XCIxMHB4XCIgaGVpZ2h0PVwiMTBweFwiPjxjaXJjbGUgY3g9XCI1MCVcIiBjeT1cIjUwJVwiIHI9XCI1cHhcIiBmaWxsPScgKyAnIycgKyB0aXNzdWVNZXRhZGF0YVtqc29uVGlzc3VlXS5jb2xvckhleCArICcvPjwvc3ZnPjwvdGQ+Jyk7XG4vLyAgICAgICAgICAgICAgICAgICAgICQodHIpLmFwcGVuZCh0ZDEpO1xuLy8gICAgICAgICAgICAgICAgICAgICB2YXIgdGQyID0gJCgnPHRkPicgKyB0aXNzdWVNZXRhZGF0YVtqc29uVGlzc3VlXS50aXNzdWVOYW1lICsgJzwvdGQ+Jyk7XG4vLyAgICAgICAgICAgICAgICAgICAgICQodHIpLmFwcGVuZCh0ZDIpO1xuLy8gICAgICAgICAgICAgICAgICAgICB2YXIgdGQzID0gJCgnPHRkPicgKyBqc29uVGlzc3Vlc1tqc29uVGlzc3VlXS5EZXNjcmlwdGlvbiArICc8L3RkPicpO1xuLy8gICAgICAgICAgICAgICAgICAgICAkKHRyKS5hcHBlbmQodGQzKTtcbi8vICAgICAgICAgICAgICAgICB9KTtcbi8vICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgIGVsc2Uge1xuLy8gICAgICAgICAgICAgICAgICQuZWFjaChqc29uVGlzc3VlcywgZnVuY3Rpb24gKGpzb25UaXNzdWUpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgaWYgKGpzb25UaXNzdWVzW2pzb25UaXNzdWVdLmlzQnJhaW49PT1cIlRSVUVcIiAmJiBqc29uVGlzc3Vlc1tqc29uVGlzc3VlXS5JRE5hbWUhPVwiVUJFUk9OXzAwMDIyNDBcIikge1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRyID0gJChcIjx0cj48L3RyPlwiKTtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICQodGJvZHkpLmFwcGVuZCh0cik7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGQxID0gJCgnPHRkIHN0eWxlPVwid2lkdGg6IDEwcHg7XCI+PHN2ZyB3aWR0aD1cIjEwcHhcIiBoZWlnaHQ9XCIxMHB4XCI+PGNpcmNsZSBjeD1cIjUwJVwiIGN5PVwiNTAlXCIgcj1cIjVweFwiIGZpbGw9JyArICcjJyArIHRpc3N1ZU1ldGFkYXRhW2pzb25UaXNzdWVdLmNvbG9ySGV4ICsgJy8+PC9zdmc+PC90ZD4nKTtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICQodHIpLmFwcGVuZCh0ZDEpO1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRkMiA9ICQoJzx0ZD4nICsgdGlzc3VlTWV0YWRhdGFbanNvblRpc3N1ZV0udGlzc3VlTmFtZSArICc8L3RkPicpO1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgJCh0cikuYXBwZW5kKHRkMik7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGQzID0gJCgnPHRkPicgKyBqc29uVGlzc3Vlc1tqc29uVGlzc3VlXS5EZXNjcmlwdGlvbiArICc8L3RkPicpO1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgJCh0cikuYXBwZW5kKHRkMyk7XG4vLyAgICAgICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgICB9KTtcbi8vICAgICAgICAgICAgIH1cbi8vXG4vLyAgICAgICAgICAgICAkKG9UYWJsZSkuRGF0YVRhYmxlKHtcbi8vICAgICAgICAgICAgICAgICBcImJJbmZvXCI6IGZhbHNlLFxuLy8gICAgICAgICAgICAgICAgIFwiYW9Db2x1bW5zXCI6IFt7XCJiU29ydGFibGVcIjpmYWxzZX0sIG51bGwsIG51bGxdLFxuLy8gICAgICAgICAgICAgICAgIFwib3JkZXJcIjogWyAxLCAnYXNjJyBdLFxuLy8gICAgICAgICAgICAgICAgIGpRdWVyeVVJIDogdHJ1ZSxcbi8vICAgICAgICAgICAgICAgICBkb206ICc8XCJjbGVhclwiPmxmcnRpcCcsXG4vLyAgICAgICAgICAgICAgICAgZGVzdHJveTogdHJ1ZSxcbi8vICAgICAgICAgICAgICAgICBzY3JvbGxZOic4MjBweCcsXG4vLyAgICAgICAgICAgICAgICAgc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG4vLyAgICAgICAgICAgICAgICAgXCJwYWdpbmdcIjogZmFsc2UsXG4vLyAgICAgICAgICAgICB9KTtcbi8vXG4vLyAgICAgICAgICAgICB2YXIgdGlzc3VlSWQ9XCJcIlxuLy8gICAgICAgICAgICAgJCgnI2FuYXRvbW9ncmFtVGFibGVXcmFwcGVyIHRib2R5Jylcbi8vICAgICAgICAgICAgIC5vbiggJ21vdXNlZW50ZXInLCAndHInLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgICAgICAgICAgJCh0aGlzKS5hZGRDbGFzcygnYW5hdG9tb2dyYW1Sb3dIaWdobGlnaHQnKTtcbi8vICAgICAgICAgICAgICAgICB2YXIgdGlzc3VlTmFtZSA9ICQoJCh0aGlzKS5jaGlsZHJlbigpWzFdKS50ZXh0KCk7XG4vLyAgICAgICAgICAgICAgICAgdGlzc3VlSWQgPSB0aXNzdWVOYW1lVG9UaXNzdWVJZCh0aXNzdWVOYW1lKTtcbi8vICAgICAgICAgICAgICAgICB2YXIgYW5hdG9tb2dyYW1JZCA9IGpzb25UaXNzdWVzW3Rpc3N1ZUlkXS5JRE5hbWU7XG4vLyAgICAgICAgICAgICAgICAgY29sb3JUaXNzdWUodGlzc3VlSWQpO1xuLy8gICAgICAgICAgICAgfSlcbi8vICAgICAgICAgICAgIC5vbignbW91c2VsZWF2ZScsICd0cicsIGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlQ2xhc3MoJ2FuYXRvbW9ncmFtUm93SGlnaGxpZ2h0Jyk7XG4vLyAgICAgICAgICAgICAgICAgdW5jb2xvclRpc3N1ZSh0aXNzdWVJZCk7XG4vLyAgICAgICAgICAgICB9KVxuLy8gICAgICAgICB9XG4vLyAgICAgfSk7XG4vLyB9OyJdLCJuYW1lcyI6WyJjc3YiLCJkc3YiLCJ0c3YiXSwibWFwcGluZ3MiOiI7OztBQUFBLElBQUksR0FBRyxHQUFHLEVBQUU7SUFDUixHQUFHLEdBQUcsRUFBRTtJQUNSLEtBQUssR0FBRyxFQUFFO0lBQ1YsT0FBTyxHQUFHLEVBQUU7SUFDWixNQUFNLEdBQUcsRUFBRSxDQUFDOztBQUVoQixTQUFTLGVBQWUsQ0FBQyxPQUFPLEVBQUU7RUFDaEMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQUUsVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxFQUFFO0lBQ2xFLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztHQUNoRCxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0NBQ3JCOztBQUVELFNBQVMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUU7RUFDbkMsSUFBSSxNQUFNLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0VBQ3RDLE9BQU8sU0FBUyxHQUFHLEVBQUUsQ0FBQyxFQUFFO0lBQ3RCLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7R0FDbkMsQ0FBQztDQUNI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
