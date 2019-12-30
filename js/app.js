import * as notify from './notify.js';
import * as storage from './storage.js';
import PeerCom from './PeerCom.js';

const elBody = document.getElementById('xiangqi_board_game');

// Board
const elGame = document.getElementById('game');
const elBoard = document.getElementById('board');

const elBtnChat = document.getElementById('btnChat');
const elBtnSettings = document.getElementById('btnSettings');

const elSndCapture = document.getElementById('sndCapture');
const elSndCheck = document.getElementById('sndCheck');
const elSndMove = document.getElementById('sndMove');

// Forms
const elBtnOnline = document.getElementById('btnOnline');
const elBtnLocal = document.getElementById('btnLocal');
const elBtnComputer = document.getElementById('btnLocal');

const elBtnCloseGameover = document.getElementById('btnCloseGameover');
const elBtnCopyUrl = document.getElementById('btnCopyUrl');

const elMsgUrl = document.getElementById('msgUrl');
const elMsgResult = document.getElementById('msgResult');

const elPeerShow = document.getElementById('peerShow');
const elPeerWait = document.getElementById('peerWait');

const elSelFirstMove = document.getElementById('selFirstMove');
const elSelHandicap = document.getElementById('selHandicap');
const elSelSkill = document.getElementById('selSkill');
const elBtnComputerStart = document.getElementById('btnComputerStart');

// Chat
const elMessages = document.getElementById('bubbles');
const elTxtMsg = document.getElementById('txtMsg');
const elBtnSendMsg = document.getElementById('btnSendMsg');

// Controls
const elBtnUndo = document.getElementById('btnUndo');
const elSelSideSkill = document.getElementById('selSideSkill');
const elChkBoardSize = document.getElementById('chkBoardSize');
const elChkNotiSound = document.getElementById('chkNotiSound');
const elChkNotiPush = document.getElementById('chkNotiPush');

const MODALS = [
    'mod_gameselect',
    'mod_shareurl',
    'mod_waiting',
    'mod_disconnected',
    'mod_computer',
    'mod_gameover'
];

let showModal = function (name) {
    elBody.classList.add('shade');
    for (let i = 0, len = MODALS.length; i < len; ++i) {
        elBody.classList.remove(MODALS[i]);
    }
    elBody.classList.add(name);
}

let hideModals = function () {
    elBody.classList.remove('shade');
    for (let i = 0, len = MODALS.length; i < len; ++i) {
        elBody.classList.remove(MODALS[i]);
    }
}


