'use strict';

const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();
const PORT = process.env.PORT || 3000;

const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESSTOKEN
};

const app = express();
app.get('/', (req, res) => res.send('Hello LINE BOT!'));
app.post('/webhook', line.middleware(config), (req, res) => {
  console.log(req.body.events);
  // 接続確認用
  if (req.body.events[0].replyToken === '00000000000000000000000000000000' && req.body.events[1].replyToken === 'ffffffffffffffffffffffffffffffff') {
    res.send('Hello LINE BOT!(POST)');
    console.log('疎通確認用');
    return;
  }
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result));
});

const client = new line.Client(config);

async function handleEvent(event) {
  let mes = '';
  console.log('---')
  console.log(event);
  if (event.type !== 'things') {
    return Promise.resolve(null);
  }

  if (event.type === 'things' && event.things.type === 'link') {
    mes = 'デバイスと接続しました。';
  } else if (event.type === 'things' && event.things.type === 'unlink') {
    mes = 'デバイスとの接続を解除しました。';
  } else {
    const thingsData = event.things.result;
    if (!thingsData.bleNotificationPayload) return
    // bleNotificationPayloadにデータが来る
    const blePayload = thingsData.bleNotificationPayload;
    const buffer = new Buffer.from(blePayload, 'base64');
    const data = buffer.toString('ascii');  //Base64をデコード
    console.log("Payload=" + data);
    mes = data === '0' ? 'サビに入りました' : `コードが変わりました: ${data}`
    const msgObj = {
      type: 'text',
      text: mes //実際に返信の言葉を入れる箇所
    }

    return client.replyMessage(event.replyToken, msgObj);
  }
}
(process.env.NOW_REGION) ? module.exports = app : app.listen(PORT);
console.log(`Server running at ${PORT}`);