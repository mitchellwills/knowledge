module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      gruntfile: {
        src: ['Gruntfile.js'],
      },
      js: {
        src: ['src/**/*.js', '!src/lib/**/*.js'],
      },
      options: {
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        }
      }
    },
    connect: {
      server: {
        options: {
          port: 8083,
          base: 'src/',
          debug: true,
          open: true,
          livereload: true,
          middleware: function(connect, options){
            return [
              connect.static(options.base),
              function(req, res, next){//if couldn't find a file to serve then just serve index.html
                console.log("Rewriting URL: "+req.url+" -> /");
                req.url = "/";
                next();
              },
              connect.static(options.base),
            ];
          },
        }
      }
    },
    watch: {
      js: {
        files: 'src/**/*.js',
        tasks: ['jshint'],
      },
      other: {
        files: ['src/**/*', '!src/**/*.js'],
      },
      options: {
        livereload: true,
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  
  
  grunt.registerTask('default', ['jshint', 'connect', 'watch']);

};