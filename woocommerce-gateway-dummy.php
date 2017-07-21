<?php
/**
 * Plugin Name: WooCommerce Dummy Payments Gateway
 * Plugin URI: http://somewherewarm.gr/
 * Description: Adds the Dummy Payments gateway to your WooCommerce website.
 * Version: 1.0.0
 *
 * Author: SomewhereWarm
 * Author URI: http://somewherewarm.gr/
 *
 * Text Domain: woocommerce-gateway-dummy
 * Domain Path: /i18n/languages/
 *
 * Requires at least: 4.2
 * Tested up to: 4.8
 *
 * Copyright: © 2009-2017 Emmanouil Psychogyiopoulos.
 * License: GNU General Public License v3.0
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WC Dummy Payment gateway plugin class.
 *
 * @class WC_Dummy_Payments
 */
class WC_Dummy_Payments {

	/**
	 * Plugin bootstrapping.
	 */
	public static function init() {

		// Dummy Payments gateway class.
		add_action( 'plugins_loaded', array( __CLASS__, 'includes' ), 0 );

		// Make the Dummy Payments gateway available to WC.
		add_filter( 'woocommerce_payment_gateways', array( __CLASS__, 'add_gateway' ) );
	}

	/**
	 * Add the Dummy Payment gateway to the list of available gateways.
	 *
	 * @param array
	 */
	public static function add_gateway( $gateways ) {
		$gateways[] = 'WC_Gateway_Dummy';
		return $gateways;
	}

	/**
	 * Plugin includes.
	 */
	public static function includes() {

		// Make the WC_Gateway_Dummy class available.
		if ( class_exists( 'WC_Payment_Gateway' ) ) {
			require_once( 'includes/class-wc-gateway-dummy.php' );
		}
	}

	/**
	 * Plugin url.
	 *
	 * @return string
	 */
	public static function plugin_url() {
		return untrailingslashit( plugins_url( '/', __FILE__ ) );
	}
}

WC_Dummy_Payments::init();
