export default function (ctx, inject) {
  window.$OneSignal = window.OneSignal = window.OneSignal || [];

  OneSignal.push(() => {
    OneSignal.SERVICE_WORKER_PARAM = <%= JSON.stringify(options.swParams) %>
    OneSignal.SERVICE_WORKER_PATH = <%= JSON.stringify(options.workerPath) %>
    OneSignal.SERVICE_WORKER_UPDATER_PATH = <%= JSON.stringify(options.updaterPath) %>
    OneSignal.init(<%= JSON.stringify(options.init, null, 2) %>)
    window.$OneSignal = window.OneSignal;
    inject('OneSignal', window.OneSignal)
  });
}
