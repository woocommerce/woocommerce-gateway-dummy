<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Trait for Forced Tokenization compatibility.
 *
 * @since x.x.x
 */
trait WC_Gateway_Dummy_Forced_Tokenization_Trait {

	/**
	 * Flag to indicate that the forced tokenization integration hooks have been attached.
	 *
	 * @var bool
	 */
	static public $has_attached_forced_tokenization_integration_hooks = false;

	/**
	 * Initialize pre-orders hook.
	 *
	 * @since x.x.x
	 */
	public function maybe_init_forced_tokenization() {
		if ( ! $this->is_forced_tokenization_enabled() ) {
			return;
		}

		$this->supports[] = 'forced-tokenization'; // @phpstan-ignore-line (supports is defined in the classes that use this trait)

		add_action( 'wc_checkout_tokenization_' . $this->id . '_charge_order_token', [ $this, 'process_order_tokenization_payment' ], 10, 2 ); // @phpstan-ignore-line (id is defined in the classes that use this trait)

		/**
		 * The callbacks attached below only need to be attached once. We don't need each gateway instance to have its own callback.
		 * Therefore we only attach them once on the main `stripe` gateway and store a flag to indicate that they have been attached.
		 */
		if ( self::$has_attached_forced_tokenization_integration_hooks || 'dummy' !== $this->id ) { // @phpstan-ignore-line (id is defined in the classes that use this trait)
			return;
		}

		// add_filter( 'wc_stripe_display_save_payment_method_checkbox', [ $this, 'hide_save_payment_for_forced_tokenization' ] );

		self::$has_attached_forced_tokenization_integration_hooks = true;
	}

	/**
	 * Checks if forced tokenization is supported on this site.
	 *
	 * @since x.x.x
	 *
	 * @return bool
	 */
	public function is_forced_tokenization_enabled() {
		return $this->supports( 'tokenization' ) && class_exists( 'WC_Checkout_Tokenization' );
	}

	/**
	 * Whether the current cart require a payment token stored against the order.
	 *
	 * @since x.x.x
	 *
	 * @param  int $order_id
	 * @return bool
	 */
	public function cart_requires_order_payment_token() {
		return $this->is_forced_tokenization_enabled() && WC_Checkout_Tokenization::cart_requires_order_payment_token();
	}

	/**
	 * Whether the current order requires a payment token be stored against the order.
	 *
	 * @since x.x.x
	 *
	 * @param int|\WC_Order $order_id The order ID or order object.
	 * @return bool True if the order requires a payment token stored against the order, false otherwise.
	 */
	public function order_requires_order_payment_token( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return false;
		}

		return $this->is_forced_tokenization_enabled() && WC_Checkout_Tokenization::order_requires_order_payment_token( $order );
	}

	/**
	 * Whether the current cart requires the user to save a payment method.
	 *
	 * @since x.x.x
	 *
	 * @return bool True if the cart requires the user to save a payment method, false otherwise.
	 */
	public function cart_requires_user_payment_method() {
		return $this->is_forced_tokenization_enabled() && WC_Checkout_Tokenization::cart_requires_user_payment_method();
	}

	/**
	 * Whether the current order requires the user to save a payment method.
	 *
	 * @since x.x.x
	 *
	 * @param int|\WC_Order $order_id The order ID or order object.
	 * @return bool True if the order requires the user to save a payment method, false otherwise.
	 */
	public function order_requires_user_payment_method( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return false;
		}

		return $this->is_forced_tokenization_enabled() && WC_Checkout_Tokenization::order_requires_user_payment_method( $order );
	}

	public function maybe_capture_order_token( $order ) {
		if ( ! $this->order_requires_order_payment_token( $order ) ) {
			return;
		}

		$token = WC_Checkout_Tokenization::get_order_payment_token( $order );

		if ( $token && isset( $token['gateway'] ) && $this->id === $token['gateway'] ) {
			// No need to capture the token again (Dummy Gateway tokens are static).
			return;
		}

		if ( $this->get_option( 'result' ) !== 'success' ) {
			return;
		}

		$token = array(
			'gateway' => $this->id,
			'token'   => ( 'dummy-' . $this->get_option( 'result' ) ),
		);

		// Attach the token to the order.
		WC_Checkout_Tokenization::store_token_against_order( $order, $token );
	}

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
