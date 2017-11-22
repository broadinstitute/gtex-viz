import * as d4 from "d3";
import DendroHeatmap from "./modules/DendroHeatmap";
import {getTissueClusters, getGeneClusters, getGtexUrls, parseTissues, parseMedianTPM, parseGeneExpression} from "./modules/gtexDataParser";
import {downloadSvg} from "./modules/utils";

d4.select("#dataset1").on("click", function(){
    // top 50 expressed genes in liver
    // - DOM
    d4.select(this).attr("class", "inView")
    const domId = "chart";

    // - gets data
    const tissueTree = getTissueClusters('top50Liver'),
          geneTree = getGeneClusters('top50Liver'),
          urls = getGtexUrls();


    d4.queue()
        .defer(d4.json, urls.tissue)
        .defer(d4.json, urls.medianGeneExp)
        .await(function(error, data1, data2){
            const tissues = parseTissues(data1);
            const expression = parseMedianTPM(data2, true);
            const dmap = render(domId, tissueTree, geneTree, expression);
            customization(dmap, tissues);
        });
});

d4.select("#dataset2").on("click", function(){
    alert("datset2 clicked");
});


/////// toolbar events ///////
function bindToolbarEvents(dmap, tissueDict){
    d4.select("#dashboardToolbar").style("display", "block");
    d4.select("#sortTissuesByAlphabet")
        .on("click", function(){
            d4.select("#" + dmap.config.panels.top.id)
                .style("display", "None"); // hides the tissue dendrogram
            let xlist = dmap.objects.heatmap.xList.sort();
            console.log(xlist)
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
        .text((d) => tissueDict[d].tissue_name);
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
 * Customizes the dendroHeatmap specifically for the dataset
 * @param dmap {DendroHeatmap}
 * @param tissues [List] of GTEx tissue objects: {tissue_id: {String}, and a bunch of other attributes}
 */
function customization(dmap, tissues){
    console.log(tissues)
    let tissueDict = {};
    tissues.forEach((d) => {tissueDict[d.tissue_id] = d});

    mapTissueIdToName(tissueDict);
    addTissueColors(dmap, tissueDict);

    changeHeatmapMouseEvents(dmap, tissueDict);

    bindToolbarEvents(dmap, tissueDict);

}

/**
 * Overrides the heatmap mouse events
 * @param dmap {DendroHeatmap}
 * @param tissueDict {Dictionary} GTEx tissue objects indexed by tissue_id
 */
function changeHeatmapMouseEvents(dmap, tissueDict) {
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
        let row = tissueDict[d.x].tissue_name;
        let column = d.y;

        tooltip.show(`Tissue: ${row} <br> Gene: ${column} <br> Median TPM: ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`);
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
        .on("mouseout", heatmapMouseout)


    const geneDict = {}; // constructs a gene lookup table indexed by gene symbols
    console.log(dmap.data.heatmap)
    dmap.data.heatmap.forEach((d) => {geneDict[d.geneSymbol] = d})
    const ylabelClick = function(d){
        let s = d4.select(this)
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
        let tissueNames = dmap.objects.heatmap.xScale.domain().map((d) => tissueDict[d].tissue_name);
        renderBoxplot(d, geneDict, tissueNames, dmap)

    }
    svg.selectAll(".yLabel")
        .on("click", ylabelClick);

}

/**
 * renders the gene expression boxplot
 * @param gene {String} gene symbol
 * @param geneDict {Dictionary} gene symbol => gene object
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
            data[d]["marker"]["color"] = config.colors[i] || "black";
        });
        // redraws the box plot
        Plotly.newPlot(config.id, d4.values(data), layout);
        return;
    }

    const url = getGtexUrls().geneExp + geneDict[gene].id;
    d4.json(url, function(error, d) {
        let color = config.colors[d4.keys(data).length] || "black";
        let json = parseGeneExpression(d, config.useLog, color, tissueOrder);
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
        .text((d) => tissueDict[d].tissue_name);
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
    dots.attr("fill", (d) => `#${tissueDict[d].tissue_color_hex}`);

    // enters new elements
    dots.enter().append("circle")
        .attr('cx', (d) => heatmap.xScale(d) + heatmap.xScale.bandwidth()/2)
        .attr('cy', heatmap.yScale.range()[1] + 10) // TODO: eliminate hard-coded values
        .attr("r", 3)
        .attr("fill", (d) => `#${tissueDict[d].tissue_color_hex}`)
        .attr("opacity", 0.75) // more subdued color
        .attr("class", "xColor");

    // removes retired elements
    dots.exit().remove();
}