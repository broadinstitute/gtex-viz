// render the heatmap
const containerId = "chart";

// TODO: figure out the layout dimensions!
const margin = {
    left: 160,
    top: 100,
    right: 100,
    bottom: 0
};
const dim = {
    width: 1000,
    height: 600
};

const palette = {
    blues: d3.schemeBlues[9].concat(["#03142c"]),

    // colorbrewer
    ylgnbu:["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58","#040e29"],
    orrd: ['#fff7ec','#fee8c8','#fdd49e','#fdbb84','#fc8d59','#ef6548','#d7301f','#b30000','#7f0000','#4c0000'],
    gnbu: ['#f7fcf0','#e0f3db','#ccebc5','#a8ddb5','#7bccc4','#4eb3d3','#2b8cbe','#0868ac','#084081','#052851'],
    // other sources
    reds: ["#FFE4DE", "#FFC6BA", "#F7866E", "#d9745e", "#D25C43", "#b6442c", "#9b3a25","#712a1c", "#562015", "#2d110b"],
    // ygb: ["#FFF09D", "#F0EFB4", "#E2E9A6", "#D3E397", "#BCDCA5", "#A4D4B3", "#8DCDC1", "#87B1A4","#829487", "#7C786A"],

};

const svgConfig = {
        divId: "#" + containerId,
        width: dim.width,
        height: dim.height,
        colors: palette.gnbu,
        nullColor: "#e6e6e6"
};

const svg = d3.select(svgConfig.divId).append("svg")
    .attr("width", svgConfig.width)
    .attr("height", svgConfig.height);

const mapg = svg.append("g")
    .attr('id', 'mapgroup')
    .attr("transform", `translate(${margin.left}, ${margin.top + 55})`);

const leftg = svg.append("g")
    .attr('id', 'leftgroup')
    .attr("transform", `translate(5, ${margin.top + 55})`);

const topg = svg.append("g")
    .attr('id', 'topgroup')
    .attr("transform", `translate(${margin.left}, 50)`);

const legendg = svg.append("g")
    .attr('id', 'legendgroup')
    .attr("transform", `translate(${margin.left}, 0)`);

// parse the gene dendrogram
const gene_newick = "(((((SLC25A21:1.47,GAS6-AS1:1.47):1.53,SLC27A6:2.99):0.84,TMEM229A:3.83):2.34,((TMEM255B:2.47,TMEM106B:2.47):0.62,GAS6-AS2:3.08):3.09):7.25,(TMEM167B:4.53,GAS6:4.53):8.89);";
const gene_tree = new Dendrogram(gene_newick);
gene_tree.draw(leftg);

// parse the tissue dendrogram
const tissue_newick = "((((((((((Testis:0.68,Brain_Cerebellum:0.68):0.30,Prostate:0.98):0.17,(Brain_Nucleus_accumbens_basal_ganglia:0.78,Brain_Hypothalamus:0.78):0.36):0.31,Cervix_Ectocervix:1.45):0.35,Esophagus_Gastroesophageal_Junction:1.80):0.38,Pituitary:2.19):0.65,(((Brain_Putamen_basal_ganglia:0.83,Brain_Cortex:0.83):0.50,Skin_Not_Sun_Exposed_Suprapubic:1.32):0.51,Brain_Hippocampus:1.84):1.00):1.13,((((((Brain_Frontal_Cortex_BA9:0.47,Brain_Anterior_cingulate_cortex_BA24:0.47):0.20,Bladder:0.67):0.15,((Breast_Mammary_Tissue:0.47,Brain_Cerebellar_Hemisphere:0.47):0.15,Brain_Caudate_basal_ganglia:0.62):0.21):0.31,Esophagus_Mucosa:1.13):0.24,(Spleen:0.75,Colon_Sigmoid:0.75):0.63):0.48,(((Cells_Transformed_fibroblasts:0.26,Cells_EBV-transformed_lymphocytes:0.26):0.30,(Cervix_Endocervix:0.24,Brain_Spinal_cord_cervical_c-1:0.24):0.32):0.05,(((Brain_Substantia_nigra:0.15,Brain_Amygdala:0.15):0.09,Skin_Sun_Exposed_Lower_leg:0.25):0.24,Small_Intestine_Terminal_Ileum:0.48):0.13):1.24):2.11):2.90,(((Whole_Blood:1.14,Stomach:1.14):0.75,((((Uterus:0.66,Heart_Left_Ventricle:0.66):0.05,Kidney_Cortex:0.71):0.32,((Liver:0.38,Heart_Atrial_Appendage:0.38):0.19,Fallopian_Tube:0.57):0.45):0.06,Vagina:1.08):0.82):0.62,((Esophagus_Muscularis:1.25,Colon_Transverse:1.25):0.37,Thyroid:1.62):0.90):4.36):8.82,((((Artery_Coronary:1.04,Artery_Aorta:1.04):1.79,Adrenal_Gland:2.82):0.19,(Artery_Tibial:1.75,Adipose_Subcutaneous:1.75):1.27):1.19,(((((Pancreas:0.41,Adipose_Visceral_Omentum:0.41):0.22,Muscle_Skeletal:0.64):0.10,(Nerve_Tibial:0.51,Minor_Salivary_Gland:0.51):0.22):0.15,Ovary:0.88):0.91,Lung:1.79):2.41):11.48);";
const tissue_tree = new Dendrogram(tissue_newick, orientation='v', dimentions={w:svgConfig.width - margin.left - margin.right, h: margin.top});
tissue_tree.draw(topg);


