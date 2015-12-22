/*
* All non-combat commands that one would consider 'general' to a all
* users (like get, look, and movement). Anything combat (even potentially) related is in skills.js
*/
'use strict';
var fs = require('fs'),
util = require('util'),
World = require('./world').world,
Character = require('./character').character,
Room = require('./rooms').room,
Combat = require('./combat').combat,
Dice = require('./dice').roller,
players = World.players,
time = World.time,
areas = World.areas,

Cmd = function () {};

Cmd.prototype.fire = function(commandName, target, command, fn) {
	return this[commandName](target, command, fn);
}

// Puts any target object into a defined room after verifying criteria
Cmd.prototype.move = function(target, command, fn) {
	var world = this,
	direction = command.msg,
	s;

	if (target.player) {
		s = target;
		target = target.player;
	}

	if (target.position !== 'fighting' && target.position 
		!== 'resting' && target.position !== 'sleeping' 
		&& target.cmv > 5 && target.wait === 0) {

		World.getRoomObject(target.area, target.roomid, function(roomObj) {
			Room.checkExit(roomObj, direction, function(isValidExit, exitObj) {
				if (exitObj) {
					if (!exitObj.area) {
						exitObj.area = roomObj.area;
					}

					Room.getDisplay(exitObj.area, exitObj.id, function(displayHTML, targetRoom) {
						Room.checkExitCriteria(target, targetRoom, function(clearToMove) {
							Room.checkEntranceCriteria(target, targetRoom, function(clearToMove) {
								if (clearToMove) {
									Dice.movementCheck(target, targetRoom, function(moveMod) {
										target.cmv = Math.round((target.cmv - ( (12) - target.dex/4)));

										target.roomid = targetRoom.id;

										if (targetRoom.terrianMod) {
											target.wait += targetRoom.terrianMod;
										}

										if (target.isPlayer) {
											Character.updatePlayer(target);

											World.msgPlayer(target, {
												msg: displayHTML,
												styleClass: 'room'
											});

											Room.remove('playersInRoom', target, roomObj, function() {
												targetRoom.playersInRoom.push(target);
											});
										} else {
											Room.remove('monsters', target, roomObj, function() {
												targetRoom.monsters.push(target);
											});
										}

										World.msgRoom(targetRoom, {
											msg:'<strong>' + target.name + '</strong> a ' + target.race + ' enters the room.',
											playerName: target.name
										});

										World.msgRoom(roomObj, {
											msg: '<strong>' + target.name + '</strong> leaves the room <strong>heading ' + direction + '</strong>'
										});

										if (typeof fn === 'function') {
											return fn(true, roomObj, targetRoom);
										}
									});
								} else {
									target.cmv = Math.round((target.cmv - (7 - target.dex/4)));

									if (typeof fn === 'function') {
										return fn(true, roomObj, targetRoom);
									}
								}
							});
						});
					});
				} else {
					target.cmv = Math.round((target.cmv - (7 - target.dex/4)));

					World.msgPlayer(target, {
						msg: 'There is no exit in that direction.', 
						styleClass: 'error'
					});

					if (typeof fn === 'function') {
						return fn(false);
					}
				}
			});
		});
	} else {
		World.msgPlayer(target, {
			msg: 'You cannot do that now.', 
			styleClass: 'error'
		});

		if (typeof fn === 'function') {
			return fn(false);
		}
	}
};

