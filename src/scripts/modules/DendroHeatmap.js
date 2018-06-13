import {createSvg} from "./utils";
import {select} from "d3-selection";

import DendroHeatmapConfig from "./DendroHeatmapConfig";
import Dendrogram from "./Dendrogram";
import Heatmap from "./Heatmap";
import Tooltip from "./Tooltip";
import Toolbar from "./Toolbar";

export default class DendroHeatmap {

    /**
     * Constructor
     * @param columnTree {String} a newick tree
     * @param rowTree {String} a newick tree
     * @param heatmapData {List} of objects with attributes: x: String, y:String, value:Float, originalValue:Float
     * @param color {String} a color name that's available in Colors.getColorInterpolator
     * @param r {Integer} the degrees of rounded-corners of the heatmap cells
     * @param config {DendroHeatmapConfig}
     * @param useLog {Boolean}
     */
    constructor(columnTree, rowTree, heatmapData, color="YlGnBu", r=2, config=new DendroHeatmapConfig(), useLog=true, base=10, title = ''){
        this.config = config.get();
        //input evaluations
        columnTree = columnTree===undefined||columnTree.startsWith("Not enough data")?undefined:columnTree;
        rowTree = rowTree===undefined||rowTree.startsWith("Not enough data")?undefined:rowTree;
        // assign attribute values based on input arguments
        this.data = {
            columnTree: columnTree,
            rowTree: rowTree,
            heatmap: heatmapData,
            external: undefined
        };
        this.objects = {
            columnTree: this.data.columnTree===undefined? undefined:new Dendrogram(this.data.columnTree, "v"),
            rowTree: this.data.rowTree===undefined?undefined:new Dendrogram(this.data.rowTree, "h"),
            heatmap: new Heatmap(this.data.heatmap, color, useLog, base, r)
        };
        this.visualComponents = {
            svg: undefined,
            columnTree: undefined,
            rowTree: undefined
        };

        this.title = title;

        this.tooltip = undefined;
        this.toolbar = undefined;
    }

    /**
     * Create the toolbar panel
     * @param domId {String} the toolbar's dom ID
     * @param tooltip {Tooltip}
     * @returns {Toolbar}
     */

    createToolbar(domId, tooltip){
        this.toolbar = new Toolbar(domId, tooltip);
        return this.toolbar;
    }

     /**
     * Create the tooltip object
     * @param domId {String} the tooltip's dom ID
     * @returns {Tooltip}
     */
    createTooltip(domId){
        this.tooltip = new Tooltip(domId);
        select(`#${domId}`).classed('heatmap-tooltip', true);
        return this.tooltip;
    }

    /**
     * Render the dendrograms and corresponding heatmap
     * @param domId {String} the parent DOM id of the SVG
     * @param svgId {String} of the SVG
     * @param showColumnTree {Boolean} render the column dendrogram
     * @param showRowTree {Boolean} render the row dendrogram
     * @param legendPos {Enum} where to place the color legend: bottom, top
     * @param ticks {Integer} number of bins of the color legend
     */
    render(domId, svgId, showColumnTree=true, showRowTree=true, legendPos="top", ticks=5){
        this._updateConfig(legendPos);
        this.visualComponents.svg = createSvg(domId, this.config.w, this.config.h, this.config.margin, svgId);

        let xlist = undefined,
            ylist = undefined;

        if (showColumnTree && this.objects.columnTree!==undefined){
            this.visualComponents.columnTree = this._renderTree("column", this.objects.columnTree, this.config.panels.top);
            xlist = this.objects.columnTree.xScale.domain();
        }
        if (showRowTree && this.objects.rowTree !== undefined){
            this.visualComponents.rowTree = this._renderTree("row", this.objects.rowTree, this.config.panels.left);
            ylist = this.objects.rowTree.yScale.domain();
        }

        if (this.title != '') {
            console.log(this.title);
            select(`#${domId}-svg`).append('text')
                .attr('x', 0)
                .attr('y', 20)
                .text(this.title);
        }

        this._renderHeatmap(this.objects.heatmap, xlist, ylist, ticks);
    }

    /**
     * Render a newick tree
     * @param direction {enum} column or row
     * @param tree {Dendrogram} a Dendrogram object
     * @param config {Object} a panel config with attributes: x, y, width and height
     * @private
     */
    _renderTree(direction, tree, config){
        let svg = this.visualComponents.svg;
        const labelClass = direction=="row"?".exp-map-ylabel":".exp-map-xlabel";

        const tooltip = this.visualComponents.tooltip;
        const g = svg.append("g")
            .attr("id", config.id)
            .attr("transform", `translate(${config.x}, ${config.y})`);
        tree.draw(g, config.w, config.h);

        const mouseout = function(){
            select(this)
                .attr("r", 2)
                .attr("fill", "#333");
            svg.selectAll(labelClass).classed("highlighted", false);
            svg.selectAll(".leaf-color").classed("highlighted", false);
        };

        const mouseover = function(d){
            select(this)
                .attr("r", 6)
                .attr("fill", "red");
            let ids = d.leaves().map((node)=>node.data.name);
            svg.selectAll(labelClass)
                .filter((label)=>ids.includes(label))
                .classed("highlighted", true);
            svg.selectAll(".leaf-color")
                .filter((label)=>ids.includes(label))
                .classed("highlighted", true);
        };

        g.selectAll(".dendrogram-node")
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);
        return g;
    }

    /**
     * Render the heatmap and color legend
     * @param heatmap {Heatmap} a Heatmap object
     * @param xList {List} a list of x labels
     * @param yList {List} a list of y labels
     * @param ticks {Integer} the number of bins in the color legend
     * @private
     */
    _renderHeatmap(heatmap, xList, yList, ticks=5){
        let dom = this.visualComponents.svg;
        const config = this.config.panels.main;
        const g = dom.append("g")
            .attr("id", config.id)
            .attr("transform", `translate(${config.x}, ${config.y})`);
        heatmap.redraw(g, xList, yList, {w: config.w, h: config.h});
        heatmap.drawColorLegend(dom, this.config.panels.legend, ticks);
    }

    /**
     * Adjust the layout dimensions based on the actual data
     * @param legendPos {String} bottom or top
     * @private
     */
    _updateConfig(legendPos){
        const rows = this.objects.rowTree===undefined?1:this.objects.rowTree.leaves.length;

        // updates the left panel's height based on the data
        this.config.panels.left.h = this.config.cell.h * rows<20?20:this.config.cell.h * rows;
        this.config.h += this.config.panels.left.h;
        this.config.panels.main.h = this.config.panels.left.h;
        if(legendPos=="bottom") this.config.panels.legend.y += this.config.panels.main.h + this.config.panels.main.x + 50;


    }
}