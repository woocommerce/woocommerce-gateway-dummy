
import { sprintf, __ } from '@wordpress/i18n';
import { registerPaymentMethod } from '@woocommerce/blocks-registry';
import { decodeEntities } from '@wordpress/html-entities';
import { getSetting } from '@woocommerce/settings';

const settings = getSetting( 'dummy_data', {} );

const defaultLabel = __(
	'Dummy Payments',
	'woo-gutenberg-products-block'
);

const label = decodeEntities( settings.title ) || defaultLabel;

/**
 * Content component
 */
const Content = () => {
	return decodeEntities( settings.description || '' );
};

const SavedPaymentContent = ( props ) => {
	const supportsTokenization = settings.supports.includes( 'tokenization' );

	if ( ! supportsTokenization ) {
		return null;
	}

	return (
		<div style={
			{
				border: '1px solid #ccc',
				borderTop: 'none',
				padding: '1rem',
				marginTop: '-16px',
			}
		}>
			<p>
				<small>{ __( 'For testing tokenization support', 'woocommerce-gateway-dummy' ) }</small>
			</p>
		</div>
	);
};

/**
 * Label component
 *
 * @param {*} props Props from payment API.
 */
const Label = ( props ) => {
	const { PaymentMethodLabel } = props.components;
	return <PaymentMethodLabel text={ label } />;
};

/**
 * Dummy payment method config object.
 */
const Dummy = {
	name: "dummy",
	label: <Label />,
	content: <Content />,
	savedTokenComponent: <SavedPaymentContent />,
	edit: <Content />,
	canMakePayment: () => true,
	ariaLabel: label,
	supports: {
		features: settings.supports,
		showSavedCards: true,
		showSaveOption: true,
	},
};

registerPaymentMethod( Dummy );
