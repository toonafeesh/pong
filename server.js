var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var player1Score = 0;
var player2Score = 0;
var collisionCounter = 0;
var readyTextCounter = -1;
var lastGoal = 0;
var chatMessages = [];

var players = {};

var directionArray = [];
for (i = -50; i < 51; i++){
    directionArray.push(i);
}

var ball = {
    x: 325,
    y: 200,
    width: 25,
    height: 25,
    speed: 0,
    gravity: 0,
    active: false,
    velocity: 1
};

var activePlayers = [
    {},
    {
        playerId: "",
        pongTag: "",
        player: 1,
        x: 20,
        y: 200,
        width: 15,
        height: 80,
        speed: 3
    },
    {
        playerId: "",
        pongTag: "",
        player: 2,
        x: 630,
        y: 200,
        width: 15,
        height: 80,
        speed: 3
    }
]

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

io.on('connection', function (socket) {
    socket.on('userConnect', function(pongTag){
        console.log(pongTag + ' connected');
        socket.pongTag = pongTag;
        players[socket.id] = {
            playerId: socket.id,
            pongTag: pongTag
        };

        socket.on('chatMessage', (msg) => {
            chatMessages.push({ playerId: socket.id, pongTag: pongTag, message: msg });
            io.emit('chatMessage', { playerId: socket.id, pongTag: pongTag, message: msg });
        });

        io.emit('currentPlayers', players);

        socket.emit('gameStatus', {player1: activePlayers[1], player2: activePlayers[2], ball: ball});
        socket.emit('chatMessages', chatMessages);

        if(activePlayers[1].pongTag == "")
            io.emit('playerStatus', {player: 1, pongTag: "", status: 'open'});
        else 
            io.emit('playerStatus', {player: 1, pongTag: activePlayers[1].pongTag, status: 'closed'});

        if(activePlayers[2].pongTag == "")
            io.emit('playerStatus', {player: 2, pongTag: "", status: 'open'});
        else 
            io.emit('playerStatus', {player: 2, pongTag: activePlayers[2].pongTag, status: 'closed'});
    });

    socket.on('movePaddle', function(data){
        if(socket.id = activePlayers[data.player].playerId) {
            if(data.direction == "up"){
                if(activePlayers[data.player].y > 74){
                    activePlayers[data.player].y -= activePlayers[data.player].speed;
                }
            } else if (data.direction == "down") {
                if(activePlayers[data.player].y < 356){
                    activePlayers[data.player].y += activePlayers[data.player].speed;
                }
            }
            
            io.emit('playerData', activePlayers[data.player]);
        }    
    });

    function checkReady(){
        if(activePlayers[1].pongTag != "" && activePlayers[2].pongTag != ""){
            readyTextCounter = 200;
            ballDrop();
        }
    }

    function ballDrop(){
        //ADD READY COUNTER
        ball.x = 325;
        ball.y = 200;
        //ball.speed = 1;
        //ball.gravity = 1;
        io.emit("ballPosition", ball);
    }

    function resetBall(){
        ball.x = 325;
        ball.y = 200;
        ball.speed = 0;
        ball.gravity = 0;
        ball.active = false;
        readyTextCounter = -1;
    }

    function activateBall(){
        io.emit("hideReadyText");
        ball.gravity = randomGravity();
        if(lastGoal == 0) {
            ball.speed = Math.random() < 0.5 ? Math.cos(ball.gravity) : -Math.cos(ball.gravity);
        } else if (lastGoal == 1){
            player1Score += 1;
            ball.x = 500;
            ball.speed = -Math.cos(ball.gravity);
        } else if (lastGoal == 2){
            player2Score += 1;
            ball.speed = Math.cos(ball.gravity);
            ball.x = 100;
        }

        ball.active = true;
    }

    function randomGravity(){
        var grav = Math.random() * 0.5;
        return grav;
    }

    function resetPlayer(player){
        activePlayers[player].playerId = "";
        activePlayers[player].pongTag = "";
        activePlayers[player].y = 200;
        io.emit('playerData', activePlayers[player]);

        io.emit('playerStatus', {player: player, pongTag: "", status: 'open'});
    }

    function resetScores(){
        player1Score = 0;
        player2Score = 0;
        lastGoal = 0;
        io.emit("scores", {player1: player1Score, player2: player2Score});
    }

    socket.on('playerJoin', function(player){
        activePlayers[player].playerId = socket.id;
        activePlayers[player].pongTag = socket.pongTag;
        activePlayers[player].y = 200;
        io.emit('playerData', activePlayers[player]);

        io.emit('playerStatus', {player: player, pongTag: socket.pongTag, status: 'closed'});

        checkReady();
    });

    socket.on('playerQuit', function(player){
        playerLeft(player);
    });
    
    socket.on('playerScores', function(player){
        if(player == 1)
            player1Score++;
        else if(player == 2)
            player2Score++;

        //ADD WIN CONDITION
        
        io.emit("scores", {player1: player1Score, player2: player2Score});

        ballDrop();
    });

    socket.on('disconnect', function () {
        console.log(socket.pongTag + ' disconnected');

        if(socket.id == activePlayers[1].playerId) {
            playerLeft(1);
        }

        if(socket.id == activePlayers[2].playerId) {
            playerLeft(2);
        }

        delete players[socket.id];
        io.emit('userDisconnect', socket.id);
    });

    socket.on("ballCheck", ballBounce);

    function playerLeft(player){
        resetPlayer(player);
        resetBall();
        resetScores();

        io.emit("gameStatus", {player1: activePlayers[1], player2: activePlayers[2], ball: ball});

        checkReady();
    }

    function ballBounce(){
        if(readyTextCounter < 0)
            return;

        if(readyTextCounter > 0){
            io.emit("showReadyText");
            readyTextCounter--;
            return;
        }

        if(ball.active == false)
            activateBall();

        if(((ball.y + ball.gravity) <= 48) || ((ball.y + ball.gravity + ball.height) >= 410))
            ball.gravity = -ball.gravity;

        ball.x += ball.speed;
        ball.y += ball.gravity;
        ballCollision();
    }

    function calculateTrajectory() {
        var player = ball.speed < 0 ? 1 : 2;
        var paddleTop = ((activePlayers[player].y - (activePlayers[player].height / 2)) - (ball.width / 2));
        var paddleBottom = ((activePlayers[player].y + (activePlayers[player].height / 2)) + (ball.width / 2));
        var collisionLocation = Math.floor(((ball.y - paddleTop) * 100) / (paddleBottom - paddleTop));

        ball.velocity += 0.1;
        ball.gravity = ((directionArray[collisionLocation]) * .019);
        ball.speed = player == 1 ? Math.cos(ball.gravity) : -Math.cos(ball.gravity);

        ball.gravity = ball.gravity * ball.velocity;
        ball.speed = ball.speed * ball.velocity;

        ball.x += ball.speed;
        ball.y += ball.gravity;
    }

    function ballCollision(){
        if(collisionCounter > 0){
            collisionCounter--;
            ball.x += ball.speed;
            ball.y += ball.gravity;
        } else if(
            (((ball.x - (ball.width / 2)) <= (activePlayers[1].x + (activePlayers[1].width / 2))) 
                && ((ball.y + (ball.width / 2)) >= (activePlayers[1].y - (activePlayers[1].height / 2))) 
                && ((ball.y - (ball.width / 2)) <= (activePlayers[1].y + (activePlayers[1].height / 2)))
                && (ball.x > (activePlayers[1].x - (activePlayers[1].width / 2))))
        || (((ball.x + (ball.width / 2)) >= (activePlayers[2].x - (activePlayers[2].width / 2))) 
                && ((ball.y + (ball.width / 2)) >= (activePlayers[2].y - (activePlayers[2].height / 2))) 
                && ((ball.y - (ball.width / 2)) <= (activePlayers[2].y + (activePlayers[2].height / 2))))
                && (ball.x < (activePlayers[2].x + (activePlayers[2].width / 2)))) {
            collisionCounter = 30;
            calculateTrajectory();
        } else if (ball.x < 0 - ball.width) {
            readyTextCounter = 100;
            ball.active = false;
            lastGoal = 2;
            ball.velocity = 1;
        } else if (ball.x > 650 + ball.width) {
            readyTextCounter = 100;
            ball.active = false;
            lastGoal = 1;
            ball.velocity = 1;
        } else {
            ball.x += ball.speed;
            ball.y += ball.gravity;
        }

        io.emit("scores", {player1: player1Score, player2: player2Score});
        io.emit("ballPosition", ball);
    }
});

server.listen(8081, '0.0.0.0', function () {
    console.log(`Listening on ${server.address().port}`);
});