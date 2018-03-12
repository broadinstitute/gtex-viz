import * as d4 from "d3"

/*
This class defines a gene model, rendering the exons and junctions of a given gene. The model is rendered based on
genomic positions, regardless of the strand and transcriptional direction.
 */

export default class GeneModel {
    /**
     * constructor
     * @param gene {Object} with attributes: chrom, chromEnd, chromStart, strand, geneName, gencodeId
     * @param exons {List} of exon objects with attributes: chrom, chromStart, chromEnd, length, exonNumber, exonId
     * @param junctions {List} of junction objects with attributes: chrom, chromStart, chromEnd, junctionId
     */
    constructor (gene, exons, junctions){
        this.gene = gene;
        this.exons = exons.sort((a, b)=>{return Number(a.exonNumber)-Number(b.exonNumber)});
        this.junctions = junctions;

        // hard-coded for now
        this.intronLength = 0; // fixed fake intron length in base pairs
        this.minExonWidth = 5; // minimum exon width in pixels

    }

    /**
     * render the SVG of the gene model
     * @param dom: an SVG dom object
     * @param dimensions
     */
    render(dom, dimensions={w: 1200, h: 100}) {
        this.setXscale(dimensions.w);

        // calculating x and w for each exon
        const exonY = 50; // TODO: remove hard-coded values
        this.exons.forEach((d, i) => {
            if (i == 0) d.x = 0;
            if(i > 0) d.x = this.exons[i-1].x + this.exons[i-1].w + this.xScale(this.intronLength);

            d.w = this.xScale(d.length)<this.minExonWidth?this.minExonWidth:this.xScale(d.length);
        });

        // calculating x for each junction
        this.junctions.forEach((d) => {
            const startExon = this._findExon(d.chromStart),
                endExon = this._findExon(d.chromEnd);
            if (startExon === undefined || endExon === undefined) {
                // TODO: figure out why some junctions can't map to the gene model
                // check unfiltered gene model
                // Temporary solution: set d.filtered to true and ignore rendering this junction
                d.filtered = true;
            }
            else {
                d.filtered = false;
                d.startX = startExon.x + startExon.w;
                d.endX = endExon.x;
                d.cx = d.startX + (d.endX - d.startX + 1)/2; // junction is rendered at the midpoint between startX and endX
                d.cy = exonY - 5 * Math.abs(Number(endExon.exonNumber) - Number(startExon.exonNumber) + 1);
                if (d.cy < 5) d.cy = 5;
            }

        });

        // rendering exons
        const exonRects = dom.selectAll(".exon")
            .data(this.exons);

        // updating elements
        exonRects.attr("x", (d) => d.x);
        exonRects.attr("y", exonY);

        // entering new elements
        exonRects.enter().append("rect")
            .attr("y", exonY)
            .attr("rx", 2)
            .attr('ry', 2)
            .attr("width", (d) => d.w)
            .attr("height", 20) // TODO: remove hard-coded values
            .style("fill", "#eee")
            .attr("x", (d) => d.x)
            .merge(exonRects)
            // .style("fill", "#6ca8b9");
            .style("fill", "#889d99");

        // render junctions
        const curve = d4.line()
            .x((d) => d.x)
            .y((d) => d.y)
            .curve(d4.curveCardinal);

        this.junctions.filter((d) => !d.filtered)
                .forEach((d, i) => {
                    dom.append("path")
                    .datum([{x:d.startX, y:exonY}, {x:d.cx, y:d.cy}, {x:d.endX, y:exonY}]) // the input points to draw the curve
                    .attr("class", "line")
                    .style("stroke", "#DDDDDD")
                    .style("fill", "none")
                    .attr("d", curve);

                });


        const juncDots = dom.selectAll(".junc")
            .data(this.junctions.filter((d)=>!d.filtered));

        // updating elements
        juncDots.attr("cx", (d) => d.cx);
        juncDots.attr("cy", (d) => d.cy); // TODO: remove hard-coded values

        // entering new elements
        juncDots.enter().append("circle")
            .attr("cx", (d) => d.cx)
            .attr("cy", (d) => d.cy)
            .attr("r", 1)
            .style("fill", "#eee")
            .merge(juncDots)
            .attr("r", 3)
            .style("fill", "rgb(239, 59, 44)")

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
        this.exons.forEach((d) => {d.length = d.chromEnd - d.chromStart + 1});
        const maxExonLength = d4.max(this.exons, (d)=>d.length);

        const domain = [0, maxExonLength*this.exons.length];
        const range = [0, w];
        this.xScale = d4.scaleLinear()
            .domain(domain)
            .range(range);

        // fixed intron width
        const minLength = this.xScale.invert(this.minExonWidth); // the minimum exon length that maps to minimum exon width (pixels) using xScale
        const totalExonLength = d4.sum(this.exons, (d)=>d.length>minLength?d.length:minLength); // if an exon is shorter than min length, use min length
        this.intronLength = (maxExonLength * this.exons.length - totalExonLength)/(this.exons.length-1); // caluclate the fixed intron length
    }

    /**
     * For a given position, find the overlapping exon
     * @param pos {Integer}: a genomic position
     * @private
     */
    _findExon(pos){
        pos = Number(pos);
        const results = this.exons.filter((d) => {return d.chromStart - 1 <= pos && d.chromEnd + 1 >= pos});
        if (results.length == 1) return results[0];
        else {
            console.warn("Find Exon Error for position: " + pos);
            return undefined;
        }
    }
}