<?php
/**
 * Subscriptions Engine capability integration for the Dummy Payments gateway.
 *
 * Declares the gateway's recurring capability to the WooCommerce Subscriptions
 * Engine capability registry, so the engine knows the Dummy gateway can process
 * engine-scheduled recurring charges. This is the standard place for a gateway
 * to tell the engine which subscription features it can handle, replacing the
 * per-gateway "subscriptions compatible" feature flags with a single shared
 * declaration surface.
 *
 * The integration lives in its own file, isolated from the gateway's payment
 * classes - it couples to the gateway only by id (`dummy`). Alongside declaring
 * the capability it completes engine-scheduled renewal charges: the Dummy
 * gateway always approves, so it marks the renewal order paid through
 * WooCommerce's own `payment_complete()`. Keeping it isolated means the
 * integration can be removed or rewired without disturbing the gateway, and the
 * gateway keeps working unchanged when the engine is not installed.
 *
 * The registration is guarded with `class_exists()` / `method_exists()`, so it
 * is a safe no-op when the Subscriptions Engine is not installed - the gateway
 * keeps working standalone. When the engine is present, this declares the
 * `recurring` capability via the engine's public capability registry.
 *
 * @package WooCommerce Dummy Payments Gateway
 * @since   2.1.0
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Wires the Dummy gateway's capability declaration into the Subscriptions Engine.
 *
 * All methods are static: there is no instance state to carry, and the
 * registry's `declare_compatibility()` API is itself static (every consumer
 * reaches for the registry by class name).
 */
class WC_Gateway_Dummy_Subscriptions_Engine {

	/**
	 * Fully-qualified class name of the engine capability registry.
	 *
	 * Referenced as a string so this file never hard-references a class that
	 * may be absent: the `class_exists()` guard in {@see self::declare_capabilities()}
	 * decides at runtime whether the engine is present.
	 *
	 * @var string
	 */
	const CAPABILITY_REGISTRY = 'Automattic\\WooCommerce\\SubscriptionsEngine\\Integration\\Gateway\\CapabilityRegistry';

	/**
	 * Capability flag: the gateway can process engine-scheduled recurring charges.
	 *
	 * Mirrors the expected `CapabilityRegistry::RECURRING` constant. Hard-coded
	 * here (rather than read from the registry) so the value is available even
	 * before the engine loads; once the registry ships, prefer the constant on
	 * the class and drop this copy. See WOOSUBS-1723.
	 *
	 * @var string
	 */
	const CAPABILITY_RECURRING = 'recurring';

	/**
	 * `before_woocommerce_init` priority for the capability declaration.
	 *
	 * `before_woocommerce_init` is the canonical declaration window for the
	 * registry (it mirrors HPOS's `FeaturesUtil::declare_compatibility` pattern):
	 * declarations must land before WooCommerce builds its gateway registry on
	 * `woocommerce_loaded`. The default priority is fine; declared explicitly
	 * so it is easy to reorder if a future capability needs to run before or
	 * after another extension's declaration.
	 *
	 * @var int
	 */
	const DECLARE_HOOK_PRIORITY = 10;

	/**
	 * The engine's gateway-specific scheduled-payment action for the Dummy gateway.
	 *
	 * The engine fires `woocommerce_subscriptions_engine_scheduled_payment_{gateway}`
	 * to request a recurring charge; the `dummy` suffix is `WC_Gateway_Dummy::$id`.
	 *
	 * @var string
	 */
	const SCHEDULED_PAYMENT_HOOK = 'woocommerce_subscriptions_engine_scheduled_payment_dummy';

	/**
	 * Wire the integration hooks. Called once from the plugin bootstrap.
	 */
	public static function init() {
		add_action(
			'before_woocommerce_init',
			array( __CLASS__, 'declare_capabilities' ),
			self::DECLARE_HOOK_PRIORITY
		);

		// Complete engine-scheduled renewal charges for the Dummy gateway.
		add_action(
			self::SCHEDULED_PAYMENT_HOOK,
			array( __CLASS__, 'process_scheduled_payment' ),
			10,
			2
		);
	}

	/**
	 * Declare the Dummy gateway's capabilities to the Subscriptions Engine.
	 *
	 * Registers the `recurring` capability for the `dummy` gateway id via the
	 * engine's `CapabilityRegistry::declare_compatibility( $gateway_id, $capabilities )`
	 * static method, mirroring the engine's documented declaration pattern.
	 *
	 * Guarded so it is a safe no-op until the engine ships:
	 *  - `class_exists()` skips the call entirely when the engine is not present
	 *    (the Dummy gateway works standalone).
	 *  - `method_exists()` tolerates the registry API still being finalized, so
	 *    an in-progress engine build cannot fatal this gateway.
	 *
	 * The gateway id `dummy` matches `WC_Gateway_Dummy::$id`.
	 */
	public static function declare_capabilities() {
		$registry = self::CAPABILITY_REGISTRY;

		if ( ! class_exists( $registry ) || ! method_exists( $registry, 'declare_compatibility' ) ) {
			return;
		}

		$registry::declare_compatibility(
			'dummy',
			array( self::CAPABILITY_RECURRING )
		);
	}

	/**
	 * Complete an engine-scheduled renewal charge for the Dummy gateway.
	 *
	 * The engine hands a renewal off via {@see self::SCHEDULED_PAYMENT_HOOK} and
	 * expects the gateway to capture against the stored token and transition the
	 * order. The Dummy gateway always approves, so this marks the renewal order
	 * paid through WooCommerce's own `payment_complete()` - the same call the
	 * gateway makes for an initial checkout. A no-op when the order is already
	 * paid, so an Action Scheduler re-fire cannot double-complete it.
	 *
	 * @param float    $amount        Amount the engine asked to charge (the order total is authoritative; unused).
	 * @param WC_Order $renewal_order The renewal order to charge.
	 */
	public static function process_scheduled_payment( $amount, $renewal_order ) {
		if ( ! $renewal_order instanceof WC_Order || ! $renewal_order->needs_payment() ) {
			return;
		}

		$renewal_order->payment_complete();
	}
}
