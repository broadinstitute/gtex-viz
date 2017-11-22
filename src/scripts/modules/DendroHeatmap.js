import {heatmapConfig} from "./DendroHeatmapConfig";
import Dendrogram from "./Dendrogram";
import Heatmap from "./Heatmap";
import {createSvg} from "./utils";
import Tooltip from "./Tooltip";
import * as d4 from "d3";

export default class DendroHeatmap {
    /**
     * Constructor
     * @param columnTree {String} a newick tree
     * @param rowTree {String} a newick tree
     * @param heatmapData {Object} with attributes: x, y, value, originalValue, see the class Heatmap
     * @param config
     */
    constructor(columnTree, rowTree, heatmapData, config=heatmapConfig){
        this.config = config;
        this.data = {
            columnTree: columnTree,
            rowTree: rowTree,
            heatmap: heatmapData
        }
        this.visualComponents = {
            tooltip: new Tooltip("tooltip", false)
        }
    }

    /**
     * visual rendering
     * @param domId {String} the DOM id of the SVG
     */
    render(domId){

        const topTree = new Dendrogram(this.data.columnTree, "v");
        const leftTree = new Dendrogram(this.data.rowTree, "h");
        const heatmap = new Heatmap(this.data.heatmap, true);

        this._updateConfig(topTree, leftTree);
        let svg = createSvg(domId, this.config.w, this.config.h, this.config.margin);

        this._renderTree(svg, "topTree", topTree, this.config.panels.top);
        this._renderTree(svg, "leftTree", leftTree, this.config.panels.left);
        this._renderHeatmap(svg, "heatMap", heatmap, topTree.xScale.domain(), leftTree.yScale.domain());
    }

    /**
     *
     * @param svg {Selection} a d3 selection object
     * @param id {String} DOM ID of the heatmap
     * @param heatmap {Heatmap} a Heatmap object
     * @param xList {List} a list of x labels
     * @param yList {List} a list of y labels
     * @private
     */
    _renderHeatmap(svg, id, heatmap, xList, yList){
        let config = this.config.panels.main;
        const g = svg.append("g")
            .attr("id", id)
            .attr("transform", `translate(${config.x}, ${config.y})`);

        heatmap.redraw(g, xList, yList, {w: config.w, h: config.h});
    }

    /**
     * renders a newick tree
     * @param svg {Selection} a d3 selection object
     * @param id {String} the id of this tree DOM element
     * @param tree {Dendrogram} a Dendrogram object
     * @param config {Object} a panel config with attributes: x, y, width and height
     * @private
     */
    _renderTree(svg, id, tree, config){
        const tooltip = this.visualComponents.tooltip;
        const g = svg.append("g")
            .attr("id", "leftTree")
            .attr("transform", `translate(${config.x}, ${config.y})`);
        tree.draw(g, config.w, config.h);

        // customized mouse events
        const mouseover = function(d){
            d4.select(this)
                .attr("r", 6)
                .attr("fill", "red");
            const leaves = d.leaves().map((node)=>node.data.name);
            tooltip.show(`${leaves.join("<br>")}`);
        };
        const mouseout = function(d){
            d4.select(this)
                .attr("r", 1.5)
                .attr("fill", "#333");
            const leaves = d.leaves().map((node)=>node.data.name);
            tooltip.hide();
        };
        g.selectAll(".node")
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);
    }

    /**
     * adjusts the layout dimensions based on the actual data
     * @param colTree {Dendrogram} the column tree object
     * @param rowTree {Dendrogram} the row tree object
     * @private
     */
    _updateConfig(colTree, rowTree){
        const columns = colTree.leaves.length;
        const rows = rowTree.leaves.length;

        // updates the left panel's height based on the data
        this.config.panels.left.h = this.config.cell.h * rows;
        this.config.h += this.config.panels.left.h;
        this.config.panels.main.h = this.config.panels.left.h;

    }
}