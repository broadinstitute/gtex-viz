import DendroHeatmapConfig from "./DendroHeatmapConfig";
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
     * @param heatmapData {List} of objects with attributes: x: String, y:String, value:Float, originalValue:Float, see the class Heatmap
     * @param config
     */
    constructor(columnTree, rowTree, heatmapData, color="gnbu", r=2, config=new DendroHeatmapConfig()){
        this.config = config.get();
        this.data = {
            columnTree: columnTree,
            rowTree: rowTree,
            heatmap: heatmapData,
            external: undefined
        };
        this.objects = {
            columnTree: new Dendrogram(this.data.columnTree, "v"),
            rowTree: new Dendrogram(this.data.rowTree, "h"),
            heatmap: new Heatmap(this.data.heatmap, true, color, r)
        };
        this.visualComponents = {
            tooltip: new Tooltip("tooltip", false), // TODO: remove hard-coded tooltip DOM ID
            svg: undefined
        };
    }

    /**
     * visual rendering of the dendroHeatmap
     * @param domId {String} the DOM id of the SVG
     * @return {Selection} the SVG object
     */
    render(domId, showTopTree=true, showLeftTree=true, legendPos="bottom"){
        // TODO: code cleanup... better implementation for optional trees
        this._updateConfig(this.objects.columnTree, this.objects.rowTree, legendPos);
        let svg = createSvg(domId, this.config.w, this.config.h, this.config.margin);

        this._renderTree(svg, this.objects.columnTree, this.config.panels.top, showTopTree);
        this._renderTree(svg, this.objects.rowTree, this.config.panels.left, showLeftTree);

        const xlist = showTopTree?this.objects.columnTree.xScale.domain():this.objects.columnTree.xScale.domain().sort();
        const ylist = showLeftTree?this.objects.rowTree.yScale.domain():this.objects.rowTree.yScale.domain().sort();

        this._renderHeatmap(svg, this.objects.heatmap, xlist, ylist);
        // this._renderHeatmapLegend(svg, this.objects.heatmap);
        this.visualComponents.svg = svg;
    }

    /**
     * renders the heatmap and color legend
     * @param svg {Selection} a d3 selection object
     * @param heatmap {Heatmap} a Heatmap object
     * @param xList {List} a list of x labels
     * @param yList {List} a list of y labels
     * @private
     */
    _renderHeatmap(svg, heatmap, xList, yList){
        const config = this.config.panels.main;
        const g = svg.append("g")
            .attr("id", config.id)
            .attr("transform", `translate(${config.x}, ${config.y})`);
        heatmap.redraw(g, xList, yList, {w: config.w, h: config.h});
        heatmap.drawColorLegend(svg, this.config.panels.legend);
    }
    //
    // _renderHeatmapLegend(svg, heatmap){
    //      // the heatmap color legend panel
    //     const legendConfig = this.config.panels.legend;
    //     const legendG = svg.append("g")
    //         .attr("id", legendConfig.id)
    //         .attr("transform", `translate(${legendConfig.x}, ${legendConfig.y})`);
    //     heatmap.drawLegend(legendG, legendConfig.cell.w);
    // }
    /**
     * renders a newick tree
     * @param svg {Selection} a d3 selection object
     * @param tree {Dendrogram} a Dendrogram object
     * @param config {Object} a panel config with attributes: x, y, width and height
     * @private
     */
    _renderTree(svg, tree, config, show=true){
        const tooltip = this.visualComponents.tooltip;
        const g = svg.append("g")
            .attr("id", config.id)
            .attr("transform", `translate(${config.x}, ${config.y})`);
        tree.draw(g, config.w, config.h, show);

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
                .attr("r", 2)
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
     * @param legendPos {String} bottom or top
     * @private
     */
    _updateConfig(colTree, rowTree, legendPos){
        const columns = colTree.leaves.length;
        const rows = rowTree.leaves.length;

        // updates the left panel's height based on the data
        this.config.panels.left.h = this.config.cell.h * rows;
        if(legendPos=="bottom") this.config.panels.legend.y += this.config.panels.left.h;
        this.config.h += this.config.panels.left.h;
        this.config.panels.main.h = this.config.panels.left.h;

    }
}