<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Trait for Deposits compatibility.
 *
 * @since x.x.x
 */
trait WC_Gateway_Dummy_Deposits_Trait {

	/**
	 * Flag to indicate that the deposits integration hooks have been attached.
	 *
	 * @var bool
	 */
	static public $has_attached_deposits_integration_hooks = false;

	/**
	 * Initialize deposits hook.
	 *
	 * @since x.x.x
	 */
	public function maybe_init_deposits() {
		if ( ! $this->is_deposits_enabled() ) {
			return;
		}

		$this->supports[] = 'deposits'; // @phpstan-ignore-line (supports is defined in the classes that use this trait)

		add_action( 'wc_deposits_' . $this->id . '_charge_order_token', [ $this, 'process_order_tokenization_payment' ], 10, 2 ); // @phpstan-ignore-line (id is defined in the classes that use this trait)

		/**
		 * The callbacks attached below only need to be attached once. We don't need each gateway instance to have its own callback.
		 * Therefore we only attach them once on the main `stripe` gateway and store a flag to indicate that they have been attached.
		 */
		if ( self::$has_attached_deposits_integration_hooks || 'dummy' !== $this->id ) { // @phpstan-ignore-line (id is defined in the classes that use this trait)
			return;
		}

		self::$has_attached_deposits_integration_hooks = true;
	}

	/**
	 * Checks if the deposits gateway feature is supported on this site.
	 *
	 * Deposits is only supported under the following circumstances:
	 * - The gateway supports tokenization.
	 * - The wc_deposits_feature_support function exists.
	 * - `wc_deposits_feature_support( 'deposits_payment_gateway_feature' )` returns true.
	 *
	 * @since x.x.x
	 *
	 * @return bool
	 */
	public function is_deposits_enabled() {
		return $this->supports( 'tokenization' )
			&& function_exists( 'wc_deposits_feature_support' )
			&& wc_deposits_feature_support( 'deposits_payment_gateway_feature' );
	}

	/**
	 * Whether the current cart contains a deposit.
	 *
	 * @since x.x.x
	 *
	 * @param  int $order_id
	 * @return bool
	 */
	public function cart_contains_deposit() {
		if ( ! $this->is_deposits_enabled() || ! class_exists( 'WC_Deposits_Cart_Manager' ) ) {
			return false;
		}
		$cart_manager = WC_Deposits_Cart_Manager::get_instance();
		return $cart_manager->has_deposit();
	}

	/**
	 * Whether the current order contains a deposit.
	 *
	 * @since x.x.x
	 *
	 * @param int|\WC_Order $order_id The order ID or order object.
	 * @return bool True if the order includes a deposit item, false otherwise.
	 */
	public function order_contains_deposit( $order_id ) {
		if ( ! $this->is_deposits_enabled() || ! class_exists( 'WC_Deposits_Order_Manager' ) ) {
			return false;
		}

		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return false;
		}

		$order_manager = WC_Deposits_Order_Manager::get_instance();
		return $order_manager->has_deposit( $order );
	}

	/**
	 * Capture an order token if the current order requires it.
	 *
	 * @since x.x.x
	 *
	 * @param \WC_Order $order
	 */
	public function maybe_capture_order_token( $order ) {
		if ( $this->get_option( 'result' ) !== 'success' ) {
			return;
		}

		$order = wc_get_order( $order );
		if ( ! $order ) {
			return;
		}

		if ( ! $this->order_contains_deposit( $order ) ) {
			return;
		}

		$token = array(
			'gateway' => $this->id,
			'token'   => ( 'dummy-' . $this->get_option( 'result' ) ),
		);

		$order->update_meta_data( '_wc_order_payment_token', $token );
		$order->save();
	}

	/**
	 * Process the payment for orders with a payment token attached.
	 *
	 * @since x.x.x
	 *
	 * @param int   $order_id The order ID.
	 * @param array $token    The token data.
	 */
	public function process_order_tokenization_payment( $order_id, $token ) {
		$order = wc_get_order( $order_id );

		if ( ! $order ) {
			return;
		}

		// Get the payment result from the token.
		$result = substr( $token['token'], 6 );

		if ( 'success' === $result ) {
			$order->payment_complete();
		} else {
			$order->update_status( 'failed', __( 'Payment failed.', 'woocommerce' ) );
		}
	}
}
