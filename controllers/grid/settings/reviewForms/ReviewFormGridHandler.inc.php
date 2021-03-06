<?php

/**
 * @file controllers/grid/settings/reviewForms/ReviewFormGridHandler.inc.php
 *
 * Copyright (c) 2014 Simon Fraser University Library
 * Copyright (c) 2000-2014 John Willinsky
 * Distributed under the GNU GPL v2. For full terms see the file docs/COPYING.
 *
 * @class ReviewFormGridHandler
 * @ingroup controllers_grid_settings_reviewForms
 *
 * @brief Handle review form grid requests.
 */

import('lib.pkp.classes.controllers.grid.GridHandler');

import('lib.pkp.controllers.grid.settings.reviewForms.ReviewFormGridRow');

import('lib.pkp.controllers.grid.settings.reviewForms.form.ReviewFormForm');
import('lib.pkp.controllers.grid.settings.reviewForms.form.ReviewFormElements');

import('lib.pkp.controllers.grid.settings.reviewForms.form.PreviewReviewForm');

class ReviewFormGridHandler extends GridHandler {
	/**
	 * Constructor
	 */
	function ReviewFormGridHandler() {
		parent::GridHandler();
		$this->addRoleAssignment(
			array(ROLE_ID_MANAGER),
			array('fetchGrid', 'fetchRow', 'createReviewForm', 'editReviewForm', 'updateReviewForm',
				'reviewFormBasics', 'reviewFormElements', 'copyReviewForm',
				'reviewFormPreview', 'activateReviewForm', 'deactivateReviewForm', 'deleteReviewForm',
				'saveSequence')
		);
	}


	//
	// Implement template methods from PKPHandler.
	//
	/**
	 * @see PKPHandler::initialize()
	 */
	function initialize($request) {
		// Load user-related translations.
		AppLocale::requireComponents(
			LOCALE_COMPONENT_APP_ADMIN,
			LOCALE_COMPONENT_APP_MANAGER,
			LOCALE_COMPONENT_APP_COMMON,
			LOCALE_COMPONENT_PKP_USER,
			LOCALE_COMPONENT_PKP_GRID,
			LOCALE_COMPONENT_PKP_MANAGER
		);

		// Basic grid configuration.
		$this->setTitle('manager.reviewForms');

		// Grid actions.
		$router = $request->getRouter();

		import('lib.pkp.classes.linkAction.request.AjaxModal');
		$this->addAction(
			new LinkAction(
				'createReviewForm',
				new AjaxModal(
					$router->url($request, null, null, 'createReviewForm', null, null),
					__('manager.reviewForms.create'),
					'modal_add_item',
					true
					),
				__('manager.reviewForms.create'),
				'add_item')
		);

		//
		// Grid columns.
		//
		import('lib.pkp.controllers.grid.settings.reviewForms.ReviewFormGridCellProvider');
		$reviewFormGridCellProvider = new ReviewFormGridCellProvider();

		// Review form name.
		$this->addColumn(
			new GridColumn(
				'name',
				'manager.reviewForms.title',
				null,
				null,
				$reviewFormGridCellProvider
			)
		);

		// Review Form 'in review'
		$this->addColumn(
			new GridColumn(
				'inReview',
				'manager.reviewForms.inReview',
				null,
				null,
				$reviewFormGridCellProvider
			)
		);

		// Review Form 'completed'.
		$this->addColumn(
			new GridColumn(
				'completed',
				'manager.reviewForms.completed',
				null,
				null,
				$reviewFormGridCellProvider
			)
		);

		// Review form 'activate/deactivate'
		// if ($element->getActive()) {
		$this->addColumn(
			new GridColumn(
				'active',
				'common.active',
				null,
				'controllers/grid/common/cell/selectStatusCell.tpl',
				$reviewFormGridCellProvider
			)
		);
	}

