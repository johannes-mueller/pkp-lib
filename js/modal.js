/**
 * modal.js
 *
 * Copyright (c) 2000-2010 John Willinsky
 * Distributed under the GNU GPL v2. For full terms see the file docs/COPYING.
 *
 * Implementation of jQuery modals and other JS backend functions.
 */

/**
 * modal
 * @param url String URL to load into the modal
 * @param actType String Type to define if callback should do (nothing|append|replace|remove)
 * @param actOnId String The ID on which to perform the action on callback
 * @param localizedButtons Array of translated 'Cancel/submit' strings
 * @param callingElement String Selector of the element that triggers the modal
 * @param dialogTitle String Set a custom title for the dialog
 */
function modal(url, actType, actOnId, localizedButtons, callingElement, dialogTitle) {
	$(function() {
		var validator = null;
		var title = dialogTitle ? dialogTitle : $(callingElement).text();
		var okButton = localizedButtons[0];
		var cancelButton = localizedButtons[1];
		var d = new Date();
		var UID = Math.ceil(1000 * Math.random(d.getTime()));
		var formContainer = '#' + UID;

		// Construct action to perform when OK and Cancels buttons are clicked
		var dialogOptions = {};
		if (actType == 'nothing') {
			// If the action type is 'nothing' then simply close the
			// dialog when the OK button is pressed. No cancel button
			// is needed.
			dialogOptions[okButton] = function() {
				$(this).dialog("close");
			};
		} else {
			// All other action types will assume that there is a
			// form to be posted and post it.
			dialogOptions[okButton] = function() {
				submitJsonForm(formContainer, actType, actOnId);
			};
			dialogOptions[cancelButton] = function() {
				$(this).dialog("close");
			};
		}

		// Construct dialog
		var $dialog = $('<div id=' + UID + '></div>').dialog({
			title: title,
			autoOpen: false,
			width: 700,
			modal: true,
			draggable: false,
			resizable: false,
			position: ['center', 100],
			buttons: dialogOptions,
			open: function(event, ui) {
		        $(this).css({'max-height': 600, 'overflow-y': 'auto', 'z-index': '10000'});
				$.getJSON(url, function(jsonData) {
					$('#loading').hide();
					if (jsonData.status === true) {
						$('#' + UID).html(jsonData.content);
					} else {
						// Alert that the modal failed
						alert(jsonData.content);
					}
				});
				$(this).html("<div id='loading' class='throbber'></div>");
				$('#loading').show();
			},
			close: function() {
				// Reset form validation errors and inputs on close
				if (validator != null) {
					validator.resetForm();
				}
				clearFormFields($(formContainer).find('form'));
			}
		});

		// Open the modal when the even is triggered on the calling element.
		$(callingElement).die('click').live('click', function() {
			$dialog.dialog('open');
			return false;
		});
	});
}

/**
 * Opens a modal confirm box.
 * @param url String URL to load into the modal
 * @param actType String Type to define if callback should do (nothing|append|replace|remove)
 * @param actOnId String The ID on which to perform the action on callback
 * @param dialogText String Text to display in the dialog
 * @param localizedButtons Array of translated 'Cancel/submit' strings
 * @param callingButton String Selector of the button that opens the modal
 * @param title String
 * @param isForm Boolean whether to interpret the actOnId as a form container and
 *  submit it as a form.
 */
function modalConfirm(url, actType, actOnId, dialogText, localizedButtons, callingButton, title, isForm) {
	$(function() {
		if (!title) {
			// Try to retrieve title from calling button's text.
			title = $(callingButton).text();
			if (title === '') {
				// Try to retrieve title from calling button's title attribute.
				title = $(callingButton).attr('title');
			}
		}
		var okButton = localizedButtons[0];
		var cancelButton = localizedButtons[1];
		var d = new Date();
		var UID = Math.ceil(1000 * Math.random(d.getTime()));
		// Construct action to perform when OK and Cancels buttons are clicked
		var dialogOptions = {};
		if(url == null) {
			// Show a simple alert dialog (does not communicate with server)
			dialogOptions[okButton] = function() {
				$(this).dialog("close");
			};
		} else {
			dialogOptions[okButton] = function() {
				if (isForm) {
					// Interpret the "act on id" as a form to
					// be posted.
					submitJsonForm(actOnId, actType, actOnId, url);
				} else {
					// Trigger start event.
					$(actOnId).triggerHandler('actionStart');

					// Post to server and construct callback
					$.post(url, '', function(returnString) {
						// Trigger stop event
						$(actOnId).triggerHandler('actionStop');
	
						if (returnString.status) {
							if(returnString.isScript) {
								eval(returnString.script);
							} else {
								updateItem(actType, actOnId, returnString.content);
							}
						} else {
							// Alert that the action failed
							confirm(null, null, null, returnString.content, localizedButtons, callingButton);
						}
					}, 'json');
				}
				$('#'+UID).dialog("close");
			};
			dialogOptions[cancelButton] = function() {
				$(actOnId).triggerHandler('actionStop');
				$(this).dialog("close");
			};
		}

		// Construct dialog
		var $dialog = $('<div id=' + UID + '>'+dialogText+'</div>').dialog({
			title: title,
			autoOpen: false,
			modal: true,
			draggable: false,
			buttons: dialogOptions
		});

		// Tell the calling button to open this modal on click
		$(callingButton).live("click", function() {
			$dialog.dialog('open');
			return false;
		});
	});
}

