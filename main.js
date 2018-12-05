const {app, BrowserWindow, globalShortcut, Menu, Tray, ipcMain} = require('electron')
const url = require('url')
const fs = require('fs')
const path = require('path')
const electron = require('electron')
const {systemPreferences} = require('electron')
const ElectronOnline = require('electron-online')

const connection = new ElectronOnline()

let win = null
var trayIcon = null; //the tray icon

const TRAY_ARROW_HEIGHT = 50;
const WINDOW_WIDTH = 380;
const WINDOW_HEIGHT = 550;
const HORIZ_PADDING = 15;
const VERT_PADDING = 15;

try {
	require('electron-reloader')(module);
} catch (err) {}

function createWindow() {
    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize
    var screenElectron = electron.screen

    if(process.platform === 'darwin') app.dock.hide();

  //Set Electron Window Settings
   win = new BrowserWindow({
       width: WINDOW_WIDTH,
       height: WINDOW_HEIGHT,
       //vibrancy: 'light',
       maximizable: false,
       fullscreenable: false,
       resizable: false,
       show: false,
       transparent: true,
       frame: false,
       title: 'Maple',
			 icon: __dirname +  '/assets/images/logo.icns'
    })

    win.loadURL(url.format({pathname: path.join(__dirname, 'views/dashboard.html'),
        protocol: 'file:',
        slashes: true
      }))


    win.on('show', () => {
        trayIcon.setHighlightMode('always')
        win.webContents.send('win-show' , {msg:'Window is shown'});
    })

    win.on('hide', () => {
        trayIcon.setHighlightMode('never')
        win.webContents.send('win-hide' , {msg:'Window is hidden'});
    })

    win.on('blur', function(){
        //win.hide();
    });

 win.webContents.openDevTools({mode: 'detach'})
 //win.setVibrancyVisibility(show)

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

	ipcMain.on('close-me', (evt, arg) => {
	  app.quit()
	})

  const iconName = 'assets/images/mapleTemplate.png';
  const iconPath = path.join(__dirname, iconName);

  trayIcon = new Tray(iconPath);
  trayIcon.setToolTip('Maple');
  trayIcon.setHighlightMode("selection")

  connection.on('online', () => {
    console.log('App is online!')
    win.webContents.send('app-online' , {msg:'App is online'});
  })

  connection.on('offline', () => {
    console.log('App is offline!')
    win.webContents.send('app-offline' , {msg:'App is offline'});
  })

  //console.log(connection.status)

  /*trayIcon.on('click', (event) => {
    toggleWindow();
  });*/

  trayIcon.on('click', (event) => {
    var screen = electron.screen;
    const cursorPosition = screen.getCursorScreenPoint();
    const primarySize = screen.getPrimaryDisplay().workAreaSize;
    const trayPositionVert = cursorPosition.y >= primarySize.height/2 ? 'bottom' : 'top';
    const trayPositionHoriz = cursorPosition.x >= primarySize.width/2 ? 'right' : 'left';
    win.setPosition(getTrayPosX(),  getTrayPosY() + 10);
    win.isVisible() ? win.hide() : win.show();

    function getTrayPosX() {
      const horizBounds = {
        left:   cursorPosition.x - WINDOW_WIDTH/2,
        right:  cursorPosition.x + WINDOW_WIDTH/2
      }
      if (trayPositionHoriz == 'left') {
        return horizBounds.left <= HORIZ_PADDING ? HORIZ_PADDING : horizBounds.left;
      }
      else {
        return horizBounds.right >= primarySize.width ? primarySize.width - HORIZ_PADDING - WINDOW_WIDTH: horizBounds.right - WINDOW_WIDTH;
      }
    }
    function getTrayPosY() {
      return trayPositionVert == 'bottom' ? cursorPosition.y - WINDOW_HEIGHT - VERT_PADDING : cursorPosition.y + VERT_PADDING;
    }
});
}

const toggleWindow = () => {
    if (win.isVisible()) {
      win.hide()
    } else {
      showWindow()
    }
}

const showWindow = () => {
    const trayPos = trayIcon.getBounds()
    const windowPos = win.getBounds()
    let x, y = 0
    if (process.platform == 'darwin') {
      x = Math.round(trayPos.x + (trayPos.width / 2) - (windowPos.width / 2))
      y = Math.round(trayPos.y + trayPos.height)
    } else {
      x = Math.round(trayPos.x + (trayPos.width / 2) - (windowPos.width / 2))
      y = Math.round(trayPos.y + trayPos.height * 10)
    }


    win.setPosition(x, y, false)
    win.show()
    win.focus()
  }

app.commandLine.appendSwitch('--enable-touch-events')

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (win === null) {
        createWindow()
    }
})
