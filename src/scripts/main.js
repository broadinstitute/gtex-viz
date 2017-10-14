/*
TODO:
- Design tool bar icons.
- Use Node.js,
- then use Rollup for packaging the javascripts.

- Tissue label click event: expression boxplot of the genes in the tissue, maybe?
- Document the current progress.
- Heatmap cell click event: expression distribution of all genes in a tissue and where the gene falls

- Eliminate hard-coded values

--- API related ---
- Need an API for re-clustering genes: this is required in order to edit the gene list.
- Rewrite data retrieval methods and parsers
 */

const urls = getGtexURLs();

/////// boxplot ///////
const boxplotConfig = {
    useLog: false,
    divId: "#boxplot",
    colors: ["grey","#bb453e", "#1c677f", "#078c84", "#b4486b"], // TODO: add more colors
    data: {}
};

/////// tissue related variables ///////
const tissueHash = {}; // tissue objects indexed by tissue_id


/////// heatmap rendering ///////
// the tooltip <div>
const tooltip = new Tooltip("tooltip", true);

const heatmapConfig = {
    useLog: true,
    margin: {left: 10, top: 10, bottom: 170},
    divId: "#chart",
    cell: {height: 11},
};

// configures the heatmap panels

let topTreePanel = { // the tissue dendrogram panel
    x: 100,
    y: heatmapConfig.margin.top,
    height: 80,
    width: window.innerWidth - (150 + 150) // TODO: get rid of hard-coded values
};

let leftTreePanel = { // the gene dendrogram panel
    x: heatmapConfig.margin.left,
    y: heatmapConfig.margin.top + topTreePanel.height + 5,
    height: undefined, // data-dependent
    width: 100 - (heatmapConfig.margin.left + 5)
};

let heatmap = undefined;
let heatmapPanel = {
    x: 100,
    y: heatmapConfig.margin.top + topTreePanel.height + 5,
    height: undefined, // data-dependent and should align with the gene dendrogram
    width: window.innerWidth - (150 + 150)
};

let legendPanel = { // the color legend panel
    x: 100, // TODO: eliminate hard-coded value
    y: heatmapConfig.margin.top + topTreePanel.height + 5,
    height: 50,
    width: window.innerWidth - (150 + 150),
    cell: {width: 60}
};

// initiates the svg
let svg = d3.select(heatmapConfig.divId).append("svg")
    .attr("width", window.innerWidth - heatmapConfig.margin.left)
    .attr("height", heatmapConfig.margin.top + legendPanel.height + heatmapConfig.margin.bottom);

// renders the tissue tree
const tissueTree = new Dendrogram(getTissueClusters(), orientation='v');
renderTopTree(tissueTree);

// renders the gene tree
const geneTree = new Dendrogram(getGeneClusters(), orientation='h');
renderLeftTree(geneTree);

// renders the heatmap
d3.json(urls.tissue, function(error, data){
    const tissues = parseTissue(data);
    d3.json(getMedianTPMJson(), function(error, data){
        renderHeatmap(data, tissues)
    });
});

/////// helper functions ///////
function renderTopTree(tree){
    // renders the tissue dendrogram
    const topTreeG = svg.append("g")
        .attr('id', 'topTreeGroup')
        .attr("transform", `translate(${topTreePanel.x}, ${topTreePanel.y})`);
    tree.draw(topTreeG, topTreePanel.width, topTreePanel.height);
    svg.attr("height", parseFloat(svg.attr("height")) + topTreePanel.height);
    // overrides mouse events
    topTreeG.selectAll('.node')
        .on('mouseover', treeMouseover)
        .on('mouseout', treeMouseout);
}

function renderLeftTree(tree){
    // renders the gene dendrogram
    leftTreePanel.height = heatmapConfig.cell.height * tree.leaves.length;
    const leftTreeG = svg.append("g")
        .attr('id', 'leftTreeGroup')
        .attr("transform", `translate(${leftTreePanel.x}, ${leftTreePanel.y})`);
    tree.draw(leftTreeG, leftTreePanel.width, leftTreePanel.height);
    svg.attr("height", parseFloat(svg.attr("height")) + leftTreePanel.height);

    // overrides mouse events
    leftTreeG.selectAll('.node')
        .on('mouseover', treeMouseover)
        .on('mouseout', treeMouseout);
}

