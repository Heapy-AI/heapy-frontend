package com.heapy.app

import android.app.NotificationManager
import android.content.Context
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import java.time.Instant
import java.util.UUID

/** 앱 설치 식별자와 푸시 수신 세션을 네이티브에 연결한다. @author 김진우 */
class PushModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "HeapyPush"
    private val prefs get() = context.getSharedPreferences("heapy_push", Context.MODE_PRIVATE)
    @ReactMethod fun session(userId: String, expiresAt: String, promise: Promise) {
        val previous = prefs.getString("userId", "")
        if (previous != userId) context.getSystemService(NotificationManager::class.java).cancelAll()
        prefs.edit().putString("userId", userId)
            .putLong("expiresAt", runCatching { Instant.parse(expiresAt).toEpochMilli() }.getOrDefault(0)).commit()
        promise.resolve(null)
    }
    @ReactMethod fun registration(promise: Promise) {
        val manager = context.getSystemService(NotificationManager::class.java)
        HeapyMessagingService.channel(manager)
        if (FirebaseApp.getApps(context).isEmpty()) { promise.reject("PUSH_NOT_CONFIGURED", "푸시 설정이 아직 준비되지 않았어요."); return }
        if (!manager.areNotificationsEnabled() || manager.getNotificationChannel(HeapyMessagingService.CHANNEL)?.importance == NotificationManager.IMPORTANCE_NONE) {
            promise.reject("PUSH_PERMISSION", "설정에서 복약 알림을 허용해 주세요."); return
        }
        var device = prefs.getString("deviceIdentifier", null)
        if (device == null) { device = UUID.randomUUID().toString(); prefs.edit().putString("deviceIdentifier", device).commit() }
        val identifier = device
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) promise.reject("PUSH_TOKEN", "알림 연결에 실패했어요. 다시 시도해 주세요.")
            else promise.resolve(Arguments.createMap().apply { putString("deviceIdentifier", identifier); putString("pushToken", task.result); putString("platform", "android") })
        }
    }
    @ReactMethod fun acknowledge(id: String, promise: Promise) {
        val intent = context.currentActivity?.intent
        if (intent?.getStringExtra("heapyNotificationId") == id) intent.removeExtra("heapyNotificationId")
        promise.resolve(null)
    }
    @ReactMethod fun pending(promise: Promise) {
        val intent = context.currentActivity?.intent
        val id = intent?.getStringExtra("heapyNotificationId")
        promise.resolve(id)
    }
}
class PushPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(PushModule(context))
    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
