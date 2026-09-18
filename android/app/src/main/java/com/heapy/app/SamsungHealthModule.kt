package com.heapy.app

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.time.LocalDate
import com.facebook.react.common.LifecycleState
import com.samsung.android.sdk.health.data.HealthDataService
import com.samsung.android.sdk.health.data.error.ErrorCode
import com.samsung.android.sdk.health.data.error.HealthDataException
import com.samsung.android.sdk.health.data.error.ResolvablePlatformException
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/** 설계의 11개 건강 항목을 요청하고 실제 허용된 읽기 권한을 반환한다. 작성자: 김진우 */
class SamsungHealthModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val permissionByType = linkedMapOf(
        "sleep" to Permission.of(DataTypes.SLEEP, AccessType.READ),
        "heart_rate" to Permission.of(DataTypes.HEART_RATE, AccessType.READ),
        "blood_glucose" to Permission.of(DataTypes.BLOOD_GLUCOSE, AccessType.READ),
        "blood_pressure" to Permission.of(DataTypes.BLOOD_PRESSURE, AccessType.READ),
        "body_composition" to Permission.of(DataTypes.BODY_COMPOSITION, AccessType.READ),
        "exercise" to Permission.of(DataTypes.EXERCISE, AccessType.READ),
        "floors" to Permission.of(DataTypes.FLOORS_CLIMBED, AccessType.READ),
        "steps" to Permission.of(DataTypes.STEPS, AccessType.READ),
        "activity" to Permission.of(DataTypes.ACTIVITY_SUMMARY, AccessType.READ),
        "water" to Permission.of(DataTypes.WATER_INTAKE, AccessType.READ),
        "nutrition" to Permission.of(DataTypes.NUTRITION, AccessType.READ),
    )
    private val permissions = permissionByType.values.toSet()

    private val store by lazy { HealthDataService.getStore(context, scope) }
    private var requestingPermissions = false

    override fun getName() = "HeapySamsungHealth"

    @ReactMethod
    fun requestReadPermissions(promise: Promise) {
        scope.launch {
            if (requestingPermissions) {
                promise.reject("SAMSUNG_BUSY", "이미 권한을 확인하고 있어요.")
                return@launch
            }
            val activity = context.currentActivity
            if (activity == null) {
                promise.reject("SAMSUNG_ACTIVITY", "앱 화면에서 다시 연결해 주세요.")
                return@launch
            }
            requestingPermissions = true
            try {
                var granted = store.getGrantedPermissions(permissions)
                if (!granted.containsAll(permissions)) {
                    store.requestPermissions(permissions, activity)
                    granted = store.getGrantedPermissions(permissions)
                }
                // 작성자: 김진우 — 부분·전체 철회도 서버에 실제 권한 상태를 전달한다.
                val preferences = context.getSharedPreferences("heapy.health.installation", Context.MODE_PRIVATE)
                val installationId = preferences.getString("id", null) ?: UUID.randomUUID().toString().also {
                    preferences.edit().putString("id", it).apply()
                }
                promise.resolve(Arguments.createMap().apply {
                    putString("deviceInstallationId", installationId)
                    putArray("grantedDataTypes", Arguments.createArray().apply {
                        permissionByType.forEach { (type, permission) ->
                            if (granted.contains(permission)) pushString(type)
                        }
                    })
                    putString("sdkVersion", "1.1.0")
                    putString("permissionCheckedAt", Instant.now().toString())
                })
            } catch (error: CancellationException) {
                promise.reject("SAMSUNG_CANCELLED", "권한 확인이 취소되었어요.")
                throw error
            } catch (error: Exception) {
                reject(error, promise)
            } finally {
                requestingPermissions = false
            }
        }
    }

    /**
     * 작성자: 김진우 — 공개 딥링크 진입점을 통해 삼성 헬스 정보 화면을 연다.
     * 딥링크 실행이 불가능한 버전에서는 홈을 열어 수동 설정을 이어갈 수 있게 한다.
     */
    @ReactMethod
    fun openSamsungHealth(promise: Promise) {
        val activity = context.currentActivity
        if (activity == null) {
            promise.reject("SAMSUNG_ACTIVITY", "앱 화면에서 다시 시도해 주세요.")
            return
        }
        val about = Intent(Intent.ACTION_VIEW, Uri.parse(SAMSUNG_HEALTH_ABOUT))
            .setPackage(SAMSUNG_HEALTH)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            activity.startActivity(about)
            promise.resolve("about")
            return
        } catch (error: ActivityNotFoundException) {
            // 작성자: 김진우 — 딥링크를 처리하지 못하면 기존 홈 실행으로 이어간다.
        } catch (error: SecurityException) {
            // 작성자: 김진우 — 외부 딥링크 실행이 제한된 버전에서도 홈 진입은 시도한다.
        }
        val launch = context.packageManager.getLaunchIntentForPackage(SAMSUNG_HEALTH)
        if (launch == null) {
            promise.reject("SAMSUNG_NOT_INSTALLED", "삼성 헬스를 설치한 뒤 다시 시도해 주세요.")
            return
        }
        try {
            activity.startActivity(launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            promise.resolve("home")
        } catch (error: ActivityNotFoundException) {
            promise.reject("SAMSUNG_NOT_INSTALLED", "삼성 헬스를 설치한 뒤 다시 시도해 주세요.")
        } catch (error: SecurityException) {
            promise.reject("SAMSUNG_UNAVAILABLE", "삼성 헬스를 직접 열어 설정해 주세요.")
        }
    }

    @ReactMethod
    fun readTodaySteps(promise: Promise) {
        scope.launch {
            try {
                if (!store.getGrantedPermissions(permissions).containsAll(permissions)) {
                    promise.reject("SAMSUNG_PERMISSION", "연결에 필요한 11개 읽기 권한을 모두 허용해 주세요.")
                    return@launch
                }
                val now = LocalDateTime.now(ZoneId.of("Asia/Seoul"))
                val request = DataType.StepsType.TOTAL.requestBuilder
                    .setLocalTimeFilter(LocalTimeFilter.of(now.toLocalDate().atStartOfDay(), now))
                    .build()
                val result = store.aggregateData(request)
                val total = result.dataList.sumOf { it.value ?: 0L }
                promise.resolve(Arguments.createMap().apply {
                    putString("date", now.toLocalDate().toString())
                    putDouble("steps", total.toDouble())
                    putBoolean("hasData", result.dataList.isNotEmpty())
                    putString("readAt", Instant.now().toString())
                })
            } catch (error: CancellationException) {
                promise.reject("SAMSUNG_CANCELLED", "데이터 읽기가 취소되었어요.")
                throw error
            } catch (error: Exception) {
                reject(error, promise)
            }
        }
    }

    /** 자동 동기화에서는 권한 창을 띄우지 않고 현재 권한만 확인한다. 작성자: 김진우 */
    @ReactMethod
    fun getReadPermissions(promise: Promise) {
        scope.launch {
            try {
                val granted = store.getGrantedPermissions(permissions)
                val preferences = context.getSharedPreferences("heapy.health.installation", Context.MODE_PRIVATE)
                val installationId = preferences.getString("id", null) ?: UUID.randomUUID().toString().also {
                    preferences.edit().putString("id", it).apply()
                }
                promise.resolve(Arguments.createMap().apply {
                    putString("deviceInstallationId", installationId)
                    putArray("grantedDataTypes", Arguments.createArray().apply {
                        permissionByType.forEach { (type, permission) -> if (granted.contains(permission)) pushString(type) }
                    })
                    putString("sdkVersion", "1.1.0")
                    putString("permissionCheckedAt", Instant.now().toString())
                })
            } catch (error: Exception) { reject(error, promise, false) }
        }
    }

    /** 한 페이지씩 읽어 메모리와 네트워크 배치 크기를 제한한다. 작성자: 김진우 */
    @ReactMethod
    fun readHealthPage(options: ReadableMap, promise: Promise) {
        scope.launch {
            try {
                if (!store.getGrantedPermissions(permissions).containsAll(permissions)) {
                    promise.reject("SAMSUNG_PERMISSION", "삼성헬스의 11개 읽기 권한을 모두 허용해 주세요.")
                    return@launch
                }
                if (context.currentActivity == null || context.lifecycleState != LifecycleState.RESUMED) {
                    promise.reject("SAMSUNG_BACKGROUND", "앱을 열어 두면 건강 기록 동기화를 이어갈 수 있어요.")
                    return@launch
                }
                val reader = SamsungHealthReader(store)
                val type = requireNotNull(options.getString("dataType"))
                val result = if (type == "activity") {
                    reader.activity(LocalDate.parse(options.getString("from")), LocalDate.parse(options.getString("to")),
                        Instant.parse(options.getString("cutoff")))
                } else {
                    reader.page(type, Instant.parse(options.getString("from")), Instant.parse(options.getString("to")),
                        options.getBoolean("changes"), if (options.hasKey("pageToken")) options.getString("pageToken") else null)
                }
                promise.resolve(result)
            } catch (error: CancellationException) {
                promise.reject("SAMSUNG_CANCELLED", "건강 기록 읽기가 취소되었어요.")
                throw error
            } catch (error: Exception) { reject(error, promise, false) }
        }
    }

    private fun reject(error: Exception, promise: Promise, resolve: Boolean = true) {
        val code = (error as? HealthDataException)?.errorCode
        val message = when (code) {
            ErrorCode.ERR_PLATFORM_NOT_INSTALLED -> "삼성 헬스를 설치한 뒤 다시 연결해 주세요."
            ErrorCode.ERR_OLD_VERSION_PLATFORM -> "삼성 헬스를 최신 버전으로 업데이트해 주세요."
            ErrorCode.ERR_PLATFORM_DISABLED -> "휴대폰 설정에서 삼성 헬스를 활성화해 주세요."
            ErrorCode.ERR_PLATFORM_NOT_INITIALIZED -> "삼성 헬스를 실행하고 초기 설정을 완료해 주세요."
            ErrorCode.ERR_NO_USER_PERMISSION -> "해당 건강 데이터의 읽기 권한을 다시 허용해 주세요."
            ErrorCode.ERR_ACCESS_CONTROL, ErrorCode.ERR_INVALID_CALLER -> "삼성 헬스의 데이터 읽기 개발자 모드 또는 앱 등록 정보를 확인해 주세요."
            else -> "삼성 헬스에 연결하지 못했어요. 앱과 읽기 권한 설정을 확인한 뒤 다시 시도해 주세요."
        }
        if (resolve && error is ResolvablePlatformException && error.hasResolution) {
            context.currentActivity?.let { activity ->
                runCatching { error.resolve(activity) }
            }
        }
        // 작성자: 고수연 — 개발자 모드 때문이라는 것을 화면이 알아야 안내를 띄울 수 있다.
        // ErrorCode 를 그대로 붙이면 SDK 가 열거형인지 정수 상수인지에 따라 문자열이 달라져
        // 화면 쪽 판정이 조용히 빗나간다. 이 한 갈래만 이름을 못 박는다.
        val key = when (code) {
            ErrorCode.ERR_ACCESS_CONTROL, ErrorCode.ERR_INVALID_CALLER -> "SAMSUNG_DEVELOPER_MODE"
            else -> "SAMSUNG_${code ?: "UNAVAILABLE"}"
        }
        promise.reject(key, message)
    }

    private companion object {
        const val SAMSUNG_HEALTH = "com.sec.android.app.shealth"
        const val SAMSUNG_HEALTH_ABOUT =
            "samsunghealth://shealth.samsung.com/deepLink?action=view&sc_id=app.main&destination=settings.about"
    }

    override fun invalidate() {
        scope.cancel()
        super.invalidate()
    }
}
