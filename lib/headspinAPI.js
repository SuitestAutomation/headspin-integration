const fetch = require('node-fetch');
const chalk = require('chalk');
const prettyjson = require('prettyjson');

class HeadspinLabel {
	options;
	startTime;
	endTime;
	type;
	category;

	/**
	 * @param {string | object} options
	 */
	constructor(options) {
		this.options = typeof options === 'string' ? {name: options} : options;
	}

	start() {
		this.startTime = Date.now();
	}

	end() {
		this.endTime = Date.now();
	}
}

class PageLoadLabel extends HeadspinLabel {
	type = 'page-load-request';
	category = 'Performance testing';
}

class VideoQualityLabel extends HeadspinLabel {
	type = 'video-content';
	category = 'Video quality';
}

class AudioActivityLabel extends HeadspinLabel {
	type = 'audio-activity-request';
	category = 'Video quality';
}

class UserLabel extends HeadspinLabel {
	type = 'user';
}

class HeadspinSession {
	_token;
	_baseUrl;
	_deviceId;
	_deviceHostname;
	_sessionId;
	_isRunning;
	_startTime;

	/**
	 * @param {string} token - Headspin API token
	 * @param {string} deviceId - Headspin device ID
	 */
	constructor(token, deviceId) {
		this._token = token;
		this._baseUrl = `https://${token}@api-dev.headspin.io/v0`;
		this._deviceId = deviceId;
	}

	/**
	 * Lock the device, so that it can be used for performance testing
	 * @returns {Promise<void>}
	 */
	async lockDevice() {
		const url = `${this._baseUrl}/devices/lock?automation`;
		const res = await fetch(url, {
			method: 'POST',
			body: JSON.stringify({device_id: this._deviceId}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const rawData = await res.text();
		let data;

		try {
			data = JSON.parse(rawData);
		} catch (e) {
			error(`Failed to parse JSON: ${res.status} - ${res.statusText}`);
			error(url);
			error(rawData);
			throw e;
		}

		if (!res.ok || data.status_code !== 200) {
			error(prettyjson.render(data));
			throw new Error(`Failed to lock Headspin device: ${res.status} - ${res.statusText}`);
		}

		this._deviceHostname = data.hostname;

		log('Locked the device...');
	};

	/**
	 * Unlock the device
	 * @returns {Promise<void>}
	 */
	async unlockDevice() {
		const res = await fetch(`${this._baseUrl}/devices/unlock?automation`, {
			method: 'POST',
			body: JSON.stringify({device_id: this._deviceId}),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const data = await res.json();

		if (!res.ok) {
			error(prettyjson.render(data));
			throw new Error(`Failed to unlock Headspin device: ${res.status} - ${res.statusText}`);
		}

		log('Unlocked the device...');
	};

	/**
	 * Starts recording session
	 * @returns {Promise<void>}
	 */
	async start() {
		if (this._isRunning) {
			throw new Error('Session is already running');
		}

		if (!this._deviceHostname) {
			throw new Error('Missing device hostname. Did you forget to lock the device?');
		}

		const res = await fetch(`${this._baseUrl}/sessions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				session_type: 'capture',
				capture_network: false,
				device_address: `${this._deviceId}@${this._deviceHostname}`,
				device_id: this._deviceId,
			}),
		});

		const data = await res.json();

		if (!res.ok) {
			error(prettyjson.render(data));
			throw new Error(`Failed to start the Headspin session: ${res.status} - ${res.statusText}`);
		}

		this._sessionId = data.session_id;

		// Record start time, so we could assign relative labels timeframe
		this._startTime = Date.now();

		log('Performance session started');
	}

	/**
	 * Stops the session
	 * @returns {Promise<void>}
	 */
	async stop() {
		if (!this._sessionId) {
			throw new Error('There is no active session');
		}

		const res = await fetch(`${this._baseUrl}/sessions/${this._sessionId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				active: false,
			}),
		});

		const data = await res.json();

		if (!res.ok) {
			error(prettyjson.render(data));
			throw new Error(`Failed to stop Headspin session: ${res.status} - ${res.statusText}`);
		}

		log('Performance session is stopped');
		log(data.msg);
		log(`View this session online: https://ui-dev.headspin.io/sessions/${this._sessionId}/waterfall`);
	}

	/**
	 * Attach a label to session, make required assertions
	 * @param {HeadspinLabel} label
	 */
	async pushLabel(label) {
		if (!this._sessionId) {
			throw new Error('There is no active session');
		}

		const {
			name = 'Auto-created label',
			category = label.category,
			maxLowContent = 5000,
			maxLoader = 5000,
			...rest
		} = label.options;
		const requestBody = {
			name,
			label_type: label.type,
			start_time: (label.startTime - this._startTime) / 1000,
			end_time: (label.endTime - this._startTime) / 1000,
		};

		if (category) {
			requestBody.category = category;
		}

		if (Object.getOwnPropertyNames(rest).length) {
			requestBody.data = rest;
		}

		const res = await fetch(`${this._baseUrl}/sessions/${this._sessionId}/label/add`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		});

		let data;

		try {
			data = await res.json();
		} catch(e) {}

		if (!res.ok) {
			error(prettyjson.render(data));
			error(prettyjson.render(requestBody));
			throw new Error(`Failed to push label to Headspin: ${res.status} - ${res.statusText}`);
		}

		log(`Pushed ${name} label to Headspin: ${data.label_id}`);
	}
}

module.exports = {
	HeadspinSession,
	PageLoadLabel,
	VideoQualityLabel,
	AudioActivityLabel,
	UserLabel,
};

// HELPERS

const nl = '\n';

const makeLog = (prefix, pipe) => (...args) => {
	const str = args
	.map(arg => typeof arg === 'object' ? prettyjson.render(arg) : String(arg))
	.flatMap(arg => arg.split(nl))
	.map(line => prefix + line)
	.join(nl);

	pipe.write(str + nl);
};

const log = makeLog(chalk.cyan('HEADSPIN API: '), process.stdout);
const error = makeLog(chalk.red('HEADSPIN ERROR: '), process.stderr);