Cmd.prototype.who = function(target, command) {
	var str = '', 
	player,
	displayName = '',
	i = 0;
	
	if (World.players.length > 0) {
		for (i; i < World.players.length; i += 1) {
			player = World.io.sockets.connected[World.players[i].sid].player; // A visible player in players[]

			displayName = player.displayName;

			if (player.title === '') {
				displayName += ' a level ' + player.level + ' ' + player.race + ' ' + player.charClass;
			} else {
				displayName += ' ' + player.title;
			}

			str += '<tr>' +
				'<td class="who-lvl">' + player.level + '</td>' +
				'<td class="who-race">' + player.race + '</td>' +
				'<td class="who-class">' + player.charClass + '</td>' +
				'<td class="who-player">' + displayName + '</td>' +
			'</tr>';
		}

		str = '<div class="cmd-who"><h2>Visible Players</h2><table class="table table-condensed who-list">' +
			'<thead>' +
				'<tr>' +
					'<td width="5%">Level</td>' +
					'<td width="5%">Race</td>' +
					'<td width="5%">Class</td>' +
					'<td width="85%">Player</td>' +
				'</tr>' +
			'</thead><tbody>' + str + '</tbody>' +
		'</table></div>'
		
		World.msgPlayer(target, {
			msg: str, 
			styleClass: 'who-cmd'
		});
	} else {
		World.msgPlayer(target, {
			msg: '<div class="cmd-who"><h2>No Visible Players</h2></div>', 
			styleClass: 'who-cmd'
		});
	}
};

Cmd.prototype.get = function(target, command, fn) {
	if (command.msg !== '') {
		World.getRoomObject(target.area, target.roomid, function(roomObj) {
			Room.search(roomObj.items, command, function(item) {
				if (item) {
					Room.remove('items', item, roomObj, function(removed, roomObj) {
						Character.addToInventory(item, target, function(canAdd) {
							World.msgRoom(roomObj, {
								msg: target.name + ' picks up ' + item.short,
								playerName: target.name,
								styleClass: 'cmd-get'
							});

							World.msgPlayer(target, {
								msg: 'You pick up ' + item.short,
								styleClass: 'cmd-get'
							});

							if (typeof fn === 'function') {
								return fn(target, roomObj, item);
							}
						});
					});
				} else {
					World.msgPlayer(target, {msg: 'That item is not here.', styleClass: 'error'});

					if (typeof fn === 'function') {
						return fn(target, roomObj, false);
					}
				}
			});
		});
	} else {
		World.msgPlayer(target, {msg: 'Get what?', styleClass: 'error'});

		if (typeof fn === 'function') {
			return fn(target, roomObj, item);
		}
	}
};

Cmd.prototype.drop = function(target, command, fn) {
	if (r.msg !== '') {
		Character.checkInventory(r, s, function(fnd, item) {
			if (fnd) {
				Character.removeFromInventory(s, item, function(removed) {
					if (removed) {
						Room.addItem({area: s.player.area, id: s.player.roomid, item: item}, function() {
							s.emit('msg', {
								msg: 'You dropped ' + item.short,
								styleClass: 'get'
							});
							
							return World.prompt(s);
						});
					} else {
						s.emit('msg', {msg: 'Could not drop a ' + item.short, styleClass: 'error'});
						return World.prompt(s);
					}
				});
			} else {
				s.emit('msg', {msg: 'That item is not here.', styleClass: 'error'});
				return World.prompt(s);
			}
		});
	} else {
		s.emit('msg', {msg: 'Drop what?', styleClass: 'error'});
		return World.prompt(s);
	}
};


// For attacking in-game monsters
Cmd.prototype.kill = function(target, command) {
	Room.checkMonster(r, s, function(fnd, target) {
		if (fnd) {
			Combat.begin(s, target, function(contFight, target) { // the first round qualifiers
				var combatInterval;

				Character.prompt(s);

				if (contFight) {
					// Combat Loop
					combatInterval = setInterval(function() {
						if (s.player.position === 'fighting' && target.position === 'fighting') {
							
							Combat.fight(s, target, function(contFight) {
								if (!contFight) {
									target.position = 'dead';

									clearInterval(combatInterval);

									Room.removeMonster({
										area: s.player.area,
										id: s.player.roomid
									}, target, function(removed) {
										if (removed) { 
											Room.addCorpse(s, target, function(corpse) {
												Combat.calXP(s, target, function(earnedXP) {
													s.player.position = 'standing';
													s.player.wait = 0;

													if (earnedXP > 0) {
														s.emit('msg', {msg: 'You won the fight! You learn some things, resulting in ' + earnedXP + ' experience points.', styleClass: 'victory'});
													} else {
														s.emit('msg', {msg: 'You won but learned nothing.', styleClass: 'victory'});
													}
												});
											});
										}
									});

								} else if (s.player.chp <= 0) {
									clearInterval(combatInterval);
									s.emit('msg', {msg: 'You died!', styleClass: 'combat-death'});
									//Character.death(s);
								}	

								Character.prompt(s);
							});	
						}	
					}, 1800);
				}
			});
		} else {
			s.emit('msg', {msg: 'There is nothing by that name here.', styleClass: 'error'});
			return World.prompt(s);
		}
	});
};

