'use strict'
var fs = require('fs')
var path = require('path')
var supreme = require(path.join(__dirname, "supreme.js"))
var monitor = null;
var profiles = new Set();
var profileIter = profiles.values();
const sleep = async time => new Promise(r => setTimeout(r, time))
var captchaWindow = [];
var freeList=[];
var currProfile=null;

window.$ = window.jQuery = require(path.join(__dirname, "jquery-3.4.1.min.js"));
$().ready(()=>{
  if (fs.existsSync(path.join('tasks.json'))) {
    let tasks = fs.readFileSync(path.join('tasks.json'), 'utf8');
    supreme.tasks = JSON.parse(tasks)
    for (let id in supreme.tasks) {
      let task = supreme.tasks[id]['task']
      let product = supreme.tasks[id]['name'] || task.category+" "+task.size+" "+task.color+" "+task.keywords+" "+task.type
      $("#tasks").append(`<div id=${id} name = "taskLine" class = "task" onclick="selected(this)" ondblclick="supreme.emit('ready', this.id);if (focusTask != this)selected(this)" oncontextmenu="supreme.emit('delete_task', this.id)" ondragstart="getId(event)" draggable="true">
                    <a name = "id">${id}</a><a name="status">IDLE</a><a name = "product">${product}</a></div>
                    </div>`);
    }
  }
  });
  
$.fn.serializeObject = function()  
{  
   var o = {};  
   var a = this.serializeArray();  
   $.each(a, function() {
       if (o[this.name]) {  
           if (!o[this.name].push) {  
               o[this.name] = [o[this.name]];  
           }  
           o[this.name].push(this.value || '');  
       } else {  
           o[this.name] = this.value || '';  
       }  
   });  
   return o;  
}

// Send data and site name to main
function createTask() {
  let task = $("#task_info").serializeObject();
  console.log(task)
  //task['category'] =  $("#Category").text();
  let person = $('#person_info').serializeObject();
  profiles.add(person)
  console.log(person)
  let data = {'task':task, 'person':person};
  let id = (((Date.now()+task.keywords.length+Date.now())%2019)**3)%2021+Object.keys(supreme.tasks).length**2*(task.keywords.length+1)

  console.log(id)
  supreme.tasks[id] = data;
  console.log(supreme.tasks[id])
  // Change UI ----Add a new line for the task
  $("#tasks").append(`<div id=${id} name = "taskLine" class = "task" onclick="selected(this)" ondblclick="supreme.emit('ready', this.id);if (focusTask != this)selected(this)" oncontextmenu="supreme.emit('delete_task', this.id)" draggable="true">
                    <a name = "id">${id}</a><a name="status">IDLE</a><a name = "product">${task.category+" "+task.size+" "+task.color+" "+task.keywords+" "+task.type }</a></div>
                    </div>`);
}

function updateTask() {
  let id = $(".task-clicked").children("[name='id']").text()
  let task = $("#task_info").serializeObject();
  let person = $('#person_info').serializeObject();
  for(let key in supreme.tasks[id]['task']) {
    supreme.tasks[id]['task'][key] = task[key] || supreme.tasks[id]['task'][key];
  }
  for(let key in supreme.tasks[id]['person']) {
    supreme.tasks[id]['person'][key] = person[key] || supreme.tasks[id]['person'][key];
  }
  supreme.tasks[id]['task']["st"] = undefined 
  supreme.tasks[id]['task']["s"] = undefined
  console.log(supreme.tasks[id]['task']);
  console.log(supreme.tasks[id]['person']);
}

function saveTasks() {
  try {
    fs.writeFileSync(path.join('tasks.json'),JSON.stringify(supreme.tasks))
  } catch (err) {
    console.log(err)
  }
  
}

function openCaptchaWindow() {
  let win = new BrowserWindow({
    width: 380,
    height: 500,
    show: true,
    title: 'captcha',
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      partition: captchaWindow.length,
    }
  })
  let captchaWin = {win, 'status':null}
  captchaWindow.push(captchaWin)
  freeList.push(captchaWin)
  win.on('closed', ()=>{
    let postion= captchaWindow.indexOf(captchaWin);
    let index = freeList.indexOf(captchaWin);
    if (postion != -1) {
      captchaWindow.splice(postion ,1)
    }

    if (index != -1) {
      freeList.splice(index, 1)
    }

    if (captchaWin.status != null) {
      supreme.captchaQueue.unshift(captchaWin.status)
    }
    win = null;
    captchaWin = null;
  })
  try {
      win.loadURL("http://www.supremenewyork.com")
  } catch(err) {
      console.log(err)
  }
}
function getId(event) {
    event.dataTransfer.setData("Text",event.target.id);
}
var captchaDispatching = setInterval(async () => {
  if (supreme.captchaQueue.length <1 || freeList.length < 1)
    return
  try {
    let id = supreme.captchaQueue.shift(0)
    let worker =freeList.shift(0)
    worker.status = id
    supreme.emit('status_change', id,"Captcha");
    let token = await worker.win.webContents.executeJavaScript(`challenge();`)
    supreme.setCaptcha(id, token)
    console.log(id + " Tokened " + token)
    worker.status = null
    freeList.push(worker)
  } catch(err) {
    console.log(err)
  }
}, 10);


