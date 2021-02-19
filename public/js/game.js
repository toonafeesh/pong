var socket = io();
var pongTag = "";
var midLine;
var player1Score = 0;
var player2Score = 0;
var player1Name = "Player 1";
var player2Name = "Player 2";

var config = {
    type: Phaser.AUTO,
    parent: 'pong',
    width: 650,
    height: 400,
    fps: 30,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
        movePaddle: movePaddle,
        ballCheck: ballCheck,
        scoreUpdate: scoreUpdate
    } 
};
   
var game = new Phaser.Game(config);

function movePaddle() {
    if (this.cursors.up.isDown) {
        if(player1Name == pongTag){
            socket.emit('movePaddle', {player: 1, direction: 'up'});
        }

        if(player2Name == pongTag){
            socket.emit('movePaddle', {player: 2, direction: 'up'});
        }
    } else if(this.cursors.down.isDown) {
        if(player1Name == pongTag){
            socket.emit('movePaddle', {player: 1, direction: 'down'});
        }

        if(player2Name == pongTag){
            socket.emit('movePaddle', {player: 2, direction: 'down'});
        }
    }
}

function ballCheck() {
    if(player1Name == pongTag){
        socket.emit("ballCheck");
    }
}

function scoreUpdate(scores){
    player1Score = scores.player1;
    player2Score = scores.player2;

    p1ScoreText.setText(player1Name + ': ' + player1Score);
    p2ScoreText.setText(player2Name + ': ' + player2Score);
}

function preload() {
    pongTag = checkPongTag();
    this.load.image('ball', '/assets/ball.png');
    this.load.image('player1Play', '/assets/play.png');
    this.load.image('player2Play', '/assets/play.png');
    this.load.image('player1Quit', '/assets/quit.png');
    this.load.image('player2Quit', '/assets/quit.png');
    this.load.image('wall', '/assets/wall.png');
    this.load.image('player1Paddle', '/assets/player1Paddle.png');
    this.load.image('player2Paddle', '/assets/player2Paddle.png');
}
   
