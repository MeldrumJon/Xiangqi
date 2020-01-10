/*
search.js - Source Code for XiangQi Wizard Light, Part II

XiangQi Wizard Light - a Chinese Chess Program for JavaScript
Designed by Morning Yellow, Version: 1.0, Last Modified: Sep. 2012
Copyright (C) 2004-2012 www.xqbase.com

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along
with this program; if not, write to the Free Software Foundation, Inc.,
51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

"use strict";

const SHELL_STEP = [0, 1, 4, 13, 40, 121, 364, 1093];

function shellSort(mvs, vls) {
  let stepLevel = 1;
  while (SHELL_STEP[stepLevel] < mvs.length) {
    ++stepLevel;
  }
  stepLevel --;
  while (stepLevel > 0) {
    let step = SHELL_STEP[stepLevel];
    for (let i = step; i < mvs.length; ++i) {
      let mvBest = mvs[i];
      let vlBest = vls[i];
      let j = i - step;
      while (j >= 0 && vlBest > vls[j]) {
        mvs[j + step] = mvs[j];
        vls[j + step] = vls[j];
        j -= step;
      }
      mvs[j + step] = mvBest;
      vls[j + step] = vlBest;
    }
    stepLevel --;
  }
}

const PHASE_HASH = 0;
const PHASE_KILLER_1 = 1;
const PHASE_KILLER_2 = 2;
const PHASE_GEN_MOVES = 3;
const PHASE_REST = 4;

function MoveSort(mvHash, pos, killerTable, historyTable) {
  this.mvs = [];
  this.vls = [];
  this.mvHash = this.mvKiller1 = this.mvKiller2 = 0;
  this.pos = pos;
  this.historyTable = historyTable;
  this.phase = PHASE_HASH;
  this.index = 0;
  this.singleReply = false;

  if (pos.inCheck()) {
    this.phase = PHASE_REST;
    let mvsAll = pos.generateMoves(null);
    for (let i = 0; i < mvsAll.length; ++i) {
      let mv = mvsAll[i]
      if (!pos.makeMove(mv)) {
        continue;
      }
      pos.undoMakeMove();
      this.mvs.push(mv);
      this.vls.push(mv === mvHash ? 0x7fffffff :
          historyTable[pos.historyIndex(mv)]);
    }
    shellSort(this.mvs, this.vls);
    this.singleReply = this.mvs.length === 1;
  } else {
    this.mvHash = mvHash;
    this.mvKiller1 = killerTable[pos.distance][0];
    this.mvKiller2 = killerTable[pos.distance][1];
  }
}

MoveSort.prototype.next = function() {
  switch (this.phase) {
  case PHASE_HASH:
    this.phase = PHASE_KILLER_1;
    if (this.mvHash > 0) {
      return this.mvHash;
    }
    // No Break
  case PHASE_KILLER_1:
    this.phase = PHASE_KILLER_2;
    if (this.mvKiller1 !== this.mvHash && this.mvKiller1 > 0 &&
        this.pos.legalMove(this.mvKiller1)) {
      return this.mvKiller1;
    }
    // No Break
  case PHASE_KILLER_2:
    this.phase = PHASE_GEN_MOVES;
    if (this.mvKiller2 !== this.mvHash && this.mvKiller2 > 0 &&
        this.pos.legalMove(this.mvKiller2)) {
      return this.mvKiller2;
    }
    // No Break
  case PHASE_GEN_MOVES:
    this.phase = PHASE_REST;
    this.mvs = this.pos.generateMoves(null);
    this.vls = [];
    for (let i = 0; i < this.mvs.length; ++i) {
      this.vls.push(this.historyTable[this.pos.historyIndex(this.mvs[i])]);
    }
    shellSort(this.mvs, this.vls);
    this.index = 0;
    // No Break
  default:
    while (this.index < this.mvs.length) {
      let mv = this.mvs[this.index];
      ++this.index;
      if (mv !== this.mvHash && mv !== this.mvKiller1 && mv !== this.mvKiller2) {
        return mv;
      }
    }
  }
  return 0;
}

const LIMIT_DEPTH = 64;
const NULL_DEPTH = 2;
const RANDOMNESS = 8;

const HASH_ALPHA = 1;
const HASH_BETA = 2;
const HASH_PV = 3;

function Search(pos, hashLevel) {
  this.hashMask = (1 << hashLevel) - 1;
  this.pos = pos;
}

Search.prototype.getHashItem = function() {
  return this.hashTable[this.pos.zobristKey & this.hashMask];
}

Search.prototype.probeHash = function(vlAlpha, vlBeta, depth, mv) {
  let hash = this.getHashItem();
  if (hash.zobristLock !== this.pos.zobristLock) {
    mv[0] = 0;
    return -MATE_VALUE;
  }
  mv[0] = hash.mv;
  let mate = false;
  if (hash.vl > WIN_VALUE) {
    if (hash.vl <= BAN_VALUE) {
      return -MATE_VALUE;
    }
    hash.vl -= this.pos.distance;
    mate = true;
  } else if (hash.vl < -WIN_VALUE) {
    if (hash.vl >= -BAN_VALUE) {
      return -MATE_VALUE;
    }
    hash.vl += this.pos.distance;
    mate = true;
  } else if (hash.vl === this.pos.drawValue()) {
    return -MATE_VALUE;
  }
  if (hash.depth < depth && !mate) {
    return -MATE_VALUE;
  }
  if (hash.flag === HASH_BETA) {
    return (hash.vl >= vlBeta ? hash.vl : -MATE_VALUE);
  }
  if (hash.flag === HASH_ALPHA) {
    return (hash.vl <= vlAlpha ? hash.vl : -MATE_VALUE);
  }
  return hash.vl;
}

Search.prototype.recordHash = function(flag, vl, depth, mv) {
  let hash = this.getHashItem();
  if (hash.depth > depth) {
    return;
  }
  hash.flag = flag;
  hash.depth = depth;
  if (vl > WIN_VALUE) {
    if (mv === 0 && vl <= BAN_VALUE) {
      return;
    }
    hash.vl = vl + this.pos.distance;
  } else if (vl < -WIN_VALUE) {
    if (mv === 0 && vl >= -BAN_VALUE) {
      return;
    }
    hash.vl = vl - this.pos.distance;
  } else if (vl === this.pos.drawValue() && mv === 0) {
    return;
  } else {
    hash.vl = vl;
  }
  hash.mv = mv;
  hash.zobristLock = this.pos.zobristLock;
}

Search.prototype.setBestMove = function(mv, depth) {
  this.historyTable[this.pos.historyIndex(mv)] += depth * depth;
  let mvsKiller = this.killerTable[this.pos.distance];
  if (mvsKiller[0] !== mv) {
    mvsKiller[1] = mvsKiller[0];
    mvsKiller[0] = mv;
  }
}

Search.prototype.searchQuiesc = function(vlAlpha_, vlBeta) {
  let vlAlpha = vlAlpha_;
  ++this.allNodes;
  let vl = this.pos.mateValue();
  if (vl >= vlBeta) {
    return vl;
  }
  let vlRep = this.pos.repStatus(1);
  if (vlRep > 0) {
    return this.pos.repValue(vlRep);
  }
  if (this.pos.distance === LIMIT_DEPTH) {
    return this.pos.evaluate();
  }
  let vlBest = -MATE_VALUE;
  let mvs = [], vls = [];
  if (this.pos.inCheck()) {
    mvs = this.pos.generateMoves(null);
    for (let i = 0; i < mvs.length; ++i) {
      vls.push(this.historyTable[this.pos.historyIndex(mvs[i])]);
    }
    shellSort(mvs, vls);
  } else {
    vl = this.pos.evaluate();
    if (vl > vlBest) {
      if (vl >= vlBeta) {
        return vl;
      }
      vlBest = vl;
      vlAlpha = Math.max(vl, vlAlpha);
    }
    mvs = this.pos.generateMoves(vls);
    shellSort(mvs, vls);
    for (let i = 0; i < mvs.length; ++i) {
      if (vls[i] < 10 || (vls[i] < 20 && HOME_HALF(DST(mvs[i]), this.pos.sdPlayer))) {
        mvs.length = i;
        break;
      }
    }
  }
  for (let i = 0; i < mvs.length; ++i) {
    if (!this.pos.makeMove(mvs[i])) {
      continue;
    }
    vl = -this.searchQuiesc(-vlBeta, -vlAlpha);
    this.pos.undoMakeMove();
    if (vl > vlBest) {
      if (vl >= vlBeta) {
        return vl;
      }
      vlBest = vl;
      vlAlpha = Math.max(vl, vlAlpha);
    }
  }
  return vlBest === -MATE_VALUE ? this.pos.mateValue() : vlBest;
}

Search.prototype.searchFull = function(vlAlpha_, vlBeta, depth, noNull) {
  let vlAlpha = vlAlpha_;
  if (depth <= 0) {
    return this.searchQuiesc(vlAlpha, vlBeta);
  }
  ++this.allNodes;
  let vl = this.pos.mateValue();
  if (vl >= vlBeta) {
    return vl;
  }
  let vlRep = this.pos.repStatus(1);
  if (vlRep > 0) {
    return this.pos.repValue(vlRep);
  }
  let mvHash = [0];
  vl = this.probeHash(vlAlpha, vlBeta, depth, mvHash);
  if (vl > -MATE_VALUE) {
    return vl;
  }
  if (this.pos.distance === LIMIT_DEPTH) {
    return this.pos.evaluate();
  }
  if (!noNull && !this.pos.inCheck() && this.pos.nullOkay()) {
    this.pos.nullMove();
    vl = -this.searchFull(-vlBeta, 1 - vlBeta, depth - NULL_DEPTH - 1, true);
    this.pos.undoNullMove();
    if (vl >= vlBeta && (this.pos.nullSafe() ||
        this.searchFull(vlAlpha, vlBeta, depth - NULL_DEPTH, true) >= vlBeta)) {
      return vl;
    }
  }
  let hashFlag = HASH_ALPHA;
  let vlBest = -MATE_VALUE;
  let mvBest = 0;
  let sort = new MoveSort(mvHash[0], this.pos, this.killerTable, this.historyTable);
  let mv;
  while ((mv = sort.next()) > 0) {
    if (!this.pos.makeMove(mv)) {
      continue;
    }
    let newDepth = this.pos.inCheck() || sort.singleReply ? depth : depth - 1;
    if (vlBest === -MATE_VALUE) {
      vl = -this.searchFull(-vlBeta, -vlAlpha, newDepth, false);
    } else {
      vl = -this.searchFull(-vlAlpha - 1, -vlAlpha, newDepth, false);
      if (vl > vlAlpha && vl < vlBeta) {
        vl = -this.searchFull(-vlBeta, -vlAlpha, newDepth, false);
      }
    }
    this.pos.undoMakeMove();
    if (vl > vlBest) {
      vlBest = vl;
      if (vl >= vlBeta) {
        hashFlag = HASH_BETA;
        mvBest = mv;
        break;
      }
      if (vl > vlAlpha) {
        vlAlpha = vl;
        hashFlag = HASH_PV;
        mvBest = mv;
      }
    }
  }
  if (vlBest === -MATE_VALUE) {
    return this.pos.mateValue();
  }
  this.recordHash(hashFlag, vlBest, depth, mvBest);
  if (mvBest > 0) {
    this.setBestMove(mvBest, depth);
  }
  return vlBest;
}

Search.prototype.searchRoot = function(depth) {
  let vlBest = -MATE_VALUE;
  let sort = new MoveSort(this.mvResult, this.pos, this.killerTable, this.historyTable);
  let mv;
  while ((mv = sort.next()) > 0) {
    if (!this.pos.makeMove(mv)) {
      continue;
    }
    let newDepth = this.pos.inCheck() ? depth : depth - 1;
    let vl;
    if (vlBest === -MATE_VALUE) {
      vl = -this.searchFull(-MATE_VALUE, MATE_VALUE, newDepth, true);
    } else {
      vl = -this.searchFull(-vlBest - 1, -vlBest, newDepth, false);
      if (vl > vlBest) {
        vl = -this.searchFull(-MATE_VALUE, -vlBest, newDepth, true);
      }
    }
    this.pos.undoMakeMove();
    if (vl > vlBest) {
      vlBest = vl;
      this.mvResult = mv;
      if (vlBest > -WIN_VALUE && vlBest < WIN_VALUE) {
        vlBest += Math.floor(Math.random() * RANDOMNESS) -
            Math.floor(Math.random() * RANDOMNESS);
        vlBest = (vlBest === this.pos.drawValue() ? vlBest - 1 : vlBest);
      }
    }
  }
  this.setBestMove(this.mvResult, depth);
  return vlBest;
}

Search.prototype.searchUnique = function(vlBeta, depth) {
  let sort = new MoveSort(this.mvResult, this.pos, this.killerTable, this.historyTable);
  sort.next();
  let mv;
  while ((mv = sort.next()) > 0) {
    if (!this.pos.makeMove(mv)) {
      continue;
    }
    let vl = -this.searchFull(-vlBeta, 1 - vlBeta,
        this.pos.inCheck() ? depth : depth - 1, false);
    this.pos.undoMakeMove();
    if (vl >= vlBeta) {
      return false;
    }
  }
  return true;
}

Search.prototype.searchMain = function(depth, millis) {
  this.mvResult = this.pos.bookMove();
  if (this.mvResult > 0) {
    this.pos.makeMove(this.mvResult);
    if (this.pos.repStatus(3) === 0) {
      this.pos.undoMakeMove();
      return this.mvResult;
    }
    this.pos.undoMakeMove();
  }
  this.hashTable = [];
  for (let i = 0; i <= this.hashMask; ++i) {
    this.hashTable.push({depth: 0, flag: 0, vl: 0, mv: 0, zobristLock: 0});
  }
  this.killerTable = [];
  for (let i = 0; i < LIMIT_DEPTH; ++i) {
    this.killerTable.push([0, 0]);
  }
  this.historyTable = [];
  for (let i = 0; i < 4096; ++i) {
    this.historyTable.push(0);
  }
  this.mvResult = 0;
  this.allNodes = 0;
  this.pos.distance = 0;
  let t = new Date().getTime();
  for (let i = 1; i <= depth; ++i) {
    let vl = this.searchRoot(i);
    this.allMillis = new Date().getTime() - t;
    if (this.allMillis > millis) {
      break;
    }
    if (vl > WIN_VALUE || vl < -WIN_VALUE) {
      break;
    }
    if (this.searchUnique(1 - WIN_VALUE, i)) {
      break;
    }
  }
  return this.mvResult;
}

Search.prototype.getKNPS = function() {
  return this.allNodes / this.allMillis;
}
