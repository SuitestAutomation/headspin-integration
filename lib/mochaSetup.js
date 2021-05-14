const {HeadspinSession, UserLabel, VideoQualityLabel, AudioActivityLabel, PageLoadLabel} = require('./headspinAPI');
// Read token and device id from .headspinrc file
const {token, deviceId} = require('rc')('headspin');

/**
 * A variable to store Headspin session for this test suite
 */
let session;

/**
 * Store Headspin labels here before submitting those
 * @type {HeadspinLabel[]}
 */
const labels = [];

/**
 * A hook to be executed before the whole test suite
 * We want Headspin QoE session to cover the whole test
 */
const mochaGlobalSetup = async () => {
	// Use token and deviceId from rc file to create a Headspin session
	session = new HeadspinSession(token, deviceId);

	// Lock the device
	await session.lockDevice();

	try {
		// Start session
		await session.start();

		// Wait for ~5s to have some video before the test run
		// This is optional, you can remove it if you don't need the buffer
		// and want to make test run faster
		await new Promise(res => setTimeout(res, 5000));
	} catch(e) {
		// In case of error - make sure to unlock the device
		await session.unlockDevice();
		// And throw back the error
		throw e;
	}
};

/**
 * After hook to be executed after the whole test suite
 * We stop the recording, unlock the device and run QoE assertions in here
 */
const mochaGlobalTeardown = async () => {
	try {
		// Stop the recording
		await session.stop();
	} finally {
		// Unlock the device, even if we failed to stop session for some reason
		await session.unlockDevice();
	}

	// Give Headspin some time to record the video
	// Not sure if this is really necessary
	await new Promise(res => setTimeout(res, 10000));

	// Go through labels and assert on them
	await Promise.all(labels.map(session.pushLabel.bind(session)));
};

/**
 * @typedef {Object} LabelOptions
 * @property {string} name - name of the label
 * @property {string} [category] - an optional category
 * @property {'video'|'audio'|'user'|'load'} [type] - type of the label. "video" labels focus on video quality analysis,
 *  "audio" - on audio quality, "load" - on the page loading, transitions, low content states etc.,
 *  "user" - a custom label with no assertions.
 */

/**
 * A decorator function to wrap around Mocha's "it"
 * @example
 *  itWithLabel('should load on time', async () => {
 *      await suitest.openApp();
 *      await suitest.assert.element('Logo').exists().timeout(15000);
 *  });
 * @param {string} title - "it" title
 * @param {function} callback - a callback for the Mocha's "it". Could be async
 */
const itWithLabel = (title, callback) => {
	const label = new UserLabel(title);

	labels.push(label);

	it(title, async () => {
		label.start();
		try {
			await callback();
		} finally {
			label.end();
		}
	});
};

/**
 * A wrapper to automatically generate Headspin label with a QoE assertion
 * @param {function} LabelClass
 * @returns {function}
 */
const makeAddLabel = (LabelClass) => async (options, callback) => {
	const label = new LabelClass(options);

	labels.push(label);
	label.start();

	try {
		await callback();
	} finally {
		label.end();
	}
}

const videoQualityTest = makeAddLabel(VideoQualityLabel);
const audioActivityTest = makeAddLabel(AudioActivityLabel);
const pageLoadTest = makeAddLabel(PageLoadLabel);
const userLabel = makeAddLabel(UserLabel);

module.exports = {
	itWithLabel,
	videoQualityTest,
	audioActivityTest,
	pageLoadTest,
	userLabel,
	mochaGlobalSetup,
	mochaGlobalTeardown,
};
