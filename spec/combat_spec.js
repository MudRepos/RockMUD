const MOCK_SERVER = require('../mocks/mock_server');

describe('Testing: COMBAT LOOP', () => {
    let combatLoop;
    let cmdLoop;
    let mockPlayer;
    let mockPlayerRoom;
    let mockPlayerArea;
    let dragon;
    let server;

    beforeEach((done) => {
        MOCK_SERVER.setup(() => {
            server = MOCK_SERVER.server;

            cmdLoop = spyOn(server.world.ticks, 'cmdLoop').and.callThrough();
            combatLoop = spyOn(server.world.ticks, 'combatLoop').and.callThrough();

            jasmine.clock().install();

            mockPlayer = MOCK_SERVER.getNewPlayerEntity();
            mockPlayer.area = 'midgaard';
            mockPlayer.originatingArea = mockPlayer.area;
            mockPlayer.roomid = '1';
          
            mockPlayerArea = server.world.getArea(mockPlayer.area);

            mockPlayerRoom = server.world.getRoomObject(mockPlayer.area, mockPlayer.roomid);

            mockPlayerRoom.playersInRoom.push(mockPlayer);

            server.world.players.push(mockPlayer);

            done();
        }, false, false);
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    it('should simulate player initiating combat with a deer and the deer being killed.', () => {
        const endOfCombatSpy = spyOn(server.world.combat, 'processEndOfCombat').and.callThrough();
        const createCorpseSpy = spyOn(server.world.character, 'createCorpse').and.callThrough();
        let deer = MOCK_SERVER.getNewEntity();
        deer.level = 1;
        deer.isPlayer = false;
        deer.name = 'deer';
        deer.displayName = 'Brown Deer';
        deer.refId = 'deer-refid';
        deer.area = mockPlayer.area;
        deer.originatingArea = mockPlayer.area;
        deer.roomid = mockPlayer.roomid;
        deer.cmv = 100;
        deer.mv = 100;
        deer.hp = 100;
        deer.chp = 1;
        mockPlayer.hitroll = 20; // beats the default entity AC of 10 so we always hit

        mockPlayerRoom.monsters = [];
        mockPlayerRoom.monsters.push(deer);
        
        setInterval(function() {
            server.world.ticks.cmdLoop();
        }, 280);

        setInterval(function() {
            server.world.ticks.combatLoop();
        }, 1900);

        expect(combatLoop).not.toHaveBeenCalled();

        let cmd = server.world.commands.createCommandObject({
            msg: 'kill deer'
        });

        server.world.addCommand(cmd, mockPlayer);

        jasmine.clock().tick(280);

        let battleObj = server.world.combat.getBattleByRefId(mockPlayer.refId);

        while (deer.chp > 0) {
            jasmine.clock().tick(1900); // trigger combat loop
        }

        expect(battleObj).toBeTruthy();
        expect(combatLoop).toHaveBeenCalled();
        expect(endOfCombatSpy).toHaveBeenCalledWith(battleObj, mockPlayer, deer)
        expect(createCorpseSpy).toHaveBeenCalledWith(deer);
    });

    it('should simulate player initiating combat with a deer and casting Spark until each deer is killed.', () => {
        const endOfCombatSpy = spyOn(server.world.combat, 'processEndOfCombat').and.callThrough();
        const createCorpseSpy = spyOn(server.world.character, 'createCorpse').and.callThrough();
        const sparkSpell = {
            "id": "spark",
            "display": "Spark",
            "mod": 0,
            "train": 100,
            "type": "spell",
            "learned": true
        };
        let deer = MOCK_SERVER.getNewEntity();
        deer.level = 1;
        deer.isPlayer = false;
        deer.name = 'brown deer';
        deer.displayName = 'Brown Deer';
        deer.refId = 'deer-refid';
        deer.area = mockPlayer.area;
        deer.originatingArea = mockPlayer.area;
        deer.roomid = mockPlayer.roomid;
        deer.cmv = 100;
        deer.mv = 100;
        deer.hp = 100;
        deer.chp = 100;
        let redDeer = MOCK_SERVER.getNewEntity();
        redDeer.level = 1;
        redDeer.isPlayer = false;
        redDeer.name = 'red deer';
        redDeer.displayName = 'Red Deer';
        redDeer.refId = 'red-deer-refid';
        redDeer.area = mockPlayer.area;
        redDeer.originatingArea = mockPlayer.area;
        redDeer.roomid = mockPlayer.roomid;
        redDeer.cmv = 100;
        redDeer.mv = 100;
        redDeer.hp = 100;
        redDeer.chp = 100;
        
        mockPlayer.cmana = 100;
        mockPlayer.hp = 1000;
        mockPlayer.chp = 1000;
        mockPlayer.hitroll = 20; // beats the default entity AC of 10 so we always hit
        mockPlayer.skills.push(sparkSpell);

        mockPlayerRoom.monsters = [];
        mockPlayerRoom.monsters.push(deer);
        mockPlayerRoom.monsters.push(redDeer);
        
        setInterval(function() {
            server.world.ticks.cmdLoop();
        }, 280);  

        setInterval(function() {
            server.world.ticks.combatLoop();
        }, 1900);

        expect(combatLoop).not.toHaveBeenCalled();

        let cmd = server.world.commands.createCommandObject({
            msg: 'cast spark 2.deer'
        });

        server.world.addCommand(cmd, mockPlayer);

        jasmine.clock().tick(280);

        let battleObj = server.world.combat.getBattleByRefId(mockPlayer.refId);

        expect(battleObj).toBeTruthy();

        cmd = server.world.commands.createCommandObject({
            msg: 'cast spark'
        });

        while (redDeer.chp > 0) {
            if (mockPlayer.wait === 0) {
                server.world.addCommand(cmd, mockPlayer);
                jasmine.clock().tick(280);
            }
            jasmine.clock().tick(1900); // trigger combat loop
        }

        expect(endOfCombatSpy).toHaveBeenCalledWith(battleObj, mockPlayer, redDeer)

        expect(combatLoop).toHaveBeenCalled();
        expect(createCorpseSpy).toHaveBeenCalledWith(redDeer);

        expect(mockPlayerRoom.monsters.length).toBe(1);

        cmd = server.world.commands.createCommandObject({
            msg: 'cast spark deer'
        });

        server.world.addCommand(cmd, mockPlayer);

        jasmine.clock().tick(280);

        battleObj = server.world.combat.getBattleByRefId(mockPlayer.refId);

        expect(battleObj).toBeTruthy();

        cmd = server.world.commands.createCommandObject({
            msg: 'cast spark'
        });

        while (deer.chp > 0) {
            if (mockPlayer.wait === 0) {
                server.world.addCommand(cmd, mockPlayer);
                jasmine.clock().tick(280);
            }
            jasmine.clock().tick(1900); // trigger combat loop
        }

        expect(endOfCombatSpy).toHaveBeenCalledWith(battleObj, mockPlayer, deer)

        expect(combatLoop).toHaveBeenCalled();
        expect(createCorpseSpy).toHaveBeenCalledWith(deer);
        expect(mockPlayerRoom.monsters.length).toBe(0);
    });


    it('should simulate player initiating combat with a deer and the deer fleeing.', () => {
        let deer = MOCK_SERVER.getNewEntity();
        deer.level = 1;
        deer.isPlayer = false;
        deer.name = 'deer';
        deer.displayName = 'Brown Deer';
        deer.refId = 'deer-refid';
        deer.area = mockPlayer.area;
        deer.originatingArea = mockPlayer.area;
        deer.roomid = mockPlayer.roomid;
        deer.cmv = 100;
        deer.mv = 100;
        deer.hp = 100;
        deer.chp = 100;

        mockPlayer.hitroll = 20; // beats the default entity AC of 10 so we always hit
        
        mockPlayerRoom.monsters = [];
        mockPlayerRoom.monsters.push(deer);

        setInterval(function() {
            server.world.ticks.cmdLoop();
        }, 280);

        setInterval(function() {
            server.world.ticks.combatLoop();
        }, 1900);

        expect(cmdLoop).not.toHaveBeenCalled();
        expect(combatLoop).not.toHaveBeenCalled();

        jasmine.clock().tick(280);
       
        expect(cmdLoop).toHaveBeenCalledTimes(1);

        let cmd = server.world.commands.createCommandObject({
            msg: 'kill deer'
        });
        let killSpy = spyOn(server.world.commands, 'kill').and.callThrough();

        server.world.addCommand(cmd, mockPlayer);

        jasmine.clock().tick(280); // 560

        expect(server.world.cmds.length).toBe(0);
        expect(killSpy).toHaveBeenCalled();
        expect(server.world.battles.length).toBe(1);
        expect(cmdLoop).toHaveBeenCalledTimes(2);
        
        jasmine.clock().tick(280); // 840
        expect(cmdLoop).toHaveBeenCalledTimes(3);
        expect(combatLoop).not.toHaveBeenCalled();

        let roundSpy = spyOn(server.world.combat, 'round').and.callThrough();
        const attackSpy = spyOn(server.world.combat, 'attack').and.callThrough();

        jasmine.clock().tick(1060); // trigger combat loop

        let battleObj = server.world.combat.getBattleByRefId(mockPlayer.refId);

        expect(combatLoop).toHaveBeenCalledTimes(1);
        expect(roundSpy).toHaveBeenCalledTimes(1);
        expect(attackSpy).toHaveBeenCalledWith(mockPlayer, deer, battleObj, jasmine.any(Function));
        expect(attackSpy).toHaveBeenCalledWith(deer, mockPlayer, battleObj, jasmine.any(Function));
        expect(battleObj.attacked.length).toBe(2);
        expect(battleObj.round).toBe(1);
        
        attackSpy.calls.reset();

        cmd = server.world.commands.createCommandObject({
            msg: 'flee east'
        });
        let fleeSpy = spyOn(server.world.commands, 'flee').and.callThrough();

        server.world.addCommand(cmd, deer);

        jasmine.clock().tick(280);

        expect(fleeSpy).toHaveBeenCalled();
        expect(server.world.cmds.length).toBe(0);

        jasmine.clock().tick(1620); // trigger combat loop

        expect(combatLoop).toHaveBeenCalledTimes(2);
        expect(roundSpy).toHaveBeenCalledTimes(1);
        expect(attackSpy).not.toHaveBeenCalled();
        expect(battleObj.attacked.length).toBe(0);
        expect(battleObj.round).toBe(1);
        expect(deer.position).toBe('standing');
        expect(deer.fighting).toBe(false);
        expect(deer.area).toBe(mockPlayer.area);
        expect(deer.roomid).not.toBe(mockPlayer.roomid);
        expect(deer.cmv).toBeLessThan(100);
        expect(server.world.battles.length).toBe(0);
        expect(mockPlayer.position).toBe('standing');
        expect(mockPlayer.fighting).toBe(false);

        attackSpy.calls.reset();
        
        jasmine.clock().tick(1900); // trigger combat loop
        
        cmd = server.world.commands .createCommandObject({
            msg: 'move east'
        });

        server.world.addCommand(cmd, mockPlayer);

        jasmine.clock().tick(280);

        cmd = server.world.commands.createCommandObject({
            msg: 'kill deer'
        });

        server.world.addCommand(cmd, mockPlayer);

        jasmine.clock().tick(280);
        expect(server.world.cmds.length).toBe(0);

        battleObj = server.world.combat.getBattleByRefId(mockPlayer.refId);

        expect(battleObj.round).toBe(0); // round has not yet occured

        jasmine.clock().tick(1620); // trigger combat loop
        
        expect(server.world.cmds.length).toBe(0);
        expect(battleObj.round).toBe(1);
        expect(attackSpy).toHaveBeenCalledTimes(2);
        expect(server.world.battles.length).toBe(1);
        expect(mockPlayer.position).toBe('standing');
        expect(mockPlayer.fighting).toBe(true);
        expect(deer.position).toBe('standing');
        expect(deer.fighting).toBe(true);
    });
});
