/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* global TimelineDataSeries, TimelineGraphView */

'use strict';

var remoteVideo = document.querySelector('video#remoteVideo');
var callButton = document.querySelector('button#callButton');
var hangupButton = document.querySelector('button#hangupButton');
var dataButton = document.querySelector('button#dataToggle');
var audioButton = document.querySelector('button#audioToggle');
var videoButton = document.querySelector('button#videoToggle');
var stateDiv = document.querySelector('div#state');
hangupButton.disabled = true;
callButton.onclick = call;
hangupButton.onclick = hangup;
//dataButton.onclick = toggleData;
audioButton.onclick = toggleAudio;
videoButton.onclick = toggleVideo;

var switchRelayButton = document.querySelector('button#switchRelayButton');
switchRelayButton.onclick = switchRelay;

//var switchCameraButton = document.querySelector('button#switchCameraButton');
//switchCameraButton.onclick = switchCamera;

var refreshTokenButton = document.querySelector('button#refreshTokenButton');
refreshTokenButton.onclick = refreshToken;

var videoConstraints = {width: 640, height: 480, facingMode: "user"};
var canvas = fx.canvas();
document.getElementById("localVideoWithEffects").appendChild(canvas);

//canvas.width = 640;
//canvas.height = 480;

remoteVideo.style.visibility = "hidden";

var pc;
var localStream;
var isCalling = false;

var roomName = window.location.search ? window.location.search.substring(1) : "defaultRoomWithRelay";
var socket = io('/');

chatRoom.innerHTML = "chat room: " + roomName;

var canvasVideo = document.createElement("video");
var twilioToken;

socket.on('connect', function () {
    console.log('connected');
    socket.on('message', function (msg) {
        console.log(msg);
        var message = JSON.parse(msg);

        if (message.type === "twilio") {
            twilioToken = message.data;
            setupPeerConnection();
            return;
        }
        if (message.room !== roomName)
            return;
        if ((message.type === "callingCandidate" && !isCalling) || (message.type === "calledCandidate" && isCalling)) {
          trace('Remote ICE candidate: \n' + JSON.stringify(message.data));
          if (message.data) {
            var candidate = new RTCIceCandidate(message.data);
            pc.addIceCandidate(candidate).then(onAddIceCandidateSuccess, onAddIceCandidateError);
          }
        } else if (message.type === "offer") {
          answer(message.data);
        }
        else if (message.type === "answer")
            pc.setRemoteDescription(message.data).then(function() { }, onSetSessionDescriptionError);
     });
});

