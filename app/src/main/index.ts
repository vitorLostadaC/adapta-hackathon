import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, desktopCapturer, ipcMain, screen, session, shell } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  const { width } = screen.getPrimaryDisplay().workAreaSize

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 500,
    height: 80,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    hasShadow: false,
    y: 80,
    transparent: true,
    x: Math.floor(width / 2) - 250,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  ipcMain.on('resize-window', (_event, width, height) => {
    mainWindow.setContentSize(width, height)
  })

  ipcMain.on('decrease-height', () => {
    if (mainWindow) {
      const [width, height] = mainWindow.getContentSize()
      const newHeight = height - 82
      mainWindow.setContentSize(width, newHeight)
    }
  })

  ipcMain.handle('increase-height', (_event, height: number) => {
    if (mainWindow) {
      const [width, currentHeight] = mainWindow.getContentSize()
      // Electron expects integers for width & height. Round to the nearest px.
      const newHeight = Math.round(currentHeight + height)
      mainWindow.setContentSize(width, newHeight)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Allow renderer to request display-media that includes loopback (system) audio.
  // On Windows and macOS ≥ 13 this lets us capture the computer’s audio without extra drivers.
  // We pick the first screen; adapt if you need multi-monitor selection.
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    if (sources.length === 0) {
      callback({})
      return
    }

    callback({ video: sources[0], audio: 'loopback' }) // capture system output
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
