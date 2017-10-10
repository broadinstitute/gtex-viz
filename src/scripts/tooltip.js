class Tooltip {
    constructor(id, offsetX=20, offsetY=-80, duration=200, verbose=true){
        this.id = id;
        this.verbose = verbose;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.duration = duration;
    }

    show(info) {
        if(this.verbose) console.log(info);
        this.edit(info);
        this.move();
        d3.select("#" + this.id)
            .style("display", "inline")
            .transition()
            .duration(this.duration)
            .style("opacity", 1.0)

    }

    hide() {
        d3.select("#" + this.id)
            .transition()
            .duration(this.duration)
            .style("opacity", 0.0);
        this.move(0,0);
    }

    move(x = d3.event.pageX, y = d3.event.pageY) {
        if (this.verbose) {
            console.log(x);
            console.log(y);
        }
        x = x + this.offsetX; // TODO: get rid of the hard-coded adjustment
        y = y + this.offsetY;
        d3.select('#'+this.id)
            .style("left", x + "px")
            .style("top", y + "px")
    }

    edit(info) {
        d3.select("#" + this.id)
            .html(info)
    }
}

