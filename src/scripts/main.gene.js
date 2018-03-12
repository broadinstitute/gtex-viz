import * as d4 from "d3";
import DendroHeatmap from "./modules/DendroHeatmap";
import {getTissueClusters, getGeneClusters, getGtexUrls, parseTissues, parseMedianTPM, makeJsonForPlotly, parseMedianExpression} from "./modules/gtexDataParser";
import {downloadSvg} from "./modules/utils";

const urls = getGtexUrls();
$(document).ready(function(){

    ///// Tissue drop down menu for top expressed genes
    buildDatasetDropDownMenu();

    ///// Batch query form
    batchQueryForm();

    // special demo for Mayo
    d4.select("#dataset2").on("click", function(){
        // top 50 expressed genes in cerebellum Mayo-AD
        const domId = "chart";
        reset();
        d4.select(this).classed("inView", true);

        // - gets data
        const tissueTree = getTissueClusters('top50Cerebellum_AD'),
              geneTree = getGeneClusters('top50Cerebellum_AD'),
              urls = getGtexUrls();

        d4.queue()
            .defer(d4.json, urls.tissue) // get tissue colors
            .defer(d4.tsv, urls.mayoGeneExp)
            .await(function(error, data1, data2){
                const tissues = parseTissues(data1);
                const expression = parseMedianTPM(data2, true);
                const dmap = render(domId, tissueTree, geneTree, expression);
                customization(dmap, tissues, dmap.data.heatmap);
            });
    });
});

function batchQueryForm(){
    const domId = "chart";
    $('#searchExample').click(function(){
        // $('#gids').val("ENSG00000248746.1\nENSG00000065613.9\nENSG00000103034.10\nENSG00000133392.12\nENSG00000100345.16");
        // $('#genes').val("PIK3CA, TP53, CDH1, GATA3, MAP3K1, NCOR1, SPEN");
        $('#genes').val("ACTN3, SLK, ENSG00000121879.3, NDRG4, ENSG00000141510.11, ENSG00000039068.14, ENSG00000107485.11, ENSG00000095015.5, ENSG00000141027.16, ENSG00000065526.6, TP53")
    });
    $('#batchSubmit').click(function(){
        let glist = $('#genes').val().replace(/ /g, "").split(",").filter((d) => {return d!=""});
        // evaluates gene ID input
        // let illegal = glist.filter((d) => {return !d.startsWith("ENSG")});
        // glist = glist.filter((d) => {return d.startsWith("ENSG")});
        // if (illegal.length > 0) console.error(`These genes are not processed: ${illegal.join(", ")}`);

        if (glist.length == 0){
            alert("Must provide at least one gene");
            throw "Gene input error";
        }

        // TODO: gene list less than 3 has no gene clustering, needs a way to handle these

        $('#spinner').show();
        d4.queue()
        .defer(d4.json, urls.tissue) // get tissue colors
        .defer(d4.json, urls.geneId + glist.join(","))
        // .defer(d4.json, urls.medExpById + glist.join(",")) // get all median express data of these 50 genes in all tissues
        .await(function(err2, data1, data2){ // get all median express data of these 50 genes in all tissues
            const tissues = parseTissues(data1);
            const gencodeIds = data2.geneId.map((d) => d.gencodeId);
            d4.json(urls.medExpById + gencodeIds.join(","), function(eData){
                const tissueTree = eData.clusters.tissue,
                      geneTree = eData.clusters.gene,
                      expression = parseMedianExpression(eData);
                const dmap = render(domId, tissueTree, geneTree, expression);
                customization(dmap, tissues, dmap.data.heatmap);
                $('#spinner').hide();
            });

        });
    });
}

function buildDatasetDropDownMenu(){
    d4.json(urls.tissue, function(err, results){
        let tissues = results.color;
        tissues.forEach((d) => {
            d.id = d.tissue_id;
            d.text = d.tissue_name;
        });
        tissues.sort((a, b) => {
            if(a.tissue_name < b.tissue_name) return -1;
            if(a.tissue_name > b.tissue_name) return 1;
            return 0;
        });

        $('#datasetSelector').select2({
            placeholder: 'Select a data set',
            data: tissues
        });

    });
    $("#datasetSelector").change(function(){
        const tissueId = $(this).val();
        $('#spinner').show();
        renderTopExpressed(tissueId);
    });
}