function create() {
    cursors = this.input.keyboard.createCursorKeys();

    socket.on('currentPlayers', function (players) {
        $('.userList').find('ul').empty();
        Object.keys(players).forEach(function (id) {
            console.log(players);
            $('.userList').find('ul').append('<li id="pongTag' + players[id].playerId + '">' + players[id].pongTag + '</li>');
        });
    });

    socket.on("scores", function(scores){
        scoreUpdate(scores);
    });

    socket.on('chatMessage', function(chatMessage){
        if(chatMessage.playerId == socket.id){
            var item = '<li class="chatMessage"><span class="chatPongTagSelf">' + chatMessage.pongTag + ': </span><span>' + chatMessage.message + '</span></li>';
        }
        else
        {
            var item = '<li class="chatMessage"><span class="chatPongTagOther">' + chatMessage.pongTag + ': </span><span>' + chatMessage.message + '</span></li>';
        }
        
        $('#messages').append(item);
        window.scrollTo(0, document.body.scrollHeight);
    });

    socket.on('playerStatus', function(data){
        if(data.player == 1 && data.status == "open"){
            player1Play.visible = true;
            player1Name = "Player 1";
            p1ScoreText.setText('Player 1: ' + player1Score);
        } else if(data.player == 2 && data.status == "open"){
            player2Play.visible = true;
            player2Name = "Player 2";
            p2ScoreText.setText('Player 2: ' + player2Score);
        } else if(data.player == 1 && data.status == "closed"){
            player1Play.visible = false;
            player1Name = data.pongTag;
            p1ScoreText.setText(player1Name + ': ' + player1Score);
        } else if(data.player == 2 && data.status == "closed"){
            player2Play.visible = false;
            player2Name = data.pongTag;
            p2ScoreText.setText(player2Name + ': ' + player2Score);
        }
    });

    socket.on('playerData', function(data){
        if(data.playerid != socket.id && data.player == 1)
            player1Paddle.y = data.y;
        else if (data.playerid != socket.id && data.player == 2)
            player2Paddle.y = data.y;
    });

    var form = document.getElementById('form');
    var chatInput = document.getElementById('chatInput');

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        if (chatInput.value) {
            socket.emit('chatMessage', chatInput.value);
            chatInput.value = '';
        }
    });

    p1ScoreText = this.add.text(16, 5, '', { fontSize: '18px', fill: '#FFFFFF', strokeThickness: 0.6 });
    p2ScoreText = this.add.text(630, 5, '', { rtl: true, fontSize: '18px', fill: '#FFFFFF', strokeThickness: 0.6 });
    scoreUpdate({player1: 0, player2: 0});

    midLine = this.add.graphics({ lineStyle: { width: 4, color: 0xaaaaaa } });
    midLine.beginPath();
    midLine.moveTo(325, 30);
    midLine.lineTo(325, 400);
    midLine.closePath();
    midLine.strokePath();

    bottomWall = this.physics.add.image(325, 398, 'wall', 0);
    bottomWall.displayWidth = 650;
    bottomWall.displayHeight = 5;

    topWall = this.physics.add.image(325, 32, 'wall', 0);
    topWall.displayWidth = 650;
    topWall.displayHeight = 5;

    ball = this.add.image(325, 200, 'ball');
    ball.visible = false;

    player1Paddle = this.physics.add.image(20, 200, 'player1Paddle', 0);
    player1Paddle.visible = false;
    
    player2Paddle = this.physics.add.image(630, 200, 'player2Paddle', 0);
    player2Paddle.visible = false;
    
    player1Play = this.add.image(230, 15, 'player1Play').setInteractive();
    player1Play.setScale(.3);
    player1Play.visible = false;
    player1Play.on('pointerdown', function (pointer) {
        if(pongTag != player2Name){
            socket.emit('playerJoin', 1);
            player1Quit.visible = true;
        }
    });

    player2Play = this.add.image(410, 15, 'player2Play').setInteractive();
    player2Play.setScale(.3);
    player2Play.visible = false;
    player2Play.on('pointerdown', function (pointer) {
        if(pongTag != player1Name){
            socket.emit('playerJoin', 2);
            player2Quit.visible = true;
        }
    });

    player1Quit = this.add.image(230, 15, 'player1Quit').setInteractive();
    player1Quit.setScale(.3);
    player1Quit.visible = false;
    player1Quit.on('pointerdown', function (pointer) {
        if(pongTag == player1Name){
            player1Quit.visible = false;
            socket.emit('playerQuit', 1);
        }
    });

    player2Quit = this.add.image(410, 15, 'player2Quit').setInteractive();
    player2Quit.setScale(.3);
    player2Quit.visible = false;
    player2Quit.on('pointerdown', function (pointer) {
        if(pongTag == player2Name){
            player2Quit.visible = false;
            socket.emit('playerQuit', 2);
        }
    });

    readyText = this.add.text(230, 170, '', { fontWeight: 'bold', fontSize: '64px', fill: '#00FF00', strokeThickness: 2 });
    readyText.setText("READY");
    readyText.visible = false;

    socket.on("ballPosition", function(ballData){
        ball.x = ballData.x;
        ball.y = ballData.y;
    })

    socket.on("gameStatus", function(gameStatus){
        player1Paddle.x = gameStatus.player1.x;
        player1Paddle.y = gameStatus.player1.y;
        player1Paddle.displayHeight = gameStatus.player1.height;
        player1Paddle.displayWidth = gameStatus.player1.width;
        player1Paddle.visible = true;

        player2Paddle.x = gameStatus.player2.x;
        player2Paddle.y = gameStatus.player2.y;
        player2Paddle.displayHeight = gameStatus.player2.height;
        player2Paddle.displayWidth = gameStatus.player2.width;
        player2Paddle.visible = true;

        ball.x = gameStatus.ball.x;
        ball.y = gameStatus.ball.y;
        ball.displayHeight = gameStatus.ball.height;
        ball.displayWidth = gameStatus.ball.width;
        ball.visible = true;
    });

    socket.on("showReadyText", function(){
        readyText.visible = true;
    });

    socket.on("hideReadyText", function(){
        readyText.visible = false;
    });

    socket.emit("userConnect", pongTag);
}
   
function update() {
    movePaddle();
    ballCheck();
}

function checkPongTag() {
    var pongTag = localStorage.getItem('pongTag');
    if(pongTag == null || pongTag == "null" || pongTag == '')
        window.location.href = '/login';
    else
        return pongTag;
}