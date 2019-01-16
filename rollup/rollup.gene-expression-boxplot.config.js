import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import {minify} from 'uglify-es';

const name= 'GeneExpressionBoxplot';
export default {
    input: 'src/' + name + '.js',
    output: {
        file: 'build/js/gene-expression-boxplot.bundle.min.js',
        format: 'iife',
        name: name,
        sourcemap: 'inline'
    },
    plugins: [
        nodeResolve({jsnext: true, main: true}),
        uglify({}, minify)
    ]
}
