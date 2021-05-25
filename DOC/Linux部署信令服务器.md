
#Linux(Ubuntu18.10)服务器信令部署

>20210408

>blog.qzcool.com

>Ubuntu18.10下测试通过(查看服务器版本 cat /etc/lsb-release)

服务端：
https://104.207.157.189/monitor/

客户端：
https://104.207.157.189/local/

Linux下设置python脚本文件为服务

python脚本开机自动运行；适用于使用systemd的Linux系统，现在流行的Linux发行版都使用systemd。

后台服务程序是随系统自启动的，我们只要把Python脚本配置为服务就行了。需要注意的一点是你Python脚本的启动时机，它依赖不依赖其他服务（网络连接、一些分区的挂载等等）。

#1 Python脚本

上传Python脚本到以下目录 
```
/home/webrtc_demo/Server.py
```

> sftp上传工具推荐使用开源免费的[Cyberduck](https://cyberduck.io)

#2 创建Unit配置文件

```
$ sudo vim /lib/systemd/system/signalling.service
```
写入如下内容：

```
[Unit]
Description=Webrtc signalling Service
After=multi-user.target
 
[Service]
Type=idle
ExecStart=/usr/bin/python /home/webrtc_demo/Server.py
 
[Install]
WantedBy=multi-user.target

```

上面定义了一个叫 Webrtc signalling Service 的服务，它在multi-user环境起来之后运行；ExecStart参数指定我们要运行的程序；idle确保脚本在其他东西加载完成之后运行，它的默认值是simple。

注意使用绝对路径。

为了获得脚本的输出信息，我们可以重定向到文件：

```

ExecStart=/usr/bin/python /home/webrtc_demo/Server.py > /home/snail/Server.log 2>&1
```

更改配置文件的权限：

```
$ sudo chmod 644 /lib/systemd/system/signalling.service
```

#3 使配置文件生效

```
$ sudo systemctl daemon-reload
$ sudo systemctl enable signalling.service
```

#4 启动服务

```
systemctl start signalling.service
```
#5 查看服务状态

```
$ sudo systemctl status signalling.service
```
#6 服务操作命令

systemctl命令是系统服务管理器指令，它实际上将 service 和 chkconfig 这两个命令组合到一起。

```
systemctl enable signalling.service # 使服务自动启动
 
systemctl disable signalling.service # 使服务不自动启动

# 检查服务状态 
systemctl status signalling.service （服务详细信息） systemctl is-active signalling.service （仅显示是否 Active)

# 显示所有已启动的服务
systemctl list-units --type=service

# 启动服务
systemctl start signalling.service

# 停止服务
systemctl stop signalling.service

# 重启服务
systemctl restart signalling.service

```
