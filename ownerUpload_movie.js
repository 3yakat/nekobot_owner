"use strict";
const express = require("express");
const line = require("@line/bot-sdk");
const PORT = process.env.PORT || 3000;
require("dotenv").config({ debug: true });
const fs = require("fs");
// Azureとの連携用モジュール
const azure = require("azure-storage");

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const blUrl =
  "https://nekobot3raspi8pic.blob.core.windows.net/nekoboto-pic-cont/";
const pic = "/toy1.mov";
let ownerCont = "";
let ownerUrl = "";

const fileName = "toy1.mov";
var filePath = "./" + fileName;

const app = express();
app.get("/", (req, res) => res.send("Hello LINE BOT!(GET)"));
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log(req.body.events);
  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});
const client = new line.Client(config);




//koko
const richmenu = {
  "richMenuId": "richmenu-8deeb69de93cec0080fef4739d144949",
  "size": {
    "width": 2500,
    "height": 843
  },
  "selected": true,
  "name": "OwnerMENU",
  "chatBarText": "OwnerMENU",
  "areas": [
    {
      "bounds": {
        "x": 26,
        "y": 8,
        "width": 2470,
        "height": 408
      },
      "action": {
        "type": "message",
        "text": "UPしたい動画の種類をMENUから選んで動画をあげてください"
      }
    },
    {
      "bounds": {
        "x": 10,
        "y": 432,
        "width": 824,
        "height": 404
      },
      "action": {
        "type": "postback",
        "data": "treat"
      }
    },
    {
      "bounds": {
        "x": 842,
        "y": 432,
        "width": 812,
        "height": 404
      },
      "action": {
        "type": "postback",
        "data": "toys"
      }
    },
    {
      "bounds": {
        "x": 1662,
        "y": 424,
        "width": 820,
        "height": 412
      },
      "action": {
        "type": "message",
        "text": "food"
      }
    }
  ]
};

client.getDefaultRichMenuId()
//koko




async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "image") {
    return Promise.resolve(null);
  }
  
  let mes = event.message.text;
  const ownerid = await getOwnerUrl(event.source.userId);
  const downloadPath = "./toy1.mov";
  let getContent = await downloadContent(event.message.id, downloadPath,ownerid);
  console.log(getContent);

  return client.replyMessage(event.replyToken, [
    {
      type: "text",
      text: `${getContent}として保存しました。`,
    },
  ]);
}

const getOwnerUrl = async (userId) => {
  return new Promise((resolve, reject) => {
    // table 操作
    
    // Azure Storage の接続文字列を環境変数から取得
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (typeof connectionString === "undefined") {
      console.error("AZURE_STORAGE_CONNECTION_STRING is not set");
      process.exit(1);
    }
    // TableService オブジェクトを取得
    const tableService = new azure.TableService(connectionString);
    // table 情報取得
    const query = new azure.TableQuery()
      .where("PartitionKey eq ?", "owner")
      .and("RowKey eq ?", userId) // かつ RowKey が useridである
      .select("Name");
    tableService.queryEntities("users", query, null, function (error, result) {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      const entries = result.entries;
      // NAMEを取得
      ownerCont = entries[0].Name["_"];

      resolve(ownerCont);
    });
  });
};

//ダウンロード関数

function downloadContent(messageId, downloadPath,ownerid) {
  // const ownerid = await getOwnerUrl(event.source.userId);
  // Azure上のBLOBストレージとの接続用サービスオブジェクト
  // 引数にBLOBストレージのConnectionStringを設定
  var blobSvc = azure.createBlobService(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  return client.getMessageContent(messageId).then(
    (stream) =>
      new Promise((resolve, reject) => {
        const writable = fs.createWriteStream(downloadPath);
        stream.pipe(writable);
        stream.on("end", () => resolve(downloadPath));
        //stream.on('error', reject);

        stream.on("close", function () {
          blobSvc.createBlockBlobFromLocalFile( "nekoboto-pic-cont",  ownerid + "/" + fileName, filePath,
            function (error, result, response) {
              if (!error) {
                console.log("アップロード成功");
              } else {
                console.log(error);
              }
            }
          );
        });
      })
  );
}

// app.listen(process.env.PORT || 8080);
// console.log(`Server running at ${PORT}`);

app.listen(PORT);
console.log(`Server running at ${PORT}`);
