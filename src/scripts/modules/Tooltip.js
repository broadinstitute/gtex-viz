import * as d4 from "d3";

export default class Tooltip {
    constructor(id, verbose=true, offsetX=30, offsetY=-40, duration=200){
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
        d4.select("#" + this.id)
            .style("display", "inline")
            .transition()
            .duration(this.duration)
            .style("opacity", 1.0)

    }

    hide() {
        d4.select("#" + this.id)
            .transition()
            .duration(this.duration)
            .style("opacity", 0.0);
        // this.move(0,0);
    }

    move(x = d4.event.pageX, y = d4.event.pageY) {
        if (this.verbose) {
            console.log(x);
            console.log(y);
        }
        x = x + this.offsetX; // TODO: get rid of the hard-coded adjustment
        y = (y + this.offsetY)<0?10:y+this.offsetY;
        d4.select('#'+this.id)
            .style("left", x + "px")
            .style("top", y + "px")
    }

    edit(info) {
        d4.select("#" + this.id)
            .html(info)
    }
}

