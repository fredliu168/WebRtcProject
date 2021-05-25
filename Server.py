# -*- coding: utf-8 -*-

"""
WebRTC信令服务器
blog.qzcool.com
2021-04-08
"""

import asyncio
import websockets
import json

# import socket

V_ROOM = {}  # 用户加入的房间
V_WS = {}  # websocket 对应的用户


def create_room(recv_json, websocket):
    """
    创建房间
    :param recv_json:
    :param websocket:
    :return:
    """
    response_text = {"code": 2000, "value": 10000, "message": ""}
    room_name = recv_json['value']['room_name']
    if room_name in V_ROOM:
        response_text['value'] = -10000
        response_text['message'] = "房间已经存在，创建失败"

    else:
        V_ROOM[room_name] = {}
        V_ROOM[room_name]['root'] = {'ws': websocket}
        response_text['message'] = "创建房间{}成功".format(room_name)
        V_WS[websocket] = {"room_name": room_name, "type": "root", "username": "root"}  # root 用户
    return response_text


def join_room(recv_json, websocket):
    """
    加入房间
    :param recv_text:
    :param websocket:
    :return:
    """
    response_text = {"code": 2001, "value": 10000, "message": ""}
    room_name = recv_json['value']['room_name']
    username = recv_json['value']['username']
    if room_name in V_ROOM:
        if username in V_ROOM[room_name]:  # 用户已经存在
            response_text['value'] = -10000
            response_text['message'] = "用户已经存在，加入失败"

        else:
            V_ROOM[room_name][username] = {}
            V_ROOM[room_name][username]['ws'] = websocket
            response_text['message'] = "加入成功"
            V_WS[websocket] = {"room_name": room_name, "type": "guest", "username": username}  # guest 用户
            # ws_root = V_ROOM[room_name]['ws_root']
            # V_WS[ws_root]["guest_ws"].append(websocket)  # 把客户端链接加到列表里面

    else:
        response_text['value'] = -10000
        response_text['message'] = "房间不存在，加入失败"

    return response_text