// parse the heatmap
const jsonFile = "genes.median.tpm.json";
const useLog = true;

d3.json(jsonFile, function(error, data){
    data.forEach(function(d){
        d.value = useLog?Math.log2(+d.medianTPM):+d.medianTPM;
        d.x = d.tissueId;
        d.y = d.geneSymbol;
        d.originalValue = d.medianTPM;
    });

    // use d3.nest to group data
    const dataByX = d3.nest()
        .key(function(d){return d.x})
        .entries(data);
    const xList = dataByX.map((d) => d.key);
    const dataByY = d3.nest()
        .key((d) => d.y)
        .entries(data);
    const yList = dataByY.map((d) => d.key);

    // set the scales
    const colorScale = d3.scaleQuantile() // scaleQuantile maps the continuous domain to a discrete range
        // .domain([0, Math.round(d3.max(data, (d) => d.value))])
        .domain([0, 10])
        .range(svgConfig.colors);

    const xScale = tissue_tree.xScale;

    const yScale = gene_tree.yScale;

    // color legend
    const legend = legendg.selectAll(".legend")
        .data([0].concat(colorScale.quantiles()), (d) => d);
    const legendGroups = legend.enter().append("g")
        .attr("class", "legend");
    legendGroups.append("rect")
        .attr("x", (d, i) => 50*i) // TODO: hard-coded value
        .attr("y", 5)
        .attr("width", 50) // TODO: hard-coded value
        .attr("height", yScale.bandwidth()/2)
        .style("fill", (d) => colorScale(d));

    legendGroups.append("text")
        .attr("class", "normal")
        .text((d) => d==0?">0":"≥ " + Math.round(Math.pow(2, d)))
        .attr("x", (d, i) => 50 * i) // TODO: hard-coded value
        .attr("y", 16 + yScale.bandwidth()/2); // TODO: hard-coded value

    if(useLog){
        legendGroups.append("text")
            .attr("class", "normal")
            .text("Median TPM")
            .attr("x", 50 * 10) // TODO: hard-coded value
            .attr("y", 16 + yScale.bandwidth()/2) // TODO: hard-coded value
    }

    // text labels
    const xLabels = mapg.selectAll(".xLabel")
        .data(xList)
        .enter().append("text")
        .text((d) => d.replace(/_/g, " "))
        .attr("x", 0)
        .attr("y", 0)
        .attr("class", (d, i) => `xLabel normal x${i}`)
        .style("text-anchor", "start")
        .attr("transform", (d) => {
            let angle = 60;
            let x = xScale(d);
            return `translate(${x}, ${yScale.range()[1] + (yScale.bandwidth()/2)}) rotate(${angle})`;
        })
        .on('click', (d) => {
            "use strict";

        });

    const yLabels = mapg.selectAll(".yLabel")
        .data(yList)
        .enter().append("text")
        .text((d) => d)
        .attr("x", xScale.range()[1] + (xScale.bandwidth()/2))
        .attr("y", (d) => yScale(d) + (yScale.bandwidth()/1.5))
        .attr("class", (d, i) => `yLabel normal y${i}`)
        .style("text-anchor", "start");

    // heatmap cells
    const cells = mapg.selectAll(".cell")
        .data(data, (d) => d.value);
    cells.enter().append("rect")
        .attr("row", (d) => `x${xList.indexOf(d.x)}`)
        .attr("col", (d) => `y${yList.indexOf(d.y)}`)
        .attr("x", (d) => xScale(d.x))
        .attr("y", (d) => yScale(d.y))
        .attr("rx", 2)
        .attr('ry', 2)
        .attr("class", (d) => `cell expressmap-bordered`)
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .style("fill", (d) => svgConfig.colors[0])
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .merge(cells)
        .transition()
        .duration(2000)
        .style("fill", (d) => d.originalValue==0?svgConfig.nullColor:colorScale(d.value));

});

const tooltip = new Tooltip("tooltip");

// mouse events
const mouseover = function(d) {
    const selected = d3.select(this);
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
};

const mouseout = function(d){
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
};


