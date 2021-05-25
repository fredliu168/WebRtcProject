'use strict';
//本js作为webrtc的一部分。负责采集视频流，登录后把视频发送给对方
//设计思路是本地采集和webrtc RTCPeerConnection分开处理。本地采集视频，就不初始化RTCPeerConnection

//var conn = new WebSocket('ws://118.25.176.33:9091');
//var conn = new WebSocket('ws://localhost:9091');
//var servernameInput = document.querySelector('#servernameInput');
//var servername = servernameInput.value;
//servername = servername.replace(/(^\s*)|(\s*$)/g, ""); 	//替换输入内容当中所有的空字符，包括全角空格，半角都替换""
//var serverurl = 'wss://' + servername + ":9091";

$(function () {
    console.log("ready!");


    let servername = location.hostname;
    //let servername = "pi.qzcool.co";
    let serverurl = 'wss://' + servername + "/ws";

    // alert(serverurl)

    let conn = new WebSocket(serverurl);
    //alert(conn)
    //本地登录用户our username
    var myUsername = null;
    var myRoomname = null;
    //远程连接用户usermyUsername that connected to usOffer
    var connectedUsername = null;
    //RTCPeerConnection
    var myPeerConnection;
    // MediaStream from webcam
    var stream;
    //当前客户端的RTCPeerConnection是否创建了
    var RTCPeerConnectionCreated = false;
    let constraint;

    //******
    //UI selectors block
    //******
    var loginPage = document.querySelector('#loginPage');
    var loginBtn = document.querySelector('#loginBtn');
    //var servernameInput = document.querySelector('#servernameInput');  //放到上面去了
    var usernameInput = document.querySelector('#usernameInput');
    var roomnameInput = document.querySelector('#roomnameInput');
    var callPage = document.querySelector('#callPage');
    var startBtn = document.querySelector('#startBtn');
    var closeBtn = document.querySelector('#closeBtn');
    var hangUpBtn = document.querySelector('#hangUpBtn');
    var localVideo = document.querySelector('#localVideo');
    var remoteVideo = document.querySelector('#remoteVideo');
    var recorder_div = document.querySelector('#recorder');

    var videoSelect = document.querySelector('select#video');
    var audioSelect = document.querySelector('select#audio');

    //loginPage.style.display = "block";
    callPage.style.display = "none";
    remoteVideo.style.display = "none";
    localVideo.style.display = "none";

    //usernameInput.value = randomString(6);

    let mediaRecorder;
    let recordedBlobs; //录像数据

    var stopRecord = false;
    let device_video = []; //输入视频的设备
    let device_audio = []; //声音输入
    var select_video = 0; //选择的输入


    if (localStorage.myUsername != undefined)
        usernameInput.value = localStorage.myUsername;


    let options = {mimeType: 'video/webm;codecs=vp9'};
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error("video/webm;codecs=vp9不支持");
        options = {mimeType: 'video/webm;codecs=vp8'};
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.error("video/webm;codecs=vp8不支持");
            options = {mimeType: 'video/webm'};
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.error(`video/webm不支持`);
                options = {mimeType: ''};
            }
        }
    }


    function getDevices() {
        return navigator.mediaDevices.enumerateDevices()
    }

    function gotDevices(devices) {
        devices.forEach(function (device) {
            if (device['kind'] == 'audioinput') {
                device_audio.push(device['deviceId'])
            } else if (device['kind'] == 'videoinput') {
                device_video.push(device['deviceId'])
            }
        })

        if(device_video.length == 1){
            document.getElementById('switchCameraBtn').style.display = 'none';
        }
    }

    function getMedia(mediaStreamConstraints) {
        // 这里是重点，必须要先停止才可以

        if (stream) {
            stream.getVideoTracks()[0].stop();
        }

        const senders = myPeerConnection.getSenders();
        senders.forEach((sender) => myPeerConnection.removeTrack(sender));

        navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
            .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
    }

    function gotLocalMediaStream(mediaStream) {
        stream = mediaStream;
        localVideo.srcObject = mediaStream;

        //add stream to local first
        if ("addTrack" in myPeerConnection) {
            /* use addTrack */
            stream.getTracks().forEach(track => {
                myPeerConnection.addTrack(track, stream);
            });
        } else {
            myPeerConnection.addStream(stream);
        }
    }

    function handleLocalMediaStreamError(error) {
        console.log('navigator.getUserMedia error: ', error);
    }


    // function changeConstraint() {
    //     constraint = {video: {deviceId: videoSelect.value}, audio: {deviceId: audioSelect.value}};
    //     getMedia(constraint);
    // }


    getDevices().then(gotDevices)

    // audioSelect.onchange = changeConstraint;
    // videoSelect.onchange = changeConstraint;


   // console.log(getDevices())

    function startRecord() {

        recordedBlobs = [];

        try {
            //创建MediaRecorder对象,准备录制
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            console.error('创建MediaRecorder错误:', e);
            return;
        }

        //录制停止事件监听
        mediaRecorder.onstop = (event) => {
            console.log('录制停止: ', event);
            console.log('录制的Blobs数据为: ', recordedBlobs);

        };

        mediaRecorder.ondataavailable = (event) => {

            //判断是否有数据
            if (event.data && event.data.size > 1000) {
                //将数据记录起来
                recordedBlobs.push(event.data);
                //if (recordedBlobs.length == 512) {
                console.log(recordedBlobs.length)
                console.log('handleDataAvailable', event.data);
                // saveVideo2Server();
                //
                // setTimeout(() => {
                //     if (mediaRecorder.state != 'inactive') {
                //         mediaRecorder.stop();
                //
                //         if (!stopRecord) {
                //            startRecord();
                //         }
                //     }
                // })
            }
        };

        //开始录制并指定录制时间单位毫秒
        mediaRecorder.start(1000); //10秒
        console.log('MediaRecorder started', mediaRecorder);

    }


    $('#switchCameraBtn').on('click', function () {
        //镜头却换
        if (device_video.length > 1) {
            if (select_video == 0) {
                select_video = 1
            } else {
                select_video = 0
            }
            constraint = {video: {deviceId: device_video[select_video]}, audio: {deviceId: device_audio[0]}};
            getMedia(constraint);
        }

    })


    $('#recordBtn').on('click', function () {


        $('#recordBtn').toggleClass("heart")

        if (!stopRecord) {

            //开始录像
            startRecord();

            stopRecord = true;

            $('#recordIcon').toggleClass('glyphicon-facetime-video').toggleClass('glyphicon-stop');


        } else {

            //停止录制
            mediaRecorder.stop();

            $('#recordIcon').toggleClass('glyphicon-stop').toggleClass('glyphicon-facetime-video');

            stopRecord = false;

            // saveVideo2Server();

            //生成blob文件,类型为video/webm
            const blob = new Blob(recordedBlobs, {type: 'video/mp4'});//webm
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            //指定下载文件及类型
            a.download = 'test.mp4';
            //将a标签添加至网页上去
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                //URL.revokeObjectURL()方法会释放一个通过URL.createObjectURL()创建的对象URL.
                window.URL.revokeObjectURL(url);
            }, 100);

        }

    })

    function saveVideo2Server() {//保存文件到服务器
        //const file = new File(recordedBlobs, "filename.webm")
        const blob = new Blob(recordedBlobs, {type: 'video/webm'});
        recordedBlobs = [];
        var request = new XMLHttpRequest();
        request.open("POST", "/api/video");
        request.onreadystatechange = function () {
            //Call a function when the state changes.
            if (this.readyState == 4 && this.status == 200) {
                console.log(this.responseText);
            }
        }
        //request.send(file);
        request.send(blob);
    }


    $('#loginBtn').on('click', function () {
        myUsername = usernameInput.value;
        myRoomname = roomnameInput.value;
        myUsername = myUsername.replace(/(^\s*)|(\s*$)/g, ""); //替换输入内容当中所有的空字符
        myRoomname = myRoomname.replace(/(^\s*)|(\s*$)/g, ""); //替换输入内容当中所有的空字符

        if (myUsername.length > 0 && myRoomname) {

            localStorage.myUsername = myUsername;

            sendToServer({
                code: 2001,
                value: {
                    room_name: myRoomname,
                    username: myUsername
                },
                message: ""
            });
        } else {
            alert("请输入用户名和房间号！")
        }
    })

    function randomString(e) {
        //随机字符串
        e = e || 32;
        var t = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz",
            a = t.length,
            n = "";
        for (let i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a));
        return n
    }


    //******
    //execute main
    //******
    //打开网页就已经通过ws和服务器连接了.并在服务器创建用户，这个过程只执行一次
    //login button handle
    /*
    loginBtn.addEventListener("click", function () {


    //加入房间
    //{
    //  "code": 2001,
    //  "value": {
    //    "room_name": "123",
    //    "username": "boy"
     // },
    //  "message": ""
    //}

        //处理username
        myUsername = usernameInput.value;
        myRoomname = roomnameInput.value;
        myUsername = myUsername.replace(/(^\s*)|(\s*$)/g, ""); //替换输入内容当中所有的空字符
        if (myUsername.length > 0) {
            sendToServer({
                code: 2001,
                value: {
                    room_name: myRoomname,
                    username: myUsername
                },
                message: ""
            });
        }

    });
    */
    //******
    //UI events definitatoin
    //******

    //when we got a message from a signaling server
    conn.onmessage = function (msg) {
        console.log("Got message", msg.data);
        var data = JSON.parse(msg.data);
        switch (data.code) {
            case 2001:

                handleLogin(data);
                break;
            //when somebody wants to call us
            case 2002:
                handleOffer(data.value.sdp, data.value.username);
                break;
            case 2003:
                handleAnswer(data.value.sdp);
                break;
            case 2022: //root send offer,当服务端主动呼叫时
                localVideo.width = 130;
                localVideo.height = 100;
                myPeerConnection.setRemoteDescription(new RTCSessionDescription(data.value.sdp));
                break;
            case 2222: //当服务端主动呼叫时
                localVideo.width = 130;
                localVideo.height = 100;
                remoteVideo.style.display = "block";
                break
            //when a remote peer sends an ice candidate to us
            case 2005:
                handleCandidate(data.value.candidate);
                break;
            case 3001: //服务端呼叫结束
                //remoteVideo.srcObject = null;
                remoteVideo.style.display = "none";
                localVideo.width = 366;
                localVideo.height = 275;
                break;
            case 3002: //服务端要求挂断
                hangUpBtn.click();
                break;

            default:
                break;
        }
    };

    conn.onerror = function (err) {
        console.log("Got error", err);
        alert("conn.onerror:" + err.message)
    };

    //******
    //ws eventHandler
    //******
    conn.onopen = function () {
        console.log("Connected to the signaling server");
        // sendToServer({
        //     type: "login",
        //     name: "car"
        // });
    };

    /**
     * alias for sending JSON encoded messages
     * 发送给服务器，然后服务器再转发给另外一个客户端
     * @param message
     */
    function sendToServer(message) {
        //attach the other peer username to our messages
        //   alert(connectedUsername);
        // if (connectedUsername) {
        //     message.name = connectedUsername;
        // }
        console.log("sendToServer:" + JSON.stringify(message));
        //alert( JSON.stringify(message));
        try {
            conn.send(JSON.stringify(message));
        } catch (e) {
            console.log(e.message);
            alert(e.message);
        }

    };

    /**
     * 当登录进服务器时，服务器会回复给我们，需要根据成功还是失败进行处理
     * @param success
     */
    function handleLogin(data) {
        if (data.value == -10000) {
            alert(data.message);
        } else {
            //登录成功，显示该显示的界面
            loginPage.style.display = "none";
            callPage.style.display = "block";
            localVideo.style.display = "block";
            remoteVideo.style.display = "none";
            localVideo.width = 366;
            localVideo.height = 275;

            let constraint = {video: {deviceId: device_video[0]}, audio: {deviceId: device_audio[0]}};
            //  constraint = {video: true,  audio: true }
            //打开摄像头
            navigator.mediaDevices.getUserMedia(constraint).then(streamHandler).catch(errorHandler);

        }
    }

    /**
     * getUserMedia的then
     * @param myStream
     */
    function streamHandler(myStream) {
        stream = myStream;
        //displaying local video stream on the page
        localVideo.srcObject = stream;
        //window.localStream = stream;
        //如果当前页面没有打开媒体流，则告知对方
        if (stream == null || !stream.active) {
            // sendToServer({
            //     type: "sendinfo",
            //     info: "It seems that the other side have not open the camera",
            //     close: false
            // });
            alert("It seems that the other side have not open the camera");
            console.log("It seems that the other side have not open the camera");
            return;
        }

        //初始化一切为了webrtc的必要准备
        initPeer();
        // create an offer
        // myPeerConnection.createOffer().then(function (offer) {
        //     myPeerConnection.setLocalDescription(offer);
        //     sendToServer({
        //         code: 2002,
        //         value: {
        //             "sdp": offer
        //         },
        //         message: ""
        //     });
        // }).catch(function (error) {
        //     alert("Error when creating an offer");
        // });

    }

    /**
     * when somebody sends us an offer
     * @param offer 表示offer
     * @param name  表示发送offer给我的人（另一方）
     * @returns {Promise<void>}
     */
    async function handleOffer(offer, name) {
        //如果没创建RTCPeerConnection,需要重新创建连接对象，否则不需要
        if (RTCPeerConnectionCreated == false) {
            initPeer();
        }
        connectedUsername = name;

        await myPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        /*
    {
      "code": 2003,
      "value": {
        "username": "boy",
        "sdp": "444"
      },
      "message": ""
    }
        */
        //create an answer to an offer
        myPeerConnection.createAnswer().then(function (answer) {
            myPeerConnection.setLocalDescription(answer);
            sendToServer({
                code: 2003,
                value: {
                    username: connectedUsername,
                    sdp: answer
                },
                message: ""
            });
        }).catch(function (error) {
            alert("Error when creating an answer");
        });
    };

    /**
     * when we got an answer from a remote user
     * @param answer 对方发过来的answer
     * @returns {Promise<void>}
     */
    async function handleAnswer(answer) {
        await myPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    };

    /**
     * when we got an ice candidate from a remote user
     * @param candidate 对方法发过来的candidate
     */
    function handleCandidate(candidate) {
        myPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    };

    /**
     * 断开连接的处理逻辑
     */
    function handleLeave() {

        stream.getTracks().forEach(track => track.stop()); //关闭数据流

        //attention sequence
        connectedUsername = null;
        remoteVideo.src = null;

        // Disconnect all our event listeners; we don't want stray events
        // to interfere with the hangup while it's ongoing.
        myPeerConnection.onicecandidate = null;
        myPeerConnection.onaddstream = null;
        myPeerConnection.ontrack = null;
        myPeerConnection.onsignalingstatechange = null;
        myPeerConnection.onicegatheringstatechange = null;
        //myPeerConnection.onnotificationneeded = null;
        myPeerConnection.close();
        myPeerConnection = null;

        RTCPeerConnectionCreated = false;

        hangUpBtn.disabled = true;


        loginPage.style.display = "block";
        callPage.style.display = "none";


    };

    // startBtn.addEventListener("click", function() {
    //     let senderList = self.myPeerConnection.getSenders();
    //     console.log(senderList);
    //     let recvList = self.myPeerConnection.getReceivers();
    //     console.log(recvList);
    // });

    // //打开关闭摄像头的按钮只和音视频采集有关，不涉及ws传输逻辑
    // //改成打开摄像头
    // startBtn.addEventListener("click", function() {
    //     //getting local video stream
    //     navigator.mediaDevices.getUserMedia({
    //         video: true,
    //         audio: true
    //     }).then(streamHandler).catch(errorHandler);


    //     startBtn.disabled = true;
    //     closeBtn.disabled = false;
    //     hangUpBtn.disabled = false;

    // });
    // //改成关闭摄像头
    // closeBtn.addEventListener("click", function() {

    //     stream.getTracks().forEach(track => track.stop());
    //     startBtn.disabled = false;
    //     closeBtn.disabled = true;
    //     hangUpBtn.disabled = true;

    // });

    //hang up
    hangUpBtn.addEventListener("click", function () {
        //先通知挂断
        sendToServer({
            code: 3000,
            message: "对方已挂断",
            value: ""
        });

        handleLeave();

    });


    /**
     * getUserMedia的catch
     * @param error
     */
    function errorHandler(error) {
        console.log(error);
    }

    //using Google public stun server
    // const configuration = {
    //     "iceServers": [{
    //         "url": "stun:104.207.157.189:3478"
    //     },
    //         {
    //             "url": "turn:104.207.157.189:3478",
    //             "username": "lqf",
    //             "credential": "123456"
    //         }
    //     ],
    // };

    const configuration = {
        "iceServers": [{
            "urls": "stun:104.207.157.189:3478"
        },
            {
                "urls": "turn:104.207.157.189:3478",
                "username": "lqf",
                "credential": "123456"
            }
        ],
    };

    /*判断客户端*/
    function judgeClient() {
        let client = '';
        if (/(iPhone|iPad|iPod|iOS)/i.test(navigator.userAgent)) { //判断iPhone|iPad|iPod|iOS
            client = 'iOS';
        } else if (/(Android)/i.test(navigator.userAgent)) { //判断Android
            client = 'Android';
        } else {
            client = 'PC';
        }
        return client;
    }


    //**********************
    //Init a peer connection
    //**********************
    function initPeer() {
        //因为各浏览器差异，RTCPeerConnection 一样需要加上前缀。
        let PeerConnection = window.RTCPeerConnection ||
            window.mozRTCPeerConnection ||
            window.webkitRTCPeerConnection;

        try {

            // if (judgeClient() == 'iOS') {
            //     myPeerConnection = new PeerConnection(configuration_ios);
            // } else {
            //
            // }

            myPeerConnection = new PeerConnection(configuration);

            //add stream to local first
            if ("addTrack" in myPeerConnection) {
                /* use addTrack */
                stream.getTracks().forEach(track => {
                    myPeerConnection.addTrack(track, stream);
                });
            } else {
                myPeerConnection.addStream(stream);
            }
            //**********************
            //Register event process needed
            //**********************
            // setup stream listening
            if ("ontrack" in myPeerConnection) {
                //when a remote user adds stream to the peer connection, we display it
                myPeerConnection.ontrack = handleRemoteTrackAdded;

            } else {
                //when a remote user adds stream to the peer connection, we display it
                myPeerConnection.onaddstream = handleRemoteStreamAdded;

            }
            // Setup other events
            myPeerConnection.onicecandidate = handleIceCandidate;
            myPeerConnection.oniceconnectionstatechange = handleIceConnectionStateChangeEvent;
            myPeerConnection.onicegatheringstatechange = handleIceGatheringStateChangeEvent;
            myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
            myPeerConnection.onnegotiationneeded = (event) => {
                console.log("onnegotiationneeded");
                myPeerConnection.createOffer().then(function (offer) {
                    myPeerConnection.setLocalDescription(offer);
                    sendToServer({
                        code: 2002,
                        value: {
                            "sdp": offer
                        },
                        message: ""
                    });
                }).catch(function (error) {
                    alert("Error when creating an offer");
                });

            }

            RTCPeerConnectionCreated = true;
        } catch (e) {
            console.log('Failed to create PeerConnection, exception: ' + e.message);
            alert('Cannot create RTCPeerConnection object!!!' + e.message);
            RTCPeerConnectionCreated = false;
            return;
        }

    }

    // Handles |icecandidate| events by forwarding the specified
    // ICE candidate (created by our local ICE agent) to the other
    // peer through the signaling server.
    async function handleIceCandidate(event) {
        /*
        {
      "code": 2004,
      "value": {
        "candidate": "444"
      },
      "message": ""
    }
        */
        if (event.candidate) {
            sendToServer({
                code: 2004,
                value: {
                    candidate: event.candidate
                },
                message: ""
            });
        }
    }

    // 能触发这个表明已经连接远程摄像头成功并且媒体流已经在暗流涌动了，接下来在他里面使用媒体流即可！
    // Called by the WebRTC layer when events occur on the media tracks
    // on our WebRTC call. This includes when streams are added to and
    // removed from the call.
    //
    // track events include the following fields:
    //
    // RTCRtpReceiver       receiver
    // MediaStreamTrack     track
    // MediaStream[]        streams
    // RTCRtpTransceiver    transceiver
    //
    // In our case, we're just taking the first stream found and attaching
    // it to the <video> element for incoming media.
    async function handleRemoteTrackAdded(e) {
        //remoteVideo.srcObject = window.URL.createObjectURL(e.stream);
        console.log("local handleRemoteTrackAdded");

        remoteVideo.style.display = "block";

        remoteVideo.srcObject = e.streams[0];
        //once add remote video success, we set call button disabled
        hangUpBtn.disabled = false;
    }

    //since addstream is desperated
    async function handleRemoteStreamAdded(e) {

        console.log("local handleRemoteStreamAdded");
        //remoteVideo.srcObject = window.URL.createObjectURL(e.stream);
        //remoteVideo.srcObject = e.stream;
        //once add remote video success, we set call button disabled
        hangUpBtn.disabled = false;
    }

    // Handle |iceconnectionstatechange| events. This will detect
    // when the ICE connection is closed, failed, or disconnected.
    //
    // This is called when the state of the ICE agent changes.

    async function handleIceConnectionStateChangeEvent(event) {
        console.log("*** ICE connection state changed to " + myPeerConnection.iceConnectionState);

        switch (myPeerConnection.iceConnectionState) {
            case "closed":
            case "failed":
            // handleLeave();
            // break;
            case "disconnected":
                handleLeave();
                break;
            //zsc added 不知行不行
            case "connected":
                hangUpBtn.disabled = false;
                break;
        }
    }

    // Handle the |icegatheringstatechange| event. This lets us know what the
    // ICE engine is currently working on: "new" means no networking has happened
    // yet, "gathering" means the ICE engine is currently gathering candidates,
    // and "complete" means gathering is complete. Note that the engine can
    // alternate between "gathering" and "complete" repeatedly as needs and
    // circumstances change.
    //
    // We don't need to do anything when this happens, but we log it to the
    // console so you can see what's going on when playing with the sample.

    async function handleIceGatheringStateChangeEvent(event) {
        console.log("*** ICE gathering state changed to: " + myPeerConnection.iceGatheringState);
    }

    // Set up a |signalingstatechange| event handler. This will detect when
    // the signaling connection is closed.
    //
    // NOTE: This will actually move to the new RTCPeerConnectionState enum
    // returned in the property RTCPeerConnection.connectionState when
    // browsers catch up with the latest version of the specification!

    async function handleSignalingStateChangeEvent(event) {
        if (myPeerConnection == null) {
            return;
        }
        console.log("*** WebRTC signaling state changed to: " + myPeerConnection.signalingState);
        switch (myPeerConnection.signalingState) {
            case "closed":
                handleLeave();
                break;
        }
    }

    //收到另一方发来的命令后，就可以开始着手createOffer了。
    function handleCmd(sender) {

        //开始createOffer，并setLocalDescription
        if (sender.length > 0) {

            //打开摄像头
            navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            }).then(streamHandler).catch(errorHandler);

            //connectedUsername是个全局变量，需要设置一下，否则sendToServer的时候不知道给谁发！
            connectedUsername = sender;

        }
    }

});
