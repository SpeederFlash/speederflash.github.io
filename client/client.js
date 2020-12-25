
var conn = new WebSocket("ws://" + localStorage["signaling_server_ip"]);
var name = "";
var other_users = 0;
var cStream;
var username;
var auth_token;
var client_conn = {};
var conn_user;
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
   var audio = navigator.getUserMedia({ video: false, audio: true }, function (stream) {
      cStream = document.getElementById('my_audio');

      cStream.srcObject = stream;
      cStream.volume = 0;
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
      onLogin(data.success,data.username,data.authkey);
      break;
    case "user_add":
      onUserAdd(data.name);
      break;
    case "existing":
      onExisting(data.arr);
      break;
    case "offer":
      onOffer(data.offer, data.from);
      break;
    case "answer":
      onAnswer(data.answer, data.sender);
      break;
    case "candidate":
      onCandidate(data.candidate, data.sender);
      break;
    default:
      break;
  }
};

function onLogin(success, u, atoken){
  if(success === false){
    alert("Try another Username");
  }
  else{
    username = u;
    auth_token = atoken;
    join_voice();
  }
}

function onUserAdd(oname){
  var configuration = { iceServers: [{urls: ["stun:webrtc.breakingpacket.com:3458"]},{ urls: ["turn:webrtc.breakingpacket.com:3478"], username: "amongus", credentials: "p@ssword1" }], sdpSemantics: 'unified-plan' };
  client_conn[oname] = new RTCPeerConnection(configuration);
  client_conn[oname].addStream(cStream.srcObject);

  console.log("RTC Conn created (user add)");
  console.log(client_conn[oname]);

  client_conn[oname].onaddstream = function (e) {
    var au_src = document.getElementById("audio_srcs");
    var au_src_child = document.createElement('audio');
    au_src_child.id = oname;
    au_src_child.autoplay = true;
    au_src_child.srcObject = e.stream;
    au_src.appendChild(au_src_child);
  }
  client_conn[oname].onicecandidate = function (event) {
    if(event.candidate) {
      send({
        type: "candidate",
        candidate: event.candidate,
        name: oname,
        sender: name
      })
    }
  }
}

function onExisting(arr){
  if(arr.length != 0){
    for(i in arr){
      var oname = arr[i];
      var configuration = { iceServers: [{urls: ["stun:webrtc.breakingpacket.com:3478"]},{  urls: ["turn:webrtc.breakingpacket.com:3478"], username: "amongus", credentials: "p@ssword1"  }], sdpSemantics: 'unified-plan' };
      client_conn[oname] = new RTCPeerConnection(configuration);
      client_conn[oname].addStream(cStream.srcObject);

      console.log("RTC Conn created (existing)");
      console.log(client_conn[oname]);

      client_conn[oname].createOffer(function (o) {
        console.log("Sending offer to ", oname);
        send({
          type: "offer",
          name: oname,
          offer: o,
          me: name,
          ret: false
        });
        client_conn[oname].setLocalDescription(o);
      }, function (e){
        alert("Critical Error");
      });

      client_conn[oname].onaddstream = function (e) {
        var au_src = document.getElementById("audio_srcs");
        var au_src_child = document.createElement('audio');
        au_src_child.id = oname;
        au_src_child.autoplay = true;
        au_src_child.srcObject = e.stream;
        au_src.appendChild(au_src_child);
      }
      client_conn[oname].onicecandidate = function (event) {
        if(event.candidate) {
          send({
            type: "candidate",
            candidate: event.candidate,
            name: oname,
            sender: name
          })
        }
      }
    }
  }
  else{
    console.log("Alone");
  }
}

function onOffer(o, oname){
  client_conn[oname].setRemoteDescription(new RTCSessionDescription(o));
  client_conn[oname].createAnswer(function (a) {
    client_conn[oname].setLocalDescription(a);
    send({
      type: "answer",
      name: oname,
      answer: a,
      sender: name
    });
  }, function (e){
    alert("Critical Error");
  });
}

function onAnswer(a, sender){
  client_conn[sender].setRemoteDescription(new RTCSessionDescription(a));
}

function onCandidate(c, sender){
  console.log(sender);
  client_conn[sender].addIceCandidate(new RTCIceCandidate(c));
}

function join_voice() {
  send({
    type: 'join',
    name: name
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
