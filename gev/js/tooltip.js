/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var toolTip = function(svg, id){
    this.svg = svg;
    this.id = id;
    var self = this;

    this.show = function(info, x, y){
        move(x, y);
        $('#'+self.id).show();
        $('#'+self.id).html(info); // TODO: get rid of jquery style

        d3.select("#" + self.id)
            .transition()
            .duration(200)
            .style('opacity',1.0); // a div element
    };
    this.hide = function(){
        move();
        d3.select("#" + self.id)
            .transition()
            .duration(50)
            .style('opacity',0.0); // a div element
    };
    var move = function(x,y){
        if(x === undefined){
            x = d3.event.pageX; // TODO: get rid of the hard-coded adjustment
            y = d3.event.pageY;
        }
        x = x + 15;
        y = y - 50;
        $('#'+self.id).css({left:x+"px", top:y+"px"});
    };
};

