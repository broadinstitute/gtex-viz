import nodeResolve from 'rollup-plugin-node-resolve';

export default {
    entry:'src/scripts/main.js',
    dest: 'build/js/expressMap.bundle.min.js',
    format: 'iife',
    sourceMap: 'inline',
    moduleName: 'expressMap',
    plugins: [nodeResolve({jsnext: true, main: true})]
}