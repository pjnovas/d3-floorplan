module.exports = {
  app: {
    options: {
      //banner: '<%= banner %>',
      browserifyOptions: {
        debug: true
      },
      debug: true,
      extension: [ '.js' ],
      transform: [
        [ 'babelify'/*, { 'stage': 2 }*/ ]
      ],
    },
    src: ['src/index.js'],
    dest: 'dist/<%= pkg.name %>.js'
  }
};