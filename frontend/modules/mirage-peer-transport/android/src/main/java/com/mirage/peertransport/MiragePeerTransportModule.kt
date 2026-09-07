package com.mirage.peertransport

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pDevice
import android.net.wifi.p2p.WifiP2pManager
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.util.concurrent.Executors
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MiragePeerTransportModule : Module() {
  private var manager: WifiP2pManager? = null
  private var channel: WifiP2pManager.Channel? = null
  private var receiver: BroadcastReceiver? = null
  private var receiverContext: Context? = null
  private var udpSocket: DatagramSocket? = null
  private val udpExecutor = Executors.newSingleThreadExecutor()

  override fun definition() = ModuleDefinition {
    Name("MiragePeerTransport")
    Events("onStatus", "onPeer", "onError", "onConnection", "onPacket")

    OnCreate { initialize() }
    OnDestroy { cleanup() }

    Function("isSupported") { manager != null && channel != null }
    Function("startDiscovery") { discoverPeers(); true }
    Function("stopDiscovery") { stopDiscovery(); true }
    Function("connect") { deviceAddress: String -> connect(deviceAddress); true }
    Function("disconnect") { disconnect(); true }
    AsyncFunction("getPeers") { promise: Promise -> requestPeers(promise) }
    Function("startUdp") { port: Int -> startUdp(port); true }
    Function("stopUdp") { stopUdp(); true }
    Function("sendUdp") { host: String, port: Int, payload: String -> sendUdp(host, port, payload); true }
  }

  private fun initialize() {
    val context = appContext.reactContext?.applicationContext ?: return emitError("React context is unavailable.")
    manager = context.getSystemService(Context.WIFI_P2P_SERVICE) as? WifiP2pManager
    if (manager == null) return emitError("Wi-Fi Direct is not supported on this device.")
    channel = manager?.initialize(context, context.mainLooper) { emitError("Wi-Fi Direct channel disconnected.") }
    receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
          WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION -> sendEvent("onStatus", mapOf("status" to if (intent.getIntExtra(WifiP2pManager.EXTRA_WIFI_STATE, -1) == WifiP2pManager.WIFI_P2P_STATE_ENABLED) "ready" else "disabled"))
          WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION -> requestPeers(null)
          WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION -> requestConnectionInfo()
        }
      }
    }
    receiverContext = context
    val filter = IntentFilter().apply {
      addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION)
      addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION)
      addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION)
      addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION)
    }
    context.registerReceiver(receiver, filter)
    sendEvent("onStatus", mapOf("status" to "initialized"))
  }

  private fun discoverPeers() { withManager("discover peers") { manager, channel -> manager.discoverPeers(channel, action("discover peers")) } }
  private fun stopDiscovery() { withManager("stop discovery") { manager, channel -> manager.stopPeerDiscovery(channel, action("stop discovery")) } }
  private fun connect(deviceAddress: String) { withManager("connect") { manager, channel -> manager.connect(channel, WifiP2pConfig().apply { this.deviceAddress = deviceAddress }, action("connect")) } }
  private fun disconnect() { withManager("disconnect") { manager, channel -> manager.removeGroup(channel, action("disconnect")) } }
  private fun requestConnectionInfo() { withManager("read connection information") { manager, channel -> manager.requestConnectionInfo(channel) { info -> sendEvent("onConnection", mapOf("groupOwnerAddress" to info.groupOwnerAddress?.hostAddress, "isGroupOwner" to info.isGroupOwner)); sendEvent("onStatus", mapOf("status" to if (info.groupFormed) "connected" else "disconnected")) } } }

  private fun startUdp(port: Int) {
    if (udpSocket != null) return
    try {
      udpSocket = DatagramSocket(null).apply { reuseAddress = true; bind(InetSocketAddress(port)) }
      udpExecutor.execute { receiveUdpPackets() }
      sendEvent("onStatus", mapOf("status" to "udp-ready"))
    } catch (error: Exception) { emitError("UDP socket could not bind to port $port: ${error.message}") }
  }
  private fun stopUdp() { udpSocket?.close(); udpSocket = null }
  private fun receiveUdpPackets() {
    val buffer = ByteArray(65_507)
    while (true) {
      val socket = udpSocket ?: return
      try { val packet = DatagramPacket(buffer, buffer.size); socket.receive(packet); sendEvent("onPacket", mapOf("host" to packet.address.hostAddress, "port" to packet.port, "payload" to String(packet.data, packet.offset, packet.length, Charsets.UTF_8))) }
      catch (error: Exception) { if (!socket.isClosed) emitError("UDP receive failed: ${error.message}"); return }
    }
  }
  private fun sendUdp(host: String, port: Int, payload: String) {
    val socket = udpSocket ?: return emitError("UDP socket is not running.")
    udpExecutor.execute { try { val bytes = payload.toByteArray(Charsets.UTF_8); socket.send(DatagramPacket(bytes, bytes.size, InetAddress.getByName(host), port)) } catch (error: Exception) { emitError("UDP send failed: ${error.message}") } }
  }

  private fun requestPeers(promise: Promise?) {
    withManager("read peers") { manager, channel -> manager.requestPeers(channel) { peers ->
      val result = peers.deviceList.map { device -> peerMap(device) }
      result.forEach { peer -> sendEvent("onPeer", peer) }
      promise?.resolve(result)
    } }
  }

  private fun withManager(operation: String, block: (WifiP2pManager, WifiP2pManager.Channel) -> Unit) {
    val currentManager = manager; val currentChannel = channel
    if (currentManager == null || currentChannel == null) { emitError("Cannot $operation: Wi-Fi Direct is unavailable."); return }
    try { block(currentManager, currentChannel) } catch (error: SecurityException) { emitError("Cannot $operation: nearby Wi-Fi permission was not granted.") }
  }
  private fun action(operation: String) = object : WifiP2pManager.ActionListener {
    override fun onSuccess() { sendEvent("onStatus", mapOf("status" to "$operation-started")) }
    override fun onFailure(reason: Int) { emitError("Wi-Fi Direct $operation failed ($reason).") }
  }
  private fun peerMap(device: WifiP2pDevice) = mapOf("deviceAddress" to device.deviceAddress, "deviceName" to (device.deviceName ?: "Nearby device"), "status" to "discovered")
  private fun emitError(message: String) { sendEvent("onError", mapOf("message" to message)) }
  private fun cleanup() { stopUdp(); udpExecutor.shutdownNow(); receiver?.let { receiverContext?.unregisterReceiver(it) }; receiver = null; receiverContext = null; channel = null; manager = null }
}
