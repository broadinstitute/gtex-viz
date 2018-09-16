import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';
import {minify} from 'uglify-es';

/* to set the NODE_ENV
in a terminal window (bash)
export NODE_ENV="development"
echo $NODE_ENV
 */
const name= 'GeneExpressionBoxplot';
export default {
    input: 'src/' + name + '.js',
    output: {
        file: process.env.NODE_ENV=='prod'?'build/js/gene-expression-boxplot.bundle.min.js':'build/js/gene-expression-boxplot.bundle.dev.js',
        format: 'iife',
        name: name,
        sourcemap: 'inline'
    },
    plugins: [
        nodeResolve({jsnext: true, main: true}),
        replace({
          ENV: JSON.stringify(process.env.NODE_ENV || 'dev'),
        }),
        (process.env.NODE_ENV === 'prod' && uglify({}, minify)) // uglify for production: NODE_ENV=production rollup -c
    ]
}