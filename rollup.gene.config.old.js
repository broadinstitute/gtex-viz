import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';
import {minify} from 'uglify-es';
/* to set the NODE_ENV
in a terminal window (bash)
export NODE_ENV="development"
echo $NODE_ENV
 */
export default {
    input: 'src/scripts/main.gene.js',
    output: {
        file: 'build/js/gene.expressMap.bundle.min.js',
        format: 'iife'
    },
    sourcemap: 'inline',
    name: 'geneExpressMap',
    plugins: [
        nodeResolve({jsnext: true, main: true}),
        replace({
          ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
        }),
        (process.env.NODE_ENV === 'production' && uglify({}, minify)) // uglify for production: NODE_ENV=production rollup -c
    ]
}