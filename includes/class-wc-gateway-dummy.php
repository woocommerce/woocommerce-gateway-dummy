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
 * @version  1.0.7
 */
class WC_Gateway_Dummy extends WC_Payment_Gateway {

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
			)
		);
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

		if ( 'success' === $payment_result ) {
			// Handle pre-orders charged upon release.
			if (
					class_exists( 'WC_Pre_Orders_Order' )
					&& WC_Pre_Orders_Order::order_contains_pre_order( $order )
					&& WC_Pre_Orders_Order::order_will_be_charged_upon_release( $order )
			) {
				// Mark order as tokenized.
				$order->update_meta_data( '_wc_pre_orders_has_payment_token', '1' );
				$order->save_meta_data();
				WC_Pre_Orders_Order::mark_order_as_pre_ordered( $order );
			} else {
				$order->payment_complete();
			}

			// Remove cart
			WC()->cart->empty_cart();

			// Return thankyou redirect
			return array(
				'result' 	=> 'success',
				'redirect'	=> $this->get_return_url( $order )
			);
		} else {
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
