
/*
This class is a viewer of transcriptional isoforms, each is render as a track
 */

import GeneModel from "./GeneModel";
import {select, selectAll} from "d3-selection";
import {scaleBand} from "d3-scale";

export default class IsoformTrackViewer {
    constructor(isoforms, isoformExons, modelExons, config){
        this.isoforms = isoforms;
        this.isoformExons = isoformExons;
        this.modelExons = modelExons;
        this.visualDom = undefined;
        this.config = config;
    }

    sortTracks(ylist){
        console.log(ylist);
        this.setYscale(this.config.h, ylist);
        this.render(true);
    }

    render(redraw=false, dom=undefined, duration=2000){
        if (dom === undefined && this.visualDom === undefined) throw "Fatal Error: must provide a dom element";
        if (dom === undefined) dom = this.visualDom;
        else this.visualDom = dom;

        if(this.yScale===undefined) this.setYscale(this.config.h);

        const isoTracks = dom.selectAll(".isotrack")
            .data(this.isoforms.map((d)=>d.transcriptId));

        // update old isoform tracks, if any
        isoTracks.transition()
            .duration(duration)
            .attr("transform", (d)=>{ return `translate(0, ${this.yScale(d)})`});

        // update new tracks
        isoTracks.enter()
            .append("g")
            .attr("id", (d)=>(d.replace(".", "_")))
            .attr("class", "isotrack")
            .attr("transform", (d)=>{ return `translate(0, 0)`})

            // .merge(isoTracks)
            .transition()
            .duration(duration/2)
            .attr("transform", (d)=>{ return `translate(0, ${this.yScale(d)})`});

        if (redraw) return;

        this._renderModels(this.config.w);

    }

    _renderModels(w){
        this.isoforms.forEach((isoform) => {
            const model = new GeneModel(isoform, this.modelExons, this.isoformExons[isoform.transcriptId], [], true);
            const isoformG = select(`#${isoform.transcriptId.replace(".", "_")}`);
            model.render(isoformG, {w:w, h: this.yScale.bandwidth()});
        });

    }

    setYscale(h, ylist=undefined){
        if (ylist === undefined) ylist = this.isoforms.map((d)=>d.transcriptId);
        this.yScale = scaleBand()
            .domain(ylist)
            .range([0, h])
            .padding(.05);
    }

}