Cmd.prototype.look = function(target, command) {
	if (command.msg === '') { 
		// if no arguments are given we display the current room
		World.getRoomObject(target.area, target.roomid, function(roomObj) {
			Room.getDisplayHTML(roomObj, {
				hideCallingPlayer: target.name
			},function(displayHTML, roomObj) {
				World.msgPlayer(target, {
					msg: displayHTML,
					styleClass: 'room'
				});
			});
		});
	} else {
		// Gave us a noun, so lets see if something matches it in the room. 
		Room.checkMonster(r, s, function(fnd, monster) {
			Room.checkItem(r, s, function(fnd, item) {
				return World.prompt(target);
			});
		});
	}
};

Cmd.prototype.where = function(r, s) {
	r.msg = '<ul>' + 
	'<li>Your Name: ' + Character[s.id].name + '</li>' +
	'<li>Current Area: ' + Character[s.id].area + '</li>' +
	'<li>Room Number: ' + Character[s.id].id + '</li>' +
	'</ul>';

	r.styleClass = 'playerinfo where';

	s.emit('msg', r);

	return World.prompt(s);
};


/** Communication Channels **/
Cmd.prototype.say = function(target, command) {
	World.msgPlayer(target, {
		msg: '<div class="cmd-say"><span class="msg-name">You say></span> ' + command.msg + '</div>'
	});

	World.getRoomObject(target.area, target.roomid, function(roomObj) {
		World.msgRoom(roomObj, {
			msg: '<div class="cmd-say"><span class="msg-name">' + target.name + ' says></span> ' + command.msg + '</div>',
			playerName: target.name
		});
	});
};

Cmd.prototype.yell = function(target, command) {
	World.msgToPlayer(target, {
		msg: '<div class="cmd-yell"><span class="msg-name">You yell></span> ' + command.msg + '</div>'
	});
	
	World.msgArea(target.area, {
		msg: '<div class="cmd-yell"><span class="msg-name">' + target.name + ' yells></span> ' + command.msg + '</div>',
		playerName: s.player.name
	});
};


Cmd.prototype.chat = function(target, command) {
	World.msgPlayer(target, {
		msg: '<div class="cmd-chat"><span class="msg-name">You chat></span> ' + command.msg + '</div>'
	});

	World.msgWorld(target, {
		msg: '<div class="cmd-chat"><span class="msg-name">' + target.name + '></span> ' + command.msg + '</div>',
		playerName: target.name
	});
};

/*
Cmd.prototype.tell = function(r, s) {
	var i  = 0;
	
	s.emit('msg', {msg: 'You tell ' + r.playerName + '> ' + r.msg, styleClass: 'cmd-say'});
	
	Character.msgToPlayer({
		msg: s.player.name + ' tells you> ' + r.msg, 
		playerName: s.player.name
	}, true);
};

Cmd.prototype.reply = function(r, s) {
	var i  = 0;
	
	s.emit('msg', {msg: 'You reply to ' + s.player.reply + '> ' + r.msg, styleClass: 'cmd-say'});
	
	Character.msgToPlayer({
		msg: s.player.name + ' tells you> ' + r.msg, 
		playerName: s.player.name
	}, true);
};
*/

