/*
TODO:
- Allow passing customized mouse events to the rendering functions.
- Add GTEx tissue colors.
- Add a toggle option to switch between Tree clustering and Alphabetical order views
- Click Event: internal tree node
- Click Event: gene boxplot
- Add and delete genes (may not be possible without the web service and on-the-fly reclustering)
- Eliminate hard-coded values
 */


// GTEx Gene Expression Dashboard

// data
const jsonFile = "genes.median.tpm.json";
const tissueNewick = "((((((((((Testis:0.68,Brain_Cerebellum:0.68):0.30,Prostate:0.98):0.17,(Brain_Nucleus_accumbens_basal_ganglia:0.78,Brain_Hypothalamus:0.78):0.36):0.31,Cervix_Ectocervix:1.45):0.35,Esophagus_Gastroesophageal_Junction:1.80):0.38,Pituitary:2.19):0.65,(((Brain_Putamen_basal_ganglia:0.83,Brain_Cortex:0.83):0.50,Skin_Not_Sun_Exposed_Suprapubic:1.32):0.51,Brain_Hippocampus:1.84):1.00):1.13,((((((Brain_Frontal_Cortex_BA9:0.47,Brain_Anterior_cingulate_cortex_BA24:0.47):0.20,Bladder:0.67):0.15,((Breast_Mammary_Tissue:0.47,Brain_Cerebellar_Hemisphere:0.47):0.15,Brain_Caudate_basal_ganglia:0.62):0.21):0.31,Esophagus_Mucosa:1.13):0.24,(Spleen:0.75,Colon_Sigmoid:0.75):0.63):0.48,(((Cells_Transformed_fibroblasts:0.26,Cells_EBV-transformed_lymphocytes:0.26):0.30,(Cervix_Endocervix:0.24,Brain_Spinal_cord_cervical_c-1:0.24):0.32):0.05,(((Brain_Substantia_nigra:0.15,Brain_Amygdala:0.15):0.09,Skin_Sun_Exposed_Lower_leg:0.25):0.24,Small_Intestine_Terminal_Ileum:0.48):0.13):1.24):2.11):2.90,(((Whole_Blood:1.14,Stomach:1.14):0.75,((((Uterus:0.66,Heart_Left_Ventricle:0.66):0.05,Kidney_Cortex:0.71):0.32,((Liver:0.38,Heart_Atrial_Appendage:0.38):0.19,Fallopian_Tube:0.57):0.45):0.06,Vagina:1.08):0.82):0.62,((Esophagus_Muscularis:1.25,Colon_Transverse:1.25):0.37,Thyroid:1.62):0.90):4.36):8.82,((((Artery_Coronary:1.04,Artery_Aorta:1.04):1.79,Adrenal_Gland:2.82):0.19,(Artery_Tibial:1.75,Adipose_Subcutaneous:1.75):1.27):1.19,(((((Pancreas:0.41,Adipose_Visceral_Omentum:0.41):0.22,Muscle_Skeletal:0.64):0.10,(Nerve_Tibial:0.51,Minor_Salivary_Gland:0.51):0.22):0.15,Ovary:0.88):0.91,Lung:1.79):2.41):11.48);";
const geneNewick = "(((((SLC25A21:1.47,GAS6-AS1:1.47):1.53,SLC27A6:2.99):0.84,TMEM229A:3.83):2.34,((TMEM255B:2.47,TMEM106B:2.47):0.62,GAS6-AS2:3.08):3.09):7.25,(TMEM167B:4.53,GAS6:4.53):8.89);";

// tooltip <div>
var tooltip = new Tooltip("tooltip");

const config = {
    useLog: true,
    margin: {left: 10, top: 10},
    divId: "#chart",
    cell: {height: 11},
};

var legendPanel = { // the color legend panel
    x: 150,
    y: config.margin.top,
    height: 50,
    width: window.innerWidth - (150 + 150),
    cell: {width: 50}
};

var topTreePanel = { // the color legend panel
    x: 150,
    y: config.margin.top + legendPanel.height,
    height: 120,
    width: window.innerWidth - (150 + 150)
};

var leftTreePanel = { // the color legend panel
    x: config.margin.left,
    y: config.margin.top + legendPanel.height + topTreePanel.height + 5,
    height: undefined,
    width: 150 - (config.margin.left + 5)
};

var heatmapPanel = {
    x: 150,
    y: config.margin.top + legendPanel.height + topTreePanel.height + 5,
    height: undefined,
    width: window.innerWidth - (150 + 150)
};


// initiates the svg
var svg = d3.select(config.divId).append("svg")
    .attr("width", window.innerWidth - config.margin.left)
    .attr("height", config.margin.top + legendPanel.height); // initial height

// renders the tissue tree
const tissueTree = new Dendrogram(tissueNewick, orientation='v');
renderTopTree(tissueTree);

// renders the gene tree
const geneTree = new Dendrogram(geneNewick);
renderLeftTree(geneTree);

// renders the heatmap

d3.json(jsonFile, renderHeatmap);

function renderTopTree(tree){
    // renders the tissue dendrogram
    const topTreeG = svg.append("g")
        .attr('id', 'topTreeGroup')
        .attr("transform", `translate(${topTreePanel.x}, ${topTreePanel.y})`);
    tree.draw(topTreeG, topTreePanel.width, topTreePanel.height);
    svg.attr("height", svg.attr("height") + topTreePanel.height);

}

function renderLeftTree(tree){
    // renders the gene dendrogram
    leftTreePanel.height = config.cell.height * tree.leaves.length;
    const leftTreeG = svg.append("g")
        .attr('id', 'leftTreeGroup')
        .attr("transform", `translate(${leftTreePanel.x}, ${leftTreePanel.y})`);
    tree.draw(leftTreeG, leftTreePanel.width, leftTreePanel.height);
    svg.attr("height", svg.attr("height") + leftTreePanel.height);
}

function renderHeatmap(error, data){
    // renders the heatmap
    // this heatmap is dependent of the dendrograms and must be rendered after the dendrograms
    // because the x and y scales are determined by the dendrograms.

    const json = parseMedianTPM(data, useLog=config.useLog);
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
    heatmap.drawLegend(legendG, cellWidth = legendPanel.cell.width);

    // renders the heatmap panel
    const mapG = svg.append("g")
        .attr('id', 'mapGroup')
        .attr("transform", `translate(${heatmapPanel.x}, ${heatmapPanel.y})`);
    heatmap.draw(mapG);

    // overrides the mouse events of the heatmap cells
    svg.selectAll(".cell")
        .on("mouseover", heatmapMouseover)
        .on("mouseout", heatmapMouseout);
}

// customized heatmap mouse events
function heatmapMouseover(d) {
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
    let row = d.x.replace(/_/g, " ");
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







