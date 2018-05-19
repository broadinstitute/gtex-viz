/**
 * Created by lucyxu on 6/9/17.
 * Modified by Kat on 5/17/2018.
 * This code is for generating a one-time static anatomogram with all the tissues highlighted
 * using the GTEx tissue colors.
 * It is not meant for replacing the GTEx interactive anatomogram.
 */


import {json} from "d3-fetch";
import {
    getGtexUrls,
    parseTissues
} from "./modules/gtexDataParser";

export function render(urls=getGtexUrls()){
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

            let specialTissues = ["UBERON_0002367", "UBERON_0000473", "UBERON_0000007", "UBERON_0000945", "UBERON_0001044", "UBERON_0003889", "UBERON_0000002"]; //tissues that need to be highlighted in special ways

            // jQuery: color the anatomogram tissues using the GTEx tissue colors
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
        })
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