import edge from "selenium-webdriver/edge.js";
import firefox from "selenium-webdriver/firefox.js";
import { Builder, Key,By } from "selenium-webdriver"; 
import htmlparser from "node-html-parser";
import {
  WEBDRIVERMODE,
  JBWAITING,
  RESULTWAITING,
  COOKIE,
  BROWSER,
} from "./config.js";
let charname = "";
// configure browser options ...
console.log(COOKIE);
console.log(WEBDRIVERMODE);
var driver;

if(WEBDRIVERMODE == true){

if (BROWSER === "firefox") driver = new Builder().forBrowser("firefox").build();
else if (BROWSER === 'chrome') driver = new Builder().forBrowser("chrome").build();
else {
  var service = new edge.ServiceBuilder().setPort(55555).build();
  var options = new edge.Options();
  driver = edge.Driver.createSession(options, service);
}

  await driver.get("https://poe.com");
await driver.manage().addCookie({ name: "p-b", value: COOKIE });
await driver.get("https://poe.com/chatgpt");
}

async function test(req, res) {
    if(req.body.reverse_proxy) return res.send(true)
    let lastmsg = ''
    let src, newsrc = ''
    while(true){
      newsrc = await driver.getPageSource();
      if(src === newsrc){
        break
      }
      else
      src = newsrc
      driver.sleep(1000)
    }
    let root = htmlparser.parse(src);
    let out = root.querySelectorAll(".Markdown_markdownContainer__UyYrv");
    let lastbubble = out[out.length - 1].querySelectorAll('p')
    for(let k in lastbubble){
      lastmsg += lastbubble[k]
      lastmsg += '\n'
    }
    lastmsg = lastmsg.replaceAll("<em>", '*')
    lastmsg = lastmsg.replaceAll("</em>", '*')
    lastmsg = lastmsg.replaceAll("<p>", '')
    lastmsg = lastmsg.replaceAll("</p>", '')
    lastmsg = lastmsg.replaceAll('<a node="[object Object]" class="MarkdownLink_linkifiedLink__KxC9G">', '')
    lastmsg = lastmsg.replaceAll("</a>", '')

    console.log(lastmsg)
    res.send(lastmsg)
}

async function convertPOEtoOAI(messages) {
  console.log(`before split = ${messages}`);
  let messageout = messages;
  if (messages.includes(":")) messageout = messages.split(":").splice(1);
  console.log(`after split = ${messageout}`);
  let newresponse = {
    "id": "chatcmpl-7ep1aerr8frmSjQSfrNnv69uVY0xM",
    "object": "chat.completion",
    "created": Date.now(),
    "model": "gpt-3.5-turbo-0613",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": `${charname}: ${messageout}`
        },
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 724,
      "completion_tokens": 75,
      "total_tokens": 799
    }
  }
  console.log(`messageout : ${messageout}`);
  console.log(`newres : ${newresponse}`);
  return newresponse;
}

async function convertOAIToPoe(messages) {
  console.log("oai to poe");

  let newprompt = "";
  let systemsplit = messages[0].content.split("'s");
  
  let textfield = driver
  .findElement(
    By.xpath(
      `//*[@id="__next"]/div[1]/div/section/div[2]/div/div/footer/div/div/div[1]/textarea`
    )
  )
  console.log("searching for charname");
  for (let sentence in systemsplit) {
    if (systemsplit[sentence].includes("Write ")) {
      charname = systemsplit[sentence].substring(
        6,
        systemsplit[sentence].length
      );
      break;
    }
  }
  let systemmsgs = ''
  console.log(`charname = ${charname}`);
  let aftersystem = false
  for (let i in messages) {
    console.log(messages[i])
    if (messages[i].role === "system") {
      if(aftersystem){
        newprompt += messages[i].content
      } else {
        if(messages[i].name === 'example_user')
        systemmsgs += `Your example message : ${messages[i].content} \n`
        else if(messages[i].name === 'example_assistant')
        systemmsgs += `${charname}'s example message : ${messages[i].content} \n`
        else
        systemmsgs += `${messages[i].content}\n`
      }

    }
    if (messages[i].role === "assistant") {
      aftersystem = true
      newprompt += `${charname}: `;
      newprompt += messages[i].content;
      newprompt += "\n";
    }
    if (messages[i].role === "user") {
      newprompt += "You: ";
      newprompt += messages[i].content;
      newprompt += "\n";
    }
  }
  console.log('message dump done')
  let contentsplit = systemmsgs.split('\n')
  for(let j in contentsplit){
    await textfield.sendKeys(contentsplit[j]);
    await textfield.sendKeys(Key.chord(Key.SHIFT, Key.ENTER));
  }
  await textfield.sendKeys("[Unless otherwise stated by {{user}}, your next response shall only be written from the point of view of {{char}} without needed to state who is a speaker. Do not seek approval of your writing style at the end of the response. and Never reply with a full stop.")
  await textfield.sendKeys(Key.chord(Key.SHIFT, Key.ENTER));
  await textfield.sendKeys(`If you accept the requirements, please confirm this by replying with "Understood.", and nothing more. Upon receiving your accurate confirmation message, I will specify the context of the scene and {{char}}'s characteristics, background, and personality in the next message.`);
  await textfield.sendKeys(Key.ENTER)
  await driver.sleep(JBWAITING * 1000)
  console.log('send system message done')

  let splitedprompt = newprompt.split("\n")
  for(let j in splitedprompt){
    await textfield.sendKeys(splitedprompt[j])
    await textfield.sendKeys(Key.chord(Key.SHIFT, Key.ENTER));
  }
  await textfield.sendKeys(Key.ENTER)
  console.log("sending content");
  await driver.sleep(RESULTWAITING * 1000)
  return newprompt;
}

async function sagedriverCompletion(req, res) {
  let maxtoken = req.body.max_tokens;
  driver
    .findElement(By.className("ChatMessageInputFooter_chatBreakButton__hqJ3v"))
    .click();
  await convertOAIToPoe(req.body.messages);
    let lastmsg = ''
    let src, newsrc = ''
    while(true){
      await driver.sleep(2000)
      newsrc = await driver.getPageSource();
      if(src === newsrc){
        break
      }
      else
      src = newsrc
    }
    let root = htmlparser.parse(src);
    let out = root.querySelectorAll(".Markdown_markdownContainer__UyYrv");
    let lastbubble = out[out.length - 1].querySelectorAll('p')
    for(let k in lastbubble){
      lastmsg += lastbubble[k]
      lastmsg += '\n'
    }
    lastmsg = lastmsg.replaceAll("<em>", '*')
    lastmsg = lastmsg.replaceAll("</em>", '*')
    lastmsg = lastmsg.replaceAll("<br>", '')
    lastmsg = lastmsg.replaceAll("<p>", '')
    lastmsg = lastmsg.replaceAll("</p>", '')
    lastmsg = lastmsg.replaceAll('<a node="[object Object]" class="MarkdownLink_linkifiedLink__KxC9G">', '')
    lastmsg = lastmsg.replaceAll("</a>", '')
    lastmsg = lastmsg.replaceAll('<code node="[object Object]">','')
    lastmsg = lastmsg.replaceAll('</code>','')

    console.log(lastmsg)
    let newres = await convertPOEtoOAI(lastmsg, maxtoken);
    if(typeof newres == 'object')
      newres = JSON.parse(JSON.stringify(newres))
    console.log(newres)
    res.status(200).json(newres)
}

export { sagedriverCompletion, test };
