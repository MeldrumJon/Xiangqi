"use strict";

const STARTUP_FEN = [
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w",
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKAB1R w",
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/R1BAKAB1R w",
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/9/1C5C1/9/RN2K2NR w",
];

/**** Setup peerJS connection ****/

/**
 * Gets the peer ID we want to connect to from the URL.
 */
function URL2PeerID() {
  let params = new URLSearchParams(window.location.search);
  let peerID = params.get('peerID');
  return peerID;
}

/**
 * Returns a URL containing a peerID parameter.
 * @param {String} id 
 */
function PeerID2URL(id) {
  let url = new URL(window.location.href);
  url.searchParams.append('peerID', id);
  return url;
}

let callbacks = {
  'wait': (id) => {
    const shareURLEl = document.getElementById('share_url');
    shareURLEl.innerHTML = PeerID2URL(id).href;
    console.log('Have peer connect to: ' + PeerID2URL(id));
  },
  'connected': () => {
    console.log('Peer connected');
    fsm('CONNECTED');
  },
  'disconnected': () => {
    console.log('Peer disconnected')
    fsm('DISCONNECTED');
  }
};
var peerID = URL2PeerID();
comm_init(callbacks, peerID);

if (peerID !== null) {
  fsm('INIT_PEER');
} else {
  fsm('INIT_HOST');
}

const playOnlineEl = document.getElementById('play_online');
const playComputerEl = document.getElementById('play_computer');
playOnlineEl.onclick = function () {
  fsm('ONLINE');
}
playComputerEl.onclick = function () {
  fsm('COMPUTER');
}

/*** Select and copy share URL ***/
const shareURL = document.getElementById('share_url');
const copyBtn = document.getElementById('copy_btn');
// Select Share URL
shareURL.onclick = function () {
  window.getSelection().selectAllChildren(shareURL);
}
// Copy Share URL
copyBtn.onclick = function () {
  window.getSelection().selectAllChildren(shareURL);
  document.execCommand('copy');
}

const startCompEl = document.getElementById('start_comp');
startCompEl.onclick = function() {
  fsm('CONTINUE');
}

/**** Xiangqi Wizard Setup ****/

var board;

/**
 * 
 * @param {Boolean} online Whether or not you are playing with another online player
 * @param {Number} first_move 1: This client goes first, 0: other player or computer goes first.
 */
function setup(online, first_move) {
  const boardCont = document.getElementById('board');
  boardCont.innerHTML = ''; // Clear board and move list

  const undoBtn = document.getElementById('undo_area');
  const loadingArea = document.getElementById('loading_area');
  const soundChkbox = document.getElementById('sound_change');
  const skillArea = document.getElementById('skill_change');
  if (online) {
    undoBtn.style.visibility = 'hidden';
    loadingArea.style.visibility = 'hidden';
    soundChkbox.style.visibility = 'visible';
    skillArea.style.visibility = 'hidden';
  }
  else {
    undoBtn.style.visibility = 'visible';
    loadingArea.style.visibility = 'hidden';
    soundChkbox.style.visibility = 'visible';
    skillArea.style.visibility = 'visible';
  }

  selMoveList.options.length = 1;
  selMoveList.selectedIndex = 0;
  board = new Board(boardCont, "images/", "sounds/", loadingArea);
  board.setSearch(16);
  board.millis = Math.pow(10, selLevel.selectedIndex + 1);
  board.online = online;
  board.computer = first_move;
  board.onAddMove = function () {
    var counter = (board.pos.mvList.length >> 1);
    var space = (counter > 99 ? "    " : "   ");
    counter = (counter > 9 ? "" : " ") + counter + ".";
    var text = (board.pos.sdPlayer == 0 ? space : counter) + move2Iccs(board.mvLast);
    var value = "" + board.mvLast;
    try {
      selMoveList.add(createOption(text, value, false));
    } catch (e) {
      selMoveList.add(createOption(text, value, true));
    }
    selMoveList.scrollTop = selMoveList.scrollHeight;
  };
  board.restart(STARTUP_FEN[selHandicap.selectedIndex]);
  // Alert if user might disconnect from game.
  if (online) {
    window.addEventListener("beforeunload", function (e) {
      if (board.gameover) {
          return undefined;
      }
      var confirmationMessage = 'If you leave the page, you will be disconnected.';
      (e || window.event).returnValue = confirmationMessage; //Gecko + IE
      return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
    });
  }
}

function createOption(text, value, ie8) {
  var opt = document.createElement("option");
  opt.selected = true;
  opt.value = value;
  if (ie8) {
    opt.text = text;
  } else {
    opt.innerHTML = text.replace(/ /g, "&nbsp;");
  }
  return opt;
}

function level_change() {
  board.millis = Math.pow(10, changeLevel.selectedIndex + 1);
  console.log(board.millis);
}

function restart_click() {
  selMoveList.options.length = 1;
  selMoveList.selectedIndex = 0;
  board.computer = 1 - selMoveMode.selectedIndex;
  board.restart(STARTUP_FEN[selHandicap.selectedIndex]);
}

function retract_click() {
  for (var i = board.pos.mvList.length; i < selMoveList.options.length; i++) {
    board.pos.makeMove(parseInt(selMoveList.options[i].value));
  }
  board.retract();
  selMoveList.options.length = board.pos.mvList.length;
  selMoveList.selectedIndex = selMoveList.options.length - 1;
}

function moveList_change() {
  if (board.result == RESULT_UNKNOWN) {
    selMoveList.selectedIndex = selMoveList.options.length - 1;
    return;
  }
  var from = board.pos.mvList.length;
  var to = selMoveList.selectedIndex;
  if (from == to + 1) {
    return;
  }
  if (from > to + 1) {
    for (var i = to + 1; i < from; i++) {
      board.pos.undoMakeMove();
    }
  } else {
    for (var i = from; i <= to; i++) {
      board.pos.makeMove(parseInt(selMoveList.options[i].value));
    }
  }
  board.flushBoard();
}