Cmd.prototype.achat = function(target, command) { 
	if (target.role === 'admin') {
		World.msgPlayer(target, {
			msg: '<div class="cmd-chat"><span class="msg-name">You chat></span> ' + command.msg + '</div>'
		});

		World.msgWorld(target, {
			msg: '<div class="cmd-chat"><span class="msg-name">' + target.name + '></span> ' + command.msg + '</div>',
			playerName: target.name
		});
	} else {
		World.msgPlayer(target, {
			msg: '<div class="error">You are not powerful enough to speak directly with gods.</div>'
		});
	}
};

// Viewing the time
Cmd.prototype.time = function(r, s) {

};

/** Related to Saving and character adjustment/interaction **/

Cmd.prototype.save = function(r, s) {
	Character.save(s, function() {
		s.emit('msg', {msg: s.player.name + ' was saved! Whew!', styleClass: 'save'});
		return World.prompt(s);
	});
};

Cmd.prototype.title = function(r, s) {
	if (r.msg.length < 40) {
		if (r.msg != 'title') {
			s.player.title = r.msg;
		} else {
			s.player.title = ' a level ' + s.player.level + ' ' + s.player.race + ' ' + s.player.charClass;
		}

		Character.updatePlayer(s, function(updated) {
			s.emit('msg', {msg: 'Your title was changed!', styleClass: 'save'});
			return World.prompt(s);
		});
	} else {
		s.emit('msg', {msg: 'Not a valid title.', styleClass: 'save'});
		return World.prompt(s);
	}
};

// View equipment
Cmd.prototype.equipment = function(r, s) {
	var eqStr = '',
	i = 0;	
	
	for (i; i < s.player.eq.length; i += 1) {	
		eqStr += '<li class="slot-' + s.player.eq[i].slot.replace(/ /g, '') + 
			'">' + s.player.eq[i].name + ': ';
		
		if (s.player.eq[i].item === null || s.player.eq[i].item === '') {
			eqStr += ' Nothing</li>';
		} else {
			eqStr += '<strong>'  + s.player.eq[i].item.short + '</strong></li>';
		}
	}
	
	s.emit('msg', {
		msg: '<h3>You are wearing:</h3>' +
			'<ul class="equipment-list">' +
		eqStr + '</ul>', 
		styleClass: 'cmd-eq' 
	});
	
	return World.prompt(s);
};

// Current skills
Cmd.prototype.skills = function(r, s) {
	var skills = '',
	i = 0;
	
	if (s.player.skills.length > 0) {
		for (i; i < s.player.skills.length; i += 1) {
			skills += s.player.skills[i].name;
		}
		
		s.emit('msg', {msg: 'skills', styleClass: 'eq' });
		return World.prompt(s);
	} else {
		s.emit('msg', {msg: 'skills', styleClass: 'eq' });
		return World.prompt(s);
	}
};

Cmd.prototype.wear = function(r, s) {
	if (r.msg !== '') {
		Character.checkInventory(r, s, function(fnd, item) {
			if (fnd) {
				 Character.wear(r, s, item, function(wearSuccess, msg) {
					s.emit('msg', {msg: msg, styleClass: 'cmd-wear'});
					return World.prompt(s);
				});
			} else {
				s.emit('msg', {msg: 'That item is not here.', styleClass: 'error'});
				return World.prompt(s);
			}
		});
	} else {
		s.emit('msg', {msg: 'Wear what?', styleClass: 'error'});
		return World.prompt(s);
	}
};

/*
Cmd.prototype.remove = function(r, s) {
	if (r.msg !== '') {
		Character.checkInventory(r, s, function(fnd, item) {
			if (fnd) {
				Character.remove(r, s, item, function(removeSuccess, msg) {
					s.emit('msg', {msg: msg, styleClass: 'cmd-wear'});
					return World.prompt(s);
				});
			} else {
				s.emit('msg', {msg: 'You are not wearing that.', styleClass: 'error'});
				return World.prompt(s);
			}
		});
	} else {
		s.emit('msg', {msg: 'Remove what?', styleClass: 'error'});
		return World.prompt(s);
	}
}
*/

