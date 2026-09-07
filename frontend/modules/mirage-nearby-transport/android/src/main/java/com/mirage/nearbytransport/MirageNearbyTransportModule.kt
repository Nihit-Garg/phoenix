package com.mirage.nearbytransport

import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Google Nearby Connections adapter used only for link discovery and byte delivery.
 * Mirage still authenticates and encrypts every application packet above this layer.
 */
class MirageNearbyTransportModule : Module() {
  companion object {
    private const val SERVICE_ID = "com.mirage.emergency.mesh.v1"
    private val STRATEGY = Strategy.P2P_CLUSTER
  }

  private var client: ConnectionsClient? = null
  private var localEndpointName = "Mirage"
  private var advertisingReady = false
  private var discoveryReady = false
  private val peers = ConcurrentHashMap<String, MutableMap<String, Any>>()
  private val pendingConnections = ConcurrentHashMap.newKeySet<String>()
  private val connectedEndpoints = ConcurrentHashMap.newKeySet<String>()
  private val availableEndpoints = ConcurrentHashMap.newKeySet<String>()
  private val retryHandler = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("MirageNearbyTransport")
    Events("onStatus", "onPeer", "onError", "onConnection", "onPacket", "onSendResult")

    OnDestroy { stopNearby(false) }

    Function("isSupported") { isSupported() }
    Function("start") { endpointName: String -> startNearby(endpointName); true }
    Function("stop") { stopNearby(); true }
    Function("connect") { endpointId: String -> requestConnection(endpointId); true }
    Function("disconnect") { endpointId: String -> disconnect(endpointId); true }
    AsyncFunction("getPeers") { promise: Promise -> promise.resolve(peers.values.map { HashMap(it) }) }
    Function("send") { endpointId: String, payload: String, requestId: String -> send(endpointId, payload, requestId); true }
  }

  private val payloadCallback = object : PayloadCallback() {
    override fun onPayloadReceived(endpointId: String, payload: Payload) {
      if (payload.type != Payload.Type.BYTES) return
      val bytes = payload.asBytes() ?: return
      sendEvent("onPacket", mapOf("endpointId" to endpointId, "payload" to String(bytes, Charsets.UTF_8)))
    }

    override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) = Unit
  }

  private val lifecycleCallback = object : ConnectionLifecycleCallback() {
    override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
      recordPeer(endpointId, info.endpointName, "connecting")
      pendingConnections.add(endpointId)
      // The demo has no manual pairing screen. Application packets remain signed and encrypted.
      currentClient()?.acceptConnection(endpointId, payloadCallback)
        ?.addOnFailureListener { error -> connectionFailed(endpointId, "accept connection", error) }
    }

    override fun onConnectionResult(endpointId: String, resolution: ConnectionResolution) {
      pendingConnections.remove(endpointId)
      if (resolution.status.isSuccess) {
        connectedEndpoints.add(endpointId)
        val name = peers[endpointId]?.get("endpointName") as? String ?: "Nearby Mirage device"
        recordPeer(endpointId, name, "connected")
        emitConnectionState()
      } else {
        connectedEndpoints.remove(endpointId)
        updatePeerStatus(endpointId, "disconnected")
        emitConnectionState()
        emitError("Nearby connection failed (${resolution.status.statusCode}). Discovery will continue automatically.")
      }
    }

    override fun onDisconnected(endpointId: String) {
      pendingConnections.remove(endpointId)
      connectedEndpoints.remove(endpointId)
      updatePeerStatus(endpointId, "disconnected")
      emitConnectionState()
      scheduleRetry(endpointId)
    }
  }

  private val discoveryCallback = object : EndpointDiscoveryCallback() {
    override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
      availableEndpoints.add(endpointId)
      recordPeer(endpointId, info.endpointName, "discovered")
      // Both apps advertise and discover. This deterministic election prevents both ends
      // from requesting the same connection at exactly the same time.
      if (localEndpointName < info.endpointName) requestConnection(endpointId)
    }

    override fun onEndpointLost(endpointId: String) {
      availableEndpoints.remove(endpointId)
      if (!connectedEndpoints.contains(endpointId)) updatePeerStatus(endpointId, "disconnected")
    }
  }

  private fun isSupported(): Boolean {
    val context = appContext.reactContext?.applicationContext ?: return false
    return GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS
  }

  private fun startNearby(endpointName: String) {
    val context = appContext.reactContext?.applicationContext
      ?: return emitError("React context is unavailable.")
    if (!isSupported()) return emitError("Google Play services with Nearby Connections is unavailable on this phone.")
    stopNearby(false)
    client = Nearby.getConnectionsClient(context)
    localEndpointName = "${endpointName.take(20)}-${UUID.randomUUID().toString().take(8)}"
    advertisingReady = false
    discoveryReady = false
    sendEvent("onStatus", mapOf("status" to "starting"))

    try {
      currentClient()?.startAdvertising(
        localEndpointName,
        SERVICE_ID,
        lifecycleCallback,
        AdvertisingOptions.Builder().setStrategy(STRATEGY).build()
      )?.addOnSuccessListener {
        advertisingReady = true
        sendEvent("onStatus", mapOf("status" to "advertising"))
        emitReadyIfStarted()
      }?.addOnFailureListener { error -> emitError("Nearby advertising could not start: ${friendlyMessage(error)}") }

      currentClient()?.startDiscovery(
        SERVICE_ID,
        discoveryCallback,
        DiscoveryOptions.Builder().setStrategy(STRATEGY).build()
      )?.addOnSuccessListener {
        discoveryReady = true
        sendEvent("onStatus", mapOf("status" to "discovering"))
        emitReadyIfStarted()
      }?.addOnFailureListener { error -> emitError("Nearby discovery could not start: ${friendlyMessage(error)}") }
    } catch (error: SecurityException) {
      emitError("Nearby permissions were not granted. Allow Nearby devices, Bluetooth and Location permissions.")
    }
  }

  private fun requestConnection(endpointId: String) {
    if (connectedEndpoints.contains(endpointId) || !pendingConnections.add(endpointId)) return
    val name = peers[endpointId]?.get("endpointName") as? String ?: "Nearby Mirage device"
    recordPeer(endpointId, name, "connecting")
    try {
      currentClient()?.requestConnection(localEndpointName, endpointId, lifecycleCallback)
        ?.addOnFailureListener { error -> connectionFailed(endpointId, "request connection", error) }
        ?: connectionFailed(endpointId, "request connection", IllegalStateException("Nearby is not running"))
    } catch (error: SecurityException) {
      connectionFailed(endpointId, "request connection", error)
    }
  }

  private fun disconnect(endpointId: String) {
    currentClient()?.disconnectFromEndpoint(endpointId)
    pendingConnections.remove(endpointId)
    connectedEndpoints.remove(endpointId)
    updatePeerStatus(endpointId, "disconnected")
    emitConnectionState()
  }

  private fun send(endpointId: String, value: String, requestId: String) {
    val connectionsClient = currentClient()
    if (connectionsClient == null || !connectedEndpoints.contains(endpointId)) {
      sendEvent("onSendResult", mapOf("requestId" to requestId, "success" to false, "error" to "Nearby endpoint is not connected."))
      return
    }
    try {
      connectionsClient.sendPayload(endpointId, Payload.fromBytes(value.toByteArray(Charsets.UTF_8)))
        .addOnSuccessListener { sendEvent("onSendResult", mapOf("requestId" to requestId, "success" to true)) }
        .addOnFailureListener { error ->
          sendEvent("onSendResult", mapOf("requestId" to requestId, "success" to false, "error" to "Nearby send failed: ${friendlyMessage(error)}"))
        }
    } catch (error: Exception) {
      sendEvent("onSendResult", mapOf("requestId" to requestId, "success" to false, "error" to "Nearby send failed: ${friendlyMessage(error)}"))
    }
  }

  private fun stopNearby(emitEvents: Boolean = true) {
    try {
      client?.stopAdvertising()
      client?.stopDiscovery()
      client?.stopAllEndpoints()
    } catch (_: Exception) {
      // Cleanup is best-effort during React reloads and Android teardown.
    }
    client = null
    advertisingReady = false
    discoveryReady = false
    pendingConnections.clear()
    connectedEndpoints.clear()
    availableEndpoints.clear()
    retryHandler.removeCallbacksAndMessages(null)
    peers.clear()
    if (emitEvents) {
      sendEvent("onConnection", mapOf("groupFormed" to false))
      sendEvent("onStatus", mapOf("status" to "stopped"))
    }
  }

  private fun currentClient(): ConnectionsClient? = client

  private fun recordPeer(endpointId: String, endpointName: String, status: String) {
    val peer = ConcurrentHashMap<String, Any>().apply {
      put("endpointId", endpointId)
      put("endpointName", endpointName.ifBlank { "Nearby Mirage device" })
      put("status", status)
    }
    peers[endpointId] = peer
    sendEvent("onPeer", HashMap(peer))
  }

  private fun updatePeerStatus(endpointId: String, status: String) {
    val previous = peers[endpointId]
    recordPeer(endpointId, previous?.get("endpointName") as? String ?: "Nearby Mirage device", status)
  }

  private fun emitConnectionState() {
    sendEvent("onConnection", mapOf("groupFormed" to connectedEndpoints.isNotEmpty()))
  }

  private fun emitReadyIfStarted() {
    if (advertisingReady && discoveryReady) sendEvent("onStatus", mapOf("status" to "ready"))
  }

  private fun connectionFailed(endpointId: String, operation: String, error: Exception) {
    pendingConnections.remove(endpointId)
    connectedEndpoints.remove(endpointId)
    updatePeerStatus(endpointId, "disconnected")
    emitConnectionState()
    emitError("Nearby $operation failed: ${friendlyMessage(error)}. Discovery will continue automatically.")
    scheduleRetry(endpointId)
  }

  private fun scheduleRetry(endpointId: String) {
    val remoteName = peers[endpointId]?.get("endpointName") as? String ?: return
    if (!availableEndpoints.contains(endpointId) || localEndpointName >= remoteName) return
    retryHandler.postDelayed({
      if (availableEndpoints.contains(endpointId) && !connectedEndpoints.contains(endpointId)) requestConnection(endpointId)
    }, 3_000)
  }

  private fun friendlyMessage(error: Exception): String = error.message?.takeIf { it.isNotBlank() } ?: error.javaClass.simpleName
  private fun emitError(message: String) { sendEvent("onError", mapOf("message" to message)) }
}
