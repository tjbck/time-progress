
const { app, protocol, ipcMain, BrowserWindow, Tray, Menu } = require('electron')
const path = require('path');
const isDev = require('electron-is-dev');
const axios = require('axios');


const exeName = path.basename(process.execPath);
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

let mainWindow;
let alwaysOnTop = false;


function launchAtStartup() {
  if (process.platform === "darwin") {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true
    });
  } else {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      args: [
        "--processStart",
        `"${exeName}"`,
        "--process-start-args",
        `"--hidden"`
      ]
    });
  }
}

let tray;
const createTray = () => {
  tray = new Tray(path.join(__dirname, '../public/favicon.png'))

  tray.on('right-click', () => {
    console.log('right-click')
  })

  tray.on('double-click', toggleWindow)

  tray.on('click', () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Widget',
        click: () => {
          showWindow()
        },
      },

      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true
          app.quit()
        },
      },
    ])
    tray.setContextMenu(contextMenu)
    console.log('click')
  })

  tray.on('mouse-move', () => {
    tray.setToolTip(`Time Progress\n${new Date().toLocaleString()}`)
  })

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Widget',
      click: () => {
        showWindow()
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip(`Time Progress Widget`)

  tray.on('click', function (event) {
    toggleWindow()
  })
}


const toggleWindow = () => {
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    showWindow()
  }
}

const toggleAlwaysOnTop = () => {
  alwaysOnTop = !alwaysOnTop
  mainWindow.setAlwaysOnTop(alwaysOnTop, 'screen');
}


const showWindow = () => {
  // const position = getWindowPosition()
  // win.setPosition(position.x, position.y, false)
  mainWindow.show()
  mainWindow.focus()
}

// Live Reload
require('electron-reload')(__dirname, {
  electron: path.join(__dirname, '../node_modules', '.bin', 'electron'),
  awaitWriteFinish: true
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {

  if (!isDev) {
    launchAtStartup()
  }

  createTray()

  // Create the browser window.
  mainWindow = new BrowserWindow({
    icon: 'public/favicon.png',
    width: 250,
    height: 250,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: __dirname + '/preload.js'
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));

  // Open the DevTools.

  if (isDev) mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.


ipcMain.on("toggle-window", function () {
  console.log("electron:toggle-window")
  toggleWindow()
});


ipcMain.on("always-on-top", function () {
  console.log("electron:always-on-top")
  toggleAlwaysOnTop()
});

ipcMain.on("get-location-ip", async function (event) {
  const res = await axios.get('https://ipapi.co/json');
  console.log(res)
  event.returnValue = res.data
});

ipcMain.on("get-location", async function (event, arg) {
  const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${arg}&format=json`);
  console.log(res)
  event.returnValue = res.data
});
