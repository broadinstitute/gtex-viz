import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';
import copy from 'rollup-plugin-copy';

import {minify} from 'uglify-es';

/*
to set the NODE_ENV
in a terminal window (bash)
export NODE_ENV="development"
echo $NODE_ENV
 */
const name = 'CramFileQuery';
export default {
    input:'src/scripts/' + name + '.js',
    output: {
        file: process.env.NODE_ENV=='prod'?'build/js/cram-file-query.bundle.min.js':'build/js/cram-file-query.bundle.dev.js',
        format: 'iife'
    },
    sourcemap: 'inline',
    name: name,
    plugins: [
        nodeResolve({jsnext: true, main: true}),
        replace({
          ENV: JSON.stringify(process.env.NODE_ENV || 'dev'),
        }),
        copy({
            "src/scripts/modules/googleUser.js": "build/js/googleUser.js"
        }),
        (process.env.NODE_ENV === 'prod' && uglify({}, minify)) // uglify for production: NODE_ENV=production rollup -c
    ]
}