	/**
	 * @see PKPHandler::authorize()
	 */
	function authorize($request, &$args, $roleAssignments) {
		import('lib.pkp.classes.security.authorization.PolicySet');
		$rolePolicy = new PolicySet(COMBINING_PERMIT_OVERRIDES);

		import('lib.pkp.classes.security.authorization.RoleBasedHandlerOperationPolicy');
		foreach($roleAssignments as $role => $operations) {
			$rolePolicy->addPolicy(new RoleBasedHandlerOperationPolicy($request, $role, $operations));
		}
		$this->addPolicy($rolePolicy);

		return parent::authorize($request, $args, $roleAssignments);
	}

	//
	// Implement methods from GridHandler.
	//
	/**
	 * @see GridHandler::getRowInstance()
	 * @return UserGridRow
	 */
	function getRowInstance() {
		return new ReviewFormGridRow();
	}

	/**
	 * @see GridHandler::loadData()
	 * @param $request PKPRequest
	 * @return array Grid data.
	 */
	function loadData($request) {
		// Get all review forms.
		$reviewFormDao = DAORegistry::getDAO('ReviewFormDAO');
		$context = $request->getContext();
		$reviewForms = $reviewFormDao->getByAssocId(Application::getContextAssocType(), $context->getId());

		return $reviewForms->toAssociativeArray();
	}

	/**
	 * @see lib/pkp/classes/controllers/grid/GridHandler::setDataElementSequence()
	 */
	function setDataElementSequence($request, $rowId, $reviewForm, $newSequence) {
		$reviewFormDao = DAORegistry::getDAO('ReviewFormDAO'); /* @var $reviewFormDao ReviewFormDAO */
		$reviewForm->setSequence($newSequence);
		$reviewFormDao->updateObject($reviewForm);
	}

	/**
	 * @see lib/pkp/classes/controllers/grid/GridHandler::getDataElementSequence()
	 */
	function getDataElementSequence($reviewForm) {
		return $reviewForm->getSequence();
	}

	/**
	 * @see GridHandler::addFeatures()
	 */
	function initFeatures($request, $args) {
		import('lib.pkp.classes.controllers.grid.feature.OrderGridItemsFeature');
		return array(new OrderGridItemsFeature());
	}


	//
	// Public grid actions.
	//
	/**
	 * Preview a review form.
	 * @param $args array
	 * @param $request PKPRequest
	 * @return string Serialized JSON object
	 */
	function reviewFormPreview($args, $request) {
		// Identify the review form ID.
		$reviewFormId = (int) $request->getUserVar('reviewFormId');

		// Identify the context id.
		$context = $request->getContext();

		// Get review form object
		$reviewFormDao = DAORegistry::getDAO('ReviewFormDAO');
		$reviewForm = $reviewFormDao->getById($reviewFormId, Application::getContextAssocType(), $context->getId());

		$previewReviewForm = new PreviewReviewForm($reviewFormId);
		$previewReviewForm->initData($request);
		$json = new JSONMessage(true, $previewReviewForm->fetch($args, $request));

		return $json->getString();
	}

	/**
	 * Add a new review form.
	 * @param $args array
	 * @param $request PKPRequest
	 */
	function createReviewForm($args, $request) {
		// Form handling.
		$reviewFormForm = new ReviewFormForm(null);
		$reviewFormForm->initData($request);
		$json = new JSONMessage(true, $reviewFormForm->fetch($args, $request));

		return $json->getString();
	}

	/**
	 * Edit an existing review form.
	 * @param $args array
	 * @param $request PKPRequest
	 */
	function editReviewForm($args, $request) {
		// Identify the review form ID
		$reviewFormId = (int) $request->getUserVar('rowId');
		$reviewFormDao = DAORegistry::getDAO('ReviewFormDAO');
		$context = $request->getContext();
		$reviewForm = $reviewFormDao->getById($reviewFormId, Application::getContextAssocType(), $context->getId());

		// Display 'editReviewForm' tabs
		$templateMgr = TemplateManager::getManager($request);
		$templateMgr->assign('preview', $request->getUserVar('preview'));
		$templateMgr->assign('reviewFormId', $reviewFormId);
		$templateMgr->assign('canEdit', $reviewForm->getIncompleteCount() == 0 && $reviewForm->getCompleteCount() == 0);
		$json = new JSONMessage(true, $templateMgr->fetch('controllers/grid/settings/reviewForms/editReviewForm.tpl'));
		return $json->getString();
	}

