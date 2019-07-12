// Private data
let _peer = null;
let _conn = null;

// Public information
let comm_isConnected = false;
let comm_peerID = null;

/**
 * Establishes a connection between two peers.  If a comm_peerID is provided, it 
 * begins a connection with that Peer.  Otherwise, it calls the wait callback 
 * function, passing a connection ID.  The user must send this ID to their 
 * peer so that they can connect.
 * 
 * @param {Object} callbacks The callbacks object may contain the following functions:
 * {
 * 	// Called if an peer ID was not supplied for connection and we are
 * 	// waiting for a connection from another peer:
 * 	wait: function(myID) { ... }
 * 	// Called when two peers are connected:
 * 	connected: function() { ... }
 * 	// Called when the two peers are disconnected:
 * 	disconnected: function() { ... }
 * }
 */
function comm_init(cbs, pID) {
	console.log('Connecting to Peer server.');
	comm_peerID = pID;
	_peer = new Peer();
	_peer.on('open', function gotID(myID) { // Connected to Peer server, received ID.
		console.log('Established connection to Peer server. My ID: ' + myID);
		if (pID !== null) { // Connect to the peer.
			console.log('Connecting to peer at ID: ' + pID);
			_connect(_peer.connect(pID)); // Call connect with the data connection.
		}
		else { // or Wait for a connection
			console.log('Waiting for connection from peer.')
			if (typeof cbs.wait === 'function') { cbs.wait(myID); }
			_peer.on('connection', _connect); // Call connect with the data connection
		}
	});

	function _connect(conn) {
		if (_conn !== null) {
			return;
		}
		_conn = conn;
		_conn.on('open', _connected);
		_conn.on('close', _disconnected);
	}

	function _connected() {
		console.log('Connected to peer at ID: ' + _conn.peer);
		_conn.on('data', _comm_received); // Call received when we receive data.
		comm_peerID = _conn.peer;
		comm_isConnected = true;
		if (typeof cbs.connected === 'function') { cbs.connected(); }
		_peer.disconnect(); // Don't allow any more connections
	}

	function _disconnected() {
		console.log("Data connection has been closed.");
		comm_isConnected = false
		if (typeof cbs.disconnected === 'function') { cbs.disconnected(); }
	}
}

/**
 * Received data from a peer.
 * @param {Object} obj JSON object containing 'type' (type of data) and 'data'
 * (data received)
 */
function _comm_received(obj) {
	let type = obj.type;
	let data = obj.data;

	console.log(obj);

	if (type === 'Move') {
		board.onlineMove(data);
	}
}

/**
 * Send data to peer.
 * @param {String} type String that describes the data.
 * @param {*} data Data to send.
 */
function comm_send(type, data) {
	if (_conn === null) {
		throw "Connection not established!";
	}
	_conn.send({
		'type': type,
		'data': data
	});

	console.log(type, data);
}