function sendMessage(message)
{
    message.room = roomName;
     socket.send(JSON.stringify(message));
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function capture()
{
  trace('Requesting local stream');
  navigator.mediaDevices.getUserMedia({ audio: true, video: videoConstraints }).then(gotStream).catch(function(e) {
    alert('getUserMedia() error: ' + e);
  });
}

function gotStream(stream) {
  callButton.disabled = false;
  trace('Received local stream');
  localStream = stream;

  trace(localStream.getTracks());
  localVideo.srcObject = localStream;

  printSetup();
  updateState();
}

function updateState()
{
    if (stateDiv.innerHTML)
        stateDiv.innerHTML += ", ";
    if (!!pc) {
      stateDiv.innerHTML += pc.iceConnectionState;
      if (pc.connectionState)
          stateDiv.innerHTML +=  "/" + pc.connectionState;
   }
}

var useOnlyRelay = false;
var reachedConnected = false;
function setupPeerConnection()
{
  if (!!pc)
      return;

  trace('Created peer connection object pc');
  var iceServers = twilioToken.ice_servers;
  for (var server of iceServers)
      server.urls = [server.url];
  pc = new RTCPeerConnection({iceTransportPolicy: (useOnlyRelay ? 'relay' : 'all'), iceServers: iceServers});
  pc.onicecandidate = iceCallback;
  pc.onaddstream = gotRemoteStream;

  pc.oniceconnectionstatechange = () => {
    updateState();
    if (pc.iceConnectionState == "closed") {
        remoteVideo.removeAttribute("class");
        window.location.reload();
        return;
    }
    if (pc.iceConnectionState == "connected")
        reachedConnected = true;
    else if (pc.iceConnectionState == "failed")
        reachedConnected = false;
    else if (pc.iceConnectionState == "disconnected") {
        reachedConnected = false;
        setTimeout(() => window.location.reload(), 2000);
    }
    var isConnected = pc.iceConnectionState == "connected" || (pc.iceConnectionState == "completed" && reachedConnected);
    remoteVideo.setAttribute("class", isConnected ? "connected" : "connecting");
  }

  pc.onconnectionstatechange = () => {
    updateState();
  }
}

var useData = false;
function toggleData()
{
    useData = !useData;
    dataButton.innerHTML = useData ? "Data" : "No data";
}

var useAudio = true;
function toggleAudio()
{
    useAudio = !useAudio;
    audioButton.innerHTML = useAudio ? "Audio" : "No audio";
}

var useVideo = true;
function toggleVideo()
{
    useVideo = !useVideo;
    videoButton.innerHTML = useVideo ? "Video" : "No video";
}

function printSetup()
{
    setupLog.innerHTML = (useOnlyRelay ? "only relay" : "relay + others");
    setupLog.innerHTML += " / camera: " + videoConstraints.facingMode;

    if (localStream) {
        if (localStream.getAudioTracks()[0])
            setupLog.innerHTML +=  " / local audio";
        if (localStream.getVideoTracks()[0])
            setupLog.innerHTML +=  " / local video";
    }

    if (remoteStream) {
        if (remoteStream.getAudioTracks()[0])
            setupLog.innerHTML +=  " / remote audio";
        if (remoteStream.getVideoTracks()[0])
            setupLog.innerHTML +=  " / remote video";
    }
}

function switchRelay()
{
    useOnlyRelay = !useOnlyRelay;
    printSetup();
}

function switchCamera()
{
    trace("switchCamera")
    videoConstraints.facingMode = videoConstraints.facingMode === "user" ? "environment" : "user";
    capture();
    printSetup();
}

function addMediaData()
{
  pc.addStream(localStream);
}

function localVideoClick()
{
  localVideo.className = "bigLocalVideo";
  remoteVideo.className = "smallLocalVideo";
}

function remoteVideoClick()
{
  localVideo.className = "smallLocalVideo";
  remoteVideo.className = "bigRemoteVideo";
}

function call() {
  printSetup();

  localVideo.className = "smallLocalVideo";
  remoteVideo.className = "bigRemoteVideo";

  isCalling = true;
  hangupButton.disabled = false;
  callButton.disabled = true;
  trace('Starting call');

  remoteVideo.style.visibility = "visible";
  remoteVideo.setAttribute("class", "connecting");
  var videoTracks = localStream.getVideoTracks();
  if (videoTracks.length > 0) {
    trace('Using Video device: ' + videoTracks[0].label);
  }
  trace('Adding Local Stream to peer connection');
  addMediaData();
  pc.createOffer().then((desc) => {
    pc.setLocalDescription(desc).then(() => {
      //desc.sdp = maybePreferCodec(desc.sdp, 'video', 'send', 'H264/90000');
      sendMessage({"type": "offer", data: desc});
    }, onSetSessionDescriptionError);
  },onCreateSessionDescriptionError);
}

function answer(offer)
{
  hangupButton.disabled = false;
  callButton.disabled = true;

  localVideo.className = "smallLocalVideo";
  remoteVideo.className = "bigRemoteVideo";
  remoteVideo.style.visibility = "visible";
  remoteVideo.setAttribute("class", "connecting");
  pc.setRemoteDescription(offer).then(() => {
    addMediaData();
    return pc.createAnswer();
  }, onSetSessionDescriptionError).then(desc => {
    pc.setLocalDescription(desc);
    sendMessage({"type": "answer", data: desc});
  }, onCreateSessionDescriptionError);
}

function hangup() {
  trace('Ending call');
  localStream.getTracks().forEach(function(track) {
    track.stop();
  });
  pc.close();
  pc = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  setTimeout(() => window.location.reload(), 2000);
}

var remoteStream;
function gotRemoteStream(e) {
  remoteStream = e.stream;
  printSetup();
  remoteVideo.srcObject = remoteStream;
  trace('Received remote stream');
}

function iceCallback(event) {
  trace('Local ICE candidate: \n' + JSON.stringify(event.candidate));
  sendMessage({ "type": (isCalling ? "callingCandidate" : "calledCandidate"), data: event.candidate });
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add ICE Candidate: ' + error.toString());
}

function onSetSessionDescriptionError(error) {
  trace('Failed to set session description: ' + error.toString());
}

function refreshToken()
{
    console.log("Asking for new token");
    fetch("/server/refreshToken").then((response) => {
        return response.json();
    }).then((data) => {
        twilioToken = data;
        console.log("Getting token " + JSON.stringify(twilioToken));
    });
}

capture();




// Copied from AppRTC's sdputils.js:

// Sets |codec| as the default |type| codec if it's present.
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
function maybePreferCodec(sdp, type, dir, codec) {
  var str = type + ' ' + dir + ' codec';
  if (codec === '') {
    trace('No preference on ' + str + '.');
    return sdp;
  }

  trace('Prefer ' + str + ': ' + codec);

  var sdpLines = sdp.split('\r\n');

  // Search for m line.
  var mLineIndex = findLine(sdpLines, 'm=', type);
  if (mLineIndex === null) {
    return sdp;
  }

  // If the codec is available, set it as the default in m line.
  var codecIndex = findLine(sdpLines, 'a=rtpmap', codec);
  console.log('codecIndex', codecIndex);
  if (codecIndex) {
    var payload = getCodecPayloadType(sdpLines[codecIndex]);
    if (payload) {
      sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
    }
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Find the line in sdpLines that starts with |prefix|, and, if specified,
// contains |substr| (case-insensitive search).
function findLine(sdpLines, prefix, substr) {
  return findLineInRange(sdpLines, 0, -1, prefix, substr);
}

// Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
// and, if specified, contains |substr| (case-insensitive search).
function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
  var realEndLine = endLine !== -1 ? endLine : sdpLines.length;
  for (var i = startLine; i < realEndLine; ++i) {
    if (sdpLines[i].indexOf(prefix) === 0) {
      if (!substr ||
          sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
        return i;
      }
    }
  }
  return null;
}

// Gets the codec payload type from an a=rtpmap:X line.
function getCodecPayloadType(sdpLine) {
  var pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
  var result = sdpLine.match(pattern);
  return (result && result.length === 2) ? result[1] : null;
}

// Returns a new m= line with the specified codec as the first one.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');

  // Just copy the first three parameters; codec order starts on fourth.
  var newLine = elements.slice(0, 3);

  // Put target payload first and copy in the rest.
  newLine.push(payload);
  for (var i = 3; i < elements.length; i++) {
    if (elements[i] !== payload) {
      newLine.push(elements[i]);
    }
  }
  return newLine.join(' ');
}
