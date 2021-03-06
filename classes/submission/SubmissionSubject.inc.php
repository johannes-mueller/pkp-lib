<?php

/**
 * @file classes/submission/SubmissionSubject.inc.php
 *
 * Copyright (c) 2014 Simon Fraser University Library
 * Copyright (c) 2000-2014 John Willinsky
 * Distributed under the GNU GPL v2. For full terms see the file docs/COPYING.
 *
 * @class SubmissionSubject
 * @ingroup submission
 * @see SubmissionSubjectEntryDAO
 *
 * @brief Basic class describing a submission subject
 */

import('lib.pkp.classes.controlledVocab.ControlledVocabEntry');

class SubmissionSubject extends ControlledVocabEntry {
	//
	// Get/set methods
	//

	/**
	 * Get the subject
	 * @return string
	 */
	function getSubject() {
		return $this->getData('submissionSubject');
	}

	/**
	 * Set the subject text
	 * @param subject string
	 * @param locale string
	 */
	function setSubject($subject, $locale) {
		$this->setData('submissionSubject', $subject, $locale);
	}

	function getLocaleMetadataFieldNames() {
		return array('submissionSubject');
	}
}
?>
