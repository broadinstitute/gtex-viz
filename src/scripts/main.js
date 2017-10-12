/*
TODO:
- Add a toggle option to switch between Tree clustering and Alphabetical order views
---- hide the tree, transform the map upwards
---- sort the tissues alphbetically (use d3.exit())

- Use a different gene list with different clusters
- Create a UI to add or delete genes (by Monday)
- Tissue label click event: expression boxplot of the genes in the tissue (by Tuseday?)
- Document the current progress
- Heatmap cell click event: expression distribution of all genes in a tissue and where the gene falls
- Click Event: internal tree node
- Add and delete genes (may not be possible without the web service and on-the-fly reclustering)
- Backend web service and Gencode ID support
- Rewrite data retrieval methods and parsers
- Eliminate hard-coded values
- Code using Node.js => Rollup packaging

- circos for trans-eQTL
- boxplots for cis-eQTL
 */


const urls = getGtexURLs();

/////// boxplot ///////
const boxplotConfig = {
    useLog: false,
    divId: "#boxplot",
    colors: ["#bb453e", "#1c677f", "#078c84", "#b4486b", "grey"], // TODO: add more colors
    data: {}
};


/////// heatmap rendering ///////
// the tooltip <div>
const tooltip = new Tooltip("tooltip", false);

const heatmapConfig = {
    useLog: true,
    margin: {left: 10, top: 10, bottom: 150},
    divId: "#chart",
    cell: {height: 11},
};

// -- heatmap panels

let legendPanel = { // the color legend panel
    x: 100, // TODO: eliminate hard-coded value
    y: heatmapConfig.margin.top,
    height: 50,
    width: window.innerWidth - (150 + 150),
    cell: {width: 60}
};

let topTreePanel = { // the color legend panel
    x: 100,
    y: heatmapConfig.margin.top + legendPanel.height,
    height: 80,
    width: window.innerWidth - (150 + 150) // TODO: hard-coded
};

let leftTreePanel = { // the color legend panel
    x: heatmapConfig.margin.left,
    y: heatmapConfig.margin.top + legendPanel.height + topTreePanel.height + 5,
    height: undefined,
    width: 100 - (heatmapConfig.margin.left + 5)
};

let heatmapPanel = {
    x: 100,
    y: heatmapConfig.margin.top + legendPanel.height + topTreePanel.height + 5,
    height: undefined,
    width: window.innerWidth - (150 + 150)
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

}

function renderLeftTree(tree){
    // renders the gene dendrogram
    leftTreePanel.height = heatmapConfig.cell.height * tree.leaves.length;
    const leftTreeG = svg.append("g")
        .attr('id', 'leftTreeGroup')
        .attr("transform", `translate(${leftTreePanel.x}, ${leftTreePanel.y})`);
    tree.draw(leftTreeG, leftTreePanel.width, leftTreePanel.height);
    svg.attr("height", parseFloat(svg.attr("height")) + leftTreePanel.height);
}

function renderHeatmap(data, tissues){
    // renders the heatmap
    // this heatmap is dependent of the dendrograms and must be rendered after the dendrograms
    // because the x and y scales are determined by the dendrograms.

    const json = parseMedianTPM(data, useLog=heatmapConfig.useLog);
    const heatmap = new Heatmap(json);

    // determined based on the dendrograms
    heatmap.xList = tissueTree.leaves.map((d) => d.data.name);
    heatmap.yList = geneTree.leaves.map((d) => d.data.name);
    heatmap.xScale = tissueTree.xScale;
    heatmap.yScale = geneTree.yScale;

    // renders the legend panel
    const legendG = svg.append("g")
        .attr('id', 'legendGroup')
        .attr("transform", `translate(${legendPanel.x}, ${legendPanel.y})`);
    heatmap.drawLegend(legendG, cellWidth=legendPanel.cell.width);

    // renders the heatmap panel
    const mapG = svg.append("g")
        .attr('id', 'mapGroup')
        .attr("transform", `translate(${heatmapPanel.x}, ${heatmapPanel.y})`);
    heatmap.draw(mapG);

    /////// tissue label modifications ///////
    const tissueHash = {}; // tissue objects indexed by tissue_id
    tissues.forEach((d) => {tissueHash[d.tissue_id] = d});
    // change text to tissue names
    d3.selectAll(".xLabel")
        .text((d) => tissueHash[d].tissue_name);
    // indexing tissue objects by tissue_id
    // add tissue colors to the tissue labels (the x labels)

    d3.select("#mapGroup").selectAll(".xColor")
        .data(heatmap.xList)
        .enter().append("circle")
        .attr('cx', (d) => heatmap.xScale(d) + heatmap.xScale.bandwidth()/2)
        .attr('cy', heatmap.yScale.range()[1] + 10) // TODO: eliminate hard-coded values
        .attr("r", 3)
        .attr("fill", (d) => `#${tissueHash[d].tissue_color_hex}`)
        .attr("opacity", 0.5) // more subdued color
        .attr("class", "xColor");

    // overrides the mouse events of the heatmap cells
    svg.selectAll(".cell")
        .on("mouseover", heatmapMouseover)
        .on("mouseout", heatmapMouseout);

    // id mapping
    const geneLookupTable = {}; // constructs a symbol => gencode ID lookup table
    d3.nest()
        .key((d) => d.y)
        .entries(json)
        .forEach((d) => {geneLookupTable[d.key] = d.values[0].id});

    // console.log(geneLookupTable);
    svg.selectAll(".yLabel")
        .on("click", function(d, i){

            // toggles the styling class
            let selected = d3.select(this);
            if (selected.classed("clicked")){
                selected.classed("clicked", false)
            } else{
                selected.classed("clicked", true);
            }

            const gencodeId = geneLookupTable[d];
            heatmapYLabelClick(d, gencodeId, heatmap.xScale.domain().map((d)=>tissueHash[d].tissue_name));
        });
}

/////// customized heatmap mouse events ///////
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
    let row = d.x;
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

   } )
}







