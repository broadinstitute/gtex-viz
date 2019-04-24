import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import {minify} from 'uglify-es';

const name= 'LocusBrowser';
export default {
    input: 'src/' + name + '.js',
    output: {
        file: 'build/js/locus-browser.bundle.min.js',
        format: 'iife'
    },
    sourcemap: 'inline',
    name: name,
    plugins: [
        nodeResolve({jsnext: true, main: true}),
        uglify({}, minify)
    ]
}