	/**
	 * Edit an existing review form's basics (title, description)
	 * @param $args array
	 * @param $request PKPRequest
	 */
	function reviewFormBasics($args, $request) {
		// Identify the review form Id
		$reviewFormId = (int) $request->getUserVar('reviewFormId');

		// Form handling
		$reviewFormForm = new ReviewFormForm($reviewFormId);
		$reviewFormForm->initData($request);
		$json = new JSONMessage(true, $reviewFormForm->fetch($args, $request));

		return $json->getString();
	}


	/**
	 * Display a list of the review form elements within a review form.
	 * @param $args array
	 * @param $request PKPRequest
	 */
	function reviewFormElements($args, $request) {
		// Identify the review form ID
		$reviewFormId = (int) $request->getUserVar('reviewFormId');

		$templateMgr = TemplateManager::getManager($request);
		$templateMgr->assign('reviewFormId', $reviewFormId);

		$json = new JSONMessage(true, $templateMgr->fetch('controllers/grid/settings/reviewForms/reviewFormElements.tpl'));
		return $json->getString();
	}

	/**
	 * Update an existing review form.
	 * @param $args array
	 * @param $request PKPRequest
	 * @return string Serialized JSON object
	 */
	function updateReviewForm($args, $request) {
		// Identify the review form Id.
		$reviewFormId = (int) $request->getUserVar('reviewFormId');

		// Identify the context id.
		$context = $request->getContext();

		// Get review form object
		$reviewFormDao = DAORegistry::getDAO('ReviewFormDAO');
		$reviewForm = $reviewFormDao->getById($reviewFormId, Application::getContextAssocType(), $context->getId());

		// Form handling.
		$reviewFormForm = new ReviewFormForm(!isset($reviewFormId) || empty($reviewFormId) ? null : $reviewFormId);
		$reviewFormForm->readInputData();

		if ($reviewFormForm->validate()) {
			$reviewFormForm->execute($request);

			// Create the notification.
			$notificationMgr = new NotificationManager();
			$user = $request->getUser();
			$notificationMgr->createTrivialNotification($user->getId());

			return DAO::getDataChangedEvent($reviewFormId);

		}

		$json = new JSONMessage(false);
		return $json->getString();
	}

	/**
	 * Copy a review form.
	 * @param $args array
	 * @param $request PKPRequest
	 * @return string Serialized JSON object
	 */
	function copyReviewForm($args, $request) {
		// Identify the current review form
		$reviewFormId = (int) $request->getUserVar('rowId');

		// Identify the context id.
		$context = $request->getContext();

		// Get review form object
		$reviewFormDao = DAORegistry::getDAO('ReviewFormDAO');
		$reviewForm = $reviewFormDao->getById($reviewFormId, Application::getContextAssocType(), $context->getId());

		if (isset($reviewForm)) {
			$reviewForm->setActive(0);
			$reviewForm->setSequence(REALLY_BIG_NUMBER);
			$newReviewFormId = $reviewFormDao->insertObject($reviewForm);
			$reviewFormDao->resequenceReviewForms(Application::getContextAssocType(), $context->getId());

			$reviewFormElementDao = DAORegistry::getDAO('ReviewFormElementDAO');
			$reviewFormElements = $reviewFormElementDao->getByReviewFormId($reviewFormId);
			while ($reviewFormElement = $reviewFormElements->next()) {
				$reviewFormElement->setReviewFormId($newReviewFormId);
				$reviewFormElement->setSequence(REALLY_BIG_NUMBER);
				$reviewFormElementDao->insertObject($reviewFormElement);
				$reviewFormElementDao->resequenceReviewFormElements($newReviewFormId);
			}

			// Create the notification.
			$notificationMgr = new NotificationManager();
			$user = $request->getUser();
			$notificationMgr->createTrivialNotification($user->getId());

			return DAO::getDataChangedEvent($newReviewFormId);
		}

		$json = new JSONMessage(false);
		return $json->getString();
	}