# 接收客户端消息并处理
async def recv_msg(websocket):
    while True:
        try:
            response_text = {"code": 10000, "value": "", "message": ""}
            recv_text = await websocket.recv()
            print(recv_text)
            recv_json = json.loads(recv_text)
            if recv_json['code'] == 2000:  # 创建房间
                response_text = create_room(recv_json, websocket)
            if recv_json['code'] == 2001:  # 加入房间
                response_text = join_room(recv_json, websocket)
            if recv_json['code'] == 2002:  # 转发SDP

                response_text['code'] == 2002
                if websocket in V_WS:
                    room_name = V_WS[websocket]['room_name']
                    if room_name in V_ROOM:
                        username = V_WS[websocket]['username']
                        ws_root = V_ROOM[room_name]['root']['ws']
                        send_value = {"username": username, "sdp": recv_json["value"]["sdp"]}
                        res_json = {"code": 2002, "value": send_value, "message": ""}
                        await ws_root.send(json.dumps(res_json))  # 转发SDP到root用户
                        response_text['message'] = "发送Offer SDP成功"
                    else:
                        response_text['value'] = -10000
                        response_text['message'] = "房间不存在，发送SDP失败"
                else:
                    response_text['value'] = -10000
                    response_text['message'] = "你当前还未加入房间，发送失败"

            if recv_json['code'] == 2022:  # root 发送 SDP offer
                response_text['code'] == 2022
                if websocket in V_WS:
                    room_name = V_WS[websocket]['room_name']
                    if room_name in V_ROOM:
                        username = recv_json['value']['username']
                        ws = V_ROOM[room_name][username]['ws']
                        send_value = {"username": 'root', "sdp": recv_json["value"]["sdp"]}
                        res_json = {"code": 2022, "value": send_value, "message": ""}
                        await ws.send(json.dumps(res_json))  # 转发SDP到user用户
                        response_text['message'] = "发送Offer SDP成功"
                    else:
                        response_text['value'] = -10000
                        response_text['message'] = "房间不存在，发送SDP失败"
                else:
                    response_text['value'] = -10000
                    response_text['message'] = "你当前还未加入房间，发送失败"

            if recv_json['code'] == 2222:  # root 发送呼叫
                response_text['code'] == 2222
                if websocket in V_WS:
                    room_name = V_WS[websocket]['room_name']
                    if room_name in V_ROOM:
                        username = recv_json['value']['username']
                        ws = V_ROOM[room_name][username]['ws']
                        await ws.send(json.dumps(recv_json))  # 转发到user用户
                        response_text['message'] = "发送Offer SDP成功"
                    else:
                        response_text['value'] = -10000
                        response_text['message'] = "房间不存在，发送SDP失败"
                else:
                    response_text['value'] = -10000
                    response_text['message'] = "你当前还未加入房间，发送失败"

            if recv_json['code'] == 2003:  # 转发Answer SDP
                if websocket in V_WS:
                    room_name = V_WS[websocket]['room_name']
                    if room_name in V_ROOM:
                        username = recv_json['value']['username']
                        ws = V_ROOM[room_name][username]['ws']
                        send_value = {"username": 'root', "sdp": recv_json["value"]["sdp"]}
                        res_json = {"code": 2003, "value": send_value, "message": ""}
                        await ws.send(json.dumps(res_json))  # 转发SDP到用户
                        response_text['message'] = "发送Answer SDP成功"
                    else:
                        response_text['code'] = -10000
                        response_text['message'] = "房间不存在，发送SDP失败"
                else:
                    response_text['code'] = -10000
                    response_text['message'] = "你当前还未加入房间，发送失败"

            if recv_json['code'] == 2004:  # 转发candidate
                if websocket in V_WS:
                    room_name = V_WS[websocket]['room_name']
                    if room_name in V_ROOM:
                        username = V_WS[websocket]['username']
                        ws_root = V_ROOM[room_name]['root']['ws']
                        send_value = {"username": username, "candidate": recv_json["value"]["candidate"]}
                        res_json = {"code": 2004, "value": send_value, "message": ""}
                        await ws_root.send(json.dumps(res_json))  # 转发candidate到root用户
                        response_text['message'] = "发送candidate成功"
                    else:
                        response_text['code'] = -10000
                        response_text['message'] = "房间不存在，发送candidate失败"
                else:
                    response_text['code'] = -10000
                    response_text['message'] = "你当前还未加入房间，发送失败"

            if recv_json['code'] == 2005:  # 转发candidate
                if websocket in V_WS:
                    room_name = V_WS[websocket]['room_name']
                    if room_name in V_ROOM:
                        username = recv_json['value']['username']
                        ws = V_ROOM[room_name][username]['ws']
                        send_value = {"username": 'root', "candidate": recv_json["value"]["candidate"]}
                        res_json = {"code": 2005, "value": send_value, "message": ""}
                        await ws.send(json.dumps(res_json))  # 转发candidate到用户
                        response_text['message'] = "发送candidate成功"
                    else:
                        response_text['code'] = -10000
                        response_text['message'] = "房间不存在，发送candidate失败"
                else:
                    response_text['code'] = -10000
                    response_text['message'] = "你当前还未加入房间，发送失败"

            if recv_json['code'] == 3000:  # 客户端离开
                if websocket in V_WS:
                    room_name = V_WS[websocket]['room_name']
                    user_type = V_WS[websocket]['type']

                    username = V_WS[websocket]['username']
                    V_ROOM[room_name].pop(username)
                    V_WS.pop(websocket)

                    ws_root = V_ROOM[room_name]['root']['ws']
                    send_value = {"username": username}
                    res_json = {"code": 3000, "value": send_value, "message": recv_json['message']}
                    await ws_root.send(json.dumps(res_json))  # 转发candidate到root用户

            if recv_json['code'] == 3001:  # 服务端用户挂断连接
                response_text['code'] == 3001
                if websocket in V_WS:
                    room_name = V_WS[websocket]['room_name']
                    if room_name in V_ROOM:
                        username = recv_json['value']['username']
                        ws = V_ROOM[room_name][username]['ws']
                        await ws.send(json.dumps(recv_json))  # 转发SDP到user用户
                        response_text['message'] = "发送Offer SDP成功"
                    else:
                        response_text['value'] = -10000
                        response_text['message'] = "房间不存在，发送SDP失败"
                else:
                    response_text['value'] = -10000
                    response_text['message'] = "你当前还未加入房间，发送失败"
            if recv_json['code'] == 3002:  # 通知客户端挂断
                response_text['code'] == 3002
                if websocket in V_WS:
                    room_name = V_WS[websocket]['room_name']
                    if room_name in V_ROOM:
                        username = recv_json['value']['username']
                        ws = V_ROOM[room_name][username]['ws']
                        await ws.send(json.dumps(recv_json))  # 转发user用户
                        response_text['message'] = "发送成功"
                    else:
                        response_text['value'] = -10000
                        response_text['message'] = "房间不存在，发送S失败"
                else:
                    response_text['value'] = -10000
                    response_text['message'] = "你当前还未加入房间，发送失败"
                  


            print(V_ROOM)
            print(V_WS)
            await websocket.send(json.dumps(response_text))
        except websockets.ConnectionClosed:
            print("client {} close!".format(websocket.remote_address[0]))

            if websocket in V_WS:
                room_name = V_WS[websocket]['room_name']
                user_type = V_WS[websocket]['type']

                if user_type == 'root':
                    # 创建房间的用户离线，删除房间，主动关掉用户连接
                    for user_name in V_ROOM[room_name]:
                        if user_name != 'root':
                            ws = V_ROOM[room_name][user_name]['ws']
                            response_text = {"code": 10001, "value": "",
                                             "message": "房间{}已经删除，请重新加入其他房间".format(room_name)}
                            await ws.send(json.dumps(response_text))
                            # ws.close()
                            V_WS.pop(ws)
                    V_ROOM.pop(room_name)
                    V_WS.pop(websocket)
                elif user_type == "guest":
                    # 如果是加入的用户离线，删除该用户节点
                    username = V_WS[websocket]['username']
                    V_ROOM[room_name].pop(username)
                    V_WS.pop(websocket)

            print(V_ROOM)
            print(V_WS)
            return


# 服务器端主逻辑
# websocket和path是该函数被回调时自动传过来的，不需要自己传
async def main_logic(websocket, path):
    print("client {} connect!".format(websocket.remote_address[0]))
    await recv_msg(websocket)


print("192.168.50.56:5678 websocket...")
# 把ip换成自己本地的ip
# start_server = websockets.serve(main_logic, '192.168.50.56', 5678)
start_server = websockets.serve(main_logic, '0.0.0.0', 5678)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
