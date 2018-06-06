
/*
This class defines a gene model (or isoform), rendering the exons and junctions of a given gene. The model is rendered based on
genomic positions, regardless of the strand and transcriptional direction.

TODO: extract out the simple isoform structure rendering?
 */

import {curveCardinal, line} from "d3-shape";
import {max, sum} from "d3-array";
import {scaleLinear} from "d3-scale";

export default class GeneModel {
    /**
     * constructor
     * @param gene {Object} with attributes: strand, transcriptId, geneSymbol
     * @param exons {List} of exon objects with attributes: chrom, chromStart, chromEnd, length, exonNumber, exonId
     * @param exonsCurated {List} of exon objects in the final gene model. This is pretty specific to GTEx. If this list isn't available for your data, then just pass in the same exon list again.
     * @param junctions {List} of junction objects with attributes: chrom, chromStart, chromEnd, junctionId
     * @param isIsoform {Boolean}
     */

    /** NOTE: the exonNumber in exons & exonsCurated don't refer to the same exons (at least this is the case in GTEx)
     *  To ensure correct exon mapping of the curated gene model to the original model, here we use genomic position.
     */
    constructor (gene, exons, exonsCurated, junctions, isIsoform=false){
        this.gene = gene;
        this.exons = exons;
        if (this.gene.strand == "+") this.exons.sort((a, b)=>{return Number(a.exonNumber)-Number(b.exonNumber)});
        else this.exons.sort((a, b)=>{return Number(b.exonNumber)-Number(a.exonNumber)});
        this.exonsCurated = exonsCurated.sort((a, b)=>{return Number(a.exonNumber)-Number(b.exonNumber)});
        this.junctions = junctions.sort((a,b) => {
            if (a.junctionId < b.junctionId) return -1;
            if (a.junctionId > b.junctionId) return 1;
            return 0;
        }); // sorted by junction ID
        this.isIsoform = isIsoform;

        // hard-coded for now
        this.intronLength = 0; // fixed fake intron length in base pairs
        this.minExonWidth = 5; // minimum exon width in pixels
    }

    changeTextlabel(dom, label){
        dom.selectAll("#modelInfo").text(label);
    }

    /**
     *
     * @param dom {Object} of D3
     * @param jdata {List} of junction expression objects
     * @param edata {List} of exon expression objects
     * @param jscale {D3 scale} of colors of junction data
     * @param escale {D3 scale} of colors of exon data
     */
    addData(dom, jdata, edata, jscale, escale){
        dom.selectAll(".junc").style("fill", (d) => {
            const v = jdata.filter((z)=>z.junctionId==d.junctionId)[0];
            const jcolor = jscale(v.value);
            dom.selectAll(".junc-curve").filter((`.junc${d.junctionId}`)).style("stroke", jcolor);
            return jcolor;
        });
        dom.selectAll(".exon-curated").style("fill", (d) => {
            const v = edata.filter((z)=>z.exonId==d.exonId)[0];
            if (v === undefined) throw `${d.exonId} has no data`;
            const ecolor = escale(v.value);
            return ecolor;
        });
    }

