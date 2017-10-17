import {select, event} from "d3-selection";
import {transition} from "d3-transition";
export default class Tooltip {
    constructor(id, verbose=true, offsetX=20, offsetY=-80, duration=200){
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
        select("#" + this.id)
            .style("display", "inline")
            .transition()
            .duration(this.duration)
            .style("opacity", 1.0)

    }

    hide() {
        select("#" + this.id)
            .transition()
            .duration(this.duration)
            .style("opacity", 0.0);
        this.move(0,0);
    }

    move(x = event.pageX, y = event.pageY) {
        if (this.verbose) {
            console.log(x);
            console.log(y);
        }
        x = x + this.offsetX; // TODO: get rid of the hard-coded adjustment
        y = y + this.offsetY;
        select('#'+this.id)
            .style("left", x + "px")
            .style("top", y + "px")
    }

    edit(info) {
        select("#" + this.id)
            .html(info)
    }
}

