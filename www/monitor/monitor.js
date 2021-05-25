/***
 * 本文件是视频请求方逻辑，但是不是真正的请求。
 * 它通过向另一方发送命令，让连接的另一方返回来请求我们自己
 */
//**********************
//Init ws module
//**********************
let servername = location.hostname;
//let servername = "pi.qzcool.co";
var serverurl = 'wss://' + servername + "/ws";
var conn = new WebSocket(serverurl);
//******
//UI selectors block
//******

var loginPage = document.querySelector('#loginPage');
var roomnameInput = document.querySelector('#roomnameInput');
var roomBtn = document.querySelector('#roomBtn');

var callPage = document.querySelector('#callPage');
var callBtn = document.querySelector('#callBtn');
var hangUpBtn = document.querySelector('#hangUpBtn');
var tip = document.querySelector('#tip');

SetRoomName();//设置房间名称


var USERLIST = {}
var MainVideoName = ''
loginPage.style.display = "block";
callPage.style.display = "none";


function SetRoomName() {
    //根据时间设置房间名称
    let date = new Date();//当前时间
    let year = date.getFullYear()
    let month = zeroFill(date.getMonth() + 1);//月
    let day = zeroFill(date.getDate());//日
    let hour = zeroFill(date.getHours());//时
    let minute = zeroFill(date.getMinutes());//时

    //console.log(month.toString()+day.toString()+hour.toString())

     // roomnameInput.value =year.toString()+ month.toString()+day.toString()+hour.toString()
    roomnameInput.value =hour.toString()+minute.toString()

}

/**
 * 补零
 */
function zeroFill(i){
    if (i >= 0 && i <= 9) {
        return "0" + i;
    } else {
        return i;
    }
}