    /**
     * render the SVG of the gene model
     * @param dom: an SVG dom object
     * @param config

     */
    render(dom, config) {
        this.setXscale(config.w);

        /* Note: exon.x, exon.w are in pixels for visual rendering */
        /* Note: exon.length is in base pairs */
        // calculating x and w for each exon
        const exonY = config.h/2; // TODO: remove hard-coded values
        this.exons.forEach((d, i) => {
            if (i == 0) d.x = 0;
            if(i > 0) d.x = this.exons[i-1].x + this.exons[i-1].w + this.xScale(this.intronLength);
            d.w = this.xScale(d.length)<this.minExonWidth?this.minExonWidth:this.xScale(d.length);
        });

        // calculaing x and w for each curated exon
        this.exonsCurated.forEach((d, i) => {
            // map each curated exon to the original gene model--find the original exon
            d.oriExon = this._findExon(d.chromStart)||this._findExon(d.chromEnd);
            if (d.oriExon === undefined) {
                console.warn(`${this.gene.transcriptId}-${d.exonId} can't map to full gene model`);
                return; // ignore unmappable exons, this happens at times
            }
            if (Number(d.oriExon.chromStart) == Number(d.chromStart)) d.x = d.oriExon.x;
            else{
                // this exon doesn't start from the oriExon start pos
                const dist = Number(d.chromStart) - Number(d.oriExon.chromStart) + 1;
                d.x = d.oriExon.x + this.xScale(dist);
            }
            if (d.length === undefined) d.length = Number(d.chromEnd) - Number(d.chromStart) + 1;
            d.w = this.xScale(d.length)<this.minExonWidth?this.minExonWidth:this.xScale(d.length);

        });

        // evaluates whether it's an isoform or gene model
        if(!this.isIsoform){
            // NOTE: the rendering order is important. Do not casually change it.
            // if this is a gene model, not an isoform
            // calculating x for each junction
            this.junctions.forEach((d) => {
                d.startExon = this._findExon(d.chromStart);
                d.endExon = this._findExon(d.chromEnd);
                d.displayName = d.junctionId;
                if (d.startExon === undefined || d.endExon === undefined) {
                    // TODO: figure out why some junctions can't map to the gene model
                    // check unfiltered gene model
                    // Temporary solution: set d.filtered to true and ignore rendering this junction
                    d.filtered = true;
                    console.warn("Can't map junction to exons " + d.junctionId); // why the junction can't map
                }
                else {
                    d.displayName = `Exon ${d.startExon.exonNumber} - ${d.endExon.exonNumber}`;
                    if (d.startExon.exonNumber == d.endExon.exonNumber) {
                        console.warn(d.junctionId + " is in Exon: " +d.startExon.chromStart + " - " + d.startExon.chromEnd );
                    } // what is happening

                    d.filtered = false;
                    const dist = Number(d.chromStart) - Number(d.startExon.chromStart) + 1;
                    const dist2 = Number(d.chromEnd) - Number(d.endExon.chromStart) + 1;

                    d.startX = d.startExon.x + this.xScale(dist);
                    d.endX = d.endExon.x + this.xScale(dist2);
                    d.cx = d.startX + (d.endX - d.startX + 1)/2; // junction is rendered at the midpoint between startX and endX
                    d.cy = exonY - 15 * ( Math.abs(Number(d.endExon.exonNumber) - Number(d.startExon.exonNumber)) + 0.5 );
                    if (d.cy < 0) d.cy = 0;
                }
            });

            // handling edge case: overlapping junctions, add jitter
            // a.reduce((r,k)=>{r[k]=1+r[k]||1;return r},{})
            const counts = this.junctions.reduce((r,d)=>{r[d.displayName]=1+r[d.displayName]||1;return r},{});
            this.junctions.forEach((d) => {
                // jitter
                if(counts[d.displayName] > 1){ // overlapping junctions
                    // d.cx += Math.random()*20;
                    d.cy -= Math.random()*15;
                }
            });

            /***** render junctions */
            const curve = line()
                .x((d) => d.x)
                .y((d) => d.y)
                .curve(curveCardinal);

            this.junctions.filter((d) => !d.filtered)
                    .forEach((d, i) => {
                        dom.append("path")
                        .datum([{x:d.startX, y:exonY}, {x:d.cx, y:d.cy}, {x:d.endX, y:exonY}]) // the input points to draw the curve
                        .attr("class", `junc-curve junc${d.junctionId}`)
                        .attr("d", curve)
                        .style("stroke", "#92bcc9");
                    });


            const juncDots = dom.selectAll(".junc")
                .data(this.junctions.filter((d)=>!d.filtered));

            // updating elements
            juncDots.attr("cx", (d) => d.cx);
            juncDots.attr("cy", (d) => d.cy); // TODO: remove hard-coded values

            // entering new elements
            juncDots.enter().append("circle")
                .attr("class", (d) => `junc junc${d.junctionId}`)
                .attr("cx", (d) => d.cx)
                .attr("cy", (d) => d.cy)
                .merge(juncDots)
                .attr("r", 4)
                .style("fill", "rgb(86, 98, 107)");

            /***** rendering full gene model exons */
            const exonRects = dom.selectAll(".exon")
            .data(this.exons);

            // updating elements
            exonRects.attr("x", (d) => d.x);
            exonRects.attr("y", exonY);

            // entering new elements
            exonRects.enter().append("rect")
                .attr("class", (d)=>`exon exon${d.exonNumber}`)
                .attr("y", exonY)
                .attr("rx", 2)
                .attr('ry', 2)
                .attr("width", (d) => d.w)
                .attr("height", 15) // TODO: remove hard-coded values
                .attr("x", (d) => d.x)
                .merge(exonRects)
                .style("cursor", "default");

            // model info text label
            dom.append("text")
                .attr("id", "modelInfo") // TODO: no hard-coded value
                .style("text-anchor", "end")
                .attr("x", this.xScale(0))
                .attr("y", exonY-10)
                .style("font-size", 12)
                .text("Gene Model");
        }
        else{
            // if this is an isoform, render the intron line
            const intronLine = dom.append("line")
                .attr("x1", this.exonsCurated[0].x)
                .attr("x2", this.exonsCurated[this.exonsCurated.length-1].x)
                .attr("y1", exonY + (15/2))
                .attr("y2", exonY + (15/2))
                .classed("intron", true);
        }

        /***** rendering curated exons or isoform exons */
        const exonRects2 = dom.selectAll(".exon-curated")
            .data(this.exonsCurated);

        // updating elements
        exonRects2.attr("x", (d) => d.x);
        exonRects2.attr("y", exonY);

        // entering new elements
        exonRects2.enter().append("rect")
            .attr("class", (d)=>`exon-curated`)
            .attr("y", exonY)
            .attr("width", (d) => d.w)
            .attr("height", 15) // TODO: remove hard-coded values
            .attr("x", (d) => d.x)
            .merge(exonRects2)
            .style("fill", "#eee")
            .style("cursor", "default");

        /***** rendering text labels */
        if (config.labelOn == 'left' || config.labelOn == 'both'){
            dom.append("text")
            .attr("id", "modelLabel") // TODO: no hard-coded value
            .style("text-anchor", "end")
            .attr("x", this.xScale.range()[0] - 5)
            .attr("y", exonY + 7.5)
            .style("font-size", 9)
            .text(this.gene.transcriptId===undefined?`${this.gene.geneSymbol}`:this.gene.transcriptId);


        }
        if (config.labelOn == 'right' || config.labelOn == 'both'){
            dom.append("text")
            .attr("id", "modelLabelRight") // TODO: no hard-coded value
            .style("text-anchor", "start")
            .attr("x", this.xScale.range()[1] + 5)
            .attr("y", exonY + 7.5)
            .style("font-size", 9)
            .text(this.gene.transcriptId===undefined?`${this.gene.geneSymbol}`:this.gene.transcriptId);

        }
    }

