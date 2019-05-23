const machine = {
	initial: "init",
	states: {
		init: {
			on: {
				INIT_HOST: 'online_or_comp',
				INIT_PEER: 'wait_for_connection'
			}
		},
		online_or_comp: {
			on: {
				ONLINE: 'show_url',
				COMPUTER: 'computer_settings'
			}
		},
		// Online stuff
		show_url: {
			on: {
				CONNECTED: () => {
					setup(true, 1);
					return 'game_online';
				}
			}
		},
		wait_for_connection: {
			on: {
				CONNECTED: () => {
					setup(true, 0);
					return 'game_online';
				}
			}
		},
		// Computer options
		computer_settings: {
			on: {
				CONTINUE: () => {
					setup(false, 1 - selMoveMode.selectedIndex);
					return 'game_comp';
				}
			}
		},
		disconnected: {},
		game_comp: {},
		game_online: {
			on: {
				DISCONNECTED: 'disconnected'
			}
		}
	}
};

let state = machine.initial;

function fsm(event) {
	let transition = machine.states[state].on[event];
	if (typeof transition === 'function') {
		state = transition();
	}
	else if (typeof transition === 'string') {
		state = transition;
	}
	const body = document.getElementsByTagName("BODY")[0];
	body.className = state;
}