/**
 * Submit a form that returns JSON data.
 * @param formContainer String Selector of the element containing the form to be submitted, e.g. a modal's ID (must include '#')
 * @param actType String Type to define if callback should do (nothing|append|replace|remove)
 * @param actOnId String The ID on which to perform the action on callback
 * @param url String the URL to submit to
 */
function submitJsonForm(formContainer, actType, actOnId, url) {
	// jQuerify the form container and find the form in it.
	$formContainer = $(formContainer);
	$form = $formContainer.find('form');
	validator = $form.validate();

	if (!url) {
		url = $form.attr('action');
	}
	
	// Post to server and construct callback
	if ($form.valid()) {
		// Trigger start event.
		$(actOnId).triggerHandler('actionStart');
		
		$.post(
			url,
			$form.serialize(),
			function(jsonData) {
				// Trigger stop event.
				$(actOnId).triggerHandler('actionStop');
				if(jsonData.isScript == true) {
					eval(jsonData.script);
				}
				if (jsonData.status == true) {
					$updatedElement = updateItem(actType, actOnId, jsonData.content);
					if (typeof($formContainer.dialog) == 'function') {
						$formContainer.dialog('close');
					}
					$formContainer.triggerHandler('submitSuccessful', [$updatedElement]);
				} else {
					// If an error occurs then redisplay the form
					$formContainer.html(jsonData.content);
					$formContainer.triggerHandler('submitFailed');
				}
			},
			"json"
		);
		validator = null;
	}
}

/**
 * Display a simple alert dialog
 * @param dialogText String Text to display in the dialog
 * @param localizedButtons Array of translated 'Cancel/submit' strings
 */
function modalAlert(dialogText, localizedButtons) {
		var localizedText = new Array();
		localizedText = localizedButtons.split(',');
		var okButton = localizedText[0];
		if (localizedText[1]) {
			var title = localizedText[1];
		} else {
			var title = "Alert";
		}
		var d = new Date();
		var UID = Math.ceil(1000 * Math.random(d.getTime()));

		// Construct action to perform when OK button is clicked
		var dialogOptions = {};
		dialogOptions[okButton] = function() {
			$(this).dialog("close");
		};

		// Construct dialog
		var $dialog = $('<div id=' + UID + '>'+dialogText+'</div>').dialog({
			title: title,
			autoOpen: false,
			modal: true,
			draggable: false,
			buttons: dialogOptions
		});

		$dialog.dialog('open');
		return false;
}

/**
 * FIXME: document
 */
function changeModalFormLocale() {
	oldLocale = $("#currentLocale").val();
	newLocale = $("#formLocale").val();

	$("#currentLocale").val(newLocale);
	$("."+oldLocale).hide();
	$("."+newLocale).show("normal");
}

/**
 * Clear all fields of a form.
 * @param form jQuery
 */
function clearFormFields(form) {
	$(':input', form).each(function() {
		if(!$(this).is('.static')) {
			switch(this.type) {
				case 'password':
				case 'select-multiple':
				case 'select-one':
				case 'text':
				case 'textarea':
					$(this).val('');
					break;
				case 'checkbox':
				case 'radio':
					this.checked = false;
			}
		}
	});
}

/**
 * Implements a generic ajax action.
 *
 * NB: Please make sure you correctly unbind previous ajax action events
 * before you call this method.
 *
 * @param actType String can be either 'get' or 'post', 'post' expects a form as
 *  a child element of 'actOnId' if no form has been explicitly given.
 * @param callingElement String selector of the element that triggers the ajax call
 * @param url String the url to be called, defaults to the form action in case of
 *  action type 'post'.
 * @param data Array (post action type only) the data to be posted, defaults to
 *  the form data.
 * @param eventName String the name of the event that triggers the action, default 'click'.
 * @param form String the selector of a form element.
 */