supreme.on('status_change', (id, status)=>{
  $(`#${id}`).children("[name=status]").text(status);
});

supreme.on('product_change', (id, product)=>{
  $(`#${id}`).children("[name=product]").text(product);
});

supreme.on("delete_task", (id)=>{
  supreme.emit('stop', id)
  delete supreme.tasks[id];
  $(`#${id}`).remove();
  if(focusTask!= null) {
    if (focusTask.id == id)
      clearInfo();
  }
  console.log(id+" DELETED")
});

supreme.on("stop", (id)=>{
  if(captchaWindow.length >0) {
    for (let i=0; i< captchaWindow.length; i++) {
      if (captchaWindow[i].status == id) {
        captchaWindow[i].status = null
        captchaWindow[i].win.reload()
        freeList.push(captchaWindow[i])
      }
    }
  }
  if (supreme.tasks[id]['win'] != undefined) {
    try {
      supreme.tasks[id]['win'].close()
    } catch (err) {
      console.log("window closed")
    }
    supreme.tasks[id]['win']= undefined
  }
  if (supreme.readyQueue.indexOf(id) != -1)
    supreme.readyQueue.splice(supreme.readyQueue.indexOf(id),1);
  if (supreme.addQueue.indexOf(id) != -1)
    supreme.addQueue.splice(supreme.addQueue.indexOf(id),1);
  if (supreme.captchaQueue.indexOf(id) != -1)
    supreme.captchaQueue.splice(supreme.captchaQueue.indexOf(id),1);
  if (supreme.checkoutQueue.indexOf(id) != -1)
    supreme.checkoutQueue.splice(supreme.checkoutQueue.indexOf(id),1);
  supreme.emit('status_change', id,"IDLE");
});

supreme.on("monitor_on", async (delay)=>{
  if (await supreme.stockMonitor() != 200) {
    supreme.emit('monitor_off')
    return
  }
  monitor = setTimeout(()=>{
    supreme.emit("monitor_on", delay)
  }, delay)
  console.log("MO")
})

supreme.on('monitor_off', ()=>{
  clearTimeout(monitor)
  monitor = null
  console.log("MOFF")
})
// Running control
supreme.on("ready", async (id)=>{
  if (captchaWindow.length < 1) {
    openCaptchaWindow()
  }
  let currStatus = $(`#${id}`).children("[name=status]").text();
  if (supreme.tasks[id]['win'] == undefined || supreme.tasks[id]['win'].id == undefined) {
    supreme.tasks[id]['win'] = new BrowserWindow({
      width: 300,
      height: 500,
      show: false,
      title: id,
      webPreferences: {
        webSecurity: false,
        partition: id
      }
    })
  }
  if (supreme.tasks[id]['person'].addr != '') {
    let address = {url: 'https://www.supremenewyork.com', name: "address", value:`${supreme.tasks[id]['person']['first_name']}+${supreme.tasks[id]['person']['last_name']}%7C${supreme.tasks[id]['person']['addr'].replace(/\s/g,'+')}%7C%7C${supreme.tasks[id]['person']['city']}%7C${supreme.tasks[id]['person']['state'].toUpperCase()}%7C${supreme.tasks[id]['person']['zipcode']}%7C${supreme.tasks[id]['person']['country'].toUpperCase()}%7C${encodeURIComponent(supreme.tasks[id]['person']['email'])}%7C${supreme.tasks[id]['person']['phone']}`}
    try {
      await supreme.tasks[id].win.webContents.session.cookies.set(address)
    } catch (e) {
      console.log(e)
    }
  }
  if (currStatus == "IDLE"){
    supreme.readyQueue.push(id)
    console.log(supreme.readyQueue)
    supreme.emit('status_change', id,"READY")
  } else {
    supreme.emit('stop', id)
  }
});