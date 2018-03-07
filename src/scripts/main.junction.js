import * as d4 from "d3";
import DendroHeatmap from "./modules/DendroHeatmap";
// import {getTissueClusters, getGeneClusters, getGtexUrls, parseTissues, parseMedianTPM, makeJsonForPlotly, parseMedianExpression} from "./modules/gtexDataParser";
import {getGtexUrls, parseTissues, parseJunctionExpression} from "./modules/gtexDataParser";
import {downloadSvg} from "./modules/utils";

const urls = getGtexUrls();
$(document).ready(function(){
    // developing
    searchJunctions();

    $('#gene').keypress(function(e){
        if(e.keyCode == 13){
            // bind the enter key
            e.preventDefault(); // or else, hitting the enter key's default is refreshing the page
            searchJunctions();
        }
    });
    $('#junctionSubmit').click(function(){
        searchJunctions();
    })
});

function searchJunctions(){
    // const input = $('#gene').val();
    const input = "SLK";
    $('#spinner').show();
    d4.queue()
        .defer(d4.json, urls.tissue) // get tissue colors
        .defer(d4.json, urls.geneId + input) // get the gene object
        .await(function(error, data1, data2){
            const tissues = parseTissues(data1);
            const gene = data2.geneId[0];
            d4.json(urls.junctionExp + gene.gencodeId, function(juncJson){

                const tissueTree = juncJson.clusters.tissue,
                      junctionTree = juncJson.clusters.junction,
                      expression = parseJunctionExpression(juncJson);
                console.log(tissueTree);
                $('#spinner').hide();

            });

        });

}
function reset(){
    d4.select("#chart").selectAll("*").remove();
    d4.select("#boxplot").selectAll("*").remove();
    d4.select("#dashboardToolbar").style("display", "none");
    d4.selectAll("*").classed("inView", false);
}
