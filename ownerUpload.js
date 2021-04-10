"use strict";
const express = require("express");
const line = require("@line/bot-sdk");
const PORT = process.env.PORT || 8080;
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
const pic = "/ieneko.jpg";
let ownerCont = "";
let ownerUrl = "";

const app = express();
app.get("/", (req, res) => res.send("Hello LINE BOT!(GET)"));
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log(req.body.events);
  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});
const client = new line.Client(config);
let uploadpath = {};
let fileName = "upload.jpg";
var filePath = "./" + fileName;
async function handleEvent(event) {
  console.log("event" , event);
//動画の種類ごとに保存
  if (event.type === "postback") {
    if (event.postback.data === "toys" || event.postback.data === "treat" || event.postback.data === "food" ) {
      //console.log("2",event.postback.data);
      uploadpath[event.source.userId] = event.postback.data;
      return client.replyMessage(event.replyToken, {
        type: "text", text: event.postback.data + "ですね！動画をUPしてください"
      });
    }
    // return;
  } else if(event.type === "message" && event.message.type === "video"){
    const ownerid = await getOwnerUrl(event.source.userId);
    const downloadPath = "./" + uploadpath[event.source.userId] + ".mp4";
  
    let getContent = await downloadContent(event.message.id, downloadPath,ownerid);
    console.log("koko" + getContent);
  
    return client.replyMessage(event.replyToken, [
      {
        type: "text",
        text: `${getContent}として保存しました。`,
      },
    ]);

  } else if(event.type === "message" && event.message.type === "image"){
    const ownerid = await getOwnerUrl(event.source.userId);
    const downloadPath = "./" + fileName;
  
    let getContent = await downloadContent(event.message.id, downloadPath,ownerid);
    console.log("koko" + getContent);
  
    return client.replyMessage(event.replyToken, [
      {
        type: "text",
        text: `${getContent}として保存しました。`,
      },
    ]);

  }
  else{
    return Promise.resolve(null); 
  }

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

function downloadContent(messageId, downloadPath, ownerid) {
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
          blobSvc.createBlockBlobFromLocalFile(
            "nekoboto-pic-cont",
            ownerid + "/" + downloadPath,
            downloadPath,
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

app.listen(PORT);
console.log(`Server running at ${PORT}`);