let main = function () {
    let peerId = new URLSearchParams(window.location.search).get('peerId');
    let peerCom = new PeerCom();

    if (peerId !== null) {
        console.log('I am slave');
        peerCom.begin(peerId);
        showModal('mod_waiting');
    } else {
        console.log('I am master');
        peerCom.begin();
        showModal('mod_gameselect');
    }

    let board = null;

    let start = function () {
        //elBody.classList.add(board.online ? 'play_online' : 'play_local');
    }

    // DOM
    let resize = function () {
        let availWidth = elGame.clientWidth;
        let availHeight = elGame.clientHeight;


        // Pay attention to aspect ratio
        // use AvailHeight and availWidth to calculate board width/height
        // if it fills either, then pick the bigger.

        /*
        size -= 2; // borders
        let sizestr = size + 'px';
        elBoard.style.width = sizestr;
        elBoard.style.height = sizestr;
        */
        elMessages.scrollTop = elMessages.scrollHeight;

        //if (board) { board.resize(); }
    };
    window.addEventListener('resize', resize);
    //resize(); // Not necessary because of setBoardSize() below

    let skillChange = function (evt) {
        console.log('TODO: set skill in both controls and modals', evt);
    };
    elSelSkill.addEventListener('change', skillChange);
    elSelSideSkill.addEventListener('change', skillChange);

    elBtnOnline.addEventListener('click', function () {
        showModal('mod_shareurl');
    });

    elBtnLocal.addEventListener('click', function () {
        // TODO: Start local game
        //board = new GoBoard(elBoard, uiGridSize, false, 'black');
        start();
        hideModals();
    });

    elMsgUrl.addEventListener('click', function () {
        window.getSelection().selectAllChildren(elMsgUrl);
    });

    elBtnCopyUrl.addEventListener('click', function () {
        window.getSelection().selectAllChildren(elMsgUrl);
        document.execCommand('copy');
    });

    elBtnChat.addEventListener('click', function () {
        elBody.classList.toggle('chat');
        if (elBody.classList.contains('chat')) {
            elBody.classList.remove('unread');
        }
        resize();
    });

    elBtnSettings.addEventListener('click', function () {
        elBody.classList.toggle('settings');
        resize();
    });

    elBtnCloseGameover.addEventListener('click', function () {
        hideModals();
    });

    elBtnSendMsg.addEventListener('click', function() {
        let msg = elTxtMsg.value;
        console.log(msg);
        elTxtMsg.value = '';
        if (msg.replace(/\s/g, '').length) {
            peerCom.send('Message', msg);
            let html = '';
            html += '<div class="sent">';
            html += '<span class="person">You</span>';
            html += '<span class="content"><span>' + msg + '</span></span>';
            html += '</div>';
            elMessages.innerHTML += html;
        }
        elMessages.scrollTop = elMessages.scrollHeight;
    });

    elTxtMsg.addEventListener('keypress', function (evt) {
        if (evt.keyCode === 13 && !evt.shiftKey) {
            evt.preventDefault();
            elBtnSendMsg.click();
        }
    });

    elBtnUndo.addEventListener('click', function (evt) {
        if (board) { board.undo(); }
    });

    let setBoardSize = function () {
        if (storage.getItem('boardSize') === 'disabled') {
            elBoard.style.maxWidth = '';
            elBoard.style.maxHeight = '';
        }
        else {
            elBoard.style.maxWidth = '521px';
            elBoard.style.maxHeight = '577px';
        }
        resize();
    };
    elChkBoardSize.addEventListener('change', function(evt) {
        let status = elChkBoardSize.checked ? 'enabled' : 'disabled';
        storage.setItem('boardSize', status);
        setBoardSize();
    });
    elChkBoardSize.checked = !(storage.getItem('boardSize') === 'disabled');
    setBoardSize();

    elChkNotiSound.addEventListener('change', function(evt) {
        let status = elChkNotiSound.checked ? 'enabled' : 'disabled';
        storage.setItem('notiSound', status);
    });
    elChkNotiSound.checked = (storage.getItem('notiSound') === 'enabled');

    elChkNotiPush.addEventListener('change', function(evt) {
        if (notify.pushStatus() !== 'granted' && elChkNotiPush.checked) {
            notify.pushAsk(function (permission) {
                if (permission === 'granted') {
                    storage.setItem('notiPush', 'enabled');
                }
                else if (permission === 'denied') {
                    elChkNotiPush.checked = false;
                    elChkNotiPush.disabled = true;
                }
            });
        }
        else {
            let status = elChkNotiPush.checked ? 'enabled' : 'disabled';
            storage.setItem('notiPush', status);
        }
    });
    if (notify.pushStatus() === 'denied') { // disable
        elChkNotiPush.checked = false;
        elChkNotiPush.disabled = true;
    }
    else {
        elChkNotiPush.checked = (storage.getItem('notiPush') === 'enabled');
    }

    // Peer2Peer
    peerCom.addEventListener('wait', function (evt) {
        let peerUrl = new URL(window.location.href);
        peerUrl.searchParams.set('peerId', evt.detail);

        console.log('Have peer connect to: ' + peerUrl);
        elMsgUrl.innerHTML = peerUrl.href;

        peerWait.classList.toggle('hide');
        peerShow.classList.toggle('hide');
    });

    peerCom.addEventListener('connectedpeer', function (evt) {
        console.log('A peer connected');

        if (!peerId) { // New game
            // TODO: start online game
            //board = new GoBoard(elBoard, uiGridSize, true, 'black');
            start();
            hideModals();
        }
        peerId = evt.detail;

        if (board) { // Send start signal to peer
            peerCom.send('Start', {
                //gridSize: board.gridSize,
                //player: (board.player === 'black') ? 'white' : 'black',
                //pastMoves: board.movesList
            });
        }

        // Append URL with peerId
        let peerUrl = new URL(window.location.href);
        peerUrl.searchParams.set('peerId', peerId);
        window.history.pushState({ path: peerUrl.href }, '', peerUrl.href);
    });

    peerCom.addEventListener('disconnected', function () {
        console.log('Peer disconnected')
        showModal('mod_disconnected');
    });

    // Peer2Peer Data
    // Games Start / Reconnect
    peerCom.addReceiveHandler('Start', function (obj) {
        // TODO: start online game and catch up moves
        //board = new GoBoard(elBoard, obj.gridSize, true, obj.player);
        //for (let i = 0, len = obj.pastMoves.length; i < len; ++i) {
        //    let move = obj.pastMoves[i];
        //    if (move.pass) {
        //        board.pass(move.color);
        //    }
        //    else {
        //        board.play(move.color, move.x, move.y);
        //    }
        //}
        hideModals();
        start();
    });

    // Move
    let notiMove = null;
    peerCom.addReceiveHandler('Move', function (move) {
        // TODO: set up move handler
        //if (move.pass) {
        //    if (board) { board.pass(move.color); }
        //}
        //else {
        //    if (board) { board.play(move.color, move.x, move.y); }
        //}
        if (!document.hasFocus()) {
            if (storage.getItem('notiPush') === 'enabled') {
                // We should check for gameover here
                notiMove = notify.pushNotify('Your Move');
            }
        }
    });
    window.addEventListener('focus', function(evt) {
        if (notiMove) { notiMove.close(); }
    });

    // Chat
    peerCom.addReceiveHandler('Message', function(msg) {
        let html = '';
        html += '<div class="received">';
        html += '<span class="person">Opponent</span>';
        html += '<span class="content"><span>' + msg + '</span></span>';
        html += '</div>';
        elMessages.innerHTML += html;
        elMessages.scrollTop = elMessages.scrollHeight;
        if (!document.hasFocus()) {
            if (storage.getItem('notiPush') === 'enabled') {
                let noti = notify.pushNotify('New Message', 'Opponent: ' + msg);
                window.setTimeout(noti.close.bind(noti), 5000);
            }
        }
        if (!elBody.classList.contains('chat')) {
            elBody.classList.add('unread');
        }
    });
}

main();

