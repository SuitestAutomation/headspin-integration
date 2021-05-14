const suitest = require('suitest-js-api');
const {assert, VRC, PROP, COMP} = suitest;
const {
	itWithLabel: it,
	pageLoadTest,
	videoQualityTest,
	audioActivityTest,
	userLabel,
} = require('../lib/mochaSetup');

describe('My application', () => {
	it('Application open performance', async () => {
		await pageLoadTest('Application open performance test', async () => {
			// Open the application
			await suitest.openApp();
			// Make sure it is open, i.e. assert on UI element
			await assert.element('Logo').matchRepo(PROP.IMAGE_HASH);
			// Give it some time to record a bit more video
			await suitest.sleep(5000);
		});
	});

	it('should start playing the video fast enough', async () => {
		// Open the application
		await suitest.openApp();
		// Make sure it is open, i.e. assert on UI element
		await assert.element('Logo').matchRepo(PROP.IMAGE_HASH);
		// Navigate to the video we want to play
		await suitest.press(VRC.RIGHT).until(
			suitest.element('BigBuckBunny').matchRepo(PROP.TEXT_COLOR)
		).repeat(6);

		// Now add a session label, before we actually start the playback
		await pageLoadTest('Video loading performance', async () => {
			// Start the playback and let it play for some time
			await suitest.press(VRC.OK);
			await assert.video().isPlaying().timeout(10000);
			await assert.video()
				.matches(PROP.VIDEO_POSITION, 5000, COMP.EQUAL_GREATER)
				.timeout(10000);
		});

		// Exit the app. Not really necessary, just stopping the playback to save bandwidth
		await suitest.press(VRC.HOME);
	});

	it('should play high quality video', async () => {
		// Open the app
		await suitest.openApp();
		// Make sure it is open, i.e. assert on UI element
		await assert.element('Logo').matchRepo(PROP.IMAGE_HASH);
		// Navigate to the video we want to play
		await suitest.press(VRC.RIGHT).until(
			suitest.element('BigBuckBunny').matchRepo(PROP.TEXT_COLOR)
		).repeat(6);
		// Start the playback
		await suitest.press(VRC.OK);
		// Make sure video started the playback
		await assert.video().isPlaying().timeout(10000);

		// Add video quality session
		await videoQualityTest('Video quality test', async () => {
			// Let video play for 30sec to get a good sample
			await assert.video()
				.matches(PROP.VIDEO_POSITION, 30000, COMP.EQUAL_GREATER)
				.timeout(45000);
		});

		// Exit the app. Not really necessary, just stopping the playback to save bandwidth
		await suitest.press(VRC.HOME);
	});

	it('should play audio along with video', async () => {
		// Open the app
		await suitest.openApp();
		// Make sure it is open, i.e. assert on UI element
		await assert.element('Logo').matchRepo(PROP.IMAGE_HASH);
		// Navigate to the video we want to play
		await suitest.press(VRC.RIGHT).until(
			suitest.element('BigBuckBunny').matchRepo(PROP.TEXT_COLOR)
		).repeat(6);
		// Start the playback
		await suitest.press(VRC.OK);
		// Make sure video started the playback
		await assert.video().isPlaying().timeout(10000);

		// Add audio label
		await audioActivityTest('Audio test', async () => {
			// Let video play for 30sec to get a good sample
			await assert.video()
			.matches(PROP.VIDEO_POSITION, 30000, COMP.EQUAL_GREATER)
			.timeout(45000);
		});

		// Exit the app. Not really necessary, just stopping the playback to save bandwidth
		await suitest.press(VRC.HOME);
	});

	it('should navigate through the videos', async () => {
		// This test is a simple example of user label, with no assertions
		await suitest.openApp();
		await assert.element('Logo').matchRepo(PROP.IMAGE_HASH);

		await userLabel('Navigation label', async () => {
			await suitest.press(VRC.RIGHT).until(
				suitest.element('BigBuckBunny').matchRepo(PROP.TEXT_COLOR)
			).repeat(6);
		});
	});
});
