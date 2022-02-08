const defaultConfig = require( '@somewherewarm/woocommerce/packages/dependency-manager/config/webpack.config' );
const path          = require( 'path' );

// Export configuration.
module.exports = {
	...defaultConfig,
	entry: {
		'frontend/blocks': '/resources/js/frontend/blocks/index.js',
	},
	output: {
		path: path.resolve( __dirname, 'assets/dist' ),
		filename: '[name].js',
	}
};