Cmd.prototype.inventory = function(r, s) {
	var iStr = '',
	i = 0;
	
	if (s.player.items.length > 0) {
		for (i; i < s.player.items.length; i += 1) {
			if (!s.player.items[i].equipped) {
				iStr += '<li>' + s.player.items[i].short + '</li>';
			} else {
				iStr += '<li>' + s.player.items[i].short + ' (Equipped) </li>';
			}		
			
		}
		
		s.emit('msg', {msg: '<ul>' + iStr + '</ul>', styleClass: 'inventory' });
		return World.prompt(s);
	} else {
		s.emit('msg', {msg: 'No items in your inventory, can carry ' + s.player.carry + ' pounds of gear.', styleClass: 'inventory' });
		return World.prompt(s);
	}
};

Cmd.prototype.score = function(target, command, fn) {
	var i = 0,
	score = '<section class="row score"><div class="col-md-12"><h1>' + 
		'<span class="score-name">' + target.displayName + '</span>' + 
		'<span class="score-title">' + target.title + '</span> ' + 
		'<span class="score-level"> (' + target.level + ')</span></h1></div>' +
		'<div class="stats">' +
			'<div class="col-md-12">' +
				'<div class="row">' + 
				'<ul class="col-md-12 score-info list-inline">' +
					'<li class="stat-hp first"><label>HP:</label> <strong>' +  target.chp + '</strong>/' + target.hp + ' </li>' +
					'<li class="stat-mana"><label>Mana:</label> <strong>' + target.cmana + '</strong>/' + target.mana + '</li>' +
					'<li class="stat-mv"><label>Moves:</label> <strong>' + target.cmv + '</strong>/' + target.mv + '</li>' +
					'<li class="stat-levl"><label>Level:</label> ' +  target.level + '</li>' +
				'</ul>' +
				'<ul class="col-md-3 score-stats list-unstyled">' +
					'<li class="stat-str first"><label>STR:</label> ' + target.str + ' (20)</li>' +
					'<li class="stat-wis"><label>WIS:</label> ' + target.wis + ' (26) </li>' +
					'<li class="stat-int"><label>INT:</label> ' + target.int + ' (18)</li>' +
					'<li class="stat-dex"><label>DEX:</label> ' + target.dex + ' (14)</li>' +
					'<li class="stat-con"><label>CON:</label> ' + target.con + ' (20)</li>' +
				'</ul>' +
				'<ul class="col-md-3 score-stats list-unstyled">' +
					'<li class="stat-armor"><label>Armor:</label> ' + target.ac + '</li>' +
					'<li class="stat-gold"><label>Gold:</label> ' + target.gold + '</li>' +
					'<li class="stat-hunger"><label>Hunger:</label>' + target.hunger +'</li>' +
					'<li class="stat-thirst"><label>Thirst:</label> 0</li>' +
					'<li class="stat-trains last"><label>Trains:</label> ' + target.thirst + '</li>' +
				'</ul>' +
				'<div class="stat-details">' +
					'<ul class="col-md-3 score-stats list-unstyled">' +
						'<li class="stat-position"><label>Hit Bonus: </labels> 3</li>' +
						'<li class="stat-position"><label>Damage Bonus: </label> 3</li>' +
						'<li class="stat-position"><label>Magic resistance: </label> -3</li>' +
						'<li class="stat-position"><label>Melee resistance: </label> -3</li>' +
						'<li class="stat-position"><label>Poison resistance: </label> -3</li>' +
						'<li class="stat-position"><label>Detection: </label> 2</li>' +
						'<li class="stat-position"><label>Knowledge: </label> 2</li>' +
						'<li class="stat-position"><label>Evasion: </label> 2</li>' +
					'</ul>' +
					'<div class="col-md-3 score-img">' +
						'<img width="100%" src="http://content.turbine.com/sites/www.lotro.com/f2p/images/race/dwarf.png" />' +
					'</div>' +
				'</div>' +
				'<ul class="col-md-12 list-unstyled">' +
					'<li class="stat-position"><label>Position: </label> ' + target.position + '</li>' +
					'<li class="stat-level">You are a level ' + target.level + ' ' + target.race + ' '+  target.charClass + '.</li>' +
					'<li class="stat-carry">You are carrying ' + target.weight + '/' + target.maxWeight + ' pounds.</li>' +
					'<li class="stat-xp">You need <strong>' + target.exp + '</strong> experience for your next level.</li>' +
					'<li class="stat-killcnt last">You have slain 100 foes.</li>' +
				'</ul>' +
			'</div>'
				'</div>' +
		'</div></section>';

	World.msgPlayer(target, { msg: score });
};

