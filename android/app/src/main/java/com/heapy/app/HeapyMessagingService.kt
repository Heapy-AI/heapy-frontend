package com.heapy.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.time.Instant
import java.util.UUID

/** 메트로·자바스크립트 실행 없이 복약 알림을 표시한다. @author 김진우 */
class HeapyMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        // 앱 재진입 시 최신 SDK 토큰을 인증된 API에 등록한다.
    }
    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        if (data["type"] != "medication_reminder") return
        val prefs = getSharedPreferences("heapy_push", Context.MODE_PRIVATE)
        if (data["userId"] != prefs.getString("userId", null)) return
        val scheduled = runCatching { Instant.parse(data["scheduledAt"]) }.getOrNull() ?: return
        if (scheduled.plusSeconds(900).isBefore(Instant.now())) return
        val id = runCatching { UUID.fromString(data["notificationId"]).toString() }.getOrNull() ?: return
        val manager = getSystemService(NotificationManager::class.java)
        channel(manager)
        if (!manager.areNotificationsEnabled()) return
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            this.data = Uri.parse("heapy://notification/$id")
            putExtra("heapyNotificationId", id)
        }
        val pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val action = Notification.Action.Builder(null, "복용 기록하기", pending).apply {
            if (Build.VERSION.SDK_INT >= 31) setAuthenticationRequired(true)
        }.build()
        val notification = Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_medication_notification)
            .setContentTitle("복약 시간이에요")
            .setContentText("예정된 약을 확인하고 복용을 기록해 주세요.")
            .setContentIntent(pending).addAction(action).setAutoCancel(true)
            .setOnlyAlertOnce(true).setVisibility(Notification.VISIBILITY_PRIVATE)
            .setCategory(Notification.CATEGORY_REMINDER).setTimeoutAfter(900000).build()
        // 작성자: 김진우 — 서버 재시도와 FCM 중복 전달에도 한 번만 표시한다.
        synchronized(HeapyMessagingService::class.java) {
            val seen = prefs.getString("seenNotifications", "")!!.split(",").filter { it.isNotEmpty() }
            if (id in seen) return
            manager.notify(id, 0, notification)
            prefs.edit().putString("seenNotifications", (seen.takeLast(255) + id).joinToString(",")).commit()
        }
    }
    companion object {
        const val CHANNEL = "medication_reminders"
        fun channel(manager: NotificationManager) {
            manager.createNotificationChannel(NotificationChannel(CHANNEL, "복약 알림", NotificationManager.IMPORTANCE_HIGH))
        }
    }
}
