import {heatmapConfig} from "./DendroHeatmapConfig";
import Dendrogram from "./Dendrogram";
import {createSvg} from "./utils";
import Tooltip from "./Tooltip";
import * as d4 from "d3";

export default class DendroHeatmap {

    constructor(columnTree, rowTree, heatmapData, config=heatmapConfig){
        this.config = config;
        this.tree = {
            col: new Dendrogram(columnTree, 'v'),
            row: new Dendrogram(rowTree, 'h')
        };
        this.heatmap = heatmapData;
        this.visualComponents = {
            tooltip: new Tooltip("tooltip", false)
        }
    }

    render(domId){
        this._setDimensions();

        let svg = createSvg(domId, this.config.width, this.config.height, this.config.margin);
        this.renderColumnTree(svg);
    }

    renderColumnTree(svg){
        const tree = this.tree.col;
        const config = this.config.panels.top;
        const tooltip = this.visualComponents.tooltip;
        const g = svg.append("g")
            .attr('id', 'columnTree')
            .attr('transform', `translate(${config.x}, ${config.y})`);
        tree.draw(g, config.width, config.height);

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
        g.selectAll('.node')
            .on('mouseover', mouseover)
            .on('mouseout', mouseout);

    }

    _setDimensions(){
        const columns = this.tree.col.leaves.length;
        const rows = this.tree.row.leaves.length;
        // and what else?

    }
}