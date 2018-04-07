
/*
This class is a viewer of transcriptional isoforms, each is render as a track
 */

import GeneModel from "./GeneModel";
import {select, selectAll} from "d3-selection";
import {scaleBand} from "d3-scale";

export default class IsoformTrackViewer {
    constructor(isoforms, isoformExons, modelExons){
        this.isoforms = isoforms;
        this.isoformExons = isoformExons;
        this.modelExons = modelExons;
        this.visualDom = undefined;
    }

    render(dom=undefined, config={w:1000, h:500}, redraw=false, duration=2000){
        if (dom === undefined) dom = this.visualDom;
        else this.visualDom = dom;

        this.setYscale(config.h);
        const isoTracks = dom.selectAll(".isotrack")
            .data(this.isoforms.map((d)=>d.transcriptId));

        // update old isoform tracks, if any
        isoTracks.attr("transform", (d)=>{ return `translate(0, ${this.yScale(d)})`});

        // update new tracks
        isoTracks.enter()
            .append("g")
            .attr("id", (d)=>(d.replace(".", "_")))
            .merge(isoTracks)
            .transition()
            .duration(duration)
            .attr("transform", (d)=>{ return `translate(0, ${this.yScale(d)})`});

        if (redraw) return;

        this._renderModels(config.w);

    }

    _renderModels(w){
        this.isoforms.forEach((isoform) => {
            const model = new GeneModel(isoform, this.modelExons, this.isoformExons[isoform.transcriptId], [], true);
            const isoformG = select(`#${isoform.transcriptId.replace(".", "_")}`);
            model.render(isoformG, {w:w, h: this.yScale.bandwidth()});
        });

    }

    setYscale(h){
        this.yScale = scaleBand()
            .domain(this.isoforms.map((d)=>d.transcriptId))
            .range([0, h])
            .padding(.05);
    }

}