class MyWebRtc {
    constructor(username) {
        this.RTCPeerConnectionCreated = false;
        this.myPeerConnection = null;
        this.stream = null;
        this.recordedBlobs = [];
        this.connectedUsername = username;
        this.mediaRecorder = null;
        ;
        this.configuration = {
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


        console.log(Object.keys(USERLIST))

        // if (Object.keys(USERLIST).length == 0) {
        //
            MainVideoName = username

            this.videosContainer = document.getElementById('videos-container');

            this.div = document.createElement('div');
            this.div.setAttributeNode(document.createAttribute('class'));
            this.div.setAttribute('class', "remoteVideo_div   ");

            this.div.innerHTML += "<video class=\"remoteVideo\" autoplay playsinline id=\"video_" + username + "\"> </video><video class=\"localVideo\"  muted id=\"localVideo_" + username + "\" autoplay></video><div class=\"row text-center control\" style:\"margin-top:15px;\">  <button id=\"callBtn_" + username + "\"   class=\"btn-success btn btn-w3r btn-lg btn_margin\" title='呼叫'><span\n" +
                "                            class=\"glyphicon glyphicon-earphone\" aria-hidden=\"true\"></span></button>  <button id=\"hangUpBtn_" + username + "\"  class=\"btn-danger btn btn-w3r btn-lg btn_margin\"   title='断挂'><span\n" +
                "                            class=\"glyphicon glyphicon-phone-alt\" aria-hidden=\"true\"></span></button>  <button id=\"closeBtn_" + username + "\"  class=\"btn-danger btn btn-w3r btn-lg btn_margin\"   title='关闭'><span\n" +
                "                            class=\"glyphicon glyphicon glyphicon-remove\" aria-hidden=\"true\"></span></button>" +
                " <button id=\"recordBtn_" + username + "\" class=\"btn-primary btn btn-w3r btn-lg btn_margin\" ><span id=\"recordIcon_" + username + "\"\n" +
                "                            class=\"glyphicon glyphicon-facetime-video\" aria-hidden=\"true\"></span></button>" +

                "</div>"

            this.videosContainer.appendChild(this.div);

        // } else {
        //
        //     this.videosContainer = document.getElementById('sub-videos-container');
        //
        //     this.div = document.createElement('div');
        //     this.div.setAttributeNode(document.createAttribute('class'));
        //     this.div.setAttribute('class', "sub-remoteVideo   ");
        //
        //     this.div.innerHTML += "<video class=\"sub-remoteVideo\" autoplay playsinline id=\"video_" + username + "\"> </video><video class=\"sub-localVideo\"  muted id=\"localVideo_" + username + "\" autoplay></video><div class=\"row text-center sub-control\" style:\"margin-top:15px;\">  <button id=\"callBtn_" + username + "\"   class=\"btn-success btn btn-w3r btn-lg btn_margin\" title='呼叫'><span\n" +
        //         "                            class=\"glyphicon glyphicon-earphone\" aria-hidden=\"true\"></span></button>  <button id=\"hangUpBtn_" + username + "\"  class=\"btn-danger btn btn-w3r btn-lg btn_margin\"   title='断挂'><span\n" +
        //         "                            class=\"glyphicon glyphicon-phone-alt\" aria-hidden=\"true\"></span></button>  <button id=\"closeBtn_" + username + "\"  class=\"btn-danger btn btn-w3r btn-lg btn_margin\"   title='关闭'><span\n" +
        //         "                            class=\"glyphicon glyphicon glyphicon-remove\" aria-hidden=\"true\"></span></button>" +
        //         " <button id=\"recordBtn_" + username + "\" class=\"btn-primary btn btn-w3r btn-lg btn_margin\" ><span id=\"recordIcon_" + username + "\"\n" +
        //         "                            class=\"glyphicon glyphicon-facetime-video\" aria-hidden=\"true\"></span></button>" +
        //
        //         "</div>"
        //
        //     this.videosContainer.appendChild(this.div);
        //
        // }


        this.video = document.querySelector('#video_' + username);
        this.callBtn = document.querySelector('#callBtn_' + username);
        this.hangUpBtn = document.querySelector('#hangUpBtn_' + username);
        this.localVideo = document.querySelector('#localVideo_' + username);
        this.closeClientBtn = document.querySelector('#closeBtn_' + username);
        this.recordBtn = document.querySelector('#recordBtn_' + username);
        // this.stopRecordBtn = document.querySelector('#stopRecordBtn_' + username);
        this.recordIcon = document.querySelector('#recordIcon_' + username);
        this.localVideo.style.display = "none";
        let self = this;
        this.stopRecord = false;

        this.options = {mimeType: 'video/webm;codecs=vp9'};
        if (!MediaRecorder.isTypeSupported(this.options.mimeType)) {
            console.error("video/webm;codecs=vp9不支持");
            this.options = {mimeType: 'video/webm;codecs=vp8'};
            if (!MediaRecorder.isTypeSupported(this.options.mimeType)) {
                console.error("video/webm;codecs=vp8不支持");
                this.options = {mimeType: 'video/webm'};
                if (!MediaRecorder.isTypeSupported(this.options.mimeType)) {
                    console.error(`video/webm不支持`);
                    this.options = {mimeType: ''};
                }
            }
        }


        this.recordBtn.addEventListener("click", function () {


            $('#recordBtn_' + username).toggleClass("heart")

            if (!self.stopRecord) {
                self.startRecord()
                self.stopRecord = true
                $('#recordIcon_' + username).toggleClass('glyphicon-facetime-video').toggleClass('glyphicon-stop');
            } else {

                self.stopRecord = false
                $('#recordIcon_' + username).toggleClass('glyphicon-stop').toggleClass('glyphicon-facetime-video');

                //停止录制
                self.mediaRecorder.stop();
                // saveVideo2Server();
                //生成blob文件,类型为video/webm
                const blob = new Blob(self.recordedBlobs, {type: 'video/mp4'});
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

        // this.stopRecordBtn.addEventListener("click", function () {
        //     //停止录制
        //     self.mediaRecorder.stop();
        //     // saveVideo2Server();
        //     //生成blob文件,类型为video/webm
        //     const blob = new Blob(self.recordedBlobs, {type: 'video/webm'});
        //     const url = window.URL.createObjectURL(blob);
        //     const a = document.createElement('a');
        //     a.style.display = 'none';
        //     a.href = url;
        //     //指定下载文件及类型
        //     a.download = 'test.webm';
        //     //将a标签添加至网页上去
        //     document.body.appendChild(a);
        //     a.click();
        //     setTimeout(() => {
        //         document.body.removeChild(a);
        //         //URL.revokeObjectURL()方法会释放一个通过URL.createObjectURL()创建的对象URL.
        //         window.URL.revokeObjectURL(url);
        //     }, 100);
        // })


        this.closeClientBtn.addEventListener("click", function () {
            //关闭客户端
            console.log("close client");
            MyWebRtc.sendToServer({
                code: 3002,
                value: {"username": self.connectedUsername},
                message: "请挂断",
            });
        })

        this.hangUpBtn.addEventListener("click", function () {
            console.log("hangUpBtn")
            self.stream.getTracks().forEach(track => track.stop()); //关闭数据流

            const senders = self.myPeerConnection.getSenders();
            senders.forEach((sender) => self.myPeerConnection.removeTrack(sender));

            self.localVideo.style.display = "none";
            // self.callBtn.disabled = false;
            // self.hangUpBtn.visibility = "hidden";
            self.displayCall(true);
            MyWebRtc.sendToServer({
                code: 3001,
                value: {"username": self.connectedUsername},
                message: "对方已挂断",
            });

        });

        this.callBtn.addEventListener("click", function () {
            console.log("callBtn")
            let senderList = self.myPeerConnection.getSenders();
            console.log(senderList);

            let recvList = self.myPeerConnection.getReceivers();

            console.log(recvList);

            self.localVideo.style.display = "block";

            // self.callBtn.disabled = true;
            // self.hangUpBtn.disabled = false;
            //
            self.displayCall(false);


            navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            }).then((myStream) => {
                self.stream = myStream;
                self.localVideo.srcObject = self.stream;
                if ("addTrack" in self.myPeerConnection) {
                    /* use addTrack */
                    console.log("addTrack stream")
                    self.stream.getTracks().forEach(track => {
                        self.myPeerConnection.addTrack(track, self.stream);
                    });

                    let senderList = self.myPeerConnection.getSenders();
                    console.log(senderList);

                } else {
                    self.myPeerConnection.addStream(self.stream);
                }


                MyWebRtc.sendToServer({
                    code: 2222,
                    value: {"username": self.connectedUsername},
                    message: "呼叫建立连接",
                });

            }).catch(self.errorHandler);

        })

    }


    startRecord() {

        var self = this;

        this.recordedBlobs = [];

        try {
            //创建MediaRecorder对象,准备录制  self.video.srcObject
            // this.mediaRecorder = new MediaRecorder(this.stream, this.options);
            this.mediaRecorder = new MediaRecorder(self.video.srcObject, this.options);
        } catch (e) {
            console.error('创建MediaRecorder错误:', e);
            return;
        }

        //录制停止事件监听
        this.mediaRecorder.onstop = (event) => {
            console.log('录制停止: ', event);
            console.log('录制的Blobs数据为: ', self.recordedBlobs);

        };

        this.mediaRecorder.ondataavailable = (event) => {

            //判断是否有数据
            if (event.data && event.data.size > 1000) {
                //将数据记录起来
                self.recordedBlobs.push(event.data);
                //if (recordedBlobs.length == 512) {
                console.log(self.recordedBlobs.length)
                console.log('handleDataAvailable', event.data);
            }
        };

        //开始录制并指定录制时间单位毫秒
        this.mediaRecorder.start(1000); //10秒
        console.log('MediaRecorder started', this.mediaRecorder);

    }


    displayCall(show) {
        //是否显示呼叫按钮
        if (show) {
            this.hangUpBtn.style.display = "none";
            this.callBtn.style.display = "block";
        } else {
            this.hangUpBtn.style.display = "block";
            this.callBtn.style.display = "none";
        }

    }

    /**
     * getUserMedia的catch
     * @param error
     */
    errorHandler(error) {
        console.log(error);
    }

    //**********************
    //Init a peer connection
    //**********************
    initPeer() {

        console.log("MyWebRtc initPeer");
        //因为各浏览器差异，RTCPeerConnection 一样需要加上前缀。火狐浏览器的前缀需要再论证。
        let PeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

        var self = this;
        try {
            this.myPeerConnection = new PeerConnection(this.configuration);

            //**********************
            //Register event process needed
            //**********************
            // setup stream listening
            if ("ontrack" in this.myPeerConnection) {
                //when a remote user adds stream to the peer connection, we display it
                console.log("MyWebRtc use ontrack");
                let self = this;
                //this.myPeerConnection.ontrack = this.handleRemoteTrackAdded;
                this.myPeerConnection.ontrack = (e) => {
                    this.streamid = e.streams[0].id
                    console.log("MyWebRtc handleRemoteTrackAdded " + e.streams[0].id);
                    self.video.srcObject = e.streams[0];
                    // self.hangUpBtn.style.display = "none";
                    //
                    // self.callBtn.disabled = false;

                    self.displayCall(true);
                    //self.callBtn.click();
                    // self.hangUpBtn.click();
                }

            } else {
                //when a remote user adds stream to the peer connection, we display it
                console.log("MyWebRtc use onaddstream");
                this.myPeerConnection.onaddstream = (e) => {
                    // since addstream is desperated
                    console.log("MyWebRtc handleRemoteStreamAdded");
                    self.video.srcObject = e.stream;
                    //once add remote video success, we set call button disabled
                    // self.hangUpBtn.disabled = false;
                    // self.callBtn.disabled = false;
                    self.displayCall(true);
                }

            }
            // Setup other events
            this.myPeerConnection.onicecandidate = (event) => {
                console.log("MyWebRtc handleIceCandidate:" + event.candidate);
                if (event.candidate) {
                    MyWebRtc.sendToServer({
                        code: 2005,
                        value: {
                            username: self.connectedUsername,
                            candidate: event.candidate
                        },
                        message: ""
                    });
                }

            }

            //this.myPeerConnection.oniceconnectionstatechange = this.handleIceConnectionStateChangeEvent;
            this.myPeerConnection.oniceconnectionstatechange = (even) => {
                console.log("*** MyWebRtc ICE connection state changed to " + this.myPeerConnection.iceConnectionState);
                switch (this.myPeerConnection.iceConnectionState) {
                    case "closed":
                    case "failed":
                    case "disconnected":
                        this.handleLeave();
                        break;

                }
            };
            //this.myPeerConnection.onicegatheringstatechange = this.handleIceGatheringStateChangeEvent;

            this.myPeerConnection.onicegatheringstatechange = (event) => {
                console.log("***MyWebRtc ICE gathering state changed to: " + this.myPeerConnection.iceGatheringState);
            }

            this.myPeerConnection.onsignalingstatechange = (evnent) => {
                console.log("MyWebRtc handleSignalingStateChangeEvent");
                if (self.myPeerConnection == null) {
                    console.log("MyWebRtc handleSignalingStateChangeEvent myPeerConnection null");
                    return;
                }
                console.log("*** WebRTC signaling state changed to: " + this.myPeerConnection.signalingState);

            }
            this.myPeerConnection.onnegotiationneeded = (event) => {
                console.log("onnegotiationneeded");

                self.myPeerConnection.createOffer().then(function (offer) {
                    self.myPeerConnection.setLocalDescription(offer);
                    MyWebRtc.sendToServer({
                        code: 2022,
                        value: {
                            "username": self.connectedUsername,
                            "sdp": offer
                        },
                        message: ""
                    });
                }).catch(function (error) {
                    alert("Error when creating an offer");
                });

            };

            this.RTCPeerConnectionCreated = true;
        } catch (e) {
            console.log('MyWebRtc Failed to create PeerConnection, exception: ' + e.message);
            alert('Cannot create RTCPeerConnection object.');
            this.RTCPeerConnectionCreated = false;
            return;
        }

    }


    /**
     * when we got an answer from a remote user
     * @param answer 对方发过来的answer
     * @returns {Promise<void>}
     */
    async handleAnswer(answer) {
        console.log("MyWebRtc handleAnswer");
        await this.myPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    };

    /**
     * when we got an ice candidate from a remote user
     * @param candidate 对方法发过来的candidate
     */
    handleCandidate(candidate) {
        console.log("MyWebRtc handleCandidate");

        this.myPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    };

    /**
     * when somebody sends us an offer
     * @param offer 表示offer
     * @param name  表示发送offer给我的人（另一方）
     * @returns {Promise<void>}
     */
    async handleOffer(offer, name) {
        //如果没创建RTCPeerConnection,需要重新创建连接对象，否则不需要
        let self = this;
        console.log("MyWebRtc handleOffer");
        if (!this.RTCPeerConnectionCreated) {
            this.initPeer();
            this.connectedUsername = name;
            //create an answer to an offer
            this.addRemoteSdp(offer, function () {
                self.createOfferOrAnswer('createAnswer');
            })

        } else {

            this.connectedUsername = name;
            //await this.myPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            //create an answer to an offer
            this.addRemoteSdp(offer, function () {
                self.createOfferOrAnswer('createAnswer');
            })

        }

    };

    createOfferOrAnswer(_method) {
        var self = this;
        this.myPeerConnection.createAnswer().then(function (answer) {
            self.answer = answer;
            self.myPeerConnection.setLocalDescription(answer);
            MyWebRtc.sendToServer({
                code: 2003,
                value: {
                    username: self.connectedUsername,
                    sdp: answer
                },
                message: ""
            });
        }).catch(function (error) {
            console.log("MyWebRtc Error when creating an answer" + error)
            alert("MyWebRtc Error when creating an answer" + error);

        });
    }

    addRemoteSdp(remoteSdp, cb) {
        cb = cb || function () {
        };

        this.myPeerConnection.setRemoteDescription(new RTCSessionDescription(remoteSdp)).then(cb, function (error) {
            console.error('setRemoteDescription failed', '\n', error, '\n', remoteSdp.sdp);
            cb();
        }).catch(function (error) {
            console.error('setRemoteDescription failed', '\n', error, '\n', remoteSdp.sdp);

            cb();
        });
    };


    /**
     * alias for sending JSON encoded messages
     * 发送给服务器，然后服务器再转发给另外一个客户端
     * @param message
     */
    static sendToServer(message) {
        console.log("MyWebRtc sendToServer:" + JSON.stringify(message));

        //attach the other peer username to our messages
        if (this.connectedUsername) {
            message.name = this.connectedUsername;
        }
        conn.send(JSON.stringify(message));
    };


    /**
     * 断开连接的处理逻辑
     */
    handleLeave() {
        console.log("MyWebRtc handleLeave:" + this.stream+" UserName:"+this.connectedUsername);

        if(MainVideoName == this.connectedUsername)
        {//如果是主窗体用户离开，下一个窗体变成主窗体
                console.log(USERLIST);
        }


        if (this.stream != null) {
            console.log("this.stream != null")
            this.stream.getTracks().forEach(track => track.stop()); //关闭数据流

            // const senders = this.myPeerConnection.getSenders();
            // senders.forEach((sender) => this.myPeerConnection.removeTrack(sender));
        }

        //attention sequence
        this.connectedUsername = null;
        this.video.src = null;
        this.localVideo.src = null;
        // Disconnect all our event listeners; we don't want stray events
        // to interfere with the hangup while it's ongoing.
        this.myPeerConnection.onicecandidate = null;
        this.myPeerConnection.onaddstream = null;
        this.myPeerConnection.ontrack = null;
        this.myPeerConnection.onsignalingstatechange = null;
        this.myPeerConnection.onicegatheringstatechange = null;
        //myPeerConnection.onnotificationneeded = null;
        this.myPeerConnection.close();
        this.myPeerConnection = null;
        this.RTCPeerConnectionCreated = false;
        //按钮相应的要变化
        // this.hangUpBtn.disabled = true;
        // this.callBtn.disabled = false;
        this.displayCall(true);
        this.videosContainer.removeChild(this.div);
    };

}


//******
//ws eventHandler
//******
conn.onopen = function () {
    console.log("Connected to the signaling server");
};

//when we got a message from a signaling server
conn.onmessage = function (msg) {
    console.log("Got message", msg.data);
    var data = JSON.parse(msg.data);
    switch (data.code) {
        case 2000:
            handleLogin(data);
            break;
        //when somebody wants to call us
        case 2002:
            console.log("=====2002=====")
            if (!USERLIST.hasOwnProperty(data.value.username)) {
                let myWebRtc = new MyWebRtc(data.value.username);
                USERLIST[data.value.username] = myWebRtc;
                myWebRtc.handleOffer(data.value.sdp, data.value.username);
            }else{
                 let myWebRtc = USERLIST[data.value.username];
                  myWebRtc.handleOffer(data.value.sdp, data.value.username);
            }

            break;
        case 2004:
            if (USERLIST.hasOwnProperty(data.value.username)) {
                console.log("2004:" + data.value.username)
                let myWebRtc = USERLIST[data.value.username];
                console.log("myWebRtc 2004:" + myWebRtc.connectedUsername);
                myWebRtc.handleCandidate(data.value.candidate);
            }
            break;
        case 3000:
            if (USERLIST.hasOwnProperty(data.value.username)) {
                console.log("3000:" + data.value.username)
                let myWebRtc = USERLIST[data.value.username];
                console.log("myWebRtc 3000:" + myWebRtc.connectedUsername);
                myWebRtc.handleLeave();
                //清除客户端
                delete USERLIST[data.value.username];
            }
            break;
        default:
            break;
    }
};

conn.onerror = function (err) {
    console.log("Got error", err);
};

//******
//UI events definitatoin
//******
// Login when the user clicks the button
roomBtn.addEventListener("click", function (event) {
    //{"code":2000,"value":{"room_name":"123"},"message":""}

    if (roomnameInput.value.length > 0) {
        MyWebRtc.sendToServer({
            code: 2000,
            value: {"room_name": roomnameInput.value},
            message: ""
        });
    }
});

/**
 * 当登录进服务器时，服务器会回复给我们，需要根据成功还是失败进行处理
 * @param success
 */
function handleLogin(data) {
    if (data.value == -10000) {
        alert(data.message);
    } else {

        loginPage.style.display = "none";
        callPage.style.display = "block";
        console.log(data.message);
        tip.innerText = "当前调度室：" + roomnameInput.value;

    }
};
