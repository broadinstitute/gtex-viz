import * as d4 from "d3"

export default class GeneModel {
    constructor (gene, exons, junctions){
        this.gene = gene;
        this.exons = exons.sort((a, b)=>{return Number(a.exonNumber)-Number(b.exonNumber)});
        this.junctions = junctions;

        // hard-coded for now
        this.intronWidth = 0; // fixed fake intron width

    }

    render(dom, dimensions={w: 1200, h: 100}) {
        this.setXscale(dimensions.w);

        // rendering exons
        const exonRects = dom.selectAll(".exon")
            .data(this.exons);

        // update elements
        exonRects.attr("x", (d, i) => {
            d.x = this.xScale(d.length)<5?5:this.xScale(d.length);
            if (i>0) {
                d.x += this.exons[i-1].x + this.xScale(this.intronWidth);
            }
            return d.x;
        });
        exonRects.attr("y", 25);

        // enter new elements
        exonRects.enter().append("rect")
            .attr("y", 50)
            .attr("rx", 2)
            .attr('ry', 2)
            .attr("width", (d) => this.xScale(d.length))
            .attr("height", 50)
            .style("fill", "#eee")
            .attr("x", (d, i) => {
                d.x = this.xScale(d.length)<5?5:this.xScale(d.length);
                if (i>0) {
                    d.x += this.exons[i-1].x + this.xScale(this.intronWidth);
                }
                return d.x;
            })

            .merge(exonRects)
            .style("fill", "#ddd");


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
        const totalExonLength = d4.sum(this.exons, (d)=>d.length);
        this.intronWidth = (maxExonLength * this.exons.length - totalExonLength)/(this.exons.length-1)
    }
}