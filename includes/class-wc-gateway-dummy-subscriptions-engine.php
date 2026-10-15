<?php
/**
 * Subscriptions Engine integration for the Dummy Payments gateway.
 *
 * Opts the Dummy gateway into the WooCommerce Subscriptions Engine by declaring
 * the `subscriptions_engine` feature in its `supports` list. Declaring the
 * feature is a promise to the engine: the gateway charges a renewal when the
 * engine fires its scheduled-payment action, reads what it needs from the
 * renewal order, and reports the outcome through the order's status.
 *
 * The integration lives in its own file and couples to the gateway only by id
 * (`dummy`), so it can be removed without touching the gateway. When the engine
 * is not installed, the feature flag is never asked about and the action never
 * fires, so the gateway keeps working standalone.
 *
 * @package WooCommerce Dummy Payments Gateway
 * @since   2.1.0
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Wires the Dummy gateway into the Subscriptions Engine.
 */
class WC_Gateway_Dummy_Subscriptions_Engine {

	/**
	 * The engine's gateway feature flag: declaring it opts the gateway into engine renewals.
	 *
	 * @var string
	 */
	const ENGINE_FEATURE = 'subscriptions_engine';

	/**
	 * The engine's scheduled-payment action for the Dummy gateway.
	 *
	 * The engine fires `woocommerce_subscriptions_engine_scheduled_payment_{gateway}`
	 * to request an off-session charge; the `dummy` suffix is `WC_Gateway_Dummy::$id`.
	 *
	 * @var string
	 */
	const SCHEDULED_PAYMENT_HOOK = 'woocommerce_subscriptions_engine_scheduled_payment_dummy';

	/**
	 * Wire the integration hooks. Called once from the plugin bootstrap.
	 */
	public static function init() {
		add_filter( 'woocommerce_payment_gateway_supports', array( __CLASS__, 'supports_engine' ), 10, 3 );

		add_action(
			self::SCHEDULED_PAYMENT_HOOK,
			array( __CLASS__, 'process_scheduled_payment' )
		);
	}

	/**
	 * Declare the `subscriptions_engine` feature for the Dummy gateway.
	 *
	 * @param bool               $is_supported Whether the feature is supported so far.
	 * @param string             $feature      Feature being checked.
	 * @param WC_Payment_Gateway $gateway      Gateway being checked.
	 * @return bool
	 */
	public static function supports_engine( $is_supported, $feature, $gateway ) {
		if ( self::ENGINE_FEATURE === $feature && $gateway instanceof WC_Payment_Gateway && 'dummy' === $gateway->id ) {
			return true;
		}

		return $is_supported;
	}

	/**
	 * Process an engine-scheduled renewal charge for the Dummy gateway.
	 *
	 * The outcome follows the gateway's "Payment result" setting, so renewal failure
	 * paths can be exercised too: success marks the renewal order paid through
	 * `payment_complete()`, failure moves it to `failed`. A no-op when the order no
	 * longer needs payment, so a repeated request cannot double-complete it.
	 *
	 * @param WC_Order $renewal_order The renewal order to charge (its total).
	 */
	public static function process_scheduled_payment( $renewal_order ) {
		if ( ! $renewal_order instanceof WC_Order || ! $renewal_order->needs_payment() ) {
			return;
		}

		if ( 'success' === self::get_payment_result() ) {
			$renewal_order->payment_complete();
		} else {
			$renewal_order->update_status(
				'failed',
				__( 'Subscription payment failed. To make a successful payment using Dummy Payments, please review the gateway settings.', 'woocommerce-gateway-dummy' )
			);
		}
	}

	/**
	 * Read the gateway's configured "Payment result" (`success`/`failure`) setting.
	 *
	 * Looked up by gateway id so this integration stays decoupled from the gateway
	 * class. Defaults to `success` when the gateway is not registered.
	 *
	 * @return string `success` or `failure`.
	 */
	private static function get_payment_result() {
		$gateways = WC()->payment_gateways()->payment_gateways();

		if ( ! isset( $gateways['dummy'] ) || ! $gateways['dummy'] instanceof WC_Payment_Gateway ) {
			return 'success';
		}

		return $gateways['dummy']->get_option( 'result', 'success' );
	}
}
