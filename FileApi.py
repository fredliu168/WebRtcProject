from flask import Flask,jsonify,request
# from flask_restful import request, Api
import os
import time

api = Flask(__name__)
api.config['MAX_CONTENT_LENGTH'] = 10240000


@api.route('/h', methods=('GET',))
def get():
        # print(time.strftime("%Y%m%d_%H%M%S", time.localtime()) )
        fileName = "{}.webm".format(time.strftime("%Y%m%d_%H%M%S", time.localtime()))
        print(fileName)
        videoPath = "{}/video".format(os.getcwd())
        print(videoPath)
        return {'hello': 'world'}


@api.route('/video', methods=('POST',))
def post():
        print("save vide")
        filename = "{}.webm".format(time.strftime("%Y%m%d_%H%M%S", time.localtime()))
        videopath = "{}/video/{}".format(os.getcwd(), filename)
        with open(videopath, "wb") as vid:
            #video_stream = request.FILES['blob'].read()
            #vid.write(video_stream)
            vid.write(request.data)

            return {'messsage': 'success'}


if __name__ == '__main__':
    api.run(debug=True, port=5001)
