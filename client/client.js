
var conn = new WebSocket("ws://" + localStorage["signaling_server_ip"]);
var name = "";
var client_conn, conn_user;
console.log(conn);

function hasUserMedia() {
   navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
   return !!navigator.getUserMedia;
}
function hasWebRTC() {
   window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
   return !!window.RTCPeerConnection;
}

if (hasUserMedia() && hasWebRTC()) {
   navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
   var audio = navigator.getUserMedia({ video: true, audio: true }, function (stream) {
      var au = document.querySelector('video');

      au.srcObject = stream;
   }, function (err) {
     console.log("Audio Error");
   });

   console.log(audio);
}
else {
   alert("Error. WebRTC is not supported.");
}

conn.onmessage = function (message) {
  console.log("Recieve", message.data);
  var data = JSON.parse(message.data);
  switch(data.type) {
    case "login":
       onLogin(data.success);
       break;
    case "req_ret":
      onRequest(data.success, data.arr);
      break;
    case "offer":
      onOffer(data.offer, data.from);
      break;
    case "answer":
      onAnswer(data.answer);
      break;
    case "candidate":
      onCandidate(data.candidate);
      break;
    default:
      break;
  }
};

function onLogin(success){
  if (success === false){
    alert("Error on login, please try another name.");
  }
  else{
    var configuration = { "iceServers": [{ "urls": "stun:stun.1.google.com:19302" }] };

    client_conn = new RTCPeerConnection(configuration);
    console.log("RTCPeerConnection Established");
    console.log(client_conn);

    client_conn.onicecandidate = function (event) {
      if(event.candidate) {
        send({
          type: "candidate",
          candidate: event.candidate
        })
      }
    }
  }
}

function onRequest(success, arr){
  if(success === false){
    alert("Critical Error");
  }
  else{
    var other_users = []
    for (i in arr){
      if(!(name == arr[i])){
        other_users.push(arr[i]);
      }
    }
    for(j in other_users){
      var oname = other_users[j];
      client_conn.createOffer(function (o) {
        send({
          type: "offer",
          name: oname,
          offer: o,
          me: name
        });
        client_conn.setLocalDescription(o);
      }, function (e){
        alert("Critical Error");
      });
    }
  }
}

function onOffer(o, n){
  client_conn.setRemoteDescription(new RTCSessionDescription(o));
  conn_user = n;
  client_conn.createAnswer(function (a) {
    client_conn.setLocalDescription(a);
    send({
      type: "answer",
      name: n,
      answer: a
    });
  }, function (e){
    alert("Critical Error");
  });
}

function onAnswer(a){
  client_conn.setRemoteDescription(new RTCSessionDescription(a));
}

function onCandidate(c){
  client_conn.addIceCandidate(new RTCIceCandidate(c));
}

function join_voice() {
  send({
    type: 'req'
  })
}

function login() {
  name = document.getElementById("nameInput").value;
  if(name.length > 0){
    send({
      type: "login",
      name: name
    })
  }
}

function send(message) {
  console.log("Sending");
  console.log(message);
  conn.send(JSON.stringify(message));
}