    setXscale(w){
        // concept explained:
        // assuming the canvas width is fixed
        // the task is how to render all exons + fixed-width introns within the canvas
        // first find the largest exon,
        // then set the x scale of the canvas to accommodate max(exon length)*exon counts,
        // this ensures that there's always space for rendering introns
        // the fixed intron width is calculated as such:
        // ((max(exon length) * exon counts) - total exon length)/(exon counts - 1)

        // use a linear scale to
        this.exons.forEach((d) => {d.length = Number(d.chromEnd) - Number(d.chromStart) + 1});
        const maxExonLength = max(this.exons, (d)=>d.length);

        const domain = [0, maxExonLength*this.exons.length];
        const range = [0, w];
        this.xScale = scaleLinear()
            .domain(domain)
            .range(range);

        // fixed intron width
        const minLength = this.xScale.invert(this.minExonWidth); // the minimum exon length that maps to minimum exon width (pixels) using xScale
        const totalExonLength = sum(this.exons, (d)=>d.length>minLength?d.length:minLength); // if an exon is shorter than min length, use min length
        this.intronLength = (maxExonLength * this.exons.length - totalExonLength)/(this.exons.length-1); // caluclate the fixed intron length
    }

    /**
     * For a given position, find the exon
     * @param pos {Integer}: a genomic position
     * @private
     */
    _findExon(pos){
        pos = Number(pos);
        const results = this.exons.filter((d) => {return Number(d.chromStart) - 1 <= pos && Number(d.chromEnd) + 1 >= pos});
        if (results.length == 1) return results[0];
        else if(results.length == 0) {
            console.warn("No exon found for: " + pos);
            return undefined;
        }
        else {
            console.warn("More than one exons found for: " + pos);
            return undefined;
        }

    }

}