function renderTopExpressed(tissueId){
    // top 50 expressed genes in tissueId
    // fetching data using the GTEx web service
    const domId = "chart";
    reset(); // clear all existing DOM elements
    d4.select(this).classed("inView", true); // the css class inView highlights the selected dataset's text in red

    // getting data
    d4.json(urls.topInTissue + tissueId, function(err, results){
        const topGenes = results.topExpressedGene,
            topGeneList = topGenes.map(d=>d.gencodeId); // top 50 expressed in Lung
        console.info(urls.medExpById + topGeneList.join(","));
        d4.queue()
            .defer(d4.json, urls.tissue) // get tissue colors
            .defer(d4.json, urls.medExpById + topGeneList.join(",")) // get all median express data of these 50 genes in all tissues
            .await(function(err2, data1, data2){ // get all median express data of these 50 genes in all tissues
                const tissues = parseTissues(data1),
                    tissueTree = data2.clusters.tissue,
                    geneTree = data2.clusters.gene,
                    expression = parseMedianExpression(data2);
                const dmap = render(domId, tissueTree, geneTree, expression);
                customization(dmap, tissues, dmap.data.heatmap);
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

/////// toolbar events ///////
function bindToolbarEvents(dmap, tissueDict){
    d4.select("#dashboardToolbar").style("display", "block");
    d4.select("#sortTissuesByAlphabet")
        .on("click", function(){
            d4.select("#" + dmap.config.panels.top.id)
                .style("display", "None"); // hides the tissue dendrogram
            let xlist = dmap.objects.heatmap.xList.sort();
            console.log(xlist);
            sortTissueClickHelper(xlist, dmap, tissueDict);
        })
        .on("mouseover", function(){
            dmap.visualComponents.tooltip.show("Sort Tissues Alphabetically");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });

    d4.select("#sortTissuesByClusters")
        .on("click", function(){
            d4.select("#" + dmap.config.panels.top.id)
                .style("display", "Block");  // shows the tissue dendrogram
            let xlist = dmap.objects.columnTree.xScale.domain();
            sortTissueClickHelper(xlist, dmap, tissueDict);
        })
        .on("mouseover", function(){
            dmap.visualComponents.tooltip.show("Cluster Tissues");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });

    d4.select("#downloadHeatmap")
        .on("click", function(){
            // let svgElement = document.getElementById(heatmapConfig.divId.replace("#","")).firstChild;
            let svgObj = $($($(`${"#" +dmap.config.id} svg`))[0]); // jQuery dependent
            downloadSvg(svgObj, "heatmap.svg", "downloadTempDiv");
        })
        .on("mouseover", function(){
            dmap.visualComponents.tooltip.show("Download Heatmap");
        })
        .on("mouseout", function(){
            dmap.visualComponents.tooltip.hide();
        });
}
function sortTissueClickHelper(xlist, dmap, tissueDict){
    // updates the heatmap
    const dom = d4.select("#"+dmap.config.panels.main.id);
    const dimensions = dmap.config.panels.main;
    dmap.objects.heatmap.redraw(dom, xlist, dmap.objects.heatmap.yList, dimensions);

    // changes the tissue display text to tissue names
    d4.selectAll(".xLabel")
        .text((d) => tissueDict[d]===undefined?d:tissueDict[d].tissue_name);
    addTissueColors(dmap, tissueDict);

    // hides the boxplot
    d4.select('#boxplot').style("opacity", 0.0);

    // deselects genes
    d4.selectAll(".yLabel").classed("clicked", false);
    dmap.data.external = {};

}

/**
 * renders the dendroHeatmap
 * @param id {String} the ID of the SVG
 * @param topTree {String} a Newick tree
 * @param leftTree {String} a Newick tree
 * @param heatmapData {List} of objects: {x: {String}, y: {String}, value: {Float}, originalValue: {Float}
 * @returns {DendroHeatmap}
 */
function render(id, topTree, leftTree, heatmapData){
    // - visualization
    let dmap = new DendroHeatmap(topTree, leftTree, heatmapData);
    dmap.render(id);
    return dmap;
}

/**
 * Customizes the dendroHeatmap
 * @param dmap {DendroHeatmap}
 * @param tissues [List] of GTEx tissue objects: {tissue_id: {String}, and a bunch of other attributes}
 * @param genes [List] of gene objects: {gencodeId}
 */
function customization(dmap, tissues, genes){
    let tissueDict = {},
        geneDict = {};
    tissues.forEach((d) => {tissueDict[d.tissue_id] = d});
    genes.forEach((d) => {geneDict[d.gencodeId] = d});
    mapTissueIdToName(tissueDict);
    mapGeneIdToSymbol(geneDict);
    addTissueColors(dmap, tissueDict);

    changeHeatmapMouseEvents(dmap, tissueDict, geneDict);

    bindToolbarEvents(dmap, tissueDict, geneDict);

}

/**
 * Overrides the heatmap's mouse events
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary}: tissue objects indexed by tissue_id
 * @param geneDict {Dictionary}: gene objects indexed by gencode ID
 */
function changeHeatmapMouseEvents(dmap, tissueDict, geneDict) {
    const svg = dmap.visualComponents.svg;
    const tooltip = dmap.visualComponents.tooltip;
    const heatmapMouseover = function(d) {
        // overrides the heatmap cell's mouseover event
        // dependencies -- css classes
        // expressMap.css
        // heatmap.css

        const selected = d4.select(this); // note: "this" refers to the dom element of d
        const rowClass = selected.attr("row");
        const colClass = selected.attr("col");
        d4.selectAll(".xLabel").filter(`.${rowClass}`)
            .classed('normal', false)
            .classed('highlighted', true);

        d4.selectAll(".yLabel").filter(`.${colClass}`)
            .classed('normal', false)
            .classed('highlighted', true);
        selected.classed('expressmap-highlighted', true);
        let row = tissueDict[d.x]===undefined?d.x:tissueDict[d.x].tissue_name;
        let column = geneDict[d.y]===undefined?d.y:geneDict[d.y].geneSymbol;

        tooltip.show(`Tissue: ${row} <br> Gene: ${column} <br> Median (${d.unit?d.unit:"TPM"}): ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`);
    };
    const heatmapMouseout = function(d){
        const selected = d4.select(this);
        const rowClass = selected.attr("row");
        const colClass = selected.attr("col");

        d4.selectAll(".xLabel").filter(`.${rowClass}`)
            .classed('normal', true)
            .classed('highlighted', false);

        d4.selectAll(".yLabel").filter(`.${colClass}`)
            .classed('normal', true)
            .classed('highlighted', false);
        selected.classed('expressmap-highlighted', false);
        tooltip.hide();
    };
    svg.selectAll(".cell")
        .on("mouseover", heatmapMouseover)
        .on("mouseout", heatmapMouseout);

    const ylabelClick = function(d){
        let s = d4.select(this);
        if (d4.event.altKey) {
            // if alt key is pressed -- additive selection
            // highlights the selected label
            if(!s.classed("clicked")) s.classed("clicked", true);
        }
        else {
            // toggles the css class, clicked
            if (s.classed("clicked")) s.classed("clicked", false);
            else {
                dmap.data.external = {}; // clears the existing data container
                d4.selectAll("clicked").classed("clicked", false); // clears all clicked labels if any
                s.classed("clicked", true); // highlights the clicked label
            }
        }

        // renders the boxplot
        // tissueOrder is a list of tissue objects {id:display name} in the same order as the x axis of the heat map.
        let tissueOrder = dmap.objects.heatmap.xScale.domain().map((d) => {
            if (tissueDict[d] === undefined){
                return {
                    id: d,
                    name: d
                }
            } else {
                return {
                    id: d,
                    name: tissueDict[d].tissue_name
                }
            }
        });

        // temporarily solution
        // eventually, genes should only be identified by gencode ID
        if (d.startsWith("ENSG")) renderBoxplot(d, geneDict, tissueOrder, dmap);
        else{
            // d is a gene symbol
            let geneDictBySymbol = {};
            Object.values(geneDict).forEach((d) => {geneDictBySymbol[d.geneSymbol] = d});
            renderBoxplot(geneDictBySymbol[d].gencodeId, geneDict, tissueOrder, dmap)
        }

    };
    svg.selectAll(".yLabel")
        .on("click", ylabelClick);
}

/**
 * renders the gene expression boxplot
 * @param gene {String} gencode ID
 * @param geneDict {Dictionary} gencode ID => gene object
 * @param tissueOrder {List} a list of tissues in the displaying order
 * @param dmap {DendroHeatmap}
 */
function renderBoxplot(gene, geneDict, tissueOrder, dmap) {
    const config = {
        useLog: false,
        id: "boxplot",
        colors: ["grey","#bb453e", "#1c677f", "#078c84", "#b4486b"], // TODO: add more colors
        data: {}
    };
    const layout = {
        title: "",
        font: {
            family: 'Libre Franklin',
            size:11
        },
        yaxis: {
            title: 'TPM',
            zeroline: false
        },
        boxmode: 'group',
        margin: {
            t:0,
        },
        showlegend: true
    };

    let data = dmap.data.external;

    if (data.hasOwnProperty(gene)) {
        // indicates that the user would like to delete the gene from the boxplot
        delete data[gene];
        d4.keys(data).forEach((d, i) => {
            // updates the data colors
            // TODO: need tp write a better color selector
            data[d]["marker"]["color"] = config.colors[i] || "black";
        });
        // redraws the box plot
        Plotly.newPlot(config.id, d4.values(data), layout);
        return;
    }

    const url = urls.geneExp + gene;
    d4.json(url, function(error, d) {
        let color = config.colors[d4.keys(data).length] || "black";
        let json = makeJsonForPlotly(gene, d, config.useLog, color, tissueOrder);
        data[gene] = json;
        Plotly.newPlot(config.id, d4.values(data), layout);
        d4.select("#" + config.id).style("opacity", 1.0); // makes the boxplot section visible
    })
}

/**
 * Maps GTEx tissue ID to tissue Names for improvement of readability
 * @param tissueDict {Dictionary} GTEx tissue objects indexed by tissue_id
 */
function mapTissueIdToName(tissueDict){
    /////// tissue label modifications ///////
    // the tree clusters and tpm expression data use tissue IDs.
    // the featureExpression web service, however, uses tissue names.
    // tissue ID <=> tissue name mapping is required.
    // This is a temporary solution, the inconsistency of tissue ID/name should be a backend fix.

    // displays tissue names in the heatmap
    d4.selectAll(".xLabel")
        .text((d) => tissueDict[d]===undefined?d:tissueDict[d].tissue_name);
}

/**
 * Maps gencode ID to gene symbol for readability
 * @param geneDict {Dictionary} GTEx gene objects indexed by gencode ID
 */
function mapGeneIdToSymbol(geneDict){
    // display gene symbol in the heatmap
    d4.selectAll(".yLabel")
        .text((d) => geneDict[d]==undefined?d:geneDict[d].geneSymbol);
}

/**
 * Adds GTEx tissue colors to the tissue labels
 * @param id:
 * @param heatmap
 * @param tissueDict
 */
function addTissueColors(dmap, tissueDict){
    const id = dmap.config.panels.main.id;
    const heatmap = dmap.objects.heatmap;
    let dots = d4.select("#"+id).selectAll(".xColor")
        .data(heatmap.xList);

     // updates old elements
    dots.attr("fill", (d) => tissueDict[d]===undefined?"#000000":`#${tissueDict[d].tissue_color_hex}`);

    // enters new elements
    dots.enter().append("circle")
        .attr('cx', (d) => heatmap.xScale(d) + heatmap.xScale.bandwidth()/2)
        .attr('cy', heatmap.yScale.range()[1] + 10) // TODO: eliminate hard-coded values
        .attr("r", 3)
        .attr("fill", (d) => tissueDict[d] === undefined? "#000000":`#${tissueDict[d].tissue_color_hex}`)
        .attr("opacity", 0.75) // more subdued color
        .attr("class", "xColor");

    // removes retired elements
    dots.exit().remove();
}