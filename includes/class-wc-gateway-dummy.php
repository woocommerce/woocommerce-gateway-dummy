<?php
/**
 * WC_Gateway_Dummy class
 *
 * @author   SomewhereWarm <info@somewherewarm.gr>
 * @package  WooCommerce Dummy Payments Gateway
 * @since    1.0.0
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Dummy Gateway.
 *
 * @class    WC_Gateway_Dummy
 * @version  1.10.0
 */
class WC_Gateway_Dummy extends WC_Payment_Gateway {
	use WC_Gateway_Dummy_Deposits_Trait;

	/**
	 * Payment gateway instructions.
	 * @var string
	 *
	 */
	protected $instructions;

	/**
	 * Whether the gateway is visible for non-admin users.
	 * @var boolean
	 *
	 */
	protected $hide_for_non_admin_users;

	/**
	 * Unique id for the gateway.
	 * @var string
	 *
	 */
	public $id = 'dummy';

	/**
	 * Constructor for the gateway.
	 */
	public function __construct() {

		$this->icon               = apply_filters( 'woocommerce_dummy_gateway_icon', '' );
		$this->has_fields         = false;
		$this->supports           = array(
			'pre-orders',
			'products',
			'subscriptions',
			'subscription_cancellation',
			'subscription_suspension',
			'subscription_reactivation',
			'subscription_amount_changes',
			'subscription_date_changes',
			'multiple_subscriptions'
		);

		$this->method_title       = _x( 'Dummy Payment', 'Dummy payment method', 'woocommerce-gateway-dummy' );
		$this->method_description = __( 'Allows dummy payments.', 'woocommerce-gateway-dummy' );

		// Load the settings.
		$this->init_form_fields();
		$this->init_settings();

		// Define user set variables.
		$this->title                    = $this->get_option( 'title' );
		$this->description              = $this->get_option( 'description' );
		$this->instructions             = $this->get_option( 'instructions', $this->description );
		$this->hide_for_non_admin_users = $this->get_option( 'hide_for_non_admin_users' );

		// Actions.
		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
		add_action( 'woocommerce_scheduled_subscription_payment_dummy', array( $this, 'process_subscription_payment' ), 10, 2 );
		add_action ( 'wc_pre_orders_process_pre_order_completion_payment_' . $this->id, array( $this, 'process_pre_order_release_payment' ), 10 );
	}

	/**
	 * Initialise Gateway Settings Form Fields.
	 */
	public function init_form_fields() {

		$this->form_fields = array(
			'enabled' => array(
				'title'   => __( 'Enable/Disable', 'woocommerce-gateway-dummy' ),
				'type'    => 'checkbox',
				'label'   => __( 'Enable Dummy Payments', 'woocommerce-gateway-dummy' ),
				'default' => 'yes',
			),
			'hide_for_non_admin_users' => array(
				'type'    => 'checkbox',
				'label'   => __( 'Hide at checkout for non-admin users', 'woocommerce-gateway-dummy' ),
				'default' => 'no',
			),
			'title' => array(
				'title'       => __( 'Title', 'woocommerce-gateway-dummy' ),
				'type'        => 'text',
				'description' => __( 'This controls the title which the user sees during checkout.', 'woocommerce-gateway-dummy' ),
				'default'     => _x( 'Dummy Payment', 'Dummy payment method', 'woocommerce-gateway-dummy' ),
				'desc_tip'    => true,
			),
			'description' => array(
				'title'       => __( 'Description', 'woocommerce-gateway-dummy' ),
				'type'        => 'textarea',
				'description' => __( 'Payment method description that the customer will see on your checkout.', 'woocommerce-gateway-dummy' ),
				'default'     => __( 'The goods are yours. No money needed.', 'woocommerce-gateway-dummy' ),
				'desc_tip'    => true,
			),
			'result' => array(
				'title'    => __( 'Payment result', 'woocommerce-gateway-dummy' ),
				'desc'     => __( 'Determine if order payments are successful when using this gateway.', 'woocommerce-gateway-dummy' ),
				'id'       => 'woo_dummy_payment_result',
				'type'     => 'select',
				'options'  => array(
					'success'  => __( 'Success', 'woocommerce-gateway-dummy' ),
					'failure'  => __( 'Failure', 'woocommerce-gateway-dummy' ),
				),
				'default' => 'success',
				'desc_tip' => true,
			),
			'tokenization' => array(
				'title'    => __( 'Enable tokenization', 'woocommerce-gateway-dummy' ),
				'desc'     => __( 'Allow customers to save payment methods for future use.', 'woocommerce-gateway-dummy' ),
				'id'       => 'woo_dummy_tokenization',
				'type'     => 'checkbox',
				'default'  => 'yes',
				'desc_tip' => true,
			),
		);
	}

	/**
	 * Initialize the gateway settings from the form fields.
	 *
	 * At present this is used to enable tokenization if the setting is enabled
	 * in the dashboard.
	 */
	public function init_settings() {
		parent::init_settings();

		// Tokenization settings.
		if ( 'yes' === $this->get_option( 'tokenization' ) ) {
			$this->supports[] = 'tokenization';
			$this->maybe_init_deposits();
		}
	}

