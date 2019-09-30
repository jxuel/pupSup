'use strict'

const {app, BrowserWindow, ipcMain, protocol,net} = require('electron')
var path = require('path')
var fs = require('fs')
let mainWindow;

global.rootDir = __dirname;

function mainMenu(){
    mainWindow = new BrowserWindow({
        title: "main",
        width: 1000,
        height: 700,
        show: false,
        frame: false,
        resizable: false,
        webPreferences: {
            //devTools: false,
            allowRunningInsecureContent: true,
            nodeIntegration: true,
        }
    });
    mainWindow.loadURL(`file://${path.join(__dirname,"index.html")}`)
    mainWindow.on('close', ()=>{
        mainWindow.webContents.session.clearStorageData()
        app.quit()
    })
    mainWindow.on('ready-to-show', ()=>{
      mainWindow.show();
      mainWindow.focus(); 
    })
}

app.on('ready', ()=>{
    mainMenu();
    protocol.interceptBufferProtocol('http', (req, callback) => {
      const request = net.request(req)
      fs.readFile(`${path.join(__dirname,'captchaSolver.html')}`, 'utf8', function(err, html){
        callback({mimeType: 'text/html', data: Buffer.from(html)});
        if (req.uploadData) {
          req.uploadData.forEach(part => {
            if (part.bytes) {
              request.write(part.bytes);
            } else if (part.file) {
              request.write(readFileSync(part.file));
            }
          })
        }
        request.end()
      });
    });
});