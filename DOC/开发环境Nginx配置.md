# 开发环境配置
> 20210409
> blog.qzcool.com

本文以Mac系统为例进行开发环境配置

涉及的开发工具：

信令服务端使用python开发，推荐使用PyCharm，网页端开发可以使用Pycharm或者Visual Studio Code。

# 一、Mac系统下Nginx安装

鉴于安装过程中出现的Warning，为避免将来掉坑，运行
```
sudo xcode-select --install

```

先安装homebrew

```
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

安装Nginx

```
brew install nginx
```

启动nginx服务
```
brew services start nginx

```

卸载nginx

```
brew uninstall nginx
```

查看nginx配置文件路径
```
nginx -t

```


## 二、开发环境Nginx配置SSL证书启用HTTPS和Websocket

WebRTC需要https才能运行起来，本地开发时需要配置ssl环境，因此我们需要让本地的Nginx也支持HTTPS协议。下面我们一步一步的来完成Nginx的SSL配置。

### 一、生成私钥(server.key)及crt证书(server.crt)

首先需要创建一个目录来存放SSL证书相关文件

```
$ cd /etc/nginx
$ sudo mkdir ssl
$ cd ssl
```

1. 生成server.key
```
$ openssl genrsa -des3 -out server.key 2048
```
以上命令是基于des3算法生成的rsa私钥，在生成私钥时必须输入至少4位的密码。

2. 生成无密码的server.key
```
$ openssl rsa -in server.key -out server.key
```
3. 生成CA的crt
```
$ openssl req -new -x509 -key server.key -out ca.crt -days 3650 
```
4. 基于ca.crt生成csr
```
$ openssl req -new -key server.key -out server.csr
```
命令的执行过程中依次输入国家、省份、城市、公司、部门及邮箱等信息。

5. 生成crt（已认证）
```
$ openssl x509 -req -days 3650 -in server.csr -CA ca.crt -CAkey server.key -CAcreateserial -out server.crt
```

## 二、配置Nginx并支持HTTPS协议

WebRTC web页面默认存放在

```
/Users/fredliu/Documents/webrtcServer/www
```

支持HTTPS协议的Nginx配置如下所示：

```
http{

    #设置websocket，端口5678
    upstream websocket {
        server 0.0.0.0:5678;
     }

    map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
    }
 server {
        listen       8080;
        server_name  localhost;
        listen       443 ssl;
        ssl_certificate      /etc/nginx/ssl/server.crt;
        ssl_certificate_key  /etc/nginx/ssl/server.key;
        ssl_session_cache    shared:SSL:1m;
        ssl_session_timeout  5m;
        ssl_protocols        SSLv2 SSLv3 TLSv1.2;
        ssl_ciphers          HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers   on;

        location / {
           root /Users/fredliu/Documents/webrtcServer/www; #页面路径
           index  index.html index.htm;
        } 

      location /ws {
        proxy_pass http://websocket; # 代理到上面的websocket地址去
        proxy_http_version 1.1;
        proxy_connect_timeout 4s; #配置点1
        proxy_read_timeout 6000s; #配置点2，如果没效，可以考虑这个时间配置长一点
        proxy_send_timeout 6000s; #配置点3
        proxy_set_header Host $host;
        proxy_set_header X-Real_IP $remote_addr;
        proxy_set_header X-Forwarded-for $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
     }

 }
}

```

测试nginx配置是否有错
```
$ sudo nginx -t
```
如果没有提示错误，重启nginx。

```
$ sudo nginx -s reload
```

至此，我们开发环境能够完美的支持HTTPS和Websocket协议了。
