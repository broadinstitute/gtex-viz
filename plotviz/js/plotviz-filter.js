/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function Filter (svg, id, metadata, that) {
        var _svg = svg;
        var _id = id + "test";
        var _panel = null;
        var _mouseclick = null;
        var _mousemove = null;
        var _data = null;
        var _filterButton = null;
        var _plot = that;

        var _available = null;
        var _type = null;
        var _priorType = null;
        var _current = [];

        this.mousemove = function (func) {
            if (func) {
                _mousemove = func;
                return this;
            } else {
                return _mousemove;
            }
        };

        this.mouseclick = function (func) {
            if (func) {
                _mouseclick = func;
                return this;
            } else {
                return _mouseclick;
            }
        };

        panelCreate = function() {
           _panel = d3.select('#plotviz-controlDiv')
            .append('div')
            .attr('class', 'filter-context-menu')
            .append('ul')
            .attr('class','checkbox-grid');
        }

        panelDestroy = function() {
          d3.select('.filter-context-menu').style('display','none')
          d3.select('.filter-context-menu').remove('');
          _filterButton = null;
          panelCreate();
          d3.select('.footer').style({'top':'70px'});
        }

        panelCreate();

        xcopy = function(x) {
          return JSON.parse(JSON.stringify(x));
        }

        clickFilterOff = function() {
          var e = document.createEvent('UIEvents');
          e.initUIEvent('click', true, true, window, 1);
          d3.select('#filter-buttons .button-options .btn-inactive').node().dispatchEvent(e);
        }


        this.render = function (data, x, y, config) {
            data.filter = data.data.map(function(d) { return d.key; });

            if ('filteredState' in config && config.filter === 'off') {
                delete config.filteredState;
                _current = xcopy(data.filter); // reset current
                _plot.config(config);
            }

            if('resetFilter' in config && config.filter === 'off' ) {
                delete config.resetFilter;
                _data = xcopy(data);
                _plot.dataCache(data); // set the dataCache
                _plot.config(config);
            }

            var controlType = d3.select('#format-buttons .button-options .btn-active').text()

            // change in data format
            if(_type === null) {
                _type = xcopy(controlType);
                _available = xcopy(data.filter);
                _current = xcopy(data.filter);
                _priorType = null

                _data = xcopy(data);
                _plot.dataCache(data); // set the dataCache
            }

            if(_type !== controlType) {
                // check the status of the filter button
                // if filter is active, reset
                var inactiveFilter = d3.select('#filter-buttons .button-options .btn-inactive').text();
                _available = xcopy(data.filter);
                _current = xcopy(data.filter);
                _plot.dataCache(data); // set dataCache on format change
                if(inactiveFilter === 'Off') {
                  _pastType = _type;
                  _type = controlType;
                  clickFilterOff();
                  // set config filter
                  config.filter = 'off';
                  _plot.config(config);
                  panelDestroy();
                } else {
                  // filter was inactive, ignore, but destroy panel
                  panelDestroy();
                }
            }

            // consolidate data.filter with _current and _available.
            xdata = [];
            _available.forEach(function(x) {
                xdata.push({'name': x, 'source': _type,
                            'current':_current.indexOf(x) >= 0,
                            'filtered':data.filter.indexOf(x) >= 0})
            })

            //var clickedFilter = null;
            //// If render event is triggered without the source of the click
            //// being the sort buttons, etc, the panel will display if hidden.
            //if(d3.event !== null) {
            //   foundFilter = function(pathElements,i) {
            //       pathElement = d3.select(pathElements[i]);
            //       if(pathElement.attr('id') == 'filter-buttons') return true;
            //       var active = i+1;
            //       if(pathElements.length-1 >= active) {
            //         return foundFilter(pathElements, active);
            //       }
            //   }
            //   try {
            //       var paths = null;
            //       if(typeof d3.event.path !== 'undefined') {
            //         // chrome
            //         paths = d3.event.path
            //       } else {
            //         if (typeof d3.event.srcElement !== 'undefined') {
            //            // safari
            //            paths = d3.selectAll(d3.event.srcElement.parentElement.parentElement);
            //         } else {
            //            // firefox
            //            paths = d3.selectAll(d3.event.target.parentElement.parentElement);
            //         }
            //       }
            //       var clickedFilter = foundFilter(paths, 0);
            //   } catch (e) {
            //       if (e instanceof TypeError) {
            //         console.log(e);
            //       }
            //   }
            //}

            if(config.filter === 'on') {
                // don't recreate the panel if already displayed.
               // if(clickedFilter === true && d3.select('.filter-context-menu').style('display') === 'none') {
                    addFilterPanel(xdata, _panel, x, y);
                //}
                // update config
                config = _plot.config();
                config.filteredState = 'true';
                _plot.config(config);
            }
            if(config.filter  === 'off') {
                hideFilterPanel();
            }
            // ensure _type is consistent with active selection.
            _type = controlType
        };

        function addFilterPanel(data, panel, x, y) {
            d3.select('.filter-error-menu').remove();

            var filters = panel.selectAll("input")
              .data(data)
              .enter()

            filters.forEach(function(d,i) {
                var li = filters.append('li')
                li.append('input')
                    .attr('type', 'checkbox')
                    .property({'checked': function(d){ return d.filtered; }})
                    .attr('id', function(d,i) { return 'a' + i; })
                    .attr('name', function(d) { return d.name; })
                    .attr('class', "filterCheck")
                li.append('label')
                    .attr('for', function(d,i) { return 'a' + i;} )
                    .text(function(d) { return d.name; })
            });

            // push footer down
            d3.select('.footer').style({'top':'330px'});

            preButton = function(d, data, config) {
                if(d.eClass === 'all') {
                    d3.selectAll('input').property({'checked': true})
                }
                if(d.eClass === 'none') {
                    d3.selectAll('input').property({'checked': false})
                }
            }

            postButton = function(d, data, config) {
                if(d.eClass === 'submit') {
                      var sf2 = d3.selectAll('.filterCheck').filter(function(cx) {
                          return d3.select(this).property('checked') == true;
                      });

                      if(sf2.empty() === true) {
                          // create message panel if doesn't exist
                          if(d3.select('.filter-error-menu').empty()) {
                               d3.select('.filter-context-menu')
                                 .insert('div', '.checkbox-grid')
                                 .attr('class', 'filter-error-menu')
                                 .text('At least one cohort selection is required to filter.')
                          }
                          return;

                      }

                      var merged = [].concat.apply([], sf2);
                      var checked = d3.map(merged, function(x) { return x.name; });

                      _current = Object.keys(checked._);

                      newData = _plot.data();
                      //Filter data by keys
                      newData.data = _data.data.filter(function (boxGroup) {
                          return (checked.keys().indexOf(boxGroup.key) >= 0);
                      });

                      _plot.data(newData);
                      _plot.render(newData, config);

                      d3.select('.filter-context-menu').style('display','none');

                      // pull footer up
                      d3.select('.footer').style({'top':'70px'});
                }
                if(d.eClass === 'cancel') {
                      d3.select('.filter-context-menu').style('display','none');
                      clickFilterOff();
                      // pull footer up
                      d3.select('.footer').style({'top':'70px'});
                }
            }

            var filterButtons = [
                {id: 'filter-btn-select-all' , eClass:'all', bClass: 'button btn-left', text: 'Select All', active: true, pre: preButton, post: postButton},
                {id: 'filter-btn-select-none' , eClass: 'none', bClass: 'button btn', text: 'Select None', active: false, pre: preButton, post: postButton},
                {id: 'filter-btn-submit' , eClass: 'submit', bClass: 'button btn', text: 'Submit', active: false, pre: preButton, post: postButton},
                {id: 'filter-btn-cancel' , eClass: 'cancel', bClass: 'button btn-right', text: 'Cancel', active: false, pre: preButton, post: postButton}]

            if(_filterButton === null) {
              d3.select('.filter-context-menu').append('div')
                   .attr('class', 'button-options')
                   .attr('class', 'button-lower')
                 .selectAll("input")
                   .data(filterButtons)
                 .enter().append('div')
                   .attr('class', function (d,i) {
                     var spaced = i < 2 ? ' btn-link' : 'btn-form'
                     return d.bClass + ' btn-active' + spaced;
                   })
                   .text(function(d) { return d.text; })
                   .on('click', function(d) {
                      if (d.pre) {
                          d.pre(d, data, data.config);
                      }
                      if (d.post) {
                          d.post(d, data, data.config);
                      }
              });
              _filterButton = 1;
            }

            // Ensure page event
            if(d3.event !== null) {
              d3.select('.filter-context-menu')
                .style('right', (d3.event.pageX + 300) + 'px')
                .style('top', (d3.event.pageY - 800 ) + 'px')
                .style('display', 'block');
            }
        }

        function hideFilterPanel() {
            d3.select('.filter-context-menu').style('display', 'none');
            d3.select('.footer').style({'top':'70px'});
        }

    }

    plotviz.Filter = Filter;

    return plotviz;
}) (plotviz || {});