function renderHeatmap(data, tissues){
    // renders the heatmap
    // this heatmap is dependent of the dendrograms and must be rendered after the dendrograms
    // because the x and y scales are determined by the dendrograms.

    const json = parseMedianTPM(data, useLog=heatmapConfig.useLog);
    heatmap = new Heatmap(json, true, dimensions={w:topTreePanel.width, h:leftTreePanel.height});
     // renders the heatmap panel
    const mapG = svg.append("g")
        .attr('id', 'mapGroup')
        .attr("transform", `translate(${heatmapPanel.x}, ${heatmapPanel.y})`);
    // heatmap.draw(mapG);
    // determined based on the dendrograms
    // let xList = tissueTree.leaves.map((d) => d.data.name);
    let xList = tissueTree.xScale.domain();
    let yList = geneTree.yScale.domain();
    heatmap.update(mapG, xList, yList);

    // renders the legend panel
    legendPanel.y += leftTreePanel.height + 150; // adjusts legend panel's y pos.
    const legendG = svg.append("g")
        .attr('id', 'legendGroup')
        .attr("transform", `translate(${legendPanel.x}, ${legendPanel.y})`);
    heatmap.drawLegend(legendG, cellWidth=legendPanel.cell.width);

    /////// tissue label modifications ///////
    // the tree clusters and tpm expression data use tissue IDs.
    // the featureExpression web service, however, uses tissue names.
    // tissue ID <=> tissue name mapping is required.
    // This is a temporary solution, the inconsistency of tissue ID/name should be a backend fix.

    tissues.forEach((d) => {tissueHash[d.tissue_id] = d});

    // displays tissue names in the heatmap
    d3.selectAll(".xLabel")
        .text((d) => tissueHash[d].tissue_name);

    // adds tissue colors to the tissue labels (the x labels)
    addTissueColors();


    // overrides the mouse events of the cells
    svg.selectAll(".cell")
        .on("mouseover", heatmapMouseover)
        .on("mouseout", heatmapMouseout);

    // gene symbol to gencode ID mapping: a preparation step for the gene APIs
    const geneLookupTable = {}; // constructs a symbol => gencode ID lookup table
    d3.nest() // TODO: change to a simple forEach loop to build the lookup table...
        .key((d) => d.y)
        .entries(json)
        .forEach((d) => {geneLookupTable[d.key] = d.values[0].id});

    // overrides and customizes the click event of the gene labels
    // click: render the gene's boxplot
    // alt-click: add a gene to the current boxplot
    svg.selectAll(".yLabel")
        .on("click", function(d, i){
            let selected = d3.select(this);
            if (d3.event.altKey)  {
                // if alt key is pressed, it's an alt-click event
                if (!selected.classed("clicked")){ // highlights the gene
                    selected.classed("clicked", true);
                }
            }
            else {
                // a click event
                // toggles the css class: clicked
                if (selected.classed("clicked")){
                    selected.classed("clicked", false); // deselects the gene
                } else{
                    boxplotConfig.data = {}; // clears the existing boxplot data
                    d3.selectAll(".clicked").classed("clicked", false); // clears all clicked genes if any
                    selected.classed("clicked", true); // selects the gene
                }
            }

            // renders the boxplot
            const gencodeId = geneLookupTable[d];
            heatmapYLabelClick(d, gencodeId, heatmap.xScale.domain().map((d)=>tissueHash[d].tissue_name));

        });
}

/////// defines heatmap components ///////
function addTissueColors(){
    // data joining
    let dots = d3.select("#mapGroup").selectAll(".xColor")
        .data(heatmap.xList);

    // updates old elements
    dots.attr("fill", (d) => `#${tissueHash[d].tissue_color_hex}`);

    // enters new elements
    dots.enter().append("circle")
        .attr('cx', (d) => heatmap.xScale(d) + heatmap.xScale.bandwidth()/2)
        .attr('cy', heatmap.yScale.range()[1] + 10) // TODO: eliminate hard-coded values
        .attr("r", 3)
        .attr("fill", (d) => `#${tissueHash[d].tissue_color_hex}`)
        .attr("opacity", 0.75) // more subdued color
        .attr("class", "xColor");

    // removes retired elements
    dots.exit().remove();
}

