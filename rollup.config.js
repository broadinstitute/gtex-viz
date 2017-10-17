import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';

export default {
    entry:'src/scripts/main.js',
    dest: 'build/js/expressMap.bundle.min.js',
    format: 'iife',
    sourceMap: 'inline',
    moduleName: 'expressMap',
    plugins: [
        nodeResolve({jsnext: true, main: true}),
        replace({
          ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
        }),
        (process.env.NODE_ENV === 'production' && uglify()) // uglify for production: NODE_ENV=production rollup -c
    ]
}