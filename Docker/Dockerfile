FROM ubi8/nodejs-12

RUN mkdir rpp && cd rpp

ADD "." .

RUN npm install

RUN source .env
CMD ./bin/hubot