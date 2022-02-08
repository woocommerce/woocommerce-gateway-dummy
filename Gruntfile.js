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
			js:     'assets/js',
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
				'<%= dist.js %>/admin/*.js',
				'!Gruntfile.js',
				'!<%= dist.js %>/admin/select2.js',
				'!<%= dist.js %>/admin/*.min.js'
			]
		},

		// Minify .js files.
		uglify: {
			options: {
				preserveComments: false
			},
			admin: {
				files: [ {
					expand: true,
					cwd: '<%= dist.js %>/admin',
					src: [
						'*.js',
						'!*.min.js'
					],
					dest: '<%= dist.js %>/admin',
					ext: '.min.js'
				} ]
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
					'<%= source.js %>/admin/*js', '!<%= source.js %>/admin/*.min.js'
				],
				tasks: [ 'copy:resources', 'uglify' ]
			}
		},

		// Check textdomain errors.
		checktextdomain: {
			options:{
				text_domain: [ 'woocommerce-gateway-dummy', 'woocommerce' ],
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
			},
			test: {
				cmd: function() {
					grunt.log.ok( 'Unit Testing...' );
					return 'phpunit';
				}
			},
			phpcs: {
				cmd: function() {
					grunt.log.ok( 'Running PHPCS...' );
					return './vendor/bin/phpcs --warning-severity=0 -s --extensions=php,html .';
				}
			},
			phpcs_security: {
				cmd: function() {
					grunt.log.ok( 'Running PHPCS for critical security sniffs...' );

					var sniffs = [
						'WordPress.Security.ValidatedSanitizedInput',
						'WordPress.DateTime.RestrictedFunctions'
					];
					return './vendor/bin/phpcs --warning-severity=0 -s --sniffs=' + sniffs.join( ',', sniffs ) + ' --extensions=php,html .';
				}
			},
			upload: {
				cmd: function( filename ) {

					var path     = grunt.config.process( '<%= source.deploy %>' ),
						filepath = path + '/' + filename;

					return "(echo put " + filepath + ".zip && echo chmod 644 " + filename + ".zip) | sftp -q support@somewherewarm.gr:/home/support/uploads";
				}
			},
			zip: {
				cmd: function( filename, title ) {
					var path = grunt.config.process( '<%= source.deploy %>' );
					grunt.log.ok( 'Compressing files...' );

					var excludes = [
						'-x "*/resources/*"',
						'-x "*/node_modules/*"',
						'-x "*/bin/*"',
						'-x "*/tests/*"',
						'-x "*/deploy/*"',
						'-x "*/vendor/*"',
						'-x "*/.git/*"',
						'-x "*/Gruntfile.js"',
						'-x "*/webpack.config.js"',
						'-x "*/phpcs.xml"',
						'-x "*/phpunit.xml"',
						'-x "*/package.json"',
						'-x "*/package-lock.json"',
						'-x "*/composer.json"',
						'-x "*/composer.lock"',
						'-x "*/README.md"',
						'-x "*/codeception.yml"',
						'-x "*/.DS_Store"',
						'-x "*/.gitignore"',
						'-x "*/.travis.yml"',
						'-x "*/languages/*.mo"',
						'-x "*/languages/*.po~"',
						'-x "*/languages/*.po"',
						'-x "*/languages/*.json"',
						'-x "*/languages/*.json"',
						'-x "*/._*"'
					];

					var cmd = 'cd .. && zip -qFSr ' + title + '/' + path + '/' + filename + '.zip ' + title + ' ' + excludes.join( ' ' );
					grunt.log.ok( 'Running: ' + cmd );
					return cmd;
				}
			}
		},

		// Manage npm dependencies.
		copy: {
			resources: {
				files: [
					{
						expand: true,
						src: [ '<%= source.js %>/frontend/blocks/*.js' ],
						dest: '<%= dist.js %>/frontend/blocks',
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

	grunt.registerTask( 'phpcs', function( mode ) {
		if ( ! mode ) {
			mode = 'all';
		}

		if ( 'all' === mode ) {
			grunt.task.run( 'exec:phpcs' );
		} else if ( 'security' === mode ) {
			grunt.task.run( 'exec:phpcs_security' );
		}

	} );

	/**
	 * Function to get the release download key from the server.
	 */
	grunt.registerTask( 'get_download_key', function( filename ) {

		var done    = this.async(),
			options = {
				url: 'https://somewherewarm.com/download.php?get=key&file=' + filename + '.zip',
				headers: {
					'Content-Type': 'text/plain'
				}
			};

		grunt.log.ok( 'Request download key from somewherewarm.com...' );
		request( options, function( error, response, body ) {

			var key_regex = /<body>(.*?)<\/body>/g,
				key       = key_regex.exec( body )[ 1 ],
				url       = 'https://somewherewarm.com/download.php?get=' + key;

			grunt.log.writeln( 'Download link:'['green'].bold );

			grunt.log.writeln( url['yellow'].bold );

			done();
		} );

	} );

	/**
	 * Function to validate version numbers in the extension's codebase.
	 */
	grunt.registerTask( 'validate_version', function( title, isDeployment ) {

		if ( ! isDeployment || isDeployment == 'false' ) {
			isDeployment = false;
		}

		// Get json version.
		var	version = grunt.config.process( '<%= pkg.version %>' );

		grunt.log.ok( 'Parsing version numbers...' );

		// Init files.
		var main_file      = grunt.file.read( title + '.php', { encoding: 'utf8' } ),
			readme_file    = grunt.file.read( 'readme.txt', { encoding: 'utf8' } ),
			changelog_file = grunt.file.read( 'changelog.txt', { encoding: 'utf8' } );

		// Parse version number form the readme file.
		var main_version_reg        = /const VERSION = \'([0-9\.]+[-dev]*)\'\;$/gm,
			main_version_reg_header = / Version: ([0-9\.]+[-dev]*)$/gm,
			main_version            = main_version_reg.exec( main_file )[ 1 ],
			main_version_header     = main_version_reg_header.exec( main_file )[ 1 ];

		// Parse version number form the readme file.
		var readme_version_reg = /Stable tag: ([0-9\.]+[-dev]*)$/gm,
			readme_version     = readme_version_reg.exec( readme_file )[ 1 ];

		// Parse version number form the changelog file.
		var changelog_version_reg = / version ([0-9\.]+[-dev]*)/gm,
			changelog_version     = changelog_version_reg.exec( changelog_file )[ 1 ];

		grunt.log.writeln( 'Version package.json:', version['yellow'] );
		grunt.log.writeln( 'Version Readme:', readme_version['yellow'] );
		grunt.log.writeln( 'Version Main Header:', main_version_header['yellow'] );
		grunt.log.writeln( 'Version Main:', main_version['yellow'] );
		grunt.log.writeln( 'Version Changelog:', changelog_version['yellow'] );

		grunt.log.ok( 'Checking version numbers...' );

		var errors = [];

		if ( main_version != main_version_header ) {
			errors.push( 'Main\'s property version does not match header\'s version.' );
		}

		if ( isDeployment ) {

			if ( version != main_version ) {
				errors.push( 'package.json version does not match with main file\'s version.' );
			}

			if ( version != readme_version ) {
				errors.push( 'package.json version does not match with readme file\'s version.' );
			}

			if ( version != changelog_version ) {
				errors.push( 'package.json version does not match with changelog file\'s version.' );
			}

		} else {

			grunt.log.ok( 'Prereleasing requires a "-dev" suffix in version numbers...' );

			if ( main_version.indexOf( '-dev' ) == -1 ) {
				errors.push( 'Main\'s version does not include a "-dev" suffix.' );
			}

			if ( version != main_version.substring( 0, main_version.length - 4 ) ) { // Info: "-dev" is 4 chars in count.
				errors.push( 'package.json version does not match with main file\'s suffixed "-dev" version.' );
			}
		}

		if ( errors.length > 0 ) {
			grunt.fail.fatal( '\n• ' + errors.join('\n• ') );
		}

		grunt.log.writeln( 'Versions checked successfully. Moving on...'['green'].bold );
	} );

	/**
	 * Build and Upload a new Release.
	 *
	 * @deprecated Replaced by Travis CD Process
	 */
	grunt.registerTask( 'deploy', function() {

		var done    = this.async(),
			title   = grunt.config.process( '<%= pkg.title %>' );

		// Sluggify title.
		title = title.toLowerCase().replace( /\s+/g, '-' );

		grunt.task.run( [
			'validate_version:' + title + ':' + true,
			'build',
			// 'exec:test',
			'exec:zip:' + title + ':' + title,
			'exec:upload:' + title,
			'get_download_key:' + title
		] );

		done();
	} );

	/**
	 * Build and Upload a new PRE-Release.
	 */
	grunt.registerTask( 'prerelease', function() {

		var done    = this.async(),
			title   = grunt.config.process( '<%= pkg.title %>' ),
			version = grunt.config.process( '<%= pkg.version %>' );

		// Sluggify title.
		title = title.toLowerCase().replace( /\s+/g, '-' );

		var zip_name     = title + '-' + version,
			zip_name_dev = zip_name + '-dev';

		grunt.task.run( [
			'validate_version:' + title + ':' + false,
			'build',
			'exec:zip:' + zip_name_dev + ':' + title,
			'exec:upload:' + zip_name_dev,
			'get_download_key:' + zip_name_dev
		] );

		done();
	} );
};
