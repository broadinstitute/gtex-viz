module.exports = function(grunt){
    // project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            bubblemap: {
                src: [
                    'js/gtexBubbleMapConfig.js',
                    'js/gtexBubbleMapDataUtil.js',
                    'js/bubbleMapUtil.js',
                    'js/bubbleMap.js',
                    'js/bubbleMapBrush.js',
                    'js/bubbleMapMini.js',
                    'js/tooltip.js',
                    'js/gtexBubbleMap.js'

                ],
                dest: 'src/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                mangle: false,
                banner: '/* <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'src/<%= pkg.name %>.js',
                dest: 'build/<%= pkg.name %>.min.js'
            }
        },
        // copy:{
        //     main:{
        //         src:['build/<%= pkg.name %>.min.js', 'src/<%= pkg.name %>.js', 'css/*.css'],
        //         dest:'/Users/khhuang/Sites/gtex-cloud/contexts/external/gtex/media/bubbleMap/'
        //     }
        // }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    // grunt.registerTask('default', ['concat:bubblemap', 'uglify', 'copy']);
    grunt.registerTask('default', ['concat:bubblemap', 'uglify']);

};