function ajaxAction(actType, actOnId, callingElement, url, data, eventName, form) {
	if (actType == 'post') {
		eventHandler = function() {
			// jQuerify the form.
			var $form;
			if (form) {
				$form = $(form);
			} else {
				$form = $(actOnId).find('form');
			}

			// Set default url and data if none has been given.
			if (!url) {
				url = $form.attr("action");
			}
			if (!data) {
				data = $form.serialize();
			}

			// Validate
			validator = $form.validate();

			// Post to server and construct callback
			if ($form.valid()) {
				$actOnId = $(actOnId);
				$actOnId.triggerHandler('actionStart');
				$.post(
					url,
					data,
					function(jsonData) {
						$actOnId.triggerHandler('actionStop');
						if (jsonData !== null) {
							if (jsonData.status === true) {
								$actOnId.replaceWith(jsonData.content);
							} else {
								// Alert that the action failed
								alert(jsonData.content);
							}
						}
					},
					'json'
				);
				validator = null;
			}
			return false;
		};
	} else {
		eventHandler = function() {
			$actOnId = $(actOnId);
			$actOnId.triggerHandler('actionStart');
			$.getJSON(
				url,
				function(jsonData) {
					$actOnId.triggerHandler('actionStop');
					if (jsonData !== null) {
						if (jsonData.status === true) {
							$actOnId.replaceWith(jsonData.content);
						} else {
							// Alert that the action failed
							alert(jsonData.content);
						}
					}
				}
			);
			return false;
		};
	}

	if (!eventName) eventName = 'click';
	$(callingElement).each(function() {
		// NB: We cannot unbind previous events here as this
		// may delete other legitimate events. Please make sure
		// you correctly unbind previous ajax action events
		// before you call this method. We also don't use
		// live() here because it doesn't support all required
		// selectors.
		$(this).bind(eventName, eventHandler);
	});
}

/**
 * Binds to the "actionStart" event to delete
 * the current contents of the actOnId
 * element and show a throbber instead.
 * @param actOnId the element to be filled with the throbber image.
 */
function actionThrobber(actOnId) {
	$(actOnId)
		.bind('actionStart', function() {
			// Start throbber.
			$(this).unbind('actionStart').html('<div id="actionThrobber" class="throbber"></div>');
			$('#actionThrobber').show();
		})
		.bind('actionStop', function() {
			// Remove all handlers.
			$(this).unbind('actionStart').unbind('actionStop');
		});
}

/**
 * Update the DOM of a grid or list depending on the action type.
 *
 * NB: This relies on an element with class "empty" being
 * present as a child of a table element. Make sure you use an
 * appropriate DOM for this to work.
 *
 * @param actType String one of the action type constants.
 * @param actOnId Selector for the DOM element to be changed.
 * @param content The content that replaces the current DOM element (replace or append types only)
 * @return jQuery the new or deleted element.
 */
function updateItem(actType, actOnId, content) {
	var updatedItem;
	switch (actType) {
		case 'append':
			$empty = $(actOnId).closest('table').children('.empty');
			$empty.hide();
			updatedItem = $(actOnId).append(content).children().last();
			break;
		case 'replace':
			updatedItem = $(actOnId).replaceWith(content);
			break;
		case 'remove':
			if ($(actOnId).siblings().length == 0) {
				updatedItem = deleteElementById(actOnId, true);
			} else {
				updatedItem = deleteElementById(actOnId);
			}
			break;
		case 'nothing':
			updatedItem = null
			break;
		case 'redirect':
			// redirect to the content
			$(window.location).attr('href', content);
			updatedItem = null
			break;
	}

	// Trigger custom event so that clients can take
	// additional action.
	$(actOnId).triggerHandler('updatedItem', [actType]);
	return updatedItem;
}

/**
 * Deletes the given grid or list element from the DOM.
 *
 * NB: This relies on an element with class "empty" being
 * present as a child of a table element. Make sure you use an
 * appropriate DOM for this to work.
 *
 * @param element String a selector for the element to delete.
 * @param showEmpty Boolean whether to show the "empty" element.
 * @return jQuery the deleted element
 */
function deleteElementById(element, showEmpty) {
	$deletedElement = $(element);
	if (showEmpty) {
		var $emptyPlaceholder = $deletedElement.closest('table').children('.empty');
	}
	$deletedElement.fadeOut(500, function() {
		$(this).remove();
		if (showEmpty) {
			$emptyPlaceholder.fadeIn(500);
		}
	});
	return $deletedElement;
}

/**
 * FIXME: document
 * @param url String
 * @param actOnType String
 * @param actOnId String
 * @param tabContainer String
 * @param reopen Boolean
 */
function saveAndUpdate(url, actOnType, actOnId, tabContainer, reopen) {
	$.post(url, null, function(returnString) {
		if (returnString.status == true) {
			updateItem(actOnType, actOnId, returnString.content);
			$(tabContainer).parent().dialog('close');
			if (reopen == true) {
				$(tabContainer).last().parent().dialog('open');
			}
		} else {
			// Display errors in error list
			$('#formErrors .formErrorList').html(returnString.content);
		}
	}, "json");
}

