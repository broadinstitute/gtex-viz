var bubbleMapBrush = function(svgId, source, target, config){
    // this is a brush that moves along the x-axis

    var self = this;
    var width, height; // canvas width
    var brush;

    this.xlist;

    this.svg;
    this.actions = [];
    this.scale = source.scale; // this is the mini scale

    this.defaultRange = function(){
        return this.scale.X.domain().slice(0, config.zoomN)
    };

    this.update = function(scale){
        if(typeof scale !== 'undefined') this.create(scale); // keep the brush range as is
        else this.create()
    };

    this.addEvent = function(callback){
        this.actions.push(callback);
    };

    this.create = function(scale) {
        if(typeof scale !== 'undefined'){
            this.scale = scale;
        }
        width = source.canvas.attr('width'); // canvas width
        height = source.canvas.attr('height'); // canvas height
        this.xlist = this.defaultRange();

        var head = this.xlist[0];
        var tail = this.xlist[this.xlist.length - 1];
        var ext = [self.scale.X(head), self.scale.X(tail)];
        var _clearSvg = function () {
            d3.select('#' + svgId).remove(); // make sure to drop existing brush}

        };
        _clearSvg();
        var style = {
                border: '1px solid #eee',
                position: 'absolute',
                'z-index': '500'
            };
        self.svg = bubbleMapUtil.createSvg(config.bbMapCanvasDiv, {width: width, height: height}, svgId, style);
        //// TODO: review
        brush = bubbleMapUtil.createBrush(self.scale, ext, self.svg, height);
        // brush event
        brush.on('brush', function () {
            self.brushEvent(brush.extent());
        });

        // update target
        moveTarget();

    };

    this.brushEvent = function (ext) { // ext is a list, start and stop positions of the brush range

        if (typeof ext == 'undefined') ext = brush.extent();
        if (ext[0] - ext[1] == 0) { // this handles the single clicking event of the brush on canvas
            var winSize = config.zoomN / 2;
            var dist = self.scale.X.rangeBand() * winSize;
            ext = [ext[0] - dist < 0 ? 0 : ext[0] - dist, (ext[0] + dist) > width ? width : (ext[0] + dist)]; // center the brush around the clicked position
            brush.extent(ext); // force updates the brush's extent
            self.svg.select('#bbrush').call(brush); // recreate the brush with the new extent
        }

        this.xlist = self.scale.X.domain().filter(function (d) {
            return (ext[0] <= self.scale.X(d)) && (ext[1] >= self.scale.X(d))
        });

        // check target's SVG width
        var width = this.xlist.length * target.getCellSize() + target.getPadding().left;
        if (width > parseInt(target.svg.attr('width'))) {
            target.svg.attr('width', width); // adjust the svg width according to the brush
        }

        moveTarget();
    };

    function moveTarget() {

        var zoomId = config.id + 'Zoom'; // the same as target.zoomGroup?

        var _brushRange = function(){
            d3.select('#'+zoomId).selectAll('.dcircle').classed('hide', true);
            d3.select('#'+zoomId).selectAll('.xlab').classed('hide', true);
            d3.select('#'+zoomId).selectAll('.xMarker').classed('hide',true);
            d3.select('#'+zoomId).selectAll('.ldbox').classed('hide',true);
            d3.select('#'+zoomId).selectAll('.ldline').classed('hide',true);

            self.xlist.forEach(function(d){
                var col = '[col="'+d+'"]';
                d3.select('#'+ zoomId).selectAll('circle'+col).classed('hide', false);
                d3.select('#'+ zoomId).selectAll('rect'+col).classed('hide', false);
                d3.select('#'+ zoomId).selectAll('.xlab'+col).classed('hide', false);
                d3.select('#'+zoomId).selectAll('.xMarker'+col).classed('hide',false);
                d3.select('#'+zoomId).selectAll('.ldbox'+col).classed('hide',false);
                d3.select('#'+zoomId).selectAll('.ldline'+col).classed('hide',false);
            });
        };
        _brushRange();
        var x = (-target.scale.X(self.xlist[0]) + target.scale.X.rangeBand()).toFixed(3);
        var _move = function(d){
            d.attr({'transform': 'translate('+ x +',0)'});
        };
        target.zoomGroup.selectAll('.dcircle').call(_move);
        // update the <g> of xlabels
        d3.select('#' + zoomId + ' ' + '#xLabel' ).call(_move);
        d3.select('#' + zoomId + ' ' + '#xMarkerGroup').call(_move);
        d3.selectAll('#' + zoomId + ' ' + '.additionalRow').call(_move);

        // other customized brush events
        self.actions.forEach(function(action){
            action(x);
        });
    }
};

