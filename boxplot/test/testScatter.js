/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var Nightmare = require('nightmare');
var vo = require('vo');

vo(run)(function (err, result) {
    if (err) throw err;
});

function *run() {
    var nightmare = Nightmare({show:true});
    var title = yield nightmare
        .goto('http://plotviz/dev/scatter.html')
        .evaluate(function () {
            return document.title;
        });
    console.log(title);
    yield nightmare.end();
}