/////// defines tree mouse events ///////
function treeMouseover(d){
    d3.select(this)
        .attr("r", 6)
        .attr("fill", "red");
    const leaves = d.leaves().map((node)=>node.data.name);
    tooltip.show(`${leaves.join("<br>")}`);
}
function treeMouseout(d){
    d3.select(this)
        .attr("r", 1.5)
        .attr("fill", "#333");
    const leaves = d.leaves().map((node)=>node.data.name);
    tooltip.hide();
}
/////// defines heatmap mouse events ///////
function heatmapMouseover(d) {
    // overrides the heatmap cell's mouseover event
    // dependencies -- css classes
    // expressMap.css
    // heatmap.css

    const selected = d3.select(this); // note: "this" refers to the dom element of d
    const rowClass = selected.attr("row");
    const colClass = selected.attr("col");
    d3.selectAll(".xLabel").filter(`.${rowClass}`)
        .classed('normal', false)
        .classed('highlighted', true);

    d3.selectAll(".yLabel").filter(`.${colClass}`)
        .classed('normal', false)
        .classed('highlighted', true);
    selected.classed('expressmap-highlighted', true);
    let row = tissueHash[d.x].tissue_name;
    let column = d.y;

    tooltip.show(`Tissue: ${row} <br> Gene: ${column} <br> Median TPM: ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`);
}

function heatmapMouseout(d){
    const selected = d3.select(this);
    const rowClass = selected.attr("row");
    const colClass = selected.attr("col");

    d3.selectAll(".xLabel").filter(`.${rowClass}`)
        .classed('normal', true)
        .classed('highlighted', false);

    d3.selectAll(".yLabel").filter(`.${colClass}`)
        .classed('normal', true)
        .classed('highlighted', false);
    selected.classed('expressmap-highlighted', false);
    tooltip.hide();
}

function heatmapYLabelClick(d, id, xorder){
    // overrides the ylabel's click event
    // renders the expression boxplot
    var layout = {
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
   // checks if the gene is already in boxplot.data, if so, drops it:
    if (boxplotConfig.data.hasOwnProperty(d)){
        delete boxplotConfig.data[d];
        d3.keys(boxplotConfig.data).forEach((d, i)=>{
            boxplotConfig.data[d]["marker"]["color"] = boxplotConfig.colors[i] || "black";
        });
        Plotly.newPlot('boxplot', d3.values(boxplotConfig.data), layout);
        return;
    }

   const url = urls.geneExp + id;
   d3.json(url, function(error, data){
       color = boxplotConfig.colors[d3.keys(boxplotConfig.data).length] || "black";
       let json = parseGeneExpression(data, boxplotConfig.useLog, color, xorder);
       boxplotConfig.data[d] = json;
       Plotly.newPlot('boxplot', d3.values(boxplotConfig.data), layout);
       d3.select('#boxplot').style("opacity", 1.0);

   } );
}

/////// toolbar events ///////
d3.select("#sortTissuesByAlphabet")
    .on("click", function(){
        d3.select('#topTreeGroup')
            .style("display", "None"); // hides the tissue dendrogram
        let xlist = heatmap.xList.sort();
        sortTissueClickHelper(xlist);
    });

d3.select("#sortTissuesByClusters")
    .on("click", function(){
        d3.select('#topTreeGroup')
            .style("display", "Block");  // shows the tissue dendrogram
        let xlist = tissueTree.xScale.domain();
        sortTissueClickHelper(xlist);
    });

function sortTissueClickHelper(xlist){
    // updates the heatmap
    let dom = d3.select('#mapGroup');
    heatmap.update(dom, xlist, heatmap.yList);

    // changes the tissue display text to tissue names
    d3.selectAll(".xLabel")
        .text((d) => tissueHash[d].tissue_name);
    addTissueColors();

    // hides the boxplot
    d3.select('#boxplot').style("opacity", 0.0);

    // deselects genes
    d3.selectAll(".yLabel").classed("clicked", false);
    boxplotConfig.data = {};

}








