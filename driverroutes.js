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

// configure browser options ...
console.log(COOKIE);
console.log(WEBDRIVERMODE);
var driver;

if (BROWSER === "firefox") driver = new Builder().forBrowser("firefox").build();
else {
  var service = new edge.ServiceBuilder().setPort(55555).build();
  var options = new edge.Options();
  driver = edge.Driver.createSession(options, service);
}

await driver.get("https://poe.com");
await driver.manage().addCookie({ name: "p-b", value: COOKIE });
await driver.get("https://poe.com/chatgpt");

async function test(req, res) {
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

async function convertPOEtoOAI(messages, maxtoken) {
  console.log(`before split = ${messages}`);
  let messageout = messages;
  if (messages.includes(":")) messageout = messages.split(":").splice(1);
  console.log(`after split = ${messageout}`);
  let newresponse = {
    id: "999999",
    object: "chat.completion",
    created: Date.now(),
    model: "gpt-3.5-turbo-0613",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: messageout,
        },
        finish_reason: "length",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: maxtoken,
      total_tokens: maxtoken,
    },
  };
  console.log(`messageout : ${messageout}`);
  console.log(`newres : ${newresponse}`);
  return newresponse;
}

async function convertOAItoPOE(messages) {
  console.log("oaitopoe");
  let charname = "";
  let newprompt = "";
  let systemsplit = messages[0].content.split(".");
  const actions = driver.actions

  let textfield = driver
  .findElement(
    By.xpath(
      `//*[@id="__next"]/div[1]/div/section/div[2]/div/div/footer/div/div/div[1]/textarea`
    )
  )
  console.log("searching for charname");
  for (let sentence in systemsplit) {
    if (systemsplit[sentence].includes("{{char}}'s name: ")) {
      charname = systemsplit[sentence].substring(
        17,
        systemsplit[sentence].length
      );
      break;
    }
  }
  console.log(`charname = ${charname}`);
  for (let i in messages) {
    if (messages[i].role === "system") {
      let contentsplit = messages[i].content.split('\n')
      for(let j in contentsplit){
        await textfield.sendKeys(contentsplit[j]);
        await textfield.sendKeys(Key.chord(Key.SHIFT, Key.ENTER));
      }
      await textfield.sendKeys("[Unless otherwise stated by {{user}}, your next response shall only be written from the point of view of {{char}} without needed to state who is a speaker. Do not seek approval of your writing style at the end of the response. and Never reply with a full stop.")
      await textfield.sendKeys(Key.chord(Key.SHIFT, Key.ENTER));
      await textfield.sendKeys(`If you accept the requirements, please confirm this by replying with "Understood.", and nothing more. Upon receiving your accurate confirmation message, I will specify the context of the scene and {{char}}'s characteristics, background, and personality in the next message.`);
      await textfield.sendKeys(Key.ENTER)
      await driver.sleep(3000)
    }
    if (messages[i].role === "assistant") {
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
  await driver.sleep(JBWAITING * 1000)
  let splitedprompt = newprompt.split("\n")
  for(let j in splitedprompt){
    await textfield.sendKeys(splitedprompt[j])
    await textfield.sendKeys(Key.chord(Key.SHIFT, Key.ENTER));
  }
  await textfield.sendKeys(Key.ENTER)
  console.log(`newprompt = ${newprompt}`);
  console.log("sending content");
  await driver.sleep(RESULTWAITING * 1000)
  return newprompt;
}

async function sagedriverCompletion(req, res) {
  let maxtoken = req.body.max_tokens;
  // console.log(req.body.messages)
  driver
    .findElement(By.className("ChatMessageInputFooter_chatBreakButton__hqJ3v"))
    .click();
  await convertOAItoPOE(req.body.messages);
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
    lastmsg = lastmsg.replaceAll('<code node="[object Object]">','')
    lastmsg = lastmsg.replaceAll('</code>','')

    console.log(lastmsg)
    let newres = await convertPOEtoOAI(lastmsg, maxtoken);
    res.send(newres)
}

export { sagedriverCompletion, test };
