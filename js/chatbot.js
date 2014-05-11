define([], function () {
	function ChatBot(options) {
		var listeners = {},
			activeIndex = 0,
			messagesContainer, textarea, sendButton, dialog, name,
			activeDialog,

			me = this,

			timeout;

		function emit(eventName) {
			var i,
				list = listeners[eventName];

			if (list && list.length) {
				for (i = 0; i < list.length; i++) {
					list[i]();
				}
			}
		}

		function respond(msg) {
			var div = document.createElement('div'),
				span;

			msg = msg.replace(/\$(\w+)/, function (match, key) {
				if (me.responses[key]) {
					return me.responses[key];
				}

				return match;
			});

			div.class = 'chat-from';

			span = document.createElement('span');
			span.class = 'chat-name';
			span.appendChild(document.createTextNode(name + ':'));
			div.appendChild(span);

			span = document.createElement('span');
			span.class = 'chat-message';
			span.appendChild(document.createTextNode(msg));
			div.appendChild(span);

			messagesContainer.appendChild(div);
		}

		function nextDialog() {
			activeDialog = dialog[activeIndex];

			if (!activeDialog) {
				emit('ended');
				return;
			}

			if (timeout) {
				timeout = 0;
			} else if (activeDialog.delay) {
				timeout = setTimeout(nextDialog, activeDialog.delay);
				return;
			}

			if (activeDialog.prompt) {
				respond(activeDialog.prompt);
			}

			if (!activeDialog.responses || !activeDialog.responses.length) {
				activeIndex++;
				nextDialog();
			}
		}

		function send() {
			var value = String.prototype.trim.apply(textarea.value),
				responses,
				response,
				i;

			if (!value) {
				return;
			}

			var div = document.createElement('div'),
				span;

			div.class = 'chat-from';

			span = document.createElement('span');
			span.class = 'chat-name';
			span.appendChild(document.createTextNode('Guest:'));
			div.appendChild(span);

			span = document.createElement('span');
			span.class = 'chat-message';
			span.appendChild(document.createTextNode(value));
			div.appendChild(span);

			messagesContainer.appendChild(div);

			textarea.value = '';

			if (!activeDialog) {
				return;
			}

			responses = activeDialog.responses;
			for (i = 0; i < responses.length; i++) {
				response = responses[i];
				if (response.regex.test(value)) {
					if (response.id) {
						me.responses[response.id] = value;
					}
					if (response.event) {
						emit(response.event);
					}
					if (!response.repeat) {
						activeIndex++;
					}
					nextDialog();
					return;
				}
			}

			if (activeDialog.otherwise) {
				respond(activeDialog.otherwise[
					Math.floor(Math.random() * activeDialog.otherwise.length)
				]);
			}
		}

		function keyPress(evt) {
			if (evt.which === 13) {
				evt.preventDefault();
				send();
			} else {
				emit('keypress');
			}
		}

		name = options.name;
		textarea = options.textarea;
		sendButton = options.sendButton;
		messagesContainer = options.messages;
		dialog = options.dialog;

		textarea.addEventListener('keypress', keyPress, false);
		if (sendButton) {
			sendButton.addEventListener('click', send, false);
		}

		this.responses = {};

		this.on = function (eventName, callback) {
			var list,
				index = -1;

			if (!eventName || typeof callback !== 'function') {
				return;
			}

			list = listeners[eventName];
			if (list) {
				index = list.indexOf(callback);
			} else {
				list = listeners[eventName] = [];
			}

			if (index < 0) {
				list.push(callback);
			}
		};

		this.off = function (eventName, callback) {
			var list,
				index = -1;

			if (!eventName || typeof callback !== 'function') {
				return;
			}

			list = listeners[eventName];
			if (list) {
				index = list.indexOf(callback);
				if (index >= 0) {
					list.splice(index, 1);
				}
			}
		};

		this.reset = function () {
			this.responses = {};
			activeIndex = 0;

			messagesContainer.innerHTML = '';
			textarea.value = '';

			if (timeout) {
				clearTimeout(timeout);
			}
		};

		this.destroy = function () {
			var key;

			for (key in listeners) {
				delete listeners[key];
			}

			textarea.removeEventListener('keypress', keyPress, false);
			if (sendButton) {
				sendButton.removeEventListener('click', send, false);
			}

			this.reset();
		};

		this.start = function () {
			this.reset();
			nextDialog();
		};
	}

	return ChatBot;
});