/**
 * Implement the "extras on demand" design pattern for a list
 * of option blocks. Clicking on the header of the extras section
 * will toggle the section open and closed.
 * @param actOnId String a selector that contains the options header
 *  and options blocks.
 */
function extrasOnDemand(actOnId) {
	/**
	 * Shows the extra options.
	 */
	function activateExtraOptions() {
		// Hide the inactive version of the option header text.
		$(actOnId + ' .options-head .option-block-inactive').hide();
		// Show the active version of the option header text and the option blocks.
		$(actOnId + ' .options-head .option-block-active, ' + actOnId + ' .option-block').show();
		// Adapt styling of the option header.
		$(actOnId + ' .options-head').removeClass('inactive').addClass('active');
		// Change the header icon into a triangle pointing downwards.
		$(actOnId + ' .ui-icon').removeClass('ui-icon-triangle-1-e').addClass('ui-icon-triangle-1-s');
		// Scroll the parent so that all extra options are visible.
		scrollToMakeVisible(actOnId);
	}
	
	/**
	 * Hides the extra options.
	 */
	function deactivateExtraOptions() {
		// Hide the active version of the option header text and the option blocs.
		$(actOnId + ' .options-head .option-block-active, ' + actOnId + ' .option-block').hide();
		// Show the inactive version of the option header text.
		$(actOnId + ' .options-head .option-block-inactive').show();
		// Adapt styling of the option header.
		$(actOnId + ' .options-head').removeClass('active').addClass('inactive');
		// Change the header icon into a triangle pointing to the right.
		$(actOnId + ' .ui-icon').removeClass('ui-icon-triangle-1-s').addClass('ui-icon-triangle-1-e');
	}
	
	// De-activate the extra options on startup.
	deactivateExtraOptions();
	
	// Toggle the options when clicking on the header.
	$(actOnId + ' .options-head').click(function() {
		if ($(this).hasClass('active')) {
			deactivateExtraOptions();
		} else {
			activateExtraOptions();
		}
	});
}

/**
 * Scroll a scrollable element to make the
 * given content element visible. The content element
 * must be a descendant of a scrollable
 * element (needs to have class "scrollable").
 * 
 * NB: This method depends on the position() method
 * to refer to the same parent element for both the
 * content element and the scrollable element.
 * 
 * @param actOnId String a selector to identify
 *  the element to be made visible. 
 */
function scrollToMakeVisible(actOnId) {
	// jQuerify the element to be made visible.
	var $contentBlock = $(actOnId);
	
	// Identify the scrollable element.
	var $scrollable = $contentBlock.closest('.scrollable');
	
	var contentBlockTop = $contentBlock.position().top;
	var scrollingBlockTop = $scrollable.position().top;
	var currentScrollingTop = $scrollable.scrollTop();

	// Do we have to scroll down or scroll up?
	if (contentBlockTop > scrollingBlockTop) {
		// Consider scrolling down...
		
		// Calculate the number of hidden pixels of the child
		// element within the scrollable element.
		var hiddenPixels = Math.ceil(contentBlockTop + $contentBlock.height() - $scrollable.height());
		
		// Scroll down if parts or all of the content block are hidden.
		if (hiddenPixels > 0) {
			$scrollable.scrollTop(currentScrollingTop + hiddenPixels);
		}
	} else {
		// Scroll up...
		
		// Calculate the new scrolling top.
		var newScrollingTop = Math.max(Math.floor(currentScrollingTop + contentBlockTop - scrollingBlockTop), 0);

		// Set the new scrolling top.
		$scrollable.scrollTop(newScrollingTop);
	}
}

/**
 * Custom jQuery plug-in that marks the matched elements
 * Code adapted from phpBB, thanks to the phpBB group.
 * @returns jQuery
 */
$.fn.selectRange = function() {
	return this.each(function() {
		// Not IE
		if (window.getSelection) {
			var s = window.getSelection();
			// Safari
			if (s.setBaseAndExtent) {
				s.setBaseAndExtent(this, 0, this, this.innerText.length - 1);
			}
			// Firefox and Opera
			else {
				if (window.opera
						&& this.innerHTML.substring(this.innerHTML.length - 4) == '<BR>') {
					this.innerHTML = this.innerHTML + '&nbsp;';
				}
	
				var r = document.createRange();
				r.selectNodeContents(this);
				s.removeAllRanges();
				s.addRange(r);
			}
		}
		// Some older browsers
		else if (document.getSelection) {
			var s = document.getSelection();
			var r = document.createRange();
			r.selectNodeContents(this);
			s.removeAllRanges();
			s.addRange(r);
		}
		// IE
		else if (document.selection) {
			var r = document.body.createTextRange();
			r.moveToElementText(this);
			r.select();
		}
	});
}