	/**
	 * Activate a review form.
	 * @param $args array
	 * @param $request PKPRequest
	 * @return string Serialized JSON object
	 */
	function activateReviewForm($args, $request) {
		// Identify the current review form
		$reviewFormId = (int) $request->getUserVar('reviewFormKey');

		// Identify the context id.
		$context = $request->getContext();

		// Get review form object
		$reviewFormDao = DAORegistry::getDAO('ReviewFormDAO');
		$reviewForm = $reviewFormDao->getById($reviewFormId, Application::getContextAssocType(), $context->getId());

		if (isset($reviewForm) && !$reviewForm->getActive()) {
			$reviewForm->setActive(1);
			$reviewFormDao->updateObject($reviewForm);

			// Create the notification.
			$notificationMgr = new NotificationManager();
			$user = $request->getUser();
			$notificationMgr->createTrivialNotification($user->getId());

			return DAO::getDataChangedEvent($reviewFormId);
		}

		$json = new JSONMessage(false);
		return $json->getString();
	}


	/**
	 * Deactivate a review form.
	 * @param $args array
	 * @param $request PKPRequest
	 * @return string Serialized JSON object
	 */
	function deactivateReviewForm($args, $request) {

		// Identify the current review form
		$reviewFormId = (int) $request->getUserVar('reviewFormKey');

		// Identify the context id.
		$context = $request->getContext();

		// Get review form object
		$reviewFormDao = DAORegistry::getDAO('ReviewFormDAO');
		$reviewForm = $reviewFormDao->getById($reviewFormId, Application::getContextAssocType(), $context->getId());

		if (isset($reviewForm) && $reviewForm->getActive()) {
			$reviewForm->setActive(0);
			$reviewFormDao->updateObject($reviewForm);

			// Create the notification.
			$notificationMgr = new NotificationManager();
			$user = $request->getUser();
			$notificationMgr->createTrivialNotification($user->getId());

			return DAO::getDataChangedEvent($reviewFormId);
		}

		$json = new JSONMessage(false);
		return $json->getString();
	}

	/**
	 * Delete a review form.
	 * @param $args array
	 * @param $request PKPRequest
	 * @return string Serialized JSON object
	 */
	function deleteReviewForm($args, $request) {
		// Identify the current review form
		$reviewFormId = (int) $request->getUserVar('rowId');

		// Identify the context id.
		$context = $request->getContext();

		// Get review form object
		$reviewFormDao = DAORegistry::getDAO('ReviewFormDAO');
		$reviewForm = $reviewFormDao->getById($reviewFormId, Application::getContextAssocType(), $context->getId());

		$completeCounts = $reviewFormDao->getUseCounts(Application::getContextAssocType(), $context->getId(), true);
		$incompleteCounts = $reviewFormDao->getUseCounts(Application::getContextAssocType(), $context->getId(), false);

		if (isset($reviewForm) && $completeCounts[$reviewFormId] == 0 && $incompleteCounts[$reviewFormId] == 0) {
			$reviewAssignmentDao = DAORegistry::getDAO('ReviewAssignmentDAO');
			$reviewAssignments = $reviewAssignmentDao->getByReviewFormId($reviewFormId);

			foreach ($reviewAssignments as $reviewAssignment) {
				$reviewAssignment->setReviewFormId(null);
				$reviewAssignmentDao->updateObject($reviewAssignment);
			}

			$reviewFormDao->deleteById($reviewFormId, $context->getId());

			// Create the notification.
			$notificationMgr = new NotificationManager();
			$user = $request->getUser();
			$notificationMgr->createTrivialNotification($user->getId());

			return DAO::getDataChangedEvent($reviewFormId);
		}

		$json = new JSONMessage(false);
		return $json->getString();
	}
}

?>
