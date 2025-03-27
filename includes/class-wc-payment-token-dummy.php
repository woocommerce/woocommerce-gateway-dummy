<?php

class WC_Payment_Token_Dummy extends WC_Payment_Token {

	/**
	 * Token Type.
	 *
	 * @var string
	 */
	protected $type = 'dummy';

	/**
	 * Validate the token.
	 *
	 * @return bool True if token is valid.
	 */
	public function validate () {
		if ( false === parent::validate() ) {
			return false;
		}

		$gateways = WC()->payment_gateways->payment_gateways();
		if ( ! isset( $gateways[ 'dummy' ] ) ) {
			return false;
		}

		$gateway = $gateways[ 'dummy' ];

		if ( ! $gateway->enabled === 'yes' ) {
			return false;
		}

		if ( ! $gateway->supports( 'tokenization' ) ) {
			return false;
		}

		if ( $gateway->get_option( 'result' ) !== 'success' ) {
			return false;
		}

		return true;
	}

	/**
	 * Get display name for the token.
	 *
	 * @param string $deprecated
	 * @return string Display name.
	 */
	public function get_display_name( $deprecated = '' ) {
		$token_data     = $this->get_data();
		$payment_result = substr( $token_data['token'], 6 );

		return sprintf(
			/* translators: 1. Payment token ID, 2. Payment token result */
			__( 'Dummy Payment Token %s (%s)', 'woocommerce-gateway-dummy' ),
			$this->get_id() ? '#' . $this->get_id() : '',
			$payment_result
		);
	}
}
