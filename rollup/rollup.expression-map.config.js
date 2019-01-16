import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import {minify} from 'uglify-es';

/* to set the NODE_ENV
in a terminal window (bash)
export NODE_ENV="development"
echo $NODE_ENV
 */
const name= 'BatchGeneExpression';
export default {
    input: 'src/' + name + '.js',
    output: {
        file: 'build/js/expression-map.bundle.min.js',
        format: 'iife'
    },
    sourcemap: 'inline',
    name: name,
    plugins: [
        nodeResolve({jsnext: true, main: true}),
        uglify({}, minify)
    ]
}