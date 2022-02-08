/* global wc_restrictions_admin_params */

jQuery( function($) {

	$.fn.csp_scripts = function() {

		$( this ).sw_select2();

		$( this ).find( '.woocommerce-help-tip, .help_tip, .tips' ).tipTip( {
			'attribute' : 'data-tip',
			'fadeIn' : 50,
			'fadeOut' : 50,
			'delay' : 200
		} );
	};

	var $restrictions_data           = $( '#restrictions_data' ),
		$restrictions_toggle_wrapper = $restrictions_data.find( '.bulk_toggle_wrapper' ),
		$restrictions_wrapper        = $restrictions_data.find( '.wc-metaboxes' ),
		$and_placeholder             = $restrictions_data.find( '.hr-section--conditions-and.temp-placeholder' ),
		restrictions_metabox_count   = $restrictions_wrapper.find( '.woocommerce_restriction' ).length,
		restrictions_removed         = false;
	/*---------------------*/
	/*  Restrictions       */
	/*---------------------*/

	if ( wc_restrictions_admin_params.post_id === '' ) {

		$restrictions_data.closest( 'table.form-table' ).removeClass( 'form-table' ).addClass( 'restrictions-form-table' );

		// Delete rule from restrictions overview table.
		$( '.wccsp-delete-restriction-rule' ).on( 'click', function() {
			return window.confirm( wc_restrictions_admin_params.i18n_delete_rule_warning );
		} );

		$( '.column-wc_actions a' ).on( 'mousedown', function() {
			$( this ).triggerHandler( 'mouseleave' );
		} );

		// Meta-Boxes - Open/close.
		$restrictions_data.on( 'click', '.wc-metabox > h3', function() {
			$( this ).parent( '.wc-metabox' ).toggleClass( 'closed' ).toggleClass( 'open' );
			$( this ).next( '.wc-metabox-content' ).stop().slideToggle( 300 );
		} );

		$restrictions_data.sw_select2();

		$( '.wc-metabox', $restrictions_data ).each( function() {

			var p = $( this );
			var c = p.find( '.wc-metabox-content' );

			if ( p.hasClass( 'closed' ) ) {
				c.hide();
			}

		} );

	} else {
		// Init custom select2 instances at product level.
		$restrictions_data.sw_select2();
	}

	/**
	 * Toggle switch class and input value.
	 */
	function toggleActiveSwitch( $toggler, $input ) {

		if ( 'yes' === $input.val() ) {
			// Disable restriction.
			$input.val( 'no' );
			$toggler.removeClass( 'woocommerce-input-toggle--enabled' ).addClass( 'woocommerce-input-toggle--disabled' );
		} else {
			// Enable restriction.
			$input.val( 'yes' );
			$toggler.removeClass( 'woocommerce-input-toggle--disabled' ).addClass( 'woocommerce-input-toggle--enabled' );
		}
	}

	/*
	 * Handle Events.
	 */
	$restrictions_data

		// Prevent open/close metabox when toggler is clicked.
		.on( 'click', '.wc-metabox > h3', function( event ) {

			if ( event.target.id === 'active-toggle' ) {
				return;
			}
		} )

		// Restriction Active toggle.
		.on( 'click', '#active-toggle', function() {

			var $toggler      = $( this ),
				$active_input = $toggler.closest( '.wc-metabox' ).find( '.wc-metabox-content > input.enabled' );

			// AJAX auto save.
			var $parent           = $toggler.closest( '.woocommerce_restriction' ),
			    restriction_id    = $parent.data( 'restriction_id' ),
			    restriction_index = $parent.data( 'index' );

			// New restriction after load.
			if ( $parent[0].className.indexOf( 'woocommerce_restriction--added' ) > -1 ) {
				toggleActiveSwitch( $toggler, $active_input );
				return false;
			}

			$toggler.addClass( 'woocommerce-input-toggle--loading' );

			var data = {
				action: 		'woocommerce_toggle_restriction',
				value:          $active_input.val(),
				post_id: 		wc_restrictions_admin_params.post_id,
				hash:           $restrictions_wrapper.attr( 'data-hash' ),
				index: 			restriction_index,
				restriction_id: restriction_id,
				security: 		wc_restrictions_admin_params.toggle_restriction_nonce
			};

			$.ajax({
				url: wc_restrictions_admin_params.wc_ajax_url,
				data: data,
				method: 'POST',
				dataType: 'json',
				complete: function() {
					$toggler.removeClass( 'woocommerce-input-toggle--loading' );
				},
				success: function( response ) {

					if ( response.errors.length > 0 ) {
						window.alert( response.errors.join( '\n\n' ) );
					} else {

						// Change the input val and update classes.
						toggleActiveSwitch( $toggler, $active_input );

						// Update the new hash.
						$restrictions_wrapper.attr( 'data-hash', response.hash );
					}

				},
				error: function() {
					// Session expired (Returns 403).
					window.alert( wc_restrictions_admin_params.i18n_toggle_session_expired );
				}
			});

			return false;
		} )

		// Restriction Remove.
		.on( 'click', '.remove_row', function( e ) {

			var $parent = $( this ).closest( '.wc-metabox' );

			$parent.find('*').off();
			$parent.remove();

			restrictions_removed = true;

			update_metaboxes();

			e.preventDefault();

		} );

		// Restriction Keyup.
		$restrictions_data

		.on( 'keyup', 'input.short_description', function() {
			$( this ).closest( '.woocommerce_restriction' ).find( 'h3 .restriction_title_inner' ).text( $( this ).val() );
		} )

		// Restriction Expand.

		.on( 'click', '.expand_all', function() {

			$restrictions_wrapper.find( '.wc-metabox' ).each( function() {

				var $this = $( this );

				$this.find( '.wc-metabox-content' ).show();
				$this.addClass( 'open' ).removeClass( 'closed' );
			} );

			return false;
		} )

		// Restriction Close.

		.on( 'click', '.close_all', function() {
			$restrictions_wrapper.find( '.wc-metabox' ).each( function() {

				var $this = $( this );

				$this.find( '.wc-metabox-content' ).hide();
				$this.addClass( 'closed' ).removeClass( 'open' );
			} );

			return false;
		} )

		// Countries Changed? Updates states selector!
		.on( 'change', 'select.csp_shipping_countries, select.csp_billing_countries', function() {

			var $countries_selector          = $( this ),
				selector_type                = $countries_selector.hasClass( 'csp_shipping_countries' ) ? 'shipping' : 'billing',
				selected_countries           = get_selections( $countries_selector ),
				$restriction_form            = $countries_selector.closest( '.condition_content, .woocommerce_restriction_form' ),
				$states_selector             = 'shipping' === selector_type ? $restriction_form.find( 'select.csp_shipping_states' ) : $restriction_form.find( 'select.csp_billing_states' ),
				$selected_states             = $states_selector.find( ':selected' ),
				selected_states              = [],
				states_data                  = 'shipping' === selector_type ? wc_restrictions_admin_params.shipping_states_data : wc_restrictions_admin_params.billing_states_data,
				state_options                = [],
				continents_data              = wc_restrictions_admin_params.continents_data,
				countries_data               = wc_restrictions_admin_params.countries_data,
				selected_countries_formatted = [];

			// Save chosen states.
			$selected_states.each( function() {
				selected_states.push( $( this ).val() );
			} );

			// Create new set of options for the States selector.
			$.each( selected_countries, function( index, country_selection ) {

				if ( country_selection.key.includes( 'continent:' ) ) {

					var continent_key          = country_selection.key.replace( 'continent:', '' ),
						countries_in_continent = continents_data[ continent_key ].countries;

					// Expand continents to the countries they include.
					$.each( countries_in_continent, function( country_index, country_in_continent_key ) {

						// Check if country is already added to avoid duplicates.
						if ( ! country_added( selected_countries_formatted, country_in_continent_key ) ) {
							selected_countries_formatted.push( { key: country_in_continent_key, value: countries_data[ country_in_continent_key ] } );
						}
					} );
				} else {

					var country_key = '';

					if ( country_selection.key.includes( 'country:' ) ) {
						country_key = country_selection.key.replace( 'country:', '' );
					} else {
						// Fallback for the country/state fields in Shipping Destination Restrictions, which do not support continents yet.
						country_key = country_selection.key;
					}

					if ( '' !== country_key ) {
						// Check if country is already added to avoid duplicates.
						if ( ! country_added( selected_countries_formatted, country_key ) ) {
							selected_countries_formatted.push( { key: country_key, value: country_selection.value } );
						}
					}
				}
			} );

			// Sort countries by name.
			selected_countries_formatted.sort( countries_states_sort );

			// Create new set of options for the States selector.
			$.each( selected_countries_formatted, function( index, country_selection ) {

				var country_state_options = [],
					country_code          = country_selection.key,
					country_name          = country_selection.value,
					country_states        = states_data[ country_code ] || false;

				if ( ! country_states || 0 === country_states.length ) {
					return true;
				}

				$.each( country_states, function( state_code, state_name ) {

					var option_value = country_code + ':' + state_code;

					country_state_options.push( {
						'id': option_value,
						'text': country_name + ' — ' + state_name,
						'selected': $.inArray( option_value, selected_states ) !== -1 ? true : false
					} );
				} );

				state_options.push( {
					'text': country_name,
					'children': country_state_options
				} );
			} );

			// Remove current state options.
			$states_selector.children().remove();

			state_options.sort( countries_states_sort );

			$states_selector.selectSW( {
				data: state_options
			} );
		} )

		// Select all/none.
		.on( 'click', '.wccsp_select_all', function() {
			var $select_field = $( this ).closest( '.select-field' );
			$select_field.find( 'select option' ).prop( 'selected', 'selected' );
			$select_field.find( 'select' ).trigger( 'change' );
			return false;
		} )

		.on( 'click', '.wccsp_select_none', function() {
			var $select_field = $( this ).closest( '.select-field' );
			$select_field.find( 'select option' ).prop( 'selected', false );
			$select_field.find( 'select' ).trigger( 'change' );
			return false;
		} )

		// Restriction Add.
		.on( 'click', 'button.add_restriction', function () {

			// Check if restriction already exists and don't allow creating multiple rules if the restriction does not permit so.

			var $restriction_select   = $( 'select.restriction_type', $restrictions_data ),
			    restriction_id        = $restriction_select.val(),
			    $applied_restrictions = $restrictions_wrapper.find( '.woocommerce_restriction_' + restriction_id ),
			    $restrictions         = $restrictions_wrapper.find( '.woocommerce_restriction' );

			// If no option is selected, do nothing.
			if ( restriction_id === '' ) {
				// If attempting to add a product-level restriction, give focus to the select box.
				if ( wc_restrictions_admin_params.post_id ) {
					$restriction_select.trigger( 'focus' );
				}
				return false;
			}

			var block_params = {
				message: 	null,
				overlayCSS: {
					background: '#fff',
					opacity: 	0.6
				}
			};

			$restrictions_data.block( block_params );

			var data = {
				action: 		'woocommerce_add_checkout_restriction',
				post_id: 		wc_restrictions_admin_params.post_id,
				index: 			restrictions_metabox_count,
				restriction_id: restriction_id,
				applied_count: 	$applied_restrictions.length,
				count: 			$restrictions.length,
				security: 		wc_restrictions_admin_params.add_restriction_nonce
			};

			restrictions_metabox_count++;

			setTimeout( function() {

				$.post( wc_restrictions_admin_params.wc_ajax_url, data, function ( response ) {

					if ( response.errors.length > 0 ) {

						window.alert( response.errors.join( '\n\n' ) );

					} else {

						$restrictions_data.trigger( 'woocommerce_before_restriction_add', response );
						$restrictions_wrapper.append( response.markup );

						var $added = $restrictions_wrapper.find( '.woocommerce_restriction' ).last();

						$added.csp_scripts();

						$added.data( 'conditions_count', 0 );

						$restrictions_toggle_wrapper.removeClass( 'disabled' );
					}

					// Once a product-level restriction has been added, reset the state of the select box.
					if ( wc_restrictions_admin_params.post_id ) {
						$restriction_select.val( '' );
					}

					$restrictions_data.unblock();
					$restrictions_data.trigger( 'woocommerce_restriction_added', response );

				}, 'json' );

			}, 250 );

			return false;
		} )

		.on( 'woocommerce_before_restriction_add', function() {
			// Hide boarding if exists.
			$restrictions_data.removeClass( 'restrictions_data--empty' );
		} )

		.on( 'change', 'input.show_excluded_in_checkout', function() {

			var $show_excluded         = $( this ),
			    $show_excluded_checked = $show_excluded.is( ':checked' ),
			    $restriction_data      = $show_excluded.closest( '.woocommerce_restriction_data' ),
			    $show_if_excluded      = $restriction_data.find( '.show-excluded-checked' );


			if ( $show_excluded_checked ) {
				$show_if_excluded.show();
			} else {
				$show_if_excluded.hide();
			}

		} );

	/*---------------------*/
	/*  Conditions         */
	/*---------------------*/

	var condition_row_templates         = {},
		condition_row_content_templates = {};

	// Initialize.
	$restrictions_wrapper.find( '.woocommerce_restriction' ).each( function() {
		var conditions_count = $( this ).find( '.restriction_conditions .condition_row' ).length;
		$( this ).data( 'conditions_count', conditions_count );
	} );

	/*
	 * Handle Events.
	 */
	$restrictions_data

		// Clear tiptip.
		.on( 'mousedown', '.condition_remove .trash', function () {
			$( this ).triggerHandler( 'mouseleave' );
		} )

		// Condition Remove.
		.on( 'click', '.condition_remove .trash', function ( e ) {
			e.preventDefault();
			var $condition_row = $( this ).closest( '.condition_row' );

			$condition_row.next( '.hr-section--conditions-and' ).remove();
			$condition_row.remove();

			return true;
		} )

		// Condition Modifier Change.
		.on( 'change', '.condition_modifier select', function () {

			var $modifier_select       = $( this ),
			    $condition_row_values  = $modifier_select.closest( '.condition_row_inner' ).find( '.condition_value' ),
			    zero_config_mods       = $modifier_select.data( 'zero_config_mods' ),
			    has_conditional_values = $modifier_select.hasClass( 'has_conditional_values' );

			if ( zero_config_mods ) {

				var value                 = $modifier_select.val(),
				    $no_input             = $condition_row_values.filter( '.condition--disabled' ),
				    $config_input         = $condition_row_values.not( '.condition--disabled' );

				if ( zero_config_mods.indexOf( value ) > -1 ) {
					$no_input.show();
					$config_input.hide();
				} else {
					$no_input.hide();
					$config_input.show();
				}
			}

			if ( has_conditional_values ) {
				var modifier_value        = $modifier_select.val(),
					value_input_name      = $modifier_select.attr( 'data-value_input_name' );

				// Let's see if the selected value exists in any value modifiers
				$.each( $condition_row_values, function ( index, row ) {
					var $row          = $( row ),
					    row_modifiers = $row.attr( 'data-modifiers' ).split( ',' ),
					    matched       = $.inArray( modifier_value, row_modifiers ),
					    field         = $row.find( '.csp_conditional_values_input' );

					$row.hide();
					field.attr( 'name', '' );

					// Is we have a match
					if ( -1 !== matched ) {
						field.attr( 'name', value_input_name );
						$row.show();
					}
				} );
			}
		} )

		// Condition Add.
		.on( 'change', '.condition_add select.condition_type', function () {

			// Check if placeholder for new condition is selected.
			var $selector    = $( this ),
				condition_id = $selector.val();

			if ( 'add_condition' === condition_id ) {
				return false;
			}

			var
				$restriction                           = $selector.closest( '.woocommerce_restriction' ),
				restriction_id                         = $restriction.data( 'restriction_id' ),
				restriction_index                      = parseInt( $restriction.data( 'index' ) ),
				condition_index                        = parseInt( $restriction.data( 'conditions_count' ) ),
				condition_row_template                 = get_condition_row_template( restriction_id ),
				$restriction_conditions_list           = $restriction.find( '.restriction_conditions_list' ),
				condition_row_default_content_template = get_condition_row_content_template( restriction_id, condition_id );

			if ( ! condition_row_template || ! condition_row_default_content_template ) {
				return false;
			}

			var $new_condition_row_content = condition_row_default_content_template( {
				restriction_index: restriction_index,
				condition_index:   condition_index
			} );

			var $new_condition_row = condition_row_template( {
				condition_index:   condition_index,
				condition_content: $new_condition_row_content
			} );

			$restriction.data( 'conditions_count', condition_index + 1 );

			$restriction_conditions_list.append( $new_condition_row );

			var $added = $restriction.find( '.restriction_conditions_list .condition_row' ).last();

			$and_placeholder.clone().removeClass( 'temp-placeholder' )
				.appendTo( $restriction_conditions_list );

			// We have to make the appropriate condition_id selected in the condition_type select.
			$added.find( '.condition_type option[value="' + condition_id + '"]' ).prop( 'selected', 'selected' );

			$added.csp_scripts();

			// Change condition_add select back to placeholder.
			$selector.find( 'option[value="add_condition"]' ).prop( 'selected', 'selected' );

			return false;

		} )

		// Condition Change.
		.on( 'change', '.restriction_conditions_list select.condition_type', function () {

			var $selector                      = $( this ),
				condition_id                   = $selector.val(),
				$restriction                   = $selector.closest( '.woocommerce_restriction' ),
				restriction_id                 = $restriction.data( 'restriction_id' ),
				restriction_index              = parseInt( $restriction.data( 'index' ) ),
				$condition                     = $selector.closest( '.condition_row' ),
				condition_index                = parseInt( $condition.data( 'condition_index' ) ),
				condition_row_content_template = get_condition_row_content_template( restriction_id, condition_id );

			if ( ! condition_row_content_template ) {
				return false;
			}

			var $new_condition_row_content = condition_row_content_template( {
				restriction_index: restriction_index,
				condition_index:   condition_index
			} );

			$condition.find( '.condition_content' ).html( $new_condition_row_content ).addClass( 'added' );

			var $added = $condition.find( '.added' );

			$added.csp_scripts();

			$added.removeClass( 'added' );

			return false;
		} );

	/**
	 * Get select2 values.
	 */
	function get_selections( $target ) {

		var selection_data = $target.selectSW( 'data' ),
			values         = [];

		$.each( selection_data, function( index, data ) {
			values.push( { 'key': data.id, 'value': data.text } );
		} );

		return values;

	}

	/**
	 * Check if a country is already added in the condition data.
	 */
	function country_added( countries, country_code ) {

		var found = false;

		$.each( countries, function( index, country ) {
			if ( country.key === country_code ) {
				found = true;
				return false;
			}
		} );

		return found;
	}

	/**
	 * Sorting function for objects based on properties.
	 */
	function countries_states_sort( a, b ) {
		var result = 0;

		if ( a.hasOwnProperty( 'text' ) && b.hasOwnProperty( 'text' ) ) {
			if ( a.text > b.text ) {
				result = 1;
			} else if(  b.text > a.text ) {
				result = -1;
			}
		}

		if ( a.hasOwnProperty( 'value' ) && b.hasOwnProperty( 'value' ) ) {
			if ( a.value > b.value ) {
				result = 1;
			} else if(  b.value > a.value ) {
				result = -1;
			}
		}

		return result;
	}

	/**
	 * Runtime cache for 'wp.template' calls: Condition row content templates.
	 */
	function get_condition_row_content_template( restriction_id, condition_id ) {

		var template = false;

		if ( typeof( condition_row_content_templates[ restriction_id ] ) === 'object' && typeof( condition_row_content_templates[ restriction_id ][ condition_id ] ) === 'function' ) {
			template = condition_row_content_templates[ restriction_id ][ condition_id ];
		} else {
			template = wp.template( 'wc_csp_restriction_' + restriction_id + '_condition_' + condition_id + '_content' );
			if ( typeof( condition_row_content_templates[ restriction_id ] ) === 'undefined' ) {
				condition_row_content_templates[ restriction_id ] = {};
			}
			condition_row_content_templates[ restriction_id ][ condition_id ] = template;
		}

		return template;
	}

	/**
	 * Runtime cache for 'wp.template' calls: Condition row templates.
	 */
	function get_condition_row_template( restriction_id ) {

		var template = false;

		if ( typeof( condition_row_templates[ restriction_id ] ) === 'function' ) {
			template = condition_row_templates[ restriction_id ];
		} else {
			template = wp.template( 'wc_csp_restriction_' + restriction_id + '_condition_row' );
			condition_row_templates[ restriction_id ] = template;
		}

		return template;
	}

	/**
	 * Update row indexes.
	 */
	function update_metaboxes() {

		var has_restrictions = false;

		$restrictions_wrapper.find( '.woocommerce_restriction' ).each( function( index, el ) {
			$( '.position', el ).val( index );
			$( '.restriction_title_index', el ).html( index + 1 );
			has_restrictions = true;
		} );

		if ( ! has_restrictions ) {
			$restrictions_toggle_wrapper.addClass( 'disabled' );
			$restrictions_data.addClass( 'restrictions_data--empty' );
		} else {
			$restrictions_toggle_wrapper.removeClass( 'disabled' );
			$restrictions_data.removeClass( 'restrictions_data--empty' );
		}

		if ( restrictions_removed ) {
			$restrictions_data.addClass( 'restrictions_data--removed' );
		}
	}

	/**
	 * Initialize metaboxes.
	 */
	function initialize_metaboxes() {

		// Initial order.
		var woocommerce_checkout_restrictions = $restrictions_wrapper.find( '.woocommerce_restriction' ).get();

		woocommerce_checkout_restrictions.sort( function( a, b ) {

			var compA = parseInt( $(a).attr( 'data-index' ) ),
			    compB = parseInt( $(b).attr( 'data-index' ) );

			return ( compA < compB ) ? -1 : ( compA > compB ) ? 1 : 0;
		} );

		$( woocommerce_checkout_restrictions ).each( function( idx, itm ) {
			$restrictions_wrapper.append(itm);
		} );

		update_metaboxes();

		// Component ordering.
		$restrictions_wrapper.sortable( {
			items:'.woocommerce_restriction',
			cursor:'move',
			axis:'y',
			handle: '.sort-item',
			scrollSensitivity:40,
			forcePlaceholderSize: true,
			helper: 'clone',
			opacity: 0.65,
			placeholder: 'wc-metabox-sortable-placeholder',
			start:function(event,ui){
				ui.item.css( 'background-color','#f6f6f6' );
			},
			stop:function(event,ui){
				ui.item.removeAttr( 'style' );
				update_metaboxes();
			}
		} );
	}

	// Init metaboxes.
	initialize_metaboxes();
} );
