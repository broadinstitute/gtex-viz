import nodeResolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';

export default {
    input: 'src/scripts/main.junction.js',
    output: {
        file: 'build/js/junction.expressMap.bundle.min.js',
        format: 'iife'
    },
    sourcemap: 'inline',
    name: 'junctionExpressMap',
    plugins: [
        nodeResolve({jsnext: true, main: true}),
        replace({
          ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
        }),
        (process.env.NODE_ENV === 'production' && uglify()) // uglify for production: NODE_ENV=production rollup -c
    ]
}