Cmd.prototype.help = function(r, s) {
	// if we don't list a specific help file we return help.json
	var helpTxt = '';

	if (r.msg !== '') {
		fs.readFile('./help/' + r.msg + '.json', function (err, data) {
			if (!err) {
				data = JSON.parse(data);

				helpTxt = '<h2>Help: ' + data.name + '</h2> ' + data.description + 
				'<p class="small">Related: '+ data.related.toString() + '</p>';

				s.emit('msg', {msg: helpTxt, styleClass: 'cmd-help' });

				return World.prompt(s);
			} else {
				s.emit('msg', {msg: 'No help file found.', styleClass: 'error' });	

				return World.prompt(s);
			}
		});	
	} else {
		s.emit('msg', {msg: 'Help you with what exactly?', styleClass: 'error' });

		return World.prompt(s);
	}
};

Cmd.prototype.xyzzy = function(s) {
	Room.msgToRoom({
		msg: s.player.name + 	' tries to xyzzy but nothing happens.', 
		roomid: s.player.roomid,
		styleClass: 'error'
	}, true, function() {
		s.emit('msg', {msg: 'Nothing happens. Why would it?', styleClass: 'error' });

		return World.prompt(s);
	});
};

/**********************************************************************************************************
* ADMIN COMMANDS  
************************************************************************************************************/

/*
* View a string representation of the JSON behind a world object.
* Syntax: json objectType (item, room, monster or player)
* typing 'json' alone will give the json object for the entire current room. 
*/
Cmd.prototype.json = function(r, s) {
	if (s.player.role === 'admin' && r.msg) {
		Character.checkInventory(r,s,function(fnd,item) {
			if (fnd) {
				s.emit('msg', {msg: util.inspect(item, {depth: null})});
			} else {
				Room.checkItem(r, s, function (fnd, item) {
					if (fnd) {
						s.emit('msg', {msg: util.inspect(item, {depth: null})});
					} else {
						Room.checkMonster(r, s, function (fnd, monster) {
								if (fnd) {
									s.emit('msg', {msg: util.inspect(monster, {depth: null})});
								} else {
									s.emit('msg', {msg: 'Target not found.', styleClass: 'error' });
								}
							}
						);
					}
				});
			}
		});
	} else {
		s.emit('msg', {msg: 'Jason who?', styleClass: 'error' });
	}
};

/*
* An in game reboot. 
* Stops all combat, reloads all active areas, saves players, and clears all corpses / items with a decay flag
*/
Cmd.prototype.reboot = function(r, s) {
	if (s.player.role === 'admin') {

	} else {
		s.emit('msg', {msg: 'No.', styleClass: 'error' });	
		return World.prompt(s);
	}
};

// Fully heal everyone on the MUD
Cmd.prototype.restore = function(r, s) {
	if (s.player.role === 'admin') {

	} else {
		s.emit('msg', {msg: 'You do not possess that kind of power.', styleClass: 'error' });	
		return World.prompt(s);
	}
};
 
// Stops all game combat, does not heal
Cmd.prototype.peace = function(r, s) {
	if (s.player.role === 'admin') {

	} else {
		s.emit('msg', {msg: 'You do not possess that kind of power.', styleClass: 'error' });	
		return World.prompt(s);
	}
};

module.exports.cmd = new Cmd();
