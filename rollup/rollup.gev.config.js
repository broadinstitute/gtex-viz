import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
// import replace from 'rollup-plugin-replace';
import {minify} from 'uglify-es';

/* to set the NODE_ENV
in a terminal window (bash)
export NODE_ENV="development"
echo $NODE_ENV
 */
const name= 'GeneEqtlVisualizer';
export default {
    input: 'src/' + name + '.js',
    output: {
        file: 'build/js/gev.bundle.min.js',
        format: 'iife'
    },
    sourcemap: 'inline',
    name: name,
    plugins: [
        nodeResolve({jsnext: true, main: true}),
        uglify({}, minify) // uglify for production: NODE_ENV=production rollup -c
    ]
}