/* jshint node: true */

/**
 * GruntJS task manager config.
 */
module.exports = function( grunt ) {

	'use strict';

	var request = require( 'request' ),
		sass    = require( 'node-sass' );

	/**
	 * Init config.
	 */
	grunt.initConfig( {

		// Get access to package.json.
		pkg: grunt.file.readJSON( 'package.json' ),

		// Setting paths.
		source: {
			js:     'resources/js',
			deploy: 'deploy' // Hint: Create a ./deploy/ folder and ignore it.
		},

		dist: {
			dist:   'assets/dist',
		},

		// JavaScript linting with JSHint.
		jshint: {
			options: {
				'force': true,
				'boss': true,
				'curly': true,
				'eqeqeq': false,
				'eqnull': true,
				'es3': false,
				'expr': false,
				'immed': true,
				'noarg': true,
				'onevar': true,
				'quotmark': 'single',
				'trailing': true,
				'undef': true,
				'unused': true,
				'sub': false,
				'browser': true,
				'maxerr': 1000,
				globals: {
					'jQuery': false,
					'wp':     false
				}
			},
			all: [
				'<%= dist.dist %>/frontend/*.js',
				'!Gruntfile.js'
			]
		},

		// Minify .js files.
		uglify: {
			options: {
				preserveComments: false
			},
			dist: {
				files: [ {
					expand: true,
					cwd: '<%= dist.dist %>/frontend',
					src: [
						'*.js',
						'!*.min.js',
						'!*.php'
					],
					dest: '<%= dist.dist %>/frontend',
					ext: '.min.js'
				} ]
			}
		},

		// Watch changes for assets.
		watch: {
			js: {
				files: [
					'<%= source.js %>/frontend/*js', '!<%= source.js %>/frontend/*.min.js'
				],
				tasks: [ 'copy:resources', 'uglify' ]
			}
		},

		// Check textdomain errors.
		checktextdomain: {
			options:{
				text_domain: [ 'woocommerce-gateway-dummy', 'woocommerce', 'woo-gutenberg-products-block' ],
				keywords: [
					'__:1,2d',
					'_e:1,2d',
					'_x:1,2c,3d',
					'esc_html__:1,2d',
					'esc_html_e:1,2d',
					'esc_html_x:1,2c,3d',
					'esc_attr__:1,2d',
					'esc_attr_e:1,2d',
					'esc_attr_x:1,2c,3d',
					'_ex:1,2c,3d',
					'_n:1,2,4d',
					'_nx:1,2,4c,5d',
					'_n_noop:1,2,3d',
					'_nx_noop:1,2,3c,4d'
				]
			},
			files: {
				src:  [
					'**/*.php', // Include all files
					'!deploy/**', // Exclude deploy.
					'!node_modules/**' // Exclude node_modules/
				],
				expand: true
			}
		},

		exec: {
			options: {
				shell: '/bin/bash'
			},
			npm_build: {
				cmd: function() {
					grunt.log.ok( 'Running `npm run build and i18n`...' );
					return 'npm run build && npm run i18n';
				}
			}
		},

		// Manage npm dependencies.
		copy: {
			resources: {
				files: [
					{
						expand: true,
						src: [ '<%= source.js %>/frontend/*.js' ],
						dest: '<%= dist.dist %>/frontend',
						flatten: true,
						filter: 'isFile'
					}
				]
			}
		}
	} );

	// Load NPM tasks to be used here.
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-uglify' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-contrib-copy' );
	grunt.loadNpmTasks( 'grunt-checktextdomain' );
	grunt.loadNpmTasks( 'grunt-exec' );

	/**
	 * Custom Tasks.
	 */
	grunt.registerTask( 'default', [
		'watch',
	] );

	grunt.registerTask( 'build', [
		'exec:npm_build',
		'copy',
		'uglify',
	] );

};
