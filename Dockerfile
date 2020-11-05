#FROM ubi8/nodejs-12
FROM node:12

WORKDIR /opt/app-root/src

COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

#COPY bin/hubot* /opt/app-root/src/bin/
#COPY scripts/* /opt/app-root/src/scripts/
#COPY scripts/models/* /opt/app-root/src/scripts/models/
#COPY .env /opt/app-root/src/
#COPY package.json /opt/app-root/src/

#RUN cd /opt/app-root/src

#RUN npm install

ENV ROCKETCHAT_URL=192.168.1.164:3000
ENV ROCKETCHAT_USER=mybot
ENV ROCKETCHAT_PASSWORD=mybot
ENV ROCKETCHAT_ROOM=general
ENV ROCKETCHAT_USESSL=false
ENV PLUSPLUS_DATABASE_HOST=mongodb://192.168.1.164:37017/plusplus

CMD /opt/app-root/src/bin/hubot
#CMD npm start