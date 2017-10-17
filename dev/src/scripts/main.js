import {getGtexURLs, getTissueClusters} from './modules/gtexDataParser';
import {select} from "d3-selection";
import Dendrogram from "./modules/Dendrogram";
import Tooltip from "./modules/Tooltip";

const urls = getGtexURLs();

// global configuration of the heatmap dashboard
const heatmapConfig = {
    useLog: true,
    margin: {left: 10, top: 10, bottom: 170},
    divId: "#chart",
    cell: {height: 11}
};

// configures each heatmap panel
// TODO: reorganize these panel configs, eliminate hard-coded values
let topTreePanel = { // the tissue dendrogram panel
    x: 100,
    y: heatmapConfig.margin.top,
    height: 80,
    width: window.innerWidth - (150 + 150)
};

let leftTreePanel = { // the gene dendrogram panel
    x: heatmapConfig.margin.left,
    y: heatmapConfig.margin.top + topTreePanel.height + 5,
    height: undefined, // data-dependent
    width: 100 - (heatmapConfig.margin.left + 5)
};

let heatmapPanel = {
    x: 100,
    y: heatmapConfig.margin.top + topTreePanel.height + 5,
    height: undefined, // data-dependent and should align with the gene dendrogram
    width: window.innerWidth - (150 + 150)
};

let legendPanel = { // the color legend panel
    x: 100,
    y: heatmapConfig.margin.top + topTreePanel.height + 5,
    height: 50,
    width: window.innerWidth - (150 + 150),
    cell: {width: 60}
};

// initiates the svg
const tooltip = new Tooltip("tooltip", true);

let svg = select(heatmapConfig.divId).append("svg")
    .attr("width", window.innerWidth - heatmapConfig.margin.left)
    .attr("height", heatmapConfig.margin.top + legendPanel.height + heatmapConfig.margin.bottom);

const tissueTree = new Dendrogram(getTissueClusters(), 'v');
renderTopTree(tissueTree);

let heatmap = undefined;

/////// visualization helper functions ///////
function renderTopTree(tree){
    // renders the tissue dendrogram
    const topTreeG = svg.append("g")
        .attr('id', 'topTreeGroup')
        .attr("transform", `translate(${topTreePanel.x}, ${topTreePanel.y})`);
    tree.draw(topTreeG, topTreePanel.width, topTreePanel.height);
    svg.attr("height", parseFloat(svg.attr("height")) + topTreePanel.height);
    // overrides mouse events
    const treeMouseover = function(d){
        select(this)
            .attr("r", 6)
            .attr("fill", "red");
        const leaves = d.leaves().map((node)=>node.data.name);
        tooltip.show(`${leaves.join("<br>")}`);
    };
    const treeMouseout = function(d){
        select(this)
            .attr("r", 1.5)
            .attr("fill", "#333");
        const leaves = d.leaves().map((node)=>node.data.name);
        tooltip.hide();
    };
    topTreeG.selectAll('.node')
        .on('mouseover', treeMouseover)
        .on('mouseout', treeMouseout);
}