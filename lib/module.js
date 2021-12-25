import path from 'path'
import { writeFileSync, readFileSync, mkdirSync } from 'fs'
import hasha from 'hasha'
import defu from 'defu'
import { getRouteParams, joinUrl } from './utils'

export default function nuxtOneSignal (oneSignalOptions) {
  const hook = () => {
    addOneSignal.call(this, oneSignalOptions)
  }

  if (this.options.mode === 'spa') {
    return hook()
  }

  this.nuxt.hook('build:before', hook)
}

function addOneSignal (oneSignalOptions) {
  const context = this
  const { publicPath } = getRouteParams(context.options)

  // Merge options
  const defaults = {
    OneSignalSDKWorker: undefined,
    cdn: true,
    GcmSenderId: '482941778795',
    init: {
      allowLocalhostAsSecureOrigin: true,
      welcomeNotification: {
        disable: true
      }
    },
    filesPath: '',
    workerFile: 'OneSignalSDKWorker.js',
    updaterFile: 'OneSignalSDKUpdaterWorker.js',
    swParams: {
      scope: '/_push_/onesignal/'
    }
  }

  const options = defu({ ...context.options.oneSignal, ...oneSignalOptions }, defaults)

  if (options.OneSignalSDKWorker === undefined) {
    if (options.cdn) {
      // Use OneSignalSDKWorker.js from CDN
      options.OneSignalSDKWorker = 'https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js'
    } else {
      // Use OneSignalSDKWorker.js from Dist
      const OneSignalSDKWorkerJS = readFileSync(path.resolve(__dirname, '../dist/OneSignalSDKWorker.js'))
      const OneSignalSDKHash = hasha(OneSignalSDKWorkerJS)
      const OneSignalSDKFile = `ons.${OneSignalSDKHash}.js`

      options.OneSignalSDKWorker = joinUrl(publicPath, OneSignalSDKFile)

      this.options.build.plugins.push({
        apply (compiler) {
          compiler.hooks.emit.tap('nuxt-pwa-onesignal', (compilation) => {
            compilation.assets[OneSignalSDKFile] = {
              source: () => OneSignalSDKWorkerJS,
              size: () => OneSignalSDKWorkerJS.length
            }
          })
        }
      })
    }
  }

  // Add the oneSignal SDK script to head
  if (!context.options.head.script.find(s => s.hid === 'onesignal')) {
    context.options.head.script.push({
      async: true,
      src: options.OneSignalSDKWorker,
      hid: 'onesignal'
    })
  }

  // Adjust manifest for oneSignal
  if (!context.options.manifest) {
    context.options.manifest = {}
  }
  context.options.manifest.gcm_sender_id = options.GcmSenderId

  // Provide OneSignalSDKWorker.js and OneSignalSDKUpdaterWorker.js
  const {
    filesPath: workerDir,
    workerFile,
    updaterFile
  } = options

  const staticDir = path.resolve(context.options.srcDir, 'static')

  const writeWorker = (fileName, script) => {
    const workerScript = `importScripts('${script}')\r\n`
    mkdirSync(path.join(staticDir, workerDir), { recursive: true })
    writeFileSync(path.join(staticDir, workerDir, fileName), workerScript, 'utf-8')
  }

  writeWorker(workerFile, options.OneSignalSDKWorker)
  writeWorker(updaterFile, options.OneSignalSDKWorker)

  options.workerPath = path.join(workerDir, workerFile)
  options.updaterPath = path.join(workerDir, updaterFile)

  // Add OneSignal plugin
  context.addPlugin({
    src: path.resolve(__dirname, '../templates/plugin.js'),
    ssr: false,
    fileName: 'onesignal.js',
    options
  })
}