	/**
	 * Save the payment method to the database.
	 *
	 * @return bool Whether the payment method was saved successfully.
	 */
	public function add_payment_method() {
		$token = new WC_Payment_Token_Dummy();
		$token->set_token( 'dummy-' . $this->get_option( 'result' ) );
		$token->set_gateway_id( $this->id );
		$token->set_user_id( get_current_user_id() );
		return $token->save();
	}

	/**
	 * Display the payment fields for the shortcode checkout page.
	 *
	 * Modifies the payment fields displayed on the checkout page to include
	 * the any saved payment methods and the option to save a new payment method.
	 */
	public function payment_fields() {
		$description = $this->get_description();

		if ( $description ) {
			// KSES is ran within get_description, but not here since there may be custom HTML returned by extensions.
			echo wpautop( wptexturize( $description ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		if ( $this->supports( 'tokenization' ) && is_checkout() ) {
			$this->tokenization_script();
			$this->saved_payment_methods();
			$this->save_payment_method_checkbox();
		}
	}

	/**
	 * Process the payment and return the result.
	 *
	 * @param  int  $order_id
	 * @return array
	 */
	public function process_payment( $order_id ) {

		$payment_result = $this->get_option( 'result' );
		$order = wc_get_order( $order_id );

		if ( $this->supports( 'tokenization' ) && isset( $_POST['wc-dummy-payment-token' ] ) ) {
			// Get the token from the database.
			$token = WC_Payment_Tokens::get( wc_clean( $_POST['wc-dummy-payment-token'] ) );

			if ( $token->get_user_id() === get_current_user_id() ) {
				// Use the token result to override the value from the settings.
				$token_data = $token->get_data();
				$payment_result = substr( $token_data['token'], 6 );
			}
		}

		if ( 'success' === $payment_result ) {
			// Handle pre-orders charged upon release.
			if (
					class_exists( 'WC_Pre_Orders_Order' )
					&& WC_Pre_Orders_Order::order_contains_pre_order( $order )
					&& WC_Pre_Orders_Order::order_will_be_charged_upon_release( $order )
			) {
				// Mark order as tokenized (no token is saved for the dummy gateway).
				$order->update_meta_data( '_wc_pre_orders_has_payment_token', '1' );
				$order->save_meta_data();
				WC_Pre_Orders_Order::mark_order_as_pre_ordered( $order );
			} else {
				$this->maybe_capture_order_token( $order );
				$order->payment_complete();
			}

			// Remove cart
			WC()->cart->empty_cart();

			// Add payment method for tokenization.
			if (
				$this->order_requires_user_payment_method( $order )
				||
				(
					isset( $_POST['wc-dummy-new-payment-method'] )
					&& $_POST['wc-dummy-new-payment-method']
				)
			) {
				$this->add_payment_method();
			}

			// Return thankyou redirect
			return array(
				'result' 	=> 'success',
				'redirect'	=> $this->get_return_url( $order )
			);
		} else {
			/*
			 * Add payment method for tokenization.
			 *
			 * Doing this for failed purchases is not normal but it is done
			 * here in the dummy gateway to allow for the storing of tokens
			 * with a `failure` result.
			 *
			 * Please do not use this as example of how to handle token
			 * storage for failed results in your own payment gateway.
			 */
			if (
				$this->order_requires_user_payment_method( $order )
				||
				(
					isset( $_POST['wc-dummy-new-payment-method'] )
					&& $_POST['wc-dummy-new-payment-method']
				)
			) {
				$this->add_payment_method();
			}
			// As above, this is not normal for a failed payment.
			$this->maybe_capture_order_token( $order );

			$message = __( 'Order payment failed. To make a successful payment using Dummy Payments, please review the gateway settings.', 'woocommerce-gateway-dummy' );
			$order->update_status( 'failed', $message );
			throw new Exception( $message );
		}
	}

	/**
	 * Process subscription payment.
	 *
	 * @param  float     $amount
	 * @param  WC_Order  $order
	 * @return void
	 */
	public function process_subscription_payment( $amount, $order ) {
		$payment_result = $this->get_option( 'result' );

		if ( 'success' === $payment_result ) {
			$order->payment_complete();
		} else {
			$order->update_status( 'failed', __( 'Subscription payment failed. To make a successful payment using Dummy Payments, please review the gateway settings.', 'woocommerce-gateway-dummy' ) );
		}
	}

	/**
	 * Process pre-order payment upon order release.
	 *
	 * Processes the payment for pre-orders charged upon release.
	 *
	 * @param WC_Order $order The order object.
	 */
	public function process_pre_order_release_payment( $order ) {
		$payment_result = $this->get_option( 'result' );

		if ( 'success' === $payment_result ) {
			$order->payment_complete();
		} else {
			$message = __( 'Order payment failed. To make a successful payment using Dummy Payments, please review the gateway settings.', 'woocommerce-gateway-dummy' );
			$order->update_status( 'failed', $message );
		}
	}
}
